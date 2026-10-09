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
/* imágenes de sectorización antiguas (colección planos): se conservan en una sección plegada de Sectorización */
function planosOldCard(){ensurePlanos();const list=[...PLAN.values()].filter(p=>!U.piso||!p.pisoId||p.pisoId===U.piso).sort((a,b)=>(a.order||0)-(b.order||0));
  if(planosLoaded&&!list.length&&!canWrite)return'';
  const popt=sel=>'<option value="">Todos los pisos</option>'+pisos().map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('');
  let h=`<details class="card szold"${SZ.old?' open':''}><summary class="hd">Imágenes de sectorización anteriores <span class="sub">${list.length} · ya no se usan para ubicar; quedan como referencia</span></summary><div class="pad">
   ${canWrite?'<label class="ib">+ Subir imagen<input type="file" id="pup" accept="image/*" multiple hidden></label> <span class="note" id="pmsg">Para ubicar ambientes usa la lámina del piso (arriba).</span>':''}`;
  if(!planosLoaded)h+='<div class="empty">Cargando…</div>';
  else if(planosErr)h+=`<div class="callout">No se pudieron leer (${esc(planosErr)}).</div>`;
  else if(list.length)h+='<div class="planos">'+list.map(p=>{const cd=(confirmPlano[p.id]||0)>NOW();return`<figure class="plano"><img src="${p.data}" alt="${esc(p.title)}" data-pv="${p.id}" loading="lazy"><figcaption><input value="${esc(p.title)}" data-pt="${p.id}" data-fk="pt:${p.id}" aria-label="Título del plano"${canWrite?'':' readonly'}></figcaption>
    ${canWrite?`<div class="ptools"><select data-pp="${p.id}" aria-label="Piso del plano">${popt(p.pisoId||'')}</select><span style="flex:1"></span><button class="ib${cd?' warn':''}" data-pdel="${p.id}" style="height:28px;font-size:12px">${cd?'Confirmar':'Eliminar'}</button></div>`:(p.pisoId?`<div class="ptools note">${esc(S.pis.get(p.pisoId)?.name||'')}</div>`:'')}</figure>`}).join('')+'</div>';
  return h+'</div></details>'}
