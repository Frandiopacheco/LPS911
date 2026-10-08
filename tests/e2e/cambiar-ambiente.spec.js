// Lookahead: cambiar actividades de ambiente (mismo piso) y filtros por SC uniformes (clic = uno, Ctrl+clic = sumar).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('cambiar de ambiente: pasa con sus días al final del destino, solo dentro del piso; se deshace', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const r = await page.evaluate(() => {
    const d0 = S.act.get('i0').days.slice();
    const n = ambMoveTo(['i0', 'e0'], 'a2');
    const i0 = S.act.get('i0'), e0 = S.act.get('e0');
    const maxA2 = Math.max(...[...S.act.values()].filter(x => x.ambId === 'a2' && !['i0', 'e0'].includes(x.id)).map(x => x.order));
    const otro = ambMoveTo(['i1'], 'a3'); // a3 es de otro piso
    return { n, amb: [i0.ambId, e0.ambId], days: JSON.stringify(i0.days) === JSON.stringify(d0), after: i0.order > maxA2 && e0.order > i0.order, otro };
  });
  expect(r).toEqual({ n: 2, amb: ['a2', 'a2'], days: true, after: true, otro: 0 });
  await page.evaluate(() => undo());
  expect(await page.evaluate(() => S.act.get('i0').ambId)).toBe('a1');
  // desde el menú de la actividad
  await page.locator('[data-actmenu="t0"]').click();
  await expect(page.locator('#pop [data-do="amb"]')).toBeVisible();
  noErrors(errors, 'cambiar ambiente');
});

test('el SC (modo propuesta) no ve «Cambiar de ambiente»', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  expect(await page.evaluate(() => canAmbMove())).toBe(false);
  noErrors(errors, 'sc sin cambiar ambiente');
});

test('Tablero: clic elige un solo SC; Ctrl+clic suma', async ({ page }) => {
  const errors = await openApp(page, { tab: 'dash', editar: false });
  const chips = page.locator('[data-dsc]:not([data-dsc=""])');
  await expect(chips.first()).toBeVisible();
  const a = await chips.nth(0).getAttribute('data-dsc'), b = await chips.nth(1).getAttribute('data-dsc');
  await page.locator(`[data-dsc="${a}"]`).click();
  await page.locator(`[data-dsc="${b}"]`).click();
  expect(await page.evaluate(() => [...DB_.sc])).toEqual([b]);
  await page.locator(`[data-dsc="${a}"]`).click({ modifiers: ['Control'] });
  expect((await page.evaluate(() => [...DB_.sc])).sort()).toEqual([a, b].sort());
  noErrors(errors, 'tablero filtro sc');
});
