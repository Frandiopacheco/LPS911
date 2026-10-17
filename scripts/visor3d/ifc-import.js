// Conversor IFC → .frag en el navegador (That Open Fragments + web-ifc). Lo carga visor3d.js a pedido.
import { IfcImporter } from '@thatopen/fragments';
export async function convert(file, onProgress, base) {
  const imp = new IfcImporter();
  imp.wasm = { absolute: true, path: base };
  const bytes = siteNorth(new Uint8Array(await file.arrayBuffer()));
  return imp.process({ bytes, progressCallback: p => onProgress && onProgress(p) });
}

/* Norte del proyecto (oct 2026): algunos Revit exportan en el IfcSite el giro al norte verdadero (en la obra, ARQ y MOB ~12°) y otros no,
   así que esos modelos salían girados respecto a EST, AFC… El visor alinea los modelos solo por desplazamiento, no por giro. Aquí se quita
   el giro del emplazamiento del IfcSite (se conserva su punto): todos quedan en el norte del proyecto, como en Dalux. Se cambia solo la
   línea del IfcLocalPlacement del sitio y se agrega un IfcAxis2Placement3D nuevo (el original puede estar compartido con otras entidades).
   Si el archivo no trae ese giro, no se toca nada. */
export function siteNorth(b) {
  try {
    const s = new TextDecoder('latin1').decode(b);           // 1 carácter por byte: los índices sirven para cortar los bytes originales
    const site = /^#\d+=IFCSITE\(([^\r\n]*)\);/m.exec(s); if (!site) return b;
    const args = splitArgs(site[1]); const pl = (args[5] || '').trim(); if (!/^#\d+$/.test(pl)) return b;
    const lp = new RegExp('^' + pl + '=IFCLOCALPLACEMENT\\(([^,]*),(#\\d+)\\);', 'm').exec(s); if (!lp || lp[1].trim() !== '$') return b;
    const ax = new RegExp('^' + lp[2] + '=IFCAXIS2PLACEMENT3D\\(([^\\r\\n]*)\\);', 'm').exec(s); if (!ax) return b;
    const a = splitArgs(ax[1]); const loc = (a[0] || '').trim(), z = (a[1] || '$').trim(), x = (a[2] || '$').trim();
    if (z === '$' && x === '$') return b;
    if (x !== '$') { const d = /^#\d+=IFCDIRECTION\(\(([^)]*)\)\);/m.exec(s.slice(s.search(new RegExp('^' + x + '=', 'm')))); if (d) { const [dx, dy] = d[1].split(',').map(Number); if (Math.abs(dx - 1) < 1e-9 && Math.abs(dy || 0) < 1e-9 && z === '$') return b } }
    let max = 0; for (const m of s.matchAll(/^#(\d+)=/gm)) { const n = +m[1]; if (n > max) max = n }
    const nid = '#' + (max + 1), rep = `${pl}=IFCLOCALPLACEMENT($,${nid});\n${nid}=IFCAXIS2PLACEMENT3D(${loc},$,$);`;
    const enc = new Uint8Array(rep.length); for (let i = 0; i < rep.length; i++) enc[i] = rep.charCodeAt(i);
    const out = new Uint8Array(b.length - lp[0].length + enc.length);
    out.set(b.subarray(0, lp.index), 0); out.set(enc, lp.index); out.set(b.subarray(lp.index + lp[0].length), lp.index + enc.length);
    return out;
  } catch (e) { console.warn('norte del proyecto: no se pudo ajustar el IfcSite', e); return b }
}
/* argumentos de primer nivel de una entidad STEP (respeta textos y paréntesis) */
function splitArgs(t) { const out = []; let d = 0, q = false, cur = '';
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { cur += c; if (c === "'") { if (t[i + 1] === "'") { cur += t[++i] } else q = false } continue }
    if (c === "'") { q = true; cur += c } else if (c === '(') { d++; cur += c } else if (c === ')') { d--; cur += c } else if (c === ',' && d === 0) { out.push(cur); cur = '' } else cur += c }
  out.push(cur); return out }
