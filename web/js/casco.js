"use strict";
/* LPS 911 · Módulo Casco (docs/ia/casco.md, oct 2026, decidido con el dueño). El mismo motor de Last Planner con sus propias
   colecciones (prefijo cs_, base.js fcol): restricciones, plan semanal, PPC, campo, plan diario y liberaciones funcionan igual.
   Equivalencia: nivel = piso; cada nivel tiene tres grupos (sectors.grp): E Estructura (planta de encofrado del techo N),
   S Frentes sueltos (escalera, fuera del ritmo) y A Albañilería, tabiques y tarrajeo (planta de arquitectura del piso N, que
   queda entre el techo N−1 y el techo N); los sectores son los «ambientes». El catálogo de casco es mcat (en cs_mcat) con
   campos propios: grp, tr (orden), off (desfase en días), dur, vac (vaciado), ent (entrega a Arquitectura), mets (metrado típico
   por sector). Aquí: Configuración › Casco, obra de ejemplo, vista Tren del Lookahead, generador, entregas y asistente de
   sectorización (versiones en cs_ksec). Parte de la app: comparte las variables globales de los demás archivos de js/. */
const CSG_ORD=['E','S','A'];
const CSG={E:'Estructura',S:'Frentes sueltos',A:'Albañilería, tabiques y tarrajeo'};
const CSG_SUB={E:'Planta de encofrado del techo · celda = techo y sector (T3·S2)',S:'Fuera del ritmo de los sectores · celda = techo',A:'Planta de arquitectura del piso · celda = piso y sector (P1·A2)'};
const csSecOf=a=>a?(S.sec.get(a.sectorId)||ARCH.sec.get(a.sectorId)):null;
const csAmbGrp=id=>{const s=csSecOf(S.amb.get(id)||ARCH.amb.get(id));return(s&&s.grp)||''};
const csPisoTag=(p,g)=>p?(g==='A'?(p.pc||p.code||p.name):(p.tc||p.code||p.name)):'';
const csCats=g=>[...MX.cat.values()].filter(c=>!c.arch&&c.grp&&(!g||c.grp===g)).sort((a,b)=>CSG_ORD.indexOf(a.grp)-CSG_ORD.indexOf(b.grp)||(a.tr??999)-(b.tr??999)||String(a.name).localeCompare(b.name));
const csCatOf=x=>{const id=typeof mxCatOfN==='function'?mxCatOfN(x):'';const c=id&&MX.cat.get(id);return c&&c.grp?c:null};
const csEd=()=>!!canWrite&&!(typeof PM==='function'&&PM());
const csHasData=()=>S.pis.size>0;
/** ambientes (sectores) de un grupo en un nivel, en orden */
function csAmbs(pid,g){const out=[];for(const s of S.sec.values())if(s.pisoId===pid&&s.grp===g)for(const a of S.amb.values())if(a.sectorId===s.id)out.push(a);return out.sort(byOrder)}
/** índice del sector dentro de su grupo (colores S1…S4 del tren) */
function csAmbIdx(a){if(!a)return 0;const L=[...S.amb.values()].filter(x=>x.sectorId===a.sectorId).sort(byOrder);return Math.max(0,L.findIndex(x=>x.id===a.id))}
const csWd=(d,n)=>n>0?wshift(d,n):d;
const csNextWork=d=>isWork(d)?d:wshift(d,1);
const csTomorrow=()=>csNextWork(addD(todayIso(),1));

