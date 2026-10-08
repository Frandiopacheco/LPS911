// Catálogo ↔ Lookahead (js/matriz-look.js): unificar nombres (admin), exigir catálogo, agregar / proponer actividades.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const PROJ = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' };
const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas', 'redes emp'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['acts', 'z1', { ambId: 'a1', sc: 'c1', name: 'Redes emp.', und: 'pto', metrado: 5, days: ['2026-10-05'], order: 40 }],
  ['acts', 'z2', { ambId: 'a2', sc: 'c1', name: 'Redes emp.', und: 'pto', metrado: 5, days: ['2026-10-06'], order: 40 }],
  // propuesta del SC sin resolver sobre z2: se salta
  ['lhprop', 'c1', { sc: 'c1', items: { z2: { after: { ambId: 'a2', sc: 'c1', name: 'Redes emp.', days: ['2026-10-07'] }, base: null, sent: true, sentAt: 1, ts: 1, by: 'sc@obra.pe' } } }],
];
const nameIn = (page, a) => page.locator(`#grid .ci[data-a="${a}"][data-f="name"]`);
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);

test('unificar nombres: solo cambia el nombre, salta las filas con propuesta pendiente y se deshace', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; render(); });
  await page.click('[data-mxv="cat"]');
  await page.click('#mxuni');
  await expect(page.locator('.mxul')).toContainText('REDES EMPOTRADAS');
  await expect(page.locator('.mxul')).toContainText('1 con propuesta pendiente');
  await page.click('#mxuok');
  await expect.poll(async () => (await get(page, 'acts', 'i2')).name).toBe('Redes empotradas');
  const z1 = await get(page, 'acts', 'z1');
  expect(z1.name).toBe('Redes empotradas');
  expect(z1.days).toEqual(['2026-10-05']);
  expect(z1.metrado).toBe(5);
  expect((await get(page, 'acts', 'z2')).name).toBe('Redes emp.');
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'acts', 'z1')).name).toBe('Redes emp.');
  expect((await get(page, 'acts', 'i2')).name).toBe('REDES EMPOTRADAS');
  noErrors(errors, 'unificar');
});

test('exigir catálogo: el nombre del catálogo se impone y lo que no está se agrega al catálogo (y a su tipo)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: [...CAT, ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 10 }], ['mamb', 'a2', { tipo: 'tp1', by: 'x', t: 1 }]] });
  page.on('dialog', d => d.accept());
  await page.click('[data-mxv="cat"]');
  await page.click('[data-mxreq="1"]');
  await expect.poll(async () => (await get(page, 'meta', 'project')).catReq).toBe(true);
  await page.evaluate(() => goTab('look'));
  // variante → nombre del catálogo
  await nameIn(page, 'e0').fill('tarrajeo de muros');
  await nameIn(page, 'e0').press('Enter');
  await expect.poll(async () => (await get(page, 'acts', 'e0')).name).toBe('Tarrajeo de muros');
  // no está → ventana: agregar al catálogo y usarla
  await nameIn(page, 'e1').fill('Instalación de espejos');
  await nameIn(page, 'e1').press('Enter');
  await expect(page.locator('#lqm')).toContainText('no está en el catálogo');
  expect((await get(page, 'acts', 'e1')).name).toBe('Entubado empotrado');
  // el ambiente (a2) es de tipo «Dpto»: se ofrece agregarla también al tipo (marcado por defecto)
  await expect(page.locator('#mxatp')).toBeChecked();
  await page.selectOption('#mxacl', 'e');
  await expect(page.locator('#mxatp')).not.toBeChecked();
  await page.selectOption('#mxacl', 't');
  await page.click('#mxaok');
  await expect.poll(async () => (await get(page, 'acts', 'e1')).name).toBe('Instalación de espejos');
  const nid = await page.evaluate(() => Object.entries(__dbAll('mcat')).find(([, c]) => c.name === 'Instalación de espejos' && c.sc === 'c2')[0]);
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', nid]);
  noErrors(errors, 'exigir catálogo');
});

test('SC con catálogo exigido: propone la actividad nueva y el ingeniero la aprueba', async ({ page }) => {
  const extra = [...CAT, ['meta', 'project', { ...PROJ, catReq: true }]];
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra });
  await expect.poll(() => page.evaluate(() => mxCatReq())).toBe(true);
  await nameIn(page, 'i0').fill('Pruebas de presión');
  await nameIn(page, 'i0').press('Enter');
  await expect(page.locator('#lqm')).toContainText('propónla');
  await expect(page.locator('#mxaok')).toHaveCount(0);
  await page.click('#mxapr');
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('mcatp')).length)).toBe(1);
  const p = await page.evaluate(() => Object.values(__dbAll('mcatp'))[0]);
  expect(p).toMatchObject({ name: 'Pruebas de presión', sc: 'c1', st: 'pend', by: 'sc@obra.pe', actId: 'i0' });
  expect((await get(page, 'acts', 'i0')).name).toBe('Redes empotradas');
  noErrors(errors, 'SC propone');
});

test('el ingeniero aprueba una propuesta del SC y queda en el catálogo', async ({ page }) => {
  const extra = [...CAT, ['mcatp', 'p1', { name: 'Pruebas de presión', sc: 'c1', st: 'pend', by: 'sc@obra.pe', n: 'Sandra', t: 1, ambId: 'a1' }]];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra });
  await page.click('[data-mxv="cat"]');
  await page.click('[data-mxpok="p1"]');
  await expect.poll(async () => (await get(page, 'mcatp', 'p1')).st).toBe('ok');
  const cid = (await get(page, 'mcatp', 'p1')).catId;
  expect((await get(page, 'mcat', cid)).name).toBe('Pruebas de presión');
  await expect(page.locator('#mxuni')).toHaveCount(0); // unificar: solo el administrador
  noErrors(errors, 'aprobar propuesta');
});

test('desde el Lookahead sin abrir la Matriz: también ofrece agregar al tipo del ambiente', async ({ page }) => {
  const extra = [...CAT, ['meta', 'project', { ...PROJ, catReq: true }], ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 10 }], ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }]];
  const errors = await openApp(page, { tab: 'look', extra });
  await expect.poll(() => page.evaluate(() => mxCatReq())).toBe(true);
  await nameIn(page, 'e0').fill('Cielo raso');
  await nameIn(page, 'e0').press('Enter');
  await expect(page.locator('#mxatp')).toBeChecked();
  await expect(page.locator('#lqm')).toContainText('tipo «Dpto»');
  await page.click('#mxaok');
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts.length).toBe(2);
  noErrors(errors, 'tipo desde el lookahead');
});
