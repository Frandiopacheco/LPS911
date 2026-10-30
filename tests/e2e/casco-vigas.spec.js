// Casco › Metrados › Vigas (casco-met-viga.js): metrado de planificación por viga, editado sobre la elevación.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

async function casco(page, as = 'admin') {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  return openApp(page, { as });
}
async function cargarEjemplo(page) {
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="demo"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size), { timeout: 20000 }).toBeGreaterThan(200);
}
/* VS-22 del plano E-18 (ejemplo validado con el dueño, 28-10-2026) */
const VS22 = {
  cod: 'VS-22', b: '0.80', h: '0.65', losa: '0.20', rec: '0.04', lmax: '12',
  ejes: [{ n: 'H', w: '0.60', d: '4.00' }, { n: 'G', w: '0.60', d: '8.25' }, { n: 'E', w: '0.60', d: '8.25' }, { n: 'D', w: '0.60', d: '8.25' }, { n: 'C', w: '0.60', d: '4.00' }, { n: 'B', w: '0.60', d: '' }],
  tramos: [{ est: '1@.05, 13@.10, r@.20' }, { est: '1@.05, 13@.10, 4@.20, r@.30' }, { est: '1@.05, 13@.10, 4@.20, r@.30' }, { est: '1@.05, 13@.10, 4@.20, r@.30' }, { est: '1@.05, 13@.10, r@.20' }],
  estN: '2', estD: '3/8', ea: '0.42', eb: '0.57', adic: '2',
  corr: [{ p: 'sup', s: '5Ø3/4', de: 'H', a: 'B' }, { p: 'inf', s: '5Ø3/4', de: 'H', a: 'B' }, { p: 'inf', s: '1Ø3/4', de: 'H', a: 'G' }],
  bas: [{ ap: 'G', p: 'sup', s: '1Ø1', i: '2.00', d: '2.00' }, { ap: 'E', p: 'sup', s: '2Ø1', i: '2.00', d: '2.00' }, { ap: 'D', p: 'sup', s: '2Ø1', i: '2.00', d: '2.00' }, { ap: 'C', p: 'sup', s: '2Ø1', i: '2.00', d: '2.60' }],
  jun: [{ ref: 'G', dx: '5.40' }, { ref: 'E', dx: '5.90' }, { ref: 'D', dx: '5.90' }], sec: ['S1', 'S2', 'S3', 'S4'], rep: '',
};

test('casco: vigas: el motor de planificación da el metrado de la VS-22 por sector (traslape en junta, ganchos, estribos por vano)', async ({ page }) => {
  const errors = await casco(page);
  const r = await page.evaluate(V => {
    const P = kmPar({});
    /* tabla del plano E-18: traslape inferior / superior y gancho; gancho de estribo 0.13 */
    Object.assign(P.dia['3/4'], { lt: 0.65, lts: 0.90, g90: 0.30 }); Object.assign(P.dia['1'], { lt: 1.15, lts: 1.60, g90: 0.35 }); P.dia['3/8'].g135 = 0.13;
    const R = kvCalc(V, P, n => ['S1', 'S2', 'S3', 'S4'].indexOf(n));
    const kg = n => Math.round(R.S[n].kg);
    return { S1: kg('S1'), S2: kg('S2'), S3: kg('S3'), S4: kg('S4'), tot: Math.round(Object.values(R.S).reduce((a, o) => a + o.kg, 0)), est: R.nEst, conc: Math.round(Object.values(R.S).reduce((a, o) => a + o.conc, 0) * 100) / 100, warn: R.warn,
      ejes: kvParseEjes('4 + 8.25×3 + 4'), bad: kvParseEjes('4 + x'), auto: kvEstDims({ b: '0.40', h: '0.65', rec: '0.04', estN: '1' }) };
  }, VS22);
  expect(r.warn).toEqual([]);
  expect(r.tot).toBeGreaterThan(1485); expect(r.tot).toBeLessThan(1505); // despiece por piezas del boceto: 1 512 kg
  expect(r.S1).toBeGreaterThan(r.S4);
  expect(r.est).toBe(418);
  expect(r.conc).toBeCloseTo(0.80 * 0.45 * (3.40 * 2 + 7.65 * 3), 2);
  expect(r.ejes).toEqual([4, 8.25, 8.25, 8.25, 4]);
  expect(r.bad).toBeNull();
  expect([r.auto.a, r.auto.b]).toEqual([0.32, 0.57]);
  expect(errors).toEqual([]);
});