/* ---------- Configuración › Casco ---------- */
let CS_LP=null;/* pisos de Last Planner (para el vínculo de la entrega); se leen una vez */
function csLpPisos(){if(CS_LP||!db)return CS_LP||[];CS_LP=[];fcolLp('pisos').get().then(sn=>{CS_LP=sn.docs.map(d=>({...d.data(),id:d.id})).filter(p=>!p.arch).sort(byOrder);if(U.tab==='cfg')requestRender()}).catch(()=>{});return CS_LP}
function csCfgCard(){if(typeof ensureMcat==='function')ensureMcat();csKsecEnsure();
  const ed=csEd(),dis=ed?'':' disabled',P_=pisos();
  const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const empty=!csHasData();
  let h=`<div class="card cscard"><h2>Módulo Casco <span class="sub">Estructura, albañilería, tabiques y tarrajeo por sectores; los acabados por ambiente siguen en Last Planner</span></h2><div class="pad">`;
  if(empty)h+=`<div class="callout">Esta obra todavía no tiene niveles en Casco.${isAdmin?' Puedes empezar con la obra de ejemplo (solo en la copia de prueba) o crear los niveles con el asistente de sectorización.':' El administrador debe crearlos.'}</div>`;
  if(isAdmin){h+=`<div class="csrow">${!S.meta.get('project')?`<button class="ib pri" data-cs="init">Crear Casco con la configuración de Last Planner</button>`:''}${window.LPS_ENV==='pruebas'&&empty?`<button class="ib${S.meta.get('project')?' pri':''}" data-cs="demo">Cargar obra de ejemplo</button>`:''}</div>`}
  h+=`<p class="note">Cada nivel tiene tres grupos: <b>Estructura</b> (planta de encofrado del techo), <b>Frentes sueltos</b> (escalera) y <b>Albañilería</b> (planta de arquitectura del piso). Lo que divide o atraviesa ambientes va aquí por sector; el acabado de cada cara va por ambiente en Last Planner.</p></div></div>`;
  /* catálogo */
  const cats=csCats();
  const exo=sel=>`<option value="">—</option>`+cons.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}${c.casa?' (casa)':''}</option>`).join('');
  h+=`<div class="card"><h2>Catálogo de casco <span class="sub">Secuencia del tren: el generador usa el orden, el desfase y los días de cada partida</span></h2><div class="tscroll"><table class="t cscat"><thead><tr><th title="Orden en el tren">N.º</th><th>Partida</th><th>Grupo</th><th>Ejecutor</th><th>Und.</th><th title="Rendimiento por persona y día">Rend.</th><th title="Metrado típico por sector (se usa si el sector no tiene el suyo)">Metrado/sector</th><th title="Días desde el inicio del sector (estructura: desde el primer día del techo; albañilería: desde el inicio del piso)">Desfase</th><th title="Días que dura en cada sector">Días</th><th title="Vaciado de concreto: pide liberación de calidad">Vaciado</th><th title="Hito de entrega del sector a Arquitectura">Entrega</th>${ed?'<th></th>':''}</tr></thead><tbody>`;
  if(!cats.length)h+=`<tr><td colspan="12" class="mu" style="padding:12px">Sin partidas todavía.</td></tr>`;
  for(const c of cats)h+=`<tr data-csc="${esc(c.id)}"><td><input class="ci csn" type="number" min="0" data-csf="tr" value="${c.tr??''}"${dis} aria-label="Orden de ${esc(c.name)}"></td><td><input class="ci" data-csf="name" value="${esc(c.name)}"${dis} aria-label="Nombre"></td>
    <td><select data-csf="grp"${dis} aria-label="Grupo">${CSG_ORD.map(g=>`<option value="${g}"${c.grp===g?' selected':''}>${CSG[g]}</option>`).join('')}</select></td>
    <td><select data-csf="sc"${dis} aria-label="Ejecutor">${exo(c.sc)}</select></td>
    <td><input class="ci csn" data-csf="und" value="${esc(c.und||'')}"${dis} aria-label="Unidad"></td>
    <td><input class="ci csn" type="number" min="0" step="any" data-csf="rend" value="${c.rend??''}"${dis} aria-label="Rendimiento"></td>
    <td><input class="ci csn" type="number" min="0" step="any" data-csf="mets" value="${c.mets??''}"${dis} aria-label="Metrado por sector"></td>
    <td><input class="ci csn" type="number" min="0" max="60" data-csf="off" value="${c.off??0}"${dis} aria-label="Desfase en días"></td>
    <td><input class="ci csn" type="number" min="1" max="20" data-csf="dur" value="${c.dur??1}"${dis} aria-label="Días por sector"></td>
    <td><input type="checkbox" data-csf="vac"${c.vac?' checked':''}${dis} aria-label="Vaciado"></td>
    <td><input type="checkbox" data-csf="ent"${c.ent?' checked':''}${dis} aria-label="Entrega a Arquitectura"></td>
    ${ed?`<td><button class="ab" data-cs="catdel" data-id="${esc(c.id)}" title="Quitar del catálogo" aria-label="Quitar ${esc(c.name)}">&times;</button></td>`:''}</tr>`;
  h+=`</tbody></table></div>${ed?`<div class="pad csrow"><button class="ib" data-cs="catadd">+ Partida</button>${!cats.length?'<button class="ib pri" data-cs="cattip">Cargar catálogo típico</button>':''}<span class="note">Los cambios se guardan al salir de cada casilla. Ejecutor «casa» se marca abajo.</span></div>`:''}</div>`;
  /* ejecutores */
  h+=`<div class="card"><h2>Ejecutores <span class="sub">Cuadrillas de casa (con su capataz) o subcontratistas: el PPC se mide por ejecutor</span></h2><div class="pad"><div class="csexl">${cons.map(c=>`<label class="chk"><input type="checkbox" data-cs="casa" data-id="${c.id}"${c.casa?' checked':''}${dis}> <i class="csdot" style="--c:${esc(c.color)}"></i>${esc(c.name)} <span class="mu">${c.casa?'Casa':'Subcontratista'}</span></label>`).join('')||'<span class="mu">Agrégalos en Configuración › Subcontratistas.</span>'}</div>
    <p class="note">Marca las cuadrillas de casa. En Casco se programa en la reunión, sin propuestas: el capataz reporta inicio, detención y cierre desde su celular.</p></div></div>`;
  /* niveles y entrega */
  const LP=csLpPisos();
  h+=`<div class="card"><h2>Niveles y entrega a Arquitectura <span class="sub">Cuando un sector termina el tarrajeo, su entrega se publica como hito de inicio en el piso de Last Planner</span></h2><div class="tscroll"><table class="t"><thead><tr><th>Nivel</th><th>Techo</th><th>Piso</th><th>Sectores</th><th>Piso en Last Planner</th></tr></thead><tbody>
    ${P_.map(p=>{const nE=csAmbs(p.id,'E').length,nA=csAmbs(p.id,'A').length;return`<tr><td><b>${esc(p.name)}</b></td><td class="mono">${esc(p.tc||'')}</td><td class="mono">${esc(p.pc||'')}</td><td>${nE} de estructura${nA?` · ${nA} de albañilería`:''}</td>
      <td><select data-cs="lp" data-id="${p.id}"${dis} aria-label="Piso de Last Planner de ${esc(p.name)}"><option value="">Sin vincular</option>${LP.map(l=>`<option value="${l.id}"${p.lp===l.id?' selected':''}>${esc(l.name||l.code)}</option>`).join('')}</select></td></tr>`}).join('')||'<tr><td colspan="5" class="mu" style="padding:12px">Sin niveles.</td></tr>'}
    </tbody></table></div>${ed&&P_.length?`<div class="pad csrow"><button class="ib" data-cs="entpub">◆ Publicar entregas en Last Planner</button><span class="note">${csEntCount()} entrega(s) programadas en el Lookahead de Casco.</span></div>`:''}</div>`;
  h+=csSecCard();
  return h}

/* ---------- catálogo: edición ---------- */
function csCatSet(id,f,v){const c=MX.cat.get(id);if(!c)return;let val=v;
  if(['tr','rend','mets','off','dur'].includes(f)){val=v===''?null:+v;if(val!=null&&!(val>=0)){toast('Escribe un número válido.');requestRender();return}if(f==='dur'&&val!=null&&val<1)val=1}
  if(f==='name'){val=String(v||'').trim();if(!val){toast('La partida necesita un nombre.');requestRender();return}}
  fcol('mcat').doc(id).set({[f]:val,by:me.email,t:NOW()},{merge:true}).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}
async function csCatAdd(){const n=await uiAsk({title:'Nueva partida del catálogo de casco',input:{label:'Nombre',placeholder:'Ej.: Curado de losa',required:true},ok:'Agregar'});if(!n)return;
  const id=uid('k');const tr=Math.max(0,...csCats().map(c=>+c.tr||0))+1;
  fcol('mcat').doc(id).set({ref:id,name:String(n).trim(),grp:'E',tr,off:0,dur:1,cl:'t',al:[mnk(n)],ord:tr,by:me.email,t:NOW()}).then(()=>toast('Partida agregada')).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}
/** catálogo típico de casco (el de la obra de ejemplo, sin ejecutores): punto de partida para una obra nueva */
async function csCatTip(){if(!csEd()||csCats().length)return;if(!(await uiAsk({title:'Cargar catálogo típico',text:`Se agregan ${CS_DEMO_CAT.length} partidas típicas (estructura, escalera, albañilería, tabiques, tarrajeo y entrega) con su secuencia, rendimientos y metrados de referencia. Luego asigna los ejecutores y ajusta los valores a tu obra.`,ok:'Cargar'})))return;
  const b=db.batch(),t=NOW();CS_DEMO_CAT.forEach(([k,name,grp,,und,mets,rend,off,dur,vac,ent],i)=>b.set(fcol('mcat').doc('k-'+k),{ref:'k-'+k,name,grp,sc:'',und,mets,rend,off,dur,vac:!!vac,ent:!!ent,tr:i+1,ord:i+1,cl:'t',al:[mnk(name)],by:me.email,t},{merge:true}));
  try{await b.commit();toast('Catálogo típico cargado')}catch(e){toast('No se pudo: '+(e&&e.code||e))}}
async function csCatDel(id){const c=MX.cat.get(id);if(!c)return;if(!(await uiAsk({title:'Quitar del catálogo',text:`«${c.name}» deja de usarse en el generador. Las actividades ya programadas no cambian.`,ok:'Quitar',tone:'warn'})))return;
  fcol('mcat').doc(id).set({arch:{t:NOW(),by:me.email,n:me.name||me.email}},{merge:true}).then(()=>toast('Quitada del catálogo')).catch(e=>toast('No se pudo: '+(e&&e.code||e)))}

/* ---------- crear Casco y obra de ejemplo ---------- */
const CS_COPY=['refWeek','refDate','cal','cnc','cncImp','restrTypes','restrGrp','restrAreas','propCutDow','propCutHH','frzCutDow','frzCutHH','planCutHH','closeCutHH','engCutHH','name','fullName','owner','location','finObra'];
async function csLpProject(){let lp={};try{const d=await fcolLp('meta').doc('project').get();lp=d.exists?d.data()||{}:{}}catch(e){}const o={};CS_COPY.forEach(k=>{if(lp[k]!==undefined)o[k]=clone(lp[k])});o.name=(lp.name||'Obra')+' · Casco';o.casco=true;return o}
async function csInit(){if(!isAdmin)return;if(!(await uiAsk({title:'Crear Casco',text:'Se crea la configuración de Casco copiando la de Last Planner (calendario, semanas, horas de corte y causas). Luego agrega las partidas y crea los niveles con el asistente de sectorización.',ok:'Crear'})))return;
  try{await fcol('meta').doc('project').set(await csLpProject(),{merge:true});toast('Casco creado')}catch(e){toast('No se pudo crear: '+(e&&e.code||e))}}
/* obra de ejemplo (solo copia de prueba): sótano y 8 niveles; 4 sectores de estructura hasta el techo 4 y 3 desde el 5 (versión 2); escalera como frente suelto;
   3 sectores de albañilería por piso. Los techos del sótano al 2 se dan por hechos: el tren arranca mañana en el techo 3. */
const CS_DEMO_CON=[['cs-ramos','Cuadrilla Ramos','#1f5f7a',true,'Encofrado y concreto'],['cs-quispe','Cuadrilla Quispe','#6a4c93',true,'Albañilería y tarrajeo'],['cs-aceros','Aceros Andinos','#b5651d',false,'Acero'],['cs-inst','Instalaciones Pacífico','#2e7d4f',false,'IIEE e IISS'],['cs-tab','Tabiques Lima','#ad1457',false,'Drywall']];
/* [id, nombre, grupo, ejecutor, und, metrado por sector (4 sectores), rend, desfase, días, vaciado, entrega] */
const CS_DEMO_CAT=[['AV','Acero de verticales','E','cs-aceros','kg',1450,250,0,1,0,0],['EV','Encofrado de verticales','E','cs-ramos','m²',95,14,1,1,0,0],['VV','Concreto de verticales','E','cs-ramos','m³',12,6,2,1,1,0],
  ['DV','Desencofrado de verticales','E','cs-ramos','m²',95,45,3,1,0,0],['EL','Encofrado de vigas y losa','E','cs-ramos','m²',185,16,4,1,0,0],['AL','Acero de vigas y losa','E','cs-aceros','kg',2100,280,5,1,0,0],
  ['IL','Instalaciones en losa','E','cs-inst','pto',40,12,6,1,0,0],['VL','Concreto de vigas y losa','E','cs-ramos','m³',28,7,7,1,1,0],
  ['E1','Escalera: encofrado','S','cs-ramos','m²',22,10,0,1,0,0],['E2','Escalera: acero','S','cs-aceros','kg',420,200,1,1,0,0],['E3','Escalera: concreto','S','cs-ramos','m³',3.5,3,2,1,1,0],
  ['AS','Asentado de bloqueta','A','cs-quispe','m²',120,6,0,2,0,0],['IM','Instalaciones empotradas en muros','A','cs-inst','pto',30,10,2,1,0,0],['TD','Tabique: armado y 1.ª cara','A','cs-tab','m²',70,18,2,1,0,0],
  ['IT','Instalaciones en tabiques','A','cs-inst','pto',20,10,3,1,0,0],['SC','Tabique: 2.ª cara','A','cs-tab','m²',70,25,4,1,0,0],['TR','Tarrajeo de muros','A','cs-quispe','m²',240,9,5,2,0,0],
  ['EN','Entrega a Arquitectura','A','cs-quispe','',null,null,7,1,0,1]];
/* reparto desigual a propósito (el asistente muestra el balance) */
const CS_DEMO_W4=[1,1.08,0.94,0.98],CS_DEMO_W3=[1.33,1.4,1.27],CS_DEMO_WA=[1,1.12,0.88];
async function csDemo(){if(!isAdmin||window.LPS_ENV!=='pruebas')return;if(csHasData()){toast('Casco ya tiene niveles: la obra de ejemplo solo se carga en un Casco vacío.');return}
  if(!(await uiAsk({title:'Cargar obra de ejemplo',text:'Se crean un sótano y 8 niveles con sectores, cinco ejecutores (dos cuadrillas de casa y tres subcontratistas), el catálogo de casco y el tren desde mañana (los techos del sótano al 2 se dan por hechos). Solo en la copia de prueba.',ok:'Cargar ejemplo'})))return;
  toast('Cargando la obra de ejemplo…');
  const W=[];const t=NOW(),by=me.email;
  const proj=S.meta.get('project')?{}:await csLpProject();W.push(['meta','project',{...proj,casco:true,cascoDemo:true,name:proj.name||P().name||'Obra · Casco'}]);
  CS_DEMO_CON.forEach(([id,name,color,casa,partida])=>W.push(['contractors',id,{name,color,casa,partida}]));
  const cid=k=>'k-'+k;
  CS_DEMO_CAT.forEach(([k,name,grp,sc,und,mets,rend,off,dur,vac,ent],i)=>W.push(['mcat',cid(k),{ref:cid(k),name,grp,sc,und,mets,rend,off,dur,vac:!!vac,ent:!!ent,tr:i+1,ord:i+1,cl:'t',al:[mnk(name)],by,t}]));
  const LV=[{id:'n0',name:'Sótano',code:'SÓT',tc:'TS',pc:'PS'}];for(let n=1;n<=8;n++)LV.push({id:'n'+n,name:'Nivel '+n,code:'N'+n,tc:'T'+n,pc:'P'+n});
  const met=(s,k)=>{const c=CS_DEMO_CAT.find(x=>x[0]===k);return!c||c[5]==null?null:Math.round(c[5]*CS_DEMO_WA[s]*10)/10};
  LV.forEach((p,i)=>{W.push(['pisos',p.id,{name:p.name,code:p.code,tc:p.tc,pc:p.pc,order:i}]);
    const nE=i<=4?4:3;
    W.push(['sectors',p.id+'-e',{pisoId:p.id,code:'E',name:'Estructura',grp:'E',order:1}]);
    for(let s=0;s<nE;s++){const m={};CS_DEMO_CAT.filter(c=>c[2]==='E').forEach(c=>{const v=c[5]==null?null:Math.round(c[5]*(nE===4?CS_DEMO_W4[s]:CS_DEMO_W3[s])*10)/10;if(v!=null)m[cid(c[0])]=v});W.push(['ambientes',p.id+'-e'+(s+1),{sectorId:p.id+'-e',code:'S'+(s+1),name:'Sector '+(s+1),order:s+1,met:m}])}
    W.push(['sectors',p.id+'-f',{pisoId:p.id,code:'F',name:'Frentes sueltos',grp:'S',order:2}]);W.push(['ambientes',p.id+'-esc',{sectorId:p.id+'-f',code:'ESC',name:'Escalera',order:1}]);
    if(i>0){W.push(['sectors',p.id+'-a',{pisoId:p.id,code:'A',name:'Albañilería',grp:'A',order:3}]);
      for(let s=0;s<3;s++){const m={};CS_DEMO_CAT.filter(c=>c[2]==='A').forEach(c=>{const v=met(s,c[0]);if(v!=null)m[cid(c[0])]=v});W.push(['ambientes',p.id+'-a'+(s+1),{sectorId:p.id+'-a',code:'A'+(s+1),name:'Sector A'+(s+1),order:s+1,met:m}])}}});
  const vm=(grp,k,ws)=>{const m={};CS_DEMO_CAT.filter(c=>c[2]===grp&&c[5]!=null).forEach(c=>m[cid(c[0])]=ws.map(w=>Math.round(c[5]*w*10)/10));return m};
  W.push(['ksec','v1',{n:'Versión 1',grp:'E',from:'n0',to:'n4',k:4,names:['S1','S2','S3','S4'],met:vm('E',4,CS_DEMO_W4),note:'Juntas al tercio de la luz entre ejes',by,t}]);
  W.push(['ksec','v2',{n:'Versión 2',grp:'E',from:'n5',to:'n8',k:3,names:['S1','S2','S3'],met:vm('E',3,CS_DEMO_W3),note:'El techo típico baja de área desde el nivel 5',by,t}]);
  W.push(['ksec','va',{n:'Albañilería',grp:'A',from:'n1',to:'n8',k:3,names:['A1','A2','A3'],met:vm('A',3,CS_DEMO_WA),note:'Sobre la planta de arquitectura de cada piso',by,t}]);
  try{for(let i=0;i<W.length;i+=400){const b=db.batch();W.slice(i,i+400).forEach(([c,id,v])=>b.set(fcol(c).doc(id),v,{merge:true}));await b.commit()}}catch(e){toast('No se pudo cargar: '+(e&&e.code||e));return}
  /* el tren: se arma con el generador cuando llegan los datos (catálogo y niveles) */
  CS_DEMO_GEN=true;toast('Obra de ejemplo cargada: armando el tren…');csDemoGenTry()}
let CS_DEMO_GEN=false;
function csDemoGenTry(n=0){if(!CS_DEMO_GEN)return;const ok=S.pis.size>=9&&csCats().length>=18&&S.amb.size>=40;
  if(!ok){if(n<60)setTimeout(()=>csDemoGenTry(n+1),500);else{CS_DEMO_GEN=false;toast('La obra de ejemplo se cargó; arma el tren con el generador del Lookahead.')}return}
  CS_DEMO_GEN=false;const plan=csGenPlan({from:'n3',to:'n8',start:csTomorrow(),pace:1,gap:1,albK:2,grp:{E:1,S:1,A:1}});
  if(!plan.ops.length){toast('No había nada que programar.');return}
  csBatchActs(plan.ops).then(()=>{toast(`Tren de ejemplo listo: ${plan.add} actividades. Ábrelo en Lookahead › Vista › Tren.`);U.tab='look';U.lkV='tren';U.piso='';saveUI();render()})}
async function csBatchActs(ops){for(let i=0;i<ops.length;i+=400){const b=db.batch();ops.slice(i,i+400).forEach(o=>b.set(fcol(o.col).doc(o.id),o.after));await b.commit()}}

/* ---------- generador del tren ---------- */
/** Arma las actividades del tren. cfg: {from, to (ids de nivel), start (primer día del primer techo), pace (días por sector en estructura),
    gap (días tras vaciar la losa del S1 para empezar el techo siguiente), albK (la albañilería del piso N empieza al vaciar el techo N+albK), grp}.
    Solo programa desde mañana: lo de hoy y lo pasado no se toca (en una fila con historial se conservan sus días pasados). */
function csGenPlan(cfg){
  const L=pisos(),ix=id=>L.findIndex(p=>p.id===id),a0=ix(cfg.from),a1=ix(cfg.to);
  const out={ops:[],add:0,upd:0,same:0,past:0,warn:[],first:null,last:null};
  if(a0<0||a1<a0){out.warn.push('Elige un rango de niveles válido.');return out}
  const E=csCats('E'),A=csCats('A'),SS=csCats('S');if(!E.length){out.warn.push('El catálogo de casco no tiene partidas de estructura.');return out}
  const pace=Math.max(1,+cfg.pace||1),gap=Math.max(0,+cfg.gap||0),albK=Math.max(1,+cfg.albK||2);
  const vacE=E.filter(c=>c.vac);const offVL=Math.max(...(vacE.length?vacE:E).map(c=>+c.off||0));
  const albPace=Math.max(1,...A.map(c=>+c.dur||1));
  const LS={};let d=csNextWork(cfg.start||csTomorrow());
  for(let i=a0;i<=a1;i++){if(i>a0)d=csWd(LS[L[i-1].id],offVL+gap);LS[L[i].id]=d}
  const tom=csTomorrow(),today=todayIso();const T=[];
  const days=(d0,n)=>{const r=[d0];for(let k=1;k<n;k++)r.push(wshift(r[k-1],1));return r};
  for(let i=a0;i<=a1;i++){const p=L[i],ls=LS[p.id];
    if(cfg.grp.E){const am=csAmbs(p.id,'E');am.forEach((a,s)=>E.forEach(c=>T.push({c,a,days:days(csWd(ls,(+c.off||0)+s*pace),Math.max(1,+c.dur||1))})));if(!am.length)out.warn.push(`${p.name}: sin sectores de estructura.`)}
    if(cfg.grp.S){csAmbs(p.id,'S').forEach(a=>SS.forEach(c=>T.push({c,a,days:days(csWd(ls,offVL+1+(+c.off||0)),Math.max(1,+c.dur||1))})))}}
  if(cfg.grp.A&&A.length)for(let k=0;k<L.length;k++){const kk=k+albK;if(kk<a0||kk>a1)continue;const pk=L[kk],ls=LS[pk.id];const nE=Math.max(1,csAmbs(pk.id,'E').length);
    const base=wshift(csWd(ls,offVL+(nE-1)*pace),1);csAmbs(L[k].id,'A').forEach((a,s)=>A.forEach(c=>T.push({c,a,days:days(csWd(base,(+c.off||0)+s*albPace),Math.max(1,+c.dur||1))})))}
  /* contra lo que ya existe en cada sector */
  const byAmb=new Map();for(const x of S.act.values()){if(x._del)continue;if(!byAmb.has(x.ambId))byAmb.set(x.ambId,[]);byAmb.get(x.ambId).push(x)}
  for(const t of T){const fut=t.days.filter(x=>x>today);out.past+=t.days.length-fut.length;
    const ex=(byAmb.get(t.a.id)||[]).find(x=>{const c=csCatOf(x);return c?c.id===t.c.id:mnk(x.name)===mnk(t.c.name)});
    const mt=t.a.met&&t.a.met[t.c.id]!=null?+t.a.met[t.c.id]:(t.c.mets!=null&&t.c.mets!==''?+t.c.mets:null);
    if(fut.length){if(!out.first||fut[0]<out.first)out.first=fut[0];const lt=fut[fut.length-1];if(!out.last||lt>out.last)out.last=lt}
    if(ex){const keep=(ex.days||[]).filter(x=>x<=today);const nd=[...new Set([...keep,...fut])].sort();if(canon(nd)===canon(ex.days||[])){out.same++;continue}
      const nx={...ex,days:nd};if(hasM(ex)){const q={};keep.forEach(x=>{if(ex.qty&&ex.qty[x]!=null)q[x]=ex.qty[x]});const used=Object.values(q).reduce((s,v)=>s+(+v||0),0);const rest=Math.max(0,ex.metrado-used);fut.forEach(x=>q[x]=Math.round(rest/fut.length*100)/100);nx.qty=q}
      delete nx.id;out.ops.push(op('acts',ex.id,nx));out.upd++}
    else{if(!fut.length)continue;const nx={ambId:t.a.id,sc:t.c.sc||'',name:t.c.name,und:t.c.und||'',days:fut,order:(+t.c.tr||0)*10};
      if(mt>0){nx.metrado=mt;nx.qa=true;const q={};fut.forEach(x=>q[x]=Math.round(mt/fut.length*100)/100);nx.qty=q}
      out.ops.push(op('acts',uid('a'),nx));out.add++}}
  return out}
function csGenOpen(){if(!csEd()){toast('Para usar el generador entra a ✎ Programar.');return}if(!csHasData()){toast('Primero crea los niveles (Configuración › Casco).');return}
  const L=pisos();const cur=L.find(p=>csAmbs(p.id,'E').some(a=>[...S.act.values()].some(x=>x.ambId===a.id&&(x.days||[]).some(d=>d>todayIso()))))||L[0];
  const lv=sel=>L.map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.tc||p.name)} · ${esc(p.name)}</option>`).join('');
  const seq=g=>csCats(g).map(c=>`<li><b>${esc(c.name)}</b> <span class="mu">desfase ${c.off||0} · ${c.dur||1} día${(c.dur||1)>1?'s':''}${c.vac?' · vaciado':''}${c.ent?' · entrega':''}</span></li>`).join('')||'<li class="mu">Sin partidas</li>';
  const m=document.createElement('div');m.className='lqm';m.id='csgm';m.innerHTML=`<div class="lqc csgen" role="dialog" aria-modal="true" aria-labelledby="csgt"><h3 id="csgt">Generador del tren</h3>
    <p class="note">Arma la programación por sectores con la secuencia del catálogo. Solo programa desde mañana: lo de hoy, lo pasado y la semana congelada no cambian. Puedes deshacerlo con Deshacer.</p>
    <div class="csgf"><label>Desde<select id="csg_from">${lv(cur.id)}</select></label><label>Hasta<select id="csg_to">${lv(L[L.length-1].id)}</select></label>
    <label>Inicio del primer techo<input type="date" id="csg_start" min="${csTomorrow()}" value="${csTomorrow()}"></label>
    <label>Ritmo de estructura<select id="csg_pace"><option value="1">1 sector por día</option><option value="2">1 sector cada 2 días</option></select></label>
    <label>Techo siguiente: días tras vaciar la losa del S1<input type="number" id="csg_gap" min="0" max="10" value="1"></label>
    <label>Albañilería del piso N tras vaciar el techo<select id="csg_alb"><option value="1">N+1</option><option value="2" selected>N+2</option><option value="3">N+3</option></select></label></div>
    <div class="csgg">${CSG_ORD.map(g=>`<label class="chk"><input type="checkbox" id="csg_g${g}" checked> ${CSG[g]}</label>`).join('')}</div>
    <details><summary>Secuencia (se edita en Configuración › Casco)</summary><div class="csgs">${CSG_ORD.map(g=>`<div><b>${CSG[g]}</b><ol>${seq(g)}</ol></div>`).join('')}</div></details>
    <div class="callout" id="csg_prev" aria-live="polite"></div>
    <div class="csrow"><span style="flex:1"></span><button class="ib" data-csg="x">Cancelar</button><button class="ib pri" data-csg="ok">Generar</button></div></div>`;
  document.body.appendChild(m);
  const cfg=()=>({from:$('#csg_from').value,to:$('#csg_to').value,start:$('#csg_start').value||csTomorrow(),pace:+$('#csg_pace').value,gap:+$('#csg_gap').value,albK:+$('#csg_alb').value,grp:{E:$('#csg_gE').checked,S:$('#csg_gS').checked,A:$('#csg_gA').checked}});
  const prev=()=>{const c=cfg();if(c.start<csTomorrow()){$('#csg_prev').textContent='El inicio debe ser desde mañana.';return null}const pl=csGenPlan(c);
    $('#csg_prev').innerHTML=pl.warn.length?esc(pl.warn.join(' ')):`<b>${pl.add}</b> actividad${pl.add===1?'':'es'} nueva${pl.add===1?'':'s'} · <b>${pl.upd}</b> con días cambiados · ${pl.same} sin cambios${pl.first?` · del ${fmtD(pl.first)} al ${fmtD(pl.last)}`:''}${pl.past?` · ${pl.past} día(s) que caían en el pasado no se programan`:''}`;return pl};
  prev();m.addEventListener('change',prev);m.addEventListener('input',e=>{if(e.target.type==='number')prev()});
  const close=()=>{m.remove()};m.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  m.addEventListener('click',e=>{if(e.target===m){close();return}const b=e.target.closest('[data-csg]');if(!b)return;if(b.dataset.csg==='x'){close();return}
    const pl=prev();if(!pl)return;if(!pl.ops.length){toast(pl.warn[0]||'No hay nada que cambiar.');return}close();
    if(pl.ops.length>450)csBatchActs(pl.ops).then(()=>toast(`Tren generado: ${pl.add} nuevas, ${pl.upd} cambiadas (sin Deshacer por ser más de 450 cambios)`)).catch(er=>toast('No se pudo: '+(er&&er.code||er)));
    else{apply(pl.ops,`Generador del tren (${pl.add} nuevas, ${pl.upd} cambiadas)`);toast(`Tren generado: ${pl.add} nuevas, ${pl.upd} cambiadas`,'Deshacer',undo)}});
  setTimeout(()=>{const f=$('#csg_from');if(f)f.focus()},30)}

