"use strict";
/* LPS 911 · Tipos de observación (punch list, 22-11-2026, decidido con el dueño a pedido de Arquitectura; docs/ia/matriz.md
   «Tipos de observación»). Lista corta y configurable (código + nombre: «PT-01 Desmanche de pintura») para registrar rápido y
   filtrar «cuántos ambientes faltan corregir pintura». La editan administrador y editores en Matriz › Tipos de obs.
   Cada tipo puede ir ligado a una actividad del catálogo (por id): la observación va a su SC aunque el ambiente no tenga la
   actividad (entonces no cuenta en el % ni sale en el Lookahead). Sin actividad, el responsable es el SC fijo del tipo.
   Colección mobt (reglas: leen los de LPS, escriben canEdit; se archiva, no se borra). Las observaciones guardan el id en ot.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* lista preliminar (redactada para la obra, nov 2026): [código, especialidad, nombre, palabras para ligarla a una actividad del catálogo] */
const MOBT_DEF=[
 ['PT-01','Pintura','Desmanche de pintura','pintura'],['PT-02','Pintura','Retoque de pintura','pintura'],['PT-03','Pintura','Resane y repintado','pintura'],
 ['PT-04','Pintura','Corte de color en encuentros','pintura'],['PT-05','Pintura','Falta mano final','pintura'],
 ['TR-01','Tarrajeo y empastado','Resane de tarrajeo','tarrajeo'],['TR-02','Tarrajeo y empastado','Plomo o escuadra fuera de tolerancia','tarrajeo'],['TR-03','Tarrajeo y empastado','Bruña o derrame mal acabado','tarrajeo'],
 ['EN-01','Enchapes','Cambio de pieza rota o rajada','enchape'],['EN-02','Enchapes','Pieza suelta o hueca','enchape'],['EN-03','Enchapes','Fragua faltante o manchada','enchape|fragua'],
 ['EN-04','Enchapes','Desnivel o ceja entre piezas','enchape'],['EN-05','Enchapes','Corte o remate mal ejecutado','enchape'],['EN-06','Enchapes','Limpieza de enchape','enchape'],
 ['PS-01','Pisos y contrazócalos','Piso dañado o rayado','piso laminado|piso vinilico|laminado|vinilico|piso'],['PS-02','Pisos y contrazócalos','Perfil o junta de transición faltante','piso laminado|piso vinilico|laminado|vinilico|piso'],
 ['PS-03','Pisos y contrazócalos','Contrazócalo suelto o mal rematado','contrazocalo|zocalo'],
 ['SL-01','Sellos','Sello cortafuego faltante o incompleto','cortafuego'],['SL-02','Sellos','Sello cortafuego sin identificar','cortafuego'],
 ['SL-03','Sellos','Sello en ventanas o mamparas','sello elastomerico|elastomerico|silicona|sello'],['SL-04','Sellos','Sello en aparatos sanitarios y tableros','sello elastomerico|elastomerico|silicona|sello'],
 ['DW-01','Drywall y cielo raso','Junta marcada o fisura en drywall','drywall|tabique'],['DW-02','Drywall y cielo raso','Plancha golpeada o dañada','drywall|tabique|cielo'],
 ['DW-03','Drywall y cielo raso','Tapa de registro faltante o desalineada','cielo raso|cielo|drywall'],['DW-04','Drywall y cielo raso','Desnivel en cielo raso','cielo raso|cielo'],
 ['CM-01','Carpintería de madera','Puerta roza o no cierra bien','puerta'],['CM-02','Carpintería de madera','Cerrajería o bisagra defectuosa','cerrajeria|puerta'],
 ['CM-03','Carpintería de madera','Golpe o rayón en madera','puerta|carpinteria de madera|madera'],['CM-04','Carpintería de madera','Tapajuntas faltante o mal colocado','puerta|tapajunta'],
 ['CM-05','Carpintería de madera','Mueble desalineado','mueble|closet|cocina'],
 ['AL-01','Aluminio, vidrio y metálicas','Vidrio rayado, roto o manchado','vidrio|ventana|mampara'],['AL-02','Aluminio, vidrio y metálicas','Ventana o mampara no corre o no cierra','ventana|mampara'],
 ['AL-03','Aluminio, vidrio y metálicas','Accesorio faltante en carpintería','ventana|mampara'],['AL-04','Aluminio, vidrio y metálicas','Baranda: corrección de pintura','baranda|pasamano'],
 ['AL-05','Aluminio, vidrio y metálicas','Baranda: alineamiento o fijación','baranda|pasamano'],
 ['SA-01','Instalaciones sanitarias','Aparato sanitario dañado o mal fijado','aparatos sanitarios|aparato'],['SA-02','Instalaciones sanitarias','Grifería con fuga o mal instalada','griferia'],
 ['SA-03','Instalaciones sanitarias','Accesorios de baño faltantes','accesorio'],
 ['EL-01','Instalaciones eléctricas','Placa o tomacorriente faltante o torcido','placa|tomacorriente|interruptor'],['EL-02','Instalaciones eléctricas','Luminaria faltante o que no enciende','luminaria|artefacto'],
 ['EL-03','Instalaciones eléctricas','Tablero sin rotular o sin tapa','tablero'],
 ['LM-01','Limpieza','Limpieza fina pendiente','limpieza fina|limpieza'],['LM-02','Limpieza','Retiro de restos de material','limpieza|desmonte']];

