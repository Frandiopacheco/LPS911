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
/* PPC semanal histórico: dos líneas (bruto y del SC) en una sola escala 0–100 %, promedio de las semanas completas y
   una zona de toque por semana con el detalle. La línea del SC va punteada (no se distingue solo por color). */
function svgLines(pts,{h=230}={}){ // pts [{label,a,b,sub,part}]
  const n=pts.length;const L=40,R=78,T=16,B=30,W=Math.max(380,n*44+L+R),ih=h-T-B,iw=W-L-R;const X=i=>L+(n>1?i*iw/(n-1):iw/2),Y=v=>T+ih*(1-v);
  let s=`<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="PPC semanal histórico: bruto y del SC">`;
  [0,.25,.5,.75,1].forEach(g=>{const y=Y(g);s+=`<line class="gl" x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${y+4}" text-anchor="end">${g*100}%</text>`});
  const full=pts.filter(p=>!p.part&&p.a!=null);if(full.length>1){const av=full.reduce((t,p)=>t+p.a,0)/full.length;const y=Y(av);s+=`<line class="avg" x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}"/><text class="avgl" x="${L+6}" y="${y-5}">prom. ${pct(av)}</text>`}
  const line=(k,c)=>{const P=pts.map((p,i)=>p[k]==null?null:[X(i),Y(p[k])]);let d='',on=false;P.forEach(q=>{if(!q){on=false;return}d+=(on?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1);on=true});
    return`<path class="ln ${c}" d="${d}"/>`+P.map((q,i)=>q?`<circle class="pt ${c}${pts[i].part?' part':''}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4"/>`:'').join('')};
  s+=line('b','sc')+line('a','br');
  /* rótulo directo al final de cada línea (se separan si quedan encima) */
  const li=n-1;const la=pts[li].a,lb=pts[li].b;if(la!=null){let ya=Y(la)+4,yb=lb!=null?Y(lb)+4:null;if(yb!=null&&Math.abs(ya-yb)<13){if(ya<=yb){ya-=7;yb+=7}else{ya+=7;yb-=7}}
    s+=`<text class="lbl" x="${X(li)+8}" y="${ya}">bruto ${pct(la)}</text>`;if(yb!=null)s+=`<text class="lbl" x="${X(li)+8}" y="${yb}">SC ${pct(lb)}</text>`}
  pts.forEach((p,i)=>{const x0=n>1?X(i)-iw/(n-1)/2:L,w=n>1?iw/(n-1):iw;s+=`<g class="hit"><title>${esc(p.label)}${p.part?' (en evaluación)':''}: bruto ${pct(p.a)} · del SC ${pct(p.b)}${p.sub?' · '+esc(p.sub):''}</title><rect x="${Math.max(L,x0)}" y="${T}" width="${w}" height="${ih}" fill="transparent"/></g><text x="${X(i)}" y="${h-10}" text-anchor="middle">${esc(p.label)}</text>`});
  return s+'</svg>'}
const linesLegend=()=>`<div class="lnleg"><span><i class="br"></i>PPC bruto</span><span><i class="sc"></i>PPC del SC (sin lo no imputable)</span><span><i class="avg"></i>Promedio de semanas completas</span></div>`;
/** puntos del histórico: la última semana a medio evaluar va marcada (hueca) y no entra al promedio */
const ppcHistPts=ppcs=>ppcs.map(x=>({label:'S'+x.wk,a:x.ppc,b:x.ppcSc??x.ppc,part:x.ev<x.n,sub:`${x.ok} de ${x.n} compromisos${x.nimp?` · ${x.nimp} no imputables`:''}`}));
/* reprogramaciones del plan diario de la semana n (marcas ↷ del lookahead): por causa, por SC y a quién afectó cada uno */
const reproCause=v=>cncKey(v.cnc||(/personal/i.test(v.m||'')?'Subcontratas':''));
function reproData(n,vset){const wd=new Set(weekDays(n));const L=[];
  for(const x of[...S.act.values(),...(ARCH.act?ARCH.act.values():[])]){if(!x.rpl)continue;const pid=pisoOfAmb(x.ambId);if(!vset.has(pid))continue;for(const[d,v]of Object.entries(x.rpl))if(v&&wd.has(d))L.push({x,d,v,lead:!v.tr})}
  const byC={},byS={};const g=sc=>byS[sc]=byS[sc]||{lead:0,tren:0,imp:0,afe:0};
  for(const o of L){const so=g(o.x.sc);if(o.lead){so.lead++;byC[reproCause(o.v)]=(byC[reproCause(o.v)]||0)+1;if(o.v.imp!==false&&(!o.v.rsc||o.v.rsc===o.x.sc))so.imp++;if(o.v.rsc&&o.v.rsc!==o.x.sc)g(o.v.rsc).afe++}else so.tren++}
  return{L,byC,byS,lead:L.filter(o=>o.lead).length,tren:L.filter(o=>!o.lead).length}}
