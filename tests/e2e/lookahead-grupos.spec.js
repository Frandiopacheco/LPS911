// Grupos de especialidades (js/grupos.js): en el Lookahead se ve un grupo a la vez; los otros quedan en una fila resumen por
// ambiente (se despliega al tocarla); el Asistente muestra lo pendiente del grupo; Matriz y Tablero eligen los SC del grupo.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const PROJ = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28',
  esps: { e1: { n: 'Instalaciones sanitarias' }, e2: { n: 'Instalaciones eléctricas' }, e3: { n: 'Arquitectura' } } };
const EXTRA = [
  ['meta', 'project', PROJ],
  ['contractors', 'c1', { name: 'SC SANITARIAS', partida: 'IISS', color: '#336699', esp: 'e1' }],
  ['contractors', 'c2', { name: 'SC ELECTRICAS', partida: 'IIEE', color: '#aa6633', esp: 'e2' }],
  ['contractors', 'c3', { name: 'SC TARRAJEO', partida: 'Tarrajeo', color: '#558855', esp: 'e3' }],
];
const CAT = [
  ['mcat', 'k3', { name: 'Pintura', sc: 'c3', cl: 't', al: ['pintura'], ord: 30 }],
  ['mcat', 'k8', { name: 'Prueba de redes', sc: 'c1', cl: 't', al: ['prueba de redes'], ord: 80 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k3', 'k8'], order: 10 }],
  ['mamb', 'a3', { tipo: 'tp1', by: 'x', t: 1 }],
];
const row = (page, id) => page.locator(`#grid tr[data-a="${id}"]`);

test('Lookahead: un grupo a la vez, los otros en una fila resumen que se despliega', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: EXTRA });
  await page.evaluate(() => { U.piso = ''; U.grp = ''; render(); });
  await expect(page.locator('#fgrp [data-grp]')).toHaveText(['Todos', 'Arquitectura', 'Instalaciones']);
  await page.click('#fgrp [data-grp="arq"]');
  await expect(row(page, 't0')).toBeVisible();
  await expect(row(page, 'i0')).toHaveCount(0);
  await expect(row(page, 'e0')).toHaveCount(0);
  // leyenda: solo los SC del grupo
  await expect(page.locator('#legend .chip')).toHaveText([/SC TARRAJEO/]);
  // fila resumen: las dos actividades de instalaciones del ambiente, y el día en que coinciden se ve más oscuro
  const og = page.locator('#grid tr[data-og="a1|ins"]');
  await expect(og).toContainText('Instalaciones');
  await expect(og).toContainText('2 actividades');
  await expect(og.locator('td.ogo.og2')).toHaveCount(1);
  expect(await page.evaluate(() => store.get('ui', {}).grp)).toBe('arq'); // se recuerda en este equipo
  // desplegar y volver a plegar
  await og.locator('.lkogb').click();
  await expect(row(page, 'i0')).toHaveClass(/ogx/);
  await expect(row(page, 'e0')).toBeVisible();
  await expect(row(page, 'i1')).toHaveCount(0); // solo ese ambiente
  await page.locator('#grid tr[data-og="a1|ins"] .lkogb').click();
  await expect(row(page, 'i0')).toHaveCount(0);
  // el otro grupo, al revés; «Todos» lo deja como antes
  await page.click('#fgrp [data-grp="ins"]');
  await expect(row(page, 'i0')).toBeVisible();
  await expect(row(page, 't0')).toHaveCount(0);
  await expect(page.locator('#grid tr[data-og="a1|arq"]')).toContainText('1 actividad');
  await page.click('#fgrp [data-grp=""]');
  await expect(row(page, 't0')).toBeVisible();
  await expect(row(page, 'i0')).toBeVisible();
  await expect(page.locator('#grid tr[data-og]')).toHaveCount(0);
  noErrors(errors, 'grupos lookahead');
});

test('«Ver en el lookahead» de una actividad de otro grupo despliega su fila resumen', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: EXTRA });
  await page.evaluate(() => { U.piso = ''; U.grp = 'arq'; render(); });
  await expect(row(page, 'i0')).toHaveCount(0);
  await page.evaluate(() => gotoAct('i0'));
  await expect(row(page, 'i0')).toBeVisible();
  expect(await page.evaluate(() => U.grp)).toBe('arq');
  noErrors(errors, 'grupos gotoAct');
});

test('Asistente con grupo: las filas fantasma son solo las del grupo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...EXTRA, ...CAT] });
  await page.evaluate(() => { U.piso = ''; U.lkGh = true; U.grp = 'arq'; render(); });
  await expect(page.locator('#grid tr[data-gh="a3|k3"]')).toBeVisible();
  await expect(page.locator('#grid tr[data-gh="a3|k8"]')).toHaveCount(0);
  await page.click('#fgrp [data-grp="ins"]');
  await expect(page.locator('#grid tr[data-gh="a3|k8"]')).toBeVisible();
  await expect(page.locator('#grid tr[data-gh="a3|k3"]')).toHaveCount(0);
  // programar desde la fila fantasma sigue igual
  await page.locator('#grid tr[data-gh="a3|k8"] td.d[data-d="2026-10-05"]').click();
  await expect.poll(() => page.evaluate(() => [...S.act.values()].filter(x => x.ambId === 'a3' && x.name === 'Prueba de redes').map(x => x.days))).toEqual([['2026-10-05']]);
  noErrors(errors, 'grupos asistente');
});

test('Configuración, Matriz y Tablero: grupo de cada especialidad y elegir los SC de un grupo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg', extra: [...EXTRA, ...CAT] });
  await page.click('[data-cfgv="esp"]');
  // sin elegir: sugerido por el nombre
  await expect(page.locator('select[data-esg="e3"] option:checked')).toHaveText('Arquitectura (sugerido)');
  await page.selectOption('select[data-esg="e3"]', 'otr');
  await expect.poll(() => page.evaluate(() => __dbGet('meta', 'project').esps.e3.g)).toBe('otr');
  expect(await page.evaluate(() => scGrp('c3'))).toBe('otr');
  await page.selectOption('select[data-esg="e3"]', '');
  await expect.poll(() => page.evaluate(() => __dbGet('meta', 'project').esps.e3.g)).toBeUndefined();
  // Matriz: el grupo elige sus SC del catálogo
  await page.evaluate(() => { U.piso = ''; goTab('mat'); });
  await page.click('#mxscdd');
  await page.click('#pop [data-mxsg="ins"]');
  expect(await page.evaluate(() => U.mxSc)).toEqual(['c1']);
  // Tablero
  await page.evaluate(() => goTab('dash'));
  await page.click('#dscdd');
  await page.click('#pop [data-dsg="ins"]');
  expect(await page.evaluate(() => [...DB_.sc].sort())).toEqual(['c1', 'c2']);
  await expect(page.locator('#dscdd')).toContainText('Instalaciones');
  noErrors(errors, 'grupos config');
});
