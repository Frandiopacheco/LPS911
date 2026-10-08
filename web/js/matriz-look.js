"use strict";
/* LPS 911 · Catálogo ↔ Lookahead (oct 2026): un solo nombre por actividad en todo el lookahead.
   - «Unificar nombres» (solo administrador): cambia el NOMBRE de las filas del lookahead al del catálogo (con vista previa,
     por los pisos a la vista, con Deshacer e historial). No toca días, cantidades, avance, ni semanas congeladas / PPC pasados.
     Se saltan las filas con propuesta del SC pendiente.
   - «Exigir catálogo» (P().catReq, lo activa el administrador): en el lookahead solo se escriben actividades del catálogo.
     Si no está: el ingeniero la agrega al catálogo ahí mismo; el SC la propone (mcatp) y el ingeniero la aprueba o rechaza.
   Ver docs/ia/matriz.md. */

/** ¿el lookahead solo acepta actividades del catálogo? */
function mxCatReq(){return!!P().catReq&&MX.ld.cat&&[...MX.cat.values()].some(c=>!c.arch)}
const mxCatAct=()=>[...MX.cat.values()].filter(c=>!c.arch);

/** al escribir el nombre de una actividad del lookahead: el nombre del catálogo (texto), false si se bloqueó, null si no aplica */
function mxNameGate(v,x,t){if(!mxCatReq()||!v)return null;const id=mxAli().get(mnk(v));const c=id&&MX.cat.get(id);
  if(c&&!c.arch){if(c.name!==v)toast(`Se escribió «${c.name}», como está en el catálogo.`);return c.name}
  t.value=t.dataset.o!=null?t.dataset.o:(x.name||'');setTimeout(()=>mxNoCatDlg(v,x),0);return false}

/* lista de sugerencias del campo «Actividad»: el catálogo, primero las del subcontratista de la fila */
function mxSuggest(inp,dl){const x=S.act.get(inp.dataset.a);const sc=x&&x.sc;
  const L=mxCatAct().sort((a,b)=>((b.sc===sc)-(a.sc===sc))||a.name.localeCompare(b.name));
  dl.innerHTML=L.map(c=>`<option value="${esc(c.name)}">${esc(conOf(c.sc).name)}</option>`).join('')}

/* parecidas: palabras en común (para «¿quisiste decir…?») */
function mxSimilar(v,sc,n){const a=new Set(mnk(v).split(' ').filter(w=>w.length>2));if(!a.size)return[];
  return mxCatAct().map(c=>{const b=mnk(c.name).split(' ');let k=0;b.forEach(w=>{if(a.has(w)||[...a].some(z=>w.startsWith(z.slice(0,5))&&z.length>4))k++});return{c,k:k+(c.sc===sc?0.5:0)}})
    .filter(o=>o.k>=1).sort((p,q)=>q.k-p.k).slice(0,n||6).map(o=>o.c)}

/* tipo del ambiente (lo lee de la base si la matriz no está cargada, p. ej. desde el Lookahead); null si no tiene */
async function mxAmbTipo(ambId){if(!ambId)return null;let m=MX.amb.get(ambId);
  if(!m&&!MX.ld.amb){try{const d=await fcol('mamb').doc(ambId).get();m=d.exists?d.data():null}catch(e){m=null}}
  const tid=m&&m.tipo;if(!tid)return null;let t=MX.tipo.get(tid);
  if(!t&&!MX.ld.tipo){try{const d=await fcol('mtipo').doc(tid).get();t=d.exists?{...d.data(),id:tid}:null}catch(e){t=null}}
  if(!t||t.arch)return null;const n=MX.ld.amb?[...MX.amb.values()].filter(a=>a.tipo===tid&&S.amb.has(a.id)).length:null;return{...t,id:tid,n}}
/** agrega la actividad al tipo (arrayUnion: no pisa lo que otro haya agregado al mismo tiempo) */
function mxTipoAdd(tid,cat){return fcol('mtipo').doc(tid).set({acts:mxFV().arrayUnion(cat),...mxNow()},{merge:true})}
const mxTipoTxt=tp=>`Agregar también al tipo «${esc(tp.name)}»${tp.n!=null?` (${tp.n} ambientes)`:''}`;

