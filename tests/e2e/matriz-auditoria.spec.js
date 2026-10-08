// Auditoría de la Matriz (08/10/2026): regresiones de M01, M02, M03, M04, M05 y M09.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { const k = 'lps911.ui'; const u = JSON.parse(localStorage.getItem(k) || '{}'); u.mxOrd = 'az'; localStorage.setItem(k, JSON.stringify(u)); } catch (e) {} }); });

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
];
const colOf = (page, cat) => page.evaluate(c => MX.view.cols.findIndex(x => x.id === c), cat);
const cell = async (page, amb, cat) => page.locator(`#mxt tr[data-amb="${amb}"] td[data-k="${await colOf(page, cat)}"]`);

test('M09: arrastrar sobre celdas vacías no agrega actividades; el clic sí', async ({ page }) => {
  const extra = [...CAT, ['mcat', 'k9', { name: 'Prueba singular', sc: 'c1', cl: 't', al: ['prueba singular'], ord: 5 }], ['mamb', 'a1', { c: { k9: 'p' }, by: 'x', t: 1 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra });
  await page.evaluate(() => { U.piso = ''; render(); });
  await page.click('#mxedit');
  const a = await cell(page, 'a1', 'k9'), b = await cell(page, 'a2', 'k9');
  await a.hover(); await page.mouse.down(); await b.hover(); await page.mouse.up();
  expect(await page.evaluate(() => [...MX.sel])).toEqual(['a1|k9']);
  await page.keyboard.press('3');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c.k9)).toBe('t');
  expect(await page.evaluate(() => (__dbGet('mamb', 'a2') || {}).c)).toBeUndefined();
  noErrors(errors, 'arrastre');
});

test('M01: Deshacer no pisa lo que otra persona cambió después; M10: escribe en lote', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: [...CAT, ['mamb', 'a1', { c: { k2: 'p' }, by: 'x', t: 1 }]] });
  await page.evaluate(() => { U.piso = ''; render(); });
  await page.click('#mxedit');
  await page.evaluate(() => { MX.sel = new Set(['a1|k1', 'a1|k2']); mxApply('t'); });
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c)).toEqual({ k1: 't', k2: 't' });
  // otro ingeniero cambia k2 después
  await page.evaluate(() => fcol('mamb').doc('a1').set({ c: { k2: 'c' }, by: 'editor@obra.pe', t: 2 }, { merge: true }));
  await expect.poll(() => page.evaluate(() => MX.amb.get('a1').c.k2)).toBe('c');
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c)).toEqual({ k2: 'c' }); // k1 vuelve a sin confirmar; k2 queda «En curso»
  await expect(page.locator('#toast')).toContainText('cambió después');
  noErrors(errors, 'deshacer');
});

test('M05: el «Terminado» que pone el SC no oculta la fila del Lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [...CAT, ['doneidx', 'p1', { d: { i0: '2026-09-30' } }]] });
  await page.evaluate(() => mxScSet('a1', 'k1', 't'));
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a1') || {}).c)).toEqual({ k1: 't' });
  const m = await page.evaluate(() => __dbGet('mamb', 'a1'));
  expect(m.m.k1).toMatchObject({ sc: true, by: 'sc@obra.pe' });
  expect(await page.evaluate(id => __dbGet('mlog', id).st, m.l)).toBe('pend'); // la celda apunta a su constancia (M06)
  expect(await page.evaluate(() => mxDoneSt(S.act.get('i0')))).toBe('pend');
  noErrors(errors, 'terminado del SC');
});

const SCCHG = [...CAT, ['doneidx', 'p1', { d: { i0: '2026-09-30' } }],
  ['mamb', 'a1', { c: { k1: 't' }, m: { k1: { by: 'sc@obra.pe', n: 'Sandra', t: 5, sc: true } }, k: 'k1', l: 'l1', by: 'sc@obra.pe', t: 5 }],
  ['mlog', 'l1', { amb: 'a1', cat: 'k1', sc: 'c1', from: null, sugFrom: 'p', to: 't', conf: false, st: 'pend', by: 'sc@obra.pe', n: 'Sandra', t: 5 }]];

test('M04/M05: «✓ Visto» queda en la celda y recién ahí la terminada se oculta', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: SCCHG });
  await page.evaluate(() => { U.piso = ''; render(); });
  expect(await page.evaluate(() => mxDoneSt(S.act.get('i0')))).toBe('pend');
  await page.click('#mxlog');
  await page.click('[data-mxlok="l1"]');
  await expect.poll(() => page.evaluate(() => !!(__dbGet('mamb', 'a1').m.k1.ok))).toBe(true);
  expect(await page.evaluate(() => __dbGet('mlog', 'l1').st)).toBe('ok');
  expect(await page.evaluate(() => mxDoneSt(S.act.get('i0')))).toBe('ok');
  noErrors(errors, 'visto en la celda');
});

test('M04: el SC cambia algo que el ingeniero ya vio → sale destacado (conf)', async ({ page }) => {
  const extra = SCCHG.map(r => r[1] === 'a1' ? ['mamb', 'a1', { ...r[2], m: { k1: { ...r[2].m.k1, ok: { by: 'editor@obra.pe', n: 'Elena Editora', t: 6 } } } }] : r);
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra });
  await page.evaluate(() => mxScSet('a1', 'k1', 'c'));
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('mlog')).find(l => l.to === 'c'))).toMatchObject({ conf: true, confN: 'Elena Editora' });
  expect(await page.evaluate(() => __dbGet('mamb', 'a1').m.k1.ok)).toBeUndefined(); // el nuevo cambio borra el visto anterior
  noErrors(errors, 'conf tras visto');
});

test('M02: una fila de otro SC con el nombre de una actividad no alimenta la matriz; se puede pasar al SC del catálogo', async ({ page }) => {
  const extra = [...CAT, ['acts', 'cross', { ambId: 'a1', sc: 'c1', name: 'Tarrajeo de muros', und: 'm2', days: [], order: 40 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra });
  await page.evaluate(() => { U.piso = ''; render(); });
  expect(await page.evaluate(() => mxCells().get('a1').k2.acts)).toEqual(['t0']);
  expect(await page.evaluate(() => mxCatOf(S.act.get('cross')))).toBe('');
  await expect(page.locator('#mxsmis')).toBeVisible();
  await page.click('#mxsmis');
  await page.click('[data-mxsm="0"]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'cross').sc)).toBe('c3');
  expect(await page.evaluate(() => mxCells().get('a1').k2.acts.sort())).toEqual(['cross', 't0']);
  noErrors(errors, 'otro SC');
});

test('M03: cambiar el SC en el catálogo ofrece pasar sus filas del lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => mxCatSet('k2', 'sc', 'c2'));
  await expect.poll(() => page.evaluate(() => ['t0', 't1', 't2'].map(id => S.act.get(id).sc))).toEqual(['c2', 'c2', 'c2']);
  expect(await page.evaluate(() => __dbGet('mcat', 'k2').sc)).toBe('c2');
  expect(await page.evaluate(() => mxScMismatch().length)).toBe(0);
  noErrors(errors, 'cambiar SC del catálogo');
});
