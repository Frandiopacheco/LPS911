// Tareas automáticas en el servidor (Cloud Functions, se instalan solas desde GitHub).
// - versionDominical: cada domingo 12:00 (Lima) guarda la versión automática del lookahead,
//   aunque nadie tenga la página abierta.
// - aceptarCierres: cada 15 min; a la hora del Cierre del ingeniero (Configuración, por defecto 21:00) registra los cierres que el
//   SC/capataz marcó antes de su corte (tal como los marcó) y, en días laborables, lo que nadie cerró: No cumplido imputable al SC
//   (sinCierre). Una vez por día (jcl/<fecha>). Desde esa hora las reglas cierran el registro diario de ese día para todos.
// - congelarSemana: en el corte semanal (por defecto sábado 13:00 de Lima) congela la semana siguiente en los pisos que
//   nadie congeló a mano; si la tarea se atrasa, lo intenta hasta el lunes. Además, una semana que alguien descongeló y nadie volvió
//   a congelar se re-congela sola a las 2 horas, tal como estaba (desde su copia __h; tanda 1, C-03).
// - cerrarPlan: a la hora de Configuración (por defecto 21:00, Lima), en los pisos donde nadie publicó el plan del día hábil siguiente, publica los borradores de la
//   reunión, rechaza las propuestas del SC sin revisar y cierra el plan (dplan).
// - emitirCliente: el sábado a las 23:00 (Lima) emite la versión cliente de la semana siguiente si el administrador no la emitió.
// - cuentaCapataz (la llama la página): crea y administra las cuentas DNI + contraseña de los capataces del tareo.
// - publicarTareo (la llama la página): previa, publicación y rectificación del tareo del día (F3).
// - avisoDetenido (la llama la página al guardarse un «Detenido»): avisa al celular y la computadora de los responsables del piso y
//   del administrador (Firebase Cloud Messaging; docs/ia/avisos.md). avisoPrueba (la llama la página): aviso de prueba a uno mismo.
// - publicarTareoAuto: cada 15 min, pasada la hora de Configuración del tareo, publica el día si está todo listo (o deja la constancia).
'use strict';
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { planCutHH, planCutDue, buildVersion, closesToAccept, acceptCloses, sinCierre, engCutHH, jornadaDays, isWork, holPreload, limaToday, addD, weeksToFreeze, weeksToRefreeze, refreezeDoc, doneMap, buildFreeze, frzCutTs, nextWork, buildDayPlan, pendProps, closePlanPiso, RETRY_MAX, retryPlan, runFloors, retryRecord, WSNAP_PAGE, wsnapPlan, buildCliVersion, cliDue, ctaPedido, ctaPuede, ctaNombre, ctaMigrables, tpPuede, tpPedido, tpEjecutar, tpAutoDue, tpExcUnir, tpAutoNota, avisoNo, avisoDestinos, avisoTexto } = require('./lib');

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

/* Versión cliente: si a las 23:00 del sábado nadie emitió la de la semana siguiente, se emite sola tal como está (decidido con el
   dueño, oct 2026). Corre varias veces esa hora por si una pasada falla; cliDue evita emitir dos veces. */
exports.emitirCliente = onSchedule({ schedule: '1,16,31,46 23 * * 6', timeZone: 'America/Lima', retryCount: 2 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now();
  const idx = await all('clidx');
  const n = cliDue(project, [...idx.values()], now);
  if (n == null) { logger.info('Versión cliente: nada que emitir (ya emitida o fuera de hora)'); return; }
  const cli = await db().collection('cli').doc('buf').get();
  const v = buildCliVersion({ project, pisos: await all('pisos'), sectors: await all('sectors'), ambientes: await all('ambientes'), acts: await all('acts'), buf: cli.exists ? cli.data() : {}, clia: await all('clia') }, n, now);
  if (!v) { logger.info('Sin pisos: nada que emitir'); return; }
  const idxRef = db().collection('clidx').doc(v.id);
  if ((await idxRef.get()).exists) return;
  /* el administrador pudo emitir mientras se armaba esta: se vuelve a mirar justo antes */
  if (cliDue(project, [...(await all('clidx')).values()], now) == null) { logger.info('Versión cliente: el administrador ya la emitió'); return; }
  for (let i = 0; i < v.docs.length; i += 8) {
    const b = db().batch();
    v.docs.slice(i, i + 8).forEach(([k, d]) => b.set(db().collection('cliver').doc(k), d));
    await b.commit();
  }
  await idxRef.set(v.idx);
  logger.info(`Versión cliente ${v.id} emitida (semana ${n}): ${v.docs.length} pisos`);
});

