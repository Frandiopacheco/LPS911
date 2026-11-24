"use strict";
/* LPS 911 · Módulo Avance (24-11-2026, decidido con el dueño; docs/ia/avance.md): avance físico de partidas de acabados por ambiente.
   Módulo aparte (U.mod==='ava'), no toca el lookahead, el plan diario ni el PPC; usa los pisos y ambientes de Last Planner por su id.
   - avp/{id}: partida {nom, und, sum (controla llegadas), ubi:[nombres], et:[{id,nom,peso}], items:{id:{cod,des,ord}}, peso, glob, d0, d1,
     corte, ord, eq (equivalencias de importación), by, n, t, arch?}.
   - avm/{partida}_{piso}: metrado {p, piso, r:{filaId:{it, amb, ub, q, an, arch?}}, ll:{filaId:llegado}}. La fila tiene id propio:
     corregir el metrado no descuelga el avance. `an` = nombre del ambiente al cargar (se muestra si el ambiente ya no existe).
   - ava/{partida}_{piso}_{lunes|ini}: avance de una semana {p, piso, w, c:{fecha|'ini':{filaId:{etapaId:cantidad}}}, log:[{d,r,e,q,a,by,n,t}]}.
     Cada celda se escribe sola (set con merge): dos personas en celdas distintas no se pisan. `log` es el historial por celda.
   El cálculo está en avance-calc.js (funciones puras). */
const AVP=new Map(),AVM=new Map(),AVD=new Map();let avUnP=null,avUnD=[],avSubP='',avOk=false;
const AV={e:'',cel:null,day:'',pc:null,ambC:new Set(),wkO:null,key:'',amb:'',v:0,cv:-1,rows:null,ex:null,pend:false,dok:0};
const AV_UND=['und','m²','ml','m','m³','kg','pto','glb','jgo'];
const avF=n=>Number(+n||0).toLocaleString('es-PE',{maximumFractionDigits:2});
const avE=n=>{const v=Math.round((+n||0)*100)/100;return v?String(v):''};/* texto de una celda editable: sin separador de miles */
const avPc=v=>Math.round((+v||0)*100)+' %';
const avBar=(v,c)=>`<span class="avpb${c?' '+c:''}"><i style="width:${Math.max(0,Math.min(100,v*100)).toFixed(0)}%"></i></span>${avPc(v)}`;
const avWho=()=>({by:me.email||'',n:me.name||'',t:NOW()});
Object.assign(BNI,{areg:SVG('<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M9 9.5v10M14.5 9.5v10"/>')});

/* ---------- datos ---------- */
function ensureAv(){if(!db||avUnP||!me||!canAva())return;
  const open=()=>{avUnP=fcol('avp').onSnapshot(sn=>{snapOk('avp');AVP.clear();sn.docs.forEach(d=>AVP.set(d.id,{...d.data(),id:d.id}));avOk=true;if(U.mod==='ava')snapRender(sn)},
    err=>{avUnP=null;snapFail('avp',err,()=>{if(me&&canAva())open()})})};
  open();unsubs.push(avStop)}
function avStop(){if(avUnP)try{avUnP()}catch(e){}avUnP=null;avUnD.forEach(f=>{try{f()}catch(e){}});avUnD=[];avSubP='';avOk=false;AVP.clear();AVM.clear();AVD.clear();AV.v++}
/** metrado y avance de UNA partida (la elegida): se reabre al cambiar de partida */
function avSubData(pid){if(avSubP===pid)return;avUnD.forEach(f=>{try{f()}catch(e){}});avUnD=[];AVM.clear();AVD.clear();AV.v++;AV.dok=0;avSubP=pid;if(!pid||!db)return;
  const mk=(col,M,bit)=>{const open=()=>{if(avSubP!==pid)return;const un=fcol(col).where('p','==',pid).onSnapshot(sn=>{if(avSubP!==pid)return;snapOk(col+'_p');M.clear();sn.docs.forEach(d=>M.set(d.id,{...d.data(),id:d.id}));AV.v++;AV.dok|=bit;if(U.mod==='ava')snapRender(sn)},
    err=>{snapFail(col+'_p',err,open)});avUnD.push(un)};open()};
  mk('avm',AVM,1);mk('ava',AVD,2)}
const avParts=()=>[...AVP.values()].filter(p=>!p.arch).sort((a,b)=>(a.ord||0)-(b.ord||0)||String(a.nom).localeCompare(String(b.nom),'es'));
function avCur(){let p=AVP.get(U.avP);if(!p||p.arch){p=avParts()[0]||null;if(avOk)U.avP=p?p.id:''}return p}
/** filas y ejecutado de la partida en curso, armados una vez por cambio de datos */
function avData(){if(AV.cv===AV.v&&AV.rows)return AV;const rows=[],ex={};
  AVM.forEach(m=>{const ll=m.ll||{},R=m.r||{};for(const id in R){const r=R[id];if(!r||r.arch)continue;rows.push({id,piso:m.piso,it:r.it,amb:r.amb,ub:r.ub||'',q:+r.q||0,ll:+ll[id]||0,an:r.an||''})}});
  AVD.forEach(d=>{const c=d.c||{};for(const f in c){const R=c[f]||{};for(const rid in R){const o=R[rid]||{};for(const e in o)((ex[rid]=ex[rid]||{})[e]=ex[rid][e]||{})[f]=+o[e]||0}}});
  AV.rows=rows;AV.ex=ex;AV.cv=AV.v;return AV}
