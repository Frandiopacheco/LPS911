"use strict";
/* LPS 911 · Indicadores (PPC, causas).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= INDICADORES ================= */
function svgBarsV(data,{h=220}={}){ // data [{label,v(0..1),sub}]
  const W=Math.max(360,data.length*56+60),L=40,B=34,T=18,ih=h-B-T;const bw=Math.min(34,(W-L-10)/data.length-10);
  let s=`<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="PPC por semana">`;
  [0,.25,.5,.75,1].forEach(g=>{const y=T+ih*(1-g);s+=`<line class="gl" x1="${L}" x2="${W-6}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${y+4}" text-anchor="end">${g*100}%</text>`});
  data.forEach((d,i)=>{const cx=L+10+i*((W-L-10)/data.length)+((W-L-10)/data.length)/2;const bh=Math.max(d.v>0?2:0,ih*d.v);const y=T+ih-bh;
    s+=`<g><title>${esc(d.label)}: ${pct(d.v)}${d.sub?' · '+esc(d.sub):''}</title><path class="bar" d="M${cx-bw/2},${T+ih} V${y+Math.min(4,bh)} q0,-4 4,-4 h${bw-8} q4,0 4,4 V${T+ih} Z"/><text class="lab" x="${cx}" y="${y-5}" text-anchor="middle">${pct(d.v)}</text><text x="${cx}" y="${h-12}" text-anchor="middle">${esc(d.label)}</text></g>`});
  return s+'</svg>'}
function svgBarsH(data,fmt){ // [{label,v,max,color?,sub}]
  const rowH=26,W=380,L=122,R=44,h=data.length*rowH+8;const mx=Math.max(1,...data.map(d=>d.max??d.v));
  let s=`<svg viewBox="0 0 ${W} ${h}" role="img">`;
  data.forEach((d,i)=>{const y=4+i*rowH;const bw=Math.max(d.v>0?3:0,(W-L-R)*(d.v/mx));
    s+=`<g><title>${esc(d.label)}: ${fmt(d.v)}${d.sub?' · '+esc(d.sub):''}</title>${d.color?`<rect x="0" y="${y+8}" width="12" height="12" rx="3" fill="${d.color}"/>`:''}<text class="nm" x="${d.color?18:0}" y="${y+18}">${esc(d.label.length>17?d.label.slice(0,16)+'…':d.label)}</text>
    <rect x="${L}" y="${y+6}" width="${W-L-R}" height="16" rx="4" fill="var(--panel2)"/><path class="bar" d="M${L},${y+6} h${Math.max(0,bw-4)} q4,0 4,4 v8 q0,4 -4,4 h-${Math.max(0,bw-4)} Z"/><text class="lab" x="${L+bw+6}" y="${y+18}">${fmt(d.v)}</text></g>`});
  return s+'</svg>'}
function dayData(dates,vset){const ds=new Set(dates);const rows=[],extras=[];const scA={},piA={},cnc={};const tot={prog:0,ver:0,ok:0,partial:0,no:0,nimp:0};
  for(const{p,secs}of tree()){if(!vset.has(p.id))continue;for(const{s,ambs}of secs)for(const{a,acts}of ambs)for(const x of acts)for(const d of dates){const sched=schedOn(x,d);const rc=recOf(d,x.id);if(sched||(rc&&!rc.late))rows.push({p,s,a,x,d,rc,sched,sc:x.sc})}}
  dayDataArch(dates,vset,rows);
  extras.push(...npItems(ds,vset));
  const z=()=>({prog:0,ver:0,ok:0,partial:0,no:0,nimp:0});const add=(o,r)=>{o.prog++;if(r.rc){o.ver++;o[r.rc.status]++;if(impOf(r.rc)===false)o.nimp++}};
  rows.forEach(r=>{add(scA[r.sc]=scA[r.sc]||z(),r);add(piA[r.p.id]=piA[r.p.id]||z(),r);add(tot,r);if(r.rc&&r.rc.status!=='ok'){const k=r.rc.cnc||'Sin causa registrada';cnc[k]=(cnc[k]||0)+1}});
  return{rows,extras,scA,piA,cnc,tot}}
