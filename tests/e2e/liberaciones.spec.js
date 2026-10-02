// Liberaciones de calidad: vistas, filtros, flujo completo, solicitud nueva, matriz e inspectores.
import { test, expect } from '@playwright/test';
import { openApp, expectTabOk, noErrors, MANANA, openTab } from './helpers.js';

const lib = (page, id) => page.evaluate(id => window.__dbGet('lib', id), id);
const libm = page => page.evaluate(() => window.__dbGet('libm', 'main'));
const M = '#main';

async function abrir(page, as = 'admin') {
  const errors = await openApp(page, { as, tab: 'lib' });
  await openTab(page, 'lib');
  const todos = page.locator('[data-lqall]');
  if (await todos.count()) await todos.click();
  await expect(page.locator(`${M} .lqcols`)).toBeVisible();
  return errors;
}

test('vistas y filtros (admin)', async ({ page }) => {
  const errors = await abrir(page);
  expect(await page.locator(`${M} .lqcard`).count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator(M)).toContainText('Falta fijar día');
  await page.click('#lqv [data-v="cal"]'); await expect(page.locator(`${M} .lqcal`)).toBeVisible();
  await page.click('#lqv [data-v="ban"]'); await expect(page.locator(`${M} .lqcols`)).toBeVisible();
  await page.click('#lqv [data-v="map"]'); await expect(page.locator(`${M} #lqplan`)).toBeVisible();
  // el plano muestra solo las inspecciones pendientes del día elegido arriba
  await expect(page.locator('#wnum')).toHaveText('Jueves 01 oct');
  await expect(page.locator('#lqside')).toContainText('Entubado empotrado');
  await expect(page.locator('#lqside')).not.toContainText('Redes empotradas');
  await page.click('#wnext');
  await expect(page.locator('#lqside')).toContainText('Redes empotradas');
  await page.click('[data-lqza]'); await expect(page.locator(`${M} .lqdraw`)).toBeVisible();
  await page.click('[data-lqzcancel]'); await expect(page.locator(`${M} .lqdraw`)).toHaveCount(0);
  await page.selectOption('#fpiso', 'p2'); await expect(page.locator(`${M} #lqplan`)).toBeVisible();
  await page.selectOption('#fpiso', '');
  await page.click('#lqv [data-v="mat"]'); await expect(page.locator(`${M} .lqmt`)).toBeVisible();
  await page.click('#lqv [data-v="ban"]');
  await page.selectOption('#lqin', 'Ing. Dos'); await expect(page.locator(`${M} .lqcard`)).toHaveCount(2);
  await page.locator('[data-lqin]').first().click();
  await page.selectOption('#lqsc', 'c2'); await page.selectOption('#lqsc', '');
  await page.fill('#lqq', 'tarrajeo'); await page.fill('#lqq', '');
  await expectTabOk(page, 'lib');
  noErrors(errors, 'liberaciones vistas');
});

test('flujo completo de una liberación', async ({ page }) => {
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Detalle de prueba' : undefined));
  const errors = await abrir(page);
  await page.click('[data-lqid="Lsol"]');
  await expect(page.locator('#lqm')).toBeVisible();
  await page.click('#lqm [data-lq="prog"]');
  await page.selectOption('#lqpi', 'Ing. Dos');
  await page.fill('#lqpd', MANANA);
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('pro');
  expect((await lib(page, 'Lsol')).prog.insp).toBe('Ing. Dos');
  await page.click('#lqm [data-lq="obs"]');
  await page.fill('#lqo', 'Falta fijación\nFuga');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).obs?.length).toBe(2);
  await page.locator('#lqm [data-lqo="0"]').check();
  await page.click('#lqm [data-lq="lev"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('lev');
  await page.click('#lqm [data-lq="lib"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('lib');
  await page.click('#lqm [data-lq="reab"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('pro');
  await page.click('#lqm [data-lq="libm"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('libm');
  await page.click('#lqm [data-lqx]');
  await expect(page.locator('#lqm')).toHaveCount(0);
  await expectTabOk(page, 'lib');
  noErrors(errors, 'flujo');
});

test('solicitud nueva y anular', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await abrir(page);
  const antes = await page.evaluate(() => Object.keys(window.__dbAll('lib')).length);
  await page.click('#lqnew');
  await page.click('#pop [data-do="go"]');
  await expect(page.locator('#lqm')).toContainText('Solicitar liberación');
  await page.click('#lqm [data-lq="send"]');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('lib')).length)).toBe(antes + 1);
  await page.click('[data-lqid="Lsol"]');
  await page.click('#lqm [data-lq="anu"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('anu');
  noErrors(errors, 'solicitud');
});

test('matriz amarrada al lookahead e inspectores', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await abrir(page);
  await page.click('#lqv [data-v="mat"]');
  const k = '[data-k="c2|entubado empotrado"]';
  await page.locator(`[data-lm="se"]${k}`).check();
  await page.locator(`[data-lm="crit"]${k}`).check();
  await page.selectOption(`[data-lm="rest"]${k}`, 'c3|tarrajeo de muros');
  await expect.poll(async () => {
    const r = ((await libm(page)).rules || []).find(r => r.keys[0] === 'c2|entubado empotrado');
    return r && r.crit && r.rest[0];
  }).toBe('c3|tarrajeo de muros');
  await page.locator('[data-lmex]').first().click();
  await page.locator('#lqm [data-exa]').first().uncheck();
  await expect.poll(async () => Object.values((await libm(page)).ex || {})).toContain('no');
  await page.click('#lqm [data-lqx]');
  await page.locator('#lmauto').check();
  await expect.poll(async () => (await libm(page)).autoRestr).toBe(true);
  await page.locator('#lmauto').uncheck();
  // Inspectores en Configuración
  await openTab(page, 'cfg');
  await page.fill('#cfgInsp', 'Ing. Uno\nIng. Tres');
  await page.locator('#cfgInsp').blur();
  await expect.poll(async () => ((await libm(page)).insp || []).join()).toBe('Ing. Uno,Ing. Tres');
  expect(((await libm(page)).rules || []).length).toBeGreaterThanOrEqual(2);
  await openTab(page, 'lib');
  for (const v of ['ban', 'cal', 'map', 'mat', 'ban']) { await page.click(`#lqv [data-v="${v}"]`); await expectTabOk(page, 'lib ' + v); }
  noErrors(errors, 'matriz');
});

test('Calidad ve la matriz y el subcontratista solo solicita', async ({ page, browser }) => {
  const errors = await abrir(page, 'calidad');
  await page.click('#lqv [data-v="mat"]');
  await expect(page.locator('#lmauto')).toBeEnabled();
  noErrors(errors, 'calidad');
  const p2 = await browser.newPage();
  const e2 = await abrir(p2, 'sc');
  await expect(p2.locator('#lqnew')).toBeVisible();
  await expect(p2.locator('#lqsc')).toHaveCount(0);
  noErrors(e2, 'sc');
  await p2.close();
});

test('el plano carga al entrar por primera vez, sin tocar un piso', async ({ page }) => {
  const errors = await openApp(page, { tab: 'lib' });
  await page.click('#lqv [data-v="map"]');
  await expect(page.locator('#lqplan')).not.toBeEmpty();
  await expect(page.locator('#lqplan')).not.toContainText('Cargando');
  noErrors(errors, 'plano lib');
});
