"use strict";
/* LPS 911 · Pantalla «Hoy»: lo que le toca a cada rol hoy, con acceso directo a cada cosa.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/** Actividades del lookahead programadas un día, en los pisos visibles (y de las partidas del SC si es subcontratista). */
function hoyActs(d){const vs=new Set(visPisos().map(p=>p.id));const mine=SCK()?new Set(myScsI()):null;
  /* igual que Campo y En obra: sin lo ya terminado ni lo que el plan diario dice que no va */
  const nv=window.__plano&&window.__plano.novaSet?window.__plano.novaSet(d):null;
  return[...S.act.values()].filter(x=>schedOn(x,d)&&!(nv&&nv.has(x.id))&&vs.has(pisoOfAct(x.id))&&(!mine||mine.has(x.sc)))}
const hoyLoc=x=>{const a=S.amb.get(x.ambId);const p=S.pis.get(pisoOfAct(x.id));return[(p&&p.code)||'',a?a.code+' · '+a.name:''].filter(Boolean).join(' · ')};

/* cada tarjeta: {k, title, n, sub, tone, items:[{t, s}], go, goLabel, empty} */
function hoyCard(c){const ok=!c.n;
  return`<section class="hoyc${ok?' ok':''}${c.tone&&!ok?' '+c.tone:''}" data-hoy="${c.k}">
    <header><h3>${esc(c.title)}</h3><b class="hoyn">${ok?'✓':c.n}</b></header>
    <p class="hoys">${ok?esc(c.empty||'Al día'):c.sub}</p>
    ${!ok&&c.items.length?`<ul>${c.items.slice(0,5).map(i=>`<li><span>${esc(i.t)}</span>${i.s?`<small>${esc(i.s)}</small>`:''}</li>`).join('')}${c.items.length>5?`<li class="mu">y ${c.items.length-5} más…</li>`:''}</ul>`:''}
    <button class="ib${ok?'':' pri'}" data-hgo="${c.go}">${esc(c.goLabel)}</button></section>`}

