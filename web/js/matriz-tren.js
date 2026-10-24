"use strict";
/* LPS 911 · Matriz › Tren de trabajo (oct 2026, decidido con el dueño).
   Un solo orden general de las actividades del catálogo (secuencia constructiva). Cada tipo de ambiente usa las que le aplican,
   en este mismo orden. Se guarda en mcat.tr (número; sin tr = fuera del tren). Lo usan:
   - el Lookahead: las filas fantasma («Faltan programar») se ubican dentro del ambiente según el tren (`lkGhMerge`);
   - el Recorrido: la checklist sigue el tren (`mxSeqCmp`).
   Las filas reales del lookahead NO se reordenan. Ver docs/ia/matriz.md › Tren de trabajo. */

const MXT={tipo:'',q:'',drag:null,init:false};
const mxTrOn=c=>c&&!c.arch&&typeof c.tr==='number';
/* actividades del tren, en orden */
function mxTrList(){return mxCatAct0().filter(mxTrOn).sort((a,b)=>a.tr-b.tr||a.name.localeCompare(b.name))}
/* posición en el tren de una actividad (null = fuera del tren) */
function mxTrOf(cid){const c=cid&&MX.cat.get(cid);return mxTrOn(c)?c.tr:null}
/* actividades que aparecen en ambientes de un tipo (por el tipo, el lookahead o a mano) */
function mxTrTipoSet(tid){const T=MX.tipo.get(tid);const s=new Set((T&&T.acts)||[]);for(const[amb,C]of mxCells()){const m=MX.amb.get(amb);if(m&&m.tipo===tid)for(const k of Object.keys(C))s.add(k)}return s}

/* guarda tr: {id:valor|null}; deshacer vuelve a los valores anteriores */
async function mxTrWrite(chg,label){if(!mxEd())return;const ids=Object.keys(chg);if(!ids.length)return;
  const prev={};ids.forEach(id=>{const c=MX.cat.get(id);prev[id]=c&&typeof c.tr==='number'?c.tr:null});
  const put=async m=>{const L=Object.entries(m);for(let i=0;i<L.length;i+=400){const b=db.batch();
      for(const[id,v]of L.slice(i,i+400))b.set(fcol('mcat').doc(id),{tr:v==null?mxFV().delete():v,...mxNow()},{merge:true});await b.commit()}};
  /* se ve al instante; la base lo confirma después */
  const loc=m=>{for(const[id,v]of Object.entries(m)){const c=MX.cat.get(id);if(!c)continue;if(v==null)delete c.tr;else c.tr=v}MX.v++;requestRender()};
  loc(chg);
  try{await put(chg);toast(label,'Deshacer',async()=>{loc(prev);try{await put(prev)}catch(e){mxErr(e)}})}catch(e){loc(prev);mxErr(e)}}
/* mover dentro del tren: se reparten los mismos números entre las posiciones afectadas (solo cambian esas) */
function mxTrMove(from,to){const L=mxTrList();if(from===to||from<0||to<0||from>=L.length||to>=L.length)return;
  const V=L.map(c=>c.tr);const O=L.slice();const[m]=O.splice(from,1);O.splice(to,0,m);
  const chg={};O.forEach((c,i)=>{if(c.tr!==V[i])chg[c.id]=V[i]});mxTrWrite(chg,`«${m.name}» movida a la posición ${to+1}`)}
function mxTrAdd(id){const L=mxTrList();const c=MX.cat.get(id);if(!c)return;mxTrWrite({[id]:(L.length?L[L.length-1].tr:0)+10},`«${c.name}» agregada al final del tren`)}
function mxTrDel(id){const c=MX.cat.get(id);if(!c)return;mxTrWrite({[id]:null},`«${c.name}» quitada del tren`)}
/* importar un orden pegado: [{k:id,…}] (lo que da la página de borrador) o una lista de ids o nombres, uno por línea */
async function mxTrImport(){if(!isAdmin)return;
  const t=await uiAsk({title:'Cargar el orden del tren',text:'Pega la lista en orden: el resultado copiado de la página del tren (JSON) o un nombre de actividad por línea.',input:{label:'Orden',required:true},ok:'Revisar',tone:'info'});
  if(!t)return;let ids=[];const miss=[];const byN=new Map(mxCatAct0().map(c=>[mnk(c.name),c.id]));
  try{const j=JSON.parse(t);if(!Array.isArray(j))throw 0;for(const o of j){const k=typeof o==='string'?o:o&&o.k;const id=MX.cat.has(k)?k:byN.get(mnk(typeof o==='string'?o:o&&o.n||''));if(id&&!MX.cat.get(id).arch)ids.push(id);else miss.push(typeof o==='string'?o:(o&&(o.n||o.k))||'?')}}
  catch(_){for(const l of String(t).split(/\n|;/).map(s=>s.trim()).filter(Boolean)){const id=MX.cat.has(l)?l:byN.get(mnk(l));if(id&&!MX.cat.get(id).arch)ids.push(id);else miss.push(l)}}
  ids=[...new Set(ids)];if(!ids.length){toast('No se reconoció ninguna actividad del catálogo.');return}
  const out=mxTrList().filter(c=>!ids.includes(c.id));
  if(!await uiAsk({title:'¿Cargar este orden?',text:`${ids.length} actividades quedan en el tren en ese orden.`,list:[out.length?`${out.length} que hoy están en el tren salen de él.`:'Ninguna actividad sale del tren.',miss.length?`No se encontraron en el catálogo (se omiten): ${miss.slice(0,8).join(', ')}${miss.length>8?'…':''}`:'Todas se encontraron en el catálogo.'],note:'No cambia el lookahead ni la Matriz: solo el orden de las fantasmas y del Recorrido. Se puede deshacer.',ok:'Cargar',tone:'info'}))return;
  const chg={};ids.forEach((id,i)=>{const v=(i+1)*10;if(MX.cat.get(id).tr!==v)chg[id]=v});out.forEach(c=>chg[c.id]=null);
  mxTrWrite(chg,`Tren cargado: ${ids.length} actividades`)}

