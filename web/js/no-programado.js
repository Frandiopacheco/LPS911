"use strict";
/* LPS 911 · Trabajo no programado visto en obra.
   En el recorrido con el celular (Campo › Plano), un toque en un lugar del plano donde no hay nada programado abre una
   ficha rápida: ambiente (sale del punto), subcontratista, qué hacen y foto. Queda en `nprog` con su punto en el plano.
   Lo registran campo, editores, administrador, Calidad y veedores (rol `veedor`). Se cuenta en Campo, Indicadores y los
   reportes; no cambia el PPC ni el cumplimiento del SC. Los registros antiguos (`daily.extra`) se siguen mostrando.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const NPM=new Map();let npSub=null,npFrom=null,npErr=null,NS=null;
const canNP=()=>!!me&&(canDaily||me.role==='veedor'||isCalArea());
/** Registra no programado pero no verifica el avance (veedor, Calidad). */
const VEED=()=>!!me&&!canDaily&&canNP();
const npMine=n=>!!me&&!!n&&(canDaily||n.by===me.email);

function ensureNP(from){if(!db||(npFrom&&from>=npFrom))return;if(npSub)npSub();npFrom=from;
  npSub=fcol('nprog').where('date','>=',from).onSnapshot(sn=>{NPM.clear();sn.docs.forEach(d=>NPM.set(d.id,{...d.data(),id:d.id}));npErr=null;if(ready)requestRender();if(NS&&$('#npsheet'))npDraw()},
    err=>{npErr=err&&err.code||'error';if(ready)requestRender()});
  if(!unsubs.includes(stopNP))unsubs.push(stopNP)}
function stopNP(){if(npSub)npSub();npSub=null;npFrom=null;NPM.clear()}

/** Trabajos no programados de unos días (y pisos): los nuevos (nprog) y los antiguos del registro diario. */
function npItems(dates,vset){const ds=dates instanceof Set?dates:new Set(dates);const out=[];
  for(const doc of DAY.values()){if(!ds.has(doc.date)||(vset&&!vset.has(doc.pisoId)))continue;
    for(const[id,e]of Object.entries(doc.extra||{}))if(e&&!e.del)out.push({id,src:'dx',e,d:doc.date,pid:doc.pisoId,p:S.pis.get(doc.pisoId),a:S.amb.get(e.ambId)})}
  for(const n of NPM.values()){if(n.del||!ds.has(n.date)||(vset&&!vset.has(n.pisoId)))continue;out.push({id:n.id,src:'np',e:n,d:n.date,pid:n.pisoId,p:S.pis.get(n.pisoId),a:S.amb.get(n.ambId)})}
  return out.sort((a,b)=>(a.e.ts||0)-(b.e.ts||0))}
/** Puntos para el plano de Campo */
function npMarks(d,pid){return npItems([d],new Set([pid])).filter(i=>i.src==='np'&&i.e.pt).map(i=>({id:i.id,x:i.e.pt.x,y:i.e.pt.y,v:i.e.pt.v,sc:i.e.sc,c:conOf(i.e.sc).color,t:'+',tip:`${conOf(i.e.sc).name}: ${i.e.desc||''}`}))}

/* ---------- ficha rápida (hoja inferior) ---------- */
function npNew(o){if(!canNP())return;const d=o.d||campoDate();
  if(d>todayIso()){toast('Solo se registra lo que se ve hoy o días pasados.');return}
  const API=window.__plano;const ambId=o.ambId||(o.pt&&API&&API.ambAt?API.ambAt(o.pid,o.pt):'')||'';
  NS={mode:'new',id:'',d,pid:o.pid||(ambId?pisoOfAmb(ambId):(visPisos()[0]||{}).id||''),pt:o.pt||null,ambId,auto:!!ambId,sc:'',desc:'',exec:'',und:'',note:'',photos:[],newPh:[],more:false};npDraw();
  if(!ambId&&o.pt&&API&&API.ambAtP){const ns=NS;API.ambAtP(ns.pid,o.pt).then(a=>{if(NS===ns&&!NS.ambId&&a){NS.ambId=a;NS.auto=true;npDraw()}})}}
