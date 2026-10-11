// LPS 911 · Visor 3D (docs/ia/planos.md › Modelo 3D). Reconstruido sobre That Open Components (MIT) + Fragments 3.4.8 + web-ifc 0.0.77.
// Expone window.Visor3D:
//   Visor3D.convert(file, onProgress) → Uint8Array (.frag): convierte un IFC en el navegador (web-ifc, se baja a pedido)
//   Visor3D.create(host, opts) → visor V (ver más abajo). Todo el dibujo es a demanda: si nada cambia, no se gasta GPU.
import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import CameraControls from 'camera-controls';
import { levelsOf, levelIndex } from './levels.js';
import { readProps } from './props.js';
import { createSection } from './section.js';
import { createMeasure } from './measure.js';

const here = new URL('.', import.meta.url).href;
/* el conversor de IFC (web-ifc, pesado) va en otro archivo y solo se baja al cargar modelos */
async function convert(file, onProgress) { const m = await import(here + 'ifc-import.js'); return m.convert(file, onProgress, here) }

const SEL_MAT = { color: new THREE.Color(0x1f7bff), renderedFaces: FRAGS.RenderedFaces.TWO, opacity: 1, transparent: false };
const GHOST = 0.12;           /* (ya no se usa: el setOpacity de Fragments no se ve en pantalla; ver applyGhost) */
const OVL_MAX = 800;          /* hasta esta cantidad, lo «transparentado» se dibuja como cuerpo translúcido propio; más que eso, se pinta de gris claro */
const DIM_MAT = { color: new THREE.Color(0xdde3ea), renderedFaces: FRAGS.RenderedFaces.TWO, opacity: 1, transparent: false };
const TAP_PX = 8, TAP_MS = 450; /* toque corto: casi sin moverse y sin quedarse apretado */

