// Tareo · RR.HH. y Costos en vivo (docs/ia/tareo.md, «RR.HH. y Costos en vivo»): asistencia y horas por obrero y día desde las
// publicaciones vigentes, HE 60 %/100 %, altura, DM, cuadre con Costos; Costos por partida, UA y avance; Parámetros (tcfg/pla).
// Datos inventados: los mismos de tareo-pub.spec.js (semana 28.09–04.10, hoy 01.10).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { DATOS, SEM2 } from './tareo-datos.js';

test('RR.HH.: semana en vivo por obrero (códigos, HN, HE, altura, DM), detalle y cálculo', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: DATOS });
  await page.evaluate(() => { TRH.ref = '2026-09-30'; goTab('trh'); });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'trh');
  const alfa = page.locator('#trhTb tr[data-trhd="40000001"]');
  await expect(alfa).toBeVisible();
  // L 28: 9 h con 0,5 extra y altura · M 29 sin publicar · Mi 30: 7 h (v2, parcial) · J 01: 10 h con 1,5 extra
  const cod = await alfa.locator('td.ts-d b').allTextContents();
  expect(cod.slice(0, 4)).toEqual(['A▲', '·', 'P', 'A']);
  const r = await page.evaluate(() => { const R = tsCalc('2026-09-28', '2026-10-04', tsePB('rh')); const w = dni => R.W.find(x => x.dni === dni);
    const a = w('40000001'), b = w('40000002'), g = w('40000003');
    return { a: [a.dias, a.hn, a.h60, a.h100, a.alt, a.dsc], b: [b.d[0].code, b.dm, b.hn], g: g.d[0].code, T: [R.T.hh, R.T.f], pc: [...R.PC.values()].map(x => [x.id, x.tot, x.c.OP, x.c.PE]).sort() }; });
  expect(r.a).toEqual([3, 24, 2, 0, 1, 0.5]);
  expect(r.b).toEqual(['DM', 1, 17]);
  expect(r.g).toBe('VA');
  expect(r.T).toEqual([43, 0]);
  expect(r.pc).toEqual([['p02_01', 3, 3, 0], ['p10_05', 27.5, 23, 4.5], ['p10_10', 12.5, 0, 12.5]]);
  await expect(page.locator('#trhAl')).toContainText('Cuadre con Costos');
  await expect(page.locator('#trhAl')).toContainText('1 día sin publicar');
  // detalle del obrero
  await alfa.click();
  await expect(page.locator('#trhDet')).toContainText('10.05 Encofrado de muros');
  // vistas: altas y bajas, descansos médicos
  await page.click('#trhV [data-trhv="dm"]');
  await expect(page.locator('#trhDmT')).toContainText('BETA SOTO');
  noErrors(errors, 'rrhh');
});

test('Costos en vivo: por partida y por UA (cuadre), y Parámetros guardados en tcfg/pla', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: DATOS });
  await page.evaluate(() => { U.mod = 'tar'; TCO.ref = '2026-09-30'; goTab('tcos'); });
  await expect(page.locator('#tcoPcT tr[data-tcop="p10_05"]')).toContainText('27.5');
  await expect(page.locator('#tcoChk')).toContainText('HH por partida = HH de RR.HH.');
  await page.click('#tcoV [data-tcov="ua"]');
  await expect(page.locator('#tcoUaT')).toContainText('CD2');
  await expect(page.locator('#tcoUaT tfoot')).toContainText('43');
  // Parámetros: jornal del operario y bono por altura
  await page.click('#tcoPar');
  await expect(page.locator('#tplJor')).toContainText('11.16'); // 89,30 ÷ 8
  await page.fill('[data-tpj="OP"]', '90');
  await page.fill('#tplAlt', '7');
  await page.click('#tplSave');
  await expect.poll(() => page.evaluate(() => { const d = window.__dbGet('tcfg', 'pla'); return d && [d.vig[d.vig.length - 1].jb.OP, d.alt]; })).toEqual([90, 7]);
  await page.click('#tplBack');
  await expect(page.locator('#tcoTot')).toBeVisible();
  noErrors(errors, 'costos');
});

