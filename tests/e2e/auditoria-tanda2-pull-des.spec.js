// Tanda 2 (frente F): C-19 la sesión pull mueve el metrado por día con sus días; C-22 «Desglosar» no toca lo comprometido
// (semana congelada o plan diario publicado) y, cuando se permite, la primera parte conserva la fila y las demás quedan sin días.
// Hoy = 1-oct-2026 (jue, semana 58; la 59 va del 5 al 11-oct).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test.describe.configure({ timeout: 150_000 });
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);
// sin el recordatorio de respaldo del administrador (sale a los 4 s y tapa el aviso con «Deshacer»)
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem('lps911.bkr', JSON.stringify(Date.now() + 864e8)); } catch (e) {} }); });
const all = (page, c) => page.evaluate(c => Object.entries(window.__dbAll(c)).map(([id, v]) => ({ id, ...v })), c);

/* ================= C-19 (CON-06) ================= */
test('C-19 · aplicar una sesión pull mueve el metrado junto con los días (sin metrado huérfano ni perdido)', async ({ page }) => {
  const T0 = ['acts', 't0', { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-06', '2026-10-07'], qty: { '2026-10-06': 25, '2026-10-07': 35 }, order: 30 }];
  const errors = await openApp(page, { extra: [T0] });
  await page.evaluate(() => { U.piso = 'p1'; goTab('pull'); });
  await page.locator('[data-pu="new"]').first().click();
  await page.locator('#punom').fill('Prueba pull qty');
  await page.locator('[data-puamb="a1"]').click();
  await page.locator('[data-pu="create"]').click();
  await expect(page.locator('.pup[data-pid="t0"]')).toHaveCount(1);
  /* mover el pósit 2 días con los botones del panel (antes se arrastraba con el puntero y en GitHub fallaba a veces bajo carga) */
  await page.locator('.pup[data-pid="t0"]').click();
  await page.locator('[data-pud="1"]').click();
  await page.locator('[data-pud="1"]').click();
  const sid = await page.evaluate(() => PU.sid);
  await expect.poll(() => page.evaluate(id => window.__dbGet('pull', id).ps.t0.d0, sid)).not.toBe('2026-10-06');
  await page.locator('[data-pu="rev"]').click();
  await page.locator('[data-pu="apply"]').click();
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__dbGet('acts', 't0').days))).not.toBe(JSON.stringify(['2026-10-06', '2026-10-07']));
  const x = await get(page, 'acts', 't0');
  expect(x.days).toHaveLength(2);
  const huerfanas = Object.keys(x.qty || {}).filter(d => !x.days.includes(d));
  expect(huerfanas, `metrado en fechas que ya no son de la actividad: days=${x.days} qty=${JSON.stringify(x.qty)}`).toEqual([]);
  // el primer día lleva lo del primero y el segundo lo del segundo
  expect(x.days.map(d => x.qty[d])).toEqual([25, 35]);
  noErrors(errors, 'C-19');
});

/* ================= C-22 (CON-07) ================= */
const CAT = [
  ['mcat', 'k5', { name: 'Instalaciones ICR', sc: 'c1', cl: 't', al: ['instalaciones icr'], ord: 50 }],
  ['acts', 'g1', { ambId: 'a1', sc: 'c1', name: 'Instalaciones ICR', und: 'pto', metrado: 10, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 4, '2026-10-06': 6 }, order: 50 }],
  ['acts', 'g2', { ambId: 'a2', sc: 'c1', name: 'Instalaciones ICR', und: 'pto', metrado: 8, days: ['2026-10-08'], order: 50 }],
];
async function abrirDesglose(page) {
  await page.click('[data-mxv="cat"]');
  await page.locator('tr[data-mcid="k5"] [data-mcm]').click();
  await page.click('#pop [data-do="des"]');
  await page.fill('[data-dpn="0"]', 'Bajada para rociadores');
  await page.fill('[data-dpn="1"]', 'Instalación de rociadores');
}