/* Cierre de la jornada (tanda 1, 23/10/2026, decidido con el dueño). Corre cada 15 minutos (antes: 23:30 una vez). A la hora del
   Cierre del ingeniero (Configuración › Proyecto engCutHH, por defecto 21:00) de cada día, una sola vez (constancia jcl/<fecha>,
   solo el servidor; ayer se revisa también por si una pasada falló):
   1. registra en daily los cierres que el SC/capataz marcó antes de su corte, TAL COMO LOS MARCÓ (bySc:true; sin aplicar su
      «Terminada»): closesToAccept. También los de los 7 días anteriores que hayan quedado sin escribir (transición).
   2. en días laborables (isWork, respeta «se trabaja»), lo del plan publicado sin registro ni cierre a tiempo → No cumplido
      «Sin cierre» imputable al SC (sinCierre), salvo lo terminado antes de ese día. Nunca antes de esa hora (TMP-5).
   Cada registro se escribe releyéndolo (acceptCloses): lo que un ingeniero registró mientras tanto no se pisa. Desde esa hora las
   reglas de daily/live rechazan cualquier escritura de la página para ese día (el servidor escribe con el Admin SDK).
   El nombre aceptarCierres se conserva para que la instalación reemplace la tarea en vez de crear otra. */
exports.aceptarCierres = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  const meta = await db().collection('meta').doc('project').get();
  const project = (meta.exists && meta.data()) || {};
  const now = Date.now();
  for (const d of jornadaDays(project, now)) {
    const ref = db().collection('jcl').doc(d);
    if ((await ref.get()).exists) continue;
    const r = await cerrarJornada(d, project, now);
    await ref.set({ at: new Date(now).toISOString(), d, hh: engCutHH(project), ...r });
    logger.info(`Jornada del ${d} cerrada: ${r.sc} cierre(s) del SC registrados, ${r.sin} «Sin cierre»${r.skip ? `, ${r.skip} ya registrados por un ingeniero` : ''}${r.nw ? ' (día no laborable: sin «Sin cierre»)' : ''}`);
  }
});

async function cerrarJornada(d, project, now) {
  const from = addD(d, -7);
  const lives = (await db().collection('live').where('date', '>=', from).where('date', '<=', d).get()).docs.map(x => ({ ...x.data(), id: x.id }));
  const daily = new Map((await db().collection('daily').where('date', '>=', addD(d, -30)).get()).docs.map(x => [x.id, x.data()]));
  const dplanL = (await db().collection('dplan').where('date', '>=', from).get()).docs.map(x => [x.id, x.data()]).filter(([, v]) => v && v.date <= d);
  const dplans = new Map(dplanL);
  const today = dplanL.map(([, v]) => v).filter(v => v.date === d);
  const nova = new Set();
  (await db().collection('pdz').where('date', '==', d).get()).docs.forEach(x => { const v = x.data() || {}; if (v.kind === 'nova' && !v.arch) (v.ids || [v.actId]).forEach(id => id && nova.add(id)); });
  const need = [...new Set([...lives.map(l => l.actId), ...today.flatMap(p => Object.keys(p.ids || {}))])];
  const acts = new Map();
  for (let i = 0; i < need.length; i += 100) {
    const refs = need.slice(i, i + 100).map(id => db().collection('acts').doc(id));
    (await db().getAll(...refs)).forEach(x => { if (x.exists) acts.set(x.id, x.data()); });
  }
  /* 1. cierres del SC a tiempo, tal como los marcó */
  const A = await acceptCloses(db(), closesToAccept(lives, daily, acts, d, dplans, project));
  /* 2. «Sin cierre» (solo días laborables); se relee daily del día: lo recién escrito en 1 ya cuenta */
  let S = { n: 0, skip: 0 }; const nw = !isWork(project, d);
  if (!nw && today.length) {
    const dd = new Map((await db().collection('daily').where('date', '==', d).get()).docs.map(x => [x.id, x.data()]));
    const done = doneMap({ doneidx: [...(await all('doneidx')).values()], daily: [...daily.values()].filter(v => v.date < d) });
    S = await acceptCloses(db(), sinCierre(d, today, lives, dd, acts, nova, project.cnc, project.closeCutHH, { now, done }));
  }
  return { sc: A.n, sin: S.n, skip: A.skip + S.skip, nw };
}

