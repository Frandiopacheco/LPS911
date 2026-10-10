// Indicadores › Semanal en modo presentación (ind-presentacion.js): pantalla completa, solo el plan semanal congelado,
// filtro por piso y tres láminas.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const it = (sc, act, amb) => ({ sc, act, amb, code: 'A-1', sector: 'S1', days: [HOY] });
const W = (n, pisoId, items, res) => ['weeks', `${n}_${pisoId}`, { n, pisoId, frozenAt: '2026-09-26T18:00:00Z', items, res, snap: {} }];
const SEM = [
  W(57, 'p1', { a: it('c1', 'Redes', 'Dpto 101'), b: it('c2', 'Cableado', 'Dpto 101') }, { a: { ok: true }, b: { ok: false, cnc: 'Materiales' } }),
  W(58, 'p1', { a: it('c1', 'Redes', 'Dpto 101'), b: it('c1', 'Aparatos', 'Dpto 102'), c: it('c2', 'Cableado', 'Dpto 101'), d: it('c3', 'Tarrajeo', 'Dpto 103') },
    { a: { ok: true }, b: { ok: false, cnc: 'Materiales', note: 'No llegó la grifería' }, c: { ok: true } }),
  W(58, 'p2', { e: it('c3', 'Tarrajeo muros', 'Dpto 201') }, { e: { ok: true } }),
];

test('Presentar: pantalla completa con resumen, subcontratistas y causas del plan congelado', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const errors = await openApp(page, { tab: 'ind', extra: SEM });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; U.piso = ''; render(); });
  await page.locator('#bipr').click();
  const ipr = page.locator('#ipr');
  await expect(ipr).toBeVisible();
  // todos los pisos: 5 compromisos, 3 Sí → 60 %
  await expect(ipr.locator('.iprring b')).toHaveText('60%');
  await expect(ipr).toContainText('PPC por piso');
  await page.screenshot({ path: 'test-results/ipr-resumen.png' });
  await page.keyboard.press('ArrowRight');
  await expect(ipr).toContainText('PPC por subcontratista');
  await expect(ipr.locator('.iprb').first()).toContainText('100%');
  await page.screenshot({ path: 'test-results/ipr-sc.png' });
  await page.keyboard.press('ArrowRight');
  await expect(ipr).toContainText('No llegó la grifería');
  await page.screenshot({ path: 'test-results/ipr-causas.png' });
  // filtro por piso: P1 → 4 compromisos, 2 Sí → 50 %
  await ipr.locator('[data-pg="0"]').click();
  await ipr.locator('#iprpiso').selectOption('p1');
  await expect(ipr.locator('.iprring b')).toHaveText('50%');
  await expect(ipr).not.toContainText('PPC por piso');
  // semana anterior y vuelta
  await ipr.locator('[data-ip="wp"]').click();
  await expect(ipr.locator('.iprring b')).toHaveText('50%');
  await expect(ipr).toContainText('Semana 57');
  await page.keyboard.press('Escape');
  await expect(ipr).toHaveCount(0);
  await expect(page.locator('#main')).toContainText('Cumplimiento del plan semanal por subcontratista');
  noErrors(errors, 'presentación de indicadores');
});

test('Presentar en modo oscuro y sin semana congelada', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors = await openApp(page, { tab: 'ind', theme: 'dark', extra: SEM });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; U.piso = ''; render(); });
  await page.locator('#bipr').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/ipr-oscuro.png' });
  await page.locator('#ipr [data-ip="wn"]').click();
  await expect(page.locator('#ipr')).toContainText('no está congelada');
  noErrors(errors, 'presentación vacía');
});
