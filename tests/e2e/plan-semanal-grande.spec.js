// Plan semanal con muchos compromisos (auditoría EJE-01): solo se dibujan las filas cerca de la pantalla. Lo que pidió el dueño
// tiene que seguir igual: vistas por SC y por ambiente, buscador, marcar el cumplimiento en ambas vistas y con el buscador,
// sin tocar lo congelado, imprimir todas las filas y el celular.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const N = 420;
const EXTRA = []; const items = {};
for (let i = 0; i < N; i++) {
  const amb = 'a' + (1 + (i % 2));
  EXTRA.push(['acts', 'g' + i, { ambId: amb, sc: 'c' + (1 + (i % 3)), name: 'Tarea ' + i, und: 'm2', metrado: 10, days: [HOY], order: 100 + i }]);
  items['g' + i] = { sc: 'c' + (1 + (i % 3)), sector: 'S' + (1 + Math.floor(i / 140)), code: 'B-' + Math.floor(i / 10), amb: 'Ambiente ' + Math.floor(i / 10), act: 'Tarea ' + i + (i === 397 ? ' zafiro' : ''), days: [HOY], ord: i };
}
EXTRA.push(['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {} }]);
const sec = page => page.locator('section[data-pid="p1"]');
const filas = page => page.locator('section[data-pid="p1"] tr[data-id]').count();
const alFinal = page => page.evaluate(() => { const sc = document.querySelector('#main .scroll'); sc.scrollTop = sc.scrollHeight; });
const resOf = (page, id) => page.evaluate(id => ((window.__dbGet('weeks', '58_p1').res || {})[id] || {}).ok, id);

test('obra grande: dibuja pocas filas, se marca al final de la lista en las dos vistas y con el buscador', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 800 });
  const errors = await openApp(page, { tab: 'plan', extra: EXTRA });
  await expect(sec(page).locator('tr[data-id]').first()).toBeVisible();
  expect(await filas(page)).toBeLessThan(150);
  // al final de la lista: la última fila aparece y se marca sin que la página salte
  await alFinal(page);
  const last = sec(page).locator('tr[data-id="g419"]');
  await expect(last).toBeVisible();
  const y0 = (await last.boundingBox()).y;
  await last.locator('[data-yn="1"]').click();
  await expect.poll(() => resOf(page, 'g419')).toBe(true);
  await page.waitForTimeout(300);
  expect(Math.abs((await sec(page).locator('tr[data-id="g419"]').boundingBox()).y - y0)).toBeLessThan(40);
  expect(await filas(page)).toBeLessThan(150);
  // un cambio de otro usuario (redibujo) tampoco mueve la fila
  await page.evaluate(() => render());
  await page.waitForTimeout(300);
  expect(Math.abs((await sec(page).locator('tr[data-id="g419"]').boundingBox()).y - y0)).toBeLessThan(40);
  // buscador: encuentra una fila del final aunque no estuviera dibujada
  await page.evaluate(() => { document.querySelector('#main .scroll').scrollTop = 0; });
  await page.fill('#plq', 'zafiro');
  await expect(page.locator('#plqn')).toHaveText(`1 de ${N} compromisos`);
  await expect(sec(page).locator('tr[data-id]')).toHaveCount(1);
  await sec(page).locator('tr[data-id="g397"] [data-yn="0"]').click();
  await expect.poll(() => resOf(page, 'g397')).toBe(false);
  await expect(page.locator('#plq')).toHaveValue('zafiro');
  await expect(sec(page).locator('tr[data-id]')).toHaveCount(1);
  // por ambiente: encabezados de sector y ambiente, y se marca igual
  await page.fill('#plq', '');
  await page.locator('#plv [data-v="amb"]').click();
  await expect(sec(page).locator('tr.plsec').first()).toBeVisible();
  await alFinal(page);
  await expect(sec(page).locator('tr.plamb', { hasText: 'Ambiente 41' })).toBeVisible();
  await sec(page).locator('tr[data-id="g415"] [data-yn="1"]').click();
  await expect.poll(() => resOf(page, 'g415')).toBe(true);
  expect(await filas(page)).toBeLessThan(150);
  // lo congelado no cambia
  const w = await page.evaluate(() => window.__dbGet('weeks', '58_p1'));
  expect(w.items).toEqual(items);
  expect(w.frozenAt).toBe('2026-09-28T08:00:00.000Z');
  // imprimir saca todas las filas
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  expect(await filas(page)).toBe(N);
  await page.evaluate(() => document.querySelector('#main .scroll').scrollTop = 0);
  await page.waitForTimeout(200);
  expect(await filas(page)).toBe(N);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect.poll(() => filas(page)).toBeLessThan(150);
  noErrors(errors, 'plan grande');
});

test('obra grande en el celular: se desplaza hasta el final y se marca', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { tab: 'plan', extra: EXTRA });
  await expect(sec(page).locator('tr[data-id]').first()).toBeVisible();
  expect(await filas(page)).toBeLessThan(100);
  for (let i = 0; i < 3; i++) { await alFinal(page); await page.waitForTimeout(150); }
  const last = sec(page).locator('tr[data-id="g419"]');
  await expect(last).toBeVisible();
  await last.locator('[data-yn="1"]').click();
  await expect.poll(() => resOf(page, 'g419')).toBe(true);
  // desplazarse de a poco no deja huecos: siempre hay filas en la pantalla
  const huecos = await page.evaluate(async () => {
    const S0 = () => document.querySelector('#main .scroll'); let k = 0;
    for (let y = S0().scrollHeight; y > 0; y -= 700) {
      S0().scrollTop = y; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hueco = () => { const r = S0().getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(el && el.closest('tr.plvsp')); };
      /* con el reloj de la prueba los cuadros no van al ritmo real: un hueco que dura un instante no cuenta, uno que queda sí */
      if (hueco()) { await new Promise(r => setTimeout(r, 400)); if (hueco()) k++; }
    }
    return k;
  });
  expect(huecos).toBe(0);
  noErrors(errors, 'plan grande celular');
});
