// Módulo Tareo (fase 0): utilidades puras (horas, DNI, parsers del máster de RR.HH. y de la lista de partidas),
// alta manual con DNI duplicado, importación del Excel de RR.HH., partidas de control y jornada.
// Todos los datos son inventados (imitan el formato real de los archivos).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx-js-style');
const XLSX_JS = require.resolve('xlsx-js-style/dist/xlsx.bundle.js');
const EXCELJS = require.resolve('exceljs/dist/exceljs.min.js');
const ExcelJS = require('exceljs');
const conExcel = async page => {
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));
  await page.route(/cdn\.jsdelivr\.net\/npm\/exceljs/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(EXCELJS, 'utf8') }));
};

const EXTRA = [
  ['members', 'tcap1@obra.pe', { role: 'tcap', name: 'Tito Capataz' }],
  ['tper', '01234567', { dni: '01234567', ape: 'PRUEBA UNO', nom: 'ANA', pue: 'OPERARIO ALBAÑIL', cat: 'OP', cua: 'ALBAÑILES', cap: 'tcap1@obra.pe', ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }],
];
const HDR = ['N°', 'Nombre', 'Tipo\r\nTrab.', 'Fecha\r\nDe Ingreso', 'Título\r\nPuesto', 'CATEGORIA', 'DNI', 'Comentarios', ''];
/* filas como las del máster de RR.HH.: DNI numérico sin cero inicial, reingreso, cese como texto y como fecha, encabezado repetido, DNI con basura */
const serial = iso => (Date.UTC(...iso.split('-').map((v, i) => i === 1 ? v - 1 : +v)) / 864e5) + 25569;
const MASTER = [
  HDR,
  ['1', 'PRUEBA UNO,  ANA', 'C', serial('2026-01-05'), 'OPERARIO ALBAÑIL', 'ALBAÑILES', '01234567', '', ''], // igual que la ficha existente…
  ['2', 'FICTICIO DOS, BETO', 'C', serial('2026-02-10'), 'PEON', 'CARPINTEROS', 3684337, '15/03/2026', 'Renuncia'],
  ['3', 'FICTICIO DOS, BETO', 'C', serial('2026-05-04'), 'OFICIAL CARPINTERO', 'CARPINTEROS', '03684337', 'Reingreso', ''],
  ['', '', '', '', '', '', '', '', ''],
  ['N°', 'Nombre', 'Tipo\r\nTrab.', 'Fecha\r\nDe Ingreso', 'Título\r\nPuesto', 'CATEGORIA', 'DNI', 'Fecha de cese', ''],
  ['4', 'INVENTADO TRES, CARLA', 'C', serial('2026-03-01'), 'RIGGER', 'ANDAMIEROS', '45678901', serial('2026-09-15'), 'Termino de partida'],
  ['5', 'RARO CUATRO, DIEGO', 'C', serial('2026-03-01'), 'PEON-VIGIA', 'VIGIAS', '43241048 II', '', ''],
];
const PARTIDAS = [
  ['', '', '', '', '', '', '', '', ''],
  ['', 'PARTIDAS DEL PRESUPUESTO', '', '', '', '', '', '', ''],
  ['', '', 'DESCRIPCIÓN', 'und', 'Metrado', 'HH', 'Ratio', 'UA - TAREO', 'UA - POWERS'],
  ['', 2, 'INSTALACIONES PROVISIONALES', '', '', '', '', '', ''],
  ['', 2.01, 'Agua provisional', 'mes', 16, 2800, 175, 'CD0000001-01', 'CD0000001'],
  ['', 2.0199999999999996, 'Energía provisional', 'mes', 16, 2800.004, 175, 'CD0000001-02', 'CD0000001'],
  ['', '', 'TOTAL PARTIDA DE CONTROL', '', '', 5600, '', '', ''],
  ['', 10, 'ESTRUCTURAS', '', '', '', '', '', ''],
  ['', 10.05, 'Encofrado de pedestales', 'm2', 362.88, 912.425472, 2.5, 'CD0000002-06', 'CD0000002'],
  ['', 10.1, 'Encofrado de escaleras', 'm2', 233.38, '', '', 'CD0000002-11', 'CD0000002'],
  [2111111111, 10.379999999999999, 'Concreto de solado', 'm2', 3750.83, 2580.57, 0.688, 'CD0000003-16', 'CD0000003'],
  ['', '', 'TOTAL PARTIDA DE CONTROL', '', '', 1, '', '', ''],
];
const xlsxBuf = (sheet, aoa) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['otra']]), 'Personal activo'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), sheet); return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }); };
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);

