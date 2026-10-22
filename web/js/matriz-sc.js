"use strict";
/* LPS 911 · Matriz: los subcontratistas llenan su partida (oct 2026, decidido con el dueño).
   El SC cambia directo (sin propuesta) el estado de las actividades de SU partida en cualquier ambiente, o las agrega a un
   ambiente; también lo que el ingeniero ya confirmó (queda destacado). Cada cambio deja una constancia en mlog (no se borra).
   Cualquier editor revisa: «✓ Visto» o «↶ Revertir». Reglas: el SC escribe una celda por vez (campo k = actividad de su partida).
   Ver docs/ia/matriz.md. */

/** ¿el SC puede cambiar esta actividad? (solo su partida) */
const mxScCan=cat=>!!(cat&&!cat.arch&&me&&SCK()&&!verRO()&&mxHasSc(cat,myScsI()));

/** el SC cambia una celda: mamb (una celda, con k) + constancia en mlog, en un solo lote */
/* quiet (cambios en bloque, «Por actividad»): sin aviso propio; devuelve los datos para deshacer */
async function mxScSet(amb,cat,s,quiet){const c=MX.cat.get(cat);if(!mxScCan(c))return;const m=MX.amb.get(amb)||{};const prev=(m.c||{})[cat];if(prev===s)return;
  const pm=(m.m||{})[cat];const o=(mxCells().get(amb)||{})[cat];const meta={by:me.email,n:me.name||'',t:NOW()};
  const lid='l'+NOW().toString(36)+Math.random().toString(36).slice(2,6);
  /* conf: contradice lo que dio por bueno un ingeniero: lo confirmó él o vio («✓ Visto», m.ok) el cambio anterior del SC (auditoría 08/10, M04) */
  const okBy=pm&&(!pm.sc?pm:pm.ok||(pm.bk?{n:'un ingeniero'}:null));
  const lsc=mxScsOf(c).find(s=>myScsI().includes(s))||c.sc;
  const log={amb,cat,sc:lsc,from:prev||null,sugFrom:prev?null:(o?o.s:null),to:s,conf:!!(prev&&okBy),confN:prev&&okBy?okBy.n||okBy.by||'':'',st:'pend',...meta};
  try{const b=db.batch();b.set(fcol('mamb').doc(amb),{c:{[cat]:s},m:{[cat]:{...mxCM(true),t:meta.t}},k:cat,l:lid,...meta},{merge:true});b.set(fcol('mlog').doc(lid),log);await b.commit();
    const un=[amb,cat,prev,s,lid,!!(pm&&(!pm.sc||pm.ok||pm.bk))];if(quiet)return un;
    toast(`${c.name}: ${MXS[s]}`,'Deshacer',()=>mxScUndo(...un))}catch(e){if(quiet)throw e;toast('No se pudo guardar: '+(e&&e.code||e))}}
async function mxScUndo(amb,cat,prev,s,lid,bk,quiet){const cur=((MX.amb.get(amb)||{}).c||{})[cat];if(cur!==s){if(!quiet)toast('Ya cambió después: no se deshace.');return}
  const FV=firebase.firestore.FieldValue;const meta={by:me.email,n:me.name||'',t:NOW()};
  try{const b=db.batch();b.set(fcol('mamb').doc(amb),{c:{[cat]:prev===undefined?FV.delete():prev},m:{[cat]:{...mxCM(true),t:meta.t,...(bk?{bk:true}:{})}},k:cat,l:lid,...meta},{merge:true});b.set(fcol('mlog').doc(lid),{st:'undo'},{merge:true});await b.commit();if(!quiet)toast('Deshecho')}catch(e){toast('No se pudo deshacer: '+(e&&e.code||e))}}

/* ---------- revisión del ingeniero ---------- */
const mxLogPend=()=>[...MX.log.values()].filter(l=>l.st==='pend'&&MX.cat.has(l.cat)).sort((a,b)=>(b.conf-a.conf)||(a.t||0)-(b.t||0));
/** cuántos cambios del SC sin revisar tiene una actividad del catálogo (MOD-01: fusionar o desglosar los esperan; se consulta a la base
    por si la suscripción de mlog no está abierta) */
async function mxScPendN(cat){try{return(await fcol('mlog').where('st','==','pend').where('cat','==',cat).get()).size}catch(e){return mxLogPend().filter(l=>l.cat===cat).length}}
/** celdas con un cambio del SC sin revisar (marca en la matriz) */
function mxLogKeys(){if(!canWrite)return null;const s=new Set();for(const l of MX.log.values())if(l.st==='pend')s.add(l.amb+'|'+l.cat);return s}
/** en la ficha de la celda: quién la cambió por última vez */
function mxWhoHtml(amb,cat){const m=((MX.amb.get(amb)||{}).m||{})[cat];if(!m)return'';const pl=[...MX.log.values()].filter(l=>l.st==='pend'&&l.amb===amb&&l.cat===cat).pop();
  return`<div class="ptx">Último cambio: ${esc(m.n||m.by||'')}${m.sc?' (subcontratista)':''} · ${esc(fmtD(ldt(m.t||0)))}${pl?` · <b>por revisar</b>, antes: ${pl.from?MXS[pl.from]:'sin confirmar'}`:''}</div>`}
