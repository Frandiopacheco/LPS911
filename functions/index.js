// Tareas automáticas en el servidor (Cloud Functions, se instalan solas desde GitHub).
// - versionDominical: cada domingo 12:00 (Lima) guarda la versión automática del lookahead,
//   aunque nadie tenga la página abierta.
// - aceptarCierres: cada noche registra los cierres de capataces que nadie revisó en 2 días.
// - congelarSemana: en el corte semanal (por defecto sábado 13:00 de Lima) congela la semana siguiente en los pisos que
//   nadie congeló a mano; si la tarea se atrasa, lo intenta hasta el lunes.
// - cerrarPlan: a la hora de Configuración (por defecto 21:00, Lima), en los pisos donde nadie publicó el plan del día hábil siguiente, publica los borradores de la
//   reunión, rechaza las propuestas del SC sin revisar y cierra el plan (dplan).
// - cuentaCapataz (la llama la página): crea y administra las cuentas DNI + contraseña de los capataces del tareo.
// - publicarTareo (la llama la página): previa, publicación y rectificación del tareo del día (F3).
'use strict';
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { planCutHH, planCutDue, buildVersion, closesToAccept, acceptCloses, limaToday, addD, weeksToFreeze, doneMap, buildFreeze, propCutTs, nextWork, buildDayPlan, pendProps, closePlanPiso, ctaPedido, ctaPuede, ctaNombre, ctaMigrables, tpPuede, tpPedido, tpEjecutar } = require('./lib');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 1, memory: '256MiB', timeoutSeconds: 300 });
const db = () => admin.firestore();
const all = async name => { const m = new Map(); (await db().collection(name).get()).docs.forEach(d => m.set(d.id, { ...d.data(), id: d.id })); return m; };

exports.versionDominical = onSchedule({ schedule: '5 12 * * 0', timeZone: 'America/Lima', retryCount: 2 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  if (!project.refDate) { logger.warn('Sin meta/project.refDate: no se guarda versión'); return; }
  const v = buildVersion({ project, pisos: await all('pisos'), sectors: await all('sectors'), ambientes: await all('ambientes'), acts: await all('acts') });
  if (!v) { logger.info('Sin pisos: nada que guardar'); return; }
  const idxRef = db().collection('lhidx').doc(v.id);
  if ((await idxRef.get()).exists) { logger.info(`La versión ${v.id} ya existe (la guardó la página)`); return; }
  for (let i = 0; i < v.docs.length; i += 8) {
    const b = db().batch();
    v.docs.slice(i, i + 8).forEach(([k, d]) => b.set(db().collection('lhver').doc(k), d));
    await b.commit();
  }
  await idxRef.set(v.idx);
  logger.info(`Versión ${v.id} guardada: ${v.docs.length} pisos`);
});

exports.aceptarCierres = onSchedule({ schedule: '30 23 * * *', timeZone: 'America/Lima', retryCount: 2 }, async () => {
  const today = limaToday();
  const from = addD(today, -30);
  const lives = (await db().collection('live').where('date', '>=', from).where('date', '<=', addD(today, -2)).get()).docs.map(d => ({ ...d.data(), id: d.id }));
  if (!lives.length) { logger.info('Sin reportes en vivo pendientes'); return; }
  const daily = new Map((await db().collection('daily').where('date', '>=', from).get()).docs.map(d => [d.id, d.data()]));
  const acts = new Map();
  const need = [...new Set(lives.map(l => l.actId))];
  for (let i = 0; i < need.length; i += 100) {
    const refs = need.slice(i, i + 100).map(id => db().collection('acts').doc(id));
    (await db().getAll(...refs)).forEach(d => { if (d.exists) acts.set(d.id, d.data()); });
  }
  const dplans = new Map((await db().collection('dplan').where('date', '>=', from).get()).docs.map(d => [d.id, d.data()]));
  const L = closesToAccept(lives, daily, acts, today, dplans);
  /* cada cierre se confirma releyendo su registro: lo que un ingeniero verificó mientras tanto no se pisa */
  const { n, skip } = await acceptCloses(db(), L);
  logger.info(`Cierres registrados automáticamente: ${n}${skip ? ` (${skip} ya revisados por un ingeniero, sin cambios)` : ''}`);
});

