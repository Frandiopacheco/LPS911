// Medir distancias sobre el modelo: toque en un punto A y en un punto B. El punto se ajusta al vértice de la cara tocada más cercano
// (a menos de SNAP_PX en pantalla); si no hay, queda donde se tocó. La línea se ve a través de los muros y la etiqueta muestra la
// distancia total y sus componentes horizontal y vertical. Las medidas son temporales (no se guardan): el visor debe seguir rápido.
const SNAP_PX = 22;

export function createMeasure(C) {
  const { THREE, world, R, cam, canvas, redraw } = C;
  const host = canvas.parentElement;
  const layer = document.createElement('div'); layer.className = 'p3ml';
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2'; host.appendChild(layer);
  const group = new THREE.Group(); group.renderOrder = 20; world.scene.three.add(group);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe11d48, depthTest: false, transparent: true });
  const dotGeo = new THREE.SphereGeometry(1, 12, 8), dotMat = new THREE.MeshBasicMaterial({ color: 0xe11d48, depthTest: false, transparent: true });
  const dotMatPending = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false, transparent: true });
  const items = new Map(); let seq = 0, pending = null, onChange = null;
  const emit = () => { if (onChange) onChange(list()) };
  const dot = (p, mat) => { const m = new THREE.Mesh(dotGeo, mat || dotMat); m.position.copy(p); m.renderOrder = 21; m.userData.dot = true; group.add(m); return m };
  const fmt = v => (v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v.toFixed(3)).replace('.', ','); /* coma decimal (Perú) */
  const label = (cls) => { const d = document.createElement('div'); d.className = 'p3mlab ' + (cls || '');
    d.style.cssText = 'position:absolute;transform:translate(-50%,-130%);background:#111c;color:#fff;font:600 13px system-ui;padding:3px 8px;border-radius:8px;white-space:nowrap;box-shadow:0 1px 4px #0006'; layer.appendChild(d); return d };

  /** Punto de una medida a partir de un acierto del raycast: se ajusta al vértice de la cara más cercano al dedo. */
  function pointOf(hit, px) {
    const h = hit.hit; let best = h.point.clone();
    if (h.facePoints && px) { const r = canvas.getBoundingClientRect(); let bd = SNAP_PX; const v = new THREE.Vector3();
      for (let i = 0; i + 2 < h.facePoints.length; i += 3) { v.set(h.facePoints[i], h.facePoints[i + 1], h.facePoints[i + 2]);
        const s = v.clone().project(cam.three); const sx = (s.x * 0.5 + 0.5) * r.width, sy = (-s.y * 0.5 + 0.5) * r.height; const d = Math.hypot(sx - px.x, sy - px.y);
        if (d < bd && s.z < 1) { bd = d; best = v.clone() } } }
    return best }

  async function tap(hit, px) {
    if (!hit) return null; const p = pointOf(hit, px);
    if (!pending) { pending = { a: p, dot: dot(p, dotMatPending) }; redraw(); emit(); return { state: 'a' } }
    const a = pending.a; group.remove(pending.dot); pending = null; return add(a, p) }
  function add(a, b) {
    const id = ++seq; const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(geo, lineMat); line.renderOrder = 20; line.frustumCulled = false; group.add(line);
    const da = dot(a), db = dot(b), el = label();
    const d = a.distanceTo(b), dh = Math.hypot(b.x - a.x, b.z - a.z), dv = Math.abs(b.y - a.y);
    el.innerHTML = `<b>${fmt(d)} m</b><span style="opacity:.75;font-weight:500;margin-left:6px">↔ ${fmt(dh)} · ↕ ${fmt(dv)}</span>`;
    items.set(id, { id, a, b, d, dh, dv, line, da, db, el }); redraw(); emit(); return { state: 'done', id, d, dh, dv } }
  function remove(id) { const it = items.get(id); if (!it) return; group.remove(it.line, it.da, it.db); it.line.geometry.dispose(); it.el.remove(); items.delete(id); redraw(); emit() }
  function clear() { for (const id of [...items.keys()]) remove(id); stop() }
  function stop() { if (pending) { group.remove(pending.dot); pending = null; redraw(); emit() } }
  const list = () => [...items.values()].map(({ id, d, dh, dv }) => ({ id, d, dh, dv, text: fmt(d) + ' m' })).concat(pending ? [{ id: 0, pending: true }] : []);

  /* los puntos mantienen un tamaño casi constante en pantalla y las etiquetas siguen a su línea */
  const v = new THREE.Vector3();
  const frameUpdate = () => { if (!group.children.length && !items.size) return;
    for (const m of group.children) if (m.userData.dot) { const dist = cam.three.position.distanceTo(m.position); const k = cam.three.isOrthographicCamera ? 1 / Math.max(cam.three.zoom, 1e-6) * 0.7 : dist * 0.0075; m.scale.setScalar(Math.max(k, 0.005)) }
    const r = canvas.getBoundingClientRect();
    for (const it of items.values()) { v.copy(it.a).add(it.b).multiplyScalar(0.5).project(cam.three); const vis = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      it.el.style.display = vis ? '' : 'none'; if (vis) { it.el.style.left = (v.x * 0.5 + 0.5) * r.width + 'px'; it.el.style.top = (-v.y * 0.5 + 0.5) * r.height + 'px' } } };
  R.onBeforeUpdate.add(frameUpdate); R.onAfterUpdate.add(frameUpdate);
  const dispose = () => { clear(); layer.remove(); group.removeFromParent(); dotGeo.dispose(); dotMat.dispose(); dotMatPending.dispose(); lineMat.dispose() };
  return { tap, stop, remove, clear, list, onChange: cb => { onChange = cb }, dispose, get pending() { return !!pending } };
}
