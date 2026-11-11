// Planos › láminas en DXF (planos-dxf.js): lector (modelo y presentación), carga en mosaicos con escala exacta, geometría, Medir que se pega.
// Storage se simula en memoria (plPut/plGet), como en planos.spec.js.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import { dxfDemo } from './dxf-demo.js';

const memStorage = () => {
  window.__ST = new Map(); window.__GETS = [];
  window.plPut = async (p, blob) => { window.__ST.set(p, blob); };
  window.plGet = async p => { window.__GETS.push(p); const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
};

test('planos DXF: el lector arma la lámina del modelo o de la presentación, con unidades, escala, capas y lo lejano fuera', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([m, cm, lay]) => {
    const go = t => { const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G))); const R = dxfRoles(G, lay, S.mpp);
      const c = {}; for (const e of S.P) c[e.k] = (c[e.k] || 0) + 1;
      return { src: S.src, W: S.W, H: S.H, mm: S.mm, k: S.k, how: S.how, mpp: S.mpp, far: S.far, c, lay, ej: R.ej.map(e => e.n), cnt: R.cnt, ls: G.L.map(o => o.n).sort(),
        ab: R.ej.find(e => e.n === 'B').p[0] - R.ej.find(e => e.n === 'A').p[0], col0: R.col.map(q => q.p).find(p => p.length === 8),
        arc: S.P.find(e => e.k === 'p' && e.l === 'EST-TRAZO' && e.P.length > 4), fill: S.P.find(e => e.k === 'f'), mt: S.P.find(e => e.k === 't' && e.L.length > 1) }; };
    return { m: go(m), cm: go(cm), lay: go(lay) };
  }, [dxfDemo(), dxfDemo({ k: 100 }), dxfDemo({ layout: true })]);
  /* modelo: 1/100 a 300 ppp (118,1 px por metro), pero un dibujo chico se agranda a 3000 px; las unidades salen de los ejes (el $INSUNITS dice pulgadas) */
  expect(r.m).toMatchObject({ src: 'modelo', k: 1, how: 'ejes', far: 1 });
  expect(Math.max(r.m.W, r.m.H)).toBe(3000); expect(1 / r.m.mpp).toBeGreaterThan(118.11);
  expect(r.m.ab * r.m.mpp).toBeCloseTo(4, 3); /* A–B = 4 m */
  expect(r.m.ej).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']);
  expect(r.m.cnt).toMatchObject({ ej: 8, col: 5, chico: 1, tx: 1 }); expect(r.m.cnt.ln).toBeGreaterThan(10); /* las 2 caras + el arco en tramos */
  expect(r.m.lay).toMatchObject({ ej: 'EST-EJES', col: 'EST-COLUMNAS', vig: ['EST-TRAZO'], tx: 'EST-TEXTOS' });
  expect(r.m.ls).not.toContain('APAGADA'); /* capa apagada: no se dibuja ni entra a la geometría */
  expect(r.m.arc.P.length).toBeGreaterThan(10); /* la polilínea con bulge se dibuja como arco */
  expect(r.m.fill).toMatchObject({ so: true, l: 'EST-ACHURADO' });
  expect(r.m.mt.L).toEqual(['NOTA', 'LOSA h=0.20']);
  /* en centímetros: misma lámina */
  expect(r.cm).toMatchObject({ src: 'modelo', k: 0.01, W: r.m.W, H: r.m.H });
  expect(r.cm.ab * r.cm.mpp).toBeCloseTo(4, 3);
  /* presentación A3 con una ventana a 1/100: el papel a tamaño real; la escala es la de la ventana */
  expect(r.lay).toMatchObject({ src: 'presentación', mm: [420, 297], k: 1 });
  expect(r.lay.W).toBeGreaterThan(4900); expect(r.lay.W).toBeLessThan(5000);
  expect(1 / r.lay.mpp).toBeCloseTo(118.11, 1);
  expect(r.lay.ab * r.lay.mpp).toBeCloseTo(4, 3);
  expect(r.lay.ej).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']);
  expect(r.lay.ls).toContain('MARCO');
  expect(errors).toEqual([]);
});

