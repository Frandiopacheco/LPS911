"use strict";
/* LPS 911 · Mejoras de las auditorías: papelera, calendario de la obra, hora del servidor, experiencia de uso, responsables de piso.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 32 · Tanda 1 de la auditoría
   ===================================================================== */
/* ---- abrir sin internet + aviso de versión nueva ---- */
let SWREG=null,SWASK=false;
function swBanner(w){let b=$('#swupd');if(b)return;b=document.createElement('div');b.id='swupd';b.className='swupd';
  b.innerHTML='<span>Hay una versión nueva de la página.</span><button type="button" class="ib pri">Actualizar</button><button type="button" class="ib" aria-label="Más tarde">Más tarde</button>';
  const[up,later]=b.querySelectorAll('button');
  /* es cierto desde la auditoría C1: cada cambio ya está en la cola local de Firestore (IndexedDB), no solo en la memoria de la página */
  up.onclick=async()=>{if(pending>0&&!await uiAsk({title:'Hay cambios subiéndose',text:`${pending} cambio${pending>1?'s':''} tuyo${pending>1?'s':''} aún se está${pending>1?'n':''} enviando. Si actualizas ahora, queda${pending>1?'n':''} guardado${pending>1?'s':''} en este equipo y se envía${pending>1?'n':''} al volver a abrir la página.`,ok:'Actualizar igual',cancel:'Esperar',tone:'warn'}))return;SWASK=true;if(w&&w.state!=='redundant')w.postMessage('skip');else location.reload();setTimeout(()=>location.reload(),2500)};
  later.onclick=()=>b.remove();document.body.appendChild(b)}
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)&&!window.NO_SW){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(SWASK)location.reload()});
  addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').then(reg=>{SWREG=reg;
    const watch=w=>{if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)swBanner(w)})};
    if(reg.waiting&&navigator.serviceWorker.controller)swBanner(reg.waiting);
    reg.addEventListener('updatefound',()=>watch(reg.installing));
    setInterval(()=>{if(navigator.onLine!==false)reg.update().catch(()=>{})},30*60*1000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)reg.update().catch(()=>{})});
  }).catch(()=>{})});
}
/* deja guardado el módulo de planos para poder abrirlo sin internet */
function swWarm(){if(!navigator.serviceWorker||!navigator.serviceWorker.controller)return;setTimeout(()=>{fetch(PLANO_SRC).catch(()=>{})},8000)}

/* ---- índice de actividades terminadas (no depende de cuántos días se cargan) ---- */
const DIDX=new Map(),REOP=new Map(),DIDXD=new Map();let didxSub=null;/* DIDXD: datos de cada documento (piso) del índice */
function ensureDoneIdx(){if(!db||didxSub)return;let first=true;
  /* la primera foto carga todo; después solo se leen los documentos que cambiaron (auditoría C4) y se rearma el índice */
  didxSub=fcol('doneidx').onSnapshot(sn=>{
      if(first){first=false;DIDXD.clear();sn.docs.forEach(d=>DIDXD.set(d.id,d.data()||{}))}
      else{const ch=sn.docChanges();if(!ch.length){snapOk('doneidx');return}for(const c of ch){if(c.type==='removed')DIDXD.delete(c.doc.id);else DIDXD.set(c.doc.id,c.doc.data()||{})}}
      didxAgg();doneRebuild();snapOk('doneidx');if(ready)requestRender()},
    err=>{didxSub=null;snapFail('doneidx',err,ensureDoneIdx)});/* si se cae, se reabre sola (base.js) */
  if(!unsubs.includes(stopDoneIdx))unsubs.push(stopDoneIdx)}
/** DIDX (terminada: la fecha más temprana entre pisos) y REOP (reapertura: la más tardía) a partir de DIDXD */
function didxAgg(){DIDX.clear();REOP.clear();for(const v of DIDXD.values()){const m=v.d||{};for(const[a,dt]of Object.entries(m))if(dt&&typeof dt==='string'){const c=DIDX.get(a);if(!c||dt<c)DIDX.set(a,dt)}
    /* r = reaperturas: las marcas de «terminada» hasta esa fecha ya no cuentan (aunque vengan del capataz o de días no cargados) */
    for(const[a,dt]of Object.entries(v.r||{}))if(dt&&typeof dt==='string'){const c=REOP.get(a);if(!c||dt>c)REOP.set(a,dt)}}}
function stopDoneIdx(){if(didxSub)didxSub();didxSub=null;DIDX.clear();REOP.clear();DIDXD.clear()}
function didxWrite(pid,map,f){if(!db||!canDaily||!pid)return;const FV=firebase.firestore.FieldValue;const d={};
  for(const[a,v]of Object.entries(map))d[a]=v==null?(FV&&FV.delete?FV.delete():null):v;
  bgWrite(fcol('doneidx').doc(pid).set({[f||'d']:d},{merge:true}))}
function didxFromDaily(d,pid,recs){const m={};for(const[aid,r]of Object.entries(recs||{})){if(!r||!('done'in r))continue;const cur=DIDX.get(aid);
    if(r.done){if(!cur||d<cur){m[aid]=d;DIDX.set(aid,d)}}else if(cur===d){m[aid]=null;DIDX.delete(aid)}}
  if(Object.keys(m).length)didxWrite(pid,m)}
/* primera vez: arma el índice con todo el historial (lo hace una sola vez un administrador o editor) */
/* una vez por obra (la hace el administrador): la lista de causas pasa al cuadro de la empresa. Los registros antiguos
   conservan su texto; las causas que ya no están en la lista se guardan en cncOld para consulta. */
function cncMigrate(){if(!db||!isAdmin||(P().cncStd||0)>=CNC_STD_V||!S.meta.get('project'))return;const std=CNC_STD.map(o=>o.n);
  const old=(P().cnc||[]).filter(k=>!cncStd(k));const ch={cnc:std,cncStd:CNC_STD_V};if(old.length)ch.cncOld=[...new Set([...(P().cncOld||[]),...old])];
  patch('meta','project',ch,()=>{S.meta.set('project',{...S.meta.get('project'),...ch})});requestRender()}
