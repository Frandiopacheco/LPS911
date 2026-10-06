"use strict";
/* LPS 911 · Módulo Tareo (fase 2): bandeja del asistente de tareo (rol tasis; también admin).
   Contrato en docs/ia/tareo.md («Contrato de F2»): revisión de un tareo (cotejo de firmas con la foto, hora de garita,
   corrección directa con motivo, marcar/quitar revisado, reabrir) y, en «Tareos del día», sin tareo, duplicados y no enviados.
   El jefe de producción (editor con tpub) ve el mismo detalle en solo lectura.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* ---------- funciones puras ---------- */
const trNm=r=>r&&(r.ape||r.nom)?[r.ape,r.nom].filter(Boolean).join(', '):'';
/** observaciones de la revisión: las de tValida (bloquean «Marcar revisado») más el cotejo de firmas y la garita.
    k: los de tValida · 'firp' firma sin cotejar (bloquea) · 'nofir' vino y no firmó · 'gar' salida en garita distinta. bl = bloquea. */
function tObsRev(doc,calc){const d=doc||{};const c=calc||tCalc(d);const out=tValida(d).map(o=>({...o,bl:true}));const tol=TC().tolGar;
  for(const[dni,r]of Object.entries(c.rows||{})){if(!r.as)continue;const n=trNm(r)||dni;
    if(r.fir===false)out.push({dni,k:'nofir',bl:false,msg:`${n}: vino pero no firmó el formato.`});
    else if(r.fir!==true)out.push({dni,k:'firp',bl:true,msg:`${n}: falta cotejar su firma.`});
    const g=tMin(r.gar),f=tMin(r.fin);if(g!=null&&f!=null&&Math.abs(g-f)>tol)out.push({dni,k:'gar',bl:false,msg:`${n}: salida en garita distinta (garita ${r.gar}, tareo ${r.fin}).`})}
  return out}
/** obreros presentes en más de un tareo del día: [{dni, nom, caps:[nombre…]}] */
function tDups(docs){const by=new Map();
  for(const t of docs){if(!t||t.arch)continue;for(const[dni,r]of Object.entries(t.rows||{})){if(!r||!r.as)continue;const L=by.get(dni)||[];L.push({t,r});by.set(dni,L)}}
  return[...by].filter(([,L])=>L.length>1).map(([dni,L])=>({dni,nom:trNm(L[0].r)||dni,caps:L.map(x=>x.t.capN||tCapName(x.t.cap)||x.t.cap)})).sort((a,b)=>a.nom.localeCompare(b.nom))}
/** obreros activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta), agrupados por capataz */
function tSinTareo(f,docs){const inT=new Set();for(const t of docs){if(!t||t.arch)continue;for(const k of Object.keys(t.rows||{}))inT.add(k)}
  const g=new Map();for(const p of tLive()){const k=p.dni||p.id;if(!tActivo(p,f)||inT.has(k))continue;const c=p.cap||'';const L=g.get(c)||[];L.push(p);g.set(c,L)}
  for(const L of g.values())L.sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||(a.dni||'').localeCompare(b.dni||''));
  return[...g].map(([cap,L])=>({cap,name:cap?tCapName(cap):'Sin capataz',L})).sort((a,b)=>(!a.cap)-(!b.cap)||a.name.localeCompare(b.name))}
/** ¿ya pasó la hora límite de envío para esa fecha? (días anteriores sí; hoy según TC().limEnv; no laborable no) */
function tLate(f){if(tNoLab(f))return false;const hoy=todayIso();if(f<hoy)return true;if(f>hoy)return false;return tHm(NOW())>=TC().limEnv}
/** resumen corto de lo que cambió una corrección (para hist.cam) */
function tCam(a,b){const o=[];const pc=x=>{const p=x&&S.tpc.get(x);return p?p.cod:(x||'sin partida')};
  const ra=a.rows||{},rb=b.rows||{};const nm=d=>((rb[d]||ra[d]||{}).ape||d);
  const A=new Map((a.blq||[]).map(x=>[x.id,x])),B=new Map((b.blq||[]).map(x=>[x.id,x]));
  for(const[id,x]of B){const y=A.get(id);const lb=`${pc(x.pc)} ${x.ini}–${x.fin}`;
    if(!y){o.push(`+ bloque ${lb} (${(x.dnis||[]).length})`);continue}
    const ch=[];if(y.pc!==x.pc)ch.push(`partida ${pc(y.pc)} → ${pc(x.pc)}`);if(y.ini!==x.ini||y.fin!==x.fin)ch.push(`${y.ini}–${y.fin} → ${x.ini}–${x.fin}`);
    const ya=new Set(y.dnis||[]),xa=new Set(x.dnis||[]);const add=[...xa].filter(d=>!ya.has(d)),rm=[...ya].filter(d=>!xa.has(d));
    if(add.length)ch.push('+'+add.map(nm).join(', +'));if(rm.length)ch.push('−'+rm.map(nm).join(', −'));
    if(ch.length)o.push(`bloque ${pc(y.pc)}: ${ch.join('; ')}`)}
  for(const[id,y]of A)if(!B.has(id))o.push(`− bloque ${pc(y.pc)} ${y.ini}–${y.fin}`);
  for(const d of Object.keys(rb)){const x=rb[d],y=ra[d]||{};
    if(!!x.as!==!!y.as)o.push(`${nm(d)}: ${x.as?'vino':'faltó ('+(x.mot||'?')+')'}`);else if(!x.as&&x.mot!==y.mot)o.push(`${nm(d)}: motivo ${y.mot||'?'} → ${x.mot||'?'}`);
    if(x.as&&!!x.alt!==!!y.alt)o.push(`${nm(d)}: altura ${x.alt?'sí':'no'}`)}
  const s=o.join('; ');return s.length>400?s.slice(0,397)+'…':s}
