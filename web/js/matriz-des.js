"use strict";
/* LPS 911 · Desglosar una actividad genérica del catálogo (oct 2026, decidido con el dueño).
   Ej.: «Instalaciones ICR» → «Bajada para rociadores», «Instalación de rociadores», «Gabinetes contra incendio».
   Se define UNA vez en Matriz › Catálogo (⋮ › Desglosar…, solo el administrador) y se aplica en toda la obra:
   - Catálogo: crea las partes (o usa las que ya existen) y archiva la genérica (arch.des guarda todo para «Restaurar»).
   - Tipos de ambiente: la genérica se reemplaza por sus partes.
   - Matriz: cada parte hereda el estado confirmado de la genérica en cada ambiente (y el propuesto donde el ambiente no
     recibiría la parte por otro lado).
   - Lookahead: por fila de la genérica (todos los pisos), los días que todavía se pueden reprogramar (no pasados, no hoy, no
     publicados: `planLocked`) pasan a las partes, con las mismas fechas. Si la fila no tiene días cerrados se renombra a la
     primera parte (conserva su id: restricciones, liberaciones) y se agregan las demás; si tiene días cerrados, conserva esos
     días con su nombre antiguo (historial, PPC) y las partes se agregan debajo. Las filas terminadas no se tocan; las que
     tienen propuesta del SC pendiente se saltan. Semanas congeladas, PPC y planes publicados no cambian.
   «Posibles por desglosar»: lista de actividades con nombre general, marcadas «Por desglosar» o muy largas, para revisarlas.
   Ver docs/ia/matriz.md. */

const MXD={parts:[],gen:'',pend:null};
const mxdWords=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const MXD_GEN=new Set(['instalaciones','icr','dasi','daci','aci','iiee','iiss','iimm','iiaa','mep','varios','otros','general','generales','acabados','trabajos','especialidades','miscelaneos','complementarios']);
const mxdCan=()=>isAdmin&&mxEd();
/** alias de las genéricas ya desglosadas: sus filas antiguas (días pasados) no deben salir como «no está en el catálogo» */
function mxDesAli(){if(MXD.aliV===MX.v&&MXD.ali)return MXD.ali;const m=new Map();for(const c of MX.cat.values()){if(!c.arch||!c.arch.des)continue;[mnk(c.name),...(c.al||[])].forEach(k=>{if(k&&!m.has(k))m.set(k,c.id)})}MXD.ali=m;MXD.aliV=MX.v;return m}

/* ---------- posibles por desglosar ---------- */
const mxdMed=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};
function mxDesCands(){const by=new Map();const all=[];
  for(const x of S.act.values()){const n=(x.days||[]).length;const c=mxCatOfN(x);if(!c)continue;let o=by.get(c);if(!o)by.set(c,o={rows:0,d:[]});o.rows++;if(n){o.d.push(n);all.push(n)}}
  const g=mxdMed(all)||1;const R=[];
  for(const c of MX.cat.values()){if(c.arch||c.okd)continue;const why=[];const o=by.get(c.id)||{rows:0,d:[]};
    if(c.cl==='d')why.push('Marcada «Por desglosar»');
    const w=mxdWords(c.name);const gw=w.filter(x=>MXD_GEN.has(x));if(gw.length&&w.length<=4)why.push(`Nombre general («${gw.join(' ')}»)`);
    const m=mxdMed(o.d);if(o.d.length>=3&&m>=Math.max(8,Math.round(g*2.5)))why.push(`Dura ${m} días por ambiente (lo común: ${g})`);
    if(why.length)R.push({c,why,rows:o.rows})}
  return R.sort((a,b)=>b.why.length-a.why.length||b.rows-a.rows||a.c.name.localeCompare(b.c.name))}
