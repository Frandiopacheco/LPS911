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
// sin el conflicto de BETA (para poder marcar revisado el tareo de Teodoro)
const SOLO = EXTRA.map(x => x[0] === 'tareo' && x[1] === T2 ? ['tareo', T2, { ...x[2], rows: { 44444444: row('DELTA') }, blq: [{ ...x[2].blq[0], dnis: ['44444444'] }] }] : x);
const conT1 = (o, base = SOLO) => base.map(x => x[0] === 'tareo' && x[1] === T1 ? ['tareo', T1, { ...x[2], ...o }] : x);
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);
const dbT = (page, id) => page.evaluate(id => window.__dbGet('tareo', id), id);

test('revisión: cotejo de firmas, garita distinta, marcar y quitar revisado', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: SOLO });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  await expect(m).toContainText('Obreros y horas por partida');
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
  // el cotejo va aparte (cot), con quién y cuándo, y las fotos cotejadas (cotFot); las filas del capataz no cambian
  await expect.poll(async () => ((await dbT(page, T1)).cot || {})['11111111']).toMatchObject({ fir: true, gar: '17:40', by: 'tasis@obra.pe' });
  let d = await dbT(page, T1);
  expect(d.cot['22222222'].fir).toBe(false);
  expect(d.cotFot).toEqual(['f1']);
  expect(d.rows['11111111'].fir).toBeUndefined();
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

