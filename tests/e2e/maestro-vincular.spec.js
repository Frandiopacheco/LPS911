// Plan maestro (paso 4): vista por piso, vincular el lookahead arrastrando, ◆ en el lookahead y Excel.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { openApp, noErrors, HOY } from './helpers.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const D = n => { const x = new Date(HOY + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/* maestro de la obra de prueba: sanitarias (fin holgado) y tarrajeo (fin antes de lo que dice el lookahead) por piso */
const MP = [
  ['mp', 'w1', { tipo: 'wbs', parent: '', ord: 1, name: 'ACABADOS', code: 'C.3' }],
  ['mp', 'pa', { tipo: 'part', parent: 'w1', ord: 1, name: 'Redes empotradas IISS' }],
  ['mp', 'pa1', { tipo: 'pp', parent: 'pa', ord: 1, name: 'PISO 01', pisoId: 'p1', ini: D(-10), fin: D(10) }],
  ['mp', 'pa2', { tipo: 'pp', parent: 'pa', ord: 2, name: 'PISO 02', pisoId: 'p2', ini: D(-5), fin: D(15) }],
  ['mp', 'pb', { tipo: 'part', parent: 'w1', ord: 2, name: 'Tarrajeo de muros' }],
  ['mp', 'pb1', { tipo: 'pp', parent: 'pb', ord: 1, name: 'PISO 01', pisoId: 'p1', ini: D(0), fin: D(3) }],
  ['mp', 'pc', { tipo: 'part', parent: 'w1', ord: 3, name: 'Mobiliario', ini: D(30), fin: D(40) }],
];

test('vista por piso (como el lookahead) y por partida (como el Excel)', async ({ page }) => {
  const errors = await openApp(page, { as: 'planner', tab: 'maestro', extra: MP });
  await page.selectOption('#fpiso', '');
  // por defecto: cada piso con sus partidas; al final las partidas sin pisos
  const hdr = page.locator('tr.maepiso');
  await expect(hdr).toHaveText([/P1 · Primer piso/, /P2 · Segundo piso/, /Partidas sin pisos/]);
  await expect(page.locator('tr.maer[data-id="pb1"] .maelb b')).toHaveText('Tarrajeo de muros');
  // el piso elegido arriba filtra
  await page.selectOption('#fpiso', 'p2');
  await expect(page.locator('tr.maer[data-id="pa2"]')).toHaveCount(1);
  await expect(page.locator('tr.maer[data-id="pa1"]')).toHaveCount(0);
  // por partida: el árbol de siempre
  await page.selectOption('#fpiso', '');
  await page.click('[data-mvista="part"]');
  await expect(page.locator('tr.maepiso')).toHaveCount(0);
  await expect(page.locator('tr.maer[data-id="w1"]')).toHaveCount(1);
  noErrors(errors, 'vistas');
});

test('vincular: arrastrar, tocar y tocar, varias a la vez y quitar; el lookahead no se toca', async ({ page }) => {
  const errors = await openApp(page, { as: 'planner', tab: 'maestro', extra: MP });
  await page.selectOption('#fpiso', 'p1');
  const acts0 = await page.evaluate(() => JSON.stringify(window.__dbAll('acts')));
  await page.click('#maevinc');
  await expect(page.locator('.mvact')).toHaveCount(6); // las 6 actividades del piso 1
  await expect(page.locator('.mvp')).toHaveCount(3); // sanitarias y tarrajeo de P1 + mobiliario (sin pisos)
  // arrastrar tarrajeo (t0) a su partida
  await page.locator('[data-mva="t0"]').dragTo(page.locator('[data-mvp="pb1"]'));
  await expect.poll(() => page.evaluate(() => window.__dbGet('mpl', 't0'))).toMatchObject({ mp: 'pb1', by: 'planner@obra.pe' });
  await expect(page.locator('[data-mva="t0"]')).toHaveCount(0); // ya no está «sin vincular»
  // tocar varias (Ctrl) y luego la partida
  await page.click('[data-mva="i0"]');
  await page.click('[data-mva="i1"]', { modifiers: ['Control'] });
  await expect(page.locator('.mvsel')).toContainText('2 elegidas');
  // la partida con el mismo nombre se sugiere
  await expect(page.locator('[data-mvp="pa1"]')).toHaveClass(/sug/);
  await page.click('[data-mvp="pa1"] .mvph b');
  await expect.poll(() => page.evaluate(() => [window.__dbGet('mpl', 'i0')?.mp, window.__dbGet('mpl', 'i1')?.mp])).toEqual(['pa1', 'pa1']);
  // ver y quitar un vínculo
  await page.click('[data-mvo="pa1"]');
  await page.click('[data-mvx="i1"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('mpl', 'i1'))).toBeUndefined();
  // deshacer devuelve el vínculo
  await page.locator('#toast button').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('mpl', 'i1')?.mp)).toBe('pa1');
  // el lookahead quedó igual
  expect(await page.evaluate(() => JSON.stringify(window.__dbAll('acts')))).toBe(acts0);
  // el estado de cada partida: tarrajeo se pasa (fin día +3, el lookahead termina el día +6)
  await expect(page.locator('[data-mvp="pb1"] .mvdia')).toHaveClass(/bad/);
  await expect(page.locator('[data-mvp="pa1"] .mvdia')).toHaveClass(/ok/);
  noErrors(errors, 'vincular');
});