/* ---------- vista Tren del Lookahead ---------- */
function csTrenRender(el,days){if(!el)return;if(!MX.ld.cat&&typeof ensureMcat==='function')ensureMcat();
  if(!csHasData()){el.innerHTML=`<div class="empty cstrempty"><b>Casco todavía no tiene niveles.</b><br>${isAdmin?'Ve a Configuración › Casco para cargar la obra de ejemplo o crear los niveles.':'El administrador debe crearlos en Configuración › Casco.'}</div>`;return}
  const today=todayIso(),dset=new Set(days.map(x=>x.d)),vset=new Set(visPisos().map(p=>p.id));
  const resN={};for(const r of S.res.values())if(r.status!=='lib'&&r.actId)resN[r.actId]=(resN[r.actId]||0)+1;
  /* filas: el catálogo por grupo y, aparte, nombres que no están en él */
  const rows=new Map();const key=(g,id)=>g+'|'+id;
  for(const g of CSG_ORD)for(const c of csCats(g))rows.set(key(g,c.id),{g,c,name:c.name,sc:c.sc,L:[]});
  for(const x of S.act.values()){if(x._del)continue;const a=S.amb.get(x.ambId);if(!a)continue;const s=csSecOf(a);if(!s||!vset.has(s.pisoId))continue;if(!scOk(x.sc))continue;
    if(!(x.days||[]).some(d=>dset.has(d)))continue;const g=s.grp||'X';const c=csCatOf(x);const k=c&&c.grp===g?key(g,c.id):key(g,'n:'+mnk(x.name));
    if(!rows.has(k))rows.set(k,{g,c:null,name:x.name||'(sin nombre)',sc:x.sc,L:[]});rows.get(k).L.push(x)}
  const head=()=>{let h='<thead><tr><th class="lab" rowspan="2">Partida · ejecutor</th>';const W=[];days.forEach(x=>{const w=W[W.length-1];if(w&&w.w===x.w)w.n++;else W.push({w:x.w,n:1,d:x.d})});
    W.forEach(w=>h+=`<th class="cswk" colspan="${w.n}">Semana ${w.w} · ${fmtD(w.d)}</th>`);h+='</tr><tr>';
    days.forEach(x=>{const nw=!isWork(x.d);h+=`<th class="d${nw?' nw':''}${x.d===today?' td':''}" title="${nw?esc(nwReason(x.d)):''}"><span>${DL[x.i]}</span><b>${x.d.slice(8)}</b></th>`});return h+'</tr></thead>'};
  const exLab=sc=>{const c=conOf(sc);return sc?`<span class="cstag${c.casa?' casa':''}">${c.casa?'Casa':'SC'}</span>${esc(c.name)}`:'<span class="mu">Sin ejecutor</span>'};
  const chip=(x,d)=>{const a=S.amb.get(x.ambId),s=csSecOf(a),p=S.pis.get(s&&s.pisoId),g=(s&&s.grp)||'';const c=csCatOf(x);
    const rc=d<=today?recOf(d,x.id):null;const st=rc?rc.status:'';const lst=c&&c.vac&&typeof libState==='function'?libState(x):'';
    const lm=lst==='lib'||lst==='libm'?'✓':lst==='pro'?'◷':lst==='obs'?'!':'';
    const cls=c&&c.ent?'ent':'k'+(csAmbIdx(a)%4);const t=`${c&&c.ent?'◆ ':''}${esc(csPisoTag(p,g))}·${esc(a?a.code:'?')}`;
    return `<button type="button" class="csk ${cls}${c&&c.vac?' vac':''}${st==='ok'?' ok':st==='no'?' no':st==='partial'?' pa':''}" data-csa="${esc(x.id)}" data-d="${d}" title="${esc((x.name||'')+' · '+(p?p.name:'')+' · '+(a?a.name:'')+(lst&&typeof LST!=='undefined'&&LST[lst]?' · Liberación: '+LST[lst].t:'')+(st?' · '+(st==='ok'?'Cumplido':st==='no'?'No cumplido':'Parcial'):''))}">${t}${lm?`<i class="csl">${lm}</i>`:''}${resN[x.id]?'<i class="csr" aria-label="Restricción abierta">R</i>':''}</button>`};
  let b='';
  for(const g of CSG_ORD.concat(['X'])){const R=[...rows.values()].filter(r=>r.g===g&&(r.L.length||(r.c&&!U.sc)));if(!R.length)continue;
    b+=`<tr class="csgr"><td class="lab">${esc(CSG[g]||'Sin grupo')}<small>${esc(CSG_SUB[g]||'Actividades en sectores sin grupo de casco')}</small></td><td colspan="${days.length}"></td></tr>`;
    for(const r of R){b+=`<tr><td class="lab"><span class="pn" title="${esc(r.name)}">${esc(r.name)}</span><span class="ex">${exLab(r.c?r.c.sc:r.sc)}</span></td>`;
      for(const x of days){const L=r.L.filter(y=>(y.days||[]).includes(x.d)).sort((p,q)=>{const pa=S.amb.get(p.ambId),qa=S.amb.get(q.ambId);return((S.pis.get((csSecOf(pa)||{}).pisoId)||{}).order||0)-((S.pis.get((csSecOf(qa)||{}).pisoId)||{}).order||0)||csAmbIdx(pa)-csAmbIdx(qa)});
        b+=`<td class="d${isWork(x.d)?'':' nw'}${x.d===today?' td':''}">${L.length?`<div class="csc">${L.map(y=>chip(y,x.d)).join('')}</div>`:''}</td>`}
      b+='</tr>'}}
  /* personal necesario por día (metrado ÷ rendimiento), casa y subcontratistas */
  let pc='',ps='';for(const x of days){let a=0,s=0;for(const r of rows.values())for(const y of r.L){if(!(y.days||[]).includes(x.d))continue;const n=typeof persOf==='function'?persOf(y,x.d,persRend(y)):0;if(conOf(y.sc).casa)a+=n;else s+=n}
    const c=`d${isWork(x.d)?'':' nw'}${x.d===today?' td':''}`;pc+=`<td class="${c}">${a||''}</td>`;ps+=`<td class="${c}">${s||''}</td>`}
  b+=`<tr class="cssum"><td class="lab">Personal necesario · casa</td>${pc}</tr><tr class="cssum"><td class="lab">Personal necesario · SC</td>${ps}</tr>`;
  const tools=csEd()?`<button class="ib pri" data-cs="gen">⚙ Generador del tren</button>`:'';
  const h=`<div class="csbar">${tools}<span class="csleg"><i class="csk k0">S1</i><i class="csk k1">S2</i><i class="csk k2">S3</i><i class="csk k3">S4</i><span>Borde = vaciado (✓ liberado · ◷ programado)</span><span><i class="csr">R</i> restricción</span><span>Tachado = no cumplido</span></span></div>
    <div class="cstw"><table class="cstr">${head()}<tbody>${b}</tbody></table></div><p class="note cstn">Toca una celda para ver su ficha${csEd()?' y correrla':''}. Vista › Grilla muestra lo mismo por nivel y sector, como el lookahead de arquitectura.</p>`;
  if(el._h!==h){const sc=el.querySelector('.cstw');const sl=sc?sc.scrollLeft:0;el.innerHTML=h;el._h=h;const n=el.querySelector('.cstw');if(n&&sl)n.scrollLeft=sl;else if(n){const td=n.querySelector('th.td');if(td)n.scrollLeft=Math.max(0,td.offsetLeft-260)}}}
