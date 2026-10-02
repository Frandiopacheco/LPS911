"use strict";
/* LPS 911 · Versión para el cliente.
   El programa interno es uno solo (con él se trabaja, se registra y se mide el PPC diario). La versión cliente se calcula:
   fecha interna + holgura en días hábiles. La holgura se define para toda la obra, un piso, un sector, un ambiente o una
   actividad, y manda la más específica. Cada semana se «emite» una foto de la versión cliente: eso es lo que se envía y
   contra eso se mide el PPC del cliente. Si la interna pasa la fecha comunicada, se avisa (holgura consumida).
   Solo la ven el administrador y los editores (reglas: cli, clidx, cliver).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

let CLIB=null,cliBufSub=null,cliIdxSub=null,cliErr=null,cliCache=null,CLI_INT=null,cliLateCache=null;
const CLX=new Map();   // versiones emitidas (índice)
const CLVD=new Map();  // versiones emitidas ya leídas: id → {ready,pis,sec,amb,act}
const canCli=()=>!!me&&!!db&&(me.role==='admin'||me.role==='editor')&&!PM();
const BUF_LV={x:'la actividad',a:'el ambiente',s:'el sector',p:'el piso',all:'toda la obra'};

function ensureCli(){if(!canCli()||cliBufSub)return;
  cliBufSub=fcol('cli').doc('buf').onSnapshot(d=>{CLIB=d.exists?d.data():{};cliErr=null;cliCache=null;if(ready)requestRender()},
    e=>{cliErr=e&&e.code||'error';CLIB={};if(ready)requestRender()});
  cliIdxSub=fcol('clidx').onSnapshot(sn=>{CLX.clear();sn.docs.forEach(d=>CLX.set(d.id,{...d.data(),id:d.id}));cliLateCache=null;const L=cliLast();if(L)cliLoad(L.id);if(ready)requestRender()},()=>{});
  unsubs.push(()=>{if(cliBufSub)cliBufSub();if(cliIdxSub)cliIdxSub();cliBufSub=cliIdxSub=null;CLIB=null;CLX.clear();CLVD.clear();cliCache=cliLateCache=null;U.cliv=false;U.cliVer=''})}

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
/** Todas las actividades con sus fechas para el cliente (se recalcula solo si cambian las actividades o las holguras). */
function cliActs(){if(cliCache&&cliCache.src===S.act&&cliCache.b===CLIB)return cliCache.m;const m=new Map();for(const[id,x]of S.act)m.set(id,cliShift(x));cliCache={src:S.act,b:CLIB,m};return m}

/* ---------- versiones emitidas ---------- */
const cliLast=()=>[...CLX.values()].sort((a,b)=>b.ts-a.ts)[0]||null;
async function cliLoad(id){if(CLVD.has(id)||!db)return;const v=CLX.get(id);if(!v)return;const o={ready:false,pis:new Map(),sec:new Map(),amb:new Map(),act:new Map()};CLVD.set(id,o);
  try{for(const pid of Object.keys(v.pisos||{})){const d=await fcol('cliver').doc(id+'__'+pid).get();if(!d.exists)continue;const x=d.data();const sn=JSON.parse(x.json||'{}');
      o.pis.set(pid,{...x.piso,id:pid});for(const[k,z]of Object.entries(sn.secs||{}))o.sec.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.ambs||{}))o.amb.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.acts||{}))o.act.set(k,{...z,id:k})}
    o.ready=true}catch(err){CLVD.delete(id);toast('No se pudo abrir la versión emitida: '+(err.code||err.message))}
  cliLateCache=null;gridRows=null;if(ready)requestRender()}
async function cliEmit(){if(!canCli())return;const pis=pisos();if(!pis.length)return;
  const lab=`Emitida · sem ${curWeek()} · ${fmtD(todayIso())}`;
  if(!confirm(`Se guardará la versión para el cliente tal como se ve ahora («${lab}»). Contra ella se medirá el PPC del cliente desde la próxima semana. ¿Emitir?`))return;
  const id='c-'+NOW().toString(36);const M=cliActs();const idx={label:lab,ts:NOW(),date:todayIso(),week:curWeek(),by:me.email,byName:me.name||me.email,buf:CLIB||{},pisos:{}};const docs=[];
  for(const p of pis){const sn=snapPiso(p.id);for(const k of Object.keys(sn.acts)){const c=M.get(k);if(c){sn.acts[k].days=c.days||[];sn.acts[k].qty=c.qty||{}}}
    idx.pisos[p.id]={code:p.code,name:p.name,order:p.order||0,acts:Object.keys(sn.acts).length};docs.push([id+'__'+p.id,{verId:id,pisoId:p.id,piso:strip(p),json:JSON.stringify(sn)}])}
  toast('Emitiendo la versión del cliente…');
  try{for(let i=0;i<docs.length;i+=8){const b=db.batch();docs.slice(i,i+8).forEach(([k,v])=>b.set(fcol('cliver').doc(k),v));await b.commit()}
    await fcol('clidx').doc(id).set(idx);toast(`Versión «${lab}» emitida. Ya puedes exportar su Excel.`)}
  catch(err){toast('No se pudo emitir: '+(err.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(err.code||err.message)))}}

