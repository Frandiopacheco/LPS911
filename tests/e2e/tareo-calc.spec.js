// Módulo Tareo: correcciones de la auditoría F2 al cálculo (docs/ia/tareo.md, «Correcciones de la auditoría F2 — cálculo»).
// Refrigerio por intersección, feriados propios del tareo, configuración congelada en el doc, periodos del obrero y jornada parcial.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const tab = (page, t) => page.evaluate(t => { U.mod = 'tar'; U.tab = t; render(); }, t);
const LUN = '2026-09-28', SAB = '2026-10-03', DOM = '2026-10-04', FER = '2026-10-08'; // FER: jueves
const PROJ = hol => ['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', cal: { sat: true, hol } }];

test('refrigerio por intersección: partir un bloque no cambia el total', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([LUN, SAB, DOM]) => {
    const R = o => ({ ape: 'A', nom: 'B', as: true, mot: '', ...o });
    const B = (pc, ini, fin) => ({ id: pc + ini, pc, ini, fin, dnis: ['d1'] });
    const calc = (date, blq) => { const x = tCalc({ date, rows: { d1: R() }, blq, foto: ['f'] }).rows.d1; return [x.trab, x.ext]; };
    const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    /* invariante: 07:30–17:00 partido en cualquier minuto da lo mismo (L–V, sábado y domingo) */
    const inv = {};
    for (const f of [LUN, SAB, DOM]) {
      const base = calc(f, [B('p1', '07:30', '17:00')]); const malos = [];
      for (let m = 451; m < 1020; m++) { const c = calc(f, [B('p1', '07:30', hm(m)), B('p2', hm(m), '17:00')]); if (c[0] !== base[0] || c[1] !== base[1]) malos.push(hm(m)); }
      inv[f] = { base, malos };
    }
    return {
      inv,
      lv: tHoras(LUN, '07:30', '17:00'), lv2: calc(LUN, [B('p1', '07:30', '12:00'), B('p2', '12:00', '17:00')]),
      dentro: tBlqH(LUN, '12:15', '12:45'), borde: tBlqH(LUN, '11:30', '12:30'),
      sa: tHoras(SAB, '07:30', '17:00'), sa2: tHoras(SAB, '07:30', '13:00'), lvx: tHoras(LUN, '07:30', '19:00'),
      dom: tHoras(DOM, '07:30', '17:00'),
      h: tCalc({ date: LUN, rows: { d1: R() }, blq: [B('p1', '07:30', '12:30'), B('p2', '12:30', '17:00')] }).rows.d1.h,
    };
  }, [LUN, SAB, DOM]);
  expect(r.inv[LUN]).toEqual({ base: [8.5, 0], malos: [] });
  expect(r.inv[SAB]).toEqual({ base: [9.5, 4], malos: [] });
  expect(r.inv[DOM]).toEqual({ base: [8.5, 8.5], malos: [] }); // domingo: refrigerio de no laborables (60 min desde 12:00), todo extra
  expect(r.lv).toEqual({ trab: 8.5, ext: 0 });
  expect(r.lv2).toEqual([8.5, 0]);
  expect(r.dentro).toBe(0);
  expect(r.borde).toBe(0.5);
  expect(r.sa).toEqual({ trab: 9.5, ext: 4 });
  expect(r.sa2).toEqual({ trab: 5.5, ext: 0 });
  expect(r.lvx).toEqual({ trab: 10.5, ext: 2 });
  expect(r.dom).toEqual({ trab: 8.5, ext: 8.5 });
  expect(r.h).toEqual({ p1: 4.5, p2: 4 });
  noErrors(errors, 'refrigerio');
});

