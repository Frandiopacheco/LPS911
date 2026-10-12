// Propiedades de un elemento para la paleta del visor: atributos IFC, piso, tipo y los Property/Quantity sets (Pset_*, Qto_*).
// Fragments devuelve ItemData: cada atributo es {value, type}; las relaciones son listas de ItemData anidados.

const val = a => (a && typeof a === 'object' && 'value' in a) ? a.value : a;
const isAttr = a => a && typeof a === 'object' && !Array.isArray(a) && 'value' in a;
const txt = v => v == null || v === '' ? '' : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000)) : String(v);

/** Convierte una propiedad (IfcPropertySingleValue, IfcQuantityLength…) en [nombre, valor] o null. */
function oneProp(p) {
  const name = val(p.Name); if (name == null) return null;
  for (const k of ['NominalValue', 'LengthValue', 'AreaValue', 'VolumeValue', 'WeightValue', 'CountValue', 'TimeValue']) if (p[k] !== undefined) {
    let v = val(p[k]); if (v && typeof v === 'object' && 'value' in v) v = v.value;
    const u = p.Unit && val(p.Unit.Name || p.Unit) ;
    return [String(val(name)), txt(v) + (typeof v === 'number' && typeof u === 'string' && u ? ' ' + u : '')] }
  /* enumerada / con límites / lista */
  for (const k of ['EnumerationValues', 'ListValues']) if (Array.isArray(p[k])) return [String(val(name)), p[k].map(x => txt(val(x))).join(', ')];
  return null;
}

/** Grupos de propiedades: [{titulo, filas:[[nombre, valor]]}] a partir de las relaciones IsDefinedBy (+ tipo). */
function groupsOf(data) {
  const out = [];
  const take = defs => { for (const d of (Array.isArray(defs) ? defs : defs ? [defs] : [])) {
    const title = txt(val(d.Name)) || 'Propiedades';
    const list = d.HasProperties || d.Quantities || d.Properties || [];
    const rows = (Array.isArray(list) ? list : [list]).map(oneProp).filter(Boolean);
    if (rows.length) out.push({ titulo: title, filas: rows }) } };
  take(data.IsDefinedBy); take(data.IsTypedBy && [].concat(data.IsTypedBy).flatMap(t => t && t.HasPropertySets || []));
  return out;
}

/** Lee todo lo que la paleta muestra de un elemento (localId de un modelo de Fragments). */
export async function readProps(model, localId, modelName) {
  let d = {};
  try { d = (await model.getItemsData([localId], { attributesDefault: true, relations: { IsDefinedBy: { attributes: true, relations: true }, ContainedInStructure: { attributes: true, relations: false }, IsTypedBy: { attributes: true, relations: true } } }))[0] || {} }
  catch (e) { try { d = (await model.getItemsData([localId], { attributesDefault: true }))[0] || {} } catch (e2) {} }
  const v = k => { const a = d[k]; return a && a.value !== undefined ? a.value : undefined };
  const storey = [].concat(d.ContainedInStructure || []).map(s => txt(val(s.Name))).filter(Boolean)[0] || '';
  const attrs = []; const skip = new Set(['Name', 'ObjectType', 'Tag', 'GlobalId', 'Description']);
  for (const [k, a] of Object.entries(d)) { if (k.startsWith('_') || skip.has(k) || !isAttr(a)) continue; const t = txt(a.value); if (t) attrs.push([k, t]) }
  const tipoObj = [].concat(d.IsTypedBy || [])[0];
  return {
    modelo: modelName, localId,
    nombre: txt(v('Name')) || 'Elemento', tipo: txt(v('ObjectType')) || (tipoObj ? txt(val(tipoObj.Name)) : ''),
    categoria: d._category ? txt(d._category.value) : '', guid: txt(d._guid && d._guid.value || v('GlobalId')), tag: txt(v('Tag')), piso: storey,
    grupos: [...(attrs.length ? [{ titulo: 'Atributos IFC', filas: attrs }] : []), ...groupsOf(d)],
  };
}
