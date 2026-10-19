"use strict";
/* LPS 911 · Propuestas de los subcontratistas y su revisión en la grilla.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* =====================================================================
   ETAPA 29 · Lookahead colaborativo: propuestas de los subcontratistas
   ===================================================================== */
const PROP=new Map();let propSub=null,propErr=null;let ACT_OFF=null;
const myScsI=()=>(me&&me.scs)||[];
const PM=()=>!!me&&me.role==='sc'&&U.tab==='look'&&!(U.ver&&U.verMode==='ver');
function ensureProp(){if(propSub||!db)return;
  /* SEG-05 (paso 1): el SC lee solo el documento de su partida (lhprop/{sc}, por id: sin consulta ni índice), uno por partida */
  if(me&&me.role==='sc'){const offs=myScsI().map(sc=>fcol('lhprop').doc(sc).onSnapshot(d=>{if(d.exists)PROP.set(sc,{...d.data(),id:sc});else PROP.delete(sc);propErr=null;snapOk('lhprop');pmSync();if(PMOD)propModalRender();if(ready&&(U.tab==='look'))requestRender()},
      err=>{propErr=err&&err.code||'error';if(propSub){propSub();propSub=null}snapFail('lhprop',err,ensureProp);if(ready&&U.tab==='look')requestRender()}));
    propSub=()=>offs.forEach(f=>f());unsubs.push(()=>{if(propSub)propSub();propSub=null;PROP.clear()});return}
  propSub=fcol('lhprop').onSnapshot(sn=>{PROP.clear();sn.docs.forEach(d=>PROP.set(d.id,{...d.data(),id:d.id}));propErr=null;snapOk('lhprop');pmSync();if(PMOD)propModalRender();if(ready&&(U.tab==='look'))snapRender(sn)},err=>{propErr=err&&err.code||'error';if(propSub){propSub();propSub=null}snapFail('lhprop',err,ensureProp);if(ready&&U.tab==='look')requestRender()});
  unsubs.push(()=>{if(propSub)propSub();propSub=null;PROP.clear()})}
const propItems=(sc)=>Object.entries((PROP.get(sc)||{}).items||{}).filter(([,it])=>!!it).map(([id,it])=>({sc,id,it}));
/* oct 2026 (decidido con el dueño): si el SC edita algo que ya envió, lo enviado SIGUE pendiente para el ingeniero (sentV) hasta que
   el SC reenvíe; antes volvía a borrador y desaparecía de la revisión. propSentOf = lo que revisa el ingeniero (o null). */
const propSentOf=it=>!it?null:it.sent?it:it.sentV?{...it.sentV,sent:true,_dr:1}:null;
/** lo que queda del elemento cuando se decide lo enviado: nada, o el borrador del SC (sin la versión ya decidida) */
const propAfterDecide=raw=>{if(!raw||raw.sent)return null;const d={...raw};delete d.sentV;return d};
/* vista del SC: lo oficial con su borrador encima */
function pmSync(){if(PM()){if(!S.act._pm)ACT_OFF=S.act;const v=new Map(ACT_OFF);
    for(const sc of myScsI())for(const{id,it}of propItems(sc)){const o=ACT_OFF.get(id);if(it.after==null){if(o)v.set(id,{...o,_del:true})}else v.set(id,{...(o?propMerge(clone(it.after),it.base||o,o,false):clone(it.after)),id})}
    v._pm=true;S.act=v}
  else if(S.act&&S.act._pm&&ACT_OFF){S.act=ACT_OFF}}
const cleanAct=a=>{const c={...a};delete c._del;delete c.id;return c};
/* escritura del SC: va al borrador, no al lookahead oficial */
function propPut(col,id,after){if(!PM())return false;
  if(propClosed()){toast('Las propuestas están cerradas: el ingeniero está programando el lookahead. Podrás proponer cuando lo habilite.');if(typeof gridRows!=='undefined')gridRows=null;requestRender();return true}
  if(col!=='acts'){toast('En modo propuesta solo cambias las actividades de tu partida. Ambientes, sectores y lo demás los edita el ingeniero de producción.');return true}
  const off=ACT_OFF&&ACT_OFF.get(id)||null;const cur=S.act.get(id)||null;const mine=myScsI();
  const sc=off?off.sc:(after&&after.sc)||(cur&&cur.sc);
  const back=()=>{if(typeof gridRows!=='undefined')gridRows=null;requestRender()};
  if(off&&after&&after.sc!==off.sc){toast('La partida de una actividad no se cambia en la propuesta: si corresponde a otra partida, pídeselo al ingeniero de producción.');back();return true}
  if(!mine.includes(sc)||(after&&!mine.includes(after.sc))){toast('Solo puedes proponer cambios en las actividades de '+mine.map(c=>conOf(c).name).join(', ')+'.');back();return true}
  /* oct 2026 (decidido con el dueño): el SC propone desde mañana; hoy y los días pasados no se tocan (retirar una actividad sí se puede proponer) */
  if(after){const t=todayIso();const L=propDayTouch(cur?cleanAct(cur):off,cleanAct(after)).filter(d=>d<=t);
    if(L.length){toast(`Solo puedes proponer desde mañana: ${L.length>1?'los días':'el'} ${L.map(fmtD).join(', ')} ${L.some(d=>d===t)?'(hoy) ':''}ya no se ${L.length>1?'cambian':'cambia'}. Lo de hoy se reporta en «En obra».`);back();return true}}
  let item;
  if(after==null){item=off?{after:null,base:cleanAct(off)}:null}
  else{const a=cleanAct(after);if(off&&canon(a)===canon(cleanAct(off)))item=null;else item={after:a,base:off?cleanAct(off):null}}
  /* actividad nueva de un SC con dos partidas que cambia de partida: sale del documento anterior (si no, quedaba duplicada) */
  if(!off&&cur&&cur.sc&&cur.sc!==sc&&mine.includes(cur.sc))savePropItem(cur.sc,id,null);
  savePropItem(sc,id,item);return true}
/* firma corta del contenido propuesto: al volver a enviar, si el contenido es el mismo que ya se había enviado, se conserva esa hora de envío */
function propSig(a){const s=canon(a??null);let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)+'.'+s.length}
function savePropItem(sc,id,item){const doc=PROP.get(sc)||{sc,items:{}};const prev=(doc.items||{})[id]||null;let v=item?{...item,ts:NOW(),by:me.email,n:me.name||'',sent:false}:null;
  /* editar algo ya enviado lo vuelve borrador, pero se recuerda el primer envío (sent0), el último (sentPrev) y qué contenido se envió (sig) */
  if(v&&prev){const s0=prev.sent0||(prev.sent?prev.sentAt:null);const sp=prev.sent?prev.sentAt:prev.sentPrev;if(s0)v.sent0=s0;if(sp)v.sentPrev=sp;if(prev.sig)v.sig=prev.sig;
    const sv=prev.sent?{after:prev.after??null,base:prev.base??null,ts:prev.ts||0,by:prev.by||'',n:prev.n||'',sentAt:prev.sentAt||0,sent0:prev.sent0||prev.sentAt||0,sig:prev.sig||''}:prev.sentV;if(sv)v.sentV=sv}
  /* descartar el borrador cuando hay una versión enviada pendiente: vuelve a quedar lo enviado (no se retira la propuesta) */
  if(!v&&prev&&!prev.sent&&prev.sentV)v={...prev.sentV,sent:true};
  PROP.set(sc,{...doc,items:{...(doc.items||{}),[id]:v}});pmSync();requestRender();
  /* update por ruta reemplaza el elemento entero: con set+merge las cantidades de días quitados seguían guardadas */
  if(db){const ref=fcol('lhprop').doc(sc);ref.update(new firebase.firestore.FieldPath('items',id),v).catch(err=>{if(err&&err.code==='not-found')return ref.set({sc,items:{[id]:v}},{merge:true});throw err})
    .catch(err=>{propReload(sc);toast('No se pudo guardar la propuesta: '+(err.code==='permission-denied'?(propClosed()?'las propuestas están cerradas':'las propuestas se cerraron o tu reloj está desfasado'):(err.code||err.message)))})}}
/** si una escritura del SC no se guardó (ventana cerrada en el servidor, sin conexión), vuelve a lo que hay de verdad en la base */
function propReload(sc){if(!db)return;fcol('lhprop').doc(sc).get().then(d=>{if(d.exists)PROP.set(sc,{...d.data(),id:sc});else PROP.delete(sc);pmSync();if(typeof gridRows!=='undefined')gridRows=null;requestRender()}).catch(()=>{})}
/* antes de enviar: avisa si hay actividades nuevas sin ningún día (el ingeniero no las ve en la grilla y suelen ser un error) */
async function sendProp(){if(propClosed()){toast('Las propuestas están cerradas: espera a que el ingeniero las habilite.');return}const off=ACT_OFF||S.act;const E=[];
  for(const sc of myScsI())for(const{id,it}of propItems(sc))if(!it.sent&&it.after&&!off.get(id)&&!(it.after.days||[]).length)E.push(it.after.name||'(sin nombre)');
  if(E.length){const c={};E.forEach(n=>c[n]=(c[n]||0)+1);
    if(!await uiAsk({title:`${E.length} actividad${E.length>1?'es':''} nueva${E.length>1?'s':''} sin días`,text:'No tienen ningún día programado, así que el ingeniero no las verá en la grilla al revisar.',
      list:Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([n,k])=>k>1?`${n} × ${k}`:n).concat(Object.keys(c).length>12?[`… y ${Object.keys(c).length-12} más`]:[]),
      note:'Si son para programar más adelante, puedes enviarlas igual. Si no, vuelve y pon sus días o quítalas.',ok:'Enviar igual',cancel:'Volver a revisar',tone:'warn'}))return}
  sendPropNow()}
function sendPropNow(){const now=NOW();let n=0,nl=0;
  for(const sc of myScsI()){const its=propItems(sc).filter(o=>!o.it.sent);if(!its.length)continue;const up={};
    its.forEach(({id,it})=>{const sig=propSig(it.after);const keep=it.sentPrev&&it.sig===sig;const sAt=keep?it.sentPrev:now;
      const v={...it,sent:true,sentAt:sAt,sent0:it.sent0||sAt,sig};delete v.sentPrev;delete v.sentV;up[id]=v;n++;if(propLate(v,(ACT_OFF||S.act).get(id)))nl++});
    const doc=PROP.get(sc)||{sc,items:{}};PROP.set(sc,{...doc,items:{...doc.items,...up},sentAt:now,sentBy:me.name||me.email});
    const FP=firebase.firestore.FieldPath;const args=[];Object.entries(up).forEach(([id,v])=>args.push(new FP('items',id),v));args.push('sentAt',now,'sentBy',me.name||me.email);
    const ref=fcol('lhprop').doc(sc);ref.update(...args).catch(err=>{if(err&&err.code==='not-found')return ref.set({sc,items:up,sentAt:now,sentBy:me.name||me.email},{merge:true});throw err}).catch(err=>{propReload(sc);toast('No se pudo enviar: '+(err.code==='permission-denied'?'las propuestas ya están cerradas':(err.code||err.message)))})}
  toast(n?`${n} cambio${n>1?'s':''} enviado${n>1?'s':''} al ingeniero responsable del piso`+(nl?` · ${nl} fuera de plazo (${propCutTxt()}): el ingeniero decide si los acepta`:''):'No hay cambios por enviar');requestRender()}
/* ---- plazo de entrega de las propuestas (Configuración › Proyecto: día y hora; por defecto sábado 13:00, hora de Lima) ----
   El corte de la semana n es el último <día> a la <hora> antes de su lunes. Una propuesta llega «fuera de plazo» si se envió
   después del corte de alguna semana cuyos días toca (días o cantidades que agrega o quita; si cambia unidad, metrado o
   nombre, todos sus días). Recibirla no la bloquea: el ingeniero decide y, si la acepta, deja el motivo (queda en lhphist). */
const DOW_N=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
function propCutCfg(){const p=P();const d=parseInt(p.propCutDow,10);return{dow:d>=0&&d<=6?d:6,hh:/^\d\d:\d\d$/.test(p.propCutHH||'')?p.propCutHH:'13:00'}}
const propCutTxt=()=>{const c=propCutCfg();return`corte: ${DOW_N[c.dow]} ${c.hh}`};
/* Corte del congelado del plan semanal (oct 2026, decidido con el dueño: independiente del de las propuestas; si no se configuró, el mismo) */
function frzCutCfg(){const p=P();const d=parseInt(p.frzCutDow,10);if(!(d>=0&&d<=6)||!/^\d\d:\d\d$/.test(p.frzCutHH||''))return{...propCutCfg(),same:true};return{dow:d,hh:p.frzCutHH,same:false}}
function frzCut(n){const c=frzCutCfg();const back=((1-c.dow)+7)%7||7;return Date.parse(addD(weekStart(n),-back)+'T'+c.hh+':00Z')+LIMA_OFF}
/** hora (ms) del corte para entregar propuestas de la semana n */
function propCut(n){const c=propCutCfg();const back=((1-c.dow)+7)%7||7;return Date.parse(addD(weekStart(n),-back)+'T'+c.hh+':00Z')+LIMA_OFF}
/* ---- ventana de propuestas (oct 2026, decidido con el dueño): primero el ingeniero programa el lookahead; recién cuando un
   ingeniero (admin/editor) toca «Habilitar propuestas» los SC pueden proponer, hasta el corte configurado (Configuración ›
   Proyecto); al corte se bloquea solo. meta/propwin.closeAt = hora (ms) del corte de la ventana abierta; sin documento
   (nadie habilitó nunca) está CERRADO. Las reglas (propOpen) bloquean la escritura del SC en lhprop con la misma hora. */
