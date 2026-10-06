"use strict";
/* LPS 911 · Módulo Tareo (fase 2): bandeja del asistente de tareo (rol tasis; también admin).
   Contrato en docs/ia/tareo.md («Contrato de F2»): revisión de un tareo (cotejo de firmas con la foto, hora de garita,
   corrección directa con motivo, marcar/quitar revisado, reabrir) y, en «Tareos del día», sin tareo, conflictos (un obrero en
   dos tareos) y no enviados. Correcciones de la auditoría F2: ver docs/ia/tareo.md («Correcciones de la auditoría F2 — revisión»).
   El jefe de producción (editor con tpub) ve el mismo detalle en solo lectura.
   La revisión es un espacio de trabajo a pantalla completa (#trWs) y permite pasar un obrero al tareo de otro capataz:
   ver docs/ia/tareo.md («Revisión en laptop (oct 2026)»).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* ---------- funciones puras ---------- */
const trNm=r=>r&&(r.ape||r.nom)?[r.ape,r.nom].filter(Boolean).join(', '):'';
const trHas=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const trSameSet=(a,b)=>{const A=[...new Set(Array.isArray(a)?a:[])].sort(),B=[...new Set(Array.isArray(b)?b:[])].sort();return A.length===B.length&&A.every((x,i)=>x===B[i])};
/* JSON con las claves ordenadas (para comparar versiones de un documento) */
const trStr=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k2)=>(o[k2]=x[k2],o),{}):x);
/** cotejo vigente del tareo: {dni:{fir?, gar?}}.
    Nuevo (auditoría F2): `cot:{dni:{fir,gar,by,t}}` + `cotFot:[ids de fotos cotejadas]`; las firmas solo valen si cotFot son las
    fotos actuales (si el capataz cambió la foto, hay que cotejar de nuevo); la garita vale siempre.
    Antiguo (antes de la auditoría): rows[dni].fir/gar, solo si lo escribió la oficina (revisado o con historial de cotejo/revisión). */
function tCotDe(doc){const d=doc||{};const o={};const put=(k,x,fv)=>{if(!x||typeof x!=='object')return;const y={};
    if(fv&&(x.fir===true||x.fir===false))y.fir=x.fir;if(typeof x.gar==='string'&&x.gar)y.gar=x.gar;if(trHas(y,'fir')||y.gar)o[k]=y};
  if(d.cot&&typeof d.cot==='object'){const fv=trSameSet(d.cotFot,d.foto);for(const[k,x]of Object.entries(d.cot))put(k,x,fv);return o}
  const leg=!!d.revBy||(Array.isArray(d.hist)&&d.hist.some(h=>h&&(h.a==='fir'||h.a==='rev')));
  if(leg)for(const[k,r]of Object.entries(d.rows||{}))put(k,r,true);
  return o}
/** ¿hay firmas cotejadas que ya no valen porque cambiaron las fotos? */
const tCotVieja=d=>!!(d&&d.cot&&typeof d.cot==='object'&&!trSameSet(d.cotFot,d.foto)&&Object.values(d.cot).some(x=>x&&(x.fir===true||x.fir===false)));
/** copia del tareo con el cotejo puesto en rows[dni].fir/gar (como lo leen tObsRev y toStats); quita los fir/gar antiguos que no valen */
function tConCot(doc,cot){const d=doc||{};const C=cot||tCotDe(d);const rows={};
  for(const[k,r0]of Object.entries(d.rows||{})){const r={...r0};delete r.fir;delete r.gar;const c=C[k];if(c){if(trHas(c,'fir'))r.fir=c.fir;if(c.gar)r.gar=c.gar}rows[k]=r}
  return{...d,rows}}
/** obreros que figuran en más de un tareo del mismo día (presentes, con falta o sin marcar): un obrero va en un solo tareo por día
    (decisión del dueño). [{dni, nom, ts:[{id, cap, name, st, as}]}]. Lo usa F3 para no publicar con conflictos. */
function tConflictosDia(docs){const by=new Map();
  for(const t of docs||[]){if(!t||t.arch)continue;for(const[dni,r]of Object.entries(t.rows||{})){if(!r)continue;const L=by.get(dni)||[];
    L.push({id:t.id||'',cap:t.cap||'',name:t.capN||tCapName(t.cap)||t.cap||'',st:t.st||'bor',as:r.as===true?true:r.as===false?false:null,mot:r.mot||'',r});by.set(dni,L)}}
  return[...by].filter(([,L])=>L.length>1).map(([dni,L])=>({dni,nom:trNm((L.find(x=>x.as)||L[0]).r)||dni,ts:L.map(({r,...x})=>x)}))
    .sort((a,b)=>a.nom.localeCompare(b.nom)||a.dni.localeCompare(b.dni))}
const trAsTx=x=>x.as===true?'vino':x.as===false?`falta${x.mot?' '+x.mot:''}`:'sin marcar';
/** observaciones de la revisión: las de tValida (bloquean salvo las `warn`) más el cotejo de firmas, la garita y los conflictos del día.
    k: los de tValida · 'firp' firma sin cotejar (bloquea) · 'nofir' vino y no firmó · 'gar' salida en garita distinta ·
    'dup' figura también en otro tareo del día (bloquea). bl = bloquea. Lee el cotejo de rows[dni].fir/gar (ver tConCot).
    docs: tareos del día para los conflictos (por omisión, los de la vista abierta si el tareo está entre ellos). */
function tObsRev(doc,calc,docs){const d=doc||{};const c=calc||tCalc(d);const out=tValida(d).map(o=>({...o,bl:!o.warn}));const tol=TC().tolGar;
  for(const[dni,r]of Object.entries(c.rows||{})){if(!r.as)continue;const n=trNm(r)||dni;
    if(r.fir===false)out.push({dni,k:'nofir',bl:false,msg:`${n}: vino pero no firmó el formato.`});
    else if(r.fir!==true)out.push({dni,k:'firp',bl:true,msg:`${n}: falta cotejar su firma.`});
    const g=tMin(r.gar),f=tMin(r.fin);if(g!=null&&f!=null&&Math.abs(g-f)>tol)out.push({dni,k:'gar',bl:false,msg:`${n}: salida en garita distinta (garita ${r.gar}, tareo ${r.fin}).`})}
  if(docs===undefined&&d.id&&typeof TD!=='undefined'&&TD.docs.get(d.id))docs=[...TD.docs.values()];
  if(d.id&&docs)for(const x of tConflictosDia(docs.map(t=>t&&t.id===d.id?d:t))){if(!x.ts.some(y=>y.id===d.id))continue;
    const o=x.ts.filter(y=>y.id!==d.id).map(y=>`${y.name} (${trAsTx(y)})`).join(' y ');
    out.push({dni:x.dni,k:'dup',bl:true,msg:`${x.nom}: también figura en el tareo de ${o}. Un obrero va en un solo tareo por día.`})}
  return out}
/** obreros activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta), agrupados por capataz */
function tSinTareo(f,docs){const inT=new Set();for(const t of docs){if(!t||t.arch)continue;for(const k of Object.keys(t.rows||{}))inT.add(k)}
  const g=new Map();for(const p of tLive()){const k=p.dni||p.id;if(!tActivo(p,f)||inT.has(k))continue;const c=p.cap||'';const L=g.get(c)||[];L.push(p);g.set(c,L)}
  for(const L of g.values())L.sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||(a.dni||'').localeCompare(b.dni||''));
  return[...g].map(([cap,L])=>({cap,name:cap?tCapName(cap):'Sin capataz',L})).sort((a,b)=>(!a.cap)-(!b.cap)||a.name.localeCompare(b.name))}
/** ¿ya pasó la hora límite de envío para esa fecha? (días anteriores sí; hoy según TC().limEnv; no laborable no) */
function tLate(f){if(tNoLab(f))return false;const hoy=todayIso();if(f<hoy)return true;if(f>hoy)return false;return tHm(NOW())>=TC().limEnv}
/** resumen corto de lo que cambió una corrección (para hist.cam) */
function tCam(a,b){const o=[];const pc=x=>{const p=x&&S.tpc.get(x);return p?p.cod:(x||'sin partida')};
  const ra=a.rows||{},rb=b.rows||{};const nm=d=>((rb[d]||ra[d]||{}).ape||d);
  const A=new Map((a.blq||[]).map(x=>[x.id,x])),B=new Map((b.blq||[]).map(x=>[x.id,x]));
  for(const[id,x]of B){const y=A.get(id);const lb=`${pc(x.pc)} ${x.ini}–${x.fin}`;
    if(!y){o.push(`+ bloque ${lb} (${(x.dnis||[]).length})`);continue}
    const ch=[];if(y.pc!==x.pc)ch.push(`partida ${pc(y.pc)} → ${pc(x.pc)}`);if(y.ini!==x.ini||y.fin!==x.fin)ch.push(`${y.ini}–${y.fin} → ${x.ini}–${x.fin}`);
    const ya=new Set(y.dnis||[]),xa=new Set(x.dnis||[]);const add=[...xa].filter(d=>!ya.has(d)),rm=[...ya].filter(d=>!xa.has(d));
    if(add.length)ch.push('+'+add.map(nm).join(', +'));if(rm.length)ch.push('−'+rm.map(nm).join(', −'));
    if(ch.length)o.push(`bloque ${pc(y.pc)}: ${ch.join('; ')}`)}
  for(const[id,y]of A)if(!B.has(id))o.push(`− bloque ${pc(y.pc)} ${y.ini}–${y.fin}`);
  for(const d of Object.keys(rb)){const x=rb[d],y=ra[d]||{};
    if(!!x.as!==!!y.as)o.push(`${nm(d)}: ${x.as?'vino':'faltó ('+(x.mot||'?')+')'}`);else if(!x.as&&x.mot!==y.mot)o.push(`${nm(d)}: motivo ${y.mot||'?'} → ${x.mot||'?'}`);
    if(x.as&&!!x.alt!==!!y.alt)o.push(`${nm(d)}: altura ${x.alt?'sí':'no'}`)}
  for(const d of Object.keys(ra))if(!rb[d])o.push(`− ${nm(d)} (quitado del tareo)`);
  const s=o.join('; ');return s.length>400?s.slice(0,397)+'…':s}