async function planosOldClick(e){const im=e.target.closest('img[data-pv]');if(im){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-z="1">Tamaño real</button><button class="ib" data-x="1">Cerrar</button></div><img src="${im.src}" alt="">`;
    lb.onclick=ev=>{if(ev.target.dataset.z){const i=lb.querySelector('img');i.classList.toggle('full');ev.target.textContent=i.classList.contains('full')?'Ajustar a pantalla':'Tamaño real'}else if(ev.target.dataset.x||ev.target===lb)lb.remove()};
    document.addEventListener('keydown',function k(ev){if(ev.key==='Escape'){lb.remove();document.removeEventListener('keydown',k)}});document.body.appendChild(lb);return true}
  const d=e.target.closest('[data-pdel]');if(d){const id=d.dataset.pdel;if((confirmPlano[id]||0)>NOW()){confirmPlano[id]=0;try{await fcol('planos').doc(id).delete();toast('Imagen eliminada')}catch(err){toast('No se pudo eliminar: '+(err.code||err.message))}}else{confirmPlano[id]=NOW()+4000;render();setTimeout(()=>{if(U.tab==='planos')render()},4100)}return true}
  return false}
async function planosOldChange(e){const t=e.target;
  if(t.dataset.pt){try{await fcol('planos').doc(t.dataset.pt).update({title:t.value.trim()});t.dataset.o=t.value}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return true}
  if(t.dataset.pp){try{await fcol('planos').doc(t.dataset.pp).update({pisoId:t.value})}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return true}
  if(t.id==='pup'&&t.files.length){const files=[...t.files];t.value='';const msg=$('#pmsg');let n=0;
    for(const f of files){try{if(msg)msg.textContent=`Comprimiendo y subiendo ${f.name}…`;const data=await shrinkImage(f);const id=uid('plano');
      await fcol('planos').doc(id).set({title:f.name.replace(/\.[^.]+$/,''),pisoId:U.piso||'',order:NOW(),data,by:me.email});n++}
      catch(err){toast(`No se pudo subir ${f.name}: ${err.code||err.message}`)}}
    if(n)toast(`${n} imagen(es) subidas.`);return true}
  return false}

/* ================= CONFIGURACIÓN ================= */
/* Configuración por secciones (oct 2026, como Equipo): U.cfgV */
const CFGV=()=>[['sc','Subcontratistas'],['esp','Especialidades'],['tpl','Plantillas'],['rst','Causas y restricciones'],['cal','Calendario'],['cld','Calidad'],['pry','Proyecto'],...(canWrite&&!PM()?[['arc','Papelera']]:[])];
const cfgV=()=>CFGV().some(([k])=>k===U.cfgV)?U.cfgV:'sc';
function cfgSeg(){const v=cfgV();return`<span class="seg tseg" role="tablist" aria-label="Secciones de Configuración">${CFGV().map(([k,l])=>`<button type="button" role="tab" data-cfgv="${k}" class="${v===k?'on':''}" aria-selected="${v===k}">${l}</button>`).join('')}</span>`}
function renderCfg(main){
  if(typeof ensureMcat==='function')ensureMcat();const tally=espCatTally();
  const p=P();const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));const use={};for(const x of S.act.values())use[x.sc]=(use[x.sc]||0)+1;
  const ro=canWrite?'':' readonly',dis=canWrite?'':' disabled';
  const tpls=(p.templates||[]).map(t=>({...t,acts:(t.acts||[]).map(a=>Array.isArray(a)?{sc:a[0],name:a[1]}:a)}));
  const conSel=(sel,ti,ai)=>`<select data-tsc="${ti}:${ai}"${dis}>${cons.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
  const cv=cfgV();
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Configuración','Datos de la obra que usan todas las pestañas')}
  ${canWrite?'':`<div class="callout">Tu rol es ${esc(ROLE[me.role]||me.role)}: puedes ver la configuración pero no cambiarla.</div>`}
  ${cfgSeg()}
  ${cv==='sc'?`  <div class="card"><h2>Subcontratistas <span class="sub">El color pinta las barras del lookahead y los reportes</span></h2><div class="tscroll"><table class="t rt"><thead><tr><th>Color</th><th>Nombre</th><th>Partida</th><th title="Una por subcontratista (si hace dos, regístralo como dos). Sale en el catálogo, el AR y los indicadores">Especialidad</th><th>Actividades</th><th></th></tr></thead><tbody>
   ${cons.map(c=>`<tr><td data-l="Color"><input type="color" data-c="${c.id}" data-f="color" value="${esc(c.color)}"${dis} aria-label="Color de ${esc(c.name)}"></td><td data-l="Nombre"><input class="ci" data-c="${c.id}" data-f="name" data-fk="c:${c.id}:n" value="${esc(c.name)}"${ro}></td><td data-l="Partida"><input class="ci" data-c="${c.id}" data-f="partida" data-fk="c:${c.id}:p" value="${esc(c.partida||'')}"${ro}></td><td data-l="Especialidad"><select data-c="${c.id}" data-f="esp" aria-label="Especialidad de ${esc(c.name)}"${dis}>${espOpts(c.esp||'')}</select>${espScHint(c,tally)}</td><td class="mono" data-l="Actividades">${use[c.id]||0}</td><td>${canWrite&&!use[c.id]?`<button class="ab" data-cdel="${c.id}" aria-label="Eliminar" title="Eliminar (no tiene actividades)">&times;</button>`:''}</td></tr>`).join('')}
  </tbody></table></div>${canWrite?'<div class="pad"><button class="ib" id="cadd">+ Subcontratista</button></div>':''}</div>`:''}
  ${cv==='esp'?espCard():''}
  ${cv==='tpl'?`  <div class="card"><h2>Plantillas de ambiente <span class="sub">Se usan en “+ Ambiente” para crear varias actividades de una vez</span></h2><div class="pad"><div class="tpls">
   ${tpls.map((t,ti)=>`<div class="tplc"><div class="row"><input class="tn" data-tname="${ti}" value="${esc(t.name)}" aria-label="Nombre de la plantilla"${ro}>${canWrite?`<button class="ab" data-tdel="${ti}" title="Eliminar plantilla" aria-label="Eliminar plantilla">&times;</button>`:''}</div>
     ${t.acts.map((a,ai)=>`<div class="row">${conSel(a.sc,ti,ai)}<input class="an" data-tact="${ti}:${ai}" value="${esc(a.name)}" placeholder="Actividad" list="lqdl-${esc(a.sc||'')}"${ro}>${canWrite?`<button class="ab" data-tadel="${ti}:${ai}" aria-label="Quitar actividad">&times;</button>`:''}</div>`).join('')}
     ${canWrite?`<div class="row"><button class="ib" data-taadd="${ti}" style="height:26px;font-size:12px">+ Actividad</button><button class="ib" data-tup="${ti}" style="height:26px;font-size:12px">Subir</button></div>`:''}</div>`).join('')}
   </div>${tplDatalists(tpls)}${canWrite?'<div style="margin-top:10px"><button class="ib" id="tnew">+ Nueva plantilla</button></div>':''}<p class="note" style="margin:8px 0 0">Al escribir una actividad se sugieren los nombres que ya usa el lookahead. ◆ indica que requiere liberación de calidad; “≈ usar…” corrige un nombre parecido para que los ambientes nuevos hereden su liberación.</p></div></div>`:''}
  ${cv==='rst'?`<div class="cfg">   <div class="card"><h2>Causas de no cumplimiento</h2><div class="pad"><textarea class="box" data-l="cnc" aria-label="Causas, una por línea"${ro}>${esc((p.cnc||[]).join('\n'))}</textarea><p class="note">Una por línea. Se guarda al salir del cuadro. Por defecto es el <b>cuadro de causas de la empresa</b> (11 códigos); cada causa muestra su código en las listas y en el Excel del PPC.</p>${canWrite&&(p.cnc||[]).join('|')!==CNC_STD.map(o=>o.n).join('|')?`<button class="ib" data-cncstd="1">Usar el cuadro de causas de la empresa</button>`:''}
     <h3 class="cimph">¿Imputable al subcontratista?</h3><p class="note" style="margin-top:0">Si la causa no depende del subcontratista (p. ej. actividad previa), su incumplimiento no le baja el <b>PPC del SC</b>. En Campo se puede corregir caso por caso.</p>
     <div class="cimpl">${(p.cnc||[]).map(k=>{const v=cncImp(k);const o=cncStd(k);return`<div class="cimpr"><span><b class="mono" style="display:inline-block;min-width:52px">${esc(cncCode(k))}</b>${esc(k)}${o?`<span class="note" style="display:block;margin-left:56px">${esc(o.d.join(' '))}</span>`:''}</span><span class="seg"><button data-cimpc="${esc(k)}" data-v="1" class="${v?'on':''}"${dis}>Sí</button><button data-cimpc="${esc(k)}" data-v="0" class="${v?'':'on'}"${dis}>No</button></span></div>`}).join('')}</div></div></div>
   <div class="card"><h2>Tipos de restricción</h2><div class="pad"><textarea class="box" data-l="restrTypes" aria-label="Tipos, uno por línea"${ro}>${esc((p.restrTypes||[]).join('\n'))}</textarea><p class="note">Uno por línea. Se guarda al salir del cuadro.</p></div></div>
   <div class="card"><h2>Clase de cada tipo de restricción</h2><div class="pad"><p class="note">Operativa de campo: se resuelve en la obra (materiales, mano de obra, equipos, actividad previa). Otras áreas: depende de OT, Ingeniería, Logística, etc. Cada restricción puede cambiarse por separado.</p>
     <div class="cimpl">${(p.restrTypes||[]).map(k=>{const g=typeGrp(k);return`<div class="cimpr"><span>${esc(k)}</span><span class="seg"><button data-rgrpc="${esc(k)}" data-v="campo" class="${g==='campo'?'on':''}"${dis}>Campo</button><button data-rgrpc="${esc(k)}" data-v="area" class="${g==='area'?'on':''}"${dis}>Otras áreas</button></span></div>`}).join('')}</div></div></div>
   <div class="card"><h2>Áreas de apoyo</h2><div class="pad"><textarea class="box" data-l="restrAreas" aria-label="Áreas, una por línea"${ro}>${esc(restrAreasL().join('\n'))}</textarea><p class="note">Una por línea (OT, Ingeniería…). Se ofrecen al marcar una restricción como “Otras áreas”.</p></div></div>
  </div>`:''}
  ${cv==='cal'?calCard():''}
  ${cv==='cld'?`<div class="cfg">   <div class="card"><h2>Inspectores de calidad</h2><div class="pad"><textarea class="box" id="cfgInsp" aria-label="Inspectores, uno por línea"${canLibCfg()?'':' disabled'}>${esc(libInsp().join('\n'))}</textarea><p class="note">Uno por línea. Se eligen al programar una liberación y sirven para filtrar la agenda de cada uno. La editan Calidad y el administrador.</p></div></div></div>`:''}
  ${cv==='pry'?`  <div class="card"><h2>Proyecto ${isAdmin?'':'<span class="sub">Solo el administrador puede cambiar estos datos</span>'}</h2><div class="pad frm">
   <label for="p_name">Nombre corto</label><input id="p_name" data-p="name" value="${esc(p.name)}"${isAdmin?'':' readonly'}>
   <label for="p_full">Proyecto</label><textarea id="p_full" data-p="fullName" rows="3"${isAdmin?'':' readonly'}>${esc(p.fullName)}</textarea>
   <label for="p_owner">Propietario</label><input id="p_owner" data-p="owner" value="${esc(p.owner)}"${isAdmin?'':' readonly'}>
   <label for="p_loc">Ubicación</label><input id="p_loc" data-p="location" value="${esc(p.location)}"${isAdmin?'':' readonly'}>
   <label for="p_code">Código del formato</label><input id="p_code" data-p="code" value="${esc(p.code)}"${isAdmin?'':' readonly'}>
   <label for="p_ppc">Código del formato PPC</label><input id="p_ppc" data-p="ppcCode" value="${esc(p.ppcCode||'GP-PR02-F-10')}"${isAdmin?'':' readonly'}>
   <label for="p_rw">Semana de referencia</label><input id="p_rw" data-p="refWeek" type="number" value="${p.refWeek}"${isAdmin?'':' readonly'}>
   <label for="p_rd">Lunes de esa semana</label><input id="p_rd" data-p="refDate" type="date" value="${p.refDate}"${isAdmin?'':' readonly'}>
   <label for="p_pcd">Propuestas de SC: día de corte</label><select id="p_pcd" data-p="propCutDow"${isAdmin?'':' disabled'}>${(()=>{const c=propCutCfg();return[1,2,3,4,5,6,0].map(d=>`<option value="${d}"${c.dow===d?' selected':''}>${DOW_N[d][0].toUpperCase()+DOW_N[d].slice(1)} antes de la semana</option>`).join('')})()}</select>
   <label for="p_pch">Propuestas de SC: hora de corte</label><input id="p_pch" data-p="propCutHH" type="time" value="${esc(propCutCfg().hh)}"${isAdmin?'':' readonly'}>
   <label for="p_fin">Fin de obra (fecha meta)</label><input id="p_fin" data-p="finObra" type="date" value="${esc(P().finObra||'')}"${isAdmin?'':' readonly'} title="El Tablero marca en rojo a los subcontratistas que, a su ritmo actual, no terminan antes de esta fecha">
   <label for="p_plc">Plan diario: publicación automática (si nadie publicó)</label><input id="p_plc" data-p="planCutHH" type="time" max="23:30" step="900" value="${esc(planCutHH())}"${isAdmin?'':' readonly'} title="El plan del día hábil siguiente se publica solo a esta hora (hasta las 23:30): se aplican los cambios de la reunión y las propuestas sin revisar se rechazan">
   <label>Logo de la empresa (Excel)</label><span class="logoc">${logoPrev('logoE')}${isAdmin?'<label class="ib"><input type="file" accept="image/png,image/jpeg" data-logo="logoE" hidden>Subir…</label>':''}</span>
   <label>Logo del cliente (Excel)</label><span class="logoc">${logoPrev('logoC')}${isAdmin?'<label class="ib"><input type="file" accept="image/png,image/jpeg" data-logo="logoC" hidden>Subir…</label>':''}</span>
  </div><p class="pad note" style="padding-top:0">La numeración de semanas se calcula desde la semana y el lunes de referencia (hoy: semana ${P().refWeek} = ${fmtD(P().refDate)}). Las propuestas que tocan una semana y se envían después de su corte (hora de Lima) se marcan «fuera de plazo»: llegan igual, y para aceptarlas se pide el motivo.</p></div>`:''}
  ${cv==='arc'?archCard():''}
  </div></div>`;
  calWire(main);espWire(main);
  const saveP=ch=>apply([op('meta','project',{...P(),...ch})]);
  const saveT=fn=>{const t=clone(tpls);fn(t);saveP({templates:t})};
  main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onchange=e=>{const t=e.target;if(t.id==='cfgInsp'){if(canLibCfg()){const L=[...new Set(t.value.split('\n').map(x=>x.trim()).filter(Boolean))];libmPut({insp:L},`${L.length} inspector(es) guardados`)}return}if(!canWrite)return;
    if(t.dataset.logo&&t.files&&t.files[0]){logoUpload(t.dataset.logo,t.files[0]);return}
    if(t.dataset.p){if(!isAdmin)return;let v=t.value;if(t.dataset.p==='refWeek')v=parseInt(v,10)||P().refWeek;if(t.dataset.p==='propCutDow')v=parseInt(v,10);if(t.dataset.p==='propCutHH'&&!/^\d\d:\d\d$/.test(v)){t.value=propCutCfg().hh;return}if(t.dataset.p==='planCutHH'&&!(/^\d\d:\d\d$/.test(v)&&v<='23:30')){toast('Elige una hora hasta las 23:30.');t.value=planCutHH();return}if(t.dataset.p==='refDate'&&pd(v).getUTCDay()!==1){toast('La fecha de referencia debe ser un lunes.');t.value=P().refDate;return}saveP({[t.dataset.p]:v})}
    else if(t.dataset.c&&t.dataset.f==='esp'){const c=S.con.get(t.dataset.c);espPick(t,c.esp).then(v=>{if(v==null||v===(c.esp||''))return;const cur=S.con.get(c.id);if(cur)apply([op('contractors',c.id,{...cur,esp:v})],`${cur.name}: especialidad «${espN(v)||'—'}»`)})}
    else if(t.dataset.c){const c=S.con.get(t.dataset.c);let v=t.value;if(t.dataset.f==='name'){v=v.trim().toUpperCase();if(!v){t.value=c.name;return}}apply([op('contractors',c.id,{...c,[t.dataset.f]:v})])}
    else if(t.dataset.l){saveP({[t.dataset.l]:t.value.split('\n').map(x=>x.trim()).filter(Boolean)})}
    else if(t.dataset.tname!=null){saveT(a=>{a[+t.dataset.tname].name=t.value.trim()||'Plantilla'})}
    else if(t.dataset.tsc){const[i,j]=t.dataset.tsc.split(':').map(Number);saveT(a=>{a[i].acts[j].sc=t.value})}
    else if(t.dataset.tact){const[i,j]=t.dataset.tact.split(':').map(Number);saveT(a=>{a[i].acts[j].name=t.value.trim()})}};
  main.onclick=e=>{const b=e.target.closest('button');if(b&&b.dataset.cfgv){U.cfgV=b.dataset.cfgv;saveUI();render();return}if(!b||!canWrite)return;
    if(b.dataset.rgrpc!=null){saveP({restrGrp:{...(P().restrGrp||{}),[b.dataset.rgrpc]:b.dataset.v}});return}
    if(b.dataset.cncstd){saveP({cnc:CNC_STD.map(o=>o.n),cncStd:CNC_STD_V});toast('Causas: cuadro de la empresa (los registros anteriores conservan su causa).');return}
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
function scCell(em,m){const L=memScs(m);const all=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));const rest=all.filter(c=>!L.includes(c.id));
  return`<div class="scchips">${L.map(i=>`<span class="scchip" style="--c:${esc(conOf(i).color)}"><i></i>${esc(conOf(i).name)}<button data-scrm="${esc(em)}|${esc(i)}" aria-label="Quitar ${esc(conOf(i).name)}" title="Quitar">&times;</button></span>`).join('')}</div>
   <select class="ci" data-mem="${esc(em)}" data-f="scadd" aria-label="Agregar empresa o partida"${L.length?'':' style="border:1px solid var(--bad)"'}><option value="">${L.length?'+ Agregar otra empresa / partida…':'— elige la empresa —'}</option>${rest.map(c=>`<option value="${c.id}">${esc(c.name)}${c.partida?' · '+esc(c.partida):''}</option>`).join('')}</select>`}
/* buscador y filtros del equipo; borrador del formulario "Agregar" (sobrevive a las actualizaciones automáticas de la pantalla) */
/* «Publica tareo» (members.tpub): el editor que es jefe de producción ve el módulo Tareo y, en la fase 3, publica el consolidado */
const tpubCell=(em,m)=>`<label class="chk tpubc" title="Ve el módulo Tareo y publica el consolidado del día (jefe de producción)"><input type="checkbox" data-mem="${esc(em)}" data-f="tpub"${m.tpub===true?' checked':''}> Publica tareo</label>`;
const TQ={q:'',role:'',sc:''};const TF={em:'',nm:'',rl:'editor',sc:'',ar:''};
const TROLES=['admin','editor','planner','campo','sc','capataz','area','veedor','lector','tasis','tcap','tcos'];
const TGRP={admin:'Administradores',editor:'Editores (ingenieros de producción)',planner:'Planner (plan maestro retirado: ve como lector)',campo:'Campo (ingenieros de campo)',sc:'Subcontratistas',capataz:'Capataces',area:'Áreas de apoyo (Oficina Técnica, Calidad…)',veedor:'Veedores',lector:'Lectores',tasis:'Tareo · asistentes de tareo',tcap:'Tareo · capataces del consorcio',tcos:'Tareo · costos'};
const fold=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const roleOfM=(em,m)=>isOwnerEmail(em)?'admin':(m&&m.role)||'lector';
function teamRows(list,online){const q=fold(TQ.q).trim();const words=q?q.split(/\s+/):[];
  const hay=(em,m)=>fold([m.name,em.startsWith('u_')?'':em,ROLE[roleOfM(em,m)],m.area||'',...memScs(m).map(i=>conOf(i).name+' '+(conOf(i).partida||'')),...memPisos(m).map(id=>{const p=S.pis.get(id);return p?p.code+' '+p.name:''})].join(' '));
  const L=list.filter(([em,m])=>(!TQ.role||roleOfM(em,m)===TQ.role)&&(!TQ.sc||memScs(m).includes(TQ.sc))&&(!words.length||words.every(w=>hay(em,m).includes(w))));
  const scName=m=>memScs(m).map(i=>conOf(i).name).sort()[0]||'~';
  const by=r=>L.filter(([em,m])=>roleOfM(em,m)===r).sort((a,b)=>(r==='sc'||r==='capataz'?scName(a[1]).localeCompare(scName(b[1])):0)||(a[1].name||a[0]).localeCompare(b[1].name||b[0]));
  return{n:L.length,groups:TROLES.map(r=>({r,rows:by(r)})).filter(g=>g.rows.length)}}
/* Equipo reorganizado (oct 2026, pedido del dueño: «muy largo, desordenado, listas largas»):
   secciones (U.teamV): Personas · Capataces (enlaces/QR) · Datos y respaldo · Limpieza (las tres últimas, solo administrador).
   Personas: una línea por persona (nombre y correo, alcance en chips, permisos en píldoras); todo lo editable va en la ficha
   «✎ Editar» (teamEdit, ventana lqModal) con los mismos campos data-mem/data-f de antes. */
const TEAMV=[['per','Personas'],['cap','Capataces (enlaces)'],['dat','Datos y respaldo'],['cln','Limpieza']];
const teamV=()=>isAdmin&&TEAMV.some(([k])=>k===U.teamV)?U.teamV:'per';
let TEDIT=null;
const TEAM_HELP=`<p><b>Para sumar a alguien:</b> agrégalo con su correo, envíale el enlace de esta página y pídele que pulse <b>«¿Primera vez? Crear mi cuenta»</b> con ese mismo correo y confirme el correo que le llegará. Solo los correos de la lista pueden entrar.</p>
 <p><b>Editor</b>: edita el lookahead, el plan semanal y las restricciones; con <b>pisos a cargo</b> resuelve las propuestas de los SC de esos pisos (piso sin responsable: cualquier editor). <b>Campo</b>: registra el avance diario, sin modificar el lookahead. <b>Subcontratista</b>: propone y dibuja el plan del día de su empresa (si tiene varias partidas, agrégalas todas). <b>Área de apoyo</b> (Oficina Técnica, Calidad…): ve todo y resuelve las restricciones de su área. <b>Veedor</b>: registra en Campo › Plano el trabajo no programado. <b>Lector</b>: solo consulta. <b>Administrador</b>: además gestiona el equipo y los datos.</p>
 <p><b>Tareo</b> (módulo aparte): <b>Capataz (tareo)</b> llena el tareo de su cuadrilla, <b>Asistente de tareo</b> mantiene el personal y las partidas, <b>Costos</b> consulta; al editor jefe de producción márcale <b>Publica tareo</b>.</p>`;
/* chips de alcance y píldoras de permisos de una persona (solo lectura; se cambian en la ficha) */
function teamScope(em,m){const r=roleOfM(em,m);const L=[];
  if(r==='sc'||r==='capataz'){const S_=memScs(m).filter(i=>S.con.has(i));S_.forEach(i=>L.push(`<span class="scchip ro" style="--c:${esc(conOf(i).color)}"><i></i>${esc(conOf(i).name)}</span>`));if(!S_.length)L.push('<span class="pill bad">Falta la empresa</span>')}
  if(r==='editor'){const P_=memPisos(m).filter(id=>S.pis.has(id));P_.forEach(id=>L.push(`<span class="pill neu" title="${esc(S.pis.get(id).name)}">${esc(S.pis.get(id).code)}</span>`));if(!P_.length)L.push('<span class="mu">sin pisos a cargo</span>')}
  if(r==='area')L.push(m.area?`<span class="pill neu">${esc(m.area)}</span>`:'<span class="pill bad">Falta el área</span>');
  return L.join(' ')}
function teamPerms(em,m){const r=roleOfM(em,m);if(r==='admin')return'<span class="mu">todo</span>';const L=[];
  if(r!=='capataz'&&!TAR_ROLES.includes(r)&&dashOn(m))L.push('<span class="pill neu">Tablero</span>');
  if(CLI_ROLES.includes(r)&&m.cli===true)L.push('<span class="pill neu">Versión cliente</span>');
  if(r==='editor'&&m.tpub===true)L.push('<span class="pill neu">Publica tareo</span>');
  return L.join(' ')}
/* ficha de una persona: todo lo editable (mismos data-mem/data-f que antes, así sirven los mismos manejadores) */
function teamEdit(em){const m=MEM.get(em);if(!m||!isAdmin){TEDIT=null;lqClose();return}TEDIT=em;const self=me&&em===me.email;const own=isOwnerEmail(em);const lock=self||own;const r=roleOfM(em,m);
  lqModal(`<div class="lqtop"><b>${esc(m.name||em)}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <div class="tedf">
    <label><span class="fgl">Nombre</span><input class="tin" id="ted-name" data-mem="${esc(em)}" data-f="name" value="${esc(m.name||'')}" placeholder="Nombre y apellido"></label>
    <div class="note mono">${em.startsWith('u_')?'Ingreso por enlace / QR':esc(em)}${self?' · tú':''}</div>
    <label><span class="fgl">Rol</span>${lock?`<b>${esc(ROLE[r]||r)}</b>${own&&!self?' <span class="mu">(dueño: siempre administrador)</span>':''}`:`<select class="tin" data-mem="${esc(em)}" data-f="role">${Object.entries(ROLE).map(([k,v])=>`<option value="${k}"${m.role===k?' selected':''}>${v}</option>`).join('')}</select>`}</label>
    ${!lock&&(m.role==='sc'||m.role==='capataz')?`<div><span class="fgl">Empresa / partida</span>${scCell(em,m)}</div>`:''}
    ${!lock&&m.role==='editor'?`<div><span class="fgl">Pisos a cargo</span>${pisoCell(em,m)}</div>`:''}
    ${!lock&&m.role==='area'?`<label><span class="fgl">Área</span>${areaCell(em,m)}</label>`:''}
    ${r==='admin'?'':`<div class="tedp"><span class="fgl">Permisos</span>
      ${m.role==='capataz'||TAR_ROLES.includes(m.role)?'':`<label class="chk"><input type="checkbox" data-mem="${esc(em)}" data-f="dash"${dashOn(m)?' checked':''}> Ve el Tablero</label>`}
      ${CLI_ROLES.includes(m.role)?`<label class="chk"><input type="checkbox" data-mem="${esc(em)}" data-f="cli"${m.cli===true?' checked':''}> Versión cliente <small class="mu">(holguras, versiones emitidas, PPC del cliente)</small></label>`:''}
      ${m.role==='editor'?tpubCell(em,m):''}</div>`}
   </div>
   <div class="lqbtns">${lock?'':`<button class="ib danger" data-mdel="${esc(em)}">Quitar acceso</button>`}<span class="fsp"></span><button class="ib pri" data-lqx>Listo</button></div>`,
   e=>teamClick(e),e=>teamChange(e))}
/* cambios de la ficha (y del formulario): guardan al momento en members */
async function teamChange(e){const t=e.target;if(!t.dataset.mem||!isAdmin)return;const em=t.dataset.mem;
  const fail=err=>toast('No se pudo guardar: '+(err.code||err.message));
  if(t.dataset.f==='scadd'){if(!t.value)return;const m=MEM.get(em)||{};const L=[...new Set([...memScs(m),t.value])];
    try{await fcol('members').doc(em).update({scs:L,sc:L[0]});toast(`${conOf(t.value).name} agregada`)}catch(err){fail(err)}return}
  if(t.dataset.f==='pisoadd'){if(!t.value)return;const m=MEM.get(em)||{};const L=[...new Set([...memPisos(m),t.value])];const p=S.pis.get(t.value);
    try{await fcol('members').doc(em).update({pisos:L});toast(`${p?p.name:'Piso'} a cargo de ${m.name||em}`)}catch(err){fail(err)}return}
  try{await fcol('members').doc(em).update({[t.dataset.f]:t.type==='checkbox'?t.checked:t.dataset.f==='name'?t.value.trim():t.value})}catch(err){fail(err)}}
async function teamClick(e){const rm=e.target.closest('[data-scrm]');if(rm&&isAdmin){const[em,id]=rm.dataset.scrm.split('|');const m=MEM.get(em)||{};const L=memScs(m).filter(i=>i!==id);
    try{await fcol('members').doc(em).update({scs:L,sc:L[0]||''});toast(`${conOf(id).name} quitada`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return true}
  const pr=e.target.closest('[data-pirm]');if(pr&&isAdmin){const[em,id]=pr.dataset.pirm.split('|');const m=MEM.get(em)||{};const L=memPisos(m).filter(i=>i!==id);
    try{await fcol('members').doc(em).update({pisos:L});toast(`${(S.pis.get(id)||{}).name||'Piso'} quitado`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}return true}
  const b=e.target.closest('[data-mdel]');if(b&&isAdmin){const em=b.dataset.mdel;const m=MEM.get(em)||{};
    if(!await uiAsk({title:'Quitar acceso',text:`${m.name||em} ya no podrá entrar a LPS 911. Lo que registró se conserva.`,ok:'Quitar acceso',tone:'danger'}))return true;
    try{await fcol('members').doc(em).delete();TEDIT=null;lqClose();toast('Acceso retirado a '+(m.name||em))}catch(err){toast('No se pudo quitar: '+(err.code||err.message))}return true}
  return false}
function teamSeg(){if(!isAdmin)return'';const v=teamV();return`<span class="seg tseg" role="tablist" aria-label="Secciones de Equipo">${TEAMV.map(([k,l])=>`<button type="button" role="tab" data-teamv="${k}" class="${v===k?'on':''}" aria-selected="${v===k}">${l}</button>`).join('')}</span>`}
function renderTeam(main){
  const list=[...MEM.entries()];const v=teamV();
  const online=new Set([...PRES.values()].map(p=>p&&p.eh));
  const counts=Object.fromEntries(Object.keys(COLS).map(c=>[c,S[COLS[c]].size]));ensurePlanos();
  const acts=(me&&me.realAdmin&&VA_OK()&&!IN_FRAME?'<button class="ib" id="bva" title="Prueba la app con los permisos de otro rol">👁 Ver como…</button><button class="ib" id="bph" title="Abre la app en el tamaño de un celular">📱 Vista celular</button>':'')+'<button class="ib" id="thelp" title="Cómo se suma a alguien y qué hace cada rol" aria-label="Ayuda">ⓘ</button>';
  let body='';
  if(v==='per'){const cnt={};list.forEach(([em,m])=>{const r=roleOfM(em,m);cnt[r]=(cnt[r]||0)+1});
    const scs=[...new Set(list.filter(([em,m])=>!TQ.role||roleOfM(em,m)===TQ.role).flatMap(([,m])=>memScs(m)))].filter(i=>S.con.has(i)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
    const TR=teamRows(list,online);const allOpen=!!(TQ.q||TQ.role||TQ.sc)||TR.groups.length===1;const OP=new Set(U.teamOpen||[]);
    const row=([em,m])=>{const self=me&&em===me.email;const on=online.has(hashStr(em));return`<tr data-tm="${esc(em)}"${isAdmin?` data-tedit="${esc(em)}" class="tclk"`:''}><td class="lead tnm"><b>${esc(m.name||'(sin nombre)')}</b>${self?' <span class="pill neu">tú</span>':''}<small class="mono">${em.startsWith('u_')?'Ingreso por enlace / QR':esc(em)}</small></td>
      <td data-l="Alcance" class="tsc">${teamScope(em,m)}</td><td data-l="Permisos" class="tpm">${teamPerms(em,m)}</td>
      <td class="tst">${on?'<span class="pill ok">Conectado</span>':''}</td>
      <td class="ted">${isAdmin?`<button class="ib" data-tedit="${esc(em)}" aria-label="Editar a ${esc(m.name||em)}">✎ Editar</button>`:''}</td></tr>`};
    body=`<div class="card">
     ${isAdmin?`<button type="button" class="ib pri taddb" id="taddb" aria-expanded="${!!TF.open}">${TF.open?'× Cerrar':'＋ Agregar persona'}</button><form class="pad tadd${TF.open?' open':''}" id="tadd"><span class="fgl">Agregar</span><input class="tin" id="temail" type="text" inputmode="email" autocomplete="off" data-fk="tf:em" value="${esc(TF.em)}" placeholder="correo@empresa.com" aria-label="Correo"><input class="tin" id="tname" data-fk="tf:nm" value="${esc(TF.nm)}" placeholder="Nombre y apellido" aria-label="Nombre"><select class="tin" id="trole" aria-label="Rol">${[['editor','Editor'],['campo','Campo'],['sc','Subcontratista'],['capataz','Capataz'],['area','Área de apoyo (OT, Calidad…)'],['veedor','Veedor'],['lector','Lector'],['admin','Administrador'],['tcap','Capataz (tareo)'],['tasis','Asistente de tareo'],['tcos','Costos (tareo)']].map(([k,l])=>`<option value="${k}"${TF.rl===k?' selected':''}>${l}</option>`).join('')}</select><select class="tin" id="tsc" aria-label="Empresa"${TF.rl==='sc'||TF.rl==='capataz'?'':' hidden'}><option value="">— empresa —</option>${[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}"${TF.sc===c.id?' selected':''}>${esc(c.name)}${c.partida?' · '+esc(c.partida):''}</option>`).join('')}</select><select class="tin" id="tar" aria-label="Área"${TF.rl==='area'?'':' hidden'}><option value="">— área —</option>${restrAreasL().map(a=>`<option${TF.ar===a?' selected':''}>${esc(a)}</option>`).join('')}</select><button class="ib pri" type="submit">Agregar al equipo</button></form>`:''}
     <div class="pad tfilt"><input class="tin tqry" id="tq" data-fk="tq" type="search" value="${esc(TQ.q)}" placeholder="Buscar por nombre, correo, empresa o piso…" aria-label="Buscar en el equipo">
      <select class="tin" id="tqrole" aria-label="Filtrar por rol"><option value="">Todos los roles (${list.length})</option>${TROLES.filter(r=>cnt[r]).map(r=>`<option value="${r}"${TQ.role===r?' selected':''}>${esc(ROLE[r])} (${cnt[r]})</option>`).join('')}</select>
      ${scs.length?`<select class="tin" id="tqsc" aria-label="Filtrar por empresa"><option value="">Todas las empresas</option>${scs.map(i=>`<option value="${i}"${TQ.sc===i?' selected':''}>${esc(conOf(i).name)}</option>`).join('')}</select>`:''}
      ${TQ.q||TQ.role||TQ.sc?'<button type="button" class="ib" data-tclr>Limpiar</button>':''}
      ${allOpen?'':`<button type="button" class="lnkb" data-tall="${TR.groups.every(g=>OP.has(g.r))?0:1}">${TR.groups.every(g=>OP.has(g.r))?'Plegar todo':'Desplegar todo'}</button>`}</div>
     <div class="tscroll"><table class="t rt tmem"><thead><tr><th>Nombre</th><th>Alcance</th><th>Permisos</th><th>Estado</th><th></th></tr></thead><tbody>
     ${!TR.n?`<tr><td colspan="5" class="mu" style="padding:14px">Nadie coincide con la búsqueda.</td></tr>`:TR.groups.map(g=>{const op=allOpen||OP.has(g.r);
       const sub=g.r==='sc'||g.r==='capataz'?' · '+[...new Set(g.rows.flatMap(([,m])=>memScs(m)))].filter(i=>S.con.has(i)).length+' empresas':'';
       const conn=g.rows.filter(([em])=>online.has(hashStr(em))).length;
       return`<tr class="tgrp grp"><th colspan="5"><button type="button" class="tgb" data-tgrp="${g.r}" aria-expanded="${op}"${allOpen?' disabled':''}><span class="tgc">${op?'▾':'▸'}</span>${esc(TGRP[g.r])} <span class="mu">${g.rows.length}${sub}${conn?` · ${conn} conectado${conn>1?'s':''}`:''}</span></button></th></tr>`+(op?g.rows.map(row).join(''):'')}).join('')}
     </tbody></table></div>${(()=>{const sr=pisosSinResp();return isAdmin&&sr.length&&S.pis.size?`<p class="note pad" style="margin:0">Pisos sin responsable: <b>${sr.map(p=>esc(p.code)).join(', ')}</b> · sus propuestas y el plan diario los decide cualquier editor. Asígnalo en la ficha de un editor (✎ Editar › Pisos a cargo).</p>`:''})()}</div>`}
  else if(v==='cap')body=invCard();
  else if(v==='dat')body=`<div class="card"><div class="hd">Datos del proyecto <span class="sub">${counts.pisos} pisos · ${counts.sectors} sectores · ${counts.ambientes} ambientes · ${counts.acts} actividades · ${counts.weeks} semanas congeladas · ${counts.restr} restricciones · ${planosLoaded?PLAN.size:'…'} planos</span></div>
    <div class="pad tdat">
     <div><b>Respaldo</b><p class="note">Guárdalo cada semana (y siempre antes de una carga o limpieza grande). Incluye todo: lookahead, registro diario, reportes de capataces, propuestas, versiones, planos del día, equipo e invitaciones.</p>
      <div class="tbtns"><button class="ib pri" id="bbackup">Descargar respaldo de datos (JSON)</button><button class="ib" id="bbackup2" title="Incluye las láminas de planos y las fotos: el archivo puede pesar bastante">Respaldo completo con imágenes</button>${bkNote()}</div></div>
     <div><b>Cargar datos</b><p class="note" id="impmsg">${IMPMSG?esc(IMPMSG):'Usa el archivo de datos que te enviaron (por ejemplo <b>lookahead-real.json</b>) o un respaldo. Los registros con el mismo código se reemplazan; los demás no se tocan.'}</p>
      <div class="tbtns"><label class="ib">Cargar datos desde archivo…<input type="file" id="fimport" accept=".json,application/json" hidden></label></div></div>
    </div></div>`;
  else if(v==='cln')body=cleanCard();
  main.innerHTML=`<div class="scroll"><div class="wrap">
  ${pageHead('Equipo',`${list.length} persona${list.length===1?'':'s'} con acceso`,acts)}
  ${teamSeg()}
  ${body}
  </div></div>`;
  if(v==='cln')wireClean(main);
  /* la ficha abierta se actualiza con los cambios (salvo mientras se escribe el nombre) */
  if(TEDIT&&$('#lqm')&&document.activeElement&&document.activeElement.id!=='ted-name')teamEdit(TEDIT);else if(TEDIT&&!$('#lqm'))TEDIT=null;
  const f=$('#tadd',main);
  main.oninput=e=>{const t=e.target;
    if(t.id==='tq'){TQ.q=t.value;render();return}
    if(t.id==='temail'){TF.em=t.value;return}if(t.id==='tname'){TF.nm=t.value;return}
    if(t.id==='trole'){TF.rl=t.value;const ss=$('#tsc',main);if(ss)ss.hidden=TF.rl!=='sc'&&TF.rl!=='capataz';const sa=$('#tar',main);if(sa)sa.hidden=TF.rl!=='area';return}
    if(t.id==='tar'){TF.ar=t.value;return}
    if(t.id==='tsc'){TF.sc=t.value;return}
    if(t.id==='tqsc'){TQ.sc=t.value;render();return}
    if(t.id==='tqrole'){TQ.role=t.value;if(TQ.sc&&!list.some(([em,m])=>(!TQ.role||roleOfM(em,m)===TQ.role)&&memScs(m).includes(TQ.sc)))TQ.sc='';render();return}};
  if(f)f.onsubmit=async e=>{e.preventDefault();const em=$('#temail').value.trim().toLowerCase(),nm=$('#tname').value.trim(),rl=$('#trole').value,scv=$('#tsc').value,arv=($('#tar')||{}).value||'';if((rl==='sc'||rl==='capataz')&&!scv){toast('Elige la empresa / partida.');return}if(rl==='area'&&!arv){toast('Elige el área (Oficina Técnica, Calidad…).');return}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){toast('Escribe un correo válido.');return}
    if(MEM.has(em)){toast('Ese correo ya está en el equipo.');return}
    try{await fcol('members').doc(em).set({role:rl,name:nm,...(rl==='sc'||rl==='capataz'?{sc:scv,scs:[scv]}:{}),...(rl==='area'?{area:arv}:{}),added:NOW(),addedBy:me.email});TF.em='';TF.nm='';toast(`${nm||em} agregado como ${ROLE[rl]}. Envíale el enlace de la página.`);render()}catch(err){toast('No se pudo agregar: '+(err.code||err.message))}};
  main.onchange=e=>{if(e.target.dataset.mem)teamChange(e)};
  main.onclick=async e=>{let tb;if(e.target.closest('#bva')){vaDialog(e.target.closest('#bva'));return}if(e.target.closest('#bph')){phonePreview('iphone');return}
    if((tb=e.target.closest('#thelp'))){openPop(tb,`<div class="ph">Equipo: cómo se suma a alguien y qué hace cada rol</div><div class="mxhlp">${TEAM_HELP}<p class="note">Enlace para enviar: <span class="mono">${esc(location.origin+location.pathname)}</span></p></div>`,{});return}
    if(e.target.closest('#taddb')){TF.open=!TF.open;render();if(TF.open)setTimeout(()=>{const i=$('#temail');if(i)i.focus()},30);return}
    if((tb=e.target.closest('[data-teamv]'))){U.teamV=tb.dataset.teamv;saveUI();render();return}
    if((tb=e.target.closest('[data-tedit]'))){teamEdit(tb.dataset.tedit);return}
    if((tb=e.target.closest('[data-tgrp]'))){const r=tb.dataset.tgrp;const O=new Set(U.teamOpen||[]);O.has(r)?O.delete(r):O.add(r);U.teamOpen=[...O];saveUI();render();return}
    if((tb=e.target.closest('[data-tall]'))){U.teamOpen=tb.dataset.tall==='1'?[...TROLES]:[];saveUI();render();return}
    if(e.target.closest('[data-tclr]')){TQ.q='';TQ.role='';TQ.sc='';render();return}
    if(await invClick(e))return;if(await teamClick(e))return;
    if(e.target.id==='bbackup')backupJson(false);if(e.target.id==='bbackup2')backupJson(true)};
  const fi=$('#fimport',main);if(fi)fi.onchange=async()=>{const file=fi.files[0];fi.value='';if(file)await importJson(file)};
}
/* ---------- limpieza de datos de prueba ---------- */
const CL={sel:null,seen:new Set(),weeks:true,daily:true,restr:true,planos:false,plan:null,busy:false,msg:''};
const isFach=p=>p&&(p.id==='piso-fach'||/fachad/i.test(p.name||'')||/fachad/i.test(p.code||''));
function cleanPisoCounts(pid){const secs=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid);const ss=new Set(secs.map(s=>s.id));const ambs=[...S.amb.values()].filter(a=>ss.has(a.sectorId));const as=new Set(ambs.map(a=>a.id));const acts=[...S.act.values()].filter(x=>as.has(x.ambId));return{secs,ambs,acts}}
function cleanCard(){
  const ps=pisos();if(CL.sel===null){CL.sel=[];CL.seen=new Set()}for(const p of ps)if(!CL.seen.has(p.id)){CL.seen.add(p.id)} /* ninguno marcado de entrada */
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
   <label><input type="checkbox" data-clo="restr"${CL.restr?' checked':''}${CL.busy?' disabled':''}><span>Restricciones de esos pisos (de las actividades borradas y las que ya no tienen actividad)</span></label>
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
  /* solo las restricciones de los pisos elegidos (antes también borraba las de otros pisos sin actividad activa) */
  if(CL.restr)for(const q of S.res.values()){if(actIds.has(q.actId)||(sel.has(restrPiso(q))&&!S.act.has(q.actId))){del.push(['restr',q.id]);nR++}}
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
    if(!await uiAsk({title:'¿Aplicar la actualización?',text:data.resumen||'',list:[`${writes.length} registros se actualizan`,`${dels.length} se eliminan`],note:'Las demás actividades (y lo que hayas corregido en ellas) no se tocan.',ok:'Continuar',tone:dels.length?'warn':'info'}))return}
  else{const by={};writes.forEach(([c])=>by[c]=(by[c]||0)+1);
    if(!await uiAsk({title:`¿Cargar ${writes.length} registros?`,list:[...Object.entries(by).map(([c,n])=>`${n} en ${c}`),...(dels.length?[`${dels.length} se eliminan`]:[])],note:'Los registros con el mismo identificador se reemplazan por los del archivo y no se puede deshacer. Si no estás seguro, primero descarga el respaldo actual.',ok:'Cargar',tone:'danger'}))return}
  const msg=$('#impmsg');let done=0;
  try{const skip=await importWrites(writes,n=>{done=n;IMPMSG=`Cargados ${done} de ${writes.length} registros…`;const m2=$('#impmsg');if(m2)m2.textContent=IMPMSG});
    await batchWrites(dels.map(([c,id])=>[c,id,null]));
    dels.forEach(([c,id])=>S[COLS[c]].delete(id));if(dels.length)requestRender();
    const newCon=new Set(Object.keys(cols.contractors||{}));const miss=new Set();Object.values(cols.acts||{}).forEach(a=>{if(a&&a.sc&&!S.con.has(a.sc)&&!newCon.has(a.sc))miss.add(a.sc)});
    const nObs=Object.values(cols.acts||{}).filter(a=>a&&a.obs).length;
    const extra=(miss.size?` Ojo: ${miss.size} subcontratista(s) no existen en Configuración (${[...miss].join(', ')}); esas actividades se verán sin color hasta que los crees.`:'')+(nObs?` Hay ${nObs} actividades con observaciones para revisar: en el Lookahead marca “Con observaciones”.`:'');
    const nSk=[...skip.values()].reduce((a,b)=>a+b,0);const skMsg=nSk?` No se cargaron ${nSk} registros que las reglas no permiten escribir con tu usuario (${[...skip].map(([c,n])=>`${c}: ${n}`).join(', ')}); son historiales de otras personas y no afectan el lookahead.`:'';
    toast(`Datos cargados: ${writes.length-nSk} registros.`);IMPMSG=`Listo: ${writes.length-nSk} registros cargados${dels.length?` y ${dels.length} eliminados`:''}.`+skMsg+extra;const m2=$('#impmsg');if(m2)m2.textContent=IMPMSG}
  catch(err){IMPMSG='';toast('La carga se detuvo: '+(err.code||err.message)+'. Puedes volver a intentarlo; no se duplican registros.')}
}

