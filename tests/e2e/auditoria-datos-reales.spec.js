// Auditoría con los datos reales (09/10): eliminar restricción = archivar, sugerencia de campo sin cierres sin confirmar,
// PPC del SC con una sola fórmula y Plan semanal sin redibujar con cada cambio ajeno.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const X1 = { ambId: 'a1', sc: 'c1', name: 'Prueba auditada', und: '', metrado: null, days: [HOY], order: 40 };
const items = { x1: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Prueba auditada', days: [HOY], ord: 1 } };
const week = (o = {}) => ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {}, ...o }];

test('2 · eliminar una restricción la manda a la Papelera y se puede restaurar', async ({ page }) => {
  const R = ['restr', 'rz', { actId: '', pisoId: 'p1', type: 'Materiales', desc: 'Para archivar', resp: 'Elena Editora', need: '', freed: '', status: 'pend', created: '2026-10-01', by: 'frandiopacheco@gmail.com' }];
  const errors = await openApp(page, { tab: 'restr', extra: [R] });
  page.on('dialog', d => d.accept());
  await page.locator('[data-rdel="rz"]').first().click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('restr', 'rz') || {}).arch ? 'arch' : 'otro')).toBe('arch');
  expect(await page.evaluate(() => window.__dbGet('restr', 'rz').desc)).toBe('Para archivar'); // no se borró
  expect(await page.evaluate(() => S.res.has('rz'))).toBe(false);
  // en la Papelera (Configuración) y restaurable
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'arc'; render(); });
  const fila = page.locator('#arccard tr', { hasText: 'Para archivar' });
  await expect(fila).toBeVisible();
  await fila.locator('[data-arcr]').click();
  await expect.poll(() => page.evaluate(() => !!(window.__dbGet('restr', 'rz') || {}).arch)).toBe(false);
  expect(await page.evaluate(() => S.res.has('rz'))).toBe(true);
  noErrors(errors, 'papelera restricción');
});

test('10 · un cierre del capataz sin confirmar no se aplica como Sí: sale «por confirmar»', async ({ page }) => {
  const LV = ['live', HOY + '_x1', { date: HOY, actId: 'x1', pisoId: 'p1', sc: 'c1', close: { status: 'ok', by: 'u_cap1', n: 'Pedro', t: 1 } }];
  const errors = await openApp(page, { tab: 'plan', extra: [['acts', 'x1', X1], week(), LV] });
  const tr = page.locator('section[data-pid="p1"] tr[data-id="x1"]');
  await expect(tr.locator('.fsug')).toContainText('1 por confirmar');
  await expect(page.locator('section[data-pid="p1"] [data-applyfield]')).toHaveCount(0);
  expect(await page.evaluate(() => fieldSug('x1', S.wk.get('58_p1').items.x1).ok)).toBe(null);
  // confirmado por el ingeniero en Campo: ahora sí sugiere Sí
  await page.evaluate(d => writeDaily(d, 'p1', { recs: { x1: { ...baseRec(d, S.act.get('x1'), null), status: 'ok' } } }), HOY);
  await expect(tr.locator('.fsug')).not.toContainText('por confirmar');
  expect(await page.evaluate(() => fieldSug('x1', S.wk.get('58_p1').items.x1).ok)).toBe(true);
  noErrors(errors, 'por confirmar');
});

test('5 · el Tablero calcula el PPC del SC igual que el Plan semanal (frente no entregado que le cuenta al anterior)', async ({ page }) => {
  const it = (k, sc) => ({ sc, sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Act ' + k, days: [HOY], ord: k });
  const IT = { y1: it(1, 'c1'), y2: it(2, 'c1'), y3: it(3, 'c1'), y4: it(4, 'c2') };
  const res = { y1: { ok: true }, y2: { ok: true }, y3: { ok: false, cnc: 'Subcontratas', imp: false, rsc: 'c2', pc: true }, y4: { ok: true } };
  const errors = await openApp(page, { tab: 'dash', extra: [['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items: IT, res, snap: {} }]] });
  const r = await page.evaluate(() => { const vs = new Set(['p1']); const all = dashWeek(58, vs); const piso = ppcOf(S.wk.get('58_p1'));
    DB_.sc = new Set(['c2']); const c2 = dashWeek(58, vs); const ws = wkScStats([S.wk.get('58_p1')]).c2; DB_.sc = new Set(); return { all: all.ppcSc, piso: piso.ppcSc, c2: c2.ppcSc, ws: ws.ppcSc }; });
  expect(r.all).toBeCloseTo(r.piso, 6); // 3/4: la falla le cuenta a c2, en el total del piso es imputable
  expect(r.c2).toBeCloseTo(r.ws, 6);    // c2: 1/(1+1) = 50 %
  noErrors(errors, 'ppc del sc');
});

test('7 · en producción, cargar un respaldo exige escribir PRODUCCIÓN', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  const run = (txt) => page.evaluate(async txt => { window.LPS_ENV = 'produccion';
    const f = new File([JSON.stringify({ formato: 'lps911-v2', fecha: '2026-10-01T00:00:00Z', colecciones: { acts: { 'imp-x': { name: 'Importada', ambId: 'a1', sc: 'c1', days: [] } } } })], 'r.json');
    window.__ans = txt; await importJson(f); await new Promise(r => setTimeout(r, 300)); return !!window.__dbGet('acts', 'imp-x'); }, txt);
  let n = 0; page.on('dialog', d => { n++; d.type() === 'prompt' ? d.accept(n === 1 ? 'hola' : 'produccion') : d.accept(); });
  expect(await run()).toBe(false);          // escribió otra cosa: no carga
  expect(await run()).toBe(true);           // «produccion» (sin tilde también vale): carga
  noErrors(errors, 'carga en producción');
});