/* Cada 15 minutos mira si ya pasó el corte de la semana que viene; fuera de esa ventana solo lee meta/project.
   De paso mueve, por partes, la foto del lookahead (snap) de weeks a wsnap (migración M1; cuando termina solo lee frz/_wsnap). */
exports.congelarSemana = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  try { await congelar(); }
  finally {
    try { await recongelar(); } catch (e) { logger.error('Re-congelar semanas descongeladas: falló esta pasada, se reintenta en 15 minutos', e); }
    try { await migrarWsnap(); } catch (e) { logger.error('Migración de fotos del lookahead (wsnap): falló esta pasada, se reintenta en 15 minutos', e); }
  }
});
/* C-03 (tanda 1, LPS-1): semanas descongeladas (unfrozenAt, sin frozenAt) que nadie volvió a congelar en 2 horas: se reponen tal como
   estaban desde la última copia __h, como «Recuperar» de la página (restoreWeek), cada una en su propia transacción que relee todo:
   si alguien la congeló o la recuperó mientras tanto, no se toca. La copia queda con restAt/restBy:'servidor' y la semana con refrz. */
async function recongelar() {
  const now = Date.now(); const at = new Date(now).toISOString();
  const q = await db().collection('weeks').where('unfrozenAt', '>', '').get();
  const weeks = q.docs.map(d => ({ ...d.data(), id: d.id })).filter(w => !w.frozenAt && !w.histOf);
  if (!weeks.length) return;
  const hist = [];
  for (const w of weeks) (await db().collection('weeks').where('histOf', '==', w.id).get()).docs.forEach(d => hist.push({ ...d.data(), id: d.id }));
  const L = weeksToRefreeze(weeks, hist, now);
  let k = 0;
  for (const o of L) {
    try {
      const ok = await db().runTransaction(async tx => {
        const ref = db().collection('weeks').doc(o.id), href = db().collection('weeks').doc(o.hid), hw = db().collection('wsnap').doc(o.hid);
        const [sn, hs, ws] = [await tx.get(ref), await tx.get(href), await tx.get(hw)];
        const r = refreezeDoc(sn.exists ? sn.data() : null, hs.exists ? { ...hs.data(), id: o.hid } : null, ws.exists ? (ws.data() || {}).snap : undefined, o.unAt, at);
        if (!r) return false;
        tx.set(ref, { ...r.week, unfrozenAt: admin.firestore.FieldValue.delete() }, { merge: true });
        if (r.snap != null) tx.set(db().collection('wsnap').doc(o.id), { snap: r.snap, n: r.week.n, pisoId: r.week.pisoId, t: r.week.frozenAt || null });
        tx.update(href, { restAt: at, restBy: 'servidor' });
        return true;
      });
      if (ok) k++;
    } catch (e) { logger.error(`No se pudo re-congelar ${o.id}`, e); }
  }
  if (k) logger.info(`${k} semana(s) descongelada(s) re-congelada(s) tal como estaban (nadie las volvió a congelar en 2 horas)`);
}
async function congelar() {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now();
  const W = weeksToFreeze(project, now);
  if (!W.length) return;
  const pisos = await all('pisos');
  const vivos = [...pisos.values()].filter(p => !p.arch);
  for (const n of W) {
    /* ya se hizo esta semana (frz/<n>): no se vuelve a leer todo cada 15 minutos. Si un piso falló, las pasadas siguientes
       reintentan solo ese piso, hasta RETRY_MAX veces (auditoría de código 08/10, M2) */
    const fref = db().collection('frz').doc(String(n));
    const fs = await fref.get(); const prev = fs.exists ? fs.data() : null;
    const plan = retryPlan(prev);
    if (!plan) continue;
    const mine = vivos.filter(p => !plan.only || plan.only.has(p.id));
    const at = new Date(now).toISOString();
    if (plan.only && !mine.length) { await fref.set(retryRecord(prev, plan, { at, n, nota: 'los pisos que faltaban ya no existen' }, [], [], { k: 0 })); continue; }
    const refs = mine.map(p => db().collection('weeks').doc(n + '_' + p.id));
    const snaps = refs.length ? await db().getAll(...refs) : [];
    /* descongelada a propósito después del corte (unfrozenAt) = alguien la está corrigiendo: no se vuelve a congelar sola */
    const cut = frzCutTs(project, n); const held = x => !!x && (!!x.frozenAt || (!!x.unfrozenAt && Date.parse(x.unfrozenAt) >= cut));
    const skip = new Set(snaps.filter(d => d.exists && held(d.data())).map(d => d.id));
    if (mine.length && skip.size === snaps.length) { await fref.set(retryRecord(prev, plan, { at, n, nota: 'todos los pisos ya estaban congelados' }, [], [], { k: 0 })); continue; }
    const today = limaToday(now);
    const [sectors, ambientes, acts, didx, daily, lives, props, contractors, restr, libs] = await Promise.all([all('sectors'), all('ambientes'), all('acts'), all('doneidx'),
      db().collection('daily').where('date', '>=', addD(today, -120)).get(), db().collection('live').where('date', '>=', addD(today, -30)).get(), all('lhprop'), all('contractors'),
      all('restr'), all('lib')]);
    const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(d => d.data()), lives: lives.docs.map(d => d.data()), acts });
    const L = buildFreeze({ project, pisos, sectors, ambientes, acts, done, props: [...props.values()], contractors, restr, libs }, n, new Date(now).toISOString());
    const todo = L.filter(o => !skip.has(o.id) && (!plan.only || plan.only.has(o.doc.pisoId)));
    const byPiso = new Map(todo.map(o => [o.doc.pisoId, o]));
    /* cada piso en su propia transacción y con su propio try/catch: si uno falla, los demás se congelan igual */
    const R = await runFloors([...byPiso.keys()], async pid => {
      const o = byPiso.get(pid); const ref = db().collection('weeks').doc(o.id);
      /* como «Congelar» de la página: si alguien ya lo congeló (o lo hizo mientras corría), se respeta su versión */
      /* la foto del lookahead va aparte (wsnap), en la misma transacción */
      return db().runTransaction(async tx => { const d = await tx.get(ref); if (d.exists && held(d.data())) return false; tx.set(ref, o.doc); tx.set(db().collection('wsnap').doc(o.id), o.wsnap); return true; });
    }, (pid, e) => logger.error(`Semana ${n}: no se pudo congelar el piso ${pid}`, e));
    const k = [...R.out.values()].filter(Boolean).length;
    const rec = retryRecord(prev, plan, { at, n, pisos: [...byPiso.keys()] }, R.done, R.fail, { k });
    await fref.set(rec);
    logger.info(`Semana ${n}: ${k} piso(s) congelado(s) automáticamente${plan.only ? ` (reintento ${rec.tries})` : ''}`);
    if (R.fail.length) logger.error(`Semana ${n}: ${R.fail.length} piso(s) sin congelar (${R.fail.join(', ')}); ${rec.tries >= RETRY_MAX ? 'se agotaron los reintentos: congélalos a mano' : 'se reintentan en 15 minutos'}`);
  }
}

