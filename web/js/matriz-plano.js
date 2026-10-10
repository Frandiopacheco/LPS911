"use strict";
/* LPS 911 · Matriz › Plano (oct 2026, decidido con el dueño): sobre la lámina base del piso (las formas de Sectorización),
   resalta los ambientes donde una actividad (o toda la partida de un SC) está Pendiente (rojo) o En curso (ámbar), según la
   Matriz tal cual (lo «sin validar» también cuenta). Lo demás va sin color. Solo lectura: no cambia la Matriz.
   Se arma una vez (el visor de la lámina no se destruye) y luego solo se actualizan sus partes.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
const MXPL={sel:'',vista:''};
const MXPL_C={p:'#D64545',c:'#E0A01B',x:'#9AA3A8'};
/* SC que tienen actividades en el catálogo (el SC: solo los suyos) */
function mxPlScs(){const mine=SCK()?new Set(myScsI()):null;const s=new Set();for(const c of MX.cat.values()){if(c.arch)continue;for(const x of mxScsOf(c))if(!mine||mine.has(x))s.add(x)}
  return[...s].filter(x=>S.con.has(x)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))}
const mxPlCats=sc=>[...MX.cat.values()].filter(c=>!c.arch&&mxScsOf(c).includes(sc)).sort((a,b)=>(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name));
/* lámina: la base del piso con más ambientes dibujados (o la elegida) */
function mxPlBase(pid){const API=window.__plano;const bs=API&&API.basesOf?API.basesOf(pid):[];if(!bs.length)return{bs,v:''};if(bs.some(b=>b.id===MXPL.vista))return{bs,v:MXPL.vista};
  const n=b=>{let k=0;for(const t of szTree(pid))for(const{a}of t.ambs)if(szGeo(a,b.id))k++;return k};const best=bs.slice().sort((x,y)=>n(y)-n(x))[0];return{bs,v:best.id}}
/* estado de cada ambiente del piso: {k:'p'|'c'|'', p:[cat], c:[cat]} */
function mxPlState(pid,sc,cat){const cells=mxCells();const cats=cat==='*'?mxPlCats(sc).map(c=>c.id):[cat];const out=new Map();
  for(const t of szTree(pid))for(const{a}of t.ambs){const C=cells.get(a.id)||{};const p=[],c=[];for(const k of cats){const o=C[k];if(!o)continue;if(o.s==='p')p.push(k);else if(o.s==='c')c.push(k)}
    out.set(a.id,{a,s:t.s,k:p.length?'p':c.length?'c':'',p,c})}
  return out}
function renderMxPla(main,head){const pid=U.piso;const scs=mxPlScs();
  if(!scs.includes(U.mxPlSc))U.mxPlSc=scs[0]||'';const sc=U.mxPlSc;const cats=sc?mxPlCats(sc):[];
  if(U.mxPlCat!=='*'&&!cats.some(c=>c.id===U.mxPlCat))U.mxPlCat=(cats[0]||{}).id||'';
  if(!$('#mxplmap',main)){main.innerHTML=`<div class="scroll"><div class="wrap mxwrap"><div id="mxplh"></div><div id="mxplf" class="fbar mxplf"></div><div id="mxplmsg"></div>
     <div class="mxplb" id="mxplb"><section class="mxplmw"><div class="szmap mxplmap" id="mxplmap"></div></section><aside class="mxpls" id="mxpls"></aside></div></div></div>`;
    main.onchange=e=>{const t=e.target;if(t.id==='mxplsc'){U.mxPlSc=t.value;U.mxPlCat='';MXPL.sel='';saveUI();render()}else if(t.id==='mxplcat'){U.mxPlCat=t.value;MXPL.sel='';saveUI();render()}else if(t.id==='mxplv'){MXPL.vista=t.value;render()}};
    main.onclick=e=>{const b=e.target.closest('[data-mxpla]');if(b){MXPL.sel=MXPL.sel===b.dataset.mxpla?'':b.dataset.mxpla;render();return}
      const m=e.target.closest('[data-mxplmode]');if(m){U.mxPlCat=m.dataset.mxplmode==='all'?'*':((cats[0]||{}).id||'');MXPL.sel='';saveUI();render()}}}
  const hh=mxHd(head,mxViewSeg());const he=$('#mxplh',main);if(he.dataset.h!==hh){he.innerHTML=hh;he.dataset.h=hh;mxWire(main)}
  const API=window.__plano&&window.__plano.ambMap?window.__plano:null;if(!API)loadPlanoMod().then(()=>{if(U.tab==='mat'&&U.mxV==='pla')requestRender()}).catch(()=>{});
  const{bs,v}=pid&&API?mxPlBase(pid):{bs:[],v:''};
  const all=U.mxPlCat==='*';
  const fh=`${SCK()&&scs.length<2?`<b>${esc(conOf(sc).name)}</b>`:`<label class="mxord"><span class="fgl">Subcontratista</span><select id="mxplsc" aria-label="Subcontratista">${scs.map(x=>`<option value="${esc(x)}"${x===sc?' selected':''}>${esc(conOf(x).name)}</option>`).join('')}</select></label>`}
    <span class="seg" role="group" aria-label="Qué mostrar"><button data-mxplmode="one" class="${all?'':'on'}">Una actividad</button><button data-mxplmode="all" class="${all?'on':''}">Toda la partida</button></span>
    ${all?'':`<label class="mxord"><span class="fgl">Actividad</span><select id="mxplcat" aria-label="Actividad">${cats.map(c=>`<option value="${esc(c.id)}"${c.id===U.mxPlCat?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>`}
    ${bs.length>1?`<label class="mxord"><span class="fgl">Lámina</span><select id="mxplv" aria-label="Lámina">${bs.map(b=>`<option value="${esc(b.id)}"${b.id===v?' selected':''}>${esc(b.esp||b.name||'Lámina')}</option>`).join('')}</select></label>`:''}
    <span class="fsp"></span><span class="mxleg"><span><i class="mxplsw" style="--c:${MXPL_C.p}"></i>Pendiente</span><span><i class="mxplsw" style="--c:${MXPL_C.c}"></i>En curso</span><span><i class="mxplsw o"></i>Sin pendientes</span></span>`;
  const fe=$('#mxplf',main);if(fe.dataset.h!==fh){fe.innerHTML=fh;fe.dataset.h=fh}
  const msg=!pid?'Elige un piso arriba (selector de piso) para ver su plano.':!sc?'No hay actividades en el catálogo.':!API?'Cargando láminas…':'';
  const me_=$('#mxplmsg',main);const mh=msg?`<div class="callout">${msg}</div>`:'';if(me_.innerHTML!==mh)me_.innerHTML=mh;$('#mxplb',main).hidden=!!msg;if(msg)return;
  const ST=mxPlState(pid,sc,all?'*':U.mxPlCat);const L=[...ST.values()];
  const shapes=[];for(const o of L){const g=szGeo(o.a,v);if(!g)continue;const n=o.p.length+o.c.length;
    shapes.push({id:'a:'+o.a.id,kind:'a',pts:g,label:o.a.code+(all&&n?' · '+n:''),c:o.k?MXPL_C[o.k]:MXPL_C.x,sel:MXPL.sel===o.a.id,dim:!o.k})}
  /* sin lámina (o aún cargando) ambMap muestra su propio aviso */
  const base=API.ambMap($('#mxplmap',main),{pid,vista:v,canEdit:false,canUp:false,shapes,draw:null,tmp:null,edit:null,onPick:id=>{MXPL.sel=id&&id.startsWith('a:')?id.slice(2):'';render()}});/* sin lámina igual se muestra la lista */
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
