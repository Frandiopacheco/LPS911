"use strict";
/* LPS 911 · Módulo Avance: importar el metrado desde un CSV o pegado de Excel (docs/ia/avance.md «Importar»).
   Columnas (por su encabezado): codigo, descripcion, nivel, ambiente, cantidad y, si la partida usa ubicación, ubicacion.
   Antes de importar se resuelve el cuadro de equivalencias: cada nivel y ambiente del archivo → uno de la obra o «No importar».
   Nunca crea ambientes: los toma de los que ya existen (decidido con el dueño, 24-11-2026). Las equivalencias quedan en avp.eq. */
let AVI=null;
const AVI_COL={cod:['codigo','cod','item','code'],des:['descripcion','desc','detalle'],niv:['nivel','piso'],amb:['ambiente','amb'],q:['cantidad','metrado','cant','qty'],ub:['ubicacion','ubic','ub']};
function avImpOpen(){const p=avCur();if(!p||!avaCfg())return;AVI={pid:p.id,rows:null,niv:{},amb:{},err:'',busy:false};avImpDraw()}
/** texto → filas {cod,des,niv,amb,ub,q,ln}; devuelve un mensaje si faltan columnas */
function avImpParse(txt){const M=avCsv(txt);if(M.length<2)return{err:'El archivo no tiene filas.'};const hd=M[0].map(x=>mnk(x)),ix={};
  for(const k in AVI_COL){ix[k]=hd.findIndex(x=>AVI_COL[k].includes(x))}const falta=['cod','niv','amb','q'].filter(k=>ix[k]<0);
  if(falta.length)return{err:'Faltan columnas: '+falta.map(k=>AVI_COL[k][0]).join(', ')+'. La primera fila debe tener los encabezados.'};
  const g=(r,k)=>ix[k]<0?'':String(r[ix[k]]??'').trim();return{rows:M.slice(1).map((r,i)=>({ln:i+2,cod:g(r,'cod'),des:g(r,'des'),niv:g(r,'niv'),amb:g(r,'amb'),ub:g(r,'ub'),q:avNum(g(r,'q')),qt:g(r,'q')}))}}
const avImpSim=(a,b)=>{const A=new Set(String(a).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(Boolean)),B=new Set(String(b).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(Boolean));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/Math.max(A.size,B.size)};
const avImpAmbs=pid=>[...S.amb.values()].filter(a=>pisoOfAmb(a.id)===pid).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'es',{numeric:true}));
/** propone las equivalencias que salen solas: guardadas de una carga anterior o nombre idéntico (sin tildes ni mayúsculas) y único */
function avImpGuess(){const p=AVP.get(AVI.pid),eq=(p&&p.eq)||{},ps=pisos();
  [...new Set(AVI.rows.map(r=>r.niv))].forEach(n=>{const k=mnk(n);if(!k||AVI.niv[k]!==undefined)return;const sv=eq.niv&&eq.niv[k];if(sv&&(sv==='-'||S.pis.has(sv))){AVI.niv[k]=sv;return}
    const m=ps.filter(x=>mnk(x.name)===k||mnk(x.code)===k);AVI.niv[k]=m.length===1?m[0].id:''});
  AVI.rows.forEach(r=>{const pi=AVI.niv[mnk(r.niv)];if(!pi||pi==='-'||!r.amb)return;const k=pi+'|'+mnk(r.amb);if(AVI.amb[k]!==undefined)return;const sv=eq.amb&&eq.amb[k];if(sv&&(sv==='-'||S.amb.has(sv))){AVI.amb[k]=sv;return}
    const m=avImpAmbs(pi).filter(a=>mnk(a.name)===mnk(r.amb));AVI.amb[k]=m.length===1?m[0].id:''})}
