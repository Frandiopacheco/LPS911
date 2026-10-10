// Terminadas: el Lookahead oculta lo que la Matriz confirma como Terminado / No aplica (sin días después de hoy); lo de Campo no influye (10/10).
// Foto del plan diario con SC y ambiente (hallazgo 6). Confirmación al marcar «Terminada».
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mamb', 'a1', { c: { k1: 't' }, by: 'x', t: 1 }], // a1: confirmado terminado
  ['doneidx', 'p1', { d: { i0: '2026-09-30', i1: '2026-09-30' } }], // i0 (a1) e i1 (a2) terminadas en Campo
];

test('lookahead: solo la Matriz oculta; lo marcado en Campo no oculta ni pone «✓?»', async ({ page }) => {
  // a3: la Matriz dice No aplica y Campo nunca la cerró → también se oculta
  const errors = await openApp(page, { tab: 'look', extra: [...CAT, ['mamb', 'a3', { c: { k1: 'n' }, by: 'x', t: 1 }]] });
  await page.evaluate(() => { U.piso = ''; render(); });
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(0);
  await expect(page.locator('#grid tr[data-a="i2"]')).toHaveCount(0);
  // i1: terminada en Campo, la Matriz no dice nada → sigue a la vista y sin «✓?»
  await expect(page.locator('#grid tr[data-a="i1"]')).toHaveCount(1);
  await expect(page.locator('#grid [data-mxd]')).toHaveCount(0);
  await expect(page.locator('#fdone')).toContainText('2 terminadas ocultas');
  await page.click('#fdone button');
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(1);
  await page.click('#fdone button');
  // al confirmarla en la Matriz se oculta
  await page.evaluate(() => mxWrite(new Map([['a2', { k1: 't' }]]), 'ok'));
  await expect(page.locator('#grid tr[data-a="i1"]')).toHaveCount(0);
  // una fila con días después de hoy no se oculta (avisa con ⚠)
  await page.evaluate(() => { const x = S.act.get('i1'); apply([op('acts', 'i1', { ...x, days: [...x.days, '2026-10-05'] })]); });
  await expect(page.locator('#grid tr[data-a="i1"]')).toHaveCount(1);
  await expect(page.locator('#grid [data-mxw="i1"]')).toHaveCount(1);
  noErrors(errors, 'la Matriz manda');
});

test('la Matriz no toma lo de Campo como propuesta: sin confirmar queda Pendiente con aviso', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: [CAT[0], ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1'], order: 1 }], ['mamb', 'a2', { tipo: 'tp1', by: 'x', t: 1 }], CAT[2]] });
  await page.evaluate(() => { U.piso = ''; render(); });
  const o = await page.evaluate(() => mxCells().get('a2').k1);
  expect([o.s, o.sug, o.dsc]).toEqual(['p', true, true]);
  noErrors(errors, 'propuesta sin Campo');
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
