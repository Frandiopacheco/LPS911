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

test('lookahead: ⚠ en la fila terminada y aún programada; desde ahí se quitan los días desde mañana (con Deshacer)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  page.on('dialog', d => d.accept());
  await expect(page.locator('#grid [data-mxw="t0"]')).toHaveCount(1);
  await expect(page.locator('#grid [data-mxw="i0"]')).toHaveCount(0);
  const d0 = (await page.evaluate(() => __dbGet('acts', 't0'))).days;
  await page.click('#grid [data-mxw="t0"]');
  await expect(page.locator('#pop')).toContainText('Terminado');
  await page.click('#pop [data-do="unp"]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 't0').days)).toEqual([]);
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 't0').days)).toEqual(d0);
  noErrors(errors, 'alerta en la fila');
});

test('lookahead: aviso al programar un día nuevo en una fila terminada', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await expect(page.locator('#grid [data-mxw="t0"]')).toHaveCount(1);
  await page.evaluate(() => { const x = S.act.get('t0'); apply([op('acts', 't0', { ...x, days: [...x.days, '2026-10-12'] })], 'Día agregado'); });
  await expect(page.locator('#toast')).toContainText('la matriz dice «Terminado»');
  noErrors(errors, 'aviso al programar');
});

test('lookahead: «pendientes sin programar» lista lo pendiente de la matriz y lo agrega sin días; la matriz no cambia', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.evaluate(() => { U.piso = ''; render(); });
  await expect(page.locator('#fmxp')).toContainText('1 pendiente sin programar');
  await page.click('#fmxp button');
  await expect(page.locator('#lqm')).toContainText('Pintura');
  await page.check('[data-mxp="0"]');
  await page.click('#mxpok');
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('acts')).filter(x => x.name === 'Pintura' && x.ambId === 'a3' && x.sc === 'c3' && x.days.length === 0).length)).toBe(1);
  // sigue sin días: el aviso continúa hasta que se programe
  await expect(page.locator('#fmxp')).toContainText('1 pendiente');
  // la matriz queda como antes: sin recuadros ni filtro de alertas
  await page.evaluate(() => goTab('mat'));
  await expect(page.locator('#mxt')).toBeVisible();
  await expect(page.locator('[data-mxf]')).toHaveCount(0);
  await expect(page.locator('.tile', { hasText: 'aún programado' })).toHaveCount(0);
  noErrors(errors, 'pendientes sin programar');
});
