"use strict";
/* LPS 911 · Indicadores › Semanal en modo presentación (pedido del dueño, oct 2026): pantalla completa para proyectar en la
   reunión semanal, solo con el plan semanal congelado (evaluación Sí / No). Tres láminas: Resumen · Subcontratistas ·
   Causas. Barra propia con semana, piso (el mismo selector principal U.piso), tamaño de letra y salir (Esc).
   Es una capa encima de la app (#ipr): mientras está abierta, renderInd solo la redibuja (llegan datos en vivo).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

let IPR=null; // {pg: lámina 0..2, z: tamaño}
const IPR_PG=['Resumen','Pisos','Subcontratistas','Causas'];
function iprStart(){if(IPR)return;IPR={pg:0,z:1};closePop();
  const o=document.createElement('div');o.id='ipr';o.className='ipr';o.setAttribute('role','dialog');o.setAttribute('aria-label','Indicadores semanales · presentación');document.body.appendChild(o);
  o.onclick=iprClick;o.onchange=iprChange;document.body.classList.add('ipr-on');
  try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
  iprDraw()}
function iprStop(){if(!IPR)return;IPR=null;$('#ipr')?.remove();document.body.classList.remove('ipr-on');
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  requestRender()}
function iprClick(e){const t=e.target.closest('[data-ip]');if(!t)return;const k=t.dataset.ip;
  if(k==='x'){iprStop();return}
  if(k==='wp')U.week--;else if(k==='wn')U.week++;else if(k==='wt')U.week=curWeek();
  else if(k==='z-'||k==='z+')IPR.z=Math.max(.8,Math.min(1.6,+(IPR.z+(k==='z+'?.1:-.1)).toFixed(2)));
  else if(t.dataset.pg!=null)IPR.pg=+t.dataset.pg;
  iprDraw()}
function iprChange(e){const t=e.target;if(t.id==='iprpiso'){U.piso=t.value;U.pisoAll=!t.value;U.sector='';saveUI();requestRender()}}
document.addEventListener('keydown',e=>{if(!IPR||(e.target&&/^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)))return;
  if(e.key==='Escape'){iprStop();return}
  if(e.key==='ArrowRight'||e.key==='PageDown'){IPR.pg=Math.min(IPR_PG.length-1,IPR.pg+1);iprDraw();e.preventDefault()}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){IPR.pg=Math.max(0,IPR.pg-1);iprDraw();e.preventDefault()}});
document.addEventListener('fullscreenchange',()=>{if(IPR&&!document.fullscreenElement)iprStop()});

/** datos del plan semanal congelado de la semana n en los pisos elegidos */
function iprData(n){const vset=histPisoSet();
  const docs=[...S.wk.values()].filter(w=>w.frozenAt&&w.pisoId&&vset.has(w.pisoId));
  const wSel=docs.filter(w=>w.n===n);
  const ppcs=[...new Set(docs.map(w=>w.n))].map(k=>{const o=ppcWeekAgg(k,vset);return o?{...o,wk:+k}:null}).filter(Boolean).sort((a,b)=>a.wk-b.wk);
  const full=ppcs.filter(x=>x.ev>=x.n);const avg=full.length?full.reduce((s,x)=>s+x.ppc,0)/full.length:null;
  const cur=ppcWeekAgg(n,vset);const prev=ppcWeekAgg(n-1,vset);
  let tot={n:0,ok:0,no:0,ev:0};for(const w of wSel){const st=ppcOf(w);if(!st)continue;tot.n+=st.n;tot.ok+=st.ok;tot.ev+=st.ev}tot.no=tot.ev-tot.ok;
  const scP=wkScStats(wSel);for(const k of Object.keys(scP))if(!scP[k].n)delete scP[k];
  const pisoP=wSel.map(w=>({st:ppcOf(w),p:S.pis.get(w.pisoId)||ARCH.pis.get(w.pisoId)})).filter(x=>x.st&&x.p).sort((a,b)=>a.p.order-b.p.order);
  const nc=[];const cnc={};
  for(const w of wSel)for(const[id,it]of Object.entries(w.items||{})){const r=(w.res||{})[id];if(!r||r.ok!==false)continue;
    const k=cncKey(r.cnc);const c=cnc[k]=cnc[k]||{n:0,nimp:0};c.n++;if(resNimp(r))c.nimp++;
    nc.push({it,r,k,p:S.pis.get(w.pisoId)||ARCH.pis.get(w.pisoId)})}
  return{ppcs,full,avg,cur,prev,tot,scP,pisoP,nc,cnc}}

