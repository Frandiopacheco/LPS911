"use strict";
/* LPS 911 · La semana vista desde el Plan diario (P23, oct 2026, decidido con el dueño en la revisión de conformidad con el Last Planner).
   Para decidir «Va / No va» sin cambiar de pestaña: cómo va cada compromiso de la semana CONGELADA (Plan semanal) del piso.
   Tres salidas: una línea en la ficha de la actividad (plano.js › zcPlanHtml), la pestaña «Semana» del panel derecho (plano.js › dockRender)
   y su propio modo presentación (#smp, con las clases .ipr* de la presentación de Indicadores).
   Solo lectura: no escribe nada. Se calcula al abrir la ficha, la pestaña o la presentación (el dibujo normal del plano no cambia).
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
/* ---------- 1. línea en la ficha de la actividad (al decidir Va / No va) ---------- */
function semActLine(aid,pid,d){try{const R=semData(pid,d);if(!R.frozen)return'';const r=R.rows.find(o=>o.id===aid);
    if(!r)return`<p class="zcm smline">Plan semanal ${R.n}: <b>no está entre los compromisos congelados</b> (se programó después).</p>`;
    const s=SEM_ST[r.st];const ini=r.days[0].d,fin=r.days[r.days.length-1].d;
    const rng=ini===fin?DOWN[(pd(ini).getUTCDay()+6)%7].toLowerCase():`${DL[(pd(ini).getUTCDay()+6)%7]}–${DL[(pd(fin).getUTCDay()+6)%7]}`;
    const fal=r.q?`saldo ${fq(r.q.saldo)} ≈ ${r.falta} día${r.falta===1?'':'s'}`:`faltan ${r.falta} día${r.falta===1?'':'s'} de trabajo`;
    let warn='';if(r.falta>0&&d>R.today&&semWorkDays(R.n).includes(d)&&r.falta>r.rem-1)warn=`<span class="smwarn">⚠ Si no va el ${fmtD(d)}, no llega en la semana</span>`;
    return`<div class="smline ${s.c}"><b>${s.i} Plan semanal ${R.n}: ${s.t}</b><span>Comprometida ${esc(rng)} (${r.need} día${r.need===1?'':'s'}) · ${r.falta?`${fal} · quedan ${r.rem} hábil${r.rem===1?'':'es'}`:'cumplida'}</span>${warn}</div>`}catch(e){return''}}
/* ---------- 2. pestaña «Semana» del panel derecho ---------- */
function semStrip(r){return`<span class="smstrip">${r.days.map(o=>`<i class="k-${o.k}" title="${fmtD(o.d)}: ${o.k==='fut'?'por venir':o.k==='none'?'sin registro':o.k==='ok'?'cumplido':o.k==='partial'?'parcial':'no cumplido'}">${DL[(pd(o.d).getUTCDay()+6)%7]||'D'}</i>`).join('')}</span>`}
function semCnt(rows){const c={no:0,risk:0,good:0,ok:0};rows.forEach(r=>c[r.st]++);return c}
function semDockHtml(pid,d,scf,zoneOf){try{const R=semData(pid,d);
    if(!R.frozen)return`<div class="smd"><p class="mu">La semana ${R.n} de este piso aún no está congelada: no hay compromisos que seguir.</p></div>`;
    const rows=semFilter(R.rows,scf);const L=scf?String(scf).split(',').filter(Boolean):[];
    const head=`<div class="smh"><b>Semana ${R.n}</b><span class="mu">${R.rem} día${R.rem===1?'':'s'} hábil${R.rem===1?'':'es'} por delante</span><button class="ib" data-semp="1" title="Ver a pantalla completa para la reunión">▶ Presentar</button></div>`;
    if(!rows.length)return`<div class="smd">${head}<p class="mu">${L.length?'Este subcontratista no tiene compromisos esta semana en el piso.':'No hay compromisos esta semana en el piso.'}</p></div>`;
    /* sin SC elegido: resumen por SC (tocar elige al SC en la fila de arriba) */
    if(!L.length){const by=new Map();rows.forEach(r=>{const o=by.get(r.sc)||{sc:r.sc,nm:semScN(r),rows:[]};o.rows.push(r);by.set(r.sc,o)});
      const G=[...by.values()].map(o=>({...o,c:semCnt(o.rows)})).sort((a,b)=>(b.c.no-a.c.no)||(b.c.risk-a.c.risk)||a.nm.localeCompare(b.nm));
      return`<div class="smd">${head}<p class="mu smtip">Elige un subcontratista para ver sus compromisos.</p><div class="sml">${G.map(o=>`<button class="smsc" data-dzsc="${esc(o.sc)}" style="--c:${conOf(o.sc).color}"><i></i><b>${esc(o.nm)}</b><span>${o.c.no?`<em class="bad">✗ ${o.c.no}</em>`:''}${o.c.risk?`<em class="warn">⚠ ${o.c.risk}</em>`:''}${o.c.good?`<em class="good">● ${o.c.good}</em>`:''}${o.c.ok?`<em class="ok">✓ ${o.c.ok}</em>`:''}</span></button>`).join('')}</div></div>`}
    const c=semCnt(rows);
    return`<div class="smd">${head}<div class="smk">${['no','risk','good','ok'].map(k=>`<span class="${SEM_ST[k].c}">${SEM_ST[k].i} ${c[k]} ${SEM_ST[k].t.toLowerCase()}</span>`).join('')}</div><div class="sml">${rows.map(r=>{const s=SEM_ST[r.st];const z=zoneOf?zoneOf(r.id):'';
      return`<button class="smr ${s.c}"${z?` data-see="${esc(z)}"`:' disabled'} title="${z?'Ver en el plano':'No tiene zona dibujada este día'}"><span class="smi">${s.i}</span><span class="smt"><b>${esc(r.it.act||'')}</b><small><span class="mono">${esc(r.it.code||'')}</span> ${esc(r.it.amb||'')}${L.length>1?' · '+esc(semScN(r)):''}</small></span>${semStrip(r)}<span class="smf">${r.falta?`falta ${r.falta}`:'✓'}</span></button>`}).join('')}</div></div>`}catch(e){console.warn('semana',e);return''}}
