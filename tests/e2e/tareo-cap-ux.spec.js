// Segunda auditoría externa del tareo (ChatGPT, 06-10-2026), parte del capataz (docs/ia/tareo.md
// «Correcciones de la segunda auditoría — capataz»). Los casos de ChatGPT reproducían el defecto; aquí se verifica que YA NO ocurre:
// A5 feriado/jornada congelada · envN · UX1 contadores · UX2 nombres iguales · UX3 buscador y filtros · UX4 foto · UX6 días enviados.
// Adaptado a la grilla «horas por cantidad» (los tareos de prueba son modo:'hrs').
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const CAP = 'tcap@obra.pe';
const ID = `${HOY}_${CAP}`;
const AYER = '2026-09-30', ANTE = '2026-09-29';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const per = (dni, ape, nom, cap = CAP) => ['tper', dni, { dni, ape, nom, pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', per: [{ ing: '2026-01-05', ces: '' }], act: true }];
const row = (ape, nom, as = true, x = {}) => ({ ape, nom, cat: 'OP', cua: 'ALBAÑILES', as, mot: '', alt: false, ini: '', fin: '', h: {}, trab: 0, ext: 0, ...x });
const PC = [['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm2', act: true, ord: 1 }],
  ['tpc', 'p20_01', { cod: '20.01', grp: '20', grpN: 'ARQUITECTURA', nom: 'Tarrajeo de muros', und: 'm2', act: true, ord: 2 }]];
/* 20 obreros (dos «Juan Quispe» distintos), como la prueba de usabilidad de ChatGPT */
const NAMES = [['QUISPE MAMANI', 'JUAN CARLOS'], ['QUISPE HUAMANI', 'JUAN JOSE'], ['ALVA ROJAS', 'ANA MARIA'], ['BRAVO DIAZ', 'BETO'], ['CASTRO PAZ', 'CARLOS'],
  ['DAVILA SOTO', 'DANIEL'], ['ESPINOZA TORRES', 'EDUARDO'], ['FLORES RAMOS', 'FRANCISCO'], ['GARCIA LOPEZ', 'GABRIEL'], ['HUAMAN ORTIZ', 'HUGO'],
  ['INCA PEREZ', 'IVAN'], ['JARA CARRASCO', 'JORGE'], ['LEON CHAVEZ', 'LUIS'], ['MAMANI RIOS', 'MARIO'], ['NUÑEZ SANCHEZ', 'NELSON'],
  ['ORTIZ GOMEZ', 'OMAR'], ['PACHECO LUNA', 'PEDRO'], ['ROJAS ESPINOZA', 'RICARDO'], ['SALAS FLORES', 'SERGIO'], ['TORRES CASTRO', 'TOMAS']];
const crew = (n = 20) => NAMES.slice(0, n).map(([ape, nom], i) => per(String(41000000 + i), ape, nom));
const dbDoc = (page, id = ID) => page.evaluate(i => window.__dbGet('tareo', i) || {}, id);
/* un tareo listo para enviar (con foto ya subida) */
const ready = (date, x = {}) => ({ date, cap: CAP, capN: 'Teodoro', st: 'bor', modo: 'hrs', pcs: ['p10_05'], foto: ['f1'], hist: [], rows: { '41000000': row('QUISPE MAMANI', 'JUAN CARLOS', true, { h: { p10_05: 8.5 } }) }, ...x });
const base = (extra = []) => [...crew(1), ...PC, ['tfot', 'f1', { date: HOY, cap: CAP, n: 1, d: PNG }], ...extra];

test('A5: en feriado la pantalla del capataz dice «Día no laborable» y no presenta la jornada ordinaria', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // jueves 01-10 marcado como feriado en el calendario del tareo; 8,5 h de encofrado
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: base([['tcfg', 'main', { fer: [HOY], ferN: { [HOY]: 'Prueba' } }], ['tareo', ID, ready(HOY)]]) });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('#tcNoLab')).toContainText('Día no laborable: todas las horas cuentan como extra');
  await expect(root.locator('#tcNoLab')).toContainText('Feriado: Prueba.');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  // antes decía «Jornada de hoy: 8.5 h»
  await expect(root).not.toContainText('Jornada del día');
  await expect(root.locator('#tcJorH')).toHaveText('Día no laborable: todas las horas son extra');
  await expect(root.locator('.tc-gt[data-dni="41000000"]')).toContainText('todo extra');
  await expect(root.locator('.tc-gt[data-dni="41000000"]')).toHaveClass(/warn/);
  const c = await page.evaluate(() => ({ ui: tcJor(TCS.date), real: tCalc(TCS.doc).rows['41000000'], jd: tJorDia(TCS.doc) }));
  expect(c.ui.h).toBe(0);
  expect(c.ui.nl).toBe(true);
  expect(c.ui.full).toBe(8.5); // «Toda la jornada» usa la jornada de ese día de semana como referencia
  expect(c.jd).toBe(0);
  expect(c.real.ext).toBe(8.5);
  noErrors(errors, 'A5 feriado');
});

