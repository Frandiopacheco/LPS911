"use strict";
/* LPS 911 · Matriz › Gráfico (antes «Plano»; oct 2026, decidido con el dueño; sin códigos sobre el plano y más transparente): sobre la lámina base del piso (las formas de Sectorización),
   resalta los ambientes donde una actividad (o toda la partida de un SC) está Pendiente (rojo) o En curso (ámbar), según la
   Matriz tal cual (lo «sin validar» también cuenta). Lo demás va sin color. Solo lectura: no cambia la Matriz.
   Modo «📍 Observaciones» (nov 2026): pines de las observaciones (punch list) y tocar un ambiente registra una (matriz-obs.js).
   Se arma una vez (el visor de la lámina no se destruye) y luego solo se actualizan sus partes.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
const MXPL={sel:'',vista:'',ob:'',obSc:'',pend:null};
/* modo «Observaciones» (U.mxPlOb, matriz-obs.js): naranja = ambiente con observaciones abiertas */
const MXPL_OB='#E8590C';
const MXPL_C={p:'#D64545',c:'#E0A01B',x:'#9AA3A8'};
/* actividades que existen en los ambientes del piso (oct 2026, pedido del dueño: la lista del Gráfico solo trae las del piso elegido);
   null = sin piso elegido: no se filtra */
function mxPlFloor(pid){if(!pid)return null;const cells=mxCells();const s=new Set();
  for(const t of szTree(pid))for(const{a}of t.ambs){const C=cells.get(a.id);if(C)for(const k in C)if(C[k])s.add(k)}
  return s}
/* SC que tienen actividades en el catálogo (el SC: solo los suyos); con `on` (mxPlFloor) solo los que tienen alguna en el piso */
function mxPlScs(on){const mine=SCK()?new Set(myScsI()):null;const s=new Set();for(const c of MX.cat.values()){if(c.arch||(on&&!on.has(c.id)))continue;for(const x of mxScsOf(c))if(!mine||mine.has(x))s.add(x)}
  return[...s].filter(x=>S.con.has(x)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))}
const mxPlCats=(sc,on)=>[...MX.cat.values()].filter(c=>!c.arch&&mxScsOf(c).includes(sc)&&(!on||on.has(c.id))).sort((a,b)=>(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name));
/* lámina: la base del piso con más ambientes dibujados (o la elegida) */
function mxPlBase(pid){const API=window.__plano;const bs=API&&API.basesOf?API.basesOf(pid):[];if(!bs.length)return{bs,v:''};if(bs.some(b=>b.id===MXPL.vista))return{bs,v:MXPL.vista};
  const n=b=>{let k=0;for(const t of szTree(pid))for(const{a}of t.ambs)if(szGeo(a,b.id))k++;return k};const best=bs.slice().sort((x,y)=>n(y)-n(x))[0];return{bs,v:best.id}}
/* estado de cada ambiente del piso: {k:'p'|'c'|'', p:[cat], c:[cat]} */
function mxPlState(pid,sc,cat){const cells=mxCells();const cats=cat==='*'?mxPlCats(sc).map(c=>c.id):[cat];const out=new Map();
  for(const t of szTree(pid))for(const{a}of t.ambs){const C=cells.get(a.id)||{};const p=[],c=[];for(const k of cats){const o=C[k];if(!o)continue;if(o.s==='p')p.push(k);else if(o.s==='c')c.push(k)}
    out.set(a.id,{a,s:t.s,k:p.length?'p':c.length?'c':'',p,c})}
  return out}
