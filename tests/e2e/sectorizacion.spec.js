// Sectorización: la misma lámina del Plan diario, la lista del lookahead por nivel y la forma de cada ambiente.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';
import { LAMINA, ZONA_E0, enPantalla } from './lamina.js';

const geo = (page, col, id) => page.evaluate(([c, i]) => (window.__dbGet(c, i) || {}).geo || {}, [col, id]);

test('ubicar ambientes por nivel con rectángulo y polígono, y deshacer', async ({ page }) => {
  const errors = await openApp(page, { tab: 'planos', extra: LAMINA });
  await page.locator('[data-szp="p1"]').click();
  await expect(page.locator('#szlist')).toContainText('Dpto 101');
  await expect(page.locator('#sztool')).toContainText('0/2 ambientes ubicados');
  // A-1 con rectángulo
  await page.locator('[data-szd="a:a1"]').click();
  await expect(page.locator('#sztool')).toContainText('Arrastra un rectángulo');
  const a = await enPantalla(page, '#szmap', 100, 100), b = await enPantalla(page, '#szmap', 300, 300);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2); await page.mouse.move(b.x, b.y); await page.mouse.up();
  await expect.poll(async () => ((await geo(page, 'ambientes', 'a1')).L1 || []).length).toBe(8);
  // pasa solo al siguiente sin ubicar (A-2); ahora con polígono
  await expect(page.locator('#sztool')).toContainText('A-2');
  await page.locator('[data-sza="poly"]').click();
  for (const [x, y] of [[400, 100], [600, 100], [600, 300], [400, 300]]) { const p = await enPantalla(page, '#szmap', x, y); await page.mouse.click(p.x, p.y); }
  await page.locator('[data-sza="fin"]').click();
  await expect.poll(async () => ((await geo(page, 'ambientes', 'a2')).L1 || []).length).toBe(8);
  await expect(page.locator('#sztool')).toContainText('2/2 ambientes ubicados');
  await expect(page.locator('#szmap .pvl.sza')).toHaveCount(2);
  // tocar una forma la selecciona en la lista
  const c = await enPantalla(page, '#szmap', 200, 200); await page.mouse.click(c.x, c.y);
  await expect(page.locator('#szlist .szamb.on')).toContainText('Dpto 101');
  // el sector también se puede ubicar
  await page.locator('[data-szd="s:s1"]').click();
  const s0 = await enPantalla(page, '#szmap', 80, 80), s1 = await enPantalla(page, '#szmap', 640, 320);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s1.x, s1.y); await page.mouse.up();
  await expect.poll(async () => ((await geo(page, 'sectors', 's1')).L1 || []).length).toBe(8);
  // deshacer
  await page.click('#bundo');
  await expect.poll(async () => !!(await geo(page, 'sectors', 's1')).L1).toBe(false);
  // solo sin ubicar
  await page.locator('#szmiss').check();
  await expect(page.locator('#szlist')).toContainText('Todos los ambientes de este nivel están ubicados');
  noErrors(errors, 'sectorización');
});

test('proponer desde el Plan diario y abrir desde el lookahead', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'look', extra: [...LAMINA, ZONA_E0] });
  await page.click('[data-ambmenu="a1"]');
  await page.click('#pop [data-do="geo"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'planos');
  await expect(page.locator('#szlist .szamb.on')).toContainText('Dpto 101');
  await page.locator('[data-sza="cancel"]').click();
  await page.click('#szsug');
  await expect.poll(async () => (await geo(page, 'ambientes', 'a1')).L1).toEqual([100, 100, 300, 100, 300, 300, 100, 300]);
  noErrors(errors, 'proponer');
});

test('en el recorrido, el ambiente sale de su forma en la lámina', async ({ page }) => {
  const A2 = ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [500, 100, 700, 100, 700, 300, 500, 300] } }];
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: [...LAMINA, A2] });
  await page.evaluate(() => { CU.view = 'plan'; render(); });
  await page.locator('[data-kp="p1"]').click();
  const p = await enPantalla(page, '#kplan', 600, 200); await page.mouse.click(p.x, p.y);
  await expect(page.locator('#npamb')).toHaveValue('a2');
  noErrors(errors, 'recorrido');
});

test('quien no edita solo consulta el mapa', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'planos', extra: LAMINA });
  await page.locator('[data-szp="p1"]').click();
  await expect(page.locator('#szlist')).toContainText('Dpto 101');
  await expect(page.locator('[data-szd]')).toHaveCount(0);
  await expect(page.locator('#szsug')).toHaveCount(0);
  noErrors(errors, 'lector');
});