/* ---------- holgura consumida: la interna ya termina después de lo comunicado al cliente ---------- */
function cliLate(){if(!canCli())return null;const L=cliLast();const v=L&&CLVD.get(L.id);if(!v||!v.ready)return null;
  if(cliLateCache&&cliLateCache.src===S.act&&cliLateCache.v===L.id)return cliLateCache.m;const m=new Map();
  for(const[id,c]of v.act){const x=S.act.get(id);if(!x||DONE.has(id))continue;const cd=c.days||[],xd=x.days||[];if(!cd.length||!xd.length)continue;
    const ce=cd[cd.length-1],xe=xd.slice().sort().pop();if(xe>ce)m.set(id,{end:xe,cli:ce,w:L.week})}
  cliLateCache={src:S.act,v:L.id,m};return m}

/* ---------- holguras: ventana para definirlas ---------- */
function bufDialog(btn,lv,id,label){if(!canCli())return;const B=CLIB||{};const own=lv==='all'?(B.all??null):(B[lv]&&Object.prototype.hasOwnProperty.call(B[lv],id)?B[lv][id]:null);
  const inh=lv==='all'?0:bufAt(lv,id,null,true).n;
  openPop(btn,`<div class="ph">Holgura para el cliente · ${esc(label)}</div><div class="ptx">Días hábiles que se suman a las fechas internas en la versión que se envía al cliente. Manda la holgura más específica (actividad › ambiente › sector › piso › obra).${lv!=='all'?` Si no defines una, usa <b>+${inh}</b> del nivel superior.`:''}</div>
    <div class="qrow"><input type="number" id="bfn" min="0" max="20" value="${own??inh}" style="width:64px" aria-label="Días hábiles"><span class="mu">día(s) hábil(es)</span><button data-do="ok">Guardar</button></div>
    ${lv!=='all'&&own!=null?'<button data-do="clr">Usar la del nivel superior</button>':''}`,
    {ok:()=>{const n=Math.max(0,Math.min(20,parseInt(($('#bfn')||{}).value,10)||0));bufSave(lv,id,n,`Holgura de ${label}: +${n}`)},clr:()=>bufSave(lv,id,null,`Holgura de ${label}: la del nivel superior`)});
  setTimeout(()=>{const i=$('#bfn');if(i){i.focus();i.select();i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#pop [data-do="ok"]')?.click()}}}},0)}
function bufSave(lv,id,n,msg){const B=JSON.parse(JSON.stringify(CLIB||{}));if(lv==='all')B.all=n||0;else{B[lv]=B[lv]||{};if(n==null)delete B[lv][id];else B[lv][id]=n}
  B.by=me.email;B.ts=NOW();CLIB=B;cliCache=null;requestRender();
  fcol('cli').doc('buf').set(B).then(()=>toast(msg)).catch(err=>toast('No se pudo guardar la holgura: '+(err.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(err.code||err.message))))}
/* botón con la holgura en las filas de la vista cliente (+n; resaltado si está definida en ese nivel) */
function cliBufBtn(lv,id,x){const r=bufAt(lv,id,x);const own=r.lv===lv;const t={x:'esta actividad',a:'este ambiente',s:'este sector',p:'este piso'}[lv];
  return`<button class="clb${own?' own':''}" data-buf="${lv}" data-bid="${esc(id)}" title="Holgura de ${t}: +${r.n} día${r.n===1?'':'s'} hábil${r.n===1?'':'es'}${own?'':' (heredada de '+BUF_LV[r.lv]+')'}. Clic para cambiarla.">+${r.n}</button>`}
function cliBufClick(b){const lv=b.dataset.buf,id=b.dataset.bid;let label='';
  if(lv==='x'){const x=S.act.get(id);label='la actividad '+(x&&x.name||'')}else if(lv==='a'){const a=S.amb.get(id);label='el ambiente '+(a&&a.code||'')}
  else if(lv==='s'){const s=S.sec.get(id);label='el sector '+(s&&s.code||'')}else{const p=S.pis.get(id);label='el piso '+(p&&p.code||'')}
  bufDialog(b,lv,id,label)}
const bufKbd=(lv,id)=>{const B=CLIB||{};const own=B[lv]&&Object.prototype.hasOwnProperty.call(B[lv],id)?B[lv][id]:null;return own!=null?`<kbd>+${own}</kbd>`:''};

/* ---------- vista cliente en el Lookahead ---------- */
function cliRenderLook(main){const v=U.cliVer?CLVD.get(U.cliVer):null;if(U.cliVer&&!v)cliLoad(U.cliVer);
  const cw=canWrite;let un;
  if(v&&v.ready){CLI_INT=null;un=swapVer(v)}else{const o=S.act;CLI_INT=o;S.act=cliActs();un=()=>{S.act=o}}
  canWrite=false;try{renderLookInner(main)}finally{canWrite=cw;un();CLI_INT=null}
  cliBanner()}
function cliBanner(){const el=$('#cliban');if(!el)return;if(!U.cliv||!canCli()){if(el.innerHTML){el.innerHTML='';el.dataset.h=''}return}
  const B=CLIB||{};const L=cliLast();const late=cliLate();const vers=[...CLX.values()].sort((a,b)=>b.ts-a.ts);
  const h=`<div class="cliban"><div class="clit"><b>Vista cliente</b><span>${U.cliVer?'Versión emitida (solo lectura)':'Programa interno + holgura. Las marcas grises son las fechas internas.'}${cliErr?` · <span class="bad">no se pudo leer la holgura (${esc(cliErr)})</span>`:''}</span></div>
    <label class="clig">Holgura general <button class="ib" data-cb="all">+${+B.all||0} día${(+B.all||0)===1?'':'s'}</button></label>
    <select class="tin" id="cliver" aria-label="Versión del cliente"><option value="">Actual (con holguras)</option>${vers.map(v=>`<option value="${esc(v.id)}"${U.cliVer===v.id?' selected':''}>${esc(v.label)}</option>`).join('')}</select>
    ${late&&late.size?`<span class="clil" title="Actividades cuya fecha interna ya pasa la fecha emitida al cliente">⚑ ${late.size} pasan la fecha del cliente</span>`:''}
    <span class="fsp"></span><button class="ib" data-cb="xls">Exportar Excel cliente</button>${U.cliVer?'':'<button class="ib pri" data-cb="emit">Emitir al cliente</button>'}
    <button class="ib" data-cb="x" title="Volver al programa interno">Volver a la interna</button></div>`;
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}
  el.onclick=e=>{const b=e.target.closest('[data-cb]');if(!b)return;const k=b.dataset.cb;
    if(k==='all')bufDialog(b,'all','all','toda la obra');else if(k==='emit')cliEmit();else if(k==='xls')exportXlsx();else if(k==='x'){U.cliv=false;U.cliVer='';gridRows=null;requestRender()}};
  el.onchange=e=>{if(e.target.id==='cliver'){U.cliVer=e.target.value;if(U.cliVer)cliLoad(U.cliVer);gridRows=null;requestRender()}}}
function cliToggle(){if(!canCli())return;ensureCli();U.cliv=!U.cliv;U.cliVer='';if(U.cliv){U.ver=''}gridRows=null;requestRender()}

/* ---------- PPC del cliente: contra la versión emitida ----------
   Semana n: manda la última versión emitida hasta el lunes de esa semana. Compromiso = actividad con días en la semana n
   según esa versión. Se cumple si al cierre de la semana la actividad está terminada, o si los días cumplidos en campo
   (✓ = 1, ½ = 0,5) desde el inicio de la ventana alcanzan los días que el cliente esperaba hasta ese cierre. */
const CLI_PW=6,CLI_HIST=4;
function cliVerFor(w){const mon=weekDays(w)[0];let best=null;for(const v of CLX.values())if(v.date<=mon&&(!best||v.ts>best.ts))best=v;return best}
const cliPpcFrom=()=>weekStart(U.week-CLI_PW+1-CLI_HIST);
function cliPisoOf(v,x){const a=v.amb.get(x.ambId);const s=a&&v.sec.get(a.sectorId);return s?s.pisoId:''}
function cliPpc(vset){const F=cliPpcFrom();const today=todayIso();
  /* días cumplidos por actividad (registro del ingeniero; si no hay, el cierre del capataz) */
  const got=new Map();const add=(aid,d,st)=>{const v=st==='ok'?1:st==='partial'?.5:0;if(!v)return;let L=got.get(aid);if(!L)got.set(aid,L=[]);L.push([d,v])};
  const seen=new Set();for(const doc of DAY.values()){if(doc.date<F)continue;for(const[aid,rc]of Object.entries(doc.recs||{})){if(!rc||!rc.status)continue;seen.add(doc.date+'_'+aid);add(aid,doc.date,rc.status)}}
  for(const[k,lv]of LIVE){const c=lv&&lv.close;if(!c||!c.status||seen.has(k))continue;const d=k.slice(0,10);if(d<F)continue;add(k.slice(11),d,c.status)}
  const W=[];let loading=false;
  for(let w=U.week-CLI_PW+1;w<=U.week;w++){const wd=weekDays(w);if(wd[0]>today)continue;const L=cliVerFor(w);if(!L)continue;const v=CLVD.get(L.id);if(!v||!v.ready){cliLoad(L.id);loading=true;continue}
    const end=wd[5],cur=end>=today;const items=[];
    for(const x of v.act.values()){const pid=cliPisoOf(v,x);if(!vset.has(pid))continue;const cd=x.days||[];const inW=cd.filter(d=>d>=wd[0]&&d<=end);if(!inW.length)continue;
      const need=cd.filter(d=>d>=F&&d<=end).length;const dn=DONE.get(x.id);const g=(got.get(x.id)||[]).reduce((s,[d,q])=>d<=end?s+q:s,0);
      const ok=!!(dn&&dn<=end)||g>=need;items.push({x,pid,days:inW,need,got:g,ok})}
    const n=items.length,okN=items.filter(i=>i.ok).length;W.push({w,ver:L,n,ok:okN,ppc:n?okN/n:null,cur,items})}
  return{W,loading}}
function cliPpcCard(vset){if(!canCli())return'';ensureCli();if(!CLX.size)return`<div class="card"><h2>PPC del cliente <span class="sub">contra la versión emitida</span></h2><div class="pad"><div class="empty">Aún no hay versiones emitidas al cliente. Se emiten desde el Lookahead › <b>Vista cliente</b> › <b>Emitir al cliente</b>.</div></div></div>`;
  ensureDaily(cliPpcFrom());const{W,loading}=cliPpc(vset);const sel=W.find(o=>o.w===U.week);
  const scs={};if(sel)for(const i of sel.items){const o=scs[i.x.sc]=scs[i.x.sc]||{n:0,ok:0};o.n++;if(i.ok)o.ok++}
  const bar=v=>v==null?'<span class="mu">—</span>':`<span class="pbar"><i style="width:${Math.round(v*100)}%"></i></span><b>${pct(v)}</b>`;
  return`<div class="card"><h2>PPC del cliente <span class="sub">contra la versión emitida · lo que se le informa · solo administrador y editores</span></h2><div class="pad">
    ${loading?'<p class="note">Cargando versiones emitidas…</p>':''}
    ${W.length?`<div class="tscroll"><table class="t ctab rt"><thead><tr><th>Semana</th><th>Versión emitida</th><th class="r">Compromisos</th><th class="r">Cumplidos</th><th>PPC cliente</th><th>PPC interno</th></tr></thead><tbody>
      ${W.map(o=>{const pi=ppcWeekAgg(o.w,vset);return`<tr${o.w===U.week?' class="on"':''}><td data-l="Semana"><b>S${o.w}</b>${o.cur?' <span class="mu">en curso</span>':''}</td><td class="wrapc mu" data-l="Versión">${esc(o.ver.label||'')}</td><td class="r" data-l="Compromisos">${o.n}</td><td class="r ok" data-l="Cumplidos">${o.ok}</td><td data-l="PPC cliente">${bar(o.ppc)}</td><td data-l="PPC interno">${bar(pi?pi.ppc:null)}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Ninguna semana de este periodo tiene una versión emitida vigente.</div>'}
    ${sel&&Object.keys(scs).length?`<h3 class="clih">Semana ${U.week} por subcontratista</h3>${svgBarsH(Object.entries(scs).sort((a,b)=>b[1].ok/b[1].n-a[1].ok/a[1].n).map(([sc,o])=>({label:conOf(sc).name,v:o.ok/o.n,max:1,color:conOf(sc).color,sub:o.ok+' de '+o.n})),pct)}`:''}
    <p class="note">Cumple si al cierre de la semana la actividad está terminada o sus días cumplidos en campo (✓ = 1, ½ = 0,5) alcanzan los días que el cliente esperaba hasta ese cierre. Se cuentan desde la semana ${U.week-CLI_PW+1-CLI_HIST}.</p>
    <button class="ib" id="bxcli">Excel del PPC cliente</button></div></div>`}
/** Hojas del PPC cliente (resumen por semana + detalle), para el Excel del cliente y el de Indicadores. */
function cliPpcAoa(){const vset=new Set(visPisos().map(p=>p.id));const{W}=cliPpc(vset);const p=P();
  const sum=[[`PPC DEL CLIENTE · ${p.fullName||p.name||''}`],[`Medido contra la versión emitida vigente cada semana · ${pisoLabel().replace(/&[^;]+;/g,'')} · al ${fmtD(todayIso())} ${todayIso().slice(0,4)}`],[],
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