function csChipPop(btn){const x=S.act.get(btn.dataset.csa);if(!x)return;const a=S.amb.get(x.ambId),s=csSecOf(a),p=S.pis.get(s&&s.pisoId),g=(s&&s.grp)||'';const c=csCatOf(x),con=conOf(x.sc);
  const ds=x.days||[];const rd=persRend(x);const per=hasM(x)&&rd?Math.ceil(x.metrado/rd/Math.max(1,ds.length)):null;const lst=c&&c.vac&&typeof libState==='function'?libState(x):'';
  const resL=[...S.res.values()].filter(r=>r.actId===x.id&&r.status!=='lib');const ed=csEd();
  const lvl=g==='A'?`${p?p.name:''} · piso (${esc(p&&p.pc||'')})`:`${p?p.name:''} · techo (${esc(p&&p.tc||'')})`;
  const html=`<div class="cspop"><b>${esc(x.name)}</b><dl><dt>Nivel</dt><dd>${lvl}</dd><dt>Sector</dt><dd>${esc(a?a.name:'')}</dd><dt>Días</dt><dd>${ds.map(fmtD).join(', ')||'—'}</dd><dt>Ejecutor</dt><dd>${esc(con.name)}${con.casa?' (casa)':''}</dd>
    ${hasM(x)?`<dt>Metrado</dt><dd class="mono">${x.metrado} ${esc(x.und||'')}</dd>`:''}${rd?`<dt>Rend.</dt><dd class="mono">${rd} ${esc(x.und||'')}/persona·día</dd>`:''}${per?`<dt>Personal</dt><dd class="mono">${per} por día</dd>`:''}
    ${c&&c.vac?`<dt>Liberación</dt><dd>${lst&&typeof LST!=='undefined'&&LST[lst]?esc(LST[lst].t):'Sin solicitar'}</dd>`:''}</dl>
    ${resL.length?`<div class="cspr">⚠ ${resL.map(r=>esc(r.desc||r.text||r.type||'Restricción')).join(' · ')}</div>`:''}
    ${c&&c.ent?`<p class="note">Al publicar las entregas, este sector aparece como hito de inicio en Last Planner.</p>`:''}
    <div class="csrow">${ed?'<button class="ib" data-do="l">‹ 1 día</button><button class="ib" data-do="r">1 día ›</button>':''}<button class="ib" data-do="grid">Ver en la grilla</button></div></div>`;
  openPop(btn,html,{l:()=>csShift(x.id,-1),r:()=>csShift(x.id,1),grid:()=>{U.lkV='grid';U.piso=s?s.pisoId:'';U.sector=s?s.id:'';saveUI();requestRender()}})}
