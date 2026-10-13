"use strict";
/* LPS 911 · Indicadores › Diario: semáforo de cumplimiento por subcontratista y modo presentación del día (pedido del dueño, oct 2026).
   - Gráfico: quiénes cumplieron su plan del día (PPC ≥ 80 %), quiénes quedaron en parcial (50–80 %) y quiénes en crítico (< 50 %,
     lo que se verifica a detalle). Cada barra separa lo cumplido y lo no cumplido por una causa ajena al SC (rayado = no imputable).
   - Presentación (#ipr, modo 'dia' de ind-presentacion.js): para proyectar al final del día. Cuatro láminas: Resumen · Subcontratistas ·
     A verificar (críticos, con el motivo de cada incumplimiento) · Causas (imputables vs no imputables al SC).
   Solo lee `dayData` (misma población y fórmula que Indicadores › Diario): no escribe nada ni cambia el PPC.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

let IXD_M='br';  // con qué PPC se clasifica: 'br' = bruto (cumplidos / verificados) · 'sc' = del SC (sin lo no imputable)
let IXD_SC='';   // SC tocado en el gráfico: filtra «Incumplimientos del día» (solo en la sesión)
const IXD_OK=.8, IXD_WARN=.5; // ≥ 80 % cumplió · 50–80 % parcial · < 50 % crítico
const ixdBand=v=>v==null?'none':v>=IXD_OK?'ok':v>=IXD_WARN?'warn':'bad';
const IXD_G={bad:{t:'Crítico',h:'menos de 50 % · verificar el cumplimiento a detalle'},warn:{t:'Parcial',h:'entre 50 % y 80 %'},ok:{t:'Cumplieron',h:'80 % o más'},none:{t:'Sin verificar',h:'nadie registró su cumplimiento'}};
const ixdName=sc=>conOf(sc).name;
const ixdNm=r=>r.pi?r.pi.code+' · '+r.pi.name:ixdName(r.sc);
let IPRF={sc:'',pi:''}; // filtros cruzados de la presentación (tocar una barra): subcontratista y piso

/** una fila por SC con su PPC bruto y del SC; `v`/`band` según la clasificación elegida (IXD_M) */
function ixdRows(D){return Object.entries(D.scA).map(([sc,o])=>{const br=o.ver?o.ok/o.ver:null,ps=pscOf(o),nimp=o.nimp||0;
  const v=IXD_M==='sc'?ps:br;return{sc,o,br,ps,v,band:ixdBand(v),nimp,imp:o.ver-o.ok-nimp}})}
function ixdGroups(R){const g={bad:[],warn:[],ok:[],none:[]};R.forEach(r=>g[r.band].push(r));
  const byN=(a,b)=>ixdNm(a).localeCompare(ixdNm(b));
  g.bad.sort((a,b)=>a.v-b.v||byN(a,b));g.warn.sort((a,b)=>a.v-b.v||byN(a,b));g.ok.sort((a,b)=>b.v-a.v||byN(a,b));g.none.sort(byN);return g}

/** barra de un SC: relleno = cumplidos / verificados (color del semáforo), rayado = no cumplido por causa ajena al SC */
function ixdRow(r,click,sel){const c=r.pi?{name:ixdNm(r),color:'var(--accent,#2563eb)'}:conOf(r.sc),o=r.o;const at=r.pi?'data-ixpi':'data-ixsc',key=r.pi?r.pi.id:r.sc;
  const f=o.ver?100*o.ok/o.ver:0,h=o.ver?100*r.nimp/o.ver:0;
  const alt=IXD_M==='sc'?(r.br==null?'':` · bruto ${pct(r.br)}`):(r.nimp&&r.ps!=null?` · del SC ${pct(r.ps)}`:'');
  const tip=`${c.name}: ${o.ok} cumplidas, ${o.partial} parciales y ${o.no} no cumplidas de ${o.ver} verificadas (${o.prog} programadas)${r.nimp?` · ${r.nimp} no imputable${r.nimp===1?'':'s'} al SC`:''}`;
  return`<div class="ixr ${r.band}${click&&sel!=null&&sel===key?' sel':''}${click&&sel&&sel!==key?' dim':''}"${click?` ${at}="${esc(key)}" role="button" tabindex="0"`:''} title="${esc(tip)}${click?' · clic: ver sus incumplimientos':''}">
    <span class="nm"><i style="background:${esc(c.color)}"></i>${esc(c.name)}</span>
    <span class="tr"><span class="fl ${r.band}" style="width:${f.toFixed(1)}%"></span>${h?`<span class="gh" style="left:${f.toFixed(1)}%;width:${h.toFixed(1)}%"></span>`:''}<i class="tk" style="left:50%"></i><i class="tk" style="left:80%"></i></span>
    <span class="vl">${r.v==null?`<b>—</b><small>${o.ver?'todo lo fallado fue ajeno al SC':o.prog+' programada'+(o.prog===1?'':'s')+' sin verificar'}</small>`:`<b>${pct(r.v)}</b><small>${o.ok} de ${o.ver}${alt}</small>`}</span></div>`}
