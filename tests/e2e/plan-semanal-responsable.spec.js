// Plan semanal: evalúa el responsable del piso (o el admin); Hoy avisa de semanas terminadas sin evaluar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const items = { x1: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Prueba', days: [HOY], ord: 1 } };
const X = ['acts', 'x1', { ambId: 'a1', sc: 'c1', name: 'Prueba', days: [HOY], order: 40 }];

test('un editor que no es responsable del piso no evalúa; el responsable sí', async ({ browser }) => {
  for (const [as, puede] of [['jefe', false], ['editor', true]]) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const errors = await openApp(page, { as, tab: 'plan', extra: [X, ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {} }]] });
    const si = page.locator('section[data-pid="p1"] tr[data-id="x1"] [data-yn="1"]');
    if (puede) { await expect(si).toBeEnabled(); await si.click(); await expect.poll(() => page.evaluate(() => ((window.__dbGet('weeks', '58_p1').res || {}).x1 || {}).ok)).toBe(true); }
    else { await expect(si).toBeDisabled(); await expect(page.locator('section[data-pid="p1"] .pill', { hasText: 'Evalúa' })).toContainText('Elena Editora'); }
    noErrors(errors, as); await ctx.close();
  }
});

test('Hoy avisa al responsable de las semanas terminadas sin evaluar y lleva a esa semana', async ({ page }) => {
  const W57 = ['weeks', '57_p1', { n: 57, pisoId: 'p1', frozenAt: '2026-09-21T08:00:00.000Z', items, res: {}, snap: {} }];
  const errors = await openApp(page, { tab: 'hoy', extra: [X, W57] });
  const card = page.locator('[data-hoy="peval"]');
  await expect(card).toContainText('Semana 57');
  await expect(card).toContainText('1 de 1 compromisos sin evaluar');
  await card.locator('[data-hgo]').click();
  await expect.poll(() => page.evaluate(() => [U.tab, U.week])).toEqual(['plan', 57]);
  noErrors(errors, 'hoy peval');
});
