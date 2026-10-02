"use strict";
/* LPS 911 · Propuestas de los subcontratistas y su revisión en la grilla.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 29 · Lookahead colaborativo: propuestas de los subcontratistas
   ===================================================================== */
const PROP=new Map();let propSub=null,propErr=null;let ACT_OFF=null;
const myScsI=()=>(me&&me.scs)||[];
const PM=()=>!!me&&me.role==='sc'&&U.tab==='look'&&!(U.ver&&U.verMode==='ver');
function ensureProp(){if(propSub||!db)return;propSub=fcol('lhprop').onSnapshot(sn=>{PROP.clear();sn.docs.forEach(d=>PROP.set(d.id,{...d.data(),id:d.id}));propErr=null;pmSync();if(ready&&(U.tab==='look'))requestRender()},err=>{propErr=err&&err.code||'error';if(ready&&U.tab==='look')requestRender()});
  unsubs.push(()=>{if(propSub)propSub();propSub=null;PROP.clear()})}
const propItems=(sc)=>Object.entries((PROP.get(sc)||{}).items||{}).filter(([,it])=>!!it).map(([id,it])=>({sc,id,it}));
/* vista del SC: lo oficial con su borrador encima */
function pmSync(){if(PM()){if(!S.act._pm)ACT_OFF=S.act;const v=new Map(ACT_OFF);
    for(const sc of myScsI())for(const{id,it}of propItems(sc)){if(it.after==null){const o=ACT_OFF.get(id);if(o)v.set(id,{...o,_del:true})}else v.set(id,{...clone(it.after),id})}
    v._pm=true;S.act=v}
  else if(S.act&&S.act._pm&&ACT_OFF){S.act=ACT_OFF}}
const cleanAct=a=>{const c={...a};delete c._del;delete c.id;return c};
/* escritura del SC: va al borrador, no al lookahead oficial */
function propPut(col,id,after){if(!PM())return false;
  if(col!=='acts'){toast('En modo propuesta solo cambias las actividades de tu partida. Ambientes, sectores y lo demás los edita el ingeniero de producción.');return true}
  const off=ACT_OFF&&ACT_OFF.get(id)||null;const cur=S.act.get(id)||null;const mine=myScsI();
  const sc=off?off.sc:(after&&after.sc)||(cur&&cur.sc);
  if(!mine.includes(sc)||(after&&!mine.includes(after.sc))){toast('Solo puedes proponer cambios en las actividades de '+mine.map(c=>conOf(c).name).join(', ')+'.');requestRender();return true}
  let item;
  if(after==null){item=off?{after:null,base:cleanAct(off)}:null}
  else{const a=cleanAct(after);if(off&&canon(a)===canon(cleanAct(off)))item=null;else item={after:a,base:off?cleanAct(off):null}}
  savePropItem(sc,id,item);return true}
function savePropItem(sc,id,item){const doc=PROP.get(sc)||{sc,items:{}};const v=item?{...item,ts:NOW(),by:me.email,n:me.name||'',sent:false}:null;
  PROP.set(sc,{...doc,items:{...(doc.items||{}),[id]:v}});pmSync();requestRender();
  if(db)fcol('lhprop').doc(sc).set({sc,items:{[id]:v}},{merge:true}).catch(err=>toast('No se pudo guardar la propuesta: '+(err.code==='permission-denied'?'sin permiso (¿reglas nuevas publicadas?)':(err.code||err.message))))}
function sendProp(){const now=NOW();let n=0;
  for(const sc of myScsI()){const its=propItems(sc).filter(o=>!o.it.sent);if(!its.length)continue;const up={};its.forEach(({id,it})=>{up[id]={...it,sent:true,sentAt:now};n++});
    const doc=PROP.get(sc)||{sc,items:{}};PROP.set(sc,{...doc,items:{...doc.items,...up},sentAt:now,sentBy:me.name||me.email});
    fcol('lhprop').doc(sc).set({sc,items:up,sentAt:now,sentBy:me.name||me.email},{merge:true}).catch(err=>toast('No se pudo enviar: '+(err.code||err.message)))}
  toast(n?`${n} cambio${n>1?'s':''} enviado${n>1?'s':''} al ingeniero responsable del piso`:'No hay cambios por enviar');requestRender()}
