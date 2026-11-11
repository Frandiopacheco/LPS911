// Planos › láminas en DXF (planos-dxf.js): lector (modelo y presentación), carga en mosaicos con escala exacta, geometría, Medir que se pega.
// Storage se simula en memoria (plPut/plGet), como en planos.spec.js.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import { dxfDemo } from './dxf-demo.js';
import fs from 'node:fs';
import path from 'node:path';
const NM = path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules', 'pdfjs-dist', 'build');

/* PDF de una hoja (pw × ph pt) con el dibujo de la geometría G del DXF (px de su hoja) llevado a s pt por px desde (ox, oy) pt y lo
   que agregue `extra` (operadores PDF): para probar el calce por contenido */
const pdfOf = (G, pw, ph, s, ox, oy, extra = '') => {
  const X = v => (v * s + ox).toFixed(2), Y = v => (ph - (v * s + oy)).toFixed(2); const o = ['0.4 w'];
  for (const L of G.L) {
    for (let i = 0; i + 3 < L.l.length; i += 4) o.push(`${X(L.l[i])} ${Y(L.l[i + 1])} m ${X(L.l[i + 2])} ${Y(L.l[i + 3])} l S`);
    for (const q of L.p) { let t = `${X(q[1])} ${Y(q[2])} m`; for (let i = 3; i + 1 < q.length; i += 2) t += ` ${X(q[i])} ${Y(q[i + 1])} l`; o.push(t + (q[0] ? ' h S' : ' S')); }
    for (let i = 0; i + 2 < L.c.length; i += 3) { const x = +X(L.c[i]), y = +Y(L.c[i + 1]), r = L.c[i + 2] * s, k = 0.5523 * r, f = v => v.toFixed(2);
      o.push(`${f(x + r)} ${f(y)} m ${f(x + r)} ${f(y + k)} ${f(x + k)} ${f(y + r)} ${f(x)} ${f(y + r)} c ${f(x - k)} ${f(y + r)} ${f(x - r)} ${f(y + k)} ${f(x - r)} ${f(y)} c ${f(x - r)} ${f(y - k)} ${f(x - k)} ${f(y - r)} ${f(x)} ${f(y - r)} c ${f(x + k)} ${f(y - r)} ${f(x + r)} ${f(y - k)} ${f(x + r)} ${f(y)} c S`); }
  }
  const c = o.join('\n') + '\n' + extra;
  return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
};
const pdfRoute = page => page.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\/build\/(pdf(\.worker)?\.min\.js)/, r => { const f = r.request().url().match(/(pdf(\.worker)?\.min\.js)/)[1]; return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(NM, f)) }); });

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
  /* con el dedo (11-11-2026): mantener presionado lejos de la esquina pone un punto con la lupa; al deslizar cerca se pega y queda al soltar */
  const pe = (t, x, y) => page.evaluate(([t, x, y]) => PLV.tv.host.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true })), [t, x, y]);
  const sc = await page.evaluate(({ x, y }) => { const v = PLV.tv, r = v.cv.getBoundingClientRect(), s = v.toScreen(x, y); return { x: r.left + s.x, y: r.top + s.y }; }, pt);
  await pe('pointerdown', sc.x - 30, sc.y - 30);
  await page.waitForTimeout(550);
  expect(await page.evaluate(() => [PLM.drag, plmList().length])).toEqual([0, 1]);   /* el tercer punto empieza otra medida; ya se arrastra */
  await pe('pointermove', sc.x + 4, sc.y + 3);
  await pe('pointerup', sc.x + 4, sc.y + 3);
  const H = await page.evaluate(() => [PLM.drag, plmList().map(q => ({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10 }))]);
  expect(H[0]).toBe(-1); expect(H[1]).toEqual([L[0]]);
  /* un toque corto (sin mantener) sigue poniendo el punto donde se toca */
  await pe('pointerdown', sc.x - 90, sc.y - 70); await pe('pointerup', sc.x - 90, sc.y - 70);
  expect(await page.evaluate(() => plmList().length)).toBe(2);
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
test('planos DXF: el grosor de las líneas sale de la escala del plano (textos de ~2 mm en el papel; sin marco)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const mk = (h) => {
    const o = []; const P = (c, v) => o.push(String(c), String(v));
    P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$INSUNITS'); P(70, 6); P(0, 'ENDSEC'); P(0, 'SECTION'); P(2, 'ENTITIES');
    for (let i = 0; i < 12; i++) { P(0, 'LINE'); P(8, 'X'); P(370, 50); P(10, i * 2); P(20, 0); P(11, i * 2); P(21, 20); P(0, 'TEXT'); P(8, 'X'); P(10, i * 2); P(20, 21); P(40, h); P(1, 'T' + i); }
    P(0, 'ENDSEC'); P(0, 'EOF'); return o.join('\n');
  };
  const r = await page.evaluate(T => T.map(t => { const S = dxfSheet(dxfParse(t)); return { esc: S.esc, w: 0.5 * S.pmm / S.ppu }; }), [mk(0.1), mk(0.2), mk(0.04)]);
  expect(r.map(x => x.esc)).toEqual([50, 100, 20]);
  /* una línea de 0,50 mm en el papel mide en el modelo 0,025 m a 1/50, 0,05 m a 1/100 y 0,01 m a 1/20 */
  expect(r[0].w).toBeCloseTo(0.025, 4); expect(r[1].w).toBeCloseTo(0.05, 4); expect(r[2].w).toBeCloseTo(0.01, 4);
  expect(errors).toEqual([]);
});

