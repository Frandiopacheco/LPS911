"use strict";
/* LPS 911 · Módulo Tareo (fase 1): pantalla del capataz del tareo (rol `tcap`) en el celular.
   Contrato en docs/ia/tareo.md («Contrato de F1»). Tres pasos: ¿quién vino? · ¿en qué trabajaron? · revisar y enviar.
   Guarda el borrador solo (≈1 s después del último cambio) en tareo/{fecha}_{capId}; con la persistencia de Firestore
   funciona sin señal. Los cálculos (tBlqH, tCalc, tValida) son de tareo.js; aquí hay versiones de respaldo (_tc…).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* motivos de ausencia (el más común primero) */
const TC_MOT=[['FA','Falta'],['DM','Descanso médico'],['VA','Vacaciones'],['DA','Descanso por accidente'],['SU','Suspensión'],['SE','Subsidio por enfermedad'],['SM','Subsidio por maternidad'],['LS','Licencia sin goce'],['L','Liquidado']];
const TC_RO=['env','rev','pub'];
/* estado de la pantalla (no va en U: es del día que se está llenando) */
const TCS={date:'',cap:'',unsub:null,doc:null,loaded:false,exists:false,step:1,dirty:false,saveT:0,inflight:0,pend:false,err:'',slowT:0,
  ed:null,edMsg:'',pcQ:'',addOn:false,addQ:'',past:{},prev:null,img:{},imgReq:{},busy:false};

/* ---------- respaldo de las funciones puras de tareo.js (si aún no existen) ---------- */
function _tcBlqH(fecha,ini,fin){return tHoras(fecha,ini,fin).trab}
function _tcCalc(doc){const d=JSON.parse(JSON.stringify(doc||{}));const rows=d.rows||{};const blq=Array.isArray(d.blq)?d.blq:[];const f=d.date;
  const BH=typeof tBlqH==='function'?tBlqH:_tcBlqH;const c=TC();const j=c.jor[String(pd(f).getUTCDay())];
  for(const[dni,r]of Object.entries(rows)){const h={};let a=null,b=null,sum=0;
    if(r.as!==false)for(const k of blq){if(!(k.dnis||[]).includes(dni))continue;const x=tMin(k.ini),y=tMin(k.fin);if(x==null||y==null||y<=x)continue;
      const v=BH(f,k.ini,k.fin);if(k.pc)h[k.pc]=tR2((h[k.pc]||0)+v);sum+=v;if(a==null||x<tMin(a))a=k.ini;if(b==null||y>tMin(b))b=k.fin}
    sum=tR2(sum);let trab=0,ext=0;
    if(a!=null){const full=tHoras(f,a,b);if(Math.abs(full.trab-sum)<0.01){trab=full.trab;ext=full.ext}else{trab=sum;ext=tNoLab(f)?sum:tR2(Math.max(0,sum-tJorH(j)))}}
    Object.assign(r,{h,ini:a||'',fin:b||'',trab,ext})}
  d.rows=rows;return d}
function _tcValida(doc){const E=[];const rows=(doc&&doc.rows)||{};const blq=Array.isArray(doc&&doc.blq)?doc.blq:[];const nm=dni=>{const r=rows[dni]||{};return[r.ape,r.nom].filter(Boolean).join(', ')||dni};
  if(!Object.keys(rows).length)E.push({dni:null,k:'vacio',msg:'No hay obreros en el tareo.'});
  for(const k of blq){const x=tMin(k.ini),y=tMin(k.fin);if(x==null||y==null||y<=x||x<300||y>1439)E.push({dni:null,k:'hora',msg:`Un trabajo tiene un horario que no vale (${k.ini||'—'} a ${k.fin||'—'}).`})}
  for(const[dni,r]of Object.entries(rows)){
    if(r.as===false){if(!r.mot)E.push({dni,k:'mot',msg:`${nm(dni)}: faltó, pero falta el motivo.`});continue}
    const L=blq.filter(k=>(k.dnis||[]).includes(dni)).map(k=>[tMin(k.ini),tMin(k.fin)]).filter(([x,y])=>x!=null&&y!=null&&y>x).sort((p,q)=>p[0]-q[0]);
    if(!L.length){E.push({dni,k:'sinh',msg:`${nm(dni)}: vino, pero no tiene horas.`});continue}
    for(let i=1;i<L.length;i++)if(L[i][0]<L[i-1][1]){E.push({dni,k:'cruce',msg:`${nm(dni)}: tiene dos trabajos a la misma hora.`});break}}
  if(!Array.isArray(doc&&doc.foto)||!doc.foto.length)E.push({dni:null,k:'foto',msg:'Falta la foto del formato firmado.'});
  return E}
const tcCalc=d=>(typeof tCalc==='function'?tCalc:_tcCalc)(d);
const tcValida=d=>(typeof tValida==='function'?tValida:_tcValida)(d);
const tcBH=(f,a,b)=>(typeof tBlqH==='function'?tBlqH:_tcBlqH)(f,a,b);

/* ---------- utilidades ---------- */
/** id del capataz en members: correo, o 'u_<uid>' si entró con enlace (base.js arma me.email así) */
const tcMe=()=>typeof myMid==='function'?myMid():((me&&me.email)||'');
const tcId=(d,c)=>d+'_'+c;
const tcHM=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const tcH=v=>{v=tR2(+v||0);return(Number.isInteger(v)?String(v):v.toLocaleString('es-PE',{maximumFractionDigits:2}))+' h'};
const tcDay=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const TC_DN=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const tcNm=r=>[r.ape,r.nom].filter(Boolean).join(', ');
const tcShort=r=>{const a=String(r.ape||'').split(' ')[0]||'',n=String(r.nom||'').split(' ')[0]||'';return(n?n.charAt(0)+n.slice(1).toLowerCase()+' ':'')+(a?a.charAt(0)+a.slice(1).toLowerCase():'')};
const tcRO=()=>!!(TCS.doc&&TC_RO.includes(TCS.doc.st));
/** jornada del día y atajos de horario */
function tcJor(date){const c=TC();const dw=String(pd(date).getUTCDay());const j0=c.jor[dw];const j=j0||c.jor['1']||{ini:'07:30',fin:'17:00',ref:60};
  const ri=tMin(c.refIni),a=tMin(j.ini),b=tMin(j.fin);const S={todo:[j.ini,j.fin]};
  if(ri!=null&&ri>a&&ri<b){S.man=[j.ini,c.refIni];const t=ri+(+j.ref||0);if(t<b)S.tar=[tcHM(t),j.fin]}
  return{j,h:j0?tJorH(j0):0,S}}
