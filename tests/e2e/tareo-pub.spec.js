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

import { T, PCS, A, B, pub, idx, DATOS } from './tareo-datos.js';

test('Costos: lista por mes, sustituida, detalle y Excel del día y de la semana', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: DATOS });
  await conExcel(page);
  // costos entra directo a «Costos» (ya no a Tareos del día)
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tcos');
  expect(await page.evaluate(() => [...tabPrimary(), ...tabSecondary()])).toEqual(['tcos', 'trh', 'tper', 'tpc']);
  await page.click('#tcoV [data-tcov="pub"]'); // 20-10-2026: la lista de publicaciones es una vista de Costos
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
  // mismo orden de hojas que el archivo de costos (20-10-2026)
  expect(wb.SheetNames).toEqual(['Personal Obrero', 'Lista de partidas', 'Tareo Semana', 'Resumen HH', '28.09', '30.09', '01.10']);
  // hoja del día: grupos, nombres, códigos, «hrs», horas, totales, extra, (A), motivo y pie con la versión
  const L = aoa(wb.Sheets['28.09']);
  expect(L[2].slice(5, 8)).toEqual(['M. TIERRAS', 'ESTRUCTURA', '']);
  expect(L[3].slice(5, 8)).toEqual(['Excavación masiva', 'Encofrado de muros', 'Encofrado de escaleras']);
  expect(L[4].slice(4, 8)).toEqual(['Código', '2.01', '10.05', '10.10']);
  expect(L[5].slice(0, 8)).toEqual(['N°', 'Personal Obrero', 'CUADRILLA', 'DNI', 'Categoría', 'hrs', 'hrs', 'hrs']);
  expect(L[2][8]).toBe('HORAS TOTALES'); expect(L[2][9]).toMatch(/^HORAS EXTRAS/); expect(L[2][10]).toBe('BONOS');
  expect(wb.Sheets['28.09']['!merges'].some(m => m.s.r === 2 && m.s.c === 6 && m.e.c === 7)).toBe(true); // ESTRUCTURA fusionada sobre sus dos partidas
  const alfa = fila(L, 'ALFA ROJAS JUAN');
  expect(alfa.slice(0, 11)).toEqual([1, 'ALFA ROJAS JUAN', 'CARPINTEROS', '40000001', 'Operario', 3, 6, '', 9, 0.5, '(A)']);
  expect(fila(L, 'BETA SOTO LUIS')[11]).toMatch(/^DM/);
  expect(fila(L, 'GAMA DIAZ PEDRO')[11]).toBe('Sin tareo: Vacaciones');
  expect(L.find(r => r[1] === 'TOTAL').slice(5, 11)).toEqual([3, 6, '', 9, 0.5, 1]);
  // debajo: HH por categoría, UA y UA POWERS de cada partida, y HH por UA POWERS y categoría (como el archivo de costos)
  expect(L.find(r => r[4] === 'Operario').slice(5, 9)).toEqual([3, 6, '', 9]);
  expect(L.find(r => r[4] === 'Peon').slice(5, 8)).toEqual(['', '', '']);
  expect(L.find(r => r[4] === 'UA').slice(5, 9)).toEqual(['CD1', 'CD2', 'CD3', 'ok']);
  expect(L.find(r => r[4] === 'UA POWERS').slice(5, 8)).toEqual(['CD1', 'CD2', 'CD3']);
  expect(L.find(r => r[0] === "UA'S").slice(0, 6)).toEqual(["UA'S", 'PARTIDAS', 'Operario', 'Oficial', 'Peon', 'TOTAL']);
  expect(L.find(r => r[0] === 'CD2').slice(0, 6)).toEqual(['CD2', '10.05', 6, '', '', 6]);
  // la misma gente y en el mismo orden en todas las hojas del día de la semana
  const nombres = n => aoa(wb.Sheets[n]).slice(6).filter(r => typeof r[0] === 'number').map(r => r[1]);
  expect(nombres('30.09')).toEqual(nombres('28.09'));
  expect(nombres('01.10')).toEqual(nombres('28.09'));
  // Personal Obrero y Lista de partidas
  const PO = aoa(wb.Sheets['Personal Obrero']);
  expect(PO[2].slice(0, 7)).toEqual(['N°', 'APELLIDO PATERNO', 'APELLIDO MATERNO', 'NOMBRES', 'CUADRILLA', 'CATEGORIA', 'DNI']);
  expect(fila(PO, '40000001').slice(0, 7)).toEqual([1, 'ALFA', 'ROJAS', 'JUAN', 'CARPINTEROS', 'Operario', '40000001']);
  const LP = aoa(wb.Sheets['Lista de partidas']);
  expect(LP[2].slice(1, 9)).toEqual(['CÓDIGO', 'DESCRIPCIÓN', 'und', 'Metrado', 'HH', 'Ratio', 'UA - TAREO', 'UA - POWERS']);
  expect(fila(LP, 'Encofrado de muros').slice(1, 4)).toEqual(['10.05', 'Encofrado de muros', 'm2']);
  expect(fila(L, '· publicó').join('')).toMatch(/^Versión publicada v1 · publicó Jaime Jefe/);
  expect(Object.values(wb.Sheets['28.09']).some(c => c && c.f)).toBe(false); // solo valores
  // el 30.09 sale de la versión vigente (v2: 7 h)
  expect(fila(aoa(wb.Sheets['30.09']), 'ALFA ROJAS JUAN')[8]).toBe(7);
  expect(fila(aoa(wb.Sheets['30.09']), '· publicó').join('')).toMatch(/^Versión publicada v2 .*Faltaba media hora/);
  // Resumen HH: HH y HE por día (martes sin publicar), TOTAL HH, HN, HE
  const R = aoa(wb.Sheets['Resumen HH']);
  expect(R[2][4]).toBe('LUNES'); expect(R[2][6]).toBe('MARTES (sin publicar)');
  expect(R[3].slice(0, 6)).toEqual(['N°', 'PERSONAL OBRERO', 'DNI', 'CATEGORIA', '28.09', 'HE']);
  expect(fila(R, 'ALFA ROJAS JUAN')[3]).toBe('Operario');
  const ra = fila(R, 'ALFA ROJAS JUAN');
  expect(ra.slice(4, 12)).toEqual([9, 0.5, '', '', 7, 0, 10, 1.5]);
  expect(ra.slice(18, 23)).toEqual([26, 24, 2, 2, 0]);                 // TOTAL HH, HN, HE, H60, H100
  expect(R[3].slice(18, 23)).toEqual(['TOTAL HH', 'HN', 'HE', 'H60', 'H100']);
  expect(R[1][1]).toBe('Semana 58 (del 28.09.2026 a 04.10.2026)');      // la semana del 19.10.2026 es la 61
  // Tareo Semana: A / I / código, horas extra y horas de descanso médico (= jornada del día)
  const S = aoa(wb.Sheets['Tareo Semana']);
  expect(S[1][1]).toBe('Tareo Semana 58 (del 28.09.2026 a 04.10.2026)');
  expect(S[4].slice(2, 5)).toEqual(['Apellido Paterno', 'Apellido Materno', 'Nombres']);
  expect(S[2][7]).toBe('ASISTENCIA');
  expect(S[3].slice(7, 14)).toEqual(['L', 'M', 'Mi', 'J', 'V', 'S', 'D']);
  const sa = fila(S, '40000001'), sb = fila(S, '40000002'), sg = fila(S, 'GAMA');
  expect(sa.slice(2, 5)).toEqual(['ALFA', 'ROJAS', 'JUAN']);
  expect(sa.slice(7, 11)).toEqual(['A', '', 'I', 'A']);
  expect(sa.slice(15, 23)).toEqual([0.5, '', 0, 1.5, '', '', '', 2]);  // horas extra y PARCIAL
  expect(sb[7]).toBe('DM');
  expect(sb[24]).toBe(8.5);                                              // DM del lunes = 8,5 h
  expect(sb[31]).toBe(8.5);                                              // PARCIAL de descanso médico
  expect(sg[7]).toBe('VA');
  expect(sa[13]).toBe('');                                               // domingo aún no llega (04.10 > hoy): sin «D»
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

