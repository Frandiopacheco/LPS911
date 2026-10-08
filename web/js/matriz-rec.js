"use strict";
/* LPS 911 · Matriz › Recorrido (oct 2026): llenar la matriz en campo con la tablet, ambiente por ambiente.
   Lista por sector (avance, revisado esta semana) → checklist del ambiente en secuencia de obra con 4 botones grandes →
   «¿Falta algo?» (lo que tienen los ambientes del mismo tipo) → «Confirmar y seguir» marca el ambiente revisado (mamb.rv)
   y pasa al siguiente. Escribe solo mamb (estados y rv). Ver docs/ia/matriz.md. */

const MXR={amb:null,only:false,showDone:false};

/* secuencia de obra de cada actividad: cuándo se programa normalmente (mediana del primer día de sus filas en el lookahead);
   sin fechas, al final en el orden del catálogo */
function mxSeq(){const k=MX.v+'|'+DV;if(MXR.seq&&MXR.seqK===k)return MXR.seq;const ali=mxAli();const F=new Map();
  for(const x of S.act.values()){const d=(x.days||[]).length?[...x.days].sort()[0]:null;if(!d)continue;const c=ali.get(mnk(x.name));if(!c)continue;if(!F.has(c))F.set(c,[]);F.get(c).push(d)}
  const seq=new Map();for(const[c,L]of F){L.sort();seq.set(c,L[Math.floor(L.length/2)])}MXR.seq=seq;MXR.seqK=k;return seq}
function mxSeqCmp(a,b){const S2=mxSeq();const x=S2.get(a.id),y=S2.get(b.id);if(x&&y&&x!==y)return x<y?-1:1;if(x&&!y)return-1;if(!x&&y)return 1;return(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name)}

const mxWk0=()=>weekStart(weekOf(todayIso()));
const mxRvTxt=rv=>rv?`${rv.d===todayIso()?'hoy':fmtD(rv.d)}${rv.n?' · '+rv.n:''}`:'';
/* ambientes del recorrido (pisos a la vista), en el orden piso → sector → ambiente */
function mxRecAmbs(){const L=[];for(const r of mxRows())for(const a of r.ambs)L.push({a,p:r.p,s:r.s});return L}

function renderMxRec(main,head){const cells=mxCells();const ed=mxEd();
  if(MXR.amb&&!S.amb.has(MXR.amb))MXR.amb=null;
  if(MXR.amb){renderMxRecAmb(main,head,cells,ed);return}
  const L=mxRecAmbs();const w0=mxWk0();const rv=a=>{const m=MX.amb.get(a.id);return m&&m.rv&&m.rv.d>=w0?m.rv:null};
  const nRv=L.filter(o=>rv(o.a)).length;const vis=MXR.only?L.filter(o=>!rv(o.a)):L;
  let h=`<div class="scroll"><div class="wrap mxwrap">${head}${mxViewSeg()}
   <div class="mxrbar"><div class="mxrprog"><b>${nRv} de ${L.length}</b> ambientes revisados esta semana<span class="mxrpb"><i style="width:${L.length?Math.round(100*nRv/L.length):0}%"></i></span></div>
    <label class="chk"><input type="checkbox" id="mxronly"${MXR.only?' checked':''}> Solo los que faltan</label></div>`;
  let lastS='',lastP='';const multi=visPisos().length>1;
  for(const o of vis){if(multi&&o.p.id!==lastP){h+=`${lastS?'</div>':''}<h3 class="mxrph">${esc(o.p.code)} · ${esc(o.p.name)}</h3>`;lastP=o.p.id;lastS=''}
    if(o.s.id!==lastS){h+=`${lastS?'</div>':''}<div class="mxrsh">${esc(o.s.code)} · ${esc(o.s.name)}</div><div class="mxrgrid">`;lastS=o.s.id}
    const C=Object.values(cells.get(o.a.id)||{});const ap=C.filter(c=>c.s!=='n');const t=ap.filter(c=>c.s==='t').length;const pend=ap.filter(c=>c.s!=='t').length;const sug=C.filter(c=>c.sug).length;
    const r=rv(o.a);const m=MX.amb.get(o.a.id)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);
    h+=`<button class="mxrc${r?' ok':''}" data-mxra="${esc(o.a.id)}"><span class="mxrct"><b>${esc(o.a.code)}</b> ${esc(o.a.name)}</span>
      <span class="mxrcs">${tp?esc(tp.name)+' · ':''}${ap.length?`${Math.round(100*t/ap.length)}% · ${pend} por hacer`:'sin actividades'}${sug?` · ${sug} sin validar`:''}</span>
      <span class="mxrpb sm"><i style="width:${ap.length?Math.round(100*t/ap.length):0}%"></i></span>
      <span class="mxrcr">${r?'✓ Revisado '+esc(mxRvTxt(r)):m.rv?'Última revisión '+esc(mxRvTxt(m.rv)):'Sin revisar'}</span></button>`}
  if(lastS)h+='</div>';if(!vis.length)h+=`<p class="note">${MXR.only&&L.length?'Todos los ambientes ya están revisados esta semana.':'No hay ambientes en este piso.'}</p>`;
  h+='</div></div>';main.innerHTML=h;mxWireV(main);
  const oc=$('#mxronly');if(oc)oc.onchange=()=>{MXR.only=oc.checked;render()};
  main.querySelectorAll('[data-mxra]').forEach(b=>b.onclick=()=>{MXR.amb=b.dataset.mxra;MXR.showDone=false;render();const s=main.querySelector('.scroll');if(s)s.scrollTop=0})}

