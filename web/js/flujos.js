"use strict";
/* LPS 911 · Revisión de flujos por ambiente (P4, oct 2026, decidido con el dueño en la revisión de conformidad con el Last Planner).
   Una actividad solo se puede ejecutar si le llegan todos sus flujos (Koskela). Cuando un ambiente con trabajo de un SC entra a la
   ventana de revisión (por defecto la semana 2 del lookahead = la semana siguiente; Configuración › Restricciones, 2 a 4), aparece
   «Por revisar» para ese SC y para los ingenieros. Se revisan 8 flujos: «Listo» con un toque, o el flujo que falla crea la
   restricción con su tipo ya puesto. El sistema sugiere «posibles restricciones» con lo que ya sabe (tren de la Matriz, liberaciones
   críticas de Calidad, otro SC en el mismo ambiente y días, ETO, histograma de personal); quien revisa confirma o descarta.
   Colección frev/{n}_{amb}_{sc}: {n, amb, sc, pid, f:{flujo:'ok'|'res'}, st:'ok'|'res', by, bn, t}. Cada tipo de restricción se
   asigna a un flujo (P().restrFlow; sin asignar, por palabras del nombre). Solo informa y registra: no bloquea nada. */
const FLUJ=[['info','Información','¿Planos, ETO y consultas resueltas?'],['mat','Materiales','¿El material está en obra o llega a tiempo?'],
  ['mo','Mano de obra','¿Tiene la gente necesaria?'],['equ','Equipos y herramientas','¿Andamios, elevador y equipos disponibles?'],
  ['fre','Frente / espacio','¿El ambiente está libre y entregado por la partida anterior?'],['cal','Calidad','¿Lo previo está liberado por Calidad?'],
  ['seg','Seguridad','¿Permisos, protecciones y condiciones?'],['ext','Externos','¿Cliente, supervisión, servicios?']];
const FLUJN=Object.fromEntries(FLUJ.map(f=>[f[0],f[1]]));
const FLUJ_RX={info:/inform|plano|consult|rfi|dise|ingenier|eto|t[eé]cnic/i,mat:/materi|insumo|log[ií]st|suministr/i,mo:/mano de obra|personal|cuadrill/i,equ:/equip|herram|andam/i,
  fre:/frente|previa|predece|espacio|interfer|tarea/i,cal:/calidad|qa|qc|liberaci/i,seg:/segur|ssoma|permiso/i,ext:/extern|client|supervis|servici|clima/i};
/** flujo de un tipo de restricción: el asignado en Configuración o, si no, por palabras del nombre (sin coincidencia: Externos) */
function flujOfType(t){const m=P().restrFlow||{};if(t&&m[t])return m[t];for(const[k,rx]of Object.entries(FLUJ_RX))if(rx.test(t||''))return k;return'ext'}
/** tipo de restricción para un flujo (el primero de la lista que le corresponde) */
function typeOfFlujo(f){const L=P().restrTypes||[];return L.find(t=>flujOfType(t)===f)||L[0]||''}
const frevW=()=>{const v=+P().frevW;return v>=2&&v<=4?v:2};
/* semanas que se revisan: de la siguiente a la de la ventana (frevW=2 → solo la siguiente) */
const frevWeeks=()=>{const c=weekOf(todayIso());const L=[];for(let w=c+1;w<=c+frevW()-1;w++)L.push(w);return L};
const FREV=new Map();let frevUn=null,FREVV=0;
function ensureFrev(){if(typeof db==='undefined'||!db||frevUn||(typeof TAR_ONLY==='function'&&TAR_ONLY()))return;
  frevUn=fcol('frev').where('n','>=',weekOf(todayIso())).onSnapshot(sn=>{FREV.clear();sn.docs.forEach(d=>FREV.set(d.id,{...d.data(),id:d.id}));FREVV++;if(['look','restr','hoy'].includes(U.tab))requestRender();if(FRV)frevDraw()},
    e=>{console.warn('frev',e&&e.code);frevUn=null})}
