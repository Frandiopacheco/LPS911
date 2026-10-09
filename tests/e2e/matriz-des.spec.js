// Desglosar una actividad genérica del catálogo (js/matriz-des.js): catálogo, tipos, matriz y lookahead; restaurar lo deshace.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k5', { name: 'Instalaciones ICR', sc: 'c1', cl: 't', al: ['instalaciones icr'], ord: 50 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k5', 'k1'], order: 10 }],
  ['mamb', 'a1', { tipo: 'tp1', c: { k5: 'c' }, by: 'x', t: 1 }],
  // g1: un día pasado (queda con el nombre antiguo) y dos futuros (pasan a las partes); g2: solo futuros (se renombra)
  ['acts', 'g1', { ambId: 'a1', sc: 'c1', name: 'Instalaciones ICR', und: 'glb', metrado: 1, days: ['2026-09-29', '2026-10-05', '2026-10-06'], order: 50 }],
  ['acts', 'g2', { ambId: 'a2', sc: 'c1', name: 'Instalaciones ICR', und: 'glb', metrado: 1, days: ['2026-10-06'], order: 50 }],
];
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);
const all = (page, c) => page.evaluate(c => window.__dbAll(c), c);
const row = (page, id) => page.locator(`tr[data-mcid="${id}"]`);

test('desglosar: catálogo, tipo, matriz y lookahead (solo días reprogramables); Deshacer lo restaura', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.click('[data-mxv="cat"]');
  await row(page, 'k5').locator('[data-mcm]').click();
  await page.click('#pop [data-do="des"]');
  await page.fill('[data-dpn="0"]', 'Bajada para rociadores');
  await page.fill('[data-dpn="1"]', 'Instalación de rociadores');
  await page.fill('[data-dpn="2"]', 'redes empotradas'); // ya existe: se usa k1
  await expect(page.locator('#mxdpv')).toContainText('2 filas');
  await expect(page.locator('#mxdpv')).toContainText('1 ya existía');
  await page.click('#mxdok');

  await expect.poll(async () => !!((await get(page, 'mcat', 'k5')).arch || {}).des).toBe(true);
  const des = (await get(page, 'mcat', 'k5')).arch.des;
  expect(des.parts).toHaveLength(3);
  expect(des.parts[2]).toBe('k1');
  const [p1, p2] = des.created;
  expect((await get(page, 'mcat', p1)).name).toBe('Bajada para rociadores');
  // tipo: la genérica se reemplaza en su lugar (k1 ya estaba)
  expect((await get(page, 'mtipo', 'tp1')).acts).toEqual([p1, p2, 'k1']);
  // matriz: el estado confirmado pasa a cada parte
  const c = (await get(page, 'mamb', 'a1')).c;
  expect(c[p1]).toBe('c'); expect(c[p2]).toBe('c'); expect(c.k1).toBe('c'); expect(c.k5).toBe('c');
  // lookahead: g1 conserva el día pasado con su nombre; g2 se renombra a la primera parte
  await expect.poll(async () => (await get(page, 'acts', 'g1')).days).toEqual(['2026-09-29']);
  expect((await get(page, 'acts', 'g1')).name).toBe('Instalaciones ICR');
  const g2 = await get(page, 'acts', 'g2');
  expect(g2.name).toBe('Bajada para rociadores'); expect(g2.days).toEqual(['2026-10-06']);
  const acts = Object.values(await all(page, 'acts'));
  const a1 = acts.filter(x => x.ambId === 'a1' && !x.arch && x.name !== 'Instalaciones ICR' && x.days && x.days.includes('2026-10-05'));
  expect(a1.map(x => x.name).sort()).toEqual(['Bajada para rociadores', 'Instalación de rociadores', 'Redes empotradas']);
  a1.forEach(x => expect(x.days).toEqual(['2026-10-05', '2026-10-06']));
  expect(acts.filter(x => x.ambId === 'a2' && x.sc === 'c1' && !x.arch && x.days && x.days.includes('2026-10-06')).length).toBe(3);

  // Deshacer (aviso): vuelve todo
  await page.click('#toast button');
  await expect.poll(async () => (await get(page, 'mcat', 'k5')).arch).toBeFalsy();
  await expect.poll(async () => (await get(page, 'acts', 'g1')).days).toEqual(['2026-09-29', '2026-10-05', '2026-10-06']);
  expect((await get(page, 'acts', 'g2')).name).toBe('Instalaciones ICR');
  expect((await get(page, 'mtipo', 'tp1')).acts).toEqual(['k5', 'k1']);
  const c2 = (await get(page, 'mamb', 'a1')).c;
  expect(c2[p1]).toBeUndefined(); expect(c2.k5).toBe('c');
  expect((await get(page, 'mcat', p1)).arch).toBeTruthy();
  const left = Object.values(await all(page, 'acts')).filter(x => x.ambId === 'a1' && !x.arch && x.days && x.days.includes('2026-10-05'));
  expect(left.map(x => x.name)).toEqual(['Instalaciones ICR']);
  noErrors(errors, 'desglosar');
});

test('posibles por desglosar: lista las genéricas y «Está bien así» la quita; el editor no desglosa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await expect(page.locator('#mxdlist')).toContainText('(1)');
  await page.click('#mxdlist');
  await expect(page.locator('#lqm')).toContainText('Instalaciones ICR');
  await expect(page.locator('#lqm')).toContainText('Nombre general');
  await page.click('[data-mxdok="k5"]');
  await expect.poll(async () => !!(await get(page, 'mcat', 'k5')).okd).toBe(true);
  await expect(page.locator('#lqm')).toContainText('No hay actividades');
  noErrors(errors, 'posibles');
});

test('editor: ve la lista pero no el botón Desglosar', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: CAT });
  await page.click('[data-mxv="cat"]');
  await row(page, 'k5').locator('[data-mcm]').click();
  await expect(page.locator('#pop [data-do="des"]')).toHaveCount(0);
  noErrors(errors, 'editor');
});
