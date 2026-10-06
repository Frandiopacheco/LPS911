// Jefe de producción con edición completa y hoja tipo Excel (pedido del dueño, 06-10-2026; docs/ia/tareo.md «Revisión de
// producción — implementación» y «Jefe con edición completa y grilla tipo Excel»). El jefe (editor con tpub) y el admin revisan y
// editan un tareo por horas «Enviado» o «Revisado» en la hoja: teclado, mover horas, agregar/quitar partida y obrero, autofiltros,
// pegar rangos, deshacer, aviso de HH totales cambiadas; cotejo, revisado y reabrir como la oficina. Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const per = (dni, ape, cap, cua = 'ALBAÑILES') => ['tper', dni, { dni, ape, nom: 'X', pue: 'OPERARIO', cat: 'OP', cua, cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const row = (ape, o = {}) => ({ ape, nom: 'X', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false, ...o });
const T1 = HOY + '_tcap@obra.pe', T2 = HOY + '_tcap2@obra.pe';
const ENV = Date.parse(HOY + 'T08:40:00-05:00');
const COT = { 11111111: { fir: true, by: 'tasis@obra.pe', t: 1 }, 22222222: { fir: true, by: 'tasis@obra.pe', t: 1 } };
const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const base = (o1 = {}, o2 = {}, more = []) => [
  ['members', 'tcap2@obra.pe', { role: 'tcap', name: 'Bruno Segundo' }],
  ['tcfg', 'main', { limEnv: '18:00', tolGar: 15 }],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales', act: true }],
  ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true }],
  ['tpc', 'p10_20', { cod: '10.20', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Acero de vigas', act: true }],
  per('11111111', 'ALFA', 'tcap@obra.pe'), per('22222222', 'BETA', 'tcap@obra.pe'), per('33333333', 'GAMMA', 'tcap@obra.pe'), per('44444444', 'DELTA', 'tcap2@obra.pe'),
  per('55555555', 'EPSILON', 'tcap2@obra.pe', 'CARPINTEROS'),
  ['tfot', 'f1', { date: HOY, cap: 'tcap@obra.pe', n: 1, d: FOTO, by: 'tcap@obra.pe', ts: 1 }],
  ['tareo', T1, { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: ENV, envN: 1, envBy: 'tcap@obra.pe', foto: ['f1'], cotFot: ['f1'], cot: COT, cfg: CFG,
    modo: 'hrs', pcs: ['p10_10', 'p10_05'],
    rows: { 11111111: row('ALFA', { h: { p10_10: 4, p10_05: 4.5 } }), 22222222: row('BETA', { h: { p10_05: 8.5 } }), 33333333: row('GAMMA', { as: false, mot: 'DM', h: {} }) },
    hist: [{ t: ENV, by: 'tcap@obra.pe', a: 'env' }], by: 'tcap@obra.pe', ts: 1, ...o1 }],
  ['tareo', T2, { date: HOY, cap: 'tcap2@obra.pe', capN: 'Bruno Segundo', st: 'rev', envAt: ENV, envN: 1, foto: ['f1'], cotFot: ['f1'], cot: { 44444444: { fir: true } }, cfg: CFG,
    revAt: ENV + 1000, revBy: 'tasis@obra.pe', modo: 'hrs', pcs: ['p10_05'], rows: { 44444444: row('DELTA', { h: { p10_05: 8.5 } }) },
    hist: [{ t: ENV, by: 'tcap2@obra.pe', a: 'env' }, { t: ENV + 1000, by: 'tasis@obra.pe', a: 'rev' }], by: 'tasis@obra.pe', ts: 1, ...o2 }],
  ...more,
];
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);
const dbT = (page, id) => page.evaluate(id => window.__dbGet('tareo', id), id);
const cell = (m, d, pc) => m.locator(`#trh_${d}_${pc}`);
const abrir = async (page, id) => { await tab(page, 'tdia'); await page.locator(`tr[data-to="${id}"] button[data-to]`).click(); const m = page.locator('#trWs'); await expect(m.locator('#txW')).toBeVisible(); return m; };
/* pegar como lo hace el navegador con Ctrl+V (el texto de Excel viene con tabulaciones y saltos de línea) */
const pegar = (page, txt) => page.evaluate(txt => { const dt = new DataTransfer(); dt.setData('text/plain', txt); document.getElementById('txW').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, txt);
const copiar = page => page.evaluate(() => { const dt = new DataTransfer(); document.getElementById('txW').dispatchEvent(new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })); return dt.getData('text/plain'); });
const rowsVis = m => m.locator('#txT tbody tr[data-dni]');

