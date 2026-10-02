"use strict";
/* LPS 911 · Sectorización, Configuración y Equipo.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= PLANOS ================= */
const PLAN=new Map();let planosSub=null,planosLoaded=false;const confirmPlano={};
function ensurePlanos(){if(planosSub||!db)return;
  planosSub=fcol('planos').onSnapshot(sn=>{PLAN.clear();sn.docs.forEach(d=>PLAN.set(d.id,{...d.data(),id:d.id}));planosLoaded=true;if(U.tab==='planos')requestRender()},
    err=>{planosLoaded=true;planosErr=err&&err.code;if(U.tab==='planos')requestRender()});
  unsubs.push(()=>{if(planosSub)planosSub();planosSub=null;planosLoaded=false;PLAN.clear()})}
let planosErr=null;
function shrinkImage(file){return new Promise((ok,ko)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);let W=img.naturalWidth,H=img.naturalHeight;let max=2000,q=.82,out='';
  for(let k=0;k<8;k++){const sc=Math.min(1,max/Math.max(W,H));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<900000)break;if(q>.6)q-=.1;else max=Math.round(max*.8)}
  out.length<1000000?ok(out):ko(new Error('La imagen es demasiado grande incluso comprimida.'))};img.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('No se pudo leer la imagen. Usa JPG o PNG.'))};img.src=u})}