test('planos DXF: se carga como lámina (mosaicos, escala exacta, DXF y geometría en Storage), se ve en el visor y Medir se pega a las columnas', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  const name = '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf';
  await page.setInputFiles('#plfile', { name, mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) });
  await expect(page.locator('#plqtab tbody tr')).toHaveCount(1);
  await expect(page.locator('#plqtab tbody tr input[data-f="cod"]')).toHaveValue('E03');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await expect(page.locator('#plst0')).toContainText(/DXF \(modelo\) · escala exacta: 1 m = \d+ px/);
  const d = await page.evaluate(() => window.__dbGet('plb', 'EST_E03'));
  expect(d).toMatchObject({ cod: 'E03', disc: 'EST', rev: 1, tipo: 'Planta', crop: null, dxf: { v: 1, src: 'modelo', k: 1, how: 'ejes', gz: 1, oz: 1 } });
  expect(d.dxf.lay).toMatchObject({ ej: 'EST-EJES', col: 'EST-COLUMNAS', vig: ['EST-TRAZO'] });
  expect(d.cal).toMatchObject({ rev: 1, dxf: 1, mpp: d.dxf.mpp }); /* Medir y Casco usan la escala del DXF */
  expect(d.tx).toMatchObject({ v: 1, z: 1 }); expect(d.tx.n).toBeGreaterThan(5); /* Buscar en el contenido: los textos del DXF */
  const files = await page.evaluate(() => [...window.__ST.keys()]);
  const exp = []; for (let z = 0; z < d.Z; z++) { const k = 2 ** z, nx = Math.ceil(Math.ceil(d.W / k) / 1024), ny = Math.ceil(Math.ceil(d.H / k) / 1024); for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) exp.push(`${d.base}/${z}/${x}_${y}.webp`); }
  expect(files.sort()).toEqual([...exp, d.base + '/th.webp', d.base + '/orig.dxf.gz', d.base + '/geo.json.gz', d.base + '/tx.json.gz'].sort());
  /* el DXF original se recupera igual */
  expect(await page.evaluate(async b => (await dxfUnGz(await window.plGet(b + '/orig.dxf.gz'))).includes('EST-COLUMNAS'), d.base)).toBe(true);
  /* visor: botón DXF y Capas; Medir se pega a la esquina de la columna B */
  await page.click('#tabs [data-tab="pbib"]');
  await page.click('.plc[data-pl="EST_E03"]');
  await expect(page.locator('#plv canvas.plcv')).toBeVisible();
  await expect(page.locator('#plv [data-pv="pdf"]')).toHaveText('DXF');
  await expect(page.locator('#plv [data-pv="dxl"]')).toBeVisible();
  await page.click('#plv [data-pv="med"]');
  /* esquina de la columna B (la segunda de 0.40 m) */
  const pt = await page.evaluate(async () => { const p = PLB.get('EST_E03'); const G = await plGeoGet(plSpecOf(p)); const R = dxfRoles(G, p.dxf.lay, p.dxf.mpp);
    const C = R.col.map(q => q.p).sort((a, b) => a[0] - b[0]); return { x: C[1][0], y: C[1][1] }; });
  await expect.poll(() => page.evaluate(() => !!plmGeo())).toBe(true);
  /* toque a 5 px de pantalla de la esquina: queda en la esquina; con otro a 40 px no se pega */
  const L = await page.evaluate(({ x, y }) => { const v = PLV.tv, r = v.cv.getBoundingClientRect(), s = v.toScreen(x, y); plmTap(r.left + s.x + 5, r.top + s.y + 4); plmTap(r.left + s.x + 40, r.top + s.y + 40);
    return plmList().map(q => ({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 })); }, pt);
  expect(L[0]).toEqual({ x: Math.round(pt.x * 10) / 10, y: Math.round(pt.y * 10) / 10 });
  expect(L[1]).not.toEqual(L[0]);
  expect(errors).toEqual([]);
});

