// Cortes del modelo: plano tocando una superficie y caja de sección, ambos con flechas (gizmo) para ajustarlos. Se apoya en el Clipper de
// That Open Components, que ya aplica los planos a todos los materiales de Fragments y trae el gizmo de cada plano.
export function createSection(C) {
  const { THREE, OBC, components, world, R, canvas, redraw } = C;
  const clipper = components.get(OBC.Clipper);
  clipper.enabled = true; clipper.visible = true;
  try { clipper.material.color.set(0x2f80ff); clipper.material.opacity = 0.14; clipper.material.transparent = true; clipper.material.depthWrite = false } catch (e) {}
  const items = new Map();   /* id → {kind:'surf'|'box', face?:'+x'…, label, o (origen), n (normal), el (tirador)} */
  const host = canvas.parentElement;
  const layer = document.createElement('div'); layer.className = 'p3sl'; layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:3'; host.appendChild(layer);
  let dragging = false, onChange = null, boxOn = false, helper = null, hideGizmos = false;
  const emit = () => { if (onChange) onChange(list()) };
  const list = () => [...items].map(([id, it]) => ({ id, kind: it.kind, label: it.label, face: it.face, visible: !hideGizmos }));
  clipper.onBeforeDrag.add(() => { dragging = true });
  clipper.onAfterDrag.add(() => { redraw(); setTimeout(() => { dragging = false }, 60) });
  clipper.onAfterDelete.add(() => redraw());

  const snap = n => { /* normal casi vertical u horizontal → exacta (una losa o un muro con pendiente de dibujo no deben dar un plano torcido) */
    const a = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)], m = Math.max(...a);
    if (m > 0.97) { const k = a.indexOf(m); const o = new THREE.Vector3(); o.setComponent(k, Math.sign(n.getComponent(k))); return o }
    return n.clone().normalize() };

  /* El tirador del corte es un botón propio (tijera) y no las flechas del Clipper: más chico, se agarra con el dedo y no tapa el modelo.
     Arrastrarlo mueve el plano a lo largo de su normal (el movimiento en pantalla se proyecta sobre la dirección de la normal). */
  function makeHandle(id, it) { const el = document.createElement('button'); el.type = 'button'; el.className = 'p3sh' + (it.kind === 'box' ? ' box' : ''); el.textContent = it.kind === 'box' ? '↔' : '✂'; el.title = it.label + ' · arrastra para mover'; layer.appendChild(el);
    let drag = null;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); dragging = true; drag = { x: e.clientX, y: e.clientY, o: it.o.clone() }; el.classList.add('on') });
    el.addEventListener('pointermove', e => { if (!drag) return; const o = drag.o, a = o.clone().project(cam3()), b = o.clone().addScaledVector(it.n, 1).project(cam3()); const r = canvas.getBoundingClientRect();
      let vx = (b.x - a.x) * 0.5 * r.width, vy = -(b.y - a.y) * 0.5 * r.height, L2 = vx * vx + vy * vy; if (L2 < 1) { vx = 0; vy = -60; L2 = 3600 } /* normal apuntando a la cámara: arrastrar hacia arriba la sube */
      const t = ((e.clientX - drag.x) * vx + (e.clientY - drag.y) * vy) / L2; setOrigin(id, o.clone().addScaledVector(it.n, t)) });
    const end = e => { if (!drag) return; drag = null; el.classList.remove('on'); try { el.releasePointerCapture(e.pointerId) } catch (x) {} redraw(); setTimeout(() => { dragging = false }, 60) };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); return el }
  const cam3 = () => C.cam.three;
  function setOrigin(id, o) { const it = items.get(id), p = clipper.list.get(id); if (!it || !p) return; it.o.copy(o); p.setFromNormalAndCoplanarPoint(it.n.clone(), o.clone()); redraw() }
  const proj = new THREE.Vector3();
  function placeHandles() { if (!items.size) return; const r = canvas.getBoundingClientRect();
    for (const it of items.values()) { if (!it.el) continue; proj.copy(it.o).project(cam3()); const ok = !hideGizmos && proj.z < 1 && Math.abs(proj.x) < 1.15 && Math.abs(proj.y) < 1.15;
      it.el.style.display = ok ? '' : 'none'; if (ok) { it.el.style.left = (proj.x * 0.5 + 0.5) * r.width + 'px'; it.el.style.top = (-proj.y * 0.5 + 0.5) * r.height + 'px' } } }
  R.onAfterUpdate.add(placeHandles);

  function addPlane(point, normal, kind, label, face) {
    const id = clipper.createFromNormalAndCoplanarPoint(world, normal, point); const p = clipper.list.get(id); if (!p) return null;
    p.visible = false; /* se oculta el cuadro azul y las flechas del Clipper: el plano sigue cortando */
    const it = { kind, label, face, o: point.clone(), n: normal.clone().normalize() }; items.set(id, it); it.el = makeHandle(id, it); placeHandles(); redraw(); emit(); return id }

  /** Toque sobre una superficie: corta lo que está delante de ella (sin cambiar el aislado ni el piso). */
  async function tapSurface(hit) {
    if (!hit) return null; const h = hit.hit; if (!h || !h.point) return null;
    const camDir = h.point.clone().sub(C.cam.three.getWorldPosition(new THREE.Vector3())).normalize();
    let n = (h.normal ? h.normal.clone() : camDir.clone().negate()).normalize(); if (n.dot(camDir) > 0) n.negate(); /* la cara que se ve, mirando a la cámara */
    n = snap(n);
    /* el plano queda 2 cm dentro del elemento tocado: así su cara se corta limpia (pegado a ella parpadea por z-fighting) */
    const id = addPlane(h.point.clone().addScaledVector(n, -0.02), n.clone().negate(), 'surf', 'Corte ' + (items.size + 1)); /* se conserva lo de atrás: la normal apunta hacia dentro */
    if (C.onPlaced) C.onPlaced(id); return id }

  function clearKind(kind) { for (const [id, it] of [...items]) if (it.kind === kind) { clipper.delete(world, id); if (it.el) it.el.remove(); items.delete(id) } }

  const FACES = [['-x', 'Oeste', [1, 0, 0]], ['+x', 'Este', [-1, 0, 0]], ['-y', 'Abajo', [0, 1, 0]], ['+y', 'Arriba', [0, -1, 0]], ['-z', 'Norte', [0, 0, 1]], ['+z', 'Sur', [0, 0, -1]]];
  /** Caja de sección alrededor de una caja (Box3): 6 planos con la normal hacia dentro, cada uno con su flecha. */
  function box(b) { clearKind('box'); boxOn = false; removeHelper();
    if (!b || b.isEmpty()) { emit(); redraw(); return false }
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); boxOn = true;
    for (const [f, nm, n] of FACES) { const ax = f[1]; const sign = f[0] === '+' ? 1 : -1; const pt = c.clone(); pt.setComponent('xyz'.indexOf(ax), (sign > 0 ? b.max : b.min).getComponent('xyz'.indexOf(ax)));
      const others = ['x', 'y', 'z'].filter(k => k !== ax).map(k => s.getComponent('xyz'.indexOf(k))); addPlane(pt, new THREE.Vector3(...n), 'box', 'Caja · ' + nm, f) }
    makeHelper(); emit(); redraw(); return true }
  function boxBounds() { const o = { min: [-Infinity, -Infinity, -Infinity], max: [Infinity, Infinity, Infinity] };
    for (const [id, it] of items) { if (it.kind !== 'box') continue; const p = clipper.list.get(id); if (!p) continue; const k = 'xyz'.indexOf(it.face[1]); const nk = p.three.normal.getComponent(k); if (!nk) continue; /* plano alineado a un eje: n·x + c = 0 → x = −c / n */
      (it.face[0] === '-' ? o.min : o.max)[k] = -p.three.constant / nk }
    return o }
  function makeHelper() { removeHelper(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    helper = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1f6fe5, depthTest: false, transparent: true })); helper.renderOrder = 10; helper.frustumCulled = false; world.scene.three.add(helper); updateHelper() }
  function removeHelper() { if (helper) { helper.removeFromParent(); helper.geometry.dispose(); helper.material.dispose(); helper = null } }
  function updateHelper() { if (!helper) return; const { min, max } = boxBounds(); if (![...min, ...max].every(Number.isFinite)) return;
    const [x0, y0, z0] = min, [x1, y1, z1] = max, v = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]; const a = helper.geometry.attributes.position.array; let i = 0;
    for (const [p, q] of e) { a.set(v[p], i); i += 3; a.set(v[q], i); i += 3 } helper.geometry.attributes.position.needsUpdate = true }
  R.onBeforeUpdate.add(updateHelper);

  function flip(id) { const it = items.get(id), p = clipper.list.get(id); if (!p || !it) return; it.n.negate(); p.setFromNormalAndCoplanarPoint(it.n.clone(), it.o.clone()); redraw() }
  async function remove(id) { const it = items.get(id); if (!it) return; if (it.kind === 'box') { clearKind('box'); boxOn = false; removeHelper() } else { await clipper.delete(world, id); if (it.el) it.el.remove(); items.delete(id) } emit(); redraw() }
  function clearAll() { clipper.deleteAll(); for (const it of items.values()) if (it.el) it.el.remove(); items.clear(); boxOn = false; removeHelper(); emit(); redraw() }
  function showGizmos(on) { hideGizmos = !on; if (helper) helper.visible = on; placeHandles(); redraw(); emit() }
  function enable(on) { for (const id of items.keys()) { const p = clipper.list.get(id); if (p) p.enabled = on } redraw() }
  /* ¿el puntero está sobre una flecha de algún plano? (para no tomar ese toque como un toque sobre el modelo) */
  const overGizmo = () => false; /* los tiradores son botones sobre el lienzo: sus toques no llegan a él */
  const dispose = () => { removeHelper(); try { clipper.deleteAll() } catch (e) {} layer.remove() };
  /* guardar y reponer los cortes (al volver al modelo después de haberlo liberado de la memoria) */
  const exportCuts = () => { const o = { surf: [], box: null }; for (const it of items.values()) if (it.kind === 'surf') o.surf.push({ o: it.o.toArray(), n: it.n.toArray(), label: it.label });
    if (boxOn) { const { min, max } = boxBounds(); if ([...min, ...max].every(Number.isFinite)) o.box = { min, max } } return o };
  const importCuts = d => { if (!d) return; for (const s of d.surf || []) addPlane(new THREE.Vector3(...s.o), new THREE.Vector3(...s.n), 'surf', s.label || 'Corte');
    if (d.box) box(new THREE.Box3(new THREE.Vector3(...d.box.min), new THREE.Vector3(...d.box.max))) };
  const planes = () => { const o = []; for (const id of items.keys()) { const p = clipper.list.get(id); if (p && p.enabled !== false && p.three) o.push(p.three) } return o };
  return { planes, exportCuts, importCuts, tapSurface, box, flip, remove, clearAll, showGizmos, enable, overGizmo, busy: () => dragging, list, count: () => items.size, hasBox: () => boxOn, onChange: cb => { onChange = cb }, dispose, set onPlaced(f) { C.onPlaced = f }, get gizmosVisible() { return !hideGizmos } };
}