function renderMxTren(main,head){const ed=mxEd();const L=mxTrList();const tipos=[...MX.tipo.values()].filter(t=>!t.arch).sort((a,b)=>(a.order||0)-(b.order||0)||a.name.localeCompare(b.name));
  if(!MXT.init&&tipos.length){MXT.init=true;MXT.tipo=tipos[0].id}
  if(MXT.tipo&&!MX.tipo.has(MXT.tipo))MXT.tipo='';const TS=MXT.tipo?mxTrTipoSet(MXT.tipo):null;
  const tipN=new Map();for(const t of tipos)for(const k of t.acts||[])tipN.set(k,(tipN.get(k)||0)+1);
  const vis=L.map((c,i)=>({c,i})).filter(r=>!TS||TS.has(r.c.id));
  const q=mnk(MXT.q);const fuera=mxCatAct0().filter(c=>!mxTrOn(c)&&(!TS||TS.has(c.id))&&(!q||mnk(c.name).includes(q)||mnk(conOf(c.sc).name).includes(q))).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||a.name.localeCompare(b.name));
  const row=({c,i},n)=>{const co=conOf(c.sc);return`<li class="mxtr${ed?' dg':''}" data-tri="${i}"${ed?' draggable="true"':''}><span class="mxtrn">${n}</span><i class="mxtrd" style="background:${esc(co.color)}"></i><span class="mxtrt"><b>${esc(c.name)}</b><small>${esc(co.name)}${tipN.get(c.id)?` · en ${tipN.get(c.id)} ${tipN.get(c.id)===1?'tipo':'tipos'}`:''}</small></span>${ed?`<span class="mxtrb"><button class="ab" data-trup="${i}" aria-label="Subir"${n===1?' disabled':''}>↑</button><button class="ab" data-trdn="${i}" aria-label="Bajar"${n===vis.length?' disabled':''}>↓</button><button class="ab" data-trdel="${esc(c.id)}" aria-label="Quitar del tren" title="Quitar del tren">×</button></span>`:''}</li>`};
  main.innerHTML=`<div class="scroll"><div class="wrap mxwrap">${mxHd(head,mxViewSeg())}
   ${helpBox('Qué es el tren de trabajo',`<p>Es la secuencia constructiva general: el orden en que se ejecutan las actividades en cualquier ambiente. Cada tipo de ambiente usa solo las que le aplican, en este mismo orden. Elige un tipo para ver su secuencia; «Todo el tren» muestra la general.</p><p>Se usa para ubicar las filas de «Faltan programar» dentro de cada ambiente del Lookahead (después de la actividad que la antecede en el tren) y para ordenar la checklist del Recorrido. Las filas que ya existen en el lookahead no se reordenan.</p>`)}
   <div class="fbar"><span class="seg mxtrseg" role="group" aria-label="Tipo de ambiente">${tipos.map(t=>`<button class="${t.id===MXT.tipo?'on':''}" data-trtp="${esc(t.id)}" aria-pressed="${t.id===MXT.tipo}">${esc(t.name)}</button>`).join('')}<button class="${MXT.tipo?'':'on'}" data-trtp="" aria-pressed="${!MXT.tipo}">Todo el tren</button></span>
    <span class="note">${MXT.tipo?`${vis.length} de ${L.length} actividades del tren`:`${L.length} actividades en el tren`}</span><span class="fsp"></span>${isAdmin?'<button class="ib" id="mxtrimp" title="Pegar un orden completo (por ejemplo, el acordado en el borrador)">Cargar orden…</button>':''}</div>
   ${L.length?`<ol class="mxtrl" id="mxtrl">${vis.map((r,j)=>row(r,j+1)).join('')||'<li class="note">Ninguna actividad del tren aparece en este tipo.</li>'}</ol>`:`<div class="callout">El tren está vacío. ${isAdmin?'Usa «Cargar orden…» para pegar el orden acordado, o agrega actividades desde la lista de abajo.':ed?'Agrega actividades desde la lista de abajo.':'El administrador debe cargarlo.'}</div>`}
   <details class="card mxtrf"${MXT.q?' open':''}><summary>Fuera del tren <span class="note">(${fuera.length})</span></summary>
    <div class="fbar"><input class="tin" id="mxtrq" placeholder="Buscar actividad o SC" value="${esc(MXT.q)}" aria-label="Buscar fuera del tren"></div>
    <ul class="mxtrl">${fuera.slice(0,300).map(c=>{const co=conOf(c.sc);return`<li class="mxtr"><span class="mxtrn"></span><i class="mxtrd" style="background:${esc(co.color)}"></i><span class="mxtrt"><b>${esc(c.name)}</b><small>${esc(co.name)}</small></span>${ed?`<span class="mxtrb"><button class="ib" data-tradd="${esc(c.id)}">+ Al final</button></span>`:''}</li>`}).join('')||'<li class="note">Nada.</li>'}</ul>
    <p class="note">Sin lugar en el tren, su fila de «Faltan programar» sale al final del ambiente.</p></details>
   </div></div>`;
  mxWireV(main);
  main.querySelectorAll('[data-trtp]').forEach(b=>b.onclick=()=>{MXT.tipo=b.dataset.trtp;render()});
  const qi=$('#mxtrq',main);if(qi)qi.oninput=()=>{MXT.q=qi.value;clearTimeout(MXT.qt);MXT.qt=setTimeout(()=>{render();const n=$('#mxtrq');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)};
  const im=$('#mxtrimp',main);if(im)im.onclick=mxTrImport;
  if(!ed)return;
  /* con un tipo elegido, ↑/↓ saltan a la anterior/siguiente que se ve (las demás del tren no se mueven entre sí) */
  const vi=vis.map(r=>r.i);
  main.querySelectorAll('[data-trup]').forEach(b=>b.onclick=()=>{const i=+b.dataset.trup;const k=vi.indexOf(i);if(k>0)mxTrMove(i,vi[k-1])});
  main.querySelectorAll('[data-trdn]').forEach(b=>b.onclick=()=>{const i=+b.dataset.trdn;const k=vi.indexOf(i);if(k>=0&&k<vi.length-1)mxTrMove(i,vi[k+1])});
  main.querySelectorAll('[data-trdel]').forEach(b=>b.onclick=()=>mxTrDel(b.dataset.trdel));
  main.querySelectorAll('[data-tradd]').forEach(b=>b.onclick=()=>mxTrAdd(b.dataset.tradd));
  const ol=$('#mxtrl',main);if(!ol)return;
  ol.addEventListener('dragstart',e=>{const li=e.target.closest('[data-tri]');if(!li)return;MXT.drag=+li.dataset.tri;li.classList.add('drg');e.dataTransfer.effectAllowed='move'});
  ol.addEventListener('dragover',e=>{const li=e.target.closest('[data-tri]');if(!li||MXT.drag==null)return;e.preventDefault();ol.querySelectorAll('.ovr').forEach(x=>x.classList.remove('ovr'));li.classList.add('ovr')});
  ol.addEventListener('drop',e=>{const li=e.target.closest('[data-tri]');if(!li||MXT.drag==null)return;e.preventDefault();const f=MXT.drag;MXT.drag=null;mxTrMove(f,+li.dataset.tri)});
  ol.addEventListener('dragend',()=>{MXT.drag=null;ol.querySelectorAll('.drg,.ovr').forEach(x=>x.classList.remove('drg','ovr'))})}

