"use strict";
/* LPS 911 · Módulo Tareo: pantalla del capataz del tareo (rol `tcap`) en el celular.
   Contrato en docs/ia/tareo.md («Contrato "horas por cantidad"» e «Implementación de la grilla — capataz»). Cuatro pasos, como el
   formato físico: ¿quién vino? · trabajos del día (partidas) · horas (grilla: obreros en filas, partidas en columnas) · revisar y
   enviar (la misma grilla en solo lectura). Ver también «Grilla como el formato — capataz».
   Los tareos nuevos son modo:'hrs' (rows[dni].h = {pcId: horas}). Un tareo antiguo con bloques (blq, sin modo) se ve en solo lectura
   y, si aún se puede editar (borrador o reabierto), se pasa a horas por partida con un botón (conserva las horas de cada obrero).
   Guarda el borrador solo (≈1 s después del último cambio) en tareo/{fecha}_{capId}; con la persistencia de Firestore funciona sin señal.
   Los cálculos (tCalc, tValida, tHrsTot, tJorDia) son de tareo.js.
   Auditorías F2 y segunda: la foto cuenta solo cuando el servidor confirmó su escritura (TCS.fp), «Enviado ✓» solo confirmado, «Por
   corregir» con los reabiertos de cualquier fecha, jornada desde doc.cfg/tCfgDia, envN, contadores, nombres identificables, buscador,
   foto arriba y días enviados en solo lectura.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* motivos de ausencia (el más común primero) */
const TC_MOT=[['FA','Falta'],['DM','Descanso médico'],['VA','Vacaciones'],['DA','Descanso por accidente'],['SU','Suspensión'],['SE','Subsidio por enfermedad'],['SM','Subsidio por maternidad'],['LS','Licencia sin goce'],['L','Liquidado']];
const TC_RO=['env','rev','pub'];
/* estado de la pantalla (no va en U: es del día que se está llenando) */
const TCS={date:'',cap:'',unsub:null,doc:null,loaded:false,exists:false,step:1,dirty:false,saveT:0,inflight:0,pend:false,err:'',slowT:0,
  addOn:false,addQ:'',past:{},prev:null,img:{},imgReq:{},busy:false,need:false,foc:'',
  /* fotos aún no confirmadas por el servidor: {id: {n, st:'up'|'pend'|'err', msg, mem}} (no están en doc.foto hasta confirmarse) */
  fp:{},
  /* envío: '' · 'sending' (esperando al servidor) · 'queued' (sin señal: se enviará solo) · 'ok'; srvPend = la última foto de la base tiene escrituras pendientes */
  sendSt:'',sendT:0,srvPend:false,
  /* tareos propios reabiertos (cualquier fecha): [{date, mot}] */
  reabL:[],rsub:null,rcap:'',
  /* buscador y filtro de la cuadrilla (paso 1: all · sin · no); no cambian datos */
  q1:'',f1:'all',lbl:null,fotoHi:false,
  /* plegables del paso 1 (dni con el motivo / la hora de salida abiertos), buscador de partidas (paso 2), celda abierta (paso 3)
     y aviso «Gira el celular» descartado (null = aún no leído de localStorage) */
  motO:'',salO:'',pcOn:false,pcSh:false,pcQ:'',cell:null,rotX:null,
  /* carga rápida (20-10-2026): multi = Set de dni elegidos en la grilla · asg = hoja «Asignar a varios» · wk = dni con la hoja de su día
     abierta · rep = resultado de «Repetir ayer» (aviso arriba de la grilla) · repD = dni → horas que dejó «Repetir» (la hoja «no cuadra»
     ofrece primero ajustarlas al horario si siguen siendo las copiadas) */
  multi:null,asg:null,wk:'',rep:null,hfx:'',repD:null,mpc:'',mpcV:null,reabO:false,
  /* rediseño (22-10-2026): menu = 'day'|'more' (menús de la barra) · ob = dni con la hoja del obrero (paso 1) · pcm = partida con su menú
     (paso 3) · cellW = campo para escribir abierto en la casilla · prevDone = ya se buscó el tareo anterior (para no mover la pantalla) */
  menu:'',ob:'',pcm:'',cellW:false,prevDone:false};
/* el servidor rechaza fotos de más de 1 000 000 de caracteres (firestore.rules); se mide igual, con margen */
const TC_FMAX=950000;
/* horas rápidas del editor de celda */
const TC_QH=[1,2,3,4,4.5,5,5.5,6,7,8,8.5];
const TC_HTOP=24;

const tcCalc=d=>tCalc(d);

/* ---------- utilidades ---------- */
/** id del capataz en members: correo, o 'u_<uid>' si entró con enlace (base.js arma me.email así) */
/* «Ver como» Capataz (tareo) con un capataz elegido (solo copia de prueba): se ve su cuadrilla y su tareo; se guarda con el usuario real (admin) */
const tcMe=()=>(typeof VA!=='undefined'&&VA&&VA.role==='tcap'&&VA.cap)?VA.cap:(typeof myMid==='function'?myMid():((me&&me.email)||''));
const tcId=(d,c)=>d+'_'+c;
/** hora para leer: '07:30' → '7:30' */
const tcT=s=>String(s||'').replace(/^0(\d)/,'$1');
const tcH=v=>tHtxt(v)+' h';
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
/** tareo antiguo (por horarios: bloques sin modo:'hrs'). Se muestra en solo lectura; si se puede editar, se pasa a horas por partida. */
const tcLegacy=D=>!!D&&!tEsHrs(D)&&Array.isArray(D.blq)&&D.blq.length>0;
/* asistencia: as true = vino · false = no vino · null/ausente = sin marcar */
const tcVino=r=>!!r&&r.as===true;
const tcFalto=r=>!!r&&r.as===false;
const tcSinM=r=>!!r&&r.as!==true&&r.as!==false;
/** configuración del día: la congelada en el tareo (doc.cfg) si la tiene; si no, la actual (tCfgDia). Es la misma que usa tCalc. */
function tcCfg(date){const D=TCS.doc;return D&&date===TCS.date&&D.cfg&&D.cfg.v===1?D.cfg:tCfgDia(date)}
/** jornada del día (auditoría 2, A5: la misma configuración que tCalc). h = horas de jornada (0 en no laborable: todo es extra);
    full = las horas que pone «Toda la jornada» (en no laborable, la jornada de ese día de semana o la del lunes, como referencia). */
function tcJor(date){const c=tcCfg(date);const Dd=tDia(date,c);const T=TC();
  const j=Dd.j||(c.jor&&c.jor.ini&&c.jor.fin?c.jor:null)||T.jor['1']||{ini:'07:30',fin:'17:00',ref:60};
  return{j,h:Dd.jh,nl:Dd.nl,full:Dd.jh||tJorH(j)||8.5}}
/** por qué el día es no laborable: feriado (con su nombre) o día sin jornada (domingo) */
function tcNlWhy(date){const c=tcCfg(date);if(c.fer){const n=(TC().ferN||{})[date];return`Feriado${n?': '+n:''}.`}
  return`${TC_DN[pd(date).getUTCDay()]}: sin jornada ordinaria.`}
/** cuadrilla: activos del máster con cap == mi id */
function tcCrew(date){const cap=TCS.cap;return[...S.tper.values()].filter(p=>p&&!p.arch&&p.cap===cap&&tActivo(p,date))}
const tcRowOf=(p,as=null)=>({ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as,mot:'',alt:false,ini:'',fin:'',h:{},trab:0,ext:0});
function tcNewDoc(date){const rows={};for(const p of tcCrew(date))rows[p.dni||p.id]=tcRowOf(p);
  return{date,cap:TCS.cap,capN:(MEM.get(TCS.cap)||{}).name||'',st:'bor',modo:'hrs',pcs:[],rows,foto:[],hist:[]}}
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
const tcPcNom=id=>{const x=id&&S.tpc.get(id);return x?x.nom||'':''};
/** horas de una celda */
const tcHv=(r,pc)=>{const v=+(r&&r.h&&r.h[pc]);return Number.isFinite(v)&&v>0?v:0};
function tcSetH(r,pc,v){r.h=r.h&&typeof r.h==='object'?r.h:{};v=tR2(Math.max(0,Math.min(TC_HTOP,+v||0)));if(v>0)r.h[pc]=v;else delete r.h[pc]}
/** horas cargadas en una partida (de todos, también de los que no vinieron: se conservan) */
const tcPcHrs=(D,pc)=>tR2(Object.values(D.rows||{}).reduce((s,r)=>s+tcHv(r,pc),0));
/* horario del obrero (tHorRow de tareo.js): entrada y salida (las de la jornada si no se cambiaron) y corrido */
const tcHor=r=>tHorRow(r,TCS.date,tcCfg(TCS.date));
/** horas que debe tener en partidas: las de su horario (o la jornada de referencia si el día no tiene jornada y no escribió horario) */
const tcHorH=r=>{const H=tcHor(r);return H&&!H.bad?H.h:tcJor(TCS.date).full};
const tcHorTxt=H=>H?`${tcT(H.ent)}–${tcT(H.sal)}${H.cor?' · corrido':''}`:'';
const tcHm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
/** número escrito por el capataz («6,5», «6.5», «6½»): horas (a 0,01, como las guarda tR2; antes se redondeaba a ¼ sin avisar) o null */
const tcNumIn=v=>{const t=String(v==null?'':v).trim().replace('½','.5').replace(',','.');if(t==='')return 0;const n=+t;return Number.isFinite(n)&&n>=0?tR2(n):null};
/** reparte horas (h: {pc: horas}) en proporción para que sumen tot, en múltiplos de 0,25; el residuo va a la partida mayor.
    Si ya suman tot, quedan igual (auditoría 21-10-2026: «Repetir ayer» y «Ajustar sus horas a su horario»). */
function tcRepartir(h,tot){const E=Object.entries(h||{}).filter(([,v])=>tHv(v)>0).sort((a,b)=>b[1]-a[1]);const s=tR2(E.reduce((x,[,v])=>x+(+v),0));
  if(!E.length||!(tot>0))return{};if(Math.abs(s-tot)<0.01)return Object.fromEntries(E.map(([k,v])=>[k,tR2(+v)]));
  const o={};let f=0;for(const[k,v]of E){const n=Math.floor((+v)/s*tot*4+1e-9)/4;o[k]=n;f+=n}
  o[E[0][0]]=tR2(o[E[0][0]]+tot-f);for(const k of Object.keys(o))if(!(o[k]>0))delete o[k];return o}
/** HE del día en texto: «3 h extra (2 al 60 %, 1 al 100 %)» con los parámetros de planilla */
function tcHeTxt(h,J){if(J.nl)return h?`${tcH(h)} · todo extra`:'';const x=tR2(Math.max(0,h-J.h));if(!x)return'';const P=typeof TPL==='function'?TPL():{he60h:2,sob1:60,sob2:100};
  const a=Math.min(P.he60h,x),b=tR2(x-a);return`${tcH(x)} extra (${tHtxt(a)} al ${P.sob1} %${b?`, ${tHtxt(b)} al ${P.sob2} %`:''})`}

/** problemas para enviar: tValida (sin los avisos) + sin marcar + fotos sin subir + partida bloqueada que sigue en los trabajos.
    El motivo de «no vino» es opcional (observaciones del dueño, oct 2026). */
function tcErrs(D){if(tcLegacy(D))return[{dni:null,k:'legacy',msg:'Este tareo es del formato anterior: pásalo a horas por partida.'}];
  const E=tValida(tcCalc(D)).filter(e=>!e.warn);
  const np=Object.keys(TCS.fp).length;if(np)E.push({dni:null,k:'fotp',msg:np===1?'Hay una foto sin subir: espera a que suba o reintenta.':`Hay ${np} fotos sin subir: espera a que suban o reintenta.`});
  const pre=tcRows().filter(([,r])=>tcSinM(r)).map(([dni,r])=>({dni,k:'asis',msg:`${tcNm(r)||dni}: marca si vino o no vino.`}));
  for(const pc of D.pcs||[])if(tcBloq(pc)&&!E.some(e=>e.k==='bloq'&&e.pc===pc))E.push({dni:null,k:'bloq',pc,msg:`La partida ${tcPcCod(pc)} está bloqueada por costos: quítala.`});
  return[...pre,...E.filter(e=>e.k!=='marca')]}
/* a qué paso lleva cada problema */
const TC_K1=['asis','vacio'],TC_K2=['pcs','bloq'],TC_K3=['sinh','hval','hmax','hor'];
/** avisos de tValida que no impiden enviar (warn: jornada parcial…) */
const tcWarns=D=>tcLegacy(D)?[]:tValida(tcCalc(D)).filter(e=>e.warn);

/* ---------- datos: suscripción y guardado ---------- */
function tcOpen(date){tcClose();clearTimeout(TCS.slowT);clearTimeout(TCS.sendT);Object.assign(TCS,{date,cap:tcMe(),doc:null,loaded:false,exists:false,step:1,dirty:false,inflight:0,busy:false,pend:false,err:'',addOn:false,addQ:'',prev:null,need:false,foc:'',fp:{},sendSt:'',srvPend:false,q1:'',f1:'all',fotoHi:false,motO:'',salO:'',pcOn:false,pcSh:false,pcQ:'',cell:null,multi:null,asg:null,wk:'',rep:null,hfx:'',repD:null,mpc:'',mpcV:null,reabO:false,menu:'',ob:'',pcm:'',cellW:false,prevDone:false});
  const id=tcId(date,TCS.cap);TCS.fpL=false;
  /* includeMetadataChanges: avisa también cuando una escritura pendiente (sin señal) queda confirmada por el servidor */
  TCS.unsub=fcol('tareo').doc(id).onSnapshot({includeMetadataChanges:true},s=>{if(!$('#tcRoot')){tcClose();return}tcSnap(s)},err=>{TCS.err=err&&err.code==='permission-denied'?'Tu cuenta no puede abrir este tareo.':'Sin conexión con la base de datos.';TCS.loaded=true;tcDraw()});
  /* estado de ayer y anteayer (los enviados se abren en solo lectura) */
  {const hoy=todayIso();for(const n of[1,2]){const d=tcDay(hoy,-n);fcol('tareo').doc(tcId(d,TCS.cap)).get().then(s=>{TCS.past[d]=s.exists?(s.data().st||'bor'):'';if($('#tcRoot'))tcDraw()}).catch(()=>{})}}
  /* el tareo anterior con trabajos (hasta 3 días atrás): para «Copiar los trabajos de ayer» y «Copiar horas de ayer» */
  /* prevDone: mientras se busca, «Repetir»/«Copiar» ocupan su lugar deshabilitados (así la pantalla no salta al llegar; auditoría 22-10) */
  (async()=>{try{for(let n=1;n<=3;n++){const d=tcDay(date,-n);try{const s=await fcol('tareo').doc(tcId(d,TCS.cap)).get();if(!s.exists)continue;const v=s.data()||{};
    const hrs=tEsHrs(v);const pcs=hrs?(Array.isArray(v.pcs)?v.pcs:[]):[...new Set((Array.isArray(v.blq)?v.blq:[]).map(k=>k&&k.pc).filter(Boolean))];
    if(pcs.length){if(TCS.date===date)TCS.prev={date:d,pcs,hrs,rows:v.rows||{}};return}}catch(e){return}}}
    finally{if(TCS.date===date){TCS.prevDone=true;if($('#tcRoot'))tcDraw()}}})()}
function tcClose(){if(TCS.unsub){try{TCS.unsub()}catch(e){}TCS.unsub=null}if(TCS.rsub&&!$('#tcRoot')){try{TCS.rsub()}catch(e){}TCS.rsub=null;TCS.rcap=''}if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0;if(TCS.dirty)tcSaveNow().catch(()=>{})}}
function tcSnap(s){const pend=!!(s.metadata&&s.metadata.hasPendingWrites);TCS.loaded=true;TCS.srvPend=pend;
  /* eco de la escritura propia; si tarda en confirmarse, slowT avisa que quedó en el celular. Si aún no hay nada en pantalla
     (se abrió la app sin señal con cambios guardados en el celular), se muestra lo del celular. */
  if(pend&&TCS.doc){tcStatus();if(tcRO())tcDraw();return}
  if(!pend&&TCS.sendSt==='queued'&&!TCS.inflight)TCS.sendSt='ok';
  if(!TCS.inflight)TCS.pend=false;
  if(TCS.dirty||TCS.inflight){tcStatus();return}/* lo local manda mientras hay cambios por guardar */
  TCS.exists=s.exists;TCS.doc=s.exists?s.data():tcNewDoc(TCS.date);
  /* un borrador sin trabajos y sin modo (de antes de la grilla) pasa a horas por partida (se guarda con el próximo cambio) */
  const D=TCS.doc;if(!tcRO()&&!tcLegacy(D)&&!tEsHrs(D)){D.modo='hrs';if(!Array.isArray(D.pcs))D.pcs=[]}
  if(tEsHrs(D)&&!Array.isArray(D.pcs))D.pcs=[];
  if(!tcRO())tcSyncCrew();
  /* fotos que quedaron sin confirmar en el celular: se suben de nuevo (una vez por día abierto, ya con el tareo cargado) */
  if(!TCS.fpL){TCS.fpL=true;tcFpLoad()}
  tcDraw()}
