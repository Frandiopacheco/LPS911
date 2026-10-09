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
  // solicitada: aún no se libera ni se observa (primero se programa)
  await expect(page.locator('#lqm [data-lq="lib"]')).toHaveCount(0);
  await expect(page.locator('#lqm [data-lq="obs"]')).toHaveCount(0);
  await page.click('#lqm [data-lq="prog"]');
  await page.click('#lqm [data-lqpi="Ing. Dos"]');
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
  // la reinspección vuelve a programarse antes de liberar
  await expect(page.locator('#lqm [data-lq="lib"]')).toHaveCount(0);
  await page.click('#lqm [data-lq="prog"]');
  await page.click('#lqm [data-lqpi="Ing. Uno"]');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('pro');
  await page.click('#lqm [data-lq="lib"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('lib');
  await page.click('#lqm [data-lq="reab"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('pro');
  await page.click('#lqm [data-lq="libm"]');
  await page.fill('#lqom', 'Rotular válvulas');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('libm');
  expect((await lib(page, 'Lsol')).obs.at(-1)).toMatchObject({ t: 'Rotular válvulas', menor: true });
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
  await page.locator('#lqfr [data-lqf]').first().click();
  await page.click('#lqfgo');
  await expect(page.locator('#lqm [data-lq="send"]')).toBeVisible();
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
  // sugerencias: solo sus actividades (Sanitarias) y al final «Otra…»
  const opts = await page.locator('#lqfr [data-lqf]').evaluateAll(o => o.map(x => x.dataset.lqf));
  expect(opts.length).toBeGreaterThan(0);
  expect(await page.evaluate(ids => ids.every(v => S.act.get(v).sc === 'c1'), opts)).toBe(true);
  await expect(page.locator('#lqfr .lqfi').last()).toHaveAttribute('data-lqfree', '');
  // escribe algo que no está: se ofrece pedir lo escrito
  await page.fill('#lqfq', 'Prueba hidráulica de montantes');
  await expect(page.locator('#lqfr [data-lqf]')).toHaveCount(0);
  await page.click('#lqfr [data-lqfree]');
  await expect(page.locator('#lqm')).toContainText('¿Qué se libera?');
  await expect(page.locator('#lqt')).toHaveValue('Prueba hidráulica de montantes');
  await page.fill('#lqt', '');
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
  await page.click('#lqm [data-lqpi="Ing. Uno"]');
  await page.fill('#lqpd', MANANA);
  // los interruptores se tocan en su rótulo
  const tg = id => page.click(`#lqm label.lqtg:has(#${id})`);
  await tg('lqcr'); // la marca venía de la solicitud: se apaga
  await expect(page.locator('#lqrs')).toHaveCount(0);
  await tg('lqcr');
  // sugiere la partida siguiente del ambiente
  await expect(page.locator('#lqrs')).toHaveValue(/Tarrajeo de muros|Entubado empotrado/);
  await page.fill('#lqrs', 'Tarrajeo de muros');
  await tg('lqsu'); await tg('lqsu'); // apaga y vuelve a prender
  await expect(page.locator('#lqsu')).toBeChecked();
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => { const l = await lib(page, 'Lsol'); return [l.st, l.crit, l.sup, l.rest].join('|'); }).toBe('pro|true|true|Tarrajeo de muros');
  await expect(page.locator('#lqm')).toContainText('CRÍTICA · restringe Tarrajeo de muros');
  await page.click('#lqm [data-lqx]');
  await expect(page.locator(`${M} [data-lqid="Lsol"]`)).toContainText('⛔ Restringe: Tarrajeo de muros');
  // Inspectores en Configuración (siguen en libm/main, sin tocar lo antiguo)
  await openTab(page, 'cfg');
  await page.click('[data-cfgv="cld"]');
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

// arrastrar una tarjeta: dataTransfer simulado (Playwright dragTo usa el arrastre nativo de Chromium)
async function arrastrar(page, from, toCol) {
  await page.locator(from).dragTo(page.locator(`${M} [data-lqdrop="${toCol}"]`));
}

test('bandeja: arrastrar solicitada → programada, programada → liberada u observada; lo demás no se mueve', async ({ page }) => {
  const errors = await abrir(page, 'calidad');
  // una solicitada no se puede soltar en Liberadas
  await arrastrar(page, `${M} .lqcard[data-lqid="Lsol"]`, 'lib');
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect((await lib(page, 'Lsol')).st).toBe('sol');
  // solicitada → Programadas abre la hoja de programar
  await arrastrar(page, `${M} .lqcard[data-lqid="Lsol"]`, 'pro');
  await expect(page.locator('#lqm')).toContainText('Programar inspección');
  await page.click('#lqm [data-lqpi="Ing. Dos"]');
  await page.click('#lqm [data-lqphh="10:00"]');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => { const l = await lib(page, 'Lsol'); return l.st + '|' + l.prog.h + '|' + l.prog.insp; }).toBe('pro|10:00|Ing. Dos');
  // deshacer desde el aviso
  await page.click('#toast button');
  await expect.poll(async () => (await lib(page, 'Lsol')).st).toBe('sol');
  expect((await lib(page, 'Lsol')).prog).toBeNull();
  // programada → Liberadas
  await arrastrar(page, `${M} .lqcard[data-lqid="Lpro"]`, 'lib');
  await expect(page.locator('#lqm')).toContainText('Liberar');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lpro')).st).toBe('lib');
  // una observada no se arrastra
  await expect(page.locator(`${M} .lqcard[data-lqid="Lobs"]`)).not.toHaveAttribute('draggable', 'true');
  // programada → Observadas
  await page.evaluate(() => libSave('Lpro', { st: 'pro', done: null }));
  await arrastrar(page, `${M} .lqcard[data-lqid="Lpro"]`, 'obs');
  await page.fill('#lqo', 'Falta prueba de presión');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => (await lib(page, 'Lpro')).st).toBe('obs');
  noErrors(errors, 'arrastrar');
});

