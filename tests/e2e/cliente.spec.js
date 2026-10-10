// Versión para el cliente (pestaña «Cliente», solo administradores): capa sobre el lookahead interno.
// Holguras, cambios por fila (fijada), ocultar, filas solo del cliente, volver a seguir al interno, emisión con su semana,
// PPC del cliente y que nada de esto toque el lookahead interno.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';

const buf = page => page.evaluate(() => window.__dbGet('cli', 'buf') || {});
const clia = (page, id) => page.evaluate(id => window.__dbGet('clia', id) || null, id);
const dbAct = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const cliDias = (page, id) => page.evaluate(id => (cliActs().get(id) || {}).days, id);
const mas = (page, ds, n) => page.evaluate(([ds, n]) => [...new Set(ds.map(d => wshift(d, n)))].sort(), [ds, n]);
const abrirCliente = async page => {
  await page.click('#tabs button[data-tab="cli"]');
  await expect(page.locator('#cliban')).toContainText('Versión cliente');
  await expect(page.locator('#tabs button[data-tab="cli"]')).toHaveAttribute('aria-selected', 'true');
};

test('pestaña Cliente: holgura, cambios por fila, ocultar, filas propias; el interno no cambia', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const e0 = await dbAct(page, 'e0'), t0 = await dbAct(page, 't0'), i1 = await dbAct(page, 'i1');
  const nActs = await page.evaluate(() => Object.keys(window.__dbAll('acts')).length);
  await abrirCliente(page);
  // holgura general +2: las fechas del cliente se corren, con la marca gris de la fecha interna
  await page.click('#cliban [data-cb="all"]');
  await page.fill('#bfn', '2');
  await page.click('#pop [data-do="ok"]');
  await expect.poll(async () => (await buf(page)).all).toBe(2);
  await expect.poll(() => cliDias(page, 'e0')).toEqual(await mas(page, e0.days, 2));
  await expect(page.locator('tr[data-a="e0"] td.d.cin').first()).toBeVisible();
  // cambiar el nombre solo para el cliente
  const nm = page.locator('tr[data-a="e0"] .ci[data-f="name"]');
  await nm.fill('Entubado empotrado y cajas');
  await nm.press('Enter');
  await expect.poll(async () => (await clia(page, 'e0'))?.f?.name).toBe('Entubado empotrado y cajas');
  await expect(page.locator('tr[data-a="e0"] .cliov')).toBeVisible();
  // pintar un día: la fila queda fijada (días propios)
  await page.locator('tr[data-a="t0"] td.d:not(.on)').first().click();
  await expect.poll(async () => !!(await clia(page, 't0'))?.f?.days).toBe(true);
  await expect(page.locator('tr[data-a="t0"] .cliov.fx')).toBeVisible();
  // ocultar al cliente (y deshacer)
  await page.click('[data-actmenu="i1"]');
  await page.click('#pop [data-do="del"]');
  await expect.poll(async () => (await clia(page, 'i1'))?.hide).toBe(true);
  await expect(page.locator('tr[data-a="i1"]')).toHaveCount(0);
  await expect(page.locator('#cliban [data-cb="hid"]')).toContainText('1 oculta');
  await page.click('#bundo');
  await expect.poll(async () => (await clia(page, 'i1'))?.hide || false).toBe(false);
  await expect(page.locator('tr[data-a="i1"]')).toHaveCount(1);
  await page.click('[data-actmenu="i1"]');
  await page.click('#pop [data-do="del"]');
  await expect.poll(async () => (await clia(page, 'i1'))?.hide).toBe(true);
  // fila solo del cliente
  await page.click('[data-ambmenu="a1"]');
  await page.click('#pop [data-do="act"]');
  const own = await page.evaluate(() => [...CLIA.entries()].find(([, o]) => o.own)?.[0]);
  expect(own).toBeTruthy();
  await expect.poll(async () => (await clia(page, own))?.own).toBe(true);
  // volver a seguir al interno
  await page.click('[data-actmenu="t0"]');
  await page.click('#pop [data-do="fol"]');
  await expect.poll(() => clia(page, 't0')).toBe(null);
  // nada de esto tocó el lookahead interno
  expect(await dbAct(page, 'e0')).toEqual(e0);
  expect(await dbAct(page, 't0')).toEqual(t0);
  expect(await dbAct(page, 'i1')).toEqual(i1);
  expect(await page.evaluate(() => Object.keys(window.__dbAll('acts')).length)).toBe(nActs);
  expect(await page.evaluate(() => Object.keys(window.__dbAll('lhlog') || {}).length)).toBe(0);
  // en el Lookahead se ve el interno, sin marcas ni banda del cliente
  await openTab(page, 'look');
  await expect(page.locator('#cliban .cliban')).toHaveCount(0);
  await expect(page.locator('tr[data-a="e0"] .ci[data-f="name"]')).toHaveValue(e0.name);
  await expect(page.locator('tr[data-a="i1"]')).toHaveCount(1);
  await expect(page.locator('.cliov')).toHaveCount(0);
  expect(await page.evaluate(() => !!S.act._cli)).toBe(false);
  noErrors(errors, 'pestaña cliente');
});