/** agrega a la lista a quien entró a la cuadrilla después (sin marcar) */
function tcSyncCrew(){if(tcLegacy(TCS.doc))return;const R=TCS.doc.rows=TCS.doc.rows||{};for(const p of tcCrew(TCS.date)){const k=p.dni||p.id;if(!R[k])R[k]=tcRowOf(p)}}
/** marca un cambio: recalcula, redibuja y guarda en ~1 s */
function tcChg(redraw=true){if(tcRO()||tcLegacy(TCS.doc))return;TCS.dirty=true;if(TCS.saveT)clearTimeout(TCS.saveT);TCS.saveT=setTimeout(()=>{TCS.saveT=0;tcSaveNow().catch(()=>{})},1000);if(redraw)tcDraw();else tcStatus()}
function tcSaveNow(){if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0}if(!TCS.doc)return Promise.resolve();
  const d=tcCalc({...TCS.doc,date:TCS.date,cap:TCS.cap,capN:TCS.doc.capN||(MEM.get(TCS.cap)||{}).name||''});d.by=me.email;d.ts=NOW();
  if(!Array.isArray(d.foto))d.foto=[];if(!Array.isArray(d.hist))d.hist=[];
  if(tEsHrs(d)){if(!Array.isArray(d.pcs))d.pcs=[]}else if(!Array.isArray(d.blq))d.blq=[];
  TCS.doc=d;TCS.dirty=false;TCS.inflight++;TCS.err='';
  clearTimeout(TCS.slowT);TCS.slowT=setTimeout(()=>{if(TCS.inflight){TCS.pend=true;tcStatus()}},2500);tcStatus();
  const date=TCS.date;const ref=fcol('tareo').doc(tcId(date,TCS.cap));
  /* el cotejo de la oficina (cot, cotFot) no es del capataz: nunca se reescribe. Si el documento ya existe se actualizan solo
     los campos del capataz (cada campo se reemplaza entero: rows, pcs…); si no, se crea. */
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
function tcStatus(){const el=$('#tcSt');if(!el)return;const[k,t]=tcStatusTxt();el.className='tc-st'+(k?' '+k:'');el.textContent=t;el.title=t}

/* ---------- vista ---------- */
function renderTCap(main){let want=TCS.date&&TCS.unsub?TCS.date:todayIso(),st=0;
  /* al volver a cargar la página (p. ej. el celular la cerró mientras estaba la cámara) se vuelve al mismo día y paso */
  if(!TCS.unsub){const v=tcVLoad();if(v){want=v.date;st=v.step}}
  if(!$('#tcRoot',main)){main.innerHTML=`<div class="tc" id="tcRoot"></div>`;tcBind($('#tcRoot',main))}
  if(!TCS.unsub||TCS.date!==want||TCS.cap!==tcMe()){tcOpen(want);if(st>=1&&st<=4)TCS.step=st}
  else if(TCS.doc&&!tcRO()&&!TCS.dirty)tcSyncCrew();
  tcReabSub();
  tcDraw()}
/** ¿se está en la grilla de horas (paso 3, editable)? Con el celular echado ocupa toda la pantalla (CSS #tcRoot.g3). */
const tcG3=()=>TCS.step===3&&!!TCS.doc&&!tcRO()&&!tcLegacy(TCS.doc);
function tcDraw(){const root=$('#tcRoot');if(!root)return;root.classList.toggle('g3',tcG3());
  /* con la grilla de solo lectura (paso 4, enviado o antiguo), echado usa todo el ancho (CSS #tcRoot.g4) */
  root.classList.toggle('g4',!!TCS.doc&&(TCS.step===4||tcRO()||tcLegacy(TCS.doc)));
  /* barra inferior de la app (Tareo · Mi cuadrilla · Más): solo en el paso 1 y en lo enviado; mientras se llena, el pie es la única barra */
  root.classList.toggle('nobn',!!TCS.doc&&!tcRO()&&!tcLegacy(TCS.doc)&&TCS.step>1);
  /* sin cambios no se redibuja: así un toque no se pierde cuando llega la confirmación de la base */
  const html=tcHtml();if(root.__tch===html&&root.firstChild){tcStatus();tcFocusNow();return}
  const ae=document.activeElement;const fk=ae&&root.contains(ae)&&ae.dataset?ae.dataset.fk:null;const ss=fk?ae.selectionStart:null,se=fk?ae.selectionEnd:null;
  const bd=$('#tcBody');const sc=bd?bd.scrollTop:0;const key=TCS.date+'|'+TCS.step;const keep=bd&&bd.dataset.k===key;
  const gw=$('#tcGrid');const gs=gw?[gw.scrollLeft,gw.scrollTop]:null;
  root.innerHTML=html;root.__tch=html;
  const nb=$('#tcBody');if(nb){nb.dataset.k=key;if(keep)nb.scrollTop=sc}
  const ng=$('#tcGrid');if(ng&&gs&&keep){ng.scrollLeft=gs[0];ng.scrollTop=gs[1]}
  if(fk){const el=root.querySelector(`[data-fk="${CSS.escape(fk)}"]`);if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
  tcStatus();tcThumbs();tcFocusNow();tcVSave()}
/* día y paso abiertos (sessionStorage lps.tcv), para volver a ellos si la página se recarga al usar la cámara */
function tcVSave(){if(!TCS.date||!TCS.cap)return;try{sessionStorage.setItem('lps.tcv',JSON.stringify({cap:TCS.cap,date:TCS.date,step:TCS.step,t:NOW()}))}catch(e){}}
function tcVLoad(){try{const v=JSON.parse(sessionStorage.getItem('lps.tcv')||'null');if(v&&v.cap===tcMe()&&/^\d{4}-\d{2}-\d{2}$/.test(v.date||'')&&NOW()-(+v.t||0)<6*3600e3)return v}catch(e){}return null}
/** nombre completo y DNI de un obrero (al tocar su nombre) */
function tcNmToast(d){const r=TCS.doc&&TCS.doc.rows&&TCS.doc.rows[d];toast(`${(r&&tcNm(r))||d} · DNI ${d}`)}
/** «Falta la foto»: va al paso 4, resalta la tarjeta de la foto y abre la cámara (si el navegador no lo permite, queda resaltada) */
function tcFotoGo(){TCS.step=4;TCS.cell=null;TCS.fotoHi=true;tcDraw();const c=$('#tcFotoC');if(c&&c.scrollIntoView)c.scrollIntoView({block:'start'});
  const i=$('#tcFile');if(i&&!TCS.busy){try{i.click()}catch(e){}}}
/** lleva la vista a lo que hay que corregir (TCS.foc: selector) */
function tcFocusNow(){if(!TCS.foc)return;const sel=TCS.foc;TCS.foc='';const el=$('#tcRoot '+sel);if(el&&el.scrollIntoView)el.scrollIntoView({block:'center',inline:'center'})}
const tcDLab=d=>{const h=todayIso();return d===h?'Hoy':d===tcDay(h,-1)?'Ayer':TC_DN[pd(d).getUTCDay()].slice(0,3)};
const tcStLab=st=>st==='env'?'Enviado ✓':st==='rev'?'Revisado':st==='pub'?'Publicado':st==='reab'?'Reabierto':'';
/** reabierto ya leído en este celular (se guarda la marca de la reapertura: una nueva reapertura vuelve a mostrar el aviso completo) */
const tcRbK=()=>'lps.tcrb.'+tcId(TCS.date,TCS.cap);
function tcReabSeen(D){try{return!!(D&&D.reab)&&localStorage.getItem(tcRbK())===String(D.reab.t||'1')}catch(e){return false}}
function tcReabSet(D,on){try{if(on)localStorage.setItem(tcRbK(),String((D&&D.reab&&D.reab.t)||'1'));else localStorage.removeItem(tcRbK())}catch(e){}}
/* barra única (rediseño 22-10-2026, caja 1): día (menú con «Por corregir»), pasos con el nombre del actual, estado («Guardado» como punto)
   y «⋯». Con «Elegir varios» la barra pasa a ser la de los elegidos (caja 9). Echado, es el riel de la derecha (CSS). */
function tcHeadHtml(D,E){const ro=D?tcRO():false,old=D?tcLegacy(D):false;const RL=TCS.reabL.filter(x=>x.date!==TCS.date);
  if(D&&!ro&&!old&&TCS.step===3&&TCS.multi){const M=TCS.multi;const cuas=[...new Set(tcPres().map(([,r])=>r.cua).filter(Boolean))].sort();
    const ch=(a,l,v)=>`<button type="button" class="tc-chip" data-tca="${a}"${v!=null?` data-v="${esc(v)}"`:''}>${esc(l)}</button>`;
    return`<div class="tc-head tc-headm"><div class="tc-mbar" id="tcMBar" role="toolbar" aria-label="Elegir varios"><button type="button" class="tc-mx" data-tca="multiX" aria-label="Terminar de elegir">✕</button><b>${M.size} ${M.size===1?'elegido':'elegidos'}</b>
      <div class="tc-mch">${ch('mAll','Todos')}${cuas.length>1?cuas.map(c=>ch('mCua',tcCap1(c),c)).join(''):''}${ch('mSin','Sin horas')}${ch('mNone','Ninguno')}</div></div></div>`}
  const rb=D&&D.st==='reab';
  const day=`<button type="button" class="tc-dayb${rb?' reab':''}" data-tcm="day" aria-haspopup="dialog" title="${esc(TC_DN[pd(TCS.date).getUTCDay()])} ${esc(fmtD(TCS.date))}"><b>${rb?'⚠ ':''}${esc(tcDLab(TCS.date))} ${esc(String(+TCS.date.slice(8)))}</b><i aria-hidden="true">▾</i>${RL.length?`<sup class="tc-badge" aria-label="${RL.length} por corregir">${RL.length}</sup>`:''}</button>`;
  let mid='';
  if(D&&!ro&&!old){const P=D.pcs||[];const npres=tcPres().length;
    const s1=!E.some(e=>TC_K1.includes(e.k)),s2=s1&&!E.some(e=>TC_K2.includes(e.k))&&P.length>0,s3=s2&&npres>0&&!E.some(e=>TC_K3.includes(e.k));
    const steps=[[1,'Asistencia',s1],[2,'Trabajos',s2],[3,'Horas',s3],[4,'Enviar',false]];
    mid=`<div class="tc-steps" role="tablist" aria-label="Pasos">${steps.map(([n,l,ok])=>`<button type="button" role="tab" class="tc-step${TCS.step===n?' on':''}${ok&&TCS.step!==n?' ok':''}" data-tcs="${n}" aria-selected="${TCS.step===n}" title="${esc(l)}"><i>${ok&&TCS.step!==n?'✓':n}</i><span>${l}</span></button>`).join('')}</div>`}
  else mid=`<span class="tc-stl">${esc(D?(old?'Formato anterior':tcStLab(D.st)):'')}</span>`;
  return`<div class="tc-head"><div class="tc-hrow">${day}${mid}<span class="tc-st" id="tcSt" aria-live="polite"></span><button type="button" class="tc-moreb" data-tcm="more" aria-haspopup="dialog" aria-label="Más opciones">⋯</button></div></div>`}
function tcHtml(){const D=TCS.doc;TCS.lbl=D?tcLabels(D.rows):null;
  const ro=D?tcRO():false,old=D?tcLegacy(D):false;const E=D&&!ro&&!old?tcErrs(D):[];
  const menu=TCS.menu?tcMenuSheet(D):'';
  if(!TCS.loaded)return tcHeadHtml(null,[])+`<div class="tc-body" id="tcBody"><p class="tc-empty">Cargando tu tareo…</p></div>${menu}`;
  if(!D)return tcHeadHtml(null,[])+`<div class="tc-body" id="tcBody"><div class="callout warnc">${esc(TCS.err||'No se pudo abrir el tareo.')}</div></div>${menu}`;
  /* feriado o domingo (con la configuración del tareo o la congelada en él): todo es extra (auditoría 2, A5). En la grilla va en una línea. */
  const J=tcJor(TCS.date);
  const nl=J.nl&&!(TCS.step===3&&!ro&&!old)?`<div class="callout tc-nolab" id="tcNoLab" role="note"><b>Día no laborable: todas las horas cuentan como extra.</b><span>${esc(tcNlWhy(TCS.date))} No hay jornada ordinaria; «Toda la jornada» pone ${esc(tcH(J.full))} solo como referencia.</span></div>`:'';
  /* reabierto (caja 19): completo la primera vez, hasta «Entendido»; después queda el ⚠ en la barra, que lo vuelve a mostrar */
  const mot=D.reab&&D.reab.mot;
  const ban=D.st==='reab'?(tcReabSeen(D)?'':`<div class="callout tc-reab" id="tcReab" role="note"><div><b>⚠ Te reabrieron este tareo</b><span>${mot?esc(mot)+'. ':''}Corrige y vuelve a enviarlo.</span></div><button type="button" class="ib tc-big" data-tcm="reabOk">Entendido</button></div>`)
    :ro?tcSentBan(D):'';
  let body='';
  if(ro)body=tcStep4(D,[],true);
  else if(old)body=tcOldHtml(D);
  else if(TCS.step===1)body=tcStep1(D);else if(TCS.step===2)body=tcStep2(D);else if(TCS.step===3)body=tcStep3(D,E);else body=tcStep4(D,E,false);
  /* pie: data-sh = texto corto para el riel del celular echado */
  const fb=(cls,attr,txt,sh)=>`<button type="button" class="ib tc-big${cls?' '+cls:''}" ${attr} data-sh="${esc(sh)}">${txt}</button>`;
  let foot='';
  if(!ro&&!old){
    if(TCS.step===1){const R=tcRows();const n=R.filter(([,r])=>tcSinM(r)).length;
      /* caja 23: el botón principal hace lo más común (marcar como «vino» a los que faltan) */
      foot=n?fb('pri tc-w','data-tca="todos"',`✓ ${n===R.length?'Todos vinieron':n===1?'El que falta vino':`Los ${n} que faltan vinieron`}${J.nl?'':` en horario normal <small>${esc(tcT(J.j.ini))}–${esc(tcT(J.j.fin))}</small>`}`,`✓ ${n===R.length?'Todos':n} vinieron`)
        :fb('pri tc-w','data-tcs="2"','Siguiente: trabajos del día →','Siguiente →')}
    else if(TCS.step===2)foot=fb('','data-tcs="1"','← Atrás','← Atrás')+fb('pri','data-tcs="3"','Siguiente: horas →','Horas →');
    else if(TCS.step===3)foot=TCS.multi?fb('','data-tca="multiX"','Cancelar','Cancelar')+`<button type="button" class="ib pri tc-big" data-tca="asgOn" data-sh="Asignar a ${TCS.multi.size}"${TCS.multi.size?'':' disabled'}>Asignar a ${TCS.multi.size} →</button>`
      :fb('','data-tcs="2"','← Trabajos','← Trabajos')+fb('pri','data-tcs="4"','Revisar y enviar →','Revisar →');
    else{const nf=E.filter(e=>e.k!=='foto'&&e.k!=='fotp');const fp=E.some(e=>e.k==='fotp');const sinF=!fp&&E.some(e=>e.k==='foto');
      /* «Falta la foto» lleva a la tarjeta de la foto y abre la cámara (auditoría 2, UX4) */
      foot=fb('','data-tcs="3"','← Atrás','← Atrás')+(nf.length?`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="fix" data-sh="Faltan ${nf.length}">Faltan ${nf.length} ${nf.length===1?'dato':'datos'}: ver →</button>`
        :sinF&&!TCS.busy?`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="foto" data-sh="📷 Foto">📷 Falta la foto: tomarla</button>`
        :`<button type="button" class="ib pri tc-big" id="tcSend" data-tca="send" data-sh="${fp?'Foto sin subir':TCS.busy?'Procesando…':'Enviar ✓'}"${E.length||TCS.busy?' disabled':''}>${fp?'Foto sin subir':TCS.busy?'Procesando foto…':'Enviar tareo'}</button>`)}}
  const ed=!ro&&!old;
  const sheet=menu||(ed&&TCS.step===1&&TCS.ob?tcObSheet(D):'')||(ed&&TCS.step===3?(TCS.pcSh?tcPcSheet():TCS.pcm?tcPcMSheet(D):TCS.mpc?tcMpcSheet(D):TCS.cell?tcCellSheet(D):TCS.asg?tcAsgSheet(D):TCS.wk?tcWkSheet(D):TCS.hfx?tcHfxSheet(D):''):'');
  return tcHeadHtml(D,E)+`<div class="tc-body" id="tcBody">${ban}${nl}${body}</div>${foot?`<div class="tc-foot">${foot}</div>`:''}${sheet}`}
/** menús de la barra: «Hoy 22 ▾» (días y tareos por corregir) y «⋯» (Mi cuadrilla, Salir) */
function tcMenuSheet(D){const hoy=todayIso();const RL=TCS.reabL.filter(x=>x.date!==TCS.date);
  const hd=(t,s)=>`<div class="tc-csb" data-tcm="x"></div><div class="tc-cs tc-menu" id="tcMenu" role="dialog" aria-label="${esc(t)}"><div class="tc-csh"><div class="tc-wn"><b>${esc(t)}</b>${s?`<span>${esc(s)}</span>`:''}</div><button type="button" class="kx" data-tcm="x" aria-label="Cerrar">&times;</button></div>`;
  if(TCS.menu==='day'){const ds=[hoy,tcDay(hoy,-1),tcDay(hoy,-2)];if(TCS.date&&!ds.includes(TCS.date))ds.push(TCS.date);
    const st=d=>d===TCS.date&&D?D.st:TCS.past[d]||'';
    /* tareo reabierto: el motivo se ve aquí (el día va en ámbar con ⚠ en la barra) */
    const mot=D&&D.st==='reab'?(D.reab&&D.reab.mot)||'':null;
    return hd('Día del tareo','')+(mot!=null?`<div class="callout tc-reab tc-reabm"><div><b>⚠ Te reabrieron este tareo</b><span>${mot?esc(mot)+'. ':''}Corrige y vuelve a enviarlo.</span></div></div>`:'')+`<div class="tc-mlist">${ds.map(d=>`<button type="button" class="tc-mi${d===TCS.date?' on':''}" data-tcd="${d}"><b>${esc(tcDLab(d))} ${esc(String(+d.slice(8)))}</b><span>${esc(TC_DN[pd(d).getUTCDay()])} ${esc(fmtD(d))}${tcStLab(st(d))?' · '+esc(tcStLab(st(d))):''}</span></button>`).join('')}</div>
      ${RL.length?`<div class="tc-mh" id="tcPorCor">⚠ Por corregir (${RL.length})</div><div class="tc-mlist">${RL.map(x=>`<button type="button" class="tc-mi warn" data-tcd="${esc(x.date)}"><b>${esc(TC_DN[pd(x.date).getUTCDay()])} ${esc(fmtD(x.date))}</b><span>${x.mot?esc(x.mot):'La oficina lo reabrió: corrígelo y vuelve a enviarlo.'}</span></button>`).join('')}</div>`:''}</div>`}
  const nm=(typeof me!=='undefined'&&me&&(me.name||me.email))||'';
  return hd('Más opciones',nm)+`<div class="tc-mlist"><button type="button" class="tc-mi" data-tcm="cuad"><b>Mi cuadrilla</b><span>Tus obreros, con su DNI y categoría</span></button>
    <button type="button" class="tc-mi" data-tcm="out"><b>Salir</b><span>Cerrar sesión en este celular</span></button></div></div>`}

/** aviso del enviado: «Enviando…», «Se enviará al tener señal» (ámbar) o «Enviado ✓ hh:mm» (solo confirmado por el servidor) */
function tcSentBan(D){const q=tcSendQ();
  if(q==='sending')return`<div class="callout tc-sent tc-sending" id="tcSentB"><b>Enviando…</b><span>Esperando la confirmación del servidor.</span></div>`;
  if(q==='queued')return`<div class="callout tc-sent tc-queued" id="tcSentB" role="status"><b>⚠ Se enviará al tener señal</b><span>Está guardado en este celular. No cierres sesión ni borres los datos de la app; se enviará solo cuando vuelva la señal.</span></div>`;
  const t=D.envAt?' · '+esc(new Date(D.envAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})):'';
  return`<div class="callout tc-sent${D.st==='rev'?' tc-rev':''}" id="tcSentB"><b>Enviado ✓${t}</b><span>${D.st==='env'?'Ya no se puede cambiar. Si hay un error, pide al asistente de tareo que lo reabra.':D.st==='rev'?'Revisado por la oficina.':'Publicado.'}</span></div>`}
