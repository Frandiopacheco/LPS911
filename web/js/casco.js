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
function csCfgCard(){if(typeof ensureMcat==='function')ensureMcat();csKsecEnsure();if(typeof plSub==='function')plSub();if(typeof loadPlanoMod==='function'&&!(window.__plano&&window.__plano.LAM))loadPlanoMod().then(()=>{window.__plano.ensureLam&&window.__plano.ensureLam();setTimeout(()=>{if(U.tab==='cfg')requestRender()},600)}).catch(()=>{});
  const ed=csEd(),dis=ed?'':' disabled',P_=pisos();
  const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const empty=!csHasData();
  let h=`<div class="card cscard"><h2>Módulo Casco <span class="sub">Estructura, albañilería, tabiques y tarrajeo por sectores; los acabados por ambiente siguen en Last Planner</span></h2><div class="pad">`;
  if(empty)h+=`<div class="callout">Esta obra todavía no tiene niveles en Casco.${isAdmin?' Puedes empezar con la obra de ejemplo (solo en la copia de prueba) o crear los niveles con el asistente de sectorización.':' El administrador debe crearlos.'}</div>`;
  if(isAdmin){h+=`<div class="csrow">${!S.meta.get('project')?`<button class="ib pri" data-cs="init">Crear Casco con la configuración de Last Planner</button>`:''}${window.LPS_ENV==='pruebas'&&empty?`<button class="ib${S.meta.get('project')?' pri':''}" data-cs="demo">Cargar obra de ejemplo</button>`:''}${window.LPS_ENV==='pruebas'&&S.meta.get('project')&&(!empty||S.con.size||KSEC.size)?`<span style="flex:1"></span><button class="ib warn" data-cs="vaciar" title="Solo en la copia de prueba: borra definitivamente niveles, sectores, actividades y lo registrado en ellos para empezar desde cero">Vaciar Casco…</button>`:''}</div>`}
  h+=`<p class="note">Cada nivel tiene tres grupos: <b>Estructura</b> (planta de encofrado del techo), <b>Frentes sueltos</b> (escalera) y <b>Albañilería</b> (planta de arquitectura del piso). Lo que divide o atraviesa ambientes va aquí por sector; el acabado de cada cara va por ambiente en Last Planner.</p></div></div>`;
  /* catálogo (27-10-2026, con el dueño): solo lo que es de la partida. Incidencia = metrado por m² de planta (kg/m², m²/m², m³/m²);
     productividad en und/persona·día y en HH/und (jornada de Configuración › Casco). Desde el 27-10-2026 la incidencia se edita en
     el asistente (Sectorización › Sectores) y el tren se arma en el Lookahead › Tren (casco-tren.js). */
  const cats=csCats(),jor=csJor();
  const exo=sel=>`<option value="">—</option>`+cons.map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}${c.casa?' (casa)':''}</option>`).join('');
  h+=`<div class="card"><h2>Catálogo de casco <span class="sub">Qué es cada partida, quién la hace y cuánto rinde una persona. Las incidencias por m² se editan en Sectorización › Sectores; el tren se arma en el Lookahead › Tren</span></h2>
    <div class="pad csrow"><label class="cssml">Jornada <input class="ci csn" type="number" min="1" max="14" step="0.5" data-cs="jor" value="${jor}"${isAdmin?'':' disabled'} aria-label="Horas por día"> h por día</label><span class="note">HH/und = jornada ÷ rendimiento. Escribe el que conozcas: el otro se calcula.</span></div>
    <div class="tscroll"><table class="t cscat"><thead><tr><th>Partida</th><th>Grupo</th><th>Ejecutor</th><th>Und.</th><th title="Vaciado de concreto: pide liberación de Calidad">Vaciado</th><th title="Hito de entrega del sector a Arquitectura">Entrega</th><th title="Lo que hace una persona en un día">Rendimiento <span class="mu">und/persona·día</span></th><th title="Horas-hombre para una unidad (jornada ÷ rendimiento)">HH/und</th>${ed?'<th></th>':''}</tr></thead><tbody>`;
  if(!cats.length)h+=`<tr><td colspan="9" class="mu" style="padding:12px">Sin partidas todavía.</td></tr>`;
  let gPrev='';
  for(const c of cats){if(c.grp!==gPrev){gPrev=c.grp;h+=`<tr class="csgrow"><td colspan="${ed?9:8}">${esc(CSG[c.grp]||c.grp)}</td></tr>`}
    h+=`<tr data-csc="${esc(c.id)}"><td><input class="ci" data-csf="name" value="${esc(c.name)}"${dis} aria-label="Nombre"></td>
    <td><select data-csf="grp"${dis} aria-label="Grupo">${CSG_ORD.map(g=>`<option value="${g}"${c.grp===g?' selected':''}>${CSG[g]}</option>`).join('')}</select></td>
    <td><select data-csf="sc"${dis} aria-label="Ejecutor">${exo(c.sc)}</select></td>
    <td><input class="ci csn" data-csf="und" value="${esc(c.und||'')}"${dis} aria-label="Unidad"></td>
    <td><input type="checkbox" data-csf="vac"${c.vac?' checked':''}${dis} aria-label="Vaciado"></td><td><input type="checkbox" data-csf="ent"${c.ent?' checked':''}${dis} aria-label="Entrega a Arquitectura"></td>
    <td><input class="ci csn" type="number" min="0" step="any" data-csf="rend" value="${c.rend??''}"${dis} aria-label="Rendimiento de ${esc(c.name)}"></td>
    <td><input class="ci csn" type="number" min="0" step="any" data-csf="hh" value="${c.rend>0?Math.round(jor/c.rend*10000)/10000:''}"${dis} aria-label="HH por unidad de ${esc(c.name)}"></td>
    ${ed?`<td><button class="ab" data-cs="catdel" data-id="${esc(c.id)}" title="Quitar del catálogo" aria-label="Quitar ${esc(c.name)}">&times;</button></td>`:''}</tr>`}
  h+=`</tbody></table></div>${ed?`<div class="pad csrow"><button class="ib" data-cs="catadd">+ Partida</button>${!cats.length?'<button class="ib pri" data-cs="cattip">Cargar catálogo típico</button>':''}${cats.length&&csSeqDiff().length?`<button class="ib" data-cs="seqtip" title="Pasa las partidas de estructura a la secuencia típica de horizontales (fondo y 1.er costado de viga → acero de vigas → 2.º costado y fondo de losa → acero de losa e instalaciones → vaciado)">Actualizar a la secuencia típica</button>`:''}<button class="ib" data-cs="gotren">Armar el tren en el Lookahead</button><span class="note">Los cambios se guardan al salir de cada casilla.</span></div>`:''}</div>`;
  /* ejecutores */
  h+=`<div class="card"><h2>Ejecutores <span class="sub">Cuadrillas de casa (con su capataz) o subcontratistas: el PPC se mide por ejecutor</span></h2><div class="pad"><div class="csexl">${cons.map(c=>`<label class="chk"><input type="checkbox" data-cs="casa" data-id="${c.id}"${c.casa?' checked':''}${dis}> <i class="csdot" style="--c:${esc(c.color)}"></i>${esc(c.name)} <span class="mu">${c.casa?'Casa':'Subcontratista'}</span></label>`).join('')||'<span class="mu">Agrégalos en Configuración › Subcontratistas.</span>'}</div>
    <p class="note">Marca las cuadrillas de casa. En Casco se programa en la reunión, sin propuestas: el capataz reporta inicio, detención y cierre desde su celular.</p></div></div>`;
  /* niveles y entrega */
  const LP=csLpPisos();
  h+=`<div class="card"><h2>Niveles y entrega a Arquitectura <span class="sub">Cuando un sector termina el tarrajeo, su entrega se publica como hito de inicio en el piso de Last Planner</span></h2><div class="tscroll"><table class="t cslv"><thead><tr><th>Nivel</th><th title="Código corto del selector de niveles">Código</th><th title="Así sale en las celdas de estructura del tren (planta de encofrado del techo)">Techo</th><th title="Así sale en las celdas de albañilería del tren (planta de arquitectura del piso)">Piso</th><th>Sectores</th><th title="Lámina base del nivel tomada del módulo Planos (planta de encofrado del techo)">Encofrado (techo)</th><th title="Segunda lámina base del nivel: planta de arquitectura del piso">Arquitectura (piso)</th><th>Piso en Last Planner</th>${ed?'<th></th>':''}</tr></thead><tbody>
    ${P_.map((p,i)=>{const nE=csAmbs(p.id,'E').length,nA=csAmbs(p.id,'A').length;const fi=(f,w,l)=>`<input class="ci" data-cslv="${f}" data-id="${p.id}" value="${esc(p[f]||'')}" style="width:${w}"${dis} aria-label="${l} de ${esc(p.name)}">`;
      return`<tr><td>${fi('name','140px','Nombre')}</td><td>${fi('code','64px','Código')}</td><td>${fi('tc','64px','Techo')}</td><td>${fi('pc','64px','Piso')}</td><td>${nE} de estructura${nA?` · ${nA} de albañilería`:''}</td>${csLvLamTd(p,'EST',ed)}${csLvLamTd(p,'ARQ',ed)}
      <td><select data-cs="lp" data-id="${p.id}"${dis} aria-label="Piso de Last Planner de ${esc(p.name)}"><option value="">Sin vincular</option>${LP.map(l=>`<option value="${l.id}"${p.lp===l.id?' selected':''}>${esc(l.name||l.code)}</option>`).join('')}</select></td>
      ${ed?`<td class="csrow cslva"><button class="ab" data-cs="lvmv" data-id="${p.id}" data-d="-1" title="Subir en la lista"${i?'':' disabled'} aria-label="Subir ${esc(p.name)}">▲</button><button class="ab" data-cs="lvmv" data-id="${p.id}" data-d="1" title="Bajar en la lista"${i<P_.length-1?'':' disabled'} aria-label="Bajar ${esc(p.name)}">▼</button><button class="ab" data-cs="lvadd" data-id="${p.id}" data-d="0" title="Agregar un nivel antes (debajo: p. ej. otro sótano)">+↑</button><button class="ab" data-cs="lvadd" data-id="${p.id}" data-d="1" title="Agregar un nivel después (encima: p. ej. azotea)">+↓</button><button class="ab" data-cs="lvdel" data-id="${p.id}" title="Eliminar (se archiva; con Deshacer)" aria-label="Eliminar ${esc(p.name)}">&times;</button></td>`:''}</tr>`}).join('')||`<tr><td colspan="${ed?9:8}" class="mu" style="padding:12px">Sin niveles.</td></tr>`}
    </tbody></table></div><div class="callout cslamst" id="cslamst"${CS_LAMST?'':' hidden'}><i class="csspin" aria-hidden="true"></i><span>${esc(CS_LAMST)}</span></div>${ed?`<div class="pad csrow"><button class="ib" data-cs="lvnew">+ Agregar niveles arriba</button>${(()=>{const n=csLvSugAll().filter(o=>!csLamQueued(o.p.id,o.d)).length;return P_.length&&n?`<button class="ib pri" data-cs="lvsug">Vincular sugeridos (${n})</button>`:''})()}${P_.length?'<button class="ib" data-cs="entpub">◆ Publicar entregas en Last Planner</button>':''}${P_.length?`<span class="note">${csEntCount()} entrega(s) programadas en el Lookahead de Casco.</span>`:''}</div>`:''}<p class="note pad" style="margin-top:0">El orden va de abajo hacia arriba (sótanos primero). Los códigos se guardan al salir de la casilla.</p></div>`;
  h+=csSecCard();
  return h}

/* ---------- catálogo: edición ---------- */
/** horas de la jornada para pasar del rendimiento a HH/und (Configuración › Casco; por defecto 8,5 h; no depende del Tareo) */
const csJor=()=>{const j=+((S.meta.get('project')||{}).jorH);return j>0?j:8.5};
function csCatSet(id,f,v){const c=MX.cat.get(id);if(!c)return;let val=v;
  if(f==='hh'){const h=v===''?null:+v;if(h!=null&&!(h>0)){toast('Escribe un número mayor que 0.');requestRender();return}f='rend';val=h==null?null:Math.round(csJor()/h*1000)/1000;c.rend=val;fcol('mcat').doc(id).set({rend:val,by:me.email,t:NOW()},{merge:true}).then(()=>requestRender()).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)));return}
  if(['tr','rend','mets','rat','off','dur'].includes(f)){val=v===''?null:+v;if(val!=null&&!(val>=0)){toast('Escribe un número válido.');requestRender();return}if(f==='dur'&&val!=null&&val<1)val=1}
  if(f==='name'){val=String(v||'').trim();if(!val){toast('La partida necesita un nombre.');requestRender();return}}
  c[f]=val;fcol('mcat').doc(id).set({[f]:val,by:me.email,t:NOW()},{merge:true}).then(()=>{if(f==='rend')requestRender()}).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}
async function csCatAdd(){const n=await uiAsk({title:'Nueva partida del catálogo de casco',input:{label:'Nombre',placeholder:'Ej.: Curado de losa',required:true},ok:'Agregar'});if(!n)return;
  const id=uid('k');const tr=Math.max(0,...csCats().map(c=>+c.tr||0))+1;
  fcol('mcat').doc(id).set({ref:id,name:String(n).trim(),grp:'E',tr,off:0,dur:1,cl:'t',al:[mnk(n)],ord:tr,by:me.email,t:NOW()}).then(()=>toast('Partida agregada')).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}
/** catálogo típico de casco (el de la obra de ejemplo, sin ejecutores): punto de partida para una obra nueva */
/** diferencias del catálogo con la secuencia típica de estructura (CS_DEMO_CAT, grupo E): partidas que faltan, obsoletas (EL, AL) o con otro orden/desfase */
const CS_OLD={EL:'Encofrado de vigas y losa',AL:'Acero de vigas y losa'};
function csSeqDiff(){const out=[];const has=k=>MX.cat.get('k-'+k);
  for(const k of Object.keys(CS_OLD)){const c=has(k);if(c&&!c.arch)out.push({k,kind:'old',c})}
  CS_DEMO_CAT.filter(r=>r[2]==='E').forEach(r=>{const c=has(r[0]);const i=CS_DEMO_CAT.indexOf(r)+1;if(!c)out.push({k:r[0],kind:'add',r,i});else if(!c.arch&&((c.off??0)!==r[7]||(c.dur??1)!==r[8]||(c.tr??0)!==i))out.push({k:r[0],kind:'upd',r,i,c})});return out}
async function csSeqTip(){if(!csEd())return;const D=csSeqDiff();if(!D.length){toast('El catálogo ya tiene la secuencia típica.');return}
  const nm=x=>x.c?x.c.name:x.r[1];
  if(!(await uiAsk({title:'Actualizar a la secuencia típica',text:'Horizontales: día 1 fondo y 1.er costado de viga · día 2 acero de vigas · día 3 2.º costado de viga y fondo de losa · día 4 acero de losa e instalaciones · día 5 vaciado de losa y vigas. Las actividades ya programadas no cambian: vuelve a usar el generador desde mañana.',
    list:[...D.filter(x=>x.kind==='add').map(x=>'Se agrega: '+nm(x)),...D.filter(x=>x.kind==='old').map(x=>'Se quita del catálogo: '+nm(x)),...D.filter(x=>x.kind==='upd').map(x=>`Se ajusta orden y desfase: ${nm(x)} (desfase ${x.r[7]})`)],ok:'Actualizar'})))return;
  const b=db.batch(),t=NOW();const ex=k=>{const o=MX.cat.get('k-'+k);return o&&!o.arch?o:null};
  /* el ejecutor de las nuevas sale de la partida antigua equivalente (encofrado → EL, acero → AL) */
  const scOf={EF1:(ex('EL')||{}).sc,EF2:(ex('EL')||{}).sc,AVG:(ex('AL')||{}).sc,ALO:(ex('AL')||{}).sc};
  for(const x of D){if(x.kind==='old'){b.set(fcol('mcat').doc('k-'+x.k),{arch:{t,by:me.email,n:me.name||me.email}},{merge:true});continue}
    const[k,name,grp,,und,mets,rend,off,dur,vac,ent]=x.r;
    if(x.kind==='add')b.set(fcol('mcat').doc('k-'+k),{ref:'k-'+k,name,grp,sc:scOf[k]||'',und,mets,rend,rat:CS_RAT[k]??null,off,dur,vac:!!vac,ent:!!ent,tr:x.i,ord:x.i,cl:'t',al:[mnk(name)],by:me.email,t},{merge:true});
    else b.set(fcol('mcat').doc('k-'+k),{off,dur,tr:x.i,ord:x.i,by:me.email,t},{merge:true})}
  /* lo de albañilería y escalera conserva su lugar, después de la estructura */
  csCats().filter(c=>c.grp!=='E').forEach((c,i)=>b.set(fcol('mcat').doc(c.id),{tr:CS_DEMO_CAT.filter(r=>r[2]==='E').length+1+i},{merge:true}));
  try{await b.commit();toast('Secuencia típica aplicada al catálogo. Revisa los ejecutores y vuelve a generar el tren desde mañana.')}catch(e){toast('No se pudo: '+(e&&e.code||e))}}
async function csCatTip(){if(!csEd()||csCats().length)return;if(!(await uiAsk({title:'Cargar catálogo típico',text:`Se agregan ${CS_DEMO_CAT.length} partidas típicas (estructura, escalera, albañilería, tabiques, tarrajeo y entrega) con su secuencia, rendimientos y metrados de referencia. Luego asigna los ejecutores y ajusta los valores a tu obra.`,ok:'Cargar'})))return;
  const b=db.batch(),t=NOW();CS_DEMO_CAT.forEach(([k,name,grp,,und,mets,rend,off,dur,vac,ent],i)=>b.set(fcol('mcat').doc('k-'+k),{ref:'k-'+k,name,grp,sc:'',und,mets,rend,rat:CS_RAT[k]??null,off,dur,vac:!!vac,ent:!!ent,tr:i+1,ord:i+1,cl:'t',al:[mnk(name)],by:me.email,t},{merge:true}));
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
  ['DV','Desencofrado de verticales','E','cs-ramos','m²',95,45,3,1,0,0],/* horizontales (secuencia típica indicada por el dueño, 27-10-2026): día 1 fondo y 1.er costado de viga · día 2 acero de vigas ·
     día 3 2.º costado de viga y fondo de losa · día 4 acero de losa e instalaciones · día 5 vaciado de losa y vigas */
  ['EF1','Encofrado de fondo y 1.er costado de viga','E','cs-ramos','m²',56,12,4,1,0,0],['AVG','Acero de vigas','E','cs-aceros','kg',1050,250,5,1,0,0],
  ['EF2','Encofrado de 2.º costado de viga y fondo de losa','E','cs-ramos','m²',129,16,6,1,0,0],['ALO','Acero de losa','E','cs-aceros','kg',1050,300,7,1,0,0],
  ['IL','Instalaciones en losa','E','cs-inst','pto',40,12,7,1,0,0],['VL','Concreto de losa y vigas','E','cs-ramos','m³',28,7,8,1,1,0],
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
  CS_DEMO_CAT.forEach(([k,name,grp,sc,und,mets,rend,off,dur,vac,ent],i)=>W.push(['mcat',cid(k),{ref:cid(k),name,grp,sc,und,mets,rend,rat:CS_RAT[k]??null,off,dur,vac:!!vac,ent:!!ent,tr:i+1,ord:i+1,cl:'t',al:[mnk(name)],by,t}]));
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

/* ---------- Vaciar Casco (solo copia de prueba, administrador; 26-10-2026, decidido con el dueño) ----------
   Para empezar Casco desde cero tras probar la obra de ejemplo: borra DE VERDAD (no archiva) los niveles y todo lo que cuelga
   de ellos en las colecciones cs_. Conserva siempre la configuración del proyecto (cs_meta), los registros de auditoría que
   las reglas no dejan borrar (lhlog, mlog, mver) y todo lo compartido (equipo, módulo Planos, Tareo). Opcional: ejecutores y
   catálogo (el catálogo se archiva: las reglas no permiten borrar mcat). También borra las entregas que Casco publicó como
   hitos en Last Planner (hitos con cs:true), que quedarían huérfanas. Pide escribir BORRAR y recarga la página al terminar. */
const CS_VAC=['acts','ambientes','sectors','pisos','weeks','wsnap','restr','daily','fotos','live','lib','dplan','pdz','pzon','planos','laminas','lamimg','ksec','kcat','hitos','nprog','doneidx','pcrit','pav','pull','frev','pmet','lhidx','lhver','lkcom'];
async function csDelCol(col,ref,keep){const sn=await ref.get();const ids=sn.docs.filter(d=>!keep||keep(d.data())).map(d=>d.id);
  for(let i=0;i<ids.length;i+=400){const b=db.batch();ids.slice(i,i+400).forEach(id=>b.delete(ref.doc(id)));await b.commit()}return ids.length}
async function csVaciar(){if(!isAdmin||window.LPS_ENV!=='pruebas'||!CS()||DNS!=='cs_')return;
  const o={con:true,cat:false};
  const html=`<p style="margin:0 0 8px">Se borran <b>definitivamente</b> (no van a la Papelera) los niveles, sectores y actividades de Casco, y todo lo registrado en ellos: semanas congeladas, restricciones, avance, plan diario, liberaciones, láminas de Sectorización, versiones del asistente de sectorización y las entregas publicadas en Last Planner.</p>
    <label class="chk" style="display:flex;margin:4px 0"><input type="checkbox" id="csvCon" checked> Borrar también los ejecutores (${S.con.size})</label>
    <label class="chk" style="display:flex;margin:4px 0"><input type="checkbox" id="csvCat"> Quitar también el catálogo de casco (${csCats().length} partidas)</label>
    <p class="mu" style="margin:8px 0 0">Se conservan la configuración de Casco (semanas, calendario, horas de corte), el equipo, el módulo Planos y todo Last Planner.</p>`;
  const ask=uiAsk({title:'Vaciar Casco',tone:'danger',html,list:[`${S.pis.size} nivel(es)`,`${S.amb.size} sector(es)`,`${S.act.size} actividad(es)`,`${KSEC.size} versión(es) de sectorización`],
    input:{label:'Escribe BORRAR para confirmar',required:true},ok:'Vaciar Casco',cancel:'Cancelar'});
  const dlg=document.getElementById('uask');if(dlg)dlg.addEventListener('change',e=>{if(e.target.id==='csvCon')o.con=e.target.checked;if(e.target.id==='csvCat')o.cat=e.target.checked});
  const v=await ask;if(v==null)return;if(String(v).trim().toUpperCase()!=='BORRAR'){toast('No se borró nada: había que escribir BORRAR.');return}
  if(DNS!=='cs_')return;/* nunca en Last Planner */
  toast('Vaciando Casco…');let n=0;const fail=[];
  const cols=o.con?[...CS_VAC,'contractors']:CS_VAC;
  for(const c of cols){try{n+=await csDelCol(c,fcol(c))}catch(e){fail.push(c)}}
  try{n+=await csDelCol('hitos',fcolLp('hitos'),h=>h&&h.cs===true)}catch(e){fail.push('entregas en Last Planner')}
  if(o.cat){try{const L=[...MX.cat.values()].filter(c=>!c.arch&&c.grp);const a={arch:{t:NOW(),by:me.email,n:'Vaciar Casco'}};
    for(let i=0;i<L.length;i+=400){const b=db.batch();L.slice(i,i+400).forEach(c=>b.set(fcol('mcat').doc(c.id),a,{merge:true}));await b.commit()}}catch(e){fail.push('catálogo')}}
  undoS.length=0;redoS.length=0;if(U.piso){U.piso='';saveUI()}
  await uiAsk({title:fail.length?'Casco se vació en parte':'Casco vacío',tone:fail.length?'warn':'ok',cancel:false,ok:'Recargar',
    text:`${n} registros borrados.${fail.length?' No se pudo borrar: '+fail.join(', ')+'. Puedes volver a intentarlo: lo ya borrado no se repite.':' Ya puedes crear los niveles desde cero.'}`});
  if(window.__e2eNoReload){render();return}/* pruebas: la base falsa vive en memoria y se perdería al recargar */
  location.reload()}
function csDemoGenTry(n=0){if(!CS_DEMO_GEN)return;const ok=S.pis.size>=9&&csCats().length>=CS_DEMO_CAT.length&&S.amb.size>=40;
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
/* la vista Tren del Lookahead (programar como en Excel, «Proyectar») está en casco-tren.js */
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
function csSecCard(){return`<div class="card"><h2>Frentes y sectorización <span class="sub">Ahora están en la pestaña Sectorización</span></h2><div class="pad csrow"><span class="note" style="flex:1">Define los frentes de trabajo (con sus cuadrillas) y compara alternativas de sectorización con el semáforo del asistente.</span><button class="ib pri" data-cs="gosz">Ir a Sectorización</button></div></div>`}
/* ratios por defecto (metrado por m² de planta; elegidos para un edificio típico de concreto armado en Lima, 26-10-2026): estructura por m²
   de techo (planta de encofrado), albañilería por m² de piso (planta de arquitectura). Se ajustan en el catálogo. */
const CS_RAT={AV:12,EV:0.8,VV:0.1,DV:0.8,EF1:0.35,AVG:8,EF2:0.8,ALO:8,EL:1.15,AL:16,IL:0.25,VL:0.2,AS:0.9,IM:0.2,TD:0.5,IT:0.1,SC:0.5,TR:1.8};
const csRatKey=c=>{const k=String(c.ref||c.id||'').replace(/^k-/,'');if(CS_RAT[k]!=null)return k;const d=CS_DEMO_CAT.find(x=>mnk(x[1])===mnk(c.name));return d?d[0]:''};
/** partida típica sin ratio que tiene uno por defecto (escalera y entrega no tienen: antes iban como undefined y Firestore rechazaba el lote entero) */
const csRatMiss=c=>c.rat==null&&CS_RAT[csRatKey(c)]!=null;
async function csRatDef(){if(!csEd())return;const L=csCats().filter(csRatMiss);if(!L.length){toast('Todas las partidas típicas ya tienen incidencia.');return}
  const b=db.batch();L.forEach(c=>b.set(fcol('mcat').doc(c.id),{rat:CS_RAT[csRatKey(c)],by:me.email,t:NOW()},{merge:true}));try{await b.commit();L.forEach(c=>{const m=MX.cat.get(c.id);if(m)m.rat=CS_RAT[csRatKey(c)]});/* escalera y entrega: sin ratio por defecto, se escriben a mano */toast(`Incidencias por defecto en ${L.length} partida(s)`);requestRender()}catch(e){toast('No se pudo: '+(e&&e.code||e))}}
const csPolyA=P=>{let a=0;for(let i=0,j=P.length-1;i<P.length;j=i++)a+=(P[j].x+P[i].x)*(P[j].y-P[i].y);return Math.abs(a/2)};
const csUnflat=f=>{const o=[];for(let i=0;i+1<(f||[]).length;i+=2)o.push({x:f[i],y:f[i+1]});return o};
const CS_SCOL=['#1D9E75','#BA7517','#7F77DD','#D4537E','#378ADD','#639922','#D85A30','#888780'];
/** m² de cada sector dibujado (null si la lámina no tiene escala: no viene del módulo Planos) */
function csAreas(v){const API=window.__plano;const l=API&&v.vista?API.LAM.get(v.vista):null;const mpp=typeof csScale==='function'?csScale(l).mpp:(l&&l.plb&&l.plb.mpp>0?l.plb.mpp:null);
  return{mpp,a:Array.from({length:v.k},(_,i)=>{const g=(v.geo||{})[i];return g&&g.length>=6&&mpp?Math.round(csPolyA(csUnflat(g))*mpp*mpp*10)/10:null})}}
/** metrados de las partidas con ratio: área del sector × ratio */
function csMetFromAreas(v){const A=csAreas(v).a;if(!A.some(x=>x>0))return;v.met=v.met||{};for(const c of csCats(v.grp))if(c.rat>0){const old=v.met[c.id]||[];v.met[c.id]=A.map((a,i)=>a>0?Math.round(a*c.rat*10)/10:(old[i]??null))}}
/** aplica una versión: en cada nivel del rango deja los sectores del grupo con estos nombres y metrados. Los sectores que sobran se
    archivan solo si no tienen actividades (si tienen, se avisan y quedan: el ingeniero mueve sus actividades primero). */
/** lámina base del nivel donde va el dibujo de la versión: la misma lámina de referencia, o una que use el mismo plano del módulo Planos (escalada si mide distinto) */
function csGeoTarget(v,pid){const API=window.__plano;if(!API||!v.vista||!v.geo)return null;const ref=API.LAM.get(v.vista);if(!ref)return null;if(ref.pisoId===pid)return{id:ref.id,k:1};
  const b=API.basesOf(pid).find(x=>x.plb&&ref.plb&&x.plb.id===ref.plb.id);if(b)return{id:b.id,k:ref.w>0?b.w/ref.w:1};
  /* nivel con otra lámina alineada en Sectorización › Niveles (casco-niv.js, laminas.al): el dibujo pasa con la alineación */
  if(typeof csMap==='function'){const l=csLamOf(pid,v.grp);const m=l&&csMap(ref,l);if(m)return{id:l.id,m}}return null}
async function csSecApply(v){const L=pisos();const i0=L.findIndex(p=>p.id===v.from),i1=L.findIndex(p=>p.id===v.to);const ops=[];let keep=0,nw=0,mod=0,geoN=0;const t=NOW();
  if(v.geo&&Object.keys(v.geo).length&&typeof loadPlanoMod==='function'){try{await loadPlanoMod();if(window.__plano.ensureLam)window.__plano.ensureLam()}catch(e){}}
  const used=new Set([...S.act.values()].filter(x=>!x._del).map(x=>x.ambId));
  /* con frente (casco-sz.js): un grupo de sectores por nivel, grupo y frente; el grupo antiguo sin frente lo adopta el único frente */
  const one=typeof KFR==='undefined'||KFR.size<=1;
  const skip=new Set(v.skip||[]);
  for(let i=i0;i<=i1;i++){const p=L[i];if(skip.has(p.id))continue;let sec=[...S.sec.values()].find(s=>s.pisoId===p.id&&s.grp===v.grp&&(s.fr||'')===(v.fr||''));
    if(!sec&&v.fr&&one){const lg=[...S.sec.values()].find(s=>s.pisoId===p.id&&s.grp===v.grp&&!s.fr);if(lg){sec=lg;const o={...lg};delete o.id;ops.push(op('sectors',lg.id,{...o,fr:v.fr}))}}
    if(!sec){const sid=p.id+'-'+v.grp.toLowerCase()+(v.fr?'-'+String(v.frc||v.fr).toLowerCase():'');const gn=v.grp==='A'?'Albañilería':'Estructura';sec={id:sid,pisoId:p.id,code:v.grp==='A'?'A':'E',name:v.fr?gn+' · '+(v.frn||v.frc):gn,grp:v.grp,order:v.grp==='A'?3:1};const d={pisoId:sec.pisoId,code:sec.code,name:sec.name,grp:sec.grp,order:sec.order};if(v.fr)d.fr=v.fr;ops.push(op('sectors',sid,d))}
    /* reemplaza lo ajustado a mano en Niveles: el grupo deja de estar «ajustado» */
    if(sec.hand&&S.sec.has(sec.id)&&!ops.some(o=>o.id===sec.id)){const o={...sec};delete o.id;delete o.hand;ops.push(op('sectors',sec.id,o))}
    const cur=[...S.amb.values()].filter(a=>a.sectorId===sec.id&&!a.fus).sort(byOrder);
    for(let s=0;s<v.k;s++){const met={};for(const[c,arr]of Object.entries(v.met||{}))if(arr&&arr[s]!=null)met[c]=+arr[s];
      const nmS=v.names[s]||((v.grp==='A'?'A':'S')+(s+1));const nx={sectorId:sec.id,code:nmS,name:'Sector '+(v.fr?nmS:nmS.replace(/^S/,'')),order:s+1,met,ksec:v.id};
      /* el dibujo del asistente pasa a la lámina base del nivel que usa el mismo plano del módulo Planos (o a la misma lámina) */
      const tg=csGeoTarget(v,p.id);const g0=(v.geo||{})[s];if(tg&&g0){const k=tg.k;nx.geo={...((cur[s]&&cur[s].geo)||{}),[tg.id]:tg.m?csMapF(tg.m,g0):g0.map(x=>Math.round(x*k*10)/10)};geoN++}
      if(cur[s]){const o={...cur[s]};delete o.id;const n2={...o,...nx};if(canon(n2)!==canon(o)){ops.push(op('ambientes',cur[s].id,n2));mod++}}else{ops.push(op('ambientes',uid('am'),nx));nw++}}
    for(const a of cur.slice(v.k)){if(used.has(a.id)){keep++;continue}const o={...a};delete o.id;ops.push(op('ambientes',a.id,{...o,arch:{t,by:me.email,n:me.name||me.email}}))}}
  if(!ops.length){toast('Los niveles ya tenían esta sectorización.');return}
  apply(ops,`Sectorización «${v.n}» aplicada`);toast(`Sectorización aplicada: ${nw} sector(es) nuevos, ${mod} actualizados${geoN?` · ${geoN} con su dibujo en la lámina`:''}${keep?` · ${keep} sobrante(s) con actividades quedan: mueve sus actividades y vuelve a aplicar`:''}`,'Deshacer',undo)}
/* ---------- láminas del módulo Planos por nivel (columnas Encofrado / Arquitectura) ----------
   Encofrado = plano EST, Arquitectura = plano ARQ, del mismo nivel (plb.niv: P3, S1, AZ…). Cada uno es una lámina base del nivel
   (dos vistas) tomada del módulo Planos y fija en su revisión (plano.js lamFromPlb); se reconoce por laminas.plb.disc. */
const csLvNum=p=>{const m=String(p.tc||p.code||'').match(/(\d+)\s*$/);return m?+m[1]:null};
const csLvNiv=p=>{const t=String(p.tc||p.code||p.name||'').toUpperCase();if(/S[OÓ]T|^TS|^S\d|^PS/.test(t)||/s[oó]tano/i.test(p.name||'')){const n=(String(p.name||'').match(/(\d+)/)||[])[1];return'S'+(n||1)}
  if(/AZ/.test(t)||/azotea/i.test(p.name||''))return'AZ';const n=csLvNum(p);return n!=null?'P'+n:''};
const csLvLams=pid=>{const API=window.__plano;return API&&API.LAM?[...API.LAM.values()].filter(l=>l.pisoId===pid&&l.base&&!l.arch):[]};
const csLvLamOf=(pid,disc)=>csLvLams(pid).find(l=>l.plb&&(l.plb.disc===disc||(disc==='EST'&&/encof|estruct/i.test(l.plb.tit||''))));
function csLvSug(p,disc){if(typeof PLB==='undefined')return null;const nv=csLvNiv(p);if(!nv)return null;
  const L=[...PLB.values()].filter(x=>!x.eto&&!x.arch&&x.disc===disc&&String(x.niv||'').toUpperCase()===nv&&(typeof plUsable!=='function'||plUsable(x)));   /* DXF: solo alistados */
  if(!L.length)return null;const sc=x=>(/planta/i.test(x.tipo||'')?2:0)+(disc==='EST'&&/encof/i.test(x.tit||'')?3:0)+(disc==='ARQ'&&/distrib|planta/i.test(x.tit||'')?1:0);
  return L.sort((a,b)=>sc(b)-sc(a)||String(a.cod).localeCompare(b.cod,'es',{numeric:true}))[0]}
function csLvSugAll(){const out=[];for(const p of pisos())for(const d of['EST','ARQ'])if(!csLvLamOf(p.id,d)){const x=csLvSug(p,d);if(x)out.push({p,d,x})}return out}
function csLvLamTd(p,disc,ed){const l=csLvLamOf(p.id,disc);
  if(l){const pp=typeof PLB!=='undefined'?PLB.get(l.plb.id):null;const nv=pp&&(pp.rev||1)>l.plb.rev;return`<td class="cslam"><span class="mono">${esc(l.plb.cod||l.plb.id)}</span> <span class="mu">Rev. ${l.plb.rev}</span>${nv?` <span class="csbal warn" title="En el módulo Planos hay una revisión más nueva: cámbiala en Sectorización (menú de la lámina)">Rev. ${pp.rev} nueva</span>`:''}</td>`}
  const sg=csLvSug(p,disc);
  if(csLamQueued(p.id,disc)){const cur=CS_LAMQ[0]&&CS_LAMQ[0].pid===p.id&&CS_LAMQ[0].disc===disc;return`<td class="cslam"><span class="mu">${cur?'Vinculando…':'En cola…'}</span></td>`}
  return`<td class="cslam">${ed&&typeof PLB!=='undefined'&&PLB.size?`<select data-cs="lvlam" data-id="${p.id}" data-disc="${disc}" aria-label="${disc==='EST'?'Encofrado':'Arquitectura'} de ${esc(p.name)}"><option value="">${sg?'Sugerido: '+esc(sg.cod):'Elegir…'}</option>${[...PLB.values()].filter(x=>!x.eto&&!x.arch&&(x.disc===disc||!['EST','ARQ'].includes(x.disc))).sort((a,b)=>String(a.cod).localeCompare(b.cod,'es',{numeric:true})).map(x=>{const no=typeof plAlPend==='function'&&plAlPend(x);return`<option value="${esc(x.id)}"${no?' disabled':''}>${esc(x.cod)} · ${esc((x.tit||'').slice(0,40))}${x.niv?' ('+esc(x.niv)+')':''}${no?' · por alistar':''}</option>`}).join('')}</select>${sg?`<button class="ab" data-cs="lvok" data-id="${p.id}" data-disc="${disc}" data-plb="${esc(sg.id)}" title="Vincular ${esc(sg.cod)}">✓</button>`:''}`:'<span class="mu">—</span>'}</td>`}
/* vincular: una cola (26-10-2026). Antes, mientras una lámina se procesaba, los demás clics («✓», «Vincular sugeridos») no hacían nada
   sin avisar; ahora se suman a la cola y la tarjeta de Niveles muestra el avance. La lámina se arma con los mosaicos del módulo Planos. */
let CS_LAMBUSY=false;const CS_LAMQ=[];let CS_LAMST='';
const csLamQueued=(pid,disc)=>CS_LAMQ.some(q=>q.pid===pid&&q.disc===disc);
function csLamSt(t){CS_LAMST=t;const el=document.getElementById('cslamst');if(el){el.hidden=!t;el.querySelector('span').textContent=t}else if(U.tab==='cfg')requestRender()}
async function csLvLink(items){if(!csEd()||!items.length)return;let n=0;
  for(const it of items)if(!csLamQueued(it.pid,it.disc)&&!csLvLamOf(it.pid,it.disc)){CS_LAMQ.push(it);n++}
  if(!n){if(CS_LAMBUSY)toast('Ya está en la cola de vinculación.');return}
  if(CS_LAMBUSY){toast(`${n} lámina(s) más en la cola`);csLamSt(CS_LAMST);return}
  CS_LAMBUSY=true;let ok=0,fail=0,tot=CS_LAMQ.length;requestRender();
  try{if(typeof loadPlanoMod==='function')await loadPlanoMod();const API=window.__plano;if(API.ensureLam)API.ensureLam();
    while(CS_LAMQ.length){const it=CS_LAMQ[0];tot=Math.max(tot,ok+fail+CS_LAMQ.length);const p=S.pis.get(it.pid),pb=PLB.get(it.plb);
      if(p&&!csLvLamOf(it.pid,it.disc)){const pre=`${ok+fail+1} de ${tot} · ${pb?pb.cod:''} → ${p.name}`;csLamSt(pre+'…');
        try{await API.lamFromPlb(it.pid,it.plb,{esp:it.disc==='EST'?'Estructuras':'Arquitectura',order:it.disc==='EST'?1:2,quiet:true,say:t=>csLamSt(pre+' · '+t)});ok++}
        catch(e){fail++;toast(`No se pudo vincular ${pb?pb.cod:''}: ${e.message||e}`)}}
      CS_LAMQ.shift();requestRender()}
    toast(`${ok} lámina(s) vinculadas desde el módulo Planos${fail?` · ${fail} con error`:''}`)}
  finally{CS_LAMBUSY=false;CS_LAMQ.length=0;CS_LAMST='';requestRender()}}

/* ---------- niveles (Configuración › Casco › Niveles; admin y editores) ---------- */
const csLvOps=(L)=>L.map((p,i)=>{const o={...p};delete o.id;return(p.order===i)?null:op('pisos',p.id,{...o,order:i})}).filter(Boolean);
/** nivel nuevo con su frente suelto de escalera */
function csLvNew(name,code,tc,pc){const id=uid('n');return{id,ops:[op('pisos',id,{name,code,tc,pc,order:0}),op('sectors',id+'-f',{pisoId:id,code:'F',name:'Frentes sueltos',grp:'S',order:2}),op('ambientes',id+'-esc',{sectorId:id+'-f',code:'ESC',name:'Escalera',order:1})]}}
async function csLevelsAdd(){if(!csEd())return;
  const n=await uiAsk({title:'Agregar niveles arriba',text:'Escribe el nombre de un nivel (p. ej. Azotea) o cuántos niveles agregar (p. ej. 3: se numeran solos).',input:{label:'Nombre o cantidad',placeholder:'Ej.: Azotea  ·  o  3',required:true},ok:'Agregar'});if(n==null)return;
  const t=String(n).trim();const L=pisos();const NL=L.slice();const ops=[];let k=0,lab='';
  if(/^\d+$/.test(t)){k=Math.min(60,+t);if(!k){toast('Escribe un número mayor que 0 o el nombre del nivel.');return}
    const nums=L.map(p=>+(String(p.code||'').match(/(\d+)$/)||[])[1]||0).filter(x=>x>0);let num=nums.length?Math.max(...nums):0;
    for(let i=0;i<k;i++){num++;const nv=csLvNew('Nivel '+num,'N'+num,'T'+num,'P'+num);ops.push(...nv.ops);NL.push({id:nv.id,order:-1})}lab=`${k} nivel(es) agregados`}
  else{if(!t)return;const nv=csLvNew(t,csLvAbbr(t),'T'+csLvAbbr(t),'P'+csLvAbbr(t));ops.push(...nv.ops);NL.push({id:nv.id,order:-1});k=1;lab=`Nivel «${t}» agregado`}
  const ord=csLvOrd(ops,NL);apply([...ops,...ord],lab);toast(`${lab}: aplícales una versión de sectorización`,'Deshacer',undo)}
/** código corto desde el nombre (Sótano 2 → S2, Azotea → A); si ya existe, se le suma un número */
function csLvAbbr(nm){let ab=String(nm).replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9 ]/g,'').split(/\s+/).filter(Boolean).map(w=>/^\d+$/.test(w)?w:w[0]).join('').toUpperCase().slice(0,4)||'N';
  const used=new Set(pisos().map(p=>String(p.code||'').toUpperCase()));let c=ab,i=2;while(used.has(c))c=ab+(i++);return c}
/** los pisos nuevos de ops reciben su orden en la lista NL; los existentes que cambian de lugar, un op aparte */
function csLvOrd(ops,NL){const out=[];NL.forEach((p,i)=>{const o=ops.find(x=>x.col==='pisos'&&x.id===p.id&&!x.before);if(o){o.after.order=i;return}if(p.order!==i){const c={...p};delete c.id;out.push(op('pisos',p.id,{...c,order:i}))}});return out}
async function csLvAdd(id,after){if(!csEd())return;const L=pisos();const i=L.findIndex(p=>p.id===id);if(i<0)return;const ref=L[i];
  const n=await uiAsk({title:`Agregar un nivel ${after?'después de':'antes de'} ${ref.name}`,text:after?'Queda encima (p. ej. la azotea).':'Queda debajo (p. ej. otro sótano).',input:{label:'Nombre',placeholder:after?'Ej.: Azotea':'Ej.: Sótano 2',required:true},ok:'Agregar'});if(!n)return;
  const nm=String(n).trim();if(!nm)return;const ab=csLvAbbr(nm);
  const nv=csLvNew(nm,ab,'T'+ab,'P'+ab);const NL=L.slice();NL.splice(after?i+1:i,0,{id:nv.id});
  apply([...nv.ops,...csLvOrd(nv.ops,NL)],`Nivel «${nm}» agregado`);toast(`Nivel «${nm}» agregado: revisa sus códigos de techo y piso`,'Deshacer',undo)}
function csLvMove(id,d){if(!csEd())return;const L=pisos();const i=L.findIndex(p=>p.id===id),j=i+d;if(i<0||j<0||j>=L.length)return;const NL=L.slice();[NL[i],NL[j]]=[NL[j],NL[i]];
  const ops=csLvOps(NL);if(ops.length)apply(ops,`${L[i].name}: ${d<0?'sube':'baja'} en la lista`)}
function csLvSet(id,f,v){if(!csEd())return;const p=S.pis.get(id);if(!p)return;v=String(v||'').trim();if(!v&&f!=='pc'&&f!=='tc'){toast('No puede quedar vacío.');requestRender();return}if((p[f]||'')===v)return;
  if(f==='code'&&pisos().some(x=>x.id!==id&&String(x.code||'').toUpperCase()===v.toUpperCase())){toast(`Ya hay un nivel con el código ${v}.`);requestRender();return}
  const o={...p};delete o.id;apply([op('pisos',id,{...o,[f]:v})],`${p.name}: ${f==='name'?'nombre':f==='code'?'código':f==='tc'?'código de techo':'código de piso'}`)}
async function csLvDel(id){if(!csEd())return;const p=S.pis.get(id);if(!p)return;const secs=[...S.sec.values()].filter(s=>s.pisoId===id);const ambs=[...S.amb.values()].filter(a=>secs.some(s=>s.id===a.sectorId));const acts=[...S.act.values()].filter(x=>!x._del&&ambs.some(a=>a.id===x.ambId));
  if(!(await uiAsk({title:`¿Eliminar ${p.name}?`,tone:acts.length?'warn':'info',text:'Se archiva (no se borra): se recupera en Configuración › Papelera y se puede deshacer.',list:[`${ambs.length} sector(es)`,...(acts.length?[`${acts.length} actividad(es) programadas: también se archivan`]:[])],ok:'Eliminar',cancel:'Cancelar'})))return;
  const ops=[];for(const x of acts)ops.push(arc('acts',x.id));for(const a of ambs)ops.push(arc('ambientes',a.id));for(const s0 of secs)ops.push(arc('sectors',s0.id));ops.push(arc('pisos',id));
  if(U.piso===id){U.piso='';saveUI()}apply(ops,`${p.name} eliminado`);toast(`${p.name} eliminado`,'Deshacer',undo)}

/* ---------- eventos (delegados: funcionan en Configuración y en el Lookahead) ---------- */
document.addEventListener('click',e=>{if(!CS())return;const t=e.target;
  const b=t.closest&&t.closest('[data-cs]');if(!b||b.tagName==='INPUT'||b.tagName==='SELECT')return;const k=b.dataset.cs;
  if(k==='init')csInit();else if(k==='demo')csDemo();else if(k==='vaciar')csVaciar();else if(k==='catadd')csCatAdd();else if(k==='cattip')csCatTip();else if(k==='seqtip')csSeqTip();else if(k==='ratdef')csRatDef();else if(k==='catdel')csCatDel(b.dataset.id);
  else if(k==='entpub')csEntPublish();else if(k==='gosz'){U.tab='planos';U.csSzV='fr';saveUI();render()}else if(k==='gotren'){U.tab='look';U.lkV='tren';saveUI();render()}else if(k==='lvnew')csLevelsAdd();else if(k==='lvadd')csLvAdd(b.dataset.id,b.dataset.d==='1');else if(k==='lvmv')csLvMove(b.dataset.id,+b.dataset.d);else if(k==='lvdel')csLvDel(b.dataset.id);else if(k==='lvok')csLvLink([{pid:b.dataset.id,disc:b.dataset.disc,plb:b.dataset.plb}]);else if(k==='lvsug')csLvLink(csLvSugAll().map(o=>({pid:o.p.id,disc:o.d,plb:o.x.id})))});
document.addEventListener('change',e=>{if(!CS())return;const t=e.target;
  if(t.dataset&&t.dataset.cs==='lvlam'){if(t.value)csLvLink([{pid:t.dataset.id,disc:t.dataset.disc,plb:t.value}]);return}
  if(t.dataset&&t.dataset.cslv){csLvSet(t.dataset.id,t.dataset.cslv,t.value);return}
  const f=t.dataset&&t.dataset.csf;if(f){const r=t.closest('[data-csc]');if(r&&csEd())csCatSet(r.dataset.csc,f,t.type==='checkbox'?t.checked:t.value);return}
  const k=t.dataset&&t.dataset.cs;if(!k||!csEd())return;
  if(k==='casa'){const c=S.con.get(t.dataset.id);if(c){const o={...c};delete o.id;apply([op('contractors',c.id,{...o,casa:t.checked})],`${c.name}: ${t.checked?'cuadrilla de casa':'subcontratista'}`)}}
  else if(k==='jor'&&isAdmin){const j=+t.value;if(!(j>0&&j<=14)){toast('Escribe las horas de la jornada (1 a 14).');requestRender();return}fcol('meta').doc('project').set({jorH:j},{merge:true}).then(()=>requestRender()).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))}
  else if(k==='lp'){const p=S.pis.get(t.dataset.id);if(p){const o={...p};delete o.id;apply([op('pisos',p.id,{...o,lp:t.value||null})],`${p.name}: piso de Last Planner`)}}});