test('casco: vigas: crear, editar sobre el dibujo, juntas, sección, pestañas y aplicar a los sectores', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const pid = await page.evaluate(() => { const p = pisos().find(x => kmSecs(x.id).length >= 3); U.piso = p.id; U.tab = 'met'; U.kmV = 'vig'; U.kvMode = 'dib'; render(); return p.id; });
  await page.locator('.kmbar [data-kva="new"]').click();
  const ej = page.locator('[data-kv="ejes"]');
  await ej.fill('5 + 6×2');
  await ej.press('Enter');
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].ejes.length, pid)).toBe(4);
  // los corridos que iban al último eje siguen hasta el nuevo último eje
  expect(await page.evaluate(pid => kvVigas(pid)[0].corr.map(c => c.a), pid)).toEqual(['N4', 'N4']);
  // corrido superior: cambiar las barras sobre el dibujo
  const cs = page.locator('[data-kv="cs:0"]');
  await cs.fill('3Ø3/4');
  await cs.press('Enter');
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].corr[0].s, pid)).toBe('3Ø3/4');
  // bastón en el apoyo B y una junta de sector
  await page.locator('[data-kva="addBas"][data-i="1"]').click();
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].bas.length, pid)).toBe(1);
  await page.locator('[data-kva="addJun"]').click();
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].jun.length, pid)).toBe(1);
  await expect(page.locator('.kvband')).toHaveCount(2);
  // arrastrar la junta ⇔ la mueve y guarda el eje de la izquierda + la distancia
  const dx0 = await page.evaluate(pid => kvVigas(pid)[0].jun[0].dx, pid);
  const grip = page.locator('[data-kvj="0"]');
  const bb = await grip.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].jun[0].dx, pid)).not.toBe(dx0);
  // sección: en el apoyo B aparece el bastón
  await page.locator('[data-kva="cuta"][data-i="1"]').click();
  await expect(page.locator('.kvsec .kvsecn b')).toHaveText('Apoyo B');
  await expect(page.locator('.kvsect')).toContainText('bastón');
  // pestañas del detalle
  await page.locator('[data-kva="tab"][data-t="ace"]').click();
  await expect(page.locator('.kvtabs tbody tr')).toHaveCount(await page.evaluate(pid => kvCalc(kvVigas(pid)[0], kmP(), () => 0).items.length, pid));
  await page.locator('[data-kva="tab"][data-t="con"]').click();
  await expect(page.locator('.kvtabs tbody tr')).toHaveCount(3);
  // se guarda en cs_kmet y al aplicar el sector recibe el acero de vigas (calculado)
  await expect.poll(() => page.evaluate(pid => ((window.__dbGet('cs_kmet', 'v_' + pid) || {}).L || []).length, pid)).toBe(1);
  page.on('dialog', d => d.accept());
  await page.locator('[data-km="apply"]').click();
  await expect.poll(() => page.evaluate(pid => { const a = kmSecs(pid)[0]; const d = window.__dbGet('cs_ambientes', a.id) || {}; return d.met && d.met['k-AVG']; }, pid)).toBeGreaterThan(50);
  const mo = await page.evaluate(pid => (window.__dbGet('cs_ambientes', kmSecs(pid)[0].id) || {}).mo, pid);
  expect(mo['k-AVG']).toBe('c');
  expect(mo['k-VL']).toBe('c');
  expect(errors).toEqual([]);
});

