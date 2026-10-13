// Revisión de propuestas por día (oct 2026, decidido con el dueño):
//  · lo que cae DESPUÉS del día en que el SC propuso, dentro de esa misma semana, no es «fuera de plazo»;
//  · el ingeniero puede dejar otros días al aceptar (clic en la grilla de revisión) y el motivo de rechazo se guarda aparte.
// Calendario de las pruebas: hoy jueves 1 oct (semana 58). Semana 59 = lun 5 a sáb 10 oct; su corte es el sáb 3 oct 13:00.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const T = s => Date.parse(s);
const THU8_1000 = T('2026-10-08T10:00:00-05:00'), SAT3_1259 = T('2026-10-03T12:59:00-05:00');
const A0 = { ambId: 'a1', sc: 'c1', name: 'Montantes', und: 'ml', metrado: 30, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 10, '2026-10-06': 20 }, order: 50 };
const ACTS = [['acts', 'q0', A0]];
const item = (after, base, sentAt) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: true, sentAt });
const props = (items, sentAt) => ['lhprop', 'c1', { sc: 'c1', items, sentAt, sentBy: 'Sandra' }];

test('1 · el viernes y el sábado de la semana en curso no son fuera de plazo; el día de la propuesta y los anteriores sí', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS] });
  const late = await page.evaluate(([sentAt, days]) => !!propLate({ sent: true, sentAt, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), days } }, null),
    [THU8_1000, ['2026-10-05', '2026-10-06', '2026-10-09']]);
  expect(late).toBe(false); // propuesto el jueves 8 para el viernes 9
  const sat = await page.evaluate(([sentAt, days]) => !!propLate({ sent: true, sentAt, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), days } }, null),
    [THU8_1000, ['2026-10-05', '2026-10-06', '2026-10-10']]);
  expect(sat).toBe(false); // y para el sábado 10
  const hoy = await page.evaluate(([sentAt, days]) => !!propLate({ sent: true, sentAt, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), days } }, null),
    [THU8_1000, ['2026-10-05', '2026-10-06', '2026-10-08']]);
  expect(hoy).toBe(true); // el mismo jueves 8 (día de la propuesta): sigue siendo tardío
  const antes = await page.evaluate(([sentAt, days]) => !!propLate({ sent: true, sentAt, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), days } }, null),
    [THU8_1000, ['2026-10-05', '2026-10-06', '2026-10-07']]);
  expect(antes).toBe(true); // un día anterior
  /* una semana siguiente cuyo corte aún no pasó (sáb 10, 13:00) tampoco es tardía */
  const sig = await page.evaluate(([sentAt, days]) => !!propLate({ sent: true, sentAt, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), days } }, null),
    [THU8_1000, ['2026-10-05', '2026-10-06', '2026-10-12']]);
  expect(sig).toBe(false);
  noErrors(errors, 'fuera de plazo por día');
});

test('2 · aceptar con otros días (lo que dejó el ingeniero): se guardan esos días y se descartan las cantidades de los quitados', async ({ page }) => {
  const after = { ...A0, days: ['2026-10-05', '2026-10-06', '2026-10-07'], qty: { '2026-10-05': 10, '2026-10-06': 20, '2026-10-07': 5 } };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: item(after, A0, SAT3_1259) }, SAT3_1259)] });
  expect(await page.evaluate(() => decideProp('c1', 'q0', 'ok', { days: ['2026-10-06', '2026-10-07', '2026-10-08'] }))).toBe('ok');
  const a = await page.evaluate(() => __dbGet('acts', 'q0'));
  expect(a.days).toEqual(['2026-10-06', '2026-10-07', '2026-10-08']);
  expect(a.qty).toEqual({ '2026-10-06': 20, '2026-10-07': 5 });
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(h).toHaveLength(1);
  expect(h[0]).toMatchObject({ sc: 'c1', actId: 'q0', st: 'ok' });
  expect(h[0].to).toContain('08');
  /* la propuesta ya no está pendiente */
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.q0 ?? null).toBeNull();
  noErrors(errors, 'aceptar con otros días');
});

test('3 · rechazar con motivo de un toque lo deja en el historial (campo aparte) y no cambia el lookahead', async ({ page }) => {
  const after = { ...A0, days: ['2026-10-05', '2026-10-06', '2026-10-07'] };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: item(after, A0, SAT3_1259) }, SAT3_1259)] });
  expect(await page.evaluate(() => decideProp('c1', 'q0', 'rej', { why: 'Fuera de secuencia' }))).toBe('ok');
  expect((await page.evaluate(() => __dbGet('acts', 'q0'))).days).toEqual(A0.days);
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(h).toHaveLength(1);
  expect(h[0]).toMatchObject({ st: 'rej', why: 'Fuera de secuencia', note: '' });
  noErrors(errors, 'rechazo con motivo');
});

test('4 · «Aceptar todo lo visible» acepta con los cambios la fila que ajustaste y las demás como vinieron', async ({ page }) => {
  const A1 = { ...A0, ambId: 'a2', name: 'Colgadores' };
  const p0 = { ...A0, days: ['2026-10-05', '2026-10-06', '2026-10-07'], qty: { '2026-10-05': 10, '2026-10-06': 20 } };
  const p1 = { ...A1, days: ['2026-10-06', '2026-10-07'], qty: { '2026-10-06': 10 } };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, ['acts', 'q1', A1], props({ q0: item(p0, A0, SAT3_1259), q1: item(p1, A1, SAT3_1259) }, SAT3_1259)] });
  await page.evaluate(() => { U.rev = true; requestRender(); });
  /* el ingeniero deja q0 con otros días (vista previa) */
  await page.evaluate(() => { REVSEL = { sc: 'c1', id: 'q0', k: 0, days: ['2026-10-06', '2026-10-08'] }; requestRender(); });
  page.once('dialog', d => d.accept());
  await page.click('#rvpanel [data-rvall]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'q0').days)).toEqual(['2026-10-06', '2026-10-08']);
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'q1').days)).toEqual(['2026-10-06', '2026-10-07']);
  noErrors(errors, 'aceptar todo con cambios');
});

test('5 · quitar el último día de una fila la saca de la propuesta (se rechaza) y no cambia el lookahead', async ({ page }) => {
  const after = { ...A0, days: ['2026-10-05'], qty: { '2026-10-05': 30 } };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: item(after, A0, SAT3_1259) }, SAT3_1259)] });
  await page.evaluate(() => { U.rev = true; requestRender(); });
  await page.evaluate(() => revToggleDay('q0', '2026-10-05'));
  await expect.poll(async () => (await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.q0 ?? null).toBeNull();
  expect((await page.evaluate(() => __dbGet('acts', 'q0'))).days).toEqual(A0.days);
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(h[0]).toMatchObject({ st: 'rej' });
  noErrors(errors, 'quitar último día');
});
