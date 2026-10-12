// Módulo Tareo (fase 0, docs/ia/tareo.md): selector de módulo, roles de solo tareo y quién ve el Tareo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const LPS_TOP = ['#fpiso', '#bundo', '#bredo', '#bexport', '#wprev', '#wnext', '#wtoday'];
const tabsVisibles = page => page.$$eval('#tabs button[data-tab]', bs => bs.filter(b => !b.hidden).map(b => b.dataset.tab));

test('admin: ve el selector y cambia de módulo (pestañas y barra cambian)', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  await expect(page.locator('#modsel')).toBeVisible();
  expect(await tabsVisibles(page)).toContain('look');
  await page.click('#modsel [data-mod="tar"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  expect(await tabsVisibles(page)).toEqual(['tdia', 'tpub', 'tcos', 'tper', 'tpc', 'tcfg']);
  for (const s of LPS_TOP) await expect(page.locator(s), s).toBeHidden();
  await expect(page.locator('#pname')).toHaveText('Tareo de personal obrero');
  await page.click('#tabs [data-tab="tper"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tper');
  // se recuerda el módulo al recargar
  await page.reload();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  expect(await page.evaluate(() => U.mod)).toBe('tar');
  await page.click('#modsel [data-mod="lps"]');
  await expect(page.locator('#main')).not.toHaveAttribute('data-view', /^t(dia|per|pc|cfg)$/);
  expect(await tabsVisibles(page)).toContain('look');
  expect(await tabsVisibles(page)).not.toContain('tdia');
  await expect(page.locator('#fpiso')).toBeVisible();
  noErrors(errors, 'admin');
});

test('el enlace #tper abre el Tareo', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'tper', editar: false });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tper');
  expect(await page.evaluate(() => U.mod)).toBe('tar');
  noErrors(errors, '#tper');
});

for (const as of ['tcap', 'tasis', 'tcos']) {
  test(`${as}: entra directo al Tareo, sin selector ni Last Planner`, async ({ page }) => {
    const errors = await openApp(page, { as, editar: false });
    /* costos entra a «Costos» (F3: ya no ve Tareos del día) */
    const home = as === 'tcos' ? 'tcos' : 'tdia';
    await expect(page.locator('#main')).toHaveAttribute('data-view', home);
    await expect(page.locator('#modsel')).toBeHidden();
    expect(await tabsVisibles(page)).toEqual([home, 'tper', 'tpc']);
    for (const s of LPS_TOP) await expect(page.locator(s), s).toBeHidden();
    const st = await page.evaluate(() => ({ mod: U.mod, act: S.act.size, lps: S.loaded.act, only: TAR_ONLY(), ed: tarEdit(), ok: tabAllowed('look') }));
    expect(st).toEqual({ mod: 'tar', act: 0, lps: undefined, only: true, ed: as === 'tasis', ok: false });
    // un enlace a una pestaña de Last Planner no lo saca del Tareo
    await page.evaluate(() => { U.tab = 'look'; render(); });
    await expect(page.locator('#main')).toHaveAttribute('data-view', home);
    noErrors(errors, as);
  });
}

test('tcap en el celular: barra inferior del Tareo, sin selector de módulo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page, { as: 'tcap', editar: false });
  const items = await page.$$eval('#bnav [data-bt]', bs => bs.map(b => b.dataset.bt));
  expect(items).toEqual(['tdia', 'tper', 'tpc', 'more']);
  await page.click('#bnav [data-bt="more"]');
  await expect(page.locator('#msheet [data-mod]')).toHaveCount(0);
  noErrors(errors, 'tcap celular');
});

test('admin en el celular: cambia de módulo desde «Más»', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.click('#bnav [data-bt="more"]');
  const b = page.locator('#msheet [data-mod="tar"]');
  await expect(b).toBeVisible();
  expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(40);
  await b.click();
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  expect(await page.$$eval('#bnav [data-bt]', bs => bs.map(x => x.dataset.bt))).toEqual(['tdia', 'tpub', 'tcos', 'tper', 'more']);
  noErrors(errors, 'admin celular');
});

for (const as of ['lector', 'sc', 'capataz', 'editor']) {
  test(`${as}: no ve el selector ni el Tareo`, async ({ page }) => {
    const errors = await openApp(page, { as, editar: false });
    /* el selector aparece por el módulo Planos (docs/ia/planos.md), menos para el capataz; nunca con el Tareo */
    if (as === 'capataz') await expect(page.locator('#modsel')).toBeHidden();
    else { await expect(page.locator('#modsel')).toBeVisible(); await expect(page.locator('#modsel [data-mod="tar"]')).toHaveCount(0); }
    expect(await page.evaluate(() => ({ t: canTar(), mod: U.mod }))).toEqual({ t: false, mod: 'lps' });
    expect(await tabsVisibles(page)).not.toContain('tdia');
    await page.evaluate(() => { U.tab = 'tper'; render(); });
    await expect(page.locator('#main')).not.toHaveAttribute('data-view', 'tper');
    noErrors(errors, as);
  });
}

test('editor con «Publica tareo» ve el selector y el Tareo (sin Configuración del tareo)', async ({ page }) => {
  const errors = await openApp(page, { as: 'jefe', editar: false });
  await expect(page.locator('#modsel')).toBeVisible();
  await page.click('#modsel [data-mod="tar"]');
  expect(await tabsVisibles(page)).toEqual(['tdia', 'tpub', 'tcos', 'tper', 'tpc']);
  noErrors(errors, 'jefe');
});

test('Equipo: el admin asigna los roles del tareo y marca «Publica tareo»', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'team', editar: false });
  await expect(page.locator('#trole option[value="tasis"]')).toHaveCount(1);
  await page.fill('#temail', 'nuevo@obra.pe');
  await page.fill('#tname', 'Nuevo Tareo');
  await page.selectOption('#trole', 'tcap');
  await page.click('#tadd button[type="submit"]');
  await expect.poll(() => page.evaluate(() => (window.__dbGet('members', 'nuevo@obra.pe') || {}).role)).toBe('tcap');
  await page.click('[data-tgrp="editor"]');
  await page.click('button[data-tedit="editor@obra.pe"]');
  const cb = page.locator('#lqm input[data-mem="editor@obra.pe"][data-f="tpub"]');
  await cb.check();
  await expect.poll(() => page.evaluate(() => window.__dbGet('members', 'editor@obra.pe').tpub)).toBe(true);
  noErrors(errors, 'equipo');
});

test('Ver como: ofrece los roles del tareo y la marca «Publica tareo»', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', va: { role: 'tasis' }, editar: false });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  expect(await page.evaluate(() => ({ r: me.role, only: TAR_ONLY(), ed: tarEdit() }))).toEqual({ r: 'tasis', only: true, ed: true });
  await expect(page.locator('#modsel')).toBeHidden();
  noErrors(errors, 'ver como tasis');
});

test('Ver como editor con «Publica tareo»', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', va: { role: 'editor', tpub: true }, editar: false });
  await expect(page.locator('#modsel')).toBeVisible();
  await page.click('#bvat');
  await expect(page.locator('#var option[value="tcap"]')).toHaveCount(1);
  await expect(page.locator('#vatpub')).toBeChecked();
  noErrors(errors, 'ver como jefe');
});
