'use strict';
/* Cierre de las 20:00: publicación automática de los borradores del plan, rechazo de propuestas sin revisar y foto del plan */
const test = require('node:test');
const assert = require('node:assert');
const { publishDrafts, restrTypeFor, closePlanPiso, doneMap, wshift, wdist } = require('../lib');
const M = o => new Map(Object.entries(o).map(([k, v]) => [k, { ...v, id: k }]));
const clone = o => JSON.parse(JSON.stringify(o));

/* Firestore mínimo en memoria con transacciones (get / set / update) */
function memDb(init) {
  const st = new Map(Object.entries(init || {}).map(([k, v]) => [k, clone(v)]));
  const ref = p => ({ p, id: p.split('/')[1], get: async () => ({ exists: st.has(p), id: p.split('/')[1], data: () => (st.has(p) ? clone(st.get(p)) : undefined) }) });
  const db = {
    st,
    collection: c => ({ doc: id => ref(c + '/' + id) }),
    runTransaction: async fn => {
      const ops = []; let wrote = false;
      const out = await fn({
        get: r => { if (wrote) throw new Error('lectura después de escribir en la transacción'); return r.get(); },
        set: (r, d) => { wrote = true; ops.push(() => st.set(r.p, clone(d))); },
        update: (r, d) => { wrote = true; ops.push(() => { if (!st.has(r.p)) throw new Error('update de un documento que no existe: ' + r.p); st.set(r.p, { ...st.get(r.p), ...clone(d) }); }); }
      });
      for (const f of ops) f();
      return out;
    }
  };
  return db;
}

const D = '2026-10-06'; // martes
const PROJ = { cal: { sat: true }, restrTypes: ['Materiales', 'Subcontratista / mano de obra', 'Programación'] };
const CON = M({ c0: { name: 'Civil SAC' }, c1: { name: 'Gabel' }, c2: { name: 'Pintura Perú' } });
const ACTS = () => M({
  x1: { ambId: 'a1', sc: 'c1', name: 'Tarrajeo', order: 1, metrado: 10, und: 'm2', days: [D, '2026-10-07'], qty: { [D]: 5, '2026-10-07': 5 } },
  x2: { ambId: 'a1', sc: 'c2', name: 'Pintura', order: 2, days: ['2026-10-07', '2026-10-08'] },
  x3: { ambId: 'a1', sc: 'c2', name: 'Ya movida', order: 3, days: ['2026-10-09'] },
  x4: { ambId: 'a2', sc: 'c1', name: 'Contrapiso', order: 1, days: [D] },
  x5: { ambId: 'a2', sc: 'c2', name: 'Sigue igual', order: 2, days: [D], qty: { [D]: 3 } }
});
const NV1 = { kind: 'nova', draft: true, date: D, pisoId: 'p1', sc: 'c1', actId: 'x1', ids: ['x1', 'x2'], shift: 1, repTo: '2026-10-07', k: 'fre', c: 'SC', cnc: 'Subcontratista', imp: false, rsc: 'c0', pc: true, motivo: 'Frente no entregado (Civil SAC)', rdesc: 'falta tarrajeo', ts: 1 };
const NV2 = { kind: 'nova', draft: true, date: D, pisoId: 'p1', sc: 'c1', actId: 'x4', ids: ['x4', 'x1'], shift: 1, repTo: '2026-10-07', k: 'per', c: 'SC', cnc: 'Subcontratista', imp: true, rsc: 'c1', motivo: 'Falta de personal', ts: 2 };
const NV3 = { kind: 'nova', draft: true, date: D, pisoId: 'p1', sc: 'c2', actId: 'x3', ids: ['x3'], shift: 1, repTo: '2026-10-07', k: 'mat', c: 'MAT', cnc: 'Materiales', imp: false, motivo: 'Materiales', ts: 3 };
let seq = 0; const uid = p => p + '-t' + (++seq);

