// Los subcontratistas llenan su partida en la matriz (js/matriz-sc.js): cambio directo + constancia; el ingeniero revisa o revierte.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mamb', 'a2', { c: { k1: 'p' }, m: { k1: { by: 'editor@obra.pe', n: 'Elena Editora', t: 1 } }, by: 'editor@obra.pe', t: 1 }],
];
const cell = async (page, amb, cat) => { const i = await page.evaluate(c => MX.view.cols.findIndex(x => x.id === c), cat); return page.locator(`#mxt tr[data-amb="${amb}"] td[data-k="${i}"]`); };

test('SC: cambia directo su partida (queda constancia), no la de otros; si contradice al ingeniero queda destacado', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; render(); });
  await (await cell(page, 'a1', 'k1')).click();
  await page.click('#pop button[data-s="t"][data-do="scs"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a1') || {}).c)).toEqual({ k1: 't' });
  const m = await page.evaluate(() => __dbGet('mamb', 'a1'));
  expect(m.k).toBe('k1'); expect(m.m.k1.sc).toBe(true);
  const l1 = await page.evaluate(() => Object.values(__dbAll('mlog')).find(l => l.amb === 'a1'));
  expect(l1).toMatchObject({ cat: 'k1', sc: 'c1', from: null, to: 't', conf: false, st: 'pend', by: 'sc@obra.pe' });
  // la de otro SC: solo la ficha
  await (await cell(page, 'a1', 'k2')).click();
  await expect(page.locator('#pop')).toContainText('Tarrajeo');
  await expect(page.locator('#pop [data-do="scs"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  // lo que confirmó el ingeniero (a2): se cambia igual, con conf
  await (await cell(page, 'a2', 'k1')).click();
  await page.click('#pop button[data-s="c"][data-do="scs"]');
  await expect.poll(() => page.evaluate(() => Object.values(__dbAll('mlog')).find(l => l.amb === 'a2')?.conf)).toBe(true);
  // Deshacer el propio cambio
  await page.click('#toast button');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a2').c.k1)).toBe('p');
  expect(await page.evaluate(() => Object.values(__dbAll('mlog')).find(l => l.amb === 'a2').st)).toBe('undo');
  noErrors(errors, 'SC en la matriz');
});

test('ingeniero: ve los cambios del SC en Hoy, revierte uno y da por visto otro', async ({ page }) => {
  const extra = [...CAT,
    ['mamb', 'a1', { c: { k1: 't' }, m: { k1: { by: 'sc@obra.pe', n: 'Sandra', t: 2, sc: true } }, k: 'k1', by: 'sc@obra.pe', t: 2 }],
    ['mamb', 'a3', { c: { k1: 'c' }, m: { k1: { by: 'sc@obra.pe', n: 'Sandra', t: 2, sc: true } }, k: 'k1', by: 'sc@obra.pe', t: 2 }],
    ['mlog', 'l1', { amb: 'a1', cat: 'k1', sc: 'c1', from: 'p', to: 't', conf: true, confN: 'Elena', st: 'pend', by: 'sc@obra.pe', n: 'Sandra', t: 2 }],
    ['mlog', 'l2', { amb: 'a3', cat: 'k1', sc: 'c1', from: null, sugFrom: 'p', to: 'c', conf: false, st: 'pend', by: 'sc@obra.pe', n: 'Sandra', t: 3 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'hoy', extra });
  await expect(page.locator('[data-hoy="mlog"]')).toContainText('Redes empotradas');
  await page.click('[data-hoy="mlog"] [data-hgo]');
  await expect(page.locator('#lqm')).toContainText('lo había confirmado Elena');
  await page.click('[data-mxlrev="l1"]');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c.k1)).toBe('p');
  expect(await page.evaluate(() => __dbGet('mlog', 'l1').st)).toBe('rev');
  await page.click('[data-mxlok="l2"]');
  await expect.poll(() => page.evaluate(() => __dbGet('mlog', 'l2').st)).toBe('ok');
  expect(await page.evaluate(() => __dbGet('mamb', 'a3').c.k1)).toBe('c');
  noErrors(errors, 'revisar cambios del SC');
});

test('recorrido del SC: solo su partida se puede tocar y no marca el ambiente revisado', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'rec'; render(); });
  await page.click('[data-mxra="a1"]');
  await expect(page.locator('[data-mxrc="k1"] [data-mxrs="t"]')).toBeEnabled();
  await expect(page.locator('[data-mxrc="k2"] [data-mxrs="t"]')).toBeDisabled();
  await expect(page.locator('#mxrok')).toHaveCount(0);
  await page.click('[data-mxrc="k1"] [data-mxrs="c"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a1') || {}).c?.k1)).toBe('c');
  noErrors(errors, 'recorrido SC');
});
