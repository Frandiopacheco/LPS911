// Módulo Tareo (fase 2, docs/ia/tareo.md «Contrato de F2»): bandeja del asistente de tareo.
// Cotejo de firmas, garita distinta, corrección con motivo, marcar/quitar revisado, sin tareo y duplicados. Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const per = (dni, ape, cap) => ['tper', dni, { dni, ape, nom: 'X', pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const row = (ape, o = {}) => ({ ape, nom: 'X', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false, ...o });
const T1 = HOY + '_tcap@obra.pe', T2 = HOY + '_tcap2@obra.pe';
const ENV = Date.parse(HOY + 'T08:40:00-05:00');
const EXTRA = [
  ['members', 'tcap2@obra.pe', { role: 'tcap', name: 'Bruno Segundo' }],
  ['members', 'tcap3@obra.pe', { role: 'tcap', name: 'Zoila Sinempezar' }],
  ['tcfg', 'main', { limEnv: '09:00', tolGar: 15 }],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales', act: true }],
  ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true }],
  per('11111111', 'ALFA', 'tcap@obra.pe'), per('22222222', 'BETA', 'tcap@obra.pe'), per('33333333', 'GAMMA', 'tcap@obra.pe'),
  per('66666666', 'ZETA', 'tcap@obra.pe'), per('44444444', 'DELTA', 'tcap2@obra.pe'), per('55555555', 'EPSILON', 'tcap3@obra.pe'), per('77777777', 'ETA', ''),
  ['tfot', 'f1', { date: HOY, cap: 'tcap@obra.pe', n: 1, d: FOTO, by: 'tcap@obra.pe', ts: 1 }],
  ['tareo', T1, { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: ENV, envBy: 'tcap@obra.pe', foto: ['f1'],
    rows: { 11111111: row('ALFA'), 22222222: row('BETA'), 33333333: row('GAMMA', { as: false, mot: 'DM' }) },
    blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['11111111', '22222222'] }, { id: 'b2', pc: 'p10_10', ini: '13:00', fin: '17:00', dnis: ['11111111', '22222222'] }],
    hist: [{ t: ENV, by: 'tcap@obra.pe', a: 'env' }], by: 'tcap@obra.pe', ts: 1 }],
  // BETA también figura presente en el tareo de Bruno: duplicado
  ['tareo', T2, { date: HOY, cap: 'tcap2@obra.pe', capN: 'Bruno Segundo', st: 'env', envAt: ENV, envBy: 'tcap2@obra.pe', foto: ['f1'],
    rows: { 44444444: row('DELTA'), 22222222: row('BETA') },
    blq: [{ id: 'c1', pc: 'p10_05', ini: '07:30', fin: '17:00', dnis: ['44444444', '22222222'] }],
    hist: [{ t: ENV, by: 'tcap2@obra.pe', a: 'env' }], by: 'tcap2@obra.pe', ts: 1 }],
];
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);
const dbT = (page, id) => page.evaluate(id => window.__dbGet('tareo', id), id);

