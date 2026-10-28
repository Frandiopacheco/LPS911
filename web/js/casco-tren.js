"use strict";
/* LPS 911 · Módulo Casco › Lookahead › Tren (27-10-2026, decidido con el dueño; docs/ia/casco.md «Tren en el Lookahead»).
   El tren se arma y se edita aquí como una hoja de Excel: un bloque de filas por frente de trabajo (cs_kfr), cada fila una partida y
   cada celda un día con chips «T3·S2» (techo/piso · sector). Se escribe en la celda («S1», «T3 S1», «3S1»; Enter guarda y pasa al día
   siguiente), se selecciona arrastrando, Supr borra, Ctrl+C/X/V copia, corta y pega, Alt+← → mueve, el bloque seleccionado se arrastra,
   la esquina ■ rellena en serie (S1, S2… y el nivel siguiente) y el clic derecho abre el menú de la celda o de la fila.
   «Proyectar» continúa la serie de cada fila desde el nivel modelo hasta el nivel elegido.
   El sistema solo restringe lo que protege la medición: hoy y lo pasado (solo el administrador), lo archivado (nunca se borra).
   Las filas (orden, nombre, ejecutor) se guardan por frente en cs_ktr/{frente} {rows:[{k,name,sc,cat}]}; una actividad pertenece a
   una fila por acts.trw (filas agregadas o pegadas) o, si no lo tiene, por su partida del catálogo o su nombre. */
const KTR=new Map();let ktrSub=null;
function csKtrEnsure(){if(ktrSub||!db||!CS())return;ktrSub=fcol('ktr').onSnapshot(sn=>{KTR.clear();sn.docs.forEach(d=>KTR.set(d.id,{...d.data(),id:d.id}));if(U.tab==='look')requestRender()},()=>{});
  unsubs.push(()=>{if(ktrSub)ktrSub();ktrSub=null;KTR.clear()})}
/* cur/a: celda activa y ancla de la selección {fid,ri,di} (ri: fila en ctRows(fid), di: columna en CT.days); rows: filas seleccionadas desde su nombre */
const CT={cur:null,a:null,rows:new Set(),rfr:'',clip:null,rclip:null,days:[],drag:null,ed:null};
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
function ctSecs(pid,g,fid){const out=[];for(const s of S.sec.values()){if(s.pisoId!==pid||(g&&s.grp!==g)||ctFrOfSec(s)!==fid)continue;for(const a of S.amb.values())if(a.sectorId===s.id&&!a.fus)out.push(a)}return out.sort((a,b)=>{const sa=S.sec.get(a.sectorId),sb=S.sec.get(b.sectorId);return(sa.order||0)-(sb.order||0)||byOrder(a,b)})}
const ctLevels=fid=>{const f=KFR.get(fid);return f?csFrLv(f):pisos()};
const ctGrpOf=r=>{const c=r&&r.cat?MX.cat.get(r.cat):null;return c&&c.grp?c.grp:''};
const ctTag=a=>{const s=csSecOf(a),p=S.pis.get(s&&s.pisoId);return`${csPisoTag(p,(s&&s.grp)||'')}·${a?a.code:'?'}`};
const ctLock=d=>d<=todayIso()&&!isAdmin;
const ctLvIdx=(fid,a)=>{const s=csSecOf(a);return s?ctLevels(fid).findIndex(p=>p.id===s.pisoId):-1};
/** sector siguiente en la serie: el siguiente del nivel (mismo grupo) o el primero del nivel siguiente que tenga sectores de ese grupo */
function ctNextAmb(a,fid){const s=csSecOf(a);if(!s)return null;const T=ctSecs(s.pisoId,s.grp,fid);const i=T.findIndex(z=>z.id===a.id);if(i>=0&&T[i+1])return T[i+1];
  const L=ctLevels(fid);const j=L.findIndex(p=>p.id===s.pisoId);for(let k=j+1;k<L.length;k++){const T2=ctSecs(L[k].id,s.grp,fid);if(T2.length)return T2[0]}return null}
/** sector equivalente de otro nivel o frente (mismo grupo y mismo número de orden) */
function ctMapAmb(ambId,dLv,fid){const a=S.amb.get(ambId),s=csSecOf(a);if(!a||!s)return null;const L=pisos();const i=L.findIndex(p=>p.id===s.pisoId)+dLv;if(i<0||i>=L.length)return null;
  if(!dLv&&ctFrOfSec(s)===fid)return ambId;const T=ctSecs(L[i].id,s.grp,fid);return T[csAmbIdx(a)]?T[csAmbIdx(a)].id:null}

/* ---------- conjunto de trabajo: todos los cambios de una acción van en un solo apply (un Deshacer) ---------- */
function ctWS(){const ws={byRow:new Map(),mod:new Map(),add:[]};for(const x of ctLive()){const key=ctFrOfAct(x)+'|'+ctKey(x);if(!ws.byRow.has(key))ws.byRow.set(key,[]);ws.byRow.get(key).push(x)}return ws}
const wsRow=(ws,fid,k)=>ws.byRow.get(fid+'|'+k)||[];
function wsMut(ws,fid,k,x){if(x._new)return x;if(ws.mod.has(x.id))return ws.mod.get(x.id);const m={...x,days:(x.days||[]).slice()};if(x.qty)m.qty={...x.qty};ws.mod.set(x.id,m);const L=wsRow(ws,fid,k);const i=L.indexOf(x);if(i>=0)L[i]=m;return m}
function wsDel(ws,fid,k,x,d){const m=wsMut(ws,fid,k,x);const q=m.qty&&m.qty[d];m.days=m.days.filter(y=>y!==d);if(m.qty)delete m.qty[d];return q}
function wsAdd(ws,fid,row,ambId,d,q){const L=wsRow(ws,fid,row.k);let x=L.find(y=>y.ambId===ambId);
  if(x){x=wsMut(ws,fid,row.k,x);if(!x.days.includes(d)){x.days.push(d);x.days.sort()}if(q!=null){x.qty=x.qty||{};x.qty[d]=(+x.qty[d]||0)+q}return x}
  const c=row.cat?MX.cat.get(row.cat):null;const a=S.amb.get(ambId);const mt=c&&a&&a.met&&a.met[c.id]>0?+a.met[c.id]:null;
  const o={_new:1,ambId,sc:row.sc||'',name:row.name,und:(c&&c.und)||'',days:[d],order:(c?(+c.tr||0):99)*10};if(!row.k.startsWith('c:')&&!row.k.startsWith('n:'))o.trw=row.k;if(mt){o.metrado=mt;o.qa=true}
  if(!ws.byRow.has(fid+'|'+row.k))ws.byRow.set(fid+'|'+row.k,L);L.push(o);ws.add.push(o);return o}
function wsOps(ws){const ops=[];
  for(const[id,m]of ws.mod){const x=S.act.get(id);if(!x)continue;if(!m.days.length){const a=arc('acts',id);if(a)ops.push(a);continue}
    if(m.days.join()===(x.days||[]).join()&&JSON.stringify(m.qty||null)===JSON.stringify(x.qty||null))continue;const o={...m};delete o.id;ops.push(op('acts',id,o))}
  for(const o of ws.add){if(!o.days.length)continue;const n={...o};delete n._new;if(n.metrado&&n.qa){const q={};n.days.forEach(d=>q[d]=Math.round(n.metrado/n.days.length*100)/100);n.qty=q}ops.push(op('acts',uid('a'),n))}
  return ops}
/** actividades de la fila que tienen ese día (orden: nivel y sector) */
function wsCell(ws,fid,k,d){return wsRow(ws,fid,k).filter(y=>(y.days||[]).includes(d)).sort((p,q)=>ctLvIdx(fid,S.amb.get(p.ambId))-ctLvIdx(fid,S.amb.get(q.ambId))||csAmbIdx(S.amb.get(p.ambId))-csAmbIdx(S.amb.get(q.ambId)))}
const LOCKMSG='Hoy y los días pasados solo los cambia el administrador.';

