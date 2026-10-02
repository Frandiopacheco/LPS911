"use strict";
/* LPS 911 · Capataces en vivo (iniciar / detener / cerrar) y Tablero en vivo.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 26 · Capataces: estado en vivo (iniciar / detener / cerrar) y confirmación
   ===================================================================== */
const KST={none:{t:'Sin iniciar',c:'#8C959F'},run:{t:'En ejecución',c:'#1565C0'},stop:{t:'Detenida',c:'#EF6C00'},ok:{t:'Cumplido',c:'#2E7D4F'},no:{t:'No cumplido',c:'#C62828'}};
const liveOf=(d,aid)=>LIVE.get(d+'_'+aid)||null;
function kState(d,aid){const r=recReal(d,aid);if(r)return{k:r.status==='ok'?'ok':'no',conf:true,r};const lv=liveOf(d,aid);
  if(lv&&lv.close&&lv.close.status)return{k:lv.close.status,conf:false,lv};if(lv&&lv.st)return{k:lv.st,lv};return{k:'none',lv}}
function kText(d,aid){const s=kState(d,aid);const lv=s.lv||liveOf(d,aid);let t='';
  if(s.conf)t=`${s.k==='ok'?'✓ Cumplido':'✗ No cumplido'}${s.r.cnc?' · '+s.r.cnc:''} · confirmado`;
  else if(s.k==='ok'||s.k==='no')t=`${s.k==='ok'?'✓ Cumplido':'✗ No cumplido'}${lv.close.cnc?' · '+lv.close.cnc:''} · por confirmar`;
  else if(s.k==='run')t=`▶ En ejecución desde ${hhmm(lv.t0||lv.log?.[0]?.t)}`;
  else if(s.k==='stop')t=`⏸ Detenida${lv.mot?': '+lv.mot:''}`;
  else t='Sin iniciar';
  return t+(lv&&lv._pend?' · ⏳ sin enviar':'')}
function liveLine(d,aid){const lv=liveOf(d,aid);if(!lv||!(lv.log||[]).length)return'';const L=lv.log.slice(-3);
  const w={run:'▶ Inició',res:'▶ Reanudó',stop:'⏸ Detuvo',close:'Cerró'};
  return`<div class="clive">${L.map(e=>`<span>${hhmm(e.t)} ${w[e.s]||e.s}${e.s==='stop'&&e.m?' ('+esc(e.m)+')':''}${e.s==='close'?' '+(e.m==='ok'?'✓':'✗'):''} · ${esc((e.n||'').split(' ')[0])}</span>`).join('')}${lv._pend?'<span>⏳ sin enviar</span>':''}</div>`}
function liveWrite(d,aid,patch,ev,extra){const x=S.act.get(aid);if(!x||!db)return;const id=d+'_'+aid;const cur=LIVE.get(id)||{};
  const e={...ev,t:NOW(),by:me.email,n:me.name||''};
  const doc={date:d,actId:aid,pisoId:pisoOfAct(aid),sc:x.sc,...patch,log:[...(cur.log||[]),e].slice(-40),...(extra||{})};
  LIVE.set(id,{...cur,...doc,id,_pend:true});const FVs=firebase.firestore.FieldValue;if(FVs&&FVs.serverTimestamp)doc.sat=FVs.serverTimestamp();doneRebuild();requestRender();
  fcol('live').doc(id).set(doc,{merge:true}).catch(err=>toast('No se pudo guardar: '+(err&&err.code==='permission-denied'?'sin permiso (¿se publicaron las reglas nuevas?)':(err&&(err.code||err.message)))))}
/* lo que el capataz propuso y nadie confirmó en 2 días queda registrado tal cual */
const autoDone=new Set();
function autoAccept(){if(!canDaily||!db)return;const lim=addD(todayIso(),-2);
  for(const lv of LIVE.values()){const c=lv.close;if(!c||!c.status||lv.date>lim||autoDone.has(lv.id)||lv._pend)continue;autoDone.add(lv.id);if(recReal(lv.date,lv.actId))continue;const x=S.act.get(lv.actId);if(!x)continue;
    writeDaily(lv.date,lv.pisoId,{recs:{[lv.actId]:{...baseRec(lv.date,x,null),status:c.status,cnc:c.cnc||'',note:c.note||'',done:!!c.done,photos:lv.photos||[],prop:{status:c.status,cnc:c.cnc||'',by:c.by,byName:c.n,ts:c.t},auto:true,by:c.by||'',byName:c.n||'',ts:c.t||NOW()}}})}}
function confirmProp(d,aid){const x=S.act.get(aid);const cur=recOf(d,aid);if(!x||!cur||!cur._prop)return;writeDaily(d,pisoOfAct(aid),{recs:{[aid]:{...baseRec(d,x,cur),status:cur.status}}})}

/* ---------- pantalla del capataz ---------- */
const CP=(()=>{try{return JSON.parse(localStorage.getItem('lps.cap')||'{}')||{}}catch(e){return{}}})();
const saveCP=()=>{try{localStorage.setItem('lps.cap',JSON.stringify(CP))}catch(e){}};
let KS=null;
function loadPlanoMod(){if(window.__plano&&window.__plano.capPlan)return Promise.resolve();
  if(!planoP){planoP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PLANO_SRC;s.onload=ok;s.onerror=()=>{planoP=null;ko()};document.head.appendChild(s)})}
  return planoP.then(()=>{if(U.tab==='cap'||U.tab==='mapa'||U.tab==='dash'||U.tab==='campo'||U.tab==='planos'){const m=$('#main');if(U.tab==='mapa')m.dataset.built='';requestRender()}})}
const ENG=()=>!!me&&me.role!=='capataz'&&!!canDaily;
function capItems(d){const E=ENG()||VEED();const vs=new Set(visPisos().map(p=>p.id));const my=new Set(E?[...S.con.keys()]:(me&&me.scs||[]));const API=window.__plano;const nv=API&&API.novaSet?API.novaSet(d):new Set();
  return[...S.act.values()].filter(x=>my.has(x.sc)&&schedOn(x,d)&&!nv.has(x.id)).map(x=>{const a=S.amb.get(x.ambId);const s=a&&S.sec.get(a.sectorId);return{x,a,s,pid:pisoOfAct(x.id)}})
    .filter(o=>o.a&&o.s&&o.pid&&(!E||vs.has(o.pid))).sort((p,q)=>(p.s.order||0)-(q.s.order||0)||(p.a.order||0)-(q.a.order||0)||(p.x.order||0)-(q.x.order||0))}
