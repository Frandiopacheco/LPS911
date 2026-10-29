"use strict";
/* LPS 911 · Comentarios del planner en el Lookahead (oct 2026, decidido con el dueño).
   Control de proyecto (el planner: rol area con «Planificación» o «Control de proyecto») no edita el lookahead, pero deja comentarios
   sobre la programación (p. ej. «esta fila termina después del hito de la sala»). Los ingenieros responden en el mismo hilo y lo
   marcan Resuelto. Es una conversación INTERNA: la ven y escriben solo el administrador, los editores y Control de proyecto (los SC no).
   - Colección propia `lkcom/{id}` (no toca `acts`: sin Deshacer ni historial, no entra al congelado ni a la versión cliente):
     {k:'act'|'amb'|'piso', ref (id de la actividad, el ambiente o el piso), piso, an (rótulo al crearlo, por si la fila se archiva),
      d (día de referencia, opcional ''), txt, by, bn, t, st:'open'|'done', rs:{by,n,t} (quién resolvió), r:[{by,n,txt,t}] (respuestas), arch?}
   - Crear y responder: admin, editores y Control de proyecto. Resolver/reabrir: el autor, el admin y el editor responsable del piso
     (`isPisoResp`; piso sin responsable: cualquier editor). Archivar: el autor o el admin (no se borra).
   - Se ven: marca en la esquina de la actividad, chip «💬 N» en el ambiente y la píldora «💬» de la barra con la lista del piso.
   Sin aviso al celular por ahora (segunda etapa, decidido con el dueño). */
const LKC=new Map();let lkcUn=null,LKCV=0;
/** ¿ve los comentarios? admin, editores y Control de proyecto (no en modo propuesta del SC) */
const lkcSee=()=>!!me&&(isAdmin||me.role==='editor'||(typeof isPlanArea==='function'&&isPlanArea()))&&!(typeof PM==='function'&&PM())&&!(typeof TAR_ONLY==='function'&&TAR_ONLY());
/** ¿se muestran aquí? (no en la versión cliente ni en una versión guardada: son del lookahead vigente) */
const lkcOn=()=>lkcSee()&&!U.cliv&&!(U.ver&&U.verMode==='ver');
const lkcMe=()=>String(me&&me.email||'').toLowerCase();
function ensureLkc(){if(typeof db==='undefined'||!db||lkcUn||!lkcSee())return;
  lkcUn=fcol('lkcom').onSnapshot(sn=>{LKC.clear();sn.docs.forEach(d=>LKC.set(d.id,{...d.data(),id:d.id}));LKCV++;if(U.tab==='look')requestRender()},
    e=>{console.warn('lkcom',e&&e.code);lkcUn=null})}
/** comentarios a la vista: del piso elegido arriba (sin piso elegido, todos), sin archivados */
function lkcVis(){const pid=U.piso||'';return[...LKC.values()].filter(c=>!c.arch&&(!pid||c.piso===pid))}
let LKCX={k:'',m:null};
/** índice 'act:id' / 'amb:id' / 'piso:id' → comentarios abiertos (se rehace si cambian los comentarios o el piso) */
function lkcIdx(){const k=LKCV+'|'+(U.piso||'');if(LKCX.k===k&&LKCX.m)return LKCX.m;const m=new Map();
  lkcVis().forEach(c=>{if(c.st==='done')return;const key=c.k+':'+c.ref;const L=m.get(key)||[];L.push(c);m.set(key,L)});LKCX={k,m};return m}
const lkcOpenOf=key=>lkcOn()?(lkcIdx().get(key)||[]):[];
/** marca en la esquina de la actividad (como el triángulo de comentario de Excel) */
function lkcRowMark(x){const L=lkcOpenOf('act:'+x.id);if(!L.length)return'';
  return`<button class="lkcm" data-lkc="act:${esc(x.id)}" title="${esc(L.length+' comentario'+(L.length>1?'s':'')+' abierto'+(L.length>1?'s':'')+'\n'+L.map(c=>(c.bn||c.by)+': '+c.txt).join('\n').slice(0,400))}" aria-label="Comentarios de la actividad"></button>`}
