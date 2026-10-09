// Pruebas de las reglas de Firestore (se ejecutan en GitHub con el emulador oficial).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteDoc, query, where, arrayUnion, deleteField, writeBatch } from 'firebase/firestore';

const OWNER = 'frandiopacheco@gmail.com';
let env;
const user = (email, uid = email.replace(/\W/g, '_')) => env.authenticatedContext(uid, { email, email_verified: true }).firestore();
const unverified = email => env.authenticatedContext('nv_' + email.replace(/\W/g, '_'), { email, email_verified: false }).firestore();
const cap = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();

test.before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-lps', firestore: { rules: fs.readFileSync('../../firebase/firestore.rules', 'utf8') } });
});
test.after(async () => { await env.cleanup(); });
test.beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    const S = (p, d) => setDoc(doc(db, p), d);
    await S('members/editor@obra.pe', { role: 'editor', name: 'Editor' });
    await S('meta/propwin', { closeAt: Date.now() + 864e5 }); // ventana de propuestas habilitada (sin ella el SC no propone)
    await S('members/campo@obra.pe', { role: 'campo', name: 'Jefe de campo' });
    await S('members/sc@obra.pe', { role: 'sc', name: 'SC Gabel', sc: 'c-gabel', scs: ['c-gabel'] });
    await S('members/lector@obra.pe', { role: 'lector', name: 'Lector' });
    await S('members/ot@obra.pe', { role: 'area', name: 'Jefe OT', area: 'OT' });
    await S('members/veedor@obra.pe', { role: 'veedor', name: 'Veedor' });
    await S('members/editor2@obra.pe', { role: 'editor', name: 'Editor designado', cli: true });
    await S('members/campo2@obra.pe', { role: 'campo', name: 'Campo designado', cli: true });
    await S('members/sc2@obra.pe', { role: 'sc', name: 'SC con marca', sc: 'c-gabel', scs: ['c-gabel'], cli: true });
    await S('members/calidad@obra.pe', { role: 'area', name: 'Ing. Calidad', area: 'Calidad' });
    await S('members/planner@obra.pe', { role: 'planner', name: 'Planner' });
    await S('mp/n1', { tipo: 'part', name: 'Tabiquería', ini: '2026-10-05', fin: '2026-11-20' });
    await S('mpver/1', { n: 1, st: 'pend', by: 'planner@obra.pe', items: {} });
    await S('lib/l-sol', { actId: 'x1', sc: 'c-gabel', st: 'sol', by: 'sc@obra.pe' });
    await S('lib/l-obs', { actId: 'x1', sc: 'c-gabel', st: 'obs', by: 'sc@obra.pe' });
    await S('lib/l-lib', { actId: 'x1', sc: 'c-gabel', st: 'lib', by: 'sc@obra.pe' });
    await S('lib/l-otro', { actId: 'x9', sc: 'c-otro', st: 'sol', by: 'editor@obra.pe' });
    await S('restr/r-ot', { actId: 'x1', grp: 'area', area: 'OT', by: 'editor@obra.pe', status: 'pend', freed: '', desc: 'Falta plano de detalle' });
    await S('restr/r-cal', { actId: 'x1', grp: 'area', area: 'Calidad', by: 'editor@obra.pe', status: 'pend', freed: '' });
    await S('restr/r-campo', { actId: 'x1', grp: 'campo', area: '', by: 'editor@obra.pe', status: 'pend', freed: '' });
    await S('members/u_cap1', { role: 'capataz', name: 'Juan', sc: 'c-gabel', scs: ['c-gabel'] });
    await S('inv/abc', { active: true, exp: Date.now() + 864e5, scs: ['c-gabel'] });
    await S('inv/old', { active: true, exp: Date.now() - 1000, scs: ['c-gabel'] });
    await S('acts/x1', { name: 'Pintura', sc: 'c-gabel', ambId: 'a1' });
    await S('acts/x9', { name: 'Drywall', sc: 'c-otro', ambId: 'a1' });
    await S('acts/x4', { name: 'Empaste', sc: 'c-gabel', ambId: 'a1' });
    await S('acts/xe', { name: 'Tablero eléctrico', sc: 'c-elec', ambId: 'a2' });
    await S('ambientes/a2', { name: 'Cuarto eléctrico', sectorId: 's2' });
    await S('sectors/s2', { name: 'Sector 2', pisoId: 'p2' });
    await S('restr/r-ed', { actId: 'x1', sc: 'c-gabel', by: 'editor@obra.pe', status: 'pend', freed: '' });
    await S('restr/r-sc', { actId: 'x1', sc: 'c-gabel', by: 'sc@obra.pe', status: 'pend', freed: '' });
    await S('pzon/x1', { pisoId: 'p1', sc: 'c-gabel', pts: [] });
    await S('pzon/x2', { pisoId: 'p1', sc: 'c-otro', pts: [] });
    await S('live/2026-10-01_x1', { date: '2026-10-01', actId: 'x1', sc: 'c-gabel' });
    await S('live/2026-10-01_x9', { date: '2026-10-01', actId: 'x9', sc: 'c-otro' });
    // Tareo
    await S('members/tasis@obra.pe', { role: 'tasis', name: 'Asistente de tareo' });
    await S('members/tcos@obra.pe', { role: 'tcos', name: 'Costos' });
    await S('members/tcapm@obra.pe', { role: 'tcap', name: 'Capataz consorcio' });
    await S('members/u_tcap1', { role: 'tcap', name: 'Pedro' });
    await S('members/jefe@obra.pe', { role: 'editor', name: 'Jefe de producción', tpub: true });
    await S('tper/03684337', { dni: '03684337', ape: 'QUISPE MAMANI', nom: 'JUAN', pue: 'OPERARIO ALBAÑIL', cat: 'OP', cua: 'ALBAÑILES', cap: '', act: true });
    await S('tpc/10.05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm2', act: true });
    await S('tcfg/main', { refIni: '12:00', limEnv: '18:00', tolGar: 15 });
    await S('meta/main', { name: 'Obra' });
    await S('pisos/p1', { code: 'P1', name: 'Piso 1' });
    await S('daily/2026-10-01_p1', { recs: {} });
  });
});

