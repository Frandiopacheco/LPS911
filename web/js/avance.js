"use strict";
/* LPS 911 · Módulo Avance (docs/ia/avance.md): avance físico de partidas por ambiente. Módulo aparte (U.mod==='ava'); no toca el
   lookahead, el plan diario ni el PPC; usa los pisos, sectores y ambientes de Last Planner por su id.
   PLANILLA ÚNICA (25-11-2026, rediseño decidido con el dueño sobre su Excel de metrados): un solo formato para cualquier partida.
   - avp/{id}: partida {v:2, nom, d0, d1, corte, ord, eq, by, n, t, arch?}. Solo nombre y fechas: sin ítems, plantillas ni «Llegó».
     Las partidas del primer formato (sin v:2) eran de prueba: quedan en la base, pero ya no se muestran.
   - avm/{partida}_{piso}: filas {p, piso, r:{filaId:{amb, sec, desc, und, q, et:[{id,n,w}]|null, o, an, arch?}}}.
     La fila cuelga de un ambiente (`amb`), de un sector (`sec`, sin amb) o de todo el piso (ninguno). Unidad por fila.
     `et` = etapas de esa fila, definidas en la misma planilla; la primera lleva el id '_' (el de la fila sin etapas), así lo ya
     registrado pasa a ella sin mover datos. Los ids de etapa no se reusan nunca.
   - ava/{partida}_{piso}_{lunes|ini}: {p, piso, w, c:{fecha|'ini':{filaId:{etapaId|'_':cantidad}}}, log:[{d,r,e,q,a,by,n,t}]}.
     Se guarda siempre la CANTIDAD; el interruptor Cantidad | % solo cambia cómo se ve y se tipea. Cada celda se escribe sola
     (set con merge + arrayUnion): dos personas en celdas distintas no se pisan. `log` es el historial por celda.
   El cálculo está en avance-calc.js (funciones puras). */
const AVP=new Map(),AVM=new Map(),AVD=new Map();let avUnP=null,avUnD=[],avSubP='',avOk=false,avReg1=false;
const AV={cel:null,day:'',C:new Set(),wkO:null,key:'',grp:null,v:0,cv:-1,rows:null,ex:null,pend:false,dok:0,xa:[],gf:null};
const avR4=n=>Math.round((+n||0)*1e4)/1e4;
const avF=n=>Number(+n||0).toLocaleString('es-PE',{maximumFractionDigits:2});
const avE=n=>{const v=Math.round((+n||0)*100)/100;return v?String(v):''};/* texto de una celda editable: sin separador de miles */
const avE1=n=>{const v=Math.round((+n||0)*10)/10;return v?String(v):''};
const avPc=v=>Math.round((+v||0)*100)+' %';
const avBar=v=>`<span class="avpb"><i style="width:${Math.max(0,Math.min(100,v*100)).toFixed(0)}%"></i></span>${avPc(v)}`;
const avWho=()=>({by:me.email||'',n:me.name||'',t:NOW()});
const avNid=p=>p+NOW().toString(36)+Math.random().toString(36).slice(2,6);
Object.assign(BNI,{areg:SVG('<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M9 9.5v10M14.5 9.5v10"/>')});

/* ---------- datos ---------- */
function ensureAv(){if(!db||avUnP||!me||!canAva())return;
  const open=()=>{avUnP=fcol('avp').onSnapshot(sn=>{snapOk('avp');AVP.clear();sn.docs.forEach(d=>AVP.set(d.id,{...d.data(),id:d.id}));avOk=true;if(U.mod==='ava')snapRender(sn)},
    err=>{avUnP=null;snapFail('avp',err,()=>{if(me&&canAva()&&!avUnP)open()})})};
  open();if(!avReg1){avReg1=true;unsubs.push(()=>{avReg1=false;avStop()})}}
function avStop(){if(avUnP)try{avUnP()}catch(e){}avUnP=null;avUnD.forEach(f=>{try{f()}catch(e){}});avUnD=[];avSubP='';avOk=false;AVP.clear();AVM.clear();AVD.clear();AV.v++}
/** filas y avance de UNA partida (la elegida): se reabre al cambiar de partida */
function avSubData(pid){if(avSubP===pid)return;avUnD.forEach(f=>{try{f()}catch(e){}});avUnD=[];AVM.clear();AVD.clear();AV.v++;AV.dok=0;avSubP=pid;if(!pid||!db)return;
  const mk=(col,M,bit)=>{const open=()=>{if(avSubP!==pid)return;const un=fcol(col).where('p','==',pid).onSnapshot(sn=>{if(avSubP!==pid)return;snapOk(col+'_p');M.clear();sn.docs.forEach(d=>M.set(d.id,{...d.data(),id:d.id}));AV.v++;AV.dok|=bit;if(U.mod==='ava')snapRender(sn)},
    err=>{snapFail(col+'_p',err,open)});avUnD.push(un)};open()};
  mk('avm',AVM,1);mk('ava',AVD,2)}
const avReady=p=>!!p&&avSubP===p.id&&AV.dok===3;
const avParts=()=>[...AVP.values()].filter(p=>!p.arch&&p.v===2).sort((a,b)=>(a.ord||0)-(b.ord||0)||String(a.nom).localeCompare(String(b.nom),'es'));
function avCur(){let p=AVP.get(U.avP);if(!p||p.arch||p.v!==2){p=avParts()[0]||null;if(avOk)U.avP=p?p.id:''}return p}
const avAmb=id=>S.amb.get(id)||ARCH.amb.get(id)||null;
const avSec=id=>S.sec.get(id)||ARCH.sec.get(id)||null;
/** filas y ejecutado de la partida en curso, armados una vez por cambio de datos */
function avData(){if(AV.cv===AV.v&&AV.rows)return AV;const rows=[],ex={};
  AVM.forEach(m=>{const R=m.r||{};for(const id in R){const r=R[id];if(!r||r.arch)continue;const a=r.amb?avAmb(r.amb):null;
    rows.push({id,piso:m.piso,amb:r.amb||'',sec:r.amb?(a&&a.sectorId)||'':r.sec||'',desc:r.desc||'',und:r.und||'und',q:+r.q||0,et:Array.isArray(r.et)&&r.et.length?r.et:null,o:+r.o||0,an:r.an||''})}});
  rows.sort((a,b)=>a.o-b.o||String(a.id).localeCompare(String(b.id)));
  AVD.forEach(d=>{const c=d.c||{};for(const f in c){const R=c[f]||{};for(const rid in R){const o=R[rid]||{};for(const e in o)((ex[rid]=ex[rid]||{})[e]=ex[rid][e]||{})[f]=+o[e]||0}}});
  AV.rows=rows;AV.ex=ex;AV.cv=AV.v;return AV}
