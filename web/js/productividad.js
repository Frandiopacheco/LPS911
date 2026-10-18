"use strict";
/* LPS 911 · Productividad, F1: partidas críticas de los subcontratistas (oct 2026, decidido con el dueño; docs/ia/productividad.md).
   - pcrit/{id}: partida crítica de un SC {sc, nom, und, met (metrado total contractual), fin (fecha comprometida), mp:{pisoId:meta}?, ord,
     arch?, by, ts}. La crean y editan el administrador y los ingenieros (canDaily).
   - pav/{fecha}_{pc}_{piso}_{zona|-}: avance ejecutado {pc, sc, d, piso, zona?, q, hh?, nota?, by, byN, ts, h:[últimos cambios], arch?}.
     El SC reporta lo de su partida sin confirmación; los ingenieros pueden editar. Piso obligatorio; sector o ambiente, opcional.
   Este metrado es el sincerado; no se mezcla con el del Lookahead (que mide confiabilidad, no producción).
   Ritmo = promedio de los últimos PV_N días hábiles con datos; fin proyectado y ritmo necesario con el calendario de la obra. */
const PV_N=10,PV_UND=['m²','m³','ml','m','und','kg','pto','glb'];
const PCR=new Map(),PAV=new Map();let pvSubs=null,pvErr=null,PVSEL='';
const pvEd=()=>!!canDaily;                                   /* admin, editor y campo: partidas y edición de cualquier avance */
const pvMine=sc=>!SCK()||myScsI().includes(sc);              /* el SC solo ve y reporta lo de su partida */
const pvN=v=>Number(+v||0).toLocaleString('es-PE',{maximumFractionDigits:2});
function ensurePv(){if(!db||pvSubs)return;
  const put=(M,L,sn)=>{M.clear();L.forEach(x=>M.set(x.id,x));pvErr=null;if(ready)snapRender(sn)};
  const err=e=>{pvErr=e&&e.code||'error';if(ready)requestRender()};
  if(SCK())pvSubs=[scSubs('pcrit',null,null,(L,sn)=>put(PCR,L,sn),err),scSubs('pav',null,null,(L,sn)=>put(PAV,L,sn),err)];
  else pvSubs=['pcrit','pav'].map((c,i)=>{const M=i?PAV:PCR;const off=fcol(c).onSnapshot(sn=>put(M,sn.docs.map(d=>({...d.data(),id:d.id})),sn),err);return off});
  unsubs.push(stopPv)}
function stopPv(){if(pvSubs)pvSubs.forEach(f=>{try{f()}catch(e){}});pvSubs=null;PCR.clear();PAV.clear()}
const pvParts=()=>[...PCR.values()].filter(p=>!p.arch&&pvMine(p.sc)).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name,'es')||(a.ord||0)-(b.ord||0)||String(a.nom).localeCompare(String(b.nom),'es'));
const pvReps=pc=>[...PAV.values()].filter(r=>r.pc===pc&&!r.arch&&+r.q>0);
/** cálculo puro de una partida: acumulado, ritmo, fin proyectado, ritmo necesario y estado */
function pvStats(p,reps,today){const byD=new Map(),byP=new Map();let acu=0,hh=0,hhq=0,first='',ini=0;
  for(const r of reps){const q=+r.q||0;acu+=q;if(r.ini){byP.set(r.piso,(byP.get(r.piso)||0)+q);ini+=q;continue}byD.set(r.d,(byD.get(r.d)||0)+q);byP.set(r.piso,(byP.get(r.piso)||0)+q);if(+r.hh>0){hh+=+r.hh;hhq+=q}if(!first||r.d<first)first=r.d}
  const met=+p.met||0,saldo=Math.max(0,met-acu);
  /* ventana del ritmo: hasta hoy si ya se reportó hoy; si no, hasta el último día hábil anterior */
  let end=byD.has(today)?today:addD(today,-1);while(!isWork(end)&&!byD.has(end)&&end>first)end=addD(end,-1);
  let k=0,sum=0,x=end;if(first)while(k<PV_N&&x>=first){if(isWork(x)){k++}sum+=byD.get(x)||0;x=addD(x,-1)}
  const rit=k?sum/k:0;
  const fin=saldo<=0?'':rit>0?wshift(end,Math.ceil(saldo/rit)):'';
  let nd=0,nec=null;if(p.fin&&saldo>0){let y=byD.has(today)?addD(today,1):today;while(y<=p.fin&&nd<800){if(isWork(y))nd++;y=addD(y,1)}nec=nd?saldo/nd:Infinity}
  const st=!met?'none':saldo<=0?'done':!p.fin?'none':!rit?'nodata':nec===Infinity?'late':rit>=nec?'ok':rit>=nec*.85?'risk':'late';
  return{ini,acu,met,saldo,pct:met?Math.min(100,acu/met*100):0,rit,days:k,fin,nec,st,byD,byP,hh,hhr:hhq?hh/hhq:0,first,today:byD.get(today)||0}}
