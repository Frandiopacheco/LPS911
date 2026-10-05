// Varias personas a la vez sobre UNA misma base falsa: cada página (con su propio contexto, o sea su propio
// almacenamiento) usa el Firebase falso de siempre, pero cada escritura se reenvía por un "hub" en Node a las demás
// páginas, que la repiten en su copia. Las transacciones se serializan con un candado en Node (como Firestore, que reintenta);
// el candado no se suelta hasta que las escrituras de la transacción llegaron a todas las páginas
// (si no, en una máquina lenta la siguiente transacción leía datos viejos y, p. ej., duplicaba restricciones).
import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { USERS, HOY, MANANA } from './helpers.js';

const DIR = path.dirname(new URL(import.meta.url).pathname);
let src = fs.readFileSync(path.join(DIR, 'fake-firebase.js'), 'utf8');
const rep = (a, b) => { if (!src.includes(a)) throw new Error('parche del fake: no se encontró ' + a.slice(0, 40)); src = src.replace(a, b); };
rep('function docRef(n, id) {', 'function docRef0(n, id) {');
rep('function colRef(n, filters = [], lim = 0) {', `
  const HUB = window.__hubSend;
  const PEND = new Set();   // escrituras aún en camino a las demás páginas
  function docRef(n, id) {
    const r = docRef0(n, id);
    if (!HUB) return r;
    for (const m of ['set', 'update', 'delete']) { const f = r[m]; r[m] = (...a) => { const pr = (async () => { const res = await f(...a); await HUB(JSON.stringify({ c: n, id, op: m, a })); return res; })(); PEND.add(pr); pr.finally(() => PEND.delete(pr)).catch(() => {}); return pr; }; }
    return r;
  }
  const rv = v => { if (Array.isArray(v)) return v.map(rv); if (v && typeof v === 'object') { const k = Object.keys(v); if (k.length === 1 && v.__del === true) return DEL; if (k.length === 1 && v.__ts === true) return TS; const o = {}; for (const x of k) o[x] = rv(v[x]); return o; } return v; };
  window.__hubRecv = s => { const m = JSON.parse(s); const r = docRef0(m.c, m.id); const a = rv(m.a); try { Promise.resolve(r[m.op](...a)).catch(() => {}); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const txLock = async (fn, tx) => { if (!window.__hubLock) return fn(tx); await window.__hubLock(); try { await sleep(30); return await fn(tx); } finally { await sleep(30); await Promise.allSettled([...PEND]); await window.__hubUnlock(); } };
  function colRef(n, filters = [], lim = 0) {`);
rep("add: async d => { const id = 'id' + Math.random().toString(36).slice(2, 12); col(n).set(id, resolve(d)); changed(n); return docRef(n, id); }",
    "add: async d => { const id = 'id' + Math.random().toString(36).slice(2, 12); await docRef(n, id).set(d); return docRef(n, id); }");
rep('runTransaction: async fn => fn({', 'runTransaction: async fn => txLock(fn, {');
fs.writeFileSync(path.join(DIR, 'fake-compartido.generado.js'), src);
const FAKE = path.join(DIR, 'fake-compartido.generado.js');

export class Hub {
  constructor() { this.pages = new Set(); this.locked = false; this.q = []; this.msgs = 0; }
  async attach(page) {
    this.pages.add(page);
    await page.exposeFunction('__hubSend', async s => { this.msgs++; await new Promise(r => setTimeout(r, 80)); await Promise.all([...this.pages].filter(p => p !== page).map(p => p.evaluate(x => window.__hubRecv && window.__hubRecv(x), s).catch(() => {}))); });
    await page.exposeFunction('__hubLock', () => new Promise(res => { if (!this.locked) { this.locked = true; res(); } else this.q.push(res); }));
    await page.exposeFunction('__hubUnlock', () => { const n = this.q.shift(); if (n) n(); else this.locked = false; });
  }
}

export const NSC = +(process.env.NSC || 10);
export const MIERCOLES = '2026-09-30', LUNES = '2026-10-05';
const nextDay = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };

