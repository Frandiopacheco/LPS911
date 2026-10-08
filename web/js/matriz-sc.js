"use strict";
/* LPS 911 · Matriz: los subcontratistas llenan su partida (oct 2026, decidido con el dueño).
   El SC cambia directo (sin propuesta) el estado de las actividades de SU partida en cualquier ambiente, o las agrega a un
   ambiente; también lo que el ingeniero ya confirmó (queda destacado). Cada cambio deja una constancia en mlog (no se borra).
   Cualquier editor revisa: «✓ Visto» o «↶ Revertir». Reglas: el SC escribe una celda por vez (campo k = actividad de su partida).
   Ver docs/ia/matriz.md. */

/** ¿el SC puede cambiar esta actividad? (solo su partida) */
const mxScCan=cat=>!!(cat&&!cat.arch&&me&&SCK()&&!verRO()&&mxHasSc(cat,myScsI()));

/** el SC cambia una celda: mamb (una celda, con k) + constancia en mlog, en un solo lote */
async function mxScSet(amb,cat,s){const c=MX.cat.get(cat);if(!mxScCan(c))return;const m=MX.amb.get(amb)||{};const prev=(m.c||{})[cat];if(prev===s)return;
  const pm=(m.m||{})[cat];const o=(mxCells().get(amb)||{})[cat];const meta={by:me.email,n:me.name||'',t:NOW()};
  const lid='l'+NOW().toString(36)+Math.random().toString(36).slice(2,6);
  /* conf: contradice lo que dio por bueno un ingeniero: lo confirmó él o vio («✓ Visto», m.ok) el cambio anterior del SC (auditoría 08/10, M04) */
  const okBy=pm&&(!pm.sc?pm:pm.ok||(pm.bk?{n:'un ingeniero'}:null));
  const lsc=mxScsOf(c).find(s=>myScsI().includes(s))||c.sc;
  const log={amb,cat,sc:lsc,from:prev||null,sugFrom:prev?null:(o?o.s:null),to:s,conf:!!(prev&&okBy),confN:prev&&okBy?okBy.n||okBy.by||'':'',st:'pend',...meta};
  try{const b=db.batch();b.set(fcol('mamb').doc(amb),{c:{[cat]:s},m:{[cat]:{...mxCM(true),t:meta.t}},k:cat,l:lid,...meta},{merge:true});b.set(fcol('mlog').doc(lid),log);await b.commit();
    toast(`${c.name}: ${MXS[s]}`,'Deshacer',()=>mxScUndo(amb,cat,prev,s,lid,!!(pm&&(!pm.sc||pm.ok||pm.bk))))}catch(e){toast('No se pudo guardar: '+(e&&e.code||e))}}
async function mxScUndo(amb,cat,prev,s,lid,bk){const cur=((MX.amb.get(amb)||{}).c||{})[cat];if(cur!==s){toast('Ya cambió después: no se deshace.');return}
  const FV=firebase.firestore.FieldValue;const meta={by:me.email,n:me.name||'',t:NOW()};
  try{const b=db.batch();b.set(fcol('mamb').doc(amb),{c:{[cat]:prev===undefined?FV.delete():prev},m:{[cat]:{...mxCM(true),t:meta.t,...(bk?{bk:true}:{})}},k:cat,l:lid,...meta},{merge:true});b.set(fcol('mlog').doc(lid),{st:'undo'},{merge:true});await b.commit();toast('Deshecho')}catch(e){toast('No se pudo deshacer: '+(e&&e.code||e))}}

/* ---------- revisión del ingeniero ---------- */
const mxLogPend=()=>[...MX.log.values()].filter(l=>l.st==='pend'&&MX.cat.has(l.cat)).sort((a,b)=>(b.conf-a.conf)||(a.t||0)-(b.t||0));
/** celdas con un cambio del SC sin revisar (marca en la matriz) */
function mxLogKeys(){if(!canWrite)return null;const s=new Set();for(const l of MX.log.values())if(l.st==='pend')s.add(l.amb+'|'+l.cat);return s}
/** en la ficha de la celda: quién la cambió por última vez */
function mxWhoHtml(amb,cat){const m=((MX.amb.get(amb)||{}).m||{})[cat];if(!m)return'';const pl=[...MX.log.values()].filter(l=>l.st==='pend'&&l.amb===amb&&l.cat===cat).pop();
  return`<div class="ptx">Último cambio: ${esc(m.n||m.by||'')}${m.sc?' (subcontratista)':''} · ${esc(fmtD(ldt(m.t||0)))}${pl?` · <b>por revisar</b>, antes: ${pl.from?MXS[pl.from]:'sin confirmar'}`:''}</div>`}
const mxLogFrom=l=>l.from?MXS[l.from]:l.sugFrom?`sin confirmar (${MXS[l.sugFrom]})`:'no estaba';

function mxLogDlg(){const L=mxLogPend();if(!L.length){lqClose();return}const by=new Map();L.forEach(l=>{if(!by.has(l.sc))by.set(l.sc,[]);by.get(l.sc).push(l)});
  lqModal(`<div class="lqtop"><b>Cambios de los subcontratistas en la matriz</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Ya están aplicados. «✓ Visto» los da por buenos; «↶ Revertir» vuelve la celda a como estaba. En rojo: cambiaron algo que un ingeniero ya había confirmado.</p>
   <div class="mxul">${[...by].map(([sc,ls])=>`<div class="mxpg"><span class="mxsw" style="--c:${esc(conOf(sc).color)}"></span><b>${esc(conOf(sc).name)}</b> · ${ls.length} <button class="lnkb" data-mxlall="${esc(sc)}">✓ Todo visto</button></div>
     ${ls.map(l=>{const a=S.amb.get(l.amb);const c=MX.cat.get(l.cat);return`<div class="mxlr${l.conf?' conf':''}"><span><b>${esc(c.name)}</b> · ${a?esc(a.code+' '+a.name):''}<small>${esc(l.n||l.by||'')} · ${esc(fmtD(ldt(l.t||0)))} · ${esc(mxLogFrom(l))} → <b>${MXS[l.to]||l.to}</b>${l.conf?` · ⚠ lo había confirmado ${esc(l.confN||'un ingeniero')}`:''}</small></span>
       <span class="mxlb"><button class="ib" data-mxlrev="${esc(l.id)}">↶ Revertir</button><button class="ib pri" data-mxlok="${esc(l.id)}">✓ Visto</button></span></div>`}).join('')}`).join('')}</div>
   <div class="lqbtns"><button class="ib" data-lqx>Cerrar</button></div>`,
   async e=>{const ok=e.target.closest('[data-mxlok]'),rv=e.target.closest('[data-mxlrev]'),all=e.target.closest('[data-mxlall]');
     const done={by:me.email,n:me.name||'',t:NOW()};
     try{if(ok){const l=MX.log.get(ok.dataset.mxlok);const b=db.batch();mxLogOk(b,l,done);await b.commit();MX.log.delete(l.id);mxLogDlg();return}
       if(all){const ls=mxLogPend().filter(l=>l.sc===all.dataset.mxlall);for(let i=0;i<ls.length;i+=200){const b=db.batch();ls.slice(i,i+200).forEach(l=>mxLogOk(b,l,done));await b.commit()}ls.forEach(l=>MX.log.delete(l.id));mxLogDlg();return}
       if(rv){await mxLogRevert(MX.log.get(rv.dataset.mxlrev));mxLogDlg()}}catch(err){toast('No se pudo guardar: '+(err&&err.code||err))}})}
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
