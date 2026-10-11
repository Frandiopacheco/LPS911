"use strict";
/* LPS 911 · Módulo Planos › Modelo 3D (beta, solo el administrador; docs/ia/planos.md).
   Visor del modelo BIM: los IFC (uno por especialidad, exportados de Revit) se convierten EN ESTA PC a un formato liviano
   (.frag, That Open Fragments) y se suben a Firebase Storage (modelos/<esp>/r<rev>.frag); Firestore `p3d/<esp>` guarda la ruta.
   El visor (three.js + That Open Components) está empaquetado aparte en web/vendor/visor3d/ (fuente en scripts/visor3d/) y se baja
   solo al entrar aquí. Esta interfaz está pensada para tablet: botones grandes en una barra inferior, paneles que se abren sobre ella
   un menú flotante pequeño (Cortar · Aislar · Ocultar) al tocar un elemento y, a la izquierda, un panel plegable con sus propiedades. La «casita» (abajo a la izquierda)
   vuelve a la vista general. El visor se conserva armado al salir de la pestaña (ver P3_KEEP). Parte de la app: index.html carga los archivos de js/ en orden y todos comparten
   las mismas variables globales. */

const P3={v:null,lib:null,host:null,wrap:null,away:0,snap:null,want:null,gopen:new Map(),docs:new Map(),ready:false,un:null,on:{},busy:'',loading:new Set(),
  panel:'',selN:0,props:null,propsFor:'',st:{hidden:0,ghost:0,isolated:false},tool:'select',cuts:[],meds:[],multi:false,side:(()=>{try{const x=localStorage.getItem('lps.p3side');return x===null?!isMob():x==='1'}catch(e){return !isMob()}})(),bench:null,tm:null,hint:null,lvls:[],lvl:'',plan:false,cutH:1.3,cutOn:true,proj:'persp',preset:''};
/* Al salir de la pestaña (a ver planos, a otro módulo…) el visor NO se destruye: queda armado y apartado, y al volver se repone tal como se dejó (cámara,
   piso, cortes, lo oculto, la selección). Para no gastar la memoria de la tablet, si pasan P3_KEEP ms fuera se libera y se guarda una foto del estado
   (P3.snap) que se repone al volver (los modelos sí se vuelven a abrir). */
const P3_KEEP=15*60*1000;
/* especialidades que se cargan solas al abrir (las demás se prenden a pedido: el mobiliario, por ejemplo, pesa mucho) */
const P3_AUTO=['ARQ','EST','AFC'];
const P3_NAMES={ARQ:'Arquitectura',EST:'Estructuras',AFC:'Agua fría y caliente',DES:'Desagüe',ACI:'Agua contra incendio',AAC:'Aire acondicionado',ALI:'Alimentadores',ILU:'Iluminación',TOC:'Tomacorrientes',
  CAS:'Comunicaciones',CES:'Corrientes especiales',DYA:'Detección y alarma',GAS:'Gas',MOB:'Mobiliario',PET:'Petróleo',VEN:'Ventilación',BAN:'Bandejas',FED:'Fuerza',HVAC:'HVAC'};
const P3_VIEWS=[['iso','Isométrica'],['top','Superior'],['front','Frente'],['back','Atrás'],['left','Izquierda'],['right','Derecha']];
const P3_PRESETS=[['alta','Calidad'],['equilibrada','Equilibrada'],['rapida','Rápida']];
function p3Sub(){if(P3.un||!me)return;P3.un=fcol('p3d').onSnapshot(sn=>{P3.docs.clear();sn.docs.forEach(d=>P3.docs.set(d.id,{...d.data(),id:d.id}));P3.ready=true;if(U.tab==='p3d')p3Sync()},
  err=>{P3.ready=true;console.error('p3d',err);toast('No se pudo leer los modelos 3D: '+(err.code||err.message))});unsubs.push(()=>{if(P3.un)P3.un();P3.un=null})}
