"use strict";
/* LPS 911 · Módulo Casco › Lookahead › Tren (27-10-2026, decidido con el dueño; docs/ia/casco.md «Tren en el Lookahead»).
   El tren se arma y se edita aquí, como en el Excel: un bloque de filas por frente de trabajo (cs_kfr), cada fila una partida y cada
   celda un día con chips «T3·A2» (techo/piso · sector). Tocar un día vacío programa un sector; los chips se seleccionan (Ctrl/Mayús),
   se mueven con ← →, se quitan con Supr, se copian (Ctrl+C) y se pegan (Ctrl+V o tocando un día); las filas se seleccionan desde su
   nombre y se insertan, copian, pegan, ordenan y eliminan. «Proyectar» copia el tren de un techo modelo a los niveles siguientes.
   El sistema solo restringe lo que protege la medición: hoy y lo pasado (solo el administrador), lo archivado (nunca se borra).
   Las filas (orden, nombre, ejecutor) se guardan por frente en cs_ktr/{frente} {rows:[{k,name,sc,cat}]}; una actividad pertenece a
   una fila por acts.trw (filas agregadas o pegadas) o, si no lo tiene, por su partida del catálogo o su nombre. */
const KTR=new Map();let ktrSub=null;
function csKtrEnsure(){if(ktrSub||!db||!CS())return;ktrSub=fcol('ktr').onSnapshot(sn=>{KTR.clear();sn.docs.forEach(d=>KTR.set(d.id,{...d.data(),id:d.id}));if(U.tab==='look')requestRender()},()=>{});
  unsubs.push(()=>{if(ktrSub)ktrSub();ktrSub=null;KTR.clear()})}
const CT={sel:new Set(),rows:new Set(),rfr:'',clip:null,rclip:null,last:null};
const ctEd=()=>typeof csEd==='function'&&csEd()&&(typeof LKED==='undefined'||!!LKED);
/** frente de un grupo de sectores: sectors.fr; sin frente asignado, el único frente o «la obra» ('_') */
function ctFrOfSec(s){if(!s)return'_';if(s.fr&&KFR.has(s.fr))return s.fr;const F=csFrs();return F.length===1?F[0].id:'_'}
const ctFrOfAct=x=>ctFrOfSec(csSecOf(S.amb.get(x.ambId)));
const ctFrName=fid=>fid==='_'?(csFrs().length?'Sin frente':'Obra'):((KFR.get(fid)||{}).name||'Frente');
const ctFrColor=fid=>fid==='_'?'#888780':((KFR.get(fid)||{}).color||'#888780');
/** clave de fila de una actividad */
function ctKey(x){if(x.trw)return x.trw;const c=csCatOf(x);return c?'c:'+c.id:'n:'+mnk(x.name)+'|'+(x.sc||'')}
const ctLive=()=>[...S.act.values()].filter(x=>!x._del&&!x.arch);
/** filas del frente: las guardadas (orden del ingeniero) o, si nunca se editaron, las del catálogo; al final las que solo existen por sus actividades */
function ctRows(fid){const st=KTR.get(fid);let R=st&&Array.isArray(st.rows)?st.rows.map(r=>({...r})):csCats().map(c=>({k:'c:'+c.id,name:c.name,sc:c.sc||'',cat:c.id}));
  const have=new Set(R.map(r=>r.k));const extra=new Map();
  for(const x of ctLive()){if(ctFrOfAct(x)!==fid)continue;const k=ctKey(x);if(have.has(k)||extra.has(k))continue;const c=csCatOf(x);extra.set(k,{k,name:x.name||'(sin nombre)',sc:x.sc||'',cat:c?c.id:null,_tr:c?(c.tr??999):999})}
  return R.concat([...extra.values()].sort((a,b)=>a._tr-b._tr||a.name.localeCompare(b.name)).map(r=>{delete r._tr;return r}))}
function ctRowsSave(fid,rows){return fcol('ktr').doc(fid).set({rows:rows.map(r=>({k:r.k,name:r.name||'',sc:r.sc||'',cat:r.cat||null})),by:me.email,t:NOW()}).catch(e=>toast('No se pudo guardar las filas: '+(e&&e.code||e)))}
/** bloques del tren: los frentes con niveles o actividades, y «Obra»/«Sin frente» si hay actividades fuera de un frente */
function ctBlocks(){const F=csFrs().map(f=>f.id);const used=new Set(ctLive().map(ctFrOfAct));const out=F.slice();if(used.has('_')||!F.length)out.push('_');return out}
/** sectores de un nivel para un grupo dentro del frente, en orden */
function ctSecs(pid,g,fid){const out=[];for(const s of S.sec.values()){if(s.pisoId!==pid||(g&&s.grp!==g)||ctFrOfSec(s)!==fid)continue;for(const a of S.amb.values())if(a.sectorId===s.id)out.push(a)}return out.sort((a,b)=>{const sa=S.sec.get(a.sectorId),sb=S.sec.get(b.sectorId);return(sa.order||0)-(sb.order||0)||byOrder(a,b)})}
const ctLevels=fid=>{const f=KFR.get(fid);return f?csFrLv(f):pisos()};
const ctGrpOf=r=>{const c=r&&r.cat?MX.cat.get(r.cat):null;return c&&c.grp?c.grp:''};
const ctTag=a=>{const s=csSecOf(a),p=S.pis.get(s&&s.pisoId);return`${csPisoTag(p,(s&&s.grp)||'')}·${a?a.code:'?'}`};
const ctLock=d=>d<=todayIso()&&!isAdmin;

