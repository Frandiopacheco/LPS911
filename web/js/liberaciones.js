"use strict";
/* LPS 911 · Liberaciones de calidad.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 36 · Liberaciones de calidad
   lib/{id}: {actId,ambId,pisoId,sc,rule,crit,sup,rest,need,slot,st,prog:{d,h,insp},obs:[{t,ok}],photos:[],proto:[],late,note,hist:[],by,n,ts}
   st: sol (solicitada) · pro (programada) · obs (observada) · lev (observaciones levantadas) · lib (liberada) · libm (liberada con obs. menores) · anu (anulada)
   Matriz en meta/project.libm: [{id,par,act,crit,rest,sup,proto,ant}]
   Una liberación crítica no liberada es una RESTRICCIÓN de la actividad que restringe (mismo ambiente): se calcula, no se guarda.
   ===================================================================== */
const LIB=new Map();let libSub=null,libErr=null,libVer=0,libLoaded=false;
const LST={sol:{t:'Solicitada',c:'#6B747B'},pro:{t:'Programada',c:'#1F5F7A'},obs:{t:'Observada',c:'#9A6A12'},lev:{t:'Levantada · por reinspeccionar',c:'#B7791F'},lib:{t:'Liberada',c:'#2E7D4F'},libm:{t:'Liberada con obs. menores',c:'#2E7D4F'},anu:{t:'Anulada',c:'#9AA3A8'},sin:{t:'Pendiente de solicitar',c:'#B83A2E'}};
const libDone=st=>st==='lib'||st==='libm';
function ensureLib(){if(libSub||!db)return;libSub=fcol('lib').onSnapshot(sn=>{LIB.clear();sn.docs.forEach(d=>LIB.set(d.id,{...d.data(),id:d.id}));libErr=null;libLoaded=true;libVer++;LIBC.ver=-1;if(ready)requestRender()},err=>{libErr=err&&err.code||'error';if(ready&&U.tab==='lib')requestRender()});
  libmSub=fcol('libm').doc('main').onSnapshot(d=>{LIBM=d.exists?d.data():null;libmVer++;if(ready)requestRender()},()=>{});
  unsubs.push(()=>{if(libSub)libSub();libSub=null;LIB.clear();if(libmSub)libmSub();libmSub=null;LIBM=null})}
/* quién hace qué */
function isCal(){return!!me&&(isAdmin||(AREA()&&/calidad/i.test(me.area||'')))}
function canLibAsk(x){if(!me||!x)return false;if(isCal()||(canWrite&&!PM()))return true;return SCK()&&myScsI().includes(x.sc)}
/* matriz */
/* matriz amarrada al lookahead: cada regla apunta a entradas del CATÁLOGO (subcontratista + nombre normalizado de la actividad).
   libm/main: {rules:[{id,keys:[clave…],sc,act,crit,rest:[clave…],restName,sup,proto,ant}],by,n,ts} · la editan Calidad y el administrador.
   Reglas antiguas (texto: par/act/rest) se siguen reconociendo por "el nombre contiene". */
let LIBM=null,libmSub=null,libmVer=0;
const nrm=v=>fold(v).replace(/[^a-z0-9ñ]+/g,' ').trim();
const keyOf=x=>(x&&x.sc||'')+'|'+nrm(x&&x.name);
const libRules=()=>LIBM&&Array.isArray(LIBM.rules)?LIBM.rules:(Array.isArray(P().libm)?P().libm:[]);
const canLibMatrix=()=>!!me&&(isAdmin||(AREA()&&/calidad/i.test(me.area||'')));
const LIBC={rv:'',byKey:new Map(),legacy:[],bt:0,blocks:null,bsig:''};
function libIdx(){const R=libRules();const rv=libmVer+'|'+R.length+'|'+(LIBM?1:0)+'|'+(Array.isArray(P().libm)?P().libm.length:0);if(LIBC.rv!==rv){LIBC.rv=rv;LIBC.byKey=new Map();LIBC.legacy=[];
  for(const r of R){if(Array.isArray(r.keys)&&r.keys.length)r.keys.forEach(k=>LIBC.byKey.set(k,r));else if(r.act)LIBC.legacy.push(r)}}return LIBC}
const libEx=()=>(LIBM&&LIBM.ex)||{};
/* ¿las críticas pendientes se vuelven restricción de la partida siguiente? (por ahora no; se activa en la Matriz) */
const libAuto=()=>!!(LIBM&&LIBM.autoRestr);
function libRuleOf(x){if(!x)return null;const ex=libEx()[x.id];if(ex==='no')return null;const C=libIdx();if(ex){const fr=libRules().find(q=>q.id===ex);if(fr)return fr}const r=C.byKey.get(keyOf(x));if(r)return r;if(!C.legacy.length)return null;
  const n=fold(x.name);const con=conOf(x.sc);const cp=fold((con.partida||'')+' '+(con.name||''));let best=null,bl=-1;
  for(const q of C.legacy){const a=fold(q.act);if(!a||!n.includes(a))continue;let sc=a.length;if(q.par&&cp.includes(fold(q.par)))sc+=1000;if(sc>bl){bl=sc;best=q}}return best}
const libRestHit=(r,y)=>Array.isArray(r.rest)?r.rest.includes(keyOf(y)):(!!r.rest&&fold(y.name).includes(fold(r.rest)));
const libRestName=r=>Array.isArray(r.rest)?(r.restName||''):(r.rest||'');
function libOf(aid){let b=null;for(const l of LIB.values()){if(l.actId!==aid||l.st==='anu')continue;if(!b||(l.ts||0)>(b.ts||0))b=l}return b}
function libState(x){const l=libOf(x.id);return l?l.st:(libRuleOf(x)?'sin':'')}
/* bloqueos: actividad que no puede entrar porque la crítica anterior de su ambiente no está liberada (se recalcula como máximo cada 0,4 s) */
function libBlocks(){if(!libLoaded||!libRules().length)return[];const sig=libIdx().rv+'|'+libVer+'|'+S.act.size;if(LIBC.blocks&&LIBC.bsig===sig&&NOW()-LIBC.bt<400)return LIBC.blocks;
  const out=[];const byAmb=new Map();for(const x of S.act.values()){if(!byAmb.has(x.ambId))byAmb.set(x.ambId,[]);byAmb.get(x.ambId).push(x)}const t0=todayIso();
  for(const L of byAmb.values())for(const p of L){const r=libRuleOf(p);if(!r||!r.crit||!(Array.isArray(r.rest)?r.rest.length:r.rest))continue;const l=libOf(p.id);if(l&&libDone(l.st))continue;
    for(const y of L){if(y.id===p.id||!libRestHit(r,y))continue;const fut=(y.days||[]).filter(d=>d>=t0).sort();if(!fut.length||(typeof doneOf==='function'&&doneOf(y)))continue;out.push({y,p,r,l,need:fut[0]})}}
  LIBC.blocks=out;LIBC.bsig=sig;LIBC.bt=NOW();return out}
/* catálogo: actividades distintas del lookahead (por subcontratista) */
function libCatalog(){const m=new Map();for(const x of S.act.values()){const k=keyOf(x);if(!nrm(x.name))continue;let e=m.get(k);if(!e){e={key:k,sc:x.sc,names:new Map(),n:0,ambs:new Set()};m.set(k,e)}e.n++;e.ambs.add(x.ambId);e.names.set(x.name,(e.names.get(x.name)||0)+1)}
  for(const e of m.values())e.name=[...e.names.entries()].sort((a,b)=>b[1]-a[1])[0][0];return m}
/* lo que suele venir después en el mismo ambiente (para sugerir qué restringe) */
function libNext(key){const byAmb=new Map();for(const x of S.act.values()){if(!(x.days||[]).length)continue;if(!byAmb.has(x.ambId))byAmb.set(x.ambId,[]);byAmb.get(x.ambId).push(x)}
  const cnt=new Map();let tot=0;for(const L of byAmb.values()){const A=L.filter(x=>keyOf(x)===key);if(!A.length)continue;const a0=A.flatMap(x=>x.days).sort()[0];
    let best=null,bs='9';for(const y of L){if(keyOf(y)===key)continue;const y0=[...(y.days||[])].sort()[0];if(y0&&y0>a0&&y0<bs){bs=y0;best=keyOf(y)}}if(best){tot++;cnt.set(best,(cnt.get(best)||0)+1)}}
  return{tot,list:[...cnt.entries()].sort((a,b)=>b[1]-a[1]).map(([k,c])=>({k,c}))}}
const libTok=s=>new Set(nrm(s).split(' ').filter(w=>w.length>2));
function libSimilar(a,b){if(a.includes(b)||b.includes(a))return 1;const A=libTok(a),B=libTok(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(w=>{if(B.has(w))i++});return i/Math.min(A.size,B.size)}
function libmSave(rules,msg){return libmPut({rules},msg)}
const libInsp=()=>(LIBM&&Array.isArray(LIBM.insp))?LIBM.insp:[];
function libmPut(patch,msg){const doc={rules:libRules(),ign:(LIBM&&LIBM.ign)||[],ex:libEx(),autoRestr:libAuto(),insp:libInsp(),...patch,by:me.email,n:me.name||me.email,ts:NOW()};LIBM=doc;libmVer++;LIBC.rv='';requestRender();
  return fcol('libm').doc('main').set(doc).then(()=>{if(msg)toast(msg)}).catch(err=>toast('No se pudo guardar la matriz: '+(err.code==='permission-denied'?'solo Calidad o el administrador pueden editarla':(err.code||err.message))))}
function libBlockMap(){const m=new Map();for(const b of libBlocks())m.set(b.y.id,(m.get(b.y.id)||0)+1);return m}
function libBadge(x){const st=libState(x);if(!st)return'';const s=LST[st];const l=libOf(x.id);const r=libRuleOf(x);
  return`<span class="lqbadge" data-lqact="${x.id}" role="button" tabindex="0" style="--c:${s.c}" title="Liberación: ${esc(s.t)}${l&&l.prog&&l.prog.d?' · '+fmtD(l.prog.d)+(l.prog.h?' '+esc(l.prog.h):''):''}${r&&r.crit?' · crítica: restringe '+esc(libRestName(r)):''}">◆</span>`}
/* --- escritura --- */
function libHist(l,st,note){return[...(l&&l.hist||[]),{st,t:NOW(),by:me.email,n:me.name||me.email,note:note||''}].slice(-30)}
function libSave(id,data,msg){LIB.set(id,{...(LIB.get(id)||{}),...data,id});libVer++;LIBC.ver=-1;requestRender();
  return fcol('lib').doc(id).set(data,{merge:true}).then(()=>{if(msg)toast(msg)}).catch(err=>toast('No se pudo guardar la liberación: '+(err.code==='permission-denied'?'sin permiso':(err.code||err.message))))}
async function libFile(file){if(/^image\//.test(file.type))return shrinkPhoto(file);
  if(file.type==='application/pdf'){if(file.size>280*1024)throw new Error('El PDF pesa más de 280 KB. Guárdalo más liviano o adjunta una foto del protocolo.');return await new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>ko(new Error('No se pudo leer el PDF'));r.readAsDataURL(file)})}
  throw new Error('Adjunta una imagen o un PDF.')}
