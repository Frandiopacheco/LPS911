// Pisos del modelo BIM (docs/ia/planos.md › Modelo 3D). Lógica ya afinada con los IFC de la obra, portada tal cual del visor
// anterior: los IfcBuildingStorey de cada modelo se unen por nombre («2. SEGUNDO PISO» = «SEGUNDO PISO»), los niveles de acabado
// (…FL) se suman al piso de encima y la altura real del piso es la cara superior más común (ponderada por área) de sus losas.
// Todas las alturas están en coordenadas del mundo (Fragments desplaza cada modelo: model.object.position).

/** «2. SEGUNDO PISO» (AFC) y «SEGUNDO PISO» (ARQ) son el mismo piso */
export const lvKey = n => String(n).replace(/^\s*\d+\s*[.-]\s*/, '').trim().toUpperCase();
export const isFL = k => /FL$/.test(k);

/** Pisos de un modelo: [{name,key,ids,y0,elev,floor}] y cuántas losas tiene (model.__slabs). */
export async function levelsOf(model) {
  const tree = await model.getSpatialStructure(); const storeys = [];
  /* árbol de Fragments: nodos de categoría (category, sin localId) cuyos hijos son elementos (localId), que a su vez agrupan por categoría */
  const find = n => { if (n.category === 'IFCBUILDINGSTOREY') { (n.children || []).forEach(c => { if (c.localId != null) storeys.push(c) }); return } (n.children || []).forEach(find) };
  find(tree);
  const desc = n => { const r = []; const walk = x => { if (x.localId != null) r.push(x.localId); (x.children || []).forEach(walk) }; (n.children || []).forEach(walk); return r };
  const res = [];
  let slabs = new Set(); try { const c = await model.getItemsOfCategories([/IFCSLAB/]); slabs = new Set(Object.values(c).flat()) } catch (e) {}
  const floorOf = async ids => { const sl = ids.filter(i => slabs.has(i)); if (!sl.length) return null; const bx = await model.getBoxes(sl); const h = new Map();
    for (const b of bx) { const k = Math.round(b.max.y * 20) / 20, a = (b.max.x - b.min.x) * (b.max.z - b.min.z); h.set(k, (h.get(k) || 0) + a) }
    let best = null, bw = 0; for (const [k, w] of h) if (w > bw) { bw = w; best = k } return best };
  model.__slabs = slabs.size;
  for (const s of storeys) { const items = desc(s); if (!items.length) continue;
    const d = (await model.getItemsData([s.localId], { attributesDefault: true }))[0] || {};
    const name = (d.Name && d.Name.value) || ('Nivel ' + s.localId); const b = await model.getMergedBox(items);
    const elev = d.Elevation && typeof d.Elevation.value === 'number' ? d.Elevation.value : null;
    const dy = model.object.position.y; const fl = await floorOf(items).catch(() => null);
    res.push({ name, key: lvKey(name), ids: items, y0: b.min.y + dy, elev, floor: fl == null ? null : fl + dy }) }
  return res;
}

/** Índice de pisos de todos los modelos cargados (models: Map id → {model, levels, slabs}). */
export function levelIndex(models) {
  /* desfase de la cota 0: los elementos de un nivel empiezan en su cota o más arriba, así que el desfase es el mayor (inicio − cota)
     de cada modelo; se toma el menor entre modelos (el que tiene acabados apoyados justo en su nivel) */
  const offset = () => { let best = null; for (const { levels } of models.values()) { let m = -Infinity; for (const l of levels) if (l.elev != null) m = Math.max(m, l.y0 - l.elev); if (m > -Infinity && (best == null || m < best)) best = m } return best ?? 0 };
  /* pisos para el selector: sin los niveles de acabado (…FL), que se suman al piso que está justo encima */
  const mainLevels = () => { const all = new Map(); for (const { levels } of models.values()) for (const l of levels) { const e = all.get(l.key); if (!e) all.set(l.key, { key: l.key, name: l.key, elev: l.elev }) }
    const L = [...all.values()].sort((a, b) => (a.elev ?? 0) - (b.elev ?? 0)); const main = L.filter(l => !isFL(l.key)); const map = new Map();
    for (const l of L) { if (!isFL(l.key)) { map.set(l.key, l.key); continue } const up = main.find(m => (m.elev ?? 0) >= (l.elev ?? 0) - 0.01 && (m.elev ?? 0) - (l.elev ?? 0) < 0.8); map.set(l.key, up ? up.key : l.key) }
    return { main: L.filter(l => map.get(l.key) === l.key), map } };
  const floorLocal = (key, main, map) => {
    /* sin losas propias: la cota del nivel con el desfase que dan los pisos que sí tienen losas */
    const lv = main.find(l => l.key === key); if (!lv || lv.elev == null) return null; const ds = [];
    for (const { levels } of models.values()) for (const l of levels) if (l.floor != null && l.elev != null && map.get(l.key) === l.key) ds.push(l.floor - l.elev);
    ds.sort((a, b) => a - b); return lv.elev + (ds.length ? ds[ds.length >> 1] : offset()) };
  const floorY = key => { const { main, map } = mainLevels();
    const ms = [...models.values()].sort((a, b) => (b.slabs || 0) - (a.slabs || 0));
    for (const { levels } of ms) for (const l of levels) if (map.get(l.key) === key && l.key === key && l.floor != null) return l.floor;
    return floorLocal(key, main, map) };
  /** ids de un piso (con sus niveles de acabado) dentro de un modelo */
  const idsOf = (m, key) => { const { map } = mainLevels(); return m.levels.filter(l => map.get(l.key) === key).flatMap(l => l.ids) };
  return { mainLevels, floorY, offset, idsOf };
}
