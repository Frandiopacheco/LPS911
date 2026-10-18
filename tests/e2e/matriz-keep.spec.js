// La Matriz conserva su pantalla al cambiar de pestaña: al volver, si nada cambió, no se rearma; si cambió algo, sí.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 10 }],
  ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }],
];

test('Matriz: al volver de otra pestaña reutiliza la tabla si nada cambió y la rearma si cambiaron los datos', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await expect(page.locator('#mxt')).toBeVisible();
  await page.evaluate(() => { document.getElementById('mxt').dataset.marca = '1'; });
  await page.locator('[data-tab="hoy"]').first().click({ force: true });
  await expect(page.locator('#main #mxt')).toHaveCount(0);
  await page.locator('[data-tab="mat"]').first().click({ force: true });
  await expect(page.locator('#main #mxt')).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('#main #mxt').dataset.marca)).toBe('1');
  expect(await page.locator('main#mainMat').count()).toBe(0);
  // cambian los datos mientras se está en otra pestaña → al volver se rearma
  await page.locator('[data-tab="hoy"]').first().click({ force: true });
  await page.evaluate(() => { MX.v++; });
  await page.locator('[data-tab="mat"]').first().click({ force: true });
  await expect(page.locator('#main #mxt')).toBeVisible();
  expect(await page.evaluate(() => document.querySelector('#main #mxt').dataset.marca || '')).toBe('');
  noErrors(errors, 'matriz conservada');
});