test('revisión: conflicto (un obrero en dos tareos), corrección con motivo y «Quitar de este tareo»', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  const cf = page.locator('#trConf');
  await expect(cf).toContainText('BETA');
  await expect(cf.locator('[data-trqt]')).toHaveText([/Teodoro Capataz · vino/, /Bruno Segundo · vino/]);
  expect(await page.evaluate(() => tConflictosDia([...TD.docs.values()]).map(x => [x.dni, x.ts.length]))).toEqual([['22222222', 2]]);
  await page.locator(`tr[data-to="${T2}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  // bloquea marcar revisado y nombra al otro capataz
  await expect(m.locator('#trObs li.tr-obl[data-k="dup"]')).toContainText('también figura en el tareo de Teodoro Capataz');
  await m.locator('#trAll').click();
  await expect(m.locator('#trRev')).toBeDisabled();
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
  let d = await dbT(page, T2);
  expect(d.st).toBe('env');
  expect(d.rows['44444444']).toMatchObject({ fin: '12:00', ext: 0 });
  expect(d.rows['22222222']).toMatchObject({ as: false, mot: 'FA', trab: 0 });
  expect(d.blq[0].dnis).toEqual(['44444444', '22222222']); // BETA conserva su bloque (0 h): si vuelve a «vino» recupera sus horas
  let h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'cor', mot: 'Salieron al mediodía', by: 'tasis@obra.pe' });
  expect(h.cam).toContain('07:30–17:00 → 07:30–12:00');
  expect(h.cam).toContain('BETA: faltó (FA)');
  // detalle estructurado (hallazgo 12)
  expect(h.det).toEqual(expect.arrayContaining([{ blq: 'c1', campo: 'fin', antes: '17:00', despues: '12:00' }, { dni: '22222222', campo: 'as', antes: true, despues: false }, { dni: '22222222', campo: 'mot', antes: null, despues: 'FA' }]));
  await expect(m.locator('#trHist')).toContainText('Corregido');
  // presente en uno y con falta en otro sigue siendo conflicto
  await expect(cf.locator(`[data-trqt="${T2}"]`)).toContainText('falta FA');
  page.once('dialog', dg => dg.accept()); // «Todos firmaron» quedó sin guardar: confirma salir
  await page.keyboard.press('Escape');
  await expect(page.locator('#trWs')).toHaveCount(0);
  page.once('dialog', dg => dg.accept('Trabajó con Teodoro'));
  await cf.locator(`[data-trq="${T2}"]`).click();
  await expect.poll(async () => !!(await dbT(page, T2)).rows['22222222']).toBe(false);
  d = await dbT(page, T2);
  expect(d.blq[0].dnis).toEqual(['44444444']);
  h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'cor', mot: 'Trabajó con Teodoro' });
  expect(h.det).toEqual(expect.arrayContaining([{ dni: '22222222', campo: 'fila', antes: true, despues: false }]));
  await expect(page.locator('#trConf')).toHaveCount(0);
  noErrors(errors, 'conflicto y corrección');
});

test('auditoría F2: corregir un revisado lo devuelve a «Enviado»; concurrencia en la corrección y en «Marcar revisado»', async ({ page }) => {
  const cot = { 11111111: { fir: true, by: 'tasis@obra.pe', t: 1 }, 22222222: { fir: true, by: 'tasis@obra.pe', t: 1 } };
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: conT1({ st: 'rev', revBy: 'tasis@obra.pe', revAt: ENV, cot, cotFot: ['f1'] }) });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  await m.locator('#trCor').click();
  await expect(m).toContainText('vuelve a «Enviado»');
  // otro usuario cambia el tareo mientras está abierto el editor: no se guarda
  await page.evaluate(id => fcol('tareo').doc(id).update({ blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '12:30', dnis: ['11111111', '22222222'] }] }), T1);
  await m.locator('#tre_fin_1').fill('16:00');
  await m.locator('#trEdOk').click();
  await expect(page.locator('#toast')).toContainText('Otro usuario cambió este tareo');
  expect((await dbT(page, T1)).blq.length).toBe(1);
  await m.locator('[data-tra="edx"]').click();
  // vuelve a abrir el editor (con los datos nuevos) y corrige: revisado → enviado
  await m.locator('#trCor').click();
  await m.locator('#tre_fin_0').fill('12:00');
  page.once('dialog', dg => dg.accept('Hora mal'));
  await m.locator('#trEdOk').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('env');
  let d = await dbT(page, T1);
  expect(d.revBy).toBeUndefined();
  expect(d.hist[d.hist.length - 1]).toMatchObject({ a: 'cor', mot: 'Hora mal' });
  expect(d.hist[d.hist.length - 1].cam).toContain('Quita revisado');
  expect(d.cot).toEqual(cot); // la corrección no toca el cotejo
  // «Marcar revisado» con la vista vieja: otro usuario quitó los bloques entre medio → no marca
  await expect(m.locator('#trRev')).toBeEnabled();
  await m.locator('#trg_11111111').fill('12:05'); // cotejo en edición (se guarda junto con «Marcar revisado»)
  // el cambio llega a la base justo antes del clic (la vista aún no se enteró)
  await page.evaluate(id => { fcol('tareo').doc(id).update({ blq: [] }); return trRevisar(id); }, T1);
  await expect(page.locator('#toast')).toContainText('Otro usuario cambió este tareo');
  d = await dbT(page, T1);
  expect(d.st).toBe('env');
  // «Guardar cotejo» solo escribe lo que cambió (la garita de ALFA): no pisa la firma que otro marcó en BETA
  await page.evaluate(id => fcol('tareo').doc(id).update({ 'cot.22222222.fir': false }), T1);
  await m.locator('#trSave').click();
  await expect.poll(async () => ((await dbT(page, T1)).cot['11111111'] || {}).gar).toBe('12:05');
  d = await dbT(page, T1);
  expect(d.cot['22222222'].fir).toBe(false);
  expect(d.cot['11111111'].fir).toBe(true);
  // ya con los datos al día: el tareo sin bloques tiene observaciones que bloquean
  await expect(m.locator('#trRev')).toBeDisabled();
  noErrors(errors, 'concurrencia');
});

test('auditoría F2: reabrir borra las firmas y conserva la garita; fotos nuevas invalidan el cotejo; lectura del cotejo antiguo', async ({ page }) => {
  const cot = { 11111111: { fir: true, gar: '17:10', by: 'tasis@obra.pe', t: 1 }, 22222222: { fir: false, by: 'tasis@obra.pe', t: 1 } };
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: conT1({ cot, cotFot: ['f1'] }) });
  await tab(page, 'tdia');
  await expect(page.locator(`tr[data-to="${T1}"] [data-l="Firmas"]`)).toHaveText('1 sin firma');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  await expect(m.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  // el capataz mandó otra foto: las firmas no valen (la garita sí)
  await page.evaluate(id => fcol('tareo').doc(id).update({ foto: ['f1', 'f2'] }), T1);
  await expect(m.locator('#trCotN')).toHaveText('0 de 2 cotejados');
  await expect(m.locator('#trCotV')).toBeVisible();
  await expect(m.locator('#trg_11111111')).toHaveValue('17:10');
  await page.evaluate(id => fcol('tareo').doc(id).update({ foto: ['f1'] }), T1);
  await expect(m.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  // reabrir: sin firmas ni cotFot; la garita queda
  page.once('dialog', dg => dg.accept('Falta una firma'));
  await m.locator('#toReab').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('reab');
  const d = await dbT(page, T1);
  expect(d.cot).toEqual({ 11111111: { gar: '17:10', by: 'tasis@obra.pe', t: 1 } });
  expect(d.cotFot).toBeUndefined();
  noErrors(errors, 'reabrir');
  // formato antiguo (cotejo en rows, aunque esté revisado): ya no se lee (segunda auditoría, A4): pide cotejar
  const leg = conT1({ st: 'rev', revBy: 'tasis@obra.pe', revAt: ENV, rows: { 11111111: row('ALFA', { fir: true, gar: '17:00' }), 22222222: row('BETA', { fir: true }), 33333333: row('GAMMA', { as: false, mot: 'DM' }) } });
  const p2 = await page.context().newPage();
  const e2 = await openApp(p2, { as: 'tasis', editar: false, extra: leg });
  await tab(p2, 'tdia');
  await expect(p2.locator(`tr[data-to="${T1}"] [data-l="Firmas"]`)).toHaveText('0 de 2');
  noErrors(e2, 'antiguo');
  const forj = conT1({ rows: { 11111111: row('ALFA', { fir: true }), 22222222: row('BETA', { fir: true }) } });
  const p3 = await page.context().newPage();
  const e3 = await openApp(p3, { as: 'tasis', editar: false, extra: forj });
  await tab(p3, 'tdia');
  await expect(p3.locator(`tr[data-to="${T1}"] [data-l="Firmas"]`)).toHaveText('0 de 2');
  noErrors(e3, 'fir del capataz');
});

test('auditoría F2: el respaldo incluye los tareos y sus fotos', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  expect(await page.evaluate(() => [BK_DATA.includes('tareo'), BK_IMG.includes('tfot'), BK_ALL.includes('tareo') && BK_ALL.includes('tfot')])).toEqual([true, true, true]);
  noErrors(errors, 'respaldo');
});

test('corrección: quitar y volver a marcar «vino» no le quita las horas al obrero (regresión)', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  await m.locator('#trCor').click();
  const alfa = m.locator('tr[data-tro="11111111"]');
  await expect(alfa).toContainText(/8[.,]5/);
  await m.locator('#tre_as_11111111').uncheck();
  await expect(alfa).not.toContainText(/8[.,]5/);
  await expect(m.getByText('figura en el')).toHaveCount(0); // sin motivo ya no hay observaciones (#trEdObs puede no estar)
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
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: SOLO });
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
  await expect(page.locator('#trCotN')).toHaveText('0 de 2 cotejados');
  await expect(page.locator('#trAll')).toHaveCount(0);
  await expect(page.locator('#trCor')).toHaveCount(0);
  await expect(page.locator('[data-tra="pas"]')).toHaveCount(0);
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

test('revisión en laptop: espacio a pantalla completa, foto a la izquierda, anterior/siguiente con teclado y redibujo sin perder el cotejo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: SOLO });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  const ws = page.locator('#trWs');
  await expect(ws).toContainText('Tareo de Teodoro Capataz');
  // ocupa toda la pantalla; la foto a la izquierda (~45 %) y la tabla a la derecha
  const W = await ws.boundingBox(), F = await page.locator('#trFoto').boundingBox(), R = await page.locator('#trRight').boundingBox();
  expect(W.width).toBe(1440);
  expect(W.height).toBe(900);
  expect(F.x).toBeLessThan(R.x);
  expect(F.width).toBeGreaterThan(1440 * 0.38);
  expect(F.width).toBeLessThan(1440 * 0.5);
  expect(F.height).toBeGreaterThan(600);
  expect(await page.evaluate(() => sessionStorage.getItem('lps.trws'))).toContain(T1);
  // la lista va por estado y nombre: Bruno, Teodoro
  await expect(page.locator('#trPos')).toHaveText('2 de 2');
  await expect(page.locator('#trNext')).toBeDisabled();
  // cotejo sin guardar + llega un cambio de otro usuario y se redibuja la app: la revisión sigue abierta y no pierde el cotejo
  await page.locator('#trAll').click();
  await expect(page.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  await page.evaluate(id => fcol('tareo').doc(id).update({ ts: 99 }), T1);
  await page.evaluate(() => render());
  await expect(ws).toBeVisible();
  await expect(page.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  await expect(page.locator('#trSave')).toBeVisible();
  // ← al anterior: pregunta por el cotejo sin guardar
  let asked = '';
  page.once('dialog', dg => { asked = dg.message(); dg.accept(); });
  await page.keyboard.press('ArrowLeft');
  await expect(ws).toContainText('Tareo de Bruno Segundo');
  expect(asked).toContain('cotejo');
  await expect(page.locator('#trPos')).toHaveText('1 de 2');
  await expect(page.locator('#trPrev')).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(ws).toContainText('Tareo de Teodoro Capataz');
  await expect(page.locator('#trCotN')).toHaveText('0 de 2 cotejados');
  // corregir dentro del mismo espacio: la foto sigue a la izquierda
  await page.locator('#trCor').click();
  await expect(page.locator('#trRight')).toContainText('Corregir el tareo');
  await expect(page.locator('#trFoto #trImg')).toHaveCount(1);
  await expect(page.locator('#trEdOk')).toBeVisible();
  await page.locator('#trEdX').click();
  // Esc vuelve a la lista
  await page.keyboard.press('Escape');
  await expect(ws).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('lps.trws'))).toBeNull();
  noErrors(errors, 'espacio de revisión');
});

test('revisión: pasar un obrero al tareo de otro capataz (con sus bloques, motivo e historial en los dos)', async ({ page }) => {
  const T3 = HOY + '_tcap3@obra.pe';
  const cot = { 11111111: { fir: true, by: 'tasis@obra.pe', t: 1 }, 22222222: { fir: true, by: 'tasis@obra.pe', t: 1 } };
  const extra = conT1({ cot, cotFot: ['f1'] }).map(x => x[0] === 'tareo' && x[1] === T2 ? ['tareo', T2, { ...x[2], st: 'rev', revBy: 'tasis@obra.pe', revAt: ENV }] : x)
    .concat([['tareo', T3, { date: HOY, cap: 'tcap3@obra.pe', capN: 'Zoila Sinempezar', st: 'bor', rows: { 55555555: row('EPSILON') }, blq: [], hist: [], by: 'tcap3@obra.pe', ts: 1 }]]);
  const errors = await openApp(page, { as: 'tasis', editar: false, extra });
  await tab(page, 'tdia');
  await page.locator(`tr[data-to="${T1}"] button[data-to]`).click();
  await page.locator('tr[data-trd="22222222"] [data-tra="pas"]').click();
  const dl = page.locator('#lqm');
  await expect(dl).toContainText('Pasar a otro capataz');
  // solo a un tareo enviado o revisado; Zoila lo está llenando
  await expect(dl.locator(`input[value="${T2}"]`)).toBeEnabled();
  await expect(dl.locator(`input[value="${T2}"]`)).toBeChecked();
  await expect(dl.locator('input[data-cap="tcap3@obra.pe"]')).toBeDisabled();
  await expect(dl).toContainText('lo está llenando');
  await page.locator('#trPok').click();
  await expect(page.locator('#toast')).toContainText('Escribe el motivo');
  await page.locator('#trPm').fill('Trabajó con Bruno');
  await page.locator('#trPok').click();
  await expect.poll(async () => !!(await dbT(page, T2)).rows['22222222']).toBe(true);
  const a = await dbT(page, T1), b = await dbT(page, T2);
  // origen: sin su fila, fuera de los bloques y sin su cotejo
  expect(a.rows['22222222']).toBeUndefined();
  expect(a.blq.map(x => x.dnis)).toEqual([['11111111'], ['11111111']]);
  expect(Object.keys(a.cot)).toEqual(['11111111']);
  expect(a.hist[a.hist.length - 1]).toMatchObject({ a: 'cor', mot: 'Trabajó con Bruno', by: 'tasis@obra.pe' });
  expect(a.hist[a.hist.length - 1].cam).toContain('Pasado al tareo de Bruno Segundo');
  expect(a.hist[a.hist.length - 1].det).toEqual(expect.arrayContaining([{ dni: '22222222', campo: 'fila', antes: true, despues: false }]));
  // destino: con sus mismas horas en bloques equivalentes; el revisado vuelve a «Enviado»
  expect(b.st).toBe('env');
  expect(b.revBy).toBeUndefined();
  expect(b.rows['22222222']).toMatchObject({ ape: 'BETA', as: true, trab: 8.5 });
  expect(b.rows['22222222'].fir).toBeUndefined();
  expect(b.blq[0]).toMatchObject({ id: 'c1', dnis: ['44444444'] });
  expect(b.blq.slice(1).map(x => [x.pc, x.ini, x.fin, x.dnis])).toEqual([['p10_05', '07:30', '12:00', ['22222222']], ['p10_10', '13:00', '17:00', ['22222222']]]);
  expect(b.hist[b.hist.length - 1]).toMatchObject({ a: 'cor', mot: 'Trabajó con Bruno' });
  expect(b.hist[b.hist.length - 1].cam).toContain('Recibido del tareo de Teodoro Capataz');
  // la revisión abierta se actualiza
  await expect(page.locator('#trWs tr[data-trd="22222222"]')).toHaveCount(0);
  await expect(page.locator('#trCotN')).toHaveText('1 de 1 cotejados');
  // el tareo en borrador del capataz no se toca
  expect((await dbT(page, T3)).rows).toEqual({ 55555555: row('EPSILON') });
  noErrors(errors, 'pasar obrero');
});
