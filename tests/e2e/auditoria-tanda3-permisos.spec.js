// Tanda 3 de correcciones (frente G: permisos). Hoy = 1-oct-2026 (jue, semana 58); el plan diario abre en mañana (2-oct).
// PER-4: el editor que no es responsable del piso no ve Va / No va / Culminado en el Plan diario (las reglas se los rechazan).
// PER-5: el SC ve en solo lectura su no programado ya verificado. PER-9: con las propuestas cerradas, el Plan diario del SC no
// dice «quedó como propuesta». PER-6: el Excel del PPC que exporta un SC lleva solo su partida. PER-7: la ficha de restricciones
// de filas de otras partidas no le muestra al SC descripción, responsable ni quién la registró.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { LAMINA } from './lamina.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);

test('PER-4 · el editor que no es responsable del piso ve el plan del día sin Va / No va / Culminado', async ({ page }) => {
  /* jefe@obra.pe es editor, pero P1 tiene responsable (Elena Editora) */
  const errors = await openApp(page, { as: 'jefe', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await expect(row(page, 'e1')).toBeVisible();
  await expect(row(page, 'e1').locator('[data-dv]')).toHaveCount(0);
  await expect(page.locator('#mpanel .dzresp').first()).toContainText('Elena Editora');
  noErrors(errors, 'PER-4 no responsable');
});

test('PER-4 · el responsable del piso sí decide (Va / No va / Culminado)', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await expect(row(page, 'e1').locator('[data-dv^="no"]')).toBeVisible();
  await expect(page.locator('#mpanel .dzresp')).toHaveCount(0);
  noErrors(errors, 'PER-4 responsable');
});

test('PER-9 · SC con las propuestas cerradas: el Plan diario lo explica y no guarda nada', async ({ page }) => {
  const W = ['meta', 'propwin', { closeAt: Date.parse('2026-09-26T13:00:00-05:00') }];
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, W] });
  await page.locator('#dzadd').click();
  await page.locator('#pop [data-do^="a"]').first().click();
  await expect(page.locator('#toast')).toContainText('Las propuestas están cerradas');
  await expect(page.locator('#toast')).not.toContainText('quedó como propuesta');
  const items = await page.evaluate(() => Object.values((window.__dbGet('lhprop', 'c1') || {}).items || {}).filter(Boolean));
  expect(items).toEqual([]);
  noErrors(errors, 'PER-9');
});

test('PER-5 · el SC ve en solo lectura su no programado ya verificado', async ({ page }) => {
  const base = { date: HOY, pisoId: 'p1', ambId: 'a2', sc: 'c1', desc: 'Picado de muro', und: '', exec: null, note: '', photos: [], pt: null, by: 'sc@obra.pe', byName: 'Sandra', ts: 2, scProp: true };
  const errors = await openApp(page, { as: 'sc', extra: [
    ['nprog', 'nv', { ...base, ver: { by: 'campo@obra.pe', n: 'Carlos Campo', t: 3 } }],
    ['nprog', 'np', { ...base, desc: 'Resane' }]] });
  await page.evaluate(() => { ensureNP('2026-09-01'); });
  await expect.poll(() => page.evaluate(() => NPM.has('nv') && NPM.has('np'))).toBe(true);
  await page.evaluate(() => npOpen('nv'));
  const sh = page.locator('#npsheet');
  await expect(sh).toContainText('Ya lo verificó el ingeniero');
  await expect(sh.locator('[data-npa="save"]')).toHaveCount(0);
  await expect(sh.locator('[data-npa="del"]')).toHaveCount(0);
  await page.evaluate(() => npClose());
  await page.evaluate(() => npOpen('np'));
  await expect(sh.locator('[data-npa="save"]')).toBeVisible();
  noErrors(errors, 'PER-5');
});