async function didxMigrate(){cncMigrate();if(!db||!canWrite||P().doneIdx)return;try{const sn=await fcol('daily').get();const by={};
    sn.docs.forEach(x=>{const v=x.data()||{};for(const[aid,r]of Object.entries(v.recs||{}))if(r&&r.done&&v.pisoId){const o=by[v.pisoId]=by[v.pisoId]||{};if(!o[aid]||v.date<o[aid])o[aid]=v.date}});
    for(const[pid,m]of Object.entries(by))await fcol('doneidx').doc(pid).set({d:m},{merge:true});
    await fcol('meta').doc('project').set({doneIdx:1},{merge:true})}catch(e){}}

/* ---- guardar solo lo que cambió ---- */
/* col='acts': los días que solo se agregan o solo se quitan van con arrayUnion/arrayRemove, así dos personas que marcan
   días distintos de la misma actividad a la vez no se pisan (antes la lista entera de la última borraba el día de la otra) */
function fsDiff(prev,next,col,inTx){const args=[];const FV=firebase.firestore.FieldValue;const DEL=FV&&FV.delete?FV.delete():null;const FP=firebase.firestore.FieldPath;
  const keys=new Set([...Object.keys(prev||{}),...Object.keys(next||{})]);keys.delete('id');
  for(const k of keys){const a=prev[k],b=next[k];if(canon(a)===canon(b))continue;
    if(b===undefined){args.push(new FP(k),DEL);continue}
    if(col==='acts'&&k==='days'&&Array.isArray(a)&&Array.isArray(b)&&FV&&FV.arrayUnion){const sa=new Set(a),sb=new Set(b);const add=[...sb].filter(d=>!sa.has(d)),rem=[...sa].filter(d=>!sb.has(d));
      if(add.length&&!rem.length){args.push(new FP(k),FV.arrayUnion(...add));continue}if(rem.length&&!add.length){args.push(new FP(k),FV.arrayRemove(...rem));continue}
      /* mover (quitar unos días y poner otros): se quita y luego se agrega (args.then), sin reemplazar la lista entera:
         un día que otra persona agregó mientras tanto no se pierde */
      if(add.length&&rem.length&&!inTx){args.push(new FP(k),FV.arrayRemove(...rem));args.then=[new FP(k),FV.arrayUnion(...add)];continue}}
    const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(isObj(a)&&isObj(b)){const ks=new Set([...Object.keys(a),...Object.keys(b)]);if(ks.size<=80){for(const k2 of ks){if(canon(a[k2])===canon(b[k2]))continue;args.push(new FP(k,k2),b[k2]===undefined?DEL:b[k2])}continue}}
    args.push(new FP(k),b)}
  return args}

/* ---- respaldo completo ---- */
/* todo lo de la obra: también el plan del día cerrado (dplan, contra el que se mide el PPC diario), lo no programado, el historial
   del lookahead y la versión cliente; un respaldo sin dplan restaurado medía el PPC diario contra el lookahead vigente */
const BK_DATA=['meta','pisos','contractors','sectors','ambientes','acts','weeks','wsnap','restr','lib','libm','planos','daily','live','lhprop','lhphist','lhidx','lhver','pdz','pzon','laminas','doneidx','members','inv',
  'dplan','nprog','lhlog','cli','clidx','cliver','tper','tpc','tcfg','tareo','mcat','mtipo','mamb','mver','mcatp','mlog'];
/* imágenes: láminas, fotos de LPS y fotos del formato firmado del tareo (tfot: se restauran con el mismo id, así siguen ligadas a tareo.foto) */
const BK_IMG=['lamimg','fotos','tfot'];
const BK_ALL=[...BK_DATA,...BK_IMG];
async function backupJson(withImg){const btn=$(withImg?'#bbackup2':'#bbackup');const bt=btn?btn.textContent:'';if(btn)btn.disabled=true;
  const out={formato:'lps911-v2',fecha:new Date(NOW()).toISOString(),proyecto:P().name||P().code||'',conImagenes:!!withImg,colecciones:{}};const fail=[];let n=0;
  /* la versión cliente solo la lee quien tiene acceso: los demás no los piden (no es un error) */
  const cols=(withImg?BK_ALL:BK_DATA).filter(c=>!/^cli/.test(c)||(typeof canCli==='function'&&canCli()));
  try{for(let i=0;i<cols.length;i++){const col=cols[i];if(btn)btn.textContent=`Leyendo ${col}… (${i+1}/${cols.length})`;
      try{const sn=await fcol(col).get();const d={};sn.docs.forEach(x=>{d[x.id]=x.data();n++});out.colecciones[col]=d}catch(e){fail.push(col)}}
    out.total=n;const name=`LPS911_respaldo${withImg?'_con_imagenes':''}_${todayIso()}.json`;
    saveBlob(name,new Blob([JSON.stringify(out)],{type:'application/json'}));
    if(canWrite)fcol('meta').doc('project').set({lastBk:{t:NOW(),by:me.email,img:!!withImg}},{merge:true}).catch(()=>{});
    toast(`Respaldo descargado: ${n} registros${fail.length?' · no se pudo leer: '+fail.join(', '):''}.`)}
  finally{const b=$(withImg?'#bbackup2':'#bbackup');if(b){b.disabled=false;b.textContent=bt}}}
function bkAgo(){const b=P().lastBk;if(!b||!b.t)return null;return Math.floor((NOW()-b.t)/864e5)}
function bkNote(){const d=bkAgo();if(d==null)return'<span class="pill warn">Aún no hay respaldo registrado</span>';const b=P().lastBk;
  return`<span class="${d>7?'pill warn':'note'}">Último respaldo: ${new Date(b.t).toLocaleDateString('es-PE')} (${d===0?'hoy':'hace '+d+' día'+(d>1?'s':'')})${b.img?' con imágenes':''}</span>`}
function bkRemind(){if(!isAdmin)return;const d=bkAgo();const last=+store.get('bkr',0)||0;if(NOW()-last<7*864e5)return;if(d==null||d>7){store.set('bkr',NOW());setTimeout(()=>toast(d==null?'Aún no hay ningún respaldo descargado del proyecto.':`El último respaldo tiene ${d} días.`,'Ir a Equipo',()=>{U.tab='team';requestRender()}),4000)}}
/* escritura por lotes que respeta el tamaño máximo de Firestore (imágenes grandes) */
async function batchWrites(writes,onProg){let i=0,done=0;while(i<writes.length){const b=db.batch();let sz=0,k=0;
    while(i<writes.length&&k<400){const w=writes[i];const s=w[2]?JSON.stringify(w[2]).length:50;if(k>0&&sz+s>6e6)break;sz+=s;k++;i++;if(w[2])b.set(fcol(w[0]).doc(w[1]),w[2]);else b.delete(fcol(w[0]).doc(w[1]))}
    await b.commit();done+=k;onProg&&onProg(done)}}

