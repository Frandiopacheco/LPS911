// Plan diario: las actividades se ubican solas en su ambiente (Sectorización) y el plan se decide por excepción:
// Va · No va (restricción o personal) · Culminado, y se pueden programar otras actividades del lookahead.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab, HOY, MANANA } from './helpers.js';
import { LAMINA, enPantalla } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);

test('se arma para mañana, todo ubicado en su ambiente, y se decide por excepción', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await expect(page.locator('#mpanel .mp-h')).toContainText('02 oct'); // el día siguiente
  await expect(row(page, 'e0')).toContainText('en su ambiente');
  await expect(row(page, 'e1')).toContainText('en su ambiente');
  await expect(page.locator('#mstage .pvl.nb')).toHaveCount(2); // numeradas sobre su ambiente
  await expect(page.locator('#mpanel')).not.toContainText('sin ubicar');
  // No va › Personal: se reprograma solo esta al siguiente día hábil
  const sig = await page.evaluate(d => wshift(d, 1), MANANA);
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nv="per"]').click();
  await expect(page.locator('#pop [data-to].on')).toHaveCount(1);
  await page.locator('#pop .nvok').click();
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual([HOY, sig]);
  await expect(row(page, 'e0')).toHaveCount(0);
  await expect(page.locator('#mpanel')).toContainText('Reprogramadas en este plan');
  await expect(page.locator('#mpanel .mp-it.rpg')).toContainText('Sin personal');
  // programar otra actividad del lookahead este día
  await page.click('#dzadd');
  await page.fill('#dzq', 'tarrajeo');
  await page.locator('#pop .dzpl button:not([hidden])').first().click();
  await expect.poll(async () => (await act(page, 't0')).days).toContain(MANANA);
  await expect(row(page, 't0')).toBeVisible();
  // al volver a Campo, el día vuelve a hoy
  await openTab(page, 'campo');
  await expect(page.locator('#main')).toContainText('hoy');
  noErrors(errors, 'plan diario');
});

test('en Campo › Plano las actividades salen numeradas en su ambiente', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: [...LAMINA, ...AMB] });
  await page.evaluate(() => { CU.view = 'plan'; render(); });
  await page.locator('[data-kp="p1"]').click();
  await expect(page.locator('#kplan .pvl.nb')).toHaveCount(4); // i0, e0 (A-1) e i1, e1 (A-2) hoy
  await expect(page.locator('#klist')).not.toContainText('Sin ubicar');
  noErrors(errors, 'campo');
});

test('reunión: «sin interferencia» quita el achurado del cruce', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday'); // hoy: en A-1 trabajan SANITARIAS (Redes) y ELÉCTRICAS (Entubado)
  // los cruces van en un recuadro a la derecha del plano, plegado; el panel izquierdo ya no los lista
  await expect(page.locator('#mcxb .mcxh')).toContainText('Dos partidas en el mismo lugar');
  await expect(page.locator('#mpanel .mp-cx')).toHaveCount(0);
  await page.click('#mcxb .mcxh');
  await expect(page.locator('#mcxb .mp-cx').first()).toBeVisible();
  const n0 = await page.locator('#mcxb .mp-cx').count();
  const p = await enPantalla(page, '#mstage', 200, 200);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.click('#pop [data-do="ok"]');
  await expect(page.locator('#mcxb .mp-cx')).toHaveCount(n0 - 1);
  expect(await page.evaluate(() => Object.values(window.__dbAll('pdz')).filter(z => z.kind === 'xok').length)).toBe(1);
  noErrors(errors, 'cruce');
});

test('resaltar solo al subcontratista elegido viene marcado y se mantiene al cambiar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday');
  await page.locator('#mpanel [data-dzsc="c1"]').click();
  await expect(page.locator('#mscv')).toBeChecked();
  await page.locator('#mpanel [data-dzsc="c2"]').click();
  await expect(page.locator('#mscv')).toBeChecked();
  expect(await page.evaluate(() => window.__plano.M.scDraw)).toBe('c2');
  await page.locator('#mscv').uncheck();
  await page.locator('#mpanel [data-dzsc="c1"]').click();
  await expect(page.locator('#mscv')).not.toBeChecked();
  noErrors(errors, 'resaltar');
});

const T1 = ['acts', 's9', { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: [MANANA], order: 15 }];
const pdz = page => page.evaluate(() => Object.values(window.__dbAll('pdz')));

