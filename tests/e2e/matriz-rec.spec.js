// Matriz › Recorrido (js/matriz-rec.js): llenar la matriz en campo ambiente por ambiente.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mcat', 'k3', { name: 'Pintura', sc: 'c3', cl: 't', al: ['pintura'], ord: 30 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 10 }],
  ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }],
  ['mamb', 'a2', { tipo: 'tp1', c: { k3: 'p' }, by: 'x', t: 1 }],
  ['mamb', 'a3', { tipo: 'tp1', c: { k3: 'c' }, by: 'x', t: 1 }],
];

test('recorrido: checklist en secuencia, sugerencia del tipo, confirmar marca revisado y pasa al siguiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'rec'; render(); });
  await expect(page.locator('.mxrprog')).toContainText('0 de 3');
  await page.click('[data-mxra="a1"]');
  // secuencia de obra: Redes (días desde ayer) antes que Tarrajeo (en 5 días)
  await expect(page.locator('.mxri[data-mxrc]').first()).toContainText('Redes empotradas');
  await page.click('[data-mxrc="k1"] [data-mxrs="t"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a1').c || {}).k1)).toBe('t');
  // terminada: pasa a «Terminadas o que no aplican»
  await expect(page.locator('.mxrdone')).toContainText('(1)');
  // ¿Falta algo?: los otros 2 Dpto tienen Pintura
  await page.click('.mxrsug summary');
  await expect(page.locator('.mxrsug')).toContainText('2 de 2 Dpto la tienen');
  await page.click('[data-mxradd="k3"]');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c.k3)).toBe('p');
  // confirmar: lo propuesto (tarrajeo) queda confirmado, ambiente revisado y pasa al siguiente
  await page.click('#mxrok');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').rv?.by)).toBe('frandiopacheco@gmail.com');
  expect(await page.evaluate(() => __dbGet('mamb', 'a1').c.k2)).toBe('p');
  await expect(page.locator('.mxrhd h3')).toContainText('A-2');
  await page.click('#mxrback');
  await expect(page.locator('.mxrprog')).toContainText('1 de 3');
  await expect(page.locator('[data-mxra="a1"]')).toHaveClass(/ok/);
  await page.check('#mxronly');
  await expect(page.locator('[data-mxra="a1"]')).toHaveCount(0);
  noErrors(errors, 'recorrido');
});

test('recorrido: el lector ve el checklist sin poder cambiarlo', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'rec'; render(); });
  await page.click('[data-mxra="a1"]');
  await expect(page.locator('[data-mxrc="k1"] [data-mxrs="t"]')).toBeDisabled();
  await expect(page.locator('#mxrok')).toHaveCount(0);
  noErrors(errors, 'recorrido lector');
});
