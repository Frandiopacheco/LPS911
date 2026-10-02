// Modo presentación del Lookahead: pantalla limpia, letra grande, edición bloqueada y salida con Esc.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('presentar el lookahead en la reunión semanal', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.click('#fpres');
  await expect(page.locator('#presbar')).toBeVisible();
  await expect(page.locator('.top')).toBeHidden();
  await expect(page.locator('#fq')).toBeHidden();
  // bloqueada: los campos no se pueden cambiar
  await expect(page.locator('input[data-a="i0"][data-f="name"]')).toHaveAttribute('readonly', '');
  // semana, piso y tamaño
  await page.click('#presbar [data-pb="wn"]');
  await expect(page.locator('#presbar')).toContainText('semanas 59');
  await page.selectOption('#pbpiso', 'p2');
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(0);
  // filtrar por semana o por día desde la barra de la presentación
  await page.selectOption('#pbpiso', 'p1');
  await page.click('#presbar [data-pb="wt"]');
  await page.selectOption('#pbwk', '59');
  await expect(page.locator('#grid tr[data-a]')).toHaveCount(2); // solo el tarrajeo tiene días en la semana 59
  await page.selectOption('#pbday', '2026-10-02');
  await expect(page.locator('#grid tr[data-a]')).toHaveCount(2); // entubado el viernes 2
  await expect(page.locator('#pbwk')).toHaveValue('');
  await page.click('#presbar [data-pb="fx"]');
  await expect(page.locator('#grid tr[data-a]')).toHaveCount(6);
  // también tocando el encabezado de un día en la tabla
  await page.click('th[data-dh="2026-10-01"]');
  await expect(page.locator('#pbday')).toHaveValue('2026-10-01');
  await page.click('#presbar [data-pb="fx"]');
  await page.selectOption('#pbpiso', 'p2');
  await page.click('#presbar [data-pb="z+"]');
  expect(await page.locator('#gw').evaluate(g => getComputedStyle(g).zoom)).toBe('1.1');
  // desbloquear para mover algo durante la reunión
  await page.selectOption('#pbpiso', 'p1');
  await page.click('#presbar [data-pb="lock"]');
  await expect(page.locator('input[data-a="i0"][data-f="name"]')).not.toHaveAttribute('readonly', '');
  await page.click('#presbar [data-pb="ptr"]');
  await page.mouse.move(400, 400);
  await expect(page.locator('#presptr')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presbar')).toHaveCount(0);
  await expect(page.locator('.top')).toBeVisible();
  noErrors(errors, 'presentación');
});
