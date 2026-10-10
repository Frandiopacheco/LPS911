"use strict";
/* LPS 911 · Capataces en vivo (iniciar / detener / cerrar) y Tablero en vivo.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 26 · Capataces: estado en vivo (iniciar / detener / cerrar) y confirmación
   ===================================================================== */
const KST={none:{t:'Sin iniciar',c:'#8C959F'},seq:{t:'En secuencia',c:'#7E57C2'},run:{t:'En ejecución',c:'#1565C0'},stop:{t:'Detenido',c:'#EF6C00'},ok:{t:'Cumplido',c:'#2E7D4F'},no:{t:'No cumplido',c:'#C62828'}};
/* motivos de «Detenido» (oct 2026, reemplaza «En secuencia»): «Inicia después» es el tren de trabajo (solo informativo) */
const STOP_MOT=['Inicia después','Actividad predecesora','Seguridad','Materiales','Calidad','Otros'];
const STOP_INFO='Inicia después';
const liveOf=(d,aid)=>LIVE.get(d+'_'+aid)||null;
function kState(d,aid){const r=recReal(d,aid);if(r)return{k:r.status==='ok'?'ok':'no',conf:true,r};const lv=liveOf(d,aid);
  if(lv&&lv.close&&lv.close.status)return{k:lv.close.status,conf:false,lv};if(lv&&lv.st)return{k:lv.st,lv};if(lv&&lv.seq&&lv.seq.on)return{k:'seq',lv};return{k:'none',lv}}
/* «En secuencia»: tren de trabajo, la cuadrilla llega a este ambiente después de otro. Solo informativo (no cambia el PPC ni las alertas de «sin iniciar»). */
function seqText(d,lv){const pa=lv.seq.after&&S.act.get(lv.seq.after);if(!pa)return'⏭ En secuencia: va más tarde';const am=S.amb.get(pa.ambId);const k=kState(d,pa.id).k;
  return`⏭ En secuencia: sigue después de ${am?am.code:pa.name}${k==='run'?' (en ejecución)':k==='ok'||k==='no'?' (ya terminó: le toca)':k==='stop'?' (detenida)':k==='seq'?' (también en secuencia)':' (sin iniciar)'}`}
function kText(d,aid){const s=kState(d,aid);const lv=s.lv||liveOf(d,aid);let t='';
  if(s.conf)t=`${s.k==='ok'?'✓ Cumplido':'✗ No cumplido'}${s.r.cnc?' · '+s.r.cnc:''} · confirmado`;
  else if(s.k==='ok'||s.k==='no')t=`${s.k==='ok'?'✓ Cumplido':'✗ No cumplido'}${lv.close.cnc?' · '+lv.close.cnc:''} · por confirmar`;
  else if(s.k==='run')t=`▶ En ejecución desde ${hhmm(lv.t0||lv.log?.[0]?.t)}`;
  else if(s.k==='stop')t=`⏸ Detenido${lv.mot?': '+lv.mot:''}`;
  else if(s.k==='seq')t=seqText(d,lv);
  else t='Sin iniciar';
  return t+(lv&&lv._pend?' · ⏳ sin enviar':'')}
function liveLine(d,aid){const lv=liveOf(d,aid);if(!lv||!(lv.log||[]).length)return'';const L=lv.log.slice(-3);
  const w={run:'▶ Inició',res:'▶ Reanudó',stop:'⏸ Detenido',close:'Cerró',seq:'⏭ En secuencia',unseq:'Quitó la secuencia'};
  return`<div class="clive">${L.map(e=>`<span>${hhmm(e.t)} ${w[e.s]||e.s}${e.s==='stop'&&e.m?' ('+esc(e.m)+')':''}${e.s==='seq'&&e.m?' tras '+esc(e.m):''}${e.s==='close'?' '+(e.m==='ok'?'✓':'✗'):''} · ${esc((e.n||'').split(' ')[0])}</span>`).join('')}${lv._pend?'<span>⏳ sin enviar</span>':''}</div>`}
/* fotos de la actividad ese día (detención, cierre del capataz/SC o registro del ingeniero): se ven en la ficha y se amplían al tocarlas */
function actPhotos(d,aid){const lv=liveOf(d,aid);const r=recOf(d,aid);const ids=[...new Set([...((lv&&lv.photos)||[]),...((r&&r.photos)||[])])];if(!ids.length)return'';
  return`<div class="kphs">${ids.map(id=>{if(typeof loadFoto==='function')loadFoto(id);const src=FOTO.get(id)||'';return`<img data-ph="${id}" src="${src}" alt="Foto"${src?'':' style="opacity:.3"'}>`}).join('')}</div>`}
function liveWrite(d,aid,patch,ev,extra){if(typeof cliTabOn==='function'&&cliTabOn())return;const x=S.act.get(aid);if(!x||!db)return;const id=d+'_'+aid;const cur=LIVE.get(id)||{};
  const e={...ev,t:NOW(),by:me.email,n:me.name||''};
  const doc={date:d,actId:aid,pisoId:pisoOfAct(aid),sc:x.sc,...patch,log:[...(cur.log||[]),e].slice(-40),...(extra||{})};
  LIVE.set(id,{...cur,...doc,id,_pend:true});const FVs=firebase.firestore.FieldValue;
  /* el historial y las fotos se agregan (arrayUnion), no se reemplazan: si el capataz sin señal y el ingeniero escriben a la vez, no se pierde nada */
  const send={...doc};if(FVs&&FVs.arrayUnion){send.log=FVs.arrayUnion(e);if(Array.isArray(doc.photos)){const add=doc.photos.filter(f=>!(cur.photos||[]).includes(f));if(add.length&&(cur.photos||[]).every(f=>doc.photos.includes(f)))send.photos=FVs.arrayUnion(...add)}}
  if(FVs&&FVs.serverTimestamp)send.sat=FVs.serverTimestamp();doneRebuild();requestRender();
  fcol('live').doc(id).set(send,{merge:true}).catch(err=>toast('No se pudo guardar: '+(err&&err.code==='permission-denied'?'sin permiso (¿se publicaron las reglas nuevas?)':(err&&(err.code||err.message)))))}
/* lo que el capataz (o el SC) propuso y nadie confirmó en 2 días lo registra el servidor (aceptarCierres, 23:30, en una transacción
   que relee el registro): la página ya no lo hace, porque con su copia local podía pisar lo que un ingeniero corrigió. */
function confirmProp(d,aid){const x=S.act.get(aid);const cur=recOf(d,aid);if(!x||!cur||!cur._prop)return;writeDaily(d,pisoOfAct(aid),{recs:{[aid]:{...baseRec(d,x,cur),status:cur.status}}})}

/* ---------- pantalla del capataz ---------- */
const CP=(()=>{try{return JSON.parse(localStorage.getItem('lps.cap')||'{}')||{}}catch(e){return{}}})();
/* «＋ No programado» arma el registro: solo entonces un toque en un lugar vacío del plano abre la ficha (evita abrirla sin querer al desplazarse) */
let NPA=null;
const saveCP=()=>{try{localStorage.setItem('lps.cap',JSON.stringify(CP))}catch(e){}};
let KS=null;
function loadPlanoMod(){if(window.__plano&&window.__plano.capPlan)return Promise.resolve();
  if(!planoP){planoP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PLANO_SRC;s.onload=ok;s.onerror=()=>{planoP=null;ko()};document.head.appendChild(s)})}
  return planoP.then(()=>{if(U.tab==='cap'||U.tab==='mapa'||U.tab==='dash'||U.tab==='campo'||U.tab==='planos'){const m=$('#main');if(U.tab==='mapa')m.dataset.built='';requestRender()}})}
const ENG=()=>!!me&&me.role!=='capataz'&&!!canDaily;
function capItems(d){const E=ENG()||VEED();const vs=new Set(visPisos().map(p=>p.id));const my=new Set(E?[...S.con.keys()]:(me&&me.scs||[]));const API=window.__plano;const nv=API&&API.novaSet?API.novaSet(d):new Set();
  return[...S.act.values()].filter(x=>my.has(x.sc)&&schedOrSnap(x,d)&&!nv.has(x.id)).map(x=>{const a=S.amb.get(x.ambId);const s=a&&S.sec.get(a.sectorId);return{x,a,s,pid:pisoOfAct(x.id)}})
    .filter(o=>o.a&&o.s&&o.pid&&(!E||vs.has(o.pid))).sort((p,q)=>(p.s.order||0)-(q.s.order||0)||(p.a.order||0)-(q.a.order||0)||(p.x.order||0)-(q.x.order||0))}
function capPend(d){if(ENG()||VEED()||SCK())return[];const my=me&&me.scs||[];return[...LIVE.values()].filter(l=>l.date<d&&l.date>=addD(d,-7)&&my.includes(l.sc)&&l.st&&!(l.close&&l.close.status)&&!recReal(l.date,l.actId)&&S.act.has(l.actId)).sort((a,b)=>a.date.localeCompare(b.date))}
function kCard(d,o,n,pend){const aid=o.x.id;const s=kState(d,aid);const E=ENG()||VEED();const q=VEED()?'':E?(s.conf?'':(s.k==='ok'||s.k==='no')?'conf':'closef'):SCK()?(d<todayIso()||s.conf?'':s.k==='none'||s.k==='seq'?'run':s.k==='stop'?'res':''):d<todayIso()?'closef':s.conf?'':s.k==='none'||s.k==='seq'?'run':s.k==='run'?'closef':s.k==='stop'?'res':'';
  const ql={run:liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'▶ Continúa':'▶ Iniciado',res:liveOf(d,aid)&&liveOf(d,aid).t0?'▶ Reanudado':'▶ Iniciado',closef:E?'Verificar':'Cerrar día',conf:'✓ Confirmar'}[q]||'';
  return`<article class="kc k-${s.k}${s.conf?' conf':''}" data-k="${aid}" data-d="${d}" style="--k:${KST[s.k].c}"><i class="kn">${n||'·'}</i><div class="kt"><b>${esc(o.x.name)}</b><span>${esc(o.a.code)} · ${esc(o.a.name)}${pend?' · '+fmtD(d):''}${E||(me.scs||[]).length>1?' · '+esc(conOf(o.x.sc).name):''}</span><em>${esc(kText(d,aid))}</em></div>${q?`<button class="kgo" data-kq="${q}">${ql}</button>`:s.conf?'<span class="kok">✓</span>':''}</article>`}
