"use strict";
/* LPS 911 · Matriz › «Por actividad» (oct 2026, opción A aprobada por el dueño).
   Se elige una actividad del catálogo y se ve la lista de ambientes (pisos a la vista, por sector) con 4 botones grandes.
   Así trabaja el SC en obra: una actividad en tren, ambiente tras ambiente. Un toque guarda (sin «Editar» ni «Confirmar»);
   con casillas se aplica un estado a varios a la vez. El SC ve y cambia solo su partida (mxScSet, con su constancia);
   el ingeniero escribe con mxWrite (Deshacer). Ver docs/ia/matriz.md. */

const MXA={sel:new Set()};

/** actividades que se pueden elegir: no archivadas, de la partida del SC (o del filtro de SC del ingeniero), con algún ambiente a la vista */
function mxActList(cells){const sl=mxSel();const used=new Set();for(const r of mxRows())for(const a of r.ambs)Object.keys(cells.get(a.id)||{}).forEach(c=>used.add(c));
  return[...MX.cat.values()].filter(c=>!c.arch&&used.has(c.id)&&mxMine(c)&&(!sl.length||mxHasSc(c,sl))).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||mxSeqCmp(a,b))}

function renderMxAct(main,head){const cells=mxCells();const ed=mxEd();const L=mxActList(cells);
  if(!L.some(c=>c.id===U.mxAct)){U.mxAct=L[0]?L[0].id:'';MXA.sel.clear()}
  const cat=MX.cat.get(U.mxAct);const can=!!cat&&(ed||mxScCan(cat));const T=todayIso();
  /* ambientes con esta actividad, por piso y sector */
  const grp=[];let n=0,nd=0;
  if(cat)for(const r of mxRows()){const its=r.ambs.map(a=>({a,o:(cells.get(a.id)||{})[cat.id]})).filter(x=>x.o);if(!its.length)continue;n+=its.length;nd+=its.filter(x=>x.o.s==='t'||x.o.s==='n').length;grp.push({r,its})}
  const info=o=>{const xs=(o.acts||[]).map(i=>S.act.get(i)).filter(Boolean);const nx=xs.flatMap(x=>(x.days||[]).filter(d=>d>=T)).sort()[0];return[nx?'programada '+fmtD(nx):'',o.sug?'sin validar':''].filter(Boolean).join(' · ')};
  const row=({a,o})=>{const k=a.id;const hide=U.mxActDone&&(o.s==='t'||o.s==='n');if(hide)return'';
    return`<div class="mxri mxai${o.sug?' sug':''}" data-mxaa="${esc(k)}">${can?`<input type="checkbox" class="mxack" data-mxack="${esc(k)}"${MXA.sel.has(k)?' checked':''} aria-label="Elegir ${esc(a.code)}">`:''}
      <div class="mxrin"><span><b>${esc(a.code)} · ${esc(a.name)}</b>${info(o)?`<small>${esc(info(o))}</small>`:''}</span></div>
      <div class="mxrbt" role="group" aria-label="Estado en ${esc(a.code)}">${['p','c','t','n'].map(s=>`<button class="mc s-${s}${o.s===s?' on':''}${o.s===s&&o.sug?' sug':''}" data-mxas="${s}"${can?'':' disabled'} aria-pressed="${o.s===s}"><i>${MXI[s]||'○'}</i>${MXS[s]}</button>`).join('')}</div></div>`};
  const multi=visPisos().length>1;
  /* filtro (pedido del dueño): subcontratistas (el mismo menú de la Matriz) y buscador de actividades; chips agrupados por SC */
  const scs=[...new Set(L.map(c=>c.sc))];
  const sel=`<div class="mxaflt">${SCK()?'':`<button class="ib mxscdd${mxSel().length?' on':''}" id="mxscdd" aria-haspopup="menu" title="Clic: solo ese SC · Ctrl+clic: sumar o quitar">Subcontratistas: <b>${mxSel().length?(mxSel().length===1?esc(conOf(mxSel()[0]).name):mxSel().length+' elegidos'):'Todos'}</b> ▾</button>`}
     <input type="search" class="tin" id="mxaq" placeholder="Buscar actividad${SCK()?'':' o subcontratista'}" aria-label="Buscar actividad" value="${esc(MXA.q||'')}"><span class="note" id="mxaqn"></span></div>
    <div class="mxachips">${scs.map(sc=>`<div class="mxacg" data-mxacg>${scs.length>1?`<span class="mxacgl"><span class="mxsw" style="--c:${esc(conOf(sc).color)}"></span>${esc(conOf(sc).name)}</span>`:''}${L.filter(c=>c.sc===sc).map(c=>`<button class="chip${c.id===U.mxAct?' on':''}" data-mxac="${esc(c.id)}" data-mxan="${esc(mnk(c.name+' '+conOf(c.sc).name))}" style="--c:${esc(conOf(c.sc).color)}">${esc(c.name)}</button>`).join('')}</div>`).join('')}</div>`;
  let h=`<div class="scroll"><div class="wrap mxwrap mxrw">${mxHd(head,mxViewSeg())}
   ${L.length?`<div class="mxabar">${sel}</div>`:'<p class="callout">No hay actividades de tu partida en los pisos a la vista.</p>'}
   ${cat?`<div class="mxrbar"><div class="mxrprog"><b>${nd} de ${n}</b> ambientes terminados o que no aplican · <span class="mxsw" style="--c:${esc(conOf(cat.sc).color)}"></span>${esc(conOf(cat.sc).name)}<span class="mxrpb"><i style="width:${n?Math.round(100*nd/n):0}%"></i></span></div>
     <label class="chk"><input type="checkbox" id="mxadone"${U.mxActDone?' checked':''}> Ocultar lo terminado</label>${can?'<button class="ib" id="mxaadd">＋ Agregar a otro ambiente</button>':''}</div>
     ${grp.map(g=>`<div class="mxrsec"><div class="ph">${multi?esc(g.r.p.code)+' · ':''}${esc(g.r.s.code)} · ${esc(g.r.s.name)}</div><div class="mxrl">${g.its.map(row).join('')||'<p class="note">Todo terminado.</p>'}</div></div>`).join('')}`:''}
   </div></div>
   ${can&&MXA.sel.size?`<div class="mxrfoot mxabulk"><span><b>${MXA.sel.size}</b> ${MXA.sel.size===1?'ambiente elegido':'ambientes elegidos'}</span>${['c','t','p','n'].map(s=>`<button class="ib${s==='t'?' pri':''}" data-mxab="${s}">${MXI[s]||'○'} ${MXS[s]}</button>`).join('')}<button class="ib" data-mxab="x">Quitar selección</button></div>`:''}`;
  main.innerHTML=h;mxWireV(main);
  main.querySelectorAll('[data-mxac]').forEach(b=>b.onclick=()=>{U.mxAct=b.dataset.mxac;MXA.sel.clear();saveUI();render()});
  const sd=$('#mxscdd');if(sd)sd.onclick=()=>mxScMenu(sd);
  const q=$('#mxaq');const flt=()=>{const k=mnk(q.value||'');MXA.q=q.value;let n=0;main.querySelectorAll('[data-mxan]').forEach(b=>{const on=!k||b.dataset.mxan.includes(k)||b.classList.contains('on');b.hidden=!on;if(on)n++});
    main.querySelectorAll('[data-mxacg]').forEach(g=>g.hidden=!g.querySelector('[data-mxan]:not([hidden])'));$('#mxaqn').textContent=k?`${n} de ${L.length}`:`${L.length} actividades`};
  if(q){q.oninput=flt;flt()}
  const dn=$('#mxadone');if(dn)dn.onchange=()=>{U.mxActDone=dn.checked;saveUI();render()};
  const ad=$('#mxaadd');if(ad)ad.onclick=()=>mxActAddAmb(cat,ed);
  main.querySelectorAll('[data-mxack]').forEach(c=>c.onchange=()=>{c.checked?MXA.sel.add(c.dataset.mxack):MXA.sel.delete(c.dataset.mxack);render()});
  main.querySelectorAll('[data-mxas]').forEach(b=>b.onclick=()=>{const amb=b.closest('[data-mxaa]').dataset.mxaa;mxActSet([amb],cat,b.dataset.mxas,ed)});
  main.querySelectorAll('[data-mxab]').forEach(b=>b.onclick=()=>{const s=b.dataset.mxab;const L2=[...MXA.sel];MXA.sel.clear();if(s==='x'){render();return}mxActSet(L2,cat,s,ed)})}

