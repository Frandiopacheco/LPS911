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
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'ok', done: true, by: 'u_1', n: 'Juan', t: 5 } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x2', sc: 'c1', close: { status: 'no', cnc: 'Clima' } },
    { date: '2026-09-29', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'ok' } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x3', st: 'run' }
  ];
  const daily = new Map([['2026-09-27_p1', { recs: { x2: { status: 'ok' } } }]]);
  const acts = new Map([['x1', { sc: 'c1', name: 'Pintura', ambId: 'a1', metrado: 10, qty: { '2026-09-27': 4 }, und: 'm2' }], ['x2', { sc: 'c1' }]]);
  const L = closesToAccept(lives, daily, acts, '2026-09-30');
  assert.strictEqual(L.length, 1);
  assert.strictEqual(L[0].actId, 'x1');
  assert.strictEqual(L[0].rec.prog, 4);
  // Cumplido sin confirmar → No cumplido «Sin confirmación», no imputable y sin terminada; lo propuesto queda en prop
  assert.strictEqual(L[0].rec.status, 'no');
  assert.strictEqual(L[0].rec.cnc, 'Sin confirmación');
  assert.strictEqual(L[0].rec.imp, false);
  assert.strictEqual(L[0].rec.done, false);
  assert.strictEqual(L[0].rec.exec, null);
  assert.deepStrictEqual([L[0].rec.prop.status, L[0].rec.prop.done], ['ok', true]);
  assert.strictEqual(L[0].rec.sc, 'c1');
  assert.strictEqual(L[0].rec.byName, 'Juan');
});

test('cierres sin revisar: un cumplido sin confirmar no lleva ejecutado; lo quitado por el ingeniero no vuelve', () => {
  const lives = [
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'ok' } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x2', sc: 'c1', close: { status: 'ok' } }
  ];
  const daily = new Map([['2026-09-27_p1', { recs: { x2: { status: null, clr: true } } }]]);
  const acts = new Map([['x1', { sc: 'c1', metrado: 10, qty: { '2026-09-27': 4 } }], ['x2', { sc: 'c1' }]]);
  const L = closesToAccept(lives, daily, acts, '2026-09-30');
  assert.deepStrictEqual(L.map(o => o.actId), ['x1']);
  assert.strictEqual(L[0].rec.prog, 4);
  assert.strictEqual(L[0].rec.exec, null);
});

/* Firestore mínimo en memoria: set con merge mezcla mapas anidados, como el real */
function memDb(init) {
  const st = new Map(Object.entries(init || {}).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  const merge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' ? merge(o[k], v) : v; return o; };
  const ref = p => ({ p, get: async () => ({ exists: st.has(p), data: () => st.get(p) }), set: async (d, o) => { st.set(p, o && o.merge ? merge(st.get(p), d) : d); } });
  const db = {
    st,
    collection: c => ({ doc: id => ref(c + '/' + id) }),
    batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => r.set(d, o)), commit: async () => { for (const f of ops) await f(); } }; },
    runTransaction: async fn => { const ops = []; const out = await fn({ get: r => r.get(), set: (r, d, o) => ops.push(() => r.set(d, o)) }); for (const f of ops) await f(); return out; }
  };
  return db;
}

