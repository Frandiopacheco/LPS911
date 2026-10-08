"use strict";
/* LPS 911 · Matriz de ambientes (fase 1, oct 2026): estado actual de cada actividad del catálogo en cada ambiente.
   Sirve para sincerar la obra cada semana y programar el lookahead sobre lo que de verdad falta.
   Colecciones propias (no escribe acts, ambientes ni weeks): mcat (catálogo de actividades), mtipo (tipos de ambiente),
   mamb/{ambId} (tipo del ambiente y estados confirmados) y mver (fotos semanales). Detalle en docs/ia/matriz.md.
   Fase 1: editan administrador y editores; el resto solo la ve. */

const MX={cat:new Map(),tipo:new Map(),amb:new Map(),ver:new Map(),prop:new Map(),log:new Map(),ld:{cat:false,tipo:false,amb:false},err:null,v:0,
  sel:new Set(),anchor:null,drag:null,moved:false,cmp:'',ali:null,aliV:-1,mc:null,mcK:''};
const MXS={p:'Pendiente',c:'En curso',t:'Terminado',n:'No aplica'};
const MXI={p:'',c:'◐',t:'✓',n:'–'};
const MXCL={t:'Típica',e:'Específica',d:'Por desglosar'};
let mxSubs=null;

/** nombre normalizado para ligar el lookahead (texto libre) con el catálogo: sin tildes, minúsculas, solo letras y números.
    El archivo de carga inicial usa la misma regla (alias `al` de cada actividad). */
const mnk=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

/* se carga al abrir la pestaña (no pesa en el arranque de los demás) */
/* el catálogo también lo usa el lookahead (nombres de actividad): se carga aparte y antes que el resto de la matriz */
let mcatSub=null;
function ensureMcat(){if(mcatSub||!db)return;
  mcatSub=fcol('mcat').onSnapshot(sn=>{MX.cat.clear();sn.docs.forEach(d=>MX.cat.set(d.id,{...d.data(),id:d.id}));MX.ld.cat=true;MX.err=null;MX.v++;if(ready&&(U.tab==='mat'||U.tab==='hoy'))requestRender()},
    err=>{MX.err=err&&err.code||'error';MX.ld.cat=true;if(ready&&U.tab==='mat')requestRender()});
  unsubs.push(()=>{if(mcatSub)mcatSub();mcatSub=null;MX.cat.clear();MX.ld.cat=false;MX.v++})}
/* estados por ambiente: también los usa el Lookahead (alertas de lo terminado que sigue programado) */
let mambSub=null;
function ensureMamb(){if(mambSub||!db)return;
  mambSub=fcol('mamb').onSnapshot(sn=>{MX.amb.clear();sn.docs.forEach(d=>MX.amb.set(d.id,{...d.data(),id:d.id}));MX.ld.amb=true;MX.v++;DV++;if(ready&&(U.tab==='mat'||U.tab==='look'))requestRender()},
    err=>{MX.err=err&&err.code||'error';MX.ld.amb=true;if(ready&&U.tab==='mat')requestRender()});
  unsubs.push(()=>{if(mambSub)mambSub();mambSub=null;MX.amb.clear();MX.ld.amb=false;MX.v++})}
/* fotos semanales: solo en la pestaña Matriz */
let mverSub=null;
function ensureMver(){if(mverSub||!db)return;mverSub=fcol('mver').orderBy('t','desc').limit(8).onSnapshot(sn=>{MX.ver.clear();sn.docs.forEach(d=>MX.ver.set(d.id,{...d.data(),id:d.id}));MX.v++;if(ready&&U.tab==='mat')requestRender()},()=>{});
  unsubs.push(()=>{if(mverSub)mverSub();mverSub=null;MX.ver.clear()})}
function ensureMx(){ensureMcat();ensureMamb();if(mxSubs||!db)return;const u=[];
  const on=(col,k,q)=>u.push((q||fcol(col)).onSnapshot(sn=>{const m=MX[k];m.clear();sn.docs.forEach(d=>m.set(d.id,{...d.data(),id:d.id}));if(k in MX.ld)MX.ld[k]=true;MX.err=null;MX.v++;if(ready&&(U.tab==='mat'||U.tab==='look'||U.tab==='hoy'))requestRender()},
    err=>{MX.err=err&&err.code||'error';if(k in MX.ld)MX.ld[k]=true;if(ready&&U.tab==='mat')requestRender()}));
  on('mcatp','prop');on('mtipo','tipo');if(canWrite)on('mlog','log',fcol('mlog').where('st','==','pend'));
  mxSubs=()=>u.forEach(f=>f());unsubs.push(()=>{if(mxSubs)mxSubs();mxSubs=null;['tipo','prop','log'].forEach(k=>MX[k].clear());MX.ld.tipo=false;MX.v++})}
const mxEd=()=>!!me&&canWrite&&!PM()&&!verRO();
/* la grilla abre en consulta (desplazarse y tocar celdas sin cambiar nada); «✎ Editar» habilita seleccionar y marcar (oct 2026) */
const mxCanEd=()=>mxEd()||(!!me&&SCK()&&!verRO());
const mxEdG=()=>mxEd()&&!!MX.edit;

/* alias → actividad del catálogo */
function mxAli(){if(MX.ali&&MX.aliV===MX.v)return MX.ali;const m=new Map();
  for(const c of MX.cat.values()){if(c.arch)continue;(c.al||[]).forEach(k=>{if(!m.has(k))m.set(k,c.id)});const k=mnk(c.name);if(k&&!m.has(k))m.set(k,c.id)}
  MX.ali=m;MX.aliV=MX.v;return m}
const mxCatOf=x=>mxAli().get(mnk(x&&x.name))||'';

/** celdas de cada ambiente: {catId:{s,sug,src,acts}}. s = estado; sug = lo propone el sistema (aún nadie lo confirmó);
    src = de dónde sale (tipo, lookahead o agregada a mano). Se recalcula cuando cambian los datos (MX.v, DV, DONEV). */
function mxCells(){const T0=todayIso();const k=MX.v+'|'+DV+'|'+DONEV+'|'+T0;if(MX.mc&&MX.mcK===k)return MX.mc;const ali=mxAli();const look=new Map();
  for(const x of S.act.values()){const c=ali.get(mnk(x.name));if(!c)continue;let a=look.get(x.ambId);if(!a)look.set(x.ambId,a=new Map());let l=a.get(c);if(!l)a.set(c,l=[]);l.push(x.id)}
  const out=new Map();
  for(const amb of S.amb.values()){const m=MX.amb.get(amb.id)||{};const st=m.c||{};const tp0=m.tipo&&MX.tipo.get(m.tipo);const tp=tp0&&!tp0.arch?tp0:null;const L=look.get(amb.id)||new Map();const C={};
    const add=(c,src)=>{if(!MX.cat.has(c)||MX.cat.get(c).arch)return;if(!C[c])C[c]={src,acts:L.get(c)||[]}};
    if(tp)(tp.acts||[]).forEach(c=>add(c,'tipo'));for(const c of L.keys())add(c,'look');for(const c of Object.keys(st))add(c,'man');
    for(const[c,o]of Object.entries(C)){const v=st[c];if(v&&MXS[v]){o.s=v;o.sug=false}else{o.sug=true;o.s=o.acts.length&&o.acts.every(id=>DONE.has(id))?'t':'p'}
      /* fut: tiene días de hoy en adelante en el lookahead. Alerta (warn): confirmada terminada / no aplica y aún programada.
         Sin programar (sp): pendiente (no en curso) sin ningún día de hoy en adelante */
      o.fut=o.acts.filter(id=>{const a=S.act.get(id);return a&&(a.days||[]).some(d=>d>=T0)});o.warn=!o.sug&&(o.s==='t'||o.s==='n')&&o.fut.length>0;o.sp=o.s==='p'&&!o.fut.length;
      /* dsc: Campo la marcó terminada (todas sus filas) pero la matriz confirmó otra cosa: el ingeniero decide (confirmar o reabrir) */
      o.dsc=!o.sug&&o.s!=='t'&&o.acts.length>0&&o.acts.every(id=>DONE.has(id))}
    out.set(amb.id,C)}
  MX.mc=out;MX.mcK=k;return out}

