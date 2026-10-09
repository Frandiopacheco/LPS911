// Especialidades (js/especialidades.js): una lista en Configuración; cada SC tiene una; el catálogo toma la de su SC; renombrar se ve en todo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';

const EXTRA = [
  ['contractors', 'c2', { name: 'SC ELECTRICAS', partida: 'IIEE', esp: 'Instalaciones eléctricas', color: '#aa6633' }],
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', esp: 'Instalaciones sanitarias', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Rociadores', sc: 'c1', cl: 't', esp: 'Agua contra incendio', al: ['rociadores'], ord: 20 }],
  ['mcat', 'k3', { name: 'Montantes', sc: 'c1', cl: 't', esp: 'Instalaciones sanitarias', al: ['montantes'], ord: 30 }],
];
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);

test('registrar la lista, renombrar en Configuración y verlo en el catálogo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg', extra: EXTRA });
  page.on('dialog', d => d.accept());
  await expect(page.locator('#espcard')).toContainText('Instalaciones eléctricas');
  // c1 tiene dos especialidades en el catálogo antiguo: aviso para separarlo
  await expect(page.locator('select[data-c="c1"][data-f="esp"] + small')).toContainText('Instalaciones sanitarias (2)');
  await page.click('#espmig');
  await expect.poll(async () => Object.keys((await get(page, 'meta', 'project')).esps || {}).length).toBeGreaterThan(5);
  const M = (await get(page, 'meta', 'project')).esps;
  const idOf = n => Object.keys(M).find(k => M[k].n === n);
  expect((await get(page, 'contractors', 'c2')).esp).toBe(idOf('Instalaciones eléctricas'));
  expect((await get(page, 'contractors', 'c1')).esp).toBe(idOf('Instalaciones sanitarias'));
  // renombrar: un solo cambio
  const inp = page.locator(`[data-esn="${idOf('Instalaciones sanitarias')}"]`);
  await inp.fill('IISS');
  await inp.press('Enter');
  await expect.poll(async () => (await get(page, 'meta', 'project')).esps[idOf('Instalaciones sanitarias')].n).toBe('IISS');
  await openTab(page, 'mat');
  await page.click('[data-mxv="cat"]');
  await expect(page.locator('tr[data-mcid="k2"] [data-l="Especialidad"]')).toHaveText('IISS');
  await expect(page.locator('select[data-mcf="esp"]')).toHaveCount(0);
  noErrors(errors, 'especialidades');
});

test('nueva especialidad desde el subcontratista (sin duplicar) y fusionar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg', extra: [...EXTRA, ['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', esps: { e1: { n: 'Agua contra incendio' }, e2: { n: 'ACI' } } }]] });
  page.once('dialog', d => d.accept('agua contra  INCENDIO'));
  await page.selectOption('select[data-c="c3"][data-f="esp"]', '__new');
  await expect.poll(async () => (await get(page, 'contractors', 'c3')).esp).toBe('e1');
  await page.selectOption('select[data-c="c2"][data-f="esp"]', 'e2');
  await expect.poll(async () => (await get(page, 'contractors', 'c2')).esp).toBe('e2');
  await page.click('[data-esm="e2"]');
  await page.click('#pop [data-do="fus"]');
  await page.selectOption('#espfb', 'e1');
  await page.click('#espfok');
  await expect.poll(async () => (await get(page, 'contractors', 'c2')).esp).toBe('e1');
  expect((await get(page, 'meta', 'project')).esps.e2.fus).toBe('e1');
  noErrors(errors, 'nueva/fusionar');
});