/* 11-11-2026 (decidido con el dueño): la arquitectura se calibra con los ejes de estructura y usa esos ejes; el dueño revisa los ambientes
   identificados (no se comparan con el lookahead); el contorno es opcional; sus ejes girados no bloquean. */
test('alistar › arquitectura: se calibra con los ejes de estructura, el contorno es opcional y los ejes girados no bloquean', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([m, gir]) => {
    const mk = (t, disc) => { const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
      return { S, G, lay, p: { id: disc + '_X', cod: disc === 'ARQ' ? 'A03' : 'E03', disc, tipo: 'Planta', pisoId: 'P3', rev: 1, mm: S.mm, dxf: { k: S.k, mpp: S.mpp, lay, src: S.src, crop: S.crop, far: S.far } } }; };
    const E = mk(m, 'EST'), A = mk(gir, 'ARQ');
    const chk = (X, o) => { const C = dxfCheck({ p: X.p, G: X.G, lay: X.lay, mpp: X.S.mpp, malla: null, ctn: null, ...o }); return { C, by: Object.fromEntries(C.it.map(x => [x.id, x])) }; };
    const mineE = chk(E).C.mine;
    /* la malla de estructura corrida 3 cm: dentro de la holgura de arquitectura (5 cm) */
    const M = { id: 'EST_X', cod: 'E03', ok: { ej: mineE.map(e => ({ ...e, p: [e.p[0] + 0.03, e.p[1], e.p[2] + 0.03, e.p[3]] })) } };
    const ok = chk(A, { malla: M }), recta = chk(mk(m, 'ARQ'), { malla: M });
    const lejos = chk(A, { malla: { ...M, ok: { ej: mineE.map(e => e.n === 'C' ? { ...e, p: [e.p[0] + 0.2, e.p[1], e.p[2] + 0.2, e.p[3]] } : e) } } });
    const nada = chk(A, { malla: { ...M, ok: { ej: mineE.map(e => ({ ...e, n: 'Z' + e.n })) } } });
    const esp = chk(A, { estDxf: true });
    const esc = chk(mk(m, 'ARQ'), { malla: { ...M, ok: { ej: mineE.map(e => ({ ...e, p: e.p.map(v => v * 1.02) })) } } });
    const ejE = ok.C.ejM.find(e => e.n === 'E'), mpp = A.S.mpp;
    return { ids: ok.C.it.map(x => x.id), malla: ok.by.malla, recta: recta.by.malla, ctn: ok.by.ctn.st, amb: ok.by.amb.msg, fit: !!ok.C.fit, nEjM: ok.C.ejM.length,
      recto: Math.abs(ejE.p[0] - ejE.p[2]) * mpp, lejos: lejos.by.malla, esc: esc.by.malla, nada: nada.by.malla, esp: esp.by.malla, espEjes: !!esp.by.ejes };
  }, [dxfDemo(), dxfDemo({ girado: true })]);
  expect(r.ids).not.toContain('ejes');   /* sin el ítem de sus propios ejes (el eje E girado no bloquea) */
  expect(r.malla.st).toBe('warn'); expect(r.malla.msg).toContain('Calibrado con los ejes de estructura'); expect(r.malla.msg).toContain('Se dejaron fuera 1 cruce(s)'); expect(r.malla.msg).toContain('E-1');
  expect(r.recta.st).toBe('ok');   /* la arquitectura sin el eje girado calza entera */
  expect(r.fit).toBe(true); expect(r.nEjM).toBe(8);
  expect(r.recto).toBeLessThan(0.001);   /* se dibuja el eje E recto de la estructura, no el girado del plano */
  expect(r.ctn).toBe('ok');   /* contorno opcional */
  expect(r.lejos.st).toBe('warn'); expect(r.lejos.msg).toMatch(/Se dejaron fuera \d cruce\(s\)/); expect(r.lejos.det.some(t => t.startsWith('C-'))).toBe(true);   /* el eje C corrido 20 cm se deja fuera y se avisa */
  expect(r.esc.st).toBe('err'); expect(r.esc.msg).toContain('La escala no coincide');
  expect(r.nada.st).toBe('err'); expect(r.nada.msg).toContain('al menos 2 cruces');
  expect(r.esp.st).toBe('err'); expect(r.esp.msg).toContain('Alista primero una planta de estructuras'); expect(r.espEjes).toBe(false);
  expect(errors).toEqual([]);
});