function propCloseAt(){const pw=S.meta&&S.meta.get('propwin');return pw&&+pw.closeAt>0?+pw.closeAt:0}
const propNever=()=>!propCloseAt();
const propClosed=()=>NOW()>=propCloseAt();
/** próximo corte después de ahora (la ventana que se abre al habilitar) */
function propNextCut(){const cw=weekOf(todayIso());let c=propCut(cw+1);if(c<=NOW())c=propCut(cw+2);return c}
const fmtCut=t=>{const d=new Date(t-LIMA_OFF);const iso=d.toISOString().slice(0,10);return`${DOW_N[d.getUTCDay()]} ${fmtD(iso)} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`};
async function propOpenWin(){if(!canWrite||!db)return;let pend=0;for(const doc of PROP.values())for(const it of Object.values(doc.items||{}))if(propSentOf(it))pend++;
  const nx=propNextCut();
  if(!await uiAsk({title:'¿Habilitar las propuestas de los subcontratistas?',text:`Los SC podrán volver a proponer cambios en el lookahead hasta el próximo corte (${fmtCut(nx)}).`,
    list:pend?[`Todavía hay ${pend} propuesta${pend>1?'s':''} enviada${pend>1?'s':''} sin decidir: siguen pendientes y los SC podrán cambiarlas.`]:[],note:'Hazlo cuando ya revisaste y ajustaste el lookahead de la semana.',ok:'Habilitar',tone:pend?'warn':'ok'}))return;
  fcol('meta').doc('propwin').set({closeAt:nx,openAt:NOW(),by:me.email,n:me.name||''}).then(()=>toast('Propuestas habilitadas hasta el '+fmtCut(nx))).catch(err=>toast('No se pudo: '+(err.code||err.message)))}
/** bloquear a mano antes del corte (oct 2026): el ingeniero cierra la ventana ya; se vuelve a abrir solo con «Habilitar propuestas» */
async function propCloseWin(){if(!canWrite||!db)return;let un=0;for(const doc of PROP.values())for(const it of Object.values(doc.items||{}))if(it&&!it.sent)un++;
  if(!await uiAsk({title:'¿Bloquear ahora las propuestas de los subcontratistas?',text:`Los SC quedan en solo lectura desde este momento, sin esperar al corte (${fmtCut(propCloseAt())}).`,
    list:[...(un?[`Hay ${un} cambio${un>1?'s':''} de SC sin enviar: no podrán enviarlo${un>1?'s':''} hasta que vuelvas a habilitar.`]:[]),'Las propuestas ya enviadas siguen pendientes para que las revises.'],note:'Puedes volver a habilitarlas cuando quieras con «🔓 Habilitar propuestas».',ok:'Bloquear',tone:'warn'}))return;
  const pw=(S.meta&&S.meta.get('propwin'))||{};
  fcol('meta').doc('propwin').set({closeAt:NOW(),openAt:pw.openAt||null,by:me.email,n:me.name||'',man:true}).then(()=>toast('Propuestas bloqueadas')).catch(err=>toast('No se pudo: '+(err.code||err.message)))}
const propManual=()=>{const pw=S.meta&&S.meta.get('propwin');return!!(pw&&pw.man)};
/** días que una propuesta cambia respecto a b (la actividad antes) */
function propTouch(b,a){if(!a)return b?[...(b.days||[])].sort():[];if(!b)return[...(a.days||[])].sort();
  const bd=new Set(b.days||[]),ad=new Set(a.days||[]),T=new Set();ad.forEach(d=>{if(!bd.has(d))T.add(d)});bd.forEach(d=>{if(!ad.has(d))T.add(d)});
  const bq=b.qty||{},aq=a.qty||{};ad.forEach(d=>{if(bd.has(d)&&canon(bq[d]??null)!==canon(aq[d]??null))T.add(d)});
  if((a.und||'')!==(b.und||'')||(a.metrado??null)!==(b.metrado??null)||(a.name||'')!==(b.name||''))ad.forEach(d=>T.add(d));return[...T].sort()}
/** {w, cut} si se envió después del corte de alguna semana que toca (la primera); null si llegó a tiempo */
/** la propuesta con otros días (los que dejó el ingeniero): las cantidades de los días quitados se descartan */
function propDays(after,days){const a=clone(after);a.days=[...new Set(days)].sort();if(a.qty){const q={};for(const d of a.days)if(d in a.qty)q[d]=a.qty[d];a.qty=q}return a}
function propLate(it,off){if(!it||!it.sent||!it.sentAt)return null;
  /* oct 2026 (decidido con el dueño): los días que van DESPUÉS del día en que el SC propuso, dentro de esa misma semana (p. ej. viernes y sábado de la semana en curso),
     no son «fuera de plazo»: esa semana ya está congelada en el plan semanal y lo que cambie no la toca. Solo cuentan las semanas posteriores y los días ya pasados. */
  const sd=ldt(it.sentAt),sw=weekOf(sd);
  const ws=[...new Set(propTouch(it.base||off||null,it.after).filter(d=>!(d>sd&&weekOf(d)===sw)).map(weekOf))].sort((a,b)=>a-b);
  for(const w of ws){const c=propCut(w);if(it.sentAt>c)return{w,cut:c}}return null}
const fmtT=t=>t?`${DOW_N[pd(ldt(t)).getUTCDay()].slice(0,3)} ${fmtD(ldt(t))} ${hhmm(t)}`:'';
const lateTxt=L=>`Fuera de plazo · semana ${L.w} (corte ${fmtT(L.cut)})`;
/* textos */
function rngTxt(ds){ds=[...(ds||[])].sort();if(!ds.length)return'sin días';const out=[];let a=ds[0],b=ds[0];
  const nx=d=>{let x=addD(d,1);let g=0;while(!isWork(x)&&g++<14)x=addD(x,1);return x};
  for(let i=1;i<ds.length;i++){if(ds[i]===nx(b))b=ds[i];else{out.push(a===b?fmtD(a):fmtD(a).slice(0,2)+'–'+fmtD(b));a=b=ds[i]}}out.push(a===b?fmtD(a):fmtD(a).slice(0,2)+'–'+fmtD(b));return out.join(', ')}
function propDesc(id,it){const off=(ACT_OFF&&S.act._pm?ACT_OFF:S.act).get(id)||null;const base=it.base||off;const L=[];
  if(!it.after)return{kind:'del',lines:['Pide quitar esta actividad'+(base?` (${rngTxt(base.days)})`:'')]};
  if(!base)return{kind:'new',lines:[`Nueva actividad · ${rngTxt(it.after.days)} (${(it.after.days||[]).length} días)`]};
  if(canon(it.after.days||[])!==canon(base.days||[]))L.push(`Días: ${rngTxt(base.days)} → <b>${rngTxt(it.after.days)}</b>`);
  if(canon(it.after.qty||{})!==canon(base.qty||{})&&canon(it.after.days||[])===canon(base.days||[]))L.push('Reparto del metrado por día');
  if((it.after.metrado??null)!==(base.metrado??null))L.push(`Metrado: ${base.metrado??'—'} → <b>${it.after.metrado??'—'}</b> ${esc(it.after.und||'')}`);
  if((it.after.und||'')!==(base.und||''))L.push(`Unidad: ${esc(base.und||'—')} → <b>${esc(it.after.und||'—')}</b>`);
  if((it.after.name||'')!==(base.name||''))L.push(`Nombre: ${esc(base.name||'—')} → <b>${esc(it.after.name||'—')}</b>`);
  if(!L.length)L.push('Cambio de orden');return{kind:'mod',lines:L}}
/** el cambio propuesto en palabras simples (para el título de las celdas): «Mueve todo 3 días hábiles más tarde y aumenta la duración de 4 a 6 días» */
function propPlain(off,a){if(!a)return'Pide quitar esta actividad';const ad=[...(a.days||[])].sort();if(!off)return`Nueva actividad · ${ad.length} día${ad.length===1?'':'s'}${ad.length?' ('+rngTxt(ad)+')':''}`;
  const od=[...(off.days||[])].sort();const P=[];const pl=(n,s,p)=>n===1?s:p;
  if(canon(od)!==canon(ad)){const mv=od[0]&&ad[0]?wdist(od[0],ad[0]):0;const k=Math.abs(mv);const same=od.length===ad.length&&od.every((d,i)=>wshift(d,mv)===ad[i]);
    if(!ad.length)P.push('quita todos sus días');
    else if(same&&mv)P.push(`mueve todo ${k} ${pl(k,'día hábil','días hábiles')} ${mv>0?'más tarde':'antes'}`);
    else{if(mv)P.push(`mueve el inicio ${k} ${pl(k,'día hábil','días hábiles')} ${mv>0?'más tarde':'antes'}`);
      if(ad.length>od.length)P.push(`aumenta la duración de ${od.length} a ${ad.length} días`);else if(ad.length<od.length)P.push(`reduce la duración de ${od.length} a ${ad.length} ${pl(ad.length,'día','días')}`);
      else if(!mv)P.push(`cambia los días (${rngTxt(ad)})`)}}
  else if(canon(a.qty||{})!==canon(off.qty||{}))P.push('cambia el reparto del metrado por día');
  if((a.metrado??null)!==(off.metrado??null))P.push(`metrado ${off.metrado??'—'} → ${a.metrado??'—'} ${a.und||''}`.trim());
  if((a.und||'')!==(off.und||''))P.push(`unidad ${off.und||'—'} → ${a.und||'—'}`);
  if((a.name||'')!==(off.name||''))P.push(`nombre «${off.name||'—'}» → «${a.name||'—'}»`);
  if(!P.length)return'';const t=P.length>1?P.slice(0,-1).join(', ')+' y '+P[P.length-1]:P[0];return t[0].toUpperCase()+t.slice(1)}
/** la explicación de una fila del lookahead: en revisión, con propuestas enviadas a la vista o en el modo propuesta del SC */
function propRowTip(x,pv){try{if(x._rv)return propPlain(x._rv.off||null,x._rv.del?null:x);
  /* (auditoría de código 08/10, L8) fila sin borrador: pmSync deja el mismo objeto que el oficial, así que no hay nada que explicar */
  if(!pv&&ACT_OFF&&ACT_OFF.get(x.id)===x)return'';
  if(pv){const it=((PROP.get(pv.sc)||{}).items||{})[x.id];const off=S.act.get(x.id);if(it&&off)return propPlain(off,it.after?propMerge(it.after,it.base||off,off,false):null)}
  if(PM()&&ACT_OFF){const off=ACT_OFF.get(x.id)||null;const t=propPlain(off,x);return off&&canon([off.days,off.qty,off.metrado,off.und,off.name])===canon([x.days,x.qty,x.metrado,x.und,x.name])?'':t}}catch(e){}return''}
/* cruces con otras disciplinas para ayudar a decidir */
function propAlerts(sc,id,it,days){const A=[];const off=S.act.get(id);const x=it.after||off;if(!x)return A;const ds=new Set(days||x.days||[]);
  if(ds.size){const oth=new Map();for(const y of S.act.values()){if(y.id===id||y.ambId!==x.ambId||y.sc===x.sc)continue;const c=(y.days||[]).filter(d=>ds.has(d));if(c.length)oth.set(y.id,{y,c})}
    oth.forEach(({y,c})=>A.push({t:'amb',h:`Mismo ambiente esos días: <b>${esc(conOf(y.sc).name)}</b> ${esc(y.name)} (${rngTxt(c)})`}));
    for(const d of PROP.values())for(const[oid,o0]of Object.entries(d.items||{})){const o=propSentOf(o0);if(!o||!o.after||oid===id||d.sc===x.sc||o.after.ambId!==x.ambId)continue;const c=(o.after.days||[]).filter(dd=>ds.has(dd));
      if(c.length)A.push({t:'amb',h:`Otra propuesta pendiente en el mismo ambiente: <b>${esc(conOf(d.sc).name)}</b> ${esc(o.after.name||'')} (${rngTxt(c)})`})}}
  const rs=off?restrPend(id):[];rs.forEach(r=>A.push({t:'res',h:'Restricción pendiente: '+esc(rTxt(r))}));
  /* semana congelada: no solo por fechas; también cantidades por día, unidad y el retiro de la actividad.
     El compromiso congelado no cambia: se avisa qué seguirá midiendo el PPC. */
  const pid=pisoOfAmb(x.ambId);const pa=it.after?{...(off?propMerge(it.after,it.base||off,off,!!days):it.after),...(days?{days}:{})}:null;
  const wks=[...new Set(propTouch(off,pa).map(d=>weekOf(d)))].sort((a,b)=>a-b).filter(w=>{const wk=S.wk.get(wkId(w,pid));return wk&&wk.frozenAt});
  wks.forEach(w=>{const ci=(S.wk.get(wkId(w,pid)).items||{})[id];
    A.push({t:'frz',h:ci?`Afecta la semana ${w}, ya congelada: el PPC sigue midiendo lo comprometido (${esc(rngTxt(ci.days))}${ci.q!=null?` · ${ci.q} ${esc(ci.und||'')}`:''})`+(it.after?'; el lookahead quedará con lo que aceptes':'; retirarla no la quita del compromiso ni la da por cumplida')
      :`Afecta la semana ${w}, ya congelada: no entra en su compromiso (saldrá como programada después de congelar)`})});
  return A}
/** propuestas enviadas y sin decidir que tocan la semana n del piso pid (docs = documentos de lhprop). Al congelar
    se avisa: una propuesta no es compromiso hasta aceptarla, así que quedan fuera (y se guarda cuáles, en weeks.propOut). */
function propPendWeek(n,pid,docs){const wd=new Set(weekDays(n));const L=[];
  for(const d of docs)for(const[id,it0]of Object.entries(d.items||{})){const it=propSentOf(it0);if(!it)continue;const off=S.act.get(id)||null;const x=it.after||off||it.base;if(!x||pisoOfAmb(x.ambId)!==pid)continue;
    const pa=it.after&&off?propMerge(it.after,it.base||off,off,false):it.after;if(!propTouch(off,pa).some(z=>wd.has(z)))continue;
    L.push({sc:d.sc||d.id,id,kind:!it.after?'del':!off?'new':'mod',t:it.sentAt||0})}return L}
/* días hábiles (lun–sáb) */
function wshift(d,n){let x=d;const st=n>0?1:-1;let k=Math.abs(n);let g=0;while(k>0&&g++<2000){x=addD(x,st);if(isWork(x))k--}return x}
function wdist(a,b){if(a===b)return 0;let n=0,x=a;const st=b>a?1:-1;while(x!==b){x=addD(x,st);if(isWork(x))n+=st;if(Math.abs(n)>400)break}return n}
/* ---- decidir una propuesta (aceptar, aceptar con otra fecha o rechazar) ----
   Todo va en una sola transacción: se relee la propuesta y la actividad en la base y solo se escribe si siguen siendo
   las que el ingeniero revisó. Así no se consume una versión nueva que el SC envió mientras tanto, no se pisa un cambio
   oficial hecho por otro y el «Aceptada» solo aparece cuando de verdad quedó guardado. */
