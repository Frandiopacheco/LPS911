"use strict";
/* LPS 911 · Tareo F3: «Publicación» (jefe de producción) y «Costos» (días publicados, detalle y Excel).
   Contrato en docs/ia/tareo.md («Contrato de F3» e «Implementación de F3 — pantallas»). Publicar lo hace el servidor (función
   invocable publicarTareo: previa / publicar / rectificar); aquí solo se llama y se leen tpub/{fecha}_v{n} (versiones inmutables)
   y tpubidx/{fecha} (versión vigente, historial, abierto). Todo se lee con tolerancia: cualquier campo puede faltar.
   Globales: TPB/tpb* (Publicación), TPK/tpk* (Costos), tpx* (Excel), TPUB (caché de publicaciones). CSS: bloque «tareo: publicación»
   (clases tp-). Ids del DOM con prefijo tpb/tpk (tareo.js ya usa #tpOk, #tpMsg… en Partidas). */

/* quién publica (admin o editor con «Publica tareo») y quién ve Costos (además, costos) */
/* publica: admin, asistente de tareo (20-10-2026: el dueño le dio acceso a todo el tareo) y jefe de producción con «Publica tareo» */
const tpPubOk=()=>!!me&&(me.role==='admin'||TASIS()||(me.role==='editor'&&me.tpub===true));
const tpCosOk=()=>!!me&&(tpPubOk()||me.role==='tcos');
/* caché de publicaciones leídas (id → doc): son inmutables */
const TPUB=new Map();
const tpMs=v=>typeof v==='number'?v:v&&typeof v.toMillis==='function'?v.toMillis():v&&typeof v.seconds==='number'?v.seconds*1000:typeof v==='string'?(Date.parse(v)||0):0;
const tpAt=v=>{const t=tpMs(v);if(!t)return'';const s=new Date(t-LIMA_OFF).toISOString();return`${fmtD(s.slice(0,10))} ${s.slice(11,16)}`};
const tpWho=(by,byN)=>byN||toWho(by)||'';
const tpProj=()=>{let n='';try{const p=P();n=p.fullName||p.name||''}catch(e){}if(!n)try{n=localStorage.getItem('lps.pname')||''}catch(e){}return n||'Proyecto'};
const tpNum=v=>Number.isFinite(+v)?+v:0;
/* filas y totales de una publicación (tot puede faltar: se calcula de rows) */
const tpRows=p=>Array.isArray(p&&p.rows)?p.rows.filter(r=>r&&r.dni):[];
function tpTot(p){const t=p&&p.tot;if(t&&typeof t==='object'&&t.hh!=null)return{obreros:tpNum(t.obreros),pres:tpNum(t.pres),aus:tpNum(t.aus),hh:tpNum(t.hh),he:tpNum(t.he),alt:tpNum(t.alt),porMot:t.porMot||{}};
  const R=tpRows(p);let pres=0,aus=0,hh=0,he=0,alt=0;const porMot={};
  for(const r of R){if(r.as===true){pres++;hh+=tpNum(r.trab);he+=tpNum(r.ext);if(r.alt)alt++}else{aus++;const m=r.mot||'sin motivo';porMot[m]=(porMot[m]||0)+1}}
  return{obreros:R.length,pres,aus,hh:tR2(hh),he:tR2(he),alt,porMot}}