const PV_ST={ok:['A tiempo','ok'],risk:['En riesgo','warn'],late:['Atrasada','bad'],done:['Terminada','ok'],nodata:['Sin datos',''],none:['Sin fecha comprometida','']};
const pvChip=st=>{const s=PV_ST[st]||PV_ST.none;return`<span class="pvst ${s[1]}">${s[0]}</span>`};
const pvZona=r=>{if(!r.zona)return'Todo el piso';const a=S.amb.get(r.zona);if(a)return`${a.code||''} ${a.name||''}`.trim();const s=S.sec.get(r.zona);return s?`${s.code||''} · ${s.name||''}`:'—'};
const pvWho=r=>r.byN||String(r.by||'').split('@')[0];

function renderProd(main){if(typeof pcOk==='function'&&pcOk()&&!SCK()&&(U.pvV==='casa'||U.pvV==='reg')){renderCasa(main);return}ensurePv();const t=todayIso();const P=pvParts();
  const R=P.map(p=>({p,s:pvStats(p,pvReps(p.id),t)}));if(PVSEL&&!R.some(o=>o.p.id===PVSEL))PVSEL='';
  const cnt=k=>R.filter(o=>o.s.st===k).length,sinHoy=R.filter(o=>o.s.st!=='done'&&!o.s.today);
  const canRep=pvEd()||(SCK()&&P.length);
  const acts=`${canRep?'<button class="ib pri" data-pv="rep">Reportar avance</button>':''}${pvEd()?'<button class="ib" data-pv="new">+ Partida crítica</button>':''}`;
  let h=`<div class="scroll"><div class="wrap pvwrap">${pageHead('Productividad',SCK()?'Avance de tus partidas críticas':'Subcontratistas: avance, ritmo y proyección de sus partidas críticas',acts)}${typeof pvSeg==='function'?pvSeg():''}`;
  h+=helpBox('¿Cómo funciona?',`<p>Cada día el subcontratista reporta el metrado <b>ejecutado de verdad</b> de sus partidas críticas, por piso (sector o ambiente si quiere; las HH son opcionales). Los ingenieros pueden corregirlo.</p><p><b>Ritmo</b> = promedio de los últimos ${PV_N} días hábiles. <b>Fin proyectado</b> = cuándo termina el saldo a ese ritmo. <b>Ritmo necesario</b> = lo que tendría que hacer por día hábil para llegar a la fecha comprometida. Este metrado no es el del Lookahead: aquel mide si se cumplió lo programado; este, cuánto se produce.</p>`);
  if(pvErr)h+=`<div class="callout warn">No se pudieron leer los datos (${esc(pvErr)}). ${pvErr==='permission-denied'?'Falta publicar las reglas nuevas de Firestore.':''}</div>`;
  if(!P.length){h+=`<div class="empty">${pvEd()?'Aún no hay partidas críticas. Crea la primera con «+ Partida crítica» (p. ej. enchape de porcelanato, con su metrado total y la fecha comprometida).':'Aún no hay partidas críticas de tu partida. Las crea el ingeniero.'}</div></div></div>`;main.innerHTML=h;pvWire(main);return}
  h+=`<div class="tiles pvtl"><div class="tile"><span class="k">Partidas críticas</span><span class="v">${P.length}</span></div>
    <div class="tile"><span class="k">A tiempo</span><span class="v pvok">${cnt('ok')}</span></div><div class="tile"><span class="k">En riesgo</span><span class="v pvwarn">${cnt('risk')}</span></div>
    <div class="tile"><span class="k">Atrasadas</span><span class="v pvbad">${cnt('late')}</span></div>
    <div class="tile"><span class="k">Sin reporte de hoy</span><span class="v">${sinHoy.length}</span>${sinHoy.length&&!SCK()?`<small class="pvsub">${esc([...new Set(sinHoy.map(o=>conOf(o.p.sc).name))].slice(0,3).join(' · '))}</small>`:''}</div></div>`;
  h+=`<div class="card pvtw"><div class="pvsc"><table class="t pvt"><thead><tr>${SCK()&&myScsI().length<2?'':'<th>Subcontratista</th>'}<th>Partida crítica</th><th>Und</th><th class="r">Metrado total</th><th class="r">Acumulado</th><th>Avance</th><th class="r">Hoy</th><th class="r" title="Promedio de los últimos ${PV_N} días hábiles">Ritmo / día</th><th class="r" title="Lo que haría falta por día hábil para llegar a la fecha comprometida">Ritmo necesario</th><th>Fin proyectado</th><th>Comprometido</th><th>Estado</th></tr></thead><tbody>`;
  for(const{p,s}of R){const c=conOf(p.sc);
    h+=`<tr class="pvr${PVSEL===p.id?' on':''}" data-pvs="${esc(p.id)}" tabindex="0">${SCK()&&myScsI().length<2?'':`<td><span class="pvsn"><i style="--c:${c.color}"></i>${esc(c.name)}</span></td>`}<td><b>${esc(p.nom||'')}</b></td><td>${esc(p.und||'')}</td>
      <td class="r m">${pvN(s.met)}</td><td class="r m">${pvN(s.acu)}</td><td><span class="pvbar"><i style="width:${s.pct.toFixed(1)}%;--c:${c.color}"></i></span><small class="m">${Math.round(s.pct)}%</small></td>
      <td class="r m">${s.today?pvN(s.today):'<span class="mu">—</span>'}</td><td class="r m">${s.rit?pvN(Math.round(s.rit*10)/10):'—'}</td>
      <td class="r m">${s.nec==null?'—':s.nec===Infinity?'<span class="pvbad">vencida</span>':pvN(Math.round(s.nec*10)/10)}</td>
      <td><b>${s.st==='done'?'Terminada':s.fin?fmtD(s.fin):'—'}</b></td><td>${p.fin?fmtD(p.fin):'—'}</td><td>${pvChip(s.st)}</td></tr>`}
  h+=`</tbody></table></div></div>`;
  const sel=R.find(o=>o.p.id===PVSEL)||(R.length===1?R[0]:null);
  h+=sel?pvDetail(sel.p,sel.s,t):`<div class="note pvhint">Toca una partida para ver su avance por piso, el avance diario y los reportes.</div>`;
  h+='</div></div>';main.innerHTML=h;pvWire(main)}

