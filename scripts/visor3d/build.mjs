// Empaqueta el visor 3D (three.js + That Open Fragments + web-ifc) en web/vendor/visor3d/. Se corre a mano al actualizar
// las librerías; el resultado se sube al repositorio (la app no tiene empaquetador).
import { build } from 'esbuild';
import fs from 'node:fs';
const out = '../../web/vendor/visor3d';
fs.mkdirSync(out, { recursive: true });
const o = { bundle: true, format: 'esm', minify: true, legalComments: 'none', target: 'es2020' };
await build({ ...o, entryPoints: ['src.js'], outfile: out + '/visor3d.js' });
await build({ ...o, entryPoints: ['ifc-import.js'], outfile: out + '/ifc-import.js' });
fs.copyFileSync('node_modules/@thatopen/fragments/dist/Worker/worker.mjs', out + '/visor3d-worker.js');
fs.copyFileSync('node_modules/web-ifc/web-ifc.wasm', out + '/web-ifc.wasm');
for (const f of fs.readdirSync(out)) console.log(f, (fs.statSync(out + '/' + f).size / 1048576).toFixed(2) + ' MB');