test('quien no está en el equipo no lee nada', async () => {
  await assertFails(getDoc(doc(user('extrano@x.pe'), 'acts/x1')));
  await assertFails(getDoc(doc(unverified('editor@obra.pe'), 'acts/x1')));
});
test('dueño y editor editan el lookahead; SC y lector no', async () => {
  await assertSucceeds(setDoc(doc(user(OWNER), 'acts/x2'), { name: 'a' }));
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'acts/x1'), { name: 'b' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'acts/x1'), { name: 'c' }));
  await assertFails(updateDoc(doc(user('lector@obra.pe'), 'acts/x1'), { name: 'c' }));
  await assertFails(updateDoc(doc(user('campo@obra.pe'), 'acts/x1'), { name: 'c' }));
});
test('lista del equipo: personal interno sí; SC, lector y capataz solo su propio registro', async () => {
  await assertSucceeds(getDocs(collection(user('editor@obra.pe'), 'members')));
  await assertSucceeds(getDocs(collection(user('campo@obra.pe'), 'members')));
  await assertFails(getDocs(collection(user('sc@obra.pe'), 'members')));
  await assertFails(getDocs(collection(user('lector@obra.pe'), 'members')));
  await assertFails(getDocs(collection(cap('cap1'), 'members')));
  await assertSucceeds(getDoc(doc(user('sc@obra.pe'), 'members/sc@obra.pe')));
  await assertFails(getDoc(doc(user('sc@obra.pe'), 'members/editor@obra.pe')));
  await assertSucceeds(getDoc(doc(cap('cap1'), 'members/u_cap1')));
});
test('solo el administrador cambia roles', async () => {
  await assertSucceeds(setDoc(doc(user(OWNER), 'members/nuevo@obra.pe'), { role: 'editor' }));
  await assertFails(setDoc(doc(user('editor@obra.pe'), 'members/nuevo2@obra.pe'), { role: 'admin' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'members/sc@obra.pe'), { role: 'admin' }));
});
test('capataz: se registra solo con enlace vigente y para la partida del enlace', async () => {
  await assertSucceeds(setDoc(doc(cap('cap2'), 'members/u_cap2'), { role: 'capataz', name: 'Ana', scs: ['c-gabel'], sc: 'c-gabel', inv: 'abc', added: 1 }));
  await assertFails(setDoc(doc(cap('cap3'), 'members/u_cap3'), { role: 'capataz', name: 'Ana', scs: ['c-gabel'], sc: 'c-gabel', inv: 'old', added: 1 }));
  await assertFails(setDoc(doc(cap('cap4'), 'members/u_cap4'), { role: 'capataz', name: 'Ana', scs: ['c-otro'], sc: 'c-otro', inv: 'abc', added: 1 }));
  await assertFails(setDoc(doc(cap('cap5'), 'members/u_cap5'), { role: 'editor', name: 'Ana', scs: ['c-gabel'], sc: 'c-gabel', inv: 'abc', added: 1 }));
  await assertSucceeds(updateDoc(doc(cap('cap1'), 'members/u_cap1'), { name: 'Juan P.' }));
  await assertFails(updateDoc(doc(cap('cap1'), 'members/u_cap1'), { scs: ['c-otro'] }));
});
test('capataz: reporta en vivo solo su partida y no toca el lookahead ni el registro', async () => {
  await assertSucceeds(updateDoc(doc(cap('cap1'), 'live/2026-10-01_x1'), { st: 'run', sc: 'c-gabel' }));
  await assertFails(updateDoc(doc(cap('cap1'), 'live/2026-10-01_x9'), { st: 'run' }));
  await assertFails(setDoc(doc(cap('cap1'), 'live/2026-10-01_x3'), { sc: 'c-otro', st: 'run' }));
  await assertFails(updateDoc(doc(cap('cap1'), 'acts/x1'), { name: 'x' }));
  await assertFails(setDoc(doc(cap('cap1'), 'daily/2026-10-01_p1'), { recs: {} }));
  await assertSucceeds(setDoc(doc(user('campo@obra.pe'), 'daily/2026-10-01_p1'), { recs: {} }));
});
test('subcontratista: inicia y detiene sus actividades y propone el cierre del día (no escribe el registro)', async () => {
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { st: 'run', sc: 'c-gabel' }));
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { st: 'stop', mot: 'Falta material', sc: 'c-gabel' }));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x4'), { date: '2026-10-01', actId: 'x4', sc: 'c-gabel', st: 'run' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x9'), { st: 'run' }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x5'), { sc: 'c-otro', st: 'run' }));
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { close: { status: 'ok', done: true } }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x6'), { sc: 'c-gabel', close: { status: 'ok' } })); // sin actividad real
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'daily/2026-10-01_p1'), { recs: {} }));
  await assertFails(deleteDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1')));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'fotos/fsc'), { data: 'x'.repeat(1000), by: 'sc@obra.pe' }));
  await assertFails(setDoc(doc(user('lector@obra.pe'), 'live/2026-10-01_x7'), { sc: 'c-gabel', st: 'run' }));
});
test('veedor: en vivo solo marca o quita «en secuencia»', async () => {
  const v = user('veedor@obra.pe');
  await assertSucceeds(updateDoc(doc(v, 'live/2026-10-01_x1'), { seq: { on: true, after: 'x4' } }));
  await assertSucceeds(setDoc(doc(v, 'live/2026-10-01_x4'), { date: '2026-10-01', actId: 'x4', sc: 'c-gabel', seq: { on: true, after: '' } }));
  await assertFails(updateDoc(doc(v, 'live/2026-10-01_x1'), { st: 'run' }));
  await assertFails(updateDoc(doc(v, 'live/2026-10-01_x1'), { close: { status: 'ok' } }));
  await assertFails(setDoc(doc(v, 'live/2026-10-01_x5'), { date: '2026-10-01', actId: 'x5', sc: 'c-gabel', st: 'run' }));
  await assertFails(updateDoc(doc(v, 'live/2026-10-01_x9'), { sc: 'c-gabel', seq: { on: true } })); // no cambia la partida
  await assertFails(deleteDoc(doc(v, 'live/2026-10-01_x1')));
  await assertFails(updateDoc(doc(user('lector@obra.pe'), 'live/2026-10-01_x1'), { seq: { on: true } }));
});
test('restricciones: el SC registra las de su partida y edita solo las suyas pendientes', async () => {
  const sc = user('sc@obra.pe');
  const base = { actId: 'x1', sc: 'c-gabel', by: 'sc@obra.pe', status: 'pend', freed: '', desc: 'Falta andamio' };
  await assertSucceeds(setDoc(doc(sc, 'restr/n1'), base));
  await assertFails(setDoc(doc(sc, 'restr/n2'), { ...base, actId: 'x9', sc: 'c-otro' }));
  await assertFails(setDoc(doc(sc, 'restr/n3'), { ...base, sc: 'c-otro' }));
  await assertFails(setDoc(doc(sc, 'restr/n4'), { ...base, actId: 'x9' }));
  await assertFails(setDoc(doc(sc, 'restr/n5'), { ...base, by: 'otro@obra.pe' }));
  await assertFails(setDoc(doc(sc, 'restr/n6'), { ...base, status: 'lib' }));
  await assertFails(setDoc(doc(sc, 'restr/n7'), { ...base, actId: '' }));
  await assertSucceeds(updateDoc(doc(sc, 'restr/r-sc'), { desc: 'Falta andamio en fachada' }));
  await assertFails(updateDoc(doc(sc, 'restr/r-sc'), { status: 'lib' }));
  await assertFails(updateDoc(doc(sc, 'restr/r-ed'), { desc: 'x' }));
  await assertFails(deleteDoc(doc(sc, 'restr/r-ed')));
  await assertSucceeds(deleteDoc(doc(sc, 'restr/r-sc')));
  await assertFails(setDoc(doc(user('lector@obra.pe'), 'restr/n8'), { ...base, by: 'lector@obra.pe' }));
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'restr/r-ed'), { status: 'lib', freed: '2026-10-01' }));
});
test('áreas de apoyo (OT, Calidad): ven todo y gestionan solo las restricciones de su área', async () => {
  const ot = user('ot@obra.pe');
  await assertSucceeds(getDoc(doc(ot, 'acts/x1')));
  await assertSucceeds(getDoc(doc(ot, 'live/2026-10-01_x1')));
  await assertFails(updateDoc(doc(ot, 'acts/x1'), { name: 'x' }));
  await assertFails(setDoc(doc(ot, 'daily/2026-10-01_p1'), { recs: {} }));
  await assertFails(getDocs(collection(ot, 'members')));
  await assertSucceeds(updateDoc(doc(ot, 'restr/r-ot'), { status: 'lib', freed: '2026-10-01', desc: 'Plano entregado' }));
  await assertFails(updateDoc(doc(ot, 'restr/r-cal'), { status: 'lib' }));
  await assertFails(updateDoc(doc(ot, 'restr/r-campo'), { status: 'lib' }));
  await assertFails(updateDoc(doc(ot, 'restr/r-ot'), { area: 'Calidad' }));
  await assertSucceeds(setDoc(doc(ot, 'restr/n-ot'), { actId: 'x1', grp: 'area', area: 'OT', status: 'pend', desc: 'RFI pendiente' }));
  await assertFails(setDoc(doc(ot, 'restr/n-ot2'), { actId: 'x1', grp: 'area', area: 'Calidad', status: 'pend' }));
  await assertFails(deleteDoc(doc(ot, 'restr/r-ot')));
  await assertSucceeds(updateDoc(doc(user('calidad@obra.pe'), 'restr/r-cal'), { status: 'lib', freed: '2026-10-01' }));
  await assertSucceeds(setDoc(doc(ot, 'fotos/f-ot'), { data: 'x'.repeat(1000), by: 'ot@obra.pe' }));
});
test('liberaciones: el SC pide y levanta; Calidad programa y libera', async () => {
  const sc = user('sc@obra.pe'), cal = user('calidad@obra.pe'), ot = user('ot@obra.pe');
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'lib/l-sol')));
  await assertSucceeds(setDoc(doc(sc, 'lib/n1'), { actId: 'x1', sc: 'c-gabel', st: 'sol', by: 'sc@obra.pe' }));
  await assertFails(setDoc(doc(sc, 'lib/n2'), { actId: 'x9', sc: 'c-otro', st: 'sol', by: 'sc@obra.pe' }));
  await assertFails(setDoc(doc(sc, 'lib/n3'), { actId: 'x1', sc: 'c-gabel', st: 'lib', by: 'sc@obra.pe' }));
  await assertSucceeds(updateDoc(doc(sc, 'lib/l-obs'), { st: 'lev' }));
  await assertFails(updateDoc(doc(sc, 'lib/l-sol'), { st: 'lib' }));
  await assertFails(updateDoc(doc(sc, 'lib/l-lib'), { st: 'lev' }));
  await assertFails(updateDoc(doc(sc, 'lib/l-otro'), { st: 'anu' }));
  await assertSucceeds(updateDoc(doc(cal, 'lib/l-sol'), { st: 'pro', prog: { d: '2026-10-02', h: '09:00' } }));
  await assertSucceeds(updateDoc(doc(cal, 'lib/l-otro'), { st: 'lib' }));
  await assertSucceeds(setDoc(doc(cal, 'lib/n4'), { actId: 'x9', sc: 'c-otro', st: 'sol', by: 'calidad@obra.pe' }));
  await assertFails(updateDoc(doc(ot, 'lib/l-sol'), { st: 'lib' }));
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'lib/l-sol'), { st: 'pro' }));
  await assertFails(updateDoc(doc(user('campo@obra.pe'), 'lib/l-sol'), { st: 'lib' }));
  await assertFails(deleteDoc(doc(cal, 'lib/l-sol')));
});
test('inspectores de liberaciones (libm): los editan Calidad y el administrador', async () => {
  await assertSucceeds(setDoc(doc(user('calidad@obra.pe'), 'libm/main'), { rules: [] }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'libm/main'), { rules: [{ id: 'r1' }] }));
  await assertSucceeds(getDoc(doc(user('sc@obra.pe'), 'libm/main')));
  await assertFails(setDoc(doc(user('editor@obra.pe'), 'libm/main'), { rules: [] }));
  await assertFails(setDoc(doc(user('ot@obra.pe'), 'libm/main'), { rules: [] }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'libm/main'), { rules: [] }));
});
test('versión cliente: solo el administrador y quienes él designe', async () => {
  await assertSucceeds(setDoc(doc(user(OWNER), 'cli/buf'), { all: 1 }));
  // designados por el administrador (members.cli): leen y cambian
  for (const who of ['editor2@obra.pe', 'campo2@obra.pe']) {
    await assertSucceeds(setDoc(doc(user(who), 'cli/buf'), { all: 2, p: { p1: 1 } }));
    await assertSucceeds(getDoc(doc(user(who), 'cli/buf')));
  }
  // sin designar (aunque sea editor), y el SC aunque tenga la marca: nada
  for (const who of ['editor@obra.pe', 'sc@obra.pe', 'sc2@obra.pe', 'campo@obra.pe', 'lector@obra.pe', 'calidad@obra.pe', 'ot@obra.pe']) {
    await assertFails(getDoc(doc(user(who), 'cli/buf')));
    await assertFails(setDoc(doc(user(who), 'cli/buf'), { all: 0 }));
    await assertFails(getDoc(doc(user(who), 'clidx/c1')));
    await assertFails(getDoc(doc(user(who), 'cliver/c1__p1')));
  }
  await assertFails(getDoc(doc(cap('cap1'), 'cli/buf')));
  // nadie se da acceso a sí mismo
  await assertFails(updateDoc(doc(user('editor@obra.pe'), 'members/editor@obra.pe'), { cli: true }));
  await assertSucceeds(setDoc(doc(user('editor2@obra.pe'), 'clidx/c1'), { label: 'Emitida sem 58', week: 58 }));
  await assertSucceeds(setDoc(doc(user('editor2@obra.pe'), 'cliver/c1__p1'), { verId: 'c1', json: '{}' }));
  await assertFails(deleteDoc(doc(user('editor2@obra.pe'), 'clidx/c1')));
  await assertSucceeds(deleteDoc(doc(user(OWNER), 'clidx/c1')));
});
test('trabajo no programado: lo registran campo, Calidad y veedores; cada uno corrige lo suyo', async () => {
  const np = (by, o = {}) => ({ date: '2026-10-01', pisoId: 'p1', ambId: 'a1', sc: 'c-gabel', desc: 'Tarrajeo', by, ...o });
  for (const who of ['veedor@obra.pe', 'calidad@obra.pe', 'campo@obra.pe', 'editor@obra.pe']) {
    await assertSucceeds(setDoc(doc(user(who), 'nprog/n-' + who), np(who)));
  }
  await assertSucceeds(setDoc(doc(user(OWNER), 'nprog/n-own'), np(OWNER)));
  // no se registra a nombre de otro, ni lo hacen SC, capataz, OT o lector
  await assertFails(setDoc(doc(user('veedor@obra.pe'), 'nprog/n-x'), np('campo@obra.pe')));
  for (const who of ['sc@obra.pe', 'ot@obra.pe', 'lector@obra.pe']) await assertFails(setDoc(doc(user(who), 'nprog/n-y'), np(who)));
  await assertFails(setDoc(doc(cap('cap1'), 'nprog/n-z'), np('u_cap1')));
  // el veedor corrige lo suyo, no lo de otro; campo corrige todo
  await assertSucceeds(updateDoc(doc(user('veedor@obra.pe'), 'nprog/n-veedor@obra.pe'), { desc: 'Tarrajeo de muros' }));
  await assertFails(updateDoc(doc(user('veedor@obra.pe'), 'nprog/n-calidad@obra.pe'), { desc: 'x' }));
  await assertSucceeds(updateDoc(doc(user('campo@obra.pe'), 'nprog/n-veedor@obra.pe'), { del: true }));
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'nprog/n-veedor@obra.pe')));
  await assertFails(deleteDoc(doc(user('campo@obra.pe'), 'nprog/n-veedor@obra.pe')));
  // el veedor sube fotos pero no escribe el registro diario
  await assertSucceeds(setDoc(doc(user('veedor@obra.pe'), 'fotos/f-v'), { data: 'abc', date: '2026-10-01', by: 'veedor@obra.pe' }));
  await assertFails(setDoc(doc(user('veedor@obra.pe'), 'daily/2026-10-01_p1'), { date: '2026-10-01', pisoId: 'p1', recs: {} }));
});
test('no programado: el SC registra lo de su partida, por verificar; no se verifica solo', async () => {
  const sc = user('sc@obra.pe');
  const base = { date: '2026-10-01', pisoId: 'p1', sc: 'c-gabel', desc: 'Resane', by: 'sc@obra.pe', scProp: true };
  await assertSucceeds(setDoc(doc(sc, 'nprog/n-sc1'), base));
  await assertFails(setDoc(doc(sc, 'nprog/n-sc2'), { ...base, sc: 'c-otro' })); // otra partida
  await assertFails(setDoc(doc(sc, 'nprog/n-sc3'), { ...base, scProp: false })); // tiene que quedar por verificar
  await assertFails(setDoc(doc(sc, 'nprog/n-sc1'), { ...base, ver: { by: 'sc@obra.pe' } })); // no se verifica solo
  await assertSucceeds(setDoc(doc(user('campo@obra.pe'), 'nprog/n-sc1'), { ...base, ver: { by: 'campo@obra.pe' } }));
});
test('propuestas: el SC solo escribe la de su partida', async () => {
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'lhprop/c-gabel'), { sc: 'c-gabel', items: {} }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'lhprop/c-otro'), { sc: 'c-otro', items: {} }));
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'lhprop/c-otro'), { sc: 'c-otro', items: {} }));
});
test('propuestas: pasado el corte el SC queda en solo lectura hasta que el ingeniero habilite', async () => {
  const sc = user('sc@obra.pe');
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'meta/propwin'), { closeAt: Date.now() - 60_000 }); });
  await assertFails(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: {} }));
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'lhprop/c-gabel'), { sc: 'c-gabel', items: {} })); // el ingeniero sí revisa
  await assertFails(setDoc(doc(sc, 'meta/propwin'), { closeAt: Date.now() + 864e5 })); // el SC no se habilita solo
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'meta/propwin'), { closeAt: Date.now() + 864e5 }));
  await assertSucceeds(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x9: { sent: false } } }, { merge: true }));
  // bloquear a mano antes del corte: el ingeniero pone closeAt = ahora y el SC queda en solo lectura
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'meta/propwin'), { closeAt: Date.now() - 1000, man: true }));
  await assertFails(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x7: { sent: false } } }, { merge: true }));
  await env.withSecurityRulesDisabled(async c => { await deleteDoc(doc(c.firestore(), 'meta/propwin')); });
  await assertFails(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x8: { sent: false } } }, { merge: true })); // nunca habilitada: cerrada
});
test('propuestas: el SC no altera las respuestas del ingeniero (hist)', async () => {
  const h = { id: 'x1', st: 'rej', by: 'editor@obra.pe', n: 'Elena', t: 1 };
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x1: null }, hist: { k1: h } }); });
  const sc = user('sc@obra.pe');
  await assertSucceeds(updateDoc(doc(sc, 'lhprop/c-gabel'), { 'items.x1': { after: { days: ['2026-10-05'] }, sent: false } })); // su borrador sí
  await assertSucceeds(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: { x2: { sent: true } } }, { merge: true })); // y enviarlo
  await assertFails(updateDoc(doc(sc, 'lhprop/c-gabel'), { 'hist.k1.st': 'ok' }));
  await assertFails(updateDoc(doc(sc, 'lhprop/c-gabel'), { 'hist.k2': { ...h, st: 'ok' } }));
  await assertFails(setDoc(doc(sc, 'lhprop/c-gabel'), { sc: 'c-gabel', items: {} })); // reemplazar el documento borra hist
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'lhprop/c-gabel'), { 'items.x1': null, 'hist.k3': { ...h, st: 'ok' } }));
});
test('propuestas: historial de decisiones (lhphist) solo lo escribe quien decide y no se borra', async () => {
  const h = { sc: 'c-gabel', actId: 'x1', st: 'ok', by: 'editor@obra.pe', n: 'Elena', t: 1, sk: 'c-gabel|000000000000001', late: { w: 59, cut: 0 }, lateNote: 'Acordado en la reunión' };
  const ed = user('editor@obra.pe'), sc = user('sc@obra.pe');
  await assertFails(setDoc(doc(sc, 'lhphist/c-gabel_x1_1'), h)); // el SC no se aprueba a sí mismo
  await assertSucceeds(setDoc(doc(ed, 'lhphist/c-gabel_x1_1'), h));
  await assertSucceeds(getDoc(doc(sc, 'lhphist/c-gabel_x1_1')));
  await assertSucceeds(updateDoc(doc(ed, 'lhphist/c-gabel_x1_1'), { undone: { t: 2, by: 'editor@obra.pe', n: 'Elena' } })); // deshacer lo marca
  await assertFails(updateDoc(doc(ed, 'lhphist/c-gabel_x1_1'), { lateNote: 'otro motivo' })); // lo registrado no se reescribe
  await assertFails(updateDoc(doc(sc, 'lhphist/c-gabel_x1_1'), { undone: null }));
  await assertFails(deleteDoc(doc(ed, 'lhphist/c-gabel_x1_1')));
});
test('plan del día cerrado (dplan): publica el editor; reabrir es solo del administrador', async () => {
  const ed = user('editor@obra.pe'), sc = user('sc@obra.pe');
  await assertSucceeds(setDoc(doc(ed, 'dplan/2026-10-02_p1'), { date: '2026-10-02', pisoId: 'p1', ids: { x1: null }, reo: null }));
  await assertSucceeds(getDoc(doc(sc, 'dplan/2026-10-02_p1')));
  await assertFails(setDoc(doc(sc, 'dplan/2026-10-03_p1'), { date: '2026-10-03', pisoId: 'p1', ids: {} }));
  await assertFails(updateDoc(doc(ed, 'dplan/2026-10-02_p1'), { reo: { by: 'editor@obra.pe', why: 'quiero cambiarlo' } }));
  await assertSucceeds(updateDoc(doc(user(OWNER), 'dplan/2026-10-02_p1'), { reo: { by: OWNER, why: 'corrección' } }));
  await assertSucceeds(updateDoc(doc(ed, 'dplan/2026-10-02_p1'), { reo: null, ids: { x1: 3 } })); // al volver a publicar queda cerrado
  await assertFails(setDoc(doc(ed, 'dplan/2026-10-04_p1'), { date: '2026-10-04', pisoId: 'p1', reo: { why: 'x' } }));
  await assertFails(deleteDoc(doc(sc, 'dplan/2026-10-02_p1')));
  await assertFails(deleteDoc(doc(ed, 'dplan/2026-10-02_p1'))); // día ya pasado: solo el administrador
  await assertSucceeds(deleteDoc(doc(user(OWNER), 'dplan/2026-10-02_p1')));
  const fut = new Date(Date.now() + 3 * 864e5 - 5 * 36e5).toISOString().slice(0, 10);
  await assertSucceeds(setDoc(doc(ed, `dplan/${fut}_p1`), { date: fut, pisoId: 'p1', ids: { x1: 2 }, reo: null }));
  await assertSucceeds(deleteDoc(doc(ed, `dplan/${fut}_p1`))); // deshacer la publicación de un día futuro
});
test('historial del lookahead (lhlog): lo escribe quien edita, con su correo; no se cambia ni se borra', async () => {
  const ed = user('editor@obra.pe');
  await assertSucceeds(setDoc(doc(ed, 'lhlog/1_a'), { t: 1, by: 'editor@obra.pe', items: [] }));
  await assertFails(setDoc(doc(ed, 'lhlog/1_b'), { t: 1, by: 'otro@obra.pe', items: [] }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'lhlog/1_c'), { t: 1, by: 'sc@obra.pe', items: [] }));
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'lhlog/1_a')));
  await assertFails(updateDoc(doc(ed, 'lhlog/1_a'), { label: 'x' }));
  await assertFails(deleteDoc(doc(user(OWNER), 'lhlog/1_a')));
});
test('congelado automático (frz): todos lo leen y nadie lo escribe desde la app', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'frz/60'), { n: 60, k: 2 }));
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'frz/60')));
  await assertFails(setDoc(doc(user(OWNER), 'frz/61'), { n: 61 }));
  await assertFails(setDoc(doc(user('editor@obra.pe'), 'frz/60'), { n: 60, k: 0 }));
  await assertFails(deleteDoc(doc(user(OWNER), 'frz/60')));
});
test('foto del lookahead al congelar (wsnap): la lee LPS; la escriben solo admin y editores (como weeks)', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'wsnap/60_p1'), { snap: { x1: ['2026-10-05'] }, n: 60, pisoId: 'p1' }));
  for (const m of ['lector@obra.pe', 'campo@obra.pe', 'sc@obra.pe', 'ot@obra.pe', 'veedor@obra.pe']) await assertSucceeds(getDoc(doc(user(m), 'wsnap/60_p1')));
  await assertSucceeds(getDoc(doc(cap('cap1'), 'wsnap/60_p1')));
  await assertFails(getDoc(doc(user('nadie@x.pe'), 'wsnap/60_p1')));
  await assertFails(getDoc(doc(user('tasis@obra.pe'), 'wsnap/60_p1')));
  // congelar desde la página: weeks + wsnap en la misma transacción (editor/admin)
  for (const m of ['editor@obra.pe', OWNER]) {
    const db = user(m); const b = writeBatch(db);
    b.set(doc(db, 'weeks/61_p1'), { n: 61, pisoId: 'p1', frozenAt: 'x', items: {}, res: {} });
    b.set(doc(db, 'wsnap/61_p1'), { snap: {}, n: 61, pisoId: 'p1', t: 'x' });
    await assertSucceeds(b.commit());
  }
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'wsnap/60_p1__h1'), { snap: {}, n: 60, pisoId: 'p1', histOf: '60_p1' }));
  for (const m of ['lector@obra.pe', 'campo@obra.pe', 'sc@obra.pe', 'ot@obra.pe', 'veedor@obra.pe']) {
    await assertFails(setDoc(doc(user(m), 'wsnap/60_p1'), { snap: {} }));
    await assertFails(deleteDoc(doc(user(m), 'wsnap/60_p1')));
  }
  await assertFails(setDoc(doc(cap('cap1'), 'wsnap/60_p1'), { snap: {} }));
});
test('última zona (pzon): el SC solo la de sus actividades', async () => {
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'pzon/x1'), { sc: 'c-gabel', pts: [1] }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'pzon/x2'), { sc: 'c-gabel', pts: [1] }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'pzon/x5'), { sc: 'c-otro', pts: [1] }));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'pzon/x6'), { sc: 'c-gabel', pts: [1] }));
});
test('agregar al plan (padd): el SC solo propone, de su partida', async () => {
  const sc = user('sc@obra.pe');
  const B = { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'padd', draft: true, by: 'sc@obra.pe' };
  await assertSucceeds(setDoc(doc(sc, 'pdz/pa1'), { ...B, t: 'new', name: 'Resane', st: 'pend' }));
  await assertSucceeds(setDoc(doc(sc, 'pdz/pa2'), { ...B, t: 'rep', actId: 'x1', st: 'pend' }));
  await assertFails(setDoc(doc(sc, 'pdz/pa3'), { ...B, t: 'new', name: 'Resane', st: 'ok' })); // no se acepta solo
  await assertFails(setDoc(doc(sc, 'pdz/pa4'), { ...B, sc: 'c-otro', t: 'new', st: 'pend' }));
  await assertFails(updateDoc(doc(sc, 'pdz/pa1'), { st: 'ok' }));
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'pdz/pa1'), { st: 'ok', decBy: 'editor@obra.pe' }));
});
test('plan del día: el SC dibuja y propone, pero no toca las decisiones del ingeniero', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'pdz/nv1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'nova', actId: 'x1', k: 'per', repTo: '2026-10-03', draft: true, ids: ['x1'], shift: 1 });
    await setDoc(doc(db, 'pdz/xk1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'xok', keys: ['a:x1', 'a:x9'] });
    await setDoc(doc(db, 'pdz/dp1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x1', k: 'per', st: 'rej' });
  });
  const sc = user('sc@obra.pe');
  await assertSucceeds(setDoc(doc(sc, 'pdz/z1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'zona', actId: 'x1', pts: [] }));
  await assertSucceeds(setDoc(doc(sc, 'pdz/dp_2026-10-02_x1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x1', k: 'res', desc: 'falta', st: 'pend' }));
  await assertFails(setDoc(doc(sc, 'pdz/dp3'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x1', k: 'res', st: 'ok' }));
  await assertSucceeds(deleteDoc(doc(sc, 'pdz/dp1'))); // vuelve a proponer después de un rechazo
  await assertFails(setDoc(doc(sc, 'pdz/z2'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-otro', kind: 'zona', pts: [] }));
  await assertFails(deleteDoc(doc(sc, 'pdz/nv1')));
  await assertFails(updateDoc(doc(sc, 'pdz/nv1'), { shift: 9 }));
  await assertFails(setDoc(doc(sc, 'pdz/nv2'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'nova', actId: 'x1', k: 'per', ids: ['x9'] }));
  await assertFails(deleteDoc(doc(sc, 'pdz/xk1')));
  await assertFails(setDoc(doc(sc, 'pdz/pub_2026-10-02_p1'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'pub' }));
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'pdz/nvh'), { date: '2026-10-01', pisoId: 'p1', sc: 'c-gabel', kind: 'nova', actId: 'x1', motivo: 'Clima', eng: true }); });
  await assertFails(deleteDoc(doc(sc, 'pdz/nvh'))); // «no va hoy» que decidió el ingeniero
  await assertSucceeds(setDoc(doc(sc, 'pdz/nvs'), { date: '2026-10-01', pisoId: 'p1', sc: 'c-gabel', kind: 'nova', actId: 'x1', motivo: 'Clima' }));
  await assertSucceeds(deleteDoc(doc(sc, 'pdz/nvs'))); // el suyo sí
  await assertSucceeds(deleteDoc(doc(user('editor@obra.pe'), 'pdz/nv1')));
});
test('reloj e índice de terminadas', async () => {
  await assertSucceeds(setDoc(doc(cap('cap1'), 'clock/cap1'), { t: 1 }));
  await assertFails(setDoc(doc(cap('cap1'), 'clock/otro'), { t: 1 }));
  await assertSucceeds(setDoc(doc(user('campo@obra.pe'), 'doneidx/p1'), { d: { x1: '2026-10-01' } }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'doneidx/p1'), { d: {} }));
});
test('invitaciones: se lee una por su código; solo el admin lista o crea', async () => {
  await assertSucceeds(getDoc(doc(cap('cap9'), 'inv/abc')));
  await assertFails(getDocs(collection(cap('cap9'), 'inv')));
  await assertFails(setDoc(doc(user('editor@obra.pe'), 'inv/zz'), { active: true }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'inv/zz'), { active: true }));
});
test('fotos: límite de tamaño', async () => {
  await assertSucceeds(setDoc(doc(cap('cap1'), 'fotos/f1'), { data: 'x'.repeat(1000), by: 'u_cap1' }));
  await assertFails(setDoc(doc(cap('cap1'), 'fotos/f2'), { data: 'x'.repeat(400001), by: 'u_cap1' }));
  await assertFails(deleteDoc(doc(cap('cap1'), 'fotos/f1')));
});

// ── Auditoría 02e575c ──
test('auditoría N01: el SC o capataz no cierra ni reporta una actividad de otra partida declarando la suya', async () => {
  const c = cap('cap1');
  // la actividad xe es de Eléctricas: el documento dice c-gabel, pero la actividad no
  await assertFails(setDoc(doc(c, 'live/2026-10-01_xe'), { date: '2026-10-01', actId: 'xe', pisoId: 'p2', sc: 'c-gabel', close: { status: 'ok', done: true } }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_xe'), { date: '2026-10-01', actId: 'xe', pisoId: 'p2', sc: 'c-gabel', st: 'run' }));
  // id que no corresponde a la actividad declarada
  await assertFails(setDoc(doc(c, 'live/2026-10-01_xe'), { date: '2026-10-01', actId: 'x1', sc: 'c-gabel', st: 'run' }));
  // actividad que no existe
  await assertFails(setDoc(doc(c, 'live/2026-10-01_zz'), { date: '2026-10-01', actId: 'zz', sc: 'c-gabel', st: 'run' }));
  // la suya sí
  await assertSucceeds(setDoc(doc(c, 'live/2026-10-02_x1'), { date: '2026-10-02', actId: 'x1', sc: 'c-gabel', close: { status: 'ok' } }));
});
test('auditoría N01: el piso del reporte debe ser el de la actividad (si su sector lo indica)', async () => {
  await env.withSecurityRulesDisabled(async x => { await setDoc(doc(x.firestore(), 'acts/xg'), { name: 'Pintura 2', sc: 'c-gabel', ambId: 'a2' }); });
  await assertFails(setDoc(doc(cap('cap1'), 'live/2026-10-01_xg'), { date: '2026-10-01', actId: 'xg', pisoId: 'p1', sc: 'c-gabel', st: 'run' }));
  await assertSucceeds(setDoc(doc(cap('cap1'), 'live/2026-10-01_xg'), { date: '2026-10-01', actId: 'xg', pisoId: 'p2', sc: 'c-gabel', st: 'run' }));
});
test('auditoría N02: una foto guardada no la reemplaza otro usuario; queda a nombre de quien la sube', async () => {
  await env.withSecurityRulesDisabled(async x => { await setDoc(doc(x.firestore(), 'fotos/fe'), { data: 'original', by: 'campo@obra.pe' }); });
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'fotos/fe'), { data: 'otra', by: 'sc@obra.pe' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'fotos/fe'), { data: 'otra' }));
  await assertFails(updateDoc(doc(user('campo@obra.pe'), 'fotos/fe'), { data: 'otra' }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'fotos/fn'), { data: 'x', by: 'campo@obra.pe' })); // a nombre de otro
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'fotos/fn2'), { data: 'x' })); // sin autor
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'fotos/fn3'), { data: 'x', by: 'sc@obra.pe' }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'fotos/fr'), { data: 'x', by: 'campo@obra.pe' })); // cargar un respaldo
});
test('auditoría N03: con el plan cerrado el editor no cambia lo comprometido ni el registro', async () => {
  const ed = user('editor@obra.pe');
  await env.withSecurityRulesDisabled(async x => { await setDoc(doc(x.firestore(), 'dplan/2026-10-01_p1'), { date: '2026-10-01', pisoId: 'p1', ids: { x1: 10 }, reo: null, log: [] }); });
  await assertFails(updateDoc(doc(ed, 'dplan/2026-10-01_p1'), { ids: { x1: 1 } }));
  await assertFails(updateDoc(doc(ed, 'dplan/2026-10-01_p1'), { log: [] , ids: { x1: 1 }, at: 1 }));
  await assertFails(setDoc(doc(ed, 'dplan/2026-10-01_p1'), { date: '2026-10-01', pisoId: 'p1', ids: {}, reo: null }));
  await assertFails(deleteDoc(doc(ed, 'dplan/2026-10-01_p1')));
  await assertSucceeds(updateDoc(doc(ed, 'dplan/2026-10-01_p1'), { at: 5 })); // republicar igual (mismos ids) no falla
  // el administrador reabre con motivo; recién ahí el editor vuelve a publicar
  await assertSucceeds(updateDoc(doc(user(OWNER), 'dplan/2026-10-01_p1'), { reo: { by: OWNER, why: 'corrección' } }));
  await assertSucceeds(updateDoc(doc(ed, 'dplan/2026-10-01_p1'), { ids: { x1: 8 }, reo: null }));
});

