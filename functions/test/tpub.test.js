'use strict';
// Publicación del tareo (F3): lógica pura de la función publicarTareo (functions/tpub.js, exportada por lib.js).
const test = require('node:test');
const assert = require('node:assert');
const { tpCalcRow, tpValidarDia, tpArmarPublicacion, tpDif, tpPuede, tpPedido, tpFirma, tpEjecutar, tpCfgDia, tpActivo } = require('../lib');

const F = '2026-10-01'; // jueves
const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const PCS = [
  { id: 'p10_05', cod: '10.05', nom: 'Encofrado', und: 'm2', grp: '10', grpN: 'ESTRUCTURAS', ua: 'CD1' },
  { id: 'p10_10', cod: '10.10', nom: 'Concreto', und: 'm3', grp: '10', grpN: 'ESTRUCTURAS', ua: 'CD2' },
  { id: 'p2_01', cod: '2.01', nom: 'Excavación', und: 'm3', grp: '2', grpN: 'M. TIERRAS', ua: 'CD3' },
  { id: 'p9_99', cod: '9.99', nom: 'Inactiva', act: false },
];
const ficha = (dni, ape, o) => ({ id: dni, dni, ape, nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', ing: '2026-01-01', ces: '', ...o });
const PER = [ficha('11111111', 'ALFA'), ficha('22222222', 'BETA'), ficha('33333333', 'GAMA')];
const row = (ape, o) => ({ ape, nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', as: true, h: { p10_05: 8.5 }, ...o });
/* tareo revisado, por horas, con cotejo vigente y todos firmaron */
function tareo(id, rows, o) {
  const cot = {}; Object.keys(rows).forEach(d => { cot[d] = { fir: true, by: 'a', t: 1 }; });
  return { id, date: F, cap: id.slice(11), capN: 'Cap ' + id.slice(11), st: 'rev', modo: 'hrs', pcs: ['p10_05'], cfg: CFG, foto: ['f1'], cotFot: ['f1'], cot, rows, envN: 1, revBy: 'tasis@obra.pe', revAt: 5, ...o };
}
const base = () => [tareo(F + '_c1', { 11111111: row('ALFA'), 22222222: row('BETA') }), tareo(F + '_c2', { 33333333: row('GAMA') })];
const V = (tareos, o) => tpValidarDia({ fecha: F, tareos, personal: PER, partidas: PCS, excepciones: {}, ...o });
const ks = r => r.bloqueos.map(b => b.k).sort();

test('día correcto: sin bloqueos y resumen', () => {
  const r = V(base());
  assert.deepStrictEqual(r.bloqueos, []);
  assert.strictEqual(r.resumen.obreros, 3);
  assert.strictEqual(r.resumen.pres, 3);
  assert.strictEqual(r.resumen.hh, 25.5);
  assert.strictEqual(r.resumen.he, 0);
  assert.deepStrictEqual(r.resumen.porEstado, { rev: 2 });
  assert.strictEqual(r.resumen.tareos.length, 2);
});

test('estados: borrador, enviado y reabierto bloquean; pub solo en rectificación; vacíos y archivados no cuentan', () => {
  for (const st of ['bor', 'env', 'reab', 'pub']) {
    const T = base(); T[1].st = st;
    const r = V(T);
    assert.deepStrictEqual(ks(r), ['estado'], st);
    assert.strictEqual(r.bloqueos[0].tareo, F + '_c2');
  }
  const T = base(); T[1].st = 'pub';
  assert.deepStrictEqual(V(T, { rect: true }).bloqueos, []);
  const T2 = base(); T2.push({ id: F + '_c3', date: F, st: 'bor', rows: {} }, { ...tareo(F + '_c4', { 44444444: row('X') }), st: 'bor', arch: { t: 1 } });
  assert.deepStrictEqual(V(T2).bloqueos, []);
});

test('DNI duplicado: presente, ausente o sin marcar en dos tareos bloquea', () => {
  for (const r2 of [row('ALFA'), row('ALFA', { as: false, mot: 'DM' }), row('ALFA', { as: null })]) {
    const T = base(); T[1].rows['11111111'] = r2; T[1].cot['11111111'] = { fir: true };
    const r = V(T);
    const d = r.bloqueos.filter(b => b.k === 'dup');
    assert.strictEqual(d.length, 1);
    assert.strictEqual(d[0].dni, '11111111');
    assert.deepStrictEqual(d[0].tareos, [F + '_c1', F + '_c2']);
    assert.match(d[0].msg, /2 tareos/);
  }
});

test('sin marcar, presente sin horas y más de 16 h', () => {
  const T = base(); T[0].rows['11111111'].as = null;
  assert.deepStrictEqual(ks(V(T)), ['marca']);
  const T2 = base(); T2[0].rows['11111111'].h = {};
  assert.deepStrictEqual(ks(V(T2)), ['sinh']);
  const T3 = base(); T3[0].rows['11111111'].h = { p10_05: 10, p10_10: 6.5 };
  const r3 = V(T3); assert.deepStrictEqual(ks(r3), ['hmax']); assert.strictEqual(r3.bloqueos[0].dni, '11111111');
  const T4 = base(); T4[0].rows['11111111'].h = { p10_05: 10, p10_10: 6 };
  assert.deepStrictEqual(V(T4).bloqueos, []);
  const T5 = base(); T5[0].rows['11111111'].h = { p10_05: 'x', p10_10: 4 };
  assert.deepStrictEqual(ks(V(T5)), ['hval']);
  /* el que no vino no necesita horas */
  const T6 = base(); T6[0].rows['11111111'] = row('ALFA', { as: false, mot: '', h: {} });
  assert.deepStrictEqual(V(T6).bloqueos, []);
});

test('sin cfg (jornada congelada) bloquea', () => {
  const T = base(); delete T[0].cfg;
  const r = V(T); assert.deepStrictEqual(ks(r), ['cfg']); assert.strictEqual(r.bloqueos[0].tareo, F + '_c1');
});

test('cotejo no vigente, sin foto y firma sin cotejar', () => {
  const T = base(); T[0].foto = ['f2'];
  assert.deepStrictEqual(ks(V(T)), ['cot']);
  const T2 = base(); T2[0].foto = []; T2[0].cotFot = [];
  const r2 = V(T2); assert.deepStrictEqual(ks(r2), ['cot']); assert.match(r2.bloqueos[0].msg, /foto/);
  const T3 = base(); delete T3[0].cot;
  assert.deepStrictEqual(ks(V(T3)), ['cot']);
  const T4 = base(); delete T4[0].cot['22222222'];
  const r4 = V(T4); assert.deepStrictEqual(ks(r4), ['firp']); assert.strictEqual(r4.bloqueos[0].dni, '22222222');
  /* no firmó (fir:false) está cotejado: no bloquea; el ausente no necesita firma */
  const T5 = base(); T5[0].cot['22222222'].fir = false; T5[0].rows['11111111'] = row('ALFA', { as: false }); delete T5[0].cot['11111111'];
  assert.deepStrictEqual(V(T5).bloqueos, []);
  /* fotos en otro orden: vigente */
  const T6 = base(); T6[0].foto = ['a', 'b']; T6[0].cotFot = ['b', 'a'];
  assert.deepStrictEqual(V(T6).bloqueos, []);
});

test('partida con horas que no existe en tpc', () => {
  const T = base(); T[0].rows['11111111'].h = { p10_05: 4.5, p77_01: 4 };
  const r = V(T); assert.deepStrictEqual(ks(r), ['pc']); assert.strictEqual(r.bloqueos[0].pc, 'p77_01');
  /* sin horas (0) no cuenta */
  const T2 = base(); T2[0].rows['11111111'].h = { p10_05: 8.5, p77_01: 0 };
  assert.deepStrictEqual(V(T2).bloqueos, []);
});

test('cobertura: activo sin tareo bloquea salvo excepción con motivo; cesados y archivados no', () => {
  const per = [...PER, ficha('44444444', 'DELTA'), ficha('55555555', 'EPSILON', { ces: '2026-09-30' }), ficha('66666666', 'ZETA', { arch: { t: 1 } }),
    ficha('77777777', 'ETA', { ing: '2020-01-01', ces: '2026-10-01' }),
    ficha('88888888', 'TETA', { per: [{ ing: '2025-01-01', ces: '2025-06-30' }, { ing: '2026-10-05', ces: '' }] })];
  const r = V(base(), { personal: per });
  assert.deepStrictEqual(r.bloqueos.map(b => [b.k, b.dni]), [['cob', '44444444'], ['cob', '77777777']]);
  assert.strictEqual(r.resumen.sinTareo, 2);
  const r2 = V(base(), { personal: per, excepciones: { 44444444: 'Vacaciones', 77777777: '   ' } });
  assert.deepStrictEqual(r2.bloqueos.map(b => [b.k, b.dni]), [['cob', '77777777']]);
  assert.deepStrictEqual(r2.exc, { 44444444: { motivo: 'Vacaciones', ape: 'DELTA', nom: 'JUAN' } });
  assert.strictEqual(r2.sinTareo.find(x => x.dni === '44444444').exc, 'Vacaciones');
  assert.ok(tpActivo(per[6], F)); assert.ok(!tpActivo(per[4], F)); assert.ok(!tpActivo(per[7], F));
});

test('horas extra por el total del día del obrero; feriado: todo extra; sábado sin refrigerio', () => {
  assert.deepStrictEqual(tpCalcRow({ as: true, h: { p10_05: 6, p10_10: 4 } }, CFG, 'hrs'), { h: { p10_05: 6, p10_10: 4 }, trab: 10, ext: 1.5 });
  assert.deepStrictEqual(tpCalcRow({ as: true, h: { p10_05: 4, p10_10: 4 } }, CFG, 'hrs'), { h: { p10_05: 4, p10_10: 4 }, trab: 8, ext: 0 });
  assert.deepStrictEqual(tpCalcRow({ as: true, h: { p10_05: 8.5 } }, { ...CFG, fer: true }, 'hrs'), { h: { p10_05: 8.5 }, trab: 8.5, ext: 8.5 });
  assert.deepStrictEqual(tpCalcRow({ as: true, h: { p10_05: 6 } }, { v: 1, jor: null, fer: false }, 'hrs').ext, 6);
  assert.strictEqual(tpCalcRow({ as: true, h: { p10_05: 7 } }, { v: 1, jor: { ini: '07:30', fin: '13:00', ref: 0 }, fer: false }, 'hrs').ext, 1.5);
  assert.deepStrictEqual(tpCalcRow({ as: false, h: { p10_05: 8 } }, CFG, 'hrs'), { h: {}, trab: 0, ext: 0 });
  assert.deepStrictEqual(tpCalcRow({ as: null, h: { p10_05: 8 } }, CFG, 'hrs'), { h: {}, trab: 0, ext: 0 });
  /* celdas vacías, 0 y negativas no cuentan */
  assert.deepStrictEqual(tpCalcRow({ as: true, h: { a: 0, b: '', c: -2, d: 3.333 } }, CFG, 'hrs'), { h: { d: 3.33 }, trab: 3.33, ext: 0 });
  /* en la publicación */
  const T = base(); T[0].rows['11111111'].h = { p10_05: 6, p10_10: 4 }; T[1].cfg = { ...CFG, fer: true };
  const s = tpArmarPublicacion({ fecha: F, tareos: T, personal: PER, partidas: PCS, excepciones: {}, v: 1, at: 9, by: 'j@o.pe', byN: 'Jefe', motivo: '', anterior: null });
  const by = Object.fromEntries(s.rows.map(r => [r.dni, r]));
  assert.strictEqual(by['11111111'].ext, 1.5);
  assert.strictEqual(by['33333333'].ext, 8.5);
  assert.strictEqual(s.tot.he, 10);
});

test('tareo antiguo con bloques (sin modo): usa rows[*].h/trab/ext guardados', () => {
  const r = { as: true, h: { p10_05: 4, p10_10: 5 }, trab: 9, ext: 0.5, ini: '07:30', fin: '17:30' };
  assert.deepStrictEqual(tpCalcRow(r, CFG, ''), { h: { p10_05: 4, p10_10: 5 }, trab: 9, ext: 0.5 });
  /* aunque la jornada diga otra cosa, manda lo guardado */
  assert.deepStrictEqual(tpCalcRow(r, { ...CFG, fer: true }, undefined), { h: { p10_05: 4, p10_10: 5 }, trab: 9, ext: 0.5 });
  const T = base(); delete T[1].modo; T[1].blq = [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '17:30', dnis: ['33333333'] }];
  T[1].rows['33333333'] = { ...row('GAMA'), h: { p10_05: 9 }, trab: 9, ext: 0.5 };
  assert.deepStrictEqual(V(T).bloqueos, []);
  const s = tpArmarPublicacion({ fecha: F, tareos: T, personal: PER, partidas: PCS, v: 1, at: 1, by: 'x' });
  const g = s.rows.find(x => x.dni === '33333333');
  assert.deepStrictEqual([g.h, g.trab, g.ext], [{ p10_05: 9 }, 9, 0.5]);
});

test('snapshot de la publicación: forma, catálogo congelado, excepciones y fuentes', () => {
  const T = base(); T[0].rows['22222222'] = row('BETA', { as: false, mot: 'DM', alt: true }); T[0].rows['11111111'].alt = true;
  const per = [...PER, ficha('44444444', 'DELTA')];
  const s = tpArmarPublicacion({ fecha: F, tareos: T, personal: per, partidas: PCS, excepciones: { 44444444: 'Vacaciones', 11111111: 'no aplica' }, v: 2, at: 99, by: 'j@o.pe', byN: 'Jefe', motivo: 'Corrige', anterior: null });
  assert.deepStrictEqual(Object.keys(s).sort(), ['ant', 'at', 'by', 'byN', 'dif', 'exc', 'fecha', 'fuentes', 'motivo', 'pcs', 'rows', 'tot', 'v'].sort());
  assert.strictEqual(s.ant, 1);
  assert.deepStrictEqual(Object.keys(s.pcs), ['p2_01', 'p10_05', 'p10_10']); // orden numérico; sin la inactiva sin horas
  assert.deepStrictEqual(s.pcs.p10_05, { cod: '10.05', nom: 'Encofrado', und: 'm2', grp: '10', grpN: 'ESTRUCTURAS', ua: 'CD1' });
  assert.deepStrictEqual(s.rows.map(r => r.dni), ['11111111', '22222222', '33333333']);
  const b = s.rows[1];
  assert.deepStrictEqual(b, { dni: '22222222', ape: 'BETA', nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', cap: 'c1', capN: 'Cap c1', as: false, mot: 'DM', alt: false, h: {}, trab: 0, ext: 0 });
  assert.deepStrictEqual(s.exc, { 44444444: { motivo: 'Vacaciones', ape: 'DELTA', nom: 'JUAN' } });
  assert.deepStrictEqual(s.tot, { obreros: 3, pres: 2, aus: 1, porMot: { DM: 1 }, hh: 17, he: 0, alt: 1, exc: 1, porPc: { p10_05: 17 } });
  assert.deepStrictEqual(s.fuentes[0], { id: F + '_c1', cap: 'c1', capN: 'Cap c1', envN: 1, revBy: 'tasis@obra.pe', revAt: 5 });
  /* una partida inactiva con horas sí entra al catálogo */
  const T2 = base(); T2[0].rows['11111111'].h = { p9_99: 8.5 };
  assert.ok(tpArmarPublicacion({ fecha: F, tareos: T2, personal: PER, partidas: PCS, v: 1 }).pcs.p9_99);
});

test('dif entre versiones', () => {
  const a = tpArmarPublicacion({ fecha: F, tareos: base(), personal: PER, partidas: PCS, excepciones: { 99999999: 'x' }, v: 1, at: 1, by: 'x' });
  assert.strictEqual(tpDif(null, a), null);
  const T = base();
  T[0].rows['11111111'].h = { p10_05: 4, p10_10: 6 };            // cambia horas y extra
  T[0].rows['22222222'] = row('BETA', { as: false, mot: 'FA' });   // pasa a falta
  delete T[1].rows['33333333']; T[1].rows['44444444'] = row('DELTA'); // quita uno y agrega otro
  const per = [...PER, ficha('44444444', 'DELTA'), ficha('55555555', 'EPS')];
  const b = tpArmarPublicacion({ fecha: F, tareos: T, personal: per, partidas: PCS, excepciones: { 55555555: 'Vacaciones' }, v: 2, at: 2, by: 'x', anterior: a });
  const d = b.dif;
  assert.deepStrictEqual(d.agregados, [{ dni: '44444444', nom: 'DELTA, JUAN', capN: 'Cap c2' }]);
  assert.deepStrictEqual(d.quitados, [{ dni: '33333333', nom: 'GAMA, JUAN', capN: 'Cap c2' }]);
  const c = d.cambios.map(x => [x.dni, x.campo, x.pc || '', x.antes, x.despues]);
  assert.deepStrictEqual(c, [
    ['11111111', 'h', 'p10_05', 8.5, 4], ['11111111', 'h', 'p10_10', 0, 6], ['11111111', 'ext', '', 0, 1.5],
    ['22222222', 'as', '', true, false], ['22222222', 'mot', '', '', 'FA'], ['22222222', 'h', 'p10_05', 8.5, 0],
  ]);
  assert.deepStrictEqual(d.excAgregadas, ['55555555']);
  assert.deepStrictEqual(d.tot.hh, { antes: 25.5, despues: 18.5 });
  assert.deepStrictEqual(d.tot.pres, { antes: 3, despues: 2 });
  assert.strictEqual(d.n, 9);
  assert.strictEqual(d.mas, 0);
  /* sin cambios */
  const c2 = tpArmarPublicacion({ fecha: F, tareos: base(), personal: PER, partidas: PCS, v: 2, at: 3, by: 'y', anterior: { ...a, exc: {} } });
  assert.strictEqual(c2.dif.n, 0);
});

test('quién publica', () => {
  assert.ok(tpPuede('frandiopacheco@gmail.com', true, null));
  assert.ok(tpPuede('a@o.pe', true, { role: 'admin' }));
  assert.ok(tpPuede('j@o.pe', true, { role: 'editor', tpub: true }));
  assert.ok(!tpPuede('j@o.pe', true, { role: 'editor', tpub: true, off: true }));
  assert.ok(!tpPuede('j@o.pe', false, { role: 'editor', tpub: true }));
  assert.ok(!tpPuede('e@o.pe', true, { role: 'editor' }));
  for (const role of ['tasis', 'tcos', 'tcap', 'campo', 'lector']) assert.ok(!tpPuede('x@o.pe', true, { role, tpub: true }), role);
  assert.ok(!tpPuede('', true, { role: 'admin' }));
});

test('pedido: acción, fecha, excepciones y motivo', () => {
  assert.match(tpPedido({ accion: 'x', fecha: F }).error, /Acción/);
  assert.match(tpPedido({ accion: 'previa', fecha: '2026-02-30' }).error, /fecha/);
  assert.match(tpPedido({ accion: 'previa', fecha: '2026-10-02' }, F).error, /todavía no llega/);
  assert.match(tpPedido({ accion: 'rectificar', fecha: F }).error, /motivo/);
  assert.match(tpPedido({ accion: 'publicar', fecha: F, excepciones: ['a'] }).error, /excepciones/);
  assert.match(tpPedido({ accion: 'publicar', fecha: F, excepciones: { 1: 5 } }).error, /texto/);
  const P = tpPedido({ accion: 'publicar', fecha: F, excepciones: { 44444444: ' Vacaciones ', 55555555: '' }, motivo: '  m ', firma: 'abc' }, F);
  assert.deepStrictEqual(P, { accion: 'publicar', fecha: F, excepciones: { 44444444: 'Vacaciones' }, motivo: 'm', firma: 'abc' });
});

test('firma: cambia si cambia o aparece un tareo', () => {
  const a = tpFirma(base());
  assert.strictEqual(a, tpFirma(base().reverse()));
  const T = base(); T[0].rows['11111111'].h.p10_05 = 8;
  assert.notStrictEqual(a, tpFirma(T));
  assert.notStrictEqual(a, tpFirma([...base(), { id: F + '_c9', date: F, st: 'bor', rows: {} }]));
  assert.match(a, /^[0-9a-f]{16}$/);
});

test('configuración actual del día (para la previa de un tareo sin cfg)', () => {
  assert.deepStrictEqual(tpCfgDia({}, F).jor, { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' });
  assert.strictEqual(tpCfgDia({}, '2026-10-04').jor, null); // domingo
  assert.strictEqual(tpCfgDia({ fer: [F] }, F).fer, true);
  assert.deepStrictEqual(tpCfgDia({}, '2026-10-03').jor, { ini: '07:30', fin: '13:00', ref: 0, refIni: '12:00' });
});

/* ---------- tpEjecutar: la función completa (sin Firebase) ---------- */
const ctx = (P, o) => ({ P: tpPedido(P, F), tareos: base(), personal: PER, partidas: PCS, tcfg: {}, idx: null, vigente: null, by: 'j@o.pe', byN: 'Jefe', now: 1000, ...o });

test('previa: no escribe; devuelve bloqueos, resumen y firma', () => {
  const R = tpEjecutar(ctx({ accion: 'previa', fecha: F }));
  assert.deepStrictEqual(R.escr, []);
  assert.strictEqual(R.res.ok, true);
  assert.strictEqual(R.res.v, 1);
  assert.strictEqual(R.res.rect, false);
  assert.strictEqual(R.res.firma, tpFirma(base()));
  const T = base(); T[0].st = 'env';
  const R2 = tpEjecutar(ctx({ accion: 'previa', fecha: F }, { tareos: T }));
  assert.strictEqual(R2.res.ok, false);
  assert.deepStrictEqual(R2.res.bloqueos.map(b => b.k), ['estado']);
});

test('publicar: escribe tpub, tpubidx y marca los tareos; con bloqueos no escribe', () => {
  const R = tpEjecutar(ctx({ accion: 'publicar', fecha: F }));
  assert.strictEqual(R.res.ok, true);
  assert.strictEqual(R.res.id, F + '_v1');
  const [p, ix, ...ts] = R.escr;
  assert.deepStrictEqual([p.col, p.id, p.tipo], ['tpub', F + '_v1', 'crear']);
  assert.strictEqual(p.datos.v, 1); assert.strictEqual(p.datos.ant, null); assert.strictEqual(p.datos.dif, null);
  assert.deepStrictEqual(ix, { col: 'tpubidx', id: F, tipo: 'poner', datos: { fecha: F, v: 1, vers: [{ v: 1, at: 1000, by: 'j@o.pe', byN: 'Jefe', motivo: '' }], abierto: null } });
  assert.deepStrictEqual(ts.map(w => [w.col, w.id, w.datos.st, w.datos.pubV, w.hist.a, w.hist.v]), [['tareo', F + '_c1', 'pub', 1, 'pub', 1], ['tareo', F + '_c2', 'pub', 1, 'pub', 1]]);
  const T = base(); T[0].rows['11111111'].as = null;
  const R2 = tpEjecutar(ctx({ accion: 'publicar', fecha: F }, { tareos: T }));
  assert.strictEqual(R2.res.ok, false); assert.deepStrictEqual(R2.escr, []);
  assert.deepStrictEqual(R2.res.bloqueos.map(b => b.k), ['marca']);
});

test('publicar: firma distinta = cambió desde la previa', () => {
  const R = tpEjecutar(ctx({ accion: 'publicar', fecha: F, firma: '0000000000000000' }));
  assert.strictEqual(R.err.code, 'aborted'); assert.match(R.err.msg, /cambió/);
  const ok = tpEjecutar(ctx({ accion: 'publicar', fecha: F, firma: tpFirma(base()) }));
  assert.strictEqual(ok.res.ok, true);
});

test('rectificar y publicar la versión 2', () => {
  const v1 = tpEjecutar(ctx({ accion: 'publicar', fecha: F }));
  const idx = v1.escr[1].datos, snap1 = v1.escr[0].datos;
  const pubT = base().map(t => ({ ...t, st: 'pub', pubV: 1 }));
  assert.strictEqual(tpEjecutar(ctx({ accion: 'rectificar', fecha: F, motivo: 'x' })).err.code, 'failed-precondition');
  const R = tpEjecutar(ctx({ accion: 'rectificar', fecha: F, motivo: 'Faltó un obrero' }, { tareos: pubT, idx }));
  assert.deepStrictEqual(R.res, { ok: true, fecha: F, v: 1, abierto: { t: 1000, by: 'j@o.pe', motivo: 'Faltó un obrero' }, n: 2 });
  assert.deepStrictEqual(R.escr.filter(w => w.col === 'tareo').map(w => [w.datos.st, w.hist.a, w.hist.mot]), [['rev', 'rect', 'Faltó un obrero'], ['rev', 'rect', 'Faltó un obrero']]);
  const idx2 = R.escr.find(w => w.col === 'tpubidx').datos;
  assert.deepStrictEqual(idx2.abierto, { t: 1000, by: 'j@o.pe', motivo: 'Faltó un obrero' });
  assert.strictEqual(idx2.v, 1);
  assert.match(tpEjecutar(ctx({ accion: 'rectificar', fecha: F, motivo: 'otra' }, { tareos: pubT, idx: idx2 })).err.msg, /ya está abierto/);
  /* v2: motivo obligatorio */
  const T = base(); T[1].rows['33333333'].h = { p10_05: 9.5 };
  assert.strictEqual(tpEjecutar(ctx({ accion: 'publicar', fecha: F }, { tareos: T, idx: idx2, vigente: snap1 })).err.code, 'invalid-argument');
  const pr = tpEjecutar(ctx({ accion: 'previa', fecha: F }, { tareos: T, idx: idx2, vigente: snap1 }));
  assert.strictEqual(pr.res.v, 2); assert.strictEqual(pr.res.rect, true); assert.strictEqual(pr.res.vigente.v, 1); assert.strictEqual(pr.res.dif.n, 2);
  const v2 = tpEjecutar(ctx({ accion: 'publicar', fecha: F, motivo: 'Corrige horas de GAMA' }, { tareos: T, idx: idx2, vigente: snap1, now: 2000 }));
  assert.strictEqual(v2.res.id, F + '_v2');
  const s2 = v2.escr[0].datos; assert.strictEqual(s2.ant, 1); assert.strictEqual(s2.motivo, 'Corrige horas de GAMA');
  assert.deepStrictEqual(s2.dif.cambios.map(c => c.campo), ['h', 'ext']);
  const ix2 = v2.escr[1].datos;
  assert.deepStrictEqual(ix2.vers.map(x => x.v), [1, 2]); assert.strictEqual(ix2.v, 2); assert.strictEqual(ix2.abierto, null);
  assert.strictEqual(v2.escr[2].hist.mot, 'Corrige horas de GAMA');
  /* en rectificación un tareo que sigue «pub» (no se tocó) no bloquea */
  const T3 = base(); T3[0].st = 'pub';
  assert.strictEqual(tpEjecutar(ctx({ accion: 'publicar', fecha: F, motivo: 'm' }, { tareos: T3, idx: idx2, vigente: snap1 })).res.ok, true);
});

test('las escrituras no llevan undefined (Firestore no lo acepta)', () => {
  const T = base(); T[0].rows['11111111'].mot = undefined; delete T[0].revBy; delete T[0].envN;
  const R = tpEjecutar(ctx({ accion: 'publicar', fecha: F }, { tareos: T }));
  const hay = v => v === undefined || (v && typeof v === 'object' && Object.values(v).some(hay));
  assert.ok(!R.escr.some(w => hay(w.datos) || (w.hist && hay(w.hist))));
});