test('emitir: vale para la semana siguiente, sin las ocultas y con las filas propias marcadas; PPC del cliente', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'look' });
  await abrirCliente(page);
  await page.click('[data-actmenu="i1"]');
  await page.click('#pop [data-do="del"]');
  await page.click('[data-ambmenu="a1"]');
  await page.click('#pop [data-do="act"]');
  const own = await page.evaluate(() => [...CLIA.entries()].find(([, o]) => o.own)?.[0]);
  const n = await page.evaluate(() => weekOf(todayIso()) + 1);
  await expect(page.locator('#cliban .clist')).toContainText(`Semana ${n}: aún no emitida`);
  await page.click('#cliban [data-cb="emit"]');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('clidx')).length)).toBe(1);
  const v = await page.evaluate(() => Object.values(window.__dbAll('clidx'))[0]);
  expect(v.forW).toBe(n);
  const acts = await page.evaluate(() => Object.values(window.__dbAll('cliver')).reduce((m, d) => ({ ...m, ...JSON.parse(d.json).acts }), {}));
  expect(acts.i1).toBeUndefined();
  expect(acts[own].own).toBe(true);
  expect(acts.e0).toBeTruthy();
  await expect(page.locator('#cliban .clist')).toContainText(`Semana ${n}: emitida`);
  // PPC del cliente: la semana de la versión; las filas propias no entran
  await page.evaluate(n => { U.week = n; }, n);
  await openTab(page, 'ind');
  await page.click('#imode [data-m="sem"]');
  const card = page.locator('.card', { hasText: 'PPC del cliente' });
  await expect(card).toBeVisible();
  const items = await page.evaluate(n => { const r = cliPpc(new Set(visPisos().map(p => p.id))); const w = r.W.find(o => o.w === n); return w ? w.items.map(i => i.x.id) : null; }, n);
  if (items) { expect(items).not.toContain(own); expect(items).not.toContain('i1'); }
  noErrors(errors, 'emitir');
});

test('la emisión después del sábado 23:00 vale para la semana subsiguiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const r = await page.evaluate(() => { const n = weekOf(todayIso()) + 1; return { n, antes: cliTarget(cliCut(n) - 60e3), despues: cliTarget(cliCut(n) + 60e3) }; });
  expect(r.antes).toBe(r.n);
  expect(r.despues).toBe(r.n + 1);
  noErrors(errors, 'corte');
});

for (const as of ['editor', 'sc', 'campo', 'lector']) {
  test(`${as} no ve la pestaña Cliente ni su PPC`, async ({ page }) => {
    const errors = await openApp(page, { as, tab: 'look', extra: as === 'editor' ? [['members', 'editor@obra.pe', { role: 'editor', name: 'Ed', cli: true }]] : [] });
    await expect(page.locator('#grid')).toBeVisible();
    await expect(page.locator('#tabs button[data-tab="cli"]')).toBeHidden();
    expect(await page.evaluate(() => canCli())).toBe(false);
    noErrors(errors, as);
  });
}

test('cambios de otros en el interno llegan a la pestaña Cliente sin mezclar la capa con el interno', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['cli', 'buf', { all: 2 }]] });
  const e0 = await dbAct(page, 'e0');
  await abrirCliente(page);
  await page.waitForFunction(() => CLIB && CLIB.all === 2);
  await expect.poll(() => cliDias(page, 'e0')).toEqual(await mas(page, e0.days, 2));
  // otro ingeniero cambia el interno mientras el administrador está en Cliente
  await page.evaluate(() => fcol('acts').doc('t1').update({ name: 'Tarrajeo frotachado' }));
  await expect(page.locator('tr[data-a="t1"] .ci[data-f="name"]')).toHaveValue('Tarrajeo frotachado');
  expect(await page.evaluate(() => ({ cli: !!S.act._cli, base: !!actInt()._cli, d: actInt().get('e0').days }))).toEqual({ cli: true, base: false, d: e0.days });
  await openTab(page, 'look');
  expect(await page.evaluate(() => ({ cli: !!S.act._cli, d: S.act.get('e0').days, n: S.act.get('t1').name }))).toEqual({ cli: false, d: e0.days, n: 'Tarrajeo frotachado' });
  noErrors(errors, 'datos que llegan');
});