const tpPorMot=pm=>Object.entries(pm||{}).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span title="${esc(TO_MOT[k]||k)}">${esc(k)} ${n}</span>`).join(' · ');
/* errores de la función, en claro */
function tpErr(e){const c=String(e&&e.code||'').replace(/^functions\//,'');const m=String(e&&e.message||'');
  if(c==='unavailable'||c==='deadline-exceeded')return'Sin conexión con el servidor. Revisa tu internet y vuelve a intentar.';
  if((c==='internal'&&(!m||/^internal$/i.test(m)))||(c==='not-found'&&/^not[_ ]?found$/i.test(m)))return'El servidor no respondió. ¿Ya se instaló la función «publicarTareo» en Firebase? (docs/ia/tareo.md)';
  if(c==='unauthenticated')return'Tu sesión venció: vuelve a ingresar.';
  if(c==='permission-denied')return m||'Solo el administrador o el jefe de producción pueden publicar.';
  return m||('No se pudo completar ('+(c||'error')+').')}
async function tpCall(data){if(!window.firebase||!firebase.functions)throw Object.assign(new Error('No se cargó Firebase Functions: recarga la página.'),{code:'unavailable'});
  const r=await firebase.functions().httpsCallable('publicarTareo')(data);return(r&&r.data)||{}}
/* lee una publicación (caché; son inmutables) */
async function tpGet(id){if(TPUB.has(id))return TPUB.get(id);const d=await fcol('tpub').doc(id).get();if(!d.exists)return null;const x={...d.data(),id};TPUB.set(id,x);return x}
const tpId=(f,v)=>`${f}_v${v}`;

/* suscripciones temporales (solo con la pestaña abierta; se sueltan en la siguiente llegada si ya no se ve, y al cerrar sesión) */
const TPS={};
function tpUnsub(slot){const s=TPS[slot];if(s&&s.un){try{s.un()}catch(e){}}delete TPS[slot]}
function tpSub(slot,key,ref,cb,act){const s=TPS[slot];if(s&&s.k===key)return;tpUnsub(slot);if(!db)return;const o={k:key,un:null};TPS[slot]=o;
  o.un=ref.onSnapshot(sn=>{if(TPS[slot]!==o)return;if(!act()){tpUnsub(slot);return}cb(sn,null);if(ready)requestRender()},
    err=>{if(TPS[slot]!==o)return;cb(null,err);if(ready&&act())requestRender()});
  unsubs.push(()=>{if(TPS[slot]===o)tpUnsub(slot)})}
const tpDates=(a,b)=>{const L=[];for(let d=a;d<=b&&L.length<400;d=addD(d,1))L.push(d);return L};
const tpMon=f=>addD(f,-((pd(f).getUTCDay()+6)%7));
/* diferencias contra la versión anterior (dif): texto, lista o resumen; forma libre (la arma el servidor) */
function tpDif(d){if(d==null||d==='')return'';if(typeof d==='string')return`<div class="tp-dif">${esc(d)}</div>`;
  const it=x=>typeof x==='string'?esc(x):x&&typeof x==='object'?esc(x.msg||x.txt||[x.dni,x.nom||[x.ape,x.nomb].filter(Boolean).join(' '),x.campo||x.k,x.antes!=null||x.despues!=null?`${x.antes??'—'} → ${x.despues??'—'}`:''].filter(v=>v!=null&&v!=='').join(' · ')):esc(String(x));
  if(Array.isArray(d))return d.length?`<ul class="tp-dif">${d.slice(0,60).map(x=>`<li>${it(x)}</li>`).join('')}${d.length>60?`<li class="note">… y ${d.length-60} más</li>`:''}</ul>`:'<div class="tp-dif note">Sin cambios.</div>';
  if(typeof d==='object'){const E=Object.entries(d).filter(([,v])=>v!=null&&!(Array.isArray(v)&&!v.length));if(!E.length)return'<div class="tp-dif note">Sin cambios.</div>';
    return`<ul class="tp-dif">${E.map(([k,v])=>`<li><b>${esc(k)}:</b> ${Array.isArray(v)?v.slice(0,30).map(it).join('; ')+(v.length>30?` … (${v.length})`:''):typeof v==='object'?esc(Object.entries(v).map(([a,b])=>`${a} ${typeof b==='object'?JSON.stringify(b):b}`).join(' · ')):esc(String(v))}</li>`).join('')}</ul>`}
  return`<div class="tp-dif">${esc(String(d))}</div>`}
const tpVChip=(v,vig)=>`<span class="tp-v${v===vig?' on':''}">v${esc(String(v))}${v===vig?' · vigente':' · sustituida'}</span>`;

/* ======================================================================
   Publicación (tpub), opción C (20-10-2026, decisión del dueño): a la izquierda la tabla de capataces del día; a la derecha
   «Por resolver» (obreros en dos tareos, personal sin tareo y lo que el servidor no acepte) y «Versiones del día»; arriba una
   barra fija con el día, los totales (y la diferencia con el último día publicado), la franja de días y «Publicar día».
   Solo se verifican 3 cosas: todos los capataces revisados, nadie en dos tareos y el personal sin tareo con su motivo (el resto
   ya lo exige «Marcar revisado»; si el servidor encuentra otra cosa, sale en «Por resolver»). El motivo de un obrero sin tareo se
   guarda al tocarlo (tpexc/{fecha}): así lo usa también la publicación automática del servidor (publicarTareoAuto).
   La previa se pide sola al entrar y ≈ 2 s después de cada cambio en los tareos del día.
   ====================================================================== */
/* f: fecha · prev/pf: respuesta de «previa» y su fecha · at: cuándo llegó · idx: tpubidx del día · vers: tpub del día ·
   wk/wkOk: tpubidx de la franja · tsig: firma de los tareos del día · xdb: motivos guardados (tpexc/{f}.exc) · auto: tpauto/{f} ·
   otro: DNI con «Otro…» abierto · ayer: {f, hh} del último día publicado antes de f · rOpen: «Resueltos» abierto */
const TPB={f:'',prev:null,pf:'',at:0,busy:'',err:'',idx:null,idxOk:false,vers:new Map(),wk:new Map(),wkOk:false,tsig:'',tarOk:false,tried:'',again:false,
  deb:0,tick:0,xdb:{},auto:null,otro:'',otroTxt:'',dOpen:new Set(),ayer:null,ayerK:'',rOpen:false,wset:new Set()};
const TPB_EXC=['Vacaciones','Descanso médico','Otra obra','Falta'];
const TPB_DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const tpbAct=()=>U.mod==='tar'&&U.tab==='tpub'&&tpPubOk();
/* franja de 7 días: termina 3 días después de la fecha elegida (sin pasar de hoy) */
function tpbWin(f,hoy){const e=addD(f,3)>hoy?hoy:addD(f,3);return{a:addD(e,-6),b:e}}
function tpbSub(f,hoy){const w=tpbWin(f,hoy);const wa=addD(w.a,-7);
  tpSub('bidx',f,fcol('tpubidx').doc(f),(sn,err)=>{if(err){TPB.idx=null;TPB.idxOk=true;return}TPB.idx=sn&&sn.exists?{...sn.data(),id:sn.id}:null;TPB.idxOk=true},tpbAct);
  tpSub('bver',f,fcol('tpub').where('fecha','==',f),(sn,err)=>{if(err)return;const m=new Map();sn.docs.forEach(x=>{const d={...x.data(),id:x.id};m.set(x.id,d);TPUB.set(x.id,d)});TPB.vers=m},tpbAct);
  /* la franja y una semana antes (para comparar con el último día publicado) */
  tpSub('bwk',wa+'|'+w.b,fcol('tpubidx').where('fecha','>=',wa).where('fecha','<=',w.b),(sn,err)=>{TPB.wkOk=true;if(err)return;const M=new Map();sn.docs.forEach(x=>M.set(x.id,{...x.data(),id:x.id}));TPB.wk=M},tpbAct);
  tpSub('bexc',f,fcol('tpexc').doc(f),(sn,err)=>{if(err)return;const x=sn&&sn.exists?sn.data()||{}:{};const db0=x.exc&&typeof x.exc==='object'?x.exc:{};
    /* lo escrito en este equipo y aún no confirmado no se pisa */
    const o={...db0};for(const d of TPB.wset)if(Object.prototype.hasOwnProperty.call(TPB.xdb,d))o[d]=TPB.xdb[d];TPB.xdb=o},tpbAct);
  tpSub('baut',f,fcol('tpauto').doc(f),(sn,err)=>{if(err)return;TPB.auto=sn&&sn.exists?sn.data():null},tpbAct);
  /* los tareos del día: si cambia alguno (estado, horas, revisión), se vuelve a pedir la previa */
  tpSub('btar',f,fcol('tareo').where('date','==',f),(sn,err)=>{if(err){TPB.tarOk=true;return}
    const sig=sn.docs.map(d=>{const x=d.data()||{};return[d.id,x.st||'',tpMs(x.ts)||String(x.ts||''),Array.isArray(x.hist)?x.hist.length:0,x.arch?1:0].join(':')}).sort().join('|');
    if(TPB.tarOk&&sig!==TPB.tsig&&TPB.f===f)tpbSoon();TPB.tsig=sig;TPB.tarOk=true},tpbAct)}
function tpbSetF(f){if(f===TPB.f)return;TPB.f=f;TPB.prev=null;TPB.pf='';TPB.err='';TPB.idx=null;TPB.idxOk=false;TPB.vers=new Map();TPB.xdb={};TPB.wset=new Set();TPB.auto=null;
  TPB.tsig='';TPB.tarOk=false;TPB.tried='';TPB.again=false;TPB.otro='';TPB.otroTxt='';TPB.dOpen=new Set();TPB.ayer=null;TPB.ayerK='';if(TPB.deb){clearTimeout(TPB.deb);TPB.deb=0}}
function tpbSoon(){if(TPB.deb)clearTimeout(TPB.deb);TPB.deb=setTimeout(()=>{TPB.deb=0;if(tpbAct())tpbPrevia()},2000)}
/* motivo de un obrero sin tareo: el guardado en la pantalla o, si no se tocó, el de la versión vigente (al rectificar se conserva) */
const tpbVigExc=()=>{const v=TPB.idx&&+TPB.idx.v;const d=v?TPB.vers.get(tpId(TPB.f,v)):null;return(d&&d.exc)||{}};
const tpbM=dni=>{if(Object.prototype.hasOwnProperty.call(TPB.xdb,dni))return String(TPB.xdb[dni]||'').trim();const e=tpbVigExc()[dni];return String(e&&e.motivo||'').trim()};
const tpbAgo=()=>{if(!TPB.at)return'';const s=Math.max(0,Math.round((NOW()-TPB.at)/1000));return s<5?'Actualizado recién':s<60?`Actualizado hace ${s} s`:s<3600?`Actualizado hace ${Math.floor(s/60)} min`:`Actualizado a las ${tpAt(TPB.at).slice(-5)}`};
function tpbTick(){if(TPB.tick)return;TPB.tick=setInterval(()=>{if(!tpbAct()){clearInterval(TPB.tick);TPB.tick=0;return}const e=document.getElementById('tpbAt');if(e&&TPB.busy!=='prev')e.textContent=tpbAgo()},5000)}
/* las 3 verificaciones y qué falta: capataces sin revisar (bloqueos «estado»), DNI en dos tareos («dup») y sin tareo sin motivo;
   «otr» = lo demás que devuelva el servidor (raro: «Marcar revisado» ya lo exige) */
function tpbCalc(){const P=TPB.pf===TPB.f?TPB.prev:null,I=TPB.idx;const vig=I&&+I.v||null,ab=!!(I&&I.abierto);
  const sin=P&&Array.isArray(P.sinTareo)?P.sinTareo:[];const sinSet=new Set(sin.map(o=>o&&o.dni));
  const B=P&&Array.isArray(P.bloqueos)?P.bloqueos:[];
  const est=B.filter(b=>b&&['estado','st'].includes(b.k)),dup=B.filter(b=>b&&b.k==='dup'),nada=B.filter(b=>b&&b.k==='nada');
  const otr=B.filter(b=>b&&!['estado','st','dup','nada','cob','cobertura','sin'].includes(b.k)&&!(b.dni&&sinSet.has(b.dni)));
  const pend=sin.filter(o=>o&&!tpbM(o.dni));const nf=est.length+dup.length+pend.length+otr.length;
  let why='';if(vig&&!ab)why=`El día ya está publicado (v${vig}). Para cambiarlo, usa «Rectificar».`;
  else if(!P)why=TPB.err?'No se pudo revisar el día. Usa ↻ para intentarlo de nuevo.':'Revisando los tareos del día…';
  else if(nada.length&&!sin.length)why='No hay tareos con obreros en este día.';
  else if(nf){const L=[];if(est.length)L.push(`${est.length} ${est.length===1?'capataz sin revisar':'capataces sin revisar'}`);if(dup.length)L.push(`${dup.length} en dos tareos`);
    if(pend.length)L.push(`${pend.length} sin tareo sin motivo`);if(otr.length)L.push(`${otr.length} ${otr.length===1?'observación':'observaciones'} del servidor`);why='Falta: '+L.join(' · ')+'.'}
  else if(TPB.busy==='prev')why='Actualizando el estado…';else if(TPB.busy)why='Espera un momento…';
  return{P,I,vig,ab,sin,est,dup,otr,pend,nf,ok:!!P&&!why&&!TPB.busy,why}}
function tpbExcObj(sin){const o={};for(const x of sin){const m=tpbM(x.dni);if(m)o[x.dni]=m}return o}
const tpbCapN=x=>x?(x.capN||tCapName(x.cap)||x.cap||x.id):'';
const tpbStC=s=>{const[l,c]=TO_ST[s]||[s||'—',''];return`<span class="to-st ${c}">${esc(l)}</span>`};
/* último día publicado antes de f (en la franja y la semana anterior) y sus HH, para la comparación de la barra */
function tpbAyer(f){const L=[...TPB.wk.values()].filter(x=>x&&x.fecha<f&&+x.v>0).sort((a,b)=>b.fecha.localeCompare(a.fecha));const x=L[0];const k=x?tpId(x.fecha,+x.v):'none';
  if(k===TPB.ayerK)return;TPB.ayerK=k;TPB.ayer=null;if(!x)return;tpGet(k).then(p=>{if(TPB.ayerK!==k||!p)return;TPB.ayer={f:x.fecha,hh:tpTot(p).hh};requestRender()}).catch(()=>{})}

function renderTPub(main){if(!tpPubOk()){main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Publicación','')}<div class="callout">Solo el administrador o el jefe de producción publican el tareo.</div></div></div>`;return}
  const hoy=todayIso();if(!TPB.f)TPB.f=hoy;const f=TPB.f;tpbSub(f,hoy);tpbTick();if(TPB.wkOk)tpbAyer(f);
  if(TPB.pf!==f&&!TPB.busy&&TPB.tried!==f){TPB.tried=f;setTimeout(()=>{if(TPB.f===f&&tpbAct())tpbPrevia()},0)}
  const st=tpbCalc(),P=st.P,R=(P&&P.resumen)||{},I=st.I,vig=st.vig,busy=TPB.busy;
  const ab=I&&I.abierto;const vd=vig?TPB.vers.get(tpId(f,vig)):null;const rect=!!(vig&&st.ab);const pubC=!!(vig&&!st.ab);
  /* franja de días (compacta) */
  const w=tpbWin(f,hoy);const days=tpDates(w.a,w.b).map(d=>{const x=d===f&&TPB.idxOk?I:TPB.wk.get(d);const v=x&&+x.v||0;const nl=tNoLab(d);
    const s=v&&x.abierto?['ab','en rectificación','●']:v?['pub',`publicado v${v}`,'✓']:nl?['nl','no laborable','—']:['pen','pendiente','●'];
    return`<button class="pb-day s-${s[0]}${d===f?' on':''}" data-tpbf="${esc(d)}" aria-pressed="${d===f}" title="${esc(toDia(d)+' · '+s[1])}">${TPB_DOW[pd(d).getUTCDay()]} ${+d.slice(8,10)}${d===hoy?' · hoy':''} <i aria-hidden="true">${s[2]}</i></button>`}).join('');
  /* estado y botón */
  let tone,big;
  if(pubC){tone='pub';big=`Publicado v${vig}${vd?' · '+tpAt(vd.at).slice(-5)+' · '+tpWho(vd.by,vd.byN):''}`}
  else if(!P&&TPB.err){tone='bad';big='No se pudo revisar el día'}
  else if(!P){tone='load';big='Revisando el día…'}
  else if(st.nf){tone='warn';big=st.nf===1?'Falta 1 cosa':`Faltan ${st.nf} cosas`}
  else{tone='ok';big=rect?`Listo para la rectificación v${vig+1}`:'Listo para publicar'}
  const btn=pubC?`<button class="ib pb-go" id="tpbRect"${busy?' disabled':''}>Rectificar…</button>`
    :`<button class="ib pri pb-go" id="tpbPub"${st.ok?'':' disabled'} aria-describedby="tpbWhy">${busy==='pub'?'Publicando…':rect?`Publicar rectificación v${vig+1}`:'Publicar día'}</button>`;
  const ay=TPB.ayer&&P?(()=>{const d=tR2(tpNum(R.hh)-TPB.ayer.hh);return` · <span class="pb-cmp" title="Comparado con el ${esc(toDia(TPB.ayer.f))}">vs. ${esc(TPB_DOW[pd(TPB.ayer.f).getUTCDay()])} ${+TPB.ayer.f.slice(8,10)}: ${d>0?'+':''}${esc(toH(d))} HH</span>`})():'';
  const tot=P?`${tpNum(R.obreros)} obreros · ${toH(R.hh)} HH · ${toH(R.he)} HE${ay}`:'&nbsp;';
  const A=TC().pubAuto;const au=TPB.auto;
  const autoH=!pubC&&A.on?`<div class="pb-auto${au&&!au.ok?' bad':''}" id="tpbAuto">${au&&!au.ok?`${esc(tpAt(au.t).slice(-5))}: no se publicó sola (${au.n===1?'falta 1 cosa':`faltan ${tpNum(au.n)} cosas`}). Vuelve a intentarlo cada 15 min.`:f===hoy?`Se publica sola a las ${esc(A.hh)} si todo está listo.`:''}</div>`:'';
  const bar=`<section class="pb-bar t-${tone}" id="tpbBar" aria-live="polite">
    <div class="pb-t"><h2 title="Publicación del tareo">${esc(toDia(f))}</h2><div class="pb-s" id="tpbTot">${tot}</div></div>
    <nav class="pb-days" id="tpbDays" aria-label="Días"><button class="ib" id="tpbPrev" aria-label="Día anterior">◀</button>${days}<button class="ib" id="tpbNext" aria-label="Día siguiente"${f>=hoy?' disabled':''}>▶</button><input class="tin pb-date" type="date" id="tpbDate" value="${esc(f)}" max="${esc(hoy)}" aria-label="Elegir fecha"></nav>
    <div class="pb-st"><b id="tpbSt">${esc(big)}</b><span class="pb-ref"><span id="tpbAt">${busy==='prev'?'Actualizando…':esc(tpbAgo())}</span><button class="ib pb-rf" id="tpbVer" title="Volver a revisar ahora" aria-label="Volver a revisar ahora"${busy==='prev'?' disabled':''}>↻</button></span></div>${btn}
    <div class="pb-why" id="tpbWhy">${esc(st.why)}</div>${autoH}</section>`;
  const abH=ab?`<div class="callout t-warn" id="tpbAb"><b>Abierto para rectificar</b> desde ${esc(tpAt(ab.t))}${ab.by?' por '+esc(toWho(ab.by)):''}${ab.motivo?` · «${esc(ab.motivo)}»`:''}. Costos sigue viendo la v${esc(String(vig))} hasta que publiques la nueva versión.</div>`:'';
  const errH=TPB.err?`<div class="callout warnc" id="tpbErr" role="alert">${esc(TPB.err)}</div>`:'';
  const sk=n=>`<div class="tp-sk" aria-hidden="true">${'<i></i>'.repeat(n)}</div>`;
  /* izquierda: capataces (los que faltan primero) */
  const T=Array.isArray(R.tareos)?R.tareos.filter(x=>x&&x.id):[];const ORD={env:0,reab:1,bor:2,rev:3,pub:4};
  const nRev=T.filter(x=>x.st==='rev'||(x.st==='pub'&&(rect||pubC))).length;
  const capsH=`<section class="card pb-caps" id="tpbCaps"><header class="pb-h"><b>Capataces</b><span id="tpbCapN">${T.length?`${nRev} de ${T.length} revisados`:''}</span></header>
    ${!P?sk(4):T.length?`<div class="tscroll"><table class="t pb-ct" id="tpbCt"><thead><tr><th>Capataz</th><th>Estado</th><th class="t-r">Obreros</th><th class="t-r">HH</th><th class="t-r">HE</th><th></th></tr></thead><tbody>
      ${[...T].sort((a,b)=>(ORD[a.st]??5)-(ORD[b.st]??5)||tpbCapN(a).localeCompare(tpbCapN(b))).map(x=>{const ok=x.st==='rev'||x.st==='pub';const k=x.st==='env'?'warn':ok?'':'bad';
        const act=x.st==='env'?`<button class="ib pri" data-tpbt="${esc(x.id)}">Revisar</button>`:`<button class="ib" data-tpbt="${esc(x.id)}">${ok?'Ver':'Abrir'}</button>`;
        return`<tr data-tpbp="${esc(x.id)}" class="${k}"><td><b>${esc(tpbCapN(x))}</b></td><td>${tpbStC(x.st)}</td><td class="mono t-r" title="${tpNum(x.pres)} vinieron · ${tpNum(x.aus)} no vinieron">${tpNum(x.n)}</td><td class="mono t-r">${tpNum(x.hh)?toH(x.hh):'—'}</td><td class="mono t-r">${tpNum(x.he)?toH(x.he):''}</td><td class="t-r">${act}</td></tr>`}).join('')}</tbody></table></div>`
    :'<div class="tp-pad note">Ningún capataz tiene tareo con obreros este día.</div>'}</section>`;
  /* derecha: por resolver (en dos tareos, sin tareo sin motivo, observaciones del servidor) y resueltos */
  const TM=new Map(T.map(x=>[x.id,x]));const canW=!pubC;
  const dupH=st.dup.map(b=>{const ids=Array.isArray(b.tareos)?b.tareos:[];return`<li class="pb-it bad" data-tpbdup="${esc(b.dni||'')}"><b>${esc((b.msg||'').split(' figura en ')[0]||b.dni)}</b><span class="note">En ${ids.length} tareos: ${esc(ids.map(id=>tpbCapN(TM.get(id))||id).join(' y '))}</span>
    <div class="pb-ch">${ids.map(id=>{const t=TM.get(id);return`<button class="pb-c" data-tpbk="${esc(id)}" data-dni="${esc(b.dni||'')}"${canW?'':' disabled'}>Dejar en ${esc(tpbCapN(t)||id)}</button>`}).join('')}</div></li>`}).join('');
  const sinL=[...st.sin].sort((a,b)=>String(a.ape||'').localeCompare(String(b.ape||'')));
  const mot=o=>TPB.otro===o.dni?`<span class="pb-otro"><input class="tin" id="tpbOtro" value="${esc(TPB.otroTxt)}" placeholder="Escribe el motivo" maxlength="120" aria-label="Otro motivo"><button class="ib pri" data-tpbok="${esc(o.dni)}">Guardar</button></span>`
    :`${TPB_EXC.map(c=>`<button class="pb-c" data-tpbm="${esc(c)}" data-dni="${esc(o.dni)}"${canW?'':' disabled'}>${esc(c)}</button>`).join('')}<button class="pb-c" data-tpbo="${esc(o.dni)}"${canW?'':' disabled'}>Otro…</button>`;
  const nom=o=>esc([o.ape,o.nom].filter(Boolean).join(', ')||o.dni);
  const pendH=sinL.filter(o=>!tpbM(o.dni)).map(o=>`<li class="pb-it" data-tpbd="${esc(o.dni)}"><b>${nom(o)}</b><span class="note">Sin tareo · ${esc(o.capN||tCapName(o.cap)||'sin capataz')} · DNI ${esc(o.dni)}</span><div class="pb-ch">${mot(o)}</div></li>`).join('');
  const otrH=st.otr.map(b=>`<li class="pb-it bad"><span>${esc(b.msg||b.k||'')}</span>${b.tareo?`<div class="pb-ch"><button class="ib" data-tpbt="${esc(b.tareo)}">Abrir el tareo</button></div>`:''}</li>`).join('');
  const nPor=st.dup.length+st.pend.length+st.otr.length;
  const resL=sinL.filter(o=>tpbM(o.dni));
  const resH=resL.length?`<details class="pb-res" id="tpbRes"${TPB.rOpen?' open':''}><summary>Resueltos <span>${resL.length}</span></summary><ul>${resL.map(o=>`<li data-tpbd="${esc(o.dni)}"><span>${nom(o)}</span><b>${esc(tpbM(o.dni))}</b>${canW?`<button class="t-lnk" data-tpbq="${esc(o.dni)}">Cambiar</button>`:''}</li>`).join('')}</ul></details>`:'';
  const porH=`<section class="card pb-por" id="tpbPor"><header class="pb-h"><b>Por resolver</b><span id="tpbPorN">${P?nPor:''}</span></header>
    ${!P?sk(3):nPor?`<ul class="pb-l">${dupH}${pendH}${otrH}</ul>`:`<div class="tp-pad note pb-ok">${st.est.length?'Nada más que resolver aquí: falta que se revisen los capataces de la izquierda.':'Todo resuelto.'}</div>`}${resH}</section>`;
  /* versiones */
  const vers=(Array.isArray(I&&I.vers)&&I.vers.length?I.vers.map(x=>({...x})):[...TPB.vers.values()].map(d=>({v:d.v,at:d.at,by:d.by,motivo:d.motivo}))).filter(x=>x&&x.v!=null).sort((a,b)=>b.v-a.v);
  const nxt=rect&&P&&!st.nf?`<li class="tp-tn" data-tpbv="nueva"><span class="tp-v">v${vig+1} · por publicar</span>${P.dif!=null?`<details class="tp-dd" data-tpbdo="nueva"${TPB.dOpen.has('nueva')?' open':''}><summary>Cambios respecto a la v${vig}</summary>${tpDif(P.dif)}</details>`:''}</li>`:'';
  const histH=`<section class="card pb-hist" id="tpbHist"><header class="pb-h"><b>Versiones del día</b><span>${vers.length}</span></header>${vers.length?`<ol class="tp-tl">${nxt}${vers.map(x=>{const d=TPB.vers.get(tpId(f,x.v));const t=d?tpTot(d):null;
      return`<li class="${x.v===vig?'vig':'old'}" data-tpbv="${esc(String(x.v))}">${tpVChip(x.v,vig)} <span class="tp-tw">${esc(tpAt(x.at||(d&&d.at)))} · ${esc(tpWho(x.by||(d&&d.by),x.byN||(d&&d.byN)))}</span>${x.motivo||(d&&d.motivo)?`<div class="tp-mot">«${esc(x.motivo||d.motivo)}»</div>`:''}${t?`<div class="note">${t.obreros} obreros · ${toH(t.hh)} HH · ${toH(t.he)} HE</div>`:''}
        ${d&&d.dif!=null?`<details class="tp-dd" data-tpbdo="${esc(String(x.v))}"${TPB.dOpen.has(String(x.v))?' open':''}><summary>Diferencias con la v${esc(String(d.ant??x.v-1))}</summary>${tpDif(d.dif)}</details>`:''}
        <div class="tp-ta">${d?`<button class="t-lnk" data-tpbc="${esc(d.id)}">Ver en Costos</button>`:''}${x.v===vig&&!st.ab?' <button class="t-lnk" data-tpbrect>Rectificar…</button>':''}</div></li>`}).join('')}</ol>`
    :`<p class="tp-pad note">${TPB.idxOk?'Al publicar, costos ve esta versión. Si después hay un error: «Rectificar».':'Cargando…'}</p>`}</section>`;
  /* el campo «Otro…» no se pierde al redibujar */
  const ae=document.activeElement;const keep=ae&&ae.id==='tpbOtro'?[ae.selectionStart,ae.selectionEnd]:null;
  main.innerHTML=`<div class="scroll"><div class="wrap pb" id="tpbRoot">${bar}${errH}${abH}<div class="pb-cols"><div class="pb-l1">${capsH}</div><div class="pb-r">${porH}${histH}</div></div></div></div>`;
  if(keep){const i=$('#tpbOtro');if(i){i.focus();try{i.setSelectionRange(keep[0],keep[1])}catch(e){}}}
  const go=d=>{tpbSetF(d>hoy?hoy:d);requestRender()};
  $('#tpbPrev').onclick=()=>go(addD(f,-1));$('#tpbNext').onclick=()=>go(addD(f,1));
  $('#tpbDate').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))go(e.target.value)};
  $('#tpbVer').onclick=()=>tpbPrevia();
  const pb=$('#tpbPub');if(pb)pb.onclick=()=>tpbPublicar();
  const rb=$('#tpbRect');if(rb)rb.onclick=()=>tpbRectificar();
  const root=$('#tpbRoot');
  root.querySelectorAll('details[data-tpbdo]').forEach(d=>d.addEventListener('toggle',()=>{const k=d.dataset.tpbdo;d.open?TPB.dOpen.add(k):TPB.dOpen.delete(k)}));
  const rs=$('#tpbRes');if(rs)rs.addEventListener('toggle',()=>{TPB.rOpen=rs.open});
  root.oninput=e=>{if(e.target.id==='tpbOtro')TPB.otroTxt=e.target.value};
  root.onkeydown=e=>{if(e.target.id==='tpbOtro'){if(e.key==='Enter'){e.preventDefault();tpbOtroOk(TPB.otro)}else if(e.key==='Escape'){e.preventDefault();TPB.otro='';requestRender()}}};
  root.onclick=e=>{let b;
    if((b=e.target.closest('[data-tpbf]')))return go(b.dataset.tpbf);
    if((b=e.target.closest('[data-tpbt]')))return tpbAbrir(b.dataset.tpbt);
    if((b=e.target.closest('[data-tpbc]'))){TPK.det=b.dataset.tpbc;TPK.mes=f.slice(0,7);goTab('tcos');return}
    if(e.target.closest('[data-tpbrect]'))return tpbRectificar();
    if((b=e.target.closest('[data-tpbm]'))&&!b.disabled)return tpbSetM(b.dataset.dni,b.dataset.tpbm);
    if((b=e.target.closest('[data-tpbo]'))&&!b.disabled){TPB.otro=b.dataset.tpbo;TPB.otroTxt='';requestRender();setTimeout(()=>{const i=$('#tpbOtro');if(i)i.focus()},0);return}
    if((b=e.target.closest('[data-tpbok]')))return tpbOtroOk(b.dataset.tpbok);
    if((b=e.target.closest('[data-tpbq]')))return tpbSetM(b.dataset.tpbq,'');
    if((b=e.target.closest('[data-tpbk]'))&&!b.disabled)return tpbDejar(b.dataset.dni,b.dataset.tpbk)}}
