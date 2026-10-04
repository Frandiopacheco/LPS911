"use strict";
/* LPS 911 · Plan maestro: el nivel superior del Last Planner (diseño completo en docs/plan-maestro.md).
   Árbol de agrupadores › partidas › partida por piso › detalle, con Gantt, edición manual e hitos (con fecha fija o
   amarrados a partidas: toman su fin o su inicio). Solo lo ven y lo editan el administrador y el planner (canMP()).
   Sus datos no están en COLS (que cargan todos al entrar): se cargan con ensureMP() solo para ellos, y las reglas niegan
   la lectura a los demás. Escribe con su propia cola y su propio deshacer, porque el planner no tiene canWrite.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const canMP=()=>!!me&&(me.role==='admin'||me.role==='planner');
const MP_TIPO={wbs:'Agrupador',part:'Partida',pp:'Partida por piso',det:'Actividad de detalle',hito:'Hito'};
const MP_GRP={contractual:'Contractual',planificado:'Planificado',intermedio:'Intermedio'};

/* ---------- datos ---------- */
const MPN=new Map(),MPAR=new Map(); /* nodos vigentes y archivados */
const MPQ=new Map(); /* id → escrituras propias en cola: la foto que llega de la base no pisa la copia local */
const MAEU=[],MAER=[]; /* deshacer / rehacer del plan maestro */
let MPV=0,mpSub=null,MP_OK=false,MP_ERR=null;
function ensureMP(){if(!db||!canMP()||mpSub)return;
  mpSub=fcol('mp').onSnapshot(sn=>{const loc=new Map();for(const id of MPQ.keys())loc.set(id,mpGet(id));
    MPN.clear();MPAR.clear();sn.docs.forEach(d=>{const o={...d.data(),id:d.id};(o.arch?MPAR:MPN).set(d.id,o)});
    for(const[id,o]of loc){MPN.delete(id);MPAR.delete(id);if(o)(o.arch?MPAR:MPN).set(id,o)}
    MPV++;MP_OK=true;MP_ERR=null;if(ready&&(U.tab==='maestro'||U.tab==='hoy'))requestRender()},
   err=>{MP_ERR=(err&&err.code)||'error';MP_OK=true;if(ready)requestRender()});
  unsubs.push(stopMP)}
function stopMP(){if(mpSub)mpSub();mpSub=null;MPN.clear();MPAR.clear();MP_OK=false;MP_ERR=null;MAEU.length=0;MAER.length=0;MPED=false}
const mpGet=id=>MPN.get(id)||MPAR.get(id)||null;

/** Guarda un nodo (null = borrar; solo lo usa deshacer la creación). Envía solo los campos que cambian. */
function mpPut(id,data){const prev=mpGet(id);MPV++;MPN.delete(id);MPAR.delete(id);if(data)(data.arch?MPAR:MPN).set(id,{...clone(data),id});
  if(!db||!canMP())return Promise.resolve();
  const body=data?strip(clone(data)):null;const args=body&&prev?fsDiff(strip(prev),body,'mp'):null;if(args&&!args.length)return Promise.resolve();
  const key='mp/'+id,ref=fcol('mp').doc(id);MPQ.set(id,(MPQ.get(id)||0)+1);pending++;setStatus();
  const run=()=>!body?ref.delete():args?ref.update(...args).catch(e=>{if(e&&e.code==='not-found')return ref.set(body);throw e}):ref.set(body);
  const p=(chains[key]||Promise.resolve()).then(()=>dbCall(run)).then(()=>{lastErr=null},e=>mpErr(e))
    .finally(()=>{const n=(MPQ.get(id)||1)-1;if(n>0)MPQ.set(id,n);else MPQ.delete(id);pending--;setStatus()});
  chains[key]=p;return p}
function mpErr(e){const c=e&&e.code;lastErr=c==='permission-denied'?'Sin permiso':'Error al guardar';
  toast(c==='permission-denied'?'No se pudo guardar el plan maestro: solo lo editan el administrador y el planner.':`No se pudo guardar un cambio del plan maestro (${c||'error'}). Revisa tu conexión y vuelve a intentarlo.`);setStatus()}

/* ---------- deshacer ---------- */
const mpOp=(id,after)=>({id,before:clone(mpGet(id)),after:after?{...clone(after),id,by:me?me.email:'',t:NOW()}:null});
function mpApply(ops,label){ops=ops.filter(Boolean);if(!ops.length)return;ops.forEach(o=>mpPut(o.id,o.after));MAEU.push(ops);if(MAEU.length>100)MAEU.shift();MAER.length=0;requestRender();if(label)toast(label,'Deshacer',mpUndo)}
function mpReplay(g,from,to){let sk=0;for(const o of g){if(canon(mpGet(o.id))!==canon(o[from])){sk++;continue}mpPut(o.id,o[to])}return sk}
function mpUndo(){const g=MAEU.pop();if(!g){toast('No hay cambios del plan maestro para deshacer.');return}const sk=mpReplay(g.slice().reverse(),'after','before');MAER.push(g);requestRender();
  toast(sk?`Deshecho en parte: ${sk} cambio(s) no se revirtieron porque otra persona los modificó después`:'Cambio deshecho','Rehacer',mpRedo)}