test('hoja: el jefe edita con el teclado, mueve horas, agrega partida y cambia un total (aviso, confirmación y motivo); sin tocar la asistencia queda como revisión de producción', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base() });
  const m = await abrir(page, T1);
  // un solo espacio: sin el interruptor oficina/producción; el jefe tiene las acciones de la oficina; la foto va plegada al empezar
  await expect(m.locator('.tr-mode')).toHaveCount(0);
  for (const s of ['#trRev', '#toReab', '#trPrConf', '#txAddO', '#trPcAdd']) await expect(m.locator(s)).toBeVisible();
  await expect(m.locator('#trFoto')).toBeHidden();
  await m.locator('#trPfo').click();
  await expect(m.locator('#trFoto')).toBeVisible();
  await m.locator('#trPfo').click();
  await expect(m.locator('#trFoto')).toBeHidden();
  // GAMMA no vino: su fila está, atenuada; sus horas no se editan
  await expect(m.locator('tr[data-dni="33333333"]')).toHaveClass(/tx-no/);
  // ALFA: mover 2 de sus 4 h de 10.10 a 10.05 (por defecto propone todo)
  await cell(m, '11111111', 'p10_10').click();
  await expect(m.locator('#txAdr')).toHaveText('ALFA · 10.10');
  await m.locator('#trMv').click();
  await expect(page.locator('#trMvN')).toHaveValue('4');
  await expect(page.locator('#lqm input[name="trMvP"][value="p10_05"]')).toBeChecked();
  await page.locator('#trMvN').fill('2');
  await page.locator('#trMvOk').click();
  await expect(cell(m, '11111111', 'p10_10')).toHaveText('2');
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('6.5');
  await expect(cell(m, '11111111', 'p10_05')).toHaveClass(/tx-ch/);
  await expect(m.locator('#trht_11111111')).toHaveText('8.5');
  await expect(m.locator('tr[data-dni="11111111"]')).not.toHaveClass(/tx-tch/);
  await expect(m.locator('#trEdN')).toHaveText('2 cambios sin guardar');
  // con cambios sin guardar no se marca revisado ni se reabre (primero guardar o descartar)
  await expect(m.locator('#trRev')).toHaveCount(0);
  // BETA 10.05: escribir directo reemplaza; 9 y Enter baja a la fila siguiente
  await cell(m, '22222222', 'p10_05').click();
  await page.keyboard.type('9');
  await expect(m.locator('#txIn')).toHaveValue('9');
  await page.keyboard.press('Enter');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('9');
  await expect(m.locator('#txT td.tx-act')).toHaveCount(1);
  await expect(m.locator('#txAdr')).toHaveText('GAMMA · 10.05');
  await expect(m.locator('tr[data-dni="22222222"]')).toHaveClass(/tx-tch/);
  await expect(m.locator('#trPrTot')).toContainText('Cambiaste las HH totales de 1 obrero: ya no coinciden con lo que firmaron en el formato');
  // GAMMA no vino: escribir en su celda de horas no hace nada (avisa por qué)
  await page.keyboard.type('5');
  await expect(m.locator('#txIn')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('No vino');
  // agregar una partida del día: la columna aparece y queda elegida su primera celda
  await m.locator('#trPcAdd').selectOption('p10_20');
  await expect(m.locator('th[data-pc="p10_20"]')).toBeVisible();
  await expect(m.locator('#txAdr')).toHaveText('ALFA · 10.20');
  // guardar: confirmación (lista) y motivo obligatorio
  const asked = [];
  page.on('dialog', dg => { asked.push(dg.message()); dg.type() === 'prompt' ? dg.accept('BETA se quedó 30 min más en pedestales') : dg.accept(); });
  await m.locator('#trEdOk').click();
  await expect.poll(async () => ((await dbT(page, T1)).prod || {}).by).toBe('jefe@obra.pe');
  expect(asked[0]).toContain('Cambiaste las HH totales de 1 obrero');
  expect(asked[0]).toContain('BETA, X: 8,5 → 9 h');
  expect(asked[1]).toContain('Motivo (obligatorio');
  const d = await dbT(page, T1);
  expect(d.st).toBe('env');
  expect(d.cot).toEqual(COT);
  expect(d.pcs).toEqual(['p10_10', 'p10_05', 'p10_20']);
  expect(d.rows['11111111'].h).toEqual({ p10_10: 2, p10_05: 6.5 });
  expect(d.rows['22222222']).toMatchObject({ h: { p10_05: 9 }, trab: 9, ext: 0.5 });
  expect(d.rows['33333333'].as).toBe(false);
  expect(d.prod).toMatchObject({ by: 'jefe@obra.pe', byN: 'Jaime Jefe' });
  const h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'prod', by: 'jefe@obra.pe', tot: true, mot: 'BETA se quedó 30 min más en pedestales' });
  expect(h.det).toEqual(expect.arrayContaining([{ dni: '22222222', pc: 'p10_05', campo: 'h', antes: 8.5, despues: 9 }, { pc: 'p10_20', campo: 'pcs', antes: false, despues: true }]));
  // la hoja sigue abierta con lo guardado; la lista del día muestra el chip
  await expect(m.locator('#trPrConf')).toHaveText('Conforme otra vez');
  await expect(m.locator('#trHead .tr-prodc')).toHaveText('Producción ✓');
  await expect(m.locator('#trEdN')).toHaveCount(0);
  await expect(cell(m, '22222222', 'p10_05')).not.toHaveClass(/tx-ch/);
  await m.locator('#trBack').click();
  await expect(page.locator(`tr[data-to="${T1}"] .tr-prodc`)).toHaveText('Producción ✓');
  noErrors(errors, 'hoja jefe');
});