/* textos */
function rngTxt(ds){ds=[...(ds||[])].sort();if(!ds.length)return'sin días';const out=[];let a=ds[0],b=ds[0];
  const nx=d=>{let x=addD(d,1);let g=0;while(!isWork(x)&&g++<14)x=addD(x,1);return x};
  for(let i=1;i<ds.length;i++){if(ds[i]===nx(b))b=ds[i];else{out.push(a===b?fmtD(a):fmtD(a).slice(0,2)+'–'+fmtD(b));a=b=ds[i]}}out.push(a===b?fmtD(a):fmtD(a).slice(0,2)+'–'+fmtD(b));return out.join(', ')}
function propDesc(id,it){const off=(ACT_OFF&&S.act._pm?ACT_OFF:S.act).get(id)||null;const base=it.base||off;const L=[];
  if(!it.after)return{kind:'del',lines:['Pide quitar esta actividad'+(base?` (${rngTxt(base.days)})`:'')]};
  if(!base)return{kind:'new',lines:[`Nueva actividad · ${rngTxt(it.after.days)} (${(it.after.days||[]).length} días)`]};
  if(canon(it.after.days||[])!==canon(base.days||[]))L.push(`Días: ${rngTxt(base.days)} → <b>${rngTxt(it.after.days)}</b>`);
  if(canon(it.after.qty||{})!==canon(base.qty||{})&&canon(it.after.days||[])===canon(base.days||[]))L.push('Reparto del metrado por día');
  if((it.after.metrado??null)!==(base.metrado??null))L.push(`Metrado: ${base.metrado??'—'} → <b>${it.after.metrado??'—'}</b> ${esc(it.after.und||'')}`);
  if((it.after.und||'')!==(base.und||''))L.push(`Unidad: ${esc(base.und||'—')} → <b>${esc(it.after.und||'—')}</b>`);
  if((it.after.name||'')!==(base.name||''))L.push(`Nombre: ${esc(base.name||'—')} → <b>${esc(it.after.name||'—')}</b>`);
  if(!L.length)L.push('Cambio de orden');return{kind:'mod',lines:L}}
/* cruces con otras disciplinas para ayudar a decidir */
function propAlerts(sc,id,it,days){const A=[];const off=S.act.get(id);const x=it.after||off;if(!x)return A;const ds=new Set(days||x.days||[]);
  if(ds.size){const oth=new Map();for(const y of S.act.values()){if(y.id===id||y.ambId!==x.ambId||y.sc===x.sc)continue;const c=(y.days||[]).filter(d=>ds.has(d));if(c.length)oth.set(y.id,{y,c})}
    oth.forEach(({y,c})=>A.push({t:'amb',h:`Mismo ambiente esos días: <b>${esc(conOf(y.sc).name)}</b> ${esc(y.name)} (${rngTxt(c)})`}))}
  const rs=off?restrPend(id):[];rs.forEach(r=>A.push({t:'res',h:'Restricción pendiente: '+esc(rTxt(r))}));
  const pid=pisoOfAmb(x.ambId);const ch=new Set();const od=new Set(off?off.days||[]:[]);(days||x.days||[]).forEach(d=>{if(!od.has(d))ch.add(d)});od.forEach(d=>{if(!ds.has(d))ch.add(d)});
  const wks=[...new Set([...ch].map(d=>weekOf(d)))].filter(w=>{const wk=S.wk.get(wkId(w,pid));return wk&&wk.frozenAt});wks.forEach(w=>A.push({t:'frz',h:`Afecta la semana ${w}, que ya está congelada en el plan semanal`}));
  return A}