function renderCap(main){const E=ENG()||VEED();const NPon=canNP()||(SCK()&&npSC());const d=E?campoDate():todayIso();ensureDaily(addD(d,-7));const API=window.__plano&&window.__plano.capPlan?window.__plano:null;if(!API)loadPlanoMod().catch(()=>{});else API.capInit(d);
  if(CP.v!=='plan'&&CP.v!=='list')CP.v='plan';const V=E?'plan':CP.v;
  const all=capItems(d);const my=E?[...new Set(all.map(o=>o.x.sc))].sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name)):(me.scs||[]);if(CP.sc&&!my.includes(CP.sc))CP.sc='';const allF=all.filter(o=>!CP.sc||o.x.sc===CP.sc);const byP=new Map();allF.forEach(o=>{if(!byP.has(o.pid))byP.set(o.pid,[]);byP.get(o.pid).push(o)});
  /* quien recorre la obra ve todos los pisos (también los que hoy no tienen nada programado: ahí se registra lo no programado) */
  const ps=(E||SCK())&&NPon?visPisos():pisos().filter(p=>byP.has(p.id));if((!E&&CP.pud!==d)||!ps.some(p=>p.id===CP.pid)){const zp=API?ps.find(p=>{const z=API.zonedSet(p.id);return(byP.get(p.id)||[]).some(o=>z.has(o.x.id))}):null;CP.pid=((zp||ps.find(p=>byP.has(p.id))||ps[0])||{}).id||''}
  const items=byP.get(CP.pid)||[];const nums=API?API.nums(CP.pid):new Map();const zoned=API?API.zonedSet(CP.pid):new Set();
  const cnt={none:0,seq:0,run:0,stop:0,ok:0,no:0};allF.forEach(o=>cnt[kState(d,o.x.id).k]++);const pend=capPend(d).filter(l=>!CP.sc||l.sc===CP.sc);
  if(!main.dataset.built){main.innerHTML=`<div class="kap"><div class="khd" id="khd"></div><div class="kbody"><div class="kplanw" id="kplanw"><div class="kplan" id="kplan"></div></div><div id="klist"></div></div></div>`;main.dataset.built='1';main.onclick=capClick}
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  let hh=E?`<div class="khi"><div><b>Campo</b><span>${dw} ${fmtD(d)}${d===todayIso()?' · hoy':''} · ${my.length} partida${my.length===1?'':'s'}</span></div>${d===todayIso()&&!VEED()?`<button class="ib" data-sini title="Reporte para WhatsApp: lo que aún no marca su inicio" aria-label="Reporte sin iniciar">📲<span> Sin iniciar</span></button>`:''}<button class="ib" data-kd="-1" aria-label="Día anterior">&#8249;</button>${d!==todayIso()?'<button class="ib" data-kd="0">Hoy</button>':''}<button class="ib" data-kd="1" aria-label="Día siguiente">&#8250;</button></div>`:`<div class="khi"><div><b>Hola, ${esc((me.name||'').split(' ')[0]||(SCK()?'':'capataz'))}</b><span>${dw} ${fmtD(d)} · ${esc(my.map(c=>conOf(c).name).join(', '))}</span></div>${SCK()?'':'<button class="ib" data-kmenu aria-label="Menú">⋯</button>'}</div>`;
  if(my.length>1)hh+=`<div class="kchips"><button class="${!CP.sc?'on':''}" data-ksc="">Todas</button>${my.map(c=>`<button class="${CP.sc===c?'on':''}" data-ksc="${c}" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}</div>`;
  if(ps.length)hh+=`<div class="kchips">${ps.map(p=>`<button class="${CP.pid===p.id?'on':''}" data-kp="${p.id}">${esc(p.code)} · ${esc(p.name)} <b>${(byP.get(p.id)||[]).length}</b>${(()=>{const n=NPon?npItems([d],new Set([p.id])).filter(i=>!CP.sc||i.e.sc===CP.sc).length:0;return n?`<b class="knp" title="Trabajo no programado registrado">+${n}</b>`:''})()}</button>`).join('')}</div>`;
  hh+=`<div class="ktog">${E?'<span class="seg"><button data-kv="list">Tarjetas</button><button class="on" data-kv="plan">Plano</button></span>':`<span class="seg"><button class="${CP.v==='plan'?'on':''}" data-kv="plan">Plano</button><button class="${CP.v==='list'?'on':''}" data-kv="list">Tarjetas</button></span>`}<span class="kcnt">${['none','seq','run','stop','ok','no'].map(k=>cnt[k]?`<span style="--k:${KST[k].c}"><i></i>${cnt[k]}</span>`:'').join('')}</span></div>`;
  const khd=$('#khd',main);if(khd.dataset.h!==hh){khd.innerHTML=hh;khd.dataset.h=hh}
  const npOn=NPon&&(E||SCK())&&!!CP.pid&&d<=todayIso();const npArm=npOn&&!!NPA&&NPA.pid===CP.pid&&NPA.d===d;if(!npArm)NPA=null;const pw=$('#kplanw',main);pw.hidden=V!=='plan'||(!items.length&&!npOn);pw.classList.toggle('knparm',npArm);
  if(V==='plan'&&(items.length||npOn)&&API){const colors=new Map(items.map(o=>[o.x.id,KST[kState(d,o.x.id).k].c]));API.capPlan($('#kplan',main),{empty:npOn?'Usa el botón <b>+ No programado</b>.':'Usa la vista <b>Tarjetas</b>.',pid:CP.pid,colors,nums,bs:E&&items.length>8?30:40,onPick:(aid,z,pt)=>{capSheet(aid,d,'main');if(KS)KS.pt=pt||null},
    marks:npOn?npMarks(d,CP.pid,i=>!CP.sc||i.e.sc===CP.sc):null,onEmpty:npArm?pt=>{NPA=null;npNew({d,pid:CP.pid,pt});requestRender()}:null,npAll:npArm,onDbl:npOn?pt=>{NPA=null;kClose();npNew({d,pid:CP.pid,pt});requestRender()}:null,onMark:id=>npOpen(id)})}
  let lh='';
  if(liveErr)lh+=`<div class="callout">No se pudo leer el avance (${esc(liveErr)}). Avisa al administrador: faltan las reglas nuevas de Firestore.</div>`;
  if(pend.length)lh+=`<div class="ksec warn">Pendientes de cerrar (${pend.length})</div>${pend.map(l=>{const x=S.act.get(l.actId);const a=S.amb.get(x.ambId);return kCard(l.date,{x,a},null,true)}).join('')}`;
  if(npErr&&npOn)lh+=`<div class="callout">No se pudo leer el trabajo no programado (${esc(npErr)}). Faltan las reglas nuevas de Firestore.</div>`;
  if(npOn)lh+=npArm?`<div class="knpbar knpon"><div class="knparmt"><b>Toca en el plano</b> el lugar donde ves trabajando a la cuadrilla.</div><div class="knpbtns"><button class="ib" data-knpl>Elegir de la lista</button><button class="ib" data-knpx>Cancelar</button></div></div>`:`<div class="knpbar"><button class="kbig ghost knpadd" data-knp>＋ No programado</button><span class="knote">${items.length?'Toca un número para '+(VEED()?'ver':'verificar')+'. Trabajo no programado: <b>dos toques rápidos</b> en cualquier lugar del plano, o <b>＋ No programado</b> y luego el lugar.':'Dos toques rápidos en el lugar del plano donde ves trabajando a una cuadrilla, o <b>＋ No programado</b> y luego el lugar.'}</span></div>`;
  if(!all.length&&!npOn)lh+=`<div class="kemp">${nwReason(d)?esc(nwReason(d))+': día no laborable, no hay actividades programadas.':(E?'No hay actividades programadas este día.':'No tienes actividades programadas para hoy.')}</div>`;
  else if(V==='plan'){const un=items.filter(o=>!zoned.has(o.x.id));
    lh+=`<div class="kleg">${['none','run','stop','ok','no'].map(k=>`<span style="--k:${KST[k].c}"><i></i>${KST[k].t}</span>`).join('')}${npOn?'<span class="knpl"><i>+</i>No programado</span>':''}</div>${npOn?'':`<p class="knote">Toca un número para ${E?'verificar':SCK()?'iniciar o detener':'reportar'}.</p>`}`;
    if(un.length)lh+=`<div class="ksec">Sin ubicar en el plano (${un.length})</div>${un.map(o=>kCard(d,o,nums.get(o.x.id))).join('')}`}
  else lh+=items.map(o=>kCard(d,o,nums.get(o.x.id))).join('');
  if(npOn)lh+=npListHtml(d,new Set([CP.pid]),i=>!CP.sc||i.e.sc===CP.sc);
  const kl=$('#klist',main);if(kl.dataset.h!==lh){kl.innerHTML=lh;kl.dataset.h=lh}
  if(KS&&$('#ksheet'))capSheet(KS.aid,KS.d,KS.mode,true)}
function capClick(e){const t=e.target;let b;if(t.closest('[data-sini]')){sinIniOpen();return}
  if((b=t.closest('[data-ksc]'))){CP.sc=b.dataset.ksc;saveCP();render();return}
  if((b=t.closest('[data-kp]'))){CP.pid=b.dataset.kp;CP.pud=todayIso();saveCP();render();return}
  if((ENG()||VEED())&&(b=t.closest('[data-kv]'))){if(b.dataset.kv==='list'){CU.view='list';saveCU();$('#main').dataset.built='';kClose();render()}return}
  if(t.closest('[data-knp]')){const pw=$('#kplanw'),kp=$('#kplan');if(!pw||pw.hidden||!kp||!kp._v){npNew({d:campoDate(),pid:CP.pid});return}NPA={pid:CP.pid,d:campoDate()};render();pw.scrollIntoView({block:'nearest',behavior:'smooth'});return}
  if(t.closest('[data-knpx]')){NPA=null;render();return}
  if(t.closest('[data-knpl]')){NPA=null;npNew({d:campoDate(),pid:CP.pid});render();return}
  if((b=t.closest('[data-kd]'))){const v=+b.dataset.kd;CU.date=v===0?null:shiftDay(campoDate(),v);if(CU.date===todayIso())CU.date=null;const kp=$('#kplan');if(kp)kp._fk='';render();return}
  if((b=t.closest('[data-kv]'))){CP.v=b.dataset.kv;saveCP();const kp=$('#kplan');if(kp)kp._fk='';render();return}
  if((b=t.closest('[data-kmenu]'))){openPop(b,`<div class="ph">${esc(me.name||'')}</div><div class="ptx">Capataz · ${esc((me.scs||[]).map(c=>conOf(c).name).join(', '))}</div><button data-do="name">Cambiar mi nombre…</button><button data-do="rl">Actualizar</button><button data-do="help">? Ayuda</button><hr><button data-do="out" class="danger">Salir de este celular…</button>`,{
    rl:()=>location.reload(),help:()=>ayOpen(),
    name:async()=>{const v=await uiAsk({title:'Cambiar mi nombre',input:{label:'Nombre y apellido',value:me.name||'',required:true},ok:'Guardar'});if(v&&v.trim()&&db)fcol('members').doc(me.email).update({name:v.trim().slice(0,60)}).then(()=>toast('Nombre actualizado')).catch(err=>toast('No se pudo: '+(err.code||err.message)))},
    out:async()=>{if(await uiAsk({title:'¿Salir de este celular?',text:'Para volver a entrar necesitarás un enlace nuevo del ingeniero.',ok:'Salir',tone:'danger'}))$('#blogout').click()}});return}
  const card=t.closest('article[data-k]');if(!card)return;const aid=card.dataset.k,d=card.dataset.d;
  const q=t.closest('[data-kq]');if(q){const k=q.dataset.kq;if(k==='run'||k==='res'){kAct(aid,d,k)}else if(k==='conf'){confirmProp(d,aid);toast('Confirmado')}else capSheet(aid,d,'close');return}
  capSheet(aid,d,'main')}
function kAct(aid,d,k){const lv=liveOf(d,aid);const re=!!(lv&&lv.st==='stop'&&lv.t0);if(k==='run'||k==='res'){liveWrite(d,aid,{st:'run',t0:lv&&lv.t0||NOW(),mot:'',seq:{on:false,after:''}},{s:re?'res':'run'});toast(re?'Marcada reanudada':'Marcada iniciada')}}
function capSheet(aid,d,mode,keep){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);
  if(!keep||!KS||KS.aid!==aid||KS.d!==d)KS={aid,d,mode,cs:'',cnc:'',mot:'',note:'',done:false,imp:null,photo:null};KS.mode=mode;
  const s=kState(d,aid);const lv=liveOf(d,aid);const nums=window.__plano&&window.__plano.nums?window.__plano.nums(pisoOfAct(aid)):new Map();const n=nums.get(aid);const past=d<todayIso();
  const E=ENG();if(mode==='close'&&!keep){if(E){const r=recOf(d,aid);if(r){KS.cs=r.status==='partial'?'no':r.status;KS.cnc=r.cnc||'';KS.note=r.note||'';KS.done=!!r.done;KS.imp=r.imp??null}}else if(lv&&lv.close){KS.cs=lv.close.status||'';KS.cnc=lv.close.cnc||'';KS.note=lv.close.note||'';KS.done=!!lv.close.done}}
  const cnc=P().cnc||[];const later=(x.days||[]).filter(y=>y>d).length;
  let h=`<div class="ksh"><i class="kn" style="--k:${KST[s.k].c}">${n||'·'}</i><div><b>${esc(x.name)}</b><span>${esc(a?a.code+' · '+a.name:'')} · ${esc(S.pis.get(pisoOfAct(aid))?.name||'')}</span><span>${esc(conOf(x.sc).name)}${past?' · <b>'+fmtD(d)+'</b>':''}</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    <div class="kst" style="--k:${KST[s.k].c}">${esc(kText(d,aid))}</div>${liveLine(d,aid)}${actPhotos(d,aid)}`;
  if(mode==='stop'){h+=`<div class="ksl">${s.k==='run'?'¿Por qué se detuvo?':'¿Por qué no inicia?'}</div><div class="kchips kw">${STOP_MOT.map(c=>`<button class="${KS.mot===c?'on':''}" data-kmot="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${KS.mot===STOP_INFO?'<p class="knote">Tren de trabajo: la cuadrilla llega más tarde a este ambiente. Es informativo; al cierre se marca cumplido o no cumplido como siempre.</p>':''}
      <input class="kin" id="kmott" placeholder="${KS.mot==='Otros'?'Detalle (obligatorio)':'Detalle (opcional)'}" value="${esc(KS.note)}"><label class="kph">📷 Foto (opcional)<input type="file" accept="image/*" capture="environment" id="kphoto" hidden></label><span class="knote" id="kphn"></span>
      <div class="kbtns"><button class="kbig warn" data-ka="stopsave">⏸ Guardar «Detenido»</button><button class="kbig ghost" data-ka="back">Volver</button></div>`}
  else if(mode==='close'){h+=`<div class="ksl">¿Se cumplió lo programado para ${past?'ese día':'hoy'}?</div><div class="kbtns two"><button class="kbig ok${KS.cs==='ok'?' on':''}" data-kcs="ok">✓ Cumplido</button><button class="kbig no${KS.cs==='no'?' on':''}" data-kcs="no">✗ No cumplido</button></div>
      ${KS.cs==='no'?`<div class="ksl">Causa</div><div class="kchips kw">${cnc.map(c=>`<button class="${KS.cnc===c?'on':''}" data-kcnc="${esc(c)}" title="${esc(cncTip(c))}">${esc(cncLabel(c))}</button>`).join('')}</div>`:''}
      ${E&&KS.cs==='no'&&KS.cnc?`<div class="ksl">¿Imputable a ${esc(conOf(x.sc).name)}?</div><span class="seg kseg"><button class="${(KS.imp??cncImp(KS.cnc))?'on':''}" data-kimp="1">Sí</button><button class="${(KS.imp??cncImp(KS.cnc))?'':'on'}" data-kimp="0">No</button></span><p class="knote">${KS.imp!=null?'Cambiado a mano.':'Según la causa.'} Igual que en las tarjetas: lo no imputable no le baja el PPC del SC.</p>`:''}
      ${KS.cs==='ok'&&later?`<label class="kchk"><input type="checkbox" id="kdone"${KS.done?' checked':''}> La actividad quedó <b>terminada</b> (no volverá los ${later} día${later>1?'s':''} que faltan)</label>`:''}
      <input class="kin" id="knote" placeholder="Comentario (opcional)" value="${esc(KS.note)}">
      <label class="kph">📷 Foto${KS.photo?' (lista)':' (opcional)'}<input type="file" accept="image/*" capture="environment" id="kphoto" hidden></label><span class="knote" id="kphn">${(recOf(d,aid)?.photos||[]).length?(recOf(d,aid).photos.length)+' foto(s) ya registradas':''}</span>
      <div class="kbtns"><button class="kbig pri" data-ka="closesave"${KS.cs&&(KS.cs==='ok'||KS.cnc)?'':' disabled'}>${E?'Guardar verificación':'Enviar cierre'}</button><button class="kbig ghost" data-ka="back">Volver</button></div><p class="knote">${E?'Queda registrado como verificado por ti (cuenta para el PPC).':'El ingeniero de campo lo revisará y confirmará.'}</p>`}
  else if(VEED()){const r=recOf(d,aid);h+=`<p class="knote">${r?`Verificado por ${esc(r.byName||'')} · ${hhmm(r.ts)}`:'El avance lo verifica el ingeniero de campo.'}</p><div class="kbtns"><button class="kbig ghost" data-kx>Cerrar</button></div>`}
  else if(E){const r=recOf(d,aid);const live=d===todayIso()&&!s.conf&&!(s.k==='ok'||s.k==='no');
    if(s.conf)h+=`<p class="knote">Verificado por ${esc(r&&r.byName||'')} · ${hhmm(r&&r.ts)}${r&&r.prop&&r.prop.status!==r.status?' · el capataz había marcado '+(r.prop.status==='ok'?'✓':'✗'):''}</p><div class="kbtns"><button class="kbig ghost" data-ka="closef">Cambiar verificación</button></div>`;
    else if(r&&r._prop)h+=`<p class="knote">Propuesto por <b>${esc(r.byName||'el capataz')}</b> · ${hhmm(r.ts)}</p><div class="kbtns"><button class="kbig pri" data-ka="confp">✓ Confirmar lo propuesto</button><button class="kbig ghost" data-ka="closef">Corregir…</button></div>`;
    else h+=`<div class="kbtns"><button class="kbig pri" data-ka="closef">✓ Verificar cumplimiento…</button>${live?(s.k==='none'||s.k==='seq'?'<div class="kbtns two"><button class="kbig run" data-ka="run">▶ Iniciado</button><button class="kbig warn" data-ka="stopf">⏸ Detenido…</button></div>':s.k==='run'?'<button class="kbig warn" data-ka="stopf">⏸ Detenido…</button>':`<div class="kbtns two"><button class="kbig run" data-ka="res">${lv&&lv.t0?'▶ Reanudado':'▶ Iniciado'}</button><button class="kbig ghost" data-ka="stopf">Cambiar motivo…</button></div>`):''}</div>`}
  else if(SCK()){if(s.conf)h+=`<p class="knote">El ingeniero ya confirmó este registro.</p>`;
    else if(past)h+=`<p class="knote">Solo puedes marcar el avance del día de hoy.</p>`;
    else if(s.k==='ok'||s.k==='no')h+=`<p class="knote">Cierre enviado: el ingeniero lo confirma.</p><div class="kbtns"><button class="kbig ghost" data-ka="closef">Cambiar cierre</button></div>`;
    else if(s.k==='none'||s.k==='seq')h+=`<div class="kbtns"><div class="kbtns two"><button class="kbig run" data-ka="run">▶ ${liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'Continúa hoy':'Iniciado'}</button><button class="kbig warn" data-ka="stopf">⏸ Detenido…</button></div><button class="kbig ghost" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='run')h+=`<div class="kbtns"><button class="kbig warn" data-ka="stopf">⏸ Detenido…</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='stop')h+=`<div class="kbtns"><button class="kbig run" data-ka="res">${lv&&lv.t0?'▶ Reanudado':'▶ Iniciado'}</button><button class="kbig ghost" data-ka="stopf">Cambiar motivo…</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    h+=`<p class="knote">Al final del día (≈ 4 pm) propón el cierre: cumplido o no cumplido. El ingeniero lo confirma; si no lo propones, él lo registra igual.</p>`}
  else{if(s.conf)h+=`<p class="knote">El ingeniero ya confirmó este registro.</p>`;
    else if(past)h+=`<div class="kbtns"><button class="kbig pri" data-ka="closef">Cerrar ${fmtD(d)}</button></div>`;
    else if(s.k==='none'||s.k==='seq')h+=`<div class="kbtns"><div class="kbtns two"><button class="kbig run" data-ka="run">▶ ${liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'Continúa hoy':'Iniciado'}</button><button class="kbig warn" data-ka="stopf">⏸ Detenido…</button></div><button class="kbig ghost" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='run')h+=`<div class="kbtns"><button class="kbig warn" data-ka="stopf">⏸ Detenido…</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='stop')h+=`<div class="kbtns"><button class="kbig run" data-ka="res">${lv&&lv.t0?'▶ Reanudado':'▶ Iniciado'}</button><button class="kbig ghost" data-ka="stopf">Cambiar motivo…</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    else h+=`<div class="kbtns"><button class="kbig ghost" data-ka="closef">Cambiar cierre</button></div>`}
  if(typeof canNP==='function'&&((canNP()&&(ENG()||VEED()))||(SCK()&&npSC()))&&d<=todayIso())h+=`<button class="kbig ghost knpadd" data-ka="np">＋ Otro trabajo aquí (no programado)</button>`;
  let sh=$('#ksheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='ksheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);
    sh._open=NOW();sh.onclick=kSheetClick;sh.onchange=kSheetChange;sh.oninput=e=>{if(e.target.id==='knote'||e.target.id==='kmott')KS.note=e.target.value}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}
