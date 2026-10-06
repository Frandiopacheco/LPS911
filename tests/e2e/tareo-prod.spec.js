// Revisión de producción (pedido del dueño, 06-10-2026; docs/ia/tareo.md «Revisión de producción — implementación»).
// El jefe de producción (editor con tpub) y el admin revisan las horas por partida de un tareo «Enviado» o «Revisado» sin cotejar
// firmas: mover horas, agregar/quitar partida, aviso de HH totales cambiadas (confirmación y motivo), «Conforme sin cambios».
// No cambia el estado, el cotejo ni la revisión de la oficina. Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const per = (dni, ape, cap) => ['tper', dni, { dni, ape, nom: 'X', pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const row = (ape, o = {}) => ({ ape, nom: 'X', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false, ...o });
const T1 = HOY + '_tcap@obra.pe', T2 = HOY + '_tcap2@obra.pe';
const ENV = Date.parse(HOY + 'T08:40:00-05:00');
const COT = { 11111111: { fir: true, by: 'tasis@obra.pe', t: 1 }, 22222222: { fir: true, by: 'tasis@obra.pe', t: 1 } };
const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const base = (o1 = {}, o2 = {}) => [
  ['members', 'tcap2@obra.pe', { role: 'tcap', name: 'Bruno Segundo' }],
  ['tcfg', 'main', { limEnv: '18:00', tolGar: 15 }],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales', act: true }],
  ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true }],
  ['tpc', 'p10_20', { cod: '10.20', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Acero de vigas', act: true }],
  per('11111111', 'ALFA', 'tcap@obra.pe'), per('22222222', 'BETA', 'tcap@obra.pe'), per('33333333', 'GAMMA', 'tcap@obra.pe'), per('44444444', 'DELTA', 'tcap2@obra.pe'),
  ['tfot', 'f1', { date: HOY, cap: 'tcap@obra.pe', n: 1, d: FOTO, by: 'tcap@obra.pe', ts: 1 }],
  ['tareo', T1, { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: ENV, envN: 1, envBy: 'tcap@obra.pe', foto: ['f1'], cotFot: ['f1'], cot: COT, cfg: CFG,
    modo: 'hrs', pcs: ['p10_10', 'p10_05'],
    rows: { 11111111: row('ALFA', { h: { p10_10: 4, p10_05: 4.5 } }), 22222222: row('BETA', { h: { p10_05: 8.5 } }), 33333333: row('GAMMA', { as: false, mot: 'DM', h: {} }) },
    hist: [{ t: ENV, by: 'tcap@obra.pe', a: 'env' }], by: 'tcap@obra.pe', ts: 1, ...o1 }],
  ['tareo', T2, { date: HOY, cap: 'tcap2@obra.pe', capN: 'Bruno Segundo', st: 'rev', envAt: ENV, envN: 1, foto: ['f1'], cotFot: ['f1'], cot: { 44444444: { fir: true } }, cfg: CFG,
    revAt: ENV + 1000, revBy: 'tasis@obra.pe', modo: 'hrs', pcs: ['p10_05'], rows: { 44444444: row('DELTA', { h: { p10_05: 8.5 } }) },
    hist: [{ t: ENV, by: 'tcap2@obra.pe', a: 'env' }, { t: ENV + 1000, by: 'tasis@obra.pe', a: 'rev' }], by: 'tasis@obra.pe', ts: 1, ...o2 }],
];
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);
const dbT = (page, id) => page.evaluate(id => window.__dbGet('tareo', id), id);
const cell = (m, d, pc) => m.locator(`#trh_${d}_${pc}`);
const abrir = async (page, id) => { await tab(page, 'tdia'); await page.locator(`tr[data-to="${id}"] button[data-to]`).click(); return page.locator('#trWs'); };

