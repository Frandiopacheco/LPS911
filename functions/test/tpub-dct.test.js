'use strict';
// Descuentos a subcontratistas (24-10-2026): partida descontable (tpc.dct), reparto por obrero rows[dni].dct = {pc: {sc: horas}},
// validación al publicar (bloqueo k 'dct') y lo que guarda la publicación (rows[].dct, pcs[].dct, scd con los nombres).
const test = require('node:test');
const assert = require('node:assert');
const { tpValidarDia, tpArmarPublicacion, tpDif, tpEjecutar } = require('../lib');

const F = '2026-10-23';
const CFG = { v: 1, jor: { ini: '07:30', fin: '17:00', ref: 60, refIni: '12:00' }, fer: false, rnl: { ref: 60, refIni: '12:00' } };
const PCS = [
  { id: 'p10_05', cod: '10.05', nom: 'Encofrado', grp: '10', grpN: 'ESTRUCTURAS', ua: 'CD1' },
  { id: 'p13_08', cod: '13.08', nom: 'Descuentos a SC', grp: '13', grpN: 'VARIOS', ua: 'CD9', dct: true },
];
const TCFG = { scd: [{ id: 'sA', n: 'DRYWALL', act: true }, { id: 'sB', n: 'ELECTRICAS', act: false }] };
const ficha = (dni, ape) => ({ id: dni, dni, ape, nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', ing: '2026-01-01', ces: '' });
const PER = [ficha('11111111', 'ALFA'), ficha('22222222', 'BETA')];
const row = (ape, o) => ({ ape, nom: 'JUAN', cat: 'OP', cua: 'ALBAÑILES', as: true, h: { p10_05: 4.5, p13_08: 4 }, ...o });
const tareo = rows => ({ id: F + '_c1', date: F, cap: 'c1', capN: 'Cap 1', st: 'rev', modo: 'hrs', pcs: ['p10_05', 'p13_08'], cfg: CFG, foto: ['f1'], rows, envN: 1 });
const V = (rows, tcfg = TCFG) => tpValidarDia({ fecha: F, tareos: [tareo(rows)], personal: PER, partidas: PCS, excepciones: {}, tcfg });
const dct = r => r.bloqueos.filter(b => b.k === 'dct');

test('reparto completo (uno o dos SC, también uno inactivo): no bloquea', () => {
  const r = V({ 11111111: row('ALFA', { dct: { p13_08: { sA: 4 } } }), 22222222: row('BETA', { dct: { p13_08: { sA: 2.5, sB: 1.5 } } }) });
  assert.deepStrictEqual(r.bloqueos, []);
});

test('sin reparto, incompleto, de más o a un SC que no está: bloquea con el obrero y la partida', () => {
  const r = V({ 11111111: row('ALFA'), 22222222: row('BETA', { dct: { p13_08: { sA: 3 } } }) });
  const B = dct(r);
  assert.strictEqual(B.length, 2);
  assert.deepStrictEqual(B.map(b => [b.dni, b.pc, b.tareo]), [['11111111', 'p13_08', F + '_c1'], ['22222222', 'p13_08', F + '_c1']]);
  assert.match(B[0].msg, /falta indicar a qué subcontratista se descuentan sus 4 h de la 13\.08/);
  assert.match(B[1].msg, /tiene 4 h y se repartieron 3 h/);
  assert.strictEqual(dct(V({ 11111111: row('ALFA', { dct: { p13_08: { sA: 5 } } }), 22222222: row('BETA', { dct: { p13_08: { sA: 4 } } }) })).length, 1);
  const x = dct(V({ 11111111: row('ALFA', { dct: { p13_08: { sZ: 4 } } }), 22222222: row('BETA', { dct: { p13_08: { sA: 4 } } }) }));
  assert.strictEqual(x.length, 1); assert.match(x[0].msg, /ya no está en la lista/);
});

test('no aplica: partida no descontable, sin horas en ella, obrero que no vino', () => {
  const r = V({ 11111111: row('ALFA', { h: { p10_05: 8.5 } }), 22222222: row('BETA', { as: false, mot: 'FA', h: { p13_08: 4 } }) });
  assert.deepStrictEqual(r.bloqueos, []);
  /* sin la marca en la partida, el reparto no se exige */
  const P2 = PCS.map(p => ({ ...p, dct: false }));
  const r2 = tpValidarDia({ fecha: F, tareos: [tareo({ 11111111: row('ALFA'), 22222222: row('BETA') })], personal: PER, partidas: P2, excepciones: {}, tcfg: TCFG });
  assert.deepStrictEqual(r2.bloqueos, []);
});

test('la publicación guarda el reparto limpio, la marca de la partida y los nombres de los SC usados', () => {
  const rows = { 11111111: row('ALFA', { dct: { p13_08: { sA: 4, sB: 0 }, p10_05: { sA: 4.5 } } }), 22222222: row('BETA', { h: { p10_05: 8.5 }, dct: { p13_08: { sB: 2 } } }) };
  const snap = tpArmarPublicacion({ fecha: F, tareos: [tareo(rows)], personal: PER, partidas: PCS, excepciones: {}, v: 1, at: 1, by: 'x', tcfg: TCFG });
  const A = snap.rows.find(r => r.dni === '11111111'), B = snap.rows.find(r => r.dni === '22222222');
  assert.deepStrictEqual(A.dct, { p13_08: { sA: 4 } });
  assert.strictEqual(B.dct, undefined);
  assert.strictEqual(snap.pcs.p13_08.dct, true);
  assert.strictEqual(snap.pcs.p10_05.dct, undefined);
  assert.deepStrictEqual(snap.scd, { sA: 'DRYWALL' });
});

test('diferencias entre versiones: cambio de SC', () => {
  const a = { rows: [{ dni: '1', ape: 'ALFA', as: true, h: { p13_08: 4 }, dct: { p13_08: { sA: 4 } } }], tot: {} };
  const b = { rows: [{ dni: '1', ape: 'ALFA', as: true, h: { p13_08: 4 }, dct: { p13_08: { sA: 1, sB: 3 } } }], tot: {} };
  const d = tpDif(a, b);
  assert.deepStrictEqual(d.cambios.map(c => [c.campo, c.pc, c.sc, c.antes, c.despues]), [['dct', 'p13_08', 'sA', 4, 1], ['dct', 'p13_08', 'sB', 0, 3]]);
});

test('tpEjecutar: con reparto incompleto no publica (ok:false, bloqueo dct); completo publica con dct', () => {
  const P = { accion: 'publicar', fecha: F, excepciones: {}, motivo: '', firma: '' };
  const mal = tpEjecutar({ P, tareos: [tareo({ 11111111: row('ALFA'), 22222222: row('BETA', { h: { p10_05: 8.5 } }) })], personal: PER, partidas: PCS, tcfg: TCFG, idx: null, vigente: null, by: 'x', byN: 'X', now: 1 });
  assert.strictEqual(mal.res.ok, false); assert.deepStrictEqual(mal.escr, []);
  assert.deepStrictEqual(mal.res.bloqueos.map(b => b.k), ['dct']);
  const bien = tpEjecutar({ P, tareos: [tareo({ 11111111: row('ALFA', { dct: { p13_08: { sA: 4 } } }), 22222222: row('BETA', { h: { p10_05: 8.5 } }) })], personal: PER, partidas: PCS, tcfg: TCFG, idx: null, vigente: null, by: 'x', byN: 'X', now: 1 });
  assert.strictEqual(bien.res.ok, true);
  const snap = bien.escr.find(e => e.col === 'tpub').datos;
  assert.deepStrictEqual(snap.rows.find(r => r.dni === '11111111').dct, { p13_08: { sA: 4 } });
});
