"use strict";
/* LPS 911 · Observaciones de la Matriz (punch list, nov 2026, decidido con el dueño; docs/ia/matriz.md «Observaciones»).
   Una observación es un detalle por levantar en una actividad que el ambiente ya tiene en la Matriz («corregir sello en la
   ventana», «desmanche junto a la puerta», «falta el nicho de la ducha»): NO es una actividad nueva del catálogo. Lleva un punto
   en el plano (Matriz › Gráfico › Observaciones), un texto, foto opcional y un número por ambiente («301-4»).
   Mientras tenga observaciones abiertas, una actividad Terminado se comporta como pendiente para el Lookahead (fila fantasma con
   «N obs.»; tocar un día suma ese día a su fila de siempre) y vuelve sola a Terminado al levantarlas todas. El % de la Matriz no cambia.
   Registran y levantan los ingenieros (canDaily: admin, editor, campo) y el SC en su partida; el SC solo anula las suyas.
   Colección mobs (reglas en firestore.rules «Observaciones de la Matriz»). Fotos opcionales en Storage (mobs/<id>/<foto>.jpg);
   si no se pueden subir (sin señal, Storage no activado) quedan en fotos de Firestore, que se guarda aunque no haya señal.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const MOBST={ab:'Abierta',lev:'Levantada',anu:'Anulada'};
/* frases para empezar cuando una actividad todavía no tiene observaciones (después salen las que más se usan en esa actividad) */
const MOB_GEN=['Corregir','Resanar','Retocar','Desmanchar','Completar lo que falta'];
let OBS=null; /* hoja abierta: {mode:'new'|'edit', id, amb, pt, cat, desc, q, newPh:[dataURL], lev} */
const MOBPH=new Map(); /* foto de Storage (ref 'st:<ruta>') → URL para mostrar */

/** quién registra: ingenieros (admin, editor, campo) y el SC; no en Casco ni en modo consulta */
const mobCan=()=>!!me&&(canDaily||SCK())&&!(typeof CS==='function'&&CS());
/** en qué actividad puede registrar: el ingeniero en todas; el SC en las de su partida */
const mobCanCat=c=>!!c&&mobCan()&&(canDaily||mxHasSc(c,myScsI()));
/** levantar / reabrir: el ingeniero cualquiera; el SC las de su partida */
const mobCanLev=n=>!!n&&mobCan()&&(canDaily||myScsI().includes(n.sc));
/** corregir texto, punto y fotos, y anular: el ingeniero cualquiera; el SC solo las que registró él */
const mobCanEd=n=>!!n&&mobCan()&&(canDaily||(myScsI().includes(n.sc)&&n.by===me.email));

/* ---------- índice (se rehace cuando cambian los datos de la Matriz: MX.v) ---------- */
const MOBX={k:-1,amb:new Map(),open:new Map()};
function mobIdx(){if(MOBX.k===MX.v)return MOBX;const amb=new Map(),open=new Map();
  for(const n of MX.obs.values()){if(!n||!n.amb)continue;let L=amb.get(n.amb);if(!L)amb.set(n.amb,L=[]);L.push(n);
    if(n.st==='ab'){let m=open.get(n.amb);if(!m)open.set(n.amb,m=new Map());m.set(n.cat,(m.get(n.cat)||0)+1)}}
  for(const L of amb.values())L.sort((a,b)=>(a.num||0)-(b.num||0)||(a.t||0)-(b.t||0));
  MOBX.k=MX.v;MOBX.amb=amb;MOBX.open=open;return MOBX}
/** observaciones abiertas de una actividad en un ambiente (0 si no hay) */
const mobOpenN=(amb,cat)=>{if(!amb||!cat||!MX.obs.size)return 0;const m=mobIdx().open.get(amb);return m&&m.get(cat)||0};
/** observaciones de un ambiente (todas, en orden de número); con cat, solo las de esa actividad */
const mobOf=(amb,cat)=>(mobIdx().amb.get(amb)||[]).filter(n=>!cat||n.cat===cat);
const mobLbl=n=>{const a=S.amb.get(n.amb);return(a?a.code:'?')+'-'+(n.num||'?')};
const mobNext=amb=>mobOf(amb).reduce((m,n)=>Math.max(m,n.num||0),0)+1;
/** SC de la observación: el de la partida del SC que la registra; si no, el principal de la actividad */
const mobScOf=c=>{if(SCK()){const m=mxScsOf(c).find(s=>myScsI().includes(s));if(m)return m}return c.sc||''};
/* el SC solo tiene las observaciones de su partida (SEG-05): el número sale del servidor si contesta pronto; si no, del cálculo local */
async function mobNextSrv(amb){let num=mobNext(amb);if(!SCK()||!navigator.onLine)return num;
  try{const sn=await Promise.race([fcol('mobs').where('amb','==',amb).get(),new Promise((_,ko)=>setTimeout(()=>ko(new Error('tiempo')),3000))]);
    sn.docs.forEach(d=>{const x=+(d.data().num||0);if(x>=num)num=x+1})}catch(e){}
  return num}

