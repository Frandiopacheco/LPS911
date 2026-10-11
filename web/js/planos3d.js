"use strict";
/* LPS 911 · Módulo Planos › Modelo 3D (beta, solo el administrador; docs/ia/planos.md).
   Visor del modelo BIM: los IFC (uno por especialidad, exportados de Revit) se convierten EN ESTA PC a un formato liviano
   (.frag, That Open Fragments) y se suben a Firebase Storage (modelos/<esp>/r<rev>.frag); Firestore `p3d/<esp>` guarda la ruta.
   El visor (three.js) está empaquetado aparte en web/vendor/visor3d/ (fuente en scripts/visor3d/) y se baja solo al entrar aquí.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const P3={v:null,lib:null,host:null,docs:new Map(),ready:false,un:null,on:{},busy:'',level:'',cut:true,loading:new Set(),pick:null};
/* especialidades que se cargan solas al abrir (las demás se prenden a pedido: el mobiliario, por ejemplo, pesa mucho) */
const P3_AUTO=['ARQ','EST','AFC'];
const P3_NAMES={ARQ:'Arquitectura',EST:'Estructuras',AFC:'Agua fría y caliente',DES:'Desagüe',ACI:'Agua contra incendio',AAC:'Aire acondicionado',ALI:'Alimentadores',ILU:'Iluminación',TOC:'Tomacorrientes',
  CAS:'Comunicaciones',CES:'Corrientes especiales',DYA:'Detección y alarma',GAS:'Gas',MOB:'Mobiliario',PET:'Petróleo',VEN:'Ventilación',BAN:'Bandejas',FED:'Fuerza',HVAC:'HVAC'};
function p3Sub(){if(P3.un||!me)return;P3.un=fcol('p3d').onSnapshot(sn=>{P3.docs.clear();sn.docs.forEach(d=>P3.docs.set(d.id,{...d.data(),id:d.id}));P3.ready=true;if(U.tab==='p3d')p3Sync()},
  err=>{P3.ready=true;console.error('p3d',err);toast('No se pudo leer los modelos 3D: '+(err.code||err.message))});unsubs.push(()=>{if(P3.un)P3.un();P3.un=null})}
async function p3Lib(){if(P3.lib)return P3.lib;await import(new URL('vendor/visor3d/visor3d.js',location.href).href);P3.lib=window.Visor3D;return P3.lib}
const p3Disc=n=>{const m=String(n).toUpperCase().match(/-M3D-([A-Z]+)-E[O0]?\d/)||String(n).toUpperCase().match(/-([A-Z]{2,6})-E[O0]?\d+\.IFC$/);return m?m[1]:String(n).replace(/\.ifc$/i,'').slice(-8).toUpperCase().replace(/[^A-Z0-9]/g,'')};
const p3Ord=d=>{const i=['ARQ','EST','AFC','DES','ACI','AAC','VEN','ILU','TOC','ALI','CAS','CES','DYA','GAS','PET','MOB'].indexOf(d);return i<0?99:i};

function renderP3d(main){p3Sub();
  if(main.dataset.built!=='p3d'||!P3.host||!P3.host.isConnected){main.dataset.built='p3d';if(P3.v){try{P3.v.destroy()}catch(e){}P3.v=null}
    main.innerHTML=`<div class="p3w"><div class="p3bar">
        <b class="p3t">Modelo 3D <span class="chip">beta</span></b>
        <span id="p3models" class="p3models"></span>
        <select class="tin" id="p3lvl" aria-label="Piso"><option value="">Todo el edificio</option></select>
        <label class="plchk"><input type="checkbox" id="p3cut" checked> Corte a 1,3 m</label>
        <button class="ib" id="p3reset" title="Volver a la vista general">Vista general</button>
        <span class="plvsp"></span><span class="plcnt" id="p3busy"></span>
        <label class="ib pri" title="Convierte los IFC en esta PC y los sube (puedes elegir varios)">Cargar IFC…<input type="file" id="p3file" accept=".ifc" multiple hidden></label></div>
      <div class="p3host" id="p3host"><div class="p3empty" id="p3empty"></div><div class="p3card" id="p3card" hidden></div></div></div>`;
    P3.host=$('#p3host',main);
    $('#p3file',main).onchange=e=>{const fs=[...e.target.files];e.target.value='';p3Upload(fs)};
    $('#p3reset',main).onclick=()=>P3.v&&P3.v.reset();
    $('#p3cut',main).onchange=e=>{P3.cut=e.target.checked;P3.v&&P3.v.cut(P3.cut)};
    $('#p3lvl',main).onchange=async e=>{P3.level=e.target.value;if(P3.v){p3Busy('Mostrando el piso…');await P3.v.setLevel(P3.level);p3Busy('')}};
    $('#p3models',main).onclick=e=>{const b=e.target.closest('[data-m]');if(b)p3Toggle(b.dataset.m)};
    p3Fit();window.addEventListener('resize',p3Fit);
    p3Start()}
  p3Sync()}
