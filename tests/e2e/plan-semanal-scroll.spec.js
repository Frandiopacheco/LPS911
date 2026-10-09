// Plan semanal: marcar Sí/No no debe mover la página (antes saltaba al final por el alto estimado de los pisos).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const N = 160;
const EXTRA = []; const items = {};
for (let i = 0; i < N; i++) {
  EXTRA.push(['acts', 'q' + i, { ambId: i % 2 ? 'a1' : 'a2', sc: 'c' + (1 + (i % 3)), name: 'Actividad ' + i, und: 'm2', metrado: 10, days: [HOY], order: 100 + i }]);
  items['q' + i] = { sc: 'c' + (1 + (i % 3)), sector: 'S1', code: i % 2 ? 'A-1' : 'A-2', amb: 'Dpto', act: 'Actividad ' + i, days: [HOY], ord: i };
}
EXTRA.push(['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {} }]);

test('marcar Sí en medio de la lista deja la fila en el mismo lugar', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 800 });
  const errors = await openApp(page, { tab: 'plan', extra: EXTRA });
  const row = page.locator('section[data-pid="p1"] tr[data-id="q90"]');
  await row.scrollIntoViewIfNeeded();
  await page.evaluate(() => { const sc = document.querySelector('#main .scroll') || document.querySelector('.scroll'); sc.scrollTop += 0; });
  const y0 = (await row.boundingBox()).y;
  await row.locator('[data-yn="1"]').click();
  await expect.poll(() => page.evaluate(() => ((window.__dbGet('weeks', '58_p1').res || {}).q90 || {}).ok)).toBe(true);
  await page.waitForTimeout(300);
  const y1 = (await page.locator('section[data-pid="p1"] tr[data-id="q90"]').boundingBox()).y;
  expect(Math.abs(y1 - y0)).toBeLessThan(40);
  noErrors(errors, 'plan scroll');
});

test('un cambio de otro usuario (redibujo sin tocar nada) tampoco mueve la página', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 800 });
  const errors = await openApp(page, { tab: 'plan', extra: EXTRA });
  const row = page.locator('section[data-pid="p1"] tr[data-id="q120"]');
  await row.scrollIntoViewIfNeeded();
  const y0 = (await row.boundingBox()).y;
  await page.evaluate(() => render());
  await page.waitForTimeout(300);
  const y1 = (await page.locator('section[data-pid="p1"] tr[data-id="q120"]').boundingBox()).y;
  expect(Math.abs(y1 - y0)).toBeLessThan(40);
  noErrors(errors, 'plan scroll remoto');
});
