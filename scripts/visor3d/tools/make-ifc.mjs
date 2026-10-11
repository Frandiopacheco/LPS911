// Generador de IFC4 SINTÉTICO para desarrollar y medir el visor 3D sin los modelos reales de la obra.
// Uso: node tools/make-ifc.mjs <salida.ifc> [arq|afc] [pisos=8] [filas=14] [cols=10]
//   arq → losas, muros, columnas, puertas y espacios (Rooms) con propiedades; afc → tuberías por piso.
// Los pisos se llaman «1. PRIMER PISO»… (AFC lleva el prefijo numérico como los modelos reales; ARQ no) y cada piso tiene su nivel de
// acabado «…FL» a 5 cm del nivel, para ejercitar la unión de pisos del visor. No sustituye una prueba con los IFC reales.
import fs from 'node:fs';

const [out, kind = 'arq', pisosArg = '8', filasArg = '14', colsArg = '10'] = process.argv.slice(2);
if (!out) { console.error('Uso: node tools/make-ifc.mjs <salida.ifc> [arq|afc] [pisos] [filas] [cols]'); process.exit(1) }
const NP = +pisosArg, NR = +filasArg, NC = +colsArg, H = 3.0, CELL = 6.0, T = 0.2;
const NOMBRES = ['PRIMER PISO', 'SEGUNDO PISO', 'TERCER PISO', 'CUARTO PISO', 'QUINTO PISO', 'SEXTO PISO', 'SEPTIMO PISO', 'OCTAVO PISO', 'NOVENO PISO', 'DECIMO PISO'];

let n = 0; const L = []; const id = () => ++n;
const add = s => { const i = id(); L.push(`#${i}=${s};`); return i };
const f = x => (Math.round(x * 1e4) / 1e4).toString().replace(/^(-?\d+)$/, '$1.');
const guidChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz$';
let gseed = 1234567; const rnd = () => (gseed = (gseed * 1664525 + 1013904223) >>> 0) / 4294967296;
const guid = () => { let s = guidChars[Math.floor(rnd() * 4)]; /* el primer carácter codifica solo 2 bits (0-3) */ for (let i = 1; i < 22; i++) s += guidChars[Math.floor(rnd() * 64)]; return `'${s}'` };
const str = s => `'${String(s).replace(/'/g, "''")}'`;
const pt = (x, y, z) => add(`IFCCARTESIANPOINT((${f(x)},${f(y)},${f(z)}))`);
const dir = (x, y, z) => add(`IFCDIRECTION((${f(x)},${f(y)},${f(z)}))`);
const ax = (x, y, z) => add(`IFCAXIS2PLACEMENT3D(#${pt(x, y, z)},$,$)`);
const place = (rel, x, y, z) => add(`IFCLOCALPLACEMENT(${rel == null ? '$' : '#' + rel},#${ax(x, y, z)})`);

add(`IFCPERSON($,$,${str('u')},$,$,$,$,$)`); add(`IFCORGANIZATION($,${str('o')},$,$,$)`);
const unitL = add(`IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)`), unitA = add(`IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)`), unitV = add(`IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)`);
const units = add(`IFCUNITASSIGNMENT((#${unitL},#${unitA},#${unitV}))`);
const ctx = add(`IFCGEOMETRICREPRESENTATIONCONTEXT($,${str('Model')},3,1.E-05,#${ax(0, 0, 0)},$)`);
const body = add(`IFCGEOMETRICREPRESENTATIONSUBCONTEXT(${str('Body')},${str('Model')},*,*,*,*,#${ctx},$,.MODEL_VIEW.,$)`);
const project = add(`IFCPROJECT(${guid()},$,${str('Proyecto sintético ' + kind.toUpperCase())},$,$,$,$,(#${ctx}),#${units})`);
const sitePl = place(null, 0, 0, 0), site = add(`IFCSITE(${guid()},$,${str('Sitio')},$,$,#${sitePl},$,$,.ELEMENT.,$,$,$,$,$)`);
const bldPl = place(sitePl, 0, 0, 0), bld = add(`IFCBUILDING(${guid()},$,${str('Edificio')},$,$,#${bldPl},$,$,.ELEMENT.,$,$,$)`);
const rel = (a, kids) => add(`IFCRELAGGREGATES(${guid()},$,$,$,#${a},(${kids.map(k => '#' + k).join(',')}))`);
rel(project, [site]); rel(site, [bld]);