function mpRedo(){const g=MAER.pop();if(!g)return;const sk=mpReplay(g,'before','after');MAEU.push(g);requestRender();if(sk)toast(`${sk} cambio(s) no se rehicieron porque otra persona los modificó`)}
/* Ctrl+Z / Ctrl+Y en esta pestaña deshacen el plan maestro (no el lookahead) */
document.addEventListener('keydown',e=>{if(U.tab!=='maestro'||!(e.ctrlKey||e.metaKey))return;if(e.target.closest&&e.target.closest('input,textarea,select'))return;const k=e.key.toLowerCase();
  if(k==='z'&&!e.shiftKey){e.preventDefault();e.stopPropagation();mpUndo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();e.stopPropagation();mpRedo()}},true);

/* ---------- índice: hijos, fechas acumuladas e hitos (se rehace solo cuando cambia el maestro) ---------- */
let MPI_K=-1,MPI=null;
const mpOrd=(a,b)=>(a.ord??0)-(b.ord??0)||String(a.name||'').localeCompare(String(b.name||''));
function mpIdx(){if(MPI&&MPI_K===MPV)return MPI;MPI_K=MPV;
  const kids=new Map(),hitos=[];
  for(const n of MPN.values()){if(n.tipo==='hito'){hitos.push(n);continue}const p=n.parent&&MPN.has(n.parent)&&n.parent!==n.id?n.parent:'';let L=kids.get(p);if(!L)kids.set(p,L=[]);L.push(n)}
  for(const L of kids.values())L.sort(mpOrd);
  /* un agrupador o una partida con hijos toma el menor inicio y el mayor fin de ellos */
  const span=new Map();const calc=(n,dep)=>{let s=span.get(n.id);if(s)return s;let ini=n.ini||'',fin=n.fin||'';const ks=kids.get(n.id)||[];
    if(ks.length&&dep<60){let a='',b='';for(const k of ks){const o=calc(k,dep+1);if(o.ini&&(!a||o.ini<a))a=o.ini;if(o.fin&&(!b||o.fin>b))b=o.fin}if(a)ini=a;if(b)fin=b}
    s={ini,fin,roll:ks.length>0};span.set(n.id,s);return s};
  for(const n of MPN.values())if(n.tipo!=='hito')calc(n,0);
  const hd=new Map();for(const h of hitos)hd.set(h.id,mpHitoDate(h,span));
  hitos.sort((a,b)=>(hd.get(a.id)||'9').localeCompare(hd.get(b.id)||'9')||mpOrd(a,b));
  MPI={kids,span,hitos,hd,wd:new Map()};return MPI}
/** Fecha de un hito: la fija, o la última fecha de fin (o la primera de inicio) de las partidas a las que está amarrado */
function mpHitoDate(h,span){const k=h.hk||{};if(k.modo==='amarrado'){const ini=k.campo==='ini';let r='';
    for(const id of k.nodos||[]){const s=span.get(id);if(!s)continue;const v=ini?s.ini:s.fin;if(v&&(!r||(ini?v<r:v>r)))r=v}return r}
  return k.fecha||''}
/** días hábiles entre dos fechas, ambas incluidas */
function mpWd(a,b){if(!a||!b||b<a)return 0;const I=mpIdx();const key=a+b;let n=I.wd.get(key);if(n!=null)return n;n=0;for(let x=a,i=0;x<=b&&i<4000;x=addD(x,1),i++)if(isWork(x))n++;I.wd.set(key,n);return n}
/** piso de un nodo: el de su partida por piso (el detalle lo hereda) */
function mpPiso(n){let x=n,i=0;while(x&&i++<60){if(x.tipo==='pp')return x.pisoId||'';x=MPN.get(x.parent)}return''}
function mpPath(n){const o=[];let x=MPN.get(n.parent),i=0;while(x&&i++<60){o.unshift(x.name||'');x=MPN.get(x.parent)}return o.join(' › ')}
function mpDesc(id){const I=mpIdx();const o=[];const st=[id];while(st.length){const x=st.pop();for(const k of I.kids.get(x)||[]){o.push(k.id);st.push(k.id)}}return o}
const fmtY=s=>{if(!s)return'';const[y,m,d]=s.split('-');return`${d}/${m}/${y.slice(2)}`};
const mpPisoTxt=id=>{const p=S.pis.get(id);return p?p.code:id?'¿?':''};