test('hoja: autofiltro por columna (cuadrilla, «con horas en esta partida», total ≠ jornada), orden, buscador y chips con «Limpiar»', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const more = [per('66666666', 'ZETA', 'tcap@obra.pe', 'CARPINTEROS'), per('77777777', 'ETA', 'tcap@obra.pe', 'CARPINTEROS')];
  const rows = { 11111111: row('ALFA', { h: { p10_10: 4, p10_05: 4.5 } }), 22222222: row('BETA', { h: { p10_05: 8.5 } }), 33333333: row('GAMMA', { as: false, mot: 'DM', h: {} }),
    66666666: row('ZETA', { cua: 'CARPINTEROS', h: { p10_10: 8.5 } }), 77777777: row('ETA', { cua: 'CARPINTEROS', h: { p10_10: 6 } }) };
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base({ rows, cot: {} }, {}, more) });
  const m = await abrir(page, T1);
  await expect(rowsVis(m)).toHaveCount(5);
  await expect(m.locator('#txCnt')).toHaveText('5 obreros');
  // Cuadrilla: el menú lista los valores con su cantidad; se desmarca CARPINTEROS
  await m.locator('th[data-k="cua"] [data-txf]').click();
  const mn = page.locator('#txMenu');
  await expect(mn).toBeVisible();
  await expect(mn.locator('label[data-v="carpinteros"] i')).toHaveText('2');
  await mn.locator('input[data-txv="CARPINTEROS"]').uncheck();
  await expect(mn.locator('input[data-txv="__all"]')).not.toBeChecked();
  await mn.locator('[data-txm="ok"]').click();
  await expect(rowsVis(m)).toHaveCount(3);
  await expect(m.locator('#txCnt')).toHaveText('Mostrando 3 de 5');
  await expect(m.locator('.tx-chip[data-k="cua"]')).toContainText('Cuadrilla ALBAÑILES');
  await expect(m.locator('th[data-k="cua"]')).toHaveClass(/tx-hf/);
  // los totales de abajo son de lo filtrado
  await expect(m.locator('#trhc_p10_05')).toHaveText('13');
  // 10.10: «solo con horas en esta partida» (además del filtro de cuadrilla) → solo ALFA
  await m.locator('th[data-k="h:p10_10"] [data-txf]').click();
  await page.locator('#txMenu [data-txm="hon"]').click();
  await expect(rowsVis(m)).toHaveCount(1);
  await expect(rowsVis(m).first()).toHaveAttribute('data-dni', '11111111');
  // quitar el filtro de cuadrilla desde su chip: ALFA, ZETA y ETA tienen horas en 10.10
  await m.locator('.tx-chip[data-k="cua"] [data-txcx]').click();
  await expect(rowsVis(m)).toHaveCount(3);
  // ordenar por total, de mayor a menor
  await m.locator('th[data-k="tot"] [data-txf]').click();
  await page.locator('#txMenu [data-txm="desc"]').click();
  await expect(rowsVis(m).nth(0)).toHaveAttribute('data-dni', /11111111|66666666/);
  await expect(rowsVis(m).nth(2)).toHaveAttribute('data-dni', '77777777');
  await expect(m.locator('th[data-k="tot"]')).toHaveAttribute('aria-sort', 'descending');
  // «Total ≠ jornada»: ETA (6 h) es el único de esos que no suma 8,5
  await m.locator('[data-txfx="nej"]').click();
  await expect(rowsVis(m)).toHaveCount(1);
  await expect(rowsVis(m).first()).toHaveAttribute('data-dni', '77777777');
  // «Limpiar filtros» vuelve a todos; el buscador filtra por nombre o DNI
  await m.locator('#txClr').click();
  await expect(rowsVis(m)).toHaveCount(5);
  await m.locator('#txQ').fill('zeta');
  await expect(rowsVis(m)).toHaveCount(1);
  await expect(m.locator('#txClr')).toBeVisible();
  await m.locator('#txQ').fill('');
  await expect(rowsVis(m)).toHaveCount(5);
  // «Solo cambiados»: sin cambios no hay filas; tras cambiar una celda, solo esa fila
  await m.locator('[data-txfx="chg"]').click();
  await expect(rowsVis(m)).toHaveCount(0);
  await expect(m.locator('.tx-empty')).toContainText('Ningún obrero cumple los filtros');
  await m.locator('[data-txfx="chg"]').click();
  await cell(m, '77777777', 'p10_10').click();
  await page.keyboard.type('8.5');
  await page.keyboard.press('Enter');
  await m.locator('[data-txfx="chg"]').click();
  await expect(rowsVis(m)).toHaveCount(1);
  noErrors(errors, 'autofiltro');
});