const avAmb=id=>S.amb.get(id)||ARCH.amb.get(id)||null;
const avAmbN=r=>{const a=avAmb(r.amb);return a?(a.name||a.code||r.an||'Ambiente'):(r.an?r.an+' (ya no existe)':'Ambiente eliminado')};
const avIt=(p,r)=>(p.items||{})[r.it]||{cod:'?',des:'(ítem eliminado)'};
function avSort(p,rows){const key=r=>{const a=avAmb(r.amb),s=a&&(S.sec.get(a.sectorId)||ARCH.sec.get(a.sectorId));return[(s&&s.order)||0,a?(a.order||0):9e9,avAmbN(r),r.amb,(avIt(p,r).ord)||0,avIt(p,r).cod,r.ub]};
  return rows.map(r=>[key(r),r]).sort((A,B)=>{for(let i=0;i<7;i++){const a=A[0][i],b=B[0][i];if(a!==b)return typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'es',{numeric:true})}return 0}).map(x=>x[1])}
const avMon=d=>weekStart(weekOf(d));
/** semanas (lunes a domingo) del rango de la partida */
function avWeeks(p){const t=todayIso();const d0=p.d0||addD(t,-7),d1=p.d1&&p.d1>=d0?p.d1:addD(d0,41);const W=[];for(let m=avMon(d0);m<=d1&&W.length<104;m=addD(m,7))W.push({m,n:weekOf(m),days:[0,1,2,3,4,5,6].map(i=>addD(m,i))});return{W,d0,d1,t}}
const avEts=p=>Array.isArray(p.et)?p.et:[];
const avEt=p=>{const L=avEts(p);return L.find(e=>e.id===AV.e)||L[0]||null};
const avMaxAcc=(p,ex,r)=>Math.max(0,...avEts(p).map(e=>avAcc(ex,r.id,e.id)));

/* ---------- pantalla ---------- */
function renderAReg(main){ensureAv();const p=avCur();avSubData(p?p.id:'');
  /* si alguien está escribiendo en una celda y llega un dato, no se redibuja encima: se redibuja al salir de la celda */
  const ae=document.activeElement,ed=ae&&ae.classList&&ae.classList.contains('aved')&&main.contains(ae);
  if(ed&&ae.textContent.trim()!==(ae.dataset.o||'')){AV.pend=true;return}
  const fk=ed?ae.dataset.k:null,box=main.querySelector('.avbox'),st=box?[box.scrollTop,box.scrollLeft]:null;
  if(AV.cel==null)AV.cel=isMob();const cfg=avaCfg(),parts=avParts();
  let h=`<div class="scroll"><div class="avpage">`;
  if(!avOk)h+=`<div class="empty">Cargando partidas…</div>`;
  else if(!p)h+=`<div class="empty"><b>Todavía no hay partidas.</b><br>${cfg?'Crea la primera desde una plantilla (Mobiliario, Pintura, Enchape, Cubículos) o en blanco.<br><br><button class="ib pri" data-av="new">＋ Partida</button>':'El administrador o un ingeniero de producción las crea.'}</div>`;
  else{const D=avData(),ets=avEts(p);if(AV.key!==p.id){AV.key=p.id;AV.pc=null;AV.wkO=null;AV.ambC=new Set();AV.amb='';AV.e=''}
    if(AV.e!=='*'&&!ets.find(e=>e.id===AV.e))AV.e=ets[0]?ets[0].id:'';if(AV.cel&&AV.e==='*')AV.e=ets[0]?ets[0].id:'';
    const ps=pisos(),rows=D.rows.filter(r=>S.pis.has(r.piso)||ARCH.pis.has(r.piso));
    h+=`<div class="avbar"><select class="tin" id="avp" aria-label="Partida">${parts.map(x=>`<option value="${esc(x.id)}"${x.id===p.id?' selected':''}>${esc(x.nom)}</option>`).join('')}</select>
      <select class="tin" id="avpiso" aria-label="Piso"><option value="">Todos los pisos</option>${pisoOptsZG(ps,U.piso)}</select>
      ${cfg?`<button class="ib" data-av="edit">✎ Editar partida</button><button class="ib pri" data-av="new">＋ Partida</button>`:''}<span class="avsp"></span>
      <span class="seg" role="group" aria-label="Vista"><button type="button" data-avv="0" class="${AV.cel?'':'on'}">Grilla</button><button type="button" data-avv="1" class="${AV.cel?'on':''}">Celular</button></span></div>
    <div class="avbar"><span class="avlb">Etapa</span><span class="seg" role="group" aria-label="Etapa">${ets.map(e=>`<button type="button" data-ave="${esc(e.id)}" class="${AV.e===e.id?'on':''}">${esc(e.nom)} ${avF(e.peso)} %</button>`).join('')}${ets.length>1&&!AV.cel?`<button type="button" data-ave="*" class="${AV.e==='*'?'on':''}">Resumen</button>`:''}</span>
      <span class="avtot">${rows.length?`Avance de la partida: <b>${avPc(avGrpPct(ets,D.ex,rows))}</b>${p.sum?` · llegado <b>${avPc(avLlPct(rows))}</b>`:''}`:''}</span><span class="avsp"></span>
      ${cfg&&!AV.cel?`<button class="ib" data-av="row">＋ Fila</button><button class="ib" data-av="imp">Importar CSV…</button>`:''}</div>`;
    if(AV.dok!==3)h+=`<div class="empty">Cargando el registro…</div>`;
    else if(!rows.length)h+=`<div class="empty"><b>Esta partida aún no tiene filas.</b><br>${cfg?'Agrega una con «＋ Fila» o carga el metrado con «Importar CSV…».':'El metrado lo carga el administrador o un ingeniero de producción.'}</div>`;
    else h+=AV.cel?avCelHtml(p,D,rows):AV.e==='*'?avResHtml(p,D,rows):avGridHtml(p,D,rows)}
  main.innerHTML=h+'</div></div>';
  main.onclick=avClick;main.onchange=avChange;main.onkeydown=avKey;main.oncontextmenu=avCtx;
  /* focusin/focusout no tienen propiedad on…: se escuchan una sola vez por <main> (los manejadores revisan U.tab) */
  if(!main.__avf){main.__avf=true;main.addEventListener('focusout',avBlur);main.addEventListener('focusin',avFocus)}
  const b2=main.querySelector('.avbox');if(b2&&st){b2.scrollTop=st[0];b2.scrollLeft=st[1]}
  else if(b2){const th=b2.querySelector('th.hoy');if(th)b2.scrollLeft=Math.max(0,th.offsetLeft+th.offsetWidth*3-b2.clientWidth)}/* al entrar, el día de hoy queda a la vista */
  if(fk){const el=main.querySelector(`.aved[data-k="${CSS.escape(fk)}"]`);if(el)el.focus({preventScroll:true})}}

