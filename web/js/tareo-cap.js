"use strict";
/* LPS 911 · Módulo Tareo (fase 1): pantalla del capataz del tareo (rol `tcap`) en el celular.
   Contrato en docs/ia/tareo.md («Contrato de F1» y «Mejoras del capataz (oct 2026)»). Tres pasos: ¿quién vino? · ¿en qué
   trabajaron? · revisar y enviar. Asistencia explícita (Vino / No vino, nadie marcado al empezar), atajos de horario, cruces
   con opciones de un toque y línea de tiempo por obrero. Guarda el borrador solo (≈1 s después del último cambio) en
   tareo/{fecha}_{capId}; con la persistencia de Firestore funciona sin señal. Los cálculos (tBlqH, tCalc, tValida) son de tareo.js.
   Auditoría F2 («Correcciones de la auditoría F2 — capataz»): la foto cuenta solo cuando el servidor confirmó su escritura
   (TCS.fp: subiendo / pendiente / falló), «Enviado ✓» solo confirmado, aviso «Por corregir» con los reabiertos de cualquier fecha.
   Segunda auditoría («Correcciones de la segunda auditoría — capataz»): jornada y no laborable desde doc.cfg/tCfgDia, envN,
   contadores vinieron/no vinieron/sin marcar, nombres identificables, buscador y filtros, foto arriba y días enviados en solo lectura.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* motivos de ausencia (el más común primero) */
const TC_MOT=[['FA','Falta'],['DM','Descanso médico'],['VA','Vacaciones'],['DA','Descanso por accidente'],['SU','Suspensión'],['SE','Subsidio por enfermedad'],['SM','Subsidio por maternidad'],['LS','Licencia sin goce'],['L','Liquidado']];
const TC_RO=['env','rev','pub'];
/* estado de la pantalla (no va en U: es del día que se está llenando) */
const TCS={date:'',cap:'',unsub:null,doc:null,loaded:false,exists:false,step:1,dirty:false,saveT:0,inflight:0,pend:false,err:'',slowT:0,
  ed:null,edMsg:'',pcQ:'',addOn:false,addQ:'',past:{},prev:null,img:{},imgReq:{},busy:false,need:false,cx:null,foc:'',
  /* fotos aún no confirmadas por el servidor: {id: {n, st:'up'|'pend'|'err', msg, mem}} (no están en doc.foto hasta confirmarse) */
  fp:{},
  /* envío: '' · 'sending' (esperando al servidor) · 'queued' (sin señal: se enviará solo) · 'ok'; srvPend = la última foto de la base tiene escrituras pendientes */
  sendSt:'',sendT:0,srvPend:false,
  /* tareos propios reabiertos (cualquier fecha): [{date, mot}] */
  reabL:[],rsub:null,rcap:'',
  /* buscador y filtro de la cuadrilla (paso 1: all · sin · no) y del «¿Quiénes?» del editor (all · lib · sel); no cambian datos */
  q1:'',f1:'all',q2:'',f2:'all',lbl:null,fotoHi:false};
/* el servidor rechaza fotos de más de 1 000 000 de caracteres (firestore.rules); se mide igual, con margen */
const TC_FMAX=950000;

const tcCalc=d=>tCalc(d);
const tcBH=(f,a,b)=>tBlqH(f,a,b,(TCS.doc&&TCS.doc.cfg)||undefined);

/* ---------- utilidades ---------- */
/** id del capataz en members: correo, o 'u_<uid>' si entró con enlace (base.js arma me.email así) */
/* «Ver como» Capataz (tareo) con un capataz elegido (solo copia de prueba): se ve su cuadrilla y su tareo; se guarda con el usuario real (admin) */
const tcMe=()=>(typeof VA!=='undefined'&&VA&&VA.role==='tcap'&&VA.cap)?VA.cap:(typeof myMid==='function'?myMid():((me&&me.email)||''));
const tcId=(d,c)=>d+'_'+c;
const tcHM=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
/** hora para leer: '07:30' → '7:30' */
const tcT=s=>String(s||'').replace(/^0(\d)/,'$1');
const tcH=v=>{v=tR2(+v||0);return(Number.isInteger(v)?String(v):v.toLocaleString('es-PE',{maximumFractionDigits:2}))+' h'};
const tcDay=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const TC_DN=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const tcNm=r=>[r.ape,r.nom].filter(Boolean).join(', ');
const tcShort=r=>{const a=String(r.ape||'').split(' ')[0]||'',n=String(r.nom||'').split(' ')[0]||'';return(n?n.charAt(0)+n.slice(1).toLowerCase()+' ':'')+(a?a.charAt(0)+a.slice(1).toLowerCase():'')};
/* nombres identificables (auditoría 2, UX2): si dos obreros del tareo darían la misma abreviatura se agrega el apellido completo
   (segundo apellido) y, si aún coinciden, «·DNI ###» (últimos 3 dígitos). TCS.lbl se arma en cada tcHtml. */
const tcCap1=s=>String(s||'').toLowerCase().replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toUpperCase());
function tcLabels(R){R=R||{};const L=new Map(),F=new Map();const ds=Object.keys(R);
  const cnt=f=>{const m=new Map();for(const d of ds){const k=f(d);m.set(k,(m.get(k)||0)+1)}return m};
  const s1=d=>tcShort(R[d]),s2=d=>{const r=R[d];const n=String(r.nom||'').split(' ')[0]||'';return(n?tcCap1(n)+' ':'')+tcCap1(r.ape||'')},s3=d=>tcNm(R[d]);
  const c1=cnt(s1),c2=cnt(s2),c3=cnt(s3);const tail=d=>' ·DNI '+String(d).slice(-3);
  for(const d of ds){let l=s1(d);if(c1.get(l)>1){l=s2(d);if(c2.get(l)>1)l+=tail(d)}L.set(d,l);F.set(d,(s3(d)||d)+(c3.get(s3(d))>1?tail(d):''))}
  return{L,F,dup:new Set(ds.filter(d=>c1.get(s1(d))>1))}}
/** abreviatura identificable y nombre completo (con DNI si se repite) de un obrero del tareo abierto */
const tcSN=d=>{const x=TCS.lbl&&TCS.lbl.L.get(d);if(x)return x;const r=TCS.doc&&TCS.doc.rows&&TCS.doc.rows[d];return r?tcShort(r):d};
const tcFN=d=>{const x=TCS.lbl&&TCS.lbl.F.get(d);if(x)return x;const r=TCS.doc&&TCS.doc.rows&&TCS.doc.rows[d];return r?tcNm(r):d};
/** nombre tocable: al tocarlo muestra el nombre completo y el DNI (no depende del mouse) */
const tcNmT=(d,txt)=>`<span class="tc-nmt" role="button" tabindex="0" data-tcnm="${esc(d)}" title="${esc(tcFN(d))}">${esc(txt==null?tcSN(d):txt)}</span>`;
const tcRO=()=>!!(TCS.doc&&TC_RO.includes(TCS.doc.st));
/* asistencia: as true = vino · false = no vino · null/ausente = sin marcar */
const tcVino=r=>!!r&&r.as===true;
const tcFalto=r=>!!r&&r.as===false;
const tcSinM=r=>!!r&&r.as!==true&&r.as!==false;
/** intervalo [ini, fin] en minutos de un bloque (null si no vale) y si dos se cruzan */
const tcIv=k=>{const a=tMin(k&&k.ini),b=tMin(k&&k.fin);return a!=null&&b!=null&&b>a?[a,b]:null};
const tcOv=(p,q)=>!!(p&&q&&p[0]<q[1]&&q[0]<p[1]);
/** configuración del día: la congelada en el tareo (doc.cfg) si la tiene; si no, la actual (tCfgDia). Es la misma que usa tCalc. */
function tcCfg(date){const D=TCS.doc;return D&&date===TCS.date&&D.cfg&&D.cfg.v===1?D.cfg:tCfgDia(date)}
/** jornada del día y atajos (auditoría 2, A5): derivan de tDia con la misma configuración que tCalc (feriado, domingo, doc.cfg).
    nl = no laborable (todo cuenta como extra): h = 0 y los atajos son solo un horario sugerido (la jornada de lunes si ese día no tiene). */
function tcJor(date){const c=tcCfg(date);const Dd=tDia(date,c);const T=TC();
  const j=Dd.j||(c.jor&&c.jor.ini&&c.jor.fin?c.jor:null)||T.jor['1']||{ini:'07:30',fin:'17:00',ref:60};
  const ri=Dd.rw?Dd.rw[0]:null,ref=Dd.rw?Dd.rw[1]-Dd.rw[0]:0;const rI=ri!=null?tcHM(ri):'';const a=tMin(j.ini),b=tMin(j.fin);const S={todo:[j.ini,j.fin]};
  if(ri!=null&&ri>a&&ri<b){S.man=[j.ini,rI];const t=ri+ref;if(t<b)S.tar=[tcHM(t),j.fin]}
  return{j,h:Dd.jh,nl:Dd.nl,S,ri,ref}}
/** por qué el día es no laborable: feriado (con su nombre) o día sin jornada (domingo) */
function tcNlWhy(date){const c=tcCfg(date);if(c.fer){const n=(TC().ferN||{})[date];return`Feriado${n?': '+n:''}.`}
  return`${TC_DN[pd(date).getUTCDay()]}: sin jornada ordinaria.`}
/** cuadrilla: activos del máster con cap == mi id */
function tcCrew(date){const cap=TCS.cap;return[...S.tper.values()].filter(p=>p&&!p.arch&&p.cap===cap&&tActivo(p,date))}
const tcRowOf=(p,as=null)=>({ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as,mot:'',alt:false,ini:'',fin:'',h:{},trab:0,ext:0});
function tcNewDoc(date){const rows={};for(const p of tcCrew(date))rows[p.dni||p.id]=tcRowOf(p);
  return{date,cap:TCS.cap,capN:(MEM.get(TCS.cap)||{}).name||'',st:'bor',rows,blq:[],foto:[],hist:[]}}
/** filas ordenadas por apellido */
function tcRows(){const R=(TCS.doc&&TCS.doc.rows)||{};return Object.entries(R).sort((a,b)=>(a[1].ape||'').localeCompare(b[1].ape||'')||a[0].localeCompare(b[0]))}
const tcPres=()=>tcRows().filter(([,r])=>tcVino(r));
/* partidas más usadas por este capataz (contador en el equipo; si no hay almacenamiento, sin orden especial) */
const tcUseK=()=>'lps.tcpc.'+TCS.cap;
function tcUse(){try{return JSON.parse(localStorage.getItem(tcUseK())||'{}')||{}}catch(e){return{}}}
function tcUseAdd(pc){try{const u=tcUse();u[pc]=(u[pc]||0)+1;localStorage.setItem(tcUseK(),JSON.stringify(u))}catch(e){}}
/** partidas que se pueden elegir: activas y no bloqueadas por costos */
function tcPcs(){return[...S.tpc.values()].filter(x=>x&&!x.arch&&x.act!==false&&x.bloq!==true)}
const tcBloq=id=>{const x=id&&S.tpc.get(id);return!!(x&&x.bloq===true)};
const tcPcName=id=>{const x=S.tpc.get(id);return x?`${x.cod} · ${x.nom}`:'(partida '+id+')'};
const tcPcCod=id=>{const x=id&&S.tpc.get(id);return x?x.cod:(id||'sin partida')};
/* color por partida (tono; la luz va en CSS para el modo oscuro). Sin rojo: el rojo es de los cruces. */
const TC_HUE=[210,35,150,275,185,55,320,95,250,125];
function tcHue(D,pc){const L=[];for(const k of(D.blq||[]))if(k.pc&&!L.includes(k.pc))L.push(k.pc);const i=L.indexOf(pc);return TC_HUE[(i<0?0:i)%TC_HUE.length]}

