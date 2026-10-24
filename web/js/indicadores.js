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
function svgLines(pts,{h=230,minW=380,nA='bruto',nB='del SC',eA='bruto',eB='SC'}={}){ // pts [{label,a,b,sub,part}]; minW: ancho mínimo (la presentación lo pide más ancho)
  const n=pts.length;const L=40,R=78,T=16,B=30,W=Math.max(minW,n*44+L+R),ih=h-T-B,iw=W-L-R;const X=i=>L+(n>1?i*iw/(n-1):iw/2),Y=v=>T+ih*(1-v);
  let s=`<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="PPC semanal histórico: bruto y del SC">`;
  [0,.25,.5,.75,1].forEach(g=>{const y=Y(g);s+=`<line class="gl" x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${y+4}" text-anchor="end">${g*100}%</text>`});
  const{avg:av,L:full}=ppcAvg(pts);if(full.length>1){const y=Y(av);s+=`<line class="avg" x1="${L}" x2="${W-R+6}" y1="${y}" y2="${y}"/><text class="avgl" x="${L+6}" y="${y-5}">prom. ${pct(av)}</text>`}
  const line=(k,c)=>{const P=pts.map((p,i)=>p[k]==null?null:[X(i),Y(p[k])]);let d='',on=false;P.forEach(q=>{if(!q){on=false;return}d+=(on?'L':'M')+q[0].toFixed(1)+','+q[1].toFixed(1);on=true});
    return`<path class="ln ${c}" d="${d}"/>`+P.map((q,i)=>q?`<circle class="pt ${c}${pts[i].part?' part':''}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4"/>`:'').join('')};
  s+=line('b','sc')+line('a','br');
  /* rótulo directo al final de cada línea (se separan si quedan encima) */
  const li=n-1;const la=pts[li].a,lb=pts[li].b;if(la!=null){let ya=Y(la)+4,yb=lb!=null?Y(lb)+4:null;if(yb!=null&&Math.abs(ya-yb)<13){if(ya<=yb){ya-=7;yb+=7}else{ya+=7;yb-=7}}
    s+=`<text class="lbl" x="${X(li)+8}" y="${ya}">${eA} ${pct(la)}</text>`;if(yb!=null)s+=`<text class="lbl" x="${X(li)+8}" y="${yb}">${eB} ${pct(lb)}</text>`}
  pts.forEach((p,i)=>{const x0=n>1?X(i)-iw/(n-1)/2:L,w=n>1?iw/(n-1):iw;s+=`<g class="hit"><title>${esc(p.label)}${p.part?' (en evaluación)':''}: ${nA} ${pct(p.a)} · ${nB} ${pct(p.b)}${p.sub?' · '+esc(p.sub):''}</title><rect x="${Math.max(L,x0)}" y="${T}" width="${w}" height="${ih}" fill="transparent"/></g><text x="${X(i)}" y="${h-10}" text-anchor="middle">${esc(p.label)}</text>`});
  return s+'</svg>'}
/* ---------- PPC histórico cargado a mano (oct 2026, pedido del dueño) ----------
   El sistema recién empezó a congelar el plan semanal: las semanas anteriores solo existen como un número. `meta/project.ppcHist` =
   {"<semana>":{a:PPC interno (0–1), c:PPC cliente (0–1)}} (solo el administrador lo edita). Una semana con dato a mano usa ese valor
   en los gráficos; sin él, lo que arroja el plan congelado. */
const ppcMan=()=>P().ppcHist||{};
/** puntos de «PPC semanal histórico» (interno): los congelados y, por semana, los cargados a mano (que mandan si existen) */
function ppcHistAll(ppcs,maxWk){const M=ppcMan();const m=new Map();
  ppcs.forEach(x=>{if(maxWk==null||x.wk<=maxWk)m.set(x.wk,{wk:x.wk,...ppcHistPts([x])[0]})});
  for(const[k,o]of Object.entries(M)){const w=+k;if(!(w>0)||o==null||o.a==null||(maxWk!=null&&w>maxWk))continue;m.set(w,{wk:w,label:'S'+w,a:o.a,b:null,part:false,man:true,sub:'dato cargado a mano'})}
  return[...m.values()].sort((a,b)=>a.wk-b.wk)}
/** texto «semana  PPC interno  PPC cliente» (uno por línea) → {h, bad}. Los % pueden ir como 85, 85% o 0,85; «-» = sin dato */
function ppcHistParse(t){const h={},bad=[];
  const num=s=>{s=String(s||'').trim().replace(',','.');if(!s||/^[-—–]+$/.test(s))return null;const pc=s.endsWith('%');const v=parseFloat(s);if(isNaN(v)||v<0)return NaN;const f=pc||v>1?v/100:v;return f>1?NaN:f};
  for(const l of String(t||'').split(/\n/).map(x=>x.trim()).filter(Boolean)){const T=l.split(/[\s;\t]+/);const w=parseInt(String(T[0]).replace(/^s/i,''),10);
    const a=num(T[1]),c=T.length>2?num(T[2]):null;
    if(!(w>0&&w<1000)||T.length<2||Number.isNaN(a)||Number.isNaN(c)||(a==null&&c==null)){bad.push(l);continue}
    h[w]={...(a!=null?{a}:{}),...(c!=null?{c}:{})}}
  return{h,bad}}
async function ppcHistEdit(){if(!isAdmin)return;const M=ppcMan();
  const cur=Object.keys(M).map(Number).sort((a,b)=>a-b).map(w=>`${w}  ${M[w].a!=null?Math.round(M[w].a*100):'-'}  ${M[w].c!=null?Math.round(M[w].c*100):'-'}`).join('\n');
  const t=await uiAsk({title:'PPC histórico (semanas anteriores al sistema)',html:'<p>Una semana por línea: <b>semana  PPC interno  PPC cliente</b>. Ejemplo: <code>52  84  80</code>. Usa «-» si no tienes ese dato. Estas semanas se grafican con tu dato; las que el sistema ya congeló usan lo que arroja el plan semanal, salvo que cargues un valor aquí.</p>',input:{label:'Semanas',value:cur,placeholder:'52  84  80\n53  86  -'},ok:'Guardar',tone:'info'});
  if(t==null)return;const{h,bad}=ppcHistParse(t);
  if(bad.length&&!await uiAsk({title:'Hay líneas que no se entienden',list:bad.slice(0,6),note:'Se omiten. ¿Guardar el resto?',ok:'Guardar',tone:'warn'}))return;
  apply([op('meta','project',{...P(),ppcHist:h})],'PPC histórico guardado');requestRender()}
