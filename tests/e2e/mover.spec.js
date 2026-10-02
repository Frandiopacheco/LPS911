// Mover en bloque en el Lookahead: ambiente, sector o filas elegidas, en días hábiles y con deshacer.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const dias = (page, id) => page.evaluate(id => window.__dbGet('acts', id).days, id);
const esperado = (page, ds, n) => page.evaluate(([ds, n, hoy]) => [...new Set(ds.map(d => d >= hoy ? wshift(d, n) : d))].sort(), [ds, n, HOY]);

test('mover todo un ambiente 2 días hábiles, sin tocar lo ya pasado, y deshacer', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const antes = { i0: await dias(page, 'i0'), e0: await dias(page, 'e0'), t0: await dias(page, 't0') };
  await page.click('[data-ambmenu="a1"]');
  await page.click('#pop [data-do="mvd"]');
  await page.fill('#bmn', '2');
  await page.click('#pop [data-do="fwd"]');
  for (const id of ['i0', 'e0', 't0']) await expect.poll(() => dias(page, id)).toEqual(await esperado(page, antes[id], 2));
  expect((await dias(page, 'i0'))[0]).toBe(antes.i0[0]); // el día pasado (30 set) se queda
  expect(await dias(page, 'i1')).toEqual(['2026-09-30', HOY]); // otro ambiente no se mueve
  await page.click('#bundo');
  await expect.poll(() => dias(page, 't0')).toEqual(antes.t0);
  noErrors(errors, 'mover ambiente');
});

test('elegir filas con Ctrl+clic y moverlas juntas desde la barra', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const a = await dias(page, 'e0'), b = await dias(page, 't1');
  await page.click('[data-actmenu="e0"]', { modifiers: ['Control'] });
  await page.click('[data-actmenu="t1"]'); // con algo elegido, un clic suma la fila
  await expect(page.locator('#mvbar')).toContainText('2 actividades');
  await expect(page.locator('tr.asel')).toHaveCount(2);
  await page.click('#mvbar [data-sb="1"]');
  await expect.poll(() => dias(page, 'e0')).toEqual(await esperado(page, a, 1));
  await expect.poll(() => dias(page, 't1')).toEqual(await esperado(page, b, 1));
  await page.keyboard.press('Escape');
  await expect(page.locator('#mvbar')).toHaveCount(0);
  noErrors(errors, 'mover filas');
});

test('mover todo un sector hacia atrás', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const t0 = await dias(page, 't0');
  await page.click('[data-secmenu="s1"]');
  await page.click('#pop [data-do="mvd"]');
  await page.click('#pop [data-do="back"]');
  await expect.poll(() => dias(page, 't0')).toEqual(await esperado(page, t0, -1));
  noErrors(errors, 'mover sector');
});