test('casco: vigas: modo ficha (tablet): tocar un vano abre su ficha y cambia la distancia entre ejes', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const pid = await page.evaluate(() => { const p = pisos().find(x => kmSecs(x.id).length >= 3); U.piso = p.id; U.tab = 'met'; U.kmV = 'vig'; U.kvMode = 'ficha'; render(); return p.id; });
  await page.locator('.kmbar [data-kva="new"]').click();
  await page.locator('.kvel [data-kvs="vano:1"]').first().click();
  await expect(page.locator('.kvficha')).toBeVisible();
  const d = page.locator('.kvficha [data-kv="ed:1"]');
  await d.fill('7.5');
  await d.press('Enter');
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].ejes[1].d, pid)).toBe('7.5');
  await page.locator('.kvficha [data-kva="close"]').click();
  await expect(page.locator('.kvficha')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('casco: vigas: una viga que cruza dos frentes agrupa los sectores por frente y el traslape de la junta va al frente que va primero', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  // dos frentes en un nivel: los dos primeros sectores en «Norte» (va 2.º), los demás en «Sur» (va 1.º)
  const r = await page.evaluate(() => {
    const p = pisos().find(x => kmSecs(x.id).length >= 4); const secs = kmSecs(p.id); const s0 = csSecOf(secs[0]);
    KFR.clear(); KFR.set('fN', { id: 'fN', name: 'Frente Norte', code: 'N', order: 2, color: '#cc3333' }); KFR.set('fS', { id: 'fS', name: 'Frente Sur', code: 'S', order: 1, color: '#3333cc' });
    S.sec.set(s0.id, { ...s0, fr: 'fN' }); S.sec.set('secSur', { ...s0, id: 'secSur', fr: 'fS' });
    secs.slice(2).forEach(a => S.amb.set(a.id, { ...a, sectorId: 'secSur' }));
    const c1 = secs[1].code, c2 = secs[2].code;
    const V = { ...kvNueva(kmCtx(p.id), 'VT'), ejes: [{ n: 'A', w: '0.30', d: '5' }, { n: 'B', w: '0.30', d: '5' }, { n: 'C', w: '0.30', d: '' }], tramos: [{ est: '1@.05, r@.20' }, { est: '1@.05, r@.20' }],
      corr: [{ p: 'sup', s: '2Ø5/8', de: 'A', a: 'C' }, { p: 'inf', s: '2Ø5/8', de: 'A', a: 'C' }], bas: [], jun: [{ ref: 'B', dx: '0' }], sec: [c1, c2] };
    const ext = () => { const C = kmCtx(p.id); const R = kvCalc(V, kmP(), kvRank(C)); return { first: kvFrJ(C, R, 0).first, e1: R.S[c1].ext, e2: R.S[c2].ext, nFr: C.nFr, fr1: C.frOf(c1).name, fr2: C.frOf(c2).name }; };
    const a = ext(); KFR.get('fS').order = 3; const b = ext(); KFR.get('fS').order = 1;
    KM.vg.set(p.id, [{ ...V, id: 'vt1' }]); MET.vid = 'vt1'; U.piso = p.id; U.tab = 'met'; U.kmV = 'vig'; U.kvMode = 'dib'; U.kmVt = 'res'; render();
    return { a, b, c1, c2 };
  });
  expect(r.a.nFr).toBe(2);
  expect([r.a.fr1, r.a.fr2]).toEqual(['Frente Norte', 'Frente Sur']);
  // Sur va primero: el traslape de la junta va a su sector; si Norte pasa adelante, cambia de lado
  expect(r.a.first).toBe(r.c2); expect(r.a.e2).toBeGreaterThan(r.a.e1);
  expect(r.b.first).toBe(r.c1); expect(r.b.e1).toBeGreaterThan(r.b.e2);
  // en pantalla: selector agrupado por frente, junta de frente marcada, subtotal por frente y columna Frente en el Resumen
  await expect(page.locator('.kvband select').first().locator('optgroup')).toHaveCount(2);
  await expect(page.locator('.kvjl.fr')).toHaveCount(1);
  await expect(page.locator('.kvniv li.kvfr')).toHaveCount(2);
  await expect(page.locator('.kvtabs thead')).toContainText('Frente');
  await expect(page.locator('.kvtabs')).toContainText('Junta entre frentes');
  expect(errors).toEqual([]);
});

/* ---------- vigas desde el plano (casco-met-plano.js, 29-10-2026) ---------- */
/* planta del bosquejo aprobado: ejes A–F (x) y 1–4 (y) en centímetros de lámina (mpp 0.01), tres sectores cortados en x = 15.60 y 24.20 m */
const PLANTA = {
  E: [['A', 0], ['B', 600], ['C', 1250], ['D', 1850], ['E', 2500], ['F', 3100]].map(([n, x]) => ({ n, p: [x, -100, x, 1750] }))
    .concat([['1', 0], ['2', 550], ['3', 1100], ['4', 1650]].map(([n, y]) => ({ n, p: [-100, y, 3200, y] }))),
  sup: { A: { w: '0.60', o: 0.15 }, B: { w: '0.40', o: 0 }, C: { w: '0.40', o: 0 }, D: { w: '0.40', o: 0 }, E: { w: '0.40', o: 0 }, F: { w: '0.60', o: -0.15 } },
};
const rect = (x0, x1) => [{ x: x0, y: -70 }, { x: x1, y: -70 }, { x: x1, y: 1720 }, { x: x0, y: 1720 }];