test('alistar: la verificación del DXF (escala por cotas, ejes, malla, contorno) y el semáforo', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([m, cm]) => {
    const mk = t => { const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
      return { S, G, lay, p: { id: 'EST_E03', cod: 'E03', disc: 'EST', tipo: 'Planta', pisoId: 'P3', rev: 1, mm: S.mm, dxf: { k: S.k, mpp: S.mpp, lay, src: S.src, crop: S.crop, far: S.far } } }; };
    const A = mk(m), B = mk(cm);
    const chk = (X, o) => { const C = dxfCheck({ p: X.p, G: X.G, lay: X.lay, mpp: X.S.mpp, malla: null, ctn: null, ...o }); return { C, by: Object.fromEntries(C.it.map(x => [x.id, x])) }; };
    const c1 = chk(A);
    const W = A.S.W, H = A.S.H, rect = [W * .05, H * .05, W * .95, H * .05, W * .95, H * .95, W * .05, H * .95];
    const allConf = Object.fromEntries(c1.C.it.filter(x => x.st === 'warn').map(x => [x.id, { n: '' }]));
    const c2 = chk(A, { ctn: { P: rect } });
    const shift = c1.C.mine.map(e => e.n === 'C' ? { ...e, p: [e.p[0] + 0.05, e.p[1], e.p[2] + 0.05, e.p[3]] } : e);
    const cM = chk(A, { malla: { id: 'EST_X', cod: 'E99', ok: { ej: shift } } }), cMok = chk(A, { malla: { id: 'EST_X', cod: 'E99', ok: { ej: c1.C.mine } } });
    const cU = chk({ ...B, p: { ...B.p, dxf: { ...B.p.dxf, k: 1 } } }); /* el dibujo está en cm pero dice metros */
    const cP = chk({ ...A, p: { ...A.p, pisoId: '' } });
    const st = c => Object.fromEntries(c.C.it.map(x => [x.id, x.st]));
    return { s1: st(c1), esc: c1.by.escala.msg, ejes: c1.by.ejes.msg, col: c1.by.col.msg, ready1: palState(c1.C.it, {}).ready, ready2: palState(c2.C.it, allConf).ready, s2: st(c2),
      malla: cM.by.malla, mallaOk: cMok.by.malla, unid: cU.by.escala, piso: cP.by.datos, mine: c1.C.mine.length };
  }, [dxfDemo(), dxfDemo({ k: 100 })]);
  expect(r.s1).toEqual({ datos: 'warn', escala: 'warn', ejes: 'warn', malla: 'warn', capas: 'warn', col: 'warn', ctn: 'err', tx: 'warn', enc: 'warn' });
  expect(r.esc).toContain('4 de 5 cotas coinciden'); expect(r.esc).toContain('1 cota(s) con el texto escrito a mano no coinciden');
  expect(r.ejes).toContain('1 cota(s) entre ejes no coinciden'); expect(r.ejes).toContain('4 cota(s) entre ejes coinciden');
  expect(r.col).toContain('5 columnas'); expect(r.col).toContain('4 de 0.40×0.40');
  expect(r.ready1).toBe(false);
  expect(r.s2.ctn).toBe('ok'); expect(r.ready2).toBe(true); /* con contorno y todo lo ⚠ confirmado */
  expect(r.malla.st).toBe('err'); expect(r.malla.msg).toContain('corridos más de 2 cm'); expect(r.malla.det.every(t => /^C-\d corrido/.test(t))).toBe(true); expect(r.malla.det.length).toBe(3); /* solo los cruces del eje C */
  expect(r.mallaOk.st).toBe('ok');
  expect(r.unid.st).toBe('err'); expect(r.unid.msg).toContain('unidades parecen equivocadas');
  expect(r.piso.st).toBe('err'); expect(r.piso.msg).toContain('Falta el nivel');
  expect(r.mine).toBe(8);
  expect(errors).toEqual([]);
});

