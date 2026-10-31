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
