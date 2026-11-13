"use strict";
/* =====================================================================
   Plan diario › Capas desde el módulo Planos (13-11-2026, decidido con el dueño; docs/ia/plan-diario.md «Capas»)
   En vez de una fila de especialidades cargadas a mano, el botón «Capas ▾» lista las plantas del piso que están en el
   módulo Planos, agrupadas por especialidad, y dibuja la elegida encima de la lámina base.
   - No se copia nada: la imagen se arma en el equipo con los mosaicos de Planos (tope 3000 px en tablet, 4000 en PC) y se
     guarda en la caché `lps-planos` (sirve sin conexión después de verla una vez). No se crean documentos en `laminas`.
   - Siempre la revisión vigente del plano.
   - La base no cambia: zonas, ambientes y PPC siguen en sus coordenadas. Con una capa encendida se dibuja igual que siempre.
   - Alineación por plano y por lámina base, en el mismo plano: `plb.pd[<id de la lámina base>] = {T:[a,b,e,f], pts, ar, rev, by, n, ts}`.
     `T` lleva la hoja (ancho = 1) a las coordenadas de la base; `ar` = ancho/alto de la hoja al alinear (si una revisión
     nueva cambia la hoja, se pide revisar). La guardan el administrador y Oficina Técnica (`pdcCan`).
   - Un plano sin alinear toma la alineación de otro del mismo piso con la misma hoja («¿Coincide?»); si no hay, se alinea
     con puntos (`alignDialog` de plano.js).
   No depende de Casco. Enganches en plano.js: `pdcBar`, `pdcNote`, `pdcLayer`.
   ===================================================================== */
const PDC={id:'',key:'',tmp:null,solo:false,op:.85,all:false,img:new Map(),busy:'',err:'',errId:''};
const PDC_I={a:1,b:0,e:0,f:0};
/** quién guarda la alineación de una capa */
const pdcCan=()=>!!me&&(me.role==='admin'||isOTArea());
const pdcMax=()=>(matchMedia('(pointer:coarse)').matches||innerWidth<900)?3000:4000;
const pdcAr=sp=>sp&&sp.W>0&&sp.H>0?sp.W/sp.H:0;
const pdcSameAr=(a,b)=>!!a&&!!b&&Math.abs(a/b-1)<.004;
/** una planta DXF solo se usa cuando su revisión está «Lista» (planos-alistar.js) */
const pdcReady=p=>typeof plRevOk!=='function'||plRevOk(p);
const pdcGiro=p=>(p&&p.giro&&p.giro.q)||0;
const pdcName=p=>p?(p.cod||'')+(p.tit?' · '+p.tit:''):'';
/** plantas del piso en el módulo Planos (all: también cortes, detalles…) */
function pdcList(piso,all){const lv=plLvIn(piso);return plAct().filter(p=>plLvOf(p)===lv&&(all||p.tipo==='Planta')).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b))}
/** alineación guardada de un plano con una lámina base; chk: la hoja cambió desde que se alineó */
function pdcAl(p,base){const e=p&&base&&p.pd&&p.pd[base.id];if(!e||!Array.isArray(e.T)||e.T.length!==4||e.T.some(v=>typeof v!=='number'||!isFinite(v)))return null;
  /* revisar: otra revisión (puede venir con otro recorte), otra proporción de hoja o la lámina girada después de alinear */
  const ar=pdcAr(plSpecOf(p));return{T:e.T,pts:e.pts||null,chk:(e.rev||1)!==(p.rev||1)||!!(e.ar&&ar&&!pdcSameAr(e.ar,ar))||(e.g||0)!==pdcGiro(p),e}}
