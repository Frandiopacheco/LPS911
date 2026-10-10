"use strict";
/* LPS 911 · Versión para el cliente (pestaña «Cliente», solo administradores).
   El lookahead interno es uno solo: con él se trabaja, se registra en obra y se mide el PPC interno. La versión cliente es
   una CAPA encima del interno (nunca escribe en acts):
   - holguras en días hábiles por obra, piso, sector, ambiente o actividad (cli/buf; manda la más específica);
   - cambios por fila (clia/<actId>.f): nombre, SC, orden… y si se tocan días o cantidades, la fila queda «fijada»
     (ya no sigue al interno ni a la holgura) hasta «Volver a seguir al interno»;
   - filas ocultas al cliente (clia/<actId>.hide) y filas solo del cliente (clia/<id>.own + a).
   Lo que no se toca sigue al interno solo. En la pestaña Cliente, S.act es la versión cliente (cliSync, como el modo
   propuesta del SC) y put() desvía lo que se edita a clia (cliPut).
   Emitir guarda una foto inmutable (clidx/cliver) para una semana (forW): a mano hasta el sábado 23:00 previo a esa semana;
   si nadie emitió, la emite el servidor (functions: emitirCliente). El PPC del cliente se mide contra la foto de cada
   semana, con el cumplimiento de obra (las filas solo del cliente no tienen registro de obra y no cuentan).
   Reglas: cli, clia, clidx, cliver solo el administrador.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

let CLIB=null,cliBufSub=null,cliIdxSub=null,cliOvSub=null,cliErr=null,CLI_INT=null,cliLateCache=null;
const CLX=new Map();   // versiones emitidas (índice)
const CLVD=new Map();  // versiones emitidas ya leídas: id → {ready,pis,sec,amb,act}
const CLVE=new Map();  // versiones que no se pudieron leer: id → error (no se reintenta en cada dibujo)
const CLIA=new Map();  // capa del cliente por actividad: id → {f?, hide?, h?, own?, a?, arch?}
let CLIAV=0,CLI_BASE=null,cliOvCache=null,CLI_UMODE=false;const CLI_U=[[],[]];
/* Solo el administrador (decidido con el dueño, oct 2026). Las reglas de Firestore dicen lo mismo. */
const CLI_ROLES=[];
const CLI_OFF=false;
const canCli=()=>!CLI_OFF&&!!me&&!!db&&me.role==='admin';
/** ¿Está abierta la pestaña Cliente? (internamente es el Lookahead con U.cliv) */
const cliOn=()=>!!(U.cliv&&U.tab==='look'&&canCli()&&!U.cliVer&&!(U.ver&&U.verMode==='ver'));
const cliTabOn=()=>!!(U.cliv&&U.tab==='look'&&canCli());
const BUF_LV={x:'la actividad',a:'el ambiente',s:'el sector',p:'el piso',all:'toda la obra'};
/* campos de una fila que la versión cliente puede cambiar */
const CLI_F=['days','qty','name','sc','und','metrado','order'];

/** Se deja de escuchar al perder el acceso. */
function cliStop(){if(cliBufSub)cliBufSub();if(cliIdxSub)cliIdxSub();if(cliOvSub)cliOvSub();cliBufSub=cliIdxSub=cliOvSub=null;CLIB=null;CLX.clear();CLVD.clear();CLIA.clear();CLIAV++;cliOvCache=cliLateCache=null;U.cliv=false;U.cliVer='';cliSync()}
function ensureCli(){if(!canCli()||cliBufSub)return;
  cliBufSub=fcol('cli').doc('buf').onSnapshot(d=>{CLIB=d.exists?d.data():{};cliErr=null;cliOvCache=null;if(ready)requestRender()},
    e=>{cliErr=e&&e.code||'error';CLIB={};if(ready)requestRender()});
  cliIdxSub=fcol('clidx').onSnapshot(sn=>{CLX.clear();sn.docs.forEach(d=>CLX.set(d.id,{...d.data(),id:d.id}));cliLateCache=null;const L=cliLast();if(L)cliLoad(L.id);if(ready)requestRender()},()=>{});
  cliOvSub=fcol('clia').onSnapshot(sn=>{CLIA.clear();sn.docs.forEach(d=>CLIA.set(d.id,d.data()));CLIAV++;cliOvCache=null;if(ready)requestRender()},e=>{cliErr=e&&e.code||'error';if(ready)requestRender()});
  unsubs.push(()=>{if(cliBufSub)cliBufSub();if(cliIdxSub)cliIdxSub();if(cliOvSub)cliOvSub();cliBufSub=cliIdxSub=cliOvSub=null;CLIB=null;CLX.clear();CLVD.clear();CLIA.clear();CLIAV++;cliOvCache=cliLateCache=null;U.cliv=false;U.cliVer=''})}

/** Holgura que le toca a un elemento: la más específica que esté definida (actividad › ambiente › sector › piso › obra).
    skip: no mirar el propio nivel (para saber cuánto heredaría). */
function bufChain(lv,id,x){const a=lv==='x'?S.amb.get(x?x.ambId:(S.act.get(id)||{}).ambId):lv==='a'?S.amb.get(id):null;
  const sid=lv==='s'?id:a&&a.sectorId;const s=sid&&S.sec.get(sid);const pid=lv==='p'?id:s?pisoOfSecObj(s):null;
  const L=[];if(lv==='x')L.push(['x',id]);if(lv==='x'||lv==='a')L.push(['a',a&&a.id]);if(lv!=='p'&&lv!=='all')L.push(['s',sid]);if(lv!=='all')L.push(['p',pid]);return L}