/* ---------- frases frecuentes: así «corregir sello» o «desmanche» son un toque sin volverse actividades del catálogo ---------- */
function mobFrases(cat){const cnt=new Map();
  for(const n of MX.obs.values()){if(!n||n.cat!==cat||n.st==='anu')continue;const t=String(n.desc||'').trim();if(!t||t.length>60)continue;const k=t.toLowerCase();const o=cnt.get(k)||{t,n:0};o.n++;cnt.set(k,o)}
  const L=[...cnt.values()].sort((a,b)=>b.n-a.n||a.t.localeCompare(b.t)).slice(0,6).map(o=>o.t);
  for(const g of MOB_GEN)if(L.length<6&&!L.some(t=>t.toLowerCase()===g.toLowerCase()))L.push(g);return L}

/* ---------- fotos: Storage si se puede; si no, fotos de Firestore (se guarda aunque no haya señal) ---------- */
function mobPhoto(id,data){const fid=uid('f');
  const fallback=()=>{FOTO.set(fid,data);fcol('fotos').doc(fid).set({data,mobId:id,by:me.email,ts:NOW()}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));return fid};
  if(!navigator.onLine||typeof plPut!=='function'||!(window.FIREBASE_CONFIG&&window.FIREBASE_CONFIG.storageBucket))return Promise.resolve(fallback());
  const path='mobs/'+id+'/'+fid+'.jpg';
  /* con señal mala navigator.onLine sigue en true y plPut reintenta: a los 15 s pasa a fotos de Firestore para no dejarla solo en memoria */
  const up=fetch(data).then(r=>r.blob()).then(b=>plPut(path,b,'image/jpeg'));const to=new Promise((_,ko)=>setTimeout(()=>ko(new Error('tiempo')),15000));
  return Promise.race([up,to]).then(()=>{MOBPH.set('st:'+path,data);return'st:'+path},()=>fallback())}
function mobPhSrc(ref){if(!ref)return'';if(!ref.startsWith('st:')){loadFoto(ref);return FOTO.get(ref)||''}
  if(MOBPH.has(ref))return MOBPH.get(ref)||'';MOBPH.set(ref,'');
  if(typeof plGet==='function')plGet(ref.slice(3)).then(b=>{const u=URL.createObjectURL(b);MOBPH.set(ref,u);$$(`img[data-mobph="${CSS.escape(ref)}"]`).forEach(i=>i.src=u)}).catch(()=>MOBPH.delete(ref));
  return''}
const mobImg=ref=>ref&&ref.startsWith('st:')?`<img data-mobph="${esc(ref)}" src="${mobPhSrc(ref)}" alt="Foto">`:`<img data-ph="${esc(ref)}" src="${mobPhSrc(ref)}" alt="Foto">`;

/* ---------- escribir ---------- */
const mobMeta=()=>({by:me.email,n:me.name||me.email,t:NOW()});
function mobLocal(id,doc){MX.obs.set(id,{...doc,id});MX.v++;MX.mc=null;requestRender()}
function mobErr(err){toast('No se pudo guardar la observación: '+(err&&err.code==='permission-denied'?'sin permiso (¿reglas de Firestore publicadas?)':(err&&(err.code||err.message))||err))}
/** cambia campos de una observación (update: solo lo que cambia, como piden las reglas del SC) */
function mobPatch(id,patch){const n=MX.obs.get(id);if(!n)return;const doc={...n,...patch};delete doc.id;mobLocal(id,doc);
  fcol('mobs').doc(id).update(patch).catch(mobErr)}
/** agrega fotos (en el registro o al levantar): primero se guarda la observación, luego cada foto se suma a su lista */
function mobAddPhotos(id,list,field){(list||[]).forEach(data=>mobPhoto(id,data).then(ref=>{
  const AU=firebase.firestore.FieldValue.arrayUnion;const n=MX.obs.get(id);
  if(n){const doc={...n};if(field==='lev')doc.lev={...(n.lev||{}),ph:[...((n.lev||{}).ph||[]),ref]};else doc.ph=[...(n.ph||[]),ref];delete doc.id;mobLocal(id,doc)}
  fcol('mobs').doc(id).update(field==='lev'?{'lev.ph':AU(ref)}:{ph:AU(ref)}).catch(mobErr)}))}