/** cruces entre bloques de los que vinieron: [{dni, a, b}] (a empieza primero) */
function tcCruces(D){const out=[];const B=(D.blq||[]).filter(k=>tcIv(k));
  for(const[dni,r]of tcRows()){if(!tcVino(r))continue;const L=B.filter(k=>(k.dnis||[]).includes(dni)).sort((x,y)=>tcIv(x)[0]-tcIv(y)[0]||tcIv(x)[1]-tcIv(y)[1]);
    for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++)if(tcOv(tcIv(L[i]),tcIv(L[j])))out.push({dni,a:L[i].id,b:L[j].id})}
  return out}
/** problemas para enviar: tValida (sin «falto»: un ausente puede seguir en sus bloques con 0 h) + sin marcar + partida bloqueada.
    El motivo de «no vino» es opcional (observaciones del dueño, oct 2026). */
function tcErrs(D){
  const E=tValida(tcCalc(D)).filter(e=>!e.warn&&e.k!=='falto');
  const np=Object.keys(TCS.fp).length;if(np)E.push({dni:null,k:'fotp',msg:np===1?'Hay una foto sin subir: espera a que suba o reintenta.':`Hay ${np} fotos sin subir: espera a que suban o reintenta.`});
  const pre=tcRows().filter(([,r])=>tcSinM(r)).map(([dni,r])=>({dni,k:'asis',msg:`${tcNm(r)||dni}: marca si vino o no vino.`}));
  (D.blq||[]).forEach((k,i)=>{if(tcBloq(k.pc))E.push({dni:null,k:'bloq',bid:k.id,msg:`Trabajo ${i+1} (${tcPcCod(k.pc)}): partida bloqueada por costos: cámbiala.`})});
  return[...pre,...E]}
const TC_K1=['asis','vacio'],TC_K2=['pc','hora','quien','bloq','cruce','sinh'];
/** avisos de tValida que no impiden enviar (warn: jornada parcial…) */
const tcWarns=D=>tValida(tcCalc(D)).filter(e=>e.warn);

/* ---------- datos: suscripción y guardado ---------- */
function tcOpen(date){tcClose();clearTimeout(TCS.slowT);clearTimeout(TCS.sendT);Object.assign(TCS,{date,cap:tcMe(),doc:null,loaded:false,exists:false,step:1,dirty:false,inflight:0,busy:false,pend:false,err:'',ed:null,edMsg:'',pcQ:'',addOn:false,addQ:'',prev:null,need:false,cx:null,foc:'',fp:{},sendSt:'',srvPend:false,q1:'',f1:'all',q2:'',f2:'all',fotoHi:false});
  const id=tcId(date,TCS.cap);TCS.fpL=false;
  /* includeMetadataChanges: avisa también cuando una escritura pendiente (sin señal) queda confirmada por el servidor */
  TCS.unsub=fcol('tareo').doc(id).onSnapshot({includeMetadataChanges:true},s=>{if(!$('#tcRoot')){tcClose();return}tcSnap(s)},err=>{TCS.err=err&&err.code==='permission-denied'?'Tu cuenta no puede abrir este tareo.':'Sin conexión con la base de datos.';TCS.loaded=true;tcDraw()});
  /* estado de ayer y anteayer (para no dejar elegirlos si ya se enviaron) y el tareo anterior (para copiar sus trabajos) */
  {const hoy=todayIso();for(const n of[1,2]){const d=tcDay(hoy,-n);fcol('tareo').doc(tcId(d,TCS.cap)).get().then(s=>{TCS.past[d]=s.exists?(s.data().st||'bor'):'';if($('#tcRoot'))tcDraw()}).catch(()=>{})}}
  (async()=>{for(let n=1;n<=3;n++){const d=tcDay(date,-n);try{const s=await fcol('tareo').doc(tcId(d,TCS.cap)).get();if(s.exists&&(s.data().blq||[]).length){if(TCS.date===date){TCS.prev={date:d,blq:s.data().blq};if($('#tcRoot'))tcDraw()}return}}catch(e){return}}})()}
function tcClose(){if(TCS.unsub){try{TCS.unsub()}catch(e){}TCS.unsub=null}if(TCS.rsub&&!$('#tcRoot')){try{TCS.rsub()}catch(e){}TCS.rsub=null;TCS.rcap=''}if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0;if(TCS.dirty)tcSaveNow().catch(()=>{})}}
function tcSnap(s){const pend=!!(s.metadata&&s.metadata.hasPendingWrites);TCS.loaded=true;TCS.srvPend=pend;
  /* eco de la escritura propia; si tarda en confirmarse, slowT avisa que quedó en el celular. Si aún no hay nada en pantalla
     (se abrió la app sin señal con cambios guardados en el celular), se muestra lo del celular. */
  if(pend&&TCS.doc){tcStatus();if(tcRO())tcDraw();return}
  if(!pend&&TCS.sendSt==='queued'&&!TCS.inflight)TCS.sendSt='ok';
  if(!TCS.inflight)TCS.pend=false;
  if(TCS.dirty||TCS.inflight){tcStatus();return}/* lo local manda mientras hay cambios por guardar */
  TCS.exists=s.exists;TCS.doc=s.exists?s.data():tcNewDoc(TCS.date);
  if(!tcRO())tcSyncCrew();
  /* fotos que quedaron sin confirmar en el celular: se suben de nuevo (una vez por día abierto, ya con el tareo cargado) */
  if(!TCS.fpL){TCS.fpL=true;tcFpLoad()}
  tcDraw()}
/** agrega a la lista a quien entró a la cuadrilla después (sin marcar) */
function tcSyncCrew(){const R=TCS.doc.rows=TCS.doc.rows||{};for(const p of tcCrew(TCS.date)){const k=p.dni||p.id;if(!R[k])R[k]=tcRowOf(p)}}
/** marca un cambio: recalcula, redibuja y guarda en ~1 s */
function tcChg(redraw=true){if(tcRO())return;TCS.dirty=true;if(TCS.saveT)clearTimeout(TCS.saveT);TCS.saveT=setTimeout(()=>{TCS.saveT=0;tcSaveNow().catch(()=>{})},1000);if(redraw)tcDraw();else tcStatus()}
function tcSaveNow(){if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0}if(!TCS.doc)return Promise.resolve();
  const d=tcCalc({...TCS.doc,date:TCS.date,cap:TCS.cap,capN:TCS.doc.capN||(MEM.get(TCS.cap)||{}).name||''});d.by=me.email;d.ts=NOW();
  if(!Array.isArray(d.foto))d.foto=[];if(!Array.isArray(d.hist))d.hist=[];if(!Array.isArray(d.blq))d.blq=[];
  TCS.doc=d;TCS.dirty=false;TCS.inflight++;TCS.err='';
  clearTimeout(TCS.slowT);TCS.slowT=setTimeout(()=>{if(TCS.inflight){TCS.pend=true;tcStatus()}},2500);tcStatus();
  const date=TCS.date;const ref=fcol('tareo').doc(tcId(date,TCS.cap));
  /* el cotejo de la oficina (cot, cotFot) no es del capataz: nunca se reescribe. Si el documento ya existe se actualizan solo
     los campos del capataz (cada campo se reemplaza entero: rows, blq…); si no, se crea. */
  const w={...d};delete w.cot;delete w.cotFot;
  const was=TCS.exists;TCS.exists=true;
  return(was?ref.update(w):ref.set(w)).then(()=>{if(TCS.date!==date)return;TCS.inflight=Math.max(0,TCS.inflight-1);if(!TCS.inflight){TCS.pend=false;clearTimeout(TCS.slowT)}tcStatus()},
    err=>{if(TCS.date!==date)throw err;TCS.inflight=Math.max(0,TCS.inflight-1);TCS.dirty=true;if(!was||(err&&err.code==='not-found'))TCS.exists=false;TCS.err='No se pudo guardar: '+(err.code||err.message||err);tcStatus();throw err})}
function tcStatusTxt(){if(TCS.err)return['bad',TCS.err];
  if(tcRO()){const q=tcSendQ();return q==='sending'?['','Enviando…']:q==='queued'?['warn','Se enviará al tener señal']:['','']}
  if(TCS.pend&&TCS.inflight)return['warn','Guardado en el celular · se enviará con señal'];
  if(TCS.dirty||TCS.inflight)return['','Guardando…'];if(TCS.exists)return['ok','Guardado'];return['','']}
/** estado del envío para la pantalla: 'sending' · 'queued' (sin señal) · '' (confirmado o no aplica) */
function tcSendQ(){const D=TCS.doc;if(!D||D.st!=='env')return'';if(TCS.sendSt==='sending'||TCS.sendSt==='queued')return TCS.sendSt;return TCS.srvPend?'queued':''}
function tcStatus(){const el=$('#tcSt');if(!el)return;const[k,t]=tcStatusTxt();el.className='tc-st'+(k?' '+k:'');el.textContent=t}

/* ---------- vista ---------- */
function renderTCap(main){let want=TCS.date&&TCS.unsub?TCS.date:todayIso(),st=0;
  /* al volver a cargar la página (p. ej. el celular la cerró mientras estaba la cámara) se vuelve al mismo día y paso */
  if(!TCS.unsub){const v=tcVLoad();if(v){want=v.date;st=v.step}}
  if(!$('#tcRoot',main)){main.innerHTML=`<div class="tc" id="tcRoot"></div>`;tcBind($('#tcRoot',main))}
  if(!TCS.unsub||TCS.date!==want||TCS.cap!==tcMe()){tcOpen(want);if(st>=1&&st<=3)TCS.step=st}
  else if(TCS.doc&&!tcRO()&&!TCS.dirty)tcSyncCrew();
  tcReabSub();
  tcDraw()}
