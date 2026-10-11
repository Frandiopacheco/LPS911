// Medir distancias sobre el modelo: toque en un punto A y en un punto B. Cada punto se ajusta (snap) a la esquina (vértice) más cercana
// del ELEMENTO tocado o, si no hay ninguna a mano, a su arista más cercana; con el ratón se ve un marcador antes de hacer clic (cuadrado =
// esquina, rombo = arista, círculo = sobre la superficie). Después se puede arrastrar para afinarlo (el punto se ubica un poco arriba del dedo).
// Las esquinas y aristas salen de la geometría real del elemento: solo cuentan las aristas «vivas» (borde abierto o quiebre de más de 25°),
// no las diagonales internas de la triangulación.
// La medida se dibuja «proyectada» sobre los ejes del proyecto: de A a B por X (rojo), por Y (verde) y por Z, la altura (azul), más la
// distancia total en diagonal. Ejes BIM: X y Y horizontales, Z hacia arriba (en three.js: X = X, Y(BIM) = −Z, Z(BIM) = Y).
// Las medidas son temporales (no se guardan): el visor debe seguir rápido.
const COARSE = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;
const SNAP_V = COARSE ? 30 : 20, SNAP_E = COARSE ? 20 : 12, LIFT = 52, FEAT = Math.cos(25 * Math.PI / 180), GEO_MAX = 200000, GEO_KEEP = 10;
const AX = { x: ['ΔX', 0xef4444, '#ef4444'], y: ['ΔY', 0x22c55e, '#16a34a'], z: ['ΔZ', 0x3b82f6, '#2563eb'] };

