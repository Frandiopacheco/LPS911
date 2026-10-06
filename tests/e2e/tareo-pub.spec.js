// Tareo F3 (docs/ia/tareo.md, «Implementación de F3 — pantallas»): «Costos» (días publicados, versión sustituida, detalle y Excel
// con el formato del tareo semanal) y «Publicación» (previa del servidor, bloqueos, excepciones, publicar y rectificar).
// La función publicarTareo se simula dentro de la prueba (respuestas fijas). Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const conExcel = page => page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
async function bajar(page, sel) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  return { name: dl.suggestedFilename(), wb: XLSX.read(readFileSync(await dl.path())) };
}
const aoa = ws => XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
const fila = (A, txt) => A.find(r => r.some(c => typeof c === 'string' && c.includes(txt)));

const T = (f, h) => Date.parse(`${f}T${h}:00-05:00`);
const PCS = {
  p02_01: { cod: '2.01', nom: 'Excavación masiva', und: 'm3', grp: '2', grpN: 'M. Tierras', ua: 'CD1' },
  p10_05: { cod: '10.05', nom: 'Encofrado de muros', und: 'm2', grp: '10', grpN: 'Estructura', ua: 'CD2' },
  p10_10: { cod: '10.10', nom: 'Encofrado de escaleras', und: 'm2', grp: '10', grpN: 'Estructura', ua: 'CD3' },
};
const A = (o = {}) => ({ dni: '40000001', ape: 'ALFA ROJAS', nom: 'JUAN', cat: 'OP', cua: 'CARPINTEROS', cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', as: true, mot: '', alt: false, h: {}, trab: 0, ext: 0, ...o });
const B = (o = {}) => ({ dni: '40000002', ape: 'BETA SOTO', nom: 'LUIS', cat: 'PE', cua: 'ALBAÑILES', cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', as: true, mot: '', alt: false, h: {}, trab: 0, ext: 0, ...o });
const pub = (fecha, v, rows, o = {}) => ['tpub', `${fecha}_v${v}`, { fecha, v, at: T(fecha, '19:0' + v), by: 'jefe@obra.pe', byN: 'Jaime Jefe', motivo: '', ant: v > 1 ? v - 1 : null,
  fuentes: [{ id: `${fecha}_tcap@obra.pe`, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', envN: 1, revBy: 'tasis@obra.pe', revAt: T(fecha, '18:00') }],
  pcs: PCS, rows, exc: {}, tot: null, dif: null, ...o }];
const idx = (fecha, v, o = {}) => ['tpubidx', fecha, { fecha, v, vers: Array.from({ length: v }, (_, i) => ({ v: i + 1, at: T(fecha, '19:0' + (i + 1)), by: 'jefe@obra.pe', motivo: i ? 'Faltaba media hora' : '' })), abierto: null, ...o }];
const DATOS = [
  // lunes 28.09: ALFA 3 + 6 h (0,5 extra, altura), BETA descanso médico, GAMA sin tareo por vacaciones
  pub('2026-09-28', 1, [A({ h: { p02_01: 3, p10_05: 6 }, trab: 9, ext: 0.5, alt: true }), B({ as: false, mot: 'DM' })],
    { exc: { 40000003: { motivo: 'Vacaciones', ape: 'GAMA DIAZ', nom: 'PEDRO' } } }),
  idx('2026-09-28', 1),
  // miércoles 30.09: v1 con 8,5 h, rectificada (v2) a 7 h
  pub('2026-09-30', 1, [A({ h: { p10_05: 8.5 }, trab: 8.5 }), B({ h: { p10_10: 8.5 }, trab: 8.5 })]),
  pub('2026-09-30', 2, [A({ h: { p10_05: 7 }, trab: 7 }), B({ h: { p10_10: 8.5 }, trab: 8.5 })], { motivo: 'Faltaba media hora', dif: ['ALFA ROJAS JUAN: 8,5 → 7 h'] }),
  idx('2026-09-30', 2),
  // jueves 01.10 (hoy): 10 h con 1,5 extra
  pub(HOY, 1, [A({ h: { p10_05: 10 }, trab: 10, ext: 1.5 }), B({ h: { p10_05: 4.5, p10_10: 4 }, trab: 8.5 })]),
  idx(HOY, 1),
];

test('Costos: lista por mes, sustituida, detalle y Excel del día y de la semana', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: DATOS });
  await conExcel(page);
  // costos entra directo a «Costos» (ya no a Tareos del día)
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tcos');
  expect(await page.evaluate(() => [...tabPrimary(), ...tabSecondary()])).toEqual(['tcos', 'tper', 'tpc']);
  await expect(page.locator('#tpkList tr.tp-day')).toHaveCount(1);
  await expect(page.locator('#tpkList')).toContainText('18.5');         // HH del 01.10: 10 + 8,5 (es-PE: punto decimal)
  // setiembre: dos días; el 30.09 con la v2 vigente y la v1 sustituida
  await page.click('#tpkPrev');
  await expect(page.locator('#tpkList tr.tp-day')).toHaveCount(2);
  const d30 = page.locator('#tpkList tr.tp-day[data-tpkf="2026-09-30"]');
  await expect(d30).toContainText('v2 · vigente');
  await expect(d30).toContainText('15.5');
  await expect(page.locator('#tpkList tr.tp-old[data-tpkf="2026-09-30"]')).toContainText('v1 · sustituida');
  // detalle de la v1 (sustituida) y cambio a la v2
  await page.click('#tpkList tr.tp-old [data-tpkv="2026-09-30_v1"]');
  await expect(page.locator('#tpkMeta')).toContainText('(sustituida)');
  await expect(page.locator('#tpkMt tr[data-tpkd="40000001"]')).toContainText('8.5');
  await page.click('#tpkVs [data-tpkdv="2026-09-30_v2"]');
  await expect(page.locator('#tpkMeta')).toContainText('(vigente)');
  await expect(page.locator('#tpkMeta')).toContainText('Faltaba media hora');
  await expect(page.locator('#tpkMt tr[data-tpkd="40000001"]')).toContainText('7');
  await expect(page.locator('#main')).toContainText('ALFA ROJAS JUAN: 8,5 → 7 h');
  // detalle del lunes: partidas usadas, ausentes por motivo y excepciones
  await page.click('#tpkBack');
  await page.click('#tpkList [data-tpkv="2026-09-28_v1"] >> nth=0');
  await expect(page.locator('#tpkMt thead')).toContainText('2.01');
  await expect(page.locator('#tpkMt thead')).not.toContainText('10.10');  // solo las partidas usadas
  await expect(page.locator('#tpkAus')).toContainText('DM · Descanso médico');
  await expect(page.locator('#tpkExc')).toContainText('GAMA DIAZ PEDRO');
  await expect(page.locator('#tpkExc')).toContainText('Vacaciones');
  // Excel de una versión desde el detalle
  const v = await bajar(page, '#tpkXv');
  expect(v.wb.SheetNames).toEqual(['28.09']);
  await page.click('#tpkBack');

  // Excel de la semana (lunes 28.09 – domingo 04.10): Resumen HH, Tareo Semana y una hoja por día publicado
  await page.fill('#tpkXs', '2026-09-30'); await page.locator('#tpkXs').dispatchEvent('change');
  await expect(page.locator('#tpkXsR')).toContainText('28 set');
  const { name, wb } = await bajar(page, '#tpkXsB');
  expect(name).toContain('Tareo_semana_2026-09-28_al_2026-10-04');
  expect(wb.SheetNames).toEqual(['Resumen HH', 'Tareo Semana', '28.09', '30.09', '01.10']);
  // hoja del día: grupos, nombres, códigos, «hrs», horas, totales, extra, (A), motivo y pie con la versión
  const L = aoa(wb.Sheets['28.09']);
  expect(L[2].slice(5, 8)).toEqual(['M. TIERRAS', 'ESTRUCTURA', '']);
  expect(L[3].slice(5, 8)).toEqual(['Excavación masiva', 'Encofrado de muros', 'Encofrado de escaleras']);
  expect(L[4].slice(4, 8)).toEqual(['Código', '2.01', '10.05', '10.10']);
  expect(L[5].slice(0, 8)).toEqual(['N°', 'Personal Obrero', 'CUADRILLA', 'DNI', 'Categoría', 'hrs', 'hrs', 'hrs']);
  expect(L[2][8]).toBe('HORAS TOTALES'); expect(L[2][9]).toMatch(/^HORAS EXTRAS/); expect(L[2][10]).toBe('BONOS');
  expect(wb.Sheets['28.09']['!merges'].some(m => m.s.r === 2 && m.s.c === 6 && m.e.c === 7)).toBe(true); // ESTRUCTURA fusionada sobre sus dos partidas
  const alfa = fila(L, 'ALFA ROJAS JUAN');
  expect(alfa.slice(0, 11)).toEqual([1, 'ALFA ROJAS JUAN', 'CARPINTEROS', '40000001', 'OP', 3, 6, '', 9, 0.5, '(A)']);
  expect(fila(L, 'BETA SOTO LUIS')[11]).toMatch(/^DM/);
  expect(fila(L, 'GAMA DIAZ PEDRO')[11]).toBe('Sin tareo: Vacaciones');
  expect(L.find(r => r[1] === 'TOTAL').slice(5, 11)).toEqual([3, 6, '', 9, 0.5, 1]);
  expect(fila(L, '· publicó').join('')).toMatch(/^Versión publicada v1 · publicó Jaime Jefe/);
  expect(Object.values(wb.Sheets['28.09']).some(c => c && c.f)).toBe(false); // solo valores
  // el 30.09 sale de la versión vigente (v2: 7 h)
  expect(fila(aoa(wb.Sheets['30.09']), 'ALFA ROJAS JUAN')[8]).toBe(7);
  expect(fila(aoa(wb.Sheets['30.09']), '· publicó').join('')).toMatch(/^Versión publicada v2 .*Faltaba media hora/);
  // Resumen HH: HH y HE por día (martes sin publicar), TOTAL HH, HN, HE
  const R = aoa(wb.Sheets['Resumen HH']);
  expect(R[2][4]).toBe('LUNES'); expect(R[2][6]).toBe('MARTES (sin publicar)');
  expect(R[3].slice(0, 6)).toEqual(['N°', 'PERSONAL OBRERO', 'DNI', 'CATEGORIA', '28.09', 'HE']);
  const ra = fila(R, 'ALFA ROJAS JUAN');
  expect(ra.slice(4, 12)).toEqual([9, 0.5, '', '', 7, 0, 10, 1.5]);
  expect(ra.slice(18, 21)).toEqual([26, 24, 2]);
  // Tareo Semana: A / I / código, horas extra y horas de descanso médico (= jornada del día)
  const S = aoa(wb.Sheets['Tareo Semana']);
  expect(S[2][6]).toBe('ASISTENCIA');
  expect(S[3].slice(6, 13)).toEqual(['L', 'M', 'Mi', 'J', 'V', 'S', 'D']);
  const sa = fila(S, 'ALFA ROJAS'), sb = fila(S, 'BETA SOTO'), sg = fila(S, 'GAMA DIAZ');
  expect(sa.slice(6, 10)).toEqual(['A', '', 'I', 'A']);
  expect(sa.slice(14, 22)).toEqual([0.5, '', 0, 1.5, '', '', '', 2]);  // horas extra y PARCIAL
  expect(sb[6]).toBe('DM');
  expect(sb[23]).toBe(8.5);                                              // DM del lunes = 8,5 h
  expect(sb[30]).toBe(8.5);                                              // PARCIAL de descanso médico
  expect(sg[6]).toBe('VA');
  // Excel de un día desde la lista: una sola hoja
  const d = await bajar(page, '#tpkList [data-tpkx="2026-09-30"]');
  expect(d.wb.SheetNames).toEqual(['30.09']);
  expect(d.name).toContain('2026-09-30_v2');
  noErrors(errors, 'costos');
});

/* stub de publicarTareo: respuestas en window.__tpResp[accion] (o error en window.__tpErr[accion]); llamadas en window.__tpCalls */
async function stub(page, resp) {
  await page.evaluate(resp => {
    window.__tpResp = resp; window.__tpErr = {}; window.__tpCalls = [];
    const orig = firebase.functions;
    firebase.functions = () => { const f = orig(); return { httpsCallable: n => n !== 'publicarTareo' ? f.httpsCallable(n) : async d => {
      window.__tpCalls.push(JSON.parse(JSON.stringify(d)));
      const e = window.__tpErr[d.accion]; if (e) throw Object.assign(new Error(e.message), { code: 'functions/' + e.code, details: e.details });
      return { data: window.__tpResp[d.accion] || {} }; } }; };
  }, resp);
}
const calls = page => page.evaluate(() => window.__tpCalls);
/* contesta los confirm/prompt de uiAsk (el Firebase falso usa los del navegador) */
function dialogos(page) { const Q = []; page.on('dialog', d => { const a = Q.shift(); a == null ? d.dismiss() : a === true ? d.accept() : d.accept(a); }); return Q; }

const RES = (o = {}) => ({ obreros: 3, pres: 2, aus: 1, porMot: { DM: 1 }, sinTareo: [{ dni: '40000009', ape: 'ZETA', nom: 'ANA', cap: '' }], hh: 17, he: 0.5, alt: 1, porEstado: { rev: 1, env: 1 }, ...o });
const TAREO = ['tareo', HOY + '_tcap@obra.pe', { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: T(HOY, '17:40'), envBy: 'tcap@obra.pe', foto: [],
  rows: { 40000001: { ape: 'ALFA ROJAS', nom: 'JUAN', cat: 'OP', cua: 'CARPINTEROS', as: true, mot: '', alt: false } },
  blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '17:00', dnis: ['40000001'] }], hist: [], by: 'tcap@obra.pe', ts: 1 }];

test('Publicación: bloqueos, excepción con motivo, publicar, abrir el tareo y errores', async ({ page }) => {
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: [['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado', act: true }], TAREO] });
  const Q = dialogos(page);
  await stub(page, { previa: { resumen: RES(), bloqueos: [{ k: 'estado', msg: 'Teodoro Capataz: enviado, falta revisar', tareo: HOY + '_tcap@obra.pe' }, { k: 'cob', msg: 'ZETA ANA no figura en ningún tareo', dni: '40000009' }], vigente: null, abierto: null }, publicar: { v: 1, id: HOY + '_v1' } });
  await page.evaluate(() => { U.mod = 'tar'; goTab('tpub'); });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tpub');
  await expect(page.locator('#tpbPub')).toBeDisabled();
  await page.click('#tpbVer');
  await expect(page.locator('#tpbRes')).toContainText('17');
  await expect(page.locator('#tpbEst')).toContainText('Revisado 1');
  // el bloqueo del tareo sale agrupado; el del obrero sin tareo va en «Sin tareo» (se resuelve con la excepción)
  await expect(page.locator('#tpbBlq .tp-bg')).toHaveCount(1);
  await expect(page.locator('#tpbBlq')).toContainText('falta revisar');
  await expect(page.locator('#tpbPub')).toBeDisabled();
  await expect(page.locator('#tpbWhy')).toContainText('bloqueo');
  // ya revisado: sin bloqueos del tareo, pero falta el motivo de ZETA
  await page.evaluate(() => { window.__tpResp.previa = { ...window.__tpResp.previa, bloqueos: window.__tpResp.previa.bloqueos.slice(1) }; });
  await page.click('#tpbVer');
  await expect(page.locator('#tpbBlq')).toHaveCount(0);
  await expect(page.locator('#tpbPub')).toBeDisabled();
  await expect(page.locator('#tpbWhy')).toContainText('Falta el motivo de 1 obrero');
  await page.check('#tpbSin [data-tpbx="40000009"]');
  await expect(page.locator('#tpbPub')).toBeDisabled();                 // marcado sin motivo
  await page.click('#tpbSin [data-tpbm="Otro"]');
  await page.locator('[data-tpbi="40000009"]').fill('Cambio de obra');
  await expect(page.locator('#tpbPub')).toBeEnabled();
  await page.click('#tpbSin [data-tpbm="Vacaciones"]');
  await expect(page.locator('[data-tpbi="40000009"]')).toHaveValue('Vacaciones');
  // cancelar la confirmación no llama a la función
  Q.push(null); await page.click('#tpbPub');
  expect((await calls(page)).filter(c => c.accion === 'publicar')).toHaveLength(0);
  Q.push(true); await page.click('#tpbPub');
  await expect.poll(async () => (await calls(page)).filter(c => c.accion === 'publicar')).toEqual([{ accion: 'publicar', fecha: HOY, excepciones: { 40000009: 'Vacaciones' } }]);
  // error de la función: se muestra claro
  await page.evaluate(() => { window.__tpErr.previa = { code: 'failed-precondition', message: 'El tareo de Bruno está en borrador.' }; });
  await page.click('#tpbVer');
  await expect(page.locator('#tpbErr')).toContainText('El tareo de Bruno está en borrador.');
  await page.evaluate(() => { window.__tpErr.previa = { code: 'internal', message: 'internal' }; });
  await page.click('#tpbVer');
  await expect(page.locator('#tpbErr')).toContainText('publicarTareo');
  // el enlace del bloqueo abre el tareo en la revisión
  await page.evaluate(h => { delete window.__tpErr.previa; window.__tpResp.previa.bloqueos = [{ k: 'estado', msg: 'falta revisar', tareo: h + '_tcap@obra.pe' }]; }, HOY);
  await page.click('#tpbVer');
  await page.click('#tpbBlq [data-tpbt]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  await expect(page.locator('#trWs')).toContainText('Teodoro Capataz');
  noErrors(errors, 'publicación');
});

