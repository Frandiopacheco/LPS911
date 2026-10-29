"use strict";
/* LPS 911 · Grupos de especialidades (29-10-2026, pedido del dueño). En la reunión del lookahead un ambiente junta muchas filas
   (buena parte, instalaciones) y no se ve el tren continuo. Cada especialidad pertenece a un grupo (Arquitectura, Instalaciones,
   Estructuras, Otros: meta/project.egrp = {id:{n,o,arch?}}, esps[id].g = id del grupo; sin elegir, se sugiere por el nombre).
   El grupo de una actividad es el de la especialidad de su SC.
   - Lookahead: «Grupo» (U.grp) deja solo las filas del grupo (scOk) y resume las de los otros grupos en UNA fila gris por
     ambiente (los días en que el ambiente está ocupado); tocarla la despliega (LKOGX). El Asistente (filas fantasma) sigue
     funcionando: muestra lo pendiente del grupo.
   - Matriz y Tablero: el menú de subcontratistas trae los grupos para elegir todos sus SC de una vez.
   Ver docs/ia/lookahead.md «Grupos de especialidades». */

const EGRP_DEF={arq:{n:'Arquitectura',o:1},ins:{n:'Instalaciones',o:2},est:{n:'Estructuras',o:3},otr:{n:'Otros',o:4}};
const egrpMap=()=>P().egrp||EGRP_DEF;
function egrpList(all){return Object.entries(egrpMap()).map(([id,o])=>({id,...o})).filter(g=>all||!g.arch).sort((a,b)=>(a.o||0)-(b.o||0)||String(a.n).localeCompare(String(b.n)))}
const egrpOk=g=>{const o=g&&egrpMap()[g];return o&&!o.arch?g:''};
const egrpN=g=>g?((egrpMap()[g]||{}).n||'Otros'):'Sin especialidad';
/** grupo sugerido por el nombre de la especialidad, mientras no se elija en Configuración › Especialidades */
function egrpGuess(name){const k=mnk(name);if(!k)return'';
  if(/\b(instal|electr|sanitar|desag|agua|incendio|aire|hvac|climatiz|ventilac|extracc|comunicac|telecom|cableado|data|cctv|gas|gasfit|mecanic|deteccion|alarma|bms|domotic)/.test(k))return'ins';
  if(/\b(estructur|concreto|encofr|acero|armadur|casco|cimentac|excavac|movimiento de tierra|muro pantalla|anclaje)/.test(k))return'est';
  return'arq'}
/** grupo de una especialidad (id de la lista o texto antiguo): el elegido o el sugerido */
function espGrp(v){if(!v)return'';if(espIsId(v)){const o=espMap()[espId(v)]||{};return egrpOk(o.g)||egrpOk(egrpGuess(o.n))}return egrpOk(egrpGuess(v))}
const espGrpSet=v=>{const o=espIsId(v)&&espMap()[espId(v)];return!!(o&&egrpOk(o.g))};
/* grupo de cada SC: el scOk del lookahead lo pide por cada fila, se guarda hasta que cambian los datos (DV) */
const SCGC={v:-1,p:null,m:new Map()};
function scGrp(sc){const p=P();if(SCGC.v!==DV||SCGC.p!==p){SCGC.v=DV;SCGC.p=p;SCGC.m.clear()}let g=SCGC.m.get(sc);
  if(g===undefined){const c=S.con.get(sc);g=c&&c.esp?espGrp(c.esp):'';SCGC.m.set(sc,g)}return g}
/** hay un grupo elegido (la vista Cliente no lo usa) */
const grpOn=()=>!!U.grp&&!(U.cliv&&U.tab==='look')&&!!egrpOk(U.grp);
const grpOk=sc=>!grpOn()||scGrp(sc)===U.grp;
/** de una lista de SC, los del grupo g */
const grpScs=(g,ids)=>ids.filter(id=>scGrp(id)===g);
/** grupos con algún SC en la lista (en el orden de la lista de grupos) */
function grpPresent(ids){const s=new Set(ids.map(scGrp));return egrpList().filter(g=>s.has(g.id))}

/* ---------- Lookahead ---------- */
const LKOGX=new Set(); /* filas resumen desplegadas: «ambiente|grupo» (solo en esta sesión) */
function lkGrpSet(g){U.grp=U.grp===g?'':g;U.sc='';LKOGX.clear();gridRows=null;saveUI();requestRender()}
/** selector de la barra: solo si hay SC de dos grupos o más a la vista (o ya hay uno elegido) */
function lkGrpHtml(present){const G=grpPresent([...present]);const cur=egrpOk(U.grp);if(G.length<2&&!cur)return'';if(cur&&!G.some(g=>g.id===cur))G.push({id:cur,n:egrpN(cur)});
  return`<span class="seg lkgrp" role="group" aria-label="Grupo de especialidades" title="Ver solo las filas de un grupo. Las de los otros grupos quedan en una fila gris por ambiente (toca para desplegarla). Los grupos se ajustan en Configuración › Especialidades."><button data-grp=""${cur?'':' class="on"'}>Todos</button>${G.map(g=>`<button data-grp="${esc(g.id)}"${cur===g.id?' class="on"':''}>${esc(g.n)}</button>`).join('')}</span>`}
