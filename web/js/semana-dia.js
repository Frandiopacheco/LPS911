"use strict";
/* LPS 911 · La semana vista desde el Plan diario (P23, oct 2026; rediseño 25 oct 2026 decidido con el dueño).
   Recordatorio rápido del compromiso CONGELADO (Plan semanal) del piso, para no ir a la pestaña Plan semanal al programar.
   Solo lectura: sin estados ni cumplimiento (eso se mide en Plan semanal e Indicadores; el «Sin cierre» automático no debe
   leerse aquí como atraso). Pestaña «Semana» del panel derecho (plano.js › dockRender):
   - Día / Semana (SEMV.mode): por defecto solo lo comprometido para el día que se programa (M.date).
   - Agrupado por SC y plegado (SEMV.open); con un SC elegido en la fila de arriba, solo el suyo y abierto.
   - Cada compromiso en una línea: ambiente, actividad y la regla de días hábiles con los comprometidos y el día elegido resaltado.
   Antes (retirado oct 2026): estados «va bien / en riesgo», línea en la ficha y «▶ Presentar». */
const SEMV={mode:'dia',open:new Set()};
/** días de la semana n en que se puede trabajar (lunes a sábado según el calendario, más el domingo si se marcó «se trabaja») */
function semWorkDays(n){const wd=weekDays(n);const sun=addD(wd[0],6);return[...wd,sun].filter(z=>isWork(z))}
/** compromisos de la semana congelada del día d en el piso pid → {n, frozen, wd, rows:[{id,it,sc,days}]} */
function semData(pid,d){const n=weekOf(d);const w=pid&&S.wk.get(wkId(n,pid));if(!w||!w.frozenAt)return{n,frozen:false,rows:[]};
  const rows=[];
  for(const[id,it]of Object.entries(w.items||{})){const days=(it.days||[]).slice().sort();if(!days.length)continue;rows.push({id,it,sc:it.sc,days})}
  rows.sort((a,b)=>String(a.it.code||'').localeCompare(String(b.it.code||''),'es',{numeric:true})||(a.it.ord||0)-(b.it.ord||0));
  return{n,frozen:true,rows,wd:semWorkDays(n)}}
/** el SC de un compromiso, con el nombre de cuando se congeló */
const semScN=r=>scnOf(r.it);
/** solo lo que la persona puede ver: el SC, lo suyo; los demás, todo (o los SC elegidos en la fila de arriba del plano) */
function semFilter(rows,scf){const mine=typeof SCK==='function'&&SCK()?new Set(myScsI()):null;const L=scf?String(scf).split(',').filter(Boolean):[];
  return rows.filter(r=>(!mine||mine.has(r.sc))&&(!L.length||L.includes(r.sc)))}
const semDL=z=>DL[(pd(z).getUTCDay()+6)%7]||'D';
/** regla de días hábiles: comprometidos rellenos, el día elegido con borde */
function semStrip(r,wd,d){const on=new Set(r.days);return`<span class="smstrip">${wd.map(z=>`<i class="${on.has(z)?'on':''}${z===d?' cur':''}" title="${fmtD(z)}${on.has(z)?': comprometido':''}">${semDL(z)}</i>`).join('')}</span>`}
function semDockHtml(pid,d,scf,zoneOf){try{const R=semData(pid,d);
    if(!R.frozen)return`<div class="smd"><p class="mu">La semana ${R.n} de este piso aún no está congelada: no hay compromisos que mostrar.</p></div>`;
    const dia=SEMV.mode==='dia';const L=scf?String(scf).split(',').filter(Boolean):[];
    let rows=semFilter(R.rows,scf);if(dia)rows=rows.filter(r=>r.days.includes(d));
    const sw=`<span class="seg smsw" role="group" aria-label="Ver"><button class="${dia?'on':''}" data-semv="dia" aria-pressed="${dia}">Día</button><button class="${dia?'':'on'}" data-semv="sem" aria-pressed="${!dia}">Semana</button></span>`;
    const head=`<div class="smh"><b>${dia?`Compromisos del ${esc(fmtD(d))}`:`Semana ${R.n}`}</b>${sw}</div><p class="mu smtip">Plan semanal ${R.n} congelado · solo consulta</p>`;
    if(!rows.length)return`<div class="smd">${head}<p class="mu">${dia?(L.length?'Sin compromisos de este subcontratista para este día.':'No hay compromisos congelados para este día en el piso.'):(L.length?'Este subcontratista no tiene compromisos esta semana en el piso.':'No hay compromisos esta semana en el piso.')}</p></div>`;
    const by=new Map();rows.forEach(r=>{const o=by.get(r.sc)||{sc:r.sc,nm:semScN(r),rows:[]};o.rows.push(r);by.set(r.sc,o)});
    const G=[...by.values()].sort((a,b)=>a.nm.localeCompare(b.nm,'es'));const one=G.length===1;
    return`<div class="smd">${head}<div class="sml">${G.map(o=>{const op=one||SEMV.open.has(o.sc);
      return`<div class="smg${op?' op':''}"><button class="smsc" data-semo="${esc(o.sc)}" aria-expanded="${op}" style="--c:${conOf(o.sc).color}"><i></i><b>${esc(o.nm)}</b><span class="smn">${o.rows.length}</span><span class="smchev" aria-hidden="true">${op?'▾':'▸'}</span></button>${op?`<div class="smrs">${o.rows.map(r=>{const z=zoneOf?zoneOf(r.id):'';
        return`<button class="smr"${z?` data-see="${esc(z)}"`:''} title="${z?'Ver en el plano':'No tiene zona dibujada este día'}"><span class="smt"><b>${esc(r.it.act||'')}</b><small><span class="mono">${esc(r.it.code||'')}</span> ${esc(r.it.amb||'')}</small></span>${semStrip(r,R.wd,d)}</button>`}).join('')}</div>`:''}</div>`}).join('')}</div></div>`}catch(e){console.warn('semana',e);return''}}
/** clics del panel (los llama planClick de plano.js); true si lo atendió */
function semClick(t){const v=t.closest('[data-semv]');if(v){SEMV.mode=v.dataset.semv==='sem'?'sem':'dia';requestRender();return true}
  const o=t.closest('[data-semo]');if(o){const k=o.dataset.semo;SEMV.open.has(k)?SEMV.open.delete(k):SEMV.open.add(k);requestRender();return true}
  return false}