/* ---------- dibujo ---------- */
function csTrenRender(el,days){if(!el)return;if(!MX.ld.cat&&typeof ensureMcat==="function")ensureMcat();csKfrEnsure();csKtrEnsure();
  if(!csHasData()){el.innerHTML=`<div class="empty cstrempty"><b>Casco todavía no tiene niveles.</b><br>${isAdmin?'Créalos en Configuración › Casco o carga la obra de ejemplo.':'El administrador debe crearlos en Configuración › Casco.'}</div>`;el._h='';return}
  const today=todayIso(),vset=new Set(visPisos().map(p=>p.id)),ed=ctEd();CT.days=days.map(x=>x.d);
  const resN={};for(const r of S.res.values())if(r.status!=='lib'&&r.actId)resN[r.actId]=(resN[r.actId]||0)+1;
  const dc=d=>`d${isWork(d)?'':' nw'}${d===today?' td':''}`;
  const head=()=>{let h='<thead><tr><th class="lab" rowspan="2">Partida · ejecutor</th>';const W=[];days.forEach(x=>{const w=W[W.length-1];if(w&&w.w===x.w)w.n++;else W.push({w:x.w,n:1,d:x.d})});
    W.forEach(w=>h+=`<th class="cswk" colspan="${w.n}">Semana ${w.w} · ${fmtD(w.d)}</th>`);h+='</tr><tr>';
    days.forEach(x=>{h+=`<th class="${dc(x.d)}" title="${isWork(x.d)?'':esc(nwReason(x.d))}"><span>${DL[x.i]}</span><b>${x.d.slice(8)}</b></th>`});return h+'</tr></thead>'};
  const exLab=sc=>{const c=conOf(sc);return sc?`<span class="cstag${c.casa?' casa':''}">${c.casa?'Casa':'SC'}</span>${esc(c.name)}`:'<span class="mu">Sin ejecutor</span>'};
  const chip=(x,d)=>{const a=S.amb.get(x.ambId),c=csCatOf(x);const rc=d<=today?recOf(d,x.id):null;const st=rc?rc.status:'';const lst=c&&c.vac&&typeof libState==='function'?libState(x):'';
    const lm=lst==='lib'||lst==='libm'?'✓':lst==='pro'?'◷':lst==='obs'?'!':'';const cls=c&&c.ent?'ent':'k'+(csAmbIdx(a)%4);
    return`<span class="csk ${cls}${c&&c.vac?' vac':''}${st==='ok'?' ok':st==='no'?' no':st==='partial'?' pa':''}" data-csa="${esc(x.id)}" data-d="${d}" title="${esc((x.name||'')+' · '+ctTag(a)+(x.sc?' · '+conOf(x.sc).name:'')+(lst&&typeof LST!=='undefined'&&LST[lst]?' · Liberación: '+LST[lst].t:'')+(st?' · '+(st==='ok'?'Cumplido':st==='no'?'No cumplido':'Parcial'):''))}">${c&&c.ent?'◆ ':''}${esc(ctTag(a))}${lm?`<i class="csl">${lm}</i>`:''}${resN[x.id]?'<i class="csr" aria-label="Restricción abierta">R</i>':''}</span>`};
  let b='';const B=ctBlocks();
  for(const fid of B){const R=ctRows(fid);const byRow=new Map(R.map(r=>[r.k,[]]));
    for(const x of ctLive()){if(ctFrOfAct(x)!==fid||!scOk(x.sc))continue;const s=csSecOf(S.amb.get(x.ambId));if(!s||!vset.has(s.pisoId))continue;const k=ctKey(x);if(byRow.has(k))byRow.get(k).push(x)}
    const nAct=[...byRow.values()].reduce((n,L)=>n+L.length,0);if(!nAct&&fid==='_'&&csFrs().length)continue;
    b+=`<tr class="csgr ctfrh" data-ctf="${esc(fid)}"><td class="lab"><span class="ctfrn"><i class="csdot" style="--c:${esc(ctFrColor(fid))}"></i>${esc(ctFrName(fid))}${ed?`<button type="button" class="ctfrm" data-ctfm="${esc(fid)}" aria-label="Menú de ${esc(ctFrName(fid))}" title="Proyectar, agregar o pegar filas">⋯</button>`:''}</span></td><td colspan="${days.length}"></td></tr>`;
    R.forEach((r,ri)=>{const L=byRow.get(r.k)||[];const rs=CT.rows.has(fid+'|'+r.k);
      b+=`<tr class="${rs?'ctrs':''}" data-ctr="${esc(r.k)}" data-ctf="${esc(fid)}" data-ri="${ri}"><td class="lab${ed?' ctlab':''}" data-ctl="${esc(r.k)}" ${ed?'tabindex="0"':''}><span class="pn" title="${esc(r.name)}">${esc(r.name)}</span><span class="ex">${exLab(r.sc)}</span></td>`;
      days.forEach((x,di)=>{const here=L.filter(y=>(y.days||[]).includes(x.d)).sort((p,q)=>{const pa=S.amb.get(p.ambId),qa=S.amb.get(q.ambId);return((S.pis.get((csSecOf(pa)||{}).pisoId)||{}).order||0)-((S.pis.get((csSecOf(qa)||{}).pisoId)||{}).order||0)||csAmbIdx(pa)-csAmbIdx(qa)});
        b+=`<td class="${dc(x.d)}${ed?' ctc':''}" data-d="${x.d}" data-di="${di}">${here.length?`<div class="csc">${here.map(y=>chip(y,x.d)).join('')}</div>`:''}</td>`});
      b+='</tr>'})}
  /* personal necesario por día (metrado ÷ rendimiento), casa y subcontratistas */
  let pc='',ps='';for(const x of days){let a=0,s=0;for(const y of ctLive()){if(!(y.days||[]).includes(x.d)||!scOk(y.sc))continue;const sx=csSecOf(S.amb.get(y.ambId));if(!sx||!vset.has(sx.pisoId))continue;const n=typeof persOf==='function'?persOf(y,x.d,persRend(y)):0;if(conOf(y.sc).casa)a+=n;else s+=n}
    pc+=`<td class="${dc(x.d)}">${a||''}</td>`;ps+=`<td class="${dc(x.d)}">${s||''}</td>`}
  b+=`<tr class="cssum"><td class="lab">Personal necesario · casa</td>${pc}</tr><tr class="cssum"><td class="lab">Personal necesario · SC</td>${ps}</tr>`;
  const h=`<div class="csbar ctbar" id="ctbar"></div>
    <div class="cstw" id="ctw"><table class="cstr${ed?' cted':''}">${head()}<tbody>${b}</tbody></table></div><p class="note cstn">${ed?'Escribe el sector en la celda (S1, T3 S1 o 3S1) y Enter. Arrastra para seleccionar; Supr borra; Ctrl+C / Ctrl+X / Ctrl+V; Alt+← → mueve un día; arrastra la selección para moverla; la esquina ■ rellena en serie; clic derecho: menú de la celda o de la fila.':'Toca un chip para ver su ficha. Para editar, entra a ✎ Programar.'}</p>`;
  if(el._h!==h){const sc=el.querySelector('.cstw');const sl=sc?sc.scrollLeft:0,st=sc?sc.scrollTop:0;el.innerHTML=h;el._h=h;const n=el.querySelector('.cstw');if(n&&(sl||st)){n.scrollLeft=sl;n.scrollTop=st}else if(n){const td=n.querySelector('th.td');if(td)n.scrollLeft=Math.max(0,td.offsetLeft-260)}
    if(n)n.addEventListener('scroll',ctEdPlace,{passive:true})}
  if(!el._ct){el._ct=1;ctWire(el)}
  if(!ed){CT.cur=CT.a=null}ctPaint()}