/** qué pasaría al importar: filas nuevas, que cambian, iguales, sin importar y con error */
function avImpPlan(){const p=AVP.get(AVI.pid),cur=avSubP===p.id?avData().rows:[],byCod=new Map(Object.entries(p.items||{}).map(([id,i])=>[mnk(i.cod),id])),ubs=new Map((p.ubi||[]).map(u=>[mnk(u),u]));
  const have=new Map(cur.map(r=>[r.amb+'|'+r.it+'|'+r.ub,r])),agg=new Map(),errs=[],newIt=new Map();let skip=0,pend=0;
  AVI.rows.forEach(r=>{if(!r.cod||!(r.q>0)||!mnk(r.niv)||!r.amb){errs.push(`Fila ${r.ln}: ${!r.cod?'sin código':!mnk(r.niv)?'sin nivel':!r.amb?'sin ambiente':'cantidad «'+r.qt+'» no válida'}`);return}
    const pi=AVI.niv[mnk(r.niv)];if(pi==='-'){skip++;return}if(!pi){pend++;return}const am=AVI.amb[pi+'|'+mnk(r.amb)];if(am==='-'){skip++;return}if(!am){pend++;return}
    let ub='';if(ubs.size){ub=ubs.get(mnk(r.ub));if(!ub){errs.push(`Fila ${r.ln}: ubicación «${r.ub}» no es de la partida (${[...ubs.values()].join(', ')})`);return}}
    const ck=mnk(r.cod);let it=byCod.get(ck);if(!it){if(!newIt.has(ck))newIt.set(ck,{cod:r.cod,des:r.des});it='new:'+ck}
    const k=am+'|'+it+'|'+ub,o=agg.get(k);if(o)o.q+=r.q;else agg.set(k,{piso:pi,amb:am,it,ub,q:r.q,an:r.amb})});
  let nu=0,ch=0,eqv=0;agg.forEach((o,k)=>{const h=have.get(k);o.old=h||null;if(!h)nu++;else if(Math.abs(h.q-o.q)>1e-9)ch++;else eqv++});
  return{agg,errs,newIt,skip,pend,nu,ch,eqv}}