function csShift(id,n){const x=S.act.get(id);if(!x||!csEd())return;const t=todayIso();const ds=x.days||[];if(!ds.length)return;
  const nd=ds.map(d=>wshift(d,n));if(!isAdmin&&(ds.some(d=>d<=t)||nd.some(d=>d<=t))){toast('Hoy y los días pasados solo los cambia el administrador.');return}
  const nx={...x,days:[...new Set(nd)].sort()};if(x.qty){const q={};ds.forEach((d,i)=>{if(x.qty[d]!=null)q[nd[i]]=x.qty[d]});nx.qty=q}delete nx.id;
  apply([op('acts',id,nx)],`Correr «${x.name}» ${n>0?'un día después':'un día antes'}`)}

/* ---------- entrega por sector a Arquitectura (hitos de Last Planner) ---------- */
const csEntActs=()=>[...S.act.values()].filter(x=>!x._del&&(x.days||[]).length&&(csCatOf(x)||{}).ent);
const csEntCount=()=>csEntActs().length;
async function csEntPublish(){if(!csEd())return;const L=csEntActs();if(!L.length){toast('No hay entregas programadas (partida con «Entrega» en el catálogo).');return}
  let ok=0,skip=0,chg=0;const t=NOW();
  for(const x of L){const a=S.amb.get(x.ambId),s=csSecOf(a),p=S.pis.get(s&&s.pisoId);if(!p||!p.lp){skip++;continue}
    const d=x.days[x.days.length-1];const ref=fcolLp('hitos').doc('cs_'+x.id);let cur=null;try{const g=await ref.get();cur=g.exists?g.data():null}catch(e){}
    const rc=recOf(d,x.id);const done=!!(rc&&rc.status==='ok');
    const doc={n:`Entrega de Casco · ${p.pc||p.name} ${a?a.code:''}`,tipo:'ini',d,d0:cur&&cur.d0||d,piso:p.lp,st:done?'done':(cur&&cur.st)||'open',cs:true,csAct:x.id,by:me.email,bn:me.name||me.email,t};
    if(done)doc.real=d;const h=Array.isArray(cur&&cur.h)?cur.h.slice():[];if(cur&&cur.d&&cur.d!==d){h.push({from:cur.d,to:d,by:me.email,n:me.name||me.email,t});chg++}doc.h=h;
    try{await ref.set(doc,{merge:true});ok++}catch(e){toast('No se pudo publicar: '+(e&&e.code||e));return}}
  toast(`${ok} entrega(s) publicada(s) en Last Planner${chg?` (${chg} con fecha nueva)`:''}${skip?` · ${skip} sin piso vinculado (Configuración › Casco)`:''}`)}

