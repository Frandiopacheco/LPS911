// Plan maestro (paso 1): rol planner, pestaña con árbol y Gantt, edición manual, hitos amarrados y fijos, deshacer y archivar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, visibleTabs, expectTabOk } from './helpers.js';

const all = page => page.evaluate(() => window.__dbAll('mp'));
const vivos = async page => Object.entries(await all(page)).filter(([, n]) => !n.arch);

/* obra de ejemplo: un capítulo con una partida en dos pisos y un hito amarrado a su fin */
const MP = [
  ['mp', 'w1', { tipo: 'wbs', parent: '', ord: 1, name: 'Acabados', code: 'C.3' }],
  ['mp', 'pa', { tipo: 'part', parent: 'w1', ord: 1, name: 'Muros de concreto', code: 'E1', ini: '2026-10-05', fin: '2026-11-30' }],
  ['mp', 'p1', { tipo: 'pp', parent: 'pa', ord: 1, name: 'Primer piso', pisoId: 'p1', ini: '2026-10-05', fin: '2026-10-30' }],
  ['mp', 'p2', { tipo: 'pp', parent: 'pa', ord: 2, name: 'Segundo piso', pisoId: 'p2', ini: '2026-10-20', fin: '2026-11-20' }],
  ['mp', 'd1', { tipo: 'det', parent: 'p1', ord: 1, name: 'Asentado de bloquetas', ini: '2026-10-05', fin: '2026-10-30' }],
  ['mp', 'h1', { tipo: 'hito', parent: '', ord: 1, name: 'Fin de albañilería', grp: 'intermedio', hk: { modo: 'amarrado', campo: 'fin', nodos: ['pa'] } }],
  ['mp', 'h2', { tipo: 'hito', parent: '', ord: 2, name: 'Fin contractual', grp: 'contractual', hk: { modo: 'fijo', fecha: '2026-09-01' } }],
];

test('planner: ve el plan maestro y el lookahead, pero no Equipo; solo lectura fuera del maestro', async ({ page }) => {
  const errors = await openApp(page, { as: 'planner', extra: MP });
  await page.evaluate(() => { U.mpVista = 'part'; });
  const tabs = await visibleTabs(page);
  expect(tabs).toContain('maestro');
  expect(tabs).toContain('look');
  expect(tabs).not.toContain('team');
  expect(await page.evaluate(() => ({ cw: canWrite, cd: canDaily }))).toEqual({ cw: false, cd: false });
  await page.locator('#tabs button[data-tab="maestro"]').click();
  await expectTabOk(page, 'maestro (planner)');
  // las fechas de la partida salen de sus pisos y el hito amarrado toma el fin de la partida
  const pa = page.locator('tr.maer[data-id="pa"]');
  await expect(pa.locator('.mk3')).toHaveText('05/10/26');
  await expect(pa.locator('.mk4')).toHaveText('20/11/26');
  await expect(page.locator('tr.maer[data-id="h1"] .mk4')).toHaveText('20/11/26');
  await expect(page.locator('tr.maer[data-id="h2"] .mk4')).toHaveText('01/09/26');
  // el detalle está oculto hasta marcar «Detalle»
  await expect(page.locator('tr.maer[data-id="d1"]')).toHaveCount(0);
  await page.locator('#maedet').check();
  await expect(page.locator('tr.maer[data-id="d1"]')).toHaveCount(1);
  // el piso elegido arriba filtra las partidas por piso
  await page.selectOption('#fpiso', 'p2');
  await expect(page.locator('tr.maer[data-id="p2"]')).toHaveCount(1);
  await expect(page.locator('tr.maer[data-id="p1"]')).toHaveCount(0);
  await page.selectOption('#fpiso', '');
  // en el Hoy aparece la tarjeta del plan maestro con el próximo hito
  await page.locator('#tabs button[data-tab="hoy"]').click();
  await expect(page.locator('[data-hoy="mp"]')).toContainText('Fin de albañilería');
  noErrors(errors, 'planner');
});

