// Módulo Tareo (fase 1): cálculo del tareo (tBlqH, tCalc, tValida) y «Tareos del día» de la oficina
// (lista de capataces, detalle de solo lectura y reabrir al capataz). Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const per = (dni, ape, cap) => ['tper', dni, { dni, ape, nom: 'X', pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const row = (ape, o = {}) => ({ ape, nom: 'X', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false, ...o });
const EXTRA = [
  ['members', 'tcap2@obra.pe', { role: 'tcap', name: 'Bruno Borrador' }],
  ['members', 'tcap3@obra.pe', { role: 'tcap', name: 'Zoila Sinempezar' }],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales', act: true }],
  ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true }],
  per('11111111', 'ALFA', 'tcap@obra.pe'), per('22222222', 'BETA', 'tcap@obra.pe'), per('33333333', 'GAMMA', 'tcap@obra.pe'),
  per('44444444', 'DELTA', 'tcap2@obra.pe'), per('55555555', 'EPSILON', 'tcap3@obra.pe'),
  ['tfot', 'f1', { date: HOY, cap: 'tcap@obra.pe', n: 1, d: FOTO, by: 'tcap@obra.pe', ts: 1 }],
  ['tareo', HOY + '_tcap@obra.pe', { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: Date.parse(HOY + 'T17:40:00-05:00'), envBy: 'tcap@obra.pe', foto: ['f1'],
    rows: { 11111111: row('ALFA', { alt: true }), 22222222: row('BETA'), 33333333: row('GAMMA', { as: false, mot: 'DM' }) },
    blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['11111111', '22222222'] }, { id: 'b2', pc: 'p10_10', ini: '13:00', fin: '19:00', dnis: ['11111111'] }, { id: 'b3', pc: 'p10_05', ini: '13:00', fin: '17:00', dnis: ['22222222'] }],
    hist: [{ t: Date.parse(HOY + 'T17:40:00-05:00'), by: 'tcap@obra.pe', a: 'env' }], by: 'tcap@obra.pe', ts: 1 }],
  ['tareo', HOY + '_tcap2@obra.pe', { date: HOY, cap: 'tcap2@obra.pe', capN: 'Bruno Borrador', st: 'bor', foto: [],
    rows: { 44444444: row('DELTA') }, blq: [], by: 'tcap2@obra.pe', ts: 1 }],
];
const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);

