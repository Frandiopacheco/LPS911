// Terminadas: el Lookahead oculta solo lo confirmado como Terminado en la Matriz; lo marcado en Campo sin confirmar queda «✓?».
// Foto del plan diario con SC y ambiente (hallazgo 6). Confirmación al marcar «Terminada».
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mamb', 'a1', { c: { k1: 't' }, by: 'x', t: 1 }], // a1: confirmado terminado
  ['doneidx', 'p1', { d: { i0: '2026-09-30', i1: '2026-09-30' } }], // i0 (a1) e i1 (a2) terminadas en Campo
];

test('lookahead: oculta la terminada confirmada; la no confirmada queda con ✓? y se confirma desde ahí', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: CAT });
  await expect(page.locator('#grid tr[data-a="i1"]')).toHaveCount(1);
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(0);
  await expect(page.locator('#fdone')).toContainText('1 terminada oculta');
  await expect(page.locator('#grid [data-mxd="i1"]')).toHaveCount(1);
  // «Ver terminadas» la vuelve a mostrar
  await page.click('#fdone button');
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(1);
  await page.click('#fdone button');
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(0);
  // confirmar i1 en la Matriz → se oculta
  await page.click('#grid [data-mxd="i1"]');
  await expect(page.locator('#pop')).toContainText('por validar');
  await page.click('#pop [data-do="ok"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('mamb', 'a2') || {}).c)).toEqual({ k1: 't' });
  await expect(page.locator('#grid tr[data-a="i1"]')).toHaveCount(0);
  noErrors(errors, 'terminadas y matriz');
});

test('marcar «Terminada» pide confirmar; si no, no se marca', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'campo' });
  page.once('dialog', d => d.dismiss());
  expect(await page.evaluate(() => askDone('t0', todayIso()))).toBe(false);
  expect(await page.evaluate(() => DONE.has('t0'))).toBe(false);
  page.once('dialog', d => { expect(d.message()).toContain('todo el ambiente'); d.accept(); });
  expect(await page.evaluate(() => askDone('t0', todayIso()))).toBe(true);
  noErrors(errors, 'confirmar terminada');
});

test('PPC diario: el SC y el ambiente salen de la foto publicada (no de la actividad vigente)', async ({ page }) => {
  const AYER = '2026-09-30';
  const SNAP = ['dplan', `${AYER}_p1`, { date: AYER, pisoId: 'p1', ids: { e0: 10 }, who: { e0: { sc: 'c9', amb: 'a2' } }, pub: 'pub_x' }];
  const errors = await openApp(page, { tab: 'ind', extra: [SNAP] });
  await page.evaluate(d => ensureDaily(d), AYER);
  await expect.poll(() => page.evaluate(d => !!dplanOf(d, 'p1'), AYER)).toBe(true);
  const r = await page.evaluate(d => dayData([d], new Set(['p1'])).rows.filter(x => x.x.id === 'e0').map(x => [x.sc, x.a.id]), AYER);
  expect(r).toEqual([['c9', 'a2']]);
  noErrors(errors, 'foto con who');
});

test('matriz: si Campo la marcó terminada y la matriz dice otra cosa, la celda lo señala y se reabre desde ahí', async ({ page }) => {
  const X = [CAT[0], ['mamb', 'a1', { c: { k1: 'c' }, by: 'x', t: 1 }], ['doneidx', 'p1', { d: { i0: '2026-09-30' } }]];
  const errors = await openApp(page, { tab: 'mat', extra: X });
  const td = page.locator('#mxt tr[data-amb="a1"] td.mc.dsc');
  await expect(td).toHaveCount(1);
  await td.click();
  await expect(page.locator('#pop')).toContainText('marcaron terminada');
  await page.click('#pop [data-do="reo"]');
  await expect.poll(() => page.evaluate(() => DONE.has('i0'))).toBe(false);
  noErrors(errors, 'discrepancia en la matriz');
});
