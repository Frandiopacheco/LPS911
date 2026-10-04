"use strict";
/* LPS 911 · Plan maestro: vincular actividades del lookahead con su partida del maestro (paso 4 de docs/plan-maestro.md).
   Pantalla partida en dos (Plan maestro › «⇄ Vincular con el lookahead»): a la izquierda las actividades del lookahead del
   piso elegido arriba, por sector y ambiente; a la derecha las partidas de ese piso. Se arrastra una o varias actividades
   sobre su partida (en el celular: tocar la actividad y luego la partida). El vínculo se guarda en mpl/{actId}: no toca el
   lookahead, por eso el planner (que no lo edita) puede hacerlo. Con los vínculos, cada fila del lookahead muestra un ◆:
   verde si el conjunto de actividades de esa partida termina dentro del fin del maestro, rojo si se pasa. */

/* ---------- vínculos (mpl) ---------- */
const MPL=new Map();let MPLV=0,mplSub=null,MPL_OK=false;
function ensureMPL(){if(!db||!canMP()||mplSub)return;
  mplSub=fcol('mpl').onSnapshot(sn=>{MPL.clear();sn.docs.forEach(d=>MPL.set(d.id,{...d.data(),id:d.id}));MPLV++;MPL_OK=true;if(ready&&(U.tab==='maestro'||U.tab==='look'))requestRender()},()=>{MPL_OK=true});
  unsubs.push(stopMPL)}
function stopMPL(){if(mplSub)mplSub();mplSub=null;MPL.clear();MPL_OK=false}
/** partida del maestro de una actividad ('' si no tiene o si la partida ya no está vigente) */
const mplOf=aid=>{const l=MPL.get(aid);return l&&MPN.has(l.mp)?l.mp:''};
/** Vincula (mpId) o desvincula (null) actividades; con «Deshacer» */
function mplSet(ids,mpId,label,quiet){if(!canMP()||!ids.length)return;const prev=ids.map(id=>[id,MPL.get(id)||null]);
  const L=ids.map(id=>[id,mpId?{mp:mpId,by:me.email,t:NOW()}:null]);mplWrite(L);
  if(!quiet)toast(label||(mpId?`${ids.length} actividad${ids.length===1?'':'es'} vinculada${ids.length===1?'':'s'}`:'Vínculo quitado'),'Deshacer',()=>mplWrite(prev.map(([id,o])=>[id,o?{mp:o.mp,by:o.by||'',t:o.t||0}:null]),true))}
function mplWrite(L,silent){for(const[id,v]of L){if(v)MPL.set(id,{...v,id});else MPL.delete(id)}MPLV++;requestRender();if(!db)return;
  const P=[];for(let i=0;i<L.length;i+=400){const part=L.slice(i,i+400);pending++;setStatus();
    P.push(dbCall(()=>{const b=db.batch();for(const[id,v]of part){const ref=fcol('mpl').doc(id);if(v)b.set(ref,v);else b.delete(ref)}return b.commit()})
      .then(()=>{lastErr=null},e=>mpErr(e)).finally(()=>{pending--;setStatus()}))}
  return Promise.all(P)}

/* ---------- ◆: el lookahead contra el fin del maestro ---------- */
let MPLK_K='',MPLK=null;
/** {act: Map actId → st, node: Map nodoId → st}; st = {node, fin (maestro), end (último día en el lookahead), ok, dd (días hábiles de diferencia), n} */
function mpLookMap(){const k=MPV+'|'+MPLV+'|'+DV;if(MPLK&&MPLK_K===k)return MPLK;MPLK_K=k;
  const I=mpIdx();const by=new Map();
  for(const[aid,l]of MPL){const x=S.act.get(aid);if(!x||!MPN.has(l.mp))continue;let L=by.get(l.mp);if(!L)by.set(l.mp,L=[]);L.push(x)}
  const act=new Map(),node=new Map();
  for(const[nid,L]of by){const fin=(I.span.get(nid)||{}).fin||'';let end='';const sc=new Map();for(const x of L){const ds=x.days||[];const e=ds.length?ds[ds.length-1]:'';if(e&&e>end)end=e;sc.set(x.sc,(sc.get(x.sc)||0)+1)}const scM=[...sc.entries()].sort((a,b)=>b[1]-a[1])[0];
    const st={node:nid,fin,end,n:L.length,sc:scM?scM[0]:'',ok:!fin||!end||end<=fin,dd:fin&&end?(end>fin?wdist(fin,end):-wdist(end,fin)):0};node.set(nid,st);for(const x of L)act.set(x.id,st)}
  MPLK={act,node};return MPLK}
