// P9 (oct 2026): motivo obligatorio cuando el SC propone alargar, atrasar o quitar una actividad. El ingeniero lo ve, va al
// historial, el rechazo deja la advertencia (lhprop.adv) que al congelar se marca «el SC advirtió» (weeks.adv) y, al marcar
// «No» en el Plan semanal, sugiere la imputabilidad (causa de obra = no imputable).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const L5 = '2026-10-05', M6 = '2026-10-06', X7 = '2026-10-07', J8 = '2026-10-08';
const A0 = { ambId: 'a1', sc: 'c1', name: 'Montantes', und: 'ml', metrado: null, days: [L5, M6], order: 50 };
const A1 = { ambId: 'a1', sc: 'c1', name: 'Aparatos', und: 'und', metrado: null, days: [M6], order: 51 };
const ACTS = [['acts', 'q0', A0], ['acts', 'q1', A1]];
const FRE = { k: 'fre', g: 'o', t: 'Frente no entregado' };
const sent = (after, base, o = {}) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: true, sentAt: Date.parse('2026-10-01T10:00:00-05:00'), ...o });

test('qué propuestas piden motivo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: ACTS });
  const k = await page.evaluate(([L5, M6, X7, J8]) => {
    const off = __dbGet('acts', 'q0'); const w = days => propNeedsWhy({ after: { ...off, days } }, off);
    return [w([M6, X7]), w([L5, M6, X7]), w([L5]), w([L5, M6]), propNeedsWhy({ after: null }, off), propNeedsWhy({ after: { ...off, days: [J8] } }, null)];
  }, [L5, M6, X7, J8]);
  expect(k).toEqual(['atrasa', 'alarga', '', '', 'quita', '']);
  noErrors(errors, 'qué piden motivo');
});

test('el SC no envía sin motivo; con motivo queda en su propuesta', async ({ page }) => {
  const draft = { after: { ...A0, days: [M6, X7] }, base: A0, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: false };
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [...ACTS, ['lhprop', 'c1', { sc: 'c1', items: { q0: draft } }]] });
  await expect.poll(() => page.evaluate(() => typeof sendProp === 'function' && PROP.has('c1'))).toBe(true);
  await page.evaluate(() => { sendProp(); });
  await expect(page.locator('#pwhy')).toBeVisible();
  await expect(page.locator('#pwhy .pwr')).toHaveCount(1);
  await page.locator('#pwhy [data-pwok]').click();
  await expect(page.locator('#pwhy .pwerr')).toBeVisible();
  await page.selectOption('#pwhy [data-pwall]', 'fre');
  await page.locator('#pwhy [data-pwok]').click();
  await expect(page.locator('#pwhy')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (__dbGet('lhprop', 'c1').items.q0 || {}).sent)).toBe(true);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1').items.q0)).why).toEqual(FRE);
  noErrors(errors, 'motivo del SC');
});

test('rechazar con motivo deja la advertencia; al congelar se marca y el «No» sugiere no imputable', async ({ page }) => {
  const items = { q0: sent({ ...A0, days: [M6, X7] }, A0, { why: FRE }), q1: sent({ ...A1, days: [X7] }, A1, { why: { k: 'per', g: 'p', t: 'Falta de personal' } }) };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, ['lhprop', 'c1', { sc: 'c1', items, adv: { q1: { k: 'per', g: 'p', t: 'Falta de personal' } } }]] });
  await expect.poll(() => page.evaluate(() => PROP.has('c1'))).toBe(true);
  expect(await page.evaluate(() => decideProp('c1', 'q0', 'rej', { why: 'Fuera de secuencia' }))).toBe('ok');
  const p = await page.evaluate(() => __dbGet('lhprop', 'c1'));
  expect(p.adv.q0).toMatchObject(FRE);
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist'))).find(o => o.actId === 'q0');
  expect(h.swhy).toEqual(FRE);
  // aceptar quita la advertencia que había
  expect(await page.evaluate(() => decideProp('c1', 'q1', 'ok'))).toBe('ok');
  expect('q1' in ((await page.evaluate(() => __dbGet('lhprop', 'c1'))).adv || {})).toBe(false);
  // congelar la semana 59: q0 (rechazada con motivo) queda con adv
  await page.evaluate(() => { PROP.set('c1', { ...__dbGet('lhprop', 'c1'), id: 'c1' }); });
  page.on('dialog', d => d.accept()); // avisos al congelar (restricciones abiertas de la obra de prueba)
  expect(await page.evaluate(() => freezeWeek(59, 'p1', null, null, { pend: [], quiet: true }))).toBe('ok');
  const w = await page.evaluate(() => __dbGet('weeks', '59_p1'));
  expect(w.adv.q0).toMatchObject({ k: 'fre', g: 'o', src: 'rej' });
  // Plan semanal: chapita y «No» con imputabilidad sugerida
  await page.evaluate(() => { U.tab = 'plan'; U.week = 59; render(); });
  await expect(page.locator('tr[data-id="q0"] .advb')).toContainText('Frente no entregado');
  await page.locator('section[data-pid="p1"] tr[data-id="q0"] [data-yn="0"]').click();
  await expect.poll(() => page.evaluate(() => ((__dbGet('weeks', '59_p1').res || {}).q0 || {}).imp)).toBe(false);
  noErrors(errors, 'advertencia al congelar');
});
