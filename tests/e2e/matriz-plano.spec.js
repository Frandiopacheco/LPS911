// Matriz › Plano: resalta en la lámina los ambientes con la actividad Pendiente (rojo) o En curso (ámbar); toda la partida; solo lectura.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Segunda mano', sc: 'c3', cl: 't', al: ['segunda mano'], ord: 10 }],
  ['mcat', 'k2', { name: 'Lijado', sc: 'c3', cl: 't', al: ['lijado'], ord: 20 }],
  ['mamb', 'a1', { c: { k1: 'p', k2: 't' }, by: 'x', t: 1 }],
  ['mamb', 'a2', { c: { k1: 'c' }, by: 'x', t: 1 }],
  ['mamb', 'a3', { c: { k1: 't', k2: 'p' }, by: 'x', t: 1 }],
];
const state = page => page.evaluate(() => { const m = mxPlState(U.piso, U.mxPlSc, U.mxPlCat); return Object.fromEntries([...m.values()].map(o => [o.a.id, o.k])); });

test('una actividad: pendiente y en curso; toda la partida suma las actividades del SC; la Matriz no cambia', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  const before = await page.evaluate(() => JSON.stringify(window.__dbAll('mamb')));
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'pla'; U.mxPlSc = 'c3'; U.mxPlCat = 'k1'; render(); });
  await expect(page.locator('#mxplf')).toBeVisible();
  expect(await state(page)).toEqual({ a1: 'p', a2: 'c' });
  await expect(page.locator('#mxpls')).toContainText('1 pendiente');
  await expect(page.locator('#mxpls [data-mxpla="a1"]')).toBeVisible();
  await page.click('[data-mxplmode="all"]');
  await page.evaluate(() => { U.piso = 'p2'; render(); });
  expect(await state(page)).toEqual({ a3: 'p' }); // a3: Segunda mano terminada pero Lijado pendiente
  await page.click('[data-mxplmode="one"]');
  expect(await state(page)).toEqual({ a3: '' });
  expect(await page.evaluate(() => JSON.stringify(window.__dbAll('mamb')))).toBe(before);
  noErrors(errors, 'plano de la matriz');
});
