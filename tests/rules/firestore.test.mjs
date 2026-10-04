// Pruebas de las reglas de Firestore (se ejecutan en GitHub con el emulador oficial).
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteDoc } from 'firebase/firestore';

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
    await S('members/campo@obra.pe', { role: 'campo', name: 'Jefe de campo' });
    await S('members/sc@obra.pe', { role: 'sc', name: 'SC Gabel', sc: 'c-gabel', scs: ['c-gabel'] });
    await S('members/lector@obra.pe', { role: 'lector', name: 'Lector' });
    await S('members/ot@obra.pe', { role: 'area', name: 'Jefe OT', area: 'OT' });
    await S('members/veedor@obra.pe', { role: 'veedor', name: 'Veedor' });
    await S('members/editor2@obra.pe', { role: 'editor', name: 'Editor designado', cli: true });
    await S('members/campo2@obra.pe', { role: 'campo', name: 'Campo designado', cli: true });
    await S('members/sc2@obra.pe', { role: 'sc', name: 'SC con marca', sc: 'c-gabel', scs: ['c-gabel'], cli: true });
    await S('members/calidad@obra.pe', { role: 'area', name: 'Ing. Calidad', area: 'Calidad' });
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
    await S('restr/r-ed', { actId: 'x1', sc: 'c-gabel', by: 'editor@obra.pe', status: 'pend', freed: '' });
    await S('restr/r-sc', { actId: 'x1', sc: 'c-gabel', by: 'sc@obra.pe', status: 'pend', freed: '' });
    await S('pzon/x1', { pisoId: 'p1', sc: 'c-gabel', pts: [] });
    await S('pzon/x2', { pisoId: 'p1', sc: 'c-otro', pts: [] });
    await S('live/2026-10-01_x1', { date: '2026-10-01', actId: 'x1', sc: 'c-gabel' });
    await S('live/2026-10-01_x9', { date: '2026-10-01', actId: 'x9', sc: 'c-otro' });
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
test('subcontratista: inicia y detiene sus actividades, pero no cierra el día', async () => {
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { st: 'run', sc: 'c-gabel' }));
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { st: 'stop', mot: 'Falta material', sc: 'c-gabel' }));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x4'), { sc: 'c-gabel', st: 'run' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x9'), { st: 'run' }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x5'), { sc: 'c-otro', st: 'run' }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1'), { close: { status: 'ok' } }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x6'), { sc: 'c-gabel', close: { status: 'ok' } }));
  await assertFails(deleteDoc(doc(user('sc@obra.pe'), 'live/2026-10-01_x1')));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'fotos/fsc'), { data: 'x'.repeat(1000) }));
  await assertFails(setDoc(doc(user('lector@obra.pe'), 'live/2026-10-01_x7'), { sc: 'c-gabel', st: 'run' }));
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
  await assertSucceeds(setDoc(doc(ot, 'fotos/f-ot'), { data: 'x'.repeat(1000) }));
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
test('matriz de liberaciones: la editan Calidad y el administrador', async () => {
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
  await assertSucceeds(setDoc(doc(user('veedor@obra.pe'), 'fotos/f-v'), { data: 'abc', date: '2026-10-01' }));
  await assertFails(setDoc(doc(user('veedor@obra.pe'), 'daily/2026-10-01_p1'), { date: '2026-10-01', pisoId: 'p1', recs: {} }));
});
test('propuestas: el SC solo escribe la de su partida', async () => {
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'lhprop/c-gabel'), { sc: 'c-gabel', items: {} }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'lhprop/c-otro'), { sc: 'c-otro', items: {} }));
  await assertSucceeds(setDoc(doc(user('editor@obra.pe'), 'lhprop/c-otro'), { sc: 'c-otro', items: {} }));
});
test('última zona (pzon): el SC solo la de sus actividades', async () => {
  await assertSucceeds(updateDoc(doc(user('sc@obra.pe'), 'pzon/x1'), { sc: 'c-gabel', pts: [1] }));
  await assertFails(updateDoc(doc(user('sc@obra.pe'), 'pzon/x2'), { sc: 'c-gabel', pts: [1] }));
  await assertFails(setDoc(doc(user('sc@obra.pe'), 'pzon/x5'), { sc: 'c-otro', pts: [1] }));
  await assertSucceeds(setDoc(doc(user('sc@obra.pe'), 'pzon/x6'), { sc: 'c-gabel', pts: [1] }));
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
  await assertSucceeds(setDoc(doc(sc, 'pdz/dp2'), { date: '2026-10-02', pisoId: 'p1', sc: 'c-gabel', kind: 'dprop', actId: 'x1', k: 'res', desc: 'falta', st: 'pend' }));
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
  await assertSucceeds(setDoc(doc(cap('cap1'), 'fotos/f1'), { data: 'x'.repeat(1000) }));
  await assertFails(setDoc(doc(cap('cap1'), 'fotos/f2'), { data: 'x'.repeat(400001) }));
  await assertFails(deleteDoc(doc(cap('cap1'), 'fotos/f1')));
});
