// Productividad F1 (productividad.js): partidas críticas de los SC, reporte diario y proyección.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const extra = [
  ['pcrit', 'pc1', { sc: 'c1', nom: 'Enchape porcelanato', und: 'm²', met: 1000, fin: '2026-10-30', mp: { p1: 500, p2: 500 }, ord: 0 }],
  ['pcrit', 'pc2', { sc: 'c2', nom: 'Cableado', und: 'ml', met: 800, fin: '2026-10-20', ord: 1 }],
  ['pav', '2026-09-28_pc1_p1_-', { pc: 'pc1', sc: 'c1', d: '2026-09-28', piso: 'p1', zona: '', q: 50, by: 'sc@obra.pe', ts: 1 }],
  ['pav', '2026-09-29_pc1_p1_-', { pc: 'pc1', sc: 'c1', d: '2026-09-29', piso: 'p1', zona: '', q: 50, by: 'sc@obra.pe', ts: 1 }],
  ['pav', '2026-09-30_pc1_p1_-', { pc: 'pc1', sc: 'c1', d: '2026-09-30', piso: 'p1', zona: '', q: 50, hh: 30, by: 'sc@obra.pe', ts: 1 }],
  ['pav', '2026-09-30_pc1_p1_x', { pc: 'pc1', sc: 'c1', d: '2026-09-30', piso: 'p1', zona: '', q: 999, by: 'sc@obra.pe', ts: 1, arch: { t: 1 } }],
];

test('Productividad: cálculo de ritmo, proyección y estado', async ({ page }) => {
  const errors = await openApp(page, { extra });
  const s = await page.evaluate(() => { ensurePv(); return new Promise(r => setTimeout(() => { const p = PCR.get('pc1'); const x = pvStats(p, pvReps('pc1'), todayIso()); r({ ...x, byD: null, byP: Object.fromEntries(x.byP) }); }, 300)); });
  expect(s.acu).toBe(150);                 // el reporte archivado no suma
  expect(s.saldo).toBe(850);
  expect(s.rit).toBe(50);                  // hoy aún no reporta: promedio de los 3 días hábiles con datos
  expect(s.hh).toBe(30);
  expect(s.byP).toEqual({ p1: 150 });
  expect(s.fin > HOY).toBe(true);
  expect(s.nec).toBeGreaterThan(0);
  expect(s.st).toBe(s.rit >= s.nec ? 'ok' : s.rit >= s.nec * 0.85 ? 'risk' : 'late');
  noErrors(errors, 'calculo');
});

test('Productividad: el SC reporta su avance por piso; ve solo su partida', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'sc', extra });
  // la pantalla Hoy le avisa que falta su reporte
  await expect(page.locator('.hoyg')).toContainText('Avance de tus partidas críticas');
  await page.evaluate(() => { U.piso = ''; goTab('prod'); });
  await expect(page.locator('tr[data-pvs="pc1"]')).toHaveCount(1);
  await expect(page.locator('tr[data-pvs="pc2"]')).toHaveCount(0);
  await page.locator('[data-pv="rep"]').first().click();
  const sh = page.locator('#pvsheet');
  // sin piso no guarda
  await sh.locator('[data-pf="q"]').fill('85');
  await sh.locator('[data-pf="ok"]').click();
  await expect(page.locator('#pvsheet')).toBeVisible();
  await sh.locator('button[data-pf="piso"][data-v="p2"]').click();
  await sh.locator('[data-pf="q"]').fill('85');
  await sh.locator('[data-pf="hh"]').fill('40');
  await sh.locator('[data-pf="ok"]').click();
  await expect(page.locator('#pvsheet')).toHaveCount(0);
  await expect.poll(() => page.evaluate(h => window.__dbGet('pav', h + '_pc1_p2_-'), HOY)).toMatchObject({ pc: 'pc1', sc: 'c1', piso: 'p2', q: 85, hh: 40, by: 'sc@obra.pe' });
  // el detalle muestra el avance del piso 2
  await expect(page.locator('.pvpis')).toContainText('85');
  noErrors(errors, 'sc reporta');
});

test('Productividad: el ingeniero crea una partida crítica y corrige un reporte del SC', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  const errors = await openApp(page, { as: 'campo', extra });
  await page.evaluate(() => goTab('prod'));
  await expect(page.locator('tr[data-pvs]')).toHaveCount(2);
  await page.locator('[data-pv="new"]').click();
  const sh = page.locator('#pvsheet');
  await sh.locator('[data-pp="sc"]').selectOption('c3');
  await sh.locator('[data-pp="nom"]').fill('Tarrajeo de muros');
  await sh.locator('[data-pp="met"]').fill('2400');
  await sh.locator('[data-pp="fin"]').fill('2026-11-14');
  await sh.locator('[data-pp="ok"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('pcrit')).find(p => p.nom === 'Tarrajeo de muros'))).toMatchObject({ sc: 'c3', met: 2400, fin: '2026-11-14', und: 'm²' });
  // corregir un reporte del SC: queda el valor anterior en el historial
  await page.locator('tr[data-pvs="pc1"]').click();
  await page.locator('.pvtw [data-pv="rep"][data-id="2026-09-29_pc1_p1_-"]').click();
  await page.locator('#pvsheet [data-pf="q"]').fill('45');
  await page.locator('#pvsheet [data-pf="ok"]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('pav', '2026-09-29_pc1_p1_-'))).toMatchObject({ q: 45, by: 'campo@obra.pe', h: [{ q: 50, by: 'sc@obra.pe' }] });
  noErrors(errors, 'ingeniero');
});