test('días hábiles: correr y distancia (domingo y feriados no cuentan)', () => {
  assert.strictEqual(wshift(PROJ, '2026-10-03', 1), '2026-10-05'); // sábado → lunes
  assert.strictEqual(wshift({ cal: { hol: [{ d: '2026-10-08' }] } }, '2026-10-07', 1), '2026-10-09');
  assert.strictEqual(wdist(PROJ, '2026-10-03', '2026-10-06'), 2);
});

test('tipo de restricción según el código de la causa (no el primero de la lista)', () => {
  const T = ['Materiales', 'Programación de obra', 'Calidad (QA/QC)', 'Clima / externo', 'Cliente o supervisión', 'Equipos y herramientas', 'Diseño', 'Mano de obra', 'Permisos', 'Ejecución', 'Otros'];
  assert.strictEqual(restrTypeFor('PROG', T), 'Programación de obra');
  assert.strictEqual(restrTypeFor('MAT', T), 'Materiales');
  assert.strictEqual(restrTypeFor('QA/QC', T), 'Calidad (QA/QC)');
  assert.strictEqual(restrTypeFor('EXT', T), 'Clima / externo');
  assert.strictEqual(restrTypeFor('CLI', T), 'Cliente o supervisión');
  assert.strictEqual(restrTypeFor('EQ', T), 'Equipos y herramientas');
  assert.strictEqual(restrTypeFor('DIS', T), 'Diseño');
  assert.strictEqual(restrTypeFor('SC', T), 'Mano de obra');
  assert.strictEqual(restrTypeFor('ADM', T), 'Permisos');
  assert.strictEqual(restrTypeFor('EJEC', T), 'Ejecución');
  assert.strictEqual(restrTypeFor('OT', T), 'Otros');
  assert.strictEqual(restrTypeFor('MAT', ['Programación']), ''); // ninguno calza: vacío, no el primero
  assert.strictEqual(restrTypeFor('MAT', []), '');
  assert.strictEqual(restrTypeFor('MAT', undefined), '');
  assert.strictEqual(restrTypeFor('', T), '');
});