/* días hábiles (lun–sáb) */
function wshift(d,n){let x=d;const st=n>0?1:-1;let k=Math.abs(n);let g=0;while(k>0&&g++<2000){x=addD(x,st);if(isWork(x))k--}return x}
function wdist(a,b){if(a===b)return 0;let n=0,x=a;const st=b>a?1:-1;while(x!==b){x=addD(x,st);if(isWork(x))n+=st;if(Math.abs(n)>400)break}return n}
function decideProp(sc,id,st,opt){opt=opt||{};const doc=PROP.get(sc);const it=doc&&doc.items&&doc.items[id];if(!it)return;if(!canDecide(id,it)){toast(propWho(id,it)+'.');return}const off=S.act.get(id)||null;const base=it.base||off;let ops=[];let finalDays=null;
  if(st!=='rej'){
    if(!it.after){if(off)ops=[arc('acts',id)]}
    else{let a=clone(it.after);
      if(st==='shift'&&opt.start&&(a.days||[]).length){const ds=[...a.days].sort();const k=wdist(ds[0],opt.start);const m={};a.days=ds.map(d=>{const n=wshift(d,k);m[d]=n;return n});if(a.qty){const q={};for(const[d,v]of Object.entries(a.qty))q[m[d]||wshift(d,k)]=v;a.qty=q}}
      if(!off){if(!S.amb.has(a.ambId)){toast('El ambiente de esa actividad ya no existe.');return}ops=[op('acts',id,{...a,id})]}
      else{const nw={...off};for(const f of['days','qty','metrado','und','name','order'])if(canon(a[f]??null)!==canon(base?base[f]??null:null)||(st==='shift'&&(f==='days'||f==='qty')))nw[f]=a[f];ops=[op('acts',id,nw)]}
      finalDays=a.days||[]}
    if(ops.length)apply(ops)}
  const x=it.after||base||{};const am=S.amb.get(x.ambId);const key=id+'_'+NOW();
  const h={id,name:x.name||'',amb:am?am.code+' '+am.name:'',kind:!it.after?'del':!base?'new':'mod',from:base?rngTxt(base.days):'',to:it.after?rngTxt(finalDays||it.after.days):'',st,note:opt.note||'',t:NOW(),by:me.email,n:me.name||'',pn:it.n||''};
  PROP.set(sc,{...doc,items:{...doc.items,[id]:null},hist:{...(doc.hist||{}),[key]:h}});
  fcol('lhprop').doc(sc).set({items:{[id]:null},hist:{[key]:h}},{merge:true}).catch(err=>toast('No se pudo registrar la respuesta: '+(err.code||err.message)));
  toast(st==='ok'?'Propuesta aceptada':st==='shift'?`Aceptada desplazando al ${fmtD(opt.start)}`:'Propuesta rechazada');requestRender()}
/* superposición en la grilla (lo que proponen, sobre lo vigente) */
function propOverlay(){if(PM()||!canWrite)return null;const m=new Map();
  for(const doc of PROP.values())for(const[id,it]of Object.entries(doc.items||{})){if(!it||!it.sent)continue;const off=S.act.get(id);if(!off)continue;const od=new Set(off.days||[]);const nd=new Set(it.after?it.after.days||[]:[]);
    m.set(id,{add:new Set([...nd].filter(d=>!od.has(d))),del:new Set(it.after?[...od].filter(d=>!nd.has(d)):[...od]),sc:doc.sc,rm:!it.after})}
  return m}
function pmBases(){if(!PM()||!ACT_OFF)return null;const has=myScsI().some(sc=>propItems(sc).length);if(!has)return null;const m=new Map();
  for(const x of ACT_OFF.values()){const pid=pisoOfAct(x.id);if(!m.has(pid))m.set(pid,{snap:{}});m.get(pid).snap[x.id]=x.days||[]}
  for(const p of S.pis.values())if(!m.has(p.id))m.set(p.id,{snap:{}});return m}
/* barra superior del lookahead */
function renderPropBar(){const v=$('#main .view');if(!v)return;let pb=$('#ppbar');if(!pb){const bar=v.querySelector('.bar');if(!bar)return;pb=document.createElement('div');pb.id='ppbar';bar.after(pb);pb.onclick=propBarClick;pb.onchange=e=>{if(e.target.id==='rvctx'){U.revCtx=e.target.checked;requestRender()}}}
  let h='';
  if(me&&me.role==='sc'&&!(U.ver&&U.verMode==='ver')){const its=myScsI().flatMap(sc=>propItems(sc));const un=its.filter(o=>!o.it.sent).length,se=its.length-un;
    const hist=myScsI().flatMap(sc=>Object.values((PROP.get(sc)||{}).hist||{})).sort((a,b)=>b.t-a.t);let seen=0;try{seen=+localStorage.getItem('lps.pseen')||0}catch(e){}const nw=hist.filter(x=>x.t>seen).length;
    h=`<div class="ppb sc"><div><b>Modo propuesta</b> · edita los días, metrados y actividades de <b>${esc(myScsI().map(c=>conOf(c).name).join(', '))}</b>. Lo de los demás es solo lectura. Tus cambios se aplican cuando el ingeniero responsable del piso los acepte.</div>
      <div class="ppa">${un?`<span class="pill warn">${un} sin enviar</span>`:''}${se?`<span class="pill neu">${se} en revisión</span>`:''}${its.length?'<button class="ib" data-pp="mine">Ver mis cambios</button>':''}<button class="ib pri" data-pp="send"${un?'':' disabled'}>Enviar al ingeniero responsable${un?' ('+un+')':''}</button>${hist.length?`<button class="ib" data-pp="hist">Respuestas${nw?` <b class="bc">${nw}</b>`:''}</button>`:''}</div></div>`}
  else if(canWrite&&!(U.ver&&U.verMode==='ver')){const by=revCounts();let oth=0;for(const doc of PROP.values())for(const[id,it]of Object.entries(doc.items||{}))if(it&&it.sent&&!canDecide(id,it))oth++;
    if(by.size||oth)h=`<div class="ppb ed"><div><b>Propuestas de subcontratistas</b> · ${by.size?[...by.entries()].map(([sc,n])=>`<span class="ppsc" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></span>`).join(' '):'<span class="mu">ninguna en tus pisos</span>'}${oth?`<span class="mu"> · ${oth} de pisos a cargo de otros (solo las ves)</span>`:''}<span class="mu"> · en la grilla: días propuestos rayados, días que se quitarían tachados</span></div><div class="ppa">${by.size?'<button class="ib pri" data-pp="rev">Revisar propuestas</button>':'<button class="ib" data-pp="list">Ver propuestas</button>'}</div></div>`;if(revOn())h=revBarHtml()}
  if(propErr)h+=`<div class="callout">No se pudieron leer las propuestas (${esc(propErr)}). Falta publicar las reglas nuevas de Firestore.</div>`;
  if(pb.dataset.h!==h){pb.innerHTML=h;pb.dataset.h=h}pb.hidden=!h}