function ixdGroupsHtml(R,click,sel){const g=ixdGroups(R);
  return['bad','warn','ok','none'].filter(k=>g[k].length).map(k=>`<section class="ixd-grp ${k}"><h4 class="ixd-gh"><i></i>${IXD_G[k].t} <b>${g[k].length}</b><small>${IXD_G[k].h}</small></h4>${g[k].map(r=>ixdRow(r,click,sel)).join('')}</section>`).join('')}
/** cuatro contadores del semáforo; con `names` (presentación) listan a los SC de cada grupo */
function ixdSummary(R,names){const g=ixdGroups(R);
  const box=k=>{const L=g[k];const nm=names&&L.length?`<span class="ixd-nm">${L.slice(0,8).map(r=>esc(ixdNm(r))).join(' · ')}${L.length>8?` · y ${L.length-8} más`:''}</span>`:'';
    return`<div class="ixd-c ${k}"><span>${IXD_G[k].t}</span><b>${L.length}</b><small>${k==='bad'?'&lt; 50 %':k==='warn'?'50–80 %':k==='ok'?'≥ 80 %':'sin registro'}</small>${nm}</div>`};
  return`<div class="ixd-sum">${['ok','warn','bad','none'].map(box).join('')}</div>`}
/** interruptor «clasificar por»: en la página lo atiende wireInd (data-xm), en la presentación iprClick (data-ip="xm") */
const ixdToggle=ip=>`<span class="seg ixd-m" id="${ip?'iprxm':'ixm'}" title="Con qué PPC se separa a los subcontratistas en cumplieron / parcial / crítico"><span class="ixd-ml">Clasificar por</span><button ${ip?'data-ip="xm" ':''}data-xm="br" class="${IXD_M==='br'?'on':''}">PPC bruto</button><button ${ip?'data-ip="xm" ':''}data-xm="sc" class="${IXD_M==='sc'?'on':''}" title="No cuenta lo no cumplido por causas que no dependen del subcontratista">PPC del SC</button></span>`;
const ixdLegend=()=>`<div class="ixd-leg"><span><i class="s ok"></i>Cumplido</span><span><i class="s gh"></i>No cumplido por causa ajena al SC (no imputable)</span><span><i class="s tk"></i>Marcas en 50 % y 80 %</span></div>`;

/** tarjeta de la página (Indicadores › Diario) */
function ixdCard(D,d){const R=ixdRows(D);if(!R.length)return'';
  return`<div class="card ixd"><h2>Cumplimiento del día por subcontratista <span class="sub">${fmtD(d)} · toca un subcontratista para ver sus incumplimientos</span></h2><div class="pad">
    ${ixdSummary(R)}<div class="ixd-tools">${ixdToggle(false)}${ixdLegend()}</div>${ixdGroupsHtml(R,true,IXD_SC)}</div></div>`}

/* ================= presentación del día ================= */
const IPRD_PG=['Resumen','Subcontratistas','A verificar','Causas'];
const ixdTag=rc=>impOf(rc)===false?'<span class="ixd-tag nimp" title="La causa no depende del subcontratista">No imputable</span>':'<span class="ixd-tag imp">Imputable al SC</span>';
const ixdSort=(a,b)=>a.p.order-b.p.order||a.s.order-b.s.order||a.a.order-b.a.order||a.x.order-b.x.order;

