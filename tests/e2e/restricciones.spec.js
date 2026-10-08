// Restricciones: filtros por partida afectada, quién la registró, quién la libera y fechas.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const EXCELJS = require.resolve('exceljs/dist/exceljs.min.js');
/* los Excel se arman con librerías del CDN: en la prueba se sirven las copias locales */
const conExcel = async page => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/exceljs/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(EXCELJS, 'utf8') }));
};


const R = (id, o) => ['restr', id, { pisoId: 'p1', type: 'Materiales', desc: id, resp: '', need: HOY, freed: '', status: 'pend', created: HOY, ...o }];

test('filtrar por a quién afecta, quién registró, quién libera y fechas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [
    R('rA', { actId: 'e0', sc: 'c2', desc: 'Falta tubería', by: 'sc@obra.pe', byName: 'Sandra', resp: 'Logística', created: '2026-09-20' }),
    R('rB', { actId: 's9x', desc: 'Falta andamio', by: 'frandiopacheco@gmail.com', byName: 'Frandio', resp: 'Oficina Técnica', status: 'lib', freed: '2026-09-28', libN: 'Ing. Campo' }),
  ] });
  const rows = page.locator('table.t tbody tr');
  await page.locator('#rf [data-f="all"]').click();
  const total = await rows.count();
  // a quién afecta: aunque la haya registrado el ingeniero, sale la partida de la actividad
  await page.selectOption('select[data-rf="aff"]', 'SC ELECTRICAS');
  await expect(rows.filter({ has: page.locator('input[value="Falta tubería"]') })).toHaveCount(1);
  await expect(page.locator('table.t input[value="Falta arena fina"]')).toHaveCount(0);
  await page.click('#rfclr');
  await expect(rows).toHaveCount(total);
  // quién la libera (la liberada cuenta quién la liberó)
  await page.selectOption('select[data-rf="who"]', 'Ing. Campo');
  await expect(rows).toHaveCount(1);
  await page.click('#rfclr');
  // fechas de registro
  await page.fill('input[data-rf="c2"]', '2026-09-25');
  await page.locator('input[data-rf="c2"]').dispatchEvent('change');
  await expect(rows.filter({ has: page.locator('input[value="Falta tubería"]') })).toHaveCount(1);
  await expect(page.locator('table.t input[value="Falta arena fina"]')).toHaveCount(0);
  await page.click('#rfclr');
  // al liberar queda quién lo hizo
  const pend = rows.filter({ has: page.locator('input[value="Falta tubería"]') });
  await pend.locator('select[data-f="status"]').selectOption('lib');
  await expect.poll(() => page.evaluate(() => window.__dbGet('restr', 'rA').libN)).toBeTruthy();
  noErrors(errors, 'restricciones filtros');
});

test('«Ver en el lookahead» muestra una actividad vencida (de la semana pasada, no ejecutada) aunque el lookahead oculte las vencidas y tenga filtros', async ({ page }) => {
  const V = ['acts', 'vx', { ambId: 'a1', sc: 'c1', name: 'Tablero de cuarzo', und: 'und', days: ['2026-09-21', '2026-09-22'], order: 50 }];
  const errors = await openApp(page, { tab: 'restr', extra: [V, R('rv', { actId: 'vx', sc: 'c1', need: '2026-09-21' })] });
  await expect(page.locator('#main .pill', { hasText: 'Actividad no ejecutada' })).toHaveCount(1);
  await page.locator('#rven').click(); // filtra solo las de actividades vencidas
  await expect(page.locator('[data-rgo]')).toHaveCount(1);
  await page.evaluate(() => { U.showPast = false; U.q = 'nada que coincida'; saveUI(); });
  await page.locator('[data-rgo="vx"]').first().click();
  await expect(page.locator('#grid tr.rhl[data-a="vx"]')).toHaveCount(1);
  await expect(page.locator('#toast')).toContainText('no ejecutada');
  noErrors(errors, 'ver vencida');
});