function avVisPisos(rows){const has=new Set(rows.map(r=>r.piso));return[...pisos(),...[...ARCH.pis.values()]].filter(x=>has.has(x.id)&&(!U.piso||x.id===U.piso))}
function avAmbGroups(p,rs){const out=[];let cur=null;avSort(p,rs).forEach(r=>{if(!cur||cur.amb!==r.amb){cur={amb:r.amb,nom:avAmbN(r),rows:[]};out.push(cur)}cur.rows.push(r)});return out}
function avGridHtml(p,D,rows){const et=avEt(p),ex=D.ex,C=avWeeks(p),reg=avaReg(),cfg=avaCfg();if(!et)return'<div class="empty">La partida no tiene etapas.</div>';
  const ets=avEts(p),ei=ets.indexOf(et),prev=ei>0?ets[ei-1]:null;
  if(!AV.wkO){AV.wkO=new Set([avMon(C.t),addD(avMon(C.t),-7)]);if(!C.W.some(w=>AV.wkO.has(w.m))&&C.W[0])AV.wkO.add(C.W[0].m)}
  const vp=avVisPisos(rows);if(!AV.pc)AV.pc=new Set(rows.length>80?vp.slice(1).map(x=>x.id):[]);/* plegados: con muchas filas solo se abre el primer piso */
  const wo=w=>AV.wkO.has(w.m),dcls=d=>d===C.t?' hoy':nwReason(d)?' nw':'',can=d=>reg&&d>=C.d0&&d<=C.d1&&d<=C.t;
  let h=`<div class="avbox"><table class="avg"><thead><tr><th rowspan="2" class="avs0">Piso › ambiente › ítem</th><th rowspan="2" class="num">Metrado</th>${p.sum?'<th rowspan="2" class="num">Llegó</th>':''}<th rowspan="2" class="num">Ejec.</th><th rowspan="2" class="num">Pend.</th><th rowspan="2">% ${esc(et.nom)}</th><th rowspan="2">Alerta</th><th rowspan="2" class="num" title="Lo ejecutado antes de empezar el registro diario">Corte inicial${p.corte?'<br>'+fmtD(p.corte):''}</th>`;
  C.W.forEach(w=>h+=`<th class="avwk" data-avwk="${w.m}" colspan="${wo(w)?8:1}" title="Clic para plegar o desplegar la semana">${wo(w)?'▾':'▸'} Semana ${w.n} · ${fmtD(w.days[0])} – ${fmtD(w.days[6])}</th>`);h+='</tr><tr>';
  C.W.forEach(w=>{if(wo(w))w.days.forEach((d,i)=>h+=`<th class="num${dcls(d)}" title="${esc(nwReason(d)||'')}">${'LMXJVSD'[i]} ${d.slice(8)}</th>`);h+='<th class="num">total</th>'});h+='</tr></thead><tbody>';
  const edc=(k,v,cls,ok)=>ok?`<td class="num aved${cls}" contenteditable="true" inputmode="decimal" data-k="${esc(k)}" data-o="${avE(v)}">${avE(v)}</td>`:`<td class="num${cls}">${avE(v)}</td>`;
  const line=(cls,lab,rs,attr,row)=>{const m=avSumQ(rs),a=rs.reduce((s,r)=>s+avAcc(ex,r.id,et.id),0),v=row?(m?Math.min(a/m,1):0):avEtPct(ex,rs,et.id);let al='';
    const over=r=>avAcc(ex,r.id,et.id)>r.q+1e-9,noll=r=>p.sum&&avMaxAcc(p,ex,r)>r.ll+1e-9,ahead=r=>prev&&avAcc(ex,r.id,et.id)>avAcc(ex,r.id,prev.id)+1e-9;
    if(row){if(over(row))al+='<span class="avtg w">supera el metrado</span>';if(noll(row))al+='<span class="avtg b">más de lo llegado</span>';if(ahead(row))al+=`<span class="avtg w">va delante de ${esc(prev.nom)}</span>`}
    else{const n=rs.filter(r=>over(r)||noll(r)||ahead(r)).length;if(n)al=`<span class="avtg ${rs.some(noll)?'b':'w'}">⚠ ${n}</span>`}
    let t=`<tr class="${cls}" ${attr}><td class="avs0" title="${esc(lab.t)}">${lab.h}</td>${row?edc('q|'+row.id,row.q,'',cfg):`<td class="num">${avF(m)}</td>`}`;
    if(p.sum)t+=row?edc('l|'+row.id,row.ll,'',reg):`<td class="num">${avF(rs.reduce((s,r)=>s+r.ll,0))}</td>`;
    t+=`<td class="num${a>m+1e-9?' avov':''}">${avF(a)}</td><td class="num">${avF(Math.max(m-a,0))}</td><td class="avpc">${avBar(v)}</td><td class="aval">${al}</td>`;
    const c=(d,x,ok)=>{const q=rs.reduce((s,r)=>s+avCell(ex,r.id,et.id,d),0);return row?edc('c|'+row.id+'|'+d,q,x,ok):`<td class="num${x}">${q?avF(q):''}</td>`};
    t+=c(AV_INI,'',reg);C.W.forEach(w=>{if(wo(w))w.days.forEach(d=>t+=c(d,dcls(d),can(d)));const q=w.days.reduce((s,d)=>s+rs.reduce((s2,r)=>s2+avCell(ex,r.id,et.id,d),0),0);t+=`<td class="num avwt">${q?avF(q):''}</td>`});return t+'</tr>'};
  vp.forEach(pi=>{const rs=rows.filter(r=>r.piso===pi.id),o=!AV.pc.has(pi.id);h+=line('avpi',{t:pi.name,h:(o?'▾ ':'▸ ')+esc(pi.name)},rs,`data-avpi="${esc(pi.id)}"`);
    if(o)avAmbGroups(p,rs).forEach(g=>{const ka=pi.id+'|'+g.amb,oa=!AV.ambC.has(ka);h+=line('avam',{t:g.nom,h:'<i class="avi1"></i>'+(oa?'▾ ':'▸ ')+esc(g.nom)},g.rows,`data-avam="${esc(ka)}"`);
      if(oa)g.rows.forEach(r=>{const it=avIt(p,r),tx=`${it.cod} · ${it.des}${r.ub?' · '+r.ub:''}`;h+=line('avrw',{t:tx,h:`<i class="avi2"></i><b>${esc(it.cod)}</b> ${esc(it.des)}${r.ub?` · <em>${esc(r.ub)}</em>`:''}`},[r],'',r)})})});
  return h+`</tbody></table></div><p class="avnote">${reg?'Escribe la cantidad ejecutada en el día. Enter baja a la fila siguiente; clic derecho (o mantener el dedo) en una celda muestra su historial. ':''}Clic en una semana para plegarla.${cfg?' Para quitar una fila, deja su metrado en blanco.':''}</p>`}