test('feriados propios, configuración congelada, periodos y jornada parcial', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: [PROJ([{ d: '2026-10-08', n: 'Combate de Angamos' }])] });
  const r = await page.evaluate(([LUN, FER]) => {
    const out = {};
    // feriado del calendario de Last Planner: el tareo NO lo toma (solo tcfg.fer)
    out.lpsNo = [tNoLab(FER), tHoras(FER, '07:30', '17:00')];
    const c0 = S.tcfg.get('main');
    S.tcfg.set('main', { ...(c0 || {}), fer: [FER] });
    out.ferSi = [tNoLab(FER), tHoras(FER, '07:30', '17:00'), tCfgDia(FER)];
    // configuración congelada: el doc con cfg no cambia al cambiar la jornada
    const doc = { date: LUN, rows: { d1: { ape: 'A', as: true } }, blq: [{ id: 'b', pc: 'p1', ini: '07:30', fin: '17:00', dnis: ['d1'] }], foto: ['f'] };
    const cfg = tCfgDia(LUN); out.cfg = cfg;
    S.tcfg.set('main', { jor: { ...TCFG_DEF.jor, '1': { ini: '07:30', fin: '17:00', ref: 30, refIni: '12:00' } } });
    out.conCfg = tCalc({ ...doc, cfg }).rows.d1.trab; out.sinCfg = tCalc(doc).rows.d1.trab; out.jorDia = TC().jor['1'];
    if (c0) S.tcfg.set('main', c0); else S.tcfg.delete('main');
    // periodos: cesó el 15/03 y reingresó el 04/05; el día de cese cuenta
    const p = { dni: '1', ing: '2026-05-04', ces: '', per: [{ ing: '2026-02-10', ces: '2026-03-15' }, { ing: '2026-05-04', ces: '' }] };
    out.act = ['2026-02-09', '2026-02-10', '2026-03-15', '2026-03-16', '2026-05-03', '2026-05-04', '2026-10-01'].map(f => tActivo(p, f));
    out.actSinPer = [tActivo({ ing: '2026-01-05', ces: '2026-03-15' }, '2026-03-15'), tActivo({ ing: '2026-01-05', ces: '2026-03-15', per: [] }, '2026-03-16'), tActivo({ ...p, arch: { t: 1 } }, '2026-10-01')];
    // jornada parcial: observación que no bloquea (warn)
    const parc = { date: LUN, rows: { d1: { ape: 'PARCIAL', as: true }, d2: { ape: 'COMPLETO', as: true } }, foto: ['f'],
      blq: [{ id: 'a', pc: 'p1', ini: '07:30', fin: '11:30', dnis: ['d1', 'd2'] }, { id: 'b', pc: 'p1', ini: '12:00', fin: '17:30', dnis: ['d2'] }] };
    out.parc = tValida(parc);
    out.parcSab = tValida({ ...parc, date: '2026-10-03' }).filter(o => o.k === 'parcial').map(o => o.msg);
    out.parcFer = tValida({ ...parc, date: FER, cfg: { v: 1, jor: TC().jor['4'], fer: true } }).filter(o => o.k === 'parcial');
    return out;
  }, [LUN, FER]);
  expect(r.lpsNo).toEqual([false, { trab: 8.5, ext: 0 }]);
  expect(r.ferSi[0]).toBe(true);
  expect(r.ferSi[1]).toEqual({ trab: 8.5, ext: 8.5 });
  expect(r.ferSi[2]).toMatchObject({ v: 1, fer: true, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, rnl: { ref: 60, refIni: '12:00' } });
  expect(r.cfg).toMatchObject({ v: 1, fer: false, jor: { ref: 60 } });
  expect(r.jorDia).toMatchObject({ ref: 30 });
  expect(r.conCfg).toBe(8.5);
  expect(r.sinCfg).toBe(9);
  expect(r.act).toEqual([false, true, true, false, false, true, true]);
  expect(r.actSinPer).toEqual([true, false, false]);
  expect(r.parc).toEqual([{ dni: 'd1', k: 'parcial', warn: true, msg: 'Jornada parcial: PARCIAL 4 h de 8,5' }]);
  expect(r.parcSab).toEqual(['Jornada parcial: PARCIAL 4 h de 5,5']);
  expect(r.parcFer).toEqual([]);
  noErrors(errors, 'feriados y periodos');
});