/* filas: pisos a la vista → sectores → ambientes (en su orden) */
function mxRows(){const R=[];for(const p of visPisos()){const secs=[...S.sec.values()].filter(s=>s.pisoId===p.id).sort((a,b)=>(a.order||0)-(b.order||0));
  for(const s of secs){const ambs=[...S.amb.values()].filter(a=>a.sectorId===s.id).sort((a,b)=>(a.order||0)-(b.order||0));if(ambs.length)R.push({p,s,ambs})}}return R}
/* subcontratistas elegidos en la matriz (varios; propio de esta pestaña, no cambia el filtro del lookahead) */
/* el SC ve solo su partida en la Matriz, el Recorrido y el Catálogo (oct 2026, decidido con el dueño) */
const mxMine=c=>!SCK()||!!(c&&myScsI().includes(c.sc));
const mxSel=()=>SCK()?myScsI():Array.isArray(U.mxSc)?U.mxSc.filter(id=>S.con.has(id)||[...MX.cat.values()].some(c=>c.sc===id)):[];
/* columnas: actividades del catálogo que aparecen en los ambientes a la vista (por subcontratista y orden del catálogo) */
function mxCols(rows,cells){const used=new Set();rows.forEach(r=>r.ambs.forEach(a=>Object.keys(cells.get(a.id)||{}).forEach(c=>used.add(c))));
  const scs=mxSel();const L=[...used].map(c=>MX.cat.get(c)).filter(c=>c&&(!scs.length||scs.includes(c.sc))&&(U.mxAll||c.cl!=='e'));
  const az=(a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name);
  /* orden por programación (oct 2026, decidido con el dueño): primero los SC con días programados en los ambientes a la vista de hoy a
     3 semanas (más días primero), luego los que tienen pendientes sin programar y al final los que ya no tienen nada que hacer ahí.
     Dentro de cada SC, primero sus actividades programadas. MX.ci: {catId:{pg:días, tier}} para marcar los encabezados. */
  const T0=todayIso(),T1=addD(T0,21);const ci={};const ids=new Set(L.map(c=>c.id));
  for(const r of rows)for(const a of r.ambs){const C=cells.get(a.id)||{};for(const[c,o]of Object.entries(C)){if(!ids.has(c))continue;const k=ci[c]=ci[c]||{pg:0,pend:0};
    if(o.s==='p'||o.s==='c')k.pend++;for(const id of o.acts||[]){const x=S.act.get(id);if(x)k.pg+=(x.days||[]).filter(d=>d>=T0&&d<=T1).length}}}
  const sc={};for(const c of L){const k=ci[c.id]||{pg:0,pend:0};const o=sc[c.sc]=sc[c.sc]||{pg:0,pend:0};o.pg+=k.pg;o.pend+=k.pend}
  for(const c of L){const o=sc[c.sc];(ci[c.id]=ci[c.id]||{pg:0,pend:0}).tier=o.pg>0?0:o.pend>0?1:2}
  MX.ci=ci;
  if(U.mxOrd==='az')return L.sort(az);
  return L.sort((a,b)=>{const A=sc[a.sc],B=sc[b.sc];return ci[a.id].tier-ci[b.id].tier||B.pg-A.pg||conOf(a.sc).name.localeCompare(conOf(b.sc).name)||a.sc.localeCompare(b.sc)
    ||((ci[b.id].pg>0)-(ci[a.id].pg>0))||(a.ord||0)-(b.ord||0)||a.name.localeCompare(b.name)})}

/* foto semanal elegida para comparar: {ambId:{catId:estado}} */
function mxCmpMap(){const f=MX.cmp&&MX.ver.get(MX.cmp);if(!f)return null;const o={};for(const[a,s]of Object.entries(f.a||{})){const m={};String(s).split(',').forEach(p=>{const[c,v0]=p.split(':');const v=v0&&v0.replace('?','');if(c&&v)m[c]=v});o[a]=m}return o}

