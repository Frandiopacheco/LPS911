// Versión para el cliente: holguras por nivel (manda la más específica), vista de solo lectura, Excel, emisión,
// alerta de holgura consumida, PPC del cliente y quién la puede ver.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
/* el Excel se arma con la librería del CDN: en la prueba se sirve la copia local */
const conExcel = page => page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
async function bajar(page, sel) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  const wb = XLSX.read(readFileSync(await dl.path()));
  return { name: dl.suggestedFilename(), wb };
}

const buf = page => page.evaluate(() => window.__dbGet('cli', 'buf') || {});
const dbDias = (page, id) => page.evaluate(id => window.__dbGet('acts', id).days, id);
const cliDias = (page, id) => page.evaluate(id => cliActs().get(id).days, id);
const mas = (page, ds, n) => page.evaluate(([ds, n]) => [...new Set(ds.map(d => wshift(d, n)))].sort(), [ds, n]);
async function holgura(page, sel, n) {
  await page.click(sel);
  await page.fill('#bfn', String(n));
  await page.click('#pop [data-do="ok"]');
}

test('holguras por nivel, vista de solo lectura y Excel del cliente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await conExcel(page);
  await page.click('#fcli');
  await expect(page.locator('#cliban')).toContainText('Vista cliente');
  const e0 = await dbDias(page, 'e0'), i1 = await dbDias(page, 'i1');
  // toda la obra +2
  await holgura(page, '#cliban [data-cb="all"]', 2);
  await expect.poll(async () => (await buf(page)).all).toBe(2);
  await expect.poll(() => cliDias(page, 'e0')).toEqual(await mas(page, e0, 2));
  await expect(page.locator('tr[data-a="e0"] td.d.cin').first()).toBeVisible(); // marca de la fecha interna
  // el ambiente A-1 +4: manda sobre la obra; otro ambiente sigue con +2
  await holgura(page, '[data-buf="a"][data-bid="a1"]', 4);
  await expect.poll(() => cliDias(page, 'e0')).toEqual(await mas(page, e0, 4));
  expect(await cliDias(page, 'i1')).toEqual(await mas(page, i1, 2));
  // la actividad +1: manda sobre su ambiente
  await holgura(page, '[data-buf="x"][data-bid="e0"]', 1);
  await expect.poll(() => cliDias(page, 'e0')).toEqual(await mas(page, e0, 1));
  expect((await buf(page)).x.e0).toBe(1);
  // la vista cliente no cambia el programa interno
  await page.locator('tr[data-a="t1"] td.d').nth(3).click();
  expect(await dbDias(page, 'e0')).toEqual(e0);
  expect(await page.locator('[data-actmenu]').count()).toBe(0);
  // Excel del cliente
  const x = await bajar(page, '#cliban [data-cb="xls"]');
  expect(x.name).toContain('CLIENTE');
  expect(x.wb.SheetNames).toEqual(['Lookahead', 'PPC', 'Leyenda']); // nada del plan interno, restricciones ni avance diario
  expect(JSON.stringify(XLSX.utils.sheet_to_json(x.wb.Sheets.Lookahead, { header: 1 }))).toContain('Programa con holgura');
  // volver a la interna
  await page.click('#cliban [data-cb="x"]');
  await expect(page.locator('#cliban .cliban')).toHaveCount(0);
  await expect(page.locator('[data-actmenu="e0"]')).toBeVisible();
  // también desde el menú del ambiente en la vista interna
  await page.click('[data-ambmenu="a2"]');
  await page.click('#pop [data-do="buf"]');
  await page.fill('#bfn', '3');
  await page.click('#pop [data-do="ok"]');
  await expect.poll(async () => (await buf(page)).a?.a2).toBe(3);
  noErrors(errors, 'vista cliente');
});

