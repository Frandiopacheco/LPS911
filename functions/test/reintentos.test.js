'use strict';
/* Reintentos por piso de congelarSemana (frz/<n>) y cerrarPlan (pcl/<fecha>) (auditoría de código 08/10, M2/M3):
   un piso que falla no corta a los demás, queda en la constancia (fail) y las pasadas siguientes reintentan solo ese piso,
   con un tope de RETRY_MAX pasadas. */
const test = require('node:test');
const assert = require('node:assert');
const { RETRY_MAX, retryPlan, runFloors, retryRecord } = require('../lib');

test('retryPlan: sin constancia = todo; constancia sin fallas (o antigua) = nada; con fallas = solo esos pisos', () => {
  assert.deepStrictEqual(retryPlan(null), { only: null, tries: 0 });
  assert.strictEqual(retryPlan({ at: 'x', n: 60, k: 3 }), null); // constancia antigua, sin fail
  assert.strictEqual(retryPlan({ fail: [], tries: 1 }), null);
  const p = retryPlan({ fail: ['p2'], tries: 1 });
  assert.deepStrictEqual([...p.only], ['p2']);
  assert.strictEqual(p.tries, 1);
  assert.strictEqual(retryPlan({ fail: ['p2'], tries: RETRY_MAX }), null); // se agotaron los intentos
  assert.ok(retryPlan({ fail: ['p2'], tries: RETRY_MAX - 1 }));
});

test('runFloors: un piso que falla no corta a los demás', async () => {
  const errs = [];
  const R = await runFloors(['p1', 'p2', 'p3'], async id => { if (id === 'p2') throw new Error('contención'); return id + '!'; }, (id, e) => errs.push([id, e.message]));
  assert.deepStrictEqual(R.done, ['p1', 'p3']);
  assert.deepStrictEqual(R.fail, ['p2']);
  assert.deepStrictEqual([...R.out], [['p1', 'p1!'], ['p3', 'p3!']]);
  assert.deepStrictEqual(errs, [['p2', 'contención']]);
});

test('retryRecord: suma lo hecho antes y deja solo los que siguen fallando', () => {
  const r1 = retryRecord(null, retryPlan(null), { at: 'a', d: '2026-10-09' }, ['p1', 'p3'], ['p2'], { k: 2, np: 1, nr: 0 });
  assert.deepStrictEqual(r1, { at: 'a', d: '2026-10-09', tries: 1, fail: ['p2'], done: ['p1', 'p3'], k: 2, np: 1, nr: 0 });
  const r2 = retryRecord(r1, retryPlan(r1), { at: 'b', d: '2026-10-09' }, ['p2'], [], { k: 1, np: 0, nr: 3 });
  assert.deepStrictEqual(r2, { at: 'b', d: '2026-10-09', tries: 2, fail: [], done: ['p1', 'p3', 'p2'], k: 3, np: 1, nr: 3 });
  assert.strictEqual(retryPlan(r2), null);
});

/* simulación de la tarea cada 15 minutos (como congelarSemana / cerrarPlan): constancia en memoria */
async function pasada(store, pisos, hacer, lecturas) {
  const prev = store.doc || null; const plan = retryPlan(prev);
  if (!plan) return false;
  lecturas.n++; // aquí la tarea lee toda la obra
  const ids = pisos.filter(p => !plan.only || plan.only.has(p));
  const R = await runFloors(ids, hacer);
  store.doc = retryRecord(prev, plan, { at: 't' }, R.done, R.fail, { k: R.done.length });
  return true;
}

test('tarea cada 15 min: reintenta solo el piso que falló y, sin fallas, no vuelve a leer la obra', async () => {
  const store = {}; const lecturas = { n: 0 }; const hechos = []; let falla = 2;
  const hacer = async p => { if (p === 'p2' && falla-- > 0) throw new Error('falló'); hechos.push(p); };
  assert.strictEqual(await pasada(store, ['p1', 'p2', 'p3'], hacer, lecturas), true);
  assert.deepStrictEqual(hechos, ['p1', 'p3']);
  assert.deepStrictEqual(store.doc.fail, ['p2']);
  await pasada(store, ['p1', 'p2', 'p3'], hacer, lecturas); // vuelve a fallar
  assert.deepStrictEqual(hechos, ['p1', 'p3']);
  await pasada(store, ['p1', 'p2', 'p3'], hacer, lecturas); // ahora sí
  assert.deepStrictEqual(hechos, ['p1', 'p3', 'p2']); // p1 y p3 no se repiten
  assert.deepStrictEqual(store.doc.fail, []);
  assert.strictEqual(store.doc.k, 3);
  assert.strictEqual(store.doc.tries, 3);
  const n = lecturas.n;
  assert.strictEqual(await pasada(store, ['p1', 'p2', 'p3'], hacer, lecturas), false);
  assert.strictEqual(lecturas.n, n); // nada pendiente: no se lee la obra
});

test('tarea cada 15 min: un piso que siempre falla se deja de intentar después de RETRY_MAX pasadas', async () => {
  const store = {}; const lecturas = { n: 0 };
  const hacer = async p => { if (p === 'p2') throw new Error('siempre'); };
  for (let i = 0; i < RETRY_MAX + 5; i++) await pasada(store, ['p1', 'p2'], hacer, lecturas);
  assert.strictEqual(lecturas.n, RETRY_MAX);
  assert.strictEqual(store.doc.tries, RETRY_MAX);
  assert.deepStrictEqual(store.doc.fail, ['p2']);
  assert.deepStrictEqual(store.doc.done, ['p1']);
});