async function p3Lib(){if(P3.lib)return P3.lib;await import(new URL('vendor/visor3d/visor3d.js',location.href).href);P3.lib=window.Visor3D;return P3.lib}
const p3Disc=n=>{const m=String(n).toUpperCase().match(/-M3D-([A-Z]+)-E[O0]?\d/)||String(n).toUpperCase().match(/-([A-Z]{2,6})-E[O0]?\d+\.IFC$/);return m?m[1]:String(n).replace(/\.ifc$/i,'').slice(-8).toUpperCase().replace(/[^A-Z0-9]/g,'')};
const p3Ord=d=>{const i=['ARQ','EST','AFC','DES','ACI','AAC','VEN','ILU','TOC','ALI','CAS','CES','DYA','GAS','PET','MOB'].indexOf(d);return i<0?99:i};
const p3Fmt=n=>n>=1e6?(n/1e6).toFixed(1)+' M':n>=1e3?Math.round(n/1e3)+' mil':String(n);
const p3Touch=()=>matchMedia('(pointer:coarse)').matches;

function renderP3d(main){p3Sub();
  if(P3.v&&P3.wrap&&!P3.wrap.isConnected){/* vuelta al modelo: se repone el visor tal como se dejó */
    main.dataset.built='p3d';main.innerHTML='';main.appendChild(P3.wrap);P3.away=0;p3Fit();P3.v.resize();p3Ui();p3Sync();return}
  if(main.dataset.built!=='p3d'||!P3.host||!P3.host.isConnected){main.dataset.built='p3d';p3Kill();
    main.innerHTML=`<div class="p3w"><div class="p3bar">
        <b class="p3t">Modelo 3D <span class="chip">beta</span></b>
        <span id="p3models" class="p3models"></span>
        <span class="plvsp"></span><span class="plcnt" id="p3busy"></span>
        <label class="ib pri" title="Convierte los IFC en esta PC y los sube (puedes elegir varios)">Cargar IFC…<input type="file" id="p3file" accept=".ifc" multiple hidden></label></div>
      <div class="p3host" id="p3host"><div class="p3cv" id="p3cv"></div><div class="p3empty" id="p3empty"></div>
        <div class="p3ban" id="p3ban" hidden></div><aside class="p3side" id="p3side" aria-label="Propiedades del elemento" hidden></aside><div class="p3fm" id="p3fm" role="toolbar" aria-label="Acciones sobre lo seleccionado" hidden></div><div class="p3pn" id="p3pn" hidden></div>
        <div class="p3hint" id="p3hint" hidden></div>
        <button type="button" class="p3home" id="p3home" data-a="home" title="Vista general: todo el modelo" aria-label="Volver a la vista general"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a.5.5 0 0 0 .5.5H10v-5.5h4V20h4a.5.5 0 0 0 .5-.5V10"/></svg></button>
        <nav class="p3dock" id="p3dock" aria-label="Herramientas del modelo 3D"></nav></div></div>`;
    P3.wrap=$('.p3w',main);P3.host=$('#p3host',main);
    $('#p3file',main).onchange=e=>{const fs=[...e.target.files];e.target.value='';p3Upload(fs)};
    $('#p3models',main).onclick=e=>{const b=e.target.closest('[data-m]');if(b)p3Toggle(b.dataset.m)};
    P3.host.addEventListener('click',p3Click);P3.host.addEventListener('input',p3Input);P3.host.addEventListener('toggle',p3Toggled,true);
    document.addEventListener('keydown',p3Key);window.addEventListener('resize',p3Fit);
    p3Fit();p3Ui();p3Start()}
  p3Sync()}
function p3Kill(){clearInterval(P3.chk);if(P3.v){try{P3.v.destroy()}catch(e){}P3.v=null}clearInterval(P3.tm);P3.tm=null;P3.on={};P3.loading.clear();P3.panel='';P3.selN=0;P3.props=null;P3.tool='select';P3.cuts=[];P3.meds=[];P3.lvl='';P3.lvls=[];P3.plan=false;P3.multi=false;P3.cutH=1.3;P3.cutOn=true;P3.proj='persp';P3.bench=null;P3.st={hidden:0,ghost:0,isolated:false};P3.wrap=null;P3.away=0;document.removeEventListener('keydown',p3Key);window.removeEventListener('resize',p3Fit)}
/* demasiado tiempo fuera de la pestaña: se libera la memoria y se guarda una foto del estado para reponerlo al volver */
function p3Park(){if(!P3.v)return;try{P3.snap={on:{...P3.on},v:P3.v.snapshot()}}catch(e){console.warn('foto del visor 3D',e);P3.snap=null}p3Kill();P3.host=null}
/* reponer la foto cuando ya están abiertos los modelos que estaban prendidos */
async function p3Restore(){const s=P3.snap;if(!s||!P3.v||P3.loading.size)return;const need=Object.keys(s.on).filter(k=>s.on[k]&&P3.docs.has(k));if(need.some(k=>!P3.v.has(k)))return;
  P3.snap=null;P3.want=null;try{await P3.v.restore(s.v)}catch(e){console.warn('reponer la vista 3D',e)}
  const v=P3.v;if(!v)return;P3.lvl=v.level;P3.cutH=v.cutHeight;P3.cutOn=v.cutEnabled;P3.plan=v.plan;P3.proj=v.projectionName==='Orthographic'?'ortho':'persp';p3Ui()}