function mxDesListDlg(){const L=mxDesCands();const can=mxdCan();
  lqModal(`<div class="lqtop"><b>Posibles por desglosar</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Actividades que parecen agrupar varios trabajos: nombre general, marcadas «Por desglosar» o mucho más largas que lo común. Revisa cada una: «Desglosar…» la divide en toda la obra; «Está bien así» la quita de esta lista.${can?'':' Solo el administrador las desglosa.'}</p>
   <div class="tscroll"><table class="t rt"><tbody>${L.map(({c,why,rows})=>`<tr><td data-l="Actividad"><b>${esc(c.name)}</b><small class="note" style="display:block">${why.map(esc).join(' · ')}</small></td>
     <td data-l="SC"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(conOf(c.sc).name)}</td><td class="mono" data-l="Filas">${rows} fila${rows===1?'':'s'}</td>
     <td class="mxrb">${mxLkBtn(mxLkTerms(c.id),'')}${can?`<button class="ib" data-mxdok="${esc(c.id)}">Está bien así</button><button class="ib pri" data-mxdgo="${esc(c.id)}">Desglosar…</button>`:''}</td></tr>`).join('')||'<tr><td class="note">No hay actividades que parezcan genéricas.</td></tr>'}</tbody></table></div>
   <div class="lqbtns"><button class="ib" data-lqx>Cerrar</button></div>`,
   e=>{const g=e.target.closest('[data-mxdgo]');if(g){mxDesDlg(g.dataset.mxdgo);return}
     const k=e.target.closest('[data-mxdok]');if(k&&mxdCan()){const id=k.dataset.mxdok;const c=MX.cat.get(id);const up={okd:{t:NOW(),by:me.email,n:me.name||''},...mxNow()};if(c&&c.cl==='d')up.cl='t';
       fcol('mcat').doc(id).set(up,{merge:true}).then(()=>{if(c)c.okd=up.okd;mxDesListDlg();toast(`«${c?c.name:''}» quedó como está`,'Deshacer',()=>fcol('mcat').doc(id).set({okd:mxFV().delete(),...(up.cl?{cl:'d'}:{}),...mxNow()},{merge:true}))}).catch(mxErr)}})}

/* ---------- desglosar ---------- */
function mxDesParts(){const seen=new Set();const G=MX.cat.get(MXD.gen);const out=[];
  for(const p of MXD.parts){const name=String(p.name||'').replace(/\s+/g,' ').trim();const k=mnk(name);if(!k||seen.has(k))continue;seen.add(k);
    const ex=mxAli().get(k);const E=ex&&ex!==MXD.gen?MX.cat.get(ex):null;out.push({name:E?E.name:name,sc:E?E.sc:(p.sc||(G&&G.sc)||''),id:E?E.id:'',ex:!!E})}
  return out}
/** qué pasaría (sin escribir nada) */
function mxDesPlan(genId,parts,pend){const G=MX.cat.get(genId);const rows=[];let skip=0,done=0;
  for(const x of S.act.values()){if(mxCatOfN(x)!==genId)continue;if(pend.has(x.id)){skip++;continue}if(DONE.has(x.id)){done++;continue}
    const pid=pisoOfAmb(x.ambId);const lk=[],fr=[];for(const d of (x.days||[]))(planLocked(d,pid)?lk:fr).push(d);rows.push({x,mode:lk.length?'split':'ren',lk,fr})}
  const tipos=[...MX.tipo.values()].filter(t=>(t.acts||[]).includes(genId));
  let st=0;for(const m of MX.amb.values())if(genId in (m.c||{}))st++;
  return{G,parts,rows,skip,done,tipos,st}}