/* Migración M1 (auditoría de datos): la foto del lookahead (snap) sale de weeks (que todos descargan al entrar) a wsnap/<id>.
   Recorre weeks por id, WSNAP_PAGE documentos por pasada (cursor en frz/_wsnap, que solo escribe el servidor y nadie escucha).
   Cada documento con snap va en su propia transacción que lo relee: escribe wsnap (wsnapPlan) y quita el campo de weeks juntos;
   si alguien lo cambió mientras tanto, se usa lo que hay en ese momento. Al llegar al final deja {wsnap:true} y no vuelve a leer. */
async function migrarWsnap() {
  const mref = db().collection('frz').doc('_wsnap');
  const ms = await mref.get(); const m = ms.exists ? ms.data() : {};
  if (m.wsnap === true) return;
  let q = db().collection('weeks').orderBy(admin.firestore.FieldPath.documentId()).limit(WSNAP_PAGE);
  if (m.cursor) q = q.startAfter(m.cursor);
  const page = await q.get();
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  let moved = 0, same = 0, kept = 0;
  for (const d of page.docs) {
    const w = d.data(); if (w.snap === undefined && !(w.v && w.v.snap !== undefined)) continue;
    const r = await db().runTransaction(async tx => {
      const wref = db().collection('weeks').doc(d.id), sref = db().collection('wsnap').doc(d.id);
      const [ws, ss] = [await tx.get(wref), await tx.get(sref)];
      const plan = ws.exists ? wsnapPlan(d.id, ws.data(), ss.exists ? ss.data() : null, stamp) : null;
      if (!plan) return null;
      plan.sets.forEach(([id, doc]) => tx.set(db().collection('wsnap').doc(id), doc));
      tx.update(wref, { [plan.del]: admin.firestore.FieldValue.delete() });
      return plan;
    });
    if (!r) continue;
    moved++; if (r.same) same++; if (r.sets.length > 1) kept++;
  }
  const last = page.docs.length ? page.docs[page.docs.length - 1].id : m.cursor || null;
  const fin = page.docs.length < WSNAP_PAGE;
  const tot = (+m.n || 0) + moved;
  await mref.set(fin ? { wsnap: true, doneAt: new Date().toISOString(), n: tot } : { cursor: last, n: tot, at: new Date().toISOString() });
  logger.info(`Migración wsnap: ${page.docs.length} documento(s) de weeks revisado(s), ${moved} foto(s) movida(s)${same ? ` (${same} ya estaban en wsnap)` : ''}${kept ? `, ${kept} foto(s) anterior(es) de wsnap guardada(s) como __m` : ''}; total ${tot}${fin ? ' · terminada' : ''}`);
}