/** alineación probable: la de otro plano del mismo piso con la misma hoja, o la de la base si vino del módulo Planos */
function pdcGuess(p,base){const ar=pdcAr(plSpecOf(p));if(!ar)return null;
  const same=q=>pdcSameAr(pdcAr(plSpecOf(q)),ar)&&(!Array.isArray(p.mm)||!Array.isArray(q.mm)||(Math.abs(p.mm[0]-q.mm[0])<2&&Math.abs(p.mm[1]-q.mm[1])<2));
  const lv=plLvOf(p);const C=plAct().filter(q=>{if(q.id===p.id||plLvOf(q)!==lv||q.tipo!==p.tipo)return false;const a=pdcAl(q,base);return!!a&&!a.chk&&same(q)})
    .sort((a,b)=>((b.disc===p.disc)-(a.disc===p.disc))||((b.pd[base.id].ts||0)-(a.pd[base.id].ts||0)));
  if(C.length)return{T:pdcAl(C[0],base).T,from:C[0]};
  const q=base.plb&&base.plb.id&&PLB.get(base.plb.id);
  if(q&&base.w>0&&(q.id===p.id?(base.plb.rev||1)===(p.rev||1):same(q))){const t=base.T||PDC_I;return{T:[t.a*base.w,t.b*base.w,t.e,t.f],from:q}}
  return null}

/* ---------- imagen de la capa ---------- */
function pdcDims(sp){const mx=pdcMax(),Z=sp.Z||1;let z=0;while(z<Z-1&&Math.ceil(Math.max(sp.W,sp.H)/2**z)>mx)z++;
  const lw=Math.ceil(sp.W/2**z),lh=Math.ceil(sp.H/2**z),k=Math.min(1,mx/Math.max(lw,lh));return{z,lw,lh,k,w:Math.max(1,Math.round(lw*k)),h:Math.max(1,Math.round(lh*k)),mx}}
const pdcKey=sp=>sp.base+'|'+pdcMax();
/** arma (o saca de la caché del equipo) la imagen de la revisión vigente → {url,w,h} */
function pdcImg(p){const sp=plSpecOf(p),k0=pdcKey(sp);let e=PDC.img.get(k0);if(e)return e.pr;
  if(!(sp.W>0&&sp.H>0))return Promise.reject(new Error('El plano no tiene imagen'));
  e={pr:null,url:'',w:0,h:0};PDC.img.set(k0,e);
  e.pr=(async()=>{const d=pdcDims(sp),ck=location.origin+'/__plan/'+sp.base+'/pd'+d.mx+'.webp';let c=null,blob=null;
    try{c=await caches.open(PLC_NAME);const hit=await c.match(ck);if(hit)blob=await hit.blob()}catch(err){c=null}
    if(!blob){const T=sp.T||1024,cv=document.createElement('canvas');cv.width=d.w;cv.height=d.h;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,d.w,d.h);g.imageSmoothingQuality='high';
      const nx=Math.ceil(d.lw/T),ny=Math.ceil(d.lh/T),L=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)L.push([x,y]);let i=0,stop=false;
      const one=async([x,y])=>{const b=await plGet(`${sp.base}/${d.z}/${x}_${y}.webp`,{noStore:true});const bm=await createImageBitmap(b);if(stop){if(bm.close)bm.close();return}
        g.drawImage(bm,Math.floor(x*T*d.k),Math.floor(y*T*d.k),Math.ceil(bm.width*d.k)+(d.k<1?1:0),Math.ceil(bm.height*d.k)+(d.k<1?1:0));if(bm.close)bm.close()};
      try{await Promise.all(Array.from({length:Math.min(6,L.length)},async()=>{while(i<L.length&&!stop)await one(L[i++])}));
        blob=await new Promise((ok,ko)=>cv.toBlob(b=>b?ok(b):ko(new Error('No se pudo armar la imagen')),'image/webp',.8))}
      catch(err){stop=true;throw err}
      finally{stop=true;cv.width=cv.height=0}
      if(c)try{await c.put(ck,new Response(blob,{headers:{'Content-Type':'image/webp'}}))}catch(err){}}
    e.url=URL.createObjectURL(blob);e.w=d.w;e.h=d.h;
    /* en memoria solo las dos últimas capas (cada una ocupa memoria de video) */
    [...PDC.img.keys()].filter(k=>k!==k0).slice(0,-1).forEach(k=>{const o=PDC.img.get(k);if(o&&o.url){URL.revokeObjectURL(o.url);PDC.img.delete(k)}});
    return e})();
  e.pr.catch(()=>{if(PDC.img.get(k0)===e)PDC.img.delete(k0)});return e.pr}
function pdcLoad(p){if(PDC.busy===p.id||(PDC.err&&PDC.errId===p.id))return;PDC.busy=p.id;PDC.err='';PDC.errId='';
  pdcImg(p).catch(err=>{PDC.err=(err&&err.message)||'error';PDC.errId=p.id}).then(()=>{if(PDC.busy===p.id)PDC.busy='';requestRender()})}