const linesLegend=()=>`<div class="lnleg"><span><i class="br"></i>PPC bruto</span><span><i class="sc"></i>PPC del SC (sin lo no imputable)</span><span><i class="avg"></i>Promedio de semanas completas</span></div>`;
/** puntos del histórico: la última semana a medio evaluar va marcada (hueca) y no entra al promedio */
const ppcHistPts=ppcs=>ppcs.map(x=>({label:'S'+x.wk,a:x.ppc,b:x.ppcSc??x.ppc,part:x.ev<x.n,sub:`${x.ok} de ${x.n} compromisos${x.nimp?` · ${x.nimp} no imputables`:''}`}));
/* reprogramaciones del plan diario de la semana n (marcas ↷ del lookahead): por causa, por SC y a quién afectó cada uno */
const reproCause=v=>cncKey(v.cnc||(/personal/i.test(v.m||'')?'Subcontratas':''));
function reproData(n,vset,M){const wd=new Set(weekDays(n));const L=[];
  for(const x of[...S.act.values(),...(ARCH.act?ARCH.act.values():[])]){if(!x.rpl||(M&&!M.has(x.sc)))continue;const pid=pisoOfAmb(x.ambId);if(!vset.has(pid))continue;for(const[d,v]of Object.entries(x.rpl))if(v&&wd.has(d))L.push({x,d,v,lead:!v.tr})}
  const byC={},byS={};const g=sc=>byS[sc]=byS[sc]||{lead:0,tren:0,imp:0,afe:0};
  for(const o of L){const so=g(o.x.sc);if(o.lead){so.lead++;byC[reproCause(o.v)]=(byC[reproCause(o.v)]||0)+1;if(o.v.imp!==false&&(!o.v.rsc||o.v.rsc===o.x.sc))so.imp++;if(o.v.rsc&&o.v.rsc!==o.x.sc)g(o.v.rsc).afe++}else so.tren++}
  return{L,byC,byS,lead:L.filter(o=>o.lead).length,tren:L.filter(o=>!o.lead).length}}
function reproCard(n,vset,M){const R=reproData(n,vset,M);if(!R.L.length)return`<div class="card"><h2>Reprogramaciones del plan diario <span class="sub">semana ${n}</span></h2><div class="pad"><div class="empty">No se reprogramó nada desde el plan diario esta semana.</div></div></div>`;
  const prog=Object.entries(R.byC).filter(([k])=>/^PROG/.test(k)).reduce((t,[,v])=>t+v,0);
  const rows=Object.entries(R.byS).filter(([sc])=>!M||M.has(sc)).sort((a,b)=>(b[1].lead+b[1].afe)-(a[1].lead+a[1].afe)||conOf(a[0]).name.localeCompare(conOf(b[0]).name));
  return`<div class="card chart"><h2>Reprogramaciones del plan diario <span class="sub">semana ${n} · cuánto se mueve y por qué</span></h2><div class="pad">
    <div class="tiles"><div class="tile"><span class="k">Reprogramadas</span><span class="v">${R.lead}</span></div><div class="tile"><span class="k">Arrastradas en el tren</span><span class="v">${R.tren}</span></div><div class="tile" title="Lo reprogramado porque estaba mal programado: muestra cuánto falta sincerar el lookahead"><span class="k">Por programación</span><span class="v">${R.lead?pct(prog/R.lead):'—'}<small> ${prog}</small></span></div></div>
    ${svgBarsH(Object.entries(R.byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:k,v})),v=>v+'')}
    <div class="tscroll"><table class="t rt"><thead><tr><th>Subcontratista</th><th class="r">Reprogramadas</th><th class="r">En el tren</th><th class="r" title="Reprogramadas por una causa que le corresponde (personal, la aceptó mal programada…)">Imputables a él</th><th class="r" title="Actividades de otras partidas que no fueron porque este SC no entregó el frente">Afectó a otras partidas</th></tr></thead><tbody>
    ${rows.map(([sc,o])=>`<tr><td data-l="Subcontratista"><span class="chip" style="--c:${conOf(sc).color};border:0;background:none;padding-left:0"><i></i>${esc(conOf(sc).name)}</span></td><td class="r" data-l="Reprogramadas">${o.lead||''}</td><td class="r" data-l="En el tren">${o.tren||''}</td><td class="r" data-l="Imputables a él">${o.imp||''}</td><td class="r${o.afe?' no':''}" data-l="Afectó a otras">${o.afe||''}</td></tr>`).join('')}</tbody></table></div></div></div>`}
/* restricciones registradas en la semana n: por causa (la del cuadro si viene del plan diario) y por SC */
function restrCauseCard(n,vset,M){const wd=new Set(weekDays(n));const today=todayIso();const L=[...S.res.values()].filter(r=>r.created&&wd.has(r.created)&&vset.has(restrPiso(r))&&(!M||M.has(r.sc||((S.act.get(r.actId)||{}).sc)||'')));
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
    s+=`<g${d.dsc?` data-dsc="${esc(d.dsc)}" class="dsgo${DB_.sc.size?(DB_.sc.has(d.dsc)?' dsel':' ddim'):''}"`:''}><title>${esc(d.label)}: ${fmt(d.v)}${d.sub?' · '+esc(d.sub):''}${d.dsc?' · clic: filtrar el tablero por este SC':''}</title>${d.color?`<rect x="0" y="${y+8}" width="12" height="12" rx="3" fill="${d.color}"/>`:''}<text class="nm" x="${d.color?18:0}" y="${y+18}">${esc(d.label.length>17?d.label.slice(0,16)+'…':d.label)}</text>
    <rect x="${L}" y="${y+6}" width="${W-L-R}" height="16" rx="4" fill="var(--panel2)"/><path class="bar" d="M${L},${y+6} h${Math.max(0,bw-4)} q4,0 4,4 v8 q0,4 -4,4 h-${Math.max(0,bw-4)} Z"/><text class="lab" x="${L+bw+6}" y="${y+18}">${fmt(d.v)}</text></g>`});
  return s+'</svg>'}
/* el SC de un día ya registrado es el que guardó el registro (rc.sc): cambiar la partida de la actividad después no
   pasa su historial a la empresa nueva; sin registro (o propuesta del capataz sin sc) manda la partida actual */
const scAt=(rc,x)=>(rc&&rc.sc)||x.sc;
/* PPC diario contra el plan cerrado del día (dplan): lo comprometido es la foto; lo agregado después no cuenta (sale en adds).
   El estado de cada fila comprometida sale solo de su registro (o del «No va»), con la misma regla para todas: que la actividad
   siga o no ese día en el Lookahead no cambia nada. Sin registro queda «sin verificar»; no se inventa un No ni una causa
   (auditoría PPC diario, hallazgo 3, oct 2026). */
/* «No va» del plan diario y PPC diario (decidido con el dueño, oct 2026):
   - decidido ANTES del día (en la reunión de la víspera): ese día ya no es compromiso diario → sale del PPC diario (el semanal
     lo sigue midiendo: si no se cumple en la semana, cuenta con su causa);
   - decidido el mismo día (o reprogramado después de publicar, marca acts.rpl): no cumplido con esa causa e imputabilidad,
     en vez de quedar «sin verificar».
   Las «No va» se leen de pdz (kind == 'nova') y se indexan por fecha|actividad. Solo desde hace NOVA_D (45) días (auditoría de datos
   M4: antes se escuchaban todas desde el inicio de la obra): Tablero (30 días) e Indicadores (3 semanas) caben; si una vista pide
   un día más antiguo (Indicadores o un reporte de una fecha vieja), dayData amplía la suscripción desde ese día (ensureNova(desde)),
   como ensureDaily. Necesita el índice pdz(kind, date) (firestore.indexes.json); mientras no esté construido Firestore responde
   failed-precondition y se usa la consulta de antes, sin límite de fecha (novaAll). */