/* guarda el motivo de un obrero sin tareo al tocarlo (tpexc/{fecha}.exc.<dni>; '' = sin motivo). Se ve al momento. */
async function tpbSetM(dni,m){const f=TPB.f;if(!dni||!tpPubOk())return;const old=Object.prototype.hasOwnProperty.call(TPB.xdb,dni)?TPB.xdb[dni]:undefined;
  TPB.xdb={...TPB.xdb,[dni]:m};TPB.wset.add(dni);TPB.otro='';TPB.otroTxt='';requestRender();
  try{await fcol('tpexc').doc(f).set({exc:{[dni]:m},by:me.email||'',ts:NOW()},{merge:true})}
  catch(e){if(TPB.f===f){const x={...TPB.xdb};if(old===undefined)delete x[dni];else x[dni]=old;TPB.xdb=x}toast('No se pudo guardar el motivo: '+((e&&e.message)||e));requestRender()}
  finally{TPB.wset.delete(dni)}}
function tpbOtroOk(dni){const m=String(TPB.otroTxt||'').trim();if(!m){toast('Escribe el motivo.');return}tpbSetM(dni,m)}
/* obrero en dos tareos: «Dejar en X» lo quita de los demás (como «Quitar de este tareo» de Tareos del día). Solo si esos tareos
   están «Enviado» o «Revisado» (en borrador o reabierto los guarda el celular del capataz: se lo pide al capataz). */