test('casco: vigas desde el plano: ejes, apoyos con excentricidad, juntas en el borde de los sectores y sector por tramo', async ({ page }) => {
  const errors = await casco(page);
  const r = await page.evaluate(({ PL, R }) => {
    const rect = (x0, x1) => [{ x: x0, y: -70 }, { x: x1, y: -70 }, { x: x1, y: 1720 }, { x: x0, y: 1720 }];
    const secs = [{ code: 'A2', P: rect(-80, 1560) }, { code: 'B1', P: rect(1560, 2420) }, { code: 'B2', P: rect(2420, 3180) }];
    const a = kvFromPlan(PL.E, '3', 'A', 'F', 0.01, secs, PL.sup);
    const b = kvFromPlan(PL.E, '3', 'F', 'A', 0.01, secs, {});
    const c = kvFromPlan(PL.E, 'C', '1', '4', 0.01, secs, {});
    const G = kvGeo({ ejes: a.ejes });
    return { a, b: { n: b.ejes.map(e => e.n), jun: b.jun, sec: b.sec }, c: { n: c.ejes.map(e => e.n), jun: c.jun, sec: c.sec }, x0: G.x0, T0: G.T[0].L, bad: kvFromPlan(PL.E, '3', 'A', 'Z', 0.01, secs, {}).err };
  }, { PL: PLANTA });
  expect(r.a.ejes.map(e => [e.n, e.d])).toEqual([['A', '6.00'], ['B', '6.50'], ['C', '6.00'], ['D', '6.50'], ['E', '6.00'], ['F', '']]);
  expect(r.a.ejes[0]).toMatchObject({ w: '0.60', o: '0.15' });
  expect(r.a.jun).toEqual([{ ref: 'C', dx: '3.10' }, { ref: 'D', dx: '5.70' }]);
  expect(r.a.sec).toEqual(['A2', 'B1', 'B2']);
  // la excentricidad corre el apoyo: la cara exterior de A queda a 0.15 del eje y la luz libre A–B es 6 − 0.45 − 0.20
  expect(r.x0).toBeCloseTo(-0.15, 5); expect(r.T0).toBeCloseTo(5.35, 5);
  // trazada al revés: los ejes van en el orden del trazo
  expect(r.b.n).toEqual(['F', 'E', 'D', 'C', 'B', 'A']); expect(r.b.sec).toEqual(['B2', 'B1', 'A2']);
  expect(r.b.jun).toEqual([{ ref: 'E', dx: '0.80' }, { ref: 'D', dx: '2.90' }]);
  // una viga sobre un eje vertical que queda en un solo sector
  expect(r.c.n).toEqual(['1', '2', '3', '4']); expect(r.c.jun).toEqual([]); expect(r.c.sec).toEqual(['A2']);
  expect(r.bad).toBeTruthy();
  expect(errors).toEqual([]);
});