test('RR.HH. (rol trh): entra a su pestaña, solo lee los parámetros', async ({ page }) => {
  await page.addInitScript(() => { window.__E2E_EXTRA_USERS = 1; });
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: [...DATOS, ['members', 'tcos@obra.pe', { role: 'trh', name: 'Rita RR.HH.' }]] });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'trh');
  await page.click('#trhPar');
  await expect(page.locator('#tplSave')).toHaveCount(0);
  noErrors(errors, 'trh');
});

test('Excel nuevo de RR.HH. y Costos: hojas, horas por obrero, UA y cuadre', async ({ page }) => {
  const { createRequire } = await import('node:module');
  const { readFileSync } = await import('node:fs');
  const require = createRequire(import.meta.url);
  const XLSX = require('xlsx-js-style');
  const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
  const errors = await openApp(page, { as: 'admin', editar: false, extra: DATOS });
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.evaluate(() => { U.mod = 'tar'; TRH.ref = '2026-09-30'; goTab('trh'); });
  await expect(page.locator('#trhTb tr[data-trhd="40000001"]')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#trhX')]);
  const wb = XLSX.read(readFileSync(await dl.path()));
  // transición: el Excel de antes sigue disponible
  const [dlo] = await Promise.all([page.waitForEvent('download'), page.click('#trhXo')]);
  expect(dlo.suggestedFilename()).toMatch(/Tareo_semana_2026-09-28_al_2026-10-04\.xlsx$/);
  expect(XLSX.read(readFileSync(await dlo.path())).SheetNames.slice(0, 4)).toEqual(['Personal Obrero', 'Lista de partidas', 'Tareo Semana', 'Resumen HH']);
  expect(dl.suggestedFilename()).toMatch(/Tareo_S\d+_28\.09-04\.10\.xlsx$/);
  expect(wb.SheetNames).toEqual(['0 Resumen', '1 RRHH Asistencia', '2 RRHH Horas', '3 RRHH Altas y bajas', '4 Costos por partida', '5 Costos por UA', '6 Costos vs meta', '7 Detalle', '8 Personal', '9 Partidas']);
  const aoa = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: true });
  const H = aoa('2 RRHH Horas'); const h0 = H.findIndex(r => r[0] === 'N°'); const alfa = H.find(r => r[1] === '40000001');
  const col = n => H[h0].indexOf(n);
  expect([alfa[col('HN')], alfa[col('HE 60%')], alfa[col('HE 100%')], alfa[col('Total HH')]]).toEqual([24, 2, 0, 26]);
  const As = aoa('1 RRHH Asistencia'); const a2 = As.find(r => r[1] === '40000001');
  expect(a2.slice(2, 5)).toEqual(['ALFA', 'ROJAS', 'JUAN']);
  expect(a2.slice(7, 11)).toEqual(['A ▲', '·', 'P', 'A']);
  const U2 = aoa('5 Costos por UA'); expect(U2.find(r => r[0] === 'TOTAL')[6]).toBe(43);
  const Rs = aoa('0 Resumen'); expect(Rs.find(r => r[0] === 'HH por partida = HH de RR.HH.')[1]).toBe('OK');
  expect(aoa('7 Detalle').filter(r => /^\d{2}\/\d{2}\/\d{4}$/.test(r[0])).length).toBe(7);
  noErrors(errors, 'excel rrhh');
});