const frevId=(n,amb,sc)=>`${n}_${amb}_${sc}`;
/** ¿puede revisar los flujos de este SC? (el SC, lo suyo; admin, editores e ingenieros de campo, todo) */
const canFrev=sc=>!!me&&!(U.ver&&U.verMode==='ver')&&(typeof SCK==='function'&&SCK()?myScsI().includes(sc):!!canDaily);
/* ---------- qué hay que revisar ---------- */
let FRC={k:'',L:null};
/** ambiente + SC con trabajo en las semanas de revisión, con su estado y sugerencias → [{n,amb,sc,pid,acts,doc,sug,red}] */
function frevList(){const W=frevWeeks();const k=[FREVV,DV,DONEV,W.join(','),U.piso||'',typeof MX!=='undefined'?MX.v:0,typeof libVer!=='undefined'?libVer:0].join('|');if(FRC.k===k&&FRC.L)return FRC.L;
  const wk=new Map();W.forEach(w=>{const wd=weekDays(w);[...wd,addD(wd[0],6)].forEach(d=>wk.set(d,w))});
  const vp=new Set(visPisos().map(p=>p.id));const mine=typeof SCK==='function'&&SCK()?new Set(myScsI()):null;const by=new Map();
  for(const x of S.act.values()){if(x._del||!x.sc||(mine&&!mine.has(x.sc))||DONE.has(x.id)||(typeof scTBD==='function'&&scTBD(x.sc)))continue;let n=0;for(const d of x.days||[]){const w=wk.get(d);if(w&&(!n||w<n))n=w}if(!n)continue;
    const pid=pisoOfAmb(x.ambId);if(!vp.has(pid))continue;const key=x.ambId+'|'+x.sc;let e=by.get(key);if(!e){e={n,amb:x.ambId,sc:x.sc,pid,acts:[]};by.set(key,e)}if(n<e.n)e.n=n;e.acts.push(x)}
  /* índices una vez por cálculo (obra grande: no recorrer todas las actividades por cada ambiente) */
  const ix={amb:new Map(),sc:new Map(),pk:new Map()};for(const y of S.act.values()){if(y._del)continue;let a=ix.amb.get(y.ambId);if(!a)ix.amb.set(y.ambId,a=[]);a.push(y);let c=ix.sc.get(y.sc);if(!c)ix.sc.set(y.sc,c=[]);c.push(y)}
  const L=[...by.values()];for(const e of L){e.ix=ix;e.rec=FREV.get(frevId(e.n,e.amb,e.sc))||null;e.doc=e.rec&&!e.rec.parcial?e.rec:null;e.sug=frevSug(e);e.red=frevRed(e)}
  L.sort((a,b)=>(!!a.doc-!!b.doc)||a.n-b.n||((S.amb.get(a.amb)||{}).order||0)-((S.amb.get(b.amb)||{}).order||0)||conOf(a.sc).name.localeCompare(conOf(b.sc).name));
  FRC={k,L};return L}