function cumplTable(entries,label){return`<div class="tscroll"><table class="t ctab"><thead><tr><th></th><th class="r">Prog.</th><th class="r hm">Verif.</th><th class="r">✓</th><th class="r hm">½</th><th class="r hm">✗</th><th class="r hm">Sin verif.</th><th class="r hm" title="Parcial o No cumplido por causas que no dependen del subcontratista">No imputables</th><th>PPC bruto</th><th title="Sin contar los incumplimientos no imputables al subcontratista">PPC del SC</th></tr></thead><tbody>${entries.map(([k,o])=>{const v=o.ver?o.ok/o.ver:null;const vs=pscOf(o);
  return`<tr><td>${label(k)}</td><td class="r">${o.prog}</td><td class="r hm">${o.ver}</td><td class="r ok">${o.ok||''}</td><td class="r pa hm">${o.partial||''}</td><td class="r no hm">${o.no||''}</td><td class="r mu hm">${o.prog-o.ver||''}</td><td class="r mu hm">${o.nimp||''}</td><td>${v==null?'<span class="mu">sin verificar</span>':`<span class="pbar"><i style="width:${Math.round(v*100)}%"></i></span><b>${pct(v)}</b>`}</td><td>${vs==null?(v==null?'':'<span class="mu">—</span>'):`<span class="pbar sc"><i style="width:${Math.round(vs*100)}%"></i></span><b>${pct(vs)}</b>`}</td></tr>`}).join('')}</tbody></table></div>`}
const scLabel=sc=>`<span class="chip" style="--c:${conOf(sc).color};border:0;padding:0;background:none"><i></i>${esc(conOf(sc).name)}</span>`;
const DOWN=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function indDay(){let d=curDay();if(d>todayIso())d=todayIso();if(pd(d).getUTCDay()===0)d=addD(d,-1);return d}
function indBar(){const d=indDay();const today=todayIso();const dia=U.indMode!=='sem';
  return pageHead('Indicadores',`${dia?`${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}${d===today?' · hoy':''}`:`Semana ${U.week}`} · ${pisoLabel()}`,
    dia?'<button class="ib" id="bxppc">Excel del PPC</button><button class="ib pri" id="bpdf">Reporte PDF del día</button>':`<button class="ib pri" id="bxppc">Excel del PPC · semana ${U.week}</button>`)
   +`<div class="fbar"><span class="seg" id="imode"><button data-m="dia" class="${dia?'on':''}">Diario</button><button data-m="sem" class="${dia?'':'on'}">Semanal</button></span>
   ${dia?`<span class="fsp"></span><span class="fgl">Reporte PDF:</span><label class="chk" title="Deja fuera del PDF los pisos donde nadie registró avance ese día"><input type="checkbox" id="pdfskip"${U.pdfSkip?' checked':''}> Omitir pisos sin verificar</label><label class="chk"><input type="checkbox" id="pdfph"${U.pdfPh?' checked':''}> Incluir fotos</label>`:''}</div>`}