test('revisión: cotejo de firmas, garita distinta, marcar y quitar revisado', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#lqm');
  await expect(m).toContainText('Cotejo de firmas');
  await expect(m.locator('#trCotN')).toHaveText('0 de 2 cotejados');
  // sin cotejar no se puede marcar revisado
  await expect(m.locator('#trRev')).toBeDisabled();
  // visor: acercar y rotar
  await m.locator('[data-trv="zi"]').click();
  await m.locator('[data-trv="rot"]').click();
  await expect(m.locator('#trImg')).toHaveAttribute('data-z', '1.5');
  await expect(m.locator('#trImg')).toHaveAttribute('data-rot', '90');
  // todos firmaron, menos BETA; ALFA salió por garita 40 min después
  await m.locator('#trAll').click();
  await expect(m.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  await m.locator('tr[data-trd="22222222"] [data-tra="fir"][data-v="0"]').click();
  await expect(m.locator('tr[data-trd="22222222"]')).toHaveClass(/tr-bad/);
  await m.locator('#trg_11111111').fill('17:40');
  await expect(m.locator('#trObs')).toContainText('BETA, X: vino pero no firmó');
  await expect(m.locator('#trObs')).toContainText('salida en garita distinta (garita 17:40, tareo 17:00)');
  await expect(m.locator('#trRev')).toBeEnabled();
  // guardar cotejo
  await m.locator('#trSave').click();
  await expect.poll(async () => (await dbT(page, T1)).rows['11111111']).toMatchObject({ fir: true, gar: '17:40' });
  let d = await dbT(page, T1);
  expect(d.rows['22222222'].fir).toBe(false);
  expect(d.st).toBe('env');
  expect(d.hist.map(x => x.a)).toEqual(['env', 'fir']);
  expect(d.hist[1].cam).toContain('no firmó: BETA');
  // marcar revisado: pide confirmar porque BETA no firmó; queda en el historial
  let asked = '';
  page.once('dialog', dg => { asked = dg.message(); dg.accept(); });
  await m.locator('#trRev').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('rev');
  expect(asked).toContain('no firmó');
  d = await dbT(page, T1);
  expect(d.revBy).toBe('tasis@obra.pe');
  expect(d.hist.map(x => x.a)).toEqual(['env', 'fir', 'rev']);
  expect(d.hist[2].cam).toContain('no firmó');
  await expect(m.locator('#trHist')).toContainText('Revisado');
  await expect(m.locator('#trAll')).toHaveCount(0); // revisado: el cotejo queda de solo lectura
  await expect(page.locator(`tr[data-to="${T1}"]`)).toContainText('Revisado');
  await expect(page.locator(`tr[data-to="${T1}"] [data-l="Firmas"]`)).toHaveText('1 sin firma');
  // quitar revisado con motivo
  page.once('dialog', dg => dg.accept('Revisar de nuevo la garita'));
  await m.locator('#trQrev').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('env');
  d = await dbT(page, T1);
  expect(d.hist[3]).toMatchObject({ a: 'qrev', mot: 'Revisar de nuevo la garita' });
  expect(d.revBy).toBeUndefined();
  noErrors(errors, 'revisión');
});

test('revisión: duplicado y corrección directa con motivo (horas recalculadas, estado igual)', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await expect(page.locator('#trDup')).toContainText('BETA');
  await expect(page.locator('#trDup')).toContainText('Teodoro Capataz y Bruno Segundo');
  await page.locator(`tr[data-to="${T2}"] button[data-to]`).click();
  const m = page.locator('#lqm');
  await m.locator('#trCor').click();
  await expect(m).toContainText('Corregir el tareo');
  // el bloque termina a las 12:00 y BETA en realidad faltó (estaba con Teodoro)
  await m.locator('#tre_fin_0').fill('12:00');
  await m.locator('#tre_as_22222222').uncheck();
  await m.locator('#tre_mot_22222222').selectOption('FA');
  await expect(m.locator('tr[data-tro="44444444"]')).toContainText(/4[.,]5/);
  page.once('dialog', dg => dg.accept('Salieron al mediodía'));
  await m.locator('#trEdOk').click();
  await expect.poll(async () => (await dbT(page, T2)).rows['44444444'].trab).toBe(4.5);
  const d = await dbT(page, T2);
  expect(d.st).toBe('env');
  expect(d.rows['44444444']).toMatchObject({ fin: '12:00', ext: 0 });
  expect(d.rows['22222222']).toMatchObject({ as: false, mot: 'FA', trab: 0 });
  expect(d.blq[0].dnis).toEqual(['44444444', '22222222']); // BETA conserva su bloque (0 h): si vuelve a «vino» recupera sus horas
  const h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'cor', mot: 'Salieron al mediodía', by: 'tasis@obra.pe' });
  expect(h.cam).toContain('07:30–17:00 → 07:30–12:00');
  expect(h.cam).toContain('BETA: faltó (FA)');
  await expect(m.locator('#trHist')).toContainText('Corregido');
  await expect(page.locator('#trDup')).toHaveCount(0);
  noErrors(errors, 'corrección');
});