/* ---------- 3. modo presentación propio de «Semana» ---------- */
let SMP=null; /* {pid, d, i: -1 = resumen, 0.. = SC} */
function semPresOpen(pid,d,scf){const R=semData(pid,d);if(!R.frozen){toast(`La semana ${R.n} de este piso aún no está congelada.`);return}
  const scs=semPresScs(R);const L=scf?String(scf).split(','):[];const i=L.length===1?scs.indexOf(L[0]):-1;
  SMP={pid,d,i:Math.max(-1,i),z:1};semPresDraw()}
function semPresScs(R){const by=new Map();semFilter(R.rows,'').forEach(r=>{if(!by.has(r.sc))by.set(r.sc,semScN(r))});return[...by.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(e=>e[0])}
function semPresClose(){SMP=null;const el=document.getElementById('smp');if(el)el.remove();document.removeEventListener('keydown',semPresKey,true)}
function semPresKey(e){if(!SMP)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();semPresClose();return}
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();semPresStep(e.key==='ArrowRight'?1:-1)}}
function semPresStep(k){if(!SMP)return;const R=semData(SMP.pid,SMP.d);const n=semPresScs(R).length;SMP.i=Math.max(-1,Math.min(n-1,SMP.i+k));semPresDraw()}
function semPresDraw(){if(!SMP)return;const R=semData(SMP.pid,SMP.d);const scs=semPresScs(R);if(SMP.i>=scs.length)SMP.i=scs.length-1;
  let el=document.getElementById('smp');if(!el){el=document.createElement('div');el.id='smp';el.className='ipr smp';el.setAttribute('role','dialog');el.setAttribute('aria-label','Presentación de la semana');document.body.appendChild(el);
    el.addEventListener('click',semPresClick);document.addEventListener('keydown',semPresKey,true)}
  const p=S.pis.get(SMP.pid);const sc=SMP.i>=0?scs[SMP.i]:'';const rows=semFilter(R.rows,sc);
  const bar=`<div class="iprbar"><div class="iprt"><b>Semana ${R.n}${sc?' · '+esc(conOf(sc).name):''}</b><small>${esc(p?p.code+' · '+p.name:'')} · plan semanal congelado · ${R.rem} día${R.rem===1?'':'s'} hábil${R.rem===1?'':'es'} por delante</small></div>
    <span class="iprg"><button class="ib" data-smp="prev" aria-label="Anterior"${SMP.i<0?' disabled':''}>‹</button><select class="tin" data-smp="sel" aria-label="Subcontratista"><option value="-1">Todos (resumen)</option>${scs.map((s,i)=>`<option value="${i}"${i===SMP.i?' selected':''}>${esc(conOf(s).name)}</option>`).join('')}</select><button class="ib" data-smp="next" aria-label="Siguiente"${SMP.i>=scs.length-1?' disabled':''}>›</button></span>
    <span class="fsp"></span><span class="iprg"><button class="ib" data-smp="zm" aria-label="Letra más pequeña">A−</button><button class="ib" data-smp="zp" aria-label="Letra más grande">A+</button></span><button class="ib" data-smp="x">Salir<kbd>Esc</kbd></button></div>`;
  let body;
  if(!rows.length)body='<div class="empty">No hay compromisos.</div>';
  else if(!sc){const G=scs.map((s,i)=>{const rs=rows.filter(r=>r.sc===s);const c=semCnt(rs);const need=rs.reduce((t,r)=>t+r.need,0),done=rs.reduce((t,r)=>t+r.done,0);return{s,i,c,n:rs.length,av:need?done/need:0}}).sort((a,b)=>(b.c.no-a.c.no)||(b.c.risk-a.c.risk)||a.av-b.av);
    const c=semCnt(rows);
    body=`<div class="iprks">${[['Compromisos',rows.length,''],['Cumplidas',c.ok,'ok'],['Van bien',c.good,''],['En riesgo',c.risk,'warn'],['Ya no llegan',c.no,'bad']].map(([t,v,k])=>`<div class="iprk ${k}"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
      <div class="iprcard smpc"><h3>Por subcontratista <small>primero los que no llegan o están en riesgo · toca uno para verlo</small></h3><table class="smpt"><thead><tr><th>Subcontratista</th><th>Compromisos</th><th class="bad">✗</th><th class="warn">⚠</th><th>●</th><th class="ok">✓</th><th>Avance</th></tr></thead><tbody>${G.map(o=>`<tr data-smp="go" data-i="${o.i}" tabindex="0"><td><i class="smdot" style="--c:${conOf(o.s).color}"></i>${esc(conOf(o.s).name)}</td><td>${o.n}</td><td class="bad">${o.c.no||''}</td><td class="warn">${o.c.risk||''}</td><td>${o.c.good||''}</td><td class="ok">${o.c.ok||''}</td><td><span class="smbar"><i style="width:${Math.round(o.av*100)}%"></i></span>${Math.round(o.av*100)} %</td></tr>`).join('')}</tbody></table></div>`}
  else{const c=semCnt(rows);const need=rows.reduce((t,r)=>t+r.need,0),done=rows.reduce((t,r)=>t+r.done,0);
    body=`<div class="iprks">${[['Compromisos',rows.length,''],['Cumplidas',c.ok,'ok'],['Van bien',c.good,''],['En riesgo',c.risk,'warn'],['Ya no llegan',c.no,'bad'],['Avance',(need?Math.round(done/need*100):0)+' %','']].map(([t,v,k])=>`<div class="iprk ${k}"><span>${t}</span><b>${v}</b></div>`).join('')}</div>
      <div class="iprcard smpc"><table class="smpt"><thead><tr><th>Estado</th><th>Ambiente</th><th>Actividad</th><th>Días comprometidos</th><th>Falta</th></tr></thead><tbody>${rows.map(r=>{const s=SEM_ST[r.st];return`<tr class="${s.c}"><td><b>${s.i} ${s.t}</b></td><td><span class="mono">${esc(r.it.code||'')}</span> ${esc(r.it.amb||'')}</td><td>${esc(r.it.act||'')}</td><td>${semStrip(r)}</td><td>${r.falta?(r.q?`${fq(r.q.saldo)} (≈ ${r.falta} d)`:`${r.falta} d`):'—'}</td></tr>`}).join('')}</tbody></table></div>`}
  el.style.setProperty('--ipz',SMP.z);el.innerHTML=bar+`<div class="iprc">${body}</div><div class="iprft"><span>✓ cumplida · ● va bien · ⚠ en riesgo (le quedan tantos días de trabajo como días hábiles) · ✗ ya no llega · ← → cambian de subcontratista</span></div>`;
  const sel=el.querySelector('select[data-smp="sel"]');if(sel)sel.onchange=()=>{SMP.i=+sel.value;semPresDraw()}}
function semPresClick(e){const b=e.target.closest('[data-smp]');if(!b||!SMP)return;const k=b.dataset.smp;
  if(k==='x')semPresClose();else if(k==='prev')semPresStep(-1);else if(k==='next')semPresStep(1);
  else if(k==='go'){SMP.i=+b.dataset.i;semPresDraw()}
  else if(k==='zm'||k==='zp'){SMP.z=Math.max(.7,Math.min(1.8,r2(SMP.z+(k==='zp'?.1:-.1))));semPresDraw()}}
/** lo llama el plano en cada dibujo: si la presentación está abierta, se actualiza con lo último registrado */
function semPresRefresh(){if(SMP&&document.getElementById('smp'))semPresDraw()}
