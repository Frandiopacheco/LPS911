// Auditoría de código 08/10 (rendimiento del Plan diario, Campo y Sectorización): pruebas de regresión de P3, P7 y P10.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { png } from './lamina.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const EXCELJS = createRequire(import.meta.url).resolve('exceljs/dist/exceljs.min.js');

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

test('P10 · el «Plan de trabajo» se arma piso por piso: no quedan todos los lienzos en memoria', async ({ page }) => {
  const B = png(40, 24).toString('base64');
  const lam = (id, pid) => [['laminas', id, { pisoId: pid, esp: 'ARQ', name: 'Planta ' + pid, base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }],
    ['lamimg', `${id}_1_f_0`, { d: B }], ['lamimg', `${id}_1_l_0`, { d: B }]];
  const zona = (id, pid, v, aid, sc, pts) => ['pdz', id, { date: MANANA, pisoId: pid, vista: v, sc, kind: 'zona', pts, actId: aid, ambId: null, desc: '', fuera: false, by: 'x', ts: 1 }];
  const extra = [...lam('L1', 'p1'), ...lam('L2', 'p2'), ['acts', 'k1', { ambId: 'a1', sc: 'c1', name: 'Redes', und: 'pto', days: [MANANA], order: 5 }],
    zona('z0', 'p1', 'L1', 'e0', 'c2', [100, 100, 350, 100, 350, 300, 100, 300]), zona('z1', 'p1', 'L1', 'e1', 'c2', [400, 150, 650, 150, 650, 400, 400, 400]),
    zona('z3', 'p1', 'L1', 'k1', 'c1', [250, 200, 500, 200, 500, 450, 250, 450]), zona('z2', 'p2', 'L2', 'e2', 'c2', [50, 50, 950, 50, 950, 550, 50, 550])];
  /* se cuentan los lienzos con tamaño (vivos) creados durante el exporte; antes quedaban todos hasta el final (uno por piso y SC, y otro más en Excel) */
  await page.addInitScript(() => {
    window.PLANO_EXPORT_PREVIEW = true; window.__cvs = null; window.__peak = 0;
    const ce = document.createElement.bind(document);
    document.createElement = (t, o) => { const e = ce(t, o); if (window.__cvs && String(t).toLowerCase() === 'canvas') window.__cvs.push(e); return e; };
    const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', { get: d.get, set(v) { d.set.call(this, v); if (window.__cvs) window.__peak = Math.max(window.__peak, window.__cvs.filter(c => c.width * c.height > 0).length); } });
  });
  const errors = await openApp(page, { tab: 'mapa', extra });
  await page.route(/cdn\.jsdelivr\.net\/npm\/exceljs/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(EXCELJS, 'utf8') }));
  await page.locator('#mpdf').click();
  await page.locator('#xds').check(); // además, un plano por subcontratista: 2 pisos + 3 por SC = 5 planos
  await page.evaluate(() => { window.__cvs = []; });
  await page.locator('#pop [data-do="drxls"]').click();
  await expect.poll(() => page.evaluate(() => !!window.__dr_xlsx), { timeout: 30000 }).toBe(true);
  expect(await page.evaluate(() => window.__cvs.length)).toBeGreaterThanOrEqual(10); // 5 planos y su copia de 2400 px para Excel
  expect(await page.evaluate(() => window.__peak)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.__cvs.filter(c => c.width * c.height > 0).length)).toBe(0); // todos soltados
  /* el Excel tiene el listado y una hoja por plano, con su imagen */
  const hojas = await page.evaluate(async () => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await window.__dr_xlsx.arrayBuffer()); return wb.worksheets.map(s => [s.name, s.getImages().length]); });
  expect(hojas.length).toBe(6);
  expect(hojas.slice(1).every(([, n]) => n === 1)).toBe(true);
  await expect(page.locator('#mpdf')).toHaveText('Exportar…');
  await expect(page.locator('#mpdf')).toBeEnabled();
  noErrors(errors, 'exporte por pisos');
});