/** No cumplidos de la semana elegida: causa, comentario y mitigación, editables aquí mismo (los mismos datos del Plan semanal) */
function ncCard(wSel){const cnc=P().cnc||[];const L=[];
  for(const w of wSel){const p=S.pis.get(w.pisoId);if(!p)continue;for(const[id,it]of Object.entries(w.items||{})){const r=(w.res||{})[id];if(r&&r.ok===false)L.push({w,p,id,it,r})}}
  if(!L.length)return'';L.sort((a,b)=>a.p.order-b.p.order||(a.it.ord||0)-(b.it.ord||0));const ed=canWrite;const sinC=L.filter(o=>!o.r.cnc).length,sinM=L.filter(o=>!o.r.mit).length;
  return`<div class="card" id="nccard"><h2>No cumplidos de la semana ${U.week} <span class="sub">${L.length} compromiso${L.length===1?'':'s'}${sinC?` · ${sinC} sin causa`:''}${sinM?` · ${sinM} sin mitigación`:''}${ed?' · edita la causa y la mitigación aquí':''}</span></h2>
   <div class="tscroll"><table class="t rt"><thead><tr><th>Ítem</th><th>Actividad</th><th>Subcontratista</th><th style="min-width:180px">Causa</th><th style="min-width:160px">Comentario</th><th style="min-width:200px">Mitigación / acción</th></tr></thead><tbody>
   ${L.map(({w,p,id,it,r})=>{const k=`${w.n}|${p.id}|${id}`;return`<tr data-nck="${esc(k)}"><td class="mono" data-l="Ítem">${U.piso?'':esc(p.code)+' · '}${esc(it.code||'')}</td><td class="lead wrapc">${esc(it.act||'')}<div class="note">${esc(it.amb||'')}</div></td><td data-l="Subcontratista">${scLabel(it.sc)}</td>
     <td class="full" data-l="Causa">${ed?`<select class="ci" data-ncf="cnc" data-fk="nc:cnc:${esc(k)}" aria-label="Causa"><option value="">Elegir causa…</option>${cncOpts(cnc,r.cnc)}</select>`:esc(r.cnc||'—')}</td>
     <td class="full" data-l="Comentario">${ed?`<input class="ci" data-ncf="note" data-fk="nc:note:${esc(k)}" value="${esc(r.note||'')}" placeholder="Detalle" aria-label="Comentario">`:esc(r.note||'—')}</td>
     <td class="full" data-l="Mitigación">${ed?`<input class="ci" data-ncf="mit" data-fk="nc:mit:${esc(k)}" value="${esc(r.mit||'')}" placeholder="Qué se hará para que no se repita" aria-label="Mitigación">`:esc(r.mit||'—')}</td></tr>`}).join('')}
   </tbody></table></div></div>`}
function ncChange(t){const f=t.dataset.ncf;const tr=t.closest('tr[data-nck]');if(!f||!tr||!canWrite)return false;const[n,pid,id]=tr.dataset.nck.split('|');const w=S.wk.get(wkId(+n,pid));if(!w)return true;
  const cur=(w.res||{})[id]||{};const v=f==='cnc'?t.value:t.value.trim();t.dataset.o=t.value;setRes(+n,pid,id,{...cur,[f]:v});return true}
function wireInd(main){main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onclick=e=>{const t=e.target;const m=t.closest('#imode button');if(m){U.indMode=m.dataset.m;saveUI();render();return}
  const dn=t.closest('[data-idd]');if(dn){const v=+dn.dataset.idd;const nd=v===0?null:shiftDay(indDay(),v);daySet(nd&&nd<todayIso()?nd:null);render();return}
  if(t.id==='bpdf'){reportPdf(indDay());return}
  if(t.id==='bxppc'){exportPpcXlsx();return}
  if(t.id==='bxcli'){cliPpcXlsx();return}
  const g=t.closest('tr[data-goc]');if(g){const[aid,d]=g.dataset.goc.split('|');goCampo(aid,d)}};
  main.onchange=e=>{if(ncChange(e.target))return;if(e.target.id==='pdfph'){U.pdfPh=e.target.checked;saveUI()}if(e.target.id==='pdfskip'){U.pdfSkip=e.target.checked;saveUI()}}}