const iprTone=v=>v==null?'':v>=.8?'ok':v>=.6?'warn':'bad';
/** anillo grande del PPC */
function iprRing(v,sub){const R=54,C=2*Math.PI*R;const f=v==null?0:Math.max(0,Math.min(1,v));
  return`<div class="iprring ${iprTone(v)}"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${R}" class="trk"/><circle cx="64" cy="64" r="${R}" class="val" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 64 64)"/></svg><div class="iprrv"><b>${pct(v)}</b><span>${sub}</span></div></div>`}
/** barras horizontales en HTML (crecen con la pantalla, a diferencia del SVG) */
function iprBars(rows){if(!rows.length)return'';const mx=Math.max(1,...rows.map(r=>r.max??r.v));
  return`<div class="iprbars">${rows.map(r=>`<div class="iprb"><span class="nm">${r.color?`<i style="background:${esc(r.color)}"></i>`:''}${esc(r.label)}</span><span class="tr"><span class="fl ${r.tone||''}" style="width:${Math.max(r.v>0?1.5:0,100*r.v/mx).toFixed(1)}%"></span></span><span class="vl"><b>${r.fmt?r.fmt(r.v):r.v}</b>${r.sub?`<small>${r.sub}</small>`:''}</span></div>`).join('')}</div>`}