/* ---------- lo que pide plano.js ---------- */
/** el plano encendido en este piso (la capa se apaga al cambiar de piso o de lámina base) */
function pdcCur(piso,base){if(!base||typeof PLB==='undefined')return null;const k=piso+'|'+base.id;if(PDC.key!==k){PDC.key=k;PDC.id='';PDC.tmp=null;PDC.err='';PDC.errId=''}
  if(!PDC.id)return null;const p=PLB.get(PDC.id);if(!p||p.arch){if(plbReady){PDC.id='';PDC.tmp=null}return null}return p}
const pdcT=(p,base)=>{const a=pdcAl(p,base);return a?a.T:(PDC.tmp&&PDC.tmp.id===p.id?PDC.tmp.T:null)};
/** capa para el visor del Plan diario: {key,url,w,h,T,op,blend} o null (sin capa, sin alinear o todavía cargando) */
function pdcLayer(piso,base){const p=pdcCur(piso,base);if(!p)return null;const Tn=pdcT(p,base);if(!Tn)return null;
  const e=PDC.img.get(pdcKey(plSpecOf(p)));if(!e||!e.url){pdcLoad(p);return null}
  return{key:'pdc|'+pdcKey(plSpecOf(p)),url:e.url,w:e.w,h:e.h,T:{a:Tn[0]/e.w,b:Tn[1]/e.w,e:Tn[2],f:Tn[3]},op:PDC.op,blend:PDC.solo?'normal':'multiply',solo:PDC.solo}}
/** botón «Capas ▾» y la capa encendida, para la barra del Plan diario */
function pdcBar(piso,base){if(!base||typeof canPla!=='function'||!canPla())return'';const p=pdcCur(piso,base);
  return`<button class="ib pdcb${p?' on':''}" data-pdc="open" title="Ver encima de la arquitectura otra especialidad de este piso (del módulo Planos)">Capas ▾</button>`
    +(p?`<span class="mchip on pdcc" title="${esc(pdcName(p))} · Rev. ${p.rev||1}"><b>${esc(p.disc||'')}</b> <span>${esc(pdcName(p))}</span><button data-pdc="off" aria-label="Quitar la capa" title="Quitar la capa">✕</button></span>
      <input type="range" id="pdcop" min="0.15" max="1" step="0.05" value="${PDC.op}" aria-label="Opacidad de la capa" title="Opacidad de la capa"><button class="ib${PDC.solo?' on':''}" data-pdc="solo" aria-pressed="${PDC.solo}" title="Ver solo esta capa, sin la arquitectura debajo">Solo la capa</button>${pdcCan()?'<button class="ib" data-pdc="aln" title="Alinear esta capa con la arquitectura marcando puntos">Alinear</button>':''}`:'')}
/** avisos de la capa (cargando, error, alineación por confirmar) */
function pdcNote(piso,base){const p=pdcCur(piso,base);if(!p)return'';const nm=`<b>${esc(p.cod||'La capa')}</b>`;
  if(PDC.err&&PDC.errId===p.id)return`<div class="callout warnc">No se pudo cargar ${nm}: ${esc(PDC.err)} <button class="ib" data-pdc="retry">Reintentar</button></div>`;
  const a=pdcAl(p,base);let h='';
  if(!a&&PDC.tmp&&PDC.tmp.id===p.id)h=`<div class="callout warnc">${nm} usa la alineación de <b>${esc(PDC.tmp.from||'otro plano')}</b> (misma hoja). ${pdcCan()?'¿Coincide con la arquitectura? <button class="ib pri" data-pdc="ok">Sí, coincide</button> <button class="ib" data-pdc="aln">Alinear con puntos</button>':'Aún sin confirmar: si no coincide, avisa a Oficina Técnica.'}</div>`;
  else if(a&&a.chk)h=`<div class="callout warnc">${nm} cambió en el módulo Planos (Rev. ${p.rev||1}): revisa que siga coincidiendo con la arquitectura. ${pdcCan()?'<button class="ib pri" data-pdc="ok">Sigue coincidiendo</button> <button class="ib" data-pdc="aln">Alinear con puntos</button>':''}</div>`;
  if(PDC.busy===p.id)h+=`<div class="callout">Cargando la capa ${nm}…</div>`;
  return h}