function tcDraw(){const root=$('#tcRoot');if(!root)return;
  /* sin cambios no se redibuja: así un toque no se pierde cuando llega la confirmación de la base */
  const html=tcHtml();if(root.__tch===html&&root.firstChild){tcStatus();tcFocusNow();return}
  const ae=document.activeElement;const fk=ae&&root.contains(ae)&&ae.dataset?ae.dataset.fk:null;const ss=fk?ae.selectionStart:null,se=fk?ae.selectionEnd:null;
  const bd=$('#tcBody');const sc=bd?bd.scrollTop:0;const keep=bd&&bd.dataset.k===TCS.date+'|'+TCS.step+'|'+(TCS.ed?TCS.ed.id:'');
  root.innerHTML=html;root.__tch=html;
  const nb=$('#tcBody');if(nb){nb.dataset.k=TCS.date+'|'+TCS.step+'|'+(TCS.ed?TCS.ed.id:'');if(keep)nb.scrollTop=sc}
  if(fk){const el=root.querySelector(`[data-fk="${CSS.escape(fk)}"]`);if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
  tcStatus();tcThumbs();tcFocusNow();tcVSave()}
/* día y paso abiertos (sessionStorage lps.tcv), para volver a ellos si la página se recarga al usar la cámara */
function tcVSave(){if(!TCS.date||!TCS.cap)return;try{sessionStorage.setItem('lps.tcv',JSON.stringify({cap:TCS.cap,date:TCS.date,step:TCS.step,t:NOW()}))}catch(e){}}
function tcVLoad(){try{const v=JSON.parse(sessionStorage.getItem('lps.tcv')||'null');if(v&&v.cap===tcMe()&&/^\d{4}-\d{2}-\d{2}$/.test(v.date||'')&&NOW()-(+v.t||0)<6*3600e3)return v}catch(e){}return null}
/** nombre completo y DNI de un obrero (al tocar su nombre) */
function tcNmToast(d){const r=TCS.doc&&TCS.doc.rows&&TCS.doc.rows[d];toast(`${(r&&tcNm(r))||d} · DNI ${d}`)}
/** «Falta la foto»: va al paso 3, resalta la tarjeta de la foto y abre la cámara (si el navegador no lo permite, queda resaltada) */
function tcFotoGo(){TCS.step=3;TCS.ed=null;TCS.fotoHi=true;tcDraw();const c=$('#tcFotoC');if(c&&c.scrollIntoView)c.scrollIntoView({block:'start'});
  const i=$('#tcFile');if(i&&!TCS.busy){try{i.click()}catch(e){}}}
/** lleva la vista a lo que hay que corregir (TCS.foc: selector) */
function tcFocusNow(){if(!TCS.foc)return;const sel=TCS.foc;TCS.foc='';const el=$('#tcRoot '+sel);if(el&&el.scrollIntoView)el.scrollIntoView({block:'center'})}
function tcHtml(){const D=TCS.doc,hoy=todayIso();TCS.lbl=D?tcLabels(D.rows):null;
  const dates=[hoy,tcDay(hoy,-1),tcDay(hoy,-2)];
  /* un reabierto de otra fecha abierto desde «Por corregir» tiene su propio botón */
  if(TCS.date&&!dates.includes(TCS.date))dates.push(TCS.date);
  /* ayer/anteayer ya enviados se abren en solo lectura (auditoría 2, UX6): el botón sigue activo y dice su estado */
  const dl=(d,i)=>{const st=d===TCS.date&&D?D.st:i?TCS.past[d]:'';const ro=TC_RO.includes(st);
    return`<button type="button" class="tc-date${d===TCS.date?' on':''}${ro?' tc-dro':''}" data-tcd="${d}"><b>${i===0?'Hoy':i===1?'Ayer':i===2?'Anteayer':'Otro día'}</b><span>${esc(TC_DN[pd(d).getUTCDay()].slice(0,3))} ${esc(fmtD(d))}</span>${ro?`<em class="tc-dst">${st==='env'?'Enviado ✓':st==='rev'?'Revisado':'Publicado'}</em>`:''}</button>`};
  const rb=TCS.reabL.length?`<div class="callout tc-pc" id="tcPorCor"><b>Por corregir (${TCS.reabL.length})</b><span>La oficina te reabrió ${TCS.reabL.length===1?'este tareo':'estos tareos'}: corrígelos y vuelve a enviarlos.</span>
     <div class="tc-pcl">${TCS.reabL.map(x=>`<button type="button" class="ib tc-pcb${x.date===TCS.date?' on':''}" data-tcd="${esc(x.date)}"><b>${esc(TC_DN[pd(x.date).getUTCDay()])} ${esc(fmtD(x.date))}${x.date===TCS.date?' · abierto':''}</b>${x.mot?`<span>${esc(x.mot)}</span>`:''}</button>`).join('')}</div></div>`:'';
  const head=`<div class="tc-head"><div class="tc-dates" role="group" aria-label="Día del tareo">${dates.map(dl).join('')}</div>`+rb;
  if(!TCS.loaded)return head+`</div><div class="tc-body" id="tcBody"><p class="tc-empty">Cargando tu tareo…</p></div>`;
  if(!D)return head+`</div><div class="tc-body" id="tcBody"><div class="callout warnc">${esc(TCS.err||'No se pudo abrir el tareo.')}</div></div>`;
  const ro=tcRO();const E=ro?[]:tcErrs(D);
  const s1=!E.some(e=>TC_K1.includes(e.k)),s2=!E.some(e=>TC_K2.includes(e.k))&&(D.blq||[]).length>0;
  const steps=[[1,'¿Quién vino?',s1],[2,'¿En qué trabajaron?',s2],[3,'Revisar y enviar',false]];
  const bar=ro?'':`<div class="tc-steps" role="tablist">${steps.map(([n,l,ok])=>`<button type="button" role="tab" class="tc-step${TCS.step===n?' on':''}${ok&&TCS.step!==n?' ok':''}" data-tcs="${n}" aria-selected="${TCS.step===n}"><i>${ok&&TCS.step!==n?'✓':n}</i><span>${l}</span></button>`).join('')}</div>`;
  /* feriado o domingo (con la configuración del tareo o la congelada en él): todo es extra (auditoría 2, A5) */
  const nl=tcJor(TCS.date).nl?`<div class="callout tc-nolab" id="tcNoLab" role="note"><b>Día no laborable: todas las horas cuentan como extra.</b><span>${esc(tcNlWhy(TCS.date))} No hay jornada ordinaria; los horarios de los atajos son solo sugeridos.</span></div>`:'';
  const ban=D.st==='reab'?`<div class="callout tc-reab"><b>Te reabrieron este tareo</b>${D.reab&&D.reab.mot?`<span>Motivo: ${esc(D.reab.mot)}</span>`:''}<span>Corrige y vuelve a enviarlo.</span></div>`
    :ro?tcSentBan(D):'';
  let body='';
  if(ro)body=tcStep3(D,[],true);else if(TCS.step===1)body=tcStep1(D);else if(TCS.step===2)body=tcStep2(D);else body=tcStep3(D,E,false);
  let foot='';
  if(!ro){if(TCS.step===2&&TCS.ed)foot=`<button type="button" class="ib tc-big" data-tca="edCancel">Cancelar</button><button type="button" class="ib pri tc-big" data-tca="edOk">Guardar trabajo</button>`;
    else if(TCS.step===1){const n=tcRows().filter(([,r])=>tcSinM(r)).length;
      foot=`<button type="button" class="ib pri tc-big tc-w" data-tcs="2">${n?`Falta marcar a ${n} →`:'Siguiente: ¿en qué trabajaron? →'}</button>`}
    else if(TCS.step===2)foot=`<button type="button" class="ib tc-big" data-tcs="1">← Atrás</button><button type="button" class="ib pri tc-big" data-tcs="3">Revisar y enviar →</button>`;
    else{const nf=E.filter(e=>e.k!=='foto'&&e.k!=='fotp');const fp=E.some(e=>e.k==='fotp');const sinF=!fp&&E.some(e=>e.k==='foto');
      /* «Falta la foto» lleva a la tarjeta de la foto y abre la cámara (auditoría 2, UX4) */
      foot=`<button type="button" class="ib tc-big" data-tcs="2">← Atrás</button>`+(nf.length?`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="fix">Faltan ${nf.length} ${nf.length===1?'dato':'datos'}: ver →</button>`
        :sinF&&!TCS.busy?`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="foto">📷 Falta la foto: tomarla</button>`
        :`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="send"${E.length||TCS.busy?' disabled':''}>${fp?'Foto sin subir':TCS.busy?'Procesando foto…':'Enviar tareo'}</button>`)}}
  return head+bar+`<div class="tc-st" id="tcSt" aria-live="polite"></div></div><div class="tc-body" id="tcBody">${ban}${nl}${body}</div>${foot?`<div class="tc-foot">${foot}</div>`:''}`}

/* paso 1: asistencia explícita */
/** aviso del enviado: «Enviando…», «Se enviará al tener señal» (ámbar) o «Enviado ✓ hh:mm» (solo confirmado por el servidor) */
function tcSentBan(D){const q=tcSendQ();
  if(q==='sending')return`<div class="callout tc-sent tc-sending" id="tcSentB"><b>Enviando…</b><span>Esperando la confirmación del servidor.</span></div>`;
  if(q==='queued')return`<div class="callout tc-sent tc-queued" id="tcSentB" role="status"><b>⚠ Se enviará al tener señal</b><span>Está guardado en este celular. No cierres sesión ni borres los datos de la app; se enviará solo cuando vuelva la señal.</span></div>`;
  const t=D.envAt?' · '+esc(new Date(D.envAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})):'';
  return`<div class="callout tc-sent${D.st==='rev'?' tc-rev':''}" id="tcSentB"><b>Enviado ✓${t}</b><span>${D.st==='env'?'Ya no se puede cambiar. Si hay un error, pide al asistente de tareo que lo reabra.':D.st==='rev'?'Revisado por la oficina.':'Publicado.'}</span></div>`}
function tcStep1(D){const R=tcRows();const crew=new Set(tcCrew(TCS.date).map(p=>p.dni||p.id));
  const nV=R.filter(([,r])=>tcVino(r)).length,nF=R.filter(([,r])=>tcFalto(r)).length,sin=R.length-nV-nF;
  /* buscador y filtro (auditoría 2, UX3): solo ocultan filas; la numeración es la de la lista completa */
  const q=tFold(TCS.q1),f1=TCS.f1;
  const vis=R.map((x,i)=>[...x,i]).filter(([dni,r])=>(f1==='sin'?tcSinM(r):f1==='no'?tcFalto(r):true)&&(!q||dni.includes(q)||tFold(r.ape).includes(q)||tFold(r.nom).includes(q)||tFold(r.nom+' '+r.ape).includes(q)));
  const list=vis.map(([dni,r,i])=>{const v=tcVino(r),f=tcFalto(r),u=!v&&!f;const nm=esc(tcFN(dni));
    return`<div class="tc-ob${v?' si':f?' off':' sin'}${u&&TCS.need?' need':''}" data-dni="${esc(dni)}">
    <div class="tc-wr"><span class="tc-n">${i+1}</span><div class="tc-wn"><b>${esc(r.ape||dni)}</b><span>${esc(r.nom||'')}${r.cat?' · '+esc(r.cat):''} · <span class="mono">DNI ${esc(dni)}</span>${crew.has(dni)||r.ajeno?'':' · agregado hoy'}</span>${r.ajeno?`<em class="tc-aj" title="${esc(tcCapOrig(r.capOrig))}">No es de tu cuadrilla</em>`:''}</div>
     ${v?`<label class="tc-alt"><input type="checkbox" data-tca="alt"${r.alt?' checked':''}><span>Altura</span></label>`:''}</div>
    <div class="tc-vn" role="group" aria-label="¿Vino ${nm}?"><button type="button" class="tc-v${v?' on':''}" data-tca="vino" aria-pressed="${v}">✓ Vino</button><button type="button" class="tc-nv${f?' on':''}" data-tca="novino" aria-pressed="${f}">✕ No vino</button></div>
    ${f?`<div class="tc-mlab">Motivo <span>(opcional)</span></div><div class="tc-mots" role="group" aria-label="Motivo (opcional)">${TC_MOT.map(([k,l])=>`<button type="button" class="tc-mot${r.mot===k?' on':''}" data-tca="mot" data-v="${k}" aria-pressed="${r.mot===k}"><b>${k}</b> ${esc(l)}</button>`).join('')}</div>`:''}
    ${u&&TCS.need?`<div class="tc-err">Falta marcar si vino.</div>`:''}
    ${crew.has(dni)?'':`<button type="button" class="tc-lnk" data-tca="rm">Quitar de este tareo</button>`}</div>`}).join('');
  const add=TCS.addOn?`<div class="tc-card tc-add"><label class="tc-lab">Buscar por DNI o apellido<input class="tin tc-in" id="tcAddQ" data-fk="tcAddQ" type="search" autocomplete="off" value="${esc(TCS.addQ)}" placeholder="Ej. 4512 o QUISPE"></label><div id="tcAddL" class="tc-res">${tcAddList()}</div>
     <button type="button" class="ib tc-big" data-tca="addOff">Cerrar</button></div>`:`<button type="button" class="ib tc-big tc-w" data-tca="addOn">+ Agregar obrero</button>`;
  if(!R.length)return`<div class="tc-h"><h2>¿Quién vino?</h2></div><div class="callout warnc tc-none"><b>No tienes obreros asignados.</b><span>Pide a la oficina que te los asigne en Personal.</span></div>${add}`;
  /* contadores como en la oficina: vinieron (as true) · no vinieron (as false) · sin marcar (ni uno ni otro); fijos arriba al desplazar */
  const fb=(k,l,n)=>`<button type="button" class="tc-f${f1===k?' on':''}" data-tcf1="${k}" aria-pressed="${f1===k}">${l}${n!=null?` <b>${n}</b>`:''}</button>`;
  return`<div class="tc-stk" id="tcStk1"><div class="tc-h"><h2>¿Quién vino?</h2><span class="tc-cnt${sin?'':' ok'}" id="tcCnt">Marcados ${R.length-sin} de ${R.length}</span></div>
   <div class="tc-k3" id="tcK3"><span class="ok"><b>${nV}</b> vinieron</span><span class="bad"><b>${nF}</b> no vinieron</span><span class="${sin?'warn':'ok'}"><b>${sin}</b> sin marcar</span></div>
   <input class="tin tc-in tc-q" id="tcQ1" data-fk="tcQ1" type="search" autocomplete="off" value="${esc(TCS.q1)}" placeholder="Buscar en tu cuadrilla: nombre o DNI" aria-label="Buscar en tu cuadrilla por nombre o DNI">
   <div class="tc-fs" role="group" aria-label="Mostrar">${fb('all','Todos',R.length)}${fb('sin','Sin marcar',sin)}${fb('no','No vinieron',nF)}</div></div>
   ${sin?`<button type="button" class="ib pri tc-big tc-w" data-tca="todos">✓ Todos vinieron <small>(marca a ${sin} ${sin===1?'que falta':'que faltan'})</small></button>`:''}
   <div class="tc-list" id="tcL1">${list||`<p class="tc-empty">${q?`Nadie con «${esc(TCS.q1)}»`:'Nadie'}${f1==='sin'?' sin marcar':f1==='no'?' que no vino':''}. <button type="button" class="tc-lnk" data-tca="f1x">Ver a todos</button></p>`}</div>${add}`}