function iprDraw(){const o=$('#ipr');if(!IPR||!o)return;if(U.tab!=='ind'){iprStop();return}
  const n=U.week,D=iprData(n);const wd=weekDays(n);
  const ps=pisos();
  const bar=`<header class="iprbar">
    <div class="iprt"><b>Indicadores semanales</b><small>Semana ${n} · ${fmtD(wd[0])} – ${fmtD(wd[5])} · ${pisoLabel()}</small></div>
    <span class="iprg"><button class="ib" data-ip="wp" aria-label="Semana anterior">‹</button><button class="ib" data-ip="wt">Actual</button><button class="ib" data-ip="wn" aria-label="Semana siguiente">›</button></span>
    <select class="tin" id="iprpiso" aria-label="Piso"><option value="">Todos los pisos</option>${ps.map(p=>`<option value="${esc(p.id)}"${U.piso===p.id?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>
    <span class="seg iprpg">${IPR_PG.map((t,i)=>`<button data-ip="pg" data-pg="${i}" class="${IPR.pg===i?'on':''}">${t}</button>`).join('')}</span>
    <span class="fsp"></span>
    <span class="iprg"><button class="ib" data-ip="z-" aria-label="Letra más pequeña">A−</button><button class="ib" data-ip="z+" aria-label="Letra más grande">A+</button></span>
    <button class="ib" data-ip="x">Salir <kbd>Esc</kbd></button></header>`;
  let body;
  if(!D.tot.n&&IPR.pg!==1)body=`<div class="iprempty">La semana ${n} no está congelada${U.piso?' en este piso':''}.<small>El indicador sale de los compromisos congelados en <b>Plan semanal</b> evaluados con Sí / No.</small></div>`;
  else if(IPR.pg===0)body=iprResumen(n,D);else if(IPR.pg===1)body=iprPisos(n);else if(IPR.pg===2)body=iprSc(n,D);else body=iprCausas(n,D);
  const st=o.querySelector('.iprc');const sc=st?st.scrollTop:0;
  o.innerHTML=bar+`<div class="iprc" style="--ipz:${IPR.z}">${body}</div><footer class="iprft">${IPR_PG.map((t,i)=>`<i class="${IPR.pg===i?'on':''}"></i>`).join('')}<span>← → para cambiar de lámina</span></footer>`;
  const st2=o.querySelector('.iprc');if(st2&&st)st2.scrollTop=sc}

function iprResumen(n,D){const c=D.cur,t=D.tot;const dlt=c&&D.prev?Math.round((c.ppc-D.prev.ppc)*100):null;
  const sinEv=t.n-t.ev;
  const kpi=(k,v,s,tone)=>`<div class="iprk ${tone||''}"><span>${k}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const hist=D.ppcs.filter(x=>x.wk<=n).slice(-12);
  let h=`<div class="iprhero">
    ${iprRing(c?c.ppc:null,`PPC semana ${n}`)}
    <div class="iprks">
      ${kpi('Compromisos',t.n,'congelados')}
      ${kpi('Cumplidos (Sí)',t.ok,'',t.ok?'ok':'')}
      ${kpi('No cumplidos',t.no,'',t.no?'bad':'')}
      ${kpi('Sin evaluar',sinEv,sinEv?'aún no se marca Sí / No':'',sinEv?'warn':'')}
      ${kpi('PPC del SC',pct(c&&c.ppcSc),'sin lo no imputable')}
      ${kpi('vs semana anterior',dlt==null?'—':(dlt>0?'▲ +':dlt<0?'▼ ':'')+dlt+' pts',D.prev?`sem ${n-1}: ${pct(D.prev.ppc)}`:'',dlt==null?'':dlt>=0?'ok':'bad')}
      ${kpi('Promedio',pct(D.avg),D.full.length?`${D.full.length} semanas completas`:'')}
    </div></div>`;
  h+=`<div class="iprgrid${!U.piso&&D.pisoP.length>1?'':' one'}">
    <section class="iprcard"><h3>PPC semanal histórico <small>últimas ${hist.length} semanas</small></h3>${hist.length?linesLegend()+`<div class="iprsvg chart">${svgLines(ppcHistPts(hist),{h:300,minW:820})}</div>`:'<div class="empty">Sin semanas evaluadas.</div>'}</section>
    ${!U.piso&&D.pisoP.length>1?`<section class="iprcard"><h3>PPC por piso <small>semana ${n}</small></h3>${iprBars(D.pisoP.map(x=>({label:x.p.code+' · '+x.p.name,v:x.st.ppc,max:1,fmt:pct,tone:iprTone(x.st.ppc),sub:x.st.ok+' de '+x.st.n})))}</section>`:''}
  </div>`;
  return h}

function iprSc(n,D){const e=Object.entries(D.scP).sort((a,b)=>(b[1].ppc??0)-(a[1].ppc??0)||b[1].n-a[1].n);
  const rows=e.map(([sc,o])=>({label:conOf(sc).name,color:conOf(sc).color,v:o.ppc??0,max:1,fmt:pct,tone:iprTone(o.ppc),
    sub:`${o.ok} de ${o.n}${o.no?` · ${o.no} No`:''}${o.n-o.ev?` · ${o.n-o.ev} sin evaluar`:''}${o.nimp||o.ext?` · del SC ${pct(o.ppcSc)}`:''}`}));
  const half=rows.length>12?Math.ceil(rows.length/2):rows.length;
  return`<section class="iprcard"><h3>PPC por subcontratista <small>semana ${n} · ${rows.length} subcontratistas · de mayor a menor</small></h3>
    <div class="iprcols${rows.length>12?' two':''}">${iprBars(rows.slice(0,half))}${rows.length>half?iprBars(rows.slice(half)):''}</div>
    <p class="iprnote">PPC = compromisos cumplidos (Sí) / compromisos congelados. «Del SC» no cuenta los no cumplidos que no dependían del subcontratista.</p></section>`}

function iprCausas(n,D){const cl=Object.entries(D.cnc).sort((a,b)=>b[1].n-a[1].n);
  if(!cl.length)return`<div class="iprempty">Sin no cumplidos en la semana ${n}.<small>${D.tot.ev<D.tot.n?`Quedan ${D.tot.n-D.tot.ev} compromisos sin evaluar.`:'Todos los compromisos evaluados se cumplieron.'}</small></div>`;
  const by={};D.nc.forEach(x=>(by[x.it.sc]=by[x.it.sc]||[]).push(x));
  const scs=Object.keys(by).sort((a,b)=>by[b].length-by[a].length||conOf(a).name.localeCompare(conOf(b).name));
  return`<div class="iprgrid">
    <section class="iprcard"><h3>Causas de no cumplimiento <small>semana ${n} · ${D.nc.length} no cumplidos</small></h3>${iprBars(cl.map(([k,o])=>({label:k,v:o.n,tone:'bad',sub:o.nimp?`${o.nimp} no imputable${o.nimp===1?'':'s'} al SC`:''})))}</section>
    <section class="iprcard"><h3>No cumplidos por subcontratista <small>actividad · ambiente · causa</small></h3><div class="iprnc">${scs.map(sc=>`<div class="iprncg"><h4><i style="background:${esc(conOf(sc).color)}"></i>${esc(conOf(sc).name)} <small>${by[sc].length}</small></h4><ul>${by[sc].map(x=>`<li><b>${esc(x.it.act||'')}</b><span>${esc(x.it.amb||x.it.code||'')}${!U.piso&&x.p?' · '+esc(x.p.code):''}</span><em>${esc(x.k)}${x.r.note?' — '+esc(x.r.note):''}</em></li>`).join('')}</ul></div>`).join('')}</div></section>
  </div>`}

/* ===== lámina «Pisos»: compara el PPC de todos los pisos (no usa el filtro de piso) ===== */
const IPR_PC=['#2f6f9f','#c46a2c','#3f8f4f','#8a5aa8','#b39a1e','#2f9a9a','#b0475c','#6b7a8a','#7a5a2a','#4a5ab0'];
/** PPC por piso y semana (semanas congeladas ≤ n, las últimas 12 con algún piso) */
function iprPisoData(n){const all=new Map([...ARCH.pis,...S.pis]);const by={};const wks=new Set();
  for(const w of S.wk.values()){if(!w.frozenAt||!w.pisoId||w.n>n||!all.has(w.pisoId))continue;const st=ppcOf(w);if(!st||!st.ev)continue;(by[w.pisoId]=by[w.pisoId]||{})[w.n]=st;wks.add(w.n)}
  const W=[...wks].sort((a,b)=>a-b).slice(-12);
  const P=Object.keys(by).map(id=>all.get(id)).filter(Boolean).sort((a,b)=>(a.order||0)-(b.order||0)).filter(p=>W.some(k=>by[p.id][k]));
  return{W,P,by}}
/** varias líneas (una por piso) en escala 0–100 %, con el rótulo al final de cada una */
function iprSvgMulti(W,series){const n=W.length;const L=44,R=150,T=16,B=32,h=320,Wd=Math.max(820,n*70+L+R),ih=h-T-B,iw=Wd-L-R;
  const X=i=>L+(n>1?i*iw/(n-1):iw/2),Y=v=>T+ih*(1-v);
  let s=`<svg viewBox="0 0 ${Wd} ${h}" role="img" aria-label="PPC semanal por piso">`;
  [0,.25,.5,.75,1].forEach(g=>{const y=Y(g);s+=`<line class="gl" x1="${L}" x2="${Wd-R+8}" y1="${y}" y2="${y}"/><text x="${L-6}" y="${y+4}" text-anchor="end">${g*100}%</text>`});
  W.forEach((k,i)=>{s+=`<text x="${X(i)}" y="${h-10}" text-anchor="middle">S${k}</text>`});
  const ends=[];
  series.forEach(se=>{let d='',on=false;se.v.forEach((v,i)=>{if(v==null){on=false;return}d+=(on?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1);on=true});
    s+=`<path d="${d}" fill="none" stroke="${se.c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    se.v.forEach((v,i)=>{if(v!=null)s+=`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5" fill="${se.c}" stroke="var(--panel)" stroke-width="2"><title>${esc(se.l)} · S${W[i]}: ${pct(v)}</title></circle>`});
    let li=-1;se.v.forEach((v,i)=>{if(v!=null)li=i});if(li>=0)ends.push({y:Y(se.v[li])+4,x:X(li)+10,t:se.l+' '+pct(se.v[li]),c:se.c})});
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<15)ends[i].y=ends[i-1].y+15; /* que no se encimen */
  ends.forEach(e=>{s+=`<text x="${e.x}" y="${e.y}" style="fill:${e.c};font-weight:700;font-size:14px">${esc(e.t)}</text>`});
  return s+'</svg>'}