function avResHtml(p,D,rows){const ets=avEts(p),ex=D.ex;let h=`<div class="avbox"><table class="avg"><thead><tr><th class="avs0">Piso › ambiente</th><th class="num">Metrado</th>${ets.map(e=>`<th>${esc(e.nom)} ${avF(e.peso)} %</th>`).join('')}<th>Ponderado</th></tr></thead><tbody>`;
  const ln=(cls,lab,rs)=>`<tr class="${cls}"><td class="avs0">${lab}</td><td class="num">${avF(avSumQ(rs))}</td>${ets.map(e=>`<td class="avpc">${avBar(avEtPct(ex,rs,e.id),'a')}</td>`).join('')}<td class="avpc"><b>${avBar(avGrpPct(ets,ex,rs))}</b></td></tr>`;
  avVisPisos(rows).forEach(pi=>{const rs=rows.filter(r=>r.piso===pi.id);h+=ln('avpi',esc(pi.name),rs);avAmbGroups(p,rs).forEach(g=>h+=ln('avrw','<i class="avi1"></i>'+esc(g.nom),g.rows))});
  return h+'</tbody></table></div><p class="avnote">Avance ponderado de todas las etapas (solo lectura). Para registrar, elige una etapa.</p>'}
/** celular: piso → ambiente → ítems con la cantidad del día */
function avCelHtml(p,D,rows){const et=avEt(p),ex=D.ex,reg=avaReg(),t=todayIso();if(!et)return'';if(AV.day!==addD(t,-1))AV.day=t;const d=AV.day;
  const all=[...pisos(),...ARCH.pis.values()].filter(x=>rows.some(r=>r.piso===x.id));const cp=all.find(x=>x.id===U.piso)||all[0];
  if(!cp)return'<div class="empty">Sin filas.</div>';const rs=rows.filter(r=>r.piso===cp.id),G=avAmbGroups(p,rs);let h=`<div class="avcel">`;
  const dsel=`<span class="seg" role="group" aria-label="Día"><button type="button" data-avd="${t}" class="${d===t?'on':''}">Hoy ${fmtD(t)}</button><button type="button" data-avd="${addD(t,-1)}" class="${d!==t?'on':''}">Ayer</button></span>`;
  const g=G.find(x=>x.amb===AV.amb);
  if(!g){h+=`<div class="avch"><b>${esc(cp.name)}</b>${U.piso?'':'<span>Elige otro piso arriba</span>'}</div>${dsel}`;
    G.forEach(x=>{const v=avEtPct(ex,x.rows,et.id),fa=x.rows.reduce((s,r)=>s+Math.max(r.q-avAcc(ex,r.id,et.id),0),0);h+=`<button type="button" class="avcard" data-avamb="${esc(x.amb)}"><span><b>${esc(x.nom)}</b><small>${v>=1?'100 % ✓':avPc(v)+' · faltan '+avF(fa)+' '+esc(p.und||'')}</small></span><i aria-hidden="true">›</i></button>`})}
  else{const ok=reg&&d>=(p.d0||d)&&d<=(p.d1||d);h+=`<button type="button" class="ib" data-avamb="">‹ ${esc(g.nom)}</button><div class="avch"><span>${esc(cp.name)} · ${esc(et.nom)}</span></div>${dsel}`;
    g.rows.forEach(r=>{const it=avIt(p,r),a=avAcc(ex,r.id,et.id),c=avCell(ex,r.id,et.id,d);h+=`<div class="avcrow"><span><b>${esc(it.cod)}</b> ${esc(it.des)}${r.ub?' · '+esc(r.ub):''}<small>${avF(a)} de ${avF(r.q)} ${esc(p.und||'')}${p.sum?' · llegó '+avF(r.ll):''}</small></span>
      ${ok?`<span class="avstp"><button type="button" data-avst="-1" data-r="${esc(r.id)}" aria-label="Menos">−</button><input type="number" inputmode="decimal" min="0" step="any" data-avin="${esc(r.id)}" data-fk="avin-${esc(r.id)}" value="${avE(c)}" aria-label="Cantidad del día"><button type="button" data-avst="1" data-r="${esc(r.id)}" aria-label="Más">+</button></span>`:`<b class="mono">${avE(c)||'0'}</b>`}</div>`});
    if(ok)h+=`<button type="button" class="ib pri" data-av="todo">Todo lo que falta</button>`;else if(reg)h+='<p class="avnote">Ese día está fuera del rango de fechas de la partida.</p>'}
  return h+'</div>'}