/* ---------- dibujo ---------- */
function csTrenRender(el,days){if(!el)return;if(!MX.ld.cat&&typeof ensureMcat==="function")ensureMcat();csKfrEnsure();csKtrEnsure();
  if(!csHasData()){el.innerHTML=`<div class="empty cstrempty"><b>Casco todavía no tiene niveles.</b><br>${isAdmin?'Créalos en Configuración › Casco o carga la obra de ejemplo.':'El administrador debe crearlos en Configuración › Casco.'}</div>`;el._h='';return}
  const today=todayIso(),dset=new Set(days.map(x=>x.d)),vset=new Set(visPisos().map(p=>p.id)),ed=ctEd();
  const resN={};for(const r of S.res.values())if(r.status!=='lib'&&r.actId)resN[r.actId]=(resN[r.actId]||0)+1;
  const dc=d=>`d${isWork(d)?'':' nw'}${d===today?' td':''}`;
  const head=()=>{let h='<thead><tr><th class="lab" rowspan="2">Partida · ejecutor</th>';const W=[];days.forEach(x=>{const w=W[W.length-1];if(w&&w.w===x.w)w.n++;else W.push({w:x.w,n:1,d:x.d})});
    W.forEach(w=>h+=`<th class="cswk" colspan="${w.n}">Semana ${w.w} · ${fmtD(w.d)}</th>`);h+='</tr><tr>';
    days.forEach(x=>{h+=`<th class="${dc(x.d)}" title="${isWork(x.d)?'':esc(nwReason(x.d))}"><span>${DL[x.i]}</span><b>${x.d.slice(8)}</b></th>`});return h+'</tr></thead>'};
  const exLab=sc=>{const c=conOf(sc);return sc?`<span class="cstag${c.casa?' casa':''}">${c.casa?'Casa':'SC'}</span>${esc(c.name)}`:'<span class="mu">Sin ejecutor</span>'};
  const chip=(x,d)=>{const a=S.amb.get(x.ambId),c=csCatOf(x);const rc=d<=today?recOf(d,x.id):null;const st=rc?rc.status:'';const lst=c&&c.vac&&typeof libState==='function'?libState(x):'';
    const lm=lst==='lib'||lst==='libm'?'✓':lst==='pro'?'◷':lst==='obs'?'!':'';const cls=c&&c.ent?'ent':'k'+(csAmbIdx(a)%4);const sel=CT.sel.has(x.id+'|'+d);
    return`<button type="button" class="csk ${cls}${c&&c.vac?' vac':''}${st==='ok'?' ok':st==='no'?' no':st==='partial'?' pa':''}${sel?' ctsel':''}" data-csa="${esc(x.id)}" data-d="${d}" title="${esc((x.name||'')+' · '+ctTag(a)+(x.sc?' · '+conOf(x.sc).name:'')+(lst&&typeof LST!=='undefined'&&LST[lst]?' · Liberación: '+LST[lst].t:'')+(st?' · '+(st==='ok'?'Cumplido':st==='no'?'No cumplido':'Parcial'):''))}">${c&&c.ent?'◆ ':''}${esc(ctTag(a))}${lm?`<i class="csl">${lm}</i>`:''}${resN[x.id]?'<i class="csr" aria-label="Restricción abierta">R</i>':''}</button>`};
  let b='';const B=ctBlocks();
  for(const fid of B){const R=ctRows(fid);const byRow=new Map(R.map(r=>[r.k,[]]));
    for(const x of ctLive()){if(ctFrOfAct(x)!==fid||!scOk(x.sc))continue;const s=csSecOf(S.amb.get(x.ambId));if(!s||!vset.has(s.pisoId))continue;const k=ctKey(x);if(byRow.has(k))byRow.get(k).push(x)}
    const nAct=[...byRow.values()].reduce((n,L)=>n+L.length,0);if(!nAct&&fid==='_'&&csFrs().length)continue;
    b+=`<tr class="csgr ctfrh" data-ctf="${esc(fid)}"><td class="lab"><span class="ctfrn"><i class="csdot" style="--c:${esc(ctFrColor(fid))}"></i>${esc(ctFrName(fid))}</span>${ed?`<span class="ctfrb"><button type="button" class="ib" data-ctp="${esc(fid)}" title="Copia el tren de un techo modelo a los niveles siguientes">⇡ Proyectar…</button><button type="button" class="ib" data-ctadd="${esc(fid)}" title="Agregar una fila al final del frente">+ Fila</button>${CT.rclip?`<button type="button" class="ib" data-ctpr="${esc(fid)}" title="Pegar las filas copiadas al final de este frente">Pegar filas</button>`:''}</span>`:''}</td><td colspan="${days.length}"></td></tr>`;
    for(const r of R){const L=byRow.get(r.k)||[];const rs=CT.rows.has(fid+'|'+r.k);
      b+=`<tr class="${rs?'ctrs':''}" data-ctr="${esc(r.k)}" data-ctf="${esc(fid)}"><td class="lab${ed?' ctlab':''}" ${ed?'tabindex="0"':''}><span class="pn" title="${esc(r.name)}">${esc(r.name)}</span><span class="ex">${exLab(r.sc)}</span></td>`;
      for(const x of days){const here=L.filter(y=>(y.days||[]).includes(x.d)).sort((p,q)=>{const pa=S.amb.get(p.ambId),qa=S.amb.get(q.ambId);return((S.pis.get((csSecOf(pa)||{}).pisoId)||{}).order||0)-((S.pis.get((csSecOf(qa)||{}).pisoId)||{}).order||0)||csAmbIdx(pa)-csAmbIdx(qa)});
        b+=`<td class="${dc(x.d)}${ed?' ctc':''}" data-d="${x.d}">${here.length?`<div class="csc">${here.map(y=>chip(y,x.d)).join('')}</div>`:''}</td>`}
      b+='</tr>'}}
  /* personal necesario por día (metrado ÷ rendimiento), casa y subcontratistas */
  let pc='',ps='';for(const x of days){let a=0,s=0;for(const y of ctLive()){if(!(y.days||[]).includes(x.d)||!scOk(y.sc))continue;const sx=csSecOf(S.amb.get(y.ambId));if(!sx||!vset.has(sx.pisoId))continue;const n=typeof persOf==='function'?persOf(y,x.d,persRend(y)):0;if(conOf(y.sc).casa)a+=n;else s+=n}
    pc+=`<td class="${dc(x.d)}">${a||''}</td>`;ps+=`<td class="${dc(x.d)}">${s||''}</td>`}
  b+=`<tr class="cssum"><td class="lab">Personal necesario · casa</td>${pc}</tr><tr class="cssum"><td class="lab">Personal necesario · SC</td>${ps}</tr>`;
  const h=`<div class="csbar ctbar" id="ctbar">${ctBarHtml(ed)}</div>
    <div class="cstw" id="ctw"><table class="cstr">${head()}<tbody>${b}</tbody></table></div><p class="note cstn">${ed?'Toca un día vacío para programar un sector. Selecciona chips (Ctrl o Mayús para varios) y muévelos con ← →, quítalos con Supr, cópialos con Ctrl+C y pégalos con Ctrl+V o tocando un día. Toca el nombre de una fila para seleccionarla. Doble clic en un chip: su ficha.':'Toca un chip para ver su ficha. Para editar, entra a ✎ Programar.'}</p>`;
  if(el._h!==h){const sc=el.querySelector('.cstw');const sl=sc?sc.scrollLeft:0,st=sc?sc.scrollTop:0;el.innerHTML=h;el._h=h;const n=el.querySelector('.cstw');if(n&&(sl||st)){n.scrollLeft=sl;n.scrollTop=st}else if(n){const td=n.querySelector('th.td');if(td)n.scrollLeft=Math.max(0,td.offsetLeft-260)}}
  if(!el._ct){el._ct=1;ctWire(el)}}
