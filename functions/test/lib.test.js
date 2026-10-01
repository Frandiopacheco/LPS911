'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildVersion, closesToAccept, lastSundayNoon, limaToday } = require('../lib');
const M = o => new Map(Object.entries(o).map(([k, v]) => [k, { ...v, id: k }]));

test('domingo 12:00 de Lima', () => {
  // miércoles 30/09/2026 23:00 Lima = 01/10 04:00 UTC
  const now = Date.UTC(2026, 9, 1, 4);
  assert.strictEqual(lastSundayNoon(now).iso, '2026-09-27');
  assert.strictEqual(limaToday(now), '2026-09-30');
  // domingo 04/10 11:59 Lima → todavía cuenta el 27
  assert.strictEqual(lastSundayNoon(Date.UTC(2026, 9, 4, 16, 59)).iso, '2026-09-27');
  assert.strictEqual(lastSundayNoon(Date.UTC(2026, 9, 4, 17, 1)).iso, '2026-10-04');
});

test('versión automática: por piso y sin lo archivado', () => {
  const v = buildVersion({
    project: { refWeek: 58, refDate: '2026-09-28' },
    pisos: M({ p1: { code: 'P1', name: 'Piso 1', order: 10 }, p2: { code: 'P2', name: 'Piso 2', order: 20, arch: { t: 1 } } }),
    sectors: M({ s1: { pisoId: 'p1', code: 'S1' } }),
    ambientes: M({ a1: { sectorId: 's1', code: 'A1' }, a2: { sectorId: 's1', code: 'A2', arch: { t: 1 } } }),
    acts: M({ x1: { ambId: 'a1', name: 'Pintura', obs: 'x' }, x2: { ambId: 'a1', name: 'Borrada', arch: { t: 1 } }, x3: { ambId: 'a2', name: 'Otra' } })
  }, Date.UTC(2026, 9, 4, 18));
  assert.strictEqual(v.id, 'auto-2026-10-04');
  assert.strictEqual(v.idx.week, 59);
  assert.match(v.idx.label, /dom 04 oct 12:00 \(sem 59\)/);
  assert.deepStrictEqual(Object.keys(v.idx.pisos), ['p1']);
  const snap = JSON.parse(v.docs[0][1].json);
  assert.deepStrictEqual(Object.keys(snap.acts), ['x1']);
  assert.strictEqual(snap.acts.x1.obs, undefined);
});

test('cierres sin revisar: solo los de hace 2 días o más y sin registro', () => {
  const lives = [
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', close: { status: 'ok', done: true, by: 'u_1', n: 'Juan', t: 5 } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x2', close: { status: 'no', cnc: 'Clima' } },
    { date: '2026-09-29', pisoId: 'p1', actId: 'x1', close: { status: 'ok' } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x3', st: 'run' }
  ];
  const daily = new Map([['2026-09-27_p1', { recs: { x2: { status: 'ok' } } }]]);
  const acts = new Map([['x1', { sc: 'c1', name: 'Pintura', ambId: 'a1', metrado: 10, qty: { '2026-09-27': 4 }, und: 'm2' }], ['x2', { sc: 'c1' }]]);
  const L = closesToAccept(lives, daily, acts, '2026-09-30');
  assert.strictEqual(L.length, 1);
  assert.strictEqual(L[0].actId, 'x1');
  assert.strictEqual(L[0].rec.prog, 4);
  assert.strictEqual(L[0].rec.done, true);
  assert.strictEqual(L[0].rec.sc, 'c1');
  assert.strictEqual(L[0].rec.byName, 'Juan');
});