function bufAt(lv,id,x,skip){const B=CLIB||{};const has=(m,k)=>m&&k!=null&&Object.prototype.hasOwnProperty.call(m,k);
  for(const[l,k]of bufChain(lv,id,x)){if(skip&&l===lv)continue;if(has(B[l],k))return{n:+B[l][k]||0,lv:l}}return{n:+B.all||0,lv:'all'}}
const bufOf=x=>bufAt('x',x.id,x);
function cliShift(x){const n=bufOf(x).n;if(!n)return x;const days=[...new Set((x.days||[]).map(d=>wshift(d,n)))].sort();
  const qty={};for(const[d,v]of Object.entries(x.qty||{})){const k=wshift(d,n);qty[k]=(qty[k]||0)+(+v||0)}return{...x,days,qty}}
/** Fila del cliente a partir de la interna: holgura, y encima lo cambiado a mano (días cambiados = fila fijada). */
function cliRow(x,o){const f=o&&o.f;if(!f||!Object.keys(f).length)return cliShift(x);if(f.days){const y={...x,...clone(f),id:x.id};if(f.qty==null)delete y.qty;return y}return{...cliShift(x),...clone(f),id:x.id}}
/** Lookahead del cliente (Map con _cli): se rehace solo si cambia el interno, la estructura, las holguras, la capa o el calendario. */
function cliCompose(base){const cal=JSON.stringify(P().cal||{});const c=cliOvCache;
  if(c&&c.base===base&&c.b===CLIB&&c.v===CLIAV&&c.cal===cal&&c.amb===S.amb&&c.sec===S.sec&&c.pis===S.pis)return c.m;
  const m=new Map();for(const[id,x]of base){const o=CLIA.get(id);if(o&&(o.hide||o.own))continue;m.set(id,cliRow(x,o))}
  for(const[id,o]of CLIA)if(o&&o.own&&!o.arch&&o.a&&S.amb.has(o.a.ambId))m.set(id,actNorm({...clone(o.a),id}));
  m._cli=true;cliOvCache={base,b:CLIB,v:CLIAV,cal,amb:S.amb,sec:S.sec,pis:S.pis,m};return m}
/** El lookahead interno, aunque la pestaña Cliente tenga puesta su capa en S.act */
const actInt=()=>S.act&&S.act._cli&&CLI_BASE?CLI_BASE:S.act;
const cliActs=()=>cliCompose(actInt());
/** Pone o quita la capa del cliente en S.act (render() lo llama siempre; también los datos que llegan). Cada modo tiene su propio deshacer. */
function cliSync(){if(cliBufSub&&!canCli()){cliStop();return}const on=cliOn();
  if(on){if(!S.act._cli)CLI_BASE=S.act;const m=cliCompose(CLI_BASE);if(S.act!==m){S.act=m;DV++}CLI_INT=CLI_BASE}
  else{if(S.act&&S.act._cli){S.act=CLI_BASE||new Map();DV++}CLI_INT=null}
  const tb=cliTabOn();if(tb!==CLI_UMODE){const a=undoS.splice(0),b=redoS.splice(0);undoS.push(...CLI_U[0]);redoS.push(...CLI_U[1]);CLI_U[0]=a;CLI_U[1]=b;CLI_UMODE=tb;
    if(typeof SELA!=='undefined'&&SELA.size){SELA.clear();if(typeof selBar==='function')selBar()}if(typeof updUndo==='function'&&$('#bundo'))updUndo();gridRows=null}}
/** Pilas de deshacer del lookahead interno, estés en la pestaña que estés (plano.js agrega ahí lo que publica) */
const undoInt=()=>CLI_UMODE?CLI_U:[undoS,redoS];
/** Escribe una fila en el lookahead interno en memoria (aunque la capa del cliente esté puesta) */
function actBasePut(id,v){const B=actInt();if(v)B.set(id,v);else B.delete(id);if(S.act&&S.act._cli){cliOvCache=null;S.act=cliCompose(B)}DV++}
/** Corre fn con el lookahead interno en S.act (cálculos que miden la obra: PPC, terminadas…) */
function withInt(fn){const o=S.act;if(!o||!o._cli)return fn();S.act=actInt();try{return fn()}finally{S.act=o}}
/** Llegó una foto nueva de acts mientras la capa está puesta: la base es la interna */
function cliBaseSet(mp){CLI_BASE=mp;const m=cliCompose(mp);S.act=m}
/** getDoc de una fila oculta (para deshacer «Ocultar al cliente») */
function cliHidden(id){const o=CLIA.get(id);if(!o)return null;if(o.own)return o.arch&&o.a?{...clone(o.a),id}:null;return o.hide&&o.h?{...clone(o.h),id}:null}
/* cantidades vacías = sin cantidades (pintar y borrar un día no debe dejar la fila fijada) */
const cliQ=(k,v)=>k==='qty'&&v&&typeof v==='object'&&!Object.keys(v).length?null:v??null;
const cliOv=id=>{const o=CLIA.get(id);return o&&!o.hide&&!o.own&&o.f&&Object.keys(o.f).length?o:null};

