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
/* zona de la actividad tomada del plan diario (si está en su piso) */
function libZoneOf(aid){const zf=aid&&window.__plano&&window.__plano.zoneFor?window.__plano.zoneFor(aid):null;return zf&&zf.pisoId===pisoOfAct(aid)?{pts:zf.pts,vista:zf.vista,pisoId:zf.pisoId}:null}
/* ids = una actividad o varias del lookahead (sugerencias) · opt.free = algo que no está en el lookahead (opt.nm = texto ya escrito en el buscador) */
function libAsk(ids,opt){opt=opt||{};const free=!!opt.free;const L0=free?[]:(Array.isArray(ids)?ids:[ids]).map(i=>S.act.get(i)).filter(Boolean);if(!free&&!L0.length)return;
  const x0=L0.length===1?L0[0]:null;const multi=L0.length>1;
  const myS=SCK()?myScsI():null;const scOpts=free?(myS||[...S.con.keys()]).filter(Boolean):[];
  if(L0.some(x=>!canLibAsk(x))){toast('Solo el subcontratista de la partida, el ingeniero de producción o Calidad pueden solicitarla.');return}
  if(free&&!(isCal()||(canWrite&&!PM())||(myS&&myS.length))){toast('Solo el subcontratista, el ingeniero de producción o Calidad pueden solicitarla.');return}
  const cur=x0&&libOf(x0.id);if(cur&&!libDone(cur.st)){libDetail(cur.id);return}const t0=todayIso(),tm=wshift(t0,1),t2=wshift(t0,2);
  const defOf=x=>{const fut=(x.days||[]).filter(d=>d>=t0).sort();const d=fut.length?fut[fut.length-1]:tm;return d<=t0?tm:d};
  const def=L0.length?L0.map(defOf).sort()[0]:tm;
  const zd=x0?libZoneOf(x0.id):null;
  const F={need:def,slot:'am',note:'',proto:[],zona:opt.zona||zd||null,zsrc:opt.zona?'mano':zd?'plan':'',nm:opt.nm||'',sc:scOpts.length===1?scOpts[0]:(U.libSc&&scOpts.includes(U.libSc)?U.libSc:''),amb:''};
  /* ambientes de los pisos a la vista, por piso */
  const ambOpts=()=>{const out=[];for(const p of visPisos())for(const s_ of [...S.sec.values()].filter(q=>pisoOfSecObj(q)===p.id).sort(byOrder))for(const a of [...S.amb.values()].filter(q=>q.sectorId===s_.id).sort(byOrder))out.push({a,p});return out};
  const grab=()=>{F.note=($('#lqn')||{}).value??F.note;if(free){F.nm=($('#lqt')||{}).value??F.nm;F.sc=($('#lqsc2')||{}).value??F.sc;F.amb=($('#lqa')||{}).value??F.amb}};
  const head=()=>{if(multi)return`<div class="lqh"><b>${L0.length} actividades</b><ul class="lqfl">${L0.map(x=>{const a=S.amb.get(x.ambId)||{};const p=S.pis.get(pisoOfAct(x.id))||{};return`<li><i style="--c:${conOf(x.sc).color}"></i><b>${esc(x.name||'')}</b> <span>${esc([p.code,a.code].filter(Boolean).join(' · '))} · ${esc(conOf(x.sc).name)}</span></li>`}).join('')}</ul></div>`;
    if(free)return`<label>¿Qué se libera?<input id="lqt" value="${esc(F.nm)}" placeholder="Ej.: prueba hidráulica de montantes" autocomplete="off"></label>
    <div class="lq2">${scOpts.length===1?'':`<label>Subcontratista<select id="lqsc2"><option value="">— elige —</option>${scOpts.map(c=>`<option value="${esc(c)}"${F.sc===c?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select></label>`}
     <label>Ambiente<select id="lqa"><option value="">— elige —</option>${ambOpts().map(o=>`<option value="${o.a.id}"${F.amb===o.a.id?' selected':''}>${esc(o.p.code+' · '+o.a.code+' · '+(o.a.name||''))}</option>`).join('')}</select></label></div>
    <p class="lqmsg">No está en el lookahead: Calidad la verá igual que las demás.</p>`;return lqHead(x0,null)};
  const draw=()=>{const late=libLate(F.need);const other=F.need!==tm&&F.need!==t2;
    lqModal(`<div class="lqtop"><b>Solicitar liberación${multi?'es':''}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${head()}
    <div class="lq2"><div class="lqlab">¿Cuándo estará lista?<span class="lqchs"><button type="button" class="chip${F.need===tm?' on':''}" data-lqnd="${tm}">Mañana <small>${fmtD(tm)}</small></button><button type="button" class="chip${F.need===t2?' on':''}" data-lqnd="${t2}">Pasado <small>${fmtD(t2)}</small></button><input type="date" id="lqd" class="${other?'on':''}" value="${F.need}" min="${t0}" aria-label="Otra fecha"></span></div>
     <div class="lqlab">Hora sugerida<span class="seg lqseg"><button type="button" data-lqsl="am" class="${F.slot==='am'?'on':''}">Mañana <small>08–12</small></button><button type="button" data-lqsl="pm" class="${F.slot==='pm'?'on':''}">Tarde <small>13–17</small></button></span></div></div>
    <p class="lqmsg ${late?'bad':'ok'}">${late?'Fuera de plazo: las liberaciones se piden un día antes (hasta las 18:00). Calidad decidirá si la programa.':'✓ Dentro del plazo.'}</p>
    ${multi?'<p class="lqmsg">Cada una toma su zona del plan diario, si la tiene.</p>':`<p class="lqmsg ${F.zona?'ok':''}">${F.zsrc==='mano'?'✓ Zona marcada en el plano.':F.zsrc==='plan'?'✓ Zona tomada del plan diario (puedes cambiarla en la vista Plano).':'Sin zona en el plano: podrás ubicarla después en la vista Plano.'}</p>`}
    <label>Protocolo (opcional, imagen o PDF)<span class="lqrow"><span class="lqfile">${F.proto.length?F.proto.length+' archivo(s) adjunto(s)':'Sin adjuntar'}</span><label class="ib">Adjuntar…<input type="file" accept="image/*,application/pdf" id="lqf" hidden></label></span></label>
    <label>Comentario para Calidad<textarea id="lqn" rows="3" placeholder="Ej.: prueba hidráulica a 100 psi lista desde las 8:00">${esc(F.note)}</textarea></label>
    <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-lq="send">${multi?`Enviar ${L0.length} solicitudes`:'Enviar solicitud'}</button></div>`,
   e=>{let b;if((b=e.target.closest('[data-lqnd]'))){grab();F.need=b.dataset.lqnd;draw();return}if((b=e.target.closest('[data-lqsl]'))){grab();F.slot=b.dataset.lqsl;draw();return}
      if(!e.target.closest('[data-lq="send"]'))return;grab();
      if(free){F.nm=(F.nm||'').trim();if(!F.nm){toast('Escribe qué se libera.');return}if(!F.sc){toast('Elige el subcontratista.');return}if(!F.amb||!S.amb.has(F.amb)){toast('Elige el ambiente.');return}
        if(!canLibAsk({sc:F.sc})){toast('Solo puedes pedirla para tu partida.');return}}
      const note=F.note.trim(),late=libLate(F.need);
      const base={crit:false,sup:false,rest:'',need:F.need,slot:F.slot,note,proto:F.proto,photos:[],obs:[],st:'sol',late,prog:null,hist:libHist(null,'sol',note),by:me.email,n:me.name||me.email,ts:NOW()};
      if(free)libSave(uid('lib'),{...base,actId:'',ambId:F.amb,pisoId:pisoOfAmb(F.amb),sc:F.sc,nm:F.nm,zona:F.zona||null});
      else L0.forEach(x=>libSave(uid('lib'),{...base,actId:x.id,ambId:x.ambId,pisoId:pisoOfAct(x.id),sc:x.sc,nm:x.name||'',zona:(x0&&F.zona)||libZoneOf(x.id)||null}));
      toast(multi?`${L0.length} solicitudes enviadas a Calidad`:'Solicitud enviada a Calidad');lqClose()},
   async e=>{const t=e.target;if(t.id==='lqd'){grab();if(t.value)F.need=t.value;draw()}if(t.id==='lqsc2')F.sc=t.value;if(t.id==='lqa')F.amb=t.value;if(t.id==='lqt')F.nm=t.value;
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
  /* solo una inspección programada se libera u observa (así siempre queda día, hora e inspector) */
  if(cal&&['sol','lev','pro'].includes(l.st))B.push(`<button class="ib${l.st==='pro'?'':' pri'}" data-lq="prog">${l.st==='pro'?'Reprogramar':'→ Programar inspección'}</button>`);
  if(cal&&l.st==='pro'){B.push('<button class="ib okb" data-lq="lib">✓ Liberar</button>');B.push('<button class="ib" data-lq="libm">✓ Liberar con obs. menores…</button>');B.push('<button class="ib" data-lq="obs">⚠ Observar…</button>')}
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
    if(k==='prog'){libProg([id],{back:true});return}
    if(k==='lib'){if(libFree(id,''))setTimeout(()=>libDetail(id),80);return}
    if(k==='libm'){libLibDlg(id,{menor:true,back:true});return}
    if(k==='obs'){libObs(id,{back:true});return}
    if(k==='lev'){(async()=>{const note=await uiAsk({title:'Pedir reinspección',input:{label:'¿Qué se corrigió? (opcional)',placeholder:'Ej.: se resanaron las fisuras del eje 3'},ok:'Pedir reinspección'});if(note==null)return;libSave(id,{st:'lev',hist:libHist(l,'lev',note.trim()),obs:(l.obs||[]).map(o=>({...o,ok:true}))},'Calidad verá que pides reinspección');setTimeout(()=>libDetail(id),80);})();return}
    if(k==='reab'){const st=l.prog&&l.prog.d?'pro':'sol';libSave(id,{st,hist:libHist(l,st,'Reabierta')},'Liberación reabierta');setTimeout(()=>libDetail(id),80);return}
    if(k==='anu'){(async()=>{if(!await uiAsk({title:'¿Anular esta solicitud de liberación?',text:'Queda en el historial como anulada.',ok:'Anular',tone:'danger'}))return;libSave(id,{st:'anu',hist:libHist(l,'anu','')},'Solicitud anulada');lqClose();})();return}},
   async e=>{const t=e.target;
    if(t.dataset.lqo!=null){const i=+t.dataset.lqo;const obs=(l.obs||[]).map((o,j)=>j===i?{...o,ok:t.checked}:o);libSave(id,{obs});return}
    if(t.id==='lqadd'&&t.files[0]){try{toast('Adjuntando…');const fid=await libAttach(t.files[0],id);const pdf=(FOTO.get(fid)||'').startsWith('data:application/pdf');const cur=LIB.get(id)||l;
      libSave(id,pdf?{proto:[...(cur.proto||[]),fid]}:{photos:[...(cur.photos||[]),fid]},'Archivo adjunto');setTimeout(()=>libDetail(id),80)}catch(err){toast(err.message)}}})}
/* --- deshacer de la bandeja: devuelve los campos que tocó el paso --- */
const LQK=['st','prog','crit','sup','rest','hist','obs','done'];
function libSnap(ids){return ids.map(id=>{const l=LIB.get(id)||{};const o={};LQK.forEach(k=>{o[k]=l[k]===undefined?(k==='hist'||k==='obs'?[]:k==='rest'?'':k==='crit'||k==='sup'?false:null):l[k]});return[id,o]})}
function libUndoToast(msg,snap){toast(msg,'Deshacer',()=>{snap.forEach(([id,o])=>libSave(id,o));toast('Deshecho')})}
/* liberar (sin o con observaciones menores); devuelve false si no corresponde */
function libFree(id,menor,silent){const l=LIB.get(id);if(!l||l.st!=='pro')return false;const snap=libSnap([id]);const m=(menor||'').trim();const k=m?'libm':'lib';
  libSave(id,{st:k,done:{t:NOW(),by:me.email,n:me.name||me.email},hist:libHist(l,k,m),...(m?{obs:[...(l.obs||[]),{t:m,ok:false,menor:true}]}:{})});
  if(!silent)libUndoToast(k==='lib'?'Liberada':'Liberada con observaciones menores',snap);return true}
/* actividad siguiente de otra partida en el mismo ambiente: sugerencia para «restringe a» */
function libNextAct(l){const x=S.act.get(l.actId)||{ambId:l.ambId,sc:l.sc};if(!x.ambId)return'';const L=[...S.act.values()].filter(y=>y.ambId===x.ambId).sort(byOrder);const i=x.id?L.findIndex(y=>y.id===x.id):-1;
  for(let j=i+1;j<L.length;j++)if(L[j].sc&&L[j].sc!==x.sc)return L[j].name||'';return''}
const lqHM=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const lqMin=h=>{const[a,b]=String(h||'').split(':').map(Number);return(a||0)*60+(b||0)};
/* programar una o varias inspecciones (al arrastrar a «Programadas» o desde el detalle): día, hora, inspector, crítica y supervisión */
function libProg(ids,opt){opt=opt||{};ids=(Array.isArray(ids)?ids:[ids]).filter(i=>{const l=LIB.get(i);return l&&['sol','lev','pro'].includes(l.st)});if(!ids.length)return;
  if(!isCal()){toast('Solo Calidad programa las inspecciones.');return}
  const Ls=ids.map(i=>LIB.get(i));const l1=Ls[0];const multi=Ls.length>1;const t0=todayIso(),tm=wshift(t0,1),t2=wshift(t0,2);const p=l1.prog||{};
  let d0=multi?Ls.map(l=>l.need>t0?l.need:tm).sort()[0]:(p.d||(l1.need>t0?l1.need:tm));if(!isWork(d0))d0=wshift(d0,1);
  const F={d:d0,h:p.h||(l1.slot==='pm'?'14:00':'09:00'),step:60,insp:p.insp||'',crit:multi?Ls.every(l=>l.crit):!!l1.crit,sup:multi?Ls.every(l=>l.sup):!!l1.sup,rest:multi?'':(l1.rest||''),hs:{}};
  const hours=()=>{const out={};let m=lqMin(F.h);Ls.forEach(l=>{out[l.id]=F.hs[l.id]||lqHM(Math.min(m,23*60+59));m+=F.step});return out};
  const grab=()=>{const g=($('#lqpd')||{}).value;if(g)F.d=g;const h=($('#lqph')||{}).value;if(h)F.h=h;const i=$('#lqpi');if(i&&i.tagName==='INPUT')F.insp=i.value;
    const c=$('#lqcr');if(c)F.crit=c.checked;const s_=$('#lqsu');if(s_)F.sup=s_.checked;const r=$('#lqrs');if(r)F.rest=r.value;$$('[data-lqph]').forEach(e=>{F.hs[e.dataset.lqph]=e.value})};
  const I=libInsp();
  const draw=()=>{const H=hours();const load=n=>[...LIB.values()].filter(q=>!ids.includes(q.id)&&q.prog&&q.prog.insp===n&&q.st==='pro'&&q.prog.d===F.d).length;
    const other=F.d!==tm&&F.d!==t2&&F.d!==t0;const sug=multi?'':libNextAct(l1);
    lqModal(`<div class="lqtop"><b>${multi?`Programar ${Ls.length} inspecciones`:'Programar inspección'}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    ${multi?`<div class="lqh"><ul class="lqfl">${Ls.map(l=>{const a=S.amb.get(l.ambId)||{};return`<li><i style="--c:${conOf(l.sc).color}"></i><b>${esc(l.nm||'')}</b> <span>${esc(((S.pis.get(l.pisoId)||{}).code||'')+' · '+(a.code||''))} · lista ${fmtD(l.need)}${l.st==='lev'?' · reinspección':''}</span><input type="time" data-lqph="${l.id}" value="${H[l.id]}" aria-label="Hora"></li>`}).join('')}</ul></div>`
      :`<p class="lqmsg"><b>${esc(l1.nm||'')}</b> · ${esc(((S.amb.get(l1.ambId)||{}).code)||'')} · ${esc(conOf(l1.sc).name)} · lista para el ${fmtD(l1.need)} (${l1.slot==='pm'?'tarde':'mañana'})${l1.st==='lev'?' · <b>reinspección</b>':''}</p>`}
    <div class="lqlab">Día<span class="lqchs">${[[t0,'Hoy'],[tm,'Mañana'],[t2,'Pasado']].map(([d,t])=>`<button type="button" class="chip${F.d===d?' on':''}" data-lqpdd="${d}">${t} <small>${fmtD(d)}</small></button>`).join('')}<input type="date" id="lqpd" class="${other?'on':''}" value="${F.d}" aria-label="Otro día"></span></div>
    <div class="lqlab">${multi?'Primera hora':'Hora'}<span class="lqchs">${['08:00','09:00','10:00','11:00','14:00','15:00','16:00'].map(h=>`<button type="button" class="chip${F.h===h?' on':''}" data-lqphh="${h}">${h}</button>`).join('')}<input type="time" id="lqph" value="${esc(F.h)}" aria-label="Otra hora"></span></div>
    ${multi?`<div class="lqlab">Una tras otra<span class="seg lqseg">${[[0,'A la vez'],[30,'Cada 30 min'],[60,'Cada hora']].map(([v,t])=>`<button type="button" data-lqst="${v}" class="${F.step===v?'on':''}">${t}</button>`).join('')}</span></div>`:''}
    <div class="lqlab">Inspector${I.length?`<span class="lqchs" role="radiogroup">${[...I,...(F.insp&&!I.includes(F.insp)?[F.insp]:[])].map(n=>{const c=load(n);return`<button type="button" role="radio" aria-checked="${F.insp===n}" class="chip${F.insp===n?' on':''}" data-lqpi="${esc(n)}">👷 ${esc(n)}${c?` <small>${c} ese día</small>`:''}</button>`}).join('')}</span>`:`<input id="lqpi" value="${esc(F.insp||me.name||'')}" placeholder="Nombre del inspector">`}</div>
    ${I.length?'':'<p class="lqmsg">Tip: carga la lista de inspectores en <b>Configuración › Inspectores de calidad</b> para elegirlos con un toque.</p>'}
    <div class="lqobs lqsw"><b>Marcas de Calidad</b>
     <label class="lqtg"><input type="checkbox" id="lqcr"${F.crit?' checked':''}><span></span>Crítica: restringe el ingreso de la partida siguiente</label>
     ${F.crit?`<label>Restringe a${multi?' (vacío = la partida siguiente de cada ambiente)':''}<input id="lqrs" value="${esc(F.rest||sug)}" placeholder="${esc(sug||'Ej.: Tarrajeo de muros')}"></label>`:''}
     <label class="lqtg"><input type="checkbox" id="lqsu"${F.sup?' checked':''}><span></span>Requiere supervisión (coordínala para esa hora)</label></div>
    <div class="lqbtns"><button class="ib" data-lq="back">${opt.back?'Volver':'Cancelar'}</button><button class="ib pri" data-lq="ok">${multi?`Programar ${Ls.length}`:'Programar'}</button></div>`,
   e=>{let b;const t=e.target;
     if((b=t.closest('[data-lqpdd]'))){grab();F.d=b.dataset.lqpdd;draw();return}
     if((b=t.closest('[data-lqphh]'))){grab();F.h=b.dataset.lqphh;F.hs={};draw();return}
     if((b=t.closest('[data-lqst]'))){grab();F.step=+b.dataset.lqst;F.hs={};draw();return}
     if((b=t.closest('[data-lqpi]'))){grab();F.insp=b.dataset.lqpi;draw();return}
     if(!(b=t.closest('[data-lq]')))return;if(b.dataset.lq==='back'){if(opt.back&&!multi)libDetail(ids[0]);else lqClose();return}
     grab();if(!F.d){toast('Elige el día.');return}if(!isWork(F.d)){toast(nwReason(F.d)+': elige un día laborable.');return}
     const insp=(F.insp||'').trim();if(!insp){toast('Elige el inspector.');return}
     const H=hours();const snap=libSnap(ids);
     Ls.forEach(l=>{const cur=LIB.get(l.id)||l;const h=multi?H[l.id]:F.h;const rest=F.crit?((F.rest||'').trim()||(multi?libNextAct(cur):'')):'';
       libSave(l.id,{st:'pro',prog:{d:F.d,h,insp},crit:F.crit,sup:F.sup,rest,hist:libHist(cur,'pro',fmtD(F.d)+' '+h+' · '+insp)})});
     if(opt.back&&!multi){toast('Inspección programada');libDetail(ids[0]);return}
     lqClose();LQSEL.clear();libUndoToast(multi?`${Ls.length} inspecciones programadas`:'Inspección programada',snap)},
   e=>{const t=e.target;if(t.id==='lqpd'&&t.value){grab();draw()}if(t.id==='lqph'){grab();F.hs={};draw()}if(t.id==='lqcr'){grab();draw()}})};draw()}
/* liberar desde la bandeja: conforme o con observaciones menores */
function libLibDlg(id,opt){opt=opt||{};const l=LIB.get(id);if(!l)return;if(l.st!=='pro'){toast('Primero programa la inspección.');return}const x=S.act.get(l.actId)||{id:'',name:l.nm,sc:l.sc,ambId:l.ambId};let menor=!!opt.menor;
  const draw=()=>lqModal(`<div class="lqtop"><b>Liberar</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>${lqHead(x,l)}
    ${l.prog&&l.prog.d?`<p class="lqmsg">Inspección ${fmtD(l.prog.d)}${l.prog.h?' '+esc(l.prog.h):''}${l.prog.insp?' · '+esc(l.prog.insp):''}</p>`:''}
    <span class="seg lqseg lqbig"><button type="button" data-lqm="0" class="${menor?'':'on'}">✓ Conforme</button><button type="button" data-lqm="1" class="${menor?'on':''}">Con observaciones menores</button></span>
    ${menor?'<label>¿Qué observación menor queda pendiente?<textarea id="lqom" rows="3" placeholder="Ej.: falta rotular las válvulas"></textarea></label>':''}
    <div class="lqbtns"><button class="ib" data-lq="back">${opt.back?'Volver':'Cancelar'}</button><button class="ib okb" data-lq="ok">✓ Liberar</button></div>`,
   e=>{let b;if((b=e.target.closest('[data-lqm]'))){menor=b.dataset.lqm==='1';draw();return}if(!(b=e.target.closest('[data-lq]')))return;
     if(b.dataset.lq==='back'){if(opt.back)libDetail(id);else lqClose();return}
     const m=menor?(($('#lqom')||{}).value||'').trim():'';if(menor&&!m){toast('Escribe la observación menor.');return}
     libFree(id,m);if(opt.back)setTimeout(()=>libDetail(id),80);else lqClose()});draw()}
function libObs(id,opt){opt=opt||{};const l=LIB.get(id);if(!l)return;if(l.st!=='pro'){toast('Primero programa la inspección.');return}
  lqModal(`<div class="lqtop"><b>Observar</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div><p class="lqmsg">${esc(l.nm||'')}</p>
    <label>Observaciones (una por línea)<textarea id="lqo" rows="5" placeholder="Ej.: fuga en unión de desagüe de 2&quot; bajo lavatorio"></textarea></label>
    <p class="lqmsg">Luego puedes adjuntar fotos desde el detalle. El SC las levanta y pide reinspección.</p>
    <div class="lqbtns"><button class="ib" data-lq="back">${opt.back?'Volver':'Cancelar'}</button><button class="ib pri" data-lq="ok">Guardar como observada</button></div>`,
   e=>{const b=e.target.closest('[data-lq]');if(!b)return;if(b.dataset.lq==='back'){if(opt.back)libDetail(id);else lqClose();return}
     const L=(($('#lqo')||{}).value||'').split('\n').map(s=>s.trim()).filter(Boolean);if(!L.length){toast('Escribe al menos una observación.');return}
     const snap=libSnap([id]);libSave(id,{st:'obs',obs:L.map(t=>({t,ok:false})),hist:libHist(LIB.get(id)||l,'obs',L.length+' observación(es)')});
     if(opt.back){toast('Marcada como observada');libDetail(id)}else{lqClose();libUndoToast('Marcada como observada',snap)}})}
/* --- pestaña Liberaciones --- */
U.libV=U.libV||'ban';U.libSc=U.libSc||'';U.libQ='';U.libIn='';let LQHOST=null,LQDRAW=null;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&LQDRAW&&U.tab==='lib'){LQDRAW=null;render()}});
function libItems(){const vs=new Set(visPisos().map(p=>p.id));const q=fold(U.libQ||'').trim();const mineOnly=SCK()?new Set(myScsI()):null;
  const ok=(x,pid,sc,l)=>(!U.libIn||(l&&l.prog&&l.prog.insp===U.libIn))&&(!pid||vs.has(pid))&&(!U.libSc||sc===U.libSc)&&(!mineOnly||mineOnly.has(sc))&&(!q||fold((x&&x.name||'')+' '+conOf(sc).name+' '+((S.amb.get(x&&x.ambId)||{}).name||'')+' '+((S.amb.get(x&&x.ambId)||{}).code||'')).includes(q));
  const L=[...LIB.values()].filter(l=>l.st!=='anu').map(l=>({l,x:S.act.get(l.actId)||{id:l.actId,name:l.nm||'(actividad eliminada)',sc:l.sc,ambId:l.ambId},st:l.st})).filter(o=>ok(o.x,o.l.pisoId,o.l.sc,o.l));
  return{L}}
/* tarjeta de la bandeja: Calidad arrastra las solicitadas a «Programadas» y las programadas a «Observadas» o «Liberadas» */
function lqCard(o){const x=o.x,l=o.l;const a=S.amb.get(x.ambId);const p=S.pis.get(l.pisoId);const s=LST[o.st]||LST.sol;
  const when=o.st==='pro'?(l.prog&&l.prog.d?`Inspección ${fmtD(l.prog.d)}${l.prog.h?' · '+esc(l.prog.h):''}`:'Falta fijar día de inspección'):libDone(o.st)?`✓ ${(l.done&&l.done.t)?fmtD(ldt(l.done.t))+' '+hhmm(l.done.t):''}`:o.st==='obs'?`${(l.obs||[]).filter(q=>!q.ok).length} observación(es) por levantar`:`Lista para el ${fmtD(l.need)}${l.late?' · fuera de plazo':''}`;
  const dr=isCal()&&['sol','lev','pro'].includes(o.st);const sel=LQSEL.has(l.id);const ck=isCal()&&(o.st==='sol'||o.st==='lev');
  return`<button type="button" class="lqcard${dr?' dr':''}${sel?' sel':''}" data-lqid="${l.id}" data-st="${o.st}"${dr?' draggable="true"':''} style="--c:${s.c}">${ck?`<span class="lqck" data-lqck="${l.id}" role="checkbox" aria-checked="${sel}" aria-label="Elegir" title="Elegir (o Ctrl+clic en la tarjeta)"></span>`:''}<span class="lqtags">${o.st==='lev'?'<i class="lqt sup">REINSPECCIÓN</i>':''}${l.crit?'<i class="lqt crit">CRÍTICA</i>':''}${l.sup?'<i class="lqt sup">SUPERVISIÓN</i>':''}${l.late&&o.st==='sol'?'<i class="lqt crit">FUERA DE PLAZO</i>':''}${!l.actId?'<i class="lqt">FUERA DEL LOOKAHEAD</i>':''}</span>
   <b>${esc(x.name||'')}</b><span>${esc([p&&p.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · '))}</span><span class="lqsc"><i style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)}</span><span class="lqwhen">${when}</span>${l.prog&&l.prog.insp?`<span class="lqins" data-lqin="${esc(l.prog.insp)}" title="Ver solo lo de este inspector">👷 ${esc(l.prog.insp)}</span>`:''}${l.crit&&l.rest&&!libDone(o.st)?`<span class="lqrest">⛔ Restringe: ${esc(l.rest)}</span>`:''}</button>`}
/* columnas y pasos permitidos al arrastrar (solo Calidad): solicitada/levantada → programada → observada o liberada */
const LQCOL={sol:['sol','lev'],pro:['pro'],obs:['obs'],lib:['lib','libm']};
const LQOK={sol:['pro'],lev:['pro'],pro:['obs','lib']};
const LQNO={sol:{obs:'Primero prográmala',lib:'Primero prográmala',sol:''},pro:{sol:'Ya está programada',pro:''}};
const LQSEL=new Set();let LQDRAG=null;
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
  if(V==='ban'){const cal=isCal();const opn=new Set(open.filter(o=>o.st==='sol'||o.st==='lev').map(o=>o.l.id));[...LQSEL].forEach(i=>{if(!opn.has(i))LQSEL.delete(i)});
    const by=(a,b)=>((a.l&&(a.l.prog&&a.l.prog.d||a.l.need))||'').localeCompare((b.l&&(b.l.prog&&b.l.prog.d||b.l.need))||'')||((a.l.prog&&a.l.prog.h)||'').localeCompare((b.l.prog&&b.l.prog.h)||'');
    const col=(k,t,c,hint,arr,body)=>`<section class="lqcol" data-lqdrop="${k}"><div class="lqch"><i style="--c:${c}"></i><b>${t}</b><span>${arr.length}</span></div><small>${hint}</small>${k==='sol'&&LQSEL.size?`<div class="lqselb"><b>${LQSEL.size} elegida${LQSEL.size>1?'s':''}</b><button type="button" class="ib pri" data-lqselp>→ Programar</button><button type="button" class="ib" data-lqselx>Quitar</button></div>`:''}${body||arr.map(lqCard).join('')||'<p class="mu lqempty">—</p>'}<p class="lqdz" aria-hidden="true"></p></section>`;
    /* programadas agrupadas por día de inspección */
    const pro=open.filter(o=>o.st==='pro').sort(by);const dlab=d=>!d?'Sin día':d<t0?'Vencidas':d===t0?'Hoy':d===tm?'Mañana':DOW_L[(pd(d).getUTCDay()+6)%7]+' '+fmtD(d);
    const grp=[];pro.forEach(o=>{const d=o.l.prog&&o.l.prog.d||'';const k=dlab(d);let g=grp.find(q=>q.k===k);if(!g)grp.push(g={k,d,a:[]});g.a.push(o)});
    const proH=grp.map(g=>`<div class="lqgh${g.k==='Hoy'?' hoy':g.k==='Vencidas'?' bad':''}">${esc(g.k)}${g.d&&g.k!=='Vencidas'&&g.k.indexOf(' ')<0?` <small>${fmtD(g.d)}</small>`:''}<span>${g.a.length}</span></div>${g.a.map(lqCard).join('')}`).join('');
    const d7=addD(t0,-7);
    h+=`<div class="lqcols${cal?' lqdnd':''}">${col('sol','Solicitadas',LST.sol.c,cal?'Arrástralas a «Programadas» (Ctrl+clic para elegir varias)':'Calidad debe programarlas',open.filter(o=>o.st==='sol'||o.st==='lev').sort(by))}${col('pro','Programadas',LST.pro.c,cal?'Arrastra a «Observadas» o «Liberadas» tras inspeccionar':'Inspección con día y hora',pro,proH)}${col('obs','Observadas',LST.obs.c,'El SC levanta y pide reinspección',open.filter(o=>o.st==='obs').sort(by))}${col('lib','Liberadas · 7 días',LST.lib.c,'Últimos 7 días',L.filter(o=>libDone(o.st)&&o.l.done&&ldt(o.l.done.t)>=d7).sort((a,b)=>(b.l.done.t||0)-(a.l.done.t||0)))}</div>`}
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
    if(t.closest('[data-lqselp]')){libProg([...LQSEL]);return}
    if(t.closest('[data-lqselx]')){LQSEL.clear();render();return}
    /* elegir varias solicitadas: casilla o Ctrl/⌘+clic */
    if((b=t.closest('[data-lqck]'))||((e.ctrlKey||e.metaKey)&&(b=t.closest('.lqcard[data-st="sol"],.lqcard[data-st="lev"]'))&&isCal())){const id=b.dataset.lqck||b.dataset.lqid;if(LQSEL.has(id))LQSEL.delete(id);else LQSEL.add(id);render();return}
    if((b=t.closest('[data-lqid]'))){libDetail(b.dataset.lqid);return}
    if((b=t.closest('[data-lqask]'))){libAsk(b.dataset.lqask);return}
    if((b=t.closest('[data-lqw]'))){const v=+b.dataset.lqw;U.week=v===0?curWeek():U.week+v;render();return}
    if((b=t.closest('[data-lqd]'))){const v=+b.dataset.lqd;U.libD=shiftDay(U.libD||wshift(todayIso(),1),v);if(LQHOST)LQHOST._fk='';render();return}
    if((b=t.closest('[data-lqp]'))){U.libP=b.dataset.lqp;LQDRAW=null;if(LQHOST)LQHOST._fk='';render();return}
    if((b=t.closest('#lqv button'))&&b.dataset.v!=='map'){main.dataset.lqv=''}
    if((b=t.closest('[data-lqza]'))){LQDRAW={libId:b.dataset.lqz||'',actId:b.dataset.lqza,pid:U.libP};render();return}
    if(t.closest('[data-lqzcancel]')){LQDRAW=null;render();return}
    if(t.id==='lqnew'){libPick();return}
    if(t.id==='lqpdf'){libReport(wshift(todayIso(),1));return}
    };
  main.oninput=e=>{if(e.target.id==='lqq'){U.libQ=e.target.value;render()}};
  main.onchange=async e=>{const t=e.target;if(t.id==='lqsc'){U.libSc=t.value;render()}if(t.id==='lqin'){U.libIn=t.value;render()}};
  /* arrastrar (nativo del navegador, sin redibujar mientras dura: los cambios de otros esperan) */
  const cols=()=>$('.lqcols',main);
  const clear=()=>{const c=cols();if(c){c.classList.remove('dragging');$$('[data-lqdrop]',c).forEach(s_=>{s_.classList.remove('ok','no','hov');const z=$('.lqdz',s_);if(z)z.textContent=''});$$('.lqcard.drg',c).forEach(q=>q.classList.remove('drg'))}};
  main.ondragstart=e=>{const c=e.target.closest&&e.target.closest('.lqcard[draggable="true"]');if(!c||!isCal())return;const st=c.dataset.st;const id=c.dataset.lqid;
    const ids=(st==='sol'||st==='lev')&&LQSEL.has(id)?[...LQSEL]:[id];LQDRAG={ids,st:st==='lev'?'sol':st};DRAGGING=true;
    try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',ids.join(','))}catch(_){}
    if(ids.length>1){const g=document.createElement('div');g.className='lqghost';g.textContent=ids.length+' liberaciones';document.body.appendChild(g);try{e.dataTransfer.setDragImage(g,20,16)}catch(_){}setTimeout(()=>g.remove(),0)}
    const cc=cols();cc.classList.add('dragging');ids.forEach(i=>{const q=$(`.lqcard[data-lqid="${i}"]`,cc);if(q)q.classList.add('drg')});
    $$('[data-lqdrop]',cc).forEach(s_=>{const k=s_.dataset.lqdrop;const ok=(LQOK[LQDRAG.st]||[]).includes(k);s_.classList.add(ok?'ok':'no');const z=$('.lqdz',s_);if(z)z.textContent=ok?(k==='pro'?'Suelta para programar':k==='obs'?'Suelta para observar':'Suelta para liberar'):((LQNO[LQDRAG.st]||{})[k]??'No se puede mover aquí')?'🚫 '+((LQNO[LQDRAG.st]||{})[k]??'No se puede mover aquí'):''})};
  main.ondragover=e=>{if(!LQDRAG)return;const s_=e.target.closest&&e.target.closest('[data-lqdrop]');if(!s_)return;if(!(LQOK[LQDRAG.st]||[]).includes(s_.dataset.lqdrop)){e.dataTransfer.dropEffect='none';return}
    e.preventDefault();e.dataTransfer.dropEffect='move';if(!s_.classList.contains('hov')){$$('[data-lqdrop].hov',main).forEach(q=>q.classList.remove('hov'));s_.classList.add('hov')}};
  main.ondragleave=e=>{const s_=e.target.closest&&e.target.closest('[data-lqdrop]');if(s_&&!s_.contains(e.relatedTarget))s_.classList.remove('hov')};
  main.ondrop=e=>{if(!LQDRAG)return;const s_=e.target.closest&&e.target.closest('[data-lqdrop]');const D=LQDRAG;LQDRAG=null;DRAGGING=false;clear();if(!s_)return;e.preventDefault();
    const k=s_.dataset.lqdrop;if(!(LQOK[D.st]||[]).includes(k))return;
    if(k==='pro')libProg(D.ids);else if(k==='obs')libObs(D.ids[0]);else if(k==='lib')libLibDlg(D.ids[0]);setTimeout(flushDeferred,0)};
  main.ondragend=()=>{if(LQDRAG||DRAGGING){LQDRAG=null;DRAGGING=false;clear();setTimeout(flushDeferred,0)}}}
/* «+ Solicitar liberación»: buscador sobre las actividades del lookahead (sugerencias); si no está, se pide lo escrito */
function libHay(x,a,p){const s_=S.sec.get(a&&a.sectorId)||{};return fold([x.name,a&&a.code,a&&a.name,s_.code,s_.name,p&&p.code,p&&p.name,conOf(x.sc).name].join(' '))}
function libPick(){const t0=todayIso(),tm=wshift(t0,1),lo=addD(t0,-14),hi=addD(t0,21),wkEnd=weekDays(curWeek()).slice(-1)[0];const mine=SCK()?new Set(myScsI()):null;
  if(!(isCal()||(canWrite&&!PM())||(mine&&mine.size))){toast('Solo el subcontratista, el ingeniero de producción o Calidad pueden solicitarla.');return}
  const C=[];for(const x of S.act.values()){if(!canLibAsk(x)||(mine&&!mine.has(x.sc))||(U.libSc&&x.sc!==U.libSc))continue;const ds=x.days||[];if(!ds.some(d=>d>=lo))continue;const a=S.amb.get(x.ambId);if(!a)continue;const pid=pisoOfAct(x.id);if(U.piso&&pid!==U.piso)continue;
    const fut=ds.filter(d=>d>=t0).sort();const p=S.pis.get(pid);const l=libOf(x.id);C.push({x,a,p,d:fut[0]||ds.slice().sort().pop()||'',past:!fut.length,open:l&&!libDone(l.st)?l:null,hay:libHay(x,a,p)})}
  C.sort((a,b)=>(a.past-b.past)||(a.past?b.d.localeCompare(a.d):a.d.localeCompare(b.d))||((a.p&&a.p.code)||'').localeCompare((b.p&&b.p.code)||'')||(a.a.code||'').localeCompare(b.a.code||''));
  const SEL=new Set();let q='',ai=-1;
  const grpOf=o=>o.past?'Terminadas hace poco':o.d<=tm?'Hoy y mañana':o.d<=wkEnd?'Esta semana':'Próximas semanas';
  const list=()=>{const T=fold(q).trim().split(/\s+/).filter(Boolean);const R=C.filter(o=>T.length?T.every(t=>o.hay.includes(t)):(o.past||o.d<=hi));const show=R.slice(0,120);let g='',h='';
    for(const o of show){const k=grpOf(o);if(k!==g){g=k;h+=`<div class="lqfg">${k}</div>`}const sc=conOf(o.x.sc);const sel=SEL.has(o.x.id);const s_=o.open&&LST[o.open.st];
      h+=o.open?`<button type="button" class="lqfi dis" data-lqopen="${o.open.id}" title="Ya tiene una solicitud abierta: tócala para verla"><span class="lqfck"></span><span class="lqfm"><b>${esc(o.x.name||'')}</b><small>${esc([o.p&&o.p.code,o.a.code+' '+(o.a.name||'')].filter(Boolean).join(' · '))} · <i style="--c:${sc.color}"></i>${esc(sc.name)}</small></span><i class="lqst" style="--c:${s_.c}">${esc(s_.t.split(' ·')[0])}${o.open.prog&&o.open.prog.d?' '+fmtD(o.open.prog.d):''}</i></button>`
        :`<button type="button" class="lqfi${sel?' on':''}" data-lqf="${o.x.id}" role="option" aria-selected="${sel}"><span class="lqfck"></span><span class="lqfm"><b>${esc(o.x.name||'')}</b><small>${esc([o.p&&o.p.code,o.a.code+' '+(o.a.name||'')].filter(Boolean).join(' · '))} · <i style="--c:${sc.color}"></i>${esc(sc.name)}</small></span><span class="lqfd">${o.d?fmtD(o.d):''}</span></button>`}
    if(R.length>show.length)h+=`<p class="lqmsg">… y ${R.length-show.length} más: escribe algo más para acotar.</p>`;
    if(!R.length)h+=`<p class="lqmsg">${T.length?'No está en el lookahead.':'No hay actividades próximas en el lookahead.'}</p>`;
    h+=`<button type="button" class="lqfi free" data-lqfree><span class="lqfck">＋</span><span class="lqfm"><b>${q.trim()?`Solicitar «${esc(q.trim())}»`:'Otra (no está en el lookahead)…'}</b><small>Escribes qué se libera, el subcontratista y el ambiente</small></span></button>`;
    const el=$('#lqfr');if(el){el.innerHTML=h;ai=-1}foot()};
  const foot=()=>{const n=$('#lqfn');if(n)n.textContent=SEL.size?`${SEL.size} elegida${SEL.size>1?'s':''}`:'Toca una o varias';const g=$('#lqfgo');if(g){g.disabled=!SEL.size;g.textContent=SEL.size>1?`Solicitar ${SEL.size} →`:'Siguiente →'}};
  const rows=()=>$$('#lqfr .lqfi');const mark=()=>{rows().forEach((r,i)=>r.classList.toggle('act',i===ai));const r=rows()[ai];if(r)r.scrollIntoView({block:'nearest'})};
  const toggle=b=>{const id=b.dataset.lqf;if(SEL.has(id))SEL.delete(id);else SEL.add(id);b.classList.toggle('on',SEL.has(id));b.setAttribute('aria-selected',SEL.has(id));foot()};
  const go=()=>{if(SEL.size)setTimeout(()=>libAsk([...SEL]),0)};const free=()=>{const nm=q.trim();setTimeout(()=>libAsk('',{free:true,nm}),0)};
  lqModal(`<div class="lqtop"><b>Solicitar liberación</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    <input id="lqfq" type="search" class="lqfq" placeholder="Busca actividad, ambiente, piso o subcontratista…" autocomplete="off" aria-label="Buscar en el lookahead">
    <div class="lqfr" id="lqfr" role="listbox" aria-multiselectable="true"></div>
    <div class="lqbtns"><span class="mu lqfn" id="lqfn"></span><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="lqfgo" data-lq="next" disabled>Siguiente →</button></div>`,
   e=>{let b;const t=e.target;if((b=t.closest('[data-lqopen]'))){libDetail(b.dataset.lqopen);return}if(t.closest('[data-lqfree]')){free();return}if((b=t.closest('[data-lqf]'))){toggle(b);return}if(t.closest('[data-lq="next"]'))go()});
  const box=$('#lqm .lqc');if(box)box.classList.add('lqpick');
  const inp=$('#lqfq');inp.oninput=()=>{q=inp.value;list()};
  inp.onkeydown=e=>{const R=rows();if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ai=Math.max(0,Math.min(R.length-1,ai+(e.key==='ArrowDown'?1:-1)));mark();return}
    if(e.key==='Enter'){e.preventDefault();const r=R[ai];if(r){if(r.dataset.lqf!=null)toggle(r);else r.click();return}if(SEL.size)go();else if(q.trim())free()}};
  $('#lqfr').ondblclick=e=>{const b=e.target.closest('[data-lqf]');if(b){SEL.add(b.dataset.lqf);go()}};
  list()}
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

