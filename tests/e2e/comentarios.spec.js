// Comentarios del planner en el Lookahead (oct 2026): Control de proyecto comenta una actividad desde el ⋯ (sin editar el
// lookahead), el ingeniero responde y resuelve en el hilo; los SC no los ven.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CP = ['members', 'ot@obra.pe', { role: 'area', name: 'Carla Control', area: 'Control de proyecto' }];
const C1 = ['lkcom', 'k1', { k: 'act', ref: 'i1', piso: 'p1', an: 'A-1 · Redes empotradas', d: '', txt: 'Termina después del hito', by: 'ot@obra.pe', bn: 'Carla Control', t: 1, st: 'open', r: [] }];

test('Comentarios: Control de proyecto comenta una actividad desde el ⋯', async ({ page }) => {
  const errors = await openApp(page, { as: 'ot', tab: 'look', extra: [CP] });
  await expect.poll(() => page.evaluate(() => isPlanArea() && lkcOn() && !canWrite)).toBe(true);
  // su ⋯ solo abre los comentarios (no es el menú de la actividad)
  await expect(page.locator('#grid [data-actmenu]')).toHaveCount(0);
  await page.locator('#grid tr[data-a="i1"] button.rb[data-lkc="act:i1"]').click();
  await expect(page.locator('#pop .lkcnew')).toBeVisible();
  await page.fill('#lkcn', 'Esta fila termina después del hito de la sala');
  await page.locator('#pop [data-do="add"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lkcom')).length)).toBe(1);
  const c = Object.values(await page.evaluate(() => window.__dbAll('lkcom')))[0];
  expect(c).toMatchObject({ k: 'act', ref: 'i1', piso: 'p1', by: 'ot@obra.pe', st: 'open', r: [], txt: 'Esta fila termina después del hito de la sala' });
  await expect(page.locator('#grid td.act .lkcm[data-lkc="act:i1"]')).toBeVisible();
  // los ingenieros comentan desde el ⋯ al programar (menú «Coordinar»)
  await expect(page.locator('#fcom .lkcp b')).toHaveText('1');
  // no edita el lookahead: la actividad sigue igual
  expect(await page.evaluate(() => window.__dbGet('acts', 'i1').name)).toBe('Redes empotradas');
  noErrors(errors, 'comentarios control de proyecto');
});

test('Comentarios: el ingeniero responde y resuelve desde la esquina marcada', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [CP, C1] });
  const mark = page.locator('#grid td.act .lkcm[data-lkc="act:i1"]');
  await expect(mark).toBeVisible();
  // al programar, el ⋯ de la actividad tiene «Coordinar · 💬 Comentarios»
  await page.locator('#grid [data-actmenu="i1"]').click();
  await expect(page.locator('#pop [data-do="com"]')).toContainText('1 abierto');
  await page.keyboard.press('Escape');
  await mark.click();
  await expect(page.locator('#pop .lkct')).toContainText('Termina después del hito');
  await page.fill('#lkcr_k1', 'Lo adelanto un día');
  await page.locator('#pop [data-do="rep_k1"]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('lkcom', 'k1').r || []).length)).toBe(1);
  await expect(page.locator('#pop .lkcr')).toContainText('Lo adelanto un día');
  await page.locator('#pop [data-do="st_k1"]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('lkcom', 'k1').st)).toBe('done');
  await expect(mark).toHaveCount(0);
  await expect(page.locator('#fcom .lkcp b')).toHaveCount(0);
  noErrors(errors, 'comentarios editor');
});

test('Comentarios: el SC no los ve', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [C1] });
  expect(await page.evaluate(() => lkcSee())).toBe(false);
  await expect(page.locator('#grid .lkcm')).toHaveCount(0);
  await expect(page.locator('#fcom .lkcp')).toHaveCount(0);
  noErrors(errors, 'comentarios sc');
});
