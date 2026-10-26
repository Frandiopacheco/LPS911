// Descuentos a subcontratistas (24-10-2026, docs/ia/tareo.md «Descuentos a SC»): partida descontable (tpc.dct), paso «Descuentos» del
// capataz antes de la foto (reparto por obrero entre los SC de Configuración), revisión de la oficina (observación que bloquea y
// «Editar reparto…») y Costos (día, vista «Descuentos a SC» con tarifa por categoría y recargo de HE). Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const CAP = 'tcap@obra.pe';
const ID = `${HOY}_${CAP}`;
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const ob = (dni, ape, nom) => ['tper', dni, { dni, ape, nom, pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap: CAP, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const row = (ape, nom, h, x = {}) => ({ ape, nom, cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false, h, ...x });
const BASE = [
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', act: true, ord: 1 }],
  ['tpc', 'p13_08', { cod: '13.08', grp: '13', grpN: 'VARIOS', nom: 'Descuentos a SC', act: true, ord: 2, dct: true }],
  ['tcfg', 'main', { limEnv: '18:00', scd: [{ id: 'sA', n: 'DRYWALL', act: true }, { id: 'sB', n: 'ELECTRICAS', act: true }, { id: 'sC', n: 'VIEJO', act: false }] }],
  ob('40000001', 'ALVA ROJAS', 'ANA'), ob('40000002', 'BRAVO DIAZ', 'BETO'),
];
const doc = (o = {}) => ({ date: HOY, cap: CAP, capN: 'Teodoro Capataz', st: 'bor', modo: 'hrs', pcs: ['p10_05', 'p13_08'], foto: [], hist: [],
  rows: { 40000001: row('ALVA ROJAS', 'ANA', { p10_05: 4.5, p13_08: 4 }), 40000002: row('BRAVO DIAZ', 'BETO', { p13_08: 8.5 }) }, ...o });
const dbT = page => page.evaluate(i => window.__dbGet('tareo', i) || {}, ID);

test('capataz: paso «Descuentos» solo con partida descontable; no deja seguir sin repartir; «Todo a», un toque por obrero y «Dividir…»', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...BASE, ['tareo', ID, doc()]] });
  const root = page.locator('#tcRoot');
  await expect(root).toBeVisible();
  // cinco pasos: «Descuentos» entre Horas y Enviar
  await expect(root.locator('.tc-step')).toHaveCount(5);
  await expect(root.locator('.tc-step').nth(3)).toHaveAttribute('data-tcs', '5');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await root.locator('.tc-foot [data-tcs="5"]').click();
  await expect(root.locator('.tc-h h2')).toHaveText('Descuentos a SC');
  await expect(root.locator('.tc-dob')).toHaveCount(2);
  // el inactivo no sale para elegir
  await expect(root.locator('.tc-dall')).not.toContainText('VIEJO');
  await expect(root.locator('.tc-dlab')).toContainText('faltan 12,5 h');
  // sin repartir no pasa a Enviar: se queda aquí con el primero marcado
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('.tc-h h2')).toHaveText('Descuentos a SC');
  await expect(root.locator('.tc-dob.need')).toHaveCount(2);
  // «Todo a DRYWALL» y luego Beto a ELECTRICAS con un toque
  await root.locator('.tc-dall [data-sc="sA"]').click();
  await expect(root.locator('.tc-dob.ok')).toHaveCount(2);
  await root.locator('.tc-dob[data-dni="40000002"] [data-tca="dctOne"][data-sc="sB"]').click();
  await expect(root.locator('.tc-dob[data-dni="40000002"] .tc-dst')).toHaveText('✓ ELECTRICAS');
  // Ana: 3 h a DRYWALL y el resto a ELECTRICAS
  await root.locator('.tc-dob[data-dni="40000001"] [data-tca="dctSplit"]').click();
  const sh = page.locator('#tcDct');
  await sh.locator('.tc-dsr[data-sc="sA"] [data-v="-0.5"]').click();
  await sh.locator('.tc-dsr[data-sc="sA"] [data-v="-0.5"]').click();
  await expect(sh.locator('#tcDctD')).toContainText('Faltan 1 h');
  await sh.locator('.tc-dsr[data-sc="sB"] [data-tca="dctRest"]').click();
  await expect(sh.locator('#tcDctD')).toContainText('Repartido completo');
  // 25-10-2026: se escriben las horas y la hoja no se rearma (antes cada ½ parpadeaba y no se podía escribir)
  await sh.evaluate(el => { el.__mismo = true; });
  // al tocar el campo el número queda seleccionado (se escribe encima)
  await sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]').click();
  expect(await sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]').evaluate(i => [i.selectionStart, i.selectionEnd, i.value.length])).toEqual([0, 1, 1]);
  await page.keyboard.type('2,5');
  await expect(sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]')).toHaveValue('2,5');
  // ni el guardado (1 s después) ni la respuesta de la base rearman la hoja ni le quitan el foco
  await page.waitForTimeout(1600);
  expect(await sh.evaluate(el => el.__mismo === true && document.activeElement && document.activeElement.dataset.dcin === 'sA')).toBe(true);
  await sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]').fill('2,5');
  await expect(sh.locator('#tcDctD')).toContainText('Faltan 0,5 h');
  await sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]').fill('9');
  await expect(sh.locator('#tcDctD')).toContainText('Sobran');
  await sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]').press('Enter'); // al salir se ajusta a lo que queda (3 h)
  await expect(sh.locator('.tc-dsr[data-sc="sA"] [data-dcin]')).toHaveValue('3');
  await expect(sh.locator('#tcDctD')).toContainText('Repartido completo');
  expect(await sh.evaluate(el => el.__mismo === true)).toBe(true);
  await sh.locator('.tc-csa [data-tca="dctX"]').click();
  await expect(root.locator('#tcDctSum')).toContainText('DRYWALL 3 h');
  await expect(root.locator('#tcDctSum')).toContainText('ELECTRICAS 9,5 h');
  await expect.poll(async () => (await dbT(page)).rows['40000001'].dct).toEqual({ p13_08: { sA: 3, sB: 1 } });
  expect((await dbT(page)).rows['40000002'].dct).toEqual({ p13_08: { sB: 8.5 } });
  // a Enviar: resumen del descuento; «← Atrás» vuelve a Descuentos
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('#tcDctRes')).toContainText('13.08');
  await expect(root.locator('#tcDctRes')).toContainText('DRYWALL 3 h');
  await root.locator('.tc-foot [data-tcs="5"]').click();
  await expect(root.locator('.tc-h h2')).toHaveText('Descuentos a SC');
  // si cambian las horas de quien tenía un solo SC, al volver se ajusta solo
  await page.evaluate(() => { const h = TCS.doc.rows['40000002'].h; h.p13_08 = 8; h.p10_05 = 0.5; tcChg(); });
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await root.locator('.tc-foot [data-tcs="5"]').click();
  await expect.poll(async () => (await dbT(page)).rows['40000002'].dct).toEqual({ p13_08: { sB: 8 } });
  noErrors(errors);
});