test('alistar: una planta DXF recién cargada no se puede vincular; se verifica en el visor y al marcarla lista fija la malla de ejes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  const pid = await page.evaluate(async () => { const pid = [...S.pis.values()][0].id; await fcol('plb').doc('EST_E03').update({ pisoId: pid }); return pid; });
  /* sin alistar: no se puede vincular (plano.js se carga aparte) */
  await page.evaluate(() => window.__plano ? 0 : new Promise((ok, ko) => { const s = document.createElement('script'); s.src = PLANO_SRC; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }));
  const err = await page.evaluate(async pid => { try { await window.__plano.lamFromPlb(pid, 'EST_E03', { quiet: true }); return ''; } catch (e) { return e.message; } }, pid);
  expect(err).toContain('por alistar');
  await page.click('#tabs [data-tab="pbib"]');
  await expect(page.locator('.plc[data-pl="EST_E03"] .plalt')).toHaveText('Por alistar');
  await expect(page.locator('.plalc')).toContainText('1 planta(s) DXF por alistar');
  await page.click('.plc[data-pl="EST_E03"]');
  await page.click('#plv [data-pv="alis"]');
  const panel = page.locator('.plalp');
  await expect(panel).toContainText('Alistar E03 · Rev. 1');
  await expect(panel.locator('[data-pal="ok"]')).toBeDisabled();
  await expect(panel.locator('.palit.err')).toHaveCount(1); /* el contorno */
  /* confirmar lo ⚠ (cada cambio se guarda y el panel se rehace) */
  for (let i = 0; i < 12; i++) { const c = panel.locator('input[data-palc]:not(:checked)').first(); if (!(await c.count())) break; const id = await c.getAttribute('data-palc'); await c.click();
    await expect.poll(() => page.evaluate(id => !!(((PLB.get('EST_E03').alc || {}).chk || {})[id]), id)).toBe(true); }
  /* contorno trazado con Medir › Área y «Usar como contorno» */
  await panel.locator('[data-pal="ctn"]').click();
  await page.evaluate(() => { const v = PLV.tv; PLM.L.area = [{ x: v.W * .1, y: v.H * .1 }, { x: v.W * .9, y: v.H * .1 }, { x: v.W * .9, y: v.H * .9 }, { x: v.W * .1, y: v.H * .9 }]; plmBar(); });
  await page.locator('.plmbar [data-pm="ctnok"]').click();
  await expect.poll(() => page.evaluate(() => (PLB.get('EST_E03').ctn || {}).a > 0)).toBe(true);
  await expect(panel.locator('[data-pal="ok"]')).toBeEnabled();
  await panel.locator('[data-pal="ok"]').click();
  await expect.poll(() => page.evaluate(() => !!PLB.get('EST_E03').ok)).toBe(true);
  const d = await page.evaluate(() => window.__dbGet('plb', 'EST_E03'));
  expect(d.ok).toMatchObject({ rev: 1, malla: true }); expect(d.ok.by).toBeTruthy(); expect(d.ok.ej.map(e => e.n)).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']);
  expect(Object.keys(d.ok.chk).sort()).toEqual(['capas', 'col', 'datos', 'ejes', 'enc', 'escala', 'malla', 'tx']);
  await expect(panel).toContainText('✓ Listo');
  await expect(page.locator('#plv [data-pv="alis"]')).toHaveText('✓ Listo');
  expect(await page.evaluate(() => plMalla() && plMalla().id)).toBe('EST_E03');
  /* ya listo, todo se puede seguir corrigiendo: acciones visibles y al tocar un eje salen sus correcciones */
  await expect(panel.locator('[data-pal="ejAdd"]')).toBeVisible();
  await page.evaluate(() => { const e = PAL.C.R.ej[0]; const v = PLV.tv, r = v.cv.getBoundingClientRect(), q = v.toScreen((e.p[0] + e.p[2]) / 2, (e.p[1] + e.p[3]) / 2); palTap(r.left + q.x, r.top + q.y); });
  await expect(panel.locator('.palsel [data-pal="sel:ren"]')).toBeVisible();
  await panel.locator('[data-pal="selx"]').click();
  /* ya listo, el contorno se puede seguir editando (avisa que vuelve a «Por alistar»): agregar un hueco */
  await expect(panel.locator('[data-pal="hueco"]')).toBeVisible();
  page.once('dialog', dl => dl.accept());
  await panel.locator('[data-pal="hueco"]').click();
  await page.evaluate(() => { const v = PLV.tv; PLM.L.area = [{ x: v.W * .4, y: v.H * .4 }, { x: v.W * .5, y: v.H * .4 }, { x: v.W * .5, y: v.H * .5 }, { x: v.W * .4, y: v.H * .5 }]; plmBar(); });
  await page.locator('.plmbar [data-pm="ctnok"]').click();
  await expect.poll(() => page.evaluate(() => (PLB.get('EST_E03').ctn.H || []).length)).toBe(1);
  const ct = await page.evaluate(() => { const p = PLB.get('EST_E03'); return { a: p.ctn.a, ok: !!p.ok, bruto: palArea(p.ctn.P) * p.dxf.mpp ** 2, h: palArea(p.ctn.H[0].p) * p.dxf.mpp ** 2 }; });
  expect(ct.ok).toBe(false); /* volvió a «Por alistar» */
  expect(ct.a).toBeCloseTo(ct.bruto - ct.h, 1); /* el hueco se resta */
  await expect(panel.locator('.palit').filter({ hasText: 'Contorno' })).toContainText('menos 1 hueco(s)');
  await panel.locator('[data-pal="hdel:0"]').click();
  await expect.poll(() => page.evaluate(() => (PLB.get('EST_E03').ctn.H || []).length)).toBe(0);
  /* cambiar las capas lo devuelve a «Por alistar» */
  await page.evaluate(async () => { const p = PLB.get('EST_E03'); await plCol(p).doc(p.id).update({ ok: firebase.firestore.FieldValue.delete() }); });
  await expect.poll(() => page.evaluate(() => plAlPend(PLB.get('EST_E03')))).toBe(true);
  expect(errors).toEqual([]);
});