function renderIndDay(main){
  const d=indDay();ensureDaily(addD(d,-1));const vp=visPisos();const vset=new Set(vp.map(p=>p.id));const D=dayData([d],vset);const t=D.tot;
  let h=`<div class="scroll"><div class="wrap">${indBar()}
   <div class="tiles">
    <div class="tile hl"><span class="k">PPC diario · alerta</span><span class="v">${t.ver?pct(t.ok/t.ver):'—'}${t.ver?` <small>${t.ok} de ${t.ver}</small>`:''}</span></div>
    <div class="tile"><span class="k">PPC diario imputable a los SC</span><span class="v">${pscOf(t)!=null?pct(pscOf(t)):'—'}${t.nimp?` <small>${t.nimp} no imput.</small>`:''}</span></div>
    <div class="tile"><span class="k">Verificado</span><span class="v">${t.prog?pct(t.ver/t.prog):'—'} <small>${t.ver} de ${t.prog}</small></span></div>
    <div class="tile"><span class="k">Parcial / No cumplido</span><span class="v">${t.partial} / ${t.no}</span></div>
    <div class="tile"><span class="k">Sin verificar</span><span class="v">${t.prog-t.ver}</span></div>
    <div class="tile"><span class="k">No programados</span><span class="v">${D.extras.length}${D.extras.length&&(t.ok+t.partial)?` <small>${pct(D.extras.length/(D.extras.length+t.ok+t.partial))} de lo ejecutado</small>`:''}</span></div></div>
   ${helpBox('¿Qué mide el PPC diario y cómo se calcula?',`<p>El <b>PPC diario</b> es una <b>alerta temprana</b>: muestra si la programación del día se está cumpliendo. El indicador oficial es el <b>PPC semanal</b> (Indicadores → Semanal), donde lo que falló un día y se recuperó dentro de la semana cuenta como cumplido.</p>
<p>El % se calcula sobre lo <b>verificado</b> (Parcial cuenta como no cumplido). Lo que nadie registró aparece como “sin verificar” y no baja el indicador. El <b>PPC del SC</b> no cuenta los incumplimientos cuya causa no depende del subcontratista (se define en Configuración y se puede corregir en cada registro de Campo).</p>`)}`;
  if(!t.prog&&!D.extras.length)h+=`<div class="empty">${nwReason(d)?esc(nwReason(d))+': día no laborable.':'No hay actividades programadas este día'+(U.piso?' en este piso':'')+'.'}</div>`;
  else{
    const scs=Object.entries(D.scA).sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name));
    h+=`<div class="card"><h2>Cumplimiento por subcontratista <span class="sub">${fmtD(d)}</span></h2><div class="pad">${cumplTable(scs,scLabel)}</div></div>`;
    if(!U.piso&&vp.length>1){const ps=vp.filter(p=>D.piA[p.id]).map(p=>[p.id,D.piA[p.id]]);h+=`<div class="card"><h2>Cumplimiento por piso <span class="sub">${fmtD(d)}</span></h2><div class="pad">${cumplTable(ps,id=>{const p=S.pis.get(id);return`<b>${esc(p.code)}</b> · ${esc(p.name)}`})}</div></div>`}
    if(D.extras.length)h+=npIndCard(D.extras,d);
    const cl=Object.entries(D.cnc).sort((a,b)=>b[1]-a[1]);
    if(cl.length)h+=`<div class="card chart"><h2>Causas del día <span class="sub">Parcial y No cumplido</span></h2><div class="pad">${svgBarsH(cl.map(([k,v])=>({label:k,v})),v=>v+'')}</div></div>`;
    const inc=D.rows.filter(r=>r.rc&&r.rc.status!=='ok').sort((a,b)=>a.p.order-b.p.order||a.s.order-b.s.order||a.a.order-b.a.order||a.x.order-b.x.order);
    if(inc.length)h+=`<div class="card"><h2>Incumplimientos del día <span class="sub">${inc.length} · clic para ver o editar en Campo</span></h2><div class="tscroll"><table class="t ctab rt"><thead><tr><th>Ítem</th><th>Ambiente</th><th>Actividad</th><th>Subcontratista</th><th>Estado</th><th>Causa</th><th>Imputable al SC</th><th>Comentario</th></tr></thead><tbody>
      ${inc.map(r=>`<tr data-goc="${r.x.id}|${d}"><td class="mono" data-l="Ítem">${U.piso?'':esc(r.p.code)+' · '}${esc(r.a.code)}</td><td class="wrapc" data-l="Ambiente">${esc(r.a.name)}</td><td class="wrapc lead">${esc(r.x.name)}</td><td data-l="Subcontratista">${scLabel(r.sc)}</td><td class="${ST[r.rc.status].c}" data-l="Estado">${ST[r.rc.status].i} ${ST[r.rc.status].t}</td><td class="wrapc" data-l="Causa">${r.rc.cnc?esc(r.rc.cnc):'<span style="color:var(--bad)">sin causa</span>'}</td><td data-l="Imputable al SC">${impOf(r.rc)?'Sí':'<span class="mu">No</span>'}</td><td class="wrapc mu full" data-l="Comentario">${esc(r.rc.note||'')}</td></tr>`).join('')}</tbody></table></div></div>`}
  h+='</div></div>';main.innerHTML=h;wireInd(main)}