async function mobCreate(){const o=OBS;if(!o||!db||o.busy)return;const c=MX.cat.get(o.cat);const a=S.amb.get(o.amb);const desc=String(o.desc||'').trim();
  if(!a){toast('Elige el ambiente.');return}if(!c){toast('Elige en qué actividad es la observación.');return}if(!desc){toast('Escribe o elige qué hay que hacer.');return}
  if(!mobCanCat(c)){toast('Solo puedes registrar observaciones de tu partida.');return}
  o.busy=true;const num=Math.max(await mobNextSrv(a.id),o.num||0);if(OBS!==o)return;o.busy=false;
  const sc=o.sc&&mxScsOf(c).includes(o.sc)&&(!SCK()||myScsI().includes(o.sc))?o.sc:mobScOf(c);
  const id=uid('ob');const doc={amb:a.id,cat:c.id,sc,pid:pisoOfAmb(a.id)||'',num,desc:desc.slice(0,600),pt:o.pt||null,ph:[],st:'ab',...mobMeta()};
  mobLocal(id,doc);fcol('mobs').doc(id).set(doc).catch(mobErr);mobAddPhotos(id,o.newPh,'ph');
  toast(`Observación ${a.code}-${doc.num} registrada${o.newPh.length?' (subiendo la foto…)':''}`);
  /* sigue en el mismo ambiente para registrar otra (recorrido rápido) */
  OBS={mode:'new',reg:o.reg,tab:o.tab,id:'',amb:a.id,pt:null,cat:'',desc:'',q:'',newPh:[],num:num+1,aq:'',add:false};mobDraw()}
function mobLev(){const n=OBS&&MX.obs.get(OBS.id);if(!mobCanLev(n))return;const lev={...mobMeta(),...(SCK()?{sc:true}:{})};
  mobPatch(n.id,{st:'lev',lev,u:mobMeta()});mobAddPhotos(n.id,OBS.newPh,'lev');toast(`${mobLbl(n)} levantada`);mobClose()}
function mobReab(){const n=OBS&&MX.obs.get(OBS.id);if(!mobCanLev(n))return;mobPatch(n.id,{st:'ab',reab:mobMeta(),u:mobMeta()});toast(`${mobLbl(n)} reabierta`);mobDraw()}
async function mobAnu(){const n=OBS&&MX.obs.get(OBS.id);if(!mobCanEd(n))return;
  if(!await uiAsk({title:`¿Anular la observación ${mobLbl(n)}?`,text:'Queda anulada (no se borra) y deja de contar como pendiente.',ok:'Anular',tone:'danger'}))return;
  mobPatch(n.id,{st:'anu',anu:mobMeta(),u:mobMeta()});toast(`${mobLbl(n)} anulada`);mobClose()}
function mobSaveEd(){const n=OBS&&MX.obs.get(OBS.id);if(!mobCanEd(n))return;const desc=String(OBS.desc||'').trim();if(!desc){toast('El texto no puede quedar vacío.');return}
  if(desc!==n.desc)mobPatch(n.id,{desc:desc.slice(0,600),u:mobMeta()});mobAddPhotos(n.id,OBS.newPh,'ph');OBS.newPh=[];toast('Cambios guardados');mobDraw()}

/* ---------- hoja inferior ---------- */
/** nueva observación en un ambiente (pt = punto tocado en la lámina {x,y,v}; cat = actividad ya elegida, desde la ficha de una celda) */
function mobNew(amb,pt,cat){if(!mobCan()){toast('Registran observaciones los ingenieros y los subcontratistas.');return}
  const o=OBS={mode:'new',id:'',amb,pt:pt||null,cat:cat&&mobCanCat(MX.cat.get(cat))?cat:'',desc:'',q:'',newPh:[]};mobDraw();
  if(SCK())mobNextSrv(amb).then(n=>{if(OBS===o&&n!==mobNext(amb)){o.num=n;mobDraw()}})}
/* ---------- ✏️ Registrar en el plano (Matriz › Gráfico): hoja del ambiente con «Actividades» y «Observación aquí» (nov 2026) ---------- */
let MOBTAB='act';
/** cambiar estados y agregar actividades: ingenieros (admin, editor y campo: decidido con el dueño, nov 2026) todas; el SC las de su partida */
const mobStCan=c=>!!c&&!!me&&!(typeof CS==='function'&&CS())&&(!!canDaily||(SCK()&&typeof mxScCan==='function'&&mxScCan(c)));
function mobAmb(amb,pt){if(!mobCan())return;const o=OBS={mode:'new',reg:true,tab:MOBTAB,amb,pt:pt||null,cat:'',desc:'',q:'',newPh:[],aq:'',add:false};mobDraw();
  if(SCK())mobNextSrv(amb).then(n=>{if(OBS===o&&n!==mobNext(amb)){o.num=n;mobDraw()}})}