/** detalle estructurado de una corrección (hist.det): [{dni?|blq?, campo, antes, despues}], máx. 50.
    campo: 'bloque' (alta/baja: «pc ini–fin»), 'pc', 'ini', 'fin', 'obrero' (en el bloque: true/false), 'fila' (en el tareo), 'as', 'mot', 'alt'. */
function tDet(a,b){const o=[];const ra=a.rows||{},rb=b.rows||{};const nv=x=>x==null||x===''?null:x;const bs=x=>`${x.pc||''} ${x.ini||''}–${x.fin||''}`;
  const A=new Map((a.blq||[]).filter(Boolean).map(x=>[x.id,x])),B=new Map((b.blq||[]).filter(Boolean).map(x=>[x.id,x]));
  for(const[id,x]of B){const y=A.get(id);if(!y){o.push({blq:id||'',campo:'bloque',antes:null,despues:bs(x)});continue}
    for(const f of['pc','ini','fin'])if(nv(y[f])!==nv(x[f]))o.push({blq:id||'',campo:f,antes:nv(y[f]),despues:nv(x[f])});
    const ya=new Set(y.dnis||[]),xa=new Set(x.dnis||[]);
    for(const d of xa)if(!ya.has(d))o.push({blq:id||'',dni:d,campo:'obrero',antes:false,despues:true});
    for(const d of ya)if(!xa.has(d))o.push({blq:id||'',dni:d,campo:'obrero',antes:true,despues:false})}
  for(const[id,y]of A)if(!B.has(id))o.push({blq:id||'',campo:'bloque',antes:bs(y),despues:null});
  for(const d of new Set([...Object.keys(ra),...Object.keys(rb)])){const x=rb[d],y=ra[d];
    if(!x||!y){o.push({dni:d,campo:'fila',antes:!!y,despues:!!x});continue}
    const as=v=>v===true?true:v===false?false:null;if(as(y.as)!==as(x.as))o.push({dni:d,campo:'as',antes:as(y.as),despues:as(x.as)});
    if(nv(y.mot)!==nv(x.mot))o.push({dni:d,campo:'mot',antes:nv(y.mot),despues:nv(x.mot)});
    if(!!y.alt!==!!x.alt)o.push({dni:d,campo:'alt',antes:!!y.alt,despues:!!x.alt})}
  return o.slice(0,50)}
/* quita los undefined (Firestore no los acepta) */
function trClean(rows){const o={};for(const[d,r]of Object.entries(rows||{})){const x={};for(const[k,v]of Object.entries(r||{}))if(v!==undefined)x[k]=v;o[d]=x}return o}
/** versión de lo que ve la oficina (para saber si otro usuario cambió el tareo): estado, obreros (vino/motivo/altura), bloques,
    fotos y, con cc, el cotejo vigente. No cuenta hist, by, ts ni lo calculado. */
function trSig(d,cc){d=d||{};const R={};for(const[k,r]of Object.entries(d.rows||{}))R[k]=[r&&r.as===true?1:r&&r.as===false?0:null,(r&&r.mot)||'',!!(r&&r.alt)];
  const o={st:d.st||'bor',rows:R,blq:(Array.isArray(d.blq)?d.blq:[]).map(b=>b?[b.id||'',b.pc||'',b.ini||'',b.fin||'',Array.isArray(b.dnis)?b.dnis:[]]:null),foto:Array.isArray(d.foto)?d.foto:[]};
  if(cc)o.cot=tCotDe(d);return trStr(o)}

/* ---------- estado de la revisión abierta ---------- */
/* id: tareo abierto · fir/gar: cotejo en edición (empieza con el vigente, tCotDe) · b: el cotejo tal como se abrió (para escribir
   solo lo que cambió) · sig: versión del tareo que se ve (trSig con cotejo) · dirty: hay cotejo sin guardar ·
   ed: corrección en curso (edSig: versión al abrir el editor) · visor de la foto (fi foto, z zoom, rot giro, fsig fotos dibujadas) ·
   ord: orden de la lista al abrir (para «anterior · siguiente») · op: bloques/historial abiertos · want: tareo a reabrir tras recargar */
const TR={id:'',fir:{},gar:{},b:{fir:{},gar:{}},sig:'',dirty:false,ed:null,edSig:'',fi:0,z:1,rot:0,busy:false,fsig:'',ord:[],op:{blq:true,hist:false},want:'',ro:null};
const trEdOk=()=>toReabOk();
const TR_CHG='Otro usuario cambió este tareo, vuelve a abrirlo.';
function trInit(t){const C=tCotDe(t);TR.fir={};TR.gar={};for(const[d,x]of Object.entries(C)){if(trHas(x,'fir'))TR.fir[d]=x.fir;if(x.gar)TR.gar[d]=x.gar}
  TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.sig=trSig(t,true);TR.dirty=false}
/** cambios del cotejo respecto de como se abrió: [[dni,'fir'|'gar']] */
function trCotCh(){const o=[];for(const f of['fir','gar']){const A=TR.b[f],B=TR[f];for(const d of new Set([...Object.keys(A),...Object.keys(B)]))if(A[d]!==B[d])o.push([d,f])}return o}
const trDirty=()=>{TR.dirty=trCotCh().length>0};
/** filas con el cotejo en edición aplicado */
function trRows(rows){const o={};for(const[d,r0]of Object.entries(rows||{})){const r={...r0};
  if(trHas(TR.fir,d))r.fir=TR.fir[d];else delete r.fir;if(TR.gar[d])r.gar=TR.gar[d];else delete r.gar;o[d]=r}return o}
/** resumen del cotejo guardado (hist.cam) */
function trCotCam(R,ch){let si=0;const no=[],qu=[],gar=[];const nm=d=>(R[d]&&R[d].ape)||d;
  for(const[d,f]of ch){if(f==='fir'){const v=TR.fir[d];if(v===true)si++;else if(v===false)no.push(nm(d));else qu.push(nm(d))}else gar.push(`${nm(d)} ${TR.gar[d]||'—'}`)}
  const o=[];if(si)o.push(`firmaron ${si}`);if(no.length)o.push(`no firmó: ${no.join(', ')}`);if(qu.length)o.push(`sin cotejar: ${qu.join(', ')}`);if(gar.length)o.push(`garita: ${gar.join(', ')}`);
  const s=o.join('; ');return s.length>400?s.slice(0,397)+'…':s}
/** escritura del cotejo sobre el documento actual: solo las entradas que cambió el asistente (rutas cot.<dni>.fir|gar), así no pisa
    lo que otro guardó en otras filas. Si el tareo aún no tiene `cot` (antiguo) o cambiaron las fotos, se escribe el cotejo entero
    (vigente + cambios) con cotFot = fotos actuales. → {up, cot (resultado), cotFot, n} */
function trCotUp(cur){const ch=trCotCh();const C=clone(tCotDe(cur));const up={};const cotFot=(Array.isArray(cur.foto)?cur.foto:[]).slice();
  if(!ch.length)return{up,cot:C,cotFot:cur.cotFot,n:0};
  const by=me.email||me.id||'',t=NOW();const full=!(cur.cot&&typeof cur.cot==='object')||!trSameSet(cur.cotFot,cur.foto);const FV=firebase.firestore.FieldValue;
  for(const[d,f]of ch){const v=f==='fir'?(trHas(TR.fir,d)?TR.fir[d]:undefined):(TR.gar[d]||undefined);const x=C[d]=C[d]||{};if(v===undefined)delete x[f];else x[f]=v;x.by=by;x.t=t;
    if(!full){up[`cot.${d}.${f}`]=v===undefined?FV.delete():v;up[`cot.${d}.by`]=by;up[`cot.${d}.t`]=t}}
  if(full){const o={};for(const[d,x]of Object.entries(C)){if(!trHas(x,'fir')&&!x.gar)continue;const y={};if(trHas(x,'fir'))y.fir=x.fir;if(x.gar)y.gar=x.gar;if(x.by)y.by=x.by;if(x.t)y.t=x.t;o[d]=y}
    up.cot=o;up.cotFot=cotFot}
  return{up,cot:C,cotFot:full?cotFot:cur.cotFot,n:ch.length}}
const trHist=(a,x)=>({t:NOW(),by:me.email||me.id||'',a,...x});
/* escritura con transacción: fn(doc actual) → objeto de update, o lanza un Error con el motivo para el usuario */
async function trTx(id,fn){const ref=fcol('tareo').doc(id);
  return(db||FDB).runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new Error('El tareo ya no existe.');const up=fn({...s.data(),id});tx.update(ref,up);return true})}
const trErr=(p,e)=>toast(p+(e&&(e.code?e.code:e.message)||''));
/** lo que agrega toda corrección de la oficina: un revisado vuelve a «Enviado» (decisión del dueño) y, si el tareo aún no tiene
    su jornada congelada (doc.cfg), se guarda la del día (tCfgDia, tareo.js) */
function trCorExtra(cur){const o={};const FV=firebase.firestore.FieldValue;
  if(cur.st==='rev')Object.assign(o,{st:'env',revAt:FV.delete(),revBy:FV.delete()});
  if(!cur.cfg&&typeof tCfgDia==='function'){const c=tCfgDia(cur.date);if(c)o.cfg=c}
  return o}

/* ---------- espacio de revisión (pantalla completa, «Revisión en laptop», docs/ia/tareo.md) ---------- */
/* #trWs: capa fija sobre toda la app, fuera de <main> (el render() de la app no la toca). Se dibuja por partes: el encabezado
   (#trHead) y el panel derecho (#trRight) con cada cambio; el visor de la foto (#trFoto) solo cuando cambian las fotos o la
   foto elegida (no se pierden el zoom ni la posición). TR.id = tareo abierto; sessionStorage 'lps.trws' {id, f} lo vuelve a
   abrir si se recarga la página. */
