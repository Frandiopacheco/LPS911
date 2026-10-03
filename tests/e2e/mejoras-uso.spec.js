// Mejoras pedidas al usar la app: causa y mitigación editables, orden por arrastre con número, varios SC a la vez,
// vencidas ocultas y nombres de actividad homogéneos.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab, HOY } from './helpers.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const conExcel = page => page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));

const META = ['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', fullName: 'Central de emergencias', owner: 'PRONATEL' }];
const SEMANA = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: 1, items: { e0: { sc: 'c2', code: 'A-1', amb: 'Dpto 101', act: 'Entubado empotrado', days: [HOY], ord: 1 }, i0: { sc: 'c1', code: 'A-1', amb: 'Dpto 101', act: 'Redes empotradas', days: [HOY], ord: 2 } },
  res: { e0: { ok: false, cnc: 'Materiales', note: '' }, i0: { ok: true } } }];
const res = page => page.evaluate(() => window.__dbGet('weeks', '58_p1').res);

test('PPC semanal: n.º de ítem, tipo de causa del cuadro y mitigación', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [META, SEMANA] });
  await expect(page.locator('#main .phd h2')).toHaveText('PPC semanal');
  await expect(page.locator('[data-tab="plan"]').first()).toHaveText('PPC semanal');
  const tr = page.locator('section[data-pid="p1"] tr[data-id="e0"]');
  await expect(tr.locator('td.inum')).toHaveText('2');
  await expect(tr.locator('[data-cnc] option')).toContainText(['PROG · Programación', 'MAT · Materiales', 'OT · Otros']);
  await expect(tr.locator('[data-cnc]')).toBeEnabled();
  await expect(tr.locator('[data-mit]')).toBeVisible();
  await tr.locator('[data-mit]').fill('Pedir tubería con 1 semana de anticipación');
  await tr.locator('[data-mit]').press('Tab');
  await expect.poll(async () => (await res(page)).e0.mit).toBe('Pedir tubería con 1 semana de anticipación');
  await tr.locator('[data-cnc]').selectOption('Subcontratas');
  await expect.poll(async () => (await res(page)).e0.cnc).toBe('Subcontratas');
  expect((await res(page)).e0.mit).toBe('Pedir tubería con 1 semana de anticipación');
  noErrors(errors, 'plan semanal');
});

test('Indicadores › Semanal: los no cumplidos se corrigen ahí mismo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', extra: [META, SEMANA] });
  await page.evaluate(() => { U.indMode = 'sem'; render(); });
  const card = page.locator('#nccard');
  await expect(card).toContainText('Entubado empotrado');
  await expect(card).not.toContainText('Redes empotradas'); // solo los no cumplidos
  await card.locator('[data-ncf="cnc"]').selectOption('Equipos y herramientas');
  await expect.poll(async () => (await res(page)).e0.cnc).toBe('Equipos y herramientas');
  await card.locator('[data-ncf="mit"]').fill('Reforzar cuadrilla');
  await card.locator('[data-ncf="mit"]').press('Tab');
  await expect.poll(async () => (await res(page)).e0.mit).toBe('Reforzar cuadrilla');
  expect((await res(page)).e0.ok).toBe(false);
  noErrors(errors, 'indicadores');
});

test('Indicadores › Semanal: el lector solo consulta', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'ind', extra: [META, SEMANA] });
  await page.evaluate(() => { U.indMode = 'sem'; render(); });
  await expect(page.locator('#nccard')).toContainText('Materiales');
  await expect(page.locator('#nccard [data-ncf]')).toHaveCount(0);
  noErrors(errors, 'lector');
});

test('Lookahead: las actividades salen numeradas y se reordenan arrastrando el número', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const num = id => page.locator(`tr[data-a="${id}"] .anum`);
  await expect(num('i0')).toHaveText('1');
  await expect(num('t0')).toHaveText('3');
  const src = await num('t0').boundingBox();
  const dst = await page.locator('tr[data-a="i0"]').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + 4, dst.y + 6, { steps: 6 });
  await page.mouse.move(src.x + 4, dst.y + 3, { steps: 2 });
  await page.mouse.up();
  await expect(num('t0')).toHaveText('1');
  await expect(num('i0')).toHaveText('2');
  const ord = await page.evaluate(() => ['t0', 'i0', 'e0'].map(id => window.__dbGet('acts', id).order));
  expect(ord[0] < ord[1] && ord[1] < ord[2]).toBe(true);
  // otro ambiente no cambia
  await expect(num('i1')).toHaveText('1');
  await page.keyboard.press('Control+z');
  await expect(num('t0')).toHaveText('3');
  noErrors(errors, 'reordenar');
});

test('Lookahead: Ctrl+clic en la leyenda filtra varios subcontratistas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { U.legOff = false; render(); });
  const leg = page.locator('#legend');
  await leg.locator('.chip[data-id="c1"]').click();
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(0);
  await leg.locator('.chip[data-id="c2"]').click({ modifiers: ['Control'] });
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="t0"]')).toHaveCount(0);
  await expect(leg.locator('.chip.on')).toHaveCount(2);
  await leg.locator('.chip[data-id="c1"]').click({ modifiers: ['Control'] }); // quita uno
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(0);
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(1);
  noErrors(errors, 'varios sc');
});