test('cierre automático: no pisa lo que un ingeniero verificó después de la lectura (informe 4)', async () => {
  const { acceptCloses } = require('../lib');
  const lives = [{ id: '2026-09-28_x1', actId: 'x1', pisoId: 'p1', date: '2026-09-28', sc: 'c1', close: { status: 'ok', by: 'cap', n: 'Capataz', t: 1 } }];
  const acts = M({ x1: { ambId: 'a1', sc: 'c1', name: 'Tarrajeo', und: 'm2', metrado: 10, qty: { '2026-09-28': 10 } } });
  /* lectura del inicio: sin registro → el cierre del capataz se acepta */
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30');
  assert.strictEqual(L.length, 1);
  /* mientras corre la tarea, el ingeniero verifica «No cumplido» con su comentario */
  const db = memDb({ 'daily/2026-09-28_p1': { date: '2026-09-28', pisoId: 'p1', recs: { x1: { status: 'no', note: 'Verificado por ingeniero', by: 'ing@obra.pe' } } } });
  const r = await acceptCloses(db, L);
  const rec = db.st.get('daily/2026-09-28_p1').recs.x1;
  assert.strictEqual(rec.status, 'no');
  assert.strictEqual(rec.note, 'Verificado por ingeniero');
  assert.strictEqual(rec.by, 'ing@obra.pe');
  assert.deepStrictEqual(r, { n: 0, skip: 1 });
});

test('cierre automático: tampoco vuelve si el ingeniero quitó el registro; sí entra si sigue pendiente', async () => {
  const { acceptCloses } = require('../lib');
  const lives = [
    { id: 'l1', actId: 'x1', pisoId: 'p1', date: '2026-09-28', sc: 'c1', close: { status: 'ok', done: true, t: 1 } },
    { id: 'l2', actId: 'x2', pisoId: 'p1', date: '2026-09-28', sc: 'c1', close: { status: 'no', cnc: 'Materiales', t: 1 } }
  ];
  const acts = M({ x1: { ambId: 'a1', sc: 'c1', name: 'A' }, x2: { ambId: 'a1', sc: 'c1', name: 'B' } });
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30');
  const db = memDb({ 'daily/2026-09-28_p1': { date: '2026-09-28', pisoId: 'p1', recs: { x2: { status: null, clr: true } } } });
  const r = await acceptCloses(db, L);
  const recs = db.st.get('daily/2026-09-28_p1').recs;
  assert.strictEqual(recs.x1.status, 'no');
  assert.strictEqual(recs.x1.cnc, 'Sin confirmación');
  assert.strictEqual(recs.x2.status, null);
  assert.strictEqual(db.st.get('doneidx/p1'), undefined); // sin confirmar no queda como terminada
  assert.deepStrictEqual(r, { n: 1, skip: 1 });
});

const { propCutTs, weeksToFreeze, doneMap, buildFreeze } = require('../lib');
const PROJ = { refWeek: 58, refDate: '2026-09-28' };

test('congelado automático: corte del sábado 13:00 de Lima y ventana hasta el lunes', () => {
  // semana 60 empieza el lunes 12/10; su corte es el sábado 10/10 13:00 Lima = 18:00 UTC
  assert.strictEqual(propCutTs(PROJ, 60), Date.UTC(2026, 9, 10, 18));
  assert.deepStrictEqual(weeksToFreeze(PROJ, Date.UTC(2026, 9, 10, 17, 59)), []); // 12:59 del sábado: todavía no
  assert.deepStrictEqual(weeksToFreeze(PROJ, Date.UTC(2026, 9, 10, 18, 0)), [60]); // 13:00: sí
  assert.deepStrictEqual(weeksToFreeze(PROJ, Date.UTC(2026, 9, 12, 20)), [60]); // lunes: todavía la intenta
  assert.deepStrictEqual(weeksToFreeze(PROJ, Date.UTC(2026, 9, 13, 20)), []); // martes: ya no
  // corte configurado el viernes 19:00
  const P2 = { ...PROJ, propCutDow: 5, propCutHH: '19:00' };
  assert.strictEqual(propCutTs(P2, 60), Date.UTC(2026, 9, 10, 0)); // viernes 09/10 19:00 Lima = sábado 00:00 UTC
  assert.deepStrictEqual(weeksToFreeze({}, Date.now()), []);
});