function create(host, opts = {}) {
  /* ───────── mundo de Components: escena, renderizador (a demanda) y cámara ortográfica/perspectiva ───────── */
  const components = new OBC.Components();
  const world = components.get(OBC.Worlds).create();
  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, host, { antialias: opts.antialias !== false, powerPreference: 'high-performance' });
  world.camera = new OBC.OrthoPerspectiveCamera(components);
  const R = world.renderer, cam = world.camera, cc = cam.controls, canvas = R.three.domElement;
  R.mode = OBC.RendererMode.MANUAL;       /* solo se dibuja cuando algo cambia (needsUpdate) */
  R.showLogo = opts.logo !== false;
  components.init();
  world.scene.setup();
  world.scene.three.background = new THREE.Color(opts.bg || 0xeef1f3);
  canvas.style.touchAction = 'none';
  const fragments = components.get(OBC.FragmentsManager);
  fragments.init(here + 'visor3d-worker.js');
  if (opts.quality != null) fragments.core.settings.graphicsQuality = opts.quality;
  const redraw = () => { R.needsUpdate = true };

  /* ───────── cámara: inercia y gestos (un dedo gira, dos dedos acercan y desplazan) ───────── */
  cc.smoothTime = 0.32;            /* tras soltar, el movimiento se frena en ~⅓ de segundo (inercia) */
  cc.draggingSmoothTime = 0.09;    /* mientras se arrastra, sigue al dedo casi sin retraso */
  cc.dollyToCursor = true; cc.infinityDolly = false; cc.minDistance = 0.4; cc.maxDistance = 2000;
  cc.azimuthRotateSpeed = 0.9; cc.polarRotateSpeed = 0.9; cc.truckSpeed = 1.6; cc.dollySpeed = 1;
  const A = CameraControls.ACTION;
  cc.mouseButtons.left = A.ROTATE; cc.mouseButtons.right = A.TRUCK; cc.mouseButtons.middle = A.TRUCK; cc.mouseButtons.wheel = A.DOLLY;
  cc.touches.one = A.TOUCH_ROTATE; cc.touches.two = A.TOUCH_DOLLY_TRUCK; cc.touches.three = A.TOUCH_TRUCK;
  cc.addEventListener('update', redraw);
  cc.addEventListener('update', () => fragments.core.update());
  /* una vista nueva de tiles puede llegar un poco después de mover la cámara: se vuelve a dibujar cuando llegan */
  const lastCam = new THREE.Vector3(); let settle = 0;
  const keepDrawing = ms => { settle = Math.max(settle, performance.now() + ms) };
  const pump = () => { if (dead) return; if (performance.now() < settle) redraw(); requestAnimationFrame(pump) };

  /* ───────── modelos ───────── */
  const models = new Map();   /* id → {model, levels, slabs, allIds} */
  let dead = false;
  const idx = levelIndex(models);
  fragments.core.models.materials.list.onItemSet.add(({ value: m }) => { if (!('isLodMaterial' in m && m.isLodMaterial)) { m.polygonOffset = true; m.polygonOffsetUnits = 1; m.polygonOffsetFactor = Math.random() } });
  fragments.list.onItemSet.add(({ value: model }) => {
    model.useCamera(cam.three);
    model.useClippingPlanes(R.clippingPlanes);
    world.scene.three.add(model.object);
    model.tiles.onItemSet.add(redraw); model.tiles.onItemDeleted.add(redraw); model.onViewUpdated.add(redraw);
    fragments.core.update(true); redraw() });
  world.onCameraChanged.add(c => { for (const [, m] of fragments.list) m.useCamera(c.three); fragments.core.update(true); redraw() });
  const box = new THREE.Box3();

  /* ───────── estado de visibilidad por capas: especialidad (modelo) · piso · ocultos · aislados · transparentes ───────── */
  let level = '', cutOn = true, cutH = 1.3, isolated = null, onState = null;
  const emitState = () => { if (onState) onState(V.state) };
  const hidden = new Map(), ghost = new Map(), levelOf = new Map(), ovlOf = new Map();
  const setOf = (m, id) => { let s = m.get(id); if (!s) m.set(id, s = new Set()); return s };
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), botPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), BOT = 0.3; /* corte de planta: entre 30 cm bajo el piso (la losa) y la altura de corte */
  let cutActive = false, lvTimer = 0;
  function applyClip() { const y = level ? idx.floorY(level) : null; const want = !!(level && cutOn && y != null);
    if (y != null) { cutPlane.constant = y + cutH; botPlane.constant = -(y - BOT) }
    if (want !== cutActive) { R.setPlane(want, cutPlane, false); R.setPlane(want, botPlane, false); cutActive = want }
    redraw() }
  /* techo del piso: la altura de corte; sin corte, el piso de arriba (o 4,5 m) */
  function levelTop() { const y = idx.floorY(level); if (cutOn) return y + cutH; const L = idx.mainLevels().main.map(l => idx.floorY(l.key)).filter(v => v != null && v > y + 0.5).sort((a, b) => a - b); return L.length ? L[0] : y + 4.5 }
  /* alturas (mundo) de todos los elementos de un modelo: los pisos se arman por posición, no por el nivel que dice el IFC (muchos muros de un nivel nacen en otro) */
  async function boxesOf(m) { if (m.bx !== undefined) return m.bx; m.bx = null;
    try { const ids = m.allIds || (m.allIds = await m.model.getItemsIdsWithGeometry()), dy = m.model.object.position.y, n = ids.length, y0 = new Float32Array(n), y1 = new Float32Array(n);
      for (let i = 0; i < n; i += 4000) { const part = ids.slice(i, i + 4000), bs = await m.model.getBoxes(part); if (bs.length !== part.length) return m.bx = null; bs.forEach((b, k) => { y0[i + k] = b.min.y + dy; y1[i + k] = b.max.y + dy }) }
      m.bx = { ids, y0, y1 } } catch (e) { console.warn('boxesOf', e) } return m.bx }
  const hideSet = id => { const a = hidden.get(id), b = ovlOf.get(id); if (!b || !b.size) return a; if (!a || !a.size) return b; return new Set([...a, ...b]) };
  async function applyVis() { const jobs = [];
    for (const [id, m] of models) { const lv = levelOf.get(id), hid = hideSet(id), iso = isolated && isolated.get(id);
      if (isolated && !(iso && iso.size)) { jobs.push((async () => { await m.model.setVisible(undefined, false) })()); continue }
      if (!lv && !iso) { jobs.push((async () => { await m.model.resetVisible(); if (hid && hid.size) await m.model.setVisible([...hid], false) })()); continue } /* solo ocultos: se apagan esos pocos, no se reescribe todo el modelo */
      jobs.push((async () => { const base = iso ? [...iso].filter(i => !lv || lv.has(i)) : lv ? [...lv] : (m.allIds || (m.allIds = await m.model.getItemsIdsWithGeometry()));
        const ids = hid && hid.size ? base.filter(i => !hid.has(i)) : base;
        await m.model.setVisible(undefined, false); if (ids.length) await m.model.setVisible(ids, true) })()) }
    const t0 = performance.now(); await Promise.all(jobs); const t1 = performance.now(); await fragments.core.update(true); if (window.__P3DBG) console.log('applyVis set', Math.round(t1 - t0), 'update', Math.round(performance.now() - t1)); redraw(); keepDrawing(400); emitState() }
  async function applyLevel() { levelOf.clear();
    if (level) { const y = idx.floorY(level), bot = (y ?? 0) - BOT, top = y == null ? 0 : levelTop();
      for (const [id, m] of models) { const bx = y == null ? null : await boxesOf(m); if (!bx) { levelOf.set(id, new Set(idx.idsOf(m, level))); continue }
        const out = new Set(); for (let i = 0; i < bx.ids.length; i++) if (bx.y1[i] >= bot && bx.y0[i] <= top) out.add(bx.ids[i]); levelOf.set(id, out) } }
    applyClip(); await applyVis() }
  /* «Transparentar»: el setOpacity de Fragments no se ve en pantalla (ni en PC ni en tablet), así que se hace por fuera:
     – pocos elementos: se ocultan de Fragments y se dibujan aparte como cuerpo translúcido con sus aristas (overlay);
     – muchos (atenuar el resto): se pintan de gris claro con el resaltado de Fragments. */
  async function buildOverlays() { for (const [id, m] of models) { if (m.ovl) { m.ovl.removeFromParent(); m.ovl.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); m.ovl = null }
      const set = ovlOf.get(id); if (!set || !set.size) continue; let data = []; try { data = await m.model.getItemsGeometry([...set]) } catch (e) { console.warn('overlay', e); continue }
      const pos = [], idx = [], v = new THREE.Vector3(); let off = 0;
      for (const meshes of data) for (const md of meshes || []) { if (!md.positions || !md.indices) continue; const p = md.positions;
        for (let i = 0; i + 2 < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(md.transform); pos.push(v.x, v.y, v.z) } for (let i = 0; i < md.indices.length; i++) idx.push(md.indices[i] + off); off += p.length / 3 }
      if (!pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const grp = new THREE.Group(); grp.renderOrder = 5;
      const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); mesh.renderOrder = 5; mesh.frustumCulled = false;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: 0x5b6b7c, transparent: true, opacity: 0.6, depthWrite: false })); edges.renderOrder = 6; edges.frustumCulled = false;
      grp.add(mesh, edges); m.model.object.add(grp); m.ovl = grp } }
  async function applyGhost() { const total = [...ghost.values()].reduce((n, g) => n + g.size, 0), overlay = total <= OVL_MAX; ovlOf.clear();
    if (overlay) for (const [id, g] of ghost) if (g.size) ovlOf.set(id, new Set(g));
    await applyVis(); await buildOverlays(); await paintAll() }
  /* resaltados: gris claro para lo atenuado (si no va como overlay) y azul para la selección, que manda */
  async function paintAll() { for (const [id, m] of models) { await m.model.resetHighlight(undefined); const g = ghost.get(id); if (g && g.size && !ovlOf.get(id)) await m.model.highlight([...g], DIM_MAT); const s = sel.get(id); if (s && s.size) await m.model.highlight([...s], SEL_MAT) }
    await fragments.core.update(true); redraw(); keepDrawing(400); emitState() }

  /* ───────── selección ───────── */
  const sel = new Map(); let onSelect = null, tool = 'select', onTool = null;
  const selCount = () => { let n = 0; for (const s of sel.values()) n += s.size; return n };
  const selMap = () => { const o = {}; for (const [k, s] of sel) if (s.size) o[k] = [...s]; return o };
  async function paintSel(prev) { for (const [id, s] of prev) { const m = models.get(id); if (!m || !s.size) continue; const ids = [...s]; await m.model.resetHighlight(ids);
      const g = ghost.get(id); if (g && !ovlOf.get(id)) { const d = ids.filter(i => g.has(i)); if (d.length) await m.model.highlight(d, DIM_MAT) } }
    for (const [id, s] of sel) { const m = models.get(id); if (m && s.size) await m.model.highlight([...s], SEL_MAT) }
    await fragments.core.update(true); redraw(); keepDrawing(300) }
  async function setSel(map, add) { const prev = new Map([...sel].map(([k, s]) => [k, new Set(s)]));
    if (!add) sel.clear();
    for (const [id, ids] of Object.entries(map || {})) { const s = setOf(sel, id); for (const i of ids) { if (add && s.has(i)) s.delete(i); else s.add(i) } }
    await paintSel(prev); if (onSelect) onSelect({ count: selCount(), map: selMap() }) }
  /* ¿el acierto del raycast se ve en pantalla? El raycast no sabe de ocultos, pisos, aislados ni cortes: lo que está recortado no se debe poder tocar */
  const planesNow = () => { const a = []; if (cutActive) a.push(cutPlane, botPlane); return a.concat(sections.planes()) };
  function seen(id, h) { const hid = hidden.get(id); if (hid && hid.has(h.localId)) return false;
    if (isolated) { const iso = isolated.get(id); if (!iso || !iso.has(h.localId)) return false }
    const lv = levelOf.get(id); if (lv && !lv.has(h.localId)) return false;
    if (h.point) for (const pl of planesNow()) if (pl.distanceToPoint(h.point) < -1e-3) return false; return true }
  async function pickAt(cx, cy) { const mouse = new THREE.Vector2(cx, cy); let best = null;
    for (const [id, { model }] of models) { if (!model.object.visible) continue;
      const hits = await model.raycastAll({ camera: cam.three, mouse, dom: canvas }).catch(() => null) || []; const g = ghost.get(id);
      for (const h of hits) { if (g && g.has(h.localId)) continue; if (!seen(id, h)) continue; if (!best || h.distance < best.hit.distance) best = { id, hit: h, model } } }
    return best }
  const sections = createSection({ THREE, OBC, components, world, fragments, R, cam, canvas, redraw, models, getBox: () => box, selBox: async () => boxOfSel(), levelBox: () => levelBox() });
  sections.onPlaced = () => V.setTool('select');
  const measure = createMeasure({ THREE, OBC, components, world, fragments, R, cam, canvas, redraw, pickAt });

  async function boxOfSel() { const b = new THREE.Box3(); for (const [id, s] of sel) { const m = models.get(id); if (!m || !s.size) continue; const bb = await m.model.getMergedBox([...s]); if (!bb.isEmpty()) b.union(bb.clone().translate(m.model.object.position)) } return b }
  function levelBox() { if (!level) return box.clone(); const y = idx.floorY(level); if (y == null) return box.clone(); const b = box.clone(); b.min.y = y - 0.05; b.max.y = y + cutH + 1.7; return b }

  /* toque corto sobre el modelo: seleccionar / usar la herramienta activa. Los arrastres y los gestos de varios dedos no cuentan. */
  let down = null, pointers = 0, gizmoBusy = false;
  canvas.addEventListener('pointerdown', e => { pointers++; down = pointers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now(), shift: e.shiftKey || e.ctrlKey || e.metaKey, gz: sections.overGizmo() } : null });
  const up = async e => { pointers = Math.max(0, pointers - 1); const d = down; down = null;
    if (!d || e.type === 'pointercancel' || d.gz || sections.busy()) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_PX || performance.now() - d.t > TAP_MS) return;
    const r = canvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    if (tool === 'section' || tool === 'measure') { const hit = await pickAt(e.clientX, e.clientY); if (tool === 'section') await sections.tapSurface(hit); else await measure.tap(hit, { x, y }); return }
    const hit = await pickAt(e.clientX, e.clientY);
    if (!hit) { if (!d.shift) await setSel({}, false); return }
    await setSel({ [hit.id]: [hit.hit.localId] }, d.shift || V.multi) };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  const ro = new ResizeObserver(() => redraw()); ro.observe(host);

  /* ───────── rendimiento: cuadros dibujados de verdad (no los del navegador), medidor en vivo y prueba automática ───────── */
  const drawn = []; /* marcas de tiempo de cada dibujo (últimos 180) */
  R.onAfterUpdate.add(() => { drawn.push(performance.now()); if (drawn.length > 180) drawn.shift() });
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
  function perf() { const now = performance.now(), last = drawn.filter(t => now - t < 1000), iv = []; for (let i = Math.max(1, drawn.length - 60); i < drawn.length; i++) iv.push(drawn[i] - drawn[i - 1]);
    const act = drawn.length && now - drawn[drawn.length - 1] < 500; iv.sort((a, b) => a - b);
    return { fps: act ? last.length : 0, p50: +pct(iv, 0.5).toFixed(1), p95: +pct(iv, 0.95).toFixed(1), max: +(iv[iv.length - 1] || 0).toFixed(1), ...V.stats() } }
  /** Prueba automática: gira la cámara `ms` milisegundos y mide cuántos cuadros se dibujan y cuánto tardan (en esta PC o tablet). */
  function bench(ms = 4000, onTick) { return new Promise(res => { const ts = []; let t0 = performance.now(), dead2 = false; const keep = cc.smoothTime; cc.smoothTime = 0; const stats0 = V.stats();
    const tick = t => { if (dead || dead2) return; const el = t - t0; ts.push(t); cc.rotate(0.011, Math.sin(el / 700) * 0.0035, false); redraw(); if (onTick) onTick(Math.min(1, el / ms));
      if (el < ms) requestAnimationFrame(tick); else { dead2 = true; cc.smoothTime = keep; const iv = []; for (let i = 1; i < ts.length; i++) iv.push(ts[i] - ts[i - 1]); iv.sort((a, b) => a - b);
        const dropped = iv.filter(x => x > 33.4).length; res({ ms: Math.round(el), cuadros: ts.length, fps: +(ts.length / el * 1000).toFixed(1), p50: +pct(iv, 0.5).toFixed(1), p95: +pct(iv, 0.95).toFixed(1), max: +(iv[iv.length - 1] || 0).toFixed(1), lentos: dropped, ...V.stats(), dpr: R.three.getPixelRatio() }) } };
    requestAnimationFrame(tick) }) }
  const PRESETS = { alta: [2, 1], equilibrada: [1.5, 0.7], rapida: [1, 0.4] };
  let preset = '';
  function setPreset(name) { const [d, q] = PRESETS[name] || PRESETS.alta; preset = name in PRESETS ? name : 'alta';
    R.three.setPixelRatio(Math.min(window.devicePixelRatio || 1, d)); R.resize(); fragments.core.settings.graphicsQuality = q; fragments.core.update(true); redraw(); keepDrawing(500) }

  /* ───────── vistas ───────── */
  const ctr = b => b.getCenter(new THREE.Vector3());
  /* encuadra conservando el ángulo de la cámara (fitToBox de camera-controls la gira al eje más cercano; fitToSphere no) */
  function fitBox(b, anim = true, pad = 1.1) { if (b.isEmpty()) return Promise.resolve(); const s = b.getBoundingSphere(new THREE.Sphere()); s.radius *= pad; return cc.fitToSphere(s, anim) }
  /* acerca la cámara a una caja sin girarla: mismo rumbo, distancia justa para que el elemento llene la pantalla */
  function focusBox(b, pad = 1.3) { if (b.isEmpty()) return Promise.resolve(); if (!cam.three.isPerspectiveCamera) return fitBox(b, true, pad);
    const c = ctr(b), r = Math.max(b.getBoundingSphere(new THREE.Sphere()).radius, 0.6), dist = r * pad / Math.sin(cam.three.fov * Math.PI / 360);
    const pos = new THREE.Vector3(), tgt = new THREE.Vector3(); cc.getPosition(pos); cc.getTarget(tgt); const d = pos.sub(tgt); if (d.lengthSq() < 1e-6) d.set(0.6, 0.6, 0.8); d.normalize().multiplyScalar(dist);
    return cc.setLookAt(c.x + d.x, c.y + d.y, c.z + d.z, c.x, c.y, c.z, true) }
  function frame(b, anim) { const c = ctr(b), s = b.getSize(new THREE.Vector3()), r = Math.max(s.x, s.z, s.y) || 50;
    cc.setLookAt(c.x + r * 0.7, c.y + r * 0.7, c.z + r * 0.9, c.x, c.y, c.z, !!anim); cc.maxDistance = r * 12; cc.minDistance = 0.3; cam.threePersp.near = Math.max(0.05, r / 4000); cam.threePersp.far = r * 40; cam.threePersp.updateProjectionMatrix(); redraw() }
  let planOn = false;
  async function setProjection(p) { cam.projection.set(p === 'ortho' ? 'Orthographic' : 'Perspective'); redraw() }

  /* ───────── API ───────── */
  const V = {
    multi: false, world, components, fragments, THREE, OBC,
    async add(id, bytes) { const model = await fragments.core.load(bytes, { modelId: id, camera: cam.three, clippingPlanes: R.clippingPlanes });
      /* fragments.list.onItemSet ya lo agregó a la escena */
      await fragments.core.update(true); const levels = await levelsOf(model).catch(() => []); models.set(id, { model, levels, slabs: model.__slabs || 0 });
      const b = new THREE.Box3().setFromObject(model.object); if (!b.isEmpty()) { const first = box.isEmpty(); box.union(b); if (first) frame(box, false) }
      if (level) await applyLevel(); redraw(); keepDrawing(600); return { levels: levels.map(l => l.name) } },
    async visible(id, on) { const m = models.get(id); if (!m) return; m.model.object.visible = on; await fragments.core.update(true); redraw() },
    has: id => models.has(id), isOn: id => !!(models.get(id) && models.get(id).model.object.visible),
    /* pisos */
    levels: () => idx.mainLevels().main.map(l => l.key), get level() { return level }, get cutHeight() { return cutH }, get cutEnabled() { return cutOn },
    async setLevel(name) { level = name || ''; await applyLevel();
      if (level && planOn) await V.planView(true); else if (level) { const b = levelBox(); await fitBox(b, true, 1.05) } else frame(box, true) },
    cut(on) { cutOn = !!on; applyClip(); if (level) applyLevel() }, setCutHeight(h) { cutH = Math.max(0.2, Math.min(3, +h || 1.3)); applyClip(); if (level) { clearTimeout(lvTimer); lvTimer = setTimeout(applyLevel, 250) } },
    levelBox,
    async dbgLevel() { const o = []; for (const [id, m] of models) { const set = levelOf.get(id) || new Set(), mem = new Set(idx.idsOf(m, level)); const c = await m.model.getItemsOfCategories([/^IFCSLAB$/]); const sl = Object.values(c).flat(); o.push({ id, spatial: set.size, member: mem.size, slabsSpatial: sl.filter(i => set.has(i)).length, slabsMember: sl.filter(i => mem.has(i)).length, slabs: sl.length, bx: !!m.bx }) } return o },
    async probe(cx, cy) { const h = await pickAt(cx, cy); return h ? { p: h.hit.point.toArray(), id: h.id, lid: h.hit.localId } : null },
    async selectionBox() { const b = await boxOfSel(); return b.isEmpty() ? null : { min: b.min.toArray(), max: b.max.toArray() } },
    levelInfo() { return { offset: idx.offset(), main: idx.mainLevels().main.map(l => ({ key: l.key, elev: l.elev, floorY: idx.floorY(l.key) })), models: [...models].map(([id, m]) => ({ id, slabs: m.slabs, posY: m.model.object.position.y, levels: m.levels.map(l => ({ name: l.name, elev: l.elev, y0: l.y0, floor: l.floor, n: l.ids.length })) })) } },
    /* cámara */
    reset() { frame(box, true) }, fit: b => fitBox(b || box), fitSelection: async () => { const b = await boxOfSel(); if (!b.isEmpty()) await focusBox(b, 1.3) },
    view(name) { const b = level ? levelBox() : box, c = ctr(b), s = b.getSize(new THREE.Vector3()), r = Math.max(s.x, s.y, s.z) * 1.2 || 50;
      const P = { top: [0, 1, 0.0001], front: [0, 0, -1], back: [0, 0, 1], left: [-1, 0, 0], right: [1, 0, 0], iso: [0.7, 0.7, 0.9] }[name] || [0.7, 0.7, 0.9];
      cc.setLookAt(c.x + P[0] * r, c.y + P[1] * r, c.z + P[2] * r, c.x, c.y, c.z, true) },
    projection: setProjection, get projectionName() { return cam.projection.current },
    async planView(on) { planOn = !!on;
      if (planOn) { await setProjection('ortho'); cam.set('Plan'); const b = levelBox(), c = ctr(b), y = level ? idx.floorY(level) : b.max.y;
        cam.threeOrtho.near = -5000; cam.threeOrtho.far = 5000; cam.threeOrtho.updateProjectionMatrix();
        await cc.setLookAt(c.x, (y ?? b.max.y) + cutH + 20, c.z + 0.0001, c.x, y ?? c.y, c.z, false); await cc.fitToBox(b, true, { paddingTop: 0.2, paddingBottom: 0.2, paddingLeft: 0.2, paddingRight: 0.2 }) }
      else { cam.set('Orbit'); await setProjection('persp'); if (level) await fitBox(levelBox(), true, 1.05); else frame(box, true) }
      redraw() },
    get plan() { return planOn },
    /* selección y propiedades */
    onSelect(cb) { onSelect = cb }, async select(map, add) { await setSel(map, add) }, clearSelection() { return setSel({}, false) }, selection: selMap, selectionCount: selCount,
    async props() { const o = selMap(); const id = Object.keys(o)[0]; if (!id) return null; const m = models.get(id); return readProps(m.model, o[id][0], id) },
    /* ocultar / aislar / transparentar / mostrar todo (sobre la selección) */
    async hide() { for (const [id, s] of sel) { const h = setOf(hidden, id); s.forEach(i => h.add(i)) } await setSel({}, false); await applyVis() },
    async isolate() { if (!selCount()) return; const b = await boxOfSel(); isolated = new Map([...sel].map(([k, s]) => [k, new Set(s)])); await setSel({}, false); await applyVis(); if (!b.isEmpty()) await focusBox(b, 1.3) },
    async ghostSel() { for (const [id, s] of sel) { const g = setOf(ghost, id); s.forEach(i => g.add(i)) } await setSel({}, false); await applyGhost() },
    async ghostOthers() { if (!selCount()) return; for (const [id, m] of models) { const all = m.allIds || (m.allIds = await m.model.getItemsIdsWithGeometry()); const keep = sel.get(id), g = setOf(ghost, id); all.forEach(i => { if (!keep || !keep.has(i)) g.add(i) }) } await setSel({}, false); await applyGhost() },
    async showAll() { const hadG = [...ghost.values()].some(g => g.size); hidden.clear(); ghost.clear(); ovlOf.clear(); isolated = null; await setSel({}, false); await applyVis(); if (hadG) { await buildOverlays(); await paintAll() } },
    onState(cb) { onState = cb },
    get state() { return { hidden: [...hidden.values()].reduce((n, s) => n + s.size, 0), ghost: [...ghost.values()].reduce((n, s) => n + s.size, 0), isolated: !!isolated } },
    /* herramientas: 'select' | 'section' (toque sobre una superficie) | 'measure' */
    setTool(t) { tool = t; if (t !== 'measure') measure.stop(); if (onTool) onTool(t); canvas.style.cursor = t === 'select' ? '' : 'crosshair' }, get tool() { return tool }, onTool(cb) { onTool = cb },
    section: sections, async sectionBox(target) { const b = target === 'sel' ? await boxOfSel() : target === 'level' ? levelBox() : box.clone(); const ok = sections.box(b); if (ok && target === 'sel') await focusBox(b, 1.8); return ok }, measure,
    /* rendimiento */
    quality(q) { fragments.core.settings.graphicsQuality = q; fragments.core.update(true); redraw() },
    stats: () => ({ models: models.size, calls: R.three.info.render.calls, tris: R.three.info.render.triangles, geoms: R.three.info.memory.geometries, tex: R.three.info.memory.textures, dpr: R.three.getPixelRatio() }),
    perf, bench, preset: setPreset, get presetName() { return preset },
    redraw, keepDrawing, canvas, camera: cam, renderer: R,
    destroy() { dead = true; ro.disconnect(); try { sections.dispose(); measure.dispose() } catch (e) {} try { components.dispose() } catch (e) {} host.innerHTML = '' },
  };
  requestAnimationFrame(pump);
  setPreset(opts.preset || 'alta');
  return V;
}
window.Visor3D = { convert, create };
