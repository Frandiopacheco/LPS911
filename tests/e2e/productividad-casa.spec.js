// Productividad F2 (productividad-casa.js): IP de casa = ratio presupuestado ÷ ratio real, con HH del tareo publicado.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const extra = [
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm²', met: 1000, hhp: 1100, act: true, ord: 1 }],
  ['tpc', 'p20_03', { cod: '20.03', grp: '20', grpN: 'ARQUITECTURA', nom: 'Tarrajeo interior', und: 'm²', met: 500, hhp: 400, act: true, ord: 2 }],
  ['hhpc', '2026-09-29', { fecha: '2026-09-29', v: 1, hh: 140, pcs: { p10_05: { hh: 110 }, p20_03: { hh: 30 } } }],
  ['hhpc', '2026-09-30', { fecha: '2026-09-30', v: 1, hh: 110, pcs: { p10_05: { hh: 110 } } }],
  ['pmet', '2026-09-29_p10_05_p1_-', { pc: 'p10_05', d: '2026-09-29', piso: 'p1', zona: '', q: 100, by: 'campo@obra.pe', ts: 1 }],
  ['pmet', '2026-09-30_p10_05_p1_-', { pc: 'p10_05', d: '2026-09-30', piso: 'p1', zona: '', q: 80, by: 'campo@obra.pe', ts: 1 }],
  ['pmet', '2026-09-30_p10_05_p2_-', { pc: 'p10_05', d: '2026-09-30', piso: 'p2', zona: '', q: 20, by: 'campo@obra.pe', ts: 1 }],
  ['pmet', '2026-09-30_p10_05_p2_x', { pc: 'p10_05', d: '2026-09-30', piso: 'p2', zona: '', q: 500, by: 'campo@obra.pe', ts: 1, arch: { t: 1 } }],
];
const st = (page, id) => page.evaluate(i => { const x = pcTpc().get(i); const s = pcStats(x); return { ...s, byP: Object.fromEntries(s.byP), W: null, ipw: null }; }, id);

test('Casa: IP por partida con HH publicadas y metrado por piso; registro diario', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page, { as: 'campo', extra });
  await page.evaluate(() => { U.piso = ''; U.pvV = 'casa'; goTab('prod'); });
  await expect(page.locator('tr[data-pcs="p10_05"]')).toHaveCount(1);
  let s = await st(page, 'p10_05');
  expect([s.eje, s.ejeC, s.hh]).toEqual([200, 200, 220]);   // el archivado no suma
  expect(s.rp).toBeCloseTo(1.1); expect(s.rr).toBeCloseTo(1.1); expect(s.ip).toBeCloseTo(1.0);
  expect(s.byP).toEqual({ p1: 180, p2: 20 });
  expect(s.proj).toBeCloseTo(220 + 800 * 1.1); // HH gastadas + saldo × ratio real
  // HH sin metrado: el tarrajeo tiene HH publicadas y ningún metrado
  const t2 = await st(page, 'p20_03'); expect(t2.hhSinMet).toBe(true); expect(t2.ip).toBe(null);
  await expect(page.locator('tr[data-pcs="p20_03"]')).toContainText('sin metrado');
  // registro del día (aún sin HH publicadas): se guarda igual; no cambia el IP, sí el avance
  await page.locator('button[data-pc="reg"]').click();
  await expect(page.locator('.pchh')).toContainText('por publicar');
  const inp = page.locator('input[data-pcq="p10_05"][data-piso="p2"]');
  await inp.fill('50'); await inp.press('Tab');
  await expect.poll(() => page.evaluate(h => window.__dbGet('pmet', h + '_p10_05_p2_-'), HOY)).toMatchObject({ pc: 'p10_05', piso: 'p2', q: 50, by: 'campo@obra.pe' });
  s = await st(page, 'p10_05');
  expect([s.eje, s.ejeC]).toEqual([250, 200]); expect(s.ip).toBeCloseTo(1.0);
  // vaciar la casilla quita el metrado (se archiva, no se borra)
  await inp.fill(''); await inp.press('Tab');
  await expect.poll(() => page.evaluate(h => !!(window.__dbGet('pmet', h + '_p10_05_p2_-') || {}).arch, HOY)).toBe(true);
  // detalle por sector: se agrega con piso obligatorio
  await page.locator('button[data-pc="det"][data-id="p10_05"]').click();
  const sh = page.locator('#pvsheet');
  await sh.locator('[data-pd="q"]').fill('12'); await sh.locator('[data-pd="ok"]').click();
  await expect(sh).toBeVisible();
  await sh.locator('[data-pd="piso"]').selectOption('p1'); await sh.locator('[data-pd="zona"]').selectOption('s1');
  await sh.locator('[data-pd="q"]').fill('12'); await sh.locator('[data-pd="ok"]').click();
  await expect.poll(() => page.evaluate(h => window.__dbGet('pmet', h + '_p10_05_p1_s1'), HOY)).toMatchObject({ q: 12, zona: 's1' });
  noErrors(errors, 'casa');
});

test('Casa: el SC y el lector no la ven', async ({ page }) => {
  for (const as of ['sc', 'lector']) {
    const errors = await openApp(page, { as, extra });
    await page.evaluate(() => { U.pvV = 'casa'; goTab('prod'); });
    await expect(page.locator('[data-pvv="casa"]')).toHaveCount(0);
    await expect(page.locator('tr[data-pcs]')).toHaveCount(0);
    noErrors(errors, 'casa ' + as);
  }
});