/* carga de un archivo de datos o respaldo: por colección, y si las reglas rechazan un lote (p. ej. historiales que solo escribe
   su autor: lhlog, lhphist) lo reintenta registro por registro y salta solo los rechazados. Antes un solo rechazo detenía toda la carga. */
async function importWrites(writes,onProg){const by=new Map();writes.forEach(w=>{if(!by.has(w[0]))by.set(w[0],[]);by.get(w[0]).push(w)});
  const skip=new Map();let done=0;
  for(const[col,ws]of by){for(let i=0;i<ws.length;i+=400){const part=ws.slice(i,i+400);
    try{await batchWrites(part);done+=part.length}
    catch(e){if(!/permission/i.test(String(e&&(e.code||e.message)||e)))throw e;
      for(const w of part){try{await fcol(w[0]).doc(w[1]).set(w[2])}catch(e2){if(!/permission/i.test(String(e2&&(e2.code||e2.message)||e2)))throw e2;skip.set(col,(skip.get(col)||0)+1)}done++;onProg&&onProg(done)}}
    onProg&&onProg(done)}}
  return skip}

/* =====================================================================
   ETAPA 33 · Tanda 2 (parte 1): papelera, calendario de la obra, hora del servidor
   ===================================================================== */
/* ---- papelera: eliminar = archivar (se puede recuperar; el historial no cambia) ---- */
function getDoc(col,id){const k=COLS[col];if(!k)return null;return S[k].get(id)||(ARCH[k]&&ARCH[k].get(id))||null}
function setColData(k,mp){if(typeof DV!=='undefined')DV++;if(ARCH[k]){const ar=new Map();for(const[id,v]of mp)if(v&&v.arch){ar.set(id,v);mp.delete(id)}ARCH[k]=ar}S[k]=mp}
let ARC_T=null;
function arc(col,id){if(col==='acts'&&PM())return op(col,id,null);const cur=getDoc(col,id);if(!cur||cur.arch)return null;
  if(!ARC_T){ARC_T={t:NOW(),by:me?me.email:'',n:me?(me.name||''):''};setTimeout(()=>{ARC_T=null},0)}
  return op(col,id,{...strip(cur),id,arch:ARC_T})}
const actOf=id=>S.act.get(id)||ARCH.act.get(id)||null;
const ambOf=id=>S.amb.get(id)||ARCH.amb.get(id)||null;
const secOf=id=>S.sec.get(id)||ARCH.sec.get(id)||null;
const pisOf=id=>S.pis.get(id)||ARCH.pis.get(id)||null;
/* filas de historial de lo archivado o borrado (para que el PPC pasado no cambie) */
function dayDataArch(dates,vset,rows){const seen=new Set(rows.map(r=>r.x.id+'|'+r.d));
  const ctx=x=>{const a=ambOf(x.ambId);if(!a)return null;const s=secOf(a.sectorId);const pid=pisoOfAmb(x.ambId);const p=pisOf(pid);return p&&s?{p,s,a}:null};
  for(const x of ARCH.act.values()){const c=ctx(x);if(!c||!vset.has(c.p.id))continue;const ad=ldt(x.arch.t||0);
    for(const d of dates){if(seen.has(x.id+'|'+d))continue;const sched=(x.days||[]).includes(d)&&d<ad&&!libDay(x,d);const rc=recOf(d,x.id);if(sched||(rc&&!rc.late)){rows.push({...c,x,d,rc,sched,sc:scAt(rc,x),arch:true});seen.add(x.id+'|'+d)}}}
  const ds=new Set(dates);
  for(const doc of DAY.values()){if(!ds.has(doc.date)||!vset.has(doc.pisoId))continue;
    for(const[id,rc]of Object.entries(doc.recs||{})){if(!rc||!rc.status||rc.late||actOf(id)||seen.has(id+'|'+doc.date)||!rc.ambId)continue;
      const x={id,ambId:rc.ambId,sc:rc.sc||'',name:rc.nm||'(actividad borrada)',und:rc.und||'',days:[doc.date],gone:true};const c=ctx(x);if(!c)continue;
      rows.push({...c,x,d:doc.date,rc:{...rc},sched:true,sc:x.sc,arch:true});seen.add(id+'|'+doc.date)}}}
const ARCN={pisos:'Piso',sectors:'Sector',ambientes:'Ambiente',acts:'Actividad'};
let ARCQ='';
function archList(){const L=[];for(const[col,k]of[['pisos','pis'],['sectors','sec'],['ambientes','amb'],['acts','act']])for(const v of ARCH[k].values())L.push({col,v});return L.sort((a,b)=>(b.v.arch.t||0)-(a.v.arch.t||0))}
function archLabel(col,v){if(col==='acts'){const a=ambOf(v.ambId);return`${esc(v.name||'sin nombre')} <span class="mu">· ${esc(conOf(v.sc).name)} · ${esc(a?a.code:'')}${(v.days||[]).length?' · '+esc(rngTxt(v.days)):''}</span>`}
  if(col==='ambientes')return`${esc(v.code||'')} ${esc(v.name||'')}`;return`${esc(v.code||'')} · ${esc(v.name||'')}`}
function archCard(){if(!canWrite||PM())return'';const L=archList();const q=ARCQ.trim().toLowerCase();const F=q?L.filter(o=>(String(o.v.name||'')+' '+String(o.v.code||'')+' '+(o.col==='acts'?conOf(o.v.sc).name:'')).toLowerCase().includes(q)):L;
  return`<div class="card" id="arccard"><h2>Papelera <span class="sub">${L.length} elemento${L.length===1?'':'s'} eliminado${L.length===1?'':'s'}</span></h2><div class="pad">
   <p class="note" style="margin-top:0">Lo que eliminas del Lookahead queda aquí: no se pierde su historial (PPC, registros, fotos) y puedes restaurarlo. Restaurar un ambiente, sector o piso trae también lo que se eliminó junto con él.</p>
   ${L.length?`<input class="tin" id="arcq" placeholder="Buscar por nombre, código o subcontratista" value="${esc(ARCQ)}" style="width:min(420px,100%);margin-bottom:8px">
   <div class="tscroll"><table class="t"><thead><tr><th>Tipo</th><th>Elemento</th><th>Eliminado</th><th></th></tr></thead><tbody>
   ${F.slice(0,150).map(({col,v})=>`<tr><td>${ARCN[col]}</td><td>${archLabel(col,v)}</td><td class="mu">${esc(fmtD(ldt(v.arch.t)))} ${hhmm(v.arch.t)} · ${esc((v.arch.n||v.arch.by||'').split(' ')[0])}</td><td><button class="ib" data-arcr="${col}|${esc(v.id)}" style="height:26px;font-size:12px">Restaurar</button></td></tr>`).join('')}
   </tbody></table></div>${F.length>150?`<p class="note">Se muestran 150 de ${F.length}. Usa el buscador.</p>`:''}`:'<p class="note">Vacía.</p>'}</div></div>`}