const NOVA=new Map();let novaSub=null,novaFrom=null,novaAll=false,novaWait=false;let NOVAV=0; /* sube con cada cambio de NOVA (memoria de dayData) */
const NOVA_D=45;
function ensureNova(from){if(!db||novaWait)return;const f0=addD(todayIso(),-NOVA_D);const f=from&&from<f0?from:f0;
  if(novaSub&&(novaAll||f>=novaFrom))return;if(novaSub)novaSub();novaFrom=f;
  const q=novaAll?fcol('pdz').where('kind','==','nova'):fcol('pdz').where('kind','==','nova').where('date','>=',f);
  novaSub=q.onSnapshot(sn=>{NOVA.clear();sn.docs.forEach(dc=>{const z=dc.data();if(z&&!z.draft&&z.date&&z.actId)NOVA.set(z.date+'|'+z.actId,z)});NOVAV++;snapOk('nova');if(ready&&['ind','dash','hoy'].includes(U.tab))snapRender(sn)},
    err=>{novaSub=null;
      if(err&&err.code==='failed-precondition'&&!novaAll){novaAll=true;console.warn('LPS: falta el índice pdz(kind, date); las «No va» se leen sin límite de fecha');ensureNova(from);return}
      novaWait=true;snapFail('nova',err,()=>{novaWait=false;ensureNova(novaFrom)})});
  if(!unsubs.includes(stopNova))unsubs.push(stopNova)}
function stopNova(){if(novaSub)novaSub();novaSub=null;novaFrom=null;novaWait=false;NOVA.clear();NOVAV++}
const dayStartMs=d=>Date.parse(d+'T00:00:00Z')+LIMA_OFF;
/** 'out' = no cuenta en el PPC diario; un registro = no cumplido por «No va»; null = nada que hacer */
function nvRec(x,d){if(d>todayIso())return null;ensureNova();const z=NOVA.get(d+'|'+x.id);const v=x.rpl&&x.rpl[d];
  if(z&&+z.ts>0&&+z.ts<dayStartMs(d))return'out';const o=v||z;if(!o)return null;
  const PROGN=(P().cnc||[]).find(c=>cncCode(c)==='PROG')||'Programación';const cnc=o.cnc||PROGN;
  return{status:'no',cnc,imp:o.imp!=null?!!o.imp:(o.cnc?null:false),rsc:o.rsc||'',pc:!!o.pc,note:'No va: '+(o.m||o.motivo||'reprogramada en el plan diario'),_nova:true,sc:x.sc}}
/* hallazgo 6: con la foto que guarda SC y ambiente (dplan.who), la fila usa los de la publicación; sin registro con sc,
   el SC es el de la foto. Fotos antiguas (sin who): como antes, la actividad vigente. */
function whoFix(r,sn){const w=sn&&sn.who&&sn.who[r.x.id];if(!w)return;if(!(r.rc&&r.rc.sc)&&w.sc)r.sc=w.sc;
  if(w.amb&&w.amb!==r.a.id){const a=ambOf(w.amb);const s=a&&secOf(a.sectorId);if(a&&s){r.a=a;r.s=s}}}
function dayDataSnap(dates,vset,rows){const adds=[];const seen=new Set(rows.map(r=>r.x.id+'|'+r.d));
  for(let i=rows.length-1;i>=0;i--){const r=rows[i];const sn=dplanOf(r.d,r.p.id);if(!sn||!sn.ids)continue;if(r.x.id in sn.ids){r.sched=true;r.snap=true;whoFix(r,sn)}else{adds.push(r);rows.splice(i,1)}}
  for(const d of dates)for(const pid of vset){const sn=dplanOf(d,pid);if(!sn||!sn.ids)continue;
    for(const id of Object.keys(sn.ids)){if(seen.has(id+'|'+d))continue;const x=S.act.get(id)||(ARCH.act&&ARCH.act.get(id));if(!x)continue;if(doneBefore(id,d)&&!recOf(d,id))continue;
      /* DAT-10: archivada antes del Cierre del ingeniero de ese día y sin registro de un ingeniero: fuera (como el servidor) */if(!S.act.has(id)&&archCut(x,d)&&!recReal(d,id))continue; /* terminada antes: no se le pide ese día */const a=ambOf(x.ambId);const sc_=a&&secOf(a.sectorId);const p=pisOf(pid);if(!a||!sc_||!p)continue;
      const nv=recOf(d,id)?null:nvRec(x,d);if(nv==='out')continue;
      const rc=recOf(d,id)||nv||null;
      const r={p,s:sc_,a,x,d,rc,sched:true,snap:true,sc:scAt(rc,x),arch:!S.act.has(id)};whoFix(r,sn);rows.push(r);seen.add(id+'|'+d)}}
  return adds}
function dayDataCore(dates,vset){const rows=[];
  for(const{p,secs}of tree()){if(!vset.has(p.id))continue;for(const{s,ambs}of secs)for(const{a,acts}of ambs)for(const x of acts)for(const d of dates){const sched=schedOn(x,d);const rc=recOf(d,x.id);if(sched||(rc&&!rc.late))rows.push({p,s,a,x,d,rc,sched,sc:scAt(rc,x)})}}
  dayDataArch(dates,vset,rows);
  const adds=dayDataSnap(dates,vset,rows);
  for(let i=rows.length-1;i>=0;i--){const r=rows[i];if(r.rc)continue;const n=nvRec(r.x,r.d);if(n==='out')rows.splice(i,1);else if(n)r.rc=n}
  const today=todayIso();for(const r of rows)if(r.d<today)recNames(r);
  return{rows,...dayAgg(rows),adds}}
/* C-32 (tanda 1, DAT-03): un día pasado se muestra con el nombre de la actividad y el ambiente que guardó su registro (rc.nm, rc.ambId),
   como el semanal guarda los de la foto: renombrar o unificar después en el catálogo no cambia el PPC diario ya mostrado. La fila lleva
   una copia de la actividad con ese nombre (la del lookahead no se toca). */
function recNames(r){const rc=r.rc;if(!rc||rc._nova||rc._prop)return;
  if(rc.nm&&rc.nm!==r.x.name)r.x={...r.x,name:rc.nm};
  if(rc.ambId&&rc.ambId!==r.a.id){const a=ambOf(rc.ambId);const s=a&&secOf(a.sectorId);if(a&&s){r.a=a;r.s=s}}}
/* totales por SC, por piso, causas y total de unas filas de dayData */
/* LPS-13 (tanda 1): como el semanal (ppcOf), en el total del piso y de la obra un «frente no entregado» que el ingeniero hizo contar
   a la partida anterior (rsc + pc) sí es imputable (a otra partida); para el SC afectado sigue siendo no imputable (scA) */
function dayAgg(rows){const scA={},piA={},cnc={};const tot={prog:0,ver:0,ok:0,partial:0,no:0,nimp:0};
  const z=()=>({prog:0,ver:0,ok:0,partial:0,no:0,nimp:0});const add=(o,r,tp)=>{o.prog++;if(r.rc){o.ver++;o[r.rc.status]++;if(impOf(r.rc)===false&&!(tp&&r.rc.rsc&&r.rc.pc))o.nimp++}};
  rows.forEach(r=>{add(scA[r.sc]=scA[r.sc]||z(),r);add(piA[r.p.id]=piA[r.p.id]||z(),r,1);add(tot,r,1);if(r.rc&&r.rc.status!=='ok'){const k=cncKey(r.rc.cnc);cnc[k]=(cnc[k]||0)+1}});
  return{scA,piA,cnc,tot}}