/* ---------- consultas ---------- */
const obtAll=()=>[...MX.obt.values()].filter(t=>t&&!t.arch).sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''),undefined,{numeric:true})||String(a.name||'').localeCompare(String(b.name||'')));
/** actividad del catálogo del tipo (null si no tiene, o si se archivó o ya no existe) */
const obtCat=t=>{const c=t&&t.cat&&MX.cat.get(t.cat);return c&&!c.arch?c:null};
/** SC responsable: el de la actividad; sin actividad, el fijo del tipo */
const obtSc=t=>{const c=obtCat(t);return c?c.sc||'':(t&&t.sc)||''};
const obtLbl=t=>t?(t.code?t.code+' ':'')+(t.name||''):'';
/** quién puede registrar con este tipo: el ingeniero todos; el SC los de su partida */
const obtCanUse=t=>{if(!t||!mobCan())return false;if(canDaily)return true;const c=obtCat(t);return c?mxHasSc(c,myScsI()):myScsI().includes(t.sc)};
/** tipos para la hoja: primero los de las actividades que el ambiente tiene; q busca entre todos */
function obtFor(amb,q){const cells=mxCells().get(amb)||{};const qq=mnk(q||'');
  const L=obtAll().filter(t=>obtCanUse(t)&&(!qq||mnk(obtLbl(t)+' '+(t.esp||'')+' '+((obtCat(t)||{}).name||'')).includes(qq)));
  const own=L.filter(t=>{const c=obtCat(t);return c&&cells[c.id]&&cells[c.id].src!=='obs'});
  return{own,rest:L.filter(t=>!own.includes(t))}}

/* ---------- lista preliminar: crea solo los códigos que faltan (dos personas a la vez no la duplican: el id sale del código) ---------- */
const obtIdOf=code=>'ot-'+String(code).replace(/[^A-Za-z0-9]+/g,'-');
function obtGuessCat(keys){const cats=[...MX.cat.values()].filter(c=>!c.arch);
  for(const k of String(keys||'').split('|')){const kk=mnk(k);if(!kk)continue;const c=cats.find(c=>mnk(c.name)===kk)||cats.find(c=>mnk(c.name).includes(kk));if(c)return c.id}return''}
/** códigos de la lista preliminar que faltan (por código o por id: si alguien renombró un código, no se vuelve a crear) */
const obtMissing=()=>{const have=new Set([...MX.obt.values()].map(t=>String(t.code||'').toUpperCase()));return MOBT_DEF.filter(r=>!have.has(r[0])&&!MX.obt.has(obtIdOf(r[0])))};
async function obtSeed(){if(!mxEd()||!db)return;if(!MX.ld.obt){toast('Todavía se está cargando la lista de tipos: inténtalo en unos segundos.');return}
  const L=obtMissing();if(!L.length){toast('La lista preliminar ya está cargada.');return}
  const withCat=L.map(r=>({r,cat:obtGuessCat(r[3])}));const sin=withCat.filter(o=>!o.cat).length;
  if(!await uiAsk({title:'Cargar la lista preliminar',html:`<p>Se agregan <b>${L.length}</b> tipos de observación (pintura, enchapes, sellos, carpintería…). Luego puedes cambiar nombres y códigos, archivar los que no sirvan o agregar otros.</p>
    <p>Cada tipo se liga a la actividad del catálogo con el nombre más parecido. ${sin?`<b>${sin}</b> quedan sin actividad: elige su actividad o su subcontratista responsable.`:''}</p>`,ok:'Cargar',tone:'info'}))return;
  const b=db.batch();withCat.forEach(({r,cat},i)=>b.set(fcol('mobt').doc(obtIdOf(r[0])),{code:r[0],esp:r[1],name:r[2],cat,sc:'',ord:i,...mxNow()},{merge:true}));
  b.commit().then(()=>toast(`Lista cargada: ${L.length} tipos`)).catch(mxErr)}