/* foto elegida en la ficha (detención o cierre): se guarda en fotos y devuelve su id */
function kPhotoSave(d,aid,live){if(!KS||!KS.photo||!db)return null;const fid=uid('f');FOTO.set(fid,KS.photo);fcol('fotos').doc(fid).set({data:KS.photo,date:d,pisoId:pisoOfAct(aid),actId:aid,by:me.email,ts:NOW(),...(live?{live:true}:{})}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));KS.photo=null;return fid}
function kClose(){const sh=$('#ksheet');if(sh)sh.remove();KS=null}
async function kSheetChange(e){const t=e.target;if(t.id==='kdone'){KS.done=t.checked;return}
  if(t.id==='kphoto'&&t.files[0]){const f=t.files[0];t.value='';try{$('#kphn').textContent='Comprimiendo foto…';KS.photo=await shrinkPhoto(f);$('#kphn').textContent=`Foto lista (${Math.round(KS.photo.length*.75/1024)} KB)`;if(KS.mode==='close')capSheet(KS.aid,KS.d,'close',true)}catch(err){toast(err.message)}}}
function kSheetClick(e){const t=e.target;const sh=$('#ksheet');{const im=t.closest('.kphs img[data-ph]');if(im){if(im.src&&im.src.startsWith('data:')&&typeof lightbox==='function')lightbox(im.src);return}}if(t===sh&&NOW()-(sh._open||0)<600)return;if(t===sh||t.closest('[data-kx]')){kClose();return}if(!KS)return;const{aid,d}=KS;let b;
  if((b=t.closest('[data-kmot]'))){KS.mot=b.dataset.kmot;capSheet(aid,d,'stop',true);return}
  if((b=t.closest('[data-kcs]'))){KS.cs=b.dataset.kcs;if(KS.cs==='ok'){KS.cnc='';KS.imp=null}capSheet(aid,d,'close',true);return}
  if((b=t.closest('[data-kcnc]'))){KS.cnc=b.dataset.kcnc;KS.imp=null;capSheet(aid,d,'close',true);return}
  if((b=t.closest('[data-kimp]'))){const v=b.dataset.kimp==='1';KS.imp=v===cncImp(KS.cnc)?null:v;capSheet(aid,d,'close',true);return}
  if(!(b=t.closest('[data-ka]')))return;const k=b.dataset.ka;
  if(k==='np'){const x=S.act.get(aid);const pt=KS.pt||null;kClose();if(x)npNew({d,pid:pisoOfAct(aid),ambId:x.ambId,pt});return}
  if(k==='back'){capSheet(aid,d,'main',true);return}
  if(k==='stopf'){KS.note='';KS.mot='';capSheet(aid,d,'stop',true);return}
  if(k==='closef'){capSheet(aid,d,'close');return}
  if(k==='run'||k==='res'){kAct(aid,d,k);kClose();return}
  if(k==='stopsave'){const mot=KS.mot||'';if(!mot){toast('Elige el motivo.');return}if(mot==='Otros'&&!KS.note.trim()){toast('Escribe el detalle del motivo.');$('#kmott')&&$('#kmott').focus();return}
    const lv=liveOf(d,aid);let extra=null;
    {const fid=kPhotoSave(d,aid,true);if(fid)extra={photos:[...(lv&&lv.photos||[]),fid]}}
    liveWrite(d,aid,{st:'stop',mot:mot+(KS.note.trim()?' — '+KS.note.trim():''),t0:lv&&lv.t0||null,seq:{on:false,after:''}},{s:'stop',m:mot},extra);toast('Marcada «Detenido»');kClose();return}
  if(k==='confp'){confirmProp(d,aid);toast('Confirmado');kClose();return}
  if(k==='closesave'&&ENG()){if(!KS.cs||(KS.cs==='no'&&!KS.cnc)){toast(KS.cs?'Elige la causa.':'Elige Cumplido o No cumplido.');return}const x=S.act.get(aid);const cur=recOf(d,aid);
    const fid=kPhotoSave(d,aid,false);writeDaily(d,pisoOfAct(aid),{recs:{[aid]:{...baseRec(d,x,cur),status:KS.cs,cnc:KS.cs==='no'?KS.cnc:'',imp:KS.cs==='no'?KS.imp:null,note:KS.note.trim(),done:KS.cs==='ok'&&!!KS.done,photos:[...((cur&&cur.photos)||[]),...(fid?[fid]:[])]}}});toast('Verificación guardada');kClose();return}
  if(k==='closesave'){if(!KS.cs||(KS.cs==='no'&&!KS.cnc)){toast(KS.cs?'Elige la causa.':'Elige Cumplido o No cumplido.');return}
    const lv0=liveOf(d,aid);const fid=kPhotoSave(d,aid,true);liveWrite(d,aid,{close:{status:KS.cs,cnc:KS.cs==='no'?KS.cnc:'',note:KS.note.trim(),done:KS.cs==='ok'&&!!KS.done,by:me.email,n:me.name||'',t:NOW()}},{s:'close',m:KS.cs},fid?{photos:[...(lv0&&lv0.photos||[]),fid]}:null);toast('Cierre enviado. El ingeniero lo confirmará.');kClose();return}}