function reproCard(n,vset){const R=reproData(n,vset);if(!R.L.length)return`<div class="card"><h2>Reprogramaciones del plan diario <span class="sub">semana ${n}</span></h2><div class="pad"><div class="empty">No se reprogramó nada desde el plan diario esta semana.</div></div></div>`;
  const prog=Object.entries(R.byC).filter(([k])=>/^PROG/.test(k)).reduce((t,[,v])=>t+v,0);
  const rows=Object.entries(R.byS).sort((a,b)=>(b[1].lead+b[1].afe)-(a[1].lead+a[1].afe)||conOf(a[0]).name.localeCompare(conOf(b[0]).name));
  return`<div class="card chart"><h2>Reprogramaciones del plan diario <span class="sub">semana ${n} · cuánto se mueve y por qué</span></h2><div class="pad">
    <div class="tiles"><div class="tile"><span class="k">Reprogramadas</span><span class="v">${R.lead}</span></div><div class="tile"><span class="k">Arrastradas en el tren</span><span class="v">${R.tren}</span></div><div class="tile" title="Lo reprogramado porque estaba mal programado: muestra cuánto falta sincerar el lookahead"><span class="k">Por programación</span><span class="v">${R.lead?pct(prog/R.lead):'—'}<small> ${prog}</small></span></div></div>
    ${svgBarsH(Object.entries(R.byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,v})),v=>v+'')}
    <div class="tscroll"><table class="t rt"><thead><tr><th>Subcontratista</th><th class="r">Reprogramadas</th><th class="r">En el tren</th><th class="r" title="Reprogramadas por una causa que le corresponde (personal, la aceptó mal programada…)">Imputables a él</th><th class="r" title="Actividades de otras partidas que no fueron porque este SC no entregó el frente">Afectó a otras partidas</th></tr></thead><tbody>
    ${rows.map(([sc,o])=>`<tr><td data-l="Subcontratista"><span class="chip" style="--c:${conOf(sc).color};border:0;background:none;padding-left:0"><i></i>${esc(conOf(sc).name)}</span></td><td class="r" data-l="Reprogramadas">${o.lead||''}</td><td class="r" data-l="En el tren">${o.tren||''}</td><td class="r" data-l="Imputables a él">${o.imp||''}</td><td class="r${o.afe?' no':''}" data-l="Afectó a otras">${o.afe||''}</td></tr>`).join('')}</tbody></table></div></div></div>`}