test('bandeja: elegir varias solicitadas y programarlas juntas, una tras otra', async ({ page }) => {
  const S2 = ['lib', 'Lsol2', { actId: 'e0', ambId: 'a1', pisoId: 'p1', sc: 'c2', nm: 'Entubado empotrado', need: MANANA, slot: 'am', st: 'sol', crit: false, sup: false, rest: '', obs: [], hist: [], photos: [], proto: [], ts: 2, by: 'x' }];
  const errors = await openApp(page, { as: 'calidad', tab: 'lib', extra: [S2] });
  const todos = page.locator('[data-lqall]'); if (await todos.count()) await todos.click();
  await page.click(`${M} [data-lqck="Lsol"]`);
  await page.click(`${M} .lqcard[data-lqid="Lsol2"]`, { modifiers: ['Control'] });
  await expect(page.locator(`${M} .lqselb`)).toContainText('2 elegidas');
  // arrastrar una elegida lleva todas las elegidas
  await arrastrar(page, `${M} .lqcard[data-lqid="Lsol"]`, 'pro');
  await expect(page.locator('#lqm')).toContainText('Programar 2 inspecciones');
  await page.click('#lqm [data-lqpi="Ing. Uno"]');
  await page.click('#lqm [data-lqphh="08:00"]');
  await page.click('#lqm [data-lqst="30"]');
  await page.click('#lqm [data-lq="ok"]');
  await expect.poll(async () => [(await lib(page, 'Lsol')).prog?.h, (await lib(page, 'Lsol2')).prog?.h].sort().join()).toBe('08:00,08:30');
  expect((await lib(page, 'Lsol2')).prog.insp).toBe('Ing. Uno');
  await expect(page.locator(`${M} .lqselb`)).toHaveCount(0);
  // las programadas se agrupan por día
  await expect(page.locator(`${M} [data-lqdrop="pro"] .lqgh`).first()).toBeVisible();
  noErrors(errors, 'varias');
});

test('buscador: filtra por varias palabras, marca las ya solicitadas y pide varias a la vez', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await abrir(page);
  await page.click('#lqnew');
  await expect(page.locator('#lqfq')).toBeFocused();
  // «Entubado empotrado» de a1 (e0) ya tiene solicitud abierta (Lbad): sale atenuada y abre su detalle
  await page.fill('#lqfq', 'entub');
  await expect(page.locator('#lqfr [data-lqopen]')).toHaveCount(3);
  await page.fill('#lqfq', 'tarraj');
  const n = await page.locator('#lqfr [data-lqf]').count();
  expect(n).toBeGreaterThanOrEqual(2);
  // teclado: ↓ Enter elige
  await page.press('#lqfq', 'ArrowDown'); await page.press('#lqfq', 'Enter');
  await page.locator('#lqfr [data-lqf]').nth(1).click();
  await expect(page.locator('#lqfn')).toHaveText('2 elegidas');
  const antes = await page.evaluate(() => Object.keys(window.__dbAll('lib')).length);
  await page.click('#lqfgo');
  await expect(page.locator('#lqm')).toContainText('2 actividades');
  await page.click('#lqm [data-lqnd]');
  await page.click('#lqm [data-lq="send"]');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('lib')).length)).toBe(antes + 2);
  noErrors(errors, 'buscador');
});

test('programar inspección: elegir un chip no vuelve a armar la ventana (no parpadea)', async ({ page }) => {
  const errors = await abrir(page);
  await page.click('[data-lqid="Lsol"]');
  await page.click('#lqm [data-lq="prog"]');
  await page.evaluate(() => { document.querySelector('#lqm .lqc').__marca = 1; });
  await page.click('#lqm [data-lqpi="Ing. Dos"]');
  await expect(page.locator('#lqm [data-lqpi="Ing. Dos"]')).toHaveClass(/on/);
  expect(await page.evaluate(() => document.querySelector('#lqm .lqc').__marca)).toBe(1);
  noErrors(errors, 'sin parpadeo');
});

test('el SC solicitante ubica su liberación en el plano (opcional) sin perder lo llenado', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'lib', extra: [['acts', 'z9', { ambId: 'a1', sc: 'c1', name: 'Prueba hidráulica', und: 'pto', metrado: 1, days: [MANANA], order: 99 }]] });
  await page.evaluate(() => libAsk('z9'));
  await expect(page.locator('#lqm [data-lqzona]')).toBeVisible();
  await page.fill('#lqn', 'Lista desde las 8');
  await page.click('#lqm [data-lqzona]');
  await expect(page.locator('#lqm')).toHaveCount(0);
  await expect(page.locator('#main .lqdraw')).toBeVisible();
  // cancelar vuelve a la solicitud con el comentario
  await page.click('[data-lqzcancel]');
  await expect(page.locator('#lqn')).toHaveValue('Lista desde las 8');
  // si marcó la zona, la solicitud la lleva
  await page.evaluate(() => { const F = { need: wshift(todayIso(), 1), slot: 'pm', note: 'Con zona', proto: [] }; libAsk('z9', { F, zona: { pts: [1, 1, 5, 1, 5, 5, 1, 5], vista: '', pisoId: pisoOfAct('z9') } }); });
  await expect(page.locator('#lqm .lqzrow')).toContainText('Zona marcada en el plano');
  await page.click('#lqm [data-lq="send"]');
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lib')).filter(l => l.actId === 'z9' && l.st === 'sol' && l.zona && l.note === 'Con zona').length)).toBe(1);
  noErrors(errors, 'zona del SC');
});
