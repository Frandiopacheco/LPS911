"use strict";
/* LPS 911 · Liberaciones de calidad.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 36 · Liberaciones de calidad
   lib/{id}: {actId,ambId,pisoId,sc,nm,crit,sup,rest,need,slot,st,prog:{d,h,insp},obs:[{t,ok}],photos:[],proto:[],late,note,hist:[],by,n,ts}
   actId puede ir vacío: liberación de algo que no está en el lookahead (nm = qué se libera, ambId elegido a mano).
   crit/sup/rest los marca Calidad al programar (el SC no los toca). Ya no hay matriz ni liberaciones «pendientes de solicitar».
   st: sol (solicitada) · pro (programada) · obs (observada) · lev (observaciones levantadas) · lib (liberada) · libm (liberada con obs. menores) · anu (anulada)
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
/* Sin matriz (oct 2026, decidido con el dueño): la liberación la pide el SC (o producción / Calidad) cuando la necesita;
   el lookahead solo SUGIERE actividades, nada queda «pendiente de liberar» por sí solo. CRÍTICA, SUPERVISIÓN y «restringe a…»
   las marca Calidad al programar, en la propia liberación (crit, sup, rest). libm/main queda solo para la lista de inspectores
   (insp); sus reglas, excepciones y autoRestr antiguos se conservan en la base pero ya no se usan. */
let LIBM=null,libmSub=null,libmVer=0;
const nrm=v=>fold(v).replace(/[^a-z0-9ñ]+/g,' ').trim();
const keyOf=x=>(x&&x.sc||'')+'|'+nrm(x&&x.name);
/** Calidad o el administrador: inspectores y marcas (crítica, supervisión) de una liberación */
const canLibCfg=()=>!!me&&(isAdmin||(AREA()&&/calidad/i.test(me.area||'')));
const LIBC={ver:0};
function libOf(aid){if(!aid)return null;let b=null;for(const l of LIB.values()){if(l.actId!==aid||l.st==='anu')continue;if(!b||(l.ts||0)>(b.ts||0))b=l}return b}
function libState(x){const l=libOf(x.id);return l?l.st:''}
/* catálogo: actividades distintas del lookahead (por subcontratista): sugiere nombres en las plantillas de ambiente */
function libCatalog(){const m=new Map();for(const x of S.act.values()){const k=keyOf(x);if(!nrm(x.name))continue;let e=m.get(k);if(!e){e={key:k,sc:x.sc,names:new Map(),n:0,ambs:new Set()};m.set(k,e)}e.n++;e.ambs.add(x.ambId);e.names.set(x.name,(e.names.get(x.name)||0)+1)}
  for(const e of m.values())e.name=[...e.names.entries()].sort((a,b)=>b[1]-a[1])[0][0];return m}
const libInsp=()=>(LIBM&&Array.isArray(LIBM.insp))?LIBM.insp:[];
/* guarda en libm/main solo lo que cambia (merge): hoy, la lista de inspectores */
function libmPut(patch,msg){LIBM={...(LIBM||{}),...patch};libmVer++;requestRender();
  return fcol('libm').doc('main').set({...patch,by:me.email,n:me.name||me.email,ts:NOW()},{merge:true}).then(()=>{if(msg)toast(msg)}).catch(err=>toast('No se pudo guardar: '+(err.code==='permission-denied'?'solo Calidad o el administrador':(err.code||err.message))))}
function libBadge(x){const st=libState(x);if(!st)return'';const s=LST[st];const l=libOf(x.id);
  return`<span class="lqbadge" data-lqact="${x.id}" role="button" tabindex="0" style="--c:${s.c}" title="Liberación: ${esc(s.t)}${l&&l.prog&&l.prog.d?' · '+fmtD(l.prog.d)+(l.prog.h?' '+esc(l.prog.h):''):''}${l&&l.crit?' · crítica'+(l.rest?': restringe '+esc(l.rest):''):''}">◆</span>`}
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
function lqHead(x,l){const a=S.amb.get(x.ambId);const p=S.pis.get((l&&l.pisoId)||pisoOfAct(x.id)||pisoOfAmb(x.ambId));const sc=a&&S.sec.get(a.sectorId);
  return`<div class="lqh"><b>${esc(x.name||'(sin nombre)')}</b><span>${esc([p&&p.code,sc&&sc.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · '))} · ${esc(conOf(x.sc).name)}</span>
   <span class="lqtags">${l&&l.crit?`<i class="lqt crit">CRÍTICA${l.rest?' · restringe '+esc(l.rest):''}</i>`:''}${l&&l.sup?'<i class="lqt sup">REQUIERE SUPERVISIÓN</i>':''}${!x.id?'<i class="lqt">No está en el lookahead</i>':''}</span></div>`}