/** estado de una actividad en el ambiente: ingenieros con mxWrite (Deshacer); el SC con su constancia (mxScSet) */
function mobSetSt(amb,cid,s,lbl){const c=MX.cat.get(cid);if(!mobStCan(c))return;
  if(!canDaily){mxScSet(amb,cid,s);return}
  const prev=((MX.amb.get(amb)||{}).c||{})[cid];if(prev===s&&!(typeof mxScPend==='function'&&mxScPend(amb,cid)))return;const DEL=firebase.firestore.FieldValue.delete();
  mxWrite(new Map([[amb,{[cid]:s}]]),lbl||`${c.name}: ${MXS[s]}`,new Map([[amb,{[cid]:prev===undefined?DEL:prev}]])).then(()=>{if(OBS)mobDraw()})}
function mobActHtml(o){const cells=mxCells().get(o.amb)||{};
  const items=Object.entries(cells).map(([k,x])=>({c:MX.cat.get(k),x})).filter(r=>r.c&&!r.c.arch&&mxMine(r.c)).sort((p,q)=>typeof mxSeqCmp==='function'?mxSeqCmp(p.c,q.c):0);
  const open=items.filter(r=>r.x.s!=='t'&&r.x.s!=='n'),done=items.filter(r=>r.x.s==='t'||r.x.s==='n');
  const row=r=>{const can=mobStCan(r.c);return`<div class="mxri${r.x.sug?' sug':''}" data-mobrc="${esc(r.c.id)}"><div class="mxrin"><span class="mxsw" style="--c:${esc(conOf(r.c.sc).color)}"></span><span><b>${esc(r.c.name)}</b><small>${esc(conOf(r.c.sc).name)}${r.x.sug?' · sin validar':''}${r.x.ob?` · ${r.x.ob} obs.`:''}</small></span></div>
    <div class="mxrbt" role="group" aria-label="Estado de ${esc(r.c.name)}">${['p','c','t','n'].map(s=>`<button class="mc s-${s}${r.x.s===s?' on':''}${r.x.s===s&&r.x.sug?' sug':''}" data-mobst="${s}"${can?'':' disabled'} aria-pressed="${r.x.s===s}"><i>${MXI[s]||'○'}</i>${MXS[s]}</button>`).join('')}</div></div>`};
  let h=open.length?`<div class="mxrl">${open.map(row).join('')}</div>`:`<p class="note">${items.length?'Todo lo de este ambiente está terminado o no aplica.':'Este ambiente todavía no tiene actividades en la Matriz'+(SCK()?' de tu partida':'')+'.'}</p>`;
  if(done.length)h+=`<details class="mxrdone"><summary>Terminadas o que no aplican (${done.length})</summary><div class="mxrl">${done.map(row).join('')}</div></details>`;
  if(!o.add)h+=`<div class="kbtns"><button class="kbig ghost" data-moba="addon">＋ Agregar actividad</button></div>`;
  else{const qq=mnk(o.aq||'');const L=[...MX.cat.values()].filter(c=>!c.arch&&!cells[c.id]&&mobStCan(c)&&(!qq||mnk(c.name+' '+conOf(c.sc).name).includes(qq)))
      .sort((x,y)=>conOf(x.sc).name.localeCompare(conOf(y.sc).name)||x.name.localeCompare(y.name)).slice(0,40);
    h+=`<div class="ksl">Agregar actividad (queda Pendiente)</div><input class="kin" id="mobaq" value="${esc(o.aq||'')}" placeholder="Buscar en el catálogo: actividad o subcontratista" aria-label="Buscar actividad">
      <div class="mobl">${L.map(c=>`<button class="mxpk" data-mobadd="${esc(c.id)}"><span class="mxsw" style="--c:${esc(conOf(c.sc).color)}"></span><span><b>${esc(c.name)}</b><small>${esc(conOf(c.sc).name)}</small></span></button>`).join('')||'<p class="note">Nada con ese nombre en el catálogo.</p>'}</div>
      ${typeof mxEd==='function'&&mxEd()||SCK()?'<button class="lnkb" data-moba="addc">¿No está? Crear una actividad nueva en el catálogo…</button>':'<p class="knote">¿No está en el catálogo? Pídele al ingeniero de producción que la cree.</p>'}`}
  return h}
function mobOpen(id){const n=MX.obs.get(id);if(!n)return;OBS={mode:'edit',id,amb:n.amb,pt:n.pt||null,cat:n.cat,desc:n.desc||'',q:'',newPh:[]};mobDraw()}
function mobClose(){const sh=$('#mobsheet');if(sh)sh.remove();const had=!!(OBS&&OBS.pt);OBS=null;if(had&&U.tab==='mat'&&U.mxV==='pla')requestRender()}
/** actividades donde registrar: SOLO las que el ambiente tiene en la Matriz (decidido con el dueño: una observación cuelga de una
    actividad del ambiente; si falta la actividad entera, se agrega al ambiente como Pendiente), en el orden del tren; q filtra entre ellas */