/* ---------- filas visibles: búsqueda, piso elegido arriba (U.piso), plegados y detalle ---------- */
function mpRows(){const I=mpIdx();const q=fold(U.mpq||'').trim();const col=new Set(U.mpCol||[]);const piso=U.piso||'';const det=!!U.mpDet;
  const match=n=>!q||fold(`${n.code||''} ${n.name||''}`).includes(q);
  const vis=new Map();
  /* visible: pasa los filtros o tiene algún descendiente que los pasa. Si un nodo coincide con la búsqueda, sus hijos
     ya no necesitan coincidir (buscar «Tabiquería» muestra sus pisos). Con un piso elegido, solo cuentan las partidas por piso de ese piso. */
  const V=(n,qok)=>{const key=n.id+(qok?'+':'-');if(vis.has(key))return vis.get(key);vis.set(key,false);let ok=false;
    if(!(n.tipo==='det'&&!det)){const qq=qok||match(n);const ks=I.kids.get(n.id)||[];
      /* con un piso elegido: la partida por piso (y su detalle) si es de ese piso; una partida sin pisos o un agrupador vacío
         no son de ningún piso en particular y siempre se ven (si no, lo recién creado desaparecía) */
      const pisoOk=!piso||((n.tipo==='pp'||n.tipo==='det')?mpPiso(n)===piso:n.tipo==='part'?!ks.some(k=>k.tipo==='pp'):!ks.length);
      ok=qq&&pisoOk;
      for(const k of ks)if(V(k,qq))ok=true}
    vis.set(key,ok);return ok};
  const out=[];const walk=(n,lv,qok)=>{if(!V(n,qok))return;const qq=qok||match(n);const ks=(I.kids.get(n.id)||[]).filter(k=>V(k,qq));const open=!!q||!col.has(n.id);
    out.push({n,lv,kids:ks.length,open});if(ks.length&&open)ks.forEach(k=>walk(k,lv+1,qq))};
  (I.kids.get('')||[]).forEach(n=>walk(n,0,false));
  const hitos=I.hitos.filter(match);return{rows:out,hitos}}

/* ---------- Gantt ---------- */
function mpRange(){const I=mpIdx();let a='',b='';const t=todayIso();
  const add=v=>{if(!v)return;if(!a||v<a)a=v;if(!b||v>b)b=v};for(const s of I.span.values()){add(s.ini);add(s.fin)}for(const d of I.hd.values())add(d);add(t);
  const dw=(pd(a).getUTCDay()+6)%7;const start=addD(a,-dw-7);const end=addD(b,21);const ppd=U.mpZ==='mes'?1.6:4;
  const days=d=>(pd(d)-pd(start))/864e5;return{start,end,ppd,W:Math.round(days(end)*ppd),x:d=>Math.round(days(d)*ppd)}}
function mpHeadGantt(G){let h='';let m=G.start.slice(0,8)+'01';
  while(m<=G.end){const nx=addD(m.slice(0,8)+'28',5).slice(0,8)+'01';const x0=Math.max(0,G.x(m)),x1=Math.min(G.W,G.x(nx));const w=x1-x0;
    if(w>0){const[y,mm]=m.split('-');h+=`<span class="maemo" style="left:${x0}px;width:${w}px">${w>34?MES[+mm-1]+(w>58?' '+y.slice(2):''):''}</span>`}m=nx}
  return`<div class="maegw" style="width:${G.W}px">${h}<i class="maetd" style="left:${G.x(todayIso())}px" title="Hoy"></i></div>`}
function mpBar(n,s,G){if(!s.ini&&!s.fin)return'';const a=s.ini||s.fin,b=s.fin||s.ini;const x=G.x(a),w=Math.max(3,G.x(addD(b,1))-x);
  const tip=`${n.name||''} · ${fmtY(a)} → ${fmtY(b)} · ${mpWd(a,b)} días hábiles`;
  return`<div class="maebar${s.roll?' sum':''}${n.tipo==='pp'?' pp':''}${n.tipo==='det'?' det':''}" style="left:${x}px;width:${w}px" title="${esc(tip)}"></div>`}