test('publicar borradores: líder y tren, marca ↷, acumulación y salto de la que ya no tiene ese día', () => {
  const acts = ACTS();
  const R = publishDrafts({ drafts: [{ ...NV3, id: 'nv3' }, { ...NV2, id: 'nv2' }, { ...NV1, id: 'nv1' }], acts, contractors: CON, project: PROJ, pub: { n: 2 } }, D, 'p1', Date.UTC(2026, 9, 6, 1), { uid });
  // x1: corrida por nv1 (líder) y otra vez por nv2 (tren de x4)
  assert.deepStrictEqual(R.acts.x1.days, ['2026-10-08', '2026-10-09']);
  assert.deepStrictEqual(R.acts.x1.qty, { '2026-10-08': 5, '2026-10-09': 5 });
  assert.deepStrictEqual(R.acts.x1.rpl[D], { to: '2026-10-07', m: 'Frente no entregado (Civil SAC)', c: 'SC', cnc: 'Subcontratista', imp: false, rsc: 'c0', pc: true });
  assert.deepStrictEqual(R.acts.x1.rpl['2026-10-07'], { to: '2026-10-08', m: 'Falta de personal', c: 'SC', cnc: 'Subcontratista', imp: true, rsc: 'c1', pc: false, tr: 'x4' });
  // x2: tren de x1, marca en su primer día movido
  assert.deepStrictEqual(R.acts.x2.days, ['2026-10-08', '2026-10-09']);
  assert.strictEqual(R.acts.x2.rpl['2026-10-07'].tr, 'x1');
  assert.strictEqual(R.acts.x2.rpl['2026-10-07'].to, '2026-10-08');
  assert.deepStrictEqual(R.acts.x4.days, ['2026-10-07']);
  assert.strictEqual(R.acts.x3, undefined); // ya no tenía ese día
  assert.deepStrictEqual(R.skipped, ['Ya movida']);
  // restricciones: una por borrador que movió algo, con el tipo según la causa
  assert.strictEqual(R.restrs.length, 2);
  const r1 = R.restrs.find(r => r.doc.actId === 'x1').doc;
  assert.deepStrictEqual(r1, { actId: 'x1', pisoId: 'p1', type: 'Subcontratista / mano de obra', desc: 'falta tarrajeo', resp: 'Civil SAC', need: '2026-10-07', freed: '', status: 'pend',
    created: '2026-10-05', sc: 'c1', by: 'servidor', byName: 'Publicación automática', via: 'plan diario', cnc: 'Subcontratista', ccode: 'SC', imp: false, rsc: 'c0', pc: true });
  assert.ok(R.restrs.every(r => /^res-/.test(r.id)))
  // id fijo por borrador (el mismo que usa la página): publicar dos veces no duplica la restricción
  assert.ok(R.restrs.every(r => r.id === 'res-' + R.novas.find(n => n.patch.rid === r.id).id));
  // cada borrador pasa a publicado (también el que no movió nada, como en la página)
  assert.deepStrictEqual(R.novas.map(o => o.id), ['nv1', 'nv2', 'nv3']);
  const n1 = R.novas[0].patch;
  assert.strictEqual(n1.draft, false); assert.strictEqual(n1.pub, 'pub_2026-10-06_p1'); assert.ok(n1.rid);
  assert.deepStrictEqual(n1.mv.x1, { p: [D, '2026-10-07'], pq: { [D]: 5, '2026-10-07': 5 }, n: ['2026-10-07', '2026-10-08'], nq: { '2026-10-07': 5, '2026-10-08': 5 } });
  assert.deepStrictEqual(R.novas[2].patch, { draft: false, mv: {}, rid: '', pub: 'pub_2026-10-06_p1' });
  assert.strictEqual(R.pub.id, 'pub_2026-10-06_p1');
  assert.strictEqual(R.pub.doc.n, 5);
  assert.strictEqual(R.pub.doc.auto, true);
  assert.strictEqual(R.pub.doc.kind, 'pub');
  // no toca las entradas originales
  assert.deepStrictEqual(acts.get('x1').days, [D, '2026-10-07']);
});

test('publicar borradores: no mueve una actividad comprometida en otro día ya cerrado', () => {
  // el plan del 07 está cerrado con x2: x2 (tren) no se mueve; x1 sí
  const R = publishDrafts({ drafts: [{ ...NV1, id: 'nv1' }], acts: ACTS(), dplans: new Map([['2026-10-07_p1', { date: '2026-10-07', ids: { x2: null } }]]), contractors: CON, project: PROJ }, D, 'p1', Date.now(), { uid });
  assert.deepStrictEqual(Object.keys(R.acts), ['x1']);
  assert.deepStrictEqual(R.blocked, ['Pintura']);
  assert.match(R.log.join(' '), /2026-10-07/);
  // reabierto (reo) no cuenta como cerrado
  const R2 = publishDrafts({ drafts: [{ ...NV1, id: 'nv1' }], acts: ACTS(), dplans: new Map([['2026-10-07_p1', { date: '2026-10-07', ids: { x2: null }, reo: { why: 'x' } }]]), contractors: CON, project: PROJ }, D, 'p1', Date.now(), { uid });
  assert.deepStrictEqual(Object.keys(R2.acts).sort(), ['x1', 'x2']);
  // si la principal está en un día cerrado, el borrador queda sin publicar (nada se mueve, no hay restricción)
  const A3 = ACTS(); A3.set('x1', { ...A3.get('x1'), qty: { [D]: 4, '2026-10-07': 6 } }); // el 07 pasaría de 6 a 4
  const R3 = publishDrafts({ drafts: [{ ...NV1, id: 'nv1' }], acts: A3, dplans: new Map([['2026-10-07_p1', { date: '2026-10-07', ids: { x1: 5 } }]]), contractors: CON, project: PROJ }, D, 'p1', Date.now(), { uid });
  assert.deepStrictEqual(R3.acts, {});
  assert.deepStrictEqual(R3.novas, []);
  assert.deepStrictEqual(R3.restrs, []);
  assert.strictEqual(R3.pub, null);
});