function ctBarHtml(ed){const nr=CT.rows.size,R=ctRect();
  const leg=`<span class="csleg"><i class="csk k0">S1</i><i class="csk k1">S2</i><i class="csk k2">S3</i><i class="csk k3">S4</i><span>Borde = vaciado (✓ liberado · ◷ programado)</span><span><i class="csr">R</i> restricción</span><span>Tachado = no cumplido</span></span>`;
  if(!ed)return leg;
  if(nr)return`<b>${nr} fila${nr>1?'s':''}</b><button type="button" class="ib" data-ctra="ins" title="Insertar una fila debajo">Insertar debajo</button><button type="button" class="ib" data-ctra="copy" title="Ctrl+C: copia las filas con sus días">Copiar filas</button>${CT.rclip?'<button type="button" class="ib" data-ctra="paste" title="Ctrl+V: pega debajo de la selección">Pegar debajo</button>':''}<button type="button" class="ib" data-ctra="up">▲</button><button type="button" class="ib" data-ctra="dn">▼</button>${nr===1?'<button type="button" class="ib" data-ctra="ren">Nombre y ejecutor…</button>':''}<button type="button" class="ib" data-ctra="del">Eliminar</button><button type="button" class="ib" data-ctra="x">✕</button>`;
  const clip=CT.clip?`<span class="note">${CT.clip.cells.length} celda(s) ${CT.clip.cut?'cortadas':'copiadas'}: elige una celda y Ctrl+V.</span>`:CT.rclip?`<span class="note">${CT.rclip.rows.length} fila(s) copiadas.</span>`:'';
  if(R&&(R.r1>R.r0||R.d1>R.d0))return`<b>${(R.r1-R.r0+1)*(R.d1-R.d0+1)} celdas</b><button type="button" class="ib" data-cta="copy" title="Ctrl+C">Copiar</button><button type="button" class="ib" data-cta="cut" title="Ctrl+X">Cortar</button><button type="button" class="ib" data-cta="del" title="Supr">Borrar</button><button type="button" class="ib" data-cta="l" title="Alt+←">‹ 1 día</button><button type="button" class="ib" data-cta="r" title="Alt+→">1 día ›</button><button type="button" class="ib" data-cta="x" title="Esc">✕</button>${clip}`;
  return leg+clip+(CT.clip||CT.rclip?'<button type="button" class="ib" data-cta="clr">Olvidar copia</button>':'')}
const ctRedraw=()=>{const el=document.getElementById('trw');if(el)el._h='';requestRender()};

/* ---------- selección ---------- */
function ctRect(){const c=CT.cur;if(!c)return null;const a=CT.a&&CT.a.fid===c.fid?CT.a:c;return{fid:c.fid,r0:Math.min(a.ri,c.ri),r1:Math.max(a.ri,c.ri),d0:Math.min(a.di,c.di),d1:Math.max(a.di,c.di)}}
const ctTd=c=>c?document.querySelector(`#ctw tr[data-ctf="${CSS.escape(c.fid)}"][data-ri="${c.ri}"] td[data-di="${c.di}"]`):null;
function ctPaint(){const w=document.getElementById('ctw');if(!w)return;
  w.querySelectorAll('.ctin,.ctact,.ctfp').forEach(t=>t.classList.remove('ctin','ctact','ctfp'));w.querySelectorAll('.ctfh').forEach(t=>t.remove());
  const R=ctRect();if(R&&!ctTd(CT.cur)){CT.cur=CT.a=null}
  else if(R){for(const tr of w.querySelectorAll(`tr[data-ctf="${CSS.escape(R.fid)}"][data-ri]`)){const ri=+tr.dataset.ri;if(ri<R.r0||ri>R.r1)continue;for(const td of tr.querySelectorAll('td.ctc')){const di=+td.dataset.di;if(di>=R.d0&&di<=R.d1)td.classList.add('ctin')}}
    ctTd(CT.cur).classList.add('ctact');const br=ctTd({fid:R.fid,ri:R.r1,di:R.d1});if(br&&!CT.drag)br.insertAdjacentHTML('beforeend','<i class="ctfh" data-ctfh="1" title="Arrastra a la derecha para rellenar en serie"></i>');
    if(CT.drag&&CT.drag.prev)for(const k of CT.drag.prev){const i=k.indexOf('|');const td=ctTd({fid:R.fid,ri:+k.slice(0,i),di:+k.slice(i+1)});if(td)td.classList.add('ctfp')}}
  const b=document.getElementById('ctbar');if(b){const h=ctBarHtml(ctEd());if(b._h!==h){b.innerHTML=h;b._h=h}}ctEdPlace()}
function ctSelect(c,extend){if(extend&&CT.cur&&CT.cur.fid===c.fid){if(!CT.a)CT.a=CT.cur;CT.cur=c}else{CT.cur=c;CT.a=null}if(CT.rows.size){CT.rows.clear();document.querySelectorAll('#ctw tr.ctrs').forEach(t=>t.classList.remove('ctrs'))}ctPaint()}
function ctScroll(){const td=ctTd(CT.cur);if(td&&td.scrollIntoView)td.scrollIntoView({block:'nearest',inline:'nearest'})}
const ctRowAt=(fid,ri)=>ctRows(fid)[ri];

/* ---------- escribir en la celda ---------- */
/** sectores que se pueden escribir en la fila: los de los niveles del frente (del grupo de la partida, si lo tiene) */
function ctCands(fid,row){const g=ctGrpOf(row);const out=[];for(const p of ctLevels(fid))for(const gg of(g?[g]:CSG_ORD))for(const a of ctSecs(p.id,gg,fid))out.push(a);return out}
const ctLvTags=a=>{const s=csSecOf(a),p=S.pis.get(s&&s.pisoId);const t=String(csPisoTag(p,(s&&s.grp)||'')).toUpperCase().replace(/\s/g,'');const n=t.replace(/\D/g,'');return n&&n!==t?[t,n]:[t]};
/** nivel de un sector escrito sin nivel: el del último chip a la izquierda en la fila (si el sector va antes que ese, el nivel siguiente); sin nada, el piso elegido arriba o el primero */
function ctLvFor(fid,row,code,ri,di,prev,C){const same=C.filter(a=>String(a.code).toUpperCase()===code);if(!same.length)return null;
  let last=prev||null;if(!last){const ws=ctWS();for(let k=di-1;k>=0&&!last;k--){const L=wsCell(ws,fid,row.k,CT.days[k]);if(L.length)last=S.amb.get(L[L.length-1].ambId)}}
  const lvOf=a=>ctLvIdx(fid,a);
  if(!last){const p=U.piso&&same.find(a=>(csSecOf(a)||{}).pisoId===U.piso);return p||same.slice().sort((x,y)=>lvOf(x)-lvOf(y))[0]}
  const li=lvOf(last),sl=csSecOf(last);const at=l=>same.filter(a=>lvOf(a)===l)[0];
  const here=at(li);if(here&&(csSecOf(here)||{}).grp===(sl||{}).grp&&csAmbIdx(here)<csAmbIdx(last)){for(let l=li+1;l<ctLevels(fid).length;l++){const n=at(l);if(n)return n}return here}
  if(here)return here;for(let l=li+1;l<ctLevels(fid).length;l++){const n=at(l);if(n)return n}return same[0]}
/** interpreta lo escrito: «S1», «S1 S2», «T3 S1», «T3S1», «3S1», «T3·S1» → [amb] o {bad} */
function ctParse(txt,fid,row,ri,di){const C=ctCands(fid,row);const out=[];let lv=null;
  const toks=String(txt||'').toUpperCase().replace(/·/g,' ').split(/[\s,;]+/).filter(Boolean);
  for(const t of toks){const lvHit=C.filter(a=>ctLvTags(a).includes(t));if(lvHit.length&&!C.some(a=>String(a.code).toUpperCase()===t)){lv=new Set(lvHit.map(a=>csSecOf(a).pisoId));continue}
    let hit=C.filter(a=>{const code=String(a.code).toUpperCase();return t.endsWith(code)&&t.length>code.length&&ctLvTags(a).includes(t.slice(0,t.length-code.length))});
    if(!hit.length&&lv)hit=C.filter(a=>String(a.code).toUpperCase()===t&&lv.has(csSecOf(a).pisoId));
    if(hit.length){out.push(hit[0]);continue}
    if(C.some(a=>String(a.code).toUpperCase()===t)){const a=ctLvFor(fid,row,t,ri,di,out[out.length-1],C);if(a){out.push(a);continue}}
    return{bad:t,out}}
  return{out}}