test('planner: crea a mano una partida con sus pisos, cambia fechas, deshace y archiva', async ({ page }) => {
  const errors = await openApp(page, { as: 'planner', tab: 'maestro' });
  await expect(page.locator('#main')).toContainText('Todavía no hay plan maestro');
  await page.selectOption('#fpiso', ''); // todos los pisos
  await page.click('#maeed');
  await page.click('#maeadd');
  await page.click('#pop [data-do="part"]');
  await expect.poll(async () => (await vivos(page)).length).toBe(1);
  const [[pid]] = await vivos(page);
  const nombre = page.locator(`[data-fk="mp:${pid}:name"]`);
  await expect(nombre).toBeFocused();
  await nombre.fill('Tabiquería drywall');
  await nombre.press('Enter');
  await nombre.blur();
  await expect.poll(async () => (await all(page))[pid].name).toBe('Tabiquería drywall');
  // agregar todos los pisos de una vez
  await page.click(`[data-mn="${pid}"]`);
  await page.click('#pop [data-do="app"]');
  await page.click('#pop [data-do="all"]');
  await expect.poll(async () => (await vivos(page)).filter(([, n]) => n.tipo === 'pp').map(([, n]) => n.pisoId).sort()).toEqual(['p1', 'p2']);
  const pp = (await vivos(page)).find(([, n]) => n.tipo === 'pp' && n.pisoId === 'p2')[0];
  // cambiar el fin de un piso mueve el fin de la partida
  await page.locator(`[data-fk="mp:${pp}:fin"]`).fill('2026-12-15');
  await page.locator(`[data-fk="mp:${pp}:fin"]`).dispatchEvent('change');
  await expect.poll(async () => (await all(page))[pp].fin).toBe('2026-12-15');
  await expect(page.locator(`tr.maer[data-id="${pid}"] .mk4`)).toHaveText('15/12/26');
  // un fin antes del inicio no se acepta
  await page.locator(`[data-fk="mp:${pp}:fin"]`).fill('2020-01-01');
  await page.locator(`[data-fk="mp:${pp}:fin"]`).dispatchEvent('change');
  await expect(page.locator('#toast')).toContainText('no puede ser antes');
  expect((await all(page))[pp].fin).toBe('2026-12-15');
  // Ctrl+Z deshace en el plan maestro
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await all(page))[pp].fin).not.toBe('2026-12-15');
  // archivar la partida archiva sus pisos; se recupera desde «Archivados»
  await page.click(`[data-mn="${pid}"]`);
  await page.click('#pop [data-do="arc"]');
  await expect.poll(async () => (await vivos(page)).length).toBe(0);
  expect(Object.keys(await all(page)).length).toBe(3); // no se borra nada
  await page.click('#maearc');
  await page.click('#pop [data-do="r"]');
  await expect.poll(async () => (await vivos(page)).length).toBe(3);
  noErrors(errors, 'planner edita');
});

test('hitos: amarrado a partidas se mueve con ellas; fijo guarda su fecha', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'maestro', extra: MP.slice(0, 4) });
  await page.evaluate(() => { U.mpVista = 'part'; render(); });
  await page.click('#maeed');
  await page.click('#maeadd');
  await page.click('#pop [data-do="hito"]');
  await page.fill('#mhn', 'Fin de muros piso 1');
  await page.selectOption('#mhg', 'planificado');
  await page.fill('#mhq', 'primer');
  await page.locator('.maehk:not([hidden]) input[value="p1"]').check();
  await expect(page.locator('#mhres')).toHaveText('30/10/26');
  await page.click('[data-mhok]');
  await expect.poll(async () => Object.values(await all(page)).find(n => n.tipo === 'hito')?.hk).toEqual({ modo: 'amarrado', campo: 'fin', nodos: ['p1'] });
  const hid = Object.entries(await all(page)).find(([, n]) => n.tipo === 'hito')[0];
  await expect(page.locator(`tr.maer[data-id="${hid}"] .mk4`)).toHaveText('30/10/26');
  // si cambia el piso, el hito se mueve solo
  await page.locator('[data-fk="mp:p1:fin"]').fill('2026-11-06');
  await page.locator('[data-fk="mp:p1:fin"]').dispatchEvent('change');
  await expect(page.locator(`tr.maer[data-id="${hid}"] .mk4`)).toHaveText('06/11/26');
  // pasarlo a fecha fija
  await page.click(`[data-he="${hid}"]`);
  await page.click('#mhm [data-m="fijo"]');
  await page.fill('#mhf', '2026-12-01');
  await page.click('[data-mhok]');
  await expect.poll(async () => (await all(page))[hid].hk).toEqual({ modo: 'fijo', fecha: '2026-12-01' });
  await expect(page.locator(`tr.maer[data-id="${hid}"] .mk4`)).toHaveText('01/12/26');
  noErrors(errors, 'hitos');
});

for (const as of ['editor', 'sc', 'lector', 'campo']) {
  test(`${as}: no ve el plan maestro ni carga sus datos`, async ({ page }) => {
    const errors = await openApp(page, { as, extra: MP });
    expect(await visibleTabs(page)).not.toContain('maestro');
    await expect(page.locator('#tabs button[data-tab="maestro"]')).toBeHidden();
    await page.evaluate(() => { location.hash = 'maestro'; U.tab = 'maestro'; render(); });
    await expect(page.locator('#main')).not.toHaveAttribute('data-view', 'maestro');
    expect(await page.evaluate(() => MPN.size)).toBe(0);
    await expect(page.locator('[data-hoy="mp"]')).toHaveCount(0);
    noErrors(errors, as);
  });
}

test('Equipo: el administrador puede dar el rol Planner', async ({ page }) => {
  await openApp(page, { as: 'admin', tab: 'team' });
  await expect(page.locator('#trole option[value="planner"]')).toHaveCount(1);
  await expect(page.locator('#main')).toContainText('Planners (plan maestro)');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('planner: el plan maestro se ve en el celular', async ({ page }) => {
    const errors = await openApp(page, { as: 'planner', extra: MP });
    await page.evaluate(() => { U.mpVista = 'part'; });
    await page.locator('#bnav [data-bt="maestro"]').click();
    await expectTabOk(page, 'maestro celular');
    await expect(page.locator('tr.maer[data-id="pa"]')).toBeVisible();
    noErrors(errors, 'celular planner');
  });
});