test('corrección: quitar y volver a marcar «vino» no le quita las horas al obrero (regresión)', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#lqm');
  await m.locator('#trCor').click();
  const alfa = m.locator('tr[data-tro="11111111"]');
  await expect(alfa).toContainText(/8[.,]5/);
  await m.locator('#tre_as_11111111').uncheck();
  await expect(alfa).not.toContainText(/8[.,]5/);
  await expect(m.locator('#trEdObs')).not.toContainText('figura en el');
  await m.locator('#tre_as_11111111').check();
  await expect(alfa).toContainText(/8[.,]5/);
  // guardar con ALFA como falta: conserva sus bloques con 0 h
  await m.locator('#tre_as_11111111').uncheck();
  await m.locator('#tre_mot_11111111').selectOption('FA');
  page.once('dialog', dg => dg.accept('Faltó'));
  await m.locator('#trEdOk').click();
  await expect.poll(async () => (await dbT(page, T1)).rows['11111111'].as).toBe(false);
  const d = await dbT(page, T1);
  expect(d.rows['11111111']).toMatchObject({ trab: 0, h: {} });
  expect(d.blq.map(b => b.dnis)).toEqual([['11111111', '22222222'], ['11111111', '22222222']]);
  noErrors(errors, 'vino/no vino');
});

test('Tareos del día: sin tareo (registrar falta), no enviados a la hora límite y filtros', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  const sin = page.locator('#trSin');
  await expect(sin).toContainText('ZETA');
  await expect(sin).toContainText('EPSILON');
  await expect(sin).toContainText('ETA');
  await expect(sin).not.toContainText('ALFA');
  await expect(sin).not.toContainText('GAMMA'); // con falta ya figura
  await expect(sin.locator('[data-cap=""]')).toContainText('Sin capataz');
  // Zoila no envió a las 09:00 (hora límite de la prueba; son las 09:30)
  await expect(page.locator('#trLate')).toContainText('Zoila Sinempezar');
  await expect(page.locator('tr[data-tcap="tcap3@obra.pe"]')).toContainText('No enviado a las 09:00');
  // solo se registra la falta en el tareo enviado de su capataz
  await expect(sin.locator('[data-trfal="55555555"]')).toHaveCount(0);
  await expect(sin.locator('[data-trfal="77777777"]')).toHaveCount(0);
  await sin.locator('[data-trfal="66666666"]').click();
  await page.locator('#trFm').selectOption('DM');
  await page.locator('#trFt').fill('RR.HH. confirma descanso médico');
  await page.locator('#trFok').click();
  await expect.poll(async () => (await dbT(page, T1)).rows['66666666']).toMatchObject({ as: false, mot: 'DM', ape: 'ZETA' });
  const d = await dbT(page, T1);
  expect(d.st).toBe('env');
  expect(d.hist[d.hist.length - 1]).toMatchObject({ a: 'cor', mot: 'RR.HH. confirma descanso médico' });
  await expect(sin).not.toContainText('ZETA');
  // filtros
  await expect(page.locator('#trFlt [data-trflt="rev"]')).toContainText('2');
  await page.locator('#trFlt [data-trflt="ok"]').click();
  await expect(page.locator('#toBody')).toContainText('Ningún tareo con este filtro');
  await page.locator('#trFlt [data-trflt="rev"]').click();
  await expect(page.locator('#toBody tr[data-to]')).toHaveCount(2);
  await expect(page.locator('#toBody tr[data-tcap]')).toHaveCount(0);
  await page.locator('#trFlt [data-trflt="obs"]').click();
  await expect(page.locator('#toBody tr[data-to]')).toHaveCount(0);
  noErrors(errors, 'sin tareo');
});

test('revisión: el jefe de producción ve el cotejo en solo lectura; el capataz ve «Revisado por la oficina»', async ({ page }) => {
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  await expect(page.locator('#lqm')).toContainText('Cotejo de firmas');
  await expect(page.locator('#trAll')).toHaveCount(0);
  await expect(page.locator('#trCor')).toHaveCount(0);
  await expect(page.locator('#trSin [data-trfal]')).toHaveCount(0);
  noErrors(errors, 'jefe');
  const rev = EXTRA.map(x => x[0] === 'tareo' && x[1] === T1 ? ['tareo', T1, { ...x[2], st: 'rev', revBy: 'tasis@obra.pe', revAt: ENV }] : x);
  const p2 = await page.context().newPage();
  await p2.setViewportSize({ width: 390, height: 800 });
  const e2 = await openApp(p2, { as: 'tcap', editar: false, extra: rev });
  await expect(p2.locator('#tcRoot')).toContainText('Revisado por la oficina');
  await expect(p2.locator('[data-tca="send"]')).toHaveCount(0);
  noErrors(e2, 'capataz');
});