function renderMat(main){ensureMx();ensureMver();
  const loaded=MX.ld.cat&&MX.ld.tipo&&MX.ld.amb;
  const acts=[];if(isAdmin)acts.push(`<label class="ib" title="Carga inicial del catálogo, tipos de ambiente y tipo de cada ambiente (archivo preparado)">⬆ Cargar catálogo<input type="file" id="mximp" accept=".json,application/json" hidden></label>`);
  if(mxCanEd()&&MX.cat.size&&(!U.mxV||U.mxV==='mat'))acts.push(`<button class="ib${MX.edit?' on':' pri'}" id="mxedit" title="${MX.edit?'Volver a consulta: desplazarse sin cambiar nada':'Habilitar seleccionar y marcar celdas'}">${MX.edit?'✓ Terminar edición':'✎ Editar'}</button>`);
  if(MX.ver.size&&(!U.mxV||U.mxV==='mat'))acts.push(`<button class="ib" id="mxfhist" title="Fotos guardadas: comparar${isAdmin?' o restablecer':''}">🕘 Fotos (${MX.ver.size})</button>`);
  if(mxEd()&&MX.cat.size)acts.push(`<button class="ib" id="mxfoto" title="Guarda el estado de hoy para compararlo la próxima semana">📸 Guardar foto semanal</button>`);
  const head=pageHead('Matriz de ambientes',`${U.piso?esc((S.pis.get(U.piso)||{}).name||''):'Todos los pisos'} · estado actual de cada actividad por ambiente`,acts.join(''));
  if(MX.err&&!MX.cat.size){main.innerHTML=`<div class="scroll"><div class="wrap">${head}<div class="callout">No se pudo leer la matriz (${esc(MX.err)}). Si recién se publicó esta versión, puede faltar instalar las reglas de seguridad.</div></div></div>`;mxWire(main);return}
  if(!loaded){main.innerHTML=`<div class="scroll"><div class="wrap">${head}<p class="note">Cargando la matriz…</p></div></div>`;mxWire(main);return}
  if(!MX.cat.size){main.innerHTML=`<div class="scroll"><div class="wrap">${head}<div class="callout">Todavía no hay catálogo de actividades.${isAdmin?' Usa «⬆ Cargar catálogo» con el archivo preparado (LPS911_matriz_inicial.json).':' El administrador debe cargarlo.'}</div></div></div>`;mxWire(main);return}
  if(U.mxV==='cat'){renderMxCat(main,head);return}
  if(U.mxV==='tipo'&&!SCK()){renderMxTipo(main,head);return}
  if(U.mxV==='rec'){renderMxRec(main,head);return}
  const cells=mxCells();let rows=mxRows();const cols=mxCols(rows,cells);
  /* con subcontratistas elegidos, solo los ambientes donde tienen algo (para llenar rápido) */
  if(mxSel().length){const ids=new Set(cols.map(c=>c.id));rows=rows.map(r=>({...r,ambs:r.ambs.filter(a=>Object.keys(cells.get(a.id)||{}).some(c=>ids.has(c)))})).filter(r=>r.ambs.length)}const cmp=mxCmpMap();const ed=mxEdG();
  /* totales de lo que está a la vista */
  const tot={p:0,c:0,t:0,n:0,sug:0,chg:0,chgT:0};const colT=cols.map(()=>({a:0,t:0}));
  const ambPct=new Map();
  for(const r of rows)for(const a of r.ambs){const C=cells.get(a.id)||{};let ap=0,tt=0;cols.forEach((c,i)=>{const o=C[c.id];if(!o)return;tot[o.s]++;if(o.sug)tot.sug++;if(o.s!=='n'){ap++;colT[i].a++;if(o.s==='t'){tt++;colT[i].t++}}
      if(cmp){const b=(cmp[a.id]||{})[c.id]||'';if(b!==o.s){tot.chg++;if(o.s==='t')tot.chgT++}}});ambPct.set(a.id,ap?tt/ap:null)}
  const apl=tot.p+tot.c+tot.t;const pc=x=>apl?Math.round(100*x/apl)+'%':'—';
  const unm=mxUnmapped();
  const scs=[...new Set([...MX.cat.values()].filter(c=>!c.arch).map(c=>c.sc))].map(id=>({id,n:conOf(id).name})).sort((a,b)=>a.n.localeCompare(b.n));
  const vers=[...MX.ver.values()].sort((a,b)=>(b.t||0)-(a.t||0));
  MX.helpH=`<p>Cada fila es un ambiente y cada columna una actividad del catálogo. La celda dice cómo está hoy esa actividad en ese ambiente: <b>pendiente</b>, <b>en curso</b>, <b>terminado</b> o <b>no aplica</b>.</p>
    <p>Las celdas con borde punteado las propone el sistema (del tipo de ambiente y del lookahead, terminadas según Campo) y nadie las ha confirmado. En el levantamiento semanal, selecciónalas y marca su estado real o pulsa <b>Validar</b>.</p>
    ${ed?'<p><b>Seleccionar:</b> arrastra sobre las celdas, Shift+clic amplía, clic en el nombre de una actividad o de un ambiente toma toda la columna o fila. Luego usa la barra de abajo o las teclas 1 Pendiente, 2 En curso, 3 Terminado, 0 No aplica, Enter Validar. Un clic sobre una celda vacía la agrega a ese ambiente.</p>':''}
    <p><b>Foto semanal:</b> guarda el estado de la obra. Elige una foto en «Comparar con» para ver qué avanzó desde entonces.</p>`;
  let h=`<div class="scroll mxscroll"><div class="wrap mxwrap">${mxHd(head,mxViewSeg()+`<div class="mxstat"><span class="mxst t"><i style="width:${apl?Math.round(100*tot.t/apl):0}%"></i></span><b>Terminado ${pc(tot.t)}</b> <small>${tot.t} de ${apl}</small><span class="mxdot">·</span>En curso <b>${pc(tot.c)}</b><span class="mxdot">·</span>Pendiente <b>${pc(tot.p)}</b><span class="mxdot">·</span>Sin validar <b>${tot.sug}</b>${cmp?`<span class="mxdot">·</span>Cambios desde la foto <b>${tot.chg}</b> <small>${tot.chgT} terminados</small>`:''}</div>`)}
   ${mxEd()&&typeof mxLogPend==='function'&&mxLogPend().length?`<div class="callout mxun">${mxLogPend().length} ${mxLogPend().length===1?'cambio':'cambios'} de los subcontratistas en la matriz por revisar. <button class="ib" id="mxlog">Revisar</button></div>`:''}
   ${mxEd()&&typeof mxRevList==='function'&&mxRevList().length?`<div class="callout mxun">${mxRevList().length} ${mxRevList().length===1?'actividad nueva agregada':'actividades nuevas agregadas'} por los subcontratistas desde el lookahead, por revisar. <button class="ib" data-mxv="cat">Revisar en el Catálogo</button></div>`:''}
   ${unm.length&&mxEd()?`<div class="callout mxun">${unm.length} ${unm.length===1?'nombre':'nombres'} del lookahead no ${unm.length===1?'está':'están'} en el catálogo (${unm.reduce((s,u)=>s+u.ids.length,0)} filas): no salen en la matriz. <button class="ib" id="mxmap">Asignar al catálogo…</button></div>`:''}
   <div class="fbar mxbar0">
    ${SCK()?'':`<button class="ib mxscdd${mxSel().length?' on':''}" id="mxscdd" aria-haspopup="menu" title="Clic: solo ese SC · Ctrl+clic: sumar o quitar">Subcontratistas: <b>${mxSel().length?(mxSel().length===1?esc(conOf(mxSel()[0]).name):mxSel().length+' elegidos'):'Todos'}</b> ▾</button>`}
    <span class="seg" role="group" aria-label="Actividades"><button data-mxall="0" class="${U.mxAll?'':'on'}" title="Solo las que se repiten por ambiente">Típicas</button><button data-mxall="1" class="${U.mxAll?'on':''}" title="Incluye entregables puntuales de un solo ambiente">Todas</button></span>
    <label class="mxord" title="Por programación: primero los SC con trabajo programado en estos ambientes de hoy a 3 semanas"><span class="fgl">Orden</span><select id="mxord" aria-label="Orden de las columnas"><option value="prog"${U.mxOrd==='az'?'':' selected'}>Por programación</option><option value="az"${U.mxOrd==='az'?' selected':''}>Alfabético</option></select></label>
    <span class="fgl">Comparar con</span><select id="mxcmp" aria-label="Comparar con una foto"><option value="">—</option>${vers.map(v=>`<option value="${esc(v.id)}"${MX.cmp===v.id?' selected':''}>${esc(fmtD(v.d))}${v.n?' · '+esc(v.n):''}</option>`).join('')}</select>
    <span class="fsp"></span>
    <span class="seg mxzm" role="group" aria-label="Tamaño de las celdas"><button data-mxz="-1" title="Más pequeño">−</button><button data-mxz="1" title="Más grande">+</button></span>
    <button class="ib" id="mxxls" title="Exportar a Excel lo que está a la vista (piso, filtros y orden)">⬇ Excel</button>
    <button class="ib" id="mxhelp" title="Cómo se usa la matriz" aria-label="Ayuda">ⓘ</button>
    <span class="mxleg">${['p','c','t','n'].map(s=>`<span><i class="mc s-${s}">${MXI[s]}</i>${MXS[s]}</span>`).join('')}<span><i class="mc s-p sug"></i>Sin validar</span>${cmp?'<span><i class="mc s-t chg">✓</i>Cambió</span>':''}</span>
   </div>`;
  if(!cols.length){h+=`<p class="note">No hay actividades del catálogo en ${U.piso?'este piso':'los pisos'} con este filtro.</p></div></div>`;main.innerHTML=h;mxWire(main);return}
  /* grupos de columnas por subcontratista */
  const PSC=typeof mxLogKeys==='function'?mxLogKeys():null;
  const grp=[];cols.forEach(c=>{const g=grp[grp.length-1];if(g&&g.sc===c.sc)g.n++;else grp.push({sc:c.sc,n:1})});
  const tipos=[...MX.tipo.values()].filter(t=>!t.arch).sort((a,b)=>(a.order||0)-(b.order||0)||a.name.localeCompare(b.name));
  const multi=visPisos().length>1;const NC=cols.length+3;
  h+=`<div class="mxbox" id="mxbox"><table class="mx mxz${mxZ()}${ed?' ed':''}" id="mxt"><thead>
   <tr class="mxg"><th class="mxa mxh0" rowspan="2">Ambiente</th><th class="mxtp" rowspan="2">Tipo</th><th class="mxpc" rowspan="2" title="Terminado de lo que aplica">%</th>${(()=>{let k=0;return grp.map(g=>{const c=conOf(g.sc);const i0=k;k+=g.n;return`<th colspan="${g.n}" class="mxgo${MX.ci&&cols[i0]&&MX.ci[cols[i0].id]&&MX.ci[cols[i0].id].tier===2?' mxdim':''}" data-mxgo="${i0}" style="--c:${esc(c.color)}" title="${esc(c.name)} · clic: ir a sus columnas"><span>${esc(c.name)}</span></th>`}).join('')})()}</tr>
   <tr class="mxn">${cols.map((c,i)=>`<th class="mxc${c.cl==='d'?' dsg':''}${MX.ci&&MX.ci[c.id]&&MX.ci[c.id].pg?' mxpg':''}" data-mxcol="${i}" style="--c:${esc(conOf(c.sc).color)}" title="${esc(c.name)} · ${esc(conOf(c.sc).name)} · ${MXCL[c.cl]||''}${ed?' (clic: seleccionar la columna)':''}"><span>${esc(c.name)}</span></th>`).join('')}</tr></thead><tbody>`;
  let ri=0;let lastP='';
  for(const r of rows){
    if(multi&&r.p.id!==lastP){h+=`<tr class="mxp"><th colspan="${NC}"><span class="mxsl">${esc(r.p.code)} · ${esc(r.p.name)}</span></th></tr>`;lastP=r.p.id}
    h+=`<tr class="mxs"><th colspan="${NC}"><span class="mxsl">${esc(r.s.code)} · ${esc(r.s.name)}</span></th></tr>`;
    for(const a of r.ambs){const C=cells.get(a.id)||{};const m=MX.amb.get(a.id)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);const p=ambPct.get(a.id);
      h+=`<tr data-mxr="${ri}" data-amb="${esc(a.id)}"><th class="mxa" data-mxrow="${ri}" title="${esc(a.code)} ${esc(a.name)}${ed?' (clic: seleccionar la fila)':''}"><b>${esc(a.code)}</b> ${esc(a.name)}</th>
       <td class="mxtp">${ed?`<select data-mxtipo="${esc(a.id)}" aria-label="Tipo de ${esc(a.name)}"><option value="">—</option>${tipos.map(t=>`<option value="${esc(t.id)}"${tp&&tp.id===t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select>`:esc(tp?tp.name:'—')}</td>
       <td class="mxpc">${p==null?'':Math.round(100*p)+'%'}</td>`;
      cols.forEach((c,ci)=>{const o=C[c.id];const k=a.id+'|'+c.id;const sel=MX.sel.has(k)?' sl':'';
        if(!o){h+=`<td class="mc x${sel}" data-k="${ci}"></td>`;return}
        let cl=`mc s-${o.s}${o.sug?' sug':''}${o.dsc?' dsc':''}${PSC&&PSC.has(k)?' scp':''}${sel}`;let tt=MXS[o.s]+(o.sug?' (sin validar)':'')+(o.dsc?' · Campo la marcó terminada':'');
        if(cmp){const b=(cmp[a.id]||{})[c.id]||'';if(b!==o.s){cl+=' chg';tt+=` · antes: ${b?MXS[b]:'no estaba'}`}}
        h+=`<td class="${cl}" data-k="${ci}" title="${esc(tt)}">${MXI[o.s]}</td>`});
      h+='</tr>';ri++}}
  h+=`</tbody><tfoot><tr><th class="mxa">Terminado</th><td class="mxtp"></td><td class="mxpc">${pc(tot.t)}</td>${colT.map(t=>`<td class="mxf">${t.a?Math.round(100*t.t/t.a)+'%':''}</td>`).join('')}</tr></tfoot></table></div>
   </div></div>${ed?mxSelBar():''}`;
  const sc=$('#mxbox');const keep=sc?{l:sc.scrollLeft,t:sc.scrollTop}:null;
  main.innerHTML=h;MX.view={rows,cols};
  if(keep){const b=$('#mxbox');if(b){b.scrollLeft=keep.l;b.scrollTop=keep.t}}
  mxFocusPaint()
  mxWire(main)}

/* barra de la selección (abajo) */
function mxSelBar(){const n=MX.sel.size;if(!n)return'';
  return`<div class="mxsb" id="mxsb" role="toolbar" aria-label="Celdas seleccionadas"><b>${n} ${n===1?'celda':'celdas'}</b>
   ${['p','c','t','n'].map((s,i)=>`<button class="ib" data-mxset="${s}" title="Tecla ${['1','2','3','0'][i]}"><i class="mc s-${s}">${MXI[s]}</i>${MXS[s]}</button>`).join('')}
   <button class="ib pri" data-mxset="ok" title="Confirma lo que propone el sistema (Enter)">✓ Validar</button><button class="ab" data-mxclr aria-label="Quitar la selección" title="Quitar la selección (Esc)">&times;</button></div>`}

/* nombres del lookahead (pisos a la vista) que no están en el catálogo */
function mxUnmapped(){const ali=mxAli();const vp=new Set(visPisos().map(p=>p.id));const m=new Map();
  for(const x of S.act.values()){const k=mnk(x.name);if(!k||ali.has(k)||!vp.has(pisoOfAmb(x.ambId)))continue;let e=m.get(k);if(!e)m.set(k,e={k,name:String(x.name).trim(),sc:x.sc,ids:[]});e.ids.push(x.id)}
  return[...m.values()].sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)||a.name.localeCompare(b.name))}

/* ---------- interacción ---------- */
function mxCellAt(td){const tr=td.closest('tr[data-amb]');if(!tr||!MX.view)return null;const c=MX.view.cols[+td.dataset.k];return c?{amb:tr.dataset.amb,r:+tr.dataset.mxr,ci:+td.dataset.k,cat:c.id}:null}
function mxRect(a,b){const S2=new Set();const ambs=[];MX.view.rows.forEach(r=>r.ambs.forEach(x=>ambs.push(x.id)));
  const r0=Math.min(a.r,b.r),r1=Math.max(a.r,b.r),c0=Math.min(a.ci,b.ci),c1=Math.max(a.ci,b.ci);
  for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)S2.add(ambs[r]+'|'+MX.view.cols[c].id);return S2}
function mxPaintSel(){const t=$('#mxt');if(!t)return;t.querySelectorAll('td.mc').forEach(td=>{const c=mxCellAt(td);td.classList.toggle('sl',!!c&&MX.sel.has(c.amb+'|'+c.cat))});
  const old=$('#mxsb');const html=mxSelBar();if(old)old.remove();if(html)document.querySelector('#main').insertAdjacentHTML('beforeend',html);mxWireBar()}
function mxWireBar(){const b=$('#mxsb');if(!b)return;b.onclick=e=>{const s=e.target.closest('[data-mxset]');if(s){mxApply(s.dataset.mxset);return}if(e.target.closest('[data-mxclr]')){MX.sel.clear();mxPaintSel()}}}
/* vista de escritorio (oct 2026): tamaño de celda (U.mxZ 0/1/2), tabla del alto de la pantalla, saltar a un SC, ayuda y SC en menús */
const mxZ=()=>{const z=+U.mxZ;return z>=0&&z<=2?z:1};
function mxFit(){const b=$('#mxbox');if(!b||!b.isConnected)return;const top=b.getBoundingClientRect().top;b.style.maxHeight=Math.max(240,innerHeight-top-14)+'px'}
addEventListener('resize',()=>{if(U.tab==='mat')mxFit()});
function mxGoCol(i){const b=$('#mxbox'),t=$('#mxt');if(!b||!t)return;const th=t.querySelector(`th[data-mxcol="${i}"]`);if(!th)return;
  const fix=[...t.querySelectorAll('thead .mxh0,thead th.mxtp,thead th.mxpc')].reduce((w,e)=>w+(e.offsetParent?e.offsetWidth:0),0);b.scrollTo({left:Math.max(0,th.offsetLeft-fix),behavior:'smooth'})}
function mxScMenu(btn){const scs=[...new Set([...MX.cat.values()].filter(c=>!c.arch).map(c=>c.sc))].map(id=>({id,n:conOf(id).name})).sort((a,b)=>a.n.localeCompare(b.n));const L=mxSel();
  openPop(btn,`<div class="ph">Subcontratistas</div><div class="ptx mu">Clic: solo ese · Ctrl+clic: sumar o quitar</div><div class="mxscl"><button data-mxsk=""${L.length?'':' class="on"'}>Todos</button>${scs.map(s=>`<button data-mxsk="${esc(s.id)}"${L.includes(s.id)?' class="on"':''} style="--c:${esc(conOf(s.id).color)}"><i></i>${esc(s.n)}${L.includes(s.id)?' ✓':''}</button>`).join('')}</div>`,{});
  const P_=$('#pop');if(P_)P_.onclick=e=>{const b=e.target.closest('[data-mxsk]');if(!b)return;const id=b.dataset.mxsk;let L=mxSel();
    L=!id?[]:(e.ctrlKey||e.metaKey||e.shiftKey)?(L.includes(id)?L.filter(x=>x!==id):[...L,id]):(L.length===1&&L[0]===id?[]:[id]);U.mxSc=L;saveUI();MX.sel.clear();
    if(!(e.ctrlKey||e.metaKey||e.shiftKey))closePop();render();if(e.ctrlKey||e.metaKey||e.shiftKey){const nb=$('#mxscdd');if(nb)mxScMenu(nb)}}}
function mxWire(main){mxWireV(main);
  const imp=$('#mximp');if(imp)imp.onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)mxImport(f)};
  const fb=$('#mxfoto');if(fb)fb.onclick=mxFoto;
  const fh=$('#mxfhist');if(fh)fh.onclick=()=>mxFotoHist();
  const mp=$('#mxmap');if(mp)mp.onclick=mxMapDlg;
  const lg=$('#mxlog');if(lg)lg.onclick=mxLogDlg;
  const sd=$('#mxscdd');if(sd)sd.onclick=()=>mxScMenu(sd);
  const xb=$('#mxxls');if(xb)xb.onclick=mxExport;
  const hb=$('#mxhelp');if(hb)hb.onclick=()=>openPop(hb,`<div class="ph">Cómo se usa la matriz</div><div class="mxhlp">${MX.helpH||''}</div>`,{});
  main.querySelectorAll('[data-mxz]').forEach(b=>b.onclick=()=>{U.mxZ=Math.max(0,Math.min(2,mxZ()+(+b.dataset.mxz)));saveUI();const t=$('#mxt');if(t){t.classList.remove('mxz0','mxz1','mxz2');t.classList.add('mxz'+mxZ())}});
  mxFit();
  const eb=$('#mxedit');if(eb)eb.onclick=()=>{MX.edit=!MX.edit;MX.sel.clear();closePop();render()};
  main.querySelectorAll('[data-mxsc]').forEach(b=>b.onclick=e=>{const id=b.dataset.mxsc;let L=mxSel();L=!id?[]:(e.ctrlKey||e.metaKey||e.shiftKey)?(L.includes(id)?L.filter(x=>x!==id):[...L,id]):(L.length===1&&L[0]===id?[]:[id]);U.mxSc=L;saveUI();MX.sel.clear();render()});
  main.querySelectorAll('[data-mxall]').forEach(b=>b.onclick=()=>{U.mxAll=b.dataset.mxall==='1';saveUI();MX.sel.clear();render()});
  const mo=$('#mxord');if(mo)mo.onchange=e=>{U.mxOrd=e.target.value;saveUI();MX.sel.clear();render()};
  const cm=$('#mxcmp');if(cm)cm.onchange=e=>{MX.cmp=e.target.value;render()};
  main.querySelectorAll('[data-mxtipo]').forEach(s=>s.onchange=()=>mxSetTipo(s.dataset.mxtipo,s.value));
  mxWireBar();
  const t=$('#mxt');if(!t)return;
  t.onclick=e=>{const go=e.target.closest('th[data-mxgo]');if(go){mxGoCol(+go.dataset.mxgo);return}const ch=e.target.closest('th[data-mxcol]'),rh=e.target.closest('th[data-mxrow]');if(!mxEdG()&&(ch||rh))return;
    if(!mxEdG()){const td=e.target.closest('td.mc');const c=td&&mxCellAt(td);if(c)mxInfo(td,c);return}
    if(ch){const ci=+ch.dataset.mxcol;const cat=MX.view.cols[ci].id;const cells=mxCells();const add=[];MX.view.rows.forEach(r=>r.ambs.forEach(a=>{if((cells.get(a.id)||{})[cat])add.push(a.id+'|'+cat)}));mxToggle(add,e);return}
    if(rh){const tr=rh.closest('tr[data-amb]');const C=mxCells().get(tr.dataset.amb)||{};mxToggle(MX.view.cols.filter(c=>C[c.id]).map(c=>tr.dataset.amb+'|'+c.id),e);return}};
  t.onpointerdown=e=>{const td=e.target.closest('td.mc');if(!td||e.button!==0)return;const c=mxCellAt(td);if(!c)return;
    if(!mxEdG())return; // consulta: el toque se atiende en onclick (así se puede desplazar)
    e.preventDefault();
    if(e.shiftKey&&MX.anchor){MX.sel=mxRect(MX.anchor,c);mxPaintSel();return}
    MX.drag={a:c,add:e.ctrlKey||e.metaKey,base:new Set(MX.sel)};MX.moved=false;MX.anchor=c;DRAGGING=true};
  t.onpointerover=e=>{if(!MX.drag)return;const td=e.target.closest('td.mc');if(!td)return;const c=mxCellAt(td);if(!c)return;
    if(c.amb===MX.drag.a.amb&&c.cat===MX.drag.a.cat&&!MX.moved)return;MX.moved=true;const R=mxRect(MX.drag.a,c);MX.sel=MX.drag.add?new Set([...MX.drag.base,...R]):R;mxPaintSel()}}
document.addEventListener('pointerup',e=>{if(!MX.drag)return;const d=MX.drag;MX.drag=null;DRAGGING=false;
  if(!MX.moved){const k=d.a.amb+'|'+d.a.cat;if(d.add){if(MX.sel.has(k))MX.sel.delete(k);else MX.sel.add(k);mxPaintSel();return}
    const td=document.querySelector(`#mxt tr[data-amb="${CSS.escape(d.a.amb)}"] td[data-k="${d.a.ci}"]`);MX.sel=new Set([k]);mxPaintSel();if(td)mxInfo(td,d.a);return}
  if(ready)requestRender()});
function mxToggle(keys,e){if(e.ctrlKey||e.metaKey||e.shiftKey)keys.forEach(k=>MX.sel.add(k));else{const all=keys.length&&keys.every(k=>MX.sel.has(k));MX.sel=all?new Set():new Set(keys)}mxPaintSel()}
document.addEventListener('keydown',e=>{if(U.tab!=='mat'||!MX.sel.size||!mxEdG())return;const a=document.activeElement;if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return;if(!$('#pop').hidden&&e.key!=='Escape')return;
  const m={'1':'p','2':'c','3':'t','0':'n',Enter:'ok'}[e.key];if(m){e.preventDefault();closePop();mxApply(m);return}if(e.key==='Escape'){MX.sel.clear();mxPaintSel()}});

/* ficha de una celda: de dónde sale, qué hay en el lookahead y (si edita) cambiar su estado */
function mxInfo(td,c){const cat=MX.cat.get(c.cat);const a=S.amb.get(c.amb);if(!cat||!a)return;const o=(mxCells().get(c.amb)||{})[c.cat];const ed=mxEdG();const scE=!mxEd()&&!!MX.edit&&typeof mxScCan==='function'&&mxScCan(cat);const hint=!MX.edit&&(mxEd()||(typeof mxScCan==='function'&&mxScCan(cat)));
  const m=MX.amb.get(c.amb)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);
  const src=!o?'No está en este ambiente.':o.src==='tipo'?`Del tipo de ambiente «${esc(tp?tp.name:'')}».`:o.src==='look'?'Del lookahead.':'Agregada a mano.';
  const L=(o&&o.acts||[]).map(id=>S.act.get(id)).filter(Boolean).map(x=>{const d=x.days||[];const dn=DONE.get(x.id);return`<div class="ptx">${esc(x.name)} · ${d.length?esc(fmtD(d[0]))+(d.length>1?'–'+esc(fmtD(d[d.length-1])):''):'sin días'}${dn?` · <b>terminada ${esc(fmtD(dn))}</b>`:''}</div>`}).join('');
  openPop(td,`<div class="ph">${esc(cat.name)}</div><div class="ptx">${esc(a.code)} ${esc(a.name)} · ${esc(conOf(cat.sc).name)}</div>
   <div class="ptx">${o?`<b>${MXS[o.s]}</b>${o.sug?' · propuesta del sistema, sin validar':''}`:''} ${src}</div>
   ${o&&o.dsc?`<div class="ptx">⚑ En Campo la marcaron <b>terminada</b> (${esc(o.acts.map(id=>fmtD(DONE.get(id))).filter(Boolean).join(', '))}), pero aquí dice «${MXS[o.s]}». Confirma Terminado o reábrela en el Lookahead.</div>${canDaily?'<button data-do="reo">Reabrir en el Lookahead (no está terminada)</button>':''}`:''}${L?'<hr><div class="ph">En el lookahead</div>'+L:''}
   ${typeof mxWhoHtml==='function'?mxWhoHtml(c.amb,c.cat):''}
   ${hint?'<hr><div class="ptx">Para cambiarla, toca <b>✎ Editar</b> arriba.</div>':''}
   ${scE?`<hr>${['p','c','t','n'].map(s=>`<button data-do="scs" data-s="${s}"${o&&!o.sug&&o.s===s?' class="on"':''}><i class="mc s-${s}">${MXI[s]}</i>${MXS[s]}</button>`).join('')}`:''}
   ${ed?`<hr>${['p','c','t','n'].map(s=>`<button data-do="s" data-s="${s}"${o&&!o.sug&&o.s===s?' class="on"':''}><i class="mc s-${s}">${MXI[s]}</i>${MXS[s]}</button>`).join('')}${o&&o.sug?'<button data-do="s" data-s="ok">✓ Validar como está</button>':''}${o&&o.src==='man'?'<button data-do="rm" class="danger">Quitar de este ambiente</button>':''}`:''}`,
   {reo:()=>{(o&&o.acts||[]).forEach(id=>reopenDone(id,true));toast('Reabierta en el Lookahead');render()},s:d=>{MX.sel=new Set([c.amb+'|'+c.cat]);mxApply(d.s)},rm:()=>mxRemove(c.amb,c.cat),scs:d=>mxScSet(c.amb,c.cat,d.s)})}
