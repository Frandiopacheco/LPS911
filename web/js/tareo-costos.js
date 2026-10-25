"use strict";
/* LPS 911 · Tareo: pestaña «Costos» en vivo (docs/ia/tareo.md, «RR.HH. y Costos en vivo»). Vistas: por partida (grupo, categoría,
   HE, HH por día, meta y consumo acumulado), por UA Powers (lo que se carga a Powers, con «Copiar»), por cuadrilla, avance contra la
   meta (todas las partidas, acumulado desde el inicio con hhpc/{fecha}), detalle (una fila por obrero, día y partida) y
   «Publicaciones» (la lista de días publicados, versiones y descargas de antes: tpkPublicaciones de tareo-pub.js).
   Globales: TCO/tco*. Datos: tsCalc (tareo-sem.js) sobre las publicaciones vigentes del periodo. */

const TCO={tipo:'sem',ref:'',b2:'',vista:'pc',q:'',solo:true,sel:'',hhpc:new Map(),hok:false,dOpen:new Set()};
const tcoAct=()=>U.mod==='tar'&&U.tab==='tcos'&&tpCosOk();
/* HH acumuladas por partida desde el inicio (hhpc/{fecha}: resumen de la publicación vigente de cada día, sin datos de personas) */
function tcoHhpc(){tpSub('chh','all',fcol('hhpc'),(sn,err)=>{if(err){TCO.hok=true;return}const M=new Map();sn.docs.forEach(x=>M.set(x.id,x.data()||{}));TCO.hhpc=M;TCO.hok=true},tcoAct)}
function tcoAcum(b){const A=new Map();for(const[f,d]of TCO.hhpc){if(f>b)continue;for(const[k,o]of Object.entries(d.pcs||{}))A.set(k,tR2((A.get(k)||0)+tpNum(o&&o.hh)))}return A}
/* ficha de una partida: la del catálogo vigente (S.tpc) o la congelada en una publicación; la UA, la congelada en la publicación
   (como Detalle y el Excel formato anterior), y si no la trae, la del catálogo */
function tcoPc(id,R){const t=S.tpc&&S.tpc.get(id);const m=R.pcsMeta[id]||{};const o=t||m;
  return{id,cod:o.cod||m.cod||id,nom:o.nom||m.nom||'',grp:o.grp||m.grp||String(o.cod||'').split('.')[0],grpN:o.grpN||m.grpN||'',und:o.und||m.und||'',ua:m.ua||o.ua||'',met:tpNum(t&&t.met),hhp:tpNum(t&&t.hhp)}}
const tcoS=v=>'S/ '+Math.round(v).toLocaleString('es-PE');

