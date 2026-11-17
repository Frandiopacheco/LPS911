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
  /* columnas en los cruces con 2 tamaños, capas confirmadas por la geometría y rótulos: ✓ solos (17-11-2026); el encuadre sigue ⚠ (hay un objeto lejano fuera) */
  expect(r.s1).toEqual({ datos: 'warn', escala: 'warn', ejes: 'warn', malla: 'warn', capas: 'ok', col: 'ok', ctn: 'err', tx: 'ok', enc: 'warn' });
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
  expect(d.ok).toMatchObject({ rev: 1, malla: true }); expect(d.ok.by).toBeTruthy();
  /* la malla vive en plb.malla (17-11-2026), no en ok: sobrevive a «Volver a revisar» y a las revisiones nuevas */
  expect(d.malla).toMatchObject({ rev: 1 }); expect(d.malla.ej.map(e => e.n)).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']); expect(d.ok.ej).toBeUndefined();
  expect(Object.keys(d.ok.chk).sort()).toEqual(['datos', 'ejes', 'enc', 'escala', 'malla']);   /* capas, columnas y rótulos quedaron ✓ solos */
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
  expect(await page.evaluate(() => { const M = plMalla(); return M && M.id + ':' + M.vieja; })).toBe('EST_E03:false'); /* la malla no se pierde */
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
  /* una malla antigua (en ok, como antes del 17-11-2026): al llegar la Rev. 2 pasa a plb.malla y se queda */
  await page.evaluate(async () => { await fcol('plb').doc('EST_E03').update({ ok: { rev: 1, malla: true, t: 1, by: 'x', ej: [{ n: 'A', p: [0, 0, 0, 10] }, { n: '1', p: [0, 0, 10, 0] }] } }); });
  await page.evaluate(() => { PQ.items.length = 0; plqDraw(true); });
  await page.setInputFiles('#plfile', file);
  await expect(page.locator('#plst0')).toContainText('Ya está cargado (mismo archivo)');
  await page.click('#plst0 [data-re="0"]');
  await expect(page.locator('#plst0')).toContainText('Se vuelve a procesar como nueva revisión');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await expect.poll(() => page.evaluate(() => window.__dbGet('plb', 'EST_E03').rev)).toBe(2);
  const m = await page.evaluate(() => { const d = window.__dbGet('plb', 'EST_E03'); const M = plMalla(); return { d: d.malla, id: M && M.id, rev: M && M.rev, vieja: M && M.vieja }; });
  expect(m.d.ej.length).toBe(2); expect(m.d.rev).toBe(1);
  expect(m).toMatchObject({ id: 'EST_E03', rev: 1, vieja: true }); /* sigue siendo la malla, de la Rev. 1, hasta que el administrador la actualice */
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