/* quita los días desde mañana (hoy ya está comprometido) de las filas del lookahead; pasa por apply: Deshacer, historial y días cerrados */
async function mxUnprogram(ids,name){if(!mxEd())return;const T=todayIso();const ops=[];let nd=0;
  for(const id of ids){const x=S.act.get(id);if(!x)continue;const keep=(x.days||[]).filter(d=>d<=T);const drop=(x.days||[]).filter(d=>d>T);if(!drop.length)continue;nd+=drop.length;
    const q={...(x.qty||{})};drop.forEach(d=>delete q[d]);const nx={...x,days:keep};if(x.qty)nx.qty=q;ops.push(op('acts',id,nx))}
  if(!ops.length){toast('Solo está programada hoy: hoy ya está comprometido y no se quita desde aquí.');return}
  if(!await uiAsk({title:'Quitar del lookahead',text:`«${name}»: se quitan ${nd} ${nd===1?'día':'días'} programados desde mañana en ${ops.length} ${ops.length===1?'fila':'filas'}. Lo de hoy y lo pasado no cambia. Queda en el historial y se puede deshacer.`,ok:'Quitar días',tone:'warn'}))return;
  apply(ops,`«${name}»: días desde mañana quitados (la matriz dice que ya no va)`)}

/* guarda estados: un documento por ambiente (set con merge, así dos personas pueden marcar celdas distintas del mismo ambiente a la vez) */
/* m.<cat> = quién cambió la celda por última vez ({by,n,t,sc?}); sirve para saber qué confirmó el ingeniero y qué cambió un SC */
function mxMeta(c,sc){const DEL=firebase.firestore.FieldValue.delete();const meta={by:me.email,n:me.name||'',t:NOW()};if(sc)meta.sc=true;const m={};
  for(const[k,v]of Object.entries(c))m[k]=v&&typeof v==='object'&&!Array.isArray(v)&&!MXS[v]?DEL:meta;return m}
