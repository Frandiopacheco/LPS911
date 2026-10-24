'use strict';
/* Tanda 1 (decidido con el dueño, 23/10):
   - C-03: una semana descongelada que nadie volvió a congelar se re-congela sola a las 2 horas, tal como estaba (desde su copia __h).
   - C-29: el congelado automático guarda el nombre del SC de ese momento (scn). */
const test = require('node:test');
const assert = require('node:assert');
const { REFRZ_MS, weeksToRefreeze, refreezeDoc, buildFreeze } = require('../lib');

const UN = '2026-10-01T15:00:00.000Z';
const t0 = Date.parse(UN);
const V = { frozenAt: '2026-09-26T18:00:00.000Z', items: { e0: { sc: 'c2', act: 'Entubado', days: ['2026-09-29'] } }, res: { e0: { ok: false, cnc: 'Materiales' } }, auto: true };

test('weeksToRefreeze: solo las descongeladas hace 2 horas o más, desde la última copia sin recuperar', () => {
  const weeks = [
    { id: '58_p1', n: 58, pisoId: 'p1', unfrozenAt: UN },
    { id: '58_p2', n: 58, pisoId: 'p2', unfrozenAt: UN, frozenAt: '2026-10-01T16:00:00.000Z' }, // ya la congelaron otra vez
    { id: '58_p3', n: 58, pisoId: 'p3', unfrozenAt: UN }, // sin copia: no hay de dónde reponerla
    { id: '58_p4', n: 58, pisoId: 'p4', unfrozenAt: new Date(t0 + 3600e3).toISOString() } // hace solo 1 hora
  ];
  const hist = [
    { id: '58_p1__h1', histOf: '58_p1', unAt: '2026-09-30T10:00:00.000Z', v: V },
    { id: '58_p1__h2', histOf: '58_p1', unAt: UN, v: V },
    { id: '58_p1__h3', histOf: '58_p1', unAt: '2026-10-01T16:00:00.000Z', v: V, restAt: 'x' }, // ya recuperada
    { id: '58_p4__h1', histOf: '58_p4', unAt: UN, v: V }
  ];
  assert.deepStrictEqual(weeksToRefreeze(weeks, hist, t0 + REFRZ_MS - 1), []);
  assert.deepStrictEqual(weeksToRefreeze(weeks, hist, t0 + REFRZ_MS), [{ id: '58_p1', hid: '58_p1__h2', unAt: UN }]);
});

test('refreezeDoc: repone la versión tal como estaba y no pisa una semana que alguien congeló o volvió a descongelar', () => {
  const ex = { n: 58, pisoId: 'p1', unfrozenAt: UN };
  const r = refreezeDoc(ex, { id: '58_p1__h2', histOf: '58_p1', n: 58, pisoId: 'p1', v: V }, { e0: ['2026-09-29'] }, UN, '2026-10-01T17:00:00.000Z');
  assert.deepStrictEqual(r.week.items, V.items);
  assert.deepStrictEqual(r.week.res, V.res);
  assert.strictEqual(r.week.frozenAt, V.frozenAt);
  assert.strictEqual(r.week.auto, true);
  assert.deepStrictEqual(r.week.refrz, { at: '2026-10-01T17:00:00.000Z', unAt: UN, hid: '58_p1__h2' });
  assert.deepStrictEqual(r.snap, { e0: ['2026-09-29'] });
  // copia antigua con la foto adentro (v.snap): manda esa y no va a weeks
  const r2 = refreezeDoc(ex, { id: 'h', v: { ...V, snap: { e0: ['x'] } } }, undefined, UN, 'z');
  assert.deepStrictEqual(r2.snap, { e0: ['x'] });
  assert.strictEqual(r2.week.snap, undefined);
  assert.strictEqual(refreezeDoc({ ...ex, frozenAt: 'y' }, { v: V }, null, UN, 'z'), null);
  assert.strictEqual(refreezeDoc(ex, { v: V, restAt: 'y' }, null, UN, 'z'), null);
  assert.strictEqual(refreezeDoc({ ...ex, unfrozenAt: '2026-10-01T16:30:00.000Z' }, { v: V }, null, UN, 'z'), null);
});

test('C-29: el congelado automático guarda el nombre del SC de ese momento', () => {
  const M = o => new Map(Object.entries(o).map(([id, v]) => [id, { ...v, id }]));
  const L = buildFreeze({
    project: { refWeek: 58, refDate: '2026-09-28' },
    pisos: M({ p1: { code: 'P1', order: 1 } }),
    sectors: M({ s1: { pisoId: 'p1', code: 'S1', order: 1 } }),
    ambientes: M({ a1: { sectorId: 's1', code: 'A1', name: 'Oficina', order: 1 } }),
    acts: M({ x1: { ambId: 'a1', sc: 'c1', name: 'Pintura', order: 1, days: ['2026-10-05'] }, x2: { ambId: 'a1', sc: 'c9', name: 'Otra', order: 2, days: ['2026-10-05'] } }),
    contractors: M({ c1: { name: 'ICR' } })
  }, 59, '2026-10-03T18:00:00.000Z');
  assert.strictEqual(L[0].doc.items.x1.scn, 'ICR');
  assert.strictEqual(L[0].doc.items.x2.scn, undefined); // SC que ya no existe: sin nombre guardado
});
