// Correcciones de la segunda revisión: ver en el plano, trabajo no programado por ambiente, fila resaltada,
// día que no fue marcado en el lookahead, navegación de días del plan diario, PPC con cumplidos sin cantidad.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const pdz = page => page.evaluate(() => Object.values(window.__dbAll('pdz')));

test('«Ver en el plano» hace parpadear el ambiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: [...LAMINA, ...AMB] });
  await page.locator('[data-rmap="t0"]').first().click();
  await expect(page.locator('#mstage polygon.flz')).toHaveCount(1);
  await expect(page.locator('#mstage polygon.flz')).toHaveCount(0, { timeout: 8000 }); // y se apaga solo
  noErrors(errors, 'flash');
});

test('trabajo no programado: se elige quién y el ambiente (sin dibujar)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#mnp');
  await page.fill('#npd', 'Picado de muro');
  await page.selectOption('#nps', 'c3');
  await page.selectOption('#npa', 'a2');
  await page.locator('#pop [data-do="ok"]').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'zona' && !z.actId).map(z => [z.desc, z.sc, z.ambId, z.pts.length])).toEqual([['Picado de muro', 'c3', 'a2', 8]]);
  await expect(page.locator('#mpanel')).toContainText('Picado de muro');
  noErrors(errors, 'np ambiente');
});

test('Lookahead: tocar el n.º de ítem resalta la fila; otra vez la suelta', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const tr = page.locator('#grid tr[data-a="e0"]');
  await tr.locator('.anum').click();
  await expect(tr).toHaveClass(/rsel/);
  await page.locator('#grid tr[data-a="t0"] .anum').click();
  await expect(tr).not.toHaveClass(/rsel/);
  await expect(page.locator('#grid tr[data-a="t0"]')).toHaveClass(/rsel/);
  await page.locator('#grid tr[data-a="t0"] .anum').click();
  await expect(page.locator('#grid tr.rsel')).toHaveCount(0);
  noErrors(errors, 'fila');
});

test('al publicar, el lookahead mueve la actividad y marca el día que no fue (↷)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.locator('#mpanel .mp-it[data-act="e0"] [data-dv^="no"]').click();
  await page.locator('#pop [data-nv="per"]').click();
  await page.locator('#pop .nvok').click();
  await page.locator('#mpanel [data-pub]').click(); await page.locator('#pop [data-do="si"]').click();
  await expect.poll(() => page.evaluate(d => (window.__dbGet('acts', 'e0').rpl || {})[d]?.m, MANANA)).toBe('Sin personal');
  await page.evaluate(() => goTab('look'));
  const cell = page.locator(`#grid tr[data-a="e0"] td.d[data-d="${MANANA}"]`);
  await expect(cell).toHaveClass(/rpl/);
  await expect(cell).toHaveAttribute('title', /No fue \(plan diario\): Sin personal/);
  noErrors(errors, 'marca');
});

test('Plan diario: con ‹ se llega a hoy y al salir vuelve la semana que se veía', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.click('#wnext'); await page.click('#wnext');
  const wk = await page.evaluate(() => U.week);
  await page.evaluate(() => goTab('mapa'));
  await expect.poll(() => page.evaluate(() => curDay())).toBe(MANANA);
  await page.evaluate(() => goTab('look'));
  await expect.poll(() => page.evaluate(() => U.week)).toBe(wk); // vuelve la semana que se veía
  await page.evaluate(() => goTab('mapa'));
  await page.click('#wprev');
  await expect.poll(() => page.evaluate(() => curDay())).toBe(HOY); // ya no rebota a mañana
  noErrors(errors, 'dias');
});

test('PPC semanal: un día «Cumplido» confirmado sin cantidad cuenta lo programado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo' });
  const r = await page.evaluate(d => { const x = S.act.get('e0'); writeDaily(d, 'p1', { recs: { e0: { ...baseRec(d, x, null), status: 'ok' } } }); return DAY.get(d + '_p1').recs.e0; }, HOY);
  expect(r.exec).toBe(r.prog);
  noErrors(errors, 'exec');
});