/* ---------- Reporte «sin inicio marcado» para WhatsApp (oct 2026) ----------
   Lo programado hoy (sin «No va») que a esta hora nadie marcó: ni iniciado, ni detenido, ni cerrado. Consolidado y por SC. */
function sinIniData(){const d=todayIso();const vs=new Set(visPisos().map(p=>p.id));const API=window.__plano&&window.__plano.novaSet?window.__plano:null;const nv=API?API.novaSet(d):new Set();
  const by=new Map();let tot=0;
  for(const x of S.act.values()){if(!schedOrSnap(x,d)||nv.has(x.id))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid))continue;const a=S.amb.get(x.ambId);if(!a)continue;
    const o=by.get(x.sc)||{n:0,L:[]};o.n++;by.set(x.sc,o);tot++;if(kState(d,x.id).k==='none')o.L.push({x,a,p:S.pis.get(pid)})}
  const rows=[...by.entries()].filter(([,o])=>o.L.length).map(([sc,o])=>({sc,n:o.n,L:o.L.sort((p,q)=>(p.p.order||0)-(q.p.order||0)||String(p.a.code).localeCompare(String(q.a.code),'es',{numeric:true}))})).sort((a,b)=>b.L.length-a.L.length||conOf(a.sc).name.localeCompare(conOf(b.sc).name));
  return{d,rows,tot,nSin:rows.reduce((t,r)=>t+r.L.length,0)}}