function mobCats(amb,q){const cells=mxCells().get(amb)||{};const qq=mnk(q||'');
  return Object.keys(cells).map(k=>MX.cat.get(k)).filter(c=>c&&!c.arch&&mobCanCat(c)&&(!qq||mnk(c.name).includes(qq)))
    .sort((x,y)=>typeof mxSeqCmp==='function'?mxSeqCmp(x,y):(x.ord||0)-(y.ord||0)).map(c=>({c,o:cells[c.id]}))}
/** quien puede agregar una actividad al ambiente (como Pendiente): editores y el SC en su partida (mxAddCell, matriz-rec.js) */
const mobCanAdd=()=>!!me&&(!!canDaily||SCK());
function mobItemHtml(n){const c=MX.cat.get(n.cat);const co=conOf(n.sc);
  return`<button class="mobi st-${n.st}" data-mobo="${esc(n.id)}" style="--c:${esc(co.color)}"><b class="mobn">${esc(mobLbl(n))}</b><span><b>${esc(n.desc||'')}</b><small>${esc(c?c.name:'')} · ${esc(co.name)}${n.st!=='ab'?' · '+MOBST[n.st]:''}${(n.ph||[]).length?' · 📷':''}${n.pt?'':' · sin punto'}</small></span></button>`}
function mobDraw(){if(!OBS)return;const o=OBS;const a=S.amb.get(o.amb);const n=o.mode==='edit'?MX.obs.get(o.id):null;if(o.mode==='edit'&&!n){mobClose();return}
  const sec=a&&secOf(a.sectorId);let h='';
  if(!n&&o.reg){h+=`<div class="ksh"><i class="kn mobk" aria-hidden="true">✏️</i><div><b>${a?esc(a.code+' · '+a.name):'Sin ambiente'}</b><span>${sec?esc(sec.name):''}${o.pt?' · punto marcado en el plano':''}</span></div><button class="kx" data-mobx aria-label="Cerrar">×</button></div>
      <div class="seg mobtabs" role="tablist"><button data-mobtab="act" class="${o.tab==='act'?'on':''}" role="tab" aria-selected="${o.tab==='act'}">Actividades</button><button data-mobtab="obs" class="${o.tab==='obs'?'on':''}" role="tab" aria-selected="${o.tab==='obs'}">📍 Observación aquí</button></div>`}
  if(!n&&o.reg&&o.tab==='act')h+=mobActHtml(o);
  else if(!n){const cats=mobCats(o.amb,o.q);const c=MX.cat.get(o.cat);
    h+=o.reg?`<div class="ksl">Nueva observación ${a?esc(a.code)+'-'+(o.num||mobNext(a.id)):''}</div>`:`<div class="ksh"><i class="kn mobk" aria-hidden="true">📍</i><div><b>Nueva observación ${a?esc(a.code)+'-'+(o.num||mobNext(a.id)):''}</b><span>${a?esc(a.code+' · '+a.name):'Sin ambiente'}${sec?' · '+esc(sec.name):''}${o.pt?' · punto marcado en el plano':''}</span></div><button class="kx" data-mobx aria-label="Cerrar">×</button></div>`;
    h+=`<div class="ksl">¿En qué actividad?</div>${c?`<div class="kchips kw"><button class="on" data-mobc="" style="--c:${esc(conOf(c.sc).color)}"><i></i>${esc(c.name)} ✕</button></div>`:
      `${cats.length>12||o.q?`<input class="kin" id="mobq" value="${esc(o.q)}" placeholder="Buscar entre las actividades del ambiente" aria-label="Buscar actividad">`:''}
      <div class="kchips kw mobcs">${cats.map(({c,o:x})=>`<button data-mobc="${esc(c.id)}" style="--c:${esc(conOf(c.sc).color)}" title="${esc(conOf(c.sc).name)}${x?' · '+MXS[x.s]:''}"><i></i>${esc(c.name)}${x&&x.s==='t'?' ✓':''}</button>`).join('')||`<p class="note">${o.q?'Ninguna actividad del ambiente con ese nombre.':'Este ambiente no tiene actividades en la Matriz'+(SCK()?' de tu partida':'')+'.'}</p>`}</div>
      <p class="knote">¿Falta la actividad entera? No es una observación: ${mobCanAdd()?'<button class="lnkb" data-moba="addc">agrégala al ambiente como Pendiente</button>':'pídele al ingeniero de producción que la agregue al ambiente como Pendiente'}.</p>`}`;
    if(c&&!SCK()&&mxScsOf(c).length>1){const cur=o.sc&&mxScsOf(c).includes(o.sc)?o.sc:c.sc;
      h+=`<div class="ksl">¿De qué subcontratista?</div><div class="kchips kw">${mxScsOf(c).map(x=>`<button class="${x===cur?'on':''}" data-mobsc="${esc(x)}" style="--c:${esc(conOf(x).color)}"><i></i>${esc(conOf(x).name)}</button>`).join('')}</div>`}
    if(c){const fr=mobFrases(c.id);
      h+=`<div class="ksl">¿Qué hay que hacer?</div><div class="kchips kw">${fr.map(t=>`<button data-mobd="${esc(t)}" class="${o.desc===t?'on':''}">${esc(t)}</button>`).join('')}</div>
        <textarea class="kin mobdesc" id="mobdesc" rows="2" maxlength="600" placeholder="Ej.: sello de la ventana despegado en la esquina" aria-label="Qué hay que hacer">${esc(o.desc)}</textarea>`;
      h+=`<div class="cph mobph">${o.newPh.map((s,i)=>`<div class="th"><img src="${s}" alt="Foto nueva"><button data-mobphn="${i}" aria-label="Quitar foto">&times;</button></div>`).join('')}<label class="kph">${CAM} Foto (opcional)<input type="file" accept="image/*" capture="environment" id="mobfoto" hidden></label></div>`;
      h+=`<div class="kbtns"><button class="kbig pri" data-moba="save">Guardar observación</button><button class="kbig ghost" data-mobx>Cancelar</button></div>`}
    const L=a?mobOf(a.id).filter(x=>x.st!=='anu'):[];
    if(L.length)h+=`<div class="ksl">En este ambiente (${L.filter(x=>x.st==='ab').length} abiertas)</div><div class="mobl">${L.map(mobItemHtml).join('')}</div>`}
  else{const c=MX.cat.get(n.cat);const co=conOf(n.sc);const ed=mobCanEd(n),lv=mobCanLev(n);
    h+=`<div class="ksh"><i class="kn mobk dia" aria-hidden="true">${esc(String(n.num||''))}</i><div><b>${esc(mobLbl(n))} · ${esc(c?c.name:'')}</b><span>${a?esc(a.code+' · '+a.name):''} · ${esc(co.name)} · <b class="mobst st-${n.st}">${MOBST[n.st]||n.st}</b></span>
      <span>Registró ${esc(n.n||n.by||'')} · ${esc(fmtD(ldt(n.t)))}${n.lev&&n.st!=='ab'?` · levantó ${esc(n.lev.n||'')}${n.lev.sc?' (SC)':''} ${esc(fmtD(ldt(n.lev.t)))}`:''}${n.st==='ab'&&n.reab?` · reabrió ${esc(n.reab.n||'')} ${esc(fmtD(ldt(n.reab.t)))}`:''}${n.st==='anu'&&n.anu?` · anuló ${esc(n.anu.n||'')}`:''}</span></div><button class="kx" data-mobx aria-label="Cerrar">×</button></div>`;
    h+=ed&&n.st==='ab'?`<textarea class="kin mobdesc" id="mobdesc" rows="2" maxlength="600" aria-label="Qué hay que hacer">${esc(o.desc)}</textarea>`:`<p class="mobtx">${esc(n.desc||'')}</p>`;
    const ph=[...(n.ph||[]),...((n.lev||{}).ph||[])];
    h+=`<div class="cph mobph">${ph.map(r=>`<div class="th">${mobImg(r)}</div>`).join('')}${o.newPh.map((s,i)=>`<div class="th"><img src="${s}" alt="Foto nueva"><button data-mobphn="${i}" aria-label="Quitar foto">&times;</button></div>`).join('')}
      ${(n.st==='ab'&&(lv||ed))?`<label class="kph">${CAM} ${lv&&!ed?'Foto del después (opcional)':'Foto (opcional)'}<input type="file" accept="image/*" capture="environment" id="mobfoto" hidden></label>`:''}</div>`;
    if(n.st==='ab'){h+=`<div class="kbtns">${lv?'<button class="kbig ok" data-moba="lev">✓ Levantada</button>':''}${ed?'<button class="kbig ghost" data-moba="sav">Guardar cambios</button>':''}</div>`;
      if(lv&&o.newPh.length)h+=`<p class="knote">La foto se guarda con «✓ Levantada» como foto del después${ed?', o con «Guardar cambios» como foto de la observación':''}.</p>`}
    else if(n.st==='lev'&&lv)h+=`<div class="kbtns"><button class="kbig ghost" data-moba="reab">↺ Reabrir (no quedó bien)</button></div>`;
    h+=`<div class="kbtns">${n.pt&&!(U.tab==='mat'&&U.mxV==='pla'&&U.mxPlOb)?'<button class="kbig ghost" data-moba="plano">Ver en el plano</button>':''}<button class="kbig ghost" data-moba="mat">Ver en la Matriz</button>${ed&&n.st!=='anu'?'<button class="kbig ghost mobdel" data-moba="anu">Anular</button>':''}</div>`;
    if(!lv&&!ed)h+=`<p class="knote">La levanta el ingeniero o el subcontratista de la partida.</p>`}
  let sh=$('#mobsheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='mobsheet';sh.innerHTML='<div class="ksc mobsc" role="dialog" aria-modal="true" aria-label="Observación"></div>';document.body.appendChild(sh);
    sh._open=NOW();sh.onclick=mobClick;sh.onchange=mobChange;sh.oninput=mobInput}
  const sc=sh.firstChild;if(sc.dataset.h!==h){const st=sc.scrollTop;const fq=document.activeElement&&(document.activeElement.id==='mobq'||document.activeElement.id==='mobaq')&&document.activeElement.id;sc.innerHTML=h;sc.dataset.h=h;sc.scrollTop=st;
    if(fq){const i=$('#'+fq);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}}}
