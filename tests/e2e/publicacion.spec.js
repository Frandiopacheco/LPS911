// Publicación (scripts/build.mjs) y service worker (web/sw.js), auditoría REN-03 / REN-09 / UI-12:
// - el ?v= de cada archivo es la huella de SU contenido: tras publicar, solo cambia el de lo que cambió;
// - ASSETS del service worker lleva todos los archivos (modo sin internet);
// - al instalar una versión nueva, el service worker solo baja lo que cambió (o lo guardado que no coincide con su huella),
//   y si la red se corta a la mitad no se instala a medias (sigue la versión anterior, completa);
// - app.css se publica sin comentarios y el navegador lo lee igual que el fuente.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const sha8 = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8);

/** Copia scripts/, config/ y web/ (sin vendor/) a una carpeta temporal, aplica `mod` al fuente y corre build.mjs como en GitHub. */
function publicar(commit, mod = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lps-pub-'));
  for (const d of ['scripts', 'config', 'web']) fs.cpSync(path.join(repo, d), path.join(dir, d), { recursive: true, filter: s => !s.includes(path.join('web', 'vendor')) && !s.endsWith('firebase-config.js') });
  for (const [f, fn] of Object.entries(mod)) { const p = path.join(dir, 'web', f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); }
  execFileSync(process.execPath, [path.join(dir, 'scripts', 'build.mjs')], { env: { ...process.env, BRANCH: 'main', COMMIT_REF: commit, GITHUB_SHA: '' }, stdio: 'pipe' });
  return path.join(dir, 'web');
}
const leer = (web, f) => fs.readFileSync(path.join(web, f), 'utf8');
/** archivo → ?v= de todas las referencias (index.html, js/base.js) */
function versiones(web) {
  const v = {};
  for (const f of ['index.html', 'js/base.js']) for (const m of leer(web, f).matchAll(/((?:js|css)\/[\w-]+\.(?:js|css)|plano\.js|firebase-config\.js)\?v=([\w-]+)/g)) v[m[1]] = m[2];
  return v;
}
const assets = web => eval(leer(web, 'sw.js').match(/const ASSETS = (\[[^\]]*\]);/)[1]);
const swVer = web => leer(web, 'sw.js').match(/const VER = '([^']+)'/)[1];
const cambio = t => t + '\n// cambio de prueba ' + Math.random() + '\n';