function p3Fit(){const h=P3.host;if(!h||!h.isConnected)return;const top=h.getBoundingClientRect().top;h.style.height=Math.max(360,innerHeight-top-(isMob()?70:12))+'px'}
function p3Busy(t){P3.busy=t;stx($('#p3busy'),t)}
async function p3Start(){if(P3.v)return;const host=P3.host;
  try{p3Busy('Cargando el visor 3D…');const lib=await p3Lib();if(!host.isConnected)return;
    let q='';try{q=localStorage.getItem('lps.p3q')||''}catch(e){}if(!P3_PRESETS.some(x=>x[0]===q))q=p3Touch()?'equilibrada':'alta';
    const v=lib.create($('#p3cv',host),{preset:q,logo:true});P3.v=v;P3.preset=q;
    P3.want=P3.snap?P3.snap.on:null;
    v.onSelect(s=>p3Selected(s));v.onTool(t=>{P3.tool=t;if(t!=='select')P3.panel='';p3Ui()});v.onState(s=>{P3.st=s;p3Ui()});v.onFrame(p3Place);
    v.section.onChange(l=>{P3.cuts=l;p3Ui()});v.measure.onChange(l=>{P3.meds=l;p3Ui()});
    p3Busy('');
    /* si se sale de la pestaña el visor queda apartado; pasado P3_KEEP sin volver, se libera la tarjeta gráfica (y se guarda una foto del estado) */
    clearInterval(P3.chk);P3.chk=setInterval(()=>{if(P3.v!==v)return;if(P3.host&&P3.host.isConnected){P3.away=0;return}if(!P3.away)P3.away=Date.now();if(Date.now()-P3.away>P3_KEEP)p3Park()},5000);
    p3Hint();p3Sync()}catch(e){console.error(e);p3Busy('');toast('No se pudo cargar el visor 3D: '+(e.message||e))}}

/* ───────── especialidades ───────── */
function p3Sync(){const box=$('#p3models');if(!box)return;const L=[...P3.docs.values()].sort((a,b)=>p3Ord(a.disc)-p3Ord(b.disc));
  const em=$('#p3empty');if(em){em.hidden=!!L.length;em.innerHTML=!P3.ready?'Cargando…':L.length?'':'<div class="callout"><b>Aún no hay modelos.</b> Usa <b>Cargar IFC…</b> (en una PC con Chrome o Edge): cada IFC se convierte aquí y se sube. Empieza por arquitectura (ARQ).</div>'}
  /* se cargan solas las principales; el resto, al tocarlas */
  if(P3.v)for(const d of L)if(P3.on[d.id]===undefined&&(P3.want?!!P3.want[d.id]:(P3_AUTO.includes(d.disc)||L.length<=3)))p3Toggle(d.id);
  shx(box,L.map(d=>{const st=P3.loading.has(d.id)?'ld':P3.on[d.id]?'on':'';return`<button type="button" class="plchip ${st}" data-m="${esc(d.id)}" aria-pressed="${st==='on'}" title="${esc((P3_NAMES[d.disc]||d.disc)+' · '+(d.fsize?(d.fsize/1048576).toFixed(1)+' MB':'')+(d.nm?' · '+d.nm:''))}">${P3.loading.has(d.id)?'⏳ ':''}${esc(d.disc)}</button>`}).join(''));
  p3Levels();p3Restore()}
