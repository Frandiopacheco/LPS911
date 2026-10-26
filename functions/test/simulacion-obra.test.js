'use strict';
/* Simulación de obra (auditorías 491ef73, traídas a la tanda 1): pruebas de TMP-1 y TMP-3 (parte del servidor) y del cierre
   de la jornada contra los manejadores REALES de functions/index.js (cerrarPlan, aceptarCierres) con un Firestore y un reloj
   de mentira. Cada prueba expresa la INVARIANTE correcta: si el hallazgo vuelve, la prueba falla. */
const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const path = require('node:path');

/* ---------- Firestore mínimo en memoria ---------- */
const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const DEL = { __del: true };
function merge(a, b) { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) { if (v === DEL) delete o[k]; else if (v && typeof v === 'object' && !Array.isArray(v) && !v.__del) o[k] = merge(o[k] && typeof o[k] === 'object' ? o[k] : {}, v); else o[k] = v; } return o; }
function makeDb() {
  const C = new Map(); const col = n => { if (!C.has(n)) C.set(n, new Map()); return C.get(n); };
  const snap = (n, id) => { const d = col(n).get(id); return { id, exists: d !== undefined, data: () => clone(d), get: k => (d || {})[k], ref: ref(n, id) }; };
  const ref = (n, id) => ({ id, path: n + '/' + id, _n: n,
    get: async () => snap(n, id),
    set: async (d, o) => { col(n).set(id, o && o.merge ? merge(col(n).get(id), clone(d)) : clone(d)); },
    update: async d => { if (!col(n).has(id)) throw new Error('no existe ' + n + '/' + id); col(n).set(id, merge(col(n).get(id), clone(d))); },
    delete: async () => { col(n).delete(id); } });
  const ops = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b };
  const query = (n, f = []) => ({
    where: (k, op, v) => query(n, [...f, [k, op, v]]), orderBy: () => query(n, f), limit: () => query(n, f), startAfter: () => query(n, f),
    get: async () => { const docs = [...col(n).keys()].map(id => snap(n, id)).filter(s => f.every(([k, op, v]) => ops[op]((s.data() || {})[k], v))); return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn) }; },
    doc: id => ref(n, id || 'auto' + Math.random().toString(36).slice(2)),
  });
  const db = {
    _C: C, put: (n, id, d) => col(n).set(id, clone(d)), peek: (n, id) => clone(col(n).get(id)), all: n => Object.fromEntries([...col(n).entries()].map(([k, v]) => [k, clone(v)])),
    collection: n => query(n),
    getAll: async (...refs) => refs.map(r => snap(r._n, r.id)),
    batch: () => { const L = []; return { set: (r, d, o) => L.push(() => r.set(d, o)), update: (r, d) => L.push(() => r.update(d)), delete: r => L.push(() => r.delete()), commit: async () => { for (const f of L) await f(); } }; },
    runTransaction: async fn => { const W = []; const out = await fn({ get: r => r.get(), set: (r, d, o) => W.push(() => r.set(d, o)), update: (r, d) => W.push(() => r.update(d)), delete: r => W.push(() => r.delete()) }); for (const f of W) await f(); return out; },
  };
  return db;
}

/* ---------- carga de functions/index.js con firebase-admin / firebase-functions de mentira ---------- */
const DB = { cur: null };
const handlers = {};
const noop = () => {};
const fakes = {
  'firebase-functions/v2/scheduler': { onSchedule: (opt, fn) => fn },
  'firebase-functions/v2/https': { onCall: (opt, fn) => fn, onRequest: (opt, fn) => fn, HttpsError: class extends Error {} },
  'firebase-functions/v2': { setGlobalOptions: noop },
  'firebase-functions/logger': { info: noop, warn: noop, error: noop, log: noop },
  'firebase-admin': (() => { const f = () => DB.cur; f.FieldValue = { delete: () => DEL, serverTimestamp: () => Date.now(), arrayUnion: (...v) => v, increment: n => n }; f.FieldPath = { documentId: () => '__name__' };
    return { initializeApp: noop, firestore: f, auth: () => ({}) }; })(),
};
const orig = Module._load;
Module._load = function (req, ...a) { if (fakes[req]) return fakes[req]; return orig.call(this, req, ...a); };
const idx = require(path.join('..', 'index.js'));
Module._load = orig;
const REAL_NOW = Date.now;
const at = iso => { Date.now = () => Date.parse(iso); };
test.afterEach(() => { Date.now = REAL_NOW; });

/* obra mínima: un piso, un sector, un ambiente y una actividad programada en `days` */
function obra({ cal, days, extra = {} }) {
  const db = makeDb(); DB.cur = db;
  db.put('meta', 'project', { refWeek: 58, refDate: '2026-09-28', cal, ...extra });
  db.put('pisos', 'p1', { code: 'P1', name: 'Piso 1', order: 1 });
  db.put('sectors', 's1', { pisoId: 'p1', code: 'S1', name: 'Sector 1', order: 1 });
  db.put('ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 1 });
  db.put('contractors', 'c1', { name: 'SC SANITARIAS' });
  db.put('acts', 'x1', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days, qty: Object.fromEntries(days.map(d => [d, 10])), order: 1 });
  return db;
}
/* 31-dic-2026 21:00 Lima = 1-ene-2027 02:00 UTC */
const CIERRE_31DIC = '2027-01-01T02:00:00Z';
/* 1-ene-2027 23:30 Lima = 2-ene-2027 04:30 UTC */
const SIN_CIERRE_1ENE = '2027-01-02T04:30:00Z';