function capPend(d){if(ENG()||VEED()||SCK())return[];const my=me&&me.scs||[];return[...LIVE.values()].filter(l=>l.date<d&&l.date>=addD(d,-7)&&my.includes(l.sc)&&l.st&&!(l.close&&l.close.status)&&!recReal(l.date,l.actId)&&S.act.has(l.actId)).sort((a,b)=>a.date.localeCompare(b.date))}
function kCard(d,o,n,pend){const aid=o.x.id;const s=kState(d,aid);const E=ENG()||VEED();const q=VEED()?'':E?(s.conf?'':(s.k==='ok'||s.k==='no')?'conf':'closef'):SCK()?(d<todayIso()||s.conf?'':s.k==='none'?'run':s.k==='stop'?'res':''):d<todayIso()?'closef':s.conf?'':s.k==='none'?'run':s.k==='run'?'closef':s.k==='stop'?'res':'';
  const ql={run:liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'▶ Continúa':'▶ Iniciar',res:'▶ Reanudar',closef:E?'Verificar':'Cerrar día',conf:'✓ Confirmar'}[q]||'';
  return`<article class="kc k-${s.k}${s.conf?' conf':''}" data-k="${aid}" data-d="${d}" style="--k:${KST[s.k].c}"><i class="kn">${n||'·'}</i><div class="kt"><b>${esc(o.x.name)}</b><span>${esc(o.a.code)} · ${esc(o.a.name)}${pend?' · '+fmtD(d):''}${E||(me.scs||[]).length>1?' · '+esc(conOf(o.x.sc).name):''}</span><em>${esc(kText(d,aid))}</em></div>${q?`<button class="kgo" data-kq="${q}">${ql}</button>`:s.conf?'<span class="kok">✓</span>':''}</article>`}
