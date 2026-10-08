// Tareo F1 (docs/ia/tareo.md): invitación para capataces del tareo (consorcio), role:'tcap' sin partida.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, noErrors, HOY } from './helpers.js';

const FAKE = path.join(path.dirname(new URL(import.meta.url).pathname), 'fake-firebase.js');

test('admin: crea una invitación del tareo (sin partida) y se distingue en la lista', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'team', editar: false });
  await page.click('[data-teamv="cap"]');
  await page.selectOption('#invsc', '__tcap');
  await page.click('#invgo');
  await expect(page.locator('.qrlb')).toContainText('Capataz del tareo');
  const url = await page.locator('.qrlb input').inputValue();
  expect(url).toMatch(/\?inv=\w+&m=tar$/);
  const inv = Object.values(await page.evaluate(() => window.__dbAll('inv')));
  expect(inv).toHaveLength(1);
  expect(inv[0].role).toBe('tcap');
  expect(inv[0].scs).toBeUndefined();
  await page.click('.qrlb [data-qx]');
  await expect(page.locator('tr[data-invtar]')).toContainText('Capataz del tareo');
  noErrors(errors.filter(e => !/qrcode/i.test(e)), 'admin invitación');
});

test('celular nuevo: abre el enlace, escribe su nombre y entra al Tareo como tcap', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date(HOY + 'T09:30:00-05:00'));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.fulfill({ status: 200, contentType: /\.css(\?|$)|fonts\.googleapis/.test(r.request().url()) ? 'text/css' : 'text/javascript', body: '' }));
  await page.route('**/firebase-config.js', r => r.fulfill({ status: 200, contentType: 'text/javascript',
    body: 'window.FIREBASE_CONFIG={apiKey:"e2e",projectId:"demo-lps"};window.LPS_ENV="pruebas";window.NO_SW=true;' }));
  const exp = new Date(HOY + 'T09:30:00-05:00').getTime() + 7 * 864e5;
  await page.addInitScript(({ HOY, exp }) => {
    window.__E2E = { user: null, today: HOY, anonUid: 'nuevo1', extra: [['inv', 'tcx', { active: true, exp, role: 'tcap', by: 'frandiopacheco@gmail.com', ts: 1 }]] };
  }, { HOY, exp });
  await page.addInitScript({ path: FAKE });
  await page.goto('/?inv=tcx&m=tar');
  await expect(page.locator('#ljoin')).toBeVisible();
  await expect(page.locator('#ljoin')).toContainText('tareo');
  await expect(page.locator('#ljoin')).not.toContainText('partida');
  await page.fill('#jname', 'Luis Quispe');
  await page.click('#jsubmit');
  await expect(page.locator('#login')).toBeHidden();
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  const m = await page.evaluate(() => window.__dbGet('members', 'u_nuevo1'));
  expect(m).toMatchObject({ role: 'tcap', name: 'Luis Quispe', inv: 'tcx' });
  expect(m.scs).toBeUndefined();
  expect(Object.keys(m).sort()).toEqual(['added', 'inv', 'name', 'role']);
  expect(await page.evaluate(() => [me.role, U.mod, TAR_ONLY()])).toEqual(['tcap', 'tar', true]);
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  noErrors(errors, 'tcap con enlace');
  await ctx.close();
});

test('la invitación de capataz de SC sigue registrando capataz con su partida', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(HOY + 'T09:30:00-05:00'));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.route('**/firebase-config.js', r => r.fulfill({ status: 200, contentType: 'text/javascript',
    body: 'window.FIREBASE_CONFIG={apiKey:"e2e",projectId:"demo-lps"};window.LPS_ENV="pruebas";window.NO_SW=true;' }));
  const exp = new Date(HOY + 'T09:30:00-05:00').getTime() + 7 * 864e5;
  await page.addInitScript(({ HOY, exp }) => {
    window.__E2E = { user: null, today: HOY, anonUid: 'nuevo2', extra: [['inv', 'scx', { active: true, exp, scs: ['c1'], by: 'x', ts: 1 }]] };
  }, { HOY, exp });
  await page.addInitScript({ path: FAKE });
  await page.goto('/?inv=scx');
  await expect(page.locator('#ljoin')).toContainText('partida');
  await page.fill('#jname', 'Ana Torres');
  await page.click('#jsubmit');
  await expect(page.locator('#login')).toBeHidden();
  const m = await page.evaluate(() => window.__dbGet('members', 'u_nuevo2'));
  expect(m).toMatchObject({ role: 'capataz', scs: ['c1'], sc: 'c1' });
  await ctx.close();
});
