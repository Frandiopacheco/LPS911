// Pantalla «Hoy»: cada rol entra a lo que le toca hoy, con accesos directos.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('el administrador entra a Hoy: primero lo pendiente, lo que está al día al final', async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'hoy');
  const k = await page.locator('.hoyc').evaluateAll(cs => cs.map(c => c.dataset.hoy));
  expect(k).toEqual(['campo', 'restr', 'lib', 'plan', 'prop', 'np']);
  await expect(page.locator('[data-hoy="campo"]')).toContainText('sin registrar');
  await page.click('[data-hoy="campo"] [data-hgo]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'campo');
  noErrors(errors, 'hoy admin');
});

test('Calidad ve primero sus inspecciones y lo que falta programar', async ({ page }) => {
  const errors = await openApp(page, { as: 'calidad' });
  const first = page.locator('.hoyc').first();
  await expect(first).toHaveAttribute('data-hoy', 'lib');
  await expect(first).toContainText('mañana');
  await expect(first).toContainText('por programar');
  noErrors(errors, 'hoy calidad');
});

test('el subcontratista ve su avance de hoy y sus restricciones', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc' });
  const k = await page.locator('.hoyc').evaluateAll(cs => cs.map(c => c.dataset.hoy));
  expect(k).toEqual(['obra', 'lib', 'restr']);
  await expect(page.locator('[data-hoy="obra"]')).toContainText('sin iniciar');
  noErrors(errors, 'hoy sc');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Hoy es la primera opción del menú inferior', async ({ page }) => {
    const errors = await openApp(page, { as: 'campo' });
    await expect(page.locator('#bnav [data-bt]').first()).toHaveAttribute('data-bt', 'hoy');
    await expect(page.locator('#bnav [data-bt="hoy"]')).toHaveClass(/on/);
    noErrors(errors, 'hoy celular');
  });
});