/** Datos de la obra de prueba ampliada: N subcontratistas, 10 ambientes con lámina y 5 ingenieros. */
export function datos(n = NSC) {
  const E = [];
  const L = '1000';
  const geo = (i) => { const c = i % 5, r = Math.floor(i / 5); const x = 40 + c * 190, y = 40 + r * 180; return { L1: [x, y, x + 170, y, x + 170, y + 150, x, y + 150] }; };
  E.push(['laminas', 'L1', { pisoId: 'p1', esp: 'ARQ', name: 'Planta P1', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }]);
  E.push(['lamimg', 'L1_1_l_0', { d: PNG_B64 }], ['lamimg', 'L1_1_f_0', { d: PNG_B64 }]);
  E.push(['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [40, 400, 210, 400, 210, 550, 40, 550] } }]);
  E.push(['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [230, 400, 400, 400, 400, 550, 230, 550] } }]);
  for (let k = 1; k <= n; k++) {
    E.push(['ambientes', 'b' + k, { sectorId: 's1', code: 'B-' + k, name: 'Ambiente B' + k, order: 10 + k, geo: geo(k - 1) }]);
    if (k > 3) E.push(['contractors', 'c' + k, { name: 'SC PARTIDA ' + k, partida: 'Partida ' + k, color: '#' + ((k * 2654435) % 0xffffff).toString(16).padStart(6, '0') }]);
    E.push(['members', `sc${k}@obra.pe`, { role: 'sc', name: 'SC número ' + k, sc: 'c' + k, scs: ['c' + k] }]);
    E.push(['acts', 'x' + k, { ambId: 'b' + k, sc: 'c' + k, name: `Partida ${k} · tarea A`, und: 'm2', metrado: 50, days: [MANANA, LUNES], order: 5 }]);
    E.push(['acts', 'y' + k, { ambId: 'b' + k, sc: 'c' + k, name: `Partida ${k} · tarea B`, und: 'm2', metrado: 30, days: [MANANA, LUNES], order: 6 }]);
  }
  // cruce: la tarea A de SC1 y la de SC2 comparten ambiente a2 mañana (zona dibujada se calcula por ambiente)
  E.push(['acts', 'z1', { ambId: 'a2', sc: 'c1', name: 'Cruce · SC1 en A-2', und: 'm2', metrado: 10, days: [MANANA], order: 7 }]);
  E.push(['acts', 'z2', { ambId: 'a2', sc: 'c2', name: 'Cruce · SC2 en A-2', und: 'm2', metrado: 10, days: [MANANA], order: 8 }]);
  const ed = [['ed1', ['p1']], ['ed2', ['p1']], ['ed3', ['p2']], ['ed4', ['p2']], ['ed5', ['p2']]];
  for (const [e, p] of ed) E.push(['members', `${e}@obra.pe`, { role: 'editor', name: 'Ingeniero ' + e, pisos: p }]);
  E.push(['members', 'camp1@obra.pe', { role: 'campo', name: 'Campo uno' }]);
  // el plan de hoy ya se publicó ayer (foto de lo comprometido): el PPC de hoy se mide contra ella
  E.push(['dplan', `${HOY}_p1`, { date: HOY, pisoId: 'p1', ids: { i0: null, i1: null, e0: null, e1: null }, pub: 'pub_ayer', by: 'ed1@obra.pe', at: 1 }]);
  return E;
}
import { png } from './lamina.js';
const PNG_B64 = png(20, 12).toString('base64');

export function usuario(clave) {
  if (USERS[clave]) return USERS[clave];
  return { uid: 'u-' + clave, email: clave + '@obra.pe', emailVerified: true };
}

/** Abre una página como `as` (clave de USERS o 'sc3', 'ed1'…) sobre el mundo compartido. */
export async function abrir(browser, hub, { as, tab = 'mapa', extra, hora = HOY + 'T09:30:00-05:00', editar = false, va } = {}) {
  const ctx = await browser.newContext({ baseURL: 'http://localhost:4173', timezoneId: 'America/Lima', locale: 'es-PE', serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.errs = errors; page.quien = as;
  page.on('pageerror', e => errors.push(`[${as}] pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${as}] console: ${m.text()}`); });
  await page.clock.setFixedTime(new Date(hora));
  await page.route(/^https?:\/\/(?!localhost)/, r => {
    const u = r.request().url();
    if (/\.css(\?|$)|fonts\.googleapis/.test(u)) return r.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
  await page.route('**/firebase-config.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.FIREBASE_CONFIG={apiKey:"e2e",projectId:"demo-lps"};window.LPS_ENV="pruebas";window.NO_SW=true;' }));
  // quien llega tarde copia el estado actual de la base de otra página (el fake restaura de sessionStorage 'e2e.db')
  const par = hub.listo ? [...hub.pages][0] : null;
  if (par) { const dump = await par.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(window.__DB).map(([k, m]) => [k, [...m.entries()]])))); await page.addInitScript(d => { try { if (d && !sessionStorage.getItem('e2e.db')) sessionStorage.setItem('e2e.db', d); } catch (e) {} }, dump); }
  await hub.attach(page);
  await page.addInitScript(({ user, tab, extra, HOY, MANANA, va }) => {
    window.__E2E = { user, today: HOY, tomorrow: MANANA, extra };
    try {
      if (va) { sessionStorage.setItem('lps.va', JSON.stringify(va)); }
      if (tab && !sessionStorage.getItem('e2e.tab')) { const k = 'lps911.ui'; const u = JSON.parse(localStorage.getItem(k) || '{}'); u.tab = tab; localStorage.setItem(k, JSON.stringify(u)); sessionStorage.setItem('e2e.tab', '1'); }
    } catch (e) {}
  }, { user: usuario(as), tab, extra: extra || datos(), HOY, MANANA, va });
  await page.addInitScript({ path: FAKE });
  const t0 = Date.now();
  await page.goto('/#' + tab);
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 60_000 });
  page.tCarga = Date.now() - t0;
  if (editar) await page.evaluate(() => { LKED = true; gridRows = null; render(); });
  return page;
}

/** Cambia la hora de todas las páginas (para recorrer los días). */
export async function fijarHora(pages, iso) {
  await Promise.all(pages.map(async p => { await p.clock.setFixedTime(new Date(iso)); await p.evaluate(() => { try { render(); } catch (e) {} }); }));
}
export const pdz = page => page.evaluate(() => Object.values(window.__dbAll('pdz')));
export const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