/* El plan de mañana se cierra en la reunión al publicarlo. Si nadie lo publicó, a la hora de cierre (Configuración, por defecto 21:00) el servidor, por piso:
   publica los borradores de la reunión («no va → reprogramar»: corre las fechas, deja la marca ↷ y registra la restricción),
   rechaza las propuestas del SC sin revisar («va lo programado») y cierra el plan con el lookahead ya actualizado.
   Un piso cuyo plan ya tiene foto (ids) o fue reabierto no se toca. La foto es el compromiso del día para el PPC diario. */
/* Corre cada 15 minutos: antes de la hora de Configuración (planCutHH, por defecto 21:00) solo lee meta/project; pasada la hora,
   lo hace una vez por día y deja constancia en pcl/<fecha> (solo el servidor). */
/* C-08 (tanda 1): feriados nacionales de Perú del año actual y el siguiente en meta/project.cal.hol, una vez por año (cal.holPre).
   Lo dispara el servidor (cerrarPlan, cada 15 min) para que no dependa de que alguien abra la página; nunca borra ni pisa lo cargado
   (holPreload). Actualiza `project` en memoria para que el resto de la pasada ya use el calendario nuevo. */
async function precargarFeriados(project, now) {
  const y = +limaToday(now).slice(0, 4);
  if (!holPreload((project && project.cal) || {}, [y, y + 1])) return;
  const ref = db().collection('meta').doc('project');
  const out = await db().runTransaction(async tx => {
    const s = await tx.get(ref); const p = (s.exists && s.data()) || {};
    const r = holPreload(p.cal || {}, [y, y + 1]); if (!r) return null;
    tx.set(ref, { cal: { hol: r.hol, holPre: r.holPre } }, { merge: true });
    return r;
  });
  if (out) { project.cal = { ...(project.cal || {}), hol: out.hol, holPre: out.holPre }; logger.info(`Feriados precargados: ${out.add.length} (${out.holPre.join(', ')})`); }
}

