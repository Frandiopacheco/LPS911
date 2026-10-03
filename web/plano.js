/* =====================================================================
   LPS 911 · Módulo "Plano diario" — Etapa 1: láminas por piso,
   visor con zoom, superposición por especialidad y alineación.
   Se carga solo al abrir la pestaña. Usa las variables globales de
   index.html (db, S, U, $, esc, toast, pisos, isAdmin, canWrite, me…).
   ===================================================================== */
(function(){
const PDFJS=window.PLANO_PDFJS||'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
const PDFJS_WORKER=window.PLANO_PDFJS_WORKER||'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const FULL=8000,LITE=3000,CHUNK=800000,MAXPX=40e6;
const ESPS=['Arquitectura','Estructuras','Instalaciones eléctricas','Instalaciones sanitarias','Agua contra incendio','Aire acondicionado','Comunicaciones','Cielo raso','Enchapes','Carpintería','Fachada'];
const LAM=new Map();let lamSub=null,lamErr=null,lamReady=false;
const IMG=new Map(); // key id|rev|q -> {url,promise}
/* subcontratista resaltado en el plano: el elegido en el panel (por defecto sí; se recuerda) o el que se tocó en la leyenda */
const scVis=()=>M.scView||(U.pdHi!==false?M.scDraw:'');
const M={vista:'',piso:'',sel:'',under:true,op:0.7,hi:null,view:null,busy:'',date:null,tool:'pan',scDraw:'',scView:'',selId:null,pend:null,tmp:null,panel:null};

/* ---------- datos ---------- */
function ensureLam(){if(lamSub||!db)return;
  lamSub=fcol('laminas').onSnapshot(sn=>{LAM.clear();sn.docs.forEach(d=>LAM.set(d.id,{...d.data(),id:d.id}));lamErr=null;lamReady=true;if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()},
    err=>{lamErr=err&&err.code||'error';lamReady=true;if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()});
  unsubs.push(()=>{if(lamSub)lamSub();lamSub=null;LAM.clear();lamReady=false;IMG.forEach(v=>{if(v.url)URL.revokeObjectURL(v.url)});IMG.clear();M.view=null})}
const lamsOf=pid=>[...LAM.values()].filter(l=>l.pisoId===pid).sort((a,b)=>(b.base?1:0)-(a.base?1:0)||(a.order||0)-(b.order||0)||a.esp.localeCompare(b.esp));
const basesOf=pid=>lamsOf(pid).filter(l=>l.base);
const baseOf=pid=>{const B=basesOf(pid);return(pid===M.piso&&B.find(b=>b.id===M.vista))||B[0]};
const baseOfL=l=>!l?null:l.base?l:(l.baseId&&LAM.get(l.baseId))||basesOf(l.pisoId)[0];
const vistaOf=l=>{const b=baseOfL(l);return b?b.id:''};
const lname=l=>l?(l.name||l.esp||''):'';
const zVista=z=>z.vista||(basesOf(z.pisoId)[0]||{}).id||'';
function useHi(){return M.hi!=null?M.hi:!(matchMedia('(pointer:coarse)').matches||innerWidth<900)}
async function imgURL(l,q){q=q||(useHi()?'f':'l');const k=l.id+'|'+l.rev+'|'+q;let e=IMG.get(k);if(e)return e.promise;
  e={url:null};e.promise=(async()=>{const ck=`/__lam/${l.id}_${l.rev}_${q}`;let cache=null;try{cache=await caches.open('lps-laminas');const hit=await cache.match(ck);if(hit){e.url=URL.createObjectURL(await hit.blob());return e.url}}catch(err){cache=null}
    const n=q==='f'?l.nf:l.nl;const parts=[];
    for(let i=0;i<n;i++){const d=await fcol('lamimg').doc(`${l.id}_${l.rev}_${q}_${i}`).get();if(!d.exists)throw new Error('Falta una parte de la imagen');parts.push(d.data().d)}
    const bin=atob(parts.join(''));const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const blob=new Blob([u8],{type:l.fmt||'image/webp'});if(cache)cache.put(ck,new Response(blob,{headers:{'Content-Type':blob.type}})).catch(()=>{});
    e.url=URL.createObjectURL(blob);return e.url})();
  e.promise.catch(()=>IMG.delete(k));IMG.set(k,e);return e.promise}

/* ---------- transformaciones (similitud: escala + giro + desplazamiento) ---------- */
const I={a:1,b:0,e:0,f:0};
const ap=(T,p)=>({x:T.a*p.x-T.b*p.y+T.e,y:T.b*p.x+T.a*p.y+T.f});
function fromPts(P1,P2,Q1,Q2){const dx=P2.x-P1.x,dy=P2.y-P1.y,qx=Q2.x-Q1.x,qy=Q2.y-Q1.y;const den=dx*dx+dy*dy;if(den<1)return null;
  const a=(qx*dx+qy*dy)/den,b=(qy*dx-qx*dy)/den;return{a,b,e:Q1.x-(a*P1.x-b*P1.y),f:Q1.y-(b*P1.x+a*P1.y)}}
const cssM=T=>`matrix(${T.a},${T.b},${-T.b},${T.a},${T.e},${T.f})`;

/* ---------- visor con zoom / desplazamiento (ratón, rueda y dos dedos) ---------- */
function Viewer(host,opt){opt=opt||{};const v={host,z:1,x:0,y:0,layers:[],marks:[],onTap:opt.onTap||null,bounds:null};
  host.classList.add('pv');host.innerHTML='<div class="pvw"><svg class="pvs" xmlns="http://www.w3.org/2000/svg"></svg></div><div class="pvmk"></div><div class="pvlb"></div>';const W=host.firstChild,MK=host.children[1],LB=host.children[2];v.svg=W.firstChild;v.labels=[];v.handles=[];
  v.apply=()=>{W.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.z})`;MK.innerHTML=v.marks.map(m=>{const p={x:m.x*v.z+v.x,y:m.y*v.z+v.y};return`<i class="pvm${m.cls?' '+m.cls:''}" style="left:${p.x}px;top:${p.y}px">${esc(m.t||'')}</i>`}).join('');
    let PL;if(v._pl&&v._pl.L===v.labels&&v._pl.z===v.z)PL=v._pl.P;else{PL=placeLabels(v.labels.map(l=>({...l,sx:l.x*v.z,sy:l.y*v.z})));v._pl={L:v.labels,z:v.z,P:PL}}
    let ln='';const lh=PL.map(l=>{const x=l.sx+l.dx+v.x,y=l.sy+l.dy+v.y;if(l.dx||l.dy){const x0=l.sx+v.x,y0=l.sy+v.y;ln+=`<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="${l.c||'#333'}" stroke-width="2"/><circle cx="${x0}" cy="${y0}" r="4" fill="${l.c||'#333'}" stroke="#fff" stroke-width="1.5"/>`}
      if(l.nb)return`<span class="pvl nb${l.ring?' '+l.ring:''}${l.np?' np':''}${l.cls?' '+l.cls:''}" data-z="${esc(l.id||'')}" title="${esc(l.tip||'')}" style="left:${x}px;top:${y}px;--c:${l.c||'#333'};color:${l.f||'#fff'}">${esc(l.t)}</span>`;
      return`<span class="pvl${l.cls?' '+l.cls:''}" data-z="${esc(l.id||'')}"${l.tip?` title="${esc(l.tip)}"`:''} style="left:${x}px;top:${y}px;--c:${l.c||'#333'};color:${l.f||'#fff'}${l.ang!=null?`;--a:${l.ang}deg`:''}${l.fs?`;font-size:${l.fs}px`:''}">${esc(l.t)}${l.hs?'<b class="tph nw" data-th="1"></b><b class="tph ne" data-th="1"></b><b class="tph sw" data-th="1"></b><b class="tph se" data-th="1"></b>':''}</span>`}).join('');
    LB.innerHTML=`<svg class="pvld" xmlns="http://www.w3.org/2000/svg">${ln}</svg>`+lh+v.handles.map((h,i)=>`<b class="pvh${h.cls?' '+h.cls:''}" data-h="${i}" style="left:${h.x*v.z+v.x}px;top:${h.y*v.z+v.y}px"></b>`).join('')};
  v.fit=()=>{const b=v.bounds;if(!b)return;const r=host.getBoundingClientRect();if(!r.width)return;const ins=v.inset?v.inset():0;const RW=Math.max(200,r.width-ins);const z=Math.min(RW/b.w,r.height/b.h)*.96;v.z=z;v.x=(RW-b.w*z)/2-b.x*z;v.y=(r.height-b.h*z)/2-b.y*z;v.apply()};
  v.zoomAt=(k,cx,cy)=>{const nz=Math.min(Math.max(v.z*k,.01),8);k=nz/v.z;v.x=cx-(cx-v.x)*k;v.y=cy-(cy-v.y)*k;v.z=nz;v.apply()};
  v.toWorld=(cx,cy)=>{const r=host.getBoundingClientRect();return{x:(cx-r.left-v.x)/v.z,y:(cy-r.top-v.y)/v.z}};
  v.set=(layers)=>{ // [{key,url,w,h,T,op}]
    const want=new Set(layers.map(l=>l.key));[...W.querySelectorAll('img')].forEach(c=>{if(!want.has(c.dataset.k))c.remove()});
    layers.forEach((l,i)=>{let im=W.querySelector(`img[data-k="${CSS.escape(l.key)}"]`);if(!im){im=document.createElement('img');im.dataset.k=l.key;im.draggable=false;im.alt='';W.insertBefore(im,v.svg)}
      if(l.url&&im.getAttribute('src')!==l.url)im.src=l.url;im.style.width=l.w+'px';im.style.height=l.h+'px';im.style.transform=cssM(l.T||I);im.style.opacity=l.op??1;im.style.zIndex=i;im.style.mixBlendMode=l.blend||'normal'})};
  const pts=new Map();let moved=0,start=null,pinch=null;
  host.addEventListener('pointerdown',e=>{if(e.button>0)return;host.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;start={x:e.clientX,y:e.clientY};
    if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:v.z}}});
  host.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===1){moved+=Math.abs(dx)+Math.abs(dy);v.x+=dx;v.y+=dy;v.apply()}
    else if(pts.size===2&&pinch){const[a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=host.getBoundingClientRect();moved=99;v.zoomAt((pinch.z*d/pinch.d)/v.z,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);if(pts.get(e.pointerId)===p){} }});
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;
    if(!pts.size&&moved<6&&v.onTap&&start&&e.type==='pointerup'){const w=v.toWorld(e.clientX,e.clientY);v.onTap(w,e)}};
  host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);
  host.addEventListener('wheel',e=>{e.preventDefault();const r=host.getBoundingClientRect();v.zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),e.clientX-r.left,e.clientY-r.top)},{passive:false});
  let lw=0,lh=0;new ResizeObserver(()=>{const r=host.getBoundingClientRect();if(!v.fitted&&v.bounds){v.fit();v.fitted=1}else{if(lw&&lh){v.x+=(r.width-lw)/2;v.y+=(r.height-lh)/2}v.apply()}lw=r.width;lh=r.height}).observe(host);
  return v}
function boundsOf(l){const c=[{x:0,y:0},{x:l.w,y:0},{x:0,y:l.h},{x:l.w,y:l.h}].map(p=>ap(l.T||I,p));const xs=c.map(p=>p.x),ys=c.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}

/* ---------- vista principal ---------- */
function renderMapa(main){ensureLam();
  const ps=pisos();if(U.piso)M.piso=U.piso;if(!M.piso||!S.pis.has(M.piso)){const withL=ps.find(p=>lamsOf(p.id).length);M.piso=(withL||ps[0]||{}).id||''}
  if(M.lpiso!==M.piso){if(M.lpiso!=null){M.sel='';M.vista='';M.selId=null;M.tmp=null;M.pend=null}M.lpiso=M.piso}
  const L0=lamsOf(M.piso);const BS=basesOf(M.piso);if(!BS.some(b=>b.id===M.vista)){const sl=LAM.get(M.sel);M.vista=(sl&&sl.pisoId===M.piso&&vistaOf(sl))||(BS[0]||{}).id||''}
  const base=(LAM.get(M.vista)||{}).pisoId===M.piso?LAM.get(M.vista):null;const L=base?L0.filter(l=>vistaOf(l)===base.id):L0;if(!L.some(l=>l.id===M.sel))M.sel=(base||L[0]||{}).id||'';const cur=LAM.get(M.sel);
  {const sd=typeof curDay==='function'?curDay():todayIso();if(!M.date)M.date=sd;else if(M.date!==sd&&pd(sd).getUTCDay()!==0){zcClose();M.date=sd;M.selId=null;HIST.length=0;REDO.length=0;M.tmp=null;M.pend=null}}ensurePlan();if(typeof ensureDaily==='function')ensureDaily(addD(M.date,-11));
  if(!main.dataset.built){main.innerHTML=`<div class="view mapa"><div class="bar" id="mbar"></div><div class="mnote" id="mnote"></div><div class="mbody"><aside class="mpanel" id="mpanel"></aside><div class="mwrap"><div class="mstage" id="mstage"></div><div class="mtools" id="mtools"></div><div class="mhint" id="mhint"></div><div class="mprops" id="mprops" hidden></div><div class="mmbar" id="mmbar" hidden></div><aside class="mcard" id="mcard" hidden></aside><aside class="mcxb" id="mcxb" hidden></aside><div class="mlgd" id="mleg" hidden></div><div class="mcleg" id="mcleg" hidden></div><div class="mempty" id="mempty"></div></div></div></div>`;main.dataset.built='1';M.view=null;M.vpiso=null;if(M.panel==null)M.panel=innerWidth>=900}
  const bar=$('#mbar');
  const today=todayIso();const dw=DOWN_[(pd(M.date).getUTCDay()+6)%7];
  const hb=`<button class="ib${M.panel?' on':''}" id="mpan" title="Mostrar u ocultar el plan del día">Plan del día</button><span class="dnav"><button class="ib" data-mdd="-1" aria-label="Día anterior">&#8249;</button><b>${dw} ${fmtD(M.date)}</b><button class="ib" data-mdd="1" aria-label="Día siguiente">&#8250;</button>${M.date!==today?'<button class="ib" data-mdd="0">Hoy</button>':''}</span>${U.piso?'':`<select id="mpiso" aria-label="Piso">${ps.map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>`}
    ${BS.length>1?`<span class="mvis" title="Planos base de este piso (vistas)">${BS.map(b=>`<button class="mvb${b.id===M.vista?' on':''}" data-vis="${b.id}">${esc(lname(b))}</button>`).join('')}</span>`:''}
    <span class="mchips">${L.map(l=>`<button class="mchip${l.id===M.sel?' on':''}" data-lsel="${l.id}" title="${esc(l.esp)} · doble clic para cambiar el nombre">${l.base?'<b>BASE</b> ':''}${esc(lname(l))}${!l.base&&!l.aligned?' <span class="warn">sin alinear</span>':''}</button>`).join('')||'<span class="note">Este piso aún no tiene láminas.</span>'}</span>
    ${cur&&!cur.base&&base?`<label class="chk"><input type="checkbox" id="munder"${M.under?' checked':''}> Arquitectura debajo</label><input type="range" id="mop" min="0.15" max="1" step="0.05" value="${M.op}" aria-label="Opacidad de la especialidad" title="Opacidad de la especialidad"${M.under?'':' disabled'}>`:''}
    <span class="sp" style="flex:1"></span>
 <span class="mseg" title="Colorear las zonas por subcontratista o por el cumplimiento registrado en Campo"><button data-cb="sc" class="${M.colorBy!=='cu'?'on':''}">Colores: SC</button><button data-cb="cu" class="${M.colorBy==='cu'?'on':''}">Cumplimiento</button></span>
    <button class="ib pri" id="mmeetb" title="Proyectar el plan del día en la reunión">Modo reunión</button><button class="ib" id="mview" title="Etiquetas, plano de fondo y leyenda">Vista ▾</button><button class="ib" id="mpdf" title="Plan de trabajo de obra (PDF / Excel), detalle del piso o imagen">Exportar…</button><button class="ib" id="mfit" title="Encuadrar todo el plano en la pantalla">Ver todo</button><button class="ib" id="mhi" title="Calidad de imagen">${useHi()?'Alta resolución':'Resolución liviana'}</button>
    ${isAdmin&&cur&&!cur.base&&base?`<button class="ib" id="malign2">${cur.aligned?'Corregir alineación':'Alinear'}</button>`:''}${isAdmin?`<button class="ib pri" id="mup" title="Capas de especialidad sobre la lámina base. La lámina base del piso se sube en Sectorización.">Subir especialidad…</button>${cur?`<button class="ib" id="mmenu" title="Cambiar nombre, alinear, reemplazar o eliminar la lámina seleccionada">&#8943; Editar lámina</button>`:''}`:''}`;
  if(bar.dataset.h!==hb){bar.innerHTML=hb;bar.dataset.h=hb}
  const note=$('#mnote');const nh=lamErr?`<div class="callout">No se pudieron leer las láminas (${esc(lamErr)}). Si acabas de actualizar la página, falta publicar las reglas nuevas de Firestore (LEEME).</div>`:M.busy?`<div class="callout">${esc(M.busy)}</div>`:(cur&&!cur.base&&!cur.aligned&&base)?`<div class="callout warnc"><b>${esc(cur.esp)} aún no está alineada con la arquitectura</b>: por eso no coincide al superponerla. ${isAdmin?'<button class="ib pri" id="malign">Alinear ahora</button>':'Pide al administrador que la alinee.'}</div>`:'';
  if(note.dataset.h!==nh){note.innerHTML=nh;note.dataset.h=nh}
  const empty=$('#mempty');const eh=!lamReady?'Cargando láminas…':!L.length?`<div class="empty">${isAdmin||(typeof canWrite!=='undefined'&&canWrite)?'Este piso aún no tiene lámina base. Se sube en <b>Sectorización</b>, donde además se ubican sus sectores y ambientes. <button class="ib pri" data-gosz="1">Ir a Sectorización</button>':'Aún no hay láminas para este piso.'}</div>`:'';
  empty.innerHTML=eh;empty.hidden=!eh;
  if(!M.view){M.view=Viewer($('#mstage'),{onTap:tapSelect});
    /* clic derecho sobre un cruce: decidir (sin interferencia / prioridad) */
    $('#mstage').addEventListener('contextmenu',e=>{if(!M.view||M.tool!=='pan')return;const c=crossAt(M.view.toWorld(e.clientX,e.clientY));if(!c)return;e.preventDefault();zcClose();crossPop(anchorAt(e.clientX,e.clientY),c)});installDraw(M.view);M.view.inset=()=>{const l=$('#mleg');return l&&!l.hidden&&!l.classList.contains('col')&&innerWidth>=900?l.offsetWidth+16:0}}
  const layers=[];const lay=(l,op,key)=>({key:key||l.id,l,w:l.w,h:l.h,T:l.T||I,op});
  if(cur){if(!cur.base&&base&&M.under){layers.push(lay(base,M.bop,'base'));layers.push({...lay(cur,M.op),blend:'multiply'})}else layers.push(lay(cur,cur.base?M.bop:1))}
  M.view.bounds=base?boundsOf({...base,T:base.T||I}):cur?boundsOf(cur):null;
  const pk=M.piso+'|'+(base?base.id+base.rev:'');if(M.vpiso!==pk){M.vpiso=pk;M.view.fitted=0;requestAnimationFrame(()=>{if(M.view){M.view.fit();M.view.fitted=1}})}
  M.view.set(layers.map(x=>({key:x.key+'|'+x.l.rev,url:IMG.get(x.l.id+'|'+x.l.rev+'|'+(useHi()?'f':'l'))?.url||null,w:x.w,h:x.h,T:x.T,op:x.op,blend:x.blend})));M.view.apply();
  renderPlan(main,cur,base);
  layers.forEach(x=>{const k=x.l.id+'|'+x.l.rev+'|'+(useHi()?'f':'l');if(!IMG.get(k)?.url)imgURL(x.l).then(()=>{if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()}).catch(err=>toast('No se pudo cargar la lámina: '+(err.code||err.message)))});
  main.onclick=e=>{const t=e.target;const c=t.closest('[data-lsel]');if(c){M.sel=c.dataset.lsel;requestRender();return}
    const vb=t.closest('[data-vis]');if(vb){M.vista=vb.dataset.vis;M.sel=M.vista;M.selId=null;M.tmp=null;requestRender();return}
    if(meetClick(e))return;if(planClick(e))return;
    if(t.id==='mfit'){fitAll();return}if(t.id==='mhi'){M.hi=!useHi();requestRender();return}
    if(t.closest&&t.closest('[data-gosz]')){goTab('planos');return}
    if(t.id==='mup'){if(!basesOf(M.piso).length){toast('Primero sube la lámina base del piso en Sectorización.');goTab('planos');return}uploadDialog(t,null,{mode:'spec'});return}if((t.id==='malign'||t.id==='malign2')&&cur){doAlign(cur);return}if(t.id==='mmenu'&&cur){lamMenu(t,cur);return}};
  main.ondblclick=e=>{const c=e.target.closest('[data-lsel]');if(c&&isAdmin){const l=LAM.get(c.dataset.lsel);if(l)renameDialog(c,l)}};
  main.onchange=e=>{const t=e.target;if(t.id==='mpiso'){M.piso=t.value;M.sel='';M.vista='';M.selId=null;M.tmp=null;M.pend=null;requestRender()}if(t.id==='mscd'){M.scDraw=t.value;M.pend=null;M.selId=null;requestRender()}if(t.id==='munder'){M.under=t.checked;requestRender()}};
  main.oninput=e=>{if(e.target.id==='mop'){M.op=+e.target.value;requestRender()}};
  main.onmouseover=legHover;main.onmouseleave=()=>setHL(null);
  main.addEventListener('change',e=>{if(e.target.id==='mmpiso'){const v=e.target.value;if(U.piso){U.piso=v;saveUI()}M.piso=v;M.sel='';M.vista='';M.selId=null;M.tmp=null;M.pend=null;M.meetSc='';zcClose();requestRender();return}
    if(e.target.id==='mmvis'){M.vista=e.target.value;M.sel=M.vista;requestRender();setTimeout(()=>meetGo(M.meetSc),200)}});
}

/* =====================================================================
   ETAPA 2 · Plan del día sobre el plano (zonas vinculadas al lookahead)
   pdz/{id}: {date,pisoId,sc,kind:'zona'|'nova'|'trazo'|'flecha'|'texto',pts:[x,y,…],actId,ambId,desc,fuera,motivo,t,by,byName,ts}
   pzon/{actId}: última zona usada por la actividad {pisoId,pts,ts}
   ===================================================================== */
const DOWN_=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const PD=new Map(),ZN=new Map();let pdSub=null,pdKey=null,znSub=null,znKey=null,planHook=false;M.pdErr=null;
function ensurePlan(){if(!db)return;
  if(pdKey!==M.date){if(pdSub)pdSub();pdKey=M.date;PD.clear();pdSub=fcol('pdz').where('date','==',M.date).onSnapshot(sn=>{PD.clear();sn.docs.forEach(d=>PD.set(d.id,{...d.data(),id:d.id}));M.pdErr=null;if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()},err=>{M.pdErr=err&&err.code||'error';if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()})}
  if(znKey!==M.piso){if(znSub)znSub();znKey=M.piso;ZN.clear();if(M.piso)znSub=fcol('pzon').where('pisoId','==',M.piso).onSnapshot(sn=>{ZN.clear();sn.docs.forEach(d=>ZN.set(d.id,{...d.data(),id:d.id}));if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()},()=>{})}
  if(!planHook){planHook=true;unsubs.push(()=>{if(pdSub)pdSub();if(znSub)znSub();pdSub=znSub=null;pdKey=znKey=null;PD.clear();ZN.clear();planHook=false})}}
const flat=a=>a.flatMap(p=>[Math.round(p.x*10)/10,Math.round(p.y*10)/10]);
const unflat=f=>{const o=[];for(let i=0;i+1<(f||[]).length;i+=2)o.push({x:f[i],y:f[i+1]});return o};
const myRole=()=>me&&me.role;
const PHONE=()=>matchMedia('(max-width:760px)').matches;
const myScs=()=>(me&&me.scs&&me.scs.length?me.scs:(me&&me.sc?[me.sc]:[]));
const canPlan=sc=>!!sc&&!PHONE()&&(canWrite||(myRole()==='sc'&&myScs().includes(sc)));
function dayActs(pid,d){const out=[];for(const x of S.act.values()){if(!schedOn(x,d))continue;const a=S.amb.get(x.ambId);if(!a)continue;const s=S.sec.get(a.sectorId);if(!s||s.pisoId!==pid)continue;out.push({x,a,s})}
  return out.sort((p,q)=>(p.s.order||0)-(q.s.order||0)||(p.a.order||0)-(q.a.order||0)||(p.x.order||0)-(q.x.order||0))}
/* Ubicación automática: cada actividad programada del día toma la forma de su ambiente (Sectorización), salvo que
   ese día tenga una zona propia dibujada («solo una parte») o esté marcada como que no va. No se guarda: se calcula. */
const VZ=new Map();let VZK='';const VZC=new Map();
function virtZones(pid){const d=M.date;const k=d+'|'+pid;let c=VZC.get(k);const dv=(typeof DV!=='undefined'?DV:0)+'|'+LAM.size+'|'+basesOf(pid).map(b=>b.id).join();if(c&&c.dv===dv)return c.L;
  const L=[];for(const{x,a}of dayActs(pid,d)){const g=a.geo||{};const B=basesOf(pid);const v=(B.find(b=>g[b.id]&&g[b.id].length>=6)||{}).id;if(!v)continue;
    const z={id:'v:'+x.id,kind:'zona',virt:true,date:d,pisoId:pid,vista:v,sc:x.sc,actId:x.id,ambId:x.ambId,pts:g[v],desc:'',by:'',byName:'',ts:0};L.push(z);VZ.set(z.id,z)}
  VZC.set(k,{dv,L});if(VZC.size>40)VZC.delete(VZC.keys().next().value);return L}
const zget=id=>PD.get(id)||VZ.get(id);
const shapesOf=pid=>{const real=[...PD.values()].filter(z=>z.pisoId===pid);const has=new Set(real.filter(z=>z.actId&&(z.kind==='zona'||z.kind==='nova')).map(z=>z.actId));return real.concat(virtZones(pid).filter(z=>!has.has(z.actId)))};
function scsOfDay(){const set=new Set(dayActs(M.piso,M.date).map(o=>o.x.sc));shapesOf(M.piso).forEach(z=>set.add(z.sc));return[...set].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))}
function centroid(P){let x=0,y=0;P.forEach(p=>{x+=p.x;y+=p.y});return{x:x/P.length,y:y/P.length}}
function bboxOf(P){const xs=P.map(p=>p.x),ys=P.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
const short=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
function zoneLabel(z){if(z.kind!=='zona')return'';if(z.actId){const x=S.act.get(z.actId);const a=x&&S.amb.get(x.ambId);return`${a?a.code+' ':''}${short(x?x.name:'(actividad eliminada)',26)}`}return'NO PROG. · '+short(z.desc||'',24)}
function curAligned(cur,base){return !cur||cur.base||cur.aligned||!base}
async function savePD(id,doc){try{await fcol('pdz').doc(id).set(doc)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
async function updPD(id,patch){try{await fcol('pdz').doc(id).update(patch)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
async function delPD(id){try{await fcol('pdz').doc(id).delete()}catch(err){toast('No se pudo borrar: '+(err.code||err.message))}}
function learn(z){if(z&&z.kind==='zona'&&z.actId&&z.pts)fcol('pzon').doc(z.actId).set({pisoId:z.pisoId,vista:zVista(z),pts:z.pts,sc:z.sc||'',ts:NOW(),by:me.email}).catch(()=>{})}
const shapesV=pid=>shapesOf(pid).filter(z=>z.kind!=='xok'&&(z.kind==='nova'||zVista(z)===M.vista));
/* historial para deshacer / rehacer (solo lo hecho en esta sesión) */
const HIST=[],REDO=[];
function rec(g){if(g&&g.length){HIST.push(g);if(HIST.length>80)HIST.shift();REDO.length=0}}
const strip_=z=>{const{id,...d}=z;return d};
function addDoc(id,doc){PD.set(id,{...doc,id});savePD(id,doc);return{op:'add',id,doc}}
function remDoc(id){const z=PD.get(id);if(!z)return null;PD.delete(id);delPD(id);return{op:'del',id,doc:strip_(z)}}
function updDoc(id,patch,before){const z=PD.get(id);if(!z)return null;Object.assign(z,patch);updPD(id,patch);return{op:'upd',id,before,after:patch}}
function applyG(g,undo){for(const o of (undo?[...g].reverse():g)){
    if(o.op==='add'){if(undo){PD.delete(o.id);delPD(o.id)}else{PD.set(o.id,{...o.doc,id:o.id});savePD(o.id,o.doc)}}
    else if(o.op==='del'){if(undo){PD.set(o.id,{...o.doc,id:o.id});savePD(o.id,o.doc)}else{PD.delete(o.id);delPD(o.id)}}
    else if(o.op==='upd'){const p=undo?o.before:o.after;const z=PD.get(o.id);if(z){Object.assign(z,p);updPD(o.id,p)}}}
  if(M.selId&&!PD.has(M.selId))M.selId=null;requestRender()}
function undo(){const g=HIST.pop();if(!g){toast('No hay nada que deshacer.');return}applyG(g,true);REDO.push(g)}
function redo(){const g=REDO.pop();if(!g)return;applyG(g,false);HIST.push(g)}
const own=z=>!!z&&!z.virt&&z.kind!=='nova'&&z.kind!=='xok'&&canPlan(z.sc);
function rskMsg(aid){if(typeof restrPend!=='function')return'';const rs=restrPend(aid);if(!rs.length)return'';const x=S.act.get(aid);return`⚠ “${(x&&x.name)||'Actividad'}” tiene ${rs.length} restricción${rs.length>1?'es':''} pendiente${rs.length>1?'s':''}: ${rs.slice(0,2).map(rTxt).join(' | ')}${rs.length>2?' …':''}. Se programa igual, queda marcada con alerta.`}
function rskWarn(aid,quiet){const m=rskMsg(aid);if(m&&!quiet)toast(m);return m?1:0}
function zoneAlerts(zid,aid){const msgs=[];const rs=rskMsg(aid);if(rs)msgs.push(rs);try{computeCross()}catch(e){}
  const ZL_=planNumbering(null).zl;const c=CROSS.list.find(c=>c.a.id===zid||c.b.id===zid);if(c){const o=c.a.id===zid?c.b:c.a;msgs.push(`⚠ Superposición con ${conOf(o.sc).name}: ${zNo(o,ZL_)}${zoneLabel(o)}. Revisa el área rayada en rojo.`)}
  const s2=CROSS.seq.find(c=>c.a.id===zid||c.b.id===zid);if(s2){const o=s2.a.id===zid?s2.b:s2.a;msgs.push(`↔ Comparte zona con ${zNo(o,ZL_)}${zoneLabel(o)} (mismo subcontratista: secuencia constructiva, no es interferencia).`)}
  if(msgs.length)toast(msgs.join('  ·  '))}
function newZone(pts,link,vista){const id=uid('pz');const x=link.actId?S.act.get(link.actId):null;
  const doc={date:M.date,pisoId:M.piso,vista:vista||M.vista,sc:x?x.sc:M.scDraw,kind:'zona',pts:flat(pts),actId:link.actId||null,ambId:x?x.ambId:(link.ambId||null),desc:link.desc||'',fuera:!link.actId,by:me.email,byName:me.name||me.email,ts:NOW()};
  rec([addDoc(id,doc)]);learn(doc);M.selId=id;M.pend=null;if(M.meet){M.tool='pan';M.selId=null}requestRender();if(!M.batch)setTimeout(()=>zoneAlerts(id,link.actId),500);
  toast(link.actId?`Zona de “${short(x.name,40)}” guardada`:'Trabajo no programado ubicado','Deshacer',undo)}
function newNote(kind,pts,t){const id=uid('pz');const doc={date:M.date,pisoId:M.piso,vista:M.vista,sc:M.scDraw,kind,pts:flat(pts),t:t||'',actId:null,by:me.email,byName:me.name||me.email,ts:NOW()};
  if(kind==='texto')doc.fs=M.fs;else doc.w=M.lw;rec([addDoc(id,doc)]);M.selId=id;requestRender()}
function delIds(ids,msg){const g=ids.map(remDoc).filter(Boolean);if(!g.length)return 0;rec(g);M.selId=null;requestRender();toast(msg||(g.length===1?'Eliminado':`${g.length} dibujos eliminados`),'Deshacer',undo);return g.length}
M.fs=18;M.lw=2;M.eraseMode='touch';M.eraseWhat='all';
const FS=[12,14,18,24,32,44];
/* anclaje para ventanitas en la posición del puntero */
function anchorAt(x,y){let a=$('#manch');if(!a){a=document.createElement('div');a.id='manch';a.style.cssText='position:fixed;width:1px;height:1px;pointer-events:none;z-index:1';document.body.appendChild(a)}a.style.left=x+'px';a.style.top=y+'px';return a}
function linkChooser(pts,cx,cy,onPick){const sc=onPick?(zget(M.selId)?.sc||M.scDraw):M.scDraw;const pick=onPick||(l=>newZone(pts,l));const L=dayActs(M.piso,M.date).filter(o=>o.x.sc===sc);const located=new Set(shapesOf(M.piso).filter(z=>z.kind==='zona'&&z.actId).map(z=>z.actId));
  const h={};const btns=L.map((o,i)=>{h['a'+i]=()=>pick({actId:o.x.id});return`<button data-do="a${i}">${located.has(o.x.id)?'✓ ':''}<b>${esc(o.a.code)}</b> ${esc(short(o.x.name,38))}</button>`}).join('');
  h.np=()=>setTimeout(()=>npDialog(anchorAt(cx,cy),pts,onPick),0);h.no=()=>{M.tmp=null;requestRender()};
  openPop(anchorAt(cx,cy),`<div class="ph">¿Qué actividad de ${esc(conOf(sc).name)} va en esta zona?</div>${btns||'<div class="ptx">No tiene actividades programadas este día en este piso.</div>'}<hr><button data-do="np">Trabajo no programado…</button><button data-do="no">${onPick?'Cancelar':'Descartar el dibujo'}</button>`,h)}
function npDialog(anchor,pts,onPick){openPop(anchor,`<div class="ph">Trabajo no programado</div><div class="qrow" style="padding:0 10px 8px"><input id="npd" placeholder="¿Qué se hará?" style="width:240px;text-align:left" aria-label="Descripción"></div><button data-do="ok">Guardar</button><button data-do="no">Cancelar</button>`,
  {ok:()=>{const d=($('#npd')?.value||'').trim();if(!d){toast('Describe el trabajo.');return}if(onPick)onPick({desc:d});else if(pts)newZone(pts,{desc:d});else{M.pend={desc:d};M.tool='zona';toast('Dibuja en el plano dónde se hará.');requestRender()}},no:()=>{M.tmp=null;requestRender()}});
  setTimeout(()=>{const i=$('#npd');if(i){i.focus();i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=ok]').click()}})}},0)}
function textDialog(w,cx,cy,z){openPop(anchorAt(cx,cy),`<div class="ph">${z?'Editar texto':'Texto en el plano'}</div><div class="qrow" style="padding:0 10px 8px"><input id="ntx" placeholder="Escribe la nota" value="${z?esc(z.t||''):''}" style="width:240px;text-align:left" aria-label="Texto"></div><button data-do="ok">${z?'Guardar':'Poner texto'}</button>`,
  {ok:()=>{const t=($('#ntx')?.value||'').trim();if(!t)return;if(z){rec([updDoc(z.id,{t},{t:z.t})]);requestRender()}else newNote('texto',[w],t)}});setTimeout(()=>{const i=$('#ntx');if(i){i.focus();i.select();i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=ok]').click()}})}},0)}
function novaDialog(btn,x,opt){opt=opt||{};const cnc=(P().cnc||[]);const t0=todayIso();let def=addD(M.date,1);if(pd(def).getUTCDay()===0)def=addD(def,1);const cw=typeof canWrite!=='undefined'&&canWrite;
  const sug=opt.motivo&&(cnc.find(k=>k===opt.motivo)||cnc.find(k=>/interfer|cruce|frente|otra partida/i.test(k))||cnc.find(k=>cncCode(k)==='PROG'))||opt.motivo||'';const cncL=sug&&!cnc.includes(sug)?[sug,...cnc]:cnc;
  function save(motivo,rdate){const id=uid('pz');const doc={date:M.date,pisoId:M.piso,sc:x.sc,kind:'nova',actId:x.id,ambId:x.ambId,motivo,repTo:rdate||'',...(opt.prio?{prio:opt.prio}:{}),by:me.email,byName:me.name||me.email,ts:NOW()};const g=[addDoc(id,doc)];
    shapesOf(M.piso).filter(z=>z.kind==='zona'&&z.actId===x.id).forEach(z=>g.push(remDoc(z.id)));rec(g.filter(Boolean));
    let regd=false;if(typeof canDaily!=='undefined'&&canDaily&&M.date<=t0){const cur=recOf(M.date,x.id);writeDaily(M.date,M.piso,{recs:{[x.id]:{...baseRec(M.date,x,cur),status:'no',cnc:motivo,imp:null,note:(cur&&cur.note)||'No se hará hoy (plan diario)',viaNova:true}}});regd=true}
    if(rdate&&cw)reprogAct(x.id,rdate,M.date);
    requestRender();toast(`No se hará hoy${regd?' · registrada como no cumplida':''}${rdate&&cw?' · reprogramada para el '+fmtD(rdate):''}`,'Deshacer',()=>revertNova(id))}
  openPop(btn,`<div class="ph">${opt.title?esc(opt.title):'No se hará hoy'}</div><div class="ptx">${opt.lead?opt.lead+' ':''}Estaba programada para hoy pero no se va a ejecutar. ${M.date<=t0?'Queda registrada como <b>no cumplida</b> (cuenta en el PPC del día) con el motivo que elijas.':'Quedará anotada en el plan del día.'}</div>
   <div class="qrow"><select id="nvm" aria-label="Motivo">${cncL.map(k=>`<option value="${esc(k)}"${k===sug?' selected':''}>${esc(cncLabel(k))}</option>`).join('')}</select></div>
   ${cw?`<div class="qrow"><label class="mu">Reprogramar para <input type="date" id="nvd" min="${addD(M.date,1)}" value="${def}"></label></div>`:''}
   ${cw?'<button data-do="ok" class="pri">Confirmar y reprogramar</button><button data-do="nod">Confirmar, reprogramo después</button>':'<button data-do="nod" class="pri">Confirmar</button>'}<button data-do="no">Cancelar</button>`,
   {no:()=>{},nod:()=>save(($('#nvm')||{}).value||'',''),ok:()=>{const v=($('#nvd')||{}).value;if(!v){toast('Elige la fecha o usa “reprogramo después”.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}save(($('#nvm')||{}).value||'',v)}})}
function revertNova(id){const z=PD.get(id);if(!z)return;const o=remDoc(id);if(o)rec([o]);
  const x=S.act.get(z.actId);if(x){const rc=typeof recOf==='function'?recOf(z.date,x.id):null;
    if(rc&&rc.viaNova&&typeof canDaily!=='undefined'&&canDaily)writeDaily(z.date,z.pisoId,{recs:{[x.id]:{...baseRec(z.date,x,rc),status:null,exec:null,cnc:'',imp:null,note:'',viaNova:false}}});
    if(z.repTo&&typeof canWrite!=='undefined'&&canWrite&&(x.days||[]).includes(z.repTo)&&!recOf(z.repTo,x.id)){const nx={...x,days:(x.days||[]).filter(d=>d!==z.repTo)};if(nx.qty){nx.qty={...nx.qty};delete nx.qty[z.repTo]}apply([op('acts',x.id,nx)],'Reprogramación deshecha')}}
  requestRender();toast('Deshecho')}
/* ---------- dibujo sobre el plano ---------- */
/* lista de lo visto en obra sin estar programado (para el panel y la reunión) */
function npSeenHtml(kind){if(typeof npItems!=='function')return'';const L=npItems([M.date],new Set([M.piso])).filter(i=>i.src==='np');if(!L.length)return'';
  return L.map(i=>{const c=conOf(i.e.sc).color;const am=i.a?i.a.code+' · '+i.a.name:'';
    return kind==='mlr'?`<button class="mlr" data-npo="${esc(i.id)}"><i class="nbi np" style="--c:${c}">+</i><span><b>${esc(i.e.desc||'')}</b><small>${esc(conOf(i.e.sc).name)}${am?' · '+esc(am):''}${i.e.pt?'':' · sin ubicar'}</small></span></button>`
      :`<div class="mp-it np"><div class="t">${esc(i.e.desc||'')}<small>${esc(conOf(i.e.sc).name)}${am?' · '+esc(am):''} · ${esc(i.e.byName||'')}${(i.e.photos||[]).length?' · 📷':''}</small></div><div class="s"><button class="lnkb" data-npo="${esc(i.id)}">Ver</button></div></div>`}).join('')}
function tapSelect(w,e){if(M.tool!=='pan')return;const els=document.elementsFromPoint(e.clientX,e.clientY);const z=els.map(el=>el.closest&&el.closest('[data-z]')).find(Boolean);const zid=z&&z.dataset.z?z.dataset.z:null;
  if(zid&&zid.startsWith('np:')){if(typeof npOpen==='function')npOpen(zid.slice(3));return}
  if(M.meet&&typeof canWrite!=='undefined'&&canWrite){const c=crossAt(w);if(c){zcClose();crossPop(anchorAt(e.clientX,e.clientY),c);return}}
  if(M.meet||M.colorBy==='cu'){const zz=zid&&zget(zid);if(zz&&zz.kind==='zona'&&zz.actId)zCard(zz.actId,e.clientX,e.clientY);else zcClose();if(M.meet)return}
  M.selId=zid;requestRender()}
function hitIds(cx,cy,r){const out=new Set();const pts=[[0,0],[r,0],[-r,0],[0,r],[0,-r]];for(const[dx,dy]of pts){for(const el of document.elementsFromPoint(cx+dx,cy+dy)){const z=el.closest&&el.closest('[data-z]');if(z&&z.dataset.z)out.add(z.dataset.z)}}return[...out]}
const erasable=z=>own(z)&&(myRole()==='sc'||z.sc===M.scDraw)&&(M.eraseWhat==='all'||z.kind!=='zona');
function installDraw(v){const host=v.host;let drag=null;
  const stop=e=>{e.stopImmediatePropagation();e.preventDefault()};
  host.addEventListener('pointerdown',e=>{if(e.button>0)return;const w=v.toWorld(e.clientX,e.clientY);
    const hEl=e.target.closest&&e.target.closest('.pvh');const sel=M.selId&&zget(M.selId);
    const th=e.target.closest&&e.target.closest('.tph');if(th&&own(sel)&&sel.kind==='texto'){stop(e);host.setPointerCapture(e.pointerId);const lab=th.parentElement.getBoundingClientRect();const ax=lab.left,ay=lab.top+lab.height/2;drag={mode:'tsize',id:sel.id,ax,ay,d0:Math.max(8,Math.hypot(e.clientX-ax,e.clientY-ay)),fs0:sel.fs||18};return}
    if(hEl&&own(sel)){stop(e);host.setPointerCapture(e.pointerId);drag={mode:'vert',i:+hEl.dataset.h,id:sel.id,pts:unflat(sel.pts),before:sel.pts};return}
    if(M.meet)return;
    if(M.tool==='pan'){const zEl=e.target.closest&&e.target.closest('[data-z]');const z=zEl&&zget(zEl.dataset.z);
      if(own(z)){stop(e);host.setPointerCapture(e.pointerId);if(M.selId!==z.id){M.selId=z.id;requestRender()}drag={mode:'move',id:z.id,w0:w,pts:unflat(z.pts),before:z.pts,moved:0}}return}
    if(!M.scDraw||!canPlan(M.scDraw)){stop(e);toast('Primero elige en “Plan del día” para qué subcontratista dibujas.');return}
    if(M.tool==='borrar'){stop(e);host.setPointerCapture(e.pointerId);
      if(M.eraseMode==='area'){drag={mode:'erasearea',p0:w};M.tmp={kind:'erase',pts:[w,w,w,w]};drawOverlay()}else{drag={mode:'erase',g:[]};eraseAt(e,drag)}return}
    const L=LAM.get(M.sel),B=baseOf(M.piso);if(!curAligned(L,B)){stop(e);toast('Esta lámina no está alineada: cambia a Arquitectura o alinéala antes de dibujar.');return}
    stop(e);
    if(M.tool==='poly'){if(!M.tmp)M.tmp={kind:'poly',pts:[w]};else{const f=M.tmp.pts[0];const dpx=Math.hypot((f.x-w.x)*v.z,(f.y-w.y)*v.z);if(M.tmp.pts.length>=3&&dpx<14){finishPoly(e.clientX,e.clientY);return}M.tmp.pts.push(w)}drawOverlay();return}
    if(M.tool==='texto'){textDialog(w,e.clientX,e.clientY);return}
    host.setPointerCapture(e.pointerId);drag={mode:M.tool,p0:w,pts:[w]};M.tmp={kind:M.tool,pts:[w,w]};drawOverlay()},true);
  function eraseAt(e,d){for(const id of hitIds(e.clientX,e.clientY,6)){const z=PD.get(id);if(erasable(z)){const o=remDoc(id);if(o)d.g.push(o)}}if(d.g.length)drawOverlay()}
  host.addEventListener('pointermove',e=>{const w=v.toWorld(e.clientX,e.clientY);
    if(drag){stop(e);
      if(drag.mode==='erase'){eraseAt(e,drag);return}
      if(drag.mode==='tsize'){const d=Math.hypot(e.clientX-drag.ax,e.clientY-drag.ay);const fs=Math.round(Math.min(160,Math.max(8,drag.fs0*d/drag.d0)));const z=PD.get(drag.id);if(z&&z.fs!==fs){z.fs=fs;drag.cur=fs;drawOverlay();const ind=$('#mfsv');if(ind)ind.textContent=fs+' px'}return}
      if(drag.mode==='erasearea'){const a=drag.p0;M.tmp={kind:'erase',pts:[a,{x:w.x,y:a.y},w,{x:a.x,y:w.y}]};drawOverlay();return}
      if(drag.mode==='vert'){const P=drag.pts.slice();P[drag.i]=w;drag.cur=P;PD.get(drag.id).pts=flat(P);drawOverlay();return}
      if(drag.mode==='move'){const dx=w.x-drag.w0.x,dy=w.y-drag.w0.y;drag.moved=Math.max(drag.moved,Math.hypot(dx,dy)*v.z);drag.cur=drag.pts.map(p=>({x:p.x+dx,y:p.y+dy}));PD.get(drag.id).pts=flat(drag.cur);drawOverlay();return}
      if(drag.mode==='zona'){const a=drag.p0;M.tmp={kind:'zona',pts:[a,{x:w.x,y:a.y},w,{x:a.x,y:w.y}]}}
      else if(drag.mode==='flecha')M.tmp={kind:'flecha',pts:[drag.p0,w]};
      else if(drag.mode==='trazo'){const l=drag.pts[drag.pts.length-1];if(Math.hypot((l.x-w.x)*v.z,(l.y-w.y)*v.z)>3)drag.pts.push(w);M.tmp={kind:'trazo',pts:drag.pts}}
      drawOverlay();return}
    if(M.tool==='poly'&&M.tmp){M.tmp.hover=w;drawOverlay()}},true);
  const upH=e=>{if(!drag)return;stop(e);const d=drag;drag=null;
    if(d.mode==='tsize'){if(d.cur&&d.cur!==d.fs0)rec([updDoc(d.id,{fs:d.cur},{fs:d.fs0})]);requestRender();return}
    if(d.mode==='erase'){if(d.g.length){rec(d.g);M.selId=null;requestRender();toast(d.g.length===1?'Borrado':`${d.g.length} dibujos borrados`,'Deshacer',undo)}return}
    if(d.mode==='erasearea'){const t=M.tmp;M.tmp=null;const r=bboxOf(t.pts);const ids=shapesV(M.piso).filter(z=>{if(!erasable(z))return false;const b=bboxOf(unflat(z.pts));return b.x<=r.x+r.w&&b.x+b.w>=r.x&&b.y<=r.y+r.h&&b.y+b.h>=r.y}).map(z=>z.id);
      if(!ids.length){drawOverlay();toast('No hay dibujos tuyos en esa área.');return}delIds(ids);return}
    if(d.mode==='vert'||d.mode==='move'){if(d.cur&&(d.mode==='vert'||d.moved>3)){const z=PD.get(d.id);rec([updDoc(d.id,{pts:flat(d.cur)},{pts:d.before})]);learn(z)}else if(d.mode==='move'){PD.get(d.id).pts=d.before}requestRender();return}
    const t=M.tmp;M.tmp=null;if(!t){drawOverlay();return}const bb=bboxOf(t.pts);const big=Math.max(bb.w,bb.h)*v.z>8;
    if(!big&&t.kind!=='trazo'){drawOverlay();return}
    if(t.kind==='zona'){if(M.pend){newZone(t.pts,M.pend);return}M.tmp=t;drawOverlay();linkChooser(t.pts,e.clientX,e.clientY);return}
    if(t.kind==='flecha')newNote('flecha',t.pts);else if(t.kind==='trazo'&&t.pts.length>1)newNote('trazo',t.pts);drawOverlay()};
  host.addEventListener('pointerup',upH,true);host.addEventListener('pointercancel',e=>{if(drag){if(drag.g&&drag.g.length)rec(drag.g);drag=null;M.tmp=null;requestRender()}},true);
  host.addEventListener('dblclick',e=>{if(M.tool==='poly'&&M.tmp){stop(e);finishPoly(e.clientX,e.clientY);return}
    const zEl=e.target.closest&&e.target.closest('[data-z]');const z=zEl&&zget(zEl.dataset.z);if(z&&z.kind==='texto'&&own(z)){stop(e);textDialog(null,e.clientX,e.clientY,z)}},true);
  const KEYS={v:'pan',r:'zona',p:'poly',f:'flecha',t:'texto',l:'trazo',e:'borrar'};
  document.addEventListener('keydown',e=>{if(U.tab!=='mapa'||document.querySelector('.mdlg')||!pop.hidden||/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
    if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();return}
    if(e.key==='Escape'){if(M.tmp||M.pend){M.tmp=null;M.pend=null;requestRender()}else if(M.selId){M.selId=null;requestRender()}return}
    if(e.key==='Enter'&&M.tool==='poly'&&M.tmp){const r=host.getBoundingClientRect();finishPoly(r.left+r.width/2,r.top+r.height/2);return}
    if((e.key==='Delete'||e.key==='Backspace')&&M.selId){const z=zget(M.selId);if(own(z)){e.preventDefault();delIds([z.id])}return}
    if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&KEYS[k]){M.tool=KEYS[k];M.tmp=null;requestRender()}})}
function finishPoly(cx,cy){const t=M.tmp;if(!t||t.pts.length<3){toast('Un polígono necesita al menos 3 puntos.');return}M.tmp={kind:'zona',pts:t.pts};if(M.pend){const p=M.tmp.pts;M.tmp=null;newZone(p,M.pend);return}drawOverlay();linkChooser(M.tmp.pts,cx,cy)}
function delSel(){const z=zget(M.selId);if(own(z))delIds([z.id])}
const LW={1:2.5,2:4,3:7};
function drawOverlay(){const v=M.view;if(!v)return;computeCross();const NUMS=planNumbering(null);const HL=M.hl;const k=Math.max(1,1/v.z);const all=shapesV(M.piso).filter(z=>z.kind!=='nova');const sel=M.selId&&zget(M.selId);
  let svg=`<defs><pattern id="hxr" width="${10*k}" height="${10*k}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${4*k}" height="${10*k}" fill="#d32f2f"/></pattern><pattern id="hxs" width="${10*k}" height="${10*k}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${3*k}" height="${10*k}" fill="#546e7a"/></pattern></defs>`;const labels=[];const er=M.tool==='borrar';const inv=new Map();[...CROSS.ids,...CROSS.seqIds].forEach((id,n)=>inv.set(id,n));
  const cu=M.colorBy==='cu';const RSK=typeof pendRestr==='function'?pendRestr():new Map();
  for(const z of all){const c0=conOf(z.sc).color;const st=cu&&z.kind==='zona'?(z.actId?zSt(z):'np'):null;const c=st&&st!=='np'?STC[st]:c0;const P=unflat(z.pts);if(!P.length)continue;const fv=M.meet?M.meetSc:scVis();const dim=fv&&z.sc!==fv;const cx=CROSS.ids.has(z.id);const isSel=sel&&sel.id===z.id;const op=dim?0.14:1;const hi=!!(HL&&HL.has(z.id)),dH=!!(HL&&!hi&&z.kind==='zona');
    const pts=P.map(p=>p.x+','+p.y).join(' ');const lw=LW[z.w||2];const eo=er&&erasable(z)?' class="erz"':'';
    if(z.kind==='zona'){const sw=isSel||hi?4:2.5;svg+=`<polygon points="${pts}" fill="none" stroke="#fff" stroke-width="${sw+3}" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="${dim||dH?.35:.9}" pointer-events="none"/><polygon data-z="${z.id}"${eo} points="${pts}" fill="${c}" fill-opacity="${dim?.06:dH?.07:hi?.55:.34}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${z.fuera?'stroke-dasharray="7 5"':(inv.has(z.id)?`stroke-dasharray="12 12" stroke-dashoffset="${inv.get(z.id)%2?12:0}"`:'')} opacity="${op}"/> ${z.actId&&RSK.get(z.actId)&&!dim?`<polygon points="${pts}" fill="none" stroke="#ef6c00" stroke-width="4" stroke-dasharray="10 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}${cx&&!dim?`<polygon points="${pts}" fill="none" stroke="#d32f2f" stroke-width="3" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}`;
      if(!dim){const ce=centroid(P);const bb=bboxOf(P);const xa=z.actId&&S.act.get(z.actId),aa=xa&&S.amb.get(xa.ambId);const rs=z.actId&&RSK.get(z.actId);
        const tip=`${NUMS.zl.get(z.id)||''} · ${conOf(z.sc).name} · ${xa?xa.name+(aa?' — '+aa.code+' '+aa.name:''):'No programado: '+(z.desc||'')}${st&&st!=='np'?' · '+STT[st]:''}${rs?' · ⛔ restricción pendiente':''}${cx?' · ⚠ superposición con otro subcontratista':''}`;
        if(M.lbl!=='name'&&NUMS.zl.has(z.id))labels.push({id:z.id,x:ce.x,y:ce.y,t:NUMS.zl.get(z.id),nb:1,np:!z.actId,ring:cx?'rx':rs?'rr':'',area:bb.w*bb.h,tip,c,f:lum(c)>.55?'#1b1b1b':'#fff',cls:(isSel?'sel':'')+(hi?' hl':'')+(dH?' dm':'')});
        else labels.push({id:z.id,x:ce.x,y:ce.y,t:(st&&st!=='np'?STI[st]+' ':'')+(rs?'⛔ ':'')+(cx?'⚠ ':CROSS.seqIds.has(z.id)?'↔ ':'')+zoneLabel(z),area:bb.w*bb.h,tip,c,f:z.fuera?c:(lum(c)>.55?'#1b1b1b':'#fff'),cls:(z.fuera?'np':'')+(isSel?' sel':'')+(hi?' hl':'')+(dH?' dm':'')})}}
    else if(z.kind==='trazo')svg+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${isSel?lw+1.5:lw}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/><polyline data-z="${z.id}"${eo} points="${pts}" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;
    else if(z.kind==='flecha'){svg+=`<line x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="${c}" stroke-width="${isSel?lw+1.5:lw}" vector-effect="non-scaling-stroke" stroke-linecap="round" opacity="${op}"/><line data-z="${z.id}"${eo} x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;if(!dim)labels.push({id:z.id,x:P[1].x,y:P[1].y,t:'',c,cls:'arw w'+(z.w||2),ang:Math.atan2(P[1].y-P[0].y,P[1].x-P[0].x)*180/Math.PI})}
    else if(z.kind==='texto'){if(!dim)labels.push({id:z.id,x:P[0].x,y:P[0].y,t:z.t||'',c,f:c,fs:z.fs||18,cls:'txt'+(isSel?' sel':''),hs:isSel&&own(z)&&M.tool==='pan'})}}
  const fvv=M.meet?M.meetSc:scVis();
  for(const c of CROSS.list){if(!c.r||(fvv&&c.a.sc!==fvv&&c.b.sc!==fvv))continue;svg+=`<rect x="${c.r.x}" y="${c.r.y}" width="${c.r.w}" height="${c.r.h}" fill="url(#hxr)" fill-opacity=".75" stroke="#d32f2f" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
  for(const c of CROSS.seq){if(!c.r||(fvv&&c.a.sc!==fvv))continue;svg+=`<rect x="${c.r.x}" y="${c.r.y}" width="${c.r.w}" height="${c.r.h}" fill="url(#hxs)" fill-opacity=".55" stroke="#546e7a" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
  const t=M.tmp;if(t){const c=t.kind==='erase'?'#c62828':(conOf(M.scDraw).color||'#1565c0');let P=t.pts;if(t.kind==='poly'&&t.hover)P=[...P,t.hover];const pts=P.map(p=>p.x+','+p.y).join(' ');
    if(t.kind==='zona'||t.kind==='poly'||t.kind==='erase')svg+=`<polygon points="${pts}" fill="${c}" fill-opacity="${t.kind==='erase'?.08:.22}" stroke="${c}" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`+(t.kind==='poly'?t.pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${5*k}" fill="${c}"/>`).join(''):'');
    else if(t.kind==='flecha'){svg+=`<line x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="${c}" stroke-width="${LW[M.lw]}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`;labels.push({x:P[1].x,y:P[1].y,t:'',c,cls:'arw w'+M.lw,ang:Math.atan2(P[1].y-P[0].y,P[1].x-P[0].x)*180/Math.PI})}
    else if(t.kind==='trazo')svg+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${LW[M.lw]}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`}
  /* trabajo no programado visto en obra (registrado en el recorrido de Campo): un «+» en el punto donde se vio */
  if(typeof npMarks==='function'){if(typeof ensureNP==='function')ensureNP(M.date);
    for(const m of npMarks(M.date,M.piso)){if((m.v||M.vista)!==M.vista||(fvv&&m.sc!==fvv))continue;svg+=`<circle cx="${m.x}" cy="${m.y}" r="5" fill="${m.c}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      labels.push({id:'np:'+m.id,x:m.x,y:m.y,t:'+',nb:1,np:1,cls:'npo',area:1,c:m.c,f:m.c,tip:'Visto en obra sin estar programado · '+m.tip})}}
  v.svg.innerHTML=svg;v.labels=labels;
  const lg=$('#mcleg');if(lg){const on=cu;let h='';if(on){const o=cumplSum();h=`<b>Cumplimiento ${fmtD(M.date)}</b>${['ok','partial','no','none'].map(k=>`<span><i style="background:${STC[k]}"></i>${STT[k]} <b>${o[k]}</b></span>`).join('')}<span class="mu">${o.ok+o.partial+o.no?Math.round(o.ok/(o.ok+o.partial+o.no)*100)+' % de lo verificado':'Aún sin registros de Campo'}</span>`}if(lg.dataset.h!==h){lg.innerHTML=h;lg.dataset.h=h}lg.hidden=!on}
  v.handles=!M.meet&&own(sel)&&M.tool==='pan'&&(sel.kind==='zona'||sel.kind==='flecha')?unflat(sel.pts):[];v.apply()}
function insets(){if(!M.meet)return{l:0,t:0,r:0,b:0};const c=$('#mcard');const cr=c&&!c.hidden?c.getBoundingClientRect():null;const hr=M.view.host.getBoundingClientRect();
  if(cr&&innerWidth>900)return{l:0,t:0,r:hr.right-cr.left+10,b:0};if(cr)return{l:0,t:0,r:0,b:hr.bottom-cr.top+10};return{l:0,t:0,r:0,b:0}}
function fitBox(b,maxZ){const v=M.view;if(!v)return;const r=v.host.getBoundingClientRect();const n=insets();const W=r.width-n.l-n.r,H=r.height-n.t-n.b;const z=Math.min(W/b.w,H/b.h,maxZ||8);v.z=z;v.x=n.l+W/2-(b.x+b.w/2)*z;v.y=n.t+H/2-(b.y+b.h/2)*z;v.apply()}
function zoomTo(P){if(!M.view||!P.length)return;const b=bboxOf(P);const pad=Math.max(b.w,b.h)*.6+200;fitBox({x:b.x-pad/2,y:b.y-pad/2,w:b.w+pad,h:b.h+pad},2.5)}
function fitAll(){const v=M.view;if(!v||!v.bounds)return;if(!M.meet){v.fit();return}const b=v.bounds;fitBox({x:b.x-b.w*.02,y:b.y-b.h*.02,w:b.w*1.04,h:b.h*1.04})}
/* =====================================================================
   ETAPA 3 · Modo reunión, cruces entre subcontratistas y exportar imagen
   ===================================================================== */
M.meet=false;M.meetSc='';M.colorBy='sc';
/* ---------- ETAPA 4 · cumplimiento de Campo sobre el plano ---------- */
const STC={ok:'#2E7D4F',partial:'#D08A00',no:'#C62828',none:'#8C959F'};
const STI={ok:'✓',partial:'½',no:'✗',none:'·'};const STT={ok:'Cumplido',partial:'Parcial',no:'No cumplido',none:'Sin verificar'};
function zRec(z){return z&&z.actId&&typeof recOf==='function'?recOf(M.date,z.actId):null}
const zSt=z=>{const r=zRec(z);return r?r.status:'none'};
function cumplSum(){const acts=dayActs(M.piso,M.date);const o={ok:0,partial:0,no:0,none:0,n:acts.length};acts.forEach(({x})=>{const r=typeof recOf==='function'?recOf(M.date,x.id):null;o[r?r.status:'none']++});return o}
function setRec(z,status,cnc){if(typeof writeDaily!=='function')return;const x=S.act.get(z.actId);if(!x)return;const cur=zRec(z);const r=typeof baseRec==='function'?baseRec(M.date,x,cur):{};
  /* corrección de algo ya registrado: queda el rastro (qué decía antes y quién lo había registrado) */
  if(cur&&cur.status&&!cur._prop&&(cur.status!==status||(cnc!=null&&(cur.cnc||'')!==cnc))){r.hist=[...(cur.hist||[]),{st:cur.status,cnc:cur.cnc||'',by:cur.by||'',n:cur.byName||cur.by||'',t:cur.ts||0}].slice(-10);r.corr={n:me.name||me.email,by:me.email,t:NOW(),via:M.meet?'reunión':'plan diario'}}
  else if(cur&&cur.hist){r.hist=cur.hist;if(cur.corr)r.corr=cur.corr}
  r.status=status;if(status==='ok'){r.cnc='';r.imp=null}else if(cnc!=null){r.cnc=cnc;r.imp=null}
  if(status==='ok'&&r.exec==null&&r.prog!=null)r.exec=r.prog;writeDaily(M.date,M.piso,{recs:{[x.id]:r}});requestRender();toast(`${STT[status]} registrado en Campo`)}
function campoProps(z){if(!z||z.kind!=='zona'||!z.actId)return'';const r=zRec(z);const st=r?r.status:'none';const future=M.date>todayIso();
  let h=`<span class="cst" style="--c:${STC[st]}">${STI[st]} ${STT[st]}${r&&r.cnc?' · '+esc(r.cnc):''}</span>${r&&r.note?`<span class="mu">“${esc(short(r.note,60))}”</span>`:''}${r?`<span class="mu">${esc(r.byName||r.by||'')}</span>`:''}`;
  if(typeof canDaily!=='undefined'&&canDaily&&!future)h+=`<span class="mseg">${['ok','partial','no'].map(k=>`<button data-rst="${k}" class="${st===k?'on':''}" title="Registrar: ${STT[k]}">${STI[k]} ${STT[k]}</button>`).join('')}</span>`;
  return h}
/* ---------- decisión sobre un cruce (reunión / plano diario) ---------- */
function crossPop(anchor,c){if(!(typeof canWrite!=='undefined'&&canWrite)){toast('Las decisiones sobre los cruces las toma el ingeniero.');return}
  const A=c.a,B=c.b;const ZL_=planNumbering(null).zl;const nm=z=>`${zNoH(z,ZL_)} <b>${esc(conOf(z.sc).name)}</b> ${esc(zoneLabel(z))}`;const xa=A.actId&&S.act.get(A.actId),xb=B.actId&&S.act.get(B.actId);
  const lose=(win,los)=>{const xl=los.actId&&S.act.get(los.actId);if(xl)novaDialog(anchor,xl,{motivo:'Interferencia con otra partida',prio:{actId:win.actId||'',sc:win.sc,zona:win.id},title:`Prioridad a ${conOf(win.sc).name}`,lead:`${esc(conOf(los.sc).name)} no va hoy en esa zona.`});
    else{const o=remDoc(los.id);if(o){rec([o]);requestRender();toast(`Prioridad a ${conOf(win.sc).name}: se quitó el trabajo no programado de ${conOf(los.sc).name}`,'Deshacer',undo)}}};
  openPop(anchor,`<div class="ph">Cruce</div><div class="ptx">${nm(A)}<br>↔ ${nm(B)}</div>
    <button data-do="ok">✓ Sin interferencia: pueden trabajar a la vez</button>
    <button data-do="pa">Prioridad a ${esc(zNo(A,ZL_)+conOf(A.sc).name)} · ${esc(zNo(B,ZL_)+conOf(B.sc).name)} no va hoy…</button>
    <button data-do="pb">Prioridad a ${esc(zNo(B,ZL_)+conOf(B.sc).name)} · ${esc(zNo(A,ZL_)+conOf(A.sc).name)} no va hoy…</button>`,
   {ok:()=>{/* se guarda como decisión del día para el par (sirve también para las zonas que salen del ambiente) */
      const pair=[zKey(A),zKey(B)].sort();const id=uid('pz');rec([addDoc(id,{date:M.date,pisoId:M.piso,sc:A.sc,kind:'xok',pair,n:me.name||me.email,by:me.email,byName:me.name||me.email,ts:NOW()})]);
      CROSS.key='';requestRender();toast('Cruce marcado sin interferencia: pueden trabajar a la vez','Deshacer',undo)},
    pa:()=>setTimeout(()=>lose(A,B),0),pb:()=>setTimeout(()=>lose(B,A),0)})}
function crossAt(w){for(const c of CROSS.list){const r=c.r;if(r&&w.x>=r.x&&w.x<=r.x+r.w&&w.y>=r.y&&w.y<=r.y+r.h)return c}return null}
/* ---------- acciones rápidas sobre una actividad del día (lista de la reunión) ---------- */
function actQuick(anchor,aid){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);const prev=ZN.get(aid);const t0=todayIso();
  const cp=canPlan(x.sc),cd=typeof canDaily!=='undefined'&&canDaily&&M.date<=t0;const cr=typeof rCanAdd==='function'&&(typeof canWrite!=='undefined'&&canWrite||(typeof SCK==='function'&&SCK()&&myScs().includes(x.sc)));
  const later=(x.days||[]).filter(y=>y>M.date).length;const h={};let html=`<div class="ph">${esc(x.name||'(sin nombre)')}</div><div class="ptx">${esc(conOf(x.sc).name)} · ${esc(a?a.code+' · '+a.name:'')} · sin ubicar en el plano</div>`;
  if(cp&&prev){html+=`<button data-do="prev">📍 Ubicar donde trabajó la última vez</button>`;h.prev=()=>{M.scDraw=x.sc;newZone(unflat(prev.pts),{actId:aid},prev.vista);toast('Ubicada como la última vez. Ajústala si cambia.')}}
  if(cp&&!PHONE()){html+=`<button data-do="draw">✏️ Dibujar su zona en el plano</button>`;h.draw=()=>{M.scDraw=x.sc;M.pend={actId:aid};if(typeof rskWarn==='function')rskWarn(aid);M.tool='zona';M.selId=null;requestRender();toast('Dibuja la zona en el plano: toca las esquinas y cierra en la primera.')}}
  if(cd){html+=`<button data-do="done">✓ Ya está terminada${later?` <kbd>libera ${later} día${later>1?'s':''}</kbd>`:''}</button>`;h.done=()=>{if(typeof markDone==='function'){markDone(aid,M.date);requestRender()}}}
  if(cp||cd){html+=`<button data-do="nova">⏸ No se hará hoy…</button>`;h.nova=()=>setTimeout(()=>novaDialog(anchor,x),0)}
  if(cr){html+=`<button data-do="rst">⚠ Tiene una restricción…</button>`;h.rst=()=>setTimeout(()=>restrQuick(anchor,x),0)}
  if(!Object.keys(h).length)html+=`<div class="ptx">No tienes permiso para cambiarla.</div>`;
  openPop(anchor,html,h)}
/* registrar una restricción sin salir de la reunión (y, si se quiere, dejar la actividad fuera del día) */
function restrQuick(anchor,x){const types=P().restrTypes||[];const need=M.date;
  openPop(anchor,`<div class="ph">Restricción · ${esc(short(x.name||'',30))}</div>
    <div class="qrow"><select id="rqt" aria-label="Tipo">${types.map(t=>`<option>${esc(t)}</option>`).join('')||'<option>Restricción</option>'}</select></div>
    <div class="qrow"><input id="rqd" placeholder="¿Qué falta liberar?" style="width:240px;text-align:left" aria-label="Descripción"></div>
    <div class="qrow"><label class="mu">Se necesita para <input type="date" id="rqn" value="${need}"></label></div>
    <label class="chk" style="padding:2px 10px 6px"><input type="checkbox" id="rqno" checked> Además: no se hará hoy</label>
    <button data-do="ok" class="pri">Registrar</button><button data-do="no">Cancelar</button>`,
   {no:()=>{},ok:()=>{const desc=($('#rqd')||{}).value||'';if(!desc.trim()){toast('Describe qué falta liberar.');return}const id=uid('res');const nov=!!($('#rqno')||{}).checked;
     apply([op('restr',id,{id,actId:x.id,pisoId:pisoOfAct(x.id),type:($('#rqt')||{}).value||'',desc:desc.trim(),resp:conOf(x.sc).name,need:($('#rqn')||{}).value||'',freed:'',status:'pend',created:todayIso(),sc:x.sc,by:me.email,byName:me.name||''})],'Restricción registrada');
     if(nov)setTimeout(()=>novaDialog(anchor,x,{motivo:'Restricción',title:'Restricción · no se hará hoy'}),0)}});
  setTimeout(()=>{const i=$('#rqd');if(i)i.focus()},30)}
/* ---------- ventana de detalle de cumplimiento (modo Cumplimiento y modo reunión) ---------- */
let ZC=null;
function zcClose(){const el=document.getElementById('mzc');if(el)el.remove();ZC=null}
function zCard(aid,cx,cy){ZC={aid,cx:cx??(ZC&&ZC.cx),cy:cy??(ZC&&ZC.cy)};zcRender()}
function zcRender(){if(!ZC)return;const x=S.act.get(ZC.aid);if(!x){zcClose();return}const a=S.amb.get(x.ambId);const r=typeof recOf==='function'?recOf(M.date,x.id):null;const st=r?r.status:'none';
  const future=M.date>todayIso();const can=typeof canDaily!=='undefined'&&canDaily&&!future;const N=nbMap();const lv=typeof liveOf==='function'?liveOf(M.date,x.id):null;
  const phs=[...new Set([...(r&&r.photos||[]),...(lv&&lv.photos||[])])];phs.forEach(id=>typeof loadFoto==='function'&&loadFoto(id));
  let h=`<div class="zch"><div class="zct">${nbHtml(N,x.id)}<div><b>${esc(x.name||'(sin nombre)')}</b><span><i class="zcsc" style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)} · ${esc(a?a.code+' · '+a.name:'')}</span></div></div><button class="kx" data-zcx aria-label="Cerrar">&times;</button></div>
    <div class="zcst" style="--c:${STC[st]}"><b>${STI[st]} ${STT[st]}</b>${r&&r.cnc?`<span>Causa: ${esc(r.cnc)}</span>`:''}${r&&r._prop?'<span>Cierre del capataz · por confirmar</span>':''}</div>
    ${r&&r.note?`<p class="zcn">“${esc(r.note)}”</p>`:''}
    ${r?`<p class="zcm">${r._prop?'Lo reportó':'Lo registró'} ${esc(r.byName||r.by||'—')}${r.ts?' · '+fmtD(ldt(r.ts))+' '+hhmm(r.ts):''}${r.corr?` · <b>corregido en ${esc(r.corr.via)}</b>`:''}</p>`:'<p class="zcm">Nadie registró el cumplimiento de este día.</p>'}
    ${r&&(r.hist||[]).length?`<ul class="zchi">${r.hist.slice().reverse().map(o=>`<li>Antes: ${STI[o.st]||''} ${esc(STT[o.st]||o.st)}${o.cnc?' · '+esc(o.cnc):''} · ${esc(o.n||'')}${o.t?' · '+fmtD(ldt(o.t))+' '+hhmm(o.t):''}</li>`).join('')}</ul>`:''}
    ${lv&&lv.mot?`<p class="zcm">Detención reportada: ${esc(lv.mot)}</p>`:''}
    ${phs.length?`<div class="zcph">${phs.map(id=>`<img data-ph="${id}" src="${FOTO.get(id)||''}" alt="Foto del registro"${FOTO.get(id)?'':' style="opacity:.3"'}>`).join('')}</div>`:''}
    ${can?`<div class="zcb">${r&&r._prop?'<button class="ib pri" data-zcs="conf">✓ Confirmar lo reportado</button>':''}${['ok','partial','no'].map(k=>`<button class="ib zcb-${k}${st===k&&!(r&&r._prop)?' on':''}" data-zcs="${k}">${STI[k]} ${STT[k]}</button>`).join('')}</div>${r&&r.status&&!r._prop?'<p class="zcm">Si lo cambias, queda registrado quién lo corrigió y qué decía antes.</p>':''}`:future?'<p class="zcm">Día futuro: aún no se registra el cumplimiento.</p>':''}`;
  let el=document.getElementById('mzc');if(!el){el=document.createElement('div');el.id='mzc';el.className='mzc';el.setAttribute('role','dialog');document.body.appendChild(el);el.onclick=zcClick}
  if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}
  const W=el.offsetWidth,H=el.offsetHeight;if(innerWidth<=760){el.style.left='';el.style.top='';return}
  let lx=(ZC.cx||innerWidth/2)+14,ly=(ZC.cy||innerHeight/2)-20;if(lx+W>innerWidth-10)lx=Math.max(10,(ZC.cx||0)-W-14);if(ly+H>innerHeight-10)ly=Math.max(10,innerHeight-H-10);el.style.left=lx+'px';el.style.top=Math.max(10,ly)+'px'}
function zcClick(e){const t=e.target;if(t.closest('[data-zcx]')){zcClose();return}
  const im=t.closest('img[data-ph]');if(im&&im.src&&im.src.startsWith('data:')&&typeof lightbox==='function'){lightbox(im.src);return}
  const b=t.closest('[data-zcs]');if(!b||!ZC)return;const k=b.dataset.zcs;const x=S.act.get(ZC.aid);if(!x)return;const z={actId:x.id};
  if(k==='conf'){if(typeof confirmProp==='function'){confirmProp(M.date,x.id);toast('Confirmado');setTimeout(zcRender,60)}return}
  if(k==='ok'){setRec(z,'ok');setTimeout(zcRender,60);return}
  const h={};const cnc=P().cnc||[];openPop(b,`<div class="ph">${STT[k]} · ¿causa?</div>${cnc.map((c,i)=>{h['c'+i]=()=>{setRec(z,k,c);setTimeout(zcRender,60)};return`<button data-do="c${i}" title="${esc(cncTip(c))}">${esc(cncLabel(c))}</button>`}).join('')}<hr><button data-do="sin">Registrar sin causa</button>`,{...h,sin:()=>{setRec(z,k,'');setTimeout(zcRender,60)}})}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ZC){e.stopImmediatePropagation();zcClose()}});
function pip(p,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){if(((P[i].y>p.y)!==(P[j].y>p.y))&&(p.x<(P[j].x-P[i].x)*(p.y-P[i].y)/(P[j].y-P[i].y)+P[i].x))c=!c}return c}
function overlapFrac(A,B){const a=bboxOf(A),b=bboxOf(B);const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h);if(x1<=x0||y1<=y0)return 0;
  const n=14;let both=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const p={x:x0+(i+.5)*(x1-x0)/n,y:y0+(j+.5)*(y1-y0)/n};if(pip(p,A)&&pip(p,B))both++}
  const inter=both/(n*n)*(x1-x0)*(y1-y0);const area=P=>{let s=0;for(let i=0,j=P.length-1;i<P.length;j=i++)s+=(P[j].x+P[i].x)*(P[j].y-P[i].y);return Math.abs(s/2)};return inter/Math.max(1,Math.min(area(A),area(B)))}
const CROSS={key:'',list:[],ids:new Set(),seq:[],seqIds:new Set()};
/* decisión de la reunión: el par de zonas puede trabajar a la vez (se guarda en la zona: xok:{otraZona:{n,by,t}}) */
/* N.º con que la zona aparece en el plano (número de la actividad o letra si no es programada) */
const zNo=(z,zl)=>{const n=zl&&zl.get(z.id);return n?`N.º ${n} · `:''};
const zNoH=(z,zl)=>{const n=zl&&zl.get(z.id);if(!n)return'';const c=conOf(z.sc).color;return`<i class="nbi${lum(c)>.55?' lt':''}" style="--c:${c}">${esc(n)}</i>`};
const zKey=z=>z.actId?'a:'+z.actId:'z:'+z.id;
const xokDocs=()=>[...PD.values()].filter(z=>z.kind==='xok'&&z.pisoId===M.piso&&z.date===M.date);
const xDecided=(a,b)=>{if((a.xok&&a.xok[b.id])||(b.xok&&b.xok[a.id]))return true;const p=[zKey(a),zKey(b)].sort().join('|');return xokDocs().some(d=>(d.pair||[]).join('|')===p)};
function interRect(A,B){const a=bboxOf(A),b=bboxOf(B);const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h);return x1>x0&&y1>y0?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null}
function computeCross(){const zs=shapesV(M.piso).filter(z=>z.kind==='zona');const key=M.piso+M.vista+M.date+zs.map(z=>z.id+(z.pts||[]).join(',')+z.sc+(z.actId||'')+(z.xok?Object.keys(z.xok).join(','):'')).join('|')+'#'+xokDocs().map(d=>d.id).join(',');if(key===CROSS.key)return;CROSS.key=key;CROSS.list=[];CROSS.ids=new Set();CROSS.seq=[];CROSS.seqIds=new Set();
  for(let i=0;i<zs.length;i++)for(let j=i+1;j<zs.length;j++){const a=zs[i],b=zs[j];const A=unflat(a.pts),B=unflat(b.pts);const f=overlapFrac(A,B);if(f<=0.15)continue;const r=interRect(A,B);
    if(a.sc!==b.sc){if(xDecided(a,b))continue;CROSS.list.push({a,b,f,r});CROSS.ids.add(a.id);CROSS.ids.add(b.id)}
    else if(a.actId&&b.actId&&a.actId!==b.actId){CROSS.seq.push({a,b,f,r});CROSS.seqIds.add(a.id);CROSS.seqIds.add(b.id)}}}
function meetScs(){return scsOfDay()}
function zoneBoxes(sc){return shapesV(M.piso).filter(z=>z.kind!=='nova'&&(!sc||z.sc===sc)).flatMap(z=>unflat(z.pts))}
function meetGo(sc){M.meetSc=sc;requestRender();requestAnimationFrame(()=>{const P=zoneBoxes(sc);if(sc&&P.length)zoomTo(P);else fitAll()})}
function actRows(sc){const acts=dayActs(M.piso,M.date).filter(o=>o.x.sc===sc);const sh=shapesOf(M.piso);
  return acts.map(({x,a})=>{const zs=sh.filter(z=>z.kind==='zona'&&z.actId===x.id);const nv=sh.find(z=>z.kind==='nova'&&z.actId===x.id);return{x,a,zs,nv}})}
function renderMeet(){const bar=$('#mmbar'),card=$('#mcard');if(!bar)return;document.body.classList.toggle('pl-meet',!!M.meet);$('.mapa')?.classList.toggle('meeting',!!M.meet);
  if(!M.meet){bar.hidden=true;card.hidden=true;const st=$('#mstage');if(st)st.style.top='';return}
  const scs=meetScs();if(M.meetSc&&!scs.includes(M.meetSc))M.meetSc='';const i=scs.indexOf(M.meetSc);
  const bh=`<button class="ib" id="mmx" title="Salir del modo reunión (Esc)">✕ Salir</button>${basesOf(M.piso).length>1?`<select id="mmvis" aria-label="Plano base">${basesOf(M.piso).map(b=>`<option value="${b.id}"${b.id===M.vista?' selected':''}>${esc(lname(b))}</option>`).join('')}</select>`:''}<span class="mmd"><select id="mmpiso" aria-label="Piso">${pisos().map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select><span class="mmday"><button class="ib" data-mdd="-1" title="Día anterior" aria-label="Día anterior">&#8249;</button><b>${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)}</b><button class="ib" data-mdd="1" title="Día siguiente" aria-label="Día siguiente">&#8250;</button>${M.date!==todayIso()?'<button class="ib" data-mdd="0">Hoy</button>':''}</span></span>
    <span class="mmnav"><button class="ib" data-mm="-1" title="Anterior (←)">‹</button><button class="mmall${M.meetSc?'':' on'}" data-msc="">Todos</button>${scs.map(c=>`<button class="mmsc${c===M.meetSc?' on':''}" data-msc="${c}" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}<button class="ib" data-mm="1" title="Siguiente (→)">›</button></span>
    ${CROSS.list.length?`<span class="mmcx">⚠ ${CROSS.list.length} cruce${CROSS.list.length>1?'s':''}</span>`:''}<button class="ib mexp" title="Descargar como imagen lo que se está mostrando">Imagen</button><button class="ib" id="mmfs" title="Pantalla completa">⤢</button>${M.tool!=='pan'?`<span class="mmdraw">✏️ Dibuja la zona${M.pend&&M.pend.actId&&S.act.get(M.pend.actId)?' de «'+esc(short(S.act.get(M.pend.actId).name,28))+'»':''} <button class="ib" id="mcancel">Cancelar</button></span>`:''}`;
  if(bar.dataset.h!==bh){bar.innerHTML=bh;bar.dataset.h=bh}bar.hidden=false;
  let ch='';const NBM=nbMap();
  if(M.meetSc){const sc=M.meetSc;const R=actRows(sc);const ok=R.filter(r=>r.zs.length).length,no=R.filter(r=>r.nv).length;const np=shapesOf(M.piso).filter(z=>z.kind==='zona'&&!z.actId&&z.sc===sc);
    const cx=CROSS.list.filter(c=>c.a.sc===sc||c.b.sc===sc);
    ch=`<div class="mch" style="--c:${conOf(sc).color}"><i></i><div><b>${esc(conOf(sc).name)}</b><span>${i+1} de ${scs.length} · ${ok} de ${R.length} ubicadas${no?` · ${no} no se hará hoy`:''}</span></div></div>
      <ol class="mcl">${R.map(r=>`<li class="${r.nv?'nv':r.zs.length?'ok':'pe'}" data-mact="${r.x.id}" tabindex="0">${nbHtml(NBM,r.x.id)}<span class="mono">${esc(r.a.code)}</span><div><b>${esc(r.x.name)}${(()=>{const rc=typeof recOf==='function'?recOf(M.date,r.x.id):null;return rc?` <span class="cst sm" style="--c:${STC[rc.status]}">${STI[rc.status]} ${STT[rc.status]}${rc.cnc?' · '+esc(rc.cnc):''}</span>`:''})()}</b><small>${esc(r.a.name)}${hasQ(r.x)?` · ${fq((r.x.qty||{})[M.date])} ${esc(r.x.und||'')}`:''}</small>${r.nv?`<em>No se hará hoy · ${esc(r.nv.motivo||'')}</em>`:r.zs.length?'':'<em class="pe">Sin ubicar en el plano · toca para ver opciones</em>'}</div></li>`).join('')||'<li class="pe"><div>Sin actividades programadas en este piso.</div></li>'}</ol>
      ${np.length?`<div class="mcs">No programado</div><ol class="mcl">${np.map(z=>`<li class="np"><span class="mono">NP</span><div><b>${esc(z.desc||'')}</b></div></li>`).join('')}</ol>`:''}
      ${cx.length?`<div class="mcs warn">⚠ Cruces</div>${cx.map(c=>{const o=c.a.sc===sc?c.b:c.a;const me_=c.a.sc===sc?c.a:c.b;const ZL_=NBZ();return`<button class="mcx" data-cx="${me_.id}|${o.id}">${zNoH(me_,ZL_)} ${esc(zoneLabel(me_))} ↔ ${zNoH(o,ZL_)} <b>${esc(conOf(o.sc).name)}</b>: ${esc(zoneLabel(o))}</button>`}).join('')}`:''}`}
  else{const rows=scs.map(c=>{const R=actRows(c);return{c,n:R.length,ok:R.filter(r=>r.zs.length).length,no:R.filter(r=>r.nv).length}});const tot=rows.reduce((a,r)=>({n:a.n+r.n,ok:a.ok+r.ok,no:a.no+r.no}),{n:0,ok:0,no:0});
    ch=`<div class="mch all"><div><b>Plan del día</b><span>${scs.length} subcontratistas · ${tot.ok} de ${tot.n} actividades ubicadas${tot.no?` · ${tot.no} no van`:''}</span></div></div>
      <div class="mleg">${rows.map(r=>`<button data-msc="${r.c}" style="--c:${conOf(r.c).color}"><i></i><span>${esc(conOf(r.c).name)}</span><b>${r.ok}/${r.n}</b>${r.no?`<em>${r.no} no va</em>`:''}</button>`).join('')}</div>
      ${CROSS.list.length?`<div class="mcs warn">⚠ Cruces (${CROSS.list.length})</div>${(ZL_=>CROSS.list.map(c=>`<button class="mcx" data-cx="${c.a.id}|${c.b.id}">${zNoH(c.a,ZL_)} <b>${esc(conOf(c.a.sc).name)}</b> ${esc(zoneLabel(c.a))} ↔ ${zNoH(c.b,ZL_)} <b>${esc(conOf(c.b.sc).name)}</b> ${esc(zoneLabel(c.b))}</button>`).join(''))(NBZ())}`:'<div class="note" style="padding:6px 2px">Sin cruces entre subcontratistas.</div>'}
      <div class="note" style="padding:6px 2px">Usa ‹ › o las flechas del teclado para pasar de un subcontratista a otro.</div>`}
  if(card.dataset.h!==ch){card.innerHTML=ch;card.dataset.h=ch}card.hidden=false;
  const bhh=bar.offsetHeight;const st=$('#mstage');if(st)st.style.top=bhh+'px';if(innerWidth>900)card.style.top=(bhh+10)+'px';else card.style.top=''}
function meetClick(e){const t=e.target;let b;
  if(t.closest('#mmeetb')){M.meet=true;M.meetSc='';M.selId=null;M.tmp=null;M.pend=null;M.tool='pan';requestRender();setTimeout(fitAll,80);return true}
  if(legClick(e))return true;
  if(t.closest('#mpdf')){pdfDialog(t.closest('#mpdf'));return true}
  if(!M.meet){if(t.closest('#mexp')){exportPNG('');return true}return false}
  if(t.closest('#mmx')){M.meet=false;M.meetSc='';try{if(document.fullscreenElement)document.exitFullscreen()}catch(err){}requestRender();return true}
  if(t.closest('#mmfs')){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Tu navegador no permite pantalla completa aquí.'))}catch(err){toast('Tu navegador no permite pantalla completa aquí.')}return true}
  if((b=t.closest('[data-msc]'))){meetGo(b.dataset.msc);return true}
  if((b=t.closest('[data-mm]'))){meetStep(+b.dataset.mm);return true}
  if((b=t.closest('[data-mact]'))){const rc=b.getBoundingClientRect();if(b.classList.contains('pe')){zcClose();actQuick(b,b.dataset.mact)}else zCard(b.dataset.mact,rc.right,rc.top);return true}
  if((b=t.closest('[data-cx]'))){const ids=b.dataset.cx.split('|');const P=ids.flatMap(id=>{const z=PD.get(id);return z?unflat(z.pts):[]});zoomTo(P);const c=CROSS.list.find(q=>(q.a.id===ids[0]&&q.b.id===ids[1])||(q.a.id===ids[1]&&q.b.id===ids[0]));if(c&&typeof canWrite!=='undefined'&&canWrite)setTimeout(()=>crossPop(b,c),250);return true}
  if(t.closest('#mexp,.mexp')){exportPNG(M.meetSc);return true}
  return false}
function meetStep(d){const scs=meetScs();const all=['',...scs];let i=all.indexOf(M.meetSc);i=(i+d+all.length)%all.length;meetGo(all[i])}
document.addEventListener('keydown',e=>{if(U.tab!=='mapa'||!M.meet||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();meetStep(1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();meetStep(-1)}else if(e.key==='Escape'&&M.tool!=='pan'){M.pend=null;M.tmp=null;M.tool='pan';requestRender()}else if(e.key==='Escape'&&!document.fullscreenElement){M.meet=false;M.meetSc='';requestRender()}});
/* ---------- exportar el plan del día como imagen PNG ---------- */
function loadImgEl(src){return new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('No se pudo leer la lámina'));i.src=src})}
/* ---------- exportar el plan del día: imagen y PDF ---------- */
const nat=(a,b)=>String(a).localeCompare(String(b),'es',{numeric:true});
const PT=v=>String(v==null?'':v).normalize('NFC').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g,'');
function planNumbering(vistaId,pid){ // un número por actividad ubicada (ordenado por SC, ambiente y actividad); las zonas sin actividad llevan letra
  const zs=shapesOf(pid||M.piso).filter(z=>z.kind==='zona'&&(!vistaId||zVista(z)===vistaId));const by=new Map();const np=[];
  for(const z of zs){if(z.actId&&S.act.get(z.actId)){if(!by.has(z.actId))by.set(z.actId,[]);by.get(z.actId).push(z)}else np.push(z)}
  const items=[...by.entries()].map(([id,L])=>{const x=S.act.get(id);const a=S.amb.get(x.ambId);return{id,x,a,sc:x.sc,zones:L}})
    .sort((p,q)=>nat(conOf(p.sc).name,conOf(q.sc).name)||nat(p.a?p.a.code:'',q.a?q.a.code:'')||nat(p.x.name,q.x.name));
  items.forEach((it,i)=>{it.n=i+1});
  const AZ='ABCDEFGHIJKLMNOPQRSTUVWXYZ';const npl=np.sort((p,q)=>nat(conOf(p.sc).name,conOf(q.sc).name)).map((z,i)=>({z,l:i<26?AZ[i]:'N'+(i+1)}));
  const zl=new Map();items.forEach(it=>it.zones.forEach(z=>zl.set(z.id,String(it.n))));npl.forEach(o=>zl.set(o.z.id,o.l));
  return{items,np:npl,zl}}
function crossPairs(zs){const list=[],seq=[];const Z=zs.filter(z=>z.kind==='zona');
  for(let i=0;i<Z.length;i++)for(let j=i+1;j<Z.length;j++){const a=Z[i],b=Z[j];const A=unflat(a.pts),B=unflat(b.pts);if(overlapFrac(A,B)<=.15)continue;const r=interRect(A,B);
    if(a.sc!==b.sc){if(!xDecided(a,b))list.push({a,b,r})}else if(a.actId&&b.actId&&a.actId!==b.actId)seq.push({a,b,r})}
  return{list,seq}}
/* dibuja el plano base tenue + zonas + números; devuelve el canvas */
function cropBox(B0,zs){const P=zs.flatMap(z=>unflat(z.pts));if(!P.length)return B0;const bb=bboxOf(P);const pad=Math.max(Math.max(bb.w,bb.h)*.14,Math.max(B0.w,B0.h)*.04);
  let w=Math.max(bb.w+2*pad,B0.w*.45),hh=Math.max(bb.h+2*pad,B0.h*.45);if(w/hh<1.35)w=hh*1.35;if(w/hh>2.3)hh=w/2.3;w=Math.min(w,B0.w);hh=Math.min(hh,B0.h);
  const cx=bb.x+bb.w/2,cy=bb.y+bb.h/2;const x=Math.min(Math.max(cx-w/2,B0.x),B0.x+B0.w-w),y=Math.min(Math.max(cy-hh/2,B0.y),B0.y+B0.h-hh);return{x,y,w,h:hh}}
async function renderPlanCanvas(base,o){
  const im=o.im||await loadImgEl(await imgURL(base,'f'));const T=base.T||I;const B=o.crop===false?boundsOf({...base,T}):cropBox(boundsOf({...base,T}),shapesOf(o.pid||M.piso).filter(z=>z.kind==='zona'&&zVista(z)===base.id&&(!o.scOnly||z.sc===o.scOnly)));
  const W=o.W||3200,sc=W/B.w,HH=Math.round(B.h*sc);const cv=document.createElement('canvas');cv.width=W;cv.height=HH;const g=cv.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,HH);
  g.save();g.scale(sc,sc);g.translate(-B.x,-B.y);g.save();g.transform(T.a,T.b,-T.b,T.a,T.e,T.f);g.globalAlpha=.4;g.drawImage(im,0,0,base.w,base.h);g.restore();
  const all=shapesOf(o.pid||M.piso).filter(z=>z.kind!=='nova'&&zVista(z)===base.id);const cuE=!!o.cuE;
  const colOf=z=>{const st=cuE&&z.kind==='zona'&&z.actId?zSt(z):null;return st?STC[st]:conOf(z.sc).color};
  const dimOf=z=>!!(o.scOnly&&z.sc!==o.scOnly);
  for(const z of all){const c=colOf(z);const P=unflat(z.pts);if(!P.length)continue;g.globalAlpha=dimOf(z)?.1:1;
    if(z.kind==='zona'){g.beginPath();P.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=c+'47';g.fill();g.lineWidth=4.5/sc;g.strokeStyle=c;g.setLineDash(z.fuera?[12/sc,8/sc]:[]);g.stroke();g.setLineDash([])}
    else if(z.kind==='trazo'||z.kind==='flecha'){g.beginPath();P.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.lineWidth=LW[z.w||2]*1.6/sc;g.strokeStyle=c;g.lineCap='round';g.lineJoin='round';g.stroke();
      if(z.kind==='flecha'){const a=Math.atan2(P[1].y-P[0].y,P[1].x-P[0].x),L=(16+LW[z.w||2]*3.5)/sc;g.beginPath();g.moveTo(P[1].x,P[1].y);g.lineTo(P[1].x-L*Math.cos(a-.45),P[1].y-L*Math.sin(a-.45));g.lineTo(P[1].x-L*Math.cos(a+.45),P[1].y-L*Math.sin(a+.45));g.closePath();g.fillStyle=c;g.fill()}}}
  g.globalAlpha=1;
  for(const c of (o.pairs?o.pairs.list:[])){if(!c.r||(o.scOnly&&c.a.sc!==o.scOnly&&c.b.sc!==o.scOnly))continue;
    g.save();g.beginPath();g.rect(c.r.x,c.r.y,c.r.w,c.r.h);g.clip();g.fillStyle='#d32f2f33';g.fillRect(c.r.x,c.r.y,c.r.w,c.r.h);g.strokeStyle='#d32f2f';g.lineWidth=3/sc;
    const st=16/sc;for(let k=-c.r.h;k<c.r.w+c.r.h;k+=st){g.beginPath();g.moveTo(c.r.x+k,c.r.y+c.r.h);g.lineTo(c.r.x+k+c.r.h,c.r.y);g.stroke()}g.restore();
    g.lineWidth=4/sc;g.strokeStyle='#d32f2f';g.setLineDash([8/sc,6/sc]);g.strokeRect(c.r.x,c.r.y,c.r.w,c.r.h);g.setLineDash([])}
  g.restore();
  /* números (con desplazamiento para que no se solapen) */
  const R=o.R||30,placed=[];const px=p=>({x:(p.x-B.x)*sc,y:(p.y-B.y)*sc});
  const RSK=typeof pendRestr==='function'?pendRestr():new Map();const crossIds=new Set((o.pairs?o.pairs.list:[]).flatMap(c=>[c.a.id,c.b.id]));
  const free=(x,y)=>placed.every(q=>Math.hypot(q.x-x,q.y-y)>=R*2.15);
  const zonas=all.filter(z=>z.kind==='zona'&&!dimOf(z)&&o.nums.zl.has(z.id)).map(z=>({z,P:unflat(z.pts)})).filter(o2=>o2.P.length).sort((p,q)=>{const a=bboxOf(p.P),b=bboxOf(q.P);return b.w*b.h-a.w*a.h});
  for(const{z,P}of zonas){const C=px(centroid(P));let pos={x:C.x,y:C.y};
    if(!free(pos.x,pos.y)){let ok=false;for(let k=1;k<=10&&!ok;k++)for(let d=0;d<12;d++){const ang=d/12*2*Math.PI;const x=C.x+Math.cos(ang)*k*R*1.5,y=C.y+Math.sin(ang)*k*R*1.5;if(x>R&&y>R&&x<W-R&&y<HH-R&&free(x,y)){pos={x,y};ok=true;break}}}
    placed.push(pos);const c=colOf(z);const lab=o.nums.zl.get(z.id);
    if(Math.hypot(pos.x-C.x,pos.y-C.y)>R*1.3){g.strokeStyle=c;g.lineWidth=3;g.beginPath();g.moveTo(C.x,C.y);g.lineTo(pos.x,pos.y);g.stroke();g.fillStyle=c;g.beginPath();g.arc(C.x,C.y,6,0,7);g.fill()}
    const isNP=!z.actId;const ring=crossIds.has(z.id)?'#d32f2f':(z.actId&&RSK.get(z.actId)?'#ef6c00':'#ffffff');
    g.beginPath();g.arc(pos.x,pos.y,R+7,0,7);g.fillStyle=ring;g.fill();g.lineWidth=2;g.strokeStyle='#222';g.stroke();
    g.beginPath();g.arc(pos.x,pos.y,R,0,7);g.fillStyle=isNP?'#fff':c;g.fill();if(isNP){g.lineWidth=4;g.strokeStyle=c;g.setLineDash([8,6]);g.stroke();g.setLineDash([])}
    const fs=Math.round(R*(lab.length>3?.6:lab.length>2?.78:lab.length>1?.98:1.15));g.font=`700 ${fs}px Arial, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=isNP?c:(lum(c)>.55?'#111':'#fff');g.fillText(lab,pos.x,pos.y+1);g.textAlign='left';g.textBaseline='alphabetic'}
  for(const z of all){if(z.kind!=='texto'||dimOf(z))continue;const P=unflat(z.pts);const p=px(P[0]);const fs=Math.round((z.fs||18)*1.6*(W/3600));g.font=`700 ${fs}px Arial, sans-serif`;g.lineWidth=7;g.strokeStyle='#fff';g.strokeText(z.t||'',p.x,p.y+fs/3);g.fillStyle=colOf(z);g.fillText(z.t||'',p.x,p.y+fs/3)}
  return cv}
const itemMarks=it=>{const m=[];if(typeof restrPend==='function'&&restrPend(it.id).length)m.push('restricción');return m};
async function exportPNG(scOnly){const base=baseOf(M.piso);if(!base){toast('Este piso no tiene plano base.');return}toast('Generando imagen…');
  try{const nums=planNumbering(base.id);const zsV=shapesOf(M.piso).filter(z=>z.kind!=='nova'&&zVista(z)===base.id);const pairs=crossPairs(zsV);const cuE=M.colorBy==='cu';
    const W=3600,cvP=await renderPlanCanvas(base,{scOnly,W,R:34,nums,pairs,cuE});
    const items=nums.items.filter(it=>!scOnly||it.sc===scOnly);const npl=nums.np.filter(o=>!scOnly||o.z.sc===scOnly);
    const top=130,colW=1100,cols=Math.max(1,Math.floor((W-80)/colW)),n=items.length+npl.length,rows=Math.ceil(n/cols),rowH=46;
    const scs=scOnly?[scOnly]:meetScs();const legH=(n?rows*rowH+40:0)+90+(pairs.list.length&&!scOnly?50:0);
    const cv=document.createElement('canvas');cv.width=W;cv.height=top+cvP.height+legH;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(cvP,0,top);
    g.fillStyle='#1b211e';g.font='700 46px Arial, sans-serif';g.fillText(`${cuE?'Cumplimiento':'Plan del día'} · ${S.pis.get(M.piso)?.name||''}${basesOf(M.piso).length>1?' · '+lname(base):''} · ${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)} ${M.date.slice(0,4)}${scOnly?' · '+conOf(scOnly).name:''}`,40,68);
    g.font='400 26px Arial, sans-serif';g.fillStyle='#5b645e';g.fillText((P().fullName||P().name||'').slice(0,150),40,106);
    let y=top+cvP.height+56;g.font='600 28px Arial, sans-serif';
    let lx=40;for(const c of scs){const R=actRows(c);const tx=`${conOf(c).name}  ${R.filter(r=>r.zs.length).length}/${R.length}`;const w=g.measureText(tx).width+64;if(lx+w>W-40){lx=40;y+=44}g.fillStyle=conOf(c).color;g.fillRect(lx,y-24,28,28);g.fillStyle='#1b211e';g.fillText(tx,lx+40,y);lx+=w}
    y+=36;
    const RSK=typeof pendRestr==='function'?pendRestr():new Map();
    const row=(i,col,lab,txt,c,marks)=>{const x=40+col*colW,yy=y+i*rowH;g.fillStyle=c;g.beginPath();g.arc(x+20,yy-8,19,0,7);g.fill();g.fillStyle=lum(c)>.55?'#111':'#fff';g.font=`700 ${lab.length>2?15:lab.length>1?19:22}px Arial, sans-serif`;g.textAlign='center';g.fillText(lab,x+20,yy-1);g.textAlign='left';
      g.font='500 26px Arial, sans-serif';g.fillStyle='#1b211e';let s=txt;const mw=colW-110;while(g.measureText(s).width>mw&&s.length>8)s=s.slice(0,-2);if(s!==txt)s=s.trim()+'…';g.fillText(s,x+52,yy);
      if(marks){const w=g.measureText(s).width;g.fillStyle='#e65100';g.font='600 22px Arial, sans-serif';g.fillText(marks,x+52+w+10,yy)}};
    const all=[...items.map(it=>({lab:String(it.n),txt:`${it.x.name} — ${it.a?it.a.code:''}`,c:conOf(it.sc).color,marks:RSK.get(it.id)?'● restr.':''})),...npl.map(o=>({lab:o.l,txt:`No programado: ${o.z.desc||''}`,c:conOf(o.z.sc).color,marks:''}))];
    all.forEach((e,k)=>{row(k%rows,Math.floor(k/rows),e.lab,e.txt,e.c,e.marks)});
    y+=rows*rowH+14;g.font='400 22px Arial, sans-serif';g.fillStyle='#5b645e';g.fillText('Anillo naranja: con restricción pendiente · Anillo rojo y zona rayada: superposición con otro subcontratista · Letras: trabajo no programado',40,y);
    if(pairs.list.length&&!scOnly){g.fillStyle='#d32f2f';g.font='600 26px Arial, sans-serif';g.fillText(`${pairs.list.length} superposición(es) entre subcontratistas`,40,y+40)}
    const blob=await new Promise(ok=>cv.toBlob(ok,'image/png'));const vn=basesOf(M.piso).length>1?'_'+lname(LAM.get(M.vista)).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\W+/g,''):'';const name=`Plan_${S.pis.get(M.piso)?.code||''}${vn}_${M.date}${scOnly?'_'+conOf(scOnly).name.replace(/\W+/g,''):''}.png`;
    if(window.PLANO_EXPORT_PREVIEW){const u=URL.createObjectURL(blob);window.__lastPng=u;const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><span style="color:#fff;margin-right:auto">${esc(name)} · vista previa (en la página real se descarga)</span><button class="ib" data-x="1">Cerrar</button></div><img src="${u}" alt="">`;lb.onclick=ev=>{if(ev.target.dataset.x||ev.target===lb)lb.remove()};document.body.appendChild(lb)}
    else{saveBlob(name,blob);toast('Imagen descargada')}}
  catch(err){toast('No se pudo generar la imagen: '+(err.message||err))}}
function pdfDialog(btn){const pn=S.pis.get(M.piso)?.name||'';const dw=DOWN_[(pd(M.date).getUTCDay()+6)%7];
  openPop(btn,`<div class="xpd"><div class="ph">Exportar · ${dw} ${fmtD(M.date)}</div>
  <div class="ptx"><b>Plan de trabajo de obra</b> (formato ${esc(drCfg().codigo)}): listado de actividades de todos los pisos y, después, el plano del día de cada piso con las zonas numeradas con el ítem.</div>
  <label class="apr"><input type="checkbox" id="xdp" checked><span>Incluir los planos del día</span></label>
  <label class="apr"><input type="checkbox" id="xds"><span>Además, un plano por subcontratista</span></label>
  <div class="xbt"><button data-do="drpdf" class="pri">PDF</button><button data-do="drxls">Excel</button><button data-do="drcfg">Encabezado…</button></div>
  <hr><div class="ptx"><b>Detalle de ${esc(pn)}</b>: por subcontratista, con alertas y un plano por subcontratista.</div>
  <div class="xbt"><button data-do="pdf">PDF detallado</button><button data-do="png">Imagen del plano</button></div></div>`,
  {drpdf:()=>exportDR('pdf',{plans:$('#xdp').checked,perSc:$('#xds').checked}),drxls:()=>exportDR('xlsx',{plans:$('#xdp').checked,perSc:$('#xds').checked}),
   drcfg:()=>setTimeout(()=>drCfgDialog(btn),0),pdf:()=>exportPlanPDF({general:true,perSc:true}),png:()=>exportPNG('')})}
async function exportPlanPDF(opt){
  const pid=M.piso;const vistas=basesOf(pid);if(!vistas.length){toast('Este piso no tiene plano base.');return}
  const sh=shapesOf(pid);const acts=dayActs(pid,M.date);const zonas=sh.filter(z=>z.kind==='zona');
  if(!acts.length&&!zonas.length){toast('No hay actividades ni zonas en este día.');return}
  toast('Generando PDF…');
  try{await loadPdf();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const Wd=297,Hd=210,Mg=12;const hex=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const n=m?parseInt(m[1],16):0x888888;return[n>>16&255,n>>8&255,n&255]};
    const nums=planNumbering(null);const cuE=M.colorBy==='cu';const RSK=typeof pendRestr==='function'?pendRestr():new Map();
    const dname=`${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)} ${M.date.slice(0,4)}`;const pname=S.pis.get(pid)?.name||'';
    const numOf=new Map(nums.items.map(it=>[it.id,it.n]));const pairsAll=[];vistas.forEach(v=>{crossPairs(zonas.filter(z=>zVista(z)===v.id)).list.forEach(c=>pairsAll.push({...c,vista:v.id}))});
    const crossAct=new Map();pairsAll.forEach(c=>{[[c.a,c.b],[c.b,c.a]].forEach(([p,q])=>{if(p.actId){const a=crossAct.get(p.actId)||[];a.push(conOf(q.sc).name);crossAct.set(p.actId,a)}})});
    /* ---- página 1: listado ---- */
    doc.setTextColor(20);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(PT(`Plan del día · ${pname}`),Mg,18);
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(70);doc.text(PT(`${dname} · Semana ${weekOf(M.date)}`),Mg,24);
    const pr=P();if(pr.fullName||pr.name){doc.setFontSize(8);doc.setTextColor(110);doc.text(doc.splitTextToSize(PT(pr.fullName||pr.name),Wd-2*Mg)[0],Mg,29)}
    const nUb=acts.filter(o=>zonas.some(z=>z.actId===o.x.id)).length,nNo=acts.filter(o=>sh.some(z=>z.kind==='nova'&&z.actId===o.x.id)).length,nRs=acts.filter(o=>RSK.get(o.x.id)).length;
    const tiles=[['Programadas',acts.length],['Ubicadas en el plano',nUb],['No se hará hoy',nNo],['Sin ubicar',Math.max(0,acts.length-nUb-nNo)],['Con restricción',nRs],['Superposiciones',pairsAll.length]];
    tiles.forEach(([k,v],i)=>{const x=Mg+i*46,y=33;doc.setDrawColor(205);doc.setFillColor(i===4&&v?255:247,i===4&&v?243:247,i===4&&v?224:245);doc.roundedRect(x,y,43,15,2,2,'FD');doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(95);doc.text(PT(k),x+3,y+5);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(20);doc.text(String(v),x+3,y+12)});
    const hasRec=acts.some(o=>recOf(M.date,o.x.id));
    const rows=[];const scOrder=[...new Set(acts.map(o=>o.x.sc))].sort((a,b)=>nat(conOf(a).name,conOf(b).name));
    for(const sc of scOrder){const L=acts.filter(o=>o.x.sc===sc).sort((p,q)=>nat(p.a.code,q.a.code)||nat(p.x.name,q.x.name));
      for(const{x,a}of L){const zs=zonas.filter(z=>z.actId===x.id);const nv=sh.find(z=>z.kind==='nova'&&z.actId===x.id);const rc=recOf(M.date,x.id);
        const est=nv?`No se hará hoy · ${nv.motivo||''}${nv.repTo?' → '+fmtD(nv.repTo):''}`:zs.length?('Ubicada'+(vistas.length>1?' · '+[...new Set(zs.map(z=>lname(LAM.get(zVista(z)))))].join(', '):'')):'Sin ubicar';
        const al=[];const rs=typeof restrPend==='function'?restrPend(x.id):[];rs.forEach(r=>al.push('Restricción: '+rTxt(r)));if(crossAct.get(x.id))al.push('Superposición con '+[...new Set(crossAct.get(x.id))].join(', '));
        const q=hasM(x)?(x.qty||{})[M.date]:null;
        rows.push([numOf.has(x.id)?String(numOf.get(x.id)):'—',conOf(sc).name,`${a.code} · ${a.name}`,x.name+(q!=null?` (${fq(q)} ${x.und||''})`:''),est,...(hasRec?[rc?STT[rc.status]+(rc.cnc?' · '+rc.cnc:''):'—']:[]),al.join('\n'),sc])}}
    for(const o of nums.np){rows.push([o.l,conOf(o.z.sc).name,'—','No programado: '+(o.z.desc||''),'Ubicada',...(hasRec?['—']:[]),'',o.z.sc])}
    const head=['N.º','Subcontratista','Ambiente','Actividad','Plano del día',...(hasRec?['Campo']:[]),'Alertas'];
    const ncol=head.length;const cs=hasRec?{0:{cellWidth:10,halign:'center',fontStyle:'bold'},1:{cellWidth:30},2:{cellWidth:42},3:{cellWidth:62},4:{cellWidth:38},5:{cellWidth:28},6:{cellWidth:'auto'}}:{0:{cellWidth:10,halign:'center',fontStyle:'bold'},1:{cellWidth:32},2:{cellWidth:46},3:{cellWidth:70},4:{cellWidth:42},5:{cellWidth:'auto'}};
    doc.autoTable({startY:52,margin:{left:Mg,right:Mg,top:16,bottom:14},head:[head],body:rows.map(r=>r.slice(0,ncol)),theme:'grid',styles:{fontSize:7.5,cellPadding:1.6,lineColor:[210,210,210],valign:'middle',overflow:'linebreak'},headStyles:{fillColor:[38,50,46],textColor:255,fontSize:8},columnStyles:cs,
      didParseCell:d=>{if(d.section==='body'){const r=rows[d.row.index];if(d.column.index===ncol-1&&String(d.cell.raw||'').startsWith('Restricci'))d.cell.styles.textColor=[170,80,0];if(d.column.index===4&&String(d.cell.raw||'').startsWith('Sin ubicar'))d.cell.styles.textColor=[170,60,0];if(d.column.index===4&&String(d.cell.raw||'').startsWith('No se hará'))d.cell.styles.textColor=[160,30,30]}},
      didDrawCell:d=>{if(d.section==='body'&&d.column.index===0){const r=rows[d.row.index];const c=hex(conOf(r[ncol]).color);doc.setFillColor(...c);doc.rect(d.cell.x,d.cell.y,1.8,d.cell.height,'F')}}});
    /* ---- páginas de planos ---- */
    const note='Anillo naranja: actividad con restricción pendiente · Anillo rojo y zona rayada: superposición con otro subcontratista · Letras: trabajo no programado';
    async function planPage(base,title,sub,o,items,npl){
      const cv=await renderPlanCanvas(base,{...o,nums,W:3300,R:32,cuE});
      doc.addPage();doc.setTextColor(20);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(PT(title),Mg,15);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(90);doc.text(PT(sub),Mg,20);
      const n=items.length+npl.length;const cols=n>40?5:n>24?4:3;const rowH=3.5;const nr=Math.ceil(n/cols);const legH=n?nr*rowH+8:4;
      const y0=23,availH=Hd-y0-Mg-legH-6,availW=Wd-2*Mg;const ratio=cv.width/cv.height;const iw=Math.min(availW,availH*ratio),ih=iw/ratio;const x0=Mg+(availW-iw)/2;
      doc.addImage(cv.toDataURL('image/jpeg',.88),'JPEG',x0,y0,iw,ih);doc.setDrawColor(190);doc.rect(x0,y0,iw,ih);
      let yl=y0+ih+5;const cw=availW/cols;doc.setFontSize(6.8);
      const ent=[...items.map(it=>({lab:String(it.n),txt:`${it.x.name} · ${it.a?it.a.code:''}`,c:conOf(it.sc).color,rs:!!RSK.get(it.id)})),...npl.map(o2=>({lab:o2.l,txt:`No prog.: ${o2.z.desc||''}`,c:conOf(o2.z.sc).color,rs:false}))];
      ent.forEach((e,k)=>{const cx=Mg+Math.floor(k/nr)*cw,cy=yl+(k%nr)*rowH;doc.setFillColor(...hex(e.c));doc.circle(cx+1.6,cy-0.9,1.5,'F');doc.setFont('helvetica','bold');doc.setTextColor(lum(e.c)>.55?20:255);doc.setFontSize(e.lab.length>1?4.2:5);doc.text(e.lab,cx+1.6,cy-0.2,{align:'center'});
        doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.setTextColor(e.rs?170:30,e.rs?80:30,e.rs?0:30);const t=PT(short(e.txt,Math.floor(cw/1.25)-4));doc.text(t+(e.rs?'  [restr.]':''),cx+4,cy)});
      doc.setFontSize(6.5);doc.setTextColor(110);doc.text(PT(note),Mg,Hd-Mg+4)}
    for(const v of vistas){const zv=zonas.filter(z=>zVista(z)===v.id);if(!zv.length)continue;const vn=vistas.length>1?' · '+lname(v):'';
      const im=await loadImgEl(await imgURL(v,'f'));const pairs=crossPairs(zv);
      const itemsV=nums.items.filter(it=>it.zones.some(z=>zVista(z)===v.id)),nplV=nums.np.filter(o=>zVista(o.z)===v.id);
      if(opt.general)await planPage(v,`Plan del día${vn} · ${pname}`,`${dname} · plano general · ${itemsV.length} actividad(es) ubicada(s)`,{im,pairs},itemsV,nplV);
      if(opt.perSc){const scs=[...new Set(zv.map(z=>z.sc))].sort((a,b)=>nat(conOf(a).name,conOf(b).name));
        for(const sc of scs){toast(`Generando PDF… ${conOf(sc).name}`);await planPage(v,`${conOf(sc).name}${vn} · ${pname}`,`${dname} · zonas de ${conOf(sc).name} resaltadas; los demás subcontratistas se ven atenuados`,{im,pairs,scOnly:sc},itemsV.filter(it=>it.sc===sc),nplV.filter(o=>o.z.sc===sc))}}}
    const np=doc.getNumberOfPages();for(let i=1;i<=np;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(120);doc.setFont('helvetica','normal');doc.text(PT(`Central 911 · Plan del día ${fmtD(M.date)}`),Mg,Hd-5);doc.text(`Página ${i} de ${np}`,Wd-Mg,Hd-5,{align:'right'})}
    const name=`Plan_del_dia_${S.pis.get(pid)?.code||''}_${M.date}.pdf`;const blob=doc.output('blob');
    if(window.PLANO_EXPORT_PREVIEW){window.__pdfBlob=blob;toast('PDF listo (vista previa de prueba)')}else{saveBlob(name,blob);toast('PDF descargado')}}
  catch(err){console.error(err);toast('No se pudo generar el PDF: '+(err.message||err))}}

/* =====================================================================
   ETAPA 25 · Plano diario más legible + exportable "Plan de trabajo de obra"
   ===================================================================== */
(function(){let o={};try{o=JSON.parse(localStorage.getItem('lps.pv')||'{}')||{}}catch(e){}M.lbl=o.lbl==='name'?'name':'num';M.bop=typeof o.bop==='number'?o.bop:.5;M.leg=o.leg==null?innerWidth>=600:o.leg!==false})();
M.hl=null;M.hlk='';
function savePV(){try{localStorage.setItem('lps.pv',JSON.stringify({lbl:M.lbl,bop:M.bop,leg:M.leg}))}catch(e){}}
/* coloca números / etiquetas en pantalla sin que se tapen; si se mueven, se unen a su zona con una línea guía */
function placeLabels(L){const boxes=[],out=[],fixed=[],mov=[];L.forEach(l=>(l.nb||l.area!=null?mov:fixed).push(l));
  const sm=innerWidth<600,sz=l=>l.bs?{w:l.bs+6,h:l.bs+6}:l.nb?(sm?{w:l.t.length>2?28:25,h:25}:{w:l.t.length>2?36:31,h:31}):{w:Math.min(228,l.t.length*6.4+18),h:23};
  const hit=(x,y,w,h)=>{for(const b of boxes)if(Math.abs(b.x-x)*2<b.w+w&&Math.abs(b.y-y)*2<b.h+h)return true;return false};
  mov.sort((p,q)=>(p.area||0)-(q.area||0));
  for(const l of mov){const{w,h}=sz(l);let dx=0,dy=0;
    if(hit(l.sx,l.sy,w,h)){let ok=false;for(let k=1;k<=10&&!ok;k++){const n=8+k*4;for(let i=0;i<n;i++){const a=i/n*2*Math.PI-Math.PI/2;const ex=Math.cos(a)*k*(w*.62+3),ey=Math.sin(a)*k*(h*.8+2);if(!hit(l.sx+ex,l.sy+ey,w,h)){dx=ex;dy=ey;ok=true;break}}}}
    boxes.push({x:l.sx+dx,y:l.sy+dy,w,h});out.push({...l,dx,dy})}
  return[...fixed.map(l=>({...l,dx:0,dy:0})),...out]}
function NBZ(){return planNumbering(null).zl}
function nbMap(){const N=planNumbering(null);return new Map(N.items.map(it=>[it.id,it.n]))}
function nbHtml(m,id){if(!m.has(id))return'';const x=S.act.get(id);const c=conOf(x&&x.sc).color;return`<i class="nbi${lum(c)>.55?' lt':''}" style="--c:${c}" title="N.º en el plano">${m.get(id)}</i>`}
function hlIds(zid){const z=zget(zid);if(!z)return[zid];if(z.actId)return shapesOf(z.pisoId).filter(q=>q.kind==='zona'&&q.actId===z.actId).map(q=>q.id);return[zid]}
function setHL(ids){const k=ids?ids.join(','):'';if(k===M.hlk)return;M.hlk=k;M.hl=ids&&ids.length?new Set(ids):null;if(!M.tmp)drawOverlay();
  $$('#mleg [data-lz]').forEach(b=>b.classList.toggle('on',!!M.hl&&b.dataset.lz.split(',').some(id=>M.hl.has(id))))}
function renderLeg(){const el=$('#mleg');if(!el)return;const N=planNumbering(null);const fv=M.meet?M.meetSc:scVis();const cu=M.colorBy==='cu';
  const inV=z=>zVista(z)===M.vista;const items=N.items.filter(it=>it.zones.some(inV)&&(!fv||it.sc===fv));const np=N.np.filter(o=>inV(o.z)&&(!fv||o.z.sc===fv));
  const n=items.length+np.length;const show=M.lbl==='num'&&n>0&&!!M.view&&!(M.meet&&M.meetSc);
  let h='';
  if(show){const RSK=typeof pendRestr==='function'?pendRestr():new Map();try{computeCross()}catch(e){}
    h=`<button class="mlh" id="mlegt" title="${M.leg?'Ocultar':'Mostrar'} la leyenda"><b>Leyenda</b><span>${n}</span><em>${M.leg?'▾':'▸'}</em></button>`;
    if(M.leg){h+='<div class="mll">';let last='';
      for(const it of items){const zs=it.zones.filter(inV);const c=cu?STC[zSt(zs[0])]:conOf(it.sc).color;const cx=zs.some(z=>CROSS.ids.has(z.id));const rs=!!RSK.get(it.id);
        if(it.sc!==last){h+=`<div class="mlsc" style="--c:${conOf(it.sc).color}"><i></i>${esc(conOf(it.sc).name)}</div>`;last=it.sc}
        h+=`<button class="mlr" data-lz="${zs.map(z=>z.id).join(',')}"><i class="nbi${lum(c)>.55?' lt':''}${cx?' rx':rs?' rr':''}" style="--c:${c}">${it.n}</i><span><b>${esc(it.x.name)}</b><small>${esc(it.a?it.a.code+' · '+it.a.name:'')}</small></span>${rs?'<em title="Restricción pendiente">⛔</em>':''}${cx?'<em title="Superposición con otro subcontratista">⚠</em>':''}</button>`}
      {const sn=npSeenHtml('mlr');if(sn)h+=`<div class="mlsc">Visto en obra · no programado</div>${sn}`}
      if(np.length){h+=`<div class="mlsc">Trabajo no programado</div>`;for(const o of np){const c=conOf(o.z.sc).color;h+=`<button class="mlr" data-lz="${o.z.id}"><i class="nbi np" style="--c:${c}">${o.l}</i><span><b>${esc(o.z.desc||'Sin descripción')}</b><small>${esc(conOf(o.z.sc).name)}</small></span></button>`}}
      h+='</div>'}}
  if(el.dataset.h!==h){const sc=el.querySelector('.mll');const st=sc?sc.scrollTop:0;el.innerHTML=h;el.dataset.h=h;const sc2=el.querySelector('.mll');if(sc2)sc2.scrollTop=st}
  el.hidden=!show;el.classList.toggle('col',!M.leg)}
function viewPop(btn){const on=(c)=>c?' class="on"':'';
  openPop(btn,`<div class="ph">Cómo se ve el plano</div>
   <div class="ptx">Etiquetas de las zonas</div><div class="pseg"><button data-do="ln"${on(M.lbl==='num')}>Números + leyenda</button><button data-do="lt"${on(M.lbl==='name')}>Nombres</button></div>
   <div class="ptx">Plano de fondo</div><div class="pseg"><button data-do="b1"${on(M.bop>=.95)}>Normal</button><button data-do="b5"${on(M.bop<.95&&M.bop>.4)}>Tenue</button><button data-do="b3"${on(M.bop<=.4)}>Muy tenue</button></div>
   <div class="ptx">Leyenda</div><div class="pseg"><button data-do="gs"${on(M.leg)}>Mostrar</button><button data-do="gh"${on(!M.leg)}>Ocultar</button></div>`,
   {ln:()=>{M.lbl='num';savePV();requestRender()},lt:()=>{M.lbl='name';savePV();requestRender()},b1:()=>{M.bop=1;savePV();requestRender()},b5:()=>{M.bop=.5;savePV();requestRender()},b3:()=>{M.bop=.28;savePV();requestRender()},gs:()=>{M.leg=true;savePV();requestRender()},gh:()=>{M.leg=false;savePV();requestRender()}})}
function legClick(e){const t=e.target;let b;
  if(t.closest('#mview')){viewPop(t.closest('#mview'));return true}
  if(t.closest('#mlegt')){M.leg=!M.leg;savePV();requestRender();return true}
  if((b=t.closest('[data-lz]'))){const ids=b.dataset.lz.split(',');const P=ids.flatMap(id=>{const z=PD.get(id);return z?unflat(z.pts):[]});if(P.length)zoomTo(P);M.hlk='';setHL(ids);clearTimeout(M.hlT);M.hlT=setTimeout(()=>setHL(null),1800);return true}
  return false}
function legHover(e){if(M.tmp||PHONE())return;const b=e.target.closest&&e.target.closest('.pvl[data-z],[data-lz]');if(b&&b.classList.contains('txt'))return;
  if(b)clearTimeout(M.hlT);setHL(b?(b.dataset.lz?b.dataset.lz.split(','):hlIds(b.dataset.z)):null)}

/* ---------- exportable con el formato de obra (Plan de trabajo de obra) ---------- */
const DR_LOGO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAACzCAIAAADe21gvAABLtElEQVR42u19d3zV1fn/8zznc7P3JOw9ZauAgqiA4sAF7ll3655t9atWq1at41e1Fq3VuupAq6hFBXEwFFC27BVWICRkz3s/53l+f5ybGLLITW4Skpz361bTmPsZ5znnfZ7zTBQRaC8QEc0MAESEAIgIFq0jAkQEQuyAIpCKFWX+bYbATkWLxgFFREQQ0edzn3p9Vl5hMSKI8BH7xEo5oR4nNMQTFREeHRmRFBeTmhSfkhCXkhAXERZa9S/9ZN1GaEIEEOHFdz/duT8LWQSOXBEQqtAQJ8TjiYoMjwoPT4iN7pQcnxIfl5oYFx0Z0eZEwCwCUkmptbwvER3u+UVAs67rL82+1ZDruFpXW6FEWNe3RESzAJjHRkRQRPU/JAs3XCdryAP/OoziR+Muwiwsle9yONpCbNykMs/HfJjFpYhqXryqaBCx/qGuekeuY1gasnM7VW//zufzSxmFNUDb2fBFRBjZTYyP7ZHWaWDvbiMG9B7av1e/7l0cRVVpooED2orvgYizv1m8dX+euD5oSzqXCLNoNzE2pnOnxMG9egzt32tov54De3ULDw05YpmaWVjYUcqslKZcSjMrIkcpAPD53Kzc/PziEtd1FamoiLDEuJjI8DDzXzVz/YNg/qzWuVErTzkKG/iECEiECino85ZFCJEQ65m0rta1sl4VwkIKUAqaue7Nq/Yd1FEKAai2QT4snAC/pZnNRqLqfsRKuRxegy4r9558ze8zc/KgNr4/MnkBAIVFhBkAiQAJiQCAXV/vrp3GDB04aczIMcMGxEZFVpHoEarNMQsRTr/zkVWbdiIzH8GHmGoiAADWmgEQCcgvAtFu5+T4o4cMmDR25HHDB6UkxDVwobYMDKWanzOycvZlHczOLSj3ev3WCZYKpRQEsEda8qhBfWtlyUo7RnZu/pxFP323bM3G9N1ZuXler2tGxlEUHxvdu3On40YOPv2EY/v36GKUzWq84j/Fuu4rH84pLi03A6sQtcCUsSNGDupb7Svm/25K3zP72x/NazBAv+6dz510vJlI1XRb893Mg3npGfuzc/ILiktrTDCsqr0iomYZ0KPzsUMHMjPVodxUvdeezOyNO3bt2peVm19Y5vV6HCc+JqpzStLAXt36dEur9iQ1H2/Npu1f/rCCEPgQ8pGKQxsCAAuEhXgSYqO7p6Uc1bdnQmx0tWc4rLhdrbfuyti8c++Bg7lFJaWuZja3EABzX0QRuXzapM7JiebK5mhbWl7+7pzvyr0+RaSZ42KiLpo6Ees+2UjFMx/ML9i0Y8/2Pfuzc/NLysoQMSYqslNSfL/uXQb07Boa4qk2G+vUoAGANbtaozC3Nbs0IqIwCiCIsIDIjr0H0vcffH/uoqTY6MljR5x90rhxwwdVCulI4Ii6ZryrNTHrtkHQh4gAQIgZQQBAi2Rk5X624OfPFvwcFe458Zjh55583MTRQx1HtboIWEQR7c/Off+rBfN+WL5l194yr4tEtejRwhQSdvrYo0YNulkzV9OhKil75gf/e/nDL3KLSkUYWAszAZAiYfG57oGc/Ky8wmUbt7/w3qfnT57wx2svjI2OrJVWyr2+5978ryaPsAuAIICOM2fBknn/fEIpVXWHYGZSatOO3TM/ns++cgAgT+iYAd3PnXS8VOyav/4l0bwfl78xe/6KDVuLy8r9b4qHGSMKDTv7+OHHDh3IIlTHMBIhCHw0f9F7X3y/atM2n5bqSrQAsR7Yt8eMycdffNqJ4WGhNcnIvMuqTdtnfjKfvWUNOTsKc3x05KnHjb79srPTkhPr2UIq6S87N/+NT7/+/Ptl2/dkoPIAVt+TqhiV1EnHDu+cnFh1JItLyx95+T+gHGBG5YmPcC48dSJiLYcb8xsEWLJm4xufzvth5fr84lI45PEQRITdrilJU8cffdVZk7ulpdTF0U77MKVX6PwMuvJooIlBWLJy8t6bu+jdL74f0b/XRaefeNaJYyPDw+rftSwaJwIA0CCVIiAQ1C4AFBT5Pl/w8+ff/9SnW6cLTpkwfcr4pLiY1qJpI/d353z75Ouz8orLRbvCrBBRBLH6cvU4pFFHhYXVNeVcV9/0+Ivzlq7VvnJFSIBCoBmFSAMCIbA4hAAMLC7ze/MW/7Rhy5t/vqtLalJNjkbExNjo7PwiEQ2CAIAup2fmvDH762unT3W1rtwhzKCFh4Ui+xwAJBD2VZ4UD+VQevyf777y33kgwuwSCBmlv16G9jikwY2OCK9nkyPEXfsO3P30q8s2bBPWol2lyKwpYTCmFC3sMq/bunP9jr3vfvH903ddO3xA71r16LBQD2mvItB+Uy+SqpWakUGD5tz8gvfnLf7+5zXvPPH7Pt3Sar1mpbi/Wrz8/hfeyC4oFu2KCIFbl6mHkAR1iMepqX9ERYSVlJYToLAbFxVXzyrwufqhl978z5zvAZG1qwAJjYzMiwEzaOE9mdn/mj3//bkLHrju4gunTqyVkdotQ7GAq7UWBhBiDaJXbUn/4wtvTr3x/1758IuiklJFZMxnllubTwRaWAsjAGoXtG/rroy/vP7RKTfc/9Rrs7Jy8x2lEFEztzA7v/DO7PtefDsnvxDZRyKOIg2gETVQtU+ZKxpUQWlZXQz1x+f+NXfpWtIuAjCzq1nAiQj1DOieNmZwv2F9uyXGRDOSFmStRYTYt2135jUPPVtW7jWKVLXL+jS7WmvNrtau1lpr0O7z78zOzs0nxGpnW0J0zR9pdjVXG0lj0Pv02x9f+fhrEo2sEQCBXGYNoKW+T5lPa6Gi0tK6znkIkHHg4IX3PrFs/VZiH2pXIWkWl8kV0oDmB2ZQSMgaxbd5V8bFv39yzebthFhz3TGLq+XXFxdxhVwmc50qP4t2K+we7O7PLbjjqZl1TSEj7jkLl93w6AtZOXkoPhStkJjh18se+vEyuKK8PrcWU7tfNNrVulYLpOETFrnx4b+9+9ViZEatFaAW1oBmWCp+ABRAYWJfQWHx759/89+fzDXGk/apQdev2Rn3K2kXmXbtz3r8tQ/f/nz+by8886KpEwnxSDZMtxsRaBAAINaIcjA3/6UPv3z3q++vPffUq889JTw0tGVEYJbrdz+tfubt2SSaQLQWACD0pMRHDe/fKykuBg9VaYmIAY4e1Nf8XPNSH36zhED7tDbRdOHhobddcvY5Jx/XOSXR/GVeYdHC5b88/e8P0/dnk3ZdzY5yN+3O/McHn99x+XmauR4PEiIKAAkUlJU/88asv9x+rQlhPNSsdKgZ+VD6ZpaX3vsUhYVFCyMCk4pwqHf3LtERobXppxXfVaQBBvXqDrVGGiCIyM2Pv7QvO4/EdTUTAJNKig6fOv6YYf17JcTFFBaXbNix+6tFP+8+kAMua5cdBcVl5Tc99vcvZz4WHhoitT6/ACEK4pDeXQf27sZcxTbA4NN6d2bWms3pmgVEu1o7AKu37Fy6ZuNxIwZX00DNDronM+uup/9pjE7aZQIQR6XFx0wYPaRXl7RKJ/Yhg4DYs3NqpeE7UNPZc2/+95sV60m7PmEEAFIOqcljho0dPrhzcoLP1ekZmd8tW7N84zbWmjUTAmr3TzP/M3JQ3+EDeld7C6fj0AQbkyIAsezcl/XHF96cNW/h/ddeNHpwv7rcFxbBF4FmRET25eT6/vrmJ/+d/8Mfrj5/yrhRzW10EhFC9LnuIy+/A2JCupAQiJw/XHP+xaefVM9xvpLvqjHj8+98CiCi/TbHsLCw1/98x7jhg39VMxHioqOmnTh23IjBF9z12Pa9maRdzYLi+/fHc68+59TY6Mi6IjSgwj7KwOj63p+7+LJpU4b06VF1lMyeIcIIqlYFf8fefZvS9/pDaACEnNPHj77/uou7piY1fOiqCcVYWj79fumKzTsq2RmUZ/Ixw5644+rkhNiqf3zXFec98a8P3vjsG3J9rmZHwe6svLc+m3/jBWdUtdhU3xRJnTd5/LXTT6v1eTan77nhkRd2ZGSiUbyU+nH1+uNGDK52HBERInrurY9LfVohuGye07ly2sn3XDUj6nDihgCj15lFEe3JzH7pg8/B1a4wAQiprqmJf7/vphED+1T941suOXvWVwv+8Pzr2ucKACEw4l9efe+9v95X7aYdzgjLAq5mZI2uu2L99hl3PPrUa7N8PpcQa4SgWjSbQq2N6cm3dVfGdY88f88zr+YWFCqi5hMBiyDiohXrtu/NQmYtTICgnAduvPj6GadHR4Rr9h+ua36qnccN923bnbFqwzbRrv9Sjue3F5w+bvjgcp/PGCKIEBFFxOu6SXExT915jVn0IoIC+aXe739eAxUBiNWpQQCJOiXGpSXGIzlEyAJ/nvlODerE+l0Cu/dnsfEJIghSQnTEM3df1zU1iVkO/6kjmstsVG9+Og9EhEEhgXIG9kyb+dAtyQmxPle7WlcMJoeHhj78u8tPHTNCHI9CYs3A+j//+8bnusbGWNfzl5Z7Xa3LvN6qgtDMPtft37PrzRefCUikjL1bdu3Lqsanhi6zc/PnfL9UXFezKCRxPFPGDn/4d5dHRYTXJWvzaUQYmzF6fDRvkY8rHgQxPNTz2iN3jhjY59Bh0a7W5596woPXXwLKIUBXa9S+JWs2bdyxu5r9p4N6yRhACyNrFn7pwy9n3P3Y1l0ZjlKWo1vW9MTIGjXPmv/j2bc+vGztxuYTgVlyXy7+GZGQkAAYsXeX5N+cc4qrtVnPjlK1fqodrUyaw7K1m1iRcXJqkAiPuvTMScziUU5V1x8ihjiOZj56SP8RA3oIKYVksiwWrlhXt+5GgJQcH3fXVTMAURhQ6yW/bPly0U9VLZVY94HDvG9xaRkiIhIBAaneXTv5DUqEh//UZnRiFiLal5WzauN2dl1/jBriXVfO8DiOz9UeRzlKVQwmGbK795rzHQQGEUTR7s79Weu37cLaLNFVt4GaglBERORq3TU1WVgzm6kihSUltdLl4pXrSo1ZQ0RAiPmOy88zNs+6ZG0+jbC2mf3mm6WrzPlMEYHjOX/KhAE9u3p97qHDoowucsVZk3ulJTMiARApUOrbZavh0DyaDh3GoIWN32b1pvRz7njkq8U/W45ulZ2S2LdzX9bFv3/qjU/nOUpxM0Tim/Wzcv0W1i5rTUqhUqePP7biWB3wgvxla3rFEkIkNbRfTxOaUuulTLbBxNHDkRQSCguz3py+B+rJnxLJKSicPmX8yP49RClQACKP//Pdcq/PKOYA4BCBSK3hGIZiPI7jD/MVBuCCwmKTAme0uZqfKipkHQ8FAgBrt6S7AgoRQTRAQnTE+JFDRKQyNexXE6pSANCnW+ej+nQHUgSolELlrN60HepO3TTHlLrUW0epzIO5SIr8cR5owldqXm3Fhi1mqyEAQerVJXVQ7+4QeMpJQ7Z/RMzJL9yyaw9rl0FYa2CeduJYZlE1hsVIBxFPG380KkVKmQPLig1bqh0FbJyZ3+JRWFhy/Z9f/OeHXzhKaWax0R0tLgLX9T00892HZ75jNNYgisCsn/yi4ozsHBEWRBMsP3xA70ZczayfvQdyjNseCZGof8+uIlJPehEi9u/ZtcL8zSCceTC3KtvWQlKaFdGDN15mcroReFdW/qsffUEVXzErX+oOmEuOjxXWDMwAyLxlT+abn35tGEoR1fxUUSFrt72Y++7adwDMOQAISQ3u3S08LFTqMNqa1TS0fy/DleaX2/fsq3+QI8PCHKXCQkKq6bahHk/mwdyZs74AYdYaAJCwd5e0Ggo4AcCW9L2sWdicW9RR/XvVr7Y3foIBAMD+7NziUq9JS2XEyLCQfj0615Wpb8ZqxMA+FcngDMy792VV27Mdyw5GlSYAYHnstVm5hUX3/uZ8zUy2xk3LqtIIQKxf/+yb3LzCZ++9wUz7oIjA5Btk5eQXlZSaoidaGLV0SUmEQ8MzGkTQgABQVFIiIhUPh50S47HeeAwASEmIE2EwO4RIaVl5aXm5ySWr46mluLRs5KC+00449rNFP4O4qH0vvvf59CnjUxLizXXrMREAQP+eXRPjonPziwQ0i4B2H/j7W+/8b37vrmk1tUhBDPM4SfFxQ/r2OPao/qmJ8XVdPDsv3y8dQiTsmpoMFfkmdb3+IW5Jgf0H8+oSLrMWgXk/Ls8rKtLMilRlsZGSsrJdGZlL127MKy4DrQUAWVjcE48ZVk2O5hyTU1AEwH4nKkK31KTgbvyH7FuIWbn5SApZizCSSoqNjomMrP+LnZIShLWAGJ0kr7DY63NDPE6l69gS9CEEoVi/NOvLMq/3wRsuPZITDtuvVVo7KJ8s/KnM53vp/ptNBaOmi8Csn6KSUgFC5Eqjh0lZClyD9mv9Ve8Q4vEcVukOC/UYZd780qfdiovUntLmamYWEfnDtRd+vWRlabmLBKU+96nXP3j2nht/NXHUcUfNHBEWeukZJ78460tHu67rE0QQvXHnvk27MuvZf0AkKiL0ijMn3XXl9Fqr8RUVH2LzDQ8LPeygJcbF+EeKBZT4vL66jRsAon9Yu+nHdVtrl6XWKCyIHqWYnFOOHjK0f6+qUViG3Zi5zOurmlYZHRnerBO4zOv99TCDGB4ebo44WLcGHRkehn4PNoBAuddrCNqaOOoQPTOx+9rsb5567QNj67DD0tLmDpeJfV/+uOr2J/9hPNrBUnl8rgsmgRoAAInI42m8glKtSFH9rgvzCjUrmuHhFH8TCtIlJfHGC04H5QEBcH3//frHFRu2ikjly9SlRLPIzRefNWFYP01KSIkIASkABVzz4xCTMLFGrQsLiv/x0bw//eMtCpJNwFEKArmMAnGQq34qn80fro3E5AzqkfbEHdeKSM3BZRGf75BtwOO0sD56ePYgwkOevIa9yxJ0LUocsfvSh1/++5O51mfYahwtvk8XrXhk5tu1plc1klJJQRVNVRpL/eY7EWHhVSwMWFhcctgvFhaXIBJWFGIK8agKXUlqvQ1XJAdq5utmnJ6WEC1AqBCI/jzzbUTj/apPbUeA0BDP64/e/fsrz+3TrRMiiVKMpGv7uEIaRGuthREF3fI3Z8/flL5HEVXj6MhDg4jLyr2HffeC4pKqpnJ1uCJ8WrBajp/W7GrX79hH7NOt080XnDbrmfsT46JrtVMRYkiIU3V0tW5efSs0xFN1epWVe008Rj3TrKzcW9WFQISmWM2vG5ulg1omB7NCfGjmf3p17TTx6GG2akercLTj+F779NuenVOvOGtKXUkNDTZKIABERYYjCPvr+YirdVm5r9EGk/i4KAT0e71EdmYcgLot5mYz2JOZBUQEilkDUnREeP3GAQYWFgBgloiw0PuuveiWJ18BzQh65eZd835cMaRvD6x3/RsPpCK68YIzrp0+deuujO179ucXFvlcXfMJMw/mfrN01Yb0vShsCiSh48z7YfmAnl2r2ZcT42KM4UBYACUrNx/q9RaIyL6sHP8jEQpgbHR0Neaq/NlkEg7v13NI3x4us0IUASL89qdV+w/mg1GYlPOHqy845bjRlcU4a4qbiMLCwqqa6evKXA8WkuJiRPwGZRHJKywuLi2vy65iZlFufhEQkWYQAMKYiPCwQ30SlqBrHzt2XSR1+5Mvf/73RzonJ9g8w1bYJjUTug/PfPeofr1GDerblG3SSC4lIS4yPKywpBT8aXUqKze/d9dOZqkERtAA/bp3QVoOGlhrIVi/PZ2ZqV4/4drNOyqeh4SoR+cUE1NIdQVysD+szVGkmaedOPb1j+eu2LwDQQPI4/9874X7fqcIXX2YzcmECThKDezVbWCvbvX88R1XTL/o3r/8vH6rMqcWgS27Mmr+WZeUJH84irAwbk7fozXXDCar0AoJETen76kS9II9u6TWfeonJnX2yeOuOW9q1d9/u2z1VQ8+R0im4sVf/vn++FFHhYZ46qmR1D0lef2Ovf6tRSC93k20KTB+49SE+DCPU+r1mcSgvMLiPZlZA3t1k9rKjZutZdPOPUhEoIRFkFKSEhCxahUtqxjWaT1Ckdyi0juf+kdTjsMWTdkmhbXL+pa/vFRUUlZPOFpDNGgRiYuJ6t4pBUmhmLgrWrVxq/EmNUIfH9a/tzCbQtggvCMj65etO6E2Y7RR8bw+d/6SVaJdZo2ERDS0Xy+ou7uHgGjgatWRHvztpcAsWsD1bd+b+eJ/ZoeHhxx2dzGxz4am60mfK/N6PY6adsKxJh5OWAAkt6CwqgHB/DC4d3cw1gZEEN6dmb0pfTdXNJw7ZB0xA0BBUcnP67ZUBgiL5kG9utXPlSVl5VUzCb2ue9Kxw8ePGChKIRKx7Mg8+K//flnT/FJ1Ex06oJe5BbMW1svXbdaHszk0DkQoIknxMT3SUowVSxGBchatXIeIug4zKSLOX7JCKvYtUjSkd3eoyLKxBH04DU6YRC9dv+OVD+fUNQ8smnubVCB7s/P/PPPtJnqrNDMCHDdiEBKRUqy1aP3feYsAwFHK59aeuGFIp2YNOQAYPbhvfGS4kEJEAgSkv73ziemgYQrL8a+EyIrojdlz9+UWkgALmLufNGZEXSRles6x/pXyjC1+xMA+5508DhwPKQXCcxb9XFxcajTTeva5ynfxlyquAwDAItUcpxXlPqrYH0R6dE7p06MLKccwkSD9679fmNpMmitbXwmL+LQmxLc++7qgzKtMbwfEyHDPqMF9oSJauXbKOzST0Bye/njtReh3CDJo30vvf74nM7tmkb/KUT3xmGFmR2QBEtmbnTdn4TJF5GoOeqq3aWl27LCB5DiVE+ztz74x1jmfq0Wgcli8rusotWbzjh9Wb0LtamHWWpgnjB4KNlElsFWt9bNvfrwz4wA1T4i7xWGM0ZqJ3ffmLvph1fqmOAzNpD9v8njRWkQYAFlv3p35yMx3ENHj1J64QYiKqGbVZs0cFRF+5sQxqJQi1MLg+uYvXfPX12cRkaP83zUs43HU598vffL1j0D7GEQhgeMM7Nl59KB+fBi7jeCh52gRufeaCyM8jpmKaILSGqA+N+QTFhJCiF8vWVk1ASclPqaaymmY6JwTxwIpUuRqDdr9cP6Ps+YuMMNYyfiEGOrxLFy+9vl3PwPXZRBFRI7nlHGj4qKjNHPDjQ1G9Ef17Xne5OPA8SAQCpR69aMvv4OIUsPLqoiYeUifHiMH9hJyFBKDIOsHXnxr0cp1JvE6uKne5ivTJ49nrU3CErLemZl9399eNxMMESqHJcRx9mXn3P7kTM0MIoSASqUlxJiST1WNNtYGfVhrI5e7/NBLb/770buZGawluuX1aK1BOf/34r+/mvl4tcYiDYdZ4UP69jhj/Kg5P65x0Geo/7XZX/+8bvNZJ44b3Kd7zQpnxgCSGBfTNTWp6n2NzeSGC8748OtFpWUuATAAsfv3D+YsXr1hxuTjh/TpERsVWVru3bor438Lln21ZIVoPx+hQkG668oZSh12v6nUCYzXCzVzp6T431105tNvzSbXV3/bHfPAGVkHN6fvPWwuu8/VmQdzv1jw04KV60CYRRxQIjJ0QJ+aIykil5456dWPvsovdslESTDf88y/lq3ddP4pJ/TplhYRHlpW7tu178Bn3y95/ZN5PtdF/yMBsfz2wjMboaKa/enuK2d8sfCnElN3X7tf/LBy4YpfJow6qqaLwjSd+sPVF130h6eQEFhYOCe/8NI/PDlh5OBjjxqYmhTvOKpafJ5JNTzp2BGJsdEBzTRzyB45qO/EUYMXrNzoiOtqVlp/MG9xekbmtedNPapfz7joKK11Vm7+dz+tmTlrTmZOHrBmAA85rJybLj47NMTTccuNNtrQobT77c+/LFy+dsLooTaio1UMHQ7I9oyD78757oqzJjc6ogMBmeWRm3+zYsOD+3LyHQWuZnJ9q7fsXLNttzCDcHVVTIRCQ8+dePSz99xYteWVKSPeNTXpsVuuvPPZ10R8DpFmRte3cuP2VZvT/ckUgKgcAQHWxhKChEKey6dOmDJu1GHnEmttDu+VTGGOcdeeN/W9L7/bk5lTP8GbB567ePnD//qQveUNMFWTiIBoEVBILBJGMPW4o+HQ5GNzgEiIjX7stqtufvJlECZABhHhWV//+MHcRVERoeEhoV6vN7+4FJXDrg8RUICUEuW598pz+vfo2oh1ZPantOSEa6dPff69/5HrmoPQQy+99dU/HiNF1fjUbMljhw+67eJpz78/h9gLgAwsDAtXbVq0ZrOfxWvOEqL3n0hJjB3AIqpGfAiiUYXr3BQfveWqs259KLeAHQdcl8nlpb9sWbZua6jCqMhw0ZJTUAjKw9olk25DSitn4oj+l55xkqkofchbN/fqQkRCCMqn8ozQKjTxxL8+YJa2mFjYDkTArIHd//fOx5WtcBpxESIEhKT4mDcfv7t7p0QmDwCgIgWgRAiYBAgO+XgchwSc2qjErP/zJo9/7KbLPJ4QRiUipJT/aggCQgAk7PgtucJEjOrKMyb++ZYrdR0hHw6hQiJFCqmmA9No7mGhIfddezEgKuUoJIVERKqO0nYejyLQIQ4pkHo/TMIKRJFyFDEAKM/9N1ySnBBrulPXfPczJ4555MaLUSkmAhAiVCAKobCo9EBufl5xCQEoEOUQCohyGOmm80+98YIza2VnNC+OROh/91oN08xy/YwzUmIjkBQ5pAC37z3wxqfzavUSmee844rzbrvoDFHERACgFDkIDrKS2rJ1kJXU3vJKGESANYsA69oLsQpA97SU1x+5KzUhltEBADMlEHRpuTcrtyC7oFAASFgpQCQA1Mo5YcTAl/7vVqgt2KMFlEEUVMH4ECAJoIgQgL8OZIuUy9DCxLxux55vlq6klm3RFBxDDUCQRKAAyXSCJ/SLoK61FGSCFiCAnMKyd+d815QuWUZ8/Xt2/fi5B6ZPGufxeIQ8jOiKMBATVvv4WDNReY0GSFXX/6VnnDz7bw+cOm5ESIiHSTGSK8CAgIoJNYAGFPIA0tGD+7760C1/+t3lxs5Ya4/wguJSUYqFRKkSn+vWeFNz09MnHHPskD7seIRIlNIColRJmbdWIz4LeX26/h5XWlCLaABGxeQkxMc+9rtLLp82uS5V1zzGFWdN+eCv940dOgBQCTkaQANUVERCRnQBBD2gnOH9e7760K13X3V+TSXRb2PxuaKUy+KyiFJen69WVUNAoiLC7rxihjgOC5kmf4++8u72PfsUUU1voSHu2y8/9+3H7zl2SD9AEnI0osv+BlTVPi6jBuWrLXTR8aCj0HGUo9DxqHom2MhBfWc//+D0SePCw8LMlGAhJAWARkXXAIKOKKdzcsL9V0//96N3maoDNadEc5s4MD4mMiIsVJrO8pq97Hq9blFxsZBjNkMBFO06ShlHbXO/y9/f+2zyuFFtTIdGjIoIj4uKaLoIQLTXp30+t6i0TAswKkAQYL8ImjlPyxT/ffWjOZdNmxQW4pHG1ugwKzYpPvaZu6698fzTvlm6es3m7fuycsu85VpXr2KolHIFuqelQB2qQIVpu+fLD966Y+/+JWs2rt2yY/vu/QXFJVprQgoPC+3eKXlIvx5jhw0a2q8n1Nu7x1HqhNFH5RWVEAgzOkqZtIVaEzEe+u3lf37lP8AiwogkQEMH9K75x7FRkd2S4wnYdzj5eBxKiI3tmZZ87LBBU8aNTIyNqYtMq777MUf1f/+vf1y9eceCn9es3rR9z/6swpJSrbVSKioiPDUxbviAPuNHDhkzbGBd724euHNK0jEDeqFpfETUo3NqrWNuwkhmnDJh0ap1Bw7mESAgaIDvflrTu2tatY7mVUlz/Mgh40cO+WVr+vJ1W3btz8rLLygqK5ca+x8CMXBibAz8WhQUACA+OnLOS48xs+lD5nGUMevXfEIzwdKSE5+567pbLzl7wc9rl6/fvH3P/vyCIq/PBcCwsJCkuJjBfXqMHT5o/KghppVPXfMZK1Nxysq9J151z76cXBQOCtk5SjGqJ2+7cvrk8T7tNrEGK7O4Wnt9bk5+4YHcvC07967fsnPVpm3rd+wmxyPaJQGGZoyzIARB9fFz/zdqcL/msESb6PRzb394xcYdxFy//ycAEZBz4/RT7r5yRrBE4GqdW1CUlZO/bc++9dvSV2/cvnZrOqMSrUlEpBnPFwpJHOe5u645d9LxTcwtNGHtwUo+MtOuIVdreR+GCX1ryItWKw3WwEdlkWrVlHyuNjk71SL2Wtd/08KtR0WA5dAeiSw+14dIIYEMS7M7CT2O4zjGotZU2YSCJzIc4mOi+nRLGzdskPnl+u275iz86b/zFmXk5IPrKoSgUFttFkzFpN78bP6owf3alonDUSqIIjBKWc/Oqccc1R9gIgDs2Lt/7g/LP5q7ePOefcKoRJpJBGbiv/npvHMnHd/EdzErlUWMTtTEpUsVQcTGZEz4a2Sev9ivCFUE7R2WT6uqgFRv/rRU1/5qUzkJKwrbN4jNTbSuCbxr+Lub8GcT0udxFFT0SKw6wvVfsNrr4OGsl9V0scPujubulTKCeq9fVzeZXx9ODtPkAdHvaK18fSIMDQmpuBSbHmyHHZZmJ2ijoWvNqIKzd0mVvD5HqcG9uw/u3f3G889494tvX571RXZ+kdJucxCEZhbmeT+uyMkvTAgwBKd1wc0pAkXUq0unG84/4+pzp87+9oe/v/v5jv1Z5PNKExL/6nEGoJaVG3ds2L5rUO/uTdfICJGC11yj1qshogpknjS8t0vDt5SGC4IIARppOKp5Oz8xNWyEA90hG3f6aYrEDxENBny7qlKgBtcgb4kTBwYVZs8xHiqoaI0TFRF23fTT5rz0yJnjR4tymuMsIyIKsNjrzv1xBdTR6/MINkQ3lwhM6QBXa4+jZkyZ8PnfH77yzJNFOc3kvTUZtB/PXwzNU3m9XaLhkg3u7ezI1yWFAHaFtv7aJlnLlAlNSYh78f6b7rnyXCGHmie6AAHmLFgKgbfhaMcgQrNZulpHhoc9/LvLnrv7WuUobESnv8OeBrQW7c79Yblpp2AH36KdL652szs5ShlV7qaLpj1606VCpFSQOZpBtOv76ZfNWTl51AxH+LYOs1P6XH3e5PH/fPBWUg5i0EUAIJye4W8LbTsqWFiCbmOqnM/Vl0+bfMelZzEqgmCyg7FylPr0T79sbnNWjhbbKT2O8rl60piRz9x1jZAKup5rrBwLl6+1Vg4LS9BtUY8jV+vbLjv3xJGDRSmFwXxHJATERavW26lTDwxHnzvp+KumncQYZBEICwgvXrUOrKHJwhJ0W1TiCElEnrjjmogQRzCY/ipTFXDlhq1wqOfaouY2qZnvu+7iLslxElQeZRDRev3WXcWlZdbQZGEJug2+VUXdr+tnnA7KE0RDhyAK6x27M7Jy8hDRkkM926SIhIZ4/nD1BYCIwVOiRQRAcguLt+zcCwC2BqyFJeg2+GKIInLl2VMiQ5WGoMUsiwiJlLpsWgGxWDN0PUq0YpbTTzi2V6dkpmCaORQROs6G7bvAmqEtLEG3TSWaWCQ+JmraxLHkeIJojjDdkrbv2WfZ4fDmCGFFdPEZJyI5QUwJMTp6re3yWgwiYrKoNdfZnsPfyoRtvzQLS9B1rKLTJxxjescF98pbd+2zs6cB5xgCgCnjRhHoIAa9GD/h9t37oGX9hCJg6Nifp0v+ZiV1Nebwt2UhNGXgDWu3dZuMtDg61PtWP4a2a3ZARBw5sE9cZGhuISMET9giew9kQYsUO23j5xgUkZ6dU/t3S9uwcx9pl4Mz/CxC+7MPQvAKHtV3DmBhYX8xjQpTTbnXdzCv4EBu3sHcgpyCwsLi0rJyb7nPR0iOoojwsJjIiPjYqMTYmKT42JSEWI9zyBnC1brpNUBaBR1tzrfu+zrte2SZJToyYkCP7svWb0XWGoJA0MIiJAcO5rUMO7R1mL4ewwb02bg7k0AF5SgjCCCcnVdUWu4NDw1pvrooRutXRAQKAA7k5K3cuO2nXzat27Yrfc++rLwCn6sRFSBW+KH9rZ3MP0QYhD2OSomP69kldXCfHsMH9B7ar2fPzqmVpfhMSmQbYr2iklLNDC2i1wqIo5yoiLBWm71aF5WWQUsp8QISERYa4vF0CIIGABYmUIP6dl+2cZu/cGww1DcQzCsoNsVt21DVpFbEkD494Osfgrj5ikhxaWlRSWl4aAhA8MffVKc0ros9mdlfL1k5/8eVKzZtKy7zAiKICGsxlTZFI2Gta1hYGMTrc/dm5WQczPth7WYQUCD9e3U5YdTQKeNGjR7c1zC1ZkZojtz4YJ70TdjSpb9/Ij3jAAEwNK+HnIBE0aiBvV975K56img3n2KhiFZs2Hrtw/+PuNlfFgAISZR64NoLp0+ZUFlNt0P0JOyWmgzBjLQDACkqLS0r90aEhVrybcgJsWtqErBIELsqiJSVeYtLy5LjYwUEgydfFgHxB7kvXrX+3f99+82yVSU+DSKsXWX6CrIAsNknNEj9Gz8iomjUYr7oE16/fc+G9H0zZ80Z1KvbuZOOO+fkcamJ8W1Fmz5YUJhfXCbabfYGyiLkCckrLG7Fl/X63PyiMnHdlugWLUIhoWVeX0cxcVSiU1I8CAePHVBEynzecq/PEnQDCTo5IZZZY5DOisaXoEFKysqD+7R+zQXhm2WrX541Z8najYiKtc8hEhYE0MJV6Fga+LQCAOD/IiKidglEi96Qvnvj6x++9N5n5596wlVnT+mamgStXdj+sPAoB0AIsbnNHEqRgIQ4TmvP3pZ4WQBQDglUPyg4HYEdIsNDzWk0mLsdiw52ZEg7RkRYGARTfzaSRdfVfr5usoIjAgDiKLVxx+6//vvDr5euQRDUGlEQwA2erA1fG1s8aU0guYW+Vz+Z98GXC66ZPvW66adGhIUd2ao0i0hwpVnXEhMUae1Ug5Z5WbPd14xi6BDJyiEhIWBsx8GDdtnVXLGwLeqbdgDgcfz1u4NJOgg+1w2ONJlNw/KX3v9s2q1/mr9sDWqfaamthZsv0osBXM0IgOzmFRU9986nZ9/y8ILla/21ztnOrY6ODkHQ2g2+qosI1jXYQBo1Shc3w4EjKEHQRl3Nysm7/L6nnnrjk/KyctTaUHOL6WhaMwIQ+zbvzrj8/qeffO0DEX/FAjuDLEG3c5T7fBjUchAAgITKrxLaWXR4lJV7TePSIGqjIuIQNVErN0bndVt3nnPHowtXbiT2IaJujWO1iLiaUWtk/seHX11+35PZuQWmc7adP5ag2+nxWgQAcvILTY274CmF6FEeT5Bzl9uzCAqKSzCoUWQiAiKhoZ4m6s6OUj//svnie5/ck5lN4rqaWzd1jQFYhMS3ePXmGXc/tn3PPsvRlqDbOTKyDgYxzA5BADEyIiTchnA0mKD3Z+UiqYa3lz6MCBAB0VFORFgYADTOwW4yaNZs3n7lg8/mFxcT+50KRwJcl0nc9L2ZF9z9xOb0PZajLUG3T5jD7449+4PpyxMAhPDwsBCPAzbbu2HYvndf0I1B4eEeE+bYiAuziCLasz/rygeeLSouJRF9hBUmdDUTcFZe/uX3/3VnRqYisoVVLUG3NygiEVm3badI0OolIRIgJcfFgC1G3OA9cu3m9CCGoiMIIsVGRsZERjROqReRcq/v+keezy0oJmF9RJaNdTUT6/0HC6564NncgiIEYKtHW4JuNzBRSrv3Z+3MOCDalWB1lSdEwNTEBLALpgFUqIhKy71rNm8X1hKkfFkEAsTk+FjHUY1ItTeZII++/M76nRkkWjd5lzUOaIWHlLVTSNTkA5YWUaB37Mu66bEXAZDFVi61BN1uCFoYABYsX+sCmYbTQVQLe3ROsbOnIZYEEVmxfktWfhFy0OJ6kRCRunRKbsQhxpieF69c9+b/viftNsXubHrJKyQBEOWIUoyKSTEpRiVKCSmpIO5GM7WrmcT94ZctT/zrPUcpe2jrUGjf5UYJAD6at0iYg5wKJNKnW2c7exrIYh/OW4hEwSplV3ndft06Q4BxeyKCgF6f+8Df30AEbmyAPCISoAZhVEASFaq6dUpJTYyLi46KCA8T5sLSspy8gv3ZOfuycsq1CCCAKERuVM1brUWBO/PDLycePey4EYOP8FxwC0vQDVKUCHHlxm0rNm5HYR08vUMzA0ifbmlgu0rXrz6zEGLmwdwvFv4k2g2iCIQFkPv37NoI2TlKvf+/77ZnHCTRjUtDJHMy8HiiQz2njR99yrijRwzsnZIQV+vtMg/mrd2y45ulq+YuXp5bUiaujyBgQ4+IsKuB1D3Pvvr1P58IDfG0ag1FIgRUBA227wm04d6+gb4sAARRG2y3BC0iSPT0v2chEWqBINU6QQRATIiO7NWlEzRHmct2Zd9gh9QL78wu06IQ3eDZ67Ww0jiwd7eA9khjEC8r9770/ufAunH+A4XEiA7h1edM+c05p3RJSTx05/Zr9IiIiIqoc3JC5+SEU48bfc9vzv/P/779xwf/Ky33Kg7YLckADsre7PwX/jP73t+cr5lVKxF0udcnqFi7gKrhqxFA2uYcloBfFgCEg/W+7ZOgTQLCnIXLFq/ehFoH0UdPQEJqQK9uURHhLV+jtm2dYBylftmS/p+vvgc3mLn2hCCo0pLju6cmB7RHmkf6esnKfQfzkVkHvoIUkijVMzXpud/fMGpQ30pSJiREqGl2MC49AQGApLiYWy89+4wTjrnr6X+u2rzTER1oASbNgux79b9fXnLaiV1Sk5ilJetHG4UdEWY+eEtpuQ8DGHP69Nslb835LrgrsfkVZwSA4f17v//k7xs+yuZk8/tn/7U9IxM5CHH1Tnulhv3ZOfc9/wYyS1C3biQUxDFDBwIAM5NNJqzDuIGI5V7fbU/N1FqCe74lUoxq9OB+Ho8TkDXW6Nr/mfNt44wDCklIDe7V9Y1H70pOiPO52nQdrJ/UDK2ZpatZ+nTr/MHT99302Ivzlq5VGFjwtYgoRV4tf3vn47/edT0Lt8oRblj/3oF+Zf223YCExNB26j8ayUVHho8ZOiDQ78ZGhYOpLdHkDam9mVDNii0tK7/+4edzC0uEg9yjk7UWrY8bORhsikrdp0JAIMTbnnxp254D1ByhiAjHjxwCgXgIjUE8I+vgsl82aZ8v0PK+BMCIXZIT3nr8nuSEOFdrjxOYjQERHUWaOcTj+ccDt44Z0leUosCnt7i+j+f/uHt/VmulrrD4e5k35FPu82nmsnJvG53MEsjLmobCmtmng3hkb1eWDVZERSWl1/7pb2u27iJ2g0sNhCBEqQnRRomw9o1ajUuESIj3Pvvqlz+uJgnyqRYRXa0VyPiRQ6AiUKdhtMIAsGjFLy6jwsB1ekSF9P9+f0NiXExlO6LGqOFE5oT3wh9/FxcVgRRY+J0xo7tAr8+eC60Uhm86gQX0OZJbeR12vgX6soqCGTrQHgja7HIA4Cjaujvjonv/snj1RpJghg1UHq7J8Uw8elh4aIhmthp0NRGwiKNUVk7eVQ8888HXPxBrN9glRgmQnJBRA/t07ZTcCCPskjUbACHQslmOUqA855w05pij+jeFnSs52tU6JTHuzsvPEaUIAs6yAXY/nv9DYUlpkKP7LY48tGGCZhZzpjC7nKv1m59+fdYtD6/dugubloBQj32DtT77pOPsvKnKy5UiIMTPv1867eY/fffzL83BzgCAhIAw7cSxlUpxw0lWRFZvThfWHLB3joHd684/I1jBbYqIWS44dWJqbCQjBLRfiAiy5BaWfv3jSqjwUlq0VzS7k5BFXB3kteqnA0LjJCkqKft6yYqXP5yzYUcGax+JNIcrwgQP9EhNGDtskDlpthka5WYRAZlIMkQA8PnchSvWvfLhnCW/bBbWJOA2g78eEV3miBDPaROOMTQXAKkhHswv3HcgS5hNW+6GkikSEw3u1WVgr64B3bT+F9Gsw0JDpk449o3Pv6XA9wxEmP3tD+dOOs4e4yxBNwlR4WGmNEHQr7w/O/eXrenf/bxm/tJV+7LzRISYEZqrPTqRYnJmnHKC46imn3NbEuFhIc0kgoN5Beu37VqwfO38Zau27TmAIKBdQNDNc+xWRIzq1ONGJ8fHBhS/IQAIsO/AweJSHwaYfIiESOrYoQON+TuIwygiE0Yd9cZn3wSa5sog4vqWrFqflZufHB8bjI6MFh2PoIVFiL//aU1pebnP1U1UPVytvT63pKx8X3ZOxoHsXfuydu7NLHM1EIl2SQCEmy+GBxG1SLiCC6dOhEB8U62uOwvoVRu3/ffrRU0XgWb2+nyl5d79B/P2Zx1Mzziwc19mUakXiURrZI1IGpoxI4FZC8Jvzj21EVQIiNl5BUBEzDrgR5QBgWctHm6/J0Ts3TWtEdHBIqKQyjT8sGr92SeN09yW1AWLI4WgtTBofnfuwvfmLQ4STZr/ib9eJGsSIVAsrJvZU6KImNQ5J41LTYxvQ5UQjAjmL1vzzc/rgicCv1Iqwr+KwMTkN2cagkkSGTukz4gBvTlAE5NRmQ/mFSASkgQUjSssAJKaGA9BDaw0F4qPiYqIDC0sLscAa3QgoSB899Pqs08aZ60clqCbMBG1G7RsDqmyZoQBkSva1zfvKyAysyK68cJpptpO25IxiqZgbWBVrsNat5gIKon21kvPrdSIA/12mddr9vcA78kCZJozBB0eR4UoB6E84MOE1iKwcsNWV7OjqFVLc1i0ZYJuxgXcUgFGiojJufDU8T27pLbFQmIsbV8ERn0+qt/xI4dwYz20Xl9jiiMhkgB4Xbc53svV2qdZAs8IZABgvTMja2dGZp9uaWLLwrRT2GJsDVCfRSI86vbLz22L6nO7EQMI33/9xdCEvuAepzEnOVN7Oje/EILckhwAIL+wuKS0rHGmIYUkRBu27wLbOMISdIeFIgLluePyc1IS4lik7eZEteFTniJRzkWnnjC0X6+mnGDCw0Ib6cBE3LZnf3BTQkyJmPSMTA1IjaJ+JASktVvS7QyxBN1R2RlJAw3u2fma86aaAtN2TFp+gjJgUnTEH6+7iEUaJwBjn02IiRaRQGPajMPj57WbEDGIObyGkX9cvQFJNc5JYx5sy869YMvCWILumMYNQHSInrn7erMy7TJohQmqFCD95fbfxEZFikhTKDI5IVZYB1omiUFE6xWbt+3JzMaKRpdNZ2dC0prnLFgq2m2ch0CEhTl9335msQ1WLEF3PPVZkSjnvmvPH9S7m6u1XQOtYtxgci457YQp40Y1RQTm6NMlJSkyzCMBbrQioghdJlOnlIMRSqiZifDz75fsOpBL0sgrCqKIHDiYX1hSAkG1j1tYgj7iqYGI0Tn9+JHXnDe1beUNtp8NEolRDevT9eHfXd7E4BlEFJH4mKhunVKQFAbeZxa0743Pvs7IOugo1cTyF8xMRCWlZU++NgtEmtTpXLiouDg7twDaaMMSC0vQjVXc1KCeaU/fdR2LPT+2FjtjUmz0zAdv9TgOVpS+b4rSiojDB/QiFbDNV0RQoLjUe8/T/6wg2UbyIbMIACHe/eyrGQfzm9LpXERMfZjs3HyrQVuC7jjUgBooLSn+tYfvjAgLBWt6bo1JyQDhIZ7XHrm9c3JiEN2z40cNbVyLdy2MWi9es/meZ14xhboaUXzK1ZoIFdFDL701Z/GKphfLRiAkyi0ssgTdbpVFOwTV2JlJJcZFv/noXWnJCba/fauwsyB5PM4//3TbsP69g2VfMnIcP+qoiBBVVOpi4DX7tbAjetb8JYUlpU/efm1sdKSptkp4mIL0IqBZE5KjVFFx6f0vvDF7wbKglGM1Ddhy8grstLEadEexbKQmxL7z+D39enSx7Nwqlg0hFRYW+uqfbpswemgQrf+IqJkTY6MnHj1cOSGNk6yrNbrulz+sPuuWP81ZuAwRHaWIUCpq6tb8mKR082dzf1hx5i0Pzv5+Gbpu8Kq/YkFxqZ05VoNu7wPhEIPTMy3p9Ufu6N01zToGW2WD1EBxkeGvPHTbmGEDm0kEl007ec7i5dhYftTCSrvp+w789rF/jBzw5Ywp4086ZliX1KR6HnV/du6C5WtnfbVw2fotIEIiwW0DVlJWZiePJeh2C0QgIEbPsUN6v3TfzUnxsaZrnB2ZFhQBKkImp0+X1Jf/7+Z+Pbo0BzubLqvHDR88ckDPlZt3Kt1IE7AWJgEAvXLT9lWb00MVDOzVbVCvHj26pqQmxIWGeBCx3OsezMvfmXFg/Y7dG7btKvG6IozaBQh6Y2spLSu3U8gSdLs9UzOAKHXZaSc8dOOlHo9jLRutIQJh8kw5dthTd14dHxPdfBukSXW5+8oZl973dFOuY3idtItIpVpWbdm5ettuABPsZkzb/qotwiysFSAGn5p/NbzYWWQJur2BTKEy5cRFhD5446XTp4wXEZuU1QqKM5BD6u4rz/3thWcCQLNukKap9vhRR00dN/KrpasdblLvSlMCGxGJGSsCkU2ICJL/F8LCpjB3s0FrWynJEnS74wUtCESTjh36p99e1q1TsonlsrWQWlQEDEzOyP49HrnpiqH9eplSG829QSIgszxy8xVL1t6XX6ipyT3SRERDjSYALajUolUpLEG3F14wOhQweXqmJNx55XlnnzTOHBKt0bklqdllYfIkxIbfesnZV06bbMKKW0YERKiZUxPjn7rjmusf/btCEOY2HUQc6rGeJEvQ7cKgwQhMTlJcxDXnTr1i2qSoiHAWAQHLzi0jAlJKMzM5UaHq0jMnXT/9tOSEWABgkZYUgSJytT71+KNvufCMv8/6UqHXddsuQaOdvZag2zYpuFqLcgCpc2LMpWecfPFpJybGxUCludNaNZpVBAhESmstpJhUfFTEBVMnXn7mpG6dkitF0PJ1XA1H333VjMyDOR9+s8xxvK7LrThLm3Lv0JAQO80sQbclRkAgJHQrSAFZRg7ofdHUiWeccEx0ZIThBUK0/sDms2MQIBJq1oKKSYHAgO5dZpw6/pyTj0tJiGt1ESCicRj+9a7rheHD75Y5yqdZt7ypQyExEehGt9SS2OgIO+UsQR9xFOD/AQSBwKS9smhhQQJSgogs/bunnTRmxOkTjhkxoI/5e1O10lJzcEUAAoiEhIZ5AVCUEkQQ6N4pacLoo86cOHbM0AFm2DUzQuvvjohIACzy9D3Xx0RFvvbZfNGsEJs14uLQBwBFSpRn+onHZhzIXvLLFgwwNFtYACE+JtrORkvQQVjJQYHx55i+zggoSIKISIIIKKB9aYkJQ/r0GDt84JhhA4/q17Py+GxUto5psAt6vScRqWitjYAEhIAo5i4iiXExA3p2HTt04NjhA0cM6BMa4jkyd0dEBBEWefC3l/btnvbIy/8p82lHQJuic8268BRpFkZ19bSTHrzx0nNve7hxjV9FODYqEmxJL0vQjdcTgmvlRf8/QkM84aGeqMjIxNjozskJvbt17te988De3Xt2Tg0P/dUq52pNRB3aoBFsERiFGURCPCosJDQ6MiI+JqpTckKfLp36dO88qHe33l3SoiPDK//eFFA+MndHU8ZUM19yxskjBva9/4U3Vm7eAew6qrloWiGJMJMTHx3+4A0Xnzd5vM/nHsjNB+ZAa0MziLBOjo+xRGYJulETkdQdl509eexIzVpRkBYngiLyOE5keFh4WEhkeLijqjMvi5iy6AgdOkJDIYlyLpg89sqzTw2uCAzbRkaER4SFRoaHehynVhEgYpvYGo3PcHCf7h89e/+bn81/6f3PD+QVgfhUJQ82maqNXZ6FRSkROuP4UX+85sJunZJZpKi0LL+wWMTo0NLwCwpARIgnOSEOAAit1c4SdEAzklAQe3dNG9K3R7O+g4iw+JeQIWVCJBt7VCGCtJSklhSBIeU2JwJHKRYhoqvOnnLWiWPf/vybd7/8fl92HoCI61NIACDAAgHUKUVEFCGlhIVBRDnAetywgb+94PQTRg8FAJ/WHqWyc/MLi0vAbzJq+C4pgCo+LjY+Jsp/sLEBSZagA0VZuZdFmiUNoWI+I6KyBri64fO5VgQNgXFXaOaE2OhbLz37N+dM+XLx8k++Wbx0zSbXuELZFWZV4Q6FisTuapui/wxhUrBJMSlASYgKP3nMyPNPmTB22EBzwgDx3zE9IxOVQwF6CBFIENMS4z2OIyLWBm0JulGTnir0qaBPIDshG6zIWREEZO4wlfijIyPOP2XC+adMSM/IXLRy3Q8r16/auG3vgWx/gIrRWZXfaV2hMYMAAiKACGCYQz3SUkYP6X/C6KFjhg4w0ffmtGEC8E0lkHVbdwISEgeUII6ESDSgV1ezqdh0FUvQFhYdZEdDRynDpAjYs3Nqz86pl51xcrnXt2vfge179qdnZO7cdyA3v7CouLTM6/X5fKgoxFFhoaHx0dFpyQnd0pLNtzqnJFZe1jhLFVHlacOovas2bgNpTCMuABjcp7uVlyVoC4uOSNOGSZmFhRExNMTTr0eXfj26BHQdV+tanaUiooiKSstWbdwmrAMO4WAtAoN6dwcbY2cJ2sKiw4IICZShVKmMATc+QGPU8Md/g0BFkL4/gA9Nv6vaGVaEAFas35JbXIrMAdEzIjJgQnTEgJ5docJ6bmEJ2sKiQ+vUCFA91gIr/ysEapVHxDkLf0IiAsWB1N0nQFFqSN8e0ZERLGIJut0qB3YILCxaHiJCiIXFJV8u/FlcVwemQAMSAtLYYYMAIEDl28IStIWFRb3QzIj46XdL8krLqMIqEtDXhd2JRw8Da4C2BG1hYRFk9ZnI57qvfPC/RmR4m9pgvdNShvTtYTyNdkgtQVtYWARNfSbEtz+fvzMrF5kDja8jpVA5k8eNMhVT7Xi2Y1gnoYVFi8I0Js48mPvcW5+g1gwBhz9rZhTfeZOPBwCy6rPVoC0sLIICEX9I9e+f+1dBSRlIwGWYFBIqZ9TAvoN6d7fxG5agLSwsggZXs6PUs29+9N2K9STcyOYAiJeccRLY+I0OAGvisLBoId3Z1exx1Nufz3/+3c9J2A0k8NmvTyEIUVpC7JkTx1j3oNWgLSw6EFikmXxupva/x1H/nj3v/hffQubG3YhIAanrzjs1LDTEBOpZqVkN2sKiY2griIBo2qgEy7ZrCuM5SjHzo6+89+rHc5E1Bx74bNRnBkyNi7hw6olWfbYatIVFx1Kfb3zkb18t/tnUZTXE2pQ+KqYGtymMt377rgvv/surn8xDraVR7AwACAREd195fmREGNsC0FaDtrDoCNDMiujLhT99teyXLxavOHXcqOtmnHbMUf2rlbIzlY/qocWqpZQcpUxPmX1ZOa99Mvf1T75yNRCw29iW4QpJlBrcs/P0UyawVZ8tQVtYdBCYprF/e+dj1FqhzF266qsfl48ZOmDGlAknjB7aKSnelLKrqhpLlfA4Q9nkL23nr5kkIqs2bf94/g+fzF9cUOZln08hNZqdzc5AAI/f9htC1Mxg1WdL0BYW7R6mE9j/FizdtCsTtauFFYKALP1ly7J12yJCnJEDex89pP+IQX36duucFB8bHhpiTNU1L1VSVr4/O3dT+p5lv2z6ceW6DTv2oOOw61OAiKil8e5HRcjKufG8U0YM6NMsrcssLEFbWByBICLN/Pzbn1S20zZMqpgBuKjUt3jNpsVrtwhrhZAUF5UQE5sQFx0bFRnicUJDPMxc5vUVFpVk5eUdOFhwMDdflAJEYS3CirVUXLDx7IzEqIb06HznldONNcZKzRK0hUWHUZ8X/rRpdyYe2rPV/IyIqDUSs9YuYGZOQWZuEe5Cf91no0b7a/QLCIuw0oCErLUANCLSufr+ASCIUeGh/3jgFo/jWN+gJWgLiw6jPiNp5r+9/RHUURBDRDSI6eWKCCgMzFjZ1bviS8ICwoAAxpShg/N4iEhKaYH/d8/13dNSrPpsCdrComOpz599t3Tz7qxq6nNdZC0VfFw7BQsASLAeDxEVEQM9etMlk8eNsqZnS9AWFh1JfSZytX7+7Y+DyKpBZmdy7rjkzMunTbbs3HFnqR0Ci46pPhPiFwt/2rK3QepzC69JBGBSd1921m2XnWvZ2WrQFhYdCCJCSPqIVJ8VEgMA4Z+uv+g355xi2dkStIVFx4IpjvHpt8uONPXZUcSoYsPDnrv3+kljR1p2trAEbdHh1GdF5Gr9wjufHDnqs0JiECbPyP49n7rz6n7du1h2trAEbdFB1ecvFv60ec8B4tZXnwkAkYSUAvjdhaffftk5jlLmIa2wLCxBW3QsEJLr6mfe+BCVImi2CtANpmYmAsRxwwfee9WMkQP7AICthWRhCdqigwIRkPCBGy597u2Pf9m+R8Ah7SISg4hIizwAEqAIi3IAaXCvzjfMOOOck8dBRbdv22bQwhK0RYclaFSIk8aOnHjMsP9+vfj12XM3bN8rCKJdhQQAzcTUhpcBQIOIckR4WL/uV58zddqJYxylzC2t4mxhCdrCwm+JvuDUE6ZPGf/N0tWz5i1Y8NOaMi0gItolAFIkDAIsgI2sr4+IIAhUUZoDRSkAjAn3nHTMiAtPPeH4kYNNYQ2Tw92O1WYidBQiBrb9EBIoImx7m5ZCcpRCRJQApKoUEVG1iWAJ2qIjQhGJiLH2Thk3csq4kXsPZH+zdPX8pStXrN9aUFLGpABZGIU1AVCFy07Y1EbiGnRMAIAVq4u1ZhEgAlKCKIAJ0RGjBvY77YRjJowakpoYX7lPEGK7V5xLy7xMIeyWAgXg+WQRIk9hcWmbe9/84mImJcyBvS8LOZ6ycq8laAsLv63D0DQidklJunzapMunTTqYX7h2y45VG7et3rRj047d+7NzNCATASCIgN8agb9G6CEAoAAgooApFS0CSKzTkhMG9Ow6tH+vY48aMLRfr7joyEpeNptEu6dmY08/ecyImOgoQmGWQAQEAtgpMQ4q6ga2iUkFAPdcdUF2fiEG2NuMCFlg3LCBUKUlpiVoC0vTv7a2IqLE2OgTjx524tHDAKDc69uXnbMvK2dnRuaOvfuzcvJy8gvzi0oKiktZswADACnyKCc0xBMXHZkQE5OSGNc9LaVrp6RuqcldU5NCQzxVVUJmVqQ6jq2ZiABgcJ/ug/t0bzrxtRWcfsKxQRm36gSNhAoJCDAY9RIJjUfauqQD5QtCAuCgicBGBTRQfzGtrYxOLSKIGBri6dk5tWfn1HHDB9V6BgeB+q3HhpQR/YuBOmR0M7OwSKPSghCx7flONXNj/cz+FVu7iaOkrIyJhAWC4bFgZvJ4fK62i7/hKC0rZyJxNQRjUjIzOeT1+ezANkKnhkP7wFb+V6roPkiIlWdvQ+tQcarFihaFHZaUa2x+HUhLCOKO4lQdxNGD+x/MK0CSoMTuKyItkJIQ2+ZOKK2Io/r3CgkJJQhO/oQi0kLd01KsCBpN1pV9YGuikour0bqFRdBmYMsE51tYWFhYNF6DhgB9jg3XQewoNxzNtF9aKVhYWA3awsLCwiJosKmlFhYWFpagLSwsLCwsQVtYWFhYgrawsLCwsARtYWFhYQnawsLCwsIStIWFhYWFJWgLCwsLS9AWFhYWFpagLSwsLCxBW1hYWFhYgrawsLCwsARtYWFhYQnawsLCwsIStIWFhUW7gSnYLyBsx8LCwsLiiAECki3Yb2FhYXEEa9CSuwy928QHVo+2sLCwaGUQoRKhFEyZ7AAAZH8H4cswpxyU7VxnYWFh0apggRiP5KdVELSKgAKtSwlE28GxsLCwaE0gKmBwosHvJBQB0SCMlqAtLCwsWhUCCALAGmyYnYWFhcURC0vQFhYWFpagLSwsLCwsQVtYWFhYgrawsLCwsARtYWFhYQnawsLCwsIStIWFhYWFJWgLCwsLS9AWFhYWFpagLSwsLCxBW1hYWFhYgrawsLCwsARtYWFhYQnawsLCwsIStIWFhYUlaAsLCwuL5oUDAIAIgAAoYHsSWlhYWLQqhAAQSVUQtC6DaEf5vOA4dnAsLCwsWhOaIdqRwmI0BI0xg6WsTMIBge3gWFhYWLQmPIQIGNcNAFBE7IBYWFhYHIH4/1zcfYGBIXcTAAAAAElFTkSuQmCC';
const DR_DEF={titulo:'PLAN DE TRABAJO DE OBRA',codigo:'GP-PR02-F-40',version:'1.0',vigencia:'19/02/2026',realizado:'ROMINA VASQUEZ / ALEXANDER PRINCIPE',revisado:'ING. HUGO CASTILLO',proyecto:'CONSORCIO PP-911',ubicacion:'CHORRILLOS - EL SOL',misc:'ARMADO DE ANDAMIOS | glb | 1\nIZAJE DE MATERIALES VARIOS | glb | 1\nORDEN Y LIMPIEZA DE OBRA | glb | 1'};
let DR_LOCAL=null;
const drCfg=()=>({...DR_DEF,...(P().dr||{}),...(DR_LOCAL||{})});
const DR_COL=['#4472C4','#C55A11','#70AD47','#2F5597','#1F3864','#009999','#00B050','#7030A0','#BF8F00','#C00000'],DR_MISC='#92D050';
const dayUp=d=>`${DOWN_[(pd(d).getUTCDay()+6)%7].toUpperCase()} ${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`;
const hexRGB=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const n=m?parseInt(m[1],16):0x888888;return[n>>16&255,n>>8&255,n&255]};
const f2=v=>v==null||v===''?'':(typeof v==='number'?v.toFixed(2):String(v));
function drData(d){const ps=typeof pisos==='function'?pisos():[...S.pis.values()].sort((a,b)=>(a.order||0)-(b.order||0));const groups=[];let gi=0;
  for(const p of ps){const sh=[...PD.values()].filter(z=>z.pisoId===p.id);const nova=new Set(sh.filter(z=>z.kind==='nova').map(z=>z.actId));
    const acts=dayActs(p.id,d).filter(o=>!nova.has(o.x.id));const np=sh.filter(z=>z.kind==='zona'&&!z.actId);if(!acts.length&&!np.length)continue;gi++;const rows=[];let k=0;
    const cd=()=>{k++;return`${gi}.${String(k).padStart(2,'0')}`};
    for(const{x,a}of acts){const q=(x.qty||{})[d];rows.push({code:cd(),x,a,sc:x.sc,desc:`${x.name} - ${a.name}`.toUpperCase(),und:x.und||'',met:q!=null&&q!==''?+q:null,zones:sh.filter(z=>z.kind==='zona'&&z.actId===x.id)})}
    for(const z of np)rows.push({code:cd(),x:null,a:null,sc:z.sc,desc:`${z.desc||'Trabajo no programado'} (no programado)`.toUpperCase(),und:'',met:null,zones:[z]});
    groups.push({n:gi,p,title:(p.name||p.code||'').toUpperCase(),rows,color:DR_COL[(gi-1)%DR_COL.length]})}
  const misc=String(drCfg().misc||'').split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(a=>a[0]).map((a,i)=>({code:`${gi+1}.${String(i+1).padStart(2,'0')}`,desc:a[0].toUpperCase(),und:a[1]||'',met:a[2]==null||a[2]===''?null:(isNaN(+a[2])?a[2]:+a[2])}));
  return{groups,misc,miscN:gi+1}}
/* un canvas por piso (y vista) con las zonas numeradas con el ítem del listado */
async function drPlans(D,opt,say){const out=[];
  for(const g of D.groups){const zl=new Map();g.rows.forEach(r=>r.zones.forEach(z=>zl.set(z.id,r.code)));if(!zl.size)continue;
    const vistas=basesOf(g.p.id);
    for(const v of vistas){const zv=[...PD.values()].filter(z=>z.pisoId===g.p.id&&z.kind==='zona'&&zVista(z)===v.id);if(!zv.some(z=>zl.has(z.id)))continue;
      say&&say(`Dibujando ${g.title}…`);const im=await loadImgEl(await imgURL(v,'f'));const pairs=crossPairs(zv);const vn=vistas.length>1?' · '+lname(v).toUpperCase():'';
      const ent=g.rows.filter(r=>r.zones.some(z=>zVista(z)===v.id));
      out.push({g,v,title:g.title+vn,cv:await renderPlanCanvas(v,{pid:g.p.id,im,W:3300,R:54,nums:{zl},pairs}),ent,pairs});
      if(opt.perSc){const scs=[...new Set(ent.map(r=>r.sc))].sort((a,b)=>nat(conOf(a).name,conOf(b).name));
        for(const sc of scs){say&&say(`Dibujando ${g.title} · ${conOf(sc).name}…`);out.push({g,v,title:g.title+vn+' · '+conOf(sc).name,sc,cv:await renderPlanCanvas(v,{pid:g.p.id,im,W:3300,R:54,nums:{zl},pairs,scOnly:sc}),ent:ent.filter(r=>r.sc===sc),pairs})}}}}
  return out}
async function exportDR(kind,opt){const d=M.date;const D=drData(d);if(!D.groups.length){toast('No hay actividades programadas este día.');return}
  const say=m=>toast(m);say(kind==='xlsx'?'Generando Excel…':'Generando PDF…');
  try{const plans=opt.plans?await drPlans(D,opt,say):[];if(kind==='xlsx')await drXlsx(D,d,plans);else await drPdf(D,d,plans)}
  catch(err){console.error(err);toast('No se pudo generar: '+(err.message||err))}}
function drDone(name,blob,kind){if(window.PLANO_EXPORT_PREVIEW){window['__dr_'+kind]=blob;toast('Listo (vista previa de prueba)')}else{saveBlob(name,blob);toast(kind==='xlsx'?'Excel descargado':'PDF descargado')}}
async function drPdf(D,d,plans){await loadPdf();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});const C=drCfg();const logo=C.logo||DR_LOGO;
  const Mg=10,W=190;const cw=[11,132,14,33];
  /* encabezado */
  doc.setDrawColor(0);doc.setLineWidth(.45);doc.rect(Mg,Mg,W,22);doc.line(Mg+50,Mg,Mg+50,Mg+22);doc.line(Mg+W-40,Mg,Mg+W-40,Mg+22);
  try{doc.addImage(logo,'PNG',Mg+3,Mg+3,44,16.4)}catch(e){}
  doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(0);doc.text(PT(C.titulo),Mg+50+(W-90)/2,Mg+13,{align:'center'});
  doc.setFontSize(7.5);doc.text([PT('Código: '+C.codigo),PT('Versión: '+C.version),PT('Vigencia: '+C.vigencia)],Mg+W-20,Mg+8,{align:'center',lineHeightFactor:1.35});
  const iy=Mg+24,rh=5.4,lw=122;doc.setLineWidth(.2);doc.setFont('helvetica','normal');doc.setFontSize(7.8);
  [[`REALIZADO POR: ${C.realizado}`,`FECHA: ${dayUp(d)}`],[`PROYECTO: ${C.proyecto}`,`REVISADO POR: ${C.revisado}`],[`UBICACIÓN: ${C.ubicacion}`,'']].forEach(([a,b],i)=>{const y=iy+i*rh;doc.rect(Mg,y,lw,rh);doc.rect(Mg+lw,y,W-lw,rh);const fit=(t,w)=>{let f=7.8;doc.setFontSize(f);while(f>5.5&&doc.getTextWidth(t)>w){f-=.2;doc.setFontSize(f)}};fit(PT(a),lw-2.4);doc.text(PT(a),Mg+1.2,y+3.8);if(b){fit(PT(b),W-lw-2.4);doc.text(PT(b),Mg+lw+1.2,y+3.8)}});
  doc.setLineWidth(.45);doc.rect(Mg,iy,W,rh*3);
  /* listado */
  const body=[],meta=[];const push=(r,m)=>{body.push(r);meta.push(m)};
  for(const g of D.groups){push([String(g.n),g.title,'',''],{t:'g',c:g.color});for(const r of g.rows)push([r.code,r.desc,r.und,f2(r.met)],{t:'i',c:g.color});push(['','','',''],{t:'b'})}
  if(D.misc.length){push([String(D.miscN),'ACTIVIDADES MISCELÁNEOS','UND','METRADO'],{t:'g',c:DR_MISC});for(const r of D.misc)push([r.code,r.desc,r.und,f2(r.met)],{t:'i',c:DR_MISC})}
  doc.autoTable({startY:iy+rh*3+2.5,margin:{left:Mg,right:Mg,top:12,bottom:14},head:[['ITEM','DESCRIPCIÓN','UND','METRADO']],body:body.map(r=>r.map(PT)),theme:'grid',
    styles:{fontSize:7.6,cellPadding:{top:.9,bottom:.9,left:1.2,right:1.2},lineColor:[60,60,60],lineWidth:.12,textColor:[20,20,20],valign:'middle',overflow:'linebreak'},
    headStyles:{fillColor:[127,127,127],textColor:255,fontStyle:'bold',halign:'center'},
    columnStyles:{0:{cellWidth:cw[0],halign:'center'},1:{cellWidth:cw[1]},2:{cellWidth:cw[2],halign:'center'},3:{cellWidth:cw[3],halign:'center'}},
    didParseCell:q=>{if(q.section!=='body')return;const m=meta[q.row.index];if(m.t==='b'){q.cell.styles.minCellHeight=2.2;q.cell.styles.cellPadding=0;q.cell.styles.fontSize=2;return}
      const rgb=hexRGB(m.c),dark=lum(m.c)<=.6;if(m.t==='g'||q.column.index===0){q.cell.styles.fillColor=rgb;q.cell.styles.textColor=dark?255:20;q.cell.styles.fontStyle='bold'}}});
  /* planos del día */
  const Wl=297,Hl=210;
  for(const pl of plans){doc.addPage('a4','landscape');
    doc.setLineWidth(.45);doc.setDrawColor(0);doc.rect(Mg,Mg,Wl-2*Mg,14);try{doc.addImage(logo,'PNG',Mg+2,Mg+1.8,28,10.4)}catch(e){}doc.line(Mg+32,Mg,Mg+32,Mg+14);
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(0);doc.text(PT(`${C.titulo} · PLANO DEL DÍA`),Mg+36,Mg+6);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(60);doc.text(PT(`${pl.g.n}. ${pl.title}   ·   ${dayUp(d)}   ·   ${C.proyecto}`),Mg+36,Mg+11);
    doc.setFillColor(...hexRGB(pl.sc?conOf(pl.sc).color:pl.g.color));doc.rect(Wl-Mg-4,Mg,4,14,'F');
    const n=pl.ent.length;const cols=n>36?4:n>18?3:2;const nr=Math.ceil(n/cols);const rowH=4.1;const legH=n?nr*rowH+5:0;
    const y0=Mg+17,availW=Wl-2*Mg,availH=Hl-y0-Mg-legH-6;const ratio=pl.cv.width/pl.cv.height;const iw=Math.min(availW,availH*ratio),ih=iw/ratio;const x0=Mg+(availW-iw)/2;
    doc.addImage(pl.cv.toDataURL('image/jpeg',.9),'JPEG',x0,y0,iw,ih);doc.setLineWidth(.2);doc.setDrawColor(150);doc.rect(x0,y0,iw,ih);
    const yl=y0+ih+5;const cwl=availW/cols;
    pl.ent.forEach((r,k)=>{const cx=Mg+Math.floor(k/nr)*cwl,cy=yl+(k%nr)*rowH;const c=conOf(r.sc).color;doc.setFillColor(...hexRGB(c));doc.roundedRect(cx,cy-2.9,9,3.8,1.6,1.6,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(6.4);doc.setTextColor(lum(c)>.55?20:255);doc.text(r.code,cx+4.5,cy-.2,{align:'center'});
      doc.setFont('helvetica','normal');doc.setFontSize(6.9);doc.setTextColor(25);const sc=conOf(r.sc).name;const mw=cwl-13;let t=PT(r.desc);const tail=PT('  — '+sc);
      while(t.length>6&&doc.getTextWidth(t+'…'+tail)>mw)t=t.slice(0,-1);if(t!==PT(r.desc))t=t.trim()+'…';doc.text(t,cx+10.5,cy);doc.setTextColor(110);doc.text(tail,cx+10.5+doc.getTextWidth(t),cy)});
    doc.setFontSize(6.5);doc.setTextColor(110);doc.text(PT('El número de cada zona es el ÍTEM del listado · Anillo naranja: restricción pendiente · Anillo rojo y zona rayada: superposición entre subcontratistas'),Mg,Hl-8.5)}
  const np=doc.getNumberOfPages();for(let i=1;i<=np;i++){doc.setPage(i);const w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(120);doc.text(PT(`${C.codigo} · ${C.titulo} · ${dayUp(d)}`),Mg,h-4.2);doc.text(`Página ${i} de ${np}`,w-Mg,h-4.2,{align:'right'})}
  drDone(`Plan_de_trabajo_${d}.pdf`,doc.output('blob'),'pdf')}
let xjsP=null;
function loadExcelJS(){if(window.ExcelJS)return Promise.resolve();if(xjsP)return xjsP;xjsP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=window.PLANO_EXCELJS||'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';s.onload=ok;s.onerror=()=>{xjsP=null;ko(new Error('No se pudo cargar el generador de Excel'))};document.head.appendChild(s)});return xjsP}
async function drXlsx(D,d,plans){await loadExcelJS();const C=drCfg();const logo=C.logo||DR_LOGO;const wb=new ExcelJS.Workbook();wb.creator='LPS 911';
  const argb=c=>'FF'+String(c||'#888888').replace('#','').toUpperCase();const fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:argb(c)}});
  const thin={style:'thin',color:{argb:'FF000000'}},med={style:'medium',color:{argb:'FF000000'}};const box={top:thin,left:thin,bottom:thin,right:thin};
  const sname=dayUp(d).slice(0,-5).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31);
  const ws=wb.addWorksheet(sname,{views:[{showGridLines:false}],pageSetup:{paperSize:9,orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,horizontalCentered:true,margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}}});
  ws.columns=[{width:1.86},{width:8.14},{width:102.29},{width:9.71},{width:23.71}];
  ws.getRow(2).height=57.75;const lid=wb.addImage({base64:logo,extension:'png'});ws.addImage(lid,{tl:{col:1.1,row:1.12},ext:{width:150,height:56}});
  ws.mergeCells('C2:D2');const t=ws.getCell('C2');t.value=C.titulo;t.font={name:'Calibri',size:20,bold:true};t.alignment={horizontal:'center',vertical:'middle'};
  const e2=ws.getCell('E2');e2.value=`Código: ${C.codigo}\nVersión: ${C.version}\nVigencia: ${C.vigencia}`;e2.font={name:'Calibri',size:10,bold:true};e2.alignment={horizontal:'center',vertical:'middle',wrapText:true};
  ws.getCell('B2').border={top:med,left:med,bottom:med};['C2','D2'].forEach(a=>ws.getCell(a).border={top:med,bottom:med});e2.border={top:med,left:med,bottom:med,right:med};
  const info=[[`REALIZADO POR: ${C.realizado}`,`FECHA: ${dayUp(d)}`],[`PROYECTO: ${C.proyecto}`,`REVISADO POR: ${C.revisado}`],[`UBICACIÓN: ${C.ubicacion}`,'']];
  info.forEach(([a,b],i)=>{const r=4+i;ws.mergeCells(`B${r}:C${r}`);ws.mergeCells(`D${r}:E${r}`);const ca=ws.getCell(`B${r}`),cb=ws.getCell(`D${r}`);ca.value=a;cb.value=b;
    ca.border={top:i?thin:med,left:med,bottom:i===2?med:thin,right:thin};cb.border={top:i?thin:med,left:thin,bottom:i===2?med:thin,right:med};ca.font=cb.font={name:'Calibri',size:11}});
  const H=ws.getRow(8);['ITEM','DESCRIPCIÓN','UND','METRADO'].forEach((v,i)=>{const c=H.getCell(2+i);c.value=v;c.fill=fill('#7F7F7F');c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.alignment={horizontal:'center',vertical:'middle'};c.border=box});
  let r=9;const num=(code)=>{const n=+code;return code.split('.')[1].length<=2&&!isNaN(n)?n:code};
  const put=(vals,m)=>{const row=ws.getRow(r);vals.forEach((v,i)=>{const c=row.getCell(2+i);c.value=v;c.border=box;c.font={name:'Calibri',size:11};c.alignment={vertical:'middle',horizontal:i===1?'left':'center',wrapText:i===1}});
    if(m){const dark=lum(m.c)<=.6;const fc={argb:dark?'FFFFFFFF':'FF1B1B1B'};const to=m.t==='g'?4:1;for(let i=0;i<to;i++){const c=row.getCell(2+i);c.fill=fill(m.c);c.font={name:'Calibri',size:11,bold:true,color:fc}}}
    const b=row.getCell(2);if(typeof b.value==='number')b.numFmt=Number.isInteger(b.value)?'0':'0.00';const e=row.getCell(5);if(typeof e.value==='number')e.numFmt='0.00';r++};
  for(const g of D.groups){put([g.n,g.title,null,null],{t:'g',c:g.color});for(const x of g.rows)put([num(x.code),x.desc,x.und||null,x.met],{t:'i',c:g.color});put([null,null,null,null]);ws.getRow(r-1).height=6}
  if(D.misc.length){put([D.miscN,'ACTIVIDADES MISCELÁNEOS','UND','METRADO'],{t:'g',c:DR_MISC});for(const x of D.misc)put([num(x.code),x.desc,x.und||null,x.met],{t:'i',c:DR_MISC})}
  ws.pageSetup.printArea=`A1:E${r-1}`;
  /* una hoja por plano */
  const used=new Set([sname]);
  for(const pl of plans){let nm=('PLANO '+(pl.g.p.code||pl.g.n)+(pl.sc?' '+conOf(pl.sc).name:'')).replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31);let k=2;while(used.has(nm))nm=nm.slice(0,28)+' '+(k++);used.add(nm);
    const s=wb.addWorksheet(nm,{views:[{showGridLines:false}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,horizontalCentered:true,margins:{left:.3,right:.3,top:.4,bottom:.4,header:.2,footer:.2}}});
    s.columns=[{width:10},{width:95},{width:26},{width:12},{width:12},{width:12},{width:12},{width:12}];
    const c1=s.getCell('A1');c1.value=`${C.titulo} · PLANO DEL DÍA`;c1.font={name:'Calibri',size:16,bold:true};
    const c2=s.getCell('A2');c2.value=`${pl.g.n}. ${pl.title} · ${dayUp(d)} · ${C.proyecto}`;c2.font={name:'Calibri',size:11,color:{argb:'FF444444'}};
    const wpx=1500,hpx=Math.round(wpx*pl.cv.height/pl.cv.width);const sm=document.createElement('canvas');sm.width=2400;sm.height=Math.round(2400*pl.cv.height/pl.cv.width);sm.getContext('2d').drawImage(pl.cv,0,0,sm.width,sm.height);
    const iid=wb.addImage({base64:sm.toDataURL('image/jpeg',.9),extension:'jpeg'});s.addImage(iid,{tl:{col:0,row:3},ext:{width:wpx,height:hpx}});
    let rr=4+Math.ceil(hpx/20)+1;const lh=s.getRow(rr);['ITEM','DESCRIPCIÓN','SUBCONTRATISTA'].forEach((v,i)=>{const c=lh.getCell(1+i);c.value=v;c.fill=fill('#7F7F7F');c.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.border=box;c.alignment={horizontal:'center'}});rr++;
    for(const x of pl.ent){const row=s.getRow(rr++);const col=conOf(x.sc).color;const a=row.getCell(1);a.value=num(x.code);if(typeof a.value==='number')a.numFmt='0.00';a.fill=fill(col);a.font={name:'Calibri',size:11,bold:true,color:{argb:lum(col)>.55?'FF1B1B1B':'FFFFFFFF'}};a.alignment={horizontal:'center'};
      row.getCell(2).value=x.desc;row.getCell(3).value=conOf(x.sc).name;[1,2,3].forEach(i=>row.getCell(i).border=box)}
    s.getCell(`A${rr+1}`).value='El número de cada zona es el ÍTEM del listado. Anillo naranja: restricción pendiente. Anillo rojo y zona rayada: superposición entre subcontratistas.';s.getCell(`A${rr+1}`).font={name:'Calibri',size:9,italic:true,color:{argb:'FF666666'}};
    s.pageSetup.printArea=`A1:H${rr+1}`}
  const buf=await wb.xlsx.writeBuffer();drDone(`Plan_de_trabajo_${d}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'xlsx')}
function drCfgDialog(btn){const C=drCfg();const can=typeof canWrite!=='undefined'&&canWrite;
  const f=(k,l)=>`<label>${l}<input data-k="${k}" value="${esc(C[k]||'')}"></label>`;
  openPop(btn,`<div class="drf"><div class="ph">Encabezado del plan de trabajo</div>${f('titulo','Título')}<div class="drr">${f('codigo','Código')}${f('version','Versión')}${f('vigencia','Vigencia')}</div>${f('realizado','Realizado por')}${f('revisado','Revisado por')}${f('proyecto','Proyecto')}${f('ubicacion','Ubicación')}
    <label>Actividades misceláneas (una por línea: descripción | und | metrado)<textarea data-k="misc" rows="3">${esc(C.misc||'')}</textarea></label>
    <label>Logo (opcional, reemplaza el actual)<input type="file" id="drlogo" accept="image/png,image/jpeg"></label>
    <div class="ptx">${can?'Se guarda para todo el equipo.':'Solo se usará en tus exportaciones de esta sesión (no tienes permiso para cambiarlo para todos).'}</div>
    <button data-do="save" class="pri">Guardar</button>${C.logo?'<button data-do="nologo">Volver al logo original</button>':''}<button data-do="no">Cancelar</button></div>`,
   {no:()=>{},nologo:()=>{const n={...drCfg()};delete n.logo;drSave(n)},
    save:async()=>{const n={...drCfg()};$$('#pop .drf [data-k]').forEach(i=>n[i.dataset.k]=i.value.trim());const fi=$('#drlogo');
      if(fi&&fi.files&&fi.files[0]){try{const im=await loadImgEl(URL.createObjectURL(fi.files[0]));const k=Math.min(1,480/im.width);const cv=document.createElement('canvas');cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0,cv.width,cv.height);n.logo=cv.toDataURL('image/png')}catch(e){toast('No se pudo leer el logo')}}
      drSave(n)}})}
function drSave(n){const keep={};Object.keys(n).forEach(k=>{if(k==='logo'||n[k]!==DR_DEF[k])keep[k]=n[k]});
  if(typeof canWrite!=='undefined'&&canWrite){apply([op('meta','project',{...P(),dr:keep})]);DR_LOCAL=null;toast('Encabezado guardado')}else{DR_LOCAL=n;toast('Encabezado aplicado a tus exportaciones')}}

/* =====================================================================
   ETAPA 26 · Capataz: plano propio con estados en vivo (iniciar / detener / cerrar)
   ===================================================================== */
function capInit(d){ensureLam();if(M.date!==d){M.date=d}ensurePlan()}
function capNums(pid){const N=planNumbering(null,pid);return new Map(N.items.map(it=>[it.id,it.n]))}
function novaSet(d){return new Set([...PD.values()].filter(z=>z.kind==='nova'&&z.date===d).map(z=>z.actId))}
function crossOf(pid){const out=[];const zs=shapesOf(pid).filter(z=>z.kind==='zona');const vs=[...new Set(zs.map(z=>zVista(z)))];const ZL_=planNumbering(null,pid).zl;
  vs.forEach(v=>crossPairs(zs.filter(z=>zVista(z)===v)).list.forEach(c=>out.push({a:zNo(c.a,ZL_)+conOf(c.a.sc).name+': '+zoneLabel(c.a),b:zNo(c.b,ZL_)+conOf(c.b.sc).name+': '+zoneLabel(c.b)})));return out}
function zonedSet(pid){return new Set(shapesOf(pid).filter(z=>z.kind==='zona'&&z.actId).map(z=>z.actId))}
function capPlan(host,o){const bs=basesOf(o.pid);if(o.onEmpty)znLoad(o.pid);const zsAll=o.zones||shapesOf(o.pid).filter(z=>z.kind==='zona');const mine=zsAll.filter(z=>z.actId&&o.colors.has(z.actId));
  if(!lamReady){if(!host._v)host.innerHTML='<div class="kemp">Cargando plano…</div>';return}
  if(!bs.length){host.innerHTML=`<div class="kemp">Este piso todavía no tiene plano cargado.${o.empty!=null?' '+o.empty:(typeof canWrite!=='undefined'&&canWrite?' Súbelo en <b>Sectorización</b>.':'')}</div>`;host._v=null;host._fk='';return}
  let base=bs[0],best=-1;bs.forEach(b=>{const n=mine.filter(z=>zVista(z)===b.id).length;if(n>best){best=n;base=b}});
  let v=host._v;if(!v||!host.contains(v.svg)){host.innerHTML='';host._fk='';v=Viewer(host,{onTap:(w,e)=>{const el=document.elementsFromPoint(e.clientX,e.clientY).map(q=>q.closest&&q.closest('[data-z]')).find(Boolean);const oo=host._o||o;
    const zid=el?el.dataset.z:'';if(zid&&zid.startsWith('np:')){if(oo.onMark)oo.onMark(zid.slice(3));return}
    const z=el&&(oo.zones?oo.zones.find(q=>q.id===zid):zget(zid));if(z&&z.actId&&oo.colors.has(z.actId)){oo.onPick(z.actId,z,{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10,v:host._base||''});return}
    /* toque en un lugar sin actividad programada: trabajo no programado */
    if(oo.onEmpty)oo.onEmpty({x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10,v:host._base||''})}});host._v=v}host._o=o;host._base=base.id;
  const url=IMG.get(base.id+'|'+base.rev+'|l')?.url||null;if(!url)imgURL(base,'l').then(()=>{if(U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()}).catch(()=>{});
  v.set([{key:base.id+'|'+base.rev,url,w:base.w,h:base.h,T:base.T||I,op:.5}]);
  const full=boundsOf({...base,T:base.T||I});const mv=mine.filter(z=>zVista(z)===base.id);
  const fk=o.pid+'|'+base.id+'|'+mv.map(z=>z.id).join(',');if(host._fk!==fk){host._fk=fk;v.bounds=mv.length?cropBox(full,mv):full;v.fitted=0;requestAnimationFrame(()=>{v.fit();v.fitted=1})}
  let svg='';const labels=[];const ptsS=P=>P.map(p=>p.x+','+p.y).join(' ');
  zsAll.filter(z=>zVista(z)===base.id&&!(z.actId&&o.colors.has(z.actId))).forEach(z=>{const P=unflat(z.pts);if(P.length)svg+=`<polygon points="${ptsS(P)}" fill="#9aa3a8" fill-opacity=".10" stroke="#9aa3a8" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`});
  mv.forEach(z=>{const P=unflat(z.pts);if(!P.length)return;const c=o.colors.get(z.actId);const pts=ptsS(P);
    svg+=`<polygon points="${pts}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/><polygon data-z="${z.id}" points="${pts}" fill="${c}" fill-opacity=".38" stroke="${c}" stroke-width="3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    const ce=centroid(P),bb=bboxOf(P);const n=o.nums.get(z.actId);labels.push({id:z.id,x:ce.x,y:ce.y,t:String((o.lab&&o.lab(z))||n||'•'),nb:1,bs:o.bs||40,cls:o.bs&&o.bs<40?'sm':'',area:bb.w*bb.h,c,f:'#fff',tip:''})});
  /* trabajo no programado visto en obra: un punto con «+» del color del subcontratista */
  (o.marks||[]).filter(m=>(m.v||base.id)===base.id).forEach(m=>{svg+=`<circle cx="${m.x}" cy="${m.y}" r="5" fill="${m.c}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    labels.push({id:'np:'+m.id,x:m.x,y:m.y,t:m.t||'+',nb:1,np:1,bs:o.bs||40,cls:'npm'+(o.bs&&o.bs<40?' sm':''),area:1,c:m.c,f:m.c,tip:m.tip||''})});
  v.svg.innerHTML=svg;v.labels=labels;v.apply()}

/* dibujar una zona rectangular sobre el visor de capPlan: cb(pts planos, vista) */
function capDraw(host,cb){host._drawCb=cb||null;host.classList.toggle('drawing',!!cb);if(host._dw)return;host._dw=1;let st=null,rect=null;
  const W=e=>host._v.toWorld(e.clientX,e.clientY);
  host.addEventListener('pointerdown',e=>{if(!host._drawCb||!host._v||e.button>0)return;e.stopPropagation();e.preventDefault();try{host.setPointerCapture(e.pointerId)}catch(er){}st=W(e);
    rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('fill','rgba(31,95,122,.25)');rect.setAttribute('stroke','#1F5F7A');rect.setAttribute('stroke-width','3');rect.setAttribute('vector-effect','non-scaling-stroke');host._v.svg.appendChild(rect)},true);
  host.addEventListener('pointermove',e=>{if(!st||!rect)return;e.stopPropagation();const p=W(e);rect.setAttribute('x',Math.min(st.x,p.x));rect.setAttribute('y',Math.min(st.y,p.y));rect.setAttribute('width',Math.abs(p.x-st.x));rect.setAttribute('height',Math.abs(p.y-st.y))},true);
  const end=e=>{if(!st)return;e.stopPropagation();const p=W(e);const a=st;st=null;if(rect)rect.remove();rect=null;if(e.type!=='pointerup'||Math.abs(p.x-a.x)<3||Math.abs(p.y-a.y)<3)return;const cb=host._drawCb;
    if(cb)cb(flat([{x:a.x,y:a.y},{x:p.x,y:a.y},{x:p.x,y:p.y},{x:a.x,y:p.y}]),host._base||'')};
  host.addEventListener('pointerup',end,true);host.addEventListener('pointercancel',end,true)}
/* zona de una actividad en el plan diario (del día cargado o la última usada) */
/* ambiente que corresponde a un punto del plano: la zona (del día o la última usada) que lo contiene, o la más cercana */

/* =====================================================================
   Sectorización: mapa de ambientes y sectores sobre la lámina base del piso
   Las formas se guardan en el propio ambiente/sector: geo = {vistaId: [x,y,…]} (coordenadas de la lámina base).
   ===================================================================== */
const geoOf=(o,v)=>o&&o.geo&&o.geo[v]&&o.geo[v].length>=6?o.geo[v]:null;
function ambMap(host,o){const bs=basesOf(o.pid);
  if(!lamReady){ensureLam();if(!host._v)host.innerHTML='<div class="kemp">Cargando láminas…</div>';return null}
  if(!bs.length){host.innerHTML=`<div class="kemp">Este piso todavía no tiene lámina base. ${o.canUp?'Súbela con <b>Subir lámina base</b>: la misma lámina se usa en el Plan diario, Campo y Liberaciones.':'La sube el administrador.'}</div>`;host._v=null;host._fk='';return null}
  const base=bs.find(b=>b.id===o.vista)||bs[0];
  let v=host._v;if(!v||!host.contains(v.svg)){host.innerHTML='';host._fk='';v=Viewer(host,{onTap:(w,e)=>{const oo=host._o;if(!oo)return;
      if(oo.draw)return;
      const el=document.elementsFromPoint(e.clientX,e.clientY).map(q=>q.closest&&q.closest('[data-z]')).find(Boolean);
      let hit=el&&el.dataset.z||'';if(!hit){const L=oo.shapes.filter(z=>z.kind==='a').concat(oo.shapes.filter(z=>z.kind==='s'));const z=L.find(z=>pip(w,unflat(z.pts)));hit=z?z.id:''}
      if(oo.onPick)oo.onPick(hit||null,w)}});host._v=v}
  host._o=o;host._base=base.id;if(!host._szev){host._szev=1;ambMapEvents(host)}
  const q=useHi()?'f':'l';const url=IMG.get(base.id+'|'+base.rev+'|'+q)?.url||null;if(!url)imgURL(base,q).then(()=>{if(U.tab==='planos')requestRender()}).catch(()=>{});
  v.set([{key:base.id+'|'+base.rev,url,w:base.w,h:base.h,T:base.T||I,op:.85}]);
  const fk=o.pid+'|'+base.id;if(host._fk!==fk){host._fk=fk;v.bounds=boundsOf({...base,T:base.T||I});v.fitted=0;requestAnimationFrame(()=>{v.fit();v.fitted=1})}
  capDraw(host,o.draw==='rect'&&o.onDrawn?(pts,vista)=>o.onDrawn(pts,vista):null);
  const ptsS=P=>P.map(p=>p.x+','+p.y).join(' ');let svg='';const labels=[];
  for(const z of o.shapes.filter(z=>z.kind==='s')){const P=unflat(z.pts);if(!P.length)continue;
    svg+=`<polygon points="${ptsS(P)}" fill="${z.c}" fill-opacity="${z.sel?.16:.05}" stroke="${z.c}" stroke-width="${z.sel?4:2.5}" stroke-dasharray="10 6" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    const bb=bboxOf(P);labels.push({id:z.id,x:bb.x+bb.w/2,y:bb.y,t:z.label,c:z.c,f:'#fff',cls:'szs'+(z.sel?' sel':'')})}
  for(const z of o.shapes.filter(z=>z.kind==='a')){const P=unflat(z.pts);if(!P.length)continue;
    svg+=`<polygon${o.edit&&z.sel?' data-edit="1"':''} points="${ptsS(P)}" fill="${z.c}" fill-opacity="${z.sel?.6:z.dim?.07:.38}" stroke="${z.sel?'#111':z.dim?z.c+'55':z.c}" stroke-width="${z.sel?2.5:1}" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    const ce=centroid(P),bb=bboxOf(P);labels.push({id:z.id,x:ce.x,y:ce.y,t:z.label,area:bb.w*bb.h,c:z.sel?'#111':z.c,f:'#fff',cls:'sza'+(z.sel?' sel':'')})}
  if(o.tmp&&o.tmp.length){svg+=`<polyline points="${ptsS(o.tmp)}" fill="rgba(31,95,122,.18)" stroke="#1F5F7A" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    o.tmp.forEach((p,i)=>svg+=`<circle cx="${p.x}" cy="${p.y}" r="${i?4:6}" fill="${i?'#1F5F7A':'#fff'}" stroke="#1F5F7A" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`)}
  v.svg.innerHTML=svg;v.labels=labels;v.handles=o.edit&&!o.draw?ambHandles(unflat(o.edit.pts)):[];v.apply();return base}
/* puntos para ajustar la forma: esquinas y, entre ellas, puntos para agregar una esquina */
function ambHandles(P){const H=P.map(p=>({x:p.x,y:p.y}));P.forEach((p,i)=>{const q=P[(i+1)%P.length];H.push({x:(p.x+q.x)/2,y:(p.y+q.y)/2,mid:i,cls:'mid'})});return H}
function ambMapEvents(host){let dn=null,drag=null;const R=v=>Math.round(v*10)/10;
  const paint=P=>{const v=host._v;const el=v.svg.querySelector('[data-edit]');if(el)el.setAttribute('points',P.map(p=>p.x+','+p.y).join(' '));v.handles=ambHandles(P);v.apply()};
  host.addEventListener('pointerdown',e=>{const oo=host._o;if(!oo||e.button>0)return;const h=e.target.closest&&e.target.closest('.pvh');
    if(h&&oo.edit&&!oo.draw){e.stopPropagation();e.preventDefault();try{host.setPointerCapture(e.pointerId)}catch(_){}const P=unflat(oo.edit.pts);const hh=host._v.handles[+h.dataset.h];if(!hh)return;
      if(hh.mid!=null){P.splice(hh.mid+1,0,{x:hh.x,y:hh.y});drag={i:hh.mid+1,P}}else drag={i:+h.dataset.h,P};return}
    if(oo.draw==='poly')dn={x:e.clientX,y:e.clientY}},true);
  host.addEventListener('pointermove',e=>{if(!drag)return;e.stopPropagation();const w=host._v.toWorld(e.clientX,e.clientY);drag.P[drag.i]={x:R(w.x),y:R(w.y)};paint(drag.P)},true);
  const up=e=>{const oo=host._o;if(drag){e.stopPropagation();const P=drag.P;drag=null;if(e.type==='pointerup'&&oo&&oo.onEdit)oo.onEdit(flat(P));else if(oo)paint(unflat(oo.edit.pts));return}
    if(dn&&oo&&oo.draw==='poly'&&e.type==='pointerup'){const d=Math.hypot(e.clientX-dn.x,e.clientY-dn.y);dn=null;if(d>14)return;const v=host._v;const w=v.toWorld(e.clientX,e.clientY);const T=oo.tmp||[];
      /* tocar la primera esquina cierra el polígono */
      if(T.length>=3){const r=host.getBoundingClientRect();const f={x:r.left+v.x+T[0].x*v.z,y:r.top+v.y+T[0].y*v.z};if(Math.hypot(e.clientX-f.x,e.clientY-f.y)<18){if(oo.onPolyClose)oo.onPolyClose();return}}
      if(oo.onPoly)oo.onPoly({x:R(w.x),y:R(w.y)})}};
  host.addEventListener('pointerup',up,true);host.addEventListener('pointercancel',up,true);
  host.addEventListener('dblclick',e=>{const oo=host._o;if(oo&&oo.draw==='poly'&&oo.onPolyClose){e.preventDefault();oo.onPolyClose()}})}
/** acerca el mapa a una forma (al elegirla en la lista) */
function ambFocus(host,pts){const v=host&&host._v;if(!v||!pts)return;const P=unflat(pts);if(!P.length)return;const bb=bboxOf(P);const full=v.bounds;const pad=Math.max(bb.w,bb.h)*.9+40;
  v.bounds={x:bb.x-pad,y:bb.y-pad,w:bb.w+pad*2,h:bb.h+pad*2};v.fit();v.bounds=full}
/** propuesta inicial: el rectángulo que cubre las zonas que ya se dibujaron para las actividades de cada ambiente */
function ambSuggest(pid,vista){return znLoad(pid).then(()=>{const ZM=znKey===pid?ZN:(ZNP.get(pid)||{m:new Map()}).m;const by=new Map();
  const add=(ambId,pts)=>{const P=unflat(pts);if(!P.length||!ambId)return;if(!by.has(ambId))by.set(ambId,[]);by.get(ambId).push(...P)};
  for(const[aid,n]of ZM){if(n.pisoId!==pid||(n.vista||(basesOf(pid)[0]||{}).id||'')!==vista)continue;const x=S.act.get(aid);if(x)add(x.ambId,n.pts)}
  for(const z of PD.values())if(z.kind==='zona'&&z.pisoId===pid&&zVista(z)===vista){const am=z.ambId||(z.actId&&S.act.get(z.actId)||{}).ambId;add(am,z.pts)}
  const out=new Map();for(const[am,P]of by){const b=bboxOf(P);if(b.w>2&&b.h>2)out.set(am,flat([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}]))}return out})}
/* últimas zonas (pzon) de otros pisos, para saber el ambiente de un punto fuera del Plan diario */
const ZNP=new Map();
function znLoad(pid){if(!pid||!db)return Promise.resolve();if(znKey===pid)return Promise.resolve();let e=ZNP.get(pid);if(e)return e.p;
  e={m:new Map()};e.p=fcol('pzon').where('pisoId','==',pid).get().then(sn=>{sn.docs.forEach(d=>e.m.set(d.id,{...d.data(),id:d.id}))}).catch(()=>{ZNP.delete(pid)});ZNP.set(pid,e);return e.p}
function ambAtP(pid,pt){return znLoad(pid).then(()=>ambAt(pid,pt))}
function ambAt(pid,pt){if(!pt)return'';const cand=[];
  /* primero, el mapa de ambientes de Sectorización */
  for(const a of S.amb.values()){const g=geoOf(a,pt.v);if(!g)continue;const sc=S.sec.get(a.sectorId);if(!sc||pisoOfSecObj(sc)!==pid)continue;if(pip(pt,unflat(g)))return a.id}const ZM=znKey===pid?ZN:(ZNP.get(pid)||{m:new Map()}).m;
  for(const z of PD.values())if(z.kind==='zona'&&z.pisoId===pid&&zVista(z)===pt.v){const am=z.ambId||(z.actId&&S.act.get(z.actId)||{}).ambId;if(am)cand.push({am,P:unflat(z.pts)})}
  for(const[aid,n]of ZM)if(n.pisoId===pid&&(n.vista||(basesOf(pid)[0]||{}).id||'')===pt.v){const x=S.act.get(aid);if(x&&x.ambId)cand.push({am:x.ambId,P:unflat(n.pts)})}
  let best='',bd=Infinity;for(const c of cand){if(!c.P.length)continue;if(pip(pt,c.P))return c.am;const ce=centroid(c.P),bb=bboxOf(c.P);const dd=Math.hypot(ce.x-pt.x,ce.y-pt.y);if(dd<Math.max(bb.w,bb.h)*1.2&&dd<bd){bd=dd;best=c.am}}
  return best}
function zoneFor(aid){const z=[...PD.values()].find(q=>q.kind==='zona'&&q.actId===aid);if(z)return{pts:z.pts,vista:zVista(z),pisoId:z.pisoId};const n=ZN.get(aid);return n?{pts:n.pts,vista:n.vista||'',pisoId:n.pisoId}:null}
/* ---------- panel y barra de herramientas ---------- */
const TOOLS=[['pan','✋','Mover','Mover el plano; clic en un dibujo para elegirlo y arrastrarlo (V)'],['zona','▭','Zona','Zona rectangular: arrastra (R)'],['poly','⬠','Polígono','Zona con forma libre: clic en cada esquina (P)'],['flecha','➚','Flecha','Flecha: arrastra del inicio a la punta (F)'],['texto','T','Texto','Texto: clic donde va (T)'],['trazo','✎','Lápiz','Dibujo a mano alzada (L)'],['borrar','⌫','Borrar','Borrador: toca o arrastra sobre lo que quieras borrar, o marca un área (E)']];
const DN=x=>{if(typeof canDaily==='undefined'||!canDaily||M.date>todayIso())return'';const later=(x.days||[]).filter(y=>y>M.date).length;return later&&!(typeof doneOf==='function'&&doneOf(x))?`<button class="ib" data-done="${x.id}" title="Ya se completó: los ${later} día(s) que faltan dejan de contar">✓ Terminada</button>`:''};
function renderPlan(main,cur,base){
  const scs=scsOfDay();const role=myRole();
  if(role==='sc'){const ms=myScs();if(!ms.includes(M.scDraw))M.scDraw=ms[0]||''}else if(M.scDraw&&!canPlan(M.scDraw))M.scDraw='';
  const acts=dayActs(M.piso,M.date);const sh=shapesOf(M.piso);
  const zBy={},nBy={};sh.forEach(z=>{if(z.kind==='zona'&&z.actId)(zBy[z.actId]=zBy[z.actId]||[]).push(z);if(z.kind==='nova')nBy[z.actId]=z});
  const stat=sc=>{const L=acts.filter(o=>o.x.sc===sc);return{n:L.length,ok:L.filter(o=>zBy[o.x.id]).length,no:L.filter(o=>nBy[o.x.id]).length}};
  const NBM=nbMap();const sc=M.scDraw;const mine=acts.filter(o=>o.x.sc===sc);const np=sh.filter(z=>z.kind==='zona'&&!z.actId&&z.sc===sc);const notes=sh.filter(z=>['trazo','flecha','texto'].includes(z.kind)&&z.sc===sc);
  const canD=canPlan(sc);const withPrev=mine.filter(o=>!zBy[o.x.id]&&!nBy[o.x.id]&&ZN.get(o.x.id));
  const st=sc?stat(sc):null;
  /* no cumplidas en días anteriores y aún sin reprogramar (solo al planificar hoy o días futuros) */
  const pendBy={};if(M.date>=todayIso()&&typeof failInfo==='function')for(const x of S.act.values()){const a=S.amb.get(x.ambId);const s_=a&&S.sec.get(a.sectorId);if(!s_||s_.pisoId!==M.piso)continue;const f=failInfo(x,M.date);if(f)(pendBy[x.sc]=pendBy[x.sc]||[]).push({x,a,f})}
  let h=`<div class="mp-h"><b>Plan del día</b><span>${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)} · ${esc(S.pis.get(M.piso)?.code||'')}</span><button class="ab" id="mpx" aria-label="Cerrar panel">&times;</button></div>`;
  if(PHONE()){if(M.tool!=='pan')M.tool='pan';h+=`<p class="mp-ph">En el celular el plano es de consulta: toca una zona para ver su estado${typeof canDaily!=='undefined'&&canDaily?' o marcar ✓ ½ ✗':''}. Para dibujar el plan usa una PC o tablet.</p>`}
  if(M.pdErr)h+=`<div class="callout">No se pudo leer el plan del día (${esc(M.pdErr)}). Si acabas de actualizar la página, faltan las reglas nuevas de Firestore.</div>`;
  /* filtro por subcontratista (el elegido es también con quién se dibuja «solo una parte») */
  {const opts=role==='sc'?myScs():scs;if(opts.length>1||!sc)h+=`<div class="dzf">${role==='sc'?'':`<button class="${!sc?'on':''}" data-dzsc="">Todos</button>`}${opts.map(c=>`<button class="${c===sc?'on':''}" data-dzsc="${c}" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}</div>`;
    else h+=`<div class="mp-sc" style="--c:${conOf(sc).color}"><i></i><b>${esc(conOf(sc).name)}</b></div>`}
  const L=acts.filter(o=>!sc||o.x.sc===sc);const nNo=L.filter(o=>nBy[o.x.id]).length,nSin=L.filter(o=>!nBy[o.x.id]&&!zBy[o.x.id]).length;
  h+=`<div class="mp-prog"><span><b>${L.length-nNo}</b> van${M.date>todayIso()?'':' hoy'}</span>${nNo?`<span class="no">${nNo} no van</span>`:''}${nSin?`<span class="no">${nSin} sin ubicar</span>`:''}${sc?`<label class="chk"><input type="checkbox" id="mscv"${U.pdHi!==false?' checked':''}> Resaltar solo ${esc(conOf(sc).name)}</label>`:''}</div>`;
  try{computeCross()}catch(e){}
  {const cxs=CROSS.list.filter(c=>!sc||c.a.sc===sc||c.b.sc===sc);let ch='';
    if(cxs.length)ch=`<button class="mcxh" data-cxtog="1" aria-expanded="${M.cxOpen?'true':'false'}">⚠ Dos partidas en el mismo lugar <b>${cxs.length}</b><span>${M.cxOpen?'▴':'▾'}</span></button>${M.cxOpen?`<div class="mcxl">`+(ZL_=>cxs.map(c=>{const me_=sc&&c.b.sc===sc?c.b:c.a,o=me_===c.a?c.b:c.a;return`<button class="mp-cx" data-pcx="${me_.id}|${o.id}">${zNoH(me_,ZL_)} <b>${esc(conOf(me_.sc).name)}</b>: ${esc(zoneLabel(me_))} ↔ ${zNoH(o,ZL_)} <b>${esc(conOf(o.sc).name)}</b>: ${esc(zoneLabel(o))}<small>Toca para ir · clic derecho sobre el cruce para decidir</small></button>`}).join(''))(NBZ())+'</div>':''}`;
    const cb=$('#mcxb');if(cb){if(cb.dataset.h!==ch){cb.innerHTML=ch;cb.dataset.h=ch}cb.hidden=!ch||!!M.meet}}
  const dcan=dzCan;let lastS='';
  h+=`<div class="mp-list dzl">${L.map(({x,a,s})=>{const zs=zBy[x.id],nv=nBy[x.id];const can=dcan(x);const geoOk=a.geo&&Object.values(a.geo).some(g=>g&&g.length>=6);
      let hh='';if(s.id!==lastS){lastS=s.id;hh=`<div class="dzs">${esc(s.code)} · ${esc(s.name)}</div>`}
      return hh+`<div class="mp-it dz ${nv?'nv':zs?'ok':''}" data-act="${x.id}" style="--c:${conOf(x.sc).color}"><div class="t"><span class="mono">${esc(a.code)}</span> ${esc(x.name)}<small>${esc(conOf(x.sc).name)} · ${esc(a.name)}${hasQ(x)?` · ${fq((x.qty||{})[M.date])} ${esc(x.und||'')}`:''}</small>${(typeof restrPend==='function'?restrPend(x.id):[]).map(r=>`<div class="rsk">⚠ Restricción pendiente · ${esc(rTxt(r))}</div>`).join('')}</div>
       <div class="s">${nv?`<span class="pill no">No va · ${esc(nv.motivo||'')}${nv.repTo?' · → '+fmtD(nv.repTo):''}</span>${can?`<button class="lnkb" data-undo="${nv.id}">Vuelve a ir</button>`:''}`
        :`${nbHtml(NBM,x.id)}${can?`<span class="dzb"><button class="dzk on" tabindex="-1" title="Va según el lookahead">✓ Va</button><button class="dzk" data-dz="man|${x.id}" title="No va este día: pasa al siguiente día hábil">→ Mañana</button>${typeof canDaily!=='undefined'&&canDaily?`<button class="dzk" data-dz="fin|${x.id}" title="Ya se terminó: se liberan los días que faltan">✔ Terminada</button>`:''}<button class="dzk" data-dz="res|${x.id}" title="No va por una restricción: queda registrada en Restricciones">⛔ Restricción</button></span>`:''}
          <span class="dzu">${zs?(zs[0].virt?`<button class="lnkb" data-see="${zs[0].id}">en su ambiente</button>`:`<span class="pill ok">zona dibujada</span><button class="lnkb" data-see="${zs[0].id}">Ver</button>`):geoOk?'':`<span class="mu">Ambiente sin ubicar</span>${canWrite?`<button class="lnkb" data-goszamb="${a.id}">Ubicarlo en Sectorización</button>`:''}`}${canPlan(x.sc)?`<button class="lnkb" data-put="${x.id}" title="Si solo ocupa una parte del ambiente o abarca varios">${zs&&!zs[0].virt?'Dibujar otra vez':'Solo una parte…'}</button>`:''}</span>`}</div></div>`}).join('')||`<div class="note" style="padding:8px 2px">${sc?esc(conOf(sc).name)+' no tiene':'No hay'} actividades programadas este día en este piso.</div>`}</div>`;
  if(canWrite||role==='sc')h+=`<button class="ib mp-all" id="dzadd" title="Agregar al día una actividad del lookahead que no estaba programada">+ Programar otra actividad este día</button>`;
  if(M.dzlog&&M.dzlog.d===M.date+'|'+M.piso&&M.dzlog.L.length)h+=`<div class="mp-sec">Cambios de este plan</div>${M.dzlog.L.map(t=>`<div class="mp-it"><div class="t">${esc(t)}</div></div>`).join('')}`;
  {const pr=sc?(pendBy[sc]||[]):Object.values(pendBy).flat();
    if(pr.length){h+=`<div class="mp-sec">No cumplidas sin reprogramar (${pr.length})</div><div class="mp-list">${pr.sort((p,q)=>q.f.d.localeCompare(p.f.d)).map(({x,a,f})=>{const sal=repSaldo(x,f.d);
      return`<div class="mp-it rp"><div class="t"><span class="mono">${esc(a.code)}</span> ${esc(x.name)}<small>${esc(conOf(x.sc).name)} · ${f.r.status==='partial'?'½ Parcial':'✗ No cumplido'} el ${DOWN_[(pd(f.d).getUTCDay()+6)%7].toLowerCase()} ${fmtD(f.d)}${f.r.cnc?' · '+esc(f.r.cnc):''}${sal!=null?` · saldo ${fq(sal)} ${esc(x.und||'')}`:''}</small></div>
       <div class="s">${canWrite?`<button class="ib pri" data-rep="${x.id}|${f.d}">Programar ${fmtD(M.date)}</button><button class="ib" data-repd="${x.id}|${f.d}">Otro día…</button><button class="ib" data-repe="${x.id}|${f.d}" title="Se hizo otro día aunque no estaba programada">✓ Ya se ejecutó…</button><button class="lnkb" data-repx="${x.id}|${f.d}" title="Ya no hace falta reprogramarla">Descartar</button>`:'<span class="mu">Pide al planificador que la reprograme</span>'}</div></div>`}).join('')}</div>`}}
  {const np=sh.filter(z=>z.kind==='zona'&&!z.actId&&(!sc||z.sc===sc));if(np.length||canD)h+=`<div class="mp-sec">Trabajo no programado (planificado)</div>${np.map(z=>`<div class="mp-it np"><div class="t">${esc(z.desc||'')}<small>${esc(conOf(z.sc).name)}</small></div><div class="s"><button class="lnkb" data-see="${z.id}">Ver</button>${own(z)?`<button class="lnkb" data-delz="${z.id}">Quitar</button>`:''}</div></div>`).join('')}${canD?'<button class="lnkb" id="mnp">+ Agregar trabajo no programado</button>':''}`}
  {const sn=npSeenHtml('mp-it');if(sn)h+=`<div class="mp-sec">Visto en obra · no programado</div>${sn}`}
  if(sc&&notes.length)h+=`<div class="mp-sec">Notas y dibujos</div><div class="note">${notes.length} en el plano. Selecciónalos con ✋ para moverlos o borrarlos.</div>`;
  const pn=$('#mpanel');if(pn.dataset.h!==h){pn.innerHTML=h;pn.dataset.h=h}pn.hidden=!M.panel||!!M.meet;
  const tb=$('#mtools');const aligned=curAligned(cur,base);const sel=M.selId&&zget(M.selId);
  const th=`${TOOLS.map(([k,i,n,t])=>`<button class="mt${M.tool===k?' on':''}${k==='borrar'?' er':''}" data-tool="${k}" title="${t}" aria-label="${t}"${k!=='pan'&&(!canD||(!aligned&&k!=='borrar'))?' disabled':''}><span>${i}</span><small>${n}</small></button>`).join('')}<span class="mtsep"></span><button class="mt" id="mundo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"${HIST.length?'':' disabled'}><span>↶</span><small>Deshacer</small></button><button class="mt" id="mredo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer"${REDO.length?'':' disabled'}><span>↷</span><small>Rehacer</small></button>`;
  if(tb.dataset.h!==th){tb.innerHTML=th;tb.dataset.h=th}tb.hidden=!base||!!M.meet;
  const hint=M.pend?(M.pend.actId?`Dibuja la zona de <b>${esc(short(S.act.get(M.pend.actId)?.name||'',40))}</b>: arrastra un rectángulo, o elige ⬠ para un polígono. <button class="lnkb" id="mcancel">Cancelar</button>`:`Dibuja dónde irá el trabajo no programado. <button class="lnkb" id="mcancel">Cancelar</button>`)
    :M.tool==='poly'?'Clic en cada esquina · clic en el primer punto, doble clic o Enter para cerrar · Esc cancela':M.tool==='zona'?'Arrastra para dibujar la zona; luego eliges la actividad':''
  ;const sz=(cur)=>`<span class="mseg">${FS.map(f=>`<button data-fs="${f}" class="${cur===f?'on':''}" style="font-size:${Math.min(f,20)}px">A</button>`).join('')}</span>`;
  const gw=(cur,attr)=>`<span class="mseg">${[[1,'Fino'],[2,'Medio'],[3,'Grueso']].map(([k,n])=>`<button data-${attr}="${k}" class="${cur===k?'on':''}"><i class="gl g${k}"></i>${n}</button>`).join('')}</span>`;
  let props='';const selOwn=own(sel)&&M.tool==='pan';
  if(M.tool==='texto'&&!M.pend)props=`<b>Texto</b> Tamaño ${sz(M.fs)}<span class="mu">Clic en el plano donde va el texto</span>`;
  else if((M.tool==='flecha'||M.tool==='trazo')&&!M.pend)props=`<b>${M.tool==='flecha'?'Flecha':'Lápiz'}</b> Grosor ${gw(M.lw,'lw')}`;
  else if(M.tool==='borrar')props=`<b>Borrador</b><span class="mseg"><button data-em="touch" class="${M.eraseMode==='touch'?'on':''}">Tocar / arrastrar</button><button data-em="area" class="${M.eraseMode==='area'?'on':''}">Área</button></span><span class="mseg"><button data-ew="all" class="${M.eraseWhat==='all'?'on':''}">Todo</button><button data-ew="notas" class="${M.eraseWhat==='notas'?'on':''}">Solo notas</button></span><button class="ib" id="merall">Borrar todo lo de hoy…</button><span class="mu">Solo borra lo de ${esc(conOf(M.scDraw).name||'')}. Ctrl+Z deshace.</span>`;
  else if(selOwn&&sel.kind==='texto')props=`<b>Texto</b><span class="mseg"><button data-fsd="-1" title="Más pequeño">A−</button><button disabled id="mfsv" style="min-width:58px">${sel.fs||18} px</button><button data-fsd="1" title="Más grande">A+</button></span>${sz(sel.fs||18)}<button class="ib" id="medtx">Editar texto</button><button class="ib" id="mdupl">Duplicar</button><button class="ib danger" id="mdel">Eliminar</button><span class="mu">Arrástralo para moverlo; tira de las esquinas para cambiar el tamaño</span>`;
  else if(selOwn&&(sel.kind==='flecha'||sel.kind==='trazo'))props=`<b>${sel.kind==='flecha'?'Flecha':'Trazo'}</b> Grosor ${gw(sel.w||2,'slw')}<button class="ib" id="mdupl">Duplicar</button><button class="ib danger" id="mdel">Eliminar</button>`;
  else if(selOwn&&sel.kind==='zona')props=`<b>${esc(zoneLabel(sel))}</b>${campoProps(sel)}<button class="ib" id="mrelink">Cambiar actividad</button><button class="ib danger" id="mdel">Eliminar</button>${sel.actId?'':'<span class="mu">Arrástrala para moverla; mueve las esquinas para ajustarla</span>'}`;
  else if(sel&&sel.kind!=='nova')props=`<b>${esc(sel.kind==='zona'?zoneLabel(sel):'Dibujo')}</b>${campoProps(sel)}<span class="mu">De ${esc(conOf(sel.sc).name)}${sel.kind==='zona'?'':' · '+esc(sel.byName||'')}</span>`;
  const pb=$('#mprops');if(pb.dataset.h!==props){pb.innerHTML=props;pb.dataset.h=props}pb.hidden=!props||!!M.meet;$('#mhint').style.top=props?'64px':'';
  $('#mstage').classList.toggle('draw',M.tool!=='pan');
  const hn=$('#mhint');if(hn.dataset.h!==hint){hn.innerHTML=hint;hn.dataset.h=hint}hn.hidden=!hint||!!M.meet;
  renderMeet();drawOverlay();renderLeg();if(ZC){if(U.tab!=='mapa'||(!M.meet&&M.colorBy!=='cu'))zcClose();else zcRender()}}
const hasQ=x=>x&&x.metrado>0&&(x.qty||{})[M.date]!=null;
const fq=v=>(Math.round((+v||0)*100)/100).toLocaleString('es-PE');
/* ---------- decidir el plan del día: va / mañana / terminada / restricción ---------- */
const dzCan=x=>!!x&&!PHONE()&&((typeof canWrite!=='undefined'&&canWrite)||(myRole()==='sc'&&myScs().includes(x.sc)));
function dzLog(t){const k=M.date+'|'+M.piso;if(!M.dzlog||M.dzlog.d!==k)M.dzlog={d:k,L:[]};M.dzlog.L.unshift(t);M.dzlog.L=M.dzlog.L.slice(0,12)}
/* el ingeniero cambia el lookahead; el subcontratista lo deja como propuesta (se envía desde el Lookahead) */
function dzWrite(x,after,label){if(typeof canWrite!=='undefined'&&canWrite){apply([op('acts',x.id,after)],label);return true}
  if(myRole()!=='sc'||typeof savePropItem!=='function')return false;if(typeof ensureProp==='function')ensureProp();
  const c=a=>{const o={...a};delete o.id;delete o._del;return o};savePropItem(x.sc,x.id,{after:c(after),base:c(x)});
  toast(label+' · quedó como propuesta: envíala desde el Lookahead para que el ingeniero la apruebe');return true}
function dzShift(x,from,cascade){const to=wshift(from,1);const map=d=>cascade?(d>=from?wshift(d,1):d):(d===from?to:d);
  const days=[...new Set((x.days||[]).map(map))].sort();const qty={};for(const[d,v]of Object.entries(x.qty||{})){const k=map(d);qty[k]=(qty[k]||0)+(+v||0)}return{...x,days,qty}}
function dzMove(btn,x){const from=M.date;const to=wshift(from,1);
  if(from<=todayIso()&&typeof canWrite!=='undefined'&&canWrite){novaDialog(btn,x,{title:'No va: pasa a otro día'});return}
  openPop(btn,`<div class="ph">${esc(short(x.name,40))}: no va el ${fmtD(from)}</div><div class="ptx">Pasa al siguiente día hábil (${DOWN_[(pd(to).getUTCDay()+6)%7].toLowerCase()} ${fmtD(to)}) en el lookahead.</div>
    <button data-do="one" class="pri">Solo este día → ${fmtD(to)}</button><button data-do="all">Este día y lo que sigue (todo un día hábil después)</button>`,
    {one:()=>{if(dzWrite(x,dzShift(x,from,false),`“${short(x.name,40)}” pasa al ${fmtD(to)}`))dzLog(`→ ${x.name} pasa al ${fmtD(to)}`)},
     all:()=>{if(dzWrite(x,dzShift(x,from,true),`“${short(x.name,40)}” y lo que sigue, un día hábil después`))dzLog(`→ ${x.name} y lo que sigue, un día después`)}})}
function dzFin(x){if(typeof canDaily==='undefined'||!canDaily)return;const d=M.date>todayIso()?todayIso():M.date;
  if(!confirm(`¿“${x.name}” ya está terminada${d===todayIso()?' hoy':' el '+fmtD(d)}? Se liberan los días que le quedan en el lookahead.`))return;markDone(x.id,d);dzLog(`✔ ${x.name} terminada`)}
function dzRes(btn,x){const types=P().restrTypes||[];
  openPop(btn,`<div class="ph">Restricción · ${esc(short(x.name,40))}</div><div class="ptx">No va el ${fmtD(M.date)}. La restricción queda en <b>Restricciones</b>, amarrada a esta actividad.</div>
    <div class="qrow"><select id="dzrt" aria-label="Tipo">${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div>
    <div class="qrow"><input id="dzrd" placeholder="¿Qué falta?" style="width:240px;text-align:left" aria-label="Descripción"></div>
    <div class="qrow"><input id="dzrr" value="${esc(conOf(x.sc).name)}" placeholder="Responsable" style="width:150px;text-align:left" aria-label="Responsable"><input type="date" id="dzrn" value="${M.date}" aria-label="Para cuándo"></div>
    <button data-do="ok" class="pri">Guardar · no va</button>`,
    {ok:()=>{const desc=($('#dzrd')||{}).value?.trim()||'';if(!desc){toast('Escribe qué falta.');return}const rid=uid('res');
      apply([op('restr',rid,{id:rid,actId:x.id,pisoId:pisoOfAct(x.id),type:($('#dzrt')||{}).value||'',desc,resp:($('#dzrr')||{}).value||'',need:($('#dzrn')||{}).value||M.date,freed:'',status:'pend',created:todayIso(),sc:x.sc,by:me.email,byName:me.name||''})],'Restricción creada');
      const id=uid('pz');rec([addDoc(id,{date:M.date,pisoId:M.piso,sc:x.sc,kind:'nova',actId:x.id,ambId:x.ambId,motivo:'Restricción: '+desc,repTo:'',by:me.email,byName:me.name||me.email,ts:NOW()})]);dzLog(`⛔ ${x.name}: ${desc}`);requestRender()}});
  setTimeout(()=>{const i=$('#dzrd');if(i)i.focus()},0)}
/* programar en este día una actividad del lookahead que no estaba programada */
function dzAdd(btn){const sc=M.scDraw;const mine=myRole()==='sc'?myScs():null;
  const L=[];for(const x of S.act.values()){if(schedOn(x,M.date))continue;if(typeof doneOf==='function'&&doneOf(x))continue;if(sc&&x.sc!==sc)continue;if(mine&&!mine.includes(x.sc))continue;const a=S.amb.get(x.ambId);const s_=a&&S.sec.get(a.sectorId);if(!s_||s_.pisoId!==M.piso)continue;L.push({x,a,s:s_})}
  L.sort((p,q)=>(p.s.order||0)-(q.s.order||0)||(p.a.order||0)-(q.a.order||0)||(p.x.order||0)-(q.x.order||0));
  if(!L.length){toast('No hay otras actividades de este piso para programar.');return}
  const h={};const nx=x=>{const n=(x.days||[]).filter(d=>d>M.date).sort()[0];return n?' · prog. '+fmtD(n):''};
  const btns=L.slice(0,200).map((o,i)=>{h['a'+i]=()=>{const after={...o.x,days:[...new Set([...(o.x.days||[]),M.date])].sort()};if(dzWrite(o.x,after,`“${short(o.x.name,40)}” programada para el ${fmtD(M.date)}`))dzLog(`+ ${o.x.name} programada`)};
    return`<button data-do="a${i}" data-q="${esc((o.a.code+' '+o.a.name+' '+o.x.name+' '+conOf(o.x.sc).name).toLowerCase())}"><b>${esc(o.a.code)}</b> ${esc(short(o.x.name,34))} <kbd>${esc(conOf(o.x.sc).name)}${nx(o.x)}</kbd></button>`}).join('');
  openPop(btn,`<div class="ph">Programar el ${fmtD(M.date)}</div><div class="qrow"><input id="dzq" placeholder="Buscar ambiente o actividad" style="width:260px;text-align:left" aria-label="Buscar"></div><div class="dzpl">${btns}</div>`,h);
  setTimeout(()=>{const i=$('#dzq');if(i){i.focus();i.oninput=()=>{const q=i.value.trim().toLowerCase();$$('#pop .dzpl [data-q]').forEach(b=>b.hidden=!!q&&!b.dataset.q.includes(q))}}},0)}
function planClick(e){const t=e.target;const g=(sel)=>t.closest(sel);let b;
  if((b=g('[data-dzsc]'))){M.scDraw=b.dataset.dzsc;if(M.scView&&M.scView!==M.scDraw)M.scView='';requestRender();return true}
  if((b=g('[data-dz]'))){const[k,id]=b.dataset.dz.split('|');const x=S.act.get(id);if(!x||!dzCan(x))return true;if(k==='man')dzMove(b,x);else if(k==='fin')dzFin(x);else if(k==='res')dzRes(b,x);return true}
  if(t.id==='dzadd'){dzAdd(t);return true}
  if((b=g('[data-goszamb]'))){if(typeof szGoAmb==='function')szGoAmb(b.dataset.goszamb);return true}
  if(t.id==='mpan'||t.id==='mpx'){M.panel=!M.panel;requestRender();return true}
  if((b=g('[data-mdd]'))){zcClose();const v=+b.dataset.mdd;if(v===0&&typeof AUTO_OFF!=='undefined')AUTO_OFF=true;M.date=v===0?todayIso():addD(M.date,v);if(pd(M.date).getUTCDay()===0)M.date=addD(M.date,v||1);M.selId=null;HIST.length=0;REDO.length=0;M.tmp=null;M.pend=null;if(typeof daySet==='function')daySet(M.date);ensurePlan();requestRender();return true}
  if((b=g('[data-tool]'))){M.tool=b.dataset.tool;M.tmp=null;if(M.tool==='pan')M.pend=M.pend;requestRender();return true}
  if(t.id==='mdel'){delSel();return true}
  if(t.closest('#mundo')){undo();return true}
  if((b=g('[data-cb]'))){M.colorBy=b.dataset.cb;requestRender();return true}
  if((b=g('[data-rst]'))){const z=zget(M.selId);const k=b.dataset.rst;if(z){if(k==='ok')setRec(z,'ok');else{const h={};const cnc=P().cnc||[];openPop(b,`<div class="ph">${STT[k]} · ¿causa?</div>${cnc.map((c,i)=>{h['c'+i]=()=>setRec(z,k,c);return`<button data-do="c${i}" title="${esc(cncTip(c))}">${esc(cncLabel(c))}</button>`}).join('')}<hr><button data-do="sin">Registrar sin causa</button>`,{...h,sin:()=>setRec(z,k,'')})}}return true}if(t.closest('#mredo')){redo();return true}
  if((b=g('[data-fs]'))){const f=+b.dataset.fs;const z=M.selId&&zget(M.selId);if(M.tool==='pan'&&own(z)&&z.kind==='texto'){rec([updDoc(z.id,{fs:f},{fs:z.fs||18})])}else M.fs=f;requestRender();return true}
  if((b=g('[data-fsd]'))){const z=zget(M.selId);if(own(z)&&z.kind==='texto'){const f0=z.fs||18;const f=Math.max(8,Math.min(160,Math.round(f0*(+b.dataset.fsd>0?1.15:1/1.15))));rec([updDoc(z.id,{fs:f},{fs:f0})]);requestRender()}return true}
  if((b=g('[data-lw]'))){M.lw=+b.dataset.lw;requestRender();return true}
  if((b=g('[data-slw]'))){const z=zget(M.selId);if(own(z))rec([updDoc(z.id,{w:+b.dataset.slw},{w:z.w||2})]);requestRender();return true}
  if((b=g('[data-em]'))){M.eraseMode=b.dataset.em;requestRender();return true}
  if((b=g('[data-ew]'))){M.eraseWhat=b.dataset.ew;requestRender();return true}
  if(t.id==='medtx'){const z=zget(M.selId);if(own(z)){const r=t.getBoundingClientRect();textDialog(null,r.left,r.top,z)}return true}
  if(t.id==='mdupl'){const z=zget(M.selId);if(own(z)){const off=30/(M.view?.z||1);const id=uid('pz');const doc={...strip_(z),pts:flat(unflat(z.pts).map(p=>({x:p.x+off,y:p.y+off}))),ts:NOW(),by:me.email,byName:me.name||me.email};rec([addDoc(id,doc)]);M.selId=id;requestRender()}return true}
  if(t.id==='mrelink'){const z=zget(M.selId);if(own(z)){const r=t.getBoundingClientRect();linkChooser(unflat(z.pts),r.left,r.top,l=>{const x=l.actId?S.act.get(l.actId):null;const patch={actId:l.actId||null,ambId:x?x.ambId:null,desc:l.desc||'',fuera:!l.actId};rec([updDoc(z.id,patch,{actId:z.actId,ambId:z.ambId,desc:z.desc||'',fuera:!!z.fuera})]);learn(PD.get(z.id));requestRender();toast('Actividad cambiada','Deshacer',undo)})}return true}
  if(t.id==='merall'){const r=t.getBoundingClientRect();const mineAll=shapesOf(M.piso).filter(z=>own(z)&&(myRole()==='sc'||z.sc===M.scDraw));const notas=mineAll.filter(z=>z.kind!=='zona');
    openPop(t,`<div class="ph">Borrar lo de ${esc(conOf(M.scDraw).name)} del ${fmtD(M.date)}</div><button data-do="n"${notas.length?'':' disabled'}>Solo notas y dibujos (${notas.length})</button><button data-do="a" class="danger"${mineAll.length?'':' disabled'}>Todo: zonas, notas y dibujos (${mineAll.length})</button><div class="ptx">Las marcas de “No se hará hoy” se conservan. Puedes deshacerlo con Ctrl+Z.</div>`,
      {n:()=>delIds(notas.map(z=>z.id)),a:()=>delIds(mineAll.map(z=>z.id))});return true}
  if(t.id==='mcancel'){M.pend=null;M.tmp=null;M.tool='pan';requestRender();return true}
  if(t.id==='mscv'){U.pdHi=t.checked;M.scView='';saveUI();requestRender();return true}
  if((b=g('[data-put]'))||(b=g('[data-redo]'))){const id=b.dataset.put||b.dataset.redo;{const x=S.act.get(id);if(x&&canPlan(x.sc))M.scDraw=x.sc}M.pend={actId:id};rskWarn(id);if(!['zona','poly'].includes(M.tool))M.tool='zona';M.selId=null;if(innerWidth<900)M.panel=false;requestRender();return true}
  if((b=g('[data-prev]'))){const zn=ZN.get(b.dataset.prev);if(zn){M.scDraw=S.act.get(b.dataset.prev)?.sc||M.scDraw;newZone(unflat(zn.pts),{actId:b.dataset.prev},zn.vista)}return true}
  if(t.id==='mprev'){const L=dayActs(M.piso,M.date).filter(o=>o.x.sc===M.scDraw);const sh=shapesOf(M.piso);let n=0,nr=0;M.batch=true;for(const o of L){if(sh.some(z=>z.actId===o.x.id))continue;const zn=ZN.get(o.x.id);if(zn){newZone(unflat(zn.pts),{actId:o.x.id},zn.vista);n++;if(rskWarn(o.x.id,true))nr++}}M.batch=false;toast(`${n} zona(s) ubicadas como antes. Ajusta las que cambien hoy.${nr?` ⚠ ${nr} tiene${nr>1?'n':''} restricción pendiente (marcadas con ⛔).`:''}`);return true}
  if((b=g('[data-nova]'))){const x=S.act.get(b.dataset.nova);if(x)novaDialog(b,x);return true}
  if((b=g('[data-undo]'))){revertNova(b.dataset.undo);return true}
  if((b=g('[data-see]'))){const z=zget(b.dataset.see);if(z){const zv=zVista(z);if(zv&&zv!==M.vista){M.vista=zv;M.sel=zv}M.selId=z.id;M.tool='pan';requestRender();setTimeout(()=>zoomTo(unflat(z.pts)),zv!==M.vista?250:0);if(innerWidth<900)M.panel=false}return true}
  if((b=g('[data-delz]'))){delIds([b.dataset.delz],'Trabajo no programado quitado');return true}
  if(t.id==='mnp'){npDialog(t,null);return true}
  if((b=g('[data-rep]'))){const[id,fd]=b.dataset.rep.split('|');reprogAct(id,M.date,fd);return true}
  if((b=g('[data-cxtog]'))){M.cxOpen=!M.cxOpen;requestRender();return true}
  if((b=g('[data-pcx]'))){const ids=b.dataset.pcx.split('|');const P=ids.flatMap(id=>{const z=PD.get(id);return z?unflat(z.pts):[]});zoomTo(P);return true}
  if((b=g('[data-same]'))){const[aid,zid]=b.dataset.same.split('|');const z=zget(zid),x=S.act.get(aid);if(z&&x){M.scDraw=x.sc;newZone(unflat(z.pts),{actId:aid},zVista(z))}return true}
  if((b=g('[data-done]'))){markDone(b.dataset.done,M.date);return true}
  if((b=g('[data-repe]'))){const[id,fd]=b.dataset.repe.split('|');execPop(b,id,fd);return true}
  if((b=g('[data-repx]'))){const[id,fd]=b.dataset.repx.split('|');dismissRep(id,fd);return true}
  if((b=g('[data-repd]'))){const[id,fd]=b.dataset.repd.split('|');const t0=todayIso();openPop(b,`<div class="ph">Reprogramar para…</div><div class="qrow"><input type="date" id="rpdt" min="${t0}" value="${M.date>t0?M.date:t0}"></div><button data-do="ok" class="pri">Reprogramar</button><button data-do="no">Cancelar</button>`,
    {no:()=>{},ok:()=>{const v=($('#rpdt')||{}).value;if(!v){toast('Elige la fecha.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}reprogAct(id,v,fd)}});return true}
  if((b=g('[data-osc]'))){if(canWrite){M.scDraw=b.dataset.osc}else M.scView=M.scView===b.dataset.osc?'':b.dataset.osc;requestRender();return true}
  if((b=g('.pvl[data-z]'))){if(M.tool==='pan'){M.selId=b.dataset.z;requestRender()}return true}
  return false}

/* ---------- menú de la lámina ---------- */
async function doAlign(l){const base=baseOfL(l);if(base&&base.id===l.id)return;if(!base)return;try{M.busy='Cargando imágenes para alinear…';requestRender();const[ru,tu]=await Promise.all([imgURL(base,'f'),imgURL(l,'f')]);M.busy='';requestRender();
  alignDialog({ref:base,refURL:ru,tgt:{w:l.w,h:l.h,url:tu},title:`Alinear ${lname(l)} con ${lname(base)}`,init:l.pts||null,onSave:async(T,pts)=>{await fcol('laminas').doc(l.id).update({T,aligned:true,pts});toast('Lámina alineada. Si quedó mal, usa “Corregir alineación”.')}})}catch(err){M.busy='';requestRender();toast(err.message)}}
function lamMenu(btn,l){const base=baseOfL(l);const specs=lamsOf(l.pisoId).filter(x=>!x.base&&vistaOf(x)===l.id);
  openPop(btn,`<div class="ph">${esc(lname(l))}${l.base?' · plano base':' · '+esc(l.esp)}</div><div class="ptx">${l.w} × ${l.h} px · subida por ${esc(l.byName||l.by||'')}${l.src?' · '+esc(l.src):''}</div>
   ${!l.base&&base?`<button data-do="align">${l.aligned?'Revisar / afinar alineación…':'Alinear con '+esc(lname(base))+'…'}</button>`:''}
   <button data-do="ren">Cambiar nombre / especialidad…</button><button data-do="repl">Reemplazar por nueva revisión…</button>
   ${!l.base?'<button data-do="mkbase">Convertir en plano base propio (otra vista)…</button>':''}
   <hr><button data-do="del" class="danger">Eliminar lámina</button>`,{
   align:()=>doAlign(l),
   repl:()=>uploadDialog(btn,l),
   ren:()=>renameDialog(btn,l),
   mkbase:()=>setTimeout(()=>openPop(btn,`<div class="ph">Convertir “${esc(lname(l))}” en plano base</div><div class="ptx">Pasará a ser una vista propia del piso (por ejemplo, otra fachada), con su propio plan del día. Deja de superponerse sobre ${esc(lname(base))}.</div><button data-do="yes">Sí, convertir en plano base</button><button data-do="no">Cancelar</button>`,
     {no:()=>{},yes:async()=>{try{await fcol('laminas').doc(l.id).update({base:true,baseId:null,T:I,aligned:true});M.vista=l.id;M.sel=l.id;toast('Ahora es un plano base propio')}catch(err){toast('No se pudo cambiar: '+(err.code||err.message))}}}),0),
   del:async()=>{if(l.base&&specs.length){toast(`Es un plano base con ${specs.length} especialidad(es) encima: primero elimínalas, conviértelas en plano base o reemplaza este por una nueva revisión.`);return}
     setTimeout(()=>openPop(btn,`<div class="ph">¿Eliminar la lámina “${esc(lname(l))}”?</div><div class="ptx">Se borra de este piso para todos. No se puede deshacer.${l.base&&basesOf(l.pisoId).length>1?' Lo dibujado sobre esta vista dejará de mostrarse.':''}</div><button data-do="yes" class="danger">Sí, eliminar lámina</button><button data-do="no">Cancelar</button>`,{no:()=>{},
       yes:async()=>{try{await delChunks(l,l.rev);await fcol('laminas').doc(l.id).delete();toast('Lámina eliminada')}catch(err){toast('No se pudo eliminar: '+(err.code||err.message))}}}),0)}})}
function renameDialog(btn,l){const box=document.createElement('div');box.className='mdlg';box.innerHTML=`<div class="mdlgc" role="dialog" aria-modal="true"><h3>Nombre de la lámina</h3>
   <label>Nombre (así aparece en los botones)<input id="rnm" value="${esc(l.name||'')}" placeholder="${esc(l.esp)}" maxlength="60"></label>
   <label>Especialidad<input id="res" list="resps" value="${esc(l.esp)}"><datalist id="resps">${ESPS.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>
   <p class="note">Ejemplos: “Fachada Norte”, “IIEE · Tomacorrientes”, “Arquitectura rev. B”. Si dejas el nombre vacío se muestra la especialidad.</p>
   <div class="mdlgb"><button class="ib" id="rcancel">Cancelar</button><button class="ib pri" id="rok">Guardar</button></div></div>`;
  document.body.appendChild(box);const i=$('#rnm',box);i.focus();i.select();
  $('#rcancel',box).onclick=()=>box.remove();
  const ok=async()=>{const nm=$('#rnm',box).value.trim(),es=$('#res',box).value.trim()||l.esp;try{await fcol('laminas').doc(l.id).update({name:nm,esp:es});box.remove();toast('Nombre guardado')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}};
  $('#rok',box).onclick=ok;box.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok()}if(e.key==='Escape')box.remove()})}
async function delChunks(l,rev){const b=db.batch();for(let i=0;i<(l.nf||0);i++)b.delete(fcol('lamimg').doc(`${l.id}_${rev}_f_${i}`));for(let i=0;i<(l.nl||0);i++)b.delete(fcol('lamimg').doc(`${l.id}_${rev}_l_${i}`));await b.commit()}

/* ---------- subir / reemplazar ---------- */
function uploadDialog(btn,repl,opt){opt=opt||{};const ps=opt.pid?pisos().filter(p=>p.id===opt.pid):pisos();
  const box=document.createElement('div');box.className='mdlg';box.innerHTML=`<div class="mdlgc" role="dialog" aria-modal="true">
   <h3>${repl?'Reemplazar lámina: '+esc(lname(repl)):opt.mode==='base'?'Subir lámina base del piso':opt.mode==='spec'?'Subir especialidad':'Subir lámina'}</h3>
   ${repl?'':`<label>Piso<select id="upiso">${ps.map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label>
   <label id="utw">Tipo<select id="utipo"><option value="spec">Especialidad sobre un plano base</option><option value="base">Plano base nuevo (otra vista: otra fachada, otra zona…)</option></select></label>
   <label id="ubw">Se superpone sobre<select id="ubase"></select></label>
   <label>Nombre (así aparecerá en los botones)<input id="uname" placeholder="Ej.: Fachada Norte, IIEE · Alumbrado" maxlength="60"></label>
   <label>Especialidad<input id="uesp" list="uesps" placeholder="Ej.: Aire acondicionado"><datalist id="uesps">${ESPS.map(x=>`<option value="${esc(x)}">`).join('')}</datalist></label>`}
   <label>Archivo (PDF de AutoCAD, PNG o JPG)<input type="file" id="ufile" accept="application/pdf,image/png,image/jpeg,image/webp"></label>
   <p class="note" id="uinfo"></p>
   <div class="uprog" id="uprog"></div>
   <div class="mdlgb"><button class="ib" id="ucancel">Cancelar</button><button class="ib pri" id="ugo">Procesar</button></div></div>`;
  document.body.appendChild(box);const close=()=>box.remove();
  const info=$('#uinfo',box);
  const sync=()=>{if(repl){info.innerHTML=(repl.base?'Es un plano base: después de procesarlo marcarás puntos para alinearlo con la revisión anterior, así lo ya dibujado sobre el plano no se mueve.':'Después de procesarlo marcarás puntos para alinearlo con su plano base.')+' Súbelo desde una PC con Chrome o Edge.';return}
    const pid=$('#upiso',box).value;const B=basesOf(pid);const tsel=$('#utipo',box);if(!B.length||opt.mode==='base')tsel.value='base';if(opt.mode==='spec')tsel.value='spec';$('#utw',box).hidden=!B.length||!!opt.mode;
    const bsel=$('#ubase',box);const cur=bsel.value||(pid===M.piso?M.vista:'');bsel.innerHTML=B.map(b=>`<option value="${b.id}"${b.id===cur?' selected':''}>${esc(lname(b))}</option>`).join('');
    const isB=tsel.value==='base';$('#ubw',box).hidden=isB||!B.length;const esp=$('#uesp',box);if(isB&&!esp.value)esp.value=B.length?'':'Arquitectura';
    info.innerHTML=(isB?(B.length?'Será <b>otro plano base</b> de este piso, con su propio plan del día (útil para cada fachada o una zona que no entra en la misma lámina). No se alinea con los demás.':'Será el <b>plano base</b> del piso (normalmente la arquitectura). Las demás especialidades se alinean sobre él.'):'Después de procesarla marcarás puntos para alinearla con el plano base elegido.')+' Súbelo desde una PC con Chrome o Edge.'};
  if(!repl){$('#upiso',box).onchange=sync;$('#utipo',box).onchange=sync}sync();
  $('#ucancel',box).onclick=close;
  $('#ugo',box).onclick=async()=>{const f=$('#ufile',box).files[0];if(!f){toast('Elige el archivo.');return}
    const pid=repl?repl.pisoId:$('#upiso',box).value;const esp=repl?repl.esp:($('#uesp',box).value||'').trim();const name=repl?(repl.name||''):($('#uname',box).value||'').trim();
    if(!esp&&!name){toast('Escribe el nombre o la especialidad.');return}
    const B=basesOf(pid);const newBase=!repl&&(!B.length||$('#utipo',box).value==='base');const target=repl?baseOfL(repl):(newBase?null:LAM.get($('#ubase',box).value)||B[0]);
    const prog=$('#uprog',box);const say=t=>{prog.textContent=t};$('#ugo',box).disabled=true;
    if(opt.mode==='spec'&&newBase){toast('La lámina base se sube en Sectorización.');return}
    try{const out=await processFile(f,say);close();
      if(newBase){await saveLam({pisoId:pid,esp:esp||'Plano base',name,base:true,T:I,aligned:true},out);toast(opt.mode==='base'?'Lámina base guardada. Ahora ubica sus sectores y ambientes.':'Plano base guardado');M.piso=pid;if(opt.onBase)opt.onBase(M.vista);requestRender();return}
      const ref=repl&&repl.base?repl:target;M.busy='Cargando la referencia para alinear…';requestRender();const refURL=await imgURL(ref,'f');M.busy='';requestRender();
      const nm=name||esp;
      alignDialog({ref,refURL,tgt:{w:out.w,h:out.h,url:out.fullURL},title:repl?`Alinear la nueva revisión de ${lname(repl)}`:`Alinear ${nm} con ${lname(ref)}`,allowSkip:!(repl&&repl.base),
        onSave:async(T,pts)=>{await saveLam(repl?{...repl,T,aligned:true,pts}:{pisoId:pid,esp:esp||name,name,base:false,baseId:target.id,T,aligned:true,pts},out,repl);toast('Lámina guardada y alineada')},
        onSkip:async()=>{await saveLam(repl?{...repl,aligned:false}:{pisoId:pid,esp:esp||name,name,base:false,baseId:target.id,T:I,aligned:false},out,repl);toast('Lámina guardada sin alinear')}})}
    catch(err){$('#ugo',box).disabled=false;say('');toast(err.message||'No se pudo procesar el archivo.')}}}
async function saveLam(meta,out,repl){const id=repl?repl.id:uid('lam');const rev=repl?(repl.rev||1)+1:1;M.busy='Guardando lámina…';requestRender();
  try{const w=async(q,b64)=>{const n=Math.ceil(b64.length/CHUNK);for(let i=0;i<n;i++){M.busy=`Guardando lámina… ${q==='f'?'alta':'liviana'} ${i+1}/${n}`;requestRender();await fcol('lamimg').doc(`${id}_${rev}_${q}_${i}`).set({d:b64.slice(i*CHUNK,(i+1)*CHUNK)})}return n};
    const nf=await w('f',out.full64),nl=await w('l',out.lite64);
    const doc={pisoId:meta.pisoId,esp:meta.esp,name:meta.name||'',baseId:meta.base?null:(meta.baseId||null),base:!!meta.base,T:meta.T||I,aligned:!!meta.aligned,w:out.w,h:out.h,lw:out.lw,lh:out.lh,fmt:out.fmt,nf,nl,rev,src:out.src,order:meta.order??NOW(),ts:NOW(),by:me.email,byName:me.name||me.email};if(meta.pts)doc.pts=meta.pts;
    await fcol('laminas').doc(id).set(doc);
    IMG.set(id+'|'+rev+'|f',{url:out.fullURL,promise:Promise.resolve(out.fullURL)});
    if(repl)delChunks(repl,repl.rev).catch(()=>{});M.sel=id;M.piso=meta.pisoId;M.lpiso=meta.pisoId;if(U.piso&&U.piso!==meta.pisoId){U.piso=meta.pisoId;const fp=document.getElementById('fpiso');if(fp)fp.value=meta.pisoId}M.vista=meta.base?id:(meta.baseId||M.vista)}
  finally{M.busy='';requestRender()}}

/* ---------- conversión PDF / imagen → WebP (alta + liviana) ---------- */
let pdfP=null;
function loadPdfJs(){if(window.pdfjsLib)return Promise.resolve();if(pdfP)return pdfP;pdfP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PDFJS;s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;ok()};s.onerror=()=>{pdfP=null;ko(new Error('No se pudo cargar el lector de PDF. Revisa tu conexión.'))};document.head.appendChild(s)});return pdfP}
function inkBox(cv){const g=cv.getContext('2d');const{width:w,height:h}=cv;const d=g.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=-1,y1=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(d[i+3]>10&&(d[i]<235||d[i+1]<235||d[i+2]<235)){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
  if(x1<0)return{x:0,y:0,w,h};const m=Math.round(Math.max(w,h)*.01);x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);x1=Math.min(w-1,x1+m);y1=Math.min(h-1,y1+m);return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}}
const tick=()=>new Promise(r=>setTimeout(r,0));
function toBlob(cv,q){return new Promise(ok=>cv.toBlob(b=>ok(b),'image/webp',q))}
async function encode(cv,q){let b=await toBlob(cv,q);if(!b||b.type!=='image/webp'){b=await new Promise(ok=>cv.toBlob(ok,'image/jpeg',.8))}return b}
const b64=blob=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=()=>ko(new Error('No se pudo leer la imagen'));r.readAsDataURL(blob)});
function fitDims(w,h,max,up){let s=max/Math.max(w,h);if(!up)s=Math.min(1,s);if(w*s*h*s>MAXPX)s=Math.sqrt(MAXPX/(w*h));return{w:Math.round(w*s),h:Math.round(h*s),s}}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);return c}
async function processFile(f,say){let full;const isPdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name);
  if(isPdf){say('Cargando lector de PDF…');await loadPdfJs();say('Leyendo PDF…');const pdf=await window.pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;const pg=await pdf.getPage(1);
    const v1=pg.getViewport({scale:1});const ls=1400/Math.max(v1.width,v1.height);const vl=pg.getViewport({scale:ls});const lc=mkCanvas(Math.ceil(vl.width),Math.ceil(vl.height));
    say('Detectando el área del dibujo…');await pg.render({canvasContext:lc.getContext('2d'),viewport:vl}).promise;const bx=inkBox(lc);
    const bw=bx.w/ls,bh=bx.h/ls;let dm=fitDims(bw,bh,FULL,1);let tries=0;
    while(true){full=mkCanvas(dm.w,dm.h);const g=full.getContext('2d');if(g&&full.width===dm.w){break}if(++tries>3)throw new Error('La lámina es demasiado grande para este navegador.');dm=fitDims(bw,bh,Math.round(Math.max(dm.w,dm.h)*.7),1)}
    say(`Dibujando en alta resolución (${dm.w} × ${dm.h} px)… puede tardar unos segundos`);await tick();
    const sc=dm.s;const vf=pg.getViewport({scale:sc});try{await pg.render({canvasContext:full.getContext('2d'),viewport:vf,transform:[1,0,0,1,-bx.x/ls*sc,-bx.y/ls*sc]}).promise}
    catch(e){dm=fitDims(bw,bh,5000,1);full=mkCanvas(dm.w,dm.h);const vf2=pg.getViewport({scale:dm.s});await pg.render({canvasContext:full.getContext('2d'),viewport:vf2,transform:[1,0,0,1,-bx.x/ls*dm.s,-bx.y/ls*dm.s]}).promise}
    try{pdf.destroy()}catch(e){}}
  else{say('Leyendo imagen…');const bmp=await createImageBitmap(f);const lc=mkCanvas(Math.min(1400,bmp.width),Math.round(bmp.height*Math.min(1400,bmp.width)/bmp.width));lc.getContext('2d').drawImage(bmp,0,0,lc.width,lc.height);const k=bmp.width/lc.width;const b=inkBox(lc);
    const bx={x:b.x*k,y:b.y*k,w:b.w*k,h:b.h*k};const dm=fitDims(bx.w,bx.h,FULL);full=mkCanvas(dm.w,dm.h);full.getContext('2d').drawImage(bmp,bx.x,bx.y,bx.w,bx.h,0,0,dm.w,dm.h);bmp.close&&bmp.close()}
  say('Comprimiendo…');await tick();const fb=await encode(full,.72);const ld=fitDims(full.width,full.height,LITE);const lite=mkCanvas(ld.w,ld.h);lite.getContext('2d').drawImage(full,0,0,ld.w,ld.h);const lb=await encode(lite,.7);
  const out={w:full.width,h:full.height,lw:ld.w,lh:ld.h,fmt:fb.type,full64:await b64(fb),lite64:await b64(lb),fullURL:URL.createObjectURL(fb),src:f.name.slice(0,80)};
  full.width=full.height=0;say(`Listo: ${out.w} × ${out.h} px · ${Math.round(fb.size/1024)} KB (alta) + ${Math.round(lb.size/1024)} KB (liviana)`);return out}

/* ---------- alineación con 2 puntos ---------- */
function lsq(P,Q){ // similitud por mínimos cuadrados (2 a 4 pares)
  const n=P.length;if(n<2)return null;let px=0,py=0,qx=0,qy=0;for(let i=0;i<n;i++){px+=P[i].x;py+=P[i].y;qx+=Q[i].x;qy+=Q[i].y}px/=n;py/=n;qx/=n;qy/=n;
  let sr=0,si=0,den=0;for(let i=0;i<n;i++){const ax=P[i].x-px,ay=P[i].y-py,bx=Q[i].x-qx,by=Q[i].y-qy;sr+=bx*ax+by*ay;si+=by*ax-bx*ay;den+=ax*ax+ay*ay}
  if(den<100)return null;const a=sr/den,b=si/den;return{a,b,e:qx-(a*px-b*py),f:qy-(b*px+a*py)}}
function nudged(T,n,c){if(!T)return null;if(!n||(!n.dx&&!n.dy&&!n.r&&!n.s))return T; // ajuste fino alrededor del centro c (coordenadas del plano base)
  const k=(1+(n.s||0)/1000),th=(n.r||0)*Math.PI/180,ca=k*Math.cos(th),sa=k*Math.sin(th);
  const D={a:ca,b:sa,e:c.x-(ca*c.x-sa*c.y)+(n.dx||0),f:c.y-(sa*c.x+ca*c.y)+(n.dy||0)};
  return{a:D.a*T.a-D.b*T.b,b:D.b*T.a+D.a*T.b,e:D.a*T.e-D.b*T.f+D.e,f:D.b*T.e+D.a*T.f+D.f}}
function alignDialog(o){const box=document.createElement('div');box.className='mdlg aln';const NP=4;
  box.innerHTML=`<div class="alnc" role="dialog" aria-modal="true"><div class="alnh"><b>${esc(o.title)}</b>
    <span class="note">Marca el mismo punto en los dos planos: usa <b>cruces de ejes</b> (donde se cortan las líneas de ejes, no el círculo con la letra, que cada plano dibuja en otra posición). Con 2 puntos basta; con 3 o 4 puntos repartidos en las esquinas queda más preciso. Acércate con la rueda del ratón; un clic coloca el punto activo.</span></div>
    <div class="alnt"><span class="seg" id="apt">${[0,1,2,3].map(i=>`<button data-p="${i}"${i===0?' class="on"':''}>Punto ${i+1}</button>`).join('')}</span><button class="ib" id="aclr" title="Borrar el punto activo">Borrar punto</button><button class="ib" id="areset" title="Borrar todos los puntos y el ajuste fino">Empezar de nuevo</button><span id="ast" class="note"></span><span class="sp" style="flex:1"></span>
      <button class="ib" id="aprev" disabled>Vista previa y ajuste fino</button>${o.allowSkip?'<button class="ib" id="askip">Guardar sin alinear</button>':''}<button class="ib" id="acancel">Cancelar</button><button class="ib pri" id="asave" disabled>Guardar</button></div>
    <div class="alnp"><div class="alnpane"><div class="alnlab">Referencia: ${esc(o.ref.esp)}</div><div class="alnv" id="aref"></div></div><div class="alnpane"><div class="alnlab" id="atl">Lámina a alinear</div><div class="alnv" id="atgt"></div></div></div>
    <div class="alnprev" id="aprevw" hidden><div class="alnlab"><span>Vista previa</span><label class="chk" style="font-weight:500">Opacidad <input type="range" id="aop" min="0" max="1" step="0.05" value="0.6" aria-label="Opacidad"></label>
      <span class="afine">Ajuste fino: <button class="ib" data-n="dx:-1" title="Mover a la izquierda (flecha ←; con Shift, 10)">←</button><button class="ib" data-n="dx:1" title="Mover a la derecha (→)">→</button><button class="ib" data-n="dy:-1" title="Mover arriba (↑)">↑</button><button class="ib" data-n="dy:1" title="Mover abajo (↓)">↓</button>
      <button class="ib" data-n="r:-0.02" title="Girar a la izquierda 0,02°">⟲</button><button class="ib" data-n="r:0.02" title="Girar a la derecha 0,02°">⟳</button><button class="ib" data-n="s:-0.5" title="Reducir 0,05 %">−</button><button class="ib" data-n="s:0.5" title="Agrandar 0,05 %">+</button><button class="ib" id="an0" title="Quitar el ajuste fino">Reiniciar</button><span id="anv" class="mu"></span></span></div><div class="alnv" id="apv"></div></div></div>`;
  document.body.appendChild(box);let act=0;const P=[null,null,null,null],Q=[null,null,null,null];let N={dx:0,dy:0,r:0,s:0};
  if(o.init){(o.init.p||[]).forEach((v,i)=>P[i]=v||null);(o.init.q||[]).forEach((v,i)=>Q[i]=v||null);if(o.init.n)N={...N,...o.init.n}}
  const refT=o.ref.T||I;const cW=ap(refT,{x:o.ref.w/2,y:o.ref.h/2});
  const setAct=i=>{act=i;$$('#apt button',box).forEach(b=>b.classList.toggle('on',+b.dataset.p===act))};
  const vr=Viewer($('#aref',box),{onTap:w=>{Q[act]=w;adv()}});vr.set([{key:'r',url:o.refURL,w:o.ref.w,h:o.ref.h,T:I}]);vr.bounds={x:0,y:0,w:o.ref.w,h:o.ref.h};
  const vt=Viewer($('#atgt',box),{onTap:w=>{P[act]=w;adv()}});vt.set([{key:'t',url:o.tgt.url,w:o.tgt.w,h:o.tgt.h,T:I}]);vt.bounds={x:0,y:0,w:o.tgt.w,h:o.tgt.h};
  let T0=null,T=null,vp=null;window.__plano.aln={vr,vt,box};
  function adv(){if(P[act]&&Q[act]){const nx=[0,1,2,3].find(i=>!P[i]||!Q[i]);if(nx!=null&&nx!==act&&(act<1||nx<=act+1))setAct(nx)}upd()}
  function upd(){const mk=(A)=>A.map((q,i)=>q&&{...q,t:String(i+1),cls:i===act?'on':''}).filter(Boolean);vr.marks=mk(Q);vt.marks=mk(P);vr.apply();vt.apply();
    const pairs=[0,1,2,3].filter(i=>P[i]&&Q[i]);T0=pairs.length>=2?lsq(pairs.map(i=>P[i]),pairs.map(i=>ap(refT,Q[i]))):null;T=nudged(T0,N,cW);
    const st=$('#ast',box);
    if(pairs.length<2){const miss=[];for(const i of [0,1]){if(!Q[i])miss.push(`P${i+1} en referencia`);if(!P[i])miss.push(`P${i+1} en lámina`)}st.textContent='Faltan: '+miss.join(', ')}
    else if(!T0)st.textContent='Los puntos están demasiado juntos: sepáralos.';
    else{const s=Math.hypot(T.a,T.b)/Math.hypot(refT.a,refT.b),ang=(Math.atan2(T.b,T.a)-Math.atan2(refT.b,refT.a))*180/Math.PI;
      let txt=`${pairs.length} puntos · escala ${s.toFixed(4)} · giro ${ang.toFixed(2)}°`;
      if(pairs.length>2){const ks=Math.hypot(refT.a,refT.b);const err=pairs.map(i=>{const a=ap(T0,P[i]),b=ap(refT,Q[i]);return Math.hypot(a.x-b.x,a.y-b.y)/ks});const mx=Math.max(...err);const w=err.indexOf(mx);txt+=` · diferencia máx. ${mx.toFixed(0)} px (punto ${pairs[w]+1})${mx>25?' — revisa ese punto':''}`}
      if(Math.abs(ang)>5)txt+=' — el giro es grande, revisa los puntos';st.textContent=txt}
    $('#aprev',box).disabled=!T;$('#asave',box).disabled=!T;$('#anv',box).textContent=(N.dx||N.dy||N.r||N.s)?`(${N.dx} px, ${N.dy} px, ${N.r.toFixed(2)}°, ${(N.s/10).toFixed(2)} %)`:'';if(vp&&T)showPrev()}
  function showPrev(){$('#aprevw',box).hidden=false;box.classList.add('pv-on');if(!vp){vp=Viewer($('#apv',box));}
    const b=boundsOf({w:o.ref.w,h:o.ref.h,T:refT});vp.bounds=b;vp.set([{key:'r',url:o.refURL,w:o.ref.w,h:o.ref.h,T:refT},{key:'t',url:o.tgt.url,w:o.tgt.w,h:o.tgt.h,T,op:+$('#aop',box).value,blend:'multiply'}]);if(!vp.fitted){requestAnimationFrame(()=>{vp.fit();vp.fitted=1})}else vp.apply()}
  const nud=(k,v)=>{N[k]=Math.round((N[k]+v)*1000)/1000;upd()};
  box.addEventListener('click',e=>{const b=e.target.closest('[data-n]');if(b){const[k,v]=b.dataset.n.split(':');nud(k,+v*(e.shiftKey?10:1))}});
  box.addEventListener('keydown',e=>{if(!vp||$('#aprevw',box).hidden||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='range')return;const m=e.shiftKey?10:1;
    const k={ArrowLeft:['dx',-m],ArrowRight:['dx',m],ArrowUp:['dy',-m],ArrowDown:['dy',m]}[e.key];if(k){e.preventDefault();nud(k[0],k[1])}});
  box.tabIndex=-1;box.focus();
  $('#an0',box).onclick=()=>{N={dx:0,dy:0,r:0,s:0};upd()};
  $('#apt',box).onclick=e=>{const b=e.target.closest('button');if(!b)return;setAct(+b.dataset.p);upd()};
  $('#aclr',box).onclick=()=>{P[act]=null;Q[act]=null;upd()};
  $('#areset',box).onclick=()=>{for(let i=0;i<NP;i++){P[i]=null;Q[i]=null}N={dx:0,dy:0,r:0,s:0};setAct(0);$('#aprevw',box).hidden=true;box.classList.remove('pv-on');upd();vr.fit();vt.fit()};
  $('#aprev',box).onclick=()=>{if(T){showPrev();box.focus()}};$('#aop',box).oninput=()=>{if(vp&&T)showPrev()};
  $('#acancel',box).onclick=()=>box.remove();
  const sk=$('#askip',box);if(sk)sk.onclick=async()=>{sk.disabled=true;try{await o.onSkip();box.remove()}catch(err){sk.disabled=false;toast('No se pudo guardar: '+(err.code||err.message))}};
  $('#asave',box).onclick=async()=>{if(!T)return;const b=$('#asave',box);b.disabled=true;b.textContent='Guardando…';try{await o.onSave(T,{p:P,q:Q,n:N});box.remove()}catch(err){b.disabled=false;b.textContent='Guardar';toast('No se pudo guardar: '+(err.code||err.message))}};
  requestAnimationFrame(()=>{vr.fit();vt.fit();upd();if(T)showPrev()})}

window.renderMapaImpl=renderMapa;
window.__plano={fromPts,ap,LAM,M,processFile,capInit,capPlan,capDraw,zoneFor,ambAt,ambAtP,znLoad,ambMap,ambFocus,ambSuggest,basesOf,lamUpload:uploadDialog,nums:capNums,novaSet,zonedSet,crossOf,zcClose};
})();