const LINKS = [['mpl', 't0', { mp: 'pb1', by: 'x', t: 1 }], ['mpl', 'i0', { mp: 'pa1', by: 'x', t: 1 }]];

test('lookahead: ◆ verde o rojo en cada fila vinculada, solo para administrador y planner', async ({ page }) => {
  const errors = await openApp(page, { as: 'planner', tab: 'look', extra: [...MP, ...LINKS] });
  await page.selectOption('#fpiso', 'p1');
  const t0 = page.locator('#grid tr[data-a="t0"]');
  const dia = t0.locator(`td.d[data-d="${D(2)}"] .mpdia`); // el fin del maestro cae domingo: se marca el sábado
  await expect(dia).toHaveClass(/bad/);
  await expect(dia).toHaveAttribute('title', /fuera de plazo/);
  await expect(page.locator(`#grid tr[data-a="i0"] td.d[data-d="${D(9)}"] .mpdia`)).toHaveClass(/ok/); // fin el domingo D(10): se marca el sábado
  await expect(page.locator('#grid tr[data-a="e0"] .mpdia')).toHaveCount(0); // sin vincular
  // con el fin fuera de las semanas que se ven, la actividad lo dice con una flecha
  await page.click('#fwin [data-w="3"]');
  for (let i = 0; i < 3; i++) await page.click('#wprev');
  await expect(t0.locator('.mpbadge')).toHaveText(/◆→ /);
  await page.click('#wtoday');
  // en el maestro, la barra de tarrajeo toma el color de su SC y marca hasta dónde llega el lookahead
  await page.locator('#tabs button[data-tab="maestro"]').click();
  await expect(page.locator('tr.maer[data-id="pb1"] .maebar')).toHaveAttribute('style', /background:#558855/);
  await expect(page.locator('tr.maer[data-id="pb1"] .maelk')).toHaveCount(1);
  // se puede ocultar
  await page.locator('#tabs button[data-tab="look"]').click();
  await page.click('#fmore');
  await page.locator('#fmph').uncheck();
  await expect(page.locator('#grid .mpdia')).toHaveCount(0);
  noErrors(errors, 'lookahead planner');
});

for (const as of ['editor', 'sc']) {
  test(`${as}: no ve el ◆ del maestro ni lee los vínculos`, async ({ page }) => {
    const errors = await openApp(page, { as, tab: 'look', extra: [...MP, ...LINKS] });
    await expect(page.locator('#grid tr[data-a="t0"]')).toHaveCount(1);
    await expect(page.locator('#grid .mpbadge, #grid .mpdia')).toHaveCount(0);
    await expect(page.locator('#lmph')).toBeHidden();
    expect(await page.evaluate(() => MPL.size)).toBe(0);
    noErrors(errors, as);
  });
}

test('Excel del plan maestro: lo que se ve, con el estado frente al lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'maestro', extra: [...MP, ...LINKS] });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.selectOption('#fpiso', '');
  await page.click('[data-mvista="part"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#maexls')]);
  const wb = XLSX.readFile(await dl.path(), { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['Plan maestro'], { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
  expect(rows[3].slice(0, 3)).toEqual(['ITEM', 'DESCRIPCIÓN', 'PISO']);
  const tar = rows.find(r => r[0] === 'F' && String(r[1]).includes('PISO 01') && rows[rows.indexOf(r) - 1]?.[1]?.includes('Tarrajeo'));
  expect(tar).toBeTruthy();
  expect(tar[9]).toBe('SC TARRAJEO');
  expect(+tar[11]).toBeGreaterThan(0); // desfase en días hábiles
  expect(rows.some(r => r[0] === 'C.3' && r[1] === 'ACABADOS')).toBe(true);
  noErrors(errors, 'excel');
});

test('vincular sin partidas del piso: explica por qué y ofrece importar de nuevo', async ({ page }) => {
  // el maestro solo tiene partidas del piso 2 (al importar, «PISO 01» no se emparejó)
  const errors = await openApp(page, { as: 'planner', tab: 'maestro', extra: [MP[0], MP[1], MP[3]] });
  await page.selectOption('#fpiso', 'p1');
  await page.click('#maevinc');
  const r = page.locator('#mvr');
  await expect(r).toContainText('Ninguna partida del maestro es de P1');
  await expect(r).toContainText('P2 (1)');
  await expect(r.locator('#mvxl')).toHaveCount(1);
  noErrors(errors, 'vincular vacío');
});
