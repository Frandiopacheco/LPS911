"use strict";
/* LPS 911 · Matriz de ambientes › Catálogo y Tipos de ambiente (fase 2, oct 2026): editar el catálogo desde la app.
   Renombrar, cambiar SC / clase, agregar, archivar, fusionar (traslada los estados marcados y es reversible)
   y editar qué actividades trae cada tipo de ambiente. Nada se borra: archivar y fusionar guardan lo necesario para restaurar.
   Ver docs/ia/matriz.md. */

const MXC={q:'',cl:'',arch:false};
const mxNow=()=>({by:me.email,n:me.name||'',t:NOW()});
const mxFV=()=>firebase.firestore.FieldValue;
const mxErr=e=>toast('No se pudo guardar: '+(e&&e.code||e));

/** pestañas internas de la matriz */
function mxViewSeg(){return`<div class="seg mxvseg" role="tablist" aria-label="Vista de la matriz">${[['mat','Matriz'],['rec','Recorrido'],['cat','Catálogo'],['tipo','Tipos de ambiente']].filter(([k])=>!(k==='tipo'&&SCK()))
  .map(([k,l])=>`<button type="button" role="tab" data-mxv="${k}" class="${(U.mxV||'mat')===k?'on':''}" aria-selected="${(U.mxV||'mat')===k}">${l}</button>`).join('')}</div>`}
/* cabecera en una fila (oct 2026): vistas (y en la Matriz, los indicadores) entre el título y los botones */
function mxHd(head,mid){const m=`<div class="phm">${mid}</div>`;return head.includes('<div class="pha">')?head.replace('<div class="pha">',m+'<div class="pha">'):head.replace('</header>',m+'</header>')}
function mxWireV(main){main.querySelectorAll('[data-mxv]').forEach(b=>b.onclick=()=>{U.mxV=b.dataset.mxv;saveUI();MX.sel.clear();render()})}

/* uso de cada actividad: ambientes donde aparece y celdas con estado confirmado */
function mxCatUse(){const k=MX.v+'|'+DV+'|'+DONEV;if(MXC.use&&MXC.useK===k)return MXC.use;const u=new Map();const g=id=>{let o=u.get(id);if(!o)u.set(id,o={amb:0,st:0});return o};
  for(const C of mxCells().values())for(const id of Object.keys(C))g(id).amb++;
  for(const m of MX.amb.values())for(const id of Object.keys(m.c||{}))g(id).st++;
  MXC.use=u;MXC.useK=k;return u}
const mxScOpts=sel=>[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}"${c.id===sel?' selected':''}>${esc(c.name)}</option>`).join('');
const mxClOpts=sel=>Object.entries(MXCL).map(([k,l])=>`<option value="${k}"${k===sel?' selected':''}>${l}</option>`).join('');

