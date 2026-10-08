// Lookahead ↔ catálogo (oct 2026, pedido del dueño): aviso en la fila fuera del catálogo (∉) o de otro SC, y actividades de varios SC.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['acts', 'cross', { ambId: 'a1', sc: 'c1', name: 'Tarrajeo de muros', und: 'm2', days: [], order: 40 }],
];

test('lookahead: ∉ en lo que no está en el catálogo; «SC» en la fila de otro SC y se suma el SC a la actividad', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.evaluate(() => { U.piso = ''; render(); });
  // «Entubado empotrado» (e0) no está en el catálogo
  await expect(page.locator('#grid [data-mxc="e0"]')).toHaveText('∉');
  await expect(page.locator('#grid [data-mxc="i0"]')).toHaveCount(0);
  await expect(page.locator('#grid [data-mxc="cross"]')).toHaveText('SC');
  await page.click('#grid [data-mxc="cross"]');
  await expect(page.locator('#pop')).toContainText('SC TARRAJEO');
  await page.click('#pop [data-do="add"]');
  await expect.poll(() => page.evaluate(() => __dbGet('mcat', 'k2').scs)).toEqual(['c1']);
  await expect(page.locator('#grid [data-mxc="cross"]')).toHaveCount(0);
  expect(await page.evaluate(() => mxCatOf(S.act.get('cross')))).toBe('k2');
  // ∉ abre «elegir o agregar al catálogo»
  await page.click('#grid [data-mxc="e0"]');
  await expect(page.locator('#lqm')).toContainText('no está en el catálogo');
  noErrors(errors, 'catálogo en el lookahead');
});

test('una actividad de varios SC: el SC sumado la ve y la llena en la Matriz', async ({ page }) => {
  const extra = [...CAT.slice(0, 2).map(r => r[1] === 'k2' ? ['mcat', 'k2', { ...r[2], scs: ['c1'] }] : r), CAT[2]];
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra });
  await page.evaluate(() => { U.piso = ''; render(); });
  expect(await page.evaluate(() => MX.view.cols.map(c => c.id).sort())).toEqual(['k1', 'k2']);
  expect(await page.evaluate(() => mxScCan(MX.cat.get('k2')))).toBe(true);
  await page.evaluate(() => mxScSet('a1', 'k2', 'c'));
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a1') || {}).c)).toEqual({ k2: 'c' });
  const l = await page.evaluate(() => Object.values(__dbAll('mlog'))[0]);
  expect(l.sc).toBe('c1'); // la constancia va a nombre de su partida
  noErrors(errors, 'varios SC');
});