/** chip del ambiente (comentarios sobre el ambiente completo) */
function lkcAmbChip(a){const L=lkcOpenOf('amb:'+a.id);if(!L.length)return'';
  return`<button class="ghchip lkcch" data-lkc="amb:${esc(a.id)}" title="${esc(L.map(c=>(c.bn||c.by)+': '+c.txt).join('\n').slice(0,400))}">💬 ${L.length}</button>`}
/** píldora de la barra: comentarios abiertos del piso */
function lkcPillHtml(){if(!lkcOn())return'';const n=lkcVis().filter(c=>c.st!=='done').length;
  return`<button class="ib lkic lkcp${n?' on':''}" data-lkclist="1" title="Comentarios de Control de proyecto e ingenieros sobre el lookahead${n?': '+n+' abierto'+(n>1?'s':''):''}" aria-label="Comentarios">💬${n?`<b>${n}</b>`:''}</button>`}
/* ---- rótulos ---- */
function lkcTarget(k,ref){if(k==='act'){const x=S.act.get(ref);if(!x)return null;const a=S.amb.get(x.ambId);return{piso:pisoOfAmb(x.ambId),an:(a?a.code+' · ':'')+(x.name||'(sin nombre)')}}
  if(k==='amb'){const a=S.amb.get(ref);if(!a)return null;return{piso:pisoOfAmb(ref),an:'Ambiente '+a.code+(a.name?' · '+a.name:'')}}
  if(k==='piso'){const p=S.pis.get(ref);if(!p)return null;return{piso:ref,an:'General · '+(p.code||'Piso')+(p.name?' '+p.name:'')}}return null}