/** tareo antiguo (por horarios) que aún se puede editar: se pasa a horas por partida con un botón; mientras, se ve como está */
function tcOldHtml(D){return`<div class="callout tc-old" id="tcOld"><b>Este tareo se llenó con el formato anterior (por horarios).</b>
   <span>Para corregirlo y enviarlo, pásalo a horas por partida. Se conservan las horas de cada obrero en cada partida.</span>
   <button type="button" class="ib pri tc-big" data-tca="conv">Pasar a horas por partida</button></div>${tcStep4(D,[],true)}`}

/* paso 1: asistencia (rediseño 22-10-2026, cajas 20–23): buscador y filtro en una fila; una fila de 56 px por obrero con «Vino | No»;
   altura, horario y motivo se ponen tocando el nombre (hoja del obrero) y quedan como etiquetas en la fila */
const tcMotL=r=>r.mot?(TC_MOT.find(m=>m[0]===r.mot)||['',r.mot])[1]:'';
function tcL1Vis(){const R=tcRows();const q=tFold(TCS.q1),f1=TCS.f1;
  return R.map((x,i)=>[...x,i]).filter(([dni,r])=>(f1==='sin'?tcSinM(r):f1==='no'?tcFalto(r):f1==='si'?tcVino(r):true)&&(!q||dni.includes(q)||tFold(r.ape).includes(q)||tFold(r.nom).includes(q)||tFold(r.nom+' '+r.ape).includes(q)))}
function tcL1Html(){const crew=new Set(tcCrew(TCS.date).map(p=>p.dni||p.id));const vis=tcL1Vis();
  if(!vis.length)return`<p class="tc-empty">${TCS.q1?`Nadie con «${esc(TCS.q1)}»`:'Nadie'}${TCS.f1==='sin'?' sin marcar':TCS.f1==='no'?' que no vino':TCS.f1==='si'?' que vino':''}. <button type="button" class="tc-lnk" data-tca="f1x">Ver a todos</button></p>`;
  return vis.map(([dni,r,i])=>{const v=tcVino(r),f=tcFalto(r),u=!v&&!f;const nm=esc(tcFN(dni));const H=v?tcHor(r):null;
    const tg=[v&&r.alt?`<em class="tc-tag">Altura</em>`:'',v&&H&&(H.mod||H.bad)?`<em class="tc-tag ${H.bad?'bad':'t'}">${H.bad?'Horario mal':esc(tcHorTxt(H))}</em>`:'',
      f&&r.mot?`<em class="tc-tag n">${esc(tcMotL(r))}</em>`:'',r.ajeno?`<em class="tc-tag bad" title="${esc(tcCapOrig(r.capOrig))}">No es de tu cuadrilla</em>`:!crew.has(dni)?`<em class="tc-tag">Agregado hoy</em>`:''].join('');
    const nom=[String(r.nom||'').split(' ')[0],r.cat].filter(Boolean).join(' · ');
    return`<div class="tc-ob${v?' si':f?' off':' sin'}${u&&TCS.need?' need':''}" data-dni="${esc(dni)}">
    <span class="tc-n">${i+1}</span><button type="button" class="tc-wn" data-tca="ob" aria-label="${nm}: altura, horario y motivo"><b>${esc(r.ape||dni)}</b><span><span class="tc-wnn">${esc(nom)} · <span class="mono">${esc(dni)}</span></span>${tg}</span></button>
    <div class="tc-vn" role="group" aria-label="¿Vino ${nm}?"><button type="button" class="tc-v${v?' on':''}" data-tca="vino" aria-pressed="${v}" aria-label="Vino">✓<span> Vino</span></button><button type="button" class="tc-nv${f?' on':''}" data-tca="novino" aria-pressed="${f}" aria-label="No vino">✕<span> No</span></button></div></div>`}).join('')}
function tcStep1(D){const R=tcRows();
  const nV=R.filter(([,r])=>tcVino(r)).length,nF=R.filter(([,r])=>tcFalto(r)).length,sin=R.length-nV-nF;const f1=TCS.f1;
  const add=TCS.addOn?`<div class="tc-card tc-add"><label class="tc-lab">Buscar por DNI o apellido<input class="tin tc-in" id="tcAddQ" data-fk="tcAddQ" type="search" autocomplete="off" value="${esc(TCS.addQ)}" placeholder="Ej. 4512 o QUISPE"></label><div id="tcAddL" class="tc-res">${tcAddList()}</div>
     <button type="button" class="ib tc-big" data-tca="addOff">Cerrar</button></div>`:`<button type="button" class="ib tc-big tc-w" data-tca="addOn">+ Agregar obrero</button>`;
  if(!R.length)return`<div class="callout warnc tc-none"><b>No tienes obreros asignados.</b><span>Pide a la oficina que te los asigne en Personal.</span></div>${add}`;
  const op=(k,l,n)=>`<option value="${k}"${f1===k?' selected':''}>${l} (${n})</option>`;
  return`<div class="tc-stk" id="tcStk1"><div class="tc-qr"><input class="tin tc-in tc-q" id="tcQ1" data-fk="tcQ1" type="search" autocomplete="off" value="${esc(TCS.q1)}" placeholder="Buscar nombre o DNI" aria-label="Buscar en tu cuadrilla por nombre o DNI">
   <select class="tin tc-f1s${sin?' warn':''}" id="tcF1" aria-label="Mostrar">${op('all','Todos',R.length)}${op('si','Vinieron',nV)}${op('no','No vinieron',nF)}${op('sin','Sin marcar',sin)}</select></div></div>
   <div class="tc-list" id="tcL1">${tcL1Html()}</div>${add}`}
/** hoja del obrero (paso 1, tocando su nombre): si vino, altura y horario; si no vino, el motivo; si falta marcar, Vino / No */
function tcObSheet(D){const d=TCS.ob;const r=(D.rows||{})[d];if(!r){TCS.ob='';return''}const v=tcVino(r),f=tcFalto(r);const crew=new Set(tcCrew(TCS.date).map(p=>p.dni||p.id));
  return`<div class="tc-csb" data-tca="obX"></div><div class="tc-cs" id="tcOb" role="dialog" aria-label="${esc(tcFN(d))}" data-dni="${esc(d)}">
   <div class="tc-csh"><div class="tc-wn"><b>${esc(tcFN(d))}</b><span>DNI <span class="mono">${esc(d)}</span>${r.cat?' · '+esc(tcCap1(TCAT[r.cat]||r.cat)):''}${r.cua?' · '+esc(tcCap1(r.cua)):''}</span></div><button type="button" class="kx" data-tca="obX" aria-label="Cerrar">&times;</button></div>
   <div class="tc-vn tc-vnb" role="group" aria-label="¿Vino?"><button type="button" class="tc-v${v?' on':''}" data-tca="vino" aria-pressed="${v}">✓ Vino</button><button type="button" class="tc-nv${f?' on':''}" data-tca="novino" aria-pressed="${f}">✕ No vino</button></div>
   ${v?`<label class="tc-altb"><input type="checkbox" data-tca="alt"${r.alt?' checked':''}> Trabajó en altura (bono)</label>${tcHorPanel(d,r)}`:''}
   ${f?`<div class="tc-lab">Motivo (opcional)</div><div class="tc-mots" role="group" aria-label="Motivo (opcional)">${TC_MOT.map(([k,l])=>`<button type="button" class="tc-mot${r.mot===k?' on':''}" data-tca="mot" data-v="${k}" aria-pressed="${r.mot===k}"><b>${k}</b> ${esc(l)}</button>`).join('')}</div>`:''}
   ${crew.has(d)?'':`<button type="button" class="ib tc-big tc-w" data-tca="rm">Quitar de este tareo</button>`}
   <div class="tc-csa"><button type="button" class="ib pri tc-big" data-tca="obX">Listo</button></div></div>`}
/** horario de un obrero (paso 1): entrada, salida (con atajos de 1, 2 y 3 h después del fin de la jornada), corrido y lo que da */
function tcHorPanel(dni,r){const J=tcJor(TCS.date);const H=tcHor(r)||{ent:J.j.ini,sal:J.j.fin,h:0,cor:false,mod:false,bad:false};const fin=tMin(J.j.fin)||1020;
  const q=[60,120,180].map(m=>tcHm((fin+m)%1440));
  return`<div class="tc-hor" role="group" aria-label="Horario de ${esc(tcFN(dni))}">
    <div class="tc-hr2"><label>Entrada<input class="tin tc-in" type="time" data-tca="ent" value="${esc(H.ent)}"></label><label>Salida<input class="tin tc-in${H.mod&&r.sal?' mod':''}" type="time" data-tca="sal" value="${esc(H.sal)}"></label></div>
    <div class="tc-hq">${q.map(o=>`<button type="button" class="tc-qh tc-qs${H.sal===o?' on':''}" data-tca="salQ" data-v="${o}">Salió ${esc(tcT(o))}</button>`).join('')}${H.mod?`<button type="button" class="tc-qh tc-qs" data-tca="horX">Horario normal</button>`:''}</div>
    <label class="tc-cor"><input type="checkbox" data-tca="cor"${r.cor===true?' checked':''}> Corrido: almorzó trabajando (no se descuenta el refrigerio)</label>
    <div class="tc-hres${H.bad?' bad':''}">${H.bad?(H.inv?'La hora no es válida.':'La salida no puede ser igual a la entrada.'):`${esc(tcH(H.h))} trabajadas${H.sig?' (sale al día siguiente)':''}${tcHeTxt(H.h,J)?' · '+esc(tcHeTxt(H.h,J)):''}`}</div></div>`}
function tcAddList(){const q=tFold(TCS.addQ);if(q.length<2)return`<p class="tc-hint">Escribe al menos 2 letras o números.</p>`;
  const R=(TCS.doc&&TCS.doc.rows)||{};const L=[...S.tper.values()].filter(p=>p&&!p.arch&&tActivo(p,TCS.date)&&!R[p.dni||p.id]&&((p.dni||'').includes(q)||tFold(p.ape).includes(q)||tFold(p.nom).includes(q))).slice(0,12);
  if(!L.length)return`<p class="tc-hint">Nadie con «${esc(TCS.addQ)}» entre el personal activo.</p>`;
  return L.map(p=>`<button type="button" class="tc-opt" data-tca="add" data-v="${esc(p.dni||p.id)}"><b>${esc(tName(p))}</b><span>DNI ${esc(p.dni||p.id)} · ${esc(p.cua||p.pue||'')}${p.cap!==TCS.cap?` · <em>${esc(tcCapOrig(p.cap||''))}</em>`:''}</span></button>`).join('')}
/** de quién es un obrero que no es de la cuadrilla: «de <capataz>» o «sin capataz» */
const tcCapOrig=c=>c?'de '+(typeof tCapName==='function'?tCapName(c):c):'sin capataz';

/* paso 2: trabajos del día (partidas, en el orden en que se agregan) */
function tcStep2(D){const P=D.pcs||[];
  const cards=P.map((pc,i)=>{const bq=tcBloq(pc);const h=tcPcHrs(D,pc);
    return`<div class="tc-card tc-pcr${bq?' bad':''}" data-pc="${esc(pc)}"><div class="tc-pct"><span class="tc-n">${i+1}</span><div class="tc-wn"><b class="mono">${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span></div>
      <div class="tc-pca"><button type="button" class="ib" data-tca="pcUp" aria-label="Subir"${i?'':' disabled'}>▲</button><button type="button" class="ib" data-tca="pcDn" aria-label="Bajar"${i<P.length-1?'':' disabled'}>▼</button><button type="button" class="ib" data-tca="pcRm" aria-label="Quitar ${esc(tcPcCod(pc))}">✕</button></div></div>
      ${bq?`<div class="tc-err">Bloqueada por costos: quítala${h?' (sus horas se borran)':''}.</div>`:h?`<span class="tc-hint">${esc(tcH(h))} cargadas</span>`:''}</div>`}).join('');
  const open=TCS.pcOn||!P.length;
  const add=open?`<div class="tc-card tc-add" id="tcPcAdd"><label class="tc-lab">${P.length?'Agregar otra partida':'Agrega las partidas en las que trabajaron'}<input class="tin tc-in" id="tcPcQ" data-fk="tcPcQ" type="search" autocomplete="off" value="${esc(TCS.pcQ)}" placeholder="Código (10.05) o nombre (encofrado)" aria-label="Buscar partida"></label>
     <div id="tcPcL" class="tc-res">${tcPcList()}</div>${P.length?`<button type="button" class="ib tc-big" data-tca="pcOff">Listo</button>`:''}</div>`
    :`<button type="button" class="ib pri tc-big tc-w" data-tca="pcOn">+ Agregar trabajo</button>`;
  const pv=TCS.prev;const pvOk=pv?pv.pcs.filter(pc=>tcPcs().some(x=>x.id===pc)):[];
  const copy=!P.length&&pvOk.length?`<button type="button" class="ib tc-big tc-w" data-tca="copy">Copiar los trabajos del ${esc(TC_DN[pd(pv.date).getUTCDay()].toLowerCase())} ${esc(fmtD(pv.date))} (${pvOk.length})</button>`
    :!P.length&&!TCS.prevDone?`<button type="button" class="ib tc-big tc-w" disabled>Buscando el tareo anterior…</button>`:'';
  return`<div class="tc-h"><h2>Trabajos del día</h2><span>Las partidas en las que trabajó tu cuadrilla. Las horas se ponen en el siguiente paso.</span></div>
   ${copy}${cards?`<div class="tc-list" id="tcPcs">${cards}</div>`:''}${add}`}
/** buscador de partidas (20-10-2026, lista más clara): con texto, las que coinciden; sin texto, «Las que más usas» y debajo todas
    agrupadas por grupo (plegables). Solo código y nombre; no ofrece las bloqueadas ni las ya agregadas. */
function tcPcList(){const q=tFold(TCS.pcQ);const use=tcUse();const have=new Set((TCS.doc&&TCS.doc.pcs)||[]);const all=tcPcs().filter(x=>!have.has(x.id)).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const opt=x=>`<button type="button" class="tc-opt tc-pco" data-tca="pc" data-v="${esc(x.id)}"><b>${esc(x.cod)}</b><span>${esc(x.nom)}</span></button>`;
  if(q){const L=all.filter(x=>tFold(x.cod).includes(q)||tFold(x.nom).includes(q)||tFold(x.grpN).includes(q)).sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)||tCmpCod(a.cod,b.cod));
    return L.length?`<div class="tc-pcg">${L.slice(0,30).map(opt).join('')}</div>`:`<p class="tc-hint">Ninguna partida con «${esc(TCS.pcQ)}».</p>`}
  const fav=all.filter(x=>use[x.id]).sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)).slice(0,8);
  const G=new Map();for(const x of all){const k=x.grp||String(x.cod||'').split('.')[0]||'—';const g=G.get(k)||{k,n:x.grpN||'',L:[]};if(!g.n&&x.grpN)g.n=x.grpN;g.L.push(x);G.set(k,g)}
  const gs=[...G.values()].sort((a,b)=>tCmpCod(a.k,b.k));
  return`${fav.length?`<div class="tc-pch">Las que más usas</div><div class="tc-pcg">${fav.map(opt).join('')}</div><div class="tc-pch">Todas las partidas</div>`:''}
   ${gs.map(g=>`<details class="tc-pcd"><summary><b class="mono">${esc(g.k)}</b> ${esc(tcCap1(g.n||'Grupo '+g.k))} <span>${g.L.length}</span></summary><div class="tc-pcg">${g.L.map(opt).join('')}</div></details>`).join('')}`}

/* paso 3: grilla de horas como el formato físico — obreros (los que vinieron) en filas, partidas en columnas, total por obrero a la
   derecha y total por partida abajo (docs/ia/tareo.md «Grilla como el formato — capataz») */