function avImpDraw(){const I=AVI,p=AVP.get(I.pid);if(!I||!p)return;let h=`<div class="avh"><b>Importar metrado · ${esc(p.nom)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>`;
  if(!I.rows){h+=`<p class="avnote">Columnas (primera fila con encabezados): <b>codigo, descripcion, nivel, ambiente, cantidad</b>${(p.ubi||[]).length?', <b>ubicacion</b>':''}. Sirve un archivo CSV o pegar las columnas copiadas de Excel.</p>
    <label class="avf">Archivo CSV<input type="file" id="avifile" accept=".csv,.txt,text/csv"></label>
    <label class="avf">o pega aquí desde Excel<textarea class="tin avta" id="avitxt" rows="6" placeholder="codigo&#9;descripcion&#9;nivel&#9;ambiente&#9;cantidad"></textarea></label>
    ${I.err?`<p class="avtg b avblk">${esc(I.err)}</p>`:''}<div class="avact"><span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cancelar</button><button type="button" class="ib pri" data-avi="read">Leer</button></div>`}
  else{avImpGuess();const P=avImpPlan(),ps=pisos();const nivs=[...new Set(I.rows.map(r=>r.niv))].filter(n=>mnk(n));
    const cnt=(f)=>I.rows.filter(f).length;
    h+=`<p class="avnote"><b>${I.rows.length}</b> filas leídas. Revisa las equivalencias: nada se importa hasta que cada nivel y ambiente tenga su par en la obra o diga «No importar».</p>
    <div class="avibox"><table class="avit"><thead><tr><th>En el archivo</th><th class="num">Filas</th><th>En la obra</th><th></th></tr></thead><tbody>`;
    nivs.forEach(n=>{const k=mnk(n),v=I.niv[k]||'';h+=`<tr class="avinv"><td>Nivel «${esc(n)}»</td><td class="num">${cnt(r=>r.niv===n)}</td><td><select class="tin" data-avn="${esc(k)}" id="avn_${esc(k)}"><option value="">Elegir…</option>${ps.map(x=>`<option value="${esc(x.id)}"${v===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}<option value="-"${v==='-'?' selected':''}>No importar este nivel</option></select></td><td>${v?'<span class="avtg o">listo</span>':'<span class="avtg b">falta</span>'}</td></tr>`;
      if(!v||v==='-')return;const L=avImpAmbs(v);[...new Set(I.rows.filter(r=>r.niv===n&&r.amb).map(r=>r.amb))].forEach(a=>{const ka=v+'|'+mnk(a),va=I.amb[ka]||'',exact=L.filter(x=>mnk(x.name)===mnk(a)).length;
        if(va&&va!=='-'&&exact===1&&!I.all)return;/* los que coinciden solos no se listan (salvo «ver todos») */
        const sug=L.map(x=>[avImpSim(a,x.name),x]).sort((A,B)=>B[0]-A[0]);
        h+=`<tr><td><i class="avi1"></i>«${esc(a)}»</td><td class="num">${cnt(r=>r.niv===n&&r.amb===a)}</td><td><select class="tin" data-avia="${esc(ka)}" id="avia_${esc(ka)}"><option value="">Elegir…</option>${sug.map(([s,x])=>`<option value="${esc(x.id)}"${va===x.id?' selected':''}>${esc(x.name||x.code||x.id)}${s>=.5&&!va?' (parecido)':''}</option>`).join('')}<option value="-"${va==='-'?' selected':''}>No importar estas filas</option></select></td><td>${va?'<span class="avtg o">listo</span>':exact>1?`<span class="avtg w">${exact} con ese nombre</span>`:'<span class="avtg b">no existe</span>'}</td></tr>`})});
    const auto=Object.values(I.amb).filter(v=>v&&v!=='-').length;
    h+=`</tbody></table></div><p class="avnote">${auto} ambiente${auto===1?'':'s'} con su par en la obra. <button type="button" class="lnkb" data-avi="all">${I.all?'Ver solo los que faltan':'Ver todos'}</button> · Si un ambiente no existe, créalo en el Lookahead y vuelve a importar: lo ya cargado no se duplica.</p>
    <div class="avisum"><span><b>${P.nu}</b> filas nuevas</span><span><b>${P.ch}</b> cambian de metrado</span><span><b>${P.eqv}</b> iguales</span><span><b>${P.skip}</b> sin importar</span>${P.newIt.size?`<span><b>${P.newIt.size}</b> ítems nuevos</span>`:''}${P.pend?`<span class="avtg b"><b>${P.pend}</b> filas por resolver</span>`:''}</div>
    ${P.errs.length?`<details class="avierr"><summary>${P.errs.length} fila${P.errs.length===1?'':'s'} con error (no se importan)</summary>${P.errs.slice(0,40).map(x=>`<div>${esc(x)}</div>`).join('')}</details>`:''}
    <div class="avact"><button type="button" class="ib" data-avi="back">‹ Otro archivo</button><span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cancelar</button><button type="button" class="ib pri" data-avi="go"${P.pend||I.busy||!(P.nu+P.ch)?' disabled':''}>Importar ${P.nu+P.ch} fila${P.nu+P.ch===1?'':'s'}</button></div>`}
  lqModal(h,e=>{const b=e.target.closest('[data-avi]');if(!b)return;const k=b.dataset.avi;if(k==='read')avImpRead();else if(k==='back'){AVI.rows=null;AVI.err='';avImpDraw()}else if(k==='all'){AVI.all=!AVI.all;avImpDraw()}else if(k==='go')avImpGo()},
   e=>{const t=e.target;if(t.id==='avifile'&&t.files&&t.files[0]){const fr=new FileReader();fr.onload=()=>{const ta=$('#avitxt');if(ta)ta.value=String(fr.result||'');avImpRead()};fr.readAsText(t.files[0])}
    else if(t.dataset.avn!=null){AVI.niv[t.dataset.avn]=t.value;avImpDraw()}else if(t.dataset.avia!=null){AVI.amb[t.dataset.avia]=t.value;avImpDraw()}})}
function avImpRead(){const ta=$('#avitxt'),r=avImpParse(ta?ta.value:'');if(r.err){AVI.err=r.err;AVI.rows=null}else{AVI.rows=r.rows;AVI.err='';AVI.niv={};AVI.amb={}}avImpDraw()}
async function avImpGo(){const I=AVI,p=AVP.get(I.pid);if(!I||!p||I.busy||!avaCfg())return;const P=avImpPlan();if(P.pend)return;I.busy=true;const w=avWho();
  /* ítems nuevos: se agregan a la partida con un id propio */
  const items={},idOf=new Map();let n=Object.keys(p.items||{}).length,k=0;P.newIt.forEach((v,ck)=>{const id='i'+NOW().toString(36)+(k++).toString(36);items[id]={cod:v.cod.slice(0,30),des:String(v.des||'').slice(0,120),ord:n++};idOf.set('new:'+ck,id)});
  const byPiso=new Map();let m=0;P.agg.forEach(o=>{if(o.old&&Math.abs(o.old.q-o.q)<=1e-9)return;const id=o.old?o.old.id:'r'+NOW().toString(36)+(m++).toString(36),q=Math.round(o.q*100)/100;
    const R=byPiso.get(o.piso)||{};R[id]=o.old?{q}:{it:idOf.get(o.it)||o.it,amb:o.amb,ub:o.ub,q,an:o.an};byPiso.set(o.piso,R)});
  const eq={niv:{},amb:{}};for(const a in I.niv)if(I.niv[a])eq.niv[a]=I.niv[a];for(const a in I.amb)if(I.amb[a])eq.amb[a]=I.amb[a];
  try{const b=db.batch();b.set(fcol('avp').doc(p.id),{items,eq,by:w.by,n:w.n,t:w.t},{merge:true});byPiso.forEach((R,pi)=>b.set(fcol('avm').doc(p.id+'_'+pi),{p:p.id,piso:pi,r:R,by:w.by,t:w.t},{merge:true}));
    await bgWrite(b.commit());AVI=null;lqClose();toast(`Importado: ${P.nu} filas nuevas${P.ch?', '+P.ch+' actualizadas':''}${P.skip?' · '+P.skip+' sin importar':''}`);requestRender()}
  catch(err){I.busy=false;toast('No se pudo importar: '+(err.code||err.message))}}