function ctSugs(){const E=CT.ed;if(!E)return[];const row=ctRowAt(E.fid,E.ri);if(!row)return[];const v=E.inp.value.toUpperCase().replace(/·/g,' ');const last=(v.match(/[^\s,;]*$/)||[''])[0];const pre=v.slice(0,v.length-last.length);
  const C=ctCands(E.fid,row);const codes=[...new Set(C.map(a=>String(a.code).toUpperCase()))];const out=[];
  for(const code of codes){let lvp=null;if(last&&!code.startsWith(last)){for(let n=1;n<=last.length;n++){const lp=last.slice(0,n),sp=last.slice(n);if(code.startsWith(sp)&&C.some(a=>ctLvTags(a).includes(lp))){lvp=lp;break}}if(lvp==null)continue}
    const t=(pre+(lvp||'')+code).trim();const p=ctParse(t,E.fid,row,E.ri,E.di);const a=p.out[p.out.length-1];if(!p.bad&&a)out.push({t,a})}
  return out.slice(0,8)}
function ctEdit(ch){const c=CT.cur;if(!c||!ctEd())return;const d=CT.days[c.di];if(!isWork(d)){toast(nwReason(d)+': no es día laborable.');return}if(ctLock(d)){toast(LOCKMSG);return}
  const row=ctRowAt(c.fid,c.ri);if(!row)return;ctEdEnd();const ws=ctWS();const cur=wsCell(ws,c.fid,row.k,d);
  const inp=document.createElement('input');inp.className='ctedi qin';inp.autocomplete='off';inp.spellcheck=false;inp.setAttribute('aria-label',`Sector de ${row.name} el ${fmtD(d)}`);
  inp.value=ch!=null?ch:cur.map(y=>ctTag(S.amb.get(y.ambId)).replace('·',' ')).join(', ');document.body.appendChild(inp);
  const sg=document.createElement('div');sg.className='ctsug';document.body.appendChild(sg);
  CT.ed={...c,inp,sg,k:0,orig:inp.value};inp.addEventListener('input',()=>{CT.ed.k=0;ctSugDraw()});inp.addEventListener('keydown',ctEdKey);inp.addEventListener('blur',()=>setTimeout(()=>{if(CT.ed&&CT.ed.inp===inp)ctEdCommit(0)},120));
  ctEdPlace();inp.focus();if(ch==null)inp.select();ctSugDraw()}
function ctEdPlace(){const E=CT.ed;if(!E)return;const td=ctTd(E);if(!td){return}const r=td.getBoundingClientRect();E.inp.style.left=r.left+'px';E.inp.style.top=r.top+'px';E.inp.style.minWidth=Math.max(r.width,130)+'px';E.inp.style.height=r.height+'px';
  const h=E.sg.offsetHeight;const below=r.bottom+2;E.sg.style.left=Math.max(4,Math.min(r.left,innerWidth-E.sg.offsetWidth-6))+'px';E.sg.style.top=(below+h>innerHeight-4?Math.max(4,r.top-h-2):below)+'px'}
function ctSugDraw(){const E=CT.ed;if(!E)return;const L=ctSugs();E.k=Math.min(E.k,Math.max(0,L.length-1));const row=ctRowAt(E.fid,E.ri);const p=ctParse(E.inp.value,E.fid,row,E.ri,E.di);
  E.sg.innerHTML=L.map((o,i)=>`<button type="button" class="${i===E.k?'on':''}" data-ctsg="${i}"><span>${esc(o.t)}</span><b>→ ${esc(ctTag(o.a))}</b></button>`).join('')+
    `<div class="ctsh">${p.bad&&!L.length?`No reconozco «${esc(p.bad)}» en este frente.<br>`:''}Enter guarda y pasa al día siguiente · Esc cancela${E.inp.value?'':' · vacío + Enter borra'}<br>Otro nivel: escribe <b>T3 S1</b> o <b>3S1</b></div>`;
  E.sg._L=L;ctEdPlace()}
function ctEdKey(e){const E=CT.ed;if(!E)return;const L=E.sg._L||[];
  if(e.key==='ArrowDown'&&L.length){e.preventDefault();E.k=Math.min(L.length-1,E.k+1);ctSugDraw();return}
  if(e.key==='ArrowUp'&&L.length){e.preventDefault();E.k=Math.max(0,E.k-1);ctSugDraw();return}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ctEdEnd();ctPaint();return}
  if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopPropagation();ctEdCommit(e.shiftKey?-1:1)}}
/** guarda lo escrito en la celda: quita los sectores que ya no están y agrega los nuevos (un Deshacer); mv: columna a la que pasa */
function ctEdCommit(mv){const E=CT.ed;if(!E)return;const row=ctRowAt(E.fid,E.ri);const d=CT.days[E.di];const v=E.inp.value.trim();const L=E.sg._L||[];
  if(!row){ctEdEnd();return}
  let p=ctParse(v,E.fid,row,E.ri,E.di);if(p.bad&&L[E.k])p=ctParse(L[E.k].t,E.fid,row,E.ri,E.di);else if(!p.bad&&v&&L[E.k]&&!/\d$/.test(v))p=ctParse(L[E.k].t,E.fid,row,E.ri,E.di);
  if(p.bad){if(mv){toast(`No reconozco «${p.bad}». Escribe un sector de este frente, p. ej. ${(ctCands(E.fid,row)[0]||{}).code||'S1'}.`);return}ctEdEnd();ctPaint();return}
  const fid=E.fid;ctEdEnd();
  if(v!==E.orig){const ws=ctWS();const want=new Set(p.out.map(a=>a.id));
    for(const y of wsCell(ws,fid,row.k,d))if(!want.has(y.ambId))wsDel(ws,fid,row.k,y,d);
    for(const a of p.out)wsAdd(ws,fid,row,a.id,d);const ops=wsOps(ws);if(ops.length)apply(ops,`Tren: ${row.name} ${fmtD(d)}`)}
  if(mv){let di=E.di;do{di+=mv}while(di>=0&&di<CT.days.length&&!isWork(CT.days[di]));if(di>=0&&di<CT.days.length){CT.cur={fid,ri:E.ri,di};CT.a=null}}
  ctPaint();ctScroll()}
function ctEdEnd(){const E=CT.ed;if(!E)return;CT.ed=null;E.inp.remove();E.sg.remove();setTimeout(()=>{if(typeof flushDeferred==='function')flushDeferred()},0)}

/* ---------- borrar, copiar, cortar, pegar, mover ---------- */
function ctClear(){const R=ctRect();if(!R)return;const Rw=ctRows(R.fid);const ws=ctWS();let lk=0;
  for(let ri=R.r0;ri<=R.r1;ri++){const row=Rw[ri];if(!row)continue;for(let di=R.d0;di<=R.d1;di++){const d=CT.days[di];const L=wsCell(ws,R.fid,row.k,d);if(!L.length)continue;if(ctLock(d)){lk++;continue}L.forEach(y=>wsDel(ws,R.fid,row.k,y,d))}}
  if(lk)toast(LOCKMSG);const ops=wsOps(ws);if(ops.length){apply(ops,'Tren: borrar');if(!lk)toast('Borrado','Deshacer',undo)}}
function ctCopy(cut){const R=ctRect();if(!R)return;const Rw=ctRows(R.fid);const ws=ctWS();const cells=[];const d0=CT.days[R.d0];
  for(let ri=R.r0;ri<=R.r1;ri++){const row=Rw[ri];if(!row)continue;for(let di=R.d0;di<=R.d1;di++){const d=CT.days[di];for(const y of wsCell(ws,R.fid,row.k,d))cells.push({dr:ri-R.r0,off:wdist(d0,d),ambId:y.ambId,src:{k:row.k,d,id:y.id}})}}
  if(!cells.length){toast('No hay nada que copiar en la selección.');return}CT.clip={fid:R.fid,cells,cut:!!cut};CT.rclip=null;
  toast(`${cells.length} celda(s) ${cut?'cortadas':'copiadas'}: elige dónde pegar y Ctrl+V.`);ctPaint()}
