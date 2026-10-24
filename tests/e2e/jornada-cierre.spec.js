// Tanda 1 (23/10/2026): Cierre del ingeniero (día cerrado para todos), resguardo C-09 al marcar «Terminada» y «se trabaja» (C-08).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const AYER = '2026-09-30';

test('día cerrado: los días pasados y hoy desde el Cierre del ingeniero no se registran, tampoco el administrador', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'campo' });
  expect(await page.evaluate(() => [engCutHH(), dayShut(todayIso())])).toEqual(['21:00', false]);
  // ayer: cerrado (Campo lo muestra y no escribe)
  const r = await page.evaluate(d => { const ok = writeDaily(d, 'p1', { recs: { i0: { status: 'no', cnc: 'Materiales' } } }); return { ok, rec: window.__dbGet('daily', d + '_p1').recs.i0.status }; }, AYER);
  expect(r).toEqual({ ok: false, rec: 'ok' });
  await page.evaluate(d => { CU.date = d; render(); }, AYER);
  await expect(page.locator('#main')).toContainText('Día cerrado');
  await expect(page.locator('#main .csb button[data-st="ok"]').first()).toBeDisabled();
  // hoy a las 21:05: también cerrado; el reporte en vivo tampoco se guarda
  await page.clock.setFixedTime(new Date(HOY + 'T21:05:00-05:00'));
  expect(await page.evaluate(() => dayShut(todayIso()))).toBe(true);
  await page.evaluate(() => liveWrite(todayIso(), 'e0', { st: 'stop', mot: 'Materiales' }, { s: 'stop', m: 'Materiales' }));
  expect(await page.evaluate(d => window.__dbGet('live', d + '_e0'), HOY)).toBeFalsy();
  // una escritura que llegó tarde (sin señal) y las reglas rechazan: aviso claro
  await page.evaluate(d => handleWriteErr({ code: 'permission-denied', shut: d }), HOY);
  await expect(page.locator('#toast')).toContainText('ya cerró');
  noErrors(errors, 'día cerrado');
});

test('Configuración › Proyecto: Cierre del ingeniero (solo admin), entre 18:00 y 23:00 y después del corte del SC', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg' });
  await page.click('[data-cfgv="pry"]');
  const i = page.locator('#p_ecl');
  await expect(i).toHaveValue('21:00');
  await i.fill('22:30'); await i.dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => P().engCutHH)).toBe('22:30');
  await i.fill('17:00'); await i.dispatchEvent('change');
  await expect(page.locator('#toast')).toContainText('Cierre del ingeniero');
  expect(await page.evaluate(() => P().engCutHH)).toBe('22:30');
  noErrors(errors, 'cierre del ingeniero');
});

test('C-09: marcar «Terminada» algo que está en el plan publicado de mañana ofrece sacarlo como «No va · terminada»', async ({ page }) => {
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  const DP = ['dplan', MANANA + '_p1', { date: MANANA, pisoId: 'p1', ids: { e0: 20, i0: 10 }, who: { e0: { sc: 'c2', amb: 'a1' } }, at: 1, by: 'editor@obra.pe' }];
  const errors = await openApp(page, { as: 'editor', tab: 'campo', extra: [DP] });
  expect(await page.evaluate(() => askDone('e0', todayIso()))).toBe(true);
  await expect.poll(() => page.evaluate(d => window.__dbGet('pdz', 'nv_' + d + '_e0'), MANANA)).toBeTruthy();
  const nv = await page.evaluate(d => window.__dbGet('pdz', 'nv_' + d + '_e0'), MANANA);
  expect(nv).toMatchObject({ kind: 'nova', date: MANANA, pisoId: 'p1', actId: 'e0', fin: true, imp: false, repTo: '' });
  expect(msgs.some(m => m.includes('plan ya publicado'))).toBe(true);
  noErrors(errors, 'C-09');
});

test('C-08: un domingo marcado «se trabaja» en Configuración › Calendario es laborable', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg' });
  const DOM = '2026-10-04';
  expect(await page.evaluate(d => [isWork(d), nwReason(d)], DOM)).toEqual([false, 'Domingo']);
  await page.click('[data-cfgv="cal"]');
  const t = page.locator('textarea[data-cal="work"]');
  await t.fill(DOM + ' Recuperar atraso'); await t.dispatchEvent('change');
  await expect.poll(() => page.evaluate(d => isWork(d), DOM)).toBe(true);
  expect(await page.evaluate(() => P().cal.work)).toEqual([{ d: DOM, n: 'Recuperar atraso' }]);
  noErrors(errors, 'se trabaja');
});
