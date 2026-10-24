'use strict';
/* Tanda 3 (frente I): C-26 (hora de la publicación automática y recuperación de madrugada) y DAT-10 (archivadas en la jornada) */
const test = require('node:test');
const assert = require('node:assert');
const { planCutHH, planCutDue, planCatchUp, archCut, engCutTs, closesToAccept, sinCierre, closeCutTs } = require('../lib');
const at = (d, h) => Date.parse(`${d}T${h}:00-05:00`);

test('C-26: planCutHH solo entre 18:00 y 23:00', () => {
  for (const v of ['18:00', '21:00', '22:45', '23:00']) assert.strictEqual(planCutHH({ planCutHH: v }), v);
  for (const v of ['17:45', '23:15', '23:30', '00:00', '07:00', '', null]) assert.strictEqual(planCutHH({ planCutHH: v }), '21:00');
});

test('C-26: entre medianoche y las 06:00 se sigue intentando el plan del día anterior', () => {
  const p = { planCutHH: '23:00' };
  assert.strictEqual(planCatchUp(p, at('2026-10-21', '23:15')), null); // pasada normal (planCutDue)
  assert.strictEqual(planCutDue(p, at('2026-10-21', '23:15')), true);
  assert.strictEqual(planCatchUp(p, at('2026-10-22', '00:00')), '2026-10-21');
  assert.strictEqual(planCatchUp(p, at('2026-10-22', '05:45')), '2026-10-21');
  assert.strictEqual(planCatchUp(p, at('2026-10-22', '06:00')), null); // ya empezó la jornada: no se cierra el plan de hoy tarde
  assert.strictEqual(planCatchUp(p, at('2026-10-22', '14:00')), null);
  /* con 23:00 hay 4 pasadas antes de medianoche y 24 más de madrugada: alcanzan los RETRY_MAX (8) reintentos */
});

/* simulación de cerrarPlan (index.js): qué constancia (pcl/<fecha>) mira cada pasada y qué día cierra */
function pasada(p, now, pcl, cerrar) {
  const late = planCutDue(p, now) ? null : planCatchUp(p, now);
  if (!planCutDue(p, now) && !late) return null;
  const key = late || new Date(now - 5 * 3600e3).toISOString().slice(0, 10);
  if (pcl.has(key) && !pcl.get(key).fail) return null;
  const ok = cerrar(key);
  pcl.set(key, ok ? { d: key } : { fail: true });
  return key;
}
test('C-26: si todas las pasadas del día fallan, el plan se cierra pasada la medianoche (antes se perdía el día)', () => {
  const p = { planCutHH: '23:00' }; const pcl = new Map(); const hechos = [];
  const cerrar = k => { const t = cur; if (t < at('2026-10-22', '00:30')) return false; hechos.push(k); return true; }; // falla hasta las 00:30
  let cur;
  for (const h of ['22:45', '23:00', '23:15', '23:30', '23:45']) { cur = at('2026-10-21', h); pasada(p, cur, pcl, cerrar); }
  for (const h of ['00:00', '00:15', '00:30', '00:45', '06:00']) { cur = at('2026-10-22', h); pasada(p, cur, pcl, cerrar); }
  assert.deepStrictEqual(hechos, ['2026-10-21']); // la constancia del 21 (plan del día hábil siguiente) se cerró a las 00:30
  assert.strictEqual(pcl.get('2026-10-21').fail, undefined);
});

test('DAT-10: archivada antes del Cierre del ingeniero de ese día = fuera de la jornada; después, cuenta', () => {
  const D = '2026-10-20'; const P = { engCutHH: '21:00' };
  assert.strictEqual(archCut({ arch: { t: at(D, '15:00') } }, D, P), true);
  assert.strictEqual(archCut({ arch: { t: at(D, '21:30') } }, D, P), false);
  assert.strictEqual(archCut({ arch: { t: at('2026-10-19', '10:00') } }, D, P), true);
  assert.strictEqual(archCut({ arch: true }, D, P), true); // antiguas sin hora
  assert.strictEqual(archCut({}, D, P), false);
  assert.strictEqual(engCutTs(D, P), at(D, '21:00'));
});

test('DAT-10: closesToAccept y sinCierre tratan igual una archivada comprometida', () => {
  const D = '2026-10-20'; const P = { closeCutHH: '17:00', engCutHH: '21:00' };
  const acts = new Map(Object.entries({
    a1: { sc: 'c1', name: 'Pintura', ambId: 'm1', arch: { t: at(D, '15:00') } }, // archivada en el día, cerrada por el SC
    a2: { sc: 'c1', name: 'Tarrajeo', ambId: 'm1', arch: { t: at(D, '15:00') } }, // archivada en el día, sin cierre
    a3: { sc: 'c1', name: 'Sello', ambId: 'm1', arch: { t: at('2026-10-21', '09:00') } }, // archivada al día siguiente, cerrada
    a4: { sc: 'c1', name: 'Resane', ambId: 'm1', arch: { t: at('2026-10-21', '09:00') } } // archivada al día siguiente, sin cierre
  }));
  const dp = { date: D, pisoId: 'p1', ids: { a1: null, a2: null, a3: null, a4: null } };
  const t = closeCutTs(D, '17:00') - 3600e3;
  const lives = [{ date: D, pisoId: 'p1', actId: 'a1', sc: 'c1', close: { status: 'ok', t } }, { date: D, pisoId: 'p1', actId: 'a3', sc: 'c1', close: { status: 'ok', t } }];
  const A = closesToAccept(lives, new Map(), acts, D, new Map([[D + '_p1', dp]]), P).map(o => o.actId);
  assert.deepStrictEqual(A, ['a3']); // antes también aceptaba a1 (y sinCierre la saltaba): dos criterios
  const S = sinCierre(D, [dp], lives, new Map(), acts, new Set(), [], '17:00', { project: P }).map(o => o.actId);
  assert.deepStrictEqual(S, ['a4']); // a2 archivada antes del cierre: fuera; a4 archivada después: el día ya estaba cerrado
});
