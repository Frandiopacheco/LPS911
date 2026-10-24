"use strict";
/* LPS 911 · Hitos de inicio y de fin (P1, oct 2026, decidido con el dueño en la revisión de conformidad con el Last Planner).
   Para saber si el lookahead es realista: una lista corta de fechas que el lookahead debe respetar.
   - Inicio («ini»): desde esa fecha recién se puede empezar algo (p. ej. llegada de equipos importados).
   - Fin («fin»): fecha necesaria o contractual; lo que corresponda debe terminar antes.
   Sin vinculación a actividades (decidido con el dueño): la revisión contra el hito es MANUAL. Se ven como rombo en la cabecera
   del día del Lookahead (verde inicio, rojo fin) y una línea tenue en la grilla; píldora «◆ Hitos» con la lista.
   Colección `hitos/{id}`: {n, tipo:'ini'|'fin', d, d0 (fecha original), piso ('' = toda la obra), h:[{from,to,by,t}] (cambios de
   fecha), st:'open'|'done', real (fecha real al cerrarlo), by, bn, t, arch?}. Crean y editan: administrador, editores y el área de
   apoyo «Planificación» (rol area con área que contiene «Planificación»; no edita el lookahead). Todos los de LPS los ven.
   Eliminar = archivar. El hito corto por ambiente («FC», ambientes.hito) es otra cosa: hitos internos de los ingenieros, sin cambios. */
const HIT=new Map();let hitUn=null,HITV=0;
function ensureHitos(){if(typeof db==='undefined'||!db||hitUn||(typeof TAR_ONLY==='function'&&TAR_ONLY()))return;
  hitUn=fcol('hitos').onSnapshot(sn=>{HIT.clear();sn.docs.forEach(d=>HIT.set(d.id,{...d.data(),id:d.id}));HITV++;if(U.tab==='look'||U.tab==='cli'||U.tab==='pull')requestRender()},
    e=>{console.warn('hitos',e&&e.code);hitUn=null})}
/** área de apoyo «Planificación» (el planner): gestiona hitos; no edita el lookahead */
const isPlanArea=()=>!!me&&me.role==='area'&&/planific/i.test(me.area||'');
/** ¿puede crear o editar hitos aquí? (no en modo propuesta del SC, versión cliente ni versión guardada) */
const canHito=()=>!!me&&(isAdmin||me.role==='editor'||isPlanArea())&&!(typeof PM==='function'&&PM())&&!U.cliv&&!(U.ver&&U.verMode==='ver');
const HIT_T={ini:{t:'Inicio',l:'desde aquí recién se puede empezar',c:'hini'},fin:{t:'Fin',l:'hay que terminar antes',c:'hfin'}};
/** hitos a la vista: los de toda la obra más los del piso elegido arriba (sin piso elegido, todos) */
function hitVis(){const pid=U.piso||'';return[...HIT.values()].filter(h=>!h.arch&&h.d&&(!pid||!h.piso||h.piso===pid)).sort((a,b)=>a.d.localeCompare(b.d)||String(a.n).localeCompare(String(b.n)))}
let HITD={k:'',m:null};
/** índice día → hitos a la vista (se rehace si cambian los hitos o el piso) */
function hitByDay(){const k=HITV+'|'+(U.piso||'');if(HITD.k===k&&HITD.m)return HITD.m;const m=new Map();hitVis().forEach(h=>{const L=m.get(h.d)||[];L.push(h);m.set(h.d,L)});HITD={k,m};return m}
const hitPiso=h=>h.piso?(S.pis.get(h.piso)?.code||'Piso')+' · '+(S.pis.get(h.piso)?.name||''):'Toda la obra';
/** clases de la columna del día (línea tenue): se calculan una vez por dibujo en el DI del Lookahead */
function hitDayCls(d){const L=hitByDay().get(d);if(!L)return'';const o=L.filter(h=>h.st!=='done');return(o.some(h=>h.tipo==='fin')?' hlf':'')+(o.some(h=>h.tipo==='ini')?' hli':'')}
/** rombos en la cabecera del día */
function hitMark(d){const L=hitByDay().get(d);if(!L)return'';const T=L.map(h=>`${HIT_T[h.tipo]?.t||'Hito'}: ${h.n}${h.st==='done'?' (cerrado)':''}`).join('\n');
  const tps=[...new Set(L.map(h=>h.tipo))];return`<span class="hmk" data-hito="${d}" role="button" aria-label="Hitos del ${fmtD(d)}" title="${esc(T)}">${tps.map(t=>`<i class="${HIT_T[t]?.c||''}${L.every(h=>h.tipo!==t||h.st==='done')?' hdone':''}"></i>`).join('')}</span>`}