const TR_SS='lps.trws';
function trSsSet(v){try{if(v)sessionStorage.setItem(TR_SS,JSON.stringify(v));else sessionStorage.removeItem(TR_SS)}catch(e){}}
try{const s=JSON.parse(sessionStorage.getItem(TR_SS)||'null');if(s&&typeof s.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.f||'')){TD.f=s.f;TR.want=s.id}}catch(e){}
/* el mismo filtro que la lista de «Tareos del día» (renderTDia) */
const trFltOk=x=>!!x.t&&(TD.flt==='all'||!['rev','obs','ok'].includes(TD.flt)||(TD.flt==='rev'?x.t.st==='env':TD.flt==='obs'?x.s.obs.length>0:['rev','pub'].includes(x.t.st)));
const trOrdNow=()=>toList(TD.f).filter(trFltOk).map(x=>x.id);
/** vecino en el orden de la lista tal como estaba al abrir (dir −1 / +1); '' si no hay */
function trNb(dir){const L=TR.ord.filter(x=>x===TR.id||TD.docs.has(x));const i=L.indexOf(TR.id);if(i<0)return'';const j=i+dir;return j>=0&&j<L.length?L[j]:''}
const trCapOf=id=>{const x=TD.docs.get(id);return x?(x.capN||tCapName(x.cap)||x.cap||''):''};
/** abre la revisión (desde la lista: toma el orden de la lista; nav: viene de «anterior · siguiente») */
function toDetalle(id,nav){const t=TD.docs.get(id);if(!t)return;
  if(!nav||!TR.ord.length)TR.ord=trOrdNow();if(!TR.ord.includes(id))TR.ord.push(id);
  if(TR.id!==id){Object.assign(TR,{id,ed:null,fi:0,z:1,rot:0,busy:false,fsig:''});trInit(t)}
  trSsSet({id,f:t.date||TD.f});trDraw();toFotos(id,t.foto||[])}
/* al llegar datos: reabre la revisión tras recargar (TR.want) o refresca la abierta (sin pisar el cotejo o la corrección en curso) */
function trSync(){if(!TR.id){if(TR.want&&TD.ok){const w=TR.want;TR.want='';if(TD.docs.has(w)&&toAct())toDetalle(w);else trSsSet(null)}return}
  if(!$('#trWs'))return;const t=TD.docs.get(TR.id);if(!t){trClose();toast('Ese tareo ya no está en la lista del día.');return}
  if(!TR.dirty&&!TR.ed)trInit(t);trDraw()}
/* salir o cambiar de tareo con cambios sin guardar: pregunta */
async function trLeave(fn){if(TR.ed||TR.dirty){const ok=await uiAsk({title:'¿Salir sin guardar?',text:TR.ed?'Tienes una corrección sin guardar.':'Tienes cotejo de firmas sin guardar.',ok:'Salir sin guardar',cancel:'Seguir aquí',tone:'warn'});if(!ok)return}fn()}
function trClose(){const id=TR.id;const ws=$('#trWs');if(ws)ws.remove();document.body.classList.remove('tr-on');if(TR.ro){TR.ro.disconnect();TR.ro=null}
  Object.assign(TR,{id:'',ed:null,dirty:false,fsig:''});trSsSet(null);if(toAct())requestRender();
  setTimeout(()=>{const b=id&&document.querySelector(`#toBody button[data-to="${CSS.escape(id)}"]`);if(b)b.focus()},60)}
function trGo(dir){const n=trNb(dir);if(n)trLeave(()=>toDetalle(n,true))}
/* reemplaza el HTML de una parte sin perder el desplazamiento ni el campo con el foco */
function trPut(el,html){if(!el||el.__h===html)return;const st=el.scrollTop,ae=document.activeElement,aid=ae&&el.contains(ae)&&ae.id;el.innerHTML=html;el.__h=html;el.scrollTop=st;
  if(aid){const f=document.getElementById(aid);if(f)f.focus()}}
function trDraw(){const id=TR.id;const t=TD.docs.get(id);if(!t)return;let ws=$('#trWs');
  if(!ws){ws=document.createElement('div');ws.id='trWs';ws.className='tr-ws';ws.setAttribute('role','dialog');ws.setAttribute('aria-modal','true');ws.setAttribute('aria-label','Revisión del tareo');
    ws.innerHTML='<header class="tr-wh" id="trHead"></header><div class="tr-wb" id="trBody"><section class="tr-wf" id="trFoto" aria-label="Formato firmado"></section><div class="tr-wr" id="trRight"></div></div>';
    document.body.appendChild(ws);document.body.classList.add('tr-on');
    ws.addEventListener('click',e=>trClick(e,TR.id));ws.addEventListener('change',e=>trChange(e,TR.id));
    ws.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.trop)TR.op[d.dataset.trop]=d.open},true);
    ws.addEventListener('load',e=>{if(e.target&&e.target.id==='trImg')trView()},true);
    trPanInit(ws);if(window.ResizeObserver){TR.ro=new ResizeObserver(()=>trView());TR.ro.observe($('#trFoto'))}}
  const M=trModel(t);
  trPut($('#trHead'),trHeadHtml(t,M));
  const fs=(t.foto||[]).join('|')+'#'+TR.fi;
  if(TR.fsig!==fs||ws.dataset.id!==id){$('#trFoto').innerHTML=trFotoHtml(t);TR.fsig=fs;ws.dataset.id=id;const v=$('#trView');if(v){v.scrollTop=0;v.scrollLeft=0}}
  trPut($('#trRight'),TR.ed?trEdHtml(t):trRightHtml(t,M));
  trView()}
/* todo lo que muestran el encabezado y la tabla (con el cotejo en edición aplicado) */
function trModel(t){const ed=trEdOk();const cot=ed&&t.st==='env'&&!TR.ed;const dv={...t,rows:trRows(t.rows)};const c=tCalc(dv);const s=toStats(t);
  const ob=tObsRev(dv,c);const vis=ob.filter(o=>o.k!=='firp');const pend=ob.filter(o=>o.k==='firp').length;
  const R=Object.entries(c.rows).map(([dni,r])=>({...r,dni})).sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||a.dni.localeCompare(b.dni));
  const oDni=new Map();for(const o of vis)if(o.dni)oDni.set(o.dni,(oDni.get(o.dni)||[]).concat(o));
  return{ed,cot,c,s,ob,vis,pend,R,P:R.filter(r=>r.as),F:R.filter(r=>!r.as),oDni,blk:ob.filter(o=>o.bl),nofir:ob.filter(o=>o.k==='nofir'),pas:ed&&!TR.ed&&['env','rev'].includes(t.st)}}
/* etiqueta corta de cada observación en su fila (el texto completo va en el title y arriba en la lista) */
const TR_TAG={nofir:'No firmó',gar:'Garita',dup:'En otro tareo',marca:'Sin marcar',mot:'Sin motivo',sinh:'Sin horas',cruce:'Cruce',parcial:'Parcial',quien:'Sin bloque'};
function trHeadHtml(t,M){const s=M.s;const prev=trNb(-1),next=trNb(1);const L=TR.ord.filter(x=>x===t.id||TD.docs.has(x));const pos=L.indexOf(t.id);
  const kp=(v,l,c='')=>`<span class="tr-k${c}"><b>${v}</b> ${l}</span>`;const nObs=M.vis.length;
  const btn=[];if(M.ed){
    if(TR.ed)btn.push(`<button class="ib" data-tra="edx" id="trEdX">Cancelar</button>`,`<button class="ib pri" data-tra="edok" id="trEdOk">Guardar corrección</button>`);
    else if(t.st==='env'){if(TR.dirty)btn.push(`<button class="ib tr-sv" data-tra="save" id="trSave">Guardar cotejo</button>`);
      btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`,
        `<button class="ib pri" data-tra="rev" id="trRev"${M.blk.length?` disabled title="${esc(M.blk.map(o=>o.msg).join('\n'))}"`:''}>Marcar revisado${M.nofir.length?' (con observación)':''}</button>`)}
    else if(t.st==='rev')btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" data-tra="qrev" id="trQrev">Quitar revisado</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`)}
  return`<div class="tr-wh1"><button class="ib tr-back" data-trw="close" id="trBack" title="Volver a la lista (Esc)" aria-label="Volver a la lista">←<span class="tr-hl"> Tareos del día</span></button>
    <div class="tr-wt"><b class="tr-wn">Tareo de ${esc(t.capN||tCapName(t.cap))}</b><span class="note">${esc(toDia(t.date))}</span>${toChip(t)}${TR.ed?'<span class="tr-edt">Corrigiendo</span>':''}</div>
    <nav class="tr-nav" aria-label="Otros tareos del día"><button class="ib" data-trw="prev" id="trPrev"${prev?` title="Anterior: ${esc(trCapOf(prev))} (←)"`:' disabled'}>◀<span class="tr-hl"> Anterior</span></button><span class="note mono" id="trPos">${pos>=0&&L.length>1?`${pos+1} de ${L.length}`:''}</span><button class="ib" data-trw="next" id="trNext"${next?` title="Siguiente: ${esc(trCapOf(next))} (→)"`:' disabled'}><span class="tr-hl">Siguiente </span>▶</button></nav></div>
   <div class="tr-wh2"><div class="tr-kpis" id="trKpi">${kp(s.pres,s.pres===1?'presente':'presentes')}${kp(s.fal,s.fal===1?'falta':'faltas',s.fal?' tr-kb':'')}${kp(toH(s.hh),'HH')}${kp(toH(s.he),'HE',s.he?' tr-kw':'')}${s.alt?kp(s.alt,'en altura'):''}${kp(nObs,nObs===1?'observación':'observaciones',nObs?' tr-kw':' tr-kok')}</div>
   ${btn.length?`<div class="tr-acts">${btn.join('')}</div>`:''}</div>`}
