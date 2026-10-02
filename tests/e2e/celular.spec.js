// Celular: filtros plegables, tarjetas de números deslizables y tablas como tarjetas, sin desplazamiento lateral.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const sinScrollLateral = async page => {
  const w = await page.locator('#main .scroll').evaluate(el => el.scrollWidth - el.clientWidth);
  expect(w, 'la página no debe moverse de lado').toBeLessThanOrEqual(1);
};

test('Liberaciones: los filtros se pliegan y lo pendiente aparece antes', async ({ page }) => {
  const errors = await openApp(page, { as: 'calidad' });
  await expect(page.locator('#lqsc')).toBeHidden();
  const top = await page.locator('.lqcols').evaluate(el => el.getBoundingClientRect().top);
  expect(top, 'la bandeja empieza en la primera pantalla').toBeLessThan(844);
  await page.click('[data-ftog]');
  await expect(page.locator('#lqsc')).toBeVisible();
  await page.selectOption('#lqsc', 'c2');
  await expect(page.locator('[data-ftog]')).toContainText('Filtros · 1');
  await sinScrollLateral(page);
  noErrors(errors, 'lib celular');
});

test('Equipo y Matriz se ven como tarjetas en el celular', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await expect(page.locator('table.tmem thead')).toBeHidden();
  await sinScrollLateral(page);
  await page.evaluate(() => { U.tab = 'lib'; U.libV = 'mat'; render(); });
  await expect(page.locator('table.lqmt thead')).toBeHidden();
  await sinScrollLateral(page);
  noErrors(errors, 'tablas celular');
});

for (const as of ['admin', 'sc', 'calidad', 'campo']) {
  test(`ninguna pestaña es más ancha que el celular (${as})`, async ({ page }) => {
    const errors = await openApp(page, { as });
    const tabs = await page.evaluate(() => TAB_ORDER.filter(tabAllowed));
    for (const t of tabs) {
      await page.evaluate(t => goTab(t), t);
      await page.waitForTimeout(150);
      const w = await page.evaluate(() => ({ iw: innerWidth, sw: document.documentElement.scrollWidth }));
      expect(w.iw, `la pestaña ${t} no debe agrandar la página`).toBe(390);
      expect(w.sw, `la pestaña ${t} no debe moverse de lado`).toBeLessThanOrEqual(391);
    }
    noErrors(errors, 'ancho ' + as);
  });
}