// ── Liberaciones sin matriz ──
test('liberaciones: el SC pide (también fuera del lookahead) pero no marca crítica ni supervisión; Calidad sí', async () => {
  const sc = user('sc@obra.pe'), cal = user('calidad@obra.pe');
  const base = { actId: '', ambId: 'a1', pisoId: 'p1', sc: 'c-gabel', nm: 'Prueba hidráulica de montantes', st: 'sol', by: 'sc@obra.pe', crit: false, sup: false, rest: '' };
  await assertSucceeds(setDoc(doc(sc, 'lib/l-free'), base));
  await assertFails(setDoc(doc(sc, 'lib/l-crit'), { ...base, crit: true }));
  await assertFails(setDoc(doc(sc, 'lib/l-sup'), { ...base, sup: true }));
  await assertFails(updateDoc(doc(sc, 'lib/l-free'), { crit: true }));
  await assertFails(updateDoc(doc(sc, 'lib/l-sol'), { sup: true, rest: 'Tarrajeo' }));
  await assertSucceeds(updateDoc(doc(sc, 'lib/l-free'), { note: 'lista desde las 8' }));
  await assertSucceeds(updateDoc(doc(cal, 'lib/l-free'), { st: 'pro', crit: true, rest: 'Tarrajeo', sup: true }));
});
test('plan maestro: solo el administrador y el planner lo leen y editan', async () => {
  const pl = user('planner@obra.pe');
  await assertSucceeds(getDoc(doc(pl, 'mp/n1')));
  await assertSucceeds(setDoc(doc(pl, 'mp/n2'), { tipo: 'pp', name: 'Tabiquería', pisoId: 'p1', parent: 'n1' }));
  await assertSucceeds(setDoc(doc(pl, 'mpav/2026-10-31'), { pct: { n2: 10 } }));
  await assertSucceeds(setDoc(doc(pl, 'mpl/x1'), { mp: 'n2' }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'mp/n3'), { tipo: 'hito', name: 'Fin de obra' }));
  for (const em of ['editor@obra.pe', 'sc@obra.pe', 'lector@obra.pe', 'campo@obra.pe', 'ot@obra.pe', 'veedor@obra.pe']) {
    await assertFails(getDoc(doc(user(em), 'mp/n1')));
    await assertFails(getDocs(collection(user(em), 'mp')));
    await assertFails(setDoc(doc(user(em), 'mp/n9'), { name: 'x' }));
    await assertFails(getDoc(doc(user(em), 'mpver/1')));
    await assertFails(setDoc(doc(user(em), 'mpl/x1'), { mp: 'n1' }));
  }
  await assertFails(getDoc(doc(cap('cap1'), 'mp/n1')));
});
test('plan maestro: el planner no toca el lookahead ni nada fuera del maestro', async () => {
  const pl = user('planner@obra.pe');
  await assertSucceeds(getDoc(doc(pl, 'acts/x1')));
  await assertFails(updateDoc(doc(pl, 'acts/x1'), { name: 'otro' }));
  await assertFails(setDoc(doc(pl, 'restr/r9'), { actId: 'x1', status: 'pend' }));
  await assertFails(setDoc(doc(pl, 'daily/2026-10-01_p1'), { recs: {} }));
  await assertFails(setDoc(doc(pl, 'members/otro@obra.pe'), { role: 'admin' }));
  await assertFails(getDocs(collection(pl, 'members')));
});
test('plan maestro: el planner envía versiones a aprobación; solo el administrador aprueba', async () => {
  const pl = user('planner@obra.pe');
  await assertSucceeds(setDoc(doc(pl, 'mpver/2'), { n: 2, st: 'pend', items: {} }));
  await assertFails(setDoc(doc(pl, 'mpver/3'), { n: 3, st: 'ok', items: {} }));
  await assertFails(updateDoc(doc(pl, 'mpver/1'), { st: 'ok' }));
  await assertSucceeds(updateDoc(doc(user(OWNER), 'mpver/1'), { st: 'ok' }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'mpver/4'), { n: 4, st: 'ok', items: {} }));
  await assertFails(deleteDoc(doc(user(OWNER), 'mpver/4')));
});