/* nombre que no está en el catálogo: usar una parecida o agregarla al catálogo ahí mismo.
   Ingeniero y SC agregan directo (el SC no espera aprobación: sigue con su propuesta de programación). Por defecto solo en ese
   ambiente; «Agregar a todos los ambientes del tipo…» es opcional. Lo que agrega un SC queda marcado `rev` («por revisar»):
   el ingeniero recibe el aviso (Hoy y Matriz › Catálogo), la corrige y al renombrarla se actualiza el lookahead. */
async function mxNoCatDlg(v,x){const sim=mxSimilar(v,x.sc);const ed=mxEd();const sc=PM();const can=ed||sc;const tp=can?await mxAmbTipo(x.ambId):null;
  const useName=c=>{const cur=S.act.get(x.id);if(!cur)return;apply([op('acts',x.id,{...cur,name:c.name})])};
  const scs=sc?myScsI():null;const scOpts=sc?scs.map(id=>`<option value="${esc(id)}"${id===x.sc?' selected':''}>${esc(conOf(id).name)}</option>`).join(''):mxScOpts(x.sc);
  lqModal(`<div class="lqtop"><b>«${esc(v)}» no está en el catálogo</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">En el lookahead solo se usan actividades del catálogo, para que cada una tenga un solo nombre en toda la obra.</p>
   ${sim.length?`<div class="ph">¿Es alguna de estas?</div><div class="mxsim">${sim.map(c=>`<button class="ib" data-mxuse="${esc(c.id)}"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(c.name)} <small class="note">${esc(conOf(c.sc).name)}</small></button>`).join('')}</div>`:''}
   ${can?`<div class="ph">O agrégala al catálogo</div><div class="mxform"><label>Nombre<input class="tin" id="mxan" value="${esc(v)}"></label><label>Subcontratista<select id="mxasc">${scOpts}</select></label><label>Clase<select id="mxacl">${mxClOpts('t')}</select></label><label>Especialidad<select id="mxaesp">${mxEspOpts(mxEspOf(x.sc))}</select></label></div>
     <p class="note">Se agrega solo a este ambiente.${sc?' El ingeniero la revisará (nombre, clase, tipo) y si la corrige, el lookahead se actualiza solo.':''}</p>
     ${tp?`<label class="mxur"><input type="checkbox" id="mxatp"><span><b>Agregar a todos los ambientes del tipo «${esc(tp.name)}»${tp.n!=null?` (${tp.n})`:''}</b><small>${sc?'El ingeniero lo confirma al revisarla.':'Sale en todos los ambientes de ese tipo.'}</small></span></label>`:''}`:''}
   <p class="note" id="mxamsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button>${can?'<button class="ib pri" id="mxaok">Agregar al catálogo y usarla</button>':''}</div>`,
   async e=>{const u=e.target.closest('[data-mxuse]');if(u){const c=MX.cat.get(u.dataset.mxuse);lqClose();if(c)useName(c);return}
     if(!e.target.closest('#mxaok'))return;const name=$('#mxan').value.replace(/\s+/g,' ').trim();if(!name){$('#mxamsg').textContent='Escribe el nombre.';return}
     const dup=mxAli().get(mnk(name));if(dup){lqClose();useName(MX.cat.get(dup));return}
     const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;const id='k'+NOW().toString(36);const toT=!!(tp&&$('#mxatp')&&$('#mxatp').checked);
     const c={id,name,sc:$('#mxasc').value,cl:$('#mxacl').value,esp:$('#mxaesp').value==='__new'?'':$('#mxaesp').value,al:[mnk(name)],ord};
     if(sc)c.rev={by:me.email,n:me.name||'',t:NOW(),amb:x.ambId||'',tipo:toT?tp.id:null};
     try{await fcol('mcat').doc(id).set({...c,...mxNow()});if(toT&&ed)await mxTipoAdd(tp.id,id);MX.cat.set(id,c);MX.v++;lqClose();useName(c);
       toast(sc?'Agregada al catálogo: el ingeniero la revisará':toT?`Agregada al catálogo y al tipo «${tp.name}»`:'Agregada al catálogo (solo este ambiente)')}catch(err){mxErr(err)}},
   async e=>{if(e.target.id==='mxacl'&&e.target.value==='e'){const c=$('#mxatp');if(c)c.checked=false}
     if(e.target.id==='mxasc'){const es=$('#mxaesp');const d=mxEspOf(e.target.value);if(es&&d){if(![...es.options].some(o=>o.value===d))es.insertAdjacentHTML('afterbegin',`<option value="${esc(d)}">${esc(d)}</option>`);es.value=d}}
     if(e.target.id==='mxaesp'&&e.target.value==='__new')await mxEspPick(e.target,'')})}