function mxDesTxt(pl){const n=pl.parts.length;const nw=pl.parts.filter(p=>!p.ex).length;const ren=pl.rows.filter(r=>r.mode==='ren').length,spl=pl.rows.length-ren;
  const amb=new Set(pl.rows.map(r=>r.x.ambId)).size;const pis=new Set(pl.rows.map(r=>pisoOfAmb(r.x.ambId))).size;
  return[`Catálogo: ${n} actividad${n===1?'':'es'}${nw<n?` (${n-nw} ya existía${n-nw===1?'':'n'}: se usa${n-nw===1?'':'n'} esa${n-nw===1?'':'s'})`:''}; «${pl.G.name}» queda archivada como desglosada (se puede restaurar).`,
    pl.tipos.length?`Tipos de ambiente: se reemplaza en ${pl.tipos.map(t=>'«'+t.name+'»').join(', ')}.`:'',
    pl.st?`Matriz: ${pl.st} estado${pl.st===1?'':'s'} marcado${pl.st===1?'':'s'} pasa${pl.st===1?'':'n'} a cada parte.`:'',
    pl.rows.length?`Lookahead: ${pl.rows.length} fila${pl.rows.length===1?'':'s'} en ${amb} ambiente${amb===1?'':'s'} (${pis} piso${pis===1?'':'s'}) se dividen con las mismas fechas.${spl?` ${spl} tiene${spl===1?'':'n'} días pasados o ya publicados: esos días quedan con el nombre antiguo y las partes toman solo los días siguientes.`:''}`:'Lookahead: no tiene filas por cambiar.',
    pl.done?`${pl.done} fila${pl.done===1?'':'s'} terminada${pl.done===1?'':'s'} no se toca${pl.done===1?'':'n'}.`:'',
    pl.skip?`${pl.skip} fila${pl.skip===1?'':'s'} con propuesta del SC pendiente se salta${pl.skip===1?'':'n'} (resuélvela y vuelve a desglosar desde el lookahead).`:'',
    'Semanas congeladas, PPC y planes publicados no cambian.'].filter(Boolean)}
async function mxDesDlg(genId){if(!mxdCan()){toast('Solo el administrador desglosa actividades del catálogo.');return}const G=MX.cat.get(genId);if(!G||G.arch)return;
  MXD.gen=genId;MXD.parts=[{name:'',sc:G.sc},{name:'',sc:G.sc},{name:'',sc:G.sc}];MXD.pend=await mxPendProp();
  const names=[...MX.cat.values()].filter(c=>!c.arch&&c.id!==genId).map(c=>c.name).sort((a,b)=>a.localeCompare(b));
  const prow=(p,i)=>`<div class="mxdp"><input class="tin" data-dpn="${i}" list="mxdl" value="${esc(p.name)}" placeholder="Parte ${i+1} (p. ej. Bajada para rociadores)" aria-label="Nombre de la parte ${i+1}"><select data-dps="${i}" aria-label="Subcontratista de la parte ${i+1}">${mxScOpts(p.sc)}</select><button class="ab" data-dpx="${i}" aria-label="Quitar parte ${i+1}">&times;</button></div>`;
  const prev=()=>{const pl=mxDesPlan(genId,mxDesParts(),MXD.pend);const el=$('#mxdpv');if(el)el.innerHTML=pl.parts.length<2?'<p class="note">Escribe al menos dos partes.</p>':`<ul class="note">${mxDesTxt(pl).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`};
  const draw=()=>{const b=$('#mxdps');if(b)b.innerHTML=MXD.parts.map(prow).join('');prev()};
  lqModal(`<div class="lqtop"><b>Desglosar «${esc(G.name)}»</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Escribe en qué actividades se divide. Se aplica en toda la obra: catálogo, tipos de ambiente, Matriz y lookahead. Por defecto cada parte queda con el mismo subcontratista de la fila.</p>
   <div id="mxdps"></div><datalist id="mxdl">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
   <div class="pad" style="padding-left:0"><button class="ib" id="mxdadd">+ Otra parte</button></div>
   <div id="mxdpv"></div><p class="note" id="mxdmsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxdok">Desglosar</button></div>`,
   async e=>{if(e.target.closest('#mxdadd')){MXD.parts.push({name:'',sc:G.sc});draw();const L=$$('[data-dpn]');if(L.length)L[L.length-1].focus();return}
     const x=e.target.closest('[data-dpx]');if(x){MXD.parts.splice(+x.dataset.dpx,1);if(!MXD.parts.length)MXD.parts.push({name:'',sc:G.sc});draw();return}
     const ok=e.target.closest('#mxdok');if(!ok)return;const parts=mxDesParts();if(parts.length<2){$('#mxdmsg').textContent='Escribe al menos dos partes distintas.';return}
     ok.disabled=true;
     /* MOD-01: con cambios del SC sin revisar en la genérica no se desglosa (sus constancias quedarían en la archivada) */
     const np=await mxScPendN(genId);if(np){ok.disabled=false;$('#mxdmsg').textContent=`«${G.name}» tiene ${np} ${np===1?'cambio':'cambios'} de subcontratistas sin revisar en la Matriz: revísalos primero («✓ Visto» o «↶ Revertir») y vuelve a desglosar.`;return}
     try{await mxDesApply(genId,parts);lqClose()}catch(err){ok.disabled=false;mxErr(err)}},
   e=>{const n=e.target.dataset.dpn,s=e.target.dataset.dps;if(n!=null){MXD.parts[+n].name=e.target.value;const E=MX.cat.get(mxAli().get(mnk(e.target.value))||'');if(E&&E.id!==genId){MXD.parts[+n].sc=E.sc;const sl=$(`[data-dps="${n}"]`);if(sl)sl.value=E.sc}prev()}
     if(s!=null){MXD.parts[+s].sc=e.target.value;prev()}});
  draw();const box=$('#mxdps');if(box)box.addEventListener('input',e=>{if(e.target.dataset.dpn!=null){MXD.parts[+e.target.dataset.dpn].name=e.target.value;prev()}});
  setTimeout(()=>{const f=$('[data-dpn="0"]');if(f)f.focus()},50)}