/** cambia el estado de una actividad en varios ambientes. Ingeniero: un mxWrite (Deshacer). SC: una celda por escritura (reglas), un solo aviso */
async function mxActSet(ambs,cat,s,ed){if(!cat||!ambs.length)return;
  if(ed){const DEL=firebase.firestore.FieldValue.delete();const by=new Map(),un=new Map();
    for(const a of ambs){const prev=((MX.amb.get(a)||{}).c||{})[cat.id];by.set(a,{[cat.id]:s});un.set(a,{[cat.id]:prev===undefined?DEL:prev})}
    await mxWrite(by,ambs.length===1?`${cat.name}: ${MXS[s]}`:`${cat.name}: ${MXS[s]} en ${ambs.length} ambientes`,un);render();return}
  if(!mxScCan(cat))return;if(ambs.length===1){await mxScSet(ambs[0],cat.id,s);return}
  /* auditoría 19/10 (punto 3): las reglas piden una celda por escritura; con muchos ambientes tarda, así que se muestra el avance
     («Guardando 12 de 30…»), no se aceptan otros cambios en bloque mientras tanto y al final se dice cuántos no se guardaron */
  if(MXA.busy){toast('Espera a que termine de guardar el cambio anterior.');return}MXA.busy=true;
  const pg=mxActProg(`Guardando 0 de ${ambs.length}…`);const done=[];let bad=0,err='';
  try{for(let i=0;i<ambs.length;i++){try{const u=await mxScSet(ambs[i],cat.id,s,true);if(u)done.push(u)}catch(e){bad++;err=e&&e.code||String(e)}pg(`Guardando ${i+1} de ${ambs.length}…`)}}
  finally{MXA.busy=false;pg(null)}
  render();const und=done.length?['Deshacer',async()=>{const p2=mxActProg(`Deshaciendo 0 de ${done.length}…`);try{for(let i=0;i<done.length;i++){await mxScUndo(...done[i],true);p2(`Deshaciendo ${i+1} de ${done.length}…`)}}finally{p2(null)}toast('Deshecho')}]:[];
  toast(bad?`${cat.name}: ${MXS[s]} en ${done.length} de ${ambs.length} ambientes. ${bad} no se guardaron (${err}); revisa la conexión y vuelve a marcarlos.`:`${cat.name}: ${MXS[s]} en ${done.length} ambientes`,...und)}