test('alistar › malla de ejes: nunca cambia sola (mallas antiguas en ok o en revs, revisión nueva del mismo plano)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(t => {
    const ej = [{ n: 'A', p: [0, 0, 0, 10] }, { n: '1', p: [0, 0, 10, 0] }];
    const keep = new Map(PLB); const run = docs => { PLB.clear(); for (const d of docs) PLB.set(d.id, d); const M = plMalla(); return M && { id: M.id, rev: M.rev, vieja: M.vieja }; };
    const A = { id: 'X1', cod: 'E01', rev: 2, ok: { rev: 2, malla: true, ej, t: 1 } };
    const B = { id: 'X2', cod: 'E02', rev: 3, revs: [{ rev: 2, ok: { rev: 2, malla: true, ej, t: 5 } }] };
    const C = { id: 'X3', cod: 'E03', rev: 4, malla: { ej, rev: 3, t: 1 } };
    const out = { a: run([A]), b: run([B]), c: run([A, B, C]), arch: run([{ ...C, arch: { t: 1 } }]), none: run([{ id: 'X4', cod: 'E04', rev: 1, ok: { rev: 1, malla: false } }]) };
    const k = plMallaKeep(A, { ok: 'borrar' }); out.keep = k.malla && { n: k.malla.ej.length, rev: k.malla.rev }; out.keepNo = 'malla' in plMallaKeep(C, { ok: 'borrar' });
    out.es = [palEsMalla({ id: 'X3', rev: 3, vieja: true }, C), palEsMalla({ id: 'X3', rev: 4, vieja: false }, C)];
    /* «Empezar en Rev. 1»: otro dibujo con el mismo número de revisión no es la malla */
    out.fresh = run([{ id: 'X5', cod: 'E05', rev: 1, base: 'planos/X5/r1b', malla: { ej, rev: 1, base: 'planos/X5/r1a', t: 1 } }]);
    const kr = plMallaKeep(B, { ok: null, revs: null }); out.keepRevs = kr.malla && kr.malla.rev;   /* antigua solo en revs: no se pierde al vaciar revs */
    out.archOld = run([{ ...A, arch: { t: 1 } }]);   /* antigua en un plano archivado: sigue siendo la malla */
    /* la Rev. 2 de la planta que fijó la malla en su Rev. 1: se compara con la malla y lo avisa */
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
    const p = { id: 'EST_X', cod: 'E03', disc: 'EST', tipo: 'Planta', pisoId: 'P3', rev: 2, mm: S.mm, dxf: { k: S.k, mpp: S.mpp, lay, src: S.src } };
    const mine = dxfCheck({ p: { ...p, rev: 1 }, G, lay, mpp: S.mpp, malla: null, ctn: null }).mine;
    const C2 = dxfCheck({ p, G, lay, mpp: S.mpp, malla: { id: 'EST_X', cod: 'E03', ej: mine, rev: 1, vieja: true }, ctn: null });
    const C1 = dxfCheck({ p, G, lay, mpp: S.mpp, malla: { id: 'EST_X', cod: 'E03', ej: mine, rev: 2, vieja: false }, ctn: null });
    out.m2 = C2.it.find(x => x.id === 'malla'); out.m1 = C1.it.find(x => x.id === 'malla');
    /* la Rev. 2 movió el eje C 20 cm: contra su propia revisión anterior no bloquea, se confirma */
    const C3 = dxfCheck({ p, G, lay, mpp: S.mpp, malla: { id: 'EST_X', cod: 'E03', ej: mine.map(e => e.n === 'C' ? { ...e, p: [e.p[0] + 0.2, e.p[1], e.p[2] + 0.2, e.p[3]] } : e), rev: 1, vieja: true }, ctn: null });
    const C4 = dxfCheck({ p, G, lay, mpp: S.mpp, malla: { id: 'OTRO', cod: 'E01', ej: mine.map(e => e.n === 'C' ? { ...e, p: [e.p[0] + 0.2, e.p[1], e.p[2] + 0.2, e.p[3]] } : e), rev: 1, vieja: false }, ctn: null });
    out.m3 = C3.it.find(x => x.id === 'malla'); out.m4 = C4.it.find(x => x.id === 'malla');
    PLB.clear(); for (const [i, d] of keep) PLB.set(i, d);
    return out;
  }, dxfDemo());
  expect(r.a).toEqual({ id: 'X1', rev: 2, vieja: false });   /* antigua en ok de la revisión vigente */
  expect(r.b).toEqual({ id: 'X2', rev: 2, vieja: true });    /* antigua y el plano ya pasó a la Rev. 3: sigue siendo la malla */
  expect(r.c).toEqual({ id: 'X3', rev: 3, vieja: true });    /* la de plb.malla gana a las antiguas */
  expect(r.arch.id).toBe('X3');                              /* archivar el plano no cambia la malla */
  expect(r.none).toBeNull();
  expect(r.keep).toEqual({ n: 2, rev: 2 }); expect(r.keepNo).toBe(false);
  expect(r.es).toEqual([false, true]);
  expect(r.m2.st).toBe('ok'); expect(r.m2.msg).toContain('Coincide con la malla'); expect(r.m2.msg).toContain('sigue siendo la de la Rev. 1');
  expect(r.m1.msg).toContain('Este plano fija la malla');
  expect(r.fresh.vieja).toBe(true); expect(r.keepRevs).toBe(2); expect(r.archOld.id).toBe('X1');
  expect(r.m3.st).toBe('warn'); expect(r.m3.msg).toContain('Los ejes cambiaron respecto a la malla');
  expect(r.m4.st).toBe('err');   /* contra otro plano sí bloquea, como siempre */
  expect(errors).toEqual([]);
});

/* 11-11-2026 (decidido con el dueño): la arquitectura se calibra con los ejes de estructura y usa esos ejes; el dueño revisa los ambientes
   identificados (no se comparan con el lookahead); el contorno es opcional; sus ejes girados no bloquean. */
