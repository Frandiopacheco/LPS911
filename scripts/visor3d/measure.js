// Medir distancias sobre el modelo: toque en un punto A y en un punto B. Cada punto se ajusta al vértice (o, si no hay, a la arista) de la
// cara tocada más cercano al dedo, y después se puede arrastrar para afinarlo (el punto se ubica un poco arriba del dedo para verlo).
// La medida se dibuja «proyectada» sobre los ejes del proyecto: de A a B por X (rojo), por Y (verde) y por Z, la altura (azul), más la
// distancia total en diagonal. Ejes BIM: X y Y horizontales, Z hacia arriba (en three.js: X = X, Y(BIM) = −Z, Z(BIM) = Y).
// Las medidas son temporales (no se guardan): el visor debe seguir rápido.
const SNAP_V = 26, SNAP_E = 16, LIFT = 52;
const AX = { x: ['ΔX', 0xef4444, '#ef4444'], y: ['ΔY', 0x22c55e, '#16a34a'], z: ['ΔZ', 0x3b82f6, '#2563eb'] };

export function createMeasure(C) {
  const { THREE, world, R, cam, canvas, redraw, pickAt } = C;
  const host = canvas.parentElement;
  const layer = document.createElement('div'); layer.className = 'p3ml'; layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2'; host.appendChild(layer);
  const group = new THREE.Group(); group.renderOrder = 20; world.scene.three.add(group);
  const mat = hex => new THREE.LineBasicMaterial({ color: hex, depthTest: false, transparent: true });
  const MAT = { x: mat(AX.x[1]), y: mat(AX.y[1]), z: mat(AX.z[1]), d: mat(0x64748b) };
  const dotGeo = new THREE.SphereGeometry(1, 12, 8), dotMat = new THREE.MeshBasicMaterial({ color: 0x111827, depthTest: false, transparent: true }), dotPend = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false, transparent: true });
  const items = new Map(); let seq = 0, pending = null, onChange = null, busy = false;
  const emit = () => { if (onChange) onChange(list()) };
  const fmt = v => (v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v.toFixed(3)).replace('.', ',');
  const V = THREE.Vector3;
  /* ΔX, ΔY, ΔZ entre dos puntos (ejes BIM) */
  const delta = (a, b) => ({ x: Math.abs(b.x - a.x), y: Math.abs(b.z - a.z), z: Math.abs(b.y - a.y) });

  const dot = (p, m) => { const d = new THREE.Mesh(dotGeo, m || dotMat); d.position.copy(p); d.renderOrder = 22; d.userData.dot = true; group.add(d); return d };
  const label = (cls) => { const d = document.createElement('div'); d.className = 'p3mlab ' + (cls || ''); layer.appendChild(d); return d };
  /* tirador para arrastrar un extremo: círculo invisible de 44 px sobre el punto */
  function handle(get, set) { const el = document.createElement('div'); el.className = 'p3mh'; layer.appendChild(el); let on = false;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); on = true; busy = true; el.classList.add('on') });
    el.addEventListener('pointermove', async e => { if (!on) return; const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top - LIFT;
      const hit = await pickAt(e.clientX, e.clientY - LIFT); if (hit && on) { set(pointOf(hit, { x, y })); } });
    const end = e => { if (!on) return; on = false; el.classList.remove('on'); try { el.releasePointerCapture(e.pointerId) } catch (x) {} setTimeout(() => { busy = false }, 80) };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.get = get; return el }

  const toPx = p => { const r = canvas.getBoundingClientRect(), s = p.clone().project(cam.three); return { x: (s.x * 0.5 + 0.5) * r.width, y: (-s.y * 0.5 + 0.5) * r.height, z: s.z } };
  /** Punto de una medida a partir de un acierto del raycast: vértice más cercano al dedo (SNAP_V px) o, si no, la arista más cercana (SNAP_E px). */
  function pointOf(hit, px) {
    const h = hit.hit; let best = h.point.clone(); const fp = h.facePoints;
    if (fp && px && fp.length >= 6) { const v = []; for (let i = 0; i + 2 < fp.length; i += 3) v.push(new V(fp[i], fp[i + 1], fp[i + 2]));
      let bd = SNAP_V, found = false; for (const p of v) { const s = toPx(p); if (s.z < 1) { const d = Math.hypot(s.x - px.x, s.y - px.y); if (d < bd) { bd = d; best = p.clone(); found = true } } }
      if (!found) { let ed = SNAP_E; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], sa = toPx(a), sb = toPx(b); if (sa.z >= 1 || sb.z >= 1) continue;
          const dx = sb.x - sa.x, dy = sb.y - sa.y, L2 = dx * dx + dy * dy; if (L2 < 1) continue; const t = Math.max(0, Math.min(1, ((px.x - sa.x) * dx + (px.y - sa.y) * dy) / L2)); const d = Math.hypot(sa.x + dx * t - px.x, sa.y + dy * t - px.y);
          if (d < ed) { ed = d; best = a.clone().lerp(b, t) } } } }
    return best }

  async function tap(hit, px) {
    if (!hit) return null; const p = pointOf(hit, px);
    if (!pending) { pending = { a: p, dot: dot(p, dotPend), h: null }; pending.h = handle(() => pending && pending.a, q => { if (!pending) return; pending.a.copy(q); pending.dot.position.copy(q); redraw() }); redraw(); emit(); return { state: 'a' } }
    const a = pending.a.clone(); dropPending(); return add(a, p) }
  function dropPending() { if (pending) { group.remove(pending.dot); if (pending.h) pending.h.remove(); pending = null } }

  function add(a, b) { const id = ++seq;
    const it = { id, a: a.clone(), b: b.clone(), lines: [], dots: [], labs: {}, hs: [] };
    it.dots.push(dot(it.a), dot(it.b));
    for (const k of ['x', 'y', 'z']) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(), new V()]), MAT[k]); ln.renderOrder = 20; ln.frustumCulled = false; group.add(ln); it.lines.push(ln); it.labs[k] = label('ax-' + k) }
    const dg = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(), new V()]), MAT.d); dg.renderOrder = 19; dg.frustumCulled = false; group.add(dg); it.lines.push(dg); it.labs.d = label('tot');
    it.hs.push(handle(() => it.a, q => { it.a.copy(q); upd(it) }), handle(() => it.b, q => { it.b.copy(q); upd(it) })); it.del = label('del'); it.del.textContent = '✕'; it.del.style.pointerEvents = 'auto'; it.del.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); remove(id) });
    items.set(id, it); upd(it); emit(); const d = delta(a, b); return { state: 'done', id, d: a.distanceTo(b), dx: d.x, dy: d.y, dz: d.z } }
  /* reconstruye líneas y etiquetas de una medida: A → X → Y → Z → B */
  function upd(it) { const { a, b } = it, p1 = new V(b.x, a.y, a.z), p2 = new V(b.x, a.y, b.z); const pts = { x: [a, p1], y: [p1, p2], z: [p2, b] };
    it.dots[0].position.copy(a); it.dots[1].position.copy(b);
    ['x', 'y', 'z'].forEach((k, i) => { const [u, w] = pts[k]; it.lines[i].geometry.setFromPoints([u, w]); it.lines[i].geometry.computeBoundingSphere() });
    it.lines[3].geometry.setFromPoints([a, b]); it.lines[3].geometry.computeBoundingSphere();
    const d = delta(a, b); it.d = a.distanceTo(b); it.dx = d.x; it.dy = d.y; it.dz = d.z; it.mid = { x: pts.x[0].clone().lerp(pts.x[1], 0.5), y: pts.y[0].clone().lerp(pts.y[1], 0.5), z: pts.z[0].clone().lerp(pts.z[1], 0.5), d: a.clone().lerp(b, 0.5) };
    for (const k of ['x', 'y', 'z']) { const e = it.labs[k]; e.innerHTML = `<i>${AX[k][0]}</i> ${fmt(it['d' + k])} m`; e.style.setProperty('--c', AX[k][2]); e.hidden = it['d' + k] < 0.001 }
    it.labs.d.innerHTML = `<b>${fmt(it.d)} m</b>`; redraw(); emit() }
  function remove(id) { const it = items.get(id); if (!it) return; group.remove(...it.lines, ...it.dots); it.lines.forEach(l => l.geometry.dispose()); Object.values(it.labs).forEach(e => e.remove()); it.hs.forEach(h => h.remove()); it.del.remove(); items.delete(id); redraw(); emit() }
  function clear() { for (const id of [...items.keys()]) remove(id); stop() }
  function stop() { if (pending) { dropPending(); redraw(); emit() } }
  const list = () => [...items.values()].map(({ id, d, dx, dy, dz }) => ({ id, d, dx, dy, dz, text: fmt(d) + ' m', tx: fmt(dx), ty: fmt(dy), tz: fmt(dz) })).concat(pending ? [{ id: 0, pending: true }] : []);

  /* puntos de tamaño casi constante en pantalla; etiquetas y tiradores siguen a la medida */
  const place = (el, p, r, dy = 0) => { const s = p.clone().project(cam.three); const ok = s.z < 1 && Math.abs(s.x) < 1.2 && Math.abs(s.y) < 1.2; el.style.display = ok ? '' : 'none'; if (ok) { el.style.left = (s.x * 0.5 + 0.5) * r.width + 'px'; el.style.top = (-s.y * 0.5 + 0.5) * r.height + dy + 'px' } };
  const frameUpdate = () => { if (!group.children.length) return;
    for (const m of group.children) if (m.userData.dot) { const dist = cam.three.position.distanceTo(m.position); const k = cam.three.isOrthographicCamera ? 1 / Math.max(cam.three.zoom, 1e-6) * 0.6 : dist * 0.005; m.scale.setScalar(Math.max(k, 0.004)) }
    const r = canvas.getBoundingClientRect();
    if (pending) place(pending.h, pending.a, r);
    for (const it of items.values()) { place(it.hs[0], it.a, r); place(it.hs[1], it.b, r); for (const k of ['x', 'y', 'z', 'd']) place(it.labs[k], it.mid[k], r); place(it.del, it.b, r, -30) } };
  R.onBeforeUpdate.add(frameUpdate); R.onAfterUpdate.add(frameUpdate);
  const dispose = () => { clear(); layer.remove(); group.removeFromParent(); dotGeo.dispose(); dotMat.dispose(); dotPend.dispose(); Object.values(MAT).forEach(m => m.dispose()) };
  return { tap, stop, remove, clear, list, onChange: cb => { onChange = cb }, dispose, get pending() { return !!pending }, get busy() { return busy } };
}
