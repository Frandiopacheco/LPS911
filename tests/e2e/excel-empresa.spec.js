// Excel con el formato de la empresa: logos del encabezado, AR (análisis de restricciones) con compromiso y observaciones
// del área de soporte y especialidad del SC, y la hoja de Sectorización con la imagen de cada piso.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA, png } from './lamina.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const EXCELJS = require.resolve('exceljs/dist/exceljs.min.js');
const conExcel = async page => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/exceljs/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(EXCELJS, 'utf8') }));
};
const LOGO = 'data:image/png;base64,' + png(60, 30).toString('base64');
const META = ['meta', 'project', { name: 'Obra de prueba', fullName: 'Central de emergencias', owner: 'PRONATEL', location: 'Chorrillos', code: 'OP', refWeek: 58, refDate: '2026-09-28', logoE: 'logo_e', logoC: 'logo_c' }];
const AMB = [['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }]];
const R = ['restr', 'rC', { actId: 'e1', pisoId: 'p1', sc: 'c2', desc: 'Falta plano de detalle', type: '', resp: 'Oficina Técnica', grp: 'area', area: 'Oficina Técnica', need: MANANA, comp: '2026-10-06', obsAs: 'Esperando respuesta del proyectista', status: 'pend', created: HOY }];

test('Lookahead en Excel: logos, AR con compromiso del área y Sectorización con imagen', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [META, ...LAMINA, ...AMB, R, ['fotos', 'logo_e', { data: LOGO }], ['fotos', 'logo_c', { data: LOGO }],
    ['contractors', 'c2', { name: 'SC ELECTRICAS', partida: 'IIEE', esp: 'Instalaciones eléctricas', color: '#aa6633' }]] });
  await conExcel(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bexport')]);
  const path = await dl.path();
  const wb = new ExcelJS.Workbook();await wb.xlsx.readFile(path);
  expect(wb.worksheets.map(w => w.name)).toEqual(['Lookahead', 'PPC semanal', 'AR', 'Sectorización']);
  for (const n of ['Lookahead', 'PPC semanal', 'AR']) expect(wb.getWorksheet(n).getImages().length, n).toBe(2); // logo de la empresa y del cliente
  expect(wb.getWorksheet('Sectorización').getImages().length).toBe(1);
  const ar = wb.getWorksheet('AR');
  expect(ar.getCell('F2').value).toBe('Central de emergencias');
  let rn = 13; while (rn < 80 && ar.getRow(rn).getCell('D').value !== 'Falta plano de detalle') rn++;
  const row = ar.getRow(rn);
  expect([row.getCell('C').value, row.getCell('D').value, row.getCell('G').value, row.getCell('H').value, row.getCell('K').value, row.getCell('AN').value])
    .toEqual(['Entubado empotrado', 'Falta plano de detalle', 'Oficina Técnica', 'OFICINA TÉCNICA', 'Instalaciones eléctricas', 'Esperando respuesta del proyectista']);
  // la X va en la fecha comprometida por el área (lunes 05 oct es la columna S: semana 59, lunes)
  const res = c => { const v = row.getCell(c).value; return v && typeof v === 'object' ? v.result : v; };
  const xs = []; for (let c = 12; c <= 39; c++) if (res(c) === 'X') xs.push(ar.getRow(11).getCell(c).value.result || ar.getRow(11).getCell(c).value);
  expect(xs.map(d => new Date(d).toISOString().slice(0, 10))).toEqual(['2026-10-06']);
  expect(ar.getCell('S8').value.result).toBeGreaterThanOrEqual(1); // semana 59: al menos esta
  noErrors(errors, 'excel empresa');
});

test('Restricciones: el área de soporte registra su compromiso y sus observaciones', async ({ page }) => {
  const errors = await openApp(page, { as: 'ot', tab: 'restr', extra: [R] });
  const r = page.locator('#main tr', { has: page.locator('[data-r="rC"]') }).first();
  await r.locator('[data-f="comp"]').fill('2026-10-07');
  await r.locator('[data-f="comp"]').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__dbGet('restr', 'rC').comp)).toBe('2026-10-07');
  await r.locator('[data-f="obsAs"]').fill('Se pidió al proyectista');
  await r.locator('[data-f="obsAs"]').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__dbGet('restr', 'rC').obsAs)).toBe('Se pidió al proyectista');
  noErrors(errors, 'compromiso AS');
});

test('Excel de la versión cliente: mismas hojas y formato que el interno, con el PPC del cliente', async ({ page }) => {
  page.on('dialog', d => d.accept());
  // versión emitida para la semana 58 (la que se ve): e0 con un día en la semana; i1 oculta al cliente con una restricción
  const sn = { secs: { s1: { pisoId: 'p1', code: 'S1', name: 'Sector 1', order: 1 } }, ambs: { a1: { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0 } },
    acts: { e0: { ambId: 'a1', sc: 'c2', name: 'Entubado para el cliente', und: 'ml', days: [HOY], order: 20 } } };
  const errors = await openApp(page, { tab: 'look', extra: [META, ...LAMINA, ...AMB, ['fotos', 'logo_e', { data: LOGO }], ['fotos', 'logo_c', { data: LOGO }],
    ['clidx', 'c0', { label: 'Semana 58', date: '2026-09-26', ts: 1, forW: 58, pisos: { p1: { code: 'P1', name: 'Primer piso' } } }],
    ['cliver', 'c0__p1', { piso: { code: 'P1', name: 'Primer piso', order: 1 }, json: JSON.stringify(sn) }],
    ['clia', 'i1', { hide: true, h: {} }],
    ['restr', 'rH', { actId: 'i1', pisoId: 'p1', sc: 'c1', desc: 'Restricción de fila oculta', type: 'Materiales', status: 'pend', created: HOY, need: MANANA }]] });
  await conExcel(page);
  await page.click('#tabs button[data-tab="cli"]');
  await expect(page.locator('#cliban')).toContainText('Versión cliente');
  await page.waitForFunction(() => CLX.has('c0'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#cliban [data-cb="xls"]')]);
  expect(dl.suggestedFilename()).toContain('CLIENTE');
  const wb = new ExcelJS.Workbook();await wb.xlsx.readFile(await dl.path());
  expect(wb.worksheets.map(w => w.name).slice(0, 3)).toEqual(['Lookahead', 'PPC semanal', 'PPC del SC']);
  expect(wb.worksheets.map(w => w.name)).toContain('AR');
  expect(wb.worksheets.map(w => w.name)).toContain('Sectorización');
  for (const n of ['Lookahead', 'PPC semanal', 'AR']) expect(wb.getWorksheet(n).getImages().length, n).toBe(2);
  const txt = ws => { const L = []; ws.eachRow(r => r.eachCell(c => L.push(String(c.value && c.value.richText ? c.value.richText.map(t => t.text).join('') : c.value ?? '')))); return L.join(' | '); };
  expect(txt(wb.getWorksheet('PPC semanal'))).toContain('Entubado para el cliente');
  expect(txt(wb.getWorksheet('AR'))).not.toContain('Restricción de fila oculta');
  noErrors(errors, 'excel cliente');
});
