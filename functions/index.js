// Tareas automáticas en el servidor (Cloud Functions, se instalan solas desde GitHub).
// - versionDominical: cada domingo 12:00 (Lima) guarda la versión automática del lookahead,
//   aunque nadie tenga la página abierta.
// - aceptarCierres: cada noche registra los cierres de capataces que nadie revisó en 2 días.
// - congelarSemana: en el corte semanal (por defecto sábado 13:00 de Lima) congela la semana siguiente en los pisos que
//   nadie congeló a mano; si la tarea se atrasa, lo intenta hasta el lunes.
// - cerrarPlan: a las 20:00 (Lima) cierra el plan del día hábil siguiente en los pisos donde nadie lo publicó.
'use strict';
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { buildVersion, closesToAccept, acceptCloses, limaToday, addD, weeksToFreeze, doneMap, buildFreeze, propCutTs, nextWork, buildDayPlan } = require('./lib');

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
    const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(d => d.data()), lives: lives.docs.map(d => d.data()) });
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

/* El plan de mañana se cierra en la reunión al publicarlo; si nadie lo publicó, se cierra solo a las 20:00 con lo que tenga
   el lookahead (los borradores sin publicar no cambian el lookahead). La foto es el compromiso del día para el PPC diario. */
exports.cerrarPlan = onSchedule({ schedule: '0 20 * * *', timeZone: 'America/Lima', retryCount: 2 }, async () => {
  const project = (await db().collection('meta').doc('project').get()).data() || {};
  const now = Date.now(); const today = limaToday(now); const d = nextWork(project, today);
  const [pisos, sectors, ambientes, acts, didx, daily, lives] = await Promise.all([all('pisos'), all('sectors'), all('ambientes'), all('acts'), all('doneidx'),
    db().collection('daily').where('date', '>=', addD(today, -120)).get(), db().collection('live').where('date', '>=', addD(today, -30)).get()]);
  const done = doneMap({ doneidx: [...didx.values()], daily: daily.docs.map(x => x.data()), lives: lives.docs.map(x => x.data()) });
  let k = 0;
  for (const o of buildDayPlan({ pisos, sectors, ambientes, acts, done }, d)) {
    const ref = db().collection('dplan').doc(o.id);
    const wrote = await db().runTransaction(async tx => { const cur = await tx.get(ref); if (cur.exists && (cur.data().ids || cur.data().reo)) return false;
      tx.set(ref, { ...(cur.exists ? cur.data() : {}), ...o.doc, at: now, by: 'servidor', byName: 'Cierre automático 20:00', auto: true }); return true; });
    if (wrote) k++;
  }
  logger.info(`Plan del ${d}: ${k} piso(s) cerrado(s) automáticamente`);
});
