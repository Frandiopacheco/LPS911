// LPS 911 · Visor 3D experimental (docs/ia/planos.md › Modelo 3D). Expone window.Visor3D:
//   Visor3D.convert(file, onProgress) → Uint8Array (.frag)  — convierte un IFC en el navegador (web-ifc)
//   Visor3D.create(host, {base}) → visor: add(id, bytes), visible(id, on), setLevel(name|''), cut(on), reset(), pick(cb), destroy()
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FragmentsModels } from '@thatopen/fragments';

const here = new URL('.', import.meta.url).href;
/* el conversor de IFC (web-ifc, pesado) va en otro archivo y solo se baja al cargar modelos */
async function convert(file, onProgress) { const m = await import(here + 'ifc-import.js'); return m.convert(file, onProgress, here) }

function create(host, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(opts.bg || 0xeef1f3);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.3, 3000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(60, 120, 40); scene.add(sun);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12; controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const fragments = new FragmentsModels(here + 'visor3d-worker.js');
  const models = new Map(); /* id → {model, levels:[{name,y0,ids}]} */
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  let dead = false, dirty = true, level = '', cutOn = true, onPick = null, box = new THREE.Box3();
  const size = () => { const w = host.clientWidth || 1, h = host.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true };
  const ro = new ResizeObserver(size); ro.observe(host); size();
  controls.addEventListener('change', () => { dirty = true });
  let tUpd = 0;
  const loop = () => { if (dead) return; requestAnimationFrame(loop); const moved = controls.update();
    const now = performance.now(); if (dirty || moved) { renderer.render(scene, camera); if (now - tUpd > 120) { tUpd = now; fragments.update() } dirty = false } };
  loop();
  /* pisos: los IfcBuildingStorey del árbol espacial, con la altura donde empiezan sus elementos */
  async function levelsOf(model) {
    /* árbol de Fragments: nodos de categoría (category, sin localId) cuyos hijos son elementos (localId), que a su vez agrupan por categoría */
    const tree = await model.getSpatialStructure(); const storeys = [];
    const find = n => { if (n.category === 'IFCBUILDINGSTOREY') { (n.children || []).forEach(c => { if (c.localId != null) storeys.push(c) }); return } (n.children || []).forEach(find) };
    find(tree);
    const desc = n => { const r = []; const walk = x => { if (x.localId != null) r.push(x.localId); (x.children || []).forEach(walk) }; (n.children || []).forEach(walk); return r };
    const res = [];
    /* altura real del piso: la cara superior más común (ponderada por área) de las losas del nivel */
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
    return res }
  /* «2. SEGUNDO PISO» (AFC) y «SEGUNDO PISO» (ARQ) son el mismo piso */
  function lvKey(n) { return String(n).replace(/^\s*\d+\s*[.-]\s*/, '').trim().toUpperCase() }
  const isFL = k => /FL$/.test(k);
  /* altura del modelo para la cota 0: los elementos de un nivel empiezan en su cota o más arriba, así que el desfase es el
     mayor (inicio − cota) de cada modelo; se toma el menor entre modelos (el que tiene acabados apoyados justo en su nivel) */
  function offset() { let best = null; for (const { levels } of models.values()) { let m = -Infinity; for (const l of levels) if (l.elev != null) m = Math.max(m, l.y0 - l.elev); if (m > -Infinity && (best == null || m < best)) best = m } return best ?? 0 }
  /* pisos para el selector: sin los niveles de acabado (…FL), que se suman al piso que está justo encima */
  function mainLevels() { const all = new Map(); for (const { levels } of models.values()) for (const l of levels) { const e = all.get(l.key); if (!e) all.set(l.key, { key: l.key, name: l.key, elev: l.elev }) }
    const L = [...all.values()].sort((a, b) => (a.elev ?? 0) - (b.elev ?? 0)); const main = L.filter(l => !isFL(l.key)); const map = new Map();
    for (const l of L) { if (!isFL(l.key)) { map.set(l.key, l.key); continue } const up = main.find(m => (m.elev ?? 0) >= (l.elev ?? 0) - 0.01 && (m.elev ?? 0) - (l.elev ?? 0) < 0.8); map.set(l.key, up ? up.key : l.key) }
    return { main: L.filter(l => map.get(l.key) === l.key), map } }
  const floorY = key => { const { main, map } = mainLevels();
    const ms = [...models.values()].sort((a, b) => (b.slabs || 0) - (a.slabs || 0));
    for (const { levels } of ms) for (const l of levels) if (map.get(l.key) === key && l.key === key && l.floor != null) return l.floor;
    return floorLocal(key, main, map) };
  const floorLocal = (key, main, map) => {
    /* sin losas propias: la cota del nivel con el desfase que dan los pisos que sí tienen losas */
    const lv = main.find(l => l.key === key); if (!lv || lv.elev == null) return null; const ds = [];
    for (const { levels } of models.values()) for (const l of levels) if (l.floor != null && l.elev != null && map.get(l.key) === l.key) ds.push(l.floor - l.elev);
    ds.sort((a, b) => a - b); return lv.elev + (ds.length ? ds[ds.length >> 1] : offset()) };
  function applyClip() { const y = level ? floorY(level) : null;
    if (y != null) plane.constant = y + 1.3;
    renderer.clippingPlanes = level && cutOn && y != null ? [plane] : []; dirty = true }
  async function applyLevel() { const { map } = mainLevels();
    for (const { model, levels } of models.values()) {
      if (!level) { await model.setVisible(undefined, true); continue }
      await model.setVisible(undefined, false);
      const ids = levels.filter(l => map.get(l.key) === level).flatMap(l => l.ids); if (ids.length) await model.setVisible(ids, true) }
    applyClip(); await fragments.update(true); dirty = true }
  function frame(b) { const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); const r = Math.max(s.x, s.z) || 50;
    camera.position.set(c.x + r * 0.55, c.y + r * 0.75, c.z + r * 0.75); controls.target.copy(c); camera.near = r / 500; camera.far = r * 20; camera.updateProjectionMatrix(); controls.update(); dirty = true }
  const V = {
    async add(id, bytes) { const model = await fragments.load(bytes, { modelId: id, camera }); scene.add(model.object);
      await fragments.update(true); const levels = await levelsOf(model).catch(() => []); models.set(id, { model, levels, slabs: model.__slabs || 0 });
      const b = new THREE.Box3().setFromObject(model.object); if (!b.isEmpty()) { const first = box.isEmpty(); box.union(b); if (first) frame(box) }
      if (level) await applyLevel(); dirty = true; return { levels: levels.map(l => l.name) } },
    async visible(id, on) { const m = models.get(id); if (!m) return; m.model.object.visible = on; await fragments.update(true); dirty = true },
    has: id => models.has(id),
    levels: () => mainLevels().main.map(l => l.key),
    async setLevel(name) { level = name || ''; await applyLevel();
      const fy = level ? floorY(level) : null;
      if (fy != null) { const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()); const y = fy + 1.3;
        camera.position.set(c.x, y + Math.max(s.x, s.z) * 0.55, c.z + Math.max(s.x, s.z) * 0.35); controls.target.set(c.x, y - 1.3, c.z); controls.update() } else frame(box) },
    cut(on) { cutOn = !!on; applyClip() },
    cutAt(y) { plane.constant = y; renderer.clippingPlanes = [plane]; dirty = true },
    reset() { frame(box) },
    pick(cb) { onPick = cb },
    destroy() { dead = true; ro.disconnect(); controls.dispose(); try { fragments.dispose() } catch (e) {} renderer.dispose(); host.innerHTML = '' },
    lv: () => ({ off: offset(), main: mainLevels().main.map(l => [l.key, floorY(l.key)]) }),
    stats: () => ({ models: models.size, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  };
  /* tocar un elemento: sus datos (nombre, tipo, categoría) */
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() } });
  renderer.domElement.addEventListener('pointerup', async e => {
    if (!down || !onPick || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || performance.now() - down.t > 400) return;
    const mouse = new THREE.Vector2(e.clientX, e.clientY); const cutY = renderer.clippingPlanes.length ? plane.constant : Infinity;
    let best = null;
    for (const [id, { model }] of models) { if (!model.object.visible) continue;
      const hits = await model.raycastAll({ camera, mouse, dom: renderer.domElement }).catch(() => null) || [];
      /* con el corte activo no cuentan los elementos de arriba (cielos rasos, losa superior) que no se ven */
      for (const hit of hits) if ((!hit.point || hit.point.y <= cutY + 0.01) && (!best || hit.distance < best.hit.distance)) best = { id, hit, model } }
    if (!best) { onPick(null); return }
    const d = (await best.model.getItemsData([best.hit.localId], { attributesDefault: true }))[0] || {};
    const v = k => d[k] && d[k].value; onPick({ modelo: best.id, nombre: v('Name'), tipo: v('ObjectType'), categoria: d._category && d._category.value, tag: v('Tag') });
  });
  return V;
}
window.Visor3D = { convert, create };