/* Cada 15 minutos mira si ya pasó el corte de la semana que viene; fuera de esa ventana solo lee meta/project. */
exports.congelarSemana = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now();
  const W = weeksToFreeze(project, now);
  if (!W.length) return;
  const pisos = await all('pisos');
  const vivos = [...pisos.values()].filter(p => !p.arch);
  for (const n of W) {
    /* ya se hizo esta semana (frz/<n>): no se vuelve a leer todo cada 15 minutos */
    const fref = db().collection('frz').doc(String(n));
    if ((await fref.get()).exists) continue;
    const refs = vivos.map(p => db().collection('weeks').doc(n + '_' + p.id));
    const snaps = refs.length ? await db().getAll(...refs) : [];
    /* descongelada a propósito después del corte (unfrozenAt) = alguien la está corrigiendo: no se vuelve a congelar sola */
    const cut = propCutTs(project, n); const held = x => !!x && (!!x.frozenAt || (!!x.unfrozenAt && Date.parse(x.unfrozenAt) >= cut));
    const skip = new Set(snaps.filter(d => d.exists && held(d.data())).map(d => d.id));
    if (vivos.length && skip.size === snaps.length) { await fref.set({ at: new Date(now).toISOString(), n, k: 0, nota: 'todos los pisos ya estaban congelados' }); continue; }
    const today = limaToday(now);
    const [sectors, ambientes, acts, didx, daily, lives, props] = await Promise.all([all('sectors'), all('ambientes'), all('acts'), all('doneidx'),
      db().collection('daily').where('date', '>=', addD(today, -120)).get(), db().collection('live').where('date', '>=', addD(today, -30)).get(), all('lhprop')]);
    const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(d => d.data()), lives: lives.docs.map(d => d.data()), acts });
    const L = buildFreeze({ project, pisos, sectors, ambientes, acts, done, props: [...props.values()] }, n, new Date(now).toISOString());
    let k = 0;
    for (const o of L) {
      if (skip.has(o.id)) continue;
      const ref = db().collection('weeks').doc(o.id);
      /* como «Congelar» de la página: si alguien ya lo congeló (o lo hizo mientras corría), se respeta su versión */
      const wrote = await db().runTransaction(async tx => { const d = await tx.get(ref); if (d.exists && held(d.data())) return false; tx.set(ref, o.doc); return true; });
      if (wrote) k++;
    }
    await fref.set({ at: new Date(now).toISOString(), n, k, pisos: L.filter(o => !skip.has(o.id)).map(o => o.doc.pisoId) });
    logger.info(`Semana ${n}: ${k} piso(s) congelado(s) automáticamente`);
  }
});

/* El plan de mañana se cierra en la reunión al publicarlo. Si nadie lo publicó, a la hora de cierre (Configuración, por defecto 21:00) el servidor, por piso:
   publica los borradores de la reunión («no va → reprogramar»: corre las fechas, deja la marca ↷ y registra la restricción),
   rechaza las propuestas del SC sin revisar («va lo programado») y cierra el plan con el lookahead ya actualizado.
   Un piso cuyo plan ya tiene foto (ids) o fue reabierto no se toca. La foto es el compromiso del día para el PPC diario. */
/* Corre cada 15 minutos: antes de la hora de Configuración (planCutHH, por defecto 21:00) solo lee meta/project; pasada la hora,
   lo hace una vez por día y deja constancia en pcl/<fecha> (solo el servidor). */
exports.cerrarPlan = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now(); if (!planCutDue(project, now)) return;
  const today = limaToday(now); const cref = db().collection('pcl').doc(today);
  if ((await cref.get()).exists) return;
  const d = nextWork(project, today);
  const [pisos, sectors, ambientes, acts, didx, daily, lives, contractors, pdzDay] = await Promise.all([all('pisos'), all('sectors'), all('ambientes'), all('acts'), all('doneidx'),
    db().collection('daily').where('date', '>=', addD(today, -120)).get(), db().collection('live').where('date', '>=', addD(today, -30)).get(), all('contractors'),
    db().collection('pdz').where('date', '==', d).get()]);
  const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(x => x.data()), lives: lives.docs.map(x => x.data()), acts });
  const zs = pdzDay.docs.map(x => ({ ...x.data(), id: x.id }));
  const vivos = [...pisos.values()].filter(p => !p.arch);
  let k = 0, np = 0, nr = 0;
  for (const p of vivos) {
    const pid = p.id;
    const drafts = zs.filter(z => z.kind === 'nova' && z.draft && z.pisoId === pid);
    const props = pendProps(zs, d, pid);
    let res;
    try { res = await closePlanPiso(db(), { project, pisos, sectors, ambientes, acts, done, contractors, drafts, props, piso: p, logger }, d, now); }
    catch (e) { logger.error(`Plan del ${d} piso ${pid}: no se pudo cerrar`, e); continue; }
    if (res.skip) continue;
    if (Object.keys(res.ids).length) k++;
    if (res.R) { np += res.R.novas.length; if (res.R.log.length) logger.warn(`Plan del ${d} piso ${pid}: ${res.R.log.join(' · ')}`); if (res.R.skipped.length) logger.info(`Plan del ${d} piso ${pid}: ya no estaban ese día: ${res.R.skipped.join(', ')}`); }
    nr += res.P.length;
  }
  await cref.set({ at: new Date(now).toISOString(), d, hh: planCutHH(project), k, np, nr });
  logger.info(`Plan del ${d}: ${k} piso(s) cerrado(s) automáticamente · ${np} borrador(es) publicado(s) · ${nr} propuesta(s) del SC rechazada(s)`);
});