// ── Ciclo diario (correcciones de la auditoría) ──
test('ciclo diario: la propuesta del SC tiene id fijo, es de su partida y no toca la decisión', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'pdz/dp_2026-10-05_x4'), { date: '2026-10-05', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x4', k: 'per', st: 'ok', dec: 'Reprogramada', decBy: 'editor@obra.pe' });
    await setDoc(doc(db, 'pdz/dp_2026-10-06_x4'), { date: '2026-10-06', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x4', k: 'per', st: 'rej', dec: '', decBy: 'editor@obra.pe' });
    await setDoc(doc(db, 'pdz/dp_2026-10-07_x4'), { date: '2026-10-07', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x4', k: 'per', st: 'pend' });
  });
  const sc = user('sc@obra.pe');
  const P = (date, actId, x) => ({ date, pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId, k: 'per', desc: '', st: 'pend', ...x });
  await assertFails(setDoc(doc(sc, 'pdz/cualquiera'), P('2026-10-08', 'x1'))); // id libre
  await assertFails(setDoc(doc(sc, 'pdz/dp_2026-10-09_x1'), P('2026-10-08', 'x1'))); // id de otra fecha
  await assertFails(setDoc(doc(sc, 'pdz/dp_2026-10-08_x9'), P('2026-10-08', 'x9'))); // actividad de otra partida (declara la suya)
  await assertFails(setDoc(doc(sc, 'pdz/dp_2026-10-08_zz'), P('2026-10-08', 'zz'))); // actividad que no existe
  await assertFails(setDoc(doc(sc, 'pdz/dp_2026-10-08_x1'), P('2026-10-08', 'x1', { dec: 'yo decido', decBy: 'sc@obra.pe' })));
  await assertSucceeds(setDoc(doc(sc, 'pdz/dp_2026-10-08_x1'), P('2026-10-08', 'x1')));
  // aceptada: el SC ya no la cambia ni la borra
  await assertFails(updateDoc(doc(sc, 'pdz/dp_2026-10-05_x4'), { st: 'pend' }));
  await assertFails(updateDoc(doc(sc, 'pdz/dp_2026-10-05_x4'), { desc: 'otra cosa' }));
  await assertFails(deleteDoc(doc(sc, 'pdz/dp_2026-10-05_x4')));
  // rechazada: solo vuelve a pendiente, como lo hace la página (reemplaza el documento entero, sin la decisión anterior)
  await assertFails(updateDoc(doc(sc, 'pdz/dp_2026-10-06_x4'), { st: 'ok' }));
  await assertFails(updateDoc(doc(sc, 'pdz/dp_2026-10-06_x4'), { st: 'pend', decBy: 'sc@obra.pe' }));
  await assertFails(setDoc(doc(sc, 'pdz/dp_2026-10-06_x4'), P('2026-10-06', 'x4', { dec: 'yo', decBy: 'sc@obra.pe' })));
  await assertSucceeds(setDoc(doc(sc, 'pdz/dp_2026-10-06_x4'), P('2026-10-06', 'x4', { desc: 'de nuevo' })));
  // pendiente: la cambia o la retira
  await assertSucceeds(updateDoc(doc(sc, 'pdz/dp_2026-10-07_x4'), { k: 'fin' }));
  await assertFails(updateDoc(doc(sc, 'pdz/dp_2026-10-07_x4'), { dec: 'x' }));
  await assertSucceeds(deleteDoc(doc(sc, 'pdz/dp_2026-10-07_x4')));
});
test('ciclo diario: equipo del SC (fza/fzl) con id fijo y de su partida; «no se hará hoy» solo de lo suyo y no a futuro', async () => {
  const sc = user('sc@obra.pe');
  const F = { date: '2026-10-08', sc: 'c-gabel', kind: 'fza', items: [], cuad: [], asg: {} };
  await assertSucceeds(setDoc(doc(sc, 'pdz/fz_2026-10-08_c-gabel'), F));
  await assertFails(setDoc(doc(sc, 'pdz/fz_2026-10-09_c-gabel'), F));
  await assertFails(setDoc(doc(sc, 'pdz/otro'), F));
  await assertFails(setDoc(doc(sc, 'pdz/fz_2026-10-08_c-otro'), { ...F, sc: 'c-otro' }));
  await assertSucceeds(setDoc(doc(sc, 'pdz/fzl_c-gabel'), { date: '_last', kind: 'fzl', sc: 'c-gabel', items: [] }));
  await assertFails(setDoc(doc(sc, 'pdz/fzl_x'), { date: '_last', kind: 'fzl', sc: 'c-gabel', items: [] }));
  const N = { date: '2026-10-01', pisoId: 'p1', sc: 'c-gabel', kind: 'nova', actId: 'x1', motivo: 'Clima', repTo: '' };
  await assertSucceeds(setDoc(doc(sc, 'pdz/nvA'), N));
  await assertFails(setDoc(doc(sc, 'pdz/nvB'), { ...N, actId: 'x9' })); // actividad de otra partida
  await assertFails(setDoc(doc(sc, 'pdz/nvC'), { ...N, date: '2099-01-01' })); // a futuro: el SC propone (dprop), no decide
  await assertFails(setDoc(doc(sc, 'pdz/nvD'), { ...N, mv: { x1: {} } }));
  await assertFails(setDoc(doc(sc, 'pdz/nvE'), { ...N, pub: 'pub_2026-10-01_p1' }));
});
test('ciclo diario: el editor escribe el plan diario y su foto solo en los pisos a su cargo', async () => {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'pisos/p1'), { code: 'P1', name: 'Piso 1', resp: ['editor2@obra.pe'] });
    await setDoc(doc(db, 'pisos/p2'), { code: 'P2', name: 'Piso 2', resp: [] });
    await setDoc(doc(db, 'pdz/z-p1'), { date: '2026-10-08', pisoId: 'p1', sc: 'c-gabel', kind: 'zona', actId: 'x1', pts: [] });
    await setDoc(doc(db, 'dplan/2099-01-02_p1'), { date: '2099-01-02', pisoId: 'p1', ids: { x1: null }, reo: null });
  });
  const ed = user('editor@obra.pe'), ed2 = user('editor2@obra.pe'), adm = user(OWNER);
  const Z = pid => ({ date: '2026-10-08', pisoId: pid, sc: 'c-gabel', kind: 'zona', actId: 'x1', pts: [] });
  await assertFails(setDoc(doc(ed, 'pdz/za'), Z('p1')));
  await assertSucceeds(setDoc(doc(ed2, 'pdz/zb'), Z('p1')));
  await assertSucceeds(setDoc(doc(ed, 'pdz/zc'), Z('p2'))); // piso sin responsable: cualquier editor
  await assertSucceeds(setDoc(doc(ed, 'pdz/zd'), Z('p9'))); // piso sin documento
  await assertSucceeds(setDoc(doc(adm, 'pdz/ze'), Z('p1')));
  await assertFails(updateDoc(doc(ed, 'pdz/z-p1'), { pts: [1] }));
  await assertFails(deleteDoc(doc(ed, 'pdz/z-p1')));
  await assertFails(updateDoc(doc(ed, 'pdz/zc'), { pisoId: 'p1' })); // no lo pasa a un piso ajeno
  await assertSucceeds(updateDoc(doc(ed2, 'pdz/z-p1'), { pts: [1] }));
  await assertSucceeds(setDoc(doc(ed, 'pdz/fz_2026-10-08_c-gabel'), { date: '2026-10-08', sc: 'c-gabel', kind: 'fza', items: [] })); // sin piso
  // foto del plan
  await assertFails(setDoc(doc(ed, 'dplan/2099-01-03_p1'), { date: '2099-01-03', pisoId: 'p1', ids: {}, reo: null }));
  await assertSucceeds(setDoc(doc(ed2, 'dplan/2099-01-03_p1'), { date: '2099-01-03', pisoId: 'p1', ids: {}, reo: null }));
  await assertSucceeds(setDoc(doc(ed, 'dplan/2099-01-03_p2'), { date: '2099-01-03', pisoId: 'p2', ids: {}, reo: null }));
  await assertFails(deleteDoc(doc(ed, 'dplan/2099-01-02_p1')));
  await assertSucceeds(deleteDoc(doc(ed2, 'dplan/2099-01-02_p1')));
  // responsables del piso: solo el administrador
  await assertFails(updateDoc(doc(ed, 'pisos/p2'), { resp: ['editor@obra.pe'] }));
  await assertFails(updateDoc(doc(ed2, 'pisos/p1'), { resp: [] }));
  await assertSucceeds(updateDoc(doc(ed, 'pisos/p1'), { name: 'Piso 1 (losa)' }));
  await assertFails(setDoc(doc(ed, 'pisos/p3'), { code: 'P3', resp: ['editor@obra.pe'] }));
  await assertSucceeds(setDoc(doc(ed, 'pisos/p3'), { code: 'P3' }));
  await assertFails(deleteDoc(doc(ed, 'pisos/p1')));
  await assertSucceeds(updateDoc(doc(adm, 'pisos/p2'), { resp: ['editor@obra.pe'] }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'pisos/p2'), { name: 'x' }));
});
test('ciclo diario: el SC propone el cierre del día solo de las actividades de su partida', async () => {
  const sc = user('sc@obra.pe');
  await assertSucceeds(setDoc(doc(sc, 'live/2026-10-02_x4'), { date: '2026-10-02', actId: 'x4', sc: 'c-gabel', close: { status: 'no', cnc: 'Materiales' } }));
  await assertFails(setDoc(doc(sc, 'live/2026-10-02_xe'), { date: '2026-10-02', actId: 'xe', pisoId: 'p2', sc: 'c-gabel', close: { status: 'ok', done: true } }));
  await assertFails(updateDoc(doc(sc, 'live/2026-10-01_x9'), { close: { status: 'ok' } }));
});