function renderInd(main){
  if(U.indMode!=='sem'){renderIndDay(main);return}
  ensureDaily(addD(weekStart(U.week-2),-1));
  const vp=visPisos();const vset=new Set(vp.map(p=>p.id));
  const docs=[...S.wk.values()].filter(w=>w.frozenAt&&w.pisoId&&vset.has(w.pisoId));
  const ppcs=[...new Set(docs.map(w=>w.n))].map(n=>{const o=ppcWeekAgg(n,vset);return o?{...o,wk:+n}:null}).filter(Boolean).sort((a,b)=>a.wk-b.wk);
  const last=ppcs[ppcs.length-1];const avg=ppcs.length?ppcs.reduce((s,x)=>s+x.ppc,0)/ppcs.length:null;
  const cncC={};docs.forEach(w=>Object.values(w.res||{}).forEach(r=>{if(r&&r.ok===false){const k=r.cnc||'Sin causa registrada';cncC[k]=(cncC[k]||0)+1}}));
  const cncL=Object.entries(cncC).sort((a,b)=>b[1]-a[1]);
  const wSel=docs.filter(w=>w.n===U.week);const scP={};
  for(const w of wSel)for(const[id,it]of Object.entries(w.items||{})){const o=scP[it.sc]=scP[it.sc]||{n:0,ok:0,nimp:0};o.n++;const rr=(w.res||{})[id];if(rr?.ok===true)o.ok++;else if(rr?.ok===false&&!(rr.imp!=null?rr.imp:cncImp(rr.cnc)))o.nimp++}
  const pisoP=wSel.map(w=>({w,st:ppcOf(w),p:S.pis.get(w.pisoId)})).filter(x=>x.st&&x.p).sort((a,b)=>a.p.order-b.p.order);
  const pend=restrInScope().filter(r=>r.status!=='lib').length;
  let h=`<div class="scroll"><div class="wrap">${indBar()}
   <div class="tiles">
   <div class="tile hl"><span class="k">PPC semanal (oficial) · última</span><span class="v">${last?pct(last.ppc):'—'}${last?` <small>sem ${last.wk}</small>`:''}</span></div>
   <div class="tile"><span class="k">PPC promedio</span><span class="v">${pct(avg)}${ppcs.length?` <small>${ppcs.length} sem</small>`:''}</span></div>
   <div class="tile"><span class="k">Semanas evaluadas</span><span class="v">${ppcs.length}</span></div>
   <div class="tile"><span class="k">Restricciones pendientes</span><span class="v">${pend}</span></div></div>`;
  if(!ppcs.length)h+=`<div class="callout">El PPC aparece cuando congelas los compromisos de un piso en <b>PPC semanal</b> y evalúas cada uno con Sí / No.</div>`;
  const dFrom=weekStart(U.week-2),dTo=[weekDays(U.week)[5],todayIso()].sort()[0];const dd=[];for(let d=dFrom;d<=dTo;d=addD(d,1)){if(isWork(d))dd.push(d)}
  const vActs=[...S.act.values()].filter(x=>vset.has(pisoOfAmb(x.ambId)));const dayRows=[];const dCnc={};let nExtra=0;
  for(const d of dd){let sch=0,okc=0,reg=0;for(const x of vActs){if(!(x.days||[]).includes(d))continue;sch++;const rc=recOf(d,x.id);if(rc){reg++;if(rc.status==='ok')okc++;else if(rc.cnc)dCnc[rc.cnc]=(dCnc[rc.cnc]||0)+1}}
    nExtra+=npItems([d],vset).length;
    if(reg)dayRows.push({label:DL[(pd(d).getUTCDay()+6)%7]+' '+d.slice(8),v:okc/reg,sub:`${okc} de ${reg} verificadas · ${sch} programadas`})}
  h+=`<div class="card chart"><h2>PPC diario (alerta · registros de campo) <span class="sub">% de lo verificado en campo marcado “Cumplido” · semanas ${U.week-2}–${U.week}${nExtra?` · ${nExtra} trabajos no programados`:''}</span></h2><div class="pad tscroll">${dayRows.length?svgBarsV(dayRows):'<div class="empty">Aún no hay registros de campo en estas semanas. Se llenan desde la pestaña <b>Campo</b>.</div>'}</div></div>`;
  {const wd=weekDays(U.week).filter(x=>x<=todayIso());const W=dayData(wd,vset);const e=Object.entries(W.scA).filter(([,o])=>o.ver).sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name));
   h+=`<div class="card"><h2>Cumplimiento en campo por subcontratista <span class="sub">semana ${U.week} · registros diarios acumulados</span></h2><div class="pad">${e.length?cumplTable(e,scLabel):'<div class="empty">Sin registros de campo en esta semana.</div>'}</div></div>`}
  {const nd=dd.map(d=>({d,n:npItems([d],vset).length})).filter(o=>o.n);if(nd.length)h+=`<div class="card chart"><h2>Trabajo no programado por día <span class="sub">frentes vistos en obra sin estar programados · semanas ${U.week-2}–${U.week}</span></h2><div class="pad">${svgBarsH(nd.map(o=>({label:DOWN[(pd(o.d).getUTCDay()+6)%7].slice(0,3)+' '+fmtD(o.d),v:o.n})),v=>v+'')}</div></div>`}
  if(Object.keys(dCnc).length)h+=`<div class="card chart"><h2>Causas registradas en campo <span class="sub">Parcial y No cumplido · mismas semanas</span></h2><div class="pad">${svgBarsH(Object.entries(dCnc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,v})),v=>v+'')}</div></div>`;
  h+=`<div class="charts">
   <div class="card chart"><h2>PPC por semana <span class="sub">% de compromisos cumplidos</span></h2><div class="pad">${ppcs.length?svgBarsV(ppcs.map(x=>({label:'S'+x.wk,v:x.ppc,sub:x.ok+' de '+x.n}))):'<div class="empty">Sin semanas evaluadas.</div>'}</div></div>
   ${!U.piso&&vp.length>1?`<div class="card chart"><h2>PPC por piso <span class="sub">semana ${U.week}</span></h2><div class="pad">${pisoP.length?svgBarsH(pisoP.map(x=>({label:x.p.code+' · '+x.p.name,v:x.st.ppc,max:1,sub:x.st.ok+' de '+x.st.n})),pct):`<div class="empty">Ningún piso congeló la semana ${U.week}.</div>`}</div></div>`:''}
   <div class="card chart"><h2>Causas de no cumplimiento <span class="sub">acumulado</span></h2><div class="pad">${cncL.length?svgBarsH(cncL.map(([k,v])=>({label:k,v})),v=>v+''):'<div class="empty">Sin incumplimientos registrados.</div>'}</div></div>
   <div class="card chart"><h2>PPC por subcontratista <span class="sub">semana ${U.week}</span></h2><div class="pad">${Object.keys(scP).length?svgBarsH(Object.entries(scP).sort((a,b)=>b[1].ok/b[1].n-a[1].ok/a[1].n).map(([sc,o])=>({label:conOf(sc).name,v:o.ok/o.n,max:1,color:conOf(sc).color,sub:o.ok+' de '+o.n+(o.nimp?` · PPC del SC ${pct(o.ok/(o.n-o.nimp))} (${o.nimp} no imput.)`:'')})),pct):`<div class="empty">La semana ${U.week} no está congelada${U.piso?' en este piso':''}.</div>`}</div></div>
  </div>`;
  h+=ncCard(wSel);
  if(canCli())h+=cliPpcCard(vset);
  const days=winDays();const load={};
  for(const x of S.act.values()){if(!vset.has(pisoOfAmb(x.ambId)))continue;for(const d of x.days||[])(load[x.sc]=load[x.sc]||{})[d]=(load[x.sc][d]||0)+1}
  const scs=Object.keys(load).filter(sc=>days.some(x=>load[sc][x.d])).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const mx=Math.max(1,...scs.flatMap(sc=>days.map(x=>load[sc][x.d]||0)));
  const tot=days.map(x=>scs.reduce((s,sc)=>s+(load[sc][x.d]||0),0));
  h+=`<div class="card"><h2>Carga diaria por subcontratista <span class="sub">frentes (actividades) programados · semanas ${U.week}–${U.week+U.win-1} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span></h2><div class="pad tscroll"><table class="heat"><thead><tr><th></th>${days.map(x=>`<th${x.d===todayIso()?' style="color:var(--ink)"':''}>${DL[x.i]}<br>${x.d.slice(8)}</th>`).join('')}</tr></thead><tbody>
   ${scs.map(sc=>`<tr><td class="n"><span class="chip" style="--c:${conOf(sc).color};border:0;padding:0;background:none"><i></i>${esc(conOf(sc).name)}</span></td>${days.map(x=>{const v=load[sc][x.d]||0;return`<td class="h${v?'':' z'}" style="${v?`background:color-mix(in srgb, var(--accent) ${Math.round(14+76*v/mx)}%, var(--panel));color:${v/mx>.55?'var(--accent-ink)':'var(--ink)'}`:''}" title="${esc(conOf(sc).name)} · ${fmtD(x.d)}: ${v} actividad(es)">${v||''}</td>`}).join('')}</tr>`).join('')||`<tr><td class="empty" colspan="${days.length+1}">Sin actividades programadas en la ventana.</td></tr>`}
   ${scs.length?`<tr><td class="n">Total</td>${tot.map(v=>`<td class="h" style="font-weight:600">${v||''}</td>`).join('')}</tr>`:''}
  </tbody></table><p class="note" style="margin:8px 0 0">Cambia la cantidad de semanas con los botones 3 / 6 / 12 sem del Lookahead.</p></div></div></div></div>`;
  main.innerHTML=h;wireInd(main);
}