function ctBarHtml(ed){const n=CT.sel.size,nr=CT.rows.size;
  const leg=`<span class="csleg"><i class="csk k0">S1</i><i class="csk k1">S2</i><i class="csk k2">S3</i><i class="csk k3">S4</i><span>Borde = vaciado (✓ liberado · ◷ programado)</span><span><i class="csr">R</i> restricción</span><span>Tachado = no cumplido</span></span>`;
  if(!ed)return leg;
  if(n)return`<b>${n} celda${n>1?'s':''}</b><button type="button" class="ib" data-cta="l" title="Un día hábil antes (←)">‹ 1 día</button><button type="button" class="ib" data-cta="r" title="Un día hábil después (→)">1 día ›</button><button type="button" class="ib" data-cta="copy" title="Ctrl+C">Copiar</button><button type="button" class="ib" data-cta="del" title="Supr">Quitar</button>${n===1?'<button type="button" class="ib" data-cta="info">Ficha</button>':''}<button type="button" class="ib" data-cta="x" title="Esc">✕</button>${CT.clip?'<span class="note">Copiadas: toca un día para pegar.</span>':''}`;
  if(nr)return`<b>${nr} fila${nr>1?'s':''}</b><button type="button" class="ib" data-ctra="ins" title="Insertar una fila debajo">Insertar debajo</button><button type="button" class="ib" data-ctra="copy" title="Ctrl+C: copia las filas con sus días">Copiar filas</button>${CT.rclip?'<button type="button" class="ib" data-ctra="paste" title="Ctrl+V: pega debajo de la selección">Pegar debajo</button>':''}<button type="button" class="ib" data-ctra="up">▲</button><button type="button" class="ib" data-ctra="dn">▼</button>${nr===1?'<button type="button" class="ib" data-ctra="ren">Nombre y ejecutor…</button>':''}<button type="button" class="ib" data-ctra="del">Eliminar</button><button type="button" class="ib" data-ctra="x">✕</button>`;
  return leg+(CT.clip?`<span class="note">${CT.clip.cells.length} celda(s) copiadas: toca un día para pegar.</span><button type="button" class="ib" data-cta="clr">Olvidar copia</button>`:'')+(CT.rclip?`<span class="note">${CT.rclip.rows.length} fila(s) copiadas.</span>`:'')}
const ctRedraw=()=>{const el=document.getElementById('trw');if(el)el._h='';requestRender()};

/* ---------- edición de celdas ---------- */
function ctSelActs(){const m=new Map();for(const k of CT.sel){const i=k.lastIndexOf('|');const id=k.slice(0,i),d=k.slice(i+1);if(!m.has(id))m.set(id,new Set());m.get(id).add(d)}return m}
function ctMove(n){const M=ctSelActs();const ops=[],ns=new Set();let lk=0;
  for(const[id,ds]of M){const x=S.act.get(id);if(!x)continue;const nd=(x.days||[]).map(d=>{if(!ds.has(d))return d;const t=wshift(d,n);if(ctLock(d)||ctLock(t)){lk++;ns.add(id+'|'+d);return d}ns.add(id+'|'+t);return t});
    const o={...x,days:[...new Set(nd)].sort()};if(x.qty){const q={};(x.days||[]).forEach((d,i)=>{if(x.qty[d]!=null)q[nd[i]]=(q[nd[i]]||0)+x.qty[d]});o.qty=q}delete o.id;ops.push(op('acts',id,o))}
  if(lk)toast('Hoy y los días pasados solo los cambia el administrador.');if(!ops.length)return;CT.sel=ns;apply(ops,`Tren: ${M.size} actividad(es) ${n>0?'un día después':'un día antes'}`)}
function ctDel(){const M=ctSelActs();const ops=[];let lk=0;
  for(const[id,ds]of M){const x=S.act.get(id);if(!x)continue;const keep=(x.days||[]).filter(d=>!ds.has(d)||(ctLock(d)&&++lk));
    if(!keep.length){const a=arc('acts',id);if(a)ops.push(a);continue}const o={...x,days:keep};if(x.qty){const q={};keep.forEach(d=>{if(x.qty[d]!=null)q[d]=x.qty[d]});o.qty=q}delete o.id;ops.push(op('acts',id,o))}
  if(lk)toast('Hoy y los días pasados solo los cambia el administrador.');CT.sel.clear();if(ops.length){apply(ops,'Tren: quitar días');toast('Quitado','Deshacer',undo)}else ctRedraw()}