const PFIELDS=['days','qty','metrado','und','name','order'];
const PFLBL={days:'días',qty:'cantidades por día',metrado:'metrado',und:'unidad',name:'nombre',order:'orden'};
const propVer=it=>`${it&&it.ts||0}|${it&&it.sentAt||0}`;
/** lo que queda al aceptar: el programa vigente (off) con solo los campos que la propuesta cambió respecto a su base.
    La vista previa de la revisión usa lo mismo, para que se vea lo que se va a guardar. */
function propMerge(a,base,off,shift){const nw={...off};const B=base||{};const ch=(x,y,f)=>canon(x[f]??null)!==canon(y[f]??null);
  /* oct 2026 (decidido con el dueño: «siempre prioriza el ingeniero»): un campo que el SC cambió se aplica solo si el ingeniero no lo
     cambió también desde la base de la propuesta; los días y cantidades se combinan día por día con la misma regla. Sin preguntas. */
  for(const f of PFIELDS)if(f!=='days'&&f!=='qty'&&ch(a,B,f)&&!ch(off,B,f))nw[f]=a[f];
  if(shift){nw.days=a.days;if('qty' in a)nw.qty=a.qty;else delete nw.qty;return nw}
  const bd=new Set(B.days||[]),ad=new Set(a.days||[]),od=new Set(off.days||[]);const eng=d=>bd.has(d)!==od.has(d);const days=new Set(od);
  ad.forEach(d=>{if(!bd.has(d)&&!eng(d))days.add(d)});bd.forEach(d=>{if(!ad.has(d)&&!eng(d))days.delete(d)});nw.days=[...days].sort();
  if(a.qty||off.qty||B.qty){const bq=B.qty||{},aq=a.qty||{},oq=off.qty||{};const q={};
    for(const d of nw.days){const s_=canon(aq[d]??null)!==canon(bq[d]??null),e_=canon(oq[d]??null)!==canon(bq[d]??null);const v=s_&&!e_?aq[d]:oq[d];if(v!=null)q[d]=v}nw.qty=q}
  return nw}
/* ---- historial de decisiones (colección lhphist, un documento por decisión) ----
   Antes iba dentro de lhprop/{sc}.hist y ese documento crecía sin límite (Firestore: 1 MB). Cada registro guarda la hora de
   envío, si llegó fuera de plazo y por qué se aceptó, lo que pidió el SC (prop) y lo que se aplicó (chg), campo por campo
   [antes, después]. sk = sc|hora: el SC lee solo lo suyo de los últimos meses con un rango sobre un solo campo (sin índice compuesto). */
const LHH=new Map();let lhhSub=[];
const HFIELDS=['days','qty','metrado','und','name'];
/* Firestore no admite una lista dentro de otra: los días (lista) se guardan como texto «fecha,fecha,…» en [antes, después] */
function propDiff(b,a){const o={};const fl=v=>Array.isArray(v)?v.join(','):v;for(const f of HFIELDS){const x=b?b[f]??null:null,y=a?a[f]??null:null;if(canon(x)!==canon(y))o[f]=[fl(x),fl(y)]}return o}
const lhhSk=(sc,t)=>sc+'|'+String(Math.round(t)).padStart(15,'0');
function ensureLhh(){if(lhhSub.length||!db||!me||me.role!=='sc')return;const since=NOW()-120*864e5;
  /* SEG-05 (paso 1): con where('sc','==',sc) delante (índice lhphist(sc, sk)); sin el índice, toda la partida filtrada aquí (scSubs) */
  lhhSub.push(scSubs('lhphist',(q,sc)=>q.where('sk','>=',lhhSk(sc,since)).where('sk','<=',sc+'|~'),x=>(x.t||0)>=since,L=>{
    LHH.clear();L.forEach(x=>LHH.set(x.id,x));if(PMOD&&PMOD.mode==='hist')propModalRender();if(ready&&U.tab==='look')requestRender()},()=>{}));
  unsubs.push(()=>{lhhSub.forEach(f=>f());lhhSub=[];LHH.clear()})}
/** detalle de un registro: lo aplicado (o, si se rechazó, lo que se pidió) en cantidades, metrado, unidad y nombre */
function histChgHtml(x){const c=x.st==='rej'?x.prop:(x.chg||x.prop);if(!c)return'';const L=[];const v=z=>z==null||z===''?'—':esc(String(z));
  if(c.qty){const[b,a]=c.qty;const B=b||{},A=a||{};const ds=[...new Set([...Object.keys(B),...Object.keys(A)])].sort().filter(d=>canon(B[d]??null)!==canon(A[d]??null));
    if(ds.length)L.push(`Cantidades: ${ds.map(d=>`${fmtD(d)} ${v(B[d])} → <b>${v(A[d])}</b>`).join(' · ')}`)}
  if(c.metrado)L.push(`Metrado: ${v(c.metrado[0])} → <b>${v(c.metrado[1])}</b>`);
  if(c.und)L.push(`Unidad: ${v(c.und[0])} → <b>${v(c.und[1])}</b>`);
  if(c.name)L.push(`Nombre: ${v(c.name[0])} → <b>${v(c.name[1])}</b>`);
  return L.map(l=>`<li>${l}</li>`).join('')}
/** respuestas para el SC: las antiguas (lhprop.hist) y las nuevas (lhphist) */
const histOf=scs=>scs.flatMap(sc=>[...Object.values((PROP.get(sc)||{}).hist||{}).map(x=>({...x,sc})),...[...LHH.values()].filter(x=>x.sc===sc)]).sort((a,b)=>b.t-a.t);
let PDBUSY=new Set();
class PropStop extends Error{constructor(m,k){super(m);this.lps=m;this.k=k||'stop'}}
/** campos que la propuesta cambia y que el programa oficial también cambió desde que el SC la armó */
function propConflicts(it,off,shift,fz){const base=it.base;if(!it.after||!base||!off)return[];const L=[];
  /* con fz solo cuentan los días abiertos: lo que cambió en días pasados o cerrados (p. ej. al publicar el plan diario) no choca, porque al aceptar esos días quedan como están */
  const v=(x,f)=>{const y=x[f]??null;if(!fz||y==null)return y;if(f==='days')return y.filter(d=>!fz(d)).sort();if(f==='qty'){const q={};for(const[d,n]of Object.entries(y))if(!fz(d))q[d]=n;return q}return y};
  for(const f of PFIELDS){const b=canon(v(base,f)),a=canon(v(it.after,f)),o=canon(v(off,f));const sh=shift&&(f==='days'||f==='qty');
    if((a!==b||sh)&&o!==b&&(sh||a!==o))L.push(f)}return L}
/** días que aceptar una propuesta no cambia (oct 2026, decidido con el dueño): 'past' = ya pasó; 'lock' = hoy (aunque tenga registro
    de campo) o un día con el plan publicado. Esos días quedan como en el programa oficial; solo el administrador puede «Aceptar igual». */
function propFrozenFn(id,pid){const t=todayIso();return d=>d<t?'past':d===t||dayLocked(d,pid)?'lock':false}
/** nw con los días congelados (fz) como en el programa oficial (off): ni se agregan ni se quitan ni cambian su cantidad.
    Así un cambio oficial hecho después de la propuesta (p. ej. al publicar el plan diario) no se pisa ni bloquea la aceptación. */
function propProtect(nw,off,fz){if(!nw||!fz)return nw;const K=new Set(propTouch(off,nw).filter(fz));if(!K.size)return nw;const r={...nw};
  const days=new Set((nw.days||[]).filter(d=>!K.has(d)));((off&&off.days)||[]).forEach(d=>{if(K.has(d))days.add(d)});r.days=[...days].sort();
  if(nw.qty||(off&&off.qty)){const q={};for(const[d,n]of Object.entries(nw.qty||{}))if(!K.has(d)&&days.has(d))q[d]=n;for(const[d,n]of Object.entries((off&&off.qty)||{}))if(K.has(d)&&days.has(d))q[d]=n;r.qty=q}
  return r}
/** días (o cantidades por día) que cambian entre b y a; sin contar nombre, unidad ni metrado */
function propDayTouch(b,a){const bd=new Set((b&&b.days)||[]),ad=new Set((a&&a.days)||[]),T=new Set();ad.forEach(d=>{if(!bd.has(d))T.add(d)});bd.forEach(d=>{if(!ad.has(d))T.add(d)});
  const bq=(b&&b.qty)||{},aq=(a&&a.qty)||{};new Set([...Object.keys(bq),...Object.keys(aq)]).forEach(d=>{if(canon(bq[d]??null)!==canon(aq[d]??null))T.add(d)});return[...T].sort()}
/** la propuesta movida con ‹ › para que empiece en «start»: un día no laborable dentro del bloque cae en el mismo día hábil
    que el siguiente (se juntan sin perder cantidades). Devuelve {a, merged}. */
function propShiftTo(after,start){const a=clone(after);if(!(a.days||[]).length)return{a,merged:0};const ds=[...new Set(a.days)].sort();const k=wdist(ds[0],start);const mp=d=>wshift(d,k);
  a.days=[...new Set(ds.map(mp))].sort();const merged=ds.length-a.days.length;
  if(a.qty){const q={};for(const[d,v]of Object.entries(a.qty)){const n=mp(d);q[n]=r2((q[n]||0)+(+v||0))}a.qty=q}return{a,merged}}
/** prepara la decisión (revisiones, preguntas, cambio y registro del historial) sin guardar nada:
    devuelve el motivo por el que no se aplica (texto) o {sc,id,st,it,o,h,key,key0,opt}. opt.bulk: sin preguntas ni avisos sueltos */
async function propPrep(sc,id,st,opt){opt=opt||{};const doc=PROP.get(sc);const raw=doc&&doc.items&&doc.items[id];const itS=propSentOf(raw);if(!itS){if(!opt.bulk&&raw===null)toast('Esa propuesta ya la decidió otra persona.');return'gone'}
  /* se decide la versión que el ingeniero vio en la grilla (no una que llegó mientras tanto) */
  if(opt.ver&&propVer(itS)!==opt.ver){if(!opt.bulk)toast('El subcontratista cambió esta propuesta: revisa la versión nueva.');return'ver'}
  /* oct 2026: el ingeniero puede ajustar los días al aceptar (clic en la grilla de revisión): se trabaja con una copia; lo que se devuelve y se deshace sigue siendo lo que envió el SC */
  const ED=!!(opt.days&&itS.after&&st!=='rej');const it=ED?{...itS,after:propDays(opt.qty!==undefined?{...itS.after,qty:opt.qty}:itS.after,opt.days)}:itS;
  if(!canDecide(id,it)){if(!opt.bulk)toast(propWho(id,it)+'.');return'perm'}
  const key0=sc+'/'+id;if(PDBUSY.has(key0))return'busy';
  /* días con el plan cerrado (hoy sin registro, publicados) y días pasados: aceptar no los cambia; rechazar sí se puede.
     oct 2026: en vez de bloquear toda la propuesta, se acepta lo de los días abiertos y esos días quedan como en el programa
     oficial (propProtect). Solo se bloquea si no queda nada que aceptar o si cambia nombre/unidad/metrado de una actividad con un
     día cerrado (eso toca todos sus días). Se revisa con las fechas que de verdad se guardarán (si se movió con ‹ ›, las movidas). */
  const fz=st!=='rej'&&typeof dayLocked==='function'?propFrozenFn(id,propPiso(id,it)):null;
  if(fz){const o0=S.act.get(id)||null;const pid=propPiso(id,it);const sh=st==='shift'&&opt.start&&it.after;const aft=sh?propShiftTo(it.after,opt.start).a:it.after;
    const M=aft&&o0?propMerge(aft,it.base||o0,o0,!!sh||ED):aft;const lk=d=>fz(d)==='lock';
    const T=propTouch(o0||it.base||null,M);const L=T.filter(lk);
    let block=false;
    /* retirar una actividad que tiene un día cerrado, o moverla con ‹ › a un día cerrado (lo eligió el ingeniero: se le avisa en vez de cambiarlo) */
    if(!M||sh)block=!!L.length;
    else if(T.some(fz)){const Pz=propProtect(M,o0,fz);const T2=propTouch(o0,Pz);
      const empty=o0?!T2.length&&canon(o0.order??null)===canon(Pz.order??null):!(Pz.days||[]).length;
      if(T2.some(lk)||empty){if(L.length)block=true;else{if(!opt.bulk)toast('No hay nada que aceptar: la propuesta solo cambia días que ya pasaron.');return'closed'}}
      else{const K=propTouch(M,Pz);if(K.length)opt.kept=K}}
    if(block){if(isAdmin&&!opt.bulk&&await uiAsk({title:'Toca un día con el plan cerrado',text:`Esta propuesta cambia el ${L.map(fmtD).join(', ')}, que ya tiene el plan cerrado.`,note:'Como administrador puedes aceptarla igual: queda registrado en el día.',ok:'Aceptar igual',tone:'warn'})){opt.noFz=true;delete opt.kept;L.forEach(d=>dplanLog(d,pid,{t:NOW(),by:me.email,n:me.name||me.email,what:'propuesta aceptada con el plan cerrado'}))}
      else{if(!opt.bulk)toast(`No se puede aceptar: ${M?'cambia':'retira la actividad, que tiene'} el ${L.map(fmtD).join(', ')}, que ya tiene el plan cerrado. Acéptala con otra fecha o recházala.`);return'closed'}}}
  const FZ=fz&&!opt.noFz&&st!=='shift'?fz:null;
  const off=S.act.get(id)||null;const base=it.base||off;let ops=[];let finalDays=null;
  const say=m=>{if(!opt.bulk)toast(m)};
  /* fuera de plazo: se puede aceptar, pero con motivo (queda en el historial con quién y cuándo) */
  const late=propLate(itS,off);
  if(late&&st!=='rej'&&!opt.lateNote){if(opt.bulk)return'late';
    const m=await uiAsk({title:'Propuesta fuera de plazo',html:`<b>${esc((it.after||off||{}).name||'La propuesta')}</b> se envió el ${esc(fmtT(it.sentAt))}, después del corte de la semana ${late.w} (${esc(fmtT(late.cut))}).`,input:{label:'¿Por qué se acepta? Queda registrado con tu nombre.',placeholder:'Ej.: se coordinó en obra con el residente',required:true},ok:'Aceptar con este motivo',tone:'warn'});
    if(m==null)return'late';if(!m.trim()){say('Escribe el motivo para aceptar una propuesta fuera de plazo. No se cambió nada.');return'late'}opt.lateNote=m.trim()}
  if(st!=='rej'){
    if(!it.after){if(off)ops=[arc('acts',id)]}
    else{let a=clone(it.after);
      if(st==='shift'&&opt.start&&(a.days||[]).length){const r_=propShiftTo(a,opt.start);a=r_.a;if(r_.merged)opt.merged=r_.merged}
      if(!off){const ar=getDoc('acts',id);
        if(ar&&ar.arch){say(`“${ar.name||'La actividad'}” está en la Papelera. Restáurala primero (Configuración › Papelera) o rechaza la propuesta.`);return'arch'}
        if(!S.amb.has(a.ambId)){say('El ambiente de esa actividad ya no existe.');return'amb'}
        delete a.arch;a=propProtect(a,null,FZ);ops=[op('acts',id,{...a,id})]}
      else{/* oct 2026: sin pregunta de choque: lo que el ingeniero cambió en lo oficial se respeta (propMerge) */
        a=propProtect(propMerge(a,base,off,st==='shift'||ED),off,FZ);ops=[op('acts',id,a)]}
      finalDays=a.days||[]}}
  const x=it.after||base||{};const am=S.amb.get(x.ambId);const t=NOW();const key=sc+'_'+id+'_'+t;
  const o=ops[0]||null;
  const h={id,name:x.name||'',amb:am?am.code+' '+am.name:'',kind:!it.after?'del':!base?'new':'mod',from:base?rngTxt(base.days):'',to:it.after?rngTxt(finalDays||it.after.days):'',st,note:opt.note||'',why:opt.why||'',t,by:me.email,n:me.name||'',pn:it.n||'',
    sc,actId:id,sk:lhhSk(sc,t),sentAt:it.sentAt||null,sent0:it.sent0||it.sentAt||null,late:late?{w:late.w,cut:late.cut}:null,lateNote:st!=='rej'&&late?opt.lateNote||'':'',
    prop:propDiff(base,itS.after),chg:o?(o.after.arch?{arch:[false,true]}:propDiff(o.before,o.after)):null};
  return{sc,id,st,it:itS,raw,o,h,key,key0,opt}}