function p3Levels(){if(!P3.v)return;const lv=P3.v.levels();if(lv.join('|')!==P3.lvls.join('|')){P3.lvls=lv;if(P3.lvl&&!lv.includes(P3.lvl))P3.lvl='';p3Ui()}}
async function p3Toggle(id){const d=P3.docs.get(id);if(!d||!P3.v||P3.loading.has(id))return;
  if(P3.v.has(id)){P3.on[id]=!P3.on[id];await P3.v.visible(id,P3.on[id]);p3Sync();return}
  P3.loading.add(id);P3.on[id]=true;p3Sync();const t0=performance.now();
  try{p3Busy(`Bajando ${d.disc}…`);const b=await plGet(d.path);p3Busy(`Abriendo ${d.disc}…`);await P3.v.add(id,new Uint8Array(await b.arrayBuffer()));
    p3Busy(`${d.disc} listo en ${((performance.now()-t0)/1000).toFixed(1)} s`);setTimeout(()=>{if(P3.busy.endsWith(' s'))p3Busy('')},4000)}
  catch(e){console.error(e);P3.on[id]=false;p3Busy('');toast(`No se pudo abrir ${d.disc}: `+(e.message||e))}
  finally{P3.loading.delete(id);p3Sync();p3Restore()}}

/* ───────── selección y paleta de propiedades ───────── */
async function p3Selected(s){P3.selN=s.count;P3.props=null;if(s.count&&isMob())P3.panel='';p3Ui();if(!s.count||!P3.v)return;
  const key=JSON.stringify(s.map);P3.propsFor=key;let pr=null;try{pr=await P3.v.props()}catch(e){console.error(e)}
  if(P3.propsFor!==key)return;P3.props=pr||{nombre:'Elemento',grupos:[]};p3Ui()}