/* ---------- pantalla ---------- */
let MPED=false,MAE_SL=null,MAE_FOCUS=null;
function renderMaestro(main){ensureMP();
  if(!canMP()){main.innerHTML=`<div class="scroll"><div class="wrap"><div class="callout">El plan maestro solo lo ven el administrador y el planner.</div></div></div>`;return}
  if(!MP_OK){main.innerHTML=`<div class="scroll"><div class="wrap"><div class="callout">Cargando el plan maestro…</div></div></div>`;return}
  if(MP_ERR){main.innerHTML=`<div class="scroll"><div class="wrap"><div class="callout warnc"><b>No se pudo leer el plan maestro</b> (${esc(MP_ERR)}). ${MP_ERR==='permission-denied'?'Las reglas de seguridad de esta copia todavía no incluyen el plan maestro: se instalan al publicar.':'Revisa tu conexión y recarga la página.'}</div></div></div>`;return}
  const I=mpIdx();const{rows,hitos}=mpRows();const G=mpRange();const ed=MPED;const tx=G.x(todayIso());
  const grid=U.mpZ==='mes'?'':`background-image:linear-gradient(to right,var(--line2) 1px,transparent 1px);background-size:${7*G.ppd}px 100%`;
  const gcell=inner=>`<td class="maegc"><div class="maeg0" style="width:${G.W}px;${grid}"><i class="maetd" style="left:${tx}px"></i>${inner}</div></td>`;
  const dt=(n,f,v,canEd)=>canEd?`<input type="date" class="ci maedt" data-mf="${f}" data-id="${n.id}" data-fk="mp:${n.id}:${f}" value="${esc(v||'')}" data-o="${esc(v||'')}" aria-label="${f==='ini'?'Inicio':'Fin'}">`:`<span class="${!v?'mu':''}">${v?fmtY(v):'—'}</span>`;
  const menu=id=>ed?`<button class="maeb" data-mn="${id}" aria-label="Opciones" title="Opciones">⋮</button>`:'';
  const row=({n,lv,kids,open})=>{const s=I.span.get(n.id)||{};const leaf=!s.roll;
    const nm=ed?`<input class="ci maein" data-mf="name" data-id="${n.id}" data-fk="mp:${n.id}:name" value="${esc(n.name||'')}" data-o="${esc(n.name||'')}" aria-label="Nombre">`:`<span title="${esc(n.name||'')}">${esc(n.name||'(sin nombre)')}</span>`;
    const cd=ed?`<input class="ci maecin" data-mf="code" data-id="${n.id}" data-fk="mp:${n.id}:code" value="${esc(n.code||'')}" data-o="${esc(n.code||'')}" aria-label="Código" placeholder="—">`:esc(n.code||'');
    const ps=n.tipo==='pp'?(ed?`<select class="ci maeps" data-mf="pisoId" data-id="${n.id}" aria-label="Piso">${pisos().map(p=>`<option value="${p.id}"${p.id===n.pisoId?' selected':''}>${esc(p.code)}</option>`).join('')}${n.pisoId&&!S.pis.has(n.pisoId)?'<option selected value="">¿?</option>':''}</select>`:esc(mpPisoTxt(n.pisoId))):n.tipo==='det'?`<span class="mu">${esc(mpPisoTxt(mpPiso(n)))}</span>`:'';
    return`<tr class="maer t-${n.tipo}" data-id="${n.id}"><td class="mk0"><span class="maei" style="--lv:${lv}">${kids?`<button class="maetg" data-tg="${n.id}" aria-expanded="${open}" aria-label="${open?'Plegar':'Desplegar'}">${open?'▾':'▸'}</button>`:'<i class="maesp"></i>'}${cd}</span></td>
      <td class="mk1" style="--lv:${lv}">${nm}</td><td class="mk2">${ps}</td><td class="mk3">${dt(n,'ini',leaf?n.ini:s.ini,ed&&leaf)}</td><td class="mk4">${dt(n,'fin',leaf?n.fin:s.fin,ed&&leaf)}</td>
      <td class="mk5">${s.ini&&s.fin?mpWd(s.ini,s.fin):''}</td><td class="mk6">${menu(n.id)}</td>${gcell(mpBar(n,s,G))}</tr>`};
  const hrow=h=>{const d=I.hd.get(h.id)||'';const k=h.hk||{};const how=k.modo==='amarrado'?`amarrado al ${k.campo==='ini'?'inicio':'fin'} de ${(k.nodos||[]).length} partida${(k.nodos||[]).length===1?'':'s'}`:'fecha fija';
    const x=d?G.x(d)+Math.round(G.ppd/2):0;const tip=`${h.name||''} · ${d?fmtY(d):'sin fecha'} · ${how}${h.ref&&h.ref.fin?` · Primavera: ${fmtY(h.ref.fin)}`:''}`;
    return`<tr class="maer t-hito" data-id="${h.id}"><td class="mk0"><span class="maei" style="--lv:0"><i class="maesp"></i><span class="mu">${esc((h.ref&&h.ref.code)||'')}</span></span></td>
      <td class="mk1">${ed?`<button class="maehb" data-he="${h.id}" title="Editar hito">◆ ${esc(h.name||'(sin nombre)')}</button>`:`<span title="${esc(tip)}">◆ ${esc(h.name||'(sin nombre)')}</span>`} <small class="maegp g-${esc(h.grp||'intermedio')}">${esc(MP_GRP[h.grp]||MP_GRP.intermedio)}</small></td>
      <td class="mk2"></td><td class="mk3"><span class="mu" title="${esc(how)}">${k.modo==='amarrado'?'⛓':'📌'}</span></td><td class="mk4">${d?fmtY(d):'<span class="mu">—</span>'}</td><td class="mk5"></td><td class="mk6">${menu(h.id)}</td>
      ${gcell(d?`<i class="maedia g-${esc(h.grp||'intermedio')}" style="left:${x}px" title="${esc(tip)}"></i><span class="maehl" style="left:${x+9}px">${esc(h.name||'')}</span>`:'')}</tr>`};
  const nArch=MPAR.size;const empty=!MPN.size;
  const bar=`<div class="bar maebar0">
    <input type="search" id="maeq" placeholder="Buscar partida, piso o código" aria-label="Buscar en el plan maestro" value="${esc(U.mpq||'')}" data-fk="maeq">
    <span class="seg" aria-label="Escala"><button data-mz="sem" class="${U.mpZ!=='mes'?'on':''}">Semanas</button><button data-mz="mes" class="${U.mpZ==='mes'?'on':''}">Meses</button></span>
    <label class="chk" title="Muestra las actividades de detalle de cada partida por piso"><input type="checkbox" id="maedet"${U.mpDet?' checked':''}> Detalle</label>
    <button class="ib" data-mall="1" title="Desplegar todo">Desplegar todo</button><button class="ib" data-mall="0" title="Plegar todo">Plegar todo</button>
    <button class="ib" id="maetoday" title="Llevar el Gantt a hoy">Hoy</button>
    <span class="fsp" style="flex:1"></span>
    ${ed?`<button class="ib" id="maeadd" aria-haspopup="menu">+ Agregar ▾</button>${nArch?`<button class="ib" id="maearc" title="Lo archivado se puede recuperar">Archivados (${nArch})</button>`:''}`:''}
    <button class="ib${ed?' on':' pri'}" id="maeed" title="${ed?'Volver al modo consulta':'Habilitar la edición del plan maestro'}">${ed?'✓ Terminar edición':'✎ Editar'}</button></div>`;
  const nP=[...MPN.values()].filter(n=>n.tipo==='pp').length,nPart=[...MPN.values()].filter(n=>n.tipo==='part').length;
  const info=`<div class="maeinfo"><span><b>${nPart}</b> partida${nPart===1?'':'s'} · <b>${nP}</b> por piso · <b>${I.hitos.length}</b> hito${I.hitos.length===1?'':'s'}${U.piso?` · piso ${esc(pisoLabel())}`:''}</span><span class="mu">Solo lo ven el administrador y el planner. ${ed?'Las fechas de un agrupador o de una partida con pisos salen de sus hijos.':'Pulsa «✎ Editar» para cambiarlo.'}</span></div>`;
  const body=empty?`<div class="scroll"><div class="wrap"><div class="callout"><b>Todavía no hay plan maestro.</b> ${ed?'Créalo con «+ Agregar»: agrupadores (capítulos, especialidades), partidas, sus pisos e hitos.':'Pulsa «✎ Editar» y luego «+ Agregar» para crearlo a mano.'} La importación desde el Excel del planner y desde Primavera viene en los siguientes pasos.</div></div></div>`
    :`<div class="scroll maesc"><table class="maet${ed?' ed':''}"><thead><tr><th class="mk0">Código</th><th class="mk1">Nombre</th><th class="mk2">Piso</th><th class="mk3">Inicio</th><th class="mk4">Fin</th><th class="mk5" title="Días hábiles">Días</th><th class="mk6"></th><th class="maegh">${mpHeadGantt(G)}</th></tr></thead><tbody>
      ${hitos.length||I.hitos.length?`<tr class="maesec"><td colspan="8"><button class="maesecb" data-hoff aria-expanded="${!U.mpHitOff}">${U.mpHitOff?'▸':'▾'} Hitos <span class="mu">${hitos.length}</span></button></td></tr>${U.mpHitOff?'':hitos.map(hrow).join('')}`:''}
      <tr class="maesec"><td colspan="8"><span class="maesecb">Partidas <span class="mu">${rows.length} fila${rows.length===1?'':'s'}</span></span></td></tr>
      ${rows.map(row).join('')||`<tr><td colspan="8" class="mu" style="padding:12px">Nada coincide con la búsqueda${U.piso?' en este piso':''}.</td></tr>`}</tbody></table></div>`;
  main.innerHTML=`<div class="view mae">${bar}${empty?'':info}${body}</div>`;
  const sc=main.querySelector('.maesc');
  if(sc){if(MAE_SL==null)MAE_SL=Math.max(0,tx-260);sc.scrollLeft=MAE_SL;sc.onscroll=()=>{MAE_SL=sc.scrollLeft}}
  if(MAE_FOCUS){const f=main.querySelector(`[data-fk="mp:${CSS.escape(MAE_FOCUS)}:name"]`);MAE_FOCUS=null;if(f){f.focus();f.select();f.scrollIntoView({block:'nearest'})}}
  mpWire(main,G)}

