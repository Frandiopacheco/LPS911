/* Firebase falso, en memoria, para las pruebas de la interfaz.
   Se inyecta en el navegador en lugar de los scripts de gstatic. Imita lo que la app usa de
   la versión "compat": auth, firestore (colecciones, documentos, where, onSnapshot, set/update/delete).
   Los datos de la obra de prueba están en SEED; la sesión se elige con window.__E2E = {user}.
   La base se guarda en sessionStorage para sobrevivir a una recarga (por ejemplo, "Ver como"). */
/* la app usa ventanas propias (uiAsk); en las pruebas pasan por confirm/prompt del navegador para contestarlas con page.on('dialog') (ver uiask.spec.js para la ventana real) */
window.__uiAskNative = true;
(function () {
  const E = window.__E2E || {};
  const T = E.today || '2026-10-01', TM = E.tomorrow || '2026-10-02';
  const KEY = 'e2e.db';
  const DEL = { __del: true }, TS = { __ts: true };
  const DB = {};
  const col = n => (DB[n] = DB[n] || new Map());
  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  window.__DB = DB;
  window.__dbGet = (c, id) => clone(col(c).get(id));
  window.__dbAll = c => Object.fromEntries([...col(c).entries()].map(([k, v]) => [k, clone(v)]));
  const persist = () => { try { const o = {}; for (const [k, m] of Object.entries(DB)) o[k] = [...m.entries()]; sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };

  function seed() {
    const S = (c, id, d) => col(c).set(id, d);
    const day = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    S('members', 'frandiopacheco@gmail.com', { role: 'admin', name: 'Frandio Admin' });
    S('members', 'editor@obra.pe', { role: 'editor', name: 'Elena Editora', pisos: ['p1'] });
    S('members', 'campo@obra.pe', { role: 'campo', name: 'Carlos Campo' });
    S('members', 'sc@obra.pe', { role: 'sc', name: 'Sandra Sanitarias', sc: 'c1', scs: ['c1'] });
    S('members', 'calidad@obra.pe', { role: 'area', name: 'Quique Calidad', area: 'Calidad' });
    S('members', 'ot@obra.pe', { role: 'area', name: 'Olga OT', area: 'Oficina Técnica' });
    S('members', 'lector@obra.pe', { role: 'lector', name: 'Luis Lector' });
    S('members', 'veedor@obra.pe', { role: 'veedor', name: 'Vero Veedora' });
    S('members', 'planner@obra.pe', { role: 'planner', name: 'Pablo Planner' });
    S('members', 'u_cap1', { role: 'capataz', name: 'Pedro Capataz', sc: 'c1', scs: ['c1'] });
    /* módulo Tareo (docs/ia/tareo.md): roles de solo tareo y un editor jefe de producción que publica el tareo */
    S('members', 'tcap@obra.pe', { role: 'tcap', name: 'Teodoro Capataz' });
    S('members', 'tasis@obra.pe', { role: 'tasis', name: 'Tania Asistente' });
    S('members', 'tcos@obra.pe', { role: 'tcos', name: 'Cosme Costos' });
    S('members', 'jefe@obra.pe', { role: 'editor', name: 'Jaime Jefe', tpub: true });
    S('meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' });
    S('pisos', 'p1', { code: 'P1', name: 'Primer piso', order: 1, resp: ['editor@obra.pe'] });
    S('pisos', 'p2', { code: 'P2', name: 'Segundo piso', order: 2 });
    S('sectors', 's1', { pisoId: 'p1', code: 'S1', name: 'Sector 1', order: 1 });
    S('sectors', 's2', { pisoId: 'p2', code: 'S2', name: 'Sector 2', order: 1 });
    ['a1', 'a2', 'a3'].forEach((a, i) => S('ambientes', a, { sectorId: i < 2 ? 's1' : 's2', code: 'A-' + (i + 1), name: 'Dpto ' + (101 + i), order: i }));
    S('contractors', 'c1', { name: 'SC SANITARIAS', partida: 'IISS', color: '#336699' });
    S('contractors', 'c2', { name: 'SC ELECTRICAS', partida: 'IIEE', color: '#aa6633' });
    S('contractors', 'c3', { name: 'SC TARRAJEO', partida: 'Tarrajeo', color: '#558855' });
    ['a1', 'a2', 'a3'].forEach((a, i) => {
      S('acts', 'i' + i, { ambId: a, sc: 'c1', name: i === 2 ? 'REDES EMPOTRADAS' : 'Redes empotradas', und: 'pto', metrado: 20, days: [day(T, -1), T], order: 10 });
      S('acts', 'e' + i, { ambId: a, sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, days: [T, TM], order: 20 });
      S('acts', 't' + i, { ambId: a, sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: [day(T, 5), day(T, 6)], order: 30 });
    });
    S('restr', 'r1', { actId: 't0', pisoId: 'p1', type: 'Materiales', desc: 'Falta arena fina', resp: 'SC TARRAJEO', need: day(T, 4), freed: '', status: 'pend', created: day(T, -2), sc: 'c3', by: 'frandiopacheco@gmail.com' });
    S('daily', day(T, -1) + '_p1', { date: day(T, -1), pisoId: 'p1', recs: { i0: { status: 'ok', sc: 'c1', nm: 'Redes empotradas', ambId: 'a1', by: 'campo@obra.pe', ts: 1 }, i1: { status: 'no', cnc: 'Materiales', note: 'No llegó tubería', sc: 'c1', nm: 'Redes empotradas', ambId: 'a2', by: 'campo@obra.pe', ts: 1 } }, extra: {} });
    S('libm', 'main', { rules: [{ id: 'r1', keys: ['c1|redes empotradas'], sc: 'c1', act: 'Redes empotradas', crit: true, rest: ['c3|tarrajeo de muros'], restName: 'Tarrajeo de muros', sup: true, proto: '', ant: 1 }], insp: ['Ing. Uno', 'Ing. Dos'], ign: [], ex: {} });
    const L = (id, o) => S('lib', id, { actId: 'i0', ambId: 'a1', pisoId: 'p1', sc: 'c1', nm: 'Redes empotradas', rule: 'r1', crit: true, sup: true, rest: 'Tarrajeo de muros', need: TM, slot: 'am', note: '', proto: [], photos: [], obs: [], hist: [], by: 'x', n: 'X', ts: 1, ...o });
    L('Lsol', { st: 'sol' });
    L('Lpro', { actId: 'i1', ambId: 'a2', st: 'pro', prog: { d: TM, h: '09:00', insp: 'Ing. Uno' } });
    L('Lbad', { actId: 'e0', st: 'pro', prog: null });
    L('Lobs', { actId: 'e1', ambId: 'a2', st: 'obs', obs: [{ t: 'Fuga', ok: false }], prog: { d: T, h: '10:00', insp: 'Ing. Dos' } });
    L('Llev', { actId: 'e2', ambId: 'a3', pisoId: 'p2', st: 'lev', prog: { d: T, h: '11:00', insp: 'Ing. Dos' } });
    L('Llib', { actId: 'i2', ambId: 'a3', pisoId: 'p2', st: 'lib', done: { t: 1, n: 'Q' }, prog: { d: T, h: '08:00', insp: 'Ing. Uno' } });
    L('Lanu', { actId: 't0', st: 'anu' });
    (E.extra || []).forEach(([c, id, d]) => S(c, id, d));
  }
  let restored = false;
  try { const raw = sessionStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); for (const [k, ents] of Object.entries(o)) DB[k] = new Map(ents); restored = true; } } catch (e) {}
  if (!restored) { seed(); persist(); }

  // --- valores especiales y escritura ---
  const now = () => Date.now();
  /* como Firestore: una lista dentro de otra no se puede guardar (invalid-argument) */
  function nestedArr(v, inArr) { if (Array.isArray(v)) { if (inArr) return true; return v.some(x => nestedArr(x, true)); } if (v && typeof v === 'object' && !(v instanceof FP) && !v.__au && !v.__ar) return Object.values(v).some(x => nestedArr(x, false)); return false; }
  function chkData(d) { if (nestedArr(d, false)) { const e = new Error('Nested arrays are not supported'); e.code = 'invalid-argument'; throw e; } }
  function resolve(v) {
    if (v === TS) return now();
    if (v && v.__au) return [...new Set(v.__au)];
    if (v && v.__ar) return [];
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === 'object' && !(v instanceof FP)) { const o = {}; for (const [k, x] of Object.entries(v)) if (x !== DEL) o[k] = resolve(x); return o; }
    return v;
  }
  function deepMerge(a, b) {
    const out = { ...(a || {}) };
    for (const [k, v] of Object.entries(b)) {
      if (v === DEL) { delete out[k]; continue; }
      if (v && (v.__au || v.__ar)) { out[k] = arrOp(out[k], v); continue; }
      if (v && typeof v === 'object' && !Array.isArray(v) && v !== TS) out[k] = deepMerge(out[k] && typeof out[k] === 'object' && !Array.isArray(out[k]) ? out[k] : {}, v);
      else out[k] = resolve(v);
    }
    return out;
  }
  function setPath(o, path, v) {
    let cur = o;
    for (let i = 0; i < path.length - 1; i++) { if (!cur[path[i]] || typeof cur[path[i]] !== 'object') cur[path[i]] = {}; cur = cur[path[i]]; }
    const k = path[path.length - 1];
    if (v === DEL) delete cur[k]; else if (v && (v.__au || v.__ar)) cur[k] = arrOp(cur[k], v); else cur[k] = resolve(v);
  }
  class FP { constructor(...p) { this.p = p; } }
  /* arrayUnion / arrayRemove como en Firestore: agregan sin repetir al final, o quitan */
  function arrOp(cur, v) { const a = Array.isArray(cur) ? cur : []; return v.__au ? [...a, ...v.__au.filter(x => !a.includes(x))] : a.filter(x => !v.__ar.includes(x)); }

  // --- suscripciones ---
  const subs = new Set();
  /* un lote (batch) avisa una sola vez al terminar, como Firestore */
  let hold = null, holdN = 0;
  const changed = n => { if (hold) { hold.add(n); return; } persist(); for (const s of [...subs]) if (s.n === n) setTimeout(s.fire, 0); };
  const docSnap = (n, id) => { const d = col(n).get(id); return { id, exists: d !== undefined, data: () => clone(d), get: k => (d || {})[k], metadata: { hasPendingWrites: false, fromCache: false }, ref: docRef(n, id) }; };
  const ops = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '!=': (a, b) => a !== b,
    in: (a, b) => (b || []).includes(a), 'array-contains': (a, b) => Array.isArray(a) && a.includes(b) };
  function qSnap(n, filters, lim) {
    let docs = [...col(n).keys()].map(id => docSnap(n, id)).filter(s => filters.every(([f, op, v]) => ops[op]((s.data() || {})[f], v)));
    if (lim) docs = docs.slice(0, lim);
    return { docs, size: docs.length, empty: !docs.length, forEach(f) { docs.forEach(f); }, docChanges: () => docs.map(doc => ({ type: 'added', doc })), metadata: { hasPendingWrites: false, fromCache: false } };
  }
  const cbOf = a => a.find(f => typeof f === 'function');
  function docRef(n, id) {
    return {
      id, path: n + '/' + id,
      collection: sub => colRef(n + '/' + id + '/' + sub),
      get: async () => docSnap(n, id),
      set: async (d, o) => { chkData(d); col(n).set(id, o && o.merge ? deepMerge(col(n).get(id), d) : resolve(d)); changed(n); },
      update: async (...a) => {
        if (!col(n).has(id)) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
        if (a.length === 1) chkData(a[0]); else for (let i = 1; i < a.length; i += 2) chkData({ v: a[i] });
        const cur = clone(col(n).get(id)) || {};
        if (a.length === 1) for (const [k, v] of Object.entries(a[0])) setPath(cur, k.split('.'), v);
        else for (let i = 0; i < a.length; i += 2) setPath(cur, a[i] instanceof FP ? a[i].p : String(a[i]).split('.'), a[i + 1]);
        col(n).set(id, cur); changed(n);
      },
      delete: async () => { col(n).delete(id); changed(n); },
      onSnapshot(...a) { const cb = cbOf(a); const s = { n, fire: () => cb(docSnap(n, id)) }; subs.add(s); setTimeout(s.fire, 0); return () => subs.delete(s); },
    };
  }
  function colRef(n, filters = [], lim = 0) {
    const q = {
      id: n, path: n,
      doc: id => docRef(n, id || 'id' + Math.random().toString(36).slice(2, 12)),
      add: async d => { const id = 'id' + Math.random().toString(36).slice(2, 12); col(n).set(id, resolve(d)); changed(n); return docRef(n, id); },
      where: (f, op, v) => colRef(n, [...filters, [f, op, v]], lim),
      orderBy: () => q, limit: k => colRef(n, filters, k), startAt: () => q, startAfter: () => q, endAt: () => q,
      get: async () => qSnap(n, filters, lim),
      onSnapshot(...a) { const cb = cbOf(a); const s = { n, fire: () => cb(qSnap(n, filters, lim)) }; subs.add(s); setTimeout(s.fire, 0); return () => subs.delete(s); },
    };
    return q;
  }
  function batch() {
    const L = [];
    return { set: (r, d, o) => L.push(() => r.set(d, o)), update: (r, ...a) => L.push(() => r.update(...a)), delete: r => L.push(() => r.delete()), commit: async () => { hold = hold || new Set(); holdN++; try { for (const f of L) await f(); } finally { if (--holdN === 0) { const h = hold; hold = null; h.forEach(n => changed(n)); } } } };
  }
  const fs = { collection: n => colRef(n), doc: p => { const [c, id] = p.split('/'); return docRef(c, id); }, batch, enablePersistence: async () => {}, useEmulator() {},
    runTransaction: async fn => fn({ get: r => r.get(), set: (r, d, o) => r.set(d, o), update: (r, ...a) => r.update(...a), delete: r => r.delete() }) };

  // --- sesión ---
  const AKEY = 'e2e.auth';
  const AUTHU = (() => { try { const o = JSON.parse(sessionStorage.getItem(AKEY) || 'null'); if (o) return o; } catch (e) {} return { ...(E.authUsers || {}) }; })();
  const aPersist = () => { try { sessionStorage.setItem(AKEY, JSON.stringify(AUTHU)); } catch (e) {} };
  window.__authUsers = () => clone(AUTHU);
  const U = E.user === null ? null : (E.user || { uid: 'u-admin', email: 'frandiopacheco@gmail.com', emailVerified: true });
  const authCbs = [];
  const auth = {
    currentUser: U ? { ...U, delete: async () => {}, getIdToken: async () => 'x', reload: async () => {} } : null,
    onAuthStateChanged(cb) { authCbs.push(cb); setTimeout(() => cb(auth.currentUser), 5); return () => {}; },
    signOut: async () => { auth.currentUser = null; authCbs.forEach(cb => cb(null)); },
    /* cuentas con contraseña: las de E.authUsers {correo: {uid, pass, disabled}} y las que crea el stub de cuentaCapataz (abajo) */
    signInWithEmailAndPassword: async (email, pass) => {
      const a = AUTHU[String(email || '').toLowerCase()];
      if (!a || a.pass !== pass) throw Object.assign(new Error('prueba'), { code: a ? 'auth/wrong-password' : 'auth/invalid-credential' });
      if (a.disabled) throw Object.assign(new Error('prueba'), { code: 'auth/user-disabled' });
      auth.currentUser = { uid: a.uid, email: String(email).toLowerCase(), emailVerified: true, delete: async () => {}, getIdToken: async () => 'x', reload: async () => {} };
      authCbs.forEach(cb => cb(auth.currentUser)); return { user: auth.currentUser };
    },
    createUserWithEmailAndPassword: async () => { throw Object.assign(new Error('prueba'), { code: 'auth/operation-not-allowed' }); },
    sendPasswordResetEmail: async () => {}, useEmulator() {},
    /* ingreso con enlace de invitación (capataz): usuario anónimo nuevo (uid de E.anonUid o 'anon1') */
    signInAnonymously: async () => {
      auth.currentUser = { uid: E.anonUid || 'anon1', email: null, isAnonymous: true, emailVerified: false, delete: async () => {}, getIdToken: async () => 'x', reload: async () => {} };
      authCbs.forEach(cb => cb(auth.currentUser)); return { user: auth.currentUser };
    },
  };
  /* Cloud Functions invocables (compat: firebase.functions().httpsCallable(name)). Solo cuentaCapataz, simulada contra la base falsa
     con la misma lógica que functions/index.js (lo comprueba functions/test con la lógica pura). Llamadas en window.__fnCalls. */
  const fnErr = (code, message) => Object.assign(new Error(message), { code: 'functions/' + code });
  const FN = {
    async cuentaCapataz(d) {
      const me = auth.currentUser; const em = String(me && me.email || '').toLowerCase(); const cm = col('members').get(em);
      if (!(em === 'frandiopacheco@gmail.com' || (cm && !cm.off && ['admin', 'tasis'].includes(cm.role)))) throw fnErr('permission-denied', 'Solo el administrador o el asistente de tareo pueden crear cuentas de capataz.');
      let dni = String(d.dni || '').trim().toUpperCase(); if (/^\d{7}$/.test(dni)) dni = '0' + dni;
      if (!/^[A-Z0-9]{8,12}$/.test(dni)) throw fnErr('invalid-argument', 'El DNI no es válido.');
      const mail = dni.toLowerCase() + '@tareo.lps911.pe'; const f = col('tper').get(dni);
      if (!f) throw fnErr('not-found', `No hay una ficha con el DNI ${dni} en el máster de personal.`);
      if (['crear', 'clave'].includes(d.accion) && !(typeof d.clave === 'string' && d.clave.length >= 6)) throw fnErr('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
      const res = { mail, dni, n: 0 }; const now = Date.now();
      const migrar = de => { const o = col('members').get(de); if (!o || o.role !== 'tcap') throw fnErr('failed-precondition', 'El capataz anterior no existe.');
        for (const [id, p] of col('tper')) if (p.cap === de) { col('tper').set(id, { ...p, cap: mail, by: em, ts: now }); res.n++; }
        col('members').set(de, { ...o, off: true, offAt: now, offBy: em, movTo: mail }); res.de = de; };
      if (d.accion === 'crear') {
        const t = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
        const name = [t(f.nom), t(f.ape)].filter(Boolean).join(' ') || 'Capataz'; const m0 = col('members').get(mail);
        AUTHU[mail] = { uid: (AUTHU[mail] && AUTHU[mail].uid) || 'ct_' + dni, pass: d.clave, disabled: false }; aPersist();
        const m1 = { ...(m0 || {}), role: 'tcap', name: (m0 && m0.name) || name, dni, added: (m0 && m0.added) || now, by: em }; delete m1.off; delete m1.offAt; delete m1.offBy;
        col('members').set(mail, m1); col('tper').set(dni, { ...f, cta: mail });
        if (d.de) migrar(d.de);
      } else if (d.accion === 'clave') { if (!AUTHU[mail]) throw fnErr('not-found', 'Ese capataz todavía no tiene cuenta.'); AUTHU[mail].pass = d.clave; aPersist(); }
      else if (d.accion === 'desactivar') { if (AUTHU[mail]) { AUTHU[mail].disabled = true; aPersist(); } const m = col('members').get(mail); if (m) col('members').set(mail, { ...m, off: true, offAt: now, offBy: em }); }
      else if (d.accion === 'migrar') migrar(d.de);
      else throw fnErr('invalid-argument', 'Acción no válida.');
      changed('members'); changed('tper');
      return res;
    },
  };
  window.__fnCalls = [];
  const functions = () => ({ httpsCallable: name => async data => { window.__fnCalls.push({ name, data: clone(data) }); if (!FN[name]) throw fnErr('not-found', 'NOT_FOUND'); return { data: await FN[name](clone(data) || {}) }; } });
  window.firebase = {
    functions,
    initializeApp() {}, apps: [],
    auth: Object.assign(() => auth, { GoogleAuthProvider: class {} }),
    firestore: Object.assign(() => fs, { FieldValue: { serverTimestamp: () => TS, delete: () => DEL, arrayUnion: (...v) => ({ __au: v }), arrayRemove: (...v) => ({ __ar: v }), increment: n => n }, FieldPath: FP }),
    database: Object.assign(() => ({ ref: () => ({ on() {}, off() {}, set: async () => {}, remove: async () => {}, onDisconnect: () => ({ remove: async () => {} }) }) }), { ServerValue: { TIMESTAMP: 0 } }),
  };
})();