test('hoja: pegar un rango (de Excel), copiar, Ctrl+D, Supr, Ctrl+Z / Ctrl+Y y barra de suma', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base() });
  const m = await abrir(page, T1);
  // copiar un rango de 2 × 2 (Mayús+clic) y la barra de suma
  await cell(m, '11111111', 'p10_10').click();
  await cell(m, '22222222', 'p10_05').click({ modifiers: ['Shift'] });
  await expect(m.locator('#txT td.tx-sel')).toHaveCount(4);
  await expect(m.locator('#txSs')).toHaveText('17');
  await expect(m.locator('#txSp')).toHaveText('5.67');
  await expect(m.locator('#txSc')).toHaveText('3');
  expect(await copiar(page)).toBe('4\t4.5\n\t8.5');
  // pegar desde Excel (con coma decimal y salto de línea final) en la celda activa: ocupa 2 × 2
  await cell(m, '11111111', 'p10_10').click();
  await pegar(page, '1\t2,5\r\n3\t4\r\n');
  await expect(page.locator('#toast')).toContainText('Se pegaron 4 celdas');
  await expect(cell(m, '11111111', 'p10_10')).toHaveText('1');
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('2.5');
  await expect(cell(m, '22222222', 'p10_10')).toHaveText('3');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('4');
  await expect(m.locator('#txT td.tx-sel')).toHaveCount(4);
  await expect(m.locator('#txSs')).toHaveText('10.5');
  await expect(m.locator('#trEdN')).toHaveText('4 cambios sin guardar');
  // Ctrl+Z deshace el pegado entero; Ctrl+Y lo rehace; Ctrl+Z otra vez
  await page.keyboard.press('Control+z');
  await expect(cell(m, '11111111', 'p10_10')).toHaveText('4');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('8.5');
  await expect(m.locator('#trEdN')).toHaveCount(0);
  await page.keyboard.press('Control+y');
  await expect(cell(m, '22222222', 'p10_10')).toHaveText('3');
  await page.keyboard.press('Control+z');
  await expect(cell(m, '22222222', 'p10_10')).toHaveText('');
  // un solo valor sobre un rango lo rellena; los que no vinieron (GAMMA) se saltan
  await cell(m, '11111111', 'p10_10').click();
  await cell(m, '33333333', 'p10_10').click({ modifiers: ['Shift'] });
  await pegar(page, '2');
  await expect(page.locator('#toast')).toContainText('Se pegaron 2 celdas · 1 no se editan');
  await expect(cell(m, '22222222', 'p10_10')).toHaveText('2');
  await expect(cell(m, '33333333', 'p10_10')).toHaveText('');
  // Supr vacía; Ctrl+D copia la primera fila hacia abajo
  await page.keyboard.press('Delete');
  await expect(cell(m, '11111111', 'p10_10')).toHaveText('');
  await cell(m, '11111111', 'p10_05').click();
  await cell(m, '22222222', 'p10_05').click({ modifiers: ['Shift'] });
  await page.keyboard.press('Control+d');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('4.5');
  // «Rellenar con…» pone un valor en la selección
  page.once('dialog', dg => dg.accept('8,5'));
  await m.locator('#txFill').click();
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('8.5');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('8.5');
  // los botones de deshacer y rehacer también funcionan
  await m.locator('#txUn').click();
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('4.5');
  await m.locator('#txRe').click();
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('8.5');
  // un valor no válido no se escribe
  await cell(m, '11111111', 'p10_05').click();
  await pegar(page, 'abc');
  await expect(page.locator('#toast')).toContainText('con valor no válido');
  await expect(cell(m, '11111111', 'p10_05')).toHaveText('8.5');
  noErrors(errors, 'pegar');
});

