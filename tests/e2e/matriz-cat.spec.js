// Matriz › Catálogo y Tipos de ambiente (js/matriz-cat.js): editar sin perder lo marcado; fusionar y restaurar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mcat', 'k9', { name: 'Redes (duplicada)', sc: 'c1', cl: 'e', al: ['redes dup'], ord: 30 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1', 'k9'], order: 10 }],
  ['mamb', 'a1', { tipo: 'tp1', c: { k1: 't', k9: 'c' }, by: 'x', t: 1 }],
  ['mamb', 'a2', { c: { k9: 't' }, by: 'x', t: 1 }],
];
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);
const row = (page, id) => page.locator(`tr[data-mcid="${id}"]`);

test('catálogo: renombrar y cambiar clase no toca lo marcado; Deshacer', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await row(page, 'k1').locator('[data-mcf="name"]').fill('Redes empotradas IISS');
  await row(page, 'k1').locator('[data-mcf="name"]').press('Enter');
  await expect.poll(async () => (await get(page, 'mcat', 'k1')).name).toBe('Redes empotradas IISS');
  expect((await get(page, 'mamb', 'a1')).c).toEqual({ k1: 't', k9: 'c' });
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'mcat', 'k1')).name).toBe('Redes empotradas');
  await row(page, 'k2').locator('[data-mcf="cl"]').selectOption('e');
  await expect.poll(async () => (await get(page, 'mcat', 'k2')).cl).toBe('e');
  noErrors(errors, 'catálogo editar');
});

