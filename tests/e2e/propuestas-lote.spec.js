// Aceptar varias propuestas de un SC (oct 2026): una transacción por subcontratista, no una por propuesta (antes tardaba
// ~medio segundo por propuesta). La que el SC cambió mientras tanto queda pendiente.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const N = 30, SAT = Date.parse('2026-10-03T12:00:00-05:00');
const A = i => ({ ambId: 'a' + (1 + i % 2), sc: 'c1', name: 'Montantes ' + i, und: 'ml', metrado: 30, days: ['2026-10-05'], qty: { '2026-10-05': 10 }, order: 100 + i });
const acts = [...Array(N)].map((_, i) => ['acts', 'q' + i, A(i)]);
const items = Object.fromEntries([...Array(N)].map((_, i) => ['q' + i, { after: { ...A(i), days: ['2026-10-06'], qty: { '2026-10-06': 10 } }, base: A(i), ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: SAT }]));

test('aceptar 30 propuestas: una sola transacción; la que el SC cambió entretanto queda pendiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...acts, ['lhprop', 'c1', { sc: 'c1', items, sentAt: SAT, sentBy: 'Sandra' }]] });
  const n = await page.evaluate(async N => {
    let tx = 0; const rt = db.runTransaction.bind(db);
    db.runTransaction = async fn => { tx++; if (tx === 1) await fcol('lhprop').doc('c1').set({ items: { q7: { ...PROP.get('c1').items.q7, ts: 2, after: { ...PROP.get('c1').items.q7.after, metrado: 99 } } } }, { merge: true }); return rt(fn); };
    const L = [...Array(N)].map((_, i) => ({ sc: 'c1', id: 'q' + i }));
    await decideMany(L); db.runTransaction = rt; return tx;
  }, N);
  expect(n).toBe(1);
  const days = await page.evaluate(N => [...Array(N)].map((_, i) => __dbGet('acts', 'q' + i).days[0]), N);
  expect(days.filter(d => d === '2026-10-06')).toHaveLength(N - 1);
  expect(days[7]).toBe('2026-10-05');
  expect(Object.keys(await page.evaluate(() => __dbAll('lhphist')))).toHaveLength(N - 1);
  const left = await page.evaluate(() => Object.entries(__dbGet('lhprop', 'c1').items).filter(([, v]) => v).map(([k]) => k));
  expect(left).toEqual(['q7']);
  await expect(page.locator('#toast')).toContainText('29 propuestas aceptadas');
  await expect(page.locator('#toast')).toContainText('el SC las cambió');
  noErrors(errors, 'aceptar en lote');
});
