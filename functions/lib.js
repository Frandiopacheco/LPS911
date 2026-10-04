// Lógica pura (sin Firebase) de las tareas del servidor: se prueba con `npm test`.
'use strict';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const LIMA = 5 * 3600e3; // Lima: UTC-5 todo el año

const pd = s => new Date(s + 'T00:00:00Z');
const addD = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtD = s => { const d = pd(s); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MES[d.getUTCMonth()]; };
const limaToday = (now = Date.now()) => new Date(now - LIMA).toISOString().slice(0, 10);
const weekOf = (p, s) => (p.refWeek || 0) + Math.floor((pd(s) - pd(p.refDate)) / 864e5 / 7);
const strip = o => { const c = { ...o }; delete c.id; return c; };

/* Domingo 12:00 de Lima más reciente que ya pasó (igual que la página) */
function lastSundayNoon(now = Date.now()) {
  const t = new Date(now - LIMA); const dow = t.getUTCDay();
  let base = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - dow, 12) + LIMA;
  if (base > now) base -= 7 * 864e5;
  return { ts: base, iso: new Date(base - LIMA).toISOString().slice(0, 10) };
}

/* Foto del lookahead por piso (sin lo archivado), en el mismo formato que "Guardar versión" */
function buildVersion({ project, pisos, sectors, ambientes, acts }, now = Date.now()) {
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!P.length) return null;
  const pids = new Set(P.map(p => p.id));
  const first = P[0].id;
  const pisoOfSec = s => (s && s.pisoId && pids.has(s.pisoId) ? s.pisoId : first);
  const sd = lastSundayNoon(now);
  const id = 'auto-' + sd.iso;
  const week = weekOf(project, addD(sd.iso, 1));
  const idx = { label: `Automática · dom ${fmtD(sd.iso)} 12:00 (sem ${week})`, kind: 'auto', ts: now, date: sd.iso, by: 'servidor', byName: 'Servidor (automático)', week, pisos: {} };
  const docs = [];
  const S = live(sectors), A = live(ambientes), X = live(acts);
  for (const p of P) {
    const secs = {}, ambs = {}, ax = {};
    for (const s of S) if (pisoOfSec(s) === p.id) secs[s.id] = strip(s);
    for (const a of A) if (secs[a.sectorId]) ambs[a.id] = strip(a);
    for (const x of X) if (ambs[x.ambId]) { const c = strip(x); delete c.obs; delete c.obsSug; ax[x.id] = c; }
    idx.pisos[p.id] = { code: p.code, name: p.name, order: p.order || 0, acts: Object.keys(ax).length };
    docs.push([id + '__' + p.id, { verId: id, pisoId: p.id, piso: strip(p), json: JSON.stringify({ secs, ambs, acts: ax }) }]);
  }
  return { id, idx, docs };
}

/* Cierres del capataz que nadie revisó en 2 días → registro diario (igual que autoAccept de la página) */
function closesToAccept(lives, dailyById, acts, today) {
  const lim = addD(today, -2);
  const out = [];
  for (const lv of lives) {
    const c = lv.close;
    if (!c || !c.status || !lv.date || lv.date > lim) continue;
    const doc = dailyById.get(lv.date + '_' + lv.pisoId);
    const r = doc && doc.recs && doc.recs[lv.actId];
    if (r && (r.status || r.clr)) continue; // ya registrado, o el ingeniero lo quitó a propósito
    const x = acts.get(lv.actId);
    if (!x) continue;
    const hasM = typeof x.metrado === 'number' && x.metrado > 0;
    out.push({
      date: lv.date, pisoId: lv.pisoId, actId: lv.actId,
      rec: {
        status: c.status, prog: hasM ? ((x.qty || {})[lv.date] ?? null) : null, und: x.und || '',
        exec: c.status === 'ok' && hasM ? ((x.qty || {})[lv.date] ?? null) : null,
        cnc: c.cnc || '', imp: null, note: c.note || '', late: false, done: !!c.done, photos: lv.photos || [],
        prop: { status: c.status, cnc: c.cnc || '', by: c.by || '', byName: c.n || '', ts: c.t || 0 },
        sc: x.sc || '', nm: x.name || '', ambId: x.ambId || '',
        auto: true, autoSrv: true, by: c.by || '', byName: c.n || '', ts: c.t || Date.now()
      }
    });
  }
  return out;
}

/* Escribe los cierres de closesToAccept uno por uno, cada uno en una transacción que vuelve a leer el registro del día:
   si mientras tanto un ingeniero lo verificó (o lo quitó a propósito), no se toca. Antes un lote escribía con la lectura
   del inicio y podía cambiar un «No cumplido» recién verificado por «Cumplido» y borrar su comentario. */
async function acceptCloses(db, L) {
  let n = 0, skip = 0;
  for (const o of L) {
    const dref = db.collection('daily').doc(o.date + '_' + o.pisoId);
    const iref = db.collection('doneidx').doc(o.pisoId);
    const wrote = await db.runTransaction(async tx => {
      const ds = await tx.get(dref);
      const is = o.rec.done ? await tx.get(iref) : null;
      const r = ds.exists ? ((ds.data() || {}).recs || {})[o.actId] : null;
      if (r && (r.status || r.clr)) return false;
      tx.set(dref, { date: o.date, pisoId: o.pisoId, recs: { [o.actId]: o.rec } }, { merge: true });
      if (o.rec.done) {
        const d = (is && is.exists && (is.data() || {}).d) || {};
        if (!(d[o.actId] <= o.date)) tx.set(iref, { d: { [o.actId]: o.date } }, { merge: true });
      }
      return true;
    });
    if (wrote) n++; else skip++;
  }
  return { n, skip };
}

module.exports = { pd, addD, fmtD, limaToday, weekOf, lastSundayNoon, buildVersion, closesToAccept, acceptCloses };