/* ---------- escritura: en la pestaña Cliente todo cambio va a la capa (clia), nunca al interno ---------- */
function cliClean(a){const c={};for(const[k,v]of Object.entries(a||{}))if(k!=='id'&&k[0]!=='_')c[k]=clone(v);if(Array.isArray(c.days))c.days=[...new Set(c.days)].sort();return c}
function cliPut(col,id,data){if(!cliTabOn())return false;
  if(U.cliVer){toast('Estás viendo una versión emitida (solo lectura): elige «Actual (editable)» para cambiar la versión cliente.');requestRender();return true}
  if(col!=='acts'){toast('En la versión cliente solo se cambian las actividades: pisos, sectores y ambientes vienen del lookahead interno.');requestRender();return true}
  const x=CLI_BASE&&CLI_BASE.get(id);const prev=CLIA.get(id)||null;const gone=!data||!!data.arch;let doc;
  if(!x){/* fila solo del cliente */
    if(prev&&!prev.own){doc=gone?{...prev,hide:true,h:cliClean(data||{})}:null}
    /* eliminar (archivar) la guarda con su arch, para poder deshacer; deshacer su creación (data null) la borra */
    else if(!data)doc=null;else doc=data.arch?{own:true,a:cliClean(data),arch:true}:{own:true,a:cliClean(data)}}
  else if(gone)doc={...(prev||{}),hide:true,h:cliClean(data||x)};
  else{const y=cliShift(x);const f={};
    for(const k of CLI_F){const a=cliQ(k,data[k]),b=cliQ(k,y[k]);if(canon(a)!==canon(b))f[k]=clone(a)}
    if(f.days||'qty'in f){f.days=[...new Set(data.days||[])].sort();f.qty=data.qty==null?null:clone(data.qty)}
    doc=Object.keys(f).length?{f}:null}
  cliSave(id,doc);return true}
function cliSave(id,doc){if(doc){doc={...doc,by:me.email,ts:NOW()};CLIA.set(id,doc)}else CLIA.delete(id);CLIAV++;cliOvCache=null;cliSync();requestRender();
  if(!db)return;const ref=fcol('clia').doc(id);(doc?ref.set(doc):ref.delete()).catch(err=>toast('No se pudo guardar en la versión cliente: '+(err.code==='permission-denied'?'solo el administrador puede editarla':(err.code||err.message))))}
/** Quita los cambios de la fila: vuelve a seguir al interno (con la holgura) */
function cliFollow(ids){const ops=[];for(const id of ids){const x=CLI_BASE&&CLI_BASE.get(id);if(x&&cliOv(id))ops.push(op('acts',id,cliShift(x)))}
  if(ops.length)apply(ops,ops.length>1?`${ops.length} actividades vuelven a seguir al interno`:'La actividad vuelve a seguir al lookahead interno')}
function cliUnhide(id){const x=CLI_BASE&&CLI_BASE.get(id);const o=CLIA.get(id);if(!o)return;
  if(o.own){const n={...o,a:{...o.a}};delete n.arch;delete n.a.arch;cliSave(id,n);toast('Fila del cliente restaurada');return}
  const n={...o};delete n.hide;delete n.h;cliSave(id,n.f&&Object.keys(n.f).length?n:null);toast(`“${(x&&x.name)||'Actividad'}” vuelve a verse en la versión cliente`)}

/* ---------- semana de cada emisión: corte el sábado 23:00 (Lima) antes del lunes ---------- */
const cliCut=n=>Date.parse(addD(weekStart(n),-2)+'T23:00:00Z')+5*3600e3;
/** Semana para la que vale una emisión hecha ahora: la próxima, salvo que ya pasó su corte */
function cliTarget(now=NOW()){let n=weekOf(todayIso())+1;if(now>=cliCut(n))n++;return n}
/** Semana desde la que vale una versión emitida (las antiguas, sin forW: desde el lunes siguiente a su fecha, o ese lunes) */
function cliForW(v){if(v&&v.forW!=null)return+v.forW;const w=weekOf(v.date);return weekStart(w)===v.date?w:w+1}

/* ---------- versiones emitidas ---------- */
const cliLast=()=>[...CLX.values()].sort((a,b)=>b.ts-a.ts)[0]||null;
async function cliLoad(id){if(CLVD.has(id)||!db)return;const v=CLX.get(id);if(!v)return;const o={ready:false,pis:new Map(),sec:new Map(),amb:new Map(),act:new Map()};CLVD.set(id,o);
  try{for(const pid of Object.keys(v.pisos||{})){const d=await fcol('cliver').doc(id+'__'+pid).get();if(!d.exists)continue;const x=d.data();const sn=JSON.parse(x.json||'{}');
      o.pis.set(pid,{...x.piso,id:pid});for(const[k,z]of Object.entries(sn.secs||{}))o.sec.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.ambs||{}))o.amb.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.acts||{}))o.act.set(k,{...z,id:k})}
    o.ready=true}catch(err){CLVD.delete(id);CLVE.set(id,err.code||err.message||'error');toast('No se pudo abrir la versión emitida: '+(err.code||err.message))}
  cliLateCache=null;gridRows=null;if(ready)requestRender()}