/* Cuentas de capataz del tareo (docs/ia/tareo.md, «Cuentas de capataz»): usuario = DNI, contraseña; por debajo, correo sintético
   <dni>@tareo.lps911.pe con el correo ya confirmado. Solo el administrador (o el dueño) y el asistente de tareo.
   Acciones: crear (también reactiva una desactivada y cambia su contraseña), clave, desactivar, migrar (pasa los obreros
   de un capataz con enlace u_… a la cuenta). Nunca borra nada: desactivar = Auth disabled + members.off. */
exports.cuentaCapataz = onCall({ timeoutSeconds: 60 }, async req => {
  const tk = (req.auth && req.auth.token) || {};
  const email = String(tk.email || '').toLowerCase();
  const caller = email ? await db().collection('members').doc(email).get() : null;
  if (!ctaPuede(email, tk.email_verified === true, caller && caller.exists ? caller.data() : null)) throw new HttpsError('permission-denied', 'Solo el administrador o el asistente de tareo pueden crear cuentas de capataz.');
  const P = ctaPedido(req.data);
  if (P.error) throw new HttpsError('invalid-argument', P.error);
  const { accion, dni, mail } = P;
  const fref = db().collection('tper').doc(dni), mref = db().collection('members').doc(mail);
  const [fs, ms] = await Promise.all([fref.get(), mref.get()]);
  if (!fs.exists) throw new HttpsError('not-found', `No hay una ficha con el DNI ${dni} en el máster de personal.`);
  const ficha = fs.data();
  let au = null;
  try { au = await admin.auth().getUserByEmail(mail); } catch (e) { if (e.code !== 'auth/user-not-found') throw new HttpsError('internal', 'No se pudo leer la cuenta: ' + (e.message || e.code)); }
  const FV = admin.firestore.FieldValue;
  const now = Date.now();
  const res = { mail, dni, n: 0 };
  /* los obreros del capataz con enlace pasan a la cuenta; el enlace viejo queda desactivado (sus tareos antiguos no cambian) */
  const migrar = async de => {
    const ds = await db().collection('members').doc(de).get();
    if (!ds.exists || ds.data().role !== 'tcap') throw new HttpsError('failed-precondition', 'El capataz anterior no existe o no es capataz del tareo.');
    const q = await db().collection('tper').where('cap', '==', de).get();
    const ids = ctaMigrables(q.docs.map(d => ({ ...d.data(), id: d.id })), de);
    for (let i = 0; i < ids.length; i += 400) {
      const b = db().batch();
      ids.slice(i, i + 400).forEach(id => b.update(db().collection('tper').doc(id), { cap: mail, by: email, ts: now }));
      await b.commit();
    }
    await db().collection('members').doc(de).update({ off: true, offAt: now, offBy: email, movTo: mail });
    res.n = ids.length; res.de = de;
  };
  if (accion === 'crear') {
    if (ficha.arch) throw new HttpsError('failed-precondition', 'La ficha está archivada: restáurala antes de crearle una cuenta.');
    const m0 = ms.exists ? ms.data() : null;
    if (m0 && m0.role && m0.role !== 'tcap') throw new HttpsError('failed-precondition', `Ese usuario ya existe con otro rol (${m0.role}).`);
    const name = ctaNombre(ficha);
    try {
      if (au) await admin.auth().updateUser(au.uid, { password: P.clave, disabled: false, emailVerified: true, displayName: name });
      else au = await admin.auth().createUser({ email: mail, password: P.clave, emailVerified: true, displayName: name });
    } catch (e) { throw new HttpsError('internal', 'No se pudo crear la cuenta en Firebase: ' + (e.message || e.code)); }
    await mref.set({ role: 'tcap', name: (m0 && m0.name) || name, dni, added: (m0 && m0.added) || now, by: email, off: FV.delete(), offAt: FV.delete(), offBy: FV.delete() }, { merge: true });
    await fref.update({ cta: mail });
    if (P.de) await migrar(P.de);
    res.re = !!m0;
  } else if (accion === 'clave') {
    if (!au) throw new HttpsError('not-found', 'Ese capataz todavía no tiene cuenta.');
    await admin.auth().updateUser(au.uid, { password: P.clave });
  } else if (accion === 'desactivar') {
    if (au) { await admin.auth().updateUser(au.uid, { disabled: true }); await admin.auth().revokeRefreshTokens(au.uid); }
    if (ms.exists) await mref.update({ off: true, offAt: now, offBy: email });
  } else if (accion === 'migrar') {
    if (!ms.exists || ms.data().off) throw new HttpsError('failed-precondition', 'Primero crea (o reactiva) la cuenta del capataz.');
    await migrar(P.de);
  }
  logger.info(`cuentaCapataz ${accion} ${mail} por ${email}${res.n ? ` · ${res.n} obrero(s) de ${res.de}` : ''}`);
  return res;
});