/** restricciones abiertas de esas actividades, por flujo → {flujo:[restr]} */
function frevRed(e){const o={};for(const x of e.acts)for(const r of restrPend(x.id)){if(typeof rArch==='function'&&rArch(r))continue;const f=flujOfType(r.type);(o[f]=o[f]||[]).push(r)}return o}
/** posibles restricciones que el sistema ya ve → {flujo:[texto]} */
function frevSug(e){const o={};const add=(f,t)=>{(o[f]=o[f]||[]).push(t)};const T=todayIso();
  const ix=e.ix;const all=ix?ix.amb.get(e.amb)||[]:[...S.act.values()].filter(y=>y.ambId===e.amb&&!y._del);const start=x=>{let s='';for(const d of x.days||[])if(!s||d<s)s=d;return s};const last=x=>{let s='';for(const d of x.days||[])if(d>s)s=d;return s};
  /* frente: predecesora del tren (Matriz) sin terminar y que NO está programada para terminar antes (si ya está programada a tiempo, no es restricción) */
  if(typeof mxCatOf==='function'&&typeof mxTrOf==='function'&&typeof MX!=='undefined'&&MX.ld&&MX.ld.cat){const st=(MX.amb.get(e.amb)||{}).c||{};
    const tr=y=>{const c=mxCatOf(y);return c?{c,t:mxTrOf(c)}:null};
    for(const x of e.acts){const tx=tr(x);if(!tx||tx.t==null)continue;const s=start(x);let p=null;
      for(const y of all){if(y.id===x.id)continue;const ty=tr(y);if(!ty||ty.t==null||ty.t>=tx.t||DONE.has(y.id)||st[ty.c]==='t'||st[ty.c]==='n')continue;const l=last(y);if(l&&l<s)continue;if(!p||ty.t>p.t)p={y,t:ty.t,l}}
      if(p)add('fre',`«${p.y.name}» (${conOf(p.y.sc).name}) va antes y ${p.l?'termina el '+fmtD(p.l)+', cuando esta ya empezó':'no está programada'}`)}}
  /* espacio: otro SC en el mismo ambiente los mismos días */
  {const mine=new Set(e.acts.flatMap(x=>x.days||[]));const o2=new Map();for(const y of all){if(y.sc===e.sc)continue;for(const d of y.days||[])if(d>T&&mine.has(d)){o2.set(y.sc,(o2.get(y.sc)||0)+1);break}}
    for(const sc of o2.keys())add('fre',`${conOf(sc).name} trabaja en el mismo ambiente esos días`)}
  /* calidad: liberación crítica pendiente que restringe a estas actividades */
  if(typeof critLibMap==='function'){const C=critLibMap();if(e.acts.some(x=>C.has(x.id)))add('cal','tiene una liberación crítica de Calidad pendiente')}
  /* información: hay ETO cargados en Planos, pero ninguno de este SC */
  if(typeof PLB!=='undefined'&&PLB.size){const E=[...PLB.values()].filter(p=>p.eto&&!p.arch);if(E.length&&!E.some(p=>p.sc===e.sc))add('info','no tiene planos de taller (ETO) aprobados cargados')}
  /* mano de obra: el histograma teórico de la semana pide bastante más que la anterior */
  if(typeof persOf==='function'&&typeof persRend==='function'){const pk=n=>{const kk=e.sc+'|'+n;if(ix&&ix.pk.has(kk))return ix.pk.get(kk);const ds=weekDays(n);let mx=0;const A=ix?ix.sc.get(e.sc)||[]:[...S.act.values()].filter(y=>y.sc===e.sc&&!y._del);const R=A.map(y=>persRend(y));for(const d of ds){let s=0;A.forEach((y,i)=>{s+=persOf(y,d,R[i])});if(s>mx)mx=s}if(ix)ix.pk.set(kk,mx);return mx};
    const a=pk(e.n),b=pk(e.n-1);if(b>0&&a>b*1.3&&a-b>=2)add('mo',`el histograma pide ${a} personas (la semana anterior ${b})`)}
  return o}
/** estado de cada flujo de una entrada: 'res' (restricción abierta o marcada), 'ok', 'sug' (posible), 'none' (sin revisar) */
function frevSt(e,f){if(e.red[f])return'res';const v=e.rec&&e.rec.f&&e.rec.f[f];if(v==='res')return'res';if(v==='ok')return'ok';if(e.sug[f])return'sug';return e.doc?'ok':'none'}
const frevPend=()=>frevList().filter(e=>!e.doc&&canFrev(e.sc));
/* ---------- tira de 8 puntos en la cabecera del ambiente (Lookahead) ---------- */
let FRS={k:'',m:null};
function frevStripMap(){const L=frevList();if(FRS.k===FRC.k&&FRS.m)return FRS.m;const m=new Map();
  for(const e of L){const o=m.get(e.amb)||{};for(const[f]of FLUJ){const s=frevSt(e,f);const rk={res:3,sug:2,none:1,ok:0};if(o[f]==null||rk[s]>rk[o[f]])o[f]=s}m.set(e.amb,o)}
  FRS={k:FRC.k,m};return m}