/* restricciones registradas en la semana n: por causa (la del cuadro si viene del plan diario) y por SC */
function restrCauseCard(n,vset){const wd=new Set(weekDays(n));const today=todayIso();const L=[...S.res.values()].filter(r=>r.created&&wd.has(r.created)&&vset.has(restrPiso(r)));
  if(!L.length)return'';const cause=r=>r.cnc?cncKey(r.cnc):(r.type||'Sin causa registrada');const byC={},byS={};
  for(const r of L){byC[cause(r)]=(byC[cause(r)]||0)+1;const sc=r.sc||((S.act.get(r.actId)||{}).sc)||'';const o=byS[sc]=byS[sc]||{n:0,lib:0,late:0,pend:0};o.n++;if(r.status==='lib'){o.lib++;if(r.need&&r.freed&&r.freed>r.need)o.late++}else{o.pend++;if(r.need&&r.need<today)o.late++}}
  const rows=Object.entries(byS).sort((a,b)=>b[1].n-a[1].n);
  return`<div class="card chart"><h2>Restricciones registradas <span class="sub">semana ${n} · por causa y por subcontratista</span></h2><div class="pad">
    ${svgBarsH(Object.entries(byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,v})),v=>v+'')}
    <div class="tscroll"><table class="t rt"><thead><tr><th>Subcontratista</th><th class="r">Registradas</th><th class="r">Liberadas</th><th class="r">Pendientes</th><th class="r" title="Liberadas después de la fecha requerida o pendientes ya vencidas">Fuera de fecha</th></tr></thead><tbody>
    ${rows.map(([sc,o])=>`<tr><td data-l="Subcontratista">${sc?`<span class="chip" style="--c:${conOf(sc).color};border:0;background:none;padding-left:0"><i></i>${esc(conOf(sc).name)}</span>`:'<span class="mu">Sin partida</span>'}</td><td class="r" data-l="Registradas">${o.n}</td><td class="r ok" data-l="Liberadas">${o.lib||''}</td><td class="r" data-l="Pendientes">${o.pend||''}</td><td class="r${o.late?' no':''}" data-l="Fuera de fecha">${o.late||''}</td></tr>`).join('')}</tbody></table></div></div></div>`}
function svgBarsH(data,fmt){ // [{label,v,max,color?,sub}]
  const rowH=26,W=380,L=122,R=44,h=data.length*rowH+8;const mx=Math.max(1,...data.map(d=>d.max??d.v));
  let s=`<svg viewBox="0 0 ${W} ${h}" role="img">`;
  data.forEach((d,i)=>{const y=4+i*rowH;const bw=Math.max(d.v>0?3:0,(W-L-R)*(d.v/mx));
    s+=`<g><title>${esc(d.label)}: ${fmt(d.v)}${d.sub?' · '+esc(d.sub):''}</title>${d.color?`<rect x="0" y="${y+8}" width="12" height="12" rx="3" fill="${d.color}"/>`:''}<text class="nm" x="${d.color?18:0}" y="${y+18}">${esc(d.label.length>17?d.label.slice(0,16)+'…':d.label)}</text>
    <rect x="${L}" y="${y+6}" width="${W-L-R}" height="16" rx="4" fill="var(--panel2)"/><path class="bar" d="M${L},${y+6} h${Math.max(0,bw-4)} q4,0 4,4 v8 q0,4 -4,4 h-${Math.max(0,bw-4)} Z"/><text class="lab" x="${L+bw+6}" y="${y+18}">${fmt(d.v)}</text></g>`});
  return s+'</svg>'}
/* el SC de un día ya registrado es el que guardó el registro (rc.sc): cambiar la partida de la actividad después no
   pasa su historial a la empresa nueva; sin registro (o propuesta del capataz sin sc) manda la partida actual */
const scAt=(rc,x)=>(rc&&rc.sc)||x.sc;
/* PPC diario contra el plan cerrado del día (dplan): lo comprometido es la foto; lo agregado después no cuenta (sale en adds)
   y lo que salió del día sin registro, ya pasado el día, cuenta como no cumplido por programación (no imputable al SC). */
/* «No va» / reprogramada en el plan diario: lo comprometido que no se hará ese día ya tiene causa e imputabilidad (acts.rpl o la marca
   «No va» del plano); sin registro de campo cuenta como no cumplido con esa causa en vez de quedar «sin verificar» (oct 2026) */