function ctCopy(){const cells=[];let min=null;for(const k of CT.sel){const i=k.lastIndexOf('|');const x=S.act.get(k.slice(0,i)),d=k.slice(i+1);if(!x)continue;if(!min||d<min)min=d;cells.push({x,d})}
  if(!cells.length)return;const fid=ctFrOfAct(cells[0].x);const R=ctRows(fid).map(r=>r.k);
  const rIdx=cells.map(c=>R.indexOf(ctKey(c.x)));const r0=Math.min(...rIdx.filter(i=>i>=0));
  CT.clip={fid,cells:cells.map((c,i)=>({row:rIdx[i]-r0,ambId:c.x.ambId,off:wdist(min,c.d),name:c.x.name,sc:c.x.sc,und:c.x.und||''}))};CT.rclip=null;toast(`${cells.length} celda(s) copiadas: toca un día para pegarlas.`);ctRedraw()}
/** sector equivalente de otro nivel o frente (mismo grupo y mismo número de orden) */
function ctMapAmb(ambId,dLv,fid){const a=S.amb.get(ambId),s=csSecOf(a);if(!a||!s)return null;const L=pisos();const i=L.findIndex(p=>p.id===s.pisoId)+dLv;if(i<0||i>=L.length)return null;
  if(!dLv&&ctFrOfSec(s)===fid)return ambId;const T=ctSecs(L[i].id,s.grp,fid);return T[csAmbIdx(a)]?T[csAmbIdx(a)].id:null}
/** agrega un día a la actividad de la fila en ese sector (o la crea) */
function ctAddOps(row,fid,ambId,days,acc){const live=ctLive();const ops=acc||[];
  let x=live.find(y=>y.ambId===ambId&&ctKey(y)===row.k&&ctFrOfAct(y)===fid);if(x&&ops.length){const pend=ops.find(o=>o.id===x.id);if(pend)x={...pend.after,id:x.id}}
  const nd=days.filter(d=>isWork(d)&&!ctLock(d));if(!nd.length)return ops;
  if(x){const o={...x,days:[...new Set([...(x.days||[]),...nd])].sort()};delete o.id;const i=ops.findIndex(q=>q.id===x.id);if(i>=0)ops[i]=op('acts',x.id,o);else ops.push(op('acts',x.id,o));return ops}
  const pend=ops.find(o=>!o.before&&o.after&&o.after.ambId===ambId&&o.after._rk===row.k);if(pend){pend.after.days=[...new Set([...pend.after.days,...nd])].sort();return ops}
  const c=row.cat?MX.cat.get(row.cat):null;const a=S.amb.get(ambId);const mt=c&&a&&a.met&&a.met[c.id]>0?+a.met[c.id]:null;
  const o={ambId,sc:row.sc||'',name:row.name,und:(c&&c.und)||'',days:nd.sort(),order:(c?(+c.tr||0):99)*10,_rk:row.k};if(!row.k.startsWith('c:')&&!row.k.startsWith('n:'))o.trw=row.k;if(mt){o.metrado=mt;o.qa=true}
  ops.push(op('acts',uid('a'),o));return ops}
const ctClean=ops=>{ops.forEach(o=>{if(o.after){delete o.after._rk;if(!o.before&&o.after.metrado&&o.after.qa){const q={};const n=o.after.days.length;o.after.days.forEach(d=>q[d]=Math.round(o.after.metrado/n*100)/100);o.after.qty=q}}});return ops};
function ctPaste(fid,rowK,d,dLv){const C=CT.clip;if(!C)return;const R=ctRows(fid);const r0=R.findIndex(r=>r.k===rowK);if(r0<0)return;let skip=0;const ops=[];
  const min=Math.min(...C.cells.map(c=>c.off));for(const c of C.cells){const row=R[r0+c.row];const amb=row?ctMapAmb(c.ambId,dLv||0,fid):null;if(!row||!amb){skip++;continue}const t=wshift(d,c.off-min);if(ctLock(t)||!isWork(t)){skip++;continue}ctAddOps(row,fid,amb,[t],ops)}
  if(!ops.length){toast('Nada que pegar aquí'+(skip?` (${skip} celda(s) fuera del frente, en días pasados o sin sector equivalente)`:''));return}
  apply(ctClean(ops),'Tren: pegar');toast(`Pegado${skip?` · ${skip} celda(s) no entraron`:''}`,'Deshacer',undo)}