test('«Ver en el lookahead» resalta la fila y «Ver en el plano» lleva a su zona', async ({ page }) => {
  const { LAMINA } = await import('./lamina.js');
  const AMB = [['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
    ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }]];
  const errors = await openApp(page, { tab: 'restr', extra: [...LAMINA, ...AMB] });
  await page.locator('[data-rgo="t0"]').first().click();
  await expect(page.locator('#grid tr.rhl[data-a="t0"]')).toHaveCount(1);
  // sigue resaltada aunque la grilla se redibuje (llega un dato, se desplaza) y se apaga sola a los ~3 s
  await page.evaluate(() => render());
  await expect(page.locator('#grid tr.rhl[data-a="t0"]')).toHaveCount(1);
  expect(await page.locator('#grid tr.rhl').count()).toBe(1);
  await expect(page.locator('#grid tr.rhl')).toHaveCount(0, { timeout: 5000 });
  await page.locator('.tab[data-tab="restr"], [data-tab="restr"]').first().click();
  await page.locator('[data-rmap="t0"]').first().click();
  const t0 = await page.evaluate(() => S.act.get('t0').days.slice().sort()[0]);
  await expect.poll(() => page.evaluate(() => window.__plano && window.__plano.M.date)).toBe(t0);
  await expect.poll(() => page.evaluate(() => window.__plano.M.hl ? [...window.__plano.M.hl] : [])).toContain('v:t0');
  noErrors(errors, 'ver en plano');
});

test('exportar las restricciones a Excel con los filtros de la pantalla; la tabla entra sin desplazarse a los lados', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [R('rA', { actId: 'e0', sc: 'c2', desc: 'Falta tubería', created: '2026-09-20' })] });
  // la tabla cabe en el ancho de la pantalla
  const sw = await page.evaluate(() => { const t = document.querySelector('#main .tscroll'); return t.scrollWidth - t.clientWidth; });
  expect(sw).toBeLessThan(4);
  await conExcel(page);
  await page.selectOption('select[data-rf="aff"]', 'SC ELECTRICAS');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#rxls')]);
  const wb = XLSX.read(readFileSync(await dl.path()));
  expect(wb.SheetNames).toEqual(['AR', 'Detalle']);
  // AR en el formato de la empresa: una fila por restricción, con sus fórmulas de X / O por día
  const ar = wb.Sheets.AR;
  expect([ar.C13.v, ar.D13.v, ar.H13.v]).toEqual(['Entubado empotrado', 'Falta tubería', 'PRODUCCIÓN']);
  expect(ar.L13.f).toContain('IF($J13=""');
  expect(ar.L7.f).toContain('COUNTIF(L13:R13,"O")');
  expect(ar.C14).toBeUndefined();
  const ws = wb.Sheets.Detalle;
  expect(ws.A1.v).toBe('RESTRICCIONES');
  expect(ws.F6.v).toBe('Entubado empotrado'); // primera fila de datos: la filtrada
  expect(ws.G6.v).toBe('SC ELECTRICAS');
  expect(ws.A7).toBeUndefined();
  noErrors(errors, 'restricciones excel');
});

test('el responsable se elige del equipo (personas, empresas o áreas); un nombre antiguo queda marcado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [['restr', 'rz', { actId: 't0', pisoId: 'p1', type: 'Materiales', desc: 'Prueba', resp: 'Juanito Pérez', need: '2026-10-05', freed: '', status: 'pend', created: '2026-10-01', sc: 'c3', by: 'frandiopacheco@gmail.com' }]] });
  const sel = page.locator('select[data-r="rz"][data-f="resp"]').first();
  await expect(sel).toHaveClass(/rbad/);
  const opts = await sel.locator('option').allTextContents();
  expect(opts.some(o => o.startsWith('Elena Editora'))).toBe(true); // persona del equipo
  expect(opts).toContain('SC TARRAJEO'); // empresa
  expect(opts).toContain('Calidad'); // área
  expect(opts).toContain('Juanito Pérez (no está en el equipo)');
  await sel.selectOption('Elena Editora');
  await expect.poll(() => page.evaluate(() => __dbGet('restr', 'rz').resp)).toBe('Elena Editora');
  await expect(page.locator('select[data-r="rz"][data-f="resp"]').first()).not.toHaveClass(/rbad/);
  // no se puede escribir cualquier nombre
  expect(await page.locator('input[data-r="rz"][data-f="resp"]').count()).toBe(0);
  noErrors(errors, 'responsable del equipo');
});