/* visor: foto grande con zoom (botones, rueda), rotar y arrastrar */
function trFotoHtml(t){const fotos=t.foto||[];const fi=Math.min(TR.fi,Math.max(0,fotos.length-1));
  return`<div class="tr-vbar"><b>Formato firmado</b>${fotos.length>1?`<span class="tr-vbtn"><button class="ib" data-trv="prev" aria-label="Foto anterior">‹</button><span class="note">${fi+1} de ${fotos.length}</span><button class="ib" data-trv="next" aria-label="Foto siguiente">›</button></span>`:''}
    ${fotos.length?`<span class="tr-vbtn"><button class="ib" data-trv="zo" aria-label="Alejar" title="Alejar">−</button><span class="note mono tr-zl" id="trZl">100%</span><button class="ib" data-trv="zi" aria-label="Acercar" title="Acercar">+</button><button class="ib" data-trv="fitw" title="Ajustar al ancho">Ancho</button><button class="ib" data-trv="fit" title="Ver la hoja entera">Entera</button><button class="ib" data-trv="rot" aria-label="Rotar" title="Rotar 90°">⟳</button><button class="ib" data-trv="full" aria-label="Pantalla completa" title="Pantalla completa">⛶</button></span>`:''}</div>
   <div class="tr-view" id="trView">${fotos.length?`<div class="tr-pz" id="trPz"><img id="trImg" alt="Formato firmado" draggable="false"></div>`:'<span class="note tr-nof">Sin foto del formato.</span>'}</div>
   <div class="to-fotos tr-thumbs" id="toFotos"${fotos.length>1?'':' hidden'}>${fotos.map((fid,i)=>`<button class="to-ft${i===fi?' on':''}" data-tft="${esc(fid)}" data-i="${i}" aria-label="Ver foto ${i+1}">${TD.fotos.has(fid)?`<img src="${esc(TD.fotos.get(fid))}" alt="Formato firmado">`:'<span class="note">Cargando…</span>'}</button>`).join('')}</div>
   ${fotos.length?'<p class="note tr-vh">Arrastra para mover · rueda del mouse para acercar</p>':''}`}
/* tamaño del visor: con z = 1 la hoja ocupa el ancho del visor; girada 90° se mide su caja girada (así se desplaza bien) */
function trView(){const im=$('#trImg');if(!im)return;const t=TD.docs.get(TR.id);const fs=(t&&t.foto)||[];const fid=fs[Math.min(TR.fi,fs.length-1)];
  if(fid&&TD.fotos.has(fid)&&im.getAttribute('src')!==TD.fotos.get(fid))im.src=TD.fotos.get(fid);
  im.dataset.z=String(Math.round(TR.z*100)/100);im.dataset.rot=String(TR.rot);const zl=$('#trZl');if(zl)zl.textContent=Math.round(TR.z*100)+'%';
  const v=$('#trView'),pz=$('#trPz');const nw=im.naturalWidth,nh=im.naturalHeight;if(!v||!pz)return;
  if(!nw||!nh){pz.style.width='100%';pz.style.height='';im.style.cssText='position:static;width:100%';return}
  const side=TR.rot%180!==0,ar=nw/nh;const W=Math.max(40,v.clientWidth*TR.z);const H=side?W*ar:W/ar;
  pz.style.width=W+'px';pz.style.height=H+'px';im.style.cssText=`width:${side?H:W}px;transform:translate(-50%,-50%)${TR.rot?` rotate(${TR.rot}deg)`:''}`}
/* zoom manteniendo fijo el punto (cx, cy) del visor (por omisión, el centro) */
function trZoomTo(nz,cx,cy){nz=Math.max(0.25,Math.min(5,nz));const v=$('#trView'),pz=$('#trPz');if(!v||!pz){TR.z=nz;trView();return}
  if(cx==null){cx=v.clientWidth/2;cy=v.clientHeight/2}const px=v.scrollLeft+cx-pz.offsetLeft,py=v.scrollTop+cy-pz.offsetTop;const k=nz/TR.z;TR.z=nz;trView();
  v.scrollLeft=px*k+pz.offsetLeft-cx;v.scrollTop=py*k+pz.offsetTop-cy}
function trFitZ(){const v=$('#trView'),im=$('#trImg');if(!v||!im||!im.naturalWidth)return 1;const ar=im.naturalWidth/im.naturalHeight;const H1=TR.rot%180?v.clientWidth*ar:v.clientWidth/ar;return Math.max(0.25,Math.min(1,v.clientHeight/H1))}
/* arrastrar con el mouse (el dedo usa el desplazamiento propio del navegador) y rueda = zoom */
function trPanInit(ws){let P=null;
  ws.addEventListener('pointerdown',e=>{const v=e.target.closest&&e.target.closest('#trView');if(!v||e.pointerType!=='mouse'||e.button!==0||!$('#trImg'))return;
    P={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop,v};try{v.setPointerCapture(e.pointerId)}catch(err){}v.classList.add('drag');e.preventDefault()});
  ws.addEventListener('pointermove',e=>{if(!P)return;P.v.scrollLeft=P.l-(e.clientX-P.x);P.v.scrollTop=P.t-(e.clientY-P.y)});
  const end=()=>{if(P){P.v.classList.remove('drag');P=null}};ws.addEventListener('pointerup',end);ws.addEventListener('pointercancel',end);
  ws.addEventListener('wheel',e=>{const v=e.target.closest&&e.target.closest('#trView');if(!v||!$('#trImg'))return;e.preventDefault();const r=v.getBoundingClientRect();
    trZoomTo(TR.z*Math.pow(1.0015,-e.deltaY),e.clientX-r.left,e.clientY-r.top)},{passive:false})}
/* atajos: ← → otro tareo del día, Esc volver a la lista (no mientras se escribe en un campo o hay una ventana encima) */
document.addEventListener('keydown',e=>{if(!TR.id||!$('#trWs')||e.altKey||e.ctrlKey||e.metaKey)return;
  const z=$('.to-zoom');if(z){if(e.key==='Escape')z.remove();return}if($('.uask')||$('#lqm'))return;
  const tg=e.target;if(tg&&(/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)||tg.isContentEditable)){if(e.key==='Escape')tg.blur();return}
  if(e.key==='ArrowLeft'){e.preventDefault();trGo(-1)}else if(e.key==='ArrowRight'){e.preventDefault();trGo(1)}else if(e.key==='Escape'){e.preventDefault();trLeave(trClose)}});

/* panel derecho: avisos, tabla obreros × partidas con el cotejo y, plegables, bloques e historial */
function trRightHtml(t,M){const{c,cot,P,F,oDni,pend,vis}=M;const s=M.s;
  const pcL=pc=>{const p=S.tpc.get(pc);return p?{cod:p.cod,nom:p.nom}:{cod:pc,nom:'(partida no encontrada)'}};
  const pcs=[...new Set([...(t.blq||[]).map(b=>b&&b.pc),...Object.values(c.rows).flatMap(r=>Object.keys(r.h||{}))].filter(Boolean))].sort((a,b)=>tCmpCod(pcL(a).cod,pcL(b).cod));
  const tot={};for(const r of P)for(const[pc,v]of Object.entries(r.h||{}))tot[pc]=tR2((tot[pc]||0)+v);
  const rn=dni=>{const r=c.rows[dni];return r?(r.ape||dni):dni};
  const hist=(Array.isArray(t.hist)?t.hist:[]).slice().sort((a,b)=>(a.t||0)-(b.t||0));
  const nCot=P.filter(r=>r.fir===true||r.fir===false).length;
  const firCell=r=>{if(cot)return`<span class="seg tr-fir"><button data-tra="fir" data-v="1" class="${r.fir===true?'on':''}" aria-pressed="${r.fir===true}">Sí</button><button data-tra="fir" data-v="0" class="${r.fir===false?'on':''}" aria-pressed="${r.fir===false}">No</button></span>`;
    return r.fir===true?'<span class="tr-si">Sí</span>':r.fir===false?'<span class="tr-no">No firmó</span>':'<span class="note">—</span>'};
  const garCell=r=>cot?`<input class="tin tr-gar" type="time" step="60" id="trg_${esc(r.dni)}" data-trg="${esc(r.dni)}" value="${esc(r.gar||'')}" aria-label="Salida en garita">`:`<span class="mono">${esc(r.gar||'')}</span>`;
  const tags=d=>(oDni.get(d)||[]).map(o=>`<span class="tr-tg${o.bl?' tr-tgb':''}" data-k="${esc(o.k)}" title="${esc(o.msg)}">${esc(TR_TAG[o.k]||'Revisar')}</span>`).join('');
  const pas=d=>M.pas?`<button class="ib tr-pas" data-tra="pas" data-v="${esc(d)}" title="Pasar a otro capataz…" aria-label="Pasar a otro capataz">⇄</button>`:'';
  const obc=d=>`<td class="tr-tgs"><div class="tr-oc"><span>${tags(d)}</span>${pas(d)}</div></td>`;
  const who=r=>`<td class="tr-nmc"><b>${esc(r.ape||r.dni)}</b> <small class="note">${esc(r.nom||'')} · <span class="mono">${esc(r.dni)}</span></small></td><td>${esc(r.cat||'')}</td>`;
  const ncol=pcs.length+8;
  const body=P.map(r=>{const k=(oDni.get(r.dni)||[]).map(o=>o.k);return`<tr data-trd="${esc(r.dni)}" data-dni="${esc(r.dni)}" class="${k.includes('nofir')?'tr-bad':''}${k.includes('gar')?' tr-wgar':''}">${who(r)}
      ${pcs.map(pc=>`<td class="mono t-r">${r.h&&r.h[pc]?toH(r.h[pc]):''}</td>`).join('')}<td class="mono t-r tr-tot"><b>${toH(r.trab)}</b>${r.ini?`<small>${esc(r.ini)}–${esc(r.fin)}</small>`:''}</td><td class="mono t-r">${r.ext?toH(r.ext):''}</td><td>${r.alt?'(A)':''}</td>
      <td>${firCell(r)}</td><td class="tr-gc">${garCell(r)}</td>${obc(r.dni)}</tr>`}).join('')
    +F.map(r=>`<tr class="tr-frow" data-dni="${esc(r.dni)}">${who(r)}<td colspan="${pcs.length+3}" class="tr-fx">${r.as===false?`Faltó · <b>${esc(r.mot||'sin motivo')}</b>${r.mot&&TO_MOT[r.mot]?' '+esc(TO_MOT[r.mot]):''}`:'<i>Sin marcar si vino</i>'}</td><td></td><td></td>${obc(r.dni)}</tr>`).join('')
    ||`<tr><td colspan="${ncol}" class="note">No hay obreros en este tareo.</td></tr>`;
  const blq=t.blq||[];
  return`${t.st==='reab'&&t.reab?`<div class="callout t-warn">Reabierto por ${esc(toWho(t.reab.by))} a las ${esc(tHm(t.reab.t))}: ${esc(t.reab.mot||'')}</div>`:''}
   ${t.st==='rev'&&t.revBy?`<div class="callout tr-okc">Revisado por ${esc(toWho(t.revBy))}${t.revAt?' a las '+esc(tHm(t.revAt)):''}.</div>`:''}
   ${tCotVieja(t)?`<div class="callout t-warn" id="trCotV">El capataz cambió las fotos después del cotejo: vuelve a cotejar las firmas con el formato nuevo.</div>`:''}
   ${vis.length?`<div class="callout t-warn to-obs" id="trObs"><b>${vis.length} ${vis.length===1?'observación':'observaciones'}</b><ul>${vis.map(o=>`<li data-k="${esc(o.k)}"${o.bl?' class="tr-obl"':''}>${esc(o.msg)}</li>`).join('')}</ul></div>`:''}
   <section class="card tr-mtc"><div class="tr-vbar"><b>Obreros y horas por partida</b><span class="note" id="trCotN">${nCot} de ${P.length} cotejados</span>${cot&&pend?`<span class="note tr-pend">Falta cotejar ${pend} ${pend===1?'firma':'firmas'}.</span>`:''}${cot&&P.length?`<button class="ib" data-tra="all" id="trAll">Todos firmaron</button>`:''}</div>
    <div class="tr-mtw"><table class="t tr-mt"><thead><tr><th>Obrero</th><th>Cat.</th>${pcs.map(pc=>{const p=pcL(pc);return`<th class="t-r" title="${esc(p.nom)}">${esc(p.cod)}</th>`}).join('')}<th class="t-r" title="Horas trabajadas y horario">Total</th><th class="t-r" title="Horas extra">HE</th><th title="Trabajo en altura (bono)">A</th><th>Firmó</th><th title="Hora de salida en garita (opcional)">Garita</th><th title="Observaciones${M.pas?' · ⇄ pasar a otro capataz':''}">Obs.</th></tr></thead>
     <tbody>${body}</tbody>
     ${P.length?`<tfoot><tr><td colspan="2"><b>Total</b></td>${pcs.map(pc=>`<td class="mono t-r"><b>${toH(tot[pc])}</b></td>`).join('')}<td class="mono t-r"><b>${toH(s.hh)}</b></td><td class="mono t-r"><b>${toH(s.he)}</b></td><td colspan="4"></td></tr></tfoot>`:''}</table></div></section>
   <details class="card tr-dt" id="trBlqD" data-trop="blq"${TR.op.blq?' open':''}><summary><b>Bloques</b> <span class="note">${blq.length}</span></summary>
    ${blq.length?`<ul class="t-list to-blq">${blq.map(b=>{b=b||{};const p=b.pc?pcL(b.pc):null;const n=Array.isArray(b.dnis)?b.dnis:[];
     return`<li><span class="mono">${esc(b.ini||'?')}–${esc(b.fin||'?')}</span> · ${p?`<b class="mono">${esc(p.cod)}</b> ${esc(p.nom)}`:'<i>sin partida</i>'} · ${n.length} ${n.length===1?'obrero':'obreros'}${tBlqOk(b)?` · ${toH(tBlqH(t.date,b.ini,b.fin,t.cfg||undefined))} h`:''}<div class="t-chg">${n.map(d=>esc(rn(d))).join(', ')}</div></li>`}).join('')}</ul>`:'<p class="note">Sin bloques.</p>'}</details>
   <details class="card tr-dt" id="trHistD" data-trop="hist"${TR.op.hist?' open':''}><summary><b>Historial</b> <span class="note">${hist.length}</span></summary>
    ${hist.length?`<ul class="t-list to-hist" id="trHist">${hist.map(x=>`<li data-a="${esc(x.a||'')}"><span class="mono">${esc(fmtD(ldt(x.t||0)))} ${esc(tHm(x.t))}</span> · <b>${esc(TO_HA[x.a]||x.a||'')}</b> · ${esc(toWho(x.by))}${x.mot?': '+esc(x.mot):''}${x.cam?`<div class="t-chg">${esc(x.cam)}</div>`:''}</li>`).join('')}</ul>`:'<p class="note">Sin movimientos.</p>'}</details>`}