/* ---------- Matriz › Tipos de obs.: la ven todos (menos el SC); la cambian administrador y editores ---------- */
const OBTV={q:''};
function obtSet(id,patch){if(!mxEd())return;const t=MX.obt.get(id);if(!t)return;const prev={};Object.keys(patch).forEach(k=>prev[k]=t[k]===undefined?'':t[k]);
  fcol('mobt').doc(id).set({...patch,...mxNow()},{merge:true}).then(()=>toast('Guardado','Deshacer',()=>fcol('mobt').doc(id).set({...prev,...mxNow()},{merge:true}))).catch(mxErr)}
async function obtNew(){if(!mxEd())return;const n=await uiAsk({title:'Nuevo tipo de observación',input:{label:'Nombre (p. ej. Desmanche de pintura)',required:true},ok:'Crear',tone:'info'});if(!n)return;
  const name=String(n).replace(/\s+/g,' ').trim().slice(0,80);if(!name)return;const used=new Set([...MX.obt.values()].map(t=>String(t.code||'').toUpperCase()));
  let k=1;while(used.has('OB-'+String(k).padStart(2,'0')))k++;const code='OB-'+String(k).padStart(2,'0');
  const id=uid('ot');fcol('mobt').doc(id).set({code,name,esp:'',cat:'',sc:'',ord:MX.obt.size,...mxNow()}).then(()=>toast(`Tipo ${code} creado: elige su actividad o su subcontratista`)).catch(mxErr)}
