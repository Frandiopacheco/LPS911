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
/* acts (opcional, Map o {id: act}): el cierre solo cuenta si lo declaró la partida de la actividad (como liveOwn de la página);
   pisoOf (opcional): piso de la actividad, para descartar un cierre con otro piso. «Quitar registro» (clr) anula el cierre del capataz. */
function doneMap({ doneidx = [], daily = [], lives = [], acts = null, pisoOf = null }) {
  const R = new Map(), D = new Map(), real = new Set();
  const actOf = id => !acts ? undefined : (acts instanceof Map ? acts.get(id) : acts[id]);
  for (const d of doneidx) { for (const [a, v] of Object.entries(d.r || {})) if (v) R.set(a, v); }
  const add = (id, d) => { const z = R.get(id); if (z && d <= z) return; const c = D.get(id); if (!c || d < c) D.set(id, d); };
  for (const d of doneidx) for (const [a, v] of Object.entries(d.d || {})) if (v) add(a, v);
  for (const doc of daily) for (const [id, r] of Object.entries(doc.recs || {})) { if (!r) continue; if (r.status || r.clr) real.add(doc.date + '|' + id); if (r.done) add(id, doc.date); }
  for (const lv of lives) {
    const c = lv.close; if (!c || !c.done || c.status !== 'ok' || real.has(lv.date + '|' + lv.actId)) continue;
    if (acts) { const x = actOf(lv.actId); if (!x || (x.sc || '') !== (lv.sc || '')) continue; const p = pisoOf ? pisoOf(x) : ''; if (lv.pisoId && p && p !== lv.pisoId) continue; }
    add(lv.actId, lv.date);
  }
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

/* ---------- Cierre automático del plan del día (a la hora de Configuración, por defecto 21:00 del día anterior) ---------- */
/* hora de la publicación automática (Configuración › Proyecto, planCutHH; por defecto 21:00; como mucho 23:30: la tarea corre cada 15 min) */
function planCutHH(p) { const v = p && p.planCutHH; return typeof v === 'string' && /^\d\d:\d\d$/.test(v) && v >= '00:00' && v <= '23:30' ? v : '21:00'; }
/* ¿ya pasó hoy (hora de Lima) la hora de la publicación automática? */
function planCutDue(p, now = Date.now()) { const t = new Date(now - LIMA).toISOString().slice(11, 16); return t >= planCutHH(p); }
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

/* ---------- Publicación automática de los borradores del plan (a la hora de cierre) ---------- */
/* días hábiles: correr n (como wshift de la página) y distancia (como wdist) */
function wshift(p, d, n) { let x = d; const st = n > 0 ? 1 : -1; let k = Math.abs(n); let g = 0; while (k > 0 && g++ < 2000) { x = addD(x, st); if (isWork(p, x)) k--; } return x; }
function wdist(p, a, b) { if (a === b) return 0; let n = 0, x = a; const st = b > a ? 1 : -1; while (x !== b) { x = addD(x, st); if (isWork(p, x)) n += st; if (Math.abs(n) > 400) break; } return n; }
/* corre n días hábiles los días ≥ from (y sus cantidades), como shiftOp de la página */
function shiftDays(p, y, n, from) {
  const map = d => (d >= from ? wshift(p, d, n) : d);
  const days = [...new Set((y.days || []).map(map))].sort(); const qty = {};
  for (const [d, v] of Object.entries(y.qty || {})) { const k = map(d); qty[k] = (qty[k] || 0) + (+v || 0); }
  return { days, qty };
}
/* primer día (desde la fecha del plan) que una actividad del tren deja de hacer: ahí queda su marca ↷ */
const rplDay = (y, from) => (y.days || []).filter(d => d >= from).sort()[0] || '';
/* Tipo de restricción para un código de causa: el de Configuración (project.restrTypes) cuyo nombre calza; si ninguno, ''.
   La página usa la misma tabla. */
const RT_RX = [['PROG', /program/i], ['MAT', /materi/i], ['QA/QC', /calidad|qa|qc/i], ['EXT', /extern|clim/i], ['CLI', /client|supervis/i],
  ['EQ', /equipo|herramient/i], ['DIS', /dise[ñn]o|ingenier/i], ['SC', /subcontrat|personal|mano de obra/i], ['ADM', /administr|permis/i],
  ['EJEC', /ejecuci/i], ['OT', /otro/i]];
function restrTypeFor(ccode, types) {
  const rx = (RT_RX.find(([c]) => c === ccode) || [])[1]; if (!rx) return '';
  return (types || []).find(t => typeof t === 'string' && rx.test(t)) || '';
}
/* días (y cantidades) que cambian entre antes y después */
function changedDays(a, b) {
  const A = new Set(a.days || []), B = new Set(b.days || []), T = new Set();
  A.forEach(d => { if (!B.has(d)) T.add(d); }); B.forEach(d => { if (!A.has(d)) T.add(d); });
  const qa = a.qty || {}, qb = b.qty || {}; new Set([...Object.keys(qa), ...Object.keys(qb)]).forEach(d => { if ((+qa[d] || 0) !== (+qb[d] || 0)) T.add(d); });
  return [...T].sort();
}
/* Publica los borradores («no va → reprogramar», pdz kind:'nova' draft:true) de un día y piso, igual que «Publicar plan» de la página.
   Entrada: drafts (docs con id), acts (Map id → actividad, al menos las de los borradores), dplans (Map id → doc, para no mover
   días ya cerrados de otras fechas), contractors (Map id → {name}), project, pub (doc pub_<fecha>_<piso> vigente o null).
   Devuelve las escrituras: acts {id: {days, qty, rpl?}}, restrs [{id, doc}], novas [{id, patch}], pub {id, doc} | null,
   y skipped (ya no tenían ese día), blocked (tocarían un día cerrado), log (texto). No escribe nada. */
function publishDrafts({ drafts = [], acts = new Map(), dplans = new Map(), contractors = new Map(), project = {}, pub = null }, date, pisoId, now = Date.now(), opt = {}) {
  const PID = 'pub_' + date + '_' + pisoId;
  const BY = { by: 'servidor', byName: 'Publicación automática' };
  const mkId = opt.uid || (pfx => pfx + '-' + now.toString(36) + Math.random().toString(36).slice(2, 6));
  const today = limaToday(now);
  const conName = id => { const c = contractors instanceof Map ? contractors.get(id) : contractors[id]; return (c && c.name) || ''; };
  /* actividades comprometidas en días ya cerrados (con ids, sin reabrir), por fecha */
  const closed = new Map();
  for (const [k, v] of dplans) { if (!v || !v.ids || v.reo) continue; const d = v.date || k.slice(0, 10); if (d === date) continue; const s = closed.get(d) || new Set(); Object.keys(v.ids).forEach(a => s.add(a)); closed.set(d, s); }
  const lockedOn = (id, a, b) => changedDays(a, b).filter(d => d !== date && closed.has(d) && closed.get(d).has(id));
  const W = new Map(), restrs = [], novas = [], skipped = [], blocked = [], log = [];
  const D = drafts.filter(z => z && z.kind === 'nova' && z.draft && z.date === date && z.pisoId === pisoId)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0) || String(a.id).localeCompare(String(b.id)));
  for (const zz of D) {
    const n = zz.shift || wdist(project, zz.date, zz.repTo); const mv = {};
    const ids = zz.ids || [zz.actId]; let held = false;
    for (let j = 0; j < ids.length; j++) {
      const id = ids[j]; const y = W.get(id) || acts.get(id); if (!y || y.arch) continue;
      const ok = j === 0 ? (y.days || []).includes(zz.date) : (y.days || []).some(dd => dd >= zz.date);
      if (!ok) { skipped.push(y.name || id); continue; }
      const o = shiftDays(project, y, n, zz.date);
      const lk = lockedOn(id, y, o);
      if (lk.length) {
        blocked.push(y.name || id); log.push(`${y.name || id}: no se mueve, cambiaría el plan ya cerrado del ${lk.join(', ')}`);
        if (j === 0) { held = true; log.push(`Borrador ${zz.id}: la actividad principal no se mueve; queda sin publicar (lo revisa el ingeniero)`); break; }
        continue;
      }
      mv[id] = { p: y.days || [], pq: y.qty || {}, n: o.days, nq: o.qty };
      const nx = { ...y, days: o.days, qty: o.qty };
      const ca = zz.c ? { c: zz.c, cnc: zz.cnc || '', imp: zz.imp !== false, rsc: zz.rsc || '', pc: !!zz.pc } : {};
      const rk = j === 0 ? zz.date : rplDay(y, zz.date);
      if (rk) nx.rpl = { ...(y.rpl || {}), [rk]: { to: j === 0 ? zz.repTo : wshift(project, rk, n), m: zz.motivo || '', ...ca, ...(j ? { tr: zz.actId } : {}) } };
      W.set(id, nx);
    }
    if (held) continue;
    let rid = '';
    if (zz.k && Object.keys(mv).length) {
      const x = acts.get(zz.actId); rid = 'res-' + zz.id; // mismo id que la página: el mismo cambio nunca crea dos restricciones
      restrs.push({ id: rid, doc: { actId: zz.actId, pisoId, type: zz.rt || restrTypeFor(zz.c || '', project.restrTypes), desc: zz.rdesc || zz.motivo || '', resp: zz.rsc ? conName(zz.rsc) : '',
        need: zz.repTo || '', freed: '', status: 'pend', created: today, sc: x ? x.sc || '' : zz.sc || '', ...BY, via: 'plan diario',
        ...(zz.c ? { cnc: zz.cnc || '', ccode: zz.c, imp: zz.imp !== false, rsc: zz.rsc || '', pc: !!zz.pc } : {}) } });
    }
    novas.push({ id: zz.id, patch: { draft: false, mv, rid, pub: PID } });
  }
  const out = {};
  for (const [id, y] of W) out[id] = { days: y.days, qty: y.qty || {}, ...(y.rpl ? { rpl: y.rpl } : {}) };
  const pubW = novas.length ? { id: PID, doc: { date, pisoId, sc: '', kind: 'pub', n: ((pub && pub.n) || 0) + novas.length, ...BY, ts: now, auto: true } } : null;
  return { acts: out, restrs, novas, pub: pubW, skipped, blocked, log };
}
/* Fechas cuyos planes cerrados (dplan) hay que releer antes de publicar: los días ≥ fecha de las actividades y adónde irían */
function draftDates(drafts, acts, project, date) {
  const S = new Set();
  for (const z of drafts) {
    const n = z.shift || wdist(project, z.date, z.repTo);
    for (const id of z.ids || [z.actId]) { const y = acts.get(id); if (!y) continue; for (const d of y.days || []) if (d >= date) { S.add(d); S.add(wshift(project, d, n)); } }
  }
  S.delete(date); return [...S].sort();
}
/* Propuestas del SC (pdz kind:'dprop') sin revisar del día y piso: a la hora de cierre se rechazan («va lo programado») */
const DPROP_REJ = now => ({ st: 'rej', dec: 'Cierre automático: va según lo programado', decBy: 'servidor', decN: 'Cierre automático', decT: now });
const pendProps = (docs, date, pisoId) => docs.filter(z => z && z.kind === 'dprop' && z.st === 'pend' && z.date === date && z.pisoId === pisoId);