async function tpbDejar(dni,keep){const st=tpbCalc();const b=st.dup.find(x=>x.dni===dni);if(!b)return;const R=(st.P&&st.P.resumen)||{};
  const TM=new Map((R.tareos||[]).map(x=>[x.id,x]));const otros=(b.tareos||[]).filter(id=>id!==keep);const kN=tpbCapN(TM.get(keep))||keep;
  const mal=otros.filter(id=>!['env','rev'].includes((TM.get(id)||{}).st));
  if(mal.length){toast(`El tareo de ${mal.map(id=>tpbCapN(TM.get(id))||id).join(' y ')} lo está llenando el capataz: pídele que lo quite y lo envíe.`);return}
  const nm=(b.msg||'').split(' figura en ')[0]||dni;
  if(!await uiAsk({title:`¿Dejar a ${nm} solo en el tareo de ${kN}?`,text:`Sale del tareo de ${otros.map(id=>tpbCapN(TM.get(id))||id).join(' y ')} y pierde sus horas allí. Un tareo revisado vuelve a «Enviado».`,ok:'Dejar en '+kN,tone:'warn'}))return;
  const mot=`Duplicado: se deja en el tareo de ${kN} (Publicación)`;
  try{for(const tid of otros)await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');const RR=cur.rows||{};if(!RR[dni])throw new Error('Ya no figura en ese tareo.');
      const blq=[];for(const x of Array.isArray(cur.blq)?cur.blq:[]){if(x&&Array.isArray(x.dnis)&&x.dnis.includes(dni)){const n={...x,dnis:x.dnis.filter(y=>y!==dni)};if(n.dnis.length)blq.push(n)}else blq.push(x)}
      const R2={...RR};delete R2[dni];const det=tDet(cur,{...cur,rows:R2,blq});
      const up={[`rows.${dni}`]:trDel(),...(trHrs(cur)?{}:{blq}),...trCorExtra(cur),hist:trAU(trHist('cor',{mot,cam:`${cur.st==='rev'?'Quita revisado. ':''}Quitado de este tareo: ${RR[dni].ape||dni} (${trAsTx(RR[dni])}); queda en el de ${kN}`,det})),by:me.email||'',ts:NOW()};
      if(cur.cot&&typeof cur.cot==='object'&&cur.cot[dni])up[`cot.${dni}`]=trDel();return up});
    toast(`${nm} queda solo en el tareo de ${kN}.`);tpbSoon()}
  catch(e){toast('No se pudo quitar: '+((e&&e.message)||e))}}
/* abre el tareo en la revisión (tareo-rev.js): misma fecha en «Tareos del día» */
function tpbAbrir(id){const f=TPB.f;if(typeof TD==='undefined'){goTab('tdia');return}
  if(TD.f===f&&TD.d===f&&TD.ok&&TD.docs.has(id)){goTab('tdia');if(typeof toDetalle==='function')toDetalle(id,false);return}
  TD.f=f;if(typeof TR!=='undefined')TR.want=id;goTab('tdia')}
/* previa del servidor (no escribe). Si ya hay una en curso, se repite al terminar */
async function tpbPrevia(){const f=TPB.f;if(TPB.busy){if(TPB.busy==='prev')TPB.again=true;return}TPB.busy='prev';TPB.tried=f;requestRender();
  try{const d=await tpCall({accion:'previa',fecha:f});if(TPB.f!==f)return;TPB.prev=d||{};TPB.pf=f;TPB.at=NOW();TPB.err=''}
  catch(e){if(TPB.f===f)TPB.err=tpErr(e)}
  finally{TPB.busy='';const a=TPB.again&&TPB.f===f;TPB.again=false;requestRender();if(a)tpbPrevia()}}
async function tpbPublicar(){const st=tpbCalc();if(!st.ok)return;const f=TPB.f,R=(st.P&&st.P.resumen)||{};const rect=!!st.vig;const exc=tpbExcObj(st.sin);const ne=Object.keys(exc).length;
  const r=await uiAsk({title:rect?`Publicar rectificación v${st.vig+1} · ${fmtD(f)}`:`Publicar el tareo del ${fmtD(f)}`,tone:'ok',
    text:rect?`Se crea la versión ${st.vig+1}. La v${st.vig} queda guardada como «sustituida» y costos verá la nueva.`:'Costos verá este día y podrá descargar su Excel. Un cambio posterior se hace con «Rectificar».',
    list:[`${tpNum(R.obreros)} obreros: ${tpNum(R.pres)} vinieron, ${tpNum(R.aus)} no vinieron`,`${toH(R.hh)} HH · ${toH(R.he)} horas extra · ${tpNum(R.alt)} en altura`,ne?`${ne} sin tareo con motivo`:''].filter(Boolean),
    ok:rect?'Publicar rectificación':'Publicar',input:rect?{label:'Motivo de la rectificación',required:true}:undefined});
  if(r===false||r==null)return;const motivo=rect?String(r).trim():'';if(rect&&!motivo){toast('Escribe el motivo de la rectificación.');return}
  if(TPB.f!==f||TPB.busy)return;TPB.busy='pub';TPB.err='';requestRender();
  try{const d=await tpCall({accion:'publicar',fecha:f,excepciones:exc,firma:(TPB.prev&&TPB.prev.firma)||undefined,...(rect?{motivo}:{})});
    if(d&&d.ok===false){TPB.prev=d;TPB.pf=f;TPB.at=NOW();toast('No se publicó: algo cambió. Revisa «Por resolver».');requestRender();return}
    toast(`Tareo del ${fmtD(f)} publicado${d&&d.v?' · versión '+d.v:''}`);TPB.busy='';tpbPrevia()}
  catch(e){TPB.err=tpErr(e)}
  finally{if(TPB.busy==='pub')TPB.busy='';requestRender()}}
async function tpbRectificar(){const f=TPB.f;const I=TPB.idx;if(!I||!I.v||TPB.busy)return;
  const m=await uiAsk({title:`Rectificar el tareo del ${fmtD(f)}`,tone:'warn',text:`Los tareos del día vuelven a «Revisado» para que la oficina los corrija (corregir los devuelve a «Enviado» y hay que revisarlos de nuevo). Costos sigue viendo la v${I.v} hasta que publiques la rectificación.`,
    ok:'Abrir para rectificar',input:{label:'Motivo',required:true}});
  if(m==null||m===false)return;const motivo=String(m).trim();if(!motivo){toast('Escribe el motivo.');return}
  TPB.busy='rect';TPB.err='';requestRender();
  try{await tpCall({accion:'rectificar',fecha:f,motivo});toast(`Día abierto para rectificar (v${I.v} sigue vigente)`)}
  catch(e){TPB.err=tpErr(e)}finally{TPB.busy='';requestRender()}
  if(!TPB.err)tpbPrevia()}
/* ======================================================================
   Costos (tcos): días publicados por mes, detalle de una versión y descargas Excel
   ====================================================================== */
/* mes: 'YYYY-MM' · idx/pubs: del mes · det: id de la publicación abierta · xd/xs/xa/xb: fechas de las descargas */
const TPK={mes:'',idx:new Map(),pubs:new Map(),ok:false,err:'',det:'',xd:'',xs:'',xa:'',xb:'',busy:''};
const tpkAct=()=>U.mod==='tar'&&U.tab==='tcos'&&tpCosOk();
const TPK_MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
const tpkMesN=m=>`${TPK_MES[+m.slice(5,7)-1]||''} ${m.slice(0,4)}`;
const tpkMesAdd=(m,n)=>{let y=+m.slice(0,4),k=+m.slice(5,7)-1+n;y+=Math.floor(k/12);k=((k%12)+12)%12;return`${y}-${String(k+1).padStart(2,'0')}`};
function tpkSub(m){const a=m+'-01',b=m+'-31';
  tpSub('kidx',m,fcol('tpubidx').where('fecha','>=',a).where('fecha','<=',b),(sn,err)=>{if(err){TPK.err=err.code||'error';TPK.ok=true;return}const M=new Map();sn.docs.forEach(x=>M.set(x.id,{...x.data(),id:x.id}));TPK.idx=M;TPK.ok=true;TPK.err=''},tpkAct);
  tpSub('kpub',m,fcol('tpub').where('fecha','>=',a).where('fecha','<=',b),(sn,err)=>{if(err)return;const M=new Map();sn.docs.forEach(x=>{const d={...x.data(),id:x.id};M.set(x.id,d);TPUB.set(x.id,d)});TPK.pubs=M},tpkAct)}
/* días del mes: vigente (tpubidx.v o la mayor) y las demás versiones */
function tpkDias(){const F=new Map();
  for(const d of TPK.pubs.values()){const f=d.fecha||String(d.id).split('_v')[0];if(!F.has(f))F.set(f,{f,idx:null,vs:[]});F.get(f).vs.push(d)}
  for(const[f,I]of TPK.idx){if(!F.has(f))F.set(f,{f,idx:null,vs:[]});F.get(f).idx=I}
  return[...F.values()].map(x=>{x.vs.sort((a,b)=>b.v-a.v);x.vig=x.idx&&x.idx.v!=null?+x.idx.v:(x.vs[0]?+x.vs[0].v:null);x.doc=x.vs.find(d=>+d.v===x.vig)||null;
    const iv=x.idx&&Array.isArray(x.idx.vers)?x.idx.vers:[];x.vers=[...new Set([...iv.map(o=>+o.v),...x.vs.map(d=>+d.v)])].filter(v=>Number.isFinite(v)).sort((a,b)=>b-a);x.iv=iv;return x}).sort((a,b)=>a.f<b.f?1:-1)}