function nvRec(x,d){if(d>todayIso())return null;const v=x.rpl&&x.rpl[d];const API=window.__plano;const z=!v&&API&&API.novaOf?API.novaOf(d,x.id):null;const o=v||z;if(!o)return null;
  const PROGN=(P().cnc||[]).find(c=>cncCode(c)==='PROG')||'Programación';const cnc=o.cnc||PROGN;
  return{status:'no',cnc,imp:o.imp!=null?!!o.imp:(o.cnc?null:false),rsc:o.rsc||'',pc:!!o.pc,note:'No va: '+(o.m||o.motivo||'reprogramada en el plan diario'),_nova:true,sc:x.sc}}
function dayDataSnap(dates,vset,rows){const adds=[];const today=todayIso();const seen=new Set(rows.map(r=>r.x.id+'|'+r.d));const PROGN=(P().cnc||[]).find(c=>cncCode(c)==='PROG')||'Programación';
  for(let i=rows.length-1;i>=0;i--){const r=rows[i];const sn=dplanOf(r.d,r.p.id);if(!sn||!sn.ids)continue;if(r.x.id in sn.ids){r.sched=true;r.snap=true}else{adds.push(r);rows.splice(i,1)}}
  for(const d of dates)for(const pid of vset){const sn=dplanOf(d,pid);if(!sn||!sn.ids)continue;
    for(const id of Object.keys(sn.ids)){if(seen.has(id+'|'+d))continue;const x=S.act.get(id)||(ARCH.act&&ARCH.act.get(id));if(!x)continue;if(doneBefore(id,d)&&!recOf(d,id))continue; /* terminada antes: no se le pide ese día */const a=ambOf(x.ambId);const sc_=a&&secOf(a.sectorId);const p=pisOf(pid);if(!a||!sc_||!p)continue;
      const rc=recOf(d,id)||nvRec(x,d)||(d<today?{status:'no',cnc:PROGN,imp:false,_out:true,note:'Salió del plan del día sin registro'}:null);
      rows.push({p,s:sc_,a,x,d,rc,sched:true,snap:true,sc:scAt(rc,x),arch:!S.act.has(id)});seen.add(id+'|'+d)}}
  return adds}