test('utilidades: horas, DNI, categoría y parsers', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([M, P]) => ({
    lv: tHoras('2026-09-28', '07:30', '17:00'), lvx: tHoras('2026-09-28', '07:30', '19:00'),
    sa: tHoras('2026-10-03', '07:30', '13:00'), sax: tHoras('2026-10-03', '07:30', '17:00'),
    corto: tHoras('2026-09-28', '07:30', '11:30'), dom: tHoras('2026-10-04', '07:30', '12:00'),
    dni: [tDni(3684337), tDni(' 03684337 '), tDni('43241048 II'), tDni(''), tDni('ABC'), tDni(12345678), tDni('001234567')],
    cat: ['OPERARIO ALBAÑIL', 'Oficial carpintero', 'PEON-VIGIA', 'AYUDANTE', 'CAPATAZ', 'RIGGER'].map(tCatDe),
    jor: TC().jor, m: tParseMaster(M, null, '2026-10-01'), p: tParsePartidas(P),
  }), [MASTER, PARTIDAS]);
  expect(r.lv).toEqual({ trab: 8.5, ext: 0 });
  expect(r.lvx).toEqual({ trab: 10.5, ext: 2 });
  expect(r.sa).toEqual({ trab: 5.5, ext: 0 });
  expect(r.sax).toEqual({ trab: 8.75, ext: 3.25 }); // sábado: el refrigerio (45 min desde las 13:00) se descuenta a quien se queda (21-10-2026)
  expect(r.corto.trab).toBe(4);
  expect(r.dom).toEqual({ trab: 4.5, ext: 4.5 });
  expect(r.dni).toEqual(['03684337', '03684337', '', '', '', '12345678', '001234567']);
  expect(r.cat).toEqual(['OP', 'OF', 'PE', 'PE', 'CA', 'OT']);
  expect(r.jor['0']).toBeNull();
  // máster: 3 personas (el reingreso se agrupa), 1 error por DNI raro
  expect(r.m.fichas.map(f => f.dni).sort()).toEqual(['01234567', '03684337', '45678901']);
  const beto = r.m.fichas.find(f => f.dni === '03684337');
  expect(beto.per).toEqual([{ ing: '2026-02-10', ces: '2026-03-15', mot: 'Renuncia' }, { ing: '2026-05-04', ces: '', mot: '' }]);
  expect(beto).toMatchObject({ ape: 'FICTICIO DOS', nom: 'BETO', pue: 'OFICIAL CARPINTERO', cat: 'OF', act: true, ing: '2026-05-04', ces: '' });
  const carla = r.m.fichas.find(f => f.dni === '45678901');
  expect(carla).toMatchObject({ ces: '2026-09-15', mot: 'Termino de partida', act: false, cat: 'OT', cua: 'ANDAMIEROS' });
  expect(r.m.fichas.find(f => f.dni === '01234567')).toMatchObject({ ape: 'PRUEBA UNO', nom: 'ANA' });
  expect(r.m.errores.filter(e => !e.warn).length).toBe(1);
  // partidas: códigos con 2 decimales, grupos, sin filas TOTAL
  expect(r.p.grupos.map(g => g.grp)).toEqual(['2', '10']);
  expect(r.p.partidas.map(p => p.cod)).toEqual(['2.01', '2.02', '10.05', '10.10', '10.38']);
  expect(r.p.partidas[1]).toMatchObject({ id: 'p2_02', grp: '2', grpN: 'INSTALACIONES PROVISIONALES', und: 'mes', met: 16, hhp: 2800, ua: 'CD0000001-02' });
  expect(r.p.partidas[3]).toMatchObject({ id: 'p10_10', hhp: null, grpN: 'ESTRUCTURAS' });
  expect(r.p.errores).toEqual([]);
  noErrors(errors, 'utilidades');
});