function renderTCos(main){if(!tpCosOk()){main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Costos','')}<div class="callout">Sin acceso.</div></div></div>`;return}
  const hoy=todayIso();if(!TPK.mes)TPK.mes=hoy.slice(0,7);const m=TPK.mes;tpkSub(m);
  if(TPK.det)return tpkDetalle(main);
  const D=tpkDias();const ult=D.find(x=>x.vig)?.f||hoy;
  if(!TPK.xd)TPK.xd=ult;if(!TPK.xs)TPK.xs=ult;if(!TPK.xa)TPK.xa=ult.slice(0,8)+'01';if(!TPK.xb)TPK.xb=ult;
  const ws=tpMon(TPK.xs),we=addD(ws,6);const busy=TPK.busy;
  const num=(v,l)=>`<td class="mono t-r" data-l="${l}">${v}</td>`;
  const rows=D.filter(x=>x.vig!=null).map(x=>{const d=x.doc,t=d?tpTot(d):null;const ab=x.idx&&x.idx.abierto;
    const old=x.vers.filter(v=>v!==x.vig).map(v=>{const o=x.vs.find(y=>+y.v===v)||{};const iv=x.iv.find(y=>+y.v===v)||{};
      return`<tr class="tp-old" data-tpkf="${esc(x.f)}"><td data-l="Fecha"></td><td data-l="Versión">${tpVChip(v,x.vig)}</td><td colspan="4" class="note" data-l="">${esc(tpAt(o.at||iv.at))} · ${esc(tpWho(o.by||iv.by,o.byN))}${o.motivo||iv.motivo?` · «${esc(o.motivo||iv.motivo)}»`:''}</td><td data-l="Publicó"></td><td class="t-r" data-l=""><button class="t-lnk" data-tpkv="${esc(tpId(x.f,v))}">Ver</button></td></tr>`}).join('');
    return`<tr class="tp-day" data-tpkf="${esc(x.f)}"><td data-l="Fecha"><button class="t-lnk" data-tpkv="${esc(tpId(x.f,x.vig))}">${esc(toDia(x.f))}</button></td>
      <td data-l="Versión">${x.vig?tpVChip(x.vig,x.vig):''}${ab?` <span class="tp-v warn" title="${esc(ab.motivo||'')}">En rectificación</span>`:''}</td>
      ${num(t?t.obreros:'…','Obreros')}${num(t?t.pres:'…','Vinieron')}${num(t?toH(t.hh):'…','HH')}${num(t?toH(t.he):'…','HE')}
      <td data-l="Publicó" class="note">${d?esc(tpWho(d.by,d.byN))+' · '+esc(tpAt(d.at)):''}</td>
      <td class="t-r" data-l=""><button class="ib" data-tpkv="${esc(tpId(x.f,x.vig))}">Ver</button> <button class="ib" data-tpkx="${esc(x.f)}"${busy?' disabled':''}>Excel</button></td></tr>${old}`}).join('');
  main.innerHTML=`<div class="scroll"><div class="wrap tp">${pageHead('Costos · tareo publicado',esc(tpkMesN(m)),`<span class="to-date"><button class="ib" id="tpkPrev" aria-label="Mes anterior">‹</button><input class="tin" type="month" id="tpkMes" value="${esc(m)}" max="${esc(hoy.slice(0,7))}" aria-label="Mes"><button class="ib" id="tpkNext" aria-label="Mes siguiente"${m>=hoy.slice(0,7)?' disabled':''}>›</button></span>`)}
    <div class="card tp-x" id="tpkX"><div class="tp-bh"><b>Descargar Excel</b><span class="note">Formato del tareo semanal (una hoja por día, «Resumen HH» y «Tareo Semana»), siempre de la versión vigente de cada día.</span></div>
      <div class="tp-xg">
        <div class="tp-xi"><span class="tp-xl">Un día</span><input class="tin" type="date" id="tpkXd" data-fk="tpk:xd" value="${esc(TPK.xd)}" max="${esc(hoy)}" aria-label="Día"><button class="ib pri" id="tpkXdB"${busy?' disabled':''}>Excel del día</button></div>
        <div class="tp-xi"><span class="tp-xl">Semana</span><input class="tin" type="date" id="tpkXs" data-fk="tpk:xs" value="${esc(TPK.xs)}" max="${esc(hoy)}" aria-label="Un día de la semana"><span class="note" id="tpkXsR">${esc(fmtD(ws))} – ${esc(fmtD(we))}</span><button class="ib pri" id="tpkXsB"${busy?' disabled':''}>Excel de la semana</button></div>
        <div class="tp-xi"><span class="tp-xl">Rango</span><input class="tin" type="date" id="tpkXa" data-fk="tpk:xa" value="${esc(TPK.xa)}" max="${esc(hoy)}" aria-label="Desde"><span class="note">a</span><input class="tin" type="date" id="tpkXb" data-fk="tpk:xb" value="${esc(TPK.xb)}" max="${esc(hoy)}" aria-label="Hasta"><button class="ib pri" id="tpkXrB"${busy?' disabled':''}>Excel del rango</button></div>
      </div>${busy?'<div class="note">Armando el Excel…</div>':''}</div>
    ${TPK.err?`<div class="callout t-warn">No se pudieron leer las publicaciones (${esc(TPK.err)}).</div>`:''}
    <div class="card"><div class="tscroll"><table class="t t-tbl tp-list" id="tpkList"><thead><tr><th>Fecha</th><th>Versión</th><th class="t-r">Obreros</th><th class="t-r">Vinieron</th><th class="t-r">HH</th><th class="t-r">HE</th><th>Publicó</th><th></th></tr></thead>
      <tbody>${rows||`<tr><td colspan="8" class="note">${TPK.ok?`No hay días publicados en ${esc(tpkMesN(m))}.`:'Cargando…'}</td></tr>`}</tbody></table></div></div>
  </div></div>`;
  const goM=x=>{if(!/^\d{4}-\d{2}$/.test(x))return;TPK.mes=x>hoy.slice(0,7)?hoy.slice(0,7):x;TPK.idx=new Map();TPK.pubs=new Map();TPK.ok=false;requestRender()};
  $('#tpkPrev').onclick=()=>goM(tpkMesAdd(m,-1));$('#tpkNext').onclick=()=>goM(tpkMesAdd(m,1));$('#tpkMes').onchange=e=>goM(e.target.value);
  const keep=(id,k)=>{$(id).onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){TPK[k]=e.target.value;requestRender()}}};
  keep('#tpkXd','xd');keep('#tpkXs','xs');keep('#tpkXa','xa');keep('#tpkXb','xb');
  $('#tpkXdB').onclick=()=>tpxBajar('dia',TPK.xd,TPK.xd);
  $('#tpkXsB').onclick=()=>tpxBajar('semana',ws,we);
  $('#tpkXrB').onclick=()=>{const a=TPK.xa<=TPK.xb?TPK.xa:TPK.xb,b=TPK.xa<=TPK.xb?TPK.xb:TPK.xa;tpxBajar('rango',a,b)};
  $('#tpkList').onclick=e=>{const v=e.target.closest('[data-tpkv]');if(v){TPK.det=v.dataset.tpkv;requestRender();return}const x=e.target.closest('[data-tpkx]');if(x)tpxBajar('dia',x.dataset.tpkx,x.dataset.tpkx)}}

