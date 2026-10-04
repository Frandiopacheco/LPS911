// Lookahead y propuestas de subcontratistas: correcciones del informe externo (ChatGPT, 4 oct 2026).
// Los números de cada prueba son los del informe.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const PROJ = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' };
/* una actividad con metrado repartido por día */
const QACT = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 30, days: ['2026-10-01', '2026-10-02'], qty: { '2026-10-01': 10, '2026-10-02': 20 }, order: 40 };
/* propuesta enviada de c1 que corre i0 (piso 1) e i2 (piso 2) */
const prop = (items) => ['lhprop', 'c1', { sc: 'c1', items, sentAt: 1, sentBy: 'Sandra' }];
const item = (after, base) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: true, sentAt: 1 });
const I0 = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: ['2026-09-30', '2026-10-01'], order: 10 };
const I2 = { ...I0, ambId: 'a3', name: 'REDES EMPOTRADAS' };
const moved = (x, days) => ({ ...x, days });

async function lookMetrado(page) {
  await page.evaluate(() => { U.qmode = 'metrado'; gridRows = null; render(); });
}
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
async function revision(page) {
  await page.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  await expect(page.locator('#ppbar .ppb.rv')).toBeVisible();
}

test('1 · una cantidad que no es número no borra los días ni sus cantidades', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q1', QACT]] });
  await lookMetrado(page);
  const a = cell(page, 'q1', '2026-10-01'), b = cell(page, 'q1', '2026-10-02');
  const ba = await a.boundingBox(), bb = await b.boundingBox();
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 4 }); await page.mouse.up();
  await page.fill('#qper', '10 m2');
  await page.click('#pop [data-do="per"]');
  await expect(page.locator('#toast')).toContainText('Escribe solo números');
  const x = await page.evaluate(() => __dbGet('acts', 'q1'));
  expect(x.days).toEqual(QACT.days);
  expect(x.qty).toEqual(QACT.qty);
  noErrors(errors, 'cantidad inválida');
});

test('13 · poner cantidad después de la fecha de terminada reabre la actividad', async ({ page }) => {
  const done = { ...QACT, days: ['2026-09-29', '2026-09-30'], qty: { '2026-09-29': 10, '2026-09-30': 10 } };
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q1', done], ['doneidx', 'p1', { d: { q1: '2026-09-30' } }]] });
  expect(await page.evaluate(() => DONE.get('q1'))).toBe('2026-09-30');
  await lookMetrado(page);
  await cell(page, 'q1', '2026-10-02').click();
  await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'q1').qty['2026-10-02'])).toBe(5);
  await expect.poll(() => page.evaluate(() => (__dbGet('doneidx', 'p1').r || {}).q1)).toBe('2026-09-30');
  expect(await page.evaluate(() => DONE.has('q1'))).toBe(false);
  noErrors(errors, 'reabrir por metrado');
});

test('7 · «Aceptar todo lo visible» solo acepta lo que muestra la grilla con los filtros', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [prop({
    i0: item(moved(I0, ['2026-10-02', '2026-10-03']), I0), i2: item(moved(I2, ['2026-10-02', '2026-10-03']), I2) })] });
  await page.evaluate(() => { U.piso = 'p1'; });
  await revision(page);
  await expect(page.locator('#ppbar [data-rvall]')).toContainText('(1 de 2)');
  page.once('dialog', d => d.accept());
  await page.click('#ppbar [data-rvall]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'i0').days)).toEqual(['2026-10-02', '2026-10-03']);
  const p = await page.evaluate(() => __dbGet('lhprop', 'c1'));
  expect(p.items.i0).toBeNull();
  expect(p.items.i2 && p.items.i2.sent).toBe(true);
  expect((await page.evaluate(() => __dbGet('acts', 'i2'))).days).toEqual(I2.days);
  noErrors(errors, 'aceptar visibles');
});

test('8 · revisando una propuesta, tocar un día vacío no cambia el programa oficial', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [prop({ i0: item(moved(I0, ['2026-10-02']), I0) })] });
  await revision(page);
  await cell(page, 'i0', '2026-10-05').click();
  await expect(page.locator('#toast')).toContainText('Estás revisando esta propuesta');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(I0.days);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.sent).toBe(true);
  noErrors(errors, 'revisión sin edición directa');
});

test('9 · aceptar desplazando sobre un feriado junta los días sin perder cantidades', async ({ page }) => {
  const base = { ...I0, metrado: 30, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 15, '2026-10-06': 15 } };
  const after = { ...base, days: ['2026-10-07', '2026-10-08'], qty: { '2026-10-07': 10, '2026-10-08': 20 } };
  const errors = await openApp(page, { tab: 'look', extra: [['meta', 'project', { ...PROJ, cal: { hol: [{ d: '2026-10-08', n: 'Prueba' }] } }],
    ['acts', 'i0', base], prop({ i0: item(after, base) })] });
  await revision(page);
  await page.evaluate(() => revDecide('i0', 'shift', { start: '2026-10-09' }));
  await expect(page.locator('#toast')).toContainText('se juntó');
  const x = await page.evaluate(() => __dbGet('acts', 'i0'));
  expect(x.days).toEqual(['2026-10-09']);
  expect(x.qty).toEqual({ '2026-10-09': 30 });
  noErrors(errors, 'desplazar con feriado');
});

test('16 · el SC no puede duplicar ni crear ambientes en modo propuesta', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  await page.click('#grid [data-ambmenu="a1"]');
  await expect(page.locator('#pop')).toContainText('+ Actividad al final');
  await expect(page.locator('#pop [data-do="dup"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const n0 = await page.evaluate(() => Object.keys(__dbAll('ambientes')).length);
  await page.evaluate(() => dupAmb(S.amb.get('a1')));
  await expect(page.locator('#toast')).toContainText('modo propuesta');
  expect(await page.evaluate(() => Object.keys(__dbAll('ambientes')).length)).toBe(n0);
  expect(await page.evaluate(() => Object.keys((__dbGet('lhprop', 'c1') || {}).items || {}).length)).toBe(0);
  noErrors(errors, 'SC sin duplicar ambiente');
});

test('17 · el SC no registra restricciones de una actividad que solo propuso', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  const id = await page.evaluate(() => { addAct('a1'); return [...S.act.keys()].find(k => !ACT_OFF.has(k)); });
  expect(id).toBeTruthy();
  const n0 = await page.evaluate(() => Object.keys(__dbAll('restr')).length);
  await page.evaluate(i => newRestr(i), id);
  await expect(page.locator('#toast')).toContainText('todavía es una propuesta');
  expect(await page.evaluate(() => Object.keys(__dbAll('restr')).length)).toBe(n0);
  /* de una actividad oficial de su partida sí puede */
  await page.evaluate(() => newRestr('i0'));
  await expect.poll(() => page.evaluate(() => Object.keys(__dbAll('restr')).length)).toBe(n0 + 1);
  noErrors(errors, 'restricción de actividad propuesta');
});
