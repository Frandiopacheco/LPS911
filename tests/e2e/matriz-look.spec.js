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
const sinLib = page => page.evaluate(() => { for (const [k, v] of LIB) if (v.actId === 'e0' || v.actId === 'e1') LIB.delete(k); }); // e0/e1 tienen liberaciones (historial): estas pruebas son del catálogo
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
  await sinLib(page);
  // variante → nombre del catálogo
  await nameIn(page, 'e0').fill('tarrajeo de muros');
  await nameIn(page, 'e0').press('Enter');
  await expect.poll(async () => (await get(page, 'acts', 'e0')).name).toBe('Tarrajeo de muros');
  // no está → ventana: agregar al catálogo y usarla
  await nameIn(page, 'e1').fill('Instalación de espejos');
  await nameIn(page, 'e1').press('Enter');
  await expect(page.locator('#lqm')).toContainText('no está en el catálogo');
  expect((await get(page, 'acts', 'e1')).name).toBe('Entubado empotrado');
  // el ambiente (a2) es de tipo «Dpto»: por defecto solo este ambiente; se puede marcar «todos los del tipo»
  await expect(page.locator('#mxatp')).not.toBeChecked();
  await page.check('#mxatp');
  await page.selectOption('#mxacl', 'e');
  await expect(page.locator('#mxatp')).not.toBeChecked();
  await page.selectOption('#mxacl', 't');
  await page.check('#mxatp');
  await page.click('#mxaok');
  await expect.poll(async () => (await get(page, 'acts', 'e1')).name).toBe('Instalación de espejos');
  const nid = await page.evaluate(() => Object.entries(__dbAll('mcat')).find(([, c]) => c.name === 'Instalación de espejos' && c.sc === 'c2')[0]);
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', nid]);
  noErrors(errors, 'exigir catálogo');
});

test('SC con catálogo exigido: agrega la actividad directo (por revisar) y sigue con su propuesta', async ({ page }) => {
  const extra = [...CAT, ['meta', 'project', { ...PROJ, catReq: true }]];
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra });
  await expect.poll(() => page.evaluate(() => mxCatReq())).toBe(true);
  await nameIn(page, 'i0').fill('Pruebas de presión');
  await nameIn(page, 'i0').press('Enter');
  await expect(page.locator('#lqm')).toContainText('Se agrega solo a este ambiente');
  await page.click('#mxaok');
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('mcat')).filter(c => c.name === 'Pruebas de presión').length)).toBe(1);
  const c = await page.evaluate(() => Object.values(__dbAll('mcat')).find(c => c.name === 'Pruebas de presión'));
  expect(c).toMatchObject({ sc: 'c1', by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', amb: 'a1', tipo: null } });
  // su programación sigue como propuesta (no cambia el lookahead directo)
  await expect.poll(() => page.evaluate(() => (((__dbGet('lhprop', 'c1') || {}).items || {}).i0 || {}).after?.name)).toBe('Pruebas de presión');
  expect((await get(page, 'acts', 'i0')).name).toBe('Redes empotradas');
  noErrors(errors, 'SC agrega');
});

test('el ingeniero ve lo que agregó el SC, lo corrige (el lookahead se actualiza) y lo marca revisado', async ({ page }) => {
  const extra = [...CAT, ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 10 }],
    ['mcat', 'k7', { name: 'Pruebas presion', sc: 'c1', cl: 't', al: ['pruebas presion'], ord: 70, by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', n: 'Sandra', t: 1, amb: 'a1', tipo: 'tp1' } }],
    ['acts', 'z7', { ambId: 'a1', sc: 'c1', name: 'Pruebas presion', days: ['2026-10-06'], order: 50 }]];
  const errors = await openApp(page, { tab: 'hoy', extra });
  await expect(page.locator('[data-hoy="mcat"]')).toContainText('Pruebas presion');
  await page.click('[data-hoy="mcat"] [data-hgo]');
  await expect(page.locator('.mxrev')).toContainText('Pruebas presion');
  // corrige el nombre en la tabla → la fila del lookahead cambia
  await page.locator('tr[data-mcid="k7"] [data-mcf="name"]').fill('Pruebas de presión');
  await page.locator('tr[data-mcid="k7"] [data-mcf="name"]').press('Enter');
  await expect.poll(async () => (await get(page, 'acts', 'z7')).name).toBe('Pruebas de presión');
  expect((await get(page, 'mcat', 'k7')).al).toEqual(['pruebas presion', 'pruebas de presion']);
  // el SC pidió el tipo: el ingeniero lo confirma
  await page.click('[data-mxrtp="k7"]');
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts).toEqual(['k1', 'k7']);
  await page.click('[data-mxrok="k7"]');
  await expect.poll(async () => (await get(page, 'mcat', 'k7')).rev).toBeUndefined();
  await expect(page.locator('.mxrev')).toHaveCount(0);
  noErrors(errors, 'revisar lo agregado');
});