/** día vacío: programar un sector (con sugerencia: el siguiente al último de la fila) o pegar lo copiado */
function ctCellPop(td,fid,rowK,d){if(!isWork(d)){toast(nwReason(d)+': no es día laborable.');return}if(ctLock(d)){toast('Hoy y los días pasados solo los programa el administrador.');return}
  const R=ctRows(fid),row=R.find(r=>r.k===rowK);if(!row)return;const g=ctGrpOf(row);
  const prev=ctLive().filter(y=>ctKey(y)===rowK&&ctFrOfAct(y)===fid&&(y.days||[]).some(x=>x<d)).map(y=>({y,last:(y.days||[]).filter(x=>x<d).pop()})).sort((a,b)=>a.last<b.last?1:-1)[0];
  let sug=null;if(prev){const a=S.amb.get(prev.y.ambId),s=csSecOf(a);const T=ctSecs(s.pisoId,s.grp,fid);const i=T.findIndex(z=>z.id===a.id);if(T[i+1])sug=T[i+1];else{const L=ctLevels(fid);const j=L.findIndex(p=>p.id===s.pisoId);for(let k=j+1;k<L.length&&!sug;k++){const T2=ctSecs(L[k].id,s.grp,fid);if(T2.length)sug=T2[0]}}}
  const LV=ctLevels(fid);const opts=[];for(const p of LV)for(const gg of(g?[g]:CSG_ORD))for(const a of ctSecs(p.id,gg,fid))opts.push(a);
  if(!sug)sug=opts[0]||null;
  const h=`<div class="ph">${esc(row.name)} · ${esc(fmtD(d))}</div>
    ${CT.clip?`<button data-do="paste">Pegar lo copiado aquí</button><button data-do="paste1">Pegar en el nivel siguiente</button><hr>`:''}
    ${sug?`<button data-do="add" data-a="${esc(sug.id)}">Programar ${esc(ctTag(sug))}</button>`:''}
    ${opts.length?`<div class="ctpick">${opts.slice(0,160).map(a=>`<button type="button" data-do="add" data-a="${esc(a.id)}" class="ctpb${sug&&a.id===sug.id?' on':''}">${esc(ctTag(a))}</button>`).join('')}</div>`:'<div class="ptx">Este frente no tiene sectores: créalos en Sectorización.</div>'}`;
  openPop(td,h,{add:o=>{const ops=ctAddOps(row,fid,o.a,[d]);if(ops.length)apply(ctClean(ops),`Tren: ${row.name} ${ctTag(S.amb.get(o.a))}`)},paste:()=>ctPaste(fid,rowK,d,0),paste1:()=>ctPaste(fid,rowK,d,1)})}