exports.cerrarPlan = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now();
  /* C-08: feriados nacionales del año actual y el siguiente, precargados una vez por año (antes de calcular el día hábil) */
  try { await precargarFeriados(project, now); } catch (e) { logger.error('Precarga de feriados: falló, se reintenta en 15 minutos', e); }
  if (!planCutDue(project, now)) return;
  const today = limaToday(now); const cref = db().collection('pcl').doc(today);
  /* hecho hoy (pcl/<fecha>) = no se vuelve a hacer. Si un piso falló, las pasadas siguientes reintentan solo ese piso,
     hasta RETRY_MAX veces (auditoría de código 08/10, M3); un piso que ya tiene foto se salta solo (closePlanPiso) */
  const cs = await cref.get(); let prev = cs.exists ? cs.data() : null;
  let plan = retryPlan(prev);
  /* TMP-3: ya hecho, pero un piso que se cerró con foto la perdió después («↶ Deshacer publicación» pasada la hora): se vuelve
     a cerrar en la pasada siguiente (solo se leen las fotos de los pisos que la tenían, cerr) */
  /* constancias anteriores a este cambio (sin cerr): se miran los pisos hechos (done) una vez */
  const cerr0 = prev ? (Array.isArray(prev.cerr) ? prev.cerr : Array.isArray(prev.done) ? prev.done : []) : [];
  if (!plan && cerr0.length && prev.d) {
    const snaps = await db().getAll(...cerr0.map(pid => db().collection('dplan').doc(prev.d + '_' + pid)));
    const lost = snaps.filter(x => !x.exists || !((x.data() || {}).ids || (x.data() || {}).reo)).map(x => x.id.slice(prev.d.length + 1));
    if (lost.length) { plan = { only: new Set(lost), tries: 0, again: true }; logger.warn(`Plan del ${prev.d}: sin foto después del cierre en ${lost.join(', ')}; se vuelve a cerrar`); }
  }
  if (!plan) return;
  const d = (plan.only && prev && prev.d) || nextWork(project, today);
  const [pisos, sectors, ambientes, acts, didx, daily, lives, contractors, pdzDay, restr, libs] = await Promise.all([all('pisos'), all('sectors'), all('ambientes'), all('acts'), all('doneidx'),
    db().collection('daily').where('date', '>=', addD(today, -120)).get(), db().collection('live').where('date', '>=', addD(today, -30)).get(), all('contractors'),
    db().collection('pdz').where('date', '==', d).get(),
    all('restr'), all('lib')]);
  const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(x => x.data()), lives: lives.docs.map(x => x.data()), acts });
  const zs = pdzDay.docs.map(x => ({ ...x.data(), id: x.id }));
  const vivos = [...pisos.values()].filter(p => !p.arch && (!plan.only || plan.only.has(p.id)));
  let k = 0, np = 0, nr = 0; const cerr = new Set(cerr0);
  const R = await runFloors(vivos.map(p => p.id), async pid => {
    const p = pisos.get(pid);
    const drafts = zs.filter(z => ((z.kind === 'nova' && z.draft) || (z.kind === 'padd' && z.draft && z.st === 'ok')) && z.pisoId === pid);
    const props = pendProps(zs, d, pid);
    const zones = zs.filter(z => z.kind === 'zona' && z.paId && z.pisoId === pid);
    const res = await closePlanPiso(db(), { project, pisos, sectors, ambientes, acts, done, contractors, drafts, props, zones, piso: p, logger, restr, libs }, d, now);
    if (res.skip) { if (res.has) cerr.add(pid); return; }
    if (Object.keys(res.ids).length) { k++; cerr.add(pid); } else cerr.delete(pid); // sin nada que comprometer: no se vuelve a mirar
    if (res.R) { np += res.R.novas.length; if (res.R.log.length) logger.warn(`Plan del ${d} piso ${pid}: ${res.R.log.join(' · ')}`); if (res.R.skipped.length) logger.info(`Plan del ${d} piso ${pid}: ya no estaban ese día: ${res.R.skipped.join(', ')}`); }
    nr += res.P.length;
  }, (pid, e) => logger.error(`Plan del ${d} piso ${pid}: no se pudo cerrar`, e));
  /* «otra vez» (TMP-3): la constancia sigue como hecha, con los pisos que ya tienen foto */
  const rec = plan.again ? { ...prev, cerr: [...cerr], again: (+prev.again || 0) + 1, fail: R.fail.length ? R.fail : (prev.fail || []) }
    : { ...retryRecord(prev, plan, { at: new Date(now).toISOString(), d, hh: planCutHH(project) }, R.done, R.fail, { k, np, nr }), cerr: [...cerr] };
  await cref.set(rec);
  logger.info(`Plan del ${d}: ${k} piso(s) cerrado(s) automáticamente · ${np} borrador(es) publicado(s) · ${nr} propuesta(s) del SC rechazada(s)${plan.only ? ` (reintento ${rec.tries})` : ''}`);
  if (R.fail.length) logger.error(`Plan del ${d}: ${R.fail.length} piso(s) sin cerrar (${R.fail.join(', ')}); ${rec.tries >= RETRY_MAX ? 'se agotaron los reintentos: publícalo a mano en el Plan diario' : 'se reintentan en 15 minutos'}`);
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
    /* solo cuentas que siguen siendo de capataz (auditoría 21-10-2026): si el administrador le dio otro rol, la oficina ya no cambia su clave */
    if (!ms.exists || ms.data().role !== 'tcap') throw new HttpsError('failed-precondition', 'Esa cuenta ya no es de capataz del tareo: su contraseña la cambia el administrador.');
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
  if (!tpPuede(email, tk.email_verified === true, mem)) throw new HttpsError('permission-denied', 'Solo el administrador, el asistente de tareo o el jefe de producción con «Publica tareo» pueden publicar el tareo.');
  const P = tpPedido(req.data, limaToday());
  if (P.error) throw new HttpsError('invalid-argument', P.error);
  const res = await tpCorrer(P, email, (mem && mem.name) || email);
  logger.info(`publicarTareo ${P.accion} ${P.fecha} por ${email}${res.bloqueos && res.bloqueos.length ? ` · ${res.bloqueos.length} bloqueo(s)` : P.accion === 'publicar' ? ` · publicada v${res.v}` : ` · v${res.v}`}`);
  return res;
});
/** lee lo necesario, corre tpEjecutar (previa sin transacción; publicar y rectificar en una) y escribe. Los motivos de los obreros sin
    tareo guardados en la pantalla (tpexc/{fecha}) se suman a los del pedido (20-10-2026). Lo usan la página y la publicación automática. */