/* con memoria (auditoría de código 08/10, M5): el Tablero la pide para 30 días en cada dibujo (cada 60 s y con cada cambio que
   llega) e Indicadores varias veces. La clave lleva todo lo que cambia el resultado: DV (lookahead, archivados, fotos del plan,
   configuración), DONEV (registros de campo, cierres en vivo, terminadas), NOVAV («No va»), hoy, fechas y pisos; además se compara
   la identidad de los Maps (las versiones guardadas y la del cliente reemplazan S.act sin subir DV). Lo no programado (npItems)
   es barato y no tiene versión: se arma siempre. El resultado se comparte entre llamadas: no se modifican sus filas. */
const DDM=new Map();
function dayData(dates,vset){const ds=new Set(dates);if(dates.length)ensureNova(dates.reduce((a,b)=>b<a?b:a)); /* las «No va» desde el día más antiguo pedido */
  const k=DV+'|'+DONEV+'|'+NOVAV+'|'+todayIso()+'|'+dates.join(',')+'|'+[...vset].sort().join(',');
  const refs=[S.act,S.amb,S.sec,S.pis,ARCH.act,ARCH.amb,DAY,LIVE,DPL];let e=DDM.get(k);
  if(!e||e.refs.some((r,i)=>r!==refs[i])){e={refs,v:dayDataCore(dates,vset)};DDM.delete(k);if(DDM.size>=12)DDM.delete(DDM.keys().next().value);DDM.set(k,e)}
  return{...e.v,extras:npItems(ds,vset)}}
function cumplTable(entries,label){return`<div class="tscroll"><table class="t ctab"><thead><tr><th></th><th class="r">Prog.</th><th class="r hm">Verif.</th><th class="r">✓</th><th class="r hm">½</th><th class="r hm">✗</th><th class="r hm">Sin verif.</th><th class="r hm" title="Parcial o No cumplido por causas que no dependen del subcontratista">No imputables</th><th>PPC bruto</th><th title="Sin contar los incumplimientos no imputables al subcontratista">PPC del SC</th></tr></thead><tbody>${entries.map(([k,o])=>{const v=o.ver?o.ok/o.ver:null;const vs=pscOf(o);
  return`<tr><td>${label(k)}</td><td class="r">${o.prog}</td><td class="r hm">${o.ver}</td><td class="r ok">${o.ok||''}</td><td class="r pa hm">${o.partial||''}</td><td class="r no hm">${o.no||''}</td><td class="r mu hm">${o.prog-o.ver||''}</td><td class="r mu hm">${o.nimp||''}</td><td>${v==null?'<span class="mu">sin verificar</span>':`<span class="pbar"><i style="width:${Math.round(v*100)}%"></i></span><b>${pct(v)}</b>`}</td><td>${vs==null?(v==null?'':'<span class="mu">—</span>'):`<span class="pbar sc"><i style="width:${Math.round(vs*100)}%"></i></span><b>${pct(vs)}</b>`}</td></tr>`}).join('')}</tbody></table></div>`}
/** semanas congeladas filtradas por piso y/o SC (copias: con SC, solo sus compromisos); se usan igual que las originales (ppcOf, wkScStats, ncCard) */
function wkFilt(docs,sc,pi){return docs.filter(w=>!pi||w.pisoId===pi).map(w=>{if(!sc)return w;const items={},res={};
  for(const[id,it]of Object.entries(w.items||{}))if(it.sc===sc){items[id]=it;if(w.res&&w.res[id])res[id]=w.res[id]}return{...w,items,res}}).filter(w=>Object.keys(w.items||{}).length)}
/** las semanas con solo los compromisos de las partidas M (el SC, #320); sin M, tal cual */
function wkFiltM(docs,M){if(!M)return docs;return docs.map(w=>{const items={},res={};
  for(const[id,it]of Object.entries(w.items||{}))if(M.has(it.sc)){items[id]=it;if(w.res&&w.res[id])res[id]=w.res[id]}return{...w,items,res}}).filter(w=>Object.keys(w.items).length)}
const wkTot=docs=>{const t={n:0,ok:0,ev:0,nimp:0};for(const w of docs){const o=ppcOf(w);if(o){t.n+=o.n;t.ok+=o.ok;t.ev+=o.ev;t.nimp+=o.nimp}}return t};
/** fila del semáforo (ixdRow) con datos del plan semanal: PPC bruto = Sí / compromisos; `ver` = compromisos */
function wkRow(k,o){const br=o.n?o.ok/o.n:null,ps=o.ppcSc!=null?o.ppcSc:ppcScOf(o.ok,o.n,o.nimp),v=IXD_M==='sc'?ps:br,nimp=o.nimp||0;
  return{...k,o:{prog:o.n,ver:o.n,ok:o.ok,partial:0,no:o.n-o.ok,nimp},br,ps,v,band:ixdBand(v),nimp,imp:o.n-o.ok-nimp}}
function wkPisoRows(docs){return docs.map(w=>{const st=ppcOf(w),p=S.pis.get(w.pisoId)||ARCH.pis.get(w.pisoId);return st&&p?wkRow({pi:p,sc:''},{n:st.n,ok:st.ok,nimp:st.nimp,ppcSc:st.ppcSc}):null}).filter(Boolean).sort((a,b)=>a.pi.order-b.pi.order)}
/** tabla por SC del plan semanal congelado (wkScStats): compromisos, Sí, No, sin evaluar, no imputables, PPC bruto (Sí / compromisos) y del SC */
function wkScTable(entries,label){return`<div class="tscroll"><table class="t ctab"><thead><tr><th></th><th class="r">Compromisos</th><th class="r">Sí</th><th class="r">No</th><th class="r hm">Sin evaluar</th><th class="r hm" title="No cumplidos por causas que no dependen del subcontratista">No imputables</th><th class="r hm" title="Fallas de otras partidas que el ingeniero le hizo contar">De otras partidas</th><th title="Cumplidos (Sí) entre todos los compromisos congelados, como en el Plan semanal">PPC bruto</th><th title="Sin contar los no cumplidos no imputables al subcontratista">PPC del SC</th></tr></thead><tbody>${entries.map(([k,o])=>{const v=o.n?o.ok/o.n:null;const vs=o.ppcSc;
  return`<tr><td>${label(k)}</td><td class="r">${o.n}</td><td class="r ok">${o.ok||''}</td><td class="r no">${o.no||''}</td><td class="r mu hm">${o.n-o.ev||''}</td><td class="r mu hm">${o.nimp||''}</td><td class="r mu hm">${o.ext||''}</td><td>${v==null?'':`<span class="pbar"><i style="width:${Math.round(v*100)}%"></i></span><b>${pct(v)}</b>`}</td><td>${vs==null?'<span class="mu">—</span>':`<span class="pbar sc"><i style="width:${Math.round(vs*100)}%"></i></span><b>${pct(vs)}</b>`}</td></tr>`}).join('')}</tbody></table></div>`}