/* 11-11-2026 (decidido con el dueño): una sola ficha por plano. El PDF es lo que se ve; el DXF, su capa de datos. Un DXF con el mismo código
   (E03 = E-03) se agrega al PDF ya cargado en vez de crear otra ficha; las fichas duplicadas de antes se unen con «Unir con su PDF…». */
test('PDF + DXF: el DXF se agrega como datos del PDF del mismo código y las fichas duplicadas se unen', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await pdfRoute(page);
  await page.evaluate(memStorage);
  const lay = dxfDemo({ layout: true });
  /* el PDF original de cada ficha: hoja de 420 × 297 pt con el dibujo del DXF en el recorte (10, 10)–(400, 280) */
  const G0 = await page.evaluate(t => dxfGeoOf(dxfToPx(dxfSheet(dxfParse(t)))), lay);
  const pdf0 = pdfOf(G0, 420, 297, 390 / G0.W, 10, 10);
  await page.evaluate(pdf => { for (const b of ['EST_E-03.p', 'EST_E-04.p', 'ARQ_AG03.p']) window.__ST.set(`planos/${b}/r1/orig.pdf`, new Blob([pdf], { type: 'application/pdf' })); }, pdf0);
  /* el PDF ya cargado (E-03, recortado al marco, misma proporción A3 al doble de píxeles que el DXF) y otro PDF E-04 */
  const dims = await page.evaluate(async t => { const S = dxfToPx(dxfSheet(dxfParse(t))); const pdf = (id, cod) => fcol('plb').doc(id).set({ cod, disc: 'EST', rev: 1, base: `planos/${id}.p/r1`, W: S.W * 2, H: S.H * 2, Z: 3, T: 1024, mm: [420, 297], tipo: 'Planta', tit: 'Encofrado', revs: [], crop: { x0: 10, y0: 10, x1: 400, y1: 280 }, fname: cod + '.pdf', fsize: 1 });
    await pdf('EST_E-03', 'E-03'); await pdf('EST_E-04', 'E-04'); return { W: S.W, H: S.H, mpp: S.mpp, crop: S.crop }; }, lay);
  expect(dims.crop).toBe(true);   /* el marco de la presentación son 4 líneas sueltas */
  expect(await page.evaluate(() => [plCodK('E-03'), plCodK('E03'), plCodK('e 3'), plCodK('AG-03')])).toEqual(['E3', 'E3', 'E3', 'AG3']);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(lay) });
  await expect(page.locator('#plst0')).toContainText('Se agrega como datos (DXF) del PDF E-03');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('el DXF quedó como datos del PDF', { timeout: 90_000 });
  const r = await page.evaluate(async () => { const p = window.__dbGet('plb', 'EST_E-03'); const G = await plGeoGet(plSpecOf(PLB.get('EST_E-03')));
    return { nuevo: !!window.__dbGet('plb', 'EST_E03'), sobre: p.dxf && p.dxf.sobre, mpp: p.dxf.mpp, cal: p.cal, rev: p.rev, W: G.W, hasPdf: plHasPdf(plSpecOf(PLB.get('EST_E-03'))), orig: window.__ST.has(p.base + '/orig.dxf.gz') }; });
  expect(r.nuevo).toBe(false);   /* no se creó otra ficha */
  expect(r.sobre).toBe('pdf'); expect(r.rev).toBe(1); expect(r.hasPdf).toBe(true); expect(r.orig).toBe(true);
  expect(r.mpp / (dims.mpp / 2)).toBeCloseTo(1, 2);   /* la escala exacta llevada a los píxeles del PDF */
  expect(r.cal).toMatchObject({ dxf: 1, rev: 1 }); expect(r.cal.mpp / (dims.mpp / 2)).toBeCloseTo(1, 2);   /* Medir no pide calibrar */
  expect(r.W).toBe(dims.W * 2);
  /* ficha duplicada de antes: un plano solo DXF (E04) se une con su PDF (E-04) */
  const j = await page.evaluate(async t => { const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const z = await dxfGz(JSON.stringify(G), 'application/json');
    const base = 'planos/EST_E04.d/r1'; window.__ST.set(base + '/geo.json.gz', z.b);
    await fcol('plb').doc('EST_E04').set({ cod: 'E04', disc: 'EST', rev: 1, base, W: S.W, H: S.H, Z: 3, T: 1024, mm: S.mm, tipo: 'Planta', revs: [], dxf: { v: 1, src: S.src, k: S.k, mpp: S.mpp, lay: dxfGuess(dxfLayers(dxfGeoF(G))), gz: 1, oz: 0, crop: true }, cal: { mpp: S.mpp, rev: 1, dxf: 1 },
      fix: { rev: 1, L: [{ id: 'f1', k: 'colAdd', p: [10, 10, 20, 10, 20, 20, 10, 20] }] }, ok: { rev: 1, t: 1, by: 'x', malla: true, ej: [], mpp: S.mpp } });
    await new Promise(r => setTimeout(r, 50));
    const D = PLB.get('EST_E04'), P = PLB.get('EST_E-04'); const tw = plTwinOf('EST', 'E04', 'EST_E04');
    await plDxfJoin(D, plSpecOf(D), P, true); await new Promise(r => setTimeout(r, 50));
    const p = window.__dbGet('plb', 'EST_E-04'), d = window.__dbGet('plb', 'EST_E04');
    return { tw: tw && tw.id, sobre: p.dxf.sobre, fix: p.fix.L[0].p, ok: p.ok, arch: !!d.arch, unido: d.arch && d.arch.unido, mpp: p.dxf.mpp, mpp0: S.mpp }; }, lay);
  expect(j.tw).toBe('EST_E-04'); expect(j.sobre).toBe('pdf');
  j.fix.forEach((v, i) => expect(Math.abs(v - [20, 20, 40, 20, 40, 40, 20, 40][i])).toBeLessThan(3));   /* las correcciones de Alistar se llevan al PDF (3 px = 0,03 mm aquí) */
  expect(j.ok).toMatchObject({ rev: 1, malla: true }); expect(j.ok.mpp / (j.mpp0 / 2)).toBeCloseTo(1, 2);
  expect(j.arch).toBe(true); expect(j.unido).toBe('EST_E-04');
  expect(j.mpp / (j.mpp0 / 2)).toBeCloseTo(1, 2);
  /* misma ficha (como la AG03): el PDF en la Rev. 1 y el DXF en la Rev. 2 → aviso en la biblioteca y «Unir» crea la Rev. 3 con la imagen del PDF y los datos del DXF */
  await page.evaluate(async t => { const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const z = await dxfGz(JSON.stringify(G), 'application/json');
    const base = 'planos/ARQ_AG03.d/r2'; window.__ST.set(base + '/geo.json.gz', z.b);
    await fcol('plb').doc('ARQ_AG03').set({ cod: 'AG03', disc: 'ARQ', rev: 2, base, W: S.W, H: S.H, Z: 3, T: 1024, mm: S.mm, tipo: 'Planta', fname: 'AG03.dxf',
      revs: [{ rev: 1, base: 'planos/ARQ_AG03.p/r1', W: S.W * 2, H: S.H * 2, Z: 4, mm: [420, 297], crop: { x0: 10, y0: 10, x1: 400, y1: 280 }, fname: 'AG03.pdf', ts: 1, byN: 'x' }],
      dxf: { v: 1, src: S.src, k: S.k, mpp: S.mpp, lay: {}, gz: 1, oz: 0, crop: true }, cal: { mpp: S.mpp, rev: 2, dxf: 1 } }); }, lay);
  await expect.poll(() => page.evaluate(() => plJoinPend().map(x => x.D.id + ':' + (x.P ? x.P.id : 'r' + x.r)).join())).toBe('ARQ_AG03:r1');
  await page.click('#tabs [data-tab="pbib"]');
  await expect(page.locator('.pljc [data-pljoin="ARQ_AG03"]')).toContainText('Unir AG03 (PDF de la Rev. 1)');
  page.once('dialog', d => d.accept());
  await page.click('.pljc [data-pljoin="ARQ_AG03"]');
  await expect.poll(() => page.evaluate(() => { const p = window.__dbGet('plb', 'ARQ_AG03') || {}; return p.rev + ':' + (p.dxf && p.dxf.sobre); })).toBe('3:pdf');   /* la unión escribe en dos pasos */
  const o = await page.evaluate(() => { const p = window.__dbGet('plb', 'ARQ_AG03'); return { base: p.base, sobre: p.dxf && p.dxf.sobre, revs: p.revs.map(r => r.rev + (r.dxf ? 'D' : 'P')), pend: plJoinPend().length }; });
  expect(o).toEqual({ base: 'planos/ARQ_AG03.p/r1', sobre: 'pdf', revs: ['1P', '2D'], pend: 0 });
  await expect(page.locator('.pljc')).toHaveCount(0);
  /* un DXF que no calza con el PDF (otra lámina) no se une */
  const bad = await page.evaluate(async ([pdf, G]) => { window.__ST.set('planos/X.p/r1/orig.pdf', new Blob([pdf], { type: 'application/pdf' }));
    try { await plDxfMap({ cod: 'X', base: 'planos/X.p/r1', W: 2000, H: 1414, crop: null }, G.W, G.H, true, G); return ''; } catch (e) { return e.message; } },
  [pdfOf({ L: [{ l: [0, 0, 3000, 2000, 3000, 0, 0, 2000, 100, 500, 2900, 600], p: [], c: [] }] }, 420, 297, 0.1, 5, 5), G0]);
  expect(bad).toContain('no calza con el PDF');
  expect(errors).toEqual([]);
});