/* ---------- escritura ---------- */
const avRowOf=id=>avData().rows.find(r=>r.id===id);
function avPutCell(p,row,etId,d,q,old){const wk=d===AV_INI?AV_INI:avMon(d),id=`${p.id}_${row.piso}_${wk}`,w=avWho();
  return bgWrite(fcol('ava').doc(id).set({p:p.id,piso:row.piso,w:wk,c:{[d]:{[row.id]:{[etId]:q}}},log:firebase.firestore.FieldValue.arrayUnion({d,r:row.id,e:etId,q,a:old,...w}),by:w.by,t:w.t},{merge:true}))}
/** guarda la cantidad de un día; si el acumulado supera el metrado pide confirmar (avisa, no bloquea) */
async function avSetCell(row,d,q){const p=avCur(),et=avEt(p);if(!p||!et||!row||!avaReg())return false;const ex=avData().ex,old=avCell(ex,row.id,et.id,d);q=Math.round(q*100)/100;if(q===old)return true;
  const tot=avAcc(ex,row.id,et.id)-old+q;if(q>old&&tot>row.q+1e-9){const it=avIt(p,row);
    if(!await uiAsk({title:'Supera el metrado',text:`${it.cod} en ${avAmbN(row)}: el acumulado de ${et.nom} sería ${avF(tot)} y el metrado es ${avF(row.q)} ${p.und||''}.`,ok:'Guardar igual',tone:'warn'}))return false}
  avPutCell(p,row,et.id,d,q,old);return true}
const avMDoc=(p,row)=>fcol('avm').doc(p.id+'_'+row.piso);
function avSetLl(row,v){const p=avCur();if(!p||!avaReg())return;const w=avWho();bgWrite(avMDoc(p,row).set({p:p.id,piso:row.piso,ll:{[row.id]:Math.round(v*100)/100},by:w.by,t:w.t},{merge:true}))}
async function avSetQ(row,v){const p=avCur();if(!p||!avaCfg())return;const w=avWho();
  if(!(v>0)){const it=avIt(p,row),has=avMaxAcc(p,avData().ex,row)>0;
    if(!await uiAsk({title:'¿Quitar esta fila?',text:`${it.cod} · ${it.des} en ${avAmbN(row)}.${has?' Tiene avance registrado: se conserva en la base, pero deja de contar.':''}`,ok:'Quitar fila',tone:has?'danger':'warn'}))return;
    bgWrite(avMDoc(p,row).set({p:p.id,piso:row.piso,r:{[row.id]:{arch:w}},by:w.by,t:w.t},{merge:true}));toast('Fila quitada');return}
  bgWrite(avMDoc(p,row).set({p:p.id,piso:row.piso,r:{[row.id]:{q:Math.round(v*100)/100}},by:w.by,t:w.t},{merge:true}))}

/* ---------- eventos ---------- */
function avFocus(e){const t=e.target;if(U.tab!=='areg'||!t.classList||!t.classList.contains('aved'))return;const r=document.createRange();r.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(r)}
async function avBlur(e){const t=e.target;if(U.tab!=='areg'||!t.classList||!t.classList.contains('aved'))return;const txt=t.textContent.trim(),o=t.dataset.o||'';
  const done=()=>{if(AV.pend){AV.pend=false}requestRender()};if(txt===o){if(AV.pend)done();return}
  const v=txt===''?0:avNum(txt),bad=txt!==''&&(!/^[\d\s.,]+$/.test(txt)||!Number.isFinite(v)||v<0);const k=t.dataset.k.split('|'),row=avRowOf(k[1]);
  if(bad||!row){t.textContent=o;if(bad)toast('Escribe solo un número (p. ej. 12 o 6.5).');done();return}
  t.dataset.o=txt;/* ya no se considera «a medio escribir»: lo que llegue puede redibujar */
  if(k[0]==='q')await avSetQ(row,v);else if(k[0]==='l')avSetLl(row,v);else if(!await avSetCell(row,k[2],v)){t.dataset.o=o;t.textContent=o}
  done()}