function tcRotX(){if(TCS.rotX==null){try{TCS.rotX=localStorage.getItem('lps.tcrot')==='1'}catch(e){TCS.rotX=false}}return TCS.rotX}
/** «Copiar horas de ayer»: solo si el tareo anterior es de horas, tiene todas las partidas de hoy y todos los que vinieron hoy
    también vinieron ese día (con horas). Se copian solo las horas de las partidas de hoy. */
function tcPrevH(D){const pv=TCS.prev;if(!pv||!pv.hrs)return null;const P=D.pcs||[];const pres=tcPres();
  if(!pres.length||!P.length||P.some(pc=>!pv.pcs.includes(pc)))return null;
  if(!pres.every(([d])=>pv.rows[d]&&pv.rows[d].as===true&&tHrsTot(pv.rows[d])>0))return null;return pv}
/** N° de cada obrero: su lugar en la lista completa (el mismo del paso 1) */
const tcNum=()=>new Map(tcRows().map(([d],i)=>[d,i+1]));
/** color y texto del total de un obrero: verde = jornada exacta · ámbar = menos («faltan 4,5») o más («+2 HE») · rojo = 0 h o > 16 */
function tcTotKS(t,J,r){const H=r?tcHor(r):null;
  if(H&&!H.bad&&t&&t<=T_HMAX){const d=tR2(t-H.h);if(Math.abs(d)>0.01)return['warn',d<0?`faltan ${tHtxt(-d)}`:`sobran ${tHtxt(d)}`];
    return['ok',J.nl?'todo extra':t>J.h?`+${tHtxt(tR2(t-J.h))} HE`:t<J.h?`salió ${tcT(H.sal)}`:'completo']}
  return[!t||t>T_HMAX?'bad':J.nl?'warn':Math.abs(t-J.h)<0.001?'ok':'warn',
  !t?'sin horas':t>T_HMAX?'revisa':J.nl?'todo extra':t<J.h?`faltan ${tHtxt(J.h-t)}`:t>J.h?`+${tHtxt(t-J.h)} HE`:'completo']}
/** encabezado de una partida: código y nombre abreviado (tocándolo se ve el nombre completo) */
const tcPcTh=pc=>`<div class="tc-gpt" role="button" tabindex="0" data-tcpc="${esc(pc)}" title="${esc(tcPcName(pc))}"><b>${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span></div>`;
/* rediseño 22-10-2026 (cajas 2–12): sin título ni fila de botones; «☐ Varios» en la esquina; la cabecera de cada partida es un botón
   (menú con «Toda la jornada» y quitar; con varios elegidos, «Poner aquí»); toda la celda del nombre se toca; «Repetir» solo con la grilla
   vacía; el resultado de «Repetir» va en un aviso arriba */
const tcTouch=()=>{try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}};
function tcStep3(D,E){const P=D.pcs||[];const pres=tcPres();const J=tcJor(TCS.date);
  const nl=J.nl?`<div class="tc-nl1" id="tcJorH" role="note">Día no laborable: todas las horas son extra</div>`:'';
  if(!pres.length)return nl+`<p class="tc-empty">Nadie vino: no hay horas que poner.</p>`;
  const pv=TCS.prev&&TCS.prev.hrs?TCS.prev:null;const M=TCS.multi;
  const empty=pres.every(([,r])=>!tHrsTot(r)),sinH=pres.filter(([,r])=>!tHrsTot(r)).length;
  /* «Repetir» solo cuando sirve: con la grilla vacía (grande) o mientras alguien no tenga horas (una línea); ocupa su lugar desde el inicio
     (deshabilitado mientras se busca el tareo anterior) para que la pantalla no salte al llegar */
  const pvd=pv?`${TC_DN[pd(pv.date).getUTCDay()].toLowerCase()} ${+pv.date.slice(8)}`:'';
  const repB=!sinH||M?'':pv?(empty?`<button type="button" class="ib pri tc-big tc-w tc-repb" data-tca="rep">↻ Repetir ${esc(pvd)}<small>sus trabajos y horas, ajustados al horario de hoy</small></button>`
      :`<button type="button" class="ib tc-big tc-w tc-repb1" data-tca="rep">↻ Repetir ${esc(pvd)} a ${sinH===1?'quien no tiene':`los ${sinH} sin`} horas</button>`)
    :!TCS.prevDone?`<button type="button" class="ib tc-big tc-w tc-repb" disabled>Buscando el tareo anterior…<small>&nbsp;</small></button>`:'';
  if(!P.length)return nl+repB+`<div class="callout warnc">Primero agrega los trabajos del día.</div><button type="button" class="ib${pv?'':' pri'} tc-big tc-w" data-tcs="2">Ir a trabajos del día</button>`;
  const bad=new Set(E.filter(e=>e.dni&&TC_K3.includes(e.k)).map(e=>e.dni));const N=tcNum();
  const rot=!tcRotX()&&!M&&P.length>3?`<div class="tc-rot" id="tcRot" role="note"><span>📱↻ Gira el celular para ver más partidas.</span><button type="button" class="kx" data-tca="rotX" aria-label="Cerrar aviso">&times;</button></div>`:'';
  const cur=TCS.cell||{};
  const th=P.map(pc=>{const bq=tcBloq(pc);
    return`<th class="tc-gp${cur.pc===pc||TCS.pcm===pc?' sel':''}${bq?' bq':''}" scope="col" data-pc="${esc(pc)}"><button type="button" class="tc-gph" data-tca="${M?'pcAll':'pcMenu'}"${bq&&M?' disabled':''} title="${esc(tcPcName(pc))}" aria-label="${esc(tcPcName(pc))}${M?': poner horas a los elegidos':': opciones'}"><b>${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span><u>${bq?'Bloqueada':M?'Poner aquí':'▾'}</u></button></th>`}).join('');
  const rows=pres.map(([d,r])=>{const t=tHrsTot(r);const H=tcHor(r);const[k,sub]=tcTotKS(t,J,r);const on=!!M&&M.has(d);
    return`<tr data-dni="${esc(d)}" class="${on?'msel':''}"><th class="tc-gn${bad.has(d)?' bad':''}${cur.dni===d?' sel':''}" scope="row" data-dni="${esc(d)}"><button type="button" class="tc-gnb" data-tca="${M?'mtog':'wk'}" data-dni="${esc(d)}"${M?` aria-pressed="${on}" aria-label="Elegir a ${esc(tcFN(d))}"`:` aria-label="Día de ${esc(tcFN(d))}"`}>${M?`<i class="tc-mck${on?' on':''}" aria-hidden="true">✓</i>`:`<span class="tc-gnn">${N.get(d)||''}</span>`}<span class="tc-gnt">${esc(tcSN(d))}</span>${H&&H.mod?`<small class="tc-gsub">${esc(tcHorTxt(H))}</small>`:''}</button></th>
      ${P.map(pc=>{const v=tcHv(r,pc);const s=cur.dni===d&&cur.pc===pc;
        return`<td><button type="button" class="tc-gcell${v?' v':''}${s?' sel':''}" data-tca="cell" data-dni="${esc(d)}" data-pc="${esc(pc)}"${tcBloq(pc)&&!v?' disabled':''} aria-label="${esc(tcSN(d))}, ${esc(tcPcCod(pc))}: ${v?esc(tHtxt(v))+' horas':'sin horas'}">${v?esc(tHtxt(v)):''}</button></td>`}).join('')}
      <td class="tc-gpa"></td><td class="tc-gt ${k}" data-dni="${esc(d)}">${H&&!H.bad&&t&&Math.abs(t-H.h)>0.01&&!M?`<button type="button" class="tc-gtb" data-tca="hfx" data-dni="${esc(d)}" aria-label="No cuadra con su horario: corregir"><b>${esc(tHtxt(t))}</b><small>${esc(sub)} ›</small></button>`:`<b>${esc(tHtxt(t))}</b><small>${esc(sub)}</small>`}</td></tr>`}).join('');
  const all=tR2(pres.reduce((s,[,r])=>s+tHrsTot(r),0));
  const foot=P.map(pc=>{const h=tR2(pres.reduce((s,[,r])=>s+tcHv(r,pc),0));return`<td class="tc-gs" data-pc="${esc(pc)}">${h?esc(tHtxt(h)):'—'}</td>`}).join('');
  const corner=M?`<span class="tc-gch">Toca la partida</span>`:`<button type="button" class="tc-varb" data-tca="multi" aria-label="Elegir varios obreros">☐ Varios</button>`;
  return nl+rot+repB
   +`<div class="tc-gw" id="tcGrid"><table class="tc-g"><thead><tr><th class="tc-gc" scope="col">${corner}</th>${th}<th class="tc-gpa" scope="col"><button type="button" class="tc-gpab" data-tca="pcSh" id="tcPcPlus" aria-label="Agregar una partida" title="Agregar una partida">+</button></th><th class="tc-gtc" scope="col">Total</th></tr></thead><tbody>${rows}</tbody>
     <tfoot><tr><th class="tc-gtl" scope="row">Total partida</th>${foot}<td class="tc-gpa"></td><td class="tc-gs tc-gss">${esc(tHtxt(all))}</td></tr></tfoot></table></div>`}
/** menú de una partida (tocar su cabecera en la grilla): nombre completo, «Toda la jornada» y quitarla */
function tcPcMSheet(D){const pc=TCS.pcm;if(!pc||!(D.pcs||[]).includes(pc)){TCS.pcm='';return''}const bq=tcBloq(pc);const h=tcPcHrs(D,pc);
  const falt=tcPres().filter(([,r])=>tR2(tcHorH(r)-tHrsTot(r))>0).length;
  return`<div class="tc-csb" data-tca="pcmX"></div><div class="tc-cs" id="tcPcM" role="dialog" aria-label="${esc(tcPcName(pc))}" data-pc="${esc(pc)}">
   <div class="tc-csh"><div class="tc-wn"><b class="mono">${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span><span>${h?esc(tcH(h))+' cargadas':'Sin horas todavía'}</span></div><button type="button" class="kx" data-tca="pcmX" aria-label="Cerrar">&times;</button></div>
   ${bq?`<div class="tc-err">Bloqueada por costos: no se le pueden poner horas. Quítala${h?' (sus horas se borran)':''}.</div>`
     :`<button type="button" class="ib pri tc-big tc-w" data-tca="pcAll"${falt?'':' disabled'}>Toda la jornada<small>${falt?`completa el horario de ${falt} ${falt===1?'obrero':'obreros'} en esta partida`:'todos ya tienen sus horas completas'}</small></button>`}
   <div class="tc-csa"><button type="button" class="ib tc-big" data-tca="pcRm">Quitar esta partida</button><button type="button" class="ib tc-big" data-tca="pcmX">Cerrar</button></div></div>`}
/** «+» de la grilla de horas (20-10-2026): agrega una partida sin volver a «Trabajos» (la misma lista y buscador) */
function tcPcSheet(){return`<div class="tc-csb" data-tca="pcShX"></div><div class="tc-cs" id="tcPcSh" role="dialog" aria-label="Agregar partida">
   <div class="tc-csh"><div class="tc-wn"><b>Agregar partida</b><span>Aparece como una columna nueva en la grilla.</span></div><button type="button" class="kx" data-tca="pcShX" aria-label="Cerrar">&times;</button></div>
   <input class="tin tc-in" id="tcPcQ" data-fk="tcPcQ" type="search" autocomplete="off" value="${esc(TCS.pcQ)}" placeholder="Código (10.05) o nombre (encofrado)" aria-label="Buscar partida">
   <div id="tcPcL" class="tc-res">${tcPcList()}</div></div>`}
/** editor rápido de una celda (hoja abajo): −/+ ½ hora, horas rápidas, «Resto de su jornada», borrar y listo.
    Al escribir en el campo se aplica sin redibujar la hoja (tcLiveIn → tcLive): así el primer toque en un botón no se pierde. */
const tcCellDTxt=(t,tot,J)=>`En el día: ${tcH(t)} de ${tcH(tot)} de su horario${J.nl?' (todo extra)':''}`;
function tcCellSheet(D){const c=TCS.cell;const r=(D.rows||{})[c.dni];if(!r||!tcVino(r)||!(D.pcs||[]).includes(c.pc)){TCS.cell=null;return''}
  const v=tcHv(r,c.pc);const t=tHrsTot(r);const J=tcJor(TCS.date);const tot=tcHorH(r);const resto=tR2(Math.max(0,tot-t));const bq=tcBloq(c.pc);const all=tR2(Math.max(0,tot-(t-v)));
  /* botones según lo que le queda (20-10-2026): el resto, la mitad de su horario y horas redondas que entran; 2 filas de 4 (caja 26) */
  const qh=[...new Set([tR2(v+resto),tR2(Math.round(tot)/2),1,2,3,4,5,6,tot].filter(n=>n>0&&n<=Math.max(tot,1)))].sort((a,b)=>a-b).slice(0,8);
  /* rediseño 22-10-2026 (cajas 24–27): el campo para escribir solo aparece con «✎ Escribir» (el teclado no se abre solo) y las acciones
     quedan fijas abajo de la hoja */
  return`<div class="tc-csb" data-tca="cellX"></div><div class="tc-cs" id="tcCell" role="dialog" aria-label="Horas de ${esc(tcFN(c.dni))} en ${esc(tcPcCod(c.pc))}">
   <div class="tc-csh"><div class="tc-wn"><b>${esc(tcFN(c.dni))}</b><span><b class="mono">${esc(tcPcCod(c.pc))}</b> ${esc(tcPcNom(c.pc))}</span><span id="tcCellD">${esc(tcCellDTxt(t,tot,J))}</span></div>
    <button type="button" class="kx" data-tca="cellX" aria-label="Cerrar">&times;</button></div>
   ${bq?`<div class="tc-err">Partida bloqueada por costos: solo puedes borrar sus horas.</div>`:`<div class="tc-csv"><button type="button" class="ib tc-big" data-tca="cellAdj" data-v="-0.5"${v>0?'':' disabled'} aria-label="Media hora menos">−½</button><output id="tcCv">${esc(tcH(v))}</output><button type="button" class="ib tc-big" data-tca="cellAdj" data-v="0.5"${v<TC_HTOP?'':' disabled'} aria-label="Media hora más">+½</button></div>
   <div class="tc-csq">${qh.map(n=>`<button type="button" class="tc-qh${v===n?' on':''}" data-tca="cellSet" data-v="${n}">${esc(tHtxt(n))}</button>`).join('')}</div>
   <button type="button" class="ib pri tc-big tc-w" id="tcCellR" data-tca="cellSet" data-r="${all}"${resto>0?'':' hidden'}>El resto de su horario → ${esc(tcH(all))}</button>
   ${TCS.cellW?`<label class="tc-cin">Escribe las horas<input class="tin tc-in" id="tcCin" data-fk="tcCin" type="text" inputmode="decimal" autocomplete="off" data-tca="cellIn" value="${v?esc(tHtxt(v)):''}" placeholder="ej. 6,5" aria-label="Horas de ${esc(tcSN(c.dni))} en ${esc(tcPcCod(c.pc))}"></label>`:''}`}
   <div class="tc-csa">${!bq&&!TCS.cellW?`<button type="button" class="ib tc-big" data-tca="cellW">✎ Escribir</button>`:''}<button type="button" class="ib tc-big" id="tcCellB" data-tca="cellSet" data-v="0"${v?'':' hidden'}>Borrar</button><button type="button" class="ib pri tc-big" data-tca="cellX">Listo</button></div></div>`}

/** en un día no laborable, al poner la salida o marcar corrido se guarda también la entrada que se ve (si no, tHorRow tomaría la de
    referencia igual, pero así queda escrita como la vio el capataz; auditoría 21-10-2026) */
function tcNlEnt(r){const J=tcJor(TCS.date);if(!J.nl||!r||tHmOk(r.ent))return;const H=tcHor(r);r.ent=(H&&tHmOk(H.ent)?H.ent:J.j.ini)}
/** salida con la que su horario da t horas (desde su entrada; salta el refrigerio salvo corrido; puede pasar de medianoche).
    '' si no se puede o si con ella no cuadraría de verdad. */
function tcSalPara(r,t){const H=tcHor(r);if(!H||H.bad||!(t>0))return'';const D=tDia(TCS.date,tcCfg(TCS.date));const s=tHrsFin(H.ent,t,r.cor===true?null:D.rw);if(!tHmOk(s))return'';
  const H2=tHorRow({...r,ent:H.ent,sal:s},TCS.date,tcCfg(TCS.date));return H2&&!H2.bad&&Math.abs(H2.h-t)<=0.01?s:''}
/** clave de las horas de una fila (sin orden ni ceros) para saber si siguen siendo las que dejó «Repetir» */
const tcHKey=h=>JSON.stringify(Object.entries(h||{}).filter(([,v])=>tHv(v)>0).map(([k,v])=>[k,tR2(+v)]).sort((a,b)=>a[0]<b[0]?-1:1));
const tcRepOf=(d,r)=>!!(TCS.repD&&r&&TCS.repD.get(d)===tcHKey(r.h));
/** las horas no cuadran con el horario: atajos para ajustar sus horas, cambiar la salida, marcar corrido o repartir su día (20-10-2026).
    Si sus horas son las que copió «Repetir», lo primero es «Ajustar sus horas a su horario» (no inventar HE cambiando la salida). */
