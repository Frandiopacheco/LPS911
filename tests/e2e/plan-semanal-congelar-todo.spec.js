// Plan semanal: «Congelar todos los pisos» congela de una vez los pisos sin congelar (oct 2026, pedido del dueño)
// y la píldora «N propuestas fuera al congelar» muestra cuáles eran y su estado de ahora.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, MANANA } from './helpers.js';

const A1 = ['acts', 'z1', { ambId: 'a1', sc: 'c1', name: 'Pintura P1', days: [MANANA], order: 90 }];
const A3 = ['acts', 'z3', { ambId: 'a3', sc: 'c1', name: 'Pintura P2', days: [MANANA], order: 90 }];

test('congela todos los pisos sin congelar, con una sola confirmación', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [A1, A3] });
  const n = await page.evaluate(() => U.week);
  const btn = page.locator('#bfzall');
  await expect(btn).toContainText('Congelar todos los pisos (2)');
  let asks = 0; page.on('dialog', d => { asks++; d.accept(); });
  await btn.click();
  await expect.poll(() => page.evaluate(n => ['p1', 'p2'].map(p => !!(window.__dbGet('weeks', n + '_' + p) || {}).frozenAt), n)).toEqual([true, true]);
  const w = await page.evaluate(n => window.__dbGet('weeks', n + '_p2'), n);
  expect(Object.keys(w.items)).toContain('z3');
  expect(asks).toBe(1);
  await expect(page.locator('#bfzall')).toHaveCount(0);
  noErrors(errors, 'congelar todo');
});

test('la píldora de propuestas fuera al congelar lista cuáles eran y si siguen pendientes', async ({ page }) => {
  const W = ['weeks', '59_p1', { n: 59, pisoId: 'p1', frozenAt: '2026-10-11T04:00:00.000Z', auto: true, items: {}, res: {}, propOut: ['c1/z1'], propOutT: { 'c1/z1': Date.parse('2026-10-10T15:00:00.000Z') } }];
  const P = ['lhprop', 'c1', { sc: 'c1', items: { z1: { after: { ambId: 'a1', sc: 'c1', name: 'Pintura P1', days: [MANANA] }, base: null, sent: true, sentAt: 1, ts: 1 } } }];
  const errors = await openApp(page, { tab: 'plan', extra: [A1, W, P] });
  await page.evaluate(() => { U.week = 59; render(); });
  const msgs = []; page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  await page.locator('section[data-pid="p1"] [data-propout]').click();
  await expect.poll(() => msgs.length).toBe(1);
  expect(msgs[0]).toContain('Pintura P1');
  expect(msgs[0]).toContain('Sigue pendiente');
  noErrors(errors, 'propuestas fuera');
});