/* Cierre automático de un piso, en una transacción (db = Firestore de admin): si el plan del día ya tiene foto (ids) o fue
   reabierto, no hace nada. Si no: relee el aviso de publicado, cada borrador, sus actividades y los planes cerrados de las fechas
   que tocarían; publica los borradores (publishDrafts), rechaza las propuestas del SC aún pendientes y guarda la foto del plan
   (buildDayPlan con las actividades ya corridas). ctx.drafts / ctx.props: los docs pdz del día y piso (leídos antes). */
async function closePlanPiso(db, { project = {}, pisos, sectors, ambientes, acts, done = new Map(), contractors = new Map(), drafts = [], props = [], piso, logger = null }, d, now = Date.now()) {
  const pid = piso.id; const col = c => db.collection(c);
  const dref = col('dplan').doc(d + '_' + pid); const PID = 'pub_' + d + '_' + pid; const pref = col('pdz').doc(PID);
  return db.runTransaction(async tx => {
    const cur = await tx.get(dref); const c0 = cur.exists ? cur.data() : null;
    if (c0 && (c0.ids || c0.reo)) return { skip: true };
    const ps = await tx.get(pref);
    const D = [];
    for (const z of drafts) { const s = await tx.get(col('pdz').doc(z.id)); if (s.exists) D.push({ ...s.data(), id: z.id }); }
    const A = new Map();
    for (const id of new Set(D.flatMap(z => z.ids || [z.actId]))) { const s = await tx.get(col('acts').doc(id)); if (s.exists) A.set(id, { ...s.data(), id }); }
    const DP = new Map();
    for (const dd of draftDates(D, A, project, d)) { const s = await tx.get(col('dplan').doc(dd + '_' + pid)); if (s.exists) DP.set(dd + '_' + pid, s.data()); }
    const P = [];
    for (const z of props) { const s = await tx.get(col('pdz').doc(z.id)); if (s.exists && (s.data() || {}).st === 'pend') P.push(z.id); }
    let R = D.length ? publishDrafts({ drafts: D, acts: A, dplans: DP, contractors, project, pub: ps.exists ? ps.data() : null }, d, pid, now) : null;
    const nW = R ? Object.keys(R.acts).length + R.restrs.length + R.novas.length + (R.pub ? 1 : 0) : 0;
    /* límite de 500 escrituras por transacción: si no entra, no se publica (los borradores quedan para el ingeniero) */
    /* si no entra, no se publica ni se cierra el día (sin foto): mañana el ingeniero ve «⚠ Sin publicar» y lo publica él;
       las propuestas pendientes sí se rechazan (las que entren) */
    if (nW + P.length + 2 > 480) {
      if (logger) logger.error(`Plan del ${d} piso ${pid}: ${nW + P.length + 1} escrituras pasan el límite; no se publica ni se cierra`);
      const P1 = P.slice(0, 480); for (const id of P1) tx.update(col('pdz').doc(id), DPROP_REJ(now));
      return { R: null, P: P1, ids: {}, overflow: true };
    }
    const Acts = new Map(acts);
    if (R) for (const [id, u] of Object.entries(R.acts)) Acts.set(id, { ...(Acts.get(id) || {}), ...(A.get(id) || {}), ...u, id });
    const pl = buildDayPlan({ pisos, sectors, ambientes, acts: Acts, done }, d).find(o => o.doc.pisoId === pid);
    const ids = pl ? pl.doc.ids : {};
    if (R) {
      for (const [id, u] of Object.entries(R.acts)) tx.update(col('acts').doc(id), u);
      for (const r of R.restrs) tx.set(col('restr').doc(r.id), r.doc);
      for (const o of R.novas) tx.update(col('pdz').doc(o.id), o.patch);
      if (R.pub) tx.set(pref, R.pub.doc);
      /* queda en el Historial del lookahead como la publicación desde la página */
      const items = Object.entries(R.acts).map(([id, u]) => { const b = A.get(id) || acts.get(id) || {};
        return { id, nm: b.name || '', amb: '', sc: b.sc || '', k: 'mod', b: { days: b.days || [], qty: b.qty || {} }, a: { days: u.days || [], qty: u.qty || {} } }; }).slice(0, 150);
      if (items.length) tx.set(col('lhlog').doc(now + '_srv' + pid), { t: now, d, by: 'servidor', n: 'Cierre automático', label: `Plan del ${d} publicado en el cierre automático`, tab: 'mapa', items });
    }
    const P2 = P;
    for (const id of P2) tx.update(col('pdz').doc(id), DPROP_REJ(now));
    const pub = !!(R && R.pub);
    if (Object.keys(ids).length) tx.set(dref, { ...(c0 || {}), date: d, pisoId: pid, ids, at: now, by: 'servidor', byName: 'Cierre automático', auto: true, ...(pub ? { pub: PID } : {}) });
    return { R, P: P2, ids };
  });
}