function sinIniTxt(R,sc){const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(R.d).getUTCDay()];const hm=nowHM();const obra=P().name||'la obra';
  const lst=r=>{let t='',lp='';for(const o of r.L){if(o.p.id!==lp&&new Set(r.L.map(q=>q.p.id)).size>1){t+=`_${o.p.code} · ${o.p.name}_\n`;lp=o.p.id}t+=`• ${o.a.code} ${o.a.name} · ${o.x.name}\n`}return t};
  if(sc){const r=R.rows.find(q=>q.sc===sc);if(!r)return'';return`Hola, *${conOf(sc).name}*.\nA las ${hm} de hoy ${dw.toLowerCase()} ${fmtD(R.d)} aún no marcan el inicio de ${r.L.length} de sus ${r.n} actividades programadas (${obra}):\n\n${lst(r)}\nPor favor márquenlas en LPS 911: *▶ Iniciado*, o *⏸ Detenido* con el motivo. Gracias.`}
  return`*Sin inicio marcado · ${dw} ${fmtD(R.d)} · ${hm}*\n${obra}\n${R.nSin} actividades de ${R.rows.length} subcontratista${R.rows.length===1?'':'s'}\n\n`+R.rows.map(r=>`*${conOf(r.sc).name}* · ${r.L.length} de ${r.n}\n${lst(r)}`).join('\n')}
let SIR=null;
function sinIniOpen(){SIR={sel:''};sinIniDraw()}
function sinIniDraw(){if(!SIR)return;const R=sinIniData();if(SIR.sel&&!R.rows.some(r=>r.sc===SIR.sel))SIR.sel='';const txt=R.rows.length?sinIniTxt(R,SIR.sel):'';
  let h=`<div class="ksh"><i class="kn" style="--k:${KST.none.c}">⏰</i><div><b>Sin inicio marcado</b><span>Hoy ${fmtD(R.d)} · ${nowHM()} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span><span>${R.nSin} actividad${R.nSin===1?'':'es'} de ${R.rows.length} SC</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>`;
  if(!R.rows.length)h+=`<p class="knote">✓ Todos los subcontratistas ya marcaron el inicio (o el motivo) de lo programado hoy.</p>`;
  else{h+=`<div class="kchips kw"><button class="${SIR.sel?'':'on'}" data-sis="">Consolidado <b>${R.nSin}</b></button>${R.rows.map(r=>`<button class="${SIR.sel===r.sc?'on':''}" data-sis="${r.sc}" style="--c:${conOf(r.sc).color}"><i></i>${esc(conOf(r.sc).name)} <b>${r.L.length}</b></button>`).join('')}</div>
    <textarea class="kin sitx" id="sitx" readonly rows="12">${esc(txt)}</textarea>
    <div class="kbtns two"><button class="kbig ghost" data-sic>📋 Copiar</button><a class="kbig pri" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">WhatsApp</a></div>
    <p class="knote">${SIR.sel?'Mensaje para enviar a este subcontratista.':'Resumen de todos, para el grupo de la obra. Elige un SC para su mensaje individual.'} WhatsApp abre el chat para que elijas a quién enviarlo.</p>`}
  let sh=$('#sisheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='sisheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);const t0=NOW();
    sh.onclick=e=>{const t=e.target;if((t===sh&&NOW()-t0>400)||t.closest('[data-kx]')){sh.remove();SIR=null;return}let b;
      if((b=t.closest('[data-sis]'))){SIR.sel=b.dataset.sis;sinIniDraw();return}
      if(t.closest('[data-sic]')){const v=($('#sitx')||{}).value||'';(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(()=>toast('Copiado: pégalo en WhatsApp')).catch(()=>{const ta=$('#sitx');if(ta){ta.removeAttribute('readonly');ta.select();toast('Copia el texto seleccionado')}})}}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}

/* ---------- invitaciones de capataces (Equipo) ---------- */
const INV=new Map();let invSub=null;
function ensureInv(){if(invSub||!db||!isAdmin)return;invSub=fcol('inv').onSnapshot(sn=>{INV.clear();sn.docs.forEach(d=>INV.set(d.id,{...d.data(),id:d.id}));if(U.tab==='team'&&!isDirtyFocus())requestRender()},()=>{});unsubs.push(()=>{if(invSub)invSub();invSub=null;INV.clear()})}
/* invitación del tareo (role:'tcap', sin partida): el enlace lleva &m=tar para que la pantalla de registro hable del tareo */
const invURL=c=>{const i=INV.get(c);return location.origin+location.pathname+'?inv='+c+(i&&i.role==='tcap'?'&m=tar':'')};
const invWho=i=>i&&i.role==='tcap'?'Capataz del tareo (consorcio)':(i?(i.scs||[]).map(c=>conOf(c).name).join(', '):'');
let qrP=null;
function loadQR(){if(window.qrcode)return Promise.resolve();if(qrP)return qrP;qrP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=window.LPS_QR||'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';s.onload=ok;s.onerror=()=>{qrP=null;ko(new Error('No se pudo cargar el generador de QR'))};document.head.appendChild(s)});return qrP}
async function newInvite(scs,tcap){const A='abcdefghjkmnpqrstuvwxyz23456789';const code=Array.from(crypto.getRandomValues(new Uint8Array(10)),b=>A[b%A.length]).join('');
  const d={active:true,exp:NOW()+7*864e5,by:me.email,ts:NOW()};if(tcap)d.role='tcap';else d.scs=scs;
  await fcol('inv').doc(code).set(d);INV.set(code,{...d,id:code});return code}
async function showInvite(code){const iv=INV.get(code);const url=invURL(code);const tc=!!iv&&iv.role==='tcap';const names=invWho(iv);let svg='';
  try{await loadQR();const q=qrcode(0,'M');q.addData(url);q.make();svg=q.createSvgTag({cellSize:7,margin:3,scalable:true})}catch(err){svg=`<p class="note">${esc(err.message)}</p>`}
  const msg=tc?`Hola, este es tu acceso para llenar el tareo diario de tu cuadrilla en la app de obra (${esc(P().name||'Last Planner')}). Ábrelo en tu celular y escribe tu nombre: ${url}`:`Hola, este es tu acceso para reportar el avance de ${names} en la app de obra (${esc(P().name||'Last Planner')}). Ábrelo en tu celular y escribe tu nombre: ${url}`;
  const lb=document.createElement('div');lb.className='lb qrlb';lb.innerHTML=`<div class="qrc"><b>${tc?esc(names):'Capataz · '+esc(names)}</b><span class="mu">Válido hasta el ${iv?fmtD(ldt((iv.exp)))+' ':''}· escanéalo con la cámara del celular</span><div class="qrs">${svg}</div><input class="tin" readonly value="${esc(url)}" onclick="this.select()">
    <div class="qrb"><button class="ib pri" data-qc>Copiar enlace</button><a class="ib" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Enviar por WhatsApp</a><button class="ib" data-qx>Cerrar</button></div></div>`;
  lb.onclick=ev=>{if(ev.target===lb||ev.target.closest('[data-qx]'))lb.remove();else if(ev.target.closest('[data-qc]')){(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Enlace copiado')).catch(()=>{lb.querySelector('input').select();toast('Copia el enlace seleccionado')})}};
  document.body.appendChild(lb)}
function invCard(){if(!isAdmin)return'';ensureInv();const now=NOW();const L=[...INV.values()].filter(i=>i.active&&i.exp>now).sort((a,b)=>b.ts-a.ts);
  const used=c=>[...MEM.values()].filter(m=>m.inv===c).length;const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  return`<div class="card"><div class="hd">Capataces <span class="sub">ingreso con enlace o código QR, sin correo ni contraseña</span></div><div class="pad">
    <p class="note" style="margin:0 0 10px">Crea un enlace para la partida, envíalo por WhatsApp o muestra el QR. El capataz lo abre en su celular, escribe su nombre y queda registrado <b>solo para esa partida</b>: ve sus actividades del día y reporta Iniciada / Detenida / Cierre. Cada enlace sirve para varios capataces durante 7 días. Para quitarle el acceso a alguien, usa “Quitar acceso” en la lista de arriba. Para los capataces del consorcio elige <b>Capataz del tareo</b>: entran solo al Tareo, a llenar el de su cuadrilla.</p>
    <p class="callout" data-tctanote style="margin:0 0 10px"><b>Mejor:</b> crea una cuenta con usuario y contraseña desde <b>Tareo › Personal › Hacer capataz</b>. El enlace queda guardado solo en ese navegador: si el capataz pierde el celular o borra sus datos, pierde su usuario; con DNI y contraseña entra desde cualquier celular.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="tin" id="invsc" aria-label="Partida"><option value="">— partida —</option>${cons.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}<optgroup label="Tareo"><option value="__tcap">Capataz del tareo (consorcio)</option></optgroup></select><button class="ib pri" id="invgo">Crear enlace / QR</button></div>
    ${L.length?`<div class="tscroll" style="margin-top:10px"><table class="t"><thead><tr><th>Partida</th><th>Vence</th><th>Capataces registrados</th><th></th></tr></thead><tbody>${L.map(i=>`<tr${i.role==='tcap'?' data-invtar':''}><td>${i.role==='tcap'?'<span class="chip">Tareo</span> ':''}${esc(invWho(i))}</td><td>${fmtD(ldt((i.exp)))}</td><td>${used(i.id)}</td><td style="white-space:nowrap"><button class="ib" data-invqr="${i.id}" style="height:28px">Ver QR / enlace</button> <button class="ib" data-invoff="${i.id}" style="height:28px">Desactivar</button></td></tr>`).join('')}</tbody></table></div>`:''}
  </div></div>`}
async function invClick(e){const t=e.target;let b;
  if(t.id==='invgo'){const sc=$('#invsc').value;if(!sc){toast('Elige la partida.');return}try{const c=sc==='__tcap'?await newInvite(null,true):await newInvite([sc]);setTimeout(()=>showInvite(c),150)}catch(err){toast('No se pudo crear: '+(err.code||err.message))}return true}
  if((b=t.closest('[data-invqr]'))){showInvite(b.dataset.invqr);return true}
  if((b=t.closest('[data-invoff]'))){try{await fcol('inv').doc(b.dataset.invoff).update({active:false});toast('Enlace desactivado. Los capataces ya registrados siguen con acceso.')}catch(err){toast('No se pudo: '+(err.code||err.message))}return true}
  return false}

/* =====================================================================
   ETAPA 27 · Tablero en vivo (jefe de obra / residente / jefe de campo)
   ===================================================================== */
const shortT=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t};
const dashOn=m=>!!m&&(m.role==='admin'||(m.role==='editor'?m.dash!==false:m.dash===true));
const canDash=()=>!!me&&(isAdmin||isOwnerEmail(me.email)||dashOn(MEM.get(me.email)||{role:me.role}));
const DB_={pid:'',tv:false,tick:null,sc:new Set(),ty:''};
const nowHM=()=>{const n=new Date(NOW()-LIMA_OFF);return String(n.getUTCHours()).padStart(2,'0')+':'+String(n.getUTCMinutes()).padStart(2,'0')};
/* Tablero gerencial (oct 2026): solo informa (no registra nada). Filtros por subcontratista (varios) y tipo de actividad
   (el nombre de la actividad, normalizado con an()); todo lo que muestra respeta los filtros y el piso elegido arriba. */
const dashOk=(sc,name)=>(!DB_.sc.size||DB_.sc.has(sc))&&(!DB_.ty||an(name)===DB_.ty);
function dashData(d){const vs=new Set(visPisos().map(p=>p.id));const API=window.__plano&&window.__plano.novaSet?window.__plano:null;const nv=API?API.novaSet(d):new Set();
  const items=[];for(const x of S.act.values()){if(!schedOrSnap(x,d))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid))continue;if(!dashOk(x.sc,x.name))continue;const a=S.amb.get(x.ambId);if(!a)continue;items.push({x,a,pid,nova:nv.has(x.id),st:nv.has(x.id)?null:kState(d,x.id)})}
  return items}