/* ---------- Catálogo ---------- */
function renderMxCat(main,head){const ed=mxEd();const use=mxCatUse();const scs=mxSel();const q=mnk(MXC.q);
  const all=[...MX.cat.values()];
  const L=all.filter(c=>!!c.arch===MXC.arch&&(!scs.length||mxHasSc(c,scs))&&(!MXC.cl||c.cl===MXC.cl)&&(!q||mnk(c.name).includes(q)||(c.al||[]).some(a=>a.includes(q))))
    .sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name));
  const nArch=all.filter(c=>c.arch).length;
  const scList=[...new Set(all.filter(c=>!c.arch).map(c=>c.sc))].map(id=>({id,n:conOf(id).name})).sort((a,b)=>a.n.localeCompare(b.n));
  let h=`<div class="scroll"><div class="wrap mxwrap">${mxHd(head,mxViewSeg())}
   ${helpBox('Cómo se edita el catálogo',`<p>Cambiar el nombre, el subcontratista o la clase <b>no afecta</b> lo marcado en la matriz: los estados están ligados a la actividad, no a su nombre.</p>
    <p><b>Fusionar</b> (⋮): cuando dos actividades son la misma. Los estados marcados pasan a la otra (si las dos tienen estado en un ambiente, se conserva el de la que queda), sus nombres del lookahead también, y en los tipos de ambiente se reemplaza. La fusionada queda archivada y se puede <b>restaurar</b> deshaciendo todo.</p>
    <p><b>Desglosar</b> (⋮, administrador): cuando una actividad agrupa varios trabajos («Instalaciones ICR» → bajadas, rociadores, gabinetes). Se divide en toda la obra: catálogo, tipos, Matriz y lookahead (solo los días que aún se pueden reprogramar). «Restaurar» lo deshace.</p>
    <p><b>Archivar</b>: deja de salir en la matriz, pero sus estados se guardan y vuelven al restaurarla. Nada se borra.</p>`)}
   ${mxCatTools()}
   ${SCK()?'':`<div class="fbar mxscb"><span class="fgl">Subcontratistas</span><button class="chip${scs.length?'':' on'}" data-mxsc="">Todos</button>${scList.map(s=>`<button class="chip${scs.includes(s.id)?' on':''}" data-mxsc="${esc(s.id)}" style="--c:${esc(conOf(s.id).color)}"><i></i>${esc(s.n)}</button>`).join('')}</div>`}
   <div class="fbar"><input class="tin mxq" id="mxcq" type="search" placeholder="Buscar actividad o nombre del lookahead" value="${esc(MXC.q)}" aria-label="Buscar">
    <span class="seg" role="group" aria-label="Clase"><button data-mxcl="" class="${MXC.cl?'':'on'}">Todas</button>${Object.entries(MXCL).map(([k,l])=>`<button data-mxcl="${k}" class="${MXC.cl===k?'on':''}">${l}</button>`).join('')}</span>
    <span class="seg" role="group" aria-label="Archivadas"><button data-mxarch="0" class="${MXC.arch?'':'on'}">Activas</button><button data-mxarch="1" class="${MXC.arch?'on':''}">Archivadas${nArch?` (${nArch})`:''}</button></span>
    <span class="fsp"></span><span class="note">${L.length} de ${all.filter(c=>!!c.arch===MXC.arch).length}</span>${(ed||(SCK()&&!verRO()))&&!MXC.arch?'<button class="ib pri" id="mxcnew">+ Actividad</button>':''}</div>
   <div class="card"><div class="tscroll"><table class="t rt mxct"><thead><tr><th>Actividad</th><th>Subcontratista</th><th>Clase</th><th>Especialidad</th><th title="Ambientes donde aparece">Amb.</th><th title="Celdas con estado confirmado">Marcadas</th><th title="Nombres del lookahead que corresponden a esta actividad">Nombres</th><th></th></tr></thead><tbody>
   ${L.map(c=>{const u=use.get(c.id)||{amb:0,st:0};const ro=!ed||c.arch;
     const fus=c.arch&&c.arch.fus?MX.cat.get(c.arch.fus):null;const des=c.arch&&c.arch.des;
     return`<tr data-mcid="${esc(c.id)}"${c.arch?' class="mxarch"':''}>
      <td data-l="Actividad">${c.rev&&!c.arch?`<span class="pill warn" title="La agregó ${esc(c.rev.n||c.rev.by||'')} desde el lookahead">Nueva · por revisar</span> `:''}${ro?`<b>${esc(c.name)}</b>${c.arch?`<small class="note"> · ${fus?'fusionada con «'+esc(fus.name)+'»':des?'desglosada en '+(des.names||[]).map(n=>'«'+esc(n)+'»').join(', '):'archivada'} ${esc(fmtD(ldt(c.arch.t).slice(0,10)))}</small>`:''}`:`<input class="tin" data-mcf="name" value="${esc(c.name)}" aria-label="Nombre">`}</td>
      <td data-l="Subcontratista">${ro?`<span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(conOf(c.sc).name)}`:`<select data-mcf="sc" aria-label="Subcontratista">${mxScOpts(c.sc)}</select>`}${(c.scs||[]).length?`<small class="mxscs" title="También la hacen">+ ${(c.scs||[]).map(i=>esc(conOf(i).name)).join(', ')}</small>`:''}</td>
      <td data-l="Clase">${ro?esc(MXCL[c.cl]||''):`<select data-mcf="cl" aria-label="Clase">${mxClOpts(c.cl)}</select>`}</td>
      <td data-l="Especialidad" class="mu" title="Es la del subcontratista: se cambia en Configuración › Especialidades / Subcontratistas">${esc(espOfSc(c.sc))||'—'}</td>
      <td class="mono" data-l="Ambientes">${c.arch?'—':u.amb}</td><td class="mono" data-l="Marcadas">${u.st}</td>
      <td data-l="Nombres"><button class="lnkb" data-mcal="${esc(c.id)}" title="Ver los nombres del lookahead">${(c.al||[]).length}</button></td>
      <td>${ed?(c.arch?`<button class="ib" data-mcres="${esc(c.id)}">Restaurar</button>`:`<button class="ab" data-mcm="${esc(c.id)}" aria-label="Más acciones" title="Fusionar, archivar">⋮</button>`):''}</td></tr>`}).join('')||`<tr><td colspan="8" class="note">No hay actividades con este filtro.</td></tr>`}
   </tbody></table></div></div></div></div>`;
  main.innerHTML=h;mxWireV(main);mxWireCat(main);mxWireCatTools(main)}

