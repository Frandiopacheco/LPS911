// Recorre todas las pestañas con cada rol (escritorio y celular) y revisa que ninguna falle.
import { test, expect } from '@playwright/test';
import { openApp, expectTabOk, visibleTabs, noErrors, openTab } from './helpers.js';

const ROLES = ['admin', 'editor', 'campo', 'sc', 'calidad', 'ot', 'veedor', 'lector', 'planner'];

for (const as of ROLES) {
  test(`escritorio · ${as}: todas las pestañas se dibujan`, async ({ page }) => {
    const errors = await openApp(page, { as });
    const tabs = await visibleTabs(page);
    expect(tabs.length, 'debe haber pestañas visibles').toBeGreaterThan(4);
    for (const t of tabs) {
      await openTab(page, t);
      await expect(page.locator(`#tabs button[data-tab="${t}"]`)).toHaveAttribute('aria-selected', 'true');
      await page.waitForTimeout(150);
      await expectTabOk(page, `${t} (${as})`);
    }
    noErrors(errors, as);
  });
}

test('escritorio · modo oscuro: todas las pestañas se dibujan', async ({ page }) => {
  const errors = await openApp(page, { theme: 'dark' });
  for (const t of await visibleTabs(page)) {
    await openTab(page, t);
    await page.waitForTimeout(120);
    await expectTabOk(page, t + ' (oscuro)');
  }
  noErrors(errors, 'oscuro');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const as of ['admin', 'campo', 'sc']) {
    test(`celular · ${as}: menú inferior y "Más secciones"`, async ({ page }) => {
      const errors = await openApp(page, { as });
      const bnav = page.locator('#bnav');
      await expect(bnav).toBeVisible();
      const items = await bnav.locator('[data-bt]').evaluateAll(bs => bs.map(b => b.dataset.bt).filter(t => t !== 'more'));
      for (const t of items) {
        await bnav.locator(`[data-bt="${t}"]`).click();
        await page.waitForTimeout(150);
        await expectTabOk(page, `${t} (celular ${as})`);
      }
      await bnav.locator('[data-bt="more"]').click();
      const sheet = page.locator('#msheet');
      await expect(sheet).toBeVisible();
      const more = await sheet.locator('[data-bt]').evaluateAll(bs => bs.map(b => b.dataset.bt));
      for (const t of more) {
        if (!(await sheet.isVisible())) await bnav.locator('[data-bt="more"]').click();
        await sheet.locator(`[data-bt="${t}"]`).click();
        await page.waitForTimeout(150);
        await expectTabOk(page, `${t} (celular ${as})`);
      }
      // Los botones del menú inferior se pueden tocar con el dedo (≥ 40 px)
      const sizes = await bnav.locator('button').evaluateAll(bs => bs.map(b => b.getBoundingClientRect().height));
      for (const h of sizes) expect(h).toBeGreaterThanOrEqual(40);
      noErrors(errors, 'celular ' + as);
    });
  }

  test('celular · capataz: entra directo a "En obra"', async ({ page }) => {
    const errors = await openApp(page, { as: 'capataz' });
    await expect(page.locator('body')).toHaveClass(/cap-mode/);
    await expectTabOk(page, 'cap (capataz)');
    noErrors(errors, 'capataz');
  });
});

test.describe('pestañas por rol', () => {
  const barra = page => page.locator('#tabs button[data-tab]:visible').evaluateAll(bs => bs.map(b => b.dataset.tab));
  test('el subcontratista ve lo suyo y no ve Equipo', async ({ page }) => {
    await openApp(page, { as: 'sc' });
    const b = await barra(page);
    expect(b).toEqual(expect.arrayContaining(['look', 'cap', 'restr', 'lib']));
    expect(b).not.toContain('cfg');
    expect(await visibleTabs(page)).not.toContain('team');
  });
  test('Calidad tiene Liberaciones en la barra', async ({ page }) => {
    await openApp(page, { as: 'calidad' });
    expect(await barra(page)).toContain('lib');
  });
  test('lo poco usado va en "Más" y se abre desde ahí', async ({ page }) => {
    const errors = await openApp(page, { as: 'campo' });
    expect(await barra(page)).not.toContain('cfg');
    await openTab(page, 'cfg');
    await expect(page.locator('#tabMore')).toContainText('Configuración');
    noErrors(errors, 'más');
  });
  test('el orden sigue el ciclo Last Planner', async ({ page }) => {
    await openApp(page);
    expect(await barra(page)).toEqual(['hoy', 'dash', 'look', 'mat', 'restr', 'plan', 'mapa', 'campo', 'lib', 'ind']);
  });
});

test.describe('menú inferior por rol', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Calidad tiene Liberaciones a la mano', async ({ page }) => {
    await openApp(page, { as: 'calidad' });
    await expect(page.locator('#bnav [data-bt="lib"]')).toBeVisible();
    await expect(page.locator('#bnav [data-bt="lib"]')).toContainText('Liberaciones');
  });
  test('los nombres no se abrevian', async ({ page }) => {
    await openApp(page, { as: 'campo' });
    await expect(page.locator('#bnav')).toContainText('Restricciones');
    await expect(page.locator('#bnav')).toContainText('Plan diario');
  });
});