/** filas de los otros grupos en un ambiente: una fila resumen por grupo ({o}) y, si está desplegada, sus actividades ({x,og}) */
function lkOgItems(aId,OG){if(!OG.length)return[];const by=new Map();for(const x of OG){const g=scGrp(x.sc);if(!by.has(g))by.set(g,[]);by.get(g).push(x)}
  const ord=new Map(egrpList().map((g,i)=>[g.id,i]));const out=[];
  for(const g of [...by.keys()].sort((a,b)=>(ord.get(a)??99)-(ord.get(b)??99))){const L=by.get(g);const k=aId+'|'+g;const open=LKOGX.has(k);out.push({o:{g,L,k,open}});if(open)for(const x of L)out.push({x,og:1})}
  return out}
/** fila resumen: barra gris en los días en que algún SC del grupo trabaja en el ambiente (más oscura con más actividades) */
function lkOgRow(a,o,first,ambHtml,days,DI,nd){const by=new Map();let d0='',d1='';
  for(const x of o.L)for(const d of Array.isArray(x.days)?x.days:[]){if(!by.has(d))by.set(d,[]);by.get(d).push(x);if(!d0||d<d0)d0=d;if(d>d1)d1=d}
  const gn=egrpN(o.g);const scs=[...new Set(o.L.map(x=>conOf(x.sc).name))];const n=o.L.length;
  let h=`<tr class="ar lkog${first?' first':''}${o.open?' open':''}" data-og="${esc(o.k)}"><td class="s0"></td>${ambHtml}<td class="s3 lkogn"><button class="lkogb" aria-expanded="${o.open}" title="${o.open?'Ocultar':'Ver'} las actividades de ${esc(gn)} en este ambiente">${o.open?'▾':'▸'} ${esc(gn)}</button></td>
   <td class="s4 act lkoga" title="${esc(o.L.map(x=>x.name+' · '+conOf(x.sc).name).join('\n'))}">${n} actividad${n===1?'':'es'} · ${esc(scs.join(', '))}</td><td class="cU"></td><td class="cM"></td><td class="cS"></td><td class="ro cN"></td><td class="ro cI">${fmtS(d0)}</td><td class="ro cF">${fmtS(d1)}</td>`;
  for(let i=0;i<nd;i++){const di=DI[i];const L=by.get(days[i].d);const k=L?L.length:0;let cl=di.pre;
    if(k){cl+=' ogo og'+Math.min(k,3);if(i===0||!by.has(days[i-1].d))cl+=' rs';if(i===nd-1||!by.has(days[i+1].d))cl+=' re'}
    h+=`<td class="${cl}${di.post}"${k?` title="${di.f} · ${esc(gn)}: ${esc(L.map(x=>x.name+' ('+conOf(x.sc).name+')').join(', '))}"`:''}>${k>1?`<span class="ogn">${k}</span>`:''}</td>`}
  return h+'</tr>'}
/** «Ver en el lookahead» de una actividad de otro grupo: se despliega su fila resumen en vez de quitar el grupo */
function lkOgReveal(x){if(!x||!grpOn()||grpOk(x.sc))return false;LKOGX.add(x.ambId+'|'+scGrp(x.sc));gridRows=null;return true}
function lkOgWire(tbl){tbl.addEventListener('click',e=>{const b=e.target.closest('.lkogb,.lkoga');if(!b)return;const tr=b.closest('tr[data-og]');if(!tr)return;
  const k=tr.dataset.og;LKOGX.has(k)?LKOGX.delete(k):LKOGX.add(k);requestRender()})}

/* ---------- Matriz y Tablero: elegir los SC de un grupo de una vez ---------- */
/** botones de grupo para el menú de subcontratistas; attr: data-* que los identifica; ids: SC del menú; sel: los elegidos */
function grpMenuHtml(attr,ids,sel){const G=grpPresent(ids);if(G.length<2)return'';const S_=new Set(sel);
  return`<div class="ptx mu">Grupo</div><div class="mxscl grpm">${G.map(g=>{const L=grpScs(g.id,ids);const on=L.length===S_.size&&L.every(id=>S_.has(id));return`<button ${attr}="${esc(g.id)}"${on?' class="on"':''}>${esc(g.n)} <small>${L.length}</small>${on?' ✓':''}</button>`}).join('')}</div>`}
/** nombre del grupo si lo elegido son exactamente sus SC (para la etiqueta del botón) */
function grpLabel(ids,sel){if(!sel.length)return'';const g=scGrp(sel[0]);if(!g)return'';const L=grpScs(g,ids);return L.length===sel.length&&sel.every(id=>scGrp(id)===g)&&L.length>1?egrpN(g):''}

