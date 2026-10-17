// Editar los días al revisar propuestas (caso real, semana del 12 oct 2026):
// 1) editar una fila borraba en silencio lo editado en otra (solo se guardaba una fila a la vez);
// 2) quitar todos los días para elegir otros más adelante rechazaba la fila entera.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const D = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13'];
const A = (n, o) => ({ ambId: 'a1', sc: 'c1', name: n, und: 'm2', metrado: 30, days: [D[0]], order: o });
const it = (base, days) => ({ after: { ...base, days }, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: Date.parse('2026-09-30T10:00:00-05:00') });
const extra = [['acts', 'r1', A('Tarrajeo', 300)], ['acts', 'r2', A('Empaste', 301)], ['acts', 'r3', A('Pintura', 302)],
  ['lhprop', 'c1', { sc: 'c1', items: { r1: it(A('Tarrajeo', 300), [D[1], D[2]]), r2: it(A('Empaste', 301), [D[2], D[3]]), r3: it(A('Pintura', 302), [D[3]]) }, sentAt: 1, sentBy: 'Sandra' }]];
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
const onDays = (page, a) => page.evaluate(a => [...document.querySelectorAll(`#grid tr[data-a="${a}"] td.d.on`)].map(t => t.dataset.d), a);

async function review(page) {
  const errors = await openApp(page, { tab: 'look', extra });
  await page.locator('[data-pp="rev"]').first().click();
  await expect(page.locator('#grid tr.rvrow[data-a="r1"]')).toBeVisible();
  return errors;
}

test('los días editados se guardan por fila: editar otra fila no borra lo anterior y «Aceptar todo» usa cada edición', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r1', D[4]).click();
  await cell(page, 'r2', D[5]).click();
  await cell(page, 'r1', D[6]).click();
  expect(await onDays(page, 'r1')).toEqual([D[1], D[2], D[4], D[6]]);
  expect(await onDays(page, 'r2')).toEqual([D[2], D[3], D[5]]);
  page.once('dialog', d => d.accept());
  await page.locator('[data-rvall]').click();
  await expect.poll(() => page.evaluate(() => Object.values(__dbGet('lhprop', 'c1').items).filter(Boolean).length)).toBe(0);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[1], D[2], D[4], D[6]]);
  expect((await page.evaluate(() => __dbGet('acts', 'r2'))).days).toEqual([D[2], D[3], D[5]]);
  expect((await page.evaluate(() => __dbGet('acts', 'r3'))).days).toEqual([D[3]]);
  noErrors(errors, 'editar varias filas');
});

test('quitar todos los días no rechaza la fila: queda vacía, no se acepta así y se eligen días nuevos', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r2', D[2]).click();
  await cell(page, 'r2', D[3]).click();
  expect(await onDays(page, 'r2')).toEqual([]);
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r2)).toBe(true);
  expect(Object.keys(await page.evaluate(() => __dbAll('lhphist')))).toHaveLength(0);
  await expect(page.locator('.rvpsel')).toContainText('sin días');
  // ✓ con la fila vacía: no acepta
  await page.locator('#grid tr[data-a="r2"] [data-rva="ok"]').click();
  await expect(page.locator('#toast')).toContainText('no tiene días');
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r2)).toBe(true);
  // elige días más adelante y acepta
  await cell(page, 'r2', D[5]).click();
  await cell(page, 'r2', D[6]).click();
  await page.locator('#grid tr[data-a="r2"] [data-rva="ok"]').click();
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'r2').days)).toEqual([D[5], D[6]]);
  noErrors(errors, 'vaciar una fila');
});

test('«Aceptar todo» deja pendiente la fila vacía; si el SC reenvía la fila, se descarta lo editado en ella', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r3', D[3]).click(); // r3 queda sin días
  await cell(page, 'r1', D[4]).click(); // r1 editada
  // el SC reenvía r1 con otra versión
  await page.evaluate(D => fcol('lhprop').doc('c1').set({ items: { r1: { ...__dbGet('lhprop', 'c1').items.r1, ts: 2, after: { ...__dbGet('lhprop', 'c1').items.r1.after, days: [D[5]] } } } }, { merge: true }), D);
  await expect(page.locator('#toast')).toContainText('reenvió');
  expect(await onDays(page, 'r1')).toEqual([D[5]]);
  page.once('dialog', d => d.accept());
  await page.locator('[data-rvall]').click();
  await expect.poll(() => page.evaluate(() => Object.keys(__dbGet('lhprop', 'c1').items).filter(k => __dbGet('lhprop', 'c1').items[k]))).toEqual(['r3']);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[5]]);
  noErrors(errors, 'aceptar todo con fila vacía');
});
