"use strict";
/* LPS 911 · La semana vista desde el Plan diario (P23, oct 2026, decidido con el dueño en la revisión de conformidad con el Last Planner).
   Para decidir «Va / No va» sin cambiar de pestaña: cómo va cada compromiso de la semana CONGELADA (Plan semanal) del piso.
   Se ve en la pestaña «Semana» del panel derecho (plano.js › dockRender). Oct 2026 (dueño): se retiraron la línea de la ficha
   («va bien, quedan días») porque los SC trabajan en tren y no cumplir el día programado afecta a las demás partidas, y el «▶ Presentar» propio.
   Solo lectura: no escribe nada. Se calcula al abrir la pestaña (el dibujo normal del plano no cambia).
   Misma regla de avance que el Tablero (dashAvance): un «Cumplido» en cualquier día de la semana cuenta (tope = días comprometidos);
   Parcial y No = 0. Con metrado en lo congelado (it.q) se usa el saldo: lo que falta / lo programado por día. La evaluación del
   Plan semanal (res.ok) manda cuando existe. */
const SEM_ST={ok:{i:'✓',t:'Cumplida',c:'ok'},good:{i:'●',t:'Va bien',c:'good'},risk:{i:'⚠',t:'En riesgo',c:'warn'},no:{i:'✗',t:'Ya no llega',c:'bad'}};
const SEM_ORD={no:0,risk:1,good:2,ok:3};
/** días de la semana n en que se puede trabajar (lunes a sábado según el calendario, más el domingo si se marcó «se trabaja») */
function semWorkDays(n){const wd=weekDays(n);const sun=addD(wd[0],6);return[...wd,sun].filter(z=>isWork(z))}
/** compromisos de la semana congelada del día d en el piso pid → {n, frozen, rows:[{id,it,sc,st,falta,rem,done,need,days:[{d,k}],q}]} */
function semData(pid,d){const n=weekOf(d);const w=pid&&S.wk.get(wkId(n,pid));if(!w||!w.frozenAt)return{n,frozen:false,rows:[]};
  const today=todayIso();const all=semWorkDays(n);const past=all.filter(z=>z<=today);const rem=all.filter(z=>z>today).length;const end=all[all.length-1]||weekDays(n)[5];
  const rows=[];
  for(const[id,it]of Object.entries(w.items||{})){const ds=(it.days||[]).slice().sort();if(!ds.length)continue;const res=(w.res||{})[id]||{};
    let ok=0,ex=0;const byD={};for(const z of past){const rc=recOf(z,id);if(!rc)continue;byD[z]=rc.status;if(rc.status==='ok')ok++;if((rc.status==='ok'||rc.status==='partial')&&Number.isFinite(+rc.exec))ex+=+rc.exec}
    let falta,q=null;
    if(it.q>0){const per=it.q/ds.length;const saldo=r2(Math.max(0,it.q-ex));falta=saldo<=1e-9?0:Math.ceil(saldo/per-1e-9);q={tot:it.q,saldo,und:''}}
    else falta=ds.length-Math.min(ok,ds.length);
    if(res.ok===true)falta=0;
    const st=falta===0?'ok':(res.ok===false&&today>=end)||falta>rem?'no':falta===rem?'risk':'good';
    const days=ds.map(z=>({d:z,k:byD[z]||(z>today?'fut':'none')}));
    rows.push({id,it,sc:it.sc,st,falta,rem,need:ds.length,done:ds.length-Math.min(falta,ds.length),days,q})}
  rows.sort((a,b)=>SEM_ORD[a.st]-SEM_ORD[b.st]||(a.it.ord||0)-(b.it.ord||0));
  return{n,frozen:true,rows,rem,today}}
/** el SC de un compromiso, con el nombre de cuando se congeló */
const semScN=r=>scnOf(r.it);
/** solo lo que la persona puede ver: el SC, lo suyo; los demás, todo (o los SC elegidos en la fila de arriba del plano) */
function semFilter(rows,scf){const mine=typeof SCK==='function'&&SCK()?new Set(myScsI()):null;const L=scf?String(scf).split(',').filter(Boolean):[];
  return rows.filter(r=>(!mine||mine.has(r.sc))&&(!L.length||L.includes(r.sc)))}