test('fusionar traslada estados, nombres y tipos; restaurar lo deja como estaba', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: [...CAT, ['acts', 'd9', { ambId: 'a1', sc: 'c1', name: 'Redes dup', days: [], order: 60 }]] });
  await page.click('[data-mxv="cat"]');
  await row(page, 'k9').locator('[data-mcm]').click();
  await page.click('#pop [data-do="fus"]');
  await page.selectOption('#mxfb', 'k1');
  await expect(page.locator('#mxfi')).toContainText('2 estados');
  await expect(page.locator('#mxfi')).toContainText('queda el más avanzado');
  await page.click('#mxfok');
  // a1: las dos tenían estado → queda el de k1; a2: el de k9 pasa a k1
  await expect.poll(async () => (await get(page, 'mamb', 'a2')).c).toEqual({ k1: 't' });
  expect((await get(page, 'mamb', 'a1')).c).toEqual({ k1: 't' });
  expect((await get(page, 'mcat', 'k1')).al).toEqual(['redes empotradas', 'redes dup', 'redes duplicada']);
  expect((await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1']);
  expect((await get(page, 'mcat', 'k9')).arch.fus).toBe('k1');
  // la fila del lookahead que usaba «Redes (duplicada)» pasa a llamarse como la que queda
  await expect.poll(async () => (await get(page, 'acts', 'd9')).name).toBe('Redes empotradas');
  await expect(row(page, 'k9')).toHaveCount(0);
  // restaurar desde Archivadas
  await page.click('[data-mxarch="1"]');
  await page.click('[data-mcres="k9"]');
  await expect.poll(async () => (await get(page, 'mcat', 'k9')).arch).toBeUndefined();
  expect((await get(page, 'mamb', 'a1')).c).toEqual({ k1: 't', k9: 'c' });
  expect((await get(page, 'mamb', 'a2')).c).toEqual({ k9: 't' });
  expect((await get(page, 'mcat', 'k1')).al).toEqual(['redes empotradas']);
  expect((await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', 'k9']);
  await expect.poll(async () => (await get(page, 'acts', 'd9')).name).toBe('Redes dup');
  noErrors(errors, 'fusionar');
});

// MOD-01: fusionar no deja atrás los cambios del SC sin revisar ni el metadato de la celda
test('fusionar: los cambios del SC no esperan revisión y el estado pasa con su metadato (Restaurar lo devuelve)', async ({ page }) => {
  const scM = { by: 'sc@obra.pe', n: 'Sandra', t: 2, sc: true };
  const extra = CAT.map(r => r[1] === 'a2' ? ['mamb', 'a2', { c: { k9: 't' }, m: { k9: scM }, k: 'k9', by: 'sc@obra.pe', t: 2 }] : r);
  extra.push(['mlog', 'l1', { amb: 'a2', cat: 'k9', sc: 'c1', from: null, to: 't', conf: false, st: 'pend', by: 'sc@obra.pe', n: 'Sandra', t: 2 }]);
  const errors = await openApp(page, { tab: 'mat', extra });
  await page.click('[data-mxv="cat"]');
  await row(page, 'k9').locator('[data-mcm]').click();
  await page.click('#pop [data-do="fus"]');
  await page.selectOption('#mxfb', 'k1');
  await page.click('#mxfok');
  await expect.poll(async () => (await get(page, 'mamb', 'a2')).c).toEqual({ k1: 't' });
  const m = (await get(page, 'mamb', 'a2')).m;
  expect(m.k1).toMatchObject({ by: 'sc@obra.pe', sc: true });
  // restaurar: el estado y el metadato vuelven a la de origen
  await page.click('[data-mxarch="1"]');
  await page.click('[data-mcres="k9"]');
  await expect.poll(async () => (await get(page, 'mamb', 'a2')).c).toEqual({ k9: 't' });
  expect((await get(page, 'mamb', 'a2')).m.k1).toBeUndefined();
  noErrors(errors, 'fusionar con cambios del SC');
});

// MOD-02: un nombre que ya es de otra actividad (nombre o alias) no se crea ni se aplica al renombrar
test('nombres repetidos: «+ Actividad» mira los alias y renombrar a un nombre existente ofrece fusionar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await page.click('#mxcnew');
  await page.fill('#mxnn', 'Redes dup'); // alias de k9
  await page.click('#mxnok');
  await expect(page.locator('#mxnmsg')).toContainText('ya es un nombre del lookahead de «Redes (duplicada)»');
  expect(Object.values(await page.evaluate(() => window.__dbAll('mcat'))).filter(c => c.name === 'Redes dup')).toHaveLength(0);
  await page.click('#lqm [data-lqx]');
  // renombrar k2 al nombre de k1: pregunta; «Cancelar» no cambia nada
  let msg = '';
  page.once('dialog', d => { msg = d.message(); d.dismiss(); });
  await row(page, 'k2').locator('[data-mcf="name"]').fill('redes empotradas');
  await row(page, 'k2').locator('[data-mcf="name"]').press('Enter');
  await expect.poll(() => msg).toContain('Ya existe «Redes empotradas»');
  expect((await get(page, 'mcat', 'k2')).name).toBe('Tarrajeo de muros');
  await expect(row(page, 'k2').locator('[data-mcf="name"]')).toHaveValue('Tarrajeo de muros');
  // «Fusionar…» abre la fusión con la otra ya elegida (sin renombrar)
  page.once('dialog', d => d.accept());
  await row(page, 'k2').locator('[data-mcf="name"]').fill('Redes empotradas');
  await row(page, 'k2').locator('[data-mcf="name"]').press('Enter');
  await expect(page.locator('#mxfb')).toHaveValue('k1');
  expect((await get(page, 'mcat', 'k2')).name).toBe('Tarrajeo de muros');
  noErrors(errors, 'nombres repetidos');
});

test('archivar quita la columna de la matriz pero guarda los estados; nueva actividad', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.click('[data-mxv="cat"]');
  await row(page, 'k2').locator('[data-mcm]').click();
  await page.click('#pop [data-do="arc"]');
  await expect.poll(async () => !!(await get(page, 'mcat', 'k2')).arch).toBe(true);
  await page.click('[data-mxv="mat"]');
  await expect(page.locator('#mxt th.mxc', { hasText: 'Tarrajeo' })).toHaveCount(0);
  await page.click('[data-mxv="cat"]');
  await page.click('#mxcnew');
  await page.fill('#mxnn', 'Espejos');
  await page.selectOption('#mxnsc', 'c2');
  await page.click('#mxnok');
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('mcat')).filter(c => c.name === 'Espejos').length)).toBe(1);
  // duplicado: avisa y no crea
  await page.click('#mxcnew');
  await page.fill('#mxnn', 'espejos');
  await page.click('#mxnok');
  await expect(page.locator('#mxnmsg')).toContainText('Ya existe');
  noErrors(errors, 'archivar y crear');
});

test('tipos de ambiente: agregar y quitar actividades; el lector solo mira', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.click('[data-mxv="tipo"]');
  const card = page.locator('[data-mtid="tp1"]');
  await card.locator('[data-mtadd]').selectOption('k2');
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', 'k9', 'k2']);
  await card.locator('[data-mtrm="k9"]').click();
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', 'k2']);
  noErrors(errors, 'tipos');
});

test('lector: ve el catálogo y los tipos sin poder editar', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await expect(row(page, 'k1')).toContainText('Redes empotradas');
  await expect(page.locator('[data-mcf]')).toHaveCount(0);
  await expect(page.locator('#mxcnew')).toHaveCount(0);
  await page.click('[data-mxv="tipo"]');
  await expect(page.locator('[data-mtadd]')).toHaveCount(0);
  noErrors(errors, 'lector');
});