function npOpen(id){const n=NPM.get(id);if(!n)return;
  NS={mode:'edit',id,d:n.date,pid:n.pisoId,pt:n.pt||null,ambId:n.ambId||'',auto:false,sc:n.sc||'',desc:n.desc||'',exec:n.exec??'',und:n.und||'',note:n.note||'',photos:[...(n.photos||[])],newPh:[],more:!!(n.exec!=null||n.note),ro:!npMine(n)};npDraw()}
function npClose(){const sh=$('#npsheet');if(sh)sh.remove();NS=null}
function npAmbOpts(pid){const out=[];for(const{p,secs}of tree()){if(p.id!==pid)continue;for(const{s,ambs}of secs)for(const{a}of ambs)out.push({s,a})}return out}
function npScs(pid,ambId){const inA=new Set(),inP=new Set();for(const x of S.act.values()){if(x.ambId===ambId)inA.add(x.sc);else if(pisoOfAct(x.id)===pid)inP.add(x.sc)}
  const rk=c=>inA.has(c.id)?0:inP.has(c.id)?1:2;return[...S.con.values()].sort((a,b)=>rk(a)-rk(b)||a.name.localeCompare(b.name))}
function npActNames(sc,ambId,pid){const seen=new Map();const add=(x,w)=>{const k=an(x.name);if(!x.name||!k)return;const o=seen.get(k);if(!o||o.w>w)seen.set(k,{name:x.name,w})};
  for(const x of S.act.values()){if(x.sc!==sc)continue;if(x.ambId===ambId)add(x,0);else if(pisoOfAct(x.id)===pid)add(x,1);else add(x,2)}
  return[...seen.values()].sort((a,b)=>a.w-b.w||a.name.localeCompare(b.name)).slice(0,8).map(o=>o.name)}