function p3Fit(){const h=P3.host;if(!h||!h.isConnected)return;const top=h.getBoundingClientRect().top;h.style.height=Math.max(320,innerHeight-top-(isMob()?70:12))+'px'}
function p3Busy(t){P3.busy=t;stx($('#p3busy'),t)}
async function p3Start(){if(P3.v)return;const host=P3.host;
  try{p3Busy('Cargando el visor 3D…');const lib=await p3Lib();if(!host.isConnected)return;
    P3.v=lib.create(host,{});P3.v.pick(d=>p3Card(d));p3Busy('');
    /* si se sale de la pestaña, se libera la tarjeta gráfica */
    const chk=setInterval(()=>{if(!host.isConnected){clearInterval(chk);try{P3.v&&P3.v.destroy()}catch(e){}P3.v=null;P3.on={};P3.loading.clear()}},2000);
    p3Sync()}catch(e){console.error(e);p3Busy('');toast('No se pudo cargar el visor 3D: '+(e.message||e))}}
function p3Sync(){const box=$('#p3models');if(!box)return;const L=[...P3.docs.values()].sort((a,b)=>p3Ord(a.disc)-p3Ord(b.disc));
  const em=$('#p3empty');if(em){em.hidden=!!L.length;em.innerHTML=!P3.ready?'Cargando…':L.length?'':'<div class="callout"><b>Aún no hay modelos.</b> Usa <b>Cargar IFC…</b> (en una PC con Chrome o Edge): cada IFC se convierte aquí y se sube. Empieza por arquitectura (ARQ).</div>'}
  /* se cargan solas las principales; el resto, al tocarlas */
  if(P3.v)for(const d of L)if(P3.on[d.id]===undefined&&(P3_AUTO.includes(d.disc)||L.length<=3))p3Toggle(d.id);
  shx(box,L.map(d=>{const st=P3.loading.has(d.id)?'ld':P3.on[d.id]?'on':'';return`<button type="button" class="plchip ${st}" data-m="${esc(d.id)}" title="${esc((P3_NAMES[d.disc]||d.disc)+' · '+(d.fsize?(d.fsize/1048576).toFixed(1)+' MB':'')+(d.nm?' · '+d.nm:''))}">${P3.loading.has(d.id)?'⏳ ':''}${esc(d.disc)}</button>`}).join(''));
  const sel=$('#p3lvl');if(sel&&P3.v){const lv=P3.v.levels();shx(sel,'<option value="">Todo el edificio</option>'+lv.map(n=>`<option${n===P3.level?' selected':''}>${esc(n)}</option>`).join(''))}}
async function p3Toggle(id){const d=P3.docs.get(id);if(!d||!P3.v||P3.loading.has(id))return;
  if(P3.v.has(id)){P3.on[id]=!P3.on[id];await P3.v.visible(id,P3.on[id]);p3Sync();return}
  P3.loading.add(id);P3.on[id]=true;p3Sync();const t0=performance.now();
  try{p3Busy(`Bajando ${d.disc}…`);const b=await plGet(d.path);p3Busy(`Abriendo ${d.disc}…`);await P3.v.add(id,new Uint8Array(await b.arrayBuffer()));
    p3Busy(`${d.disc} listo en ${((performance.now()-t0)/1000).toFixed(1)} s`);setTimeout(()=>{if(P3.busy.endsWith(' s'))p3Busy('')},4000)}
  catch(e){console.error(e);P3.on[id]=false;p3Busy('');toast(`No se pudo abrir ${d.disc}: `+(e.message||e))}
  finally{P3.loading.delete(id);p3Sync()}}
function p3Card(d){const c=$('#p3card');if(!c)return;if(!d){c.hidden=true;return}
  c.hidden=false;c.innerHTML=`<button class="ib" aria-label="Cerrar" onclick="this.parentNode.hidden=true">✕</button><b>${esc(d.nombre||'Elemento')}</b>${d.tipo?`<span>${esc(d.tipo)}</span>`:''}<small>${esc([P3_NAMES[d.modelo]||d.modelo,d.categoria].filter(Boolean).join(' · '))}${d.tag?' · id '+esc(d.tag):''}</small>`}
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