async function libAttach(file,libId){const data=await libFile(file);const fid=uid('f');FOTO.set(fid,data);await fcol('fotos').doc(fid).set({data,libId,by:me.email,ts:NOW(),kind:data.startsWith('data:application/pdf')?'pdf':'img'});return fid}
function libOpenFile(fid){const d=FOTO.get(fid);if(!d){loadFoto(fid);toast('Cargando el archivo… vuelve a tocarlo en un momento.');return}
  if(d.startsWith('data:application/pdf')){const b=atob(d.split(',')[1]);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const url=URL.createObjectURL(new Blob([u],{type:'application/pdf'}));window.open(url,'_blank');setTimeout(()=>URL.revokeObjectURL(url),60000)}else lightbox(d)}
/* plazo: un día antes, hasta las 18:00 */
function libLate(need){const t=todayIso();if(need<=t)return true;const tm=wshift(t,1);return need===tm&&nowHM()>='18:00'}
/* --- ventana modal propia (formularios de liberación) --- */
function lqModal(html,onClick,onChange){let el=$('#lqm');if(!el){el=document.createElement('div');el.id='lqm';el.className='lqm';document.body.appendChild(el)}
  el.innerHTML=`<div class="lqc" role="dialog" aria-modal="true">${html}</div>`;el.onclick=e=>{if(e.target===el||e.target.closest('[data-lqx]')){lqClose();return}onClick&&onClick(e)};el.onchange=e=>onChange&&onChange(e);
  setTimeout(()=>{const f=el.querySelector('input,select,textarea');if(f)f.focus()},40)}
function lqClose(){const el=$('#lqm');if(el)el.remove()}
function lqHead(x,r){const a=S.amb.get(x.ambId);const p=S.pis.get(pisoOfAct(x.id));const sc=a&&S.sec.get(a.sectorId);
  return`<div class="lqh"><b>${esc(x.name||'(sin nombre)')}</b><span>${esc([p&&p.code,sc&&sc.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · '))} · ${esc(conOf(x.sc).name)}</span>
   <span class="lqtags">${r&&r.crit?`<i class="lqt crit">CRÍTICA${libRestName(r)?' · restringe '+esc(libRestName(r)):''}</i>`:''}${r&&r.sup?'<i class="lqt sup">REQUIERE SUPERVISIÓN</i>':''}${r?'':'<i class="lqt">No está en la matriz</i>'}</span>${r&&(r.proto||r.ant)?`<span class="mu">Según la matriz: ${esc([r.proto,r.ant?'se pide '+(r.ant==1?'un día':r.ant+' días')+' antes':''].filter(Boolean).join(' · '))}</span>`:''}</div>`}
/* solicitar */
function libAsk(aid,opt){opt=opt||{};const x=S.act.get(aid);if(!x)return;if(!canLibAsk(x)){toast('Solo el subcontratista de la partida, el ingeniero de producción o Calidad pueden solicitarla.');return}
  const cur=libOf(aid);if(cur&&!libDone(cur.st)){libDetail(cur.id);return}const r=libRuleOf(x);const t0=todayIso();const fut=(x.days||[]).filter(d=>d>=t0).sort();const def=fut.length?fut[fut.length-1]:wshift(t0,1);
  const zf=window.__plano&&window.__plano.zoneFor?window.__plano.zoneFor(aid):null;const zd=zf&&zf.pisoId===pisoOfAct(aid)?{pts:zf.pts,vista:zf.vista,pisoId:zf.pisoId}:null;
  const F={need:def<=t0?wshift(t0,1):def,slot:'am',note:'',proto:[],zona:opt.zona||zd||null,zsrc:opt.zona?'mano':zd?'plan':''};
  const draw=()=>{const late=libLate(F.need);lqModal(`<div class="lqtop"><b>Solicitar liberación</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${lqHead(x,r)}
    <div class="lq2"><label>Fecha en que estará lista<input type="date" id="lqd" value="${F.need}" min="${t0}"></label><label>Hora sugerida<select id="lqs"><option value="am"${F.slot==='am'?' selected':''}>Mañana (08:00–12:00)</option><option value="pm"${F.slot==='pm'?' selected':''}>Tarde (13:00–17:00)</option></select></label></div>
    <p class="lqmsg ${late?'bad':'ok'}">${late?'Fuera de plazo: las liberaciones se piden un día antes (hasta las 18:00). Calidad decidirá si la programa.':'✓ Dentro del plazo.'}</p>
    <p class="lqmsg ${F.zona?'ok':''}">${F.zsrc==='mano'?'✓ Zona marcada en el plano.':F.zsrc==='plan'?'✓ Zona tomada del plan diario (puedes cambiarla en la vista Plano).':'Sin zona en el plano: podrás ubicarla después en la vista Plano.'}</p>
    <label>Protocolo (opcional, imagen o PDF)<span class="lqrow"><span class="lqfile">${F.proto.length?F.proto.length+' archivo(s) adjunto(s)':'Sin adjuntar'}</span><label class="ib">Adjuntar…<input type="file" accept="image/*,application/pdf" id="lqf" hidden></label></span></label>
    <label>Comentario para Calidad<textarea id="lqn" rows="3" placeholder="Ej.: prueba hidráulica a 100 psi lista desde las 8:00">${esc(F.note)}</textarea></label>
    <div class="lqbtns">${canLibMatrix()&&r?'<button class="ib" data-lq="exno" style="margin-right:auto" title="Excepción: esta actividad puntual no la necesita">No requiere liberación</button>':''}<button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-lq="send">Enviar solicitud</button></div>`,
   e=>{if(e.target.closest('[data-lq="exno"]')){libSetEx(x.id,'no','Excepción: esta actividad no requiere liberación');lqClose();return}if(e.target.closest('[data-lq="send"]')){F.note=($('#lqn')||{}).value||'';const id=uid('lib');const a=S.amb.get(x.ambId);
      libSave(id,{actId:x.id,ambId:x.ambId,pisoId:pisoOfAct(x.id),sc:x.sc,nm:x.name||'',rule:r?r.id:'',crit:!!(r&&r.crit),sup:!!(r&&r.sup),rest:r?libRestName(r):'',need:F.need,slot:F.slot,note:F.note.trim(),proto:F.proto,photos:[],obs:[],zona:F.zona||null,st:'sol',late:libLate(F.need),prog:null,hist:libHist(null,'sol',F.note.trim()),by:me.email,n:me.name||me.email,ts:NOW()},'Solicitud enviada a Calidad');lqClose()}},
   async e=>{const t=e.target;if(t.id==='lqd'){F.need=t.value;F.note=($('#lqn')||{}).value||'';draw()}if(t.id==='lqs')F.slot=t.value;
     if(t.id==='lqf'&&t.files[0]){F.note=($('#lqn')||{}).value||'';try{toast('Adjuntando…');const fid=await libAttach(t.files[0],'');F.proto.push(fid);draw()}catch(err){toast(err.message)}}})};draw()}
