// Ayuda: flujogramas de funcionamiento según el rol de cada usuario.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const flujos = page => page.locator('#lqm [data-ayf]').evaluateAll(bs => bs.map(b => b.dataset.ayf));

test('el administrador ve todos sus flujos, puede ver los de otro rol e ir a una sección', async ({ page }) => {
  const errors = await openApp(page);
  await page.click('#bhelp');
  await expect(page.locator('#lqm .ayc')).toBeVisible();
  expect(await flujos(page)).toEqual(['ciclo', 'look', 'prop', 'pdEng', 'sem', 'campo', 'restr', 'libCal', 'np', 'team', 'cierre']);
  await expect(page.locator('.ayflow h3')).toHaveText('Ciclo Last Planner');
  await expect(page.locator('.ayflow .ayq').first()).toBeVisible();
  await page.click('[data-ayf="team"]');
  await expect(page.locator('.ayflow h3')).toHaveText('Equipo y accesos');
  // ver la ayuda del capataz (un solo flujo, sin pestañas)
  await page.selectOption('#ayr', 'capataz');
  await expect(page.locator('#lqm [data-ayf]')).toHaveCount(0);
  await expect(page.locator('.ayflow h3')).toHaveText('Reportar desde el celular (capataz)');
  // un paso con sección lleva a ella y cierra la ayuda
  await page.selectOption('#ayr', 'admin');
  await page.click('[data-ayf="look"]');
  await page.locator('.ayflow [data-aygo="look"]').first().click();
  await expect(page.locator('#lqm')).toHaveCount(0);
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'look');
  noErrors(errors, 'ayuda admin');
});

test('el subcontratista solo ve sus flujos y no puede elegir otro rol', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc' });
  await page.click('#bhelp');
  await expect(page.locator('#ayr')).toHaveCount(0);
  await expect(page.locator('.ayrole')).toContainText('Subcontratista');
  expect(await flujos(page)).toEqual(['ciclo', 'propSc', 'pdSc', 'obraSc', 'restr', 'libSol']);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lqm')).toHaveCount(0);
  noErrors(errors, 'ayuda sc');
});

test('Calidad ve sus flujos de liberaciones; campo no tiene acceso directo a En obra', async ({ page }) => {
  let errors = await openApp(page, { as: 'calidad' });
  await page.click('#bhelp');
  expect(await flujos(page)).toEqual(['ciclo', 'libCal', 'libSol', 'area', 'np']);
  noErrors(errors, 'ayuda calidad');
  errors = await openApp(page, { as: 'campo' });
  await page.click('#bhelp');
  expect(await flujos(page)).toEqual(['ciclo', 'campo', 'np', 'restr', 'consulta']);
  await expect(page.locator('.ayflow [data-aygo="cap"]')).toHaveCount(0);
  await expect(page.locator('.ayflow [data-aygo="campo"]')).toHaveCount(1);
  noErrors(errors, 'ayuda campo');
});

test('modo oscuro: la ayuda se dibuja sin errores', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', theme: 'dark' });
  await page.click('#bhelp');
  expect(await flujos(page)).toEqual(['ciclo', 'look', 'prop', 'pdEng', 'sem', 'campo', 'restr', 'libSol', 'np']);
  for (const f of await flujos(page)) { await page.click(`[data-ayf="${f}"]`); await expect(page.locator('.ayflow .ayn').first()).toBeVisible(); }
  noErrors(errors, 'ayuda oscuro');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('desde el menú «Más» y desde el menú del capataz', async ({ page }) => {
    let errors = await openApp(page, { as: 'campo' });
    await page.click('#bnav [data-bt="more"]');
    await page.click('#msheet [data-act="help"]');
    await expect(page.locator('#lqm .ayc')).toBeVisible();
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w).toBeLessThanOrEqual(390);
    noErrors(errors, 'ayuda celular');
    errors = await openApp(page, { as: 'capataz' });
    await page.click('[data-kmenu]');
    await page.click('#pop [data-do="help"]');
    await expect(page.locator('.ayflow h3')).toHaveText('Reportar desde el celular (capataz)');
    await expect(page.locator('.ayrole')).toContainText('Capataz');
    noErrors(errors, 'ayuda capataz');
  });
});