/* sugerencias: actividades que la mayoría de los ambientes del mismo tipo tienen (o, sin tipo, los del mismo nombre) y este no */
function mxRecSug(amb,cells){const m=MX.amb.get(amb)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);const a=S.amb.get(amb);if(!a)return[];
  const base=s=>mnk(s).replace(/\d+/g,'').replace(/\s+/g,' ').trim();
  const peers=[...S.amb.values()].filter(x=>x.id!==amb&&(tp?(MX.amb.get(x.id)||{}).tipo===tp.id:base(x.name)===base(a.name)));if(!peers.length)return[];
  const have=cells.get(amb)||{};const cnt=new Map();for(const p of peers)for(const[c,o]of Object.entries(cells.get(p.id)||{}))if(o.s!=='n')cnt.set(c,(cnt.get(c)||0)+1);
  /* hasta 5: las que más tienen los ambientes parecidos (al menos 1 de cada 4) */
  return[...cnt].filter(([c,n])=>!have[c]&&n/peers.length>=0.25&&MX.cat.has(c)&&!MX.cat.get(c).arch).sort((x,y)=>y[1]-x[1]).slice(0,5)
    .map(([c,n])=>({c:MX.cat.get(c),n,of:peers.length,lbl:tp?tp.name:base(a.name)}))}

/* «+ Otra actividad»: buscar en el catálogo y agregarla a este ambiente como pendiente (el SC, solo su partida) */
function mxRecPick(amb,ed,add){const have=(mxCells().get(amb)||{});const L=[...MX.cat.values()].filter(c=>!c.arch&&!have[c.id]&&(ed||mxScCan(c)))
    .sort((x,y)=>conOf(x.sc).name.localeCompare(conOf(y.sc).name)||x.name.localeCompare(y.name));
  const a=S.amb.get(amb);const li=q=>{const k=mnk(q||'');const F=L.filter(c=>!k||mnk(c.name+' '+conOf(c.sc).name).includes(k)).slice(0,80);
    return(F.length?F.map(c=>`<button class="mxpk" data-mxpk="${esc(c.id)}"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span><span><b>${esc(c.name)}</b><small>${esc(conOf(c.sc).name)}</small></span></button>`).join(''):'<p class="note">No está en el catálogo.</p>')
      +`<button class="mxpk mxpkn" data-mxpknew><span class="mxpkp">＋</span><span><b>${q&&q.trim()?`Crear «${esc(q.trim())}» en el catálogo`:'Nueva actividad en el catálogo'}</b><small>Se agrega al catálogo y a este ambiente${ed?'':'; el ingeniero la revisará'}</small></span></button>`};
  lqModal(`<div class="lqtop"><b>Agregar actividad a ${esc(a?a.code+' · '+a.name:'')}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    <input class="tin" id="mxpq" type="search" placeholder="Buscar actividad o subcontratista" aria-label="Buscar en el catálogo" style="width:100%;box-sizing:border-box">
    <div class="mxpkl" id="mxpkl">${li('')}</div><div class="lqbtns"><button class="ib" data-lqx>Cerrar</button></div>`,
    e=>{if(e.target.closest('[data-mxpknew]')){const v=($('#mxpq')||{}).value||'';lqClose();mxRecNew(amb,ed,v.trim(),add);return}const b=e.target.closest('[data-mxpk]');if(b){lqClose();add(b.dataset.mxpk)}});
  const q=$('#mxpq');if(q){q.oninput=()=>{$('#mxpkl').innerHTML=li(q.value)};setTimeout(()=>q.focus(),50)}}