function renderMxObt(main,head){const ed=mxEd();const all=obtAll();const qq=mnk(OBTV.q);
  const use=new Map();for(const n of MX.obs.values()){if(!n||!n.ot||n.st==='anu')continue;const o=use.get(n.ot)||{ab:0,n:0};o.n++;if(n.st==='ab')o.ab++;use.set(n.ot,o)}
  const L=all.filter(t=>!qq||mnk(obtLbl(t)+' '+(t.esp||'')+' '+((obtCat(t)||{}).name||'')).includes(qq));
  const cats=[...MX.cat.values()].filter(c=>!c.arch).sort((a,b)=>a.name.localeCompare(b.name)||conOf(a.sc).name.localeCompare(conOf(b.sc).name));
  const scs=[...S.con.values()].filter(c=>!c.arch).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const esps=[...new Set(all.map(t=>t.esp).filter(Boolean))].sort();
  const grp=new Map();L.forEach(t=>{const k=t.esp||'Sin especialidad';if(!grp.has(k))grp.set(k,[]);grp.get(k).push(t)});
  const arch=[...MX.obt.values()].filter(t=>t&&t.arch);
  const row=t=>{const c=obtCat(t);const u=use.get(t.id);const lost=t.cat&&!c;const noOne=!c&&!t.sc;
    return`<tr data-otid="${esc(t.id)}"${noOne?' class="obtw"':''}>
      <td>${ed?`<input class="tin obtc" data-otf="code" value="${esc(t.code||'')}" maxlength="12" aria-label="Código">`:`<b>${esc(t.code||'')}</b>`}</td>
      <td>${ed?`<input class="tin" data-otf="name" value="${esc(t.name||'')}" maxlength="80" aria-label="Tipo de observación">`:esc(t.name||'')}</td>
      <td>${ed?`<input class="tin" data-otf="esp" value="${esc(t.esp||'')}" list="obtesp" aria-label="Especialidad">`:esc(t.esp||'')}</td>
      <td>${ed?`<select data-otf="cat" aria-label="Actividad del catálogo"><option value="">— Sin actividad —</option>${cats.map(x=>`<option value="${esc(x.id)}"${c&&c.id===x.id?' selected':''}>${esc(x.name)} · ${esc(conOf(x.sc).name)}</option>`).join('')}</select>`:esc(c?c.name+' · '+conOf(c.sc).name:'—')}${lost?'<div class="note">La actividad ligada se archivó: elige otra.</div>':''}</td>
      <td>${c?`<span class="note">${esc(conOf(c.sc).name)} (de la actividad)</span>`:ed?`<select data-otf="sc" aria-label="Subcontratista responsable"><option value="">— Elige —</option>${scs.map(x=>`<option value="${esc(x.id)}"${t.sc===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select>`:esc(t.sc?conOf(t.sc).name:'—')}${noOne?'<div class="obtwm">Sin actividad ni responsable: no se puede usar.</div>':''}</td>
      <td class="obtu">${u?`<b>${u.ab}</b> abiertas<br><small>${u.n} en total</small>`:'<small class="note">sin uso</small>'}</td>
      <td>${ed?`<button class="ab" data-otarc="${esc(t.id)}" aria-label="Archivar ${esc(t.name||'')}" title="Archivar">&times;</button>`:''}</td></tr>`};
  main.innerHTML=`<div class="scroll"><div class="wrap mxwrap">${mxHd(head,mxViewSeg())}
   ${helpBox('Tipos de observación (punch list)',`<p>Al registrar una observación se elige su tipo con un toque (salen primero los de las actividades del ambiente). Así se puede filtrar en <b>Gráfico › Observaciones</b> y ver cuántos ambientes faltan corregir de cada tipo.</p>
     <p>Cada tipo va ligado a una <b>actividad del catálogo</b>: la observación va al subcontratista de esa actividad, aunque el ambiente no la tenga (en ese caso no cuenta en el % ni sale en el Lookahead). Si no hay actividad (limpieza, restos de material…), elige el <b>subcontratista responsable</b>.</p>
     <p>El texto de cada observación («junto a la puerta») va al registrarla, no en el tipo. Conviene pocos tipos por actividad (hasta 6) y no cambiar un código ya usado en obra.</p>`)}
   <div class="fbar"><input class="tin" id="obtq" value="${esc(OBTV.q)}" placeholder="Buscar tipo, especialidad o actividad" aria-label="Buscar tipo"><span class="note">${all.length} tipos</span><span class="fsp"></span>
     ${ed&&MX.ld.obt&&obtMissing().length?`<button class="ib" id="obtseed">${all.length?'Completar con la lista preliminar':'Cargar lista preliminar'}</button>`:''}${ed?'<button class="ib pri" id="obtnew">+ Tipo</button>':''}</div>
   ${!all.length?`<div class="callout">Todavía no hay tipos de observación. ${ed?'Carga la lista preliminar ('+MOBT_DEF.length+' tipos por especialidad) y ajústala, o crea los tuyos con «+ Tipo».':'Los crea el ingeniero de producción o el administrador.'}</div>`:''}
   ${L.length?`<div class="card"><table class="t obtt"><thead><tr><th>Código</th><th>Tipo de observación</th><th>Especialidad</th><th>Actividad del catálogo</th><th>Responsable</th><th>Uso</th><th></th></tr></thead>
     <tbody>${[...grp.entries()].map(([k,ts])=>`<tr class="obtg"><td colspan="7">${esc(k)} <small>${ts.length}</small></td></tr>${ts.map(row).join('')}`).join('')}</tbody></table></div>`:all.length?'<p class="note">Ningún tipo con ese texto.</p>':''}
   <datalist id="obtesp">${esps.map(e=>`<option value="${esc(e)}">`).join('')}</datalist>
   ${arch.length&&ed?`<div class="note">Archivados: ${arch.map(t=>`${esc(obtLbl(t))} <button class="lnkb" data-otres="${esc(t.id)}">restaurar</button>`).join(' · ')}</div>`:''}
   </div></div>`;
  mxWireV(main);
  const q=$('#obtq',main);if(q)q.oninput=()=>{OBTV.q=q.value;const p=q.selectionStart;renderMxObt(main,head);const i=$('#obtq',main);if(i){i.focus();i.setSelectionRange(p,p)}};
  const sd=$('#obtseed',main);if(sd)sd.onclick=obtSeed;const nw=$('#obtnew',main);if(nw)nw.onclick=obtNew;
  main.querySelectorAll('[data-otf]').forEach(el=>el.onchange=()=>{const id=el.closest('[data-otid]').dataset.otid;const f=el.dataset.otf;let v=String(el.value);
    if(f==='code'){v=v.replace(/\s+/g,'').toUpperCase().slice(0,12);if(!v){toast('El código no puede quedar vacío.');render();return}
      if([...MX.obt.values()].some(t=>t.id!==id&&!t.arch&&String(t.code||'').toUpperCase()===v)){toast(`Ya hay otro tipo con el código ${v}.`);render();return}}
    if(f==='name'){v=v.replace(/\s+/g,' ').trim().slice(0,80);if(!v){toast('El nombre no puede quedar vacío.');render();return}}
    if(f==='esp')v=v.replace(/\s+/g,' ').trim().slice(0,40);
    obtSet(id,{[f]:v})});
  main.querySelectorAll('[data-otarc]').forEach(b=>b.onclick=async()=>{const t=MX.obt.get(b.dataset.otarc);if(!t)return;const u=use.get(t.id);
    if(!await uiAsk({title:`¿Archivar «${obtLbl(t)}»?`,text:`Deja de ofrecerse al registrar. ${u?`Sus ${u.n} observaciones se conservan y se siguen filtrando por este tipo. `:''}Se puede restaurar.`,ok:'Archivar',tone:'warn'}))return;
    fcol('mobt').doc(t.id).set({arch:{t:NOW(),by:me.email,n:me.name||''},...mxNow()},{merge:true}).then(()=>toast('Tipo archivado','Deshacer',()=>fcol('mobt').doc(t.id).set({arch:mxFV().delete(),...mxNow()},{merge:true}))).catch(mxErr)});
  main.querySelectorAll('[data-otres]').forEach(b=>b.onclick=()=>fcol('mobt').doc(b.dataset.otres).set({arch:mxFV().delete(),...mxNow()},{merge:true}).then(()=>toast('Tipo restaurado')).catch(mxErr))}

/* ---------- Gráfico › Observaciones: resumen por tipo (ambientes con observaciones abiertas, por piso) ---------- */
const MOBT_SIN='-';
/** tipos con observaciones abiertas (también los archivados mientras tengan abiertas; '-' = sin tipo) → {id,lbl,tot,byP:Map(piso→Set amb)} */
function obtSummary(okSc){const out=new Map();
  for(const n of MX.obs.values()){if(!n||n.st!=='ab'||(okSc&&!okSc(n)))continue;const k=n.ot&&MX.obt.has(n.ot)?n.ot:MOBT_SIN;
    let o=out.get(k);if(!o){const t=MX.obt.get(k);out.set(k,o={id:k,lbl:t?obtLbl(t):'Sin tipo',code:t?t.code||'':'\uffff',amb:new Set(),byP:new Map()})}
    const p=n.pid||pisoOfAmb(n.amb)||'';o.amb.add(n.amb);let s=o.byP.get(p);if(!s)o.byP.set(p,s=new Set());s.add(n.amb)}
  return[...out.values()].sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}))}
function obtSummaryHtml(okSc){const L=obtSummary(okSc);if(!L.length||!MX.obt.size)return'';
  const ps=[...S.pis.values()].filter(p=>L.some(o=>o.byP.has(p.id))).sort((a,b)=>(a.order||0)-(b.order||0));
  return`<details class="obts"${MXPL.obSum?' open':''}><summary>Resumen por tipo · ambientes por corregir (toda la obra)</summary><div class="obtsw"><table class="t"><thead><tr><th>Tipo</th><th>Total</th>${ps.map(p=>`<th>${esc(p.code||'')}</th>`).join('')}</tr></thead><tbody>
    ${L.map(o=>`<tr class="${MXPL.obT===o.id?'on':''}"><td><button class="lnkb" data-obtf="${esc(o.id)}">${esc(o.lbl)}</button></td><td><b>${o.amb.size}</b></td>${ps.map(p=>{const s=o.byP.get(p.id);return`<td>${s?`<button class="lnkb" data-obtf="${esc(o.id)}" data-obtp="${esc(p.id)}">${s.size}</button>`:''}</td>`}).join('')}</tr>`).join('')}</tbody></table></div></details>`}