async function mxWrite(byAmb,label,undo){const ps=[];const meta={by:me.email,n:me.name||'',t:NOW()};
  for(const[amb,c]of byAmb)ps.push(fcol('mamb').doc(amb).set({c,m:mxMeta(c),...meta},{merge:true}));
  try{await Promise.all(ps);if(undo)toast(label,'Deshacer',()=>mxWrite(undo,'Deshecho',null));else toast(label)}catch(e){toast('No se pudo guardar: '+(e&&e.code||e))}}
function mxApply(s){if(!mxEd()||!MX.sel.size)return;const cells=mxCells();const DEL=firebase.firestore.FieldValue.delete();const by=new Map(),un=new Map();let n=0;
  for(const k of MX.sel){const[amb,cat]=k.split('|');const o=(cells.get(amb)||{})[cat];if(s==='ok'&&!o)continue;const v=s==='ok'?o.s:s;
    const prev=((MX.amb.get(amb)||{}).c||{})[cat];if(prev===v)continue;
    if(!by.has(amb)){by.set(amb,{});un.set(amb,{})}by.get(amb)[cat]=v;un.get(amb)[cat]=prev===undefined?DEL:prev;n++}
  MX.sel.clear();if(!n){mxPaintSel();toast('No hay cambios que guardar.');return}
  mxWrite(by,s==='ok'?`${n} ${n===1?'celda validada':'celdas validadas'}`:`${n} ${n===1?'celda':'celdas'} → ${MXS[s]}`,un)}