function dayData(dates,vset){const ds=new Set(dates);const rows=[],extras=[];const scA={},piA={},cnc={};const tot={prog:0,ver:0,ok:0,partial:0,no:0,nimp:0};
  for(const{p,secs}of tree()){if(!vset.has(p.id))continue;for(const{s,ambs}of secs)for(const{a,acts}of ambs)for(const x of acts)for(const d of dates){const sched=schedOn(x,d);const rc=recOf(d,x.id);if(sched||(rc&&!rc.late))rows.push({p,s,a,x,d,rc,sched,sc:scAt(rc,x)})}}
  dayDataArch(dates,vset,rows);
  const adds=dayDataSnap(dates,vset,rows);
  rows.forEach(r=>{if(!r.rc){const n=nvRec(r.x,r.d);if(n)r.rc=n}});
  extras.push(...npItems(ds,vset));
  const z=()=>({prog:0,ver:0,ok:0,partial:0,no:0,nimp:0});const add=(o,r)=>{o.prog++;if(r.rc){o.ver++;o[r.rc.status]++;if(impOf(r.rc)===false)o.nimp++}};
  rows.forEach(r=>{add(scA[r.sc]=scA[r.sc]||z(),r);add(piA[r.p.id]=piA[r.p.id]||z(),r);add(tot,r);if(r.rc&&r.rc.status!=='ok'){const k=cncKey(r.rc.cnc);cnc[k]=(cnc[k]||0)+1}});
  return{rows,extras,scA,piA,cnc,tot,adds}}
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
  const d=indDay();ensureDaily(addD(d,-1));const vp=visPisos();const vset=histPisoSet();const D=dayData([d],vset);const t=D.tot;
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
  const vp=visPisos();const vset=histPisoSet();
  const docs=[...S.wk.values()].filter(w=>w.frozenAt&&w.pisoId&&vset.has(w.pisoId));
  const ppcs=[...new Set(docs.map(w=>w.n))].map(n=>{const o=ppcWeekAgg(n,vset);return o?{...o,wk:+n}:null}).filter(Boolean).sort((a,b)=>a.wk-b.wk);
  /* el promedio y la «última» solo con semanas evaluadas por completo; una a medias se muestra aparte como parcial */
  const full=ppcs.filter(x=>x.ev>=x.n);const part=ppcs.length&&ppcs[ppcs.length-1].ev<ppcs[ppcs.length-1].n?ppcs[ppcs.length-1]:null;
  const last=full[full.length-1];const avg=full.length?full.reduce((s,x)=>s+x.ppc,0)/full.length:null;
  const cncC={};docs.forEach(w=>Object.values(w.res||{}).forEach(r=>{if(r&&r.ok===false){const k=cncKey(r.cnc);cncC[k]=(cncC[k]||0)+1}}));
  const cncL=Object.entries(cncC).sort((a,b)=>b[1]-a[1]);
  const wSel=docs.filter(w=>w.n===U.week);const scP=wkScStats(wSel);for(const k of Object.keys(scP))if(!scP[k].n)delete scP[k];
  const pisoP=wSel.map(w=>({w,st:ppcOf(w),p:S.pis.get(w.pisoId)||ARCH.pis.get(w.pisoId)})).filter(x=>x.st&&x.p).sort((a,b)=>a.p.order-b.p.order);
  const pend=restrInScope().filter(rOpenC).length;
  let h=`<div class="scroll"><div class="wrap">${indBar()}
   <div class="tiles">
   <div class="tile hl"><span class="k">PPC semanal (oficial) · última</span><span class="v">${last?pct(last.ppc):'—'}${last?` <small>sem ${last.wk}</small>`:''}</span>${part?`<span class="mu" style="font-size:12px">Sem ${part.wk} en evaluación: ${part.ev} de ${part.n} evaluados</span>`:''}</div>
   <div class="tile" title="Sin contar los no cumplidos que no dependían del subcontratista"><span class="k">PPC del SC · última</span><span class="v">${last&&last.ppcSc!=null?pct(last.ppcSc):'—'}${last?` <small>sem ${last.wk}</small>`:''}</span></div>
   <div class="tile"><span class="k">PPC promedio</span><span class="v">${pct(avg)}${full.length?` <small>${full.length} sem</small>`:''}</span></div>
   <div class="tile"><span class="k">Semanas evaluadas</span><span class="v">${full.length}${part?' <small>+1 en curso</small>':''}</span></div>
   <div class="tile"><span class="k">Restricciones pendientes</span><span class="v">${pend}</span></div></div>`;
  if(!ppcs.length)h+=`<div class="callout">El PPC aparece cuando congelas los compromisos de un piso en <b>PPC semanal</b> y evalúas cada uno con Sí / No.</div>`;
  const dFrom=weekStart(U.week-2),dTo=[weekDays(U.week)[5],todayIso()].sort()[0];const dd=[];for(let d=dFrom;d<=dTo;d=addD(d,1)){if(isWork(d))dd.push(d)}
  /* misma población que Indicadores › Diario (dayData): incluye lo archivado y los registros históricos */
  const DD=dayData(dd,vset);const byD={};DD.rows.forEach(r=>(byD[r.d]=byD[r.d]||[]).push(r));const dayRows=[];const dCnc={};let nExtra=0;
  for(const d of dd){let sch=0,okc=0,reg=0;for(const r of byD[d]||[]){if(r.sched)sch++;const rc=r.rc;if(rc){reg++;if(rc.status==='ok')okc++;else if(rc.cnc){const k=cncKey(rc.cnc);dCnc[k]=(dCnc[k]||0)+1}}}
    nExtra+=npItems([d],vset).length;
    if(reg)dayRows.push({label:DL[(pd(d).getUTCDay()+6)%7]+' '+d.slice(8),v:okc/reg,sub:`${okc} de ${reg} verificadas · ${sch} programadas`})}
  h+=`<div class="card chart"><h2>PPC diario (alerta · registros de campo) <span class="sub">% de lo verificado en campo marcado “Cumplido” · semanas ${U.week-2}–${U.week}${nExtra?` · ${nExtra} trabajos no programados`:''}</span></h2><div class="pad tscroll">${dayRows.length?svgBarsV(dayRows):'<div class="empty">Aún no hay registros de campo en estas semanas. Se llenan desde la pestaña <b>Campo</b>.</div>'}</div></div>`;
  {const wd=weekDays(U.week).filter(x=>x<=todayIso());const W=dayData(wd,vset);const e=Object.entries(W.scA).filter(([,o])=>o.ver).sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name));
   h+=`<div class="card"><h2>Cumplimiento en campo por subcontratista <span class="sub">semana ${U.week} · registros diarios acumulados</span></h2><div class="pad">${e.length?cumplTable(e,scLabel):'<div class="empty">Sin registros de campo en esta semana.</div>'}</div></div>`}
  {const nd=dd.map(d=>({d,n:npItems([d],vset).length})).filter(o=>o.n);if(nd.length)h+=`<div class="card chart"><h2>Trabajo no programado por día <span class="sub">frentes vistos en obra sin estar programados · semanas ${U.week-2}–${U.week}</span></h2><div class="pad">${svgBarsH(nd.map(o=>({label:DOWN[(pd(o.d).getUTCDay()+6)%7].slice(0,3)+' '+fmtD(o.d),v:o.n})),v=>v+'')}</div></div>`}
  if(Object.keys(dCnc).length)h+=`<div class="card chart"><h2>Causas registradas en campo <span class="sub">Parcial y No cumplido · mismas semanas</span></h2><div class="pad">${svgBarsH(Object.entries(dCnc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,v})),v=>v+'')}</div></div>`;
  h+=`<div class="charts">
   <div class="card chart"><h2>PPC semanal histórico <span class="sub">todas las semanas congeladas</span></h2><div class="pad tscroll">${ppcs.length?linesLegend()+svgLines(ppcHistPts(ppcs)):'<div class="empty">Sin semanas evaluadas.</div>'}</div></div>
   ${!U.piso&&vp.length>1?`<div class="card chart"><h2>PPC por piso <span class="sub">semana ${U.week}</span></h2><div class="pad">${pisoP.length?svgBarsH(pisoP.map(x=>({label:x.p.code+' · '+x.p.name,v:x.st.ppc,max:1,sub:x.st.ok+' de '+x.st.n})),pct):`<div class="empty">Ningún piso congeló la semana ${U.week}.</div>`}</div></div>`:''}
   <div class="card chart"><h2>Causas de no cumplimiento <span class="sub">acumulado</span></h2><div class="pad">${cncL.length?svgBarsH(cncL.map(([k,v])=>({label:k,v})),v=>v+''):'<div class="empty">Sin incumplimientos registrados.</div>'}</div></div>
   <div class="card chart"><h2>PPC por subcontratista <span class="sub">semana ${U.week}</span></h2><div class="pad">${Object.keys(scP).length?svgBarsH(Object.entries(scP).sort((a,b)=>b[1].ok/b[1].n-a[1].ok/a[1].n).map(([sc,o])=>({label:conOf(sc).name,v:o.ok/o.n,max:1,color:conOf(sc).color,sub:o.ok+' de '+o.n+(o.nimp||o.ext?` · PPC del SC ${pct(o.ppcSc)}${o.nimp?` (${o.nimp} no imput.)`:''}${o.ext?` · ${o.ext} de otras partidas`:''}`:'')})),pct):`<div class="empty">La semana ${U.week} no está congelada${U.piso?' en este piso':''}.</div>`}</div></div>
  </div>`;
  h+=reproCard(U.week,vset)+restrCauseCard(U.week,vset);
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
/* causas: una sola barra por causa del cuadro de la empresa (las antiguas con otro nombre se juntan por su código) */
function cncKey(c){if(!c)return'Sin causa registrada';const o=cncStd(c);if(o)return o.c+' · '+o.n;const g=CNC_GUESS.find(([re])=>re.test(c));const so=g&&CNC_STD.find(x=>x.c===g[1]);return so?so.c+' · '+so.n:c}
