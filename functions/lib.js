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

/* Cierres del SC/capataz → registro diario (tanda 1, 23/10/2026, decidido con el dueño; revierte la «opción B» del 09/10).
   El Cumplido/Parcial/No que el SC o el capataz marcó antes de su hora de corte (closeCutHH) CUENTA TAL COMO LO MARCÓ, sin
   confirmación del ingeniero. A la hora del Cierre del ingeniero (engCutHH) el servidor lo escribe en daily con su estado, causa
   y nota, marcado como reportado por el SC (bySc:true; lo propuesto queda también en prop). El check «Terminada» del SC NO se
   aplica (done:false; queda en prop.done para consulta). Un cierre enviado después del corte no se registra aquí (las reglas ya
   no lo dejan escribir; uno antiguo así lo cubre sinCierre).
   lives: reportes en vivo con fecha <= upTo; project (opcional): para la hora de corte de cada día.
   dplanById (opcional): planes del día cerrados; si el día tiene foto, lo comprometido es su cantidad, no la vigente.
   Un cierre cuya partida no es la de la actividad no se acepta (lo pudo escribir otra partida). */
const CNC_SIN_CONF = 'Sin confirmación'; // causa antigua (registros del 09/10 al 23/10/2026); ya no se escribe
/* margen para el cierre del SC después de su hora de corte (latencia y reloj del equipo); el mismo de las reglas (live) */
const CLOSE_GRACE = 10 * 60e3;
/* ¿el cierre lo declaró la partida de la actividad? (igual que liveOwn de la página, frente C de la tanda 1): la partida actual de la
   fila, o la de ese día según el plan publicado (dplan.who[actId].sc). Sin plan publicado, solo la actual (auditoría N01; la página
   además acepta la del propio reporte en días pasados sin plan: ese cierre sigue contando allí, pero el servidor no lo escribe). */
function liveScOk(lv, x, dp) {
  const s = lv.sc || ''; if ((x.sc || '') === s) return true;
  const w = dp && dp.who && dp.who[lv.actId];
  return !!(w && w.sc && w.sc === s);
}
function closesToAccept(lives, dailyById, acts, upTo, dplanById, project) {
  const hh = closeCutHH(project || {});
  const out = [];
  for (const lv of lives) {
    const c = lv.close;
    if (!c || !c.status || !lv.date || lv.date > upTo) continue;
    if ((c.t || 0) > closeCutTs(lv.date, hh) + CLOSE_GRACE) continue; // cerrado después del corte: no cuenta como cierre del SC
    const doc = dailyById.get(lv.date + '_' + lv.pisoId);
    const r = doc && doc.recs && doc.recs[lv.actId];
    if (r && (r.status || r.clr)) continue; // ya registrado, o el ingeniero lo quitó a propósito
    const x = acts.get(lv.actId);
    if (!x) continue;
    const dp = dplanById && dplanById.get(lv.date + '_' + lv.pisoId);
    if (!liveScOk(lv, x, dp)) continue;
    const hasM = typeof x.metrado === 'number' && x.metrado > 0;
    const dq = dp && dp.ids && Object.prototype.hasOwnProperty.call(dp.ids, lv.actId) ? dp.ids[lv.actId] : undefined;
    const q = hasM ? (typeof dq === 'number' ? dq : ((x.qty || {})[lv.date] ?? null)) : null;
    const ok = c.status === 'ok';
    out.push({
      date: lv.date, pisoId: lv.pisoId, actId: lv.actId,
      rec: {
        status: c.status, prog: q, und: x.und || '',
        exec: ok ? q : null, // Cumplido sin cantidad = lo programado (como writeDaily de la página)
        cnc: ok ? '' : (c.cnc || ''), imp: null, note: c.note || '', late: false, done: false, photos: lv.photos || [],
        prop: { status: c.status, cnc: c.cnc || '', done: !!c.done, by: c.by || '', byName: c.n || '', ts: c.t || 0 },
        bySc: true,
        sc: lv.sc || x.sc || '', nm: x.name || '', ambId: x.ambId || '', // el SC de ese día (frente C: la fila pudo cambiar de partida)
        auto: true, autoSrv: true, by: c.by || '', byName: c.n || '', ts: c.t || Date.now()
      }
    });
  }
  return out;
}

/* Sin cierre (reporte por excepción, decidido con el dueño, oct 2026): lo comprometido en el plan publicado del día (dplan.ids)
   que a la hora de corte del SC (Configuración › Proyecto closeCutHH, por defecto 17:00 Lima) nadie cerró —ni el SC/capataz
   cerró antes del corte, ni el ingeniero lo registró— entra como No cumplido, causa del cuadro con código SC (o «Subcontratas»),
   imputable al SC, sin terminada. Se excluye lo reprogramado ese día («No va», pdz kind nova, o acts.rpl[día]), lo archivado,
   lo que cambió de partida y (H03a) lo que ya estaba terminado antes de ese día (opt.done: Map actId → fecha de terminada).
   Desde la tanda 1 (23/10/2026) corre a la hora del Cierre del ingeniero (engCutHH, por defecto 21:00), nunca antes, y solo en
   días laborables (lo decide quien llama: cerrarJornada en index.js). opt.now: si se pasa y aún no llega el corte del SC, nada. */