/** píldora de la barra del Lookahead */
function hitPillHtml(){const L=hitVis();const op=L.filter(h=>h.st!=='done');return L.length||canHito()?`<button class="ib hpill" data-hitlist="1" title="Hitos de inicio y de fin">◆ Hitos${op.length?` <b>${op.length}</b>`:''}</button>`:''}
const hitDays=d=>{const t=todayIso();if(d===t)return'hoy';const n=typeof wdist==='function'?(d>t?wdist(t,d):-wdist(d,t)):0;return d>t?`faltan ${n} día${n===1?'':'s'} hábil${n===1?'':'es'}`:`hace ${-n} día${n===-1?'':'s'} hábil${n===-1?'':'es'}`};
function hitRowHtml(h,go){const T=HIT_T[h.tipo]||HIT_T.fin;const mv=(h.h||[]).length;
  return`<div class="hrow${h.st==='done'?' done':''}"><i class="hdot ${T.c}"></i><div class="hrt"><b>${esc(h.n||'(sin nombre)')}</b><small>${T.t} · ${fmtD(h.d)} · ${esc(hitPiso(h))}${h.st==='done'?` · cerrado${h.real?' el '+fmtD(h.real):''}`:' · '+hitDays(h.d)}${mv?` · movido ${mv} vez${mv>1?'es':''} (original ${fmtD(h.d0)})`:''}</small></div>${go?`<button data-do="go_${esc(h.id)}" title="Ir a la semana del hito">Ir</button>`:''}</div>`}
/** lista de hitos (píldora de la barra) */
function hitListPop(btn){ensureHitos();const L=hitVis();const H={};
  L.forEach(h=>{H['go_'+h.id]=()=>{U.week=weekOf(h.d);U.wkF=0;saveUI();requestRender()};if(canHito())H['ed_'+h.id]=()=>hitEdit(btn,h.id)});
  if(canHito())H.add=()=>hitEdit(btn,null,todayIso());
  openPop(btn,`<div class="ph">Hitos${U.piso?' · '+esc(S.pis.get(U.piso)?.code||''):''}</div>${L.length?`<div class="hlist">${L.map(h=>hitRowHtml(h,true)+(canHito()?`<button class="hed" data-do="ed_${esc(h.id)}">Editar «${esc(h.n||'')}»…</button>`:'')).join('')}</div>`:'<div class="ptx">Todavía no hay hitos. Agrega uno con clic derecho en la cabecera de un día (en tablet, mantenla presionada).</div>'}
    <div class="ptx">La revisión contra cada hito es manual: el rombo y la línea en la grilla marcan el día.</div>${canHito()?'<button data-do="add">◆ Agregar hito…</button>':''}`,H)}
/** ficha de los hitos de un día (tocar el rombo de la cabecera) */
function hitDayPop(anchor,d){const L=hitByDay().get(d)||[];if(!L.length)return;const ed=canHito();const H={};
  L.forEach(h=>{if(!ed)return;H['ed_'+h.id]=()=>hitEdit(anchor,h.id);H['st_'+h.id]=()=>hitSetSt(h.id,h.st==='done'?'open':'done');H['ar_'+h.id]=()=>hitArch(h.id)});
  if(ed)H.add=()=>hitEdit(anchor,null,d);
  openPop(anchor,`<div class="ph">Hitos del ${fmtD(d)}</div>${L.map(h=>`${hitRowHtml(h,false)}${(h.h||[]).length?`<div class="ptx hhist">${h.h.slice(-4).map(o=>`${fmtD(o.from)} → ${fmtD(o.to)} · ${esc(o.n||o.by||'')}`).join('<br>')}</div>`:''}${ed?`<button data-do="ed_${esc(h.id)}">Editar…</button><button data-do="st_${esc(h.id)}">${h.st==='done'?'Reabrir':h.tipo==='ini'?'✓ Ya llegó (cerrar)':'✓ Cumplido (cerrar)'}</button><button data-do="ar_${esc(h.id)}">Archivar</button>`:''}`).join('<hr>')}${ed?'<hr><button data-do="add">◆ Agregar otro hito este día…</button>':''}`,H)}
