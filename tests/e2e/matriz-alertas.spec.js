// Alertas Matriz ↔ Lookahead: terminado (o no aplica) en la matriz pero aún programado; pendiente sin programar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mcat', 'k3', { name: 'Pintura', sc: 'c3', cl: 't', al: ['pintura'], ord: 30 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k3'], order: 10 }],
  // a1: tarrajeo confirmado terminado, pero t0 sigue programado (días futuros)
  ['mamb', 'a1', { c: { k2: 't' }, by: 'x', t: 1 }],
  // a2: tarrajeo «no aplica», t1 sigue programado
  ['mamb', 'a2', { c: { k2: 'n' }, by: 'x', t: 1 }],
  // a3: tipo con «Pintura», que no está en el lookahead → pendiente sin programar
  ['mamb', 'a3', { tipo: 'tp1', by: 'x', t: 1 }],
];

test('matriz: cuenta y filtra las alertas; desde la celda se quitan los días desde mañana (con Deshacer)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; render(); });
  await expect(page.locator('.tile.mxtw')).toContainText('2');
  await page.click('[data-mxf="warn"]');
  await expect(page.locator('#mxt tr[data-amb]')).toHaveCount(2);
  const ci = await page.evaluate(() => MX.view.cols.findIndex(c => c.id === 'k2'));
  const td = page.locator(`#mxt tr[data-amb="a1"] td[data-k="${ci}"]`);
  await expect(td).toHaveClass(/warn/);
  page.on('dialog', d => d.accept());
  await td.click();
  await expect(page.locator('#pop')).toContainText('sigue programada');
  const d0 = (await page.evaluate(() => __dbGet('acts', 't0'))).days;
  await page.click('#pop [data-do="unp"]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 't0').days)).toEqual([]);
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 't0').days)).toEqual(d0);
  // pendiente sin programar
  await page.click('[data-mxf="sp"]');
  await expect(page.locator('#mxt tr[data-amb]')).toHaveCount(1);
  await expect(page.locator('#mxt tr[data-amb="a3"]')).toHaveCount(1);
  noErrors(errors, 'alertas matriz');
});

test('lookahead: marca la fila en alerta, lleva a la Matriz y avisa al programar un día nuevo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await expect(page.locator('#grid [data-mxw="t0"]')).toHaveCount(1);
  await expect(page.locator('#grid [data-mxw="i0"]')).toHaveCount(0);
  // programar un día más en una fila en alerta → aviso
  await page.evaluate(() => { const x = S.act.get('t0'); apply([op('acts', 't0', { ...x, days: [...x.days, '2026-10-12'] })], 'Día agregado'); });
  await expect(page.locator('#toast')).toContainText('la matriz dice «Terminado»');
  await page.click('#grid [data-mxw="t0"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'mat');
  expect(await page.evaluate(() => U.mxF)).toBe('warn');
  noErrors(errors, 'alertas lookahead');
});