/* ---------- filas ---------- */
function ctRowSel(){const fid=CT.rfr;const R=ctRows(fid);const sel=R.filter(r=>CT.rows.has(fid+'|'+r.k));return{fid,R,sel}}
function ctRowActs(fid,k){return ctLive().filter(y=>ctKey(y)===k&&ctFrOfAct(y)===fid)}
function ctPartidaPop(anchor,title,cb){const cats=csCats();
  openPop(anchor,`<div class="ph">${esc(title)}</div><div class="ctpick ctpickw">${cats.map(c=>`<button type="button" data-do="cat" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div><hr><button data-do="other">Otra (escribir el nombre)…</button>`,
    {cat:o=>{const c=MX.cat.get(o.c);if(c)cb({name:c.name,sc:c.sc||'',cat:c.id})},other:async()=>{const n=await uiAsk({title,input:{label:'Nombre de la fila',required:true},ok:'Agregar'});if(n&&String(n).trim())cb({name:String(n).trim(),sc:'',cat:null})}})}
function ctRowInsert(anchor,fid,afterK){ctPartidaPop(anchor,'Nueva fila',r=>{const R=ctRows(fid);const used=new Set(R.map(x=>x.k));const k=r.cat&&!used.has('c:'+r.cat)?'c:'+r.cat:uid('r');
  const i=afterK?R.findIndex(x=>x.k===afterK):R.length-1;R.splice(i+1,0,{k,...r});ctRowsSave(fid,R);CT.rows.clear();toast(`Fila «${r.name}» agregada`)})}
function ctRowCopy(){const{fid,sel}=ctRowSel();if(!sel.length)return;CT.rclip={fid,rows:sel.map(r=>({row:{...r},acts:ctRowActs(fid,r.k).map(y=>({ambId:y.ambId,days:(y.days||[]).slice(),und:y.und||'',metrado:y.metrado,sc:y.sc}))}))};CT.clip=null;
  toast(`${sel.length} fila(s) copiadas con sus días: elige dónde pegarlas.`);ctRedraw()}
function ctRowPaste(fid,afterK){const C=CT.rclip;if(!C)return;const R=ctRows(fid);let i=afterK?R.findIndex(x=>x.k===afterK):R.length-1;const ops=[];let skip=0;const t=todayIso();
  for(const it of C.rows){const k=uid('r');const row={...it.row,k};R.splice(++i,0,row);
    for(const a of it.acts){const amb=fid===C.fid?a.ambId:ctMapAmb(a.ambId,0,fid);const ds=a.days.filter(d=>d>t||isAdmin);if(!amb||!ds.length){skip++;continue}
      const o={ambId:amb,sc:a.sc||row.sc||'',name:row.name,und:a.und,days:ds,order:99,trw:k};if(a.metrado>0){o.metrado=a.metrado;o.qa=true}ops.push(op('acts',uid('a'),o))}}
  ctRowsSave(fid,R);if(ops.length)apply(ctClean(ops),`Tren: pegar ${C.rows.length} fila(s)`);CT.rows.clear();
  toast(`${C.rows.length} fila(s) pegadas${skip?` · ${skip} actividad(es) no entraron (días pasados o sin sector equivalente)`:''}`,ops.length?'Deshacer':null,ops.length?undo:null)}
function ctRowMove(d){const{fid,R,sel}=ctRowSel();if(!sel.length)return;const ks=new Set(sel.map(r=>r.k));
  if(d<0){for(let i=1;i<R.length;i++)if(ks.has(R[i].k)&&!ks.has(R[i-1].k))[R[i-1],R[i]]=[R[i],R[i-1]]}else{for(let i=R.length-2;i>=0;i--)if(ks.has(R[i].k)&&!ks.has(R[i+1].k))[R[i],R[i+1]]=[R[i+1],R[i]]}
  ctRowsSave(fid,R)}
async function ctRowDel(){const{fid,R,sel}=ctRowSel();if(!sel.length)return;const t=todayIso();const ops=[];let hist=0;
  for(const r of sel)for(const y of ctRowActs(fid,r.k)){const past=(y.days||[]).filter(d=>d<=t);if(past.length&&!isAdmin){hist++;const o={...y,days:past};delete o.id;ops.push(op('acts',y.id,o))}else{const a=arc('acts',y.id);if(a)ops.push(a)}}
  if(!(await uiAsk({title:`¿Eliminar ${sel.length} fila(s)?`,text:'Sus actividades se archivan (se recuperan con Deshacer o en la Papelera).',list:[...sel.map(r=>r.name),...(hist?[`${hist} actividad(es) con días pasados: se conservan esos días (solo el administrador borra historia)`]:[])],ok:'Eliminar',tone:'warn'})))return;
  const keep=new Set(hist?sel.filter(r=>ctRowActs(fid,r.k).some(y=>(y.days||[]).some(d=>d<=t))).map(r=>r.k):[]);
  ctRowsSave(fid,R.filter(r=>!sel.includes(r)||keep.has(r.k)));if(ops.length)apply(ops,`Tren: eliminar ${sel.length} fila(s)`);CT.rows.clear();toast('Filas eliminadas',ops.length?'Deshacer':null,ops.length?undo:null)}
function ctRowRen(anchor){const{fid,R,sel}=ctRowSel();const r=sel[0];if(!r)return;const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  openPop(anchor,`<div class="ph">${esc(r.name)}</div><label class="ptx">Nombre<input class="tin" id="ctrn" value="${esc(r.name)}"></label><label class="ptx">Ejecutor<select class="tin" id="ctrs"><option value="">Sin ejecutor</option>${cons.map(c=>`<option value="${c.id}"${c.id===r.sc?' selected':''}>${esc(c.name)}${c.casa?' (casa)':''}</option>`).join('')}</select></label><p class="ptx">El ejecutor se aplica a los días futuros de la fila; los pasados conservan el suyo.</p><button data-do="ok">Guardar</button>`,
    {ok:()=>{const nm=(document.getElementById('ctrn')||{}).value,sc=(document.getElementById('ctrs')||{}).value;const name=String(nm||'').trim()||r.name;const t=todayIso();const ops=[];
      for(const y of ctRowActs(fid,r.k)){const fut=(y.days||[]).filter(d=>d>t),past=(y.days||[]).filter(d=>d<=t);const o={...y,name};delete o.id;
        if(sc!==(y.sc||'')&&fut.length){if(past.length){o.days=past;ops.push(op('acts',y.id,o));const n={...o,days:fut,sc,trw:y.trw||undefined};if(!n.trw)delete n.trw;ops.push(op('acts',uid('a'),n))}else{o.sc=sc;ops.push(op('acts',y.id,o))}}
        else ops.push(op('acts',y.id,o))}
      /* la fila deja de depender del nombre o la partida: todas sus actividades se anclan con trw */
      const nk=r.k.startsWith('c:')||r.k.startsWith('n:')?uid('r'):r.k;ops.forEach(o=>{if(o.after)o.after.trw=nk});
      R.splice(R.indexOf(r),1,{...r,k:nk,name,sc});ctRowsSave(fid,R);CT.rows.clear();if(ops.length)apply(ops,`Tren: fila «${name}»`)}})}

/* ---------- Proyectar: el tren de un techo modelo a los niveles siguientes ---------- */
function ctProjPlan(fid,cfg){const LV=ctLevels(fid);const m=LV.findIndex(p=>p.id===cfg.model),to=LV.findIndex(p=>p.id===cfg.to);const out={ops:[],add:0,skip:0,past:0,lv:0,cyc:0,warn:''};
  if(m<0||to<=m){out.warn='Elige un nivel destino por encima del modelo.';return out}
  const P=ctLive().filter(y=>ctFrOfAct(y)===fid&&(csSecOf(S.amb.get(y.ambId))||{}).pisoId===LV[m].id&&(y.days||[]).length);
  if(!P.length){out.warn='El nivel modelo no tiene nada programado en este frente.';return out}
  const all=P.flatMap(y=>y.days);const st=all.reduce((a,b)=>a<b?a:b);
  const vac=P.filter(y=>(csCatOf(y)||{}).vac&&(csSecOf(S.amb.get(y.ambId))||{}).grp!=='A');
  let cyc;if(cfg.mode==='n')cyc=Math.max(1,+cfg.n||1);
  else if(cfg.mode==='s1'){const v1=vac.filter(y=>csAmbIdx(S.amb.get(y.ambId))===0).flatMap(y=>y.days);cyc=v1.length?wdist(st,v1.reduce((a,b)=>a>b?a:b))+1:wdist(st,all.reduce((a,b)=>a>b?a:b))+1}
  else{const vd=vac.flatMap(y=>y.days);cyc=wdist(st,(vd.length?vd:all).reduce((a,b)=>a>b?a:b))+1}
  out.cyc=cyc;const R=ctRows(fid);const rowOf=k=>R.find(r=>r.k===k)||{k,name:'',sc:''};const t=todayIso();
  /* ritmo por fila y grupo en el modelo, para sectores que el modelo no tiene */
  const firstOff=new Map();for(const y of P){const a=S.amb.get(y.ambId),s=csSecOf(a);const key=ctKey(y)+'|'+s.grp;const i=csAmbIdx(a);const o=wdist(st,y.days[0]);if(!firstOff.has(key))firstOff.set(key,[]);firstOff.get(key)[i]=o}
  for(let li=m+1;li<=to;li++){out.lv++;const s0=wshift(st,cyc*(li-m));
    for(const y of P){const a=S.amb.get(y.ambId),s=csSecOf(a);const T=ctSecs(LV[li].id,s.grp,fid);const nM=ctSecs(LV[m].id,s.grp,fid).length;const i=csAmbIdx(a);const key=ctKey(y)+'|'+s.grp;
      const targets=[];if(T[i])targets.push({amb:T[i],sh:0});
      if(i===nM-1&&T.length>nM){const fo=firstOff.get(key)||[];const pace=fo.length>1&&fo[nM-1]!=null&&fo[nM-2]!=null?Math.max(1,fo[nM-1]-fo[nM-2]):1;for(let j=nM;j<T.length;j++)targets.push({amb:T[j],sh:(j-nM+1)*pace})}
      for(const tg of targets){const row=rowOf(ctKey(y));if(ctLive().some(z=>z.ambId===tg.amb.id&&ctKey(z)===row.k&&(z.days||[]).length)){out.skip++;continue}
        const ds=y.days.map(d=>wshift(s0,wdist(st,d)+tg.sh));const ok=ds.filter(d=>d>t);out.past+=ds.length-ok.length;if(!ok.length)continue;
        const c=csCatOf(y);const mt=c&&tg.amb.met&&tg.amb.met[c.id]>0?+tg.amb.met[c.id]:(y.metrado>0?y.metrado:null);
        const o={ambId:tg.amb.id,sc:y.sc||'',name:y.name,und:y.und||'',days:[...new Set(ok)].sort(),order:y.order||0};if(y.trw)o.trw=y.trw;if(mt){o.metrado=mt;o.qa=true}out.ops.push(op('acts',uid('a'),o));out.add++}}}
  return out}
function ctProjOpen(fid){if(!ctEd()){toast('Para proyectar entra a ✎ Programar.');return}const LV=ctLevels(fid);
  const withActs=new Set(ctLive().filter(y=>ctFrOfAct(y)===fid&&(y.days||[]).length).map(y=>(csSecOf(S.amb.get(y.ambId))||{}).pisoId));
  const model=(LV.find(p=>withActs.has(p.id))||LV[0]||{}).id;if(!model){toast('Este frente no tiene niveles.');return}
  const lv=sel=>LV.map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.tc||p.code||'')} · ${esc(p.name)}${withActs.has(p.id)?' ●':''}</option>`).join('');
  const m=document.createElement('div');m.className='lqm';m.id='ctpm';m.innerHTML=`<div class="lqc csgen" role="dialog" aria-modal="true" aria-labelledby="ctpt"><h3 id="ctpt">Proyectar el tren · ${esc(ctFrName(fid))}</h3>
    <p class="note">Copia lo programado en el techo modelo (todas sus filas y sectores, con los mismos desfases) a los niveles siguientes. No toca hoy, lo pasado ni los sectores que ya tienen esa partida programada. Se deshace con un solo Deshacer.</p>
    <div class="csgf"><label>Techo modelo<select id="ctp_m">${lv(model)}</select></label><label>Proyectar hasta<select id="ctp_to">${lv((LV[LV.length-1]||{}).id)}</select></label>
    <label>El techo siguiente empieza<select id="ctp_mode"><option value="fin">Al día siguiente de vaciar el último sector</option><option value="s1">Al día siguiente de vaciar el primer sector (tren continuo)</option><option value="n">N días hábiles después de empezar el anterior</option></select></label>
    <label id="ctp_nw" hidden>Días hábiles<input type="number" id="ctp_n" min="1" max="60" value="5"></label></div>
    <div class="callout" id="ctp_prev" aria-live="polite"></div>
    <div class="csrow"><span style="flex:1"></span><button class="ib" data-ctp2="x">Cancelar</button><button class="ib pri" data-ctp2="ok">Proyectar</button></div></div>`;
  document.body.appendChild(m);const cfg=()=>({model:$('#ctp_m').value,to:$('#ctp_to').value,mode:$('#ctp_mode').value,n:+$('#ctp_n').value});
  const prev=()=>{$('#ctp_nw').hidden=$('#ctp_mode').value!=='n';const pl=ctProjPlan(fid,cfg());
    $('#ctp_prev').innerHTML=pl.warn?esc(pl.warn):`<b>${pl.add}</b> actividad(es) en ${pl.lv} nivel(es) · un techo cada <b>${pl.cyc}</b> día(s) hábiles${pl.skip?` · ${pl.skip} ya programadas: se respetan`:''}${pl.past?` · ${pl.past} día(s) caían en el pasado y no se programan`:''}`;return pl};
  prev();m.addEventListener('change',prev);m.addEventListener('input',e=>{if(e.target.type==='number')prev()});const close=()=>m.remove();m.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  m.addEventListener('click',e=>{if(e.target===m){close();return}const b=e.target.closest('[data-ctp2]');if(!b)return;if(b.dataset.ctp2==='x'){close();return}const pl=prev();if(pl.warn||!pl.ops.length){toast(pl.warn||'No hay nada que proyectar.');return}close();
    apply(ctClean(pl.ops),`Proyectar el tren (${pl.add} actividades)`);toast(`Tren proyectado: ${pl.add} actividades en ${pl.lv} nivel(es)`,'Deshacer',undo)});
  setTimeout(()=>{const f=$('#ctp_m');if(f)f.focus()},30)}

