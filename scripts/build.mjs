// Preparación de la publicación (la ejecuta Netlify en cada cambio).
// 1) Elige la configuración de Firebase según la rama: produccion → config/produccion.js; otra → config/pruebas.js
// 2) Pone la versión (commit) en sw.js, para que la app avise "Hay una versión nueva" sin tener que cambiar números a mano.
// 3) Pone en las URLs de css/, js/, plano.js y firebase-config.js la huella de su contenido (?v=…): solo se vuelve a bajar lo que cambió.
// 4) Publica app.css sin comentarios.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { checkWeb } from './check.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const web = path.join(root, 'web');
const branch = process.env.BRANCH || process.env.HEAD || process.env.GITHUB_REF_NAME || 'local';
const env = process.env.LPS_ENV || (branch === 'produccion' ? 'produccion' : 'pruebas');
const ver = (process.env.COMMIT_REF || process.env.GITHUB_SHA || String(Date.now())).slice(0, 8);

const cfg = fs.readFileSync(path.join(root, 'config', env + '.js'), 'utf8');
if (/PEGA_AQUI/.test(cfg)) {
  console.error(`\n✗ config/${env}.js todavía tiene "PEGA_AQUI": completa la configuración de Firebase de ${env}.\n`);
  process.exit(1);
}
// sin la versión: así su contenido (y su huella ?v=) solo cambia si cambia la configuración
const banner = `// Generado al publicar · entorno: ${env} · rama: ${branch}\n`;
fs.writeFileSync(path.join(web, 'firebase-config.js'), banner + cfg + (env === 'pruebas' ? '\nwindow.LPS_ENV = "pruebas";\n' : ''));

let sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8');
sw = sw.replace(/const VER = 'lps911-[^']*';/, `const VER = 'lps911-${ver}';`);
fs.writeFileSync(path.join(web, 'sw.js'), sw);

// Versión en las URLs de los archivos de la app (index.html → css/, js/, firebase-config.js; js/base.js → plano.js): es una
// huella (sha1, 8 letras) del CONTENIDO publicado de cada archivo, no el commit. Así, tras una publicación, cada equipo solo
// vuelve a bajar los archivos que cambiaron (antes cambiaba el ?v= de todos y se bajaban ~0,8 MB en cada publicación).
// El service worker (sw.js) reutiliza lo que ya tenía guardado con la misma URL y comprueba la huella antes de reutilizarlo.
// La lista ASSETS del service worker lleva todas las URLs con su huella (funciona sin internet desde el primer día).
const hash = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8);
const rd = f => fs.readFileSync(path.join(web, f), 'utf8');
const wr = (f, t) => fs.writeFileSync(path.join(web, f), t);
const ref = /((?:js\/[\w-]+\.js|css\/[\w-]+\.css|plano\.js))\?v=[\w-]+/g;
const hv = {}; // archivo → huella de lo que se publica
let html = rd('index.html');
const fbc = /src="firebase-config\.js(?:\?v=[\w-]+)?"/;
if (!fbc.test(html)) { console.error('\n✗ index.html no carga firebase-config.js\n'); process.exit(1); }
const assets = [...html.matchAll(/(?:src|href)="((?:js|css)\/[\w-]+\.(?:js|css))\?v=/g)].map(m => m[1]);
// CSS: se publica sin comentarios (~20 KB menos); el código fuente los conserva. Los textos entre comillas no se tocan.
for (const f of assets.filter(f => f.endsWith('.css'))) {
  const t = rd(f).replace(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\/\*[\s\S]*?\*\//g, (m, q) => q || '').replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n');
  wr(f, t); hv[f] = hash(t);
}
hv['plano.js'] = hash(rd('plano.js'));
hv['firebase-config.js'] = hash(rd('firebase-config.js'));
// los .js pueden citar plano.js (PLANO_SRC en base.js): primero se les pone la huella de plano.js y después se calcula la suya
const stamp = t => t.replace(ref, (m, f) => hv[f] ? `${f}?v=${hv[f]}` : m);
for (const f of assets.filter(f => f.endsWith('.js'))) { const t = stamp(rd(f)); wr(f, t); hv[f] = hash(t); }
html = stamp(html).replace(fbc, `src="firebase-config.js?v=${hv['firebase-config.js']}"`);
wr('index.html', html);
const n = (rd('js/base.js').match(/plano\.js\?v=[\w-]+/g) || []).length;
const list = [...assets, 'plano.js', 'firebase-config.js'].map(f => `'${f}?v=${hv[f]}'`).join(', ');
sw = rd('sw.js').replace(/const ASSETS = \[[^\]]*\];/, `const ASSETS = [${list}];`);
wr('sw.js', sw);

const errs = checkWeb(web);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`✓ Publicación lista · entorno ${env} · versión ${ver} · ${assets.length} archivos · plano.js ×${n}`);
