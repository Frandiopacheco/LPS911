// Casco › Plano vectorial (DXF) de la planta (casco-dxf.js, fase 1): lector, alineación con la lámina y caras para pegarse al trazar vigas.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

/* DXF de prueba con la planta del techo 3 de casco-vigas.spec.js (1 px de lámina = 1 cm): ejes A–E cada 4 m (x = 2…18 m) y 1–3 cada 4 m.
   Como en un DXF real: y hacia arriba (eje 1 en y = 17), ejes dentro de un bloque (insertado en 1,1) con su burbuja (círculo + nombre),
   $INSUNITS equivocado (pulgadas), columnas en el eje 2 (A de 0.50 excéntrica, B–E de 0.40), un cuadradito de 0.25 que se ignora,
   caras de la viga del eje 2 (0.30), un rótulo de sección y un detalle fuera de los ejes. k: unidades por metro (100 = centímetros). */
function dxfDemo(k = 1) {
  const o = [];const P = (c, v) => o.push(String(c), String(v));const n = v => Math.round(v * k * 1e6) / 1e6;
  const ent = (t, l, f) => { P(0, t); P(8, l); f(); };
  const line = (l, x1, y1, x2, y2) => ent('LINE', l, () => { P(10, n(x1)); P(20, n(y1)); P(11, n(x2)); P(21, n(y2)); });
  const poly = (l, pts, cl = true) => ent('LWPOLYLINE', l, () => { P(90, pts.length); P(70, cl ? 1 : 0); pts.forEach(([x, y]) => { P(10, n(x)); P(20, n(y)); }); });
  const rect = (l, x0, y0, x1, y1) => poly(l, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const text = (l, s, x, y, h = 0.25) => ent('TEXT', l, () => { P(10, n(x)); P(20, n(y)); P(40, n(h)); P(1, s); P(72, 1); P(11, n(x)); P(21, n(y)); P(73, 2); });
  const circ = (l, x, y, r) => ent('CIRCLE', l, () => { P(10, n(x)); P(20, n(y)); P(40, n(r)); });
  P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$ACADVER'); P(1, 'AC1032'); P(9, '$INSUNITS'); P(70, 1); P(0, 'ENDSEC');
  /* bloque de ejes: todo corrido (−1, −1); el INSERT en (1, 1) lo devuelve a su sitio */
  P(0, 'SECTION'); P(2, 'BLOCKS'); P(0, 'BLOCK'); P(8, '0'); P(2, 'EJES'); P(70, 0); P(10, 0); P(20, 0);
  const b = (x) => x - 1;
  [['A', 2], ['B', 6], ['C', 10], ['D', 14], ['E', 18]].forEach(([nm, x]) => { line('0', b(x), b(8.5), b(x), b(17.5)); circ('0', b(x), b(18), 0.4); text('0', nm, b(x), b(18)); });
  [['1', 17], ['2', 13], ['3', 9]].forEach(([nm, y]) => { line('0', b(1.5), b(y), b(18.5), b(y)); circ('0', b(1), b(y), 0.4); text('0', nm, b(1), b(y)); });
  P(0, 'ENDBLK'); P(8, '0'); P(0, 'ENDSEC');
  P(0, 'SECTION'); P(2, 'ENTITIES');
  ent('INSERT', 'EST-EJES', () => { P(2, 'EJES'); P(10, n(1)); P(20, n(1)); });
  rect('EST-COLUMNAS', 1.95, 12.8, 2.45, 13.2);
  [6, 10, 14, 18].forEach(x => rect('EST-COLUMNAS', x - 0.2, 12.8, x + 0.2, 13.2));
  rect('EST-COLUMNAS', 3.9, 12.9, 4.15, 13.15); /* cuadradito de 0.25: se ignora */
  rect('EST-COLUMNAS', 60, 60, 60.5, 60.5); /* detalle fuera de los ejes */
  line('EST-TRAZO', 2.45, 12.85, 17.8, 12.85); line('EST-TRAZO', 2.45, 13.15, 17.8, 13.15);
  text('EST-TEXTOS', '(.30x.60)', 4, 13.0); text('EST-TEXTOS', '3/8"%%C@.20', 8, 12);
  P(0, 'ENDSEC'); P(0, 'EOF');
  return o.join('\n') + '\n';
}

test('casco: DXF: el lector saca los ejes con su nombre, columnas, caras y rótulos dentro de los ejes, en metros (también si está en cm)', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const errors = await openApp(page, { as: 'admin' });
  const r = await page.evaluate(([m, cm]) => {
    const go = t => { const F = dxfFlat(dxfParse(t)); const map = dxfGuess(dxfLayers(F)); return { map, X: dxfExtract(F, map, 0) }; };
    const a = go(m), b = go(cm);
    return { map: a.map, k: [a.X.k, b.X.k], cnt: a.X.cnt, ej: a.X.ej, ejCm: b.X.ej, col: a.X.col.map(c => c.p), nln: a.X.ln.length / 4, tx: a.X.tx, txt: dxfTxt('{\\H0.9x;3/8"%%C@.20}\\P2') };
  }, [dxfDemo(1), dxfDemo(100)]);
  expect(r.map).toEqual({ ej: 'EST-EJES', col: 'EST-COLUMNAS', vig: ['EST-TRAZO'], tx: 'EST-TEXTOS' });
  expect(r.k).toEqual([1, 0.01]); /* por la separación de los ejes, no por $INSUNITS */
  expect(r.ej.map(e => e.n)).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']);
  /* origen en la esquina de los ejes menos 1.5 m (arriba: y = 17.5 + 1.5); y hacia abajo: el eje 1 (y = 17) queda en 2 */
  expect(r.ej.find(e => e.n === 'A').p).toEqual([2, 10.5, 2, 1.5]);
  expect(r.ej.find(e => e.n === '1').p).toEqual([1.5, 2, 18.5, 2]);
  expect(r.ejCm).toEqual(r.ej);
  expect(r.cnt).toMatchObject({ ej: 8, col: 5, chico: 1, ln: 2, tx: 1 }); /* el detalle de afuera y el cuadradito no entran */
  expect(r.col[0]).toEqual([1.95, 6.2, 2.45, 6.2, 2.45, 5.8, 1.95, 5.8]);
  expect(r.tx).toEqual([{ t: '(.30x.60)', x: 4, y: 6, r: 0 }]);
  expect(r.txt).toBe('3/8"Ø@.20 2');
  expect(errors).toEqual([]);
});

