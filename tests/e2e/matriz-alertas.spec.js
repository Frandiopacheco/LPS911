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

/* faltan programar: filas fantasma dentro de cada ambiente (reemplazan la lista aparte, oct 2026) */
const gh = page => page.locator('#grid tr[data-gh="a3|k3"]');
test('faltan programar: el interruptor muestra la fila fantasma y tocar un día la programa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.lkGh = false; render(); });
  await expect(page.locator('#fmxp')).toContainText('Faltan programar 1');
  await expect(gh(page)).toHaveCount(0);
  await page.click('#fmxp button');
  await expect(gh(page)).toContainText('Pintura');
  await expect(gh(page)).toContainText('Falta');
  // los días pasados no se pueden tocar
  await expect(gh(page).locator('td.d[data-d="2026-09-30"]')).toHaveCount(0);
  await gh(page).locator('td.d[data-d="2026-10-05"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('acts')).filter(x => x.name === 'Pintura' && x.ambId === 'a3' && x.sc === 'c3').map(x => x.days))).toEqual([['2026-10-05']]);
  await expect(gh(page)).toHaveCount(0);
  await expect(page.locator('#fmxp button')).toHaveCount(0);
  // la matriz no cambia
  expect(await page.evaluate(() => (__dbGet('mamb', 'a3').c || {}).k3)).toBeUndefined();
  noErrors(errors, 'fila fantasma');
});

test('faltan programar: el chip del ambiente abre solo ese ambiente; ⋮ agrega sin días o marca «No aplica»', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.lkGh = false; render(); });
  await page.click('[data-ghamb="a3"]');
  await expect(gh(page)).toBeVisible();
  await gh(page).locator('[data-ghmenu]').click();
  await page.click('#pop [data-do="na"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a3').c || {}).k3)).toBe('n');
  await expect(gh(page)).toHaveCount(0);
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a3').c || {}).k3)).toBeUndefined();
  await expect(gh(page)).toBeVisible();
  await gh(page).locator('[data-ghmenu]').click();
  await page.click('#pop [data-do="add"]');
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('acts')).filter(x => x.name === 'Pintura' && x.ambId === 'a3' && x.days.length === 0).length)).toBe(1);
  noErrors(errors, 'chip y menú');
});

test('«Ver en la Matriz» lleva a la celda y resalta su fila y su columna unos 3 segundos', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await page.click('#grid [data-mxw="t0"]');
  await page.click('#pop [data-do="mat"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'mat');
  await expect(page.locator('#mxt tr[data-amb="a1"]')).toHaveClass(/mxhl/);
  await expect(page.locator('#mxt td.mxhlx')).toHaveCount(1);
  await expect(page.locator('#mxt th.mxc.mxhl')).toContainText('Tarrajeo');
  await expect(page.locator('#mxt .mxhl, #mxt .mxhlx')).toHaveCount(0, { timeout: 6000 });
  noErrors(errors, 'resaltar');
});

test('faltan programar: el SC solo ve lo de su partida', async ({ page }) => {
  const extra = [...CAT, ['mcat', 'k8', { name: 'Prueba de redes', sc: 'c1', cl: 't', al: ['prueba de redes'], ord: 80 }], ['mtipo', 'tp1', { name: 'Dpto', acts: ['k3', 'k8'], order: 10 }]];
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra });
  await page.evaluate(() => { U.piso = ''; U.lkGh = true; render(); });
  await expect(page.locator('#grid tr[data-gh="a3|k8"]')).toBeVisible();
  await expect(page.locator('#grid tr[data-gh="a3|k3"]')).toHaveCount(0);
  noErrors(errors, 'SC faltantes');
});