test('emitir al cliente, alerta de holgura consumida y PPC del cliente', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'look' });
  await conExcel(page);
  await page.click('#fcli');
  await page.click('#cliban [data-cb="emit"]');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('clidx')).length)).toBe(1);
  expect(await page.evaluate(() => Object.keys(window.__dbAll('cliver')).length)).toBe(2); // una parte por piso
  // la versión emitida se puede ver (solo lectura)
  const id = await page.evaluate(() => Object.keys(window.__dbAll('clidx'))[0]);
  await page.selectOption('#cliver', id);
  await expect(page.locator('#cliban')).toContainText('Versión emitida');
  await page.click('#cliban [data-cb="x"]');
  // en la interna, el ambiente A-1 se atrasa 3 días: pasa las fechas que se informaron
  await page.click('[data-ambmenu="a1"]');
  await page.click('#pop [data-do="mvd"]');
  await page.fill('#bmn', '3');
  await page.click('#pop [data-do="fwd"]');
  await expect(page.locator('tr[data-a="e0"] .clate')).toBeVisible();
  await expect(page.locator('tr[data-a="e1"] .clate')).toHaveCount(0);
  await openTab(page, 'hoy');
  await expect(page.locator('[data-hoy="cli"]')).toContainText('Holgura del cliente');
  await expect(page.locator('[data-hoy="cli"] .hoyn')).not.toHaveText('✓');
  // PPC del cliente: la versión rige desde el lunes siguiente a su emisión; la fechamos antes de esta semana
  await page.evaluate(id => fcol('clidx').doc(id).update({ date: '2026-09-26' }), id);
  await openTab(page, 'ind');
  await page.click('#imode [data-m="sem"]');
  const card = page.locator('.card', { hasText: 'PPC del cliente' });
  await expect(card).toContainText('S58');
  await expect(card.locator('tbody tr').first().locator('td[data-l="Compromisos"]')).toHaveText('4'); // P1: 4 actividades con días esta semana en la versión emitida
  const x = await bajar(page, '#bxcli');
  expect(x.name).toContain('PPC_CLIENTE');
  const filas = XLSX.utils.sheet_to_json(x.wb.Sheets['PPC cliente'], { header: 1 });
  expect(filas.find(f => f[0] === 'S58 (en curso)')?.[2]).toBe(4);
  noErrors(errors, 'emitir');
});

for (const as of ['editor', 'sc', 'campo', 'lector']) {
  test(`${as} sin designar no ve la versión cliente`, async ({ page }) => {
    const errors = await openApp(page, { as, tab: 'look' });
    await expect(page.locator('#grid')).toBeVisible();
    await expect(page.locator('#fcli')).toBeHidden();
    await openTab(page, 'ind');
    await page.click('#imode [data-m="sem"]');
    await expect(page.locator('#main')).not.toContainText('PPC del cliente');
    noErrors(errors, as);
  });
}

test('el administrador designa quién tiene acceso a la versión cliente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  const chk = page.locator('input[data-mem="editor@obra.pe"][data-f="cli"]');
  await chk.check();
  await expect.poll(() => page.evaluate(() => window.__dbGet('members', 'editor@obra.pe').cli)).toBe(true);
  await expect(page.locator('input[data-mem="sc@obra.pe"][data-f="cli"]')).toHaveCount(0); // al subcontratista no se le puede dar
  noErrors(errors, 'designar');
});

test('alguien designado (campo) ve la vista cliente y cambia la holgura', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'look', extra: [['members', 'campo@obra.pe', { role: 'campo', name: 'Carlos Campo', cli: true }]] });
  await page.click('#fcli');
  await expect(page.locator('#cliban')).toContainText('Vista cliente');
  await holgura(page, '#cliban [data-cb="all"]', 1);
  await expect.poll(async () => (await buf(page)).all).toBe(1);
  await openTab(page, 'ind');
  await page.click('#imode [data-m="sem"]');
  await expect(page.locator('#main')).toContainText('PPC del cliente');
  noErrors(errors, 'campo designado');
});