/** cuadrilla: activos del máster con cap == mi id */
function tcCrew(date){const cap=TCS.cap;return[...S.tper.values()].filter(p=>p&&!p.arch&&p.cap===cap&&tActivo(p,date))}
const tcRowOf=p=>({ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as:true,mot:'',alt:false,ini:'',fin:'',h:{},trab:0,ext:0});
function tcNewDoc(date){const rows={};for(const p of tcCrew(date))rows[p.dni||p.id]=tcRowOf(p);
  return{date,cap:TCS.cap,capN:(MEM.get(TCS.cap)||{}).name||'',st:'bor',rows,blq:[],foto:[],hist:[]}}
/** filas ordenadas: primero la cuadrilla y luego los agregados, por apellido */
function tcRows(){const R=(TCS.doc&&TCS.doc.rows)||{};return Object.entries(R).sort((a,b)=>(a[1].ape||'').localeCompare(b[1].ape||'')||a[0].localeCompare(b[0]))}
const tcPres=()=>tcRows().filter(([,r])=>r.as!==false);
/* partidas más usadas por este capataz (contador en el equipo; si no hay almacenamiento, sin orden especial) */
const tcUseK=()=>'lps.tcpc.'+TCS.cap;
function tcUse(){try{return JSON.parse(localStorage.getItem(tcUseK())||'{}')||{}}catch(e){return{}}}
function tcUseAdd(pc){try{const u=tcUse();u[pc]=(u[pc]||0)+1;localStorage.setItem(tcUseK(),JSON.stringify(u))}catch(e){}}
function tcPcs(){return[...S.tpc.values()].filter(x=>x&&!x.arch&&x.act!==false)}
const tcPcName=id=>{const x=S.tpc.get(id);return x?`${x.cod} · ${x.nom}`:'(partida '+id+')'};

/* ---------- datos: suscripción y guardado ---------- */
function tcOpen(date){tcClose();clearTimeout(TCS.slowT);Object.assign(TCS,{date,cap:tcMe(),doc:null,loaded:false,exists:false,step:1,dirty:false,inflight:0,busy:false,pend:false,err:'',ed:null,edMsg:'',pcQ:'',addOn:false,addQ:'',prev:null});
  const id=tcId(date,TCS.cap);
  TCS.unsub=fcol('tareo').doc(id).onSnapshot(s=>{if(!$('#tcRoot')){tcClose();return}tcSnap(s)},err=>{TCS.err=err&&err.code==='permission-denied'?'Tu cuenta no puede abrir este tareo.':'Sin conexión con la base de datos.';TCS.loaded=true;tcDraw()});
  /* estado de ayer y anteayer (para no dejar elegirlos si ya se enviaron) y el tareo anterior (para copiar sus trabajos) */
  if(date===todayIso())for(const n of[1,2]){const d=tcDay(date,-n);fcol('tareo').doc(tcId(d,TCS.cap)).get().then(s=>{TCS.past[d]=s.exists?(s.data().st||'bor'):'';if($('#tcRoot'))tcDraw()}).catch(()=>{})}
  (async()=>{for(let n=1;n<=3;n++){const d=tcDay(date,-n);try{const s=await fcol('tareo').doc(tcId(d,TCS.cap)).get();if(s.exists&&(s.data().blq||[]).length){if(TCS.date===date){TCS.prev={date:d,blq:s.data().blq};if($('#tcRoot'))tcDraw()}return}}catch(e){return}}})()}
function tcClose(){if(TCS.unsub){try{TCS.unsub()}catch(e){}TCS.unsub=null}if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0;if(TCS.dirty)tcSaveNow().catch(()=>{})}}
function tcSnap(s){const pend=!!(s.metadata&&s.metadata.hasPendingWrites);TCS.loaded=true;
  if(pend){tcStatus();return}/* eco de la escritura propia; si tarda en confirmarse, slowT avisa que quedó en el celular */
  if(!TCS.inflight)TCS.pend=false;
  if(TCS.dirty||TCS.inflight){tcStatus();return}/* lo local manda mientras hay cambios por guardar */
  TCS.exists=s.exists;TCS.doc=s.exists?s.data():tcNewDoc(TCS.date);
  if(!tcRO())tcSyncCrew();
  tcDraw()}