test('hoja: el jefe coteja una firma, marca revisado y reabre al capataz (la marca de producción se borra)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base({ cot: { 11111111: COT[11111111] }, prod: { t: ENV + 50, by: 'jefe@obra.pe', byN: 'Jaime Jefe' } }) });
  const m = await abrir(page, T1);
  await expect(m.locator('#trCotN')).toHaveText('1 de 2 cotejados');
  await expect(m.locator('#trRev')).toBeDisabled();
  // Firmó de BETA: «s» en su celda; queda «Guardar cotejo» y se puede marcar revisado
  await m.locator('tr[data-dni="22222222"] td').nth(m === null ? 0 : await m.locator('th[data-k="fir"]').evaluate(th => th.cellIndex)).click();
  await page.keyboard.type('s');
  await page.keyboard.press('Enter');
  await expect(m.locator('#trCotN')).toHaveText('2 de 2 cotejados');
  await expect(m.locator('#trSave')).toBeVisible();
  await expect(m.locator('#trRev')).toBeEnabled();
  await m.locator('#trRev').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('rev');
  let d = await dbT(page, T1);
  expect(d.revBy).toBe('jefe@obra.pe');
  expect(d.cot['22222222']).toMatchObject({ fir: true, by: 'jefe@obra.pe' });
  expect(d.hist[d.hist.length - 1]).toMatchObject({ a: 'rev', by: 'jefe@obra.pe' });
  await expect(m.locator('#trQrev')).toBeVisible();
  // reabrir al capataz (motivo): se quitan las firmas y la marca de producción
  page.once('dialog', dg => dg.accept('Falta la hoja 2 del formato'));
  await m.locator('#toReab').click();
  await expect.poll(async () => (await dbT(page, T1)).st).toBe('reab');
  d = await dbT(page, T1);
  expect(d.reab).toMatchObject({ by: 'jefe@obra.pe', mot: 'Falta la hoja 2 del formato' });
  expect(d.prod).toBeUndefined();
  expect(d.cot).toBeUndefined();
  // reabierto: solo lectura (sin la hoja)
  await expect(m.locator('#txW')).toHaveCount(0);
  noErrors(errors, 'revisado y reabrir');
});