function avKey(e){const t=e.target;if(U.tab!=='areg'||!t.classList||!t.classList.contains('aved'))return;
  if(e.key==='Escape'){t.textContent=t.dataset.o||'';t.blur();return}
  if(e.key!=='Enter'&&e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const up=e.key==='ArrowUp',ix=t.cellIndex;let tr=t.parentElement;
  for(;;){tr=up?tr.previousElementSibling:tr.nextElementSibling;if(!tr){t.blur();return}const c=tr.cells[ix];if(c&&c.classList.contains('aved')){c.focus();return}}}
/** historial de una celda: quién registró y cuándo */
function avCtx(e){const t=e.target.closest&&e.target.closest('.aved[data-k^="c|"]');if(U.tab!=='areg'||!t)return;e.preventDefault();const p=avCur(),et=avEt(p),k=t.dataset.k.split('|'),row=avRowOf(k[1]);if(!p||!et||!row)return;
  const d=k[2],doc=AVD.get(`${p.id}_${row.piso}_${d===AV_INI?AV_INI:avMon(d)}`),L=((doc&&doc.log)||[]).filter(x=>x.d===d&&x.r===row.id&&x.e===et.id).sort((a,b)=>b.t-a.t);
  const hm=ms=>{const x=new Date(ms-5*36e5);return fmtD(x.toISOString().slice(0,10))+' '+x.toISOString().slice(11,16)};
  openPop(t,`<div class="ph">Historial · ${d===AV_INI?'corte inicial':fmtD(d)}</div><div class="avhist">${L.length?L.map(x=>`<div><b>${avF(x.a)} → ${avF(x.q)}</b><span>${esc(x.n||String(x.by||'').split('@')[0])} · ${hm(x.t)}</span></div>`).join(''):'<div><span>Sin cambios registrados.</span></div>'}</div>`,{})}
function avChange(e){const t=e.target;if(U.tab!=='areg')return;
  if(t.id==='avp'){U.avP=t.value;saveUI();requestRender();return}
  if(t.id==='avpiso'){U.piso=t.value;AV.amb='';AV.pc=null;saveUI();requestRender();return}
  if(t.dataset&&t.dataset.avin){const row=avRowOf(t.dataset.avin),v=t.value===''?0:avNum(t.value);if(!row||!(v>=0)){requestRender();return}avSetCell(row,AV.day,v).then(()=>requestRender())}}
function avClick(e){if(U.tab!=='areg')return;const g=a=>{const el=e.target.closest('['+a+']');return el?el.getAttribute(a):null};let v;
  if(e.target.closest('.aved'))return;
  if((v=g('data-avv'))!=null){AV.cel=v==='1';AV.amb=''}
  else if((v=g('data-ave'))!=null){AV.e=v}
  else if((v=g('data-avwk'))){AV.wkO.has(v)?AV.wkO.delete(v):AV.wkO.add(v)}
  else if((v=g('data-avpi'))){AV.pc.has(v)?AV.pc.delete(v):AV.pc.add(v)}
  else if((v=g('data-avam'))){AV.ambC.has(v)?AV.ambC.delete(v):AV.ambC.add(v)}
  else if((v=g('data-avd'))){AV.day=v}
  else if((v=g('data-avamb'))!=null){AV.amb=v}
  else if((v=g('data-avst'))){const b=e.target.closest('[data-avst]'),row=avRowOf(b.dataset.r),p=avCur(),et=avEt(p);if(!row||!et)return;const c=avCell(avData().ex,row.id,et.id,AV.day);avSetCell(row,AV.day,Math.max(0,c+ +v)).then(()=>requestRender());return}
  else if((v=g('data-av'))){if(v==='new')avNewMenu(e.target.closest('[data-av]'));else if(v==='edit')avFicha(avCur());else if(v==='row')avRowDlg();else if(v==='imp')avImpOpen();else if(v==='todo')avTodo();return}
  else return;requestRender()}
/** celular: completa de un toque lo que falta en el ambiente abierto */
function avTodo(){const p=avCur(),et=avEt(p),D=avData();if(!p||!et||!avaReg())return;const cp=U.piso;let n=0;
  D.rows.filter(r=>r.amb===AV.amb&&(!cp||r.piso===cp)).forEach(r=>{const fa=r.q-avAcc(D.ex,r.id,et.id);if(fa>1e-9){const c=avCell(D.ex,r.id,et.id,AV.day);avPutCell(p,r,et.id,AV.day,Math.round((c+fa)*100)/100,c);n++}});
  toast(n?`Completado: ${n} ítem${n===1?'':'s'}`:'No faltaba nada en este ambiente');requestRender()}

/* ---------- partidas: nueva / editar ---------- */
let AVF=null;
function avNewMenu(anchor){if(!avaCfg())return;const cur=avCur();const H={blank:()=>avFicha(null,{nom:'',und:'und',sum:false,ubi:[],et:[['Etapa única',100]]})};
  AV_TPL.forEach((t,i)=>H['t'+i]=()=>avFicha(null,t));if(cur)H.dup=()=>avFicha(null,{nom:cur.nom+' (copia)',und:cur.und,sum:!!cur.sum,ubi:cur.ubi||[],et:avEts(cur).map(e=>[e.nom,e.peso]),items:cur.items});
  openPop(anchor,`<div class="ph">Nueva partida</div><button data-do="blank">En blanco</button><div class="ph">Desde plantilla</div>${AV_TPL.map((t,i)=>`<button data-do="t${i}">${esc(t.nom)}</button>`).join('')}${cur?`<div class="ph">Copiar</div><button data-do="dup">Duplicar «${esc(cur.nom)}»</button>`:''}`,H)}
const avItTxt=items=>Object.values(items||{}).sort((a,b)=>(a.ord||0)-(b.ord||0)).map(i=>i.cod+'\t'+(i.des||'')).join('\n');
function avFicha(p,tpl){if(!avaCfg())return;const s=p||tpl||{},t=todayIso();
  AVF={id:p?p.id:'',nom:s.nom||'',und:s.und||'und',sum:!!s.sum,ubi:(s.ubi||[]).join(', '),et:p?avEts(p).map(e=>({id:e.id,nom:e.nom,peso:e.peso})):(s.et||[]).map(e=>({id:'',nom:e[0],peso:e[1]})),
    items:avItTxt(s.items),peso:p?(p.peso??''):'',glob:p?p.glob!==false:true,d0:(p&&p.d0)||t,d1:(p&&p.d1)||addD(t,90),corte:(p&&p.corte)||addD(t,-1)};avFDraw()}
function avFRead(){const q=s=>$('#lqm [data-avf="'+s+'"]');if(!AVF||!q('nom'))return;['nom','und','ubi','items','peso','d0','d1','corte'].forEach(k=>AVF[k]=q(k).value);AVF.sum=q('sum').checked;AVF.glob=q('glob').checked;
  $$('#lqm [data-aven]').forEach((el,i)=>{if(AVF.et[i])AVF.et[i].nom=el.value});$$('#lqm [data-avep]').forEach((el,i)=>{if(AVF.et[i])AVF.et[i].peso=el.value})}
function avFDraw(){const f=AVF,sum=f.et.reduce((s,e)=>s+avNum(e.peso),0),ok=Math.abs(sum-100)<0.01;const others=avParts().filter(x=>x.id!==f.id&&x.glob!==false).reduce((s,x)=>s+(+x.peso||0),0),gs=others+(f.glob?avNum(f.peso):0);
  lqModal(`<div class="avh"><b>${f.id?'Editar partida':'Nueva partida'}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>
  <div class="avf2"><label class="avf">Nombre<input class="tin" data-avf="nom" id="avfnom" maxlength="60" value="${esc(f.nom)}" placeholder="p. ej. Mobiliario"></label>
    <label class="avf">Unidad<input class="tin" data-avf="und" id="avfund" maxlength="8" list="avfundl" value="${esc(f.und)}"><datalist id="avfundl">${AV_UND.map(u=>`<option value="${u}">`).join('')}</datalist></label></div>
  <div class="avf3"><label class="avf">Inicio del registro<input class="tin" type="date" data-avf="d0" id="avfd0" value="${esc(f.d0)}"></label><label class="avf">Fin<input class="tin" type="date" data-avf="d1" id="avfd1" value="${esc(f.d1)}"></label><label class="avf">Fecha del corte inicial<input class="tin" type="date" data-avf="corte" id="avfco" value="${esc(f.corte)}"></label></div>
  <fieldset class="avfs"><legend>Etapas de ejecución (los pesos deben sumar 100 %)</legend>${f.et.map((e,i)=>`<div class="avfe"><input class="tin" data-aven="${i}" id="avfen${i}" maxlength="40" value="${esc(e.nom)}" aria-label="Nombre de la etapa ${i+1}"><input class="tin" data-avep="${i}" id="avfep${i}" inputmode="decimal" value="${esc(String(e.peso??''))}" aria-label="Peso de la etapa ${i+1}"><span>%</span>${f.et.length>1?`<button type="button" class="ib" data-avfx="${i}" aria-label="Quitar etapa">✕</button>`:''}</div>`).join('')}
    <div class="avfe"><button type="button" class="ib" data-avfa="1">＋ Etapa</button><span class="avsp"></span><span class="avtg ${ok?'o':'b'}" id="avfsum">Suma ${avF(sum)} % ${ok?'✓':'· debe ser 100'}</span></div></fieldset>
  <label class="avf">Ítems: un código y su descripción por línea (se pueden pegar dos columnas de Excel)<textarea class="tin avta" data-avf="items" id="avfit" rows="5" placeholder="EO-1&#9;Escritorio en L con cajonera">${esc(f.items)}</textarea></label>
  <label class="avf">Ubicación dentro del ambiente, separadas por coma (vacío = no usa)<input class="tin" data-avf="ubi" id="avfubi" value="${esc(f.ubi)}" placeholder="Muro, Cielo raso, Piso"></label>
  <label class="avck"><input type="checkbox" data-avf="sum" id="avfsumc"${f.sum?' checked':''}> Controla llegadas: agrega la columna «Llegó» (cuánto llegó del metrado de cada fila)</label>
  <div class="avf2"><label class="avck"><input type="checkbox" data-avf="glob" id="avfglob"${f.glob?' checked':''}> Entra al avance global</label><label class="avf">Peso en el global (%)<input class="tin" data-avf="peso" id="avfpeso" inputmode="decimal" value="${esc(String(f.peso??''))}"></label></div>
  <p class="avnote" id="avfgs">Suma de pesos de las partidas que entran al global: <b>${avF(gs)} %</b>${Math.abs(gs-100)<0.01?' ✓':' (debe llegar a 100 %)'}</p>
  <div class="avact">${f.id?'<button type="button" class="ib" data-avfk="arch">Archivar partida</button>':''}<span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cancelar</button><button type="button" class="ib pri" data-avfk="ok">${f.id?'Guardar':'Crear partida'}</button></div>`,
  e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.avfa){avFRead();AVF.et.push({id:'',nom:'',peso:''});avFDraw()}else if(b.dataset.avfx){avFRead();AVF.et.splice(+b.dataset.avfx,1);avFDraw()}else if(b.dataset.avfk==='ok')avFSave();else if(b.dataset.avfk==='arch')avFArch()},
  null);const el=$('#lqm');if(el)el.oninput=avFSum}
