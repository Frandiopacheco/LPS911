// Cargar datos desde archivo: si las reglas rechazan algunos registros (historiales de otras personas), se saltan esos y se carga el resto.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('un rechazo de permisos en un historial no detiene la carga del respaldo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
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