test('etapa 2: cada plano listo a la malla de ejes; Casco y la capa del Plan diario se alinean solos por ella (puras)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(t => {
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G))); const mpp = S.mpp;
    const mk = (id, x) => ({ id, cod: id, disc: 'EST', tipo: 'Planta', rev: 1, base: 'planos/' + id + '/r1', W: S.W, H: S.H, Z: 3, mm: S.mm, dxf: { k: S.k, mpp, lay, src: S.src }, ok: { rev: 1, t: 1 }, ...x });
    const mine = dxfCheck({ p: mk('EST_M'), G, lay, mpp, malla: null, ctn: null }).mine;
    /* la malla tiene los ejes 1 m a la derecha de los de este dibujo: el otro plano (mismo dibujo) queda 1 m corrido respecto a ella */
    const M1 = mk('EST_M', { malla: { ej: mine.map(e => ({ ...e, p: [e.p[0] + 1, e.p[1], e.p[2] + 1, e.p[3]] })), rev: 1, base: 'planos/EST_M/r1', t: 1 } });
    const P2 = mk('EST_2'), P3 = mk('EST_3', { ok: { rev: 1, t: 1, fit: { a: 1, b: 0, e: 2, f: 0, de: 'EST_M', dr: 1 } } }), P4 = mk('EST_4', { ok: { rev: 1, t: 1, fit: { a: 1, b: 0, e: 2, f: 0, de: 'OTRA', dr: 1 } } });
    const keep = new Map(PLB); PLB.clear(); for (const p of [M1, P2, P3, P4]) PLB.set(p.id, p);
    for (const p of [M1, P2, P3, P4]) GEO.set(plGeoKey(plSpecOf(p)), { g: G });
    const o = q => { const T = plPxMalla(q); return T && { e: +T.e.toFixed(4), f: +T.f.toFixed(4), k: +(Math.hypot(T.a, T.b) / mpp).toFixed(5) }; };
    const out = { m: o(M1), p2: o(P2), p3: o(P3), p4: o(P4), gir: plPxMalla({ ...P2, giro: { q: 1 } }), noOk: plPxMalla({ ...P2, ok: null }) };
    /* lámina contra lámina (Casco: csMap) y la capa del Plan diario sobre una base: 1 m = 1/mpp px del plano */
    const l1 = { id: 'l1', plb: { id: 'EST_M', rev: 1 }, w: 1000 }, l2 = { id: 'l2', plb: { id: 'EST_2', rev: 1 }, w: 500 };
    const T12 = plLamT(l1, l2); const q = simAp(T12, { x: 0, y: 0 }); out.l12 = { x: +q.x.toFixed(3), k: +Math.hypot(T12.a, T12.b).toFixed(5), exp: +(-500 / mpp / S.W).toFixed(3) };
    out.cs = !!(typeof csMap === 'function' && csMap(l1, l2) && csMap(l1, l2).malla);
    out.vieja = plLamT({ ...l1, plb: { id: 'EST_M', rev: 2 } }, l2);   /* lámina en otra revisión: no */
    const A = pdcAuto(P2, { ...l1, T: { a: 1, b: 0, e: 0, f: 0 } }); out.pd = { e: +A[2].toFixed(3), a: +A[0].toFixed(3), exp: +(1000 / mpp / S.W).toFixed(3) };
    /* «Recalcular el calce» movió la geometría 10 px: la alineación guardada y la del plano de la malla se corren igual (la malla no se toca) */
    const s3 = plOkShift(P3, P3.ok, 10, 0, mpp); out.sh3 = +(s3.fit.e - (2 - 10 * mpp)).toFixed(6);
    const sm = plOkShift(M1, M1.ok, 10, 0, mpp); PLB.set('EST_M', { ...M1, ok: sm }); const Tm = plPxMalla(PLB.get('EST_M'));
    out.shm = { de: sm.fit.de, e: +(Tm.e + 10 * mpp).toFixed(6) };
    /* alineación antigua sin dr ni dt: vale solo si el plano se marcó listo después de fijar la malla */
    out.old = [plFitOk({ a: 1, b: 0, e: 0, f: 0, de: 'EST_M' }, { id: 'EST_M', rev: 1, t: 5 }, { ok: { t: 9 } }), plFitOk({ a: 1, b: 0, e: 0, f: 0, de: 'EST_M' }, { id: 'EST_M', rev: 1, t: 5 }, { ok: { t: 2 } }),
      plFitOk({ a: 1, b: 0, e: 0, f: 0, de: 'EST_M', dt: 4 }, { id: 'EST_M', rev: 1, t: 5 }, { ok: { t: 9 } })];
    /* la lista de capas no trae geometrías: sin ok.fit no sabe todavía */
    out.sinGeo = plPxMalla(P2, { sinGeo: 1 }) === null && !!plPxMalla(P3, { sinGeo: 1 });
    PLB.clear(); for (const [i, d] of keep) PLB.set(i, d);
    return out;
  }, dxfDemo());
  expect(r.m).toEqual({ e: 0, f: 0, k: 1 });         /* el plano de la malla: solo la escala */
  expect(r.p2.e).toBeCloseTo(1, 3); expect(r.p2.f).toBeCloseTo(0, 3); expect(r.p2.k).toBeCloseTo(1, 4);   /* calculada con su geometría (listo sin ok.fit) */
  expect(r.p3.e).toBe(2);                             /* la guardada por Alistar al marcarlo listo */
  expect(r.p4.e).toBeCloseTo(1, 3);                   /* guardada contra otra malla: se recalcula */
  expect(r.gir).toBeNull(); expect(r.noOk).toBeNull();
  expect(r.l12.x).toBeCloseTo(r.l12.exp, 2); expect(r.l12.k).toBeCloseTo(0.5, 4);
  expect(r.cs).toBe(true); expect(r.vieja).toBeNull();
  expect(r.pd.a).toBe(1000); expect(r.pd.e).toBeCloseTo(r.pd.exp, 2);
  expect(r.sh3).toBe(0); expect(r.shm).toEqual({ de: 'EST_M', e: 0 });
  expect(r.old).toEqual([true, false, false]); expect(r.sinGeo).toBe(true);
  expect(errors).toEqual([]);
});

