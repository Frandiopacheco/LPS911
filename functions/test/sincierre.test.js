'use strict';
/* Corte del cierre de jornada (configurable, por defecto 5 pm; reporte por excepción, oct 2026): lo comprometido en el plan publicado que nadie cerró entra como No cumplido imputable al SC */
const test = require('node:test');
const assert = require('node:assert');
const { sinCierre, closeCutTs, closeCutHH, cncSinCierre } = require('../lib');
const D = '2026-10-20';
const cut = closeCutTs(D, '17:00');
const acts = () => new Map(Object.entries({
  a1: { sc: 'c1', name: 'Pintura', ambId: 'm1' },
  a2: { sc: 'c1', name: 'Tarrajeo', ambId: 'm1', metrado: 10, und: 'm2', qty: { [D]: 4 } },
  a3: { sc: 'c2', name: 'Sello', ambId: 'm2' },
  a4: { sc: 'c2', name: 'Reprogramada', ambId: 'm2', rpl: { [D]: 1 } },
  a5: { sc: 'c2', name: 'Archivada', ambId: 'm2', arch: { t: 1 } },
  a6: { sc: 'c3', name: 'Cambió de SC', ambId: 'm2' },
  a7: { sc: 'c1', name: 'Verificada', ambId: 'm1' },
  a8: { sc: 'c1', name: 'No va', ambId: 'm1' }
}));
const dplans = [{ date: D, pisoId: 'p1', ids: { a1: null, a2: 4, a3: null, a4: null, a5: null, a6: null, a7: null, a8: null }, who: { a6: { sc: 'c2' } } }];
const CNC = ['Programación', 'Materiales', 'Subcontratas', 'Otros'];

test('hora de corte: configurable, por defecto 5 pm de Lima', () => {
  assert.strictEqual(new Date(cut).toISOString(), '2026-10-20T22:00:00.000Z');
  assert.strictEqual(closeCutHH({}), '17:00');
  assert.strictEqual(closeCutHH({ closeCutHH: '16:30' }), '16:30');
  assert.strictEqual(closeCutHH({ closeCutHH: '23:00' }), '17:00'); // después de las 21:00 no vale (el servidor corre a las 23:30)
  assert.strictEqual(closeCutHH({ closeCutHH: 'x' }), '17:00');
});

test('con corte a las 4 pm, un cierre de las 4:30 ya es tardío', () => {
  const lives = [{ date: D, actId: 'a1', sc: 'c1', close: { status: 'ok', t: closeCutTs(D, '16:30') } }];
  const L = sinCierre(D, [{ date: D, pisoId: 'p1', ids: { a1: null } }], lives, new Map(), acts(), new Set(), CNC, '16:00');
  assert.deepStrictEqual(L.map(o => o.actId), ['a1']);
  assert.match(L[0].rec.note, /antes de las 4 pm/);
  const L2 = sinCierre(D, [{ date: D, pisoId: 'p1', ids: { a1: null } }], lives, new Map(), acts(), new Set(), CNC); // por defecto 5 pm: a tiempo
  assert.deepStrictEqual(L2, []);
});

test('causa imputable al SC del cuadro del proyecto', () => {
  assert.strictEqual(cncSinCierre(CNC), 'Subcontratas');
  assert.strictEqual(cncSinCierre(['Mano de obra']), 'Mano de obra');
  assert.strictEqual(cncSinCierre(null), 'Subcontratas');
});

test('sin cierre a la hora de corte → No cumplido imputable al SC; se respeta lo cerrado a tiempo, verificado, reprogramado o archivado', () => {
  const lives = [
    { date: D, actId: 'a3', sc: 'c2', close: { status: 'ok', t: cut - 3600e3 } },            // cerró a tiempo
    { date: D, actId: 'a1', sc: 'c1', close: { status: 'ok', t: cut + 3600e3, by: 'sc@x' } } // cerró tarde
  ];
  const daily = new Map([[D + '_p1', { recs: { a7: { status: 'ok' } } }]]);
  const L = sinCierre(D, dplans, lives, daily, acts(), new Set(['a8']), CNC);
  const ids = L.map(o => o.actId).sort();
  assert.deepStrictEqual(ids, ['a1', 'a2']);
  const r1 = L.find(o => o.actId === 'a1').rec;
  assert.strictEqual(r1.status, 'no');
  assert.strictEqual(r1.cnc, 'Subcontratas');
  assert.strictEqual(r1.imp, true);
  assert.strictEqual(r1.done, false);
  assert.strictEqual(r1.sinCierre, true);
  assert.strictEqual(r1.prop.status, 'ok'); // lo que propuso tarde queda a la vista
  const r2 = L.find(o => o.actId === 'a2').rec;
  assert.strictEqual(r2.prog, 4);
  assert.strictEqual(r2.prop, undefined);
});

test('otro día o sin plan publicado: nada', () => {
  assert.deepStrictEqual(sinCierre('2026-10-21', dplans, [], new Map(), acts(), new Set(), CNC), []);
  assert.deepStrictEqual(sinCierre(D, [], [], new Map(), acts(), new Set(), CNC), []);
});