/* solicitar */
/* aid = actividad del lookahead (sugerencia) · opt.free = algo que no está en el lookahead: qué se libera, subcontratista y ambiente */
function libAsk(aid,opt){opt=opt||{};const free=!!opt.free;const x0=free?null:S.act.get(aid);if(!free&&!x0)return;
  const myS=SCK()?myScsI():null;const scOpts=free?(myS||[...S.con.keys()]).filter(Boolean):[];
  if(x0&&!canLibAsk(x0)){toast('Solo el subcontratista de la partida, el ingeniero de producción o Calidad pueden solicitarla.');return}
  if(free&&!(isCal()||(canWrite&&!PM())||(myS&&myS.length))){toast('Solo el subcontratista, el ingeniero de producción o Calidad pueden solicitarla.');return}
  const cur=x0&&libOf(aid);if(cur&&!libDone(cur.st)){libDetail(cur.id);return}const t0=todayIso();const fut=x0?(x0.days||[]).filter(d=>d>=t0).sort():[];const def=fut.length?fut[fut.length-1]:wshift(t0,1);
  const zf=x0&&window.__plano&&window.__plano.zoneFor?window.__plano.zoneFor(aid):null;const zd=zf&&zf.pisoId===pisoOfAct(aid)?{pts:zf.pts,vista:zf.vista,pisoId:zf.pisoId}:null;
  const F={need:def<=t0?wshift(t0,1):def,slot:'am',note:'',proto:[],zona:opt.zona||zd||null,zsrc:opt.zona?'mano':zd?'plan':'',nm:'',sc:scOpts.length===1?scOpts[0]:(U.libSc&&scOpts.includes(U.libSc)?U.libSc:''),amb:''};
  /* ambientes de los pisos a la vista, por piso */
  const ambOpts=()=>{const out=[];for(const p of visPisos())for(const s_ of [...S.sec.values()].filter(q=>pisoOfSecObj(q)===p.id).sort(byOrder))for(const a of [...S.amb.values()].filter(q=>q.sectorId===s_.id).sort(byOrder))out.push({a,p});return out};
  const grab=()=>{F.note=($('#lqn')||{}).value??F.note;if(free){F.nm=($('#lqt')||{}).value??F.nm;F.sc=($('#lqsc2')||{}).value??F.sc;F.amb=($('#lqa')||{}).value??F.amb}};
  const draw=()=>{const late=libLate(F.need);const x=x0||{id:'',name:F.nm||'Liberación fuera del lookahead',sc:F.sc,ambId:F.amb};
    lqModal(`<div class="lqtop"><b>Solicitar liberación</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${free?`
    <label>¿Qué se libera?<input id="lqt" value="${esc(F.nm)}" placeholder="Ej.: prueba hidráulica de montantes" autocomplete="off"></label>
    <div class="lq2">${scOpts.length===1?'':`<label>Subcontratista<select id="lqsc2"><option value="">— elige —</option>${scOpts.map(c=>`<option value="${esc(c)}"${F.sc===c?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select></label>`}
     <label>Ambiente<select id="lqa"><option value="">— elige —</option>${ambOpts().map(o=>`<option value="${o.a.id}"${F.amb===o.a.id?' selected':''}>${esc(o.p.code+' · '+o.a.code+' · '+(o.a.name||''))}</option>`).join('')}</select></label></div>
    <p class="lqmsg">No está en el lookahead: Calidad la verá igual que las demás.</p>`:lqHead(x,null)}
    <div class="lq2"><label>Fecha en que estará lista<input type="date" id="lqd" value="${F.need}" min="${t0}"></label><label>Hora sugerida<select id="lqs"><option value="am"${F.slot==='am'?' selected':''}>Mañana (08:00–12:00)</option><option value="pm"${F.slot==='pm'?' selected':''}>Tarde (13:00–17:00)</option></select></label></div>
    <p class="lqmsg ${late?'bad':'ok'}">${late?'Fuera de plazo: las liberaciones se piden un día antes (hasta las 18:00). Calidad decidirá si la programa.':'✓ Dentro del plazo.'}</p>
    <p class="lqmsg ${F.zona?'ok':''}">${F.zsrc==='mano'?'✓ Zona marcada en el plano.':F.zsrc==='plan'?'✓ Zona tomada del plan diario (puedes cambiarla en la vista Plano).':'Sin zona en el plano: podrás ubicarla después en la vista Plano.'}</p>
    <label>Protocolo (opcional, imagen o PDF)<span class="lqrow"><span class="lqfile">${F.proto.length?F.proto.length+' archivo(s) adjunto(s)':'Sin adjuntar'}</span><label class="ib">Adjuntar…<input type="file" accept="image/*,application/pdf" id="lqf" hidden></label></span></label>
    <label>Comentario para Calidad<textarea id="lqn" rows="3" placeholder="Ej.: prueba hidráulica a 100 psi lista desde las 8:00">${esc(F.note)}</textarea></label>
    <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-lq="send">Enviar solicitud</button></div>`,
   e=>{if(!e.target.closest('[data-lq="send"]'))return;grab();
      if(free){F.nm=(F.nm||'').trim();if(!F.nm){toast('Escribe qué se libera.');return}if(!F.sc){toast('Elige el subcontratista.');return}if(!F.amb||!S.amb.has(F.amb)){toast('Elige el ambiente.');return}
        if(!canLibAsk({sc:F.sc})){toast('Solo puedes pedirla para tu partida.');return}}
      const id=uid('lib');const ambId=x0?x0.ambId:F.amb;
      libSave(id,{actId:x0?x0.id:'',ambId,pisoId:x0?pisoOfAct(x0.id):pisoOfAmb(F.amb),sc:x0?x0.sc:F.sc,nm:x0?(x0.name||''):F.nm,crit:false,sup:false,rest:'',need:F.need,slot:F.slot,note:F.note.trim(),proto:F.proto,photos:[],obs:[],zona:F.zona||null,st:'sol',late:libLate(F.need),prog:null,hist:libHist(null,'sol',F.note.trim()),by:me.email,n:me.name||me.email,ts:NOW()},'Solicitud enviada a Calidad');lqClose()},
   async e=>{const t=e.target;if(t.id==='lqd'){grab();F.need=t.value;draw()}if(t.id==='lqs')F.slot=t.value;if(t.id==='lqsc2')F.sc=t.value;if(t.id==='lqa')F.amb=t.value;if(t.id==='lqt')F.nm=t.value;
     if(t.id==='lqf'&&t.files[0]){grab();try{toast('Adjuntando…');const fid=await libAttach(t.files[0],'');F.proto.push(fid);draw()}catch(err){toast(err.message)}}})};draw()}
/* detalle con acciones según el rol y el estado */
function libDetail(id){const l=LIB.get(id);if(!l){lqClose();return}const x=S.act.get(l.actId)||{id:l.actId,name:l.nm||'(actividad eliminada)',sc:l.sc,ambId:l.ambId};const s=LST[l.st]||LST.sol;
  const cal=isCal();const own=canLibAsk(x);/* el SC solo puede cambiarla mientras está solicitada, observada o levantada (reglas de la base) */const ownE=own&&(canWrite||['sol','obs','lev'].includes(l.st));const files=[...(l.proto||[]).map(f=>({f,k:'Protocolo'})),...(l.photos||[]).map(f=>({f,k:'Foto'}))];files.forEach(o=>loadFoto(o.f));
  let h=`<div class="lqtop"><span class="mono mu">${esc(id.slice(-6).toUpperCase())}</span><i class="lqst" style="--c:${s.c}">${esc(s.t)}</i>${l.late?'<i class="lqt crit">FUERA DE PLAZO</i>':''}<span style="flex:1"></span><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${lqHead(x,l)}
   <p class="lqmsg">Lista para el <b>${fmtD(l.need)}</b> (${l.slot==='pm'?'tarde':'mañana'})${l.prog&&l.prog.d?` · inspección <b>${fmtD(l.prog.d)}${l.prog.h?' '+esc(l.prog.h):''}</b>${l.prog.insp?' · '+esc(l.prog.insp):''}`:''}</p>
   ${l.note?`<p class="lqmsg">“${esc(l.note)}”</p>`:''}
   ${(l.obs||[]).length?`<div class="lqobs"><b>Observaciones de Calidad</b>${l.obs.map((o,i)=>`<label><input type="checkbox" data-lqo="${i}"${o.ok?' checked':''}${ownE||cal?'':' disabled'}> ${esc(o.t)}</label>`).join('')}</div>`:''}
   ${files.length?`<div class="lqfiles">${files.map(o=>{const d=FOTO.get(o.f)||'';const pdf=d.startsWith('data:application/pdf');return`<button type="button" class="lqfb" data-lqfile="${o.f}" title="${o.k}">${pdf||!d?`<span>${pdf?'PDF':'…'}</span>`:`<img src="${d}" alt="${o.k}">`}<small>${o.k}</small></button>`}).join('')}</div>`:''}
   <ol class="lqtl">${(l.hist||[]).slice().reverse().map(e=>`<li><i style="--c:${(LST[e.st]||LST.sol).c}"></i><b>${esc((LST[e.st]||{t:e.st}).t)}</b> <span>${e.t?fmtD(ldt(e.t))+' '+hhmm(e.t):''} · ${esc(e.n||'')}${e.note?' · '+esc(e.note):''}</span></li>`).join('')}</ol>`;
  const B=[];
  if(cal&&['sol','lev','pro'].includes(l.st))B.push(`<button class="ib${l.st==='pro'?'':' pri'}" data-lq="prog">${l.st==='pro'?'Reprogramar':'Programar inspección'}</button>`);
  if(cal&&['pro','lev','sol'].includes(l.st)){B.push('<button class="ib okb" data-lq="lib">✓ Liberar</button>');B.push('<button class="ib" data-lq="libm">✓ Liberar con obs. menores</button>');B.push('<button class="ib" data-lq="obs">⚠ Observar…</button>')}
  if(own&&l.st==='obs')B.push('<button class="ib pri" data-lq="lev">Observaciones levantadas · pedir reinspección</button>');
  if((ownE||cal)&&!libDone(l.st))B.push('<label class="ib">+ Foto / protocolo<input type="file" accept="image/*,application/pdf" id="lqadd" hidden></label>');
  if(cal&&libDone(l.st))B.push('<button class="ib" data-lq="reab">Reabrir</button>');
  if((ownE||cal)&&['sol','pro'].includes(l.st)&&(cal||canWrite||l.st==='sol'))B.push('<button class="ib" data-lq="anu">Anular solicitud</button>');
  if((cal||canWrite)&&l.st==='pro')B.push(`<button class="ib" data-lq="zona">${l.zona?'Reubicar en el plano':'Ubicar en el plano'}</button>`);
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
    <div class="lqobs"><b>Marcas de Calidad</b><label><input type="checkbox" id="lqcr"${l.crit?' checked':''}> Crítica: restringe el ingreso de la partida siguiente</label><label>Restringe a (opcional)<input id="lqrs" value="${esc(l.rest||'')}" placeholder="Ej.: Tarrajeo de muros"></label><label><input type="checkbox" id="lqsu"${l.sup?' checked':''}> Requiere supervisión (coordínala para esa hora)</label></div>
    <div class="lqbtns"><button class="ib" data-lq="back">Volver</button><button class="ib pri" data-lq="ok">Programar</button></div>`,
   e=>{const b=e.target.closest('[data-lq]');if(!b)return;if(b.dataset.lq==='back'){libDetail(id);return}
     const pd_=($('#lqpd')||{}).value;if(!pd_){toast('Elige el día.');return}if(!isWork(pd_)){toast(nwReason(pd_)+': elige un día laborable.');return}
     const prog={d:pd_,h:($('#lqph')||{}).value||'',insp:(($('#lqpi')||{}).value||'').trim()};if(!prog.insp){toast('Elige el inspector.');return}const crit=!!($('#lqcr')||{}).checked;const rest=crit?((($('#lqrs')||{}).value||'').trim()):'';libSave(id,{st:'pro',prog,crit,sup:!!($('#lqsu')||{}).checked,rest,hist:libHist(l,'pro',fmtD(pd_)+' '+prog.h)},'Inspección programada');libDetail(id)})}
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
  return{L}}
function lqCard(o){const x=o.x,l=o.l;const a=S.amb.get(x.ambId);const p=S.pis.get(l.pisoId);const s=LST[o.st]||LST.sol;
  const when=o.st==='pro'?(l.prog&&l.prog.d?`Inspección ${fmtD(l.prog.d)}${l.prog.h?' · '+esc(l.prog.h):''}`:'Falta fijar día de inspección'):libDone(o.st)?`✓ ${(l.done&&l.done.t)?fmtD(ldt(l.done.t))+' '+hhmm(l.done.t):''}`:o.st==='obs'?`${(l.obs||[]).filter(q=>!q.ok).length} observación(es) por levantar`:`Lista para el ${fmtD(l.need)}${l.late?' · fuera de plazo':''}`;
  return`<button type="button" class="lqcard" data-lqid="${l.id}" style="--c:${s.c}"><span class="lqtags">${l.crit?'<i class="lqt crit">CRÍTICA</i>':''}${l.sup?'<i class="lqt sup">SUPERVISIÓN</i>':''}${l.late&&o.st==='sol'?'<i class="lqt crit">FUERA DE PLAZO</i>':''}${!l.actId?'<i class="lqt">FUERA DEL LOOKAHEAD</i>':''}</span>
   <b>${esc(x.name||'')}</b><span>${esc([p&&p.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · '))}</span><span class="lqsc"><i style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)}</span><span class="lqwhen">${when}</span>${l.prog&&l.prog.insp?`<span class="lqins" data-lqin="${esc(l.prog.insp)}" title="Ver solo lo de este inspector">👷 ${esc(l.prog.insp)}</span>`:''}${l.crit&&l.rest&&!libDone(o.st)?`<span class="lqrest">⛔ Restringe: ${esc(l.rest)}</span>`:''}</button>`}
function renderLib(main){ensureLib();if(U.libV==='mat')U.libV='ban';const t0=todayIso(),tm=wshift(t0,1);const V=U.libV;const{L}=libItems();
  const open=L.filter(o=>!libDone(o.st));const wk=new Set(weekDays(curWeek()));const doneW=L.filter(o=>libDone(o.st)&&o.l.done&&wk.has(ldt(o.l.done.t)));const first=doneW.filter(o=>!(o.l.hist||[]).some(e=>e.st==='obs'));
  const tiles=[['Para mañana',open.filter(o=>(o.l.prog&&o.l.prog.d===tm)||(!o.l.prog&&o.l.need===tm)).length,`${open.filter(o=>o.st==='sol'&&o.l.need<=tm).length} sin programar`,'#E0A01B'],
    ['Programadas hoy',open.filter(o=>o.st==='pro'&&o.l.prog&&o.l.prog.d===t0).length,'','#1F5F7A'],['Observadas',open.filter(o=>o.st==='obs').length,'esperan levantamiento','#9A6A12'],
    ['Por programar',open.filter(o=>o.st==='sol'||o.st==='lev').length,`${open.filter(o=>o.st==='lev').length} piden reinspección`,'#6B747B'],['Liberadas · semana',doneW.length,`${doneW.filter(o=>o.st==='libm').length} con obs. menores`,'#2E7D4F'],['Liberadas a la primera',doneW.length?Math.round(first.length/doneW.length*100)+'%':'—',doneW.length?`${first.length} de ${doneW.length}`:'','#46504A']];
  const scs=[...new Set(L.map(o=>o.x.sc))].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const lateN=open.filter(o=>o.st==='sol'&&o.l.late).length;
  let h=`<div class="scroll"><div class="wrap lqwrap">${pageHead('Liberaciones',`${pisoLabel()} · ${({ban:'Bandeja',cal:'Calendario',map:'Plano'})[V]||''}`,'<button class="ib" id="lqpdf">Programación de mañana (PDF)</button>'+(me&&(isCal()||canWrite&&!PM()||SCK())?'<button class="ib pri" id="lqnew">+ Solicitar liberación</button>':''))}
   <div class="lqbar fbar"><span class="seg" id="lqv">${[['ban','Bandeja'],['cal','Calendario'],['map','Plano']].map(([k,t])=>`<button data-v="${k}" class="${V===k?'on':''}">${t}</button>`).join('')}</span>
    ${(()=>{const n=(U.libSc?1:0)+(U.libIn?1:0)+(U.libQ?1:0);return`<button type="button" class="ib ftog${U.fOpen?' on':''}" data-ftog aria-expanded="${U.fOpen?'true':'false'}">Filtros${n?` · ${n}`:''}</button>`})()}<span class="fmore${U.fOpen?' open':''}">
    ${SCK()?'':`<select class="tin" id="lqsc" aria-label="Subcontratista"><option value="">Todos los SC</option>${scs.map(c=>`<option value="${c}"${U.libSc===c?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select>`}
    ${(()=>{const I=[...new Set([...libInsp(),...[...LIB.values()].map(l=>l.prog&&l.prog.insp).filter(Boolean)])];if(!I.length)return'';const n=k=>[...LIB.values()].filter(l=>l.prog&&l.prog.insp===k&&(l.st==='pro'||l.st==='lev')).length;
      return`<select class="tin" id="lqin" aria-label="Inspector"><option value="">Todos los inspectores</option>${I.map(k=>`<option value="${esc(k)}"${U.libIn===k?' selected':''}>${esc(k)}${n(k)?' · '+n(k)+' por inspeccionar':''}</option>`).join('')}</select>`})()}
    <input class="tin" id="lqq" data-fk="lqq" type="search" placeholder="Buscar actividad, ambiente, SC…" value="${esc(U.libQ||'')}" aria-label="Buscar"></span>
    </div>`;
  if(U.piso&&V!=='map'){const oth=[...LIB.values()].filter(l=>l.st!=='anu'&&!libDone(l.st)&&l.pisoId&&l.pisoId!==U.piso).length;if(oth)h+=`<div class="callout">Estás viendo solo <b>${esc((S.pis.get(U.piso)||{}).name||'')}</b> (selector de piso de arriba). Hay <b>${oth}</b> liberación(es) abierta(s) en otros pisos. <button class="ib" data-lqall>Ver todos los pisos</button></div>`}
  if(U.libIn)h+=`<div class="callout">Agenda de <b>${esc(U.libIn)}</b>: solo se ven sus inspecciones. <button class="ib" data-lqin="${esc(U.libIn)}">Quitar filtro</button></div>`;
  if(libErr)h+=`<div class="callout">No se pudieron leer las liberaciones (${esc(libErr)}). Falta publicar las reglas nuevas de Firestore.</div>`;
  {h+=`<div class="lqtiles">${tiles.map(([k,v,s,c])=>`<div class="lqtile" style="--c:${c}"><span>${k}</span><b>${v}</b><small>${s}</small></div>`).join('')}</div>`;
    if(lateN)h+=`<div class="callout warnc">${lateN} solicitud${lateN>1?'es':''} llegaron fuera de plazo (se piden un día antes, hasta las 18:00). Calidad decide si las programa.</div>`}
  if(V==='ban'){const col=(t,c,hint,arr)=>`<section class="lqcol"><div class="lqch"><i style="--c:${c}"></i><b>${t}</b><span>${arr.length}</span></div><small>${hint}</small>${arr.map(lqCard).join('')||'<p class="mu" style="font-size:13px;margin:4px 2px">—</p>'}</section>`;
    const by=(a,b)=>((a.l&&(a.l.prog&&a.l.prog.d||a.l.need))||'').localeCompare((b.l&&(b.l.prog&&b.l.prog.d||b.l.need))||'');
    const d7=addD(t0,-7);
    h+=`<div class="lqcols">${col('Solicitadas',LST.sol.c,'Calidad debe programarlas',open.filter(o=>o.st==='sol'||o.st==='lev').sort(by))}${col('Programadas',LST.pro.c,'Inspección con día y hora',open.filter(o=>o.st==='pro').sort(by))}${col('Observadas',LST.obs.c,'El SC levanta y pide reinspección',open.filter(o=>o.st==='obs').sort(by))}${col('Liberadas · 7 días',LST.lib.c,'Últimos 7 días',L.filter(o=>libDone(o.st)&&o.l.done&&ldt(o.l.done.t)>=d7).sort((a,b)=>(b.l.done.t||0)-(a.l.done.t||0)))}</div>`}
  else if(V==='cal'){const days=weekDays(U.week);h+=`<div class="lqbar lqwbar"><button class="ib" data-lqw="-1" aria-label="Semana anterior">‹</button><b class="mono">Semana ${U.week}</b><button class="ib" data-lqw="1" aria-label="Semana siguiente">›</button>${U.week!==curWeek()?'<button class="ib" data-lqw="0">Esta semana</button>':''}</div>
    <div class="lqcal">${days.map(d=>{const ev=L.filter(o=>o.l.prog&&o.l.prog.d===d&&(o.st==='pro'||libDone(o.st)||o.st==='obs'||o.st==='lev')).sort((a,b)=>(a.l.prog.h||'').localeCompare(b.l.prog.h||''));const k=d===t0?'hoy':d===tm?'man':'';
      return`<section class="lqday ${k}"><div class="lqdh"><b>${DL[(pd(d).getUTCDay()+6)%7]}</b><span class="mono">${fmtD(d)}</span>${k?`<i>${k==='hoy'?'HOY':'MAÑANA'}</i>`:''}</div>${ev.map(o=>{const s=LST[o.st];return`<button type="button" class="lqev" data-lqid="${o.l.id}" style="--c:${s.c}"><span><b class="mono">${esc(o.l.prog.h||'—')}</b> ${esc(s.t)}</span><b>${esc(o.x.name)}</b><span>${esc((S.pis.get(o.l.pisoId)||{}).code||'')} · ${esc((S.amb.get(o.x.ambId)||{}).code||'')} · ${esc(conOf(o.x.sc).name)}</span>${o.l.prog.insp?`<span class="lqins" data-lqin="${esc(o.l.prog.insp)}" title="Ver solo lo de este inspector">👷 ${esc(o.l.prog.insp)}</span>`:''}</button>`}).join('')||'<p class="mu" style="font-size:12.5px;margin:6px 4px">Sin inspecciones</p>'}</section>`}).join('')}</div>`;
    const un=open.filter(o=>o.st==='sol'||o.st==='lev');if(un.length)h+=`<div class="lqun"><b>Sin programar · ${un.length}</b>${un.map(o=>`<button type="button" class="ib" data-lqid="${o.l.id}">${esc(o.x.name)} · ${esc((S.amb.get(o.x.ambId)||{}).code||'')} · lista ${fmtD(o.l.need)}${o.l.late?' · fuera de plazo':''}</button>`).join('')}</div>`}
  else if(V==='map'){const API=window.__plano&&window.__plano.capPlan?window.__plano:null;
    /* el módulo de planos se carga la primera vez: al terminar se vuelve a dibujar (antes había que tocar un piso) */
    if(!API)loadPlanoMod().then(()=>{if(U.tab==='lib'&&U.libV==='map')requestRender()}).catch(()=>{});else API.capInit(t0);
    /* el plano muestra solo las inspecciones del día elegido arriba que aún no se liberan */
    const day=curDay();const ps=pisos();const all=L.filter(o=>o.l&&o.l.prog&&o.l.prog.d===day&&!libDone(o.st)&&o.st!=='anu');const pid=U.piso||(ps.find(p=>p.id===U.libP)||ps.find(p=>all.some(o=>(o.l?o.l.pisoId:pisoOfAct(o.x.id))===p.id))||ps[0]||{}).id||'';U.libP=pid;
    const ORD=['obs','lev','sol','pro','lib','libm'];const here=all.filter(o=>(o.l?o.l.pisoId:pisoOfAct(o.x.id))===pid).sort((a,b)=>ORD.indexOf(a.st)-ORD.indexOf(b.st));
    const num=new Map();here.forEach((o,i)=>num.set(o.l?o.l.id:'a:'+o.x.id,i+1));
    const zones=here.filter(o=>o.l&&o.l.zona&&o.l.zona.pts&&o.l.zona.pts.length).map(o=>({id:'lz_'+o.l.id,kind:'zona',actId:o.x.id,pts:o.l.zona.pts,vista:o.l.zona.vista||'',pisoId:pid,_lib:o.l.id}));
    const D=LQDRAW&&LQDRAW.pid===pid?LQDRAW:null;const dx=D&&S.act.get(D.actId);
    h+=`<div class="lqbar">${ps.length>1&&!U.piso?`<span class="lqchips">${ps.map(p=>`<button type="button" data-lqp="${p.id}" class="${p.id===pid?'on':''}">${esc(p.code)} · ${esc(p.name)}</button>`).join('')}</span>`:''}
     <span class="lqleg">${['pro','obs','lev'].map(k=>`<span><i style="--c:${LST[k].c}"></i>${LST[k].t.split(' ·')[0]}</span>`).join('')}</span></div>
     ${D?`<div class="lqdraw">✏️ <b>Arrastra sobre el plano</b> para marcar la zona de “${esc(dx?dx.name:'')}” <button class="ib" data-lqzcancel>Cancelar</button></div>`:''}
`;const note=`<p class="note" style="margin:6px 2px 0">Inspecciones del <b>${DOW_L[(pd(day).getUTCDay()+6)%7].toLowerCase()} ${fmtD(day)}</b> que aún no se liberan (cambia el día arriba). Toca una zona para abrir su liberación; las que no tienen zona se ubican con “Ubicar”.</p>`;const side=`${ORD.map(k=>{const A=here.filter(o=>o.st===k);return A.length?`<div class="lqsg"><b style="color:${LST[k].c}">${esc(LST[k].t)} · ${A.length}</b>${A.map(o=>{const n=num.get(o.l?o.l.id:'a:'+o.x.id);const hasZ=!!(o.l&&o.l.zona);const canZ=!!o.l&&o.st==='pro'&&(canWrite||isCal());
       return`<div class="lqli2"><button type="button" class="lqli" ${o.l?`data-lqid="${o.l.id}"`:`data-lqask="${o.x.id}"`}><i style="--c:${LST[k].c}">${n}</i><span><b>${esc(o.x.name)}</b><small>${esc((S.amb.get(o.x.ambId)||{}).code||'')} · ${esc(conOf(o.x.sc).name)}${hasZ?'':' · sin zona'}</small></span></button>${canZ?`<button type="button" class="ib" data-lqz="${o.l?o.l.id:''}" data-lqza="${o.x.id}">${hasZ?'Reubicar':'Ubicar'}</button>`:''}</div>`}).join('')}</div>`:''}).join('')||`<p class="mu">No hay inspecciones pendientes para el ${fmtD(day)} en este piso.</p>`}`;
    /* el visor se arma una sola vez y no se saca de la página (así no se descuadra ni desaparece) */
    if(main.dataset.lqv!=='map'||!$('#lqplan',main)){main.innerHTML=`<div class="scroll"><div class="wrap lqwrap"><div id="lqtop" class="lqwrap"></div><div class="lqmap"><div class="lqplan"><div class="kplanw"><div class="kplan" id="lqplan"></div></div><div id="lqnote"></div></div><aside class="lqside" id="lqside"></aside></div></div></div>`;main.dataset.lqv='map';wireLib(main)}
    const setH=(id,v)=>{const el=$('#'+id,main);if(el&&el.dataset.h!==v){el.innerHTML=v;el.dataset.h=v}};setH('lqtop',h.replace('<div class="scroll"><div class="wrap lqwrap">',''));setH('lqnote',note);setH('lqside',side);
    LQHOST=$('#lqplan',main);
    if(API){const colors=new Map(here.filter(o=>o.l&&o.l.zona).map(o=>[o.x.id,LST[o.st].c]));
      API.capPlan(LQHOST,{pid,zones,colors,nums:new Map(),bs:34,lab:z=>num.get(z._lib),onPick:(aid,z)=>{if(D)return;if(z&&z._lib)libDetail(z._lib)}});
      API.capDraw(LQHOST,D?(pts,vista)=>{const d=LQDRAW;LQDRAW=null;API.capDraw(LQHOST,null);const zona={pts,vista,pisoId:pid};if(d.libId)libSave(d.libId,{zona},'Zona de la liberación guardada');else libAsk(d.actId,{zona});render()}:null)}
    return}
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
    };
  main.oninput=e=>{if(e.target.id==='lqq'){U.libQ=e.target.value;render()}};
  main.onchange=async e=>{const t=e.target;if(t.id==='lqsc'){U.libSc=t.value;render()}if(t.id==='lqin'){U.libIn=t.value;render()}}}
/* «+ Solicitar liberación»: sugerencias del lookahead (próximas actividades que la persona puede pedir) u «Otra…» fuera del lookahead */
function libPick(btn){const t0=todayIso(),lo=addD(t0,-7),hi=addD(t0,21);const mine=SCK()?new Set(myScsI()):null;
  const L=[...S.act.values()].filter(x=>canLibAsk(x)&&(!mine||mine.has(x.sc))&&(!U.libSc||x.sc===U.libSc)&&!(libOf(x.id)&&!libDone(libOf(x.id).st))&&(x.days||[]).some(d=>d>=lo&&d<=hi))
    .map(x=>({x,a:S.amb.get(x.ambId),p:S.pis.get(pisoOfAct(x.id)),d:((x.days||[]).filter(d=>d>=t0).sort()[0])||(x.days||[]).slice().sort().pop()||''})).filter(o=>o.a&&(!U.piso||pisoOfAct(o.x.id)===U.piso)).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,300);
  openPop(btn,`<div class="ph">Solicitar liberación</div><div class="ptx">${L.length?'Sugerencias del lookahead (próximas actividades). Si no está, elige «Otra…».':'No hay actividades próximas en el lookahead: escribe qué se libera.'}</div><div class="qrow"><select id="lqpk" style="max-width:360px" aria-label="Actividad">${L.map(o=>`<option value="${o.x.id}">${esc((o.p?o.p.code+' · ':'')+o.a.code)} · ${esc(o.x.name)} · ${esc(conOf(o.x.sc).name)}${o.d?' · '+fmtD(o.d):''}</option>`).join('')}<option value="__free">Otra (no está en el lookahead)…</option></select><button data-do="go">Siguiente</button></div>`,{go:()=>{const v=($('#lqpk')||{}).value;if(v==='__free')setTimeout(()=>libAsk('',{free:true}),0);else if(v)setTimeout(()=>libAsk(v),0)}})}
/* --- plantillas de ambiente: sugieren los nombres del catálogo del lookahead --- */
function tplDatalists(tpls){const scs=new Set();tpls.forEach(t=>t.acts.forEach(a=>{if(a.sc)scs.add(a.sc)}));const cat=[...libCatalog().values()];
  return[...scs].map(sc=>`<datalist id="lqdl-${esc(sc)}">${cat.filter(e=>e.sc===sc).sort((a,b)=>b.n-a.n).slice(0,200).map(e=>`<option value="${esc(e.name)}"></option>`).join('')}</datalist>`).join('')}
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

