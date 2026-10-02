"use strict";
/* LPS 911 · Sectorización: mapa de ambientes y sectores sobre la misma lámina del Plan diario.
   Por nivel (el selector de piso de arriba): a la izquierda la lista ordenada de sectores y ambientes del lookahead
   (lo que falta ubicar primero), a la derecha la lámina base del piso. Se elige un ambiente y se dibuja su forma
   (rectángulo o polígono). La forma se guarda en el propio ambiente/sector (`geo = {vistaId: [x,y,…]}`) con apply(),
   así viaja con el lookahead y se deshace con Ctrl+Z.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const SZ={vista:'',sel:null,draw:null,tmp:[],q:'',miss:false,cont:true,old:false};
const SZ_PAL=['#1F77B4','#D62728','#2CA02C','#9467BD','#FF7F0E','#17BECF','#8C564B','#E377C2','#7F7F7F','#BCBD22'];
const szGeo=(o,v)=>o&&o.geo&&o.geo[v]&&o.geo[v].length>=6?o.geo[v]:null;
const szCol=o=>o==='a'?'ambientes':'sectors';
/** Sectores y ambientes del piso, en el orden del lookahead */
function szTree(pid){const t=tree().find(x=>x.p.id===pid);return t?t.secs.map(({s,ambs})=>({s,ambs:ambs.map(({a,acts})=>({a,n:acts.length}))})):[]}
function szStats(pid,vista){let n=0,k=0;for(const{ambs}of szTree(pid))for(const{a}of ambs){n++;if(vista?szGeo(a,vista):a.geo&&Object.values(a.geo).some(g=>g&&g.length>=6))k++}return{n,k}}
function szBase(pid){const API=window.__plano;const bs=API&&API.basesOf?API.basesOf(pid):[];if(!bs.some(b=>b.id===SZ.vista))SZ.vista=(bs[0]||{}).id||'';return bs}

function renderPlanos(main){if(!window.__plano||!window.__plano.ambMap)loadPlanoMod().catch(()=>{});
  const API=window.__plano&&window.__plano.ambMap?window.__plano:null;const ce=canWrite&&!(U.ver&&U.verMode==='ver');
  if(!$('#szmap',main)){SZ.tmp=[];
    main.innerHTML=`<div class="scroll"><div class="wrap szwrap"><div id="szhead"></div><div id="szpis" class="szpis"></div>
      <div class="szbody" id="szbody"><aside class="szside"><div class="szf"><input type="search" class="tin" id="szq" placeholder="Buscar ambiente o sector" aria-label="Buscar"><label class="chk"><input type="checkbox" id="szmiss"> Solo sin ubicar</label></div><div class="szlist" id="szlist"></div></aside>
      <section class="szmapw"><div class="sztool" id="sztool"></div><div class="szmap" id="szmap"></div></section></div><div id="szold"></div></div></div>`;
    main.onclick=szClick;main.onchange=szChange;main.oninput=e=>{if(e.target.id==='szq'){SZ.q=e.target.value;szList()}}}
  const pid=U.piso;const bs=pid?szBase(pid):[];
  $('#szhead',main).innerHTML=pageHead('Sectorización',`${pid?esc(S.pis.get(pid)?.code+' · '+S.pis.get(pid)?.name):'Elige un nivel'} · ubicación de sectores y ambientes en la lámina`,
    `${ce&&pid&&bs.length?'<button class="ib" id="szsug" title="Usa las zonas que ya se dibujaron en el Plan diario para proponer la forma de los ambientes que faltan">Proponer desde el Plan diario</button><button class="ib" id="szcopy" title="Para pisos típicos: copia las formas de otro piso cuando los códigos de los ambientes coinciden">Copiar de otro piso…</button>':''}<button class="ib" id="szlam">Láminas del piso (Plan diario)</button>`)
    +helpBox('¿Para qué sirve y cómo se ubica un ambiente?',`<p>Aquí se dibuja dónde está cada <b>sector</b> y cada <b>ambiente</b> del lookahead sobre la <b>misma lámina del Plan diario</b>. Con eso, al tocar el plano en el recorrido de Campo el ambiente sale solo, y más adelante el Plan diario podrá ubicar las actividades sin dibujarlas cada día.</p>
<p>Elige el nivel arriba. En la lista, toca <b>Ubicar</b> en un ambiente y arrastra un rectángulo sobre la lámina (o usa <b>Polígono</b> y toca cada esquina). Con «pasar al siguiente» marcado, la lista avanza sola al próximo ambiente sin ubicar. Todo se deshace con <b>Ctrl+Z</b>.</p>`);
  /* niveles: chips con el avance de cada piso (eligen el mismo piso de arriba) */
  const ph=`${pisos().map(p=>{const st=szStats(p.id);return`<button class="szpc${p.id===pid?' on':''}" data-szp="${p.id}"><b>${esc(p.code)}</b><span>${esc(p.name)}</span><small>${st.n?`${st.k}/${st.n} ubicados`:'sin ambientes'}</small><i style="--p:${st.n?Math.round(st.k/st.n*100):0}%"></i></button>`}).join('')}`;
  const pe=$('#szpis',main);if(pe.dataset.h!==ph){pe.innerHTML=ph;pe.dataset.h=ph}
  $('#szbody',main).hidden=!pid;
  {const oh=planosOldCard();const oe=$('#szold',main);if(oe.dataset.h!==oh){oe.innerHTML=oh;oe.dataset.h=oh}}
  if(!pid)return;
  {const mq=$('#szmiss',main);if(mq)mq.checked=SZ.miss}
  szList();szTool(bs);szMap()}