function mpWire(main,G){
  main.oninput=e=>{const t=e.target;if(t.id==='maeq'){U.mpq=t.value;requestRender()}};
  main.onchange=e=>{const t=e.target;
    if(t.id==='maedet'){U.mpDet=t.checked;saveUI();render();return}
    const f=t.dataset.mf,id=t.dataset.id;if(!f||!id)return;const n=MPN.get(id);if(!n)return;let v=t.value;
    if(f==='name'){v=v.trim();if(!v){toast('El nombre no puede quedar vacío.');t.value=n.name||'';return}}
    if(f==='code')v=v.trim();
    if(f==='ini'||f==='fin'){if(!v){toast('Elige la fecha.');t.value=n[f]||'';return}const ini=f==='ini'?v:n.ini,fin=f==='fin'?v:n.fin;
      if(ini&&fin&&fin<ini){toast('El fin no puede ser antes del inicio.');t.value=n[f]||'';return}}
    if((n[f]||'')===v)return;t.dataset.o=v;
    mpApply([mpOp(id,{...n,[f]:v})],{name:'Nombre cambiado',code:'Código cambiado',ini:'Inicio cambiado',fin:'Fin cambiado',pisoId:'Piso cambiado'}[f])};
  main.onclick=e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tg){const s=new Set(U.mpCol||[]);s.has(b.dataset.tg)?s.delete(b.dataset.tg):s.add(b.dataset.tg);U.mpCol=[...s];saveUI();render();return}
    if(b.dataset.mz){U.mpZ=b.dataset.mz;MAE_SL=null;saveUI();render();return}
    if(b.dataset.mall!=null){U.mpCol=b.dataset.mall==='1'?[]:[...mpIdx().kids.keys()].filter(Boolean);saveUI();render();return}
    if(b.hasAttribute('data-hoff')){U.mpHitOff=!U.mpHitOff;saveUI();render();return}
    if(b.id==='maetoday'){const sc=main.querySelector('.maesc');if(sc){MAE_SL=Math.max(0,G.x(todayIso())-260);sc.scrollLeft=MAE_SL}return}
    if(b.id==='maeed'){MPED=!MPED;closePop();render();toast(MPED?'Edición activada: los cambios del plan maestro se guardan al momento (Ctrl+Z deshace).':'Modo consulta.');return}
    if(b.id==='maeadd'){mpAddMenu(b);return}
    if(b.id==='maearc'){mpArchMenu(b);return}
    if(b.dataset.mn){mpRowMenu(b,b.dataset.mn);return}
    if(b.dataset.he){mpHitoDlg(b.dataset.he);return}}}