function mxRemove(amb,cat){const DEL=firebase.firestore.FieldValue.delete();const prev=((MX.amb.get(amb)||{}).c||{})[cat];
  mxWrite(new Map([[amb,{[cat]:DEL}]]),'Actividad quitada del ambiente',prev?new Map([[amb,{[cat]:prev}]]):null)}
function mxSetTipo(amb,tipo){if(!mxEd())return;const prev=(MX.amb.get(amb)||{}).tipo||null;const t=tipo||null;if(prev===t)return;
  fcol('mamb').doc(amb).set({tipo:t,by:me.email,n:me.name||'',t:NOW()},{merge:true}).then(()=>toast('Tipo de ambiente guardado','Deshacer',()=>fcol('mamb').doc(amb).set({tipo:prev,by:me.email,n:me.name||'',t:NOW()},{merge:true}))).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}

/* foto semanal: el estado de toda la obra (todas las celdas, también las sin validar) en un documento compacto */
/* Foto semanal (oct 2026): '?' al final = celda sin validar (propuesta del sistema). Al guardar se abre el historial. */
function mxFotoData(){const a={};let n=0;for(const[amb,C]of mxCells()){const p=Object.entries(C).map(([c,o])=>c+':'+o.s+(o.sug?'?':''));if(p.length){a[amb]=p.join(',');n+=p.length}}return{a,n}}
async function mxFoto(){if(!mxEd())return;const{a,n}=mxFotoData();
  const ok=await uiAsk({title:'Guardar foto semanal',text:`Se guarda el estado de hoy (${fmtD(todayIso())}) de ${Object.keys(a).length} ambientes y ${n} celdas. Luego podrás compararla en «Comparar con».`,ok:'Guardar foto',tone:'info'});if(!ok)return;
  const id='f'+NOW();const doc={t:NOW(),d:todayIso(),w:curWeek(),by:me.email,n:me.name||'',a,v:2};try{await fcol('mver').doc(id).set(doc);if(!MX.ver.has(id)){MX.ver.set(id,{...doc,id});MX.v++}MX.cmp=id;render();toast('📸 Foto guardada · '+fmtD(todayIso()));mxFotoHist(id)}catch(e){toast('No se pudo guardar la foto: '+(e&&e.code||e))}}
/* resumen de una foto: celdas, terminadas (de lo que aplica) y sin validar */
function mxFotoSum(f){let n=0,t=0,ap=0,sug=0;for(const s of Object.values(f.a||{}))for(const p of String(s).split(',')){const[c,v0]=p.split(':');if(!c||!v0)continue;const v=v0.replace('?','');if(v0.endsWith('?'))sug++;n++;if(v!=='n'){ap++;if(v==='t')t++}}
  return{n,t,ap,sug,old:!(f.v>=2)}}
function mxFotoHist(nuevo){const L=[...MX.ver.values()].sort((a,b)=>(b.t||0)-(a.t||0));
  const row=f=>{const s=mxFotoSum(f);return`<div class="mxfh${f.id===nuevo?' nw':''}"><div><b>${esc(fmtD(f.d))}</b> · semana ${esc(String(f.w??''))}${f.id===nuevo?' <span class="pill ok">recién guardada</span>':''}${f.nota?` <span class="pill">${esc(f.nota)}</span>`:''}<br><small class="note">${esc(f.n||f.by||'')} · ${new Date(f.t).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})} · ${s.n} celdas · terminado ${s.ap?Math.round(100*s.t/s.ap):0}%${s.sug?` · ${s.sug} sin validar`:''}</small></div>
    <div class="mxfhb"><button class="ib" data-mxfc="${esc(f.id)}"${MX.cmp===f.id?' disabled':''}>${MX.cmp===f.id?'Comparando':'Comparar'}</button>${isAdmin?`<button class="ib" data-mxfr="${esc(f.id)}" title="Solo el administrador">Restablecer…</button>`:''}</div></div>`};
  lqModal(`<div class="lqtop"><b>Fotos semanales de la matriz</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Las últimas ${L.length} fotos. «Comparar» muestra qué cambió desde esa foto.${isAdmin?' «Restablecer» vuelve la matriz a como estaba en la foto (antes se guarda una foto del estado actual, así se puede volver).':''}</p>
   <div class="mxfhl">${L.map(row).join('')||'<p class="note">Todavía no hay fotos.</p>'}</div>
   <div class="lqbtns">${MX.cmp?'<button class="ib" data-mxfc="">Dejar de comparar</button>':''}<button class="ib pri" data-lqx>Cerrar</button></div>`,
   e=>{const c=e.target.closest('[data-mxfc]');if(c){MX.cmp=c.dataset.mxfc;lqClose();render();return}const r=e.target.closest('[data-mxfr]');if(r)mxFotoRestore(r.dataset.mxfr)})}