/* ---------- lista ordenada del lookahead ---------- */
function szList(){const el=$('#szlist');if(!el)return;const pid=U.piso,v=SZ.vista;const ce=canWrite;const q=fold(SZ.q.trim());const T=szTree(pid);const sel=SZ.sel;
  let h='';let shown=0;
  T.forEach(({s,ambs},i)=>{const c=SZ_PAL[i%SZ_PAL.length];const sg=szGeo(s,v);const k=ambs.filter(({a})=>szGeo(a,v)).length;
    const L=ambs.filter(({a})=>(!SZ.miss||!szGeo(a,v))&&(!q||fold(a.code+' '+a.name+' '+s.code+' '+s.name).includes(q)));
    if(!L.length&&(SZ.miss||q)&&!(q&&fold(s.code+' '+s.name).includes(q)))return;
    const ss=sel&&sel.lv==='s'&&sel.id===s.id;
    h+=`<div class="szsec${ss?' on':''}" style="--c:${c}" data-szi="s:${s.id}"><span class="szdot${sg?' ok':''}"></span><b>${esc(s.code)}</b><span class="szn">${esc(s.name)}</span><small>${k}/${ambs.length}</small>${ce?`<button class="lnkb" data-szd="s:${s.id}">${sg?'Redibujar':'Ubicar'}</button>`:''}</div>`;
    for(const{a,n}of L){shown++;const g=szGeo(a,v);const on=sel&&sel.lv==='a'&&sel.id===a.id;
      h+=`<div class="szamb${on?' on':''}${g?' ok':''}" style="--c:${c}" data-szi="a:${a.id}"><span class="szdot${g?' ok':''}" title="${g?'Ubicado':'Sin ubicar'}"></span><span class="mono">${esc(a.code)}</span><span class="szn">${esc(a.name)}</span><small>${n} act.</small>${ce?`<button class="lnkb" data-szd="a:${a.id}">${g?'Redibujar':'Ubicar'}</button>${g?`<button class="lnkb mu" data-szx="a:${a.id}" title="Quitar la forma de este ambiente">Quitar</button>`:''}`:''}</div>`}});
  if(!T.length)h=`<div class="empty">Este nivel aún no tiene sectores ni ambientes en el lookahead.</div>`;
  else if(!shown&&SZ.miss&&!q)h+=`<div class="callout ok">✓ Todos los ambientes de este nivel están ubicados.</div>`;
  if(el.dataset.h!==h){const st=el.scrollTop;el.innerHTML=h;el.dataset.h=h;el.scrollTop=st}}