const scLabel=(sc,nm)=>`<span class="chip" style="--c:${conOf(sc).color};border:0;padding:0;background:none"><i></i>${esc(nm||conOf(sc).name)}</span>`;
/* SEG-05 (decidido con el dueño, oct 2026): el subcontratista ve en Indicadores solo SU PPC (el de sus partidas, me.scs). Es un
   filtro de pantalla: daily y weeks siguen siendo documentos compartidos (ver docs/ia/seg05-paso2.md). Sin presentación ni
   exportes (Excel del PPC y PDF del día llevan a todas las partidas). */
const indScs=()=>me&&me.role==='sc'?new Set(scList()):null;
/** dayData recortado a las filas de sus partidas (totales, por piso y causas se recalculan con dayAgg) */
function indScD(D,M){if(!M)return D;const rows=D.rows.filter(r=>M.has(r.sc));
  return{...D,rows,...dayAgg(rows),adds:(D.adds||[]).filter(r=>M.has(r.sc)),extras:(D.extras||[]).filter(i=>i.e&&M.has(i.e.sc))}}
/** compromisos congelados de unas semanas, sumados solo para las partidas M (como wkScStats) → {n, ok, ev, nimp, ext, ppc, ppcSc} o null */
function wkScAgg(docs,M){const m=wkScStats(docs);const o={n:0,ok:0,ev:0,nimp:0,ext:0};
  for(const s of M){const x=m[s];if(!x)continue;o.n+=x.n;o.ok+=x.ok;o.ev+=x.ev;o.nimp+=x.nimp;o.ext+=x.ext}
  return o.n?{...o,ppc:o.ok/o.n,ppcSc:ppcScOf(o.ok,o.n,o.nimp,o.ext)}:null}
const DOWN=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function indDay(){let d=curDay();if(d>todayIso())d=todayIso();if(pd(d).getUTCDay()===0)d=addD(d,-1);return d}
/* modo de Indicadores: 'dia' · 'sem' · 'cli' (PPC contra lo emitido al cliente; solo administrador) */
const indM=()=>U.indMode==='sem'?'sem':U.indMode==='cli'&&canCli()?'cli':'dia';
function indBar(){const d=indDay();const today=todayIso();const md=indM(),dia=md==='dia';const M=indScs();
  return pageHead('Indicadores',`${dia?`${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}${d===today?' · hoy':''}`:`Semana ${U.week}`}${md==='cli'?' · lo informado al cliente':''} · ${pisoLabel()}${M?' · solo '+esc([...M].map(c=>conOf(c).name).join(', ')):''}`,
    md==='cli'||M?'':dia?`${isMob()?'':'<button class="ib" id="bipr" title="Pantalla completa para proyectar el cumplimiento del día">▶ Presentar</button>'}<button class="ib" id="bxppc">Excel del PPC</button><button class="ib pri" id="bpdf">Reporte PDF del día</button>`:`${isMob()?'':'<button class="ib" id="bipr" title="Pantalla completa para la reunión">▶ Presentar</button>'}<button class="ib pri" id="bxppc">Excel del PPC · semana ${U.week}</button>`)
   +`<div class="fbar"><span class="seg" id="imode"><button data-m="dia" class="${dia?'on':''}">Diario</button><button data-m="sem" class="${md==='sem'?'on':''}">Semanal</button>${canCli()?`<button data-m="cli" class="${md==='cli'?'on':''}" title="PPC contra lo emitido al cliente (solo administradores)">Cliente</button>`:''}</span>
   ${dia&&!M?`<span class="fsp"></span><span class="fgl">Reporte PDF:</span><label class="chk" title="Deja fuera del PDF los pisos donde nadie registró avance ese día"><input type="checkbox" id="pdfskip"${U.pdfSkip?' checked':''}> Omitir pisos sin verificar</label><label class="chk"><input type="checkbox" id="pdfph"${U.pdfPh?' checked':''}> Incluir fotos</label>`:''}</div>`}
/** No cumplidos de la semana elegida: causa, comentario y mitigación, editables aquí mismo (los mismos datos del Plan semanal) */
function ncCard(wSel,M){const cnc=P().cnc||[];const L=[];
  for(const w of wSel){const p=S.pis.get(w.pisoId);if(!p)continue;for(const[id,it]of Object.entries(w.items||{})){if(M&&!M.has(it.sc))continue;const r=(w.res||{})[id];if(r&&r.ok===false)L.push({w,p,id,it,r})}}
  if(!L.length)return'';L.sort((a,b)=>a.p.order-b.p.order||(a.it.ord||0)-(b.it.ord||0));const ed=canWrite;const sinC=L.filter(o=>!o.r.cnc).length,sinM=L.filter(o=>!o.r.mit).length;
  return`<div class="card" id="nccard"><h2>No cumplidos de la semana ${U.week} <span class="sub">${L.length} compromiso${L.length===1?'':'s'}${sinC?` · ${sinC} sin causa`:''}${sinM?` · ${sinM} sin mitigación`:''}${ed?' · edita la causa y la mitigación aquí':''}</span></h2>
   <div class="tscroll"><table class="t rt"><thead><tr><th>Ítem</th><th>Actividad</th><th>Subcontratista</th><th style="min-width:180px">Causa</th><th style="min-width:160px">Comentario</th><th style="min-width:200px">Mitigación / acción</th></tr></thead><tbody>
   ${L.map(({w,p,id,it,r})=>{const k=`${w.n}|${p.id}|${id}`;return`<tr data-nck="${esc(k)}"><td class="mono" data-l="Ítem">${U.piso?'':esc(p.code)+' · '}${esc(it.code||'')}</td><td class="lead wrapc">${esc(it.act||'')}<div class="note">${esc(it.amb||'')}</div></td><td data-l="Subcontratista">${scLabel(it.sc,it.scn)}</td>
     <td class="full" data-l="Causa">${ed&&isPisoResp(p.id)?`<select class="ci" data-ncf="cnc" data-fk="nc:cnc:${esc(k)}" aria-label="Causa"><option value="">Elegir causa…</option>${cncOpts(cnc,r.cnc)}</select>`:esc(r.cnc||'—')}</td>
     <td class="full" data-l="Comentario">${ed&&isPisoResp(p.id)?`<input class="ci" data-ncf="note" data-fk="nc:note:${esc(k)}" value="${esc(r.note||'')}" placeholder="Detalle" aria-label="Comentario">`:esc(r.note||'—')}</td>
     <td class="full" data-l="Mitigación">${ed&&isPisoResp(p.id)?`<input class="ci" data-ncf="mit" data-fk="nc:mit:${esc(k)}" value="${esc(r.mit||'')}" placeholder="Qué se hará para que no se repita" aria-label="Mitigación">`:esc(r.mit||'—')}</td></tr>`}).join('')}
   </tbody></table></div></div>`}
function ncChange(t){const f=t.dataset.ncf;const tr=t.closest('tr[data-nck]');if(!f||!tr||!canWrite)return false;const[n,pid,id]=tr.dataset.nck.split('|');if(!isPisoResp(pid))return true;const w=S.wk.get(wkId(+n,pid));if(!w)return true;
  /* C-07 (tanda 1, LPS-7): cambiar la causa recalcula la imputabilidad igual que en el Plan semanal (imp:null = la de la causa nueva;
     si respondió otra partida, se deja la decisión del ingeniero) */
  const cur=(w.res||{})[id]||{};const v=f==='cnc'?t.value:t.value.trim();t.dataset.o=t.value;setRes(+n,pid,id,{...cur,[f]:v,...(f==='cnc'&&!cur.rsc?{imp:null}:{})});return true}
