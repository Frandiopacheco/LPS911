// P10 (oct 2026): modo «Por personal» (personas por día = metrado del día ÷ rendimiento, o cuadrilla fija), histograma teórico
// con un SC elegido y metrado repartido solo en los días programados (automático hasta que se edita un día a mano).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const D2 = '2026-10-03', D3 = '2026-10-05';
const A = (id, o) => ['acts', id, { ambId: 'a1', sc: 'c1', name: 'Act ' + id, und: 'M2', metrado: null, days: [], order: 90, ...o }];
const EXTRA = [
  A('x1', { name: 'Pintura', metrado: 100, days: [MANANA, D2], qty: { [MANANA]: 50, [D2]: 50 }, rend: 20 }), // 3 y 3 personas
  A('x2', { name: 'Limpieza', und: 'GLB', days: [MANANA], cuad: 4 }),                                          // cuadrilla fija 4
  A('x3', { name: 'Resane', metrado: 30, days: [MANANA], qty: { [MANANA]: 30 } }),                              // sin rendimiento
  A('x4', { name: 'Enchape', metrado: null, days: [MANANA, D2, D3] }),
];

test('Por personal: personas por día, cuadrilla fija e histograma del SC elegido', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: EXTRA });
  await page.evaluate(() => { U.sc = 'c1'; saveUI(); requestRender(); });
  await page.locator('#fmode [data-m="personal"]').click();
  const cell = (a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
  await expect(cell('x1', MANANA)).toHaveText('3');
  await expect(cell('x2', MANANA)).toHaveText('4');
  await expect(cell('x3', MANANA)).toHaveClass(/pz/);
  await expect(page.locator('#grid tr[data-a="x1"] td.cS input[data-f="rend"]')).toHaveValue('20');
  // histograma al pie: 3 + 4 el viernes, pico 7; una fila sin rendimiento
  const foot = page.locator('#grid tfoot tr.lkhist');
  await expect(foot.locator('td.hcap')).toContainText('pico 7 personas');
  await expect(foot.locator('td.hcap')).toContainText('sin rendimiento');
  const nSin = async () => +((await foot.locator('td.hcap').textContent()).match(/(\d+) filas? sin rendimiento/) || [0, 0])[1];
  const n0 = await nSin();
  // escribir el rendimiento en la fila → el día se calcula (30 ÷ 8 = 3,75 → 4)
  const inp = page.locator('#grid tr[data-a="x3"] td.cS input[data-f="rend"]');
  await inp.fill('8'); await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'x3').rend)).toBe(8);
  await expect(cell('x3', MANANA)).toHaveText('4');
  await expect.poll(nSin).toBe(n0 - 1);
  // solo muestra: tocar un día no lo programa (se programa en Por días o Por metrado)
  const d3 = '2026-10-05';
  const before = await page.evaluate(() => (window.__dbGet('acts', 'x1').days || []).slice());
  await cell('x1', d3).click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__dbGet('acts', 'x1').days)).toEqual(before);
  // con dos SC elegidos no hay histograma: pide elegir uno
  await page.evaluate(() => { U.sc = 'c1,c2'; requestRender(); });
  await expect(foot.locator('td.hcap')).toContainText('Elige un subcontratista');
  noErrors(errors, 'por personal');
});

test('Por personal: el rendimiento escrito va al catálogo de la Matriz y lo heredan todas sus filas (25-10-2026)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...EXTRA,
    ['mcat', 'kp', { name: 'Pintura', sc: 'c1', cl: 't', al: ['pintura'], ord: 10 }],
    A('x7', { name: 'Pintura', metrado: 40, days: [MANANA], qty: { [MANANA]: 40 } }),
  ] });
  await page.locator('#fmode [data-m="personal"]').click();
  const cell = (a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
  await expect(cell('x7', MANANA)).toHaveClass(/pz/); // sin rendimiento todavía
  const inp = page.locator('#grid tr[data-a="x1"] td.cS input[data-f="rend"]');
  await inp.fill('10'); await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mcat', 'kp') || {}).rend)).toBe(10);
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'x1').rend)).toBe(null); // la fila hereda del catálogo
  await expect(cell('x1', MANANA)).toHaveText('5'); // 50 ÷ 10
  await expect(cell('x7', MANANA)).toHaveText('4'); // la otra fila de «Pintura» también: 40 ÷ 10
  await expect(page.locator('#grid tr[data-a="x7"] td.cS input[data-f="rend"]')).toHaveValue('10');
  noErrors(errors, 'rendimiento al catálogo');
});

test('Metrado repartido solo: automático hasta editar un día; lo de hoy no se toca', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...EXTRA,
    A('x5', { name: 'Sellado', metrado: 50, days: [HOY, MANANA, D2], qty: { [HOY]: 10 }, qa: true }),
    A('x6', { name: 'Zócalo', metrado: 40, days: [MANANA, D2], qty: { [MANANA]: 40 } }),
  ] });
  // poner el metrado total reparte en los días programados
  const m = page.locator('#grid tr[data-a="x4"] td.cM input[data-f="metrado"]');
  await m.fill('90'); await m.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'x4').qty)).toEqual({ [MANANA]: 30, [D2]: 30, [D3]: 30 });
  expect(await page.evaluate(() => window.__dbGet('acts', 'x4').qa)).toBe(true);
  // editar la cantidad de un día la pasa a manual
  await page.evaluate(d => commitQ('x4', d, '10'), MANANA);
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'x4').qa)).toBe(false);
  expect(await page.evaluate(d => window.__dbGet('acts', 'x4').qty[d], MANANA)).toBe(10);
  // repartir: hoy (cerrado) conserva su cantidad; el saldo se reparte desde mañana
  expect(await page.evaluate(() => qAutoFill(S.act.get('x5')).qty)).toEqual({ [HOY]: 10, [MANANA]: 20, [D2]: 20 });
  // una fila con cantidades puestas a mano (sin marca de reparto) no se reparte sola
  expect(await page.evaluate(() => qAutoElig(S.act.get('x6')))).toBe(false);
  // desactivado en Configuración › Calendario: no se reparte
  expect(await page.evaluate(() => { const p = S.meta.get('project'); S.meta.set('project', { ...p, cal: { ...(p.cal || {}), qauto: false } }); const r = qAutoElig(S.act.get('x5')); S.meta.set('project', p); return r; })).toBe(false);
  noErrors(errors, 'reparto automático');
});
