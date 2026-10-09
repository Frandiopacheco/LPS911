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
/* (auditoría de código 08/10, L1) la lista se arma una vez por versión de la Matriz (MX.v); cada llamada recibe su copia (algunos la ordenan) */
const MXCAC={v:-1,L:null};
function mxCatAct0(){if(MXCAC.v!==MX.v||!MXCAC.L){MXCAC.L=[...MX.cat.values()].filter(c=>!c.arch);MXCAC.v=MX.v}return MXCAC.L}
const mxCatAct=()=>mxCatAct0().slice();

/** al escribir el nombre de una actividad del lookahead: el nombre del catálogo (texto), false si se bloqueó, null si no aplica */
function mxNameGate(v,x,t){if(!mxCatReq()||!v)return null;const id=mxAli().get(mnk(v));const c=id&&MX.cat.get(id);
  if(c&&!c.arch){if(x&&x.sc&&!mxScsOf(c).includes(x.sc))setTimeout(()=>toast(`Ojo: «${c.name}» es de ${conOf(c.sc).name} en el catálogo y esta fila es de ${conOf(x.sc).name}: no saldrá en la Matriz hasta que coincidan.`),60);
    else if(c.name!==v)toast(`Se escribió «${c.name}», como está en el catálogo.`);return c.name}
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
   ${can?`<div class="ph">O agrégala al catálogo</div><div class="mxform"><label>Nombre<input class="tin" id="mxan" value="${esc(v)}"></label><label>Subcontratista<select id="mxasc">${scOpts}</select></label><label>Clase<select id="mxacl">${mxClOpts('t')}</select></label></div>
     <p class="note">Se agrega solo a este ambiente.${sc?' El ingeniero la revisará (nombre, clase, tipo) y si la corrige, el lookahead se actualiza solo.':''}</p>
     ${tp?`<label class="mxur"><input type="checkbox" id="mxatp"><span><b>Agregar a todos los ambientes del tipo «${esc(tp.name)}»${tp.n!=null?` (${tp.n})`:''}</b><small>${sc?'El ingeniero lo confirma al revisarla.':'Sale en todos los ambientes de ese tipo.'}</small></span></label>`:''}`:''}
   <p class="note" id="mxamsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button>${can?'<button class="ib pri" id="mxaok">Agregar al catálogo y usarla</button>':''}</div>`,
   async e=>{const u=e.target.closest('[data-mxuse]');if(u){const c=MX.cat.get(u.dataset.mxuse);lqClose();if(c)useName(c);return}
     if(!e.target.closest('#mxaok'))return;const name=$('#mxan').value.replace(/\s+/g,' ').trim();if(!name){$('#mxamsg').textContent='Escribe el nombre.';return}
     const dup=mxAli().get(mnk(name));if(dup){lqClose();useName(MX.cat.get(dup));return}
     const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;const id='k'+NOW().toString(36);const toT=!!(tp&&$('#mxatp')&&$('#mxatp').checked);
     const c={id,name,sc:$('#mxasc').value,cl:$('#mxacl').value,al:[mnk(name)],ord};
     if(sc)c.rev={by:me.email,n:me.name||'',t:NOW(),amb:x.ambId||'',tipo:toT?tp.id:null};
     try{await fcol('mcat').doc(id).set({...c,...mxNow()});if(toT&&ed)await mxTipoAdd(tp.id,id);MX.cat.set(id,c);MX.v++;lqClose();useName(c);
       toast(sc?'Agregada al catálogo: el ingeniero la revisará':toT?`Agregada al catálogo y al tipo «${tp.name}»`:'Agregada al catálogo (solo este ambiente)')}catch(err){mxErr(err)}},
   async e=>{if(e.target.id==='mxacl'&&e.target.value==='e'){const c=$('#mxatp');if(c)c.checked=false}})}

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
  if(ed){const nd=mxDesCands().length;h+=`<div class="card mxtools"><div class="pad fbar"><b>Desglose</b><span class="note">Actividades generales («Instalaciones ICR»…) que conviene dividir en sus trabajos.</span><span class="fsp"></span><button class="ib${nd?' pri':''}" id="mxdlist">Posibles por desglosar${nd?` (${nd})`:''}…</button></div></div>`}
  if(ed&&rv.length)h+=`<div class="card mxrev"><div class="hd">Agregadas por los subcontratistas <span class="sub">${rv.length} por revisar · corrige nombre o clase en la tabla (el lookahead se actualiza) o fusiónala si ya existía</span></div><div class="tscroll"><table class="t rt"><tbody>
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
  const dl=$('#mxdlist');if(dl)dl.onclick=mxDesListDlg;
  main.querySelectorAll('[data-mxpok]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpok,true));
  main.querySelectorAll('[data-mxpno]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpno,false));
  main.querySelectorAll('[data-mxrok]').forEach(b=>b.onclick=()=>{const id=b.dataset.mxrok;const c=MX.cat.get(id);if(!c||!c.rev)return;const r=c.rev;
    fcol('mcat').doc(id).set({rev:mxFV().delete(),revOk:{by:me.email,n:me.name||'',t:NOW()},...mxNow()},{merge:true}).then(()=>toast('Marcada como revisada','Deshacer',()=>fcol('mcat').doc(id).set({rev:r,...mxNow()},{merge:true}))).catch(mxErr)});
  main.querySelectorAll('[data-mxrfus]').forEach(b=>b.onclick=()=>mxMergeDlg(b.dataset.mxrfus));
  main.querySelectorAll('[data-mxrtp]').forEach(b=>b.onclick=()=>{const c=MX.cat.get(b.dataset.mxrtp);const tp=c&&c.rev&&MX.tipo.get(c.rev.tipo);if(!tp)return;mxTipoAdd(tp.id,c.id).then(()=>toast(`Agregada al tipo «${tp.name}»`)).catch(mxErr)})}
/* propuestas antiguas (mcatp): desde oct 2026 el SC agrega directo; estas se siguen pudiendo resolver */
async function mxPropDecide(id,ok){const p=MX.prop.get(id);if(!p||!mxEd())return;const meta={dec:ok?'ok':'rej',decBy:me.email,decN:me.name||'',decT:NOW()};
  try{if(ok){const dup=mxAli().get(mnk(p.name));let cid=dup;
      if(!dup){cid='k'+NOW().toString(36);const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;await fcol('mcat').doc(cid).set({name:p.name,sc:p.sc||'',cl:'t',al:[mnk(p.name)],ord,...mxNow()})}
      await fcol('mcatp').doc(id).set({st:'ok',catId:cid,...meta},{merge:true});toast(dup?`Ya existía «${MX.cat.get(dup).name}»: se marcó aprobada`:`«${p.name}» agregada al catálogo`);
      /* el ambiente para el que la pidió tiene tipo: ¿la trae todo ese tipo? */
      const tp=await mxAmbTipo(p.ambId);if(tp&&!(tp.acts||[]).includes(cid)&&await uiAsk({title:'¿Agregar también al tipo de ambiente?',text:`La pidieron para un ambiente de tipo «${tp.name}»${tp.n!=null?` (${tp.n} ambientes)`:''}. Si se hace en todos, agrégala al tipo; si es algo puntual, no.`,ok:'Agregar al tipo',cancel:'Solo este ambiente',tone:'info'})){await mxTipoAdd(tp.id,cid);toast(`Agregada también al tipo «${tp.name}»`)}}
    else{const note=await uiAsk({title:`Rechazar «${p.name}»`,input:{label:'Motivo (lo verá el subcontratista)'},ok:'Rechazar',tone:'warn'});if(note===false||note==null)return;
      await fcol('mcatp').doc(id).set({st:'rej',note:String(note||''),...meta},{merge:true});toast('Propuesta rechazada')}}catch(e){mxErr(e)}}

/* filas del lookahead (pisos a la vista) cuyo nombre no está en el catálogo */
function mxLookOff(){const ali=mxAli();const vp=new Set(visPisos().map(p=>p.id));const des=mxDesAli();return[...S.act.values()].filter(x=>mnk(x.name)&&!ali.has(mnk(x.name))&&!des.has(mnk(x.name))&&vp.has(pisoOfAmb(x.ambId)))}

/* ---------- Unificar nombres (solo administrador) ---------- */
function mxUnifyPlan(docs){const pend=new Set();for(const d of docs)for(const[id,v]of Object.entries(d.items||{}))if(v)pend.add(id);
  const vp=new Set(visPisos().map(p=>p.id));const G=new Map();
  for(const x of S.act.values()){if(!vp.has(pisoOfAmb(x.ambId)))continue;const id=mxCatOfN(x);const c=id&&MX.cat.get(id);if(!c||c.arch)continue;const from=String(x.name||'').replace(/\s+/g,' ').trim();if(from===c.name)continue;
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
/* ---------- Terminadas en Campo y la Matriz (oct 2026, decidido con el dueño) ----------
   Marcar «Terminada» en Campo no es la verdad: puede ser un error (faltaba una luminaria). La fila terminada solo se oculta del
   Lookahead cuando la Matriz la tiene CONFIRMADA como Terminado; si no (sin validar o la Matriz dice otra cosa) sigue visible con
   «✓?» y desde ahí el ingeniero confirma en la Matriz o la reabre. mxDoneSt: null | 'ok' (ocultable) | 'pend' (por validar). */
/* M05 (auditoría 08/10, decidido con el dueño): el «Terminado» que puso un SC no oculta la fila hasta que un ingeniero lo da por visto */
function mxDoneSt(x){if(!x||!DONE.has(x.id)||!MX.ld.amb||!MX.ld.cat)return null;const c=mxCatOf(x);if(!c)return null;const v=((MX.amb.get(x.ambId)||{}).c||{})[c];return v==='t'&&!mxScPend(x.ambId,c)?'ok':'pend'}
const mxDonePend=x=>mxDoneSt(x)==='pend';
function mxDoneTxt(x){const c=mxCatOf(x);const v=((MX.amb.get(x.ambId)||{}).c||{})[c];if(v==='t'&&mxScPend(x.ambId,c))return'el subcontratista la marcó Terminado en la Matriz; falta el «✓ Visto» de un ingeniero';return v&&MXS[v]?`la Matriz dice «${MXS[v]}»`:'por validar en la Matriz'}
/* fila fuera del catálogo (oct 2026, pedido del dueño): 'off' = su nombre no es de ninguna actividad del catálogo;
   'sc' = es de una actividad de otro SC (no sale en la Matriz). null = bien, o el catálogo aún no carga / está vacío */
function mxRowCat(x){if(!x||!x.name||!MX.ld.cat||!mxCatAct0().length)return null;const id=mxCatOfN(x);if(!id)return mxDesAli().has(mnk(x.name))?null:'off';const c=MX.cat.get(id);if(!c||c.arch)return'off';return x.sc&&!mxScsOf(c).includes(x.sc)?'sc':null}
function mxCatBadge(x,k,pc){const w=pc?pc.cat:mxRowCat(x);if(!w)return'';const c=w==='sc'?MX.cat.get(mxCatOfN(x)):null;
  return`<span class="mxbadge mxcb" style="--k:${k||0}" data-mxc="${esc(x.id)}" role="button" tabindex="0" title="${w==='off'?'No está en el catálogo de actividades: no sale en la Matriz. Clic: elegir o agregar':`En el catálogo «${esc(c.name)}» es de ${esc(conOf(c.sc).name)}: esta fila no sale en la Matriz. Clic: ver opciones`}">${w==='off'?'∉':'SC'}</span>`}
/* pc (opcional): {cat,warn,done} ya calculados por la grilla para la fila, para no repetirlos (auditoría de código 08/10, L1) */
function mxRowBadge(x,k,pc){const cb=mxCatBadge(x,k,pc);if(cb)k=(k||0)+1;return cb+mxRowBadge0(x,k,pc)}
function mxRowBadge0(x,k,pc){const v=pc?pc.warn:mxRowWarn(x);if(!v&&(pc?pc.done:mxDonePend(x)))return`<span class="mxbadge mxdn" style="--k:${k||0}" data-mxd="${esc(x.id)}" role="button" tabindex="0" title="Terminada en Campo el ${esc(fmtD(DONE.get(x.id)))} · ${esc(mxDoneTxt(x))}. Clic: confirmar o reabrir">✓?</span>`;return v?`<span class="mxbadge" style="--k:${k||0}" data-mxw="${esc(x.id)}" role="button" tabindex="0" title="La matriz dice «${MXS[v]}» para esta actividad en este ambiente, pero sigue programada. Clic: ver en la Matriz">⚠</span>`:''}
function mxApplyWarn(ops){if(!MX.ld.amb||!MX.ld.cat)return;const T=todayIso();
  for(const o of ops){if(!o||o.col!=='acts'||!o.after)continue;const b=new Set((o.before&&o.before.days)||[]);if(!(o.after.days||[]).some(d=>d>=T&&!b.has(d)))continue;
    const v=mxRowWarn({...o.after,id:o.id});if(!v)continue;const a=S.amb.get(o.after.ambId);
    setTimeout(()=>toast(`⚠ «${o.after.name}»${a?' en '+a.code:''}: la matriz dice «${MXS[v]}». ¿De verdad va?`,'Deshacer',undo),60);return}}
/* clic en ⚠: qué dice la matriz y (si edita) quitar los días desde mañana */
document.addEventListener('click',e=>{const b=e.target.closest('[data-mxw]');if(!b)return;e.stopPropagation();const x=S.act.get(b.dataset.mxw);if(!x)return;
  const v=mxRowWarn(x);if(!v)return;const cid=mxCatOf(x);const cells=mxCells().get(x.ambId)||{};const o=cells[cid];const m=MX.amb.get(x.ambId)||{};
  openPop(b,`<div class="ph">⚠ ${esc(x.name)}</div><div class="ptx">La matriz dice <b>${MXS[v]}</b> en este ambiente${m.n?` (lo registró ${esc(m.n)})`:''}, pero sigue programada de hoy en adelante.</div>
   ${mxEd()&&o&&o.fut.length?'<button data-do="unp" class="danger">Quitar los días desde mañana…</button>':''}<button data-do="mat">Ver en la Matriz</button>`,
   {unp:()=>mxUnprogram(o.fut,x.name),mat:()=>mxGoCell(x.ambId,cid)})},true);

/* ---------- Pendientes sin programar (aviso en la barra del Lookahead) ----------
   Celdas de la matriz «Pendiente» (confirmadas o propuestas por el tipo) sin ningún día de hoy en adelante en el lookahead,
   en los pisos a la vista y los subcontratistas del filtro (el SC: los suyos). «En curso» no avisa. */
function mxPendList(){if(!MX.ld.cat||!MX.ld.amb||!MX.cat.size)return[];const cells=mxCells();const vp=new Set(visPisos().map(p=>p.id));const mine=SCK()?new Set(myScsI()):null;const L=[];
  for(const[amb,C]of cells){const a=S.amb.get(amb);if(!a||!vp.has(pisoOfAmb(amb)))continue;
    for(const[cid,o]of Object.entries(C)){if(!o.sp)continue;const c=MX.cat.get(cid);if(!c||c.arch)continue;if(mine?!mxScsOf(c).some(s=>mine.has(s)):!mxScsOf(c).some(scOk))continue;L.push({a,c,o})}}
  /* mismo orden que el lookahead: piso → sector → ambiente (su orden en la grilla); dentro del ambiente, primero lo que ya tiene fila
     (en el orden de sus filas) y luego lo demás por el orden del catálogo */
  const pi=new Map(visPisos().map((p,i)=>[p.id,i]));const so=id=>(S.sec.get(id)||{}).order||0;
  const ro=r=>{const os=r.o.acts.map(id=>S.act.get(id)).filter(Boolean).map(x=>x.order||0);return os.length?[0,Math.min(...os)]:[1,r.c.ord||0]};
  return L.sort((p,q)=>{const d=(pi.get(pisoOfAmb(p.a.id))??99)-(pi.get(pisoOfAmb(q.a.id))??99)||so(p.a.sectorId)-so(q.a.sectorId)||(p.a.sectorId||'').localeCompare(q.a.sectorId||'')||(p.a.order||0)-(q.a.order||0)||(p.a.code||'').localeCompare(q.a.code||'',undefined,{numeric:true});if(d)return d;
    const x=ro(p),y=ro(q);return x[0]-y[0]||x[1]-y[1]||p.c.name.localeCompare(q.c.name)})}
function mxPendPill(){const n=mxPendList().length;return n?`<button class="dpill mxpp" title="Actividades pendientes en la matriz que no tienen días en el lookahead de hoy en adelante">${n} pendiente${n>1?'s':''} sin programar · Ver</button>`:''}
function mxPendDlg(){const L=mxPendList();if(!L.length)return;const can=mxEd()||PM();
  const by=new Map();L.forEach((r,i)=>{const k=r.a.id;if(!by.has(k))by.set(k,[]);by.get(k).push({...r,i})});
  lqModal(`<div class="lqtop"><b>Pendientes sin programar</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">En la matriz están <b>pendientes</b> y no tienen días en el lookahead de hoy en adelante${U.piso?' (este piso)':''}${SCK()?' (tu partida)':U.sc?' (subcontratistas del filtro)':''}. ${can?'Marca las que quieras agregar: se crean en el lookahead sin días, para que les pongas fecha.':''}</p>
   <div class="fbar"><input class="tin mxq" id="mxpq2" type="search" placeholder="Buscar ambiente, actividad o subcontratista" aria-label="Buscar en pendientes sin programar">${can?'<label><input type="checkbox" id="mxpall"> Todas</label>':''}<span class="fsp"></span><span class="note" id="mxpvis">${L.length} pendiente${L.length===1?'':'s'}</span>${can?'<span class="note" id="mxpcnt">0 marcadas</span>':''}</div>
   <div class="mxul">${[...by.values()].map(rs=>`<div class="mxpgw" data-q="${esc(fold(rs[0].a.code+' '+rs[0].a.name+' '+((S.sec.get(rs[0].a.sectorId)||{}).name||'')))}"><div class="mxpg"><button type="button" class="lnkb" data-mxpamb="${esc(rs[0].a.id)}" title="Ir a este ambiente en el lookahead"><b>${esc(rs[0].a.code)} ${esc(rs[0].a.name)}</b> ↗</button></div>${rs.map(r=>`<div class="mxpr" data-q="${esc(fold(r.c.name+' '+conOf(r.c.sc).name))}"><label class="mxur">${can?`<input type="checkbox" data-mxp="${r.i}">`:''}<span><span><span class="mxsw" style="--c:${esc(conOf(r.c.sc).color)}"></span>${esc(r.c.name)}</span><small>${esc(conOf(r.c.sc).name)} · ${r.o.sug?'del tipo de ambiente':'marcada pendiente'}${r.o.acts.length?' · tuvo días antes':''}</small></span></label>
     ${r.o.acts.length?`<button type="button" class="ib" data-mxpgo="${r.i}" title="Ir a su fila en el lookahead para ponerle fecha">Ver fila ↗</button>`:can?`<button type="button" class="ib" data-mxpadd="${r.i}" title="La agrega a este ambiente sin días y te lleva a la fila para ponerle fecha">+ Agregar e ir ↗</button>`:''}</div>`).join('')}</div>`).join('')}<p class="note" id="mxpnone" hidden>Nada coincide con la búsqueda.</p></div>
   <div class="lqbtns"><button class="ib" data-lqx>Cerrar</button>${can?'<button class="ib pri" id="mxpok">Agregar al lookahead</button>':''}</div>`,
   e=>{const ga=e.target.closest('[data-mxpamb]');if(ga){lqClose();mxGoAmb(ga.dataset.mxpamb);return}
     const gv=e.target.closest('[data-mxpgo]');if(gv){const r=L[+gv.dataset.mxpgo];const id=r.o.acts.find(i=>S.act.has(i));lqClose();if(id)gotoAct(id);else mxGoAmb(r.a.id);return}
     const ad=e.target.closest('[data-mxpadd]');const one=ad?[L[+ad.dataset.mxpadd]]:null;
     if(!one&&!e.target.closest('#mxpok'))return;const sel=one||[...document.querySelectorAll('[data-mxp]:checked')].map(c=>L[+c.dataset.mxp]);if(!sel.length){toast('Marca al menos una.');return}
     const ops=[];const last=new Map();for(const r of sel){const sib=[...S.act.values()].filter(x=>x.ambId===r.a.id);let o=last.get(r.a.id);if(o==null)o=sib.length?Math.max(...sib.map(x=>x.order||0)):0;o+=10;last.set(r.a.id,o);
       const id=uid('act');ops.push(op('acts',id,{id,ambId:r.a.id,sc:r.c.sc,name:r.c.name,und:'',metrado:null,days:[],order:o}))}
     lqClose();apply(ops,`${ops.length} ${ops.length===1?'actividad agregada':'actividades agregadas'} al lookahead (sin días)`);
     /* te lleva a la (primera) fila nueva para ponerle fecha */
     const first=ops[0]&&ops[0].id;if(first)setTimeout(()=>{if(S.act.has(first))gotoAct(first)},60)},
   e=>{if(e.target.id==='mxpall')document.querySelectorAll('.mxpr:not([hidden]) [data-mxp]').forEach(c=>c.checked=e.target.checked);const n=document.querySelectorAll('[data-mxp]:checked').length;const el=$('#mxpcnt');if(el)el.textContent=n+' marcadas'});
  /* buscador: varias palabras; coincide con el ambiente (código, nombre, sector) o con la actividad y su SC */
  const q=$('#mxpq2');if(q){q.oninput=()=>{const W=fold(q.value).trim().split(/\s+/).filter(Boolean);let vis=0;
    document.querySelectorAll('#lqm .mxpgw').forEach(g=>{const ga=g.dataset.q;let any=false;g.querySelectorAll('.mxpr').forEach(r=>{const t=ga+' '+r.dataset.q;const ok=W.every(w=>t.includes(w));r.hidden=!ok;if(ok){any=true;vis++}});g.hidden=!any});
    const v=$('#mxpvis');if(v)v.textContent=W.length?`${vis} de ${L.length}`:`${L.length} pendiente${L.length===1?'':'s'}`;const no=$('#mxpnone');if(no)no.hidden=vis>0;const all=$('#mxpall');if(all)all.checked=false};setTimeout(()=>q.focus(),50)}}

/* llevar a un ambiente del lookahead: a su primera actividad (si no tiene, al piso y su sector) */
function mxGoAmb(amb){const sib=[...S.act.values()].filter(x=>x.ambId===amb).sort((a,b)=>(a.order||0)-(b.order||0));if(sib.length){gotoAct(sib[0].id);return}
  const a=S.amb.get(amb);const p=pisoOfAmb(amb);if(p&&U.piso!==p){U.piso=p;U.pisoAll=false}if(a)U.collapsed=(U.collapsed||[]).filter(c=>c!==a.sectorId&&c!==p);U.tab='look';saveUI();render();
  toast(`${a?a.code+' '+a.name:'El ambiente'} todavía no tiene actividades en el lookahead.`)}

/* llevar a la celda de la Matriz (ambiente × actividad) y resaltar su fila y su columna 3 s. Si un filtro la esconde, se abre */
function mxGoCell(amb,cat){const p=pisoOfAmb(amb);if(p&&U.piso&&U.piso!==p)U.piso=p;const c=MX.cat.get(cat);
  if(c&&mxSel().length&&!mxSel().includes(c.sc))U.mxSc=[];if(c&&c.cl==='e')U.mxAll=true;
  U.mxV='mat';MX.sel.clear();MX.focus={amb,cat,until:performance.now()+3000,scrolled:false};saveUI();goTab('mat')}

/* clic en ∉ / SC: elegir o agregar en el catálogo, o resolver el SC distinto */
document.addEventListener('click',e=>{const b=e.target.closest('[data-mxc]');if(!b)return;e.stopPropagation();const x=S.act.get(b.dataset.mxc);if(!x)return;const w=mxRowCat(x);if(!w)return;
  if(w==='off'){closePop();if(mxEd()||PM())mxNoCatDlg(x.name,x);else openPop(b,`<div class="ph">∉ ${esc(x.name)}</div><div class="ptx">No está en el catálogo de actividades, así que no sale en la Matriz. Un ingeniero puede asignarla.</div>`,{});return}
  const c=MX.cat.get(mxCatOfN(x));const ed=mxEd();
  openPop(b,`<div class="ph">SC distinto · ${esc(x.name)}</div><div class="ptx">En el catálogo es de <b>${esc(conOf(c.sc).name)}</b>${(c.scs||[]).length?' (y '+(c.scs||[]).map(i=>esc(conOf(i).name)).join(', ')+')':''}; esta fila es de <b>${esc(conOf(x.sc).name)}</b>. Mientras no coincidan, no sale en la Matriz.</div>
   ${ed?`<button data-do="add">Sumar ${esc(conOf(x.sc).name)} a la actividad (la hacen los dos)</button><button data-do="mov">Pasar esta fila a ${esc(conOf(c.sc).name)}</button>`:''}`,
   {add:async()=>{try{await mxCatScsAdd(c.id,x.sc);toast(`«${c.name}»: ahora también de ${conOf(x.sc).name}`);requestRender()}catch(err){mxErr(err)}},
    mov:()=>{const cur=S.act.get(x.id);if(cur)apply([op('acts',x.id,{...cur,sc:c.sc})],`«${x.name}» pasa a ${conOf(c.sc).name}`)}})},true);

/* clic en ✓?: confirmar Terminado en la Matriz (la fila se oculta) o reabrir la actividad (no estaba terminada) */
document.addEventListener('click',e=>{const b=e.target.closest('[data-mxd]');if(!b)return;e.stopPropagation();const x=S.act.get(b.dataset.mxd);if(!x||!mxDonePend(x))return;
  const cid=mxCatOf(x);const a=S.amb.get(x.ambId);
  openPop(b,`<div class="ph">✓? ${esc(x.name)}</div><div class="ptx">Se marcó <b>terminada</b> en Campo el ${esc(fmtD(DONE.get(x.id)))}${a?' en '+esc(a.code):''}, pero ${esc(mxDoneTxt(x))}. Mientras no se confirme sigue en el Lookahead.</div>
   ${mxEd()?'<button data-do="ok">✓ Confirmar Terminado en la Matriz</button>':''}${canDaily?'<button data-do="reo">Reabrir: no está terminada</button>':''}<button data-do="mat">Ver en la Matriz</button>`,
   {ok:()=>{const DEL=firebase.firestore.FieldValue.delete();const prev=((MX.amb.get(x.ambId)||{}).c||{})[cid];mxWrite(new Map([[x.ambId,{[cid]:'t'}]]),'Terminado confirmado en la Matriz',new Map([[x.ambId,{[cid]:prev===undefined?DEL:prev}]]))},
    reo:()=>reopenDone(x.id),mat:()=>mxGoCell(x.ambId,cid)})},true);