function world(extra) {
  const acts = ACTS();
  const init = {
    'pdz/nv1': NV1, 'pdz/nv3': NV3,
    'pdz/dp_2026-10-06_x5': { kind: 'dprop', date: D, pisoId: 'p1', sc: 'c2', actId: 'x5', k: 'per', st: 'pend' },
    'pdz/dp_2026-10-06_x4': { kind: 'dprop', date: D, pisoId: 'p1', sc: 'c1', actId: 'x4', k: 'fin', st: 'ok', dec: 'Culminada' },
    ...extra
  };
  for (const [k, v] of acts) init['acts/' + k] = v;
  const db = memDb(init);
  const ctx = {
    project: PROJ, contractors: CON, acts,
    pisos: M({ p1: { order: 1 }, p2: { order: 2 } }), sectors: M({ s1: { pisoId: 'p1' }, s2: { pisoId: 'p2' } }),
    ambientes: M({ a1: { sectorId: 's1' }, a2: { sectorId: 's1' }, a9: { sectorId: 's2' } }),
    drafts: [{ ...NV1, id: 'nv1' }, { ...NV3, id: 'nv3' }],
    props: [{ ...init['pdz/dp_2026-10-06_x5'], id: 'dp_2026-10-06_x5' }]
  };
  ctx.piso = ctx.pisos.get('p1');
  return { db, ctx };
}

test('cierre de las 20:00: publica los borradores, rechaza las propuestas sin revisar y cierra con lo ya corrido', async () => {
  const { db, ctx } = world();
  const now = Date.UTC(2026, 9, 6, 1);
  const r = await closePlanPiso(db, ctx, D, now);
  const g = p => db.st.get(p);
  assert.deepStrictEqual(g('acts/x1').days, ['2026-10-07', '2026-10-08']);
  assert.deepStrictEqual(g('acts/x2').days, ['2026-10-08', '2026-10-09']);
  assert.strictEqual(g('acts/x1').name, 'Tarrajeo'); // solo cambian days/qty/rpl
  assert.strictEqual(g('pdz/nv1').draft, false);
  assert.strictEqual(g('pdz/nv1').pub, 'pub_2026-10-06_p1');
  assert.ok(g('restr/' + g('pdz/nv1').rid));
  assert.strictEqual(g('restr/' + g('pdz/nv1').rid).by, 'servidor');
  assert.strictEqual(g('pdz/pub_2026-10-06_p1').n, 2);
  // propuesta pendiente → rechazada; la ya decidida no se toca
  const dp = g('pdz/dp_2026-10-06_x5');
  assert.strictEqual(dp.st, 'rej'); assert.strictEqual(dp.decBy, 'servidor'); assert.strictEqual(dp.decT, now);
  assert.match(dp.dec, /va según lo programado/);
  assert.strictEqual(g('pdz/dp_2026-10-06_x4').st, 'ok');
  // foto: x1 ya no va ese día (se corrió); x4 y x5 siguen
  const dpl = g('dplan/2026-10-06_p1');
  assert.deepStrictEqual(dpl.ids, { x4: null, x5: 3 });
  assert.strictEqual(dpl.auto, true); assert.strictEqual(dpl.pub, 'pub_2026-10-06_p1'); assert.strictEqual(dpl.by, 'servidor');
  assert.strictEqual(r.P.length, 1);
});

