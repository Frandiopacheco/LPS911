// Lookahead robusto y ágil (auditoría de código 08/10): un dato raro no deja la grilla en blanco (L6)
// y la búsqueda redibuja una sola vez al dejar de escribir (L12).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const RARO = [
  ['acts', 'zr1', { ambId: 'a1', sc: 'c1', name: 'Pintura rara', und: 'm2', days: ['2026-09-29', '2026-10-01'], order: 90 }],
  ['daily', '2026-09-29_p1', { date: '2026-09-29', pisoId: 'p1', recs: { zr1: { status: 'raro', sc: 'c1', nm: 'Pintura rara', ambId: 'a1', by: 'campo@obra.pe', ts: 1 } }, extra: {} }],
];

test('L6: un registro de Campo con estado desconocido o una fila que falla no dejan la grilla en blanco', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: RARO });
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  await expect(page.locator('#grid tr[data-a="zr1"]')).toHaveCount(1);
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(1);
  // el día con el estado desconocido muestra una marca (no rompe la fila)
  await expect(page.locator('#grid tr[data-a="zr1"] td[data-d="2026-09-29"] .dm')).toHaveCount(1);
  // si armar una fila falla, solo esa fila dice «dato inválido» y las demás siguen
  const warns = [];
  page.on('console', m => { if (m.type() === 'warning' && /dato inválido/.test(m.text())) warns.push(m.text()); });
  await page.evaluate(() => { const f = actStats; window.actStats = x => { if (x.id === 'zr1') throw new Error('prueba'); return f(x); }; gridRows = null; render(); render(); });
  await expect(page.locator('#grid tr.lkbad[data-a="zr1"]')).toContainText('dato inválido');
  await expect(page.locator('#grid tr[data-a="i0"] input[data-f="name"]')).toHaveCount(1);
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  await expect.poll(() => warns.length).toBe(1); // se avisa una sola vez en la consola
  noErrors(errors, 'lookahead robusto');
});

test('L7: si la ventana pierde el foco a medio pintar, no queda el pincel pegado ni se guarda; pintar normal sí guarda', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const days0 = await page.evaluate(() => [...__dbGet('acts', 'i0').days]);
  const td = page.locator('#grid tr[data-a="i0"] td.d:not(.on):not(.hol)').first();
  const d = await td.getAttribute('data-d');
  const b = await td.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  expect(await page.evaluate(() => !!paint)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => paint)).toBe(null);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [...__dbGet('acts', 'i0').days])).toEqual(days0);
  await expect(page.locator(`#grid tr[data-a="i0"] td.d[data-d="${d}"]`)).not.toHaveClass(/\bon\b/);
  // pintar normal (sin perder el foco) sí guarda
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.up();
  await expect.poll(() => page.evaluate(dd => __dbGet('acts', 'i0').days.includes(dd), d)).toBe(true);
  noErrors(errors, 'pincel');
});

test('L12: escribir en la búsqueda redibuja la grilla una sola vez, al dejar de escribir', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(1);
  const otra = await page.evaluate(() => [...S.act.values()].find(x => !/redes/i.test(x.name) && document.querySelector(`#grid tr[data-a="${x.id}"]`)).id);
  // se escribe «redes» con una tecla cada 60 ms (como una persona rápida): antes redibujaba con cada tecla (5 veces)
  const n = await page.evaluate(async () => {
    window.__rg = 0; const f = renderGrid; window.renderGrid = (...a) => { window.__rg++; return f(...a); };
    const sl = ms => new Promise(r => setTimeout(r, ms));
    const q = document.getElementById('fq'); for (const t of ['r', 're', 'red', 'rede', 'redes']) { q.value = t; q.dispatchEvent(new Event('input', { bubbles: true })); await sl(60); }
    await sl(500); return window.__rg;
  });
  expect(n).toBeGreaterThanOrEqual(1);
  expect(n, 'redibuja al dejar de escribir, no con cada tecla').toBeLessThanOrEqual(2);
  await expect(page.locator(`#grid tr[data-a="${otra}"]`)).toHaveCount(0);
  await expect(page.locator('#grid tr[data-a="i0"]')).toHaveCount(1);
  noErrors(errors, 'búsqueda');
});