async function mxDesApply(genId,parts){const pend=await mxPendProp();const pl=mxDesPlan(genId,parts,pend);const G=pl.G;const FV=mxFV();const meta=mxNow();const W=[];
  /* 1) catálogo: partes nuevas */
  const created=[];let k=0;const base=G.ord||0;
  for(const p of parts){if(p.id)continue;const id='k'+NOW().toString(36)+'d'+(k++);p.id=id;created.push(id);W.push(['mcat',id,{name:p.name,sc:p.sc||G.sc,cl:'t',al:[mnk(p.name)],ord:base+k/100,des:genId,...meta}])}
  const ids=parts.map(p=>p.id);
  /* 2) tipos: la genérica se reemplaza por sus partes (en su lugar) */
  const tp={};for(const t of pl.tipos){const L=t.acts||[];const add=ids.filter(i=>!L.includes(i));const nx=[];for(const a of L){if(a===genId)nx.push(...add);else nx.push(a)}tp[t.id]=add;W.push(['mtipo',t.id,{acts:[...new Set(nx)],...meta}])}
  /* 3) lookahead (se arma antes para saber en qué ambientes habrá partes nuevas) */
  const ops=[];const ren={},cut={},addR=[];const ambNew=new Set();
  for(const r of pl.rows){const x=r.x;const sib=siblings('acts','ambId',x.ambId);const nxt=sib.find(a=>(a.order||0)>(x.order||0));const step=nxt?((nxt.order||0)-(x.order||0))/(parts.length+1):10;
    const scOf=p=>p.sc&&p.sc!==G.sc?p.sc:(x.sc||p.sc||G.sc);let from=0;
    if(r.mode==='ren'){const p=parts[0];ren[x.id]={n:x.name,sc:x.sc||'',m:x.metrado??null,...(x.qty?{q:x.qty}:{})};const nx={...x,name:p.name,sc:scOf(p),metrado:null};delete nx.qty;ops.push(op('acts',x.id,nx));from=1}
    else{cut[x.id]=r.fr;if(r.fr.length){const q={...(x.qty||{})};r.fr.forEach(d=>delete q[d]);const nx={...x,days:r.lk};if(x.qty)nx.qty=q;ops.push(op('acts',x.id,nx))}}
    parts.slice(from).forEach((p,i)=>{const id=uid('act')+'d'+i;addR.push(id);ops.push(op('acts',id,{id,ambId:x.ambId,sc:scOf(p),name:p.name,und:x.und||'',metrado:null,days:r.mode==='ren'?(x.days||[]).slice():r.fr.slice(),order:(x.order||0)+step*(i+1)}))});
    ambNew.add(x.ambId)}
  /* 4) matriz: cada parte hereda el estado confirmado; donde el ambiente no recibiría la parte por otro lado, el propuesto */
  const cells={};const C=mxCells();const tipoHas=amb=>{const m=MX.amb.get(amb);return!!(m&&m.tipo&&pl.tipos.some(t=>t.id===m.tipo&&!t.arch))};
  for(const amb of S.amb.values()){const o=(C.get(amb.id)||{})[genId];const m=MX.amb.get(amb.id)||{};const st=(m.c||{})[genId];if(!o&&!st)continue;
    const v=st||((ambNew.has(amb.id)||tipoHas(amb.id))?null:o.s);if(!v)continue;const up={};for(const i of ids)if(!((m.c||{})[i]))up[i]=v;if(!Object.keys(up).length)continue;
    cells[amb.id]=up;W.push(['mamb',amb.id,{c:up,...meta}])}
  /* 5) la genérica queda archivada con todo lo necesario para restaurar */
  W.push(['mcat',genId,{arch:{t:NOW(),by:me.email,n:me.name||'',des:{parts:ids,names:parts.map(p=>p.name),created,tp,cells,ren,cut,add:addR}},...meta}]);
  for(let i=0;i<W.length;i+=400){const bt=db.batch();W.slice(i,i+400).forEach(([c,id,v])=>bt.set(fcol(c).doc(id),v,{merge:true}));await bt.commit()}
  for(const[,id,v]of W.filter(w=>w[0]==='mcat'&&created.includes(w[1])))MX.cat.set(id,{...v,id});MX.v++;
  if(ops.length)apply(ops,`Desglose: «${G.name}» → ${parts.length} actividades`);
  toast(`«${G.name}» desglosada en ${parts.length}${pl.rows.length?` · ${pl.rows.length} fila${pl.rows.length===1?'':'s'} del lookahead`:''}`,'Deshacer',()=>mxDesRestore(genId,true))}