/* ---------- 2. pestaña «Semana» del panel derecho ---------- */
function semStrip(r){return`<span class="smstrip">${r.days.map(o=>`<i class="k-${o.k}" title="${fmtD(o.d)}: ${o.k==='fut'?'por venir':o.k==='none'?'sin registro':o.k==='ok'?'cumplido':o.k==='partial'?'parcial':'no cumplido'}">${DL[(pd(o.d).getUTCDay()+6)%7]||'D'}</i>`).join('')}</span>`}
function semCnt(rows){const c={no:0,risk:0,good:0,ok:0};rows.forEach(r=>c[r.st]++);return c}
function semDockHtml(pid,d,scf,zoneOf){try{const R=semData(pid,d);
    if(!R.frozen)return`<div class="smd"><p class="mu">La semana ${R.n} de este piso aún no está congelada: no hay compromisos que seguir.</p></div>`;
    const rows=semFilter(R.rows,scf);const L=scf?String(scf).split(',').filter(Boolean):[];
    const head=`<div class="smh"><b>Semana ${R.n}</b><span class="mu">${R.rem} día${R.rem===1?'':'s'} hábil${R.rem===1?'':'es'} por delante</span></div>`;
    if(!rows.length)return`<div class="smd">${head}<p class="mu">${L.length?'Este subcontratista no tiene compromisos esta semana en el piso.':'No hay compromisos esta semana en el piso.'}</p></div>`;
    /* sin SC elegido: resumen por SC (tocar elige al SC en la fila de arriba) */
    if(!L.length){const by=new Map();rows.forEach(r=>{const o=by.get(r.sc)||{sc:r.sc,nm:semScN(r),rows:[]};o.rows.push(r);by.set(r.sc,o)});
      const G=[...by.values()].map(o=>({...o,c:semCnt(o.rows)})).sort((a,b)=>(b.c.no-a.c.no)||(b.c.risk-a.c.risk)||a.nm.localeCompare(b.nm));
      return`<div class="smd">${head}<p class="mu smtip">Elige un subcontratista para ver sus compromisos.</p><div class="sml">${G.map(o=>`<button class="smsc" data-dzsc="${esc(o.sc)}" style="--c:${conOf(o.sc).color}"><i></i><b>${esc(o.nm)}</b><span>${o.c.no?`<em class="bad">✗ ${o.c.no}</em>`:''}${o.c.risk?`<em class="warn">⚠ ${o.c.risk}</em>`:''}${o.c.good?`<em class="good">● ${o.c.good}</em>`:''}${o.c.ok?`<em class="ok">✓ ${o.c.ok}</em>`:''}</span></button>`).join('')}</div></div>`}
    const c=semCnt(rows);
    return`<div class="smd">${head}<div class="smk">${['no','risk','good','ok'].map(k=>`<span class="${SEM_ST[k].c}">${SEM_ST[k].i} ${c[k]} ${SEM_ST[k].t.toLowerCase()}</span>`).join('')}</div><div class="sml">${rows.map(r=>{const s=SEM_ST[r.st];const z=zoneOf?zoneOf(r.id):'';
      return`<button class="smr ${s.c}"${z?` data-see="${esc(z)}"`:' disabled'} title="${z?'Ver en el plano':'No tiene zona dibujada este día'}"><span class="smi">${s.i}</span><span class="smt"><b>${esc(r.it.act||'')}</b><small><span class="mono">${esc(r.it.code||'')}</span> ${esc(r.it.amb||'')}${L.length>1?' · '+esc(semScN(r)):''}</small></span>${semStrip(r)}<span class="smf">${r.falta?`falta ${r.falta}`:'✓'}</span></button>`}).join('')}</div></div>`}catch(e){console.warn('semana',e);return''}}
