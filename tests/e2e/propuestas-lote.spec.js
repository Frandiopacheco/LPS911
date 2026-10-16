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
    let tx = 0; const rt = db.runTransaction.bind(db); const q7 = PROP.get('c1').items.q7; /* antes del reflejo inmediato */
    db.runTransaction = async fn => { tx++; if (tx === 1) await fcol('lhprop').doc('c1').set({ items: { q7: { ...q7, ts: 2, after: { ...q7.after, metrado: 99 } } } }, { merge: true }); return rt(fn); };
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

/* caso real (16 oct 2026): «0 propuestas aceptadas · 1 porque el programa oficial cambió; 1 porque cambian días con el plan ya cerrado».
   El plan diario cambió hoy en lo oficial después de que el SC propuso, y otra propuesta quitaba hoy (plan cerrado). Ahora se aceptan
   las dos: lo de hoy (y lo pasado) queda como en lo oficial y lo de los días abiertos queda como propuso el SC. */
test('aceptar en lote: un cambio oficial en días cerrados no choca y los días cerrados quedan como estaban', async ({ page }) => {
  const { HOY, MANANA } = await import('./helpers.js');
  const B = days => ({ ambId: 'a1', sc: 'c1', name: 'Tarrajeo', und: 'm2', metrado: 30, days, order: 300 });
  const it = (after, base) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 });
  const extra = [
    /* r1: hoy salió del programa al publicar (No va) después de que el SC propuso pasar el lun 05 al mar 06 */
    ['acts', 'r1', B([MANANA, '2026-10-05'])],
    /* r2: el SC quita hoy (plan cerrado) y agrega el mar 06 */
    ['acts', 'r2', B([HOY, '2026-10-05'])],
    ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: {
      r1: it(B([HOY, MANANA, '2026-10-06']), B([HOY, MANANA, '2026-10-05'])),
      r2: it(B(['2026-10-05', '2026-10-06']), B([HOY, '2026-10-05'])) } }]];
  const errors = await openApp(page, { tab: 'look', extra });
  let asked = 0; page.on('dialog', d => { asked++; d.accept(); });
  await page.evaluate(() => decideMany([{ sc: 'c1', id: 'r1' }, { sc: 'c1', id: 'r2' }]));
  await expect(page.locator('#toast')).toContainText('2 propuestas aceptadas');
  expect(asked, 'sin preguntas: no hay choque en los días abiertos').toBe(0);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([MANANA, '2026-10-06']);
  expect((await page.evaluate(() => __dbGet('acts', 'r2'))).days).toEqual([HOY, '2026-10-05', '2026-10-06']);
  const left = await page.evaluate(() => Object.values(__dbGet('lhprop', 'c1').items).filter(Boolean).length);
  expect(left).toBe(0);
  noErrors(errors, 'lote con días cerrados');
});