/* quita los undefined (Firestore no los acepta) */
function trClean(rows){const o={};for(const[d,r]of Object.entries(rows||{})){const x={};for(const[k,v]of Object.entries(r||{}))if(v!==undefined)x[k]=v;o[d]=x}return o}

/* ---------- estado del detalle abierto ---------- */
/* id: tareo abierto · fir/gar: cotejo en edición (empieza con lo guardado) · dirty: hay cotejo sin guardar · ed: corrección en curso · visor de la foto */
const TR={id:'',fir:{},gar:{},dirty:false,ed:null,fi:0,z:1,rot:0,busy:false};
const trEdOk=()=>toReabOk();
function trInit(t){TR.fir={};TR.gar={};for(const[d,r]of Object.entries(t.rows||{})){if(r&&(r.fir===true||r.fir===false))TR.fir[d]=r.fir;if(r&&r.gar)TR.gar[d]=r.gar}TR.dirty=false}
/** filas con el cotejo en edición aplicado */
function trRows(rows){const o={};for(const[d,r0]of Object.entries(rows||{})){const r={...r0};
  if(Object.prototype.hasOwnProperty.call(TR.fir,d))r.fir=TR.fir[d];else delete r.fir;if(TR.gar[d])r.gar=TR.gar[d];else delete r.gar;o[d]=r}return o}
function trCotCam(cur){const R=cur.rows||{};let si=0;const no=[],gar=[];
  for(const[d,r]of Object.entries(R)){if(!r.as)continue;const f=Object.prototype.hasOwnProperty.call(TR.fir,d)?TR.fir[d]:undefined;
    if(f!==r.fir){if(f===true)si++;else if(f===false)no.push(r.ape||d)}
    if((TR.gar[d]||'')!==(r.gar||''))gar.push(`${r.ape||d} ${TR.gar[d]||'—'}`)}
  const o=[];if(si)o.push(`firmaron ${si}`);if(no.length)o.push(`no firmó: ${no.join(', ')}`);if(gar.length)o.push(`garita: ${gar.join(', ')}`);return o.join('; ')}
const trHist=(a,x)=>({t:NOW(),by:me.email||me.id||'',a,...x});
/* escritura con transacción: fn(doc actual) → objeto de update, o lanza un Error con el motivo para el usuario */
async function trTx(id,fn){const ref=fcol('tareo').doc(id);
  return(db||FDB).runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new Error('El tareo ya no existe.');const up=fn(s.data());tx.update(ref,up);return true})}
const trErr=(p,e)=>toast(p+(e&&(e.code?e.code:e.message)||''));

/* ---------- detalle / revisión de un tareo ---------- */
function toDetalle(id){const t=TD.docs.get(id);if(!t)return;if(TR.id!==id){Object.assign(TR,{id,ed:null,fi:0,z:1,rot:0,busy:false});trInit(t)}trDraw();
  const lc=$('#lqm .lqc');if(lc)lc.classList.add('lqwide');toFotos(id,t.foto||[])}
/* al llegar datos con el detalle abierto: refresca (sin pisar el cotejo o la corrección en curso) */
function trSync(){if(!TR.id||!$('#lqm .tr-root'))return;const t=TD.docs.get(TR.id);if(!t)return;if(!TR.dirty&&!TR.ed)trInit(t);trDraw()}
function trDraw(){const id=TR.id;const t=TD.docs.get(id);if(!t)return;
  lqModal(trHtml(t),e=>trClick(e,id),e=>trChange(e,id));const lc=$('#lqm .lqc');if(lc)lc.classList.add('lqwide','tr-lqc');trView()}
