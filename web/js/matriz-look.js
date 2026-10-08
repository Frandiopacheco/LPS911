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

/* nombre que no está en el catálogo: usar una parecida, agregarla (ingeniero) o proponerla (SC) */
async function mxNoCatDlg(v,x){const sim=mxSimilar(v,x.sc);const ed=mxEd();const sc=PM();const tp=ed?await mxAmbTipo(x.ambId):null;
  const useName=c=>{const cur=S.act.get(x.id);if(!cur)return;apply([op('acts',x.id,{...cur,name:c.name})])};
  lqModal(`<div class="lqtop"><b>«${esc(v)}» no está en el catálogo</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">En el lookahead solo se usan actividades del catálogo, para que cada una tenga un solo nombre en toda la obra.</p>
   ${sim.length?`<div class="ph">¿Es alguna de estas?</div><div class="mxsim">${sim.map(c=>`<button class="ib" data-mxuse="${esc(c.id)}"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(c.name)} <small class="note">${esc(conOf(c.sc).name)}</small></button>`).join('')}</div>`:''}
   ${ed?`<div class="ph">O agrégala al catálogo</div><div class="mxform"><label>Nombre<input class="tin" id="mxan" value="${esc(v)}"></label><label>Subcontratista<select id="mxasc">${mxScOpts(x.sc)}</select></label><label>Clase<select id="mxacl">${mxClOpts('t')}</select></label></div>
     ${tp?`<label class="mxur"><input type="checkbox" id="mxatp" checked><span><b>${mxTipoTxt(tp)}</b><small>Así sale en todos los ambientes de ese tipo. Desmárcalo si es algo puntual de este ambiente (Específica).</small></span></label>`:''}`
     :sc?`<div class="ph">O propónla al catálogo</div><p class="note">El ingeniero la revisa; cuando la apruebe podrás usarla.</p><div class="mxform"><label>Nombre<input class="tin" id="mxan" value="${esc(v)}"></label></div>`:''}
   <p class="note" id="mxamsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button>${ed?'<button class="ib pri" id="mxaok">Agregar al catálogo y usarla</button>':sc?'<button class="ib pri" id="mxapr">Proponer al catálogo</button>':''}</div>`,
   async e=>{const u=e.target.closest('[data-mxuse]');if(u){const c=MX.cat.get(u.dataset.mxuse);lqClose();if(c)useName(c);return}
     if(e.target.closest('#mxaok')){const name=$('#mxan').value.replace(/\s+/g,' ').trim();if(!name){$('#mxamsg').textContent='Escribe el nombre.';return}
       const dup=mxAli().get(mnk(name));if(dup){lqClose();useName(MX.cat.get(dup));return}
       const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;const id='k'+NOW().toString(36);const c={id,name,sc:$('#mxasc').value,cl:$('#mxacl').value,esp:'',al:[mnk(name)],ord};
       const toT=tp&&$('#mxatp')&&$('#mxatp').checked;
       try{await fcol('mcat').doc(id).set({...c,...mxNow()});if(toT)await mxTipoAdd(tp.id,id);MX.cat.set(id,c);MX.v++;lqClose();useName(c);toast(toT?`Agregada al catálogo y al tipo «${tp.name}»`:'Agregada al catálogo')}catch(err){mxErr(err)}return}
     if(e.target.closest('#mxapr')){const name=$('#mxan').value.replace(/\s+/g,' ').trim();if(!name){$('#mxamsg').textContent='Escribe el nombre.';return}
       try{await fcol('mcatp').doc('p'+NOW().toString(36)).set({name,sc:x.sc||'',actId:x.id,ambId:x.ambId||'',st:'pend',...mxNow()});lqClose();toast('Propuesta enviada al ingeniero')}catch(err){mxErr(err)}}},
   e=>{if(e.target.id==='mxacl'){const c=$('#mxatp');if(c)c.checked=e.target.value==='t'}})}