/** suma de pesos al escribir, sin redibujar la ventana (redibujarla al cambiar de campo se comía el clic en el campo siguiente) */
function avFSum(){avFRead();const f=AVF;if(!f)return;const sum=f.et.reduce((s,e)=>s+avNum(e.peso),0),ok=Math.abs(sum-100)<0.01,a=$('#avfsum');if(a){a.className='avtg '+(ok?'o':'b');a.textContent=`Suma ${avF(sum)} % ${ok?'✓':'· debe ser 100'}`}
  const gs=avParts().filter(x=>x.id!==f.id&&x.glob!==false).reduce((s,x)=>s+(+x.peso||0),0)+(f.glob?avNum(f.peso):0),b=$('#avfgs');if(b)b.innerHTML=`Suma de pesos de las partidas que entran al global: <b>${avF(gs)} %</b>${Math.abs(gs-100)<0.01?' ✓':' (debe llegar a 100 %)'}`}
/** texto de ítems → mapa, conservando el id de los códigos que ya existían */
function avItParse(txt,old){const byCod=new Map(Object.entries(old||{}).map(([id,i])=>[mnk(i.cod),id]));const out={},seen=new Set();let n=0,k=0;
  String(txt||'').split(/\r?\n/).forEach(l=>{l=l.trim();if(!l)return;let m=l.split(/\t|;/);if(m.length<2){const i=l.search(/\s/);m=i<0?[l,'']:[l.slice(0,i),l.slice(i+1)]}const cod=m[0].trim().slice(0,30),des=m.slice(1).join(' ').trim().slice(0,120),key=mnk(cod);if(!cod||seen.has(key))return;seen.add(key);
    let id=byCod.get(key);if(!id){do{id='i'+NOW().toString(36)+(k++).toString(36)}while(out[id]||(old&&old[id]))}out[id]={cod,des,ord:n++}});return out}