/* misma regla que la página (base.js closeCutHH): entre 12:00 y 21:00, por defecto 17:00 */
function closeCutHH(p) { const v = p && p.closeCutHH; return typeof v === 'string' && /^\d\d:\d\d$/.test(v) && v >= '12:00' && v <= '21:00' ? v : '17:00'; }
const hhLabel = v => { const [h, m] = String(v).split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`; };
const sinCierreNote = hh => `Sin cierre del SC antes de las ${hhLabel(hh)} (registrado automáticamente)`;
/* hora de corte del día en milisegundos (Lima, UTC−5, sin horario de verano) */
const closeCutTs = (d, hh) => Date.parse(d + 'T' + (hh || '17:00') + ':00-05:00');
/* Cierre del ingeniero (tanda 1, 23/10/2026; Configuración › Proyecto engCutHH, solo el administrador): desde el corte del SC hasta
   esta hora solo los ingenieros registran o corrigen; a esta hora el servidor registra los cierres del SC y el «Sin cierre», y el
   registro diario de ese día queda cerrado para todos (reglas de daily y live). Entre 18:00 y 23:00 y siempre después del corte
   del SC; si no, 21:00 (o 22:00 si el corte del SC es 21:00). Misma regla en base.js engCutHH y en firestore.rules (engHH). */
const hhIn = (v, lo, hi) => typeof v === 'string' && /^\d\d:\d\d$/.test(v) && v >= lo && v <= hi;
function engCutHH(p) { const c = closeCutHH(p); const v = p && p.engCutHH; return hhIn(v, '18:00', '23:00') && v > c ? v : (c < '21:00' ? '21:00' : '22:00'); }
const engCutTs = (d, p) => closeCutTs(d, engCutHH(p));
/* días cuyo registro hay que cerrar ahora: ayer (por si una pasada falló o la tarea se atrasó) y hoy si ya pasó el Cierre del
   ingeniero. La constancia jcl/<fecha> evita repetirlo (index.js). */
function jornadaDays(p, now = Date.now()) {
  const today = limaToday(now); const out = [addD(today, -1)];
  if (now >= engCutTs(today, p)) out.push(today);
  return out;
}
function cncSinCierre(cnc) {
  const L = Array.isArray(cnc) ? cnc : [];
  return L.find(n => /subcontrat|mano de obra|\bsc\b/i.test(String(n))) || 'Subcontratas';
}
function sinCierre(day, dplans, lives, dailyById, acts, novaIds, cnc, hh, opt = {}) {
  hh = closeCutHH({ closeCutHH: hh });
  const cut = closeCutTs(day, hh);
  if (opt.now != null && opt.now < cut) return []; // TMP-5: nunca antes de la hora de corte
  const doneAt = opt.done || null;
  const liveBy = new Map(lives.filter(l => l.date === day).map(l => [l.actId, l]));
  const cause = cncSinCierre(cnc);
  const out = [];
  for (const dp of dplans) {
    if (!dp || dp.date !== day || !dp.pisoId || !dp.ids) continue;
    const doc = dailyById.get(day + '_' + dp.pisoId);
    for (const aid of Object.keys(dp.ids)) {
      const r = doc && doc.recs && doc.recs[aid];
      if (r && (r.status || r.clr)) continue;
      if (novaIds && novaIds.has(aid)) continue;
      const x = acts.get(aid);
      if (!x || x.arch || (x.rpl && x.rpl[day])) continue;
      const dn = doneAt && doneAt.get(aid);
      if (dn && dn < day) continue; // H03a: ya estaba terminada antes de ese día: no se le pide cierre
      const who = dp.who && dp.who[aid];
      if (who && who.sc && (x.sc || '') !== who.sc) continue;
      const lv = liveBy.get(aid);
      const c = lv && lv.close;
      if (c && c.status && (c.t || 0) <= cut + CLOSE_GRACE && liveScOk(lv, x, dp)) continue; // cerró a tiempo: lo registra closesToAccept
      const hasM = typeof x.metrado === 'number' && x.metrado > 0;
      const q = hasM ? (typeof dp.ids[aid] === 'number' ? dp.ids[aid] : ((x.qty || {})[day] ?? null)) : null;
      out.push({
        date: day, pisoId: dp.pisoId, actId: aid,
        rec: {
          status: 'no', prog: q, und: x.und || '', exec: null, cnc: cause, imp: true, note: sinCierreNote(hh),
          late: false, done: false, photos: (lv && lv.photos) || [], sinCierre: true,
          ...(c && c.status ? { prop: { status: c.status, cnc: c.cnc || '', done: !!c.done, by: c.by || '', byName: c.n || '', ts: c.t || 0 } } : {}),
          sc: x.sc || '', nm: x.name || '', ambId: x.ambId || '',
          auto: true, autoSrv: true, by: 'servidor', byName: 'Corte ' + hhLabel(hh), ts: cut
        }
      });
    }
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
/* Corte del congelado del plan semanal (Configuración › Proyecto, frzCutDow/frzCutHH; oct 2026 separado del de las propuestas:
   si no se configuró, es el mismo de las propuestas de SC) */
function frzCutTs(p, n) {
  const has = p && p.frzCutDow != null && p.frzCutDow !== '' && /^\d\d:\d\d$/.test(p.frzCutHH || '');
  return has ? propCutTs({ ...p, propCutDow: p.frzCutDow, propCutHH: p.frzCutHH }, n) : propCutTs(p, n);
}
/* Semanas que el servidor debe congelar ahora: la que viene, desde su corte hasta su lunes (inclusive, por si la tarea se atrasó) */
function weeksToFreeze(p, now = Date.now()) {
  if (!p || !p.refDate) return [];
  const today = limaToday(now); const w0 = weekOf(p, today);
  return [w0, w0 + 1].filter(n => now >= frzCutTs(p, n) && today <= weekStart(p, n));
}
/* Fecha de terminada por actividad (igual que la página: índice y registros con «terminada»; respeta reaperturas). Desde la tanda 1 el
   cierre del capataz/SC con «terminada» ya no cuenta. */
/* acts (opcional, Map o {id: act}): el cierre solo cuenta si lo declaró la partida de la actividad (como liveOwn de la página);
   pisoOf (opcional): piso de la actividad, para descartar un cierre con otro piso. «Quitar registro» (clr) anula el cierre del capataz. */
function doneMap({ doneidx = [], daily = [], lives = [], acts = null, pisoOf = null }) {
  const R = new Map(), D = new Map(), real = new Set();
  const actOf = id => !acts ? undefined : (acts instanceof Map ? acts.get(id) : acts[id]);
  for (const d of doneidx) { for (const [a, v] of Object.entries(d.r || {})) if (v) R.set(a, v); }
  const add = (id, d) => { const z = R.get(id); if (z && d <= z) return; const c = D.get(id); if (!c || d < c) D.set(id, d); };
  for (const d of doneidx) for (const [a, v] of Object.entries(d.d || {})) if (v) add(a, v);
  for (const doc of daily) for (const [id, r] of Object.entries(doc.recs || {})) { if (!r) continue; if (r.status || r.clr) real.add(doc.date + '|' + id); if (r.done) add(id, doc.date); }
  /* tanda 1 (23/10/2026, decisión del dueño): el check «Terminada» del SC/capataz (live.close.done) ya NO cuenta como terminada; solo la
     que registra un ingeniero en daily (o el índice). lives, acts y pisoOf se aceptan por compatibilidad y no se usan. */
  void lives; void actOf; void real; void pisoOf;
  return D;
}
const PFIELDS = ['days', 'qty', 'metrado', 'und', 'name', 'order'];
/* igual que propMerge de web/js/propuestas.js (oct 2026, «siempre prioriza el ingeniero»): un campo que el SC cambió se aplica solo
   si el ingeniero no lo cambió también desde la base; días y cantidades se combinan día por día con la misma regla */
function propMerge(a, base, off) {
  const nw = { ...off }; const B = base || {}; const ch = (x, y, f) => canon(x[f] ?? null) !== canon(y[f] ?? null);
  for (const f of PFIELDS) if (f !== 'days' && f !== 'qty' && ch(a, B, f) && !ch(off, B, f)) nw[f] = a[f];
  const bd = new Set(B.days || []), ad = new Set(a.days || []), od = new Set(off.days || []); const eng = d => bd.has(d) !== od.has(d); const days = new Set(od);
  ad.forEach(d => { if (!bd.has(d) && !eng(d)) days.add(d); }); bd.forEach(d => { if (!ad.has(d) && !eng(d)) days.delete(d); }); nw.days = [...days].sort();
  if (a.qty || off.qty || B.qty) { const bq = B.qty || {}, aq = a.qty || {}, oq = off.qty || {}; const q = {};
    for (const d of nw.days) { const s_ = canon(aq[d] ?? null) !== canon(bq[d] ?? null), e_ = canon(oq[d] ?? null) !== canon(bq[d] ?? null); const v = s_ && !e_ ? aq[d] : oq[d]; if (v != null) q[d] = v; } nw.qty = q; }
  return nw;
}
function propTouch(b, a) {
  if (!a) return b ? [...(b.days || [])].sort() : []; if (!b) return [...(a.days || [])].sort();
  const bd = new Set(b.days || []), ad = new Set(a.days || []), T = new Set(); ad.forEach(d => { if (!bd.has(d)) T.add(d); }); bd.forEach(d => { if (!ad.has(d)) T.add(d); });
  const bq = b.qty || {}, aq = a.qty || {}; ad.forEach(d => { if (bd.has(d) && canon(bq[d] ?? null) !== canon(aq[d] ?? null)) T.add(d); });
  if ((a.und || '') !== (b.und || '') || (a.metrado ?? null) !== (b.metrado ?? null) || (a.name || '') !== (b.name || '')) ad.forEach(d => T.add(d));
  return [...T].sort();
}
/* Documentos weeks/<n>_<piso> de los pisos que tienen compromisos en la semana n: { items, propOut } como «Congelar», y aparte
   la foto del lookahead del piso (snap: días de todas sus actividades), que va a wsnap/<n>_<piso> (auditoría de datos M1: dentro de
   weeks la descargaba todo el mundo al entrar y crecía con cada semana). Lo terminado antes no es compromiso; propOut = propuestas de SC enviadas y sin decidir que tocaban ese piso y semana. */
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
    const propOut = [], propOutT = {};
    for (const d of props) for (const [id, it0] of Object.entries(d.items || {})) {
      /* oct 2026: si el SC edita algo ya enviado, la versión enviada (sentV) sigue pendiente */
      const it = it0 && (it0.sent ? it0 : it0.sentV ? { ...it0.sentV, sent: true } : null);
      if (!it) continue; const off = actById.get(id) || null; const x = it.after || off || it.base; if (!x || pisoOfAmb(x.ambId) !== p.id) continue;
      const pa = it.after && off ? propMerge(it.after, it.base || off, off) : it.after;
      if (propTouch(off, pa).some(z => days.has(z))) { const k = (d.sc || d.id) + '/' + id; propOut.push(k); propOutT[k] = it.sentAt || 0; }
    }
    /* propOutT (oct 2026): hora de envío de cada propuesta que quedó fuera, para poder ver en el Plan semanal cuándo llegó */
    out.push({ id: n + '_' + p.id, doc: { n, pisoId: p.id, frozenAt: nowIso, items, res: {}, frozenBy: 'servidor', auto: true, ...(propOut.length ? { propOut, propOutT } : {}) },
      wsnap: { snap, n, pisoId: p.id, t: nowIso } });
  }
  return out;
}

/* ---------- Cierre automático del plan del día (a la hora de Configuración, por defecto 21:00 del día anterior) ---------- */
/* hora de la publicación automática (Configuración › Proyecto, planCutHH; por defecto 21:00; como mucho 23:30: la tarea corre cada 15 min) */
function planCutHH(p) { const v = p && p.planCutHH; return typeof v === 'string' && /^\d\d:\d\d$/.test(v) && v >= '00:00' && v <= '23:30' ? v : '21:00'; }
/* ¿ya pasó hoy (hora de Lima) la hora de la publicación automática? */
function planCutDue(p, now = Date.now()) { const t = new Date(now - LIMA).toISOString().slice(11, 16); return t >= planCutHH(p); }
/* día hábil (como la página: domingo no; feriados y sábado según Configuración › Calendario). C-08 (tanda 1): una fecha marcada
   «se trabaja» (cal.work: [{d, n}]) es laborable aunque sea domingo, feriado o sábado no laborable */
function isWork(p, d) { const c = (p && p.cal) || {}; if ((c.work || []).some(o => o && o.d === d)) return true; const dw = pd(d).getUTCDay(); if (dw === 0) return false; if ((c.hol || []).some(o => o && o.d === d)) return false; if (dw === 6 && c.sat === false) return false; return true; }
/* Feriados nacionales de Perú (misma lista que holPeru de web/js/auditoria.js, botón «+ Feriados nacionales de Perú AAAA») */
function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return y + '-' + String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0'); }
function holPeru(y) {
  const e = easter(y);
  const F = [['01-01', 'Año Nuevo'], ['05-01', 'Día del Trabajo'], ['06-07', 'Batalla de Arica y Día de la Bandera'], ['06-29', 'San Pedro y San Pablo'], ['07-23', 'Día de la Fuerza Aérea'], ['07-28', 'Fiestas Patrias'], ['07-29', 'Fiestas Patrias'], ['08-06', 'Batalla de Junín'], ['08-30', 'Santa Rosa de Lima'], ['10-08', 'Combate de Angamos'], ['11-01', 'Todos los Santos'], ['12-08', 'Inmaculada Concepción'], ['12-09', 'Batalla de Ayacucho'], ['12-25', 'Navidad']];
  return [...F.map(([md, n]) => ({ d: y + '-' + md, n })), { d: addD(e, -3), n: 'Jueves Santo' }, { d: addD(e, -2), n: 'Viernes Santo' }].sort((a, b) => a.d.localeCompare(b.d));
}
/* C-08 (tanda 1): precarga de los feriados nacionales del año actual y el siguiente, una vez por año (constancia cal.holPre).
   Nunca borra ni pisa: si el año ya tiene alguno de los feriados nacionales (el administrador los cargó con el botón y quizá
   corrigió o quitó alguno), solo deja la constancia; si no, agrega los que faltan. → null si no hay nada que hacer, o
   {hol, holPre, add} con la lista completa nueva. */
function holPreload(cal, years) {
  const c = cal || {}; const pre0 = Array.isArray(c.holPre) ? c.holPre.map(Number) : [];
  const todo = years.filter(y => !pre0.includes(y)); if (!todo.length) return null;
  const hol = (Array.isArray(c.hol) ? c.hol : []).filter(o => o && o.d); const have = new Set(hol.map(o => o.d)); const add = [];
  for (const y of todo) { const L = holPeru(y); if (L.some(o => have.has(o.d))) continue; for (const o of L) { add.push(o); have.add(o.d); } }
  return { hol: [...hol, ...add].sort((a, b) => a.d.localeCompare(b.d)), holPre: [...new Set([...pre0, ...todo])].sort(), add };
}
function nextWork(p, d) { let x = addD(d, 1); for (let i = 0; i < 30 && !isWork(p, x); i++) x = addD(x, 1); return x; }
/* foto del plan del día por piso: {actId: cantidad | null} de lo programado ese día y no terminado (sin lo archivado) */
function buildDayPlan({ pisos, sectors, ambientes, acts, done = new Map() }, d) {
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort(byOrder); if (!P.length) return [];
  const pids = new Set(P.map(p => p.id)); const first = P[0].id;
  const secById = new Map(live(sectors).map(s => [s.id, s])), ambById = new Map(live(ambientes).map(a => [a.id, a]));
  const pisoOfAmb = id => { const a = ambById.get(id); const s = a && secById.get(a.sectorId); return a ? (s && s.pisoId && pids.has(s.pisoId) ? s.pisoId : first) : ''; };
  const by = new Map(P.map(p => [p.id, {}])); const wh = new Map(P.map(p => [p.id, {}]));
  for (const x of live(acts)) {
    if (!(x.days || []).includes(d)) continue; const dn = done.get(x.id); if (dn && d > dn) continue;
    const pid = pisoOfAmb(x.ambId); if (!by.has(pid)) continue; const q = (x.qty || {})[d]; by.get(pid)[x.id] = q != null ? +q : null;
    /* who: SC y ambiente de cada compromiso al publicar (auditoría PPC diario, hallazgo 6): cambiar la partida o el ambiente después no reasigna el historial */
    wh.get(pid)[x.id] = { sc: x.sc || '', amb: x.ambId || '' };
  }
  return [...by.entries()].filter(([, ids]) => Object.keys(ids).length).map(([pisoId, ids]) => ({ id: d + '_' + pisoId, doc: { date: d, pisoId, ids, who: wh.get(pisoId) } }));
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
/** días y cantidades de una actividad al agregarla al plan del día (padd): rep/new = suma el día; adel = mueve su día «from» */
function paddApply(y, zz, date) {
  let days = [...(y.days || [])]; const qty = { ...(y.qty || {}) };
  if (zz.t === 'adel') { if (!days.includes(zz.from)) return null; days = days.filter(d => d !== zz.from); if (qty[zz.from] != null) { qty[date] = qty[zz.from]; delete qty[zz.from]; } }
  if (!days.includes(date)) days.push(date); days.sort();
  if (zz.t === 'rep' && zz.q != null && zz.q !== '') qty[date] = +zz.q;
  return { days, qty };
}
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
  /* agregado al plan (padd, aceptado): reprogramar / adelantar a este día o actividad nueva (igual que la página: pubPlan/paddApply) */
  const padds = [], newActs = [];
  const PA = drafts.filter(z => z && z.kind === 'padd' && z.draft && z.st === 'ok' && z.date === date && z.pisoId === pisoId)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0) || String(a.id).localeCompare(String(b.id)));
  for (const zz of PA) {
    if (zz.t === 'new') {
      const nid = zz.newId || mkId('act');
      newActs.push({ id: nid, doc: { ambId: zz.ambId, sc: zz.sc || '', name: zz.name || '', und: zz.und || '', metrado: zz.q != null ? +zz.q : null, days: [date], qty: zz.q != null ? { [date]: +zz.q } : {}, order: zz.order || 99990 } });
      padds.push({ id: zz.id, patch: { draft: false, pub: PID, actId: nid } }); continue;
    }
    const id = zz.actId; const y = W.get(id) || acts.get(id); if (!y || y.arch) { skipped.push(zz.name || id); continue; }
    if (zz.t === 'adel' && closed.has(zz.from) && closed.get(zz.from).has(id)) { blocked.push(y.name || id); log.push(`${y.name || id}: no se adelanta, cambiaría el plan ya cerrado del ${zz.from}`); continue; }
    const o = paddApply(y, zz, date); if (!o) { skipped.push(y.name || id); continue; }
    W.set(id, { ...y, ...o });
    padds.push({ id: zz.id, patch: { draft: false, pub: PID, mv: { [id]: { p: y.days || [], pq: y.qty || {}, n: o.days, nq: o.qty } } } });
  }
  const out = {};
  for (const [id, y] of W) out[id] = { days: y.days, qty: y.qty || {}, ...(y.rpl ? { rpl: y.rpl } : {}) };
  const nPub = novas.length + padds.length;
  const pubW = nPub ? { id: PID, doc: { date, pisoId, sc: '', kind: 'pub', n: ((pub && pub.n) || 0) + nPub, ...BY, ts: now, auto: true } } : null;
  return { acts: out, restrs, novas, padds, newActs, pub: pubW, skipped, blocked, log };
}
/* Fechas cuyos planes cerrados (dplan) hay que releer antes de publicar: los días ≥ fecha de las actividades y adónde irían */
function draftDates(drafts, acts, project, date) {
  const S = new Set();
  for (const z of drafts) {
    if (z.kind === 'padd') { if (z.t === 'adel' && z.from && z.from !== date) S.add(z.from); continue; }
    const n = z.shift || wdist(project, z.date, z.repTo);
    for (const id of z.ids || [z.actId]) { const y = acts.get(id); if (!y) continue; for (const d of y.days || []) if (d >= date) { S.add(d); S.add(wshift(project, d, n)); } }
  }
  S.delete(date); return [...S].sort();
}
/* Propuestas del SC (pdz kind:'dprop') sin revisar del día y piso: a la hora de cierre se rechazan («va lo programado») */
const DPROP_REJ = now => ({ st: 'rej', dec: 'Cierre automático: va según lo programado', decBy: 'servidor', decN: 'Cierre automático', decT: now });
const pendProps = (docs, date, pisoId) => docs.filter(z => z && (z.kind === 'dprop' || (z.kind === 'padd' && z.draft)) && z.st === 'pend' && z.date === date && z.pisoId === pisoId);

/* Cierre automático de un piso, en una transacción (db = Firestore de admin): si el plan del día ya tiene foto (ids) o fue
   reabierto, no hace nada. Si no: relee el aviso de publicado, cada borrador, sus actividades y los planes cerrados de las fechas
   que tocarían; publica los borradores (publishDrafts), rechaza las propuestas del SC aún pendientes y guarda la foto del plan
   (buildDayPlan con las actividades ya corridas). ctx.drafts / ctx.props: los docs pdz del día y piso (leídos antes). */
async function closePlanPiso(db, { project = {}, pisos, sectors, ambientes, acts, done = new Map(), contractors = new Map(), drafts = [], props = [], zones = [], piso, logger = null }, d, now = Date.now()) {
  const pid = piso.id; const col = c => db.collection(c);
  const dref = col('dplan').doc(d + '_' + pid); const PID = 'pub_' + d + '_' + pid; const pref = col('pdz').doc(PID);
  return db.runTransaction(async tx => {
    const cur = await tx.get(dref); const c0 = cur.exists ? cur.data() : null;
    if (c0 && (c0.ids || c0.reo)) return { skip: true, has: !!c0.ids };
    const ps = await tx.get(pref);
    const D = [];
    for (const z of drafts) { const s = await tx.get(col('pdz').doc(z.id)); if (s.exists) D.push({ ...s.data(), id: z.id }); }
    const A = new Map();
    for (const id of new Set(D.flatMap(z => z.ids || [z.actId]).filter(Boolean))) { const s = await tx.get(col('acts').doc(id)); if (s.exists) A.set(id, { ...s.data(), id }); }
    const DP = new Map();
    for (const dd of draftDates(D, A, project, d)) { const s = await tx.get(col('dplan').doc(dd + '_' + pid)); if (s.exists) DP.set(dd + '_' + pid, s.data()); }
    const P = [];
    for (const z of props) { const s = await tx.get(col('pdz').doc(z.id)); if (s.exists && (s.data() || {}).st === 'pend') P.push(z.id); }
    let R = D.length ? publishDrafts({ drafts: D, acts: A, dplans: DP, contractors, project, pub: ps.exists ? ps.data() : null }, d, pid, now) : null;
    /* auditoría 09/10: una restricción res-<borrador> que ya existe y está liberada (deshacer publicación y volver a publicar)
       no se reescribe como pendiente */
    if (R && R.restrs.length) { const keep = []; for (const r of R.restrs) { const s = await tx.get(col('restr').doc(r.id)); if (!(s.exists && (s.data() || {}).status === 'lib')) keep.push(r); } R = { ...R, restrs: keep }; }
    const nW = R ? Object.keys(R.acts).length + R.restrs.length + R.novas.length + (R.padds || []).length + (R.newActs || []).length + zones.length + (R.pub ? 1 : 0) : 0;
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
    if (R) for (const na of R.newActs || []) Acts.set(na.id, { ...na.doc, id: na.id });
    const pl = buildDayPlan({ pisos, sectors, ambientes, acts: Acts, done }, d).find(o => o.doc.pisoId === pid);
    const ids = pl ? pl.doc.ids : {}; const who = pl ? pl.doc.who : {};
    if (R) {
      for (const [id, u] of Object.entries(R.acts)) tx.update(col('acts').doc(id), u);
      for (const r of R.restrs) tx.set(col('restr').doc(r.id), r.doc);
      for (const o of R.novas) tx.update(col('pdz').doc(o.id), o.patch);
      for (const na of R.newActs || []) tx.set(col('acts').doc(na.id), na.doc);
      for (const o of R.padds || []) {
        tx.update(col('pdz').doc(o.id), o.patch);
        /* áreas dibujadas para lo agregado (zona con paId): pasan a ser de la actividad */
        const aid = o.patch.actId || Object.keys(o.patch.mv || {})[0];
        for (const z of zones) if (z.paId === o.id && aid) tx.update(col('pdz').doc(z.id), { actId: aid, fuera: false });
      }
      if (R.pub) tx.set(pref, R.pub.doc);
      /* queda en el Historial del lookahead como la publicación desde la página */
      const items = Object.entries(R.acts).map(([id, u]) => { const b = A.get(id) || acts.get(id) || {};
        return { id, nm: b.name || '', amb: '', sc: b.sc || '', k: 'mod', b: { days: b.days || [], qty: b.qty || {} }, a: { days: u.days || [], qty: u.qty || {} } }; }).slice(0, 150);
      if (items.length) tx.set(col('lhlog').doc(now + '_srv' + pid), { t: now, d, by: 'servidor', n: 'Cierre automático', label: `Plan del ${d} publicado en el cierre automático`, tab: 'mapa', items });
    }
    const P2 = P;
    for (const id of P2) tx.update(col('pdz').doc(id), DPROP_REJ(now));
    const pub = !!(R && R.pub);
    if (Object.keys(ids).length) tx.set(dref, { ...(c0 || {}), date: d, pisoId: pid, ids, who, at: now, by: 'servidor', byName: 'Cierre automático', auto: true, ...(pub ? { pub: PID } : {}) });
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
  return !!member && member.off !== true && (['admin', 'tasis'].includes(member.role) || (member.role === 'campo' && member.tasis === true));
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

/* ---------- Publicación del tareo (F3) ----------
   La lógica pura vive en tpub.js (sin require: el Firebase falso de las pruebas de la interfaz lo carga en el navegador)
   y se exporta también desde aquí. Ver docs/ia/tareo.md, «Implementación de F3 — servidor». */
const TPUB = require('./tpub');

/* ---------- Reintentos por piso de congelarSemana (frz/<n>) y cerrarPlan (pcl/<fecha>) (auditoría de código 08/10, M2/M3) ----------
   Cada piso va en su propio try/catch: si uno falla, los demás siguen. La constancia guarda los pisos que fallaron (fail) y
   cuántas pasadas van (tries); las pasadas siguientes (cada 15 min) solo reintentan esos pisos, hasta RETRY_MAX pasadas.
   Sin fallas pendientes no se vuelve a leer nada más que la constancia. Constancias antiguas (sin fail) = hecho. */
const RETRY_MAX = 8;
/** qué hacer según la constancia: null = nada (hecho o se agotaron los intentos); {only:null,tries:0} = todo (primera vez);
 *  {only:Set de pisos, tries} = reintentar solo esos */
function retryPlan(doc, max = RETRY_MAX) {
  if (!doc) return { only: null, tries: 0 };
  const fail = Array.isArray(doc.fail) ? doc.fail.filter(Boolean) : [];
  if (!fail.length) return null;
  const tries = Math.max(1, +doc.tries || 1);
  if (tries >= max) return null;
  return { only: new Set(fail), tries };
}
/** corre fn(id) piso por piso; un error no corta el resto. → {done:[ids], fail:[ids], out:Map(id → resultado)} */
async function runFloors(ids, fn, onErr) {
  const done = [], fail = [], out = new Map();
  for (const id of ids) {
    try { out.set(id, await fn(id)); done.push(id); }
    catch (e) { fail.push(id); if (onErr) try { onErr(id, e); } catch (e2) { /* el aviso no corta la tarea */ } }
  }
  return { done, fail, out };
}
/** constancia nueva: base (at, n o d…) + lo hecho antes y ahora (done y los contadores de sum se suman) + los que fallaron */
function retryRecord(prev, plan, base, done, fail, sum) {
  const p = (plan && plan.tries && prev) || {};
  const o = { ...base, tries: ((plan && plan.tries) || 0) + 1, fail: [...fail] };
  o.done = [...new Set([...(Array.isArray(p.done) ? p.done : []), ...done])];
  for (const [k, v] of Object.entries(sum || {})) o[k] = (+p[k] || 0) + (+v || 0);
  return o;
}

/* ---------- Migración: la foto del lookahead (snap) sale de weeks a wsnap (auditoría de datos M1) ----------
   Sin perder nada: por cada documento de weeks que todavía tiene snap (semana congelada: snap; copia de un descongelado
   __h: v.snap) se escribe wsnap/<mismo id> y recién entonces se quita el campo de weeks, las dos cosas juntas (una transacción
   por documento). Si wsnap/<id> ya existe con otra foto, esa se guarda antes en wsnap/<id>__m<hora> (la de weeks manda: es la
   que acompaña a su congelado). → null si el documento no tiene nada que mover. */
const WSNAP_PAGE = 100;
function wsnapPlan(id, w, ex, stamp) {
  if (!w) return null;
  const top = w.snap !== undefined, inV = !top && !!w.v && typeof w.v === 'object' && w.v.snap !== undefined;
  if (!top && !inV) return null;
  const snap = (top ? w.snap : w.v.snap) || {};
  const doc = { snap, n: w.n ?? null, pisoId: w.pisoId || '', t: (top ? w.frozenAt : w.v.frozenAt) || null, mig: true, ...(w.histOf ? { histOf: w.histOf } : {}) };
  const sets = [];
  const same = !!ex && canon(ex.snap || {}) === canon(snap);
  if (ex && !same) sets.push([id + '__m' + stamp, { ...ex, movedAt: stamp }]);
  if (!same) sets.push([id, doc]);
  return { sets, del: top ? 'snap' : 'v.snap', same };
}

/* ---------- Versión para el cliente (igual que web/js/cliente.js) ----------
   Capa sobre el lookahead interno: holgura en días hábiles (cli/buf: actividad › ambiente › sector › piso › obra, manda la
   más específica), cambios por fila (clia/<id>.f; si cambian los días, la fila queda fijada), ocultas (hide) y filas solo
   del cliente (own + a). La emisión de la semana n vence el sábado 23:00 (Lima) antes de su lunes. */
const cliCutTs = (p, n) => Date.parse(addD(weekStart(p, n), -2) + 'T23:00:00Z') + LIMA;
/* semana desde la que vale una versión emitida (las antiguas, sin forW: desde el lunes de su fecha o el siguiente) */
function cliForW(p, v) { if (v && v.forW != null) return +v.forW; const w = weekOf(p, v.date); return weekStart(p, w) === v.date ? w : w + 1; }
function cliCompose({ project, pisos, sectors, ambientes, acts, buf = {}, clia = new Map() }) {
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort((a, b) => (a.order || 0) - (b.order || 0));
  const first = P.length ? P[0].id : '';
  const pisoOfSec = s => (s && s.pisoId && pisos.has(s.pisoId) ? s.pisoId : first);
  const has = (m, k) => m && k != null && Object.prototype.hasOwnProperty.call(m, k);
  const bufOf = x => {
    const a = ambientes.get(x.ambId); const s = a && sectors.get(a.sectorId);
    for (const [l, k] of [['x', x.id], ['a', a && a.id], ['s', a && a.sectorId], ['p', s ? pisoOfSec(s) : null]]) if (has(buf[l], k)) return +buf[l][k] || 0;
    return +buf.all || 0;
  };
  const shift = x => {
    const n = bufOf(x); if (!n) return x;
    const days = [...new Set((x.days || []).map(d => wshift(project, d, n)))].sort();
    const qty = {}; for (const [d, v] of Object.entries(x.qty || {})) { const k = wshift(project, d, n); qty[k] = (qty[k] || 0) + (+v || 0); }
    return { ...x, days, qty };
  };
  const out = new Map();
  for (const x of live(acts)) {
    const o = clia.get(x.id); if (o && (o.hide || o.own)) continue;
    const f = o && o.f;
    out.set(x.id, !f || !Object.keys(f).length ? shift(x) : f.days ? { ...x, ...f, id: x.id } : { ...shift(x), ...f, id: x.id });
  }
  for (const [id, o] of clia) if (o && o.own && !o.arch && o.a && !out.has(id) && ambientes.has(o.a.ambId) && !ambientes.get(o.a.ambId).arch) {
    const a = { ...o.a, id, own: true }; if (Array.isArray(a.days)) a.days = [...new Set(a.days)].sort(); out.set(id, a);
  }
  return out;
}
/* Foto para el cliente (mismo formato que «Emitir al cliente» de la página), para la semana n */
function buildCliVersion(data, n, now = Date.now()) {
  const { project, pisos, sectors, ambientes } = data;
  const live = m => [...m.values()].filter(x => !x.arch);
  const P = live(pisos).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!P.length) return null;
  const first = P[0].id;
  /* como pisoOfSecObj de la página: un sector de un piso archivado sigue en ese piso (y no se emite) */
  const pisoOfSec = s => (s && s.pisoId && pisos.has(s.pisoId) ? s.pisoId : first);
  const X = cliCompose(data);
  const today = limaToday(now);
  const id = 'auto-c' + n;
  const idx = { label: `Semana ${n} · automática (sáb ${fmtD(addD(weekStart(project, n), -2))} 23:00)`, kind: 'auto', ts: now, date: today, week: weekOf(project, addD(today, 1)), forW: n, by: 'servidor', byName: 'Servidor (automático)', buf: data.buf || {}, pisos: {} };
  const docs = []; const S = live(sectors), A = live(ambientes);
  for (const p of P) {
    const secs = {}, ambs = {}, ax = {};
    for (const s of S) if (pisoOfSec(s) === p.id) secs[s.id] = strip(s);
    for (const a of A) if (secs[a.sectorId]) ambs[a.id] = strip(a);
    for (const x of X.values()) if (ambs[x.ambId]) { const c = strip(x); delete c.obs; delete c.obsSug; ax[x.id] = c; }
    idx.pisos[p.id] = { code: p.code, name: p.name, order: p.order || 0, acts: Object.keys(ax).length };
    docs.push([id + '__' + p.id, { verId: id, pisoId: p.id, piso: strip(p), json: JSON.stringify({ secs, ambs, acts: ax }) }]);
  }
  return { id, idx, docs };
}
/* ¿Le toca al servidor emitir ahora? Semana n = la siguiente; desde su corte (sáb 23:00) hasta su lunes, si nadie emitió para n */
function cliDue(p, versions, now = Date.now()) {
  if (!p || !p.refDate) return null;
  const today = limaToday(now); const n = weekOf(p, today) + 1;
  if (now < cliCutTs(p, n) || today >= weekStart(p, n)) return null;
  return versions.some(v => cliForW(p, v) === n) ? null : n;
}

/* ---------- Avisos de detenciones al celular y a la computadora (push, oct 2026; docs/ia/avisos.md) ----------
   Cuando un SC/capataz/ingeniero marca «Detenido» (evento nuevo en live.log), se avisa a los responsables de ese piso
   (editores con el piso a cargo, sin baja) y a los administradores (que pueden limitar sus pisos en pushp/<correo>.pisos),
   menos a quien lo reportó. Solo en días hábiles y dentro del horario de Configuración › Proyecto (pushIni–pushFin,
   por defecto 07:00–18:00). No se avisa lo reportado al cierre (a la hora de corte o después, o junto con el cierre). */
const STOP_INFO_L = 'Inicia después';
const limaHM = t => new Date(t - LIMA).toISOString().slice(11, 16);
const hmOk = v => typeof v === 'string' && /^\d\d:\d\d$/.test(v);
function pushHorario(p) { const ini = hmOk(p && p.pushIni) ? p.pushIni : '07:00'; let fin = hmOk(p && p.pushFin) ? p.pushFin : '18:00'; if (fin <= ini) fin = '18:00'; return { ini, fin }; }
/* el «Detenido» nuevo de esta escritura (el último que no estaba antes), o null */
function nuevoDetenido(before, after) {
  if (!after) return null;
  const key = e => `${e.t}|${e.by || ''}|${e.s}`;
  const B = new Set(((before && before.log) || []).filter(Boolean).map(key));
  const L = (after.log || []).filter(e => e && e.s === 'stop' && e.m !== STOP_INFO_L && !B.has(key(e)));
  return L.length ? L[L.length - 1] : null;
}
/* por qué NO se avisa ('' = sí se avisa) */
function avisoNo(p, live, e, now = Date.now()) {
  if (!e || !e.t) return 'sin detenido';
  if (p && p.pushOff === true) return 'avisos apagados';
  const d = new Date(e.t - LIMA).toISOString().slice(0, 10);
  if (!live || live.date !== d || d !== limaToday(now)) return 'no es de hoy';
  if (now - e.t > 6 * 3600e3) return 'llegó con más de 6 h de atraso';
  if (!isWork(p, d)) return 'día no laborable';
  const hm = limaHM(e.t), H = pushHorario(p);
  if (hm < H.ini || hm >= H.fin) return 'fuera del horario de avisos';
  if (hm >= closeCutHH(p)) return 'reportado al cierre';
  if (live.close && live.close.t && e.t >= live.close.t - 60000) return 'reportado al cierre';
  return '';
}
/* a quién: members [{id, role, pisos, off}], prefs { correo: { pisos: [] } } (solo administradores) */
function avisoDestinos(members, pid, by, prefs = {}) {
  const out = new Set(); const seen = new Set();
  const admOk = em => { const f = prefs[em] && Array.isArray(prefs[em].pisos) && prefs[em].pisos.length ? prefs[em].pisos : null; return !f || f.includes(pid); };
  for (const m of members || []) {
    if (!m || !m.id) continue; const em = String(m.id).toLowerCase(); seen.add(em);
    if (m.off === true && em !== OWNER) continue;
    if (m.role === 'admin' || em === OWNER) { if (admOk(em)) out.add(em); continue; }
    if (m.role === 'editor' && Array.isArray(m.pisos) && m.pisos.includes(pid)) out.add(em);
  }
  if (!seen.has(OWNER) && admOk(OWNER)) out.add(OWNER);
  out.delete(String(by || '').toLowerCase());
  return [...out].filter(em => em.includes('@'));
}
/* texto del aviso (los datos de un push web van como texto) */
function avisoTexto({ aid, date, e, act, amb, piso, con, lvMot }) {
  const mot = String(e.m || 'Detenido');
  let note = String(e.x || '');
  if (!note && lvMot && String(lvMot).indexOf(' — ') > 0) note = String(lvMot).slice(String(lvMot).indexOf(' — ') + 3).trim();
  const pl = piso ? (piso.code || piso.name || '') : '';
  return {
    title: `⏸ Detenido${pl ? ' · ' + pl : ''} · ${(con && con.name) || '—'}`,
    body: `${(act && act.name) || 'Actividad'} · ${(amb && amb.name) || ''}\n${mot}${note ? ' — ' + note : ''} · ${limaHM(e.t)}`,
    tag: 'det-' + aid, aid: String(aid), d: String(date), url: `./?det=${encodeURIComponent(aid)}&d=${date}`
  };
}

module.exports = {
  CLOSE_GRACE, engCutHH, engCutTs, jornadaDays, holPeru, holPreload, easter,
  pushHorario, nuevoDetenido, avisoNo, avisoDestinos, avisoTexto, limaHM,
  CNC_SIN_CONF, closeCutHH, closeCutTs, cncSinCierre, sinCierre, ...TPUB, CTA_DOM, ctaDni, ctaMail, ctaEsMail, ctaClaveOk, ctaClave, ctaPuede, ctaNombre, ctaPedido, ctaMigrables,
   planCutHH, planCutDue, pd, addD, fmtD, limaToday, weekOf, lastSundayNoon, buildVersion, closesToAccept, acceptCloses, propCutTs, frzCutTs, weeksToFreeze, doneMap, buildFreeze, weekDays, isWork, nextWork, buildDayPlan,
  wshift, wdist, shiftDays, rplDay, restrTypeFor, changedDays, publishDrafts, draftDates, DPROP_REJ, pendProps, closePlanPiso,
  RETRY_MAX, retryPlan, runFloors, retryRecord, WSNAP_PAGE, wsnapPlan, cliCutTs, cliForW, cliCompose, buildCliVersion, cliDue };