/* restablecer (solo administrador): las celdas confirmadas quedan como en la foto; lo sin validar de la foto vuelve a ser propuesta */
async function mxFotoRestore(id){if(!isAdmin)return;const f=MX.ver.get(id);if(!f)return;const s=mxFotoSum(f);
  const ok=await uiAsk({title:`Restablecer la matriz al ${fmtD(f.d)}`,text:`Las celdas vuelven a como estaban en esa foto (${s.n} celdas). Lo marcado después se reemplaza. Antes se guarda una foto del estado actual para poder volver.`,list:s.old?['Esta foto es anterior a que se distinguiera lo sin validar: todas sus celdas quedarán como confirmadas.']:[],ok:'Restablecer',tone:'danger'});if(!ok)return;
  const DEL=firebase.firestore.FieldValue.delete();const tgt=new Map();
  for(const[amb,str]of Object.entries(f.a||{})){const m={};for(const p of String(str).split(',')){const[c,v0]=p.split(':');if(!c||!v0||v0.endsWith('?'))continue;if(MXS[v0])m[c]=v0}tgt.set(amb,m)}
  const by=new Map(),un=new Map();const ambs=new Set([...tgt.keys(),...[...MX.amb.entries()].filter(([,m])=>m&&m.c&&Object.keys(m.c).length).map(([k])=>k)]);
  for(const amb of ambs){const cur=(MX.amb.get(amb)||{}).c||{};const t=tgt.get(amb)||{};const ch={},u={};
    for(const[c,v]of Object.entries(t))if(cur[c]!==v){ch[c]=v;u[c]=cur[c]===undefined?DEL:cur[c]}
    for(const[c,v]of Object.entries(cur))if(!(c in t)){ch[c]=DEL;u[c]=v}
    if(Object.keys(ch).length){by.set(amb,ch);un.set(amb,u)}}
  if(!by.size){toast('La matriz ya está igual que en esa foto');return}
  const bk=mxFotoData();try{await fcol('mver').doc('f'+NOW()).set({t:NOW(),d:todayIso(),w:curWeek(),by:me.email,n:me.name||'',a:bk.a,v:2,nota:'antes de restablecer'})}catch(e){toast('No se pudo guardar la foto de respaldo: '+(e&&e.code||e));return}
  lqClose();await mxWrite(by,`Matriz restablecida al ${fmtD(f.d)} (${by.size} ambientes)`,un);render()}

/* Exportar la matriz a Excel (oct 2026): lo que está a la vista (piso, filtros, orden). Hoja «Matriz» con colores por estado
   (sin validar en cursiva gris) y hoja «Lista» plana para filtrar. Usa xlsx-js-style (loadXlsx de exportes.js). */
