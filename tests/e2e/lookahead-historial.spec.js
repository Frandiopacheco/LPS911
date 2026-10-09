// Filas con historial (oct 2026): cambiar nombre o SC de una fila con historial crea una fila nueva; solo el admin corrige (con motivo).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const ROWS = [
  ['acts', 'h1', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: null, days: ['2026-09-29', '2026-10-05'], order: 90 }],
  ['acts', 'h2', { ambId: 'a1', sc: 'c1', name: 'Pruebas', und: '', metrado: null, days: ['2026-10-06'], order: 91 }],
];
const nameIn = (page, a) => page.locator(`#grid .ci[data-a="${a}"][data-f="name"]`);
const all = page => page.evaluate(() => Object.values(window.__dbAll('acts')).filter(a => !a.arch && a.ambId === 'a1').map(a => [a.name, a.sc]));
const get = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);

test('editor: renombrar una fila con días pasados crea una fila nueva y deja la vieja intacta', async ({ page }) => {
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: ROWS });
  await nameIn(page, 'h1').fill('Tarrajeo de muros');
  await nameIn(page, 'h1').press('Enter');
  await expect.poll(async () => (await all(page)).some(([n]) => n === 'Tarrajeo de muros')).toBe(true);
  expect(msgs[0]).toContain('ya tiene historial');
  expect((await get(page, 'h1')).name).toBe('Redes empotradas');
  noErrors(errors, 'historial nueva fila');
});

test('editor: una fila sin historial se renombra normal; cambiar la escritura no se bloquea', async ({ page }) => {
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: ROWS });
  await nameIn(page, 'h2').fill('Pruebas de presión');
  await nameIn(page, 'h2').press('Enter');
  await expect.poll(async () => (await get(page, 'h2')).name).toBe('Pruebas de presión');
  await nameIn(page, 'h1').fill('REDES EMPOTRADAS');
  await nameIn(page, 'h1').press('Enter');
  await expect.poll(async () => (await get(page, 'h1')).name.toUpperCase()).toBe('REDES EMPOTRADAS');
  expect(msgs.filter(m => m.includes('ya tiene historial'))).toEqual([]);
  noErrors(errors, 'sin historial');
});

test('admin: puede corregir la misma fila con motivo', async ({ page }) => {
  let n = 0;
  page.on('dialog', d => { n++; if (n === 1) d.dismiss(); else d.accept('Estaba mal asignada'); });
  const errors = await openApp(page, { tab: 'look', extra: ROWS });
  await nameIn(page, 'h1').fill('Redes de desagüe');
  await nameIn(page, 'h1').press('Enter');
  await expect.poll(async () => (await get(page, 'h1')).name).toBe('Redes de desagüe');
  expect((await all(page)).filter(([x]) => x === 'Redes de desagüe').length).toBe(1);
  noErrors(errors, 'admin corrige');
});