test('TMP-1a · cerrarPlan del 31-dic NO debe armar el plan del 1-ene (feriado nacional) aunque el 2027 no esté cargado', async () => {
  const db = obra({ cal: { sat: true, hol: [{ d: '2026-12-25' }] }, days: ['2027-01-01', '2027-01-04'] }); // 2027 sin cargar
  at(CIERRE_31DIC);
  await idx.cerrarPlan({});
  const planes = Object.keys(db.all('dplan'));
  assert.deepStrictEqual(planes.filter(k => k.startsWith('2027-01-01')), [], 'se cerró el plan de un feriado (1-ene): ' + JSON.stringify(planes));
});

test('TMP-1b · control: con el 1-ene cargado como feriado, el 31-dic cierra el plan del 2-ene (esto sí funciona)', async () => {
  const db = obra({ cal: { sat: true, hol: [{ d: '2026-12-25' }, { d: '2027-01-01' }] }, days: ['2027-01-01', '2027-01-02'] });
  at(CIERRE_31DIC);
  await idx.cerrarPlan({});
  assert.deepStrictEqual(Object.keys(db.all('dplan')), ['2027-01-02_p1']);
});

test('TMP-1c · «Sin cierre» NO debe registrarse en un día no hábil (1-ene feriado cargado, plan que ya tenía foto)', async () => {
  const db = obra({ cal: { sat: true, hol: [{ d: '2027-01-01' }] }, days: ['2027-01-01'] });
  db.put('dplan', '2027-01-01_p1', { date: '2027-01-01', pisoId: 'p1', ids: { x1: 10 }, who: { x1: { sc: 'c1', amb: 'a1' } }, pub: 'pub_x', at: 1, by: 'ing@obra.pe' });
  at(SIN_CIERRE_1ENE);
  await idx.aceptarCierres({});
  const d = db.peek('daily', '2027-01-01_p1');
  assert.strictEqual(d, undefined, 'se imputó «Sin cierre» al SC en feriado: ' + JSON.stringify(d && d.recs));
});

test('TMP-1d · «Sin cierre» NO debe registrarse un sábado declarado no laborable (cal.sat=false)', async () => {
  const db = obra({ cal: { sat: false, hol: [] }, days: ['2027-01-02'] });
  db.put('dplan', '2027-01-02_p1', { date: '2027-01-02', pisoId: 'p1', ids: { x1: 10 }, who: { x1: { sc: 'c1', amb: 'a1' } }, pub: 'pub_x', at: 1, by: 'ing@obra.pe' });
  at('2027-01-03T04:30:00Z'); // sáb 2-ene 23:30 Lima
  await idx.aceptarCierres({});
  const d = db.peek('daily', '2027-01-02_p1');
  assert.strictEqual(d, undefined, 'se imputó «Sin cierre» en sábado no laborable: ' + JSON.stringify(d && d.recs));
});

test('TMP-3 (servidor) · si el ingeniero deshace la publicación DESPUÉS del corte, el día no debe quedar sin plan', async () => {
  /* estado que deja «↶ Deshacer publicación» a las 21:30 (plano.js unpubPlan): se borró dplan/<mañana>_p1 y pdz/pub_…;
     el servidor ya había dejado la constancia pcl/<hoy> (sin pisos fallidos) a las 21:00 */
  const db = obra({ cal: { sat: true, hol: [] }, days: ['2026-10-02'] });
  db.put('pcl', '2026-10-01', { at: '2026-10-02T02:00:00.000Z', d: '2026-10-02', hh: '21:00', tries: 1, fail: [], done: ['p1'], k: 0, np: 0, nr: 0 });
  at('2026-10-02T02:30:00Z'); // jue 1-oct 21:30 Lima
  await idx.cerrarPlan({});
  at('2026-10-02T04:45:00Z'); // 23:45: última pasada del día
  await idx.cerrarPlan({});
  assert.ok(db.peek('dplan', '2026-10-02_p1'), 'el 2-oct quedó sin foto del plan y el servidor no lo vuelve a cerrar');
});

test('TMP-3 · control: sin la constancia pcl/<hoy>, la pasada de las 21:30 sí cierra el plan (la prueba anterior falla por la constancia)', async () => {
  const db = obra({ cal: { sat: true, hol: [] }, days: ['2026-10-02'] });
  at('2026-10-02T02:30:00Z');
  await idx.cerrarPlan({});
  assert.ok(db.peek('dplan', '2026-10-02_p1'));
});

