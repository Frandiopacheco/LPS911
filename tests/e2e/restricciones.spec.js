// Restricciones: filtros por partida afectada, quién la registró, quién la libera y fechas.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const R = (id, o) => ['restr', id, { pisoId: 'p1', type: 'Materiales', desc: id, resp: '', need: HOY, freed: '', status: 'pend', created: HOY, ...o }];

test('filtrar por a quién afecta, quién registró, quién libera y fechas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [
    R('rA', { actId: 'e0', sc: 'c2', desc: 'Falta tubería', by: 'sc@obra.pe', byName: 'Sandra', resp: 'Logística', created: '2026-09-20' }),
    R('rB', { actId: 's9x', desc: 'Falta andamio', by: 'frandiopacheco@gmail.com', byName: 'Frandio', resp: 'Oficina Técnica', status: 'lib', freed: '2026-09-28', libN: 'Ing. Campo' }),
  ] });
  const rows = page.locator('table.t tbody tr');
  await page.locator('#rf [data-f="all"]').click();
  const total = await rows.count();
  // a quién afecta: aunque la haya registrado el ingeniero, sale la partida de la actividad
  await page.selectOption('select[data-rf="aff"]', 'SC ELECTRICAS');
  await expect(rows.filter({ has: page.locator('input[value="Falta tubería"]') })).toHaveCount(1);
  await expect(page.locator('table.t input[value="Falta arena fina"]')).toHaveCount(0);
  await page.click('#rfclr');
  await expect(rows).toHaveCount(total);
  // quién la libera (la liberada cuenta quién la liberó)
  await page.selectOption('select[data-rf="who"]', 'Ing. Campo');
  await expect(rows).toHaveCount(1);
  await page.click('#rfclr');
  // fechas de registro
  await page.fill('input[data-rf="c2"]', '2026-09-25');
  await page.locator('input[data-rf="c2"]').dispatchEvent('change');
  await expect(rows.filter({ has: page.locator('input[value="Falta tubería"]') })).toHaveCount(1);
  await expect(page.locator('table.t input[value="Falta arena fina"]')).toHaveCount(0);
  await page.click('#rfclr');
  // al liberar queda quién lo hizo
  const pend = rows.filter({ has: page.locator('input[value="Falta tubería"]') });
  await pend.locator('select[data-f="status"]').selectOption('lib');
  await expect.poll(() => page.evaluate(() => window.__dbGet('restr', 'rA').libN)).toBeTruthy();
  noErrors(errors, 'restricciones filtros');
});