/* actividades que agregaron los SC y nadie revisó todavía */
const mxRevList=()=>[...MX.cat.values()].filter(c=>c.rev&&!c.arch).sort((a,b)=>(a.rev.t||0)-(b.rev.t||0));

/* ---------- herramientas del catálogo (vista Catálogo) ---------- */
function mxCatTools(){const ed=mxEd();const pend=[...MX.prop.values()].filter(p=>p.st==='pend');const rv=mxRevList();
  const mine=SCK()?rv.filter(c=>c.rev.by===me.email):[];
  let h='';
  if(isAdmin)h+=`<div class="card mxtools"><div class="pad fbar"><b>Lookahead</b>
    <span class="fgl">Exigir catálogo</span><span class="seg" role="group" aria-label="Exigir catálogo en el lookahead"><button data-mxreq="0" class="${P().catReq?'':'on'}">No</button><button data-mxreq="1" class="${P().catReq?'on':''}">Sí</button></span>
    <span class="note">${P().catReq?'Solo se escriben actividades del catálogo.':'Todavía se aceptan nombres libres.'}</span><span class="fsp"></span>
    <button class="ib" id="mxuni">Unificar nombres del lookahead…</button></div></div>`;
  if(ed&&rv.length)h+=`<div class="card mxrev"><div class="hd">Agregadas por los subcontratistas <span class="sub">${rv.length} por revisar · corrige nombre, clase o especialidad en la tabla (el lookahead se actualiza) o fusiónala si ya existía</span></div><div class="tscroll"><table class="t rt"><tbody>
    ${rv.map(c=>{const a=S.amb.get(c.rev.amb);const tp=c.rev.tipo&&MX.tipo.get(c.rev.tipo);const inT=tp&&(tp.acts||[]).includes(c.id);return`<tr><td data-l="Actividad"><b>${esc(c.name)}</b> <small class="note">${esc(MXCL[c.cl]||'')}</small></td><td data-l="SC"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(conOf(c.sc).name)}</td>
      <td data-l="Ambiente">${a?esc(a.code+' '+a.name):''}</td><td data-l="Agregó">${esc(c.rev.n||c.rev.by||'')} · ${esc(fmtD(ldt(c.rev.t||0)))}</td>
      <td class="mxrb">${tp&&!inT?`<button class="ib" data-mxrtp="${esc(c.id)}" title="El SC pidió que salga en todos los ambientes de este tipo">+ Tipo «${esc(tp.name)}»</button>`:''}<button class="ib" data-mxrfus="${esc(c.id)}">Fusionar…</button><button class="ib pri" data-mxrok="${esc(c.id)}">✓ Revisada</button></td></tr>`}).join('')}</tbody></table></div></div>`;
  if(ed&&pend.length)h+=`<div class="card"><div class="hd">Propuestas de los subcontratistas <span class="sub">${pend.length} por revisar</span></div><div class="tscroll"><table class="t rt"><tbody>
    ${pend.sort((a,b)=>(a.t||0)-(b.t||0)).map(p=>{const a=S.amb.get(p.ambId);return`<tr><td data-l="Actividad"><b>${esc(p.name)}</b></td><td data-l="SC"><span class="mxsw" style="--c:${esc(conOf(p.sc).color)}"></span>${esc(conOf(p.sc).name)}</td>
      <td data-l="Para">${a?esc(a.code+' '+a.name):''}</td><td data-l="Propuso">${esc(p.n||p.by||'')} · ${esc(fmtD(ldt(p.t||0)))}</td>
      <td><button class="ib pri" data-mxpok="${esc(p.id)}">Aprobar</button> <button class="ib" data-mxpno="${esc(p.id)}">Rechazar</button></td></tr>`}).join('')}</tbody></table></div></div>`;
  if(mine.length)h+=`<div class="card"><div class="hd">Agregaste al catálogo</div><div class="pad">${mine.map(c=>`<div>${esc(c.name)} · <b>por revisar</b></div>`).join('')}</div></div>`;
  return h}
