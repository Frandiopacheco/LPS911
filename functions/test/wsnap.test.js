'use strict';
/* Migración M1 (auditoría de datos): la foto del lookahead (snap) sale de weeks a wsnap sin perder nada. */
const test = require('node:test');
const assert = require('node:assert');
const { wsnapPlan, WSNAP_PAGE } = require('../lib');

const S = { x1: ['2026-10-12'], x2: [] };
test('wsnapPlan: semana congelada con snap → escribe wsnap/<id> y quita weeks.snap', () => {
  const r = wsnapPlan('60_p1', { n: 60, pisoId: 'p1', frozenAt: 'F', items: {}, snap: S }, null, '20261008');
  assert.deepStrictEqual(r.sets, [['60_p1', { snap: S, n: 60, pisoId: 'p1', t: 'F', mig: true }]]);
  assert.strictEqual(r.del, 'snap');
  assert.strictEqual(r.same, false);
});
test('wsnapPlan: copia de un descongelado (__h) → wsnap/<id __h> con histOf y quita v.snap', () => {
  const r = wsnapPlan('60_p1__h1', { histOf: '60_p1', n: 60, pisoId: 'p1', v: { frozenAt: 'F0', items: {}, snap: S }, unAt: 'U' }, null, 'T');
  assert.deepStrictEqual(r.sets, [['60_p1__h1', { snap: S, n: 60, pisoId: 'p1', t: 'F0', mig: true, histOf: '60_p1' }]]);
  assert.strictEqual(r.del, 'v.snap');
});
test('wsnapPlan: sin snap no hay nada que hacer (idempotente: una segunda pasada no toca nada)', () => {
  assert.strictEqual(wsnapPlan('60_p1', { n: 60, pisoId: 'p1', frozenAt: 'F', items: {} }, null, 'T'), null);
  assert.strictEqual(wsnapPlan('60_p1__h1', { histOf: '60_p1', v: { frozenAt: 'F' } }, null, 'T'), null);
  assert.strictEqual(wsnapPlan('x', null, null, 'T'), null);
});
test('wsnapPlan: wsnap ya tiene la misma foto → solo se quita de weeks (no se reescribe)', () => {
  const r = wsnapPlan('60_p1', { n: 60, pisoId: 'p1', snap: { x2: [], x1: ['2026-10-12'] } }, { snap: S, n: 60 }, 'T');
  assert.deepStrictEqual(r.sets, []);
  assert.strictEqual(r.same, true);
  assert.strictEqual(r.del, 'snap');
});
test('wsnapPlan: wsnap tiene otra foto → se guarda aparte (__m) antes de escribir la de weeks: nada se pierde', () => {
  const old = { snap: { x1: ['2026-10-01'] }, n: 60, pisoId: 'p1', t: 'A' };
  const r = wsnapPlan('60_p1', { n: 60, pisoId: 'p1', frozenAt: 'B', snap: S }, old, '20261008120000');
  assert.strictEqual(r.sets.length, 2);
  assert.deepStrictEqual(r.sets[0], ['60_p1__m20261008120000', { ...old, movedAt: '20261008120000' }]);
  assert.deepStrictEqual(r.sets[1][1].snap, S);
});
test('wsnapPlan: snap vacío o null también se mueve (y se quita)', () => {
  const r = wsnapPlan('60_p1', { n: 60, pisoId: 'p1', snap: null }, null, 'T');
  assert.deepStrictEqual(r.sets[0][1].snap, {});
  assert.strictEqual(r.del, 'snap');
});
test('WSNAP_PAGE: partes chicas (≤ 200 por pasada)', () => { assert.ok(WSNAP_PAGE > 0 && WSNAP_PAGE <= 200); });