test('alistar › correcciones: enderezar un eje girado, nombrar o descartar líneas, quitar columnas y deshacer (puras)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(t => {
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoF(dxfGeoOf(S)) && dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G))); const mpp = S.mpp;
    const p = { id: 'EST_E03', cod: 'E03', disc: 'EST', tipo: 'Planta', pisoId: 'P3', rev: 1, mm: S.mm, dxf: { k: S.k, mpp, lay, src: S.src } };
    const chk = fix => { const C = dxfCheck({ p, G, lay, mpp, malla: null, ctn: null, fix: { rev: 1, L: fix } }); return { C, by: Object.fromEntries(C.it.map(x => [x.id, x])) }; };
    const c0 = chk([]); const O = palEndOpts(c0.C.R, 'E', mpp);
    const opt = Object.fromEntries(O.O.map(o => [o.k, Math.round(o.d * 1000) / 1000]));
    const b = O.O.find(o => o.k === 'b');
    const lin = c0.C.R.S[0];
    const col = c0.C.R.col.map(q => q.p).sort((a, c) => a[0] - c[0]);
    const cen = q => { let x = 0, y = 0; for (let i = 0; i < q.length; i += 2) { x += q[i]; y += q[i + 1]; } return { x: x / (q.length / 2), y: y / (q.length / 2) }; };
    const fix = [{ k: 'ejSet', n: 'E', p: b.p }, { k: 'linIgn', p: lin.p }, { k: 'colDel', ...cen(col[0]) }, { k: 'colDelSz', w: 0.4, h: 0.4 }, { k: 'ejRen', n: 'A', a: 'A1' }];
    const c1 = chk(fix); const c2 = chk(fix.slice(0, 2)); const c3 = chk([{ k: 'ejAdd', n: 'X', p: lin.p, lin: 1 }]);
    const eE = c1.C.R.ej.find(e => e.n === 'E'), eD = c1.C.R.ej.find(e => e.n === 'D');
    return { e0: c0.by.ejes.st, msg0: c0.by.ejes.msg, btn: c0.by.ejes.btn, sin0: c0.C.R.cnt.ejSin, opt, e1: c1.by.ejes.st, recto: eE.p[0] === eE.p[2], dE: Math.round((eE.p[0] - eD.p[0]) * mpp * 1000) / 1000,
      sin1: c1.C.R.cnt.ejSin, col1: c1.C.R.col.length, names: c1.C.R.ej.map(e => e.n).sort().join(','), e2: c2.by.ejes.st, x3: c3.C.R.ej.some(e => e.n === 'X'), sin3: c3.C.R.cnt.ejSin, txt: palFixTxt({ k: 'ejSet', n: 'E', how: 'enderezado como está abajo' }) };
  }, dxfDemo({ girado: true }));
  expect(r.e0).toBe('err'); expect(r.msg0).toContain('Ejes girados: E'); expect(r.btn).toEqual([{ a: 'end:E', t: 'Enderezar E' }]);
  expect(r.sin0).toBe(1);
  expect(r.opt).toEqual({ a: 3.9, b: 4, m: 3.95 }); /* distancias al eje vecino D según dónde quede recto */
  expect(r.recto).toBe(true); expect(r.dE).toBe(4);
  expect(r.e1).not.toBe('err'); expect(r.e2).not.toBe('err');
  expect(r.sin1).toBe(0); /* la línea sin nombre se descartó */
  expect(r.col1).toBe(0); /* la columna A quitada y las cuatro de 0.40×0.40 descartadas: no queda ninguna */
  expect(r.names).toBe('1,2,3,A1,B,C,D,E');
  expect(r.x3).toBe(true); expect(r.sin3).toBe(0); /* nombrar la línea como eje */
  expect(r.txt).toBe('Eje E enderezado como está abajo');
  expect(errors).toEqual([]);
});