function iprPisos(n){const{W,P,by}=iprPisoData(n);
  if(!P.length)return`<div class="iprempty">Ningún piso tiene semanas congeladas y evaluadas hasta la semana ${n}.</div>`;
  const col=i=>IPR_PC[i%IPR_PC.length];
  const cur=P.map((p,i)=>({p,c:col(i),st:by[p.id][n],pr:by[p.id][n-1]}));
  const avgOf=p=>{const v=W.map(k=>by[p.id][k]).filter(st=>st&&st.ev>=st.n);return v.length?v.reduce((t,st)=>t+st.ppc,0)/v.length:null};
  const nowRows=cur.filter(x=>x.st);
  let h=`<div class="iprgrid">
   <section class="iprcard"><h3>PPC por piso <small>semana ${n} · todos los pisos</small></h3>${nowRows.length?iprBars(nowRows.map(x=>({label:x.p.code+' · '+x.p.name,color:x.c,v:x.st.ppc,max:1,fmt:pct,tone:iprTone(x.st.ppc),sub:`${x.st.ok} de ${x.st.n}${x.st.ev<x.st.n?` · ${x.st.n-x.st.ev} sin evaluar`:''}`}))):`<div class="empty">Ningún piso congeló la semana ${n}.</div>`}</section>
   <section class="iprcard"><h3>Comparación <small>semana ${n} frente a la anterior</small></h3><div class="tscroll"><table class="t ctab iprtab"><thead><tr><th>Piso</th><th class="r">Sem ${n-1}</th><th class="r">Sem ${n}</th><th class="r">Cambio</th><th class="r">Promedio</th></tr></thead><tbody>
    ${cur.map(x=>{const a=x.pr?x.pr.ppc:null,b=x.st?x.st.ppc:null;const d=a!=null&&b!=null?Math.round((b-a)*100):null;const av=avgOf(x.p);
      return`<tr><td><i class="iprdot" style="background:${x.c}"></i><b>${esc(x.p.code)}</b> · ${esc(x.p.name)}</td><td class="r">${pct(a)}</td><td class="r"><b class="${iprTone(b)}">${pct(b)}</b></td><td class="r ${d==null?'':d>=0?'ok':'no'}">${d==null?'—':(d>0?'▲ +':d<0?'▼ ':'')+d+' pts'}</td><td class="r">${pct(av)}</td></tr>`}).join('')}
   </tbody></table></div><p class="iprnote">Promedio: semanas completas evaluadas de las mostradas.</p></section>
  </div>
  <section class="iprcard" style="margin-top:clamp(12px,1.5vw,24px)"><h3>Evolución del PPC por piso <small>últimas ${W.length} semanas · una línea por piso</small></h3><div class="iprsvg chart">${iprSvgMulti(W,cur.map(x=>({l:x.p.code,c:x.c,v:W.map(k=>by[x.p.id][k]?by[x.p.id][k].ppc:null)})))}</div></section>`;
  return h}