/** restaurar una genérica desglosada: vuelve la genérica, sus tipos, sus filas y quita lo que el desglose escribió (si nadie lo cambió) */
async function mxDesRestore(genId,quiet){if(!mxdCan()){toast('Solo el administrador restaura un desglose.');return}const G=MX.cat.get(genId);const r=G&&G.arch&&G.arch.des;if(!r)return;
  const FV=mxFV();const DEL=FV.delete();const meta=mxNow();const W=[];const names=new Set((r.names||[]).map(mnk));
  for(const[t,add]of Object.entries(r.tp||{})){const T=MX.tipo.get(t);if(!T)continue;const L=T.acts||[];let ins=false;const nx=[];for(const a of L){if((add||[]).includes(a)){if(!ins){nx.push(genId);ins=true}continue}nx.push(a)}if(!ins&&!nx.includes(genId))nx.push(genId);W.push(['mtipo',t,{acts:[...new Set(nx)],...meta}])}
  for(const[amb,up]of Object.entries(r.cells||{})){const c=(MX.amb.get(amb)||{}).c||{};const d={};for(const[i,v]of Object.entries(up))if(c[i]===v)d[i]=DEL;if(Object.keys(d).length)W.push(['mamb',amb,{c:d,...meta}])}
  for(const id of r.created||[])if(MX.cat.has(id))W.push(['mcat',id,{arch:{t:NOW(),by:me.email,n:me.name||'',desUndo:genId},...meta}]);
  W.push(['mcat',genId,{arch:DEL,...meta}]);
  try{for(let i=0;i<W.length;i+=400){const bt=db.batch();W.slice(i,i+400).forEach(([c,id,v])=>bt.set(fcol(c).doc(id),v,{merge:true}));await bt.commit()}}catch(e){mxErr(e);return}
  const ops=[];
  for(const[id,o]of Object.entries(r.ren||{})){const x=S.act.get(id);if(x&&names.has(mnk(x.name))){const nx={...x,name:o.n,sc:o.sc||x.sc,metrado:o.m??null};if(o.q)nx.qty=o.q;ops.push(op('acts',id,nx))}}
  for(const[id,ds]of Object.entries(r.cut||{})){const x=S.act.get(id);if(!x||!(ds||[]).length)continue;ops.push(op('acts',id,{...x,days:[...new Set([...(x.days||[]),...ds])].sort()}))}
  for(const id of r.add||[]){const o=arc('acts',id);if(o)ops.push(o)}
  if(ops.length)apply(ops,`Restaurar «${G.name}»: lookahead`);
  toast(quiet?'Desglose deshecho':`«${G.name}» restaurada`)}