test('cálculo: horas por bloque, extra, cruces y validaciones', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(() => {
    const R = o => ({ ape: 'A', nom: 'B', as: true, mot: '', ...o });
    const B = (pc, ini, fin, dnis) => ({ id: pc + ini, pc, ini, fin, dnis });
    const doc = (date, rows, blq, foto = ['f']) => ({ date, rows, blq, foto });
    const lv = doc('2026-09-28', { d1: R() }, [B('p1', '07:30', '17:00', ['d1'])]);
    const sa = doc('2026-10-03', { d1: R() }, [B('p1', '07:30', '13:00', ['d1'])]);
    const dos = doc('2026-09-28', { d1: R() }, [B('p1', '07:30', '12:00', ['d1']), B('p2', '13:00', '19:00', ['d1'])]);
    const cruce = doc('2026-09-28', { d1: R() }, [B('p1', '07:30', '12:00', ['d1']), B('p2', '11:00', '13:00', ['d1'])]);
    const aus = doc('2026-09-28', { d1: R(), d2: R({ as: false }) }, [B('p1', '07:30', '17:00', ['d1'])]);
    const dom = doc('2026-10-04', { d1: R() }, [B('p1', '07:30', '12:00', ['d1'])]);
    const malo = doc('2026-09-28', { d1: R() }, [B('p1', '12:00', '08:00', ['d1'])]);
    // no vino pero sigue en el bloque: no es error (0 h) · sin marcar (as null/undefined): error y sin horas · partida bloqueada por costos
    const enBlq = doc('2026-09-28', { d1: R(), d2: R({ as: false, mot: 'DM' }) }, [B('p1', '07:30', '17:00', ['d1', 'd2'])]);
    const sinMarca = doc('2026-09-28', { d1: R(), d2: R({ as: null, ape: 'SINMARCA' }), d3: R({ as: undefined, ape: 'OTRO' }) }, [B('p1', '07:30', '17:00', ['d1', 'd2'])]);
    S.tpc.set('pbq', { id: 'pbq', cod: '10.07', nom: 'x', bloq: true });
    const bloq = doc('2026-09-28', { d1: R() }, [B('pbq', '07:30', '12:00', ['d1']), B('pbq', '13:00', '17:00', ['d1'])]);
    const out = { vEnBlq: tValida(enBlq), cEnBlq: tCalc(enBlq).rows.d2, vSin: tValida(sinMarca), cSin: tCalc(sinMarca).rows.d2, vBloq: tValida(bloq) };
    S.tpc.delete('pbq');
    return {
      blq: [tBlqH('2026-09-28', '07:30', '17:00'), tBlqH('2026-10-03', '07:30', '13:00'), tBlqH('2026-09-28', '13:00', '19:00')],
      lv: tCalc(lv).rows.d1, sa: tCalc(sa).rows.d1, dos: tCalc(dos).rows.d1, dom: tCalc(dom).rows.d1, aus: tCalc(aus).rows.d2,
      vOk: tValida(dos), vCruce: tValida(cruce), vAus: tValida(aus), vFoto: tValida({ ...dos, foto: [] }), vMalo: tValida(malo), vVacio: tValida(doc('2026-09-28', {}, [])),
      noMuta: !('h' in lv.rows.d1), ...out,
    };
  });
  expect(r.blq).toEqual([8.5, 5.5, 6]);
  expect(r.lv).toMatchObject({ h: { p1: 8.5 }, ini: '07:30', fin: '17:00', trab: 8.5, ext: 0 });
  expect(r.sa).toMatchObject({ h: { p1: 5.5 }, trab: 5.5, ext: 0 });
  expect(r.dos).toMatchObject({ h: { p1: 4.5, p2: 6 }, ini: '07:30', fin: '19:00', trab: 10.5, ext: 2 });
  expect(r.dom).toMatchObject({ trab: 4.5, ext: 4.5 });
  expect(r.aus).toMatchObject({ h: {}, trab: 0, ext: 0 });
  expect(r.noMuta).toBe(true);
  expect(r.vOk).toEqual([]);
  expect(r.vCruce.map(x => [x.dni, x.k])).toEqual([['d1', 'cruce']]);
  expect(r.vAus).toEqual([]); // el motivo de «no vino» es opcional (observaciones del dueño, oct 2026)
  expect(r.vFoto.map(x => [x.dni, x.k])).toEqual([[null, 'foto']]);
  expect(r.vMalo.map(x => x.k)).toEqual(['hora', 'sinh']);
  expect(r.vVacio.map(x => x.k)).toEqual(['vacio']);
  expect(r.vEnBlq).toEqual([]);
  expect(r.cEnBlq).toMatchObject({ h: {}, trab: 0, ext: 0 });
  expect(r.vSin.map(x => [x.dni, x.k])).toEqual([['d2', 'marca'], ['d3', 'marca']]);
  expect(r.vSin[0].msg).toBe('Falta marcar si vino: SINMARCA');
  expect(r.cSin).toMatchObject({ h: {}, trab: 0, ext: 0 });
  expect(r.vBloq.map(x => [x.k, x.msg])).toEqual([['bloq', 'La partida 10.07 está bloqueada por costos.']]);
  noErrors(errors, 'cálculo');
});