const mxLogFrom=l=>l.from?MXS[l.from]:l.sugFrom?`sin confirmar (${MXS[l.sugFrom]})`:'no estaba';

/* msg: resultado del último «Todo visto» (queda en la ventana, no en un aviso que desaparece) */
const mxLogWhen=t=>t?esc(fmtD(ldt(t))+' '+hhmm(t)):'';
function mxLogDlg(msg){const L=mxLogPend();if(!L.length&&!msg){lqClose();return}const by=new Map();L.forEach(l=>{if(!by.has(l.sc))by.set(l.sc,[]);by.get(l.sc).push(l)});
  lqModal(`<div class="lqtop"><b>Cambios de los subcontratistas en la matriz</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Ya están aplicados. «✓ Visto» los da por buenos; «↶ Revertir» vuelve la celda a como estaba. En rojo: cambiaron algo que un ingeniero ya había confirmado.</p>
   ${msg?`<div class="callout" id="mxlres" role="status">${esc(msg)}</div>`:''}
   <div class="mxul">${[...by].map(([sc,ls])=>`<div class="mxpg" data-mxpg="${esc(sc)}"><span class="mxsw" style="--c:${esc(conOf(sc).color)}"></span><b>${esc(conOf(sc).name)}</b> · <span class="mxn">${ls.length}</span> <button class="lnkb" data-mxlall="${esc(sc)}">✓ Todo visto</button></div>
     ${ls.map(l=>{const a=S.amb.get(l.amb);const c=MX.cat.get(l.cat);return`<div class="mxlr${l.conf?' conf':''}" data-mxrow="${esc(l.id)}" data-mxrsc="${esc(sc)}"><span><b>${esc(c.name)}</b> · ${a?esc(a.code+' '+a.name):''}<small>${esc(l.n||l.by||'')} · ${mxLogWhen(l.t)} · ${esc(mxLogFrom(l))} → <b>${MXS[l.to]||l.to}</b>${l.conf?` · ⚠ lo había confirmado ${esc(l.confN||'un ingeniero')}`:''}</small></span>
       <span class="mxlb">${mxLkBtn(mxLkTerms(l.cat),mxLkPiso(null,l.amb))}<button class="ib" data-mxlrev="${esc(l.id)}">↶ Revertir</button><button class="ib pri" data-mxlok="${esc(l.id)}">✓ Visto</button></span></div>`}).join('')}`).join('')}</div>
   <div class="lqbtns"><button class="ib" data-lqx>Cerrar</button></div>`,
   async e=>{const ok=e.target.closest('[data-mxlok]'),rv=e.target.closest('[data-mxlrev]'),all=e.target.closest('[data-mxlall]');
     const done={by:me.email,n:me.name||'',t:NOW()};
     try{if(ok){const l=MX.log.get(ok.dataset.mxlok);if(!l)return;const b=db.batch();mxLogOk(b,l,done);ok.disabled=true;try{await b.commit()}catch(err){ok.disabled=false;throw err}MX.log.delete(l.id);mxLogRowGone(l.id);return}
       if(all){await mxLogAll(all.dataset.mxlall,done);return}
       if(rv){const id=rv.dataset.mxlrev;await mxLogRevert(MX.log.get(id));if(!MX.log.has(id))mxLogRowGone(id)}}catch(err){toast('No se pudo guardar: '+(err&&err.code||err))}})}
/* quita la fila ya revisada sin redibujar toda la lista (con cientos de filas el redibujo era lo lento) y deja bien el conteo del SC */
function mxLogRowGone(id){const root=document.getElementById('lqm');if(!root)return;const row=root.querySelector(`[data-mxrow="${CSS.escape(id)}"]`);if(!row)return;const sc=row.dataset.mxrsc;row.remove();
  const left=[...root.querySelectorAll('[data-mxrow]')].filter(r=>r.dataset.mxrsc===sc).length;const hd=[...root.querySelectorAll('[data-mxpg]')].find(h=>h.dataset.mxpg===sc);
  if(hd){if(left)hd.querySelector('.mxn').textContent=left;else hd.remove()}
  if(!root.querySelector('[data-mxrow]')&&!root.querySelector('#mxlres'))lqClose()}