/** agrega a la lista a quien entró a la cuadrilla después (vino por defecto) */
function tcSyncCrew(){const R=TCS.doc.rows=TCS.doc.rows||{};for(const p of tcCrew(TCS.date)){const k=p.dni||p.id;if(!R[k])R[k]=tcRowOf(p)}}
/** marca un cambio: recalcula, redibuja y guarda en ~1 s */
function tcChg(redraw=true){if(tcRO())return;TCS.dirty=true;if(TCS.saveT)clearTimeout(TCS.saveT);TCS.saveT=setTimeout(()=>{TCS.saveT=0;tcSaveNow().catch(()=>{})},1000);if(redraw)tcDraw();else tcStatus()}
function tcSaveNow(){if(TCS.saveT){clearTimeout(TCS.saveT);TCS.saveT=0}if(!TCS.doc)return Promise.resolve();
  const d=tcCalc({...TCS.doc,date:TCS.date,cap:TCS.cap,capN:TCS.doc.capN||(MEM.get(TCS.cap)||{}).name||''});d.by=me.email;d.ts=NOW();
  if(!Array.isArray(d.foto))d.foto=[];if(!Array.isArray(d.hist))d.hist=[];if(!Array.isArray(d.blq))d.blq=[];
  TCS.doc=d;TCS.dirty=false;TCS.inflight++;TCS.err='';TCS.exists=true;
  clearTimeout(TCS.slowT);TCS.slowT=setTimeout(()=>{if(TCS.inflight){TCS.pend=true;tcStatus()}},2500);tcStatus();
  const date=TCS.date;
  return fcol('tareo').doc(tcId(date,TCS.cap)).set(d,{merge:false}).then(()=>{if(TCS.date!==date)return;TCS.inflight=Math.max(0,TCS.inflight-1);if(!TCS.inflight){TCS.pend=false;clearTimeout(TCS.slowT)}tcStatus()},
    err=>{if(TCS.date!==date)return;TCS.inflight=Math.max(0,TCS.inflight-1);TCS.dirty=true;TCS.err='No se pudo guardar: '+(err.code||err.message||err);tcStatus();throw err})}
function tcStatusTxt(){if(TCS.err)return['bad',TCS.err];if(tcRO())return['',''];
  if(TCS.pend&&TCS.inflight)return['warn','Guardado en el celular · se enviará con señal'];
  if(TCS.dirty||TCS.inflight)return['','Guardando…'];if(TCS.exists)return['ok','Guardado'];return['','']}
function tcStatus(){const el=$('#tcSt');if(!el)return;const[k,t]=tcStatusTxt();el.className='tc-st'+(k?' '+k:'');el.textContent=t}

/* ---------- vista ---------- */
function renderTCap(main){const want=TCS.date&&TCS.unsub?TCS.date:todayIso();
  if(!$('#tcRoot',main)){main.innerHTML=`<div class="tc" id="tcRoot"></div>`;tcBind($('#tcRoot',main))}
  if(!TCS.unsub||TCS.date!==want||TCS.cap!==tcMe())tcOpen(want);
  else if(TCS.doc&&!tcRO()&&!TCS.dirty)tcSyncCrew();
  tcDraw()}
