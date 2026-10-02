// Barra superior según la pestaña y un solo selector de fecha para toda la app.
import { test, expect } from '@playwright/test';
import { openApp, openTab, noErrors } from './helpers.js';

test('Exportar Excel solo en el Lookahead; deshacer solo donde se edita', async ({ page }) => {
  const errors = await openApp(page);
  await openTab(page, 'look');
  await expect(page.locator('#bexport')).toBeVisible();
  await expect(page.locator('#bundo')).toBeVisible();
  await openTab(page, 'lib');
  await expect(page.locator('#bexport')).toBeHidden();
  await expect(page.locator('#bundo')).toBeHidden();
  await openTab(page, 'team');
  await expect(page.locator('#wprev')).toBeHidden();
  noErrors(errors, 'barra');
});

test('el día elegido es el mismo en Campo, Plan diario e Indicadores', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo' });
  await openTab(page, 'campo');
  await expect(page.locator('#wnum')).toHaveText('Jueves 01 oct');
  await expect(page.locator('#main .cdate')).toBeHidden();
  await page.click('#wprev');
  await expect(page.locator('#wnum')).toHaveText('Miércoles 30 set');
  await openTab(page, 'mapa');
  await expect(page.locator('#wnum')).toHaveText('Miércoles 30 set');
  await expect(page.locator('#mbar')).toContainText('30 set');
  await openTab(page, 'ind');
  await expect(page.locator('#main')).toContainText('30 set');
  await expect(page.locator('#wnext')).toBeEnabled();
  await page.click('#wtoday');
  await expect(page.locator('#wnum')).toHaveText('Jueves 01 oct');
  await expect(page.locator('#wnext')).toBeDisabled();
  noErrors(errors, 'fecha');
});

test('las pestañas por semana muestran la semana del día elegido', async ({ page }) => {
  const errors = await openApp(page);
  await openTab(page, 'campo');
  for (let i = 0; i < 4; i++) await page.click('#wprev');
  await openTab(page, 'plan');
  await expect(page.locator('#wnum')).toHaveText('Semana 57');
  await page.click('#wtoday');
  await expect(page.locator('#wnum')).toHaveText('Semana 58');
  noErrors(errors, 'semana');
});