test('renombrar en el catálogo actualiza el lookahead y Deshacer lo devuelve; fusionar también', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await page.locator('tr[data-mcid="k2"] [data-mcf="name"]').fill('Tarrajeo');
  await page.locator('tr[data-mcid="k2"] [data-mcf="name"]').press('Enter');
  await expect.poll(async () => (await get(page, 'acts', 't0')).name).toBe('Tarrajeo');
  expect((await get(page, 'acts', 't2')).name).toBe('Tarrajeo');
  await expect(page.locator('#toast')).toContainText('3 filas del lookahead');
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'acts', 't0')).name).toBe('Tarrajeo de muros');
  await expect.poll(async () => (await get(page, 'mcat', 'k2')).name).toBe('Tarrajeo de muros');
  noErrors(errors, 'renombrar');
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
  await sinLib(page);
  await nameIn(page, 'e0').fill('Cielo raso');
  await nameIn(page, 'e0').press('Enter');
  await expect(page.locator('#mxatp')).not.toBeChecked();
  await expect(page.locator('#lqm')).toContainText('tipo «Dpto»');
  await page.check('#mxatp');
  await page.click('#mxaok');
  await expect.poll(async () => (await get(page, 'mtipo', 'tp1')).acts.length).toBe(2);
  noErrors(errors, 'tipo desde el lookahead');
});

test('revisión de lo agregado por el SC: sugiere el duplicado y al combinar queda el estado más avanzado; Restaurar lo devuelve', async ({ page }) => {
  const extra = [...CAT,
    ['mcat', 'k8', { name: 'Redes empotradas agua', sc: 'c1', cl: 't', al: ['redes empotradas agua'], ord: 80, by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', n: 'Sandra', t: 1, amb: 'a1', tipo: null } }],
    ['mamb', 'a1', { c: { k1: 'p', k8: 't' }, by: 'x', t: 1 }],
    ['acts', 'z8', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas agua', days: ['2026-10-08'], order: 60 }]];
  const errors = await openApp(page, { tab: 'mat', extra });
  await page.click('[data-mxv="cat"]');
  const dup = page.locator('[data-mxrdup="k8"]');
  await expect(dup).toContainText('Redes empotradas');
  await dup.click();
  await expect(page.locator('#mxfi')).toContainText('queda el más avanzado');
  await expect(page.locator('#mxfi')).toContainText('Terminado');
  await page.click('#mxfok');
  // k1 tenía Pendiente y k8 Terminado: queda Terminado en k1
  await expect.poll(async () => (await get(page, 'mamb', 'a1')).c).toEqual({ k1: 't' });
  await expect.poll(async () => (await get(page, 'acts', 'z8')).name).toBe('Redes empotradas');
  const k8 = await get(page, 'mcat', 'k8');
  expect(k8.arch.fus).toBe('k1');
  expect(k8.rev).toBeUndefined();
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'mamb', 'a1')).c).toEqual({ k1: 'p', k8: 't' });
  noErrors(errors, 'combinar con duplicado');
});

test('rechazar: se archiva si no se usa; si ya tiene filas pide combinarla', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const extra = [...CAT,
    ['mcat', 'k5', { name: 'Limpieza fina', sc: 'c1', cl: 't', al: ['limpieza fina'], ord: 50, by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', n: 'Sandra', t: 1, amb: 'a1' } }],
    ['mcat', 'k6', { name: 'Resane general', sc: 'c1', cl: 't', al: ['resane general'], ord: 60, by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', n: 'Sandra', t: 2, amb: 'a1' } }],
    ['acts', 'z6', { ambId: 'a1', sc: 'c1', name: 'Resane general', days: ['2026-10-08'], order: 60 }]];
  const errors = await openApp(page, { tab: 'mat', extra });
  await page.click('[data-mxv="cat"]');
  await page.click('[data-mxrno="k5"]');
  await expect.poll(async () => (await get(page, 'mcat', 'k5')).arch?.rej).toBe(true);
  await page.click('[data-mxrno="k6"]');
  await expect(page.locator('#mxfb')).toBeVisible();
  expect((await get(page, 'mcat', 'k6')).arch).toBeUndefined();
  noErrors(errors, 'rechazar');
});