test('casco: vigas desde el plano: se actualiza sola al mover un sector, avisa, y «Pegar al tercio» lleva la junta al tercio central', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const pid = await page.evaluate(({ PL }) => {
    const rect = (x0, x1) => [{ x: x0, y: -70 }, { x: x1, y: -70 }, { x: x1, y: 1720 }, { x: x0, y: 1720 }];
    const p = pisos().find(x => kmSecs(x.id).filter(a => (csSecOf(a) || {}).grp === 'E').length >= 3);
    const A = kmSecs(p.id).filter(a => (csSecOf(a) || {}).grp === 'E').slice(0, 3);
    [rect(-80, 1560), rect(1560, 2420), rect(2420, 3180)].forEach((P, i) => S.amb.set(A[i].id, { ...A[i], geo: { L: csgFlat(P) } }));
    /* lámina de referencia = la del nivel (sin alinear), con los ejes trazados */
    window.kvpCtx = pid => ({ ref: { id: 'L' }, lam: { id: 'L' }, m: csI, mi: csI, mpp: 0.01, E: PL.E,
      secs: kmSecs(pid).filter(a => (csSecOf(a) || {}).grp === 'E').map(a => a.geo && a.geo.L ? { code: a.code, id: a.id, P: csUnflat(a.geo.L) } : null).filter(Boolean) });
    const R = kvFromPlan(PL.E, '3', 'A', 'F', 0.01, kvpCtx(p.id).secs, PL.sup);
    const V = { ...kvNueva(kmCtx(p.id), 1), id: 'vp1', cod: 'VS-22', tramos: R.ejes.slice(0, -1).map(() => ({ est: KV_EST1 })), corr: [{ p: 'sup', s: '3Ø3/4', de: 'A', a: 'F' }, { p: 'inf', s: '3Ø3/4', de: 'A', a: 'F' }] };
    kvpGeoTo(V, R); V.pl = { eje: '3', e0: 'A', e1: 'F', ref: 'L' };
    KM.ok = true; KM.vg.set(p.id, [V]); MET.vid = 'vp1'; U.piso = p.id; U.tab = 'met'; U.kmV = 'vig'; U.kvMode = 'dib'; render();
    return p.id;
  }, { PL: PLANTA });
  // sin cambios en la sectorización: no escribe nada
  expect(await page.evaluate(pid => kvSync(pid, true).length, pid)).toBe(0);
  await expect(page.locator('.kvpl')).toContainText('Vinculada al plano');
  // semáforo: la primera junta cae en el tercio central de C–D, la segunda no (D–E: tercio 20.73–22.77, junta en 24.20)
  const sem = await page.evaluate(pid => kvpJuntas(pid)[0].jun.map(j => ({ ok: j.ok, far: Math.round(j.far * 100) / 100 })), pid);
  expect(sem).toEqual([{ ok: true, far: 0 }, { ok: false, far: 1.43 }]);
  // la junta escrita a mano no se puede cambiar mientras está vinculada
  await expect(page.locator('[data-kv="jd:0"]')).toHaveCount(0);
  await expect(page.locator('[data-kva="addJun"]')).toHaveCount(0);
  await page.evaluate(() => kvChange({ dataset: { kv: 'jd:0' }, value: '1.00' }));
  expect(await page.evaluate(pid => kvVigas(pid)[0].jun[0].dx, pid)).toBe('3.10');
  // «Pegar al tercio» en Niveles: mueve la cara entre el 2.º y el 3.er sector y la viga se actualiza sola
  await page.evaluate(pid => { CNV.pid = pid; kvpSnapThird(pid, 'vp1', kvpJuntas(pid)[0].jun[1].i); }, pid);
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].jun[1].dx, pid)).toBe('4.22');
  expect(await page.evaluate(pid => kvpJuntas(pid)[0].jun.every(j => j.ok), pid)).toBe(true);
  // el aviso queda en Metrados › Vigas con lo que cambió; «Dejar como estaban» deshace y desvincula (si no, volvería a seguir al plano)
  await page.evaluate(() => { U.tab = 'met'; render(); });
  await expect(page.locator('.kvav')).toContainText('se movió 1.48 m');
  await page.locator('.kvav [data-kva="avisou"]').click();
  await expect.poll(() => page.evaluate(pid => kvVigas(pid)[0].jun[1].dx, pid)).toBe('5.70');
  expect(await page.evaluate(pid => kvVigas(pid)[0].pl, pid)).toBeUndefined();
  await expect(page.locator('.kvpl')).toHaveCount(0);
  // el armado no se tocó
  expect(await page.evaluate(pid => kvVigas(pid)[0].corr.map(c => c.s), pid)).toEqual(['3Ø3/4', '3Ø3/4']);
  expect(errors).toEqual([]);
});

