// Tareas automáticas en el servidor (Cloud Functions, se instalan solas desde GitHub).
// - versionDominical: cada domingo 12:00 (Lima) guarda la versión automática del lookahead,
//   aunque nadie tenga la página abierta.
// - aceptarCierres: cada noche registra los cierres de capataces que nadie revisó en 2 días.
'use strict';
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { buildVersion, closesToAccept, limaToday, addD } = require('./lib');

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
  const L = closesToAccept(lives, daily, acts, today);
  const didx = new Map();
  for (const pid of new Set(L.filter(o => o.rec.done).map(o => o.pisoId))) { const d = await db().collection('doneidx').doc(pid).get(); didx.set(pid, (d.exists && d.data().d) || {}); }
  for (let i = 0; i < L.length; i += 200) {
    const b = db().batch();
    for (const o of L.slice(i, i + 200)) {
      b.set(db().collection('daily').doc(o.date + '_' + o.pisoId), { date: o.date, pisoId: o.pisoId, recs: { [o.actId]: o.rec } }, { merge: true });
      if (o.rec.done && !(didx.get(o.pisoId)[o.actId] <= o.date)) b.set(db().collection('doneidx').doc(o.pisoId), { d: { [o.actId]: o.date } }, { merge: true });
    }
    await b.commit();
  }
  logger.info(`Cierres registrados automáticamente: ${L.length}`);
});
