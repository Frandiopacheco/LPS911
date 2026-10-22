'use strict';
/* Avisos de detenciones (push, oct 2026): qué escritura dispara aviso, cuándo no se avisa, a quién y con qué texto */
const test = require('node:test');
const assert = require('node:assert');
const { nuevoDetenido, avisoNo, avisoDestinos, avisoTexto, pushHorario } = require('../lib');
const D = '2026-10-22'; // jueves
const at = hm => Date.parse(`${D}T${hm}:00-05:00`);

test('nuevoDetenido: solo el «Detenido» que no estaba antes (no reanudar, no cierre, no «Inicia después»)', () => {
  const s1 = { s: 'stop', m: 'Materiales', t: at('09:00'), by: 'sc@x.pe' };
  assert.deepStrictEqual(nuevoDetenido(null, { log: [s1] }), s1);
  assert.strictEqual(nuevoDetenido({ log: [s1] }, { log: [s1, { s: 'res', t: at('10:00') }] }), null);
  assert.strictEqual(nuevoDetenido({ log: [s1] }, { log: [s1, { s: 'close', m: 'no', t: at('16:00') }] }), null);
  assert.strictEqual(nuevoDetenido(null, { log: [{ s: 'stop', m: 'Inicia después', t: at('09:00') }] }), null);
  const s2 = { s: 'stop', m: 'Calidad', t: at('11:00'), by: 'sc@x.pe' };
  assert.deepStrictEqual(nuevoDetenido({ log: [s1] }, { log: [s1, { s: 'res', t: at('10:00') }, s2] }), s2);
  assert.strictEqual(nuevoDetenido({ log: [s1] }, null), null);
});

test('avisoNo: horario, día hábil, cierre y atraso', () => {
  const p = { closeCutHH: '17:00' }, lv = { date: D };
  const e = hm => ({ s: 'stop', m: 'Materiales', t: at(hm) });
  assert.strictEqual(avisoNo(p, lv, e('09:00'), at('09:01')), '');
  assert.strictEqual(avisoNo(p, lv, e('06:30'), at('06:31')), 'fuera del horario de avisos');
  assert.strictEqual(avisoNo({ ...p, pushIni: '06:00' }, lv, e('06:30'), at('06:31')), '');
  assert.strictEqual(avisoNo({ closeCutHH: '16:00' }, lv, e('16:10'), at('16:11')), 'reportado al cierre');
  assert.strictEqual(avisoNo(p, { date: D, close: { t: at('15:00') } }, e('15:00'), at('15:01')), 'reportado al cierre');
  assert.strictEqual(avisoNo(p, lv, e('09:00'), at('16:00')), 'llegó con más de 6 h de atraso');
  assert.strictEqual(avisoNo(p, { date: '2026-10-21' }, e('09:00'), at('09:01')), 'no es de hoy');
  assert.strictEqual(avisoNo({ ...p, pushOff: true }, lv, e('09:00'), at('09:01')), 'avisos apagados');
  assert.strictEqual(avisoNo({ ...p, cal: { hol: [{ d: D }] } }, lv, e('09:00'), at('09:01')), 'día no laborable');
  assert.deepStrictEqual(pushHorario({ pushIni: '08:00', pushFin: '07:00' }), { ini: '08:00', fin: '18:00' });
});

test('avisoDestinos: responsables del piso y administradores (con su filtro), sin quien reportó', () => {
  const M = [
    { id: 'ed2@x.pe', role: 'editor', pisos: ['p2'] }, { id: 'ed3@x.pe', role: 'editor', pisos: ['p3'] },
    { id: 'baja@x.pe', role: 'editor', pisos: ['p2'], off: true }, { id: 'adm@x.pe', role: 'admin' },
    { id: 'adm3@x.pe', role: 'admin' }, { id: 'campo@x.pe', role: 'campo', pisos: ['p2'] }, { id: 'sc@x.pe', role: 'sc' },
    { id: 'u_abc', role: 'capataz' }
  ];
  const P = { 'adm3@x.pe': { pisos: ['p3'] } };
  assert.deepStrictEqual(avisoDestinos(M, 'p2', 'sc@x.pe', P).sort(), ['adm@x.pe', 'ed2@x.pe', 'frandiopacheco@gmail.com']);
  assert.deepStrictEqual(avisoDestinos(M, 'p3', 'ED3@x.pe', P).sort(), ['adm3@x.pe', 'adm@x.pe', 'frandiopacheco@gmail.com']);
  // el dueño también puede limitar sus pisos
  assert.ok(!avisoDestinos(M, 'p2', '', { 'frandiopacheco@gmail.com': { pisos: ['p9'] } }).includes('frandiopacheco@gmail.com'));
});

test('avisoTexto: piso, SC, actividad, ambiente, motivo con detalle y hora', () => {
  const t = avisoTexto({ aid: 'a1', date: D, e: { s: 'stop', m: 'Materiales', x: 'no llegó la plancha RH', t: at('09:05') }, act: { name: 'Plancha 2.ª cara' },
    amb: { name: 'Baño varones' }, piso: { code: 'P3' }, con: { name: 'Drywall Andino' } });
  assert.strictEqual(t.title, '⏸ Detenido · P3 · Drywall Andino');
  assert.strictEqual(t.body, 'Plancha 2.ª cara · Baño varones\nMateriales — no llegó la plancha RH · 09:05');
  assert.strictEqual(t.tag, 'det-a1');
  assert.strictEqual(t.url, './?det=a1&d=' + D);
  // detalle desde live.mot si el evento no lo trae
  assert.match(avisoTexto({ aid: 'a1', date: D, e: { m: 'Calidad', t: at('10:00') }, lvMot: 'Calidad — falta liberación' }).body, /Calidad — falta liberación/);
  Object.values(t).forEach(v => assert.strictEqual(typeof v, 'string'));
});
