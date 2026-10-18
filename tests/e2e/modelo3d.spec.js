// Planos › Modelo 3D (beta, docs/ia/planos.md): se convierte un IFC pequeño en el navegador, se abre con el visor nuevo
// (That Open Components) y se recorre la interfaz de tablet: pisos, cortes, medir (con ajuste a vértices), menú flotante (Cortar · Aislar · Ocultar),
// panel lateral plegable de propiedades, casita (vista general) y que al salir y volver el visor quede como se dejó.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, noErrors } from './helpers.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const memStorage = () => {
  window.__ST = new Map();
  window.plPut = async (p, blob) => { window.__ST.set(p, blob); };
  window.plGet = async p => { const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
};

test('modelo 3D: convierte un IFC, lo abre y funcionan pisos, cortes, medir, propiedades y ocultar', async ({ page }) => {
  test.setTimeout(240_000);
  const ifc = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3d-')), '2459243-PTSA-XX-ZZZ-M3D-ARQ-E05.ifc');
  execFileSync('node', [path.join(ROOT, 'scripts/visor3d/tools/make-ifc.mjs'), ifc, 'arq', '3', '3', '3']);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'p3d'; render(); });
  await expect(page.locator('#p3dock .p3b')).toHaveCount(6, { timeout: 60_000 });
  await page.setInputFiles('#p3file', ifc);
  await expect(page.locator('#p3models .plchip')).toHaveCount(1, { timeout: 120_000 });
  await expect(page.locator('#p3models .plchip.on')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => P3.v && P3.v.levels().length >= 2, null, { timeout: 60_000 });
  // pisos: aislar un piso con corte a 1,30 m
  await page.click('#p3dock [data-a="pn:pisos"]');
  await expect(page.locator('#p3pn .p3lv .plchip')).toHaveCount((await page.evaluate(() => P3.v.levels().length)) + 1);
  await page.locator('#p3pn [data-a="lvl"]:not([data-l=""])').first().click();
  await expect(page.locator('#p3pn .p3step b')).toContainText('1,30 m');
  await page.click('#p3pn [data-a="cuth+"]');
  await expect(page.locator('#p3pn .p3step b')).toContainText('1,40 m');
  await page.click('#p3pn [data-a="plan"]');
  await expect(page.locator('#p3ban')).toContainText('planta');
  await page.click('#p3pn [data-a="plan"]');
  await page.click('#p3pn [data-a="lvl"][data-l=""]');
  // cortes: caja de sección alrededor del modelo y quitarla
  await page.click('#p3dock [data-a="pn:cortes"]');
  await page.click('#p3pn [data-a="sec-box"][data-t="model"]');
  await expect(page.locator('#p3dock .p3n').first()).toHaveText('6');
  await page.click('#p3ban [data-a="sec-clear"]');
  await expect(page.locator('#p3dock .p3n')).toHaveCount(0);
  // gestos táctiles (tablet): un dedo gira, dos dedos acercan
  await page.click('#p3dock [data-a="pn:vista"]'); await page.click('#p3pn [data-a="view"][data-v="iso"]'); await page.click('#p3pn [data-a="pn:"]');
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  const cb = await page.locator('#p3cv canvas').boundingBox(); const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
  const tch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const cam = () => page.evaluate(() => { const c = P3.v.camera.controls; return { az: c.azimuthAngle, d: c.distance } });
  const c0 = await cam();
  await tch('touchStart', [[cx - 60, cy + 150]]);
  for (let i = 1; i <= 10; i++) { await tch('touchMove', [[cx - 60 + i * 12, cy + 150]]); await page.waitForTimeout(16) }
  await tch('touchEnd', []); await page.waitForTimeout(700);
  const c1 = await cam(); expect(Math.abs(c1.az - c0.az), 'un dedo gira').toBeGreaterThan(0.05);
  await tch('touchStart', [[cx - 40, cy + 150], [cx + 40, cy + 150]]);
  for (let i = 1; i <= 10; i++) { await tch('touchMove', [[cx - 40 - i * 12, cy + 150], [cx + 40 + i * 12, cy + 150]]); await page.waitForTimeout(16) }
  await tch('touchEnd', []); await page.waitForTimeout(1200); /* la inercia tarda más con el dibujo por software */
  const c2 = await cam(); expect(c2.d, 'dos dedos separándose acercan').toBeLessThan(c1.d * 0.9);
  // propiedades: toque sobre el modelo (se prueban varios puntos hasta acertar a un elemento)
  await page.click('#p3dock [data-a="pn:vista"]'); await page.click('#p3pn [data-a="view"][data-v="iso"]'); await page.click('#p3pn [data-a="pn:"]');
  await page.waitForTimeout(1500);
  const box = await page.locator('#p3cv canvas').boundingBox();
  let hit = false;
  for (const [fx, fy] of [[.5, .5], [.45, .55], [.55, .45], [.4, .6], [.6, .6], [.5, .4], [.5, .65], [.35, .5]]) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    try { await page.waitForFunction(() => P3.selN > 0, null, { timeout: 7000 }); hit = true; break } catch (e) {}
  }
  expect(hit, 'un toque sobre el modelo selecciona un elemento').toBe(true);
  // menú flotante: solo Cortar, Aislar y Ocultar
  await expect(page.locator('#p3fm')).toBeVisible();
  await expect(page.locator('#p3fm .p3a')).toHaveText([/Cortar/, /Aislar/, /Ocultar/]);
  // panel lateral izquierdo con las propiedades; se pliega y se vuelve a abrir
  await expect(page.locator('#p3side')).toBeVisible();
  await expect(page.locator('#p3side .p3pt')).not.toHaveText('Cargando…', { timeout: 15_000 });
  const sb = await page.locator('#p3side .p3sidein').boundingBox(), hb = await page.locator('#p3host').boundingBox();
  expect(sb.x - hb.x, 'el panel está pegado a la izquierda').toBeLessThan(20);
  await page.click('#p3side .p3sidetab');
  await expect(page.locator('#p3side')).toHaveClass(/fold/);
  await page.waitForTimeout(400);
  expect((await page.locator('#p3side .p3sidetab').boundingBox()).x - hb.x, 'plegado: queda la pestaña en el borde').toBeLessThan(40);
  await page.click('#p3side .p3sidetab');
  await expect(page.locator('#p3side')).not.toHaveClass(/fold/);
  // el azul de la selección se dibuja por delante de superficies coincidentes
  expect(await page.evaluate(() => { let f = null; for (const [, m] of P3.v.fragments.list) m.object.traverse(o => { for (const mt of [].concat(o.material || [])) if (mt.color && mt.color.getHex() === 0x1f7bff) f = mt.polygonOffsetFactor }); return f }), 'el resaltado gana a lo coincidente').toBeLessThan(0);
  const pick = async () => { for (const [fx, fy] of [[.5, .5], [.45, .55], [.55, .45], [.4, .6], [.6, .6], [.5, .4], [.5, .65], [.35, .5], [.62, .6], [.55, .75]]) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    try { await page.waitForFunction(() => P3.selN > 0, null, { timeout: 7000 }); return true } catch (e) {} } return false };
  // Cortar desde el menú flotante: crea el corte y cierra el menú
  await page.click('#p3fm [data-a="cutsurf"]');
  await expect(page.locator('#p3dock [data-a="pn:cortes"] .p3n')).toHaveText('1');
  await expect(page.locator('#p3fm')).toBeHidden();
  // un segundo corte; tocar la tijera de uno solo quita ESE corte y deja el otro
  expect(await pick(), 'después de cortar se puede seguir seleccionando').toBe(true);
  await expect(page.locator('#p3fm')).toBeVisible();
  await page.click('#p3fm [data-a="cutsurf"]');
  await expect(page.locator('#p3dock [data-a="pn:cortes"] .p3n')).toHaveText('2');
  await expect(page.locator('.p3sh')).toHaveCount(2);
  await page.locator('.p3sh').last().click(); /* la de arriba (si dos cortes caen en el mismo punto, una tapa a la otra) */
  await expect(page.locator('#p3dock [data-a="pn:cortes"] .p3n')).toHaveText('1');
  await expect(page.locator('.p3sh')).toHaveCount(1);
  // aislar con un corte activo: se enfoca la parte que queda a la vista, no la caja completa del elemento
  expect(await pick(), 'se vuelve a seleccionar con un corte').toBe(true);
  const shown = await page.evaluate(async () => { const b = await P3.v.shownSelectionBox(), pls = P3.v.section.planes(), T = P3.v.THREE; let worst = 1e9;
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) for (const pl of pls) worst = Math.min(worst, pl.distanceToPoint(new T.Vector3(x, y, z)));
    return { worst, c: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] } });
  expect(shown.worst, 'la caja que se enfoca no entra en la zona cortada').toBeGreaterThan(-1e-3);
  await page.click('#p3fm [data-a="isolate"]');
  await expect(page.locator('#p3dock [data-a="showall"] .p3n')).toHaveText('1');
  await page.waitForTimeout(2500);
  const tgt = await page.evaluate(() => { const c = P3.v.camera.controls, t = c.getTarget(new (P3.v.THREE.Vector3)()); return t.toArray() });
  expect(Math.hypot(...tgt.map((v, i) => v - shown.c[i])), 'la cámara va a la parte visible').toBeLessThan(0.3);
  await page.click('#p3dock [data-a="showall"]');
  await page.click('#p3dock [data-a="pn:cortes"]'); await page.click('#p3pn [data-a="sec-clear"]'); await page.click('#p3pn [data-a="pn:"]');
  await expect(page.locator('#p3dock .p3n')).toHaveCount(0);
  // volver a seleccionar y ocultar desde el menú
  expect(await pick(), 'se vuelve a seleccionar').toBe(true);
  await expect(page.locator('#p3fm')).toBeVisible();
  await page.click('#p3fm [data-a="hide"]');
  await expect(page.locator('#p3dock [data-a="showall"] .p3n')).toHaveText('1', { timeout: 15_000 });
  await expect(page.locator('#p3fm')).toBeHidden();
  await page.click('#p3dock [data-a="showall"]');
  await expect(page.locator('#p3dock [data-a="showall"] .p3n')).toHaveCount(0, { timeout: 15_000 });
  // medir: el punto se ajusta a la esquina (vértice) del elemento, aunque se toque a unos píxeles de ella
  /* desde la vista general (tras aislar, la cámara quedó muy cerca de una losa y sus esquinas salen de la pantalla) */
  await page.click('#p3home'); await page.waitForTimeout(1200);
  let tx = 0, ty = 0, snapOk = false;
  for (const [fx, fy] of [[.5, .5], [.45, .55], [.55, .45], [.4, .6], [.6, .6], [.5, .4], [.5, .65], [.35, .5]]) { if (snapOk) break;
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    try { await page.waitForFunction(() => P3.selN > 0, null, { timeout: 5000 }) } catch (e) { continue }
  const cs = await page.evaluate(async () => { const b = await P3.v.selectionBox(), T = P3.v.THREE, cam = P3.v.camera.three, r = P3.v.canvas.getBoundingClientRect(); const pts = [];
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) pts.push(new T.Vector3(x, y, z));
    pts.sort((a, d) => a.distanceTo(cam.position) - d.distanceTo(cam.position)); const ctr = new T.Vector3((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2), sc = ctr.clone().project(cam);
    const X = s => r.left + (s.x * .5 + .5) * r.width, Y = s => r.top + (-s.y * .5 + .5) * r.height;
    return pts.map(k => { const sp = k.clone().project(cam); return { w: k.toArray(), x: X(sp), y: Y(sp), cx: X(sc), cy: Y(sc) } }) });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    /* alguna de las esquinas visibles del elemento: tocando a 9 px hacia adentro, la medida se ajusta justo a ella */
    for (const c of cs) { const len = Math.hypot(c.cx - c.x, c.cy - c.y) || 1, x = c.x + (c.cx - c.x) / len * 9, y = c.y + (c.cy - c.y) / len * 9;
      /* el ajuste lleva a una esquina real (la del elemento que quede bajo el dedo), a pocos píxeles del toque */
      const sn = await page.evaluate(async ([px, py]) => { const s = await P3.v.snapProbe(px, py); if (!s) return null; const r = P3.v.canvas.getBoundingClientRect(), q = new P3.v.THREE.Vector3(...s.p).project(P3.v.camera.three);
        return { kind: s.kind, d: Math.hypot(r.left + (q.x * .5 + .5) * r.width - px, r.top + (-q.y * .5 + .5) * r.height - py) } }, [x, y]);
      if (sn && sn.kind === 'v' && sn.d < 14) { snapOk = true; tx = x; ty = y; break } } }
  expect(snapOk, 'a 9 px de una esquina visible se ajusta a un vértice cercano').toBe(true);
  // medir: dos toques dan una medida
  await page.click('#p3dock [data-a="pn:medir"]'); await page.click('#p3pn [data-a="meas"]');
  await expect(page.locator('#p3ban')).toContainText('punto A');
  /* con el ratón se ve el marcador de la esquina; con la máquina cargada (GitHub, GL por software) el primer movimiento a veces no llega: se repite */
  await expect(async () => { await page.mouse.move(tx + 3, ty + 3); await page.mouse.move(tx, ty); await expect(page.locator('.p3snap.v')).toBeVisible({ timeout: 3_000 }); }).toPass({ timeout: 30_000 });
  await page.mouse.click(tx, ty); await page.waitForTimeout(400);
  expect(await page.evaluate(() => P3.v.measure.lastSnap), 'el clic quedó en la esquina').toBe('v');
  await page.mouse.click(box.x + box.width * .55, box.y + box.height * .55); await page.waitForTimeout(400);
  await expect(page.locator('#p3dock [data-a="pn:medir"] .p3n')).toHaveText('1', { timeout: 10_000 });
  await page.click('#p3ban [data-a="tool-off"]'); await page.click('#p3dock [data-a="pn:medir"]');
  await expect(page.locator('#p3pn .p3li')).toHaveCount(1);
  await page.click('#p3pn [data-a="meas-clear"]');
  // rendimiento: prueba de fluidez corta
  await page.click('#p3dock [data-a="pn:rend"]');
  await page.click('#p3pn [data-a="preset"][data-p="rapida"]');
  await expect(page.locator('#p3pn [data-a="preset"].on')).toHaveText('Rápida');
  // casita: vuelve a la vista general (sin piso aislado, perspectiva)
  await page.click('#p3dock [data-a="pn:pisos"]');
  await page.locator('#p3pn [data-a="lvl"]:not([data-l=""])').first().click();
  await page.click('#p3pn [data-a="plan"]');
  expect(await page.evaluate(() => [P3.v.level, P3.v.plan])).toEqual([expect.any(String), true]);
  await page.click('#p3home');
  await page.waitForFunction(() => P3.v.level === '' && !P3.v.plan && P3.lvl === '' && P3.v.projectionName === 'Perspective', null, { timeout: 15_000 });
  const hb2 = await page.locator('#p3host').boundingBox(), hm = await page.locator('#p3home').boundingBox();
  expect(hm.x - hb2.x, 'la casita está abajo a la izquierda').toBeLessThan(30);
  expect(hb2.y + hb2.height - (hm.y + hm.height), 'la casita está abajo a la izquierda').toBeLessThan(90);
  await page.click('#p3pn [data-a="pn:"]');
  // salir y volver a la pestaña: el visor queda como se dejó (mismo visor, misma cámara, mismo piso y lo oculto), sin recargar los modelos
  await page.click('#p3dock [data-a="pn:pisos"]'); await page.locator('#p3pn [data-a="lvl"]:not([data-l=""])').first().click(); await page.click('#p3pn [data-a="pn:"]');
  await page.click('#p3dock [data-a="pn:vista"]'); await page.click('#p3pn [data-a="view"][data-v="right"]'); await page.click('#p3pn [data-a="pn:"]'); await page.waitForTimeout(1200);
  const before = await page.evaluate(() => { window.__v3 = P3.v; const p = P3.v.camera.controls.getPosition(new (P3.v.THREE.Vector3)()); return { lvl: P3.v.level, cam: p.toArray() } });
  expect(before.lvl).not.toBe('');
  await page.evaluate(() => { U.tab = 'pbib'; render() });
  await page.waitForTimeout(500);
  await page.evaluate(() => { U.tab = 'p3d'; render() });
  await expect(page.locator('#p3dock .p3b')).toHaveCount(6);
  await expect(page.locator('#p3models .plchip.on')).toHaveCount(1, { timeout: 5000 });
  const after = await page.evaluate(() => { const p = P3.v.camera.controls.getPosition(new (P3.v.THREE.Vector3)()); return { same: P3.v === window.__v3, lvl: P3.v.level, cam: p.toArray(), uiLvl: P3.lvl } });
  expect(after.same, 'el visor no se vuelve a armar').toBe(true);
  expect(after.lvl).toBe(before.lvl); expect(after.uiLvl).toBe(before.lvl);
  expect(Math.hypot(...after.cam.map((v, i) => v - before.cam[i])), 'la cámara queda donde estaba').toBeLessThan(0.01);
  // si pasa mucho tiempo fuera, el visor se libera de la memoria pero al volver se repone el estado (piso, cámara)
  await page.evaluate(() => { p3Park(); U.tab = 'pbib'; render() });
  await page.evaluate(() => { U.tab = 'p3d'; render() });
  await expect(page.locator('#p3models .plchip.on')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => P3.snap === null && P3.v && P3.v.level && P3.lvl === P3.v.level, null, { timeout: 60_000 });
  const back = await page.evaluate(() => { const p = P3.v.camera.controls.getPosition(new (P3.v.THREE.Vector3)()); return { lvl: P3.v.level, cam: p.toArray() } });
  expect(back.lvl).toBe(before.lvl);
  expect(Math.hypot(...back.cam.map((v, i) => v - before.cam[i])), 'la cámara se repone tras liberar el visor').toBeLessThan(0.05);
  noErrors(errors.filter(e => !/Multiple instances of Three/.test(e)), 'modelo 3D');
});