const avRowOf=id=>avData().rows.find(r=>r.id===id);
/* lunes del calendario (no el de la configuración del proyecto: si cambiara, un mismo día quedaría en dos documentos) */
const avMon=d=>addD(d,-((pd(d).getUTCDay()+6)%7));
/** semanas (lunes a domingo) del rango de la partida */
function avWeeks(p){const t=todayIso();const d0=p.d0||addD(t,-7),d1=p.d1&&p.d1>=d0?p.d1:addD(d0,41);const W=[];for(let m=avMon(d0);m<=d1&&W.length<104;m=addD(m,7))W.push({m,n:weekOf(m),days:[0,1,2,3,4,5,6].map(i=>addD(m,i))});return{W,d0,d1,t}}
const avLoc=r=>{const a=r.amb?avAmb(r.amb):null,s=r.sec?avSec(r.sec):null;return a?(a.name||a.code||'Ambiente'):r.amb?(r.an?r.an+' (ya no existe)':'Ambiente eliminado'):s?(s.name||s.code||'Sector')+' (todo el sector)':'Todo el piso'};
/** árbol de un piso: filas sueltas del piso y sus sectores, cada uno con sus filas sueltas y sus ambientes. `xa` = lugares pedidos
    con «＋ agregar…» que aún no tienen filas (para que aparezca su línea en blanco) */
function avTree(pid,rows,xa){const rp=rows.filter(r=>r.piso===pid),X=xa.filter(x=>x.piso===pid),secs=new Map();
  const sec=id=>{let s=secs.get(id);if(!s){const o=id?avSec(id):null;s={id,nom:o?(o.name||o.code||'Sector'):'Sin sector',ord:o?(o.order||0):9e9,direct:[],gho:false,ambs:new Map()};secs.set(id,s)}return s};
  const amb=(s,id,an)=>{let a=s.ambs.get(id);if(!a){const o=avAmb(id);a={id,nom:o?(o.name||o.code||'Ambiente'):(an?an+' (ya no existe)':'Ambiente eliminado'),ord:o?(o.order||0):9e9,rows:[]};s.ambs.set(id,a)}return a};
  const T={direct:[],gho:false,secs:[]};
  rp.forEach(r=>{if(r.amb)amb(sec(r.sec),r.amb,r.an).rows.push(r);else if(r.sec)sec(r.sec).direct.push(r);else T.direct.push(r)});
  X.forEach(x=>{if(x.amb){const a=avAmb(x.amb);amb(sec((a&&a.sectorId)||''),x.amb,'')}else if(x.sec)sec(x.sec).gho=true;else T.gho=true});
  T.secs=[...secs.values()].sort((a,b)=>a.ord-b.ord||a.nom.localeCompare(b.nom,'es',{numeric:true}));
  T.secs.forEach(s=>{s.ambs=[...s.ambs.values()].sort((a,b)=>a.ord-b.ord||a.nom.localeCompare(b.nom,'es',{numeric:true}));s.rows=s.direct.concat(...s.ambs.map(a=>a.rows))});
  /* con un solo sector y sin filas a nivel de sector, el nivel «sector» no aporta: los ambientes van directo bajo el piso */
  T.showSec=T.secs.length>1||T.secs.some(s=>s.direct.length||s.gho);T.rows=rp;return T}

/* ---------- pantalla ---------- */
function renderAReg(main){ensureAv();const p=avCur();avSubData(p?p.id:'');
  /* si alguien está escribiendo en una celda y llega un dato, no se redibuja encima: se redibuja al salir de la celda */
  const ae=document.activeElement,inm=ae&&ae.classList&&main.contains(ae),ed=inm&&ae.classList.contains('aved'),gh=inm&&ae.classList.contains('avgh');
  if(ed&&ae.textContent.trim()!==(ae.dataset.o||'')){AV.pend=true;return}
  if(gh&&[...ae.parentElement.querySelectorAll('.gd,.gq')].some(c=>c.textContent.trim())){AV.pend=true;return}
  if(inm&&ae.matches('input[data-avin]')&&ae.value!==ae.defaultValue){AV.pend=true;return}
  const fk=ed?ae.dataset.k:null;if(gh&&!AV.gf)AV.gf={g:ae.parentElement.dataset.g,c:ae.classList.contains('gq')?'gq':ae.classList.contains('gu')?'gu':'gd'};
  const box=main.querySelector('.avbox'),st=box?[box.scrollTop,box.scrollLeft]:null;
  if(AV.cel==null)AV.cel=isMob();const cfg=avaCfg(),parts=avParts(),pct=!!U.avPct;
  let h=`<div class="scroll"><div class="avpage">`;
  if(!avOk)h+=`<div class="empty">Cargando partidas…</div>`;
  else if(!p)h+=`<div class="empty"><b>Todavía no hay partidas.</b><br>${cfg?'Crea la primera: solo necesita un nombre y sus fechas.<br><br><button class="ib pri" data-av="new">＋ Partida</button>':'El administrador o un ingeniero de producción las crea.'}</div>`;
  else{const D=avData();if(AV.key!==p.id){AV.key=p.id;AV.C=new Set();AV.cinit=false;AV.wkO=null;AV.grp=null;AV.xa=[]}
    const ps=pisos(),rows=D.rows.filter(r=>S.pis.has(r.piso)||ARCH.pis.has(r.piso));
    h+=`<div class="avbar"><select class="tin" id="avp" aria-label="Partida">${parts.map(x=>`<option value="${esc(x.id)}"${x.id===p.id?' selected':''}>${esc(x.nom)}</option>`).join('')}</select>
      <select class="tin" id="avpiso" aria-label="Piso"><option value="">Todos los pisos</option>${pisoOptsZG(ps,U.piso)}</select>
      <span class="seg" role="group" aria-label="Cómo se ven y se tipean las celdas"><button type="button" data-avpct="0" class="${pct?'':'on'}">Cantidad</button><button type="button" data-avpct="1" class="${pct?'on':''}">%</button></span>
      <span class="avtot">${rows.length?`Avance: <b>${avPc(avGrpPct(D.ex,rows))}</b>`:''}</span><span class="avsp"></span>
      ${cfg?`<button class="ib pri" data-av="new">＋ Partida</button><button class="ib" data-av="edit" title="Nombre y fechas de la partida">✎</button>${avReady(p)?'<button class="ib" data-av="imp">Importar…</button>':''}`:''}
      <span class="seg" role="group" aria-label="Vista"><button type="button" data-avv="0" class="${AV.cel?'':'on'}">Planilla</button><button type="button" data-avv="1" class="${AV.cel?'on':''}">Celular</button></span></div>`;
    if(!avReady(p))h+=`<div class="empty">Cargando la planilla…</div>`;
    else h+=AV.cel?avCelHtml(p,D,rows):avGridHtml(p,D,rows)}
  main.innerHTML=h+'</div></div>';
  main.onclick=avClick;main.onchange=avChange;main.onkeydown=avKey;main.oncontextmenu=avCtx;
  /* focusin/focusout no tienen propiedad on…: se escuchan una sola vez por <main> (los manejadores revisan U.tab) */
  if(!main.__avf){main.__avf=true;main.addEventListener('focusout',avBlur);main.addEventListener('focusin',avFocus)}
  const b2=main.querySelector('.avbox');if(b2&&st){b2.scrollTop=st[0];b2.scrollLeft=st[1]}
  else if(b2){const th=b2.querySelector('th.hoy');if(th)b2.scrollLeft=Math.max(0,th.offsetLeft+th.offsetWidth*3-b2.clientWidth)}/* al entrar, el día de hoy queda a la vista */
  if(fk){const el=main.querySelector(`.aved[data-k="${CSS.escape(fk)}"]`);if(el)el.focus({preventScroll:true})}
  else if(AV.gf){const tr=[...main.querySelectorAll('tr.avgho[data-g]')].find(x=>x.dataset.g===AV.gf.g),el=tr&&tr.querySelector('.'+AV.gf.c);AV.gf=null;if(el)el.focus()}}