/* ---------- asistente de sectorización (versiones por rango de niveles: cs_ksec) ---------- */
const KSEC=new Map();let ksecSub=null;
function csKsecEnsure(){if(ksecSub||!db||!CS())return;ksecSub=fcol('ksec').onSnapshot(sn=>{KSEC.clear();sn.docs.forEach(d=>{const v={...d.data(),id:d.id};if(!v.arch)KSEC.set(d.id,v)});if(U.tab==='cfg')requestRender()},()=>{});unsubs.push(()=>{if(ksecSub)ksecSub();ksecSub=null;KSEC.clear()})}
/** carga de cada sector en persona-días (metrado ÷ rendimiento) y su desviación respecto del promedio */
function csBal(v){const cats=csCats(v.grp).filter(c=>c.rend>0);const k=v.k||0;const hd=Array(k).fill(0);
  cats.forEach(c=>{const m=(v.met||{})[c.id]||[];for(let i=0;i<k;i++)hd[i]+=(+m[i]||0)/c.rend});
  const avg=hd.reduce((s,x)=>s+x,0)/(k||1);const dev=hd.map(x=>avg?(x-avg)/avg:0);const mx=Math.max(0,...dev.map(Math.abs));return{hd,avg,dev,mx}}
const csBalCls=x=>Math.abs(x)<=.1?'ok':Math.abs(x)<=.2?'warn':'bad';
function csSecCard(){const ed=csEd(),L=pisos();const V=[...KSEC.values()].sort((a,b)=>CSG_ORD.indexOf(a.grp)-CSG_ORD.indexOf(b.grp)||((S.pis.get(a.from)||{}).order||0)-((S.pis.get(b.from)||{}).order||0));
  const nm=id=>{const p=S.pis.get(id);return p?p.name:'—'};
  return `<div class="card"><h2>Asistente de sectorización <span class="sub">Versiones por rango de niveles: cambiar desde un nivel no toca lo ya programado ni lo congelado</span></h2><div class="tscroll"><table class="t"><thead><tr><th>Versión</th><th>Grupo</th><th>Niveles</th><th>Sectores</th><th title="Mayor desviación de la carga (persona-días) de un sector respecto del promedio">Balance</th><th></th></tr></thead><tbody>
    ${V.map(v=>{const b=csBal(v);return`<tr><td><b>${esc(v.n||v.id)}</b>${v.note?`<div class="mu">${esc(v.note)}</div>`:''}</td><td>${esc(CSG[v.grp]||v.grp)}</td><td>${esc(nm(v.from))} a ${esc(nm(v.to))}</td><td>${v.k}</td><td><span class="csbal ${csBalCls(b.mx)}">±${Math.round(b.mx*100)}%</span></td>
      <td class="csrow"><button class="ib" data-cs="secv" data-id="${esc(v.id)}">${ed?'Abrir':'Ver'}</button></td></tr>`}).join('')||`<tr><td colspan="6" class="mu" style="padding:12px">Sin versiones. ${ed?'Crea la primera: define cuántos sectores y sus metrados, revisa el balance y aplícala a un rango de niveles.':''}</td></tr>`}
    </tbody></table></div>${ed?`<div class="pad csrow"><button class="ib" data-cs="secnew">+ Nueva versión</button>${isAdmin?'<button class="ib" data-cs="lvnew">+ Niveles</button>':''}<span class="note">Luego dibuja cada sector sobre la lámina del nivel en Sectorización.</span></div>`:''}</div>`}