test('cierre de las 20:00: un plan ya publicado o reabierto no se toca', async () => {
  for (const cur of [{ date: D, pisoId: 'p1', ids: { x1: 5 } }, { date: D, pisoId: 'p1', reo: { why: 'corrección' } }]) {
    const { db, ctx } = world({ 'dplan/2026-10-06_p1': cur });
    const r = await closePlanPiso(db, ctx, D, Date.now());
    assert.strictEqual(r.skip, true);
    assert.strictEqual(db.st.get('pdz/nv1').draft, true);
    assert.strictEqual(db.st.get('pdz/dp_2026-10-06_x5').st, 'pend');
    assert.deepStrictEqual(db.st.get('acts/x1').days, [D, '2026-10-07']);
    assert.deepStrictEqual(db.st.get('dplan/2026-10-06_p1'), cur);
  }
});

test('cierre de las 20:00: relee los borradores (uno publicado o borrado mientras tanto no se aplica)', async () => {
  const { db, ctx } = world({ 'pdz/nv1': { ...NV1, draft: false, pub: 'pub_2026-10-06_p1' } });
  db.st.delete('pdz/nv3');
  await closePlanPiso(db, ctx, D, Date.now());
  assert.deepStrictEqual(db.st.get('acts/x1').days, [D, '2026-10-07']);
  assert.deepStrictEqual(db.st.get('dplan/2026-10-06_p1').ids, { x1: 5, x4: null, x5: 3 });
  assert.strictEqual(db.st.has('pdz/pub_2026-10-06_p1'), false);
});

test('cierre de las 20:00: no corre una actividad comprometida en un día ya cerrado', async () => {
  const { db, ctx } = world({ 'dplan/2026-10-07_p1': { date: '2026-10-07', pisoId: 'p1', ids: { x2: null } } });
  await closePlanPiso(db, ctx, D, Date.now());
  assert.deepStrictEqual(db.st.get('acts/x1').days, ['2026-10-07', '2026-10-08']);
  assert.deepStrictEqual(db.st.get('acts/x2').days, ['2026-10-07', '2026-10-08']); // no se movió
});

test('terminadas: «Quitar registro» anula el cierre del capataz y solo cuenta el de la partida de la actividad', () => {
  const acts = new Map([['a', { sc: 'c1' }], ['b', { sc: 'c1' }], ['c', { sc: 'c1' }]]);
  const D2 = doneMap({
    daily: [{ date: '2026-10-05', recs: { a: { status: null, clr: true } } }],
    lives: [
      { date: '2026-10-05', actId: 'a', sc: 'c1', close: { status: 'ok', done: true } }, // quitado por el ingeniero
      { date: '2026-10-05', actId: 'b', sc: 'c-otro', close: { status: 'ok', done: true } }, // otra partida
      { date: '2026-10-05', actId: 'c', sc: 'c1', close: { status: 'ok', done: true } },
      { date: '2026-10-05', actId: 'zz', sc: 'c1', close: { status: 'ok', done: true } } // actividad que no existe
    ],
    acts
  });
  assert.deepStrictEqual([...D2.keys()], ['c']);
});

test('hora de la publicación automática: por defecto 21:00, editable (máx. 23:30) y en hora de Lima', () => {
  const { planCutHH, planCutDue } = require('../lib');
  assert.equal(planCutHH({}), '21:00');
  assert.equal(planCutHH({ planCutHH: '19:30' }), '19:30');
  assert.equal(planCutHH({ planCutHH: '23:45' }), '21:00');
  assert.equal(planCutHH({ planCutHH: 'x' }), '21:00');
  const at = h => Date.parse(`2026-10-05T${h}:00-05:00`);
  assert.equal(planCutDue({}, at('20:59')), false);
  assert.equal(planCutDue({}, at('21:00')), true);
  assert.equal(planCutDue({ planCutHH: '19:30' }, at('19:45')), true);
  assert.equal(planCutDue({ planCutHH: '19:30' }, at('08:00')), false);
});