test('capataz sin partida descontable con horas: cuatro pasos (no aparece «Descuentos»)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...BASE, ['tareo', ID, doc({ pcs: ['p10_05'], rows: { 40000001: row('ALVA ROJAS', 'ANA', { p10_05: 8.5 }), 40000002: row('BRAVO DIAZ', 'BETO', { p10_05: 8.5 }) } })]] });
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-step')).toHaveCount(4);
  noErrors(errors);
});

test('oficina: el reparto incompleto es observación que impide marcar revisado; «Editar reparto…» lo guarda sin cambiar el estado', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const env = Date.parse(HOY + 'T08:40:00-05:00');
  const t = doc({ st: 'env', envAt: env, envN: 1, foto: ['f1'], cfg: CFG, hist: [{ t: env, by: CAP, a: 'env' }],
    rows: { 40000001: row('ALVA ROJAS', 'ANA', { p10_05: 4.5, p13_08: 4 }, { dct: { p13_08: { sA: 4 } } }), 40000002: row('BRAVO DIAZ', 'BETO', { p13_08: 8.5 }) } });
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: [...BASE, ['tfot', 'f1', { date: HOY, cap: CAP, n: 1, d: FOTO, by: CAP, ts: 1 }], ['tareo', ID, t]] });
  await page.evaluate(() => { U.mod = 'tar'; U.tab = 'tdia'; render(); });
  await page.locator(`tr[data-to="${ID}"] button[data-to]`).click();
  const m = page.locator('#trWs');
  await expect(m.locator('#txW')).toBeVisible();
  await expect(m.locator('#trDct')).toContainText('DRYWALL');
  await expect(m.locator('#trDct')).toContainText('1 obrero sin repartir completo');
  await expect(m.locator('#trObs')).toContainText('falta indicar a qué subcontratista');
  // «Marcar revisado» deshabilitado con el motivo
  await expect(m.locator('[data-tra="rev"]')).toBeDisabled();
  await expect(m.locator('[data-tra="rev"]')).toHaveAttribute('title', /falta indicar a qué subcontratista/);
  // editar el reparto: Beto 6 a ELECTRICAS (faltan 2,5), luego 2,5 a DRYWALL
  await m.locator('#trDctEd').click();
  const dlg = page.locator('#lqm');
  const inp = (d, sc) => dlg.locator(`input[data-dni="${d}"][data-pc="p13_08"][data-sc="${sc}"]`);
  await inp('40000002', 'sB').fill('6');
  await expect(dlg.locator('#trdS_40000002_p13_08')).toHaveText('faltan 2.5');
  await dlg.locator('#trdOk').click();
  await expect(dlg.locator('#trdMsg')).toContainText('BRAVO DIAZ');
  await inp('40000002', 'sA').fill('2,5');
  await expect(dlg.locator('#trdS_40000002_p13_08')).toHaveText('✓');
  await dlg.locator('#trdOk').click();
  await expect(dlg).toHaveCount(0);
  const d = await dbT(page);
  expect(d.rows['40000002'].dct).toEqual({ p13_08: { sB: 6, sA: 2.5 } });
  expect(d.rows['40000001'].dct).toEqual({ p13_08: { sA: 4 } });
  expect(d.st).toBe('env');
  expect(d.hist.at(-1).a).toBe('cor');
  expect(d.hist.at(-1).cam).toContain('Descuento a SC');
  await expect(m.locator('[data-tra="rev"]')).toBeEnabled();
  noErrors(errors);
});