test('Publicación: rectificar pide motivo; rectificación abierta publica la v2 con motivo; historial con diferencias', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: [
    ...DATOS,
    idx('2026-09-28', 1, { abierto: { t: T('2026-09-29', '09:00'), by: 'jefe@obra.pe', motivo: 'Faltó un obrero' } }),
  ] });
  const Q = dialogos(page);
  await stub(page, { previa: { resumen: RES({ sinTareo: [] }), bloqueos: [], vigente: 2, abierto: null }, rectificar: { ok: true }, publicar: { v: 2 } });
  await page.evaluate(() => { U.mod = 'tar'; TPB.f = ''; goTab('tpub'); });
  // 30.09: publicado (v2) y no abierto → «Rectificar…», sin botón de publicar; historial con la v1 sustituida y sus diferencias
  await page.fill('#tpbDate', '2026-09-30'); await page.locator('#tpbDate').dispatchEvent('change');
  await expect(page.locator('#tpbSt')).toContainText('Publicado v2');
  await expect(page.locator('#tpbPub')).toHaveCount(0);
  await expect(page.locator('#tpbHist li[data-tpbv="1"]')).toContainText('v1 · sustituida');
  await expect(page.locator('#tpbHist li[data-tpbv="2"]')).toContainText('Faltaba media hora');
  await page.click('#tpbHist li[data-tpbv="2"] summary');
  await expect(page.locator('#tpbHist')).toContainText('ALFA ROJAS JUAN: 8,5 → 7 h');
  Q.push(''); await page.click('#tpbRect');                             // sin motivo: no llama
  expect((await calls(page)).filter(c => c.accion === 'rectificar')).toHaveLength(0);
  Q.push('Horas mal digitadas'); await page.click('#tpbRect');
  await expect.poll(async () => (await calls(page)).filter(c => c.accion === 'rectificar')).toEqual([{ accion: 'rectificar', fecha: '2026-09-30', motivo: 'Horas mal digitadas' }]);
  // 28.09 abierto para rectificar: aviso y «Publicar rectificación v2» con motivo obligatorio
  await page.fill('#tpbDate', '2026-09-28'); await page.locator('#tpbDate').dispatchEvent('change');
  await expect(page.locator('#tpbAb')).toContainText('Faltó un obrero');
  await page.click('#tpbVer');
  await expect(page.locator('#tpbPub')).toHaveText('Publicar rectificación v2');
  await expect(page.locator('#tpbPub')).toBeEnabled();
  Q.push(''); await page.click('#tpbPub');
  expect((await calls(page)).filter(c => c.accion === 'publicar')).toHaveLength(0);
  Q.push('Se agregó a BETA'); await page.click('#tpbPub');
  await expect.poll(async () => (await calls(page)).filter(c => c.accion === 'publicar')).toEqual([{ accion: 'publicar', fecha: '2026-09-28', excepciones: {}, motivo: 'Se agregó a BETA' }]);
  // «Ver en Costos» abre el detalle de esa versión
  await page.click('#tpbHist [data-tpbc="2026-09-28_v1"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tcos');
  await expect(page.locator('#tpkMeta')).toContainText('Versión 1');
  noErrors(errors, 'rectificar');
});

test('quién ve Publicación y Costos', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false });
  const t = await page.evaluate(() => ({ pub: tabAllowed('tpub'), cos: tabAllowed('tcos'), dia: tabAllowed('tdia') }));
  expect(t).toEqual({ pub: false, cos: false, dia: true });
  noErrors(errors, 'tasis');
});