/** pega lo copiado desde la celda activa (dLv: niveles hacia arriba; 1 = «en el nivel siguiente») */
function ctPaste(dLv){const C=CT.clip,c=CT.cur;if(!C||!c)return;const d=CT.days[c.di];if(!isWork(d)){toast(nwReason(d)+': no es día laborable.');return}
  const Rw=ctRows(c.fid);const ws=ctWS();let skip=0,lk=0,n=0;
  if(C.cut)for(const x of C.cells){const y=S.act.get(x.src.id);if(!y||!(y.days||[]).includes(x.src.d))continue;if(ctLock(x.src.d)){lk++;continue}const L=wsRow(ws,C.fid,x.src.k);const z=L.find(q=>q.id===x.src.id);if(z)wsDel(ws,C.fid,x.src.k,z,x.src.d)}
  for(const x of C.cells){const row=Rw[c.ri+x.dr];const amb=row?ctMapAmb(x.ambId,dLv||0,c.fid):null;if(!row||!amb){skip++;continue}const t=wshift(d,x.off);if(ctLock(t)){lk++;continue}if(!isWork(t)){skip++;continue}wsAdd(ws,c.fid,row,amb,t);n++}
  if(!n){toast('Nada que pegar aquí'+(lk?' (días bloqueados)':skip?` (${skip} celda(s) fuera del frente o sin sector equivalente)`:''));return}
  const ops=wsOps(ws);if(C.cut)CT.clip=null;apply(ops,C.cut?'Tren: mover lo cortado':'Tren: pegar');
  const dr=Math.max(...C.cells.map(x=>x.dr)),off=Math.max(...C.cells.map(x=>x.off));const de=CT.days.indexOf(wshift(d,off));CT.a={...c};CT.cur={fid:c.fid,ri:Math.min(Rw.length-1,c.ri+dr),di:de>=0?de:c.di};
  toast(`Pegado${skip||lk?` · ${skip+lk} celda(s) no entraron (fuera del frente, sin sector equivalente o en días bloqueados)`:''}`,'Deshacer',undo);ctPaint()}
/** mueve el bloque seleccionado: dd días hábiles (Alt+← →) o, arrastrando, a otra columna (toD) y otra fila (dr) */
function ctMoveRect(dd,dr,toCol){const R=ctRect();if(!R)return false;const Rw=ctRows(R.fid);const ws=ctWS();const mv=[];dr=dr||0;
  for(let ri=R.r0;ri<=R.r1;ri++){const row=Rw[ri];if(!row)continue;for(let di=R.d0;di<=R.d1;di++){const d=CT.days[di];const L=wsCell(ws,R.fid,row.k,d);if(!L.length)continue;
    const t=toCol!=null?CT.days[di+toCol]:wshift(d,dd);const trow=Rw[ri+dr];if(!t||!trow){toast('No se puede mover fuera de la hoja.');return false}
    if(ctLock(d)||ctLock(t)){toast(LOCKMSG);return false}if(!isWork(t)){toast(`${fmtD(t)}: ${nwReason(t)}, no es día laborable.`);return false}L.forEach(y=>mv.push({row,trow,y,d,t}))}}
  if(!mv.length)return false;const q=mv.map(m=>wsDel(ws,R.fid,m.row.k,m.y,m.d));mv.forEach((m,i)=>wsAdd(ws,R.fid,m.trow,m.y.ambId,m.t,q[i]));
  const ops=wsOps(ws);if(!ops.length)return false;apply(ops,'Tren: mover');
  const sh=c=>{const t=toCol!=null?c.di+toCol:CT.days.indexOf(wshift(CT.days[c.di],dd));return{fid:c.fid,ri:c.ri+dr,di:t>=0?t:c.di}};CT.cur=sh(CT.cur);if(CT.a)CT.a=sh(CT.a);ctPaint();return true}
/** relleno en serie hacia la derecha hasta la columna toDi: cada fila sigue desde su último sector (S1, S2… y el nivel siguiente) con la misma duración por sector */
function ctFillPlan(toDi){const R=ctRect();const out=[];if(!R||toDi<=R.d1)return out;const Rw=ctRows(R.fid);const ws=ctWS();
  for(let ri=R.r0;ri<=R.r1;ri++){const row=Rw[ri];if(!row)continue;const seq=[];for(let di=R.d0;di<=R.d1;di++){if(!isWork(CT.days[di]))continue;const L=wsCell(ws,R.fid,row.k,CT.days[di]);seq.push(L.length?S.amb.get(L[L.length-1].ambId):null)}
    let k=seq.length-1;while(k>=0&&!seq[k])k--;if(k<0)continue;let cur=seq[k],run=1;while(k-run>=0&&seq[k-run]&&seq[k-run].id===cur.id)run++;let rep=run;
    for(let di=R.d1+1;di<=toDi;di++){if(!isWork(CT.days[di]))continue;if(rep>=run){cur=ctNextAmb(cur,R.fid);rep=0;if(!cur)break}rep++;out.push({ri,di,row,amb:cur})}}
  return out}
function ctFillDo(toDi){const P=ctFillPlan(toDi);if(!P.length)return;const R=ctRect();const ws=ctWS();let lk=0;for(const p of P){const d=CT.days[p.di];if(ctLock(d)){lk++;continue}wsAdd(ws,R.fid,p.row,p.amb.id,d)}
  const ops=wsOps(ws);if(ops.length)apply(ops,'Tren: rellenar en serie');CT.cur={...CT.cur,di:toDi};if(!CT.a)CT.a={fid:R.fid,ri:R.r0,di:R.d0};if(CT.a.ri===CT.cur.ri)CT.cur.ri=R.r1;
  toast(`Relleno en serie: ${P.length-lk} celda(s)${lk?` · ${lk} en días bloqueados no entraron`:''}`,'Deshacer',undo);ctPaint()}

