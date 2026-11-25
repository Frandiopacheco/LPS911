// Módulos por rol (Equipo › Módulos; base.js «Módulos por rol», docs/ia/interfaz.md): el administrador decide qué roles ven Avance,
// Casco y Planos. Avance y Casco nacen apagados; Planos sin dato sigue como siempre. Es visibilidad, no seguridad.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const mods = () => page => page.evaluate(() => MODS().map(x => x[0]));
const PM = ['avp', 'pm', { v: 2, nom: 'Mobiliario', d0: '2026-09-21', d1: '2026-10-31', ord: 0, arch: null }];

test('módulos por rol: Avance y Casco apagados no se ven ni se abren; Planos sigue como siempre', async ({ page }) => {
  // la obra aún no decide nada (como estará producción): el documento no trae listas
  const errors = await openApp(page, { as: 'editor', extra: [['meta', 'mods', {}], PM, ['cs_meta', 'project', { name: 'Casco' }]] });
  expect(await mods()(page)).toEqual(['lps', 'pla']);
  await page.evaluate(() => goMod('ava')); expect(await page.evaluate(() => U.mod)).toBe('lps');           // no entra
  await page.evaluate(() => goMod('cas')); expect(await page.evaluate(() => [U.mod, localStorage.getItem('lps.ns') || ''])).toEqual(['lps', '']);
  expect(await page.evaluate(() => [canAva(), avaCfg(), tabAllowed('areg')])).toEqual([false, false, false]);
  noErrors(errors);
  // el administrador ve todo aunque esté apagado
  const e2 = await openApp(page, { as: 'admin', extra: [['meta', 'mods', {}], PM, ['cs_meta', 'project', { name: 'Casco' }]] });
  expect(await mods()(page)).toEqual(expect.arrayContaining(['lps', 'cas', 'pla', 'ava']));
  noErrors(e2);
});

test('módulos por rol: el administrador enciende Avance para un rol desde Equipo y apaga Planos sin quitar las láminas de Last Planner', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'team', extra: [['meta', 'mods', {}], PM] });
  await page.click('[data-teamv="mod"]');
  const ck = k => page.locator(`input[data-modr="${k}"]`);
  await expect(ck('ava|editor')).not.toBeChecked(); await expect(ck('pla|editor')).toBeChecked();     // Planos: como siempre
  await expect(ck('ava|capataz')).toBeDisabled(); await expect(ck('pla|capataz')).toBeEnabled();
  await expect(page.locator('.modt tr', { hasText: 'Avance' })).toContainText('Apagado');
  await ck('ava|editor').check(); await ck('ava|campo').check();
  await expect.poll(() => page.evaluate(() => (__dbGet('meta', 'mods') || {}).ava)).toEqual(['editor', 'campo']);
  await expect(page.locator('.modt tr', { hasText: 'Avance' })).toContainText('2 roles');
  await ck('pla|editor').uncheck();
  await expect.poll(() => page.evaluate(() => (__dbGet('meta', 'mods') || {}).pla)).toEqual(['campo', 'sc', 'capataz', 'area', 'veedor', 'lector']);
  expect((await page.evaluate(() => __dbGet('meta', 'mods'))).by).toBeTruthy();
  noErrors(errors);
  // el editor ahora ve Avance; no ve el módulo Planos, pero conserva las láminas dentro de Last Planner
  const st = await page.evaluate(() => __dbGet('meta', 'mods'));
  const e2 = await openApp(page, { as: 'editor', extra: [['meta', 'mods', st], PM] });
  expect(await mods()(page)).toEqual(['lps', 'ava']);
  expect(await page.evaluate(() => [canPla(), tabAllowed('pbib')])).toEqual([true, false]);
  await page.evaluate(() => goMod('ava')); await expect(page.locator('#main')).toHaveAttribute('data-view', 'areg');
  // se lo quitan mientras está dentro: vuelve a Last Planner
  await page.evaluate(() => { window.__dbRemote = true; return fcolLp('meta').doc('mods').set({ ava: ['campo'] }, { merge: true }); });
  await expect.poll(() => page.evaluate(() => U.mod)).toBe('lps');
  noErrors(e2);
  // el lector nunca lo tuvo
  const e3 = await openApp(page, { as: 'lector', extra: [['meta', 'mods', st], PM] });
  expect(await mods()(page)).toEqual(['lps', 'pla']);
  noErrors(e3);
});

test('módulos por rol: a quien está dentro de Casco y le quitan el permiso lo devuelve a Last Planner', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const errors = await openApp(page, { as: 'editor', extra: [['meta', 'mods', { cas: ['campo'] }], ['cs_meta', 'project', { name: 'Casco' }]] });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lps.ns') || '')).toBe('');
  await expect.poll(() => page.evaluate(() => typeof CS === 'function' && !CS() && typeof U !== 'undefined' && U.mod)).toBe('lps');
  noErrors(errors);
});