/** Tarjeta del día: trabajo no programado visto en obra, por subcontratista y en detalle. */
function npIndCard(L,d){const by={};L.forEach(i=>by[i.e.sc]=(by[i.e.sc]||0)+1);
  return`<div class="card"><h2>Trabajo no programado <span class="sub">${L.length} frente${L.length===1?'':'s'} visto${L.length===1?'':'s'} en obra el ${fmtD(d)} sin estar programado${L.length===1?'':'s'} · no cambia el PPC</span></h2><div class="pad">
    ${svgBarsH(Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([sc,n])=>({label:conOf(sc).name,v:n,color:conOf(sc).color})),v=>v+'')}
    <div class="tscroll"><table class="t ctab rt"><thead><tr><th>Ubicación</th><th>Qué se hacía</th><th>Subcontratista</th><th>Registró</th><th class="r">Fotos</th></tr></thead><tbody>
    ${L.map(i=>`<tr><td class="mono" data-l="Ubicación">${i.p?esc(i.p.code)+' · ':''}${i.a?esc(i.a.code+' '+i.a.name):'—'}</td><td class="wrapc lead">${esc(i.e.desc||'')}${i.e.exec!=null?` <span class="mu">· ${fq(i.e.exec)} ${esc(i.e.und||'')}</span>`:''}</td><td data-l="Subcontratista">${scLabel(i.e.sc)}</td><td class="mu" data-l="Registró">${esc(i.e.byName||i.e.by||'')} · ${hhmm(i.e.ts)}</td><td class="r" data-l="Fotos">${(i.e.photos||[]).length||''}</td></tr>`).join('')}</tbody></table></div></div></div>`}