/* ---------- agregar, ordenar, archivar ---------- */
function mpNew(tipo,parent,extra){const I=mpIdx();const sib=tipo==='hito'?I.hitos:(I.kids.get(parent||'')||[]);const ord=sib.reduce((m,k)=>Math.max(m,k.ord??0),0)+1;
  const ps=parent?I.span.get(parent):null;const t=todayIso();
  const n={tipo,parent:tipo==='hito'?'':parent||'',ord,code:'',name:{wbs:'Nuevo agrupador',part:'Nueva partida',pp:'Nuevo piso',det:'Nueva actividad',hito:'Nuevo hito'}[tipo],src:'manual',...extra};
  if(tipo==='part'||tipo==='pp'||tipo==='det'){n.ini=n.ini||(ps&&ps.ini)||t;n.fin=n.fin||(ps&&ps.fin)||wshift(n.ini,10);if(n.fin<n.ini)n.fin=n.ini}
  return{id:uid('mp'),n}}
function mpAdd(tipo,parent,extra,label){const{id,n}=mpNew(tipo,parent,extra);if(parent){const s=new Set(U.mpCol||[]);s.delete(parent);U.mpCol=[...s]}
  MAE_FOCUS=tipo==='hito'?null:id;mpApply([mpOp(id,n)],label||MP_ADDED[tipo]);return id}
const MP_ADDED={wbs:'Agrupador agregado',part:'Partida agregada',pp:'Piso agregado',det:'Actividad de detalle agregada',hito:'Hito agregado'};
function mpAddMenu(btn){openPop(btn,`<div class="ph">Agregar al plan maestro</div><button data-do="wbs">Agrupador (capítulo, especialidad…)</button><button data-do="part">Partida</button><button data-do="hito">Hito</button>`,
  {wbs:()=>mpAdd('wbs',''),part:()=>mpAdd('part',''),hito:()=>mpHitoDlg(null)})}
function mpAddPisos(btn,part){const used=new Set((mpIdx().kids.get(part)||[]).filter(k=>k.tipo==='pp').map(k=>k.pisoId));const free=pisos().filter(p=>!used.has(p.id));
  if(!free.length){toast('Esta partida ya tiene todos los pisos.');return}
  const add=L=>{const P0=MPN.get(part)||{};const sp=mpIdx().span.get(part)||{};const ops=[];let k=0;for(const p of L){const{id,n}=mpNew('pp',part,{pisoId:p.id,name:p.name,code:'',ini:sp.ini||P0.ini,fin:sp.fin||P0.fin});n.ord+=k++;ops.push(mpOp(id,n))}
    const s=new Set(U.mpCol||[]);s.delete(part);U.mpCol=[...s];mpApply(ops,`${L.length} piso${L.length===1?'':'s'} agregado${L.length===1?'':'s'} a la partida`)};
  openPop(btn,`<div class="ph">¿Qué piso?</div>${free.map(p=>`<button data-do="p" data-p="${p.id}">${esc(p.code)} · ${esc(p.name)}</button>`).join('')}${free.length>1?`<button data-do="all" class="pri">Todos los que faltan (${free.length})</button>`:''}`,
    {p:d=>add([S.pis.get(d.p)]),all:()=>add(free)})}