// ── Tareo (fase 0, docs/ia/tareo.md) ──
const PER = (dni, x) => ({ dni, ape: 'PEREZ', nom: 'ANA', pue: 'PEON', cat: 'PE', cua: 'ALBAÑILES', cap: '', act: true, ...x });
const PC = (cod, x) => ({ cod, grp: cod.split('.')[0], grpN: 'ESTRUCTURAS', nom: 'Partida ' + cod, und: 'm2', act: true, ...x });
test('tareo: el asistente y el administrador editan el máster y las partidas; nadie las borra', async () => {
  for (const db of [user('tasis@obra.pe'), user(OWNER)]) {
    await assertSucceeds(getDoc(doc(db, 'tper/03684337')));
    await assertSucceeds(getDocs(collection(db, 'tper')));
    await assertSucceeds(setDoc(doc(db, 'tper/12345678'), PER('12345678')));
    await assertSucceeds(updateDoc(doc(db, 'tper/03684337'), { cap: 'u_tcap1', arch: { t: 1, by: 'x', n: 'x' } }));
    await assertSucceeds(setDoc(doc(db, 'tper/CE0012345AB'), PER('CE0012345AB'))); // carné de extranjería
    await assertSucceeds(setDoc(doc(db, 'tpc/20.01'), PC('20.01')));
    await assertSucceeds(updateDoc(doc(db, 'tpc/10.05'), { act: false }));
    await assertFails(deleteDoc(doc(db, 'tper/03684337')));
    await assertFails(deleteDoc(doc(db, 'tpc/10.05')));
  }
});
test('tareo: forma mínima del máster (id = DNI) y de las partidas (cod y nom texto)', async () => {
  const t = user('tasis@obra.pe');
  await assertFails(setDoc(doc(t, 'tper/11111111'), PER('22222222'))); // id distinto del DNI
  await assertFails(setDoc(doc(t, 'tper/3684337'), PER('3684337'))); // 7 caracteres (sin el cero)
  await assertFails(setDoc(doc(t, 'tper/1234567890123'), PER('1234567890123'))); // más de 12
  await assertFails(setDoc(doc(t, 'tper/43241048 II'), PER('43241048 II'))); // basura
  await assertFails(setDoc(doc(t, 'tper/43241048'), PER(43241048))); // número, no texto
  await assertFails(setDoc(doc(t, 'tper/43241049'), { ape: 'X', nom: 'Y' })); // sin DNI
  await assertFails(updateDoc(doc(t, 'tper/03684337'), { dni: '03684338' })); // no cambia el DNI de la ficha
  await assertFails(setDoc(doc(t, 'tpc/x1'), PC('10.06', { nom: null })));
  await assertFails(setDoc(doc(t, 'tpc/x2'), { ...PC('10.07'), cod: 10.07 }));
  await assertFails(setDoc(doc(t, 'tpc/x3'), { grp: '10', und: 'm2' }));
});
test('tareo: capataz, costos y jefe de producción leen; no editan', async () => {
  for (const db of [user('tcapm@obra.pe'), cap('tcap1'), user('tcos@obra.pe'), user('jefe@obra.pe')]) {
    await assertSucceeds(getDoc(doc(db, 'tper/03684337')));
    await assertSucceeds(getDocs(collection(db, 'tpc')));
    await assertSucceeds(getDoc(doc(db, 'tcfg/main')));
    await assertFails(setDoc(doc(db, 'tper/12345678'), PER('12345678')));
    await assertFails(updateDoc(doc(db, 'tpc/10.05'), { nom: 'x' }));
    await assertFails(setDoc(doc(db, 'tcfg/main'), { tolGar: 5 }));
    await assertFails(deleteDoc(doc(db, 'tper/03684337')));
  }
});
test('tareo: costos bloquea y desbloquea partidas (solo bloq/bloqBy/bloqAt); el resto de lectores no', async () => {
  const c = user('tcos@obra.pe');
  await assertSucceeds(updateDoc(doc(c, 'tpc/10.05'), { bloq: true, bloqBy: 'tcos@obra.pe', bloqAt: 1 }));
  await assertSucceeds(updateDoc(doc(c, 'tpc/10.05'), { bloq: false, bloqBy: 'tcos@obra.pe', bloqAt: 2 }));
  await assertFails(updateDoc(doc(c, 'tpc/10.05'), { bloq: true, bloqBy: 'tcos@obra.pe', bloqAt: 3, act: false })); // otro campo
  await assertFails(updateDoc(doc(c, 'tpc/10.05'), { bloq: true, bloqBy: 'otro@obra.pe', bloqAt: 3 })); // a nombre de otro
  await assertFails(updateDoc(doc(c, 'tpc/10.05'), { bloq: 'si', bloqBy: 'tcos@obra.pe', bloqAt: 3 })); // no booleano
  await assertFails(setDoc(doc(c, 'tpc/20.02'), { ...PC('20.02'), bloq: true, bloqBy: 'tcos@obra.pe', bloqAt: 1 })); // no crea
  await assertFails(deleteDoc(doc(c, 'tpc/10.05')));
  for (const db of [user('tasis@obra.pe'), user(OWNER)]) await assertSucceeds(updateDoc(doc(db, 'tpc/10.05'), { bloq: true, bloqBy: 'x@obra.pe', bloqAt: 4 }));
  for (const db of [user('tcapm@obra.pe'), cap('tcap1'), user('jefe@obra.pe'), user('editor@obra.pe')]) {
    await assertFails(updateDoc(doc(db, 'tpc/10.05'), { bloq: false, bloqBy: 'x@obra.pe', bloqAt: 5 }));
  }
});
test('tareo: editor sin «Publica tareo», lector, SC, capataz de SC y campo no ven el tareo', async () => {
  for (const db of [user('editor@obra.pe'), user('lector@obra.pe'), user('sc@obra.pe'), cap('cap1'), user('campo@obra.pe'), user('veedor@obra.pe'), user('extrano@x.pe')]) {
    await assertFails(getDoc(doc(db, 'tper/03684337')));
    await assertFails(getDocs(collection(db, 'tper')));
    await assertFails(getDoc(doc(db, 'tpc/10.05')));
    await assertFails(getDoc(doc(db, 'tcfg/main')));
    await assertFails(setDoc(doc(db, 'tper/12345678'), PER('12345678')));
    await assertFails(setDoc(doc(db, 'tpc/20.01'), PC('20.01')));
  }
});
test('tareo: la configuración la cambia solo el administrador', async () => {
  await assertSucceeds(setDoc(doc(user(OWNER), 'tcfg/main'), { refIni: '12:30', limEnv: '18:00', tolGar: 10 }));
  await assertFails(setDoc(doc(user('tasis@obra.pe'), 'tcfg/main'), { tolGar: 5 }));
  await assertFails(setDoc(doc(user('jefe@obra.pe'), 'tcfg/main'), { tolGar: 5 }));
});
test('tareo: los roles de solo tareo no leen ni escriben nada de LPS', async () => {
  const lps = ['acts/x1', 'meta/main', 'pisos/p1', 'daily/2026-10-01_p1', 'restr/r-ot', 'live/2026-10-01_x1', 'lib/l-sol', 'pzon/x1', 'lhlog/1', 'dplan/2026-10-01_p1', 'fotos/f1', 'nprog/n1', 'pdz/z1', 'doneidx/p1', 'libm/main', 'lhprop/c-gabel', 'lhphist/h1', 'frz/60', 'wsnap/60_p1', 'mp/n1', 'cli/buf'];
  for (const db of [user('tasis@obra.pe'), user('tcos@obra.pe'), user('tcapm@obra.pe'), cap('tcap1')]) {
    for (const p of lps) await assertFails(getDoc(doc(db, p)));
    for (const c of ['acts', 'restr', 'daily', 'live']) await assertFails(getDocs(collection(db, c)));
    await assertFails(updateDoc(doc(db, 'acts/x1'), { name: 'x' }));
    await assertFails(setDoc(doc(db, 'daily/2026-10-02_p1'), { recs: {} }));
    await assertFails(updateDoc(doc(db, 'live/2026-10-01_x1'), { st: 'run' }));
    await assertFails(setDoc(doc(db, 'restr/rt'), { actId: 'x1', status: 'pend' }));
    await assertFails(setDoc(doc(db, 'fotos/ft'), { data: 'x', by: 'tasis@obra.pe' }));
    await assertFails(setDoc(doc(db, 'nprog/nt'), { date: '2026-10-01', by: 'tasis@obra.pe' }));
    await assertFails(setDoc(doc(db, 'lib/lt'), { actId: 'x1', sc: 'c-gabel', st: 'sol', by: 'tasis@obra.pe' }));
    await assertFails(setDoc(doc(db, 'members/otro@obra.pe'), { role: 'admin' }));
  }
  for (const db of [user('tcos@obra.pe'), user('tcapm@obra.pe'), cap('tcap1')]) await assertFails(getDoc(doc(db, 'members/editor@obra.pe')));
  // cada uno lee su propio registro; la lista solo el asistente (y el administrador)
  await assertSucceeds(getDoc(doc(user('tcos@obra.pe'), 'members/tcos@obra.pe')));
  await assertSucceeds(getDoc(doc(cap('tcap1'), 'members/u_tcap1')));
  await assertSucceeds(getDocs(collection(user('tasis@obra.pe'), 'members')));
  await assertSucceeds(getDocs(collection(user(OWNER), 'members')));
  await assertFails(getDocs(collection(user('tcos@obra.pe'), 'members')));
  await assertFails(getDocs(collection(cap('tcap1'), 'members')));
  await assertFails(getDocs(collection(user('tcapm@obra.pe'), 'members')));
  await assertFails(setDoc(doc(user('tasis@obra.pe'), 'members/u_tcap1'), { role: 'tcap', name: 'Pedro', x: 1 })); // lee, no cambia
});
test('tareo: el jefe de producción (editor con tpub) sigue siendo editor en LPS', async () => {
  const j = user('jefe@obra.pe');
  await assertSucceeds(getDoc(doc(j, 'acts/x1')));
  await assertSucceeds(updateDoc(doc(j, 'acts/x1'), { name: 'b' }));
  await assertSucceeds(getDocs(collection(j, 'members')));
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'acts/x1'))); // los demás roles no cambian
  await assertSucceeds(getDoc(doc(user('sc@obra.pe'), 'daily/2026-10-01_p1')));
});

