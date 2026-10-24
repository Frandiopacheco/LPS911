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
  /* tanda 1: el registro de ayer ya está cerrado (Cierre del ingeniero): no se reescribe; la reapertura queda en doneidx (r) */
  expect(await page.evaluate(d => window.__dbGet('daily', d + '_p1').recs.e0.done, AYER)).toBe(true);
  expect(await page.evaluate(() => (window.__dbGet('doneidx', 'p1') || {}).r || {})).toMatchObject({ e0: AYER });
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

test('tanda 1: el «Terminada» que marcó el capataz/SC ya no termina la actividad (solo la del ingeniero)', async ({ page }) => {
  const LV = ['live', AYER + '_e0', { date: AYER, actId: 'e0', pisoId: 'p1', sc: 'c2', st: 'stop', close: { done: true, status: 'ok', by: 'u_cap', ts: 1 }, log: [] }];
  const errors = await openApp(page, { tab: 'look', extra: [LV] });
  await expect(page.locator('tr[data-a="e0"]')).toBeVisible();
  await expect(page.locator('tr[data-a="e0"] td.d.lib')).toHaveCount(0);
  expect(await page.evaluate(() => { doneRebuild(); return [DONE.has('e0'), doneDates('e0')]; })).toEqual([false, []]);
  // su cierre sí cuenta como Cumplido del día (sin terminada; lo marcado queda en prop.done)
  expect(await page.evaluate(d => { const r = recOf(d, 'e0'); return [r.status, r.done, r.prop.done]; }, AYER)).toEqual(['ok', false, true]);
  noErrors(errors, 'terminada del capataz');
});
