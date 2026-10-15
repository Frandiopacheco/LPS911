// Plan semanal › «Desde versión…» (oct 2026, pedido del dueño): congelar un piso con los compromisos de una versión guardada
// del lookahead (p. ej. el autoguardado del domingo) en vez del lookahead vivo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const VID = 'auto-2026-10-04';
const SN = {
  secs: { s1: { pisoId: 'p1', code: 'S1', name: 'Sector 1', order: 1 } },
  ambs: { a1: { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0 }, a2: { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1 } },
  acts: {
    t0: { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-06', '2026-10-08'], qty: { '2026-10-06': 10, '2026-10-08': 5 }, order: 30 }, // días distintos al lookahead
    t1: { ambId: 'a2', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-06', '2026-10-07'], order: 30 }, // igual al lookahead
    i0: { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: ['2026-10-09', '2026-10-20'], order: 10 }, // solo en la versión
  },
};
const VER = [
  ['lhidx', VID, { label: 'Automática · dom 04/10 12:00 (sem 59)', kind: 'auto', ts: Date.parse('2026-10-04T12:00:00-05:00'), date: '2026-10-04', week: 59, pisos: { p1: { code: 'P1', name: 'Primer piso', order: 1, acts: 3 } } }],
  ['lhver', VID + '__p1', { verId: VID, pisoId: 'p1', piso: { code: 'P1', name: 'Primer piso', order: 1 }, json: JSON.stringify(SN) }],
];

test('congelar desde una versión: compromisos y foto salen de la versión; se conserva la evaluación de lo que sigue igual', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: VER });
  page.on('dialog', d => d.accept());
  await expect.poll(() => page.evaluate(id => LHI.has(id), VID)).toBe(true);
  expect(await page.evaluate(() => verDefault(59))).toBe(VID); // sugiere el autoguardado del domingo anterior

  // primero se congeló con el lookahead vivo y se evaluó; luego se descongeló
  await page.evaluate(() => freezeWeek(59, 'p1', { t0: { ok: true, cnc: '', note: '' }, t1: { ok: false, cnc: 'Materiales', note: 'x' } }));
  await page.evaluate(() => unfreezeWeek(59, 'p1'));
  expect((await page.evaluate(() => window.__dbGet('weeks', '59_p1'))).frozenAt).toBeUndefined();

  // t1 se marcó terminada el lunes: igual entra con sus dos días (copia tal cual la versión; el PPC es semanal)
  await page.evaluate(() => DONE.set('t1', '2026-10-06'));
  await page.evaluate(id => freezeFromVer(59, 'p1', id), VID);
  const w = await page.evaluate(() => window.__dbGet('weeks', '59_p1'));
  expect(w.frozenAt).toBeTruthy();
  expect(w.fromVer).toEqual({ id: VID, label: 'Automática · dom 04/10 12:00 (sem 59)' });
  expect(Object.keys(w.items).sort()).toEqual(['i0', 't0', 't1']);
  expect(w.items.t0.days).toEqual(['2026-10-06', '2026-10-08']);
  expect([w.items.t0.q, w.items.t0.und]).toEqual([15, 'm2']);
  expect(w.items.i0.days).toEqual(['2026-10-09']); // solo los días de la semana
  expect(w.items.t1.days).toEqual(['2026-10-06', '2026-10-07']);
  // t1 tiene los mismos días que lo congelado antes: conserva su evaluación; t0 cambió de días: queda por evaluar
  expect(w.res.t1.ok).toBe(false);
  expect(w.res.t0).toBeUndefined();
  // la foto del lookahead es la de la versión
  const ws = await page.evaluate(() => window.__dbGet('wsnap', '59_p1'));
  expect(ws.snap).toEqual({ t0: ['2026-10-06', '2026-10-08'], t1: ['2026-10-06', '2026-10-07'], i0: ['2026-10-09', '2026-10-20'] });
  // el lookahead no cambió
  expect(await page.evaluate(() => S.act.get('t0').days)).toEqual(['2026-10-06', '2026-10-07']);

  // la página lo muestra; con la semana ya congelada no deja volver a hacerlo sin descongelar
  await page.evaluate(() => { U.week = 59; render(); });
  await expect(page.locator('section[data-pid="p1"] .pill.ok')).toContainText('Congelado desde versión');
  await page.evaluate(id => freezeFromVer(59, 'p1', id), VID);
  expect((await page.evaluate(() => window.__dbGet('weeks', '59_p1'))).frozenAt).toBe(w.frozenAt);

  // descongelar guarda fromVer en el historial y lo quita del documento vigente
  await page.evaluate(() => unfreezeWeek(59, 'p1'));
  const all = await page.evaluate(() => window.__dbAll('weeks'));
  expect(all['59_p1'].fromVer).toBeUndefined();
  expect(Object.values(all).some(h => h.histOf === '59_p1' && h.v && h.v.fromVer && h.v.fromVer.id === VID)).toBe(true);
  noErrors(errors, 'congelar desde versión');
});

test('el botón «Desde versión…» aparece en el borrador y abre la lista de versiones del piso', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: VER });
  await expect.poll(() => page.evaluate(id => LHI.has(id), VID)).toBe(true);
  await page.evaluate(() => { U.week = 59; render(); });
  await page.locator('section[data-pid="p1"] [data-freezever]').click();
  await expect(page.locator('#vfz')).toHaveValue(VID);
  noErrors(errors, 'botón desde versión');
});

test('solo el administrador: el editor no ve el botón ni puede congelar desde una versión', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'plan', extra: VER });
  await page.evaluate(() => { U.week = 59; render(); });
  await expect(page.locator('section[data-pid="p1"] [data-freeze]')).toBeVisible();
  await expect(page.locator('section[data-pid="p1"] [data-freezever]')).toHaveCount(0);
  await page.evaluate(id => freezeFromVer(59, 'p1', id), VID);
  expect(await page.evaluate(() => window.__dbGet('weeks', '59_p1'))).toBeFalsy();
  noErrors(errors, 'editor sin desde versión');
});