test('RR.HH. (auditoría 21-10): feriado y domingo, dominical, «Falta», categoría por día, HE por partida y DM del año', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: [...DATOS, ...SEM2] });
  await page.evaluate(() => { TRH.ref = '2026-09-23'; goTab('trh'); });
  await expect(page.locator('#trhTb tr[data-trhd="40000001"]')).toBeVisible();
  const r = await page.evaluate(() => { const R = tsCalc('2026-09-21', '2026-09-27', tsePB('rh')); const w = dni => R.W.find(x => x.dni === dni);
    const a = w('40000001'), b = w('40000002'), g = w('40000003'); const pc = id => { const o = R.PC.get(id); return [o.c.OP, o.c.OF, o.he]; };
    return { a: [a.d[1].code, a.d[3].code, a.d[6].code, a.hn, a.h60, a.df, a.dscTxt, a.dsc, a.cat, a.cua], b: [b.d[1].code, b.d[3].code, b.d[6].code, b.f, b.dscTxt],
      g: [g.d[2].code, g.d[3].code, g.d[6].code, g.f], pc: [pc('p02_01'), pc('p10_05'), pc('p10_10')],
      he: Math.round([...R.PC.values()].reduce((s, o) => s + o.he, 0) * 100) / 100, cua: [...R.cua.entries()].sort(), T: R.T.f,
      exc: [tpxExcCod('Falta'), tpxExcCod('falta injustificada'), tpxExcCod('Vacaciones'), tpxExcCod('Descanso médico'), tpxExcCod('Permiso')],
      ua: [tpxUaP(' CD1010010-01 '), tpxUaP('OC-2045'), tpxUaP('CD2-3')], rng: trhDmRango({ a: '2026-12-28', b: '2027-01-03' }) }; });
  // 1. feriado (24.09) y domingo (27.09) con publicación: quien no trabajó sale FE / D, no falta; «Falta» por excepción también
  expect(r.b).toEqual(['DM', 'FE', 'D', 0, '1/6']);
  expect(r.g).toEqual(['F', 'FE', 'D', 1]);               // 4. excepción «Falta» en día laborable = F
  expect(r.T).toBe(1);
  // 2. dominical: 22, 23 y el feriado trabajado (24) cuentan; el domingo trabajado no → 3/6
  expect(r.a).toEqual(['A', 'A', 'A', 16.5, 1, 10, '3/6', 0.5, 'OP', 'CARPINTEROS']);
  // 6. categoría y cuadrilla de cada día: el 22.09 fue oficial en ENCOFRADORES; 8. las HE repartidas suman exacto (0,33 + 0,33 + 0,34)
  expect(r.pc).toEqual([[4, 3, 4.33], [14.5, 3, 6.33], [0, 3, 0.34]]);
  expect(r.he).toBe(11);
  expect(r.cua).toEqual([['CARPINTEROS', 18.5], ['ENCOFRADORES', 9]]);
  expect(r.exc).toEqual(['F', 'F', 'VA', 'DM', 'EX']);
  expect(r.ua).toEqual(['CD1010010', 'OC-2045', 'CD2']);  // 7. solo un sufijo -n o -nn
  expect(r.rng).toEqual({ y: '2026', hasta: '2026-12-31' }); // 3. semana que cruza el año: el del inicio
  // pantalla: BETA el feriado y el domingo
  const beta = await page.locator('#trhTb tr[data-trhd="40000002"] td.ts-d b').allTextContents();
  expect([beta[3], beta[6]]).toEqual(['FE', 'D']);
  // 3. DM del año: suma la excepción «Descanso médico» (22.09) y cuenta hasta el fin del periodo (no el DM del 28.09)
  await page.click('#trhV [data-trhv="dm"]');
  await page.click('#trhDmY');
  await expect.poll(() => page.evaluate(() => TRH.dmY && [TRH.dmY.hasta, TRH.dmY.m.get('40000002')])).toEqual(['2026-09-27', 1]);
  await expect(page.locator('#trhDmT tr', { hasText: 'BETA SOTO' })).toContainText('Paga la empresa');
  await page.evaluate(() => { TRH.ref = '2026-09-30'; requestRender(); });
  await expect(page.locator('#trhDmY')).toContainText('Contar los días del año 2026');
  await page.click('#trhDmY');
  await expect.poll(() => page.evaluate(() => TRH.dmY && [TRH.dmY.hasta, TRH.dmY.m.get('40000002')])).toEqual(['2026-10-04', 2]);
  noErrors(errors, 'rrhh auditoria');
});