function propBarClick(e){const t=e.target;let r;
  if((r=t.closest('[data-rvsc]'))){U.revSc=r.dataset.rvsc;REVSEL=null;requestRender();return}
  if((r=t.closest('[data-rvnav]'))){revGo(+r.dataset.rvnav);return}
  if(t.closest('[data-rvk0]')){if(REVSEL)REVSEL.k=0;requestRender();return}
  if(t.closest('[data-rvexit]')){U.rev=false;REVSEL=null;requestRender();return}
  if(t.closest('[data-rvall]')){const L=revItems();if(!L.length)return;if(!confirm(`¿Aceptar las ${L.length} propuestas visibles tal como vienen?`))return;L.forEach(o=>decideProp(o.sc,o.id,'ok'));REVSEL=null;return}
  const b=t.closest('[data-pp]');if(!b)return;const k=b.dataset.pp;
  if(k==='send')sendProp();else if(k==='mine')propModal('mine');else if(k==='hist'){try{localStorage.setItem('lps.pseen',String(NOW()))}catch(er){}propModal('hist');requestRender()}else if(k==='rev'){U.rev=true;REVSEL=null;requestRender();setTimeout(()=>revGo(1),200)}else if(k==='list')propModal('rev')}
let PMOD=null;
function propModal(mode){PMOD={mode};let el=$('#ppm');if(!el){el=document.createElement('div');el.id='ppm';el.className='ppm';el.innerHTML='<div class="ppc"></div>';document.body.appendChild(el);el.onclick=propModalClick}propModalRender()}
function propModalRender(){const el=$('#ppm');if(!el||!PMOD)return;const mode=PMOD.mode;let h='';
  const card=(sc,id,it,ed)=>{const off=(ACT_OFF&&S.act._pm?ACT_OFF:S.act).get(id);const x=it.after||off||it.base||{};const am=S.amb.get(x.ambId);const p=am?S.pis.get(pisoOfAmb(am.id)):null;const D=propDesc(id,it);const AL=ed?propAlerts(sc,id,it):[];
    return`<div class="ppi k-${D.kind}" data-sc="${sc}" data-id="${id}"><div class="ppt"><span class="ppk">${D.kind==='new'?'NUEVA':D.kind==='del'?'QUITAR':'CAMBIO'}</span><b>${esc(x.name||'(sin nombre)')}</b><small>${p?esc(p.code)+' · ':''}${am?esc(am.code+' · '+am.name):''}${ed?' · propuesto por '+esc(it.n||''):''}${!ed?(it.sent?' · <em>en revisión</em>':' · <em class="w">sin enviar</em>'):''}</small></div>
      <ul>${D.lines.map(l=>`<li>${l}</li>`).join('')}</ul>${AL.length?`<ul class="ppal">${AL.map(a=>`<li class="${a.t}">⚠ ${a.h}</li>`).join('')}</ul>`:''}
      <div class="ppbt">${ed?(canDecide(id,it)?`<button class="ib pri" data-pd="ok">✓ Aceptar</button>${it.after&&(it.after.days||[]).length?'<button class="ib" data-pd="shift">Aceptar desplazando…</button>':''}<button class="ib" data-pd="rej">Rechazar…</button>`:`<span class="mu">${esc(propWho(id,it))}</span>`):'<button class="ib" data-pd="drop">Descartar este cambio</button>'}</div></div>`};
  if(mode==='rev'){const scs=[...PROP.values()].filter(d=>Object.values(d.items||{}).some(it=>it&&it.sent)).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name));
    h=`<div class="pph"><b>Propuestas de los subcontratistas</b><button class="kx" data-px>×</button></div>`+(scs.length?scs.map(d=>{const L=Object.entries(d.items||{}).filter(([,it])=>it&&it.sent);const nd=L.filter(([id,it])=>canDecide(id,it)).length;return`<section><div class="ppsh" style="--c:${conOf(d.sc).color}"><i></i><b>${esc(conOf(d.sc).name)}</b><span>${L.length} cambio${L.length>1?'s':''}${d.sentAt?' · enviado '+fmtD(ldt((d.sentAt)))+' '+hhmm(d.sentAt):''}</span>${nd?`<button class="ib pri" data-pall="${d.sc}">✓ Aceptar ${nd===L.length?'todo':'los míos ('+nd+')'}</button>`:''}</div>${L.map(([id,it])=>card(d.sc,id,it,true)).join('')}</section>`}).join(''):'<p class="mu" style="padding:16px">No hay propuestas pendientes.</p>')}
  else if(mode==='mine'){const L=myScsI().flatMap(sc=>propItems(sc));h=`<div class="pph"><b>Mis cambios propuestos</b><button class="kx" data-px>×</button></div>${L.map(o=>card(o.sc,o.id,o.it,false)).join('')||'<p class="mu" style="padding:16px">No tienes cambios.</p>'}`}
  else{const hist=myScsI().flatMap(sc=>Object.values((PROP.get(sc)||{}).hist||{}).map(x=>({...x,sc}))).sort((a,b)=>b.t-a.t).slice(0,60);const ST_={ok:'✓ Aceptado',shift:'↔ Aceptado con otra fecha',rej:'✗ Rechazado'};
    h=`<div class="pph"><b>Respuestas del ingeniero</b><button class="kx" data-px>×</button></div>${hist.map(x=>`<div class="ppi r-${x.st}"><div class="ppt"><span class="ppk">${ST_[x.st]||x.st}</span><b>${esc(x.name)}</b><small>${esc(x.amb)} · ${fmtD(ldt((x.t)))} ${hhmm(x.t)} · ${esc(x.n)}</small></div><ul>${x.kind==='del'?'<li>Pedido de quitar la actividad</li>':`<li>${x.from?esc(x.from)+' → ':''}<b>${esc(x.to)}</b></li>`}${x.note?`<li>Comentario: “${esc(x.note)}”</li>`:''}</ul></div>`).join('')||'<p class="mu" style="padding:16px">Aún no hay respuestas.</p>'}`}
  const c=el.firstChild;if(c.dataset.h!==h){const st=c.scrollTop;c.innerHTML=h;c.dataset.h=h;c.scrollTop=st}}