function renderMxPla(main,head){const pid=U.piso;const onF=mxPlFloor(pid);const scs=mxPlScs(onF);
  if(!scs.includes(U.mxPlSc))U.mxPlSc=scs[0]||'';const sc=U.mxPlSc;const cats=sc?mxPlCats(sc,onF):[];
  if(U.mxPlCat!=='*'&&!cats.some(c=>c.id===U.mxPlCat))U.mxPlCat=(cats[0]||{}).id||'';
  if(!$('#mxplmap',main)){main.innerHTML=`<div class="scroll"><div class="wrap mxwrap"><div id="mxplh"></div><div id="mxplf" class="fbar mxplf"></div><div id="mxplmsg"></div>
     <div class="mxplb" id="mxplb"><section class="mxplmw"><div class="szmap mxplmap" id="mxplmap"></div></section><aside class="mxpls" id="mxpls"></aside></div></div></div>`;
    main.onchange=e=>{const t=e.target;if(t.id==='mxplosc'){MXPL.obSc=t.value;MXPL.ob='';render();return}if(t.id==='mxplobl'){U.mxPlObL=t.checked;saveUI();render();return}if(t.id==='mxplsc'){U.mxPlSc=t.value;U.mxPlCat='';MXPL.sel='';saveUI();render()}else if(t.id==='mxplcat'){U.mxPlCat=t.value;MXPL.sel='';saveUI();render()}else if(t.id==='mxplv'){MXPL.vista=t.value;render()}};
    main.onclick=e=>{const b=e.target.closest('[data-mxpla]');if(b){MXPL.sel=MXPL.sel===b.dataset.mxpla?'':b.dataset.mxpla;render();return}
      const o=e.target.closest('[data-mobo]');if(o){MXPL.ob=o.dataset.mobo;mobOpen(o.dataset.mobo);render();return}
      const ed=e.target.closest('[data-mxpled]');if(ed){U.mxPlEd=ed.dataset.mxpled==='1';MXPL.sel='';MXPL.ob='';saveUI();render();return}
      const m=e.target.closest('[data-mxplmode]');if(m){const k=m.dataset.mxplmode;U.mxPlOb=k==='ob';if(k!=='ob'){const cs=U.mxPlSc?mxPlCats(U.mxPlSc,mxPlFloor(U.piso)):[];U.mxPlCat=k==='all'?'*':((cs[0]||{}).id||'')}MXPL.sel='';MXPL.ob='';saveUI();render()}}}
  const hh=mxHd(head,mxViewSeg());const he=$('#mxplh',main);if(he.dataset.h!==hh){he.innerHTML=hh;he.dataset.h=hh;mxWire(main)}
  const API=window.__plano&&window.__plano.ambMap?window.__plano:null;if(!API)loadPlanoMod().then(()=>{if(U.tab==='mat'&&U.mxV==='pla')requestRender()}).catch(()=>{});
  const{bs,v}=pid&&API?mxPlBase(pid):{bs:[],v:''};
  const all=U.mxPlCat==='*';const canReg=typeof mobCan==='function'&&mobCan();const edM=canReg&&!!U.mxPlEd;const obM=!edM&&!!U.mxPlOb&&typeof mobIdx==='function';
  /* Ver (solo mirar) | Registrar (tocar el plano abre la hoja del ambiente: estados, agregar actividades y observaciones); nov 2026, pedido del dueño */
  const seg0=canReg?`<span class="seg mxpled" role="group" aria-label="Ver o registrar"><button data-mxpled="0" class="${edM?'':'on'}">👁 Ver</button><button data-mxpled="1" class="${edM?'on':''}" title="Toca un ambiente para cambiar estados, agregar actividades o registrar observaciones">✏️ Registrar</button></span>`:'';
  const lamSel=bs.length>1?`<label class="mxord"><span class="fgl">Lámina</span><select id="mxplv" aria-label="Lámina">${bs.map(b=>`<option value="${esc(b.id)}"${b.id===v?' selected':''}>${esc(b.esp||b.name||'Lámina')}</option>`).join('')}</select></label>`:'';
  if(edM){const fo=`${seg0}${lamSel}<span class="fsp"></span><span class="mxleg"><span><i class="mxplsw" style="--c:${MXPL_C.p}"></i>Con pendientes</span><span><i class="mxplsw" style="--c:${MXPL_C.c}"></i>En curso</span><span><i class="mxplsw o"></i>Sin pendientes</span></span>`;
    const fe=$('#mxplf',main);if(fe.dataset.h!==fo){fe.innerHTML=fo;fe.dataset.h=fo}
    const msg=!pid?'Elige un piso arriba (selector de piso) para registrar sobre su plano.':!API?'Cargando láminas…':'';
    const me_=$('#mxplmsg',main);const mh=msg?`<div class="callout">${msg}</div>`:'';if(me_.innerHTML!==mh)me_.innerHTML=mh;$('#mxplb',main).hidden=!!msg;if(msg)return;
    renderMxPlOb(main,pid,v,API,true);return}
  const seg=`<span class="seg" role="group" aria-label="Qué mostrar"><button data-mxplmode="one" class="${all||obM?'':'on'}">Una actividad</button><button data-mxplmode="all" class="${all&&!obM?'on':''}">Toda la partida</button>${typeof mobIdx==='function'?`<button data-mxplmode="ob" class="${obM?'on':''}" title="Observaciones por levantar (punch list)">📍 Observaciones</button>`:''}</span>`;
  if(obM){const osc=mxPlObScs();if(MXPL.obSc&&!osc.includes(MXPL.obSc))MXPL.obSc='';
    const fo=`${seg0}${SCK()&&osc.length<2?'':`<label class="mxord"><span class="fgl">Subcontratista</span><select id="mxplosc" aria-label="Subcontratista"><option value="">${SCK()?'Mis partidas':'Todos'}</option>${osc.map(x=>`<option value="${esc(x)}"${x===MXPL.obSc?' selected':''}>${esc(conOf(x).name)}</option>`).join('')}</select></label>`}${seg}
      ${bs.length>1?`<label class="mxord"><span class="fgl">Lámina</span><select id="mxplv" aria-label="Lámina">${bs.map(b=>`<option value="${esc(b.id)}"${b.id===v?' selected':''}>${esc(b.esp||b.name||'Lámina')}</option>`).join('')}</select></label>`:''}
      <span class="fsp"></span><span class="mxleg"><span><i class="mxplsw" style="--c:${MXPL_OB}"></i>Con observaciones abiertas</span><span><i class="mxplsw o"></i>Sin observaciones</span></span>`;
    const fe=$('#mxplf',main);if(fe.dataset.h!==fo){fe.innerHTML=fo;fe.dataset.h=fo}
    const msg=!pid?'Elige un piso arriba (selector de piso) para ver su plano y sus observaciones.':!API?'Cargando láminas…':'';
    const me_=$('#mxplmsg',main);const mh=msg?`<div class="callout">${msg}</div>`:'';if(me_.innerHTML!==mh)me_.innerHTML=mh;$('#mxplb',main).hidden=!!msg;if(msg)return;
    renderMxPlOb(main,pid,v,API,false);return}
  const fh=`${seg0}${SCK()&&scs.length<2?`<b>${esc(conOf(sc).name)}</b>`:`<label class="mxord"><span class="fgl">Subcontratista</span><select id="mxplsc" aria-label="Subcontratista">${scs.map(x=>`<option value="${esc(x)}"${x===sc?' selected':''}>${esc(conOf(x).name)}</option>`).join('')}</select></label>`}
    ${seg}
    ${all?'':`<label class="mxord"><span class="fgl">Actividad</span><select id="mxplcat" aria-label="Actividad">${cats.map(c=>`<option value="${esc(c.id)}"${c.id===U.mxPlCat?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`}
    ${bs.length>1?`<label class="mxord"><span class="fgl">Lámina</span><select id="mxplv" aria-label="Lámina">${bs.map(b=>`<option value="${esc(b.id)}"${b.id===v?' selected':''}>${esc(b.esp||b.name||'Lámina')}</option>`).join('')}</select></label>`:''}
    ${typeof mobIdx==='function'&&MX.obs.size?`<label class="chk" title="Muestra encima los puntos de las observaciones abiertas"><input type="checkbox" id="mxplobl"${U.mxPlObL?' checked':''}> 📍 Observaciones</label>`:''}
    <span class="fsp"></span><span class="mxleg"><span><i class="mxplsw" style="--c:${MXPL_C.p}"></i>Pendiente</span><span><i class="mxplsw" style="--c:${MXPL_C.c}"></i>En curso</span><span><i class="mxplsw o"></i>Sin pendientes</span></span>`;
  const fe=$('#mxplf',main);if(fe.dataset.h!==fh){fe.innerHTML=fh;fe.dataset.h=fh}
  const msg=!pid?'Elige un piso arriba (selector de piso) para ver su plano.':!sc?(onF?'Este piso no tiene actividades en la Matriz.':'No hay actividades en el catálogo.'):!API?'Cargando láminas…':'';
  const me_=$('#mxplmsg',main);const mh=msg?`<div class="callout">${msg}</div>`:'';if(me_.innerHTML!==mh)me_.innerHTML=mh;$('#mxplb',main).hidden=!!msg;if(msg)return;
  const ST=mxPlState(pid,sc,all?'*':U.mxPlCat);const L=[...ST.values()];
  const shapes=[];for(const o of L){const g=szGeo(o.a,v);if(!g)continue;
    shapes.push({id:'a:'+o.a.id,kind:'a',pts:g,label:o.a.code,nolab:true,op:.24,sop:.5,c:o.k?MXPL_C[o.k]:MXPL_C.x,sel:MXPL.sel===o.a.id,dim:!o.k})}
  /* sin lámina (o aún cargando) ambMap muestra su propio aviso */
  /* capa de observaciones (solo mirar): los puntos abiertos encima; tocar uno lo abre */
  const pins=U.mxPlObL&&typeof mxPlObPins==='function'?mxPlObPins(pid,v):[];
  const base=API.ambMap($('#mxplmap',main),{pid,vista:v,canEdit:false,canUp:false,shapes,pins,draw:null,tmp:null,edit:null,onPick:id=>{if(id&&id.startsWith('ob:')){MXPL.ob=id.slice(3);mobOpen(MXPL.ob);render();return}MXPL.sel=id&&id.startsWith('a:')?id.slice(2):'';render()}});/* sin lámina igual se muestra la lista */
  /* resumen y listas */
  const pen=L.filter(o=>o.k==='p'),cur=L.filter(o=>o.k==='c');const nog=base?L.filter(o=>o.k&&!szGeo(o.a,v)):[];
  const nm=id=>esc((MX.cat.get(id)||{}).name||'');
  const item=o=>`<button class="mxpli${MXPL.sel===o.a.id?' on':''}" data-mxpla="${esc(o.a.id)}" style="--c:${MXPL_C[o.k]}"><i></i><b>${esc(o.a.code)}</b> ${esc(o.a.name)}${all?`<small>${o.p.length?o.p.length+' pend.':''}${o.p.length&&o.c.length?' · ':''}${o.c.length?o.c.length+' en curso':''}</small>`:''}</button>`;
  const so=S.amb.get(MXPL.sel);const sst=so&&ST.get(so.id);
  const sh=`<div class="mxplt"><b>${all?esc(conOf(sc).name)+' · toda la partida':nm(U.mxPlCat)}</b><span>${esc((S.pis.get(pid)||{}).code||'')} · <b style="color:${MXPL_C.p}">${pen.length}</b> pendiente${pen.length===1?'':'s'} · <b style="color:${MXPL_C.c}">${cur.length}</b> en curso</span></div>
    ${sst?`<div class="card mxplsel"><div class="pad"><b>${esc(so.code)} ${esc(so.name)}</b>${sst.k?[...sst.p.map(k=>`<div class="mxplr"><i class="mxplsw" style="--c:${MXPL_C.p}"></i>${nm(k)} · Pendiente${(((mxCells().get(so.id)||{})[k])||{}).sug?' <small class="note">&nbsp;(sin validar)</small>':''}</div>`),...sst.c.map(k=>`<div class="mxplr"><i class="mxplsw" style="--c:${MXPL_C.c}"></i>${nm(k)} · En curso</div>`)].join(''):'<div class="note">Sin pendientes de esta selección.</div>'}</div></div>`:''}
    ${pen.length?`<div class="mxplg">Pendiente</div>${pen.map(item).join('')}`:''}${cur.length?`<div class="mxplg">En curso</div>${cur.map(item).join('')}`:''}
    ${!pen.length&&!cur.length?'<p class="note">Nada pendiente ni en curso en este piso para esta selección.</p>':''}
    ${nog.length?`<p class="note">${nog.length} ${nog.length===1?'ambiente con pendientes no está dibujado':'ambientes con pendientes no están dibujados'} en la lámina (se ubican en Sectorización): ${nog.map(o=>esc(o.a.code)).join(', ')}.</p>`:''}`;
  const se=$('#mxpls',main);if(se.dataset.h!==sh){se.innerHTML=sh;se.dataset.h=sh}}

/* ---------- modo «Observaciones» (punch list, nov 2026; matriz-obs.js) ----------
   Pines numerados de las observaciones abiertas del piso; tocar un ambiente abre la hoja para registrar una en ese punto
   (quien puede: ingenieros y SC); tocar un pin la abre. Lo demás del Gráfico no cambia. */
function mxPlObScs(){const s=new Set();for(const n of MX.obs.values())if(n&&n.st==='ab'&&n.sc&&(!SCK()||myScsI().includes(n.sc)))s.add(n.sc);
  if(SCK())myScsI().forEach(x=>s.add(x));return[...s].filter(x=>S.con.has(x)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))}
/** puntos de las observaciones abiertas del piso en la lámina v (el SC: las suyas; filtro de SC del modo Observaciones) */
function mxPlObPins(pid,v,flt){const ids=new Set();for(const t of szTree(pid))for(const{a}of t.ambs)ids.add(a.id);
  return[...MX.obs.values()].filter(n=>n&&n.st==='ab'&&ids.has(n.amb)&&n.pt&&n.pt.v===v&&(!SCK()||myScsI().includes(n.sc))&&(!flt||!MXPL.obSc||n.sc===MXPL.obSc))
    .map(n=>({id:'ob:'+n.id,x:n.pt.x,y:n.pt.y,t:String(n.num||''),c:conOf(n.sc).color,sel:MXPL.ob===n.id,tip:`${mobLbl(n)} · ${n.desc||''}`}))}
/* reg = modo ✏️ Registrar: tocar un ambiente abre su hoja (Actividades | Observación aquí); los colores muestran lo pendiente.
   Sin reg (👁 Ver › Observaciones): tocar solo selecciona; tocar un punto lo abre */
function renderMxPlOb(main,pid,v,API,reg){const ambs=[];for(const t of szTree(pid))for(const{a}of t.ambs)ambs.push({a,s:t.s});const ids=new Set(ambs.map(o=>o.a.id));
  const okSc=n=>(reg||!MXPL.obSc||n.sc===MXPL.obSc)&&(!SCK()||myScsI().includes(n.sc));
  const L=[...MX.obs.values()].filter(n=>n&&ids.has(n.amb)&&n.st!=='anu'&&okSc(n)).sort((a,b)=>(a.num||0)-(b.num||0));
  const open=L.filter(n=>n.st==='ab'),lev=L.filter(n=>n.st==='lev');const byA=new Map();open.forEach(n=>{if(!byA.has(n.amb))byA.set(n.amb,[]);byA.get(n.amb).push(n)});
  const cells=reg?mxCells():null;
  const kOf=a=>{if(!reg)return byA.has(a.id)?'ob':'';const C=cells.get(a.id)||{};let k='';for(const[cid,o]of Object.entries(C)){if(!mxMine(MX.cat.get(cid)))continue;if(o.s==='p'||o.ob)return'p';if(o.s==='c')k='c'}return k};
  const shapes=[];for(const{a}of ambs){const g=szGeo(a,v);if(!g)continue;const k=kOf(a);
    shapes.push({id:'a:'+a.id,kind:'a',pts:g,label:a.code,nolab:true,op:.22,sop:.45,c:k==='ob'?MXPL_OB:k?MXPL_C[k]:MXPL_C.x,sel:MXPL.sel===a.id,dim:!k})}
  const pins=open.filter(n=>n.pt&&n.pt.v===v).map(n=>({id:'ob:'+n.id,x:n.pt.x,y:n.pt.y,t:String(n.num||''),c:conOf(n.sc).color,sel:MXPL.ob===n.id,tip:`${mobLbl(n)} · ${n.desc||''}`}));
  /* mientras se registra en un punto, se ve con «+» */
  if(reg&&typeof OBS!=='undefined'&&OBS&&OBS.mode==='new'&&OBS.pt&&OBS.pt.v===v)pins.push({id:'a:'+OBS.amb,x:OBS.pt.x,y:OBS.pt.y,t:'+',c:MXPL_OB,sel:true});
  const base=API.ambMap($('#mxplmap',main),{pid,vista:v,canEdit:false,canUp:false,shapes,pins,draw:null,tmp:null,edit:null,onPick:(id,w)=>{
    if(id&&id.startsWith('ob:')){MXPL.ob=id.slice(3);mobOpen(MXPL.ob);render();return}
    const am=id&&id.startsWith('a:')?id.slice(2):'';MXPL.sel=am;MXPL.ob='';
    if(reg&&am){mobAmb(am,w?{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10,v}:null);
      /* viene de la ficha de una celda («📍 marcando el punto»): abre directo la observación con esa actividad */
      const pd=MXPL.pend;MXPL.pend=null;if(pd&&pd.amb===am&&OBS){OBS.tab='obs';if(mobCanCat(MX.cat.get(pd.cat)))OBS.cat=pd.cat;mobDraw()}}
    else if(reg)toast('Toca dentro de un ambiente dibujado.');
    render()}});
  if(typeof OBS!=='undefined'&&OBS&&$('#mobsheet'))mobDraw(); /* la hoja abierta se actualiza con lo que llega */
  const nog=base?open.filter(n=>!n.pt||n.pt.v!==v).length:0;const nd=ambs.filter(o=>!szGeo(o.a,v)).length;
  const grp=[...byA.entries()].map(([amb,ns])=>({a:S.amb.get(amb),ns})).filter(g=>g.a).sort((x,y)=>(x.a.code||'').localeCompare(y.a.code||'',undefined,{numeric:true}));
  const sh=`${reg?`<div class="callout mobhelp">Toca un ambiente en el plano: ahí cambias el estado de sus actividades, agregas las que faltan o registras una observación en ese punto.</div>`:''}
    <div class="mxplt"><b>Observaciones · ${esc((S.pis.get(pid)||{}).code||'')}</b><span><b style="color:${MXPL_OB}">${open.length}</b> abierta${open.length===1?'':'s'} · ${lev.length} levantada${lev.length===1?'':'s'}</span></div>
    ${grp.map(g=>`<div class="mxplg${MXPL.sel===g.a.id?' on':''}">${esc(g.a.code)} · ${esc(g.a.name)} <small>${g.ns.length}</small></div>${g.ns.map(n=>mobItemHtml(n).replace('class="mobi','class="mobi'+(MXPL.ob===n.id?' on':''))).join('')}`).join('')}
    ${!open.length?'<p class="note">No hay observaciones abiertas en este piso.</p>':''}
    ${lev.length?`<details class="mobdone"><summary>Levantadas (${lev.length})</summary>${lev.map(mobItemHtml).join('')}</details>`:''}
    ${nog?`<p class="note">${nog} sin punto en esta lámina (registradas desde la tabla o en otra lámina).</p>`:''}
    ${nd&&reg?`<p class="note">${nd} ${nd===1?'ambiente no está dibujado':'ambientes no están dibujados'} en la lámina (se dibujan en Sectorización): regístralos desde la tabla de la Matriz o el Recorrido.</p>`:''}`;
  const se=$('#mxpls',main);if(se.dataset.h!==sh){const op=se.querySelector('details.mobdone');const wasOpen=op&&op.open;se.innerHTML=sh;se.dataset.h=sh;if(wasOpen){const d=se.querySelector('details.mobdone');if(d)d.open=true}}}