/* ---------- ficha de un chip ---------- */
function ctFicha(btn,id){const x=S.act.get(id);if(!x)return;const a=S.amb.get(x.ambId),s=csSecOf(a),p=S.pis.get(s&&s.pisoId),g=(s&&s.grp)||'';const c=csCatOf(x),con=conOf(x.sc);
  const ds=x.days||[];const rd=persRend(x);const per=hasM(x)&&rd?Math.ceil(x.metrado/rd/Math.max(1,ds.length)):null;const lst=c&&c.vac&&typeof libState==='function'?libState(x):'';
  const resL=[...S.res.values()].filter(r=>r.actId===x.id&&r.status!=='lib');
  openPop(btn,`<div class="cspop"><b>${esc(x.name)}</b><dl><dt>Nivel</dt><dd>${esc(p?p.name:'')} · ${g==='A'?'piso':'techo'} (${esc(csPisoTag(p,g))})</dd><dt>Sector</dt><dd>${esc(a?a.name:'')} · ${esc(ctFrName(ctFrOfAct(x)))}</dd><dt>Días</dt><dd>${ds.map(fmtD).join(', ')||'—'}</dd><dt>Ejecutor</dt><dd>${esc(con.name)}${con.casa?' (casa)':''}</dd>
    ${hasM(x)?`<dt>Metrado</dt><dd class="mono">${x.metrado} ${esc(x.und||'')}</dd>`:''}${rd?`<dt>Rend.</dt><dd class="mono">${rd} ${esc(x.und||'')}/persona·día</dd>`:''}${per?`<dt>Personal</dt><dd class="mono">${per} por día</dd>`:''}
    ${c&&c.vac?`<dt>Liberación</dt><dd>${lst&&typeof LST!=='undefined'&&LST[lst]?esc(LST[lst].t):'Sin solicitar'}</dd>`:''}</dl>${resL.length?`<div class="cspr">⚠ ${resL.map(r=>esc(r.desc||r.text||r.type||'Restricción')).join(' · ')}</div>`:''}
    <div class="csrow"><button class="ib" data-do="grid">Ver en la grilla</button></div></div>`,{grid:()=>{U.lkV='grid';U.piso=s?s.pisoId:'';U.sector=s?s.id:'';saveUI();requestRender()}})}

