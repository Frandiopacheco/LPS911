// Mejoras pedidas al usar la app: causa y mitigación editables, orden por arrastre con número, varios SC a la vez,
// vencidas ocultas y nombres de actividad homogéneos.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab, HOY } from './helpers.js';

const META = ['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', cnc: ['Materiales', 'Mano de obra'] }];
const SEMANA = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: 1, items: { e0: { sc: 'c2', code: 'A-1', amb: 'Dpto 101', act: 'Entubado empotrado', days: [HOY], ord: 1 }, i0: { sc: 'c1', code: 'A-1', amb: 'Dpto 101', act: 'Redes empotradas', days: [HOY], ord: 2 } },
  res: { e0: { ok: false, cnc: 'Materiales', note: '' }, i0: { ok: true } } }];
const res = page => page.evaluate(() => window.__dbGet('weeks', '58_p1').res);

test('Plan semanal: la mitigación se escribe junto a la causa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [META, SEMANA] });
  const tr = page.locator('section[data-pid="p1"] tr[data-id="e0"]');
  await expect(tr.locator('[data-cnc]')).toBeEnabled();
  await tr.locator('[data-mit]').fill('Pedir tubería con 1 semana de anticipación');
  await tr.locator('[data-mit]').press('Tab');
  await expect.poll(async () => (await res(page)).e0.mit).toBe('Pedir tubería con 1 semana de anticipación');
  await tr.locator('[data-cnc]').selectOption('Mano de obra');
  await expect.poll(async () => (await res(page)).e0.cnc).toBe('Mano de obra');
  expect((await res(page)).e0.mit).toBe('Pedir tubería con 1 semana de anticipación');
  noErrors(errors, 'plan semanal');
});

test('Indicadores › Semanal: los no cumplidos se corrigen ahí mismo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', extra: [META, SEMANA] });
  await page.evaluate(() => { U.indMode = 'sem'; render(); });
  const card = page.locator('#nccard');
  await expect(card).toContainText('Entubado empotrado');
  await expect(card).not.toContainText('Redes empotradas'); // solo los no cumplidos
  await card.locator('[data-ncf="cnc"]').selectOption('Mano de obra');
  await expect.poll(async () => (await res(page)).e0.cnc).toBe('Mano de obra');
  await card.locator('[data-ncf="mit"]').fill('Reforzar cuadrilla');
  await card.locator('[data-ncf="mit"]').press('Tab');
  await expect.poll(async () => (await res(page)).e0.mit).toBe('Reforzar cuadrilla');
  expect((await res(page)).e0.ok).toBe(false);
  noErrors(errors, 'indicadores');
});

test('Indicadores › Semanal: el lector solo consulta', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'ind', extra: [META, SEMANA] });
  await page.evaluate(() => { U.indMode = 'sem'; render(); });
  await expect(page.locator('#nccard')).toContainText('Materiales');
  await expect(page.locator('#nccard [data-ncf]')).toHaveCount(0);
  noErrors(errors, 'lector');
});

test('Lookahead: las actividades salen numeradas y se reordenan arrastrando el número', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const num = id => page.locator(`tr[data-a="${id}"] .anum`);
  await expect(num('i0')).toHaveText('1');
  await expect(num('t0')).toHaveText('3');
  const src = await num('t0').boundingBox();
  const dst = await page.locator('tr[data-a="i0"]').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + 4, dst.y + 6, { steps: 6 });
  await page.mouse.move(src.x + 4, dst.y + 3, { steps: 2 });
  await page.mouse.up();
  await expect(num('t0')).toHaveText('1');
  await expect(num('i0')).toHaveText('2');
  const ord = await page.evaluate(() => ['t0', 'i0', 'e0'].map(id => window.__dbGet('acts', id).order));
  expect(ord[0] < ord[1] && ord[1] < ord[2]).toBe(true);
  // otro ambiente no cambia
  await expect(num('i1')).toHaveText('1');
  await page.keyboard.press('Control+z');
  await expect(num('t0')).toHaveText('3');
  noErrors(errors, 'reordenar');
});

test('Lookahead: Ctrl+clic en la leyenda filtra varios subcontratistas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { U.legOff = false; render(); });
  const leg = page.locator('#legend');
  await leg.locator('.chip[data-id="c1"]').click();
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(0);
  await leg.locator('.chip[data-id="c2"]').click({ modifiers: ['Control'] });
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="t0"]')).toHaveCount(0);
  await expect(leg.locator('.chip.on')).toHaveCount(2);
  await leg.locator('.chip[data-id="c1"]').click({ modifiers: ['Control'] }); // quita uno
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(0);
  await expect(page.locator('tr[data-a="e0"]')).toHaveCount(1);
  noErrors(errors, 'varios sc');
});

test('Lookahead: lo vencido sin reprogramar se oculta (sin borrarse)', async ({ page }) => {
  const VIEJA = ['acts', 'v0', { ambId: 'a1', sc: 'c1', name: 'Prueba hidráulica', und: 'pto', days: ['2026-09-14', '2026-09-15'], order: 40 }];
  const errors = await openApp(page, { tab: 'look', extra: [VIEJA] });
  await expect(page.locator('tr[data-a="i0"]')).toHaveCount(1);
  await expect(page.locator('tr[data-a="v0"]')).toHaveCount(0);
  const pill = page.locator('#fpast button');
  await expect(pill).toContainText('1 vencida oculta');
  await pill.click();
  await expect(page.locator('tr[data-a="v0"]')).toHaveCount(1);
  expect(await page.evaluate(() => !!window.__dbGet('acts', 'v0').arch)).toBe(false);
  noErrors(errors, 'vencidas');
});

test('Lookahead: el nombre se homogeniza con el que ya se usa en otros ambientes', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const inp = page.locator('tr[data-a="t1"] input[data-f="name"]');
  await inp.click();
  await expect(page.locator('#dlact option[value="Entubado empotrado"]')).toHaveCount(1);
  await inp.fill('entubado   EMPOTRADO');
  await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 't1').name)).toBe('Entubado empotrado');
  await expect(page.locator('#toast')).toContainText('como ya se llama en');
  noErrors(errors, 'nombres');
});