const mpHitOn=()=>canMP()&&!U.mpHid;
/** texto del ◆ para el título */
function mpStTip(st){const n=MPN.get(st.node);const p=n?(n.tipo==='pp'?`${(MPN.get(n.parent)||{}).name||''} · ${n.name||''}`:n.name||''):'';
  if(!st.fin)return`Plan maestro: ${p} (sin fecha de fin)`;if(!st.end)return`Plan maestro: ${p} · fin ${fmtD(st.fin)} · sus actividades aún no tienen días`;
  return`Plan maestro: ${p} · fin ${fmtD(st.fin)} · el lookahead termina el ${fmtD(st.end)}${st.dd>0?` (+${st.dd} día${st.dd===1?'':'s'} hábil${st.dd===1?'':'es'}: fuera de plazo)`:st.dd<0?` (${-st.dd} día${st.dd===-1?'':'s'} hábil${st.dd===-1?'':'es'} antes)`:' (justo)'}`}
/** insignia para la celda de la actividad en el lookahead ('' si no está vinculada o no corresponde) */
function mpLookBadge(x,days){if(!mpHitOn())return'';ensureMP();ensureMPL();const st=mpLookMap().act.get(x.id);if(!st||!st.fin)return'';
  /* dentro de las semanas visibles el ◆ va en la celda del día; aquí solo cuando el fin queda fuera de la ventana */
  const w0=days.length?days[0].d:'',w1=days.length?days[days.length-1].d:'';const f=mpDayOf(st.fin);const out=f<w0?'←':f>w1?'→':'';if(!out)return'';
  return`<span class="mpbadge ${st.ok?'ok':'bad'}" title="${esc(mpStTip(st))}">◆${out} ${fmtS(st.fin)}</span>`}
/** clase y marca para la celda del día que es el fin del maestro */
/* el lookahead no tiene domingos: un fin en domingo se marca el sábado */
const mpDayOf=f=>f&&pd(f).getUTCDay()===0?addD(f,-1):f;
function mpLookDay(x,d){if(!mpHitOn())return'';const st=mpLookMap().act.get(x.id);return st&&mpDayOf(st.fin)===d?`<i class="mpdia ${st.ok?'ok':'bad'}" title="${esc(mpStTip(st))}"></i>`:''}