function avVisPisos(rows,xa){const has=new Set(rows.map(r=>r.piso).concat(xa.map(x=>x.piso)));const all=[...pisos(),...ARCH.pis.values()];return all.filter(x=>(has.has(x.id)||avaCfg()&&S.pis.has(x.id))&&(!U.piso||x.id===U.piso))}
const avFrac=(ex,r)=>String(r.und).trim().toLowerCase()==='und'&&avEtOf(r).some(e=>Object.values((ex[r.id]||{})[e.id]||{}).some(q=>Math.abs(q-Math.round(q))>1e-6));
const avOver=(ex,r)=>avEtOf(r).some(e=>avAcc(ex,r.id,e.id)>r.q+1e-9);
function avGridHtml(p,D,rows){const ex=D.ex,C=avWeeks(p),reg=avaReg(),cfg=avaCfg(),pct=!!U.avPct,any=rows.some(avHasEt);
  if(!AV.wkO){AV.wkO=new Set([avMon(C.t),addD(avMon(C.t),-7)]);if(!C.W.some(w=>AV.wkO.has(w.m))&&C.W[0])AV.wkO.add(C.W[0].m)}
  const vp=avVisPisos(rows,AV.xa);if(!AV.cinit){AV.cinit=true;if(rows.length>80)vp.slice(1).forEach(x=>AV.C.add(x.id))}/* con muchas filas solo se abre el primer piso */
  const wo=w=>AV.wkO.has(w.m),dcls=d=>d===C.t?' hoy':nwReason(d)?' nw':'',can=d=>reg&&(d===AV_INI||(d>=C.d0&&d<=C.d1&&d<=C.t));
  const ncol=(any?8:7)+C.W.reduce((s,w)=>s+(wo(w)?8:1),0),ind=n=>`<i class="avi" style="width:${n*14}px"></i>`;
  /* Und, Metrado, Peso, Acum. y % quedan fijas a la izquierda junto a la descripción (en pantallas angostas solo la descripción) */
  const wide=innerWidth>=1000,SW=[58,100].concat(any?[72]:[],[98,128]);let sx=290;const SK=SW.map(w=>{const o=wide?{c:' avsk',a:` style="left:${sx}px;min-width:${w}px;max-width:${w}px"`}:{c:'',a:''};sx+=w;return o}),kU=SK[0],kQ=SK[1],kW=any?SK[2]:null,kA=SK[any?3:2],kP=SK[any?4:3];
  let h=`<div class="avbox"><table class="avgr"><thead><tr><th rowspan="2" class="avs0">Piso › sector › ambiente › descripción</th><th rowspan="2" class="${kU.c}"${kU.a}>Und</th><th rowspan="2" class="num${kQ.c}"${kQ.a}>Metrado</th>${any?`<th rowspan="2" class="num${kW.c}"${kW.a} title="Peso de cada etapa dentro de su fila">Peso</th>`:''}<th rowspan="2" class="num${kA.c}"${kA.a}>Acum.</th><th rowspan="2" class="${kP.c}"${kP.a}>% avance</th><th rowspan="2">Alerta</th><th rowspan="2" class="num" title="Lo ejecutado antes de empezar el registro diario">Corte inicial${p.corte?'<br>'+fmtD(p.corte):''}</th>`;
  C.W.forEach(w=>h+=`<th class="avwk" data-avwk="${w.m}" colspan="${wo(w)?8:1}" title="Clic para plegar o desplegar la semana">${wo(w)?'▾':'▸'} Semana ${w.n} · ${fmtD(w.days[0])} – ${fmtD(w.days[6])}</th>`);h+='</tr><tr>';
  C.W.forEach(w=>{if(wo(w))w.days.forEach((d,i)=>h+=`<th class="num${dcls(d)}" title="${esc(nwReason(d)||'')}">${'LMXJVSD'[i]} ${d.slice(8)}</th>`);h+='<th class="num">total</th>'});h+='</tr></thead><tbody>';
  const edc=(k,txt,cls,ok,at='')=>ok?`<td class="num aved${cls}"${at} contenteditable="true" inputmode="decimal" data-k="${esc(k)}" data-o="${esc(txt)}">${esc(txt)}</td>`:`<td class="num${cls}"${at}>${esc(txt)}</td>`;const wtd=kW?`<td class="${kW.c}"${kW.a}></td>`:'';
  /* celdas de días: fn(d) → valor a mostrar (número) ; con `ek` son editables */
  const days=(fn,ek)=>{let t='';const c=(d,x)=>{const v=fn(d),txt=ek?(pct?avE1(v):avE(v)):(v?avF(v):'');return ek?edc(ek+'|'+d,txt,x,can(d)):`<td class="num avro${x}">${txt}</td>`};
    t+=c(AV_INI,'');C.W.forEach(w=>{if(wo(w))w.days.forEach(d=>t+=c(d,dcls(d)));const s=w.days.reduce((a,d)=>a+(fn(d)||0),0);t+=`<td class="num avwt">${s?avF(s):''}</td>`});return t};
  const grp=(cls,lab,rs,key,dep)=>{const sm=avSame(rs),v=avGrpPct(ex,rs),t=avSumQ(rs),o=!AV.C.has(key),n=rs.filter(r=>avOver(ex,r)||avFrac(ex,r)).length;
    return`<tr class="${cls}" data-avcol="${esc(key)}"><td class="avs0" title="${esc(lab)}">${ind(dep)}${o?'▾':'▸'} ${esc(lab)}</td><td class="${kU.c}"${kU.a}>${!rs.length?'':sm?esc(rs[0].und):'<span class="avmu">varias</span>'}</td><td class="num${kQ.c}"${kQ.a}>${sm&&rs.length?avF(t):''}</td>${wtd}<td class="num${kA.c}"${kA.a}>${sm&&rs.length?avF(v*t):''}</td><td class="avpc${kP.c}"${kP.a}>${rs.length?avBar(v):''}</td><td>${n?`<span class="avtg w">⚠ ${n}</span>`:''}</td>${days(d=>!rs.length?0:pct?avGrpDay(ex,rs,d)*100:sm?avGrpDay(ex,rs,d)*t:0)}</tr>`};
  const row=(r,dep)=>{const v=avRowPct(ex,r),he=avHasEt(r);let al='';if(avOver(ex,r))al+='<span class="avtg w">supera el metrado</span>';if(avFrac(ex,r))al+='<span class="avtg">fracción de unidad</span>';
    let t=`<tr class="avrw${he?' avmad':''}"><td class="avs0" title="${esc(r.desc)}">${ind(dep)}${esc(r.desc)}${cfg?`<button type="button" class="avmb" data-avm="${esc(r.id)}" title="Etapas y opciones de la fila" aria-label="Opciones de la fila">⋯</button>`:''}</td>${cfg?`<td class="aved avtx${kU.c}"${kU.a} contenteditable="true" data-k="u|${esc(r.id)}" data-o="${esc(r.und)}">${esc(r.und)}</td>`:`<td class="${kU.c}"${kU.a}>${esc(r.und)}</td>`}${edc('q|'+r.id,avE(r.q),kQ.c,cfg,kQ.a)}${wtd}<td class="num${kA.c}"${kA.a}>${avF(v*r.q)}</td><td class="avpc${kP.c}"${kP.a}>${avBar(v)}</td><td class="aval">${al}</td>`;
    t+=he?days(d=>avRowDay(ex,r,d)*(pct?100:r.q)):days(d=>avCell(ex,r.id,AV_E0,d)*(pct?(r.q?100/r.q:0):1),'c|'+r.id+'|'+AV_E0);t+='</tr>';
    if(he){const sw=avSumW(r);r.et.forEach(e=>{const a=avAcc(ex,r.id,e.id);t+=`<tr class="avet"><td class="avs0">${ind(dep+1)}↳ ${esc(e.n)}</td><td class="${kU.c}"${kU.a}></td><td class="${kQ.c}"${kQ.a}></td>${edc('w|'+r.id+'|'+e.id,avE((+e.w||0)/sw*100),kW.c,cfg,kW.a)}<td class="num${kA.c}"${kA.a}>${avF(a)}</td><td class="avpc${kP.c}"${kP.a}>${avBar(r.q?Math.min(a/r.q,1):0)}</td><td>${a>r.q+1e-9?'<span class="avtg w">supera</span>':''}</td>${days(d=>avCell(ex,r.id,e.id,d)*(pct?(r.q?100/r.q:0):1),'c|'+r.id+'|'+e.id)}</tr>`})}return t};
  const gho=(g,dep,und)=>cfg?`<tr class="avgho" data-g="${esc(g)}"><td class="avs0 avgh gd" contenteditable="true" data-ph="＋ nueva fila: escribe la descripción" style="padding-left:${7+dep*14}px"></td><td class="avgh gu${kU.c}"${kU.a} contenteditable="true">${esc(und)}</td><td class="num avgh gq${kQ.c}"${kQ.a} contenteditable="true" inputmode="decimal" data-ph="metrado"></td><td colspan="${ncol-3}" class="avmu">Enter para agregarla y seguir con otra</td></tr>`:'';
  const last=rs=>rs.length?rs[rs.length-1].und:'und';
  vp.forEach(pi=>{const T=avTree(pi.id,rows,AV.xa);h+=grp('avpi',pi.name,T.rows,pi.id,0);if(AV.C.has(pi.id))return;
    T.direct.forEach(r=>h+=row(r,1));if(T.direct.length||T.gho)h+=gho(pi.id+'||',1,last(T.direct));
    T.secs.forEach(s=>{let dep=1;if(T.showSec){const ks=pi.id+'|'+s.id;h+=grp('avse',s.nom,s.rows,ks,1);if(AV.C.has(ks))return;dep=2;s.direct.forEach(r=>h+=row(r,2));if(s.direct.length||s.gho)h+=gho(pi.id+'|'+s.id+'|',2,last(s.direct))}
      s.ambs.forEach(a=>{const ka=pi.id+'|'+s.id+'|'+a.id;h+=grp('avam',a.nom,a.rows,ka,dep);if(AV.C.has(ka))return;a.rows.forEach(r=>h+=row(r,dep+1));h+=gho(pi.id+'||'+a.id,dep+1,last(a.rows))})});
    if(cfg&&S.pis.has(pi.id)){const used=new Set(T.rows.map(r=>r.amb).concat(AV.xa.map(x=>x.amb)).filter(Boolean)),ss=[...S.sec.values()].filter(s=>s.pisoId===pi.id).sort(byOrder);
      h+=`<tr class="avgho"><td class="avs0" style="padding-left:21px"><select class="avadd" data-avadd="${esc(pi.id)}" aria-label="Agregar un ambiente a ${esc(pi.name)}"><option value="">＋ agregar ambiente a ${esc(pi.name)}…</option>${ss.map(s=>{const L=[...S.amb.values()].filter(a=>a.sectorId===s.id&&!used.has(a.id)).sort(byOrder);return`<optgroup label="${esc(s.name||s.code||'Sector')}">${L.map(a=>`<option value="A:${esc(a.id)}">${esc(a.name||a.code||a.id)}</option>`).join('')}<option value="S:${esc(s.id)}">(todo el sector: fila sin ambiente)</option></optgroup>`}).join('')}<option value="P:">(todo el piso: fila sin ambiente)</option></select></td><td colspan="${ncol-1}"></td></tr>`}});
  return h+`</tbody></table></div><p class="avnote">${reg?`Escribe en cada día ${pct?'el porcentaje':'la cantidad'} ejecutado. Enter baja a la fila siguiente; clic derecho (o mantener el dedo) en una celda muestra su historial. `:''}${cfg?'Para agregar una fila, escribe en la línea «＋ nueva fila» de su ambiente. «⋯» en una fila: etapas y más opciones. ':''}Clic en una semana o en un grupo para plegarlo.</p>`}