test('build: cada ?v= es la huella de su contenido y solo cambia el del archivo que cambió; ASSETS completos', () => {
  test.setTimeout(60_000);
  const A = publicar('aaaa1111'), B = publicar('bbbb2222', { 'js/hoy.js': cambio }), C = publicar('cccc3333', { 'plano.js': cambio });
  const va = versiones(A), vb = versiones(B), vc = versiones(C);
  // todo lo que carga index.html + plano.js + firebase-config.js, con la huella de lo que se publica
  const html = leer(A, 'index.html');
  const loaded = [...html.matchAll(/(?:src|href)="((?:js|css)\/[\w-]+\.(?:js|css))\?v=/g)].map(m => m[1]);
  expect(loaded.length).toBeGreaterThan(40);
  expect(assets(A).sort()).toEqual([...loaded, 'plano.js', 'firebase-config.js'].map(f => `${f}?v=${va[f]}`).sort());
  for (const u of assets(A)) { const [f, v] = u.split('?v='); expect(sha8(leer(A, f)), f).toBe(v); }
  // cambiar solo js/hoy.js → solo cambia su ?v= (la versión del service worker sí cambia: es el aviso «Hay una versión nueva»)
  expect(Object.keys(va).filter(f => va[f] !== vb[f])).toEqual(['js/hoy.js']);
  expect(swVer(A)).not.toBe(swVer(B));
  // cambiar solo plano.js → cambian plano.js y js/base.js (que lo cita en PLANO_SRC)
  expect(Object.keys(va).filter(f => va[f] !== vc[f]).sort()).toEqual(['js/base.js', 'plano.js']);
  expect(leer(C, 'js/base.js')).toContain(`const PLANO_SRC='plano.js?v=${vc['plano.js']}'`);
  // app.css se publica sin comentarios; el fuente los conserva
  expect(leer(A, 'css/app.css')).not.toContain('/*');
  expect(fs.readFileSync(path.join(repo, 'web/css/app.css'), 'utf8')).toContain('/*');
});

test('app.css publicado sin comentarios: el navegador lo lee igual que el fuente', async ({ page }) => {
  const A = publicar('aaaa1111');
  const src = fs.readFileSync(path.join(repo, 'web/css/app.css'), 'utf8'), pub = leer(A, 'css/app.css');
  await page.setContent('<html><body></body></html>');
  const [a, b] = await page.evaluate(([x, y]) => [x, y].map(t => { const s = new CSSStyleSheet(); s.replaceSync(t); return [...s.cssRules].map(r => r.cssText).join('\n'); }), [src, pub]);
  expect(a.length).toBeGreaterThan(100000);
  expect(b).toBe(a);
});

test('service worker: al actualizar solo baja lo que cambió; sin red a la mitad no se instala a medias', async ({ browser }) => {
  test.setTimeout(90_000);
  const A = publicar('aaaa1111'), B = publicar('bbbb2222', { 'js/hoy.js': cambio }), C = publicar('cccc3333', { 'js/hoy.js': cambio, 'js/ayuda.js': cambio });
  let root = A; const log = []; let cortar = null;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    log.push(u.pathname.slice(1) + u.search);
    if (cortar && cortar.test(u.pathname)) { req.socket.destroy(); return; }
    if (u.pathname === '/t.html') { res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }); res.end('<!doctype html><title>t</title><script>navigator.serviceWorker.register("sw.js")</script>'); return; }
    const f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await ctx.newPage();
  try {
    const versionados = () => log.filter(u => /\?v=/.test(u)).sort();
    const cache = (ver) => page.evaluate(async v => { const c = await caches.open(v); const o = {}; for (const k of await c.keys()) o[new URL(k.url).pathname.slice(1) + new URL(k.url).search] = await (await c.match(k)).text(); return o; }, ver);
    // nueva versión: pide al navegador revisar sw.js y espera a que la nueva quede instalada (aviso) o se descarte
    const actualizar = () => page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update().catch(() => {});
      const w = reg.installing || reg.waiting; if (!w) return 'sin cambio';
      if (w.state === 'installed') return 'installed';
      return new Promise(r => { w.addEventListener('statechange', () => { if (w.state === 'installed' || w.state === 'redundant') r(w.state); }); });
    });

    // 1) primer arranque, sin nada guardado: se guardan todos los ASSETS
    await page.goto(base + 't.html');
    await page.evaluate(() => navigator.serviceWorker.ready);
    const vA = swVer(A);
    expect(Object.keys(await cache(vA))).toEqual(expect.arrayContaining(assets(A)));
    expect(versionados()).toEqual([...assets(A)].sort());

    // 2) publicación que solo cambia js/hoy.js; además, algo guardado que no coincide con su huella (js/campo.js) se vuelve a bajar
    const campo = assets(A).find(u => u.startsWith('js/campo.js'));
    await page.evaluate(([v, u]) => caches.open(v).then(c => c.put(u, new Response('basura'))), [vA, campo]);
    root = B; log.length = 0;
    expect(await actualizar()).toBe('installed'); // aquí la app muestra «Hay una versión nueva – Actualizar»
    const hoyB = assets(B).find(u => u.startsWith('js/hoy.js'));
    expect(versionados()).toEqual([campo, hoyB].sort());
    // «Actualizar»: se activa y borra la caché anterior; la nueva está completa y con el contenido correcto
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); reg.waiting.postMessage('skip'); await new Promise(r => { const t = setInterval(() => { if (!reg.waiting && reg.active && reg.active.state === 'activated') { clearInterval(t); r(); } }, 50); }); });
    const vB = swVer(B);
    await expect.poll(() => page.evaluate(() => caches.keys())).toEqual([vB]);
    const cb = await cache(vB);
    expect(Object.keys(cb)).toEqual(expect.arrayContaining(assets(B)));
    for (const u of assets(B)) expect(cb[u] === leer(B, u.split('?')[0]), u).toBe(true);

    // 3) la red se corta a la mitad de la actualización (js/ayuda.js no llega): no se instala a medias
    root = C; log.length = 0; cortar = /\/js\/ayuda\.js$/;
    expect(await actualizar()).toBe('redundant');
    expect(await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return !!reg.waiting; })).toBe(false);
    expect(Object.keys(await cache(vB))).toEqual(expect.arrayContaining(assets(B))); // la versión en uso sigue completa
    // 4) vuelve la señal: se instala y solo baja lo que faltaba
    cortar = null; log.length = 0;
    expect(await actualizar()).toBe('installed');
    expect(versionados().every(u => /^js\/(ayuda|hoy)\.js\?v=/.test(u))).toBe(true);
    expect(versionados()).toContain(assets(C).find(u => u.startsWith('js/ayuda.js')));
  } finally { await ctx.close(); srv.close(); }
});
