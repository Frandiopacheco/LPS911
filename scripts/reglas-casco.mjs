// Genera las reglas del módulo Casco (docs/ia/casco.md) dentro de firebase/firestore.rules.
// Casco usa el mismo motor de Last Planner con sus propias colecciones: el prefijo cs_ (cs_acts, cs_pisos…).
// Este script copia las reglas de Last Planner (todo lo que está antes del marcador CASCO) y en la copia:
//  - renombra cada función con el sufijo _cs (para que no choque con la original),
//  - cambia las rutas /colección/ por /cs_colección/ (también las de get()/exists()),
//  - deja fuera las colecciones compartidas entre módulos (equipo, tareo, planos, avisos).
// Uso: node scripts/reglas-casco.mjs          → reescribe la sección generada
//      node scripts/reglas-casco.mjs --check  → falla si la sección no está al día (lo usa scripts/check.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'firebase/firestore.rules');
export const PREFIX = 'cs_';
/* compartidas entre Last Planner y Casco (mismo nombre, sin prefijo): equipo, tareo, módulo Planos, avisos push */
export const SHARED = new Set(['members', 'inv', 'clock', 'push', 'pushp', 'pushlog', 'plb', 'eto', 'p3d', 'hhpc',
  'tareo', 'tfot', 'tpub', 'tpubidx', 'tpexc', 'tpauto', 'tper', 'tperbk', 'tperp', 'tpc', 'tpcbk', 'tcfg']);
const BEGIN = '    // ==== CASCO: generado por scripts/reglas-casco.mjs a partir de las reglas de arriba. No lo edites a mano ====';
const END = '    // ==== FIN CASCO ====';

/* recorre el texto y devuelve los elementos de primer nivel (funciones, match, comentarios) con su texto exacto */
function items(src) {
  const out = []; let i = 0, depth = 0, start = -1, kind = null;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); if (depth === 0 && start < 0) out.push({ kind: 'comment', text: src.slice(i, e < 0 ? src.length : e) }); i = e < 0 ? src.length : e; continue; }
    if (c === "'" || c === '"') { i++; while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (depth === 0 && start < 0 && /\S/.test(c)) {
      start = i;
      kind = src.startsWith('function', i) ? 'function' : src.startsWith('match', i) ? 'match' : 'other';
      /* la ruta de un match lleva llaves ({id}): no cuentan como bloque */
      if (kind === 'match') { i += /^match\s+\S+/.exec(src.slice(i))[0].length; continue; }
    }
    if (c === 'm' && depth > 0 && /^match\s/.test(src.slice(i, i + 6)) && /[\s{;]/.test(src[i - 1] || ' ')) { i += /^match\s+\S+/.exec(src.slice(i))[0].length; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0 && start >= 0) { out.push({ kind, text: src.slice(start, i + 1) }); start = -1; } }
    i++;
  }
  return out;
}

export function generate(full) {
  const open = full.indexOf('match /databases/{database}/documents {');
  if (open < 0) throw new Error('No se encontró match /databases/{database}/documents');
  const bodyStart = full.indexOf('\n', open) + 1;
  let srcEnd = full.indexOf(BEGIN);
  let tailStart;
  if (srcEnd < 0) { srcEnd = full.lastIndexOf('  }\n}'); tailStart = srcEnd; }
  else tailStart = full.indexOf(END) + END.length + 1;
  const src = full.slice(bodyStart, srcEnd);
  const its = items(src);
  const fnames = its.filter(x => x.kind === 'function').map(x => x.text.match(/^function\s+(\w+)/)[1]);
  const fre = new RegExp('(?<![\\w.$])(' + fnames.sort((a, b) => b.length - a.length).join('|') + ')(?=\\s*\\()', 'g');
  const colOf = t => (t.match(/^match\s+\/([^/\s]+)\//) || [])[1];
  /* colecciones conocidas: las de cada match y las de dataCol (así un campo como 'arch' no se toma por colección) */
  const KNOWN = new Set(its.filter(x => x.kind === 'match').map(x => colOf(x.text)).filter(Boolean));
  const dc = its.find(x => x.kind === 'function' && /^function\s+dataCol\b/.test(x.text));
  if (dc) (dc.text.match(/'([a-z][a-zA-Z0-9]*)'/g) || []).forEach(q => KNOWN.add(q.slice(1, -1)));
  const nsCol = n => KNOWN.has(n) && !SHARED.has(n);
  const lits = t => t.replace(/'([a-z][a-zA-Z0-9]*)'/g, (m, n) => nsCol(n) ? `'${PREFIX}${n}'` : m);
  const paths = t => t.replace(/\/documents\/([a-z][a-zA-Z0-9]*)\//g, (m, n) => nsCol(n) ? `/documents/${PREFIX}${n}/` : m);
  const lines = [];
  for (const it of its) {
    if (it.kind === 'comment' || it.kind === 'other') continue;
    let t = it.text;
    if (it.kind === 'match') {
      const c = colOf(t); if (!c) continue;
      if (c === '{col}') t = lits(t);
      else if (SHARED.has(c)) continue;
      else t = t.replace(/^match\s+\/([^/\s]+)\//, `match /${PREFIX}$1/`);
    }
    if (it.kind === 'function' && /^function\s+dataCol\b/.test(t)) t = lits(t);
    t = paths(t).replace(fre, '$1_cs');
    lines.push('    ' + t);
  }
  const gen = `${BEGIN}\n${lines.join('\n')}\n${END}\n`;
  return full.slice(0, srcEnd) + gen + full.slice(tailStart);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cur = fs.readFileSync(FILE, 'utf8');
  const next = generate(cur);
  if (process.argv.includes('--check')) {
    if (next !== cur) { console.error('firebase/firestore.rules: la sección CASCO no está al día. Corre: node scripts/reglas-casco.mjs'); process.exit(1); }
    console.log('Reglas de Casco al día');
  } else { fs.writeFileSync(FILE, next); console.log('Reglas de Casco generadas'); }
}