function archRestore(col,id){const v=getDoc(col,id);if(!v||!v.arch)return;const t=v.arch.t;const ops=[];const un=(c,x)=>{const n={...strip(x),id:x.id};delete n.arch;ops.push(op(c,x.id,n))};
  // hacia arriba: lo que lo contiene
  if(col==='acts'){const a=ARCH.amb.get(v.ambId);if(a)un('ambientes',a)}
  const amb=col==='ambientes'?v:col==='acts'?ambOf(v.ambId):null;const sec=col==='sectors'?v:amb?secOf(amb.sectorId):null;
  if(sec&&col!=='sectors'&&ARCH.sec.has(sec.id))un('sectors',sec);const pid=col==='pisos'?id:sec?sec.pisoId:null;if(pid&&col!=='pisos'&&ARCH.pis.has(pid))un('pisos',ARCH.pis.get(pid));
  un(col,v);
  // hacia abajo: lo que se eliminó junto con él
  const same=x=>x.arch&&x.arch.t===t;
  if(col==='pisos')for(const s of ARCH.sec.values())if(s.pisoId===id&&same(s))un('sectors',s);
  const secIds=new Set(ops.filter(o=>o.col==='sectors').map(o=>o.id));if(col==='sectors')secIds.add(id);
  for(const a of ARCH.amb.values())if(secIds.has(a.sectorId)&&same(a))un('ambientes',a);
  const ambIds=new Set(ops.filter(o=>o.col==='ambientes').map(o=>o.id));if(col==='ambientes')ambIds.add(id);
  for(const x of ARCH.act.values())if(ambIds.has(x.ambId)&&same(x)&&!(col==='acts'&&x.id===id))un('acts',x);
  const seen=new Set();apply(ops.filter(o=>{const k=o.col+'/'+o.id;if(seen.has(k))return false;seen.add(k);return true}),`${ARCN[col]} restaurado${col==='acts'?'a':''}`)}

/* ---- calendario de la obra: sábado laborable y feriados ---- */
let CALP=undefined,CALS=null;
function calInfo(){const p=S.meta.get('project');if(p!==CALP||!CALS){CALP=p;const c=(p&&p.cal)||{};CALS={sat:c.sat!==false,hol:new Map((c.hol||[]).filter(o=>o&&o.d).map(o=>[o.d,o.n||'Feriado']))}}return CALS}
function nwReason(d){if(!d)return'';const dw=pd(d).getUTCDay();if(dw===0)return'Domingo';const c=calInfo();if(c.hol.has(d))return'Feriado: '+c.hol.get(d);if(dw===6&&!c.sat)return'Sábado no laborable';return''}
const isWork=d=>!nwReason(d);
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return y+'-'+String(mo).padStart(2,'0')+'-'+String(da).padStart(2,'0')}
function holPeru(y){const e=easter(y);const F=[['01-01','Año Nuevo'],['05-01','Día del Trabajo'],['06-07','Batalla de Arica y Día de la Bandera'],['06-29','San Pedro y San Pablo'],['07-23','Día de la Fuerza Aérea'],['07-28','Fiestas Patrias'],['07-29','Fiestas Patrias'],['08-06','Batalla de Junín'],['08-30','Santa Rosa de Lima'],['10-08','Combate de Angamos'],['11-01','Todos los Santos'],['12-08','Inmaculada Concepción'],['12-09','Batalla de Ayacucho'],['12-25','Navidad']];
  return[...F.map(([md,n])=>({d:y+'-'+md,n})),{d:addD(e,-3),n:'Jueves Santo'},{d:addD(e,-2),n:'Viernes Santo'}].sort((a,b)=>a.d.localeCompare(b.d))}
const holTxt=L=>(L||[]).slice().sort((a,b)=>a.d.localeCompare(b.d)).map(o=>o.d+' '+(o.n||'')).join('\n');
function holParse(txt){const out=[],bad=[];String(txt||'').split('\n').map(s=>s.trim()).filter(Boolean).forEach(s=>{let m=s.match(/^(\d{4}-\d{2}-\d{2})\s*[-–·:,]?\s*(.*)$/);
    if(!m){const m2=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–·:,]?\s*(.*)$/);if(m2)m=[s,`${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`,m2[4]]}
    if(m&&!isNaN(pd(m[1]).getTime()))out.push({d:m[1],n:(m[2]||'Feriado').slice(0,60)});else bad.push(s)});
  const mp=new Map();out.forEach(o=>mp.set(o.d,o));return{list:[...mp.values()].sort((a,b)=>a.d.localeCompare(b.d)),bad}}
function calCard(){const c=P().cal||{};const ro=canWrite&&!PM()?'':' disabled';const y=+todayIso().slice(0,4);const up=(c.hol||[]).filter(o=>o.d>=todayIso()).slice(0,3);
  return`<div class="card"><h2>Calendario de la obra</h2><div class="pad">
   <label class="chk"><input type="checkbox" data-cal="sat"${c.sat!==false?' checked':''}${ro}> El sábado es día laborable</label>
   <p class="note">Feriados y días no laborables de la obra (uno por línea: <b>AAAA-MM-DD Nombre</b>). Se ven rayados en el Lookahead y se saltan al desplazar, reprogramar o contar días hábiles. Si un feriado se va a trabajar, igual puedes programarlo.</p>
   <textarea class="box" data-cal="hol" rows="6" aria-label="Feriados, uno por línea"${ro} placeholder="2026-10-08 Combate de Angamos">${esc(holTxt(c.hol))}</textarea>
   ${ro?'':`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="ib" data-calpe="${y}">+ Feriados nacionales de Perú ${y}</button><button class="ib" data-calpe="${y+1}">+ Feriados nacionales de Perú ${y+1}</button></div>`}
   <p class="note">${up.length?'Próximos: '+up.map(o=>esc(fmtD(o.d)+' '+o.n)).join(' · ')+'. ':''}Los feriados nacionales se cargan según la ley vigente; si el Gobierno traslada alguno (por ejemplo, a lunes), corrígelo aquí.</p></div></div>`}
