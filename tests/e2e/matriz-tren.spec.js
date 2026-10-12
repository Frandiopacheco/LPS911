// Tren de trabajo (Matriz › Tren): orden general del catálogo; ubica las fantasmas del Lookahead y marca (opción B)
// las filas terminadas en la Matriz que siguen programadas.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10, tr: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20, tr: 30 }],
  ['mcat', 'k3', { name: 'Pintura', sc: 'c3', cl: 't', al: ['pintura'], ord: 30, tr: 20 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k3'], order: 10 }],
  ['mamb', 'a1', { c: { k2: 't' }, by: 'x', t: 1 }],
  ['mamb', 'a3', { tipo: 'tp1', by: 'x', t: 1 }],
];

test('tren: la fantasma va después de su predecesora y antes de su sucesora; sin tren, al final', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  const r = await page.evaluate(() => {
    MX.cat.get('k1').tr = 10; MX.cat.get('k3').tr = 20; MX.cat.get('k2').tr = 30;
    const row = (id, cat) => ({ id, name: MX.cat.get(cat).name, sc: MX.cat.get(cat).sc, ambId: 'zz' });
    const g = cat => ({ c: MX.cat.get(cat) });
    const lab = L => L.map(o => o.x ? o.x.id : 'g:' + o.g.c.id).join(',');
    // filas reales en orden «desordenado» (tarrajeo antes que redes): no se mueven
    const vis = [row('r2', 'k2'), row('r1', 'k1')];
    const a = lab(lkGhMerge(vis, [g('k3')]));            // pintura (20): después de redes (10)
    const b = lab(lkGhMerge([row('r2', 'k2')], [g('k1'), g('k3')])); // sin predecesora: antes de tarrajeo, en orden del tren
    delete MX.cat.get('k3').tr;
    const c = lab(lkGhMerge(vis, [g('k3')]));            // fuera del tren: al final
    return { a, b, c };
  });
  expect(r.a).toBe('r2,r1,g:k3');
  expect(r.b).toBe('g:k1,g:k3,r2');
  expect(r.c).toBe('r2,r1,g:k3');
  noErrors(errors, 'orden de fantasmas');
});

test('tren: la vista lista el orden, mueve con ↑ y deshace', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await expect(page.locator('#toast')).toContainText('respaldo', { timeout: 8000 }); // aviso del arranque: que no tape el «Deshacer»
  await page.evaluate(() => { U.mxV = 'tren'; render(); });
  await expect(page.locator('#mxtrl li')).toHaveCount(3);
  await expect(page.locator('#mxtrl li').nth(1)).toContainText('Pintura');
  await page.click('#mxtrl li:nth-child(2) [data-trup]');
  await expect.poll(() => page.evaluate(() => [__dbGet('mcat', 'k3').tr, __dbGet('mcat', 'k1').tr])).toEqual([10, 20]);
  await expect(page.locator('#mxtrl li').first()).toContainText('Pintura');
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => [__dbGet('mcat', 'k3').tr, __dbGet('mcat', 'k1').tr])).toEqual([20, 10]);
  noErrors(errors, 'vista tren');
});

test('opción B: con «Faltan programar» encendido, días rayados y chip «✓ en Matriz» en el ambiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.lkGh = false; render(); });
  await expect(page.locator('#grid td.mxt')).toHaveCount(0);
  await expect(page.locator('[data-mxtamb]')).toHaveCount(0);
  await page.click('#fmxp button');
  await expect(page.locator('#grid tr[data-a="t0"] td.mxt').first()).toBeVisible();
  await expect(page.locator('[data-mxtamb="a1"]')).toContainText('1 ✓ en Matriz');
  await page.click('[data-mxtamb="a1"]');
  await expect(page.locator('#pop')).toContainText('terminadas en la Matriz');
  noErrors(errors, 'opción B');
});