test('alistar › lista de ambientes: cada fila se corrige sola aunque un ambiente esté dentro de otro (puras)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(t => {
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
    const p = { id: 'ARQ_X', cod: 'A03', disc: 'ARQ', tipo: 'Planta', pisoId: 'P3', rev: 1, mm: S.mm, dxf: { k: S.k, mpp: S.mpp, lay, src: S.src } };
    /* una sala de 100×100 px con un SH de 20×20 justo en su centro */
    const base = [{ k: 'ambAdd', p: [0, 0, 100, 0, 100, 100, 0, 100], a: 'SALA' }, { k: 'ambAdd', p: [40, 40, 60, 40, 60, 60, 40, 60], a: 'SH' }];
    const chk = L => dxfCheck({ p, G, lay, mpp: S.mpp, malla: null, ctn: null, fix: { rev: 1, L } });
    const rows = chk(base).it.find(x => x.id === 'amb').amb; const row = n => rows.find(x => x.n === n);
    const nm = L => chk(L).R.amb.filter(a => a.add).map(a => a.n).sort().join(',');
    const sala = row('SALA'), sh = row('SH');
    return { n: rows.length, salaFuera: !(sala.x > 40 && sala.x < 60 && sala.y > 40 && sala.y < 60),
      renSala: nm([...base, { k: 'ambRen', x: sala.x, y: sala.y, a: 'AULA' }]), renSh: nm([...base, { k: 'ambRen', x: sh.x, y: sh.y, a: 'SSHH' }]),
      delSh: nm([...base, { k: 'ambDel', x: sh.x, y: sh.y }]) };
  }, dxfDemo());
  expect(r.n).toBeGreaterThanOrEqual(2);
  expect(r.salaFuera).toBe(true);   /* el punto de la sala no cae dentro del SH */
  expect(r.renSala).toBe('AULA,SH'); expect(r.renSh).toBe('SALA,SSHH'); expect(r.delSh).toBe('SALA');
  expect(errors).toEqual([]);
});

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
  /* etapa 3: otro DXF para la misma revisión (mismo PDF): lo de Alistar del anterior va al historial y pasa con las mismas coordenadas */
  /* el DXF nuevo no tiene la columna E: su corrección queda como «ya no aplica» (se compara con el dibujo nuevo, no con el de la caché) */
  const rp = await page.evaluate(async t => { const P0 = PLB.get('EST_E-03'); const G = await plGeoGet(plSpecOf(P0)); const R = dxfRoles(G, P0.dxf.lay, P0.dxf.mpp);
    const cs = R.col.map(q => dxfCen(q.p)).sort((a, b) => a.x - b.x); const c = cs[0], e = cs[cs.length - 1];
    await fcol('plb').doc('EST_E-03').update({ fix: { rev: 1, L: [{ id: 'f1', k: 'colDel', x: c.x, y: c.y, by: 'x', t: 1 }, { id: 'f2', k: 'colDel', x: e.x, y: e.y, by: 'x', t: 1 }] }, ctn: { rev: 1, P: [10, 10, 500, 10, 500, 400, 10, 400], H: [], a: 1 } });
    await new Promise(r => setTimeout(r, 50));
    const it = { file: new File([t], 'E03 v2.dxf', { type: 'application/dxf' }) }; await plDxfAttach(it, PLB.get('EST_E-03'), () => {});
    const d = window.__dbGet('plb', 'EST_E-03'); const H = Object.values(window.__dbAll('plh')).find(h => h.plb === 'EST_E-03');
    return { h: H && { why: H.why, n: H.fix.L.length, ctn: !!H.ctn }, fix: d.fix && d.fix.L.map(f => [f.de.id, Math.round(f.x - c.x)]), de: d.fix && d.fix.de, ctn: d.ctn && d.ctn.P.slice(0, 2), carry: it.carry || '', gv: !!d.dxf.gv, dxfH: d.dxfH && d.dxfH.h === Object.keys(window.__dbAll('plh')).find(k => k.startsWith('EST_E-03')) }; }, dxfDemo({ layout: true, sinCol: true }));
  expect(rp.h).toEqual({ why: 'dxf', n: 2, ctn: true });
  expect(rp.fix).toEqual([['f1', 0]]); expect(rp.de).toMatchObject({ rev: 1, dxf: 1 }); expect(rp.de.no.map(x => x.why)).toEqual(['la columna ya no está']); expect(rp.ctn).toEqual([10, 10]);
  expect(rp.carry).toContain('pasaron 1 corrección(es), el contorno'); expect(rp.gv).toBe(true); expect(rp.dxfH).toBe(true);
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

