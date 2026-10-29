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