/** celular: piso → lugar → filas (o etapas) con lo ejecutado del día */
function avCelGroups(pid,rows){const T=avTree(pid,rows,[]),G=[];if(T.direct.length)G.push({k:'P',nom:'Todo el piso',rows:T.direct});
  T.secs.forEach(s=>{if(s.direct.length)G.push({k:'S'+s.id,nom:s.nom+' (todo el sector)',rows:s.direct});s.ambs.forEach(a=>G.push({k:'A'+a.id,nom:a.nom,sub:T.showSec?s.nom:'',rows:a.rows}))});return G}
function avCelHtml(p,D,rows){const ex=D.ex,reg=avaReg(),t=todayIso(),pct=!!U.avPct;if(AV.day!==addD(t,-1))AV.day=t;const d=AV.day;
  const all=[...pisos(),...ARCH.pis.values()].filter(x=>rows.some(r=>r.piso===x.id)),cp=all.find(x=>x.id===U.piso)||all[0];
  if(!cp)return'<div class="empty"><b>Esta partida aún no tiene filas.</b><br>Se agregan en la vista Planilla.</div>';const G=avCelGroups(cp.id,rows);let h=`<div class="avcel">`;
  const dsel=`<span class="seg" role="group" aria-label="Día"><button type="button" data-avd="${t}" class="${d===t?'on':''}">Hoy ${fmtD(t)}</button><button type="button" data-avd="${addD(t,-1)}" class="${d!==t?'on':''}">Ayer</button></span>`;
  const g=G.find(x=>x.k===AV.grp);
  if(!g){h+=`<div class="avch"><b>${esc(cp.name)}</b>${U.piso?'':'<span>Elige otro piso arriba</span>'}</div>${dsel}`;
    G.forEach(x=>{const v=avGrpPct(ex,x.rows);h+=`<button type="button" class="avcard" data-avgrp="${esc(x.k)}"><span><b>${esc(x.nom)}</b><small>${x.sub?esc(x.sub)+' · ':''}${v>=1?'100 % ✓':avPc(v)} · ${x.rows.length} fila${x.rows.length===1?'':'s'}</small></span><i aria-hidden="true">›</i></button>`})}
  else{const ok=reg&&d>=(p.d0||d)&&d<=(p.d1||d);h+=`<button type="button" class="ib" data-avgrp="">‹ ${esc(g.nom)}</button><div class="avch"><span>${esc(cp.name)} · en ${pct?'porcentaje':'cantidad'}</span></div>${dsel}`;
    g.rows.forEach(r=>avEtOf(r).forEach(e=>{const a=avAcc(ex,r.id,e.id),c=avCell(ex,r.id,e.id,d),k=r.id+'|'+e.id,val=pct?avE1(r.q?c/r.q*100:0):avE(c);h+=`<div class="avcrow"><span><b>${esc(r.desc)}</b>${e.id!==AV_E0||avHasEt(r)?' · '+esc(e.n):''}<small>${avF(a)} de ${avF(r.q)} ${esc(r.und)} · ${avPc(r.q?Math.min(a/r.q,1):0)}</small></span>
      ${ok?`<span class="avstp"><button type="button" data-avst="-1" data-r="${esc(k)}" aria-label="Menos">−</button><input type="number" inputmode="decimal" min="0" step="any" data-avin="${esc(k)}" data-fk="avin-${esc(k)}" value="${val}" aria-label="${pct?'Porcentaje':'Cantidad'} del día"><button type="button" data-avst="1" data-r="${esc(k)}" aria-label="Más">+</button></span>`:`<b class="mono">${val||'0'}${pct?' %':''}</b>`}</div>`}));
    if(ok)h+=`<button type="button" class="ib pri" data-av="todo">Todo lo que falta</button><p class="avnote">Cada toque en + suma ${pct?'10 %':'1'}.</p>`;else if(reg)h+='<p class="avnote">Ese día está fuera del rango de fechas de la partida.</p>'}
  return h+'</div>'}