function tcHfxSheet(D){const d=TCS.hfx;const r=(D.rows||{})[d];const H=r&&tcHor(r);if(!r||!tcVino(r)||!H||H.bad){TCS.hfx='';return''}const t=tHrsTot(r);const dif=tR2(t-H.h);
  if(Math.abs(dif)<0.01){TCS.hfx='';return''}const ns=tcSalPara(r,t);const J=tcJor(TCS.date);const rw=tDia(TCS.date,tcCfg(TCS.date)).rw;const ref=rw?tR2((rw[1]-rw[0])/60):0;
  const cor=!r.cor&&ref&&Math.abs(dif-ref)<0.01;const sinCor=r.cor&&ref&&Math.abs(-dif-ref)<0.01;const cp=tcRepOf(d,r);
  const adj=H.h>0&&t>0?`<button type="button" class="ib${cp?' pri':''} tc-big" data-tca="hfxAdj">Ajustar sus horas a su horario (${esc(tcH(H.h))})</button>`:'';
  const sal=ns&&ns!==H.sal?`<button type="button" class="ib${cp?'':' pri'} tc-big" data-tca="hfxSal" data-v="${esc(ns)}">${dif>0?'Se quedó':'Salió antes'}: salida ${esc(tcT(ns))}</button>`:'';
  return`<div class="tc-csb" data-tca="hfxX"></div><div class="tc-cs" id="tcHfx" role="dialog" aria-label="Horas que no cuadran" data-dni="${esc(d)}">
   <div class="tc-csh"><div class="tc-wn"><b>${esc(tcFN(d))}</b><span>En partidas ${esc(tcH(t))} · su horario ${esc(tcHorTxt(H))} da ${esc(tcH(H.h))}</span></div><button type="button" class="kx" data-tca="hfxX" aria-label="Cerrar">&times;</button></div>
   <div class="tc-wkt warn">${cp?`Sus horas se copiaron de otro día y tienen <b>${esc(tHtxt(Math.abs(dif)))} h ${dif>0?'más':'menos'}</b> que su horario de hoy.`:dif>0?`Tiene <b>${esc(tHtxt(dif))} h más</b> que su horario: ¿se quedó más tiempo?`:`Tiene <b>${esc(tHtxt(-dif))} h menos</b> que su horario: ¿salió antes?`}</div>
   <div class="tc-csa tc-csv2">${cp?adj+sal:sal}
    ${cor?`<button type="button" class="ib tc-big" data-tca="hfxCor">Fue corrido (no almorzó)</button>`:''}${sinCor?`<button type="button" class="ib tc-big" data-tca="hfxCor">No fue corrido (sí almorzó)</button>`:''}
    <button type="button" class="ib tc-big" data-tca="hfxWk">Corregir sus horas por partida</button>${cp?'':adj}
    ${H.mod?`<button type="button" class="ib tc-big" data-tca="hfxNorm">Volver a su horario normal (${esc(tcT(J.j.ini))}–${esc(tcT(J.j.fin))})</button>`:''}</div>
   <p class="tc-hint">${ns?`La salida que se pone sale de sus horas: entrada ${esc(tcT(H.ent))} + ${esc(tcH(t))}${r.cor?'':' + refrigerio'}.`:'«Ajustar» reparte su horario entre sus partidas, en la misma proporción.'}</p></div>`}

/** «Asignar a varios»: horas por partida para todos los elegidos; una partida puede llevar «el resto» (lo que le falta a cada uno según su
    horario) o «mitad y mitad» entre dos partidas. Muestra cómo queda cada uno antes de aplicar.
    → {pc: horas} solo de las partidas que se tocan (auditoría 21-10-2026): las escritas (A.v; vacía = no se toca) y, con «el resto» o
    «mitad y mitad», todo su día (las demás partidas quedan en 0). */
function tcAsgOut(r,A,P){const tot=tcHorH(r);const o={};
  if(A.half&&P.length===2){const a=tR2(Math.round(tot)/2);o[P[0]]=a;o[P[1]]=tR2(tot-a);return o}
  let f=0;for(const pc of P){if(pc===A.resto||!(pc in A.v))continue;const n=+A.v[pc]||0;o[pc]=n;f+=n}
  if(A.resto&&P.includes(A.resto)){for(const pc of P)if(!(pc in o))o[pc]=0;o[A.resto]=tR2(Math.max(0,tot-f))}
  return o}
const tcAsgM=D=>[...(TCS.multi||[])].filter(d=>tcVino((D.rows||{})[d]));
const tcAsgP=D=>(D.pcs||[]).filter(pc=>!tcBloq(pc));
/** ¿alguien recibe horas? (si no, «Aplicar» queda deshabilitado: antes ponía en 0 a todos) */
const tcAsgAny=D=>{const A=TCS.asg,P=tcAsgP(D);return!!A&&tcAsgM(D).some(d=>Object.values(tcAsgOut(D.rows[d],A,P)).some(v=>v>0))};
function tcAsgPre(D){const A=TCS.asg,P=tcAsgP(D);const M=tcAsgM(D);
  return M.slice(0,12).map(d=>{const r=D.rows[d];const o=tcAsgOut(r,A,P);const L=P.map(pc=>pc in o?o[pc]:tcHv(r,pc)).filter(v=>v>0).map(tHtxt);return`${tcSN(d)} ${L.join(' + ')||'—'}`}).join(' · ')+(M.length>12?` · y ${M.length-12} más`:'')}