/* ---------- barra del mapa ---------- */
function szName(sel){if(!sel)return'';const o=sel.lv==='a'?S.amb.get(sel.id):S.sec.get(sel.id);return o?(sel.lv==='a'?'ambiente ':'sector ')+o.code+' · '+o.name:''}
function szTool(bs){const el=$('#sztool');if(!el)return;const st=szStats(U.piso,SZ.vista);let h='';
  if(bs.length>1)h+=`<span class="seg">${bs.map(b=>`<button data-szv="${b.id}" class="${b.id===SZ.vista?'on':''}">${esc(b.name||b.esp||'Lámina')}</button>`).join('')}</span>`;
  if(SZ.draw&&SZ.sel){h+=`<span class="szdr"><b>${SZ.draw==='poly'?'Toca cada esquina de':'Arrastra un rectángulo sobre'} ${esc(szName(SZ.sel))}</b>${SZ.draw==='poly'?`<button class="ib pri" data-sza="fin"${SZ.tmp.length<3?' disabled':''}>Terminar (${SZ.tmp.length})</button><button class="ib" data-sza="undo"${SZ.tmp.length?'':' disabled'}>Quitar último punto</button><button class="ib" data-sza="rect">▭ Rectángulo</button>`:'<button class="ib" data-sza="poly">⬠ Polígono</button>'}<button class="ib" data-sza="cancel">Cancelar</button></span>`}
  else if(SZ.sel)h+=`<span class="szdr">${esc(szName(SZ.sel))}${canWrite?` <button class="ib pri" data-sza="rect">▭ Ubicar con rectángulo</button><button class="ib" data-sza="poly">⬠ Polígono</button>`:''}</span>`;
  else h+=`<span class="mu">${canWrite?'Elige un ambiente de la lista y toca «Ubicar», o toca una forma de la lámina para seleccionarla.':'Toca una forma de la lámina para ver qué ambiente es.'}</span>`;
  h+=`<span class="fsp"></span>${canWrite?`<label class="chk" title="Al terminar un ambiente, la lista pasa al siguiente sin ubicar"><input type="checkbox" id="szcont"${SZ.cont?' checked':''}> pasar al siguiente</label>`:''}<span class="szpr"><b>${st.k}</b>/${st.n} ambientes ubicados</span>`;
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}}

/* ---------- mapa ---------- */
function szShapes(){const pid=U.piso,v=SZ.vista;const out=[];const sel=SZ.sel;
  szTree(pid).forEach(({s,ambs},i)=>{const c=SZ_PAL[i%SZ_PAL.length];const sg=szGeo(s,v);
    if(sg)out.push({id:'s:'+s.id,kind:'s',pts:sg,label:s.code,c,sel:!!(sel&&sel.lv==='s'&&sel.id===s.id)});
    for(const{a}of ambs){const g=szGeo(a,v);if(g)out.push({id:'a:'+a.id,kind:'a',pts:g,label:a.code,c,sel:!!(sel&&sel.lv==='a'&&sel.id===a.id),dim:!!(sel&&sel.lv==='s'&&sel.id!==s.id)})}});
  return out}
function szMap(){const host=$('#szmap');const API=window.__plano;if(!host)return;if(!API||!API.ambMap){host.innerHTML='<div class="kemp">Cargando láminas…</div>';return}
  API.ambMap(host,{pid:U.piso,vista:SZ.vista,canEdit:canWrite,shapes:szShapes(),draw:SZ.sel?SZ.draw:null,tmp:SZ.draw==='poly'?SZ.tmp:null,
    onDrawn:(pts,vista)=>szSave(pts,vista||SZ.vista),onPoly:p=>{SZ.tmp.push(p);szTool(szBase(U.piso));szMap()},
    onPick:id=>{if(!id){SZ.sel=null}else{const[lv,x]=id.split(':');SZ.sel={lv,id:x}}szRefresh();const it=SZ.sel&&$(`#szlist [data-szi="${SZ.sel.lv}:${SZ.sel.id}"]`);if(it)it.scrollIntoView({block:'nearest'})}})}
function szRefresh(){szList();szTool(szBase(U.piso));szMap()}

