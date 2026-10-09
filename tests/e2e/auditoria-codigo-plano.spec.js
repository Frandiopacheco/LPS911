// Auditoría de código 08/10 (rendimiento del Plan diario, Campo y Sectorización): pruebas de regresión de P3 y P7.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { png } from './lamina.js';

const X1 = { ambId: 'a1', sc: 'c1', name: 'Prueba auditada', und: 'm2', metrado: 10, days: [HOY], qty: { [HOY]: 10 }, order: 40 };
const card = (page, id) => page.locator(`#main article[data-a="${id}"]`);

test('P3 · Campo no rearma la pantalla si nada cambió (no se pierde lo que se está escribiendo) y sigue respondiendo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [['acts', 'x1', X1]] });
  await card(page, 'x1').locator('[data-st="no"]').click();
  await expect(card(page, 'x1').locator('.cdet')).toBeVisible();
  /* se marca el elemento y se escribe un comentario sin confirmarlo (sin «change») */
  await page.evaluate(() => { document.querySelector('#main article[data-a="x1"]').__marca = 1; document.querySelector('#main [data-cnote]').value = 'a medio escribir'; });
  /* llegan dibujos sin cambios (otros usuarios, reloj…) */
  await page.evaluate(() => { for (let i = 0; i < 5; i++) render(); });
  expect(await page.evaluate(() => document.querySelector('#main article[data-a="x1"]').__marca)).toBe(1);
  expect(await page.evaluate(() => document.querySelector('#main [data-cnote]').value)).toBe('a medio escribir');
  /* lo que cambia sí se dibuja y los botones siguen funcionando */
  await card(page, 'x1').locator('[data-st="ok"]').click();
  await expect(card(page, 'x1')).toHaveClass(/st-ok/);
  await expect.poll(() => page.evaluate(d => ((window.__dbGet('daily', d + '_p1') || {}).recs || {}).x1?.status, HOY)).toBe('ok');
  /* al volver de otra pestaña se rearma (la marca está en el elemento raíz) */
  await page.evaluate(() => { U.tab = 'restr'; render(); U.tab = 'campo'; render(); });
  await expect(card(page, 'x1')).toHaveClass(/st-ok/);
  noErrors(errors, 'campo sin rearmar');
});

/* lámina con 3 partes en la versión liviana y alta; falta la parte 1 */
const B64 = png(20, 12).toString('base64');
const ROTA = [
  ['laminas', 'LR', { pisoId: 'p1', esp: 'ARQ', name: 'Planta rota', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 3, nl: 3, rev: 1, order: 1 }],
  ...['l', 'f'].flatMap(q => [0, 2].map(i => ['lamimg', `LR_1_${q}_${i}`, { d: i === 0 ? B64.slice(0, 8) : B64.slice(8) }])),
];

test('P7 · una lámina que no carga avisa una vez, no se reintenta en cada dibujo y vuelve a intentar al recuperar la conexión', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: ROTA });
  await page.waitForFunction(() => window.__plano && window.__plano.M.view);
  /* cuenta lecturas de partes y avisos desde aquí */
  await page.evaluate(() => {
    window.__lr = 0; window.__toasts = [];
    const oc = db.collection.bind(db);
    db.collection = n => { const c = oc(n); if (n !== 'lamimg') return c; const od = c.doc.bind(c); c.doc = id => { const d = od(id); const og = d.get.bind(d); d.get = (...a) => { window.__lr++; return og(...a); }; return d; }; return c; };
    const ot = window.toast; window.toast = (m, ...a) => { window.__toasts.push(String(m)); return ot(m, ...a); };
  });
  await page.evaluate(() => { for (let i = 0; i < 5; i++) render(); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__lr)).toBe(0);
  expect(await page.evaluate(() => window.__toasts.filter(t => t.includes('lámina')).length)).toBe(0);
  /* vuelve la conexión: reintenta al momento, pide las 3 partes a la vez y avisa una sola vez */
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => page.evaluate(() => window.__toasts.filter(t => t.includes('No se pudo cargar la lámina')).length)).toBe(1);
  expect(await page.evaluate(() => window.__lr)).toBe(3);
  await page.evaluate(() => { for (let i = 0; i < 5; i++) render(); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__lr)).toBe(3);
  expect(await page.evaluate(() => window.__toasts.filter(t => t.includes('No se pudo cargar la lámina')).length)).toBe(1);
  noErrors(errors, 'lámina rota');
});