function trClick(e,id){const w=e.target.closest('[data-trw]');if(w&&!w.disabled){const a=w.dataset.trw;if(a==='close')trLeave(trClose);else trGo(a==='next'?1:-1);return}
  const v=e.target.closest('[data-trv]');if(v){const t=TD.docs.get(id);const n=(t&&t.foto||[]).length;const a=v.dataset.trv;
    if(a==='zi')trZoomTo(TR.z+0.5);else if(a==='zo')trZoomTo(TR.z-0.5);else if(a==='fitw')trZoomTo(1);else if(a==='fit')trZoomTo(trFitZ());
    else if(a==='rot'){TR.rot=(TR.rot+90)%360;trView()}
    else if(a==='full'){const fid=n&&t.foto[Math.min(TR.fi,n-1)];if(fid)toZoom(fid)}
    else if(n){TR.fi=(TR.fi+(a==='next'?1:-1)+n)%n;TR.z=1;TR.rot=0;trDraw()}return}
  const f=e.target.closest('[data-tft]');if(f){const i=+f.dataset.i||0;if(i!==TR.fi){TR.fi=i;TR.z=1;TR.rot=0;trDraw()}return}
  const b=e.target.closest('[data-tra]');if(!b||b.disabled)return;const a=b.dataset.tra;
  if(a==='fir'){const tr=b.closest('[data-trd]');if(!tr)return;const d=tr.dataset.trd;const val=b.dataset.v==='1';
    if(TR.fir[d]===val)delete TR.fir[d];else TR.fir[d]=val;trDirty();trDraw();return}
  if(a==='all'){const t=TD.docs.get(id);for(const[d,r]of Object.entries(t.rows||{}))if(r&&r.as)TR.fir[d]=true;trDirty();trDraw();return}
  if(a==='save')return trSaveCot(id);
  if(a==='rev')return trRevisar(id);
  if(a==='qrev')return trQuitarRev(id);
  if(a==='reab')return toReabrir(id);
  if(a==='pas')return trPasarDlg(id,b.dataset.v);
  if(a==='cor'){const t=TD.docs.get(id);TR.edSig=trSig(t,false);TR.ed={blq:JSON.parse(JSON.stringify(Array.isArray(t.blq)?t.blq:[])).map(x=>({id:x.id||trBid(),pc:x.pc||'',ini:x.ini||'',fin:x.fin||'',dnis:Array.isArray(x.dnis)?x.dnis:[]})),
    rows:Object.fromEntries(Object.entries(t.rows||{}).map(([d,r])=>[d,{as:trAs(r.as),mot:r.mot||'',alt:!!r.alt}]))};trDraw();return}
  if(TR.ed)return trEdClick(a,b,id)}
function trChange(e,id){const g=e.target.closest('[data-trg]');if(g){const v=/^\d{2}:\d{2}/.test(g.value)?g.value.slice(0,5):'';if(v)TR.gar[g.dataset.trg]=v;else delete TR.gar[g.dataset.trg];trDirty();trDraw();return}
  if(TR.ed)trEdChange(e)}

/* guardar cotejo (firmas y garita): solo lo que cambió el asistente */
async function trSaveCot(id){if(!trEdOk()||TR.busy)return;TR.busy=true;let sig='';
  try{await trTx(id,cur=>{if(cur.st!=='env')throw new Error('El tareo cambió de estado.');const{up,cot,cotFot,n}=trCotUp(cur);if(!n)throw new Error('No cambiaste nada.');
      sig=trSig({...cur,cot,cotFot:cotFot||cur.foto},true);const cam=trCotCam(cur.rows||{},trCotCh());
      return{...up,hist:firebase.firestore.FieldValue.arrayUnion(trHist('fir',cam?{cam}:{})),by:me.email||'',ts:NOW()}});
    TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.dirty=false;if(sig&&TR.id===id)TR.sig=sig;toast('Cotejo guardado.')}
  catch(err){trErr('No se pudo guardar: ',err)}finally{TR.busy=false;trSync()}}
/* marcar revisado: dentro de la transacción vuelve a revisar el documento actual (con el cotejo en edición aplicado) y los
   conflictos del día; no marca si hay observaciones que bloquean o si otro usuario cambió el tareo desde que se abrió.
   Si alguien no firmó, con confirmación (queda en el historial). */
async function trRevisar(id){const t=TD.docs.get(id);if(!t||t.st!=='env'||!trEdOk()||TR.busy)return;
  const dv={...t,rows:trRows(t.rows)};const ob=tObsRev(dv);const blk=ob.filter(o=>o.bl);
  if(blk.length){toast(blk[0].msg);return}
  const nof=ob.filter(o=>o.k==='nofir'),gar=ob.filter(o=>o.k==='gar'),wn=ob.filter(o=>!o.bl&&!['nofir','gar','firp'].includes(o.k));
  if(nof.length&&!await uiAsk({title:'¿Marcar revisado con observaciones?',text:`${nof.length===1?'Un obrero vino pero no firmó':nof.length+' obreros vinieron pero no firmaron'} el formato. Quedará anotado en el historial.`,list:nof.map(o=>o.msg),ok:'Marcar revisado',tone:'warn'}))return;
  const obs=[...nof,...gar,...wn].map(o=>o.msg).join(' ');const sig0=TR.sig;TR.busy=true;
  try{await trTx(id,cur=>{if(cur.st!=='env')throw new Error('El tareo cambió de estado.');if(trSig(cur,true)!==sig0)throw new Error(TR_CHG);
      const{up,cot}=trCotUp(cur);const after=tConCot({...cur,cotFot:cur.foto},cot);
      const docs=[...TD.docs.values()].filter(x=>x.id!==id).concat([after]);const bl=tObsRev(after,undefined,docs).filter(o=>o.bl);
      if(bl.length)throw new Error(bl[0].msg);
      const cam=[trCotCam(cur.rows||{},trCotCh()),obs?'Observaciones: '+obs:''].filter(Boolean).join(' · ');const t2=NOW();
      return{...up,st:'rev',revAt:t2,revBy:me.email||'',hist:firebase.firestore.FieldValue.arrayUnion(trHist('rev',cam?{cam:cam.length>400?cam.slice(0,397)+'…':cam}:{})),by:me.email||'',ts:t2}});
    TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.dirty=false;toast('Tareo revisado ✓')}
  catch(err){trErr('No se pudo marcar revisado: ',err)}finally{TR.busy=false;trSync()}}