/* 11-11-2026 (planos reales del dueño: la E-15 sin marco en el PDF, la AG03 con el dibujo ~1 mm corrido de su marco): el DXF se calza
   por su dibujo, no por el marco. PDF de hoja completa (sin recortar) con un marco y el dibujo corrido 2 pt dentro de él. */
test('PDF + DXF: el DXF se calza por su dibujo aunque el marco del PDF no coincida', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await pdfRoute(page);
  await page.evaluate(memStorage);
  const lay = dxfDemo({ layout: true });
  const G0 = await page.evaluate(t => dxfGeoOf(dxfToPx(dxfSheet(dxfParse(t)))), lay);
  const pdf = pdfOf(G0, 1191, 842, 1111 / G0.W, 42, 30, '2 w 40 28 1111 785.6 re S');
  const r = await page.evaluate(async ([t, pdf]) => {
    window.__ST.set('planos/EST_E-05.p/r1/orig.pdf', new Blob([pdf], { type: 'application/pdf' }));
    await fcol('plb').doc('EST_E-05').set({ cod: 'E-05', disc: 'EST', rev: 1, base: 'planos/EST_E-05.p/r1', W: 2382, H: 1684, Z: 3, T: 1024, mm: [420, 297], tipo: 'Planta', revs: [], crop: null, fname: 'E-05.pdf' });
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const z = await dxfGz(JSON.stringify(G), 'application/json');
    const base = 'planos/EST_E05.d/r1'; window.__ST.set(base + '/geo.json.gz', z.b);
    await fcol('plb').doc('EST_E05').set({ cod: 'E05', disc: 'EST', rev: 1, base, W: S.W, H: S.H, Z: 3, T: 1024, mm: S.mm, tipo: 'Planta', revs: [], dxf: { v: 1, src: S.src, k: S.k, mpp: S.mpp, lay: {}, gz: 1, oz: 0, crop: true }, cal: { mpp: S.mpp, rev: 1, dxf: 1 } });
    goMod('pla'); for (let i = 0; i < 50 && !(PLB.get('EST_E05') && PLB.get('EST_E-05')); i++) await new Promise(r => setTimeout(r, 100));
    await plDxfJoin(PLB.get('EST_E05'), plSpecOf(PLB.get('EST_E05')), PLB.get('EST_E-05'), true);
    const p = window.__dbGet('plb', 'EST_E-05'); const G2 = JSON.parse(await dxfUnGz(window.__ST.get(p.base + '/geo.json.gz')));
    const a = G.L.find(o => o.l.length), b = G2.L.find(o => o.n === a.n);
    return { Wd: S.W, mppd: S.mpp, mpp: p.dxf.mpp, sobre: p.dxf.sobre, map: p.dxf.map, W2: G2.W, x0: a.l[0], y0: a.l[1], x1: b.l[0], y1: b.l[1] };
  }, [lay, pdf]);
  const f = 1111 * 2 / r.Wd;   /* 2 px por punto */
  expect(r.sobre).toBe('pdf'); expect(r.W2).toBe(2382);
  expect(r.mpp / (r.mppd / f)).toBeCloseTo(1, 3);
  expect(Math.abs(r.x1 - (r.x0 * f + 84))).toBeLessThan(1.5);   /* 42 pt × 2 (el marco está en 40) */
  expect(Math.abs(r.y1 - (r.y0 * f + 60))).toBeLessThan(1.5);   /* 30 pt × 2 */
  expect(r.map.med).toBeLessThan(0.2);   /* calidad guardada: mediana en mm de papel */
  expect(errors).toEqual([]);
});