/* 17-11-2026, etapa 3 de «Planta digitalizada» (planos-rev.js): de una revisión a otra por los ejes, correcciones que pasan solas y se
   verifican, ambientes con id estable y la lista de diferencias. */
test('etapa 3: revisión nueva por los ejes, correcciones que pasan y se verifican, ambientes con id y diferencias (puras)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(t => {
    const S = dxfToPx(dxfSheet(dxfParse(t))); const G0 = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G0))); const mpp = S.mpp; const d0 = { lay, mpp };
    /* la Rev. 2: el mismo dibujo 1,2 veces más grande y corrido; y otra girada 90° */
    const G1 = dxfGeoScale(G0, 1.2, 50, -30), d1 = { lay, mpp: mpp / 1.2 };
    const rot = G => { const H = G.H, xy = (A, i0) => A.map((v, i) => i < i0 ? v : ((i - i0) % 2 ? A[i - 1] : H - A[i + 1])); return { ...G, W: G.H, H: G.W,
      L: G.L.map(o => ({ ...o, l: xy(o.l, 0), p: o.p.map(q => xy(q, 1)), c: o.c.map((v, i) => i % 3 === 0 ? H - o.c[i + 1] : i % 3 === 1 ? o.c[i - 1] : v), t: o.t.map(x => [x[0], H - x[2], x[1], x[3], (x[4] || 0) + 90]), d: (o.d || []).map(q => xy(q, 3)) })) }; };
    const G2 = rot(G0);
    const F1 = palRevFit(G0, d0, null, G1, d1), F2 = palRevFit(G0, d0, null, G2, d0);
    const q1 = simAp(F1.T, { x: 100, y: 200 }), q2 = simAp(F2.T, { x: 100, y: 200 });
    const out = { f1: { k: +Math.hypot(F1.T.a, F1.T.b).toFixed(4), x: +q1.x.toFixed(1), y: +q1.y.toFixed(1), n: F1.n }, f2: { x: +q2.x.toFixed(1), y: +q2.y.toFixed(1), exp: +(G0.H - 200).toFixed(1) } };
    /* la revisión nueva sin ejes reconocibles (otra capa, otros nombres): no calza y se dice por qué */
    const R0 = dxfRoles(G0, lay, mpp);
    out.bad = palRevFit(G0, d0, null, G1, { lay: { ...lay, ej: '' }, mpp: d1.mpp }).err || '';
    /* correcciones de la Rev. 1 llevadas a la 2 */
    const col = R0.col[0].p, cc = dxfCen(col);
    const fix0 = { rev: 1, L: [{ id: 'f1', k: 'colDel', x: cc.x, y: cc.y }, { id: 'f2', k: 'colDel', x: 5, y: 5 }, { id: 'f3', k: 'ejRen', n: R0.ej[0].n, a: 'X9' },
      { id: 'f4', k: 'ambAdd', p: [0, 0, 100, 0, 100, 100, 0, 100], a: 'SALA' }, { id: 'f5', k: 'ejDel', n: 'NOEXISTE' }] };
    const C = palFixCarry(fix0, F1.T, 1, G1, d1);
    const c1 = C.L.find(f => f.de.id === 'f1'); const e1 = simAp(F1.T, cc);
    out.carry = { n: C.L.length, ids: C.L.map(f => f.de.id).sort().join(','), no: C.no.map(x => x.why).sort().join('|'), x: +(c1.x - e1.x).toFixed(2), sala: C.L.find(f => f.k === 'ambAdd').p.slice(0, 2), de: c1.de.rev, nuevoId: c1.id !== 'f1' };
    out.colOk = dxfRolesFix(G1, lay, d1.mpp, { L: C.L }).col.length === dxfRoles(G1, lay, d1.mpp).col.length - 1;
    const ct = palCtnCarry({ rev: 1, P: [0, 0, 100, 0, 100, 100, 0, 100], H: [] }, F1.T, 1, 2, d1.mpp); out.ctn = { de: ct.de, rev: ct.rev, a: +(ct.a / (100 * 100 * mpp * mpp)).toFixed(3) };
    /* ambientes: registro de la Rev. 1 contra los de la Rev. 2 */
    const sq = (x, y, w, n) => ({ p: [x, y, x + w, y, x + w, y + w, x, y + w], n });
    const amb2 = [sq(0, 0, 100, 'SALA'), sq(200, 0, 100, 'COCINA'), sq(400, 0, 140, 'DORMITORIO'), sq(600, 0, 100, 'ESTAR')];
    const m = 0.05;   /* 100 px = 5 m */
    const reg = [{ id: 'a1', n: 'SALA', a: 25, x: 50, y: 50 }, { id: 'a2', n: 'COCINITA', a: 25, x: 250, y: 50 }, { id: 'a3', n: 'DORMITORIO', a: 25, x: 450, y: 50 }, { id: 'a4', n: 'BAÑO', a: 4, x: 900, y: 50 }];
    const p = { id: 'ARQ_X', rev: 2, disc: 'ARQ', dxf: { mpp: m }, amb: { rev: 2, de: { rev: 1 }, L: reg } };
    const D = palAmbDiff(p, { amb: amb2 }, m); const k = D.rows.map(x => x.k + ':' + (x.id || x.n) + ':' + x.st).sort();
    out.diff = { k, pend: D.pend };
    /* decisiones: el BAÑO es el ESTAR, el área del dormitorio está bien */
    const p2 = { ...p, amd: { rev: 2, L: [{ k: 'same', id: 'a4', x: 650, y: 50 }, { k: 'area', id: 'a3' }] } };
    const D2 = palAmbDiff(p2, { amb: amb2 }, m); out.diff2 = { pend: D2.pend, k: D2.rows.map(x => x.k + ':' + (x.id || x.n)).sort() };
    const sv = palAmbSave(p2, { amb: amb2 }, m); out.save = sv.L.map(x => x.n + '=' + x.id).sort();
    /* «es otro ambiente»: el dormitorio pierde su id y queda como nuevo */
    const p3 = { ...p2, amd: { rev: 2, L: [...p2.amd.L.filter(x => x.k !== 'area'), { k: 'otro', id: 'a3' }, { k: 'new', x: 450, y: 50 }] } };
    out.otro = palAmbSave(p3, { amb: amb2 }, m).L.find(x => x.n === 'DORMITORIO').id !== 'a3' && palAmbDiff(p3, { amb: amb2 }, m).pend === 0;
    out.umbral = [palAreaDif(25, 25.8), palAreaDif(25, 25.7), palAreaDif(100, 102.9), palAreaDif(100, 103)];
    return out;
  }, dxfDemo());
  expect(r.f1.k).toBeCloseTo(1.2, 3); expect(r.f1.x).toBeCloseTo(170, 0); expect(r.f1.y).toBeCloseTo(210, 0); expect(r.f1.n).toBeGreaterThanOrEqual(3);
  expect(r.f2.x).toBeCloseTo(r.f2.exp, 0); expect(r.f2.y).toBeCloseTo(100, 0);   /* girada 90° */
  expect(r.bad).toContain('cruce(s) de ejes con el mismo nombre');
  expect(r.carry.ids).toBe('f1,f3,f4'); expect(r.carry.no).toBe('el eje ya no está|la columna ya no está'); expect(r.carry.x).toBe(0);
  expect(r.carry.sala).toEqual([50, -30]); expect(r.carry.de).toBe(1); expect(r.carry.nuevoId).toBe(true);
  expect(r.colOk).toBe(true);
  expect(r.ctn).toMatchObject({ de: 1, rev: 2 }); expect(r.ctn.a).toBeCloseTo(1, 1);   /* mismo tamaño real (el área se redondea a 0,01 m²) */
  expect(r.diff.k).toEqual(['area:a3:pend', 'del:a4:pend', 'new:ESTAR:pend', 'ren:a2:ok']); expect(r.diff.pend).toBe(3);
  expect(r.diff2.pend).toBe(0); expect(r.diff2.k).toEqual(['area:a3', 'ren:a2', 'same:a4']);
  expect(r.save).toEqual(['COCINA=a2', 'DORMITORIO=a3', 'ESTAR=a4', 'SALA=a1']);
  expect(r.otro).toBe(true);
  expect(r.umbral).toEqual([true, false, false, true]);   /* 3 % o 0,5 m², el mayor */
  expect(errors).toEqual([]);
});

