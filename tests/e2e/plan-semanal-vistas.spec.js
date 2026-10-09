// Plan semanal: vista por subcontratista / por ambiente y buscador. Solo cambian la presentación: marcar el cumplimiento
// funciona en las dos vistas y con la búsqueda activa, sin tocar los compromisos congelados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const X = { und: 'm2', metrado: 10, days: [HOY], order: 40 };
const items = {
  x1: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Prueba sanitaria', days: [HOY], ord: 1 },
  x2: { sc: 'c2', sector: 'S1', code: 'A-2', amb: 'Dpto 102', act: 'Prueba eléctrica', days: [HOY], ord: 2 },
};
const EXTRA = [
  ['acts', 'x1', { ...X, ambId: 'a1', sc: 'c1', name: 'Prueba sanitaria' }],
  ['acts', 'x2', { ...X, ambId: 'a2', sc: 'c2', name: 'Prueba eléctrica' }],
  ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {} }],
];
const sec = page => page.locator('section[data-pid="p1"]');

test('Plan semanal: por ambiente + buscador, y se marca el cumplimiento sin tocar lo congelado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: EXTRA });
  await expect(page.locator('#plv')).toBeVisible();
  await page.locator('#plv [data-v="amb"]').click();
  await expect(sec(page).locator('tr.plamb', { hasText: 'Dpto 102' })).toBeVisible();
  // buscar sin tildes encuentra «eléctrica» y oculta lo demás
  await page.fill('#plq', 'electrica');
  await expect(sec(page).locator('tr[data-id="x1"]')).toBeHidden();
  await expect(sec(page).locator('tr.plamb', { hasText: 'Dpto 101' })).toBeHidden();
  await expect(page.locator('#plqn')).toHaveText('1 de 2 compromisos');
  await sec(page).locator('tr[data-id="x2"] [data-yn="1"]').click();
  await expect.poll(() => page.evaluate(() => ((window.__dbGet('weeks', '58_p1').res || {}).x2 || {}).ok)).toBe(true);
  // la búsqueda sigue tras redibujar y la vista se recuerda
  await expect(page.locator('#plq')).toHaveValue('electrica');
  await expect(sec(page).locator('tr[data-id="x1"]')).toBeHidden();
  expect(await page.evaluate(() => U.planV)).toBe('amb');
  const w = await page.evaluate(() => window.__dbGet('weeks', '58_p1'));
  expect(w.items).toEqual(items);
  expect(w.frozenAt).toBe('2026-09-28T08:00:00.000Z');
  // vuelta a la vista por subcontratista
  await page.fill('#plq', '');
  await page.locator('#plv [data-v="sc"]').click();
  await expect(sec(page).locator('tr[data-id="x1"]')).toBeVisible();
  await expect(sec(page).locator('tr.plamb')).toHaveCount(0);
  noErrors(errors, 'vistas');
});