async function tpCorrer(P, email, byN) {
  /* máster, partidas, configuración y motivos guardados: fuera de la transacción (no son lo que se publica; se leen en el momento) */
  const [personal, partidas, cs, xs] = await Promise.all([all('tper'), all('tpc'), db().collection('tcfg').doc('main').get(), db().collection('tpexc').doc(P.fecha).get()]);
  const tcfg = cs.exists ? cs.data() : {};
  P = { ...P, excepciones: tpExcUnir(xs.exists ? (xs.data() || {}).exc : null, P.excepciones) };
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
  try { return P.accion === 'previa' ? await corre(null) : await db().runTransaction(corre); }
  catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error(`publicarTareo ${P.accion} ${P.fecha}`, e);
    if (e && (e.code === 6 || /already exists/i.test(e.message || ''))) throw new HttpsError('aborted', 'Otra persona publicó ese día al mismo tiempo: vuelve a abrir la previa.');
    throw new HttpsError('internal', 'No se pudo completar en el servidor: ' + ((e && e.message) || e));
  }
}
/* Publicación automática del tareo (20-10-2026, decisión del dueño): cada 15 min, pasada la hora de Configuración del tareo
   (tcfg/main.pubAuto = {on, hh}), publica el día de hoy si no está publicado y no tiene bloqueos (todos los capataces revisados,
   nadie en dos tareos y el personal sin tareo con su motivo guardado). Si falta algo no publica: deja la constancia en
   tpauto/{fecha} (la pantalla la muestra) y vuelve a intentar en la siguiente pasada. Nunca rectifica. */
exports.publicarTareoAuto = onSchedule({ schedule: '*/15 * * * *', timeZone: 'America/Lima', retryCount: 1 }, async () => {
  const cs = await db().collection('tcfg').doc('main').get();
  const due = tpAutoDue(cs.exists ? cs.data() : {}, Date.now()); if (!due) return;
  const is = await db().collection('tpubidx').doc(due.fecha).get();
  if (is.exists && +(is.data() || {}).v > 0) return;
  const nref = db().collection('tpauto').doc(due.fecha);
  let res;
  try { res = await tpCorrer({ accion: 'publicar', fecha: due.fecha, excepciones: {}, motivo: '', firma: '' }, 'auto@lps911', 'Publicación automática'); }
  catch (e) { logger.error(`publicarTareoAuto ${due.fecha}`, e); await nref.set({ t: Date.now(), ok: false, n: 0, msgs: [String((e && e.message) || e)] }); return; }
  await nref.set(tpAutoNota(res, Date.now()));
  logger.info(`publicarTareoAuto ${due.fecha}: ${res.ok ? `publicada v${res.v}` : `no se publicó (${(res.bloqueos || []).length} pendiente(s))`}`);
});