/* ---------- escritura ---------- */
const avMRef=(p,piso)=>fcol('avm').doc(p.id+'_'+piso);
function avRowPatch(p,row,patch){const w=avWho();
  /* se refleja al instante en memoria (la foto de la base llega después con lo mismo): «⋯» puede redibujarse sin esperar */
  if(avSubP===p.id){const did=p.id+'_'+row.piso,m=AVM.get(did)||{id:did,p:p.id,piso:row.piso,r:{}};AVM.set(did,{...m,r:{...(m.r||{}),[row.id]:{...((m.r||{})[row.id]||{}),...patch}}});AV.v++}
  return bgWrite(avMRef(p,row.piso).set({p:p.id,piso:row.piso,r:{[row.id]:patch},by:w.by,t:w.t},{merge:true}))}
function avPutCell(p,row,etId,d,q,old){const wk=d===AV_INI?AV_INI:avMon(d),id=`${p.id}_${row.piso}_${wk}`,w=avWho();
  return bgWrite(fcol('ava').doc(id).set({p:p.id,piso:row.piso,w:wk,c:{[d]:{[row.id]:{[etId]:q}}},log:firebase.firestore.FieldValue.arrayUnion({d,r:row.id,e:etId,q,a:old,...w}),by:w.by,t:w.t},{merge:true}))}
