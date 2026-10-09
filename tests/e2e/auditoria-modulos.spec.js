// Auditoría de código 08/10 (módulos): AR con las liberadas antes de la ventana archivadas aparte (M7), memoria de dayData (M5),
// selección de la matriz que solo repinta lo que cambia (M8) y nombres normalizados con memoria (L1).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const EXCELJS = require.resolve('exceljs/dist/exceljs.min.js');
const conExcel = async page => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/exceljs/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(EXCELJS, 'utf8') }));
};
const R = (id, o) => ['restr', id, { pisoId: 'p1', actId: 'e0', sc: 'c2', type: 'Materiales', resp: 'Logística', need: HOY, freed: '', status: 'pend', created: '2026-09-01', ...o }];

test('AR: las liberadas antes de las 4 semanas van a «Liberadas (archivo)» con solo valores', async ({ page }) => {
  // semana de HOY (01/10): empieza el lunes 28/09
  const errors = await openApp(page, { tab: 'restr', extra: [
    R('rP', { desc: 'Pendiente vieja', created: '2026-08-20' }),
    R('rV', { desc: 'Liberada en la ventana', status: 'lib', freed: '2026-09-28', libN: 'Ing. Campo' }),
    R('rA', { desc: 'Liberada antes', status: 'lib', freed: '2026-09-15', need: '2026-09-14', comp: '2026-09-15', libN: 'Ing. OT', obsAs: 'Se compró' }),
  ] });
  await conExcel(page);
  await page.locator('#rf [data-f="all"]').click().catch(() => {});
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rxls')]);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(await dl.path());
  expect(wb.worksheets.map(w => w.name)).toEqual(['AR', 'Liberadas (archivo)', 'Detalle']);
  const ar = wb.getWorksheet('AR');
  const descs = []; for (let r = 13; r < 40; r++) { const v = ar.getCell('D' + r).value; if (v) descs.push(v); }
  expect(descs).toContain('Pendiente vieja');
  expect(descs).toContain('Liberada en la ventana');
  expect(descs).not.toContain('Liberada antes');
  // el formato del AR no cambia: fórmulas por día
  expect(ar.getCell('L13').value.formula).toContain('IF($J13=""');
  const lb = wb.getWorksheet('Liberadas (archivo)');
  expect(lb.getCell('A4').value).toBe('N.º');
  const row = lb.getRow(5);
  const vals = row.values.slice(1);
  expect(vals).toContain('Liberada antes');
  expect(vals).toContain('Ing. OT');
  expect(vals).toContain('Se compró');
  // solo valores: ninguna fórmula en la hoja
  let f = 0; lb.eachRow(r => r.eachCell(c => { if (c.value && typeof c.value === 'object' && c.value.formula) f++; }));
  expect(f).toBe(0);
  const freed = row.getCell(12).value; expect(new Date(freed).toISOString().slice(0, 10)).toBe('2026-09-15');
  expect(lb.getRow(6).getCell(2).value ?? null).toBeNull(); // solo una
  noErrors(errors, 'AR archivo');
});

test('AR: sin liberadas antiguas no se agrega la hoja de archivo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [R('rP', { desc: 'Pendiente' })] });
  await conExcel(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rxls')]);
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(await dl.path());
  expect(wb.worksheets.map(w => w.name)).toEqual(['AR', 'Detalle']);
  noErrors(errors, 'AR sin archivo');
});

test('dayData con memoria: igual que calcularlo de nuevo, y cambia cuando cambian los registros', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind' });
  const cmp = () => page.evaluate(() => {
    const dates = Array.from({ length: 10 }, (_, k) => addD(todayIso(), -9 + k));const vset = histPisoSet();
    const strip = D => JSON.stringify({ rows: D.rows.map(r => [r.x.id, r.d, r.sc, r.sched, r.rc ? r.rc.status : null]), scA: D.scA, piA: D.piA, cnc: D.cnc, tot: D.tot, adds: D.adds.map(r => r.x.id + r.d), ex: D.extras.length });
    const a = dayData(dates, vset), b = dayData(dates, vset);
    const fresh = { ...dayDataCore(dates, vset), extras: npItems(new Set(dates), vset) };
    return { same: a.rows === b.rows, eq: strip(a) === strip(fresh), tot: a.tot };
  });
  const r1 = await cmp();
  expect(r1.same).toBe(true); // la segunda vez sale de la memoria
  expect(r1.eq).toBe(true);
  // un registro de Campo nuevo: la memoria se invalida (DONEV) y el resultado sigue igual al calculado de nuevo
  await page.evaluate(() => { const d = todayIso(); const x = [...S.act.values()].find(a => (a.days || []).includes(d)); if (x) writeDaily(d, pisoOfAct(x.id), { recs: { [x.id]: { ...baseRec(d, x, null), status: 'no', cnc: 'Materiales' } } }); });
  const r2 = await cmp();
  expect(r2.eq).toBe(true);
  expect(r2.tot.ver).toBeGreaterThan(r1.tot.ver);
  noErrors(errors, 'dayData memoria');
});

test('matriz: arrastrar para seleccionar solo repinta las celdas que cambian', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: [
    ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
    ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
    ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1', 'k2'], order: 10 }],
    ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }], ['mamb', 'a2', { tipo: 'tp1', by: 'x', t: 1 }]] });
  await expect(page.locator('#mxt')).toBeVisible();
  const n = await page.evaluate(() => {
    MX.edit = true; render();
    const tds = [...document.querySelectorAll('#mxt td.mc:not(.x)')];
    const keys = tds.slice(0, 3).map(td => { const c = mxCellAt(td); return c.amb + '|' + c.cat; });
    let muts = 0; const ob = new MutationObserver(L => { muts += L.filter(m => m.attributeName === 'class').length; });
    ob.observe(document.querySelector('#mxt'), { attributes: true, subtree: true });
    MX.sel = new Set(keys); mxPaintSel();
    const sl1 = document.querySelectorAll('#mxt td.sl').length;
    MX.sel = new Set(keys.slice(0, 2)); mxPaintSel();
    const sl2 = document.querySelectorAll('#mxt td.sl').length;
    return new Promise(ok => setTimeout(() => { ob.disconnect(); ok({ sl1, sl2, muts, k: keys.length }); }, 0));
  });
  expect(n.sl1).toBe(n.k);
  expect(n.sl2).toBe(n.k - 1);
  expect(n.muts).toBe(n.k + 1); // 3 que se marcan + 1 que se desmarca, nada más
  noErrors(errors, 'matriz selección');
});

test('mnk con memoria: mismo resultado y tope de tamaño', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const r = await page.evaluate(() => {
    const a = mnk('  Tarrajeo  de Muros ÁÉ ñ '), b = mnk('  Tarrajeo  de Muros ÁÉ ñ ');
    for (let i = 0; i < 6000; i++) mnk('x' + i);
    return { a, b, n: MNK.size, e: mnk(''), u: mnk(undefined) };
  });
  expect(r.a).toBe('tarrajeo de muros ae n');
  expect(r.b).toBe(r.a);
  expect(r.n).toBeLessThanOrEqual(5001);
  expect([r.e, r.u]).toEqual(['', '']);
  noErrors(errors, 'mnk');
});