test('A5: un reabierto con jornada congelada (doc.cfg) se muestra con esa jornada, no con la actual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const jor = { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' };
  // congelado como feriado; hoy la configuración ya no lo tiene → manda lo congelado (lo mismo que usa tCalc)
  const cfgFer = { v: 1, jor, fer: true, rnl: { ref: 60, refIni: '12:00' } };
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: base([['tareo', ID, ready(HOY, { st: 'reab', cfg: cfgFer, envN: 1, reab: { mot: 'revisar', t: 1, by: 'tasis@obra.pe' } })]]) });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('#tcNoLab')).toBeVisible();
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('#tcJorH')).toContainText('Día no laborable');
  // y al revés: congelado laborable con otra jornada mientras la configuración actual lo marca feriado
  await page.evaluate(() => { TCS.doc.cfg = { v: 1, jor: { ini: '08:00', fin: '16:00', ref: 30, refIni: '12:30' }, fer: false, rnl: { ref: 60, refIni: '12:00' } }; S.tcfg.set('main', { fer: [TCS.date] }); tcDraw(); });
  await expect(root.locator('#tcJorH')).toHaveText('Jornada del día: 7,5 h');
  await expect(root.locator('.tc-gt[data-dni="41000000"]')).toContainText('+1 HE');
  await root.locator('.tc-steps [data-tcs="1"]').click();
  await expect(root.locator('#tcNoLab')).toHaveCount(0);
  const c = await page.evaluate(() => ({ ui: tcJor(TCS.date), real: tCalc(TCS.doc).rows['41000000'] }));
  expect(c.ui.h).toBe(7.5);
  expect(c.real).toMatchObject({ trab: 8.5, ext: 1, ini: '08:00', fin: '17:00' });
  noErrors(errors, 'A5 congelada');
});

test('envN: cada envío suma 1 (primer envío y reenvío de un reabierto)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: base([['tareo', ID, ready(HOY)]]) });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await root.locator('#tcSend[data-tca="send"]').click();
  await expect.poll(async () => (await dbDoc(page)).st).toBe('env');
  expect((await dbDoc(page)).envN).toBe(1);
  // la oficina lo reabre; el capataz lo reenvía
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'reab', reab: { t: 2, by: 'tasis@obra.pe', mot: 'falta uno' } }), ID);
  await expect(root.locator('.tc-reab')).toBeVisible();
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await root.locator('#tcSend[data-tca="send"]').click();
  await expect.poll(async () => (await dbDoc(page)).envN).toBe(2);
  expect((await dbDoc(page)).st).toBe('env');
  noErrors(errors, 'envN');
});

