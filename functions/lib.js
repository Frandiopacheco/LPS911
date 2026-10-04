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
/* dplanById (opcional): planes del día cerrados; si el día tiene foto, lo comprometido es su cantidad, no la vigente.
   Un cierre cuya partida no es la de la actividad no se acepta (lo pudo escribir otra partida). */
function closesToAccept(lives, dailyById, acts, today, dplanById) {
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
    if ((x.sc || '') !== (lv.sc || '')) continue;
    const hasM = typeof x.metrado === 'number' && x.metrado > 0;
    const dp = dplanById && dplanById.get(lv.date + '_' + lv.pisoId);
    const dq = dp && dp.ids && Object.prototype.hasOwnProperty.call(dp.ids, lv.actId) ? dp.ids[lv.actId] : undefined;
    const q = hasM ? (typeof dq === 'number' ? dq : ((x.qty || {})[lv.date] ?? null)) : null;
    out.push({
      date: lv.date, pisoId: lv.pisoId, actId: lv.actId,
      rec: {
        status: c.status, prog: q, und: x.und || '',
        exec: c.status === 'ok' ? q : null,
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

/* ---------- Congelado automático de la semana (misma regla que «Congelar» en la página) ---------- */
const weekStart = (p, n) => addD(p.refDate, (n - (p.refWeek || 0)) * 7);
const weekDays = (p, n) => { const a = weekStart(p, n); return [0, 1, 2, 3, 4, 5].map(i => addD(a, i)); };
const r2 = v => Math.round((+v || 0) * 100) / 100;
const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.id).localeCompare(String(b.id));
function canon(o) { if (o == null) return 'null'; if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']'; if (typeof o === 'object') return '{' + Object.keys(o).filter(k => k !== 'id').sort().map(k => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}'; return JSON.stringify(o); }

/* Corte semanal (el mismo de las propuestas de SC, Configuración › Proyecto; por defecto sábado 13:00 de Lima antes del lunes) */
function propCutTs(p, n) {
  const dow = parseInt(p.propCutDow, 10); const d = dow >= 0 && dow <= 6 ? dow : 6;
  const hh = /^\d\d:\d\d$/.test(p.propCutHH || '') ? p.propCutHH : '13:00';
  const back = ((1 - d) + 7) % 7 || 7;
  return Date.parse(addD(weekStart(p, n), -back) + 'T' + hh + ':00Z') + LIMA;
}
/* Semanas que el servidor debe congelar ahora: la que viene, desde su corte hasta su lunes (inclusive, por si la tarea se atrasó) */
function weeksToFreeze(p, now = Date.now()) {
  if (!p || !p.refDate) return [];
  const today = limaToday(now); const w0 = weekOf(p, today);
  return [w0, w0 + 1].filter(n => now >= propCutTs(p, n) && today <= weekStart(p, n));
}
/* Fecha de terminada por actividad (igual que la página: índice, registros con «terminada» y cierres del capataz; respeta reaperturas) */
function doneMap({ doneidx = [], daily = [], lives = [] }) {
  const R = new Map(), D = new Map(), real = new Set();
  for (const d of doneidx) { for (const [a, v] of Object.entries(d.r || {})) if (v) R.set(a, v); }
  const add = (id, d) => { const z = R.get(id); if (z && d <= z) return; const c = D.get(id); if (!c || d < c) D.set(id, d); };
  for (const d of doneidx) for (const [a, v] of Object.entries(d.d || {})) if (v) add(a, v);
  for (const doc of daily) for (const [id, r] of Object.entries(doc.recs || {})) { if (!r) continue; if (r.status) real.add(doc.date + '|' + id); if (r.done) add(id, doc.date); }
  for (const lv of lives) { const c = lv.close; if (!c || !c.done || c.status !== 'ok' || real.has(lv.date + '|' + lv.actId)) continue; add(lv.actId, lv.date); }
  return D;
}
const PFIELDS = ['days', 'qty', 'metrado', 'und', 'name', 'order'];
function propMerge(a, base, off) { const nw = { ...off }; for (const f of PFIELDS) if (canon(a[f] ?? null) !== canon(base ? base[f] ?? null : null)) nw[f] = a[f]; return nw; }
function propTouch(b, a) {
  if (!a) return b ? [...(b.days || [])].sort() : []; if (!b) return [...(a.days || [])].sort();
  const bd = new Set(b.days || []), ad = new Set(a.days || []), T = new Set(); ad.forEach(d => { if (!bd.has(d)) T.add(d); }); bd.forEach(d => { if (!ad.has(d)) T.add(d); });
  const bq = b.qty || {}, aq = a.qty || {}; ad.forEach(d => { if (bd.has(d) && canon(bq[d] ?? null) !== canon(aq[d] ?? null)) T.add(d); });
  if ((a.und || '') !== (b.und || '') || (a.metrado ?? null) !== (b.metrado ?? null) || (a.name || '') !== (b.name || '')) ad.forEach(d => T.add(d));
  return [...T].sort();
}
/* Documentos weeks/<n>_<piso> de los pisos que tienen compromisos en la semana n: { items, snap, propOut } como «Congelar».
   Lo terminado antes no es compromiso; propOut = propuestas de SC enviadas y sin decidir que tocaban ese piso y semana. */
function buildFreeze({ project, pisos, sectors, ambientes, acts, done = new Map(), props = [] }, n, nowIso) {
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort(byOrder); if (!P.length) return [];
  const pids = new Set(P.map(p => p.id)); const first = P[0].id;
  const pisoOfSec = s => (s && s.pisoId && pids.has(s.pisoId) ? s.pisoId : first);
  const S = live(sectors).sort(byOrder), A = live(ambientes).sort(byOrder), X = live(acts).sort(byOrder);
  const secById = new Map(S.map(s => [s.id, s])), ambById = new Map(A.map(a => [a.id, a])), actById = new Map(X.map(x => [x.id, x]));
  const pisoOfAmb = id => { const a = ambById.get(id); return a ? pisoOfSec(secById.get(a.sectorId)) : ''; };
  const days = new Set(weekDays(project, n));
  const libDay = (x, d) => { const dn = done.get(x.id); return !!(dn && d > dn); };
  const out = [];
  for (const p of P) {
    const items = {}, snap = {};
    for (const s of S) {
      if (pisoOfSec(s) !== p.id) continue;
      for (const a of A) {
        if (a.sectorId !== s.id) continue;
        for (const x of X) {
          if (x.ambId !== a.id) continue;
          const d = (x.days || []).filter(z => days.has(z) && !libDay(x, z)).sort();
          if (!d.length) continue;
          const it = { sc: x.sc || '', sector: s.code || '', code: a.code || '', amb: a.name || '', act: x.name || '', days: d, ord: (s.order || 0) * 1e6 + (a.order || 0) * 1e3 + (x.order || 0) };
          if (typeof x.metrado === 'number' && x.metrado > 0) { const qd = {}; let q = 0; d.forEach(z => { const v = (x.qty || {})[z]; if (v != null) { qd[z] = v; q += +v; } }); if (q > 0) { it.q = r2(q); it.qd = qd; it.und = x.und || ''; } }
          items[x.id] = it;
        }
      }
    }
    if (!Object.keys(items).length) continue;
    for (const x of X) if (pisoOfAmb(x.ambId) === p.id) snap[x.id] = (x.days || []).slice().sort();
    const propOut = [];
    for (const d of props) for (const [id, it] of Object.entries(d.items || {})) {
      if (!it || !it.sent) continue; const off = actById.get(id) || null; const x = it.after || off || it.base; if (!x || pisoOfAmb(x.ambId) !== p.id) continue;
      const pa = it.after && off ? propMerge(it.after, it.base || off, off) : it.after;
      if (propTouch(off, pa).some(z => days.has(z))) propOut.push((d.sc || d.id) + '/' + id);
    }
    out.push({ id: n + '_' + p.id, doc: { n, pisoId: p.id, frozenAt: nowIso, items, res: {}, snap, frozenBy: 'servidor', auto: true, ...(propOut.length ? { propOut } : {}) } });
  }
  return out;
}

/* ---------- Cierre automático del plan del día (20:00 del día anterior, si nadie lo publicó) ---------- */
/* día hábil (como la página: domingo no; feriados y sábado según Configuración › Calendario) */
function isWork(p, d) { const dw = pd(d).getUTCDay(); if (dw === 0) return false; const c = (p && p.cal) || {}; if ((c.hol || []).some(o => o && o.d === d)) return false; if (dw === 6 && c.sat === false) return false; return true; }
function nextWork(p, d) { let x = addD(d, 1); for (let i = 0; i < 30 && !isWork(p, x); i++) x = addD(x, 1); return x; }
/* foto del plan del día por piso: {actId: cantidad | null} de lo programado ese día y no terminado (sin lo archivado) */
function buildDayPlan({ pisos, sectors, ambientes, acts, done = new Map() }, d) {
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort(byOrder); if (!P.length) return [];
  const pids = new Set(P.map(p => p.id)); const first = P[0].id;
  const secById = new Map(live(sectors).map(s => [s.id, s])), ambById = new Map(live(ambientes).map(a => [a.id, a]));
  const pisoOfAmb = id => { const a = ambById.get(id); const s = a && secById.get(a.sectorId); return a ? (s && s.pisoId && pids.has(s.pisoId) ? s.pisoId : first) : ''; };
  const by = new Map(P.map(p => [p.id, {}]));
  for (const x of live(acts)) {
    if (!(x.days || []).includes(d)) continue; const dn = done.get(x.id); if (dn && d > dn) continue;
    const pid = pisoOfAmb(x.ambId); if (!by.has(pid)) continue; const q = (x.qty || {})[d]; by.get(pid)[x.id] = q != null ? +q : null;
  }
  return [...by.entries()].filter(([, ids]) => Object.keys(ids).length).map(([pisoId, ids]) => ({ id: d + '_' + pisoId, doc: { date: d, pisoId, ids } }));
}

module.exports = { pd, addD, fmtD, limaToday, weekOf, lastSundayNoon, buildVersion, closesToAccept, acceptCloses, propCutTs, weeksToFreeze, doneMap, buildFreeze, weekDays, isWork, nextWork, buildDayPlan };