async function mxExport(){const V=MX.view;if(!V||!V.cols||!V.cols.length){toast('No hay columnas para exportar con este filtro.');return}
  try{await loadXlsx();const X=window.XLSX;const p=P();const cells=mxCells();const{rows,cols}=V;
    const B={style:'thin',color:{rgb:'C9CED6'}};const bd={top:B,bottom:B,left:B,right:B};
    const FILL={t:'D8F0DF',c:'FCEBC8',p:'FFFFFF',n:'E6E8EB'};const IC={t:'✓',c:'◐',p:'○',n:'–'};
    const hx=c=>String(conOf(c).color||'#8C959F').replace('#','').toUpperCase().padStart(6,'0');
    const F=['Piso','Sector','Código','Ambiente','Tipo','% terminado'];const nF=F.length;
    const aoa=[[...F.map(()=>''),...cols.map(c=>conOf(c.sc).name)],[...F,...cols.map(c=>c.name)]];const st=[];const merges=[];
    let k=0;while(k<cols.length){let j=k;while(j+1<cols.length&&cols[j+1].sc===cols[k].sc)j++;if(j>k)merges.push({s:{r:0,c:nF+k},e:{r:0,c:nF+j}});k=j+1}
    const lista=[['Piso','Sector','Código','Ambiente','Tipo','Subcontratista','Actividad','Estado','Validado','Último cambio']];
    const colT=cols.map(()=>({a:0,t:0}));
    for(const r of rows)for(const a of r.ambs){const C=cells.get(a.id)||{};const m=MX.amb.get(a.id)||{};const tp=m.tipo&&MX.tipo.get(m.tipo);let ap=0,tt=0;
      const line=[r.p.code,r.s.code+' · '+r.s.name,a.code,a.name,tp?tp.name:'',null];const rs=[];
      cols.forEach((c,i)=>{const o=C[c.id];if(!o){line.push('');rs.push(null);return}line.push(IC[o.s]||'');rs.push(o);
        if(o.s!=='n'){ap++;colT[i].a++;if(o.s==='t'){tt++;colT[i].t++}}
        const who=(m.m||{})[c.id];lista.push([r.p.code,r.s.code+' · '+r.s.name,a.code,a.name,tp?tp.name:'',conOf(c.sc).name,c.name,MXS[o.s],o.sug?'No (propuesta del sistema)':'Sí',who?`${who.n||who.by||''} ${who.t?new Date(who.t).toLocaleDateString('es-PE'):''}`.trim():''])});
      line[5]=ap?tt/ap:null;aoa.push(line);st.push(rs)}
    aoa.push(['Terminado','','','','',null,...colT.map(t=>t.a?t.t/t.a:null)]);
    const ws=X.utils.aoa_to_sheet(aoa);ws['!merges']=merges;
    ws['!cols']=[{wch:6},{wch:20},{wch:8},{wch:30},{wch:16},{wch:9},...cols.map(()=>({wch:4.5}))];
    ws['!rows']=[{hpt:18},{hpt:150}];ws['!freeze']={xSplit:nF,ySplit:2};ws['!views']=[{state:'frozen',xSplit:nF,ySplit:2}];
    const set=(r,c,s)=>{const key=X.utils.encode_cell({r,c});if(!ws[key])ws[key]={t:'s',v:''};ws[key].s=s};
    F.forEach((_,c)=>set(1,c,{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F3A4D'}},alignment:{vertical:'bottom',wrapText:true},border:bd}));
    cols.forEach((c,i)=>{set(0,nF+i,{font:{bold:true,sz:9,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:hx(c.sc)}},alignment:{horizontal:'left'},border:bd});
      set(1,nF+i,{font:{sz:9},alignment:{textRotation:90,vertical:'bottom',horizontal:'center',wrapText:false},border:{...bd,bottom:{style:'medium',color:{rgb:hx(c.sc)}}}})});
    st.forEach((rs,ri)=>{const r=ri+2;for(let c=0;c<nF;c++)set(r,c,{font:{sz:10},border:bd,...(c===5?{numFmt:'0%',alignment:{horizontal:'right'}}:{})});
      rs.forEach((o,i)=>set(r,nF+i,o?{font:{sz:11,bold:!o.sug,italic:!!o.sug,color:{rgb:o.sug?'8C959F':o.s==='t'?'2E7D4F':o.s==='c'?'9A6A12':'333333'}},fill:{fgColor:{rgb:o.sug?'F7F7F8':FILL[o.s]}},alignment:{horizontal:'center',vertical:'center'},border:bd}:{fill:{patternType:'gray125'},border:bd}))});
    const lr=aoa.length-1;for(let c=0;c<nF+cols.length;c++)set(lr,c,{font:{bold:true,sz:9},fill:{fgColor:{rgb:'EEF1F4'}},border:bd,...(c>=5?{numFmt:'0%',alignment:{horizontal:'center'}}:{})});
    const ws2=X.utils.aoa_to_sheet(lista);ws2['!cols']=[{wch:6},{wch:20},{wch:8},{wch:30},{wch:16},{wch:20},{wch:36},{wch:12},{wch:24},{wch:22}];ws2['!autofilter']={ref:X.utils.encode_range({s:{r:0,c:0},e:{r:lista.length-1,c:9}})};
    for(let c=0;c<10;c++){const key=X.utils.encode_cell({r:0,c});ws2[key].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F3A4D'}}}}
    const ley=[['Matriz de ambientes'],[(p.name||'')+' · '+(U.piso?(S.pis.get(U.piso)||{}).name||'':'Todos los pisos')],['Exportado el '+fmtD(todayIso())+' por '+(me.name||me.email)],[''],['Símbolo','Estado'],...['p','c','t','n'].map(s=>[IC[s],MXS[s]]),['(cursiva gris)','Sin validar: propuesta del sistema, nadie la confirmó']];
    const ws3=X.utils.aoa_to_sheet(ley);ws3['!cols']=[{wch:16},{wch:50}];
    const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Matriz');X.utils.book_append_sheet(wb,ws2,'Lista');X.utils.book_append_sheet(wb,ws3,'Leyenda');
    const buf=X.write(wb,{type:'array',bookType:'xlsx'});
    saveBlob(`${p.code||'LPS'}_Matriz_${U.piso?(S.pis.get(U.piso)?.code||'')+'_':''}${todayIso()}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Matriz exportada a Excel')}
  catch(e){toast('No se pudo exportar: '+(e&&e.message||e))}}

/* asignar al catálogo los nombres del lookahead que no están (agrega el alias a la actividad elegida) */
function mxMapDlg(){if(!mxEd())return;const L=mxUnmapped();if(!L.length)return;
  const cats=[...MX.cat.values()].filter(c=>!c.arch).sort((a,b)=>a.name.localeCompare(b.name));
  const opts=sc=>{const mine=cats.filter(c=>c.sc===sc),oth=cats.filter(c=>c.sc!==sc);return`<option value="">— elegir —</option>${mine.length?`<optgroup label="${esc(conOf(sc).name)}">${mine.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`:''}<optgroup label="Otros subcontratistas">${oth.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(conOf(c.sc).name)}</option>`).join('')}</optgroup>`};
  lqModal(`<div class="lqtop"><b>Nombres sin catálogo</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <p class="note">Elige a qué actividad del catálogo corresponde cada nombre. Desde ese momento esas filas del lookahead salen en la matriz. No cambia nada del lookahead.</p>
   <div class="mxml">${L.map((u,i)=>`<div class="mxmr"><span><b>${esc(u.name)}</b><small>${esc(conOf(u.sc).name)} · ${u.ids.length} ${u.ids.length===1?'fila':'filas'}</small></span><select data-mxm="${i}">${opts(u.sc)}</select></div>`).join('')}</div>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="mxmok">Guardar</button></div>`,
   async e=>{if(!e.target.closest('#mxmok'))return;const AU=firebase.firestore.FieldValue.arrayUnion;const by=new Map();
     document.querySelectorAll('[data-mxm]').forEach(s=>{if(!s.value)return;const u=L[+s.dataset.mxm];if(!by.has(s.value))by.set(s.value,[]);by.get(s.value).push(u.k)});
     if(!by.size){lqClose();return}
     try{await Promise.all([...by].map(([c,ks])=>fcol('mcat').doc(c).update({al:AU(...ks)})));lqClose();toast(`${[...by.values()].flat().length} nombres asignados`)}catch(err){toast('No se pudo guardar: '+(err&&err.code||err))}})}

/* carga inicial (solo administrador): crea lo que no existe; nunca reemplaza ni borra lo que ya está */
async function mxImport(file){if(!isAdmin)return;let d;try{d=JSON.parse(await file.text())}catch(e){toast('El archivo no es válido.');return}
  if(!d||d.formato!=='lps911-matriz-v1'||!d.mcat){toast('Este archivo no es una carga de la matriz (formato lps911-matriz-v1).');return}
  const plan=[];const cnt={mcat:0,mtipo:0,mamb:0,skip:0,noAmb:0};
  for(const[id,v]of Object.entries(d.mcat||{})){if(MX.cat.has(id)){cnt.skip++;continue}plan.push(['mcat',id,{...v,by:me.email,t:NOW()}]);cnt.mcat++}
  for(const[id,v]of Object.entries(d.mtipo||{})){if(MX.tipo.has(id)){cnt.skip++;continue}plan.push(['mtipo',id,{...v,by:me.email,t:NOW()}]);cnt.mtipo++}
  for(const[id,v]of Object.entries(d.mamb||{})){if(!S.amb.has(id)&&!ARCH.amb.has(id)){cnt.noAmb++;continue}const cur=MX.amb.get(id);if(cur&&cur.tipo!==undefined){cnt.skip++;continue}if(!v.tipo)continue;plan.push(['mamb',id,{tipo:v.tipo,by:me.email,t:NOW()}]);cnt.mamb++}
  if(!plan.length){toast('No hay nada nuevo que cargar: todo ya existe.');return}
  const ok=await uiAsk({title:'Cargar catálogo de la matriz',html:`<p>${esc(d.fuente||'')}</p><ul><li>${cnt.mcat} actividades del catálogo</li><li>${cnt.mtipo} tipos de ambiente</li><li>${cnt.mamb} ambientes con su tipo</li></ul>${cnt.skip?`<p>${cnt.skip} ya existen y no se tocan.</p>`:''}${cnt.noAmb?`<p>${cnt.noAmb} ambientes del archivo no existen en esta obra (se omiten).</p>`:''}<p>Solo crea datos nuevos de la matriz. No cambia el lookahead ni nada de lo que ya está.</p>`,ok:'Cargar',tone:'info'});if(!ok)return;
  try{for(let i=0;i<plan.length;i+=400){const b=db.batch();plan.slice(i,i+400).forEach(([c,id,v])=>b.set(fcol(c).doc(id),v,{merge:true}));await b.commit()}toast('Catálogo cargado')}catch(e){toast('No se pudo cargar: '+(e&&e.code||e))}}

/* resaltado temporal de una celda (fila + columna) al llegar desde el Lookahead (MX.focus, mxGoCell). Sobrevive a los redibujos
   de esos 3 s; al vencer se quita solo */
function mxFocusPaint(){const f=MX.focus;if(!f)return;const left=f.until-performance.now();if(left<=0){MX.focus=null;return}
  const t=$('#mxt');if(!t||!MX.view)return;const ci=MX.view.cols.findIndex(c=>c.id===f.cat);const tr=t.querySelector(`tr[data-amb="${CSS.escape(f.amb)}"]`);
  if(tr){tr.classList.add('mxhl');}if(ci>=0){const h=t.querySelector(`th[data-mxcol="${ci}"]`);if(h)h.classList.add('mxhl');t.querySelectorAll(`td[data-k="${ci}"]`).forEach(td=>td.classList.add('mxhlc'))}
  const cell=tr&&ci>=0?tr.querySelector(`td[data-k="${ci}"]`):null;if(cell){cell.classList.add('mxhlx');if(!f.scrolled){f.scrolled=true;const b=$('#mxbox');if(b){const br=b.getBoundingClientRect(),cr=cell.getBoundingClientRect();b.scrollTop+=cr.top-br.top-b.clientHeight/2+cr.height/2;b.scrollLeft+=cr.left-br.left-b.clientWidth/2+cr.width/2}}}
  clearTimeout(MX.focusT);MX.focusT=setTimeout(()=>{MX.focus=null;document.querySelectorAll('#mxt .mxhl,#mxt .mxhlc,#mxt .mxhlx').forEach(e=>e.classList.remove('mxhl','mxhlc','mxhlx'))},left)}