test('Lookahead: lo vencido sin reprogramar se oculta (sin borrarse)', async ({ page }) => {
  const VIEJA = ['acts', 'v0', { ambId: 'a1', sc: 'c1', name: 'Prueba hidráulica', und: 'pto', days: ['2026-09-14', '2026-09-15'], order: 40 }];
  const errors = await openApp(page, { tab: 'look', extra: [VIEJA] });
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="v0"]')).toHaveCount(0);
  const pill = page.locator('#fpast button');
  await expect(pill).toContainText('1 vencida oculta');
  await pill.click();
  await expect(page.locator('tr[data-a="v0"]')).toHaveCount(1);
  expect(await page.evaluate(() => !!window.__dbGet('acts', 'v0').arch)).toBe(false);
  noErrors(errors, 'vencidas');
});

test('Lookahead: el nombre se homogeniza con el que ya se usa en otros ambientes', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const inp = page.locator('tr[data-a="t1"] input[data-f="name"]');
  await inp.click();
  await expect(page.locator('#dlact option[value="Entubado empotrado"]')).toHaveCount(1);
  await inp.fill('entubado   EMPOTRADO');
  await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 't1').name)).toBe('Entubado empotrado');
  await expect(page.locator('#toast')).toContainText('como ya se llama en');
  noErrors(errors, 'nombres');
});

test('PPC semanal: el Excel sale en el formato de la empresa', async ({ page }) => {
  const W = JSON.parse(JSON.stringify(SEMANA));W[2].res.e0 = { ok: false, cnc: 'Materiales', note: 'No llegó la tubería', mit: 'Pedir con anticipación' };
  const errors = await openApp(page, { tab: 'plan', extra: [META, W] });
  await conExcel(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bppcx')]);
  expect(dl.suggestedFilename()).toBe('OP_PPC_P1_Sem58.xlsx');
  const ws = XLSX.read(readFileSync(await dl.path())).Sheets.PPC;
  const v = a => (ws[a] || {}).v;
  expect(v('D2')).toBe('PROYECTO');expect(v('E2')).toContain('Central de emergencias');expect(v('I2')).toContain('PORCENTAJE DE PLAN CUMPLIDO');expect(v('T2')).toContain('GP-PR02-F-10');
  expect(['I6', 'J6', 'S6'].map(v)).toEqual(['PROG', 'MAT', 'OT']);
  expect(v('B7')).toBe('ACTIVIDADES PROGRAMADAS');expect(v('I7')).toBe('SEMANA 58');expect(v('O7')).toBe('CUMPLI-MIENTO');
  expect(['B8', 'C8', 'F8', 'G8', 'H8'].map(v)).toEqual(['ITEM', 'DESCRIPCIÓN', 'U.', 'METR\nTOTAL', 'METR\nSEMANA']);
  expect(['O9', 'P9', 'Q9', 'R9', 'S9'].map(v)).toEqual(['SI', 'NO', 'TIPO', 'CAUSAS', 'MITIGACIÓN']);
  expect(v('I9')).toBe(28);
  // proyecto, piso, ambiente como grupo y actividades con su n.º del ambiente
  expect(v('B10')).toContain('CENTRAL DE EMERGENCIAS');expect(v('C11')).toContain('PRIMER PISO');expect([v('B12'), v('C12')]).toEqual(['A-1', 'DPTO 101']);
  const rows = [];for (let r = 13; r < 16; r++) rows.push([v('B' + r), v('C' + r), v('F' + r), v('G' + r), v('L' + r), v('O' + r), v('P' + r), v('Q' + r), v('R' + r), v('S' + r)]);
  expect(rows).toContainEqual([2, 'Entubado empotrado', 'ml', 40, 'S1', '', 1, 'MAT', 'MATERIALES: No llegó la tubería', 'Pedir con anticipación']);
  expect(rows).toContainEqual([1, 'Redes empotradas', 'pto', 20, 'S1', 1, '', '', '', '']);
  // pie: confiabilidad = días cumplidos / días programados
  const pie = Object.keys(ws).find(k => ws[k].v === 'CONFIABILIDAD DE LA PROGRAMACIÓN');expect(pie).toBeTruthy();
  const fr = pie.slice(1);expect([v('I' + fr), v('M' + fr), v('Q' + fr), v('S' + fr)]).toEqual([2, 1, 1, 0.5]);
  noErrors(errors, 'excel ppc');
});

test('Causas: el cuadro de la empresa en Configuración y la lista antigua pasa al cuadro', async ({ page }) => {
  const OLD = ['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', cnc: ['Materiales', 'Mano de obra', 'Clima'] }];
  const errors = await openApp(page, { tab: 'cfg', extra: [OLD] });
  await expect.poll(() => page.evaluate(() => window.__dbGet('meta', 'project').cnc), { timeout: 10000 }).toEqual(['Programación', 'Materiales', 'Control de calidad', 'Externo', 'Cliente - Supervisión', 'Errores de ejecución', 'Subcontratas', 'Equipos y herramientas', 'Administrativos', 'Diseño', 'Otros']);
  expect(await page.evaluate(() => window.__dbGet('meta', 'project').cncOld)).toEqual(['Mano de obra', 'Clima']);
  await expect(page.locator('#main .cimpr', { hasText: 'Cliente - Supervisión' })).toContainText('CLI');
  expect(await page.evaluate(() => [cncCode('Clima'), cncCode('Mano de obra'), cncImp('Diseño'), cncImp('Subcontratas')])).toEqual(['EXT', 'SC', false, true]);
  noErrors(errors, 'causas');
});