function mobInput(e){const t=e.target;if(!OBS)return;if(t.id==='mobdesc')OBS.desc=t.value;else if(t.id==='mobq'){OBS.q=t.value;mobDraw()}else if(t.id==='mobaq'){OBS.aq=t.value;mobDraw()}}
async function mobChange(e){const t=e.target;if(!OBS)return;
  if(t.id==='mobfoto'&&t.files[0]){const f=t.files[0];t.value='';try{toast('Comprimiendo foto…');OBS.newPh.push(await shrinkPhoto(f));mobDraw()}catch(err){toast(err.message)}}}
function mobClick(e){const t=e.target;const sh=$('#mobsheet');if(t===sh&&NOW()-(sh._open||0)<600)return;if(t===sh||t.closest('[data-mobx]')){mobClose();return}if(!OBS)return;let b;
  const im=t.closest('.mobph img');if(im&&im.src){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-x="1">Cerrar</button></div><img src="${im.src}" alt="">`;lb.onclick=ev=>{if(ev.target.dataset.x||ev.target===lb)lb.remove()};document.body.appendChild(lb);return}
  if((b=t.closest('[data-mobtab]'))){OBS.tab=MOBTAB=b.dataset.mobtab;mobDraw();return}
  if((b=t.closest('[data-mobst]'))){const cid=b.closest('[data-mobrc]').dataset.mobrc;mobSetSt(OBS.amb,cid,b.dataset.mobst);return}
  if((b=t.closest('[data-mobadd]'))){const cid=b.dataset.mobadd;const c=MX.cat.get(cid);OBS.add=false;OBS.aq='';mobSetSt(OBS.amb,cid,'p',`Agregada: ${c?c.name:''} (pendiente)`);mobDraw();return}
  if((b=t.closest('[data-mobc]'))){OBS.cat=b.dataset.mobc;OBS.q='';OBS.sc='';mobDraw();return}
  if((b=t.closest('[data-mobsc]'))){OBS.sc=b.dataset.mobsc;mobDraw();return}
  if((b=t.closest('[data-mobd]'))){const v=b.dataset.mobd;OBS.desc=MOB_GEN.includes(v)?v+' ':v;mobDraw();const i=$('#mobdesc');if(i&&MOB_GEN.includes(v)){i.focus();i.setSelectionRange(i.value.length,i.value.length)}return}
  if((b=t.closest('[data-mobphn]'))){OBS.newPh.splice(+b.dataset.mobphn,1);mobDraw();return}
  if((b=t.closest('[data-mobo]'))){mobOpen(b.dataset.mobo);return}
  if((b=t.closest('[data-moba]'))){const k=b.dataset.moba;const n=MX.obs.get(OBS.id);
    if(k==='addon'){OBS.add=true;mobDraw();setTimeout(()=>{const i=$('#mobaq');if(i)i.focus()},30);return}
    if(k==='addc'){const amb=OBS.amb,ed=typeof mxEd==='function'&&mxEd();
      /* desde la pestaña Observación: «agrégala al ambiente» lleva a Actividades con el buscador abierto */
      if(!b.closest('.mxrl')&&OBS.reg&&OBS.tab==='obs'){OBS.tab='act';OBS.add=true;mobDraw();return}
      if(!ed&&!SCK()){OBS.tab='act';OBS.add=true;OBS.reg=true;mobDraw();return}
      mobClose();mxRecPick(amb,ed,cid=>mxAddCell(amb,cid,ed));return}
    if(k==='save')mobCreate();else if(k==='lev')mobLev();else if(k==='reab')mobReab();else if(k==='anu')mobAnu();else if(k==='sav')mobSaveEd();
    else if(k==='plano'&&n){mobClose();mobGoPlan(n)}else if(k==='mat'&&n){mobClose();mxGoCell(n.amb,n.cat)}}}
/** abre Matriz › Gráfico › Observaciones en el piso de la observación y la resalta */
function mobGoPlan(n){const pid=pisoOfAmb(n.amb);if(pid&&S.pis.has(pid)){U.piso=pid;U.pisoAll=false}
  U.tab='mat';U.mxV='pla';U.mxPlOb=true;U.mxPlEd=false;MXPL.sel=n.amb;MXPL.ob=n.id;saveUI();render()}

/* ---------- lista para la ficha de una celda, el Lookahead y Campo ---------- */
/** html de las observaciones de una actividad en un ambiente (ficha de la celda en la Matriz) */
function mobCellHtml(amb,cat){const L=mobOf(amb,cat).filter(n=>n.st!=='anu');const c=MX.cat.get(cat);const can=mobCanCat(c);if(!L.length&&!can)return'';
  return`<hr><div class="ph">Observaciones${L.length?` (${L.filter(n=>n.st==='ab').length} abiertas)`:''}</div>${L.map(n=>`<button data-do="mobo" data-id="${esc(n.id)}" class="mobpi st-${n.st}"><b>${esc(mobLbl(n))}</b> ${esc(n.desc||'')}${n.st!=='ab'?` <small class="mu">· ${MOBST[n.st]}</small>`:''}</button>`).join('')}
    ${can&&mobHasGeo(amb)?'<button data-do="mobp">📍 Observación marcando el punto en el plano</button>':''}${can?'<button data-do="mobn">＋ Observación (sin punto en el plano)</button>':''}`}
/** el ambiente está dibujado en alguna lámina (Sectorización) */
const mobHasGeo=amb=>{const a=S.amb.get(amb);return!!(a&&a.geo&&Object.values(a.geo).some(g=>g&&g.length))};
/** desde la ficha de la celda: abre Gráfico › Registrar en el piso del ambiente; el siguiente toque dentro del ambiente abre «Observación aquí» con la actividad elegida */
function mobPlanAt(amb,cat){const pid=pisoOfAmb(amb);if(pid&&S.pis.has(pid)){U.piso=pid;U.pisoAll=false}
  U.tab='mat';U.mxV='pla';U.mxPlEd=true;MXPL.sel=amb;MXPL.ob='';MXPL.pend={amb,cat};saveUI();render();
  const a=S.amb.get(amb);toast(`Toca en el plano, dentro de ${a?a.code:'el ambiente'}, dónde está la observación.`)}
/** lista de observaciones de una fila del Lookahead (clic en «N obs.») */
function mobListPop(btn,amb,cat){const c=MX.cat.get(cat);const a=S.amb.get(amb);if(!c||!a)return;const L=mobOf(amb,cat).filter(n=>n.st==='ab');
  openPop(btn,`<div class="ph">${esc(c.name)} · ${esc(a.code)}</div><div class="ptx">${L.length} ${L.length===1?'observación abierta':'observaciones abiertas'}: la actividad está hecha pero falta levantarlas. Programa un día en la fila.</div>
    ${L.map(n=>`<button data-do="o" data-id="${esc(n.id)}"><b>${esc(mobLbl(n))}</b> ${esc(n.desc||'')}${(n.ph||[]).length?' 📷':''}</button>`).join('')}
    ${L.some(n=>n.pt)?'<hr><button data-do="pl">Ver en el plano</button>':''}`,
    {o:d=>mobOpen(d.id),pl:()=>{const n=L.find(x=>x.pt);if(n)mobGoPlan(n)}})}
/** observaciones abiertas de la actividad de una fila del Lookahead */
const mobRowN=x=>{if(!x||!MX.obs.size)return 0;const c=mxCatOf(x);return c?mobOpenN(x.ambId,c):0};
/** insignia de la fila del Lookahead (k = posición entre las insignias); vacía si no tiene observaciones abiertas */
function mobRowBadge(x,k){const n=mobRowN(x);if(!n)return'';const c=mxCatOf(x);
  return`<span class="mxbadge mobrb" style="--k:${k||0}" data-mobl="${esc(x.ambId+'|'+c)}" role="button" tabindex="0" title="${n} ${n===1?'observación abierta':'observaciones abiertas'} de esta actividad en el ambiente (punch list): toca para verlas">${n}</span>`}
document.addEventListener('click',e=>{const b=e.target.closest('[data-mobl]');if(!b)return;e.stopPropagation();e.preventDefault();const[amb,cat]=b.dataset.mobl.split('|');mobListPop(b,amb,cat)},true);