function fstripHtml(o,amb){const T={res:'restricción abierta',sug:'posible restricción',none:'sin revisar',ok:'listo'};
  return`<button class="fstrip" data-fstrip="${esc(amb)}" title="Revisión de flujos:\n${FLUJ.map(([f,n])=>`${n}: ${T[o[f]]}`).join('\n')}" aria-label="Revisión de flujos del ambiente">${FLUJ.map(([f])=>`<i class="fs-${o[f]}"></i>`).join('')}</button>`}
/* ---------- ventana de revisión ---------- */
let FRV=null; /* {amb?:filtro, sel:key|null, dec:{flujo:'ok'|'res'}} */
function frevOpen(o){ensureFrev();if(typeof ensureMx==='function')ensureMx();FRV={amb:(o&&o.amb)||'',sel:null,dec:{}};frevDraw()}
function frevClose(){FRV=null;const el=document.getElementById('frv');if(el)el.remove()}
const frevKey=e=>frevId(e.n,e.amb,e.sc);
function frevDraw(){if(!FRV)return;let el=document.getElementById('frv');if(!el){el=document.createElement('div');el.id='frv';el.className='pwov';document.body.appendChild(el);el.onclick=frevClick;el.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();frevClose()}})}
  const L=frevList().filter(e=>(!FRV.amb||e.amb===FRV.amb)&&(canFrev(e.sc)||!(typeof SCK==='function'&&SCK())));const e=FRV.sel&&L.find(x=>frevKey(x)===FRV.sel);
  const loc=e=>{const a=S.amb.get(e.amb);const p=S.pis.get(e.pid);return`${p?esc(p.code)+' · ':''}${a?esc(a.code)+' · '+esc(a.name):''}`};
  let h;
  if(!e){const pend=L.filter(x=>!x.doc);
    h=`<div class="pwdlg frvd" role="dialog" aria-modal="true" aria-labelledby="frvt"><h3 id="frvt">Revisión de flujos${FRV.amb?' · '+loc(L[0]||{amb:FRV.amb,pid:pisoOfAmb(FRV.amb)}):''}</h3>
      <p class="note">Ambientes con trabajo en la semana ${frevWeeks().join(' y ')}. «Listo» si nada falta; si algo falta, ábrelo y marca el flujo: se crea la restricción.</p>
      ${L.length?`<div class="pwl">${L.map(x=>{const ns=Object.keys(x.sug).length,nr=Object.keys(x.red).length;const can=canFrev(x.sc);
        return`<div class="pwr frvr${x.doc?' done':''}"><span><b>${loc(x)}</b><small><i class="frdot" style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)} · sem ${x.n} · ${x.acts.length} actividad${x.acts.length===1?'':'es'}${x.doc?` · <em class="ok">${x.doc.st==='res'?'revisado con restricciones':'listo'} (${esc(x.doc.bn||'')})</em>`:''}${ns&&!x.doc?` · <em class="warn">${ns} posible${ns===1?'':'s'}</em>`:''}${nr?` · <em class="bad">${nr} con restricción</em>`:''}</small></span>
          <span class="frvb">${!x.doc&&can&&!ns?`<button class="ib pri" data-frok="${esc(frevKey(x))}">✓ Listo</button>`:''}<button class="ib" data-frsel="${esc(frevKey(x))}">${x.doc||!can?'Ver':'Revisar'}</button></span></div>`}).join('')}</div>`:'<p class="mu">No hay ambientes por revisar en estas semanas.</p>'}
      <div class="pwb"><span class="mu" style="margin-right:auto">${pend.length} por revisar</span><button class="ib" data-frx>Cerrar</button></div></div>`}
  else{const can=canFrev(e.sc);
    h=`<div class="pwdlg frvd" role="dialog" aria-modal="true" aria-labelledby="frvt"><h3 id="frvt">${loc(e)}</h3><p class="note"><i class="frdot" style="--c:${conOf(e.sc).color}"></i>${esc(conOf(e.sc).name)} · semana ${e.n} · ${e.acts.map(x=>esc(x.name)).join(', ')}</p>
      <div class="pwl">${FLUJ.map(([f,n,q])=>{const s=FRV.dec[f]||frevSt(e,f);const sg=e.sug[f]||[];const rd=e.red[f]||[];
        return`<div class="pwr frf fs-${s}"><span><b>${n}</b><small>${q}</small>${sg.map(t=>`<small class="frsug">⚠ Posible: ${esc(t)}</small>`).join('')}${rd.map(r=>`<small class="frred">⛔ ${esc(r.desc||r.type||'Restricción')}${r.need?' · requerida '+fmtD(r.need):''}</small>`).join('')}</span>
          ${can?`<span class="seg frseg"><button class="${s==='ok'?'on':''}" data-frf="${f}|ok">Bien</button><button class="${s==='res'?'on':''}" data-frf="${f}|res"${rd.length?' disabled':''}>Falta…</button></span>`:`<span class="frst">${{ok:'Bien',res:'Falta',sug:'Posible',none:'Sin revisar'}[s]}</span>`}</div>`}).join('')}</div>
      <div class="pwb"><button class="ib" data-frback>‹ Volver</button>${can?'<button class="ib pri" data-frsave>Listo: guardar revisión</button>':''}</div></div>`}
  el.innerHTML=h}
