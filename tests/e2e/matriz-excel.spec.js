// Matriz: exportar a Excel lo que está a la vista (hojas Matriz, Lista y Leyenda).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');

test('matriz en Excel: estados por ambiente, % terminado y lista plana', async ({ page }) => {
  const X = [['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
    ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
    ['mamb', 'a1', { c: { k1: 't', k2: 'c' }, by: 'x', t: 1 }]];
  const errors = await openApp(page, { tab: 'mat', extra: X });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#mxxls')]);
  expect(dl.suggestedFilename()).toMatch(/Matriz_P1_/);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(await dl.path());
  expect(wb.worksheets.map(w => w.name)).toEqual(['Matriz', 'Lista', 'Leyenda']);
  const m = wb.getWorksheet('Matriz');
  const hdr = m.getRow(2).values.slice(1);
  expect(hdr.slice(0, 6)).toEqual(['Piso', 'Sector', 'Código', 'Ambiente', 'Tipo', '% terminado']);
  const r = [3, 4].map(i => m.getRow(i).values.slice(1)).find(v => v[2] === 'A-1');
  expect(r[3]).toBe('Dpto 101');
  expect(r.slice(6)).toEqual(expect.arrayContaining(['✓', '◐']));
  const l = wb.getWorksheet('Lista');
  const rows = []; l.eachRow((x, i) => { if (i > 1) rows.push(x.values.slice(1)); });
  expect(rows.find(v => v[2] === 'A-1' && v[6] === 'Redes empotradas')[7]).toBe('Terminado');
  noErrors(errors, 'matriz en Excel');
});