/* ---------- guardar la alineación ---------- */
async function pdcSave(p,base,T,pts){const sp=plSpecOf(p);const v={T:T.map(x=>+(+x).toFixed(4)),ar:+pdcAr(sp).toFixed(5),rev:p.rev||1,g:pdcGiro(p),by:me.email,n:me.name||me.email,ts:NOW()};if(pts)v.pts=pts;
  await fcol('plb').doc(p.id).update({['pd.'+base.id]:v})}
async function pdcConfirm(p,base){const T=pdcT(p,base);if(!T||!pdcCan())return;const a=pdcAl(p,base);
  try{await pdcSave(p,base,T,a?a.pts:null);if(PDC.tmp&&PDC.tmp.id===p.id)PDC.tmp=null;toast('Alineación guardada: la capa queda lista para todos')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}requestRender()}
/** alinear con puntos (la ventana de alineación del Plan diario) */
async function pdcAlign(p,base){if(!pdcCan()){toast('La alinean el administrador u Oficina Técnica.');return}const PL=window.__plano;if(!PL||!PL.alignDialog)return;
  toast('Cargando imágenes para alinear…');let ref,im;
  try{[ref,im]=await Promise.all([PL.imgURL(base,'f'),pdcImg(p)])}catch(err){toast('No se pudo cargar: '+((err&&(err.code||err.message))||'error'));return}
  const a=pdcAl(p,base),w=im.w,sc=(P,k)=>Array.isArray(P)?P.map(q=>q?{x:q.x*k,y:q.y*k}:null):[];
  PL.alignDialog({ref:base,refURL:ref,tgt:{w:im.w,h:im.h,url:im.url},title:`Alinear ${pdcName(p)} con ${base.name||'la arquitectura'}`,
    init:a&&a.pts?{p:sc(a.pts.p,w),q:a.pts.q||[],n:a.pts.n||null}:null,
    onSave:async(T,pts)=>{await pdcSave(p,base,[T.a*w,T.b*w,T.e,T.f],{p:sc(pts.p,1/w).map(q=>q&&{x:+q.x.toFixed(6),y:+q.y.toFixed(6)}),q:pts.q.map(q=>q&&{x:Math.round(q.x*10)/10,y:Math.round(q.y*10)/10}),n:pts.n});
      if(PDC.tmp&&PDC.tmp.id===p.id)PDC.tmp=null;PDC.id=p.id;toast('Capa alineada');requestRender()}})}

/* ---------- elegir una capa ---------- */
function pdcPick(id,piso,base){const p=PLB.get(id);if(!p||!base)return;
  if(!pdcReady(p)){toast('Esta planta DXF aún no está lista: se alista en el módulo Planos.');return}
  PDC.key=piso+'|'+base.id;PDC.err='';PDC.errId='';
  if(pdcAl(p,base)){PDC.id=id;PDC.tmp=null;pdcRecent(id);lqClose();requestRender();return}
  const g=pdcGuess(p,base);
  if(g){PDC.id=id;PDC.tmp={id,T:g.T,from:g.from?g.from.cod:''};pdcRecent(id);lqClose();requestRender();return}
  if(!pdcCan()){toast('Este plano aún no está alineado con el piso. Pídeselo al administrador u Oficina Técnica.');return}
  lqClose();pdcAlign(p,base)}