test('alistar › correcciones en el visor: enderezar el eje girado, descartar la línea tocándola y deshacer', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo({ girado: true })) });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.evaluate(async () => { await fcol('plb').doc('EST_E03').update({ pisoId: [...S.pis.values()][0].id }); });
  await page.click('#tabs [data-tab="pbib"]');
  await page.click('.plc[data-pl="EST_E03"]');
  await page.click('#plv [data-pv="alis"]');
  const panel = page.locator('.plalp');
  await expect(panel.locator('.palit.err')).toContainText(['Ejes girados: E']);
  /* enderezar: «Como está abajo» (a 4.000 m del eje D) */
  await panel.locator('[data-pal="end:E"]').click();
  await expect(page.locator('#lqm')).toContainText('Enderezar el eje E');
  await page.locator('#lqm input[name="palend"][value="b"]').check();
  await expect.poll(() => page.evaluate(() => !!PAL.prev)).toBe(true); /* vista previa en el plano */
  await page.locator('#lqm [data-palend="ok"]').click();
  await expect.poll(() => page.evaluate(() => ((PLB.get('EST_E03').fix || {}).L || []).length)).toBe(1);
  await expect(panel.locator('.palfx')).toContainText('Correcciones (1)');
  await expect(panel.locator('.palfx')).toContainText('Eje E enderezado como está abajo (a 4.000 m del eje D)');
  await expect(panel.locator('.palit').filter({ hasText: 'Ejes' }).first()).not.toHaveClass(/err/);
  /* tocar la línea sin nombre en el plano → «No es un eje» */
  await page.evaluate(() => { const l = PAL.C.R.S[0]; const v = PLV.tv, r = v.cv.getBoundingClientRect(), q = v.toScreen((l.p[0] + l.p[2]) / 2, (l.p[1] + l.p[3]) / 2); palTap(r.left + q.x, r.top + q.y); });
  await expect(panel.locator('.palsel')).toContainText('sin nombre');
  await panel.locator('[data-pal="sel:ign"]').click();
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E03').fix.L.length)).toBe(2);
  expect(await page.evaluate(() => PAL.C.R.cnt.ejSin)).toBe(0);
  /* deshacer la última */
  await panel.locator('.palfx summary').click();
  await panel.locator('[data-pal^="fxdel:"]').last().click();
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E03').fix.L.length)).toBe(1);
  expect(await page.evaluate(() => PLB.get('EST_E03').fix.L[0])).toMatchObject({ k: 'ejSet', n: 'E' });
  expect(errors).toEqual([]);
});

