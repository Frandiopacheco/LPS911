// Configuración por secciones (como Equipo): cada sección se dibuja sola y se recuerda.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

for (const as of ['admin', 'lector']) test(`${as}: todas las secciones de Configuración se dibujan`, async ({ page }) => {
  const errors = await openApp(page, { as, tab: 'cfg' });
  const secs = await page.locator('[data-cfgv]').evaluateAll(b => b.map(x => x.dataset.cfgv));
  expect(secs.slice(0, 7)).toEqual(['sc', 'esp', 'tpl', 'rst', 'cal', 'cld', 'pry']);
  for (const k of secs) {
    await page.click(`[data-cfgv="${k}"]`);
    await expect(page.locator(`[data-cfgv="${k}"]`)).toHaveClass(/on/);
    await expect(page.locator('#main .card').first()).toBeVisible();
  }
  await page.reload();
  await expect(page.locator(`[data-cfgv="${secs[secs.length - 1]}"]`)).toHaveClass(/on/);
  noErrors(errors, as);
});