export function createMeasure(C) {
  const { THREE, world, R, cam, canvas, redraw, pickAt } = C;
  const host = canvas.parentElement;
  const layer = document.createElement('div'); layer.className = 'p3ml'; layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2'; host.appendChild(layer);
  const group = new THREE.Group(); group.renderOrder = 20; world.scene.three.add(group);
  const mat = hex => new THREE.LineBasicMaterial({ color: hex, depthTest: false, transparent: true });
  const MAT = { x: mat(AX.x[1]), y: mat(AX.y[1]), z: mat(AX.z[1]), d: mat(0x64748b) };
  const dotGeo = new THREE.SphereGeometry(1, 12, 8), dotMat = new THREE.MeshBasicMaterial({ color: 0x111827, depthTest: false, transparent: true }), dotPend = new THREE.MeshBasicMaterial({ color: 0xf59e0b, depthTest: false, transparent: true });
  const items = new Map(); let seq = 0, pending = null, onChange = null, busy = false, last = '';
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
    let tok = 0;
    el.addEventListener('pointermove', async e => { if (!on) return; const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top - LIFT, my = ++tok;
      const hit = await pickAt(e.clientX, e.clientY - LIFT); if (!hit || !on || my !== tok) return; const sn = await snapAt(hit, { x, y }); if (on && my === tok) set(sn.p) });
    const end = e => { if (!on) return; on = false; el.classList.remove('on'); try { el.releasePointerCapture(e.pointerId) } catch (x) {} setTimeout(() => { busy = false }, 80) };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.get = get; return el }

  const toPx = p => { const r = canvas.getBoundingClientRect(), s = p.clone().project(cam.three); return { x: (s.x * 0.5 + 0.5) * r.width, y: (-s.y * 0.5 + 0.5) * r.height, z: s.z } };
  /* Geometría del elemento tocado, en coordenadas del mundo: vértices únicos (al milímetro) y aristas «vivas». Se guarda en una caché corta. */
  const gcache = new Map();
  async function geomOf(model, mid, lid) {
    const key = mid + ':' + lid; let g = gcache.get(key); if (g !== undefined) { gcache.delete(key); gcache.set(key, g); return g }
    g = null;
    try {
      const data = await model.getItemsGeometry([lid]); model.object.updateWorldMatrix(true, false);
      const mw = model.object.matrixWorld, m = new THREE.Matrix4(), v = new V(), uniq = new Map(), P = [], T = [];
      const vid = (x, y, z) => { const k = Math.round(x * 1000) + ',' + Math.round(y * 1000) + ',' + Math.round(z * 1000); let i = uniq.get(k); if (i === undefined) { i = P.length / 3; uniq.set(k, i); P.push(x, y, z) } return i };
      for (const meshes of data) for (const md of meshes || []) { if (!md.positions || !md.indices) continue; m.multiplyMatrices(mw, md.transform);
        const p = md.positions, map = new Uint32Array(p.length / 3);
        for (let i = 0; i < p.length; i += 3) { v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m); map[i / 3] = vid(v.x, v.y, v.z) }
        for (let i = 0; i + 2 < md.indices.length; i += 3) { const a = map[md.indices[i]], b = map[md.indices[i + 1]], c = map[md.indices[i + 2]]; if (a !== b && b !== c && a !== c) T.push(a, b, c) } }
      const nv = P.length / 3, nt = T.length / 3;
      if (nv && nt && nt <= GEO_MAX) {
        const N = new Float32Array(nt * 3), e1 = new V(), e2 = new V(), n = new V();
        const at = i => new V(P[3 * i], P[3 * i + 1], P[3 * i + 2]);
        for (let t = 0; t < nt; t++) { const A = at(T[3 * t]), B = at(T[3 * t + 1]), C = at(T[3 * t + 2]); e1.subVectors(B, A); e2.subVectors(C, A); n.crossVectors(e1, e2).normalize(); N[3 * t] = n.x; N[3 * t + 1] = n.y; N[3 * t + 2] = n.z }
        const E = new Map(); /* arista → [a, b, triángulo 1, triángulo 2, cuántos]; la clave no depende del sentido */
        const add = (a, b, t) => { const k = a < b ? a * nv + b : b * nv + a; const e = E.get(k); if (!e) E.set(k, [a, b, t, -1, 1]); else { if (e[4] === 1) e[3] = t; e[4]++ } };
        for (let t = 0; t < nt; t++) { const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2]; add(a, b, t); add(b, c, t); add(c, a, t) }
        const fe = [], fv = new Set();
        for (const [a, b, t0, t1, cnt] of E.values()) { let feat = cnt !== 2; if (!feat) feat = N[3 * t0] * N[3 * t1] + N[3 * t0 + 1] * N[3 * t1 + 1] + N[3 * t0 + 2] * N[3 * t1 + 2] < FEAT; if (feat) { fe.push(a, b); fv.add(a); fv.add(b) } }
        g = { P: new Float32Array(P), fe: new Uint32Array(fe), fv: [...fv] } } } catch (e) { console.warn('geomOf', e) }
    gcache.set(key, g); if (gcache.size > GEO_KEEP) gcache.delete(gcache.keys().next().value); return g }
  const dist2Seg = (p, a, b) => { const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z, L = abx * abx + aby * aby + abz * abz; let t = L > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / L : 0; t = Math.max(0, Math.min(1, t));
    const dx = a.x + abx * t - p.x, dy = a.y + aby * t - p.y, dz = a.z + abz * t - p.z; return dx * dx + dy * dy + dz * dz };
  /* metros por píxel de pantalla en el punto p (para traducir los píxeles de ajuste a una distancia en el modelo) */
  function pxWorld(p) { const r = canvas.getBoundingClientRect(), c = cam.three;
    return c.isOrthographicCamera ? (c.top - c.bottom) / Math.max(c.zoom, 1e-6) / r.height : 2 * c.position.distanceTo(p) * Math.tan(c.fov * Math.PI / 360) / r.height }
  /** Punto ajustado a partir de un acierto del raycast: esquina (vértice) del elemento a menos de SNAP_V px del dedo/cursor; si no, arista viva a
      menos de SNAP_E px; si no, el punto tocado sobre la superficie. Devuelve {p, kind: 'v' | 'e' | 's'}. */
  async function snapAt(hit, px) {
    const base = hit.hit.point.clone(), out = { p: base, kind: 's' }; if (!px) return out;
    const g = await geomOf(hit.model, hit.id, hit.hit.localId); if (!g) return snapFace(hit, px, out);
    const P = g.P, w = pxWorld(base), rv = w * SNAP_V * 1.8, re = w * SNAP_E * 1.8, a = new V(), b = new V();
    let bd = SNAP_V, bi = -1;
    for (const i of g.fv) { a.set(P[3 * i], P[3 * i + 1], P[3 * i + 2]); if (a.distanceToSquared(base) > rv * rv) continue; const s = toPx(a); if (s.z >= 1) continue; const d = Math.hypot(s.x - px.x, s.y - px.y); if (d < bd) { bd = d; bi = i } }
    if (bi >= 0) { out.p = new V(P[3 * bi], P[3 * bi + 1], P[3 * bi + 2]); out.kind = 'v'; return out }
    let ed = SNAP_E, ep = null;
    for (let k = 0; k < g.fe.length; k += 2) { const i = g.fe[k], j = g.fe[k + 1]; a.set(P[3 * i], P[3 * i + 1], P[3 * i + 2]); b.set(P[3 * j], P[3 * j + 1], P[3 * j + 2]); if (dist2Seg(base, a, b) > re * re) continue;
      const sa = toPx(a), sb = toPx(b); if (sa.z >= 1 || sb.z >= 1) continue; const dx = sb.x - sa.x, dy = sb.y - sa.y, L2 = dx * dx + dy * dy; if (L2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((px.x - sa.x) * dx + (px.y - sa.y) * dy) / L2)), d = Math.hypot(sa.x + dx * t - px.x, sa.y + dy * t - px.y); if (d < ed) { ed = d; ep = a.clone().lerp(b, t) } }
    if (ep) { out.p = ep; out.kind = 'e' } return out }
  /* respaldo si no se pudo leer la geometría del elemento: esquinas/aristas de la cara que devolvió el raycast */
  function snapFace(hit, px, out) { const fp = hit.hit.facePoints; if (!fp || fp.length < 6) return out; const v = []; for (let i = 0; i + 2 < fp.length; i += 3) v.push(new V(fp[i], fp[i + 1], fp[i + 2]));
    let bd = SNAP_V; for (const p of v) { const s = toPx(p); if (s.z < 1) { const d = Math.hypot(s.x - px.x, s.y - px.y); if (d < bd) { bd = d; out.p = p.clone(); out.kind = 'v' } } }
    if (out.kind === 'v') return out; let ed = SNAP_E;
    for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length], sa = toPx(a), sb = toPx(b); if (sa.z >= 1 || sb.z >= 1) continue; const dx = sb.x - sa.x, dy = sb.y - sa.y, L2 = dx * dx + dy * dy; if (L2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((px.x - sa.x) * dx + (px.y - sa.y) * dy) / L2)), d = Math.hypot(sa.x + dx * t - px.x, sa.y + dy * t - px.y); if (d < ed) { ed = d; out.p = a.clone().lerp(b, t); out.kind = 'e' } }
    return out }

  /* marcador de ajuste con el ratón: se ve dónde caerá el punto antes de hacer clic */
  const mk = document.createElement('div'); mk.className = 'p3snap'; mk.hidden = true; layer.appendChild(mk); let hov = null, hovTok = 0, hovT = 0;
  function hover(hit, px) { const my = ++hovTok; if (!hit || !px) { hov = null; mk.hidden = true; return }
    snapAt(hit, px).then(sn => { if (my !== hovTok) return; hov = sn.p; mk.className = 'p3snap ' + sn.kind; mk.hidden = false; place(mk, hov, canvas.getBoundingClientRect()) }) }
  const hoverOff = () => { hovTok++; hov = null; mk.hidden = true };

  async function tap(hit, px) {
    if (!hit) return null; hoverOff(); const sn = await snapAt(hit, px), p = sn.p; last = sn.kind;
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
  function stop() { hoverOff(); if (pending) { dropPending(); redraw(); emit() } }
  const list = () => [...items.values()].map(({ id, d, dx, dy, dz }) => ({ id, d, dx, dy, dz, text: fmt(d) + ' m', tx: fmt(dx), ty: fmt(dy), tz: fmt(dz) })).concat(pending ? [{ id: 0, pending: true }] : []);

  /* puntos de tamaño casi constante en pantalla; etiquetas y tiradores siguen a la medida */
  const place = (el, p, r, dy = 0) => { const s = p.clone().project(cam.three); const ok = s.z < 1 && Math.abs(s.x) < 1.2 && Math.abs(s.y) < 1.2; el.style.display = ok ? '' : 'none'; if (ok) { el.style.left = (s.x * 0.5 + 0.5) * r.width + 'px'; el.style.top = (-s.y * 0.5 + 0.5) * r.height + dy + 'px' } };
  const frameUpdate = () => { if (!group.children.length && !hov) return;
    for (const m of group.children) if (m.userData.dot) { const dist = cam.three.position.distanceTo(m.position); const k = cam.three.isOrthographicCamera ? 1 / Math.max(cam.three.zoom, 1e-6) * 0.6 : dist * 0.005; m.scale.setScalar(Math.max(k, 0.004)) }
    const r = canvas.getBoundingClientRect();
    if (hov) place(mk, hov, r);
    if (pending) place(pending.h, pending.a, r);
    for (const it of items.values()) { place(it.hs[0], it.a, r); place(it.hs[1], it.b, r); for (const k of ['x', 'y', 'z', 'd']) place(it.labs[k], it.mid[k], r); place(it.del, it.b, r, -30) } };
  R.onBeforeUpdate.add(frameUpdate); R.onAfterUpdate.add(frameUpdate);
  const dispose = () => { clear(); layer.remove(); group.removeFromParent(); dotGeo.dispose(); dotMat.dispose(); dotPend.dispose(); Object.values(MAT).forEach(m => m.dispose()) };
  return { tap, hover, stop, remove, clear, list, snapAt, onChange: cb => { onChange = cb }, dispose, get pending() { return !!pending }, get busy() { return busy }, get lastSnap() { return last } };
}