test('etapa 3: una revisión nueva guarda lo de Alistar en el historial y lo pasa sola a la nueva; también un DXF que reemplaza a otro', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  const file = { name: '2459243-PTSA-XXX-P03-P2D-EST-E05-E03_ENCOFRADO TERCER PISO.dxf', mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) };
  await page.setInputFiles('#plfile', file);
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  /* la Rev. 1 alistada con correcciones, contorno, revisados y ambientes */
  await page.evaluate(async () => { const p = PLB.get('EST_E03'); const G = await plGeoGet(plSpecOf(p)); const R = dxfRoles(G, p.dxf.lay, p.dxf.mpp); const c = dxfCen(R.col[0].p);
    await fcol('plb').doc('EST_E03').update({ fix: { rev: 1, L: [{ id: 'f1', k: 'colDel', x: c.x, y: c.y, by: 'x', t: 1 }, { id: 'f2', k: 'colDel', x: 3, y: 3, by: 'x', t: 1 }] },
      ctn: { rev: 1, P: [10, 10, 500, 10, 500, 400, 10, 400], H: [], a: 1 }, alc: { rev: 1, chk: { enc: { t: 1 } } }, amb: { rev: 1, t: 1, L: [{ id: 'a1', n: 'SALA', a: 9, x: 20, y: 20 }] },
      ok: { rev: 1, t: 1, by: 'x', chk: { enc: { t: 1 } } } }); });
  await page.evaluate(() => { PQ.items.length = 0; plqDraw(true); });
  await page.setInputFiles('#plfile', file);
  await page.click('#plst0 [data-re="0"]');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await expect.poll(() => page.evaluate(() => { const d = window.__dbGet('plb', 'EST_E03'); return d.rev === 2 && !!d.fix; }), { timeout: 20_000 }).toBe(true);
  const r = await page.evaluate(() => { const d = window.__dbGet('plb', 'EST_E03'); const h = d.revs[0].h; return { h, rv: d.revs[0], H: h && window.__dbGet('plh', h), d }; });
  expect(r.rv.fix).toBeUndefined(); expect(r.rv.ok.chk).toBeUndefined(); expect(r.rv.ok.rev).toBe(1);   /* la ficha queda liviana */
  expect(r.H).toMatchObject({ plb: 'EST_E03', rev: 1, why: 'rev' }); expect(r.H.fix.L.length).toBe(2); expect(r.H.ctn.P.length).toBe(8); expect(r.H.alc.chk.enc).toBeTruthy(); expect(r.H.amb.L[0].id).toBe('a1'); expect(r.H.okChk.enc).toBeTruthy();
  expect(r.d.fix.rev).toBe(2); expect(r.d.fix.L.map(f => f.de.id)).toEqual(['f1']); expect(r.d.fix.de.no.length).toBe(1); expect(r.d.fix.de.rev).toBe(1);
  expect(r.d.ctn).toMatchObject({ rev: 2, de: 1 }); expect(r.d.amb).toMatchObject({ rev: 2, de: { rev: 1 } }); expect(r.d.amb.L[0].id).toBe('a1');
  expect(r.d.ok).toBeUndefined();   /* sigue «Por alistar» */
  /* la revisión anterior se sigue viendo con sus correcciones (desde el historial) */
  const old = await page.evaluate(async () => { const p = PLB.get('EST_E03'); plSpecOf(p, 1); await plHistGet(p.revs[0].h); const sp = plSpecOf(p, 1); return { n: sp.fix && sp.fix.L.length, hl: sp.hl }; });
  expect(old).toEqual({ n: 2, hl: false });
  /* Alistar muestra de dónde vino cada corrección y el contorno a confirmar */
  await page.click('#tabs [data-tab="pbib"]');
  await page.click('.plc[data-pl="EST_E03"]');
  await page.click('#plv [data-pv="alis"]');
  const panel = page.locator('.plalp');
  await expect(panel).toContainText('Viene de la Rev. 1');
  await panel.locator('.palfx summary').click();
  await expect(panel.locator('.palfx')).toContainText('de la Rev. 1');
  await expect(panel.locator('[data-pal="carry"]')).toHaveCount(0);   /* ya tiene lo suyo */
  /* un plano ya listo no recibe nada encima (quedaría «Listo» con correcciones que nadie revisó) */
  const listo = await page.evaluate(async () => { const X = firebase.firestore.FieldValue.delete(); await fcol('plb').doc('EST_E03').update({ fix: X, ctn: X, amb: X, ok: { rev: 2, t: 1, by: 'x' } });
    await new Promise(r => setTimeout(r, 50)); const r = await palCarry('EST_E03'); const d = window.__dbGet('plb', 'EST_E03'); return { skip: !!r.skip, fix: !!d.fix, btn: palCarryHtml(PLB.get('EST_E03'), true) }; });
  expect(listo).toEqual({ skip: true, fix: false, btn: '' });
  expect(errors).toEqual([]);
});

