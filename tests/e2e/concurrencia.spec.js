// Varios usuarios a la vez: lo que llega de otros no debe cerrar una lista desplegable abierta ni borrar
// el rectángulo que se está dibujando sobre un plano.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { LAMINA, enPantalla } from './lamina.js';

const otroUsuario = page => page.evaluate(() => fcol('acts').doc('t2').update({ name: 'Tarrajeo de muros ' + Math.random().toString(36).slice(2, 6) }));

test('una lista desplegable abierta no se cierra cuando otro usuario guarda algo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo' });
  await page.evaluate(() => { CU.view = 'list'; render(); });
  const sel = page.locator('#csc');
  await sel.click(); // se abre (queda con el foco)
  await page.evaluate(() => { document.querySelector('#csc')._marca = 1; });
  await otroUsuario(page);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => !!(document.querySelector('#csc') || {})._marca)).toBe(true); // es la misma lista, no se redibujó
  await sel.selectOption('c1'); // al elegir, la pantalla se actualiza
  await expect(page.locator('#csc')).toHaveValue('c1');
  noErrors(errors, 'lista');
});

test('el rectángulo que se dibuja no desaparece si llegan cambios de otros', async ({ page }) => {
  const errors = await openApp(page, { tab: 'planos', extra: LAMINA });
  await page.locator('[data-szp="p1"]').click();
  await page.locator('[data-szd="a:a1"]').click();
  const a = await enPantalla(page, '#szmap', 100, 100), b = await enPantalla(page, '#szmap', 300, 300);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y);
  await otroUsuario(page);
  await page.waitForTimeout(400);
  await expect(page.locator('#szmap svg rect')).toHaveCount(1); // la vista previa sigue ahí
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => ((window.__dbGet('ambientes', 'a1').geo || {}).L1 || []).length)).toBe(8);
  noErrors(errors, 'rectángulo');
});