function wireInd(main){main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onclick=e=>{const t=e.target;const m=t.closest('#imode button');if(m){U.indMode=m.dataset.m;IPRF={sc:'',pi:''};saveUI();render();return}
  const xm=t.closest('[data-xm]');if(xm){IXD_M=xm.dataset.xm==='sc'?'sc':'br';render();return} /* semáforo (ind-dia.js) */
  /* filtros cruzados (Diario y Semanal): tocar una barra de SC o de piso la elige o la quita; la pantalla conserva su posición */
  const xf=t.closest('[data-ixsc],[data-ixpi],[data-ixclr]');if(xf){const sc=xf.dataset.ixsc,pi=xf.dataset.ixpi;if(xf.dataset.ixclr)IPRF={sc:'',pi:''};else if(sc!=null)IPRF.sc=IPRF.sc===sc?'':sc;else IPRF.pi=IPRF.pi===pi?'':pi;
    const sb=main.querySelector('.scroll'),st=sb?sb.scrollTop:0;render();const nb=main.querySelector('.scroll');if(nb)nb.scrollTop=st;return}
  if(t.closest('#ixscx')){IPRF.sc='';render();return}
  const dn=t.closest('[data-idd]');if(dn){IPRF={sc:'',pi:''};const v=+dn.dataset.idd;const nd=v===0?null:shiftDay(indDay(),v);daySet(nd&&nd<todayIso()?nd:null);render();return}
  if(t.id==='bpdf'){reportPdf(indDay());return}
  if(t.id==='bipr'){iprStart();return}
  if(t.id==='bxppc'){exportPpcXlsx();return}
  if(t.closest('#bppch')){ppcHistEdit();return}
  if(t.id==='bxcli'){cliPpcXlsx();return}
  const g=t.closest('tr[data-goc]');if(g){const[aid,d]=g.dataset.goc.split('|');goCampo(aid,d)}};
  main.onchange=e=>{if(ncChange(e.target))return;if(e.target.id==='pdfph'){U.pdfPh=e.target.checked;saveUI()}if(e.target.id==='pdfskip'){U.pdfSkip=e.target.checked;saveUI()}}}
function renderIndDay(main){
  const d=indDay();ensureDaily(addD(d,-1));const vp=visPisos();const vset=histPisoSet();const D0=indScD(dayData([d],vset),indScs());/* el SC: solo sus partidas (#320) */
  /* Power BI (oct 2026): tocar un SC o un piso filtra toda la pantalla; cada gráfico ignora su propio filtro para seguir mostrando las demás barras */
  if(IPRF.sc&&!D0.scA[IPRF.sc])IPRF.sc='';if(IPRF.pi&&!D0.piA[IPRF.pi])IPRF.pi='';
  const D=iprdFilt(D0,IPRF.sc,IPRF.pi),Dsc=iprdFilt(D0,'',IPRF.pi),Dpi=iprdFilt(D0,IPRF.sc,'');const t=D.tot;
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
  h+=ixdFltHtml();
  if(!D0.tot.prog&&!D0.extras.length)h+=`<div class="empty">${nwReason(d)?esc(nwReason(d))+': día no laborable.':'No hay actividades programadas este día'+(U.piso?' en este piso':'')+'.'}</div>`;
  else{
    const scs=Object.entries(Dsc.scA).sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name));
    h+=ixdCard(Dsc,d)+`<details class="card ixd-det"><summary>Tabla detallada por subcontratista <span class="sub">${fmtD(d)}</span></summary><div class="pad">${cumplTable(scs,scLabel)}</div></details>`;
    {const pr=ixdPiRows(Dpi);if(!U.piso&&vp.length>1&&pr.length)h+=`<div class="card ixd"><h2>Cumplimiento por piso <span class="sub">${fmtD(d)} · toca un piso para filtrar</span></h2><div class="pad"><div class="ixd-pisos${pr.length>8?' two':''}">${pr.map(r=>ixdRow(r,true,IPRF.pi)).join('')}</div></div></div>`}
    if(D.extras.length)h+=npIndCard(D.extras,d);
    const cl=Object.entries(D.cnc).sort((a,b)=>b[1]-a[1]);
    if(cl.length)h+=`<div class="card chart"><h2>Causas del día <span class="sub">Parcial y No cumplido</span></h2><div class="pad">${svgBarsH(cl.map(([k,v])=>({label:k,v})),v=>v+'')}</div></div>`;
    const inc=D.rows.filter(r=>r.rc&&r.rc.status!=='ok'&&true).sort((a,b)=>a.p.order-b.p.order||a.s.order-b.s.order||a.a.order-b.a.order||a.x.order-b.x.order);
    if(inc.length||IPRF.sc||IPRF.pi)h+=`<div class="card" id="ixinc"><h2>Incumplimientos del día <span class="sub">${inc.length} · clic para ver o editar en Campo</span></h2>${inc.length?`<div class="tscroll"><table class="t ctab rt"><thead><tr><th>Ítem</th><th>Ambiente</th><th>Actividad</th><th>Subcontratista</th><th>Estado</th><th>Causa</th><th>Imputable al SC</th><th>Detenido</th><th>Comentario</th></tr></thead><tbody>
      ${inc.map(r=>`<tr data-goc="${r.x.id}|${d}"><td class="mono" data-l="Ítem">${U.piso?'':esc(r.p.code)+' · '}${esc(r.a.code)}</td><td class="wrapc" data-l="Ambiente">${esc(r.a.name)}</td><td class="wrapc lead">${esc(r.x.name)}</td><td data-l="Subcontratista">${scLabel(r.sc)}</td><td class="${ST[r.rc.status].c}" data-l="Estado">${ST[r.rc.status].i} ${ST[r.rc.status].t}</td><td class="wrapc" data-l="Causa">${r.rc.cnc?esc(r.rc.cnc):'<span style="color:var(--bad)">sin causa</span>'}</td><td data-l="Imputable al SC">${impOf(r.rc)?'Sí':'<span class="mu">No</span>'}</td><td data-l="Detenido">${detTag(d,r.x.id,r.rc)}</td><td class="wrapc mu full" data-l="Comentario">${esc(r.rc.note||'')}</td></tr>`).join('')}</tbody></table></div>`:`<div class="pad"><div class="empty">Lo que se muestra no tiene incumplimientos registrados este día.</div></div>`}</div>`}
  h+='</div></div>';main.innerHTML=h;wireInd(main)}