/* ---------- pantalla de vincular ---------- */
const MVL={sel:new Set(),f:'sin',q:'',open:'',last:''};
function mpVincView(main){ensureMPL();const pid=U.piso;const P=pid?S.pis.get(pid):null;
  const head=`<div class="bar maebar0"><button class="ib" id="mvback">← Volver al plan maestro</button><b class="mvt">Vincular el lookahead con el plan maestro${P?` · ${esc(P.code)} · ${esc(P.name)}`:''}</b><span style="flex:1"></span>
    <span class="mu mvhelp">Arrastra una o varias actividades (Ctrl+clic) a su partida. En el celular: toca la actividad y luego la partida.</span></div>`;
  if(!P){main.innerHTML=`<div class="view mae">${head}<div class="scroll"><div class="wrap"><div class="callout">Elige un piso arriba: la pantalla muestra las actividades y las partidas de un piso a la vez.</div></div></div></div>`;mvWire(main);return}
  const LM=mpLookMap();const I=mpIdx();const q=fold(MVL.q).trim();
  /* izquierda: actividades del piso por sector y ambiente */
  const secs=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid).sort(byOrder);let nAll=0,nSin=0;const left=[];
  for(const s of secs){const ambs=[...S.amb.values()].filter(a=>a.sectorId===s.id).sort(byOrder);const blk=[];
    for(const a of ambs){const acts=[...S.act.values()].filter(x=>x.ambId===a.id).sort(byOrder);const items=[];
      for(const x of acts){nAll++;const m=mplOf(x.id);if(!m)nSin++;if(MVL.f==='sin'&&m)continue;if(q&&!fold(`${x.name} ${a.name} ${a.code} ${conOf(x.sc).name}`).includes(q))continue;
        const st=actStats(x);const c=conOf(x.sc);const n=m?MPN.get(m):null;
        items.push(`<div class="mvact${MVL.sel.has(x.id)?' on':''}" draggable="true" data-mva="${x.id}" style="--c:${c.color}" title="${esc(c.name)}"><b>${esc(x.name||'(sin nombre)')}</b><small>${esc(c.name)}${st.ini?` · ${fmtS(st.ini)} – ${fmtS(st.fin)}`:' · sin días'}</small>${n?`<span class="mvlk" title="Vinculada a ${esc(mpPath(n)+' › '+n.name)}">↳ ${esc(n.tipo==='pp'?(MPN.get(n.parent)||{}).name||n.name:n.name)}</span>`:''}</div>`)}
      if(items.length)blk.push(`<div class="mvamb">${esc(a.code)} · ${esc(a.name)}</div>${items.join('')}`)}
    if(blk.length)left.push(`<div class="mvsec">${esc(s.code)} · ${esc(s.name)}</div>${blk.join('')}`)}
  /* derecha: partidas por piso de este piso y partidas sin pisos, en el orden del maestro */
  const cand=[];const walk=n=>{if(n.tipo==='pp'&&n.pisoId===pid)cand.push(n);else if(n.tipo==='part'&&!(I.kids.get(n.id)||[]).some(k=>k.tipo==='pp'))cand.push(n);(I.kids.get(n.id)||[]).forEach(k=>{if(k.tipo!=='det')walk(k)})};(I.kids.get('')||[]).forEach(walk);
  const selNames=[...MVL.sel].map(id=>(S.act.get(id)||{}).name||'');const words=new Set(selNames.flatMap(s=>fold(s).split(/[^a-z0-9ñ]+/).filter(w=>w.length>=5)));
  const linked=new Map();for(const[aid,l]of MPL)if(S.act.has(aid)){let L=linked.get(l.mp);if(!L)linked.set(l.mp,L=[]);L.push(aid)}
  const right=cand.map(n=>{const par=n.tipo==='pp'?MPN.get(n.parent):null;const nm=par?par.name:n.name;const s=I.span.get(n.id)||{};const st=LM.node.get(n.id);const L=linked.get(n.id)||[];
    const sug=words.size&&[...words].some(w=>fold(`${nm} ${mpPath(n)}`).includes(w));const open=MVL.open===n.id;
    return`<div class="mvp${sug?' sug':''}${MVL.last===n.id?' just':''}" data-mvp="${n.id}"><div class="mvph"><div><b>${esc(nm||'(sin nombre)')}</b><small>${esc(par?mpPath(par):mpPath(n))}${n.tipo==='part'?' · sin pisos':''}</small></div>
      <span class="mvpf">Fin ${s.fin?fmtS(s.fin):'—'}</span><button class="mvpn" data-mvo="${n.id}" title="Ver sus actividades">${L.length} act.</button>${st&&st.end?`<i class="mvdia ${st.ok?'ok':'bad'}" title="${esc(mpStTip(st))}"></i>`:'<i class="mvdia"></i>'}</div>
      ${open?`<div class="mvpl">${L.length?L.map(aid=>{const x=S.act.get(aid);const a=S.amb.get(x.ambId);return`<div><span>${esc(x.name)} <small class="mu">${esc(a?a.code:'')} · ${esc(conOf(x.sc).name)}</small></span><button class="mvx" data-mvx="${aid}" aria-label="Quitar vínculo" title="Quitar vínculo">✕</button></div>`}).join(''):'<p class="mu">Sin actividades vinculadas.</p>'}</div>`:''}</div>`}).join('');
  main.innerHTML=`<div class="view mae">${head}<div class="mvwrap">
    <section class="mvcol"><header><div class="seg"><button data-mvf="sin" class="${MVL.f==='sin'?'on':''}">Sin vincular (${nSin})</button><button data-mvf="all" class="${MVL.f==='all'?'on':''}">Todas (${nAll})</button></div>
      <input type="search" id="mvq" placeholder="Buscar actividad, ambiente o SC" value="${esc(MVL.q)}" data-fk="mvq" aria-label="Buscar actividad">${MVL.sel.size?`<span class="mvsel">${MVL.sel.size} elegida${MVL.sel.size===1?'':'s'} <button class="lnkb" data-mvclr>Quitar selección</button></span>`:''}</header>
      <div class="mvlist" id="mvl">${left.join('')||`<p class="mu" style="padding:12px">${nAll?'No hay actividades sin vincular en este piso.':'Este piso no tiene actividades en el lookahead.'}</p>`}</div></section>
    <section class="mvcol"><header><b>Partidas del plan maestro</b><span class="mu">${cand.length} en este piso</span></header>
      <div class="mvlist" id="mvr">${right||'<p class="mu" style="padding:12px">El plan maestro no tiene partidas para este piso.</p>'}</div></section></div></div>`;
  mvWire(main)}