async function avFSave(){avFRead();const f=AVF;if(!f)return;const p=f.id?AVP.get(f.id):null,nom=f.nom.trim();if(!nom){toast('Ponle un nombre a la partida.');return}
  const et=f.et.map(e=>({id:e.id,nom:String(e.nom||'').trim(),peso:Math.round(avNum(e.peso)*100)/100}));if(et.some(e=>!e.nom||!(e.peso>0))){toast('Cada etapa necesita nombre y un peso mayor que 0.');return}
  if(!avPesosOk(et)){toast('Los pesos de las etapas deben sumar 100 %.');return}if(f.d1<f.d0){toast('La fecha de fin es anterior al inicio.');return}
  let k=0;const used=new Set(et.map(e=>e.id).filter(Boolean));et.forEach(e=>{if(!e.id){do{e.id='e'+(++k)}while(used.has(e.id)||(p&&avEts(p).some(x=>x.id===e.id)));used.add(e.id)}});
  const items=avItParse(f.items,p&&p.items);
  if(p){const D=avSubP===p.id?avData():{rows:[],ex:{}},usedIt=new Set(D.rows.map(r=>r.it));const lostI=Object.keys(p.items||{}).filter(id=>!items[id]&&usedIt.has(id));
    if(lostI.length){toast(`No se puede quitar ${lostI.map(id=>p.items[id].cod).slice(0,3).join(', ')}: tiene filas con metrado. Quita primero sus filas.`);return}
    const lostE=avEts(p).filter(e=>!et.find(x=>x.id===e.id)&&D.rows.some(r=>avAcc(D.ex,r.id,e.id)>0));
    if(lostE.length&&!await uiAsk({title:'Hay avance en una etapa que quitaste',text:`${lostE.map(e=>e.nom).join(', ')}: su avance se conserva en la base, pero deja de verse y de contar.`,ok:'Quitar la etapa',tone:'danger'}))return}
  const ubi=[...new Set(f.ubi.split(',').map(s=>s.trim()).filter(Boolean))].slice(0,8);
  const doc={nom:nom.slice(0,60),und:(f.und||'und').trim().slice(0,8),sum:!!f.sum,ubi,et,items,peso:Math.round(avNum(f.peso)*100)/100,glob:!!f.glob,d0:f.d0,d1:f.d1,corte:f.corte,...avWho()};
  try{if(p)bgWrite(fcol('avp').doc(p.id).update(doc));else{const id=uid('av');doc.ord=avParts().length;doc.arch=null;bgWrite(fcol('avp').doc(id).set(doc));U.avP=id;saveUI()}
    AVF=null;lqClose();toast(p?'Partida guardada':'Partida creada');requestRender()}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
async function avFArch(){const p=AVF&&AVP.get(AVF.id);if(!p)return;if(!await uiAsk({title:'¿Archivar esta partida?',text:'Deja de verse en el módulo; su metrado y su avance se conservan.',ok:'Archivar',tone:'warn'}))return;
  bgWrite(fcol('avp').doc(p.id).update({arch:avWho()}));AVF=null;lqClose();toast('Partida archivada');requestRender()}

/* ---------- ＋ Fila ---------- */
function avRowDlg(st){const p=avCur();if(!p||!avaCfg())return;const its=Object.entries(p.items||{}).sort((a,b)=>(a[1].ord||0)-(b[1].ord||0));
  if(!its.length){toast('Primero agrega los ítems de la partida en «Editar partida».');return}
  st=st||{piso:U.piso||(pisos()[0]||{}).id||'',amb:'',it:its[0][0],ub:(p.ubi||[])[0]||'',q:''};
  const ambs=[...S.amb.values()].filter(a=>pisoOfAmb(a.id)===st.piso).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es',{numeric:true}));if(!ambs.find(a=>a.id===st.amb))st.amb=ambs[0]?ambs[0].id:'';
  const rd=()=>{const q=s=>$('#lqm [data-avr="'+s+'"]');return{piso:q('piso').value,amb:q('amb').value,it:q('it').value,ub:q('ub')?q('ub').value:'',q:q('q').value}};
  lqModal(`<div class="avh"><b>Agregar fila · ${esc(p.nom)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>
   <div class="avf2"><label class="avf">Piso<select class="tin" data-avr="piso" id="avrpiso">${pisoOptsZG(pisos(),st.piso)}</select></label>
   <label class="avf">Ambiente<select class="tin" data-avr="amb" id="avramb">${ambs.map(a=>`<option value="${esc(a.id)}"${a.id===st.amb?' selected':''}>${esc(a.name||a.code||a.id)}</option>`).join('')||'<option value="">(este piso no tiene ambientes)</option>'}</select></label></div>
   <label class="avf">Ítem<select class="tin" data-avr="it" id="avrit">${its.map(([id,i])=>`<option value="${esc(id)}"${id===st.it?' selected':''}>${esc(i.cod)} · ${esc(i.des||'')}</option>`).join('')}</select></label>
   <div class="avf2">${(p.ubi||[]).length?`<label class="avf">Ubicación<select class="tin" data-avr="ub" id="avrub">${p.ubi.map(u=>`<option${u===st.ub?' selected':''}>${esc(u)}</option>`).join('')}</select></label>`:''}
   <label class="avf">Metrado (${esc(p.und||'')})<input class="tin" data-avr="q" id="avrq" inputmode="decimal" value="${esc(st.q)}"></label></div>
   <p class="avnote">El ambiente se elige de los que ya existen en la obra; si falta, créalo primero en el Lookahead.</p>
   <div class="avact"><span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cerrar</button><button type="button" class="ib pri" data-avrk="ok">Agregar</button></div>`,
  e=>{if(!e.target.closest('[data-avrk]'))return;const f=rd(),q=avNum(f.q);if(!f.amb){toast('Elige un ambiente.');return}if(!(q>0)){toast('Escribe el metrado.');return}
    if(avData().rows.some(r=>r.amb===f.amb&&r.it===f.it&&r.ub===f.ub)){toast('Esa fila ya existe: corrige su metrado en la tabla.');return}
    const a=S.amb.get(f.amb),id=uid('r'),w=avWho();bgWrite(fcol('avm').doc(p.id+'_'+f.piso).set({p:p.id,piso:f.piso,r:{[id]:{it:f.it,amb:f.amb,ub:f.ub,q:Math.round(q*100)/100,an:a?a.name||'':''}},by:w.by,t:w.t},{merge:true}));
    toast('Fila agregada');avRowDlg({...f,q:''})},
  e=>{if(e.target.dataset&&e.target.dataset.avr==='piso')avRowDlg({...rd(),amb:''})})}