function tcAsgSheet(D){const A=TCS.asg;const P=tcAsgP(D);const M=tcAsgM(D);const ok=tcAsgAny(D);
  return`<div class="tc-csb" data-tca="asgX"></div><div class="tc-cs" id="tcAsg" role="dialog" aria-label="Asignar a ${M.length}">
   <div class="tc-csh"><div class="tc-wn"><b>Asignar a ${M.length} ${M.length===1?'obrero':'obreros'}</b><span>«El resto» se ajusta al horario de cada uno. Las partidas vacías no se tocan.</span></div><button type="button" class="kx" data-tca="asgX" aria-label="Cerrar">&times;</button></div>
   <div class="tc-asg">${P.map(pc=>{const r=A.resto===pc;return`<div class="tc-asgr" data-pc="${esc(pc)}"><b class="mono">${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span>
     ${r?`<button type="button" class="tc-qh tc-qs on" data-tca="asgR" data-pc="${esc(pc)}">el resto ✓</button>`:`<input class="tin tc-in" type="text" inputmode="decimal" autocomplete="off" data-tca="asgIn" data-fk="asg_${esc(pc)}" data-pc="${esc(pc)}" value="${A.half||!(pc in A.v)?'':esc(tHtxt(A.v[pc]))}" placeholder="h" aria-label="Horas en ${esc(tcPcCod(pc))}"><button type="button" class="tc-qh tc-qs" data-tca="asgR" data-pc="${esc(pc)}">el resto</button>`}</div>`}).join('')}</div>
   <div class="tc-csq">${P.map(pc=>`<button type="button" class="tc-qh tc-qs" data-tca="asgAll" data-pc="${esc(pc)}">Todo en ${esc(tcPcCod(pc))}</button>`).join('')}${P.length===2?`<button type="button" class="tc-qh tc-qs${A.half?' on':''}" id="tcAsgH" data-tca="asgHalf">Mitad y mitad</button>`:''}</div>
   <div class="tc-asgp" id="tcAsgP">Queda: ${esc(tcAsgPre(D))}</div>
   <div class="tc-csa"><button type="button" class="ib tc-big" data-tca="asgX">Cancelar</button><button type="button" class="ib pri tc-big" id="tcAsgOk" data-tca="asgOk"${ok?'':' disabled'}>Aplicar a ${M.length}</button></div></div>`}
/** «Elegir varios» → tocar una partida (22-10-2026, pedido del dueño): cuántas horas van a esa partida para todos los elegidos.
    X h → esa partida queda en X para cada uno (sus otras partidas no se tocan) y la selección sigue, para mandar el resto a otra partida;
    «El resto de su horario» → a cada uno lo que le falta según su horario; «Todo el día aquí» → como antes: reemplaza su día y termina. */
function tcMpcOut(r,pc,m){const tot=tcHorH(r);if(m==='all')return tot;if(m==='resto')return tR2(Math.max(0,tot-(tHrsTot(r)-tcHv(r,pc))));return Math.min(TC_HTOP,tR2(m))}
function tcMpcSheet(D){const pc=TCS.mpc;const M=tcAsgM(D);if(!pc||!M.length||tcBloq(pc)||!(D.pcs||[]).includes(pc)){TCS.mpc='';return''}
  const R=D.rows||{};const tots=M.map(d=>tcHorH(R[d]));const mx=Math.max(...tots,1);const half=tR2(Math.round(Math.min(...tots))/2);
  const qh=[...new Set([1,2,3,4,half,5,6,7].filter(n=>n>0&&n<mx))].sort((a,b)=>a-b).slice(0,8);
  const rs=M.map(d=>tcMpcOut(R[d],pc,'resto'));const rMin=Math.min(...rs),rMax=Math.max(...rs);
  const rTxt=rMax<=0?'ya completos':rMin===rMax?tcH(rMin):`${tHtxt(rMin)}–${tcH(rMax)}`;
  const nm=M.slice(0,6).map(tcSN).join(', ')+(M.length>6?` y ${M.length-6} más`:'');const v=TCS.mpcV;
  return`<div class="tc-csb" data-tca="mpcX"></div><div class="tc-cs" id="tcMpc" role="dialog" aria-label="Horas en ${esc(tcPcCod(pc))} para ${M.length} elegidos" data-pc="${esc(pc)}">
   <div class="tc-csh"><div class="tc-wn"><b>¿Cuántas horas en <span class="mono">${esc(tcPcCod(pc))}</span>?</b><span>${esc(tcPcNom(pc))}</span><span>${M.length} ${M.length===1?'elegido':'elegidos'}: ${esc(nm)}</span></div><button type="button" class="kx" data-tca="mpcX" aria-label="Cerrar">&times;</button></div>
   <div class="tc-csq">${qh.map(n=>`<button type="button" class="tc-qh" data-tca="mpcSet" data-v="${n}">${esc(tHtxt(n))}</button>`).join('')}</div>
   <div class="tc-q2"><button type="button" class="ib tc-big" data-tca="mpcSet" data-m="resto"${rMax>0?'':' disabled'}>El resto de su horario<small>${esc(rTxt)}</small></button><button type="button" class="ib tc-big" data-tca="mpcSet" data-m="all">Todo el día aquí<small>reemplaza su día</small></button></div>
   ${TCS.mpcW?`<div class="tc-mpci"><label class="tc-cin">Otra cantidad<input class="tin tc-in" id="tcMpcIn" type="text" inputmode="decimal" autocomplete="off" value="${v>0?esc(tHtxt(v)):''}" placeholder="ej. 4,5" aria-label="Horas en ${esc(tcPcCod(pc))}"></label>
    <button type="button" class="ib pri tc-big" id="tcMpcOk" data-tca="mpcOk"${v>0?'':' disabled'}>${v>0?`Poner ${esc(tcH(v))}`:'Poner'}</button></div>`:''}
   <div class="tc-csa">${TCS.mpcW?'':`<button type="button" class="ib tc-big" data-tca="mpcW">✎ Otra cantidad</button>`}<button type="button" class="ib tc-big" data-tca="mpcX">Cerrar</button></div></div>`}
/** al escribir en «Otra cantidad»: solo el botón (sin redibujar la hoja, para no perder el teclado) */
function tcMpcLive(val){const n=tcNumIn(val);TCS.mpcV=n>0?Math.min(TC_HTOP,n):null;const b=$('#tcMpcOk');if(b){b.disabled=!(TCS.mpcV>0);b.textContent=TCS.mpcV>0?`Poner ${tcH(TCS.mpcV)}`:'Poner'}}
async function tcMpcApply(m){let D=TCS.doc;const pc=TCS.mpc;const M=TCS.multi;if(!D||!pc||!M||tcRO()||tcBloq(pc))return;let R=D.rows||{};let n=0;
  /* «Todo el día aquí» reemplaza su día: si alguno ya tiene horas en otras partidas, se confirma (auditoría 22-10-2026) */
  if(m==='all'){const ya=[...M].filter(d=>{const r=R[d];return tcVino(r)&&(D.pcs||[]).some(p=>p!==pc&&tcHv(r,p)>0)});const date=TCS.date;
    if(ya.length&&!await uiAsk({title:'¿Reemplazar su día?',text:`${ya.length===1?tcSN(ya[0])+' ya tiene':ya.length+' de los elegidos ya tienen'} horas en otras partidas. Con «Todo el día aquí» esas horas se borran y todo su día va a ${tcPcCod(pc)}.`,ok:'Reemplazar',tone:'warn'}))return;
    D=TCS.doc;if(!D||TCS.date!==date||tcRO()||TCS.multi!==M)return;R=D.rows||{}}
  for(const d of M){const r=R[d];if(!tcVino(r))continue;const h=tcMpcOut(r,pc,m);
    if(m==='all')for(const p of D.pcs||[])if(!tcBloq(p))tcSetH(r,p,0);
    tcSetH(r,pc,h);n++}
  TCS.mpc='';TCS.mpcV=null;TCS.mpcW=false;
  const done=m==='all'||[...M].every(d=>{const r=R[d];return!tcVino(r)||Math.abs(tHrsTot(r)-tcHorH(r))<0.01});
  if(done){TCS.multi=null;TCS.asg=null}
  const what=m==='all'?'todo el día':m==='resto'?'el resto de su horario':tcH(m);
  tcChg();toast(`${tcPcCod(pc)}: ${what} a ${n} ${n===1?'obrero':'obreros'}.${done?'':' Siguen elegidos: toca otra partida para lo que les falta.'}`)}
/** todo el día de un obrero (tocando su nombre en la grilla): horas por partida escritas, «el resto» por partida, corrido y siguiente */
const tcWkTxt=(tot,dif)=>`Su horario da <b>${esc(tcH(tot))}</b>${Math.abs(dif)<0.01?' · completo ✓':dif>0?` · faltan <b>${esc(tHtxt(dif))}</b>`:` · sobran <b>${esc(tHtxt(-dif))}</b>`}`;
const tcWkSalTxt=(dif,s,t)=>`${dif<0?'Se quedó':'Salió antes'}: poner salida ${tcT(s)} (cuadra con ${tcH(t)})`;
function tcWkSheet(D){const d=TCS.wk;const r=(D.rows||{})[d];if(!r||!tcVino(r)){TCS.wk='';return''}const P=D.pcs||[];const H=tcHor(r);const tot=tcHorH(r);const t=tHrsTot(r);
  const dif=tR2(tot-t);const pres=tcPres().map(([x])=>x);const i=pres.indexOf(d);const ns=tcSalPara(r,t);
  return`<div class="tc-csb" data-tca="wkX"></div><div class="tc-cs" id="tcWk" role="dialog" aria-label="Día de ${esc(tcFN(d))}" data-dni="${esc(d)}">
   <div class="tc-csh"><div class="tc-wn"><b>${esc(tcFN(d))}</b><span>${esc(r.cat?tcCap1(TCAT[r.cat]||r.cat):'')}${H?' · '+esc(tcHorTxt(H)):''}</span></div><button type="button" class="kx" data-tca="wkX" aria-label="Cerrar">&times;</button></div>
   <div class="tc-wkt ${Math.abs(dif)<0.01?'ok':'warn'}" id="tcWkT">${tcWkTxt(tot,dif)}</div>
   <div class="tc-asg">${P.map(pc=>{const v=tcHv(r,pc);const bq=tcBloq(pc);const rs=tR2(v+Math.max(0,dif));return`<div class="tc-asgr" data-pc="${esc(pc)}"><b class="mono">${esc(tcPcCod(pc))}</b><span>${esc(tcPcNom(pc))}</span>
     <input class="tin tc-in" type="text" inputmode="decimal" autocomplete="off" data-tca="wkIn" data-fk="wk_${esc(pc)}" data-pc="${esc(pc)}" value="${v?esc(tHtxt(v)):''}" placeholder="0"${bq&&!v?' disabled':''} aria-label="Horas en ${esc(tcPcCod(pc))}">
     ${!bq?`<button type="button" class="tc-qh tc-qs tc-qrs" data-tca="wkSet" data-pc="${esc(pc)}" data-v="${rs}"${dif>0.01&&!v?'':' hidden'}>el resto: ${esc(tHtxt(rs))}</button>`:''}</div>`}).join('')}</div>
   <button type="button" class="ib tc-big tc-w" id="tcWkSal" data-tca="hfxSal" data-v="${esc(ns)}"${Math.abs(dif)>0.01&&t>0&&ns?'':' hidden'}>${esc(ns?tcWkSalTxt(dif,ns,t):'')}</button>
   <button type="button" class="ib tc-big tc-w" data-tca="pcSh">+ Otra partida</button>
   <label class="tc-cor"><input type="checkbox" data-tca="cor"${r.cor===true?' checked':''}> Corrido: almorzó trabajando</label>
   <div class="tc-csa"><button type="button" class="ib tc-big" data-tca="wkNav" data-v="-1"${i>0?'':' disabled'}>‹ Anterior</button><button type="button" class="ib pri tc-big" data-tca="wkNav" data-v="1">${i<pres.length-1?'Listo · siguiente ›':'Listo'}</button></div></div>`}
/** horas escritas en una hoja («Su día», la casilla o «Asignar»): se aplican al escribir, sin redibujar (auditoría 21-10-2026: el redibujo
    al soltar el campo hacía perder el primer toque). → true aplicado · false no aplica · null no es un número */
function tcLiveIn(t){const D=TCS.doc;if(!D||tcRO()||tcLegacy(D))return false;const a=t.dataset.tca;const n=tcNumIn(t.value);if(n==null)return null;
  if(a==='asgIn'){const A=TCS.asg;if(!A)return false;const pc=t.dataset.pc;if(String(t.value).trim()==='')delete A.v[pc];else A.v[pc]=n;if(A.resto===pc)A.resto='';A.half=false;tcLive();return true}
  const R=D.rows||{};let r,pc;
  if(a==='cellIn'){const c=TCS.cell;if(!c)return false;r=R[c.dni];pc=c.pc}else{r=TCS.wk&&R[TCS.wk];pc=t.dataset.pc}
  if(!r||!tcVino(r)||!pc||(tcBloq(pc)&&n))return false;if(tcHv(r,pc)!==n){tcSetH(r,pc,n);tcChg(false)}tcLive();return true}
/** actualiza solo los textos de la hoja abierta (totales, resto, vista previa, «Aplicar»), sin reemplazar sus botones */
function tcLive(){const D=TCS.doc;if(!D)return;const R=D.rows||{};const J=tcJor(TCS.date);
  const c=TCS.cell;if(c&&$('#tcCell')&&R[c.dni]){const r=R[c.dni];const v=tcHv(r,c.pc),t=tHrsTot(r),tot=tcHorH(r),resto=tR2(Math.max(0,tot-t)),all=tR2(Math.max(0,tot-(t-v)));
    const o=$('#tcCv');if(o)o.textContent=tcH(v);const dd=$('#tcCellD');if(dd)dd.textContent=tcCellDTxt(t,tot,J);
    for(const q of $$('#tcCell .tc-csq [data-tca="cellSet"]'))q.classList.toggle('on',+q.dataset.v===v);
    const mn=$('#tcCell [data-tca="cellAdj"][data-v="-0.5"]'),pl=$('#tcCell [data-tca="cellAdj"][data-v="0.5"]');if(mn)mn.disabled=!(v>0);if(pl)pl.disabled=!(v<TC_HTOP);
    const rb=$('#tcCellR');if(rb){rb.hidden=!(resto>0);rb.dataset.r=String(all);rb.textContent=`El resto de su horario → ${tcH(all)}`}const bb=$('#tcCellB');if(bb)bb.hidden=!v;
    const g=$(`#tcGrid .tc-gcell[data-dni="${CSS.escape(c.dni)}"][data-pc="${CSS.escape(c.pc)}"]`);if(g){g.textContent=v?tHtxt(v):'';g.classList.toggle('v',!!v)}}
  const w=TCS.wk&&$('#tcWk')&&R[TCS.wk];if(w){const tot=tcHorH(w),t=tHrsTot(w),dif=tR2(tot-t);
    const T=$('#tcWkT');if(T){T.className='tc-wkt '+(Math.abs(dif)<0.01?'ok':'warn');T.innerHTML=tcWkTxt(tot,dif)}
    for(const b of $$('#tcWk [data-tca="wkSet"]')){const v=tcHv(w,b.dataset.pc);const rs=tR2(v+Math.max(0,dif));b.dataset.v=String(rs);b.textContent='el resto: '+tHtxt(rs);b.hidden=!(dif>0.01&&!v)}
    const sb=$('#tcWkSal');if(sb){const ns=tcSalPara(w,t);sb.hidden=!(Math.abs(dif)>0.01&&t>0&&ns);sb.dataset.v=ns;sb.textContent=ns?tcWkSalTxt(dif,ns,t):''}}
  if(TCS.asg&&$('#tcAsg')){const p=$('#tcAsgP');if(p)p.textContent='Queda: '+tcAsgPre(D);const ok=$('#tcAsgOk');if(ok)ok.disabled=!tcAsgAny(D);const h=$('#tcAsgH');if(h)h.classList.toggle('on',!!TCS.asg.half)}}

/* paso 4: revisar y enviar (y vista de solo lectura, también de los tareos antiguos). La misma grilla que el paso 3, en solo lectura:
   los que vinieron arriba con sus horas, los que no vinieron (o sin marcar) al final atenuados con su motivo. Editable: tocar una
   celda lleva al paso 3 en esa celda. */
function tcStep4(D,E,ro){const C=tcCalc(D);const R=C.rows||{};const rows=tcRows();const bad=new Set(E.filter(e=>e.dni).map(e=>e.dni));
  const tot=rows.reduce((a,[d])=>{const r=R[d]||{};if(tcVino(r)){a.v++;a.h+=+r.trab||0;a.e+=+r.ext||0}else if(tcFalto(r))a.f++;else a.s++;return a},{v:0,f:0,s:0,h:0,e:0});
  const fotos=Array.isArray(D.foto)?D.foto:[];const FP=ro?[]:Object.entries(TCS.fp).filter(([id])=>!fotos.includes(id));
  const ef=E.filter(e=>e.k!=='foto'&&e.k!=='fotp');
  const errs=ef.length?`<div class="callout tc-errs"><b>Antes de enviar, corrige:</b><ul>${ef.map(e=>`<li>${esc(tcErrMsg(e))}</li>`).join('')}</ul></div>`:'';
  const W=ro?[]:tcWarns(D);
  const warns=W.length?`<div class="callout tc-warns" id="tcWarns"><b>Avisos (puedes enviar igual):</b><ul>${W.map(e=>`<li>${esc(tcErrMsg(e))}</li>`).join('')}</ul></div>`:'';
  const FPL={up:'Subiendo…',pend:'Pendiente de subir',err:'No se subió'};
  /* la foto va arriba, antes de la grilla (auditoría 2, UX4): «Falta la foto» lleva aquí y abre la cámara */
  return`${ro?'':`<div class="tc-h"><h2>Revisar y enviar</h2><span id="tcTot3">${tot.v} vinieron · ${tot.f} no vinieron${tot.s?` · ${tot.s} sin marcar`:''} · ${esc(tcH(tot.h))}${tot.e?' · '+esc(tcH(tot.e))+' extra':''}</span></div>`}
   ${errs}${warns}
   <div class="tc-card${TCS.fotoHi&&!ro?' tc-hi':''}" id="tcFotoC"><div class="tc-lab">Foto del formato firmado${ro?'':' <span>obligatoria</span>'}</div>
    <div class="tc-fotos">${fotos.map(id=>`<div class="tc-th" data-fid="${esc(id)}"><img alt="Foto del formato" data-img="${esc(id)}">${ro?'':`<button type="button" data-tca="fx" aria-label="Quitar foto">✕</button>`}</div>`).join('')}
     ${FP.map(([id,P])=>`<div class="tc-th tc-fp ${P.st}" data-fpid="${esc(id)}"><img alt="Foto sin subir" data-img="${esc(id)}"><button type="button" data-tca="fpX" aria-label="Descartar foto">✕</button>
       <span class="tc-fps">${FPL[P.st]||''}${P.st==='err'?`<button type="button" class="tc-fpr" data-tca="fpRe">Reintentar</button>`:''}</span></div>`).join('')}
     ${ro?'':`<label class="tc-cam${TCS.busy?' busy':''}"><input type="file" id="tcFile" accept="image/*" capture="environment"><span>${TCS.busy?'Procesando…':fotos.length?'+ Otra foto':'📷 Tomar foto'}</span></label>`}</div>
    ${FP.some(([,P])=>P.st==='pend')?`<div class="tc-note" id="tcFpNote">Sin señal: la foto ${FP.some(([,P])=>P.mem)?'está solo en la memoria de la app; si la cierras, tendrás que tomarla de nuevo':'quedó guardada en el celular'}. Se subirá sola al volver la señal; recién entonces podrás enviar.</div>`:''}
    ${FP.some(([,P])=>P.st==='err')?`<div class="tc-err">${esc((FP.find(([,P])=>P.st==='err')[1].msg)||'La foto no se pudo subir.')} Toca «Reintentar» o tómala de nuevo.</div>`:''}
    ${!ro&&!fotos.length&&!FP.length?`<div class="tc-err">Toma una foto del formato con las firmas de todos.</div>`:''}</div>
   ${tcGridRO(D,C,bad,ro)}`}
/** grilla de solo lectura (paso 4 y tareos enviados o antiguos): obreros en filas, partidas en columnas, total y HE por obrero,
    total por partida; (A) = altura. Si se puede editar, cada celda de un presente es un botón que lleva a esa celda del paso 3. */
function tcGridRO(D,C,bad,ro){const R=C.rows||{};const old=!tEsHrs(D);const J=tcJor(TCS.date);const N=tcNum();const edit=!ro&&!old;
  /* partidas: las del día en su orden (antiguo: las de sus bloques) y, por si acaso, las que tengan horas sin estar en la lista */
  const P=[...(old?(Array.isArray(D.blq)?D.blq:[]).map(k=>k&&k.pc):(D.pcs||[]))].filter(Boolean);
  for(const r of Object.values(R))if(tcVino(r))for(const pc of Object.keys(r.h||{}))if(tcHv(r,pc))P.push(pc);
  const pcs=[...new Set(P)];const all=tcRows().map(([d,r0])=>[d,R[d]||r0]);
  /* los que vinieron primero; al final los que no vinieron y los sin marcar (en el orden de la lista) */
  const L=[...all.filter(([,r])=>tcVino(r)),...all.filter(([,r])=>!tcVino(r))];
  if(!L.length)return'';
  const ml=r=>r.mot?((TC_MOT.find(m=>m[0]===r.mot)||['',r.mot])[1]||r.mot):'';
  const body=L.map(([d,r])=>{const v=tcVino(r);
    const sub=v?(old?`${tcT(r.ini)||'—'}–${tcT(r.fin)||'—'}`:r.sal?`salió ${tcT(r.sal)}`:''):'';
    const nm=`<th class="tc-gn${bad.has(d)?' bad':''}" scope="row" data-dni="${esc(d)}"><span class="tc-gnn">${N.get(d)||''}</span>${tcNmT(d)}${v&&r.alt?' <abbr class="tc-alt-a" title="Trabajo en altura">(A)</abbr>':''}${sub?`<small class="tc-gsub">${esc(sub)}</small>`:''}</th>`;
    if(!v)return`<tr class="tc-rr off" data-dni="${esc(d)}">${nm}<td class="tc-rmot" colspan="${pcs.length+1}"><span>${tcFalto(r)?`No vino${ml(r)?' · '+esc(ml(r)):''}`:'Sin marcar si vino'}</span></td></tr>`;
    const t=+r.trab||0,x=+r.ext||0;const k=!t||t>T_HMAX?'bad':J.nl||x>0||t<J.h-0.001?'warn':'ok';
    const s=!t?'sin horas':t>T_HMAX?'revisa':J.nl?'todo extra':x>0?`+${tHtxt(x)} HE`:t<J.h-0.001?`faltan ${tHtxt(J.h-t)}`:'completo';
    return`<tr class="tc-rr" data-dni="${esc(d)}">${nm}${pcs.map(pc=>{const h=tcHv(r,pc);const tx=h?esc(tHtxt(h)):'';
      return`<td>${edit&&(h||!tcBloq(pc))?`<button type="button" class="tc-rc${h?' v':''}" data-tca="go3" data-dni="${esc(d)}" data-pc="${esc(pc)}" aria-label="Editar ${esc(tcSN(d))}, ${esc(tcPcCod(pc))}: ${h?tx+' horas':'sin horas'}">${tx}</button>`:`<span class="tc-rc${h?' v':''}">${tx}</span>`}</td>`}).join('')}
      <td class="tc-gt ${k}" data-dni="${esc(d)}"><b>${esc(tHtxt(t))}</b><small>${esc(s)}</small></td></tr>`}).join('');
  const pres=L.filter(([,r])=>tcVino(r));
  const foot=pcs.map(pc=>{const h=tR2(pres.reduce((s,[,r])=>s+tcHv(r,pc),0));return`<td class="tc-gs" data-pc="${esc(pc)}">${h?esc(tHtxt(h)):'—'}</td>`}).join('');
  const th=tR2(pres.reduce((s,[,r])=>s+(+r.trab||0),0)),te=tR2(pres.reduce((s,[,r])=>s+(+r.ext||0),0));
  return`<div class="tc-gw tc-gwr" id="tcGridR"><table class="tc-g tc-gro"><thead><tr><th class="tc-gc" scope="col">N° · Obrero</th>${pcs.map(pc=>`<th class="tc-gp${tcBloq(pc)?' bq':''}" scope="col" data-pc="${esc(pc)}">${tcPcTh(pc)}</th>`).join('')}<th class="tc-gtc" scope="col">Total</th></tr></thead>
    <tbody>${body}</tbody><tfoot><tr><th class="tc-gtl" scope="row">Total partida</th>${foot}<td class="tc-gs tc-gss"><b>${esc(tHtxt(th))}</b>${te?`<small>${esc(tHtxt(te))} HE</small>`:''}</td></tr></tfoot></table></div>
   ${edit?`<p class="tc-hint tc-ghint">Toca una casilla para corregir sus horas.</p>`:''}`}
function tcErrMsg(e){const r=e.dni&&TCS.doc&&TCS.doc.rows&&TCS.doc.rows[e.dni];const m=String(e.msg||'');if(!r||!r.ape||m.includes(r.ape))return m;return tcNm(r)+': '+m}

/* ---------- miniaturas de las fotos ---------- */
function tcThumbs(){for(const img of $$('#tcRoot img[data-img]')){const id=img.dataset.img;if(TCS.img[id]){img.src=TCS.img[id];continue}
  if(TCS.imgReq[id])continue;TCS.imgReq[id]=1;fcol('tfot').doc(id).get().then(s=>{const d=s.exists&&s.data().d;if(d){TCS.img[id]=d;const el=$(`#tcRoot img[data-img="${CSS.escape(id)}"]`);if(el)el.src=d}}).catch(()=>{delete TCS.imgReq[id]})}}
/** archivo → dataURL (para el editor de la foto) */
const tcReadUrl=file=>new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||''));fr.onerror=()=>rej(tcErr('No se pudo leer la imagen.'));fr.readAsDataURL(file)});
/** error con mensaje para el capataz (los demás, del navegador y en inglés, se cambian por uno en español) */
const tcErr=m=>{const e=new Error(m);e.es=true;return e};
/** reduce la foto (archivo o dataURL) hasta que su dataURL mida ≤ TC_FMAX caracteres (la misma medida que usa el servidor): desde
    2400 px / 0,74 y bajando (20-10-2026: antes empezaba en 1600; una hoja limpia con «Documento» entra a más resolución) */
async function tcShrink(src){const blob=typeof src!=='string';const url=blob?URL.createObjectURL(src):src;try{
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(tcErr('No se pudo leer la imagen.'));i.src=url});
  const out=(mx,q)=>{const k=Math.min(1,mx/Math.max(img.naturalWidth||1,img.naturalHeight||1));const c=document.createElement('canvas');c.width=Math.max(1,Math.round((img.naturalWidth||1)*k));c.height=Math.max(1,Math.round((img.naturalHeight||1)*k));
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);const d=c.toDataURL('image/jpeg',q);
    /* cada intento libera su lienzo: en iPhones con poca memoria, varias fotos seguidas dejaban lienzos vivos y fallaba (auditoría 22-10) */
    c.width=c.height=0;return d};
  for(const[mx,q]of[[2400,0.74],[2200,0.72],[2000,0.7],[1800,0.7],[1600,0.7],[1400,0.65],[1200,0.6],[1000,0.55],[900,0.5],[800,0.45],[640,0.4]]){const d=out(mx,q);
    /* sin memoria el navegador devuelve «data:,» (una foto vacía): no se sube */
    if(!/^data:image\/jpeg/.test(d)||d.length<100)throw tcErr('No se pudo procesar la foto. Cierra otras apps y tómala de nuevo.');
    if(d.length<=TC_FMAX)return d}
  throw tcErr('La foto es demasiado grande. Tómala de nuevo, más de cerca.')}finally{if(blob)URL.revokeObjectURL(url)}}
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
/** foto tomada o elegida: si existe el editor de mejora (tareo-foto.js, tFotoEditor) se pasa por él (null = cancelado);
    luego se reduce y se sube con confirmación del servidor */
async function tcAddFoto(file){if(!file||tcRO())return;const date=TCS.date;TCS.busy=true;TCS.fotoHi=false;tcDraw();
  try{let src=file;
    if(typeof tFotoEditor==='function'){const u=await tcReadUrl(file);const ed=await tFotoEditor(u);if(!ed){TCS.busy=false;tcDraw();return}src=ed}
    const d=await tcShrink(src);
    /* después de esperar (editor, reducción) se vuelve a leer el estado: pudo cambiar de día o quedar enviado */
    if(TCS.date!==date||tcRO()||!TCS.doc){TCS.busy=false;tcDraw();return}
    const D=TCS.doc;const base=tcId(TCS.date,TCS.cap)+'_';
    let n=Math.max(0,...[...(D.foto||[]),...Object.keys(TCS.fp)].map(x=>+String(x).slice(base.length)||0))+1;
    for(let i=0;i<30;i++){let ex=false;try{ex=(await fcol('tfot').doc(base+n).get()).exists}catch(e){}if(!ex)break;n++}
    const id=base+n;TCS.img[id]=d;TCS.fp[id]={n,st:'up',msg:'',mem:!tcFpPut(id,n,d)};TCS.busy=false;
    tcFotUp(id)}
  catch(err){TCS.busy=false;tcDraw();toast(err&&err.es?err.message:'No se pudo procesar la foto. Tómala de nuevo.')}}
/* teclado del celular sobre las hojas (auditoría 22-10-2026): la hoja fija abajo quedaba detrás del teclado y tapaba «Listo». Con el alto
   del teclado en --tc-kb la hoja sube sobre él mientras se escribe. */
function tcKb(){const v=window.visualViewport;if(!v)return;const kb=Math.max(0,Math.round(window.innerHeight-v.height-v.offsetTop));
  document.documentElement.style.setProperty('--tc-kb',(kb>80?kb:0)+'px')}
if(typeof window!=='undefined'&&window.visualViewport){visualViewport.addEventListener('resize',tcKb);visualViewport.addEventListener('scroll',tcKb)}
/* al volver la señal se reintentan las fotos pendientes */
if(typeof window!=='undefined')window.addEventListener('online',()=>{for(const[id,P]of Object.entries(TCS.fp))if(P.st!=='up'&&!P.busy)tcFotUp(id)});

/* ---------- reabiertos de cualquier fecha («Por corregir») ---------- */
function tcReabSub(){const cap=tcMe();if(TCS.rsub&&TCS.rcap===cap)return;if(TCS.rsub){try{TCS.rsub()}catch(e){}}
  TCS.rcap=cap;TCS.reabL=[];
  TCS.rsub=fcol('tareo').where('cap','==',cap).where('st','==','reab').onSnapshot(q=>{if(!$('#tcRoot')){try{TCS.rsub()}catch(e){}TCS.rsub=null;TCS.rcap='';return}
    TCS.reabL=q.docs.map(x=>{const v=x.data()||{};return{date:v.date,mot:(v.reab&&v.reab.mot)||''}}).filter(x=>x.date).sort((a,b)=>a.date<b.date?-1:1);tcDraw()},()=>{});}