function csSecOpen(id){const L=pisos();const v0=id?KSEC.get(id):null;const v=clone(v0)||{n:'Versión '+(KSEC.size+1),grp:'E',from:(L[0]||{}).id||'',to:(L[L.length-1]||{}).id||'',k:4,names:['S1','S2','S3','S4'],met:{}};const ed=csEd();
  const m=document.createElement('div');m.className='lqm';m.id='cssm';document.body.appendChild(m);
  const names=()=>Array.from({length:v.k},(_,i)=>(v.names&&v.names[i])||((v.grp==='A'?'A':'S')+(i+1)));
  const draw=()=>{const cats=csCats(v.grp).filter(c=>c.und);const b=csBal({...v,names:names()});const dis=ed?'':' disabled';
    const lv=sel=>L.map(p=>`<option value="${p.id}"${p.id===sel?' selected':''}>${esc(p.name)}</option>`).join('');
    m.innerHTML=`<div class="lqc cssec" role="dialog" aria-modal="true" aria-labelledby="csst"><h3 id="csst">Asistente de sectorización</h3>
      <div class="csgf"><label>Nombre<input id="css_n" value="${esc(v.n||'')}"${dis}></label><label>Grupo<select id="css_g"${dis}>${['E','A'].map(g=>`<option value="${g}"${v.grp===g?' selected':''}>${CSG[g]}</option>`).join('')}</select></label>
      <label>Desde<select id="css_from"${dis}>${lv(v.from)}</select></label><label>Hasta<select id="css_to"${dis}>${lv(v.to)}</select></label>
      <label>Sectores<input id="css_k" type="number" min="1" max="12" value="${v.k}"${dis}></label><label>Nota<input id="css_note" value="${esc(v.note||'')}" placeholder="Ej.: juntas al tercio de la luz"${dis}></label></div>
      <div class="tscroll"><table class="t csmet"><thead><tr><th>Partida</th><th>Und.</th>${names().map((n,i)=>`<th><input class="ci csn" data-cssn="${i}" value="${esc(n)}" aria-label="Nombre del sector ${i+1}"${dis}></th>`).join('')}<th title="Desviación máxima de esta partida">±</th></tr></thead><tbody>
        ${cats.map(c=>{const r=(v.met||{})[c.id]||[];const vals=names().map((_,i)=>+r[i]||0);const av=vals.reduce((s,x)=>s+x,0)/(vals.length||1);const mx=Math.max(0,...vals.map(x=>av?Math.abs(x-av)/av:0));
          return`<tr><td>${esc(c.name)}</td><td class="mu">${esc(c.und)}</td>${names().map((_,i)=>`<td><input class="ci csn" type="number" min="0" step="any" data-cssm="${esc(c.id)}:${i}" value="${r[i]??''}"${dis} aria-label="${esc(c.name)} en el sector ${i+1}"></td>`).join('')}<td><span class="csbal ${csBalCls(mx)}">${Math.round(mx*100)}%</span></td></tr>`}).join('')||`<tr><td colspan="${3+v.k}" class="mu">El catálogo no tiene partidas con unidad en este grupo.</td></tr>`}
        <tr class="cssum"><td><b>Carga</b></td><td class="mu">pers·día</td>${b.hd.map((x,i)=>`<td class="mono"><b>${Math.round(x*10)/10}</b> <span class="csbal ${csBalCls(b.dev[i])}">${b.dev[i]>=0?'+':''}${Math.round(b.dev[i]*100)}%</span></td>`).join('')}<td><span class="csbal ${csBalCls(b.mx)}">${Math.round(b.mx*100)}%</span></td></tr></tbody></table></div>
      <p class="note">La carga suma metrado ÷ rendimiento de cada partida: sectores balanceados (verde, ±10 %) permiten un tren parejo de un sector por día. Ámbar hasta ±20 %, rojo más.</p>
      <div class="csrow"><span style="flex:1"></span><button class="ib" data-css="x">Cerrar</button>${ed?'<button class="ib" data-css="save">Guardar</button><button class="ib pri" data-css="apply">Guardar y aplicar a los niveles</button>':''}</div></div>`};
  const read=()=>{if(!ed)return;v.n=$('#css_n').value.trim()||v.n;const g=$('#css_g').value;if(g!==v.grp){v.grp=g;v.names=null}v.from=$('#css_from').value;v.to=$('#css_to').value;v.k=Math.max(1,Math.min(12,+$('#css_k').value||1));v.note=$('#css_note').value.trim();
    const nn=names();m.querySelectorAll('[data-cssn]').forEach(i=>{nn[+i.dataset.cssn]=i.value.trim()||nn[+i.dataset.cssn]});v.names=nn.slice(0,v.k);
    const met={};m.querySelectorAll('[data-cssm]').forEach(i=>{const[c,k]=i.dataset.cssm.split(':');if(+k>=v.k)return;(met[c]=met[c]||[])[+k]=i.value===''?null:+i.value});v.met=met};
  /* redibujar después del evento (no dentro de un blur) y devolver el foco a la casilla en la que estaba */
  draw();let rd=false;m.addEventListener('change',()=>{read();if(rd)return;rd=true;setTimeout(()=>{rd=false;const ae=document.activeElement;const key=ae&&m.contains(ae)?(ae.dataset.cssm?'[data-cssm="'+ae.dataset.cssm+'"]':ae.dataset.cssn?'[data-cssn="'+ae.dataset.cssn+'"]':ae.id?'#'+ae.id:''):'';
    if(!m.isConnected)return;draw();if(key){const n=m.querySelector(key);if(n)n.focus()}},0)});
  const close=()=>m.remove();m.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  m.addEventListener('click',async e=>{if(e.target===m){close();return}const b=e.target.closest('[data-css]');if(!b)return;const k=b.dataset.css;if(k==='x'){close();return}read();
    const L2=pisos(),i0=L2.findIndex(p=>p.id===v.from),i1=L2.findIndex(p=>p.id===v.to);if(i0<0||i1<i0){toast('El rango de niveles no es válido.');return}
    const vid=id||uid('ks');const doc={n:v.n,grp:v.grp,from:v.from,to:v.to,k:v.k,names:v.names,met:v.met||{},note:v.note||'',by:me.email,t:NOW()};
    try{await fcol('ksec').doc(vid).set(doc)}catch(er){toast('No se pudo guardar: '+(er&&er.code||er));return}
    if(k==='save'){toast('Versión guardada');close();return}close();csSecApply({...doc,id:vid})})}
