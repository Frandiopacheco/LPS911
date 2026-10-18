// Sesión pull (js/pull.js): borrador de pull planning con pósits que no toca el lookahead hasta aplicarlo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

test.describe.configure({ timeout: 150_000 });

async function nuevaSesion(page) {
  await page.evaluate(() => { U.piso = 'p1'; goTab('pull'); });
  await page.locator('[data-pu="new"]').first().click();
  await page.locator('#punom').fill('Prueba pull');
  await page.locator('[data-puamb="a1"]').click();
  await page.locator('[data-pu="create"]').click();
  await expect(page.locator('.pup').first()).toBeVisible();
}

test('Sesión pull: crear, mover, enlazar con hito, revisar y aplicar al lookahead', async ({ page }) => {
  const errors = await openApp(page);
  const t0 = await page.evaluate(() => JSON.stringify(window.__dbGet('acts', 't0').days));
  await nuevaSesion(page);
  // trae como pósits las actividades del ambiente con días desde mañana (e0 y t0; i0 solo tiene hoy y ayer)
  await expect(page.locator('.pup[data-pid="e0"]')).toHaveCount(1);
  await expect(page.locator('.pup[data-pid="t0"]')).toHaveCount(1);
  await expect(page.locator('.pup[data-pid="i0"]')).toHaveCount(0);
  const sid = await page.evaluate(() => PU.sid);

  // mover t0 dos días más tarde arrastrando: cambia la sesión, NO el lookahead
  const box = await page.locator('.pup[data-pid="t0"]').boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 10 + 2 * 56, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(id => window.__dbGet('pull', id).ps.t0.d0, sid)).not.toBe(JSON.parse(t0).filter(d => d > HOY)[0]);
  expect(await page.evaluate(() => JSON.stringify(window.__dbGet('acts', 't0').days))).toBe(t0);
  expect(await page.evaluate(id => !window.__dbGet('pull', id).lk.t0, sid)).toBe(true); // se soltó el bloqueo

  // enlazar e0 → t0 jalando desde el círculo de e0
  const h = await page.locator('[data-puh="e0"]').boundingBox();
  const tb = await page.locator('.pup[data-pid="t0"]').boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(id => Object.keys(window.__dbGet('pull', id).ln), sid)).toContain('e0>t0');

  // con t0 seleccionado (tocar un pósit lo selecciona o lo suelta), el hito de entrega se vincula con un toque
  if (await page.evaluate(() => PU.sel) !== 't0') await page.locator('.pup[data-pid="t0"]').click();
  await page.locator('[data-puhc="t0>H:ent"]').click();
  await expect.poll(() => page.evaluate(id => Object.keys(window.__dbGet('pull', id).ln), sid)).toContain('t0>H:ent');

  // revisar: muestra el cambio de t0 y aplicar lo pasa al lookahead en un solo paso
  await page.locator('[data-pu="rev"]').click();
  await expect(page.locator('.purvt')).toContainText('Tarrajeo de muros');
  await page.locator('[data-pu="apply"]').click();
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__dbGet('acts', 't0').days))).not.toBe(t0);
  const after = await page.evaluate(() => window.__dbGet('acts', 't0').days);
  expect(after.every(d => d > HOY)).toBe(true);
  expect(after.length).toBe(JSON.parse(t0).length);
  // la sesión queda alineada con el lookahead nuevo
  await expect.poll(() => page.evaluate(id => !!window.__dbGet('pull', id).apl, sid)).toBe(true);
  noErrors(errors, 'pull');
});

test('Sesión pull: el lector no ve la pestaña; agregar actividad y programar hacia atrás', async ({ page }) => {
  const errors = await openApp(page);
  await nuevaSesion(page);
  const sid = await page.evaluate(() => PU.sid);
  await page.locator('[data-pu="add"]').click();
  await page.locator('.pusc').first().click();
  await page.locator('#puan').fill('Instalación de luminarias');
  await page.locator('[data-pu="addok"]').click();
  await expect(page.locator('.pup', { hasText: 'Instalación de luminarias' })).toHaveCount(1);
  const pid = await page.evaluate(() => PU.sel);
  // vincular la nueva al hito de entrega y programar hacia atrás: termina justo antes del hito menos el colchón
  await page.locator(`[data-puhc="${pid}>H:ent"]`).click();
  await page.locator('[data-pu="bwd"]').click();
  const r = await page.evaluate(({ id, pid }) => { const s = window.__dbGet('pull', id); const p = s.ps[pid]; return { d0: p.d0, dur: p.dur, ent: s.h.ent.d, buf: s.buf }; }, { id: sid, pid });
  const end = await page.evaluate(r => wshift(r.d0, r.dur - 1), r);
  expect(await page.evaluate(({ end, r }) => wdist(end, r.ent), { end, r })).toBe(r.buf + 1);
  noErrors(errors, 'pull2');

  const p2 = await page.context().newPage();
  const e2 = await openApp(p2, { as: 'lector' });
  expect(await p2.evaluate(() => tabAllowed('pull'))).toBe(false);
  noErrors(e2, 'lector');
});