// ── Tareo F1: tareo del capataz (tcap) e invitaciones del tareo ──
const limaDay = off => new Date(Date.now() - 5 * 36e5 + off * 864e5).toISOString().slice(0, 10);
const tSeed = async (path, data) => env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), path), data));
test('tareo: el capataz del tareo crea, guarda y envía solo el suyo', async () => {
  const h = limaDay(0), p = cap('tcap1'), me = 'u_tcap1';
  await assertSucceeds(getDoc(doc(p, `tareo/${h}_${me}`))); // abre su día aunque aún no exista
  await assertFails(getDoc(doc(p, `tareo/${h}_u_otro`)));
  await assertSucceeds(setDoc(doc(p, `tareo/${h}_${me}`), { date: h, cap: me, capN: 'Pedro', st: 'bor', rows: {}, blq: [] }));
  await assertSucceeds(updateDoc(doc(p, `tareo/${h}_${me}`), { blq: [{ id: 'b1', pc: '10.05', ini: '07:30', fin: '12:00', dnis: [] }] }));
  await assertSucceeds(updateDoc(doc(p, `tareo/${h}_${me}`), { st: 'env', envAt: 1 }));
  await assertFails(updateDoc(doc(p, `tareo/${h}_${me}`), { st: 'bor' })); // ya enviado: no lo cambia
  await assertSucceeds(getDoc(doc(p, `tareo/${h}_${me}`)));
  // ajeno: ni crearlo a nombre de otro, ni con id que no corresponde, ni cambiar la fecha
  await assertFails(setDoc(doc(p, `tareo/${h}_u_otro`), { date: h, cap: 'u_otro', st: 'bor' }));
  await assertFails(setDoc(doc(p, `tareo/${h}_u_otro`), { date: h, cap: me, st: 'bor' }));
  await assertFails(setDoc(doc(p, `tareo/${limaDay(-1)}_${me}`), { date: h, cap: me, st: 'bor' }));
  // estados que no le tocan al crear
  await assertFails(setDoc(doc(p, `tareo/${limaDay(-1)}_${me}`), { date: limaDay(-1), cap: me, st: 'reab' }));
  await assertFails(setDoc(doc(p, `tareo/${limaDay(-1)}_${me}`), { date: limaDay(-1), cap: me, st: 'rev' }));
  await assertFails(setDoc(doc(p, `tareo/${limaDay(-1)}_${me}`), { date: limaDay(-1), cap: me, st: 'bor', reab: { t: 1 } }));
  // fechas: hasta 3 días atrás sí; más atrás o en el futuro no
  await assertSucceeds(setDoc(doc(p, `tareo/${limaDay(-3)}_${me}`), { date: limaDay(-3), cap: me, st: 'bor' }));
  await assertFails(setDoc(doc(p, `tareo/${limaDay(-6)}_${me}`), { date: limaDay(-6), cap: me, st: 'bor' }));
  await assertFails(setDoc(doc(p, `tareo/${limaDay(3)}_${me}`), { date: limaDay(3), cap: me, st: 'bor' }));
  // otro capataz del tareo (con correo) no lo ve ni lo cambia
  const o = user('tcapm@obra.pe');
  await assertFails(getDoc(doc(o, `tareo/${h}_${me}`)));
  await assertFails(updateDoc(doc(o, `tareo/${h}_${me}`), { st: 'bor' }));
  await assertSucceeds(setDoc(doc(o, `tareo/${h}_tcapm@obra.pe`), { date: h, cap: 'tcapm@obra.pe', st: 'bor' }));
});
test('tareo: consultas; el tcap solo filtra los suyos, tcos nada, la oficina todo', async () => {
  const h = limaDay(0);
  await tSeed(`tareo/${h}_u_tcap1`, { date: h, cap: 'u_tcap1', st: 'bor' });
  await tSeed(`tareo/${h}_tcapm@obra.pe`, { date: h, cap: 'tcapm@obra.pe', st: 'env' });
  await assertSucceeds(getDocs(query(collection(cap('tcap1'), 'tareo'), where('cap', '==', 'u_tcap1'))));
  await assertFails(getDocs(collection(cap('tcap1'), 'tareo')));
  for (const db of [user('tasis@obra.pe'), user(OWNER), user('jefe@obra.pe')]) await assertSucceeds(getDocs(collection(db, 'tareo')));
  await assertFails(getDocs(collection(user('tcos@obra.pe'), 'tareo')));
  await assertFails(getDoc(doc(user('tcos@obra.pe'), `tareo/${h}_u_tcap1`)));
  for (const db of [user('editor@obra.pe'), user('campo@obra.pe'), user('lector@obra.pe'), cap('cap1')]) await assertFails(getDoc(doc(db, `tareo/${h}_u_tcap1`)));
});
test('tareo: el asistente reabre; el capataz corrige y reenvía; nadie borra; el jefe con tpub no crea tareos', async () => {
  const h = limaDay(-1), id = `tareo/${h}_u_tcap1`, p = cap('tcap1');
  await tSeed(id, { date: h, cap: 'u_tcap1', st: 'env', rows: {} });
  await assertFails(updateDoc(doc(p, id), { st: 'reab' })); // no se reabre solo
  await assertSucceeds(updateDoc(doc(user('tasis@obra.pe'), id), { st: 'reab', reab: { t: 1, by: 'tasis@obra.pe', mot: 'Falta foto' } }));
  await assertSucceeds(updateDoc(doc(p, id), { rows: { '03684337': { as: true } } })); // sigue 'reab'
  await assertFails(updateDoc(doc(p, id), { reab: null })); // no toca el motivo
  await assertFails(updateDoc(doc(p, id), { st: 'bor' }));
  await assertFails(updateDoc(doc(p, id), { pub: true }));
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env' }));
  await assertSucceeds(updateDoc(doc(user(OWNER), id), { st: 'rev' }));
  await assertFails(updateDoc(doc(p, id), { st: 'env' }));
  for (const db of [p, user('tasis@obra.pe'), user(OWNER)]) await assertFails(deleteDoc(doc(db, id)));
  await assertFails(setDoc(doc(user('jefe@obra.pe'), `tareo/${h}_x`), { date: h, cap: 'x', st: 'bor' }));
  await assertFails(setDoc(doc(user('tcos@obra.pe'), `tareo/${h}_x`), { date: h, cap: 'x', st: 'bor' }));
  await assertSucceeds(setDoc(doc(user('tasis@obra.pe'), `tareo/${h}_x`), { date: h, cap: 'x', st: 'bor' }));
});
// ── Tareo F2: revisión del asistente (cotejo de firmas, garita, corrección, revisado) ──
test('tareo F2: el asistente revisa; el capataz no pasa a revisado, no edita un revisado ni reescribe el historial', async () => {
  const h = limaDay(-1), id = `tareo/${h}_u_tcap1`, p = cap('tcap1'), a = user('tasis@obra.pe');
  const H0 = [{ t: 1, by: 'u_tcap1', a: 'env' }];
  await tSeed(id, { date: h, cap: 'u_tcap1', st: 'env', rows: { '11111111': { as: true } }, hist: H0 });
  // el capataz no marca revisado ni toca un enviado (cotejo, garita, historial)
  await assertFails(updateDoc(doc(p, id), { st: 'rev' }));
  await assertFails(updateDoc(doc(p, id), { 'rows.11111111.fir': true }));
  // el asistente coteja firmas y garita, corrige y marca revisado
  await assertSucceeds(updateDoc(doc(a, id), { 'rows.11111111.fir': true, 'rows.11111111.gar': '17:05', hist: arrayUnion({ t: 2, by: 'tasis@obra.pe', a: 'fir' }) }));
  await assertSucceeds(updateDoc(doc(a, id), { blq: [], hist: arrayUnion({ t: 3, by: 'tasis@obra.pe', a: 'cor', mot: 'Hora mal', cam: 'x' }) }));
  await assertSucceeds(updateDoc(doc(a, id), { st: 'rev', revAt: 4, revBy: 'tasis@obra.pe', hist: arrayUnion({ t: 4, by: 'tasis@obra.pe', a: 'rev' }) }));
  // revisado: el capataz no lo cambia (ni lo vuelve a enviar)
  await assertFails(updateDoc(doc(p, id), { st: 'env' }));
  await assertFails(updateDoc(doc(p, id), { blq: [{ id: 'b1' }] }));
  await assertFails(updateDoc(doc(p, id), { st: 'rev', blq: [] }));
  // quitar revisado (rev → env) y reabrir desde revisado: el asistente sí
  await assertSucceeds(updateDoc(doc(a, id), { st: 'env', hist: arrayUnion({ t: 5, by: 'tasis@obra.pe', a: 'qrev', mot: 'm' }) }));
  await assertSucceeds(updateDoc(doc(user(OWNER), id), { st: 'rev' }));
  await assertSucceeds(updateDoc(doc(a, id), { st: 'reab', reab: { t: 6, by: 'tasis@obra.pe', mot: 'm' }, hist: arrayUnion({ t: 6, by: 'tasis@obra.pe', a: 'reab' }) }));
  await assertFails(deleteDoc(doc(a, id)));
  // reabierto: el capataz solo agrega al final del historial (no borra ni cambia lo de la oficina)
  let cur = null;
  await env.withSecurityRulesDisabled(async c => { cur = (await getDoc(doc(c.firestore(), id))).data().hist; });
  await assertFails(updateDoc(doc(p, id), { hist: [] }));
  await assertFails(updateDoc(doc(p, id), { hist: [...cur.slice(0, -1), { ...cur[cur.length - 1], mot: 'otro' }] }));
  await assertFails(updateDoc(doc(p, id), { hist: [...cur, { t: 7, a: 'env' }, { t: 8, a: 'rev' }] }));
  await assertFails(updateDoc(doc(p, id), { revBy: 'u_tcap1' }));
  await assertFails(updateDoc(doc(p, id), { st: 'rev' }));
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env', hist: [...cur, { t: 7, by: 'u_tcap1', a: 'env' }] }));
});
// ── Auditoría F2 (hallazgos 10 y 12): el cotejo (cot, cotFot) es del asistente; el capataz no se lo atribuye ──
test('tareo F2 auditoría: el capataz no crea ni cambia cot/cotFot ni agrega entradas de la oficina al historial', async () => {
  const h = limaDay(0), me = 'u_tcap1', id = `tareo/${h}_${me}`, p = cap('tcap1'), a = user('tasis@obra.pe');
  // al crear
  await assertFails(setDoc(doc(p, id), { date: h, cap: me, st: 'bor', rows: {}, cot: { '11111111': { fir: true } } }));
  await assertFails(setDoc(doc(p, id), { date: h, cap: me, st: 'bor', rows: {}, cotFot: ['f1'] }));
  await assertSucceeds(setDoc(doc(p, id), { date: h, cap: me, st: 'bor', rows: { '11111111': { as: true } }, foto: ['f1'], hist: [] }));
  // en borrador: no escribe el cotejo ni se pone entradas de la oficina en el historial
  await assertFails(updateDoc(doc(p, id), { 'cot.11111111.fir': true }));
  await assertFails(updateDoc(doc(p, id), { cotFot: ['f1'] }));
  await assertFails(updateDoc(doc(p, id), { hist: [{ t: 1, by: 'tasis@obra.pe', a: 'fir' }] }));
  await assertFails(updateDoc(doc(p, id), { hist: [{ t: 1, by: 'tasis@obra.pe', a: 'rev' }] }));
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env', hist: [{ t: 1, by: me, a: 'env' }] }));
  // el asistente coteja por rutas (solo lo que cambió) y luego reabre conservando la garita
  await assertSucceeds(updateDoc(doc(a, id), { 'cot.11111111.fir': true, 'cot.11111111.gar': '17:05', 'cot.11111111.by': 'tasis@obra.pe', 'cot.11111111.t': 2, cotFot: ['f1'] }));
  await assertSucceeds(updateDoc(doc(a, id), { st: 'reab', reab: { t: 3, by: 'tasis@obra.pe', mot: 'm' }, cot: { '11111111': { gar: '17:05' } }, cotFot: deleteField(), hist: arrayUnion({ t: 3, by: 'tasis@obra.pe', a: 'reab' }) }));
  // reabierto: su guardado completo copia cot igual (sí); cambiarlo o quitarlo (no)
  let cur = null;
  await env.withSecurityRulesDisabled(async c => { cur = (await getDoc(doc(c.firestore(), id))).data(); });
  await assertSucceeds(setDoc(doc(p, id), { ...cur, blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['11111111'] }] }));
  await assertFails(setDoc(doc(p, id), { ...cur, cot: { '11111111': { gar: '17:05', fir: true } } }));
  const { cot, ...sinCot } = cur;
  await assertFails(setDoc(doc(p, id), sinCot));
  await assertFails(updateDoc(doc(p, id), { cotFot: ['f1'] }));
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env', hist: [...cur.hist, { t: 4, by: me, a: 'env' }] }));
});
// ── Segunda auditoría (A4): al CREAR, el capataz no trae nada de la oficina (historial ajeno, cotejo, revisado, reapertura) ──
test('tareo segunda auditoría A4: crear manipulado (borrador o enviado) falla; su «Enviado» propio sí', async () => {
  const h = limaDay(0), me = 'u_tcap1', id = `tareo/${h}_${me}`, p = cap('tcap1');
  const base = { date: h, cap: me, rows: { '11111111': { as: true } }, foto: ['f1'] };
  for (const st of ['bor', 'env']) {
    // historial con acciones de la oficina (aunque diga «by» de la oficina o el suyo)
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: [{ a: 'fir', by: 'tasis@obra.pe', t: 1 }] }));
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: [{ a: 'rev', by: me, t: 1 }] }));
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: [{ a: 'cor', by: me, t: 1 }] }));
    // un «Enviado» a nombre de otro, o más de una entrada
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: [{ a: 'env', by: 'tasis@obra.pe', t: 1 }] }));
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: [{ a: 'env', by: me, t: 1 }, { a: 'env', by: me, t: 2 }] }));
    await assertFails(setDoc(doc(p, id), { ...base, st, hist: 'x' }));
    // campos de la oficina
    for (const k of ['cot', 'cotFot', 'revAt', 'revBy', 'reab', 'pub']) await assertFails(setDoc(doc(p, id), { ...base, st, hist: [], [k]: k === 'cotFot' ? ['f1'] : k === 'cot' ? { '11111111': { fir: true } } : 1 }));
  }
  // lo normal: borrador sin historial, o enviado directo (sin señal) con su propio «Enviado» y envN
  await assertSucceeds(setDoc(doc(p, id), { ...base, st: 'bor', hist: [] }));
  const id2 = `tareo/${limaDay(-1)}_${me}`;
  await assertSucceeds(setDoc(doc(p, id2), { ...base, date: limaDay(-1), st: 'env', envN: 1, envAt: 1, hist: [{ a: 'env', by: me, t: 1 }] }));
  // al actualizar, su entrada nueva del historial debe ser suya
  await tSeed(`tareo/${limaDay(-2)}_${me}`, { ...base, date: limaDay(-2), st: 'reab', hist: [{ a: 'reab', by: 'tasis@obra.pe', t: 1 }] });
  await assertFails(updateDoc(doc(p, `tareo/${limaDay(-2)}_${me}`), { st: 'env', hist: [{ a: 'reab', by: 'tasis@obra.pe', t: 1 }, { a: 'env', by: 'tasis@obra.pe', t: 2 }] }));
  await assertSucceeds(updateDoc(doc(p, `tareo/${limaDay(-2)}_${me}`), { st: 'env', envN: 2, hist: [{ a: 'reab', by: 'tasis@obra.pe', t: 1 }, { a: 'env', by: me, t: 2 }] }));
});
test('tfot: restaurar un respaldo (misma foto, mismo id) lo puede hacer la oficina; cambiarla no', async () => {
  const h = limaDay(0), id = `tfot/${h}_u_tcap1_9`, D = { date: h, cap: 'u_tcap1', n: 1, d: 'data:image/jpeg;base64,xx', by: 'u_tcap1', ts: 1 };
  await tSeed(id, D);
  await assertSucceeds(setDoc(doc(user(OWNER), id), D));
  await assertSucceeds(setDoc(doc(user('tasis@obra.pe'), id), D));
  await assertFails(setDoc(doc(user(OWNER), id), { ...D, d: 'otra' }));
  await assertFails(setDoc(doc(cap('tcap1'), id), D));
  await assertFails(setDoc(doc(user('jefe@obra.pe'), id), D));
});
test('tareo F2 (auditoría, hallazgo 9): un reabierto de cualquier fecha lo corrige y reenvía su capataz; la ventana corta sigue para crear y para borradores', async () => {
  const v = limaDay(-8), id = `tareo/${v}_u_tcap1`, p = cap('tcap1'), me = 'u_tcap1';
  await tSeed(id, { date: v, cap: me, st: 'reab', rows: {}, hist: [{ t: 1, by: 'tasis@obra.pe', a: 'reab' }], reab: { t: 1, by: 'tasis@obra.pe', mot: 'Foto' } });
  // lo lista con su consulta (cap + st) y lo corrige
  await assertSucceeds(getDocs(query(collection(p, 'tareo'), where('cap', '==', me), where('st', '==', 'reab'))));
  await assertFails(getDocs(query(collection(p, 'tareo'), where('st', '==', 'reab'))));
  await assertSucceeds(updateDoc(doc(p, id), { rows: { '11111111': { as: true } } }));
  await assertFails(updateDoc(doc(p, id), { date: limaDay(0) }));
  await assertFails(updateDoc(doc(p, id), { st: 'bor' }));
  // foto nueva para ese reabierto
  await assertSucceeds(setDoc(doc(p, `tfot/${v}_${me}_1`), { date: v, cap: me, n: 1, d: 'x' }));
  // otro capataz no
  await assertFails(updateDoc(doc(user('tcapm@obra.pe'), id), { rows: {} }));
  await assertFails(setDoc(doc(user('tcapm@obra.pe'), `tfot/${v}_tcapm@obra.pe_1`), { date: v, cap: 'tcapm@obra.pe', n: 1, d: 'x' }));
  // reenvía; ya enviado (fuera de la ventana) no lo cambia ni sube fotos
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env', hist: [{ t: 1, by: 'tasis@obra.pe', a: 'reab' }, { t: 2, by: me, a: 'env' }] }));
  await assertFails(updateDoc(doc(p, id), { rows: {} }));
  await assertFails(setDoc(doc(p, `tfot/${v}_${me}_2`), { date: v, cap: me, n: 2, d: 'x' }));
  // borrador viejo: ni lo crea ni lo actualiza
  const b = limaDay(-7);
  await assertFails(setDoc(doc(p, `tareo/${b}_${me}`), { date: b, cap: me, st: 'bor' }));
  await tSeed(`tareo/${b}_${me}`, { date: b, cap: me, st: 'bor' });
  await assertFails(updateDoc(doc(p, `tareo/${b}_${me}`), { rows: {} }));
  await assertFails(setDoc(doc(p, `tfot/${b}_${me}_1`), { date: b, cap: me, n: 1, d: 'x' }));
});
test('tfot: el capataz sube las fotos de su tareo; nadie las cambia ni borra', async () => {
  const h = limaDay(0), p = cap('tcap1'), me = 'u_tcap1', id = `tfot/${h}_${me}_1`;
  await assertSucceeds(setDoc(doc(p, id), { date: h, cap: me, n: 1, d: 'data:image/jpeg;base64,xx', by: me, ts: 1 }));
  await assertSucceeds(getDoc(doc(p, id)));
  await assertFails(updateDoc(doc(p, id), { d: 'y' }));
  await assertFails(deleteDoc(doc(p, id)));
  await assertFails(setDoc(doc(p, `tfot/${h}_u_otro_1`), { date: h, cap: me, n: 1, d: 'x' }));
  await assertFails(setDoc(doc(p, `tfot/${h}_${me}_2`), { date: h, cap: 'u_otro', n: 1, d: 'x' }));
  await assertFails(setDoc(doc(p, `tfot/${h}_${me}_3`), { date: h, cap: me, n: 1, d: 'x'.repeat(1000001) }));
  await assertFails(setDoc(doc(p, `tfot/${h}_${me}_4`), { date: h, cap: me, n: 1 }));
  await assertFails(getDoc(doc(user('tcapm@obra.pe'), id)));
  await assertFails(getDoc(doc(user('tcos@obra.pe'), id)));
  await assertFails(getDoc(doc(user('editor@obra.pe'), id)));
  for (const db of [user('tasis@obra.pe'), user(OWNER), user('jefe@obra.pe')]) await assertSucceeds(getDoc(doc(db, id)));
  await assertSucceeds(setDoc(doc(user('tasis@obra.pe'), `tfot/${h}_x_1`), { date: h, cap: 'x', n: 1, d: 'x' }));
  await assertFails(setDoc(doc(user('jefe@obra.pe'), `tfot/${h}_x_2`), { date: h, cap: 'x', n: 1, d: 'x' }));
  await assertFails(updateDoc(doc(user(OWNER), id), { d: 'z' }));
});
test('invitación del tareo: registra tcap sin partida; no se cruza con la de capataz de SC', async () => {
  await assertSucceeds(setDoc(doc(user(OWNER), 'inv/tc1'), { active: true, exp: Date.now() + 864e5, role: 'tcap', by: OWNER }));
  await tSeed('inv/tcold', { active: true, exp: Date.now() - 1000, role: 'tcap' });
  await assertSucceeds(setDoc(doc(cap('nt1'), 'members/u_nt1'), { role: 'tcap', name: 'Luis', inv: 'tc1', added: 1 }));
  await assertSucceeds(getDoc(doc(cap('nt1'), 'members/u_nt1')));
  await assertFails(setDoc(doc(cap('nt2'), 'members/u_nt2'), { role: 'tcap', name: 'Luis', inv: 'tcold', added: 1 }));
  await assertFails(setDoc(doc(cap('nt3'), 'members/u_nt3'), { role: 'tcap', name: 'Luis', inv: 'tc1', added: 1, scs: ['c-gabel'] }));
  await assertFails(setDoc(doc(cap('nt4'), 'members/u_nt4'), { role: 'tasis', name: 'Luis', inv: 'tc1', added: 1 }));
  // la invitación del tareo no sirve para entrar como capataz de un SC (aunque traiga scs) ni al revés
  await tSeed('inv/tc2', { active: true, exp: Date.now() + 864e5, role: 'tcap', scs: ['c-gabel'] });
  await assertFails(setDoc(doc(cap('nt5'), 'members/u_nt5'), { role: 'capataz', name: 'Ana', scs: ['c-gabel'], sc: 'c-gabel', inv: 'tc2', added: 1 }));
  await assertFails(setDoc(doc(cap('nt6'), 'members/u_nt6'), { role: 'tcap', name: 'Ana', inv: 'abc', added: 1 }));
  await tSeed('inv/cx', { active: true, exp: Date.now() + 864e5, role: 'capataz', scs: ['c-gabel'] });
  await assertSucceeds(setDoc(doc(cap('nt7'), 'members/u_nt7'), { role: 'capataz', name: 'Ana', scs: ['c-gabel'], sc: 'c-gabel', inv: 'cx', added: 1 }));
  // el tcap recién registrado puede cambiar solo su nombre
  await assertSucceeds(updateDoc(doc(cap('nt1'), 'members/u_nt1'), { name: 'Luis P.' }));
  await assertFails(updateDoc(doc(cap('nt1'), 'members/u_nt1'), { role: 'tasis' }));
});