function mxWireCat(main){
  main.querySelectorAll('[data-mxsc]').forEach(b=>b.onclick=e=>{const id=b.dataset.mxsc;let L=mxSel();L=!id?[]:(e.ctrlKey||e.metaKey||e.shiftKey)?(L.includes(id)?L.filter(x=>x!==id):[...L,id]):(L.length===1&&L[0]===id?[]:[id]);U.mxSc=L;saveUI();render()});
  const q=$('#mxcq');if(q){q.oninput=()=>{MXC.q=q.value;clearTimeout(MXC.qt);MXC.qt=setTimeout(()=>{render();const n=$('#mxcq');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)}}
  main.querySelectorAll('[data-mxcl]').forEach(b=>b.onclick=()=>{MXC.cl=b.dataset.mxcl;render()});
  main.querySelectorAll('[data-mxarch]').forEach(b=>b.onclick=()=>{MXC.arch=b.dataset.mxarch==='1';render()});
  const nw=$('#mxcnew');if(nw)nw.onclick=mxCatNew;
  main.querySelectorAll('[data-mcf]').forEach(el=>el.onchange=()=>{const id=el.closest('tr').dataset.mcid;mxCatSet(id,el.dataset.mcf,el.value)});
  main.querySelectorAll('[data-mcm]').forEach(b=>b.onclick=()=>mxCatMenu(b,b.dataset.mcm));
  main.querySelectorAll('[data-mcres]').forEach(b=>b.onclick=()=>mxCatRestore(b.dataset.mcres));
  main.querySelectorAll('[data-mcal]').forEach(b=>b.onclick=()=>mxAliasPop(b,b.dataset.mcal))}

/* cambio de un campo (con Deshacer) */
function mxCatSet(id,f,v){if(!mxEd())return;const c=MX.cat.get(id);if(!c)return;v=f==='name'?String(v).replace(/\s+/g,' ').trim():v;
  if(f==='name'&&!v){toast('El nombre no puede quedar vacío.');render();return}
  if(f==='name'){const k=mnk(v);const o=[...MX.cat.values()].find(x=>x.id!==id&&!x.arch&&mnk(x.name)===k);if(o)toast(`Ojo: ya existe «${o.name}» (${conOf(o.sc).name}). Si son la misma, usa ⋮ › Fusionar.`)}
  const prev=c[f]??'';if(prev===v)return;
  if(f==='name'){mxCatRename(id,prev,v);return}
  if(f==='sc'){mxCatScSet(id,prev,v);return}
  fcol('mcat').doc(id).set({[f]:v,...mxNow()},{merge:true}).then(()=>toast(`${{name:'Nombre',sc:'Subcontratista',cl:'Clase'}[f]} guardado`,'Deshacer',()=>fcol('mcat').doc(id).set({[f]:prev,...mxNow()},{merge:true}))).catch(mxErr)}

/* ---- el lookahead sigue al catálogo: renombrar o fusionar una actividad cambia el nombre de sus filas ----
   (por nombre/alias; se saltan las filas con propuesta del SC pendiente; un solo apply → historial y Deshacer) */
async function mxPendProp(){try{const S2=new Set();(await fcol('lhprop').get()).docs.forEach(d=>{for(const[id,v]of Object.entries(d.data().items||{}))if(v)S2.add(id)});return S2}catch(e){return new Set()}}
const mxRowsOf=(catId,pend)=>[...S.act.values()].filter(x=>!pend.has(x.id)&&mxCatOfN(x)===catId);
function mxRenameRows(rows,name,label){const ren={};const ops=[];for(const x of rows){if(x.name===name)continue;ren[x.id]=x.name;ops.push(op('acts',x.id,{...x,name}))}if(ops.length)apply(ops,label);return ren}
function mxUnrename(ren,cur,label){const ops=[];for(const[id,old]of Object.entries(ren||{})){const x=S.act.get(id);if(x&&x.name===cur)ops.push(op('acts',id,{...x,name:old}))}if(ops.length)apply(ops,label);return ops.length}
async function mxCatRename(id,prev,v){const rows=mxRowsOf(id,await mxPendProp());
  try{await fcol('mcat').doc(id).set({name:v,al:mxFV().arrayUnion(...[mnk(prev),mnk(v)].filter(Boolean)),...mxNow()},{merge:true})}catch(e){mxErr(e);return}
  const ren=mxRenameRows(rows,v,`Catálogo: «${prev}» → «${v}»`);const n=Object.keys(ren).length;
  toast(`Nombre guardado${n?` · ${n} ${n===1?'fila del lookahead actualizada':'filas del lookahead actualizadas'}`:''}`,'Deshacer',async()=>{try{await fcol('mcat').doc(id).set({name:prev,...mxNow()},{merge:true})}catch(e){mxErr(e)}mxUnrename(ren,v,`Deshacer: «${v}» → «${prev}»`)})}

/* cambiar el SC de una actividad (auditoría 08/10, M03): ofrece pasar también sus filas del lookahead que eran del SC anterior
   (un apply: historial y Deshacer; se saltan las filas con propuesta del SC pendiente; semanas congeladas y PPC no cambian) */
async function mxCatScSet(id,prev,v){const c=MX.cat.get(id);if(!c)return;
  try{await fcol('mcat').doc(id).set({sc:v,...mxNow()},{merge:true})}catch(e){mxErr(e);return}
  const und=()=>fcol('mcat').doc(id).set({sc:prev,...mxNow()},{merge:true}).catch(mxErr);
  const rows=prev?mxRowsOf(id,await mxPendProp()).filter(x=>x.sc===prev):[];
  if(!rows.length){toast('Subcontratista guardado','Deshacer',und);return}
  const go=await uiAsk({title:'¿Cambiar también el lookahead?',text:`«${c.name}» pasa de ${conOf(prev).name} a ${conOf(v).name}. En el lookahead hay ${rows.length} ${rows.length===1?'fila':'filas'} de esta actividad a nombre de ${conOf(prev).name}.`,
    list:['«Pasar las filas»: quedan a nombre de '+conOf(v).name+' (se puede deshacer).','«Solo el catálogo»: esas filas dejan de salir en la Matriz y aparecen en el aviso «otro subcontratista».','Las semanas congeladas y los PPC pasados no cambian.'],ok:'Pasar las filas',cancel:'Solo el catálogo',tone:'warn'});
  if(go)apply(rows.map(x=>op('acts',x.id,{...x,sc:v})),`«${c.name}»: ${rows.length} ${rows.length===1?'fila del lookahead pasa':'filas del lookahead pasan'} a ${conOf(v).name}`);
  else toast('Subcontratista guardado (solo el catálogo)','Deshacer',und)}

/* nueva actividad */
function mxCatNew(){const ed=mxEd();if(!ed&&!(SCK()&&!verRO()))return;const sc=mxSel()[0]||'';
  lqModal(`<div class="lqtop"><b>Nueva actividad del catálogo</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <div class="mxform"><label>Nombre<input class="tin" id="mxnn" placeholder="p. ej. Instalación de espejos"></label>
    <label>Subcontratista<select id="mxnsc">${ed?mxScOpts(sc):myScsI().map(id=>`<option value="${esc(id)}">${esc(conOf(id).name)}</option>`).join('')}</select></label>
    <label>Clase<select id="mxncl">${mxClOpts('t')}</select></label></div>
   ${ed?'':'<p class="note">Queda en el catálogo de tu partida; el ingeniero la revisará (nombre, clase, tipo de ambiente).</p>'}<p class="note" id="mxnmsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxnok">Crear</button></div>`,
   async e=>{if(!e.target.closest('#mxnok'))return;const name=$('#mxnn').value.replace(/\s+/g,' ').trim();if(!name){$('#mxnmsg').textContent='Escribe el nombre.';return}
     const k=mnk(name);const dup=[...MX.cat.values()].find(x=>!x.arch&&mnk(x.name)===k);if(dup){$('#mxnmsg').textContent=`Ya existe «${dup.name}» (${conOf(dup.sc).name}).`;return}
     const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;const id='k'+NOW().toString(36);
     try{await fcol('mcat').doc(id).set({name,sc:$('#mxnsc').value,cl:$('#mxncl').value,al:[k],ord,...mxNow(),...(ed?{}:{rev:{by:me.email,n:me.name||'',t:NOW(),amb:null,tipo:null}})});lqClose();toast(ed?'Actividad creada':'Actividad creada · el ingeniero la revisará')}catch(err){mxErr(err)}},)}

function mxCatMenu(btn,id){const c=MX.cat.get(id);if(!c)return;
  openPop(btn,`<div class="ph">${esc(c.name)}</div>${mxdCan()?'<button data-do="des">Desglosar en varias actividades…</button>':''}<button data-do="fus">Fusionar con otra actividad…</button><button data-do="al">Nombres del lookahead…</button>${mxEd()?'<button data-do="scs">Otros subcontratistas que la hacen…</button>':''}<hr><button data-do="arc" class="danger">Archivar</button>`,
   {des:()=>mxDesDlg(id),fus:()=>mxMergeDlg(id),al:()=>mxAliasPop(btn,id),arc:()=>mxCatArchive(id),scs:()=>mxCatScsDlg(id)})}
/* otros SC que también hacen la actividad (c.scs): sus filas del lookahead alimentan la Matriz y su SC puede llenarla */
function mxCatScsAdd(id,sc){return fcol('mcat').doc(id).set({scs:mxFV().arrayUnion(sc),...mxNow()},{merge:true})}
function mxCatScsDlg(id){const c=MX.cat.get(id);if(!c||!mxEd()){lqClose();return}const L=(c.scs||[]).filter(i=>i!==c.sc);const rest=[...S.con.values()].filter(x=>x.id!==c.sc&&!L.includes(x.id)).sort((a,b)=>a.name.localeCompare(b.name));
  lqModal(`<div class="lqtop"><b>${esc(c.name)} · subcontratistas</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Principal: <b>${esc(conOf(c.sc).name)}</b> (su columna en la Matriz). Si otros SC también la hacen, súmalos: sus filas del lookahead con este nombre salen en la Matriz y pueden llenarla.</p>
   <div class="scchips">${L.map(i=>`<span class="scchip" style="--c:${esc(conOf(i).color)}"><i></i>${esc(conOf(i).name)}<button data-mxscrm="${esc(i)}" aria-label="Quitar ${esc(conOf(i).name)}">&times;</button></span>`).join('')||'<span class="mu">Solo el principal.</span>'}</div>
   <select class="tin" id="mxscadd" aria-label="Sumar subcontratista"><option value="">+ Sumar subcontratista…</option>${rest.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select>
   <div class="lqbtns"><button class="ib pri" data-lqx>Listo</button></div>`,
   async e=>{const b=e.target.closest('[data-mxscrm]');if(!b)return;try{await fcol('mcat').doc(id).set({scs:mxFV().arrayRemove(b.dataset.mxscrm),...mxNow()},{merge:true});const x=MX.cat.get(id);if(x)x.scs=(x.scs||[]).filter(i=>i!==b.dataset.mxscrm)}catch(err){mxErr(err)}mxCatScsDlg(id)},
   async e=>{if(e.target.id!=='mxscadd'||!e.target.value)return;const v=e.target.value;try{await mxCatScsAdd(id,v);const x=MX.cat.get(id);if(x)x.scs=[...new Set([...(x.scs||[]),v])]}catch(err){mxErr(err)}mxCatScsDlg(id)})}

async function mxCatArchive(id){const c=MX.cat.get(id);if(!c)return;const u=mxCatUse().get(id)||{amb:0,st:0};
  const ok=await uiAsk({title:`Archivar «${c.name}»`,text:`Deja de salir en la matriz${u.amb?` (aparece en ${u.amb} ambientes)`:''}.${u.st?` Sus ${u.st} estados marcados se guardan y vuelven si la restauras.`:''} Si en realidad es la misma que otra actividad, mejor usa «Fusionar».`,ok:'Archivar',tone:'warn'});if(!ok)return;
  fcol('mcat').doc(id).set({arch:{t:NOW(),by:me.email,n:me.name||''},...mxNow()},{merge:true}).then(()=>toast('Actividad archivada','Deshacer',()=>mxCatRestore(id,true))).catch(mxErr)}

/* fusionar a → b: estados, nombres del lookahead y tipos pasan a b; a queda archivada con lo necesario para deshacer */
function mxMergeDlg(a){const A=MX.cat.get(a);if(!A)return;const cats=[...MX.cat.values()].filter(c=>!c.arch&&c.id!==a);
  const mine=cats.filter(c=>c.sc===A.sc).sort((x,y)=>x.name.localeCompare(y.name)),oth=cats.filter(c=>c.sc!==A.sc).sort((x,y)=>conOf(x.sc).name.localeCompare(conOf(y.sc).name)||x.name.localeCompare(y.name));
  const info=b=>{let mv=0,cf=0;for(const m of MX.amb.values()){const c=m.c||{};if(!(a in c))continue;mv++;if(b&&b in c)cf++}return{mv,cf}};
  const txt=b=>{const i=info(b);const B=b&&MX.cat.get(b);return`${i.mv?`Se trasladan ${i.mv} estados marcados.`:'No tiene estados marcados.'}${i.cf?` En ${i.cf} ambientes las dos tienen estado: se conserva el de «${esc(B.name)}».`:''} Sus ${(A.al||[]).length} nombres del lookahead pasan a ${B?'«'+esc(B.name)+'»':'la elegida'}. «${esc(A.name)}» queda archivada; «Restaurar» deshace todo.`};
  lqModal(`<div class="lqtop"><b>Fusionar «${esc(A.name)}»</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <div class="mxform"><label>Es la misma actividad que<select id="mxfb"><option value="">— elegir —</option>${mine.length?`<optgroup label="${esc(conOf(A.sc).name)}">${mine.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}<optgroup label="Otros subcontratistas">${oth.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(conOf(c.sc).name)}</option>`).join('')}</optgroup></select></label></div>
   <p class="note" id="mxfi">${txt('')}</p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxfok">Fusionar</button></div>`,
   async e=>{if(!e.target.closest('#mxfok'))return;const b=$('#mxfb').value;if(!b){$('#mxfi').textContent='Elige con qué actividad se fusiona.';return}
     const bt=e.target.closest('#mxfok');bt.disabled=true;try{await mxMerge(a,b);lqClose();toast(`Fusionada con «${MX.cat.get(b).name}»`,'Deshacer',()=>mxCatRestore(a,true))}catch(err){bt.disabled=false;mxErr(err)}},
   e=>{if(e.target.id==='mxfb')$('#mxfi').innerHTML=txt(e.target.value)})}
async function mxMerge(a,b){const A=MX.cat.get(a),B=MX.cat.get(b);if(!A||!B||a===b)return;const FV=mxFV();const DEL=FV.delete();const meta=mxNow();const rows=mxRowsOf(a,await mxPendProp());
  const moved={},added=[],tp={};const ops=[];
  for(const m of MX.amb.values()){const c=m.c||{};if(!(a in c))continue;moved[m.id]=c[a];const up={[a]:DEL};if(!(b in c)){up[b]=c[a];added.push(m.id)}ops.push(['mamb',m.id,{c:up,...meta}])}
  for(const t of MX.tipo.values()){const L=t.acts||[];if(!L.includes(a))continue;tp[t.id]=L.includes(b);ops.push(['mtipo',t.id,{acts:[...new Set(L.map(x=>x===a?b:x))],...meta}])}
  const bal=new Set(B.al||[]);const al=[...new Set([...(A.al||[]),mnk(A.name)])].filter(k=>k&&!bal.has(k));
  if(al.length)ops.push(['mcat',b,{al:FV.arrayUnion(...al),...meta}]);
  ops.push(['mcat',a,{arch:{t:NOW(),by:me.email,n:me.name||'',fus:b,moved,added,tp,al},...meta}]);
  for(let i=0;i<ops.length;i+=450){const bt=db.batch();ops.slice(i,i+450).forEach(([c,id,v])=>bt.set(fcol(c).doc(id),v,{merge:true}));await bt.commit()}
  /* sus filas del lookahead pasan a llamarse como la que queda (se guarda cómo se llamaban para restaurar) */
  const ren=mxRenameRows(rows,B.name,`Fusión: «${A.name}» → «${B.name}»`);if(Object.keys(ren).length)await fcol('mcat').doc(a).set({arch:{ren}},{merge:true})}

/* restaurar: quita el archivo y, si fue una fusión, devuelve estados, nombres y tipos (solo lo que nadie cambió después) */
async function mxCatRestore(id,quiet){if(!mxEd())return;const A=MX.cat.get(id);if(!A||!A.arch)return;if(A.arch.des){mxDesRestore(id,quiet);return}const r=A.arch;const FV=mxFV();const DEL=FV.delete();const meta=mxNow();const ops=[];
  if(r.fus){const b=r.fus;const B=MX.cat.get(b);
    for(const[amb,v]of Object.entries(r.moved||{})){const c=(MX.amb.get(amb)||{}).c||{};const up={[id]:v};if((r.added||[]).includes(amb)&&c[b]===v)up[b]=DEL;ops.push(['mamb',amb,{c:up,...meta}])}
    for(const[t,hadB]of Object.entries(r.tp||{})){const T=MX.tipo.get(t);if(!T)continue;let L=[...(T.acts||[])];const i=L.indexOf(b);if(!hadB&&i>=0)L[i]=id;else if(!L.includes(id))L.push(id);ops.push(['mtipo',t,{acts:[...new Set(L)],...meta}])}
    if(B&&(r.al||[]).length)ops.push(['mcat',b,{al:FV.arrayRemove(...r.al),...meta}]);
    if(B&&r.ren)mxUnrename(r.ren,B.name,`Restaurar «${A.name}»: nombres del lookahead`)}
  ops.push(['mcat',id,{arch:DEL,...meta}]);
  try{for(let i=0;i<ops.length;i+=450){const bt=db.batch();ops.slice(i,i+450).forEach(([c,d,v])=>bt.set(fcol(c).doc(d),v,{merge:true}));await bt.commit()}toast(quiet?'Deshecho':`«${A.name}» restaurada`)}catch(e){mxErr(e)}}

/* nombres del lookahead de una actividad (quitar uno si se asignó mal) */
function mxAliasPop(btn,id){const c=MX.cat.get(id);if(!c)return;const ed=mxEd()&&!c.arch;const L=c.al||[];
  openPop(btn,`<div class="ph">Nombres del lookahead</div><div class="ptx">Las filas del lookahead escritas así salen en «${esc(c.name)}».</div>
   ${L.length?L.map(k=>ed?`<button data-do="rm" data-k="${esc(k)}" title="Quitar este nombre">${esc(k)} <kbd>quitar</kbd></button>`:`<div class="ptx">${esc(k)}</div>`).join(''):'<div class="ptx">Ninguno.</div>'}`,
   {rm:d=>fcol('mcat').doc(id).set({al:mxFV().arrayRemove(d.k),...mxNow()},{merge:true}).then(()=>toast('Nombre quitado','Deshacer',()=>fcol('mcat').doc(id).set({al:mxFV().arrayUnion(d.k),...mxNow()},{merge:true}))).catch(mxErr)})}

/* ---------- Tipos de ambiente ---------- */
function renderMxTipo(main,head){const ed=mxEd();const tipos=[...MX.tipo.values()].filter(t=>!t.arch).sort((a,b)=>(a.order||0)-(b.order||0)||a.name.localeCompare(b.name));
  const nAmb={};for(const m of MX.amb.values())if(m.tipo&&S.amb.has(m.id))nAmb[m.tipo]=(nAmb[m.tipo]||0)+1;
  const sinTipo=[...S.amb.keys()].filter(id=>{const m=MX.amb.get(id);return!m||!m.tipo||!MX.tipo.has(m.tipo)||MX.tipo.get(m.tipo).arch}).length;
  const cats=[...MX.cat.values()].filter(c=>!c.arch).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||a.name.localeCompare(b.name));
  const arch=[...MX.tipo.values()].filter(t=>t.arch);
  let h=`<div class="scroll"><div class="wrap mxwrap">${mxHd(head,mxViewSeg())}
   ${helpBox('Qué es un tipo de ambiente',`<p>Un tipo (SS.HH., Oficina, Dormitorio…) dice qué actividades tiene un ambiente aunque todavía no estén en el lookahead. Al agregar o quitar una actividad del tipo, cambia en todos los ambientes de ese tipo; lo ya marcado en cada ambiente se conserva.</p><p>El tipo de cada ambiente se elige en la Matriz (columna «Tipo»).</p>`)}
   <div class="fbar"><span class="note">${tipos.length} tipos · ${sinTipo} ambientes sin tipo</span><span class="fsp"></span>${ed?'<button class="ib pri" id="mxtnew">+ Tipo</button>':''}</div>
   <div class="mxtg">${tipos.map(t=>{const acts=(t.acts||[]).map(id=>MX.cat.get(id)).filter(c=>c&&!c.arch);
     return`<div class="card mxtc" data-mtid="${esc(t.id)}"><div class="mxth">${ed?`<input class="tin" data-mtf="name" value="${esc(t.name)}" aria-label="Nombre del tipo">`:`<b>${esc(t.name)}</b>`}<span class="note">${nAmb[t.id]||0} amb.</span>${ed?`<button class="ab" data-mtarc="${esc(t.id)}" aria-label="Archivar tipo" title="Archivar tipo">&times;</button>`:''}</div>
      <div class="mxtl">${acts.map(c=>`<span class="chip" style="--c:${esc(conOf(c.sc).color)}" title="${esc(conOf(c.sc).name)}"><i></i>${esc(c.name)}${ed?`<button class="mxtx" data-mtrm="${esc(c.id)}" aria-label="Quitar ${esc(c.name)}">×</button>`:''}</span>`).join('')||'<span class="note">Sin actividades.</span>'}</div>
      ${ed?`<select data-mtadd aria-label="Agregar actividad"><option value="">+ Agregar actividad…</option>${cats.filter(c=>!(t.acts||[]).includes(c.id)).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(conOf(c.sc).name)}</option>`).join('')}</select>`:''}</div>`}).join('')}</div>
   ${arch.length&&ed?`<div class="note">Archivados: ${arch.map(t=>`${esc(t.name)} <button class="lnkb" data-mtres="${esc(t.id)}">restaurar</button>`).join(' · ')}</div>`:''}
   </div></div>`;
  main.innerHTML=h;mxWireV(main);
  const nw=$('#mxtnew');if(nw)nw.onclick=async()=>{const n=await uiAsk({title:'Nuevo tipo de ambiente',input:{label:'Nombre',required:true},ok:'Crear',tone:'info'});if(!n)return;const name=String(n).trim();if(!name)return;
    const order=Math.max(0,...[...MX.tipo.values()].map(t=>t.order||0))+10;fcol('mtipo').doc('tp'+NOW().toString(36)).set({name,acts:[],order,...mxNow()}).then(()=>toast('Tipo creado')).catch(mxErr)};
  main.querySelectorAll('[data-mtf]').forEach(el=>el.onchange=()=>{const id=el.closest('[data-mtid]').dataset.mtid;const T=MX.tipo.get(id);const v=el.value.replace(/\s+/g,' ').trim();if(!T||!v||v===T.name)return;const prev=T.name;
    fcol('mtipo').doc(id).set({name:v,...mxNow()},{merge:true}).then(()=>toast('Nombre guardado','Deshacer',()=>fcol('mtipo').doc(id).set({name:prev,...mxNow()},{merge:true}))).catch(mxErr)});
  main.querySelectorAll('[data-mtadd]').forEach(el=>el.onchange=()=>{const id=el.closest('[data-mtid]').dataset.mtid;const c=el.value;if(!c)return;mxTipoActs(id,c,true)});
  main.querySelectorAll('[data-mtrm]').forEach(b=>b.onclick=()=>mxTipoActs(b.closest('[data-mtid]').dataset.mtid,b.dataset.mtrm,false));
  main.querySelectorAll('[data-mtarc]').forEach(b=>b.onclick=async()=>{const id=b.dataset.mtarc;const T=MX.tipo.get(id);const n=nAmb[id]||0;
    if(!await uiAsk({title:`Archivar el tipo «${T.name}»`,text:`${n?`${n} ambientes de este tipo dejan de recibir sus actividades (lo ya marcado en cada uno se conserva). `:''}Se puede restaurar.`,ok:'Archivar',tone:'warn'}))return;
    fcol('mtipo').doc(id).set({arch:{t:NOW(),by:me.email,n:me.name||''},...mxNow()},{merge:true}).then(()=>toast('Tipo archivado','Deshacer',()=>fcol('mtipo').doc(id).set({arch:mxFV().delete(),...mxNow()},{merge:true}))).catch(mxErr)});
  main.querySelectorAll('[data-mtres]').forEach(b=>b.onclick=()=>fcol('mtipo').doc(b.dataset.mtres).set({arch:mxFV().delete(),...mxNow()},{merge:true}).then(()=>toast('Tipo restaurado')).catch(mxErr))}
function mxTipoActs(id,cat,add){if(!mxEd())return;const T=MX.tipo.get(id);if(!T)return;const L=T.acts||[];if(add===L.includes(cat))return;
  const next=add?[...L,cat]:L.filter(x=>x!==cat);const c=MX.cat.get(cat);
  fcol('mtipo').doc(id).set({acts:next,...mxNow()},{merge:true}).then(()=>toast(`${add?'Agregada':'Quitada'}: ${c?c.name:''}`,'Deshacer',()=>fcol('mtipo').doc(id).set({acts:L,...mxNow()},{merge:true}))).catch(mxErr)}
