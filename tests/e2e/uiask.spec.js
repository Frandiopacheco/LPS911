// Ventana de confirmación propia (uiAsk, base.js) y aviso al SC antes de enviar actividades nuevas sin días.
// En el resto de pruebas uiAsk pasa por confirm/prompt del navegador (window.__uiAskNative); aquí se prueba la ventana real.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const BORR = ['lhprop', 'c1', { sc: 'c1', items: {
  n1: { after: { ambId: 'a1', sc: 'c1', name: 'Masillado', und: 'm2', metrado: 1, days: [], order: 900 }, ts: 5, by: 'sc@obra.pe', n: 'Sandra', sent: false },
  n2: { after: { ambId: 'a1', sc: 'c1', name: 'Masillado', und: 'm2', metrado: 1, days: [], order: 901 }, ts: 5, by: 'sc@obra.pe', n: 'Sandra', sent: false },
} }];

test('el SC recibe un aviso antes de enviar actividades nuevas sin días (ventana propia)', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [BORR] });
  await page.evaluate(() => { window.__uiAskReal = true; sendProp(); });
  const dlg = page.locator('.uask .uac');
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText('2 actividades nuevas sin días');
  await expect(dlg).toContainText('Masillado × 2');
  await dlg.getByRole('button', { name: 'Volver a revisar' }).click();
  await expect(page.locator('.uask')).toHaveCount(0);
  expect(await page.evaluate(() => __dbGet('lhprop', 'c1').items.n1.sent)).toBe(false);
  // Esc también cancela
  await page.evaluate(() => { sendProp(); });
  await expect(dlg).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.uask')).toHaveCount(0);
  // enviar igual
  await page.evaluate(() => { sendProp(); });
  await dlg.getByRole('button', { name: 'Enviar igual' }).click();
  await expect.poll(() => page.evaluate(() => __dbGet('lhprop', 'c1').items.n1.sent)).toBe(true);
  noErrors(errors, 'aviso sin días');
});

test('la ventana con texto obligatorio no deja aceptar vacío y devuelve lo escrito', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { window.__uiAskReal = true; window.__r = 'x'; uiAsk({ title: 'Motivo', input: { label: '¿Por qué?', required: true }, ok: 'Listo', tone: 'warn' }).then(v => { window.__r = v; }); });
  const ok = page.locator('.uask [data-ua="si"]');
  await expect(ok).toBeDisabled();
  await page.locator('.uask textarea').fill('  Acordado en obra ');
  await expect(ok).toBeEnabled();
  await ok.click();
  await expect.poll(() => page.evaluate(() => window.__r)).toBe('Acordado en obra');
  noErrors(errors, 'uiAsk texto');
});