test('C-22 · no se desglosa si una fila tiene días en una semana congelada', async ({ page }) => {
  const W = ['weeks', '59_p1', { n: 59, pisoId: 'p1', frozenAt: '2026-10-03T18:00:00.000Z', items: { g2: { sc: 'c1', amb: 'Dpto 102', act: 'Instalaciones ICR', days: ['2026-10-08'], ord: 1 } }, res: {} }];
  const errors = await openApp(page, { tab: 'mat', extra: [...CAT, W] });
  await abrirDesglose(page);
  await expect(page.locator('#mxdpv')).toContainText('No se puede desglosar');
  await expect(page.locator('#mxdpv')).toContainText('semana 59 congelada');
  await expect(page.locator('#mxdok')).toBeDisabled();
  expect((await get(page, 'mcat', 'k5')).arch).toBeUndefined();
  expect((await get(page, 'acts', 'g1')).name).toBe('Instalaciones ICR');
  noErrors(errors, 'C-22 congelada');
});

test('C-22 · no se desglosa si una fila tiene días en un plan diario publicado', async ({ page }) => {
  const DP = ['dplan', '2026-10-06_p1', { date: '2026-10-06', pisoId: 'p1', ids: { g1: 6 }, at: 1, by: 'editor@obra.pe' }];
  const errors = await openApp(page, { tab: 'mat', extra: [...CAT, DP] });
  await abrirDesglose(page);
  await expect(page.locator('#mxdpv')).toContainText('plan diario publicado del 06');
  await expect(page.locator('#mxdok')).toBeDisabled();
  // aunque se fuerce el botón, no escribe nada
  await page.evaluate(() => { const b = document.getElementById('mxdok'); b.disabled = false; b.click(); });
  await expect(page.locator('#mxdmsg')).toContainText('No se puede desglosar');
  expect((await get(page, 'mcat', 'k5')).arch).toBeUndefined();
  noErrors(errors, 'C-22 publicado');
});

test('C-22 · desglose permitido: la primera parte conserva la fila (id, días, metrado) y las demás quedan sin días; Deshacer la devuelve', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  page.on('dialog', d => d.accept());
  await abrirDesglose(page);
  await expect(page.locator('#mxdpv')).toContainText('la primera parte conserva cada fila');
  await page.click('#mxdok');
  await expect.poll(async () => (await get(page, 'acts', 'g1')).name).toBe('Bajada para rociadores');
  const g1 = await get(page, 'acts', 'g1');
  expect(g1.days).toEqual(['2026-10-05', '2026-10-06']);
  expect(g1.metrado).toBe(10);
  expect(g1.qty).toEqual({ '2026-10-05': 4, '2026-10-06': 6 });
  expect(g1.und).toBe('pto');
  const g2 = await get(page, 'acts', 'g2');
  expect(g2.name).toBe('Bajada para rociadores'); expect(g2.days).toEqual(['2026-10-08']); expect(g2.metrado).toBe(8);
  const otras = (await all(page, 'acts')).filter(x => !x.arch && x.name === 'Instalación de rociadores');
  expect(otras.map(x => x.ambId).sort()).toEqual(['a1', 'a2']);
  otras.forEach(x => { expect(x.days).toEqual([]); expect(x.metrado).toBeNull(); });
  // Deshacer: la fila vuelve a su nombre con el mismo metrado; las partes agregadas se archivan
  await expect(page.locator('#toast')).toContainText('desglosada');
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'acts', 'g1')).name).toBe('Instalaciones ICR');
  const g1b = await get(page, 'acts', 'g1');
  expect(g1b.metrado).toBe(10); expect(g1b.qty).toEqual({ '2026-10-05': 4, '2026-10-06': 6 });
  await expect.poll(async () => (await all(page, 'acts')).filter(x => !x.arch && x.name === 'Instalación de rociadores').length).toBe(0);
  noErrors(errors, 'C-22 permitido');
});