test('UX1: contadores Vinieron / No vinieron / Sin marcar (sin marcar no cuenta como falta)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const D = { date: HOY, cap: CAP, st: 'bor', modo: 'hrs', pcs: [], foto: [], hist: [], rows: {
    '41000000': row('QUISPE MAMANI', 'JUAN CARLOS', true), '41000001': row('QUISPE HUAMANI', 'JUAN JOSE', false), '41000002': row('ALVA ROJAS', 'ANA MARIA', null) } };
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew(3), ...PC, ['tareo', ID, D]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const k = page.locator('#tcK3');
  await expect(k).toContainText('1 vinieron');
  await expect(k).toContainText('1 no vinieron');
  await expect(k).toContainText('1 sin marcar');
  await expect(page.locator('#tcCnt')).toHaveText('Marcados 2 de 3');
  // la misma clasificación que la oficina: as true / false / null
  const same = await page.evaluate(() => { const R = Object.values(TCS.doc.rows); return [R.filter(r => r.as === true).length, R.filter(r => r.as === false).length, R.filter(r => r.as !== true && r.as !== false).length]; });
  expect(same).toEqual([1, 1, 1]);
  noErrors(errors, 'UX1');
});

test('UX2: dos «Juan Quispe» se distinguen en asistencia, columnas de la grilla, editor y resumen; el nombre completo se ve tocando', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // un tercero con nombre y apellidos idénticos a otro: se distingue por DNI
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew(2), per('41000099', 'QUISPE MAMANI', 'JUAN CARLOS'), ...PC] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-ob[data-dni="41000000"]')).toContainText('DNI 41000000');
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('#tcPcQ').fill('encof');
  await root.locator('[data-tca="pc"][data-v="p10_05"]').click();
  await root.locator('.tc-foot [data-tcs="3"]').click();
  const names = await root.locator('.tc-gn .tc-nmt').allTextContents();
  // antes: dos «Juan Quispe»
  expect(new Set(names).size).toBe(3);
  expect(names).toContain('Juan Quispe Huamani');
  expect(names).toContain('Juan Quispe Mamani ·DNI 000');
  expect(names).toContain('Juan Quispe Mamani ·DNI 099');
  // la columna: tocar el nombre muestra el nombre completo con DNI
  await root.locator('.tc-gn[data-dni="41000099"] [data-tcnm]').click();
  await expect(page.locator('#toast')).toContainText('QUISPE MAMANI, JUAN CARLOS · DNI 41000099');
  // el editor de la celda lleva el nombre completo (con DNI si se repite)
  await root.locator('.tc-gcell[data-dni="41000000"][data-pc="p10_05"]').click();
  await expect(root.locator('#tcCell .tc-csh b').first()).toHaveText('QUISPE MAMANI, JUAN CARLOS ·DNI 000');
  await root.locator('#tcCell [data-tca="cellX"]').last().click();
  await root.locator('th.tc-gp[data-pc="p10_05"] [data-tca="pcAll"]').click();
  // resumen
  await root.locator('.tc-foot [data-tcs="4"]').click();
  const sum = await root.locator('.tc-rr .tc-gn .tc-nmt').allTextContents();
  expect(new Set(sum).size).toBe(3);
  noErrors(errors, 'UX2');
});