/* guarda los «✓ Visto» en lotes de 150 celdas (300 escrituras), 3 lotes a la vez; devuelve qué ids quedaron guardados y cuántos fallaron */
async function mxLogOkMany(ls,done,pg){const okIds=new Set();let bad=0,err='';const ch=[];for(let i=0;i<ls.length;i+=150)ch.push(ls.slice(i,i+150));let ix=0;
  const worker=async()=>{while(ix<ch.length){const c=ch[ix++];const b=db.batch();c.forEach(l=>mxLogOk(b,l,done));
    try{await b.commit();c.forEach(l=>okIds.add(l.id))}catch(e){bad+=c.length;err=e&&e.code||String(e)}
    pg(`Guardando ${okIds.size+bad} de ${ls.length}…`)}};
  await Promise.all(Array.from({length:Math.min(3,ch.length)},worker));return{okIds,bad,err}}
/* «✓ Todo visto» de un SC. Al terminar consulta al servidor cuántos cambios de ese SC siguen por revisar: los que no eran de la lista
   son cambios NUEVOS que el SC hizo mientras tanto (no un error de guardado); los de la lista que siguen sí serían un error */
async function mxLogAll(sc,done){const ls=mxLogPend().filter(l=>l.sc===sc);if(!ls.length)return;if(MX.logBusy)return;MX.logBusy=true;
  const pg=mxActProg(`Guardando 0 de ${ls.length}…`);let r;
  try{r=await mxLogOkMany(ls,done,pg)}finally{pg(null);MX.logBusy=false}
  r.okIds.forEach(id=>MX.log.delete(id));
  let nuevos=0,sin=0,chk=true;try{const ids=new Set(ls.map(l=>l.id));const sn=await fcol('mlog').where('st','==','pend').where('sc','==',sc).get({source:'server'});sn.docs.forEach(d=>ids.has(d.id)?sin++:nuevos++)}catch(e){chk=false}
  const nm=conOf(sc).name;
  const msg=`${nm}: ${r.okIds.size} de ${ls.length} marcados como vistos.`+(r.bad?` ${r.bad} NO se guardaron (${r.err}); vuelve a tocar «Todo visto».`:'')
    +(chk?(sin?` ${sin} siguen pendientes en el servidor.`:'')+(nuevos?` Hay ${nuevos} cambios nuevos que el subcontratista hizo después de abrir esta lista.`:(!r.bad&&!sin?' No quedó ninguno pendiente.':'')):' No se pudo confirmar con el servidor cuántos quedan.');
  mxLogDlg(msg)}
/* «✓ Visto»: la constancia queda vista y, si la celda sigue como la dejó ese cambio del SC, el visto queda en la celda (m.<cat>.ok):
   así el próximo cambio del SC sobre lo que el ingeniero dio por bueno sale destacado (M04) y su «Terminado» ya oculta la fila (M05) */
function mxLogOk(b,l,done){if(!l)return;b.set(fcol('mlog').doc(l.id),{st:'ok',ok:done},{merge:true});
  const m=MX.amb.get(l.amb)||{};const pm=(m.m||{})[l.cat];if(pm&&pm.sc&&pm.t===l.t&&(m.c||{})[l.cat]===l.to)b.set(fcol('mamb').doc(l.amb),{m:{[l.cat]:{ok:done}},by:me.email,n:me.name||'',t:NOW()},{merge:true})}
/** el estado de la celda lo cambió un SC y ningún ingeniero lo vio aún (M05: su «Terminado» no oculta la fila del Lookahead) */
const mxScPend=(amb,cat)=>{const pm=((MX.amb.get(amb)||{}).m||{})[cat];return!!(pm&&pm.sc&&!pm.ok&&!pm.bk)};
async function mxLogRevert(l){if(!l||!mxEd())return;const cur=((MX.amb.get(l.amb)||{}).c||{})[l.cat];
  if(cur!==l.to&&!await uiAsk({title:'La celda cambió después',text:`Ahora dice «${cur?MXS[cur]:'sin confirmar'}». ¿Volverla igual a «${mxLogFrom(l)}»?`,ok:'Revertir igual',tone:'warn'}))return;
  const FV=firebase.firestore.FieldValue;const meta={by:me.email,n:me.name||'',t:NOW()};const b=db.batch();
  b.set(fcol('mamb').doc(l.amb),{c:{[l.cat]:l.from||FV.delete()},m:{[l.cat]:l.from?{...mxCM(false),t:meta.t}:FV.delete()},...meta},{merge:true});
  b.set(fcol('mlog').doc(l.id),{st:'rev',rev:meta},{merge:true});await b.commit();MX.log.delete(l.id);toast(`Revertido: ${(MX.cat.get(l.cat)||{}).name||''}`)}