function calWire(main){if(main._calw)return;main._calw=1;main.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.cal||!canWrite||PM())return;const c={...(P().cal||{})};
    if(t.dataset.cal==='sat')c.sat=t.checked;else{const r=holParse(t.value);c.hol=r.list;if(r.bad.length)toast(`No entendí ${r.bad.length} línea(s): ${r.bad.slice(0,2).join(' | ')}. Usa AAAA-MM-DD Nombre.`)}
    apply([op('meta','project',{...P(),cal:c})],'Calendario guardado')});
  main.addEventListener('click',e=>{const b=e.target.closest('[data-calpe]');if(b&&canWrite&&!PM()){const c={...(P().cal||{})};const r=holParse(holTxt([...(c.hol||[]),...holPeru(+b.dataset.calpe)]));c.hol=r.list;apply([op('meta','project',{...P(),cal:c})],`Feriados de Perú ${b.dataset.calpe} agregados`)}
    const a=e.target.closest('[data-arcr]');if(a&&canWrite){const[col,id]=a.dataset.arcr.split('|');archRestore(col,id)}});
  main.addEventListener('input',e=>{if(e.target.id==='arcq'){ARCQ=e.target.value;const pos=e.target.selectionStart;clearTimeout(main._arcT);main._arcT=setTimeout(()=>{const box=$('#arccard');if(box){box.outerHTML=archCard();const i=$('#arcq');if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(_){}}}},250)}})}

/* ---- hora del servidor: corrige el reloj del celular si está desfasado ---- */
async function clockSync(){if(!db||!me||!me.uid||navigator.onLine===false)return;try{const FV=firebase.firestore.FieldValue;const ref=fcol('clock').doc(me.uid);
    const t1=Date.now();await ref.set({t:FV.serverTimestamp()});const t2=Date.now();const s=await ref.get({source:'server'});const v=s.exists&&s.data().t;if(!v)return;
    const ms=typeof v==='number'?v:v.toMillis?v.toMillis():0;if(!ms)return;let k=Math.round(ms-(t1+t2)/2);if(Math.abs(k)<30000)k=0;
    const was=SKEW;SKEW=k;try{localStorage.setItem('lps.skew',String(k))}catch(e){}
    if(Math.abs(k)>=5*60000&&Math.abs(k-was)>60000)toast(`La hora de este equipo está desfasada ${Math.round(Math.abs(k)/60000)} min. La app usa la hora del servidor para los reportes.`);
    if(k!==was&&ready)requestRender()}catch(e){}}
addEventListener('online',()=>setTimeout(clockSync,1500));

/* ---- nombre de la obra en la pestaña y en el ingreso ---- */
function brandSync(){const p=P();const n=(p.name||'').trim();if(!n)return;document.title=(window.LPS_ENV==='pruebas'?'[PRUEBAS] ':'')+n+' · Last Planner';try{localStorage.setItem('lps.pname',n)}catch(e){}}
(function(){try{const n=localStorage.getItem('lps.pname');if(n){document.title=n+' · Last Planner';document.querySelectorAll('.lbrand').forEach(el=>el.textContent=n+' · Last Planner System')}}catch(e){}})();


/* =====================================================================
   ETAPA 34 · Experiencia de uso (tanda A de la auditoría 2)
   ===================================================================== */
/* piso al abrir: el último elegido; si nunca eligió, el más útil para su rol */
function pickPiso(){if(U.piso&&S.pis.has(U.piso))return;if(U.pisoAll||S.pis.size<2){if(U.piso&&!S.pis.has(U.piso))U.piso='';return}
  const ps=pisos();const d=todayIso();const wk=new Set(weekDays(curWeek()));const mine=me&&(me.role==='sc'||me.role==='capataz')?new Set(me.scs&&me.scs.length?me.scs:[me.sc]):null;
  const score=new Map();for(const x of S.act.values()){if(mine&&!mine.has(x.sc))continue;const ds=x.days||[];const w=ds.includes(d)?3:ds.some(z=>wk.has(z))?1:0;if(!w)continue;const pid=pisoOfAct(x.id);score.set(pid,(score.get(pid)||0)+w)}
  let best=null,bs=0;for(const p of ps){const s=score.get(p.id)||0;if(s>bs){bs=s;best=p.id}}
  U.piso=best||(ps[0]&&ps[0].id)||'';U.sector='';saveUI()}
/* Lookahead: panel "Filtros y vista" */
function moreSync(){const bm=$('#bmore'),b=$('#fmore');if(!bm||!b)return;bm.hidden=!U.lbMore;b.setAttribute('aria-expanded',U.lbMore?'true':'false');b.classList.toggle('on',!!U.lbMore);
  const n=[U.onlyWin,U.onlyRestr,U.onlyObs,U.changes,(U.acts||[]).length>0].filter(Boolean).length;const m=$('#fmn');if(m){m.hidden=!n;m.textContent=n}
  {const c=$('#fclr');if(c)c.hidden=!(n||U.q||U.sector||U.sc)}
  const fl=$('#fleg');if(fl)fl.checked=!U.legOff;const lg=$('#legend');if(lg)lg.classList.toggle('legoff',!!U.legOff)}
/* Campo: resumen de filtros (celular) */
function cfxSum(secs,cons,nS){const s=CU.sec&&secs.find(o=>o.s.id===CU.sec);const c=CU.sc&&cons.find(o=>o.id===CU.sc);const sh={all:'Todas',pend:'Pendientes',reg:'Registradas',prop:'Por confirmar'}[CU.show]||'Todas';
  return`<span>${s?esc(s.s.code+' · '+s.s.name):'Todos los sectores'} · ${c?esc(c.name):'Todos los SC'} · ${sh}</span><b>${nS} prog.</b><i>${CU.fx?'▴':'▾'}</i>`}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-cfx]');if(!t)return;CU.fx=!CU.fx;requestRender()});