function hoyCards(){const d=todayIso(),tm=wshift(d,1),r=me.role,cal=isCal(),out={};
  /* propuestas de los subcontratistas que este usuario puede resolver */
  if(canWrite&&r!=='sc'){const by=revCounts();const n=[...by.values()].reduce((a,b)=>a+b,0);
    out.prop={k:'prop',title:'Propuestas por revisar',n,tone:'warn',sub:'Cambios que enviaron los subcontratistas en tus pisos',items:[...by.entries()].map(([sc,k])=>({t:conOf(sc).name,s:`${k} cambio${k>1?'s':''}`})),go:'look',goLabel:'Revisar en el Lookahead',empty:'No hay propuestas esperando tu respuesta'}}
  /* registro de campo de hoy */
  if(canDaily){const A=hoyActs(d);const pend=A.filter(x=>!recReal(d,x.id));const prop=pend.filter(x=>recOf(d,x.id));const sin=pend.filter(x=>!recOf(d,x.id));
    out.campo={k:'campo',title:'Campo de hoy',n:pend.length,tone:'',sub:`${A.length} programada${A.length===1?'':'s'} · ${sin.length} sin registrar${prop.length?` · ${prop.length} por confirmar (las cerró el capataz)`:''}`,
      items:[...prop,...sin].map(x=>({t:x.name,s:`${conOf(x.sc).name} · ${hoyLoc(x)}`})),go:'campo',goLabel:'Registrar en Campo',empty:A.length?'Todo lo de hoy ya está registrado':'No hay actividades programadas hoy'}}
  /* subcontratista: su avance en obra */
  if(SCK()){const A=hoyActs(d);const st=A.map(x=>({x,k:kState(d,x.id).k}));const no=st.filter(o=>o.k==='none');
    out.obra={k:'obra',title:'Tu avance de hoy',n:no.length,tone:'',sub:`${A.length} programada${A.length===1?'':'s'} · ${st.filter(o=>o.k==='run').length} en ejecución · ${no.length} sin iniciar`,
      items:no.map(o=>({t:o.x.name,s:hoyLoc(o.x)})),go:'cap',goLabel:'Ir a En obra',empty:A.length?'Todo lo de hoy ya empezó':'No tienes actividades programadas hoy'}}
  /* restricciones: las de mi área (Calidad/OT), las de mi partida (SC) o todas */
  {let R=restrInScope().filter(rOpenC);if(AREA()&&me.area)R=R.filter(myArea);if(SCK()){const m=new Set(myScsI());R=R.filter(x=>m.has(x.sc)||(x.actId&&m.has((S.act.get(x.actId)||{}).sc)))}
    const lim=wshift(d,3);const late=R.filter(x=>x.need&&x.need<d),soon=R.filter(x=>x.need&&x.need>=d&&x.need<=lim);const L=[...late,...soon].sort((a,b)=>a.need.localeCompare(b.need));
    out.restr={k:'restr',title:AREA()&&me.area?`Restricciones de ${me.area}`:SCK()?'Restricciones de tu partida':'Restricciones',n:L.length,tone:late.length?'bad':'warn',
      sub:`${late.length} vencida${late.length===1?'':'s'} · ${soon.length} vence${soon.length===1?'':'n'} en 3 días · ${R.length} pendiente${R.length===1?'':'s'} en total`,
      items:L.map(x=>({t:(x.desc||x.type||'Restricción'),s:`${x.need<d?'Vencida':'Para'} ${fmtD(x.need)}${x.actId&&S.act.has(x.actId)?' · '+S.act.get(x.actId).name:''}`})),go:'restr',goLabel:'Ver restricciones',empty:R.length?`Nada vence en los próximos 3 días (${R.length} pendiente${R.length===1?'':'s'})`:'No hay restricciones pendientes'}}
  /* liberaciones de calidad */
  if(typeof LIB!=='undefined'){const vs=new Set(visPisos().map(p=>p.id));const open=[...LIB.values()].filter(l=>l.st!=='anu'&&!libDone(l.st)&&(!l.pisoId||vs.has(l.pisoId)));
    const lab=l=>`${l.nm||((S.act.get(l.actId)||{}).name)||'Liberación'}`;const loc=l=>{const x=S.act.get(l.actId);return x?hoyLoc(x):''};
    if(cal){const toProg=open.filter(l=>l.st==='sol'||l.st==='lev'),insp=open.filter(l=>l.st==='pro'&&l.prog&&(l.prog.d===d||l.prog.d===tm)).sort((a,b)=>(a.prog.d+a.prog.h).localeCompare(b.prog.d+b.prog.h));
      out.lib={k:'lib',title:'Liberaciones',n:toProg.length+insp.length,tone:'warn',sub:`${insp.filter(l=>l.prog.d===d).length} inspección(es) hoy · ${insp.filter(l=>l.prog.d===tm).length} mañana · ${toProg.length} por programar`,
        items:[...insp.map(l=>({t:lab(l),s:`${l.prog.d===d?'Hoy':'Mañana'} ${l.prog.h||''} · ${l.prog.insp||'sin inspector'} · ${loc(l)}`})),...toProg.map(l=>({t:lab(l),s:`${l.st==='lev'?'Pide reinspección':'Por programar'} · ${loc(l)}`}))],go:'lib',goLabel:'Ir a Liberaciones',empty:'No hay inspecciones ni solicitudes pendientes'}}
    else{const m=SCK()?new Set(myScsI()):null;const mine=open.filter(l=>!m||m.has(l.sc));const obs=mine.filter(l=>l.st==='obs'),prog=mine.filter(l=>l.st==='pro'&&l.prog&&(l.prog.d===d||l.prog.d===tm));
      out.lib={k:'lib',title:'Liberaciones',n:obs.length+prog.length,tone:obs.length?'bad':'',sub:`${obs.length} observada${obs.length===1?'':'s'} por levantar · ${prog.length} inspección(es) hoy o mañana · ${mine.length} abierta${mine.length===1?'':'s'}`,
        items:[...obs.map(l=>({t:lab(l),s:`Observada · ${loc(l)}`})),...prog.map(l=>({t:lab(l),s:`Inspección ${l.prog.d===d?'hoy':'mañana'} ${l.prog.h||''} · ${loc(l)}`}))],go:'lib',goLabel:'Ir a Liberaciones',empty:mine.length?`${mine.length} en curso, nada que hacer hoy`:'No hay liberaciones abiertas'}}}
  /* plan semanal: pisos que faltan congelar esta semana */
  if(canWrite&&r!=='sc'){const n=curWeek();const vp=visPisos().filter(p=>Object.keys(liveItems(n,p.id)).length);const nf=vp.filter(p=>!(S.wk.get(wkId(n,p.id))||{}).frozenAt);
    out.plan={k:'plan',title:`PPC semanal · semana ${n}`,n:nf.length,tone:'',sub:`${nf.length} piso${nf.length===1?'':'s'} sin congelar de ${vp.length} con actividades`,items:nf.map(p=>({t:`${p.code} · ${p.name}`})),go:'plan',goLabel:'Ir al Plan semanal',empty:vp.length?'Todos los pisos están congelados':'No hay actividades esta semana'}}
  /* semana que viene: se congela sola en el corte (el mismo de las propuestas); se avisa los dos días antes */
  if(canWrite&&r!=='sc'){const n1=curWeek()+1;const cut=propCut(n1);const left=cut-NOW();if(left>0&&left<2*864e5){const vp=visPisos().filter(p=>Object.keys(liveItems(n1,p.id)).length);const nf=vp.filter(p=>!(S.wk.get(wkId(n1,p.id))||{}).frozenAt);
    out.plan2={k:'plan2',title:`Semana ${n1}: se congela sola`,n:nf.length,tone:'warn',sub:`El ${frzCutTxt(n1)} se congelan solos los pisos que nadie haya congelado (${nf.length} de ${vp.length}). Revisa las propuestas pendientes antes.`,items:nf.map(p=>({t:`${p.code} · ${p.name}`})),go:'plan',goLabel:'Ir al PPC semanal',empty:vp.length?`Todos los pisos de la semana ${n1} ya están congelados`:`No hay actividades en la semana ${n1}`}}}
  /* pisos sin responsable: ahí decide cualquier editor (propuestas y plan diario) */
  if(isAdmin&&typeof pisosSinResp==='function'&&S.pis.size){const L=pisosSinResp();if(L.length)out.resp={k:'resp',title:'Pisos sin responsable',n:L.length,tone:'',sub:'Cualquier editor decide sus propuestas y su plan diario. Asigna un responsable en Equipo para que solo él decida.',items:L.map(p=>({t:`${p.code} · ${p.name}`})),go:'team',goLabel:'Ir a Equipo',empty:''}}
  /* holgura del cliente consumida: la fecha interna ya pasa la que se le informó */
  if(typeof canCli==='function'&&canCli()){ensureCli();const M=cliLate();if(CLX.size){const vs=new Set(visPisos().map(p=>p.id));const L=M?[...M.entries()].filter(([id])=>vs.has(pisoOfAct(id))&&S.act.has(id)).sort((a,b)=>a[1].cli.localeCompare(b[1].cli)):[];
    out.cli={k:'cli',title:'Holgura del cliente',n:L.length,tone:'bad',sub:`${L.length} actividad${L.length===1?'':'es'} ya termina${L.length===1?'':'n'} después de la fecha emitida al cliente${cliLast()?' ('+esc(cliLast().label)+')':''}`,
      items:L.map(([id,o])=>({t:S.act.get(id).name,s:`Cliente: ${fmtD(o.cli)} · interno: ${fmtD(o.end)} · ${hoyLoc(S.act.get(id))}`})),go:'look',goLabel:'Ver en el Lookahead (⚑)',empty:M?'Todo dentro de las fechas informadas al cliente':'Cargando la versión emitida…'}}}
  /* trabajo no programado visto hoy en el recorrido (informativo: no es algo pendiente) */
  if(canNP()){const L=npItems([d],new Set(visPisos().map(p=>p.id)));const by={};L.forEach(i=>by[i.e.sc]=(by[i.e.sc]||0)+1);
    out.np={k:'np',title:'Trabajo no programado hoy',n:0,tone:'',sub:'',items:[],go:'campo',goLabel:VEED()?'Ir al recorrido (Campo › Plano)':'Ver en Campo',
      empty:L.length?`${L.length} registrado${L.length===1?'':'s'}: ${Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([sc,k])=>conOf(sc).name+' '+k).join(' · ')}`:'Nada registrado hoy. En el recorrido, toca en el plano donde veas una cuadrilla trabajando sin estar programada.'}}
  const order=r==='sc'?['obra','restr','lib']:r==='campo'?['campo','np','restr','lib']:r==='area'?(isCalArea()?['lib','np','restr']:['restr','lib']):r==='lector'?['restr','lib']:r==='veedor'?['np','restr','lib']:['prop','plan2','campo','np','cli','restr','lib','plan','resp'];
  /* primero lo que tiene pendientes (en el orden del rol); lo que está al día, al final */
  const L=order.map(k=>out[k]).filter(Boolean);return[...L.filter(c=>c.n),...L.filter(c=>!c.n)]}

function renderHoy(main){const d=todayIso();const C=hoyCards();const n=C.reduce((a,c)=>a+(c.n?1:0),0);
  const hi=(()=>{const h=+hhmm(NOW()).slice(0,2);return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches'})();
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead(`${hi}, ${(me.name||'').split(' ')[0]||''}`.replace(/, $/,''),`${DOW_L[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)} · ${pisoLabel()} · ${n?`${n} cosa${n===1?'':'s'} por atender`:'todo al día'}`)}
    <div class="hoyg">${C.map(hoyCard).join('')}</div></div></div>`;
  main.onclick=e=>{const b=e.target.closest('[data-hgo]');if(!b)return;if(b.closest('[data-hoy="np"]')){CU.view='plan';saveCU()}goTab(b.dataset.hgo)}}