/** Indicadores › Cliente (solo administrador): el PPC contra la versión emitida al cliente, junto al interno */
function renderIndCli(main){const vset=histPisoSet();ensureCli();ensureDaily(cliPpcFrom());
  const{W}=CLX.size?cliPpc(vset):{W:[]};const M=ppcMan();
  /* una fila por semana: PPC cliente (el cargado a mano manda; si no, el calculado contra la versión emitida) y PPC interno de esa semana */
  const wk=new Set(W.map(o=>o.w));for(const k of Object.keys(M))if(M[k]&&(M[k].c!=null||M[k].a!=null))wk.add(+k);
  const pts=[...wk].filter(w=>w>0).sort((a,b)=>a-b).map(w=>{const o=W.find(x=>x.w===w),m=M[w]||{};const c=m.c!=null?m.c:(o?o.ppc:null);
    const pi=ppcWeekAgg(w,vset);const i=m.a!=null?m.a:(pi?pi.ppc:null);const man=m.c!=null;
    return{wk:w,label:'S'+w,a:c,b:i,part:!man&&!!(o&&o.cur),man,sub:man?'dato cargado a mano':o?`${o.ok} de ${o.n} compromisos`:''}}).filter(p=>p.a!=null||p.b!=null);
  const cerr=pts.filter(p=>!p.part&&p.a!=null);const last=cerr[cerr.length-1];
  const dlt=last&&last.b!=null?Math.round((last.a-last.b)*100):null;
  const avg=ppcAvg(pts).avg;
  const tiles=`<div class="tiles">
   <div class="tile hl"><span class="k">PPC del cliente · última</span><span class="v">${last?pct(last.a):'—'}${last?` <small>sem ${last.wk}</small>`:''}</span></div>
   <div class="tile"><span class="k">PPC interno · misma semana</span><span class="v">${last?pct(last.b):'—'}${last&&last.b!=null?` <small>sem ${last.wk}</small>`:''}</span></div>
   <div class="tile" title="PPC del cliente menos PPC interno"><span class="k">Diferencia</span><span class="v">${dlt==null?'—':(dlt>0?'+':'')+dlt+' pts'}</span></div>
   <div class="tile"><span class="k">Promedio del cliente</span><span class="v">${pct(avg)}${cerr.length?` <small>${cerr.length} sem</small>`:''}</span></div></div>`;
  const chart=`<div class="card chart"><h2>PPC histórico: cliente vs interno <span class="sub">anteriores al sistema: cargadas a mano · desde que se emite: contra la versión emitida</span>${isAdmin?' <button class="ib" id="bppch">✎ Cargar PPC histórico</button>':''}</h2><div class="pad tscroll">${pts.length?`<div class="lnleg"><span><i class="br"></i>PPC del cliente</span><span><i class="sc"></i>PPC interno</span><span><i class="avg"></i>Promedio del cliente</span></div>${svgLines(pts,{nA:'cliente',nB:'interno',eA:'cliente',eB:'interno'})}`:'<div class="empty">Aún no hay semanas. Carga el histórico con «Cargar PPC histórico» o emite la primera versión al cliente.</div>'}</div></div>`;
  main.innerHTML=`<div class="scroll"><div class="wrap">${indBar()}${tiles}${chart}${cliPpcCard(vset)}</div></div>`;wireInd(main)}
