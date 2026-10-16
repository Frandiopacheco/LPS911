// Lookahead por metrado (oct 2026): editor dentro de la celda, días sin cantidad (barra hueca + «⇢» en Saldo)
// y subcontratista nuevo desde la lista de la fila (sin usuario ni correo).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

/* metrado 30, tres días marcados por días (sin cantidades) y uno con cantidad */
const ACT = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 30, days: ['2026-10-01', '2026-10-02', '2026-10-03'], qty: { '2026-10-01': 6 }, order: 40 };
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
async function metrado(page) { await page.evaluate(() => { U.qmode = 'metrado'; gridRows = null; render(); }); }

test('metrado: días sin cantidad se ven huecos y ⇢ reparte el saldo solo en ellos', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'm1', ACT]] });
  await metrado(page);
  await expect(cell(page, 'm1', '2026-10-02')).toHaveClass(/qz/);
  await expect(cell(page, 'm1', '2026-10-01')).not.toHaveClass(/qz/);
  const rep = page.locator('#grid tr[data-a="m1"] td.cS .qrep');
  await expect(rep).toContainText('24');
  await rep.click();
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'm1').qty)).toEqual({ '2026-10-01': 6, '2026-10-02': 12, '2026-10-03': 12 });
  await expect(page.locator('#grid tr[data-a="m1"] td.cS .qrep')).toHaveCount(0);
  noErrors(errors, 'repartir días sin cantidad');
});

test('metrado: la cantidad se escribe dentro de la celda y el saldo se ve en vivo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'm1', ACT]] });
  await metrado(page);
  const c = cell(page, 'm1', '2026-10-02');
  const b = await c.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  const inp = c.locator('input.qin');
  await expect(inp).toBeFocused();
  await expect(page.locator('body > .qed')).toHaveCount(0);
  await inp.fill('10');
  await expect(page.locator('#grid tr[data-a="m1"] td.cS')).toHaveText('14');
  await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'm1').qty['2026-10-02'])).toBe(10);
  noErrors(errors, 'editor en la celda');
});

test('subcontratista nuevo desde la fila: se crea en la lista y queda asignado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'm1', { ...ACT, qty: {}, days: [] }]] });
  page.on('dialog', d => d.accept('Vidrios Andinos'));
  const sel = page.locator('#grid select[data-a="m1"][data-f="sc"]');
  await sel.focus();
  await expect(sel.locator('option[value="__new"]')).toHaveCount(1);
  await sel.selectOption('__new');
  await expect.poll(() => page.evaluate(() => { const a = __dbGet('acts', 'm1'); const c = __dbGet('contractors', a.sc); return c && c.name; })).toBe('VIDRIOS ANDINOS');
  noErrors(errors, 'nuevo subcontratista');
});

/* ▦ Plano: visor de planos acoplado a la derecha del lookahead, sigue al piso */
const LAM = (id, piso, disc, tipo, cod) => ['plb', id, { cod, disc, tipo, pisoId: piso, tit: 'PLANTA ' + cod, rev: 1, base: 'planos/' + id + '/r1', W: 2048, H: 1536, Z: 2, T: 1024, mm: [1200, 900] }];
test('plano del piso al lado del lookahead: se acopla, sigue al piso y se agranda', async ({ page }) => {
  await page.addInitScript(() => { window.plGet = async () => { throw new Error('sin archivo en la prueba'); }; });
  await openApp(page, { tab: 'look', extra: [LAM('IS_IS01', 'p1', 'IS', 'Planta', 'IS01'), LAM('ARQ_A01', 'p1', 'ARQ', 'Planta', 'A01'), LAM('ARQ_A02', 'p2', 'ARQ', 'Planta', 'A02')] });
  await page.evaluate(() => { U.piso = 'p1'; render(); });
  await page.click('#fplano');
  await expect(page.locator('.plv.dock')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/lkdock/);
  expect(await page.evaluate(() => PLV.id)).toBe('ARQ_A01'); // planta de arquitectura primero
  await expect(page.locator('#grid')).toBeVisible(); // el lookahead sigue a la izquierda
  await page.evaluate(() => { U.piso = 'p2'; render(); });
  await expect.poll(() => page.evaluate(() => PLV && PLV.id)).toBe('ARQ_A02');
  await page.click('.plv [data-pv="dock"]');
  await expect(page.locator('.plv')).not.toHaveClass(/dock/);
  await expect(page.locator('body')).not.toHaveClass(/lkdock/);
  await page.click('.plv [data-pv="dock"]');
  await expect(page.locator('.plv.dock')).toBeVisible();
  await page.click('#fplano');
  await expect(page.locator('.plv')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/lkdock/);
});