function mxWireCatTools(main){
  main.querySelectorAll('[data-mxreq]').forEach(b=>b.onclick=async()=>{const v=b.dataset.mxreq==='1';if(!!P().catReq===v)return;
    if(v){const n=mxLookOff().length;if(n&&!await uiAsk({title:'Exigir catálogo en el lookahead',text:`Hay ${n} filas del lookahead con nombres que no están en el catálogo. Siguen igual, pero al editar su nombre habrá que elegir uno del catálogo. Conviene unificar o asignar antes.`,ok:'Exigir igual',tone:'warn'}))return}
    apply([op('meta','project',{...P(),catReq:v})],v?'El lookahead ahora exige actividades del catálogo':'El lookahead vuelve a aceptar nombres libres')});
  const un=$('#mxuni');if(un)un.onclick=mxUnifyDlg;
  main.querySelectorAll('[data-mxpok]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpok,true));
  main.querySelectorAll('[data-mxpno]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpno,false));
  main.querySelectorAll('[data-mxrok]').forEach(b=>b.onclick=()=>{const id=b.dataset.mxrok;const c=MX.cat.get(id);if(!c||!c.rev)return;const r=c.rev;
    fcol('mcat').doc(id).set({rev:mxFV().delete(),revOk:{by:me.email,n:me.name||'',t:NOW()},...mxNow()},{merge:true}).then(()=>toast('Marcada como revisada','Deshacer',()=>fcol('mcat').doc(id).set({rev:r,...mxNow()},{merge:true}))).catch(mxErr)});
  main.querySelectorAll('[data-mxrfus]').forEach(b=>b.onclick=()=>mxMergeDlg(b.dataset.mxrfus));
  main.querySelectorAll('[data-mxrtp]').forEach(b=>b.onclick=()=>{const c=MX.cat.get(b.dataset.mxrtp);const tp=c&&c.rev&&MX.tipo.get(c.rev.tipo);if(!tp)return;mxTipoAdd(tp.id,c.id).then(()=>toast(`Agregada al tipo «${tp.name}»`)).catch(mxErr)})}
/* propuestas antiguas (mcatp): desde oct 2026 el SC agrega directo; estas se siguen pudiendo resolver */
async function mxPropDecide(id,ok){const p=MX.prop.get(id);if(!p||!mxEd())return;const meta={dec:ok?'ok':'rej',decBy:me.email,decN:me.name||'',decT:NOW()};
  try{if(ok){const dup=mxAli().get(mnk(p.name));let cid=dup;
      if(!dup){cid='k'+NOW().toString(36);const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;await fcol('mcat').doc(cid).set({name:p.name,sc:p.sc||'',cl:'t',esp:mxEspOf(p.sc||''),al:[mnk(p.name)],ord,...mxNow()})}
      await fcol('mcatp').doc(id).set({st:'ok',catId:cid,...meta},{merge:true});toast(dup?`Ya existía «${MX.cat.get(dup).name}»: se marcó aprobada`:`«${p.name}» agregada al catálogo`);
      /* el ambiente para el que la pidió tiene tipo: ¿la trae todo ese tipo? */
      const tp=await mxAmbTipo(p.ambId);if(tp&&!(tp.acts||[]).includes(cid)&&await uiAsk({title:'¿Agregar también al tipo de ambiente?',text:`La pidieron para un ambiente de tipo «${tp.name}»${tp.n!=null?` (${tp.n} ambientes)`:''}. Si se hace en todos, agrégala al tipo; si es algo puntual, no.`,ok:'Agregar al tipo',cancel:'Solo este ambiente',tone:'info'})){await mxTipoAdd(tp.id,cid);toast(`Agregada también al tipo «${tp.name}»`)}}
    else{const note=await uiAsk({title:`Rechazar «${p.name}»`,input:{label:'Motivo (lo verá el subcontratista)'},ok:'Rechazar',tone:'warn'});if(note===false||note==null)return;
      await fcol('mcatp').doc(id).set({st:'rej',note:String(note||''),...meta},{merge:true});toast('Propuesta rechazada')}}catch(e){mxErr(e)}}

/* filas del lookahead (pisos a la vista) cuyo nombre no está en el catálogo */
function mxLookOff(){const ali=mxAli();const vp=new Set(visPisos().map(p=>p.id));return[...S.act.values()].filter(x=>mnk(x.name)&&!ali.has(mnk(x.name))&&vp.has(pisoOfAmb(x.ambId)))}

/* ---------- Unificar nombres (solo administrador) ---------- */
function mxUnifyPlan(docs){const pend=new Set();for(const d of docs)for(const[id,v]of Object.entries(d.items||{}))if(v)pend.add(id);
  const vp=new Set(visPisos().map(p=>p.id));const G=new Map();
  for(const x of S.act.values()){if(!vp.has(pisoOfAmb(x.ambId)))continue;const id=mxCatOf(x);const c=id&&MX.cat.get(id);if(!c||c.arch)continue;const from=String(x.name||'').replace(/\s+/g,' ').trim();if(from===c.name)continue;
    const k=c.id+'|'+from;let g=G.get(k);if(!g)G.set(k,g={k,c,from,ids:[],skip:0});if(pend.has(x.id))g.skip++;else g.ids.push(x.id)}
  return[...G.values()].sort((a,b)=>conOf(a.c.sc).name.localeCompare(conOf(b.c.sc).name)||a.c.name.localeCompare(b.c.name)||b.ids.length-a.ids.length)}
async function mxUnifyDlg(){if(!isAdmin)return;
  /* propuestas del SC leídas en el momento (las filas con propuesta sin resolver se saltan) */
  let docs;try{docs=(await fcol('lhprop').get()).docs.map(d=>d.data())}catch(e){toast('No se pudieron leer las propuestas de los SC: '+(e&&e.code||e));return}
  const L=mxUnifyPlan(docs);const off=mxLookOff().length;
  const tpl=(P().templates||[]).some(t=>(t.acts||[]).some(a=>{const n=Array.isArray(a)?a[1]:a.name;const id=mxAli().get(mnk(n));return id&&MX.cat.get(id).name!==n}));
  const tot=L.reduce((s,g)=>s+g.ids.length,0),sk=L.reduce((s,g)=>s+g.skip,0);
  lqModal(`<div class="lqtop"><b>Unificar nombres del lookahead</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">${visPisos().length>1?'Todos los pisos':esc((visPisos()[0]||{}).name||'')}: cambia solo el <b>nombre</b> de las filas al del catálogo. Días, cantidades, avance, restricciones y liberaciones no cambian. Las semanas congeladas y los PPC pasados conservan su nombre. Queda en el historial y se puede deshacer.</p>
   ${L.length?`<div class="fbar"><label><input type="checkbox" id="mxuall" checked> Todas</label><span class="fsp"></span><span class="note" id="mxucnt">${tot} filas</span></div>
   <div class="mxul">${L.map((g,i)=>`<label class="mxur"><input type="checkbox" data-mxu="${i}" ${g.ids.length?'checked':'disabled'}><span><s>${esc(g.from||'(sin nombre)')}</s> → <b>${esc(g.c.name)}</b><small>${esc(conOf(g.c.sc).name)} · ${g.ids.length} ${g.ids.length===1?'fila':'filas'}${g.skip?` · ${g.skip} con propuesta pendiente (se saltan)`:''}</small></span></label>`).join('')}</div>`
   :'<p class="callout">No hay nombres por unificar: todas las filas ya usan el nombre del catálogo.</p>'}
   ${sk?`<p class="note">${sk} filas tienen una propuesta del SC sin resolver: se unifican después de resolverla.</p>`:''}
   ${off?`<p class="note">${off} filas tienen nombres que no están en el catálogo y no se tocan: asígnalas en Matriz (aviso «no están en el catálogo»).</p>`:''}
   ${tpl?'<label class="mxur"><input type="checkbox" id="mxutpl" checked><span>También los nombres de las <b>plantillas de ambiente</b></span></label>':''}
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button>${L.length||tpl?'<button class="ib pri" id="mxuok">Unificar</button>':''}</div>`,
   e=>{if(!e.target.closest('#mxuok'))return;const sel=[...document.querySelectorAll('[data-mxu]:checked')].map(c=>L[+c.dataset.mxu]);
     const ops=[];for(const g of sel)for(const id of g.ids){const x=S.act.get(id);if(x&&x.name!==g.c.name)ops.push(op('acts',id,{...x,name:g.c.name}))}
     const tc=$('#mxutpl');if(tc&&tc.checked){const T=(P().templates||[]).map(t=>({...t,acts:(t.acts||[]).map(a=>{const o=Array.isArray(a)?{sc:a[0],name:a[1]}:{...a};const id=mxAli().get(mnk(o.name));if(id)o.name=MX.cat.get(id).name;return o})}));ops.push(op('meta','project',{...P(),templates:T}))}
     if(!ops.length){toast('No hay nada que cambiar.');return}lqClose();
     const n=ops.filter(o=>o.col==='acts').length;apply(ops,`Nombres unificados: ${n} ${n===1?'fila':'filas'}`)},
   e=>{if(e.target.id==='mxuall')document.querySelectorAll('[data-mxu]:not(:disabled)').forEach(c=>c.checked=e.target.checked);
     const n=[...document.querySelectorAll('[data-mxu]:checked')].reduce((s,c)=>s+L[+c.dataset.mxu].ids.length,0);const el=$('#mxucnt');if(el)el.textContent=n+' filas'})}

/* ---------- alertas Matriz ↔ Lookahead ----------
   La matriz dice «Terminado» o «No aplica» (confirmado por una persona) y la fila del lookahead sigue con días de hoy en adelante.
   Lookahead: marca en la fila (`mxRowBadge`) y aviso al programar un día nuevo (`mxApplyWarn`, desde apply). Matriz: celdas ⚠ y «Ver › Alertas». */
function mxRowWarn(x){if(!x||!MX.ld.amb||!MX.ld.cat||!(x.days||[]).length)return null;const st=(MX.amb.get(x.ambId)||{}).c;if(!st)return null;
  const c=mxCatOf(x);const v=c&&st[c];if(v!=='t'&&v!=='n')return null;const T=todayIso();return(x.days||[]).some(d=>d>=T)?v:null}
function mxRowBadge(x,k){const v=mxRowWarn(x);return v?`<span class="mxbadge" style="--k:${k||0}" data-mxw="${esc(x.id)}" role="button" tabindex="0" title="La matriz dice «${MXS[v]}» para esta actividad en este ambiente, pero sigue programada. Clic: ver en la Matriz">⚠</span>`:''}
function mxApplyWarn(ops){if(!MX.ld.amb||!MX.ld.cat)return;const T=todayIso();
  for(const o of ops){if(!o||o.col!=='acts'||!o.after)continue;const b=new Set((o.before&&o.before.days)||[]);if(!(o.after.days||[]).some(d=>d>=T&&!b.has(d)))continue;
    const v=mxRowWarn({...o.after,id:o.id});if(!v)continue;const a=S.amb.get(o.after.ambId);
    setTimeout(()=>toast(`⚠ «${o.after.name}»${a?' en '+a.code:''}: la matriz dice «${MXS[v]}». ¿De verdad va?`,'Deshacer',undo),60);return}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mxw]');if(!b)return;e.stopPropagation();const x=S.act.get(b.dataset.mxw);const p=x&&pisoOfAmb(x.ambId);
  if(p&&U.piso&&U.piso!==p)U.piso=p;U.mxV='mat';U.mxF='warn';saveUI();goTab('mat')},true);