/* ---------- Lookahead: ubicar las fantasmas según el tren ----------
   vis = filas reales del ambiente (en su orden, no cambia); gh = fantasmas. Cada fantasma va después de la fila real cuya actividad
   la antecede más de cerca en el tren; si ninguna la antecede, antes de la que la sigue más de cerca; sin tren, al final.
   Devuelve [{x}|{g}] en el orden de dibujo. */
function lkGhMerge(vis,gh){if(!gh.length)return vis.map(x=>({x}));
  const R=vis.map((x,i)=>({i,t:mxTrOf(mxCatOf(x))})).filter(r=>r.t!=null);const n=vis.length;
  const slot=g=>{const t=mxTrOf(g.c.id);if(t==null||!R.length)return[n,t==null?Infinity:t];let p=null,s=null;
    for(const r of R){if(r.t<=t&&(!p||r.t>p.t||(r.t===p.t&&r.i>p.i)))p=r;if(r.t>t&&(!s||r.t<s.t||(r.t===s.t&&r.i<s.i)))s=r}
    return[p?p.i+1:s?s.i:n,t]};
  const G=gh.map((g,j)=>{const[sl,t]=slot(g);return{g,sl,t,j}}).sort((a,b)=>a.sl-b.sl||a.t-b.t||a.j-b.j);
  const out=[];let k=0;for(let i=0;i<=n;i++){while(k<G.length&&G[k].sl===i)out.push({g:G[k++].g});if(i<n)out.push({x:vis[i]})}return out}

