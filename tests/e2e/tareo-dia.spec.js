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
  expect(r.vAus.map(x => [x.dni, x.k])).toEqual([['d2', 'mot']]);
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
  await expect(env.locator('[data-l="Faltas"]')).toHaveText('1');
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
  await page.locator(`tr[data-to="${HOY}_tcap@obra.pe"] button`).click();
  await expect(page.locator('#trWs')).toContainText('Teodoro Capataz');
  await expect(page.locator('#toReab')).toHaveCount(0);
  noErrors(errors, 'jefe');
});

test('Tareos del día: costos ve el aviso de la fase 3', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcos', editar: false, extra: EXTRA });
  await expect(page.locator('#main')).toContainText('cuando el jefe de producción los publique');
  noErrors(errors, 'costos');
});
