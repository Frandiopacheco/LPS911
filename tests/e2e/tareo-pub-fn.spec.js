// F3: la función publicarTareo simulada en el Firebase falso con la lógica real de functions/tpub.js (window.TPUB).
// Sirve de contrato para las pantallas (Publicación y Costos): forma de la respuesta de previa/publicar/rectificar.
import { test, expect } from '@playwright/test';
import { openApp, HOY } from './helpers.js';

const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const ficha = (dni, ape) => ({ dni, ape, nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', cap: 'tcap@obra.pe', ing: '2026-01-01', ces: '', act: true });
const extra = [
  ['tper', '11111111', ficha('11111111', 'ALFA')],
  ['tper', '22222222', ficha('22222222', 'BETA')],
  ['tper', '33333333', ficha('33333333', 'GAMA')],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado', und: 'm2', ua: 'CD1', act: true }],
  ['tareo', HOY + '_tcap@obra.pe', { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'rev', modo: 'hrs', pcs: ['p10_05'], cfg: CFG, foto: ['f1'], cotFot: ['f1'],
    cot: { 11111111: { fir: true }, 22222222: { fir: true } }, envN: 1, revBy: 'tasis@obra.pe', revAt: 1, hist: [],
    rows: { 11111111: { ape: 'ALFA', nom: 'JUAN', as: true, h: { p10_05: 10 } }, 22222222: { ape: 'BETA', nom: 'JUAN', as: true, h: { p10_05: 8.5 }, alt: true } } }],
];
const call = (page, data) => page.evaluate(async d => {
  try { return { data: (await firebase.functions().httpsCallable('publicarTareo')(d)).data }; } catch (e) { return { code: e.code, message: e.message }; }
}, data);

test('publicarTareo (falso): previa, publicar, rectificar y v2 con la lógica del servidor', async ({ page }) => {
  await openApp(page, { as: 'jefe', extra, editar: false });
  let r = await call(page, { accion: 'previa', fecha: HOY });
  expect(r.data.ok).toBe(false);
  expect(r.data.bloqueos.map(b => [b.k, b.dni])).toEqual([['cob', '33333333']]);
  expect(r.data.resumen).toMatchObject({ obreros: 2, pres: 2, hh: 18.5, he: 1.5, alt: 1, sinTareo: 1 });
  expect(await page.evaluate(() => Object.keys(window.__dbAll('tpub')).length)).toBe(0);
  // con la excepción, la previa queda limpia y publicar escribe
  r = await call(page, { accion: 'previa', fecha: HOY, excepciones: { 33333333: 'Vacaciones' } });
  expect(r.data.ok).toBe(true);
  const firma = r.data.firma;
  r = await call(page, { accion: 'publicar', fecha: HOY, excepciones: { 33333333: 'Vacaciones' }, firma });
  expect(r.data).toMatchObject({ ok: true, v: 1, id: HOY + '_v1', n: 1 });
  const pub = await page.evaluate(f => window.__dbGet('tpub', f + '_v1'), HOY);
  expect(pub.exc).toEqual({ 33333333: { motivo: 'Vacaciones', ape: 'GAMA', nom: 'JUAN' } });
  expect(pub.rows.map(x => [x.dni, x.trab, x.ext])).toEqual([['11111111', 10, 1.5], ['22222222', 8.5, 0]]);
  const t = await page.evaluate(f => window.__dbGet('tareo', f + '_tcap@obra.pe'), HOY);
  expect([t.st, t.pubV, t.hist.at(-1).a]).toEqual(['pub', 1, 'pub']);
  expect(await page.evaluate(f => window.__dbGet('tpubidx', f), HOY)).toMatchObject({ v: 1, abierto: null });
  // otra publicación sin motivo: error; firma vieja: cambió
  r = await call(page, { accion: 'publicar', fecha: HOY, excepciones: { 33333333: 'Vacaciones' }, motivo: 'x', firma });
  expect(r.code).toBe('functions/aborted');
  // rectificar → el tareo vuelve a revisado; la v1 sigue vigente
  r = await call(page, { accion: 'rectificar', fecha: HOY, motivo: 'Horas de ALFA' });
  expect(r.data).toMatchObject({ ok: true, v: 1, n: 1 });
  expect((await page.evaluate(f => window.__dbGet('tareo', f + '_tcap@obra.pe'), HOY)).st).toBe('rev');
  r = await call(page, { accion: 'publicar', fecha: HOY, excepciones: { 33333333: 'Vacaciones' } });
  expect(r.code).toBe('functions/invalid-argument');
  r = await call(page, { accion: 'publicar', fecha: HOY, excepciones: { 33333333: 'Vacaciones' }, motivo: 'Horas de ALFA' });
  expect(r.data).toMatchObject({ ok: true, v: 2 });
  expect(r.data.dif.n).toBe(0);
  expect((await page.evaluate(f => window.__dbGet('tpubidx', f), HOY)).vers.map(x => x.v)).toEqual([1, 2]);
});

test('publicarTareo (falso): solo admin o editor con tpub', async ({ page }) => {
  await openApp(page, { as: 'tasis', extra, editar: false });
  const r = await call(page, { accion: 'previa', fecha: HOY });
  expect(r.code).toBe('functions/permission-denied');
});