function mpMove(id,dir){const n=MPN.get(id);if(!n)return;const I=mpIdx();const sib=n.tipo==='hito'?I.hitos:(I.kids.get(n.parent&&MPN.has(n.parent)?n.parent:'')||[]);const i=sib.findIndex(x=>x.id===id),j=i+dir;
  if(i<0||j<0||j>=sib.length)return;const L=sib.slice();[L[i],L[j]]=[L[j],L[i]];
  /* se renumera el grupo (antes podía haber órdenes repetidos) y solo se guardan los que cambian */
  const ops=L.map((x,k)=>(x.ord??0)===k+1?null:mpOp(x.id,{...x,ord:k+1}));mpApply(ops,dir<0?'Subido':'Bajado')}
function mpArchive(id){const n=MPN.get(id);if(!n)return;const ids=[id,...mpDesc(id)];const a={t:NOW(),by:me.email,n:me.name||me.email};
  mpApply(ids.map(x=>{const o=MPN.get(x);return o?mpOp(x,{...o,arch:a}):null}),`“${n.name||MP_TIPO[n.tipo]}” archivado${ids.length>1?` con ${ids.length-1} elemento${ids.length>2?'s':''} dentro`:''}`)}
function mpRowMenu(btn,id){const n=MPN.get(id);if(!n)return;const H={up:()=>mpMove(id,-1),down:()=>mpMove(id,1),arc:()=>mpArchive(id)};let it='';
  if(n.tipo==='wbs'){it+='<button data-do="awbs">Agregar agrupador dentro</button><button data-do="apart">Agregar partida dentro</button>';H.awbs=()=>mpAdd('wbs',id);H.apart=()=>mpAdd('part',id)}
  if(n.tipo==='part'){it+='<button data-do="app">Agregar piso…</button><button data-do="adet">Agregar actividad de detalle</button>';H.app=()=>mpAddPisos(btn,id);H.adet=()=>mpAdd('det',id)}
  if(n.tipo==='pp'){it+='<button data-do="adet">Agregar actividad de detalle</button>';H.adet=()=>mpAdd('det',id)}
  if(n.tipo==='hito'){it+='<button data-do="ed">Editar hito…</button>';H.ed=()=>mpHitoDlg(id)}
  openPop(btn,`<div class="ph">${esc(MP_TIPO[n.tipo]||'')}: ${esc(n.name||'')}</div>${it}<button data-do="up">Subir</button><button data-do="down">Bajar</button><button data-do="arc">Archivar${n.tipo!=='hito'&&mpDesc(id).length?' (con lo que tiene dentro)':''}</button>`,H)}
function mpArchMenu(btn){/* se recupera lo archivado de primer nivel (su padre sigue vigente), junto con lo que se archivó con él */
  const top=[...MPAR.values()].filter(n=>!n.parent||!MPAR.has(n.parent)).sort((a,b)=>((b.arch&&b.arch.t)||0)-((a.arch&&a.arch.t)||0)).slice(0,40);
  openPop(btn,`<div class="ph">Archivados (se pueden recuperar)</div>${top.map(n=>`<button data-do="r" data-id="${n.id}">↺ ${esc(MP_TIPO[n.tipo]||'')}: ${esc(n.name||'')}<small class="mu"> · ${esc((n.arch&&n.arch.n)||'')} ${n.arch&&n.arch.t?fmtD(ldt(n.arch.t)):''}</small></button>`).join('')}`,
    {r:d=>{const n=MPAR.get(d.id);if(!n)return;const t=n.arch&&n.arch.t;const ids=[n.id];const st=[n.id];
      while(st.length){const x=st.pop();for(const o of MPAR.values())if(o.parent===x&&o.arch&&o.arch.t===t){ids.push(o.id);st.push(o.id)}}
      mpApply(ids.map(x=>{const o={...MPAR.get(x)};delete o.arch;return mpOp(x,o)}),`“${n.name||''}” recuperado`)}})}

