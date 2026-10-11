// Cortes del modelo: plano tocando una superficie y caja de sección, ambos con flechas (gizmo) para ajustarlos. Se apoya en el Clipper de
// That Open Components, que ya aplica los planos a todos los materiales de Fragments y trae el gizmo de cada plano.
export function createSection(C) {
  const { THREE, OBC, components, world, R, canvas, redraw } = C;
  const clipper = components.get(OBC.Clipper);
  clipper.enabled = true; clipper.visible = true;
  try { clipper.material.color.set(0x2f80ff); clipper.material.opacity = 0.14; clipper.material.transparent = true; clipper.material.depthWrite = false } catch (e) {}
  const items = new Map();   /* id → {kind:'surf'|'box', face?:'+x'…, label} */
  let dragging = false, onChange = null, boxOn = false, helper = null, hideGizmos = false;
  const emit = () => { if (onChange) onChange(list()) };
  const list = () => [...items].map(([id, it]) => ({ id, kind: it.kind, label: it.label, face: it.face, visible: !!(clipper.list.get(id) && clipper.list.get(id).visible) }));
  clipper.onBeforeDrag.add(() => { dragging = true });
  clipper.onAfterDrag.add(() => { redraw(); setTimeout(() => { dragging = false }, 60) });
  clipper.onAfterDelete.add(() => redraw());

  const snap = n => { /* normal casi vertical u horizontal → exacta (una losa o un muro con pendiente de dibujo no deben dar un plano torcido) */
    const a = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)], m = Math.max(...a);
    if (m > 0.97) { const k = a.indexOf(m); const o = new THREE.Vector3(); o.setComponent(k, Math.sign(n.getComponent(k))); return o }
    return n.clone().normalize() };

  function addPlane(point, normal, kind, label, face, size) {
    const id = clipper.createFromNormalAndCoplanarPoint(world, normal, point); const p = clipper.list.get(id); if (!p) return null;
    p.visible = !hideGizmos; p.size = size || 0.5; /* el cuadro azul del plano es chico: lo que se ve es la flecha */
    try { p.controls.size = kind === 'box' ? 0.7 : 0.9 } catch (e) {} /* flechas al alcance del dedo, sin tapar el modelo */
    items.set(id, { kind, label, face }); redraw(); emit(); return id }

  /** Toque sobre una superficie: corta lo que está delante de ella (sin cambiar el aislado ni el piso). */
  async function tapSurface(hit) {
    if (!hit) return null; const h = hit.hit; if (!h || !h.point) return null;
    const camDir = h.point.clone().sub(C.cam.three.getWorldPosition(new THREE.Vector3())).normalize();
    let n = (h.normal ? h.normal.clone() : camDir.clone().negate()).normalize(); if (n.dot(camDir) > 0) n.negate(); /* la cara que se ve, mirando a la cámara */
    n = snap(n);
    /* el plano queda 2 cm dentro del elemento tocado: así su cara se corta limpia (pegado a ella parpadea por z-fighting) */
    const id = addPlane(h.point.clone().addScaledVector(n, -0.02), n.clone().negate(), 'surf', 'Corte ' + (items.size + 1)); /* se conserva lo de atrás: la normal apunta hacia dentro */
    if (C.onPlaced) C.onPlaced(id); return id }

  function clearKind(kind) { for (const [id, it] of [...items]) if (it.kind === kind) { clipper.delete(world, id); items.delete(id) } }

  const FACES = [['-x', 'Oeste', [1, 0, 0]], ['+x', 'Este', [-1, 0, 0]], ['-y', 'Abajo', [0, 1, 0]], ['+y', 'Arriba', [0, -1, 0]], ['-z', 'Norte', [0, 0, 1]], ['+z', 'Sur', [0, 0, -1]]];
  /** Caja de sección alrededor de una caja (Box3): 6 planos con la normal hacia dentro, cada uno con su flecha. */
  function box(b) { clearKind('box'); boxOn = false; removeHelper();
    if (!b || b.isEmpty()) { emit(); redraw(); return false }
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()); boxOn = true;
    for (const [f, nm, n] of FACES) { const ax = f[1]; const sign = f[0] === '+' ? 1 : -1; const pt = c.clone(); pt.setComponent('xyz'.indexOf(ax), (sign > 0 ? b.max : b.min).getComponent('xyz'.indexOf(ax)));
      const others = ['x', 'y', 'z'].filter(k => k !== ax).map(k => s.getComponent('xyz'.indexOf(k))); addPlane(pt, new THREE.Vector3(...n), 'box', 'Caja · ' + nm, f, 0.3) }
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

  function flip(id) { const p = clipper.list.get(id); if (!p) return; const n = p.normal.clone().negate(); p.setFromNormalAndCoplanarPoint(n, p.origin.clone()); redraw() }
  async function remove(id) { const it = items.get(id); if (!it) return; if (it.kind === 'box') { clearKind('box'); boxOn = false; removeHelper() } else { await clipper.delete(world, id); items.delete(id) } emit(); redraw() }
  function clearAll() { clipper.deleteAll(); items.clear(); boxOn = false; removeHelper(); emit(); redraw() }
  function showGizmos(on) { hideGizmos = !on; for (const id of items.keys()) { const p = clipper.list.get(id); if (p) p.visible = on } if (helper) helper.visible = on; redraw(); emit() }
  function enable(on) { for (const id of items.keys()) { const p = clipper.list.get(id); if (p) p.enabled = on } redraw() }
  /* ¿el puntero está sobre una flecha de algún plano? (para no tomar ese toque como un toque sobre el modelo) */
  const overGizmo = () => { for (const id of items.keys()) { const p = clipper.list.get(id); try { if (p && p.visible && p.controls && (p.controls.axis || p.controls.dragging)) return true } catch (e) {} } return false };
  const dispose = () => { removeHelper(); try { clipper.deleteAll() } catch (e) {} };
  return { tapSurface, box, flip, remove, clearAll, showGizmos, enable, overGizmo, busy: () => dragging, list, count: () => items.size, hasBox: () => boxOn, onChange: cb => { onChange = cb }, dispose, set onPlaced(f) { C.onPlaced = f }, get gizmosVisible() { return !hideGizmos } };
}