function renderCap(main){const E=ENG()||VEED();const NPon=canNP();const d=E?campoDate():todayIso();ensureDaily(addD(d,-7));const API=window.__plano&&window.__plano.capPlan?window.__plano:null;if(!API)loadPlanoMod().catch(()=>{});else API.capInit(d);
  if(CP.v!=='plan'&&CP.v!=='list')CP.v='plan';const V=E?'plan':CP.v;
  const all=capItems(d);const my=E?[...new Set(all.map(o=>o.x.sc))].sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name)):(me.scs||[]);if(CP.sc&&!my.includes(CP.sc))CP.sc='';const allF=all.filter(o=>!CP.sc||o.x.sc===CP.sc);const byP=new Map();allF.forEach(o=>{if(!byP.has(o.pid))byP.set(o.pid,[]);byP.get(o.pid).push(o)});
  /* quien recorre la obra ve todos los pisos (también los que hoy no tienen nada programado: ahí se registra lo no programado) */
  const ps=E&&NPon?visPisos():pisos().filter(p=>byP.has(p.id));if((!E&&CP.pud!==d)||!ps.some(p=>p.id===CP.pid)){const zp=API?ps.find(p=>{const z=API.zonedSet(p.id);return(byP.get(p.id)||[]).some(o=>z.has(o.x.id))}):null;CP.pid=((zp||ps.find(p=>byP.has(p.id))||ps[0])||{}).id||''}
  const items=byP.get(CP.pid)||[];const nums=API?API.nums(CP.pid):new Map();const zoned=API?API.zonedSet(CP.pid):new Set();
  const cnt={none:0,run:0,stop:0,ok:0,no:0};allF.forEach(o=>cnt[kState(d,o.x.id).k]++);const pend=capPend(d).filter(l=>!CP.sc||l.sc===CP.sc);
  if(!main.dataset.built){main.innerHTML=`<div class="kap"><div class="khd" id="khd"></div><div class="kbody"><div class="kplanw" id="kplanw"><div class="kplan" id="kplan"></div></div><div id="klist"></div></div></div>`;main.dataset.built='1';main.onclick=capClick}
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  let hh=E?`<div class="khi"><div><b>Campo</b><span>${dw} ${fmtD(d)}${d===todayIso()?' · hoy':''} · ${my.length} partida${my.length===1?'':'s'}</span></div><button class="ib" data-kd="-1" aria-label="Día anterior">&#8249;</button>${d!==todayIso()?'<button class="ib" data-kd="0">Hoy</button>':''}<button class="ib" data-kd="1" aria-label="Día siguiente">&#8250;</button></div>`:`<div class="khi"><div><b>Hola, ${esc((me.name||'').split(' ')[0]||(SCK()?'':'capataz'))}</b><span>${dw} ${fmtD(d)} · ${esc(my.map(c=>conOf(c).name).join(', '))}</span></div>${SCK()?'':'<button class="ib" data-kmenu aria-label="Menú">⋯</button>'}</div>`;
  if(my.length>1)hh+=`<div class="kchips"><button class="${!CP.sc?'on':''}" data-ksc="">Todas</button>${my.map(c=>`<button class="${CP.sc===c?'on':''}" data-ksc="${c}" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}</div>`;
  if(ps.length)hh+=`<div class="kchips">${ps.map(p=>`<button class="${CP.pid===p.id?'on':''}" data-kp="${p.id}">${esc(p.code)} · ${esc(p.name)} <b>${(byP.get(p.id)||[]).length}</b>${NPon&&npItems([d],new Set([p.id])).length?`<b class="knp" title="Trabajo no programado registrado">+${npItems([d],new Set([p.id])).length}</b>`:''}</button>`).join('')}</div>`;
  hh+=`<div class="ktog">${E?'<span class="seg"><button data-kv="list">Tarjetas</button><button class="on" data-kv="plan">Plano</button></span>':`<span class="seg"><button class="${CP.v==='plan'?'on':''}" data-kv="plan">Plano</button><button class="${CP.v==='list'?'on':''}" data-kv="list">Tarjetas</button></span>`}<span class="kcnt">${['none','run','stop','ok','no'].map(k=>cnt[k]?`<span style="--k:${KST[k].c}"><i></i>${cnt[k]}</span>`:'').join('')}</span></div>`;
  const khd=$('#khd',main);if(khd.dataset.h!==hh){khd.innerHTML=hh;khd.dataset.h=hh}
  const npOn=NPon&&E&&!!CP.pid&&d<=todayIso();const pw=$('#kplanw',main);pw.hidden=V!=='plan'||(!items.length&&!npOn);
  if(V==='plan'&&(items.length||npOn)&&API){const colors=new Map(items.map(o=>[o.x.id,KST[kState(d,o.x.id).k].c]));API.capPlan($('#kplan',main),{empty:npOn?'Usa el botón <b>+ No programado</b>.':'Usa la vista <b>Tarjetas</b>.',pid:CP.pid,colors,nums,bs:E&&items.length>8?30:40,onPick:(aid,z,pt)=>{capSheet(aid,d,'main');if(KS)KS.pt=pt||null},
    marks:npOn?npMarks(d,CP.pid):null,onEmpty:npOn?pt=>npNew({d,pid:CP.pid,pt}):null,onMark:id=>npOpen(id)})}
  let lh='';
  if(liveErr)lh+=`<div class="callout">No se pudo leer el avance (${esc(liveErr)}). Avisa al administrador: faltan las reglas nuevas de Firestore.</div>`;
  if(pend.length)lh+=`<div class="ksec warn">Pendientes de cerrar (${pend.length})</div>${pend.map(l=>{const x=S.act.get(l.actId);const a=S.amb.get(x.ambId);return kCard(l.date,{x,a},null,true)}).join('')}`;
  if(npErr&&npOn)lh+=`<div class="callout">No se pudo leer el trabajo no programado (${esc(npErr)}). Faltan las reglas nuevas de Firestore.</div>`;
  if(npOn)lh+=`<div class="knpbar"><button class="kbig ghost knpadd" data-knp>＋ No programado</button><span class="knote">${items.length?'Toca un número para '+(VEED()?'ver':'verificar')+' · toca un lugar vacío del plano para registrar lo que se ejecuta sin estar programado.':'Toca en el plano el lugar donde ves trabajando a una cuadrilla.'}</span></div>`;
  if(!all.length&&!npOn)lh+=`<div class="kemp">${nwReason(d)?esc(nwReason(d))+': día no laborable, no hay actividades programadas.':(E?'No hay actividades programadas este día.':'No tienes actividades programadas para hoy.')}</div>`;
  else if(V==='plan'){const un=items.filter(o=>!zoned.has(o.x.id));
    lh+=`<div class="kleg">${['none','run','stop','ok','no'].map(k=>`<span style="--k:${KST[k].c}"><i></i>${KST[k].t}</span>`).join('')}${npOn?'<span class="knpl"><i>+</i>No programado</span>':''}</div>${npOn?'':`<p class="knote">Toca un número para ${E?'verificar':SCK()?'iniciar o detener':'reportar'}.</p>`}`;
    if(un.length)lh+=`<div class="ksec">Sin ubicar en el plano (${un.length})</div>${un.map(o=>kCard(d,o,nums.get(o.x.id))).join('')}`}
  else lh+=items.map(o=>kCard(d,o,nums.get(o.x.id))).join('');
  if(npOn)lh+=npListHtml(d,new Set([CP.pid]),i=>!CP.sc||i.e.sc===CP.sc);
  const kl=$('#klist',main);if(kl.dataset.h!==lh){kl.innerHTML=lh;kl.dataset.h=lh}
  if(KS&&$('#ksheet'))capSheet(KS.aid,KS.d,KS.mode,true)}
function capClick(e){const t=e.target;let b;
  if((b=t.closest('[data-ksc]'))){CP.sc=b.dataset.ksc;saveCP();render();return}
  if((b=t.closest('[data-kp]'))){CP.pid=b.dataset.kp;CP.pud=todayIso();saveCP();render();return}
  if((ENG()||VEED())&&(b=t.closest('[data-kv]'))){if(b.dataset.kv==='list'){CU.view='list';saveCU();$('#main').dataset.built='';kClose();render()}return}
  if(t.closest('[data-knp]')){npNew({d:campoDate(),pid:CP.pid});return}
  if((b=t.closest('[data-kd]'))){const v=+b.dataset.kd;CU.date=v===0?null:shiftDay(campoDate(),v);if(CU.date===todayIso())CU.date=null;const kp=$('#kplan');if(kp)kp._fk='';render();return}
  if((b=t.closest('[data-kv]'))){CP.v=b.dataset.kv;saveCP();const kp=$('#kplan');if(kp)kp._fk='';render();return}
  if((b=t.closest('[data-kmenu]'))){openPop(b,`<div class="ph">${esc(me.name||'')}</div><div class="ptx">Capataz · ${esc((me.scs||[]).map(c=>conOf(c).name).join(', '))}</div><button data-do="name">Cambiar mi nombre…</button><button data-do="rl">Actualizar</button><hr><button data-do="out" class="danger">Salir de este celular…</button>`,{
    rl:()=>location.reload(),
    name:()=>{const v=prompt('Tu nombre y apellido',me.name||'');if(v&&v.trim()&&db)fcol('members').doc(me.email).update({name:v.trim().slice(0,60)}).then(()=>toast('Nombre actualizado')).catch(err=>toast('No se pudo: '+(err.code||err.message)))},
    out:()=>{if(confirm('Si sales, para volver a entrar necesitarás un enlace nuevo del ingeniero. ¿Salir?'))$('#blogout').click()}});return}
  const card=t.closest('article[data-k]');if(!card)return;const aid=card.dataset.k,d=card.dataset.d;
  const q=t.closest('[data-kq]');if(q){const k=q.dataset.kq;if(k==='run'||k==='res'){kAct(aid,d,k)}else if(k==='conf'){confirmProp(d,aid);toast('Confirmado')}else capSheet(aid,d,'close');return}
  capSheet(aid,d,'main')}
function kAct(aid,d,k){const lv=liveOf(d,aid);if(k==='run'||k==='res'){liveWrite(d,aid,{st:'run',t0:lv&&lv.t0||NOW(),mot:''},{s:lv&&lv.st==='stop'?'res':'run'});toast(lv&&lv.st==='stop'?'Reanudada':'Iniciada')}}
function capSheet(aid,d,mode,keep){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);
  if(!keep||!KS||KS.aid!==aid||KS.d!==d)KS={aid,d,mode,cs:'',cnc:'',mot:'',note:'',done:false};KS.mode=mode;
  const s=kState(d,aid);const lv=liveOf(d,aid);const nums=window.__plano&&window.__plano.nums?window.__plano.nums(pisoOfAct(aid)):new Map();const n=nums.get(aid);const past=d<todayIso();
  const E=ENG();if(mode==='close'&&!keep){if(E){const r=recOf(d,aid);if(r){KS.cs=r.status==='partial'?'no':r.status;KS.cnc=r.cnc||'';KS.note=r.note||'';KS.done=!!r.done}}else if(lv&&lv.close){KS.cs=lv.close.status||'';KS.cnc=lv.close.cnc||'';KS.note=lv.close.note||'';KS.done=!!lv.close.done}}
  const cnc=P().cnc||[];const later=(x.days||[]).filter(y=>y>d).length;
  let h=`<div class="ksh"><i class="kn" style="--k:${KST[s.k].c}">${n||'·'}</i><div><b>${esc(x.name)}</b><span>${esc(a?a.code+' · '+a.name:'')} · ${esc(S.pis.get(pisoOfAct(aid))?.name||'')}</span><span>${esc(conOf(x.sc).name)}${past?' · <b>'+fmtD(d)+'</b>':''}</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    <div class="kst" style="--k:${KST[s.k].c}">${esc(kText(d,aid))}</div>${liveLine(d,aid)}`;
  if(mode==='stop'){h+=`<div class="ksl">¿Por qué se detuvo?</div><div class="kchips kw">${cnc.map(c=>`<button class="${KS.mot===c?'on':''}" data-kmot="${esc(c)}">${esc(c)}</button>`).join('')}${cnc.some(c=>/^otro/i.test(c))?'':`<button class="${KS.mot==='Otro'?'on':''}" data-kmot="Otro">Otro</button>`}</div>
      <input class="kin" id="kmott" placeholder="Detalle (opcional)" value="${esc(KS.note)}"><label class="kph">📷 Foto (opcional)<input type="file" accept="image/*" capture="environment" id="kphoto" hidden></label><span class="knote" id="kphn"></span>
      <div class="kbtns"><button class="kbig warn" data-ka="stopsave">⏸ Guardar detención</button><button class="kbig ghost" data-ka="back">Volver</button></div>`}
  else if(mode==='close'){h+=`<div class="ksl">¿Se cumplió lo programado para ${past?'ese día':'hoy'}?</div><div class="kbtns two"><button class="kbig ok${KS.cs==='ok'?' on':''}" data-kcs="ok">✓ Cumplido</button><button class="kbig no${KS.cs==='no'?' on':''}" data-kcs="no">✗ No cumplido</button></div>
      ${KS.cs==='no'?`<div class="ksl">Causa</div><div class="kchips kw">${cnc.map(c=>`<button class="${KS.cnc===c?'on':''}" data-kcnc="${esc(c)}">${esc(c)}</button>`).join('')}</div>`:''}
      ${KS.cs==='ok'&&later?`<label class="kchk"><input type="checkbox" id="kdone"${KS.done?' checked':''}> La actividad quedó <b>terminada</b> (no volverá los ${later} día${later>1?'s':''} que faltan)</label>`:''}
      <input class="kin" id="knote" placeholder="Comentario (opcional)" value="${esc(KS.note)}">
      <div class="kbtns"><button class="kbig pri" data-ka="closesave"${KS.cs&&(KS.cs==='ok'||KS.cnc)?'':' disabled'}>${E?'Guardar verificación':'Enviar cierre'}</button><button class="kbig ghost" data-ka="back">Volver</button></div><p class="knote">${E?'Queda registrado como verificado por ti (cuenta para el PPC).':'El ingeniero de campo lo revisará y confirmará.'}</p>`}
  else if(VEED()){const r=recOf(d,aid);h+=`<p class="knote">${r?`Verificado por ${esc(r.byName||'')} · ${hhmm(r.ts)}`:'El avance lo verifica el ingeniero de campo.'}</p><div class="kbtns"><button class="kbig ghost" data-kx>Cerrar</button></div>`}
  else if(E){const r=recOf(d,aid);const live=d===todayIso()&&!s.conf&&!(s.k==='ok'||s.k==='no');
    if(s.conf)h+=`<p class="knote">Verificado por ${esc(r&&r.byName||'')} · ${hhmm(r&&r.ts)}${r&&r.prop&&r.prop.status!==r.status?' · el capataz había marcado '+(r.prop.status==='ok'?'✓':'✗'):''}</p><div class="kbtns"><button class="kbig ghost" data-ka="closef">Cambiar verificación</button></div>`;
    else if(r&&r._prop)h+=`<p class="knote">Propuesto por <b>${esc(r.byName||'el capataz')}</b> · ${hhmm(r.ts)}</p><div class="kbtns"><button class="kbig pri" data-ka="confp">✓ Confirmar lo propuesto</button><button class="kbig ghost" data-ka="closef">Corregir…</button></div>`;
    else h+=`<div class="kbtns"><button class="kbig pri" data-ka="closef">✓ Verificar cumplimiento…</button>${live?(s.k==='none'?'<button class="kbig run" data-ka="run">▶ Marcar iniciada</button><button class="kbig warn" data-ka="stopf">⏸ No se pudo iniciar…</button>':s.k==='run'?'<button class="kbig warn" data-ka="stopf">⏸ Marcar detenida…</button>':'<button class="kbig run" data-ka="res">▶ Marcar reanudada</button>'):''}</div>`}
  else if(SCK()){if(s.conf)h+=`<p class="knote">El ingeniero ya confirmó este registro.</p>`;
    else if(past)h+=`<p class="knote">Solo puedes marcar el avance del día de hoy.</p>`;
    else if(s.k==='ok'||s.k==='no')h+=`<p class="knote">El día ya fue cerrado por el capataz o el ingeniero.</p>`;
    else if(s.k==='none')h+=`<div class="kbtns"><button class="kbig run" data-ka="run">▶ ${liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'Continúa hoy':'Iniciar'}</button><button class="kbig warn" data-ka="stopf">⏸ No se pudo iniciar…</button></div>`;
    else if(s.k==='run')h+=`<div class="kbtns"><button class="kbig warn" data-ka="stopf">⏸ Detener…</button></div>`;
    else if(s.k==='stop')h+=`<div class="kbtns"><button class="kbig run" data-ka="res">▶ Reanudar</button></div>`;
    h+=`<p class="knote">El cierre del día (cumplido / no cumplido) lo hace el capataz o el ingeniero de campo.</p>`}
  else{if(s.conf)h+=`<p class="knote">El ingeniero ya confirmó este registro.</p>`;
    else if(past)h+=`<div class="kbtns"><button class="kbig pri" data-ka="closef">Cerrar ${fmtD(d)}</button></div>`;
    else if(s.k==='none')h+=`<div class="kbtns"><button class="kbig run" data-ka="run">▶ ${liveOf(addD(d,-1),aid)&&!(liveOf(addD(d,-1),aid).close?.done)?'Continúa hoy':'Iniciar'}</button><button class="kbig warn" data-ka="stopf">⏸ No se pudo iniciar…</button><button class="kbig ghost" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='run')h+=`<div class="kbtns"><button class="kbig warn" data-ka="stopf">⏸ Detener…</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    else if(s.k==='stop')h+=`<div class="kbtns"><button class="kbig run" data-ka="res">▶ Reanudar</button><button class="kbig pri" data-ka="closef">Cerrar el día…</button></div>`;
    else h+=`<div class="kbtns"><button class="kbig ghost" data-ka="closef">Cambiar cierre</button></div>`}
  if(typeof canNP==='function'&&canNP()&&(ENG()||VEED())&&d<=todayIso())h+=`<button class="kbig ghost knpadd" data-ka="np">＋ Otro trabajo aquí (no programado)</button>`;
  let sh=$('#ksheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='ksheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);
    sh._open=NOW();sh.onclick=kSheetClick;sh.onchange=kSheetChange;sh.oninput=e=>{if(e.target.id==='knote'||e.target.id==='kmott')KS.note=e.target.value}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}
function kClose(){const sh=$('#ksheet');if(sh)sh.remove();KS=null}
async function kSheetChange(e){const t=e.target;if(t.id==='kdone'){KS.done=t.checked;return}
  if(t.id==='kphoto'&&t.files[0]){const f=t.files[0];t.value='';try{$('#kphn').textContent='Comprimiendo foto…';KS.photo=await shrinkPhoto(f);$('#kphn').textContent=`Foto lista (${Math.round(KS.photo.length*.75/1024)} KB)`}catch(err){toast(err.message)}}}
function kSheetClick(e){const t=e.target;const sh=$('#ksheet');if(t===sh&&NOW()-(sh._open||0)<600)return;if(t===sh||t.closest('[data-kx]')){kClose();return}if(!KS)return;const{aid,d}=KS;let b;
  if((b=t.closest('[data-kmot]'))){KS.mot=b.dataset.kmot;capSheet(aid,d,'stop',true);return}
  if((b=t.closest('[data-kcs]'))){KS.cs=b.dataset.kcs;if(KS.cs==='ok')KS.cnc='';capSheet(aid,d,'close',true);return}
  if((b=t.closest('[data-kcnc]'))){KS.cnc=b.dataset.kcnc;capSheet(aid,d,'close',true);return}
  if(!(b=t.closest('[data-ka]')))return;const k=b.dataset.ka;
  if(k==='np'){const x=S.act.get(aid);const pt=KS.pt||null;kClose();if(x)npNew({d,pid:pisoOfAct(aid),ambId:x.ambId,pt});return}
  if(k==='back'){capSheet(aid,d,'main',true);return}
  if(k==='stopf'){KS.note='';capSheet(aid,d,'stop',true);return}
  if(k==='closef'){if(SCK())return;capSheet(aid,d,'close');return}
  if(k==='run'||k==='res'){kAct(aid,d,k);kClose();return}
  if(k==='stopsave'){const mot=KS.mot||'';if(!mot){toast('Elige el motivo.');return}
    const lv=liveOf(d,aid);let extra=null;
    if(KS.photo&&db){const fid=uid('f');FOTO.set(fid,KS.photo);fcol('fotos').doc(fid).set({data:KS.photo,date:d,pisoId:pisoOfAct(aid),actId:aid,by:me.email,ts:NOW(),live:true}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));extra={photos:[...(lv&&lv.photos||[]),fid]}}
    liveWrite(d,aid,{st:'stop',mot:mot+(KS.note.trim()?' — '+KS.note.trim():''),t0:lv&&lv.t0||null},{s:'stop',m:mot},extra);toast('Detención registrada');kClose();return}
  if(k==='confp'){confirmProp(d,aid);toast('Confirmado');kClose();return}
  if(k==='closesave'&&ENG()){if(!KS.cs||(KS.cs==='no'&&!KS.cnc)){toast(KS.cs?'Elige la causa.':'Elige Cumplido o No cumplido.');return}const x=S.act.get(aid);const cur=recOf(d,aid);
    writeDaily(d,pisoOfAct(aid),{recs:{[aid]:{...baseRec(d,x,cur),status:KS.cs,cnc:KS.cs==='no'?KS.cnc:'',imp:null,note:KS.note.trim(),done:KS.cs==='ok'&&!!KS.done,photos:(cur&&cur.photos)||[]}}});toast('Verificación guardada');kClose();return}
  if(k==='closesave'){if(SCK())return;if(!KS.cs||(KS.cs==='no'&&!KS.cnc)){toast(KS.cs?'Elige la causa.':'Elige Cumplido o No cumplido.');return}
    liveWrite(d,aid,{close:{status:KS.cs,cnc:KS.cs==='no'?KS.cnc:'',note:KS.note.trim(),done:KS.cs==='ok'&&!!KS.done,by:me.email,n:me.name||'',t:NOW()}},{s:'close',m:KS.cs});toast('Cierre enviado. El ingeniero lo confirmará.');kClose();return}}

/* ---------- invitaciones de capataces (Equipo) ---------- */
const INV=new Map();let invSub=null;
function ensureInv(){if(invSub||!db||!isAdmin)return;invSub=fcol('inv').onSnapshot(sn=>{INV.clear();sn.docs.forEach(d=>INV.set(d.id,{...d.data(),id:d.id}));if(U.tab==='team'&&!isDirtyFocus())requestRender()},()=>{});unsubs.push(()=>{if(invSub)invSub();invSub=null;INV.clear()})}
const invURL=c=>location.origin+location.pathname+'?inv='+c;
let qrP=null;
function loadQR(){if(window.qrcode)return Promise.resolve();if(qrP)return qrP;qrP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=window.LPS_QR||'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';s.onload=ok;s.onerror=()=>{qrP=null;ko(new Error('No se pudo cargar el generador de QR'))};document.head.appendChild(s)});return qrP}
async function newInvite(scs){const A='abcdefghjkmnpqrstuvwxyz23456789';const code=Array.from(crypto.getRandomValues(new Uint8Array(10)),b=>A[b%A.length]).join('');
  await fcol('inv').doc(code).set({scs,active:true,exp:NOW()+7*864e5,by:me.email,ts:NOW()});return code}
async function showInvite(code){const iv=INV.get(code);const url=invURL(code);const names=iv?(iv.scs||[]).map(c=>conOf(c).name).join(', '):'';let svg='';
  try{await loadQR();const q=qrcode(0,'M');q.addData(url);q.make();svg=q.createSvgTag({cellSize:7,margin:3,scalable:true})}catch(err){svg=`<p class="note">${esc(err.message)}</p>`}
  const msg=`Hola, este es tu acceso para reportar el avance de ${names} en la app de obra (${esc(P().name||'Last Planner')}). Ábrelo en tu celular y escribe tu nombre: ${url}`;
  const lb=document.createElement('div');lb.className='lb qrlb';lb.innerHTML=`<div class="qrc"><b>Capataz · ${esc(names)}</b><span class="mu">Válido hasta el ${iv?fmtD(ldt((iv.exp)))+' ':''}· escanéalo con la cámara del celular</span><div class="qrs">${svg}</div><input class="tin" readonly value="${esc(url)}" onclick="this.select()">
    <div class="qrb"><button class="ib pri" data-qc>Copiar enlace</button><a class="ib" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Enviar por WhatsApp</a><button class="ib" data-qx>Cerrar</button></div></div>`;
  lb.onclick=ev=>{if(ev.target===lb||ev.target.closest('[data-qx]'))lb.remove();else if(ev.target.closest('[data-qc]')){(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Enlace copiado')).catch(()=>{lb.querySelector('input').select();toast('Copia el enlace seleccionado')})}};
  document.body.appendChild(lb)}
function invCard(){if(!isAdmin)return'';ensureInv();const now=NOW();const L=[...INV.values()].filter(i=>i.active&&i.exp>now).sort((a,b)=>b.ts-a.ts);
  const used=c=>[...MEM.values()].filter(m=>m.inv===c).length;const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  return`<div class="card"><div class="hd">Capataces <span class="sub">ingreso con enlace o código QR, sin correo ni contraseña</span></div><div class="pad">
    <p class="note" style="margin:0 0 10px">Crea un enlace para la partida, envíalo por WhatsApp o muestra el QR. El capataz lo abre en su celular, escribe su nombre y queda registrado <b>solo para esa partida</b>: ve sus actividades del día y reporta Iniciada / Detenida / Cierre. Cada enlace sirve para varios capataces durante 7 días. Para quitarle el acceso a alguien, usa “Quitar acceso” en la lista de arriba.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select class="tin" id="invsc" aria-label="Partida"><option value="">— partida —</option>${cons.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="ib pri" id="invgo">Crear enlace / QR</button></div>
    ${L.length?`<div class="tscroll" style="margin-top:10px"><table class="t"><thead><tr><th>Partida</th><th>Vence</th><th>Capataces registrados</th><th></th></tr></thead><tbody>${L.map(i=>`<tr><td>${esc((i.scs||[]).map(c=>conOf(c).name).join(', '))}</td><td>${fmtD(ldt((i.exp)))}</td><td>${used(i.id)}</td><td style="white-space:nowrap"><button class="ib" data-invqr="${i.id}" style="height:28px">Ver QR / enlace</button> <button class="ib" data-invoff="${i.id}" style="height:28px">Desactivar</button></td></tr>`).join('')}</tbody></table></div>`:''}
  </div></div>`}
async function invClick(e){const t=e.target;let b;
  if(t.id==='invgo'){const sc=$('#invsc').value;if(!sc){toast('Elige la partida.');return}try{const c=await newInvite([sc]);setTimeout(()=>showInvite(c),150)}catch(err){toast('No se pudo crear: '+(err.code||err.message))}return true}
  if((b=t.closest('[data-invqr]'))){showInvite(b.dataset.invqr);return true}
  if((b=t.closest('[data-invoff]'))){try{await fcol('inv').doc(b.dataset.invoff).update({active:false});toast('Enlace desactivado. Los capataces ya registrados siguen con acceso.')}catch(err){toast('No se pudo: '+(err.code||err.message))}return true}
  return false}

/* =====================================================================
   ETAPA 27 · Tablero en vivo (jefe de obra / residente / jefe de campo)
   ===================================================================== */
const shortT=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t};
const dashOn=m=>!!m&&(m.role==='admin'||(m.role==='editor'?m.dash!==false:m.dash===true));
const canDash=()=>!!me&&(isAdmin||isOwnerEmail(me.email)||dashOn(MEM.get(me.email)||{role:me.role}));
const DB_={pid:'',tv:false,tick:null};
const dashLate=()=>{const v=String(P().dashLate||'09:00');return/^\d\d:\d\d$/.test(v)?v:'09:00'};
const nowHM=()=>{const n=new Date(NOW());return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')};
function dashData(d){const vs=new Set(visPisos().map(p=>p.id));const API=window.__plano&&window.__plano.novaSet?window.__plano:null;const nv=API?API.novaSet(d):new Set();
  const items=[];for(const x of S.act.values()){if(!schedOn(x,d))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid))continue;const a=S.amb.get(x.ambId);if(!a)continue;items.push({x,a,pid,nova:nv.has(x.id),st:nv.has(x.id)?null:kState(d,x.id)})}
  return items}
function dashFeed(d){const vs=new Set(visPisos().map(p=>p.id));const ev=[];for(const lv of LIVE.values()){if(lv.date!==d||!vs.has(lv.pisoId))continue;for(const e of lv.log||[])ev.push({...e,lv})}
  return ev.sort((a,b)=>b.t-a.t)}
function renderDash(main){if(!canDash()){U.tab='look';render();return}
  const d=todayIso();ensureDaily(addD(d,-49));const API=window.__plano&&window.__plano.capPlan?window.__plano:null;if(!API)loadPlanoMod().catch(()=>{});else API.capInit(d);
  if(!DB_.tick)DB_.tick=setInterval(()=>{if(U.tab==='dash'&&ready)requestRender();else{clearInterval(DB_.tick);DB_.tick=null}},60000);
  const items=dashData(d);const act=items.filter(i=>!i.nova);const late=dashLate();const isLate=nowHM()>=late;
  const c={none:0,run:0,stop:0,ok:0,no:0};let prop=0,conf=0;act.forEach(i=>{c[i.st.k]++;if(i.st.k==='ok'||i.st.k==='no'){if(i.st.conf)conf++;else prop++}});
  const closed=c.ok+c.no;const vsP=new Set(visPisos().map(p=>p.id));
  /* PPC de hoy = Indicadores › Diario (misma función); PPC de la semana = Indicadores › Semanal (compromisos congelados) */
  const DD=dayData([d],vsP);const DT=DD.tot;const ppcD=DT.ver?DT.ok/DT.ver:null;const nProvD=DD.rows.filter(r=>r.rc&&r.rc._prop).length;
  const PW=ppcWeekAgg(weekOf(d),vsP);
  /* por subcontratista */
  const bySc=new Map();act.forEach(i=>{const o=bySc.get(i.x.sc)||{none:0,run:0,stop:0,ok:0,no:0,n:0,who:new Set()};o[i.st.k]++;o.n++;bySc.set(i.x.sc,o)});
  for(const lv of LIVE.values())if(lv.date===d&&bySc.has(lv.sc))(lv.log||[]).forEach(e=>bySc.get(lv.sc).who.add(e.by));
  const scs=[...bySc.entries()].sort((a,b)=>b[1].n-a[1].n||conOf(a[0]).name.localeCompare(conOf(b[0]).name));
  /* alertas */
  const stopped=act.filter(i=>i.st.k==='stop');const lateL=isLate?act.filter(i=>i.st.k==='none'):[];
  const zoned=API?new Set(visPisos().flatMap(p=>[...API.zonedSet(p.id)])):new Set();const unz=API?act.filter(i=>!zoned.has(i.x.id)):[];
  const cross=API&&API.crossOf?visPisos().flatMap(p=>API.crossOf(p.id).map(c2=>({...c2,p}))):[];
  /* restricciones */
  const RS=restrInScope().filter(r=>r.status!=='lib');const d7=addD(d,7);
  const rToday=RS.filter(r=>{const x=S.act.get(r.actId);return x&&schedOn(x,d)});
  const rLate=RS.filter(r=>r.need&&r.need<d);
  const rNext=RS.filter(r=>{const x=S.act.get(r.actId);return x&&(x.days||[]).some(z=>z>d&&z<=d7)});
  /* tendencias */
  const cw=weekOf(d);const trend=[];for(let w=cw-5;w<=cw;w++){const ds=weekDays(w).filter(x=>x<=d);if(!ds.length)continue;const D=dayData(ds,new Set(visPisos().map(p=>p.id)));if(D.tot.ver)trend.push({label:'S'+w,v:D.tot.ver?D.tot.ok/D.tot.ver:0,sub:`${D.tot.ok} de ${D.tot.ver} verificadas`})}
  const cn={};
  const D30=dayData(Array.from({length:31},(_,k)=>addD(d,-30+k)),new Set(visPisos().map(p=>p.id)));Object.entries(D30.cnc).forEach(([k,v])=>cn[k]=(cn[k]||0)+v);
  for(const lv of LIVE.values())if(lv.date>=addD(d,-30))(lv.log||[]).forEach(e=>{if(e.s==='stop'&&e.m){cn[e.m]=(cn[e.m]||0)+1}});
  const top=Object.entries(cn).filter(([k])=>k!=='Sin causa registrada').sort((a,b)=>b[1]-a[1]).slice(0,5);
  /* --- html --- */
  const T=(k,v,lab,sub,cls)=>`<div class="dk${cls?' '+cls:''}"${k?` style="--k:${KST[k]?KST[k].c:k}"`:''}><span class="dkl">${lab}</span><b>${v}</b>${sub?`<span class="dks">${sub}</span>`:''}</div>`;
  const pc=v=>v==null?'—':Math.round(v*100)+'%';
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  let hh=`<div class="dhd"><div><b>Tablero en vivo</b><span>${dw} ${fmtD(d)} · ${nowHM()} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span></div><span class="dlive"><i></i>En vivo</span><button class="ib" id="dtv">${DB_.tv?'Salir de pantalla completa':'⤢ Pantalla completa'}</button></div>
   <div class="dkpi">${T('',act.length,'Programadas hoy',items.length-act.length?`+ ${items.length-act.length} “no se hará hoy”`:'')}
    ${T('none',c.none,'Sin iniciar',isLate?`pasadas las ${late}`:`alerta desde las ${late}`,isLate&&c.none?'alert':'')}
    ${T('run',c.run,'En ejecución','')}${T('stop',c.stop,'Detenidas','',c.stop?'alert2':'')}
    ${T('ok',closed,'Cerradas',`${conf} confirmadas · ${prop} por confirmar`)}
    ${T('',pc(ppcD),'PPC diario hoy',DT.ver?`${DT.ok} de ${DT.ver} verificadas${nProvD?` · ${nProvD} por confirmar`:''}`:'aún sin cierres','dkppc')}
    ${T('',pc(PW&&PW.ppc),'PPC semanal '+cw+' (oficial)',PW?`${PW.ok} de ${PW.n} compromisos${PW.ev<PW.n?` · ${PW.n-PW.ev} sin evaluar`:''}`:'aún sin evaluar en Plan semanal','dkppc')}</div>`;
  const bar=o=>`<span class="dbar">${['ok','no','run','stop','none'].map(k=>o[k]?`<i style="--k:${KST[k].c};flex:${o[k]}" title="${KST[k].t}: ${o[k]}"></i>`:'').join('')}</span>`;
  let sc=`<div class="dcard"><div class="dch">Por subcontratista <span>${scs.length}</span></div><div class="dsc">${scs.map(([s,o])=>`<div class="dsr"><span class="dsn" style="--c:${conOf(s).color}"><i></i>${esc(conOf(s).name)}</span>${bar(o)}<span class="dsval">${o.ok+o.no}/${o.n}</span><span class="dsw" title="Personas que reportaron hoy">${o.who.size?`👷 ${o.who.size}`:'<em>sin reportes</em>'}</span></div>`).join('')||'<p class="mu">Sin actividades programadas hoy.</p>'}</div>
    <div class="dleg">${['none','run','stop','ok','no'].map(k=>`<span style="--k:${KST[k].c}"><i></i>${KST[k].t}</span>`).join('')}</div></div>`;
  const AL=[];
  stopped.forEach(i=>AL.push(`<li class="a-stop" data-dgo="${i.x.id}"><b>⏸ ${esc(conOf(i.x.sc).name)}</b> · ${esc(i.x.name)} <span>${esc(i.a.code)} · ${esc(i.st.lv&&i.st.lv.mot||'sin motivo')}${i.st.lv&&i.st.lv.log?.length?' · '+hhmm(i.st.lv.log[i.st.lv.log.length-1].t):''}</span></li>`));
  if(lateL.length){const g={};lateL.forEach(i=>(g[i.x.sc]=g[i.x.sc]||[]).push(i));Object.entries(g).sort((a,b)=>b[1].length-a[1].length).forEach(([s,L])=>AL.push(`<li class="a-late"><b>⏰ ${esc(conOf(s).name)}</b> · ${L.length} sin iniciar <span>${esc(L.slice(0,3).map(i=>i.x.name).join(', '))}${L.length>3?'…':''}</span></li>`))}
  cross.forEach(c2=>AL.push(`<li class="a-cross"><b>⚠ Superposición · ${esc(c2.p.code)}</b> · ${esc(c2.a)} ↔ ${esc(c2.b)}</li>`));
  if(prop)AL.push(`<li class="a-prop" data-dtab="campo"><b>✓ ${prop} cierre${prop>1?'s':''} por confirmar</b> <span>Ir a Campo → “Por confirmar”</span></li>`);
  if(unz.length)AL.push(`<li class="a-unz" data-dtab="mapa"><b>📍 ${unz.length} actividad${unz.length>1?'es':''} sin ubicar</b> en el plan diario <span>los capataces no las verán en su plano</span></li>`);
  let al=`<div class="dcard"><div class="dch">Alertas <span>${AL.length}</span></div><ul class="dal">${AL.join('')||'<li class="a-ok">Todo en orden por ahora.</li>'}</ul></div>`;
  const FD=dashFeed(d).slice(0,14);const w={run:'inició',res:'reanudó',stop:'detuvo',close:'cerró'};
  let fd=`<div class="dcard"><div class="dch">Actividad reciente</div><ul class="dfd">${FD.map(e=>{const x=S.act.get(e.lv.actId);const a=x&&S.amb.get(x.ambId);return`<li data-dgo="${e.lv.actId}"><time>${hhmm(e.t)}</time><span><b>${esc(conOf(e.lv.sc).name)}</b> ${w[e.s]||e.s}${e.s==='close'?(e.m==='ok'?' ✓':' ✗'):''} <em>${esc(x?x.name:'')}</em>${e.s==='stop'&&e.m?` · ${esc(e.m)}`:''}<small>${esc(S.pis.get(e.lv.pisoId)?.code||'')} · ${esc(a?a.code+' '+a.name:'')} · ${esc((e.n||'').split(' ')[0])}</small></span></li>`}).join('')||'<li class="mu">Aún no hay reportes de los capataces hoy.</li>'}</ul></div>`;
  const pls=visPisos().filter(p=>items.some(i=>i.pid===p.id));if(!pls.some(p=>p.id===DB_.pid))DB_.pid=(pls.find(p=>API&&[...API.zonedSet(p.id)].length)||pls[0]||{}).id||'';
  const rcol=(t,L)=>{const cm=L.filter(r=>grpOf(r)==='campo'),ar=L.filter(r=>grpOf(r)==='area');return`<div class="drc"><div class="drh">${t} <b>${L.length}</b></div><div class="drg"><span>Campo <b>${cm.length}</b></span><span>Otras áreas <b>${ar.length}</b></span></div><ul>${L.slice(0,5).map(r=>{const x=S.act.get(r.actId);return`<li><span class="dtag ${grpOf(r)}">${grpOf(r)==='area'?esc(r.area||'Otras áreas'):'Campo'}</span> ${esc(r.type||'Restricción')}${r.desc?': '+esc(shortT(r.desc,40)):''}<small>${x?esc(shortT(x.name,30))+' · '+esc(conOf(x.sc).name):''}${r.need?' · necesaria '+fmtD(r.need):''}</small></li>`}).join('')}${L.length>5?`<li class="mu">y ${L.length-5} más…</li>`:''}</ul></div>`};
  let rs=`<div class="dcard"><div class="dch">Restricciones pendientes <button class="lnkb" data-dtab="restr">ver todas</button></div><div class="drs">${rcol('Actividades de hoy',rToday)}${rcol('Vencidas',rLate)}${rcol('Próximos 7 días',rNext)}</div></div>`;
  let tr=`<div class="dcard"><div class="dch">PPC diario (alerta) por semana</div><div class="dsv chart">${trend.length?svgBarsV(trend,{h:190}):'<p class="mu">Aún no hay registros de cumplimiento.</p>'}</div></div>
    <div class="dcard"><div class="dch">Causas más frecuentes · 30 días</div><div class="dsv chart">${top.length?svgBarsH(top.map(([k,v])=>({label:k,v})),v=>String(v)):'<p class="mu">Sin incumplimientos ni detenciones registradas.</p>'}</div></div>`;
  if(!main.dataset.built){main.innerHTML=`<div class="dash"><div id="dtop"></div><div class="dgrid"><div class="dcol1"><div id="dsc"></div><div class="dcard dplanc"><div class="dch">Plano en vivo <span class="dpch" id="dpch"></span></div><div class="dplanw"><div class="kplan" id="dplan"></div></div></div><div id="drs"></div></div><div class="dcol2"><div id="dal"></div><div id="dfd"></div><div id="dtr"></div></div></div></div>`;main.dataset.built='1';main.onclick=dashClick}
  const put=(id,html)=>{const el=$('#'+id,main);if(el&&el.dataset.h!==html){el.innerHTML=html;el.dataset.h=html}};
  put('dtop',hh);put('dsc',sc);put('dal',al);put('dfd',fd);put('drs',rs);put('dtr',tr);
  put('dpch',pls.map(p=>`<button class="${DB_.pid===p.id?'on':''}" data-dp="${p.id}">${esc(p.code)}</button>`).join(''));
  if(API&&DB_.pid){const its=items.filter(i=>i.pid===DB_.pid&&!i.nova);const colors=new Map(its.map(i=>[i.x.id,KST[i.st.k].c]));API.capPlan($('#dplan',main),{pid:DB_.pid,colors,nums:API.nums(DB_.pid),bs:28,fitAll:true,onPick:aid=>dashPop(aid,d)})}
  document.body.classList.toggle('dash-tv',DB_.tv)}
function dashPop(aid,d){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);const s=kState(d,aid);const rs=restrPend(aid);
  const lb=document.createElement('div');lb.className='ksheet';lb.innerHTML=`<div class="ksc"><div class="ksh"><i class="kn" style="--k:${KST[s.k].c}">${(window.__plano?.nums(pisoOfAct(aid)).get(aid))||'·'}</i><div><b>${esc(x.name)}</b><span>${esc(a?a.code+' · '+a.name:'')} · ${esc(S.pis.get(pisoOfAct(aid))?.name||'')}</span><span>${esc(conOf(x.sc).name)}</span></div><button class="kx" data-kx>×</button></div><div class="kst" style="--k:${KST[s.k].c}">${esc(kText(d,aid))}</div>${liveLine(d,aid)}${rs.map(r=>`<div class="rsk">⚠ Restricción pendiente · ${esc(rTxt(r))}</div>`).join('')}<div class="kbtns"><button class="kbig ghost" data-goc>Abrir en Campo</button></div></div>`;
  lb.onclick=e=>{if(e.target===lb||e.target.closest('[data-kx]'))lb.remove();else if(e.target.closest('[data-goc]')){lb.remove();goCampo(aid,d)}};document.body.appendChild(lb)}
function dashClick(e){const t=e.target;let b;
  if(t.closest('#dtv')){DB_.tv=!DB_.tv;try{if(DB_.tv)document.documentElement.requestFullscreen().catch(()=>{});else if(document.fullscreenElement)document.exitFullscreen()}catch(err){}const m=$('#main');m.dataset.built='';render();return}
  if((b=t.closest('[data-dp]'))){DB_.pid=b.dataset.dp;const h=$('#dplan');if(h)h._fk='';render();return}
  if((b=t.closest('[data-dtab]'))){if(b.dataset.dtab==='campo'){CU.show='prop';CU.date=null;saveCU()}goTab(b.dataset.dtab);return}
  if((b=t.closest('[data-dgo]'))){dashPop(b.dataset.dgo,todayIso());return}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-lqact]');if(!b)return;e.stopPropagation();const l=libOf(b.dataset.lqact);if(l)libDetail(l.id);else libAsk(b.dataset.lqact)},true);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&DB_.tv&&U.tab==='dash'){DB_.tv=false;const m=$('#main');m.dataset.built='';render()}});