/* ---------- acciones ---------- */
function tcBind(root){
  /* el aviso «Reabierto» plegable recuerda si se abrió (la pantalla se redibuja con cada cambio) */
  root.addEventListener('toggle',e=>{if(e.target&&e.target.id==='tcReab')TCS.reabO=e.target.open},true);
  root.addEventListener('click',e=>{const nmt=e.target.closest('[data-tcnm]');if(nmt&&!e.target.closest('[data-tca="cell"],[data-tca="wk"],[data-tca="mtog"]')){tcNmToast(nmt.dataset.tcnm);return}
    const tpc=e.target.closest('[data-tcpc]');if(tpc){toast(tcPcName(tpc.dataset.tcpc));return}
    const f1=e.target.closest('[data-tcf1]');if(f1){TCS.f1=f1.dataset.tcf1;tcDraw();return}
    /* menús de la barra (funcionan también en un tareo enviado: no pasan por tcAct) */
    const m=e.target.closest('[data-tcm]');if(m){tcMenuAct(m.dataset.tcm);return}
    const d=e.target.closest('[data-tcd]');if(d&&!d.disabled){if(d.dataset.tcd!==TCS.date)tcOpen(d.dataset.tcd);TCS.menu='';tcDraw();return}
    const s=e.target.closest('[data-tcs]');if(s){tcGo(+s.dataset.tcs,!!s.closest('.tc-foot'));return}
    const b=e.target.closest('[data-tca]');if(!b||b.tagName==='INPUT')return;tcAct(b.dataset.tca,b,e)});
  root.addEventListener('change',e=>{const t=e.target;if(t.id==='tcF1'){TCS.f1=t.value;tcDraw();return}if(t.id==='tcFile'){const f=t.files&&t.files[0];t.value='';if(f)tcAddFoto(f);return}
    const a=t.dataset.tca;if(!a||tcRO())return;const D=TCS.doc;if(!D)return;const w=t.closest('[data-dni]');const r=w&&D.rows&&D.rows[w.dataset.dni];
    /* «Elegir varios»: tocar la casilla ☑ (no solo el nombre) elige o quita al obrero (22-10-2026: la casilla se marcaba pero no contaba) */
    if(a==='msel'){const M=TCS.multi;const d=w&&w.dataset.dni;if(M&&d){if(t.checked)M.add(d);else M.delete(d)}tcDraw();return}
    if(a==='alt'&&r){r.alt=t.checked;tcChg();return}
    /* horario: una hora igual a la de la jornada no se guarda (queda «horario normal»). En un no laborable, al escribir la salida o
       marcar corrido se guarda también la entrada que se ve (auditoría 21-10-2026: antes quedaba sin horario y no se comparaba). */
    if((a==='ent'||a==='sal')&&r){const J=tcJor(TCS.date);const v=t.value;const def=a==='ent'?J.j.ini:J.j.fin;if(a==='sal'&&tHmOk(v))tcNlEnt(r);if(!tHmOk(v)||(!J.nl&&v===def))delete r[a];else r[a]=v;tcChg();return}
    if(a==='cor'&&r){if(t.checked){tcNlEnt(r);r.cor=true}else delete r.cor;tcChg();return}
    /* horas escritas en las hojas: ya se aplicaron al escribir (tcLiveIn); aquí solo se avisa si no es un número */
    if(a==='wkIn'||a==='cellIn'||a==='asgIn'){if(tcLiveIn(t)===null)toast(a==='asgIn'?'Escribe un número de horas.':'Escribe un número de horas (por ejemplo 6,5).');return}
});
  root.addEventListener('input',e=>{const t=e.target;if(t.id==='tcMpcIn'){tcMpcLive(t.value);return}if(t.id==='tcPcQ'){TCS.pcQ=t.value;const l=$('#tcPcL');if(l)l.innerHTML=tcPcList()}
    else if(t.id==='tcAddQ'){TCS.addQ=t.value;const l=$('#tcAddL');if(l)l.innerHTML=tcAddList()}
    /* buscador del paso 1: solo cambia la lista (rearmar la pantalla en cada letra cerraba o hacía parpadear el teclado del iPhone) */
    else if(t.id==='tcQ1'){TCS.q1=t.value;const l=$('#tcL1');if(l){l.innerHTML=tcL1Html();root.__tch=''}else tcDraw()}
    else if(t.dataset&&['wkIn','cellIn','asgIn'].includes(t.dataset.tca)&&!tcRO())tcLiveIn(t)});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'&&(TCS.menu||TCS.ob||TCS.pcm)){e.preventDefault();TCS.menu='';TCS.ob='';TCS.pcm='';tcDraw();return}
    if(e.key==='Escape'&&TCS.pcSh){e.preventDefault();TCS.pcSh=false;tcDraw();return}
    if(e.key==='Escape'&&TCS.mpc){e.preventDefault();TCS.mpc='';TCS.mpcV=null;tcDraw();return}
    if(e.key==='Enter'&&e.target.id==='tcMpcIn'){e.preventDefault();const n=TCS.mpcV;if(n>0)tcMpcApply(n);else toast('Escribe cuántas horas (por ejemplo 4 o 4,5).');return}
    if(e.key==='Escape'&&TCS.cell){e.preventDefault();TCS.cell=null;tcDraw();return}
    if(e.key==='Escape'&&(TCS.asg||TCS.wk||TCS.hfx)){e.preventDefault();TCS.asg=null;TCS.wk='';TCS.hfx='';tcDraw();return}
    /* Enter en la casilla: aplica y cierra; en «Su día» y «Asignar», solo deja de escribir */
    if(e.key==='Enter'&&e.target.dataset&&e.target.dataset.tca==='cellIn'){e.preventDefault();if(tcLiveIn(e.target)===null){toast('Escribe un número de horas (por ejemplo 6,5).');return}TCS.cell=null;TCS.cellW=false;tcDraw();return}
    if(e.key==='Enter'&&e.target.dataset&&['wkIn','asgIn'].includes(e.target.dataset.tca)){e.preventDefault();e.target.blur();return}
    if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.tcnm){e.preventDefault();tcNmToast(e.target.dataset.tcnm);return}
    if((e.key==='Enter'||e.key===' ')&&e.target.dataset&&e.target.dataset.tcpc){e.preventDefault();toast(tcPcName(e.target.dataset.tcpc));return}
    if(e.key==='Enter'&&e.target.id==='tcPcQ'){const f=$('#tcPcL [data-tca="pc"]');if(f){e.preventDefault();f.click()}}})}
function tcMenuAct(a){const D=TCS.doc;
  if(a==='day'||a==='more'){TCS.menu=TCS.menu===a?'':a;tcDraw();return}
  if(a==='x'){TCS.menu='';tcDraw();return}
  if(a==='reabOk'){tcReabSet(D,true);tcDraw();return}
  if(a==='reab'){tcReabSet(D,false);tcDraw();const b=$('#tcBody');if(b)b.scrollTop=0;return}
  if(a==='cuad'){TCS.menu='';if(typeof goTab==='function')goTab('tper');return}
  if(a==='out'){TCS.menu='';tcDraw();const o=$('#blogout');if(o)o.click();return}}
/** lleva al primer problema: asistencia (paso 1), trabajos (paso 2), horas de un obrero (paso 3, su columna), foto (paso 4). true si llevó a alguno. */
function tcFix(E){const D=TCS.doc;if(!D)return false;E=E||tcErrs(D);TCS.cell=null;
  const e1=E.find(e=>TC_K1.includes(e.k));
  if(e1){TCS.need=true;TCS.step=1;TCS.q1='';TCS.f1='all';TCS.foc=e1.dni?`.tc-ob[data-dni="${CSS.escape(e1.dni)}"]`:'';tcDraw();
    const n=E.filter(e=>e.k==='asis').length;toast(n?`Falta marcar si ${n===1?'vino 1 obrero':`vinieron ${n} obreros`}.`:tcErrMsg(e1));return true}
  const e2=E.find(e=>TC_K2.includes(e.k));
  if(e2){TCS.step=2;TCS.pcOn=e2.k==='pcs';TCS.foc=e2.pc?`.tc-pcr[data-pc="${CSS.escape(e2.pc)}"]`:e2.k==='pcs'?'#tcPcAdd':'';tcDraw();toast(tcErrMsg(e2));return true}
  const e3=E.find(e=>TC_K3.includes(e.k));
  if(e3){TCS.step=3;TCS.foc=e3.dni?`.tc-gn[data-dni="${CSS.escape(e3.dni)}"]`:'';if(e3.k==='hor'&&e3.dni)TCS.hfx=e3.dni;tcDraw();if(e3.k!=='hor')toast(tcErrMsg(e3));return true}
  if(E.length){TCS.step=4;TCS.foc='#tcFotoC';if(E.some(e=>e.k==='foto'))TCS.fotoHi=true;tcDraw();toast(tcErrMsg(E[0]));return true}
  return false}
function tcGo(n,foot){TCS.cell=null;TCS.pcSh=false;TCS.asg=null;TCS.mpc='';TCS.menu='';TCS.ob='';TCS.pcm='';TCS.cellW=false;TCS.wk='';TCS.hfx='';TCS.multi=null;if(n!==3)TCS.rep=null;n=Math.max(1,Math.min(4,n));const D=TCS.doc;
  if(D&&!tcRO()&&!tcLegacy(D)&&n>1){const E=tcErrs(D);
    /* no se pasa del paso 1 sin marcar a todos */
    if(E.some(e=>TC_K1.includes(e.k))){tcFix(E);return}
    /* los botones de abajo no avanzan sin trabajos (a la grilla) ni con horas por corregir (a revisar) */
    if(foot&&n>=3&&E.some(e=>TC_K2.includes(e.k))){tcFix(E.filter(e=>TC_K2.includes(e.k)));return}
    if(foot&&n===4&&E.some(e=>TC_K3.includes(e.k))){tcFix(E.filter(e=>TC_K3.includes(e.k)));return}}
  TCS.step=n;tcDraw();const b=$('#tcBody');if(b)b.scrollTop=0}