/* detalle con acciones según el rol y el estado */
function libDetail(id){const l=LIB.get(id);if(!l){lqClose();return}const x=S.act.get(l.actId)||{id:l.actId,name:l.nm||'(actividad eliminada)',sc:l.sc,ambId:l.ambId};const r=libRules().find(q=>q.id===l.rule)||null;const s=LST[l.st]||LST.sol;
  const cal=isCal();const own=canLibAsk(x);const files=[...(l.proto||[]).map(f=>({f,k:'Protocolo'})),...(l.photos||[]).map(f=>({f,k:'Foto'}))];files.forEach(o=>loadFoto(o.f));
  const blk=libBlocks().filter(b=>b.p.id===l.actId);
  let h=`<div class="lqtop"><span class="mono mu">${esc(id.slice(-6).toUpperCase())}</span><i class="lqst" style="--c:${s.c}">${esc(s.t)}</i>${l.late?'<i class="lqt crit">FUERA DE PLAZO</i>':''}<span style="flex:1"></span><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${lqHead(x,r||{crit:l.crit,sup:l.sup,rest:l.rest})}
   <p class="lqmsg">Lista para el <b>${fmtD(l.need)}</b> (${l.slot==='pm'?'tarde':'mañana'})${l.prog&&l.prog.d?` · inspección <b>${fmtD(l.prog.d)}${l.prog.h?' '+esc(l.prog.h):''}</b>${l.prog.insp?' · '+esc(l.prog.insp):''}`:''}</p>
   ${blk.length?`<p class="lqmsg ${libAuto()?'bad':''}">${libAuto()?'⛔ Mientras no se libere, restringe':'Partida siguiente que depende de esta liberación'}: ${blk.map(b=>esc(b.y.name)+' ('+fmtD(b.need)+')').join(', ')}</p>`:''}
   ${l.note?`<p class="lqmsg">“${esc(l.note)}”</p>`:''}
   ${(l.obs||[]).length?`<div class="lqobs"><b>Observaciones de Calidad</b>${l.obs.map((o,i)=>`<label><input type="checkbox" data-lqo="${i}"${o.ok?' checked':''}${own||cal?'':' disabled'}> ${esc(o.t)}</label>`).join('')}</div>`:''}
   ${files.length?`<div class="lqfiles">${files.map(o=>{const d=FOTO.get(o.f)||'';const pdf=d.startsWith('data:application/pdf');return`<button type="button" class="lqfb" data-lqfile="${o.f}" title="${o.k}">${pdf||!d?`<span>${pdf?'PDF':'…'}</span>`:`<img src="${d}" alt="${o.k}">`}<small>${o.k}</small></button>`}).join('')}</div>`:''}
   <ol class="lqtl">${(l.hist||[]).slice().reverse().map(e=>`<li><i style="--c:${(LST[e.st]||LST.sol).c}"></i><b>${esc((LST[e.st]||{t:e.st}).t)}</b> <span>${e.t?fmtD(ldt(e.t))+' '+hhmm(e.t):''} · ${esc(e.n||'')}${e.note?' · '+esc(e.note):''}</span></li>`).join('')}</ol>`;
  const B=[];
  if(cal&&['sol','lev','pro'].includes(l.st))B.push(`<button class="ib${l.st==='pro'?'':' pri'}" data-lq="prog">${l.st==='pro'?'Reprogramar':'Programar inspección'}</button>`);
  if(cal&&['pro','lev','sol'].includes(l.st)){B.push('<button class="ib okb" data-lq="lib">✓ Liberar</button>');B.push('<button class="ib" data-lq="libm">✓ Liberar con obs. menores</button>');B.push('<button class="ib" data-lq="obs">⚠ Observar…</button>')}
  if(own&&l.st==='obs')B.push('<button class="ib pri" data-lq="lev">Observaciones levantadas · pedir reinspección</button>');
  if((own||cal)&&!libDone(l.st))B.push('<label class="ib">+ Foto / protocolo<input type="file" accept="image/*,application/pdf" id="lqadd" hidden></label>');
  if(cal&&libDone(l.st))B.push('<button class="ib" data-lq="reab">Reabrir</button>');
  if((own||cal)&&['sol','pro'].includes(l.st))B.push('<button class="ib" data-lq="anu">Anular solicitud</button>');
  if((own||cal)&&l.st==='pro')B.push(`<button class="ib" data-lq="zona">${l.zona?'Reubicar en el plano':'Ubicar en el plano'}</button>`);
  if(S.act.has(l.actId))B.push(`<button class="ib" data-lq="go">Ver en el lookahead ↗</button>`);
  h+=`<div class="lqbtns lqbw">${B.join('')}</div>`;
  lqModal(h,e=>{const t=e.target;let b;
    if((b=t.closest('[data-lqfile]'))){libOpenFile(b.dataset.lqfile);return}
    if(!(b=t.closest('[data-lq]')))return;const k=b.dataset.lq;
    if(k==='go'){lqClose();gotoAct(l.actId);return}
    if(k==='zona'){lqClose();LQDRAW={libId:id,actId:l.actId,pid:l.pisoId};U.tab='lib';U.libV='map';U.libP=l.pisoId;saveUI();render();return}
    if(k==='prog'){libProg(id);return}
    if(k==='lib'||k==='libm'){const note=k==='libm'?(prompt('¿Qué observación menor queda pendiente?','')||''):'';if(k==='libm'&&!note.trim()){toast('Escribe la observación menor.');return}
      libSave(id,{st:k,done:{t:NOW(),by:me.email,n:me.name||me.email},hist:libHist(l,k,note.trim()),...(note.trim()?{obs:[...(l.obs||[]),{t:note.trim(),ok:false,menor:true}]}:{})},k==='lib'?'Liberada':'Liberada con observaciones menores');setTimeout(()=>libDetail(id),80);return}
    if(k==='obs'){libObs(id);return}
    if(k==='lev'){const note=prompt('¿Qué se corrigió? (opcional)','')||'';libSave(id,{st:'lev',hist:libHist(l,'lev',note.trim()),obs:(l.obs||[]).map(o=>({...o,ok:true}))},'Calidad verá que pides reinspección');setTimeout(()=>libDetail(id),80);return}
    if(k==='reab'){const st=l.prog&&l.prog.d?'pro':'sol';libSave(id,{st,hist:libHist(l,st,'Reabierta')},'Liberación reabierta');setTimeout(()=>libDetail(id),80);return}
    if(k==='anu'){if(!confirm('¿Anular esta solicitud de liberación?'))return;libSave(id,{st:'anu',hist:libHist(l,'anu','')},'Solicitud anulada');lqClose();return}},
   async e=>{const t=e.target;
    if(t.dataset.lqo!=null){const i=+t.dataset.lqo;const obs=(l.obs||[]).map((o,j)=>j===i?{...o,ok:t.checked}:o);libSave(id,{obs});return}
    if(t.id==='lqadd'&&t.files[0]){try{toast('Adjuntando…');const fid=await libAttach(t.files[0],id);const pdf=(FOTO.get(fid)||'').startsWith('data:application/pdf');const cur=LIB.get(id)||l;
      libSave(id,pdf?{proto:[...(cur.proto||[]),fid]}:{photos:[...(cur.photos||[]),fid]},'Archivo adjunto');setTimeout(()=>libDetail(id),80)}catch(err){toast(err.message)}}})}
function libProg(id){const l=LIB.get(id);if(!l)return;const p=l.prog||{};const d=p.d||(l.need>todayIso()?l.need:wshift(todayIso(),1));
  lqModal(`<div class="lqtop"><b>Programar inspección</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div><p class="lqmsg">${esc(l.nm||'')} · lista para el ${fmtD(l.need)} (${l.slot==='pm'?'tarde':'mañana'})</p>
    <div class="lq2"><label>Día<input type="date" id="lqpd" value="${d}"></label><label>Hora<input type="time" id="lqph" value="${esc(p.h||(l.slot==='pm'?'14:00':'09:00'))}"></label></div>
    ${(()=>{const I=libInsp();const cur=p.insp||'';if(!I.length)return`<label>Inspector<input id="lqpi" value="${esc(cur||me.name||'')}" placeholder="Nombre del inspector"></label><p class="lqmsg">Tip: carga la lista de inspectores en <b>Configuración › Inspectores de calidad</b> para elegirlos aquí.</p>`;
      const load=I.map(n=>{const c=[...LIB.values()].filter(q=>q.id!==id&&q.prog&&q.prog.insp===n&&q.st==='pro'&&q.prog.d===(l.prog&&l.prog.d||d)).length;return{n,c}});
      return`<label>Inspector<select id="lqpi"><option value="">— elige —</option>${load.map(o=>`<option${o.n===cur?' selected':''} value="${esc(o.n)}">${esc(o.n)}${o.c?` · ${o.c} ese día`:''}</option>`).join('')}${cur&&!I.includes(cur)?`<option selected value="${esc(cur)}">${esc(cur)}</option>`:''}</select></label>`})()}
    ${l.sup?'<p class="lqmsg">Esta liberación requiere a la <b>supervisión</b>: coordínala para esa hora.</p>':''}
    <div class="lqbtns"><button class="ib" data-lq="back">Volver</button><button class="ib pri" data-lq="ok">Programar</button></div>`,
   e=>{const b=e.target.closest('[data-lq]');if(!b)return;if(b.dataset.lq==='back'){libDetail(id);return}
     const pd_=($('#lqpd')||{}).value;if(!pd_){toast('Elige el día.');return}if(!isWork(pd_)){toast(nwReason(pd_)+': elige un día laborable.');return}
     const prog={d:pd_,h:($('#lqph')||{}).value||'',insp:(($('#lqpi')||{}).value||'').trim()};if(!prog.insp){toast('Elige el inspector.');return}libSave(id,{st:'pro',prog,hist:libHist(l,'pro',fmtD(pd_)+' '+prog.h)},'Inspección programada');libDetail(id)})}
function libObs(id){const l=LIB.get(id);if(!l)return;
  lqModal(`<div class="lqtop"><b>Observar</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div><p class="lqmsg">${esc(l.nm||'')}</p>
    <label>Observaciones (una por línea)<textarea id="lqo" rows="5" placeholder="Ej.: fuga en unión de desagüe de 2&quot; bajo lavatorio"></textarea></label>
    <p class="lqmsg">Luego puedes adjuntar fotos desde el detalle.</p>
    <div class="lqbtns"><button class="ib" data-lq="back">Volver</button><button class="ib pri" data-lq="ok">Guardar como observada</button></div>`,
   e=>{const b=e.target.closest('[data-lq]');if(!b)return;if(b.dataset.lq==='back'){libDetail(id);return}
     const L=(($('#lqo')||{}).value||'').split('\n').map(s=>s.trim()).filter(Boolean);if(!L.length){toast('Escribe al menos una observación.');return}
     libSave(id,{st:'obs',obs:L.map(t=>({t,ok:false})),hist:libHist(l,'obs',L.length+' observación(es)')},'Marcada como observada');libDetail(id)})}
/* --- pestaña Liberaciones --- */
U.libV=U.libV||'ban';U.libSc=U.libSc||'';U.libQ='';U.libIn='';let LQHOST=null,LQDRAW=null;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&LQDRAW&&U.tab==='lib'){LQDRAW=null;render()}});
function libItems(){const vs=new Set(visPisos().map(p=>p.id));const q=fold(U.libQ||'').trim();const mineOnly=SCK()?new Set(myScsI()):null;
  const ok=(x,pid,sc,l)=>(!U.libIn||(l&&l.prog&&l.prog.insp===U.libIn))&&(!pid||vs.has(pid))&&(!U.libSc||sc===U.libSc)&&(!mineOnly||mineOnly.has(sc))&&(!q||fold((x&&x.name||'')+' '+conOf(sc).name+' '+((S.amb.get(x&&x.ambId)||{}).name||'')+' '+((S.amb.get(x&&x.ambId)||{}).code||'')).includes(q));
  const L=[...LIB.values()].filter(l=>l.st!=='anu').map(l=>({l,x:S.act.get(l.actId)||{id:l.actId,name:l.nm||'(actividad eliminada)',sc:l.sc,ambId:l.ambId},st:l.st})).filter(o=>ok(o.x,o.l.pisoId,o.l.sc,o.l));
  const seen=new Set();const P0=[];for(const b of libBlocks()){if(b.l||seen.has(b.p.id))continue;seen.add(b.p.id);if(!U.libIn&&ok(b.p,pisoOfAct(b.p.id),b.p.sc))P0.push({x:b.p,st:'sin',b})}
  return{L,P0}}
function lqCard(o){const x=o.x,l=o.l;const a=S.amb.get(x.ambId);const p=S.pis.get(l?l.pisoId:pisoOfAct(x.id));const r=l?{crit:l.crit,sup:l.sup,rest:l.rest}:libRuleOf(x)||{};const s=LST[o.st];
  const when=o.st==='sin'?`El ${esc(o.b.y.name)} entra el ${fmtD(o.b.need)}`:o.st==='pro'?(l.prog&&l.prog.d?`Inspección ${fmtD(l.prog.d)}${l.prog.h?' · '+esc(l.prog.h):''}`:'Falta fijar día de inspección'):libDone(o.st)?`✓ ${(l.done&&l.done.t)?fmtD(ldt(l.done.t))+' '+hhmm(l.done.t):''}`:o.st==='obs'?`${(l.obs||[]).filter(q=>!q.ok).length} observación(es) por levantar`:`Lista para el ${fmtD(l.need)}${l.late?' · fuera de plazo':''}`;
  return`<button type="button" class="lqcard" ${l?`data-lqid="${l.id}"`:`data-lqask="${x.id}"`} style="--c:${s.c}"><span class="lqtags">${r.crit?'<i class="lqt crit">CRÍTICA</i>':''}${r.sup?'<i class="lqt sup">SUPERVISIÓN</i>':''}${l&&l.late&&o.st==='sol'?'<i class="lqt crit">FUERA DE PLAZO</i>':''}</span>
   <b>${esc(x.name||'')}</b><span>${esc([p&&p.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · '))}</span><span class="lqsc"><i style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)}</span><span class="lqwhen">${when}</span>${l&&l.prog&&l.prog.insp?`<span class="lqins" data-lqin="${esc(l.prog.insp)}" title="Ver solo lo de este inspector">👷 ${esc(l.prog.insp)}</span>`:''}${r.crit&&libRestName(r)&&!libDone(o.st)?`<span class="lqrest">⛔ Restringe: ${esc(libRestName(r))}</span>`:''}</button>`}