test('Tareos del día: lista, detalle de solo lectura y reabrir al capataz', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  const env = page.locator(`tr[data-to="${HOY}_tcap@obra.pe"]`), bor = page.locator(`tr[data-to="${HOY}_tcap2@obra.pe"]`), sin = page.locator('tr[data-tcap="tcap3@obra.pe"]');
  await expect(env).toContainText('Enviado 17:40');
  await expect(bor).toContainText('Borrador');
  await expect(sin).toContainText('Sin empezar');
  await expect(sin).toContainText('1 obrero asignado');
  // fila del enviado: 2 vinieron, 1 falta, HH 10,5 + 8,5 = 19, HE 2, sin observaciones
  await expect(env.locator('[data-l="Vinieron"]')).toHaveText('2');
  await expect(env.locator('[data-l="No vinieron"]')).toHaveText('1');
  await expect(env.locator('[data-l="HH"]')).toHaveText('19');
  await expect(env.locator('[data-l="HE"]')).toHaveText('2');
  await expect(env.locator('[data-l="Observ."]')).toHaveText('');
  await expect(bor.locator('[data-l="Observ."]')).toHaveText('2'); // sin horas + sin foto
  await expect(page.locator('#toEnv')).toContainText('1 de 3');
  await expect(page.locator('#toFal')).toHaveText('1');
  // detalle
  await env.locator('button[data-to]').click();
  const m = page.locator('#trWs');
  await expect(m).toContainText('Tareo de Teodoro Capataz');
  await expect(m.locator('th[title="Encofrado de pedestales"]')).toHaveText('10.05');
  await expect(m.locator('tr[data-dni="11111111"]')).toContainText('(A)');
  await expect(m.locator('tr[data-dni="11111111"]')).toContainText('07:30–19:00');
  await expect(m.locator('tr.tr-frow')).toContainText('DM');
  await expect(m.locator('.to-blq li')).toHaveCount(3);
  await expect(m.locator('#toFotos img')).toHaveCount(1);
  await m.locator('[data-trv="full"]').click();
  await expect(page.locator('.to-zoom img')).toBeVisible();
  await page.locator('.to-zoom').click();
  await expect(page.locator('.to-zoom')).toHaveCount(0);
  // reabrir (motivo obligatorio)
  page.once('dialog', d => d.accept('Faltan las horas de la tarde'));
  await m.locator('#toReab').click();
  await expect.poll(() => page.evaluate(id => window.__dbGet('tareo', id), HOY + '_tcap@obra.pe')).toMatchObject({ st: 'reab', reab: { mot: 'Faltan las horas de la tarde', by: 'frandiopacheco@gmail.com' } });
  const h = await page.evaluate(id => window.__dbGet('tareo', id).hist, HOY + '_tcap@obra.pe');
  expect(h.map(x => x.a)).toEqual(['env', 'reab']);
  await expect(env).toContainText('Reabierto');
  await page.keyboard.press('Escape');
  await expect(m).toHaveCount(0);
  // el borrador no se puede reabrir
  await bor.locator('button[data-to]').click();
  await expect(m).toContainText('Bruno Borrador');
  await expect(page.locator('#toReab')).toHaveCount(0);
  await page.click('#trBack');
  // día anterior: sin tareos, los tres capataces con obreros «sin empezar»
  await page.click('#toPrev');
  await expect(page.locator('#toDate')).toHaveValue('2026-09-30');
  await expect(page.locator('tr[data-tcap]')).toHaveCount(3);
  await expect(page.locator('tr[data-to]')).toHaveCount(0);
  noErrors(errors, 'tareos del día');
});

test('Tareos del día: el jefe de producción ve el detalle sin reabrir', async ({ page }) => {
  const errors = await openApp(page, { as: 'jefe', editar: false, extra: EXTRA });
  await tab(page, 'tdia');
  await expect(page.locator(`tr[data-to="${HOY}_tcap@obra.pe"] [data-toa]`)).toHaveText('Revisar horas');
  await page.locator(`tr[data-to="${HOY}_tcap@obra.pe"] button[data-to]`).click();
  await expect(page.locator('#trWs')).toContainText('Teodoro Capataz');
  await expect(page.locator('#toReab')).toHaveCount(0);
  noErrors(errors, 'jefe');
});

test('Tareos del día: costos no entra (su inicio es «Costos», F3)', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: EXTRA });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tcos');
  await page.evaluate(() => goTab('tdia'));
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tcos');
  noErrors(errors, 'costos');
});

/* ---------- Rediseño de «Tareos del día» (oct 2026): barra del día, tablero de capataces y «Personal activo sin tareo» ---------- */
/* Obra de prueba: 12 capataces en varios estados y 40 obreros activos sin tareo (14 sin capataz). Capturas para mirar a ojo:
   TD_SHOTS=<carpeta> npx playwright test tareo-dia */