test('PER-6 · el Excel del PPC que exporta un SC lleva solo su partida', async ({ page }) => {
  const WK = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', frozenBy: 'editor@obra.pe',
    items: { i1: { sc: 'c1', act: 'Redes empotradas', code: 'A-2', amb: 'Dpto 102', days: [HOY], ord: 1 },
      e1: { sc: 'c2', act: 'Entubado empotrado', code: 'A-2', amb: 'Dpto 102', days: [HOY], ord: 2 } },
    res: { i1: { ok: true }, e1: { ok: false, cnc: 'Materiales', note: 'No llegó tubería' } } }];
  const vals = async () => page.evaluate(async () => {
    await loadXlsx(); const X = window.XLSX; const out = {};
    for (const [k, ws] of [['sem', ppcSemWs(X, 58)], ['sc', ppcScWs(X, 58)]]) out[k] = ws ? Object.entries(ws).filter(([c]) => !c.startsWith('!')).map(([, o]) => String(o.v)).join('|') : '';
    return out;
  });
  let errors = await openApp(page, { as: 'sc', tab: 'look', extra: [WK] });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await expect.poll(() => page.evaluate(() => !!(S.wk.get('58_p1') || {}).frozenAt)).toBe(true);
  let v = await vals();
  expect(v.sem).toContain('Redes empotradas'); expect(v.sem).not.toContain('Entubado empotrado');
  expect(v.sc).toContain('SC SANITARIAS'); expect(v.sc).not.toContain('SC ELECTRICAS'); expect(v.sc).not.toContain('No llegó tubería');
  noErrors(errors, 'PER-6 sc');
  /* el ingeniero sigue exportando todas las partidas */
  const p2 = await page.context().newPage();
  errors = await openApp(p2, { as: 'editor', tab: 'look', extra: [WK] });
  await p2.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await expect.poll(() => p2.evaluate(() => !!(S.wk.get('58_p1') || {}).frozenAt)).toBe(true);
  v = await p2.evaluate(async () => { await loadXlsx(); const X = window.XLSX; const f = ws => Object.entries(ws).filter(([c]) => !c.startsWith('!')).map(([, o]) => String(o.v)).join('|');
    return { sem: f(ppcSemWs(X, 58)), sc: f(ppcScWs(X, 58)) }; });
  expect(v.sem).toContain('Entubado empotrado'); expect(v.sc).toContain('SC ELECTRICAS'); expect(v.sc).toContain('No llegó tubería');
  noErrors(errors, 'PER-6 editor');
});

test('PER-7 · la ficha ⛔ de otra partida le muestra al SC solo tipo, fecha y estado', async ({ page }) => {
  /* r1 (semilla): Tarrajeo t0 (SC TARRAJEO), «Falta arena fina», la registró el admin. rM: de su partida (i0) */
  const RM = ['restr', 'rM', { actId: 'i0', pisoId: 'p1', type: 'Equipos', desc: 'Falta andamio', resp: 'SC SANITARIAS', need: '2026-10-03', freed: '', status: 'pend', created: HOY, sc: 'c1', by: 'editor@obra.pe', byName: 'Elena Editora' }];
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [RM] });
  const t = await page.evaluate(() => ({ otra: restrTip('t0'), mia: restrTip('i0'), txt: rTxt(S.res.get('r1')) }));
  expect(t.otra).toContain('Materiales'); expect(t.otra).toContain('pendiente');
  for (const s of [t.otra, t.txt]) { expect(s).not.toContain('Falta arena fina'); expect(s).not.toContain('SC TARRAJEO'); expect(s).not.toContain('Frandio'); }
  expect(t.mia).toContain('Falta andamio');
  noErrors(errors, 'PER-7 sc');
  /* el ingeniero ve el detalle completo */
  const p2 = await page.context().newPage();
  await openApp(p2, { as: 'editor', tab: 'look' });
  expect(await p2.evaluate(() => restrTip('t0'))).toContain('Falta arena fina');
});
