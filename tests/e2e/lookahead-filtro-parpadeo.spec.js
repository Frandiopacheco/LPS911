// Lookahead grande: al filtrar estando abajo («Solo con días en la ventana») la grilla no debe rebotar ni quedar en blanco
// (oct 2026: el anclaje de desplazamiento del navegador peleaba con la grilla virtual).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
const add = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const L = 'Actividad con un nombre muy largo que ocupa varios renglones en la columna de actividad del lookahead para variar la altura ';
const extra = [];
for (let a = 0; a < 200; a++) {
  extra.push(['ambientes', 'za' + a, { sectorId: a % 2 ? 's1' : 's2', code: 'Z-' + a, name: 'Amb ' + a, order: 10 + a }]);
  const n = a % 5 === 0 ? 25 : 4;
  for (let i = 0; i < n; i++) extra.push(['acts', 'zx' + a + '_' + i, { ambId: 'za' + a, sc: 'c1', name: (a % 4 < 2 ? L : 'A ') + a + '-' + i, order: i, days: i % 3 === 0 ? [add(HOY, 1 + (i % 5))] : [add(HOY, -200 + i), add(HOY, 300 + i)] }]);
}
test('filtrar abajo en el lookahead grande no rebota ni deja la grilla en blanco', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 1000 });
  const errors = await openApp(page, { tab: 'look', extra });
  await page.evaluate(() => { U.win = 12; U.piso = ''; U.showPast = true; render(); });
  await page.waitForTimeout(500);
  for (const f of [0.3, 0.7, 0.95, 1]) { await page.evaluate(f => { const g = document.getElementById('gw'); g.scrollTop = g.scrollHeight * f; }, f); await page.waitForTimeout(200); }
  await page.evaluate(() => { window.__sc = 0; document.getElementById('gw').addEventListener('scroll', () => window.__sc++); U.onlyWin = true; requestRender(); });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => { const g = document.getElementById('gw'); const gr = g.getBoundingClientRect();
    return { sc: window.__sc, vis: [...document.querySelectorAll('#grid tr[data-a]')].filter(t => { const b = t.getBoundingClientRect(); return b.bottom > gr.top && b.top < gr.bottom; }).length }; });
  expect(r.sc).toBeLessThanOrEqual(4);
  expect(r.vis).toBeGreaterThan(5);
  noErrors(errors, 'lookahead filtro');
});