test('hoja: el jefe agrega un obrero (de otra cuadrilla, con aviso), le pone horas y quita a otro; se guarda como corrección', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base() });
  const m = await abrir(page, T1);
  await m.locator('#txAddO').click();
  const q = page.locator('#txAq');
  await q.fill('delta');
  // DELTA ya figura en el tareo de Bruno: no se agrega (se pasa con ⇄ desde allá)
  await expect(page.locator('#txAl [data-txadd="44444444"]')).toBeDisabled();
  await expect(page.locator('#txAl')).toContainText('ya figura en el tareo de Bruno Segundo');
  await q.fill('epsi');
  await expect(page.locator('#txAl [data-txadd="55555555"]')).toContainText('de Bruno Segundo');
  const asked = [];
  page.on('dialog', dg => { asked.push(dg.message()); dg.type() === 'prompt' ? dg.accept('Trabajó con esta cuadrilla todo el día') : dg.accept(); });
  await page.locator('#txAl [data-txadd="55555555"]').click();
  await expect(m.locator('tr[data-dni="55555555"]')).toHaveClass(/tx-new/);
  expect(asked[0]).toContain('no es de la cuadrilla de Teodoro Capataz');
  await expect(m.locator('tr[data-dni="55555555"] .tx-nm')).toContainText('otra cuadrilla');
  // queda elegida su primera celda de horas: escribir directo
  await expect(m.locator('#txAdr')).toHaveText('EPSILON · 10.10');
  await page.keyboard.type('8.5');
  await page.keyboard.press('Tab');
  await expect(cell(m, '55555555', 'p10_10')).toHaveText('8.5');
  await expect(m.locator('#trht_55555555')).toHaveClass(/tx-ok/);
  // quitar a GAMMA (✕) y deshacer; luego quitarlo de verdad
  await m.locator('tr[data-dni="33333333"] [data-txa="rm"]').click();
  await expect(m.locator('tr[data-dni="33333333"]')).toHaveCount(0);
  await m.locator('#txW').focus();
  await page.keyboard.press('Control+z');
  await expect(m.locator('tr[data-dni="33333333"]')).toHaveCount(1);
  await m.locator('tr[data-dni="33333333"] [data-txa="rm"]').click();
  await expect(m.locator('#trEdN')).toHaveText('2 cambios sin guardar'); // obrero agregado (con sus horas) y obrero quitado
  await m.locator('#trEdOk').click();
  await expect.poll(async () => !!(await dbT(page, T1)).rows['55555555']).toBe(true);
  const d = await dbT(page, T1);
  expect(d.rows['55555555']).toMatchObject({ ape: 'EPSILON', cua: 'CARPINTEROS', as: true, ajeno: true, capOrig: 'tcap2@obra.pe', h: { p10_10: 8.5 }, trab: 8.5 });
  expect(d.rows['33333333']).toBeUndefined();
  expect(d.st).toBe('env');
  const h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'cor', by: 'jefe@obra.pe', mot: 'Trabajó con esta cuadrilla todo el día' });
  expect(h.det).toEqual(expect.arrayContaining([{ dni: '55555555', campo: 'fila', antes: false, despues: true }, { dni: '33333333', campo: 'fila', antes: true, despues: false }]));
  expect(d.prod).toMatchObject({ by: 'jefe@obra.pe' });
  noErrors(errors, 'agregar obrero');
});

