// Avisos de detenciones (js/avisos.js, oct 2026): botón 🔔 y hoja para activar en cada equipo, pisos del administrador,
// horario en Configuración y abrir la ficha en Campo al tocar un aviso (?det=… o mensaje del service worker).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

test('Avisos: hoja con estado del equipo, pisos del administrador y ficha al tocar el aviso', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page, { tab: 'dash' });
  const bell = page.locator('#bpush');
  await expect(bell).toBeVisible();
  // sin la clave del proyecto: lo dice y no ofrece activar
  await page.evaluate(() => { window.FCM_VAPID = ''; });
  await bell.click();
  const sh = page.locator('#pushsheet');
  await expect(sh).toContainText('Falta configurar la clave de avisos');
  await expect(sh.locator('[data-push="on"]')).toHaveCount(0);
  await expect(sh).toContainText('todos los pisos');
  await sh.locator('[data-kx]').click();
  // con la clave: ofrece activar; el administrador elige pisos (se guardan en pushp/<correo>)
  await page.evaluate(() => { window.FCM_VAPID = 'clave-de-prueba'; window.NO_SW = false; Object.defineProperty(Notification, 'permission', { get: () => 'default' }); }); // las pruebas apagan el service worker: aquí solo se mira la hoja
  await bell.click();
  await expect(sh.locator('[data-push="on"]')).toBeVisible();
  await expect(sh.locator('[data-push="pis"]').first()).toBeVisible();
  await sh.locator('[data-push="pis"]').first().click();
  await expect(sh.locator('[data-push="pall"]')).not.toHaveClass(/on/);
  const saved = await page.evaluate(async () => { const s = await fcol('pushp').doc(pushMid()).get(); return s.exists ? s.data().pisos : null; });
  expect(saved.length).toBe(1);
  await expect(sh).not.toContainText('todos los pisos');
  await sh.locator('[data-push="pall"]').click();
  await expect(sh).toContainText('todos los pisos');
  await sh.locator('[data-kx]').click();
  // horario en Configuración › Proyecto
  await page.evaluate(() => { U.tab = 'cfg'; render(); });
  await page.click('[data-cfgv="pry"]');
  await expect(page.locator('#p_pui')).toHaveValue('07:00');
  await expect(page.locator('#p_puf')).toHaveValue('18:00');
  // tocar un aviso: abre Campo y la ficha de la actividad
  const aid = await page.evaluate(() => { const d = todayIso(); const x = [...S.act.values()].find(x => schedOrSnap(x, d)); return x && x.id; });
  await page.evaluate(([a, d]) => pushGo(a, d), [aid, HOY]);
  await expect(page.locator('#tabs [data-tab="campo"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.ksheet .ksh')).toBeVisible();
  noErrors(errors, 'avisos');
});