/* ---------- guardar ---------- */
function szSave(pts,vista){const sel=SZ.sel;if(!sel||!canWrite)return;const o=sel.lv==='a'?S.amb.get(sel.id):S.sec.get(sel.id);if(!o)return;
  apply([op(szCol(sel.lv),o.id,{...o,geo:{...(o.geo||{}),[vista]:pts}})],`${sel.lv==='a'?'Ambiente':'Sector'} ${o.code} ubicado en la lámina`);
  SZ.draw=null;SZ.tmp=[];
  if(sel.lv==='a'&&SZ.cont){const nx=szNext(sel.id);if(nx){SZ.sel={lv:'a',id:nx};SZ.draw='rect'}else{SZ.sel=null;toast('✓ Todos los ambientes de este nivel están ubicados')}}
  requestRender()}
function szNext(after){const v=SZ.vista;const L=szTree(U.piso).flatMap(({ambs})=>ambs.map(({a})=>a));const i=L.findIndex(a=>a.id===after);
  return(L.slice(i+1).find(a=>!szGeo(a,v))||L.find(a=>a.id!==after&&!szGeo(a,v))||{}).id||null}
function szClear(lv,id){const o=lv==='a'?S.amb.get(id):S.sec.get(id);if(!o||!o.geo)return;const g={...o.geo};delete g[SZ.vista];
  apply([op(szCol(lv),id,{...o,geo:g})],`${lv==='a'?'Ambiente':'Sector'} ${o.code}: se quitó su ubicación`)}

/* propuesta desde las zonas ya dibujadas en el Plan diario (solo para lo que falta) */
async function szSuggest(){const API=window.__plano;if(!API||!canWrite)return;const v=SZ.vista;toast('Buscando zonas del Plan diario…');
  const M_=await API.ambSuggest(U.piso,v);const ops=[];for(const[am,pts]of M_){const a=S.amb.get(am);if(!a||szGeo(a,v))continue;const sc=S.sec.get(a.sectorId);if(!sc||pisoOfSecObj(sc)!==U.piso)continue;ops.push(op('ambientes',a.id,{...a,geo:{...(a.geo||{}),[v]:pts}}))}
  if(!ops.length){toast('No hay zonas del Plan diario que sirvan para los ambientes que faltan.');return}
  if(!confirm(`Se proponen ${ops.length} ambiente(s) con el rectángulo que cubre las zonas que ya se dibujaron para sus actividades. Revísalos y corrige los que no calcen. ¿Aplicar?`))return;
  apply(ops,`${ops.length} ambiente(s) ubicados desde el Plan diario`)}
/* pisos típicos: copiar formas de otro piso por código de ambiente y de sector */
function szCopyMenu(btn){const API=window.__plano;const others=pisos().filter(p=>p.id!==U.piso&&szStats(p.id).k);
  if(!others.length){toast('Ningún otro piso tiene ambientes ubicados todavía.');return}
  openPop(btn,`<div class="ph">Copiar ubicaciones de otro piso</div><div class="ptx">Para pisos típicos: copia la forma de cada ambiente y sector cuyo <b>código</b> coincida. Solo sirve si las láminas tienen el mismo encuadre. No toca lo que ya está ubicado aquí.</div>${others.map(p=>`<button data-do="p_${p.id}">${esc(p.code)} · ${esc(p.name)} <kbd>${szStats(p.id).k} ubicados</kbd></button>`).join('')}`,
    Object.fromEntries(others.map(p=>['p_'+p.id,()=>szCopy(p.id)])))}