/* panel lateral izquierdo (plegable de izquierda a derecha): propiedades del elemento seleccionado */
function p3Side(){const p=P3.props,n=P3.selN;if(!n)return'';
  const head=p?`<b class="p3pt">${esc(p.nombre)}</b>${n>1?`<span class="chip">+${n-1} más</span>`:''}`:'<b class="p3pt">Cargando…</b>';
  const meta=p?[P3_NAMES[p.modelo]||p.modelo,p.piso,p.categoria].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join(''):'';
  const body=p?(p.tipo?`<div class="p3kv"><span>Tipo</span><b>${esc(p.tipo)}</b></div>`:'')+(p.tag?`<div class="p3kv"><span>Marca</span><b>${esc(p.tag)}</b></div>`:'')+(p.guid?`<div class="p3kv"><span>GlobalId</span><b class="p3mono">${esc(p.guid)}</b><button class="ib" data-a="guid" aria-label="Copiar GlobalId" title="Copiar">⧉</button></div>`:'')
    +p.grupos.map((g,i)=>`<details class="p3grp" data-g="${esc(g.titulo)}"${(P3.gopen.has(g.titulo)?P3.gopen.get(g.titulo):i<2)?' open':''}><summary>${esc(g.titulo)} <small>${g.filas.length}</small></summary>${g.filas.map(r=>`<div class="p3kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}</details>`).join('')
    +(p.grupos.length?'':'<p class="p3none">Este elemento no trae propiedades adicionales en el IFC.</p>'):'';
  return`<button type="button" class="p3sidetab" data-a="side" aria-expanded="${P3.side}" aria-label="${P3.side?'Plegar':'Mostrar'} el panel de propiedades" title="${P3.side?'Plegar':'Propiedades'}">${P3.side?'‹':'›'}</button>
    <div class="p3sidein"><div class="p3ph">${head}<button class="ib" data-a="side" aria-label="Plegar el panel" title="Plegar">‹</button></div><div class="p3meta">${meta}</div><div class="p3body">${body}</div></div>`}
/* menú flotante junto al punto tocado: solo Cortar, Aislar y Ocultar */
function p3Menu(){const A=(a,ico,t)=>`<button type="button" class="p3a" data-a="${a}"><span>${ico}</span>${t}</button>`;return A('cutsurf','✂','Cortar')+A('isolate','🎯','Aislar')+A('hide','🙈','Ocultar')}
/* lo coloca sobre el punto tocado (sigue a la cámara) y lo mantiene dentro del visor */
function p3Place(){const h=P3.host,fm=h&&$('#p3fm',h);if(!fm||fm.hidden||!P3.v)return;const an=P3.v.anchorPx();if(!an)return;
  const w=fm.offsetWidth||190,hh=fm.offsetHeight||56,m=8,x=Math.max(m+w/2,Math.min(an.w-m-w/2,an.x)),below=an.y-hh-16<m;
  fm.style.left=x+'px';fm.style.top=Math.max(m,Math.min(an.h-hh-m,below?an.y+18:an.y-hh-16))+'px';fm.classList.toggle('below',below);fm.style.setProperty('--ax',(Math.max(14,Math.min(w-14,w/2+(an.x-x))))+'px');fm.classList.toggle('far',!an.vis)}
function p3Toggled(e){const d=e.target;if(d&&d.matches&&d.matches('details.p3grp[data-g]'))P3.gopen.set(d.dataset.g,d.open)}

/* ───────── barra inferior, paneles y avisos ───────── */
function p3Dock(){const st=P3.st,mod=(st.hidden?1:0)+(st.ghost?1:0)+(st.isolated?1:0),t=P3.tool,B=(a,ico,txt,on,extra)=>`<button type="button" class="p3b${on?' on':''}" data-a="${a}" aria-pressed="${!!on}" title="${txt}"><span class="p3i">${ico}</span><span class="p3l">${txt}</span>${extra||''}</button>`;
  return B('pn:pisos','🏢','Pisos',P3.panel==='pisos'||P3.lvl)+B('pn:cortes','✂','Cortes',P3.panel==='cortes'||P3.cuts.length||t==='section',P3.cuts.length?`<i class="p3n">${P3.cuts.length}</i>`:'')
    +B('pn:medir','📏','Medir',P3.panel==='medir'||t==='measure',P3.meds.filter(m=>!m.pending).length?`<i class="p3n">${P3.meds.filter(m=>!m.pending).length}</i>`:'')+B('pn:vista','🧭','Vista',P3.panel==='vista')
    +B('showall','👁','Mostrar',false,mod?`<i class="p3n">${mod}</i>`:'')+B('pn:rend','⏱','Fluidez',P3.panel==='rend')}
function p3Panel(){const p=P3.panel;if(!p)return'';
  if(p==='pisos'){const L=[...P3.lvls].reverse();return`<div class="p3pnh"><b>Pisos</b><button class="ib" data-a="pn:" aria-label="Cerrar">✕</button></div>
    <div class="p3lv"><button class="plchip${P3.lvl?'':' on'}" data-a="lvl" data-l="">Todo el edificio</button>${L.map(l=>`<button class="plchip${P3.lvl===l?' on':''}" data-a="lvl" data-l="${esc(l)}">${esc(l.charAt(0)+l.slice(1).toLowerCase())}</button>`).join('')}</div>
    ${P3.lvl?`<div class="p3row"><label class="plchk"><input type="checkbox" data-a="cut" ${P3.cutOn?'checked':''}> Corte a</label><div class="p3step"><button class="ib" data-a="cuth-" aria-label="Bajar el corte">−</button><b>${P3.cutH.toFixed(2).replace('.',',')} m</b><button class="ib" data-a="cuth+" aria-label="Subir el corte">+</button></div><span class="p3sm">sobre el piso</span></div>
    <div class="p3row"><button class="ib${P3.plan?' on':''}" data-a="plan" aria-pressed="${P3.plan}">🗺 Planta 2D</button><span class="p3sm">Vista desde arriba: un dedo mueve, dos dedos acercan.</span></div>`:'<p class="p3sm">Elige un piso para aislarlo y verlo cortado a 1,30 m, como una planta.</p>'}`}
  if(p==='cortes'){const hasBox=P3.cuts.some(c=>c.kind==='box');
    return`<div class="p3pnh"><b>Cortes</b><button class="ib" data-a="pn:" aria-label="Cerrar">✕</button></div>
    <p class="p3sm">Para cortar por una superficie, tócala y elige <b>✂ Cortar</b>.</p>
    <div class="p3sm">Caja de sección alrededor de:</div><div class="p3row"><button class="ib" data-a="sec-box" data-t="model">Todo el modelo</button><button class="ib" data-a="sec-box" data-t="level"${P3.lvl?'':' disabled'}>El piso</button><button class="ib" data-a="sec-box" data-t="sel"${P3.selN?'':' disabled'}>La selección</button></div>
    ${P3.cuts.length?`<div class="p3list">${P3.cuts.filter(c=>c.kind==='surf').map(c=>`<div class="p3li"><span>${esc(c.label)}</span><button class="ib" data-a="sec-flip" data-id="${esc(c.id)}" title="Invertir el lado que se corta">⇄</button><button class="ib" data-a="sec-del" data-id="${esc(c.id)}" aria-label="Quitar">✕</button></div>`).join('')}${hasBox?`<div class="p3li"><span>Caja de sección</span><button class="ib" data-a="sec-del" data-id="${esc(P3.cuts.find(c=>c.kind==='box').id)}" aria-label="Quitar la caja">✕</button></div>`:''}</div>
    <div class="p3row"><button class="ib" data-a="sec-vis">${P3.v&&!P3.v.section.gizmosVisible?'Mostrar':'Ocultar'} tiradores</button><button class="ib" data-a="sec-clear">Quitar todos</button></div><p class="p3sm">Arrastra ✂ (o ↔ en la caja) para mover el corte. Toca ✂ para quitar solo ese corte.</p>`:'<p class="p3sm">Después de cortar, arrastra ✂ para ajustar la posición; tócalo para quitar ese corte.</p>'}`}
  if(p==='medir'){const L=P3.meds.filter(m=>!m.pending);return`<div class="p3pnh"><b>Medir</b><button class="ib" data-a="pn:" aria-label="Cerrar">✕</button></div>
    <div class="p3row"><button class="ib pri" data-a="meas">📏 ${P3.tool==='measure'?'Midiendo…':'Empezar a medir'}</button>${L.length?'<button class="ib" data-a="meas-clear">Borrar todo</button>':''}</div>
    ${L.length?`<div class="p3list">${L.map(m=>`<div class="p3li p3ms"><span><b>${esc(m.text)}</b> <small><i class="x">ΔX ${m.tx}</i> <i class="y">ΔY ${m.ty}</i> <i class="z">ΔZ ${m.tz}</i></small></span><button class="ib" data-a="meas-del" data-id="${m.id}" aria-label="Borrar">✕</button></div>`).join('')}</div>`:'<p class="p3sm">Toca un punto A y luego un punto B (se ajustan al vértice o arista más cercana). Después arrástralos para afinar. Se muestra ΔX, ΔY y ΔZ sobre los ejes y la distancia total.</p>'}`}
  if(p==='vista')return`<div class="p3pnh"><b>Vista</b><button class="ib" data-a="pn:" aria-label="Cerrar">✕</button></div>
    <div class="p3lv">${P3_VIEWS.map(v=>`<button class="plchip" data-a="view" data-v="${v[0]}">${v[1]}</button>`).join('')}</div>
    <div class="p3row"><span class="seg"><button class="${P3.proj==='persp'?'on':''}" data-a="proj" data-p="persp">Perspectiva</button><button class="${P3.proj==='ortho'?'on':''}" data-a="proj" data-p="ortho">Ortogonal</button></span><button class="ib" data-a="home">🏠 Vista general</button></div>`;
  if(p==='rend'){const b=P3.bench;return`<div class="p3pnh"><b>Rendimiento</b><button class="ib" data-a="pn:" aria-label="Cerrar">✕</button></div>
    <div class="p3live" id="p3live">—</div><div class="p3sm">Calidad de dibujo (en tablet conviene «Equilibrada» o «Rápida»):</div>
    <div class="p3row"><span class="seg">${P3_PRESETS.map(x=>`<button class="${P3.preset===x[0]?'on':''}" data-a="preset" data-p="${x[0]}">${x[1]}</button>`).join('')}</span></div>
    <div class="p3row"><button class="ib pri" data-a="bench"${b&&b.run?' disabled':''}>${b&&b.run?'Midiendo… '+Math.round(b.pr*100)+'%':'⏱ Prueba de fluidez (4 s)'}</button></div>
    ${b&&b.res?`<div class="p3res"><b>${b.res.fps} FPS</b> · cuadro típico ${b.res.p50} ms · peor 5% ${b.res.p95} ms · más lento ${b.res.max} ms · ${b.res.lentos} cuadros lentos de ${b.res.cuadros}<br><small>${b.res.calls} llamadas · ${p3Fmt(b.res.tris)} triángulos · resolución ×${b.res.dpr} · calidad ${esc(P3_PRESETS.find(x=>x[0]===P3.preset)?.[1]||'')}</small></div>`:''}`}
  return''}
function p3Banner(){const t=P3.tool;if(t==='section')return`<span>✂ Toca una superficie para cortar</span><button class="ib" data-a="tool-off">Cancelar</button>`;
  if(t==='measure'){const pend=P3.meds.some(m=>m.pending);return`<span>📏 ${pend?'Toca el punto B':'Toca el punto A'}</span><button class="ib" data-a="tool-off">Listo</button>`}
  if(P3.cuts.length&&!P3.selN)return`<span>✂ ${P3.cuts.length} corte${P3.cuts.length>1?'s':''} · arrastra ✂ para mover · tócalo para quitarlo</span><button class="ib" data-a="sec-vis">${P3.v&&!P3.v.section.gizmosVisible?'Mostrar':'Ocultar'} tiradores</button><button class="ib" data-a="sec-clear">Quitar</button>`;
  if(P3.lvl&&P3.plan)return`<span>🗺 ${esc(P3.lvl.charAt(0)+P3.lvl.slice(1).toLowerCase())} · planta a ${P3.cutH.toFixed(2).replace('.',',')} m</span>`;return''}
function p3Ui(){const h=P3.host;if(!h||!h.isConnected)return;
  shx($('#p3dock',h),p3Dock());const pn=$('#p3pn',h),ph=p3Panel();pn.hidden=!ph;shx(pn,ph);
  const sd=$('#p3side',h),has=P3.selN>0;sd.hidden=!has;if(has){shx(sd,p3Side());sd.classList.toggle('fold',!P3.side)}
  const fm=$('#p3fm',h),fo=has&&P3.tool==='select';fm.hidden=!fo;if(fo){shx(fm,p3Menu());p3Place()}
  const bn=$('#p3ban',h),bt=p3Banner();bn.hidden=!bt;shx(bn,bt);
  h.classList.toggle('p3sel',has);h.classList.toggle('p3so',has&&P3.side);
  clearInterval(P3.tm);P3.tm=null;if(P3.panel==='rend'&&P3.v){const tick=()=>{const l=$('#p3live',h);if(!l||!P3.v)return;const p=P3.v.perf();stx(l,p.fps?`${p.fps} FPS · cuadro típico ${p.p50} ms · peor ${p.p95} ms · ${p.calls} llamadas · ${p3Fmt(p.tris)} triángulos`:`En reposo (no se dibuja nada) · ${p.calls} llamadas · ${p3Fmt(p.tris)} triángulos`)};tick();P3.tm=setInterval(tick,500)}}
function p3Hint(){let seen='';try{seen=localStorage.getItem('lps.p3hint')||''}catch(e){}if(seen)return;const el=$('#p3hint');if(!el)return;el.hidden=false;
  el.innerHTML=`<span>${p3Touch()?'1 dedo gira · 2 dedos acercan y mueven · toca una superficie para cortar, aislar u ocultar':'Arrastra para girar · clic derecho para mover · rueda para acercar · clic en una superficie para cortar, aislar u ocultar'}</span><button class="ib" data-a="hint-ok" aria-label="Entendido">✕</button>`}

/* ───────── eventos ───────── */
async function p3Click(e){const el=e.target.closest('[data-a]');if(!el||!P3.v||el.matches('input'))return;const v=P3.v,a=el.dataset.a;
  if(a!=='hint-ok'&&!$('#p3hint').hidden){try{localStorage.setItem('lps.p3hint','1')}catch(x){}$('#p3hint').hidden=true}
  if(a.startsWith('pn:')){const n=a.slice(3);P3.panel=P3.panel===n?'':n;if(P3.panel&&P3.tool!=='select')v.setTool('select');if(P3.panel&&isMob())v.clearSelection();p3Ui();return}
  switch(a){
    case'hint-ok':try{localStorage.setItem('lps.p3hint','1')}catch(x){}$('#p3hint').hidden=true;break;
    case'lvl':P3.lvl=el.dataset.l||'';p3Busy('Mostrando el piso…');await v.setLevel(P3.lvl);if(!P3.lvl&&P3.plan){P3.plan=false;await v.planView(false)}p3Busy('');p3Ui();break;
    case'cuth-':case'cuth+':P3.cutH=Math.max(0.2,Math.min(3,+(P3.cutH+(a==='cuth+'?0.1:-0.1)).toFixed(2)));v.setCutHeight(P3.cutH);p3Ui();break;
    case'plan':P3.plan=!P3.plan;await v.planView(P3.plan);P3.proj=v.projectionName==='Orthographic'?'ortho':'persp';p3Ui();break;
    case'sec-box':{const ok=await v.sectionBox(el.dataset.t);if(!ok)toast('No hay nada que encuadrar');else{P3.panel='';await v.clearSelection()}p3Ui();break}
    case'sec-flip':v.section.flip(el.dataset.id);break;
    case'sec-del':await v.section.remove(el.dataset.id);break;
    case'sec-vis':v.section.showGizmos(!v.section.gizmosVisible);p3Ui();break;
    case'sec-clear':v.section.clearAll();break;
    case'meas':v.setTool(P3.tool==='measure'?'select':'measure');break;
    case'meas-del':v.measure.remove(+el.dataset.id);break;
    case'meas-clear':v.measure.clear();break;
    case'tool-off':v.setTool('select');break;
    case'view':if(P3.plan){P3.plan=false;await v.planView(false)}v.view(el.dataset.v);break;
    case'proj':await v.projection(el.dataset.p);P3.proj=el.dataset.p;p3Ui();break;
    case'home':await v.home();P3.lvl='';P3.plan=false;P3.proj='persp';p3Ui();break;
    case'showall':await v.showAll();break;
    case'isolate':await v.isolate();break;
    case'hide':await v.hide();break;
    case'cutsurf':await v.cutSelection();break;
    case'side':P3.side=!P3.side;try{localStorage.setItem('lps.p3side',P3.side?'1':'0')}catch(x){}p3Ui();break;
    case'clearsel':await v.clearSelection();break;
    case'guid':try{await navigator.clipboard.writeText(P3.props.guid);toast('GlobalId copiado')}catch(x){toast('No se pudo copiar')}break;
    case'preset':P3.preset=el.dataset.p;v.preset(P3.preset);try{localStorage.setItem('lps.p3q',P3.preset)}catch(x){}p3Ui();break;
    case'bench':{P3.bench={run:true,pr:0};p3Ui();const res=await v.bench(4000,pr=>{P3.bench.pr=pr;if(Math.round(pr*20)%2===0)p3Ui()});P3.bench={res};p3Ui();break}
  }}
function p3Input(e){const el=e.target.closest('[data-a]');if(!el||!P3.v)return;if(el.dataset.a==='cut'){P3.cutOn=el.checked;P3.v.cut(P3.cutOn)}}
function p3Key(e){if(!P3.host||!P3.host.isConnected||!P3.v||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
  if(e.key==='Escape'){if(P3.tool!=='select')P3.v.setTool('select');else if(P3.panel){P3.panel='';p3Ui()}else if(P3.selN)P3.v.clearSelection()}
  else if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&P3.selN){const k=e.key.toLowerCase();if(k==='h'||e.key==='Delete')P3.v.hide();else if(k==='i')P3.v.isolate()}
  if(e.key.toLowerCase()==='a'&&e.shiftKey)P3.v.showAll()}

/* carga: convierte cada IFC en esta PC y lo sube; mismo código de especialidad = nueva versión */
async function p3Upload(files){files=files.filter(f=>/\.ifc$/i.test(f.name));if(!files.length){toast('Elige archivos .ifc');return}
  const lib=await p3Lib();let ok=0;window.addEventListener('beforeunload',plUnload);
  try{for(const[i,f]of files.entries()){const disc=p3Disc(f.name);const old=P3.docs.get(disc);const rev=(old&&old.rev||0)+1;const path=`modelos/${disc}/r${rev}.frag`;
      try{p3Busy(`(${i+1}/${files.length}) Convirtiendo ${disc}… 0%`);const t0=performance.now();
        const frag=await lib.convert(f,p=>p3Busy(`(${i+1}/${files.length}) Convirtiendo ${disc}… ${Math.round(p*100)}%`));
        p3Busy(`(${i+1}/${files.length}) Subiendo ${disc} (${(frag.length/1048576).toFixed(1)} MB)…`);await plPut(path,new Blob([frag],{type:'application/octet-stream'}),'application/octet-stream');
        await fcol('p3d').doc(disc).set({disc,nm:f.name.replace(/\.ifc$/i,''),path,rev,fsize:frag.length,isize:f.size,secs:Math.round((performance.now()-t0)/1000),by:me.email,byN:me.name||me.email,ts:NOW()});
        if(P3.v&&P3.v.has(disc))toast(`${disc}: versión nueva cargada. Recarga la página para verla.`);ok++}
      catch(e){console.error(e);toast(`${disc}: no se pudo cargar (${e.message||e})`)}}}
  finally{window.removeEventListener('beforeunload',plUnload);p3Busy(ok?`${ok} modelo(s) cargados`:'')}}