/* =====================================================================
   ETAPA 35 · Responsables de piso (propuestas) y subcontratista en obra
   ===================================================================== */
/* editores responsables de cada piso: members/{correo}.pisos = [pisoId] (lo asigna el administrador en Equipo) */
const memPisos=m=>Array.isArray(m&&m.pisos)?m.pisos:[];
/* las reglas de Firestore no pueden buscar en members: el administrador mantiene en cada piso la lista de sus responsables
   (pisos/{id}.resp = correos en minúsculas). Con ella las reglas solo dejan publicar o cambiar el plan diario de un piso
   a su responsable (piso sin responsable: cualquier editor). Se recalcula sola al cambiar el equipo o los pisos. */
let RESP_T=null;const RESP_W=new Set();
function respSync(){if(!db||typeof isAdmin==='undefined'||!isAdmin||!MEM.size||!S.loaded||!S.loaded.pis)return;clearTimeout(RESP_T);RESP_T=setTimeout(()=>{
  for(const p of S.pis.values()){const L=respOf(p.id).map(o=>String(o.em).toLowerCase()).sort();const cur=Array.isArray(p.resp)?[...p.resp].sort():[];
    if(canon(L)===canon(cur)||RESP_W.has(p.id))continue;RESP_W.add(p.id);bgWrite(fcol('pisos').doc(p.id).update({resp:L})).finally(()=>RESP_W.delete(p.id))}},1500)}
function respOf(pid){const L=[];if(!pid)return L;for(const[em,m]of MEM)if(m&&m.role==='editor'&&memPisos(m).includes(pid))L.push({em,name:m.name||em});return L}
function propPiso(id,it){const x=(it&&(it.after||it.base))||(ACT_OFF&&S.act._pm?ACT_OFF:S.act).get(id)||{};return x.ambId?pisoOfAmb(x.ambId):''}
/* quién decide en un piso (propuestas del lookahead y plan diario): el administrador siempre; un editor en los pisos a su
   cargo; si el piso no tiene responsable, cualquier editor (así la reunión no se traba). «Ver como» editor usa sus pisos simulados. */
function isPisoResp(pid){if(!me)return false;if(isAdmin)return true;if(me.role!=='editor')return false;const R=respOf(pid);if(!R.length)return true;
  if(VA&&VA.role==='editor')return(VA.pisos||[]).includes(pid);return R.some(r=>r.em===me.email)}