function pdcRecent(id){const a=store.get('pdcrec',[]);const L=[id,...(Array.isArray(a)?a:[]).filter(x=>x!==id)].slice(0,12);store.set('pdcrec',L)}
/** ventana «Capas»: plantas del piso agrupadas por especialidad, con buscador y recientes */
function pdcOpen(piso,base,n){if(!base||!canPla())return;plSub();
  if(!plbReady){if(!n)toast('Cargando la lista de planos…');if((n||0)<40)setTimeout(()=>{if(U.tab==='mapa')pdcOpen(piso,base,(n||0)+1)},250);else toast('No se pudo leer la lista de planos. Revisa la conexión.');return}
  const L=pdcList(piso,PDC.all),cur=pdcCur(piso,base),pn=(S.pis.get(piso)||{}).name||'';
  const st=p=>!pdcReady(p)?['por alistar','']:(()=>{const a=pdcAl(p,base);return a?(a.chk?['revisar','warn']:['alineada','ok']):pdcGuess(p,base)?['por confirmar','']:['por alinear','']})();
  const row=p=>{const[t,c]=st(p);return`<button class="pdci${cur&&cur.id===p.id?' on':''}" data-pdcp="${esc(p.id)}" data-s="${esc((p.cod+' '+(p.tit||'')+' '+(PL_DN[p.disc]||p.disc||'')).toLowerCase())}"${pdcReady(p)?'':' disabled'}><b>${esc(p.cod||'')}</b><span>${esc(p.tit||p.tipo||'')}</span><i class="lqt ${c}">${t}</i></button>`};
  const rec=(store.get('pdcrec',[])||[]).map(id=>L.find(p=>p.id===id)).filter(Boolean).slice(0,4);
  const G=new Map();L.forEach(p=>{if(!G.has(p.disc))G.set(p.disc,[]);G.get(p.disc).push(p)});
  const body=!L.length?`<div class="empty">Este piso aún no tiene ${PDC.all?'planos':'plantas'} en el módulo Planos. Se cargan en <b>Planos</b> (selector de arriba).</div>`
    :(rec.length>1&&L.length>8?`<div class="pdcg" data-g><h4>Recientes</h4>${rec.map(row).join('')}</div>`:'')
      +[...G.entries()].map(([d,A])=>`<div class="pdcg" data-g><h4>${esc(PL_DN[d]||d||'Otros')} <small>${A.length}</small></h4>${A.map(row).join('')}</div>`).join('');
  lqModal(`<div class="lqtop"><b>Capas${pn?' · '+esc(pn):''}</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
    <p class="note">Elige una especialidad para verla encima de la arquitectura. Salen del módulo Planos, siempre en su última revisión.</p>
    <div class="pdct"><input class="tin" id="pdcq" type="search" placeholder="Buscar por código o título" aria-label="Buscar plano"><label class="chk"><input type="checkbox" id="pdcall"${PDC.all?' checked':''}> También cortes y detalles</label>${cur?'<button class="ib" data-pdcp="">Quitar la capa</button>':''}</div>
    <div class="pdcl">${body}</div>`,
    e=>{const b=e.target.closest('[data-pdcp]');if(!b)return;if(!b.dataset.pdcp){PDC.id='';PDC.tmp=null;lqClose();requestRender();return}pdcPick(b.dataset.pdcp,piso,base)},
    e=>{if(e.target.id==='pdcall'){PDC.all=e.target.checked;const q=($('#pdcq')||{}).value||'';pdcOpen(piso,base);const i=$('#pdcq');if(i&&q){i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}))}}});
  const el=$('#lqm');if(el)el.oninput=e=>{if(e.target.id!=='pdcq')return;const q=e.target.value.trim().toLowerCase();
    $$('.pdci',el).forEach(b=>{b.hidden=!!q&&!b.dataset.s.includes(q)});$$('[data-g]',el).forEach(g=>{g.hidden=![...g.querySelectorAll('.pdci')].some(b=>!b.hidden)})}}

/* ---------- controles de la barra y de los avisos (plano.js solo los dibuja) ---------- */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-pdc]');if(!b||U.tab!=='mapa'||!window.__plano)return;
  const M=window.__plano.M,base=window.__plano.basesOf(M.piso).find(x=>x.id===M.vista)||window.__plano.basesOf(M.piso)[0];if(!base)return;
  const k=b.dataset.pdc,p=pdcCur(M.piso,base);
  if(k==='open'){pdcOpen(M.piso,base);return}
  if(!p)return;
  if(k==='off'){PDC.id='';PDC.tmp=null;requestRender()}
  else if(k==='solo'){PDC.solo=!PDC.solo;requestRender()}
  else if(k==='retry'){PDC.err='';PDC.errId='';requestRender()}
  else if(k==='ok')pdcConfirm(p,base);
  else if(k==='aln')pdcAlign(p,base)});
document.addEventListener('input',e=>{if(e.target.id!=='pdcop')return;PDC.op=+e.target.value;
  /* sin redibujar la barra (se soltaría el control mientras se arrastra) */
  document.querySelectorAll('#mstage img').forEach(im=>{if((im.dataset.k||'').startsWith('pdc|'))im.style.opacity=PDC.op})});