function mvWire(main){
  main.oninput=e=>{if(e.target.id==='mvq'){MVL.q=e.target.value;requestRender()}};
  main.onclick=e=>{const t=e.target;
    if(t.closest('#mvback')){U.mpVinc=false;MVL.sel.clear();render();return}
    const f=t.closest('[data-mvf]');if(f){MVL.f=f.dataset.mvf;render();return}
    if(t.closest('[data-mvclr]')){MVL.sel.clear();render();return}
    const x=t.closest('[data-mvx]');if(x){mplSet([x.dataset.mvx],null);return}
    const o=t.closest('[data-mvo]');if(o){MVL.open=MVL.open===o.dataset.mvo?'':o.dataset.mvo;render();return}
    const a=t.closest('[data-mva]');if(a){const id=a.dataset.mva;if(e.ctrlKey||e.metaKey||e.shiftKey||isMob()||MVL.sel.size&&MVL.sel.has(id)){MVL.sel.has(id)?MVL.sel.delete(id):MVL.sel.add(id)}else{const only=MVL.sel.size===1&&MVL.sel.has(id);MVL.sel.clear();if(!only)MVL.sel.add(id)}render();return}
    const p=t.closest('[data-mvp]');if(p){if(MVL.sel.size)mvLink(p.dataset.mvp,[...MVL.sel]);else{MVL.open=MVL.open===p.dataset.mvp?'':p.dataset.mvp;render()}}};
  /* arrastrar con el mouse */
  main.ondragstart=e=>{const a=e.target.closest&&e.target.closest('[data-mva]');if(!a)return;if(!MVL.sel.has(a.dataset.mva)){MVL.sel.clear();MVL.sel.add(a.dataset.mva)}
    try{e.dataTransfer.setData('text/plain',[...MVL.sel].join(','));e.dataTransfer.effectAllowed='link'}catch(err){}document.body.classList.add('mvdrag')};
  main.ondragend=()=>{document.body.classList.remove('mvdrag');$$('.mvp.over').forEach(x=>x.classList.remove('over'))};
  main.ondragover=e=>{const p=e.target.closest&&e.target.closest('[data-mvp]');if(!p)return;e.preventDefault();try{e.dataTransfer.dropEffect='link'}catch(err){}$$('.mvp.over').forEach(x=>{if(x!==p)x.classList.remove('over')});p.classList.add('over')};
  main.ondragleave=e=>{const p=e.target.closest&&e.target.closest('[data-mvp]');if(p&&!p.contains(e.relatedTarget))p.classList.remove('over')};
  main.ondrop=e=>{const p=e.target.closest&&e.target.closest('[data-mvp]');if(!p)return;e.preventDefault();let ids=[];try{ids=(e.dataTransfer.getData('text/plain')||'').split(',').filter(Boolean)}catch(err){}if(!ids.length)ids=[...MVL.sel];
    document.body.classList.remove('mvdrag');mvLink(p.dataset.mvp,ids.filter(id=>S.act.has(id)))}}
function mvLink(mpId,ids){if(!ids.length)return;const n=MPN.get(mpId);if(!n)return;const par=n.tipo==='pp'?MPN.get(n.parent):null;
  MVL.sel.clear();MVL.last=mpId;setTimeout(()=>{if(MVL.last===mpId){MVL.last='';requestRender()}},1600);
  mplSet(ids,mpId,`${ids.length} actividad${ids.length===1?'':'es'} vinculada${ids.length===1?'':'s'} a «${par?par.name:n.name}»`)}