/* «Recalcular el calce» (✎ Datos del plano): un plano unido antes, con el DXF 3 mm corrido, se vuelve a calzar; las correcciones de
   Alistar y el contorno se mueven con él y la geometría se guarda con otro nombre (los equipos guardan los archivos por su ruta). */
test('PDF + DXF: «Recalcular el calce» corrige un DXF ya unido que quedó corrido', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await pdfRoute(page);
  await page.evaluate(memStorage);
  const lay = dxfDemo({ layout: true });
  const G0 = await page.evaluate(t => dxfGeoOf(dxfToPx(dxfSheet(dxfParse(t)))), lay);
  const s = 1111 / G0.W, pdf = pdfOf(G0, 1191, 842, s, 40, 28);
  const r = await page.evaluate(async ([G0, pdf, s]) => {
    const base = 'planos/EST_E-06.p/r1'; window.__ST.set(base + '/orig.pdf', new Blob([pdf], { type: 'application/pdf' }));
    /* unido antes con 8,5 pt (3 mm) de error: px de los mosaicos = 2 por pt */
    const f = 2 * s, G = dxfGeoScale(G0, f, 97, 73, 2382, 1684); window.__ST.set(base + '/geo.json.gz', (await dxfGz(JSON.stringify(G), 'application/json')).b);
    const mpp = G0.mpp / f;
    await fcol('plb').doc('EST_E-06').set({ cod: 'E-06', disc: 'EST', rev: 1, base, W: 2382, H: 1684, Z: 3, T: 1024, mm: [420, 297], tipo: 'Planta', revs: [], crop: null, fname: 'E-06.pdf',
      dxf: { v: 1, src: 'presentación', k: 1, mpp, lay: {}, gz: 1, oz: 0, crop: true, sobre: 'pdf' }, cal: { mpp, rev: 1, dxf: 1 }, fix: { rev: 1, L: [{ id: 'f1', k: 'colAdd', p: [197, 173, 297, 173] }] } });
    goMod('pla'); for (let i = 0; i < 50 && !PLB.get('EST_E-06'); i++) await new Promise(r => setTimeout(r, 100));
    const M = await plDxfRecalce(PLB.get('EST_E-06'));
    const p = window.__dbGet('plb', 'EST_E-06'); const G2 = JSON.parse(await dxfUnGz(window.__ST.get(p.base + '/' + plGeoName(p.dxf))));
    const a = G0.L.find(o => o.l.length), b = G2.L.find(o => o.n === a.n);
    return { M, gv: p.dxf.gv, x: b.l[0] - (a.l[0] * f + 80), y: b.l[1] - (a.l[1] * f + 56), fix: p.fix.L[0].p, mpp: p.dxf.mpp / mpp, cal: p.cal.mpp / mpp };
  }, [G0, pdf, s]);
  expect(r.gv).toBeTruthy();
  expect(Math.abs(r.x)).toBeLessThan(1.5); expect(Math.abs(r.y)).toBeLessThan(1.5);   /* quedó en (40, 28) pt × 2 */
  r.fix.forEach((v, i) => expect(Math.abs(v - [180, 156, 280, 156][i])).toBeLessThan(1.5));   /* la corrección se movió con el DXF (−17 px) */
  expect(r.mpp).toBeCloseTo(1, 3); expect(r.cal).toBeCloseTo(1, 3);
  expect(errors).toEqual([]);
});