const ax2 = () => add(`IFCAXIS2PLACEMENT2D(#${add('IFCCARTESIANPOINT((0.,0.))')},$)`);
const rect = (w, d) => add(`IFCRECTANGLEPROFILEDEF(.AREA.,$,#${ax2()},${f(w)},${f(d)})`);
const circ = r => add(`IFCCIRCLEPROFILEDEF(.AREA.,$,#${ax2()},${f(r)})`);
const zdir = dir(0, 0, 1), xdir = dir(1, 0, 0);
const solid = (prof, depth, dz = 0, along = zdir) => add(`IFCEXTRUDEDAREASOLID(#${prof},#${ax(0, 0, dz)},#${along},${f(depth)})`);
const shape = s => add(`IFCPRODUCTDEFINITIONSHAPE($,$,(#${add(`IFCSHAPEREPRESENTATION(#${body},${str('Body')},${str('SweptSolid')},(#${s}))`)}))`);
const pset = (el, name, props) => { const ps = props.map(([k, v]) => add(`IFCPROPERTYSINGLEVALUE(${str(k)},$,${typeof v === 'number' ? `IFCREAL(${f(v)})` : `IFCLABEL(${str(v)})`},$)`));
  const p = add(`IFCPROPERTYSET(${guid()},$,${str(name)},$,(${ps.map(x => '#' + x).join(',')}))`); add(`IFCRELDEFINESBYPROPERTIES(${guid()},$,$,$,(#${el}),#${p})`) };

const storeyIds = [], contents = []; const profCache = new Map(); const P = (w, d) => { const k = w + 'x' + d; if (!profCache.has(k)) profCache.set(k, rect(w, d)); return profCache.get(k) };
const mkEl = (cls, name, plRel, x, y, z, w, d, h, extra = '', ot = '$', tag = '$') => {
  const pl = place(plRel, x, y, z), sh = shape(solid(P(w, d), h));
  return add(`${cls}(${guid()},$,${str(name)},$,${ot === '$' ? '$' : str(ot)},#${pl},#${sh},${tag === '$' ? '$' : str(tag)}${extra})`) };

const levelNames = []; // [nombre, cota]
for (let p = 0; p < NP; p++) {
  const nm = NOMBRES[p] || `PISO ${p + 1}`, z0 = p * H, label = kind === 'afc' ? `${p + 1}. ${nm}` : nm;
  levelNames.push([label, z0]); levelNames.push([`${label} FL`, z0 - 0.05]); /* nivel de acabado, 5 cm bajo el piso */
}
const levelPlace = new Map();
for (const [name, z] of levelNames) {
  const pl = place(bldPl, 0, 0, z); levelPlace.set(name, pl);
  const s = add(`IFCBUILDINGSTOREY(${guid()},$,${str(name)},$,$,#${pl},$,$,.ELEMENT.,${f(z)})`); storeyIds.push(s); contents.push([s, []]) }
rel(bld, storeyIds);
const bucket = new Map(contents.map(([s, a], i) => [levelNames[i][0], a]));

for (let p = 0; p < NP; p++) {
  const nm = NOMBRES[p] || `PISO ${p + 1}`, label = kind === 'afc' ? `${p + 1}. ${nm}` : nm, pl = levelPlace.get(label), B = bucket.get(label), BFL = bucket.get(label + ' FL');
  if (kind === 'arq') {
    /* losa: cara superior en la cota del piso (la losa baja 0,20 m) */
    const s = mkEl('IFCSLAB', `Losa ${label}`, pl, NC * CELL / 2, NR * CELL / 2, -0.2, NC * CELL, NR * CELL, 0.2, ',.FLOOR.', 'Losa de concreto 20 cm', 'L' + p); pset(s, 'Pset_SlabCommon', [['Reference', 'LS-20'], ['IsExternal', 'NO']]); B.push(s);
    const fin = mkEl('IFCCOVERING', `Acabado piso ${label}`, levelPlace.get(label + ' FL'), NC * CELL / 2, NR * CELL / 2, 0, NC * CELL, NR * CELL, 0.05, ',.FLOORING.', 'Piso cerámico'); BFL.push(fin);
    for (let i = 0; i <= NC; i++) for (let j = 0; j <= NR; j++) { if ((i + j) % 2 === 0) { const c = mkEl('IFCCOLUMN', `Columna C-${i}-${j}`, pl, i * CELL, j * CELL, 0, 0.4, 0.4, H, ',.COLUMN.', 'Columna 40x40', 'C' + p + i + j); B.push(c) } }
    for (let i = 0; i < NC; i++) for (let j = 0; j <= NR; j++) { const w = mkEl('IFCWALL', `Muro ${p + 1}-${i}-${j}`, pl, i * CELL + CELL / 2, j * CELL, 0, CELL - 0.4, T, H - 0.1, ',.STANDARD.', 'Muro de albañilería 20 cm', 'M' + p + i + j); B.push(w); if (i % 3 === 0) pset(w, 'Pset_WallCommon', [['FireRating', '2h'], ['IsExternal', j === 0 || j === NR ? 'SI' : 'NO'], ['Reference', 'MU-20']]) }
    for (let i = 0; i <= NC; i++) for (let j = 0; j < NR; j++) { if (i % 2 === 1) { const w = mkEl('IFCWALL', `Tabique ${p + 1}-${i}-${j}`, pl, i * CELL, j * CELL + CELL / 2, 0, T, CELL - 0.4, H - 0.1, ',.STANDARD.', 'Tabique drywall', 'T' + p + i + j); B.push(w) } }
    for (let i = 0; i < NC; i += 2) for (let j = 1; j < NR; j += 2) { const d = mkEl('IFCDOOR', `Puerta ${p + 1}-${i}-${j}`, pl, i * CELL + 2, j * CELL, 0, 0.9, T + 0.04, 2.1, ',2.1,0.9,.DOOR.,.SINGLE_SWING.,$', 'Puerta de madera 0.90 x 2.10'); B.push(d) }
    for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) { if ((i + j) % 3 !== 0) continue; const sp = mkEl('IFCSPACE', `Ambiente ${p + 1}-${i}-${j}`, levelPlace.get(label + ' FL'), i * CELL + CELL / 2, j * CELL + CELL / 2, 0, CELL - 0.5, CELL - 0.5, 2.6, ',.ELEMENT.,.INTERNAL.,$', 'Ambiente'); pset(sp, 'Pset_SpaceCommon', [['Reference', `A-${p + 1}${i}${j}`], ['Area', (CELL - 0.5) ** 2]]); BFL.push(sp) }
  } else {
    for (let j = 0; j <= NR; j += 2) for (let i = 0; i < NC; i++) { const pl2 = place(pl, i * CELL + 0.2, j * CELL + 0.1, 2.5), s = shape(solid(circ(0.025), CELL - 0.4, 0, xdir));
      /* tubo horizontal a lo largo de X: se extruye en +Z local, así que se gira con una dirección de extrusión X */
      const e = add(`IFCPIPESEGMENT(${guid()},$,${str(`Tubería ${p + 1}-${i}-${j}`)},$,${str('Tubería PVC 50 mm')},#${pl2},#${s},$,.RIGIDSEGMENT.)`); B.push(e); if (i % 4 === 0) pset(e, 'Pset_PipeSegmentTypeCommon', [['NominalDiameter', 0.05], ['Material', 'PVC']]) }
    for (let i = 0; i <= NC; i += 3) { const pl2 = place(pl, i * CELL + 0.1, 0.1, 0.1), s = shape(solid(circ(0.04), 2.7)); const e = add(`IFCPIPESEGMENT(${guid()},$,${str(`Montante ${p + 1}-${i}`)},$,${str('Montante 80 mm')},#${pl2},#${s},$,.RIGIDSEGMENT.)`); B.push(e) }
  }
}
for (const [s, arr] of contents) if (arr.length) add(`IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid()},$,$,$,(${arr.map(x => '#' + x).join(',')}),#${s})`);

const head = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');\nFILE_NAME(${str(out.split('/').pop())},'2026-10-11T00:00:00',(''),(''),'lps911-make-ifc','','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n`;
fs.writeFileSync(out, head + L.join('\n') + '\nENDSEC;\nEND-ISO-10303-21;\n');
console.log(out, kind, `${NP} pisos`, `${n} entidades`, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