test('UX3: buscador y filtros en la cuadrilla; filtrar no cambia la asistencia', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew(20), ...PC] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-ob')).toHaveCount(20);
  // buscar por apellido y por DNI
  await root.locator('#tcQ1').fill('huam');
  await expect(root.locator('.tc-ob')).toHaveCount(2); // QUISPE HUAMANI y HUAMAN ORTIZ
  await root.locator('#tcQ1').fill('41000013');
  await expect(root.locator('.tc-ob')).toHaveCount(1);
  await expect(root.locator('.tc-ob')).toContainText('MAMANI RIOS');
  await expect(root.locator('.tc-ob .tc-n')).toHaveText('12'); // conserva su número de la lista completa
  await root.locator('.tc-ob [data-tca="novino"]').click();
  await root.locator('#tcQ1').fill('');
  // filtros: Sin marcar / No vinieron / Todos
  await root.locator('[data-tcf1="no"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(1);
  await root.locator('[data-tcf1="sin"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(19);
  await root.locator('.tc-ob[data-dni="41000005"] [data-tca="vino"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(18);
  await root.locator('[data-tcf1="all"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(20);
  const as = await page.evaluate(() => Object.values(TCS.doc.rows).map(r => r.as));
  expect(as.filter(x => x === true)).toHaveLength(1);
  expect(as.filter(x => x === false)).toHaveLength(1);
  expect(as.filter(x => x === null)).toHaveLength(18);
  // el contador de pendientes queda a la vista al bajar hasta el final
  await root.locator('#tcBody').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const box = await root.locator('#tcK3').boundingBox();
  const body = await root.locator('#tcBody').boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(body.y - 1);
  expect(box.y).toBeLessThan(body.y + 150);
  await expect(root.locator('#tcK3')).toContainText('18 sin marcar');
  noErrors(errors, 'UX3');
});

test('UX4: en el paso 4 la foto va arriba; «Falta la foto» abre la cámara y al recargar vuelve al mismo día y paso', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const rows = Object.fromEntries(NAMES.map(([a, n], i) => [String(41000000 + i), row(a, n, true, { h: { p10_05: 8.5 } })]));
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew(20), ...PC, ['tareo', ID, { date: HOY, cap: CAP, st: 'bor', modo: 'hrs', pcs: ['p10_05'], foto: [], hist: [], rows }]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="4"]').click();
  // la tarjeta de la foto está antes de la lista de obreros y a la vista sin desplazar
  const foto = await root.locator('#tcFotoC').boundingBox();
  const first = await root.locator('#tcGridR').boundingBox();
  expect(foto.y).toBeLessThan(first.y);
  expect(foto.y + 40).toBeLessThan(844);
  // el botón de abajo lleva a la foto y abre la cámara (selector de archivo)
  await root.locator('#tcBody').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const fc = page.waitForEvent('filechooser');
  await root.locator('#tcSend').click();
  const chooser = await fc;
  await expect(root.locator('#tcFotoC')).toHaveClass(/tc-hi/);
  await chooser.setFiles({ name: 'formato.png', mimeType: 'image/png', buffer: Buffer.from(PNG.split(',')[1], 'base64') });
  await expect(root.locator('#tcFotoC .tc-th')).toHaveCount(1);
  await expect(root.locator('#tcSend')).toHaveText('Enviar tareo');
  // si el celular recarga la página al volver de la cámara: mismo día y mismo paso
  await page.reload();
  await expect(page.locator('#tcRoot .tc-step.on')).toContainText('Enviar');
  await expect(page.locator('#tcRoot .tc-date.on')).toContainText('Hoy');
  noErrors(errors, 'UX4');
});

test('UX6: ayer y anteayer enviados/revisados se abren en solo lectura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const env = (date, st) => ['tareo', `${date}_${CAP}`, { ...ready(date), st, envN: 1, envAt: Date.parse(date + 'T17:10:00-05:00'), envBy: CAP, hist: [{ t: 1, by: CAP, a: 'env' }] }];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: base([env(AYER, 'env'), env(ANTE, 'rev')]) });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  const ay = root.locator(`[data-tcd="${AYER}"]`), an = root.locator(`[data-tcd="${ANTE}"]`);
  // antes: botón deshabilitado
  await expect(ay).toBeEnabled();
  await expect(ay).toContainText('Enviado ✓');
  await expect(an).toBeEnabled();
  await expect(an).toContainText('Revisado');
  await ay.click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  await expect(root.locator('.tc-rr')).toHaveCount(1);
  await expect(root.locator('.tc-steps')).toHaveCount(0);
  await expect(root.locator('#tcFile')).toHaveCount(0);
  await expect(root.locator('[data-tca="fx"]')).toHaveCount(0);
  await expect(root.locator('.tc-foot')).toHaveCount(0);
  // aunque se intente cambiar desde el código de la pantalla, no se escribe
  await page.evaluate(() => { tcChg(); });
  await page.waitForTimeout(1300);
  expect((await dbDoc(page, `${AYER}_${CAP}`)).st).toBe('env');
  await an.click();
  await expect(root.locator('#tcSentB')).toContainText('Revisado por la oficina');
  noErrors(errors, 'UX6');
});