function szCopy(src){const sv=(szBase(src)[0]||{}).id;const v=szBase(U.piso)&&SZ.vista;if(!v)return;const ops=[];
  const ST=szTree(src),DT=szTree(U.piso);const geoS=o=>o.geo&&(o.geo[sv]||Object.values(o.geo).find(g=>g&&g.length>=6));
  const sBy=new Map(ST.map(({s})=>[s.code,s])),aBy=new Map(ST.flatMap(({ambs})=>ambs.map(({a})=>[a.code,a])));
  for(const{s,ambs}of DT){const so=sBy.get(s.code);if(so&&geoS(so)&&!szGeo(s,v))ops.push(op('sectors',s.id,{...s,geo:{...(s.geo||{}),[v]:geoS(so)}}));
    for(const{a}of ambs){const ao=aBy.get(a.code);if(ao&&geoS(ao)&&!szGeo(a,v))ops.push(op('ambientes',a.id,{...a,geo:{...(a.geo||{}),[v]:geoS(ao)}}))}}
  if(!ops.length){toast('No hay códigos que coincidan con formas por copiar.');return}
  apply(ops,`${ops.length} ubicación(es) copiadas de ${S.pis.get(src)?.code||'otro piso'}`)}

/* ---------- eventos ---------- */
function szClick(e){const t=e.target;let b;
  if(t.closest('.szold')){planosOldClick(e);if(t.closest('summary'))SZ.old=!t.closest('details').open;return}
  if((b=t.closest('[data-szp]'))){U.piso=b.dataset.szp;U.pisoAll=false;saveUI();SZ.sel=null;SZ.draw=null;SZ.tmp=[];render();return}
  if(t.id==='szlam'){if(U.piso&&window.__plano&&window.__plano.M){window.__plano.M.piso=U.piso}goTab('mapa');return}
  if(t.id==='szsug'){szSuggest();return}
  if(t.id==='szcopy'){szCopyMenu(t);return}
  if((b=t.closest('[data-szv]'))){SZ.vista=b.dataset.szv;SZ.draw=null;SZ.tmp=[];szRefresh();return}
  if((b=t.closest('[data-szx]'))){const[lv,id]=b.dataset.szx.split(':');szClear(lv,id);return}
  if((b=t.closest('[data-szd]'))){const[lv,id]=b.dataset.szd.split(':');SZ.sel={lv,id};SZ.draw='rect';SZ.tmp=[];szRefresh();return}
  if((b=t.closest('[data-sza]'))){const k=b.dataset.sza;
    if(k==='rect'||k==='poly'){SZ.draw=k;SZ.tmp=[]}else if(k==='cancel'){SZ.draw=null;SZ.tmp=[]}else if(k==='undo')SZ.tmp.pop();
    else if(k==='fin'&&SZ.tmp.length>=3){const P=SZ.tmp;SZ.tmp=[];szSave(P.flatMap(p=>[p.x,p.y]),SZ.vista);return}
    szRefresh();return}
  if((b=t.closest('[data-szi]'))){const[lv,id]=b.dataset.szi.split(':');SZ.sel={lv,id};if(SZ.draw&&!(SZ.sel.lv===lv&&SZ.sel.id===id))SZ.draw=null;szRefresh();
    const o=lv==='a'?S.amb.get(id):S.sec.get(id);const g=szGeo(o,SZ.vista);if(g&&window.__plano)window.__plano.ambFocus($('#szmap'),g)}}
function szChange(e){const t=e.target;if(t.closest('.szold')){planosOldChange(e);return}
  if(t.id==='szmiss'){SZ.miss=t.checked;szList();return}
  if(t.id==='szcont'){SZ.cont=t.checked;return}}
/* Esc cancela el dibujo */
document.addEventListener('keydown',e=>{if(U.tab!=='planos'||!SZ.draw)return;if(e.key==='Escape'){SZ.draw=null;SZ.tmp=[];szRefresh()}if(e.key==='Enter'&&SZ.draw==='poly'&&SZ.tmp.length>=3){const P=SZ.tmp;SZ.tmp=[];szSave(P.flatMap(p=>[p.x,p.y]),SZ.vista)}});

/** Desde el lookahead: abrir Sectorización en ese ambiente, listo para ubicarlo */
function szGoAmb(ambId){const a=S.amb.get(ambId);if(!a)return;const pid=pisoOfAmb(ambId);if(pid){U.piso=pid;U.pisoAll=false;saveUI()}SZ.sel={lv:'a',id:ambId};SZ.draw=canWrite&&!szGeo(a,SZ.vista)?'rect':null;SZ.tmp=[];goTab('planos')}