test('hoja: «Conforme sin cambios» del admin; si otro usuario cambia el tareo, «Recargar versión actual» conserva lo cambiado; captura 1440×900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'admin', editar: false, extra: base() });
  let m = await abrir(page, T2);
  await expect(m.locator('#trQrev')).toBeVisible();
  page.once('dialog', dg => dg.accept());
  await m.locator('#trPrConf').click();
  await expect.poll(async () => !!(await dbT(page, T2)).prod).toBe(true);
  const d = await dbT(page, T2);
  expect(d.st).toBe('rev');
  expect(d.hist[d.hist.length - 1]).toMatchObject({ a: 'prod', cam: 'Conforme sin cambios', by: 'frandiopacheco@gmail.com' });
  await m.locator('#trBack').click();
  m = await abrir(page, T1);
  await cell(m, '11111111', 'p10_10').dblclick();
  await expect(m.locator('#txIn')).toHaveValue('4');
  await m.locator('#txIn').fill('4.5');
  await page.keyboard.press('Enter');
  await page.evaluate(id => fcol('tareo').doc(id).update({ 'rows.22222222.h': { p10_05: 8 } }), T1);
  await expect(m.locator('#trConfl')).toBeVisible();
  await m.locator('#trReload').click();
  await expect(cell(m, '11111111', 'p10_10')).toHaveText('4.5');
  await expect(cell(m, '22222222', 'p10_05')).toHaveText('8');
  await expect(m.locator('tr[data-dni="11111111"]')).toHaveClass(/tx-tch/);
  await cell(m, '11111111', 'p10_05').click();
  await cell(m, '22222222', 'p10_05').click({ modifiers: ['Shift'] });
  if (process.env.TP_SHOT) await page.screenshot({ path: process.env.TP_SHOT });
  noErrors(errors, 'conforme y conflicto');
});