test('congelado automático: terminadas, reaperturas y cierres del capataz', () => {
  const D = doneMap({
    doneidx: [{ d: { a: '2026-10-05', b: '2026-10-01' }, r: { b: '2026-10-02' } }],
    daily: [{ date: '2026-10-07', recs: { c: { status: 'ok', done: true } } }, { date: '2026-10-08', recs: { e: { status: 'no' } } }],
    lives: [{ date: '2026-10-06', actId: 'd', close: { status: 'ok', done: true } }, { date: '2026-10-08', actId: 'e', close: { status: 'ok', done: true } }]
  });
  assert.strictEqual(D.get('a'), '2026-10-05');
  assert.strictEqual(D.has('b'), false); // reabierta después de terminar
  assert.strictEqual(D.get('c'), '2026-10-07');
  assert.strictEqual(D.get('d'), '2026-10-06');
  assert.strictEqual(D.has('e'), false); // el ingeniero registró ese día: el cierre del capataz no cuenta
});

test('congelado automático: compromisos de la semana por piso, como «Congelar»', () => {
  const L = buildFreeze({
    project: PROJ,
    pisos: M({ p1: { code: 'P1', order: 1 }, p2: { code: 'P2', order: 2 }, p3: { code: 'P3', order: 3, arch: { t: 1 } } }),
    sectors: M({ s1: { pisoId: 'p1', code: 'S1', order: 1 }, s2: { pisoId: 'p2', code: 'S2', order: 1 } }),
    ambientes: M({ a1: { sectorId: 's1', code: 'A1', name: 'Oficina', order: 1 }, a2: { sectorId: 's2', code: 'A2', name: 'Pasillo', order: 1 } }),
    acts: M({
      x1: { ambId: 'a1', sc: 'c1', name: 'Pintura', order: 1, days: ['2026-10-09', '2026-10-12', '2026-10-13'], metrado: 100, und: 'm2', qty: { '2026-10-12': 20, '2026-10-13': 30 } },
      x2: { ambId: 'a1', sc: 'c2', name: 'Piso', order: 2, days: ['2026-10-12', '2026-10-14'] }, // terminada el 12: el 14 ya no es compromiso
      x3: { ambId: 'a1', sc: 'c2', name: 'Borrada', order: 3, days: ['2026-10-12'], arch: { t: 1 } },
      x4: { ambId: 'a2', sc: 'c1', name: 'Fuera de la semana', order: 1, days: ['2026-10-20'] }
    }),
    done: new Map([['x2', '2026-10-12']]),
    props: [{ sc: 'c2', items: { x2: { sent: true, after: { ambId: 'a1', days: ['2026-10-12', '2026-10-15'] } }, x9: { sent: false, after: { ambId: 'a1', days: ['2026-10-12'] } } } }]
  }, 60, '2026-10-10T18:00:00.000Z');
  assert.deepStrictEqual(L.map(o => o.id), ['60_p1']); // P2 no tiene compromisos esa semana; P3 está archivado
  const d = L[0].doc;
  assert.strictEqual(d.auto, true);
  assert.strictEqual(d.frozenBy, 'servidor');
  assert.deepStrictEqual(Object.keys(d.items).sort(), ['x1', 'x2']);
  assert.deepStrictEqual(d.items.x1.days, ['2026-10-12', '2026-10-13']);
  assert.strictEqual(d.items.x1.q, 50);
  assert.strictEqual(d.items.x1.und, 'm2');
  assert.deepStrictEqual(d.items.x2.days, ['2026-10-12']);
  assert.strictEqual(d.items.x2.amb, 'Oficina');
  // la foto del lookahead va aparte, a wsnap/<id> (M1): weeks ya no la lleva
  assert.strictEqual(d.snap, undefined);
  assert.deepStrictEqual(L[0].wsnap.snap.x1, ['2026-10-09', '2026-10-12', '2026-10-13']);
  assert.deepStrictEqual([L[0].wsnap.n, L[0].wsnap.pisoId, L[0].wsnap.t], [60, 'p1', '2026-10-10T18:00:00.000Z']);
  assert.deepStrictEqual(d.propOut, ['c2/x2']); // enviada y sin decidir; la no enviada no cuenta
});

