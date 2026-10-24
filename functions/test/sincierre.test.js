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

/* ---------- tanda 1 (23/10/2026): Cierre del ingeniero, TMP-5, H03a, feriados y «se trabaja» ---------- */
const { engCutHH, jornadaDays, isWork, nextWork, holPreload, holPeru } = require('../lib');

test('Cierre del ingeniero: por defecto 21:00, entre 18:00 y 23:00 y siempre después del corte del SC', () => {
  assert.strictEqual(engCutHH({}), '21:00');
  assert.strictEqual(engCutHH({ engCutHH: '22:30' }), '22:30');
  assert.strictEqual(engCutHH({ engCutHH: '17:30' }), '21:00'); // antes de las 18:00 no vale
  assert.strictEqual(engCutHH({ engCutHH: '23:15' }), '21:00'); // después de las 23:00 no vale
  assert.strictEqual(engCutHH({ engCutHH: '18:00', closeCutHH: '18:00' }), '21:00'); // no después del corte del SC
  assert.strictEqual(engCutHH({ closeCutHH: '21:00' }), '22:00');
});

test('jornada: ayer siempre; hoy recién a la hora del Cierre del ingeniero', () => {
  assert.deepStrictEqual(jornadaDays({}, Date.parse('2026-10-20T20:59:00-05:00')), ['2026-10-19']);
  assert.deepStrictEqual(jornadaDays({}, Date.parse('2026-10-20T21:00:00-05:00')), ['2026-10-19', '2026-10-20']);
  assert.deepStrictEqual(jornadaDays({ engCutHH: '22:00' }, Date.parse('2026-10-20T21:30:00-05:00')), ['2026-10-19']);
});

test('TMP-5: «Sin cierre» no se registra antes de la hora de corte aunque alguien fuerce la tarea', () => {
  const dp = [{ date: D, pisoId: 'p1', ids: { a1: null } }];
  assert.deepStrictEqual(sinCierre(D, dp, [], new Map(), acts(), new Set(), CNC, '17:00', { now: Date.parse(D + 'T10:15:00-05:00') }), []);
  assert.strictEqual(sinCierre(D, dp, [], new Map(), acts(), new Set(), CNC, '17:00', { now: Date.parse(D + 'T21:00:00-05:00') }).length, 1);
});

test('H03a: lo terminado antes de ese día no recibe «Sin cierre»; lo terminado ese mismo día sí se mide', () => {
  const dp = [{ date: D, pisoId: 'p1', ids: { a1: null, a3: null } }];
  const done = new Map([['a1', '2026-10-19'], ['a3', D]]);
  assert.deepStrictEqual(sinCierre(D, dp, [], new Map(), acts(), new Set(), CNC, '17:00', { done }).map(o => o.actId), ['a3']);
});

test('C-08: «se trabaja» vuelve laborable un domingo o feriado (cal.work)', () => {
  const p = { cal: { sat: false, hol: [{ d: '2026-12-08', n: 'Inmaculada' }], work: [{ d: '2026-12-08' }, { d: '2026-10-25' }] } };
  assert.strictEqual(isWork(p, '2026-12-08'), true);
  assert.strictEqual(isWork(p, '2026-10-25'), true); // domingo trabajado
  assert.strictEqual(isWork(p, '2026-11-01'), false); // otro domingo
  assert.strictEqual(isWork(p, '2026-10-24'), false); // sábado no laborable
  assert.strictEqual(nextWork(p, '2026-10-23'), '2026-10-25');
});

test('C-08: precarga de feriados de Perú: agrega el año que no tiene ninguno, no toca el que ya se cargó, una vez por año', () => {
  const cal = { hol: [{ d: '2026-01-01', n: 'Año Nuevo' }, { d: '2026-11-15', n: 'Día de la obra' }] }; // 2026 cargado a mano (sin el 08-dic)
  const r = holPreload(cal, [2026, 2027]);
  assert.deepStrictEqual(r.holPre, [2026, 2027]);
  assert.ok(!r.hol.some(o => o.d === '2026-12-08'), 'no se repone un feriado del año ya cargado');
  assert.ok(r.hol.some(o => o.d === '2026-11-15'), 'lo cargado a mano sigue');
  assert.strictEqual(r.add.length, holPeru(2027).length);
  assert.ok(r.hol.some(o => o.d === '2027-01-01') && r.hol.some(o => o.d === '2027-03-26')); // Año Nuevo y Viernes Santo 2027
  assert.strictEqual(holPreload({ ...cal, hol: r.hol, holPre: r.holPre }, [2026, 2027]), null); // ya hecho: nada
  // si el administrador quita un feriado de 2027 después, no vuelve
  assert.strictEqual(holPreload({ hol: r.hol.filter(o => o.d !== '2027-07-23'), holPre: r.holPre }, [2026, 2027]), null);
});
