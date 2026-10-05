// Revisión rápida: que los archivos de web/ no tengan errores de sintaxis
// y que las piezas que se referencian entre sí existan.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/** Archivos de js/ y css/ que carga index.html, en orden. */
export function appFiles(web) {
  const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
  const js = [...html.matchAll(/<script src="(js\/[\w-]+\.js)(?:\?v=[\w-]+)?"><\/script>/g)].map(m => m[1]);
  const css = [...html.matchAll(/<link rel="stylesheet" href="(css\/[\w-]+\.css)(?:\?v=[\w-]+)?">/g)].map(m => m[1]);
  return { html, js, css };
}

export function checkWeb(web) {
  const errs = [];
  const parse = (name, code) => { try { new vm.Script(code, { filename: name }); } catch (e) { errs.push(`✗ ${name}: ${e.message}`); } };
  const { html, js, css } = appFiles(web);
  [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => parse(`index.html <script #${i}>`, m[1]));
  if (!js.length) errs.push('✗ index.html no carga ningún archivo de js/');
  for (const f of [...js, ...css]) if (!fs.existsSync(path.join(web, f))) errs.push(`✗ index.html carga web/${f}, que no existe`);
  const present = fs.existsSync(path.join(web, 'js')) ? fs.readdirSync(path.join(web, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f) : [];
  for (const f of present) if (!js.includes(f)) errs.push(`✗ web/${f} existe pero index.html no lo carga`);
  /* ventanas del navegador: se usa uiAsk (base.js), que se ve como la app y funciona bien en el celular */
  for (const f of [...js.filter(f => f !== 'js/base.js'), 'plano.js']) { const p = path.join(web, f); if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/(?<![.\w])(confirm|prompt|alert)\(/); if (m) errs.push(`✗ web/${f}: usa ${m[1]}() del navegador; usa uiAsk({...}) (base.js)`); }
  /* CSS: llaves equilibradas (un @media sin cerrar se traga todo lo que viene después y solo vale en el celular) */
  for (const f of css) {
    const p = path.join(web, f);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
    let d = 0, line = 1, bad = 0;
    for (const ch of txt) { if (ch === '\n') line++; if (ch === '{') d++; else if (ch === '}' && --d < 0) { bad = line; d = 0; } }
    if (bad) errs.push(`✗ ${f}: sobra una llave «}» en la línea ${bad}`);
    else if (d) errs.push(`✗ ${f}: falta cerrar ${d} llave(s) «}» (¿un @media sin cerrar?)`);
  }
  for (const f of js) {
    const p = path.join(web, f);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, 'utf8');
    if (!code.startsWith('"use strict";')) errs.push(`✗ ${f} debe empezar con "use strict"; (la app siempre corrió en modo estricto)`);
    parse(f, code);
  }
  if (js.length && js[js.length - 1] !== 'js/inicio.js') errs.push('✗ js/inicio.js (el arranque) debe ser el último archivo que carga index.html');
  // Todo el código junto debe poder leerse como un solo programa (evita nombres repetidos entre archivos)
  if (!errs.length) parse('js/* (todos juntos)', js.map(f => fs.readFileSync(path.join(web, f), 'utf8')).join('\n;\n'));
  for (const f of ['plano.js', 'sw.js']) parse(f, fs.readFileSync(path.join(web, f), 'utf8'));
  for (const f of ['manifest.json', 'icon-192.png', 'icon-512.png']) if (!fs.existsSync(path.join(web, f))) errs.push(`✗ falta web/${f}`);
  const all = js.map(f => fs.existsSync(path.join(web, f)) ? fs.readFileSync(path.join(web, f), 'utf8') : '').join('\n');
  if (!/PLANO_SRC/.test(all)) errs.push('✗ ningún archivo de js/ define PLANO_SRC');
  return errs;
}

/** Publicación (.github/workflows/ci.yml): la página solo se publica si se instalaron bien reglas y tareas en Firebase
    (auditoría 02e575c, n.º 13); sin llave de Firebase el flujo falla, no solo avisa. */
export function checkCI(file) {
  const errs = [];
  if (!fs.existsSync(file)) return errs;
  const y = fs.readFileSync(file, 'utf8');
  const job = name => { const m = y.match(new RegExp('^  ' + name + ':\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))', 'm')); return m ? m[1] : ''; };
  const pub = job('publicar-web'), ins = job('instalar');
  if (!pub || !ins) errs.push('✗ ci.yml: faltan los trabajos «instalar» o «publicar-web»');
  else {
    const needs = (pub.match(/^\s+needs:\s*\[([^\]]*)\]/m) || [])[1] || '';
    if (!needs.split(',').map(s => s.trim()).includes('instalar')) errs.push('✗ ci.yml: «publicar-web» debe depender de «instalar» (needs)');
    if (!/if: env\.SA == ''[\s\S]*?exit 1/.test(ins)) errs.push('✗ ci.yml: sin llave de Firebase («instalar») el flujo debe fallar (exit 1)');
  }
  return errs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const web = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'web');
  const errs = [...checkWeb(web), ...checkCI(path.resolve(web, '..', '.github', 'workflows', 'ci.yml'))];
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  const { js, css } = appFiles(web);
  console.log(`✓ web sin errores de sintaxis (${js.length} archivos de js/, ${css.length} de css/)`);
}