/* detalle de una publicación (cualquier versión) */
function tpkDetalle(main){const id=TPK.det;const d=TPUB.get(id);const f=id.split('_v')[0];
  const back=`<button class="ib" id="tpkBack">← Días publicados</button>`;
  if(!d){main.innerHTML=`<div class="scroll"><div class="wrap tp">${pageHead('Publicación',esc(toDia(f)),back)}<div class="callout" id="tpkLd">Cargando la publicación…</div></div></div>`;
    $('#tpkBack').onclick=()=>{TPK.det='';requestRender()};
    tpGet(id).then(x=>{if(TPK.det!==id)return;if(!x){TPK.det='';toast('No se encontró esa publicación.')}requestRender()}).catch(e=>{if(TPK.det===id){TPK.det='';toast('No se pudo leer la publicación: '+(e.code||e.message||e))}requestRender()});return}
  const I=TPK.idx.get(f)||(TPB.f===f?TPB.idx:null);const D=tpkDias().find(x=>x.f===f);const vig=I&&I.v!=null?+I.v:D?D.vig:+d.v;
  const vs=D?D.vers:[+d.v];const t=tpTot(d);const R=tpRows(d);const pcs=d.pcs||{};
  const used=new Set();for(const r of R)if(r.as===true)for(const[k,h]of Object.entries(r.h||{}))if(tpNum(h)>0)used.add(k);
  const P=[...used].map(k=>({id:k,...(pcs[k]||{}),cod:(pcs[k]&&pcs[k].cod)||(S.tpc&&S.tpc.get(k)?.cod)||k,nom:(pcs[k]&&pcs[k].nom)||(S.tpc&&S.tpc.get(k)?.nom)||''})).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const pres=R.filter(r=>r.as===true).sort(tpxCmp),aus=R.filter(r=>r.as!==true).sort(tpxCmp);
  const tot={};for(const r of pres)for(const p of P)tot[p.id]=tR2((tot[p.id]||0)+tpNum((r.h||{})[p.id]));
  const nm=r=>[r.ape,r.nom].filter(Boolean).join(' ')||r.dni;
  const am=new Map();for(const r of aus){const k=r.mot||'';if(!am.has(k))am.set(k,[]);am.get(k).push(r)}
  const exc=Object.entries(d.exc||{});
  const fu=Array.isArray(d.fuentes)?d.fuentes:[];
  main.innerHTML=`<div class="scroll"><div class="wrap tp">${pageHead(`Publicación del ${fmtD(f)}`,esc(toDia(f)),back)}
    <div class="tp-bar"><div class="tp-st"><span class="tp-vs" id="tpkVs">${vs.map(v=>`<button class="tp-ch${v===+d.v?' on':''}" data-tpkdv="${esc(tpId(f,v))}">v${v}${v===vig?' · vigente':' · sustituida'}</button>`).join('')}</span></div>
      <div class="tp-acts"><button class="ib pri" id="tpkXv"${TPK.busy?' disabled':''}>Excel de esta versión (v${esc(String(d.v))})</button></div></div>
    <div class="note tp-at" id="tpkMeta">Versión ${esc(String(d.v))}${+d.v===vig?' (vigente)':' (sustituida)'} · publicó ${esc(tpWho(d.by,d.byN))} · ${esc(tpAt(d.at))}${d.motivo?` · motivo: «${esc(d.motivo)}»`:''}${fu.length?` · ${fu.length} ${fu.length===1?'tareo':'tareos'}: ${esc(fu.map(x=>x.capN||tCapName(x.cap)||x.cap).join(', '))}`:''}</div>
    <div class="lqtiles tp-tiles"><div class="lqtile"><span>Obreros</span><b>${t.obreros}</b></div><div class="lqtile" style="--c:var(--ok)"><span>Vinieron</span><b>${t.pres}</b></div>
      <div class="lqtile" style="--c:var(--bad)"><span>No vinieron</span><b>${t.aus}</b><small>${tpPorMot(t.porMot)}</small></div><div class="lqtile" style="--c:var(--accent)"><span>HH</span><b>${toH(t.hh)}</b></div>
      <div class="lqtile" style="--c:var(--warn)"><span>Horas extra</span><b>${toH(t.he)}</b></div><div class="lqtile"><span>En altura</span><b>${t.alt}</b></div><div class="lqtile"><span>Sin tareo</span><b>${exc.length}</b><small>con excepción</small></div></div>
    ${d.dif!=null&&+d.v>1?`<details class="card tp-dd" open><summary>Diferencias con la v${esc(String(d.ant??d.v-1))}</summary>${tpDif(d.dif)}</details>`:''}
    <div class="card"><div class="tscroll tp-mx"><table class="t tp-mt" id="tpkMt"><thead><tr><th>N°</th><th>Obrero</th><th>DNI</th><th>Cuadrilla</th><th>Cat.</th>${P.map(p=>`<th class="t-r" title="${esc(p.nom)}"><span class="mono">${esc(p.cod)}</span></th>`).join('')}<th class="t-r">Total</th><th class="t-r">HE</th><th>(A)</th></tr></thead>
      <tbody>${pres.map((r,i)=>`<tr data-tpkd="${esc(r.dni)}"><td class="mono">${i+1}</td><td class="tp-nm">${esc(nm(r))}</td><td class="mono">${esc(r.dni)}</td><td>${esc(r.cua||'')}</td><td>${esc(r.cat||'')}</td>${P.map(p=>{const h=tpNum((r.h||{})[p.id]);return`<td class="mono t-r">${h?toH(h):''}</td>`}).join('')}<td class="mono t-r"><b>${toH(r.trab)}</b></td><td class="mono t-r">${tpNum(r.ext)?toH(r.ext):''}</td><td>${r.alt?'(A)':''}</td></tr>`).join('')||`<tr><td colspan="${8+P.length}" class="note">Nadie vino este día.</td></tr>`}</tbody>
      <tfoot><tr><td></td><td><b>Total</b></td><td></td><td></td><td></td>${P.map(p=>`<td class="mono t-r">${toH(tot[p.id])}</td>`).join('')}<td class="mono t-r"><b>${toH(t.hh)}</b></td><td class="mono t-r">${toH(t.he)}</td><td>${t.alt||''}</td></tr></tfoot></table></div></div>
    <div class="tp-two">
      <div class="card tp-aus" id="tpkAus"><div class="tp-bh"><b>No vinieron · ${aus.length}</b></div>${aus.length?`<ul class="tp-ul">${[...am].map(([k,L])=>`<li><b>${esc(k?k+' · '+(TO_MOT[k]||k):'Sin motivo')}</b> <span class="tp-n">${L.length}</span><div class="note">${L.map(r=>esc(nm(r))).join(', ')}</div></li>`).join('')}</ul>`:'<div class="note">Todos vinieron.</div>'}</div>
      <div class="card tp-exc" id="tpkExc"><div class="tp-bh"><b>Sin tareo con excepción · ${exc.length}</b></div>${exc.length?`<ul class="tp-ul">${exc.map(([dni,x])=>`<li><b>${esc([x&&x.ape,x&&x.nom].filter(Boolean).join(' ')||dni)}</b> <span class="mono note">${esc(dni)}</span><div class="note">${esc(x&&x.motivo||'')}</div></li>`).join('')}</ul>`:'<div class="note">Ninguno.</div>'}</div>
    </div></div></div>`;
  $('#tpkBack').onclick=()=>{TPK.det='';requestRender()};
  $('#tpkVs').onclick=e=>{const b=e.target.closest('[data-tpkdv]');if(b){TPK.det=b.dataset.tpkdv;requestRender()}};
  $('#tpkXv').onclick=()=>tpxBajar('dia',f,f,d)}

/* ======================================================================
   Excel de costos (xlsx-js-style, loadXlsx de exportes.js). Imita el archivo que hoy recibe costos (docs/ia/tareo.md):
   una hoja por día «dd.mm», «Resumen HH» y «Tareo Semana». Solo valores (sin fórmulas).
   ====================================================================== */