async function trQuitarRev(id){const t=TD.docs.get(id);if(!t||t.st!=='rev'||!trEdOk())return;
  const mot=await uiAsk({title:'¿Quitar «revisado»?',text:'El tareo vuelve a «Enviado» para revisarlo de nuevo.',input:{label:'Motivo',required:true},ok:'Quitar revisado',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  try{await trTx(id,cur=>{if(cur.st!=='rev')throw new Error('El tareo cambió de estado.');
      return{st:'env',revAt:firebase.firestore.FieldValue.delete(),revBy:firebase.firestore.FieldValue.delete(),hist:firebase.firestore.FieldValue.arrayUnion(trHist('qrev',{mot:m})),by:me.email||'',ts:NOW()}});
    toast('El tareo volvió a «Enviado».')}
  catch(err){trErr('No se pudo cambiar: ',err)}finally{trSync()}}
/* reabrir al capataz: desde «Enviado» o «Revisado» (siempre con motivo). Las firmas cotejadas se borran (al reenviar se cotejan
   de nuevo con el formato que mande); la hora de garita se conserva en `cot` (no depende de la foto). En un tareo antiguo
   (cotejo en rows) se pasa la garita a `cot` y se quitan fir/gar de las filas. */
async function toReabrir(id){const t=TD.docs.get(id);if(!t||!['env','rev'].includes(t.st)||!toReabOk())return;const name=t.capN||tCapName(t.cap);
  const mot=await uiAsk({title:'¿Reabrir el tareo al capataz?',text:`${name} podrá corregirlo y volver a enviarlo. Verá el motivo que escribas.${t.st==='rev'?' Se quita la marca de revisado.':''} Las firmas se cotejan de nuevo cuando lo reenvíe.`,input:{label:'Motivo',required:true},ok:'Reabrir',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  const r={t:NOW(),by:me.email||me.id||'',mot:m};const FV=firebase.firestore.FieldValue;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado: ya no se puede reabrir.');
      const up={st:'reab',reab:r,hist:FV.arrayUnion({...r,a:'reab'}),by:r.by,ts:r.t};const C=tCotDe(cur);const old=cur.cot&&typeof cur.cot==='object'?cur.cot:{};const G={};
      for(const[d,x]of Object.entries(C))if(x.gar){const o=old[d]||{};G[d]={gar:x.gar,...(o.by?{by:o.by}:{}),...(o.t?{t:o.t}:{})}}
      if(Object.keys(G).length)up.cot=G;else if('cot'in cur)up.cot=FV.delete();if('cotFot'in cur)up.cotFot=FV.delete();
      if(cur.revAt!=null)up.revAt=FV.delete();if(cur.revBy!=null)up.revBy=FV.delete();
      const R=cur.rows||{};if(Object.values(R).some(x=>x&&('fir'in x||'gar'in x)))up.rows=Object.fromEntries(Object.entries(R).map(([d,x])=>{const y={...x};delete y.fir;delete y.gar;return[d,y]}));
      return up});
    toast(`Tareo reabierto: ${name} ya puede corregirlo.`)}
  catch(err){trErr('No se pudo reabrir: ',err)}finally{trSync()}}

/* ---------- corrección directa (editor para PC) ---------- */
const trBid=()=>'b'+Math.random().toString(36).slice(2,9);
/* vino: true · no vino: false · sin marcar: null (tValida lo pide) */
const trAs=v=>v===true?true:v===false?false:null;
/* el que no vino conserva sus bloques (tCalc le da 0 h): si vuelve a «vino», recupera sus horas. Las filas no llevan el cotejo
   (está en `cot`; un tareo antiguo conserva sus rows.fir/gar tal cual) */
function trEdDoc(t,e=TR.ed){const rows={};for(const[d,r]of Object.entries(t.rows||{})){const x=e.rows[d]||{};const as=trAs(x.as);rows[d]={...r,as,mot:as===false?(x.mot||''):'',alt:as===true?!!x.alt:false}}
  return{...t,rows,blq:e.blq.map(b=>({id:b.id,pc:b.pc,ini:b.ini,fin:b.fin,dnis:b.dnis.slice()}))}}
function trEdHtml(t){const e=TR.ed;const nd=trEdDoc(t);const c=tCalc(nd);const E=tValida(nd).filter(o=>!o.warn),W=tValida(nd).filter(o=>o.warn);
  const R=Object.entries(t.rows||{}).sort((a,b)=>(a[1].ape||'').localeCompare(b[1].ape||'')||a[0].localeCompare(b[0]));
  const pres=R.filter(([d])=>e.rows[d]&&e.rows[d].as);
  const pcs=[...S.tpc.values()].filter(x=>x&&!x.arch&&x.act!==false).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const pcOpt=cur=>{const L=pcs.slice();if(cur&&!L.some(x=>x.id===cur)){const x=S.tpc.get(cur);L.unshift({id:cur,cod:x?x.cod:cur,nom:x?x.nom+' (inactiva)':'(partida no encontrada)'})}
    return`<option value=""${cur?'':' selected'}>Elige la partida</option>`+L.map(x=>`<option value="${esc(x.id)}"${x.id===cur?' selected':''}>${esc(x.cod)} · ${esc(x.nom)}</option>`).join('')};
  const short=d=>{const r=t.rows[d]||{};return(r.ape||d).split(' ')[0]};
  return`<div class="callout tr-edc"><b>Corregir el tareo</b><span>Cambia lo necesario mirando la foto. «Guardar corrección» (arriba) recalcula las horas, pide el motivo y lo deja en el historial.${t.st==='rev'?' El tareo vuelve a «Enviado» para revisarlo de nuevo.':''}</span></div>
   <b class="t-h3">Bloques</b>
   <div class="tscroll"><table class="t tr-et"><thead><tr><th>Partida</th><th>Desde</th><th>Hasta</th><th class="t-r">Horas</th><th>Quiénes</th><th></th></tr></thead><tbody>
   ${e.blq.map((b,i)=>{const on=new Set(b.dnis);return`<tr data-tri="${i}"><td><select class="tin tr-pc" id="tre_pc_${i}" data-tre="pc" aria-label="Partida">${pcOpt(b.pc)}</select></td>
     <td><input class="tin" type="time" step="300" id="tre_ini_${i}" data-tre="ini" value="${esc(b.ini)}" aria-label="Desde"></td><td><input class="tin" type="time" step="300" id="tre_fin_${i}" data-tre="fin" value="${esc(b.fin)}" aria-label="Hasta"></td>
     <td class="mono t-r">${tBlqOk(b)?toH(tBlqH(t.date,b.ini,b.fin,t.cfg||undefined)):''}</td>
     <td><div class="tr-chips">${pres.map(([d])=>`<button class="chip${on.has(d)?' on':''}" data-tra="who" data-v="${esc(d)}" aria-pressed="${on.has(d)}">${esc(short(d))}</button>`).join('')}<button class="chip tr-cha" data-tra="wall">${pres.every(([d])=>on.has(d))&&pres.length?'Ninguno':'Todos'}</button></div></td>
     <td><button class="ib" data-tra="bdel" aria-label="Quitar bloque">Quitar</button></td></tr>`}).join('')||'<tr><td colspan="6" class="note">Sin bloques.</td></tr>'}
   </tbody></table></div>
   <div><button class="ib" data-tra="badd" id="trBadd">+ Agregar bloque</button></div>
   <b class="t-h3">Obreros</b>
   <div class="tscroll"><table class="t tr-eo"><thead><tr><th>Obrero</th><th>Vino</th><th>Motivo si faltó</th><th>Altura</th><th class="t-r">Horas</th><th class="t-r">HE</th></tr></thead><tbody>
   ${R.map(([d,r])=>{const x=e.rows[d]||{};const cr=c.rows[d]||{};return`<tr data-tro="${esc(d)}"><td><b>${esc(r.ape||d)}</b> <small class="note">${esc(r.nom||'')} · ${esc(d)}</small></td>
     <td><input type="checkbox" id="tre_as_${esc(d)}" data-tre="as"${x.as?' checked':''} aria-label="Vino"></td>
     <td>${x.as===true?'':x.as!==false?'<span class="note">Sin marcar</span>':`<select class="tin" id="tre_mot_${esc(d)}" data-tre="mot" aria-label="Motivo"><option value="">Elige</option>${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${x.mot===k?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select>`}</td>
     <td>${x.as?`<input type="checkbox" id="tre_alt_${esc(d)}" data-tre="alt"${x.alt?' checked':''} aria-label="Altura">`:''}</td>
     <td class="mono t-r">${x.as?toH(cr.trab):''}</td><td class="mono t-r">${x.as&&cr.ext?toH(cr.ext):''}</td></tr>`}).join('')}
   </tbody></table></div>
   ${E.length?`<div class="callout t-warn to-obs" id="trEdObs"><b>${E.length} ${E.length===1?'problema':'problemas'}</b><ul>${E.map(o=>`<li class="tr-obl">${esc(o.msg)}</li>`).join('')}</ul></div>`:''}
   ${W.length?`<div class="callout t-warn to-obs" id="trEdWarn"><b>${W.length} ${W.length===1?'aviso':'avisos'}</b> <span class="note">(no impiden revisar)</span><ul>${W.map(o=>`<li>${esc(o.msg)}</li>`).join('')}</ul></div>`:''}`}
function trEdClick(a,b,id){const e=TR.ed;const t=TD.docs.get(id);const i=+((b.closest('[data-tri]')||{}).dataset||{}).tri;
  if(a==='edx'){TR.ed=null;if(!TR.dirty)trInit(t);trDraw();return}
  if(a==='badd'){const j=TC().jor[String(pd(t.date).getUTCDay())]||TC().jor['1']||{ini:'07:30',fin:'17:00'};
    e.blq.push({id:trBid(),pc:'',ini:j.ini,fin:j.fin,dnis:Object.keys(e.rows).filter(d=>e.rows[d].as)});trDraw();return}
  if(a==='bdel'&&e.blq[i]){e.blq.splice(i,1);trDraw();return}
  if(a==='who'&&e.blq[i]){const d=b.dataset.v;const L=e.blq[i].dnis;e.blq[i].dnis=L.includes(d)?L.filter(x=>x!==d):[...L,d];trDraw();return}
  if(a==='wall'&&e.blq[i]){const p=Object.keys(e.rows).filter(d=>e.rows[d].as);const L=e.blq[i].dnis;const fu=L.filter(d=>!p.includes(d));e.blq[i].dnis=(L.filter(d=>p.includes(d)).length===p.length?[]:p).concat(fu);trDraw();return}
  if(a==='edok')return trEdSave(id)}
function trEdChange(ev){const el=ev.target.closest('[data-tre]');if(!el)return;const e=TR.ed;const k=el.dataset.tre;
  const bi=el.closest('[data-tri]'),ro=el.closest('[data-tro]');
  if(bi){const b=e.blq[+bi.dataset.tri];if(!b)return;if(k==='pc')b.pc=el.value;else if(k==='ini'||k==='fin')b[k]=el.value?el.value.slice(0,5):''}
  else if(ro){const d=ro.dataset.tro;const x=e.rows[d];if(!x)return;
    if(k==='as'){x.as=el.checked;if(x.as)x.mot='';else x.alt=false}
    else if(k==='mot')x.mot=el.value;else if(k==='alt')x.alt=el.checked}
  trDraw()}
async function trEdSave(id){const t=TD.docs.get(id);if(!t||!TR.ed||!['env','rev'].includes(t.st)||!trEdOk()||TR.busy)return;
  if(trSig(t,false)!==TR.edSig){toast(TR_CHG);return}
  const nd=trEdDoc(t);const cam=tCam(t,nd);if(!cam){toast('No cambiaste nada.');return}
  const E=tValida(nd).filter(o=>!o.warn);
  if(E.length&&!await uiAsk({title:'La corrección deja problemas',text:'¿Guardar igual? No se podrá marcar revisado hasta resolverlos.',list:E.map(o=>o.msg),ok:'Guardar igual',tone:'warn'}))return;
  const mot=await uiAsk({title:'Motivo de la corrección',text:`Cambios: ${cam}${t.st==='rev'?' · El tareo vuelve a «Enviado».':''}`,input:{label:'Motivo',required:true},ok:'Guardar corrección',tone:'info'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;TR.busy=true;const ed=TR.ed,sig0=TR.edSig;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');if(trSig(cur,false)!==sig0)throw new Error(TR_CHG);
      const n2=trEdDoc(cur,ed);const c=tCalc(n2);const x=trCorExtra(cur);
      const h=trHist('cor',{mot:m,cam:(cur.st==='rev'?'Quita revisado. ':'')+(tCam(cur,n2)||cam),det:tDet(cur,n2)});
      return{rows:trClean(c.rows),blq:n2.blq,...x,hist:firebase.firestore.FieldValue.arrayUnion(h),by:me.email||'',ts:NOW()}});
    TR.ed=null;toast(t.st==='rev'?'Corrección guardada: el tareo volvió a «Enviado».':'Corrección guardada.')}
  catch(err){trErr('No se pudo guardar la corrección: ',err)}finally{TR.busy=false;trSync()}}