/* ---------- filas ---------- */
function ctRowSel(){const fid=CT.rfr;const R=ctRows(fid);const sel=R.filter(r=>CT.rows.has(fid+'|'+r.k));return{fid,R,sel}}
function ctRowActs(fid,k){return ctLive().filter(y=>ctKey(y)===k&&ctFrOfAct(y)===fid)}
function ctPartidaPop(anchor,title,cb){const cats=csCats();
  openPop(anchor,`<div class="ph">${esc(title)}</div><div class="ctpick ctpickw">${cats.map(c=>`<button type="button" data-do="cat" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div><hr><button data-do="other">Otra (escribir el nombre)…</button>`,
    {cat:o=>{const c=MX.cat.get(o.c);if(c)cb({name:c.name,sc:c.sc||'',cat:c.id})},other:async()=>{const n=await uiAsk({title,input:{label:'Nombre de la fila',required:true},ok:'Agregar'});if(n&&String(n).trim())cb({name:String(n).trim(),sc:'',cat:null})}})}
/** inserta una fila nueva junto a refK (debajo, o arriba con above); sin refK, al final */
function ctRowInsert(anchor,fid,refK,above){ctPartidaPop(anchor,above?'Nueva fila arriba':'Nueva fila',r=>{const R=ctRows(fid);const used=new Set(R.map(x=>x.k));const k=r.cat&&!used.has('c:'+r.cat)?'c:'+r.cat:uid('r');
  const i=refK?R.findIndex(x=>x.k===refK):R.length-1;R.splice(above?Math.max(0,i):i+1,0,{k,...r});ctRowsSave(fid,R);CT.rows.clear();toast(`Fila «${r.name}» agregada`)})}
const ctClipRows=(fid,rows)=>({fid,rows:rows.map(r=>({row:{...r},acts:ctRowActs(fid,r.k).map(y=>({ambId:y.ambId,days:(y.days||[]).slice(),und:y.und||'',metrado:y.metrado,sc:y.sc}))}))});
function ctRowCopy(){const{fid,sel}=ctRowSel();if(!sel.length)return;CT.rclip=ctClipRows(fid,sel);CT.clip=null;
  toast(`${sel.length} fila(s) copiadas con sus días: elige dónde pegarlas.`);ctRedraw()}
function ctRowPaste(fid,afterK,clip){const C=clip||CT.rclip;if(!C)return;const R=ctRows(fid);let i=afterK?R.findIndex(x=>x.k===afterK):R.length-1;const ops=[];let skip=0;const t=todayIso();
  for(const it of C.rows){const k=uid('r');const row={...it.row,k};R.splice(++i,0,row);
    for(const a of it.acts){const amb=fid===C.fid?a.ambId:ctMapAmb(a.ambId,0,fid);const ds=a.days.filter(d=>d>t||isAdmin);if(!amb||!ds.length){skip++;continue}
      const o={ambId:amb,sc:a.sc||row.sc||'',name:row.name,und:a.und,days:ds,order:99,trw:k};if(a.metrado>0){o.metrado=a.metrado;o.qa=true;const q={};ds.forEach(d=>q[d]=Math.round(a.metrado/ds.length*100)/100);o.qty=q}ops.push(op('acts',uid('a'),o))}}
  ctRowsSave(fid,R);if(ops.length)apply(ops,`Tren: pegar ${C.rows.length} fila(s)`);CT.rows.clear();
  toast(`${C.rows.length} fila(s) ${clip?'duplicada(s)':'pegadas'}${skip?` · ${skip} actividad(es) no entraron (días pasados o sin sector equivalente)`:''}`,ops.length?'Deshacer':null,ops.length?undo:null)}
function ctRowDup(fid,k,withDays){const R=ctRows(fid);const r=R.find(x=>x.k===k);if(!r)return;
  if(withDays){ctRowPaste(fid,k,ctClipRows(fid,[r]));return}R.splice(R.indexOf(r)+1,0,{...r,k:uid('r')});ctRowsSave(fid,R);toast('Fila duplicada vacía')}
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
function ctRowPick(fid,k){CT.cur=CT.a=null;if(CT.rfr!==fid){CT.rows.clear();CT.rfr=fid}CT.rows=new Set([fid+'|'+k])}

/* ---------- menús (clic derecho y ⋯ del frente) ---------- */
function ctRowMenu(anchor,fid,k){const R=ctRows(fid);const r=R.find(x=>x.k===k);if(!r)return;
  openPop(anchor,`<div class="ph">${esc(r.name)}</div><button data-do="up">Insertar fila arriba</button><button data-do="dn">Insertar fila abajo</button><button data-do="dupd">Duplicar con sus días</button><button data-do="dupv">Duplicar vacía</button>${CT.rclip?'<button data-do="paste">Pegar filas debajo</button>':''}<hr><button data-do="ren">Nombre y ejecutor…</button><button data-do="mu">Subir</button><button data-do="md">Bajar</button><hr><button data-do="del">Eliminar fila…</button>`,
    {up:()=>ctRowInsert(anchor,fid,k,true),dn:()=>ctRowInsert(anchor,fid,k,false),dupd:()=>ctRowDup(fid,k,true),dupv:()=>ctRowDup(fid,k,false),paste:()=>ctRowPaste(fid,k),
     ren:()=>{ctRowPick(fid,k);ctRowRen(anchor)},mu:()=>{ctRowPick(fid,k);ctRowMove(-1)},md:()=>{ctRowPick(fid,k);ctRowMove(1)},del:()=>{ctRowPick(fid,k);ctRowDel()}})}
function ctCellMenu(td){const c=CT.cur;if(!c)return;const row=ctRowAt(c.fid,c.ri);const chips=row?wsCell(ctWS(),c.fid,row.k,CT.days[c.di]):[];
  openPop(td,`<button data-do="cp">Copiar <kbd>Ctrl+C</kbd></button><button data-do="ct">Cortar <kbd>Ctrl+X</kbd></button>${CT.clip?'<button data-do="ps">Pegar <kbd>Ctrl+V</kbd></button><button data-do="ps1">Pegar en el nivel siguiente</button>':''}<hr><button data-do="ed">Escribir… <kbd>F2</kbd></button><button data-do="dl">Borrar <kbd>Supr</kbd></button><button data-do="ml">Un día antes <kbd>Alt+←</kbd></button><button data-do="mr">Un día después <kbd>Alt+→</kbd></button>${chips.length?`<hr>${chips.map(y=>`<button data-do="fi" data-a="${esc(y.id)}">Ficha de ${esc(ctTag(S.amb.get(y.ambId)))}</button>`).join('')}`:''}`,
    {cp:()=>ctCopy(),ct:()=>ctCopy(true),ps:()=>ctPaste(0),ps1:()=>ctPaste(1),ed:()=>ctEdit(null),dl:()=>ctClear(),ml:()=>ctMoveRect(-1),mr:()=>ctMoveRect(1),fi:o=>ctFicha(td,o.a)})}
function ctFrMenu(btn,fid){openPop(btn,`<div class="ph">${esc(ctFrName(fid))}</div><button data-do="pj" data-ctp="${esc(fid)}">⇡ Proyectar a los niveles siguientes…</button><button data-do="add">+ Fila al final</button>${CT.rclip?'<button data-do="paste">Pegar filas al final</button>':''}`,
  {pj:()=>ctProjOpen(fid),add:()=>ctRowInsert(btn,fid,null),paste:()=>ctRowPaste(fid,null)})}

/* ---------- Proyectar: cada fila continúa su serie desde el nivel modelo hasta el nivel elegido ---------- */
/** cfg {model, to, gap (días hábiles entre niveles), rep (reemplazar lo programado desde mañana en los niveles siguientes)} */
function ctProjPlan(fid,cfg){const LV=ctLevels(fid);const m=LV.findIndex(p=>p.id===cfg.model),to=LV.findIndex(p=>p.id===cfg.to);const out={ops:[],add:0,rem:0,past:0,rows:0,per:[],cruce:0,warn:''};
  if(m<0||to<=m){out.warn='Elige un nivel destino por encima del modelo.';return out}
  const ws=ctWS();const R=ctRows(fid);const t=todayIso();const gap=Math.max(0,+cfg.gap||0);const per=LV.map(p=>({id:p.id,tag:p.tc||p.code||p.name,had:0,nw:0,rem:0}));
  for(const row of R){const L=wsRow(ws,fid,row.k);const inM=L.filter(y=>ctLvIdx(fid,S.amb.get(y.ambId))===m&&(y.days||[]).length);if(!inM.length)continue;out.rows++;
    /* último sector del modelo en la fila y cuántos días dura */
    let lastD='',last=null;for(const y of inM){const d=y.days[y.days.length-1];const a=S.amb.get(y.ambId);if(d>lastD||(d===lastD&&csAmbIdx(a)>csAmbIdx(last))){lastD=d;last=a}}
    const lx=inM.find(y=>y.ambId===last.id);let run=1;while((lx.days||[]).includes(wshift(lastD,-run)))run++;
    for(const y of L){const li=ctLvIdx(fid,S.amb.get(y.ambId));if(li>m&&li<=to)per[li].had+=(y.days||[]).filter(d=>d>t).length}
    const keep=new Set();let cur=last,day=lastD;
    for(;;){const nx=ctNextAmb(cur,fid);if(!nx)break;const li=ctLvIdx(fid,nx);if(li>to)break;if(li!==ctLvIdx(fid,cur))day=wshift(day,gap);cur=nx;
      for(let k=0;k<run;k++){day=wshift(day,1);if(ctLock(day)){out.past++;continue}keep.add(nx.id+'|'+day);const had=wsRow(ws,fid,row.k).some(y=>y.ambId===nx.id&&y.days.includes(day));if(had)continue;wsAdd(ws,fid,row,nx.id,day);per[li].nw++;out.add++}}
    /* reemplazar: en los niveles siguientes se quita lo programado desde mañana que no coincide con la serie */
    if(cfg.rep)for(const y of wsRow(ws,fid,row.k).slice()){const li=ctLvIdx(fid,S.amb.get(y.ambId));if(li<=m||li>to)continue;for(const d of y.days.slice())if(d>t&&!ctLock(d)&&!keep.has(y.ambId+'|'+d)){wsDel(ws,fid,row.k,y,d);per[li].rem++;out.rem++}}}
  if(!out.rows){out.warn='Ninguna fila de este frente tiene sectores programados en el nivel modelo.';return out}
  /* aviso (no bloquea): el nivel siguiente empieza en un sector antes de vaciar la losa de ese sector en el nivel de abajo */
  const vacRows=R.filter(r=>{const c=r.cat?MX.cat.get(r.cat):null;return c&&c.vac&&c.grp!=='A'});
  if(vacRows.length){const first=new Map();for(const row of R)for(const y of wsRow(ws,fid,row.k)){if(!y.days.length)continue;const a=S.amb.get(y.ambId),s=csSecOf(a);const key=ctLvIdx(fid,a)+'|'+(s&&s.grp)+'|'+csAmbIdx(a);const d=y.days[0];if(!first.has(key)||d<first.get(key))first.set(key,d)}
    for(const row of vacRows)for(const y of wsRow(ws,fid,row.k)){if(!y.days.length)continue;const a=S.amb.get(y.ambId),s=csSecOf(a);const li=ctLvIdx(fid,a);if(li<m||li>=to)continue;const nx=first.get((li+1)+'|'+(s&&s.grp)+'|'+csAmbIdx(a));if(nx&&nx<=y.days[y.days.length-1]&&nx>t)out.cruce++}}
  out.ops=wsOps(ws);out.per=per.filter((p,i)=>i>=m&&i<=to&&(p.had||p.nw||p.rem));return out}
function ctProjOpen(fid){if(!ctEd()){toast('Para proyectar entra a ✎ Programar.');return}const LV=ctLevels(fid);
  const withActs=new Set(ctLive().filter(y=>ctFrOfAct(y)===fid&&(y.days||[]).length).map(y=>(csSecOf(S.amb.get(y.ambId))||{}).pisoId));
  const model=(LV.find(p=>withActs.has(p.id))||LV[0]||{}).id;if(!model){toast('Este frente no tiene niveles.');return}
  const lv=sel=>LV.map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.tc||p.code||'')} · ${esc(p.name)}${withActs.has(p.id)?' ●':''}</option>`).join('');
  const m=document.createElement('div');m.className='lqm';m.id='ctpm';m.innerHTML=`<div class="lqc csgen" role="dialog" aria-modal="true" aria-labelledby="ctpt"><h3 id="ctpt">Proyectar el tren · ${esc(ctFrName(fid))}</h3>
    <p class="note">Cada fila continúa su serie desde el último sector que tiene en el nivel modelo: el sector siguiente, y al terminar los sectores, el nivel siguiente. Cada sector dura lo mismo que en la fila (si pusiste S1 dos días, todos duran dos). Hoy y lo pasado no se tocan; se deshace con un solo Deshacer.</p>
    <div class="csgf"><label>Nivel modelo<select id="ctp_m">${lv(model)}</select></label><label>Proyectar hasta<select id="ctp_to">${lv((LV[LV.length-1]||{}).id)}</select></label>
    <label>Días hábiles entre niveles<input type="number" id="ctp_g" min="0" max="60" value="0"></label></div>
    <label class="chk"><input type="checkbox" id="ctp_rep" checked> Reemplazar lo programado desde mañana en los niveles siguientes</label>
    <div class="callout" id="ctp_prev" aria-live="polite"></div>
    <div class="csrow"><span style="flex:1"></span><button class="ib" data-ctp2="x">Cancelar</button><button class="ib pri" data-ctp2="ok">Proyectar</button></div></div>`;
  document.body.appendChild(m);const cfg=()=>({model:$('#ctp_m').value,to:$('#ctp_to').value,gap:+$('#ctp_g').value||0,rep:$('#ctp_rep').checked});
  const prev=()=>{const pl=ctProjPlan(fid,cfg());const rep=$('#ctp_rep').checked;
    $('#ctp_prev').innerHTML=pl.warn?esc(pl.warn):`<table class="ctpt"><thead><tr><th>Nivel</th><th>Ya tenía desde mañana</th><th>Se agregan</th><th>Se quitan</th></tr></thead><tbody>${pl.per.map(p=>`<tr><td><b>${esc(p.tag)}</b></td><td>${p.had?p.had+' día(s)':'—'}</td><td>${p.nw||'—'}</td><td>${p.rem||'—'}</td></tr>`).join('')||'<tr><td colspan="4">Sin cambios.</td></tr>'}</tbody></table>${!pl.ops.length?'<p class="note">Ya está proyectado así: no hay cambios.</p>':''}${!rep&&pl.per.some(p=>p.had)?'<p class="note">Sin «Reemplazar», lo que ya estaba programado se conserva junto a lo nuevo.</p>':''}${pl.past?`<p class="note">${pl.past} día(s) caían en hoy o en el pasado y no se programan.</p>`:''}${pl.cruce?`<p class="ctwarn">⚠ En ${pl.cruce} sector(es) el nivel siguiente empieza antes de vaciar la losa de ese sector en el nivel de abajo. Si no es lo que quieres, sube los días entre niveles.</p>`:''}`;return pl};
  prev();m.addEventListener('change',prev);m.addEventListener('input',e=>{if(e.target.type==='number')prev()});const close=()=>m.remove();m.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  m.addEventListener('click',e=>{if(e.target===m){close();return}const b=e.target.closest('[data-ctp2]');if(!b)return;if(b.dataset.ctp2==='x'){close();return}const pl=prev();if(pl.warn||!pl.ops.length){toast(pl.warn||'Ya está proyectado así: no hay cambios.');return}close();
    apply(pl.ops,`Proyectar el tren (${pl.add} días)`);toast(`Tren proyectado: ${pl.add} día(s) programados${pl.rem?`, ${pl.rem} reemplazados`:''}`,'Deshacer',undo)});
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
const ctCellOf=t=>{const td=t&&t.closest&&t.closest('td.ctc');if(!td)return null;const tr=td.closest('tr[data-ri]');return tr?{fid:tr.dataset.ctf,ri:+tr.dataset.ri,di:+td.dataset.di,td}:null};
function ctWire(el){
  el.addEventListener('pointerdown',e=>{if(!CS()||!ctEd()||e.button!==0)return;const t=e.target;if(t.closest('.ctedi,.ctsug'))return;
    if(t.dataset&&t.dataset.ctfh){e.preventDefault();CT.drag={k:'fill',prev:new Set()};DRAGGING=true;return}
    CT.pt=e.pointerType;const c=ctCellOf(t);if(!c)return;if(CT.ed)ctEdCommit(0);
    if(e.pointerType!=='mouse'){/* táctil: un toque elige la celda; otro toque en la misma, escribir */if(CT.cur&&CT.cur.fid===c.fid&&CT.cur.ri===c.ri&&CT.cur.di===c.di&&!CT.a){CT.touchEd=true}return}
    e.preventDefault();const R=ctRect();
    if(R&&!e.shiftKey&&R.fid===c.fid&&c.ri>=R.r0&&c.ri<=R.r1&&c.di>=R.d0&&c.di<=R.d1&&(R.r0!==R.r1||R.d0!==R.d1)){CT.drag={k:'move',a:c,d:{r:0,c:0},prev:new Set()};DRAGGING=true;return}
    ctSelect({fid:c.fid,ri:c.ri,di:c.di},e.shiftKey);CT.drag={k:'sel'};DRAGGING=true});
  el.addEventListener('click',e=>{if(!CS())return;const t=e.target;const ed=ctEd();
    const fm=t.closest('[data-ctfm]');if(fm){ctFrMenu(fm,fm.dataset.ctfm);return}
    const ba=t.closest('[data-cta]');if(ba){const k=ba.dataset.cta;if(k==='l')ctMoveRect(-1);else if(k==='r')ctMoveRect(1);else if(k==='del')ctClear();else if(k==='copy')ctCopy();else if(k==='cut')ctCopy(true);else if(k==='x'){CT.a=null;ctPaint()}else if(k==='clr'){CT.clip=null;CT.rclip=null;ctRedraw()}return}
    const br=t.closest('[data-ctra]');if(br){const k=br.dataset.ctra;const{fid,sel}=ctRowSel();if(k==='ins')ctRowInsert(br,fid,sel.length?sel[sel.length-1].k:null);else if(k==='copy')ctRowCopy();else if(k==='paste')ctRowPaste(fid,sel.length?sel[sel.length-1].k:null);
      else if(k==='up')ctRowMove(-1);else if(k==='dn')ctRowMove(1);else if(k==='ren')ctRowRen(br);else if(k==='del')ctRowDel();else if(k==='x'){CT.rows.clear();ctRedraw()}return}
    const ch=t.closest('[data-csa]');if(ch&&!ed){e.stopPropagation();ctFicha(ch,ch.dataset.csa);return}
    if(!ed)return;
    const lab=t.closest('td.ctlab');if(lab){const tr=lab.closest('tr[data-ctr]');const fid=tr.dataset.ctf,k=tr.dataset.ctr;const key=fid+'|'+k;CT.cur=CT.a=null;
      if(CT.rfr!==fid){CT.rows.clear();CT.rfr=fid}
      if(e.shiftKey&&CT.rows.size){const R=ctRows(fid).map(r=>r.k);const idx=[...CT.rows].map(x=>R.indexOf(x.slice(fid.length+1))).filter(i=>i>=0);const i0=Math.min(...idx,R.indexOf(k)),i1=Math.max(...idx,R.indexOf(k));for(let i=i0;i<=i1;i++)CT.rows.add(fid+'|'+R[i])}
      else if(e.ctrlKey||e.metaKey){if(CT.rows.has(key))CT.rows.delete(key);else CT.rows.add(key)}else CT.rows=new Set(CT.rows.size===1&&CT.rows.has(key)?[]:[key]);ctRedraw();return}
    const c=ctCellOf(t);if(c&&CT.pt&&CT.pt!=='mouse'){/* táctil */if(CT.touchEd){CT.touchEd=false;ctEdit(null)}else ctSelect({fid:c.fid,ri:c.ri,di:c.di},false)}});
  el.addEventListener('dblclick',e=>{if(!ctEd())return;const c=ctCellOf(e.target);if(c){e.preventDefault();CT.cur={fid:c.fid,ri:c.ri,di:c.di};CT.a=null;ctPaint();ctEdit(null);return}
    const ch=e.target.closest('[data-csa]');if(ch){e.preventDefault();ctFicha(ch,ch.dataset.csa)}});
  el.addEventListener('contextmenu',e=>{if(!CS()||!ctEd())return;const t=e.target;
    const lab=t.closest('td.ctlab');if(lab){e.preventDefault();const tr=lab.closest('tr[data-ctr]');ctRowMenu(lab,tr.dataset.ctf,tr.dataset.ctr);return}
    const c=ctCellOf(t);if(!c)return;e.preventDefault();const R=ctRect();if(!(R&&R.fid===c.fid&&c.ri>=R.r0&&c.ri<=R.r1&&c.di>=R.d0&&c.di<=R.d1))ctSelect({fid:c.fid,ri:c.ri,di:c.di},false);ctCellMenu(c.td)})}
document.addEventListener('pointermove',e=>{const D=CT.drag;if(!D)return;const el=document.elementFromPoint(e.clientX,e.clientY);const c=ctCellOf(el);if(!c||!CT.cur||c.fid!==CT.cur.fid)return;
  if(D.k==='sel'){if(CT.cur.ri!==c.ri||CT.cur.di!==c.di){if(!CT.a)CT.a=CT.cur;CT.cur={fid:c.fid,ri:c.ri,di:c.di};ctPaint()}}
  else if(D.k==='fill'){if(D.to!==c.di){D.to=c.di;D.prev=new Set(ctFillPlan(c.di).map(p=>p.ri+'|'+p.di));ctPaint()}}
  else if(D.k==='move'){const d={r:c.ri-D.a.ri,c:c.di-D.a.di};if(d.r!==D.d.r||d.c!==D.d.c){D.d=d;const R=ctRect();D.prev=new Set();for(let ri=R.r0;ri<=R.r1;ri++)for(let di=R.d0;di<=R.d1;di++)D.prev.add((ri+d.r)+'|'+(di+d.c));ctPaint()}}});
document.addEventListener('pointerup',()=>{const D=CT.drag;if(!D)return;CT.drag=null;DRAGGING=false;
  if(D.k==='fill'&&D.to!=null)ctFillDo(D.to);else if(D.k==='move'&&(D.d.r||D.d.c)){if(!ctMoveRect(0,D.d.r,D.d.c))ctPaint()}else ctPaint();setTimeout(()=>{if(typeof flushDeferred==='function')flushDeferred()},0)});
document.addEventListener('pointerdown',e=>{if(CT.ed&&!e.target.closest('.ctedi,.ctsug,td.ctc'))ctEdCommit(0)},true);
document.addEventListener('mousedown',e=>{const b=e.target.closest&&e.target.closest('.ctsug [data-ctsg]');if(b&&CT.ed){e.preventDefault();const L=CT.ed.sg._L||[];const o=L[+b.dataset.ctsg];if(o){CT.ed.inp.value=o.t;CT.ed.k=+b.dataset.ctsg;ctEdCommit(1)}}},true);
document.addEventListener('keydown',e=>{if(!CS()||U.tab!=='look'||U.lkV!=='tren'||!ctEd()||CT.ed)return;const a=document.activeElement;if(a&&(/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)||a.isContentEditable))return;if(document.querySelector('.lqm'))return;
  if(typeof pop!=='undefined'&&!pop.hidden)return;
  const mod=e.ctrlKey||e.metaKey;const stop=()=>{e.preventDefault();e.stopPropagation()};
  if(CT.rows.size){if(mod&&e.key.toLowerCase()==='c'){stop();ctRowCopy();return}
    if(mod&&e.key.toLowerCase()==='v'&&CT.rclip){stop();const{fid,sel}=ctRowSel();ctRowPaste(fid,sel.length?sel[sel.length-1].k:null);return}
    if(e.key==='Delete'){stop();ctRowDel();return}if(e.key==='Escape'){CT.rows.clear();ctRedraw();return}return}
  const c=CT.cur;if(!c)return;const N=ctRows(c.fid).length,M=CT.days.length;
  if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){stop();ctMoveRect(e.key==='ArrowLeft'?-1:1);ctScroll();return}
  const mv={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[e.key];
  if(mv&&!mod){stop();const n={fid:c.fid,ri:Math.max(0,Math.min(N-1,c.ri+mv[0])),di:Math.max(0,Math.min(M-1,c.di+mv[1]))};if(e.shiftKey){if(!CT.a)CT.a=c;CT.cur=n}else{CT.cur=n;CT.a=null}ctPaint();ctScroll();return}
  if(e.key==='Delete'||e.key==='Backspace'){stop();ctClear();return}
  if(mod&&e.key.toLowerCase()==='c'){stop();ctCopy();return}if(mod&&e.key.toLowerCase()==='x'){stop();ctCopy(true);return}if(mod&&e.key.toLowerCase()==='v'){stop();ctPaste(0);return}
  if(e.key==='Enter'||e.key==='F2'){stop();ctEdit(null);return}
  if(e.key==='Escape'){if(CT.a){CT.a=null;ctPaint()}else{CT.cur=null;ctPaint()}return}
  if(!mod&&!e.altKey&&e.key.length===1&&/[\p{L}\p{N}]/u.test(e.key)){stop();ctEdit(e.key)}},true);
