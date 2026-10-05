// Plan maestro (paso 2): importar el Excel del planner, emparejar pisos, volver a importar y deshacer.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { openApp, noErrors } from './helpers.js';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');

/* Excel con la forma del del planner: una hoja oculta, títulos arriba, la columna ITEM con letras y niveles de agrupación */
const D = s => new Date(s + 'T00:00:00Z');
async function excel(filas) {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('BDdatos', { state: 'hidden' }).addRow(['ITEM', 'DESCRIPCION']).commit();
  const ws = wb.addWorksheet('Master Plan');
  ws.addRow([]); ws.addRow([null, 'PROYECTO', 'Central 911']); ws.addRow([]);
  ws.addRow([null, 'ITEM', 'DESCRIPCION', null, 'UND', 'Metrado', 'Rend', 'Cuad.', 'Plazo', 'DUR.', 'F. INICIO', 'F. FIN']);
  for (const [t, name, lv, ini, fin, und, met, dur] of filas) {
    const r = ws.addRow([null, t, name, null, und || null, met ?? null, null, null, null, dur ?? null, ini ? D(ini) : null, fin ? D(fin) : null]);
    r.outlineLevel = lv;
  }
  return { name: 'PROGRAMACION MAESTRA.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await wb.xlsx.writeBuffer()) };
}
const FILAS = [
  ['N', 'Creación de la Central 911', 0, '2026-01-05', '2026-12-30'],
  ['C.3', 'ACABADOS', 0],
  ['E', 'MUROS DE CONCRETO', 1, '2026-04-22', '2026-07-17'],
  ['F', 'PISO 01', 2, '2026-04-22', '2026-06-03'],
  ['P', 'ASENTADO DE BLOQUETAS', 3, '2026-04-30', '2026-05-12', 'm2', 532.15],
  ['F', 'PISO 02', 2, '2026-05-25', '2026-06-17'],
  ['P', 'ASENTADO DE BLOQUETAS', 3, '2026-05-28', '2026-06-12', 'm2', 1194.1],
  ['E', 'FACHADAS', 1],
  ['F', 'PANEL FIBROCEMENTO', 2, '2026-08-17', '2026-10-16'],
  ['F', 'PROCURA', 3, '2026-06-08', '2026-08-28'],
  ['P', 'FABRICACIÓN E IMPORTACIÓN', 4, '2026-06-08', '2026-08-28'],
  ['F', 'PISO 02', 3, '2026-08-17', '2026-10-16'],
  ['E', 'PINTURA', 1, '2026-09-10', '2026-09-01'], // termina antes de empezar
  ['C.9', 'MOBILIARIO', 0],
  ['P', 'MOBILIARIO DE OFICINA', 0, '2026-12-08', '2027-01-07'],
  ['', 'SALA DE DATOS', 1, null, null, null, null, 'EN STOCK'],
];

async function abrir(page, as = 'planner') {
  const errors = await openApp(page, { as, tab: 'maestro' });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.evaluate(() => { U.mpVista = 'part'; render(); }); // estas pruebas revisan el árbol
  await page.selectOption('#fpiso', '');
  await page.click('#maeed');
  return errors;
}
const vivos = page => page.evaluate(() => Object.fromEntries(Object.entries(window.__dbAll('mp')).filter(([, n]) => !n.arch)));
const porNombre = (nodos, name, tipo) => Object.entries(nodos).filter(([, n]) => n.name === name && (!tipo || n.tipo === tipo));

test('importar el Excel del planner: árbol, pisos emparejados, avisos y deshacer', async ({ page }) => {
  const errors = await abrir(page);
  await page.setInputFiles('#maexl', await excel(FILAS));
  const dlg = page.locator('#lqm');
  await expect(dlg).toContainText('1. Pisos');
  // «PISO 01/02» se sugieren solos; PROCURA y PANEL quedan como subgrupos
  await expect(dlg.locator('select[data-mxp="piso 01"]')).toHaveValue('p1');
  await expect(dlg.locator('select[data-mxp="piso 02"]')).toHaveValue('p2');
  await expect(dlg.locator('select[data-mxp="procura"]')).toHaveValue('');
  await expect(dlg).toContainText('termina antes de empezar');
  await expect(dlg).toContainText('EN STOCK');
  await dlg.locator('[data-mxok]').click();
  await expect(dlg).toHaveCount(0);
  await expect.poll(async () => Object.keys(await vivos(page)).length).toBe(15);
  const N = await vivos(page);
  // agrupadores, partidas, partidas por piso y detalle
  const [[acab]] = porNombre(N, 'ACABADOS', 'wbs');
  expect(N[acab].code).toBe('C.3');
  const [[muros, m]] = porNombre(N, 'MUROS DE CONCRETO');
  expect(m).toMatchObject({ tipo: 'part', parent: acab });
  const pp = porNombre(N, 'PISO 01', 'pp');
  expect(pp).toHaveLength(1);
  expect(pp[0][1]).toMatchObject({ parent: muros, pisoId: 'p1', ini: '2026-04-22', fin: '2026-06-03' });
  const det = porNombre(N, 'ASENTADO DE BLOQUETAS', 'det');
  expect(det.map(([, n]) => n.metrado).sort()).toEqual([1194.1, 532.15]);
  expect(det[0][1].und).toBe('m2');
  // FACHADAS tiene subgrupos (PANEL › PROCURA): es agrupador; PANEL es partida con su piso
  expect(porNombre(N, 'FACHADAS')[0][1].tipo).toBe('wbs');
  const [[panel, pn]] = porNombre(N, 'PANEL FIBROCEMENTO');
  expect(pn.tipo).toBe('wbs');
  expect(porNombre(N, 'PROCURA')[0][1]).toMatchObject({ tipo: 'part', parent: panel });
  expect(porNombre(N, 'PISO 02', 'pp').map(([, n]) => n.parent)).toContain(panel);
  // la fila del proyecto (N) no se importa; el detalle P bajo un agrupador queda como partida
  expect(porNombre(N, 'Creación de la Central 911')).toHaveLength(0);
  expect(porNombre(N, 'MOBILIARIO DE OFICINA')[0][1].tipo).toBe('part');
  // fin antes del inicio: se corrige al inicio
  expect(porNombre(N, 'PINTURA')[0][1]).toMatchObject({ ini: '2026-09-10', fin: '2026-09-10' });
  // se recuerda el emparejado de pisos
  expect(await page.evaluate(() => window.__dbGet('mpcfg', 'main').pisoMap)).toMatchObject({ 'piso 01': 'p1', 'piso 02': 'p2', procura: '-' });
  // se ve plegado hasta los capítulos
  await expect(page.locator('tr.maer')).toHaveCount(2);
  // Deshacer quita toda la importación de una vez
  await page.locator('#toast button').click();
  await expect.poll(async () => Object.keys(await vivos(page)).length).toBe(0);
  noErrors(errors, 'importar');
});

test('volver a importar: lo que no cambió se queda, lo cambiado se actualiza con el mismo id y lo que no está se archiva', async ({ page }) => {
  const errors = await abrir(page, 'admin');
  await page.setInputFiles('#maexl', await excel(FILAS));
  await page.locator('#lqm [data-mxok]').click();
  await expect.poll(async () => Object.keys(await vivos(page)).length).toBe(15);
  const antes = await vivos(page);
  const [[idMuros]] = porNombre(antes, 'MUROS DE CONCRETO');
  const [[idP1]] = porNombre(antes, 'PISO 01', 'pp');
  // un hito amarrado al piso 1 de muros
  await page.evaluate(id => mpApply([mpOp('h1', { tipo: 'hito', parent: '', ord: 1, name: 'Fin muros P1', grp: 'intermedio', hk: { modo: 'amarrado', campo: 'fin', nodos: [id] } })]), idP1);
  // el mismo Excel otra vez: nada que hacer
  await page.setInputFiles('#maexl', await excel(FILAS));
  await expect(page.locator('#lqm [data-mxok]')).toBeDisabled();
  await expect(page.locator('#lqm')).toContainText('No hay cambios');
  await page.locator('#lqm [data-lqx]').click();
  // nueva revisión: el piso 1 termina después y desaparece PINTURA
  const rev = FILAS.filter(f => f[1] !== 'PINTURA').map(f => f[1] === 'PISO 01' ? [...f.slice(0, 4), '2026-06-10'] : f);
  await page.setInputFiles('#maexl', await excel(rev));
  const dlg = page.locator('#lqm');
  await expect(dlg).toContainText('1 se actualizan');
  await expect(dlg).toContainText('1 ya no están en el Excel');
  await dlg.locator('[data-mxok]').click();
  await expect.poll(async () => (await page.evaluate(id => window.__dbGet('mp', id), idP1)).fin).toBe('2026-06-10');
  const despues = await page.evaluate(() => window.__dbAll('mp'));
  expect(despues[idMuros].arch).toBeUndefined();
  expect(porNombre(despues, 'PINTURA')[0][1].arch).toBeTruthy(); // archivada, no borrada
  // el hito sigue amarrado y se movió con el piso
  await expect(page.locator('tr.maer[data-id="h1"] .mk4')).toHaveText('10/06/26');
  noErrors(errors, 'reimportar');
});

test('mover un nodo dentro de otro y convertirlo', async ({ page }) => {
  const errors = await abrir(page);
  await page.setInputFiles('#maexl', await excel(FILAS));
  await page.locator('#lqm [data-mxok]').click();
  await expect.poll(async () => Object.keys(await vivos(page)).length).toBe(15);
  await page.click('[data-mall="1"]');
  const N = await vivos(page);
  const [[sala]] = porNombre(N, 'SALA DE DATOS');
  const [[mob]] = porNombre(N, 'ACABADOS', 'wbs');
  await page.click(`[data-mn="${sala}"]`);
  await page.click('#pop [data-do="mv"]');
  await page.fill('#mmq', 'acabados');
  await page.click(`#lqm [data-mto="${mob}"]`);
  await expect.poll(async () => (await page.evaluate(id => window.__dbGet('mp', id), sala)).parent).toBe(mob);
  await page.click(`[data-mn="${sala}"]`);
  await page.click('#pop [data-do="cvwbs"]');
  await expect.poll(async () => (await page.evaluate(id => window.__dbGet('mp', id), sala)).tipo).toBe('wbs');
  noErrors(errors, 'mover');
});

test('un Excel sin la tabla del maestro se explica', async ({ page }) => {
  const errors = await abrir(page);
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Hoja1').addRow(['Hola']);
  await page.setInputFiles('#maexl', { name: 'otro.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from(await wb.xlsx.writeBuffer()) });
  await expect(page.locator('#lqm')).toContainText('ITEM y DESCRIPCIÓN');
  noErrors(errors, 'excel ajeno');
});