/* ---------- Cuentas de capataz del tareo (docs/ia/tareo.md, «Cuentas de capataz») ----------
   El capataz entra con su DNI y una contraseña. Por debajo es una cuenta de correo y contraseña de Firebase Auth con un correo
   sintético <dni>@tareo.lps911.pe (no existe: nunca se le envía nada) que crea la función cuentaCapataz con el Admin SDK. */
const CTA_DOM = 'tareo.lps911.pe';
const OWNER = 'frandiopacheco@gmail.com';
/* DNI como en el máster: 8 dígitos con ceros a la izquierda (7 dígitos → se completa); carné de extranjería 8–12 alfanuméricos */
function ctaDni(v) {
  let d = String(v == null ? '' : v).trim().toUpperCase();
  if (/^\d{7}$/.test(d)) d = '0' + d;
  return /^[A-Z0-9]{8,12}$/.test(d) ? d : '';
}
const ctaMail = dni => { const d = ctaDni(dni); return d ? d.toLowerCase() + '@' + CTA_DOM : ''; };
const ctaEsMail = m => typeof m === 'string' && m.toLowerCase().endsWith('@' + CTA_DOM);
const ctaClaveOk = c => typeof c === 'string' && c.length >= 6 && c.length <= 64 && c.trim() === c;
/* contraseña propuesta: 6 dígitos al azar (rnd devuelve [0,1)) */
const ctaClave = (rnd = Math.random) => Array.from({ length: 6 }, () => Math.floor(rnd() * 10) % 10).join('');
/* quién puede administrar cuentas de capataz: el dueño, un admin o el asistente de tareo, con correo confirmado y sin cuenta desactivada */
function ctaPuede(email, verified, member) {
  if (!verified || !email) return false;
  if (String(email).toLowerCase() === OWNER) return true;
  return !!member && member.off !== true && ['admin', 'tasis'].includes(member.role);
}
/* nombre visible del capataz desde su ficha del máster: «Juan Carlos Quispe Mamani» */
function ctaNombre(f) {
  const t = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  return [t(f && f.nom), t(f && f.ape)].filter(Boolean).join(' ').slice(0, 60) || 'Capataz';
}
/* valida lo que pide la página → {ok, accion, dni, mail, clave, de} o {error} (mensajes en español para mostrar tal cual) */
function ctaPedido(data) {
  const o = data || {};
  const accion = o.accion;
  if (!['crear', 'clave', 'desactivar', 'migrar'].includes(accion)) return { error: 'Acción no válida.' };
  const dni = ctaDni(o.dni);
  if (!dni) return { error: 'El DNI no es válido (8 dígitos, o carné de extranjería de 8 a 12 caracteres).' };
  const r = { ok: true, accion, dni, mail: ctaMail(dni) };
  if (accion === 'crear' || accion === 'clave') {
    if (!ctaClaveOk(o.clave)) return { error: 'La contraseña debe tener al menos 6 caracteres (sin espacios al inicio ni al final).' };
    r.clave = o.clave;
  }
  if (accion === 'crear' || accion === 'migrar') {
    const de = o.de == null ? '' : String(o.de);
    if (de && !/^u_[A-Za-z0-9]{6,128}$/.test(de)) return { error: 'El capataz anterior no es válido (debe ser un usuario de enlace, u_…).' };
    if (accion === 'migrar' && !de) return { error: 'Elige de qué capataz con enlace se pasan los obreros.' };
    r.de = de;
  }
  return r;
}
/* obreros (ids del máster) asignados al capataz `de` que pasan a la cuenta nueva */
const ctaMigrables = (fichas, de) => (fichas || []).filter(f => f && de && f.cap === de).map(f => f.id || f.dni);

module.exports = { CTA_DOM, ctaDni, ctaMail, ctaEsMail, ctaClaveOk, ctaClave, ctaPuede, ctaNombre, ctaPedido, ctaMigrables,
   planCutHH, planCutDue, pd, addD, fmtD, limaToday, weekOf, lastSundayNoon, buildVersion, closesToAccept, acceptCloses, propCutTs, weeksToFreeze, doneMap, buildFreeze, weekDays, isWork, nextWork, buildDayPlan,
  wshift, wdist, shiftDays, rplDay, restrTypeFor, changedDays, publishDrafts, draftDates, DPROP_REJ, pendProps, closePlanPiso };