/** guarda la cantidad de un día; si el acumulado supera el metrado pide confirmar (avisa, no bloquea) */
async function avSetCell(row,etId,d,q){const p=avCur();if(!p||!row||!avaReg()||!avReady(p))return false;const ex=avData().ex,old=avCell(ex,row.id,etId,d);q=avR4(q);if(Math.abs(q-old)<1e-9)return true;
  const tot=avAcc(ex,row.id,etId)-old+q;if(q>old&&tot>row.q+1e-9){const e=avEtOf(row).find(x=>x.id===etId);
    if(!await uiAsk({title:'Supera el metrado',text:`${row.desc}${e&&e.n?' · '+e.n:''} (${avLoc(row)}): el acumulado sería ${avF(tot)} y el metrado es ${avF(row.q)} ${row.und}.`,ok:'Guardar igual',tone:'warn'}))return false}
  avPutCell(p,row,etId,d,q,old);return true}
/** fila nueva desde la línea en blanco de la planilla */
function avAddRow(g,desc,und,q){const p=avCur();if(!p||!avaCfg()||!avReady(p))return false;const[piso,sec,amb]=g.split('|');const a=amb?S.amb.get(amb):null;
  const row={id:avNid('r'),piso};avRowPatch(p,row,{amb:amb||'',sec:amb?'':sec||'',desc:desc.slice(0,160),und:(und||'und').slice(0,10),q:avR4(q),et:null,o:NOW(),an:a?a.name||'':''});
  AV.xa=AV.xa.filter(x=>!(x.piso===piso&&x.sec===(sec||'')&&x.amb===(amb||'')));return true}

/* ---------- eventos ---------- */
function avFocus(e){const t=e.target;if(U.tab!=='areg'||!t.classList||!t.classList.contains('aved'))return;const r=document.createRange();r.selectNodeContents(t);const s=getSelection();s.removeAllRanges();s.addRange(r)}
function avGhoTry(tr,next){const d=tr.querySelector('.gd').textContent.trim(),u=tr.querySelector('.gu').textContent.trim(),qt=tr.querySelector('.gq').textContent.trim(),q=avNum(qt);
  if(!d||!(q>0)||!/^[\d\s.,]+$/.test(qt))return false;if(!avAddRow(tr.dataset.g,d,u,q))return false;tr.querySelectorAll('.gd,.gq').forEach(c=>c.textContent='');if(next)AV.gf={g:tr.dataset.g,c:'gd'};AV.pend=false;requestRender();return true}
async function avBlur(e){const t=e.target;if(U.tab!=='areg'||!t.classList)return;
  if(t.classList.contains('avgh')){const tr=t.parentElement;setTimeout(()=>{if(tr.isConnected&&!tr.contains(document.activeElement)){if(!avGhoTry(tr,false)&&AV.pend&&![...tr.querySelectorAll('.gd,.gq')].some(c=>c.textContent.trim())){AV.pend=false;requestRender()}}},0);return}
  if(!t.classList.contains('aved'))return;const txt=t.textContent.trim(),o=t.dataset.o||'';
  const done=()=>{AV.pend=false;requestRender()};if(txt===o){if(AV.pend)done();return}
  const k=t.dataset.k.split('|'),row=avRowOf(k[1]),p=avCur();if(!row||!p){t.textContent=o;done();return}
  if(k[0]==='u'){if(!txt||!avaCfg()){t.textContent=o;done();return}t.dataset.o=txt;avRowPatch(p,row,{und:txt.slice(0,10)});done();return}
  const v=txt===''?0:avNum(txt),bad=txt!==''&&(!/^[\d\s.,%]+$/.test(txt)||!Number.isFinite(v)||v<0);
  if(bad){t.textContent=o;toast('Escribe solo un número (p. ej. 12 o 6.5).');done();return}
  t.dataset.o=txt;/* ya no se considera «a medio escribir»: lo que llegue puede redibujar */
  if(k[0]==='q'){if(!await avSetQ(row,v)){t.dataset.o=o;t.textContent=o}}
  else if(k[0]==='w'){if(!(v>0&&v<100)){t.dataset.o=o;t.textContent=o;toast('El peso de una etapa va entre 0 y 100; las demás se reparten el resto.')}else avRowPatch(p,row,{et:avSetW(row.et,k[2],v)})}
  else if(!await avSetCell(row,k[2],k[3],U.avPct?v/100*row.q:v)){t.dataset.o=o;t.textContent=o}
  done()}
async function avSetQ(row,v){const p=avCur();if(!p||!avaCfg())return false;
  if(!(v>0)){toast('El metrado debe ser mayor que 0. Para quitar la fila usa «⋯».');return false}avRowPatch(p,row,{q:avR4(v)});return true}