function tcAddList(){const q=tFold(TCS.addQ);if(q.length<2)return`<p class="tc-hint">Escribe al menos 2 letras o números.</p>`;
  const R=(TCS.doc&&TCS.doc.rows)||{};const L=[...S.tper.values()].filter(p=>p&&!p.arch&&tActivo(p,TCS.date)&&!R[p.dni||p.id]&&((p.dni||'').includes(q)||tFold(p.ape).includes(q)||tFold(p.nom).includes(q))).slice(0,12);
  if(!L.length)return`<p class="tc-hint">Nadie con «${esc(TCS.addQ)}» entre el personal activo.</p>`;
  return L.map(p=>`<button type="button" class="tc-opt" data-tca="add" data-v="${esc(p.dni||p.id)}"><b>${esc(tName(p))}</b><span>DNI ${esc(p.dni||p.id)} · ${esc(p.cua||p.pue||'')}${p.cap!==TCS.cap?` · <em>${esc(tcCapOrig(p.cap||''))}</em>`:''}</span></button>`).join('')}
/** de quién es un obrero que no es de la cuadrilla: «de <capataz>» o «sin capataz» */
const tcCapOrig=c=>c?'de '+(typeof tCapName==='function'?tCapName(c):c):'sin capataz';

/* paso 2: trabajos por bloques */
function tcStep2(D){if(TCS.ed)return tcEditor(D);const B=D.blq||[];const R=D.rows||{};const pres=tcPres();
  const cards=B.map(k=>{const ds=k.dnis||[];const n=ds.filter(d=>tcVino(R[d]));const nv=ds.filter(d=>tcFalto(R[d]));const all=n.length===pres.length&&n.length>0;const h=tcBH(TCS.date,k.ini,k.fin);const bq=tcBloq(k.pc);
    return`<div class="tc-card tc-blq${bq?' bad':''}" data-bid="${esc(k.id)}" style="--h:${tcHue(D,k.pc)}"><div class="tc-bt"><i class="tc-dot"></i><b>${esc(tcPcName(k.pc))}</b></div>
     ${bq?`<div class="tc-err">Partida bloqueada por costos: cámbiala.</div>`:''}
     <div class="tc-bm"><span class="mono">${esc(tcT(k.ini))}–${esc(tcT(k.fin))}</span><span>${tcH(h)}</span><span>${all?`Todos (${n.length})`:`${n.length} ${n.length===1?'obrero':'obreros'}`}</span></div>
     ${all&&!nv.length?'':`<div class="tc-bw">${[...(all?[]:n.map(d=>tcNmT(d))),...nv.map(d=>`<s>${tcNmT(d)}</s> <em>no vino</em>`)].join(' · ')}</div>`}
     <div class="tc-ba"><button type="button" class="ib" data-tca="edit">${bq?'Cambiar partida':'Editar'}</button><button type="button" class="ib" data-tca="dup">Duplicar</button><button type="button" class="ib" data-tca="del">Borrar</button></div></div>`}).join('');
  const copy=!B.length&&TCS.prev?`<button type="button" class="ib tc-big tc-w" data-tca="copy">Copiar los trabajos del ${esc(TC_DN[pd(TCS.prev.date).getUTCDay()].toLowerCase())} ${esc(fmtD(TCS.prev.date))} (${TCS.prev.blq.length})</button>`:'';
  return`<div class="tc-h"><h2>¿En qué trabajaron?</h2><span>Agrega cada trabajo con su partida, horario y quiénes.</span></div>
   ${cards?`<div class="tc-list">${cards}</div>`:`<p class="tc-empty">Aún no hay trabajos.</p>`}
   <button type="button" class="ib pri tc-big tc-w" data-tca="new">+ Agregar trabajo</button>${copy}
   ${pres.length?`<div class="tc-h tc-h2"><h3>Horas por obrero</h3><span id="tcJorH">${tcJor(TCS.date).nl?'Día no laborable: todas las horas son extra':`Jornada del día: ${tcH(tcJor(TCS.date).h)}`}</span></div>${tcScale()}<div class="tc-bars">${tcBars(D)}</div>`:''}`}
/* línea de tiempo de 6:00 a 20:00 */
const TL0=360,TL1=1200;
const tcPos=m=>(Math.max(TL0,Math.min(TL1,m))-TL0)/(TL1-TL0)*100;
function tcScale(){let s='';for(let h=6;h<=20;h+=2)s+=`<span style="left:${tcPos(h*60).toFixed(2)}%">${h}</span>`;return`<div class="tc-tls" aria-hidden="true">${s}</div>`}
/** barra del obrero: sus bloques coloreados por partida, el refrigerio rayado y los cruces en rojo (tocables) */
function tcTl(D,dni,C){const J=tcJor(TCS.date);let s='';
  if(J.ref>0&&J.ri!=null){const a=tcPos(J.ri),b=tcPos(J.ri+J.ref);s+=`<i class="tc-ref" style="left:${a.toFixed(2)}%;width:${(b-a).toFixed(2)}%"></i>`}
  for(const k of(D.blq||[])){if(!(k.dnis||[]).includes(dni))continue;const iv=tcIv(k);if(!iv)continue;const a=tcPos(iv[0]),b=tcPos(iv[1]);
    s+=`<i class="tc-seg${tcBloq(k.pc)?' bq':''}" style="left:${a.toFixed(2)}%;width:${Math.max(0.8,b-a).toFixed(2)}%;--h:${tcHue(D,k.pc)}" title="${esc(tcPcCod(k.pc))} ${esc(tcT(k.ini))}–${esc(tcT(k.fin))}"><span>${esc(tcPcCod(k.pc))}</span></i>`}
  const B=new Map((D.blq||[]).map(k=>[k.id,k]));
  for(const c of C){if(c.dni!==dni)continue;const p=tcIv(B.get(c.a)),q=tcIv(B.get(c.b));const a=tcPos(Math.max(p[0],q[0])),b=tcPos(Math.min(p[1],q[1]));
    s+=`<button type="button" class="tc-cxb" data-tca="cx" data-a="${esc(c.a)}" data-b="${esc(c.b)}" style="left:${a.toFixed(2)}%;width:${(b-a).toFixed(2)}%" aria-label="Cruce: resolver"></button>`}
  return`<div class="tc-tl">${s}</div>`}
/** texto y botón del cruce de un obrero, y el panel de opciones si está abierto */
function tcCxRow(D,dni,C){const B=new Map((D.blq||[]).map(k=>[k.id,k]));const mine=C.filter(c=>c.dni===dni);if(!mine.length)return'';
  const c=mine[0],a=B.get(c.a),b=B.get(c.b);
  const open=TCS.cx&&TCS.cx.dni===dni&&mine.some(x=>x.a===TCS.cx.a&&x.b===TCS.cx.b);
  return(open?'':`<button type="button" class="tc-cxl" data-tca="cx" data-a="${esc(c.a)}" data-b="${esc(c.b)}">⚠ Se cruzan ${esc(tcPcCod(a.pc))} ${esc(tcT(a.ini))}–${esc(tcT(a.fin))} y ${esc(tcPcCod(b.pc))} ${esc(tcT(b.ini))}–${esc(tcT(b.fin))} · <u>Resolver</u></button>`)+(open?tcCxPanel(D):'')}
function tcCxPanel(D){const x=TCS.cx;const B=new Map((D.blq||[]).map(k=>[k.id,k]));const a=B.get(x.a),b=B.get(x.b);const r=(D.rows||{})[x.dni];if(!a||!b||!r)return'';
  const p=tcIv(a),q=tcIv(b);if(!tcOv(p,q))return'';const nm=esc(tcSN(x.dni));const la=k=>`${esc(tcPcCod(k.pc))} ${esc(tcT(k.ini))}–${esc(tcT(k.fin))}`;
  return`<div class="tc-cxp" role="group" aria-label="Resolver cruce"><b>${nm} está en dos trabajos a la misma hora</b>
    <button type="button" class="ib tc-big" data-tca="tlRm" data-v="${esc(b.id)}">Quitarlo de ${la(b)}</button>
    <button type="button" class="ib tc-big" data-tca="tlRm" data-v="${esc(a.id)}">Quitarlo de ${la(a)}</button>
    ${p[1]<q[1]?`<button type="button" class="ib tc-big" data-tca="tlIni">Que ${esc(tcPcCod(b.pc))} empiece a las ${esc(tcT(a.fin))}</button>`:''}
    ${q[0]>p[0]?`<button type="button" class="ib tc-big" data-tca="tlFin">Que ${esc(tcPcCod(a.pc))} termine a las ${esc(tcT(b.ini))}</button>`:''}
    <button type="button" class="tc-lnk" data-tca="tlX">Cancelar</button></div>`}