/* ---------- «Sin tareo»: registrar falta en el tareo enviado de su capataz ---------- */
/* Solo si ese tareo está «Enviado» o «Revisado» (la oficina es dueña del documento). Si el capataz no tiene tareo o lo está
   llenando (borrador/reabierto) no se escribe: su celular guarda el documento entero y pisaría la falta. Ahí: «Copiar lista». */
function trFaltaOk(f,cap){const t=cap&&TD.docs.get(f+'_'+cap);return!!(t&&!t.arch&&['env','rev'].includes(t.st)&&toReabOk())}
function trFalta(dni){const p=S.tper.get(dni);const f=TD.f;if(!p||!trFaltaOk(f,p.cap))return;const tid=f+'_'+p.cap;const t=TD.docs.get(tid);
  lqModal(`<div class="lqtop"><b>Registrar falta</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">${esc(tName(p))} <span class="mono note">${esc(p.dni||dni)}</span> se agrega como ausente al tareo de <b>${esc(t.capN||tCapName(p.cap))}</b> del ${esc(fmtD(f))}.</p>
   <label>Motivo de la ausencia<select id="trFm">${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${k==='FA'?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select></label>
   <label>Comentario (queda en el historial)<input id="trFt" type="text" maxlength="200" placeholder="Ej. RR.HH. confirma descanso médico"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trFok">Registrar falta</button></div>`,
   async e=>{if(!e.target.closest('#trFok'))return;const mot=$('#trFm').value,txt=($('#trFt').value||'').trim();if(!txt){toast('Escribe el comentario.');$('#trFt').focus();return}
     lqClose();const row={ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as:false,mot,alt:false,ini:'',fin:'',h:{},trab:0,ext:0};
     try{await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo del capataz cambió de estado.');if(cur.rows&&cur.rows[dni])throw new Error('Ya figura en ese tareo.');
         const otro=[...TD.docs.values()].find(x=>x.id!==tid&&!x.arch&&x.rows&&x.rows[dni]);if(otro)throw new Error(`Ya figura en el tareo de ${otro.capN||tCapName(otro.cap)}.`);
         const x=trCorExtra(cur);
         return{[`rows.${dni}`]:row,...x,hist:firebase.firestore.FieldValue.arrayUnion(trHist('cor',{mot:txt,cam:`${cur.st==='rev'?'Quita revisado. ':''}Falta registrada desde «Sin tareo»: ${p.ape||dni} (${mot})`,det:[{dni,campo:'fila',antes:false,despues:true},{dni,campo:'as',antes:null,despues:false},{dni,campo:'mot',antes:null,despues:mot}]})),by:me.email||'',ts:NOW()}});
       toast('Falta registrada.')}
     catch(err){trErr('No se pudo registrar: ',err)}})}
function trSinTxt(f,G){return`Obreros sin tareo · ${fmtD(f)}\n`+G.map(g=>`${g.name}\n`+g.L.map(p=>`  ${tName(p)} — DNI ${p.dni||p.id}${p.cua?' — '+p.cua:''}`).join('\n')).join('\n')}
function trCopy(txt){(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Lista copiada.')).catch(()=>{
  lqModal(`<div class="lqtop"><b>Copia la lista</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><textarea class="tr-copy" rows="12" readonly>${esc(txt)}</textarea>`);const ta=$('#lqm textarea');if(ta)ta.select()})}

/* ---------- secciones de «Tareos del día» (oficina) ---------- */
function trSecciones(f,L){const docs=[...TD.docs.values()];const ed=toReabOk();let h='';
  const cf=tConflictosDia(docs);
  if(cf.length)h+=`<div class="callout tr-conf" id="trConf"><b>${cf.length} ${cf.length===1?'obrero figura':'obreros figuran'} en dos tareos del día</b><span>Un obrero va en un solo tareo por día: quítalo del que no corresponde. Hasta resolverlo no se pueden marcar revisados.</span>
    <ul>${cf.map(x=>`<li data-dni="${esc(x.dni)}"><b>${esc(x.nom)}</b> <span class="mono note">${esc(x.dni)}</span><ul>${x.ts.map(y=>{const can=ed&&['env','rev'].includes(y.st);
      return`<li data-trqt="${esc(y.id)}">${esc(y.name)} · ${esc(trAsTx(y))} · <span class="note">${esc((TO_ST[y.st]||[y.st])[0])}</span>${can?` <button class="ib tr-fbtn" data-trq="${esc(y.id)}" data-dni="${esc(x.dni)}">Quitar de este tareo</button>`:ed?' <span class="note">(lo quita el capataz: aún no lo envía)</span>':''}</li>`}).join('')}</ul></li>`).join('')}</ul></div>`;
  if(tLate(f)){const late=L.filter(x=>!x.t||['bor','reab'].includes(x.t.st));
    if(late.length)h+=`<div class="callout t-warn tr-late" id="trLate"><b>${late.length} ${late.length===1?'capataz no envió':'capataces no enviaron'} su tareo a las ${esc(TC().limEnv)}</b><span>${late.map(x=>esc(x.name)).join(' · ')}</span></div>`}
  if(!tNoLab(f)){const G=tSinTareo(f,docs);const n=G.reduce((s,g)=>s+g.L.length,0);
    if(n){TD.sinTxt=trSinTxt(f,G);
      const op=(k,d)=>{const v=(TD.dOpen||{})[k];return(v==null?d:v)?' open':''};
      h+=`<details class="card tr-sin" id="trSin" data-tk="sin"${op('sin',true)}><summary><b>Sin tareo</b> <span class="to-obsn">${n}</span> <span class="note">Activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta)</span></summary>
       <div class="pad"><div class="tr-sbar"><button class="ib" id="trCopy">Copiar lista</button>${ed?'<span class="note">«Registrar falta» lo agrega como ausente al tareo enviado de su capataz. Si el capataz aún no envía, avísale.</span>':''}</div>
       ${G.map(g=>{const t=g.cap&&TD.docs.get(f+'_'+g.cap);const st=t?(TO_ST[t.st||'bor']||[t.st])[0]:(g.cap?'Sin tareo':'');const can=ed&&trFaltaOk(f,g.cap);
         return`<details class="tr-sg" data-cap="${esc(g.cap)}" data-tk="g:${esc(g.cap)}"${op('g:'+g.cap,!!(t||!g.cap))}><summary><b>${esc(g.name)}</b> <span class="note">${g.L.length} ${g.L.length===1?'obrero':'obreros'}${st?' · tareo: '+esc(st):''}</span></summary>
          <ul class="t-list tr-sl">${g.L.map(p=>`<li data-tsn="${esc(p.dni||p.id)}"><span>${esc(tName(p))} <span class="mono note">${esc(p.dni||p.id)}</span>${p.cua?` <span class="note">· ${esc(p.cua)}</span>`:''}</span>${can?`<button class="ib tr-fbtn" data-trfal="${esc(p.dni||p.id)}">Registrar falta</button>`:''}</li>`).join('')}</ul></details>`}).join('')}</div></details>`}}
  return h}

/* ---------- conflicto: un obrero en dos tareos del día → «Quitar de este tareo» (tasis/admin, con motivo) ---------- */
/* Solo en tareos «Enviado» o «Revisado» (la oficina es dueña del documento; en borrador o reabierto lo quita el capataz).
   Quita su fila, lo saca de los bloques (un bloque que queda sin nadie se quita), borra su cotejo y, si estaba revisado,
   vuelve a «Enviado». Historial `cor` con motivo y detalle. */
