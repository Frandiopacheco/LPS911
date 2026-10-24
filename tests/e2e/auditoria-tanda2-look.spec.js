// Auditoría tanda 2 · frente D «Lookahead» (C-15/CON-01, C-16/CON-02, C-21/CON-05). Hoy = 1-oct-2026 (jue, semana 58).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10, tr: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20, tr: 30 }],
];
const BASE = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' };
const FER = '2026-10-08';
const PROJ = ['meta', 'project', { ...BASE, cal: { sat: true, hol: [{ d: FER, n: 'Combate de Angamos' }] } }];

/* C-16: Redes (tren 10) empieza el 30/09. En a1 el tarrajeo (tren 30) empieza el 29/09: va antes → marcado.
   En a2 empieza el mismo 30/09: trabajo en paralelo → no se marca. */
test('C-16 · tren invertido: la sucesora que empieza antes se marca; el mismo día no', async ({ page }) => {
  const extra = [...CAT,
    ['acts', 't0', { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-09-29', '2026-10-05'], order: 30 }],
    ['acts', 't1', { ambId: 'a2', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-09-30', '2026-10-02'], order: 30 }]];
  const errors = await openApp(page, { tab: 'look', extra });
  await page.evaluate(() => { U.piso = ''; U.showPast = true; gridRows = null; render(); });
  const c0 = page.locator('#grid tr[data-a="t0"] td.d[data-d="2026-09-29"]');
  await expect(c0).toHaveClass(/\btinv\b/);
  await expect(c0).toHaveAttribute('title', /Va antes que su predecesora: Redes empotradas \(empieza el/);
  // solo los días adelantados: el 05/10 ya es después del inicio de la predecesora
  await expect(page.locator('#grid tr[data-a="t0"] td.d[data-d="2026-10-05"]')).not.toHaveClass(/\btinv\b/);
  await expect(page.locator('#grid tr[data-a="t1"] td.tinv')).toHaveCount(0);
  await expect(page.locator('#grid tr[data-a="i0"] td.tinv')).toHaveCount(0);
  await expect(page.locator('#grid td.s2.amb').filter({ has: page.locator('[data-amb="a1"]') }).locator('.tinvc')).toContainText('⚠ 1 fuera de secuencia');
  await expect(page.locator('#grid td.s2.amb').filter({ has: page.locator('[data-amb="a2"]') }).locator('.tinvc')).toHaveCount(0);
  // predecesora terminada: ya no avisa
  await page.evaluate(() => { DONE.set('i0', '2026-09-30'); DONEV++; gridRows = null; render(); });
  await expect(page.locator('#grid tr[data-a="t0"] td.tinv')).toHaveCount(0);
  noErrors(errors, 'C-16');
});

test('C-15 · lo «No aplica» de la Matriz que sigue programado se ve rayado y con su chip', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...CAT, ['mamb', 'a1', { c: { k2: 'n' }, by: 'x', t: 1 }]] });
  await page.evaluate(() => { U.piso = ''; U.lkGh = false; render(); });
  await expect(page.locator('#grid td.mxt')).toHaveCount(0);
  await page.click('#fmore');
  await page.click('#fmxp button');
  const td = page.locator('#grid tr[data-a="t0"] td.d.mxt').first();
  await expect(td).toBeVisible();
  await expect(td).toHaveAttribute('title', /La Matriz dice «No aplica»/);
  await expect(page.locator('[data-mxtamb="a1"]')).toContainText('1 no aplica en Matriz');
  await expect(page.locator('#grid tr[data-a="t1"] td.mxt')).toHaveCount(0);
  noErrors(errors, 'C-15');
});

async function paintRange(page, aid, d0, d1) {
  const a = page.locator(`#grid tr[data-a="${aid}"] td.d[data-d="${d0}"]`), b = page.locator(`#grid tr[data-a="${aid}"] td.d[data-d="${d1}"]`);
  await a.scrollIntoViewIfNeeded();
  const ba = await a.boundingBox(), bb = await b.boundingBox();
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 }); await page.mouse.up();
}

test('C-21a · pintar salta el feriado; con la opción desactivada lo programa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [PROJ] });
  await page.evaluate(() => { U.piso = ''; gridRows = null; render(); });
  await paintRange(page, 'e0', '2026-10-07', '2026-10-09');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'e0').days.includes('2026-10-09'))).toBe(true);
  const d0 = await page.evaluate(() => __dbGet('acts', 'e0').days);
  expect(d0).toContain('2026-10-07');
  expect(d0, 'el feriado no se programa al pintar').not.toContain(FER);
  await expect(page.locator('#toast')).toContainText('No se programó');
  // Configuración › Calendario: «Al pintar días, saltar no laborables» (activada por defecto)
  await page.evaluate(() => { U.cfgV = 'cal'; goTab('cfg'); });
  const chk = page.locator('input[data-cal="pskip"]');
  await expect(chk).toBeChecked();
  await chk.uncheck();
  await expect.poll(() => page.evaluate(() => __dbGet('meta', 'project').cal.pskip)).toBe(false);
  await page.evaluate(() => goTab('look'));
  await paintRange(page, 'e1', '2026-10-07', '2026-10-09');
  await expect.poll(() => page.evaluate(d => __dbGet('acts', 'e1').days.includes(d), FER)).toBe(true);
  noErrors(errors, 'C-21a');
});

test('C-21b · menú del día: el administrador marca «Trabajar este día» y un feriado; un SC no ve esas opciones', async ({ page, browser }) => {
  const errors = await openApp(page, { tab: 'look', extra: [PROJ] });
  await page.evaluate(() => { U.piso = ''; gridRows = null; render(); });
  await page.locator(`#grid th[data-dh="${FER}"]`).click({ button: 'right' });
  await expect(page.locator('#pop')).toContainText('Feriado: Combate de Angamos');
  await page.click('#pop button[data-do="work"]');
  await expect.poll(() => page.evaluate(d => (__dbGet('meta', 'project').cal.work || []).map(o => o.d), FER)).toContain(FER);
  expect(await page.evaluate(d => isWork(d), FER)).toBe(true);
  // el filtro por día (clic normal) no se activó con el clic derecho
  expect(await page.evaluate(() => U.day)).toBe('');
  // vuelve a no laborable
  await page.locator(`#grid th[data-dh="${FER}"]`).click({ button: 'right' });
  await page.click('#pop button[data-do="nowork"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('meta', 'project').cal.work || []).length)).toBe(0);
  // día normal: marcar como feriado (pide el nombre)
  page.once('dialog', d => d.accept('Paro regional'));
  await page.locator('#grid th[data-dh="2026-10-09"]').click({ button: 'right' });
  await page.click('#pop button[data-do="hol"]');
  await expect.poll(() => page.evaluate(() => (__dbGet('meta', 'project').cal.hol || []).find(o => o.d === '2026-10-09')?.n)).toBe('Paro regional');
  noErrors(errors, 'C-21b admin');

  const ctx = await browser.newContext();
  const sc = await ctx.newPage();
  const e2 = await openApp(sc, { as: 'sc', tab: 'look', extra: [PROJ] });
  const th = sc.locator(`#grid th[data-dh="${FER}"]`);
  await expect(th).toHaveCount(1);
  await th.click({ button: 'right' });
  await sc.waitForTimeout(200);
  await expect(sc.locator('#pop button[data-do="work"]')).toHaveCount(0);
  await expect(sc.locator('#pop button[data-do="hol"]')).toHaveCount(0);
  noErrors(e2, 'C-21b sc');
  await ctx.close();
});