const CAPS = [['c01', 'Abel Quispe', 'env'], ['c02', 'Beto Huamán', 'env'], ['c03', 'Carlos Ramos', 'env'], ['c04', 'Dante Flores', 'rev'], ['c05', 'Edwin Torres', 'rev'],
  ['c06', 'Félix Rojas', 'pub'], ['c07', 'Gerardo Chávez', 'bor'], ['c08', 'Hugo Vargas', 'bor'], ['c09', 'Iván Castillo', 'reab'], ['c10', 'Jorge Mendoza', ''], ['c11', 'Kevin Paredes', ''], ['c12', 'Luis Salazar', '']];
const CUAS = ['ALBAÑILES', 'CARPINTEROS', 'FIERREROS', 'ANDAMIEROS', 'ELECTRICISTAS', 'GASFITEROS'];
const APE = ['ACOSTA', 'BRAVO', 'CÁCERES', 'DÍAZ', 'ESPINOZA', 'FUENTES', 'GÓMEZ', 'HERRERA', 'ÍÑIGO', 'JIMÉNEZ', 'LEÓN', 'MEDINA', 'NÚÑEZ', 'ORTIZ', 'PALACIOS', 'QUISPE', 'RÍOS', 'SÁNCHEZ', 'TAPIA', 'URIBE'];
function obra() {
  const X = [['tcfg', 'main', { limEnv: '09:00', tolGar: 15 }], ['tfot', 'f1', { date: HOY, cap: 'x', n: 1, d: FOTO, by: 'x', ts: 1 }],
    ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales', act: true }], ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true }]];
  let n = 10000000;
  const persona = (cap, cua) => { const dni = String(n++); const ape = `${APE[n % 20]} ${APE[(n * 7) % 20]}`; X.push(['tper', dni, { dni, ape, nom: 'JUAN', pue: 'OPERARIO', cat: 'OP', cua, cap, ing: '2026-01-05', ces: '', mot: '', per: [], act: true }]); return { dni, ape, cua }; };
  CAPS.forEach(([id, name, st], i) => {
    const cap = id + '@obra.pe'; X.push(['members', cap, { role: 'tcap', name }]);
    const cua = [CUAS[i % 6], CUAS[(i + 2) % 6]]; const P = Array.from({ length: st ? 9 + (i % 4) : [5, 5, 6][i - 9] }, (_, k) => persona(cap, cua[k % 2]));
    if (st) {
      const rows = {}; P.forEach((p, k) => {
        const as = k === 0 && i % 3 === 0 ? false : k === 1 && st === 'bor' ? null : true;
        rows[p.dni] = { ape: p.ape, nom: 'JUAN', cat: 'OP', cua: p.cua, as, mot: as === false ? (i % 2 ? 'DM' : 'FA') : '', alt: k === 2, h: as ? (k === 3 && i === 1 ? { p10_05: 4 } : { p10_05: 4.5, p10_10: k % 3 ? 4 : 6 }) : {} };
      });
      const cot = st === 'rev' || st === 'pub' ? Object.fromEntries(P.map(p => [p.dni, { fir: true, by: 'tasis@obra.pe', t: 1 }])) : undefined;
      X.push(['tareo', `${HOY}_${cap}`, { date: HOY, cap, capN: name, st, modo: 'hrs', pcs: ['p10_05', 'p10_10'], foto: st === 'bor' ? [] : ['f1'], rows,
        ...(st === 'bor' ? {} : { envAt: Date.parse(`${HOY}T08:${10 + i}:00-05:00`), envN: 1 }), ...(cot ? { cot, cotFot: ['f1'], revBy: 'tasis@obra.pe', revAt: 1 } : {}),
        ...(id === 'c02' || id === 'c04' ? { prod: { t: Date.parse(`${HOY}T09:05:00-05:00`), by: 'jefe@obra.pe', byN: 'Jefe' } } : {}),
        ...(st === 'reab' ? { reab: { t: 1, by: 'tasis@obra.pe', mot: 'Falta una firma' } } : {}), hist: [], by: cap, ts: 1 }]);
    }
  });
  // sin tareo: los 16 de los capataces sin empezar, 10 que no figuran en los borradores y 14 sin capataz → 40
  for (const [id, m] of [['c07', 4], ['c08', 3], ['c09', 3]]) for (let k = 0; k < m; k++) persona(id + '@obra.pe', CUAS[k % 6]);
  for (let k = 0; k < 14; k++) persona('', CUAS[k % 6]);
  return X;
}
const shot = async (page, n) => { if (!process.env.TD_SHOTS) return; await page.waitForTimeout(400); await page.screenshot({ path: `${process.env.TD_SHOTS}/${n}.png` }); };
const clip = page => page.evaluate(() => { window.__clip = []; Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__clip.push(t); return Promise.resolve(); } }, configurable: true }); });
const lastClip = page => page.evaluate(() => window.__clip.at(-1) || '');