async function cliEmit(){if(!canCli())return;const pis=pisos();if(!pis.length)return;const n=cliTarget();const cut=cliCut(n);
  const lab=`Semana ${n} · emitida el ${fmtD(todayIso())} ${hhmm(NOW())}`;const prev=[...CLX.values()].filter(v=>cliForW(v)===n);
  if(!await uiAsk({title:`¿Emitir la versión cliente de la semana ${n}?`,html:`Se guarda tal como se ve ahora: <b>${esc(lab)}</b>.`,
    note:`Contra esta versión se medirá el PPC del cliente de la semana ${n}. ${prev.length?'Reemplaza a la emitida antes para esa semana (vale la última). ':''}Puedes volver a emitir hasta el sábado ${fmtD(addD(weekStart(n),-2))} a las 11:00 p. m.; si no emites, se emite sola a esa hora.`,ok:'Emitir'}))return;
  if(NOW()>=cut){toast('Pasó el corte del sábado 11:00 p. m.: vuelve a emitir (ahora vale para la semana siguiente).');return}
  const id='c-'+NOW().toString(36);const M=cliActs();const idx={label:lab,ts:NOW(),date:todayIso(),week:curWeek(),forW:n,kind:'manual',by:me.email,byName:me.name||me.email,buf:CLIB||{},pisos:{}};const docs=[];
  for(const p of pis){const sn=snapPiso(p.id,M);for(const k of Object.keys(sn.acts)){const o=CLIA.get(k);if(o&&o.own)sn.acts[k].own=true}
    idx.pisos[p.id]={code:p.code,name:p.name,order:p.order||0,acts:Object.keys(sn.acts).length};docs.push([id+'__'+p.id,{verId:id,pisoId:p.id,piso:strip(p),json:JSON.stringify(sn)}])}
  toast('Emitiendo la versión del cliente…');
  try{for(let i=0;i<docs.length;i+=8){const b=db.batch();docs.slice(i,i+8).forEach(([k,v])=>b.set(fcol('cliver').doc(k),v));await b.commit()}
    if(NOW()>=cut){toast('Pasó el corte del sábado 11:00 p. m. mientras se guardaba: no se emitió. Vuelve a emitir (valdrá para la semana siguiente).');return}
    await fcol('clidx').doc(id).set(idx);toast(`Versión de la semana ${n} emitida. Ya puedes exportar su Excel.`)}
  catch(err){toast('No se pudo emitir: '+(err.code==='permission-denied'?'solo el administrador puede emitir':(err.code||err.message)))}}

/* ---------- holgura consumida: la interna ya termina después de lo comunicado al cliente ---------- */
function cliLate(){if(!canCli())return null;const L=cliLast();const v=L&&CLVD.get(L.id);if(!v||!v.ready)return null;const A=actInt();
  if(cliLateCache&&cliLateCache.src===A&&cliLateCache.v===L.id)return cliLateCache.m;const m=new Map();
  for(const[id,c]of v.act){if(c.own)continue;const x=A.get(id);if(!x||DONE.has(id))continue;const cd=c.days||[],xd=x.days||[];if(!cd.length||!xd.length)continue;
    const ce=cd[cd.length-1],xe=xd.slice().sort().pop();if(xe>ce)m.set(id,{end:xe,cli:ce,w:cliForW(L)})}
  cliLateCache={src:A,v:L.id,m};return m}