/** días que quedaron como en el programa oficial al aceptar (pasados o con el plan cerrado) */
function propKeptTxt(L){const t=todayIso();const c=L.filter(d=>d>=t);return c.length?`${c.length>1?'los días':'el'} ${c.map(fmtD).join(', ')} quedó${c.length>1?'ron':''} como estaba${c.length>1?'n':''} (plan cerrado)`:'los días ya pasados quedaron como estaban'}
/** después de guardar: reflejar al momento (llega igual por la base), Deshacer y aviso */
/** reflejo local inmediato (oct 2026): la pantalla responde al instante y la base confirma después; devuelve cómo revertirlo si no se guardó */
function propOpt(P_,grp){const{sc,id,key}=P_;const k=COLS.acts;const had=S[k].get(id),hadA=ARCH[k].get(id);const doc=PROP.get(sc);const item=doc&&doc.items?doc.items[id]:undefined;
  propLocal(P_,grp);const mineA=S[k].get(id),mineR=ARCH[k].get(id),mineI=((PROP.get(sc)||{}).items||{})[id];
  /* oct 2026: revierte solo lo que sigue siendo nuestro reflejo; si mientras tanto llegó otra versión (otro ingeniero, el SC), se queda
     esa (antes se reponía la vieja y la fila quedaba fantasma, sin poder aceptarse ni rechazarse hasta recargar) */
  return()=>{if(S[k].get(id)===mineA&&ARCH[k].get(id)===mineR){if(had)S[k].set(id,had);else S[k].delete(id);if(hadA)ARCH[k].set(id,hadA);else ARCH[k].delete(id)}
    const d2=PROP.get(sc)||{sc,items:{}};if(((d2.items||{})[id])===mineI)PROP.set(sc,{...d2,items:{...(d2.items||{}),[id]:item}});LHH.delete(key);
    propUndoDrop(key);DV++;requestRender();propResync(sc,id)}}
/** tras una decisión que no se guardó: lo que hay de verdad en la base (la propuesta y la actividad), por si llegó otra versión mientras tanto */
function propResync(sc,id){if(!db)return;Promise.all([fcol('lhprop').doc(sc).get(),fcol('acts').doc(id).get()]).then(([pd,ad])=>{
    if(pd.exists)PROP.set(sc,{...pd.data(),id:sc});else PROP.delete(sc);
    const k=COLS.acts;if(!(S[k]&&S[k]._pm)){S[k]=new Map(S[k]);if(ARCH[k])ARCH[k]=new Map(ARCH[k]);colSet(k,id,ad.exists?{...actNorm(ad.data()),id}:null)}
    DV++;if(typeof gridRows!=='undefined')gridRows=null;requestRender();if(PMOD)propModalRender()}).catch(()=>{})}
/** quita del deshacer una decisión que no se guardó (sola o dentro de un «Aceptar todo») */
function propUndoDrop(key){for(let i=undoS.length-1;i>=0;i--){const g=undoS[i];
    if(g.prop&&g.prop.key===key){undoS.splice(i,1);break}
    if(g.props){const j=g.props.findIndex(p=>p.key===key);if(j>=0){const p=g.props[j];g.props.splice(j,1);const oi=g.indexOf(p.o);if(oi>=0)g.splice(oi,1);if(!g.props.length)undoS.splice(i,1);break}}}
  updUndo()}
function propLocal(P_,grp){const{sc,id,st,it,o,h,key,opt}=P_;const doc=PROP.get(sc);
  if(o){const k=COLS.acts;if(o.after.arch){S[k].delete(id);ARCH[k].set(id,{...clone(o.after),id})}else{ARCH[k].delete(id);S[k].set(id,{...clone(o.after),id})}DV++;
    const pr={sc,id,it,key,hk:1,o};
    /* «Aceptar todo» (oct 2026): un solo paso de deshacer para todo el lote */
    if(grp){grp.push(o);grp.props.push(pr);if(!undoS.includes(grp)){undoS.push(grp);if(undoS.length>150)undoS.shift();redoS.length=0}updUndo()}
    else{const g=[o];g.prop=pr;P_.g=g;undoS.push(g);if(undoS.length>150)undoS.shift();redoS.length=0;updUndo()}}
  LHH.set(key,{...h,id:key});const d2=PROP.get(sc)||doc||{sc,items:{}};PROP.set(sc,{...d2,items:{...(d2.items||{}),[id]:propAfterDecide(P_.raw)}});requestRender();
  if(!opt.bulk)toast((st==='ok'?'Propuesta aceptada':st==='shift'?`Aceptada desplazando al ${fmtD(opt.start)}`+(opt.merged?` · ${opt.merged} día${opt.merged>1?'s':''} no laborable${opt.merged>1?'s':''} se juntó con el día hábil siguiente (se sumaron sus cantidades)`:''):'Propuesta rechazada')+(st!=='rej'&&opt.kept&&opt.kept.length?` · ${propKeptTxt(opt.kept)}`:''),o?'Deshacer':null,o?undo:null);
  return'ok'}
/** devuelve una promesa con 'ok' o el motivo por el que no se aplicó; opt.bulk: sin preguntas ni avisos sueltos */
async function decideProp(sc,id,st,opt){const P_=await propPrep(sc,id,st,opt);if(typeof P_==='string')return P_;const{it,o,h,key,key0}=P_;opt=P_.opt;
  const say=m=>{if(!opt.bulk)toast(m)};
  PDBUSY.add(key0);let rb=null;let fin=null;
  try{if(!db)throw new PropStop('Sin conexión con la base.');
    rb=propOpt(P_);if(P_.g)P_.g.wait=new Promise(r=>{fin=r});
    await db.runTransaction(async tx=>{const pref=fcol('lhprop').doc(sc);const aref=fcol('acts').doc(id);
      const[ps,as]=await Promise.all([tx.get(pref),o?tx.get(aref):null]);const srvR=ps.exists?((ps.data()||{}).items||{})[id]:null;const srv=propSentOf(srvR);
      if(!srv)throw new PropStop('Esa propuesta ya la decidió otra persona.','gone');
      if(propVer(srv)!==propVer(it))throw new PropStop('El subcontratista cambió esta propuesta mientras la revisabas: revisa la versión nueva.','ver');
      if(o){const cur=as.exists?actNorm(as.data()):null;
        if(canon(cur?strip(cur):null)!==canon(o.before?strip(o.before):null))throw new PropStop('La actividad cambió hace un momento (otro usuario o un cambio que aún se estaba guardando). Vuelve a intentarlo.','act');
        const body=strip(clone(o.after));if(cur){const args=fsDiff(strip(cur),body,'acts',true);if(args.length)tx.update(aref,...args)}else tx.set(aref,body)}
      tx.update(pref,new firebase.firestore.FieldPath('items',id),propAfterDecide(srvR));tx.set(fcol('lhphist').doc(key),h)})}
  catch(e){PDBUSY.delete(key0);if(rb)rb();if(P_.g)P_.g.done=true;if(fin)fin();if(e&&e.lps){say(e.lps);return e.k}say('No se pudo registrar la respuesta: '+(e&&(e.code||e.message)||'error')+'. No se cambió nada.');return'err'}
  PDBUSY.delete(key0);if(P_.g)P_.g.done=true;if(fin)fin();
  return'ok'}
/** deshacer (o rehacer) una aceptación también devuelve (o vuelve a quitar) la propuesta del SC; el historial la marca, no se borra */
async function propUndoHook(g,back,quiet){if(g.props&&!g.prop){let n=0;for(const p of [...g.props])if(await propUndoHook({prop:p},back,true)==='ok')n++;
    if(back)toast(`Se deshizo «Aceptar todo»: ${n} propuesta${n===1?'':'s'} vuelve${n===1?'':'n'} a quedar pendiente${n===1?'':'s'}`,'Rehacer',redo);return}
  const P_=g.prop;if(!P_||!db)return;const{sc,id,it,key,hk}=P_;const FP=firebase.firestore.FieldPath;
  /* lo enviado tal como estaba (sin las marcas de la vista); si el SC ya tiene otro borrador, vuelve como versión enviada pendiente (sentV) */
  const sent=(()=>{const x={...it};delete x._dr;return x})();const asSV=x=>({after:x.after??null,base:x.base??null,ts:x.ts||0,by:x.by||'',n:x.n||'',sentAt:x.sentAt||0,sent0:x.sent0||x.sentAt||0,sig:x.sig||''});
  const ud={t:NOW(),by:me.email,n:me.name||''};const DEL=firebase.firestore.FieldValue.delete();
  try{const r=await db.runTransaction(async tx=>{const pref=fcol('lhprop').doc(sc);const ps=await tx.get(pref);const d=ps.exists?ps.data()||{}:{};const cur=(d.items||{})[id];const href=fcol('lhphist').doc(key);
      /* registros nuevos: el «deshecho» va en su documento de lhphist; los antiguos siguen en lhprop.hist */
      if(back){let nv=sent;if(cur){if(cur.sent){if(hk)tx.update(href,{undone:ud});return'new'}nv={...cur,sentV:asSV(sent)}}
        if(hk){tx.update(pref,new FP('items',id),nv);tx.update(href,{undone:ud})}else tx.update(pref,new FP('items',id),nv,new FP('hist',key,'undone'),ud);P_.nv=nv;return'ok'}
      const cs=propSentOf(cur);if(!cs||propVer(cs)!==propVer(it))return'new';const nx=propAfterDecide(cur);
      if(hk){tx.update(pref,new FP('items',id),nx);tx.update(href,{undone:DEL})}else tx.update(pref,new FP('items',id),nx,new FP('hist',key,'undone'),DEL);P_.nv=nx;return'ok'});
    if(r!=='ok'){if(!quiet)toast(back?'Se deshizo el cambio, pero la propuesta no vuelve a pendientes: el subcontratista ya envió otra para esa actividad.':'Se rehízo el cambio; la propuesta del subcontratista ya había cambiado y sigue pendiente.');return r}
    const mark=h=>{if(!h)return null;const nh={...h};if(back)nh.undone=ud;else delete nh.undone;return nh};
    if(hk){const nh=mark(LHH.get(key));if(nh)LHH.set(key,nh)}
    const d2=PROP.get(sc)||{sc,items:{}};const nh=hk?null:mark((d2.hist||{})[key]);
    PROP.set(sc,{...d2,items:{...(d2.items||{}),[id]:P_.nv??null},...(nh?{hist:{...(d2.hist||{}),[key]:nh}}:{})});requestRender();
    if(back&&!quiet)toast('Cambio deshecho: la propuesta vuelve a quedar pendiente de revisión','Rehacer',redo);return'ok'}
  catch(e){if(!quiet)toast('No se pudo devolver la propuesta a pendientes: '+(e&&(e.code||e.message)||'error'));return'err'}}
/** rechazar varias seguidas (todo lo visible): un solo aviso al final; no pide motivo (como rechazar una) */
/* rechazar varias de una vez: una transacción por subcontratista (no una por propuesta). Rechazar no toca el lookahead:
   relee lhprop/{sc}, quita las que siguen iguales (las que el SC cambió mientras tanto quedan pendientes) y deja
   una decisión por propuesta en lhphist, como rechazar una sola. */