/* ---------- tanda 1 (23/10/2026): cierre de la jornada a la hora del Cierre del ingeniero ---------- */
const HOY = '2026-10-20'; // martes
const lima = (d, hh) => new Date(Date.parse(d + 'T' + hh + ':00-05:00')).toISOString();
function jornada(extra = {}) {
  const db = obra({ cal: { sat: true, hol: [] }, days: [HOY], extra });
  db.put('acts', 'x2', { ambId: 'a1', sc: 'c1', name: 'Tarrajeo', days: [HOY], order: 2 });
  db.put('dplan', HOY + '_p1', { date: HOY, pisoId: 'p1', ids: { x1: 10, x2: null }, who: { x1: { sc: 'c1', amb: 'a1' }, x2: { sc: 'c1', amb: 'a1' } } });
  db.put('live', HOY + '_x1', { date: HOY, actId: 'x1', pisoId: 'p1', sc: 'c1', close: { status: 'ok', done: true, by: 'sc@obra.pe', n: 'SC', t: Date.parse(lima(HOY, '16:30')) } });
  return db;
}

test('Jornada · antes del Cierre del ingeniero no se escribe nada; a las 21:00 el Cumplido del SC entra tal cual y lo no cerrado como «Sin cierre»', async () => {
  const db = jornada();
  db.put('jcl', '2026-10-19', { d: '2026-10-19' }); // ayer ya cerrado
  at(lima(HOY, '20:45'));
  await idx.aceptarCierres({});
  assert.strictEqual(db.peek('daily', HOY + '_p1'), undefined, 'se escribió antes de la hora');
  at(lima(HOY, '21:00'));
  await idx.aceptarCierres({});
  const recs = db.peek('daily', HOY + '_p1').recs;
  assert.deepStrictEqual([recs.x1.status, recs.x1.bySc, recs.x1.exec, recs.x1.done], ['ok', true, 10, false]);
  assert.deepStrictEqual([recs.x2.status, recs.x2.sinCierre, recs.x2.imp], ['no', true, true]);
  assert.ok(db.peek('jcl', HOY), 'sin constancia del día');
  assert.strictEqual(db.peek('doneidx', 'p1'), undefined, 'el check «Terminada» del SC se aplicó');
  /* idempotente: un ingeniero corrige después (con el Admin SDK) y la pasada siguiente no lo pisa */
  db.put('daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs: { ...recs, x2: { status: 'partial', by: 'ing@obra.pe' } } });
  at(lima(HOY, '21:15'));
  await idx.aceptarCierres({});
  assert.strictEqual(db.peek('daily', HOY + '_p1').recs.x2.status, 'partial');
});

test('Jornada · con el Cierre del ingeniero a las 22:30 no corre a las 21:00; ayer se recupera si una pasada falló', async () => {
  const db = jornada({ engCutHH: '22:30' });
  at(lima(HOY, '21:00'));
  await idx.aceptarCierres({});
  assert.strictEqual(db.peek('daily', HOY + '_p1'), undefined);
  assert.ok(db.peek('jcl', '2026-10-19'), 'ayer no quedó revisado');
  at(lima('2026-10-21', '08:00')); // al día siguiente: el martes se cierra igual
  await idx.aceptarCierres({});
  assert.strictEqual(db.peek('daily', HOY + '_p1').recs.x2.sinCierre, true);
});

test('Jornada · un domingo no laborable no hay «Sin cierre»; marcado «se trabaja», sí', async () => {
  const DOM = '2026-10-25';
  for (const work of [false, true]) {
    const db = obra({ cal: { sat: true, hol: [], ...(work ? { work: [{ d: DOM }] } : {}) }, days: [DOM] });
    db.put('dplan', DOM + '_p1', { date: DOM, pisoId: 'p1', ids: { x1: 10 }, who: { x1: { sc: 'c1', amb: 'a1' } } });
    db.put('jcl', '2026-10-24', { d: '2026-10-24' });
    at(lima(DOM, '21:00'));
    await idx.aceptarCierres({});
    const d = db.peek('daily', DOM + '_p1');
    if (work) assert.strictEqual(d.recs.x1.sinCierre, true);
    else assert.strictEqual(d, undefined, 'se imputó «Sin cierre» un domingo no trabajado');
  }
});

test('C-08 · el servidor precarga los feriados del año siguiente sin pisar lo cargado', async () => {
  const db = obra({ cal: { sat: true, hol: [{ d: '2026-10-08', n: 'Combate de Angamos' }, { d: '2026-11-15', n: 'Aniversario' }] }, days: ['2026-10-21'] });
  at(lima('2026-10-20', '10:00'));
  await idx.cerrarPlan({});
  const cal = db.peek('meta', 'project').cal;
  assert.deepStrictEqual(cal.holPre, [2026, 2027]);
  assert.ok(cal.hol.some(o => o.d === '2026-11-15'));
  assert.ok(!cal.hol.some(o => o.d === '2026-12-08'), '2026 ya tenía feriados: no se completa');
  assert.ok(cal.hol.some(o => o.d === '2027-07-28'));
  assert.strictEqual(cal.sat, true);
});