/* PPC semanal oficial (semanas congeladas) con los filtros: compromisos de la foto de la semana (it.sc, it.act) */
/* auditoría 09/10: misma fórmula que Plan semanal e Indicadores. Sin filtro de SC = la del piso (ppcOf: un «frente no entregado»
   que le cuenta al SC anterior sí es imputable); con filtro de SC = la del SC (wkScStats: no imputable para él, y suma las fallas
   de otras partidas que el ingeniero le hizo contar a los SC elegidos) */
function dashWeek(n,vs){const o={n:0,ok:0,ev:0,nimp:0,ext:0,sc:{}};const byS=DB_.sc.size>0;for(const w of S.wk.values()){if(w.n!==n||!w.frozenAt||!w.pisoId||!vs.has(w.pisoId))continue;const r=w.res||{};
    for(const[id,it]of Object.entries(w.items||{})){const q=r[id];
      if(byS&&q&&q.ok===false&&q.rsc&&q.pc&&q.rsc!==it.sc&&DB_.sc.has(q.rsc)&&(!DB_.ty||an(it.act)===DB_.ty))o.ext++;
      if(!dashOk(it.sc,it.act))continue;const so=o.sc[it.sc]=o.sc[it.sc]||{n:0,ok:0,ev:0};o.n++;so.n++;
      if(q&&q.ok===true){o.ok++;o.ev++;so.ok++;so.ev++}else if(q&&q.ok===false){o.ev++;so.ev++;if(resNimp(q)&&(byS||!(q.rsc&&q.pc)))o.nimp++}}}
  o.ppc=o.n&&o.ev?o.ok/o.n:null;o.ppcSc=o.ev?ppcScOf(o.ok,o.n,o.nimp,o.ext):null;return o}
/* Avance de la semana contra lo congelado (oct 2026, decidido con el dueño): cada día de cada actividad de la semana congelada
   es una unidad. Meta = todas; esperado = las de días hasta hoy; real = días de la semana (hasta hoy) con «Cumplido» en el
   cumplimiento diario, aunque se haya cumplido otro día de la semana (tope: sus días comprometidos). Parcial y No cuentan 0.
   Lo cumplido que no estaba en lo congelado (o por encima de lo comprometido) va aparte como «extra» y no suma a la meta.
   Atribución por el SC de la foto (it.sc). Solo pisos con la semana congelada. */
function dashAvance(n,vs,d){const wd=weekDays(n).filter(z=>z<=d);const o={meta:0,esp:0,real:0,extra:0,pis:0,sc:{}};const g=sc=>o.sc[sc]=o.sc[sc]||{meta:0,esp:0,real:0,extra:0};const inW=new Set();
  for(const w of S.wk.values()){if(w.n!==n||!w.frozenAt||!w.pisoId||!vs.has(w.pisoId))continue;o.pis++;
    for(const[id,it]of Object.entries(w.items||{})){inW.add(id);if(!dashOk(it.sc,it.act))continue;const ds=it.days||[];if(!ds.length)continue;const so=g(it.sc);
      const esp=ds.filter(z=>z<=d).length;let ok=0;for(const z of wd){const rc=recOf(z,id);if(rc&&rc.status==='ok')ok++}
      const r=Math.min(ok,ds.length);o.meta+=ds.length;so.meta+=ds.length;o.esp+=esp;so.esp+=esp;o.real+=r;so.real+=r;if(ok>r){o.extra+=ok-r;so.extra+=ok-r}}}
  if(o.pis)for(const x of S.act.values()){if(inW.has(x.id)||!dashOk(x.sc,x.name))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid)||!S.wk.get(wkId(n,pid))?.frozenAt)continue;
    for(const z of wd){const rc=recOf(z,x.id);if(rc&&rc.status==='ok'){const sc=scAt(rc,x);o.extra++;g(sc).extra++}}}
  return o}
/* filtrado cruzado como Power BI (oct 2026): las listas por SC muestran todos los SC (con el filtro de tipo) y atenúan los no elegidos;
   tocar una fila filtra todo el tablero (clic = solo ese, Ctrl+clic = sumar, otra vez = todos) */
function noSc(fn){const k=DB_.sc;DB_.sc=new Set();try{return fn()}finally{DB_.sc=k}}
const scCls=sc=>DB_.sc.size?(DB_.sc.has(sc)?' dsel':' ddim'):'';
/* tipos de actividad para el filtro: nombres de lo programado en las últimas 6 semanas y las 2 siguientes */
function dashTypes(d){const a=addD(d,-42),b=addD(d,14);const m=new Map();for(const x of S.act.values()){if(!(x.days||[]).some(z=>z>=a&&z<=b))continue;if(DB_.sc.size&&!DB_.sc.has(x.sc))continue;const k=an(x.name);if(!k)continue;const o=m.get(k);if(o)o.n++;else m.set(k,{k,t:String(x.name).trim(),n:1})}
  return[...m.values()].sort((p,q)=>p.t.localeCompare(q.t))}