async function rejectMany(L){let ok=0;const why={};const add=(k,n=1)=>{why[k]=(why[k]||0)+n};const FP=firebase.firestore.FieldPath;
  const by=new Map();for(const o of L){const doc=PROP.get(o.sc);const it=propSentOf(doc&&doc.items&&doc.items[o.id]);if(!it){add('gone');continue}if(!canDecide(o.id,it)){add('perm');continue}if(o.ver&&propVer(it)!==o.ver){add('ver');continue}
    if(!by.has(o.sc))by.set(o.sc,[]);by.get(o.sc).push({id:o.id,it})}
  if(!db){toast('Sin conexión con la base.');return}
  await Promise.all([...by.entries()].map(async([sc,items])=>{for(let i=0;i<items.length;i+=400){const part=items.slice(i,i+400);
    try{const n=await db.runTransaction(async tx=>{const pref=fcol('lhprop').doc(sc);const ps=await tx.get(pref);const srvI=(ps.exists?(ps.data()||{}).items:null)||{};
      const go=part.filter(({id,it})=>{const srv=propSentOf(srvI[id]);return srv&&propVer(srv)===propVer(it)});if(!go.length)return{n:0,skip:part.length};
      const args=[];const t0=NOW();
      go.forEach(({id,it},j)=>{args.push(new FP('items',id),propAfterDecide(srvI[id]));const off=S.act.get(id)||null;const base=it.base||off;const x=it.after||base||{};const am=S.amb.get(x.ambId);const t=t0+j;const late=propLate(it,off);
        tx.set(fcol('lhphist').doc(sc+'_'+id+'_'+t),{id,name:x.name||'',amb:am?am.code+' '+am.name:'',kind:!it.after?'del':!base?'new':'mod',from:base?rngTxt(base.days):'',to:it.after?rngTxt(it.after.days):'',st:'rej',note:'',t,by:me.email,n:me.name||'',pn:it.n||'',
          sc,actId:id,sk:lhhSk(sc,t),sentAt:it.sentAt||null,sent0:it.sent0||it.sentAt||null,late:late?{w:late.w,cut:late.cut}:null,lateNote:'',prop:propDiff(base,it.after),chg:null})});
      tx.update(pref,...args);return{n:go.length,skip:part.length-go.length}});
      ok+=n.n;if(n.skip)add('ver',n.skip)}
    catch(e){add('err',part.length);console.warn('rechazar',e)}}}));
  const W={ver:'el SC las cambió mientras tanto',perm:'no te corresponde decidirlas',err:'no se pudo guardar'};
  const rest=Object.entries(why).filter(([k])=>k!=='gone'&&k!=='busy');
  toast(`${ok} propuesta${ok===1?'':'s'} rechazada${ok===1?'':'s'}`+(rest.length?' · siguen pendientes: '+rest.map(([k,n])=>`${n} porque ${W[k]||k}`).join('; '):''));REVSEL=null;requestRender();if(PMOD)propModalRender()}
/** aceptar varias seguidas (todo lo visible, todo un SC): un solo aviso al final */
async function decideMany(L){let ok=0;const why={};
  /* las que llegaron fuera de plazo piden un solo motivo para todo el lote; sin motivo no se acepta ninguna */
  const nl=L.filter(o=>propLate(propSentOf(((PROP.get(o.sc)||{}).items||{})[o.id]),S.act.get(o.id))).length;let lateNote='';
  if(nl){const m=await uiAsk({title:`${nl} propuesta${nl>1?'s':''} fuera de plazo`,text:`${nl} de ${L.length===1?'esta propuesta':'estas '+L.length+' propuestas'} llegó${nl>1?'ron':''} después del corte (${propCutTxt()}).`,input:{label:'¿Por qué se aceptan? El motivo queda registrado con tu nombre en cada una.',required:true},ok:'Aceptar con este motivo',tone:'warn'});
    if(m==null||!m.trim()){toast(m==null?'No se aceptó ninguna.':'Escribe el motivo para aceptar las que llegaron fuera de plazo. No se aceptó ninguna.');return}lateNote=m.trim()}
  /* rápido (oct 2026): antes era una transacción por propuesta, una tras otra y todas sobre el mismo documento lhprop/{sc}
     (≈ medio segundo cada una). Ahora se preparan todas y se guarda UNA transacción por subcontratista (en partes de 120):
     relee lhprop/{sc} y las actividades; las que el SC o alguien cambió mientras tanto se saltan (quedan pendientes). */
  const add=(k,n=1)=>{why[k]=(why[k]||0)+n};const by=new Map();
  let kept=0;
  const take=P_=>{if(PDBUSY.has(P_.key0)){add('busy');return}if(!by.has(P_.sc))by.set(P_.sc,[]);by.get(P_.sc).push(P_)};
  /* o.st/o.opt: la fila que el ingeniero ajustó (días editados) se acepta con sus cambios en la misma transacción; o.ver: la versión vista */
  for(const o of L){const op_={...(o.opt||{}),bulk:true,lateNote,ver:o.ver};const P_=await propPrep(o.sc,o.id,o.st||'ok',op_);if(typeof P_==='string'){add(P_);continue}take(P_)}
  if(by.size&&!db){toast('Sin conexión con la base.');return}
  const FP=firebase.firestore.FieldPath;const GRP=[];GRP.props=[];let finAll;GRP.wait=new Promise(r=>{finAll=r});
  await Promise.all([...by.entries()].map(async([sc,items])=>{for(let i=0;i<items.length;i+=120){const part=items.slice(i,i+120);part.forEach(P_=>PDBUSY.add(P_.key0));
    const rbs=new Map(part.map(P_=>[P_,propOpt(P_,GRP)]));/* reflejo inmediato: lo que la base no guarde se revierte abajo */
    try{const done=await db.runTransaction(async tx=>{const pref=fcol('lhprop').doc(sc);
        const[ps,...cur]=await Promise.all([tx.get(pref),...part.map(P_=>P_.o?tx.get(fcol('acts').doc(P_.id)):null)]);const srvI=(ps.exists?(ps.data()||{}).items:null)||{};const go=[];const skip={};const sk=[];
        part.forEach((P_,j)=>{const srv=propSentOf(srvI[P_.id]);if(!srv||propVer(srv)!==propVer(P_.it)){const k_=srv?'ver':'gone';skip[k_]=(skip[k_]||0)+1;sk.push(P_);return}
          if(P_.o){const as=cur[j];const c=as.exists?actNorm(as.data()):null;if(canon(c?strip(c):null)!==canon(P_.o.before?strip(P_.o.before):null)){skip.act=(skip.act||0)+1;sk.push(P_);return}P_.cur=c}
          go.push(P_)});
        const args=[];for(const P_ of go){const aref=fcol('acts').doc(P_.id);
          if(P_.o){const body=strip(clone(P_.o.after));if(P_.cur){const d=fsDiff(strip(P_.cur),body,'acts',true);if(d.length)tx.update(aref,...d)}else tx.set(aref,body)}
          args.push(new FP('items',P_.id),propAfterDecide(srvI[P_.id]));tx.set(fcol('lhphist').doc(P_.key),P_.h)}
        if(args.length)tx.update(pref,...args);return{go,skip,sk}});
      done.sk.forEach(P_=>rbs.get(P_)());done.go.forEach(P_=>{PDBUSY.delete(P_.key0);ok++;if(P_.opt.kept&&P_.opt.kept.length)kept++});part.forEach(P_=>PDBUSY.delete(P_.key0));
      for(const[k,n]of Object.entries(done.skip))add(k,n)}
    catch(e){part.forEach(P_=>PDBUSY.delete(P_.key0));rbs.forEach(f=>f());add('err',part.length);console.warn('aceptar',e)}}}));GRP.done=true;finAll();
  const W={closed:'solo cambian días con el plan ya cerrado',late:'llegaron fuera de plazo y falta el motivo',arch:'la actividad está en la Papelera',ver:'el SC las cambió mientras tanto',act:'la actividad cambió en ese momento',amb:'su ambiente ya no existe',perm:'no te corresponde decidirlas',err:'no se pudo guardar'};
  const rest=Object.entries(why).filter(([k])=>k!=='gone'&&k!=='busy');
  toast(`${ok} propuesta${ok===1?'':'s'} aceptada${ok===1?'':'s'}`+(kept&&ok?` (en ${kept===1?'una':kept} quedaron como estaban los días pasados o con el plan cerrado)`:'')+(rest.length?' · siguen pendientes: '+rest.map(([k,n])=>`${n} porque ${W[k]||k}`).join('; '):''),GRP.props.length?'Deshacer':null,GRP.props.length?undo:null);REVSEL=null;requestRender();if(PMOD)propModalRender()}
/* superposición en la grilla (lo que proponen, sobre lo vigente) */
function propOverlay(){if(PM()||!canWrite)return null;const m=new Map();
  for(const doc of PROP.values())for(const[id,it0]of Object.entries(doc.items||{})){const it=propSentOf(it0);if(!it)continue;const off=S.act.get(id);if(!off)continue;const od=new Set(off.days||[]);const nd=new Set(it.after?propMerge(it.after,it.base||off,off,false).days||[]:[]);
    m.set(id,{add:new Set([...nd].filter(d=>!od.has(d))),del:new Set(it.after?[...od].filter(d=>!nd.has(d)):[...od]),sc:doc.sc,rm:!it.after})}
  return m}
function pmBases(){if(!PM()||!ACT_OFF)return null;const has=myScsI().some(sc=>propItems(sc).length);if(!has)return null;const m=new Map();
  for(const x of ACT_OFF.values()){const pid=pisoOfAct(x.id);if(!m.has(pid))m.set(pid,{snap:{}});m.get(pid).snap[x.id]=x.days||[]}
  for(const p of S.pis.values())if(!m.has(p.id))m.set(p.id,{snap:{}});return m}
/* barra superior del lookahead */
function renderPropBar(){rvPanelSync();const v=$('#main .view');if(!v)return;let pb=$('#ppbar');if(!pb){const bar=v.querySelector('.bar');if(!bar)return;pb=document.createElement('div');pb.id='ppbar';bar.after(pb);pb.onclick=propBarClick;pb.onchange=e=>{if(e.target.id==='rvctx'){U.revCtx=e.target.checked;requestRender()}}}
  let h='';
  if(me&&me.role==='sc'&&!(U.ver&&U.verMode==='ver')){const its=myScsI().flatMap(sc=>propItems(sc));const un=its.filter(o=>!o.it.sent).length,se=its.length-un;
    ensureLhh();const hist=histOf(myScsI());let seen=0;try{seen=+localStorage.getItem('lps.pseen')||0}catch(e){}const nw=hist.filter(x=>x.t>seen).length;
    if(propClosed()){h=`<div class="ppb sc ppclosed"><div><b>🔒 Propuestas cerradas</b> · ${propNever()?'aún no habilitadas':propManual()?'el ingeniero las bloqueó':`pasó el corte (${esc(fmtCut(propCloseAt()))})`}<span class="ppx">. El ingeniero está programando el lookahead: por ahora es <b>solo lectura</b>. Podrás proponer cambios para la siguiente semana cuando él lo habilite.</span></div>
      <div class="ppa">${se?`<span class="pill neu">${se} en revisión</span>`:''}${its.length?'<button class="ib" data-pp="mine">Ver mis cambios</button>':''}${hist.length?`<button class="ib" data-pp="hist">Respuestas${nw?` <b class="bc">${nw}</b>`:''}</button>`:''}</div></div>`}
    else h=`<div class="ppb sc"><div><b>Modo propuesta</b> · <span class="mu">abierto hasta el ${esc(fmtCut(propCloseAt()))}</span><span class="ppx"> · edita los días, metrados y actividades de <b>${esc(myScsI().map(c=>conOf(c).name).join(', '))}</b>. Lo de los demás es solo lectura. Tus cambios se aplican cuando el ingeniero responsable del piso los acepte.</span></div>
      <div class="ppa">${un?`<span class="pill warn">${un} sin enviar</span>`:''}${se?`<span class="pill neu">${se} en revisión</span>`:''}${its.length?'<button class="ib" data-pp="mine">Ver mis cambios</button>':''}<button class="ib pri" data-pp="send"${un?'':' disabled title="Todavía no cambiaste nada: edita días, metrados o actividades de tu partida y luego envía"'}>${un?'Enviar al ingeniero responsable ('+un+')':'Sin cambios por enviar'}</button>${hist.length?`<button class="ib" data-pp="hist">Respuestas${nw?` <b class="bc">${nw}</b>`:''}</button>`:''}</div></div>`}
  else if(canWrite&&!(U.ver&&U.verMode==='ver')){const by=revCounts();let oth=0;for(const doc of PROP.values())for(const[id,it0]of Object.entries(doc.items||{})){const it=propSentOf(it0);if(it&&!canDecide(id,it))oth++}
    const cl=propClosed();const WB=cl?`<button class="ib pri" data-pp="open" title="Los SC vuelven a proponer hasta el próximo corte">🔓 Habilitar propuestas</button>`:`<button class="ib" data-pp="close" title="Los SC quedan en solo lectura ya, sin esperar al corte">🔒 Bloquear propuestas</button>`;
    if(cl)h=`<div class="ppb ed ppclosed"><div><b>🔒 Propuestas de los SC cerradas</b> ${propNever()?'(aún no las habilitas)':propManual()?`(las bloqueaste el ${esc(fmtCut(propCloseAt()))})`:`desde el corte (${esc(fmtCut(propCloseAt()))})`}<span class="ppx">: los subcontratistas solo ven. Programa el lookahead; cuando termines, habilítalas: se cierran solas en el corte.</span>${by.size?' · '+[...by.entries()].map(([sc,n])=>`<span class="ppsc" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></span>`).join(' '):''}</div><div class="ppa">${by.size?'<button class="ib" data-pp="rev">Revisar propuestas</button>':''}${WB}</div></div>`;
    else if(by.size||oth)h=`<div class="ppb ed"><div><b>Propuestas de subcontratistas</b> · ${by.size?[...by.entries()].map(([sc,n])=>`<span class="ppsc" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></span>`).join(' '):'<span class="mu">ninguna en tus pisos</span>'}${oth?`<span class="mu"> · ${oth} de pisos a cargo de otros (solo las ves)</span>`:''}<span class="mu ppx"> · en la grilla: días propuestos rayados con borde de color, días que se quitarían tachados · rayado tenue con borde punteado = liberado (ya figura terminada)</span></div><div class="ppa">${by.size?'<button class="ib pri" data-pp="rev">Revisar propuestas</button>':'<button class="ib" data-pp="list">Ver propuestas</button>'}${WB}</div></div>`;
    else h=`<div class="ppb ed"><div><b>🔓 Propuestas de los SC abiertas</b> · <span class="mu">hasta el ${esc(fmtCut(propCloseAt()))}</span><span class="mu ppx"> · aún no llega ninguna</span></div><div class="ppa">${WB}</div></div>`;h=''}
  if(propErr)h+=`<div class="callout">No se pudieron leer las propuestas (${esc(propErr)}). Falta publicar las reglas nuevas de Firestore.</div>`;
  if(pb.dataset.h!==h){pb.innerHTML=h;pb.dataset.h=h}pb.hidden=!h}
