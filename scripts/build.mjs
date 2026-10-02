// Preparación de la publicación (la ejecuta Netlify en cada cambio).
// 1) Elige la configuración de Firebase según la rama: produccion → config/produccion.js; otra → config/pruebas.js
// 2) Pone la versión (commit) en sw.js y en las URLs de css/, js/ y plano.js, para que la app avise "Hay una versión nueva"
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

// Versión en las URLs de los archivos de la app (index.html → css/, js/; js/base.js → plano.js)
// y lista para que el service worker los guarde al instalarse (funciona sin internet desde el primer día).
const stamp = f => {
  const p = path.join(web, f);
  const t = fs.readFileSync(p, 'utf8').replace(/((?:js\/[\w-]+\.js|css\/[\w-]+\.css|plano\.js))\?v=[\w-]+/g, `$1?v=${ver}`);
  fs.writeFileSync(p, t);
  return t;
};
const html = stamp('index.html');
const assets = [...html.matchAll(/(?:src|href)="((?:js|css)\/[\w-]+\.(?:js|css))\?v=/g)].map(m => m[1]);
for (const f of assets) if (f.endsWith('.js')) stamp(f);
const n = (fs.readFileSync(path.join(web, 'js', 'base.js'), 'utf8').match(/plano\.js\?v=[\w-]+/g) || []).length;
const list = [...assets, 'plano.js'].map(f => `'${f}?v=${ver}'`).join(', ');
sw = fs.readFileSync(path.join(web, 'sw.js'), 'utf8').replace(/const ASSETS = \[[^\]]*\];/, `const ASSETS = [${list}];`);
fs.writeFileSync(path.join(web, 'sw.js'), sw);

const errs = checkWeb(web);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`✓ Publicación lista · entorno ${env} · versión ${ver} · ${assets.length} archivos · plano.js ×${n}`);