test('hoja: 60 obreros × 15 partidas se mueve con fluidez (teclear, pegar, filtrar); captura 1440×900 con la foto al lado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const AP = ['QUISPE MAMANI', 'HUAMAN CCORI', 'MAMANI TICONA', 'FLORES ROJAS', 'CONDORI APAZA', 'RAMOS CHAVEZ', 'TORRES VEGA', 'CHOQUE LIMA', 'GUTIERREZ PAZ', 'SALAS NINA'];
  const NO = ['JUAN CARLOS', 'PEDRO', 'LUIS ALBERTO', 'MIGUEL', 'JOSE LUIS', 'VICTOR'];
  const CU = ['ALBAÑILES', 'CARPINTEROS', 'FIERREROS', 'ANDAMIEROS'];
  const pcs = Array.from({ length: 15 }, (_, i) => 'p20_' + String(i + 1).padStart(2, '0'));
  const NOM = ['Encofrado de muros', 'Acero de columnas', 'Concreto en losas', 'Desencofrado', 'Andamios', 'Limpieza de obra', 'Habilitado de acero', 'Curado de concreto', 'Tarrajeo de muros', 'Solaqueo', 'Asentado de ladrillo', 'Vaciado de vigas', 'Trazo y replanteo', 'Excavación manual', 'Acarreo de material'];
  const extra = pcs.map((id, i) => ['tpc', id, { cod: '20.' + String(i + 1).padStart(2, '0'), grp: '20', grpN: 'ESTRUCTURAS', nom: NOM[i], act: true }]);
  const rows = {}, cot = {};
  for (let i = 0; i < 60; i++) {
    const d = String(40000000 + i * 1371);
    const as = i % 13 !== 5;
    const h = {}; if (as) { const a = i % 15, b = (i * 7 + 3) % 15; h[pcs[a]] = 4; h[pcs[b]] = (h[pcs[b]] || 0) + (i % 9 === 0 ? 5 : 4.5); }
    rows[d] = { ape: AP[i % AP.length], nom: NO[i % NO.length], cat: ['OP', 'OF', 'PE'][i % 3], cua: CU[i % CU.length], as, mot: as ? '' : 'DM', alt: i % 11 === 0, h };
    extra.push(per(d, AP[i % AP.length], 'tcap@obra.pe', CU[i % CU.length]));
    if (as && i % 4) cot[d] = { fir: i % 17 !== 3, by: 'tasis@obra.pe', t: 1 };
  }
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base({ rows, pcs, cot }, {}, extra) });
  await page.evaluate(() => { localStorage.setItem('lps.trfo', '1'); localStorage.setItem('lps.trfw', '420'); TR.pfo = null; });
  const m = await abrir(page, T1);
  await expect(rowsVis(m)).toHaveCount(60);
  await expect(m.locator('#trFoto')).toBeVisible();
  const K = Object.keys(rows);
  // teclear 20 celdas seguidas (escribir + Enter, medido dentro de la página hasta el cuadro siguiente): cada una redibuja la hoja
  await cell(m, K[1], pcs[0]).click();
  const T = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      const a = performance.now();
      document.getElementById('txW').dispatchEvent(new KeyboardEvent('keydown', { key: String(1 + (i % 8)), bubbles: true, cancelable: true }));
      document.getElementById('txIn').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      void document.body.offsetHeight;
      await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
      out.push(performance.now() - a);
    }
    return out.sort((x, y) => x - y);
  });
  await expect(m.locator('#trEdN')).toBeVisible();
  const ms = T[10];
  // pegar un bloque de 10 × 5 y filtrar por cuadrilla
  await cell(m, K[2], pcs[3]).click();
  const t1 = Date.now();
  await pegar(page, Array.from({ length: 10 }, () => '1\t2\t3\t4\t5').join('\n'));
  await expect(page.locator('#toast')).toContainText('Se pegaron');
  const msP = Date.now() - t1;
  await m.locator('th[data-k="cua"] [data-txf]').click();
  await page.locator('#txMenu input[data-txv="__all"]').uncheck();
  await page.locator('#txMenu input[data-txv="FIERREROS"]').check();
  await page.locator('#txMenu [data-txm="ok"]').click();
  await expect(rowsVis(m)).toHaveCount(15);
  await m.locator('#txClr').click();
  console.log(`hoja 60×15: mediana ${ms.toFixed(0)} ms por celda tecleada (hasta el cuadro siguiente), ${msP} ms al pegar 10×5 (con Playwright)`);
  expect(ms).toBeLessThan(150); // medido: ~30 ms
  await page.keyboard.press('Control+z');
  await cell(m, K[3], pcs[2]).click();
  await cell(m, K[7], pcs[5]).click({ modifiers: ['Shift'] });
  if (process.env.TP_SHOT2) await page.screenshot({ path: process.env.TP_SHOT2 });
  noErrors(errors, 'hoja 60x15');
});
