// Tablero: avance físico por SC desde la Matriz y filtrado cruzado (clic en la fila de un SC filtra todo).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  // a1: redes terminado (confirmado hoy), tarrajeo en curso; a2: redes pendiente (confirmado), tarrajeo sin validar
  ['mamb', 'a1', { c: { k1: 't', k2: 'c' }, m: { k2: { by: 'x', t: Date.parse('2026-09-30T10:00:00-05:00') } }, by: 'x', t: 1 }],
  ['mamb', 'a2', { c: { k1: 'p' }, m: { k1: { by: 'x', t: Date.parse('2026-09-30T10:00:00-05:00') } }, by: 'x', t: 1 }],
];

test('avance físico por SC: terminado, en curso a la mitad y confiabilidad', async ({ page }) => {
  const errors = await openApp(page, { tab: 'dash', extra: CAT, editar: false });
  await expect(page.locator('#dfisw .dfr[data-dsc]')).toHaveCount(2);
  const r = await page.evaluate(() => { const o = noSc(() => dashFis(new Set(visPisos().map(p => p.id)))).sc; return { c1: [o.c1.a, o.c1.t, Math.round(o.c1.v * 100), Math.round(o.c1.conf * 100)], c3: [o.c3.a, o.c3.c, Math.round(o.c3.v * 100)] }; });
  expect(r.c1).toEqual([2, 1, 50, 100]); // 1 de 2 terminado; las dos confirmadas y al día
  expect(r.c3).toEqual([2, 1, 25]); // en curso cuenta 0,5 de 2
  await page.click('#dfec'); // en curso = 0
  expect(await page.evaluate(() => Math.round(noSc(() => dashFis(new Set(visPisos().map(p => p.id)))).sc.c3.v * 100))).toBe(0);
  noErrors(errors, 'avance físico');
});

test('filtrado cruzado: tocar la fila de un SC filtra el tablero y atenúa a los demás; el menú también filtra', async ({ page }) => {
  const errors = await openApp(page, { tab: 'dash', extra: CAT, editar: false });
  await expect(page.locator('#dfisw .dfr[data-dsc="c3"]')).toBeVisible();
  await page.click('#dfisw .dfr[data-dsc="c3"]');
  expect(await page.evaluate(() => [...DB_.sc])).toEqual(['c3']);
  await expect(page.locator('#dfisw .dfr[data-dsc="c1"]')).toHaveClass(/ddim/);
  await expect(page.locator('.dfon[data-dscx="c3"]')).toBeVisible();
  await page.click('.dfon[data-dscx="c3"]');
  expect(await page.evaluate(() => DB_.sc.size)).toBe(0);
  await page.click('#dscdd');
  await page.click('#pop [data-dsk="c1"]');
  expect(await page.evaluate(() => [...DB_.sc])).toEqual(['c1']);
  await expect(page.locator('.dfc')).toHaveCount(0); // ya no está la fila de botones de todos los SC
  noErrors(errors, 'filtrado cruzado');
});