test('alistar › tocar un trazo muestra su capa y le cambia la función; el DXF siguiente toma las capas revisadas', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.click('#tabs [data-tab="pbib"]');
  await page.click('.plc[data-pl="EST_E03"]');
  await page.click('#plv [data-pv="alis"]');
  const panel = page.locator('.plalp');
  await expect(panel).toContainText('Alistar E03');
  /* tocar una cara de viga (EST-TRAZO, entre columnas): su capa, cuántos trazos tiene y para qué se usa */
  const tapAt = (x, y) => page.evaluate(([x, y]) => { const v = PLV.tv, r = v.cv.getBoundingClientRect(), q = v.toScreen(x, y); palTap(r.left + q.x, r.top + q.y); }, [x, y]);
  const cara = await page.evaluate(() => { const o = PAL.G.L.find(o => o.n === 'EST-TRAZO'); const a = o.l; const t = 0.27; return { x: a[0] + t * (a[2] - a[0]), y: a[1] + t * (a[3] - a[1]) }; });
  await tapAt(cara.x, cara.y);
  await expect(panel.locator('.palsel')).toContainText('Capa «EST-TRAZO»');
  await expect(panel.locator('.palsel')).toContainText('se usa como caras de vigas');
  await panel.locator('[data-pal="sel:lv0"]').click();
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E03').dxf.lay.vig.length)).toBe(0);
  await expect(panel.locator('.palsel')).toContainText('no se usa para nada');
  await panel.locator('[data-pal="sel:lv1"]').click();
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E03').dxf.lay.vig.join(','))).toBe('EST-TRAZO');
  expect(await page.evaluate(() => !!PLB.get('EST_E03').dxf.layH)).toBe(true); /* capas revisadas a mano */
  /* un texto cualquiera: su capa */
  const nota = await page.evaluate(() => { const o = PAL.G.L.find(o => o.n === 'EST-TEXTOS'); const t = o.t.find(t => /3\/8/.test(t[0])); return { x: t[1], y: t[2] }; });
  await tapAt(nota.x, nota.y);
  await expect(panel.locator('.palsel')).toContainText('Capa «EST-TEXTOS»');
  await expect(panel.locator('.palsel')).toContainText('rótulos');
  /* las capas revisadas de E03 se usan en el siguiente DXF de la misma especialidad (aunque la sugerencia por nombre diga otra cosa) */
  await page.evaluate(() => plDxfLaySet(PLB.get('EST_E03'), { 'dxf.lay': { ...PLB.get('EST_E03').dxf.lay, col: 'EST-ACHURADO', vig: ['EST-COLUMNAS'] } }, 'ok'));
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E03').dxf.lay.col)).toBe('EST-ACHURADO');
  await page.evaluate(() => plClose(true));
  await page.evaluate(() => { U.tab = 'pcar'; render(); });
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E04_ENCOFRADO CUARTO PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst1')).toContainText('Listo', { timeout: 90_000 });
  const d = await page.evaluate(() => { const p = [...PLB.values()].find(p => p.id !== 'EST_E03'); return p ? { ...p.dxf, id: p.id, cod: p.cod, disc: p.disc } : null; });
  expect(d.layFrom).toBe('E03'); expect(d.lay.col).toBe('EST-ACHURADO'); expect(d.lay.vig).toEqual(['EST-COLUMNAS']); expect(d.lay.ej).toBe('EST-EJES');
  expect(errors).toEqual([]);
});

/* 11-11-2026: el recorte al marco fallaba si algo suelto lejos agrandaba el dibujo (el marco quedaba < 50 %) o si el marco eran 4 líneas
   sueltas o una polilínea abierta que vuelve al inicio: la lámina salía chica en una esquina. */