const SIN = [{ dni: '40000009', ape: 'ZETA', nom: 'ANA', cua: 'ALBAÑILES', cap: '' }, { dni: '40000008', ape: 'YAÑEZ', nom: 'LUIS', cua: 'ALBAÑILES', cap: '' }, { dni: '40000007', ape: 'XU', nom: 'MIA', cua: 'CARPINTEROS', cap: '' }];
const RES = (o = {}) => ({ obreros: 3, pres: 2, aus: 1, porMot: { DM: 1 }, sinTareo: SIN, hh: 17, he: 0.5, alt: 1, porEstado: { rev: 1, env: 1 }, ...o });
const TAREO = ['tareo', HOY + '_tcap@obra.pe', { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: T(HOY, '17:40'), envBy: 'tcap@obra.pe', foto: [],
  rows: { 40000001: { ape: 'ALFA ROJAS', nom: 'JUAN', cat: 'OP', cua: 'CARPINTEROS', as: true, mot: '', alt: false } },
  blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '17:00', dnis: ['40000001'] }], hist: [], by: 'tcap@obra.pe', ts: 1 }];
const previas = async page => (await calls(page)).filter(c => c.accion === 'previa').length;

test('Publicación (opción C): carga sola, se actualiza con los tareos, motivo con un toque (guardado), publicar, abrir el tareo y errores', async ({ page }) => {
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: [['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado', act: true }], TAREO] });
  const Q = dialogos(page);
  const TR1 = { id: HOY + '_tcap@obra.pe', cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', n: 1, pres: 1, aus: 0, hh: 8.5, he: 0 };
  await stub(page, { previa: { resumen: RES({ tareos: [TR1] }), sinTareo: SIN, bloqueos: [{ k: 'estado', msg: 'Teodoro Capataz: enviado, falta revisar', tareo: TR1.id }, { k: 'cob', msg: 'ZETA ANA no figura en ningún tareo', dni: '40000009' }], vigente: null, abierto: null }, publicar: { v: 1, id: HOY + '_v1' } });
  await page.evaluate(() => { U.mod = 'tar'; goTab('tpub'); });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tpub');
  await expect.poll(() => previas(page)).toBe(1);
  await expect(page.locator('#tpbTot')).toContainText('17 HH');
  await expect(page.locator('#tpbSt')).toContainText('Faltan 4 cosas');            // 1 capataz sin revisar + 3 sin motivo
  await expect(page.locator('#tpbPub')).toBeDisabled();
  await expect(page.locator('#tpbWhy')).toContainText('1 capataz sin revisar · 3 sin tareo sin motivo');
  // capataces a la izquierda: el enviado arriba, con «Revisar»; sin «Producción»
  await expect(page.locator(`#tpbCt tr[data-tpbp="${TR1.id}"]`)).toHaveClass(/warn/);
  await expect(page.locator(`#tpbCt tr[data-tpbp="${TR1.id}"] [data-tpbt]`)).toHaveText('Revisar');
  await expect(page.locator('#tpbRoot')).not.toContainText('producción');
  // por resolver: los 3 sin tareo, cada uno con sus motivos
  await expect(page.locator('#tpbPor .pb-l li[data-tpbd]')).toHaveCount(3);
  // un tareo del día cambia → la previa se vuelve a pedir sola (~2 s)
  await page.evaluate(() => { const p = window.__tpResp.previa; window.__tpResp.previa = { ...p, bloqueos: p.bloqueos.slice(1), resumen: { ...p.resumen, tareos: [{ ...p.resumen.tareos[0], st: 'rev' }] } }; });
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'rev', ts: 2 }), HOY + '_tcap@obra.pe');
  await expect.poll(() => previas(page), { timeout: 6000 }).toBe(2);
  await expect(page.locator('#tpbSt')).toContainText('Faltan 3 cosas');
  await expect(page.locator('#tpbCapN')).toHaveText('1 de 1 revisados');
  // un toque = motivo guardado (tpexc) y sale de «Por resolver» a «Resueltos»
  await page.click('#tpbPor [data-tpbm="Vacaciones"][data-dni="40000009"]');
  await page.click('#tpbPor [data-tpbm="Descanso médico"][data-dni="40000008"]');
  await expect(page.locator('#tpbPor .pb-l li[data-tpbd]')).toHaveCount(1);
  await expect(page.locator('#tpbSt')).toContainText('Falta 1 cosa');
  await expect.poll(async () => (await page.evaluate(f => window.__dbGet('tpexc', f), HOY) || {}).exc).toEqual({ 40000009: 'Vacaciones', 40000008: 'Descanso médico' });
  // «Otro…» con texto propio
  await page.click('#tpbPor [data-tpbo="40000007"]');
  await page.fill('#tpbOtro', 'Cambio de obra');
  await page.click('#tpbPor [data-tpbok="40000007"]');
  await expect(page.locator('#tpbSt')).toContainText('Listo para publicar');
  await expect(page.locator('#tpbPor .pb-ok')).toContainText('Todo resuelto');
  // «Cambiar» en Resueltos lo devuelve a «Por resolver»
  await page.click('#tpbRes summary');
  await page.click('#tpbRes [data-tpbq="40000008"]');
  await expect(page.locator('#tpbPor li[data-tpbd="40000008"]')).toBeVisible();
  await expect(page.locator('#tpbPub')).toBeDisabled();
  await page.click('#tpbPor [data-tpbm="Vacaciones"][data-dni="40000008"]');
  await expect(page.locator('#tpbPub')).toBeEnabled();
  // cancelar la confirmación no llama a la función
  Q.push(null); await page.click('#tpbPub');
  expect((await calls(page)).filter(c => c.accion === 'publicar')).toHaveLength(0);
  Q.push(true); await page.click('#tpbPub');
  await expect.poll(async () => (await calls(page)).filter(c => c.accion === 'publicar')).toEqual([{ accion: 'publicar', fecha: HOY, excepciones: { 40000009: 'Vacaciones', 40000008: 'Vacaciones', 40000007: 'Cambio de obra' } }]);
  // error de la función: se muestra claro (↻ vuelve a consultar)
  await page.evaluate(() => { window.__tpErr.previa = { code: 'failed-precondition', message: 'El tareo de Bruno está en borrador.' }; });
  await page.click('#tpbVer');
  await expect(page.locator('#tpbErr')).toContainText('El tareo de Bruno está en borrador.');
  await page.evaluate(() => { delete window.__tpErr.previa; });
  await page.click('#tpbVer');
  await expect(page.locator('#tpbErr')).toHaveCount(0);
  // «Ver» del capataz abre su tareo en la revisión
  await page.click(`#tpbCt [data-tpbt="${TR1.id}"]`);
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  await expect(page.locator('#trWs #trCapSel')).toHaveValue(TR1.id);
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
  await expect(page.locator('#tpbSt')).toContainText('Listo para la rectificación v2');   // la previa llega sola
  await expect(page.locator('#tpbPub')).toHaveText('Publicar rectificación v2');
  await expect(page.locator('#tpbDays [data-tpbf="2026-09-28"]')).toHaveClass(/s-ab/);
  await expect(page.locator('#tpbDays [data-tpbf="2026-09-30"]')).toHaveAttribute('title', /publicado v2/);
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
  const t = await page.evaluate(() => ({ pub: tabAllowed('tpub'), cos: tabAllowed('tcos'), dia: tabAllowed('tdia'), cfg: tabAllowed('tcfg') }));
  expect(t).toEqual({ pub: true, cos: true, dia: true, cfg: true }); // 20-10-2026: el asistente tiene todo el tareo
  noErrors(errors, 'tasis');
});