function iprdDraw(o){
  const d=indDay(),today=todayIso();ensureDaily(addD(d,-1));const D0=dayData([d],histPisoSet());
  if(IPRF.sc&&!D0.scA[IPRF.sc])IPRF.sc='';if(IPRF.pi&&!D0.piA[IPRF.pi])IPRF.pi='';
  /* filtro cruzado: cada gráfico ignora su propio filtro (para seguir viendo las demás barras) y aplica el del otro */
  const D=iprdFilt(D0,IPRF.sc,IPRF.pi),Dsc=iprdFilt(D0,'',IPRF.pi),Dpi=iprdFilt(D0,IPRF.sc,'');const R=ixdRows(Dsc);
  o.setAttribute('aria-label','Indicadores del día · presentación');
  const bar=`<header class="iprbar">
    <div class="iprt"><b>Cumplimiento del día</b><small>${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}${d===today?' · hoy':''} · ${pisoLabel()}</small></div>
    <span class="iprg"><button class="ib" data-ip="dp" aria-label="Día anterior">‹</button><button class="ib" data-ip="dt">Hoy</button><button class="ib" data-ip="dn" aria-label="Día siguiente">›</button></span>
    <select class="tin" id="iprpiso" aria-label="Piso"><option value="">Todos los pisos</option>${pisos().map(p=>`<option value="${esc(p.id)}"${U.piso===p.id?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>
    <span class="seg iprpg">${IPRD_PG.map((t,i)=>`<button data-ip="pg" data-pg="${i}" class="${IPR.pg===i?'on':''}">${t}</button>`).join('')}</span>
    ${ixdToggle(true)}
    <span class="fsp"></span>
    <span class="iprg"><button class="ib" data-ip="z-" aria-label="Letra más pequeña">A−</button><button class="ib" data-ip="z+" aria-label="Letra más grande">A+</button></span>
    <button class="ib" data-ip="x">Salir <kbd>Esc</kbd></button></header>`;
  let body;
  const flt=iprdFlt();
  if(!D0.tot.prog&&!D0.extras.length)body=`<div class="iprempty">${nwReason(d)?esc(nwReason(d))+': día no laborable.':'No hay actividades programadas este día'+(U.piso?' en este piso':'')+'.'}</div>`;
  else if(IPR.pg===0)body=flt+iprdResumen(D,R)+iprdPisos(Dpi,Object.keys(D0.piA).length);else if(IPR.pg===1)body=flt+iprdSc(R);else if(IPR.pg===2)body=flt+iprdCriticos(D,ixdRows(D));else body=flt+iprdCausas(D);
  const st=o.querySelector('.iprc');const sc=st?st.scrollTop:0;
  o.innerHTML=bar+`<div class="iprc" style="--ipz:${IPR.z}">${body}</div><footer class="iprft">${IPRD_PG.map((t,i)=>`<i class="${IPR.pg===i?'on':''}"></i>`).join('')}<span>← → para cambiar de lámina</span></footer>`;
  const st2=o.querySelector('.iprc');if(st2&&st)st2.scrollTop=sc}

/** filas de un conjunto de `dayData` filtradas por SC y/o piso (los totales se recalculan igual que dayData) */
function iprdFilt(D,sc,pi){if(!sc&&!pi)return D;const rows=D.rows.filter(r=>(!sc||r.sc===sc)&&(!pi||r.p.id===pi));return{...D,rows,...dayAgg(rows),extras:D.extras}}
/** franja con los filtros activos (se quitan con ✕) o la pista de que las barras se tocan */
function iprdFlt(){const ch=[];
  if(IPRF.sc)ch.push(`<button class="ixd-fc" data-ip="fsc" data-v="${esc(IPRF.sc)}" title="Quitar este filtro"><i style="background:${esc(conOf(IPRF.sc).color)}"></i>${esc(ixdName(IPRF.sc))} ✕</button>`);
  if(IPRF.pi){const p=S.pis.get(IPRF.pi)||ARCH.pis.get(IPRF.pi);ch.push(`<button class="ixd-fc" data-ip="fpi" data-v="${esc(IPRF.pi)}" title="Quitar este filtro">${esc(p?p.code+' · '+p.name:'Piso')} ✕</button>`)}
  return ch.length?`<div class="ixd-flt"><span>Mostrando solo:</span>${ch.join('')}<button class="ib" data-ip="fclr">Quitar filtros</button></div>`:`<div class="ixd-flt hint"><span>Toca una barra de subcontratista o de piso para filtrar todas las láminas.</span></div>`}
/** comparativo de PPC por piso, al pie del Resumen (mismo semáforo que los subcontratistas; tocar un piso filtra todo) */
function iprdPisos(D,nAll){const R=Object.entries(D.piA).map(([id,o])=>{const p=S.pis.get(id)||ARCH.pis.get(id);if(!p)return null;const br=o.ver?o.ok/o.ver:null,ps=pscOf(o),v=IXD_M==='sc'?ps:br,nimp=o.nimp||0;
    return{pi:p,sc:'',o,br,ps,v,band:ixdBand(v),nimp,imp:o.ver-o.ok-nimp}}).filter(Boolean).sort((a,b)=>a.pi.order-b.pi.order);
  if(!R.length||nAll<2)return'';
  return`<section class="iprcard"><h3>PPC por piso <small>${R.length} pisos · ${IXD_M==='sc'?'según el PPC del SC':'según el PPC bruto'}${IPRF.sc?' · solo '+esc(ixdName(IPRF.sc)):''} · toca un piso para filtrar</small></h3>
    <div class="ixd-pisos${R.length>8?' two':''}">${R.map(r=>ixdRow(r,true,IPRF.pi)).join('')}</div>
    <div class="ixd-legb">${ixdLegend()}</div></section>`}

/** fotos de un incumplimiento (las del registro de Campo y las del reporte en vivo); tocar una la agranda (iprClick) */
function ixdPhotos(x){const lv=typeof liveOf==='function'?liveOf(x.d,x.x.id):null;const ids=[...new Set([...((x.rc&&x.rc.photos)||[]),...((lv&&lv.photos)||[])])];if(!ids.length)return'';
  return`<div class="ixd-ph">${ids.map(id=>{loadFoto(id);const src=FOTO.get(id)||'';return`<img data-ph="${esc(id)}" src="${src}" alt="Foto del incumplimiento"${src?'':' style="opacity:.3"'}>`}).join('')}</div>`}

function ixdSplit(imp,nimp){if(!imp&&!nimp)return'<div class="empty">Sin incumplimientos verificados.</div>';
  return`<div class="ixd-split">${imp?`<span class="i" style="flex:${imp}"><b>${imp}</b></span>`:''}${nimp?`<span class="n" style="flex:${nimp}"><b>${nimp}</b></span>`:''}</div>
    <div class="ixd-sl"><span><i class="i"></i>Imputables al subcontratista · <b>${imp}</b></span><span><i class="n"></i>No imputables (causa ajena) · <b>${nimp}</b></span></div>`}

function iprdResumen(D,R){const t=D.tot,br=t.ver?t.ok/t.ver:null,ps=pscOf(t);const nimp=t.nimp,imp=t.ver-t.ok-nimp,sin=t.prog-t.ver;
  const kpi=(k,v,s,tone)=>`<div class="iprk ${tone||''}"><span>${k}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const b=ixdBand(br);
  return`<div class="iprhero">
    ${iprRing(br,'PPC del día',b==='none'?'':b)}
    <div class="iprks">
      ${kpi('Programadas',t.prog,t.ver?`${pct(t.ver/t.prog)} verificadas`:'')}
      ${kpi('Cumplidas',t.ok,'',t.ok?'ok':'')}
      ${kpi('Parcial',t.partial,'cuenta como no cumplido',t.partial?'warn':'')}
      ${kpi('No cumplidas',t.no,'',t.no?'bad':'')}
      ${kpi('Sin verificar',sin,sin?'nadie registró su cumplimiento':'',sin?'warn':'')}
      ${kpi('PPC del SC',pct(ps),'sin lo no imputable')}
      ${kpi('No programados',D.extras.length,'trabajo visto en obra')}
    </div></div>
    <div class="iprgrid">
      <section class="iprcard"><h3>Semáforo de subcontratistas <small>${IXD_M==='sc'?'según el PPC del SC':'según el PPC bruto'}</small></h3>${R.length?ixdSummary(R,true):'<div class="empty">Sin subcontratistas con actividades este día.</div>'}</section>
      <section class="iprcard"><h3>Lo que no se cumplió <small>imputable o no al SC</small></h3>${ixdSplit(imp,nimp)}</section>
    </div>`}

function iprdSc(R){if(!R.length)return'<div class="iprempty">Sin subcontratistas con actividades este día.</div>';
  return`<section class="iprcard"><h3>Cumplimiento por subcontratista <small>${R.length} · ${IXD_M==='sc'?'clasificados por PPC del SC':'clasificados por PPC bruto'}</small></h3>
    <div class="ixd-cols${R.length>12?' two':''}">${ixdGroupsHtml(R,true,IPRF.sc)}</div>
    <div class="ixd-legb">${ixdLegend()}</div>
    <p class="iprnote">Toca un subcontratista para filtrar todas las láminas. PPC bruto = cumplidos / verificados (Parcial cuenta como no cumplido). «Del SC» no cuenta lo que falló por causas que no dependen del subcontratista (rayado).</p></section>`}

function iprdCriticos(D,R){const crit=ixdGroups(R).bad;
  if(!crit.length)return`<div class="iprempty">Ningún subcontratista quedó en crítico (menos de 50 %).<small>Revisa la lámina Subcontratistas para ver a los que quedaron en parcial.</small></div>`;
  return`<div class="ixd-crit">${crit.map(r=>{const c=conOf(r.sc);const L=D.rows.filter(x=>x.sc===r.sc&&x.rc&&x.rc.status!=='ok').sort(ixdSort);const sin=r.o.prog-r.o.ver;
    return`<section class="iprcard ixd-cc"><h3><i class="sw" style="background:${esc(c.color)}"></i>${esc(c.name)} <b class="ixd-pv">${pct(r.v)}</b> <small>${r.o.ok} de ${r.o.ver} verificadas${r.nimp?` · ${r.nimp} no imputable${r.nimp===1?'':'s'}`:''}${sin?` · ${sin} sin verificar`:''}</small></h3>
      ${L.length?`<table class="ixd-tbl"><thead><tr><th>Ambiente</th><th>Actividad</th><th>Estado</th><th>Causa</th><th></th></tr></thead><tbody>${L.map(x=>`<tr><td>${U.piso?'':esc(x.p.code)+' · '}${esc(x.a.code)} ${esc(x.a.name)}</td><td class="lead">${esc(x.x.name)}</td><td class="${ST[x.rc.status].c}">${ST[x.rc.status].i} ${ST[x.rc.status].t}</td><td>${x.rc.cnc?esc(x.rc.cnc):'<em class="mu">sin causa</em>'}${x.rc.note?`<small>${esc(x.rc.note)}</small>`:''}${ixdPhotos(x)}</td><td>${ixdTag(x.rc)}</td></tr>`).join('')}</tbody></table>`:`<div class="empty">No tiene incumplimientos registrados: lo programado no se verificó.</div>`}
    </section>`}).join('')}</div>`}

function iprdCausas(D){const cI={},cN={};
  D.rows.forEach(r=>{if(!r.rc||r.rc.status==='ok')return;const k=cncKey(r.rc.cnc);const m=impOf(r.rc)===false?cN:cI;m[k]=(m[k]||0)+1});
  const bars=(m,tone)=>{const e=Object.entries(m).sort((a,b)=>b[1]-a[1]);return e.length?iprBars(e.map(([k,v])=>({label:k,v,tone}))):'<div class="empty">Ninguna.</div>'};
  const nI=Object.values(cI).reduce((s,v)=>s+v,0),nN=Object.values(cN).reduce((s,v)=>s+v,0);
  if(!nI&&!nN)return`<div class="iprempty">Sin incumplimientos verificados este día.<small>${D.tot.prog>D.tot.ver?`Quedan ${D.tot.prog-D.tot.ver} actividades sin verificar.`:'Todo lo verificado se cumplió.'}</small></div>`;
  return`<div class="iprgrid ixd-cz">
    <section class="iprcard"><h3>Imputables al subcontratista <small>${nI} · causas que sí dependían de él</small></h3>${bars(cI,'bad')}</section>
    <section class="iprcard"><h3>No imputables al subcontratista <small>${nN} · causas ajenas (frente no entregado, programación, clima…)</small></h3>${bars(cN,'')}</section>
  </div><p class="iprnote">Parcial y No cumplido por causa. «No imputable» sale de la causa (Configuración) o de lo marcado en cada registro de Campo.</p>`}