function renderDash(main){if(!canDash()){U.tab='look';render();return}
  const d=todayIso();ensureDaily(addD(d,-31));const API=window.__plano&&window.__plano.capPlan?window.__plano:null;if(!API)loadPlanoMod().catch(()=>{});else API.capInit(d);
  if(!DB_.tick)DB_.tick=setInterval(()=>{if(U.tab==='dash'&&ready)requestRender();else{clearInterval(DB_.tick);DB_.tick=null}},60000);
  const vsP=new Set(visPisos().map(p=>p.id));const items=dashData(d);const act=items.filter(i=>!i.nova);
  const c={none:0,seq:0,run:0,stop:0,ok:0,no:0};act.forEach(i=>c[i.st.k]++);const closed=c.ok+c.no;
  const stopL=act.filter(i=>i.st.k==='stop');const stopMot={};let later=0;stopL.forEach(i=>{const m=String(i.st.lv&&i.st.lv.mot||'Sin motivo').split(' — ')[0];if(m===STOP_INFO){later++;return}stopMot[m]=(stopMot[m]||0)+1});
  /* PPC diario de hoy con los filtros (misma base que Indicadores › Diario) */
  const dRows0=dayData([d],vsP).rows;const dRows=dRows0.filter(r=>dashOk(r.sc,r.x.name));const dv=dRows.filter(r=>r.rc).length,dok=dRows.filter(r=>r.rc&&r.rc.status==='ok').length;const ppcD=dv?dok/dv:null;
  const cw=weekOf(d);const W=[];for(let w=cw-7;w<=cw;w++){const o=dashWeek(w,vsP);if(o.n)W.push({w,...o})}
  const PW=W.find(o=>o.w===cw)||null;const full=W.filter(o=>o.w<cw&&o.ppc!=null&&o.ev>=o.n).slice(-4);const avg4=full.length?full.reduce((t,o)=>t+o.ok,0)/Math.max(1,full.reduce((t,o)=>t+o.n,0)):null;
  /* PPC por subcontratista: últimas 4 semanas congeladas */
  const Wall=DB_.sc.size?noSc(()=>{const L=[];for(let w=cw-7;w<=cw;w++){const o=dashWeek(w,vsP);if(o.n)L.push({w,...o})}return L}):W;
  const scAgg={};Wall.slice(-4).forEach(o=>Object.entries(o.sc).forEach(([sc,v])=>{const a=scAgg[sc]=scAgg[sc]||{n:0,ok:0,ev:0};a.n+=v.n;a.ok+=v.ok;a.ev+=v.ev}));
  const scRows=Object.entries(scAgg).filter(([,v])=>v.ev).map(([sc,v])=>({label:conOf(sc).name,v:v.ok/v.n,max:1,color:conOf(sc).color,dsc:sc,sub:`${v.ok} de ${v.n} compromisos`})).sort((a,b)=>a.v-b.v);
  /* causas de no cumplimiento · 30 días (registros verificados, con los filtros) */
  /* los 29 días anteriores y hoy por separado (auditoría de código 08/10, M5): dayData tiene memoria y hoy ya se calculó arriba */
  const cn={};[...dayData(Array.from({length:29},(_,k)=>addD(d,-29+k)),vsP).rows,...dRows0].forEach(r=>{if(!r.rc||r.rc.status==='ok'||!dashOk(r.sc,r.x.name))return;const k=cncKey(r.rc.cnc);cn[k]=(cn[k]||0)+1});
  const top=Object.entries(cn).sort((a,b)=>b[1]-a[1]).slice(0,6);
  /* restricciones abiertas (afectan a actividades que pasan los filtros) */
  const RS=restrInScope().filter(rOpenC).filter(r=>{const x=r.actId&&S.act.get(r.actId);if(!DB_.sc.size&&!DB_.ty)return true;if(!x)return!DB_.ty&&(!r.sc||!DB_.sc.size||DB_.sc.has(r.sc));return dashOk(x.sc,x.name)});
  const d7=addD(d,7);const rLate=RS.filter(r=>r.need&&r.need<d).length;const rNext=RS.filter(r=>{const x=S.act.get(r.actId);return x&&(x.days||[]).some(z=>z>=d&&z<=d7)}).length;
  const rBy={};RS.forEach(r=>{const k=grpOf(r)==='area'?(r.area||'Otras áreas'):'Campo';const o=rBy[k]=rBy[k]||{n:0,late:0};o.n++;if(r.need&&r.need<d)o.late++});
  const rRows=Object.entries(rBy).sort((a,b)=>b[1].n-a[1].n).map(([k,o])=>({label:k,v:o.n,sub:o.late?o.late+' vencidas':''}));
  const AV=dashAvance(cw,vsP,d);const AVall=DB_.sc.size?noSc(()=>dashAvance(cw,vsP,d)):AV;
  /* por subcontratista, hoy */
  const actAll=DB_.sc.size?noSc(()=>dashData(d)).filter(i=>!i.nova):act;
  const bySc=new Map();actAll.forEach(i=>{const o=bySc.get(i.x.sc)||{none:0,seq:0,run:0,stop:0,ok:0,no:0,n:0};o[i.st.k]++;o.n++;bySc.set(i.x.sc,o)});
  const scs=[...bySc.entries()].sort((a,b)=>b[1].n-a[1].n||conOf(a[0]).name.localeCompare(conOf(b[0]).name));
  /* --- html --- */
  const pc=v=>v==null?'—':Math.round(v*100)+'%';
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  const allSc=[...new Set([...S.act.values()].filter(x=>{const pid=pisoOfAct(x.id);return pid&&vsP.has(pid)&&(x.days||[]).some(z=>z>=addD(d,-42)&&z<=addD(d,14))}).map(x=>x.sc))].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const tys=dashTypes(d);if(DB_.ty&&!tys.some(t=>t.k===DB_.ty))DB_.ty='';
  const fil=DB_.sc.size||DB_.ty;
  const hh=`<div class="dhd"><div><b>Tablero</b><span>${dw} ${fmtD(d)} · ${nowHM()} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span></div><span class="dlive"><i></i>En vivo</span><button class="ib" data-sini title="Lo programado hoy que aún nadie marcó como iniciado o detenido: consolidado y por SC, para enviar por WhatsApp">📲 Sin iniciar · ${c.none}</button><button class="ib" id="dtv">${DB_.tv?'Salir de pantalla completa':'⤢ Pantalla completa'}</button></div>
   <div class="dflt"><button class="ib dscdd${DB_.sc.size?' on':''}" id="dscdd" aria-haspopup="menu" title="Elegir subcontratista (también puedes tocar su fila en cualquier gráfico)">Subcontratista: <b>${DB_.sc.size?(DB_.sc.size===1?esc(conOf([...DB_.sc][0]).name):DB_.sc.size+' elegidos'):'Todos'}</b> ▾</button>${[...DB_.sc].map(k=>`<button class="chip dfon" data-dscx="${k}" style="--c:${conOf(k).color}" title="Quitar"><i></i>${esc(conOf(k).name)} ×</button>`).join('')}
    <label class="dfty"><span>Tipo de actividad</span><select class="tin" id="dty"><option value="">Todas</option>${tys.map(t=>`<option value="${esc(t.k)}"${DB_.ty===t.k?' selected':''}>${esc(t.t)}</option>`).join('')}</select></label>${fil?'<button class="lnkb" data-dclr>Quitar filtros</button>':''}</div>`;
  const K=(lab,v,sub,cls,k)=>`<div class="dk${cls?' '+cls:''}"${k?` style="--k:${k}"`:''}><span class="dkl">${lab}</span><b>${v}</b>${sub?`<span class="dks">${sub}</span>`:''}</div>`;
  const sbar=o=>`<span class="dbar">${['ok','no','run','stop','seq','none'].map(k=>o[k]?`<i style="--k:${KST[k].c};flex:${o[k]}" title="${KST[k].t}: ${o[k]}"></i>`:'').join('')}</span>`;
  const kp=`<div class="dkpi">${K('Programadas hoy',act.length,`${closed} cerradas · ${c.run} en ejecución`,'','#8C959F')}
    <div class="dk dkst" style="--k:${KST.run.c}"><span class="dkl">Estado de hoy</span>${act.length?sbar(c):'<b>—</b>'}<span class="dks">${['ok','no','run','stop','none'].filter(k=>c[k]).map(k=>`${KST[k].t.toLowerCase()} ${c[k]}`).join(' · ')||'sin actividades'}</span></div>
    ${K('PPC diario hoy',pc(ppcD),dv?`${dok} de ${dv} verificadas`:'aún sin cierres','dkppc')}
    ${K('PPC semana '+cw,pc(PW&&PW.ppc),PW?`${PW.ok} de ${PW.n} compromisos${PW.ev<PW.n?` · ${PW.n-PW.ev} sin evaluar`:''}`:'semana aún sin congelar','dkppc')}
    ${K('PPC promedio 4 semanas',pc(avg4),full.length?`semanas ${full[0].w}–${full[full.length-1].w}`:'sin semanas cerradas','dkppc')}
    ${K('Restricciones abiertas',RS.length,`${rLate} vencidas · ${rNext} para los próximos 7 días`,'','#B26A00')}</div>`;
  const trend=W.length?`${linesLegend()}<div class="dsv chart">${svgLines(W.map(o=>({label:'S'+o.w,a:o.ppc,b:o.ppcSc??o.ppc,part:o.ev<o.n,sub:`${o.ok} de ${o.n} compromisos`})),{h:220})}</div>`:'<p class="mu">Aún no hay semanas congeladas.</p>';
  const g1=`<div class="dcard"><div class="dch">PPC semanal · últimas 8 semanas</div>${trend}</div>
    <div class="dcard"><div class="dch">PPC por subcontratista · 4 semanas</div>${scRows.length?`<div class="dsv chart">${svgBarsH(scRows,v=>pc(v))}</div><p class="dnote">De menor a mayor: arriba los que más incumplen.</p>`:'<p class="mu">Sin compromisos evaluados.</p>'}</div>`;
  const sc=`<div class="dcard"><div class="dch">Avance de hoy por subcontratista <span>${scs.length}</span></div><div class="dsc">${scs.map(([s,o])=>`<div class="dsr dsgo${scCls(s)}" data-dsc="${s}" title="Clic: filtrar el tablero por este SC"><span class="dsn" style="--c:${conOf(s).color}"><i></i>${esc(conOf(s).name)}</span>${sbar(o)}<span class="dsval">${o.ok+o.no}/${o.n}</span><span class="dsw">${o.stop?`⏸ ${o.stop}`:''}</span></div>`).join('')||'<p class="mu">Sin actividades programadas hoy.</p>'}</div>
    <div class="dleg">${['none','run','stop','ok','no'].map(k=>`<span style="--k:${KST[k].c}"><i></i>${KST[k].t}</span>`).join('')}</div>
    ${Object.keys(stopMot).length||later?`<div class="dmot"><b>Detenidas hoy:</b> ${Object.entries(stopMot).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="chip">${esc(k)} <b>${v}</b></span>`).join('')}${later?`<span class="chip mu">Inicia después (tren) <b>${later}</b></span>`:''}</div>`:''}</div>`;
  const avRow=(lab,o,color,sc)=>{const m=o.meta||1;return`<div class="dar${sc?' dsgo'+scCls(sc):''}"${sc?` data-dsc="${sc}" title="Clic: filtrar el tablero por este SC"`:''}><span class="dsn"${color?` style="--c:${color}"`:''}>${color?'<i></i>':''}${lab}</span><span class="davb" title="${o.real} de ${o.meta} · a hoy debía llevar ${o.esp}"><i class="dave" style="width:${Math.min(100,o.esp/m*100)}%"></i><i class="davr" style="width:${Math.min(100,o.real/m*100)}%"></i></span><span class="dsval">${o.meta?Math.round(o.real/m*100)+'%':'—'}</span><span class="dsw">${o.real}/${o.meta}</span></div>`};
  const avSc=Object.entries(AVall.sc).filter(([,v])=>v.meta).sort((a,b)=>a[1].real/a[1].meta-b[1].real/b[1].meta||conOf(a[0]).name.localeCompare(conOf(b[0]).name));
  const gav=`<div class="dcard"><div class="dch">Avance de la semana ${cw} contra lo congelado</div>${AV.meta?`<p class="dnote">Días-actividad con «Cumplido» de todos los comprometidos en la semana congelada (Parcial y No cuentan 0; vale si se cumplió otro día de la semana). La franja clara marca dónde debería estar a hoy. De menor a mayor avance.</p>
    <div class="dav">${avRow('<b>Total</b>',AV)}${avSc.map(([sc,v])=>avRow(esc(conOf(sc).name),v,conOf(sc).color,sc)).join('')}</div>${AV.extra?`<p class="dnote">Además, ${AV.extra} cumplido${AV.extra>1?'s':''} fuera de lo congelado (no suman al avance).</p>`:''}`:`<p class="mu">${AV.pis?'Sin compromisos congelados con estos filtros.':'La semana '+cw+' aún no está congelada en estos pisos.'}</p>`}</div>`;
  const g3=`<div class="dcard"><div class="dch">Causas de no cumplimiento · 30 días</div>${top.length?`<div class="dsv chart">${svgBarsH(top.map(([k,v])=>({label:k,v})),v=>String(v))}</div>`:'<p class="mu">Sin incumplimientos registrados.</p>'}</div>
    <div class="dcard"><div class="dch">Restricciones abiertas por responsable <span>${RS.length}</span></div>${rRows.length?`<div class="dsv chart">${svgBarsH(rRows,v=>String(v))}</div>`:'<p class="mu">No hay restricciones abiertas.</p>'}</div>`;
  const pls=visPisos().filter(p=>items.some(i=>i.pid===p.id));if(!pls.some(p=>p.id===DB_.pid))DB_.pid=(pls.find(p=>API&&[...API.zonedSet(p.id)].length)||pls[0]||{}).id||'';
  if(!main.dataset.built){main.innerHTML=`<div class="dash"><div id="dtop"></div><div id="dkp"></div><div class="dgrid2" id="dg1"></div><div id="dav"></div><div class="dgrid2"><div id="dsc"></div><div class="dcard dplanc"><div class="dch">Plano en vivo <span class="dpch" id="dpch"></span></div><p class="dnote">Toca un ambiente para ver su información.</p><div class="dplanw"><div class="kplan" id="dplan"></div></div></div></div><div class="dgrid2" id="dg3"></div></div>`;main.dataset.built='1';main.onclick=dashClick;main.onchange=e=>{if(e.target.id==='dty'){DB_.ty=e.target.value;dashRe()}}}
  const put=(id,html)=>{const el=$('#'+id,main);if(el&&el.dataset.h!==html){el.innerHTML=html;el.dataset.h=html}};
  put('dtop',hh);put('dkp',kp);put('dg1',g1);put('dav',gav);put('dsc',sc);put('dg3',g3);
  put('dpch',pls.map(p=>`<button class="${DB_.pid===p.id?'on':''}" data-dp="${p.id}">${esc(p.code)}</button>`).join(''));
  if(API&&DB_.pid){const its=items.filter(i=>i.pid===DB_.pid&&!i.nova);const colors=new Map(its.map(i=>[i.x.id,KST[i.st.k].c]));API.capPlan($('#dplan',main),{pid:DB_.pid,colors,nums:API.nums(DB_.pid),bs:28,fitAll:true,onPick:aid=>dashPop(aid,d)})}
  document.body.classList.toggle('dash-tv',DB_.tv)}
/* menú discreto de SC (los que tienen algo en los pisos a la vista: lookahead reciente o matriz) */
function dashScMenu(btn){const vs=new Set(visPisos().map(p=>p.id));const d=todayIso();const set=new Set([...S.act.values()].filter(x=>{const pid=pisoOfAct(x.id);return x.sc&&pid&&vs.has(pid)&&(x.days||[]).some(z=>z>=addD(d,-42)&&z<=addD(d,14))}).map(x=>x.sc));
  if(MX&&MX.cat)for(const c of MX.cat.values())if(!c.arch&&c.sc)set.add(c.sc);
  const L=[...set].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const draw=()=>openPop(btn,`<div class="ph">Subcontratista</div><div class="ptx mu">Clic: solo ese · Ctrl+clic: sumar o quitar</div><input class="tin" id="dscq" placeholder="Buscar…" style="margin:0 10px 6px;width:calc(100% - 20px)"><div class="mxscl" id="dscl"><button data-dsk=""${DB_.sc.size?'':' class="on"'}>Todos</button>${L.map(k=>`<button data-dsk="${k}"${DB_.sc.has(k)?' class="on"':''} style="--c:${conOf(k).color}"><i></i>${esc(conOf(k).name)}${DB_.sc.has(k)?' ✓':''}</button>`).join('')}</div>`,{});
  draw();const P_=$('#pop');if(!P_)return;const q=$('#dscq');if(q){q.focus();q.oninput=()=>{const v=q.value.toLowerCase();P_.querySelectorAll('[data-dsk]').forEach(b=>{b.hidden=!!b.dataset.dsk&&!b.textContent.toLowerCase().includes(v)})}}
  P_.onclick=e=>{const b=e.target.closest('[data-dsk]');if(!b)return;const v=b.dataset.dsk;const add=e.ctrlKey||e.metaKey||e.shiftKey;
    if(!v)DB_.sc.clear();else if(add){if(DB_.sc.has(v))DB_.sc.delete(v);else DB_.sc.add(v)}else if(DB_.sc.size===1&&DB_.sc.has(v))DB_.sc.clear();else DB_.sc=new Set([v]);
    if(!add)closePop();dashRe();if(add){const nb=$('#dscdd');if(nb)dashScMenu(nb)}}}
function dashRe(){const h=$('#dplan');if(h)h._fk='';render()}
/* ficha del ambiente en el Tablero: solo información (nada se registra desde aquí) */
function dashPop(aid,d){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);const s=kState(d,aid);const rs=restrPend(aid);const lv=liveOf(d,aid);
  const wk=weekDays(weekOf(d));const dd=(x.days||[]).filter(z=>wk.includes(z)).sort();const rc=recOf(d,aid);const lib=typeof libOf==='function'?libOf(aid):null;
  const others=[...S.act.values()].filter(y=>y.ambId===x.ambId&&y.id!==aid&&schedOrSnap(y,d));
  const row=(k,v)=>v?`<div class="dpr"><span>${k}</span><b>${v}</b></div>`:'';
  const h=`<div class="ksc"><div class="ksh"><i class="kn" style="--k:${KST[s.k].c}">${(window.__plano?.nums(pisoOfAct(aid)).get(aid))||'·'}</i><div><b>${esc(x.name)}</b><span>${esc(a?a.code+' · '+a.name:'')} · ${esc(S.pis.get(pisoOfAct(aid))?.name||'')}</span><span>${esc(conOf(x.sc).name)}</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    <div class="kst" style="--k:${KST[s.k].c}">${esc(kText(d,aid))}</div>${liveLine(d,aid)}${actPhotos(d,aid)}
    <div class="dpinfo">${row('Días esta semana',dd.map(z=>fmtD(z)).join(', '))}${row('Metrado hoy',x.qty&&x.qty[d]!=null?esc(String(x.qty[d]))+' '+esc(x.und||''):'')}${row('Comentario de cierre',esc(rc&&rc.note||lv&&lv.close&&lv.close.note||''))}${row('Liberación de calidad',lib?esc(({sol:'Solicitada',pro:'Programada',obs:'Observada',lev:'Levantada',lib:'Liberada'})[lib.st]||lib.st):'')}${row('Reportó',esc(lv&&lv.log&&lv.log.length?(lv.log[lv.log.length-1].n||'')+' · '+hhmm(lv.log[lv.log.length-1].t):''))}</div>
    ${rs.map(r=>`<div class="rsk">⚠ Restricción pendiente · ${esc(rTxt(r))}</div>`).join('')}
    ${others.length?`<div class="ksl">También hoy en este ambiente</div>${others.map(y=>{const k=kState(d,y.id).k;return`<div class="dpo" style="--k:${KST[k].c}"><i></i>${esc(y.name)} · <span class="mu">${esc(conOf(y.sc).name)} · ${KST[k].t}</span></div>`}).join('')}`:''}</div>`;
  /* una sola ficha: un toque puede llegar dos veces (toque + clic) y quedaban dos fichas encimadas que había que cerrar dos veces */
  document.querySelectorAll('#dpsheet').forEach(o=>o.remove());
  const lb=document.createElement('div');lb.className='ksheet';lb.id='dpsheet';lb.innerHTML=h;const t0=NOW();
  lb.onclick=e=>{{const im=e.target.closest('.kphs img[data-ph]');if(im){if(im.src&&im.src.startsWith('data:')&&typeof lightbox==='function')lightbox(im.src);return}}if(e.target===lb&&NOW()-t0<400)return;if(e.target===lb||e.target.closest('[data-kx]'))lb.remove()};document.body.appendChild(lb)}
function dashClick(e){const t=e.target;let b;
  if(t.closest('#dtv')){DB_.tv=!DB_.tv;try{if(DB_.tv)document.documentElement.requestFullscreen().catch(()=>{});else if(document.fullscreenElement)document.exitFullscreen()}catch(err){}const m=$('#main');m.dataset.built='';render();return}
  if((b=t.closest('[data-dp]'))){DB_.pid=b.dataset.dp;const h=$('#dplan');if(h)h._fk='';render();return}
  if((b=t.closest('[data-dsc]'))){const v=b.dataset.dsc;if(!v)DB_.sc.clear();else if(e.ctrlKey||e.metaKey||e.shiftKey){if(DB_.sc.has(v))DB_.sc.delete(v);else DB_.sc.add(v)}else if(DB_.sc.size===1&&DB_.sc.has(v))DB_.sc.clear();else DB_.sc=new Set([v]);dashRe();return}
  if((b=t.closest('[data-dscx]'))){DB_.sc.delete(b.dataset.dscx);dashRe();return}
  if((b=t.closest('#dscdd'))){dashScMenu(b);return}
  if(t.closest('[data-sini]')){sinIniOpen();return}
  if(t.closest('[data-dclr]')){DB_.sc.clear();DB_.ty='';dashRe();return}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-lqact]');if(!b)return;e.stopPropagation();const l=libOf(b.dataset.lqact);if(l)libDetail(l.id);else libAsk(b.dataset.lqact)},true);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&DB_.tv&&U.tab==='dash'){DB_.tv=false;const m=$('#main');m.dataset.built='';render()}});