function trHtml(t){const ed=trEdOk();const cot=ed&&t.st==='env'&&!TR.ed;const dv={...t,rows:trRows(t.rows)};const s=toStats(dv);const c=s.c;
  const ob=tObsRev(dv,c);const vis=ob.filter(o=>o.k!=='firp');const pend=ob.filter(o=>o.k==='firp').length;
  const R=Object.entries(c.rows).map(([dni,r])=>({...r,dni})).sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||a.dni.localeCompare(b.dni));
  const P=R.filter(r=>r.as);const nm=r=>trNm(r)||r.dni;const oDni=new Map();for(const o of ob)if(o.dni&&o.k!=='firp'){oDni.set(o.dni,(oDni.get(o.dni)||[]).concat(o.k))}
  const fotos=t.foto||[];const fi=Math.min(TR.fi,Math.max(0,fotos.length-1));
  const head=`<div class="lqtop tr-root"><b>Tareo de ${esc(t.capN||tCapName(t.cap))}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <div class="lqh"><span>${esc(toDia(t.date))}</span>${toChip(t)}<span>${s.pres} vinieron · ${s.fal} ${s.fal===1?'falta':'faltas'} · ${toH(s.hh)} HH · ${toH(s.he)} HE${s.alt?` · ${s.alt} en altura`:''}</span></div>
   ${t.st==='reab'&&t.reab?`<div class="callout t-warn">Reabierto por ${esc(toWho(t.reab.by))} a las ${esc(tHm(t.reab.t))}: ${esc(t.reab.mot||'')}</div>`:''}
   ${t.st==='rev'&&t.revBy?`<div class="callout tr-okc">Revisado por ${esc(toWho(t.revBy))}${t.revAt?' a las '+esc(tHm(t.revAt)):''}.</div>`:''}`;
  if(TR.ed)return head+trEdHtml(t);
  const obs=vis.length?`<div class="callout t-warn to-obs" id="trObs"><b>${vis.length} ${vis.length===1?'observación':'observaciones'}</b><ul>${vis.map(o=>`<li data-k="${esc(o.k)}">${esc(o.msg)}</li>`).join('')}</ul></div>`:'';
  /* visor de la foto + cotejo */
  const viewer=`<section class="tr-foto"><div class="tr-vbar"><b>Formato firmado</b><span class="tr-vbtn">
     ${fotos.length>1?`<button class="ib" data-trv="prev" aria-label="Foto anterior">‹</button><span class="note">${fi+1} de ${fotos.length}</span><button class="ib" data-trv="next" aria-label="Foto siguiente">›</button>`:''}
     <button class="ib" data-trv="zo" aria-label="Alejar">−</button><button class="ib" data-trv="zi" aria-label="Acercar">+</button><button class="ib" data-trv="rot" aria-label="Rotar" title="Rotar">⟳</button>${fotos.length?`<button class="ib" data-trv="full" aria-label="Pantalla completa" title="Pantalla completa">⛶</button>`:''}</span></div>
    <div class="tr-view" id="trView">${fotos.length?`<img id="trImg" alt="Formato firmado"${TD.fotos.has(fotos[fi])?` src="${esc(TD.fotos.get(fotos[fi]))}"`:''}>`:'<span class="note">Sin foto.</span>'}</div>
    <div class="to-fotos tr-thumbs" id="toFotos">${fotos.map(fid=>`<button class="to-ft" data-tft="${esc(fid)}" aria-label="Ampliar foto">${TD.fotos.has(fid)?`<img src="${esc(TD.fotos.get(fid))}" alt="Formato firmado">`:'<span class="note">Cargando…</span>'}</button>`).join('')}</div></section>`;
  const nCot=P.filter(r=>r.fir===true||r.fir===false).length;
  const firCell=r=>{if(cot)return`<span class="seg tr-fir"><button data-tra="fir" data-v="1" class="${r.fir===true?'on':''}" aria-pressed="${r.fir===true}">Sí</button><button data-tra="fir" data-v="0" class="${r.fir===false?'on':''}" aria-pressed="${r.fir===false}">No</button></span>`;
    return r.fir===true?'<span class="tr-si">Sí</span>':r.fir===false?'<span class="tr-no">No firmó</span>':'<span class="note">—</span>'};
  const garCell=r=>cot?`<input class="tin tr-gar" type="time" step="60" id="trg_${esc(r.dni)}" data-trg="${esc(r.dni)}" value="${esc(r.gar||'')}" aria-label="Salida en garita">`:`<span class="mono">${esc(r.gar||'')}</span>`;
  const cotejo=`<section class="tr-cot"><div class="tr-vbar"><b>Cotejo de firmas</b><span class="note" id="trCotN">${nCot} de ${P.length} cotejados</span>${cot&&P.length?`<button class="ib" data-tra="all" id="trAll">Todos firmaron</button>`:''}</div>
    <div class="tscroll"><table class="t tr-ct"><thead><tr><th>Obrero</th><th>Horario</th><th>Firmó</th><th title="Hora de salida en garita (opcional)">Garita</th></tr></thead>
    <tbody>${P.map(r=>{const k=oDni.get(r.dni)||[];return`<tr data-trd="${esc(r.dni)}" class="${k.includes('nofir')?'tr-bad':''}${k.includes('gar')?' tr-wgar':''}"><td><b>${esc(r.ape||r.dni)}</b> <small class="note">${esc(r.nom||'')} · ${esc(r.dni)}</small></td><td class="mono">${r.ini?esc(r.ini)+'–'+esc(r.fin):''} <small class="note">${toH(r.trab)} h</small></td><td>${firCell(r)}</td><td>${garCell(r)}</td></tr>`}).join('')||'<tr><td colspan="4" class="note">Nadie marcado como presente.</td></tr>'}</tbody></table></div>
    ${cot&&pend?`<p class="note tr-pend">Falta cotejar ${pend} ${pend===1?'firma':'firmas'}.</p>`:''}</section>`;
  /* matriz, faltas, bloques e historial (como en F1) */
  const pcL=pc=>{const p=S.tpc.get(pc);return p?{cod:p.cod,nom:p.nom}:{cod:pc,nom:'(partida no encontrada)'}};
  const pcs=[...new Set([...(t.blq||[]).map(b=>b&&b.pc),...Object.values(c.rows).flatMap(r=>Object.keys(r.h||{}))].filter(Boolean))].sort((a,b)=>tCmpCod(pcL(a).cod,pcL(b).cod));
  const F=R.filter(r=>!r.as);const tot={};for(const r of P)for(const[pc,v]of Object.entries(r.h||{}))tot[pc]=tR2((tot[pc]||0)+v);
  const rn=dni=>{const r=c.rows[dni];return r?(r.ape||dni):dni};
  const hist=(Array.isArray(t.hist)?t.hist:[]).slice().sort((a,b)=>(a.t||0)-(b.t||0));
  const blk=ob.filter(o=>o.bl);const nofir=ob.filter(o=>o.k==='nofir');
  const btn=[];if(ed){
    if(t.st==='env'){if(TR.dirty)btn.push(`<button class="ib" data-tra="save" id="trSave">Guardar cotejo</button>`);
      btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`,
        `<button class="ib pri" data-tra="rev" id="trRev"${blk.length?` disabled title="${esc(blk.map(o=>o.msg).join('\n'))}"`:''}>Marcar revisado${nofir.length?' (con observación)':''}</button>`)}
    else if(t.st==='rev')btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" data-tra="qrev" id="trQrev">Quitar revisado</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`)}
  return head+obs+`<div class="tr-grid">${viewer}${cotejo}</div>
   <b class="t-h3">Horas por partida</b>
   <div class="tscroll to-mx"><table class="t to-mxt"><thead><tr><th>Obrero</th><th>Cat.</th>${pcs.map(pc=>{const p=pcL(pc);return`<th class="t-r" title="${esc(p.nom)}">${esc(p.cod)}</th>`}).join('')}<th class="t-r">Total</th><th class="t-r">HE</th><th>Horario</th><th title="Trabajo en altura (bono)">A</th></tr></thead>
    <tbody>${P.map(r=>`<tr data-dni="${esc(r.dni)}"><td><span class="to-nm">${esc(nm(r))}</span> <small class="mono note">${esc(r.dni)}</small></td><td>${esc(r.cat||'')}</td>${pcs.map(pc=>`<td class="mono t-r">${r.h&&r.h[pc]?toH(r.h[pc]):''}</td>`).join('')}<td class="mono t-r"><b>${toH(r.trab)}</b></td><td class="mono t-r">${r.ext?toH(r.ext):''}</td><td class="mono">${r.ini?esc(r.ini)+'–'+esc(r.fin):''}</td><td>${r.alt?'(A)':''}</td></tr>`).join('')||`<tr><td colspan="${pcs.length+6}" class="note">Nadie marcado como presente.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="2"><b>Total</b></td>${pcs.map(pc=>`<td class="mono t-r"><b>${toH(tot[pc])}</b></td>`).join('')}<td class="mono t-r"><b>${toH(s.hh)}</b></td><td class="mono t-r"><b>${toH(s.he)}</b></td><td colspan="2"></td></tr></tfoot></table></div>
   ${F.length?`<b class="t-h3">Faltas</b><ul class="t-list to-fal">${F.map(r=>`<li>${esc(nm(r))} <span class="mono note">${esc(r.dni)}</span> · <b>${esc(r.mot||'sin motivo')}</b>${r.mot&&TO_MOT[r.mot]?' '+esc(TO_MOT[r.mot]):''}</li>`).join('')}</ul>`:''}
   <b class="t-h3">Bloques</b>${(t.blq||[]).length?`<ul class="t-list to-blq">${t.blq.map(b=>{b=b||{};const p=b.pc?pcL(b.pc):null;const n=Array.isArray(b.dnis)?b.dnis:[];
     return`<li><span class="mono">${esc(b.ini||'?')}–${esc(b.fin||'?')}</span> · ${p?`<b class="mono">${esc(p.cod)}</b> ${esc(p.nom)}`:'<i>sin partida</i>'} · ${n.length} ${n.length===1?'obrero':'obreros'}${tBlqOk(b)?` · ${toH(tBlqH(t.date,b.ini,b.fin))} h`:''}<div class="t-chg">${n.map(d=>esc(rn(d))).join(', ')}</div></li>`}).join('')}</ul>`:'<p class="note">Sin bloques.</p>'}
   ${hist.length?`<b class="t-h3">Historial</b><ul class="t-list to-hist" id="trHist">${hist.map(x=>`<li data-a="${esc(x.a||'')}"><span class="mono">${esc(fmtD(ldt(x.t||0)))} ${esc(tHm(x.t))}</span> · <b>${esc(TO_HA[x.a]||x.a||'')}</b> · ${esc(toWho(x.by))}${x.mot?': '+esc(x.mot):''}${x.cam?`<div class="t-chg">${esc(x.cam)}</div>`:''}</li>`).join('')}</ul>`:''}
   ${btn.length?`<div class="lqbtns tr-btns">${btn.join('')}</div>`:''}`}
/* visor: aplica zoom y giro a la imagen sin redibujar */
function trView(){const im=$('#trImg');if(!im)return;const t=TD.docs.get(TR.id);const fid=t&&(t.foto||[])[Math.min(TR.fi,(t.foto||[]).length-1)];
  if(fid&&TD.fotos.has(fid)&&im.getAttribute('src')!==TD.fotos.get(fid))im.src=TD.fotos.get(fid);
  im.style.width=(TR.z*100)+'%';im.style.transform=TR.rot?`rotate(${TR.rot}deg)`:'';im.dataset.rot=String(TR.rot);im.dataset.z=String(TR.z)}

function trClick(e,id){const v=e.target.closest('[data-trv]');if(v){const t=TD.docs.get(id);const n=(t&&t.foto||[]).length;const a=v.dataset.trv;
    if(a==='zi')TR.z=Math.min(4,TR.z+0.5);else if(a==='zo')TR.z=Math.max(1,TR.z-0.5);else if(a==='rot')TR.rot=(TR.rot+90)%360;
    else if(a==='full'){const fid=n&&t.foto[Math.min(TR.fi,n-1)];if(fid)toZoom(fid);return}
    else if(n){TR.fi=(TR.fi+(a==='next'?1:-1)+n)%n;TR.z=1;TR.rot=0;trDraw();return}trView();return}
  const f=e.target.closest('[data-tft]');if(f){toZoom(f.dataset.tft);return}
  const b=e.target.closest('[data-tra]');if(!b||b.disabled)return;const a=b.dataset.tra;
  if(a==='fir'){const tr=b.closest('[data-trd]');if(!tr)return;const d=tr.dataset.trd;const val=b.dataset.v==='1';
    if(TR.fir[d]===val)delete TR.fir[d];else TR.fir[d]=val;TR.dirty=true;trDraw();return}
  if(a==='all'){const t=TD.docs.get(id);for(const[d,r]of Object.entries(t.rows||{}))if(r&&r.as)TR.fir[d]=true;TR.dirty=true;trDraw();return}
  if(a==='save')return trSaveCot(id);
  if(a==='rev')return trRevisar(id);
  if(a==='qrev')return trQuitarRev(id);
  if(a==='reab')return toReabrir(id);
  if(a==='cor'){const t=TD.docs.get(id);TR.ed={blq:JSON.parse(JSON.stringify(Array.isArray(t.blq)?t.blq:[])).map(x=>({id:x.id||trBid(),pc:x.pc||'',ini:x.ini||'',fin:x.fin||'',dnis:Array.isArray(x.dnis)?x.dnis:[]})),
    rows:Object.fromEntries(Object.entries(t.rows||{}).map(([d,r])=>[d,{as:!!r.as,mot:r.mot||'',alt:!!r.alt}]))};trDraw();return}
  if(TR.ed)return trEdClick(a,b,id)}
function trChange(e,id){const g=e.target.closest('[data-trg]');if(g){const v=/^\d{2}:\d{2}/.test(g.value)?g.value.slice(0,5):'';if(v)TR.gar[g.dataset.trg]=v;else delete TR.gar[g.dataset.trg];TR.dirty=true;trDraw();return}
  if(TR.ed)trEdChange(e)}

/* guardar cotejo (firmas y garita) */
async function trSaveCot(id){if(!trEdOk()||TR.busy)return;TR.busy=true;
  try{await trTx(id,cur=>{if(cur.st!=='env')throw new Error('El tareo cambió de estado.');const cam=trCotCam(cur);
      return{rows:trClean(trRows(cur.rows)),hist:firebase.firestore.FieldValue.arrayUnion(trHist('fir',cam?{cam}:{})),by:me.email||'',ts:NOW()}});
    TR.dirty=false;toast('Cotejo guardado.')}
  catch(err){trErr('No se pudo guardar: ',err)}finally{TR.busy=false;trSync()}}
/* marcar revisado: sin observaciones que bloqueen; si alguien no firmó, con confirmación (queda en el historial) */
async function trRevisar(id){const t=TD.docs.get(id);if(!t||t.st!=='env'||!trEdOk()||TR.busy)return;
  const dv={...t,rows:trRows(t.rows)};const ob=tObsRev(dv);const blk=ob.filter(o=>o.bl);
  if(blk.length){toast(blk[0].msg);return}
  const nof=ob.filter(o=>o.k==='nofir'),gar=ob.filter(o=>o.k==='gar');
  if(nof.length&&!await uiAsk({title:'¿Marcar revisado con observaciones?',text:`${nof.length===1?'Un obrero vino pero no firmó':nof.length+' obreros vinieron pero no firmaron'} el formato. Quedará anotado en el historial.`,list:nof.map(o=>o.msg),ok:'Marcar revisado',tone:'warn'}))return;
  const obs=[...nof,...gar].map(o=>o.msg).join(' ');TR.busy=true;
  try{await trTx(id,cur=>{if(cur.st!=='env')throw new Error('El tareo cambió de estado.');const cam=[trCotCam(cur),obs?'Observaciones: '+obs:''].filter(Boolean).join(' · ');const t2=NOW();
      return{st:'rev',revAt:t2,revBy:me.email||'',rows:trClean(trRows(cur.rows)),hist:firebase.firestore.FieldValue.arrayUnion(trHist('rev',cam?{cam:cam.length>400?cam.slice(0,397)+'…':cam}:{})),by:me.email||'',ts:t2}});
    TR.dirty=false;toast('Tareo revisado ✓')}
  catch(err){trErr('No se pudo marcar revisado: ',err)}finally{TR.busy=false;trSync()}}
async function trQuitarRev(id){const t=TD.docs.get(id);if(!t||t.st!=='rev'||!trEdOk())return;
  const mot=await uiAsk({title:'¿Quitar «revisado»?',text:'El tareo vuelve a «Enviado» para revisarlo de nuevo.',input:{label:'Motivo',required:true},ok:'Quitar revisado',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  try{await trTx(id,cur=>{if(cur.st!=='rev')throw new Error('El tareo cambió de estado.');
      return{st:'env',revAt:firebase.firestore.FieldValue.delete(),revBy:firebase.firestore.FieldValue.delete(),hist:firebase.firestore.FieldValue.arrayUnion(trHist('qrev',{mot:m})),by:me.email||'',ts:NOW()}});
    toast('El tareo volvió a «Enviado».')}
  catch(err){trErr('No se pudo cambiar: ',err)}finally{trSync()}}
/* reabrir al capataz: desde «Enviado» o «Revisado» (siempre con motivo) */
async function toReabrir(id){const t=TD.docs.get(id);if(!t||!['env','rev'].includes(t.st)||!toReabOk())return;const name=t.capN||tCapName(t.cap);
  const mot=await uiAsk({title:'¿Reabrir el tareo al capataz?',text:`${name} podrá corregirlo y volver a enviarlo. Verá el motivo que escribas.${t.st==='rev'?' Se quita la marca de revisado.':''}`,input:{label:'Motivo',required:true},ok:'Reabrir',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  const r={t:NOW(),by:me.email||me.id||'',mot:m};
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado: ya no se puede reabrir.');
      return{st:'reab',reab:r,hist:firebase.firestore.FieldValue.arrayUnion({...r,a:'reab'}),by:r.by,ts:r.t}});
    lqClose();TR.id='';toast(`Tareo reabierto: ${name} ya puede corregirlo.`)}
  catch(err){trErr('No se pudo reabrir: ',err)}}

/* ---------- corrección directa (editor para PC) ---------- */
const trBid=()=>'b'+Math.random().toString(36).slice(2,9);
function trEdDoc(t,e=TR.ed){const rows={};for(const[d,r]of Object.entries(t.rows||{})){const x=e.rows[d]||{};rows[d]={...r,as:!!x.as,mot:x.as?'':(x.mot||''),alt:x.as?!!x.alt:false}}
  return{...t,rows:trRows(rows),blq:e.blq.map(b=>({id:b.id,pc:b.pc,ini:b.ini,fin:b.fin,dnis:b.dnis.filter(d=>rows[d]&&rows[d].as)}))}}
function trEdHtml(t){const e=TR.ed;const nd=trEdDoc(t);const c=tCalc(nd);const E=tValida(nd);
  const R=Object.entries(t.rows||{}).sort((a,b)=>(a[1].ape||'').localeCompare(b[1].ape||'')||a[0].localeCompare(b[0]));
  const pres=R.filter(([d])=>e.rows[d]&&e.rows[d].as);
  const pcs=[...S.tpc.values()].filter(x=>x&&!x.arch&&x.act!==false).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const pcOpt=cur=>{const L=pcs.slice();if(cur&&!L.some(x=>x.id===cur)){const x=S.tpc.get(cur);L.unshift({id:cur,cod:x?x.cod:cur,nom:x?x.nom+' (inactiva)':'(partida no encontrada)'})}
    return`<option value=""${cur?'':' selected'}>Elige la partida</option>`+L.map(x=>`<option value="${esc(x.id)}"${x.id===cur?' selected':''}>${esc(x.cod)} · ${esc(x.nom)}</option>`).join('')};
  const short=d=>{const r=t.rows[d]||{};return(r.ape||d).split(' ')[0]};
  return`<div class="callout tr-edc"><b>Corregir el tareo</b><span>Cambia lo necesario. Al guardar se recalculan las horas, se pide el motivo y queda en el historial. El estado no cambia.</span></div>
   <b class="t-h3">Bloques</b>
   <div class="tscroll"><table class="t tr-et"><thead><tr><th>Partida</th><th>Desde</th><th>Hasta</th><th class="t-r">Horas</th><th>Quiénes</th><th></th></tr></thead><tbody>
   ${e.blq.map((b,i)=>{const on=new Set(b.dnis);return`<tr data-tri="${i}"><td><select class="tin tr-pc" id="tre_pc_${i}" data-tre="pc" aria-label="Partida">${pcOpt(b.pc)}</select></td>
     <td><input class="tin" type="time" step="300" id="tre_ini_${i}" data-tre="ini" value="${esc(b.ini)}" aria-label="Desde"></td><td><input class="tin" type="time" step="300" id="tre_fin_${i}" data-tre="fin" value="${esc(b.fin)}" aria-label="Hasta"></td>
     <td class="mono t-r">${tBlqOk(b)?toH(tBlqH(t.date,b.ini,b.fin)):''}</td>
     <td><div class="tr-chips">${pres.map(([d])=>`<button class="chip${on.has(d)?' on':''}" data-tra="who" data-v="${esc(d)}" aria-pressed="${on.has(d)}">${esc(short(d))}</button>`).join('')}<button class="chip tr-cha" data-tra="wall">${on.size===pres.length?'Ninguno':'Todos'}</button></div></td>
     <td><button class="ib" data-tra="bdel" aria-label="Quitar bloque">Quitar</button></td></tr>`}).join('')||'<tr><td colspan="6" class="note">Sin bloques.</td></tr>'}
   </tbody></table></div>
   <div><button class="ib" data-tra="badd" id="trBadd">+ Agregar bloque</button></div>
   <b class="t-h3">Obreros</b>
   <div class="tscroll"><table class="t tr-eo"><thead><tr><th>Obrero</th><th>Vino</th><th>Motivo si faltó</th><th>Altura</th><th class="t-r">Horas</th><th class="t-r">HE</th></tr></thead><tbody>
   ${R.map(([d,r])=>{const x=e.rows[d]||{};const cr=c.rows[d]||{};return`<tr data-tro="${esc(d)}"><td><b>${esc(r.ape||d)}</b> <small class="note">${esc(r.nom||'')} · ${esc(d)}</small></td>
     <td><input type="checkbox" id="tre_as_${esc(d)}" data-tre="as"${x.as?' checked':''} aria-label="Vino"></td>
     <td>${x.as?'':`<select class="tin" id="tre_mot_${esc(d)}" data-tre="mot" aria-label="Motivo"><option value="">Elige</option>${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${x.mot===k?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select>`}</td>
     <td>${x.as?`<input type="checkbox" id="tre_alt_${esc(d)}" data-tre="alt"${x.alt?' checked':''} aria-label="Altura">`:''}</td>
     <td class="mono t-r">${x.as?toH(cr.trab):''}</td><td class="mono t-r">${x.as&&cr.ext?toH(cr.ext):''}</td></tr>`}).join('')}
   </tbody></table></div>
   ${E.length?`<div class="callout t-warn to-obs" id="trEdObs"><b>${E.length} ${E.length===1?'problema':'problemas'}</b><ul>${E.map(o=>`<li>${esc(o.msg)}</li>`).join('')}</ul></div>`:''}
   <div class="lqbtns"><button class="ib" data-tra="edx">Cancelar</button><button class="ib pri" data-tra="edok" id="trEdOk">Guardar corrección</button></div>`}
function trEdClick(a,b,id){const e=TR.ed;const t=TD.docs.get(id);const i=+((b.closest('[data-tri]')||{}).dataset||{}).tri;
  if(a==='edx'){TR.ed=null;trDraw();return}
  if(a==='badd'){const j=TC().jor[String(pd(t.date).getUTCDay())]||TC().jor['1']||{ini:'07:30',fin:'17:00'};
    e.blq.push({id:trBid(),pc:'',ini:j.ini,fin:j.fin,dnis:Object.keys(e.rows).filter(d=>e.rows[d].as)});trDraw();return}
  if(a==='bdel'&&e.blq[i]){e.blq.splice(i,1);trDraw();return}
  if(a==='who'&&e.blq[i]){const d=b.dataset.v;const L=e.blq[i].dnis;e.blq[i].dnis=L.includes(d)?L.filter(x=>x!==d):[...L,d];trDraw();return}
  if(a==='wall'&&e.blq[i]){const p=Object.keys(e.rows).filter(d=>e.rows[d].as);e.blq[i].dnis=e.blq[i].dnis.filter(d=>p.includes(d)).length===p.length?[]:p;trDraw();return}
  if(a==='edok')return trEdSave(id)}
function trEdChange(ev){const el=ev.target.closest('[data-tre]');if(!el)return;const e=TR.ed;const k=el.dataset.tre;
  const bi=el.closest('[data-tri]'),ro=el.closest('[data-tro]');
  if(bi){const b=e.blq[+bi.dataset.tri];if(!b)return;if(k==='pc')b.pc=el.value;else if(k==='ini'||k==='fin')b[k]=el.value?el.value.slice(0,5):''}
  else if(ro){const d=ro.dataset.tro;const x=e.rows[d];if(!x)return;
    if(k==='as'){x.as=el.checked;if(x.as)x.mot='';else{x.alt=false;for(const b of e.blq)b.dnis=b.dnis.filter(z=>z!==d)}}
    else if(k==='mot')x.mot=el.value;else if(k==='alt')x.alt=el.checked}
  trDraw()}
async function trEdSave(id){const t=TD.docs.get(id);if(!t||!TR.ed||!['env','rev'].includes(t.st)||!trEdOk()||TR.busy)return;
  const nd=trEdDoc(t);const cam=tCam(t,nd);if(!cam){toast('No cambiaste nada.');return}
  const E=tValida(nd);
  if(E.length&&!await uiAsk({title:'La corrección deja problemas',text:'¿Guardar igual? No se podrá marcar revisado hasta resolverlos.',list:E.map(o=>o.msg),ok:'Guardar igual',tone:'warn'}))return;
  const mot=await uiAsk({title:'Motivo de la corrección',text:`Cambios: ${cam}`,input:{label:'Motivo',required:true},ok:'Guardar corrección',tone:'info'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;TR.busy=true;const ed=TR.ed;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');
      const n2=trEdDoc(cur,ed);const c=tCalc(n2);
      return{rows:trClean(c.rows),blq:n2.blq,hist:firebase.firestore.FieldValue.arrayUnion(trHist('cor',{mot:m,cam:tCam(cur,n2)||cam})),by:me.email||'',ts:NOW()}});
    TR.ed=null;TR.dirty=false;toast('Corrección guardada.')}
  catch(err){trErr('No se pudo guardar la corrección: ',err)}finally{TR.busy=false;trSync()}}

/* ---------- «Sin tareo»: registrar falta en el tareo enviado de su capataz ---------- */
/* Solo si ese tareo está «Enviado» o «Revisado» (la oficina es dueña del documento). Si el capataz no tiene tareo o lo está
   llenando (borrador/reabierto) no se escribe: su celular guarda el documento entero y pisaría la falta. Ahí: «Copiar lista». */
function trFaltaOk(f,cap){const t=cap&&TD.docs.get(f+'_'+cap);return!!(t&&!t.arch&&['env','rev'].includes(t.st)&&toReabOk())}
function trFalta(dni){const p=S.tper.get(dni);const f=TD.f;if(!p||!trFaltaOk(f,p.cap))return;const tid=f+'_'+p.cap;const t=TD.docs.get(tid);
  lqModal(`<div class="lqtop"><b>Registrar falta</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">${esc(tName(p))} <span class="mono note">${esc(p.dni||dni)}</span> se agrega como ausente al tareo de <b>${esc(t.capN||tCapName(p.cap))}</b> del ${esc(fmtD(f))}.</p>
   <label>Motivo de la ausencia<select id="trFm">${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${k==='FA'?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select></label>
   <label>Comentario (queda en el historial)<input id="trFt" type="text" maxlength="200" placeholder="Ej. RR.HH. confirma descanso médico"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trFok">Registrar falta</button></div>`,
   async e=>{if(!e.target.closest('#trFok'))return;const mot=$('#trFm').value,txt=($('#trFt').value||'').trim();if(!txt){toast('Escribe el comentario.');$('#trFt').focus();return}
     lqClose();const row={ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as:false,mot,alt:false,ini:'',fin:'',h:{},trab:0,ext:0};
     try{await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo del capataz cambió de estado.');if(cur.rows&&cur.rows[dni])throw new Error('Ya figura en ese tareo.');
         return{rows:{...(cur.rows||{}),[dni]:row},hist:firebase.firestore.FieldValue.arrayUnion(trHist('cor',{mot:txt,cam:`Falta registrada desde «Sin tareo»: ${p.ape||dni} (${mot})`})),by:me.email||'',ts:NOW()}});
       toast('Falta registrada.')}
     catch(err){trErr('No se pudo registrar: ',err)}})}