function frevClick(ev){const t=ev.target;if(t===ev.currentTarget||t.closest('[data-frx]')){frevClose();return}
  let b;if((b=t.closest('[data-frback]'))){FRV.sel=null;FRV.dec={};frevDraw();return}
  if((b=t.closest('[data-frsel]'))){FRV.sel=b.dataset.frsel;FRV.dec={};frevDraw();return}
  if((b=t.closest('[data-frok]'))){const e=frevList().find(x=>frevKey(x)===b.dataset.frok);if(e)frevSave(e,{});return}
  if((b=t.closest('[data-frf]'))){const[f,v]=b.dataset.frf.split('|');const e=frevList().find(x=>frevKey(x)===FRV.sel);if(!e)return;
    if(v==='res'){frevRestr(e,f);return}FRV.dec[f]='ok';frevDraw();return}
  if((b=t.closest('[data-frsave]'))){const e=frevList().find(x=>frevKey(x)===FRV.sel);if(e)frevSave(e,FRV.dec)}}
/** guarda la revisión: lo marcado + lo que tiene restricción abierta; lo demás queda «bien» (las posibles sin decidir se preguntan) */
async function frevSave(e,dec){if(!canFrev(e.sc))return;const f={};
  const und=FLUJ.filter(([k])=>e.sug[k]&&!dec[k]&&!e.red[k]).map(([k,n])=>n);
  if(und.length&&!await uiAsk({title:'Posibles restricciones sin decidir',text:'Para estos flujos el sistema ve una posible restricción:',list:und,note:'Si las das por bien, se guardan como «Bien». Si falta algo, vuelve y toca «Falta…».',ok:'Darlas por bien',cancel:'Volver',tone:'warn'}))return;
  for(const[k]of FLUJ)f[k]=e.red[k]?'res':dec[k]||'ok';const st=Object.values(f).includes('res')?'res':'ok';
  const doc={n:e.n,amb:e.amb,sc:e.sc,pid:e.pid,f,st,by:me.email||'',bn:me.name||me.email||'',t:NOW()};
  FREV.set(frevKey(e),{...doc,id:frevKey(e)});FREVV++;FRV&&(FRV.sel=null,FRV.dec={});frevDraw();requestRender();
  fcol('frev').doc(frevKey(e)).set(doc).then(()=>toast(`Revisión guardada: ${(S.amb.get(e.amb)||{}).code||''} · ${conOf(e.sc).name}`)).catch(err=>{FREV.delete(frevKey(e));FREVV++;frevDraw();toast('No se pudo guardar la revisión: '+(err&&err.code==='permission-denied'?'no tienes permiso (o faltan publicar las reglas nuevas)':(err&&(err.code||err.message))||'error'))})}
