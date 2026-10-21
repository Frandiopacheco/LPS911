// Estado de la jornada (js/jornada.js): gráfico por SC de los «Detenido» reportados (reporte por excepción, oct 2026) y de quién
// cerró el día, imagen para WhatsApp y lámina «Jornada» de Presentar del día. Los números salen de kState.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

test('Jornada: detenidos y cierre por SC; imagen PNG y lámina de presentación', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  const errors = await openApp(page, { tab: 'dash' });
  // datos: lo programado hoy, por SC; los detenidos cuadran con kState
  const t = await page.evaluate(() => {
    const d = todayIso(), R = jorData(d);
    const stops = R.rows.reduce((n, r) => n, 0);
    let k = 0; for (const x of S.act.values()) { if (!schedOrSnap(x, d)) continue; const s = kState(d, x.id).k; if (s === 'stop' || (s === 'no' && lastStop(d, x.id))) k++; }
    return { det: R.det.acts, tot: R.det.tot, cer: R.cer.acts, rows: R.rows.length, k, sumN: R.rows.reduce((t, r) => t + r.n, 0) };
  });
  expect(t.tot).toBe(t.sumN);
  expect(t.det).toBeLessThanOrEqual(t.k);
  expect(t.cer).toBeLessThanOrEqual(t.tot);
  expect(t.rows).toBeGreaterThan(0);
  // hoja desde el Tablero
  await page.locator('#main [data-jor="open"]').click();
  const sh = page.locator('#jsheet');
  await expect(sh.locator('.jor-b[data-jf="det"] .jor-r').first()).toBeVisible();
  await expect(sh.locator('.jor-b[data-jf="cer"] .jor-r').first()).toBeVisible();
  expect(await sh.locator('.jor-b[data-jf="det"] .jor-r').count()).toBe(t.rows);
  // orden del cierre: los que faltan primero
  const cls = await sh.locator('.jor-b[data-jf="cer"] .jor-r').evaluateAll(L => L.map(e => e.classList.contains('ok')));
  expect(cls).toEqual([...cls].sort((a, b) => Number(a) - Number(b)));
  // imagen: PNG válido, con alto según las filas
  const img = await page.evaluate(async () => { const b = await jorImage(todayIso()); const h = new Uint8Array(await b.arrayBuffer()).slice(0, 8); return { type: b.type, size: b.size, head: [...h] }; });
  expect(img.type).toBe('image/png');
  expect(img.size).toBeGreaterThan(3000);
  expect(img.head).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  // sin compartir del sistema ni portapapeles: se descarga
  const dl = page.waitForEvent('download');
  await sh.locator('[data-jor="dl"]').click();
  expect((await dl).suggestedFilename()).toBe('jornada_' + HOY + '.png');
  await sh.locator('[data-kx]').click();
  await expect(page.locator('#jsheet')).toHaveCount(0);
  // lámina «Jornada» en Presentar del día
  await page.evaluate(() => { U.tab = 'ind'; U.indMode = 'dia'; render(); });
  await page.locator('#bipr').click();
  await page.locator('#ipr [data-pg="4"]').click();
  await expect(page.locator('#ipr .jor-2 .jor-b')).toHaveCount(2);
  await expect(page.locator('#ipr [data-jor="share"]')).toBeVisible();
  noErrors(errors, 'jornada');
});