async function nivel(page, ejes) {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const errors = await openApp(page, { as: 'admin', extra: [['plb', 'EST_E03', { cod: 'E-03', disc: 'EST', niv: 'P3', tit: 'Encofrado', tipo: 'Planta', rev: 1, base: 'planos/E-03/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], revs: [], cal: { mpp: 0.005, rev: 1 } }]] });
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="demo"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size), { timeout: 20000 }).toBeGreaterThan(200);
  await page.evaluate(async ejes => {
    await fcol('laminas').doc('lamT3').set({ pisoId: 'n3', base: true, esp: 'Estructuras', name: 'Encofrado', w: 2000, h: 1500, lw: 1000, lh: 750, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'EST_E03', cod: 'EST_E03', disc: 'EST', rev: 1, mpp: 0.01 }, order: 1, ts: 1, ejes });
  }, ejes);
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamT3')))).toBe(true);
  await page.evaluate(() => { const A = [...S.amb.values()].filter(a => a.sectorId === 'n3-e').sort(byOrder); const X = [[150, 780], [780, 1450], [1450, 1850]];
    const ops = A.slice(0, 3).map((a, i) => { const [x0, x1] = X[i]; const o = op('ambientes', a.id, { ...a, geo: { lamT3: [x0, 250, x1, 250, x1, 1150, x0, 1150] } }); delete o.after.id; return o; }); apply(ops, 'test');
    U.tab = 'planos'; U.csSzV = 'niv'; CSZ.fg = 'E'; CNV.pid = 'n3'; render(); });
  await expect(page.locator('#csszside [data-dxfa="load"]')).toBeVisible({ timeout: 15000 });
  return errors;
}
async function subir(page, txt) {
  const fc = page.waitForEvent('filechooser');
  await page.locator('#csszside [data-dxfa="load"]').click();
  await (await fc).setFiles({ name: 'E-03 encofrado.dxf', mimeType: 'application/dxf', buffer: Buffer.from(txt) });
  await expect(page.locator('#lqm')).toContainText('Encontré');
}
const scrOf = page => (x, y) => page.evaluate(([x, y]) => { const h = document.getElementById('csszmap'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);

test('casco: DXF: se alinea solo con los ejes trazados, da la escala y los ejes, se dibuja encima y las caras de la viga se pegan a las columnas', async ({ page }) => {
  /* ejes trazados a mano con los mismos nombres (un poco corridos, como a mano) */
  const ejes = [['A', 201], ['B', 599], ['C', 1000], ['D', 1402], ['E', 1800]].map(([n, x]) => ({ n, p: [x, 250, x, 1150] })).concat([['1', 300], ['2', 701], ['3', 1100]].map(([n, y]) => ({ n, p: [150, y, 1850, y] })));
  const errors = await nivel(page, ejes);
  await subir(page, dxfDemo(1));
  await expect(page.locator('#lqm')).toContainText('5 columnas');
  await expect(page.locator('#lqm')).toContainText('Se ignoran 1 figura');
  await page.locator('#lqm [data-dxfa="use"]').click();
  await expect.poll(() => page.evaluate(() => !!(window.__dbGet('cs_laminas', 'lamT3') || {}).dxf)).toBe(true);
  const d = await page.evaluate(() => { const l = window.__dbGet('cs_laminas', 'lamT3'); return { T: l.dxf.T, al: l.dxf.al, ej: l.ejes, sc: csScale(window.__plano.LAM.get('lamT3')), lay: l.dxf.lay, n: l.dxf.n }; });
  expect(d.T.a).toBeCloseTo(100, 0); expect(d.T.b).toBeCloseTo(0, 2); expect(d.T.e).toBeCloseTo(0, 0); expect(d.T.f).toBeCloseTo(100, 0);
  expect(d.al).toMatchObject({ m: 'ejes', n: 15 }); expect(d.al.res).toBeLessThan(0.02);
  expect(d.sc.st).toBe('dxf'); expect(d.sc.mpp).toBeCloseTo(0.01, 4);
  expect(d.ej.map(e => e.n)).toEqual(['A', 'B', 'C', 'D', 'E', '1', '2', '3']);
  expect(d.ej[1].p[0]).toBeCloseTo(600, 0); /* el eje B corrido a mano queda donde dice el DXF */
  expect(d.n).toBe('E-03 encofrado.dxf');
  await expect(page.locator('#csszside')).toContainText('Plano vectorial (DXF)');
  await expect(page.locator('#csszside')).toContainText('con 15 cruces de tus ejes');
  await expect(page.locator('#csszsc')).toContainText('Escala exacta del DXF');
  await expect(page.locator('#csszmap svg path')).toHaveCount(2);
  /* «DXF» apagado: no se dibuja */
  await page.locator('[data-csz2="dxf"]').uncheck();
  await expect(page.locator('#csszmap svg path')).toHaveCount(0);
  await page.locator('[data-csz2="dxf"]').check();
  await expect(page.locator('#csszmap svg path')).toHaveCount(2);

  /* viga del eje 2: las caras se tocan 2 cm adentro y se pegan a las de las columnas del DXF */
  const scr = scrOf(page);
  const tap = async (x, y) => { const q = await scr(x, y); await page.mouse.click(q.x, q.y); };
  await page.locator('[data-cnvt="viga"]').click();
  await tap(205, 696); await tap(1797, 703);
  await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje A');
  await tap(197, 700); await tap(243, 700);
  for (const x of [600, 1000, 1400, 1800]) { await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje'); await tap(x - 18, 700); await tap(x + 18, 700); }
  await expect.poll(() => page.evaluate(() => (kvVigas('n3').find(v => v.pl) || {}).cod)).toBe('V-2');
  const V = await page.evaluate(() => kvVigas('n3').find(v => v.pl));
  expect(V.ejes.map(e => [e.n, e.w, e.d])).toEqual([['A', '0.50', '4.00'], ['B', '0.40', '4.00'], ['C', '0.40', '4.00'], ['D', '0.40', '4.00'], ['E', '0.40', '']]);
  expect(V.ejes[0].o).toBe('0.2');
  expect(errors).toEqual([]);
});

test('casco: DXF: sin ejes trazados se alinea con dos toques en dos cruces y los ejes salen del DXF', async ({ page }) => {
  const errors = await nivel(page, []);
  await subir(page, dxfDemo(100));
  await page.locator('#lqm [data-dxfa="use"]').click();
  await expect(page.locator('#csszhint')).toContainText('cruce de los ejes A y 1');
  const scr = scrOf(page);
  const tap = async (x, y) => { const q = await scr(x, y); await page.mouse.click(q.x, q.y); };
  await tap(200, 300);
  await expect(page.locator('#csszhint')).toContainText('cruce de los ejes E y 3');
  await tap(1800, 1100);
  await expect.poll(() => page.evaluate(() => !!(window.__dbGet('cs_laminas', 'lamT3') || {}).dxf)).toBe(true);
  const d = await page.evaluate(() => { const l = window.__dbGet('cs_laminas', 'lamT3'); return { T: l.dxf.T, al: l.dxf.al, k: l.dxf.k, ej: l.ejes.map(e => [e.n, e.p.map(v => Math.round(v))]) }; });
  expect(d.k).toBe(0.01);
  expect(d.al).toMatchObject({ m: '2p', n: 2, c: ['A-1', 'E-3'] });
  expect(Math.hypot(d.T.a, d.T.b)).toBeCloseTo(100, -0.5);
  expect(d.ej.find(e => e[0] === 'C')[1][0]).toBeGreaterThan(995); expect(d.ej.find(e => e[0] === 'C')[1][0]).toBeLessThan(1005);
  expect(d.ej.find(e => e[0] === '2')[1][1]).toBeGreaterThan(695); expect(d.ej.find(e => e[0] === '2')[1][1]).toBeLessThan(705);
  await expect(page.locator('#csszside')).toContainText('con dos cruces (A-1 y E-3)');
  /* Quitar: vuelve la escala de Planos y los ejes se quedan */
  page.once('dialog', dl => dl.accept());
  await page.locator('#csszside [data-dxfa="del"]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('cs_laminas', 'lamT3') || {}).dxf)).toBeNull();
  expect(await page.evaluate(() => csScale(window.__plano.LAM.get('lamT3')).st)).toBe('cal');
  expect(await page.evaluate(() => window.__dbGet('cs_laminas', 'lamT3').ejes.length)).toBe(8);
  expect(errors).toEqual([]);
});