test('agregar al plan (padd): reprogramar, adelantar y actividad nueva; las propuestas del SC no se aplican', () => {
  const PA = [
    { id: 'pa1', kind: 'padd', draft: true, st: 'ok', date: '2026-10-08', pisoId: 'p1', t: 'rep', actId: 'x4', q: 2, ts: 1 },
    { id: 'pa2', kind: 'padd', draft: true, st: 'ok', date: '2026-10-08', pisoId: 'p1', t: 'adel', actId: 'x3', from: '2026-10-09', ts: 2 },
    { id: 'pa3', kind: 'padd', draft: true, st: 'ok', date: '2026-10-08', pisoId: 'p1', t: 'new', ambId: 'a2', sc: 'c2', name: 'Resane', und: 'M2', q: 4, newId: 'nx1', order: 30, ts: 3 },
    { id: 'pa4', kind: 'padd', draft: true, st: 'pend', date: '2026-10-08', pisoId: 'p1', t: 'rep', actId: 'x5', ts: 4 }
  ];
  const R = publishDrafts({ drafts: PA, acts: ACTS(), dplans: new Map(), contractors: CON, project: PROJ }, '2026-10-08', 'p1', 1000, { uid });
  assert.deepStrictEqual(R.acts.x4.days, [D, '2026-10-08']);
  assert.deepStrictEqual(R.acts.x4.qty, { '2026-10-08': 2 });
  assert.deepStrictEqual(R.acts.x3.days, ['2026-10-08']);
  assert.ok(!R.acts.x5, 'la propuesta pendiente del SC no se aplica');
  assert.deepStrictEqual(R.newActs, [{ id: 'nx1', doc: { ambId: 'a2', sc: 'c2', name: 'Resane', und: 'M2', metrado: 4, days: ['2026-10-08'], qty: { '2026-10-08': 4 }, order: 30 } }]);
  assert.deepStrictEqual(R.padds.map(o => o.id), ['pa1', 'pa2', 'pa3']);
  assert.strictEqual(R.pub.doc.n, 3);
});

test('agregar al plan: no adelanta un día ya cerrado', () => {
  const PA = [{ id: 'pa2', kind: 'padd', draft: true, st: 'ok', date: '2026-10-08', pisoId: 'p1', t: 'adel', actId: 'x3', from: '2026-10-09', ts: 2 }];
  const R = publishDrafts({ drafts: PA, acts: ACTS(), dplans: new Map([['2026-10-09_p1', { date: '2026-10-09', ids: { x3: null } }]]), contractors: CON, project: PROJ }, '2026-10-08', 'p1', 1000, { uid });
  assert.ok(!R.acts.x3);
  assert.deepStrictEqual(R.blocked, ['Ya movida']);
});

test('cierre: lo agregado al plan se aplica y sus áreas dibujadas pasan a la actividad', async () => {
  const PA = { kind: 'padd', draft: true, st: 'ok', date: D, pisoId: 'p1', t: 'new', ambId: 'a1', sc: 'c2', name: 'Resane', newId: 'nx1', order: 30, ts: 9 };
  const Z = { kind: 'zona', date: D, pisoId: 'p1', sc: 'c2', paId: 'pa1', actId: null, pts: [0, 0, 1, 0, 1, 1] };
  const { db, ctx } = world({ 'pdz/pa1': PA, 'pdz/zpa': Z });
  ctx.drafts = [...ctx.drafts, { ...PA, id: 'pa1' }]; ctx.zones = [{ ...Z, id: 'zpa' }];
  await closePlanPiso(db, ctx, D, Date.UTC(2026, 9, 6, 1));
  const g = p => db.st.get(p);
  assert.deepStrictEqual(g('acts/nx1').days, [D]);
  assert.strictEqual(g('pdz/pa1').draft, false);
  assert.strictEqual(g('pdz/zpa').actId, 'nx1');
  assert.ok('nx1' in (g('dplan/' + D + '_p1').ids || {}), 'entra en la foto del plan');
});