async function trQuitar(tid,dni){const t=TD.docs.get(tid);if(!t||!toReabOk()||!['env','rev'].includes(t.st)||!(t.rows||{})[dni])return;
  const r=t.rows[dni];const nm=trNm(r)||dni;const otros=[...TD.docs.values()].filter(x=>x.id!==tid&&!x.arch&&x.rows&&x.rows[dni]).map(x=>x.capN||tCapName(x.cap));
  const mot=await uiAsk({title:'¿Quitar de este tareo?',text:`${nm} sale del tareo de ${t.capN||tCapName(t.cap)}${otros.length?` y queda solo en el de ${otros.join(' y ')}`:''}. Pierde sus horas en este tareo.${t.st==='rev'?' El tareo vuelve a «Enviado».':''}`,input:{label:'Motivo',required:true},ok:'Quitar',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;const FV=firebase.firestore.FieldValue;
  try{await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');const R=cur.rows||{};if(!R[dni])throw new Error('Ya no figura en ese tareo.');
      const blq=[];for(const b of Array.isArray(cur.blq)?cur.blq:[]){if(b&&Array.isArray(b.dnis)&&b.dnis.includes(dni)){const n={...b,dnis:b.dnis.filter(x=>x!==dni)};if(n.dnis.length)blq.push(n)}else blq.push(b)}
      const R2={...R};delete R2[dni];const det=tDet(cur,{...cur,rows:R2,blq});
      const up={[`rows.${dni}`]:FV.delete(),blq,...trCorExtra(cur),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${cur.st==='rev'?'Quita revisado. ':''}Quitado de este tareo: ${R[dni].ape||dni} (${trAsTx(R[dni])})${otros.length?'; figura en el de '+otros.join(' y '):''}`,det})),by:me.email||'',ts:NOW()};
      if(cur.cot&&typeof cur.cot==='object'&&cur.cot[dni])up[`cot.${dni}`]=FV.delete();
      return up});
    toast(`${nm} ya no figura en ese tareo.`)}
  catch(err){trErr('No se pudo quitar: ',err)}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#trConf [data-trq]');if(b&&!b.disabled)trQuitar(b.dataset.trq,b.dataset.dni)});

/* ---------- pasar un obrero al tareo de otro capataz (tasis/admin, desde la revisión) ---------- */
/* Solo entre tareos «Enviado» o «Revisado» del mismo día (la oficina es dueña de los dos documentos). No se escribe en un
   tareo en borrador o reabierto ni se crea uno a nombre del capataz: su celular guarda con update de rows/blq enteros (o set si
   aún no existe) y borraría al obrero pasado. Ver docs/ia/tareo.md («Revisión en laptop (oct 2026)»). */
/** pasa la fila de un obrero del tareo A al B (pura; no escribe). En A: sin su fila y fuera de los bloques (un bloque que queda
    vacío se quita). En B: su fila sin cotejo y sus mismos bloques: si B ya tiene uno con la misma partida y horario, se suma a
    él; si no, se crea uno igual solo con él. Sus horas se recalculan con tCalc en B. → {a, b, row} | null */
function trPasa(A,B,dni){const r0=(A&&A.rows||{})[dni];if(!r0)return null;const blA=[],mine=[];
  for(const b of Array.isArray(A.blq)?A.blq:[]){if(!b)continue;const n=Array.isArray(b.dnis)?b.dnis:[];if(n.includes(dni)){mine.push(b);const m={...b,dnis:n.filter(x=>x!==dni)};if(m.dnis.length)blA.push(m)}else blA.push(b)}
  const blB=(Array.isArray(B.blq)?B.blq:[]).filter(Boolean).map(b=>({...b,dnis:Array.isArray(b.dnis)?b.dnis.slice():[]}));
  for(const b of mine){const y=blB.find(x=>x.pc===b.pc&&x.ini===b.ini&&x.fin===b.fin);if(y){if(!y.dnis.includes(dni))y.dnis.push(dni)}
    else blB.push({id:trBid(),pc:b.pc||'',ini:b.ini||'',fin:b.fin||'',dnis:[dni]})}
  const row={...r0};delete row.fir;delete row.gar;const rA={...(A.rows||{})};delete rA[dni];
  const b={...B,rows:{...(B.rows||{}),[dni]:row},blq:blB};const c=tCalc(b);const row2=c.rows[dni]||row;
  return{a:{...A,rows:rA,blq:blA},b:{...b,rows:{...b.rows,[dni]:row2}},row:row2}}
/** capataces a los que se puede pasar (why = por qué no): los tcap activos y los que tienen tareo ese día, menos el del tareo */
function trDestinos(t,dni){const by=new Map();for(const x of TD.docs.values())if(x&&!x.arch&&x.date===t.date&&x.id!==t.id&&x.cap!==t.cap)by.set(x.cap,x);
  const L=tCaps().filter(c=>c.id!==t.cap).map(c=>({cap:c.id,name:c.name}));for(const[cap,x]of by)if(!L.some(y=>y.cap===cap))L.push({cap,name:x.capN||tCapName(cap)||cap});
  return L.map(y=>{const d=by.get(y.cap)||null;const st=d?d.st||'bor':'sin';
    const why=!d?'aún no tiene tareo este día':st==='reab'?'reabierto: lo está corrigiendo':!['env','rev'].includes(st)?'lo está llenando: que lo agregue él':(d.rows||{})[dni]?'ya figura en ese tareo':'';
    return{...y,name:(d&&d.capN)||y.name,id:d?d.id:'',st,why}}).sort((a,b)=>(!!a.why)-(!!b.why)||a.name.localeCompare(b.name))}
function trPasarDlg(id,dni){const t=TD.docs.get(id);if(!t||!toReabOk()||!['env','rev'].includes(t.st)||!(t.rows||{})[dni])return;
  if(TR.dirty){toast('Primero guarda el cotejo antes de pasar a un obrero.');return}
  const r=t.rows[dni];const nm=trNm(r)||dni;const L=trDestinos(t,dni);const ok=L.filter(x=>!x.why);
  lqModal(`<div class="lqtop"><b>Pasar a otro capataz</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg"><b>${esc(nm)}</b> <span class="mono note">${esc(dni)}</span> sale del tareo de <b>${esc(t.capN||tCapName(t.cap))}</b> y entra al del capataz que elijas, ${r.as===false?`con su falta (${esc(r.mot||'sin motivo')})`:'con sus mismas horas y partidas'}.</p>
   <div class="tr-dst" id="trPd" role="radiogroup" aria-label="Capataz destino">${L.map(x=>`<label class="tr-dso${x.why?' off':''}"><input type="radio" name="trPd" value="${esc(x.id)}" data-cap="${esc(x.cap)}"${x.why?' disabled':''}${ok.length===1&&x===ok[0]?' checked':''}><span><b>${esc(x.name)}</b> <span class="note">${esc((TO_ST[x.st]||[x.st])[0])}${x.why?' · '+esc(x.why):''}</span></span></label>`).join('')||'<p class="note">No hay otros capataces.</p>'}</div>
   <p class="note">Solo a un tareo «Enviado» o «Revisado»: si el capataz aún lo está llenando, su celular guardaría encima. La firma se coteja de nuevo en el tareo de destino; un tareo revisado vuelve a «Enviado».</p>
   <label>Motivo (queda en el historial de los dos tareos)<input id="trPm" type="text" maxlength="200" placeholder="Ej. trabajó toda la jornada con otra cuadrilla"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trPok"${ok.length?'':' disabled'}>Pasar</button></div>`,
   e=>{if(!e.target.closest('#trPok'))return;const sel=$('#lqm input[name="trPd"]:checked');const m=($('#trPm').value||'').trim();
     if(!sel){toast('Elige el capataz.');return}if(!m){toast('Escribe el motivo.');$('#trPm').focus();return}
     lqClose();trPasar(id,dni,sel.value,m)})}
/* en una transacción con los dos tareos: vuelve a comprobar estados y filas; hist `cor` con motivo y detalle en ambos */
async function trPasar(oid,dni,did,m){if(!toReabOk()||TR.busy||!did)return;TR.busy=true;const FV=firebase.firestore.FieldValue;let msg='';
  try{const rA=fcol('tareo').doc(oid),rB=fcol('tareo').doc(did);
    await(db||FDB).runTransaction(async tx=>{const sA=await tx.get(rA),sB=await tx.get(rB);if(!sA.exists||!sB.exists)throw new Error('El tareo ya no existe.');
      const A={...sA.data(),id:oid},B={...sB.data(),id:did};const nA=A.capN||tCapName(A.cap),nB=B.capN||tCapName(B.cap);
      if(!['env','rev'].includes(A.st))throw new Error('Este tareo cambió de estado.');
      if(!['env','rev'].includes(B.st))throw new Error(`El tareo de ${nB} ya no está enviado (el capataz lo está llenando).`);
      if(A.date!==B.date||A.arch||B.arch)throw new Error('El tareo de destino no es del mismo día.');
      const r=(A.rows||{})[dni];if(!r)throw new Error('Ya no figura en este tareo.');if((B.rows||{})[dni])throw new Error(`Ya figura en el tareo de ${nB}.`);
      const x=trPasa(A,B,dni);const ape=r.ape||dni;const t2=NOW(),by=me.email||'';
      const upA={[`rows.${dni}`]:FV.delete(),blq:x.a.blq,...trCorExtra(A),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${A.st==='rev'?'Quita revisado. ':''}Pasado al tareo de ${nB}: ${ape} (${trAsTx(r)})`,det:tDet(A,x.a)})),by,ts:t2};
      if(A.cot&&typeof A.cot==='object'&&A.cot[dni])upA[`cot.${dni}`]=FV.delete();
      const upB={[`rows.${dni}`]:trClean({[dni]:x.row})[dni],blq:x.b.blq,...trCorExtra(B),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${B.st==='rev'?'Quita revisado. ':''}Recibido del tareo de ${nA}: ${ape} (${trAsTx(r)}); su firma se coteja en este tareo`,det:tDet(B,x.b)})),by,ts:t2};
      tx.update(rA,upA);tx.update(rB,upB);msg=`${ape} pasó al tareo de ${nB}.`});
    toast(msg)}
  catch(err){trErr('No se pudo pasar: ',err)}finally{TR.busy=false;trSync()}}
