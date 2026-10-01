// Preparación de la publicación (la ejecuta Netlify en cada cambio).
// 1) Elige la configuración de Firebase según la rama: produccion → config/produccion.js; otra → config/pruebas.js
// 2) Pone la versión (commit) en sw.js y en la URL de plano.js, para que la app avise "Hay una versión nueva"
//    sin tener que cambiar números a mano.
import fs from 'node:fs';
import path from 'node:path';
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
const banner = `// Generado al publicar · entorno: ${env} · rama: ${branch} · versión: ${ver}\n`;
fs.writeFileSync(path.join(web, 'firebase-config.js'), banner + cfg + (env === 'pruebas' ? '\nwindow.LPS_ENV = "pruebas";\n' : ''));

let sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8');
sw = sw.replace(/const VER = 'lps911-[^']*';/, `const VER = 'lps911-${ver}';`);
fs.writeFileSync(path.join(web, 'sw.js'), sw);

let html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const n = (html.match(/plano\.js\?v=[\w-]+/g) || []).length;
html = html.replace(/plano\.js\?v=[\w-]+/g, `plano.js?v=${ver}`);
fs.writeFileSync(path.join(web, 'index.html'), html);

const errs = checkWeb(web);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`✓ Publicación lista · entorno ${env} · versión ${ver} · plano.js ×${n}`);