/* ---------- Lookahead: terminadas en la Matriz y aún programadas (opción B, decidida con el dueño 11/10) ----------
   Con «Faltan programar» encendido: los días desde mañana de esas filas se ven rayados (td.mxt) y el ambiente lleva el chip «N ✓ en Matriz». */
function lkMxtPop(btn,ambId){const a=S.amb.get(ambId);if(!a)return;const L=[...S.act.values()].filter(x=>x.ambId===ambId&&!x._del&&scOk(x.sc)&&mxRowWarn(x));if(!L.length)return;
  openPop(btn,`<div class="ph">${esc(a.code)} · terminadas en la Matriz</div><div class="ptx">La Matriz las da como terminadas (o no aplica), pero siguen programadas desde mañana. Sus días se ven rayados.</div>
   ${L.map((x,i)=>`<button data-do="v${i}">${esc(x.name)} · ${esc(conOf(x.sc).name)}</button>`).join('')}`,
   Object.fromEntries(L.flatMap((x,i)=>[['v'+i,()=>{const r=document.querySelector(`#grid tr[data-a="${CSS.escape(x.id)}"] [data-mxw]`);if(r)r.click();else gotoAct(x.id)}]])))}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mxtamb]');if(!b)return;e.stopPropagation();lkMxtPop(b,b.dataset.mxtamb)},true);

/* ---------- Lookahead: tren invertido (auditoría tanda 2, C-16 / CON-02) ----------
   Dentro de un mismo ambiente, una actividad que EMPIEZA ANTES que su predecesora según el tren (mcat.tr) lleva una marca discreta
   en sus días «adelantados» (td.tinv, los anteriores al inicio de la predecesora) y el ambiente muestra «⚠ N fuera de secuencia».
   Empezar el mismo día no cuenta (trabajo en paralelo). No avisa si la predecesora está terminada (Campo, o Matriz Terminado /
   No aplica) o no tiene días. No compara entre ambientes. Solo avisa: no bloquea ni mueve nada.
   lkTrInv(ambId, acts) → Map actId → {y: predecesora, ps: su inicio} | null. Caché por ambiente mientras no cambien los datos. */
const LKTI={k:'',src:null,any:false,m:new Map()};
function lkTrInv(ambId,acts){if(!MX.ld.cat)return null;
  const k=[DV,DONEV,MX.v,typeof revOn==='function'&&revOn()?1:0,U.revCtx?1:0,PM()?1:0].join('|');
  if(LKTI.k!==k||LKTI.src!==S.act){LKTI.k=k;LKTI.src=S.act;LKTI.m=new Map();LKTI.any=false;for(const c of MX.cat.values())if(mxTrOn(c)){LKTI.any=true;break}}
  if(!LKTI.any)return null;let r=LKTI.m.get(ambId);if(r!==undefined)return r;
  const st=(MX.amb.get(ambId)||{}).c||{};const L=[];
  for(const x of acts){if(!x||x._del)continue;const ds=Array.isArray(x.days)?x.days:[];if(!ds.length)continue;const c=mxCatOf(x);const t=c?mxTrOf(c):null;if(t==null)continue;
    let s=ds[0];for(const d of ds)if(d<s)s=d;L.push({x,t,s,done:DONE.has(x.id)||st[c]==='t'||st[c]==='n'})}
  r=null;
  for(const e of L){if(e.done)continue;let p=null;
    for(const f of L)if(f!==e&&!f.done&&f.t<e.t&&f.s>e.s&&(!p||f.t>p.t||(f.t===p.t&&f.s>p.s)))p=f;
    if(p){if(!r)r=new Map();r.set(e.x.id,{y:p.x,ps:p.s})}}
  LKTI.m.set(ambId,r);return r}
const lkTrInvTip=v=>`Va antes que su predecesora: ${v.y.name} (empieza el ${fmtD(v.ps)})`;