const lkcLabel=c=>(lkcTarget(c.k,c.ref)||{}).an||c.an||'(ya no está en el lookahead)';
function lkcWhen(t){if(!t)return'';const d=new Date(t-LIMA_OFF);return fmtD(ldt(t))+' '+String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')}
/* ---- permisos de cada acción ---- */
const lkcCanResolve=c=>!!me&&(isAdmin||c.by===lkcMe()||(me.role==='editor'&&typeof isPisoResp==='function'&&isPisoResp(c.piso)));
const lkcCanArch=c=>!!me&&(isAdmin||c.by===lkcMe());
/* ---- ventanas ---- */
let LKC_ANCH=null;
/* cada comentario es un pósit (nota amarilla): autor, nota, respuestas y una línea para responder; ✓ y 🗄 en la esquina */
function lkcThreadHtml(c,withTarget){const done=c.st==='done';
  const tools=`${lkcCanResolve(c)?`<button class="lkci${done?'':' ok'}" data-do="st_${esc(c.id)}" title="${done?'Reabrir':'Marcar resuelto'}" aria-label="${done?'Reabrir':'Resolver'}">${done?'↺':'✓'}</button>`:''}${lkcCanArch(c)?`<button class="lkci" data-do="ar_${esc(c.id)}" title="Archivar (no se borra)" aria-label="Archivar">🗄</button>`:''}`;
  return`<div class="lkct${done?' done':''}">${withTarget?`<div class="lkctg">${c.k!=='piso'?`<button class="lkcgo" data-do="go_${esc(c.id)}" title="Llevar la grilla a la fila">${esc(lkcLabel(c))} ›</button>`:`<span>${esc(lkcLabel(c))}</span>`}</div>`:''}
    <div class="lkcm1"><span class="lkcwho">${esc(c.bn||c.by||'')}</span><span class="lkcdt">${lkcWhen(c.t)}${c.d?' · día '+fmtD(c.d):''}</span><span class="lkctools">${tools}</span></div>
    <div class="lkctx">${esc(c.txt)}</div>
    ${(c.r||[]).map(r=>`<div class="lkcr"><span class="lkcwho">${esc(r.n||r.by||'')}</span> <span class="lkcdt">${lkcWhen(r.t)}</span><div class="lkctx">${esc(r.txt)}</div></div>`).join('')}
    ${done?`<div class="lkcst">✓ Resuelto${c.rs?' · '+esc(c.rs.n||c.rs.by||''):''}</div>`:`<div class="lkcrep"><textarea id="lkcr_${esc(c.id)}" rows="1" maxlength="500" placeholder="Responder…" aria-label="Responder"></textarea><button class="lkci" data-do="rep_${esc(c.id)}" title="Enviar respuesta (Enter)" aria-label="Enviar">➤</button></div>`}</div>`}
/* pósit en blanco para la nota nueva */
function lkcFormHtml(lbl,day){return`<div class="lkcnew"><textarea id="lkcn" rows="2" maxlength="1000" placeholder="Escribe una nota${lbl?' '+esc(lbl):''}…" aria-label="Nueva nota"></textarea>
    <div class="lkcnb"><label class="lkcdl" title="Día de referencia (opcional)"><input type="date" id="lkcd" value="${esc(day||'')}" aria-label="Día de referencia (opcional)"></label><button class="lkcadd" data-do="add">Pegar nota</button></div></div>`}
/** abre la ventana: key = 'act:id' | 'amb:id' (hilos de esa fila + nuevo) o 'all' (lista del piso + comentario general) */
function lkcOpen(anchor,key){if(!lkcSee()){toast('Los comentarios del lookahead los ven el administrador, los ingenieros y Control de proyecto.');return}
  ensureLkc();LKC_ANCH=anchor;const all=key==='all';let k='',ref='';if(!all){[k,ref]=key.split(':');if(!lkcTarget(k,ref)){toast('Esa fila ya no está en el lookahead.');return}}
  const L=all?lkcVis():[...LKC.values()].filter(c=>!c.arch&&c.k===k&&c.ref===ref);
  L.sort((a,b)=>(a.st==='done')-(b.st==='done')||(b.t||0)-(a.t||0));const op=L.filter(c=>c.st!=='done'),dn=L.filter(c=>c.st==='done').slice(0,all?15:10);
  const H={};L.forEach(c=>{H['rep_'+c.id]=()=>lkcReply(c.id,key);H['st_'+c.id]=()=>lkcSetSt(c.id,key);H['ar_'+c.id]=()=>lkcArch(c.id,key);H['go_'+c.id]=()=>lkcGo(c)});
  const pid=U.piso||'';const genOk=all&&pid&&S.pis.has(pid);
  H.add=()=>lkcAdd(all?'piso':k,all?pid:ref,key);
  const head=all?`💬 Notas${pid?' · '+esc(S.pis.get(pid)?.code||''):''}`:`💬 ${esc(lkcTarget(k,ref).an)}`;
  openPop(anchor,`<div class="lkcw"><div class="lkch" title="Solo lo ven el administrador, los ingenieros y Control de proyecto. Resuelve el autor, el administrador o el ingeniero responsable del piso.">${head}</div>
    ${op.length?`<div class="lkcl">${op.map(c=>lkcThreadHtml(c,all)).join('')}</div>`:''}
    ${all?(genOk?lkcFormHtml('general del piso',''):`<div class="lkcemp">${op.length?'':'No hay notas abiertas. '}Para comentar una fila usa su menú ⋯ (o la esquina marcada); para una nota general, elige un piso arriba.</div>`):lkcFormHtml('',U.day||'')}
    ${dn.length?`<details class="lkcdn"><summary>Resueltos (${dn.length})</summary><div class="lkcl">${dn.map(c=>lkcThreadHtml(c,all)).join('')}</div></details>`:''}</div>`,H);
  /* Enter envía (Mayús+Enter: salto de línea) */
  pop.querySelectorAll('.lkcw textarea').forEach(t=>t.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();const b=t.id==='lkcn'?pop.querySelector('[data-do="add"]'):t.parentNode.querySelector('button[data-do]');if(b)b.click()}}));
  setTimeout(()=>{const n=$('#lkcn');if(n&&(!all||!op.length))n.focus()},0)}