function renderPlanos(main){
  ensurePlanos();
  const list=[...PLAN.values()].filter(p=>!U.piso||!p.pisoId||p.pisoId===U.piso).sort((a,b)=>(a.order||0)-(b.order||0));
  const popt=sel=>'<option value="">Todos los pisos</option>'+pisos().map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('');
  let h=`<div class="scroll"><div class="wrap">${pageHead('Sectorización',`${U.piso?esc(S.pis.get(U.piso)?.name||'')+' y planos generales':'Todos los pisos'} · toca un plano para ampliarlo`,`${canWrite?'<label class="ib pri">+ Subir planos<input type="file" id="pup" accept="image/*" multiple hidden></label>':''}`)}
   ${canWrite?'<p class="note" id="pmsg">Sube capturas en JPG o PNG. Se comprimen automáticamente. Para un PDF, toma una captura de la hoja.</p>':''}`;
  if(!planosLoaded)h+='<div class="empty">Cargando planos…</div>';
  else if(planosErr)h+=`<div class="callout">No se pudieron leer los planos (${esc(planosErr)}). Si acabas de actualizar la página, falta publicar las reglas nuevas de Firestore (ver instrucciones de la actualización).</div>`;
  else if(!list.length)h+=`<div class="empty">Aún no hay planos${U.piso?' para este piso':''}.${isAdmin?' Usa <b>+ Subir planos</b> para agregar las imágenes de sectorización.':''}</div>`;
  else h+='<div class="planos">'+list.map(p=>{const cd=(confirmPlano[p.id]||0)>NOW();return`<figure class="plano"><img src="${p.data}" alt="${esc(p.title)}" data-pv="${p.id}" loading="lazy"><figcaption><input value="${esc(p.title)}" data-pt="${p.id}" data-fk="pt:${p.id}" aria-label="Título del plano"${canWrite?'':' readonly'}></figcaption>
    ${canWrite?`<div class="ptools"><select data-pp="${p.id}" aria-label="Piso del plano">${popt(p.pisoId||'')}</select><span style="flex:1"></span><button class="ib${cd?' warn':''}" data-pdel="${p.id}" style="height:28px;font-size:12px">${cd?'Confirmar':'Eliminar'}</button></div>`:(p.pisoId?`<div class="ptools note">${esc(S.pis.get(p.pisoId)?.name||'')}</div>`:'')}</figure>`}).join('')+'</div>';
  main.innerHTML=h+'</div></div>';
  main.onfocusin=e=>{if(e.target.dataset&&e.target.dataset.pt)e.target.dataset.o=e.target.value};
  main.onclick=async e=>{const im=e.target.closest('img[data-pv]');if(im){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-z="1">Tamaño real</button><button class="ib" data-x="1">Cerrar</button></div><img src="${im.src}" alt="">`;
      lb.onclick=ev=>{if(ev.target.dataset.z){const i=lb.querySelector('img');i.classList.toggle('full');ev.target.textContent=i.classList.contains('full')?'Ajustar a pantalla':'Tamaño real'}else if(ev.target.dataset.x||ev.target===lb)lb.remove()};
      document.addEventListener('keydown',function k(ev){if(ev.key==='Escape'){lb.remove();document.removeEventListener('keydown',k)}});document.body.appendChild(lb);return}
    const d=e.target.closest('[data-pdel]');if(d){const id=d.dataset.pdel;if((confirmPlano[id]||0)>NOW()){confirmPlano[id]=0;try{await fcol('planos').doc(id).delete();toast('Plano eliminado')}catch(err){toast('No se pudo eliminar: '+(err.code||err.message))}}else{confirmPlano[id]=NOW()+4000;render();setTimeout(()=>{if(U.tab==='planos')render()},4100)}}};
  main.onchange=async e=>{const t=e.target;
    if(t.dataset.pt){try{await fcol('planos').doc(t.dataset.pt).update({title:t.value.trim()});t.dataset.o=t.value}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
    else if(t.dataset.pp){try{await fcol('planos').doc(t.dataset.pp).update({pisoId:t.value})}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
    else if(t.id==='pup'&&t.files.length){const files=[...t.files];t.value='';const msg=$('#pmsg');let n=0;
      for(const f of files){try{if(msg)msg.textContent=`Comprimiendo y subiendo ${f.name}…`;const data=await shrinkImage(f);const id=uid('plano');
        await fcol('planos').doc(id).set({title:f.name.replace(/\.[^.]+$/,''),pisoId:U.piso||'',order:NOW(),data,by:me.email});n++}
        catch(err){toast(`No se pudo subir ${f.name}: ${err.code||err.message}`)}}
      if(n)toast(`${n} plano(s) subidos.`);const m2=$('#pmsg');if(m2)m2.textContent=n?`${n} plano(s) subidos.`:'No se subió ningún plano.'}};
}

/* ================= CONFIGURACIÓN ================= */
function renderCfg(main){
  const p=P();const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));const use={};for(const x of S.act.values())use[x.sc]=(use[x.sc]||0)+1;
  const ro=canWrite?'':' readonly',dis=canWrite?'':' disabled';
  const tpls=(p.templates||[]).map(t=>({...t,acts:(t.acts||[]).map(a=>Array.isArray(a)?{sc:a[0],name:a[1]}:a)}));
  const conSel=(sel,ti,ai)=>`<select data-tsc="${ti}:${ai}"${dis}>${cons.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Configuración','Subcontratistas, plantillas, causas, tipos de restricción, calendario e inspectores')}
  ${canWrite?'':`<div class="callout">Tu rol es ${esc(ROLE[me.role]||me.role)}: puedes ver la configuración pero no cambiarla.</div>`}
  <div class="card"><h2>Subcontratistas <span class="sub">El color pinta las barras del lookahead y los reportes</span></h2><div class="tscroll"><table class="t"><thead><tr><th>Color</th><th>Nombre</th><th>Partida</th><th>Actividades</th><th></th></tr></thead><tbody>
   ${cons.map(c=>`<tr><td><input type="color" data-c="${c.id}" data-f="color" value="${esc(c.color)}"${dis} aria-label="Color de ${esc(c.name)}"></td><td><input class="ci" data-c="${c.id}" data-f="name" data-fk="c:${c.id}:n" value="${esc(c.name)}"${ro}></td><td><input class="ci" data-c="${c.id}" data-f="partida" data-fk="c:${c.id}:p" value="${esc(c.partida||'')}"${ro}></td><td class="mono">${use[c.id]||0}</td><td>${canWrite&&!use[c.id]?`<button class="ab" data-cdel="${c.id}" aria-label="Eliminar" title="Eliminar (no tiene actividades)">&times;</button>`:''}</td></tr>`).join('')}
  </tbody></table></div>${canWrite?'<div class="pad"><button class="ib" id="cadd">+ Subcontratista</button></div>':''}</div>
  <div class="card"><h2>Plantillas de ambiente <span class="sub">Se usan en “+ Ambiente” para crear varias actividades de una vez</span></h2><div class="pad"><div class="tpls">
   ${tpls.map((t,ti)=>`<div class="tplc"><div class="row"><input class="tn" data-tname="${ti}" value="${esc(t.name)}" aria-label="Nombre de la plantilla"${ro}>${canWrite?`<button class="ab" data-tdel="${ti}" title="Eliminar plantilla" aria-label="Eliminar plantilla">&times;</button>`:''}</div>
     ${t.acts.map((a,ai)=>`<div class="row">${conSel(a.sc,ti,ai)}<input class="an" data-tact="${ti}:${ai}" value="${esc(a.name)}" placeholder="Actividad" list="lqdl-${esc(a.sc||'')}"${ro}><span class="tplib" data-ta="${ti}:${ai}">${tplLibInfo(a.sc,a.name)}</span>${canWrite?`<button class="ab" data-tadel="${ti}:${ai}" aria-label="Quitar actividad">&times;</button>`:''}</div>`).join('')}
     ${canWrite?`<div class="row"><button class="ib" data-taadd="${ti}" style="height:26px;font-size:12px">+ Actividad</button><button class="ib" data-tup="${ti}" style="height:26px;font-size:12px">Subir</button></div>`:''}</div>`).join('')}
   </div>${tplDatalists(tpls)}${canWrite?'<div style="margin-top:10px"><button class="ib" id="tnew">+ Nueva plantilla</button></div>':''}<p class="note" style="margin:8px 0 0">Al escribir una actividad se sugieren los nombres que ya usa el lookahead. ◆ indica que requiere liberación de calidad; “≈ usar…” corrige un nombre parecido para que los ambientes nuevos hereden su liberación.</p></div></div>
  <div class="cfg">
   <div class="card"><h2>Causas de no cumplimiento</h2><div class="pad"><textarea class="box" data-l="cnc" aria-label="Causas, una por línea"${ro}>${esc((p.cnc||[]).join('\n'))}</textarea><p class="note">Una por línea. Se guarda al salir del cuadro.</p>
     <h3 class="cimph">¿Imputable al subcontratista?</h3><p class="note" style="margin-top:0">Si la causa no depende del subcontratista (p. ej. actividad previa), su incumplimiento no le baja el <b>PPC del SC</b>. En Campo se puede corregir caso por caso.</p>
     <div class="cimpl">${(p.cnc||[]).map(k=>{const v=cncImp(k);return`<div class="cimpr"><span>${esc(k)}</span><span class="seg"><button data-cimpc="${esc(k)}" data-v="1" class="${v?'on':''}"${dis}>Sí</button><button data-cimpc="${esc(k)}" data-v="0" class="${v?'':'on'}"${dis}>No</button></span></div>`}).join('')}</div></div></div>
   <div class="card"><h2>Clase de cada tipo de restricción</h2><div class="pad"><p class="note">Operativa de campo: se resuelve en la obra (materiales, mano de obra, equipos, actividad previa). Otras áreas: depende de OT, Ingeniería, Logística, etc. Cada restricción puede cambiarse por separado.</p>
     <div class="cimpl">${(p.restrTypes||[]).map(k=>{const g=typeGrp(k);return`<div class="cimpr"><span>${esc(k)}</span><span class="seg"><button data-rgrpc="${esc(k)}" data-v="campo" class="${g==='campo'?'on':''}"${dis}>Campo</button><button data-rgrpc="${esc(k)}" data-v="area" class="${g==='area'?'on':''}"${dis}>Otras áreas</button></span></div>`}).join('')}</div></div></div>
   <div class="card"><h2>Inspectores de calidad</h2><div class="pad"><textarea class="box" id="cfgInsp" aria-label="Inspectores, uno por línea"${canLibMatrix()?'':' disabled'}>${esc(libInsp().join('\n'))}</textarea><p class="note">Uno por línea. Se eligen al programar una liberación y sirven para filtrar la agenda de cada uno. La editan Calidad y el administrador.</p></div></div>
   <div class="card"><h2>Áreas de apoyo</h2><div class="pad"><textarea class="box" data-l="restrAreas" aria-label="Áreas, una por línea"${ro}>${esc(restrAreasL().join('\n'))}</textarea><p class="note">Una por línea (OT, Ingeniería…). Se ofrecen al marcar una restricción como “Otras áreas”.</p></div></div>
   <div class="card"><h2>Tipos de restricción</h2><div class="pad"><textarea class="box" data-l="restrTypes" aria-label="Tipos, uno por línea"${ro}>${esc((p.restrTypes||[]).join('\n'))}</textarea><p class="note">Uno por línea. Se guarda al salir del cuadro.</p></div></div>
  </div>
  ${calCard()}${archCard()}
  <div class="card"><h2>Proyecto ${isAdmin?'':'<span class="sub">Solo el administrador puede cambiar estos datos</span>'}</h2><div class="pad frm">
   <label for="p_name">Nombre corto</label><input id="p_name" data-p="name" value="${esc(p.name)}"${isAdmin?'':' readonly'}>
   <label for="p_full">Proyecto</label><textarea id="p_full" data-p="fullName" rows="3"${isAdmin?'':' readonly'}>${esc(p.fullName)}</textarea>
   <label for="p_owner">Propietario</label><input id="p_owner" data-p="owner" value="${esc(p.owner)}"${isAdmin?'':' readonly'}>
   <label for="p_loc">Ubicación</label><input id="p_loc" data-p="location" value="${esc(p.location)}"${isAdmin?'':' readonly'}>
   <label for="p_code">Código del formato</label><input id="p_code" data-p="code" value="${esc(p.code)}"${isAdmin?'':' readonly'}>
   <label for="p_rw">Semana de referencia</label><input id="p_rw" data-p="refWeek" type="number" value="${p.refWeek}"${isAdmin?'':' readonly'}>
   <label for="p_rd">Lunes de esa semana</label><input id="p_rd" data-p="refDate" type="date" value="${p.refDate}"${isAdmin?'':' readonly'}>
   <label for="p_dl">Tablero: hora límite para iniciar</label><input id="p_dl" data-p="dashLate" type="time" value="${esc(p.dashLate||'09:00')}"${isAdmin?'':' readonly'}>
  </div><p class="pad note" style="padding-top:0">La numeración de semanas se calcula desde la semana y el lunes de referencia (hoy: semana ${P().refWeek} = ${fmtD(P().refDate)}).</p></div>
  </div></div>`;
  calWire(main);
  const saveP=ch=>apply([op('meta','project',{...P(),...ch})]);
  const saveT=fn=>{const t=clone(tpls);fn(t);saveP({templates:t})};
  main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onchange=e=>{const t=e.target;if(t.id==='cfgInsp'){if(canLibMatrix()){const L=[...new Set(t.value.split('\n').map(x=>x.trim()).filter(Boolean))];libmPut({insp:L},`${L.length} inspector(es) guardados`)}return}if(!canWrite)return;
    if(t.dataset.p){if(!isAdmin)return;let v=t.value;if(t.dataset.p==='refWeek')v=parseInt(v,10)||P().refWeek;if(t.dataset.p==='refDate'&&pd(v).getUTCDay()!==1){toast('La fecha de referencia debe ser un lunes.');t.value=P().refDate;return}saveP({[t.dataset.p]:v})}
    else if(t.dataset.c){const c=S.con.get(t.dataset.c);let v=t.value;if(t.dataset.f==='name'){v=v.trim().toUpperCase();if(!v){t.value=c.name;return}}apply([op('contractors',c.id,{...c,[t.dataset.f]:v})])}
    else if(t.dataset.l){saveP({[t.dataset.l]:t.value.split('\n').map(x=>x.trim()).filter(Boolean)})}
    else if(t.dataset.tname!=null){saveT(a=>{a[+t.dataset.tname].name=t.value.trim()||'Plantilla'})}
    else if(t.dataset.tsc){const[i,j]=t.dataset.tsc.split(':').map(Number);saveT(a=>{a[i].acts[j].sc=t.value})}
    else if(t.dataset.tact){const[i,j]=t.dataset.tact.split(':').map(Number);saveT(a=>{a[i].acts[j].name=t.value.trim()})}};
  main.onclick=e=>{const b=e.target.closest('button');if(!b||!canWrite)return;
    if(b.dataset.rgrpc!=null){saveP({restrGrp:{...(P().restrGrp||{}),[b.dataset.rgrpc]:b.dataset.v}});return}
    if(b.dataset.cimpc!=null){saveP({cncImp:{...(P().cncImp||{}),[b.dataset.cimpc]:b.dataset.v==='1'}});return}
    if(b.dataset.tuse!=null){const ta=b.closest('[data-ta]');if(ta){const[i,j]=ta.dataset.ta.split(':').map(Number);saveT(a=>{a[i].acts[j].name=b.dataset.tuse})}return}
    if(b.dataset.cdel)apply([op('contractors',b.dataset.cdel,null)],'Subcontratista eliminado');
    else if(b.id==='cadd'){const id=uid('c');apply([op('contractors',id,{id,name:'NUEVO',partida:'',color:'#5A7D9A'})]);focusLater(`[data-c="${id}"][data-f="name"]`)}
    else if(b.id==='tnew')saveT(a=>a.push({name:'Nueva plantilla',acts:[{sc:(cons[0]||{}).id||'',name:''}]}));
    else if(b.dataset.tdel!=null)saveT(a=>a.splice(+b.dataset.tdel,1));
    else if(b.dataset.taadd!=null)saveT(a=>{const t=a[+b.dataset.taadd];const last=t.acts[t.acts.length-1];t.acts.push({sc:last?last.sc:((cons[0]||{}).id||''),name:''})});
    else if(b.dataset.tadel){const[i,j]=b.dataset.tadel.split(':').map(Number);saveT(a=>a[i].acts.splice(j,1))}
    else if(b.dataset.tup!=null){const i=+b.dataset.tup;if(i>0)saveT(a=>{const x=a.splice(i,1)[0];a.splice(i-1,0,x)})}};
}

/* ================= EQUIPO ================= */
const confirmDel={};
function scCell(em,m){const L=memScs(m);const all=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));const rest=all.filter(c=>!L.includes(c.id));
  return`<div class="scchips">${L.map(i=>`<span class="scchip" style="--c:${esc(conOf(i).color)}"><i></i>${esc(conOf(i).name)}<button data-scrm="${esc(em)}|${esc(i)}" aria-label="Quitar ${esc(conOf(i).name)}" title="Quitar">&times;</button></span>`).join('')}</div>
   <select class="ci" data-mem="${esc(em)}" data-f="scadd" aria-label="Agregar empresa o partida"${L.length?'':' style="border:1px solid var(--bad)"'}><option value="">${L.length?'+ Agregar otra empresa / partida…':'— elige la empresa —'}</option>${rest.map(c=>`<option value="${c.id}">${esc(c.name)}${c.partida?' · '+esc(c.partida):''}</option>`).join('')}</select>`}
/* buscador y filtros del equipo; borrador del formulario "Agregar" (sobrevive a las actualizaciones automáticas de la pantalla) */
const TQ={q:'',role:'',sc:''};const TF={em:'',nm:'',rl:'editor',sc:'',ar:''};
const TROLES=['admin','editor','campo','sc','capataz','area','lector'];
const TGRP={admin:'Administradores',editor:'Editores (ingenieros de producción)',campo:'Campo (ingenieros de campo)',sc:'Subcontratistas',capataz:'Capataces',area:'Áreas de apoyo (Oficina Técnica, Calidad…)',lector:'Lectores'};
const fold=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const roleOfM=(em,m)=>isOwnerEmail(em)?'admin':(m&&m.role)||'lector';
function teamRows(list,online){const q=fold(TQ.q).trim();const words=q?q.split(/\s+/):[];
  const hay=(em,m)=>fold([m.name,em.startsWith('u_')?'':em,ROLE[roleOfM(em,m)],m.area||'',...memScs(m).map(i=>conOf(i).name+' '+(conOf(i).partida||'')),...memPisos(m).map(id=>{const p=S.pis.get(id);return p?p.code+' '+p.name:''})].join(' '));
  const L=list.filter(([em,m])=>(!TQ.role||roleOfM(em,m)===TQ.role)&&(!TQ.sc||memScs(m).includes(TQ.sc))&&(!words.length||words.every(w=>hay(em,m).includes(w))));
  const scName=m=>memScs(m).map(i=>conOf(i).name).sort()[0]||'~';
  const by=r=>L.filter(([em,m])=>roleOfM(em,m)===r).sort((a,b)=>(r==='sc'||r==='capataz'?scName(a[1]).localeCompare(scName(b[1])):0)||(a[1].name||a[0]).localeCompare(b[1].name||b[0]));
  return{n:L.length,groups:TROLES.map(r=>({r,rows:by(r)})).filter(g=>g.rows.length)}}
function renderTeam(main){
  const list=[...MEM.entries()];const now=NOW();
  const online=new Set([...PRES.values()].map(p=>p&&p.eh));
  const counts=Object.fromEntries(Object.keys(COLS).map(c=>[c,S[COLS[c]].size]));ensurePlanos();
  main.innerHTML=`<div class="scroll"><div class="wrap">
  ${pageHead('Equipo',`${list.length} persona${list.length===1?'':'s'} con acceso`,me&&me.realAdmin&&VA_OK()&&!IN_FRAME?'<button class="ib" id="bva" title="Prueba la app con los permisos de otro rol">👁 Ver como…</button><button class="ib" id="bph" title="Abre la app en el tamaño de un celular">📱 Vista celular</button>':'')}
  <div class="card">
   <details class="pad tinfo"${(TQ.info??list.length<3)?' open':''}><summary>¿Cómo se suma a alguien y qué hace cada rol?</summary><p class="callout" style="margin:8px 0 0">Solo los correos de esta lista pueden entrar. Para sumar a alguien: agrégalo aquí, envíale el enlace de esta página (<span class="mono">${esc(location.origin+location.pathname)}</span>) y pídele que pulse <b>“¿Primera vez? Crear mi cuenta”</b> con ese mismo correo y confirme el correo que le llegará.<br><b>Campo</b>: registra el avance diario (capataces), sin modificar el lookahead. <b>Editor</b>: edita el lookahead, el plan semanal y las restricciones; asígnale los <b>pisos a su cargo</b> para que resuelva las propuestas de los subcontratistas en esos pisos (un piso puede tener varios responsables; si no tiene ninguno, las propuestas las resuelve el administrador). <b>Subcontratista</b>: dibuja el plan del día de su empresa en el Plan diario (elige su empresa en la columna Rol; si una empresa tiene varias partidas, agrégalas todas con “+ Agregar otra empresa / partida”). <b>Área de apoyo</b> (Oficina Técnica, Calidad…): ve todo y registra, resuelve y libera las restricciones de su área; elige su área en la columna Rol. <b>Lector</b>: solo consulta. <b>Administrador</b>: además gestiona el equipo y los datos.</p></details>
   ${isAdmin?`<form class="pad" id="tadd" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding-top:0"><input class="tin" id="temail" type="text" inputmode="email" autocomplete="off" data-fk="tf:em" value="${esc(TF.em)}" placeholder="correo@empresa.com" aria-label="Correo"><input class="tin" id="tname" data-fk="tf:nm" value="${esc(TF.nm)}" placeholder="Nombre y apellido" aria-label="Nombre"><select class="tin" id="trole" aria-label="Rol">${[['editor','Editor'],['campo','Campo'],['sc','Subcontratista'],['capataz','Capataz'],['area','Área de apoyo (OT, Calidad…)'],['lector','Lector'],['admin','Administrador']].map(([k,v])=>`<option value="${k}"${TF.rl===k?' selected':''}>${v}</option>`).join('')}</select><select class="tin" id="tsc" aria-label="Empresa"${TF.rl==='sc'||TF.rl==='capataz'?'':' hidden'}><option value="">— empresa —</option>${[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}"${TF.sc===c.id?' selected':''}>${esc(c.name)}${c.partida?' · '+esc(c.partida):''}</option>`).join('')}</select><select class="tin" id="tar" aria-label="Área"${TF.rl==='area'?'':' hidden'}><option value="">— área —</option>${restrAreasL().map(a=>`<option${TF.ar===a?' selected':''}>${esc(a)}</option>`).join('')}</select><button class="ib pri" type="submit">Agregar al equipo</button></form>`:''}
   ${(()=>{const cnt={};list.forEach(([em,m])=>{const r=roleOfM(em,m);cnt[r]=(cnt[r]||0)+1});const scs=[...new Set(list.filter(([em,m])=>!TQ.role||roleOfM(em,m)===TQ.role).flatMap(([,m])=>memScs(m)))].filter(i=>S.con.has(i)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
     return`<div class="pad tfilt"><input class="tin tqry" id="tq" data-fk="tq" type="search" value="${esc(TQ.q)}" placeholder="Buscar por nombre, correo, empresa o piso…" aria-label="Buscar en el equipo">
      <span class="tchips"><button type="button" class="${!TQ.role?'on':''}" data-trole="">Todos <b>${list.length}</b></button>${TROLES.filter(r=>cnt[r]).map(r=>`<button type="button" class="${TQ.role===r?'on':''}" data-trole="${r}">${ROLE[r]} <b>${cnt[r]}</b></button>`).join('')}</span>
      ${scs.length?`<select class="tin" id="tqsc" aria-label="Filtrar por empresa"><option value="">Todas las empresas</option>${scs.map(i=>`<option value="${i}"${TQ.sc===i?' selected':''}>${esc(conOf(i).name)}</option>`).join('')}</select>`:''}</div>`})()}
   <div class="tscroll"><table class="t"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th title="Puede ver la pestaña Tablero">Tablero</th><th>Estado</th><th></th></tr></thead><tbody>
   ${(()=>{const TR=teamRows(list,online);if(!TR.n)return`<tr><td colspan="6" class="mu" style="padding:14px">Nadie coincide con la búsqueda.${TQ.q||TQ.role||TQ.sc?' <button type="button" class="ib" data-tclr style="height:26px;font-size:12px">Limpiar filtros</button>':''}</td></tr>`;
     return TR.groups.map(g=>`<tr class="tgrp"><th colspan="6">${esc(TGRP[g.r])} <span class="mu">${g.rows.length}</span></th></tr>`+g.rows.map(([em,m])=>{const self=me&&em===me.email;const cd=(confirmDel[em]||0)>NOW();return `<tr><td>${isAdmin?`<input class="ci" data-mem="${esc(em)}" data-f="name" data-fk="m:${esc(em)}" value="${esc(m.name||'')}" placeholder="Nombre">`:esc(m.name||'')}</td><td class="mono">${em.startsWith('u_')?'<span class="pill neu">Ingreso por enlace / QR</span>':esc(em)}${self?' <span class="pill neu">tú</span>':''}</td>
     <td>${isAdmin&&!self&&!isOwnerEmail(em)?`<select class="ci" data-mem="${esc(em)}" data-f="role">${Object.entries(ROLE).map(([k,v])=>`<option value="${k}"${m.role===k?' selected':''}>${v}</option>`).join('')}</select>${m.role==='sc'||m.role==='capataz'?scCell(em,m):''}${m.role==='editor'?pisoCell(em,m):''}${m.role==='area'?areaCell(em,m):''}`:esc(ROLE[m.role]||m.role)+(m.role==='area'&&m.area?' · '+esc(m.area):'')+((m.role==='sc'||m.role==='capataz')&&memScs(m).length?' · '+memScs(m).map(i=>esc(conOf(i).name)).join(', '):'')+(m.role==='editor'&&memPisos(m).filter(id=>S.pis.has(id)).length?' · pisos a cargo: '+memPisos(m).filter(id=>S.pis.has(id)).map(id=>esc(S.pis.get(id).code)).join(', '):'')}</td>
     <td>${m.role==='admin'||isOwnerEmail(em)?'<span class="mu" title="El administrador siempre lo ve">✓ siempre</span>':m.role==='capataz'?'<span class="mu">—</span>':isAdmin?`<label class="chk"><input type="checkbox" data-mem="${esc(em)}" data-f="dash"${dashOn(m)?' checked':''}> Ve el tablero</label>`:(dashOn(m)?'✓':'')}</td>
     <td>${online.has(hashStr(em))?'<span class="pill ok">Conectado</span>':''}</td>
     <td>${isAdmin&&!self&&!isOwnerEmail(em)?`<button class="ib${cd?' warn':''}" data-mdel="${esc(em)}" style="height:26px;font-size:12px">${cd?'Confirmar':'Quitar acceso'}</button>`:''}</td></tr>`}).join('')).join('')})()}
   </tbody></table></div>${(()=>{const sr=pisosSinResp();return isAdmin&&sr.length&&S.pis.size?`<p class="note pad" style="margin:0">Pisos sin responsable: <b>${sr.map(p=>esc(p.code)).join(', ')}</b> · sus propuestas las resuelve solo el administrador.</p>`:''})()}</div>
   ${isAdmin?`<div class="card"><div class="hd">Datos del proyecto <span class="sub">${counts.pisos} pisos · ${counts.sectors} sectores · ${counts.ambientes} ambientes · ${counts.acts} actividades · ${counts.weeks} semanas congeladas · ${counts.restr} restricciones · ${planosLoaded?PLAN.size:'…'} planos</span></div>
    <div class="pad" style="display:flex;flex-direction:column;gap:10px">
     <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="ib" id="bbackup">Descargar respaldo de datos (JSON)</button><button class="ib" id="bbackup2" title="Incluye las láminas de planos y las fotos: el archivo puede pesar bastante">Respaldo completo con imágenes</button>${bkNote()}<span class="note">Guárdalo cada semana (y siempre antes de una carga o limpieza grande). Incluye todo: lookahead, registro diario, reportes de capataces, propuestas, versiones, planos del día, equipo e invitaciones.</span></div>
     <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label class="ib pri">Cargar datos desde archivo…<input type="file" id="fimport" accept=".json,application/json" hidden></label><span class="note" id="impmsg">${IMPMSG?esc(IMPMSG):'Usa el archivo de datos que te enviaron (por ejemplo <b>lookahead-real.json</b>) o un respaldo. Los registros con el mismo código se reemplazan; los demás no se tocan.'}</span></div>
    </div></div>`:''}
  ${invCard()}
  ${isAdmin?cleanCard():''}
  </div></div>`;
  wireClean(main);
  const f=$('#tadd',main);{const ti=$('.tinfo',main);if(ti)ti.ontoggle=()=>{TQ.info=ti.open}}
  main.oninput=e=>{const t=e.target;
    if(t.id==='tq'){TQ.q=t.value;render();return}
    if(t.id==='temail'){TF.em=t.value;return}if(t.id==='tname'){TF.nm=t.value;return}
    if(t.id==='trole'){TF.rl=t.value;const ss=$('#tsc',main);if(ss)ss.hidden=TF.rl!=='sc'&&TF.rl!=='capataz';const sa=$('#tar',main);if(sa)sa.hidden=TF.rl!=='area';return}
    if(t.id==='tar'){TF.ar=t.value;return}
    if(t.id==='tsc'){TF.sc=t.value;return}
    if(t.id==='tqsc'){TQ.sc=t.value;render();return}};
  if(f)f.onsubmit=async e=>{e.preventDefault();const em=$('#temail').value.trim().toLowerCase(),nm=$('#tname').value.trim(),rl=$('#trole').value,scv=$('#tsc').value,arv=($('#tar')||{}).value||'';if((rl==='sc'||rl==='capataz')&&!scv){toast('Elige la empresa / partida.');return}if(rl==='area'&&!arv){toast('Elige el área (Oficina Técnica, Calidad…).');return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){toast('Escribe un correo válido.');return}
    if(MEM.has(em)){toast('Ese correo ya está en el equipo.');return}
    try{await fcol('members').doc(em).set({role:rl,name:nm,...(rl==='sc'||rl==='capataz'?{sc:scv,scs:[scv]}:{}),...(rl==='area'?{area:arv}:{}),added:NOW(),addedBy:me.email});TF.em='';TF.nm='';toast(`${nm||em} agregado como ${ROLE[rl]}. Envíale el enlace de la página.`);render()}catch(err){toast('No se pudo agregar: '+(err.code||err.message))}};
  main.onchange=async e=>{const t=e.target;if(!t.dataset.mem||!isAdmin)return;t.dataset.o=t.value;
    if(t.dataset.f==='scadd'){if(!t.value)return;const m=MEM.get(t.dataset.mem)||{};const L=[...new Set([...memScs(m),t.value])];
      try{await fcol('members').doc(t.dataset.mem).update({scs:L,sc:L[0]});toast(`${conOf(t.value).name} agregada`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return}
    if(t.dataset.f==='pisoadd'){if(!t.value)return;const m=MEM.get(t.dataset.mem)||{};const L=[...new Set([...memPisos(m),t.value])];const p=S.pis.get(t.value);
      try{await fcol('members').doc(t.dataset.mem).update({pisos:L});toast(`${p?p.name:'Piso'} a cargo de ${m.name||t.dataset.mem}`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return}
    try{await fcol('members').doc(t.dataset.mem).update({[t.dataset.f]:t.type==='checkbox'?t.checked:t.dataset.f==='name'?t.value.trim():t.value,...(t.dataset.f==='role'&&t.value!=='sc'?{}:{})})}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}
    if(t.id==='fimport'){}};
  main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onclick=async e=>{let tb;if(e.target.closest('#bva')){vaDialog(e.target.closest('#bva'));return}if(e.target.closest('#bph')){phonePreview('iphone');return}if((tb=e.target.closest('[data-trole]'))){TQ.role=tb.dataset.trole;if(TQ.sc&&!list.some(([em,m])=>(!TQ.role||roleOfM(em,m)===TQ.role)&&memScs(m).includes(TQ.sc)))TQ.sc='';render();return}
    if(e.target.closest('[data-tclr]')){TQ.q='';TQ.role='';TQ.sc='';render();return}
    if(await invClick(e))return;const rm=e.target.closest('[data-scrm]');if(rm&&isAdmin){const[em,id]=rm.dataset.scrm.split('|');const m=MEM.get(em)||{};const L=memScs(m).filter(i=>i!==id);
      try{await fcol('members').doc(em).update({scs:L,sc:L[0]||''});toast(`${conOf(id).name} quitada`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return}
    const pr=e.target.closest('[data-pirm]');if(pr&&isAdmin){const[em,id]=pr.dataset.pirm.split('|');const m=MEM.get(em)||{};const L=memPisos(m).filter(i=>i!==id);
      try{await fcol('members').doc(em).update({pisos:L});toast(`${(S.pis.get(id)||{}).name||'Piso'} quitado`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return}
    const b=e.target.closest('[data-mdel]');if(b){const em=b.dataset.mdel;if((confirmDel[em]||0)>NOW()){confirmDel[em]=0;try{await fcol('members').doc(em).delete();toast('Acceso retirado a '+em)}catch(err){toast('No se pudo quitar: '+(err.code||err.message))}}else{confirmDel[em]=NOW()+4000;render();setTimeout(()=>{if(U.tab==='team')render()},4100)}return}
    if(e.target.id==='bbackup')backupJson(false);if(e.target.id==='bbackup2')backupJson(true)};
  const fi=$('#fimport',main);if(fi)fi.onchange=async()=>{const file=fi.files[0];fi.value='';if(file)await importJson(file)};
}
/* ---------- limpieza de datos de prueba ---------- */
const CL={sel:null,seen:new Set(),weeks:true,daily:true,restr:true,planos:false,plan:null,busy:false,msg:''};
const isFach=p=>p&&(p.id==='piso-fach'||/fachad/i.test(p.name||'')||/fachad/i.test(p.code||''));
function cleanPisoCounts(pid){const secs=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid);const ss=new Set(secs.map(s=>s.id));const ambs=[...S.amb.values()].filter(a=>ss.has(a.sectorId));const as=new Set(ambs.map(a=>a.id));const acts=[...S.act.values()].filter(x=>as.has(x.ambId));return{secs,ambs,acts}}
function cleanCard(){
  const ps=pisos();if(CL.sel===null){CL.sel=[];CL.seen=new Set()}for(const p of ps)if(!CL.seen.has(p.id)){CL.seen.add(p.id);if(!isFach(p)&&!/^r-/.test(p.id))CL.sel.push(p.id)}
  CL.sel=CL.sel.filter(id=>S.pis.has(id));
  const rows=ps.map(p=>{const c=cleanPisoCounts(p.id);const f=isFach(p);return `<label class="${f?'prot':''}"><input type="checkbox" data-clp="${p.id}"${CL.sel.includes(p.id)?' checked':''}${CL.busy?' disabled':''}><span><b>${esc(p.code)} · ${esc(p.name)}</b> — ${c.secs.length} sectores, ${c.ambs.length} ambientes, ${c.acts.length} actividades${f?' <span class="pill ok">se conserva</span>':''}</span></label>`}).join('');
  const pl=CL.plan;
  return `<div class="card"><div class="hd">Limpiar datos <span class="sub">borra pisos completos y lo que depende de ellos</span></div>
  <div class="pad clean" id="clean">
   <p class="note" style="margin:0 0 4px">Marca los pisos que quieres eliminar (con sus sectores, ambientes y actividades). Los pisos sin marcar no se tocan. <b>Antes descarga el respaldo completo</b> (botón de arriba): es la única forma de recuperar lo borrado.</p>
   ${rows||'<span class="note">No hay pisos.</span>'}
   <hr style="border:0;border-top:1px solid var(--line);margin:6px 0">
   <label><input type="checkbox" data-clo="weeks"${CL.weeks?' checked':''}${CL.busy?' disabled':''}><span>Planes semanales congelados y evaluaciones PPC de esos pisos</span></label>
   <label><input type="checkbox" data-clo="daily"${CL.daily?' checked':''}${CL.busy?' disabled':''}><span>Avance diario (Campo) y sus fotos de esos pisos</span></label>
   <label><input type="checkbox" data-clo="restr"${CL.restr?' checked':''}${CL.busy?' disabled':''}><span>Restricciones de las actividades borradas (y las que ya no tienen actividad)</span></label>
   <label><input type="checkbox" data-clo="planos"${CL.planos?' checked':''}${CL.busy?' disabled':''}><span>Planos asignados a esos pisos</span></label>
   <p class="note" style="margin:2px 0">El equipo, los subcontratistas, la configuración del proyecto y los demás pisos se conservan.</p>
   ${pl?`<div class="sum">Se borrarán <b>${pl.total}</b> registros: ${pl.parts.filter(x=>x[1]).map(([k,n])=>`${n} ${k}`).join(', ')||'nada'}.<br>${pl.fach?'<b style="color:var(--warn)">Atención: marcaste un piso de fachadas.</b><br>':''}Escribe <b>BORRAR</b> para confirmar: <input class="tin" id="clconf" autocomplete="off" style="width:110px;margin:6px 6px 0 0"><button class="ib warn" id="clgo"${CL.busy?' disabled':''}>Borrar definitivamente</button> <button class="ib" id="clcancel"${CL.busy?' disabled':''}>Cancelar</button></div>`:
   `<div><button class="ib" id="clprep"${CL.sel.length&&!CL.busy?'':' disabled'}>Revisar qué se borrará…</button></div>`}
   <span class="note" id="clmsg">${esc(CL.msg)}</span>
  </div></div>`}
async function cleanPlan(){
  const sel=new Set(CL.sel);const del=[];const actIds=new Set();let nS=0,nA=0,nX=0;
  for(const pid of sel){const c=cleanPisoCounts(pid);c.secs.forEach(x=>del.push(['sectors',x.id]));c.ambs.forEach(x=>del.push(['ambientes',x.id]));c.acts.forEach(x=>{del.push(['acts',x.id]);actIds.add(x.id)});del.push(['pisos',pid]);nS+=c.secs.length;nA+=c.ambs.length;nX+=c.acts.length}
  let nW=0,nD=0,nF=0,nR=0,nP=0;
  if(CL.weeks)for(const w of S.wk.values()){const pid=w.pisoId||String(w.id).split('_').slice(1).join('_');if(sel.has(pid)){del.push(['weeks',w.id]);nW++}}
  if(CL.restr)for(const q of S.res.values()){if(actIds.has(q.actId)||!S.act.has(q.actId)){del.push(['restr',q.id]);nR++}}
  if(CL.daily){const sn=await fcol('daily').get();sn.docs.forEach(d=>{const v=d.data();const pid=v.pisoId||d.id.split('_').slice(1).join('_');if(!sel.has(pid))return;del.push(['daily',d.id]);nD++;
    const ph=new Set();Object.values(v.recs||{}).forEach(r=>(r&&r.photos||[]).forEach(f=>ph.add(f)));Object.values(v.extra||{}).forEach(r=>(r&&r.photos||[]).forEach(f=>ph.add(f)));ph.forEach(f=>{del.push(['fotos',f]);nF++})})}
  if(CL.planos){ensurePlanos();const sn=await fcol('planos').get();sn.docs.forEach(d=>{if(sel.has(d.data().pisoId)){del.push(['planos',d.id]);nP++}})}
  return{del,total:del.length,fach:[...sel].some(id=>isFach(S.pis.get(id))),parts:[['pisos',sel.size],['sectores',nS],['ambientes',nA],['actividades',nX],['semanas',nW],['restricciones',nR],['días de avance',nD],['fotos',nF],['planos',nP]]}}
async function cleanRun(){
  const pl=CL.plan;if(!pl)return;CL.busy=true;CL.msg='Borrando…';render();let done=0;
  try{for(let i=0;i<pl.del.length;i+=400){const b=db.batch();pl.del.slice(i,i+400).forEach(([c,id])=>b.delete(fcol(c).doc(id)));await b.commit();done+=Math.min(400,pl.del.length-i);CL.msg=`Borrados ${done} de ${pl.total}…`;const m=$('#clmsg');if(m)m.textContent=CL.msg}
    for(const[c,id]of pl.del){const k=COLS[c];if(k){S[k].delete(id);if(ARCH[k])ARCH[k].delete(id)}if(c==='daily')DAY.delete(id)}doneRebuild();
    if(U.piso&&!S.pis.has(U.piso)){U.piso='';saveUI()}
    CL.msg=`Listo: ${pl.total} registros borrados. Ahora puedes cargar el archivo nuevo con “Cargar datos desde archivo…”.`;toast('Limpieza terminada');undoS.length=0;redoS.length=0;updUndo()}
  catch(err){CL.msg=`Se detuvo tras borrar ${done} registros (${err.code||err.message}). Puedes volver a intentarlo: lo ya borrado no se repite.`;toast('La limpieza se detuvo')}
  CL.busy=false;CL.plan=null;CL.sel=null;render()}
function wireClean(main){const box=$('#clean',main);if(!box)return;
  box.onchange=e=>{const t=e.target;if(t.dataset.clp){const id=t.dataset.clp;CL.sel=t.checked?[...new Set([...CL.sel,id])]:CL.sel.filter(x=>x!==id);CL.plan=null;render()}else if(t.dataset.clo){CL[t.dataset.clo]=t.checked;CL.plan=null;render()}};
  box.onclick=async e=>{const t=e.target;
    if(t.id==='clprep'){t.disabled=true;t.textContent='Contando…';try{CL.plan=await cleanPlan();CL.msg=''}catch(err){CL.msg='No se pudo revisar: '+(err.code||err.message)}render();setTimeout(()=>{const i=$('#clconf');i&&i.focus()},0)}
    else if(t.id==='clcancel'){CL.plan=null;CL.msg='';render()}
    else if(t.id==='clgo'){const v=($('#clconf').value||'').trim().toUpperCase();if(v!=='BORRAR'){toast('Escribe BORRAR para confirmar.');$('#clconf').focus();return}cleanRun()}};
  box.onkeydown=e=>{if(e.target.id==='clconf'&&e.key==='Enter'){e.preventDefault();$('#clgo').click()}};
}
let IMPMSG='';
function fixDoc(col,d){d=clone(d);delete d.id;if(col==='meta'&&Array.isArray(d.templates))d.templates=d.templates.map(t=>({...t,acts:(t.acts||[]).map(a=>Array.isArray(a)?{sc:a[0],name:a[1]}:a)}));return d}
async function importJson(file){
  let data;try{data=JSON.parse(await file.text())}catch(e){toast('El archivo no es un JSON válido.');return}
  const cols=data&&data.colecciones;if(!cols||typeof cols!=='object'){toast('El archivo no tiene el formato esperado (datos-iniciales.json o un respaldo de esta página).');return}
  const writes=[];for(const[col,docs]of Object.entries(cols)){if(!(col in COLS||BK_ALL.includes(col))||!docs)continue;if((col==='members'||col==='inv')&&!isAdmin)continue;for(const[id,doc]of Object.entries(docs))writes.push([col,id,fixDoc(col,doc)])}
  const dels=[];for(const[col,ids]of Object.entries(data.eliminar||{})){if(!(col in COLS)||!Array.isArray(ids))continue;ids.forEach(id=>dels.push([col,id]))}
  if(!writes.length&&!dels.length){toast('El archivo no contiene registros.');return}
  if(data.tipo==='actualizacion'){const falta=((data.requiere||{}).pisos||[]).filter(id=>!S.pis.has(id));
    if(falta.length){IMPMSG='Esta actualización es para el lookahead ya cargado, pero en la página no están los pisos '+falta.join(', ')+'. Carga primero el lookahead completo.';const m=$('#impmsg');if(m)m.textContent=IMPMSG;toast('Falta cargar primero el lookahead completo.');return}
    if(!confirm(`${data.resumen?data.resumen+'\n\n':''}Se actualizarán ${writes.length} registros y se eliminarán ${dels.length}. Las demás actividades (y lo que hayas corregido en ellas) no se tocan.\n\n¿Continuar?`))return}
  const msg=$('#impmsg');let done=0;
  try{await batchWrites(writes,n=>{done=n;IMPMSG=`Cargados ${done} de ${writes.length} registros…`;const m2=$('#impmsg');if(m2)m2.textContent=IMPMSG});
    await batchWrites(dels.map(([c,id])=>[c,id,null]));
    dels.forEach(([c,id])=>S[COLS[c]].delete(id));if(dels.length)requestRender();
    const newCon=new Set(Object.keys(cols.contractors||{}));const miss=new Set();Object.values(cols.acts||{}).forEach(a=>{if(a&&a.sc&&!S.con.has(a.sc)&&!newCon.has(a.sc))miss.add(a.sc)});
    const nObs=Object.values(cols.acts||{}).filter(a=>a&&a.obs).length;
    const extra=(miss.size?` Ojo: ${miss.size} subcontratista(s) no existen en Configuración (${[...miss].join(', ')}); esas actividades se verán sin color hasta que los crees.`:'')+(nObs?` Hay ${nObs} actividades con observaciones para revisar: en el Lookahead marca “Con observaciones”.`:'');
    toast(`Datos cargados: ${writes.length} registros.`);IMPMSG=`Listo: ${writes.length} registros cargados${dels.length?` y ${dels.length} eliminados`:''}.`+extra;const m2=$('#impmsg');if(m2)m2.textContent=IMPMSG}
  catch(err){IMPMSG='';toast('La carga se detuvo: '+(err.code||err.message)+'. Puedes volver a intentarlo; no se duplican registros.')}
}
