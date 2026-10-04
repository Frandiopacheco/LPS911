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

test('cierres sin revisar: un cumplido lleva lo ejecutado = programado; lo quitado por el ingeniero no vuelve', () => {
  const lives = [
    { date: '2026-09-27', pisoId: 'p1', actId: 'x1', close: { status: 'ok' } },
    { date: '2026-09-27', pisoId: 'p1', actId: 'x2', close: { status: 'ok' } }
  ];
  const daily = new Map([['2026-09-27_p1', { recs: { x2: { status: null, clr: true } } }]]);
  const acts = new Map([['x1', { sc: 'c1', metrado: 10, qty: { '2026-09-27': 4 } }], ['x2', { sc: 'c1' }]]);
  const L = closesToAccept(lives, daily, acts, '2026-09-30');
  assert.deepStrictEqual(L.map(o => o.actId), ['x1']);
  assert.strictEqual(L[0].rec.exec, 4);
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
  const lives = [{ id: '2026-09-28_x1', actId: 'x1', pisoId: 'p1', date: '2026-09-28', close: { status: 'ok', by: 'cap', n: 'Capataz', t: 1 } }];
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
    { id: 'l1', actId: 'x1', pisoId: 'p1', date: '2026-09-28', close: { status: 'ok', done: true, t: 1 } },
    { id: 'l2', actId: 'x2', pisoId: 'p1', date: '2026-09-28', close: { status: 'no', cnc: 'Materiales', t: 1 } }
  ];
  const acts = M({ x1: { ambId: 'a1', sc: 'c1', name: 'A' }, x2: { ambId: 'a1', sc: 'c1', name: 'B' } });
  const L = closesToAccept(lives, new Map(), acts, '2026-09-30');
  const db = memDb({ 'daily/2026-09-28_p1': { date: '2026-09-28', pisoId: 'p1', recs: { x2: { status: null, clr: true } } } });
  const r = await acceptCloses(db, L);
  const recs = db.st.get('daily/2026-09-28_p1').recs;
  assert.strictEqual(recs.x1.status, 'ok');
  assert.strictEqual(recs.x2.status, null);
  assert.strictEqual(db.st.get('doneidx/p1').d.x1, '2026-09-28');
  assert.deepStrictEqual(r, { n: 1, skip: 1 });
});
