// Tareo · RR.HH. y Costos en vivo (docs/ia/tareo.md, «RR.HH. y Costos en vivo»): asistencia y horas por obrero y día desde las
// publicaciones vigentes, HE 60 %/100 %, altura, DM, cuadre con Costos; Costos por partida, UA y avance; Parámetros (tcfg/pla).
// Datos inventados: los mismos de tareo-pub.spec.js (semana 28.09–04.10, hoy 01.10).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { DATOS } from './tareo-datos.js';

test('RR.HH.: semana en vivo por obrero (códigos, HN, HE, altura, DM), detalle y cálculo', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: DATOS });
  await page.evaluate(() => { TRH.ref = '2026-09-30'; goTab('trh'); });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'trh');
  const alfa = page.locator('#trhTb tr[data-trhd="40000001"]');
  await expect(alfa).toBeVisible();
  // L 28: 9 h con 0,5 extra y altura · M 29 sin publicar · Mi 30: 7 h (v2, parcial) · J 01: 10 h con 1,5 extra
  const cod = await alfa.locator('td.ts-d b').allTextContents();
  expect(cod.slice(0, 4)).toEqual(['A▲', '·', 'P', 'A']);
  const r = await page.evaluate(() => { const R = tsCalc('2026-09-28', '2026-10-04', tsePB('rh')); const w = dni => R.W.find(x => x.dni === dni);
    const a = w('40000001'), b = w('40000002'), g = w('40000003');
    return { a: [a.dias, a.hn, a.h60, a.h100, a.alt, a.dsc], b: [b.d[0].code, b.dm, b.hn], g: g.d[0].code, T: [R.T.hh, R.T.f], pc: [...R.PC.values()].map(x => [x.id, x.tot, x.c.OP, x.c.PE]).sort() }; });
  expect(r.a).toEqual([3, 24, 2, 0, 1, 0.5]);
  expect(r.b).toEqual(['DM', 1, 17]);
  expect(r.g).toBe('VA');
  expect(r.T).toEqual([43, 0]);
  expect(r.pc).toEqual([['p02_01', 3, 3, 0], ['p10_05', 27.5, 23, 4.5], ['p10_10', 12.5, 0, 12.5]]);
  await expect(page.locator('#trhAl')).toContainText('Cuadre con Costos');
  await expect(page.locator('#trhAl')).toContainText('1 día sin publicar');
  // detalle del obrero
  await alfa.click();
  await expect(page.locator('#trhDet')).toContainText('10.05 Encofrado de muros');
  // vistas: altas y bajas, descansos médicos
  await page.click('#trhV [data-trhv="dm"]');
  await expect(page.locator('#trhDmT')).toContainText('BETA SOTO');
  noErrors(errors, 'rrhh');
});

test('Costos en vivo: por partida y por UA (cuadre), y Parámetros guardados en tcfg/pla', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: DATOS });
  await page.evaluate(() => { U.mod = 'tar'; TCO.ref = '2026-09-30'; goTab('tcos'); });
  await expect(page.locator('#tcoPcT tr[data-tcop="p10_05"]')).toContainText('27.5');
  await expect(page.locator('#tcoChk')).toContainText('HH por partida = HH de RR.HH.');
  await page.click('#tcoV [data-tcov="ua"]');
  await expect(page.locator('#tcoUaT')).toContainText('CD2');
  await expect(page.locator('#tcoUaT tfoot')).toContainText('43');
  // Parámetros: jornal del operario y bono por altura
  await page.click('#tcoPar');
  await expect(page.locator('#tplJor')).toContainText('11.16'); // 89,30 ÷ 8
  await page.fill('[data-tpj="OP"]', '90');
  await page.fill('#tplAlt', '7');
  await page.click('#tplSave');
  await expect.poll(() => page.evaluate(() => { const d = window.__dbGet('tcfg', 'pla'); return d && [d.vig[d.vig.length - 1].jb.OP, d.alt]; })).toEqual([90, 7]);
  await page.click('#tplBack');
  await expect(page.locator('#tcoTot')).toBeVisible();
  noErrors(errors, 'costos');
});

test('RR.HH. (rol trh): entra a su pestaña, solo lee los parámetros', async ({ page }) => {
  await page.addInitScript(() => { window.__E2E_EXTRA_USERS = 1; });
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: [...DATOS, ['members', 'tcos@obra.pe', { role: 'trh', name: 'Rita RR.HH.' }]] });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'trh');
  await page.click('#trhPar');
  await expect(page.locator('#tplSave')).toHaveCount(0);
  noErrors(errors, 'trh');
});

test('Excel nuevo de RR.HH. y Costos: hojas, horas por obrero, UA y cuadre', async ({ page }) => {
  const { createRequire } = await import('node:module');
  const { readFileSync } = await import('node:fs');
  const require = createRequire(import.meta.url);
  const XLSX = require('xlsx-js-style');
  const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
  const errors = await openApp(page, { as: 'admin', editar: false, extra: DATOS });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.evaluate(() => { U.mod = 'tar'; TRH.ref = '2026-09-30'; goTab('trh'); });
  await expect(page.locator('#trhTb tr[data-trhd="40000001"]')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#trhX')]);
  const wb = XLSX.read(readFileSync(await dl.path()));
  expect(dl.suggestedFilename()).toMatch(/Tareo_S\d+_28\.09-04\.10\.xlsx$/);
  expect(wb.SheetNames).toEqual(['0 Resumen', '1 RRHH Asistencia', '2 RRHH Horas', '3 RRHH Altas y bajas', '4 Costos por partida', '5 Costos por UA', '6 Costos vs meta', '7 Detalle', '8 Personal', '9 Partidas']);
  const aoa = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true });
  const H = aoa('2 RRHH Horas'); const h0 = H.findIndex(r => r[0] === 'N°'); const alfa = H.find(r => r[1] === '40000001');
  const col = n => H[h0].indexOf(n);
  expect([alfa[col('HN')], alfa[col('HE 60%')], alfa[col('HE 100%')], alfa[col('Total HH')]]).toEqual([24, 2, 0, 26]);
  const As = aoa('1 RRHH Asistencia'); const a2 = As.find(r => r[1] === '40000001');
  expect(a2.slice(2, 5)).toEqual(['ALFA', 'ROJAS', 'JUAN']);
  expect(a2.slice(7, 11)).toEqual(['A ▲', '·', 'P', 'A']);
  const U2 = aoa('5 Costos por UA'); expect(U2.find(r => r[0] === 'TOTAL')[6]).toBe(43);
  const Rs = aoa('0 Resumen'); expect(Rs.find(r => r[0] === 'HH por partida = HH de RR.HH.')[1]).toBe('OK');
  expect(aoa('7 Detalle').filter(r => /^\d{2}\/\d{2}\/\d{4}$/.test(r[0])).length).toBe(7);
  noErrors(errors, 'excel rrhh');
});