/* Publicación del tareo del día (docs/ia/tareo.md, «Contrato de F3» e «Implementación de F3 — servidor»).
   Solo el dueño, un admin o un editor con «Publica tareo» (members.tpub), con correo confirmado y sin off.
   Acciones: previa {fecha} (no escribe) · publicar {fecha, excepciones?, motivo?, firma?} · rectificar {fecha, motivo}.
   Toda la lógica está en tpub.js (tpEjecutar): aquí solo se lee y se escribe. publicar y rectificar corren en una transacción
   que lee tpubidx/{fecha}, los tareos del día y la versión vigente: si un tareo cambió desde la previa (firma), se rechaza. */
exports.publicarTareo = onCall({ timeoutSeconds: 120 }, async req => {
  const tk = (req.auth && req.auth.token) || {};
  const email = String(tk.email || '').toLowerCase();
  const caller = email ? await db().collection('members').doc(email).get() : null;
  const mem = caller && caller.exists ? caller.data() : null;
  if (!tpPuede(email, tk.email_verified === true, mem)) throw new HttpsError('permission-denied', 'Solo el administrador o el jefe de producción con «Publica tareo» pueden publicar el tareo.');
  const P = tpPedido(req.data, limaToday());
  if (P.error) throw new HttpsError('invalid-argument', P.error);
  const byN = (mem && mem.name) || email;
  /* máster, partidas y configuración: fuera de la transacción (no son lo que se publica; se leen en el momento) */
  const [personal, partidas, cs] = await Promise.all([all('tper'), all('tpc'), db().collection('tcfg').doc('main').get()]);
  const tcfg = cs.exists ? cs.data() : {};
  const idxRef = db().collection('tpubidx').doc(P.fecha);
  const q = db().collection('tareo').where('date', '==', P.fecha);
  const FV = admin.firestore.FieldValue;
  const corre = async tx => {
    const get = r => (tx ? tx.get(r) : r.get());
    const is = await get(idxRef); const idx = is.exists ? is.data() : null;
    const tareos = (await get(q)).docs.map(d => ({ ...d.data(), id: d.id }));
    let vigente = null;
    if (idx && +idx.v > 0) { const vs = await get(db().collection('tpub').doc(P.fecha + '_v' + idx.v)); vigente = vs.exists ? vs.data() : null; }
    const R = tpEjecutar({ P, tareos, personal, partidas, tcfg, idx, vigente, by: email, byN, now: Date.now() });
    if (R.err) throw new HttpsError(R.err.code, R.err.msg);
    if (tx) for (const w of R.escr) {
      const ref = db().collection(w.col).doc(w.id);
      if (w.tipo === 'crear') tx.create(ref, w.datos);
      else if (w.tipo === 'poner') tx.set(ref, w.datos);
      else tx.update(ref, w.hist ? { ...w.datos, hist: FV.arrayUnion(w.hist) } : w.datos);
    }
    return R.res;
  };
  let res;
  try { res = P.accion === 'previa' ? await corre(null) : await db().runTransaction(corre); }
  catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error(`publicarTareo ${P.accion} ${P.fecha}`, e);
    if (e && (e.code === 6 || /already exists/i.test(e.message || ''))) throw new HttpsError('aborted', 'Otra persona publicó ese día al mismo tiempo: vuelve a abrir la previa.');
    throw new HttpsError('internal', 'No se pudo completar en el servidor: ' + ((e && e.message) || e));
  }
  logger.info(`publicarTareo ${P.accion} ${P.fecha} por ${email}${res.bloqueos && res.bloqueos.length ? ` · ${res.bloqueos.length} bloqueo(s)` : P.accion === 'publicar' ? ` · publicada v${res.v}` : ` · v${res.v}`}`);
  return res;
});