/** fila por obrero: horas asignadas vs jornada y su línea de tiempo; rojo si faltan horas o se cruzan */
function tcBars(D){const J=tcJor(TCS.date).h;const C=tcCruces(D);
  return tcPres().map(([dni,r])=>{const L=(D.blq||[]).filter(k=>(k.dnis||[]).includes(dni)&&tcIv(k));
    const h=tR2(L.reduce((s,k)=>s+tcBH(TCS.date,k.ini,k.fin),0));const cr=C.some(c=>c.dni===dni);
    const k=cr||h===0||(J&&h<J)?'bad':h>J?'warn':'ok';
    const txt=cr?'se cruzan dos trabajos':h===0?'sin horas':J&&h<J?`faltan ${tcH(J-h)}`:!J?'todo extra (no laborable)':h>J?`${tcH(h-J)} extra`:'completo';
    return`<div class="tc-bar ${k}" data-dni="${esc(dni)}"><div class="tc-bl"><b>${tcNmT(dni)}</b><span>${tcH(h)}${J?' / '+tcH(J):''} · ${txt}</span></div>${tcTl(D,dni,C)}${tcCxRow(D,dni,C)}</div>`}).join('')}

/** atajos de horario del editor: [clave, nombre, ini, fin] */
function tcAtajos(D,e){const J=tcJor(TCS.date);const j=J.j;const R=D.rows||{};const out=[];
  if(J.S.man)out.push(['man','Mañana',...J.S.man]);
  if(J.S.tar)out.push(['tar','Tarde',...J.S.tar]);
  /* +N h: desde donde termina el último trabajo de los elegidos (o el inicio de la jornada); salta el refrigerio */
  let st=null;for(const k of(D.blq||[])){if(k.id===e.id)continue;if(!(k.dnis||[]).some(d=>e.dnis.includes(d)&&tcVino(R[d])))continue;const iv=tcIv(k);if(iv&&(st==null||iv[1]>st))st=iv[1]}
  if(st==null)st=tMin(j.ini);
  if(J.ref>0&&J.ri!=null&&st>=J.ri&&st<J.ri+J.ref)st=J.ri+J.ref;
  for(const n of[1,2,3]){let f=st+n*60;while(f<1439&&tcBH(TCS.date,tcHM(st),tcHM(f))<n-0.001)f+=5;if(f<=1439&&st>=300)out.push(['p'+n,'+'+n+' h',tcHM(st),tcHM(f)])}
  const z=tMin(j.fin);if(z!=null&&z<1439)out.push(['ext','Extendido',j.fin,tcHM(z<1140?1140:Math.min(1439,z+60))]);
  out.push(['todo','Todo el día',...J.S.todo]);return out}
/** cruces del bloque en edición con los demás: {by: Map dni → bloque, g: [{k, dnis}]} */
function tcEdCx(D,e){const iv=tcIv(e);const R=D.rows||{};const by=new Map(),g=new Map();if(!iv)return{by,g:[]};
  for(const d of e.dnis){if(!tcVino(R[d]))continue;for(const k of(D.blq||[])){if(k.id===e.id||!(k.dnis||[]).includes(d)||!tcOv(iv,tcIv(k)))continue;
    if(!by.has(d))by.set(d,k);if(!g.has(k.id))g.set(k.id,{k,dnis:[]});const x=g.get(k.id);if(!x.dnis.includes(d))x.dnis.push(d)}}
  return{by,g:[...g.values()]}}
/** cómo se ajusta este bloque o el otro para que no se crucen (null si no se puede) */
function tcAdjEste(e,k){const p=tcIv(e),q=tcIv(k);if(!p||!q)return null;
  if(q[0]<=p[0])return q[1]<p[1]?{ini:k.fin,txt:`Ajustar este trabajo para que empiece a las ${tcT(k.fin)}`}:null;
  return{fin:k.ini,txt:`Ajustar este trabajo para que termine a las ${tcT(k.ini)}`}}
function tcAdjOtro(e,k){const p=tcIv(e),q=tcIv(k);if(!p||!q)return null;
  if(q[0]<p[0])return{fin:e.ini,txt:`Ajustar el otro: ${tcPcCod(k.pc)} hasta las ${tcT(e.ini)}`};
  if(q[1]>p[1])return{ini:e.fin,txt:`Ajustar el otro: ${tcPcCod(k.pc)} desde las ${tcT(e.fin)}`};
  return null}
/** lo que ya tiene un obrero en los OTROS trabajos (no el que se edita): horas, bloques, si completó la jornada y con cuál se
    cruzaría el horario elegido. {h, L:[bloques], full, cx: bloque|null} */
function tcOcc(D,e,dni){const J=tcJor(TCS.date).h;const iv=tcIv(e);
  const L=(D.blq||[]).filter(k=>k.id!==e.id&&(k.dnis||[]).includes(dni)&&tcIv(k)).sort((x,y)=>tcIv(x)[0]-tcIv(y)[0]);
  const h=tR2(L.reduce((s,k)=>s+tcBH(TCS.date,k.ini,k.fin),0));
  return{h,L,J,full:J>0&&h>=J-0.001,cx:iv?L.find(k=>tcOv(iv,tcIv(k)))||null:null}}
/** «libres» para el horario del trabajo: vinieron, no completaron la jornada y no se cruzan con ese horario */
const tcLibres=(D,e)=>tcPres().map(x=>x[0]).filter(d=>{const o=tcOcc(D,e,d);return!o.full&&!o.cx});
function tcEditor(D){const e=TCS.ed;const R=D.rows||{};const pres=tcPres();const on=new Set(e.dnis);
  const pon=pres.filter(([d])=>on.has(d)).length;const nv=e.dnis.filter(d=>tcFalto(R[d]));
  const pc=e.pc?S.tpc.get(e.pc):null;const bq=!!(pc&&pc.bloq===true);const h=tcBH(TCS.date,e.ini,e.fin);
  const J0=tcJor(TCS.date);const sc=tcAtajos(D,e).map(([k,l,a,b])=>`<button type="button" class="tc-chip${e.ini===a&&e.fin===b?' on':''}" data-tca="sc" data-v="${k}"><b>${l}</b><span>${tcT(a)}–${tcT(b)}</span></button>`).join('');
  const X=tcEdCx(D,e);
  /* cada obrero: lo que ya tiene en otros trabajos, su barra de jornada (lo de otros + este) y si se cruzaría con este horario */
  const lb=k=>`${esc(tcPcCod(k.pc))} ${esc(tcT(k.ini))}–${esc(tcT(k.fin))}`;const hx=v=>tHtxt(v)+' h';
  /* buscador y filtro (auditoría 2, UX3): Todos · Libres (sin jornada completa ni cruce con este horario) · Seleccionados. Solo ocultan. */
  const q=tFold(TCS.q2),f2=TCS.f2;const lib=new Set(tcLibres(D,e));
  const okQ=(dni,r)=>!q||dni.includes(q)||tFold(r.ape).includes(q)||tFold(r.nom).includes(q)||tFold(tcSN(dni)).includes(q);
  const vis=pres.filter(([dni,r])=>(f2==='lib'?lib.has(dni):f2==='sel'?on.has(dni):true)&&okQ(dni,r));
  const dup=(TCS.lbl&&TCS.lbl.dup)||new Set();
  const chips=vis.map(([dni,r])=>{const o=on.has(dni);const O=tcOcc(D,e,dni);const k=O.cx;const J=O.J||Math.max(O.h+(h||0),1);
    const w0=Math.min(100,O.h/J*100),w1=o&&h>0?Math.max(0,Math.min(100-w0,h/J*100)):0;
    const info=O.L.length?`${hx(O.h)} · ${O.L.map(lb).join(' · ')}`:'Sin otros trabajos';
    const st=O.full&&!o?`<small class="tc-ppf">Jornada completa</small>`:k?`<small class="tc-ppx">${o?'se cruza con':'ocupado:'} ${lb(k)}</small>`:O.full?`<small class="tc-ppf">Jornada completa</small>`:'';
    return`<button type="button" class="tc-chip tc-pp${o?' on':''}${k&&o?' cx':''}${k&&!o?' oc':''}${O.full?' full':''}" data-tca="who" data-v="${esc(dni)}" aria-pressed="${o}" aria-label="${esc(tcFN(dni))}" title="${esc(tcFN(dni))}">
      <span class="tc-ppk" aria-hidden="true">${o?'✓':''}</span><span class="tc-ppd"><span class="tc-ppn">${esc(tcSN(dni))}</span>${dup.has(dni)?`<small class="tc-ppfn">${esc(tcFN(dni))}</small>`:''}<small class="tc-ppi">${info}</small>${st}
      <i class="tc-ppb" aria-hidden="true"><i style="width:${w0.toFixed(1)}%"></i>${w1?`<i class="tc-ppe" style="left:${w0.toFixed(1)}%;width:${w1.toFixed(1)}%"></i>`:''}</i></span></button>`}).join('')
    +(f2==='lib'?[]:nv.filter(d=>R[d]&&okQ(d,R[d]))).map(d=>`<span class="tc-chip tc-pp nv" title="${esc(tcFN(d))} · no vino: no suma horas"><span class="tc-ppn">${tcNmT(d)}</span><small>no vino</small></span>`).join('');
  const cx=X.g.map(({k,dnis})=>{const es=tcAdjEste(e,k),ot=tcAdjOtro(e,k);const nm=dnis.map(d=>esc(tcSN(d))).join(', ');
    return`<div class="tc-cxp" data-ob="${esc(k.id)}"><b>${dnis.length===1?nm+' se cruza':`${dnis.length} se cruzan`} con ${esc(tcPcCod(k.pc))} ${esc(tcT(k.ini))}–${esc(tcT(k.fin))}</b>${dnis.length>1?`<span>${nm}</span>`:''}
      <button type="button" class="ib tc-big" data-tca="cxQuitar" data-v="${esc(k.id)}">${dnis.length===1?'Quitarlo':'Quitarlos'} de este trabajo</button>
      ${es?`<button type="button" class="ib tc-big" data-tca="cxEste" data-v="${esc(k.id)}">${esc(es.txt)}</button>`:''}
      <button type="button" class="ib tc-big" data-tca="cxOtro" data-v="${esc(k.id)}">${esc(ot?ot.txt:`Quitar${dnis.length===1?'lo':'los'} del otro (${tcPcCod(k.pc)})`)}</button></div>`}).join('');
  return`<div class="tc-h"><h2>${e.nuevo?'Nuevo trabajo':'Editar trabajo'}</h2></div>
   <div class="tc-card${bq?' bad':''}"><div class="tc-lab">1. Partida</div>
    ${pc?`<div class="tc-pcsel"><b>${esc(pc.cod)}</b><span>${esc(pc.nom)}</span><button type="button" class="ib" data-tca="pcX">Cambiar</button></div>${bq?`<div class="tc-err">Partida bloqueada por costos: cámbiala.</div>`:''}`
     :`<input class="tin tc-in" id="tcPcQ" data-fk="tcPcQ" type="search" autocomplete="off" value="${esc(TCS.pcQ)}" placeholder="Buscar por código o nombre" aria-label="Buscar partida"><div id="tcPcL" class="tc-res">${tcPcList()}</div>`}</div>
   <div class="tc-card"><div class="tc-lab">2. Horario${J0.nl?' <span class="tc-sug">sugerido · día no laborable: todo cuenta como extra</span>':''}</div><div class="tc-chips tc-sc">${sc}</div>
    <div class="tc-times"><label>Desde<input class="tin tc-in" type="time" step="300" id="tcIni" data-tca="ini" value="${esc(e.ini)}"></label><label>Hasta<input class="tin tc-in" type="time" step="300" id="tcFin" data-tca="fin" value="${esc(e.fin)}"></label><b class="tc-hh">${tcH(h)}</b></div></div>
   <div class="tc-card"><div class="tc-lab">3. ¿Quiénes? <span>${pon} de ${pres.length}</span></div>
    <div class="tc-whb"><button type="button" class="ib" data-tca="libres">Todos los libres</button><button type="button" class="ib" data-tca="none">Ninguno</button></div>
    <div class="tc-hint">Marcados por defecto: los que aún tienen horas libres en este horario.</div>
    <input class="tin tc-in tc-q" id="tcQ2" data-fk="tcQ2" type="search" autocomplete="off" value="${esc(TCS.q2)}" placeholder="Buscar obrero: nombre o DNI" aria-label="Buscar obrero por nombre o DNI">
    <div class="tc-fs" role="group" aria-label="Mostrar">${[['lib','Libres',pres.filter(([d])=>lib.has(d)).length],['sel','Seleccionados',pon],['all','Todos',pres.length]].map(([k,l,n])=>`<button type="button" class="tc-f${f2===k?' on':''}" data-tcf2="${k}" aria-pressed="${f2===k}">${l} <b>${n}</b></button>`).join('')}</div>
    <div class="tc-chips tc-who" id="tcWho">${chips||`<p class="tc-empty">Nadie${q?` con «${esc(TCS.q2)}»`:''}${f2==='lib'?' libre en este horario':f2==='sel'?' seleccionado':''}. <button type="button" class="tc-lnk" data-tca="f2x">Ver a todos</button></p>`}</div>${cx}
    <label class="tc-alt tc-altb"><input type="checkbox" data-tca="edAlt"${e.alt?' checked':''}><span>Trabajo en altura (bono para estos obreros)</span></label></div>
   ${TCS.edMsg?`<div class="tc-err tc-errb">${esc(TCS.edMsg)}</div>`:''}`}