function canDecide(id,it){if(!me||PM())return false;return isPisoResp(propPiso(id,it))}
function propWho(id,it){const R=respOf(propPiso(id,it));return R.length?'La resuelve '+R.map(r=>r.name).join(' o ')+' (responsable del piso)':'Piso sin responsable: la resuelve cualquier editor'}
function pisoCell(em,m){const L=memPisos(m).filter(id=>S.pis.has(id));const rest=pisos().filter(p=>!L.includes(p.id));
  return`<div class="scchips">${L.map(id=>{const p=S.pis.get(id);return`<span class="scchip" style="--c:var(--accent)"><i></i>${esc(p.code+' · '+p.name)}<button data-pirm="${esc(em)}|${esc(id)}" aria-label="Quitar ${esc(p.name)}" title="Quitar">&times;</button></span>`}).join('')}</div>
   ${rest.length?`<select class="ci" data-mem="${esc(em)}" data-f="pisoadd" aria-label="Agregar piso a cargo"><option value="">${L.length?'+ Agregar otro piso a cargo…':'+ Piso a cargo (revisa sus propuestas)…'}</option>${rest.map(p=>`<option value="${p.id}">${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>`:''}`}
function areaCell(em,m){const ar=restrAreasL();return`<select class="ci" data-mem="${esc(em)}" data-f="area" aria-label="Área"${m.area?'':' style="border:1px solid var(--bad)"'}><option value="">— elige el área —</option>${[...new Set([...ar,m.area].filter(Boolean))].map(a=>`<option${a===m.area?' selected':''}>${esc(a)}</option>`).join('')}</select>`}
/* barra «Ver como»: plegable (pastilla) y movible a cualquier esquina (se arrastra y se acomoda en la más cercana).
   Estado por pestaña del navegador en sessionStorage 'lps.vab' {min, pos:'br'|'bl'|'tr'|'tl'}; en el celular empieza plegada.
   Nunca tapa la barra inferior (#bnav) ni el botón fijo del capataz (.tc-foot): vabPlace() mide lo que hay abajo y arriba. */
const VAB=(()=>{let v=null;try{v=JSON.parse(sessionStorage.getItem('lps.vab')||'null')}catch(e){}
  return{min:v&&typeof v.min==='boolean'?v.min:innerWidth<=760,pos:v&&/^[tb][lr]$/.test(v.pos)?v.pos:'br'}})();
let VAB_DRAG=null,VAB_MOVED=0;
function vabSave(){try{sessionStorage.setItem('lps.vab',JSON.stringify({min:VAB.min,pos:VAB.pos}))}catch(e){}}
const VAB_BOTTOM='#bnav,.tc-foot';
function vabPlace(){const b=$('#vabar');if(!b)return;let bot=0,top=0;
  document.querySelectorAll(VAB_BOTTOM).forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;const r=e.getBoundingClientRect();if(r.height&&r.top<innerHeight&&r.top>innerHeight*.6)bot=Math.max(bot,innerHeight-r.top)});
  const t=$('.top');if(t&&t.offsetParent){const r=t.getBoundingClientRect();if(r.bottom>0)top=r.bottom}
  b.style.setProperty('--vab-b',Math.round(bot+10)+'px');b.style.setProperty('--vab-t',Math.round(top+8)+'px')}
function vaBanner(){let b=$('#vabar');if(!VA||!me){if(b)b.remove();return}const lab=ROLE[VA.role]||VA.role;const det=VA.sc?conOf(VA.sc).name:VA.area?VA.area:VA.pisos&&VA.pisos.length?'pisos '+VA.pisos.map(id=>(S.pis.get(id)||{}).code||'').join(', '):VA.tpub?'publica tareo':'';
  if(IN_FRAME){if(b)b.remove();return}
  const h=VAB.min?`<button type="button" class="vapill" data-va="max" title="Viendo como ${esc(lab)}${det?' · '+esc(det):''}. Toca para ver las opciones; arrástrala a otra esquina." aria-label="Viendo como ${esc(lab)}: mostrar la barra">👁 <b>${esc(lab)}</b></button>`
    :`<span class="vagrip" title="Arrastra para llevarla a otra esquina" aria-hidden="true">⠿</span><span class="vatx">👁 Viendo como <b>${esc(lab)}</b>${det?' · '+esc(det):''}</span><button type="button" class="ib vaph" data-va="phone">📱 Celular</button><button type="button" class="ib" data-va="chg">Cambiar</button><button type="button" class="ib pri" data-va="out">Volver a administrador</button><button type="button" class="ib vamin" data-va="min" title="Plegar (queda una pastilla en la esquina)" aria-label="Plegar la barra">–</button>`;
  if(!b){b=document.createElement('div');b.id='vabar';document.body.appendChild(b);
    b.onclick=e=>{const t=e.target.closest('[data-va]');if(!t)return;if(VAB_MOVED&&Date.now()-VAB_MOVED<400)return;const a=t.dataset.va;
      if(a==='out')vaSet(null);else if(a==='phone')phonePreview('iphone');else if(a==='min'||a==='max'){VAB.min=a==='min';vabSave();vaBanner();const f=$('#vabar [data-va]');if(f)f.focus()}else vaDialog(t)};
    /* arrastre: se escucha en la ventana (el puntero sale de la barra al moverla); al soltar se acomoda en la esquina más cercana */
    const mv=e=>{const d=VAB_DRAG;if(!d||d.id!==e.pointerId)return;if(!d.on){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)<6)return;d.on=true;b.classList.add('drag')}
      const w=b.offsetWidth,hh=b.offsetHeight;b.style.left=Math.max(4,Math.min(innerWidth-w-4,e.clientX-d.dx))+'px';b.style.top=Math.max(4,Math.min(innerHeight-hh-4,e.clientY-d.dy))+'px';e.preventDefault()};
    const up=e=>{const d=VAB_DRAG;if(!d||d.id!==e.pointerId)return;VAB_DRAG=null;removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);if(!d.on)return;
      const r=b.getBoundingClientRect();VAB.pos=(r.top+r.height/2<innerHeight/2?'t':'b')+(r.left+r.width/2<innerWidth/2?'l':'r');VAB_MOVED=Date.now();vabSave();b.classList.remove('drag');b.style.left=b.style.top='';vaBanner()};
    b.onpointerdown=e=>{if(e.button||!e.target.closest('.vagrip,.vapill,.vatx'))return;const r=b.getBoundingClientRect();VAB_DRAG={x:e.clientX,y:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top,on:false,id:e.pointerId};
      addEventListener('pointermove',mv,{passive:false});addEventListener('pointerup',up);addEventListener('pointercancel',up)};
    /* el botón fijo del capataz y otras barras aparecen después (vistas que se dibujan solas): se vuelve a medir, a lo más una vez por cuadro */
    let q=0;const re=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;vabPlace()})};addEventListener('resize',re);
    try{new MutationObserver(re).observe(document.body,{childList:true,subtree:true})}catch(e){}}
  const cl='vabar p-'+VAB.pos+(VAB.min?' min':'');if(b.className.replace(/\s*drag/,'')!==cl)b.className=cl;
  if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}
  vabPlace();requestAnimationFrame(vabPlace)}
/* vista celular: la app dentro de un marco del tamaño de un teléfono (mismo usuario y mismo "Ver como") */
const IN_FRAME=window.top!==window;if(IN_FRAME)document.documentElement.classList.add('in-frame');
const PHONES=[['iphone','iPhone (390 × 844)',390,844],['android','Android (360 × 780)',360,780],['chico','Celular chico (320 × 640)',320,640],['tablet','Tablet (768 × 1024)',768,1024]];
/* «Girar»: celular echado (ancho y alto intercambiados; la app de adentro ve orientación horizontal) */
let PH_ROT=false;
const phDims=d=>PH_ROT?`width:min(${d[3]}px,calc(100vw - 40px));height:min(${d[2]}px,calc(100vh - 110px))`:`width:${d[2]}px;height:min(${d[3]}px,calc(100vh - 110px))`;
function phonePreview(dev){if(IN_FRAME)return;const el0=$('#phprev');if(el0&&!dev){el0.remove();return}const d=PHONES.find(q=>q[0]===dev)||PHONES[0];
  let el=el0;if(!el){el=document.createElement('div');el.id='phprev';el.className='phprev';document.body.appendChild(el)}
  const src=`${location.pathname}?vista=celular${me&&U.tab?'#'+U.tab:''}`;
  el.innerHTML=`<div class="phbar"><b>📱 Vista celular</b><select id="phdev" aria-label="Equipo">${PHONES.map(q=>`<option value="${q[0]}"${q[0]===d[0]?' selected':''}>${q[1]}</option>`).join('')}</select><button class="ib" id="phrot" title="Ver el celular echado (horizontal) o parado" aria-pressed="${PH_ROT}">⟲ Girar</button><button class="ib" id="phrel">Recargar</button><button class="ib" id="phwin" title="Abre la app en una ventana aparte del tamaño del celular (si el marco no carga)">Abrir aparte ↗</button><span class="mu">${VA?'Viendo como '+esc(ROLE[VA.role]||VA.role):'Con tu usuario'} · lo que guardes se guarda de verdad</span><span style="flex:1"></span><button class="ib pri" id="phx">Cerrar</button></div>
   <div class="phmsg" id="phmsg" role="status" hidden></div>
   <div class="phwrap"><div class="phone" style="${phDims(d)}"><iframe title="La app en tamaño celular" src="${src}"></iframe></div></div>`;
  el.onclick=e=>{if(e.target.id==='phx'||e.target===el)el.remove();if(e.target.id==='phrel'){const f=el.querySelector('iframe');if(f){phMsg('');f.src=f.src}}
    if(e.target.id==='phwin')window.open(src,'lpsphone',PH_ROT?`popup,width=${d[3]},height=${d[2]}`:`popup,width=${d[2]},height=${d[3]}`);
    if(e.target.id==='phrot'){PH_ROT=!PH_ROT;const ph=el.querySelector('.phone');if(ph)ph.style.cssText=phDims(d);e.target.setAttribute('aria-pressed',String(PH_ROT))}};
  el.onchange=e=>{if(e.target.id==='phdev')phonePreview(e.target.value)};phWatch(el.querySelector('iframe'))}
/* si el marco no muestra la app (encabezados que impiden enmarcarla, un error al arrancar o se queda «cargando»), lo dice en la barra
   en vez de quedar en blanco, con «Abrir aparte» como salida */
function phMsg(t){const m=$('#phmsg');if(!m)return;m.hidden=!t;m.innerHTML=t}
function phWatch(fr){if(!fr)return;let err='',t0=0;
  const doc=()=>{try{return fr.contentDocument}catch(e){return null}};
  const check=final=>{if(!fr.isConnected)return;const D=doc();
    if(!D||!D.querySelector('#tabs')){if(final||D==null)phMsg('El marco no pudo abrir la app (el navegador o el sitio no la deja mostrar dentro de otra página). Usa <b>Abrir aparte ↗</b>.');return}
    const v=D.querySelector('#main')&&D.querySelector('#main').dataset.view,lg=D.querySelector('#login:not([hidden])'),ld=D.querySelector('#loading');
    if(v){phMsg(err?'La app abrió, pero hubo un error dentro del marco: '+esc(err):'');return}
    if(final)phMsg(err?'No se pudo mostrar la app dentro del marco: '+esc(err)+'. Prueba <b>Recargar</b> o <b>Abrir aparte ↗</b>.':lg?'Dentro del marco pide iniciar sesión: ingresa ahí o usa <b>Abrir aparte ↗</b>.':ld?'La app no termina de cargar dentro del marco. Prueba <b>Recargar</b> o <b>Abrir aparte ↗</b>.':'')};
  fr.addEventListener('load',()=>{err='';t0=Date.now();const w=(()=>{try{return fr.contentWindow}catch(e){return null}})();
    try{if(w){w.addEventListener('error',e=>{if(!err)err=String(e.message||e.error||'error')});w.addEventListener('unhandledrejection',e=>{if(!err)err=String((e.reason&&e.reason.message)||e.reason||'error')})}}catch(e){}
    check(false);const tm=setInterval(()=>{if(!fr.isConnected){clearInterval(tm);return}const fin=Date.now()-t0>12000;check(fin);const D=doc();if(fin||(D&&D.querySelector('#main[data-view]')))clearInterval(tm)},1000)})}
function vaDialog(btn){if(!VA_OK()){toast('“Ver como” solo está disponible en la copia de prueba.');return}const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));const cur=VA||{};
  const roles=[['editor','Editor'],['campo','Campo'],['sc','Subcontratista'],['capataz','Capataz'],['area','Área de apoyo (OT, Calidad…)'],['veedor','Veedor'],['lector','Lector'],['tcap','Capataz (tareo)'],['tasis','Asistente de tareo'],['tcos','Costos (tareo)']];
  openPop(btn,`<div class="ph">Ver como…</div><div class="ptx">Prueba la app con los permisos de otro rol. Lo que guardes se guarda de verdad en la copia de prueba, con tu usuario.</div>
    <div class="qrow"><select id="var" aria-label="Rol">${roles.map(([k,v])=>`<option value="${k}"${cur.role===k?' selected':''}>${v}</option>`).join('')}</select></div>
    <div class="qrow" id="vasc"><select id="vas" aria-label="Empresa">${cons.map(c=>`<option value="${c.id}"${cur.sc===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="qrow" id="vacp"><select id="vac" aria-label="Capataz">${(()=>{const cs=[...MEM.entries()].filter(([,m])=>m&&m.role==='tcap'&&!m.off).sort((x,y)=>String(x[1].name||x[0]).localeCompare(String(y[1].name||y[0])));return cs.length?cs.map(([id,m])=>`<option value="${esc(id)}"${cur.cap===id?' selected':''}>${esc(m.name||id)}</option>`).join(''):'<option value="">(no hay capataces del tareo: verás tu propio usuario)</option>'})()}</select></div>
    <div class="qrow" id="vaar"><select id="vaa" aria-label="Área">${restrAreasL().map(a=>`<option${cur.area===a?' selected':''}>${esc(a)}</option>`).join('')}</select></div>
    <div id="vapi" style="padding:0 10px 6px;max-height:160px;overflow:auto"><div class="mu" style="font-size:12px">Pisos a su cargo (para revisar propuestas):</div>${pisos().map(p=>`<label class="chk" style="display:flex"><input type="checkbox" class="vapc" value="${p.id}"${(cur.pisos||[]).includes(p.id)?' checked':''}> ${esc(p.code)} · ${esc(p.name)}</label>`).join('')}</div>
    <label class="chk" id="vacl" style="display:flex;padding:0 10px 6px"><input type="checkbox" id="vacli"${cur.cli?' checked':''}> Con acceso a la versión cliente</label>
    <label class="chk" id="vatp" style="display:flex;padding:0 10px 6px"><input type="checkbox" id="vatpub"${cur.tpub?' checked':''}> Publica tareo (ve el módulo Tareo)</label>
    <button data-do="go" class="pri">Ver como este rol</button>`,
   {go:()=>{const role=($('#var')||{}).value;const v={role};if(role==='sc'||role==='capataz')v.sc=($('#vas')||{}).value||'';if(role==='area')v.area=($('#vaa')||{}).value||'';if(role==='tcap'&&($('#vac')||{}).value)v.cap=$('#vac').value;if(role==='editor')v.pisos=[...document.querySelectorAll('.vapc:checked')].map(i=>i.value);if(CLI_ROLES.includes(role)&&($('#vacli')||{}).checked)v.cli=true;if(role==='editor'&&($('#vatpub')||{}).checked)v.tpub=true;vaSet(v)}});
  const sync=()=>{const r=($('#var')||{}).value;const a=$('#vasc'),b=$('#vaar'),c=$('#vapi');if(a)a.hidden=!(r==='sc'||r==='capataz');if(b)b.hidden=r!=='area';if(c)c.hidden=r!=='editor';const d=$('#vacl');if(d)d.hidden=!CLI_ROLES.includes(r);const f=$('#vatp');if(f)f.hidden=r!=='editor';const g=$('#vacp');if(g)g.hidden=r!=='tcap'};sync();const sel=$('#var');if(sel)sel.onchange=sync;
  /* el popover no debe cerrarse al marcar casillas */}
function pisosSinResp(){return pisos().filter(p=>!respOf(p.id).length)}
/* el subcontratista también marca inicio, detención y reanudación en la pantalla "En obra" (no cierra el día) */
function SCK(){return!!me&&me.role==='sc'}

