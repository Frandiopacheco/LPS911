// Correcciones aprobadas del informe externo «Plan diario y modo reunión» (puntos 2, 5, 6, 9, 11 y dudas 1 y 2).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const pdz = page => page.evaluate(() => Object.values(window.__dbAll('pdz')));
const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const rec = (page, d, id) => page.evaluate(([d, id]) => ((window.__dbGet('daily', d + '_p1') || {}).recs || {})[id] || null, [d, id]);

test('2 y 9 · «Vuelve a ir» devuelve el registro, las fechas y las cantidades de antes', async ({ page }) => {
  // e0 ya tenía cantidad mañana; hoy tenía un avance parcial con nota
  const E0 = ['acts', 'e0', { ambId: 'a1', sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, days: [HOY, MANANA], qty: { [HOY]: 20, [MANANA]: 20 }, order: 2 }];
  const D = ['daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs: { e0: { status: 'partial', exec: 5, prog: 20, cnc: 'Materiales', note: 'Faltó tubo', sc: 'c2', by: 'campo@obra.pe' } } }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, E0, D] });
  await page.click('#wtoday');
  const r = page.locator('#mpanel .mp-it[data-act="e0"]');
  await r.locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nv="per"]').click();
  await page.fill('#nvd', MANANA); // reprogramar al día que ya tenía cantidad
  await page.locator('#pop [data-do="ok"]').click();
  await expect.poll(async () => (await act(page, 'e0')).qty[MANANA]).toBeGreaterThan(20);
  await r.locator('[data-undo]').click();
  await expect.poll(async () => (await act(page, 'e0')).qty).toEqual({ [HOY]: 20, [MANANA]: 20 }); // no se perdió el día que ya existía
  await expect.poll(async () => { const x = await rec(page, HOY, 'e0'); return [x.status, x.exec, x.note]; }).toEqual(['partial', 5, 'Faltó tubo']);
  noErrors(errors, 'vuelve a ir');
});

test('5 · el SC no ve «Vuelve a ir» en un «No va hoy» que decidió el ingeniero', async ({ page }) => {
  const N = ['pdz', 'nvE', { date: HOY, pisoId: 'p1', sc: 'c1', kind: 'nova', actId: 'i0', ambId: 'a1', motivo: 'Clima', eng: true, by: 'frandiopacheco@gmail.com', ts: 1 }];
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, N] });
  await page.click('#wtoday');
  await expect(page.locator('#mpanel .mp-it[data-act="i0"]')).toContainText('No va');
  await expect(page.locator('#mpanel .mp-it[data-act="i0"] [data-undo]')).toHaveCount(0);
  noErrors(errors, 'sc no deshace');
});

test('6 · corregir de «Cumplido» a «No» quita la cantidad que se había completado sola', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday');
  await page.evaluate(d => { const x = S.act.get('e0'); writeDaily(d, 'p1', { recs: { e0: { ...baseRec(d, x, null), status: 'ok' } } }); }, HOY);
  await page.click('#mmeetb');
  await page.locator('#mstage .pvl.nb').filter({ hasText: '1' }).first().click();
  await page.locator('#mzc [data-zcs="no"]').click();
  await page.locator('#mzc .zcq [data-zcc="0"]').click();
  await expect.poll(async () => { const x = await rec(page, HOY, 'e0'); return [x.status, x.exec ?? null]; }).toEqual(['no', null]);
  noErrors(errors, 'ok a no');
});

test('11 · la zona dibujada no sigue en el día si la actividad se movió en el lookahead', async ({ page }) => {
  const Z = ['pdz', 'pzE', { date: MANANA, pisoId: 'p1', vista: 'L1', sc: 'c2', kind: 'zona', pts: [120, 120, 200, 120, 200, 200, 120, 200], actId: 'e0', ambId: 'a1', by: 'admin', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, Z] });
  await expect(page.locator('#mstage [data-z="pzE"]').first()).toBeAttached();
  const otro = await page.evaluate(d => wshift(d, 3), MANANA);
  await page.evaluate(([h, o]) => window.firebase.firestore().collection('acts').doc('e0').update({ days: [h, o] }), [HOY, otro]);
  await expect(page.locator('#mstage [data-z="pzE"]')).toHaveCount(0);
  expect(await page.evaluate(() => 'pzE' in window.__dbAll('pdz'))).toBe(true); // no se borró: queda en su historial
  noErrors(errors, 'zona movida');
});

test('duda 1 · en un piso con responsable, otro ingeniero no publica ni decide', async ({ page }) => {
  const R = ['members', 'resp@obra.pe', { role: 'editor', name: 'Responsable P1', pisos: ['p1'] }];
  const ED = ['members', 'editor@obra.pe', { role: 'editor', name: 'Elena Editora', pisos: ['p2'] }]; // ella está a cargo de otro piso
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, R, ED] });
  await expect(page.locator('#mpanel .mp-h')).toBeVisible();
  await expect(page.locator('#mpanel [data-pub]')).toHaveCount(0);
  noErrors(errors, 'responsable');
});

test('duda 2 · publicar tarde deja el día como no cumplido', async ({ page }) => {
  const D = ['pdz', 'pzD', { date: HOY, pisoId: 'p1', sc: 'c2', kind: 'nova', actId: 'e0', ambId: 'a1', motivo: 'Sin personal', k: 'per', repTo: MANANA, tren: 0, draft: true, ids: ['e0'], shift: 1, by: 'admin', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, D] });
  await page.click('#wtoday');
  await page.locator('#mpanel [data-pub]').click(); await page.locator('#pop [data-do="si"]').click();
  await expect.poll(async () => (await rec(page, HOY, 'e0'))?.status).toBe('no');
  noErrors(errors, 'publicar tarde');
});
