// Catálogo › «Separar por subcontratista» (19/10): una actividad que hacen varios SC por su cuenta pasa a una por SC.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const X = [
  ['mcat', 'kl', { name: 'Limpieza', sc: 'c1', scs: ['c3'], cl: 't', al: ['limpieza'], ord: 50, tr: 7 }],
  ['acts', 'l1', { ambId: 'a1', sc: 'c1', name: 'Limpieza', und: 'glb', days: [], order: 50 }],
  ['acts', 'l2', { ambId: 'a2', sc: 'c3', name: 'Limpieza', und: 'glb', days: [], order: 50 }],
  ['acts', 'l3', { ambId: 'a3', sc: 'c3', name: 'Limpieza', und: 'glb', days: [], order: 50 }],
  ['mamb', 'a1', { c: { kl: 'p' }, by: 'x', t: 1 }], ['mamb', 'a2', { c: { kl: 'c' }, by: 'x', t: 1 }], ['mamb', 'a3', { c: { kl: 't' }, by: 'x', t: 1 }],
];

test('separa «Limpieza» por SC: filas, Matriz y catálogo; Deshacer lo devuelve', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: X });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'cat'; render(); });
  await page.locator('[data-mcm="kl"]').click();
  await page.click('#pop [data-do="spl"]');
  await expect(page.locator('#lqm')).toContainText('SC TARRAJEO');
  await expect(page.locator('#lqm')).toContainText('2 filas');
  await page.click('#mxspok');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'l2').name)).toBe('Limpieza SC TARRAJEO');
  expect(await page.evaluate(() => [__dbGet('acts', 'l1').name, __dbGet('acts', 'l3').name])).toEqual(['Limpieza', 'Limpieza SC TARRAJEO']);
  const nk = await page.evaluate(() => Object.entries(__dbAll('mcat')).find(([, c]) => c.name === 'Limpieza SC TARRAJEO')[0]);
  const nc = await page.evaluate(k => __dbGet('mcat', k), nk);
  expect(nc).toMatchObject({ sc: 'c3', spl: 'kl', tr: 7 });
  await expect.poll(() => page.evaluate(() => __dbGet('mcat', 'kl').scs)).toEqual([]);
  // Matriz: el estado pasa a la nueva; la original sale de los ambientes donde ya no la tiene nadie
  await expect.poll(() => page.evaluate(k => [__dbGet('mamb', 'a2').c, __dbGet('mamb', 'a3').c, __dbGet('mamb', 'a1').c], nk)).toEqual([{ [nk]: 'c' }, { [nk]: 't' }, { kl: 'p' }]);
  // Deshacer
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'l2').name)).toBe('Limpieza');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a2').c)).toEqual({ kl: 'c' });
  expect(await page.evaluate(k => !!__dbGet('mcat', k).arch, nk)).toBe(true);
  expect(await page.evaluate(() => __dbGet('mcat', 'kl').scs)).toEqual(['c3']);
  noErrors(errors, 'separar');
});

test('solo el administrador ve «Separar por subcontratista»', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: X });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'cat'; render(); });
  await page.locator('[data-mcm="kl"]').click();
  await expect(page.locator('#pop [data-do="spl"]')).toHaveCount(0);
  noErrors(errors, 'editor');
});