const TPX_DIA=['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
const TPX_L=['D','L','M','Mi','J','V','S'];
const tpxDm=f=>f.slice(8,10)+'.'+f.slice(5,7);
const tpxDmy=f=>tpxDm(f)+'.'+f.slice(0,4);
const tpxCmp=(a,b)=>String(a.ape||'').localeCompare(String(b.ape||''))||String(a.nom||'').localeCompare(String(b.nom||''))||String(a.dni).localeCompare(String(b.dni));
/* jornada del día: la de la publicación si la trae (jor o cfg), si no la configuración actual */
const tpxJor=(p,f)=>p&&typeof p.jor==='number'?p.jor:tJorDia({date:f,cfg:p&&p.cfg});
/* código de asistencia de una excepción (sin tareo con motivo) */
/* categoría como la escribe costos (sus SUMIF usan estas palabras) */
const TPX_CAT={OP:'Operario',OF:'Oficial',PE:'Peon',CA:'Capataz',OT:'Otro'};
const tpxCat=c=>TPX_CAT[c]||c||'';
/* UA de POWERS = la UA del tareo sin el «-NN» final (CD1010010-01 → CD1010010), como «Lista de partidas» de costos */
/* apellido paterno y materno separados (tApes de tareo.js), con la ficha del máster si coincide con el apellido publicado */
const tpxApes=o=>{const f=(S.tper&&S.tper.get(o.dni))||{};const ape=o.ape||f.ape||'';return typeof tApes==='function'?tApes({...f,ape}):[ape,'']};
/* «Semana 61 (del 19.10.2026 a 25.10.2026)» como el archivo de costos; sin número de semana configurado, solo el rango */
const tpxSemT=(a,b)=>{const n=typeof tSemN==='function'?tSemN(a):null;return`${n?'Semana '+n+' ':''}(del ${tpxDmy(a)} a ${tpxDmy(b)})`};
const tpxUaP=ua=>String(ua||'').replace(/-\d+$/,'');
const tpxExcCod=m=>/vacaci/i.test(m||'')?'VA':/m[eé]dic/i.test(m||'')?'DM':'EX';
function tpxSt(){const bd={style:'thin',color:{rgb:'A6A6A6'}};const B={top:bd,bottom:bd,left:bd,right:bd};const c={horizontal:'center',vertical:'center',wrapText:true};
  return{tit:{font:{bold:true,sz:14}},sub:{font:{bold:true}},hdr:{font:{bold:true},fill:{fgColor:{rgb:'92D050'}},alignment:c,border:B},
    pcn:{font:{sz:8},alignment:c,border:B},cod:{font:{bold:true,sz:9},alignment:{horizontal:'center'},border:B},yel:{font:{bold:true},fill:{fgColor:{rgb:'FFFF00'}}},
    txt:{border:B},num:{border:B,alignment:{horizontal:'center'}},numB:{font:{bold:true},border:B,alignment:{horizontal:'center'}},
    tot:{font:{bold:true},fill:{fgColor:{rgb:'F2F2F2'}},border:B,alignment:{horizontal:'center'}},pie:{font:{italic:true,sz:9,color:{rgb:'595959'}}}}}
/* hoja hecha a mano: set(fila, col, valor, estilo) con números como número (formato 0.0#) */
function tpxSheet(X){const ws={},M=[],RH=[];let mr=0,mc=0;
  return{set(r,c,v,s){let cell;if(v==null||v==='')cell={t:'s',v:''};else if(typeof v==='number'){cell={t:'n',v,z:Number.isInteger(v)?'0':'0.0#'}}else cell={t:'s',v:String(v)};if(s)cell.s=s;ws[X.utils.encode_cell({r,c})]=cell;if(r>mr)mr=r;if(c>mc)mc=c},
    merge(r1,c1,r2,c2){if(r2>r1||c2>c1)M.push({s:{r:r1,c:c1},e:{r:r2,c:c2}})},h(r,pt){RH[r]={hpt:pt}},
    done(cols,fr){ws['!ref']=X.utils.encode_range({s:{r:0,c:0},e:{r:mr,c:mc}});if(M.length)ws['!merges']=M;if(RH.length)ws['!rows']=RH;ws['!cols']=cols.map(w=>({wch:w}));
      if(fr){ws['!freeze']=fr;ws['!views']=[{state:'frozen',...fr}]}return ws}}}
/* partidas de la publicación (catálogo congelado), en orden numérico; más las que tengan horas y no estén en pcs */
function tpxPcs(p){const pcs=p.pcs||{};const ids=new Set(Object.keys(pcs));for(const r of tpRows(p))for(const k of Object.keys(r.h||{}))if(tpNum(r.h[k])>0)ids.add(k);
  return[...ids].map(k=>{const x=pcs[k]||{},c=(S.tpc&&S.tpc.get(k))||{};return{id:k,cod:x.cod||c.cod||k,nom:x.nom||c.nom||'',grp:x.grp||c.grp||String(x.cod||c.cod||'').split('.')[0],grpN:x.grpN||c.grpN||'',und:x.und||c.und||'',ua:x.ua||c.ua||''}}).sort((a,b)=>tCmpCod(a.cod,b.cod))}
/* obreros de una publicación: filas + excepciones (sin tareo con motivo) */
function tpxGente(p){const L=tpRows(p).map(r=>({...r}));const seen=new Set(L.map(r=>r.dni));
  for(const[dni,x]of Object.entries(p.exc||{}))if(!seen.has(dni)){const f=(S.tper&&S.tper.get(dni))||{};/* la excepción no guarda categoría ni cuadrilla: las de la ficha */
    L.push({dni,ape:x&&x.ape||f.ape||'',nom:x&&x.nom||f.nom||'',cat:x&&x.cat||f.cat||'',cua:x&&x.cua||f.cua||'',as:false,exc:x&&x.motivo||'Sin tareo'})}
  return L.sort(tpxCmp)}
const tpxPie=p=>`Versión publicada v${p.v} · publicó ${tpWho(p.by,p.byN)} · ${tpAt(p.at)}${p.motivo?' · rectificación: '+p.motivo:''}`;
/* hoja de un día. G (opcional): la gente de toda la semana, en el mismo orden en todas las hojas (como el archivo de costos,
   donde cada fila es la misma persona en todos los días); si no, la del día. Debajo del TOTAL van las filas que usa costos:
   HH por categoría (Operario / Oficial / Peon), UA (cuenta del tareo) y UA POWERS de cada partida, y la tabla de HH por UA POWERS
   y categoría (20-10-2026, a partir del archivo semana_01.10.26.xlsx). */
function tpxWsDia(X,p,G0){const S0=tpxSt(),sh=tpxSheet(X),f=p.fecha||String(p.id||'').split('_v')[0];const pcs=tpxPcs(p),jor=tpxJor(p,f);
  const D=new Map(tpxGente(p).map(r=>[r.dni,r]));const G=G0?G0.map(o=>D.get(o.dni)||{...o,as:null,h:{},trab:0,ext:0,alt:false,mot:'',exc:'',fuera:true}):[...D.values()];
  const c0=5,cT=c0+pcs.length,cE=cT+1,cB=cT+2,cO=cT+3;
  sh.set(0,1,tpProj(),S0.tit);sh.set(0,4,'TAREO DIARIO DE PERSONAL OBRERO',S0.sub);sh.set(0,cO,'DM = DESCANSO MÉDICO',S0.yel);
  sh.set(1,1,'FECHA',S0.sub);sh.set(1,2,`${TPX_DIA[pd(f).getUTCDay()]} ${tpxDmy(f)}`,S0.sub);sh.set(1,4,`${typeof tSemN==='function'&&tSemN(f)?'Semana '+tSemN(f)+' · ':''}Versión publicada v${p.v}`,S0.sub);sh.set(1,cO,'(A) = BONO POR TRABAJO EN ALTURA',S0.yel);
  let i=0;while(i<pcs.length){let j=i;while(j+1<pcs.length&&pcs[j+1].grp===pcs[i].grp)j++;for(let k=i;k<=j;k++)sh.set(2,c0+k,k===i?(pcs[i].grpN||('GRUPO '+pcs[i].grp)).toUpperCase():'',S0.hdr);sh.merge(2,c0+i,2,c0+j);i=j+1}
  sh.set(3,4,'PARTIDAS',S0.sub);sh.set(4,4,'Código',S0.sub);
  pcs.forEach((x,k)=>{sh.set(3,c0+k,x.nom,S0.pcn);sh.set(4,c0+k,x.cod,S0.cod);sh.set(5,c0+k,'hrs',S0.hdr)});
  [[cT,'HORAS TOTALES'],[cE,`HORAS EXTRAS\n(jornada ${String(jor).replace('.',',')} h)`],[cB,'BONOS'],[cO,'MOTIVO / OBSERVACIÓN']].forEach(([c,l])=>{sh.set(2,c,l,S0.hdr);sh.set(3,c,'',S0.hdr);sh.set(4,c,'',S0.hdr);sh.merge(2,c,4,c)});
  sh.set(5,cT,'hrs',S0.hdr);sh.set(5,cE,'hrs',S0.hdr);sh.set(5,cB,'(A)',S0.hdr);sh.set(5,cO,'',S0.hdr);
  ['N°','Personal Obrero','CUADRILLA','DNI','Categoría'].forEach((l,c)=>sh.set(5,c,l,S0.hdr));
  sh.h(3,64);sh.h(2,30);
  const CATS=['Operario','Oficial','Peon'];const tot=pcs.map(()=>0);const byC=CATS.map(()=>pcs.map(()=>0));let tT=0,tE=0,tA=0;
  G.forEach((r,n)=>{const R=6+n;const pres=r.as===true;const cat=tpxCat(r.cat);const ci=CATS.indexOf(cat);
    sh.set(R,0,n+1,S0.num);sh.set(R,1,[r.ape,r.nom].filter(Boolean).join(' '),S0.txt);sh.set(R,2,r.cua||'',S0.txt);sh.set(R,3,String(r.dni),S0.num);sh.set(R,4,cat,S0.num);
    pcs.forEach((x,k)=>{const h=pres?tpNum((r.h||{})[x.id]):0;sh.set(R,c0+k,h||'',S0.numB);if(h){tot[k]+=h;if(ci>=0)byC[ci][k]+=h}});
    const tr=pres?tpNum(r.trab!=null?r.trab:tHrsSum(r.h)):0,te=pres?tpNum(r.ext):0;tT+=tr;tE+=te;if(pres&&r.alt)tA++;
    sh.set(R,cT,pres?tR2(tr):'',S0.numB);sh.set(R,cE,pres?tR2(te):'',S0.num);sh.set(R,cB,pres&&r.alt?'(A)':'',pres&&r.alt?{...S0.num,...S0.yel}:S0.num);
    sh.set(R,cO,r.fuera?'No figura este día':r.exc?`Sin tareo: ${r.exc}`:pres?'':r.mot?`${r.mot} · ${TO_MOT[r.mot]||''}`.replace(/ · $/,''):r.as===false?'No vino':'Sin marcar',S0.txt)});
  const RT=6+G.length;sh.set(RT,1,'TOTAL',S0.tot);for(let c=0;c<5;c++)if(c!==1)sh.set(RT,c,'',S0.tot);pcs.forEach((x,k)=>sh.set(RT,c0+k,tot[k]?tR2(tot[k]):'',S0.tot));
  sh.set(RT,cT,tR2(tT),S0.tot);sh.set(RT,cE,tR2(tE),S0.tot);sh.set(RT,cB,tA||'',S0.tot);sh.set(RT,cO,'',S0.tot);
  /* HH por categoría, UA y UA POWERS de cada partida */
  CATS.forEach((c,ci)=>{const R=RT+1+ci;sh.set(R,4,c,S0.sub);pcs.forEach((x,k)=>sh.set(R,c0+k,byC[ci][k]?tR2(byC[ci][k]):'',S0.num));sh.set(R,cT,tR2(byC[ci].reduce((a,b)=>a+b,0)),S0.numB)});
  const RU=RT+4;sh.set(RU,4,'UA',S0.sub);sh.set(RU+1,4,'UA POWERS',S0.sub);
  pcs.forEach((x,k)=>{sh.set(RU,c0+k,x.ua||'',S0.pcn);sh.set(RU+1,c0+k,tpxUaP(x.ua),S0.pcn)});
  const sC=tR2(byC.flat().reduce((a,b)=>a+b,0));sh.set(RU,cT,sC===tR2(tT)?'ok':`revisar: categorías ${sC} ≠ total ${tR2(tT)}`,S0.sub);
  /* HH por UA POWERS y categoría (lo que costos arma con SUMIF debajo de la hoja) */
  const UA=new Map();pcs.forEach((x,k)=>{const u=tpxUaP(x.ua)||'(sin UA)';const o=UA.get(u)||{u,cod:[],h:CATS.map(()=>0)};o.cod.push(x.cod);CATS.forEach((c,ci)=>{o.h[ci]+=byC[ci][k]});UA.set(u,o)});
  const RA=RU+3;sh.set(RA,0,"UA'S",S0.hdr);sh.set(RA,1,'PARTIDAS',S0.hdr);CATS.forEach((c,ci)=>sh.set(RA,2+ci,c,S0.hdr));sh.set(RA,5,'TOTAL',S0.hdr);
  const UL=[...UA.values()].filter(o=>o.h.some(v=>v)).sort((a,b)=>a.u.localeCompare(b.u));
  UL.forEach((o,n)=>{const R=RA+1+n;sh.set(R,0,o.u,S0.txt);sh.set(R,1,o.cod.join(', '),S0.txt);o.h.forEach((v,ci)=>sh.set(R,2+ci,v?tR2(v):'',S0.num));sh.set(R,5,tR2(o.h.reduce((a,b)=>a+b,0)),S0.numB)});
  const RS=RA+1+UL.length;sh.set(RS,0,'TOTAL',S0.tot);sh.set(RS,1,'',S0.tot);CATS.forEach((c,ci)=>sh.set(RS,2+ci,tR2(byC[ci].reduce((a,b)=>a+b,0)),S0.tot));sh.set(RS,5,sC,S0.tot);
  sh.set(RS+2,1,tpxPie(p),S0.pie);
  return sh.done([5,34,15,11,10,...pcs.map(()=>7),9,11,7,26],{xSplit:5,ySplit:6})}
const tHrsSum=h=>tR2(Object.values(h||{}).reduce((s,v)=>s+(tpNum(v)>0?tpNum(v):0),0));
/* obreros de varios días (unión), con su último dato */
function tpxUnion(days,PB){const M=new Map();for(const f of days){const p=PB.get(f);if(!p)continue;for(const r of tpxGente(p))M.set(r.dni,{...(M.get(r.dni)||{}),...r})}return[...M.values()].sort(tpxCmp)}
const tpxRango=(a,b)=>a===b?tpxDmy(a):`del ${tpxDmy(a)} al ${tpxDmy(b)}`;
/* «Resumen HH»: HH y HE por obrero y día; TOTAL HH, HN y HE */
/* H60 / H100 (20-10-2026, el dueño): por día, las 2 primeras horas extra al 60 % y el resto al 100 % (construcción civil) */
const tpxH60=e=>Math.min(2,Math.max(0,e));
function tpxWsRes(X,days,PB,sem){const S0=tpxSt(),sh=tpxSheet(X);const G=tpxUnion(days,PB);const n=days.length,cTot=4+2*n;
  sh.set(0,1,tpProj().toUpperCase(),S0.tit);sh.set(1,1,sem?tpxSemT(days[0],days[n-1]):`Resumen de HH ${tpxRango(days[0],days[n-1])}`,S0.sub);
  days.forEach((f,i)=>{const c=4+2*i;const p=PB.get(f);sh.set(2,c,TPX_DIA[pd(f).getUTCDay()]+(p?'':' (sin publicar)'),S0.hdr);sh.set(2,c+1,'',S0.hdr);sh.merge(2,c,2,c+1);sh.set(3,c,tpxDm(f),S0.hdr);sh.set(3,c+1,'HE',S0.hdr)});
  ['N°','PERSONAL OBRERO','DNI','CATEGORIA'].forEach((l,c)=>sh.set(3,c,l,S0.hdr));[['TOTAL HH',0],['HN',1],['HE',2],['H60',3],['H100',4]].forEach(([l,k])=>sh.set(3,cTot+k,l,S0.hdr));
  const TD0=days.map(()=>[0,0]);let A=0,B=0,A6=0,A1=0;
  G.forEach((o,j)=>{const R=4+j;let hh=0,he=0,h6=0;sh.set(R,0,j+1,S0.num);sh.set(R,1,[o.ape,o.nom].filter(Boolean).join(' '),S0.txt);sh.set(R,2,String(o.dni),S0.num);sh.set(R,3,tpxCat(o.cat),S0.num);
    days.forEach((f,i)=>{const p=PB.get(f);const r=p?tpRows(p).find(x=>x.dni===o.dni):null;const ok=r&&r.as===true;const t=ok?tpNum(r.trab):0,e=ok?tpNum(r.ext):0;
      sh.set(R,4+2*i,p?(ok?tR2(t):0):'',S0.num);sh.set(R,5+2*i,p?(ok?tR2(e):0):'',S0.num);hh+=t;he+=e;h6+=tpxH60(e);TD0[i][0]+=t;TD0[i][1]+=e});
    sh.set(R,cTot,tR2(hh),S0.numB);sh.set(R,cTot+1,tR2(hh-he),S0.num);sh.set(R,cTot+2,tR2(he),S0.num);sh.set(R,cTot+3,tR2(h6),S0.num);sh.set(R,cTot+4,tR2(he-h6),S0.num);A+=hh;B+=he;A6+=h6;A1+=he-h6});
  const RT=4+G.length;sh.set(RT,1,'TOTAL',S0.tot);[0,2,3].forEach(c=>sh.set(RT,c,'',S0.tot));days.forEach((f,i)=>{sh.set(RT,4+2*i,tR2(TD0[i][0]),S0.tot);sh.set(RT,5+2*i,tR2(TD0[i][1]),S0.tot)});
  sh.set(RT,cTot,tR2(A),S0.tot);sh.set(RT,cTot+1,tR2(A-B),S0.tot);sh.set(RT,cTot+2,tR2(B),S0.tot);sh.set(RT,cTot+3,tR2(A6),S0.tot);sh.set(RT,cTot+4,tR2(A1),S0.tot);
  sh.set(RT+1,1,'H60 = las 2 primeras horas extra de cada día (al 60 %) · H100 = las siguientes (al 100 %)',S0.pie);
  sh.set(RT+2,1,'Versiones publicadas: '+days.filter(f=>PB.get(f)).map(f=>{const p=PB.get(f);return`${tpxDm(f)} v${p.v} (${tpWho(p.by,p.byN)} · ${tpAt(p.at)})`}).join(' · '),S0.pie);
  return sh.done([5,36,11,10,...days.flatMap(()=>[8,6]),10,9,9,9,9],{xSplit:4,ySplit:4})}
/* «Tareo Semana»: asistencia (A / I / código), horas extra y horas de descanso médico (DM = jornada del día) por día */
function tpxWsAsis(X,days,PB,sem){const S0=tpxSt(),sh=tpxSheet(X);const G=tpxUnion(days,PB);const n=days.length;const cA=7,cH=cA+n+1,cD=cH+n+2;
  sh.set(0,1,tpProj().toUpperCase(),S0.tit);sh.set(1,1,sem?'Tareo '+tpxSemT(days[0],days[n-1]):`Tareo ${tpxRango(days[0],days[n-1])}`,S0.sub);
  [[cA,'ASISTENCIA',n],[cH,'HORAS EXTRAS',n+1],[cD,'HORAS DESCANSO MÉDICO',n+1]].forEach(([c,l,k])=>{for(let i=0;i<k;i++)sh.set(2,c+i,i?'':l,S0.hdr);sh.merge(2,c,2,c+k-1)});
  days.forEach((f,i)=>{const l=TPX_L[pd(f).getUTCDay()];[cA,cH,cD].forEach(c=>{sh.set(3,c+i,l,S0.hdr);sh.set(4,c+i,tpxDm(f),S0.hdr)})});
  [cH,cD].forEach(c=>{sh.set(3,c+n,'PARCIAL',S0.hdr);sh.set(4,c+n,'',S0.hdr)});
  ['N°','DNI','Apellido Paterno','Apellido Materno','Nombres','Categoría','Cuadrilla'].forEach((l,c)=>{sh.set(3,c,'',S0.hdr);sh.set(4,c,l,S0.hdr)});
  G.forEach((o,j)=>{const R=5+j;let sh1=0,sd=0;const ap=tpxApes(o);sh.set(R,0,j+1,S0.num);sh.set(R,1,String(o.dni),S0.num);sh.set(R,2,ap[0],S0.txt);sh.set(R,3,ap[1],S0.txt);sh.set(R,4,o.nom||'',S0.txt);sh.set(R,5,tpxCat(o.cat),S0.num);sh.set(R,6,o.cua||'',S0.txt);
    days.forEach((f,i)=>{const p=PB.get(f);let cod='',he='',dm='';
      if(p){const jor=tpxJor(p,f);const r=tpRows(p).find(x=>x.dni===o.dni);const ex=!r&&p.exc&&p.exc[o.dni];
        if(r&&r.as===true){const t=tpNum(r.trab);cod=jor>0&&t<jor?'I':'A';he=tR2(tpNum(r.ext))}else if(r){cod=r.mot||(r.as===false?'NV':'?');he=0}else if(ex){cod=tpxExcCod(ex.motivo);he=0}
        if(cod==='DM'){dm=jor}else if(cod)dm=0}
      else if(tNoLab(f))cod='D';/* día no laborable sin tareo: descanso (como el archivo de costos) */
      sh.set(R,cA+i,cod,cod&&cod!=='A'?{...S0.numB,font:{bold:true,color:{rgb:'C00000'}}}:S0.numB);sh.set(R,cH+i,he,S0.num);sh.set(R,cD+i,dm,S0.num);sh1+=tpNum(he);sd+=tpNum(dm)});
    sh.set(R,cH+n,tR2(sh1),S0.numB);sh.set(R,cD+n,tR2(sd),S0.numB)});
  const RL=5+G.length+1;
  sh.set(RL,1,'A = asistió la jornada completa · I = asistió menos que la jornada · DM = descanso médico · DA = descanso por accidente · VA = vacaciones · FA = falta · SU = suspensión · SM = subsidio por maternidad · SE = subsidio por enfermedad · LS = licencia sin goce · L = liquidado · NV = no vino (sin motivo) · EX = sin tareo con excepción (ver motivo en la hoja del día) · D = descanso (día no laborable)',S0.pie);
  sh.set(RL+1,1,'Horas de descanso médico = jornada del día (lunes a viernes y sábado según la configuración del tareo).',S0.pie);
  return sh.done([5,11,16,16,22,9,15,...days.map(()=>5),2,...days.map(()=>5),8,2,...days.map(()=>5),8],{xSplit:7,ySplit:5})}
/* «Personal Obrero»: la gente del periodo con su ficha (como la hoja de costos): N°, apellidos, nombres, cuadrilla, categoría, DNI,
   puesto y capataz */
function tpxWsPer(X,G){const S0=tpxSt(),sh=tpxSheet(X);sh.set(0,1,'RELACION DE PERSONAL OBRERO',S0.tit);
  ['N°','APELLIDO PATERNO','APELLIDO MATERNO','NOMBRES','CUADRILLA','CATEGORIA','DNI','PUESTO','CAPATAZ'].forEach((l,c)=>sh.set(2,c,l,S0.hdr));
  G.forEach((o,j)=>{const R=3+j;const f=(S.tper&&S.tper.get(o.dni))||{};const ap=tpxApes(o);sh.set(R,0,j+1,S0.num);sh.set(R,1,ap[0],S0.txt);sh.set(R,2,ap[1],S0.txt);sh.set(R,3,o.nom||f.nom||'',S0.txt);sh.set(R,4,o.cua||f.cua||'',S0.txt);
    sh.set(R,5,tpxCat(o.cat||f.cat),S0.num);sh.set(R,6,String(o.dni),S0.num);sh.set(R,7,f.pue||'',S0.txt);sh.set(R,8,o.capN||(f.cap&&typeof tCapName==='function'?tCapName(f.cap):'')||'',S0.txt)});
  return sh.done([5,18,18,22,15,10,11,26,22],{xSplit:0,ySplit:3})}
/* «Lista de partidas»: el catálogo de la publicación por grupo, con und, metrado y HH del presupuesto meta, ratio, UA - TAREO y
   UA - POWERS (como la hoja de costos) */
function tpxWsPcs(X,PB){const S0=tpxSt(),sh=tpxSheet(X);const M=new Map();for(const p of PB.values())for(const x of tpxPcs(p))if(!M.has(x.id))M.set(x.id,x);
  const L=[...M.values()].sort((a,b)=>tCmpCod(a.cod,b.cod));
  sh.set(0,1,'PARTIDAS DEL PRESUPUESTO',S0.tit);sh.set(1,4,'PRESUPUESTO META',S0.hdr);sh.set(1,5,'',S0.hdr);sh.set(1,6,'',S0.hdr);sh.merge(1,4,1,6);
  ['','CÓDIGO','DESCRIPCIÓN','und','Metrado','HH','Ratio','UA - TAREO','UA - POWERS'].forEach((l,c)=>c&&sh.set(2,c,l,S0.hdr));
  let R=3,g=null;for(const x of L){const c=(S.tpc&&S.tpc.get(x.id))||{};
    if(x.grp!==g){g=x.grp;sh.set(R,1,x.grp,S0.sub);sh.set(R,2,(x.grpN||'').toUpperCase(),S0.sub);R++}
    const met=tpNum(c.met),hh=tpNum(c.hhp);sh.set(R,1,x.cod,S0.num);sh.set(R,2,x.nom,S0.txt);sh.set(R,3,x.und||c.und||'',S0.num);sh.set(R,4,met||'',S0.num);sh.set(R,5,hh?tR2(hh):'',S0.num);
    sh.set(R,6,met&&hh?tR2(hh/met):'',S0.num);sh.set(R,7,x.ua||'',S0.txt);sh.set(R,8,tpxUaP(x.ua),S0.txt);R++}
  return sh.done([3,9,44,7,10,10,10,16,13],{xSplit:0,ySplit:3})}
/* publicaciones vigentes de un periodo (tpubidx → tpub/{fecha}_v{vigente}) */
/* las versiones se leen a la vez, no día por día (auditoría de código 08/10, M11); el orden del resultado no cambia */
async function tpxVigentes(a,b){const sn=await fcol('tpubidx').where('fecha','>=',a).where('fecha','<=',b).get();
  const R=await Promise.all(sn.docs.map(async x=>{const I=x.data()||{};const f=I.fecha||x.id;if(f<a||f>b||I.v==null)return null;const p=await tpGet(tpId(f,I.v));return p?{...p,fecha:p.fecha||f}:null}));
  return new Map(R.filter(Boolean).map(p=>[p.fecha,p]))}
/* arma y descarga el Excel: 'dia' (una hoja), 'semana' o 'rango' (Resumen HH + Tareo Semana + una hoja por día publicado). doc: versión elegida */
async function tpxBajar(tipo,a,b,doc){if(TPK.busy)return;if(tipo==='rango'&&tpDates(a,b).length>62){toast('Elige un rango de hasta 62 días.');return}
  TPK.busy='x';requestRender();
  try{await loadXlsx();const X=window.XLSX;const PB=doc?new Map([[a,doc]]):await tpxVigentes(a,b);
    if(!PB.size){toast(tipo==='dia'?`El ${fmtD(a)} no tiene tareo publicado.`:'No hay días publicados en ese periodo.');return}
    const wb=X.utils.book_new();const days=tpDates(a,b);
    /* orden de hojas del archivo de costos: Personal Obrero, Lista de partidas, Tareo Semana, Resumen HH y una hoja por día;
       en todas, la misma gente y en el mismo orden */
    const G=tipo==='dia'?null:tpxUnion(days,PB);
    if(tipo!=='dia'){X.utils.book_append_sheet(wb,tpxWsPer(X,G),'Personal Obrero');X.utils.book_append_sheet(wb,tpxWsPcs(X,PB),'Lista de partidas');
      X.utils.book_append_sheet(wb,tpxWsAsis(X,days,PB,tipo==='semana'),tipo==='semana'?'Tareo Semana':'Tareo Rango');X.utils.book_append_sheet(wb,tpxWsRes(X,days,PB,tipo==='semana'),'Resumen HH')}
    for(const f of days){const p=PB.get(f);if(p)X.utils.book_append_sheet(wb,tpxWsDia(X,p,G),tpxDm(f))}
    const pre=(P().code||'').trim();const name=tipo==='dia'?`Tareo_${a}_v${PB.get(a).v}.xlsx`:tipo==='semana'?`Tareo_semana_${a}_al_${b}.xlsx`:`Tareo_${a}_al_${b}.xlsx`;
    saveBlob((pre?pre+'_':'')+name,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel del tareo generado')}
  catch(e){console.error(e);toast('No se pudo armar el Excel: '+(e&&(e.code||e.message)||e))}
  finally{TPK.busy='';requestRender()}}