/* ---------- Avisos de detenciones (push; docs/ia/avisos.md) ---------- */
/* tokens (push/<sha256>) de una lista de correos; Firestore admite hasta 30 valores en un «in» */
async function pushTokens(ems) {
  const out = [];
  for (let i = 0; i < ems.length; i += 30) {
    const q = await db().collection('push').where('em', 'in', ems.slice(i, i + 30)).get();
    q.docs.forEach(d => { const v = d.data(); if (v && v.tok) out.push({ id: d.id, tok: v.tok, em: v.em }); });
  }
  return out;
}
/* envía y borra los tokens que ya no existen (se desinstaló, se borraron los datos del navegador…) */
async function pushSend(list, data) {
  if (!list.length) return { ok: 0, fail: 0 };
  const r = await admin.messaging().sendEachForMulticast({ tokens: list.map(x => x.tok), data, webpush: { headers: { Urgency: 'high', TTL: '21600' } } });
  const dead = [];
  r.responses.forEach((x, i) => { const c = x.error && x.error.code; if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token' || c === 'messaging/invalid-argument') dead.push(list[i].id); });
  await Promise.all(dead.map(id => db().collection('push').doc(id).delete().catch(() => {})));
  return { ok: r.successCount, fail: r.failureCount, dead: dead.length };
}
/* La página la llama cuando ya se guardó un «Detenido» (si no había señal, lo reintenta al volver la conexión). Se lee el reporte
   de la base (no se confía en lo que manda la página) y se envía una sola vez por evento (pushlog/<live>_<hora>).
   Es un onCall y no un disparador de Firestore: el disparador necesitaba permisos de Google Cloud que la instalación automática
   no tiene (oct 2026). */
exports.avisoDetenido = onCall({ timeoutSeconds: 60 }, async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const id = String((req.data && req.data.id) || ''), t = Number(req.data && req.data.t);
  if (!/^\d{4}-\d\d-\d\d_[^/]{1,200}$/.test(id) || !(t > 0)) throw new HttpsError('invalid-argument', 'Detención no válida.');
  const ls = await db().collection('live').doc(id).get();
  if (!ls.exists) return { enviado: false, motivo: 'no existe' };
  const after = ls.data();
  const e = (after.log || []).find(x => x && x.s === 'stop' && x.t === t && x.m !== 'Inicia después');
  if (!e) return { enviado: false, motivo: 'sin detenido' };
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const no = avisoNo(project, after, e, Date.now());
  if (no) { logger.info(`Detenido ${id}: sin aviso (${no})`); return { enviado: false, motivo: no }; }
  try { await db().collection('pushlog').doc(`${id}_${t}`).create({ t: Date.now() }); } catch (x) { return { enviado: false, motivo: 'ya enviado' }; }
  const aid = after.actId, pid = after.pisoId;
  const [mem, prefs, as] = await Promise.all([db().collection('members').get(), db().collection('pushp').get(), db().collection('acts').doc(String(aid)).get()]);
  const act = as.exists ? as.data() : null;
  const [ams, ps, cs] = await Promise.all([act && act.ambId ? db().collection('ambientes').doc(String(act.ambId)).get() : null, pid ? db().collection('pisos').doc(String(pid)).get() : null,
    (act && act.sc) || after.sc ? db().collection('contractors').doc(String((act && act.sc) || after.sc)).get() : null]);
  const P = {}; prefs.docs.forEach(d => { P[d.id.toLowerCase()] = d.data(); });
  const dest = avisoDestinos(mem.docs.map(d => ({ ...d.data(), id: d.id })), pid, e.by, P);
  if (!dest.length) { logger.info(`Detenido ${id}: nadie a quien avisar en el piso ${pid}`); return { enviado: false, motivo: 'sin destinatarios' }; }
  const list = await pushTokens(dest);
  const data = avisoTexto({ aid, date: after.date, e, act, amb: ams && ams.exists ? ams.data() : null, piso: ps && ps.exists ? ps.data() : null, con: cs && cs.exists ? cs.data() : null, lvMot: after.mot });
  const r = await pushSend(list, data);
  logger.info(`Detenido ${id}: aviso a ${dest.length} persona(s), ${list.length} equipo(s) · enviados ${r.ok} · fallidos ${r.fail}`);
  return { enviado: true, personas: dest.length, equipos: list.length, ok: r.ok };
});
/* aviso de prueba a los equipos de quien lo pide (administrador o editor) */
exports.avisoPrueba = onCall({ timeoutSeconds: 30 }, async req => {
  const tk = (req.auth && req.auth.token) || {};
  const email = String(tk.email || '').toLowerCase();
  if (!email || tk.email_verified !== true) throw new HttpsError('permission-denied', 'Inicia sesión con tu correo.');
  const m = await db().collection('members').doc(email).get();
  const role = email === 'frandiopacheco@gmail.com' ? 'admin' : (m.exists ? m.data().role : '');
  if (!['admin', 'editor'].includes(role)) throw new HttpsError('permission-denied', 'Los avisos son para los responsables de piso y el administrador.');
  const list = await pushTokens([email]);
  if (!list.length) throw new HttpsError('failed-precondition', 'No tienes ningún equipo con los avisos activados.');
  const r = await pushSend(list, { title: '🔔 Aviso de prueba · LPS 911', body: 'Así te llegará un aviso cuando un subcontratista marque «Detenido» en tu piso.', tag: 'prueba', aid: '', d: '', url: './' });
  return { equipos: list.length, ok: r.ok, fail: r.fail };
});