function pvDetail(p,s,t){const c=conOf(p.sc);const ps=visPisos().length?pisos():[];const mp=p.mp||{};
  let h=`<section class="pvdet"><div class="card pvc"><div class="pvch"><b>${esc(p.nom)}</b><span>${esc(c.name)} · ${esc(p.und||'')}</span>${pvEd()?`<span class="sp"></span><button class="ib" data-pv="ini" data-id="${esc(p.id)}" title="Avance que ya existía antes de empezar a reportar aquí: suma al acumulado, no al ritmo">Saldo inicial</button><button class="ib" data-pv="edit" data-id="${esc(p.id)}">Editar partida</button>`:''}</div>
    <div class="pvpis">${ps.map(pi=>{const q=s.byP.get(pi.id)||0,m=+mp[pi.id]||0;if(!q&&!m)return'';const w=m?Math.min(100,q/m*100):0;
      return`<div class="pvpr"><span>${esc(pi.code)} · ${esc(pi.name)}</span><span class="pvbar lg"><i style="width:${m?w.toFixed(1):0}%;--c:${c.color}"></i></span><span class="m">${pvN(q)}${m?` / ${pvN(m)}`:''} ${esc(p.und||'')}</span></div>`}).join('')||'<div class="note">Todavía no hay avance reportado.</div>'}</div>
    ${Object.keys(mp).length?'':'<div class="note">Sin meta por piso: se muestra solo lo acumulado. Puedes poner la meta de cada piso en «Editar partida».</div>'}
    ${s.hh?`<div class="note">HH reportadas por el SC (opcional): <b>${pvN(s.hh)} HH</b> · <b class="m">${pvN(Math.round(s.hhr*100)/100)} HH/${esc(p.und||'und')}</b></div>`:''}</div>
    <div class="card pvc"><div class="pvch"><b>Avance diario</b><span>últimos 15 días hábiles</span></div>${pvChart(p,s,t,c.color)}</div></section>`;
  const L=pvReps(p.id).sort((a,b)=>b.d.localeCompare(a.d)||String(a.piso).localeCompare(String(b.piso))).slice(0,60);
  h+=`<div class="card pvtw"><div class="pvch pad"><b>Reportes</b><span>${L.length?`los últimos ${L.length}`:''}</span></div>${L.length?`<div class="pvsc"><table class="t"><thead><tr><th>Fecha</th><th>Piso</th><th>Sector / ambiente</th><th class="r">Metrado</th><th class="r">HH</th><th>Nota</th><th>Reportó</th><th></th></tr></thead><tbody>${L.map(r=>{const pi=S.pis.get(r.piso)||{};const ok=pvEd()||(SCK()&&pvMine(r.sc));
    return`<tr${r.ini?' class="pvini"':''}><td>${fmtD(r.d)}${r.ini?' <span class="pvst">Saldo inicial</span>':''}</td><td>${esc(pi.code||'—')}</td><td>${esc(pvZona(r))}</td><td class="r m">${pvN(r.q)}</td><td class="r m">${+r.hh>0?pvN(r.hh):'—'}</td><td>${esc(r.nota||'')}</td><td class="mu">${esc(pvWho(r))}${(r.h||[]).length?' · editado':''}</td><td class="r">${r.ini?(pvEd()?`<button class="ib" data-pv="ini" data-id="${esc(p.id)}">Editar</button>`:''):ok?`<button class="ib" data-pv="rep" data-id="${esc(r.id)}">Editar</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="note pad">Sin reportes todavía.</div>'}</div>`;
  return h}
/* barras del metrado diario (días hábiles) con la línea del ritmo necesario */
function pvChart(p,s,t,col){const D=[];let x=t;while(D.length<15){if(isWork(x)||s.byD.has(x))D.unshift(x);x=addD(x,-1);if(x<addD(t,-60))break}
  const vals=D.map(d=>s.byD.get(d)||0);const nec=s.nec&&s.nec!==Infinity?s.nec:0;const mx=Math.max(1,...vals,nec*1.1,s.rit);
  const W=600,H=170,B=146,bw=W/D.length;const y=v=>B-v/mx*(B-14);
  return`<svg class="pvsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Metrado diario de ${esc(p.nom)} en los últimos ${D.length} días hábiles">
    <line x1="0" y1="${B}" x2="${W}" y2="${B}" class="ax"></line>
    ${D.map((d,i)=>{const v=vals[i];return v?`<rect x="${(i*bw+4).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw-8).toFixed(1)}" height="${(B-y(v)).toFixed(1)}" rx="3" style="fill:${col}"><title>${fmtD(d)}: ${pvN(v)} ${esc(p.und||'')}</title></rect>`:''}).join('')}
    ${nec?`<line x1="0" y1="${y(nec).toFixed(1)}" x2="${W}" y2="${y(nec).toFixed(1)}" class="nec"></line>`:''}
    ${s.rit?`<line x1="0" y1="${y(s.rit).toFixed(1)}" x2="${W}" y2="${y(s.rit).toFixed(1)}" class="rit"></line>`:''}
    <text x="2" y="${H-6}" class="lb">${fmtD(D[0])}</text><text x="${W-2}" y="${H-6}" text-anchor="end" class="lb">${fmtD(D[D.length-1])}</text></svg>
    <div class="pvleg"><span><i class="b" style="background:${col}"></i>metrado del día</span>${s.rit?`<span><i class="l rit"></i>ritmo actual ${pvN(Math.round(s.rit*10)/10)}/día</span>`:''}${nec?`<span><i class="l nec"></i>ritmo necesario ${pvN(Math.round(nec*10)/10)}/día</span>`:''}</div>`}

function pvWire(main){main.onchange=e=>{if(typeof pcChange==='function')pcChange(e)};
  main.onclick=e=>{{const v=e.target.closest('[data-pvv]');if(v){U.pvV=v.dataset.pvv;saveUI();requestRender();return}}
  {const c=e.target.closest('button[data-pc]');if(c){const a=c.dataset.pc;if(a==='reg'){U.pvV='reg';PCD=todayIso()}else if(a==='back')U.pvV='casa';else if(a==='bf'){pcBackfill();return}else if(a==='prev')PCD=addD(PCD,-1);else if(a==='next'){const n=addD(PCD,1);if(n<=todayIso())PCD=n}else if(a==='det'){pcDetOpen(c.dataset.id);return}saveUI();requestRender();return}}
  {const r=e.target.closest('tr[data-pcs]');if(r){PCSEL=PCSEL===r.dataset.pcs?'':r.dataset.pcs;requestRender();return}}
  const b=e.target.closest('[data-pv]');if(b){const a=b.dataset.pv;if(a==='rep')pvRepOpen(b.dataset.id||'');else if(a==='ini')pvIniOpen(b.dataset.pvk||'sc',b.dataset.id);else if(a==='new')pvPartOpen('');else if(a==='edit')pvPartOpen(b.dataset.id);return}
  const tr=e.target.closest('tr[data-pvs]');if(tr){PVSEL=PVSEL===tr.dataset.pvs?'':tr.dataset.pvs;requestRender()}};
  main.onkeydown=e=>{const tr=e.target.closest('tr[data-pvs],tr[data-pcs]');if(tr&&(e.key==='Enter'||e.key===' ')){e.preventDefault();tr.click()}}}

/* ---------- hoja: reportar / editar avance ---------- */
let PVF=null;
function pvSheet(id,html){let sh=$('#'+id);if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id=id;sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);
    sh.addEventListener('click',e=>{if(e.target===sh)sh.remove()})}
  sh.querySelector('.ksc').innerHTML=html;return sh}
function pvRepOpen(rid){const P=pvParts();if(!P.length){toast('No hay partidas críticas');return}const r=rid?PAV.get(rid):null;const t=todayIso();
  PVF=r?{id:r.id,pc:r.pc,d:r.d,piso:r.piso,zona:r.zona||'',q:r.q,hh:r.hh||'',nota:r.nota||''}:{id:'',pc:PVSEL&&P.some(p=>p.id===PVSEL)?PVSEL:P[0].id,d:t,piso:U.piso||'',zona:'',q:'',hh:'',nota:''};pvRepDraw()}
function pvRepDraw(){const f=PVF;const P=pvParts();const p=PCR.get(f.pc)||P[0];const t=todayIso();const s=pvStats(p,pvReps(p.id),t);
  const minD=pvEd()?'':addD(t,-3);const secs=f.piso?[...S.sec.values()].filter(x=>pisoOfSecObj(x)===f.piso).sort(byOrder):[];
  const zs=secs.map(x=>`<option value="${esc(x.id)}"${f.zona===x.id?' selected':''}>${esc(x.code)} · ${esc(x.name)}</option>${[...S.amb.values()].filter(a=>a.sectorId===x.id).sort(byOrder).map(a=>`<option value="${esc(a.id)}"${f.zona===a.id?' selected':''}>&nbsp;&nbsp;${esc(a.code||'')} ${esc(a.name||'')}</option>`).join('')}`).join('');
  const sh=pvSheet('pvsheet',`<div class="ksh"><div><b>${f.id?'Editar avance':'Reportar avance'}</b><span>${esc(conOf(p.sc).name)}</span></div><button class="ib" data-pf="x" aria-label="Cerrar">✕</button></div>
    <label class="pvf">Partida crítica<select data-pf="pc"${f.id?' disabled':''}>${P.map(x=>`<option value="${esc(x.id)}"${x.id===p.id?' selected':''}>${esc(x.nom)} · ${esc(x.und||'')}${SCK()&&myScsI().length<2?'':' · '+esc(conOf(x.sc).name)}</option>`).join('')}</select></label>
    <div class="pvsum"><div><span>Acumulado</span><b class="m">${pvN(s.acu)} / ${pvN(s.met)} ${esc(p.und||'')}</b></div><span class="pvbar lg"><i style="width:${s.pct.toFixed(1)}%;--c:${conOf(p.sc).color}"></i></span>
      <small>${s.rit?`Ritmo ${pvN(Math.round(s.rit*10)/10)} ${esc(p.und||'')}/día${s.fin?` → terminas ${fmtD(s.fin)}`:''}`:'Aún sin ritmo'}${p.fin?` · comprometido ${fmtD(p.fin)}`:''} ${pvChip(s.st)}</small></div>
    <label class="pvf">Fecha<input type="date" data-pf="d" value="${esc(f.d)}" max="${t}"${minD?` min="${minD}"`:''}${f.id?' disabled':''}></label>
    <fieldset class="pvf"><legend>Piso <b class="pvreq">*</b></legend><div class="pvpb">${pisos().map(pi=>`<button type="button" data-pf="piso" data-v="${esc(pi.id)}" class="${f.piso===pi.id?'on':''}"${f.id?' disabled':''} aria-pressed="${f.piso===pi.id}">${esc(pi.code)}</button>`).join('')}</div></fieldset>
    <label class="pvf">Sector o ambiente (opcional)<select data-pf="zona"${!f.piso||f.id?' disabled':''}><option value="">Todo el piso</option>${zs}</select></label>
    <div class="pvf2"><label class="pvf">Metrado <b class="pvreq">*</b><span class="pvin"><input type="number" inputmode="decimal" min="0" step="any" data-pf="q" value="${esc(String(f.q))}"><span>${esc(p.und||'')}</span></span></label>
      <label class="pvf">HH (opcional)<span class="pvin"><input type="number" inputmode="decimal" min="0" step="any" data-pf="hh" value="${esc(String(f.hh))}"><span>HH</span></span></label></div>
    <label class="pvf">Nota (opcional)<input type="text" maxlength="200" data-pf="nota" value="${esc(f.nota)}" placeholder="p. ej. faltó material en la tarde"></label>
    <div class="pvact">${f.id&&(pvEd()||SCK())?'<button class="ib" data-pf="arch">Quitar este reporte</button>':''}<span class="sp"></span><button class="ib pri" data-pf="ok">${f.id?'Guardar cambios':'Guardar avance'}</button></div>`);
  const sc=sh.querySelector('.ksc');
  sc.onclick=e=>{const b=e.target.closest('[data-pf]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const k=b.dataset.pf;
    if(k==='x'){sh.remove();return}if(k==='piso'){f.piso=b.dataset.v;f.zona='';pvKeep(sc);pvRepDraw();return}if(k==='ok'){pvKeep(sc);pvRepSave();return}if(k==='arch'){pvRepArch()}};
  sc.onchange=e=>{const k=e.target.dataset.pf;if(!k)return;pvKeep(sc);if(k==='pc'||k==='d'){const id=pvAvId(f.d,f.pc,f.piso,f.zona);const ex=PAV.get(id);if(ex&&!ex.arch){f.q=ex.q;f.hh=ex.hh||'';f.nota=ex.nota||''}pvRepDraw()}if(k==='zona'){const ex=PAV.get(pvAvId(f.d,f.pc,f.piso,f.zona));if(ex&&!ex.arch&&!f.q){f.q=ex.q;f.hh=ex.hh||'';f.nota=ex.nota||''}pvRepDraw()}}}
function pvKeep(sc){const f=PVF;sc.querySelectorAll('[data-pf]').forEach(el=>{const k=el.dataset.pf;if(el.tagName==='SELECT'||el.tagName==='INPUT'){if(!el.disabled)f[k]=el.value}})}
const pvAvId=(d,pc,piso,zona)=>`${d}_${pc}_${piso}_${zona||'-'}`;
async function pvRepSave(){const f=PVF;const p=PCR.get(f.pc);const t=todayIso();if(!p){toast('Elige la partida');return}
  if(!f.piso){toast('Elige el piso');return}const q=+String(f.q).replace(',','.');if(!(q>0)){toast('Escribe el metrado ejecutado (mayor que 0)');return}
  const hh=f.hh===''?null:+String(f.hh).replace(',','.');if(hh!=null&&!(hh>=0)){toast('Las HH deben ser un número');return}
  if(!f.d||f.d>t){toast('La fecha no puede ser futura');return}if(!pvEd()&&f.d<addD(t,-3)){toast('Puedes reportar hasta 3 días atrás; para antes, pide al ingeniero');return}
  const id=f.id||pvAvId(f.d,f.pc,f.piso,f.zona);const old=PAV.get(id);
  if(!f.id&&old&&!old.arch&&+old.q!==q&&!await uiAsk({title:'Ya hay un reporte',text:`El ${fmtD(f.d)} ya se reportó ${pvN(old.q)} ${p.und||''} en este piso${f.zona?' y zona':''}. ¿Reemplazarlo por ${pvN(q)}?`,ok:'Reemplazar',tone:'warn'}))return;
  const doc={pc:p.id,sc:p.sc,d:f.d,piso:f.piso,zona:f.zona||'',q,hh:hh==null?null:hh,nota:String(f.nota||'').slice(0,200),by:me.email||'',byN:me.name||'',ts:NOW(),arch:null};
  if(old){doc.h=[...(old.h||[]),{q:old.q,hh:old.hh??null,by:old.by||'',ts:old.ts||0}].slice(-10)}
  PAV.set(id,{...doc,id});const sh=$('#pvsheet');if(sh)sh.remove();PVSEL=p.id;requestRender();
  try{await fcol('pav').doc(id).set(doc);toast(f.id?'Avance corregido':`Avance guardado: ${pvN(q)} ${p.und||''}`)}catch(err){toast('No se pudo guardar: '+(err.code==='permission-denied'?'no tienes permiso para esta partida':(err.code||err.message)))}}
async function pvRepArch(){const f=PVF;const r=PAV.get(f.id);if(!r)return;if(!await uiAsk({title:'¿Quitar este reporte?',text:`${fmtD(r.d)} · ${pvN(r.q)}. Deja de sumar al avance; queda guardado en el historial.`,ok:'Quitar',tone:'danger'}))return;
  const doc={...r,arch:{t:NOW(),by:me.email||'',n:me.name||''},by:me.email||'',byN:me.name||'',ts:NOW()};delete doc.id;PAV.set(r.id,{...doc,id:r.id});const sh=$('#pvsheet');if(sh)sh.remove();requestRender();
  try{await fcol('pav').doc(r.id).set(doc);toast('Reporte quitado')}catch(err){toast('No se pudo quitar: '+(err.code||err.message))}}

/* ---------- hoja: saldo inicial (avance que ya existía antes de reportar aquí), por piso; admin e ingenieros ----------
   Un documento por partida y piso: id ini_{pc}_{piso}, {ini:true, d: fecha de corte, q, nota: motivo}. Suma al acumulado y al
   avance por piso; NO entra al ritmo (SC) ni al IP (casa: no tiene HH del tareo). kind: 'sc' (pav) | 'casa' (pmet). */
function pvIniOpen(kind,pc){if(!pvEd())return;const casa=kind==='casa';const M=casa?PMET:PAV,col=casa?'pmet':'pav';
  const x=casa?pcTpc().get(pc):PCR.get(pc);if(!x)return;const und=x.und||'';const id=pi=>`ini_${pc}_${pi}`;
  const cur=pisos().map(pi=>({pi,r:M.get(id(pi.id))})).map(o=>({...o,q:o.r&&!o.r.arch?+o.r.q:0}));const r0=cur.find(o=>o.q);
  const sh=pvSheet('pvsheet',`<div class="ksh"><div><b>Saldo inicial · ${esc(casa?(x.cod||'')+' · '+(x.nom||''):x.nom)}</b><span>Avance que ya existía antes de empezar a registrar aquí. Suma al acumulado; no entra al ${casa?'IP':'ritmo'}.</span></div><button class="ib" data-pi="x" aria-label="Cerrar">✕</button></div>
    <label class="pvf">Acumulado al día<input type="date" data-pi="d" value="${esc(r0?r0.r.d:todayIso())}" max="${todayIso()}"></label>
    <fieldset class="pvf"><legend>Acumulado por piso (${esc(und)})</legend><div class="pvmp">${cur.map(o=>`<label>${esc(o.pi.code)}<input type="number" min="0" step="any" data-ip="${esc(o.pi.id)}" value="${o.q||''}"></label>`).join('')}</div></fieldset>
    <label class="pvf">Motivo <b class="pvreq">*</b><input type="text" maxlength="200" data-pi="nota" value="${esc(r0?r0.r.nota||'':'')}" placeholder="p. ej. avance medido en obra antes de usar el sistema"></label>
    <div class="pvact"><span class="sp"></span><button class="ib pri" data-pi="ok">Guardar saldo inicial</button></div>`);
  sh.querySelector('.ksc').onclick=async e=>{const b=e.target.closest('button[data-pi]');if(!b)return;if(b.dataset.pi==='x'){sh.remove();return}
    const d=sh.querySelector('[data-pi="d"]').value,nota=sh.querySelector('[data-pi="nota"]').value.trim();
    if(!d||d>todayIso()){toast('Elige la fecha del acumulado');return}if(!nota){toast('Escribe el motivo');return}
    const W=[];for(const i of sh.querySelectorAll('[data-ip]')){const pi=i.dataset.ip,v=i.value===''?0:+String(i.value).replace(',','.');if(!(v>=0)){toast('Escribe números');return}
      const old=M.get(id(pi));const was=old&&!old.arch?+old.q:0;if(!v&&!was)continue;
      const doc={pc,d,piso:pi,zona:'',q:v,nota,ini:true,by:me.email||'',byN:me.name||'',ts:NOW(),arch:v?null:{t:NOW(),by:me.email||'',n:me.name||''}};if(!casa)doc.sc=x.sc;
      if(old)doc.h=[...(old.h||[]),{q:was,by:old.by||'',ts:old.ts||0}].slice(-10);W.push([id(pi),doc])}
    if(!W.length){toast('Escribe el acumulado de al menos un piso');return}
    W.forEach(([k,doc])=>M.set(k,{...doc,id:k}));sh.remove();requestRender();
    try{for(const[k,doc]of W)await fcol(col).doc(k).set(doc);toast('Saldo inicial guardado')}catch(err){toast('No se pudo guardar: '+(err.code==='permission-denied'?'no tienes permiso':(err.code||err.message)))}}}

/* ---------- hoja: crear / editar partida crítica (admin e ingenieros) ---------- */
function pvPartOpen(id){if(!pvEd())return;const p=id?PCR.get(id):null;const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));const mp=(p&&p.mp)||{};
  const sh=pvSheet('pvsheet',`<div class="ksh"><div><b>${p?'Editar partida crítica':'Nueva partida crítica'}</b><span>El subcontratista reporta su avance diario sobre ella</span></div><button class="ib" data-pp="x" aria-label="Cerrar">✕</button></div>
    <label class="pvf">Subcontratista<select data-pp="sc">${cons.map(c=>`<option value="${esc(c.id)}"${p&&p.sc===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
    <label class="pvf">Partida<input type="text" data-pp="nom" maxlength="80" value="${esc(p?p.nom:'')}" placeholder="p. ej. Enchape porcelanato piso"></label>
    <div class="pvf2"><label class="pvf">Unidad<select data-pp="und">${PV_UND.map(u=>`<option${(p?p.und:'m²')===u?' selected':''}>${u}</option>`).join('')}</select></label>
      <label class="pvf">Metrado total contractual<input type="number" min="0" step="any" data-pp="met" value="${p?esc(String(p.met)):''}"></label></div>
    <label class="pvf">Fecha comprometida de término<input type="date" data-pp="fin" value="${esc(p&&p.fin||'')}"></label>
    <fieldset class="pvf"><legend>Meta por piso (opcional)</legend><div class="pvmp">${pisos().map(pi=>`<label>${esc(pi.code)}<input type="number" min="0" step="any" data-mp="${esc(pi.id)}" value="${mp[pi.id]!=null?esc(String(mp[pi.id])):''}"></label>`).join('')}</div></fieldset>
    <div class="pvact">${p?'<button class="ib" data-pp="arch">Archivar partida</button>':''}<span class="sp"></span><button class="ib pri" data-pp="ok">${p?'Guardar':'Crear partida'}</button></div>`);
  sh.querySelector('.ksc').onclick=async e=>{const b=e.target.closest('button[data-pp]');if(!b)return;const k=b.dataset.pp;const q=s=>sh.querySelector(`[data-pp="${s}"]`);
    if(k==='x'){sh.remove();return}
    if(k==='arch'){if(!await uiAsk({title:'¿Archivar esta partida crítica?',text:'Deja de verse en el tablero; sus reportes se conservan.',ok:'Archivar',tone:'warn'}))return;
      try{await fcol('pcrit').doc(p.id).set({arch:{t:NOW(),by:me.email||'',n:me.name||''},by:me.email||'',ts:NOW()},{merge:true});sh.remove();toast('Partida archivada')}catch(err){toast('No se pudo archivar: '+(err.code||err.message))}return}
    const nom=q('nom').value.trim(),met=+q('met').value;if(!nom){toast('Escribe el nombre de la partida');return}if(!(met>0)){toast('Escribe el metrado total (mayor que 0)');return}
    const m={};sh.querySelectorAll('[data-mp]').forEach(i=>{if(i.value!==''&&+i.value>=0)m[i.dataset.mp]=+i.value});
    const doc={sc:q('sc').value,nom,und:q('und').value,met,fin:q('fin').value||'',mp:m,by:me.email||'',ts:NOW()};if(!p){doc.ord=PCR.size;doc.arch=null}
    const nid=p?p.id:uid('pc');try{await fcol('pcrit').doc(nid).set(doc,{merge:!!p});PVSEL=nid;sh.remove();toast(p?'Partida guardada':'Partida crítica creada');requestRender()}catch(err){toast('No se pudo guardar: '+(err.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(err.code||err.message)))}}}

/* tarjeta de la pantalla Hoy: partidas críticas sin reporte de hoy (SC: las suyas; ingenieros: todas) */
function pvHoyCard(){if(!(SCK()||pvEd()))return null;ensurePv();const t=todayIso();if(!isWork(t))return null;const P=pvParts();if(!P.length)return null;
  const L=P.map(p=>({p,s:pvStats(p,pvReps(p.id),t)})).filter(o=>o.s.st!=='done');const no=L.filter(o=>!o.s.today);const bad=L.filter(o=>o.s.st==='late'||o.s.st==='risk');
  return{k:'pav',title:SCK()?'Avance de tus partidas críticas':'Avance de los subcontratistas',n:no.length,tone:bad.length?'warn':'',
    sub:`${no.length} sin reporte de hoy · ${bad.length} en riesgo o atrasada${bad.length===1?'':'s'}`,
    items:no.map(o=>({t:o.p.nom,s:`${SCK()?'':conOf(o.p.sc).name+' · '}${pvN(o.s.acu)} / ${pvN(o.s.met)} ${o.p.und||''} · ${(PV_ST[o.s.st]||PV_ST.none)[0]}`})),
    go:'prod',goLabel:SCK()?'Reportar avance':'Ir a Productividad',empty:'Todas reportaron su avance de hoy'}}