test('RR.HH.: un rango de más de 93 días avisa que se cortó', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: DATOS });
  await page.evaluate(() => { TRH.tipo = 'ran'; TRH.ref = '2026-05-01'; TRH.b2 = '2026-09-30'; goTab('trh'); });
  await expect(page.locator('#trhCorte')).toContainText('se pueden ver hasta 93');
  noErrors(errors, 'rrhh corte');
});

test('normativa (21-10-2026): dominical con 48 h en 5 días, corrido repetido, feriado trabajado, costo completo y asignación escolar', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: [
    ['tper', '40000001', { dni: '40000001', ape: 'ALFA ROJAS', nom: 'JUAN', cat: 'OP', cua: 'X', cap: '', ing: '2026-01-05', ces: '', per: [{ ing: '2026-01-05', ces: '' }], act: true }],
    ['tper', '40000009', { dni: '40000009', ape: 'NUEVO', nom: 'ANA', cat: 'PE', cua: 'X', cap: '', ing: '2026-09-16', ces: '', per: [{ ing: '2026-09-16', ces: '' }], act: true }],
    ['tperp', '40000001', { hij: 2, aeY: '2026' }], ['tperp', '40000009', { hij: 1 }]] });
  const r = await page.evaluate(() => {
    const row = (dni, cat, o) => ({ dni, ape: dni, nom: 'X', cat, cua: 'X', cap: '', capN: '', as: true, mot: '', alt: false, h: { p1: o.t }, trab: o.t, ext: o.e || 0, ...(o.cor ? { cor: true } : {}) });
    const PB = new Map();
    // lunes 05.10 a viernes 09.10: A trabaja 9,6 h ordinarias (48 h en 5 días, 3 corrido); B 8,5 h de lunes a jueves y el sábado 10.10,
    // feriado, trabaja 4 h (cuenta como día: 5/6)
    ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'].forEach((f, i) => {
      const fer = f === '2026-10-10';const rows = [];
      if (!fer) rows.push(row('40000001', 'OP', { t: 9.6, cor: i < 3 })); if (i < 4 || fer) rows.push(row('40000002', 'PE', fer ? { t: 4, e: 4 } : { t: 8.5 }));
      PB.set(f, { fecha: f, v: 1, rows, exc: {}, pcs: { p1: { cod: '1', nom: 'P', ua: 'U' } }, ...(fer ? { nl: true, cfg: { v: 1, jor: null, fer: true } } : {}) });
    });
    const R = tsCalc('2026-10-05', '2026-10-11', PB);const W = id => R.W.find(w => w.dni === id);
    const A = W('40000001'), B = W('40000002');
    const ae = trhAE({ P: R.P, b: '2026-09-30' });
    return { aD: A.dsc, aT: A.dscTxt, bD: B.dsc, cor: A.corMax, feT: R.T.feT, al: trhAlertas(R), np: tR2(A.costNP), costA: tR2(A.cost), ae,
      soles: (() => { const o = me.role; me.role = 'trh'; const s1 = tplSoles(); me.role = 'tcos'; const s2 = tplSoles(); me.role = o; return [s1, s2]; })() };
  });
  expect([r.aD, r.aT, r.bD]).toEqual([1, '6/6', 0.8333]); // 48 h en 5 días = semana completa; B: 4 días + feriado trabajado = 5/6
  expect(r.cor).toBe(3);
  expect(r.al).toContain('corrido 3 o más días');
  expect(r.feT).toBe(1);
  expect(r.al).toContain('feriado trabajado');
  expect(r.np).toBeCloseTo(89.30 + 89.30 / 6, 2); // el sábado feriado que no trabajó: jornal pagado y su dominical, sin partida
  expect(r.soles).toEqual([false, true]); // RR.HH. ya no ve los soles; Costos sí
  // asignación escolar de setiembre: ALFA 2 hijos con constancia, mes completo; NUEVO ingresó el 16.09 (15 de 30 días) y sin constancia
  expect(r.ae).toContain('1 sin constancia de 2026');
  expect(r.ae).toMatch(/30\/30/); expect(r.ae).toMatch(/15\/30/);
  noErrors(errors, 'normativa');
});