test('producción: el jefe mueve horas, agrega partida y cambia un total (aviso, confirmación y motivo); no cambia estado ni cotejo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base() });
  const m = await abrir(page, T1);
  // modo producción directo: grilla editable, sin cotejo ni acciones de la oficina; la foto va plegada
  await expect(m.locator('.tr-pgrid')).toBeVisible();
  await expect(m).toContainText('Revisión de producción');
  for (const s of ['#trAll', '#trRev', '#trCor', '#toReab', '[data-tra="fir"]', '.tr-mode']) await expect(m.locator(s)).toHaveCount(0);
  await expect(m.locator('#trFoto')).toBeHidden();
  await m.locator('#trPfo').click();
  await expect(m.locator('#trFoto')).toBeVisible();
  await m.locator('#trPfo').click();
  await expect(m.locator('#trFoto')).toBeHidden();
  // GAMMA no vino: no tiene celdas (la asistencia es de la oficina)
  await expect(cell(m, '33333333', 'p10_10')).toHaveCount(0);
  await expect(m.locator('#trPrConf')).toBeVisible();
  // ALFA: mover 2 de sus 4 h de 10.10 a 10.05 (por defecto propone todo)
  await cell(m, '11111111', 'p10_10').click();
  await expect(m.locator('#trMvBar')).toContainText('ALFA');
  await m.locator('#trMv').click();
  await expect(page.locator('#trMvN')).toHaveValue('4');
  await expect(page.locator('#lqm input[name="trMvP"][value="p10_05"]')).toBeChecked();
  await page.locator('#trMvN').fill('2');
  await page.locator('#trMvOk').click();
  await expect(cell(m, '11111111', 'p10_10')).toHaveValue('2');
  await expect(cell(m, '11111111', 'p10_05')).toHaveValue('6.5');
  await expect(m.locator('#trht_11111111')).toHaveText('8.5');
  await expect(m.locator('tr[data-tro="11111111"]')).not.toHaveClass(/tr-tch/);
  await expect(m.locator('#trPrTot')).toHaveCount(0);
  await expect(m.locator('#trEdN')).toHaveText('2 cambios sin guardar');
  // BETA: 8,5 → 9 h: la fila en ámbar y el aviso de arriba
  await cell(m, '22222222', 'p10_05').fill('9');
  await expect(m.locator('tr[data-tro="22222222"]')).toHaveClass(/tr-tch/);
  await expect(m.locator('#trpo_22222222')).toHaveText('Total cambió 8,5 → 9 h');
  await expect(m.locator('#trPrTot')).toContainText('Cambiaste las HH totales de 1 obrero: ya no coinciden con lo que firmaron en el formato');
  // agregar una partida del día
  await m.locator('#trPcAdd').selectOption('p10_20');
  await expect(cell(m, '11111111', 'p10_20')).toBeFocused();
  // guardar: confirmación (tono warn, con la lista) y motivo obligatorio
  const asked = [];
  page.on('dialog', dg => { asked.push(dg.message()); dg.type() === 'prompt' ? dg.accept('BETA se quedó 30 min más en pedestales') : dg.accept(); });
  await m.locator('#trPrOk').click();
  await expect.poll(async () => ((await dbT(page, T1)).prod || {}).by).toBe('jefe@obra.pe');
  expect(asked[0]).toContain('Cambiaste las HH totales de 1 obrero');
  expect(asked[0]).toContain('BETA, X: 8,5 → 9 h');
  expect(asked[1]).toContain('Motivo (obligatorio');
  const d = await dbT(page, T1);
  expect(d.st).toBe('env');
  expect(d.cot).toEqual(COT);
  expect(d.cotFot).toEqual(['f1']);
  expect(d.revBy).toBeUndefined();
  expect(d.pcs).toEqual(['p10_10', 'p10_05', 'p10_20']);
  expect(d.rows['11111111'].h).toEqual({ p10_10: 2, p10_05: 6.5 });
  expect(d.rows['22222222'].h).toEqual({ p10_05: 9 });
  expect(d.rows['22222222'].trab).toBe(9);
  expect(d.rows['22222222'].ext).toBe(0.5);
  expect(d.rows['33333333'].as).toBe(false);
  expect(d.prod).toMatchObject({ by: 'jefe@obra.pe', byN: 'Jaime Jefe' });
  const h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'prod', by: 'jefe@obra.pe', tot: true, mot: 'BETA se quedó 30 min más en pedestales' });
  expect(h.cam).toContain('Cambió HH totales');
  expect(h.det).toEqual(expect.arrayContaining([{ dni: '22222222', pc: 'p10_05', campo: 'h', antes: 8.5, despues: 9 }, { pc: 'p10_20', campo: 'pcs', antes: false, despues: true }]));
  expect(d.hist).toHaveLength(2);
  // sigue en producción con la versión guardada; el historial lo muestra
  await expect(m.locator('#trPrConf')).toHaveText('Conforme otra vez');
  await expect(m.locator('#trHead .tr-prodc')).toHaveText('Producción ✓');
  await expect(m.locator('#trPrTot')).toHaveCount(0);
  // la lista del día muestra el chip
  await m.locator('#trBack').click();
  await expect(page.locator(`tr[data-to="${T1}"] .tr-prodc`)).toHaveText('Producción ✓');
  await expect(page.locator(`tr[data-to="${T2}"] .tr-prodc`)).toHaveCount(0);
  noErrors(errors, 'producción');
});

