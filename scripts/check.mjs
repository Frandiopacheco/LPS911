// Revisión rápida: que index.html, plano.js y sw.js no tengan errores de sintaxis
// y que las piezas que se referencian entre sí existan.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function checkWeb(web) {
  const errs = [];
  const parse = (name, code) => { try { new vm.Script(code, { filename: name }); } catch (e) { errs.push(`✗ ${name}: ${e.message}`); } };
  const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => parse(`index.html <script #${i}>`, m[1]));
  for (const f of ['plano.js', 'sw.js']) parse(f, fs.readFileSync(path.join(web, f), 'utf8'));
  for (const f of ['manifest.json', 'icon-192.png', 'icon-512.png']) if (!fs.existsSync(path.join(web, f))) errs.push(`✗ falta web/${f}`);
  if (!/PLANO_SRC/.test(html)) errs.push('✗ index.html no define PLANO_SRC');
  return errs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const web = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'web');
  const errs = checkWeb(web);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('✓ web sin errores de sintaxis');
}