async function tcAct(a,b){if(tcRO())return;const D=TCS.doc;if(!D)return;const R=D.rows=D.rows||{};const dniOf=()=>{const w=b.closest('[data-dni]');return w&&w.dataset.dni};
  const pcOf=()=>{const w=b.closest('[data-pc]');return w&&w.dataset.pc};
  /* después de una confirmación (uiAsk espera al usuario) se vuelve a leer TCS.doc: mientras la ventana está abierta el guardado
     automático (tcSaveNow) o la llegada de la base lo reemplazan por otro objeto, y cambiar el viejo no hacía nada. */
  const cur=date=>{const x=TCS.doc;return x&&TCS.date===date&&!tcRO()?x:null};
  if(a==='fix'){tcFix();return}
  if(a==='foto'){tcFotoGo();return}
  if(a==='f1x'){TCS.q1='';TCS.f1='all';tcDraw();return}
  /* tareo antiguo: lo único que se puede hacer es pasarlo a horas por partida (conserva las horas de cada obrero en cada partida,
     también las de quien no vino, para cuando vuelva a «vino») */
  if(tcLegacy(D)){if(a!=='conv')return;
    const C=tCalc({...D,rows:Object.fromEntries(Object.entries(R).map(([k,r])=>[k,{...r,as:true}]))}).rows;const pcs=[];
    for(const k of D.blq)if(k&&k.pc&&!pcs.includes(k.pc))pcs.push(k.pc);
    const J=tcJor(TCS.date);const cf=tcCfg(TCS.date);const hue=[];
    /* el horario de sus bloques pasa a entrada y salida, solo si cuadra con sus horas: con huecos entre bloques fuera del refrigerio,
       la primera entrada y la última salida darían más horas (HE falsas), así que queda la jornada y se avisa (auditoría 21-10-2026).
       En un no laborable se guardan las dos aunque sean iguales a las del lunes (si no, no habría horario con qué comparar). */
    for(const[k,r]of Object.entries(R)){r.h={...((C[k]||{}).h||{})};const c=C[k]||{};
      if(r.as===true&&tHmOk(c.ini)&&tHmOk(c.fin)){const HR=tHorRow({ent:c.ini,sal:c.fin},TCS.date,cf);
        if(HR&&!HR.bad&&Math.abs(HR.h-(+c.trab||0))<=0.01){if(J.nl||c.ini!==J.j.ini)r.ent=c.ini;if(J.nl||c.fin!==J.j.fin)r.sal=c.fin}else hue.push(tcShort(r)||k)}}
    D.modo='hrs';D.pcs=pcs;D.blq=[];TCS.step=3;tcChg();
    toast(hue.length?`Listo: ahora el tareo es por horas. ${hue.length===1?`${hue[0]} tenía huecos entre bloques: quedó`:`${hue.length} obreros tenían huecos entre bloques: quedaron`} con el horario de la jornada; revisa su salida.`:'Listo: ahora el tareo es por horas. Revisa la grilla.');return}
  /* asistencia: el que no vino conserva sus horas (tCalc le da 0 h); al volver a «vino» las recupera */
  if(a==='vino'||a==='novino'){const dni=dniOf();const r=R[dni];if(!r)return;
    if(a==='vino'){if(r.as===true)return;r.as=true;r.mot='';if(TCS.motO===dni)TCS.motO=''}else{if(r.as===false)return;r.as=false;r.alt=false;if(TCS.salO===dni)TCS.salO=''}/* conserva ent/sal/cor como conserva h (auditoría 21-10-2026) */tcChg();return}
  if(a==='todos'){let n=0;for(const r of Object.values(R))if(tcSinM(r)){r.as=true;r.mot='';n++}if(n){tcChg();toast(`${n} ${n===1?'marcado':'marcados'} como «vino».`)}return}
  /* hoja del obrero (paso 1): tocar su nombre; motT/salT (antes plegables en la fila) abren la misma hoja */
  if(a==='ob'||a==='motT'||a==='salT'){const dni=dniOf();if(!dni||!R[dni])return;TCS.ob=dni;tcDraw();return}
  if(a==='obX'){TCS.ob='';tcDraw();return}
  /* motivo opcional: tocar el elegido lo quita */
  if(a==='mot'){const r=R[dniOf()];if(!r)return;r.mot=r.mot===b.dataset.v?'':b.dataset.v;tcChg();return}
  if(a==='salX'||a==='horX'){const r=R[dniOf()];if(!r)return;delete r.sal;delete r.ent;delete r.cor;tcChg();return}
  if(a==='salQ'){const r=R[dniOf()];if(!r)return;tcNlEnt(r);r.sal=b.dataset.v;tcChg();return}
  if(a==='rm'){const dni=dniOf();const r=R[dni];if(!r)return;const date=TCS.date;if(!await uiAsk({title:'¿Quitar del tareo?',text:`${tcNm(r)} sale del tareo de este día (no se borra del personal).`,ok:'Quitar',tone:'warn'}))return;
    const D2=cur(date);if(!D2||!D2.rows)return;delete D2.rows[dni];if(TCS.ob===dni)TCS.ob='';tcChg();return}
  if(a==='addOn'){TCS.addOn=true;TCS.addQ='';tcDraw();const i=$('#tcAddQ');if(i)i.focus();return}
  if(a==='addOff'){TCS.addOn=false;tcDraw();return}
  /* obrero de otra cuadrilla (de otro capataz o sin capataz): se permite con confirmación y queda ajeno/capOrig para la oficina */
  if(a==='add'){const p=S.tper.get(b.dataset.v);if(!p)return;const aj=(p.cap||'')!==TCS.cap;const date=TCS.date;
    if(aj&&!await uiAsk({title:'No es de tu cuadrilla',text:`${tName(p)} no es de tu cuadrilla (es ${tcCapOrig(p.cap||'')}). ¿Lo tareas igual?`,note:'La oficina verá que no es de tu cuadrilla.',ok:'Tarear igual',tone:'warn'}))return;
    const D2=cur(date);if(!D2)return;const R2=D2.rows=D2.rows||{};
    R2[p.dni||p.id]=aj?{...tcRowOf(p,true),ajeno:true,capOrig:p.cap||''}:tcRowOf(p,true);TCS.addQ='';TCS.addOn=false;tcChg();toast(tName(p)+' agregado (vino).');return}
  /* paso 2: trabajos del día */
  if(a==='pcOn'){TCS.pcOn=true;TCS.pcQ='';tcDraw();const i=$('#tcPcQ');if(i)i.focus();return}
  if(a==='pcOff'){TCS.pcOn=false;TCS.pcQ='';tcDraw();return}
  if(a==='pcSh'){TCS.cell=null;TCS.pcm='';TCS.pcQ='';TCS.pcSh=true;tcDraw();const i=$('#tcPcQ');if(i&&!tcTouch())i.focus({preventScroll:true});return}
  if(a==='pcShX'){TCS.pcSh=false;TCS.pcQ='';tcDraw();return}
  if(a==='pc'&&TCS.pcSh){const id=b.dataset.v;const P=D.pcs=Array.isArray(D.pcs)?D.pcs:[];if(!id||P.includes(id)||tcBloq(id))return;
    P.push(id);tcUseAdd(id);TCS.pcQ='';TCS.pcSh=false;const f=tcPres()[0];TCS.cell=TCS.wk?null:f?{dni:f[0],pc:id}:null;tcChg();toast(`Agregado: ${tcPcCod(id)}`);
    const g=$('#tcGrid');if(g)g.scrollLeft=g.scrollWidth;return}
  if(a==='pc'){const id=b.dataset.v;const P=D.pcs=Array.isArray(D.pcs)?D.pcs:[];if(!id||P.includes(id)||tcBloq(id))return;
    P.push(id);tcUseAdd(id);TCS.pcQ='';TCS.pcOn=true;tcChg();toast(`Agregado: ${tcPcCod(id)}`);const i=$('#tcPcQ');if(i)i.focus({preventScroll:true});return}
  if(a==='pcUp'||a==='pcDn'){const pc=pcOf();const P=D.pcs||[];const i=P.indexOf(pc);const j=a==='pcUp'?i-1:i+1;if(i<0||j<0||j>=P.length)return;[P[i],P[j]]=[P[j],P[i]];tcChg();return}
  if(a==='pcRm'){const pc=pcOf();if(!pc)return;const h=tcPcHrs(D,pc);const date=TCS.date;
    if(h>0&&!await uiAsk({title:`¿Quitar ${tcPcCod(pc)}?`,text:`${tcPcName(pc)} tiene ${tcH(h)} cargadas. Si la quitas, se borran esas horas.`,ok:'Quitar y borrar horas',tone:'warn'}))return;
    const D2=cur(date);if(!D2)return;D2.pcs=(D2.pcs||[]).filter(x=>x!==pc);for(const r of Object.values(D2.rows||{}))if(r&&r.h&&pc in r.h)delete r.h[pc];
    if(TCS.cell&&TCS.cell.pc===pc)TCS.cell=null;if(TCS.pcm===pc)TCS.pcm='';tcChg();return}
  if(a==='copy'&&TCS.prev){const ok=new Set(tcPcs().map(x=>x.id));D.pcs=TCS.prev.pcs.filter(pc=>ok.has(pc));TCS.pcOn=false;tcChg();
    toast(`Se copiaron ${D.pcs.length} ${D.pcs.length===1?'trabajo':'trabajos'}: quita los que hoy no hubo.`);return}
  /* paso 3: grilla */
  if(a==='pcMenu'){const pc=pcOf();if(!pc)return;TCS.cell=null;TCS.pcm=pc;tcDraw();return}
  if(a==='pcmX'){TCS.pcm='';tcDraw();return}
  if(a==='rotX'){TCS.rotX=true;try{localStorage.setItem('lps.tcrot','1')}catch(e){}tcDraw();return}
  if(a==='cell'){TCS.cell={dni:b.dataset.dni,pc:b.dataset.pc};TCS.cellW=false;TCS.pcm='';tcDraw();return}
  if(a==='cellX'){TCS.cell=null;TCS.cellW=false;tcDraw();return}
  if(a==='cellW'){TCS.cellW=true;tcDraw();const i=$('#tcCin');if(i){i.focus({preventScroll:true});try{i.select()}catch(e){}}return}
  if(a==='cellAdj'||a==='cellSet'){const c=TCS.cell;const r=c&&R[c.dni];if(!r||!tcVino(r))return;
    if(tcBloq(c.pc)&&!(a==='cellSet'&&b.dataset.r==null&&+b.dataset.v===0))return;
    /* «El resto de su horario» (#tcCellR, siempre en la hoja y oculto si no le falta nada) lleva su valor en data-r */
    tcSetH(r,c.pc,a==='cellAdj'?tcHv(r,c.pc)+(+b.dataset.v||0):+(b.dataset.r!=null?b.dataset.r:b.dataset.v));if(a==='cellSet'){TCS.cell=null;TCS.cellW=false}tcChg();return}
  /* paso 4: tocar una celda lleva al paso 3 con esa celda abierta */
  if(a==='go3'){const dni=b.dataset.dni,pc=b.dataset.pc;if(!dni||!pc)return;TCS.step=3;TCS.cell=tcVino(R[dni])&&(D.pcs||[]).includes(pc)?{dni,pc}:null;
    TCS.foc=`.tc-gcell[data-dni="${CSS.escape(dni)}"][data-pc="${CSS.escape(pc)}"]`;tcDraw();return}
  /* «Toda la jornada» de una partida (encabezado de su columna): a cada uno que vino le suma lo que le falta para su jornada */
  if(a==='pcAll'){const pc=pcOf();if(!pc||tcBloq(pc))return;let n=0;TCS.pcm='';
    /* con «Elegir varios»: todo el día de los elegidos va a esta partida (reemplaza lo que tenían) y se sale de la selección (20-10-2026) */
    /* con «Elegir varios» (22-10-2026): se abre la hoja para elegir cuántas horas van a esta partida (antes ponía todo el día) */
    if(TCS.multi){const M=TCS.multi;if(!M.size){toast('Primero elige a los obreros.');return}if(!tcAsgM(D).length){toast('Los elegidos no vinieron.');return}
      TCS.mpc=pc;TCS.mpcV=null;TCS.mpcW=false;TCS.cell=null;TCS.asg=null;tcDraw();return}
    /* sin selección: a cada uno que vino le suma lo que le falta para su horario */
    for(const[,r]of tcPres()){const f=tR2(tcHorH(r)-tHrsTot(r));if(f>0){tcSetH(r,pc,tcHv(r,pc)+f);n++}}
    if(n){tcChg();toast(`${tcPcCod(pc)}: se completó el horario de ${n} ${n===1?'obrero':'obreros'}.`)}else toast('Todos ya tienen sus horas completas: para cambiar a algunos usa «Elegir varios».');return}
  /* carga rápida (20-10-2026) */
  if(a==='rep'){const pv=TCS.prev;if(!pv||!pv.hrs)return;const ok=new Set(tcPcs().map(x=>x.id));const P=D.pcs=Array.isArray(D.pcs)?D.pcs:[];
    for(const pc of pv.pcs)if(ok.has(pc)&&!P.includes(pc))P.push(pc);
    /* auditoría 21-10-2026: se copia el reparto de ayer, no sus horas: se ajustan a su horario de HOY (en proporción, en cuartos de hora;
       el residuo a la partida mayor). Su entrada, salida y corrido no se copian. Quien ya tenía horas se cuenta aparte. */
    const pres=tcPres();let n=0,ya=0,aj=0;const falt=[];if(!TCS.repD)TCS.repD=new Map();
    for(const[d,r]of pres){if(tHrsTot(r)>0){ya++;continue}const pr=pv.rows&&pv.rows[d];const h={};
      if(pr&&pr.as===true)for(const[pc,v]of Object.entries(pr.h||{}))if(P.includes(pc)&&!tcBloq(pc)&&tHv(v))h[pc]=tR2(+v);
      if(Object.keys(h).length){const tot=tcHorH(r);if(Math.abs(tHrsTot({h})-tot)>0.01)aj++;r.h=tcRepartir(h,tot);TCS.repD.set(d,tcHKey(r.h));n++}else falt.push(tcSN(d))}
    const RP=TCS.rep={n,ya,aj,tot:pres.length,falt,de:`${TC_DN[pd(pv.date).getUTCDay()].toLowerCase()} ${+pv.date.slice(8)}`};tcChg();
    /* el resultado va en un aviso arriba (caja 7), no en un recuadro fijo sobre la grilla */
    toast(`${RP.n?`Se copió ${RP.de} a ${RP.n} de ${RP.tot-ya} sin horas${RP.aj?` (${RP.aj} ${RP.aj===1?'ajustado':'ajustados'} a su horario de hoy)`:''}.`:'No había horas que copiar.'}${ya?` ${ya} ya ${ya===1?'tenía horas: no se cambió':'tenían horas: no se cambiaron'}.`:''}${RP.falt.length?` Falta${RP.falt.length>1?'n':''}: ${RP.falt.join(', ')}.`:''}`,'Entendido',()=>{});return}
  if(a==='multi'){TCS.multi=new Set();TCS.cell=null;TCS.rep=null;tcDraw();return}
  if(a==='multiX'){TCS.multi=null;TCS.asg=null;TCS.mpc='';tcDraw();return}
  if(a==='mpcX'){TCS.mpc='';TCS.mpcV=null;TCS.mpcW=false;tcDraw();return}
  if(a==='mpcW'){TCS.mpcW=true;tcDraw();const i=$('#tcMpcIn');if(i)i.focus({preventScroll:true});return}
  if(a==='mpcSet'){const m=b.dataset.m||+b.dataset.v;if(m)tcMpcApply(m);return}
  if(a==='mpcOk'){const n=TCS.mpcV;if(!(n>0)){toast('Escribe cuántas horas (por ejemplo 4 o 4,5).');return}tcMpcApply(n);return}
  if(a==='msel'||a==='mtog'){const d=dniOf()||b.dataset.dni;const M=TCS.multi;if(!M||!d)return;if(M.has(d))M.delete(d);else M.add(d);tcDraw();return}
  if(a==='mAll'||a==='mNone'||a==='mSin'||a==='mCua'){const M=TCS.multi;if(!M)return;M.clear();
    for(const[d,r]of tcPres())if(a==='mAll'||(a==='mSin'&&!tHrsTot(r))||(a==='mCua'&&r.cua===b.dataset.v))M.add(d);tcDraw();return}
  if(a==='asgOn'){if(!TCS.multi||!TCS.multi.size)return;const P=(D.pcs||[]).filter(pc=>!tcBloq(pc));if(!P.length){toast('Primero agrega los trabajos del día.');return}
    TCS.asg={v:{},resto:P.length===1?P[0]:'',half:false};tcDraw();return}
  if(a==='asgX'){TCS.asg=null;tcDraw();return}
  if(a==='asgR'){const A=TCS.asg;if(!A)return;const pc=b.dataset.pc;A.resto=A.resto===pc?'':pc;A.half=false;delete A.v[pc];tcDraw();return}
  if(a==='asgAll'){const A=TCS.asg;if(!A)return;A.v={};A.resto=b.dataset.pc;A.half=false;tcDraw();return}
  if(a==='asgHalf'){const A=TCS.asg;if(!A)return;A.half=!A.half;A.resto='';A.v={};tcDraw();return}
  if(a==='asgOk'){const A=TCS.asg;const M=TCS.multi;if(!A||!M)return;if(!tcAsgAny(D)){toast('Escribe las horas de alguna partida o elige «el resto».');return}const P=tcAsgP(D);let n=0;
    /* solo las partidas que se llenaron (tcAsgOut); las vacías no se tocan */
    for(const d of M){const r=R[d];if(!tcVino(r))continue;const o=tcAsgOut(r,A,P);for(const[pc,v]of Object.entries(o))tcSetH(r,pc,v);n++}
    TCS.asg=null;TCS.multi=null;tcChg();toast(`Listo: ${n} ${n===1?'obrero':'obreros'} con sus horas.`);return}
  if(a==='wk'){const d=b.dataset.dni;if(!d||!tcVino(R[d]))return;TCS.cell=null;TCS.wk=d;tcDraw();const i=$('#tcWk input[data-tca="wkIn"]:not([disabled])');if(i&&!tHrsTot(R[d])&&!tcTouch())i.focus({preventScroll:true});return}
  if(a==='wkX'){TCS.wk='';tcDraw();return}
  if(a==='hfx'){const d=b.dataset.dni;if(!d)return;TCS.cell=null;TCS.hfx=d;tcDraw();return}
  if(a==='hfxX'){TCS.hfx='';tcDraw();return}
  if(a==='hfxSal'){const d=TCS.hfx||TCS.wk;const r=R[d];const v=b.dataset.v;if(!r||!tHmOk(v))return;const J=tcJor(TCS.date);tcNlEnt(r);if(!J.nl&&v===J.j.fin)delete r.sal;else r.sal=v;TCS.hfx='';tcChg();
    const H2=tcHor(r);toast(H2&&!H2.bad&&Math.abs(H2.h-tHrsTot(r))<=0.01?`Salida ${tcT(v)}: ya cuadra.`:`Salida ${tcT(v)}: todavía no cuadra con sus horas.`);return}
  /* «Ajustar sus horas a su horario»: reparte su horario entre sus partidas en la misma proporción (las bloqueadas no se tocan) */
  if(a==='hfxAdj'){const d=TCS.hfx;const r=R[d];const H=r&&tcHor(r);if(!H||H.bad||!(H.h>0))return;const kb={},kn={};
    for(const[pc,v]of Object.entries(r.h||{}))if(tHv(v))(tcBloq(pc)?kb:kn)[pc]=+v;
    const nb=tR2(Math.max(0,H.h-tHrsTot({h:kb})));r.h={...kb,...tcRepartir(kn,nb)};if(TCS.repD)TCS.repD.delete(d);TCS.hfx='';tcChg();toast(`Listo: ${tcH(H.h)}, como su horario.`);return}
  if(a==='hfxCor'){const r=R[TCS.hfx];if(!r)return;if(r.cor)delete r.cor;else r.cor=true;TCS.hfx='';tcChg();return}
  if(a==='hfxNorm'){const r=R[TCS.hfx];if(!r)return;delete r.sal;delete r.ent;delete r.cor;tcChg();return}
  if(a==='hfxWk'){const d=TCS.hfx;TCS.hfx='';TCS.wk=d;tcDraw();return}
  if(a==='wkSet'){const r=R[TCS.wk];if(!r)return;tcSetH(r,b.dataset.pc,+b.dataset.v);tcChg();return}
  if(a==='wkNav'){const pres=tcPres().map(([x])=>x);const i=pres.indexOf(TCS.wk);const j=i+(+b.dataset.v||0);TCS.wk=j>=0&&j<pres.length?pres[j]:'';tcDraw();return}
  if(a==='copyH'){const pv=tcPrevH(D);if(!pv)return;const P=D.pcs||[];
    for(const[d,r]of tcPres()){const h={};for(const[pc,v]of Object.entries(pv.rows[d].h||{}))if(P.includes(pc)&&tHv(v))h[pc]=tR2(+v);r.h=h}
    tcChg();toast('Se copiaron las horas: revisa la grilla.');return}
  /* paso 4 */
  if(a==='send')return tcSend();
  /* quitar una foto pide confirmar (auditoría 22-10-2026): una sin subir se borra del celular para siempre */
  if(a==='fpX'){const w=b.closest('[data-fpid]');if(!w)return;const id=w.dataset.fpid;
    if(!await uiAsk({title:'¿Descartar esta foto?',text:'Todavía no se subió: si la descartas, se borra de este celular y tendrás que tomarla de nuevo.',ok:'Descartar foto',tone:'danger'}))return;
    delete TCS.fp[id];tcFpPut(id,0,null);tcDraw();return}
  if(a==='fpRe'){const w=b.closest('[data-fpid]');if(w)tcFotUp(w.dataset.fpid);return}
  if(a==='fx'){const w=b.closest('[data-fid]');if(!w)return;const id=w.dataset.fid;const date=TCS.date;
    if(!await uiAsk({title:'¿Quitar esta foto?',text:'La foto del formato firmado se quita del tareo.',ok:'Quitar foto',tone:'warn'}))return;
    const D2=cur(date);if(!D2)return;D2.foto=(D2.foto||[]).filter(x=>x!==id);tcChg();return}}
async function tcSend(){const D=TCS.doc;if(!D||tcRO())return;const E=tcErrs(D);if(E.length){if(!tcFix(E))toast(tcErrMsg(E[0]));return}
  const C=tcCalc(D);const rows=Object.values(C.rows||{});const v=rows.filter(tcVino);const hh=tR2(v.reduce((s,r)=>s+(+r.trab||0),0)),he=tR2(v.reduce((s,r)=>s+(+r.ext||0),0));
  if(!await uiAsk({title:'¿Enviar el tareo?',text:`${fmtD(TCS.date)}: ${v.length} vinieron, ${rows.length-v.length} no vinieron · ${tcH(hh)}${he?` (${tcH(he)} extra)`:''}.`,note:'Después de enviarlo ya no podrás cambiarlo; si hay un error, el asistente de tareo te lo reabre.',ok:'Enviar tareo',tone:'ok'}))return;
  /* después de la confirmación se vuelve a leer el tareo (pudo reemplazarse mientras la ventana estaba abierta) */
  const D2=TCS.doc;if(!D2||tcRO()||tcErrs(D2).length)return;
  const prev={st:D2.st,envAt:D2.envAt,envBy:D2.envBy,hist:D2.hist,cfg:D2.cfg,envN:D2.envN};const t=NOW();
  /* envN: contador de envíos (1 el primero, +1 en cada reenvío de un reabierto); la oficina ata el cotejo a este ciclo */
  D2.st='env';D2.envAt=t;D2.envBy=me.email;D2.envN=(Number.isInteger(D2.envN)&&D2.envN>0?D2.envN:0)+1;D2.hist=[...(Array.isArray(D2.hist)?D2.hist:[]),{t,by:me.email,a:'env'}];
  /* jornada del día congelada en el tareo (si ya la tiene, p. ej. un reabierto, se conserva) */
  if(!D2.cfg&&typeof tCfgDia==='function'){try{const c=tCfgDia(TCS.date);if(c)D2.cfg=c}catch(e){}}
  const date=TCS.date;clearTimeout(TCS.sendT);TCS.sendSt=tcOff()?'queued':'sending';TCS.err='';const p=tcSaveNow();tcDraw();
  /* «Enviado ✓» solo cuando el servidor lo confirma; si tarda (sin señal) queda «Se enviará al tener señal» */
  TCS.sendT=setTimeout(()=>{if(TCS.date===date&&TCS.sendSt==='sending'){TCS.sendSt='queued';tcDraw()}},2500);
  p.then(()=>{if(TCS.date!==date)return;clearTimeout(TCS.sendT);TCS.sendSt='ok';TCS.srvPend=false;tcDraw();toast('Tareo enviado ✓')},
  /* si la base lo rechaza, vuelve a borrador (o reabierto) con el error */
    err=>{if(TCS.date!==date||!TCS.doc)return;clearTimeout(TCS.sendT);TCS.sendSt='';for(const[k,v]of Object.entries(prev)){if(v===undefined)delete TCS.doc[k];else TCS.doc[k]=v}TCS.dirty=false;
      TCS.err='No se pudo enviar el tareo: '+(err&&err.code==='permission-denied'?'el servidor lo rechazó.':(err&&(err.code||err.message))||'error')+' Revisa y vuelve a intentarlo.';tcDraw();toast('No se pudo enviar el tareo.')})}