test('Configuración: refrigerio por día, feriados propios y copiar los de Last Planner', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false, extra: [PROJ([{ d: '2026-10-08', n: 'Combate de Angamos' }, { d: '2026-11-01', n: 'Todos los Santos' }])] });
  await tab(page, 'tcfg');
  await expect(page.locator('#tjTot')).toHaveText('48.0');
  await expect(page.locator('#tferL')).toContainText('No hay feriados');
  // lunes: refrigerio desde las 12:30, 45 min; domingo/feriado sin refrigerio
  await page.fill('[data-tjd="1"] [data-tj="ri"]', '12:30');
  await page.fill('[data-tjd="1"] [data-tj="ref"]', '45');
  await expect(page.locator('[data-tjh="1"]')).toHaveText('8.8');
  await page.fill('#tjNlRef', '0');
  await page.click('#tjSave');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tcfg', 'main'))).toMatchObject({ jor: { '1': { ini: '07:30', fin: '17:00', ref: 45, refIni: '12:30' }, '2': { ref: 60, refIni: '12:00' } }, refNoLab: { ref: 0 } });
  await expect.poll(() => page.evaluate(() => [tBlqH('2026-09-28', '12:00', '13:00'), tHoras('2026-10-04', '07:30', '17:00').trab])).toEqual([0.5, 9.5]);
  // feriado a mano
  await page.fill('#tferD', '2026-12-25');
  await page.fill('#tferNm', 'Navidad');
  await page.click('#tferAdd');
  await expect(page.locator('[data-tfer="2026-12-25"]')).toContainText('Navidad');
  // copiar de Last Planner
  await expect(page.locator('#tferLps')).toContainText('(2)');
  await page.click('#tferLps');
  await expect(page.locator('[data-tfer="2026-10-08"]')).toContainText('Combate de Angamos');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tcfg', 'main').fer)).toEqual(['2026-10-08', '2026-11-01', '2026-12-25']);
  expect(await page.evaluate(() => tNoLab('2026-11-01'))).toBe(true);
  // quitar (pide confirmación)
  page.once('dialog', d => d.accept());
  await page.click('[data-tferx="2026-11-01"]');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tcfg', 'main').fer)).toEqual(['2026-10-08', '2026-12-25']);
  await expect(page.locator('[data-tfer="2026-11-01"]')).toHaveCount(0);
  noErrors(errors, 'configuración del tareo');
});

test('Configuración en celular (sin desborde) con feriados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'admin', editar: false, extra: [['tcfg', 'main', { fer: ['2026-10-08'], ferN: { '2026-10-08': 'Combate de Angamos' } }]] });
  await tab(page, 'tcfg');
  await expect(page.locator('[data-tfer="2026-10-08"]')).toContainText('Combate de Angamos');
  await expect(page.locator('#tferLps')).toHaveCount(0); // sin feriados en el calendario de Last Planner
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const alto = await page.locator('[data-tferx="2026-10-08"]').evaluate(b => b.getBoundingClientRect().height);
  expect(alto).toBeGreaterThanOrEqual(40);
  noErrors(errors, 'configuración (celular)');
});

