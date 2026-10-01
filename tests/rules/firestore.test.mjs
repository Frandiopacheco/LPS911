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
    await S('members/u_cap1', { role: 'capataz', name: 'Juan', sc: 'c-gabel', scs: ['c-gabel'] });
    await S('inv/abc', { active: true, exp: Date.now() + 864e5, scs: ['c-gabel'] });
    await S('inv/old', { active: true, exp: Date.now() - 1000, scs: ['c-gabel'] });
    await S('acts/x1', { name: 'Pintura', sc: 'c-gabel', ambId: 'a1' });
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