/* ---------- eventos ---------- */
function ctWire(el){
  el.addEventListener('click',e=>{if(!CS())return;const t=e.target;const ed=ctEd();
    const ch=t.closest('[data-csa]');if(ch){e.stopPropagation();const k=ch.dataset.csa+'|'+ch.dataset.d;
      if(!ed){ctFicha(ch,ch.dataset.csa);return}CT.rows.clear();if(e.ctrlKey||e.metaKey||e.shiftKey){if(CT.sel.has(k))CT.sel.delete(k);else CT.sel.add(k)}else{CT.sel=new Set(CT.sel.size===1&&CT.sel.has(k)?[]:[k])}CT.last=k;ctRedraw();return}
    const ba=t.closest('[data-cta]');if(ba){const k=ba.dataset.cta;if(k==='l')ctMove(-1);else if(k==='r')ctMove(1);else if(k==='del')ctDel();else if(k==='copy')ctCopy();else if(k==='x'){CT.sel.clear();ctRedraw()}else if(k==='clr'){CT.clip=null;CT.rclip=null;ctRedraw()}
      else if(k==='info'){const s=[...CT.sel][0];const i=s.lastIndexOf('|');const c=el.querySelector(`[data-csa="${CSS.escape(s.slice(0,i))}"][data-d="${s.slice(i+1)}"]`);ctFicha(c||ba,s.slice(0,i))}return}
    const br=t.closest('[data-ctra]');if(br){const k=br.dataset.ctra;const{fid,sel}=ctRowSel();if(k==='ins')ctRowInsert(br,fid,sel.length?sel[sel.length-1].k:null);else if(k==='copy')ctRowCopy();else if(k==='paste')ctRowPaste(fid,sel.length?sel[sel.length-1].k:null);
      else if(k==='up')ctRowMove(-1);else if(k==='dn')ctRowMove(1);else if(k==='ren')ctRowRen(br);else if(k==='del')ctRowDel();else if(k==='x'){CT.rows.clear();ctRedraw()}return}
    const bp=t.closest('[data-ctp]');if(bp){ctProjOpen(bp.dataset.ctp);return}
    const bd=t.closest('[data-ctadd]');if(bd){ctRowInsert(bd,bd.dataset.ctadd,null);return}
    const bq=t.closest('[data-ctpr]');if(bq){ctRowPaste(bq.dataset.ctpr,null);return}
    if(!ed)return;
    const lab=t.closest('td.ctlab');if(lab){const tr=lab.closest('tr[data-ctr]');const fid=tr.dataset.ctf,k=tr.dataset.ctr;CT.sel.clear();const key=fid+'|'+k;
      if(CT.rfr!==fid){CT.rows.clear();CT.rfr=fid}
      if(e.shiftKey&&CT.rows.size){const R=ctRows(fid).map(r=>r.k);const idx=[...CT.rows].map(x=>R.indexOf(x.slice(fid.length+1))).filter(i=>i>=0);const i0=Math.min(...idx,R.indexOf(k)),i1=Math.max(...idx,R.indexOf(k));for(let i=i0;i<=i1;i++)CT.rows.add(fid+'|'+R[i])}
      else if(e.ctrlKey||e.metaKey){if(CT.rows.has(key))CT.rows.delete(key);else CT.rows.add(key)}else CT.rows=new Set(CT.rows.size===1&&CT.rows.has(key)?[]:[key]);ctRedraw();return}
    const td=t.closest('td.ctc');if(td&&!t.closest('[data-csa]')){const tr=td.closest('tr[data-ctr]');if(!tr)return;if(CT.sel.size){CT.sel.clear();ctRedraw()}ctCellPop(td,tr.dataset.ctf,tr.dataset.ctr,td.dataset.d)}});
  el.addEventListener('dblclick',e=>{const ch=e.target.closest('[data-csa]');if(ch){e.preventDefault();ctFicha(ch,ch.dataset.csa)}})}
document.addEventListener('keydown',e=>{if(!CS()||U.tab!=='look'||U.lkV!=='tren'||!ctEd())return;const a=document.activeElement;if(a&&(/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)||a.isContentEditable))return;if(document.querySelector('.lqm'))return;
  const mod=e.ctrlKey||e.metaKey;
  if(CT.sel.size){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();ctMove(e.key==='ArrowLeft'?-1:1);return}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopPropagation();ctDel();return}
    if(mod&&e.key.toLowerCase()==='c'){e.preventDefault();e.stopPropagation();ctCopy();return}
    if(e.key==='Escape'){CT.sel.clear();ctRedraw();return}}
  if(CT.rows.size){if(mod&&e.key.toLowerCase()==='c'){e.preventDefault();e.stopPropagation();ctRowCopy();return}
    if(mod&&e.key.toLowerCase()==='v'&&CT.rclip){e.preventDefault();e.stopPropagation();const{fid,sel}=ctRowSel();ctRowPaste(fid,sel.length?sel[sel.length-1].k:null);return}
    if(e.key==='Delete'){e.preventDefault();e.stopPropagation();ctRowDel();return}if(e.key==='Escape'){CT.rows.clear();ctRedraw();return}}},true);