function tcDraw(){const root=$('#tcRoot');if(!root)return;
  /* sin cambios no se redibuja: así un toque no se pierde cuando llega la confirmación de la base */
  const html=tcHtml();if(root.__tch===html&&root.firstChild){tcStatus();return}
  const ae=document.activeElement;const fk=ae&&root.contains(ae)&&ae.dataset?ae.dataset.fk:null;const ss=fk?ae.selectionStart:null,se=fk?ae.selectionEnd:null;
  const bd=$('#tcBody');const sc=bd?bd.scrollTop:0;const keep=bd&&bd.dataset.k===TCS.date+'|'+TCS.step+'|'+(TCS.ed?TCS.ed.id:'');
  root.innerHTML=html;root.__tch=html;
  const nb=$('#tcBody');if(nb){nb.dataset.k=TCS.date+'|'+TCS.step+'|'+(TCS.ed?TCS.ed.id:'');if(keep)nb.scrollTop=sc}
  if(fk){const el=root.querySelector(`[data-fk="${CSS.escape(fk)}"]`);if(el){el.focus({preventScroll:true});try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
  tcStatus();tcThumbs()}
function tcHtml(){const D=TCS.doc,hoy=todayIso();
  const dates=[hoy,tcDay(hoy,-1),tcDay(hoy,-2)];
  const dl=(d,i)=>{const st=i?TCS.past[d]:'';const off=i&&TC_RO.includes(st);
    return`<button type="button" class="tc-date${d===TCS.date?' on':''}" data-tcd="${d}"${off?' disabled':''}><b>${i===0?'Hoy':i===1?'Ayer':'Anteayer'}</b><span>${esc(TC_DN[pd(d).getUTCDay()].slice(0,3))} ${esc(fmtD(d))}${off?' · enviado':''}</span></button>`};
  const head=`<div class="tc-head"><div class="tc-dates" role="group" aria-label="Día del tareo">${dates.map(dl).join('')}</div>`;
  if(!TCS.loaded)return head+`</div><div class="tc-body" id="tcBody"><p class="tc-empty">Cargando tu tareo…</p></div>`;
  if(!D)return head+`</div><div class="tc-body" id="tcBody"><div class="callout warnc">${esc(TCS.err||'No se pudo abrir el tareo.')}</div></div>`;
  const ro=tcRO();const E=ro?[]:tcValida(tcCalc(D));
  const s1=!E.some(e=>e.k==='mot'),s2=!E.some(e=>['sinh','cruce','hora'].includes(e.k))&&(D.blq||[]).length>0;
  const steps=[[1,'¿Quién vino?',s1],[2,'¿En qué trabajaron?',s2],[3,'Revisar y enviar',false]];
  const bar=ro?'':`<div class="tc-steps" role="tablist">${steps.map(([n,l,ok])=>`<button type="button" role="tab" class="tc-step${TCS.step===n?' on':''}${ok&&TCS.step!==n?' ok':''}" data-tcs="${n}" aria-selected="${TCS.step===n}"><i>${ok&&TCS.step!==n?'✓':n}</i><span>${l}</span></button>`).join('')}</div>`;
  const nl=tcJor(TCS.date).h===0?`<div class="tc-note">Día no laborable: todas las horas cuentan como extra.</div>`:'';
  const ban=D.st==='reab'?`<div class="callout tc-reab"><b>Te reabrieron este tareo</b>${D.reab&&D.reab.mot?`<span>Motivo: ${esc(D.reab.mot)}</span>`:''}<span>Corrige y vuelve a enviarlo.</span></div>`
    :ro?`<div class="callout tc-sent${D.st==='rev'?' tc-rev':''}"><b>Enviado ✓${D.envAt?' · '+esc(new Date(D.envAt).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})):''}</b><span>${D.st==='env'?'Ya no se puede cambiar. Si hay un error, pide al asistente de tareo que lo reabra.':D.st==='rev'?'Revisado por la oficina.':'Publicado.'}</span></div>`:'';
  let body='';
  if(ro)body=tcStep3(D,[],true);else if(TCS.step===1)body=tcStep1(D);else if(TCS.step===2)body=tcStep2(D);else body=tcStep3(D,E,false);
  let foot='';
  if(!ro){if(TCS.step===2&&TCS.ed)foot=`<button type="button" class="ib tc-big" data-tca="edCancel">Cancelar</button><button type="button" class="ib pri tc-big" data-tca="edOk">Guardar trabajo</button>`;
    else if(TCS.step===1)foot=`<button type="button" class="ib pri tc-big tc-w" data-tcs="2">Siguiente: ¿en qué trabajaron? →</button>`;
    else if(TCS.step===2)foot=`<button type="button" class="ib tc-big" data-tcs="1">← Atrás</button><button type="button" class="ib pri tc-big" data-tcs="3">Revisar y enviar →</button>`;
    else foot=`<button type="button" class="ib tc-big" data-tcs="2">← Atrás</button><button type="button" class="ib pri tc-big" id="tcSend" data-tca="send"${E.length||TCS.busy?' disabled':''}>${E.length?`Faltan ${E.length} ${E.length===1?'dato':'datos'}`:'Enviar tareo'}</button>`}
  return head+bar+`<div class="tc-st" id="tcSt" aria-live="polite"></div></div><div class="tc-body" id="tcBody">${ban}${nl}${body}</div>${foot?`<div class="tc-foot">${foot}</div>`:''}`}

/* paso 1: asistencia */
function tcStep1(D){const R=tcRows();const crew=new Set(tcCrew(TCS.date).map(p=>p.dni||p.id));const pres=R.filter(([,r])=>r.as!==false).length;
  const list=R.map(([dni,r])=>{const v=r.as!==false;return`<div class="tc-ob${v?'':' off'}" data-dni="${esc(dni)}">
    <div class="tc-wr"><button type="button" class="tc-as${v?' on':''}" data-tca="as" aria-pressed="${v}" aria-label="${esc(tcNm(r))}: ${v?'vino':'faltó'}"><i>${v?'✓':'✕'}</i></button>
     <div class="tc-wn"><b>${esc(r.ape||dni)}</b><span>${esc(r.nom||'')}${r.cat?' · '+esc(r.cat):''}${crew.has(dni)?'':' · agregado hoy'}</span></div>
     ${v?`<label class="tc-alt"><input type="checkbox" data-tca="alt"${r.alt?' checked':''}><span>Altura</span></label>`:`<span class="tc-fal">Faltó</span>`}</div>
    ${v?'':`<div class="tc-mots" role="group" aria-label="Motivo">${TC_MOT.map(([k,l])=>`<button type="button" class="tc-mot${r.mot===k?' on':''}" data-tca="mot" data-v="${k}"><b>${k}</b> ${esc(l)}</button>`).join('')}</div>${r.mot?'':`<div class="tc-err">Elige el motivo.</div>`}`}
    ${crew.has(dni)?'':`<button type="button" class="tc-lnk" data-tca="rm">Quitar de este tareo</button>`}</div>`}).join('');
  const add=TCS.addOn?`<div class="tc-card tc-add"><label class="tc-lab">Buscar por DNI o apellido<input class="tin tc-in" id="tcAddQ" data-fk="tcAddQ" type="search" autocomplete="off" value="${esc(TCS.addQ)}" placeholder="Ej. 4512 o QUISPE"></label><div id="tcAddL" class="tc-res">${tcAddList()}</div>
     <button type="button" class="ib tc-big" data-tca="addOff">Cerrar</button></div>`:`<button type="button" class="ib tc-big tc-w" data-tca="addOn">+ Agregar obrero</button>`;
  return`<div class="tc-h"><h2>¿Quién vino?</h2><span>${pres} de ${R.length} vinieron. Toca a quien faltó.</span></div>
   ${R.length?`<div class="tc-list">${list}</div>`:`<p class="tc-empty">No tienes obreros asignados. Agrégalos con el botón de abajo o pide al asistente de tareo que te los asigne.</p>`}${add}`}
function tcAddList(){const q=tFold(TCS.addQ);if(q.length<2)return`<p class="tc-hint">Escribe al menos 2 letras o números.</p>`;
  const R=(TCS.doc&&TCS.doc.rows)||{};const L=[...S.tper.values()].filter(p=>p&&!p.arch&&tActivo(p,TCS.date)&&!R[p.dni||p.id]&&((p.dni||'').includes(q)||tFold(p.ape).includes(q)||tFold(p.nom).includes(q))).slice(0,12);
  if(!L.length)return`<p class="tc-hint">Nadie con «${esc(TCS.addQ)}» entre el personal activo.</p>`;
  return L.map(p=>`<button type="button" class="tc-opt" data-tca="add" data-v="${esc(p.dni||p.id)}"><b>${esc(tName(p))}</b><span>DNI ${esc(p.dni||p.id)} · ${esc(p.cua||p.pue||'')}${p.cap&&p.cap!==TCS.cap?` · <em>de ${esc(typeof tCapName==='function'?tCapName(p.cap):p.cap)}</em>`:''}</span></button>`).join('')}

/* paso 2: trabajos por bloques */
function tcStep2(D){if(TCS.ed)return tcEditor(D);const B=D.blq||[];const R=D.rows||{};const pres=tcPres();
  const cards=B.map(k=>{const n=(k.dnis||[]).filter(d=>R[d]&&R[d].as!==false);const all=n.length===pres.length;const h=tcBH(TCS.date,k.ini,k.fin);
    return`<div class="tc-card tc-blq" data-bid="${esc(k.id)}"><div class="tc-bt"><b>${esc(tcPcName(k.pc))}</b></div>
     <div class="tc-bm"><span class="mono">${esc(k.ini)}–${esc(k.fin)}</span><span>${tcH(h)}</span><span>${all?`Todos (${n.length})`:`${n.length} ${n.length===1?'obrero':'obreros'}`}</span></div>
     ${all?'':`<div class="tc-bw">${n.map(d=>esc(tcShort(R[d]))).join(' · ')}</div>`}
     <div class="tc-ba"><button type="button" class="ib" data-tca="edit">Editar</button><button type="button" class="ib" data-tca="dup">Duplicar</button><button type="button" class="ib" data-tca="del">Borrar</button></div></div>`}).join('');
  const copy=!B.length&&TCS.prev?`<button type="button" class="ib tc-big tc-w" data-tca="copy">Copiar los trabajos del ${esc(TC_DN[pd(TCS.prev.date).getUTCDay()].toLowerCase())} ${esc(fmtD(TCS.prev.date))} (${TCS.prev.blq.length})</button>`:'';
  return`<div class="tc-h"><h2>¿En qué trabajaron?</h2><span>Agrega cada trabajo con su partida, horario y quiénes.</span></div>
   ${cards?`<div class="tc-list">${cards}</div>`:`<p class="tc-empty">Aún no hay trabajos.</p>`}
   <button type="button" class="ib pri tc-big tc-w" data-tca="new">+ Agregar trabajo</button>${copy}
   ${pres.length?`<div class="tc-h tc-h2"><h3>Horas por obrero</h3><span>Jornada de hoy: ${tcH(tcJor(TCS.date).h)}</span></div><div class="tc-bars">${tcBars(D)}</div>`:''}`}
/** barra por obrero: horas asignadas vs jornada; rojo si faltan o se cruzan */
function tcBars(D){const J=tcJor(TCS.date).h;const B=D.blq||[];
  return tcPres().map(([dni,r])=>{const L=B.filter(k=>(k.dnis||[]).includes(dni)).map(k=>[tMin(k.ini),tMin(k.fin),tcBH(TCS.date,k.ini,k.fin)]).filter(x=>x[0]!=null&&x[1]>x[0]).sort((a,b)=>a[0]-b[0]);
    const h=tR2(L.reduce((s,x)=>s+x[2],0));let cr=false;for(let i=1;i<L.length;i++)if(L[i][0]<L[i-1][1])cr=true;
    const k=cr||h===0||(J&&h<J)?'bad':h>J?'warn':'ok';const pct=J?Math.min(100,h/J*100):(h?100:0);
    const txt=cr?'se cruzan dos trabajos':h===0?'sin horas':J&&h<J?`faltan ${tcH(J-h)}`:h>J?`${tcH(h-J)} extra`:'completo';
    return`<div class="tc-bar ${k}" data-dni="${esc(dni)}"><div class="tc-bl"><b>${esc(tcShort(r))}</b><span>${tcH(h)}${J?' / '+tcH(J):''} · ${txt}</span></div><div class="tc-bg"><i style="width:${pct.toFixed(0)}%"></i></div></div>`}).join('')}
function tcEditor(D){const e=TCS.ed;const J=tcJor(TCS.date);const pres=tcPres();const on=new Set(e.dnis);
  const pc=e.pc?S.tpc.get(e.pc):null;const h=tcBH(TCS.date,e.ini,e.fin);
  const sc=Object.entries({man:'Mañana',tar:'Tarde',todo:'Todo el día'}).filter(([k])=>J.S[k]).map(([k,l])=>{const[a,b]=J.S[k];return`<button type="button" class="tc-chip${e.ini===a&&e.fin===b?' on':''}" data-tca="sc" data-v="${k}"><b>${l}</b><span>${a}–${b}</span></button>`}).join('');
  return`<div class="tc-h"><h2>${e.nuevo?'Nuevo trabajo':'Editar trabajo'}</h2></div>
   <div class="tc-card"><div class="tc-lab">1. Partida</div>
    ${pc?`<div class="tc-pcsel"><b>${esc(pc.cod)}</b><span>${esc(pc.nom)}</span><button type="button" class="ib" data-tca="pcX">Cambiar</button></div>`
     :`<input class="tin tc-in" id="tcPcQ" data-fk="tcPcQ" type="search" autocomplete="off" value="${esc(TCS.pcQ)}" placeholder="Buscar por código o nombre" aria-label="Buscar partida"><div id="tcPcL" class="tc-res">${tcPcList()}</div>`}</div>
   <div class="tc-card"><div class="tc-lab">2. Horario</div><div class="tc-chips">${sc}</div>
    <div class="tc-times"><label>Desde<input class="tin tc-in" type="time" step="300" id="tcIni" data-tca="ini" value="${esc(e.ini)}"></label><label>Hasta<input class="tin tc-in" type="time" step="300" id="tcFin" data-tca="fin" value="${esc(e.fin)}"></label><b class="tc-hh">${tcH(h)}</b></div></div>
   <div class="tc-card"><div class="tc-lab">3. ¿Quiénes? <span>${on.size} de ${pres.length}</span><button type="button" class="tc-lnk" data-tca="all">${on.size===pres.length?'Ninguno':'Todos'}</button></div>
    <div class="tc-chips tc-who">${pres.map(([dni,r])=>`<button type="button" class="tc-chip tc-pp${on.has(dni)?' on':''}" data-tca="who" data-v="${esc(dni)}" aria-pressed="${on.has(dni)}">${on.has(dni)?'✓ ':''}${esc(tcShort(r))}</button>`).join('')}</div>
    <label class="tc-alt tc-altb"><input type="checkbox" data-tca="edAlt"${e.alt?' checked':''}><span>Trabajo en altura (bono para estos obreros)</span></label></div>
   ${TCS.edMsg?`<div class="tc-err tc-errb">${esc(TCS.edMsg)}</div>`:''}`}
function tcPcList(){const q=tFold(TCS.pcQ);const use=tcUse();const all=tcPcs();
  let L=q?all.filter(x=>tFold(x.cod).includes(q)||tFold(x.nom).includes(q)||tFold(x.grpN).includes(q)):all.filter(x=>use[x.id]).sort((a,b)=>(use[b.id]||0)-(use[a.id]||0));
  if(q)L.sort((a,b)=>(use[b.id]||0)-(use[a.id]||0)||tCmpCod(a.cod,b.cod));
  const hint=!q?(L.length?`<div class="tc-hint">Las que más usas:</div>`:`<div class="tc-hint">Escribe el código (10.05) o parte del nombre (encofrado).</div>`):'';
  if(q&&!L.length)return`<p class="tc-hint">Ninguna partida con «${esc(TCS.pcQ)}».</p>`;
  return hint+L.slice(0,q?20:8).map(x=>`<button type="button" class="tc-opt" data-tca="pc" data-v="${esc(x.id)}"><b>${esc(x.cod)}</b><span>${esc(x.nom)}${x.grpN?` <em>· ${esc(x.grpN)}</em>`:''}</span></button>`).join('')}

/* paso 3: revisar y enviar (y vista de solo lectura) */
function tcStep3(D,E,ro){const R=tcCalc(D).rows||{};const rows=tcRows();const bad=new Set(E.filter(e=>e.dni).map(e=>e.dni));
  const tot=rows.reduce((a,[d])=>{const r=R[d]||{};if(r.as!==false){a.v++;a.h+=+r.trab||0;a.e+=+r.ext||0}else a.f++;return a},{v:0,f:0,h:0,e:0});
  const list=rows.map(([dni,r0])=>{const r=R[dni]||r0;const v=r.as!==false;
    return`<div class="tc-sum${bad.has(dni)?' bad':''}${v?'':' off'}" data-dni="${esc(dni)}"><div class="tc-wn"><b>${esc(tcNm(r))}</b>
     <span>${v?`<span class="mono">${esc(r.ini||'—')}–${esc(r.fin||'—')}</span> · ${tcH(r.trab)}${r.ext?` · <em class="tc-ext">${tcH(r.ext)} extra</em>`:''}${r.alt?' · <em class="tc-altm">altura</em>':''}`
      :`Faltó · ${esc((TC_MOT.find(m=>m[0]===r.mot)||[r.mot||'sin motivo',''])[1]||r.mot||'sin motivo')}`}</span>
     ${v&&r.h&&Object.keys(r.h).length?`<span class="tc-pcs">${Object.entries(r.h).map(([pc,h])=>`${esc((S.tpc.get(pc)||{}).cod||pc)}: ${tcH(h)}`).join(' · ')}</span>`:''}</div></div>`}).join('');
  const fotos=Array.isArray(D.foto)?D.foto:[];
  const ef=E.filter(e=>e.k!=='foto');
  const errs=ef.length?`<div class="callout tc-errs"><b>Antes de enviar, corrige:</b><ul>${ef.map(e=>`<li>${esc(tcErrMsg(e))}</li>`).join('')}</ul></div>`:'';
  return`${ro?'':`<div class="tc-h"><h2>Revisar y enviar</h2><span>${tot.v} vinieron · ${tot.f} faltaron · ${tcH(tot.h)}${tot.e?' · '+tcH(tot.e)+' extra':''}</span></div>`}
   ${errs}<div class="tc-list">${list}</div>
   <div class="tc-card"><div class="tc-lab">Foto del formato firmado${ro?'':' <span>obligatoria</span>'}</div>
    <div class="tc-fotos">${fotos.map(id=>`<div class="tc-th" data-fid="${esc(id)}"><img alt="Foto del formato" data-img="${esc(id)}">${ro?'':`<button type="button" data-tca="fx" aria-label="Quitar foto">✕</button>`}</div>`).join('')}
     ${ro?'':`<label class="tc-cam${TCS.busy?' busy':''}"><input type="file" id="tcFile" accept="image/*" capture="environment"><span>${TCS.busy?'Procesando…':fotos.length?'+ Otra foto':'📷 Tomar foto'}</span></label>`}</div>
    ${!ro&&!fotos.length?`<div class="tc-err">Toma una foto del formato con las firmas de todos.</div>`:''}</div>`}
function tcErrMsg(e){const r=e.dni&&TCS.doc&&TCS.doc.rows&&TCS.doc.rows[e.dni];const m=String(e.msg||'');if(!r||!r.ape||m.includes(r.ape))return m;return tcNm(r)+': '+m}

/* ---------- miniaturas de las fotos ---------- */
function tcThumbs(){for(const img of $$('#tcRoot img[data-img]')){const id=img.dataset.img;if(TCS.img[id]){img.src=TCS.img[id];continue}
  if(TCS.imgReq[id])continue;TCS.imgReq[id]=1;fcol('tfot').doc(id).get().then(s=>{const d=s.exists&&s.data().d;if(d){TCS.img[id]=d;const el=$(`#tcRoot img[data-img="${CSS.escape(id)}"]`);if(el)el.src=d}}).catch(()=>{delete TCS.imgReq[id]})}}
/** reduce la foto: lado mayor ~1600 px, JPEG 0.7; si pasa de ~900 KB, 1200 px / 0.6 (y si aún pasa, 1000 px / 0.5) */
async function tcShrink(file){const url=URL.createObjectURL(file);try{
  const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('No se pudo leer la imagen.'));i.src=url});
  const out=(mx,q)=>{const k=Math.min(1,mx/Math.max(img.naturalWidth||1,img.naturalHeight||1));const c=document.createElement('canvas');c.width=Math.max(1,Math.round((img.naturalWidth||1)*k));c.height=Math.max(1,Math.round((img.naturalHeight||1)*k));
    const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q)};
  const sz=d=>d.length*0.75;let d=out(1600,0.7);if(sz(d)>900e3)d=out(1200,0.6);if(sz(d)>900e3)d=out(1000,0.5);if(sz(d)>950e3)throw new Error('La foto es demasiado grande.');return d}finally{URL.revokeObjectURL(url)}}