test('Tareos del día (rediseño): barra del día que filtra, tablero por prioridad, búsqueda, observaciones y recordar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: obra() });
  await clip(page);
  await tab(page, 'tdia');
  const fl = page.locator('#trFlt');
  await expect(page.locator('#toEnv')).toContainText('6 de 12');
  await expect(fl.locator('[data-trflt="all"]')).toContainText('12');
  await expect(fl.locator('[data-trflt="sin"]')).toContainText('3');
  await expect(fl.locator('[data-trflt="bor"]')).toContainText('3'); // borrador + reabierto
  await expect(fl.locator('[data-trflt="rev"]')).toContainText('3');
  await expect(fl.locator('[data-trflt="ok"]')).toContainText('2');
  await expect(fl.locator('[data-trflt="pub"]')).toContainText('1');
  await expect(fl.locator('[data-trflt="prod"]')).toContainText('2 de 6');
  // orden: por revisar primero; los enviados llevan «Revisar»
  const stg = await page.locator('#toBody tr.td-r').evaluateAll(L => L.map(x => x.dataset.stg));
  expect(stg.slice(0, 3)).toEqual(['rev', 'rev', 'rev']);
  expect(stg.at(-1)).toBe('pub');
  await expect(page.locator(`tr[data-to="${HOY}_c01@obra.pe"] [data-toa]`)).toHaveText('Revisar');
  await expect(page.locator(`tr[data-to="${HOY}_c04@obra.pe"] [data-toa]`)).toHaveText('Abrir');
  await expect(page.locator(`tr[data-to="${HOY}_c04@obra.pe"] .tr-prodc`)).toHaveText('Producción ✓');
  await expect(page.locator(`tr[data-to="${HOY}_c01@obra.pe"] .td-cua`)).toContainText('ALBAÑILES');
  await shot(page, '1-pc');
  // filtrar con la barra y volver a «Todos» tocando el mismo
  await fl.locator('[data-trflt="sin"]').click();
  await expect(page.locator('#toBody tr.td-r')).toHaveCount(3);
  await expect(page.locator('#toBody tr[data-tcap]')).toHaveCount(3);
  await fl.locator('[data-trflt="sin"]').click();
  await expect(page.locator('#toBody tr.td-r')).toHaveCount(12);
  // búsqueda por capataz o cuadrilla, sin perder el foco al escribir
  await page.locator('#toQ').fill('quispe');
  await expect(page.locator('#toBody tr.td-r')).toHaveCount(1);
  await page.locator('#toQ').press('End');
  await page.keyboard.type('x');
  await expect(page.locator('#toQ')).toBeFocused();
  await expect(page.locator('#toQ')).toHaveValue('quispex');
  await expect(page.locator('#toBody')).toContainText('Ningún tareo con este filtro');
  await page.locator('#toQ').fill('');
  // observaciones: el número despliega el detalle debajo de la fila, sin abrir la revisión
  await page.locator(`tr[data-to="${HOY}_c02@obra.pe"] .td-obs`).click();
  await expect(page.locator(`tr[data-tox-of="${HOY}_c02@obra.pe"]`)).toBeVisible();
  await expect(page.locator('#trWs')).toHaveCount(0);
  await shot(page, '2-obs');
  // recordar al que no envió (no abre nada: copia el mensaje)
  await page.locator(`tr[data-to="${HOY}_c07@obra.pe"] [data-toa="rec"]`).click();
  await expect.poll(() => lastClip(page)).toContain('Gerardo Chávez: falta enviar tu tareo');
  // aviso de no enviados: «Ver cuáles» filtra y «Copiar recordatorio» junta a todos
  const late = page.locator('#trLate');
  await expect(late).toContainText('6 capataces no enviaron su tareo a las 09:00');
  await late.locator('[data-toal="ver"]').click();
  await expect(page.locator('#toBody tr.td-r')).toHaveCount(6);
  await late.locator('[data-toal="rec"]').click();
  await expect.poll(() => lastClip(page)).toContain('• Luis Salazar (sin empezar)');
  await late.locator('[data-toal="ver"]').click();
  await expect(page.locator('#toBody tr.td-r')).toHaveCount(12);
  // clic en la fila abre el espacio de revisión
  await page.locator(`tr[data-to="${HOY}_c01@obra.pe"] .td-as`).click();
  await expect(page.locator('#trWs')).toContainText('Abel Quispe');
  noErrors(errors, 'tablero');
});