function renderTCos(main){if(TPLA.on)return renderTPla(main);
  if(!tpCosOk()){main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Costos','')}<div class="callout">Sin acceso.</div></div></div>`;return}
  if(TPK.det&&TCO.vista!=='pub')TCO.vista='pub';
  const vistas=[['pc','Por partida'],['ua','Por UA Powers'],['cua','Por cuadrilla'],['meta','Avance vs meta'],['dct','Descuentos a SC'],['det','Detalle'],['pub','Publicaciones y versiones']];
  const seg=`<span class="seg" id="tcoV">${vistas.map(([v,l])=>`<button data-tcov="${v}" class="${TCO.vista===v?'on':''}">${l}</button>`).join('')}</span>`;
  if(TCO.vista==='pub'){main.innerHTML=`<div class="scroll"><div class="wrap ts"><div class="ts-vbar">${seg}</div><div id="tcoPub"></div></div></div>`;bindV();tpkPublicaciones($('#tcoPub'));return}
  if(!TCO.ref)TCO.ref=todayIso();const[a,b]=tsAB(TCO);tseSub('co',a,b,tcoAct);tcoHhpc();const PB=tsePB('co');const R=tsCalc(a,b,PB);const o=TSE.co;const P=R.P;
  const soles=tplSoles();const A=tcoAcum(b);
  const L=[...R.PC.values()].map(x=>({...x,...tcoPc(x.id,R)}));const T=R.T;const hhPc=tR2(L.reduce((s,x)=>s+x.tot,0));
  const sinUA=L.filter(x=>!tpxUaP(x.ua));const hhUA=tR2(hhPc-sinUA.reduce((s,x)=>s+x.tot,0));const he=tR2(L.reduce((s,x)=>s+x.he,0));
  const sobre=L.filter(x=>x.hhp>0&&(A.get(x.id)||0)>x.hhp);const lab=R.days.filter(f=>!tNoLab(f)&&f<=todayIso());const pubLab=lab.filter(f=>R.pub.includes(f));
  const checks=[[Math.abs(hhPc-T.hh)<0.01,'HH por partida = HH de RR.HH.','lo asignado es lo que se paga',`${toH(hhPc)} / ${toH(T.hh)}`],
    ...(P.avisoUA?[[!sinUA.length,'HH por UA Powers = HH por partida',sinUA.length?`faltan ${toH(hhPc-hhUA)} HH sin UA`:'nada se pierde al cargar a Powers',toH(hhUA)],
    [!sinUA.length,sinUA.length?`${sinUA.length} ${sinUA.length===1?'partida':'partidas'} con horas sin UA`:'Todas las partidas con horas tienen UA',sinUA.map(x=>`${x.cod} ${x.nom}`).join(' · ')||'—','']]:[]),/* Parámetros › «Avisar si una partida con horas no tiene UA» */
    [pubLab.length===lab.length,'Días laborables publicados',lab.length>pubLab.length?`faltan: ${lab.filter(f=>!R.pub.includes(f)).map(tsDiaL).join(', ')}`:'todos',`${pubLab.length}/${lab.length}`]];
  const nOk=checks.filter(c=>c[0]).length;
  const k=(l,v,s,c)=>`<div class="lqtile"${c?` style="--c:${c}"`:''}><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const body=TCO.vista==='ua'?tcoUA(R,L):TCO.vista==='cua'?tcoCua(R):TCO.vista==='meta'?tcoMeta(R,A):TCO.vista==='dct'?tcoDct(R,soles):TCO.vista==='det'?tcoDet(R,PB):tcoPartidas(R,L,A,soles);
  main.innerHTML=`<div class="scroll"><div class="wrap ts">${pageHead('Costos',esc(tsPerTxt(TCO.tipo,a,b))+' · HH de mano de obra de casa · en vivo',`<button class="ib" id="tcoXo"${TPK.busy?' disabled':''} title="El Excel de antes (una hoja por día, Resumen HH y Tareo Semana), mientras dura la transición">Excel formato anterior</button><button class="ib pri" id="tcoX"${TPK.busy?' disabled':''}>Exportar Excel</button>`)}
    ${tsPerBar(TCO,'tco')}
    <div class="ts-chips"><span class="note">Días:</span>${tsDiasChips(R,o&&o.idx)}${tseCargando('co')?'<span class="note">Cargando publicaciones…</span>':''}</div>
    ${o&&o.err?`<div class="callout t-warn">No se pudieron leer las publicaciones (${esc(o.err)}).</div>`:''}
    <div class="lqtiles ts-tiles" id="tcoTot">${k('HH del periodo',toH(hhPc),`${R.pub.length} ${R.pub.length===1?'día publicado':'días publicados'}`,'var(--accent)')}${k('Horas extra',toH(he),hhPc?`${(he/hhPc*100).toFixed(1)} % de las HH`:'','var(--warn)')}
      ${soles?k('Costo MO estimado',tcoS(T.cost),`horas, BUC, HE, altura, movilidad, dominical y feriados${P.leyes==null?' · sin leyes sociales (Parámetros)':` · con ${P.leyes} % de leyes sociales`}${T.costNP>0.005?` · ${tcoS(T.costNP)} sin partida (feriados no laborados y dominical)`:''}`):''}${k('Partidas con horas',L.length,S.tpc&&S.tpc.size?`de ${[...S.tpc.values()].filter(x=>x.act!==false&&!x.arch).length} activas`:'')}
      ${T.dctH>0||R.DC.length?`<div class="lqtile ts-tbtn" id="tcoDctT" role="button" tabindex="0" style="--c:var(--accent2,var(--accent))"><span>Descuentos a SC</span><b>${soles?tcoS(T.dctM):toH(T.dctH)+' HH'}</b><small>${toH(T.dctH)} HH · ${new Set(R.DC.map(x=>x.sc)).size} ${new Set(R.DC.map(x=>x.sc)).size===1?'subcontratista':'subcontratistas'}</small></div>`:''}
      ${k('Sobre la meta',sobre.length,'HH acumuladas > HH meta',sobre.length?'var(--bad)':'')}${k('Cuadre',`${nOk} de ${checks.length}`,nOk===checks.length?'todo cuadra':'revisa abajo',nOk===checks.length?'var(--ok)':'var(--warn)')}</div>
    <div class="ts-two"><div class="card ts-main"><div class="pad t-bar">${seg}${['pc','ua','det'].includes(TCO.vista)?`<input class="tin t-q" id="tcoQ" type="search" placeholder="Buscar partida, código o UA${TCO.vista==='det'?', obrero':''}" value="${esc(TCO.q)}" aria-label="Buscar">`:''}</div>${body}</div>
      <aside class="ts-side"><div class="card ts-al" id="tcoChk"><div class="tp-bh"><b>Cuadre del periodo</b></div><ul class="ts-ul">${checks.map(([ok,t,s,v])=>`<li><span class="ts-ck ${ok?'ok':'no'}" aria-hidden="true">${ok?'✓':'!'}</span><span><b>${esc(t)}</b><br><span class="note">${esc(s)}</span></span><span class="mono">${esc(v)}</span></li>`).join('')}</ul></div>
      ${tcoPowers(R,L)}</aside></div>
  </div></div>`;
  bindV();tsPerBind(TCO,'tco');
  $('#tcoXo').onclick=()=>tpxBajar(TCO.tipo==='sem'?'semana':a===b?'dia':'rango',a,b);
  $('#tcoX').onclick=()=>{if(typeof tsxBajar==='function')tsxBajar('costos',a,b,TCO.tipo);else toast('El Excel nuevo llega en la próxima versión.')};
  const q=$('#tcoQ');if(q)q.oninput=()=>{TCO.q=q.value;const f=tFold(TCO.q);document.querySelectorAll('[data-tcok]').forEach(tr=>{tr.hidden=!!f&&!tFold(tr.dataset.tcok).includes(f)})};
  const tb=$('#tcoPcT');if(tb)tb.onclick=e=>{const r=e.target.closest('[data-tcop]');if(r){TCO.sel=TCO.sel===r.dataset.tcop?'':r.dataset.tcop;requestRender()}};
  const ua=$('#tcoUaAll');if(ua)ua.onclick=()=>{TCO.vista='ua';requestRender()};
  const dt=$('#tcoDctT');if(dt)dt.onclick=()=>{TCO.vista='dct';requestRender()};
  const dtb=$('#tcoDcT');if(dtb)dtb.onclick=e=>{const g=e.target.closest('[data-tcods]');if(g){const k=g.dataset.tcods;if(TCO.dOpen.has(k))TCO.dOpen.delete(k);else TCO.dOpen.add(k);requestRender()}};
  const cp=$('#tcoCopy');if(cp)cp.onclick=async()=>{const t=tcoUATsv(R,L);try{await navigator.clipboard.writeText(t);toast('Tabla copiada: pégala en Excel o en Powers.')}catch(e){toast('No se pudo copiar: usa «Exportar Excel».')}};
  function bindV(){$('#tcoV').onclick=e=>{const x=e.target.closest('[data-tcov]');if(!x)return;TCO.vista=x.dataset.tcov;if(TCO.vista!=='pub')TPK.det='';requestRender()}}}

/* filas de grupo + partidas con horas; al hacer clic, la partida muestra quién trabajó (por cuadrilla y obrero) */
function tcoPartidas(R,L,A,soles){const q=tFold(TCO.q);const days=R.days.filter(f=>R.pub.includes(f));const mx=Math.max(1,...L.flatMap(x=>days.map(f=>x.dia[f]||0)));
  const G=new Map();for(const x of L.sort((a,b)=>tCmpCod(a.cod,b.cod))){const g=x.grp||'—';if(!G.has(g))G.set(g,{g,n:x.grpN,L:[]});G.get(g).L.push(x)}
  const ot=L.some(x=>x.c.OT>0);const col=11+(ot?1:0)+(soles?1:0);/* 11 columnas fijas (la banda del grupo llega hasta «Consumido») */
  const sp=x=>`<span class="ts-sp" aria-hidden="true">${days.map(f=>`<i style="height:${Math.max(2,Math.round((x.dia[f]||0)/mx*22))}px" title="${esc(tsDiaL(f))}: ${toH(x.dia[f]||0)} HH"></i>`).join('')}</span>`;
  const pct=x=>{const ac=A.get(x.id)||0;if(!x.hhp)return'<span class="note">sin meta</span>';const p=Math.round(ac/x.hhp*100);return`<span class="ts-bar"><i class="${p>100?'no':p>85?'w':''}" style="width:${Math.min(100,p)}%"></i></span><span class="mono${p>100?' ts-b':''}">${p} %</span>`};
  const det=x=>{const by=new Map();for(const w of R.W)for(const c of w.d)for(const[k,h]of c.pcs)if(k===x.id){const o=by.get(w.dni)||{w,h:0};o.h+=h;by.set(w.dni,o)}
    const ws=[...by.values()].sort((a,b)=>b.h-a.h);return`<tr class="ts-sub"><td colspan="${col}"><div class="ts-subg"><div><b>Por cuadrilla</b>${Object.entries(x.cua).sort((a,b)=>b[1]-a[1]).map(([c,h])=>`<div>${esc(c)} <span class="mono">${toH(h)}</span></div>`).join('')}</div>
      <div><b>Obreros (${ws.length})</b>${ws.slice(0,12).map(o=>`<div>${esc([o.w.ape,o.w.nom].filter(Boolean).join(', '))} · ${esc(o.w.catN)} <span class="mono">${toH(tR2(o.h))}</span></div>`).join('')}${ws.length>12?`<div class="note">y ${ws.length-12} más</div>`:''}</div></div></td></tr>`};
  const rows=[...G.values()].map(g=>{const gt=tR2(g.L.reduce((s,x)=>s+x.tot,0));return`<tr class="ts-grp"><td colspan="${col}">${esc(g.g)} · ${esc(g.n||'')} <span class="mono">${toH(gt)} HH</span></td></tr>`+g.L.map(x=>{const k=[x.cod,x.nom,x.ua,tpxUaP(x.ua)].join(' ');
    return`<tr data-tcop="${esc(x.id)}" data-tcok="${esc(k)}"${q&&!tFold(k).includes(q)?' hidden':''} class="${TCO.sel===x.id?'sel':''}"><td class="mono">${esc(x.cod)}</td><td>${esc(x.nom)}</td><td class="mono${tpxUaP(x.ua)?'':' ts-b'}">${esc(tpxUaP(x.ua)||'sin UA')}</td>
      <td class="mono t-r">${toH(x.c.OP)}</td><td class="mono t-r">${toH(x.c.OF)}</td><td class="mono t-r">${toH(x.c.PE)}</td>${ot?`<td class="mono t-r">${toH(x.c.OT)}</td>`:''}<td class="mono t-r"><b>${toH(x.tot)}</b></td><td class="mono t-r ts-w">${x.he?toH(x.he):''}</td>
      ${soles?`<td class="mono t-r">${tcoS(x.cost)}</td>`:''}<td>${sp(x)}</td><td class="mono t-r">${x.hhp?toH(x.hhp):''}</td><td class="ts-pc">${pct(x)}</td></tr>${TCO.sel===x.id?det(x):''}`}).join('')}).join('');
  const s=k=>toH(tR2(L.reduce((a,x)=>a+(k==='tot'?x.tot:k==='he'?x.he:x.c[k]),0)));
  return`<div class="tscroll"><table class="t ts-tbl" id="tcoPcT"><thead><tr><th>Código</th><th>Partida</th><th>UA Powers</th><th class="t-r">Operario</th><th class="t-r">Oficial</th><th class="t-r">Peón</th>${ot?'<th class="t-r">Otros</th>':''}<th class="t-r">Total HH</th><th class="t-r">de ellas HE</th>${soles?'<th class="t-r">Costo</th>':''}<th>HH por día</th><th class="t-r">HH meta</th><th>Consumido (acumulado)</th></tr></thead>
    <tbody>${rows||`<tr><td colspan="${col}" class="note">${R.pub.length?'Sin horas en este periodo.':'Aún no hay días publicados en este periodo.'}</td></tr>`}</tbody>
    <tfoot><tr><td></td><td><b>Total · ${L.length} partidas</b></td><td></td><td class="mono t-r">${s('OP')}</td><td class="mono t-r">${s('OF')}</td><td class="mono t-r">${s('PE')}</td>${ot?`<td class="mono t-r">${s('OT')}</td>`:''}<td class="mono t-r"><b>${s('tot')}</b></td><td class="mono t-r">${s('he')}</td>${soles?`<td class="mono t-r">${tcoS(L.reduce((a,x)=>a+x.cost,0))}</td>`:''}<td colspan="3"></td></tr></tfoot></table></div>
    <p class="pad note">Clic en una partida: quién trabajó en ella. Las HE de cada obrero se reparten entre sus partidas del día en proporción a las horas. «Consumido» = HH acumuladas desde el inicio (días publicados) ÷ HH del presupuesto meta.</p>`}

/* HH por cuenta UA de Powers (la UA del tareo sin el sufijo -n) y categoría */
function tcoUAagg(L){const M=new Map();for(const x of L){const u=tpxUaP(x.ua)||'(sin UA)';const o=M.get(u)||{u,c:{OP:0,OF:0,PE:0,OT:0},tot:0,cods:[]};for(const k of['OP','OF','PE','OT'])o.c[k]=tsSum(o.c[k],x.c[k]);o.tot=tsSum(o.tot,x.tot);o.cods.push(x.cod);M.set(u,o)}
  return[...M.values()].sort((a,b)=>a.u==='(sin UA)'?1:b.u==='(sin UA)'?-1:a.u.localeCompare(b.u))}
function tcoUA(R,L){const q=tFold(TCO.q);const U2=tcoUAagg(L);
  return`<div class="tscroll"><table class="t ts-tbl" id="tcoUaT"><thead><tr><th>UA Powers</th><th>Partidas</th><th class="t-r">Operario</th><th class="t-r">Oficial</th><th class="t-r">Peón</th><th class="t-r">Otros</th><th class="t-r">Total HH</th></tr></thead><tbody>
    ${U2.map(o=>`<tr data-tcok="${esc(o.u+' '+o.cods.join(' '))}"${q&&!tFold(o.u+' '+o.cods.join(' ')).includes(q)?' hidden':''}><td class="mono${o.u==='(sin UA)'?' ts-b':''}">${esc(o.u)}</td><td class="mono note">${esc(o.cods.sort(tCmpCod).join(', '))}</td><td class="mono t-r">${toH(o.c.OP)}</td><td class="mono t-r">${toH(o.c.OF)}</td><td class="mono t-r">${toH(o.c.PE)}</td><td class="mono t-r">${o.c.OT?toH(o.c.OT):''}</td><td class="mono t-r"><b>${toH(o.tot)}</b></td></tr>`).join('')||'<tr><td colspan="7" class="note">Sin horas en este periodo.</td></tr>'}</tbody>
    <tfoot><tr><td><b>Total</b></td><td></td><td class="mono t-r">${toH(tR2(U2.reduce((s,o)=>s+o.c.OP,0)))}</td><td class="mono t-r">${toH(tR2(U2.reduce((s,o)=>s+o.c.OF,0)))}</td><td class="mono t-r">${toH(tR2(U2.reduce((s,o)=>s+o.c.PE,0)))}</td><td class="mono t-r">${toH(tR2(U2.reduce((s,o)=>s+o.c.OT,0)))}</td><td class="mono t-r"><b>${toH(tR2(U2.reduce((s,o)=>s+o.tot,0)))}</b></td></tr></tfoot></table></div>`}
function tcoUATsv(R,L){return[['UA Powers','Operario','Oficial','Peón','Otros','Total'].join('\t'),...tcoUAagg(L).map(o=>[o.u,o.c.OP,o.c.OF,o.c.PE,o.c.OT,o.tot].map(v=>typeof v==='number'?String(v).replace('.',','):v).join('\t'))].join('\n')}
function tcoPowers(R,L){const U2=tcoUAagg(L).slice(0,8);return`<div class="card ts-al" id="tcoPw"><div class="tp-bh"><b>Para cargar a Powers</b><button class="ib" id="tcoCopy">Copiar tabla</button></div>
  <table class="t ts-mini"><thead><tr><th>UA</th><th class="t-r">Op.</th><th class="t-r">Of.</th><th class="t-r">Pe.</th><th class="t-r">Total</th></tr></thead><tbody>${U2.map(o=>`<tr><td class="mono${o.u==='(sin UA)'?' ts-b':''}">${esc(o.u)}</td><td class="mono t-r">${toH(o.c.OP)}</td><td class="mono t-r">${toH(o.c.OF)}</td><td class="mono t-r">${toH(o.c.PE)}</td><td class="mono t-r"><b>${toH(o.tot)}</b></td></tr>`).join('')||'<tr><td colspan="5" class="note">Sin horas.</td></tr>'}</tbody></table>
  ${tcoUAagg(L).length>8?`<button class="t-lnk" id="tcoUaAll">Ver todas las cuentas ›</button>`:''}</div>`}

function tcoCua(R){const C=[...R.cua.entries()].sort((a,b)=>b[1]-a[1]);const tot=tR2(C.reduce((s,[,h])=>s+h,0));const he=new Map(),ob=new Map();
  /* por la cuadrilla de cada día (quien cambió de cuadrilla cuenta en las dos) */
  for(const w of R.W){const en=new Set();for(const c of w.d){if(!c.cua||!(c.h>0))continue;he.set(c.cua,tsSum(he.get(c.cua),c.h60+c.h100+c.df));en.add(c.cua)}for(const k of en)ob.set(k,(ob.get(k)||0)+1)}
  return`<div class="tscroll"><table class="t ts-tbl" id="tcoCuT"><thead><tr><th>Cuadrilla</th><th class="t-r">Obreros</th><th class="t-r">HH</th><th class="t-r">de ellas HE</th><th>Participación</th></tr></thead><tbody>
    ${C.map(([c,h])=>`<tr><td><b>${esc(c)}</b></td><td class="mono t-r">${ob.get(c)||0}</td><td class="mono t-r">${toH(h)}</td><td class="mono t-r ts-w">${toH(he.get(c)||0)}</td><td class="ts-pc"><span class="ts-bar"><i style="width:${tot?Math.round(h/tot*100):0}%"></i></span><span class="mono">${tot?Math.round(h/tot*100):0} %</span></td></tr>`).join('')||'<tr><td colspan="5" class="note">Sin horas en este periodo.</td></tr>'}</tbody></table></div>`}

/* todas las partidas activas con meta: HH del periodo, acumuladas y % consumido (las de más consumo primero) */
function tcoMeta(R,A){const L=(S.tpc?[...S.tpc.values()]:[]).filter(x=>!x.arch&&(x.act!==false||A.get(x.id))).map(x=>{const t=tcoPc(x.id,R);const ac=A.get(x.id)||0;const per=(R.PC.get(x.id)||{}).tot||0;return{...t,ac,per,p:t.hhp?ac/t.hhp*100:null}})
    .sort((a,b)=>(b.p??-1)-(a.p??-1)||tCmpCod(a.cod,b.cod));
  return`${TCO.hok?'':'<div class="pad note">Cargando el acumulado…</div>'}<div class="tscroll"><table class="t ts-tbl" id="tcoMeT"><thead><tr><th>Código</th><th>Partida</th><th>und</th><th class="t-r">Metrado</th><th class="t-r">HH meta</th><th class="t-r">HH/und meta</th><th class="t-r">HH del periodo</th><th class="t-r">HH acumuladas</th><th>Consumido</th></tr></thead><tbody>
    ${L.map(x=>`<tr><td class="mono">${esc(x.cod)}</td><td>${esc(x.nom)}</td><td>${esc(x.und)}</td><td class="mono t-r">${x.met?toH(x.met):''}</td><td class="mono t-r">${x.hhp?toH(x.hhp):'<span class="note">sin meta</span>'}</td><td class="mono t-r">${x.met&&x.hhp?(x.hhp/x.met).toFixed(2):''}</td><td class="mono t-r">${x.per?toH(x.per):''}</td><td class="mono t-r">${x.ac?toH(x.ac):''}</td>
      <td class="ts-pc">${x.p==null?'':`<span class="ts-bar"><i class="${x.p>100?'no':x.p>85?'w':''}" style="width:${Math.min(100,Math.round(x.p))}%"></i></span><span class="mono${x.p>100?' ts-b':''}">${Math.round(x.p)} %</span>`}</td></tr>`).join('')||'<tr><td colspan="9" class="note">No hay partidas de control.</td></tr>'}</tbody></table></div>
    <p class="pad note">El metrado y las HH meta son las de Partidas de control (presupuesto meta). El acumulado suma todos los días publicados hasta el fin del periodo.</p>`}

/* base de datos larga: una fila por obrero, día y partida (para filtrar o hacer tablas dinámicas) */
function tcoDet(R,PB){const q=tFold(TCO.q);const L=[];for(const w of R.W)for(const c of w.d)for(const[k,h]of c.pcs){const p=PB.get(c.f);const m=(p&&p.pcs||{})[k]||tcoPc(k,R);L.push({w,c,k,h,m})}
  L.sort((a,b)=>a.c.f<b.c.f?-1:a.c.f>b.c.f?1:tpxCmp(a.w,b.w));const max=800;let n=0;
  const rows=L.map(x=>{const key=[x.w.ape,x.w.nom,x.w.dni,x.m.cod,x.m.nom,x.m.ua,x.c.cua||x.w.cua].join(' ');if(q&&!tFold(key).includes(q))return'';if(++n>max)return'';
    return`<tr data-tcok="${esc(key)}"><td class="mono">${esc(fmtD(x.c.f))}</td><td class="mono">${esc(x.w.dni)}</td><td>${esc([x.w.ape,x.w.nom].filter(Boolean).join(', '))}</td><td>${esc(x.c.catN||x.w.catN)}</td><td>${esc(x.c.cua||x.w.cua||'')}</td><td>${esc(x.w.capN||'')}</td><td class="mono">${esc(x.m.cod||x.k)}</td><td>${esc(x.m.nom||'')}</td><td class="mono">${esc(tpxUaP(x.m.ua)||'')}</td><td class="mono t-r">${toH(x.h)}</td><td>${x.c.alt?'▲':''}</td></tr>`}).join('');
  return`<div class="tscroll"><table class="t ts-tbl" id="tcoDeT"><thead><tr><th>Fecha</th><th>DNI</th><th>Obrero</th><th>Cat.</th><th>Cuadrilla</th><th>Capataz</th><th>Código</th><th>Partida</th><th>UA Powers</th><th class="t-r">HH</th><th>Altura</th></tr></thead><tbody>${rows||'<tr><td colspan="11" class="note">Sin horas en este periodo.</td></tr>'}</tbody></table></div>
    <p class="pad note">${L.length} filas${n>max?` · se muestran ${max}: usa el buscador o «Exportar Excel» para verlas todas`:''}.</p>`}

/* descuentos a SC del periodo (24-10-2026): por subcontratista, con su detalle (fecha, obrero, partida, HH normales y extra, tarifa y
   monto). Se calcula de las publicaciones vigentes: si un día se rectifica y se vuelve a publicar, cambia solo. Soles: tplSoles(). */
function tcoDct(R,soles){const G=new Map();for(const x of R.DC){const o=G.get(x.sc)||{sc:x.sc,n:x.scN,L:[],h:0,hn:0,he:0,m:0};o.L.push(x);o.h=tsSum(o.h,x.h);o.hn=tsSum(o.hn,x.hn);o.he=tsSum(o.he,tR2(x.h60+x.h100));o.m+=x.monto;G.set(x.sc,o)}
  const L=[...G.values()].sort((a,b)=>a.n.localeCompare(b.n));const pl=R.DC.some(x=>x.src==='planilla');
  const dpc=[...S.tpc.values()].filter(x=>x&&!x.arch&&x.dct===true);
  if(!L.length)return`<p class="pad note" id="tcoDcNo">${R.pub.length?'No hay horas descontadas a subcontratistas en este periodo.':'Aún no hay días publicados en este periodo.'}${dpc.length?'':' Para descontar horas, marca la partida como «Descontable» en Partidas de control y agrega los subcontratistas en Configuración del tareo.'}</p>`;
  const rows=L.map(g=>{const op=TCO.dOpen.has(g.sc);return`<tr class="ts-grp tco-dg" data-tcods="${esc(g.sc)}"><td colspan="3"><button class="t-lnk" aria-expanded="${op}">${op?'▾':'▸'} <b>${esc(g.n)}</b></button> <span class="note">${g.L.length} ${g.L.length===1?'registro':'registros'}</span></td>
      <td class="mono t-r">${toH(g.hn)}</td><td class="mono t-r">${g.he?toH(g.he):''}</td><td class="mono t-r"><b>${toH(g.h)}</b></td>${soles?`<td></td><td class="mono t-r"><b>${tcoS(g.m)}</b></td>`:''}<td></td></tr>`+(op?g.L.map(x=>{const pc=tcoPc(x.pc,R);
      return`<tr class="tco-dr"><td class="mono">${esc(fmtD(x.f))}</td><td>${esc([x.ape,x.nom].filter(Boolean).join(', '))} <span class="note">${esc(x.catN||'')}</span></td><td><span class="mono">${esc(pc.cod)}</span> <span class="note">${esc(x.capN||'')}</span></td>
        <td class="mono t-r">${toH(x.hn)}</td><td class="mono t-r">${x.h60+x.h100?toH(tR2(x.h60+x.h100)):''}</td><td class="mono t-r">${toH(x.h)}</td>${soles?`<td class="mono t-r" title="${x.src==='planilla'?'Costo HH de la planilla (no hay tarifa de descuento para esta categoría)':'Tarifa de descuento'}">${x.tar.toFixed(2)}${x.src==='planilla'?'*':''}</td><td class="mono t-r">${tcoS(x.monto)}</td>`:''}<td class="note">v${esc(String(x.v||''))}</td></tr>`}).join(''):'')}).join('');
  const tot=k=>tR2(L.reduce((a,g)=>a+g[k],0));
  return`<div class="tscroll"><table class="t ts-tbl" id="tcoDcT"><thead><tr><th>Fecha</th><th>Obrero</th><th>Partida · capataz</th><th class="t-r">HH normales</th><th class="t-r">HH extra</th><th class="t-r">Total HH</th>${soles?'<th class="t-r">Tarifa S/ HH</th><th class="t-r">Monto</th>':''}<th></th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="3"><b>Total · ${L.length} ${L.length===1?'subcontratista':'subcontratistas'}</b></td><td class="mono t-r">${toH(tot('hn'))}</td><td class="mono t-r">${toH(tot('he'))}</td><td class="mono t-r"><b>${toH(tot('h'))}</b></td>${soles?`<td></td><td class="mono t-r"><b>${tcoS(L.reduce((a,g)=>a+g.m,0))}</b></td>`:''}<td></td></tr></tfoot></table></div>
    <p class="pad note">Clic en un subcontratista para ver el detalle. Las horas extra de la partida se reparten entre los SC en proporción y llevan el recargo de Parámetros (${R.P.sob1} % y ${R.P.sob2} %).${soles?` Tarifa por HH: la de «Tarifas de descuento a SC» en Parámetros${pl?'; * = sin tarifa para esa categoría, se usó el costo HH de la planilla':''}.`:''} Los montos se recalculan solos si un día se rectifica.</p>`}
