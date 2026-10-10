// Ctrl+Z / Ctrl+Y del lookahead solo donde está el botón de deshacer; en otras pestañas no deshace nada sin aviso.
import { test, expect } from '@playwright/test';
import { openApp, openTab, noErrors } from './helpers.js';

const nombre = page => page.evaluate(() => window.__dbGet('acts', 't1').name);
const cambio = page => page.evaluate(() => { const x = S.act.get('t1'); apply([op('acts', 't1', { ...x, name: 'CAMBIO' })], 'cambio'); });

for (const tab of ['mapa', 'campo', 'mat', 'ind', 'hoy']) {
  test(`Ctrl+Z en ${tab} no deshace el último cambio del Lookahead`, async ({ page }) => {
    const errors = await openApp(page, { tab: 'look' });
    await cambio(page);
    await expect.poll(() => nombre(page)).toBe('CAMBIO');
    await openTab(page, tab);
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(400);
    expect(await nombre(page)).toBe('CAMBIO');
    noErrors(errors, tab);
  });
}

test('Ctrl+Z y Ctrl+Y siguen funcionando en el Lookahead', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await cambio(page);
  await expect.poll(() => nombre(page)).toBe('CAMBIO');
  await page.keyboard.press('Control+z');
  await expect.poll(() => nombre(page)).toBe('Tarrajeo de muros');
  await page.keyboard.press('Control+y');
  await expect.poll(() => nombre(page)).toBe('CAMBIO');
  noErrors(errors, 'look');
});