// ── Cuentas de capataz del tareo (DNI + contraseña, docs/ia/tareo.md) ──
test('cuentas de capataz: solo la función crea <dni>@tareo.lps911.pe; la cuenta entra como tcap; desactivada (off) ya no entra al tareo', async () => {
  const M = '12345678@tareo.lps911.pe';
  // ni el administrador crea a mano un usuario con el dominio sintético (lo hace la función con el Admin SDK)
  await assertFails(setDoc(doc(user(OWNER), `members/${M}`), { role: 'tcap', name: 'Juan' }));
  await assertFails(setDoc(doc(user('tasis@obra.pe'), `members/${M}`), { role: 'tcap', name: 'Juan' }));
  await assertSucceeds(setDoc(doc(user(OWNER), 'members/nuevo@obra.pe'), { role: 'lector', name: 'Nuevo' }));
  // creada por la función: entra con su correo confirmado y es tcap (escribe su tareo, no lee LPS)
  await tSeed(`members/${M}`, { role: 'tcap', name: 'Juan Quispe', dni: '12345678', added: 1, by: OWNER });
  const c = user(M);
  const h = limaDay(0);
  await assertSucceeds(getDoc(doc(c, `members/${M}`)));
  await assertSucceeds(setDoc(doc(c, `tareo/${h}_${M}`), { date: h, cap: M, st: 'bor' }));
  await assertFails(getDoc(doc(c, 'acts/x1')));
  // el administrador puede cambiarla o quitarla desde Equipo
  await assertSucceeds(updateDoc(doc(user(OWNER), `members/${M}`), { name: 'Juan Q.' }));
  // desactivada: lee su propio registro (para el aviso) pero ya no lee ni escribe el tareo
  await tSeed(`members/${M}`, { role: 'tcap', name: 'Juan Quispe', dni: '12345678', off: true });
  await assertSucceeds(getDoc(doc(c, `members/${M}`)));
  await assertFails(getDoc(doc(c, `tareo/${h}_${M}`)));
  await assertFails(setDoc(doc(c, `tareo/${h}_${M}`), { date: h, cap: M, st: 'bor' }));
  // el enlace anónimo pasado a la cuenta (off + movTo) tampoco
  await tSeed('members/u_tcap1', { role: 'tcap', name: 'Pedro', off: true, movTo: M });
  await assertFails(getDoc(doc(cap('tcap1'), `tareo/${h}_u_tcap1`)));
  await assertSucceeds(getDoc(doc(cap('tcap1'), 'members/u_tcap1')));
});

// ── Tareo F3: publicación (tpub, tpubidx) solo la escribe la función publicarTareo; nadie deja un tareo «pub» desde la app ──
test('tareo F3: tpub y tpubidx los lee el módulo Tareo (también costos) y nadie los escribe desde la app', async () => {
  const f = limaDay(-1);
  await tSeed(`tpub/${f}_v1`, { fecha: f, v: 1, rows: [], tot: { hh: 0 } });
  await tSeed(`tpubidx/${f}`, { fecha: f, v: 1, vers: [{ v: 1, at: 1, by: OWNER, motivo: '' }], abierto: null });
  for (const db of [user('tcos@obra.pe'), user('tasis@obra.pe'), user('jefe@obra.pe'), user(OWNER), user('tcapm@obra.pe')]) {
    await assertSucceeds(getDoc(doc(db, `tpub/${f}_v1`)));
    await assertSucceeds(getDoc(doc(db, `tpubidx/${f}`)));
    await assertSucceeds(getDocs(collection(db, 'tpubidx')));
  }
  for (const db of [user('editor@obra.pe'), user('lector@obra.pe'), user('campo@obra.pe'), cap('cap1'), user('extrano@x.pe')]) {
    await assertFails(getDoc(doc(db, `tpub/${f}_v1`)));
    await assertFails(getDoc(doc(db, `tpubidx/${f}`)));
  }
  for (const db of [user(OWNER), user('jefe@obra.pe'), user('tasis@obra.pe'), user('tcos@obra.pe')]) {
    await assertFails(setDoc(doc(db, `tpub/${f}_v2`), { fecha: f, v: 2 }));
    await assertFails(updateDoc(doc(db, `tpub/${f}_v1`), { v: 5 }));
    await assertFails(deleteDoc(doc(db, `tpub/${f}_v1`)));
    await assertFails(setDoc(doc(db, `tpubidx/${f}`), { fecha: f, v: 2 }));
    await assertFails(updateDoc(doc(db, `tpubidx/${f}`), { abierto: { t: 1 } }));
  }
  // un editor con tpub desactivado (off) ya no lee
  await tSeed('members/jefe@obra.pe', { role: 'editor', name: 'Jefe', tpub: true, off: true });
  await assertFails(getDoc(doc(user('jefe@obra.pe'), `tpub/${f}_v1`)));
});
test('tareo F3: la oficina no publica (st pub / pubV) ni cambia un tareo publicado; el capataz tampoco', async () => {
  const h = limaDay(-1), id = `tareo/${h}_u_tcap1`, p = cap('tcap1'), a = user('tasis@obra.pe'), o = user(OWNER);
  await tSeed(id, { date: h, cap: 'u_tcap1', st: 'rev', rows: { '11111111': { as: true } }, hist: [] });
  // revisado → publicado: solo la función
  for (const db of [a, o]) {
    await assertFails(updateDoc(doc(db, id), { st: 'pub' }));
    await assertFails(updateDoc(doc(db, id), { st: 'pub', pubV: 1 }));
    await assertFails(updateDoc(doc(db, id), { pubV: 1 }));
    await assertFails(setDoc(doc(db, `tareo/${h}_x`), { date: h, cap: 'x', st: 'pub' }));
    await assertFails(setDoc(doc(db, `tareo/${h}_y`), { date: h, cap: 'y', st: 'rev', pubV: 1 }));
  }
  await assertSucceeds(updateDoc(doc(a, id), { st: 'env' })); // lo demás sigue igual
  // publicado (lo dejó la función): la oficina no lo toca, ni para reabrir ni para devolverlo a revisado
  await tSeed(id, { date: h, cap: 'u_tcap1', st: 'pub', pubV: 1, rows: { '11111111': { as: true } }, hist: [{ t: 1, by: OWNER, a: 'pub', v: 1 }] });
  for (const db of [a, o]) {
    await assertFails(updateDoc(doc(db, id), { st: 'rev' }));
    await assertFails(updateDoc(doc(db, id), { st: 'reab', reab: { t: 1, by: 'x', mot: 'm' } }));
    await assertFails(updateDoc(doc(db, id), { 'rows.11111111.as': false }));
    await assertFails(updateDoc(doc(db, id), { hist: arrayUnion({ t: 2, by: 'x', a: 'cor' }) }));
    await assertFails(deleteDoc(doc(db, id)));
  }
  // restaurar el mismo dato (respaldo sobre la misma obra) sí
  let cur = null;
  await env.withSecurityRulesDisabled(async c => { cur = (await getDoc(doc(c.firestore(), id))).data(); });
  await assertSucceeds(setDoc(doc(o, id), cur));
  await assertFails(updateDoc(doc(p, id), { st: 'env' }));
  // rectificado por la función (pub → rev, conserva pubV): la oficina vuelve a corregir, sin tocar pubV
  await tSeed(id, { date: h, cap: 'u_tcap1', st: 'rev', pubV: 1, rows: { '11111111': { as: true } }, hist: [] });
  await assertSucceeds(updateDoc(doc(a, id), { st: 'env', 'rows.11111111.as': false }));
  await assertFails(updateDoc(doc(a, id), { pubV: 2 }));
  await assertSucceeds(updateDoc(doc(a, id), { st: 'reab', reab: { t: 3, by: 'tasis@obra.pe', mot: 'm' } }));
  // el capataz corrige su reabierto sin tocar pubV ni ponerse 'pub' ni entradas «rect» en el historial
  await assertFails(updateDoc(doc(p, id), { pubV: 3 }));
  await assertFails(updateDoc(doc(p, id), { st: 'pub' }));
  await assertFails(updateDoc(doc(p, id), { hist: [{ t: 4, by: 'u_tcap1', a: 'rect' }] }));
  await assertSucceeds(updateDoc(doc(p, id), { st: 'env', hist: [{ t: 4, by: 'u_tcap1', a: 'env' }] }));
  // al crear, el capataz no trae pubV
  const h0 = limaDay(0);
  await assertFails(setDoc(doc(p, `tareo/${h0}_u_tcap1`), { date: h0, cap: 'u_tcap1', st: 'bor', pubV: 1 }));
  await assertSucceeds(setDoc(doc(p, `tareo/${h0}_u_tcap1`), { date: h0, cap: 'u_tcap1', st: 'bor' }));
});
// ── Jefe con edición completa (06-10-2026, tarde): el jefe con tpub edita los tareos como la oficina; no publica, no crea ──
test('tareo jefe: el editor con tpub coteja, corrige, marca y quita revisado, reabre y marca «prod»; no publica ni toca un publicado', async () => {
  const h = limaDay(-1), id = `tareo/${h}_u_tcap1`, j = user('jefe@obra.pe'), p = cap('tcap1'), J = 'jefe@obra.pe';
  const R0 = { '11111111': { as: true, h: { p10_05: 8.5 } } }, R1 = { '11111111': { as: true, h: { p10_05: 4.5, p10_10: 4 } }, '22222222': { as: true, h: { p10_05: 8.5 }, ajeno: true, capOrig: '' } };
  const H0 = [{ t: 1, by: 'u_tcap1', a: 'env' }];
  const seed = (st, x) => tSeed(id, { date: h, cap: 'u_tcap1', st, modo: 'hrs', pcs: ['p10_05'], rows: R0, foto: ['f1'], hist: H0, ...x });
  await seed('env');
  // cotejo de firmas y garita, corrección (agrega un obrero y mueve horas), revisado, quitar revisado, reabrir
  await assertSucceeds(updateDoc(doc(j, id), { cot: { '11111111': { fir: true, by: J, t: 2 } }, cotFot: ['f1'], hist: arrayUnion({ t: 2, by: J, a: 'fir' }) }));
  await assertSucceeds(updateDoc(doc(j, id), { rows: R1, pcs: ['p10_05', 'p10_10'], prod: { t: 3, by: J }, hist: arrayUnion({ t: 3, by: J, a: 'cor', mot: 'm' }) }));
  await assertSucceeds(updateDoc(doc(j, id), { st: 'rev', revAt: 4, revBy: J, hist: arrayUnion({ t: 4, by: J, a: 'rev' }) }));
  await assertSucceeds(updateDoc(doc(j, id), { rows: R0, prod: { t: 5, by: J }, hist: arrayUnion({ t: 5, by: J, a: 'prod', tot: true }) })); // producción: el estado no cambia
  await assertSucceeds(updateDoc(doc(j, id), { st: 'env', revAt: deleteField(), revBy: deleteField(), hist: arrayUnion({ t: 6, by: J, a: 'qrev', mot: 'm' }) }));
  await assertSucceeds(updateDoc(doc(j, id), { st: 'reab', reab: { t: 7, by: J, mot: 'm' }, prod: deleteField(), cot: deleteField(), cotFot: deleteField(), hist: arrayUnion({ t: 7, by: J, a: 'reab' }) }));
  // no publica: ni 'pub' ni pubV; un publicado no lo toca (para corregirlo: «Rectificar» en Publicación)
  await seed('rev');
  await assertFails(updateDoc(doc(j, id), { st: 'pub' }));
  await assertFails(updateDoc(doc(j, id), { st: 'pub', pubV: 1 }));
  await assertFails(updateDoc(doc(j, id), { pubV: 1 }));
  await seed('pub', { pubV: 1 });
  await assertFails(updateDoc(doc(j, id), { st: 'rev' }));
  await assertFails(updateDoc(doc(j, id), { rows: R1 }));
  // no crea tareos ni borra; no edita el máster, las partidas ni las fotos
  await assertFails(setDoc(doc(j, `tareo/${h}_u_otro`), { date: h, cap: 'u_otro', st: 'env' }));
  await assertFails(deleteDoc(doc(j, id)));
  await assertFails(setDoc(doc(j, 'tper/12345678'), PER('12345678')));
  await assertFails(updateDoc(doc(j, 'tpc/10.05'), { nom: 'x' }));
  // un editor sin tpub, o con tpub desactivado, no edita
  await seed('env');
  await assertFails(updateDoc(doc(user('editor@obra.pe'), id), { rows: R1 }));
  await tSeed('members/jefe@obra.pe', { role: 'editor', name: 'Jefe', tpub: true, off: true });
  await assertFails(updateDoc(doc(j, id), { rows: R1 }));
  await tSeed('members/jefe@obra.pe', { role: 'editor', name: 'Jefe de producción', tpub: true });
  // el capataz sigue sin poder ponerse «prod» ni entradas de producción (en su reabierto)
  await seed('reab');
  await assertFails(updateDoc(doc(p, id), { prod: { t: 8, by: 'u_tcap1' } }));
  await assertFails(updateDoc(doc(p, id), { hist: [...H0, { t: 8, by: 'u_tcap1', a: 'prod' }] }));
  await assertSucceeds(updateDoc(doc(p, id), { hist: [...H0, { t: 8, by: 'u_tcap1', a: 'env' }], st: 'env' }));
});