function renderInd(main){
  if(IPR){iprDraw();return} /* modo presentación abierto (semanal o del día): solo se redibuja la capa (ind-presentacion.js / ind-dia.js) */
  if(indM()==='cli'){renderIndCli(main);return}
  if(indM()==='dia'){renderIndDay(main);return}
  const vp=visPisos();const vset=histPisoSet();const M=indScs();
  const docs=[...S.wk.values()].filter(w=>w.frozenAt&&w.pisoId&&vset.has(w.pisoId));
  const wAgg=n=>{if(!M)return ppcWeekAgg(n,vset);const o=wkScAgg(docs.filter(w=>w.n===n),M);return o&&o.ev>0?o:null};
  const ppcs=[...new Set(docs.map(w=>w.n))].map(n=>{const o=wAgg(n);return o?{...o,wk:+n}:null}).filter(Boolean).sort((a,b)=>a.wk-b.wk);
  /* el promedio y la «última» solo con semanas evaluadas por completo; una a medias se muestra aparte como parcial */
  const full=ppcs.filter(x=>x.ev>=x.n);const part=ppcs.length&&ppcs[ppcs.length-1].ev<ppcs[ppcs.length-1].n?ppcs[ppcs.length-1]:null;
  const last=full[full.length-1];
  /* Power BI (oct 2026): tocar un SC o un piso filtra toda la pantalla; cada gráfico ignora su propio filtro para seguir mostrando las demás barras */
  /* el SC solo ve los compromisos de sus partidas (#320) */
  const wSel=wkFiltM(docs.filter(w=>w.n===U.week),M);
  if(IPRF.sc&&!wSel.some(w=>Object.values(w.items||{}).some(i=>i.sc===IPRF.sc)))IPRF.sc='';if(IPRF.pi&&!wSel.some(w=>w.pisoId===IPRF.pi))IPRF.pi='';
  const Wf=wkFilt(wSel,IPRF.sc,IPRF.pi),Wsc=wkFilt(wSel,'',IPRF.pi),Wpi=wkFilt(wSel,IPRF.sc,'');
  const scP=wkScStats(Wsc);for(const k of Object.keys(scP))if(!scP[k].n)delete scP[k];
  const T=wkTot(Wf);
  /* LPS-6 (tanda 1): con un SC elegido (o el rol SC), «PPC del SC» se mide como su barra y el Tablero (wkScStats: no imputables para él
     y las fallas de otras partidas que le cuentan) */
  const TS=IPRF.sc||M?wkScAgg(wkFilt(docs.filter(w=>w.n===U.week),'',IPRF.pi),IPRF.sc?new Set([IPRF.sc]):M):null;
  const tSc=TS?TS.ppcSc:T.n?ppcScOf(T.ok,T.n,T.nimp):null,tNimp=TS?TS.nimp:T.nimp;
  const cncC={};for(const w of Wf)for(const[id,it]of Object.entries(w.items||{})){const r=(w.res||{})[id];if(!r||r.ok!==false)continue;const k=cncKey(r.cnc);const c=cncC[k]=cncC[k]||{n:0,nimp:0};c.n++;if(resNimp(r))c.nimp++}
  const cncL=Object.entries(cncC).sort((a,b)=>b[1].n-a[1].n);
  const pend=restrInScope().filter(rOpenC).length;
  /* el SC: sin los datos cargados a mano (son de toda la obra) */
  const histP=M?ppcs.map(x=>({wk:x.wk,...ppcHistPts([x])[0]})):ppcHistAll(ppcs);const{avg:avgH,L:histF}=ppcAvg(histP); /* C-01: la misma fórmula en todas las pantallas */
  const fl=IPRF.sc||IPRF.pi?' · filtrada':'';
  let h=`<div class="scroll"><div class="wrap">${indBar()}
   <div class="tiles">
   <div class="tile hl"><span class="k">PPC semanal (oficial) · última</span><span class="v">${last?pct(last.ppc):'—'}${last?` <small>sem ${last.wk}</small>`:''}</span>${part?`<span class="mu" style="font-size:12px">Sem ${part.wk} en evaluación: ${part.ev} de ${part.n} evaluados</span>`:''}</div>
   <div class="tile"><span class="k">PPC promedio</span><span class="v">${pct(avgH)}${histF.length?` <small>${histF.length} sem</small>`:''}</span></div>
   <div class="tile"><span class="k">Semana ${U.week} · PPC${fl}</span><span class="v">${T.n?pct(T.ok/T.n):'—'}${T.n?` <small>${T.ok} de ${T.n}</small>`:''}</span></div>
   <div class="tile" title="Sin contar los no cumplidos que no dependían del subcontratista"><span class="k">Semana ${U.week} · PPC del SC${fl}</span><span class="v">${tSc!=null?pct(tSc):'—'}${tNimp?` <small>${tNimp} no imput.</small>`:''}</span></div>
   <div class="tile"><span class="k">No cumplidos / sin evaluar${fl}</span><span class="v">${T.ev-T.ok} / ${T.n-T.ev}</span></div>
   <div class="tile"><span class="k">Restricciones pendientes</span><span class="v">${pend}</span></div></div>`;
  /* C-03: pisos descongelados de la semana elegida (no cuentan en el PPC hasta que se congelen; el servidor los re-congela a las 2 h) */
  {const U_=[...S.wk.values()].filter(w=>w.n===U.week&&w.unfrozenAt&&!w.frozenAt&&!w.histOf&&vset.has(w.pisoId));
   if(U_.length)h+=`<div class="callout">Semana ${U.week}: ${U_.length} piso${U_.length>1?'s':''} descongelado${U_.length>1?'s':''} (${esc(U_.map(w=>(S.pis.get(w.pisoId)||ARCH.pis.get(w.pisoId)||{}).code||'').join(', '))}): no cuenta${U_.length>1?'n':''} en el PPC hasta que se vuelva${U_.length>1?'n':''} a congelar. Si nadie lo hace, se congela${U_.length>1?'n':''} solo${U_.length>1?'s':''} tal como estaba${U_.length>1?'n':''} a las 2 horas.</div>`}
  if(!ppcs.length)h+=`<div class="callout">El PPC aparece cuando congelas los compromisos de un piso en <b>Plan semanal</b> y evalúas cada uno con Sí / No.</div>`;
  /* Indicadores › Semanal: solo el plan semanal congelado y su evaluación Sí/No (pedido del dueño, oct 2026). Lo reportado en
     Campo vive solo en Indicadores › Diario. Mismo funcionamiento que Diario: semáforo por SC, comparativo por piso, causas y no
     cumplidos, todo filtrable al tocar una barra. */
  h+=ixdFltHtml();
  const rowsSc=Object.entries(scP).map(([sc,o])=>wkRow({sc,nm:o.nm},o)),rowsPi=wkPisoRows(Wpi);
  if(!wSel.length)h+=`<div class="card"><div class="pad"><div class="empty">La semana ${U.week} no está congelada${U.piso?' en este piso':''}.</div></div></div>`;
  else{
   h+=`<div class="card ixd"><h2>Cumplimiento del plan semanal por subcontratista <span class="sub">semana ${U.week} · toca un subcontratista para filtrar toda la pantalla</span></h2><div class="pad">${ixdSummary(rowsSc)}<div class="ixd-tools">${ixdToggle(false)}${ixdLegend()}</div>${ixdGroupsHtml(rowsSc,true,IPRF.sc)}</div></div>`;
   if(!U.piso&&new Set(wSel.map(w=>w.pisoId)).size>1&&rowsPi.length)h+=`<div class="card ixd"><h2>Cumplimiento por piso <span class="sub">semana ${U.week} · toca un piso para filtrar</span></h2><div class="pad"><div class="ixd-pisos${rowsPi.length>8?' two':''}">${rowsPi.map(r=>ixdRow(r,true,IPRF.pi)).join('')}</div></div></div>`;
   h+=`<div class="card chart"><h2>Causas de no cumplimiento <span class="sub">semana ${U.week} · ${T.ev-T.ok} no cumplido${T.ev-T.ok===1?'':'s'}${fl}</span></h2><div class="pad">${cncL.length?svgBarsH(cncL.map(([k,o])=>({label:k,v:o.n,sub:o.nimp?`${o.nimp} no imputable${o.nimp===1?'':'s'} al SC`:''})),v=>v+''):'<div class="empty">Sin no cumplidos en lo que se muestra.</div>'}</div></div>`;
   h+=ncCard(Wf,M);
  }
  h+=`<div class="card chart"><h2>PPC semanal histórico <span class="sub">anteriores al sistema: cargadas a mano · desde que se congela: el plan semanal</span>${isAdmin?' <button class="ib" id="bppch">✎ Cargar PPC histórico</button>':''}</h2><div class="pad tscroll">${histP.length?linesLegend()+svgLines(histP)+(histP.some(p=>p.man)?'<p class="note">Las semanas cargadas a mano no tienen PPC del SC.</p>':''):'<div class="empty">Sin semanas evaluadas.</div>'}</div></div>`;
  {const nmS=sc=>(scP[sc]&&scP[sc].nm)||conOf(sc).name;const e=Object.entries(scP).sort((a,b)=>nmS(a[0]).localeCompare(nmS(b[0])));
   if(e.length)h+=`<details class="card ixd-det"><summary>Tabla detallada por subcontratista <span class="sub">semana ${U.week}</span></summary><div class="pad">${wkScTable(e,sc=>scLabel(sc,nmS(sc)))}</div></details>`}
  h+=reproCard(U.week,vset,M)+restrCauseCard(U.week,vset,M);
  const days=winDays();const load={};
  for(const x of S.act.values()){if(!vset.has(pisoOfAmb(x.ambId)))continue;for(const d of x.days||[])(load[x.sc]=load[x.sc]||{})[d]=(load[x.sc][d]||0)+1}
  const scs=Object.keys(load).filter(sc=>(!M||M.has(sc))&&days.some(x=>load[sc][x.d])).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
  const mx=Math.max(1,...scs.flatMap(sc=>days.map(x=>load[sc][x.d]||0)));
  const tot=days.map(x=>scs.reduce((s,sc)=>s+(load[sc][x.d]||0),0));
  h+=`<details class="card ixd-det"><summary>Carga diaria por subcontratista <span class="sub">frentes (actividades) programados · semanas ${U.week}–${U.week+U.win-1} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span></summary><div class="pad tscroll"><table class="heat"><thead><tr><th></th>${days.map(x=>`<th${x.d===todayIso()?' style="color:var(--ink)"':''}>${DL[x.i]}<br>${x.d.slice(8)}</th>`).join('')}</tr></thead><tbody>
   ${scs.map(sc=>`<tr><td class="n"><span class="chip" style="--c:${conOf(sc).color};border:0;padding:0;background:none"><i></i>${esc(conOf(sc).name)}</span></td>${days.map(x=>{const v=load[sc][x.d]||0;return`<td class="h${v?'':' z'}" style="${v?`background:color-mix(in srgb, var(--accent) ${Math.round(14+76*v/mx)}%, var(--panel));color:${v/mx>.55?'var(--accent-ink)':'var(--ink)'}`:''}" title="${esc(conOf(sc).name)} · ${fmtD(x.d)}: ${v} actividad(es)">${v||''}</td>`}).join('')}</tr>`).join('')||`<tr><td class="empty" colspan="${days.length+1}">Sin actividades programadas en la ventana.</td></tr>`}
   ${scs.length?`<tr><td class="n">Total</td>${tot.map(v=>`<td class="h" style="font-weight:600">${v||''}</td>`).join('')}</tr>`:''}
  </tbody></table><p class="note" style="margin:8px 0 0">Cambia la cantidad de semanas con los botones 3 / 6 / 12 sem del Lookahead.</p></div></details></div></div>`;
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
