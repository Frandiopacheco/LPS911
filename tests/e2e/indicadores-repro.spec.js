// Indicadores: PPC semanal histórico (bruto y del SC), reprogramaciones del plan diario y restricciones por causa y SC.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const IT = (sc, d) => ({ sc, sector: 'S1', code: 'A-0', amb: 'Dpto', act: 'Act', days: [d], ord: 0 });
const W57 = ['weeks', '57_p1', { n: 57, pisoId: 'p1', frozenAt: '2026-09-19T18:00:00.000Z', items: { a: IT('c1', '2026-09-21'), b: IT('c2', '2026-09-22') }, res: { a: { ok: true }, b: { ok: false, cnc: 'Programación' } } }];
const W58 = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', items: { a: IT('c1', HOY), b: IT('c2', HOY), c: IT('c2', HOY), d: IT('c3', HOY) }, res: { a: { ok: true }, b: { ok: false, cnc: 'Subcontratas' }, c: { ok: true }, d: { ok: false, cnc: 'Programación' } } }];
/* en la semana 58 el plan diario reprogramó e0 (frente no entregado por SANITARIAS) y arrastró t0; e1 por personal */
const RP = (id, base, rpl) => ['acts', id, { ...base, rpl }];
const E0 = { ambId: 'a1', sc: 'c2', name: 'Entubado', days: ['2026-10-06'], order: 20 };
const T0 = { ambId: 'a1', sc: 'c3', name: 'Tarrajeo', days: ['2026-10-08'], order: 30 };
const E1 = { ambId: 'a2', sc: 'c2', name: 'Entubado', days: ['2026-10-06'], order: 20 };

test('Indicadores semanal: histórico, reprogramaciones y restricciones', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', extra: [W57, W58,
    RP('e0', E0, { [MANANA]: { to: '2026-10-06', m: 'Frente no entregado (SC SANITARIAS)', c: 'SC', cnc: 'Subcontratas', imp: false, rsc: 'c1', pc: false } }),
    RP('t0', T0, { [MANANA]: { to: '2026-10-08', m: 'Frente no entregado', c: 'SC', cnc: 'Subcontratas', imp: false, rsc: 'c1', tr: 'e0' } }),
    RP('e1', E1, { [MANANA]: { to: '2026-10-06', m: 'Falta de personal', c: 'SC', cnc: 'Subcontratas', imp: true, rsc: 'c2' } }),
    ['restr', 'rX', { actId: 'e1', pisoId: 'p1', sc: 'c2', desc: 'Falta de personal', status: 'pend', need: '2026-10-06', created: HOY, cnc: 'Subcontratas', ccode: 'SC', via: 'plan diario' }]] });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; render(); });
  const hist = page.locator('.card.chart', { hasText: 'PPC semanal histórico' });
  await expect(hist.locator('svg .ln.br')).toHaveCount(1);
  await expect(hist.locator('svg .ln.sc')).toHaveCount(1);
  await expect(hist.locator('svg circle.pt.br')).toHaveCount(2);
  await expect(hist).toContainText('bruto 50%'); // semana 58: 2 de 4
  await expect(hist).toContainText('SC 67%'); // sin la de Programación (no imputable): 2 de 3
  const rp = page.locator('.card', { hasText: 'Reprogramaciones del plan diario' });
  await expect(rp.locator('.tile', { hasText: 'Reprogramadas' })).toContainText('2');
  await expect(rp.locator('.tile', { hasText: 'Arrastradas' })).toContainText('1');
  const san = rp.locator('tr', { hasText: 'SC SANITARIAS' });
  await expect(san.locator('td').nth(4)).toHaveText('1'); // afectó a otra partida (no entregó el frente de e0)
  const ele = rp.locator('tr', { hasText: 'SC ELECTRICAS' });
  await expect(ele.locator('td').nth(1)).toHaveText('2');
  await expect(ele.locator('td').nth(3)).toHaveText('1'); // solo la de personal le corresponde
  const rc = page.locator('.card', { hasText: 'Restricciones registradas' });
  await expect(rc).toContainText('SC · Subcontratas');
  await page.screenshot({ path: '/tmp/claude-0/ind.png', fullPage: true });
  noErrors(errors, 'indicadores');
});

test('PPC semanal muestra el histórico arriba', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [W57, W58] });
  await expect(page.locator('details.ppch')).toContainText('2 semanas');
  await expect(page.locator('details.ppch svg .ln.br')).toHaveCount(1);
  noErrors(errors, 'histórico en PPC semanal');
});