function npDraw(){if(!NS)return;const n=NS.mode==='edit'?NPM.get(NS.id):null;const ro=!!NS.ro;const p=S.pis.get(NS.pid);const am=S.amb.get(NS.ambId);
  const ambs=npAmbOpts(NS.pid);const scs=npScs(NS.pid,NS.ambId);const names=NS.sc?npActNames(NS.sc,NS.ambId,NS.pid):[];const linked=n&&n.actId&&S.act.get(n.actId);
  let h=`<div class="ksh"><i class="kn npk" aria-hidden="true">+</i><div><b>Trabajo no programado</b><span>${esc(p?p.code+' · '+p.name:'')} · ${DOWN[(pd(NS.d).getUTCDay()+6)%7]} ${fmtD(NS.d)}${NS.pt?' · punto marcado en el plano':''}</span>${n?`<span>Registrado por ${esc(n.byName||n.by||'')} · ${hhmm(n.ts)}</span>`:''}</div><button class="kx" data-npx aria-label="Cerrar">×</button></div>`;
  h+=`<div class="ksl">Ambiente${NS.auto?' <span class="mu">· según el punto que tocaste</span>':''}</div>
    <select class="kin" id="npamb"${ro?' disabled':''} aria-label="Ambiente"><option value="">— elige el ambiente —</option>${ambs.map(({s,a})=>`<option value="${a.id}"${a.id===NS.ambId?' selected':''}>${esc(s.code)} · ${esc(a.code)} · ${esc(a.name)}</option>`).join('')}</select>`;
  h+=`<div class="ksl">¿Quién trabaja?</div><div class="kchips kw">${scs.map(c=>`<button class="${NS.sc===c.id?'on':''}" data-npsc="${c.id}" style="--c:${c.color}"${ro?' disabled':''}><i></i>${esc(c.name)}</button>`).join('')}</div>`;
  h+=`<div class="ksl">¿Qué están haciendo?</div>${names.length&&!ro?`<div class="kchips kw">${names.map(t=>`<button class="${NS.desc===t?'on':''}" data-npd="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''}
    <input class="kin" id="npdesc" value="${esc(NS.desc)}" placeholder="${NS.sc?'Elige arriba o escribe':'Primero elige el subcontratista'}" aria-label="Qué están haciendo"${ro?' readonly':''}>`;
  const ph=[...NS.photos.map(id=>{loadFoto(id);return`<div class="th"><img data-ph="${id}" src="${FOTO.get(id)||''}" alt="Foto">${ro?'':`<button data-npphx="${id}" aria-label="Quitar foto">&times;</button>`}</div>`}),
    ...NS.newPh.map((src,i)=>`<div class="th"><img src="${src}" alt="Foto nueva"><button data-npphn="${i}" aria-label="Quitar foto">&times;</button></div>`)].join('');
  h+=`<div class="cph npph">${ph}${ro?'':`<label class="kph">${CAM} Foto<input type="file" accept="image/*" capture="environment" id="npfoto" hidden></label>`}</div>`;
  if(NS.more||ro)h+=`<div class="row2 nprow"><input class="kin" id="npexec" inputmode="decimal" value="${esc(String(NS.exec??''))}" placeholder="Cantidad (opcional)" aria-label="Cantidad"${ro?' readonly':''}><input class="kin" id="npund" value="${esc(NS.und)}" placeholder="Und" aria-label="Unidad"${ro?' readonly':''}></div>
    <input class="kin" id="npnote" value="${esc(NS.note)}" placeholder="Comentario (opcional)" aria-label="Comentario"${ro?' readonly':''}>`;
  else h+=`<button class="lnkb npmore" data-npmore>+ Cantidad y comentario</button>`;
  if(linked)h+=`<p class="knote">Ya está en el lookahead: <b>${esc(linked.name)}</b>.</p>`;
  if(ro)h+=`<p class="knote">Lo registró otra persona: solo quien lo registró o el ingeniero de campo lo pueden cambiar.</p><div class="kbtns"><button class="kbig ghost" data-npx>Cerrar</button></div>`;
  else h+=`<div class="kbtns"><button class="kbig pri" data-npa="save"${NS.busy?' disabled':''}>${NS.mode==='edit'?'Guardar cambios':'Guardar'}</button>
    ${n&&canWrite&&!linked?'<button class="kbig ghost" data-npa="look">Pasarlo al lookahead (este día)</button>':''}
    ${n?'<button class="kbig ghost npdel" data-npa="del">Anular este registro</button>':''}</div>
    <p class="knote">Queda como trabajo <b>no programado</b> del día: se cuenta en Campo e Indicadores, no cambia el PPC.</p>`;
  let sh=$('#npsheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='npsheet';sh.innerHTML='<div class="ksc" role="dialog" aria-modal="true" aria-label="Trabajo no programado"></div>';document.body.appendChild(sh);
    sh._open=NOW();sh.onclick=npClick;sh.onchange=npChange;sh.oninput=npInput}
  const sc=sh.firstChild;if(sc.dataset.h!==h){const st=sc.scrollTop;sc.innerHTML=h;sc.dataset.h=h;sc.scrollTop=st}}
function npInput(e){const t=e.target;if(!NS)return;if(t.id==='npdesc')NS.desc=t.value;else if(t.id==='npexec')NS.exec=t.value;else if(t.id==='npund')NS.und=t.value;else if(t.id==='npnote')NS.note=t.value}
async function npChange(e){const t=e.target;if(!NS)return;
  if(t.id==='npamb'){NS.ambId=t.value;NS.auto=false;npDraw();return}
  if(t.id==='npfoto'&&t.files[0]){const f=t.files[0];t.value='';try{toast('Comprimiendo foto…');NS.newPh.push(await shrinkPhoto(f));npDraw()}catch(err){toast(err.message)}}}
function npClick(e){const t=e.target;const sh=$('#npsheet');if(t===sh&&NOW()-(sh._open||0)<600)return;if(t===sh||t.closest('[data-npx]')){npClose();return}if(!NS)return;let b;
  const ph=t.closest('img[data-ph],.npph img');if(ph&&ph.src){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-x="1">Cerrar</button></div><img src="${ph.src}" alt="">`;lb.onclick=ev=>{if(ev.target.dataset.x||ev.target===lb)lb.remove()};document.body.appendChild(lb);return}
  if(NS.ro)return;
  if((b=t.closest('[data-npsc]'))){NS.sc=b.dataset.npsc;npDraw();return}
  if((b=t.closest('[data-npd]'))){NS.desc=b.dataset.npd;npDraw();return}
  if(t.closest('[data-npmore]')){NS.more=true;npDraw();setTimeout(()=>{const i=$('#npexec');if(i)i.focus()},30);return}
  if((b=t.closest('[data-npphx]'))){NS.photos=NS.photos.filter(i=>i!==b.dataset.npphx);npDraw();return}
  if((b=t.closest('[data-npphn]'))){NS.newPh.splice(+b.dataset.npphn,1);npDraw();return}
  if((b=t.closest('[data-npa]'))){const k=b.dataset.npa;if(k==='save')npSave();else if(k==='del')npDel();else if(k==='look')npToLook()}}

function npSave(){if(!NS||!db)return;const desc=NS.desc.trim();
  if(!NS.sc){toast('Elige quién está trabajando.');return}if(!desc){toast('Escribe o elige qué están haciendo.');return}
  if(!NS.ambId&&!NS.pt){toast('Elige el ambiente.');return}
  const ex=NS.exec===''||NS.exec==null?null:parseNum(String(NS.exec));if(Number.isNaN(ex)){toast('La cantidad debe ser un número.');return}
  const id=NS.id||uid('np');const pid=NS.ambId?pisoOfAmb(NS.ambId)||NS.pid:NS.pid;const old=NPM.get(id);
  const fids=NS.newPh.map(data=>{const fid=uid('f');FOTO.set(fid,data);fcol('fotos').doc(fid).set({data,date:NS.d,pisoId:pid,npId:id,by:me.email,ts:NOW()}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));return fid});
  const gone=old?(old.photos||[]).filter(f=>!NS.photos.includes(f)):[];
  const doc={...(old||{}),date:NS.d,pisoId:pid,ambId:NS.ambId||'',sc:NS.sc,desc,exec:ex,und:NS.und.trim().toUpperCase(),note:NS.note.trim(),photos:[...NS.photos,...fids],pt:NS.pt||null,
    by:old?old.by:me.email,byName:old?old.byName:(me.name||me.email),ts:old?old.ts:NOW(),...(old?{ed:{by:me.email,n:me.name||me.email,t:NOW()}}:{})};delete doc.id;
  NPM.set(id,{...doc,id});fcol('nprog').doc(id).set(doc).catch(err=>{toast('No se pudo guardar: '+(err.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(err.code||err.message)))});
  gone.forEach(f=>{if(canDaily)fcol('fotos').doc(f).delete().catch(()=>{})});
  toast(old?'Cambios guardados':`No programado registrado${fids.length?' con foto':''}`);npClose();requestRender()}
async function npDel(){const n=NS&&NPM.get(NS.id);if(!n)return;if(!await uiAsk({title:'¿Anular este registro?',text:'El trabajo no programado queda anulado (no se borra).',ok:'Anular',tone:'danger'}))return;
  const doc={...n,del:true,ed:{by:me.email,n:me.name||me.email,t:NOW()}};delete doc.id;NPM.set(n.id,{...doc,id:n.id});
  fcol('nprog').doc(n.id).set(doc).catch(err=>toast('No se pudo anular: '+(err.code||err.message)));toast('Registro anulado');npClose();requestRender()}
/** El ingeniero lo pasa al lookahead: una actividad nueva en ese ambiente con ese día marcado. */
function npToLook(){const n=NS&&NPM.get(NS.id);if(!n||!canWrite)return;if(!n.ambId){toast('Primero elige el ambiente.');return}
  const sib=siblings('acts','ambId',n.ambId);const last=sib[sib.length-1];const aid=uid('act');
  /* si el día está cerrado (lockGuard) no se crea nada: el registro queda sin enlace y sin aviso de éxito */
  apply([op('acts',aid,{id:aid,ambId:n.ambId,sc:n.sc,name:n.desc,und:n.und||'',metrado:null,days:[n.date],order:last?last.order+10:10})],'Trabajo no programado pasado al lookahead',()=>{if(!S.act.has(aid))return;
  const doc={...n,actId:aid};delete doc.id;NPM.set(n.id,{...doc,id:n.id});fcol('nprog').doc(n.id).set(doc).catch(()=>{});
  toast('Agregado al lookahead en '+(S.amb.get(n.ambId)||{}).code);npClose()})}

/* ---------- lista del día (Campo › Tarjetas y debajo del plano) ---------- */
function npCard(i){const e=i.e;const c=conOf(e.sc);const am=i.a;const legacy=i.src==='dx';
  return`<article class="cc st-np npc" data-np="${esc(i.id)}" data-src="${i.src}" data-pid="${esc(i.pid)}" style="--c:${c.color}"><div class="cct"><b>${esc(e.desc||'')}</b><span>${am?esc(am.code+' · '+am.name):'sin ambiente'} · ${esc(c.name)}${e.exec!=null?` · ${fq(e.exec)} ${esc(e.und||'')}`:''}${e.actId&&S.act.get(e.actId)?' · <em>ya en el lookahead</em>':''}</span></div>${e.note?`<div class="note">${esc(e.note)}</div>`:''}
    ${(e.photos||[]).length?`<div class="cph">${(e.photos||[]).map(id=>{loadFoto(id);return`<div class="th"><img data-ph="${id}" src="${FOTO.get(id)||''}" alt="Foto"></div>`}).join('')}</div>`:''}
    <div class="cby"><span>${esc(e.byName||e.by||'')} · ${hhmm(e.ts)}${e.pt?' · 📍 en el plano':''}</span>${legacy?(canDaily?'<button class="lnkb" data-npdx>Eliminar</button>':''):`<button class="lnkb" data-npo>${npMine(e)?'Editar':'Ver'}</button>`}</div></article>`}
function npListHtml(d,vset,f){const L=npItems([d],vset).filter(i=>!f||f(i));if(!L.length)return'';
  return`<div class="camb npsec">Trabajo no programado <b>${L.length}</b></div>${L.map(npCard).join('')}`}
/* clics de las tarjetas (Campo › Tarjetas y Plano) */
document.addEventListener('click',e=>{const t=e.target;const art=t.closest&&t.closest('article[data-np]');if(!art||t.closest('#npsheet'))return;
  if(t.closest('img[data-ph]'))return;
  if(art.dataset.src==='np'){e.stopPropagation();npOpen(art.dataset.np);return}
  if(t.closest('[data-npdx]')&&canDaily){e.stopPropagation();const doc=DAY.get(dayId(campoDate(),art.dataset.pid));const ex=doc&&doc.extra&&doc.extra[art.dataset.np];if(ex)writeDaily(campoDate(),art.dataset.pid,{extra:{[art.dataset.np]:{...ex,del:true}}});toast('Registro eliminado')}},true);
/* en el Plan diario: abrir lo visto en obra desde la lista */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-npo]');if(!b)return;e.stopPropagation();e.preventDefault();npOpen(b.dataset.npo)},true);