/** crear (id null, en el día d) o editar un hito */
function hitEdit(anchor,id,d){if(!canHito()){toast('Los hitos los crean el administrador, los ingenieros y Planificación.');return}
  const h=id?HIT.get(id):null;if(id&&!h)return;const day=h?h.d:d;
  const ps=typeof pisos==='function'?pisos():[];const pv=h?(h.piso||''):(U.piso||'');
  openPop(anchor,`<div class="ph">${h?'Editar hito':'Nuevo hito · '+fmtD(day)}</div><div class="hform">
    <label>Nombre<input class="tin" id="hitn" maxlength="60" value="${esc(h?h.n||'':'')}" placeholder="p. ej. Llegan las UMA importadas"></label>
    <label>Tipo<select class="tin" id="hitt"><option value="ini"${h&&h.tipo==='ini'?' selected':''}>Inicio: ${HIT_T.ini.l}</option><option value="fin"${!h||h.tipo==='fin'?' selected':''}>Fin: ${HIT_T.fin.l}</option></select></label>
    <label>Alcance<select class="tin" id="hitp"><option value="">Toda la obra</option>${ps.map(p=>`<option value="${esc(p.id)}"${p.id===pv?' selected':''}>${esc(p.code)} · ${esc(p.name||'')}</option>`).join('')}</select></label>
    <label>Fecha<input class="tin" type="date" id="hitd" value="${esc(day)}"></label>
    ${h&&h.st==='done'?`<label>Fecha real<input class="tin" type="date" id="hitr" value="${esc(h.real||'')}"></label>`:''}
    </div><button class="pri" data-do="save">${h?'Guardar cambios':'Agregar hito'}</button>`,{save:()=>hitSave(id)});
  setTimeout(()=>{const n=$('#hitn');if(n){n.focus();n.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const b=pop.querySelector('[data-do="save"]');if(b)b.click()}})}},0)}
function hitSave(id){const v=k=>(($('#'+k)||{}).value||'').trim();const n=v('hitn').slice(0,60),tipo=v('hitt')==='ini'?'ini':'fin',piso=v('hitp'),d=v('hitd');
  if(!n){toast('Ponle un nombre al hito.');return}if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){toast('Elige la fecha del hito.');return}
  const who={by:me.email||'',n:me.name||me.email||''};const t=NOW();
  if(!id){const ref=fcol('hitos').doc();ref.set({n,tipo,d,d0:d,piso,h:[],st:'open',real:null,by:who.by,bn:who.n,t}).then(()=>toast(`Hito «${n}» agregado`)).catch(hitErrToast);return}
  const h=HIT.get(id);if(!h)return;const o={n,tipo,piso,ts:t,eb:who.by};
  if(d!==h.d){o.d=d;o.h=[...(h.h||[]),{from:h.d,to:d,by:who.by,n:who.n,t}]}
  if(h.st==='done'){const r=v('hitr');if(/^\d{4}-\d{2}-\d{2}$/.test(r))o.real=r}
  fcol('hitos').doc(id).update(o).then(()=>toast(d!==h.d?`Hito movido al ${fmtD(d)} (queda el historial)`:'Hito guardado')).catch(hitErrToast)}
function hitSetSt(id,st){const h=HIT.get(id);if(!h||!canHito())return;fcol('hitos').doc(id).update({st,real:st==='done'?todayIso():null,ts:NOW(),eb:me.email||''})
  .then(()=>toast(st==='done'?`«${h.n}» cerrado hoy (puedes corregir la fecha real en Editar)`:`«${h.n}» reabierto`)).catch(hitErrToast)}
async function hitArch(id){const h=HIT.get(id);if(!h||!canHito())return;
  if(!await uiAsk({title:`¿Archivar el hito «${h.n}»?`,text:'Deja de verse en el Lookahead. Queda guardado en la base (no se borra).',ok:'Archivar',tone:'warn'}))return;
  fcol('hitos').doc(id).update({arch:{t:NOW(),by:me.email||'',n:me.name||''}}).then(()=>toast('Hito archivado')).catch(hitErrToast)}
function hitErrToast(e){toast('No se pudo guardar el hito: '+(e&&e.code==='permission-denied'?'no tienes permiso (o faltan publicar las reglas nuevas)':(e&&(e.code||e.message))||'error'))}
/** Sesión pull: hitos del lookahead que se pueden traer a la sesión (los del piso de la sesión o de toda la obra, abiertos) */
function hitForPull(pid,used){return[...HIT.values()].filter(h=>!h.arch&&h.st!=='done'&&h.d&&(!h.piso||h.piso===pid)&&!used.has(h.id)).sort((a,b)=>a.d.localeCompare(b.d))}