/** el flujo que falla crea la restricción con su tipo (y queda marcado «Falta» en la revisión) */
function frevRestr(e,f){const x=e.acts.slice().sort((a,b)=>String((a.days||[])[0]).localeCompare(String((b.days||[])[0])))[0];if(!x)return;
  FRV.dec[f]='res';const doc={n:e.n,amb:e.amb,sc:e.sc,pid:e.pid,f:{...((e.rec||{}).f||{}),[f]:'res'},st:'res',by:me.email||'',bn:me.name||me.email||'',t:NOW()};
  if(!e.doc)doc.parcial=true;fcol('frev').doc(frevKey(e)).set(doc,{merge:true}).catch(()=>{});
  frevClose();const id=uid('res');rOpen.add(id);const typ=typeOfFlujo(f);
  apply([op('restr',id,{id,actId:x.id,pisoId:pisoOfAct(x.id),type:typ,desc:'',resp:conOf(x.sc).name,respSc:x.sc,need:actStats(x).ini,freed:'',status:'pend',created:todayIso(),sc:x.sc,flujo:f,via:'flujos',by:me.email,byName:me.name||''})],`Restricción de ${FLUJN[f]} creada`);
  U.tab='restr';U.rfilter='pend';U.rAct=null;render();focusLater(`.ci[data-r="${id}"][data-f="desc"]`);toast(`${FLUJN[f]}: escribe qué falta. Luego vuelve a la revisión para terminar el ambiente.`)}
/* ---------- Hoy ---------- */
function frevHoyCard(){if(!(typeof SCK==='function'&&SCK())&&!canDaily)return null;ensureFrev();const P_=frevPend();const W=frevWeeks();
  return{k:'frev',title:'Revisión de flujos',n:P_.length,tone:'warn',sub:`Ambientes con trabajo en la semana ${W.join(' y ')}: revisa que no falte información, material, personal, equipos, frente, calidad, seguridad ni nada externo.`,
    items:P_.slice(0,6).map(e=>({t:`${(S.amb.get(e.amb)||{}).code||''} · ${(S.amb.get(e.amb)||{}).name||''}`,s:`${conOf(e.sc).name} · sem ${e.n}${Object.keys(e.sug).length?' · '+Object.keys(e.sug).length+' posible(s)':''}`})),go:'restr',goLabel:'Revisar ahora',empty:'Todo revisado'}}
/* ---------- Indicadores: restricciones registradas por flujo ---------- */
function flujCard(n,vset,M){const wd=new Set(weekDays(n));const L=[...S.res.values()].filter(r=>r.created&&wd.has(r.created)&&vset.has(restrPiso(r))&&(!M||M.has(r.sc||((S.act.get(r.actId)||{}).sc)||'')));if(!L.length)return'';
  const by={};L.forEach(r=>{const f=r.flujo||flujOfType(r.type);by[f]=(by[f]||0)+1});
  return`<div class="card chart"><h2>Restricciones por flujo <span class="sub">semana ${n} · qué flujo falló más</span></h2><div class="pad">${svgBarsH(FLUJ.filter(([f])=>by[f]).map(([f,nm])=>({label:nm,v:by[f]})).sort((a,b)=>b.v-a.v),v=>v+'')}</div></div>`}