function tcPcList(){const q=tFold(TCS.pcQ);const use=tcUse();const all=tcPcs();
  let L=q?all.filter(x=>tFold(x.cod).includes(q)||tFold(x.nom).includes(q)||tFold(x.grpN).includes(q)):all.filter(x=>use[x.id]).sort((a,b)=>(use[b.id]||0)-(use[a.id]||0));
  if(q)L.sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)||tCmpCod(a.cod,b.cod));
  const hint=!q?(L.length?`<div class="tc-hint">Las que más usas:</div>`:`<div class="tc-hint">Escribe el código (10.05) o parte del nombre (encofrado).</div>`):'';
  if(q&&!L.length)return`<p class="tc-hint">Ninguna partida con «${esc(TCS.pcQ)}».</p>`;
  return hint+L.slice(0,q?20:8).map(x=>`<button type="button" class="tc-opt" data-tca="pc" data-v="${esc(x.id)}"><b>${esc(x.cod)}</b><span>${esc(x.nom)}${x.grpN?` <em>· ${esc(x.grpN)}</em>`:''}</span></button>`).join('')}

/* paso 3: revisar y enviar (y vista de solo lectura) */
function tcStep3(D,E,ro){const R=tcCalc(D).rows||{};const rows=tcRows();const bad=new Set(E.filter(e=>e.dni).map(e=>e.dni));const C=ro?[]:tcCruces(D);
  const tot=rows.reduce((a,[d])=>{const r=R[d]||{};if(tcVino(r)){a.v++;a.h+=+r.trab||0;a.e+=+r.ext||0}else if(tcFalto(r))a.f++;else a.s++;return a},{v:0,f:0,s:0,h:0,e:0});
  const list=rows.map(([dni,r0])=>{const r=R[dni]||r0;const v=tcVino(r),f=tcFalto(r);
    return`<div class="tc-sum${bad.has(dni)?' bad':''}${v?'':' off'}" data-dni="${esc(dni)}"><div class="tc-wn"><b>${esc(tcFN(dni))}</b>
     <span>${v?`<span class="mono">${esc(tcT(r.ini)||'—')}–${esc(tcT(r.fin)||'—')}</span> · ${tcH(r.trab)}${r.ext?` · <em class="tc-ext">${tcH(r.ext)} extra</em>`:''}${r.alt?' · <em class="tc-altm">altura</em>':''}`
      :f?`No vino${r.mot?' · '+esc((TC_MOT.find(m=>m[0]===r.mot)||['',''])[1]||r.mot):''}`:'Sin marcar si vino'}</span>
     ${v&&r.h&&Object.keys(r.h).length?`<span class="tc-pcs">${Object.entries(r.h).map(([pc,h])=>`${esc(tcPcCod(pc))}: ${tcH(h)}`).join(' · ')}</span>`:''}</div>
     ${v?tcTl(D,dni,C)+tcCxRow(D,dni,C):''}</div>`}).join('');
  const fotos=Array.isArray(D.foto)?D.foto:[];const FP=ro?[]:Object.entries(TCS.fp).filter(([id])=>!fotos.includes(id));
  const ef=E.filter(e=>e.k!=='foto'&&e.k!=='fotp');
  const errs=ef.length?`<div class="callout tc-errs"><b>Antes de enviar, corrige:</b><ul>${ef.map(e=>`<li>${esc(tcErrMsg(e))}</li>`).join('')}</ul></div>`:'';
  const W=ro?[]:tcWarns(D);
  const warns=W.length?`<div class="callout tc-warns" id="tcWarns"><b>Avisos (puedes enviar igual):</b><ul>${W.map(e=>`<li>${esc(tcErrMsg(e))}</li>`).join('')}</ul></div>`:'';
  const FPL={up:'Subiendo…',pend:'Pendiente de subir',err:'No se subió'};
  /* la foto va arriba, antes de la lista (auditoría 2, UX4): «Falta la foto» lleva aquí y abre la cámara */
  return`${ro?'':`<div class="tc-h"><h2>Revisar y enviar</h2><span id="tcTot3">${tot.v} vinieron · ${tot.f} no vinieron${tot.s?` · ${tot.s} sin marcar`:''} · ${tcH(tot.h)}${tot.e?' · '+tcH(tot.e)+' extra':''}</span></div>`}
   ${errs}${warns}
   <div class="tc-card${TCS.fotoHi&&!ro?' tc-hi':''}" id="tcFotoC"><div class="tc-lab">Foto del formato firmado${ro?'':' <span>obligatoria</span>'}</div>
    <div class="tc-fotos">${fotos.map(id=>`<div class="tc-th" data-fid="${esc(id)}"><img alt="Foto del formato" data-img="${esc(id)}">${ro?'':`<button type="button" data-tca="fx" aria-label="Quitar foto">✕</button>`}</div>`).join('')}
     ${FP.map(([id,P])=>`<div class="tc-th tc-fp ${P.st}" data-fpid="${esc(id)}"><img alt="Foto sin subir" data-img="${esc(id)}"><button type="button" data-tca="fpX" aria-label="Descartar foto">✕</button>
       <span class="tc-fps">${FPL[P.st]||''}${P.st==='err'?`<button type="button" class="tc-fpr" data-tca="fpRe">Reintentar</button>`:''}</span></div>`).join('')}
     ${ro?'':`<label class="tc-cam${TCS.busy?' busy':''}"><input type="file" id="tcFile" accept="image/*" capture="environment"><span>${TCS.busy?'Procesando…':fotos.length?'+ Otra foto':'📷 Tomar foto'}</span></label>`}</div>
    ${FP.some(([,P])=>P.st==='pend')?`<div class="tc-note" id="tcFpNote">Sin señal: la foto ${FP.some(([,P])=>P.mem)?'está solo en la memoria de la app; si la cierras, tendrás que tomarla de nuevo':'quedó guardada en el celular'}. Se subirá sola al volver la señal; recién entonces podrás enviar.</div>`:''}
    ${FP.some(([,P])=>P.st==='err')?`<div class="tc-err">${esc((FP.find(([,P])=>P.st==='err')[1].msg)||'La foto no se pudo subir.')} Toca «Reintentar» o tómala de nuevo.</div>`:''}
    ${!ro&&!fotos.length&&!FP.length?`<div class="tc-err">Toma una foto del formato con las firmas de todos.</div>`:''}</div>
   ${tcScale()}<div class="tc-list">${list}</div>`}
function tcErrMsg(e){const r=e.dni&&TCS.doc&&TCS.doc.rows&&TCS.doc.rows[e.dni];const m=String(e.msg||'');if(!r||!r.ape||m.includes(r.ape))return m;return tcNm(r)+': '+m}

/* ---------- miniaturas de las fotos ---------- */
function tcThumbs(){for(const img of $$('#tcRoot img[data-img]')){const id=img.dataset.img;if(TCS.img[id]){img.src=TCS.img[id];continue}
  if(TCS.imgReq[id])continue;TCS.imgReq[id]=1;fcol('tfot').doc(id).get().then(s=>{const d=s.exists&&s.data().d;if(d){TCS.img[id]=d;const el=$(`#tcRoot img[data-img="${CSS.escape(id)}"]`);if(el)el.src=d}}).catch(()=>{delete TCS.imgReq[id]})}}
/** reduce la foto hasta que su dataURL mida ≤ TC_FMAX caracteres (la misma medida que usa el servidor): 1600 px / 0.7 y bajando */
async function tcShrink(file){const url=URL.createObjectURL(file);try{
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('No se pudo leer la imagen.'));i.src=url});
  const out=(mx,q)=>{const k=Math.min(1,mx/Math.max(img.naturalWidth||1,img.naturalHeight||1));const c=document.createElement('canvas');c.width=Math.max(1,Math.round((img.naturalWidth||1)*k));c.height=Math.max(1,Math.round((img.naturalHeight||1)*k));
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)};
  for(const[mx,q]of[[1600,0.7],[1400,0.65],[1200,0.6],[1000,0.55],[900,0.5],[800,0.45],[640,0.4]]){const d=out(mx,q);if(d.length<=TC_FMAX)return d}
  throw new Error('La foto es demasiado grande. Tómala de nuevo, más de cerca.')}finally{URL.revokeObjectURL(url)}}
/* fotos sin confirmar guardadas en el celular (por si se cierra la app sin señal): localStorage lps.tcfp.<tareo> = {id: {n, d}} */
const tcFpK=()=>'lps.tcfp.'+tcId(TCS.date,TCS.cap);
function tcFpLS(){try{return JSON.parse(localStorage.getItem(tcFpK())||'{}')||{}}catch(e){return{}}}
/** guarda (d) o quita (d null) una foto pendiente del celular; false si no cupo */
function tcFpPut(id,n,d){try{const o=tcFpLS();if(d)o[id]={n,d};else delete o[id];
  if(Object.keys(o).length)localStorage.setItem(tcFpK(),JSON.stringify(o));else localStorage.removeItem(tcFpK());return true}catch(e){return false}}
/** al abrir un día: las fotos que quedaron sin confirmar se vuelven a subir */
function tcFpLoad(){const o=tcFpLS();const have=(TCS.doc&&TCS.doc.foto)||[];
  for(const[id,x]of Object.entries(o)){if(!x||!x.d||have.includes(id)){tcFpPut(id,0,null);continue}if(tcRO())continue;TCS.img[id]=x.d;TCS.fp[id]={n:x.n,st:'pend',msg:''};tcFotUp(id)}}
