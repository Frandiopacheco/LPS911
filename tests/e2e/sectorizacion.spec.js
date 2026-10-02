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
  // pasa solo al siguiente sin ubicar (A-2); ahora con polígono: clics con algo de temblor y se cierra tocando la primera esquina
  await expect(page.locator('#sztool')).toContainText('A-2');
  await page.locator('[data-sza="poly"]').click();
  for (const [x, y] of [[400, 100], [600, 100], [600, 300], [400, 300]]) {
    const p = await enPantalla(page, '#szmap', x, y);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 4, p.y + 3); await page.mouse.move(p.x + 7, p.y + 5); await page.mouse.up();
  }
  await expect(page.locator('#sztool')).toContainText('Terminar (4)');
  const f = await enPantalla(page, '#szmap', 400, 100); await page.mouse.click(f.x, f.y);
  await expect.poll(async () => ((await geo(page, 'ambientes', 'a2')).L1 || []).length).toBe(8);
  await expect(page.locator('#sztool')).toContainText('2/2 ambientes ubicados');
  await expect(page.locator('#szmap .pvl.sza')).toHaveCount(2);
  // el sector se contornea solo con sus ambientes
  await expect(page.locator('#szmap .pvl.szs')).toContainText('S1');
  // tocar una forma la selecciona; sus esquinas se arrastran para ajustarla
  const c = await enPantalla(page, '#szmap', 200, 200); await page.mouse.click(c.x, c.y);
  await expect(page.locator('#szlist .szamb.on')).toContainText('Dpto 101');
  await expect(page.locator('#szmap .pvh')).toHaveCount(8); // 4 esquinas + 4 para agregar
  const h = await enPantalla(page, '#szmap', 300, 300), h2 = await enPantalla(page, '#szmap', 340, 360);
  await page.mouse.move(h.x, h.y); await page.mouse.down(); await page.mouse.move((h.x + h2.x) / 2, (h.y + h2.y) / 2); await page.mouse.move(h2.x, h2.y); await page.mouse.up();
  await expect.poll(async () => (await geo(page, 'ambientes', 'a1')).L1.slice(4, 6).map(Math.round)).toEqual([340, 360]);
  // agregar una esquina desde el punto medio de un lado
  const m = await enPantalla(page, '#szmap', 200, 100), m2 = await enPantalla(page, '#szmap', 200, 60);
  await page.mouse.move(m.x, m.y); await page.mouse.down(); await page.mouse.move(m2.x, m2.y); await page.mouse.up();
  await expect.poll(async () => (await geo(page, 'ambientes', 'a1')).L1.length).toBe(10);
  // deshacer
  await page.click('#bundo');
  await expect.poll(async () => (await geo(page, 'ambientes', 'a1')).L1.length).toBe(8);
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

test('la lámina base se sube en Sectorización; el Plan diario solo sube especialidades', async ({ page }) => {
  const errors = await openApp(page, { tab: 'planos' });
  await page.locator('[data-szp="p1"]').click();
  await expect(page.locator('#szmap')).toContainText('todavía no tiene lámina base');
  await page.click('#szup');
  await expect(page.locator('.mdlgc')).toContainText('Subir lámina base del piso');
  await expect(page.locator('#utw')).toBeHidden();
  await page.click('#ucancel');
  await openTab(page, 'mapa');
  await expect(page.locator('#main')).toContainText('Se sube en Sectorización');
  await page.locator('[data-gosz]').click();
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'planos');
  noErrors(errors, 'subir base');
});

test('quien no edita solo consulta el mapa', async ({ page }) => {
  const errors = await openApp(page, { as: 'lector', tab: 'planos', extra: LAMINA });
  await page.locator('[data-szp="p1"]').click();
  await expect(page.locator('#szlist')).toContainText('Dpto 101');
  await expect(page.locator('[data-szd]')).toHaveCount(0);
  await expect(page.locator('#szsug')).toHaveCount(0);
  noErrors(errors, 'lector');
});
