// Tablero: avance de la semana contra lo congelado (unidad = día comprometido de cada actividad).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

test('Tablero: avance semanal contra lo congelado, con extra aparte', async ({ page }) => {
  const IT = { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto', act: 'Redes', days: ['2026-09-29', '2026-09-30', '2026-10-02'], ord: 0 };
  const W = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', items: { i0: IT }, res: {} }];
  // lun cumplido, mar parcial (cuenta 0), mié 01/10 cumplido fuera de su día (vale: es de la semana); e0 no estaba congelada → extra
  const D1 = ['daily', '2026-09-29_p1', { date: '2026-09-29', pisoId: 'p1', recs: { i0: { status: 'ok', sc: 'c1' } } }];
  const D2 = ['daily', '2026-09-30_p1', { date: '2026-09-30', pisoId: 'p1', recs: { i0: { status: 'partial', sc: 'c1' }, e0: { status: 'ok', sc: 'c2' } } }];
  const D3 = ['daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs: { i0: { status: 'ok', sc: 'c1' } } }];
  const errors = await openApp(page, { tab: 'dash', extra: [W, D1, D2, D3], editar: false });
  for (const d of ['2026-09-29', '2026-09-30', HOY]) await page.evaluate(x => ensureDaily(x), d);
  await expect.poll(() => page.evaluate(() => { const o = dashAvance(58, new Set(['p1']), todayIso()); return [o.meta, o.esp, o.real, o.extra, o.sc.c1.real, o.sc.c2 && o.sc.c2.extra]; })).toEqual([3, 2, 2, 1, 2, 1]);
  await page.evaluate(() => render());
  await expect(page.locator('#dav')).toContainText('Avance de la semana 58');
  await expect(page.locator('#dav')).toContainText('2/3');
  await expect(page.locator('#dav')).not.toContainText('debía');
  await expect(page.locator('#dav')).toContainText('1 cumplido fuera de lo congelado');
  noErrors(errors, 'avance semanal');
});