test('casco: vigas desde el plano: trazar en Niveles con dos toques y las caras de cada apoyo, y pegar al tercio la junta roja', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const errors = await openApp(page, { as: 'admin', extra: [['plb', 'EST_E03', { cod: 'E-03', disc: 'EST', niv: 'P3', tit: 'Encofrado', tipo: 'Planta', rev: 1, base: 'planos/E-03/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], revs: [], cal: { mpp: 0.005, rev: 1 } }]] });
  await cargarEjemplo(page);
  /* lámina del techo 3 (1 unidad = 1 cm), ejes A–E cada 4 m y 1–3; tres sectores cortados en x = 7.80 y 14.50 m */
  await page.evaluate(async () => {
    const ejes = [['A', 200], ['B', 600], ['C', 1000], ['D', 1400], ['E', 1800]].map(([n, x]) => ({ n, p: [x, 250, x, 1150] })).concat([['1', 300], ['2', 700], ['3', 1100]].map(([n, y]) => ({ n, p: [150, y, 1850, y] })));
    await fcol('laminas').doc('lamT3').set({ pisoId: 'n3', base: true, esp: 'Estructuras', name: 'Encofrado', w: 2000, h: 1500, lw: 1000, lh: 750, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'EST_E03', cod: 'EST_E03', disc: 'EST', rev: 1, mpp: 0.01 }, order: 1, ts: 1, ejes });
  });
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamT3')))).toBe(true);
  await page.evaluate(() => { const A = [...S.amb.values()].filter(a => a.sectorId === 'n3-e').sort(byOrder); const X = [[150, 780], [780, 1450], [1450, 1850]];
    const ops = A.slice(0, 3).map((a, i) => { const [x0, x1] = X[i]; const o = op('ambientes', a.id, { ...a, geo: { lamT3: [x0, 250, x1, 250, x1, 1150, x0, 1150] } }); delete o.after.id; return o; }); apply(ops, 'test');
    U.tab = 'planos'; U.csSzV = 'niv'; CSZ.fg = 'E'; CNV.pid = 'n3'; render(); });
  await expect(page.locator('[data-cnvt="viga"]')).toBeVisible({ timeout: 15000 });
  const scr = (x, y) => page.evaluate(([x, y]) => { const h = document.getElementById('csszmap'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  const tap = async (x, y) => { const q = await scr(x, y); await page.mouse.click(q.x, q.y); };
  await page.locator('[data-cnvt="viga"]').click();
  await expect(page.locator('#csszhint')).toContainText('cruce de ejes donde empieza');
  await tap(205, 696); /* cerca del cruce A-2: se pega al cruce */
  await expect(page.locator('#csszhint')).toContainText('donde termina');
  await tap(1000, 300); /* C-1: no comparte eje con A-2 */
  await expect(page.locator('#csszhint')).toContainText('donde termina');
  await tap(1797, 703); /* E-2 */
  await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje A');
  /* caras de cada apoyo: A excéntrica (0.10 adentro), las demás de 0.40 centradas; el plano se acerca a cada apoyo */
  await tap(195, 700); await tap(245, 700);
  for (const x of [600, 1000, 1400]) { await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje'); await tap(x - 20, 700); await tap(x + 20, 700); }
  await page.locator('[data-kvp="same"]').click(); /* E: mismo ancho que D */
  await expect.poll(() => page.evaluate(() => (kvVigas('n3').find(v => v.pl) || {}).cod)).toBe('V-2');
  const V = await page.evaluate(() => kvVigas('n3').find(v => v.pl));
  const codes = await page.evaluate(() => kmSecs('n3').filter(a => (csSecOf(a) || {}).grp === 'E').slice(0, 3).map(a => a.code));
  expect(V.ejes.map(e => [e.n, e.w, e.d])).toEqual([['A', '0.50', '4.00'], ['B', '0.40', '4.00'], ['C', '0.40', '4.00'], ['D', '0.40', '4.00'], ['E', '0.40', '']]);
  expect(V.ejes[0].o).toBe('0.2');
  expect(V.jun).toEqual([{ ref: 'B', dx: '1.80' }, { ref: 'D', dx: '0.50' }]);
  expect(V.sec).toEqual(codes);
  expect(V.pl).toMatchObject({ eje: '2', e0: 'A', e1: 'E', ref: 'lamT3' });
  /* semáforo: la junta de D–E está fuera del tercio central; «Pegar al tercio» la lleva al borde del tercio */
  await expect(page.locator('#csszside')).toContainText('Juntas en vigas');
  await expect(page.locator('#csszside [data-kvpt]')).toHaveCount(1);
  await page.locator('#csszside [data-kvpt]').click();
  await expect.poll(() => page.evaluate(() => kvVigas('n3').find(v => v.pl).jun[1].dx)).toBe('1.45');
  await expect(page.locator('#csszside [data-kvpt]')).toHaveCount(0);
  expect(await page.evaluate(() => !!S.sec.get('n3-e').hand)).toBe(true);
  /* en Metrados › Vigas queda vinculada y con el aviso del cambio */
  await page.evaluate(() => { U.tab = 'met'; U.kmV = 'vig'; U.piso = 'n3'; MET.vid = kvVigas('n3').find(v => v.pl).id; render(); });
  await expect(page.locator('.kvpl')).toContainText('eje 2, de A a E');
  await expect(page.locator('.kvav')).toContainText('se movió');
  expect(errors).toEqual([]);
});