function renderLib(main){ensureLib();const t0=todayIso(),tm=wshift(t0,1);const V=U.libV;const{L,P0}=libItems();const blocks=libBlocks();
  const open=L.filter(o=>!libDone(o.st));const wk=new Set(weekDays(curWeek()));const doneW=L.filter(o=>libDone(o.st)&&o.l.done&&wk.has(ldt(o.l.done.t)));const first=doneW.filter(o=>!(o.l.hist||[]).some(e=>e.st==='obs'));
  const tiles=[['Para mañana',open.filter(o=>(o.l.prog&&o.l.prog.d===tm)||(!o.l.prog&&o.l.need===tm)).length,`${open.filter(o=>o.st==='sol'&&o.l.need<=tm).length} sin programar`,'#E0A01B'],
    ['Programadas hoy',open.filter(o=>o.st==='pro'&&o.l.prog&&o.l.prog.d===t0).length,'','#1F5F7A'],['Observadas',open.filter(o=>o.st==='obs').length,'esperan levantamiento','#9A6A12'],
    ['Restringen ingreso',new Set(blocks.map(b=>b.p.id)).size,`${P0.length} sin solicitar`,'#B83A2E'],['Liberadas · semana',doneW.length,`${doneW.filter(o=>o.st==='libm').length} con obs. menores`,'#2E7D4F'],['Liberadas a la primera',doneW.length?Math.round(first.length/doneW.length*100)+'%':'—',doneW.length?`${first.length} de ${doneW.length}`:'','#46504A']];
  const scs=[...new Set([...L.map(o=>o.x.sc),...P0.map(o=>o.x.sc)])].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const lateN=open.filter(o=>o.st==='sol'&&o.l.late).length;
  let h=`<div class="scroll"><div class="wrap lqwrap">${pageHead('Liberaciones',`${pisoLabel()} · ${({ban:'Bandeja',cal:'Calendario',map:'Plano',mat:'Matriz'})[V]||''}`,'<button class="ib" id="lqpdf">Programación de mañana (PDF)</button>'+(me&&(isCal()||canWrite&&!PM()||SCK())?'<button class="ib pri" id="lqnew">+ Solicitar liberación</button>':''))}
   <div class="lqbar fbar"><span class="seg" id="lqv">${[['ban','Bandeja'],['cal','Calendario'],['map','Plano'],['mat','Matriz']].map(([k,t])=>`<button data-v="${k}" class="${V===k?'on':''}">${t}</button>`).join('')}</span>
    ${(()=>{const n=(U.libSc?1:0)+(U.libIn?1:0)+(U.libQ?1:0);return`<button type="button" class="ib ftog${U.fOpen?' on':''}" data-ftog aria-expanded="${U.fOpen?'true':'false'}">Filtros${n?` · ${n}`:''}</button>`})()}<span class="fmore${U.fOpen?' open':''}">
    ${SCK()?'':`<select class="tin" id="lqsc" aria-label="Subcontratista"><option value="">Todos los SC</option>${scs.map(c=>`<option value="${c}"${U.libSc===c?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select>`}
    ${(()=>{const I=[...new Set([...libInsp(),...[...LIB.values()].map(l=>l.prog&&l.prog.insp).filter(Boolean)])];if(!I.length)return'';const n=k=>[...LIB.values()].filter(l=>l.prog&&l.prog.insp===k&&(l.st==='pro'||l.st==='lev')).length;
      return`<select class="tin" id="lqin" aria-label="Inspector"><option value="">Todos los inspectores</option>${I.map(k=>`<option value="${esc(k)}"${U.libIn===k?' selected':''}>${esc(k)}${n(k)?' · '+n(k)+' por inspeccionar':''}</option>`).join('')}</select>`})()}
    <input class="tin" id="lqq" data-fk="lqq" type="search" placeholder="Buscar actividad, ambiente, SC…" value="${esc(U.libQ||'')}" aria-label="Buscar"></span>
    </div>`;
  if(U.piso&&V!=='mat'&&V!=='map'){const oth=[...LIB.values()].filter(l=>l.st!=='anu'&&!libDone(l.st)&&l.pisoId&&l.pisoId!==U.piso).length;if(oth)h+=`<div class="callout">Estás viendo solo <b>${esc((S.pis.get(U.piso)||{}).name||'')}</b> (selector de piso de arriba). Hay <b>${oth}</b> liberación(es) abierta(s) en otros pisos. <button class="ib" data-lqall>Ver todos los pisos</button></div>`}
  if(U.libIn)h+=`<div class="callout">Agenda de <b>${esc(U.libIn)}</b>: solo se ven sus inspecciones. <button class="ib" data-lqin="${esc(U.libIn)}">Quitar filtro</button></div>`;
  if(libErr)h+=`<div class="callout">No se pudieron leer las liberaciones (${esc(libErr)}). Falta publicar las reglas nuevas de Firestore.</div>`;
  if(!libRules().length)h+=`<div class="callout">Aún no hay <b>matriz de liberaciones</b>. Cárgala en la vista <b>Matriz</b> (Excel): de ahí salen qué actividades se liberan, cuáles son críticas y qué restringen.</div>`;
  if(V!=='mat'){h+=`<div class="lqtiles">${tiles.map(([k,v,s,c])=>`<div class="lqtile" style="--c:${c}"><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div>`;
    if(lateN)h+=`<div class="callout warnc">${lateN} solicitud${lateN>1?'es':''} llegaron fuera de plazo (se piden un día antes, hasta las 18:00). Calidad decide si las programa.</div>`}
  if(V==='ban'){const col=(t,c,hint,arr)=>`<section class="lqcol"><div class="lqch"><i style="--c:${c}"></i><b>${t}</b><span>${arr.length}</span></div><small>${hint}</small>${arr.map(lqCard).join('')||'<p class="mu" style="font-size:13px;margin:4px 2px">—</p>'}</section>`;
    const by=(a,b)=>((a.l&&(a.l.prog&&a.l.prog.d||a.l.need))||'').localeCompare((b.l&&(b.l.prog&&b.l.prog.d||b.l.need))||'');
    const d7=addD(t0,-7);
    h+=`<div class="lqcols">${col('Por solicitar',LST.sin.c,'Críticas sin pedir: la partida siguiente ya está programada',P0.sort((a,b)=>a.b.need.localeCompare(b.b.need)))}${col('Solicitadas',LST.sol.c,'Calidad debe programarlas',open.filter(o=>o.st==='sol'||o.st==='lev').sort(by))}${col('Programadas',LST.pro.c,'Inspección con día y hora',open.filter(o=>o.st==='pro').sort(by))}${col('Observadas',LST.obs.c,'El SC levanta y pide reinspección',open.filter(o=>o.st==='obs').sort(by))}${col('Liberadas · 7 días',LST.lib.c,'Destraban la partida siguiente',L.filter(o=>libDone(o.st)&&o.l.done&&ldt(o.l.done.t)>=d7).sort((a,b)=>(b.l.done.t||0)-(a.l.done.t||0)))}</div>`}
  else if(V==='cal'){const days=weekDays(U.week);h+=`<div class="lqbar"><button class="ib" data-lqw="-1" aria-label="Semana anterior">‹</button><b class="mono">Semana ${U.week}</b><button class="ib" data-lqw="1" aria-label="Semana siguiente">›</button>${U.week!==curWeek()?'<button class="ib" data-lqw="0">Esta semana</button>':''}</div>
    <div class="lqcal">${days.map(d=>{const ev=L.filter(o=>o.l.prog&&o.l.prog.d===d&&(o.st==='pro'||libDone(o.st)||o.st==='obs'||o.st==='lev')).sort((a,b)=>(a.l.prog.h||'').localeCompare(b.l.prog.h||''));const k=d===t0?'hoy':d===tm?'man':'';
      return`<section class="lqday ${k}"><div class="lqdh"><b>${DL[(pd(d).getUTCDay()+6)%7]}</b><span class="mono">${fmtD(d)}</span>${k?`<i>${k==='hoy'?'HOY':'MAÑANA'}</i>`:''}</div>${ev.map(o=>{const s=LST[o.st];return`<button type="button" class="lqev" data-lqid="${o.l.id}" style="--c:${s.c}"><span><b class="mono">${esc(o.l.prog.h||'—')}</b> ${esc(s.t)}</span><b>${esc(o.x.name)}</b><span>${esc((S.pis.get(o.l.pisoId)||{}).code||'')} · ${esc((S.amb.get(o.x.ambId)||{}).code||'')} · ${esc(conOf(o.x.sc).name)}</span>${o.l.prog.insp?`<span class="lqins" data-lqin="${esc(o.l.prog.insp)}" title="Ver solo lo de este inspector">👷 ${esc(o.l.prog.insp)}</span>`:''}</button>`}).join('')||'<p class="mu" style="font-size:12.5px;margin:6px 4px">Sin inspecciones</p>'}</section>`}).join('')}</div>`;
    const un=open.filter(o=>o.st==='sol'||o.st==='lev');if(un.length)h+=`<div class="lqun"><b>Sin programar · ${un.length}</b>${un.map(o=>`<button type="button" class="ib" data-lqid="${o.l.id}">${esc(o.x.name)} · ${esc((S.amb.get(o.x.ambId)||{}).code||'')} · lista ${fmtD(o.l.need)}${o.l.late?' · fuera de plazo':''}</button>`).join('')}</div>`}
  else if(V==='map'){const API=window.__plano&&window.__plano.capPlan?window.__plano:null;if(!API)loadPlanoMod().catch(()=>{});else API.capInit(t0);
    const ps=pisos();const all=[...L.filter(o=>!libDone(o.st)||(o.l.done&&ldt(o.l.done.t)>=addD(t0,-7))),...P0];const pid=U.piso||(ps.find(p=>p.id===U.libP)||ps.find(p=>all.some(o=>(o.l?o.l.pisoId:pisoOfAct(o.x.id))===p.id))||ps[0]||{}).id||'';U.libP=pid;
    const ORD=['sin','obs','lev','sol','pro','lib','libm'];const here=all.filter(o=>(o.l?o.l.pisoId:pisoOfAct(o.x.id))===pid).sort((a,b)=>ORD.indexOf(a.st)-ORD.indexOf(b.st));
    const num=new Map();here.forEach((o,i)=>num.set(o.l?o.l.id:'a:'+o.x.id,i+1));
    const zones=here.filter(o=>o.l&&o.l.zona&&o.l.zona.pts&&o.l.zona.pts.length).map(o=>({id:'lz_'+o.l.id,kind:'zona',actId:o.x.id,pts:o.l.zona.pts,vista:o.l.zona.vista||'',pisoId:pid,_lib:o.l.id}));
    const D=LQDRAW&&LQDRAW.pid===pid?LQDRAW:null;const dx=D&&S.act.get(D.actId);
    h+=`<div class="lqbar">${ps.length>1&&!U.piso?`<span class="lqchips">${ps.map(p=>`<button type="button" data-lqp="${p.id}" class="${p.id===pid?'on':''}">${esc(p.code)} · ${esc(p.name)}</button>`).join('')}</span>`:''}
     <span class="lqleg">${['sin','sol','pro','obs','lib'].map(k=>`<span><i style="--c:${LST[k].c}"></i>${LST[k].t.split(' ·')[0]}</span>`).join('')}</span></div>
     ${D?`<div class="lqdraw">✏️ <b>Arrastra sobre el plano</b> para marcar la zona de “${esc(dx?dx.name:'')}” <button class="ib" data-lqzcancel>Cancelar</button></div>`:''}
`;const note=`<p class="note" style="margin:6px 2px 0">Cada liberación guarda su propia zona (no depende del día). Toca una zona para ver su liberación; las <b>programadas</b> se ubican con “Ubicar” en la lista.</p>`;const side=`${ORD.map(k=>{const A=here.filter(o=>o.st===k);return A.length?`<div class="lqsg"><b style="color:${LST[k].c}">${esc(LST[k].t)} · ${A.length}</b>${A.map(o=>{const n=num.get(o.l?o.l.id:'a:'+o.x.id);const hasZ=!!(o.l&&o.l.zona);const canZ=!!o.l&&o.st==='pro'&&(canLibAsk(o.x)||isCal());
       return`<div class="lqli2"><button type="button" class="lqli" ${o.l?`data-lqid="${o.l.id}"`:`data-lqask="${o.x.id}"`}><i style="--c:${LST[k].c}">${n}</i><span><b>${esc(o.x.name)}</b><small>${esc((S.amb.get(o.x.ambId)||{}).code||'')} · ${esc(conOf(o.x.sc).name)}${hasZ?'':' · sin zona'}</small></span></button>${canZ?`<button type="button" class="ib" data-lqz="${o.l?o.l.id:''}" data-lqza="${o.x.id}">${hasZ?'Reubicar':'Ubicar'}</button>`:''}</div>`}).join('')}</div>`:''}).join('')||'<p class="mu">No hay liberaciones abiertas en este piso.</p>'}`;
    /* el visor se arma una sola vez y no se saca de la página (así no se descuadra ni desaparece) */
    if(main.dataset.lqv!=='map'||!$('#lqplan',main)){main.innerHTML=`<div class="scroll"><div class="wrap lqwrap"><div id="lqtop" class="lqwrap"></div><div class="lqmap"><div class="lqplan"><div class="kplanw"><div class="kplan" id="lqplan"></div></div><div id="lqnote"></div></div><aside class="lqside" id="lqside"></aside></div></div></div>`;main.dataset.lqv='map';wireLib(main)}
    const setH=(id,v)=>{const el=$('#'+id,main);if(el&&el.dataset.h!==v){el.innerHTML=v;el.dataset.h=v}};setH('lqtop',h.replace('<div class="scroll"><div class="wrap lqwrap">',''));setH('lqnote',note);setH('lqside',side);
    LQHOST=$('#lqplan',main);
    if(API){const colors=new Map(here.filter(o=>o.l&&o.l.zona).map(o=>[o.x.id,LST[o.st].c]));
      API.capPlan(LQHOST,{pid,zones,colors,nums:new Map(),bs:34,lab:z=>num.get(z._lib),onPick:(aid,z)=>{if(D)return;if(z&&z._lib)libDetail(z._lib)}});
      API.capDraw(LQHOST,D?(pts,vista)=>{const d=LQDRAW;LQDRAW=null;API.capDraw(LQHOST,null);const zona={pts,vista,pisoId:pid};if(d.libId)libSave(d.libId,{zona},'Zona de la liberación guardada');else libAsk(d.actId,{zona});render()}:null)}
    return}
  else h+=libMatrixHtml();
  main.dataset.lqv=V;main.innerHTML=h+'</div></div>';wireLib(main)}
function wireLib(main){
  main.onclick=async e=>{const t=e.target;let b;
    if((b=t.closest('#lqv button'))){const ch=U.libV!==b.dataset.v;U.libV=b.dataset.v;saveUI();render();if(ch)viewIn(main);return}
    if(t.closest('[data-lqall]')){U.piso='';U.pisoAll=true;saveUI();render();return}
    if((b=t.closest('[data-lqin]'))){U.libIn=U.libIn===b.dataset.lqin?'':b.dataset.lqin;render();return}
    if((b=t.closest('[data-lqid]'))){libDetail(b.dataset.lqid);return}
    if((b=t.closest('[data-lqask]'))){libAsk(b.dataset.lqask);return}
    if((b=t.closest('[data-lqw]'))){const v=+b.dataset.lqw;U.week=v===0?curWeek():U.week+v;render();return}
    if((b=t.closest('[data-lqd]'))){const v=+b.dataset.lqd;U.libD=shiftDay(U.libD||wshift(todayIso(),1),v);if(LQHOST)LQHOST._fk='';render();return}
    if((b=t.closest('[data-lqp]'))){U.libP=b.dataset.lqp;LQDRAW=null;if(LQHOST)LQHOST._fk='';render();return}
    if((b=t.closest('#lqv button'))&&b.dataset.v!=='map'){main.dataset.lqv=''}
    if((b=t.closest('[data-lqza]'))){LQDRAW={libId:b.dataset.lqz||'',actId:b.dataset.lqza,pid:U.libP};render();return}
    if(t.closest('[data-lqzcancel]')){LQDRAW=null;render();return}
    if(t.id==='lqnew'){libPick(t);return}
    if(t.id==='lqpdf'){libReport(wshift(todayIso(),1));return}
    if(t.id==='lqexp'){libExport();return}
    if(t.id==='lqleg'){libLegacyWizard();return}
    if(libRenameClick(t))return;
    if(libMatrixClick(t))return};
  main.oninput=e=>{if(e.target.id==='lqq'){U.libQ=e.target.value;render()}if(e.target.id==='lmq'){U.lmQ=e.target.value;render()}};
  main.onchange=async e=>{const t=e.target;if(t.id==='lqsc'){U.libSc=t.value;render()}if(t.id==='lqin'){U.libIn=t.value;render()}if(t.id==='lmsc'){U.lmSc=t.value;render()}if(t.id==='lmonly'){U.lmOnly=t.checked;render()}if(t.id==='lmauto'&&canLibMatrix()){libmPut({autoRestr:t.checked},t.checked?'Las críticas pendientes ahora son restricciones':'Las críticas pendientes ya no se marcan como restricción');return}if(t.dataset.lm){libMatrixChange(t);return}if(t.id==='lqimp'&&t.files[0]){const f=t.files[0];t.value='';await libImport(f)}}}
function libPick(btn){const t0=todayIso();const L=[...S.act.values()].filter(x=>canLibAsk(x)&&libRuleOf(x)&&!(libOf(x.id)&&!libDone(libOf(x.id).st))&&(x.days||[]).some(d=>d>=addD(t0,-7))).map(x=>({x,a:S.amb.get(x.ambId),p:S.pis.get(pisoOfAct(x.id)),d:((x.days||[]).filter(d=>d>=t0).sort()[0])||'9'})).filter(o=>o.a&&(!U.piso||pisoOfAct(o.x.id)===U.piso)).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,300);
  if(!L.length){toast(libRules().length?'No hay actividades de la matriz pendientes de liberar en estas fechas.':'Primero carga la matriz de liberaciones (vista Matriz).');return}
  openPop(btn,`<div class="ph">Solicitar liberación</div><div class="ptx">Actividades de la matriz, por fecha:</div><div class="qrow"><select id="lqpk" style="max-width:360px" aria-label="Actividad">${L.map(o=>`<option value="${o.x.id}">${esc((o.p?o.p.code+' · ':'')+o.a.code)} · ${esc(o.x.name)} · ${esc(conOf(o.x.sc).name)}${o.d!=='9'?' · '+fmtD(o.d):''}</option>`).join('')}</select><button data-do="go">Siguiente</button></div>`,{go:()=>{const v=($('#lqpk')||{}).value;if(v)setTimeout(()=>libAsk(v),0)}})}
/* matriz desde Excel */
const LQH=[['par',/partida/],['act',/actividad/],['crit',/critic/],['rest',/restring|siguiente|ingreso/],['sup',/supervis/],['proto',/protocolo|formato/],['ant',/anticip|dias/]];
/* --- Matriz: editor sobre el catálogo del lookahead --- */
U.lmQ='';U.lmSc='';U.lmOnly=false;
function libCatStats(cat){/* en un solo recorrido: qué viene después de cada actividad y con qué otras convive en los ambientes */
  const byAmb=new Map();for(const x of S.act.values()){if(!nrm(x.name))continue;if(!byAmb.has(x.ambId))byAmb.set(x.ambId,[]);byAmb.get(x.ambId).push(x)}
  const next=new Map(),co=new Map();
  for(const L of byAmb.values()){const st=new Map();for(const x of L){const k=keyOf(x);const d0=[...(x.days||[])].sort()[0]||'';const c=st.get(k);if(!c||(d0&&(!c||d0<c)))st.set(k,d0||c||'')}
    const ks=[...st.keys()];for(const k of ks){const m=co.get(k)||new Map();ks.forEach(o=>{if(o!==k)m.set(o,(m.get(o)||0)+1)});co.set(k,m);
      const a0=st.get(k);if(!a0)continue;let best=null,bs='9';for(const o of ks){const y0=st.get(o);if(o!==k&&y0&&y0>a0&&y0<bs){bs=y0;best=o}}
      const nx=next.get(k)||{tot:0,c:new Map()};if(best){nx.tot++;nx.c.set(best,(nx.c.get(best)||0)+1)}next.set(k,nx)}}
  return{next,co}}
function libMatrixHtml(){const cat=libCatalog();const R=libRules();const C=libIdx();const ed=canLibMatrix();const{next,co}=libCatStats(cat);const ign=new Set((LIBM&&LIBM.ign)||[]);
  const legacy=R.filter(r=>!(Array.isArray(r.keys)&&r.keys.length));const keyed=R.filter(r=>Array.isArray(r.keys)&&r.keys.length);
  const cover=r=>r.keys.reduce((s,k)=>s+((cat.get(k)||{}).n||0),0);const dead=keyed.filter(r=>!cover(r));
  /* posibles sin vincular: misma partida, nombre parecido a una regla, sin regla propia */
  const poss=[];for(const r of keyed)for(const e of cat.values()){if(e.sc!==r.sc||C.byKey.has(e.key)||ign.has(e.key))continue;const sim=Math.max(...r.keys.map(k=>libSimilar(k.split('|')[1]||'',e.key.split('|')[1]||'')));if(sim>=.6)poss.push({r,e})}
  const q=nrm(U.lmQ||'');const scs=[...new Set([...cat.values()].map(e=>e.sc))].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const rows=[...cat.values()].filter(e=>(!U.lmSc||e.sc===U.lmSc)&&(!q||nrm(e.name+' '+conOf(e.sc).name).includes(q))&&(!U.lmOnly||C.byKey.has(e.key))).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||a.name.localeCompare(b.name));
  const nameOf=k=>{const e=cat.get(k);return e?e.name:(k.split('|')[1]||k)};const dis=ed?'':' disabled';
  let h=`<div class="lqbar">${ed?'<button class="ib" id="lqexp">Exportar matriz (Excel)</button><label class="ib">Importar Excel (asistente)…<input type="file" id="lqimp" accept=".xlsx,.xls,.csv" hidden></label>':'<button class="ib" id="lqexp">Exportar matriz (Excel)</button>'}
    <input class="tin" id="lmq" data-fk="lmq" type="search" placeholder="Buscar actividad…" value="${esc(U.lmQ||'')}" aria-label="Buscar en el catálogo">
    <select class="tin" id="lmsc" aria-label="Subcontratista"><option value="">Todos los subcontratistas</option>${scs.map(c=>`<option value="${c}"${U.lmSc===c?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select>
    <label class="chk"><input type="checkbox" id="lmonly"${U.lmOnly?' checked':''}> Solo las que se liberan</label>
    ${ed?`<label class="chk" title="Si se activa, una crítica no liberada aparece como restricción de la partida siguiente en el lookahead, el plan diario y Restricciones"><input type="checkbox" id="lmauto"${libAuto()?' checked':''}> Críticas pendientes = restricción automática</label>`:''}
    <span class="mu" style="margin-left:auto">${keyed.length} se liberan · ${keyed.filter(r=>r.crit).length} críticas · catálogo: ${cat.size} actividades distintas</span></div>`;
  if(!ed)h+=`<div class="callout">La matriz la editan <b>Calidad</b> y el <b>administrador</b>. Aquí la ves como consulta.</div>`;
  if(legacy.length)h+=`<div class="callout warnc"><b>${legacy.length} fila(s) de la matriz anterior están en texto libre.</b> Se siguen reconociendo por “el nombre contiene”, pero conviene amarrarlas al catálogo. ${ed?'<button class="ib pri" id="lqleg">Amarrarlas ahora…</button>':''}</div>`;
  if(dead.length||poss.length){h+=`<div class="card"><div class="hd">Revisar <span class="sub">para que la matriz no se desconecte del lookahead</span></div><div class="pad lqrev">`;
    dead.forEach(r=>{h+=`<div class="lqri bad"><b>“${esc(r.act)}”</b> (${esc(conOf(r.sc).name)}) ya no tiene actividades en el lookahead: ¿se renombró o se eliminó?${ed?` <button class="ib" data-lmdel="${r.id}">Quitar de la matriz</button>`:''}</div>`});
    poss.slice(0,40).forEach(({r,e})=>{h+=`<div class="lqri">¿<b>“${esc(e.name)}”</b> (${e.n} act.) es la misma que <b>“${esc(r.act)}”</b>? ${ed?`<button class="ib pri" data-lmlink="${r.id}|${esc(e.key)}">Sí, vincular</button>`:''}${canWrite&&!PM()?`<button class="ib" data-lmren="${esc(e.key)}|${r.id}">Sí, y renombrar en el lookahead</button>`:''}${ed?`<button class="ib" data-lmign="${esc(e.key)}">No</button>`:''}</div>`});
    h+='</div></div>'}
  let lastSc=null;
  h+=`<div class="card"><div class="tscroll"><table class="t lqmt rt"><thead><tr><th>Actividad del lookahead</th><th title="Requiere liberación de Calidad">Se libera</th><th title="Si no se libera, la partida siguiente no puede entrar">Crítica</th><th>Restringe el ingreso de</th><th>Supervisión</th><th>Protocolo</th><th title="Días de anticipación con que se pide">Anticipación</th></tr></thead><tbody>`;
  for(const e of rows){if(e.sc!==lastSc){lastSc=e.sc;h+=`<tr class="tgrp grp"><th colspan="7"><span class="lqsc"><i style="--c:${conOf(e.sc).color}"></i>${esc(conOf(e.sc).name)}</span>${conOf(e.sc).partida?' <span class="mu">· '+esc(conOf(e.sc).partida)+'</span>':''}</th></tr>`}
    const r=C.byKey.get(e.key);const prim=r&&r.keys[0]===e.key;const alias=r&&!prim;const k=esc(e.key);
    const nx=next.get(e.key);const sug=nx&&nx.c.size?[...nx.c.entries()].sort((a,b)=>b[1]-a[1])[0]:null;const cm=co.get(e.key)||new Map();
    const opts=[...cm.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40);const curR=r&&Array.isArray(r.rest)?r.rest[0]||'':'';
    const exN=r&&prim?Object.entries(libEx()).filter(([aid,v])=>(v==='no'&&r.keys.includes(keyOf(S.act.get(aid)||{})))||v===r.id).length:0;
    h+=`<tr class="${r?'lqon':''}"><td class="lead"><b>${esc(e.name)}</b><div class="rloc">${e.n} actividad${e.n>1?'es':''} · ${e.ambs.size} ambiente${e.ambs.size>1?'s':''}${e.names.size>1?` · se escribe de ${e.names.size} formas${canWrite&&!PM()?` <button type="button" class="lnkb" data-lmuni="${k}">Unificar escritura</button>`:''}`:''}${r&&prim?(ed?` · <button type="button" class="lnkb" data-lmex="${r.id}">Excepciones${exN?' ('+exN+')':''}</button>`:exN?` · ${exN} excepción(es)`:''):''}${alias?` · <b>variante de “${esc(r.act)}”</b>`:''}${prim&&r.keys.length>1?` · + ${r.keys.length-1} variante(s)`:''}</div></td>`;
    if(alias){h+=`<td colspan="6" class="mu full">Usa la regla de “${esc(r.act)}”.${canWrite&&!PM()?` <button class="ib" data-lmren="${k}|${r.id}" title="Renombra estas actividades en el lookahead con el nombre principal">Renombrar como “${esc(nameOf(r.keys[0]))}”</button>`:''}${ed?` <button class="ib" data-lmunlink="${r.id}|${k}">Desvincular</button>`:''}</td></tr>`;continue}
    h+=`<td data-l="Se libera"><input type="checkbox" data-lm="se" data-k="${k}"${r?' checked':''}${dis} aria-label="Se libera"></td>`;
    if(!r){h+=`<td colspan="5" class="lqnone"></td></tr>`;continue}
    h+=`<td data-l="Crítica"><input type="checkbox" data-lm="crit" data-k="${k}"${r.crit?' checked':''}${dis} aria-label="Crítica"></td>
     <td class="full" data-l="Restringe el ingreso de">${r.crit?`<select data-lm="rest" data-k="${k}"${dis} aria-label="Restringe"><option value="">— elige —</option>${opts.map(([o,c])=>`<option value="${esc(o)}"${o===curR?' selected':''}>${esc(nameOf(o))} · ${esc(conOf(o.split('|')[0]).name)} (${c}/${e.ambs.size})</option>`).join('')}${curR&&!cm.has(curR)?`<option value="${esc(curR)}" selected>${esc(nameOf(curR))}</option>`:''}</select>${sug&&sug[0]!==curR?`<div class="rloc">Sugerido por el lookahead: <b>${esc(nameOf(sug[0]))}</b> viene después en ${sug[1]} de ${nx.tot} ambientes ${ed?`<button type="button" class="lnkb" data-lmsug="${k}|${esc(sug[0])}">Usar</button>`:''}</div>`:''}`:'<span class="mu">—</span>'}</td>
     <td data-l="Supervisión"><input type="checkbox" data-lm="sup" data-k="${k}"${r.sup?' checked':''}${dis} aria-label="Supervisión"></td>
     <td data-l="Protocolo"><input class="ci" data-lm="proto" data-k="${k}" value="${esc(r.proto||'')}" placeholder="Opcional"${dis} aria-label="Protocolo"></td>
     <td data-l="Anticipación (días)"><input class="ci" type="number" min="1" max="7" data-lm="ant" data-k="${k}" value="${r.ant||1}" style="width:56px"${dis} aria-label="Días de anticipación"></td></tr>`}
  h+=`</tbody></table></div>${rows.length?'':'<div class="empty">No hay actividades con ese filtro.</div>'}</div>
   ${helpBox('¿Cómo se arma la matriz?',`<p>El catálogo sale de las actividades del lookahead (mismo subcontratista + mismo nombre, sin importar mayúsculas, tildes ni signos). Marca las que se liberan; si es <b>crítica</b>, elige qué actividad no puede entrar sin esa liberación. Una crítica no liberada aparece como <b>restricción</b> de esa actividad en el mismo ambiente.</p>`)}`;
  return h}
function libMatrixChange(t){if(!canLibMatrix())return;const k=t.dataset.k;const f=t.dataset.lm;const cat=libCatalog();const e=cat.get(k);let R=libRules().map(r=>({...r}));
  let r=R.find(q=>Array.isArray(q.keys)&&q.keys.includes(k));
  if(f==='se'){if(t.checked&&!r){R.push({id:uid('lm'),keys:[k],sc:e?e.sc:k.split('|')[0],act:e?e.name:k.split('|')[1],crit:false,rest:[],restName:'',sup:false,proto:'',ant:1});libmSave(R,`“${e?e.name:''}” requiere liberación`);return}
    if(!t.checked&&r){if(!confirm(`¿Quitar “${r.act}” de la matriz?${LIB.size?' Las liberaciones ya registradas se conservan.':''}`)){t.checked=true;return}R=R.filter(q=>q!==r);libmSave(R,'Quitada de la matriz');return}return}
  if(!r)return;
  if(f==='crit'){r.crit=t.checked;if(!r.crit){r.rest=[];r.restName=''}}
  else if(f==='sup')r.sup=t.checked;
  else if(f==='rest'){r.rest=t.value?[t.value]:[];r.restName=t.value?((cat.get(t.value)||{}).name||t.value.split('|')[1]):''}
  else if(f==='proto')r.proto=t.value.trim();
  else if(f==='ant')r.ant=Math.min(7,Math.max(1,parseInt(t.value,10)||1));
  libmSave(R)}
function libMatrixClick(t){if(!canLibMatrix())return false;let b;const R=libRules().map(r=>({...r,keys:[...(r.keys||[])]}));const cat=libCatalog();
  if((b=t.closest('[data-lmsug]'))){const q=b.dataset.lmsug.split('|');const k=q[0]+'|'+q[1],o=q[2]+'|'+q[3];const r=R.find(q=>q.keys.includes(k));if(r){r.rest=[o];r.restName=(cat.get(o)||{}).name||o.split('|')[1];libmSave(R,'Sugerencia aplicada')}return true}
  if((b=t.closest('[data-lmlink]'))){const i=b.dataset.lmlink.indexOf('|');const id=b.dataset.lmlink.slice(0,i),k=b.dataset.lmlink.slice(i+1);const r=R.find(q=>q.id===id);if(r&&!r.keys.includes(k)){r.keys.push(k);libmSave(R,'Variante vinculada')}return true}
  if((b=t.closest('[data-lmunlink]'))){const i=b.dataset.lmunlink.indexOf('|');const id=b.dataset.lmunlink.slice(0,i),k=b.dataset.lmunlink.slice(i+1);const r=R.find(q=>q.id===id);if(r){r.keys=r.keys.filter(q=>q!==k);libmSave(R,'Variante desvinculada')}return true}
  if((b=t.closest('[data-lmign]'))){libmPut({ign:[...new Set([...((LIBM&&LIBM.ign)||[]),b.dataset.lmign])]});return true}
  if((b=t.closest('[data-lmex]'))){libExDialog(b.dataset.lmex);return true}
  if((b=t.closest('[data-lmdel]'))){libmSave(R.filter(q=>q.id!==b.dataset.lmdel),'Quitada de la matriz');return true}
  return false}
/* --- excepciones por actividad (las decide Calidad o el administrador) --- */
function libSetEx(aid,val,msg){const ex={...libEx()};if(val)ex[aid]=val;else delete ex[aid];return libmPut({ex},msg)}
function libExDialog(ruleId){const r=libRules().find(q=>q.id===ruleId);if(!r)return;const ks=new Set(r.keys||[]);const ex=libEx();
  const L=[...S.act.values()].filter(x=>ks.has(keyOf(x))||ex[x.id]===ruleId).map(x=>({x,a:S.amb.get(x.ambId),p:S.pis.get(pisoOfAct(x.id))})).filter(o=>o.a).sort((a,b)=>((a.p&&a.p.order)||0)-((b.p&&b.p.order)||0)||String(a.a.code).localeCompare(String(b.a.code),'es',{numeric:true}));
  const draw=()=>{const E=libEx();lqModal(`<div class="lqtop"><b>Excepciones · ${esc(r.act)}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    <p class="lqmsg">Desmarca las actividades que <b>no</b> requieren liberación (por ejemplo, un ambiente donde no aplica). Las demás siguen la regla.</p>
    <div class="lqwz"><table class="t"><thead><tr><th>Requiere</th><th>Piso · ambiente</th><th>Actividad</th></tr></thead><tbody>${L.map(o=>`<tr><td><input type="checkbox" data-exa="${o.x.id}"${E[o.x.id]==='no'?'':' checked'} aria-label="Requiere liberación"></td><td>${esc((o.p?o.p.code+' · ':'')+o.a.code+' · '+o.a.name)}</td><td>${esc(o.x.name)}${E[o.x.id]===ruleId?' <i class="lqt sup">AGREGADA A MANO</i>':''}</td></tr>`).join('')}</tbody></table></div>
    <div class="lqbtns"><button class="ib pri" data-lqx>Listo</button></div>`,null,e=>{const t=e.target;if(t.dataset.exa){libSetEx(t.dataset.exa,t.checked?(libEx()[t.dataset.exa]===ruleId?ruleId:''):'no');setTimeout(draw,40)}});
    const c=$('#lqm .lqc');if(c)c.classList.add('lqwide')};draw()}
function libExMenu(btn,aid){const x=S.act.get(aid);if(!x||!canLibMatrix())return;const r=libRuleOf(x);const ex=libEx()[aid];
  if(r){openPop(btn,`<div class="ph">${esc(x.name)}</div><div class="ptx">Sigue la regla “${esc(r.act)}”.</div><button data-do="no">Esta actividad no requiere liberación</button>`,{no:()=>libSetEx(aid,'no','Excepción: no requiere liberación')});return}
  const R=libRules().filter(q=>Array.isArray(q.keys)).sort((a,b)=>(a.sc===x.sc?0:1)-(b.sc===x.sc?0:1)||a.act.localeCompare(b.act));
  if(!R.length){toast('Primero marca en la Matriz qué actividades se liberan.');return}
  openPop(btn,`<div class="ph">${esc(x.name)}</div><div class="ptx">${ex==='no'?'Está marcada como “no requiere liberación”.':'No está en la matriz.'} ¿Qué regla debe seguir?</div><div class="qrow"><select id="exr" style="max-width:320px">${R.map(q=>`<option value="${q.id}">${esc(q.act)} · ${esc(conOf(q.sc).name)}${q.crit?' · crítica':''}</option>`).join('')}</select><button data-do="si">Requiere</button></div>${ex==='no'?'<button data-do="clr">Quitar la excepción (volver a la matriz)</button>':''}`,
   {si:()=>{const v=($('#exr')||{}).value;if(v)libSetEx(aid,v,'Excepción: requiere liberación')},clr:()=>libSetEx(aid,'','Excepción quitada')})}
/* --- unificar nombres en el lookahead (lo hace quien edita el lookahead) --- */
function libRename(key,newName){if(!(canWrite&&!PM()))return;const L=[...S.act.values()].filter(x=>keyOf(x)===key&&x.name!==newName);if(!L.length){toast('No hay nada que renombrar.');return}
  if(!confirm(`Se renombrarán ${L.length} actividad${L.length>1?'es':''} del lookahead a “${newName}”. Se puede deshacer. ¿Continuar?`))return;
  apply(L.map(x=>op('acts',x.id,{...x,name:newName})),`${L.length} actividad${L.length>1?'es':''} renombrada${L.length>1?'s':''} a “${newName}”`)}
function libRenameClick(t){let b;if(!(canWrite&&!PM()))return false;
  if((b=t.closest('[data-lmuni]'))){const k=b.dataset.lmuni;const e=libCatalog().get(k);if(e){const L=[...S.act.values()].filter(x=>keyOf(x)===k&&x.name!==e.name);if(L.length&&confirm(`Unificar la escritura: ${L.length} actividad(es) pasarán a llamarse “${e.name}”. ¿Continuar?`))apply(L.map(x=>op('acts',x.id,{...x,name:e.name})),'Escritura unificada')}return true}
  if((b=t.closest('[data-lmren]'))){const i=b.dataset.lmren.lastIndexOf('|');const k=b.dataset.lmren.slice(0,i),id=b.dataset.lmren.slice(i+1);const r=libRules().find(q=>q.id===id);if(r){const main=libCatalog().get(r.keys[0]);libRename(k,main?main.name:r.act)}return true}
  return false}
/* --- plantillas de ambiente: usan los nombres del catálogo --- */
function tplLibInfo(sc,name){if(!nrm(name))return'';const k=(sc||'')+'|'+nrm(name);const r=libIdx().byKey.get(k);if(r)return`<i class="lqt ${r.crit?'crit':'sup'}" title="Requiere liberación${r.crit?' · crítica: restringe '+esc(libRestName(r)):''}">◆ ${r.crit?'CRÍTICA':'LIBERA'}</i>`;
  const cat=libCatalog();if(cat.has(k))return'';let best=null,bs=0;for(const e of cat.values()){if(e.sc!==sc)continue;const v=libSimilar(nrm(name),nrm(e.name));if(v>bs){bs=v;best=e}}
  return best&&bs>=.6?`<button type="button" class="lnkb" data-tuse="${esc(best.name)}" title="El lookahead la escribe así${libIdx().byKey.get(best.key)?' y requiere liberación':''}">≈ usar “${esc(best.name)}”</button>`:'<span class="mu" title="Este nombre no existe todavía en el lookahead">nueva</span>'}
function tplDatalists(tpls){const scs=new Set();tpls.forEach(t=>t.acts.forEach(a=>{if(a.sc)scs.add(a.sc)}));const cat=[...libCatalog().values()];
  return[...scs].map(sc=>`<datalist id="lqdl-${esc(sc)}">${cat.filter(e=>e.sc===sc).sort((a,b)=>b.n-a.n).slice(0,200).map(e=>`<option value="${esc(e.name)}"></option>`).join('')}</datalist>`).join('')}
/* --- Excel: asistente de emparejamiento con el catálogo y exportación --- */
function libBestKeys(text,par,cat,n){const t=nrm(text);if(!t)return[];const pp=nrm(par||'');const out=[];
  for(const e of cat.values()){let s=libSimilar(t,nrm(e.name));if(s<.34)continue;const con=conOf(e.sc);if(pp&&(nrm((con.partida||'')+' '+con.name).includes(pp)||pp.includes(nrm(con.partida||'~'))))s+=.5;out.push({k:e.key,s,e})}
  return out.sort((a,b)=>b.s-a.s||b.e.n-a.e.n).slice(0,n||12)}
function libWizard(rows,opt){opt=opt||{};const cat=libCatalog();
  const W=rows.map(r=>{const c=libBestKeys(r.act,r.par,cat,12);const rc=r.rest?libBestKeys(r.rest,'',cat,12):[];return{...r,cand:c,key:c.length&&c[0].s>=.6?c[0].k:'',rcand:rc,restKey:rc.length&&rc[0].s>=.6?rc[0].k:'',on:true}});
  const label=k=>{const e=cat.get(k);return e?`${e.name} · ${conOf(e.sc).name} (${e.n})`:k};
  const draw=()=>{const ok=W.filter(w=>w.on&&w.key).length,no=W.filter(w=>w.on&&!w.key).length;
    lqModal(`<div class="lqtop"><b>${opt.title||'Emparejar el Excel con el lookahead'}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
     <p class="lqmsg">Cada fila del Excel se amarra a una actividad real del lookahead. Revisa las sugerencias; lo que no tenga pareja no se carga.</p>
     <div class="lqwz"><table class="t"><thead><tr><th></th><th>En el Excel</th><th>Actividad del lookahead</th><th>Restringe (si es crítica)</th></tr></thead><tbody>
     ${W.map((w,i)=>`<tr class="${w.key?'':'late'}"><td><input type="checkbox" data-wz-on="${i}"${w.on?' checked':''} aria-label="Incluir"></td><td><b>${esc(w.act)}</b><div class="rloc">${esc(w.par||'')}${w.crit?' · crítica':''}${w.rest?' · restringe '+esc(w.rest):''}${w.sup?' · supervisión':''}</div></td>
       <td><select data-wz-k="${i}" aria-label="Actividad del lookahead"><option value="">— no está en el lookahead —</option>${w.cand.map(c=>`<option value="${esc(c.k)}"${c.k===w.key?' selected':''}>${esc(label(c.k))}${c.s>=.6?'':' · ¿?'}</option>`).join('')}</select></td>
       <td>${w.crit?`<select data-wz-r="${i}" aria-label="Restringe"><option value="">— sin definir —</option>${w.rcand.map(c=>`<option value="${esc(c.k)}"${c.k===w.restKey?' selected':''}>${esc(label(c.k))}</option>`).join('')}</select>`:'<span class="mu">—</span>'}</td></tr>`).join('')}</tbody></table></div>
     <p class="lqmsg ${no?'bad':'ok'}">${ok} fila(s) amarradas${no?` · ${no} sin pareja (no se cargan: corrige el nombre en el lookahead o en el Excel)`:''}</p>
     ${opt.legacy?'':`<label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="wzrep"${libRules().length?'':' checked'}> Reemplazar toda la matriz actual (si no, se agregan o actualizan)</label>`}
     <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-wz="ok"${ok?'':' disabled'}>Cargar ${ok} fila(s)</button></div>`,
    e=>{if(!e.target.closest('[data-wz="ok"]'))return;const rep=opt.legacy?false:!!($('#wzrep')||{}).checked;
      let R=rep?[]:libRules().filter(r=>Array.isArray(r.keys)&&r.keys.length).map(r=>({...r,keys:[...r.keys]}));if(opt.legacy)R=libRules().filter(r=>Array.isArray(r.keys)&&r.keys.length).map(r=>({...r,keys:[...r.keys]}));
      let n=0;for(const w of W){if(!w.on||!w.key)continue;const e2=cat.get(w.key);let r=R.find(q=>q.keys.includes(w.key));if(!r){r={id:uid('lm'),keys:[w.key],sc:e2.sc,act:e2.name};R.push(r)}
        Object.assign(r,{crit:!!w.crit,rest:w.crit&&w.restKey?[w.restKey]:[],restName:w.crit&&w.restKey?((cat.get(w.restKey)||{}).name||''):'',sup:!!w.sup,proto:w.proto||'',ant:w.ant||1});n++}
      libmSave(R,`Matriz cargada: ${n} actividad(es) amarradas al lookahead`);
      lqClose();U.libV='mat';render()},
    e=>{const t=e.target;if(t.dataset.wzOn!=null){W[+t.dataset.wzOn].on=t.checked;draw()}if(t.dataset.wzK!=null){W[+t.dataset.wzK].key=t.value;draw()}if(t.dataset.wzR!=null){W[+t.dataset.wzR].restKey=t.value}});
    const c=$('#lqm .lqc');if(c)c.classList.add('lqwide')};draw()}
async function libImport(file){try{await loadXlsx();const X=window.XLSX;const wb=X.read(await file.arrayBuffer(),{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const A=X.utils.sheet_to_json(ws,{header:1,defval:''});
  const hi=A.findIndex(r=>r.some(c=>/actividad/i.test(fold(c))));if(hi<0){toast('No encontré la fila de títulos (debe tener una columna “Actividad”).');return}
  const H=A[hi].map(c=>fold(c));const col={};LQH.forEach(([k,re])=>{const i=H.findIndex((h,j)=>re.test(h)&&!Object.values(col).includes(j));if(i>=0)col[k]=i});
  if(col.act==null){toast('Falta la columna de la actividad que se libera.');return}const yes=v=>/^(s|si|x|1|true|y)/i.test(fold(v));let par='';const R=[];
  for(const r of A.slice(hi+1)){const act=String(r[col.act]||'').trim();const p=col.par!=null?String(r[col.par]||'').trim():'';if(p)par=p;if(!act)continue;
    R.push({par:p||par,act,crit:col.crit!=null&&yes(r[col.crit]),rest:col.rest!=null?String(r[col.rest]||'').trim():'',sup:col.sup!=null&&yes(r[col.sup]),proto:col.proto!=null?String(r[col.proto]||'').trim():'',ant:col.ant!=null?Math.max(1,parseInt(r[col.ant],10)||1):1})}
  if(!R.length){toast('El archivo no tiene filas con actividades.');return}libWizard(R)}catch(err){toast('No se pudo leer el Excel: '+(err.message||err))}}
function libLegacyWizard(){const L=libRules().filter(r=>!(Array.isArray(r.keys)&&r.keys.length)).map(r=>({par:r.par||'',act:r.act||'',crit:!!r.crit,rest:typeof r.rest==='string'?r.rest:'',sup:!!r.sup,proto:r.proto||'',ant:r.ant||1}));if(L.length)libWizard(L,{legacy:true,title:'Amarrar la matriz anterior al lookahead'})}
async function libExport(){try{await loadXlsx();const X=window.XLSX;const cat=libCatalog();const R=libRules();
  const rows=[['Subcontratista','Partida','Actividad que se libera','Variantes en el lookahead','Crítica','Restringe el ingreso de','Supervisión','Protocolo','Anticipación (días)','Actividades en el lookahead']];
  R.forEach(r=>{const keyed=Array.isArray(r.keys)&&r.keys.length;const con=conOf(r.sc||'');rows.push([keyed?con.name:'',keyed?(con.partida||''):(r.par||''),r.act,keyed?r.keys.slice(1).map(k=>(cat.get(k)||{}).name||k.split('|')[1]).join('; '):'(texto libre)',r.crit?'Sí':'No',libRestName(r),r.sup?'Sí':'No',r.proto||'',r.ant||1,keyed?r.keys.reduce((s,k)=>s+((cat.get(k)||{}).n||0),0):''])});
  const ws=X.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:22},{wch:22},{wch:34},{wch:30},{wch:9},{wch:30},{wch:12},{wch:28},{wch:12},{wch:14}];const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Matriz');
  saveBlob(`${P().code||'LPS'}_Matriz_liberaciones.xlsx`,new Blob([X.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}catch(err){toast('No se pudo exportar: '+(err.message||err))}}
/* informe: programación del día siguiente */
async function libReport(d){const L=[...LIB.values()].filter(l=>l.st!=='anu'&&((l.prog&&l.prog.d===d)||(!l.prog&&l.need===d&&(l.st==='sol'||l.st==='lev')))).filter(l=>!U.piso||l.pisoId===U.piso).sort((a,b)=>((a.prog&&a.prog.h)||'99').localeCompare((b.prog&&b.prog.h)||'99'));
  if(!L.length){toast(`No hay liberaciones para el ${fmtD(d)}.`);return}
  try{await loadPdf();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const p=P();const W=297,M=12;const T=s=>String(s==null?'':s).normalize('NFC');
    const N=new Map();const API=window.__plano;if(API&&API.nums)[...new Set(L.map(l=>l.pisoId))].forEach(pid=>{try{API.nums(pid).forEach((v,k)=>N.set(k,v))}catch(e){}});
    doc.setFontSize(9);doc.setTextColor(110);doc.text(T((p.name||'Obra')+' · LPS 911'),M,12);doc.setFontSize(17);doc.setTextColor(20);doc.text(T('Programación de liberaciones de calidad'),M,20);
    doc.setFontSize(11);doc.text(T(`${['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()]} ${fmtD(d)} · ${U.piso?(S.pis.get(U.piso)||{}).name||'':'todos los pisos'}`),M,27);
    doc.setFontSize(10);doc.text(T(`${L.length} inspección(es) · ${L.filter(l=>l.crit).length} crítica(s) · ${L.filter(l=>l.sup).length} con supervisión · ${L.filter(l=>!l.prog).length} sin programar`),W-M,27,{align:'right'});
    doc.autoTable({startY:32,margin:{left:M,right:M},head:[['Hora','N.º','Piso · ambiente','Actividad','Subcontratista','Crítica: restringe','Superv.','Inspector','Estado']],
      body:L.map(l=>{const x=S.act.get(l.actId)||{name:l.nm};const a=S.amb.get(l.ambId);return[l.prog&&l.prog.h||'—',N.get(l.actId)||'',T(`${(S.pis.get(l.pisoId)||{}).code||''} · ${a?a.code+' '+a.name:''}`),T(x.name||''),T(conOf(l.sc).name),T(l.crit?(l.rest||'Sí'):'No'),l.sup?'Sí':'No',T(l.prog&&l.prog.insp||''),T((LST[l.st]||{}).t||'')+(l.late?' (fuera de plazo)':'')]}),
      styles:{fontSize:8.5,cellPadding:1.8},headStyles:{fillColor:[31,95,122]},alternateRowStyles:{fillColor:[247,248,245]}});
    let y=doc.lastAutoTable.finalY+26;if(y>190)y=190;doc.setDrawColor(40);[['Jefe de Calidad',M],['Ingeniero de producción',M+95],['Supervisión',M+190]].forEach(([t,x])=>{doc.line(x,y,x+80,y);doc.setFontSize(9);doc.setTextColor(80);doc.text(T(t),x+40,y+5,{align:'center'})});
    doc.setFontSize(8);doc.setTextColor(130);doc.text(T(`Generado por LPS 911 · ${fmtD(todayIso())} ${nowHM()}`),M,203);
    saveBlob(`${p.code||'LPS'}_Liberaciones_${d}.pdf`,doc.output('blob'));toast('Informe generado')}catch(err){toast('No se pudo generar el PDF: '+(err.message||err))}}