/* crear la actividad en el catálogo desde el Recorrido y agregarla a este ambiente (pendiente). Mismas reglas que desde el lookahead:
   el ingeniero la crea directo; el SC también, en su partida, y queda «por revisar» (rev). Opcional: al tipo del ambiente (solo ingeniero). */
async function mxRecNew(amb,ed,v,add){const tp=await mxAmbTipo(amb);const sc0=ed?(mxSel()[0]||''):(myScsI()[0]||'');
  const scOpts=ed?mxScOpts(sc0):myScsI().map(id=>`<option value="${esc(id)}">${esc(conOf(id).name)}</option>`).join('');
  const sim=v?mxSimilar(v,sc0).filter(c=>ed||mxScCan(c)):[];const have=mxCells().get(amb)||{};
  lqModal(`<div class="lqtop"><b>Nueva actividad en el catálogo</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   ${sim.length?`<div class="ph">¿Es alguna de estas?</div><div class="mxsim">${sim.map(c=>`<button class="ib" data-mxuse="${esc(c.id)}"${have[c.id]?' disabled title="Ya está en este ambiente"':''}><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span>${esc(c.name)} <small class="note">${esc(conOf(c.sc).name)}</small></button>`).join('')}</div>`:''}
   <div class="mxform"><label>Nombre<input class="tin" id="mxrnn" value="${esc(v)}" placeholder="p. ej. Instalación de espejos"></label><label>Subcontratista<select id="mxrnsc">${scOpts}</select></label><label>Clase<select id="mxrncl">${mxClOpts('t')}</select></label><label>Especialidad<select id="mxrnesp">${mxEspOpts(mxEspOf(sc0))}</select></label></div>
   ${tp&&ed?`<label class="mxur"><input type="checkbox" id="mxrntp"><span><b>Agregar también a todos los ambientes del tipo «${esc(tp.name)}»${tp.n!=null?` (${tp.n})`:''}</b><small>Si no, queda solo en este ambiente.</small></span></label>`:`<p class="note">Se agrega solo a este ambiente.${ed?'':' El ingeniero la revisará (nombre, clase, tipo).'}</p>`}
   <p class="note" id="mxrnmsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxrnok">Crear y agregar</button></div>`,
   async e=>{const u=e.target.closest('[data-mxuse]');if(u&&!u.disabled){lqClose();add(u.dataset.mxuse);return}
     const ok=e.target.closest('#mxrnok');if(!ok)return;const name=$('#mxrnn').value.replace(/\s+/g,' ').trim();if(!name){$('#mxrnmsg').textContent='Escribe el nombre.';return}
     const dup=mxAli().get(mnk(name));if(dup&&MX.cat.has(dup)&&!MX.cat.get(dup).arch){const d=MX.cat.get(dup);if(have[dup]){$('#mxrnmsg').textContent=`«${d.name}» ya existe y ya está en este ambiente.`;return}lqClose();add(dup);toast(`Ya existía «${d.name}»: agregada a este ambiente`);return}
     const ord=Math.max(0,...[...MX.cat.values()].map(c=>c.ord||0))+10;const id='k'+NOW().toString(36);const toT=!!(tp&&ed&&$('#mxrntp')&&$('#mxrntp').checked);
     const c={id,name,sc:$('#mxrnsc').value,cl:$('#mxrncl').value,esp:$('#mxrnesp').value==='__new'?'':$('#mxrnesp').value,al:[mnk(name)],ord};
     if(!ed)c.rev={by:me.email,n:me.name||'',t:NOW(),amb,tipo:null};ok.disabled=true;
     try{await fcol('mcat').doc(id).set({...c,...mxNow()});if(toT)await mxTipoAdd(tp.id,id);MX.cat.set(id,c);MX.v++;lqClose();add(id);
       toast(ed?(toT?`Creada en el catálogo y en el tipo «${tp.name}»`:'Creada en el catálogo y agregada a este ambiente'):'Creada en el catálogo: el ingeniero la revisará')}catch(err){ok.disabled=false;mxErr(err)}},
   async e=>{if(e.target.id==='mxrncl'&&e.target.value==='e'){const c=$('#mxrntp');if(c)c.checked=false}
     if(e.target.id==='mxrnsc'){const es=$('#mxrnesp');const d=mxEspOf(e.target.value);if(es&&d){if(![...es.options].some(o=>o.value===d))es.insertAdjacentHTML('afterbegin',`<option value="${esc(d)}">${esc(d)}</option>`);es.value=d}}
     if(e.target.id==='mxrnesp'&&e.target.value==='__new')await mxEspPick(e.target,'')})}