/* ---------- herramientas del catálogo (vista Catálogo) ---------- */
function mxCatTools(){const ed=mxEd();const pend=[...MX.prop.values()].filter(p=>p.st==='pend');const mine=SCK()?[...MX.prop.values()].filter(p=>p.by===me.email).sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,8):[];
  let h='';
  if(isAdmin)h+=`<div class="card mxtools"><div class="pad fbar"><b>Lookahead</b>
    <span class="fgl">Exigir catálogo</span><span class="seg" role="group" aria-label="Exigir catálogo en el lookahead"><button data-mxreq="0" class="${P().catReq?'':'on'}">No</button><button data-mxreq="1" class="${P().catReq?'on':''}">Sí</button></span>
    <span class="note">${P().catReq?'Solo se escriben actividades del catálogo.':'Todavía se aceptan nombres libres.'}</span><span class="fsp"></span>
    <button class="ib" id="mxuni">Unificar nombres del lookahead…</button></div></div>`;
  if(ed&&pend.length)h+=`<div class="card"><div class="hd">Propuestas de los subcontratistas <span class="sub">${pend.length} por revisar</span></div><div class="tscroll"><table class="t rt"><tbody>
    ${pend.sort((a,b)=>(a.t||0)-(b.t||0)).map(p=>{const a=S.amb.get(p.ambId);return`<tr><td data-l="Actividad"><b>${esc(p.name)}</b></td><td data-l="SC"><span class="mxsw" style="--c:${esc(conOf(p.sc).color)}"></span>${esc(conOf(p.sc).name)}</td>
      <td data-l="Para">${a?esc(a.code+' '+a.name):''}</td><td data-l="Propuso">${esc(p.n||p.by||'')} · ${esc(fmtD(ldt(p.t||0)))}</td>
      <td><button class="ib pri" data-mxpok="${esc(p.id)}">Aprobar</button> <button class="ib" data-mxpno="${esc(p.id)}">Rechazar</button></td></tr>`}).join('')}</tbody></table></div></div>`;
  if(mine.length)h+=`<div class="card"><div class="hd">Tus propuestas al catálogo</div><div class="pad">${mine.map(p=>`<div>${esc(p.name)} · <b>${p.st==='ok'?'aprobada':p.st==='rej'?'rechazada'+(p.note?': '+esc(p.note):''):'por revisar'}</b></div>`).join('')}</div></div>`;
  return h}
function mxWireCatTools(main){
  main.querySelectorAll('[data-mxreq]').forEach(b=>b.onclick=async()=>{const v=b.dataset.mxreq==='1';if(!!P().catReq===v)return;
    if(v){const n=mxLookOff().length;if(n&&!await uiAsk({title:'Exigir catálogo en el lookahead',text:`Hay ${n} filas del lookahead con nombres que no están en el catálogo. Siguen igual, pero al editar su nombre habrá que elegir uno del catálogo. Conviene unificar o asignar antes.`,ok:'Exigir igual',tone:'warn'}))return}
    apply([op('meta','project',{...P(),catReq:v})],v?'El lookahead ahora exige actividades del catálogo':'El lookahead vuelve a aceptar nombres libres')});
  const un=$('#mxuni');if(un)un.onclick=mxUnifyDlg;
  main.querySelectorAll('[data-mxpok]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpok,true));
  main.querySelectorAll('[data-mxpno]').forEach(b=>b.onclick=()=>mxPropDecide(b.dataset.mxpno,false))}
async function mxPropDecide(id,ok){const p=MX.prop.get(id);if(!p||!mxEd())return;const meta={dec:ok?'ok':'rej',decBy:me.email,decN:me.name||'',decT:NOW()};
  try{if(ok){const dup=mxAli().get(mnk(p.name));let cid=dup;
      if(!dup){cid='k'+NOW().toString(36);const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;await fcol('mcat').doc(cid).set({name:p.name,sc:p.sc||'',cl:'t',esp:'',al:[mnk(p.name)],ord,...mxNow()})}
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
