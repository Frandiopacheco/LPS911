/* Publicación del tareo (F3, docs/ia/tareo.md «Contrato de F3» e «Implementación de F3 — servidor»): lógica pura, sin Firebase.
   La usa la función invocable publicarTareo (functions/index.js, por medio de lib.js) y también el Firebase falso de las pruebas
   de la interfaz (tests/e2e/fake-firebase.js), que carga este mismo archivo en el navegador (window.TPUB): así la simulación
   publica exactamente con las mismas reglas que el servidor. Por eso no usa require ni nada de Node.
   Cálculo: el mismo criterio que tCalc/tCalcHrs de web/js/tareo.js, pero solo con la jornada congelada del tareo (cfg). */
(function (root, factory) {
  const M = factory();
  if (typeof module === 'object' && module.exports) module.exports = M;
  else root.TPUB = M;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const OWNER = 'frandiopacheco@gmail.com';
  const HMAX = 16;
  const r2 = v => Math.round(v * 100) / 100;
  const tmin = s => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '')); return m ? +m[1] * 60 + +m[2] : null; };
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  const vals = x => (x instanceof Map ? [...x.values()] : Array.isArray(x) ? x : Object.values(x || {}));
  const hv = v => { const n = +v; return v !== '' && v !== null && v !== true && Number.isFinite(n) && n > 0 ? n : 0; };
  const fechaOk = f => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) && !isNaN(Date.parse(f + 'T00:00:00Z')) && new Date(f + 'T00:00:00Z').toISOString().slice(0, 10) === f;
  const dow = f => new Date(f + 'T00:00:00Z').getUTCDay();
  const sameSet = (a, b) => { const A = [...new Set(Array.isArray(a) ? a : [])].sort(), B = [...new Set(Array.isArray(b) ? b : [])].sort(); return A.length === B.length && A.every((x, i) => x === B[i]); };
  const nomDe = (r, dni) => (r && (r.ape || r.nom) ? [r.ape, r.nom].filter(Boolean).join(', ') : dni || '');
  const capDe = t => (t && (t.capN || t.cap)) || 'capataz sin nombre';
  const ST = { bor: 'en borrador', env: 'enviado y sin revisar', reab: 'reabierto al capataz', rev: 'revisado', pub: 'publicado' };

  /* ---------- jornada ---------- */
  /* igual que TCFG_DEF y TC() de web/js/tareo.js */
  const TCFG_DEF = { jor: { 1: ['07:30', '17:00', 60], 2: ['07:30', '17:00', 60], 3: ['07:30', '17:00', 60], 4: ['07:30', '17:00', 60], 5: ['07:30', '17:00', 60], 6: ['07:30', '13:00', 0], 0: null }, refIni: '12:00', refNoLab: { ref: 60, refIni: '12:00' } };
  /** configuración del día como tCfgDia de la app ({v:1, jor, fer, rnl}) a partir de tcfg/main. Solo para la previa de un tareo
      sin jornada congelada (eso igual bloquea la publicación). */
  function tpCfgDia(tcfg, fecha) {
    const c = tcfg || {}; const gri = /^\d{1,2}:\d{2}$/.test(c.refIni || '') ? c.refIni : TCFG_DEF.refIni; const k = String(dow(fecha));
    let v; if (c.jor && has(c.jor, k)) v = c.jor[k]; else { const d = TCFG_DEF.jor[k]; v = d ? { ini: d[0], fin: d[1], ref: d[2] } : null; }
    const jor = v && v.ini && v.fin ? { ini: v.ini, fin: v.fin, ref: Math.max(0, +v.ref || 0), refIni: v.refIni || gri } : null;
    const rn = c.refNoLab; const rnl = typeof rn === 'number' ? { ref: Math.max(0, rn), refIni: gri } : rn && typeof rn === 'object' ? { ref: rn.ref != null && rn.ref !== '' ? Math.max(0, +rn.ref || 0) : 60, refIni: rn.refIni || gri } : { ...TCFG_DEF.refNoLab };
    return { v: 1, jor, fer: Array.isArray(c.fer) && c.fer.includes(fecha), rnl };
  }
  /** reglas del día desde la jornada congelada: {nl no laborable, jh horas de jornada}. Sin cfg válida: no laborable (todo extra). */
  function tpDia(cfg) {
    const j = cfg && cfg.v === 1 && cfg.jor && cfg.jor.ini && cfg.jor.fin ? cfg.jor : null; const nl = !!(cfg && cfg.fer) || !j;
    let jh = 0; if (!nl) { const a = tmin(j.ini), b = tmin(j.fin); jh = a == null || b == null || b <= a ? 0 : r2(Math.max(0, b - a - (+j.ref || 0)) / 60); }
    return { nl, jh };
  }
  const cfgOk = c => !!c && c.v === 1;

  /** horas de una fila del tareo para la publicación → {h:{pc:horas}, trab, ext}.
      modo 'hrs': trab = suma de h, ext = max(0, trab − jornada) (no laborable: todo extra), sobre el total del día del obrero.
      Tareo antiguo (bloques, sin modo): se usan los valores guardados rows[dni].h/trab/ext (los calculó tCalc al enviar o corregir).
      No vino o sin marcar: sin horas. */
  function tpCalcRow(row, cfg, modo) {
    const r = row || {};
    if (r.as !== true) return { h: {}, trab: 0, ext: 0 };
    const h = {}; let t = 0;
    for (const [k, v] of Object.entries(r.h || {})) { const n = hv(v); if (n) { h[k] = r2(n); t += n; } }
    if (modo === 'hrs') { const D = tpDia(cfg); const trab = r2(t); return { h, trab, ext: D.nl ? trab : r2(Math.max(0, trab - D.jh)) }; }
    const trab = Number.isFinite(+r.trab) && r.trab !== '' && r.trab != null ? r2(Math.max(0, +r.trab)) : r2(t);
    const ext = Number.isFinite(+r.ext) && r.ext !== '' && r.ext != null ? r2(Math.max(0, +r.ext)) : 0;
    return { h, trab, ext };
  }
  /** ¿activo en la fecha? (como tActivo de la app: algún periodo de `per` contiene la fecha; el día del cese cuenta; archivado nunca) */
  function tpActivo(p, fecha) {
    if (!p || p.arch) return false;
    const en = x => (!x.ing || x.ing <= fecha) && (!x.ces || fecha <= x.ces);
    const per = Array.isArray(p.per) ? p.per.filter(x => x && (x.ing || x.ces)) : [];
    return per.length ? per.some(en) : en(p);
  }
  /** cotejo vigente: hay foto y cotFot son las mismas fotos (sin orden), como tCotDe de la app */
  const tpCotVig = t => !!t && Array.isArray(t.foto) && t.foto.length > 0 && !!t.cot && typeof t.cot === 'object' && sameSet(t.cotFot, t.foto);

  /* ---------- validación del día ---------- */
  const tareosDia = (tareos, fecha) => vals(tareos).filter(t => t && !t.arch && (!fecha || !t.date || t.date === fecha) && t.rows && typeof t.rows === 'object' && Object.keys(t.rows).length);
  const excLimpias = e => { const o = {}; for (const [k, v] of Object.entries(e || {})) { const m = typeof v === 'string' ? v.trim().slice(0, 200) : ''; if (k && m) o[k] = m; } return o; };
  /** valida el día y arma el resumen. tareos: los del día (con id); personal: tper (Map o lista, con id = DNI); partidas: tpc (Map o lista);
      excepciones {dni: motivo} para los activos sin tareo; cfgAct = configuración actual del día (solo para mostrar horas de un tareo sin cfg);
      rect = ya hay una versión publicada (se aceptan tareos en «pub»).
      → {bloqueos:[{k, msg, tareo?, tareos?, dni?, pc?}], resumen, sinTareo:[…], exc:{dni:{motivo, ape, nom}}}
      k: nada · estado · cfg · cot (sin foto o cotejo de otra foto) · marca (sin marcar) · hval · sinh (vino con 0 h) · hmax (> 16 h) ·
         pc (partida inexistente) · firp (presente sin firma cotejada) · dup (DNI en dos o más tareos) · cob (activo sin tareo ni excepción) */
  function tpValidarDia({ fecha, tareos, personal, partidas, excepciones, cfgAct, rect }) {
    const T = tareosDia(tareos, fecha); const B = []; const E = excLimpias(excepciones);
    const PC = new Map(vals(partidas).filter(Boolean).map(p => [p.id, p]));
    const per = vals(personal).filter(Boolean);
    const pcMal = new Set(); const porDni = new Map();
    const R = { fecha, tareos: [], porEstado: {}, obreros: 0, pres: 0, aus: 0, sm: 0, porMot: {}, sinTareo: 0, exc: 0, hh: 0, he: 0, alt: 0, porPc: {} };
    for (const t of T) {
      const st = t.st || 'bor'; const cap = capDe(t); const cfg = cfgOk(t.cfg) ? t.cfg : cfgAct; const vig = tpCotVig(t); const hrs = t.modo === 'hrs';
      const tr = { id: t.id || '', cap: t.cap || '', capN: t.capN || '', st, n: 0, pres: 0, aus: 0, sm: 0, hh: 0, he: 0, bloq: 0 }; const nb = B.length;
      R.porEstado[st] = (R.porEstado[st] || 0) + 1;
      if (!(st === 'rev' || (rect && st === 'pub'))) B.push({ k: 'estado', tareo: tr.id, msg: `El tareo de ${cap} está ${ST[st] || st}: debe estar revisado para publicar.` });
      if (!cfgOk(t.cfg)) B.push({ k: 'cfg', tareo: tr.id, msg: `El tareo de ${cap} no tiene guardada la jornada del día: quítale el revisado y vuelve a marcarlo revisado.` });
      if (!vig) B.push({ k: 'cot', tareo: tr.id, msg: Array.isArray(t.foto) && t.foto.length ? `El cotejo de firmas del tareo de ${cap} no corresponde a la foto actual: vuelve a cotejarlo.` : `El tareo de ${cap} no tiene la foto del formato firmado.` });
      for (const [dni, r] of Object.entries(t.rows)) {
        if (!r) continue; tr.n++;
        const L = porDni.get(dni) || []; L.push(t); porDni.set(dni, L);
        const nm = nomDe(r, dni);
        if (r.as !== true && r.as !== false) { tr.sm++; B.push({ k: 'marca', tareo: tr.id, dni, msg: `${nm} (tareo de ${cap}): falta marcar si vino.` }); continue; }
        if (r.as === false) { tr.aus++; const m = r.mot || '_'; R.porMot[m] = (R.porMot[m] || 0) + 1; continue; }
        tr.pres++; if (r.alt === true) R.alt++;
        if (hrs && Object.values(r.h || {}).some(v => v !== '' && v != null && !(Number.isFinite(+v) && +v >= 0 && v !== true))) B.push({ k: 'hval', tareo: tr.id, dni, msg: `${nm} (tareo de ${cap}): hay horas no válidas.` });
        const c = tpCalcRow(r, cfg, hrs ? 'hrs' : '');
        if (!c.trab) B.push({ k: 'sinh', tareo: tr.id, dni, msg: `${nm} (tareo de ${cap}): vino pero no tiene horas.` });
        else if (c.trab > HMAX) B.push({ k: 'hmax', tareo: tr.id, dni, msg: `${nm} (tareo de ${cap}): ${String(c.trab).replace('.', ',')} h en el día (máximo ${HMAX}).` });
        for (const [pc, h] of Object.entries(c.h)) {
          R.porPc[pc] = r2((R.porPc[pc] || 0) + h);
          if (!PC.has(pc) && !pcMal.has(pc)) { pcMal.add(pc); B.push({ k: 'pc', tareo: tr.id, pc, msg: `La partida «${pc}» (con horas en el tareo de ${cap}) no existe en Partidas de control.` }); }
        }
        if (vig) { const x = t.cot[dni]; if (!(x && (x.fir === true || x.fir === false))) B.push({ k: 'firp', tareo: tr.id, dni, msg: `${nm} (tareo de ${cap}): falta cotejar su firma.` }); }
        tr.hh = r2(tr.hh + c.trab); tr.he = r2(tr.he + c.ext);
      }
      tr.bloq = B.length - nb;
      R.pres += tr.pres; R.aus += tr.aus; R.sm += tr.sm; R.hh = r2(R.hh + tr.hh); R.he = r2(R.he + tr.he);
      R.tareos.push(tr);
    }
    /* un DNI en un solo tareo del día (presente, con falta o sin marcar): cierra el hallazgo A6 */
    for (const [dni, L] of porDni) {
      if (L.length < 2) continue;
      const r = (L.find(t => t.rows[dni] && t.rows[dni].as === true) || L[0]).rows[dni];
      B.push({ k: 'dup', dni, tareo: L[0].id || '', tareos: L.map(t => t.id || ''), msg: `${nomDe(r, dni)} figura en ${L.length} tareos del día (${L.map(capDe).join(', ')}): debe quedar en uno solo.` });
    }
    R.obreros = porDni.size;
    /* cobertura: activos del máster en la fecha que no están en ningún tareo */
    const sinTareo = []; const exc = {};
    for (const p of per) {
      const dni = String(p.dni || p.id || ''); if (!dni || porDni.has(dni) || !tpActivo(p, fecha)) continue;
      const m = E[dni] || '';
      sinTareo.push({ dni, ape: p.ape || '', nom: p.nom || '', cua: p.cua || '', cat: p.cat || '', cap: p.cap || '', exc: m });
      if (m) exc[dni] = { motivo: m, ape: p.ape || '', nom: p.nom || '' };
      else B.push({ k: 'cob', dni, msg: `${nomDe(p, dni)} está activo en el máster y no figura en ningún tareo del día: agrégalo a un tareo o márcalo como excepción con motivo.` });
    }
    sinTareo.sort((a, b) => nomDe(a, a.dni).localeCompare(nomDe(b, b.dni)) || a.dni.localeCompare(b.dni));
    R.sinTareo = sinTareo.length; R.exc = Object.keys(exc).length;
    if (!T.length && !sinTareo.length) B.push({ k: 'nada', msg: 'No hay tareos con obreros en ese día: no hay nada que publicar.' });
    return { bloqueos: B, resumen: R, sinTareo, exc };
  }

  /* ---------- publicación ---------- */
  const pcFicha = p => ({ cod: String(p.cod || ''), nom: String(p.nom || ''), und: String(p.und || ''), grp: String(p.grp || ''), grpN: String(p.grpN || ''), ua: String(p.ua || '') });
  const cmpCod = (a, b) => { const A = String(a || '').split('.'), B = String(b || '').split('.'); for (let i = 0; i < Math.max(A.length, B.length); i++) { const x = parseInt(A[i], 10), y = parseInt(B[i], 10); if ((x || 0) !== (y || 0)) return (x || 0) - (y || 0); } return 0; };
  /** snapshot inmutable tpub/{fecha}_v{v} (forma en «Contrato de F3»). Solo se llama sin bloqueos.
      pcs = catálogo congelado: todas las partidas activas más las que tienen horas. anterior = snapshot vigente (para dif) o null. */
  function tpArmarPublicacion({ fecha, tareos, personal, partidas, excepciones, v, at, by, byN, motivo, anterior }) {
    const T = tareosDia(tareos, fecha); const E = excLimpias(excepciones);
    const F = new Map(vals(personal).filter(Boolean).map(p => [String(p.dni || p.id || ''), p]));
    const PC = vals(partidas).filter(Boolean);
    const rows = []; const usados = new Set(); const dentro = new Set();
    const tot = { obreros: 0, pres: 0, aus: 0, porMot: {}, hh: 0, he: 0, alt: 0, exc: 0, porPc: {} };
    for (const t of T) {
      for (const [dni, r] of Object.entries(t.rows)) {
        if (!r) continue; dentro.add(dni);
        const f = F.get(dni) || {}; const c = tpCalcRow(r, t.cfg, t.modo === 'hrs' ? 'hrs' : '');
        Object.keys(c.h).forEach(pc => { usados.add(pc); tot.porPc[pc] = r2((tot.porPc[pc] || 0) + c.h[pc]); });
        const as = r.as === true; const alt = as && r.alt === true;
        rows.push({ dni, ape: String(f.ape || r.ape || ''), nom: String(f.nom || r.nom || ''), cat: String(f.cat || r.cat || ''), cua: String(f.cua || r.cua || ''),
          cap: t.cap || '', capN: t.capN || '', as, mot: as ? '' : String(r.mot || ''), alt, h: c.h, trab: c.trab, ext: c.ext });
        if (as) { tot.pres++; if (alt) tot.alt++; } else { tot.aus++; const m = r.mot || '_'; tot.porMot[m] = (tot.porMot[m] || 0) + 1; }
        tot.hh = r2(tot.hh + c.trab); tot.he = r2(tot.he + c.ext);
      }
    }
    rows.sort((a, b) => (a.ape + ' ' + a.nom).localeCompare(b.ape + ' ' + b.nom) || a.dni.localeCompare(b.dni));
    tot.obreros = rows.length;
    const pcs = {};
    PC.filter(p => p.id && (usados.has(p.id) || (p.act !== false && !p.arch))).sort((a, b) => cmpCod(a.cod, b.cod)).forEach(p => { pcs[p.id] = pcFicha(p); });
    const exc = {};
    for (const [dni, m] of Object.entries(E)) { if (dentro.has(dni)) continue; const f = F.get(dni); if (!f || !tpActivo(f, fecha)) continue; exc[dni] = { motivo: m, ape: String(f.ape || ''), nom: String(f.nom || '') }; }
    tot.exc = Object.keys(exc).length;
    const fuentes = T.map(t => ({ id: t.id || '', cap: t.cap || '', capN: t.capN || '', envN: Number.isFinite(+t.envN) ? +t.envN : 0, revBy: t.revBy || '', revAt: Number.isFinite(+t.revAt) ? +t.revAt : 0 }));
    /* jornada del día congelada en la publicación (para el Excel: asistencia A/I y horas de descanso médico) */
    const cfgP = (T.find(x => cfgOk(x.cfg)) || {}).cfg || null; const dP = tpDia(cfgP);
    const snap = { fecha, v, at, by: by || '', byN: byN || '', motivo: motivo || '', ant: v > 1 ? v - 1 : null, fuentes, pcs, rows, exc, tot, dif: null, cfg: cfgP, jor: dP.jh, nl: dP.nl };
    snap.dif = anterior ? tpDif(anterior, snap) : null;
    return snap;
  }

  /** diferencias entre dos publicaciones del mismo día (para el historial y la rectificación):
      {agregados:[{dni,nom,capN}], quitados:[…], cambios:[{dni, nom, campo:'as'|'mot'|'alt'|'cap'|'h'|'ext', pc?, antes, despues}],
       excAgregadas:[dni], excQuitadas:[dni], tot:{obreros|pres|aus|hh|he|alt: {antes, despues}}, n, mas}
      n = n.º total de diferencias; las listas se cortan en 300 (mas = cuántas quedaron fuera). anterior null → null. */
  function tpDif(anterior, nueva) {
    if (!anterior) return null;
    const A = new Map((anterior.rows || []).map(r => [r.dni, r])), Bm = new Map(((nueva && nueva.rows) || []).map(r => [r.dni, r]));
    const nm = r => nomDe(r, r.dni);
    const ag = [], qu = [], ca = [];
    for (const [dni, b] of Bm) if (!A.has(dni)) ag.push({ dni, nom: nm(b), capN: b.capN || '' });
    for (const [dni, a] of A) if (!Bm.has(dni)) qu.push({ dni, nom: nm(a), capN: a.capN || '' });
    for (const [dni, b] of Bm) {
      const a = A.get(dni); if (!a) continue; const n = nm(b);
      if (!!a.as !== !!b.as) ca.push({ dni, nom: n, campo: 'as', antes: !!a.as, despues: !!b.as });
      if ((a.mot || '') !== (b.mot || '')) ca.push({ dni, nom: n, campo: 'mot', antes: a.mot || '', despues: b.mot || '' });
      if (!!a.alt !== !!b.alt) ca.push({ dni, nom: n, campo: 'alt', antes: !!a.alt, despues: !!b.alt });
      if ((a.cap || '') !== (b.cap || '')) ca.push({ dni, nom: n, campo: 'cap', antes: a.capN || a.cap || '', despues: b.capN || b.cap || '' });
      const pcs = [...new Set([...Object.keys(a.h || {}), ...Object.keys(b.h || {})])].sort();
      for (const pc of pcs) { const x = r2(+(a.h || {})[pc] || 0), y = r2(+(b.h || {})[pc] || 0); if (x !== y) ca.push({ dni, nom: n, campo: 'h', pc, antes: x, despues: y }); }
      if (r2(+a.ext || 0) !== r2(+b.ext || 0)) ca.push({ dni, nom: n, campo: 'ext', antes: r2(+a.ext || 0), despues: r2(+b.ext || 0) });
    }
    const ea = Object.keys((nueva && nueva.exc) || {}).filter(d => !has(anterior.exc, d)).sort();
    const eq = Object.keys(anterior.exc || {}).filter(d => !has(nueva && nueva.exc, d)).sort();
    const tot = {}; const ta = anterior.tot || {}, tb = (nueva && nueva.tot) || {};
    for (const k of ['obreros', 'pres', 'aus', 'hh', 'he', 'alt']) tot[k] = { antes: +ta[k] || 0, despues: +tb[k] || 0 };
    const n = ag.length + qu.length + ca.length + ea.length + eq.length; const C = 300;
    const mas = Math.max(0, ag.length - C) + Math.max(0, qu.length - C) + Math.max(0, ca.length - C) + Math.max(0, ea.length - C) + Math.max(0, eq.length - C);
    return { agregados: ag.slice(0, C), quitados: qu.slice(0, C), cambios: ca.slice(0, C), excAgregadas: ea.slice(0, C), excQuitadas: eq.slice(0, C), tot, n, mas };
  }

  /* ---------- pedido, permisos y firma ---------- */
  /** quién publica: el dueño; admin; editor con tpub. Con correo confirmado y sin `off`. */
  function tpPuede(email, verified, member) {
    if (!verified || !email) return false;
    if (String(email).toLowerCase() === OWNER) return true;
    return !!member && member.off !== true && (member.role === 'admin' || (member.role === 'editor' && member.tpub === true));
  }
  /** valida lo que manda la página → {accion, fecha, excepciones, motivo, firma} o {error} (mensaje en español). hoy = fecha de Lima. */
  function tpPedido(data, hoy) {
    const o = data || {};
    if (!['previa', 'publicar', 'rectificar'].includes(o.accion)) return { error: 'Acción no válida (previa, publicar o rectificar).' };
    if (!fechaOk(o.fecha)) return { error: 'La fecha no es válida (AAAA-MM-DD).' };
    if (hoy && o.fecha > hoy) return { error: 'No se puede publicar un día que todavía no llega.' };
    const P = { accion: o.accion, fecha: o.fecha, excepciones: {}, motivo: '', firma: '' };
    if (o.excepciones != null) {
      if (typeof o.excepciones !== 'object' || Array.isArray(o.excepciones)) return { error: 'Las excepciones deben ser {DNI: motivo}.' };
      const ks = Object.keys(o.excepciones); if (ks.length > 3000) return { error: 'Demasiadas excepciones.' };
      for (const k of ks) { const v = o.excepciones[k]; if (v != null && typeof v !== 'string') return { error: `El motivo de la excepción de ${k} debe ser un texto.` }; }
      P.excepciones = excLimpias(o.excepciones);
    }
    if (o.motivo != null && typeof o.motivo !== 'string') return { error: 'El motivo debe ser un texto.' };
    P.motivo = String(o.motivo || '').trim().slice(0, 500);
    if (o.firma != null && typeof o.firma !== 'string') return { error: 'Firma de la previa no válida.' };
    P.firma = String(o.firma || '').slice(0, 64);
    if (P.accion === 'rectificar' && !P.motivo) return { error: 'Escribe el motivo de la rectificación.' };
    return P;
  }
  /* JSON con claves ordenadas y hash (cyrb53) */
  const stable = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, k2) => (o[k2] = x[k2], o), {}) : x));
  function hash(s) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'); }
  /** firma de los tareos del día (todos, también vacíos): cambia si cualquiera cambió, apareció o se archivó. La previa la devuelve y
      publicar la compara dentro de la transacción. */
  const tpFirma = tareos => hash(stable(vals(tareos).filter(Boolean).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))));
  /* Firestore no acepta undefined */
  const limpio = v => (Array.isArray(v) ? v.map(limpio) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, limpio(x)])) : v);

  /** la función entera, sin Firebase: recibe lo leído (dentro de la transacción) y devuelve la respuesta y las escrituras.
      ctx: {P (de tpPedido), tareos (los del día, con id), personal, partidas, tcfg, idx (tpubidx/{fecha} o null),
            vigente (tpub de la versión vigente o null), by (correo), byN (nombre), now (ms)}
      → {err:{code, msg}} | {res, escr:[{col, id, tipo:'crear'|'poner'|'cambiar', datos, hist?}]}
      'cambiar' con hist = update de datos + hist: arrayUnion(hist). */
  function tpEjecutar(ctx) {
    const { P, tareos, personal, partidas, tcfg, idx, vigente, by, byN, now } = ctx;
    const { accion, fecha } = P;
    const err = (code, msg) => ({ err: { code, msg } });
    const hayV = !!(idx && +idx.v > 0);
    const T = vals(tareos).filter(Boolean);
    if (accion === 'rectificar') {
      if (!hayV) return err('failed-precondition', 'Ese día no está publicado: no hay nada que rectificar.');
      if (idx.abierto) return err('failed-precondition', `El día ya está abierto para rectificar (motivo: ${idx.abierto.motivo || '—'}). Corrige los tareos y publica la nueva versión.`);
      const abierto = { t: now, by, motivo: P.motivo };
      const pubs = T.filter(t => !t.arch && t.st === 'pub');
      const escr = pubs.map(t => ({ col: 'tareo', id: t.id, tipo: 'cambiar', datos: { st: 'rev', by, ts: now }, hist: { t: now, by, a: 'rect', mot: P.motivo, v: +idx.v } }));
      escr.push({ col: 'tpubidx', id: fecha, tipo: 'poner', datos: limpio({ ...idx, fecha, abierto }) });
      return { res: { ok: true, fecha, v: +idx.v, abierto, n: pubs.length }, escr };
    }
    const cfgAct = tpCfgDia(tcfg, fecha);
    const V = tpValidarDia({ fecha, tareos: T, personal, partidas, excepciones: P.excepciones, cfgAct, rect: hayV });
    const firma = tpFirma(T);
    const vN = hayV ? Math.max(+idx.v || 0, ...((idx.vers || []).map(x => +x.v || 0))) + 1 : 1;
    const base = { fecha, bloqueos: V.bloqueos, resumen: V.resumen, sinTareo: V.sinTareo, firma, rect: hayV, v: vN, motivoReq: hayV,
      vigente: hayV ? { v: +idx.v, at: (vigente && vigente.at) || 0, by: (vigente && vigente.by) || '', byN: (vigente && vigente.byN) || '', motivo: (vigente && vigente.motivo) || '' } : null,
      abierto: (idx && idx.abierto) || null };
    const armar = () => tpArmarPublicacion({ fecha, tareos: T, personal, partidas, excepciones: P.excepciones, v: vN, at: now, by, byN, motivo: P.motivo, anterior: hayV ? vigente : null });
    if (accion === 'previa') return { res: limpio({ ...base, ok: !V.bloqueos.length, dif: hayV && vigente && !V.bloqueos.length ? armar().dif : null }), escr: [] };
    /* publicar */
    if (P.firma && P.firma !== firma) return err('aborted', 'Un tareo del día cambió desde que abriste la previa: vuelve a revisar.');
    if (hayV && !P.motivo) return err('invalid-argument', `Ya hay una versión publicada de ese día (v${idx.v}): escribe el motivo de la rectificación.`);
    if (V.bloqueos.length) return { res: limpio({ ...base, ok: false, dif: null }), escr: [] };
    const snap = limpio(armar()); const id = fecha + '_v' + vN;
    const escr = [{ col: 'tpub', id, tipo: 'crear', datos: snap }];
    escr.push({ col: 'tpubidx', id: fecha, tipo: 'poner', datos: limpio({ fecha, v: vN, vers: [...((idx && idx.vers) || []), { v: vN, at: now, by, byN: byN || '', motivo: P.motivo || '' }], abierto: null }) });
    for (const t of tareosDia(T, fecha)) {
      const h = { t: now, by, a: 'pub', v: vN }; if (P.motivo) h.mot = P.motivo;
      escr.push({ col: 'tareo', id: t.id, tipo: 'cambiar', datos: { st: 'pub', pubV: vN, by, ts: now }, hist: h });
    }
    return { res: limpio({ ...base, ok: true, id, tot: snap.tot, dif: snap.dif, n: snap.fuentes.length }), escr };
  }

  return { TP_HMAX: HMAX, tpCfgDia, tpDia, tpCalcRow, tpActivo, tpCotVig, tpValidarDia, tpArmarPublicacion, tpDif, tpPuede, tpPedido, tpFirma, tpEjecutar };
});