/* Rechazar: motivo con un toque (oct 2026). El motivo de los botones queda en el historial (`why`) y el SC no lo ve; el texto libre sigue siendo el «Comentario» que sí ve. */
const REJ_WHY=['Fuera de secuencia','Sin frente liberado','Restricción abierta','Cruce con otro SC'];
function rejPop(b,run){openPop(b,`<div class="ph">Rechazar propuesta · motivo</div><div class="rvwhy">${REJ_WHY.map((w,i)=>`<button class="ib" data-do="why" data-w="${i}">${w}</button>`).join('')}</div><div class="qrow"><input id="prn" placeholder="Otro motivo (opcional)" style="width:200px;text-align:left"><button data-do="go">Rechazar</button></div>`,
  {why:d=>run({why:REJ_WHY[+d.w]||''}),go:()=>run({note:($('#prn')||{}).value||''})})}
function propBarClick(e){const t=e.target;let r;
  if((r=t.closest('[data-rvsc]'))){U.revSc=r.dataset.rvsc;REVSEL=null;requestRender();return}
  if((r=t.closest('[data-rvnav]'))){revGo(+r.dataset.rvnav);return}
  if((r=t.closest('[data-rvmv]'))){if(!REVSEL){toast('Elige en la grilla la fila que quieres mover.');return}revAct(r.dataset.rvmv,REVSEL.id,r);return}
  if(t.closest('[data-rvk0]')){if(REVSEL){REVSEL.k=0;REVED.delete(REVSEL.id)}requestRender();return}
  if(t.closest('[data-rvexit]')){U.rev=false;REVSEL=null;REVED.clear();requestRender();return}
  if(t.closest('[data-rvrej]')){let L=revVisItems();if(!L.length){const A=revItems();if(!A.length){toast('No hay propuestas pendientes.');return}
      /* ninguna se ve en la grilla: se explica por qué y se pueden rechazar igual (rechazar no cambia el lookahead) */
      uiAsk({title:`¿Rechazar las ${A.length} propuestas${U.revSc?' de '+conOf(U.revSc).name:''}?`,text:'Ninguna se ve en la grilla:',list:revHiddenWhy(A),note:'El lookahead no cambia y cada subcontratista lo ve en «Respuestas».',ok:`Rechazar las ${A.length}`,tone:'danger'}).then(ok=>{if(ok)rejectMany(A)});return}const oc=revItems().length-L.length;
    const Lv=L.map(o=>({...o,ver:RVSEEN.get(o.id)}));uiAsk({title:`¿Rechazar ${L.length>1?'las '+L.length+' propuestas':'la propuesta'} que muestra la grilla?`,text:'El lookahead no cambia y cada subcontratista lo ve en «Respuestas».',note:oc?`Las otras ${oc} (ocultas por los filtros o plegadas) siguen pendientes.`:'',ok:`Rechazar ${L.length}`,tone:'danger'}).then(ok=>{if(ok)rejectMany(Lv)});return}
  if(t.closest('[data-rvall]')){const L=revVisItems();if(!L.length){toast('No hay propuestas en lo que muestra la grilla con estos filtros.');return}const oc=revItems().length-L.length;
    /* oct 2026: la fila que ajustaste (días editados o movida con ‹ ›) se acepta con tus cambios; las demás, como las envió el SC */
    /* oct 2026: cada fila que ajustaste se acepta con sus cambios; las que vaciaste quedan pendientes; todo en una transacción por SC */
    const A=L.map(o=>({o,a:revAcc(o.id)}));const emp=A.filter(x=>x.a[0]==='empty').map(x=>x.o);const ed=A.filter(x=>x.a[0]!=='empty'&&x.a[1].days).map(x=>x.o);
    const nm=o=>'«'+((o.it.after&&o.it.after.name)||'una actividad')+'»';const nOk=L.length-emp.length;
    if(!nOk){toast('Las filas visibles quedaron sin días: elige los nuevos días o recházalas con ✗.');return}
    const lst=[];if(ed.length)lst.push(ed.length===1?`${nm(ed[0])} se acepta con tus cambios.`:`${ed.length} filas se aceptan con tus cambios.`);
    if(emp.length)lst.push(`${emp.length===1?nm(emp[0])+' quedó':emp.length+' filas quedaron'} sin días: sigue${emp.length===1?'':'n'} pendiente${emp.length===1?'':'s'}.`);if(oc)lst.push(`Las otras ${oc} (ocultas por los filtros o plegadas) siguen pendientes.`);
    const sel=A.filter(x=>x.a[0]!=='empty').map(({o,a})=>({sc:o.sc,id:o.id,ver:RVSEEN.get(o.id),st:a[0],opt:a[1]}));
    uiAsk({title:`¿Aceptar ${nOk>1?'las '+nOk+' propuestas':'la propuesta'} que muestra la grilla?`,text:ed.length?'Las demás, como las envió el subcontratista.':'Se aceptan tal como las envió el subcontratista.',list:lst,ok:`Aceptar ${nOk}`,tone:'ok'}).then(async ok=>{if(!ok)return;
      await decideMany(sel);for(const o of sel)if(!revItems().some(q=>q.id===o.id))REVED.delete(o.id)});return}
  const b=t.closest('[data-pp]');if(!b)return;const k=b.dataset.pp;
  if(k==='open'){propOpenWin();return}
  if(k==='close'){propCloseWin();return}
  if(k==='send')sendProp();else if(k==='mine')propModal('mine');else if(k==='hist'){try{localStorage.setItem('lps.pseen',String(NOW()))}catch(er){}propModal('hist');requestRender()}else if(k==='rev'){if(U.revSc&&!revCounts().has(U.revSc))U.revSc='';if(!U.rev)REVED.clear();U.rev=true;REVSEL=null;requestRender();setTimeout(()=>revGo(1),200)}else if(k==='list')propModal('rev')}
let PMOD=null;
function propModal(mode){PMOD={mode};let el=$('#ppm');if(!el){el=document.createElement('div');el.id='ppm';el.className='ppm';el.innerHTML='<div class="ppc"></div>';document.body.appendChild(el);el.onclick=propModalClick}propModalRender()}
function propModalRender(){const el=$('#ppm');if(!el||!PMOD)return;const mode=PMOD.mode;let h='';
  const card=(sc,id,it,ed)=>{const off=(ACT_OFF&&S.act._pm?ACT_OFF:S.act).get(id);const x=it.after||off||it.base||{};const am=S.amb.get(x.ambId);const p=am?S.pis.get(pisoOfAmb(am.id)):null;const D=propDesc(id,it);const AL=ed?propAlerts(sc,id,it):[];const LT=propLate(it,off);
    /* hora de envío de cada cambio (no la del último envío del grupo) y si llegó fuera de plazo */
    const snt=it.sent&&it.sentAt?` · enviado ${fmtT(it.sentAt)}`+(it.sent0&&it.sent0!==it.sentAt?` (primer envío ${fmtT(it.sent0)})`:''):'';
    return`<div class="ppi k-${D.kind}" data-sc="${sc}" data-id="${id}"><div class="ppt"><span class="ppk">${D.kind==='new'?'NUEVA':D.kind==='del'?'QUITAR':'CAMBIO'}</span>${LT?`<span class="ppk late" title="${esc(lateTxt(LT))}">FUERA DE PLAZO</span>`:''}<b>${esc(x.name||'(sin nombre)')}</b><small>${p?esc(p.code)+' · ':''}${am?esc(am.code+' · '+am.name):''}${ed?' · propuesto por '+esc(it.n||''):''}<span class="ppsent">${snt}</span>${!ed?(it.sent?' · <em>en revisión</em>':' · <em class="w">sin enviar</em>'):''}</small></div>${LT?`<p class="pplate">${esc(lateTxt(LT))}${ed?' · para aceptarla se pide el motivo':' · el ingeniero decide si la acepta'}</p>`:''}
      <ul>${D.lines.map(l=>`<li>${l}</li>`).join('')}</ul>${AL.length?`<ul class="ppal">${AL.map(a=>`<li class="${a.t}">⚠ ${a.h}</li>`).join('')}</ul>`:''}
      <div class="ppbt">${ed?(canDecide(id,it)?`<button class="ib pri" data-pd="ok">✓ Aceptar</button>${it.after&&(it.after.days||[]).length?'<button class="ib" data-pd="shift">Aceptar desplazando…</button>':''}<button class="ib" data-pd="rej">Rechazar…</button>`:`<span class="mu">${esc(propWho(id,it))}</span>`):'<button class="ib" data-pd="drop">Descartar este cambio</button>'}</div></div>`};
  if(mode==='rev'){const scs=[...PROP.values()].filter(d=>Object.values(d.items||{}).some(it=>propSentOf(it))).sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name));
    h=`<div class="pph"><b>Propuestas de los subcontratistas</b><button class="kx" data-px>×</button></div>`+(scs.length?scs.map(d=>{const L=Object.entries(d.items||{}).map(([id,it])=>[id,propSentOf(it)]).filter(([,it])=>it);const nd=L.filter(([id,it])=>canDecide(id,it)).length;return`<section><div class="ppsh" style="--c:${conOf(d.sc).color}"><i></i><b>${esc(conOf(d.sc).name)}</b><span>${L.length} cambio${L.length>1?'s':''}${d.sentAt?' · último envío '+fmtT(d.sentAt):''}${(()=>{const k=L.filter(([id,it])=>propLate(it,S.act.get(id))).length;return k?` · <b class="w">${k} fuera de plazo</b>`:''})()}</span>${nd?`<button class="ib pri" data-pall="${d.sc}">✓ Aceptar ${nd===L.length?'todo':'los míos ('+nd+')'}</button>`:''}</div>${L.map(([id,it])=>card(d.sc,id,it,true)).join('')}</section>`}).join(''):'<p class="mu" style="padding:16px">No hay propuestas pendientes.</p>')}
  else if(mode==='mine'){const L=myScsI().flatMap(sc=>propItems(sc));h=`<div class="pph"><b>Mis cambios propuestos</b><button class="kx" data-px>×</button></div>${L.map(o=>card(o.sc,o.id,o.it,false)).join('')||'<p class="mu" style="padding:16px">No tienes cambios.</p>'}`}
  else{const hist=histOf(myScsI()).slice(0,60);const ST_={ok:'✓ Aceptado',shift:'↔ Aceptado con otra fecha',rej:'✗ Rechazado'};
    h=`<div class="pph"><b>Respuestas del ingeniero</b><button class="kx" data-px>×</button></div>${hist.map(x=>`<div class="ppi r-${x.st}"><div class="ppt"><span class="ppk">${ST_[x.st]||x.st}</span>${x.undone?'<span class="ppk">DESHECHO</span>':''}<b>${esc(x.name)}</b><small>${esc(x.amb)} · ${fmtD(ldt((x.t)))} ${hhmm(x.t)} · ${esc(x.n)}${x.sentAt?' · enviado '+fmtT(x.sentAt):''}</small></div><ul>${x.kind==='del'?'<li>Pedido de quitar la actividad</li>':`<li>${x.from?esc(x.from)+' → ':''}<b>${esc(x.to)}</b></li>`}${histChgHtml(x)}${x.late?`<li class="w">${esc(lateTxt(x.late))}${x.lateNote?` · aceptada por: “${esc(x.lateNote)}”`:''}</li>`:''}${x.note?`<li>Comentario: “${esc(x.note)}”</li>`:''}</ul></div>`).join('')||'<p class="mu" style="padding:16px">Aún no hay respuestas.</p>'}`}
  const c=el.firstChild;if(c.dataset.h!==h){const st=c.scrollTop;c.innerHTML=h;c.dataset.h=h;c.scrollTop=st}}