test('Tareos del día (rediseño): «Personal activo sin tareo» en columna lateral, por capataz, asignar capataz en lote y copiar lista', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: obra() });
  await clip(page);
  await tab(page, 'tdia');
  const sin = page.locator('#trSin');
  await expect(sin.locator('summary').first()).toContainText('Personal activo sin tareo hoy');
  await expect(sin.locator('.td-sint .td-cnt')).toHaveText('40');
  await expect(sin).toContainText('asígnalos a un capataz o regístrales una falta');
  // columna lateral: no empuja el tablero hacia abajo
  const B = await page.locator('.td-board').boundingBox(), A = await sin.boundingBox();
  expect(A.x).toBeGreaterThan(B.x + B.width - 1);
  expect(A.y).toBeLessThan(B.y);
  // grupos por capataz (40 > 15: plegados) y «Sin capataz asignado» al final
  const G = sin.locator('details.td-sg');
  await expect(G).toHaveCount(7);
  await expect(G.last()).toHaveAttribute('data-cap', '');
  await expect(G.last()).not.toHaveAttribute('open', '');
  // copiar la lista de un grupo desde su menú (el menú no abre el grupo)
  await sin.locator('[data-tom="c10@obra.pe"]').click();
  await page.locator('#pop [data-do="cp"]').click();
  await expect.poll(() => lastClip(page)).toContain('Obreros sin tareo');
  await expect(sin.locator('details[data-cap="c10@obra.pe"]')).not.toHaveAttribute('open', '');
  // asignar capataz a dos sin capataz
  await G.last().locator('summary').click();
  const ck = () => sin.locator('details.td-sg[data-cap=""] [data-tosel]');
  const d1 = await ck().nth(0).getAttribute('data-tosel'), d2 = await ck().nth(1).getAttribute('data-tosel');
  await ck().nth(0).check();
  await ck().nth(1).check();
  await expect(sin.locator('[data-tosc]')).toHaveText('Asignar capataz a 2…');
  await shot(page, '3-sin');
  await sin.locator('[data-tosc]').click();
  await page.locator('#toAcSel').selectOption('c10@obra.pe');
  await page.locator('#toAcOk').click();
  await expect.poll(() => page.evaluate(([a, b]) => [window.__dbGet('tper', a).cap, window.__dbGet('tper', b).cap], [d1, d2])).toEqual(['c10@obra.pe', 'c10@obra.pe']);
  await expect(sin.locator('details.td-sg[data-cap=""] .td-cnt')).toHaveText('12');
  await expect(sin.locator('details.td-sg[data-cap="c10@obra.pe"] .td-cnt')).toHaveText('7');
  noErrors(errors, 'sin tareo');
});

test('Tareos del día (rediseño): celular en una columna, tablero primero y «sin tareo» plegado; modo oscuro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: obra(), theme: 'dark' });
  await tab(page, 'tdia');
  const sin = page.locator('#trSin');
  await expect(sin).not.toHaveAttribute('open', '');
  const B = await page.locator('.td-board').boundingBox(), A = await sin.boundingBox();
  expect(A.y).toBeGreaterThan(B.y);
  expect(await page.evaluate(() => [...document.querySelectorAll('.td-tbl tr.td-r')].every(r => r.getBoundingClientRect().right <= innerWidth + 1))).toBe(true);
  expect((await page.locator(`tr[data-to="${HOY}_c01@obra.pe"] [data-toa]`).boundingBox()).height).toBeGreaterThanOrEqual(40);
  await shot(page, '4-cel');
  await page.locator('.td-board').evaluate(e => e.scrollIntoView());
  await shot(page, '5-cel-tablero');
  noErrors(errors, 'celular');
});