/* logos de los Excel (encabezado de la empresa): se guardan como foto (PNG reducido a 700 px de ancho, conserva la transparencia) */
function logoPrev(k){const id=P()[k];if(!id)return'<span class="mu">Sin logo</span>';loadFoto(id);const src=FOTO.get(id);return src?`<img class="logop" src="${src}" alt="Logo">`:'<span class="mu">Cargando…</span>'}
async function logoUpload(k,file){if(!isAdmin)return;try{const src=await new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=ko;r.readAsDataURL(file)});
    const im=await new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('No es una imagen'));i.src=src});
    const sc=Math.min(1,700/im.naturalWidth);const cv=document.createElement('canvas');cv.width=Math.round(im.naturalWidth*sc);cv.height=Math.round(im.naturalHeight*sc);cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
    let data=cv.toDataURL('image/png');if(data.length>390000)data=cv.toDataURL('image/jpeg',.9);if(data.length>390000)throw new Error('La imagen es muy pesada: usa una más pequeña.');
    const id='logo_'+k+'_'+NOW();FOTO.set(id,data);if(db)await fcol('fotos').doc(id).set({data,kind:'logo',by:me.email,ts:NOW()});apply([op('meta','project',{...P(),[k]:id})]);toast('Logo guardado: saldrá en los Excel');requestRender()}
  catch(e){toast('No se pudo guardar el logo: '+(e.message||e.code||e))}}