const tcOff=()=>typeof navigator!=='undefined'&&navigator.onLine===false;
/** sube una foto a tfot y solo cuando el servidor la confirma la agrega al tareo (doc.foto). Sin señal queda «Pendiente de subir». */
async function tcFotUp(id){const P=TCS.fp[id];const d=TCS.img[id];if(!P||!d||P.busy)return;
  const date=TCS.date,cap=TCS.cap;const ref=fcol('tfot').doc(id);const mine=()=>TCS.date===date&&TCS.cap===cap&&TCS.fp[id]===P;
  P.busy=true;P.st=tcOff()?'pend':'up';P.msg='';tcDraw();
  const slow=setTimeout(()=>{if(mine()&&P.busy&&P.st==='up'){P.st='pend';tcDraw()}},6000);
  let ok=false,err=null;
  try{await ref.set({date,cap,n:P.n,d,by:me.email,ts:NOW()});ok=true}
  catch(e){err=e;
    /* ¿ya estaba subida? (reintento después de cerrar la app: la primera escritura llegó y la segunda es rechazada) */
    try{const s=await ref.get({source:'server'});const x=s.exists&&s.data();if(x&&x.cap===cap&&x.d===d)ok=true}catch(e2){}}
  clearTimeout(slow);P.busy=false;
  if(ok){tcFpPut(id,0,null);if(!mine())return;delete TCS.fp[id];
    const D=TCS.doc;if(D&&!tcRO()){if(!(D.foto||[]).includes(id))D.foto=[...(D.foto||[]),id];tcChg();toast('Foto subida ✓')}else tcDraw();return}
  if(!mine())return;
  if(tcOff()||(err&&err.code==='unavailable')){P.st='pend';tcDraw();return}
  P.st='err';P.msg='No se pudo subir la foto'+(err&&err.code==='permission-denied'?' (el servidor la rechazó).':err&&(err.code||err.message)?' ('+(err.code||err.message)+').':'.');tcDraw()}
async function tcAddFoto(file){if(!file||tcRO())return;TCS.busy=true;TCS.fotoHi=false;tcDraw();
  try{const d=await tcShrink(file);const D=TCS.doc;const base=tcId(TCS.date,TCS.cap)+'_';
    let n=Math.max(0,...[...(D.foto||[]),...Object.keys(TCS.fp)].map(x=>+String(x).slice(base.length)||0))+1;
    for(let i=0;i<30;i++){let ex=false;try{ex=(await fcol('tfot').doc(base+n).get()).exists}catch(e){}if(!ex)break;n++}
    const id=base+n;TCS.img[id]=d;TCS.fp[id]={n,st:'up',msg:'',mem:!tcFpPut(id,n,d)};TCS.busy=false;
    tcFotUp(id)}
  catch(err){TCS.busy=false;tcDraw();toast(err.message||'No se pudo procesar la foto.')}}
/* al volver la señal se reintentan las fotos pendientes */
if(typeof window!=='undefined')window.addEventListener('online',()=>{for(const[id,P]of Object.entries(TCS.fp))if(P.st!=='up'&&!P.busy)tcFotUp(id)});

/* ---------- reabiertos de cualquier fecha («Por corregir») ---------- */
function tcReabSub(){const cap=tcMe();if(TCS.rsub&&TCS.rcap===cap)return;if(TCS.rsub){try{TCS.rsub()}catch(e){}}
  TCS.rcap=cap;TCS.reabL=[];
  TCS.rsub=fcol('tareo').where('cap','==',cap).where('st','==','reab').onSnapshot(q=>{if(!$('#tcRoot')){try{TCS.rsub()}catch(e){}TCS.rsub=null;TCS.rcap='';return}
    TCS.reabL=q.docs.map(x=>{const v=x.data()||{};return{date:v.date,mot:(v.reab&&v.reab.mot)||''}}).filter(x=>x.date).sort((a,b)=>a.date<b.date?-1:1);tcDraw()},()=>{});}

/* ---------- acciones ---------- */
function tcBind(root){
  root.addEventListener('click',e=>{const nmt=e.target.closest('[data-tcnm]');if(nmt){tcNmToast(nmt.dataset.tcnm);return}
    const f1=e.target.closest('[data-tcf1]');if(f1){TCS.f1=f1.dataset.tcf1;tcDraw();return}
    const f2=e.target.closest('[data-tcf2]');if(f2){TCS.f2=f2.dataset.tcf2;tcDraw();return}
    const d=e.target.closest('[data-tcd]');if(d&&!d.disabled){if(d.dataset.tcd!==TCS.date)tcOpen(d.dataset.tcd),tcDraw();return}
    const s=e.target.closest('[data-tcs]');if(s){tcGo(+s.dataset.tcs,!!s.closest('.tc-foot'));return}
    const b=e.target.closest('[data-tca]');if(!b||b.tagName==='INPUT')return;tcAct(b.dataset.tca,b,e)});
  root.addEventListener('change',e=>{const t=e.target;if(t.id==='tcFile'){const f=t.files&&t.files[0];t.value='';if(f)tcAddFoto(f);return}
    const a=t.dataset.tca;if(!a||tcRO())return;const D=TCS.doc;
    if(a==='alt'){const dni=t.closest('[data-dni]').dataset.dni;D.rows[dni].alt=t.checked;tcChg(false);return}
    if(a==='edAlt'&&TCS.ed){TCS.ed.alt=t.checked;return}
    if((a==='ini'||a==='fin')&&TCS.ed){TCS.ed[a]=t.value;TCS.edMsg='';tcDraw()}});
  root.addEventListener('input',e=>{const t=e.target;if(t.id==='tcPcQ'){TCS.pcQ=t.value;const l=$('#tcPcL');if(l)l.innerHTML=tcPcList()}
    else if(t.id==='tcAddQ'){TCS.addQ=t.value;const l=$('#tcAddL');if(l)l.innerHTML=tcAddList()}
    else if(t.id==='tcQ1'){TCS.q1=t.value;tcDraw()}else if(t.id==='tcQ2'){TCS.q2=t.value;tcDraw()}});
  root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.tcnm){e.preventDefault();tcNmToast(e.target.dataset.tcnm);return}if(e.key==='Enter'&&e.target.id==='tcPcQ'){const f=$('#tcPcL [data-tca="pc"]');if(f){e.preventDefault();f.click()}}})}
/** lleva al primer problema: falta marcar o motivo (paso 1), cruce, partida bloqueada o sin horas (paso 2), foto (paso 3). true si llevó a alguno. */
function tcFix(E){const D=TCS.doc;if(!D)return false;E=E||tcErrs(D);
  const e1=E.find(e=>TC_K1.includes(e.k));
  if(e1){TCS.need=true;TCS.step=1;TCS.ed=null;TCS.q1='';TCS.f1='all';TCS.foc=e1.dni?`.tc-ob[data-dni="${CSS.escape(e1.dni)}"]`:'';tcDraw();
    const n=E.filter(e=>e.k==='asis').length;toast(n?`Falta marcar si ${n===1?'vino 1 obrero':`vinieron ${n} obreros`}.`:tcErrMsg(e1));return true}
  const C=tcCruces(D);
  if(C.length){TCS.step=2;TCS.ed=null;TCS.cx={...C[0]};TCS.foc=`.tc-bar[data-dni="${CSS.escape(C[0].dni)}"]`;tcDraw();toast('Hay un cruce de horario: elige cómo resolverlo.');return true}
  const e2=E.find(e=>TC_K2.includes(e.k));
  if(e2){TCS.step=2;TCS.ed=null;TCS.foc=e2.bid?`.tc-blq[data-bid="${CSS.escape(e2.bid)}"]`:e2.dni?`.tc-bar[data-dni="${CSS.escape(e2.dni)}"]`:'.tc-blq';tcDraw();toast(tcErrMsg(e2));return true}
  if(E.length){TCS.step=3;TCS.ed=null;TCS.foc='#tcFotoC';if(E.some(e=>e.k==='foto'))TCS.fotoHi=true;tcDraw();toast(tcErrMsg(E[0]));return true}
  return false}
function tcGo(n,foot){if(TCS.ed){TCS.ed=null;TCS.edMsg=''}n=Math.max(1,Math.min(3,n));const D=TCS.doc;
  if(D&&!tcRO()&&n>1){const E=tcErrs(D);
    /* no se pasa del paso 1 sin marcar a todos (y su motivo si no vinieron) */
    if(E.some(e=>TC_K1.includes(e.k))){tcFix(E);return}
    /* «Revisar y enviar» lleva al primer cruce o partida bloqueada */
    if(foot&&n===3&&E.some(e=>e.k==='cruce'||e.k==='bloq')){tcFix(E.filter(e=>e.k==='cruce'||e.k==='bloq'));return}}
  TCS.step=n;TCS.cx=null;tcDraw();const b=$('#tcBody');if(b)b.scrollTop=0}