async function tcAddFoto(file){if(!file||tcRO())return;TCS.busy=true;tcDraw();
  try{const d=await tcShrink(file);const D=TCS.doc;const base=tcId(TCS.date,TCS.cap)+'_';
    let n=Math.max(0,...(D.foto||[]).map(x=>+String(x).slice(base.length)||0))+1;
    for(let i=0;i<30;i++){let ex=false;try{ex=(await fcol('tfot').doc(base+n).get()).exists}catch(e){}if(!ex)break;n++}
    const id=base+n;TCS.img[id]=d;
    fcol('tfot').doc(id).set({date:TCS.date,cap:TCS.cap,n,d,by:me.email,ts:NOW()}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));
    D.foto=[...(D.foto||[]),id];TCS.busy=false;tcChg();toast('Foto agregada.')}
  catch(err){TCS.busy=false;tcDraw();toast(err.message||'No se pudo procesar la foto.')}}

/* ---------- acciones ---------- */
function tcBind(root){
  root.addEventListener('click',e=>{const d=e.target.closest('[data-tcd]');if(d&&!d.disabled){if(d.dataset.tcd!==TCS.date)tcOpen(d.dataset.tcd),tcDraw();return}
    const s=e.target.closest('[data-tcs]');if(s){tcGo(+s.dataset.tcs);return}
    const b=e.target.closest('[data-tca]');if(!b||b.tagName==='INPUT')return;tcAct(b.dataset.tca,b,e)});
  root.addEventListener('change',e=>{const t=e.target;if(t.id==='tcFile'){const f=t.files&&t.files[0];t.value='';if(f)tcAddFoto(f);return}
    const a=t.dataset.tca;if(!a||tcRO())return;const D=TCS.doc;
    if(a==='alt'){const dni=t.closest('[data-dni]').dataset.dni;D.rows[dni].alt=t.checked;tcChg(false);return}
    if(a==='edAlt'&&TCS.ed){TCS.ed.alt=t.checked;return}
    if((a==='ini'||a==='fin')&&TCS.ed){TCS.ed[a]=t.value;TCS.edMsg='';tcDraw()}});
  root.addEventListener('input',e=>{const t=e.target;if(t.id==='tcPcQ'){TCS.pcQ=t.value;const l=$('#tcPcL');if(l)l.innerHTML=tcPcList()}
    else if(t.id==='tcAddQ'){TCS.addQ=t.value;const l=$('#tcAddL');if(l)l.innerHTML=tcAddList()}});
  root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='tcPcQ'){const f=$('#tcPcL [data-tca="pc"]');if(f){e.preventDefault();f.click()}}})}