function trSinTxt(f,G){return`Obreros sin tareo · ${fmtD(f)}\n`+G.map(g=>`${g.name}\n`+g.L.map(p=>`  ${tName(p)} — DNI ${p.dni||p.id}${p.cua?' — '+p.cua:''}`).join('\n')).join('\n')}
function trCopy(txt){(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Lista copiada.')).catch(()=>{
  lqModal(`<div class="lqtop"><b>Copia la lista</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><textarea class="tr-copy" rows="12" readonly>${esc(txt)}</textarea>`);const ta=$('#lqm textarea');if(ta)ta.select()})}

/* ---------- secciones de «Tareos del día» (oficina) ---------- */
function trSecciones(f,L){const docs=[...TD.docs.values()];const ed=toReabOk();let h='';
  const dup=tDups(docs);
  if(dup.length)h+=`<div class="callout t-warn tr-dup" id="trDup"><b>${dup.length} ${dup.length===1?'obrero figura':'obreros figuran'} como presente en dos tareos</b><ul>${dup.map(x=>`<li data-dni="${esc(x.dni)}">${esc(x.nom)} <span class="mono note">${esc(x.dni)}</span>: ${x.caps.map(esc).join(' y ')}</li>`).join('')}</ul></div>`;
  if(tLate(f)){const late=L.filter(x=>!x.t||['bor','reab'].includes(x.t.st));
    if(late.length)h+=`<div class="callout t-warn tr-late" id="trLate"><b>${late.length} ${late.length===1?'capataz no envió':'capataces no enviaron'} su tareo a las ${esc(TC().limEnv)}</b><span>${late.map(x=>esc(x.name)).join(' · ')}</span></div>`}
  if(!tNoLab(f)){const G=tSinTareo(f,docs);const n=G.reduce((s,g)=>s+g.L.length,0);
    if(n){TD.sinTxt=trSinTxt(f,G);
      const op=(k,d)=>{const v=(TD.dOpen||{})[k];return(v==null?d:v)?' open':''};
      h+=`<details class="card tr-sin" id="trSin" data-tk="sin"${op('sin',true)}><summary><b>Sin tareo</b> <span class="to-obsn">${n}</span> <span class="note">Activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta)</span></summary>
       <div class="pad"><div class="tr-sbar"><button class="ib" id="trCopy">Copiar lista</button>${ed?'<span class="note">«Registrar falta» lo agrega como ausente al tareo enviado de su capataz. Si el capataz aún no envía, avísale.</span>':''}</div>
       ${G.map(g=>{const t=g.cap&&TD.docs.get(f+'_'+g.cap);const st=t?(TO_ST[t.st||'bor']||[t.st])[0]:(g.cap?'Sin tareo':'');const can=ed&&trFaltaOk(f,g.cap);
         return`<details class="tr-sg" data-cap="${esc(g.cap)}" data-tk="g:${esc(g.cap)}"${op('g:'+g.cap,!!(t||!g.cap))}><summary><b>${esc(g.name)}</b> <span class="note">${g.L.length} ${g.L.length===1?'obrero':'obreros'}${st?' · tareo: '+esc(st):''}</span></summary>
          <ul class="t-list tr-sl">${g.L.map(p=>`<li data-tsn="${esc(p.dni||p.id)}"><span>${esc(tName(p))} <span class="mono note">${esc(p.dni||p.id)}</span>${p.cua?` <span class="note">· ${esc(p.cua)}</span>`:''}</span>${can?`<button class="ib tr-fbtn" data-trfal="${esc(p.dni||p.id)}">Registrar falta</button>`:''}</li>`).join('')}</ul></details>`}).join('')}</div></details>`}}
  return h}