function renderMxRecAmb(main,head,cells,ed){const id=MXR.amb;const a=S.amb.get(id);const m=MX.amb.get(id)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);
  const C=cells.get(id)||{};const items=Object.entries(C).map(([c,o])=>({c:MX.cat.get(c),o})).filter(r=>r.c).sort((x,y)=>mxSeqCmp(x.c,y.c));
  const open=items.filter(r=>r.o.s!=='t'&&r.o.s!=='n'),done=items.filter(r=>r.o.s==='t'||r.o.s==='n');let sug=mxRecSug(id,cells);
  const L=mxRecAmbs();const ix=L.findIndex(o=>o.a.id===id);const nx=L[ix+1];const w0=mxWk0();const rvOk=m.rv&&m.rv.d>=w0;const nSug=items.filter(r=>r.o.sug).length;
  const T=todayIso();
  const info=r=>{const xs=r.o.acts.map(i=>S.act.get(i)).filter(Boolean);const nd=xs.flatMap(x=>(x.days||[]).filter(d=>d>=T)).sort()[0];const dn=xs.map(x=>DONE.get(x.id)).filter(Boolean).sort().pop();
    return[dn?`terminada en Campo ${fmtD(dn)}`:'',nd?`programada ${fmtD(nd)}`:'',r.o.sug?'propuesta del sistema':''].filter(Boolean).join(' · ')};
  const canR=r=>ed||mxScCan(r.c);
  const row=r=>`<div class="mxri${r.o.sug?' sug':''}" data-mxrc="${esc(r.c.id)}"><div class="mxrin"><span class="mxsw" style="--c:${esc(conOf(r.c.sc).color)}"></span><span><b>${esc(r.c.name)}</b><small>${esc(conOf(r.c.sc).name)}${info(r)?' · '+esc(info(r)):''}</small></span></div>
    <div class="mxrbt" role="group" aria-label="Estado de ${esc(r.c.name)}">${['p','c','t','n'].map(s=>`<button class="mc s-${s}${r.o.s===s?' on':''}${r.o.s===s&&r.o.sug?' sug':''}" data-mxrs="${s}"${canR(r)?'':' disabled'} aria-pressed="${r.o.s===s}"><i>${MXI[s]||'○'}</i>${MXS[s]}</button>`).join('')}</div></div>`;
  let h=`<div class="scroll"><div class="wrap mxwrap mxrw">${head}${mxViewSeg()}
   <div class="mxrhd"><button class="ib" id="mxrback">← Lista</button><div><h3>${esc(a.code)} · ${esc(a.name)}</h3><span class="note">${esc((secOf(a.sectorId)||{}).name||'')}${tp?' · '+esc(tp.name):''} · ${rvOk?'✓ revisado '+esc(mxRvTxt(m.rv)):m.rv?'última revisión '+esc(mxRvTxt(m.rv)):'sin revisar'}</span></div></div>
   ${open.length?`<div class="mxrl">${open.map(row).join('')}</div>`:'<p class="callout">Todo lo de este ambiente está terminado o no aplica.</p>'}
   ${done.length?`<details class="mxrdone"${MXR.showDone?' open':''}><summary>Terminadas o que no aplican (${done.length})</summary><div class="mxrl">${done.map(row).join('')}</div></details>`:''}
   ${(sug=sug.filter(x=>ed||mxScCan(x.c))),(ed||SCK())?`<div class="mxrsug"><div class="mxrsq"><b>¿Falta algo?</b><button class="ib" id="mxrpick">+ Otra actividad</button></div>${sug.length?sug.map(s=>`<div class="mxri"><div class="mxrin"><span class="mxsw" style="--c:${esc(conOf(s.c.sc).color)}"></span><span><b>${esc(s.c.name)}</b><small>${esc(conOf(s.c.sc).name)} · ${s.n} de ${s.of} ${esc(s.lbl)} la tienen</small></span></div><button class="ib" data-mxradd="${esc(s.c.id)}">+ Agregar</button></div>`).join(''):'<p class="note">Sin sugerencias: los ambientes parecidos no tienen otras actividades. Usa «+ Otra actividad» para buscar en el catálogo.</p>'}</div>`:''}
   </div></div>
   <div class="mxrfoot">${ed?`<button class="ib pri" id="mxrok">✓ Confirmar${nSug?` (${nSug} sin validar quedan como están)`:''}${nx?' y seguir →':''}</button>`:''}${nx?`<button class="ib" id="mxrnext">Siguiente sin confirmar →</button>`:''}</div>`;
  main.innerHTML=h;mxWireV(main);
  $('#mxrback').onclick=()=>{MXR.amb=null;render()};
  const go=n=>{MXR.amb=n?n.a.id:null;MXR.showDone=false;render();const s=main.querySelector('.scroll');if(s)s.scrollTop=0};
  const nb=$('#mxrnext');if(nb)nb.onclick=()=>go(nx);
  const ok=$('#mxrok');if(ok)ok.onclick=async()=>{const c={};for(const r of items)if(r.o.sug)c[r.c.id]=r.o.s;
    const rv={d:todayIso(),t:NOW(),by:me.email,n:me.name||''};ok.disabled=true;
    try{await fcol('mamb').doc(id).set({...(Object.keys(c).length?{c,m:mxMeta(c)}:{}),rv,by:me.email,n:me.name||'',t:NOW()},{merge:true});toast(`${a.code} revisado`);go(nx)}catch(e){ok.disabled=false;toast('No se pudo guardar: '+(e&&e.code||e))}};
  const dt=main.querySelector('.mxrdone');if(dt)dt.ontoggle=()=>{MXR.showDone=dt.open};
  main.querySelectorAll('[data-mxrs]').forEach(b=>b.onclick=()=>{const cid=b.closest('[data-mxrc]').dataset.mxrc;const s=b.dataset.mxrs;if(!ed){if(mxScCan(MX.cat.get(cid)))mxScSet(id,cid,s);return}const prev=((MX.amb.get(id)||{}).c||{})[cid];if(prev===s)return;
    const DEL=firebase.firestore.FieldValue.delete();mxWrite(new Map([[id,{[cid]:s}]]),`${MX.cat.get(cid).name}: ${MXS[s]}`,new Map([[id,{[cid]:prev===undefined?DEL:prev}]]))});
  const addC=cid=>{if(!ed){mxScSet(id,cid,'p');return}const DEL=firebase.firestore.FieldValue.delete();
    mxWrite(new Map([[id,{[cid]:'p'}]]),`Agregada: ${MX.cat.get(cid).name} (pendiente)`,new Map([[id,{[cid]:DEL}]]))};
  main.querySelectorAll('[data-mxradd]').forEach(b=>b.onclick=()=>addC(b.dataset.mxradd));
  const pk=$('#mxrpick');if(pk)pk.onclick=()=>mxRecPick(id,ed,addC)}