const { nextWork, buildDayPlan } = require('../lib');
test('cierre de las 20:00: día hábil siguiente y foto del plan por piso', () => {
  const P = { cal: { hol: [{ d: '2026-10-08', n: 'Combate de Angamos' }], sat: true } };
  assert.strictEqual(nextWork(P, '2026-10-02'), '2026-10-03'); // viernes → sábado (laborable)
  assert.strictEqual(nextWork({ cal: { sat: false } }, '2026-10-02'), '2026-10-05'); // sábado no laborable → lunes
  assert.strictEqual(nextWork(P, '2026-10-07'), '2026-10-09'); // salta el feriado
  const L = buildDayPlan({
    pisos: M({ p1: { order: 1 }, p2: { order: 2 } }), sectors: M({ s1: { pisoId: 'p1' }, s2: { pisoId: 'p2' } }),
    ambientes: M({ a1: { sectorId: 's1' }, a2: { sectorId: 's2' } }),
    acts: M({ x1: { ambId: 'a1', days: ['2026-10-05'], qty: { '2026-10-05': 12 } }, x2: { ambId: 'a1', days: ['2026-10-05'] }, x3: { ambId: 'a1', days: ['2026-10-05'], arch: { t: 1 } }, x4: { ambId: 'a2', days: ['2026-10-06'] }, x5: { ambId: 'a1', days: ['2026-10-02', '2026-10-05'] } }),
    done: new Map([['x5', '2026-10-02']])
  }, '2026-10-05');
  assert.deepStrictEqual(L, [{ id: '2026-10-05_p1', doc: { date: '2026-10-05', pisoId: 'p1', ids: { x1: 12, x2: null }, who: { x1: { sc: '', amb: 'a1' }, x2: { sc: '', amb: 'a1' } } } }]);
});

test('auditoría N01: no se acepta el cierre que declara otra partida que la de la actividad', () => {
  const lives = [
    { date: '2026-09-27', pisoId: 'p1', actId: 'xe', sc: 'c-san', close: { status: 'ok', done: true } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'ok' } }
  ];
  const acts = new Map([['xe', { sc: 'c-elec', name: 'Tablero' }], ['x1', { sc: 'c1', name: 'Pintura' }]]);
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30');
  assert.deepStrictEqual(L.map(o => o.actId), ['x1']);
});

test('auditoría N04: con plan del día cerrado, lo comprometido es la cantidad de la foto, no la vigente', () => {
  const lives = [{ date: '2026-09-27', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'ok' } }];
  const acts = new Map([['x1', { sc: 'c1', metrado: 100, und: 'ml', qty: { '2026-09-27': 10 } }]]);
  const dplans = new Map([['2026-09-27_p1', { ids: { x1: 20 } }]]);
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30', dplans);
  assert.strictEqual(L[0].rec.prog, 20);
  assert.strictEqual(L[0].rec.exec, null); // Cumplido sin confirmar: no se da por ejecutado
  // sin foto, como antes
  const L2 = closesToAccept(lives, new Map(), acts, '2026-09-30', new Map());
  assert.strictEqual(L2[0].rec.prog, 10);
});

test('cierres sin revisar: un Parcial o No cumplido propuesto entra tal cual, con su causa', () => {
  const lives = [
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', sc: 'c1', close: { status: 'no', cnc: 'Materiales' } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x2', sc: 'c1', close: { status: 'partial', cnc: 'Subcontratas' } }
  ];
  const acts = new Map([['x1', { sc: 'c1' }], ['x2', { sc: 'c1' }]]);
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30');
  assert.deepStrictEqual(L.map(o => [o.rec.status, o.rec.cnc, o.rec.imp]), [['no', 'Materiales', null], ['partial', 'Subcontratas', null]]);
});
