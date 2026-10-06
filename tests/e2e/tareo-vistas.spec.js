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
const conExcel = page => page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(XLSX_JS, 'utf8') }));

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
  expect(r.sax).toEqual({ trab: 9.5, ext: 4 }); // sábado: sin refrigerio aunque pase de la jornada (auditoría F2)
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
  await page.fill('#tfApe', 'nuevo  manual');
  await page.fill('#tfNom', 'eva');
  await page.fill('#tfPue', 'Oficial fierrero');
  await page.click('#tfOk');
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(() => window.__dbGet('tper', '07654321'))).toMatchObject({ dni: '07654321', ape: 'NUEVO MANUAL', nom: 'EVA', cat: 'OF', act: true, by: 'frandiopacheco@gmail.com' });
  // duplicado rechazado
  await page.click('#tperAdd');
  await page.fill('#tfDni', '01234567');
  await page.fill('#tfApe', 'OTRO');
  await page.click('#tfOk');
  await expect(page.locator('#tfMsg')).toContainText('Ya existe');
  await page.click('#lqm [data-lqx]');
  // buscar y filtrar
  await page.fill('#tperQ', 'manual');
  await expect(page.locator('#tperBody tr')).toHaveCount(1);
  await page.fill('#tperQ', '');
  // asignar capataz en bloque
  await page.check('#tselAll');
  await page.click('#tselCap');
  await page.selectOption('#tacSel', 'tcap1@obra.pe');
  await page.click('#tacOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tper', '07654321').cap)).toBe('tcap1@obra.pe');
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
  // jornada: sábado hasta las 13:30 y guardar
  await tab(page, 'tcfg');
  await expect(page.locator('#tjTot')).toHaveText('48.0');
  await page.fill('[data-tjd="6"] [data-tj="fin"]', '13:30');
  await expect(page.locator('#tjTot')).toHaveText('48.5');
  await page.fill('#tjTol', '10');
  await page.click('#tjSave');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tcfg', 'main'))).toMatchObject({ jor: { '6': { ini: '07:30', fin: '13:30', ref: 0 }, '0': null }, tolGar: 10, refIni: '12:00' });
  await expect.poll(() => page.evaluate(() => tHoras('2026-10-03', '07:30', '13:30'))).toEqual({ trab: 6, ext: 0 });
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
  // el asistente bloquea: queda con candado
  page.once('dialog', d => d.accept());
  await page.click('[data-tpb="p10_02"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_02'))).toMatchObject({ bloq: true, bloqBy: 'tasis@obra.pe' });
  await expect(page.locator('tr[data-tpc="p10_02"]')).toContainText('BLOQUEADA');
  noErrors(errors, 'mejoras de oficina');
});

test('Partidas: costos (tcos) solo bloquea o desbloquea para la carga', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: [['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado', und: 'm2', act: true, bloq: true, bloqBy: 'x@obra.pe', bloqAt: 1 }]] });
  await tab(page, 'tpc');
  await expect(page.locator('#tpcAdd')).toHaveCount(0);
  await expect(page.locator('[data-tpe]')).toHaveCount(0);
  await expect(page.locator('tr[data-tpc="p10_05"] .tpc-lock')).toHaveCount(1);
  page.once('dialog', d => d.accept());
  await page.click('[data-tpb="p10_05"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tpc', 'p10_05'))).toMatchObject({ bloq: false, bloqBy: 'tcos@obra.pe' });
  await expect(page.locator('[data-tpb="p10_05"]')).toHaveText('Bloquear para carga');
  noErrors(errors, 'costos bloquea');
});