/* ---------- Configuración › Especialidades: grupos ---------- */
function egrpSel(e){const g=espGrpSet(e.id)?(espMap()[e.id]||{}).g:'';const sug=egrpOk(egrpGuess(e.n));const L=egrpList();
  return`<select class="ci" data-esg="${esc(e.id)}" aria-label="Grupo de ${esc(e.n)}"${canWrite?'':' disabled'}><option value=""${g?'':' selected'}>${esc(egrpN(sug))} (sugerido)</option>${L.map(o=>`<option value="${esc(o.id)}"${g===o.id?' selected':''}>${esc(o.n)}</option>`).join('')}${canWrite?'<option value="__new">＋ Nuevo grupo…</option>':''}</select>`}
function egrpSave(G,label,esps){const p={...P(),egrp:G};if(esps)p.esps=esps;apply([op('meta','project',p)],label)}
async function egrpNew(){const t=await uiAsk({title:'Nuevo grupo de especialidades',input:{label:'Nombre (p. ej. Acabados)',required:true},ok:'Agregar',tone:'info'});
  const v=t?String(t).replace(/\s+/g,' ').trim():'';if(!v)return null;const G={...egrpMap()};const ex=Object.entries(G).find(([,o])=>mnk(o.n)===mnk(v));
  if(ex){if(ex[1].arch){G[ex[0]]={...ex[1]};delete G[ex[0]].arch;egrpSave(G,`Grupo «${ex[1].n}» restaurado`)}return ex[0]}
  const id='g'+NOW().toString(36);G[id]={n:v,o:Math.max(0,...Object.values(G).map(o=>o.o||0))+1};egrpSave(G,`Grupo «${v}» agregado`);return id}
async function egrpPick(sel){const id=sel.dataset.esg;const M=espMap();const o=M[id];if(!o)return;let g=sel.value;
  if(g==='__new'){g=await egrpNew();if(!g){requestRender();return}}
  const esps={...M,[id]:{...o}};if(g)esps[id].g=g;else delete esps[id].g;
  apply([op('meta','project',{...P(),egrp:egrpMap(),esps})],`«${o.n}»: grupo ${g?egrpN(g):'sugerido ('+egrpN(egrpOk(egrpGuess(o.n)))+')'}`)}
/** ventana para renombrar, ordenar y archivar grupos */
function egrpDlg(){if(!canWrite)return;const use={};for(const e of espList())(use[espGrp(e.id)]=use[espGrp(e.id)]||[]).push(e.n);
  const L=egrpList();const arch=egrpList(true).filter(g=>g.arch);
  lqModal(`<div class="lqtop"><b>Grupos de especialidades</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">En el Lookahead puedes ver solo un grupo; los demás quedan en una fila por ambiente. En la Matriz y el Tablero eligen todos sus subcontratistas de una vez.</p>
   <div class="tscroll"><table class="t"><thead><tr><th>Grupo</th><th>Especialidades</th><th></th></tr></thead><tbody>
   ${L.map((g,i)=>`<tr><td><input class="ci" data-egn="${esc(g.id)}" value="${esc(g.n)}" aria-label="Nombre del grupo"></td><td class="note">${(use[g.id]||[]).map(esc).join(', ')||'Ninguna'}</td>
     <td style="white-space:nowrap">${i?`<button class="ab" data-egup="${esc(g.id)}" title="Subir" aria-label="Subir">↑</button>`:''}${(use[g.id]||[]).length?'':`<button class="ab" data-egarc="${esc(g.id)}" title="Archivar" aria-label="Archivar">🗑</button>`}</td></tr>`).join('')}
   </tbody></table></div>
   ${arch.length?`<p class="note">Archivados: ${arch.map(g=>`${esc(g.n)} <button class="lnkb" data-egres="${esc(g.id)}">restaurar</button>`).join(' · ')}</p>`:''}
   <div class="lqbtns"><button class="ib" id="egadd">+ Grupo</button><button class="ib pri" data-lqx>Listo</button></div>`,
   async e=>{const b=e.target.closest('button');if(!b)return;const G={...egrpMap()};const re=()=>setTimeout(()=>{if($('#lqm'))egrpDlg()},60);
    if(b.id==='egadd'){await egrpNew();re();return}
    if(b.dataset.egup){const L2=egrpList();const i=L2.findIndex(g=>g.id===b.dataset.egup);if(i<1)return;[L2[i-1],L2[i]]=[L2[i],L2[i-1]];L2.forEach((g,k)=>{G[g.id]={...G[g.id],o:k+1}});egrpSave(G,'Orden de los grupos');re();return}
    if(b.dataset.egarc){const o=G[b.dataset.egarc];G[b.dataset.egarc]={...o,arch:{t:NOW(),by:me.email}};if(U.grp===b.dataset.egarc)U.grp='';egrpSave(G,`Grupo «${o.n}» archivado`);re();return}
    if(b.dataset.egres){const o={...G[b.dataset.egres]};delete o.arch;G[b.dataset.egres]=o;egrpSave(G,`Grupo «${o.n}» restaurado`);re()}},
   e=>{const t=e.target;if(!t.dataset||!t.dataset.egn)return;const G={...egrpMap()};const o=G[t.dataset.egn];const v=t.value.replace(/\s+/g,' ').trim();
    if(!o||!v||v===o.n){t.value=o?o.n:'';return}G[t.dataset.egn]={...o,n:v};egrpSave(G,`Grupo «${o.n}» → «${v}»`)})}