function tcGo(n){if(TCS.ed){TCS.ed=null;TCS.edMsg=''}TCS.step=Math.max(1,Math.min(3,n));tcDraw();const b=$('#tcBody');if(b)b.scrollTop=0}
const tcBid=()=>'b'+Math.random().toString(36).slice(2,9);
async function tcAct(a,b){if(tcRO())return;const D=TCS.doc;if(!D)return;const R=D.rows=D.rows||{};const dniOf=()=>{const w=b.closest('[data-dni]');return w&&w.dataset.dni};
  const bidOf=()=>{const w=b.closest('[data-bid]');return w&&w.dataset.bid};
  if(a==='as'){const dni=dniOf();const r=R[dni];if(!r)return;r.as=r.as===false;if(r.as)r.mot='';else{r.alt=false;for(const k of D.blq||[])k.dnis=(k.dnis||[]).filter(x=>x!==dni)}tcChg();return}
  if(a==='mot'){const r=R[dniOf()];if(!r)return;r.mot=b.dataset.v;tcChg();return}
  if(a==='rm'){const dni=dniOf();const r=R[dni];if(!r)return;if(!await uiAsk({title:'¿Quitar del tareo?',text:`${tcNm(r)} sale del tareo de este día (no se borra del personal).`,ok:'Quitar',tone:'warn'}))return;
    delete R[dni];for(const k of D.blq||[])k.dnis=(k.dnis||[]).filter(x=>x!==dni);tcChg();return}
  if(a==='addOn'){TCS.addOn=true;TCS.addQ='';tcDraw();const i=$('#tcAddQ');if(i)i.focus();return}
  if(a==='addOff'){TCS.addOn=false;tcDraw();return}
  if(a==='add'){const p=S.tper.get(b.dataset.v);if(!p)return;
    if(p.cap&&p.cap!==TCS.cap&&!await uiAsk({title:'Es de otro capataz',text:`${tName(p)} está asignado a ${typeof tCapName==='function'?tCapName(p.cap):p.cap}. ¿Lo agregas a tu tareo de este día?`,ok:'Agregar',tone:'warn'}))return;
    R[p.dni||p.id]=tcRowOf(p);TCS.addQ='';TCS.addOn=false;tcChg();toast(tName(p)+' agregado.');return}
  if(a==='new'){const J=tcJor(TCS.date);const[ini,fin]=J.S.todo;TCS.ed={id:tcBid(),nuevo:true,pc:'',ini,fin,dnis:tcPres().map(x=>x[0]),alt:false};TCS.pcQ='';TCS.edMsg='';tcDraw();const b2=$('#tcBody');if(b2)b2.scrollTop=0;return}
  if(a==='edit'){const k=(D.blq||[]).find(x=>x.id===bidOf());if(!k)return;const pres=new Set(tcPres().map(x=>x[0]));
    TCS.ed={...k,dnis:(k.dnis||[]).filter(x=>pres.has(x)),alt:(k.dnis||[]).length>0&&(k.dnis||[]).every(d=>R[d]&&R[d].alt),nuevo:false};TCS.pcQ='';TCS.edMsg='';tcDraw();const b2=$('#tcBody');if(b2)b2.scrollTop=0;return}
  if(a==='dup'){const i=(D.blq||[]).findIndex(x=>x.id===bidOf());if(i<0)return;const k=D.blq[i];TCS.ed={id:tcBid(),nuevo:true,pc:k.pc,ini:k.ini,fin:k.fin,dnis:[...(k.dnis||[])],alt:false};TCS.edMsg='';tcDraw();return}
  if(a==='del'){const k=(D.blq||[]).find(x=>x.id===bidOf());if(!k)return;if(!await uiAsk({title:'¿Borrar este trabajo?',text:`${tcPcName(k.pc)} · ${k.ini}–${k.fin}`,ok:'Borrar',tone:'warn'}))return;
    D.blq=D.blq.filter(x=>x.id!==k.id);tcChg();return}
  if(a==='copy'&&TCS.prev){const pres=new Set(tcPres().map(x=>x[0]));const act=new Set(tcPcs().map(x=>x.id));
    D.blq=TCS.prev.blq.filter(k=>act.has(k.pc)).map(k=>({id:tcBid(),pc:k.pc,ini:k.ini,fin:k.fin,dnis:(k.dnis||[]).filter(d=>pres.has(d))}));tcChg();toast(`Se copiaron ${D.blq.length} trabajos: revisa quiénes y los horarios.`);return}
  if(a==='send')return tcSend();
  /* editor de un trabajo */
  const e=TCS.ed;if(!e)return;
  if(a==='pc'){e.pc=b.dataset.v;TCS.edMsg='';tcDraw();return}
  if(a==='pcX'){e.pc='';TCS.pcQ='';tcDraw();const i=$('#tcPcQ');if(i)i.focus();return}
  if(a==='sc'){const J=tcJor(TCS.date);const v=J.S[b.dataset.v];if(v){e.ini=v[0];e.fin=v[1];TCS.edMsg='';tcDraw()}return}
  if(a==='who'){const dni=b.dataset.v;e.dnis=e.dnis.includes(dni)?e.dnis.filter(x=>x!==dni):[...e.dnis,dni];tcDraw();return}
  if(a==='all'){const p=tcPres().map(x=>x[0]);e.dnis=e.dnis.length===p.length?[]:p;tcDraw();return}
  if(a==='edCancel'){TCS.ed=null;TCS.edMsg='';tcDraw();return}
  if(a==='edOk'){const ini=($('#tcIni')||{}).value||e.ini,fin=($('#tcFin')||{}).value||e.fin;e.ini=ini;e.fin=fin;
    const x=tMin(ini),y=tMin(fin);let m='';if(!e.pc)m='Elige la partida.';else if(x==null||y==null)m='Pon la hora de inicio y de fin.';else if(y<=x)m='La hora de fin debe ser después de la de inicio.';else if(x<300||y>1439)m='El horario debe estar entre 05:00 y 23:59.';else if(!e.dnis.length)m='Elige al menos un obrero.';
    if(m){TCS.edMsg=m;tcDraw();return}
    const k={id:e.id,pc:e.pc,ini,fin,dnis:[...e.dnis]};const L=D.blq=Array.isArray(D.blq)?D.blq:[];const i=L.findIndex(z=>z.id===e.id);if(i>=0)L[i]=k;else L.push(k);
    if(e.alt)for(const d of e.dnis)if(R[d])R[d].alt=true;
    if(e.nuevo)tcUseAdd(e.pc);TCS.ed=null;TCS.edMsg='';tcChg();const b2=$('#tcBody');if(b2)b2.scrollTop=0}}