/** aplica una versión: en cada nivel del rango deja los sectores del grupo con estos nombres y metrados. Los sectores que sobran se
    archivan solo si no tienen actividades (si tienen, se avisan y quedan: el ingeniero mueve sus actividades primero). */
async function csSecApply(v){const L=pisos();const i0=L.findIndex(p=>p.id===v.from),i1=L.findIndex(p=>p.id===v.to);const ops=[];let keep=0,nw=0,mod=0;const t=NOW();
  const used=new Set([...S.act.values()].filter(x=>!x._del).map(x=>x.ambId));
  for(let i=i0;i<=i1;i++){const p=L[i];let sec=[...S.sec.values()].find(s=>s.pisoId===p.id&&s.grp===v.grp);
    if(!sec){const sid=p.id+'-'+v.grp.toLowerCase();sec={id:sid,pisoId:p.id,code:v.grp==='A'?'A':'E',name:v.grp==='A'?'Albañilería':'Estructura',grp:v.grp,order:v.grp==='A'?3:1};ops.push(op('sectors',sid,{pisoId:sec.pisoId,code:sec.code,name:sec.name,grp:sec.grp,order:sec.order}))}
    const cur=[...S.amb.values()].filter(a=>a.sectorId===sec.id).sort(byOrder);
    for(let s=0;s<v.k;s++){const met={};for(const[c,arr]of Object.entries(v.met||{}))if(arr&&arr[s]!=null)met[c]=+arr[s];
      const nmS=v.names[s]||((v.grp==='A'?'A':'S')+(s+1));const nx={sectorId:sec.id,code:nmS,name:'Sector '+nmS.replace(/^S/,''),order:s+1,met,ksec:v.id};
      if(cur[s]){const o={...cur[s]};delete o.id;const n2={...o,...nx};if(canon(n2)!==canon(o)){ops.push(op('ambientes',cur[s].id,n2));mod++}}else{ops.push(op('ambientes',uid('am'),nx));nw++}}
    for(const a of cur.slice(v.k)){if(used.has(a.id)){keep++;continue}const o={...a};delete o.id;ops.push(op('ambientes',a.id,{...o,arch:{t,by:me.email,n:me.name||me.email}}))}}
  if(!ops.length){toast('Los niveles ya tenían esta sectorización.');return}
  apply(ops,`Sectorización «${v.n}» aplicada`);toast(`Sectorización aplicada: ${nw} sector(es) nuevos, ${mod} actualizados${keep?` · ${keep} sobrante(s) con actividades quedan: mueve sus actividades y vuelve a aplicar`:''}`,'Deshacer',undo)}
/** agrega niveles (sótano o pisos) al final: nombre, techo y piso */
async function csLevelsAdd(){if(!isAdmin)return;const n=await uiAsk({title:'Agregar niveles',input:{label:'¿Cuántos niveles agregar al final?',placeholder:'Ej.: 8',required:true},ok:'Agregar'});const k=Math.min(60,Math.max(0,parseInt(n,10)||0));if(!k)return;
  const L=pisos();let base=L.length;const ops=[];for(let i=0;i<k;i++){const num=base+i+(L.some(p=>/s[oó]t/i.test(p.name))?0:1);const id=uid('n');
    ops.push(op('pisos',id,{name:'Nivel '+num,code:'N'+num,tc:'T'+num,pc:'P'+num,order:base+i}));
    ops.push(op('sectors',id+'-f',{pisoId:id,code:'F',name:'Frentes sueltos',grp:'S',order:2}));ops.push(op('ambientes',id+'-esc',{sectorId:id+'-f',code:'ESC',name:'Escalera',order:1}))}
  apply(ops,`${k} nivel(es) agregados`);toast(`${k} nivel(es) agregados: aplícales una versión de sectorización`)}

/* ---------- eventos (delegados: funcionan en Configuración y en el Lookahead) ---------- */
document.addEventListener('click',e=>{if(!CS())return;const t=e.target;
  const ch=t.closest&&t.closest('[data-csa]');if(ch&&ch.closest('#trw')){e.stopPropagation();csChipPop(ch);return}
  const b=t.closest&&t.closest('[data-cs]');if(!b||b.tagName==='INPUT'||b.tagName==='SELECT')return;const k=b.dataset.cs;
  if(k==='gen')csGenOpen();else if(k==='init')csInit();else if(k==='demo')csDemo();else if(k==='catadd')csCatAdd();else if(k==='cattip')csCatTip();else if(k==='catdel')csCatDel(b.dataset.id);
  else if(k==='entpub')csEntPublish();else if(k==='secnew')csSecOpen('');else if(k==='secv')csSecOpen(b.dataset.id);else if(k==='lvnew')csLevelsAdd()});
document.addEventListener('change',e=>{if(!CS())return;const t=e.target;
  const f=t.dataset&&t.dataset.csf;if(f){const r=t.closest('[data-csc]');if(r&&csEd())csCatSet(r.dataset.csc,f,t.type==='checkbox'?t.checked:t.value);return}
  const k=t.dataset&&t.dataset.cs;if(!k||!csEd())return;
  if(k==='casa'){const c=S.con.get(t.dataset.id);if(c){const o={...c};delete o.id;apply([op('contractors',c.id,{...o,casa:t.checked})],`${c.name}: ${t.checked?'cuadrilla de casa':'subcontratista'}`)}}
  else if(k==='lp'){const p=S.pis.get(t.dataset.id);if(p){const o={...p};delete o.id;apply([op('pisos',p.id,{...o,lp:t.value||null})],`${p.name}: piso de Last Planner`)}}});
