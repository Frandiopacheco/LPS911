// Cargar datos desde archivo: si las reglas rechazan algunos registros (historiales de otras personas), se saltan esos y se carga el resto.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('un rechazo de permisos en un historial no detiene la carga del respaldo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await page.click('[data-teamv="dat"]');
  page.on('dialog', d => d.accept());
  await page.evaluate(async () => {
    /* imita las reglas: lhlog solo lo escribe su autor */
    const den = () => Promise.reject(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));
    const col0 = db.collection.bind(db); db.collection = c => { const r = col0(c); if (c !== 'lhlog') return r; return { ...r, doc: id => ({ ...r.doc(id), set: den }) }; };
    const bw = window.batchWrites; window.batchWrites = async (w, p) => { if (w.some(x => x[0] === 'lhlog')) return den(); return bw(w, p); };
    const data = { formato: 'lps911-v2', colecciones: {
      sectors: { sx: { pisoId: 'p1', code: 'SX', name: 'Sector nuevo', order: 9 } },
      lhlog: { l1: { t: 1, by: 'otro@obra.pe', items: [] }, l2: { t: 2, by: 'otro@obra.pe', items: [] } },
      ambientes: { ax: { sectorId: 'sx', code: 'X-1', name: 'Nuevo', order: 1 } } } };
    await importJson({ text: async () => JSON.stringify(data) });
  });
  await expect.poll(() => page.evaluate(() => window.__dbGet('ambientes', 'ax'))).toBeTruthy();
  expect(await page.evaluate(() => window.__dbGet('sectors', 'sx').name)).toBe('Sector nuevo');
  await expect(page.locator('#impmsg')).toContainText('No se cargaron 2 registros');
  await expect(page.locator('#impmsg')).toContainText('lhlog: 2');
  noErrors(errors, 'carga tolerante');
});

test('los historiales que las reglas rechazarían se descartan antes de escribir (sin reintentos de a uno) y no se redibuja durante la carga', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await page.click('[data-teamv="dat"]');
  page.on('dialog', d => d.accept());
  const r = await page.evaluate(async () => {
    const my = me.email.toLowerCase();
    await db.collection('lhlog').doc('ya').set({ t: 1, by: my, items: [] });
    await db.collection('mver').doc('v1').set({ t: 1 });
    const sets = []; const bw = window.batchWrites; window.batchWrites = async (w, p) => { w.forEach(x => sets.push(x[0] + '/' + x[1])); return bw(w, p); };
    let busy = 0; const rr = window.render; window.render = (...a) => { if (IMPORTING) busy++; return rr(...a); };
    const data = { formato: 'lps911-v2', colecciones: {
      lhlog: { ya: { t: 1, by: my, items: [] }, nuevo: { t: 2, by: my, items: [] }, ajeno: { t: 3, by: 'otro@obra.pe', items: [] } },
      mver: { v1: { t: 1 }, v2: { t: 2 } },
      sectors: { sy: { pisoId: 'p1', code: 'SY', name: 'Sector Y', order: 9 } } } };
    await importJson({ text: async () => JSON.stringify(data) });
    return { sets, busy, importing: IMPORTING };
  });
  expect(r.sets.sort()).toEqual(['lhlog/nuevo', 'mver/v2', 'sectors/sy']);
  expect(r.busy).toBe(0);
  expect(r.importing).toBe(false);
  await expect(page.locator('#impmsg')).toContainText('lhlog: 2');
  noErrors(errors, 'carga sin reintentos');
});

test('copia de prueba: un tareo publicado del respaldo se carga como revisado (sin pubV); en producción no se toca', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await page.click('[data-teamv="dat"]');
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('PRODUCCIÓN') : d.accept());
  const load = env => page.evaluate(async env => {
    window.LPS_ENV = env;
    const data = { formato: 'lps911-v2', colecciones: { tareo: {
      ['2026-10-20_c1_' + env]: { date: '2026-10-20', cap: 'c1', st: 'pub', pubV: 2, rows: {}, hist: [] },
      ['2026-10-21_c1_' + env]: { date: '2026-10-21', cap: 'c1', st: 'env', rows: {}, hist: [] } } } };
    await importJson({ text: async () => JSON.stringify(data) });
  }, env);
  await load('pruebas');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tareo', '2026-10-20_c1_pruebas'))).toBeTruthy();
  const t = await page.evaluate(() => window.__dbGet('tareo', '2026-10-20_c1_pruebas'));
  expect(t.st).toBe('rev'); expect('pubV' in t).toBe(false);
  expect((await page.evaluate(() => window.__dbGet('tareo', '2026-10-21_c1_pruebas'))).st).toBe('env');
  await expect(page.locator('#impmsg')).toContainText('1 tareos que estaban publicados');
  await load('produccion');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tareo', '2026-10-20_c1_produccion'))).toBeTruthy();
  expect((await page.evaluate(() => window.__dbGet('tareo', '2026-10-20_c1_produccion'))).st).toBe('pub');
  noErrors(errors, 'tareo publicado en prueba');
});
