// 25-10-2026 (dueño): en «Por días» y «Por metrado» arrastrar hacia la derecha agrega y hacia la izquierda quita / borra;
// lo que se va a quitar se ve en rojo antes de soltar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, MANANA } from './helpers.js';

const L5 = '2026-10-05', M6 = '2026-10-06', X7 = '2026-10-07', J8 = '2026-10-08';
const A = (id, o) => ['acts', id, { ambId: 'a1', sc: 'c1', name: 'Act ' + id, und: 'M2', metrado: null, days: [], order: 90, ...o }];
async function drag(page, aid, d0, d1, check) {
  const a = page.locator(`#grid tr[data-a="${aid}"] td.d[data-d="${d0}"]`), b = page.locator(`#grid tr[data-a="${aid}"] td.d[data-d="${d1}"]`);
  await a.scrollIntoViewIfNeeded();
  const ba = await a.boundingBox(), bb = await b.boundingBox();
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 });
  if (check) await check();
  await page.mouse.up();
}
const days = (page, id) => page.evaluate(i => (window.__dbGet('acts', i).days || []).slice().sort(), id);

test('Por días: a la derecha agrega, a la izquierda quita (en rojo antes de soltar)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [A('r1', { days: [L5, M6, X7, J8] }), A('r2', {})] });
  // a la derecha sobre una fila vacía: agrega
  await drag(page, 'r2', L5, X7);
  await expect.poll(() => days(page, 'r2')).toEqual([L5, M6, X7]);
  // a la izquierda empezando en un día programado: quita, y antes de soltar se ve en rojo
  await drag(page, 'r1', J8, M6, async () => { await expect(page.locator('#grid tr[data-a="r1"] td.d.pdel')).toHaveCount(3); });
  await expect.poll(() => days(page, 'r1')).toEqual([L5]);
  // a la izquierda empezando en un día vacío también quita (lo que haya en el tramo)
  await drag(page, 'r2', J8, M6);
  await expect.poll(() => days(page, 'r2')).toEqual([L5]);
  noErrors(errors, 'arrastre por días');
});

test('Por metrado: a la derecha abre el reparto, a la izquierda borra los días', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [A('q1', { metrado: 100, days: [L5, M6, X7, J8], qty: { [L5]: 25, [M6]: 25, [X7]: 25, [J8]: 25 } })] });
  await page.locator('#fmode [data-m="metrado"]').click();
  await drag(page, 'q1', J8, M6, async () => { await expect(page.locator('#grid tr[data-a="q1"] td.d.qdel')).toHaveCount(3); await expect(page.locator('#lkqtip')).toHaveText('Borrar 3 días'); });
  await expect.poll(() => days(page, 'q1')).toEqual([L5]);
  expect(await page.evaluate(() => window.__dbGet('acts', 'q1').qty)).toEqual({ [L5]: 25 });
  await drag(page, 'q1', M6, J8);
  await expect(page.locator('#pop [data-do="dist"]')).toBeVisible();
  noErrors(errors, 'arrastre por metrado');
});

test('Despintar todos los días futuros no hace desaparecer la fila hasta terminar la edición', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [A('k1', { name: 'Zócalo', days: ['2026-09-15', L5, M6] })] });
  await drag(page, 'k1', M6, L5); // quita los futuros: solo le queda un día pasado (sería «vencida» y se ocultaría)
  await expect.poll(() => days(page, 'k1')).toEqual(['2026-09-15']);
  await expect(page.locator('#grid tr[data-a="k1"]')).toHaveCount(1);
  // se vuelve a pintar en otro lado
  await drag(page, 'k1', X7, J8);
  await expect.poll(() => days(page, 'k1')).toEqual(['2026-09-15', X7, J8]);
  noErrors(errors, 'fila se mantiene');
});