function avKey(e){const t=e.target;if(U.tab!=='areg'||!t.classList)return;
  if(t.classList.contains('avgh')){if(e.key==='Enter'){e.preventDefault();const tr=t.parentElement;if(t.classList.contains('gq')){if(!avGhoTry(tr,true))tr.querySelector('.gd').focus()}else tr.querySelector('.gq').focus()}
    else if(e.key==='Escape'){t.parentElement.querySelectorAll('.gd,.gq').forEach(c=>c.textContent='');t.blur()}return}
  if(!t.classList.contains('aved'))return;
  if(e.key==='Escape'){t.textContent=t.dataset.o||'';t.blur();return}
  if(e.key!=='Enter'&&e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const up=e.key==='ArrowUp',key=t.dataset.k.split('|'),suf=key[0]==='c'?'|'+key[3]:'';let tr=t.parentElement;
  /* misma columna en la fila editable siguiente (las filas madre y los grupos se saltan) */
  for(;;){tr=up?tr.previousElementSibling:tr.nextElementSibling;if(!tr){t.blur();return}const c=[...tr.querySelectorAll('.aved')].find(x=>{const k=x.dataset.k.split('|');return k[0]===key[0]&&(key[0]!=='c'||'|'+k[3]===suf)});if(c){c.focus();return}}}
/** historial de una celda: quién registró y cuándo */
function avCtx(e){const t=e.target.closest&&e.target.closest('.aved[data-k^="c|"]');if(U.tab!=='areg'||!t)return;e.preventDefault();const p=avCur(),k=t.dataset.k.split('|'),row=avRowOf(k[1]);if(!p||!row)return;
  const d=k[3],doc=AVD.get(`${p.id}_${row.piso}_${d===AV_INI?AV_INI:avMon(d)}`),L=((doc&&doc.log)||[]).filter(x=>x.d===d&&x.r===row.id&&x.e===k[2]).sort((a,b)=>b.t-a.t);
  const hm=ms=>{const x=new Date(ms-5*36e5);return fmtD(x.toISOString().slice(0,10))+' '+x.toISOString().slice(11,16)};
  openPop(t,`<div class="ph">Historial · ${d===AV_INI?'corte inicial':fmtD(d)}</div><div class="avhist">${L.length?L.map(x=>`<div><b>${avF(x.a)} → ${avF(x.q)} ${esc(row.und)}</b><span>${esc(x.n||String(x.by||'').split('@')[0])} · ${hm(x.t)}</span></div>`).join(''):'<div><span>Sin cambios registrados.</span></div>'}</div>`,{})}
function avChange(e){const t=e.target;if(U.tab!=='areg')return;
  if(t.id==='avp'){U.avP=t.value;saveUI();requestRender();return}
  if(t.id==='avpiso'){U.piso=t.value;AV.grp=null;saveUI();requestRender();return}
  if(t.dataset&&t.dataset.avadd){const v=t.value;if(!v)return;const piso=t.dataset.avadd,x={piso,sec:v[0]==='S'?v.slice(2):'',amb:v[0]==='A'?v.slice(2):''};AV.xa.push(x);AV.gf={g:piso+'|'+x.sec+'|'+x.amb,c:'gd'};
    const a=x.amb&&S.amb.get(x.amb);AV.C.delete(piso);if(a){AV.C.delete(piso+'|'+a.sectorId);AV.C.delete(piso+'|'+a.sectorId+'|'+a.id)}else if(x.sec)AV.C.delete(piso+'|'+x.sec);requestRender();return}
  if(t.dataset&&t.dataset.avin){const k=t.dataset.avin.split('|'),row=avRowOf(k[0]),v=t.value===''?0:avNum(t.value);if(!row||!(v>=0)){requestRender();return}avSetCell(row,k[1],AV.day,U.avPct?v/100*row.q:v).then(()=>requestRender())}}
function avClick(e){if(U.tab!=='areg')return;const g=a=>{const el=e.target.closest('['+a+']');return el?el.getAttribute(a):null};let v;
  if((v=g('data-avm'))){avRowMenu(v);return}
  if(e.target.closest('.aved,.avgh,.avadd'))return;
  if((v=g('data-avv'))!=null){AV.cel=v==='1';AV.grp=null}
  else if((v=g('data-avpct'))!=null){U.avPct=v==='1';saveUI()}
  else if((v=g('data-avwk'))){AV.wkO.has(v)?AV.wkO.delete(v):AV.wkO.add(v)}
  else if((v=g('data-avcol'))){AV.C.has(v)?AV.C.delete(v):AV.C.add(v)}
  else if((v=g('data-avd'))){AV.day=v}
  else if((v=g('data-avgrp'))!=null){AV.grp=v||null}
  else if((v=g('data-avst'))){const b=e.target.closest('[data-avst]'),k=b.dataset.r.split('|'),row=avRowOf(k[0]);if(!row)return;const c=avCell(avData().ex,row.id,k[1],AV.day),step=U.avPct?row.q/10:1;avSetCell(row,k[1],AV.day,Math.max(0,c+ +v*step)).then(()=>requestRender());return}
  else if((v=g('data-av'))){if(v==='new')avPartDlg(null);else if(v==='edit')avPartDlg(avCur());else if(v==='imp')avImpOpen();else if(v==='todo')avTodo();return}
  else return;requestRender()}
/** celular: completa de un toque lo que falta en el lugar abierto */
function avTodo(){const p=avCur(),D=avData();if(!p||!avaReg()||!avReady(p))return;const all=[...pisos(),...ARCH.pis.values()].filter(x=>D.rows.some(r=>r.piso===x.id)),cp=all.find(x=>x.id===U.piso)||all[0];if(!cp)return;
  const g=avCelGroups(cp.id,D.rows).find(x=>x.k===AV.grp);if(!g)return;let n=0;
  g.rows.forEach(r=>avEtOf(r).forEach(e=>{const fa=r.q-avAcc(D.ex,r.id,e.id);if(fa>1e-9){const c=avCell(D.ex,r.id,e.id,AV.day);avPutCell(p,r,e.id,AV.day,avR4(c+fa),c);n++}}));
  toast(n?`Completado: ${n} fila${n===1?'':'s'}`:'No faltaba nada aquí');requestRender()}

/* ---------- partida: solo nombre y fechas ---------- */
function avPartDlg(p){if(!avaCfg())return;const t=todayIso(),f={nom:p?p.nom:'',d0:(p&&p.d0)||avMon(t),d1:(p&&p.d1)||addD(t,90),corte:(p&&p.corte)||addD(avMon(t),-1)};
  lqModal(`<div class="avh"><b>${p?'Editar partida':'Nueva partida'}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>
  <label class="avf">Nombre<input class="tin" id="avfnom" maxlength="60" value="${esc(f.nom)}" placeholder="p. ej. Mobiliario, Pintura, Enchape…"></label>
  <div class="avf3"><label class="avf">Inicio del registro<input class="tin" type="date" id="avfd0" value="${esc(f.d0)}"></label><label class="avf">Fin<input class="tin" type="date" id="avfd1" value="${esc(f.d1)}"></label><label class="avf">Fecha del corte inicial<input class="tin" type="date" id="avfco" value="${esc(f.corte)}"></label></div>
  <p class="avnote">Eso es todo. Las filas, sus unidades y sus etapas se agregan después en la misma planilla.</p>
  <div class="avact">${p?'<button type="button" class="ib" data-avfk="arch">Archivar partida</button>':''}<span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cancelar</button><button type="button" class="ib pri" data-avfk="ok">${p?'Guardar':'Crear partida'}</button></div>`,
  async e=>{const b=e.target.closest('[data-avfk]');if(!b)return;
    if(b.dataset.avfk==='arch'){if(!await uiAsk({title:'¿Archivar esta partida?',text:'Deja de verse en el módulo; sus filas y su avance se conservan.',ok:'Archivar',tone:'warn'}))return;bgWrite(fcol('avp').doc(p.id).update({arch:avWho()}));lqClose();toast('Partida archivada');requestRender();return}
    const nom=$('#avfnom').value.trim(),d0=$('#avfd0').value,d1=$('#avfd1').value,corte=$('#avfco').value;if(!nom){toast('Ponle un nombre a la partida.');return}if(!d0||!d1||d1<d0){toast('Revisa las fechas: el fin no puede ser anterior al inicio.');return}
    const doc={v:2,nom:nom.slice(0,60),d0,d1,corte,...avWho()};
    if(p)bgWrite(fcol('avp').doc(p.id).update(doc));else{const id=uid('av');doc.ord=avParts().length;doc.arch=null;bgWrite(fcol('avp').doc(id).set(doc));U.avP=id;saveUI()}
    lqClose();toast(p?'Partida guardada':'Partida creada');requestRender()})}

/* ---------- «⋯» de una fila: descripción, etapas, quitar ---------- */
function avRowMenu(id){const p=avCur(),r=avRowOf(id);if(!p||!r||!avaCfg())return;const he=avHasEt(r),ex=avData().ex,others=avData().rows.filter(x=>x.id!==r.id&&!avHasEt(x)&&x.und===r.und).length;
  lqModal(`<div class="avh"><b>${esc(r.desc)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div><p class="avnote">${esc(avLoc(r))} · ${avF(r.q)} ${esc(r.und)}</p>
  <label class="avf">Descripción<span class="avfe"><input class="tin" id="avmd" maxlength="160" value="${esc(r.desc)}"><button type="button" class="ib" data-avmk="desc">Guardar</button></span></label>
  <label class="avf">Nueva etapa de esta fila<span class="avfe"><input class="tin" id="avme" maxlength="40" placeholder="p. ej. Empaste, 1.ª mano, Fragua…"><button type="button" class="ib pri" data-avmk="eta">＋ Etapa</button></span></label>
  <p class="avnote">${he?'Etapas: '+r.et.map(e=>esc(e.n)).join(', ')+'. Nacen con el mismo peso; se cambia en la columna «Peso».':'Sin etapas, la fila se llena directo. Al agregar la primera etapa, lo ya registrado en la fila pasa a esa etapa.'}</p>
  <div class="avmbt">${he&&others?`<button type="button" class="ib" data-avmk="copy">Aplicar estas etapas a las otras ${others} fila${others===1?'':'s'} en ${esc(r.und)} que no tienen etapas</button>`:''}${he?'<button type="button" class="ib" data-avmk="noet">Quitar las etapas de esta fila</button>':''}<button type="button" class="ib" data-avmk="del">Quitar la fila</button></div>`,
  async e=>{const b=e.target.closest('[data-avmk]');if(!b)return;const k=b.dataset.avmk,row=avRowOf(id);if(!row||!avReady(p)){lqClose();return}
    if(k==='desc'){const d=$('#avmd').value.trim();if(!d){toast('La descripción no puede quedar vacía.');return}avRowPatch(p,row,{desc:d.slice(0,160)});lqClose();toast('Descripción guardada');requestRender();return}
    if(k==='eta'){const n=$('#avme').value.trim();if(!n){$('#avme').focus();return}const cur=avHasEt(row)?row.et:[];if(cur.some(x=>mnk(x.n)===mnk(n))){toast('Esa etapa ya está en la fila.');return}
      /* la primera etapa toma el id de la fila sin etapas ('_'): lo ya registrado pasa a ella; las demás, un id que no se repite nunca */
      const w=cur.length?cur.reduce((s,x)=>s+(+x.w||0),0)/cur.length:1;await avRowPatch(p,row,{et:[...cur,{id:cur.length?avNid('e'):AV_E0,n:n.slice(0,40),w:Math.round(w*100)/100}]});AV.v++;avRowMenu(id);requestRender();return}
    if(k==='copy'){const tg=avData().rows.filter(x=>x.id!==row.id&&!avHasEt(x)&&x.und===row.und),w=avWho(),by=new Map();
      tg.forEach(x=>{const R=by.get(x.piso)||{};R[x.id]={et:row.et.map((s,i)=>({id:i?avNid('e')+i:AV_E0,n:s.n,w:s.w}))};by.set(x.piso,R)});
      const bt=db.batch();by.forEach((R,pi)=>bt.set(avMRef(p,pi),{p:p.id,piso:pi,r:R,by:w.by,t:w.t},{merge:true}));bgWrite(bt.commit());lqClose();toast(`Etapas aplicadas a ${tg.length} fila${tg.length===1?'':'s'}`);requestRender();return}
    if(k==='noet'){const lost=row.et.filter(s=>s.id!==AV_E0&&avAcc(ex,row.id,s.id)>0);
      if(!await uiAsk({title:'¿Quitar las etapas de esta fila?',text:lost.length?`La fila conserva lo registrado en «${row.et[0].n}». Lo de ${lost.map(s=>'«'+s.n+'»').join(', ')} queda en la base, pero deja de verse y de contar.`:'La fila vuelve a llenarse directo y conserva lo registrado en su primera etapa.',ok:'Quitar etapas',tone:lost.length?'danger':'warn'}))return;
      avRowPatch(p,row,{et:null});lqClose();requestRender();return}
    if(k==='del'){const has=avEtOf(row).some(s=>avAcc(ex,row.id,s.id)>0);
      if(!await uiAsk({title:'¿Quitar esta fila?',text:`${row.desc} (${avLoc(row)}).${has?' Tiene avance registrado: se conserva en la base, pero deja de contar.':''}`,ok:'Quitar fila',tone:has?'danger':'warn'}))return;
      avRowPatch(p,row,{arch:avWho()});lqClose();toast('Fila quitada');requestRender()}})}