/** aviso fijo de avance (no lo borra el redibujo de la pantalla); pg(texto) lo actualiza, pg(null) lo quita */
function mxActProg(t){let el=document.getElementById('mxaprog');if(!el){el=document.createElement('div');el.id='mxaprog';el.className='mxaprog';el.setAttribute('role','status');document.body.appendChild(el)}
  const set=v=>{if(v==null){el.remove();return}el.textContent=v};set(t);return set}

/** agregar esta actividad a un ambiente que todavía no la tiene (pendiente) */
function mxActAddAmb(cat,ed){if(!cat)return;const cells=mxCells();const L=[];for(const r of mxRows())for(const a of r.ambs)if(!(cells.get(a.id)||{})[cat.id])L.push({a,r});
  const li=q=>{const k=mnk(q||'');let h='',ls='';for(const o of L.filter(o=>!k||mnk(o.a.code+' '+o.a.name+' '+o.r.s.name).includes(k)).slice(0,150)){const g=o.r.p.code+' · '+o.r.s.name;if(g!==ls){h+=`<div class="ph">${esc(g)}</div>`;ls=g}
      h+=`<button class="mxpk" data-mxan="${esc(o.a.id)}"><span><b>${esc(o.a.code)} · ${esc(o.a.name)}</b></span></button>`}return h||'<p class="note">Todos los ambientes a la vista ya la tienen.</p>'};
  lqModal(`<div class="lqtop"><b>Agregar «${esc(cat.name)}» a otro ambiente</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    <input class="tin" id="mxanq" type="search" placeholder="Buscar ambiente (código o nombre)" aria-label="Buscar ambiente" style="width:100%;box-sizing:border-box">
    <div class="mxpkl" id="mxankl">${li('')}</div><div class="lqbtns"><button class="ib" data-lqx>Cerrar</button></div>`,
    e=>{const b=e.target.closest('[data-mxan]');if(!b)return;lqClose();mxAddCell(b.dataset.mxan,cat.id,ed)});
  const q=$('#mxanq');if(q){q.oninput=()=>{$('#mxankl').innerHTML=li(q.value)};setTimeout(()=>q.focus(),50)}}