/* ---------- Separar por subcontratista (19/10, pedido del dueño) ----------
   Una actividad que hacen varios SC por su cuenta (p. ej. «Limpieza»: cada uno limpia lo suyo) tiene un solo estado por ambiente,
   así que no sirve compartida. Esto crea una actividad por SC («Limpieza CANOVAS MC»), les pasa las filas del lookahead de ese SC
   (solo cambia el nombre; semanas congeladas, PPC y planes publicados conservan el anterior), copia el estado confirmado de la Matriz
   en los ambientes de ese SC y quita al SC de «Otros subcontratistas que la hacen». La original queda con su SC principal.
   Solo el administrador (renombra filas con historial). Deshacer en el aviso. */
function mxSplitInfo(id){const c=MX.cat.get(id);if(!c)return[];const by=new Map();
  for(const x of S.act.values()){if(!x.name||x._del||!x.sc||x.sc===c.sc||mxCatOfN(x)!==id)continue;if(!by.has(x.sc))by.set(x.sc,{sc:x.sc,rows:[],ambs:new Set()});const g=by.get(x.sc);g.rows.push(x.id);g.ambs.add(x.ambId)}
  for(const s of(Array.isArray(c.scs)?c.scs:[]))if(s&&s!==c.sc&&!by.has(s))by.set(s,{sc:s,rows:[],ambs:new Set()});
  return[...by.values()].sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name))}