test('Personal: alta manual, DNI duplicado, cese, asignar capataz e importar el Excel de RR.HH.', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: EXTRA });
  await conExcel(page); // después de openApp: la ruta más nueva manda
  await tab(page, 'tper');
  await expect(page.locator('#tperBody tr')).toHaveCount(1);
  // alta manual
  await page.click('#tperAdd');
  await page.fill('#tfDni', '7654321');
  await page.fill('#tfApP', 'nuevo ');
  await page.fill('#tfApM', ' manual');
  await page.fill('#tfNom', 'eva');
  await page.fill('#tfPue', 'Oficial fierrero');
  await page.click('#tfOk');
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(() => window.__dbGet('tper', '07654321'))).toMatchObject({ dni: '07654321', ape: 'NUEVO MANUAL', apP: 'NUEVO', apM: 'MANUAL', nom: 'EVA', cat: 'OF', act: true, by: 'frandiopacheco@gmail.com' });
  // apellidos partidos cuando la ficha no los trae separados (importación de RR.HH.)
  expect(await page.evaluate(() => [tApes({ ape: 'DE LA CRUZ PEREZ' }), tApes({ ape: 'ZEVALLOS POMA,' }), tApes({ ape: 'QUISPE' }), tApes({ ape: 'A B', apP: 'X', apM: 'Y' })]))
    .toEqual([['DE LA CRUZ', 'PEREZ'], ['ZEVALLOS', 'POMA'], ['QUISPE', ''], ['A', 'B']]);
  // «Editar» en la fila
  await page.click('[data-tfe="07654321"]');
  await expect(page.locator('#tfApP')).toHaveValue('NUEVO');
  await page.fill('#tfApM', 'MANUAL RIOS');
  await page.click('#tfOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321').ape)).toBe('NUEVO MANUAL RIOS');
  // duplicado rechazado
  await page.click('#tperAdd');
  await page.fill('#tfDni', '01234567');
  await page.fill('#tfApP', 'OTRO');
  await page.click('#tfOk');
  await expect(page.locator('#tfMsg')).toContainText('Ya existe');
  await page.click('#lqm [data-lqx]');
  // buscar y filtrar
  await page.fill('#tperQ', 'manual');
  await expect(page.locator('#tperBody tr')).toHaveCount(1);
  await page.fill('#tperQ', '');
  // editar en bloque: capataz y cuadrilla; la categoría queda igual
  await page.check('#tselAll');
  await page.click('#tselEd');
  await page.click('#tacOk');
  await expect(page.locator('#tacMsg')).toContainText('Elige qué cambiar');
  await page.selectOption('#tacSel', 'tcap1@obra.pe');
  await page.click('#tacOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321').cap)).toBe('tcap1@obra.pe');
  await page.check('[data-tsel="07654321"]');
  await page.click('#tselEd');
  await page.fill('#tacCua', 'fierreros');
  await page.click('#tacOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321'))).toMatchObject({ cap: 'tcap1@obra.pe', cua: 'FIERREROS', cat: 'OF' });
  expect(await page.evaluate(() => window.__dbGet('tper', '01234567').cua || '')).not.toBe('FIERREROS');
  // cese desde «Editar elegidos» (20-10-2026)
  await page.check('[data-tsel="07654321"]');
  await page.click('#tselEd');
  await page.click('.t-cesd summary');
  await page.fill('#tacCesF', '2026-10-15');
  await page.fill('#tacCesM', 'Termino de partida');
  await page.click('#tacOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321'))).toMatchObject({ ces: '2026-10-15', mot: 'Termino de partida', cap: 'tcap1@obra.pe' });
  expect(await page.evaluate(() => { const p = window.__dbGet('tper', '07654321'); return p.per[p.per.length - 1]; })).toMatchObject({ ces: '2026-10-15', mot: 'Termino de partida' });
  // cese
  await page.click('[data-tfi="07654321"]');
  await page.click('[data-tfa="ces"]');
  await page.fill('#tcF', '2026-10-01');
  await page.fill('#tcM', 'Renuncia');
  await page.click('#tcOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321'))).toMatchObject({ ces: '2026-10-01', mot: 'Renuncia', act: true }); // el día del cese cuenta como trabajado (auditoría F2)
  // importar
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tperImp')]);
  await fc.setFiles({ name: 'maestra.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsxBuf('Datos del personal', MASTER) });
  await expect(page.locator('#timpNew')).toHaveText('2');
  await expect(page.locator('#timpChg')).toHaveText('0');
  await expect(page.locator('#timpEq')).toHaveText('1');
  await expect(page.locator('#timpErr')).toHaveText('1');
  await expect(page.locator('#timpAct')).toHaveText('3'); // Ana, Beto y la ficha manual (cesa hoy: el día del cese cuenta); Carla cesó
  await expect(page.locator('#timpLF')).toContainText('NUEVO MANUAL');
  await page.click('#timpOk');
  await expect(page.locator('#lqm')).toHaveCount(0);
  const all = await page.evaluate(() => window.__dbAll('tper'));
  expect(Object.keys(all).sort()).toEqual(['01234567', '03684337', '07654321', '45678901']);
  expect(all['03684337'].per.length).toBe(2);
  expect(all['01234567'].cap).toBe('tcap1@obra.pe'); // la importación no pisa el capataz
  expect(all['07654321'].arch).toBeUndefined(); // ni archiva a quien no está en el archivo
  // segunda importación con un cambio: puesto nuevo
  const M2 = MASTER.map(r => r.slice()); M2[1][4] = 'OPERARIO FIERRERO';
  const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tperImp')]);
  await fc2.setFiles({ name: 'maestra.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsxBuf('Datos del personal', M2) });
  await expect(page.locator('#timpChg')).toHaveText('1');
  await expect(page.locator('#timpLC')).toContainText('OPERARIO ALBAÑIL → OPERARIO FIERRERO');
  await page.click('#timpOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '01234567'))).toMatchObject({ pue: 'OPERARIO FIERRERO', cap: 'tcap1@obra.pe' });
  noErrors(errors, 'personal');
});

test('Partidas de control: importar, agregar y desactivar; Tareos del día; jornada', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: EXTRA });
  await conExcel(page); // después de openApp: la ruta más nueva manda
  await tab(page, 'tpc');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tpcImp')]);
  await fc.setFiles({ name: 'semana.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsxBuf('Lista de partidas', PARTIDAS) });
  await expect(page.locator('#tpiNew')).toHaveText('5');
  await page.click('#tpiOk');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('tpc')).sort())).toEqual(['p10_05', 'p10_10', 'p10_38', 'p2_01', 'p2_02']);
  expect(await page.evaluate(() => window.__dbGet('tpc', 'p10_05'))).toMatchObject({ cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', act: true, hhp: 912.43 });
  // nueva partida
  await page.click('#tpcAdd');
  await page.fill('#tpCod', '10.39');
  await page.fill('#tpNom', 'Curado de losas');
  await page.fill('#tpUnd', 'm2');
  await page.click('#tpOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_39'))).toMatchObject({ cod: '10.39', grp: '10', grpN: 'ESTRUCTURAS', act: true });
  // código repetido
  await page.click('#tpcAdd');
  await page.fill('#tpCod', '10.05');
  await page.fill('#tpNom', 'x');
  await page.click('#tpOk');
  await expect(page.locator('#tpMsg')).toContainText('Ya existe');
  await page.click('#lqm [data-lqx]');
  // desactivar
  await page.click('[data-tpt="p2_01"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p2_01').act)).toBe(false);
  await expect(page.locator('tr[data-tpc="p2_01"]')).toHaveClass(/t-off/);
  // Tareos del día
  await tab(page, 'tdia');
  await expect(page.locator('tr[data-tcap="tcap1@obra.pe"]')).toContainText('Tito Capataz'); // con obreros y sin tareo (detalle en tareo-dia.spec.js)
  await expect(page.locator('tr[data-tcap="tcap1@obra.pe"]')).toContainText('Sin empezar');
  // jornada: sábado desde las 07:00 y guardar
  await tab(page, 'tcfg');
  await expect(page.locator('#tjTot')).toHaveText('48.0');
  /* si la página se redibuja justo al escribir (llega la configuración), se vuelve a escribir */
  await expect(async () => {
    await page.fill('[data-tjd="6"] [data-tj="ini"]', '07:00');
    await page.locator('[data-tjd="6"] [data-tj="ini"]').blur();
    await expect(page.locator('#tjTot')).toHaveText('48.5', { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await expect(page.locator('#tjTol')).toHaveCount(0); // sin garita (20-10-2026)
  // publicación automática (20-10-2026): apagada por omisión; se activa con su hora
  await expect(page.locator('#tjAuto')).not.toBeChecked();
  await page.check('#tjAuto'); await page.fill('#tjAutoH', '20:30');
  // semana del proyecto (20-10-2026): se guarda como «la semana n empieza el lunes de esta semana»
  // horario sugerido en domingo o feriado (25-10-2026): por defecto 07:30–13:00; se ve cuántas horas da con el refrigerio
  await expect(page.locator('#tjSgH')).toHaveText('= 4,5 h, todas extra');
  await page.fill('#tjNlIni', '13:00');
  await expect(page.locator('#tjSgH')).toHaveText('= 5,5 h, todas extra');
  await page.fill('#tjSem', '70');
  await page.click('#tjSave');
  await expect.poll(async () => (await page.evaluate(() => window.__dbGet('tcfg', 'main'))).sem).toEqual(await page.evaluate(() => ({ n: 70, lun: tLunes(todayIso()) })));
  expect(await page.evaluate(() => [tSemN(tLunes(todayIso())), tSemN(iso(new Date(pd(tLunes(todayIso())).getTime() - 7 * 864e5)))])).toEqual([70, 69]);
  await expect.poll(async () => (await page.evaluate(() => window.__dbGet('tcfg', 'main'))).pubAuto).toEqual({ on: true, hh: '20:30' });
  expect((await page.evaluate(() => window.__dbGet('tcfg', 'main'))).sugNoLab).toEqual({ ini: '07:30', fin: '13:00' });
  await expect.poll(() => page.evaluate(() => window.__dbGet('tcfg', 'main'))).toMatchObject({ jor: { '6': { ini: '07:00', fin: '13:00', ref: 45, refIni: '13:00' }, '0': null }, refIni: '12:00' });
  await expect.poll(() => page.evaluate(() => tHoras('2026-10-03', '07:00', '13:00'))).toEqual({ trab: 6, ext: 0 });
  noErrors(errors, 'partidas y jornada');
});

test('Mejoras de oficina: Personal numerado con contador y «Hacer capataz»; partidas en orden numérico; bloquear', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: [...EXTRA,
    ['tper', '02345678', { dni: '02345678', ape: 'CESADO DOS', nom: 'X', pue: 'PEON', cat: 'PE', cua: 'ALBAÑILES', cap: '', ing: '2026-01-05', ces: '2026-02-01', mot: 'Renuncia', per: [], act: false }],
    ['tper', '03456789', { dni: '03456789', ape: 'JEFE TRES', nom: 'X', pue: 'CAPATAZ', cat: 'CA', cua: 'ALBAÑILES', cap: '', ing: '2026-01-05', ces: '', mot: '', per: [], act: true, cta: 'tcap1@obra.pe' }],
    ...[['p10_10', '10.10'], ['p2_01', '2.01'], ['p10_02', '10.02'], ['p1_01', '1.01'], ['p13_01', '13.01']].map(([id, cod]) => ['tpc', id, { cod, grp: cod.split('.')[0], grpN: 'G' + cod.split('.')[0], nom: 'Partida ' + cod, und: 'm2', met: 10, hhp: 25, ua: 'CD-' + cod, act: true }]),
  ] });
  await page.evaluate(() => { window.__cta = []; window.tCapCuenta = dni => window.__cta.push(dni); });
  await tab(page, 'tper');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 2 de 3 · 2 activos');
  await expect(page.locator('#tperBody tr').first().locator('[data-l="N°"]')).toHaveText('1');
  await page.click('#tperEst [data-test="all"]');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 3 de 3 · 2 activos');
  const jefe = page.locator('tr[data-tp="03456789"]');
  await expect(jefe).toContainText('Capataz');
  await expect(jefe.locator('[data-tcta]')).toHaveText('Cuenta de capataz…');
  await jefe.locator('[data-tcta]').click();
  await expect(page.locator('tr[data-tp="01234567"] [data-tcta]')).toHaveText('Hacer capataz');
  await page.locator('tr[data-tp="01234567"] [data-tcta]').click();
  expect(await page.evaluate(() => window.__cta)).toEqual(['03456789', '01234567']);
  // partidas: grupos 1, 2, 10, 13 (no 1, 10, 13, 2) y 10.02 antes de 10.10; una sola tabla con encabezado por grupo y ratio HH/und
  await tab(page, 'tpc');
  expect(await page.locator('.tpc-gh').evaluateAll(L => L.map(x => x.dataset.tpg))).toEqual(['1', '2', '10', '13']);
  expect(await page.locator('tr.tpc-r').evaluateAll(L => L.map(x => x.dataset.tpc))).toEqual(['p1_01', 'p2_01', 'p10_02', 'p10_10', 'p13_01']);
  await expect(page.locator('table.tpc-tbl')).toHaveCount(1);
  await expect(page.locator('tr[data-tpc="p10_02"] [data-l="HH/und"]')).toHaveText('2.5');
  // el asistente ya no mantiene las partidas (25-10-2026): solo lectura
  await expect(page.locator('#tpcRO')).toContainText('Costos y el administrador');
  await expect(page.locator('[data-tpb], [data-tpe], #tpcAdd, #tpcImp, #tpcExp')).toHaveCount(0);
  noErrors(errors, 'mejoras de oficina');
});