const tcBid=()=>'b'+Math.random().toString(36).slice(2,9);
async function tcAct(a,b){if(tcRO())return;const D=TCS.doc;if(!D)return;const R=D.rows=D.rows||{};const dniOf=()=>{const w=b.closest('[data-dni]');return w&&w.dataset.dni};
  const bidOf=()=>{const w=b.closest('[data-bid]');return w&&w.dataset.bid};const blk=id=>(D.blq||[]).find(x=>x.id===id);
  /* asistencia: el que no vino sigue en sus trabajos (tCalc le da 0 h); al volver a «vino» recupera sus horas */
  if(a==='vino'||a==='novino'){const r=R[dniOf()];if(!r)return;if(a==='vino'){if(r.as===true)return;r.as=true;r.mot=''}else{if(r.as===false)return;r.as=false;r.alt=false}tcChg();return}
  if(a==='todos'){let n=0;for(const r of Object.values(R))if(tcSinM(r)){r.as=true;r.mot='';n++}if(n){tcChg();toast(`${n} ${n===1?'marcado':'marcados'} como «vino».`)}return}
  if(a==='mot'){const r=R[dniOf()];if(!r)return;r.mot=r.mot===b.dataset.v?'':b.dataset.v;tcChg();return}/* opcional: tocar el elegido lo quita */
  /* después de una confirmación (uiAsk espera al usuario) se vuelve a leer TCS.doc: mientras la ventana está abierta el guardado
     automático (tcSaveNow) o la llegada de la base lo reemplazan por otro objeto, y cambiar el viejo no hacía nada (había que
     borrar dos veces). */
  const cur=date=>{const x=TCS.doc;return x&&TCS.date===date&&!tcRO()?x:null};
  if(a==='rm'){const dni=dniOf();const r=R[dni];if(!r)return;const date=TCS.date;if(!await uiAsk({title:'¿Quitar del tareo?',text:`${tcNm(r)} sale del tareo de este día (no se borra del personal).`,ok:'Quitar',tone:'warn'}))return;
    const D2=cur(date);if(!D2||!D2.rows)return;delete D2.rows[dni];for(const k of D2.blq||[])k.dnis=(k.dnis||[]).filter(x=>x!==dni);tcChg();return}
  if(a==='addOn'){TCS.addOn=true;TCS.addQ='';tcDraw();const i=$('#tcAddQ');if(i)i.focus();return}
  if(a==='addOff'){TCS.addOn=false;tcDraw();return}
  /* obrero de otra cuadrilla (de otro capataz o sin capataz): se permite con confirmación y queda ajeno/capOrig para la oficina */
  if(a==='add'){const p=S.tper.get(b.dataset.v);if(!p)return;const aj=(p.cap||'')!==TCS.cap;const date=TCS.date;
    if(aj&&!await uiAsk({title:'No es de tu cuadrilla',text:`${tName(p)} no es de tu cuadrilla (es ${tcCapOrig(p.cap||'')}). ¿Lo tareas igual?`,note:'La oficina verá que no es de tu cuadrilla.',ok:'Tarear igual',tone:'warn'}))return;
    const D2=cur(date);if(!D2)return;const R2=D2.rows=D2.rows||{};
    R2[p.dni||p.id]=aj?{...tcRowOf(p,true),ajeno:true,capOrig:p.cap||''}:tcRowOf(p,true);TCS.addQ='';TCS.addOn=false;tcChg();toast(tName(p)+' agregado (vino).');return}
  if(a==='new'){const ed={id:tcBid(),nuevo:true,pc:'',ini:'',fin:'',dnis:tcPres().map(x=>x[0]),alt:false};
    /* por defecto: lo que queda de la jornada desde el último trabajo de los que vinieron */
    const J=tcJor(TCS.date);const p1=tcAtajos(D,ed).find(x=>x[0]==='p1');const z=tMin(J.j.fin);
    if(p1&&p1[2]!==J.j.ini){const s=tMin(p1[2]);ed.ini=p1[2];ed.fin=s<z?J.j.fin:p1[3]}else[ed.ini,ed.fin]=J.S.todo;
    /* marcados por defecto: solo los que aún tienen horas por repartir y no se cruzan con ese horario */
    ed.dnis=tcLibres(D,ed);
    TCS.ed=ed;TCS.q2='';TCS.f2='all';TCS.pcQ='';TCS.edMsg='';TCS.cx=null;tcDraw();const b2=$('#tcBody');if(b2)b2.scrollTop=0;return}
  if(a==='edit'){const k=blk(bidOf());if(!k)return;const pv=(k.dnis||[]).filter(d=>tcVino(R[d]));
    TCS.ed={...k,dnis:[...(k.dnis||[])].filter(d=>R[d]),alt:pv.length>0&&pv.every(d=>R[d].alt),nuevo:false};if(tcBloq(k.pc))TCS.ed.pc='';TCS.q2='';TCS.f2='all';TCS.pcQ='';TCS.edMsg='';TCS.cx=null;tcDraw();const b2=$('#tcBody');if(b2)b2.scrollTop=0;return}
  if(a==='dup'){const k=blk(bidOf());if(!k)return;TCS.ed={id:tcBid(),nuevo:true,pc:tcBloq(k.pc)?'':k.pc,ini:k.ini,fin:k.fin,dnis:[...(k.dnis||[])].filter(d=>R[d]),alt:false};TCS.q2='';TCS.f2='all';TCS.edMsg='';TCS.cx=null;tcDraw();return}
  if(a==='del'){const k=blk(bidOf());if(!k)return;const date=TCS.date;if(!await uiAsk({title:'¿Borrar este trabajo?',text:`${tcPcName(k.pc)} · ${tcT(k.ini)}–${tcT(k.fin)}`,ok:'Borrar',tone:'warn'}))return;
    const D2=cur(date);if(!D2)return;D2.blq=(D2.blq||[]).filter(x=>x.id!==k.id);if(TCS.cx&&(TCS.cx.a===k.id||TCS.cx.b===k.id))TCS.cx=null;tcChg();return}
  if(a==='copy'&&TCS.prev){const act=new Set(tcPcs().map(x=>x.id));
    D.blq=TCS.prev.blq.filter(k=>act.has(k.pc)).map(k=>({id:tcBid(),pc:k.pc,ini:k.ini,fin:k.fin,dnis:(k.dnis||[]).filter(d=>R[d])}));tcChg();toast(`Se copiaron ${D.blq.length} trabajos: revisa quiénes y los horarios.`);return}
  if(a==='send')return tcSend();
  if(a==='fpX'){const w=b.closest('[data-fpid]');if(!w)return;const id=w.dataset.fpid;delete TCS.fp[id];tcFpPut(id,0,null);tcDraw();return}
  if(a==='fpRe'){const w=b.closest('[data-fpid]');if(w)tcFotUp(w.dataset.fpid);return}
  if(a==='fx'){const w=b.closest('[data-fid]');if(!w)return;D.foto=(D.foto||[]).filter(x=>x!==w.dataset.fid);tcChg();return}
  if(a==='fix'){tcFix();return}
  if(a==='foto'){tcFotoGo();return}
  if(a==='f1x'){TCS.q1='';TCS.f1='all';tcDraw();return}
  if(a==='f2x'){TCS.q2='';TCS.f2='all';tcDraw();return}
  /* cruces desde la línea de tiempo */
  if(a==='cx'){const dni=dniOf();TCS.cx={dni,a:b.dataset.a,b:b.dataset.b};tcDraw();return}
  if(a==='tlX'){TCS.cx=null;tcDraw();return}
  if(a==='tlRm'||a==='tlIni'||a==='tlFin'){const x=TCS.cx;if(!x)return;const ka=blk(x.a),kb=blk(x.b);if(!ka||!kb){TCS.cx=null;tcDraw();return}
    if(a==='tlRm'){const k=blk(b.dataset.v);if(k)k.dnis=(k.dnis||[]).filter(d=>d!==x.dni)}
    else if(a==='tlIni')kb.ini=ka.fin;else ka.fin=kb.ini;
    TCS.cx=null;tcChg();toast(a==='tlRm'?'Listo: se quitó de ese trabajo.':'Listo: horario ajustado.');return}
  /* editor de un trabajo */
  const e=TCS.ed;if(!e)return;
  if(a==='pc'){e.pc=b.dataset.v;TCS.edMsg='';tcDraw();return}
  if(a==='pcX'){e.pc='';TCS.pcQ='';tcDraw();const i=$('#tcPcQ');if(i)i.focus();return}
  if(a==='sc'){const v=tcAtajos(D,e).find(x=>x[0]===b.dataset.v);if(v){e.ini=v[2];e.fin=v[3];TCS.edMsg='';tcDraw()}return}
  if(a==='who'){const dni=b.dataset.v;e.dnis=e.dnis.includes(dni)?e.dnis.filter(x=>x!==dni):[...e.dnis,dni];tcDraw();return}
  if(a==='libres'||a==='none'){const p=tcPres().map(x=>x[0]);const keep=e.dnis.filter(d=>!p.includes(d));/* los que no vinieron siguen en el trabajo */
    e.dnis=a==='none'?keep:[...keep,...tcLibres(D,e)];TCS.edMsg='';tcDraw();return}
  if(a==='cxQuitar'){const g=tcEdCx(D,e).g.find(x=>x.k.id===b.dataset.v);if(g)e.dnis=e.dnis.filter(d=>!g.dnis.includes(d));TCS.edMsg='';tcDraw();return}
  if(a==='cxEste'){const k=blk(b.dataset.v);const v=k&&tcAdjEste(e,k);if(v){if(v.ini)e.ini=v.ini;if(v.fin)e.fin=v.fin}TCS.edMsg='';tcDraw();return}
  if(a==='cxOtro'){const k=blk(b.dataset.v);if(!k)return;const v=tcAdjOtro(e,k);
    if(v){if(v.ini)k.ini=v.ini;if(v.fin)k.fin=v.fin;toast(`Se ajustó ${tcPcCod(k.pc)}: ${tcT(k.ini)}–${tcT(k.fin)}.`)}
    else{const g=tcEdCx(D,e).g.find(x=>x.k.id===k.id);if(g)k.dnis=(k.dnis||[]).filter(d=>!g.dnis.includes(d));toast(`Se quitó del otro trabajo (${tcPcCod(k.pc)}).`)}
    TCS.edMsg='';tcChg();return}
  if(a==='edCancel'){TCS.ed=null;TCS.edMsg='';tcDraw();return}
  if(a==='edOk'){const ini=($('#tcIni')||{}).value||e.ini,fin=($('#tcFin')||{}).value||e.fin;e.ini=ini;e.fin=fin;
    const x=tMin(ini),y=tMin(fin);let m='';
    if(!e.pc)m='Elige la partida.';else if(tcBloq(e.pc))m='Esta partida está bloqueada por costos: cámbiala.';
    else if(x==null||y==null)m='Pon la hora de inicio y de fin.';else if(y<=x)m='La hora de fin debe ser después de la de inicio.';else if(x<300||y>1439)m='El horario debe estar entre 05:00 y 23:59.';
    else if(!e.dnis.some(d=>tcVino(R[d])))m='Elige al menos un obrero que vino.';
    else if(tcEdCx(D,e).g.length)m='Hay obreros que se cruzan con otro trabajo: elige una opción en el recuadro rojo.';
    if(m){TCS.edMsg=m;tcDraw();if(m.startsWith('Hay obreros')){TCS.foc='.tc-cxp';tcFocusNow()}return}
    const k={id:e.id,pc:e.pc,ini,fin,dnis:e.dnis.filter(d=>R[d])};const L=D.blq=Array.isArray(D.blq)?D.blq:[];const i=L.findIndex(z=>z.id===e.id);if(i>=0)L[i]=k;else L.push(k);
    if(e.alt)for(const d of e.dnis)if(tcVino(R[d]))R[d].alt=true;
    if(e.nuevo)tcUseAdd(e.pc);TCS.ed=null;TCS.edMsg='';tcChg();const b2=$('#tcBody');if(b2)b2.scrollTop=0}}
async function tcSend(){const D=TCS.doc;if(!D||tcRO())return;const E=tcErrs(D);if(E.length){if(!tcFix(E))toast(tcErrMsg(E[0]));return}
  const C=tcCalc(D);const rows=Object.values(C.rows||{});const v=rows.filter(tcVino);const hh=tR2(v.reduce((s,r)=>s+(+r.trab||0),0)),he=tR2(v.reduce((s,r)=>s+(+r.ext||0),0));
  if(!await uiAsk({title:'¿Enviar el tareo?',text:`${fmtD(TCS.date)}: ${v.length} vinieron, ${rows.length-v.length} no vinieron · ${tcH(hh)}${he?` (${tcH(he)} extra)`:''}.`,note:'Después de enviarlo ya no podrás cambiarlo; si hay un error, el asistente de tareo te lo reabre.',ok:'Enviar tareo',tone:'ok'}))return;
  const prev={st:D.st,envAt:D.envAt,envBy:D.envBy,hist:D.hist,cfg:D.cfg,envN:D.envN};const t=NOW();
  /* envN: contador de envíos (1 el primero, +1 en cada reenvío de un reabierto); la oficina ata el cotejo a este ciclo */
  D.st='env';D.envAt=t;D.envBy=me.email;D.envN=(Number.isInteger(D.envN)&&D.envN>0?D.envN:0)+1;D.hist=[...(Array.isArray(D.hist)?D.hist:[]),{t,by:me.email,a:'env'}];
  /* jornada del día congelada en el tareo (si ya la tiene, p. ej. un reabierto, se conserva) */
  if(!D.cfg&&typeof tCfgDia==='function'){try{const c=tCfgDia(TCS.date);if(c)D.cfg=c}catch(e){}}
  const date=TCS.date;clearTimeout(TCS.sendT);TCS.sendSt=tcOff()?'queued':'sending';TCS.err='';const p=tcSaveNow();tcDraw();
  /* «Enviado ✓» solo cuando el servidor lo confirma; si tarda (sin señal) queda «Se enviará al tener señal» */
  TCS.sendT=setTimeout(()=>{if(TCS.date===date&&TCS.sendSt==='sending'){TCS.sendSt='queued';tcDraw()}},2500);
  p.then(()=>{if(TCS.date!==date)return;clearTimeout(TCS.sendT);TCS.sendSt='ok';TCS.srvPend=false;tcDraw();toast('Tareo enviado ✓')},
  /* si la base lo rechaza, vuelve a borrador (o reabierto) con el error */
    err=>{if(TCS.date!==date||!TCS.doc)return;clearTimeout(TCS.sendT);TCS.sendSt='';for(const[k,v]of Object.entries(prev)){if(v===undefined)delete TCS.doc[k];else TCS.doc[k]=v}TCS.dirty=false;
      TCS.err='No se pudo enviar el tareo: '+(err&&err.code==='permission-denied'?'el servidor lo rechazó.':(err&&(err.code||err.message))||'error')+' Revisa y vuelve a intentarlo.';tcDraw();toast('No se pudo enviar el tareo.')})}
