// Lookahead: ficha de la restricción al pasar el mouse, explicación de cada cambio propuesto e historial por fecha.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const I = (days, extra = {}) => ({ ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days, order: 10, ...extra });
const base = I(['2026-10-05', '2026-10-06', '2026-10-07']);
const P = ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: {
  i1: { after: I(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']), base, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 },
  n9: { after: { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: ['2026-10-12', '2026-10-13'], order: 15 }, base: null, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 } } }];

test('la «R» explica la restricción: qué falta, quién la libera y para cuándo', async ({ page }) => {
  const R = ['restr', 'rq', { actId: 'e1', pisoId: 'p1', sc: 'c2', desc: 'Falta plano de detalle', resp: 'Oficina Técnica', need: '2026-09-29', status: 'pend', created: '2026-09-25', byName: 'Elena', cnc: 'Diseño' }];
  const errors = await openApp(page, { tab: 'look', extra: [R] });
  const t = await page.locator('#grid [data-goto-restr="e1"]').getAttribute('title');
  expect(t).toContain('Falta plano de detalle');
  expect(t).toContain('La libera: Oficina Técnica');
  expect(t).toContain('requerida 29 set (VENCIDA)');
  expect(t).toContain('causa DIS');
  noErrors(errors, 'ficha restricción');
});

test('en la revisión, cada celda dice en palabras qué cambia la propuesta', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'i1', base], P] });
  await page.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  const c1 = await page.locator('#grid tr[data-a="i1"] td.d[data-d="2026-10-08"]').getAttribute('title');
  expect(c1).toContain('Propuesta: Mueve el inicio 2 días hábiles más tarde y aumenta la duración de 3 a 4 días');
  const c2 = await page.locator('#grid tr[data-a="n9"] td.d[data-d="2026-10-12"]').getAttribute('title');
  expect(c2).toContain('Propuesta: Nueva actividad · 2 días');
  expect(await page.evaluate(() => propPlain({ days: ['2026-10-05', '2026-10-06'] }, { days: ['2026-10-08', '2026-10-09'] }))).toBe('Mueve todo 3 días hábiles más tarde');
  noErrors(errors, 'explicación propuesta');
});

test('historial por fecha: cambios directos y decisiones sobre propuestas', async ({ page }) => {
  const H = ['lhphist', 'c1_i9_x', { sc: 'c1', actId: 'i9', name: 'Redes', amb: 'A-1 Dpto 101', st: 'rej', from: '05 oct', to: '08 oct', t: Date.parse(HOY + 'T08:00:00-05:00'), n: 'Elena Editora', note: 'No hay frente' }];
  const errors = await openApp(page, { tab: 'look', extra: [H] });
  await page.evaluate(() => { const x = S.act.get('t1'); apply([op('acts', 't1', { ...x, days: x.days.map(d => wshift(d, 2)) })], 'Tarrajeo corrido'); });
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lhlog')).length)).toBe(1);
  const g = await page.evaluate(() => Object.values(window.__dbAll('lhlog'))[0]);
  expect([g.by, g.label, g.items[0].id, g.items[0].k]).toEqual(['frandiopacheco@gmail.com', 'Tarrajeo corrido', 't1', 'mod']);
  await page.click('#fhist');
  await expect(page.locator('#lqm .hsi')).toHaveCount(2);
  await expect(page.locator('#lqm .hsi').first()).toContainText('Mueve todo 2 días hábiles más tarde');
  await expect(page.locator('#lqm .hsi.pr')).toContainText('✗ Rechazó la propuesta de SC SANITARIAS');
  await page.locator('#hstf [data-f="prop"]').click();
  await expect(page.locator('#lqm .hsi')).toHaveCount(1);
  await page.locator('#lqm [data-hd="-1"]').click();
  await expect(page.locator('#lqm .hstl')).toContainText('Sin cambios');
  noErrors(errors, 'historial');
});