test('Partidas: costos mantiene las partidas (editar y bloquear); exportar e importar sin perder nada; deshacer la importación', async ({ page }) => {
  const PC = (cod, nom, x) => ['tpc', 'p' + cod.replace('.', '_'), { cod, grp: cod.split('.')[0], grpN: cod.startsWith('2.') ? 'PROVISIONALES' : 'ESTRUCTURAS', nom, und: 'm2', met: 10, hhp: 25, ua: 'CD-' + cod, act: true, ts: 0, ...x }];
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: [
    PC('2.01', 'Agua provisional'), PC('2.02', 'Energía provisional'),
    PC('10.05', 'Encofrado', { bloq: true, bloqBy: 'x@obra.pe', bloqAt: 1 }), PC('10.10', 'Encofrado de escaleras', { dct: true }), PC('10.38', 'Concreto de solado'),
  ] });
  await conExcel(page);
  await tab(page, 'tpc');
  await expect(page.locator('#tpcAdd')).toBeVisible();
  await expect(page.locator('[data-tpe="p10_05"]')).toBeVisible();
  // bloquear/desbloquear sigue igual
  page.once('dialog', d => d.accept());
  await page.click('[data-tpb="p10_05"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_05'))).toMatchObject({ bloq: false, bloqBy: 'tcos@obra.pe' });
  // exportar y volver a importar el mismo archivo: nada cambia
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#tpcExp')]);
  const buf = readFileSync(await dl.path());
  const wb = XLSX.read(buf, { type: 'buffer' });
  expect(wb.SheetNames).toEqual(['Lista de partidas', 'Instrucciones']);
  // Estado y Descontable con lista desplegable (no dejan escribir otro valor)
  const J = new ExcelJS.Workbook(); await J.xlsx.load(buf); const jw = J.getWorksheet('Lista de partidas');
  const est = jw.getCell('I5').dataValidation; expect(est).toMatchObject({ type: 'list', formulae: ['"Activa,Inactiva"'], showErrorMessage: true });
  expect(jw.getCell('J5').dataValidation.formulae).toEqual(['"Sí,No"']);
  expect(jw.getCell('I300').dataValidation.type).toBe('list'); // también en filas nuevas
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets['Lista de partidas'], { header: 1, defval: '' });
  const fila = cod => aoa.findIndex(r => r[1] === cod);
  const J0 = new ExcelJS.Workbook(); await J0.xlsx.load(buf); const jw0 = J0.getWorksheet('Lista de partidas');
  expect(aoa[fila('10.10')]).toEqual(['', '10.10', 'Encofrado de escaleras', 'm2', 10, 25, 2.5, 'CD-10.10', 'Activa', 'Sí', 'No']);
  expect(jw0.getCell('K5').dataValidation.formulae).toEqual(['"Sí,No"']); // BLOQUEADA con lista
  let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tpcImp')]);
  await fc.setFiles({ name: 'partidas.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf });
  await expect(page.locator('#tpiEq')).toHaveText('5');
  await expect(page.locator('#tpiOk')).toBeDisabled();
  await page.click('#lqm [data-lqx]');
  // editar en el Excel: metrado de 10.05, HH de 2.01 vacía (no cambia), 2.02 inactiva, 10.10 cambia de nombre, se borra la fila 10.38 y se agrega 10.39
  const E = aoa.map(r => r.slice());
  E[fila('10.05')][4] = 400; E[fila('2.01')][5] = ''; E[fila('2.01')][10] = 'Sí'; E[fila('2.02')][8] = 'Inactiva'; E[fila('10.10')][2] = 'Encofrado de escaleras y rampas';
  E.splice(fila('10.38'), 1, ['', '10.39', 'Curado de losas', 'm2', 50, '', '', '', '', 'No']);
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tpcImp')]);
  await fc.setFiles({ name: 'partidas2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: xlsxBuf('Lista de partidas', E) });
  await expect(page.locator('#tpiNew')).toHaveText('1');
  await expect(page.locator('#tpiChg')).toHaveText('4');
  await expect(page.locator('#tpiRen')).toContainText('Encofrado de escaleras → Encofrado de escaleras y rampas');
  await expect(page.locator('#tpiFuera')).toContainText('10.38');
  await expect(page.locator('#tpiOk')).toBeDisabled(); // falta confirmar el cambio de nombre
  await page.check('#tpiRenOk');
  await page.click('#tpiOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_39'))).toMatchObject({ cod: '10.39', nom: 'Curado de losas', act: true, dct: false, grpN: 'ESTRUCTURAS' });
  const db1 = await page.evaluate(() => window.__dbAll('tpc'));
  expect(db1.p10_05).toMatchObject({ met: 400, bloq: false });
  expect(db1.p2_01).toMatchObject({ hhp: 25, bloq: true, bloqBy: 'tcos@obra.pe' }); // la celda vacía no borró las HH; bloqueada desde el Excel
  expect(db1.p2_02.act).toBe(false);
  expect(db1.p10_10).toMatchObject({ nom: 'Encofrado de escaleras y rampas', dct: true });
  expect(db1.p10_38).toMatchObject({ act: true, nom: 'Concreto de solado' }); // la fila borrada no toca la partida
  expect(Object.values(await page.evaluate(() => window.__dbAll('tpcbk')))).toHaveLength(1);
  // deshacer: todo vuelve a como estaba y la nueva queda inactiva (no se borra)
  await expect(page.locator('#tpcUndo')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.click('#tpcUndo');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_39').act)).toBe(false);
  const db2 = await page.evaluate(() => window.__dbAll('tpc'));
  expect(db2.p10_05.met).toBe(10);
  expect(db2.p2_02.act).toBe(true);
  expect(db2.p2_01.bloq).toBe(false); // deshacer también desbloquea
  expect(db2.p10_10.nom).toBe('Encofrado de escaleras');
  expect(Object.values(await page.evaluate(() => window.__dbAll('tpcbk')))[0].undo).toMatchObject({ by: 'tcos@obra.pe' });
  await expect(page.locator('#tpcUndo')).toBeHidden();
  noErrors(errors, 'costos mantiene las partidas');
});

test('Personal: exportar la lista, editarla e importarla sin perder nada (periodos, celdas vacías, capataz); nombre con confirmación; deshacer', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: [...EXTRA,
    ['tper', '03684337', { dni: '03684337', ape: 'FICTICIO DOS', nom: 'BETO', pue: 'OFICIAL CARPINTERO', cat: 'OF', cua: 'CARPINTEROS', cap: '', ing: '2026-05-04', ces: '', mot: '', per: [{ ing: '2026-02-10', ces: '2026-03-15', mot: 'Renuncia' }, { ing: '2026-05-04', ces: '', mot: '' }], act: true, ts: 0 }],
    ['tper', '45678901', { dni: '45678901', ape: 'INVENTADO TRES', nom: 'CARLA', pue: 'RIGGER', cat: 'OT', cua: 'ANDAMIEROS', cap: 'tcap1@obra.pe', ing: '2026-03-01', ces: '', mot: '', per: [{ ing: '2026-03-01', ces: '', mot: '' }], act: true, ts: 0 }],
  ] });
  await conExcel(page);
  await tab(page, 'tper');
  // «Exportar Excel» (la lista, con el filtro «Todos») se edita y se vuelve a importar
  await page.click('#tperEst [data-test="all"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#tperXls')]);
  const buf = readFileSync(await dl.path());
  const J = new ExcelJS.Workbook(); await J.xlsx.load(buf); const ws = J.getWorksheet('Personal');
  expect(J.worksheets.map(w => w.name)).toEqual(['Personal', 'Instrucciones']);
  expect(ws.getRow(1).values.slice(1)).toEqual(['DNI', 'Apellido paterno', 'Apellido materno', 'Nombres', 'Puesto', 'Categoría', 'Cuadrilla', 'Capataz', 'Ingreso', 'Cese', 'Motivo', 'Estado']);
  const filas = []; ws.eachRow((r, i) => { if (i >= 2) filas.push(r); });
  const row = dni => filas.find(r => r.getCell(1).value === dni);
  expect(row('01234567')).toBeTruthy(); // DNI como texto (con su cero)
  expect(ws.getCell('F2').dataValidation).toMatchObject({ type: 'list', formulae: ['"Operario,Oficial,Peón,Capataz,Otro"'] });
  expect(ws.getCell('I2').dataValidation.type).toBe('date');
  // el mismo archivo no cambia nada
  let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tperImp')]);
  await fc.setFiles({ name: 'personal.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf });
  await expect(page.locator('#timpEq')).toHaveText('3');
  await expect(page.locator('#timpOk')).toBeDisabled();
  await page.click('#lqm [data-lqx]');
  // editar: Ana cambia de cuadrilla y queda «Oficial»; Beto con el puesto vacío (no cambia) y sin perder su primer periodo;
  // Carla cambia de nombre (pide confirmación) y cesa; se agrega un obrero nuevo
  row('01234567').getCell(7).value = 'FIERREROS'; row('01234567').getCell(6).value = 'Oficial';
  row('03684337').getCell(5).value = '';
  row('45678901').getCell(4).value = 'KARLA'; row('45678901').getCell(10).value = new Date(Date.UTC(2026, 9, 20)); row('45678901').getCell(11).value = 'Termino de obra';
  const nr = ws.getRow(filas.length + 2); ['87654321', 'NUEVO', 'CINCO', 'ELSA', 'PEON', '', 'ALBAÑILES', '', new Date(Date.UTC(2026, 8, 1)), '', '', ''].forEach((v, i) => { nr.getCell(i + 1).value = v; });
  const buf2 = Buffer.from(await J.xlsx.writeBuffer());
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#tperImp')]);
  await fc.setFiles({ name: 'personal2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: buf2 });
  await expect(page.locator('#timpNew')).toHaveText('1');
  await expect(page.locator('#timpChg')).toHaveText('2');
  await expect(page.locator('#timpRen')).toContainText('INVENTADO TRES, CARLA → INVENTADO TRES, KARLA');
  await expect(page.locator('#timpOk')).toBeDisabled();
  await page.check('#timpRenOk');
  await page.click('#timpOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '87654321'))).toMatchObject({ ape: 'NUEVO CINCO', apP: 'NUEVO', apM: 'CINCO', nom: 'ELSA', cat: 'PE', ing: '2026-09-01', act: true });
  const db1 = await page.evaluate(() => window.__dbAll('tper'));
  expect(db1['01234567']).toMatchObject({ cua: 'FIERREROS', cat: 'OF', cap: 'tcap1@obra.pe' });
  expect(db1['03684337'].per).toHaveLength(2); // una fila por persona no borra los periodos anteriores
  expect(db1['03684337'].pue).toBe('OFICIAL CARPINTERO'); // la celda vacía no cambia
  expect(db1['45678901']).toMatchObject({ nom: 'KARLA', ces: '2026-10-20', mot: 'Termino de obra', cap: 'tcap1@obra.pe' });
  // deshacer: vuelve todo y el nuevo se archiva
  await expect(page.locator('#tperUndo')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.click('#tperUndo');
  await expect.poll(() => page.evaluate(() => !!window.__dbGet('tper', '87654321').arch)).toBe(true);
  const db2 = await page.evaluate(() => window.__dbAll('tper'));
  expect(db2['01234567']).toMatchObject({ cua: 'ALBAÑILES', cat: 'OP' });
  expect(db2['45678901']).toMatchObject({ nom: 'CARLA', ces: '' });
  noErrors(errors, 'personal ida y vuelta');
});

test('Personal: filtros encadenados (cada lista ofrece solo lo que queda con los otros filtros, con su conteo) y «Limpiar filtros»', async ({ page }) => {
  const P = (dni, cua, cat, cap, ces = '') => ['tper', dni, { dni, ape: 'APE ' + dni, nom: 'X', pue: 'P', cat, cua, cap, ing: '2026-01-05', ces, mot: ces ? 'Renuncia' : '', per: [], act: !ces }];
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: [...EXTRA,
    P('10000001', 'ALBAÑILES', 'OP', 'tcap1@obra.pe'), P('10000002', 'ALBAÑILES', 'PE', ''),
    P('10000003', 'CARPINTEROS', 'OF', 'tcap1@obra.pe'),
    P('10000004', 'FIERREROS', 'OP', '', '2026-03-01'), P('10000005', 'CARPINTEROS', 'PE', '', '2026-03-01'),
  ] });
  await tab(page, 'tper');
  const opts = s => page.locator(s + ' option').allTextContents();
  // Activos (4: 01234567 + 3): FIERREROS solo tiene cesados, no aparece
  expect(await opts('#tperCua')).toEqual(['Todas las cuadrillas (4)', 'ALBAÑILES (3)', 'CARPINTEROS (1)']);
  expect(await opts('#tperCat')).toEqual(['Todas las categorías (4)', 'Operario (2)', 'Oficial (1)', 'Peón (1)']);
  expect(await opts('#tperCap')).toEqual(['Todos los capataces (4)', 'Sin capataz (1)', 'Tito Capataz (3)']);
  await expect(page.locator('#tperEst [data-test="act"]')).toHaveText('Activos 4');
  await expect(page.locator('#tperEst [data-test="ces"]')).toHaveText('Cesados 2');
  await expect(page.locator('#tperClr')).toBeDisabled();
  // cuadrilla ALBAÑILES: las otras listas se acotan a ella
  await page.selectOption('#tperCua', 'ALBAÑILES');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 3 de 6 · 3 activos');
  expect(await opts('#tperCat')).toEqual(['Todas las categorías (3)', 'Operario (2)', 'Peón (1)']);
  expect(await opts('#tperCap')).toEqual(['Todos los capataces (3)', 'Sin capataz (1)', 'Tito Capataz (2)']);
  await expect(page.locator('#tperEst [data-test="ces"]')).toHaveText('Cesados 0');
  await expect(page.locator('#tperClr')).toBeEnabled();
  // la búsqueda también acota las listas
  await page.fill('#tperQ', '10000002');
  expect(await opts('#tperCat')).toEqual(['Todas las categorías (1)', 'Peón (1)']);
  await page.fill('#tperQ', '');
  // Cesados: ALBAÑILES ya no tiene a nadie, pero sigue en la lista con (0) para poder quitarla
  await page.click('#tperEst [data-test="ces"]');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 0 de 6 · 0 activos');
  expect(await opts('#tperCua')).toEqual(['Todas las cuadrillas (2)', 'ALBAÑILES (0)', 'CARPINTEROS (1)', 'FIERREROS (1)']);
  await expect(page.locator('#tperCua')).toHaveValue('ALBAÑILES');
  await page.selectOption('#tperCua', '');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 2 de 6 · 0 activos');
  // «Limpiar filtros»: vuelve a Activos sin búsqueda ni listas
  await page.selectOption('#tperCat', 'PE');
  await page.fill('#tperQ', 'APE');
  await page.click('#tperClr');
  await expect(page.locator('#tperN')).toHaveText('Mostrando 4 de 6 · 4 activos');
  await expect(page.locator('#tperQ')).toHaveValue('');
  await expect(page.locator('#tperEst [data-test="act"]')).toHaveClass(/on/);
  await expect(page.locator('#tperCat')).toHaveValue('');
  await expect(page.locator('#tperClr')).toBeDisabled();
  noErrors(errors, 'filtros encadenados');
});