// ── «Horas por cantidad» (modo:'hrs'; docs/ia/tareo.md «Contrato "horas por cantidad"») ──
test('horas por cantidad: extra, feriado, ausente, salida, errores y avisos; los tareos con bloques siguen igual', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(([LUN, SAB, DOM, FER]) => {
    const R = (h, o = {}) => ({ ape: 'APE', nom: 'NOM', as: true, mot: '', h, ...o });
    const H = (date, rows, x = {}) => ({ date, modo: 'hrs', pcs: ['p1', 'p2'], rows, foto: ['f'], ...x });
    const c = (date, h, x) => tCalc(H(date, { d: R(h) }, x)).rows.d;
    const pick = o => ({ trab: o.trab, ext: o.ext, ini: o.ini, fin: o.fin });
    const cfgFer = { v: 1, jor: TC().jor['4'], fer: true, rnl: { ref: 60, refIni: '12:00' } };
    S.tpc.set('pbq', { id: 'pbq', cod: '30.01', nom: 'x', bloq: true });
    const out = {
      lv: pick(c(LUN, { p1: 4.5, p2: 4 })),
      lv105: pick(c(LUN, { p1: 8.5, p2: 2 })),
      sab8: pick(c(SAB, { p1: 8 })),
      fer: pick(c(FER, { p1: 8.5 }, { cfg: cfgFer })),
      dom: pick(c(DOM, { p1: 6 })),
      sal: c(LUN, { p1: 6 }).fin, sal2: tCalc(H(LUN, { d: R({ p1: 6 }, { sal: '16:00' }) })).rows.d.fin,
      aus: tCalc(H(LUN, { d: R({ p1: 8, p2: 0 }, { as: false, mot: 'DM' }) })).rows.d,
      limpia: c(LUN, { p1: '4', p2: 0, p3: '' }).h,
      tot: [tHrsTot({ h: { a: 4.5, b: '4', c: 0, d: -1, e: 'x' } }), tHrsTot({}), tHrsTot(null)],
      jor: [tJorDia({ date: LUN }), tJorDia({ date: SAB }), tJorDia({ date: DOM }), tJorDia({ date: LUN, cfg: cfgFer }), tEsHrs({ modo: 'hrs' }), tEsHrs({ blq: [] })],
      vOk: tValida(H(LUN, { d: R({ p1: 4.5, p2: 4 }) })),
      v0: tValida(H(LUN, { d: R({}) })).map(o => [o.dni, o.k]),
      v16: tValida(H(LUN, { d: R({ p1: 10, p2: 6.5 }) })).map(o => [o.dni, o.k]),
      vParc: tValida(H(LUN, { d: R({ p1: 4 }) })),
      vParcFer: tValida(H(FER, { d: R({ p1: 4 }) }, { cfg: cfgFer })),
      vAus: tValida(H(LUN, { d: R({ p1: 8 }, { as: false }) })),
      vSinM: tValida(H(LUN, { d: R({ p1: 8 }, { as: null }) })).map(o => o.k),
      vPcs: tValida(H(LUN, { d: R({ p1: 8.5 }) }, { pcs: [] })).map(o => o.k),
      vBloq: tValida(H(LUN, { d: R({ pbq: 8.5 }) }, { pcs: ['pbq'] })).map(o => [o.k, o.msg]),
      vBloq0: tValida(H(LUN, { d: R({ p1: 8.5, pbq: 0 }) }, { pcs: ['p1', 'pbq'] })).map(o => o.k),
      vMal: tValida(H(LUN, { d: R({ p1: 8.5, p2: -2 }) })).map(o => o.k),
      vFoto: tValida(H(LUN, { d: R({ p1: 8.5 }) }, { foto: [] })).map(o => o.k),
      // compatibilidad: sin modo se calcula con los bloques, como antes
      blq: pick(tCalc({ date: LUN, rows: { d: R({ p9: 3 }) }, blq: [{ id: 'b', pc: 'p1', ini: '07:30', fin: '17:00', dnis: ['d'] }] }).rows.d),
      blqH: tCalc({ date: LUN, rows: { d: R({ p9: 3 }) }, blq: [{ id: 'b', pc: 'p1', ini: '07:30', fin: '17:00', dnis: ['d'] }] }).rows.d.h,
    };
    S.tpc.delete('pbq');
    return out;
  }, [LUN, SAB, DOM, FER]);
  expect(r.lv).toEqual({ trab: 8.5, ext: 0, ini: '07:30', fin: '17:00' }); // L–V 8,5 h: sin extra; la salida estimada salta el refrigerio
  expect(r.lv105).toEqual({ trab: 10.5, ext: 2, ini: '07:30', fin: '19:00' });
  expect(r.sab8).toEqual({ trab: 8, ext: 2.5, ini: '07:30', fin: '15:30' }); // sábado: jornada 5,5 h, sin refrigerio
  expect(r.fer).toMatchObject({ trab: 8.5, ext: 8.5 }); // feriado: todo extra
  expect(r.dom).toMatchObject({ trab: 6, ext: 6, ini: '07:30' }); // domingo: todo extra; inicio de referencia (lunes)
  expect([r.sal, r.sal2]).toEqual(['14:30', '16:00']); // estimada (7:30 + 6 h + refrigerio) o la que puso el capataz
  expect(r.aus).toMatchObject({ trab: 0, ext: 0, ini: '', fin: '', h: { p1: 8 } }); // no vino: 0 h pero conserva h
  expect(r.limpia).toEqual({ p1: 4 });
  expect(r.tot).toEqual([8.5, 0, 0]);
  expect(r.jor).toEqual([8.5, 5.5, 0, 0, true, false]);
  expect(r.vOk).toEqual([]);
  expect(r.v0).toEqual([['d', 'sinh']]); // vino con 0 h: error
  expect(r.v16).toEqual([['d', 'hmax']]); // más de 16 h: error de digitación
  expect(r.vParc).toEqual([{ dni: 'd', k: 'parcial', warn: true, msg: 'Jornada parcial: APE 4 h de 8,5' }]); // aviso, no bloquea
  expect(r.vParcFer).toEqual([]);
  expect(r.vAus).toEqual([]);
  expect(r.vSinM).toEqual(['marca']);
  expect(r.vPcs).toEqual(['pcs']);
  expect(r.vBloq).toEqual([['bloq', 'La partida 30.01 está bloqueada por costos.']]);
  expect(r.vBloq0).toEqual([]); // bloqueada sin horas: no es error del cálculo (el celular pide quitarla)
  expect(r.vMal).toEqual(['hval']);
  expect(r.vFoto).toEqual(['foto']);
  expect(r.blq).toEqual({ trab: 8.5, ext: 0, ini: '07:30', fin: '17:00' });
  expect(r.blqH).toEqual({ p1: 8.5 });
  noErrors(errors, 'horas por cantidad');
});