test('No va › restricción que no se libera: se registra y se mueve todo el tren del ambiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  const t1 = (await act(page, 't1')).days;
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nv="res"]').click();
  await page.fill('#nvd', 'Falta levantar el muro');
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop [data-tr="1"]').click(); // todo el tren: Entubado y Tarrajeo de A-2
  await expect(page.locator('#pop')).toContainText('Tarrajeo');
  const to = await page.evaluate(d => wshift(d, 2), MANANA);
  await page.locator(`#pop [data-to="${to}"]`).click();
  await page.locator('#pop .nvok').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e1').map(r => [r.desc, r.status]))).toEqual([['Falta levantar el muro', 'pend']]);
  const e1 = await act(page, 'e1');
  expect(e1.days).toEqual([HOY, to]);
  expect((await act(page, 't1')).days).toEqual(await page.evaluate(([L, n]) => L.map(d => wshift(d, n)), [t1, 2]));
  expect((await act(page, 't0')).days).toEqual(t1); // el otro ambiente no cambia
  // deshacer devuelve todo
  await page.locator('#toast button', { hasText: 'Deshacer' }).click();
  await expect.poll(async () => (await act(page, 'e1')).days).toEqual([HOY, MANANA]);
  expect((await act(page, 't1')).days).toEqual(t1);
  noErrors(errors, 'tren');
});

test('No va › restricción que se libera a primera hora: va con aviso en el plano', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nv="res"]').click();
  await page.fill('#nvd', 'Retirar material apilado de drywall');
  await page.locator('#pop [data-nv="lib"]').click();
  await expect(row(page, 'e0').locator('.dzav')).toContainText('Retirar material apilado');
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  expect((await pdz(page)).filter(z => z.kind === 'aviso').map(z => z.desc)).toEqual(['Retirar material apilado de drywall']);
  expect(await page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e0').length)).toBe(0);
  noErrors(errors, 'aviso');
});

test('el subcontratista solo propone: queda en espera y no cambia el lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1] });
  await row(page, 's9').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nv="res"]').click();
  await expect(page.locator('#pop [data-nv="nolib"]')).toHaveCount(0); // eso lo decide el ingeniero
  await page.fill('#nvd', 'Material de otra partida en el ambiente');
  await page.locator('#pop [data-nv="prop"]').click();
  await expect(row(page, 's9')).toHaveClass(/wait/);
  await expect(row(page, 's9').locator('.dzp')).toContainText('lo decide el ingeniero');
  await expect(page.locator('#mpdb')).toContainText('Tus propuestas');
  const p = (await pdz(page)).filter(z => z.kind === 'dprop');
  expect(p.map(z => [z.actId, z.k, z.st, z.sc])).toEqual([['s9', 'res', 'pend', 'c1']]);
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  // vuelve a «Va»: se retira la propuesta
  await row(page, 's9').locator('[data-dv^="va"]').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'dprop').length).toBe(0);
  noErrors(errors, 'sc propone');
});

test('en la reunión el ingeniero acepta o rechaza lo propuesto', async ({ page }) => {
  const prop = (k, desc) => ['pdz', `dp_${MANANA}_s9`, { date: MANANA, pisoId: 'p1', sc: 'c1', kind: 'dprop', actId: 's9', ambId: 'a1', k, desc, st: 'pend', by: 'sc@obra.pe', byName: 'Sandra Sanitarias', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('per', '')] });
  await expect(page.locator('#mpdb')).toContainText('Por decidir en la reunión');
  await expect(page.locator('#mpdb .mpdi')).toContainText('Sin personal');
  await expect(row(page, 's9').locator('.dzp')).toContainText('SC SANITARIAS propone');
  // aceptar: pasa a reprogramar con el motivo ya elegido
  await page.locator('#mpdb [data-dpa]').click();
  await expect(page.locator('#pop')).toContainText('Sin personal');
  await page.locator('#pop .nvok').click();
  const sig = await page.evaluate(d => wshift(d, 1), MANANA);
  await expect.poll(async () => (await act(page, 's9')).days).toEqual([sig]);
  await expect.poll(async () => (await pdz(page)).find(z => z.kind === 'dprop').st).toBe('ok');
  await expect(page.locator('#mpdb')).toBeHidden();
  noErrors(errors, 'aceptar');
});

test('rechazar una propuesta: la actividad va', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, ['pdz', `dp_${MANANA}_s9`, { date: MANANA, pisoId: 'p1', sc: 'c1', kind: 'dprop', actId: 's9', ambId: 'a1', k: 'fin', desc: '', st: 'pend', by: 'sc@obra.pe', byName: 'Sandra', ts: 1 }]] });
  await row(page, 's9').locator('[data-dpr]').click();
  await expect(row(page, 's9').locator('.dzp.rej')).toContainText('va según lo programado');
  expect((await pdz(page)).find(z => z.kind === 'dprop').st).toBe('rej');
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  noErrors(errors, 'rechazar');
});