function propModalClick(e){const t=e.target;const el=$('#ppm');if(t===el||t.closest('[data-px]')){el.remove();PMOD=null;return}let b;
  if((b=t.closest('[data-pall]'))){const sc=b.dataset.pall;const L=Object.entries((PROP.get(sc)||{}).items||{}).filter(([id,it])=>propSentOf(it)&&canDecide(id,propSentOf(it)));
    /* oct 2026: con días editados en la grilla de revisión, se aceptan con esos cambios (antes se ignoraban); las vacías quedan pendientes */
    decideMany(L.map(([id])=>{const a=revOn()?revAcc(id):['ok',{}];return a[0]==='empty'?null:{sc,id,st:a[0],opt:a[1]}}).filter(Boolean));return}
  if(!(b=t.closest('[data-pd]')))return;const card=b.closest('.ppi');const sc=card.dataset.sc,id=card.dataset.id;const k=b.dataset.pd;
  if(k==='drop'){savePropItem(sc,id,null);setTimeout(propModalRender,50);return}
  if(k==='ok'){const a=revOn()?revAcc(id):['ok',{}];if(a[0]==='empty'){toast('La fila no tiene días: elige los nuevos días en la grilla o recházala.');return}decideProp(sc,id,a[0],a[1]).then(r=>{if(r==='ok')REVED.delete(id);propModalRender()});return}
  if(k==='rej'){rejPop(b,o=>{decideProp(sc,id,'rej',o).then(propModalRender)});return}
  if(k==='shift'){const it=propSentOf(PROP.get(sc).items[id]);const ds=[...(it.after.days||[])].sort();
    openPop(b,`<div class="ph">Aceptar desplazando</div><div class="ptx">Propuesto: ${esc(rngTxt(ds))}. Elige el nuevo día de inicio; se mueve todo el bloque (días hábiles, lunes a sábado).</div><div class="qrow"><input type="date" id="pst" value="${ds[0]}"><button data-do="go">Aceptar</button></div>`,
      {go:()=>{const v=($('#pst')||{}).value;if(!v){toast('Elige una fecha.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}decideProp(sc,id,'shift',{start:v}).then(propModalRender)}});return}}

/* =====================================================================
   ETAPA 30 · Modo revisión de propuestas dentro de la grilla
   ===================================================================== */
U.rev=false;U.revSc='';U.revCtx=false;let REVSEL=null;
/* oct 2026: los días editados al revisar se guardan POR FILA (id → {days, v}) mientras dure la revisión. Antes había uno solo
   (REVSEL.days): editar otra fila borraba en silencio lo hecho en la anterior. v = versión de la propuesta (propVer): si el SC la
   reenvía mientras revisas, la edición de esa fila se descarta (revEdPrune avisa). days:[] = la vaciaste para elegir otros días. */
const REVED=new Map();
/* RVSEEN: versión de cada propuesta tal como se dibujó por última vez (revSwap): se decide esa, no una que llegó mientras tanto */
const RVSEEN=new Map();
function revEd(id){const e=REVED.get(id);return e?e.days:null}
/** días y cantidades editados de una fila (o los propuestos, si aún no se tocó) */
function revEdGet(id,it){const e=REVED.get(id);if(e)return e;const a=it.after||{};return{days:[...new Set(a.days||[])].sort(),qty:a.qty?{...a.qty}:undefined,v:propVer(it)}}
function revEdSet(id,it,days,qty){const ds=[...new Set(days)].sort();let q=qty;if(q){const o={};for(const d of ds)if(d in q)o[d]=q[d];q=o}REVED.set(id,{days:ds,qty:q,v:propVer(it)})}
function revEdPrune(){if(!REVED.size)return;const gone=[];for(const[id,e]of REVED){let it=null;for(const d of PROP.values()){const x=propSentOf(d.items&&d.items[id]);if(x){it=x;break}}
    if(!it){REVED.delete(id);continue}if(propVer(it)!==e.v){REVED.delete(id);gone.push(it.after&&it.after.name||'una actividad')}}
  if(gone.length)setTimeout(()=>toast(`El subcontratista reenvió ${gone.length===1?'«'+gone[0]+'»':gone.length+' propuestas'}: se descartó lo que editaste ahí.`),0)}
const revOn=()=>!!(U.rev&&canWrite&&!PM()&&U.tab==='look'&&!U.cliv&&!(U.ver&&U.verMode==='ver'));
function revItems(){const L=[];for(const doc of PROP.values()){if(U.revSc&&doc.sc!==U.revSc)continue;for(const[id,it0]of Object.entries(doc.items||{})){const it=propSentOf(it0);if(it&&canDecide(id,it))L.push({sc:doc.sc,id,it})}}return L}
/* las que la grilla muestra con los filtros vigentes (búsqueda, piso, sector, partida…): «Aceptar todo lo visible» solo toma estas */
function revVisItems(){const V=RVVIS;return V?revItems().filter(o=>V.has(o.id)):[]}
/* por qué no se ven en la grilla las propuestas pendientes (para explicarlo y poder rechazarlas igual) */
function revHiddenWhy(L){const V=RVVIS||new Set();const why={};const add=k=>{why[k]=(why[k]||0)+1};const P_=new Set(pisos().map(p=>p.id));
  for(const{id,it}of L){if(V.has(id))continue;const o=S.act.get(id)||null;const x=it.after?{...(o||{}),...it.after}:o;
    if(!x){add('su actividad ya no existe');continue}
    const a=S.amb.get(x.ambId);if(!a){add('su ambiente fue eliminado o archivado');continue}
    const sc=S.sec.get(a.sectorId);if(!sc||!P_.has(pisoOfAmb(x.ambId))){add('su sector o piso fue eliminado o archivado');continue}
    if(U.piso&&pisoOfAmb(x.ambId)!==U.piso){add('están en otro piso');continue}
    if(U.sector&&a.sectorId!==U.sector){add('están en otro sector');continue}
    if(!scOk(x.sc)){add('el filtro de subcontratista las oculta');continue}
    if(U.q.trim()||U.acts.length||U.onlyWin||U.onlyRestr||U.onlyObs||U.day||U.wkF){add('otros filtros de la vista las ocultan');continue}
    add('su sector o ambiente está plegado')}
  return Object.entries(why).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${n} porque ${k}`)}
function revCounts(){const m=new Map();for(const doc of PROP.values())for(const[id,it0]of Object.entries(doc.items||{})){const it=propSentOf(it0);if(it&&canDecide(id,it))m.set(doc.sc,(m.get(doc.sc)||0)+1)}return m}
/* durante el render, la grilla muestra lo propuesto encima de lo vigente */
function revSwap(){const off=S.act;const v=new Map(off);
  revEdPrune();RVSEEN.clear();for(const{sc,id,it}of revItems()){RVSEEN.set(id,propVer(it));const o=off.get(id)||null;const e=REVED.get(id);const ed=!!(e&&it.after);const af=ed?propDays(e.qty!==undefined?{...it.after,qty:e.qty}:it.after,e.days):it.after;
    if(!it.after){if(o)v.set(id,{...o,_rv:{off:o,sc,del:true,n:it.n,late:propLate(it,o)}})}
    else if(!o){if(S.amb.has(it.after.ambId))v.set(id,{...clone(af),id,_rv:{off:null,sc,isNew:true,n:it.n,late:propLate(it,null)}})}
    /* lo que se verá al aceptar: lo vigente + solo lo que la propuesta cambió (no todo el objeto que armó el SC) */
    else v.set(id,{...propProtect(propMerge(clone(af),it.base||o,o,ed),o,propFrozenFn(id,pisoOfAmb(o.ambId))),id,_rv:{off:o,sc,n:it.n,late:propLate(it,o)}})}
  S.act=v;return()=>{S.act=off;RVCIX.src=null;RVCIX.m=null}}
function revShift(x){const o=x._rv&&x._rv.off;if(!o||x._rv.del)return 0;const a=[...(o.days||[])].sort()[0],b=[...(x.days||[])].sort()[0];if(!a||!b)return 0;return wdist(a,b)}
/* (auditoría de código 08/10, L9) índice ambiente → actividades, armado una vez por cada mapa de S.act (en revisión, revSwap arma uno nuevo en cada dibujo) */
const RVCIX={src:null,n:-1,m:null};
function revAmbIx(){if(RVCIX.src!==S.act||RVCIX.n!==S.act.size||!RVCIX.m){const m=new Map();for(const y of S.act.values()){const L=m.get(y.ambId);if(L)L.push(y);else m.set(y.ambId,[y])}RVCIX.src=S.act;RVCIX.n=S.act.size;RVCIX.m=m}return RVCIX.m}
function revConflicts(x){const out=new Map();if(!x._rv||x._rv.del)return out;const ds=new Set(x.days||[]);
  /* también contra las otras propuestas pendientes (con los días que proponen), no solo contra lo vigente */
  for(const y of revAmbIx().get(x.ambId)||[]){if(y.id===x.id||y.ambId!==x.ambId||y.sc===x.sc||(y._rv&&y._rv.del))continue;(y.days||[]).forEach(d=>{if(ds.has(d)){const L=out.get(d)||[];L.push(conOf(y.sc).name+' · '+y.name+(y._rv?' (propuesta)':''));out.set(d,L)}})}return out}
function revBarHtml(){const cnt=revCounts();const L=revItems();const tot=L.length;const idx=REVSEL?L.findIndex(o=>o.id===REVSEL.id):-1;
  const nv=revVisItems().length;const so=REVSEL&&L.find(o=>o.id===REVSEL.id);const soEd=so?revEd(so.id):null;const can=!!(so&&so.it.after&&(soEd||so.it.after.days||[]).length);const d=can?'':' disabled title="Elige en la grilla una fila con días propuestos"';
  const nl=L.filter(o=>propLate(o.it,S.act.get(o.id))).length;
  /* oct 2026: panel lateral derecho plegable (antes una barra arriba que cargaba la parte superior) */
  const chips=`<button class="${!U.revSc?'on':''}" data-rvsc="">Todos <b>${[...cnt.values()].reduce((a,b)=>a+b,0)}</b></button>${[...cnt.entries()].sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name)).map(([sc,n])=>`<button class="${U.revSc===sc?'on':''}" data-rvsc="${sc}" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></button>`).join('')}`;
  const nEd=[...REVED.keys()].filter(id=>L.some(o=>o.id===id)).length;const otros=nEd-(soEd?1:0);const oT=otros>0?` · ${otros} fila${otros>1?'s':''} más con días editados`:'';
  const edit=soEd&&!soEd.length?`<div class="rvpsel"><span class="pill warn">${esc((so.it.after&&so.it.after.name)||'Actividad')}: sin días · elige los nuevos días en la grilla o recházala con ✗${oT}</span><button class="ib" data-rvk0>Volver a lo propuesto</button></div>`
    :soEd?`<div class="rvpsel"><span class="pill warn">${esc((so.it.after&&so.it.after.name)||'Actividad')}: días editados (${esc(rngTxt(soEd))}) · ✓ en la fila para aceptar así${oT}</span><button class="ib" data-rvk0>Volver a lo propuesto</button></div>`
    :otros>0&&!(REVSEL&&REVSEL.k)?`<div class="rvpsel"><span class="pill">${otros} fila${otros>1?'s':''} con días editados: se aceptan con tus cambios (✓ en cada una o «Aceptar todo»)</span></div>`
    :REVSEL&&REVSEL.k?(()=>{const x=S.act.get(REVSEL.id);const k=REVSEL.k;return`<div class="rvpsel"><span class="pill warn">${esc(x&&x.name||'Actividad')}: movida ${Math.abs(k)} día${Math.abs(k)>1?'s':''} hábil${Math.abs(k)>1?'es':''} ${k>0?'después':'antes'} · ✓ en la fila para aceptar así</span><button class="ib" data-rvk0>Volver a lo propuesto</button></div>`})():'';
  return`<div class="rvhd"><b>Propuestas pendientes <span class="rvpn">${tot}</span></b><button class="ib" data-rvfold title="Plegar el panel (sigues en la revisión)" aria-label="Plegar panel">›</button></div>
    <div class="rvbody"><div class="rvchips">${chips}</div>
    <label class="chk"><input type="checkbox" id="rvctx"${U.revCtx?' checked':''}> Ver todo el contexto</label>${nl?`<span class="pill bad" title="Enviadas después del ${esc(propCutTxt())}: para aceptarlas se pide el motivo">${nl} fuera de plazo</span>`:''}
    <div class="rvnav"><button class="ib" data-rvnav="-1"${tot?'':' disabled'}>‹ Anterior</button><span class="rvpos">${tot?(idx>=0?idx+1:'–')+' de '+tot:'Sin propuestas'}</span><button class="ib" data-rvnav="1"${tot?'':' disabled'}>Siguiente ›</button></div>
    <div class="rvmv"><button class="ib" data-rvmv="l"${d||' title="Mover lo propuesto un día hábil antes"'} aria-label="Un día antes">‹</button><button class="ib" data-rvmv="r"${d||' title="Mover lo propuesto un día hábil después"'} aria-label="Un día después">›</button><button class="ib" data-rvmv="date"${d||' title="Aceptar con otra fecha de inicio…"'}>📅 Otra fecha</button></div>${edit}
    <div class="rvall"><button class="ib pri" data-rvall${nv?'':' disabled'} title="Acepta, tal como las envió el subcontratista, solo las propuestas que muestra la grilla con los filtros actuales (lo movido con ‹ › no cuenta: eso se acepta con ✓ en la fila)">✓ Aceptar todo lo visible (${nv}${nv!==tot?' de '+tot:''})</button>${nv||!tot?`<button class="ib" data-rvrej${nv?'':' disabled'} title="Rechaza las propuestas que muestra la grilla con los filtros actuales: el lookahead no cambia">✗ Rechazar todo lo visible (${nv})</button>`:`<button class="ib" data-rvrej title="Ninguna se ve en la grilla (${esc(revHiddenWhy(L).join('; '))}). Rechazarlas no cambia el lookahead">✗ Rechazar las ${tot} (no se ven)</button>`}</div>
    <div class="rvft"><button class="ib" data-pp="list">Lista</button><button class="ib" data-rvexit>Salir de la revisión</button></div>
    <div class="mu rvhelp">Tenue = vigente · intenso = propuesto · toca un día para agregarlo o quitarlo · mueve la fila elegida con <b>‹ ›</b> · ✓ acepta · ✗ rechaza</div></div>`}
/** panel lateral de revisión: solo existe mientras hay propuestas pendientes; plegado queda una pestaña con el número */
/* oct 2026 (decidido con el dueño): en pantallas angostas (tablet) el panel arranca plegado, porque tapaba los días; luego vale lo que elijas */
const rvFold=rev=>{let v=null;try{v=localStorage.getItem('lps.rvfold')}catch(e){}return v==null?!!rev&&innerWidth<1280:v==='1'};
function rvPanelSync(){let el=document.getElementById('rvpanel');
  const gone=()=>{if(el)el.remove()};
  if(typeof revOn==='function'&&revOn()&&!revItems().length){
    /* oct 2026: el SC elegido se quedó sin pendientes (p. ej. tras «Rechazar todo lo visible») pero otros SC aún tienen: se pasa a «Todos».
       Antes salía de la revisión con el filtro del SC puesto, y «Revisar propuestas» volvía a salir al instante sin mostrar nada. */
    if(U.revSc&&revCounts().size){const n=conOf(U.revSc).name;U.revSc='';REVSEL=null;requestRender();toast(`${n} ya no tiene propuestas pendientes: se muestran las de los demás subcontratistas.`);return}
    /* ya no queda nada por revisar: sale solo de la revisión */U.rev=false;U.revSc='';REVSEL=null;REVED.clear();gone();requestRender();return}
  let mode='',h='',cls='rvpanel';let f=rvFold(false);
  if(typeof revOn==='function'&&revOn()){mode='rev';f=rvFold(true);h=f?`<button class="rvtab" data-rvfold title="Abrir el panel de propuestas pendientes">‹ Propuestas <span class="rvpn">${revItems().length}</span></button>`:revBarHtml()}
  else if(canWrite&&!PM()&&U.tab==='look'&&!U.cliv&&!(U.ver&&U.verMode==='ver')&&me&&me.role!=='sc'){
    /* oct 2026: la barra general «Propuestas de subcontratistas» vive aquí, a la derecha: solo hay panel si hay propuestas pendientes */
    const by=revCounts();let oth=0;for(const doc of PROP.values())for(const[id,it0]of Object.entries(doc.items||{})){const it=propSentOf(it0);if(it&&!canDecide(id,it))oth++}
    const cl=propClosed();const tot=[...by.values()].reduce((x,y)=>x+y,0);
    if(by.size||oth){mode='gen';h=f?`<button class="rvtab" data-rvfold title="Abrir el panel de propuestas pendientes">‹ Propuestas <span class="rvpn">${tot||oth}</span></button>`
      :`<div class="rvhd"><b>Propuestas pendientes <span class="rvpn">${tot||oth}</span></b><button class="ib" data-rvfold title="Plegar el panel" aria-label="Plegar panel">›</button></div>
        <div class="rvbody">${by.size?`<div class="rvchips">${[...by.entries()].sort((x,y)=>conOf(x[0]).name.localeCompare(conOf(y[0]).name)).map(([sc,n])=>`<span class="ppsc" style="--c:${conOf(sc).color}"><i></i>${esc(conOf(sc).name)} <b>${n}</b></span>`).join('')}</div>`:'<span class="mu">Ninguna en tus pisos</span>'}${oth?`<span class="mu">${oth} de pisos a cargo de otros (solo las ves)</span>`:''}${cl?`<span class="mu">🔒 Cerradas a los SC${propNever()?' (aún no las habilitas)':propManual()?' (las bloqueaste)':' desde el corte'}</span>`:''}
        <div class="rvall">${by.size?'<button class="ib pri" data-pp="rev">Revisar propuestas</button>':'<button class="ib" data-pp="list">Ver propuestas</button>'}${cl?'<button class="ib" data-pp="open" title="Los SC vuelven a proponer hasta el próximo corte">🔓 Habilitar propuestas</button>':'<button class="ib" data-pp="close" title="Los SC quedan en solo lectura ya, sin esperar al corte">🔒 Bloquear propuestas</button>'}</div></div>`}
    else if(cl){/* sin pendientes y cerradas: solo queda el acceso para habilitarlas (si no, no habría cómo abrirlas) */mode='open';cls+=' fold';h='<button class="rvtab" data-pp="open" title="Los SC vuelven a proponer hasta el próximo corte">🔓 Habilitar propuestas</button>'}}
  if(!mode){gone();return}
  if(!el){el=document.createElement('aside');el.id='rvpanel';el.onclick=e=>{if(e.target.closest('[data-rvfold]')){try{localStorage.setItem('lps.rvfold',el.classList.contains('fold')?'0':'1')}catch(er){}rvPanelSync();return}propBarClick(e)};
    el.onchange=e=>{if(e.target.id==='rvctx'){U.revCtx=e.target.checked;requestRender()}};document.body.appendChild(el)}
  el.className=cls+(f&&mode!=='open'?' fold':'');
  /* oct 2026: arranca a la altura de la grilla (no tapa las pestañas ni «Más»); plegado, un poco más abajo para no tapar la cabecera de días */
  {const g=document.getElementById('gw');const gt=g?Math.round(g.getBoundingClientRect().top):120;const folded=el.classList.contains('fold');el.style.top=Math.max(60,gt+(folded?70:4))+'px';el.style.maxHeight=`calc(100vh - ${Math.max(60,gt+4)+14}px)`}
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}}
function revGo(dir){const L=revItems();if(!L.length)return;let i=REVSEL?L.findIndex(o=>o.id===REVSEL.id):-1;i=i<0?(dir>0?0:L.length-1):(i+dir+L.length)%L.length;const o=L[i];REVSEL={sc:o.sc,id:o.id,k:0};
  const x=o.it.after||S.act.get(o.id)||{};const am=S.amb.get(x.ambId);if(am){const sec=am.sectorId;const pid=pisoOfAmb(am.id);U.collapsed=U.collapsed.filter(c=>c!==sec&&c!==pid);
    /* oct 2026: si la propuesta está en otro piso o fuera de las semanas que se ven, la grilla va allá (antes se elegía una fila oculta y Enter la aceptaba sin verla) */
    if(U.piso&&pid&&U.piso!==pid){U.piso=pid;U.pisoAll=false;U.sector='';gridRows=null}
    const ds=[...(x.days||[])].sort();if(ds.length){const w=weekOf(ds[0]);if(w<U.week||w>=U.week+U.win){U.week=w;gridRows=null}}}
  requestRender();setTimeout(()=>{gridReveal(o.id);const tr=$(`#grid tr[data-a="${CSS.escape(o.id)}"]`);if(tr)tr.scrollIntoView({block:'center',behavior:'smooth'})},120)}
function revDecide(id,st,opt){const o=revItems().find(q=>q.id===id)||[...PROP.values()].flatMap(d=>Object.entries(d.items||{}).filter(([k,it])=>k===id&&propSentOf(it)).map(([k,it])=>({sc:d.sc,id:k,it:propSentOf(it)})))[0];if(!o)return;
  opt={...(opt||{}),ver:RVSEEN.get(id)};
  const L=revItems();const i=L.findIndex(q=>q.id===id);return decideProp(o.sc,id,st,opt).then(r=>{if(r==='ok'||r==='gone')REVED.delete(id);const R=revItems().filter(q=>q.id!==id||r!=='ok');REVSEL=R.length?{sc:R[Math.min(Math.max(i,0),R.length-1)].sc,id:R[Math.min(Math.max(i,0),R.length-1)].id,k:0}:null;return r})}
/* mover lo propuesto (‹ ›) o aceptar con otra fecha (📅): desde la barra de revisión, para la fila elegida */
function revAct(k,id,b){const it=revItems().find(q=>q.id===id);if(!it)return;
  if(k==='l'||k==='r'){if(!REVSEL||REVSEL.id!==id)REVSEL={sc:it.sc,id,k:0};revStep(k==='r'?1:-1);requestRender();return}
  if(k==='date'){if(!it.it.after)return;const e=revEdGet(id,it.it);const ds=e.days;if(!ds.length){toast('La fila no tiene días: elige los días en la grilla.');return}
    openPop(b,`<div class="ph">Aceptar con otra fecha</div><div class="ptx">Propuesto: ${esc(rngTxt(ds))}. Elige el nuevo día de inicio: se mueve todo el bloque (días hábiles, lunes a sábado).</div><div class="qrow"><input type="date" id="pst" value="${ds[0]}"><button data-do="go">Aceptar</button></div>`,
      {go:()=>{const v=($('#pst')||{}).value;if(!v){toast('Elige una fecha.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}revShiftBy(id,it.it,wdist(ds[0],v));const a=revAcc(id);revDecide(id,a[0],a[1])}});setTimeout(()=>{const i=$('#pst');if(i)i.focus()},30)}}
/** mueve los días de una fila k días hábiles, con sus cantidades (antes se perdían las cantidades al mover) */
function revShiftBy(id,it,k){const e=revEdGet(id,it);if(!k)return;const mp=d=>wshift(d,k);let q;if(e.qty){q={};for(const[d,n]of Object.entries(e.qty)){const m=mp(d);q[m]=r2((+q[m]||0)+(+n||0))}}
  revEdSet(id,it,e.days.map(mp),q)}
/** ‹ › : mueve un día hábil la fila elegida (sus días editados o los propuestos); queda guardado en esa fila */
function revStep(d){if(!REVSEL)return;const it=revItems().find(q=>q.id===REVSEL.id);if(!it||!it.it.after)return;revShiftBy(REVSEL.id,it.it,d)}
/** cómo se acepta una fila: con los días (y cantidades) que dejó el ingeniero, o tal como la envió el SC */
function revAcc(id){const it=revItems().find(q=>q.id===id);if(!it||!it.it.after)return['ok',{}];
  const e=REVED.get(id);if(e)return e.days.length?['ok',{days:e.days,qty:e.qty}]:['empty',{}];
  return['ok',{}]}
/** clic en un día de la grilla de revisión: agrega o quita ese día de lo propuesto (como al editar el lookahead sin propuestas). Se acepta con ✓ */
function revToggleDay(id,d){const it=revItems().find(q=>q.id===id);if(!it||!it.it.after||!d)return;
  if(!isWork(d)){toast(nwReason(d)+': no es día laborable.');return}
  const pid=propPiso(id,it.it);if(d<=todayIso()){toast(`El ${fmtD(d)} ${d===todayIso()?'es hoy':'ya pasó'}: al revisar propuestas solo se programa desde mañana.`);return}
  if(!isAdmin&&typeof dayLocked==='function'&&dayLocked(d,pid)&&!recReal(d,id)){toast(`El ${fmtD(d)} ya tiene el plan cerrado (${lockWhy(d,pid)}): no se puede programar ahí.`);return}
  const e=revEdGet(id,it.it);
  /* oct 2026: quitar el último día ya NO rechaza la fila: queda vacía para elegir otros días (no se acepta sin días; lo dice el panel) */
  const set=new Set(e.days);if(set.has(d))set.delete(d);else set.add(d);
  revEdSet(id,it.it,[...set],e.qty);REVSEL={sc:it.sc,id,k:0};requestRender()}
function revClick(e){if(!revOn())return;const t=e.target;let b;
  if((b=t.closest('[data-rva]'))){e.stopPropagation();e.preventDefault();const id=b.closest('tr').dataset.a;const k=b.dataset.rva;
    if(k==='l'||k==='r'||k==='date'){revAct(k,id,b);return}
    if(k==='ok'){const a=revAcc(id);if(a[0]==='empty'){toast('La fila no tiene días: elige los nuevos días o recházala con ✗.');return}revDecide(id,a[0],a[1])}
    else rejPop(b,o=>revDecide(id,'rej',o));
    return}
  /* tocar el nombre, el metrado o cualquier celda de la fila (aunque sea un campo de solo lectura) la elige */
  const tr=t.closest('tr.rvrow');if(tr&&!t.closest('button,input:not([readonly]),select:not([disabled]),textarea:not([readonly])')){const it=revItems().find(q=>q.id===tr.dataset.a);if(it&&(!REVSEL||REVSEL.id!==it.id)){REVSEL={sc:it.sc,id:it.id,k:0};requestRender()}}}
let RVTAP=null;
function revDown(e){if(!revOn()||e.button>0)return;const td=e.target.closest('td.d');if(!td||e.target.closest('.dm'))return;const tr=td.closest('tr');if(!tr)return;
  /* filas de contexto (sin propuesta): en la revisión no se editan sin «✎ Editar» */
  if(!tr.classList.contains('rvrow')){if(!(typeof LKED!=='undefined'&&LKED)){e.stopPropagation();e.preventDefault()}return}
  e.stopPropagation();
  if(tr.classList.contains('rvdel')){e.preventDefault();toast('Esta fila pide quitar la actividad: acéptala (✓) o recházala (✗).');return}
  /* oct 2026: en la tablet, el día cambia al levantar el dedo y solo si no se deslizó (antes, desplazar la grilla editaba días sin querer) */
  if(e.pointerType==='touch'){RVTAP={id:tr.dataset.a,d:td.dataset.d,x:e.clientX,y:e.clientY};return}
  e.preventDefault();
  /* un clic en un día agrega o quita ese día de lo propuesto. Ya no se mueve arrastrando con el puntero (fallaba al repetirlo): se usa ‹ › */
  revToggleDay(tr.dataset.a,td.dataset.d)}
document.addEventListener('pointerup',e=>{const t=RVTAP;RVTAP=null;if(!t||e.pointerType!=='touch'||!revOn())return;if(Math.hypot(e.clientX-t.x,e.clientY-t.y)>8)return;revToggleDay(t.id,t.d)},true);
document.addEventListener('pointercancel',()=>{RVTAP=null},true);
function revKey(e){if(!revOn()||!REVSEL)return;const tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select'))return;
  /* oct 2026: con una ventanita, la lista o un botón con el foco, el teclado es de ellos (antes Enter aceptaba otra fila y Escape borraba lo editado) */
  if(!pop.hidden||$('#uask')||$('#ppm')||(tg&&tg.closest&&tg.closest('button,a,#pop,#rvpanel,.uask')))return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();revStep(e.key==='ArrowRight'?1:-1);requestRender()}
  else if(e.key==='Enter'){e.preventDefault();const id=REVSEL.id;if(!revItems().find(q=>q.id===id))return;
    if(!$(`#grid tr.rvrow[data-a="${CSS.escape(id)}"]`))return;/* solo lo que se ve en la grilla */
    const a=revAcc(id);if(a[0]==='empty'){toast('La fila no tiene días: elige los nuevos días o recházala con ✗.');return}revDecide(id,a[0],a[1])}
  /* Escape solo quita la selección (oct 2026): lo editado se descarta únicamente con «Volver a lo propuesto» */
  else if(e.key==='Escape'){REVSEL=null;requestRender()}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(e.altKey){e.preventDefault();revGo(e.key==='ArrowDown'?1:-1)}}}
document.addEventListener('keydown',revKey);
function revWire(){const g=$('#gw')||$('#grid');if(g&&!g._rvw){g._rvw=1;g.addEventListener('click',revClick,true);g.addEventListener('pointerdown',revDown,true)}}

function revCellHtml(x,sel){const r=x._rv;const k=revShift(x);let tag='';
  if(r.isNew)tag='<span class="rvtag new">NUEVA</span>';else if(r.del)tag='<span class="rvtag del">QUITAR</span>';
  else{const o=r.off;const t=[];if(k)t.push(`${k>0?'→ +':'← '}${k}d`);const dn=(x.days||[]).length-(o.days||[]).length;if(dn&&!k)t.push(`${dn>0?'+':''}${dn} día${Math.abs(dn)>1?'s':''}`);else if(dn)t.push(`${dn>0?'+':''}${dn}d`);if((o.metrado??null)!==(x.metrado??null))t.push('metrado');if(!t.length&&canon(o.days||[])!==canon(x.days||[]))t.push('días');if((o.name||'')!==(x.name||''))t.push('nombre');tag=t.length?`<span class="rvtag">${t.join(' · ')}</span>`:''}
  if(r.late)tag+=`<span class="rvtag late" title="${esc(lateTxt(r.late))}">TARDÍA</span>`;
  const kk=sel&&REVSEL?REVSEL.k:0;
  /* oct 2026: en cada fila solo ✓ ✗ para que el nombre de la actividad se lea; ‹ › 📅 y el desplazamiento van en la barra de revisión (fila elegida). La etiqueta solo en la fila elegida. */
  return`<span class="rvb${sel?' full':''}">${sel?tag:''}<span class="rvk"></span><button data-rva="ok" title="Aceptar${kk?' con el desplazamiento':''} (Enter)" aria-label="Aceptar">✓</button><button data-rva="rej" title="Rechazar" aria-label="Rechazar">✗</button></span>`}