test('matriz de ambientes: la lee LPS; editan admin y editores con su correo; no se borra; la foto semanal no cambia', async () => {
  const ed = user('editor@obra.pe'), ow = user(OWNER), sc = user('sc@obra.pe'), lec = user('lector@obra.pe');
  await assertSucceeds(setDoc(doc(ow, 'mcat/k001'), { name: 'Espejos', sc: 'c-gabel', cl: 't', al: ['espejos'], ord: 10 }));
  await assertSucceeds(setDoc(doc(ed, 'mtipo/tp01'), { name: 'SS.HH.', acts: ['k001'], order: 10 }));
  await assertFails(setDoc(doc(sc, 'mcat/k002'), { name: 'Otra', sc: 'c-gabel', cl: 't' }));
  await assertSucceeds(getDoc(doc(lec, 'mcat/k001')));
  await assertSucceeds(getDoc(doc(sc, 'mtipo/tp01')));
  await assertFails(deleteDoc(doc(ow, 'mcat/k001')));
  await assertFails(deleteDoc(doc(ow, 'mtipo/tp01')));
  // estado por ambiente: con el correo de quien escribe
  await assertSucceeds(setDoc(doc(ed, 'mamb/a1'), { tipo: 'tp01', c: { k001: 't' }, by: 'editor@obra.pe', t: 1 }, { merge: true }));
  await assertFails(setDoc(doc(ed, 'mamb/a1'), { c: { k001: 'p' }, by: 'otro@obra.pe', t: 2 }, { merge: true }));
  await assertFails(setDoc(doc(user('campo@obra.pe'), 'mamb/a1'), { c: { k001: 'p' }, by: 'campo@obra.pe', t: 2 }, { merge: true }));
  await assertFails(setDoc(doc(sc, 'mamb/a2'), { c: { k001: 'p' }, by: 'sc@obra.pe', t: 2 }));
  await assertSucceeds(getDoc(doc(lec, 'mamb/a1')));
  await assertFails(deleteDoc(doc(ow, 'mamb/a1')));
  // foto semanal
  await assertSucceeds(setDoc(doc(ed, 'mver/f1'), { t: 1, d: '2026-10-08', by: 'editor@obra.pe', a: { a1: 'k001:t' } }));
  await assertFails(setDoc(doc(ed, 'mver/f2'), { t: 1, by: 'otro@obra.pe', a: {} }));
  await assertFails(updateDoc(doc(ed, 'mver/f1'), { a: {} }));
  await assertFails(deleteDoc(doc(ow, 'mver/f1')));
  await assertSucceeds(getDoc(doc(sc, 'mver/f1')));
});

test('propuestas al catálogo (mcatp): el SC propone de su partida; decide quien edita; no se borran', async () => {
  const sc = user('sc@obra.pe'), ed = user('editor@obra.pe');
  await assertSucceeds(setDoc(doc(sc, 'mcatp/p1'), { name: 'Espejos', sc: 'c-gabel', st: 'pend', by: 'sc@obra.pe', t: 1 }));
  await assertFails(setDoc(doc(sc, 'mcatp/p2'), { name: 'Otra', sc: 'c-otro', st: 'pend', by: 'sc@obra.pe', t: 1 }));
  await assertFails(setDoc(doc(sc, 'mcatp/p3'), { name: 'Otra', sc: 'c-gabel', st: 'ok', by: 'sc@obra.pe', t: 1 }));
  await assertFails(setDoc(doc(sc, 'mcatp/p4'), { name: 'Otra', sc: 'c-gabel', st: 'pend', by: 'otro@obra.pe', t: 1 }));
  await assertFails(updateDoc(doc(sc, 'mcatp/p1'), { st: 'ok' }));
  await assertSucceeds(updateDoc(doc(ed, 'mcatp/p1'), { st: 'ok', decBy: 'editor@obra.pe' }));
  await assertFails(deleteDoc(doc(user(OWNER), 'mcatp/p1')));
  await assertSucceeds(getDoc(doc(user('lector@obra.pe'), 'mcatp/p1')));
  await assertFails(setDoc(doc(user('lector@obra.pe'), 'mcatp/p5'), { name: 'x', sc: 'c-gabel', st: 'pend', by: 'lector@obra.pe', t: 1 }));
});

test('catálogo: el SC agrega actividades de su partida marcadas «por revisar»; no edita ni revisa', async () => {
  const sc = user('sc@obra.pe');
  await assertSucceeds(setDoc(doc(sc, 'mcat/k50'), { name: 'Pruebas', sc: 'c-gabel', cl: 't', al: ['pruebas'], by: 'sc@obra.pe', rev: { by: 'sc@obra.pe', t: 1, amb: 'a1', tipo: null } }));
  await assertFails(setDoc(doc(sc, 'mcat/k51'), { name: 'Sin revisar', sc: 'c-gabel', cl: 't', by: 'sc@obra.pe' }));
  await assertFails(setDoc(doc(sc, 'mcat/k52'), { name: 'Otra partida', sc: 'c-otro', cl: 't', by: 'sc@obra.pe', rev: { by: 'sc@obra.pe' } }));
  await assertFails(setDoc(doc(sc, 'mcat/k53'), { name: 'Otro autor', sc: 'c-gabel', cl: 't', by: 'otro@obra.pe', rev: { by: 'otro@obra.pe' } }));
  await assertFails(updateDoc(doc(sc, 'mcat/k50'), { name: 'Cambiada' }));
  await assertSucceeds(updateDoc(doc(user('editor@obra.pe'), 'mcat/k50'), { name: 'Pruebas de presión', revOk: { by: 'editor@obra.pe' } }));
});

test('matriz: el SC cambia una celda de su partida por vez (con k) junto con su constancia; no toca otras partidas', async () => {
  const sc = user('sc@obra.pe'), ed = user('editor@obra.pe');
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'mcat/kg'), { name: 'Pintura', sc: 'c-gabel', cl: 't' });
    await setDoc(doc(db, 'mcat/ko'), { name: 'Otra', sc: 'c-otro', cl: 't' });
    await setDoc(doc(db, 'mamb/a1'), { tipo: 'tp1', c: { ko: 'p' }, by: 'editor@obra.pe', t: 1 });
  });
  const meta = { by: 'sc@obra.pe', n: 'SC', t: 2 };
  const cm = { ...meta, sc: true };
  const log = (amb, cat, to, x = {}) => ({ amb, cat, sc: 'c-gabel', from: null, to, st: 'pend', ...meta, ...x });
  // celda + constancia en el mismo lote
  const ok = writeBatch(sc);
  ok.set(doc(sc, 'mamb/a1'), { c: { kg: 't' }, m: { kg: cm }, k: 'kg', l: 'l1', ...meta }, { merge: true });
  ok.set(doc(sc, 'mlog/l1'), log('a1', 'kg', 't'));
  await assertSucceeds(ok.commit());
  // auditoría 08/10 (M06): sin constancia, con una constancia vieja, de otro valor o firmando como ingeniero: no
  await assertFails(setDoc(doc(sc, 'mamb/a1'), { c: { kg: 'c' }, m: { kg: cm }, k: 'kg', ...meta }, { merge: true }));
  await assertFails(setDoc(doc(sc, 'mamb/a1'), { c: { kg: 'c' }, m: { kg: cm }, k: 'kg', l: 'l1', ...meta }, { merge: true }));
  const otroVal = writeBatch(sc);
  otroVal.set(doc(sc, 'mamb/a1'), { c: { kg: 'c' }, m: { kg: cm }, k: 'kg', l: 'l2', ...meta }, { merge: true });
  otroVal.set(doc(sc, 'mlog/l2'), log('a1', 'kg', 'p'));
  await assertFails(otroVal.commit());
  const firma = writeBatch(sc);
  firma.set(doc(sc, 'mamb/a1'), { c: { kg: 'c' }, m: { kg: { by: 'editor@obra.pe', n: 'Elena', t: 2 } }, k: 'kg', l: 'l3', ...meta }, { merge: true });
  firma.set(doc(sc, 'mlog/l3'), log('a1', 'kg', 'c'));
  await assertFails(firma.commit());
  const autoVisto = writeBatch(sc);
  autoVisto.set(doc(sc, 'mamb/a1'), { c: { kg: 'c' }, m: { kg: { ...cm, ok: { by: 'sc@obra.pe' } } }, k: 'kg', l: 'l4', ...meta }, { merge: true });
  autoVisto.set(doc(sc, 'mlog/l4'), log('a1', 'kg', 'c'));
  await assertFails(autoVisto.commit());
  // otra partida, dos celdas a la vez, valor raro o tocar el tipo: no
  const lote = (d, lid, to, cat = 'kg') => { const b = writeBatch(sc); b.set(doc(sc, 'mamb/a1'), { ...d, l: lid, ...meta }, { merge: true }); b.set(doc(sc, 'mlog/' + lid), log('a1', cat, to)); return b.commit(); };
  await assertFails(lote({ c: { ko: 't' }, m: { ko: cm }, k: 'ko' }, 'l5', 't', 'ko'));
  await assertFails(lote({ c: { kg: 'p', ko: 't' }, m: { kg: cm }, k: 'kg' }, 'l6', 'p'));
  await assertFails(lote({ c: { kg: 'x' }, m: { kg: cm }, k: 'kg' }, 'l7', 'x'));
  await assertFails(lote({ tipo: 'tp2', c: { kg: 'p' }, m: { kg: cm }, k: 'kg' }, 'l8', 'p'));
  // Deshacer: la celda vuelve y su constancia pasa a undo en el mismo lote (bk solo aquí)
  const un = writeBatch(sc);
  un.set(doc(sc, 'mamb/a1'), { c: { kg: deleteField() }, m: { kg: { ...cm, bk: true } }, k: 'kg', l: 'l1', ...meta }, { merge: true });
  un.update(doc(sc, 'mlog/l1'), { st: 'undo' });
  await assertSucceeds(un.commit());
  // ambiente nuevo
  const nuevo = writeBatch(sc);
  nuevo.set(doc(sc, 'mamb/a9'), { c: { kg: 'p' }, m: { kg: cm }, k: 'kg', l: 'l9', ...meta });
  nuevo.set(doc(sc, 'mlog/l9'), log('a9', 'kg', 'p'));
  await assertSucceeds(nuevo.commit());
  // constancia
  await assertFails(setDoc(doc(sc, 'mlog/m2'), { amb: 'a1', cat: 'ko', sc: 'c-otro', to: 't', st: 'pend', ...meta }));
  await assertFails(setDoc(doc(sc, 'mlog/m3'), { amb: 'a1', cat: 'kg', sc: 'c-gabel', to: 't', st: 'ok', ...meta }));
  await assertFails(updateDoc(doc(sc, 'mlog/l9'), { st: 'ok' }));
  await assertSucceeds(updateDoc(doc(ed, 'mlog/l9'), { st: 'ok', ok: { by: 'editor@obra.pe' } }));
  // el «Visto» del ingeniero queda en la celda
  await assertSucceeds(setDoc(doc(ed, 'mamb/a9'), { m: { kg: { ok: { by: 'editor@obra.pe' } } }, by: 'editor@obra.pe', t: 3 }, { merge: true }));
  await assertFails(deleteDoc(doc(user(OWNER), 'mlog/l9')));
});

test('matriz: una actividad de varios SC (scs) la llena también el SC sumado; el SC no se suma solo al crear', async () => {
  const sc = user('sc@obra.pe');
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, 'mcat/kx'), { name: 'Flashing', sc: 'c-otro', scs: ['c-gabel'], cl: 't' });
    await setDoc(doc(db, 'mcat/ky'), { name: 'Solo otro', sc: 'c-otro', cl: 't' });
  });
  const meta = { by: 'sc@obra.pe', n: 'SC', t: 2 };const cm = { ...meta, sc: true };
  const lote = (cat, lid) => { const b = writeBatch(sc); b.set(doc(sc, 'mamb/a5'), { c: { [cat]: 'c' }, m: { [cat]: cm }, k: cat, l: lid, ...meta }, { merge: true });
    b.set(doc(sc, 'mlog/' + lid), { amb: 'a5', cat, sc: 'c-gabel', from: null, to: 'c', st: 'pend', ...meta }); return b.commit(); };
  await assertSucceeds(lote('kx', 'x1'));
  await assertFails(lote('ky', 'x2'));
  await assertFails(setDoc(doc(sc, 'mcat/k60'), { name: 'Nueva', sc: 'c-gabel', scs: ['c-otro'], cl: 't', by: 'sc@obra.pe', rev: { by: 'sc@obra.pe' } }));
});
test('auditoría 09/10: semanas, fotos y configuración solo las borra el admin; el editor sí deshace lo que crea', async () => {
  await env.withSecurityRulesDisabled(async c => { const db = c.firestore();
    await setDoc(doc(db, 'weeks/90_p1'), { n: 90, pisoId: 'p1', frozenAt: 'x', items: {}, res: {} });
    await setDoc(doc(db, 'wsnap/90_p1'), { snap: {} }); await setDoc(doc(db, 'acts/a-nueva'), { name: 'x' }); });
  const ed = user('editor@obra.pe');
  await assertFails(deleteDoc(doc(ed, 'weeks/90_p1')));
  await assertFails(deleteDoc(doc(ed, 'wsnap/90_p1')));
  await assertFails(deleteDoc(doc(ed, 'meta/project')));
  await assertSucceeds(deleteDoc(doc(ed, 'acts/a-nueva')));
  await assertSucceeds(updateDoc(doc(ed, 'weeks/90_p1'), { 'res.x1.ok': true }));
  await assertSucceeds(deleteDoc(doc(user(OWNER), 'weeks/90_p1')));
});
test('auditoría 09/10: en liberaciones el SC no programa ni borra observaciones o historial', async () => {
  await env.withSecurityRulesDisabled(async c => { await setDoc(doc(c.firestore(), 'lib/l-obs2'), { actId: 'x1', sc: 'c-gabel', st: 'obs', by: 'sc@obra.pe', obs: [{ t: 'Fisura', ok: false }], hist: [{ st: 'sol' }, { st: 'obs' }] }); });
  const sc = user('sc@obra.pe');
  await assertFails(updateDoc(doc(sc, 'lib/l-obs2'), { obs: [] }));
  await assertFails(updateDoc(doc(sc, 'lib/l-obs2'), { hist: [] }));
  await assertFails(updateDoc(doc(sc, 'lib/l-obs2'), { prog: { d: '2026-10-02', h: '09:00', insp: 'yo' } }));
  await assertFails(updateDoc(doc(sc, 'lib/l-obs2'), { by: 'otro@obra.pe' }));
  // levantar: marca las observaciones y agrega al historial
  await assertSucceeds(updateDoc(doc(sc, 'lib/l-obs2'), { st: 'lev', obs: [{ t: 'Fisura', ok: true }], hist: [{ st: 'sol' }, { st: 'obs' }, { st: 'lev' }] }));
});