function propModalClick(e){const t=e.target;const el=$('#ppm');if(t===el||t.closest('[data-px]')){el.remove();PMOD=null;return}let b;
  if((b=t.closest('[data-pall]'))){const sc=b.dataset.pall;const L=Object.entries((PROP.get(sc)||{}).items||{}).filter(([id,it])=>it&&it.sent&&canDecide(id,it));L.forEach(([id])=>decideProp(sc,id,'ok'));propModalRender();return}
  if(!(b=t.closest('[data-pd]')))return;const card=b.closest('.ppi');const sc=card.dataset.sc,id=card.dataset.id;const k=b.dataset.pd;
  if(k==='drop'){savePropItem(sc,id,null);setTimeout(propModalRender,50);return}
  if(k==='ok'){decideProp(sc,id,'ok');propModalRender();return}
  if(k==='rej'){openPop(b,`<div class="ph">Rechazar propuesta</div><div class="qrow"><input id="prn" placeholder="Motivo (opcional)" style="width:220px;text-align:left"><button data-do="go">Rechazar</button></div>`,{go:()=>{decideProp(sc,id,'rej',{note:($('#prn')||{}).value||''});propModalRender()}});setTimeout(()=>{const i=$('#prn');if(i)i.focus()},30);return}
  if(k==='shift'){const it=PROP.get(sc).items[id];const ds=[...(it.after.days||[])].sort();
    openPop(b,`<div class="ph">Aceptar desplazando</div><div class="ptx">Propuesto: ${esc(rngTxt(ds))}. Elige el nuevo día de inicio; se mueve todo el bloque (días hábiles, lunes a sábado).</div><div class="qrow"><input type="date" id="pst" value="${ds[0]}"><button data-do="go">Aceptar</button></div>`,
      {go:()=>{const v=($('#pst')||{}).value;if(!v){toast('Elige una fecha.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}decideProp(sc,id,'shift',{start:v});propModalRender()}});return}}

/* =====================================================================
   ETAPA 30 · Modo revisión de propuestas dentro de la grilla
   ===================================================================== */
U.rev=false;U.revSc='';U.revCtx=false;let REVSEL=null,REVDRAG=null;
const revOn=()=>!!(U.rev&&canWrite&&!PM()&&U.tab==='look'&&!(U.ver&&U.verMode==='ver'));
function revItems(){const L=[];for(const doc of PROP.values()){if(U.revSc&&doc.sc!==U.revSc)continue;for(const[id,it]of Object.entries(doc.items||{}))if(it&&it.sent&&canDecide(id,it))L.push({sc:doc.sc,id,it})}return L}
function revCounts(){const m=new Map();for(const doc of PROP.values())for(const[id,it]of Object.entries(doc.items||{}))if(it&&it.sent&&canDecide(id,it))m.set(doc.sc,(m.get(doc.sc)||0)+1);return m}
/* durante el render, la grilla muestra lo propuesto encima de lo vigente */
function revSwap(){const off=S.act;const v=new Map(off);
  for(const{sc,id,it}of revItems()){const o=off.get(id)||null;
    if(!it.after){if(o)v.set(id,{...o,_rv:{off:o,sc,del:true,n:it.n}})}
    else if(!o){if(S.amb.has(it.after.ambId))v.set(id,{...clone(it.after),id,_rv:{off:null,sc,isNew:true,n:it.n}})}
    else v.set(id,{...clone(it.after),id,_rv:{off:o,sc,n:it.n}})}
  S.act=v;return()=>{S.act=off}}
function revShift(x){const o=x._rv&&x._rv.off;if(!o||x._rv.del)return 0;const a=[...(o.days||[])].sort()[0],b=[...(x.days||[])].sort()[0];if(!a||!b)return 0;return wdist(a,b)}
function revConflicts(x){const out=new Map();if(!x._rv||x._rv.del)return out;const ds=new Set(x.days||[]);
  for(const y of S.act.values()){if(y.id===x.id||y.ambId!==x.ambId||y.sc===x.sc||y._rv)continue;(y.days||[]).forEach(d=>{if(ds.has(d)){const L=out.get(d)||[];L.push(conOf(y.sc).name+' · '+y.name);out.set(d,L)}})}return out}
function revBarHtml(){const cnt=revCounts();const L=revItems();const tot=L.length;const idx=REVSEL?L.findIndex(o=>o.id===REVSEL.id):-1;
  return`<div class="ppb rv"><div class="rvl"><b>Revisando propuestas</b>
    <span class="rvchips"><button class="${!U.revSc?'on':''}" data-rvsc="">Todos <b>${[...cnt.values()].reduce((a,b)=>a+b,0)}</b></button>${[...cnt.entries()].sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name)).map(([sc,n])=>`<button class="${U.revSc===sc?'on':''}" data-rvsc="${sc}" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></button>`).join('')}</span>
    <label class="chk"><input type="checkbox" id="rvctx"${U.revCtx?' checked':''}> Ver todo el contexto</label>
    <span class="mu rvhelp">Tenue = vigente · intenso = propuesto · <b>‹ ›</b> mueve lo propuesto un día hábil (o arrastra la barra) · <b>📅</b> otra fecha de inicio · ✓ acepta · ✗ rechaza</span>${REVSEL&&REVSEL.k?(()=>{const x=S.act.get(REVSEL.id);const k=REVSEL.k;return`<span class="pill warn">${esc(x&&x.name||'Actividad')}: movida ${Math.abs(k)} día${Math.abs(k)>1?'s':''} hábil${Math.abs(k)>1?'es':''} ${k>0?'después':'antes'} · ✓ en la fila para aceptar así</span><button class="ib" data-rvk0>Volver a lo propuesto</button>`})():''}</div>
    <div class="ppa"><button class="ib" data-rvnav="-1"${tot?'':' disabled'}>‹ Anterior</button><span class="rvpos">${tot?(idx>=0?idx+1:'–')+' de '+tot:'Sin propuestas'}</span><button class="ib" data-rvnav="1"${tot?'':' disabled'}>Siguiente ›</button>
    <button class="ib pri" data-rvall${tot?'':' disabled'}>✓ Aceptar todo lo visible (${tot})</button><button class="ib" data-pp="list">Lista</button><button class="ib" data-rvexit>Salir de la revisión</button></div></div>`}
function revGo(dir){const L=revItems();if(!L.length)return;let i=REVSEL?L.findIndex(o=>o.id===REVSEL.id):-1;i=i<0?(dir>0?0:L.length-1):(i+dir+L.length)%L.length;const o=L[i];REVSEL={sc:o.sc,id:o.id,k:0};
  const am=S.amb.get((o.it.after||S.act.get(o.id)||{}).ambId);if(am){const sec=am.sectorId;U.collapsed=U.collapsed.filter(c=>c!==sec&&c!==pisoOfAmb(am.id))}
  requestRender();setTimeout(()=>{const tr=$(`#grid tr[data-a="${CSS.escape(o.id)}"]`);if(tr)tr.scrollIntoView({block:'center',behavior:'smooth'})},120)}
function revDecide(id,st,opt){const o=revItems().find(q=>q.id===id)||[...PROP.values()].flatMap(d=>Object.entries(d.items||{}).filter(([k,it])=>k===id&&it).map(([k,it])=>({sc:d.sc,id:k,it})))[0];if(!o)return;
  const L=revItems();const i=L.findIndex(q=>q.id===id);decideProp(o.sc,id,st,opt);const R=revItems();REVSEL=R.length?{sc:R[Math.min(Math.max(i,0),R.length-1)].sc,id:R[Math.min(Math.max(i,0),R.length-1)].id,k:0}:null}
function revClick(e){if(!revOn())return;const t=e.target;let b;
  if((b=t.closest('[data-rva]'))){e.stopPropagation();e.preventDefault();const id=b.closest('tr').dataset.a;const k=b.dataset.rva;
    if(k==='l'||k==='r'){const it=revItems().find(q=>q.id===id);if(!it)return;if(!REVSEL||REVSEL.id!==id)REVSEL={sc:it.sc,id,k:0};REVSEL.k+=k==='r'?1:-1;requestRender();return}
    if(k==='date'){const it=revItems().find(q=>q.id===id);if(!it||!it.it.after)return;const ds=[...(it.it.after.days||[])].sort();if(!ds.length)return;const cur=REVSEL&&REVSEL.id===id&&REVSEL.k?wshift(ds[0],REVSEL.k):ds[0];
      openPop(b,`<div class="ph">Aceptar con otra fecha</div><div class="ptx">Propuesto: ${esc(rngTxt(ds))}. Elige el nuevo día de inicio: se mueve todo el bloque (días hábiles, lunes a sábado).</div><div class="qrow"><input type="date" id="pst" value="${cur}"><button data-do="go">Aceptar</button></div>`,
        {go:()=>{const v=($('#pst')||{}).value;if(!v){toast('Elige una fecha.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}revDecide(id,'shift',{start:v})}});setTimeout(()=>{const i=$('#pst');if(i)i.focus()},30);return}
    if(k==='ok'){const sel=REVSEL&&REVSEL.id===id&&REVSEL.k?REVSEL.k:0;if(sel){const x=S.act.get(id);const it=revItems().find(q=>q.id===id);const st=[...(it.it.after.days||[])].sort()[0];revDecide(id,'shift',{start:wshift(st,sel)})}else revDecide(id,'ok')}
    else openPop(b,`<div class="ph">Rechazar propuesta</div><div class="qrow"><input id="prn" placeholder="Motivo (opcional)" style="width:220px;text-align:left"><button data-do="go">Rechazar</button></div>`,{go:()=>revDecide(id,'rej',{note:($('#prn')||{}).value||''})}),setTimeout(()=>{const i=$('#prn');if(i)i.focus()},30);
    return}
  const tr=t.closest('tr.rvrow');if(tr&&!t.closest('input,select,button,textarea')){const it=revItems().find(q=>q.id===tr.dataset.a);if(it&&(!REVSEL||REVSEL.id!==it.id)){REVSEL={sc:it.sc,id:it.id,k:0};requestRender()}}}
function revDown(e){if(!revOn()||e.button>0)return;const td=e.target.closest('td.d');const tr=td&&td.closest('tr.rvrow');if(!tr||!td.classList.contains('on')||tr.classList.contains('rvdel'))return;
  e.stopPropagation();e.preventDefault();const id=tr.dataset.a;const it=revItems().find(q=>q.id===id);if(!it)return;
  const cells=[...tr.querySelectorAll('td.d[data-d]')];const x0=e.clientX;const i0=cells.indexOf(td);const base=REVSEL&&REVSEL.id===id?REVSEL.k:0;REVSEL={sc:it.sc,id,k:base};
  REVDRAG={id,cells,i0,base,moved:false};tr.classList.add('rvdragging');
  const mv=ev=>{const c=document.elementFromPoint(ev.clientX,tr.getBoundingClientRect().top+tr.offsetHeight/2);const td2=c&&c.closest&&c.closest('td.d[data-d]');if(!td2||td2.parentElement!==tr)return;const i1=cells.indexOf(td2);const k=base+(i1-i0);if(k!==REVSEL.k){REVSEL.k=k;REVDRAG.moved=true;revPreview(tr)}};
  const up=()=>{document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);tr.classList.remove('rvdragging');REVDRAG=null;requestRender()};
  document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up)}
function revPreview(tr){const id=tr.dataset.a;const x=S.act.get(id);const it=revItems().find(q=>q.id===id);if(!it||!it.it.after)return;const k=REVSEL.k;const sh=new Set((it.it.after.days||[]).map(d=>wshift(d,k)));
  tr.querySelectorAll('td.d[data-d]').forEach(td=>td.classList.toggle('rvp',k!==0&&sh.has(td.dataset.d)));const lab=tr.querySelector('.rvk');if(lab)lab.textContent=k?`${k>0?'→ +':'← '}${k}d · Enter o ✓ para aceptar así`:''}
function revKey(e){if(!revOn()||!REVSEL)return;const tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select'))return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();REVSEL.k+=(e.key==='ArrowRight'?1:-1);const tr=$(`#grid tr[data-a="${CSS.escape(REVSEL.id)}"]`);if(tr)revPreview(tr)}
  else if(e.key==='Enter'){e.preventDefault();const id=REVSEL.id;const it=revItems().find(q=>q.id===id);if(!it)return;if(REVSEL.k&&it.it.after){const st=[...(it.it.after.days||[])].sort()[0];revDecide(id,'shift',{start:wshift(st,REVSEL.k)})}else revDecide(id,'ok')}
  else if(e.key==='Escape'){REVSEL.k=0;requestRender()}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(e.altKey){e.preventDefault();revGo(e.key==='ArrowDown'?1:-1)}}}
document.addEventListener('keydown',revKey);
function revWire(){const g=$('#gw')||$('#grid');if(g&&!g._rvw){g._rvw=1;g.addEventListener('click',revClick,true);g.addEventListener('pointerdown',revDown,true)}}

function revCellHtml(x,sel){const r=x._rv;const k=revShift(x);let tag='';
  if(r.isNew)tag='<span class="rvtag new">NUEVA</span>';else if(r.del)tag='<span class="rvtag del">QUITAR</span>';
  else{const o=r.off;const t=[];if(k)t.push(`${k>0?'→ +':'← '}${k}d`);const dn=(x.days||[]).length-(o.days||[]).length;if(dn&&!k)t.push(`${dn>0?'+':''}${dn} día${Math.abs(dn)>1?'s':''}`);else if(dn)t.push(`${dn>0?'+':''}${dn}d`);if((o.metrado??null)!==(x.metrado??null))t.push('metrado');if(!t.length&&canon(o.days||[])!==canon(x.days||[]))t.push('días');if((o.name||'')!==(x.name||''))t.push('nombre');tag=t.length?`<span class="rvtag">${t.join(' · ')}</span>`:''}
  const mv=!r.del&&(x.days||[]).length;const kk=sel&&REVSEL?REVSEL.k:0;
  return`<span class="rvb">${tag}<span class="rvk">${kk?`${kk>0?'→ +':'← '}${kk}d · ✓ para aceptar así`:''}</span>${mv?`<button class="rvm" data-rva="l" title="Mover lo propuesto un día hábil antes" aria-label="Un día antes">‹</button><button class="rvm" data-rva="r" title="Mover lo propuesto un día hábil después" aria-label="Un día después">›</button><button class="rvm" data-rva="date" title="Aceptar con otra fecha de inicio…" aria-label="Elegir fecha de inicio">📅</button><i class="rvsep"></i>`:''}<button data-rva="ok" title="Aceptar${kk?' con el desplazamiento':''} (Enter)">✓</button><button data-rva="rej" title="Rechazar">✗</button></span>`}