/* ---------- holguras: ventana para definirlas ---------- */
function bufDialog(btn,lv,id,label){if(!canCli())return;if(U.cliVer||(typeof lkLockOn==='function'&&lkLockOn())){toast(U.cliVer?'Es una versión emitida (solo lectura).':'Toca «✎ Editar» para cambiar la holgura.');return}const B=CLIB||{};const own=lv==='all'?(B.all??null):(B[lv]&&Object.prototype.hasOwnProperty.call(B[lv],id)?B[lv][id]:null);
  const inh=lv==='all'?0:bufAt(lv,id,null,true).n;
  openPop(btn,`<div class="ph">Holgura para el cliente · ${esc(label)}</div><div class="ptx">Días hábiles que se suman a las fechas internas en la versión del cliente. Manda la holgura más específica (actividad › ambiente › sector › piso › obra). Las filas con días cambiados a mano (fijadas) no la usan.${lv!=='all'?` Si no defines una, usa <b>+${inh}</b> del nivel superior.`:''}</div>
    <div class="qrow"><input type="number" id="bfn" min="0" max="20" value="${own??inh}" style="width:64px" aria-label="Días hábiles"><span class="mu">día(s) hábil(es)</span><button data-do="ok">Guardar</button></div>
    ${lv!=='all'&&own!=null?'<button data-do="clr">Usar la del nivel superior</button>':''}`,
    {ok:()=>{const n=Math.max(0,Math.min(20,parseInt(($('#bfn')||{}).value,10)||0));bufSave(lv,id,n,`Holgura de ${label}: +${n}`)},clr:()=>bufSave(lv,id,null,`Holgura de ${label}: la del nivel superior`)});
  setTimeout(()=>{const i=$('#bfn');if(i){i.focus();i.select();i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#pop [data-do="ok"]')?.click()}}}},0)}
/* guarda solo la holgura tocada (set con merge): lo que otro usuario cambió en otra actividad o nivel no se pisa */
function bufSave(lv,id,n,msg){const B=JSON.parse(JSON.stringify(CLIB||{}));if(lv==='all')B.all=n||0;else{B[lv]=B[lv]||{};if(n==null)delete B[lv][id];else B[lv][id]=n}
  B.by=me.email;B.ts=NOW();CLIB=B;cliOvCache=null;requestRender();
  const FV=firebase.firestore.FieldValue;const patch={by:me.email,ts:B.ts};if(lv==='all')patch.all=n||0;else patch[lv]={[id]:n==null?FV.delete():n};
  fcol('cli').doc('buf').set(patch,{merge:true}).then(()=>toast(msg)).catch(err=>toast('No se pudo guardar la holgura: '+(err.code==='permission-denied'?'solo el administrador puede cambiarla':(err.code||err.message))))}
/* botón con la holgura (+n; resaltado si está definida en ese nivel) */
function cliBufBtn(lv,id,x){const r=bufAt(lv,id,x);const own=r.lv===lv;const t={x:'esta actividad',a:'este ambiente',s:'este sector',p:'este piso'}[lv];
  return`<button class="clb${own?' own':''}" data-buf="${lv}" data-bid="${esc(id)}" title="Holgura de ${t}: +${r.n} día${r.n===1?'':'s'} hábil${r.n===1?'':'es'}${own?'':' (heredada de '+BUF_LV[r.lv]+')'}. Clic para cambiarla.">+${r.n}</button>`}
function cliBufClick(b){const lv=b.dataset.buf,id=b.dataset.bid;let label='';
  if(lv==='x'){const x=S.act.get(id);label='la actividad '+(x&&x.name||'')}else if(lv==='a'){const a=S.amb.get(id);label='el ambiente '+(a&&a.code||'')}
  else if(lv==='s'){const s=S.sec.get(id);label='el sector '+(s&&s.code||'')}else{const p=S.pis.get(id);label='el piso '+(p&&p.code||'')}
  bufDialog(b,lv,id,label)}
const bufKbd=(lv,id)=>{const B=CLIB||{};const own=B[lv]&&Object.prototype.hasOwnProperty.call(B[lv],id)?B[lv][id]:null;return own!=null?`<kbd>+${own}</kbd>`:''};
/** Marca de la fila en la pestaña Cliente: fijada / cambiada / solo del cliente */
function cliRowMark(id){const o=CLIA.get(id);if(!o||o.hide)return'';if(o.own)return'<span class="cliov own" title="Fila solo del cliente: no existe en el lookahead interno y no entra al PPC del cliente">C</span>';
  if(!o.f||!Object.keys(o.f).length)return'';const fx=!!o.f.days;return`<span class="cliov${fx?' fx':''}" title="${fx?'Fila fijada: sus días se cambiaron a mano y ya no siguen al lookahead interno ni a la holgura':'Fila con cambios solo para el cliente ('+Object.keys(o.f).map(k=>({name:'nombre',sc:'subcontratista',order:'orden',und:'unidad',metrado:'metrado',qty:'cantidades'}[k]||k)).join(', ')+')'}. Menú ⋮ › Volver a seguir al interno.">${fx?'📌':'✎'}</span>`}

/* ---------- menús de la pestaña Cliente ---------- */
function cliActMenu(btn,aid){const x=S.act.get(aid);if(!x)return;const o=CLIA.get(aid);const own=!!(o&&o.own);const ov=cliOv(aid);
  openPop(btn,`<div class="ph">Actividad · versión cliente</div><button data-do="sel">Seleccionar para mover en bloque<kbd>Ctrl+clic</kbd></button><button data-do="mvb">Mover sus días…</button>${own?'':`<button data-do="buf">Holgura para el cliente…${bufKbd('x',aid)}</button>`}
   ${ov?'<button data-do="fol">Volver a seguir al interno</button>':''}<hr><button data-do="ins">Insertar fila del cliente debajo</button><button data-do="up">Subir</button><button data-do="dn">Bajar</button><button data-do="clr">Borrar días</button><hr>
   <button data-do="del" class="danger">${own?'Eliminar fila del cliente':'Ocultar al cliente'}</button><div class="ptx">${own?'Fila solo del cliente: no tiene registro en obra y no entra al PPC del cliente.':'El lookahead interno no cambia.'}</div>`,
  {sel:()=>selToggle(aid),mvb:()=>setTimeout(()=>blockMoveDialog(btn,[aid],x.name||'la actividad'),0),buf:()=>setTimeout(()=>bufDialog(btn,'x',aid,'la actividad '+(x.name||'')),0),fol:()=>cliFollow([aid]),
   ins:()=>insertAct(aid),up:()=>moveItem('acts','ambId',x,-1),dn:()=>moveItem('acts','ambId',x,1),clr:()=>apply([op('acts',aid,{...x,days:[],qty:{}})],'Días borrados en la versión cliente'),
   del:()=>apply([arc('acts',aid)],own?`Fila del cliente “${x.name||'sin nombre'}” eliminada`:`“${x.name||'sin nombre'}” oculta al cliente`)})}
function cliAmbMenu(btn,ambId){const a=S.amb.get(ambId);if(!a)return;const L=actsOfAmb(ambId);const ovs=L.filter(x=>cliOv(x.id)).map(x=>x.id);
  openPop(btn,`<div class="ph">Ambiente ${esc(a.code)} · versión cliente</div><button data-do="act">+ Fila del cliente al final</button><button data-do="buf">Holgura del ambiente…${bufKbd('a',ambId)}</button><button data-do="selA">Seleccionar sus actividades</button>${ovs.length?`<button data-do="fol">Volver a seguir al interno<kbd>${ovs.length} fila${ovs.length>1?'s':''}</kbd></button>`:''}<hr><button data-do="hide" class="danger">Ocultar el ambiente al cliente</button>`,
  {act:()=>addAct(ambId),buf:()=>setTimeout(()=>bufDialog(btn,'a',ambId,'el ambiente '+a.code),0),selA:()=>{L.forEach(x=>{if(canMoveAct(x))SELA.add(x.id)});selBar();requestRender()},fol:()=>cliFollow(ovs),
   hide:()=>{const ops=L.map(x=>arc('acts',x.id)).filter(Boolean);if(ops.length)apply(ops,`Ambiente ${a.code}: ${ops.length} fila${ops.length>1?'s':''} oculta${ops.length>1?'s':''} al cliente`)}})}

/* ---------- pestaña Cliente (el Lookahead con la capa del cliente) ---------- */
function cliRenderLook(main){const v=U.cliVer?CLVD.get(U.cliVer):null;if(U.cliVer&&!v&&!CLVE.has(U.cliVer))cliLoad(U.cliVer);
  if(U.cliVer&&!(v&&v.ready)){const gw=main.querySelector('#gw');if(gw)gw.innerHTML=`<div class="empty" style="padding:24px">${CLVE.has(U.cliVer)?'No se pudo abrir la versión emitida: '+esc(CLVE.get(U.cliVer))+'. Elige otra o «Actual».':'Cargando la versión emitida…'}</div>`;gridRows=null;cliBanner();return}
  if(U.cliVer){const cw=canWrite;const un=swapVer(v);CLI_INT=null;canWrite=false;try{renderLookInner(main)}finally{canWrite=cw;un()}}
  else{LK_CAN=!!canWrite;lkEditSync();if(lkLockOn()){const cw=canWrite;canWrite=false;try{renderLookInner(main)}finally{canWrite=cw}}else renderLookInner(main)}
  cliBanner()}
function cliHiddenList(){const L=[];for(const[id,o]of CLIA){if(o.own){if(!o.a)continue;if(o.arch)L.push({id,x:o.a,own:true});else if(!S.amb.has(o.a.ambId))L.push({id,x:o.a,own:true,orph:true})}else if(o.hide){const x=CLI_BASE&&CLI_BASE.get(id);if(x)L.push({id,x})}}
  return L.filter(o=>o.orph||visPisoOk(o.x))}
const visPisoOk=x=>{const pid=x&&x.ambId?pisoOfAmb(x.ambId):'';return !U.piso||pid===U.piso};
function cliBanner(){const el=$('#cliban');if(!el)return;if(!cliTabOn()){if(el.innerHTML){el.innerHTML='';el.dataset.h=''}return}
  const B=CLIB||{};const late=cliLate();const vers=[...CLX.values()].sort((a,b)=>b.ts-a.ts);const n=cliTarget();const cur=vers.find(v=>cliForW(v)===n);
  const hid=cliHiddenList();let nOv=0,nOwn=0;for(const o of CLIA.values()){if(o.own&&!o.arch&&o.a&&S.amb.has(o.a.ambId))nOwn++;else if(!o.own&&!o.hide&&o.f&&Object.keys(o.f).length)nOv++}
  const st=cur?`Semana ${n}: emitida el ${fmtD(cur.date)}${cur.kind==='auto'?' (automática)':''}. Puedes volver a emitir hasta el sáb ${fmtD(addD(weekStart(n),-2))} 11:00 p. m.; vale la última.`
    :`Semana ${n}: aún no emitida. Si no emites, se emite sola el sáb ${fmtD(addD(weekStart(n),-2))} a las 11:00 p. m.`;
  const h=`<div class="cliban"><div class="clit"><b>Versión cliente</b><span>${U.cliVer?'Versión emitida (solo lectura)':'Lo que no cambies sigue al lookahead interno. Las marcas grises son las fechas internas.'}${cliErr?` · <span class="bad">no se pudo leer (${esc(cliErr)})</span>`:''}</span></div>
    <label class="clig">Holgura general <button class="ib" data-cb="all">+${+B.all||0} día${(+B.all||0)===1?'':'s'}</button></label>
    <select class="tin" id="cliver" aria-label="Versión del cliente"><option value="">Actual (editable)</option>${vers.map(v=>`<option value="${esc(v.id)}"${U.cliVer===v.id?' selected':''}>${esc(v.label||'')}</option>`).join('')}</select>
    ${!U.cliVer&&(nOv||nOwn)?`<span class="mu" title="Filas con cambios solo para el cliente (✎ cambiada, 📌 días fijados) y filas solo del cliente (C)">${nOv} cambiada${nOv===1?'':'s'} · ${nOwn} solo del cliente</span>`:''}
    ${!U.cliVer&&hid.length?`<button class="ib" data-cb="hid">${hid.length} oculta${hid.length===1?'':'s'}</button>`:''}
    ${late&&late.size?`<span class="clil" title="Actividades cuya fecha interna ya pasa la fecha de la última versión emitida">⚑ ${late.size} pasan la fecha del cliente</span>`:''}
    <span class="fsp"></span><button class="ib" data-cb="xls">Exportar Excel cliente</button>${U.cliVer?'':'<button class="ib pri" data-cb="emit">Emitir al cliente</button>'}
    ${U.cliVer?'':`<div class="clist">${esc(st)}</div>`}</div>`;
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}
  el.onclick=e=>{const b=e.target.closest('[data-cb]');if(!b)return;const k=b.dataset.cb;
    if(k==='all'&&U.cliVer)return;if(k==='all')bufDialog(b,'all','all','toda la obra');else if(k==='emit')cliEmit();else if(k==='xls')exportXlsx();else if(k==='hid')cliHidPop(b)};
  el.onchange=e=>{if(e.target.id==='cliver'){U.cliVer=e.target.value;if(U.cliVer)cliLoad(U.cliVer);gridRows=null;requestRender()}}}
function cliHidPop(btn){const L=cliHiddenList();if(!L.length)return;
  openPop(btn,`<div class="ph">Ocultas al cliente</div><div class="ptx">No aparecen en la versión cliente ni en lo que se emite. El lookahead interno no cambió.</div>${L.slice(0,80).map(o=>{const a=S.amb.get(o.x.ambId);return o.orph?`<button data-do="rm" data-id="${esc(o.id)}" class="danger">${esc(o.x.name||'sin nombre')}<kbd>su ambiente ya no existe · eliminar</kbd></button>`:`<button data-do="u" data-id="${esc(o.id)}">${esc(o.x.name||'sin nombre')}<kbd>${esc(a?a.code:'')}${o.own?' · solo cliente':''}</kbd></button>`}).join('')}<div class="ptx">Clic para que vuelva a verse.</div>`,
    {u:d=>cliUnhide(d.id),rm:d=>{cliSave(d.id,null);toast('Fila del cliente eliminada')}})}

/* ---------- PPC del cliente: contra la versión emitida para cada semana ----------
   Semana n: manda la versión emitida para n (la última; si no hay, la vigente de antes). Compromiso = actividad con días en la
   semana n según esa versión. Se cumple si al cierre de la semana la actividad está terminada, o si los días cumplidos en obra
   (✓ = 1, ½ = 0,5) desde el inicio de la ventana alcanzan los días que el cliente esperaba hasta ese cierre. Las filas solo
   del cliente no tienen registro de obra: no entran. */
const CLI_PW=6,CLI_HIST=4;
function cliVerFor(w){let best=null;const man=v=>v.kind==='auto'?0:1;
  for(const v of CLX.values()){const f=cliForW(v);if(f>w)continue;if(!best||f>best.f||(f===best.f&&(man(v)>man(best.v)||(man(v)===man(best.v)&&v.ts>best.v.ts))))best={v,f}}return best?best.v:null}
const cliPpcFrom=()=>weekStart(U.week-CLI_PW+1-CLI_HIST);
/* inicio fijo de la cuenta de días de la semana w: CLI_HIST semanas antes (igual se mire desde donde se mire) */
const cliPpcF=w=>weekStart(w-CLI_HIST);
function cliPisoOf(v,x){const a=v.amb.get(x.ambId);const s=a&&v.sec.get(a.sectorId);return s?s.pisoId:''}
function cliPpc(vset){return withInt(()=>cliPpc0(vset))}
function cliPpc0(vset){const F=cliPpcFrom();const today=todayIso();
  /* días cumplidos por actividad (registro del ingeniero; si no hay, el cierre del capataz) */
  const got=new Map();const add=(aid,d,st)=>{const v=st==='ok'?1:st==='partial'?.5:0;if(!v)return;let L=got.get(aid);if(!L)got.set(aid,L=[]);L.push([d,v])};
  const seen=new Set();for(const doc of DAY.values()){if(doc.date<F)continue;for(const[aid,rc]of Object.entries(doc.recs||{})){if(!rc||!rc.status)continue;seen.add(doc.date+'_'+aid);add(aid,doc.date,rc.status)}}
  /* el cierre del capataz cuenta como en Campo (recOf): no si el ingeniero lo quitó («Quitar registro») ni si es de otra partida */
  for(const[k,lv]of LIVE){const c=lv&&lv.close;if(!c||!c.status||seen.has(k))continue;const d=k.slice(0,10),aid=k.slice(11);if(d<F)continue;const r=recOf(d,aid);if(r&&r._prop)add(aid,d,r.status)}
  const W=[];let loading=false;
  for(let w=U.week-CLI_PW+1;w<=U.week;w++){const wd=weekDays(w);if(wd[0]>today)continue;const L=cliVerFor(w);if(!L)continue;const v=CLVD.get(L.id);if(!v||!v.ready){cliLoad(L.id);loading=true;continue}
    const cur=wd[5]>=today;const end=cur?today:wd[5];const Fw=cliPpcF(w);const items=[];
    for(const x of v.act.values()){if(x.own)continue;const pid=cliPisoOf(v,x);if(!vset.has(pid))continue;const cd=x.days||[];const inW=cd.filter(d=>d>=wd[0]&&d<=end);if(!inW.length)continue;
      const need=cd.filter(d=>d>=Fw&&d<=end).length;const dn=DONE.get(x.id);const g=(got.get(x.id)||[]).reduce((s,[d,q])=>d>=Fw&&d<=end?s+q:s,0);
      const ok=!!(dn&&dn<=end)||g>=need;items.push({x,pid,days:inW,need,got:g,ok})}
    const n=items.length,okN=items.filter(i=>i.ok).length;W.push({w,ver:L,n,ok:okN,ppc:n?okN/n:null,cur,items})}
  return{W,loading}}
function cliPpcCard(vset){if(!canCli())return'';ensureCli();if(!CLX.size)return`<div class="card"><h2>PPC del cliente <span class="sub">contra la versión emitida</span></h2><div class="pad"><div class="empty">Aún no hay versiones emitidas al cliente. Se emiten desde la pestaña <b>Cliente</b> › <b>Emitir al cliente</b>.</div></div></div>`;
  ensureDaily(cliPpcFrom());const{W,loading}=cliPpc(vset);const sel=W.find(o=>o.w===U.week);
  const scs={};if(sel)for(const i of sel.items){const o=scs[i.x.sc]=scs[i.x.sc]||{n:0,ok:0};o.n++;if(i.ok)o.ok++}
  const bar=v=>v==null?'<span class="mu">—</span>':`<span class="pbar"><i style="width:${Math.round(v*100)}%"></i></span><b>${pct(v)}</b>`;
  return`<div class="card"><h2>PPC del cliente <span class="sub">contra la versión emitida · lo que se le informa · solo administradores</span></h2><div class="pad">
    ${loading?'<p class="note">Cargando versiones emitidas…</p>':''}
    ${W.length?`<div class="tscroll"><table class="t ctab rt"><thead><tr><th>Semana</th><th>Versión emitida</th><th class="r">Compromisos</th><th class="r">Cumplidos</th><th>PPC cliente</th><th>PPC interno</th></tr></thead><tbody>
      ${W.map(o=>{const pi=ppcWeekAgg(o.w,vset);return`<tr${o.w===U.week?' class="on"':''}><td data-l="Semana"><b>S${o.w}</b>${o.cur?' <span class="mu">en curso</span>':''}</td><td class="wrapc mu" data-l="Versión">${esc(o.ver.label||'')}</td><td class="r" data-l="Compromisos">${o.n}</td><td class="r ok" data-l="Cumplidos">${o.ok}</td><td data-l="PPC cliente">${bar(o.ppc)}</td><td data-l="PPC interno">${bar(pi?pi.ppc:null)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Ninguna semana de este periodo tiene una versión emitida vigente.</div>'}
    ${sel&&Object.keys(scs).length?`<h3 class="clih">Semana ${U.week} por subcontratista</h3>${svgBarsH(Object.entries(scs).sort((a,b)=>b[1].ok/b[1].n-a[1].ok/a[1].n).map(([sc,o])=>({label:conOf(sc).name,v:o.ok/o.n,max:1,color:conOf(sc).color,sub:o.ok+' de '+o.n})),pct)}`:''}
    <p class="note">El cumplimiento sale de lo registrado en obra: cumple si al cierre de la semana la actividad está terminada o sus días cumplidos (✓ = 1, ½ = 0,5) alcanzan los días que el cliente esperaba hasta ese cierre (las ${CLI_HIST} semanas previas también cuentan). La semana en curso se mide hasta hoy. Las filas solo del cliente no entran.</p>
    <button class="ib" id="bxcli">Excel del PPC cliente</button></div></div>`}
/** Compromisos del cliente de la semana n (versión emitida para n), con la forma de las semanas congeladas (items/res por piso)
    para armar las hojas «PPC semanal» y «PPC del SC» del Excel con el mismo formato que el interno. Cumplimiento: el de cliPpc
    (obra); la causa y la mitigación de un no cumplido, las que se registraron en el plan semanal interno. null si no hay versión. */
async function cliWeekDocs(n){const L=cliVerFor(n);if(!L)return null;if(!CLVD.get(L.id)||!CLVD.get(L.id).ready)await cliLoad(L.id);const v=CLVD.get(L.id);if(!v||!v.ready)return null;
  const vset=new Set(visPisos().map(p=>p.id));const wd=weekDays(n);const started=wd[0]<=todayIso();
  const P_=started?(cliPpc(vset).W.find(o=>o.w===n)||null):null;const okOf=new Map(P_?P_.items.map(i=>[i.x.id,i.ok]):[]);
  const by=new Map();
  for(const x of v.act.values()){if(x.own)continue;const pid=cliPisoOf(v,x);if(!vset.has(pid))continue;const inW=(x.days||[]).filter(d=>d>=wd[0]&&d<=wd[5]);if(!inW.length)continue;
    let d=by.get(pid);if(!d){d={pisoId:pid,n,frozenAt:L.ts||1,items:{},res:{}};by.set(pid,d)}
    const a=v.amb.get(x.ambId)||{};const s=v.sec.get(a.sectorId)||{};const q=inW.reduce((t,dd)=>t+(+((x.qty||{})[dd])||0),0);
    d.items[x.id]={ord:(s.order||0)*1e6+(a.order||0)*1e3+(x.order||0),code:a.code||'',amb:a.name||'',act:x.name||'',und:x.und||'',q:q||null,sc:x.sc,days:inW};
    if(okOf.has(x.id)){const wi=S.wk.get(wkId(n,pid));const ir=wi&&wi.res&&wi.res[x.id];d.res[x.id]=okOf.get(x.id)?{ok:true}:{...(ir&&ir.ok===false?ir:{}),ok:false}}}
  return{label:L.label||'',started,docs:[...by.values()]}}
/** Hojas del PPC cliente (resumen por semana + detalle), para el Excel del cliente y el de Indicadores. */
function cliPpcAoa(){const vset=new Set(visPisos().map(p=>p.id));const{W}=cliPpc(vset);const p=P();
  const sum=[[`PPC DEL CLIENTE · ${p.fullName||p.name||''}`],[`Medido contra la versión emitida para cada semana · ${pisoLabel().replace(/&[^;]+;/g,'')} · al ${fmtD(todayIso())} ${todayIso().slice(0,4)}`],[],
    ['SEMANA','VERSIÓN EMITIDA','COMPROMISOS','CUMPLIDOS','PPC']];const hdr=[3];
  for(const o of W)sum.push(['S'+o.w+(o.cur?' (en curso)':''),o.ver.label||'',o.n,o.ok,o.ppc==null?'—':Math.round(o.ppc*1000)/10+'%']);
  sum.push([],['DETALLE']);hdr.push(sum.length);sum.push(['SEMANA','PISO','ÍTEM','AMBIENTE','ACTIVIDAD','SUBCONTRATISTA','DÍAS EN LA SEMANA','CUMPLIDO']);
  for(const o of W){const v=CLVD.get(o.ver.id);for(const i of o.items.slice().sort((a,b)=>(a.pid>b.pid?1:a.pid<b.pid?-1:0))){const a=v&&v.amb.get(i.x.ambId);const pi=v&&v.pis.get(i.pid);
    sum.push(['S'+o.w,pi?pi.code:'',a?a.code:'',a?a.name:'',i.x.name||'',conOf(i.x.sc).name,i.days.map(fmtS).join(' '),i.ok?'Sí':'No'])}}
  return{sum,hdr,cols:[{wch:12},{wch:30},{wch:12},{wch:26},{wch:32},{wch:16},{wch:22},{wch:10}]}}
async function cliPpcXlsx(){try{await loadXlsx();const X=window.XLSX;const hs={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F3A4D'}},alignment:{horizontal:'center',vertical:'center',wrapText:true}};
  const pc=cliPpcAoa();const ws=X.utils.aoa_to_sheet(pc.sum);ws['!cols']=pc.cols;pc.hdr.forEach(r=>{for(let c=0;c<pc.sum[r].length;c++){const k=X.utils.encode_cell({r,c});if(ws[k])ws[k].s=hs}});
  const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'PPC cliente');const buf=X.write(wb,{type:'array',bookType:'xlsx'});
  saveBlob(`${(P().code||'LPS')}_PPC_CLIENTE_${U.piso?(S.pis.get(U.piso)?.code||'')+'_':''}Sem${U.week}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
  catch(e){if(!(e&&e.code==='declined'))toast(e&&e.message?e.message:'No se pudo generar el Excel.')}}
