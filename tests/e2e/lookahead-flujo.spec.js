// Lookahead › Flujo (lookahead-flujo.js): Gantt de solo lectura por piso (desplegable en sectores) y por SC elegido.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { obraGrande } from './obra-grande.js';

test('Flujo: pisos, SC elegidos, sectores y clic a la grilla', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 850 });
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { U.piso = ''; U.sc = ''; render(); });
  await page.click('#fmore'); // 25-10-2026: Grilla / Flujo va en Vista ▾
  await page.locator('#fview button[data-v="flujo"]').click();
  await expect(page.locator('#flw')).toBeVisible();
  await expect(page.locator('#gw')).toBeHidden();
  const fl = page.locator('#flw');
  // sin SC elegido: una línea por piso («Todos los SC»)
  await expect(fl.locator('tbody th.fln')).toHaveCount(2);
  await expect(fl.locator('tbody tr')).toHaveCount(2);
  expect(await fl.locator('td.fd.on').count()).toBeGreaterThan(0);
  // la intensidad sale de los ambientes del día: P1 tiene 2 ambientes con trabajo hoy
  const hoy = await page.evaluate(() => todayIso());
  const tip = await fl.locator('tbody tr').first().locator('td.fd.on').filter({ has: page.locator('i') }).evaluateAll((tds, d) => tds.map(t => t.title).find(x => x.includes(d)), await page.evaluate(h => fmtD(h), hoy));
  expect(tip).toContain('2 ambientes');
  // elegir SC en la leyenda: una línea por SC en cada piso
  await page.locator('#legend .chip[data-id="c3"]').click();
  await expect(fl.locator('tbody tr')).toHaveCount(2);
  await expect(fl.locator('tbody th.flsc').first()).toContainText('SC TARRAJEO');
  await page.locator('#legend .chip[data-id="c1"]').click({ modifiers: ['Control'] });
  await expect(fl.locator('tbody tr')).toHaveCount(4);
  // desplegar P1 en sectores
  await fl.locator('[data-flt="p1"]').click();
  await expect(fl.locator('tbody th.fll1')).toContainText('S1');
  await expect(fl.locator('tbody tr')).toHaveCount(6);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lps.ui') || '{}').flOpen || U.flOpen)).toContain('p1');
  // clic en un día con trabajo de SC SANITARIAS en P1 → grilla en esa actividad, filtrada por ese SC
  const lane = fl.locator('tbody tr').filter({ has: page.locator('th.flsc', { hasText: 'SC SANITARIAS' }) }).first();
  await lane.locator('td.fd.on').first().click();
  await expect(page.locator('#gw')).toBeVisible();
  await expect(page.locator('#flw')).toBeHidden();
  expect(await page.evaluate(() => [U.lkV, U.sc])).toEqual(['grid', 'c1']);
  await expect(page.locator('#grid tr.rhl')).toHaveCount(1);
  noErrors(errors, 'flujo');
});

test('Flujo: el SC también lo ve', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1500, height: 850 });
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  await page.click('#fmore'); // 25-10-2026: Grilla / Flujo va en Vista ▾
  await page.locator('#fview button[data-v="flujo"]').click();
  await expect(page.locator('#flw table.flt')).toBeVisible();
  noErrors(errors, 'flujo sc');
});

test('Flujo: llena la pantalla y se dibuja rápido con una obra grande', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1500, height: 850 });
  const e2 = await openApp(page, { extra: obraGrande(), tab: 'look' });
  await page.evaluate(() => { U.piso = ''; U.lkV = 'flujo'; U.sc = [...S.con.keys()].slice(0, 3).join(','); render(); });
  await expect(page.locator('#flw table.flt')).toBeVisible();
  const t0 = Date.now(); await page.evaluate(() => { render(); document.body.offsetHeight; });
  expect(Date.now() - t0, 'dibujar el flujo de la obra grande').toBeLessThan(1500);
  // no queda espacio vacío a la derecha: la tabla ocupa el ancho del contenedor
  const w = await page.evaluate(() => { const f = document.getElementById('flw'); return [f.querySelector('table').offsetWidth, f.clientWidth]; });
  expect(w[0]).toBeGreaterThanOrEqual(w[1] - 2);
  if (process.env.FL_SHOT) await page.screenshot({ path: process.env.FL_SHOT });
  noErrors(e2, 'flujo obra grande');
});