async function tcSend(){const D=TCS.doc;if(!D||tcRO())return;const C=tcCalc(D);const E=tcValida(C);if(E.length){toast(tcErrMsg(E[0]));return}
  const rows=Object.values(C.rows||{});const v=rows.filter(r=>r.as!==false);const hh=tR2(v.reduce((s,r)=>s+(+r.trab||0),0)),he=tR2(v.reduce((s,r)=>s+(+r.ext||0),0));
  if(!await uiAsk({title:'¿Enviar el tareo?',text:`${fmtD(TCS.date)}: ${v.length} vinieron, ${rows.length-v.length} faltaron · ${tcH(hh)}${he?` (${tcH(he)} extra)`:''}.`,note:'Después de enviarlo ya no podrás cambiarlo; si hay un error, el asistente de tareo te lo reabre.',ok:'Enviar tareo',tone:'ok'}))return;
  const prev={st:D.st,envAt:D.envAt,envBy:D.envBy,hist:D.hist};const t=NOW();
  D.st='env';D.envAt=t;D.envBy=me.email;D.hist=[...(Array.isArray(D.hist)?D.hist:[]),{t,by:me.email,a:'env'}];
  const date=TCS.date;const p=tcSaveNow();tcDraw();toast('Tareo enviado ✓');
  /* sin señal queda en el celular y se envía al volver; si la base lo rechaza, vuelve a borrador para corregir */
  p.catch(()=>{if(TCS.date!==date||!TCS.doc)return;for(const[k,v]of Object.entries(prev)){if(v===undefined)delete TCS.doc[k];else TCS.doc[k]=v}TCS.dirty=false;tcDraw();toast('No se pudo enviar el tareo. Inténtalo de nuevo.')})}