/* 17-11-2026, Alistar rápido (decidido con el dueño): la verificación no se rehace con cada toque ni cuando cambia otro plano; «Revisé lo demás»
   confirma de una vez lo ⚠ (menos datos del plano y contorno); «Siguiente» abre el próximo plano por alistar */
test('alistar rápido: sin recalcular en cada toque, «Revisé lo demás» y «Siguiente por alistar»', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  const f = c => ({ name: `2459243-PTSA-XXX-P03-P2D-EST-E05-${c}_ENCOFRADO TERCER PISO.dxf`, mimeType: 'application/dxf', buffer: Buffer.from(dxfDemo()) });
  await page.setInputFiles('#plfile', [f('E03'), f('E04')]);
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst1')).toContainText('Listo', { timeout: 120_000 });
  await page.click('#tabs [data-tab="pbib"]');
  await page.click('.plc[data-pl="EST_E03"]');
  await page.click('#plv [data-pv="alis"]');
  const panel = page.locator('.plalp');
  await expect(panel).toContainText('Alistar E03');
  await expect(panel.locator('[data-pal="next"]')).toContainText('Siguiente: E04');
  /* contar las verificaciones desde aquí */
  await page.evaluate(() => { window.__nChk = 0; const o = window.dxfCheck; window.dxfCheck = (...a) => { window.__nChk++; return o(...a); }; panel0 = document.querySelector('.plalp .plalh'); });
  await panel.locator('[data-pal="show:ej"]').click(); await panel.locator('[data-pal="show:ej"]').click();
  await page.evaluate(() => fcol('plb').doc('EST_E04').update({ tit: 'OTRO TÍTULO' }));
  await expect.poll(() => page.evaluate(() => PLB.get('EST_E04').tit)).toBe('OTRO TÍTULO');
  expect(await page.evaluate(() => ({ n: window.__nChk, mismo: document.querySelector('.plalp .plalh') === panel0, on: PAL.show.ej }))).toEqual({ n: 0, mismo: true, on: true });
  /* «Revisé lo demás»: todo lo ⚠ menos datos y contorno */
  await expect(panel.locator('[data-pal="chkall"]')).toBeVisible();
  await panel.locator('[data-pal="chkall"]').click();
  await expect.poll(() => page.evaluate(() => Object.keys((PLB.get('EST_E03').alc || {}).chk || {}).sort().join())).toBe('ejes,enc,escala,malla');
  expect(await page.evaluate(() => window.__nChk)).toBe(0);   /* guardar los revisados no cambia la verificación */
  await expect(panel.locator('[data-pal="chkall"]')).toHaveCount(0);
  /* siguiente por alistar */
  await panel.locator('[data-pal="next"]').click();
  await expect(panel).toContainText('Alistar E04');
  await expect(panel.locator('[data-pal="next"]')).toContainText('Siguiente: E03');
  expect(errors).toEqual([]);
});