test('Costos: vista de un día y «Descuentos a SC» con tarifa por categoría y recargo de las horas extra', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const PCS = { p10_05: { cod: '10.05', nom: 'Encofrado de muros', grp: '10', grpN: 'ESTRUCTURAS', ua: 'CD2' }, p13_08: { cod: '13.08', nom: 'Descuentos a SC', grp: '13', grpN: 'VARIOS', ua: 'CD9', dct: true } };
  const R = (dni, ape, h, trab, ext, dct) => ({ dni, ape, nom: 'X', cat: 'OP', cua: 'ALBAÑILES', cap: CAP, capN: 'Teodoro Capataz', as: true, mot: '', alt: false, h, trab, ext, dct });
  const pub = ['tpub', `${HOY}_v1`, { fecha: HOY, v: 1, at: 1, by: 'jefe@obra.pe', byN: 'Jefe', motivo: '', ant: null, fuentes: [], pcs: PCS, exc: {}, tot: null, dif: null, cfg: CFG, jor: 8.5, nl: false,
    scd: { sA: 'DRYWALL', sB: 'ELECTRICAS' },
    rows: [R('40000001', 'ALVA ROJAS', { p10_05: 4.5, p13_08: 4 }, 8.5, 0, { p13_08: { sA: 3, sB: 1 } }), R('40000002', 'BRAVO DIAZ', { p13_08: 9.5 }, 9.5, 1, { p13_08: { sB: 9.5 } })] }];
  const extra = [...BASE, pub, ['tpubidx', HOY, { fecha: HOY, v: 1, vers: [{ v: 1, at: 1, by: 'jefe@obra.pe' }], abierto: null }],
    ['tcfg', 'pla', { dtar: [{ desde: '2026-01-01', t: { OP: 30, OF: null, PE: 20 } }] }]];
  const errors = await openApp(page, { as: 'admin', editar: false, extra });
  await page.evaluate(() => { U.mod = 'tar'; U.tab = 'tcos'; TCO.tipo = 'dia'; TCO.ref = window.__E2E.today; TCO.vista = 'dct'; render(); });
  await expect(page.locator('#tcoTipo [data-tst="dia"]')).toHaveClass(/on/);
  await expect(page.locator('#tcoDcT')).toBeVisible();
  // DRYWALL: 3 h × 30 = 90 · ELECTRICAS: 1 h × 30 + Beto 8,5 h × 30 + 1 HE × 30 × 1,6 = 30 + 255 + 48 = 333
  const g = n => page.locator('#tcoDcT tr.tco-dg').filter({ hasText: n });
  await expect(g('DRYWALL')).toContainText('S/ 90');
  await expect(g('ELECTRICAS')).toContainText('S/ 333');
  await expect(page.locator('#tcoDctT')).toContainText('S/ 423');
  await g('ELECTRICAS').locator('button').click();
  await expect(page.locator('#tcoDcT tr.tco-dr')).toHaveCount(2);
  await expect(page.locator('#tcoDcT tr.tco-dr').filter({ hasText: 'BRAVO' })).toContainText('S/ 303');
  // los montos de los descuentos los ve quien ve los soles; el jefe de producción ve solo horas
  const r = await page.evaluate(() => { const a = TCO.ref; const PB = tsePB('co'); const R2 = tsCalc(a, a, PB); return R2.DC.map(x => [x.scN, x.h, x.hn, x.h60, Math.round(x.monto)]); });
  expect(r).toEqual([['DRYWALL', 3, 3, 0, 90], ['ELECTRICAS', 1, 1, 0, 30], ['ELECTRICAS', 9.5, 8.5, 1, 303]]);
  // Excel: hoja «10 Descuentos a SC» con subtotales y total
  const { createRequire } = await import('node:module');
  const { readFileSync } = await import('node:fs');
  const require = createRequire(import.meta.url);
  const XLSX = require('xlsx-js-style');
  await page.route(/cdn\.jsdelivr\.net\/npm\/xlsx-js-style/, rt => rt.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(require.resolve('xlsx-js-style/dist/xlsx.bundle.js'), 'utf8') }));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#tcoX')]);
  const wb = XLSX.read(readFileSync(await dl.path()));
  expect(wb.SheetNames).toContain('10 Descuentos a SC');
  const A2 = XLSX.utils.sheet_to_json(wb.Sheets['10 Descuentos a SC'], { header: 1 });
  const fila = t => A2.find(x => x[0] === t) || [];
  expect(fila('Subtotal DRYWALL')[14]).toBe(90);
  expect(fila('Subtotal ELECTRICAS')[14]).toBe(333);
  expect(fila('TOTAL')[11]).toBe(13.5);
  expect(fila('TOTAL')[14]).toBe(423);
  noErrors(errors);
});
