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
  const peers=[...S.amb.values()].filter(x=>x.id!==amb&&(tp?(MX.amb.get(x.id)||{}).tipo===tp.id:base(x.name)===base(a.name)));if(peers.length<2)return[];
  const have=cells.get(amb)||{};const cnt=new Map();for(const p of peers)for(const[c,o]of Object.entries(cells.get(p.id)||{}))if(o.s!=='n')cnt.set(c,(cnt.get(c)||0)+1);
  return[...cnt].filter(([c,n])=>!have[c]&&n/peers.length>=0.5&&MX.cat.has(c)&&!MX.cat.get(c).arch).sort((x,y)=>y[1]-x[1]).slice(0,5)
    .map(([c,n])=>({c:MX.cat.get(c),n,of:peers.length,lbl:tp?tp.name:base(a.name)}))}

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
   ${(sug=sug.filter(x=>ed||mxScCan(x.c))).length?`<details class="mxrsug"><summary>¿Falta algo? ${sug.length} ${sug.length===1?'sugerencia':'sugerencias'}</summary>${sug.map(s=>`<div class="mxri"><div class="mxrin"><span class="mxsw" style="--c:${esc(conOf(s.c.sc).color)}"></span><span><b>${esc(s.c.name)}</b><small>${esc(conOf(s.c.sc).name)} · ${s.n} de ${s.of} ${esc(s.lbl)} la tienen</small></span></div><button class="ib" data-mxradd="${esc(s.c.id)}">+ Agregar</button></div>`).join('')}</details>`:''}
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
  main.querySelectorAll('[data-mxradd]').forEach(b=>b.onclick=()=>{const cid=b.dataset.mxradd;if(!ed){mxScSet(id,cid,'p');return}const DEL=firebase.firestore.FieldValue.delete();
    mxWrite(new Map([[id,{[cid]:'p'}]]),`Agregada: ${MX.cat.get(cid).name} (pendiente)`,new Map([[id,{[cid]:DEL}]]))})}
