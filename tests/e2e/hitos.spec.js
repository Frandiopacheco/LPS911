// P1 (oct 2026): hitos de inicio y fin en el Lookahead. Se crean con clic derecho en la cabecera del día, se ven como rombo y
// línea en la grilla, se editan con historial de fechas; los SC solo los ven; el área Planificación los gestiona sin editar el
// lookahead (sin opciones del calendario).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const H1 = ['hitos', 'h1', { n: 'Entrega piso 1', tipo: 'fin', d: MANANA, d0: MANANA, piso: '', h: [], st: 'open' }];
const th = (page, d) => page.locator(`#grid th[data-dh="${d}"]`);

test('Hitos: crear con clic derecho, ver rombo y línea, editar la fecha con historial', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await th(page, HOY).click({ button: 'right' });
  await page.locator('#pop [data-do="hadd"]').click();
  await page.fill('#hitn', 'Llegan las UMA');
  await page.selectOption('#hitt', 'ini');
  await page.locator('#pop [data-do="save"]').click();
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('hitos')).length)).toBe(1);
  const h = Object.values(await page.evaluate(() => window.__dbAll('hitos')))[0];
  // el alcance por defecto es el piso elegido arriba (U.piso)
  expect(h).toMatchObject({ n: 'Llegan las UMA', tipo: 'ini', d: '2026-10-01', d0: '2026-10-01', piso: 'p1', st: 'open' });
  await expect(th(page, HOY).locator('.hmk i.hini')).toBeVisible();
  await expect(page.locator(`#grid td.d.hli[data-d="${HOY}"]`).first()).toBeAttached();
  await expect(page.locator('#fhit .hpill b')).toHaveText('1');
  // tocar el rombo → ficha → editar la fecha: queda la original y el historial
  await th(page, HOY).locator('.hmk').click();
  await page.locator('#pop button', { hasText: 'Editar…' }).click();
  await page.fill('#hitd', MANANA);
  await page.locator('#pop [data-do="save"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('hitos'))[0].d)).toBe(MANANA);
  const h2 = Object.values(await page.evaluate(() => window.__dbAll('hitos')))[0];
  expect(h2.d0).toBe(HOY);
  expect(h2.h.map(o => [o.from, o.to])).toEqual([[HOY, MANANA]]);
  await expect(th(page, MANANA).locator('.hmk')).toBeVisible();
  await expect(th(page, HOY).locator('.hmk')).toHaveCount(0);
  // el filtro por día sigue funcionando al tocar la cabecera fuera del rombo
  await th(page, HOY).click();
  await expect.poll(() => page.evaluate(() => U.day)).toBe(HOY);
  noErrors(errors, 'hitos admin');
});

test('Hitos: el SC los ve pero no los gestiona', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [H1] });
  await expect(th(page, MANANA).locator('.hmk i.hfin')).toBeVisible();
  expect(await page.evaluate(() => canHito())).toBe(false);
  await th(page, MANANA).locator('.hmk').click();
  await expect(page.locator('#pop')).toContainText('Entrega piso 1');
  await expect(page.locator('#pop button', { hasText: 'Editar' })).toHaveCount(0);
  noErrors(errors, 'hitos sc');
});

test('Hitos: el área Planificación agrega hitos y no ve las opciones del calendario', async ({ page }) => {
  const errors = await openApp(page, { as: 'ot', tab: 'look', extra: [['members', 'ot@obra.pe', { role: 'area', name: 'Planner', area: 'Planificación' }], H1] });
  await expect.poll(() => page.evaluate(() => isPlanArea() && canHito() && !lkCalOk())).toBe(true);
  await th(page, HOY).click({ button: 'right' });
  await expect(page.locator('#pop [data-do="hadd"]')).toBeVisible();
  await expect(page.locator('#pop [data-do="hol"]')).toHaveCount(0);
  // en la Sesión pull se pueden traer los hitos del lookahead
  expect(await page.evaluate(() => hitForPull('p1', new Set()).map(h => h.id))).toEqual(['h1']);
  noErrors(errors, 'hitos planificación');
});