const lkcReopen=key=>setTimeout(()=>{const a=LKC_ANCH&&LKC_ANCH.isConnected?LKC_ANCH:($(`[data-lkc="${key}"]`)||$('#fcom .lkcp'));if(a)lkcOpen(a,key)},60);
function lkcErr(e){toast('No se pudo guardar el comentario: '+(e&&e.code==='permission-denied'?'no tienes permiso (o faltan publicar las reglas nuevas)':(e&&(e.code||e.message))||'error'))}
function lkcAdd(k,ref,key){const txt=(($('#lkcn')||{}).value||'').trim().slice(0,1000);const d=(($('#lkcd')||{}).value||'').trim();
  if(!txt){toast('Escribe el comentario.');lkcReopen(key);return}const tg=lkcTarget(k,ref);if(!tg){toast('Esa fila ya no está en el lookahead.');return}
  const ref2=fcol('lkcom').doc();const c={k,ref,piso:tg.piso||'',an:tg.an,d:/^\d{4}-\d{2}-\d{2}$/.test(d)?d:'',txt,by:lkcMe(),bn:me.name||me.email||'',t:NOW(),st:'open',r:[]};
  LKC.set(ref2.id,{...c,id:ref2.id});LKCV++;requestRender();
  ref2.set(c).then(()=>toast('Comentario guardado')).catch(e=>{LKC.delete(ref2.id);LKCV++;requestRender();lkcErr(e)});lkcReopen(key)}
function lkcReply(id,key){const c=LKC.get(id);if(!c)return;const el=$('#lkcr_'+id);const txt=((el||{}).value||'').trim().slice(0,500);if(!txt){toast('Escribe la respuesta.');lkcReopen(key);return}
  if((c.r||[]).length>=60){toast('El hilo llegó al máximo de respuestas: resuélvelo y abre otro comentario.');return}
  const r=[...(c.r||[]),{by:lkcMe(),n:me.name||me.email||'',txt,t:NOW()}];LKC.set(id,{...c,r});LKCV++;
  fcol('lkcom').doc(id).update({r}).catch(lkcErr);lkcReopen(key)}
function lkcSetSt(id,key){const c=LKC.get(id);if(!c||!lkcCanResolve(c))return;const done=c.st!=='done';
  const o=done?{st:'done',rs:{by:lkcMe(),n:me.name||me.email||'',t:NOW()}}:{st:'open',rs:null};LKC.set(id,{...c,...o});LKCV++;requestRender();
  fcol('lkcom').doc(id).update(o).then(()=>toast(done?'Comentario resuelto':'Comentario reabierto')).catch(lkcErr);lkcReopen(key)}
async function lkcArch(id,key){const c=LKC.get(id);if(!c||!lkcCanArch(c))return;
  if(!await uiAsk({title:'¿Archivar el comentario?',text:'Deja de verse en el Lookahead. Queda guardado en la base (no se borra).',ok:'Archivar',tone:'warn'}))return;
  fcol('lkcom').doc(id).update({arch:{t:NOW(),by:lkcMe(),n:me.name||''}}).then(()=>toast('Comentario archivado')).catch(lkcErr)}
/** «Ver»: lleva la grilla a la fila comentada (quita búsqueda/filtros que la oculten si hace falta) y la resalta */
function lkcGo(c){const aid=c.k==='act'?c.ref:null,amb=c.k==='amb'?c.ref:(aid&&S.act.get(aid)?S.act.get(aid).ambId:null);if(!amb||!S.amb.has(amb)){toast('Esa fila ya no está en el lookahead.');return}
  const pid=pisoOfAmb(amb);if(pid&&U.piso&&U.piso!==pid)U.piso=pid;const a=S.amb.get(amb);if(a&&U.collapsed.includes(a.sectorId))U.collapsed=U.collapsed.filter(x=>x!==a.sectorId);saveUI();requestRender();
  let n=0;const show=()=>{const el=aid?$(`#grid .ci[data-a="${aid}"][data-f="name"]`):$(`#grid [data-amb="${amb}"][data-f="name"]`);
    if(!el){if(++n<20)setTimeout(show,60);else toast('No se ve en la grilla: revisa la búsqueda o los filtros de Vista.');return}
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});const td=el.closest('td');if(td){td.classList.add('lkcflash');setTimeout(()=>td.classList.remove('lkcflash'),2000)}};setTimeout(show,60)}