test('planos DXF: recorta al marco aunque haya objetos sueltos lejos o el marco sea de 4 líneas o una polilínea abierta', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const mk = (frame) => {
    const o = []; const P = (c, v) => o.push(String(c), String(v));
    const line = (x1, y1, x2, y2, l = 'X') => { P(0, 'LINE'); P(8, l); P(10, x1); P(20, y1); P(11, x2); P(21, y2); };
    const poly = (pts, cl) => { P(0, 'LWPOLYLINE'); P(8, 'MARCO'); P(90, pts.length); P(70, cl ? 1 : 0); pts.forEach(([x, y]) => { P(10, x); P(20, y); }); };
    const text = (s, x, y) => { P(0, 'TEXT'); P(8, 'X'); P(10, x); P(20, y); P(40, 3); P(1, s); };
    P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$INSUNITS'); P(70, 4); P(0, 'ENDSEC'); P(0, 'SECTION'); P(2, 'ENTITIES');
    const R = [[0, 0], [420, 0], [420, 297], [0, 297]];
    if (frame === 'cerrada') poly(R, true);
    if (frame === 'abierta') poly([...R, [0, 0]], false);
    if (frame === 'lineas') { line(0, 0, 420, 0, 'MARCO'); line(420, 0, 420, 297, 'MARCO'); line(420, 297, 0, 297, 'MARCO'); line(0, 297, 0, 0, 'MARCO'); }
    for (let i = 0; i < 40; i++) { line(20 + i * 9, 30, 20 + i * 9, 260); text('T' + i, 25 + i * 9, 20); }   /* el dibujo */
    text('SUELTO', 760, -250); line(700, -260, 780, -260);   /* lejos, pero no tanto como para quedar fuera */
    P(0, 'ENDSEC'); P(0, 'EOF'); return o.join('\n');
  };
  const r = await page.evaluate(T => T.map(t => { const S = dxfSheet(dxfParse(t)); return { crop: S.crop, box: S.box.map(v => Math.round(v)) }; }), ['cerrada', 'abierta', 'lineas', 'sin'].map(mk));
  for (const x of r.slice(0, 3)) expect(x).toEqual({ crop: true, box: [0, 0, 420, 297] });
  expect(r[3].crop).toBe(false);   /* sin marco: la lámina entera */
  expect(errors).toEqual([]);
});

/* 11-11-2026: tras corregir el recorte, el mismo archivo ya cargado se puede volver a procesar como revisión nueva («Cargar de nuevo») */
test('cargar planos: el mismo archivo ya cargado se vuelve a procesar como revisión nueva con «Cargar de nuevo»', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  const file = { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) };
  await page.setInputFiles('#plfile', file);
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.evaluate(() => { PQ.items.length = 0; plqDraw(true); });
  await page.setInputFiles('#plfile', file);
  await expect(page.locator('#plst0')).toContainText('Ya está cargado (mismo archivo)');
  await page.click('#plst0 [data-re="0"]');
  await expect(page.locator('#plst0')).toContainText('Se vuelve a procesar como nueva revisión');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await expect.poll(() => page.evaluate(() => window.__dbGet('plb', 'EST_E03').rev)).toBe(2);
  expect(errors).toEqual([]);
});

/* 11-11-2026: el grosor de las líneas de un plano en el modelo sigue su escala de impresión (por la altura de los textos), no siempre 1/100 */
test('planos DXF: el grosor de las líneas sale de la escala del plano (textos de ~2,5 mm en el papel)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const mk = (h) => {
    const o = []; const P = (c, v) => o.push(String(c), String(v));
    P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$INSUNITS'); P(70, 6); P(0, 'ENDSEC'); P(0, 'SECTION'); P(2, 'ENTITIES');
    for (let i = 0; i < 12; i++) { P(0, 'LINE'); P(8, 'X'); P(370, 50); P(10, i * 2); P(20, 0); P(11, i * 2); P(21, 20); P(0, 'TEXT'); P(8, 'X'); P(10, i * 2); P(20, 21); P(40, h); P(1, 'T' + i); }
    P(0, 'ENDSEC'); P(0, 'EOF'); return o.join('\n');
  };
  const r = await page.evaluate(T => T.map(t => { const S = dxfSheet(dxfParse(t)); return { esc: S.esc, w: 0.5 * S.pmm / S.ppu }; }), [mk(0.125), mk(0.25), mk(0.05)]);
  expect(r.map(x => x.esc)).toEqual([50, 100, 20]);
  /* una línea de 0,50 mm en el papel mide en el modelo 0,025 m a 1/50, 0,05 m a 1/100 y 0,01 m a 1/20 */
  expect(r[0].w).toBeCloseTo(0.025, 4); expect(r[1].w).toBeCloseTo(0.05, 4); expect(r[2].w).toBeCloseTo(0.01, 4);
  expect(errors).toEqual([]);
});