function mxSplitDlg(id){if(!isAdmin){toast('Solo el administrador separa actividades por subcontratista.');return}const c=MX.cat.get(id);if(!c||c.arch)return;
  const G=mxSplitInfo(id);if(!G.length){toast(`«${c.name}» no tiene filas ni subcontratistas aparte de ${conOf(c.sc).name}.`);return}
  const tps=[...MX.tipo.values()].filter(t=>!t.arch&&(t.acts||[]).includes(id));
  const names=[...MX.cat.values()].filter(x=>!x.arch&&x.id!==id).map(x=>x.name).sort((a,b)=>a.localeCompare(b));
  lqModal(`<div class="lqtop"><b>Separar «${esc(c.name)}» por subcontratista</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Cada subcontratista marcado pasa a tener su propia actividad, con su propio estado en la Matriz. Sus filas del lookahead cambian de nombre (las semanas congeladas, el PPC y los planes publicados conservan el anterior) y se copia el estado que la Matriz tenía en sus ambientes. «${esc(c.name)}» queda solo de <b>${esc(conOf(c.sc).name)}</b>.</p>
   <div class="mxml">${G.map((g,i)=>`<div class="mxmr mxspr"><label class="chk"><input type="checkbox" data-sps="${i}" checked> <span><b>${esc(conOf(g.sc).name)}</b><small>${g.rows.length} ${g.rows.length===1?'fila':'filas'} · ${g.ambs.size} ${g.ambs.size===1?'ambiente':'ambientes'}</small></span></label>
     <input class="tin" data-spn="${i}" list="mxspl" value="${esc(c.name+' '+conOf(g.sc).name)}" aria-label="Nombre de la actividad de ${esc(conOf(g.sc).name)}"></div>`).join('')}</div>
   <datalist id="mxspl">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
   ${tps.length?`<label class="chk mxur"><input type="checkbox" id="mxsptp"> <span><b>Agregar las nuevas a los tipos de ambiente donde está «${esc(c.name)}»</b><small>${tps.map(t=>esc(t.name)).join(', ')}. Si no, cada una queda solo donde ese SC tiene filas.</small></span></label>`:''}
   <p class="note" id="mxspmsg">Si escribes el nombre de una actividad que ya existe, se usa esa en vez de crear otra.</p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxspok">Separar</button></div>`,
   async e=>{const ok=e.target.closest('#mxspok');if(!ok)return;const msg=$('#mxspmsg');
     const sel=G.map((g,i)=>({...g,on:$(`[data-sps="${i}"]`).checked,name:($(`[data-spn="${i}"]`).value||'').replace(/\s+/g,' ').trim()})).filter(g=>g.on);
     if(!sel.length){msg.textContent='Marca al menos un subcontratista.';return}
     if(sel.some(g=>!g.name)){msg.textContent='Escribe el nombre de cada actividad nueva.';return}
     const ks=sel.map(g=>mnk(g.name));if(new Set(ks).size!==ks.length){msg.textContent='Dos subcontratistas no pueden quedar con el mismo nombre.';return}
     for(const g of sel){const t=MX.cat.get(mxAli().get(mnk(g.name))||'');if(t&&!t.arch&&(t.id===id||!mxScsOf(t).includes(g.sc))){msg.textContent=t.id===id?`«${g.name}» es la misma actividad: ponle otro nombre.`:`«${t.name}» ya existe y es de ${conOf(t.sc).name}, no de ${conOf(g.sc).name}: elige otro nombre.`;return}}
     ok.disabled=true;const np=await mxScPendN(id);if(np){ok.disabled=false;msg.textContent=`«${c.name}» tiene ${np} ${np===1?'cambio':'cambios'} de subcontratistas sin revisar en la Matriz: revísalos primero («✓ Visto» o «↶ Revertir»).`;return}
     try{await mxSplitApply(id,sel,!!($('#mxsptp')||{}).checked);lqClose()}catch(err){ok.disabled=false;mxErr(err)}})}