test('producción: solo mover horas (totales iguales) pide motivo opcional; quitar una partida con horas las mueve; un revisado sigue revisado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base({ st: 'rev', revAt: ENV + 500, revBy: 'tasis@obra.pe' }) });
  const m = await abrir(page, T1);
  await expect(m.locator('.tr-pgrid')).toBeVisible();
  // quitar 10.10 (ALFA tiene 4 h): ventana con mover a 10.05 (por defecto) o borrar
  await m.locator('th[data-pc="p10_10"] [data-tra="pcdel"]').click();
  await expect(page.locator('#lqm')).toContainText('Quitar la partida 10.10');
  await expect(page.locator('#lqm input[name="trPdP"][value="p10_05"]')).toBeChecked();
  await page.locator('#trPdOk').click();
  await expect(m.locator('th[data-pc="p10_10"]')).toHaveCount(0);
  await expect(cell(m, '11111111', 'p10_05')).toHaveValue('8.5');
  await expect(m.locator('#trPrTot')).toHaveCount(0);
  const asked = [];
  page.on('dialog', dg => { asked.push(dg.message()); dg.type() === 'prompt' ? dg.accept('') : dg.accept(); });
  await m.locator('#trPrOk').click();
  await expect.poll(async () => !!(await dbT(page, T1)).prod).toBe(true);
  expect(asked).toHaveLength(1); // sin confirmación de totales
  expect(asked[0]).toContain('Motivo (opcional)');
  const d = await dbT(page, T1);
  expect(d.st).toBe('rev');
  expect(d.revBy).toBe('tasis@obra.pe');
  expect(d.pcs).toEqual(['p10_05']);
  expect(d.rows['11111111'].h).toEqual({ p10_05: 8.5 });
  const h = d.hist[d.hist.length - 1];
  expect(h).toMatchObject({ a: 'prod', tot: false });
  expect(h.mot).toBeUndefined();
  noErrors(errors, 'producción mover');
});

test('producción: «Conforme sin cambios» solo marca prod; el admin elige oficina o producción; reabrir quita la marca', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'admin', editar: false, extra: base() });
  let m = await abrir(page, T2);
  // el admin entra en la revisión de oficina y puede pasar a la de producción
  await expect(m.locator('.tr-mode')).toBeVisible();
  await expect(m.locator('#trQrev')).toBeVisible();
  await m.locator('[data-trmode="prod"]').click();
  await expect(m.locator('.tr-pgrid')).toBeVisible();
  await expect(m.locator('#trQrev')).toHaveCount(0);
  page.on('dialog', dg => dg.type() === 'prompt' ? dg.accept('Volver a revisar') : dg.accept());
  await m.locator('#trPrConf').click();
  await expect.poll(async () => !!(await dbT(page, T2)).prod).toBe(true);
  let d = await dbT(page, T2);
  expect(d.st).toBe('rev');
  expect(d.rows['44444444'].h).toEqual({ p10_05: 8.5 });
  expect(d.hist[d.hist.length - 1]).toMatchObject({ a: 'prod', cam: 'Conforme sin cambios', by: 'frandiopacheco@gmail.com' });
  // de vuelta a la oficina: ve la marca y puede reabrir (la marca se borra: lo reenviado se revisa de nuevo)
  await m.locator('[data-trmode="ofi"]').click();
  await expect(m.locator('#trProdV')).toContainText('Revisado por producción');
  await m.locator('#toReab').click();
  await expect.poll(async () => (await dbT(page, T2)).st).toBe('reab');
  d = await dbT(page, T2);
  expect(d.prod).toBeUndefined();
  noErrors(errors, 'producción conforme');
});

test('producción: en Publicación, «X de Y tareos revisados por producción» y «Revisar horas» abre la revisión', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base({}, { prod: { t: ENV + 2000, by: 'jefe@obra.pe', byN: 'Jaime Jefe' } }) });
  await tab(page, 'tpub');
  await page.locator('#tpbVer').click();
  await expect(page.locator('#tpbProdN')).toHaveText('1 de 2 tareos revisados por producción');
  await expect(page.locator(`#tpbProd [data-tpbp="${T2}"] .tr-prodc`)).toHaveText('Producción ✓');
  await page.locator(`#tpbProd [data-tpbr="${T1}"]`).click();
  const m = page.locator('#trWs');
  await expect(m.locator('.tr-pgrid')).toBeVisible();
  await expect(m).toContainText('Teodoro Capataz');
  noErrors(errors, 'producción publicación');
});

test('producción: si otro usuario cambia el tareo, «Recargar versión actual» conserva lo cambiado; captura 1440×900', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: base() });
  const m = await abrir(page, T1);
  await cell(m, '11111111', 'p10_10').fill('4.5');
  await page.evaluate(id => fcol('tareo').doc(id).update({ 'rows.22222222.h': { p10_05: 8 } }), T1);
  await expect(m.locator('#trConfl')).toBeVisible();
  await m.locator('#trReload').click();
  await expect(cell(m, '11111111', 'p10_10')).toHaveValue('4.5');
  await expect(cell(m, '22222222', 'p10_05')).toHaveValue('8');
  await expect(m.locator('#trpo_11111111')).toHaveText('Total cambió 8,5 → 9 h');
  await cell(m, '11111111', 'p10_05').click();
  if (process.env.TP_SHOT) await page.screenshot({ path: process.env.TP_SHOT });
  noErrors(errors, 'producción conflicto');
});
