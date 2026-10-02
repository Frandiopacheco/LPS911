// Lookahead: una actividad marcada terminada (quizás por error) no debe impedir seguir programándola.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const AYER = '2026-09-30';
const TERMINADA = ['daily', AYER + '_p1', { date: AYER, pisoId: 'p1', recs: { e0: { status: 'ok', done: true, sc: 'c2', nm: 'Entubado empotrado', ambId: 'a1', by: 'campo@obra.pe', ts: 1 } }, extra: {} }];

test('tocar un día liberado ofrece reabrir la actividad', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'look', extra: [TERMINADA] });
  const lib = page.locator('tr[data-a="e0"] td.d.lib');
  await expect(lib.first()).toBeVisible();
  await lib.first().click();
  await expect(page.locator('tr[data-a="e0"] td.d.lib')).toHaveCount(0);
  expect(await page.evaluate(d => window.__dbGet('daily', d + '_p1').recs.e0.done, AYER)).toBe(false);
  noErrors(errors, 'reabrir');
});

test('programar un día después de la fecha de terminada la reabre sola', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [TERMINADA] });
  const d = await page.evaluate(h => wshift(h, 3), HOY);
  await page.locator(`tr[data-a="e0"] td.d[data-d="${d}"]`).click();
  await expect.poll(() => page.evaluate(id => window.__dbGet('acts', id).days, 'e0')).toContain(d);
  await expect(page.locator('tr[data-a="e0"] td.d.lib')).toHaveCount(0);
  noErrors(errors, 'reabrir pintando');
});