/* ---------- hitos: fecha fija o amarrados a partidas ---------- */
function mpHitoDlg(id){const h=id?MPN.get(id):null;const k=(h&&h.hk)||{modo:'amarrado',campo:'fin',nodos:[]};let modo=k.modo||'fijo';const sel=new Set(k.nodos||[]);
  const I=mpIdx();const cand=[];const walk=(n,lv)=>{if(n.tipo==='det')return;cand.push({n,lv});for(const c of I.kids.get(n.id)||[])walk(c,lv+1)};(I.kids.get('')||[]).forEach(n=>walk(n,0));
  const res=()=>{const tmp={hk:{modo,campo:($('#mhk')||{}).value||'fin',nodos:[...sel],fecha:($('#mhf')||{}).value||''}};const d=mpHitoDate(tmp,I.span);return d?fmtY(d):'—'};
  const lst=cand.map(({n,lv})=>`<label class="chk maehk" style="--lv:${lv}" data-q="${esc(fold(`${n.code||''} ${n.name||''} ${mpPath(n)}`))}"><input type="checkbox" value="${n.id}"${sel.has(n.id)?' checked':''}> <span>${esc(n.name||'')}${n.tipo==='pp'?` <small class="mu">${esc(mpPisoTxt(n.pisoId))}</small>`:''}</span><small class="mu">${fmtY((I.span.get(n.id)||{}).fin)}</small></label>`).join('');
  lqModal(`<div class="lqh"><b>${h?'Editar hito':'Nuevo hito'}</b><span>Un hito amarrado toma su fecha de las partidas: si cambian, el hito se mueve solo.</span></div>
    <label>Nombre<input id="mhn" value="${esc((h&&h.name)||'')}" placeholder="Ej.: Fin de albañilería" maxlength="120"></label>
    <div class="maedlg2"><label>Grupo<select id="mhg">${Object.entries(MP_GRP).map(([v,t])=>`<option value="${v}"${((h&&h.grp)||'intermedio')===v?' selected':''}>${t}</option>`).join('')}</select></label>
      <label>Código en Primavera <input id="mhc" value="${esc((h&&h.ref&&h.ref.code)||'')}" placeholder="Opcional (A2240)"></label></div>
    <span class="seg" id="mhm"><button type="button" data-m="amarrado" class="${modo==='amarrado'?'on':''}">Amarrado a partidas</button><button type="button" data-m="fijo" class="${modo==='fijo'?'on':''}">Fecha fija</button></span>
    <div id="mhfx"${modo==='fijo'?'':' hidden'}><label>Fecha<input type="date" id="mhf" value="${esc(k.fecha||'')}"></label></div>
    <div id="mham"${modo==='amarrado'?'':' hidden'}><label>Toma<select id="mhk"><option value="fin"${k.campo!=='ini'?' selected':''}>el fin (la última fecha de las elegidas)</option><option value="ini"${k.campo==='ini'?' selected':''}>el inicio (la primera fecha de las elegidas)</option></select></label>
      <input type="search" id="mhq" placeholder="Buscar partida o piso…" aria-label="Buscar partida">
      <div class="maehlst">${lst||'<p class="mu">Todavía no hay partidas en el plan maestro.</p>'}</div></div>
    <p class="maehres">Fecha del hito: <b id="mhres">${res()}</b></p>
    <div class="maedlgb">${h?'<button class="ib" type="button" data-mharc>Archivar</button>':''}<span style="flex:1"></span><button class="ib" type="button" data-lqx>Cancelar</button><button class="ib pri" type="button" data-mhok>Guardar</button></div>`,
   e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.m){modo=b.dataset.m;$$('#mhm button').forEach(x=>x.classList.toggle('on',x===b));$('#mhfx').hidden=modo!=='fijo';$('#mham').hidden=modo!=='amarrado';$('#mhres').textContent=res();return}
    if(b.hasAttribute('data-mharc')){lqClose();mpArchive(id);return}
    if(b.hasAttribute('data-mhok')){const name=$('#mhn').value.trim();if(!name){toast('Escribe el nombre del hito.');return}
      const hk=modo==='fijo'?{modo,fecha:$('#mhf').value}:{modo,campo:$('#mhk').value,nodos:[...sel].filter(x=>MPN.has(x))};
      if(modo==='fijo'&&!hk.fecha){toast('Elige la fecha del hito.');return}if(modo==='amarrado'&&!hk.nodos.length){toast('Marca al menos una partida.');return}
      const code=$('#mhc').value.trim();const ref={...((h&&h.ref)||{})};if(code)ref.code=code;else delete ref.code;
      const base=h||mpNew('hito','',{}).n;const nid=id||uid('mp');const nx={...base,tipo:'hito',parent:'',name,grp:$('#mhg').value,hk};if(Object.keys(ref).length)nx.ref=ref;else delete nx.ref;
      lqClose();mpApply([mpOp(nid,nx)],h?'Hito guardado':'Hito agregado')}},
   e=>{const t=e.target;if(t.type==='checkbox'&&t.closest('.maehk')){t.checked?sel.add(t.value):sel.delete(t.value)}const r=$('#mhres');if(r)r.textContent=res()});
  const q=$('#mhq');if(q)q.oninput=()=>{const v=fold(q.value).trim();$$('.maehk').forEach(l=>{l.hidden=!!v&&!l.dataset.q.includes(v)})}}

/* ---------- tarjeta en Hoy ---------- */
function mpHoyCard(){if(!canMP())return null;ensureMP();if(!MP_OK)return null;const I=mpIdx();const t=todayIso();const nx=I.hitos.filter(h=>(I.hd.get(h.id)||'')>=t).slice(0,3);
  return{k:'mp',title:'Plan maestro',n:0,tone:'',sub:'',items:[],go:'maestro',goLabel:'Abrir el plan maestro',
    empty:!MPN.size?'Todavía no hay plan maestro cargado.':nx.length?'Próximos hitos: '+nx.map(h=>`${h.name} (${fmtD(I.hd.get(h.id))})`).join(' · '):'No hay hitos por venir.'}}