async function mxSplitApply(id,sel,toTipo){const c=MX.cat.get(id);const pend=await mxPendProp();const FV=mxFV();const meta=mxNow();const DEL=FV.delete();
  const W=[];const U2={made:[],scs:[],ren:[],cells:[],tipos:[]};let skip=0;let k=0;
  for(const g of sel){let tid=mxAli().get(mnk(g.name));const t=tid&&MX.cat.get(tid);
    if(!t||t.arch){tid='k'+NOW().toString(36)+(k++);const nc={name:g.name,sc:g.sc,cl:c.cl||'t',al:[mnk(g.name)],ord:(c.ord||0)+0.01*k,spl:id,...meta};if(c.tr!=null)nc.tr=c.tr;W.push([fcol('mcat').doc(tid),nc]);U2.made.push(tid)}
    g.tid=tid;U2.scs.push(g.sc);
    for(const rid of g.rows){const x=S.act.get(rid);if(!x)continue;if(pend.has(rid)){skip++;continue}U2.ren.push({id:rid,from:x.name,to:g.name})}}
  /* Matriz: el estado confirmado de la original pasa a la nueva en los ambientes del SC; donde ya nadie más tiene la original (ni la
     da el tipo), se quita para que no quede una celda de otro SC */
  const renIds=new Set(U2.ren.map(r=>r.id));const keepAmb=new Set();for(const x of S.act.values())if(x.name&&!x._del&&mxCatOfN(x)===id&&!renIds.has(x.id))keepAmb.add(x.ambId);
  const ambs=new Map();for(const g of sel)for(const a of g.ambs){if(!ambs.has(a))ambs.set(a,[]);ambs.get(a).push(g.tid)}
  for(const[a,tids]of ambs){const m=MX.amb.get(a)||{};const v=(m.c||{})[id];if(v===undefined)continue;const tp=m.tipo&&MX.tipo.get(m.tipo);const inT=!!(tp&&!tp.arch&&(tp.acts||[]).includes(id));
    const c2={},m2={};for(const tid of tids){U2.cells.push({amb:a,cat:tid,prev:(m.c||{})[tid],v});c2[tid]=v;m2[tid]={...((m.m||{})[id]||{}),...mxCM(false)}}
    if(!keepAmb.has(a)&&!inT){U2.cells.push({amb:a,cat:id,prev:v,v:undefined,mo:(m.m||{})[id]||null});c2[id]=DEL;m2[id]=DEL}
    W.push([fcol('mamb').doc(a),{c:c2,m:m2,...meta},{merge:true}])}
  W.push([fcol('mcat').doc(id),{scs:FV.arrayRemove(...U2.scs),...meta},{merge:true}]);
  if(toTipo)for(const t of MX.tipo.values()){if(t.arch||!(t.acts||[]).includes(id))continue;const add=sel.map(g=>g.tid).filter(x=>!(t.acts||[]).includes(x));if(!add.length)continue;U2.tipos.push({id:t.id,add});W.push([fcol('mtipo').doc(t.id),{acts:FV.arrayUnion(...add),...meta},{merge:true}])}
  for(let i=0;i<W.length;i+=400){const b=db.batch();W.slice(i,i+400).forEach(([r,d,o])=>o?b.set(r,d,o):b.set(r,d));await b.commit()}
  if(U2.ren.length)apply(U2.ren.map(r=>op('acts',r.id,{...S.act.get(r.id),name:r.to})),`«${c.name}» separada por subcontratista (${U2.ren.length} filas)`);
  toast(`«${c.name}» separada: ${sel.map(g=>g.name).join(', ')}${skip?` · ${skip} ${skip===1?'fila tiene':'filas tienen'} una propuesta del SC pendiente y no cambió`:''}`,'Deshacer',()=>mxSplitUndo(id,U2))}
async function mxSplitUndo(id,U2){const FV=mxFV();const meta=mxNow();const DEL=FV.delete();const W=[];
  const byA=new Map();for(const x of U2.cells){const cur=((MX.amb.get(x.amb)||{}).c||{})[x.cat];if(cur!==x.v)continue;if(!byA.has(x.amb))byA.set(x.amb,{c:{},m:{}});const o=byA.get(x.amb);
    o.c[x.cat]=x.prev===undefined?DEL:x.prev;o.m[x.cat]=x.prev===undefined?DEL:(x.mo||mxCM(false))}
  for(const[a,o]of byA)W.push([fcol('mamb').doc(a),{...o,...meta},{merge:true}]);
  for(const tid of U2.made)W.push([fcol('mcat').doc(tid),{arch:{t:NOW(),by:me.email,n:me.name||'',spl:true},...meta},{merge:true}]);
  W.push([fcol('mcat').doc(id),{scs:FV.arrayUnion(...U2.scs),...meta},{merge:true}]);
  for(const t of U2.tipos)W.push([fcol('mtipo').doc(t.id),{acts:FV.arrayRemove(...t.add),...meta},{merge:true}]);
  try{for(let i=0;i<W.length;i+=400){const b=db.batch();W.slice(i,i+400).forEach(([r,d,o])=>b.set(r,d,o));await b.commit()}
    const ops=U2.ren.map(r=>{const x=S.act.get(r.id);return x&&x.name===r.to?op('acts',r.id,{...x,name:r.from}):null}).filter(Boolean);if(ops.length)apply(ops,'Deshecha la separación por subcontratista');toast('Deshecho')}catch(e){mxErr(e)}}
