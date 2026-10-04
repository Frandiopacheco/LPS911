// Liberaciones de calidad (sin matriz): vistas, filtros, flujo completo, solicitud desde el lookahead o fuera de él, marcas de Calidad e inspectores.
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
  // ya no hay vista Matriz ni columna «Por solicitar»
  await expect(page.locator('#lqv [data-v="mat"]')).toHaveCount(0);
  await expect(page.locator(M)).not.toContainText('Por solicitar');
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
  // la ventana se redibuja al llegar el dato guardado: si el clic cae justo en ese momento, se repite
  await expect(async () => {
    await page.click('#lqm [data-lqx]', { timeout: 1000 }).catch(() => {});
    await expect(page.locator('#lqm')).toHaveCount(0, { timeout: 1000 });
  }).toPass();
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

test('el lookahead solo sugiere: nada queda «por solicitar» y se puede pedir algo fuera del lookahead', async ({ page }) => {
  page.on('dialog', d => d.accept());
  // «Redes empotradas» de Sanitarias sin solicitud: antes la matriz la marcaba «pendiente de solicitar»
  const I9 = ['acts', 'i9', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: [MANANA], order: 12 }];
  const errors = await openApp(page, { as: 'sc', tab: 'lib', extra: [I9] });
  await expect(page.locator(`${M} .lqcols`)).toBeVisible();
  expect(await page.evaluate(() => libState(S.act.get('i9')))).toBe('');
  await expect(page.locator(`${M} [data-lqask="i9"]`)).toHaveCount(0);
  await page.click('#lqnew');
  // sugerencias: sus actividades próximas (Sanitarias) y al final «Otra…»
  const opts = await page.locator('#lqpk option').evaluateAll(o => o.map(x => x.value));
  expect(opts[opts.length - 1]).toBe('__free');
  expect(await page.evaluate(ids => ids.filter(v => v !== '__free').every(v => S.act.get(v).sc === 'c1'), opts)).toBe(true);
  await page.selectOption('#lqpk', '__free');
  await page.click('#pop [data-do="go"]');
  await expect(page.locator('#lqm')).toContainText('¿Qué se libera?');
  await page.click('#lqm [data-lq="send"]');
  await expect(page.locator('#toast')).toContainText('Escribe qué se libera');
  await page.fill('#lqt', 'Prueba hidráulica de montantes');
  await page.selectOption('#lqa', 'a2');
  const antes = await page.evaluate(() => Object.keys(window.__dbAll('lib')).length);
  await page.click('#lqm [data-lq="send"]');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('lib')).length)).toBe(antes + 1);
  const n = await page.evaluate(() => Object.values(window.__dbAll('lib')).find(l => l.nm === 'Prueba hidráulica de montantes'));
  expect(n).toMatchObject({ actId: '', ambId: 'a2', pisoId: 'p1', sc: 'c1', st: 'sol', crit: false, sup: false });
  await expect(page.locator(`${M} .lqcard`, { hasText: 'Prueba hidráulica de montantes' })).toContainText('FUERA DEL LOOKAHEAD');
  noErrors(errors, 'sin matriz');
});

test('Calidad marca crítica y supervisión al programar; inspectores en Configuración', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await abrir(page, 'calidad');
  await page.click('[data-lqid="Lsol"]');
  await page.click('#lqm [data-lq="prog"]');
  await page.selectOption('#lqpi', 'Ing. Uno');
  await page.fill('#lqpd', MANANA);
  await page.locator('#lqcr').check();
  await page.fill('#lqrs', 'Tarrajeo de muros');
  await page.locator('#lqsu').check();
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => { const l = await lib(page, 'Lsol'); return [l.st, l.crit, l.sup, l.rest].join('|'); }).toBe('pro|true|true|Tarrajeo de muros');
  await expect(page.locator('#lqm')).toContainText('CRÍTICA · restringe Tarrajeo de muros');
  await page.click('#lqm [data-lqx]');
  await expect(page.locator(`${M} [data-lqid="Lsol"]`)).toContainText('⛔ Restringe: Tarrajeo de muros');
  // Inspectores en Configuración (siguen en libm/main, sin tocar lo antiguo)
  await openTab(page, 'cfg');
  await page.fill('#cfgInsp', 'Ing. Uno\nIng. Tres');
  await page.locator('#cfgInsp').blur();
  await expect.poll(async () => ((await libm(page)).insp || []).join()).toBe('Ing. Uno,Ing. Tres');
  expect(((await libm(page)).rules || []).length).toBe(1); // las reglas antiguas quedan guardadas, sin usarse
  await openTab(page, 'lib');
  for (const v of ['ban', 'cal', 'map', 'ban']) { await page.click(`#lqv [data-v="${v}"]`); await expectTabOk(page, 'lib ' + v); }
  noErrors(errors, 'calidad marcas');
});

test('el subcontratista solicita; una vista «Matriz» guardada abre la Bandeja', async ({ page, browser }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'lib' });
  await page.evaluate(() => { U.libV = 'mat'; render(); });
  await expect(page.locator(`${M} .lqcols`)).toBeVisible();
  await expect(page.locator('#lqnew')).toBeVisible();
  await expect(page.locator('#lqsc')).toHaveCount(0);
  noErrors(errors, 'sc');
});

test('el plano carga al entrar por primera vez, sin tocar un piso', async ({ page }) => {
  const errors = await openApp(page, { tab: 'lib' });
  await page.click('#lqv [data-v="map"]');
  await expect(page.locator('#lqplan')).not.toBeEmpty();
  await expect(page.locator('#lqplan')).not.toContainText('Cargando');
  noErrors(errors, 'plano lib');
});
