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
/* especialidad de la lámina: id de la lista única de Configuración (especialidades.js); los textos antiguos se muestran tal cual */
const EN=v=>typeof espN==='function'?espN(v):String(v||'');
const ESPO=sel=>typeof espList==='function'&&espList().length?espOpts(sel):'<option value="">—</option>'+ESPS.map(x=>`<option value="${esc(x)}"${x===sel?' selected':''}>${esc(x)}</option>`).join('')+(sel&&!ESPS.includes(sel)?`<option value="${esc(sel)}" selected>${esc(sel)}</option>`:'');
const espPickL=async(sel,prev)=>{if(sel.value==='__new'&&typeof espPick==='function')await espPick(sel,prev)};
const LAM=new Map();let lamSub=null,lamErr=null,lamReady=false;
const IMG=new Map(); // key id|rev|q -> {url,promise}
/* subcontratista resaltado en el plano: el elegido en el panel (por defecto sí; se recuerda) o el que se tocó en la leyenda */
const scSel_=()=>M.scDraw?[M.scDraw,...(M.scX||[]).filter(c=>c!==M.scDraw)]:[];
const scVis=()=>M.scView||(U.pdHi!==false?scSel_().join(','):'');
/** ¿el subcontratista sc está en el filtro fv? (fv puede tener varios, separados por coma: Ctrl+clic) */
const scIn=(fv,sc)=>!fv||String(fv).split(',').includes(sc);
const M={vista:'',piso:'',sel:'',under:true,op:0.7,hi:null,view:null,busy:'',date:null,tool:'pan',scDraw:'',scView:'',selId:null,pend:null,tmp:null,panel:null};

/* ---------- datos ---------- */
function ensureLam(){if(lamSub||!db)return;
  lamSub=fcol('laminas').onSnapshot(sn=>{LAM.clear();sn.docs.forEach(d=>LAM.set(d.id,{...d.data(),id:d.id}));imgPrune();lamErr=null;lamReady=true;if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()},
    err=>{lamErr=err&&err.code||'error';lamReady=true;if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()});
  unsubs.push(()=>{if(lamSub)lamSub();lamSub=null;LAM.clear();lamReady=false;IMG.forEach(v=>{if(v.url)URL.revokeObjectURL(v.url)});IMG.clear();M.view=null})}
const lamsOf=pid=>[...LAM.values()].filter(l=>l.pisoId===pid&&!l.arch).sort((a,b)=>(b.base?1:0)-(a.base?1:0)||(a.order||0)-(b.order||0)||EN(a.esp).localeCompare(EN(b.esp)));
const basesOf=pid=>lamsOf(pid).filter(l=>l.base);
const baseOf=pid=>{const B=basesOf(pid);return(pid===M.piso&&B.find(b=>b.id===M.vista))||B[0]};
const baseOfL=l=>!l?null:l.base?l:(l.baseId&&LAM.get(l.baseId))||basesOf(l.pisoId)[0];
const vistaOf=l=>{const b=baseOfL(l);return b?b.id:''};
const lname=l=>l?(l.name||EN(l.esp)||''):'';
const zVista=z=>z.vista||(basesOf(z.pisoId)[0]||{}).id||'';
function useHi(){return M.hi!=null?M.hi:!(matchMedia('(pointer:coarse)').matches||innerWidth<900)}
/* (auditoría de código 08/10, P7) las partes de la imagen se descargan a la vez; si falla, se recuerda la falla y no se reintenta en cada
   dibujo: espera 15 s, 30 s y luego 60 s (o hasta que vuelva la conexión). err.lpsFirst dice si es la primera falla (para avisar una sola vez).
   o.auto: lo pide el dibujo (respeta la espera); sin él (exportar, alinear) se reintenta al momento. */
const IMGF=new Map(); // key -> {n,until,err}
const IMG_BACK=[15000,30000,60000];
const imgRetry=()=>{if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()};
window.addEventListener('online',()=>{if(!IMGF.size)return;IMGF.clear();imgRetry()});
async function imgURL(l,q,o){q=q||(useHi()?'f':'l');const k=l.id+'|'+l.rev+'|'+q;let e=IMG.get(k);if(e)return e.promise;
  const fl=IMGF.get(k);if(fl&&o&&o.auto&&performance.now()<fl.until){const er=new Error(fl.err.message);er.code=fl.err.code;er.lpsFirst=false;throw er}
  e={url:null};e.promise=(async()=>{const ck=`/__lam/${l.id}_${l.rev}_${q}`;let cache=null;try{cache=await caches.open('lps-laminas');const hit=await cache.match(ck);if(hit){e.url=URL.createObjectURL(await hit.blob());return e.url}}catch(err){cache=null}
    const n=q==='f'?l.nf:l.nl;
    const parts=await Promise.all(Array.from({length:n},(_,i)=>fcol('lamimg').doc(`${l.id}_${l.rev}_${q}_${i}`).get().then(d=>{if(!d.exists)throw new Error('Falta una parte de la imagen');return d.data().d})));
    const bin=atob(parts.join(''));const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const blob=new Blob([u8],{type:l.fmt||'image/webp'});if(cache)cache.put(ck,new Response(blob,{headers:{'Content-Type':blob.type}})).catch(()=>{});
    e.url=URL.createObjectURL(blob);return e.url})();
  e.promise.then(()=>IMGF.delete(k),err=>{IMG.delete(k);const f0=IMGF.get(k);const nf=(f0?f0.n:0)+1;const wait=IMG_BACK[Math.min(nf,IMG_BACK.length)-1];
    IMGF.set(k,{n:nf,until:performance.now()+wait,err:{message:(err&&err.message)||'error',code:err&&err.code}});if(err&&typeof err==='object')err.lpsFirst=!f0;setTimeout(imgRetry,wait+50)});
  IMG.set(k,e);return e.promise}
/* al cambiar la revisión de una lámina se sueltan las imágenes de revisiones anteriores (auditoría de código 08/10, P7) */
function imgPrune(){for(const[k,v]of IMG){const[id,rv]=k.split('|');const l=LAM.get(id);if(l&&+rv<+(l.rev||0)){if(v.url)URL.revokeObjectURL(v.url);IMG.delete(k)}}}

/* ---------- transformaciones (similitud: escala + giro + desplazamiento) ---------- */
const I={a:1,b:0,e:0,f:0};
const ap=(T,p)=>({x:T.a*p.x-T.b*p.y+T.e,y:T.b*p.x+T.a*p.y+T.f});
function fromPts(P1,P2,Q1,Q2){const dx=P2.x-P1.x,dy=P2.y-P1.y,qx=Q2.x-Q1.x,qy=Q2.y-Q1.y;const den=dx*dx+dy*dy;if(den<1)return null;
  const a=(qx*dx+qy*dy)/den,b=(qy*dx-qx*dy)/den;return{a,b,e:Q1.x-(a*P1.x-b*P1.y),f:Q1.y-(b*P1.x+a*P1.y)}}
const cssM=T=>`matrix(${T.a},${T.b},${-T.b},${T.a},${T.e},${T.f})`;

/* ---------- visor con zoom / desplazamiento (ratón, rueda y dos dedos) ---------- */
function Viewer(host,opt){opt=opt||{};const v={host,z:1,x:0,y:0,layers:[],marks:[],onTap:opt.onTap||null,bounds:null};
  host.classList.add('pv');host.innerHTML='<div class="pvw"><svg class="pvs" xmlns="http://www.w3.org/2000/svg"></svg></div><div class="pvmk"></div><div class="pvlb"></div>';const W=host.firstChild,MK=host.children[1],LB=host.children[2];v.svg=W.firstChild;v.labels=[];v.handles=[];
  /* al solo desplazar (mismas etiquetas y zoom) se mueve la capa de etiquetas con transform, sin volver a armarla */
  v.apply=()=>{W.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.z})`;
    const lb=v._lb;if(lb&&lb.L===v.labels&&lb.H===v.handles&&lb.M===v.marks){if(lb.z===v.z){LB.style.transform=MK.style.transform=`translate(${v.x-lb.x}px,${v.y-lb.y}px)`;return}
      /* pellizco o rueda en curso: se escala la capa de etiquetas ya armada y se vuelven a acomodar una vez al terminar el gesto
         (antes se rehacía el acomodo y el HTML de todas las etiquetas en cada cuadro) (auditoría de código 08/10, P2) */
      if(host.classList.contains('pvmv')){const k=v.z/lb.z;LB.style.transformOrigin=MK.style.transformOrigin='0 0';LB.style.transform=MK.style.transform=`translate(${v.x-lb.x*k}px,${v.y-lb.y*k}px) scale(${k})`;v._lbs=1;return}}
    v._lbs=0;LB.style.transform=MK.style.transform='';v._lb={L:v.labels,z:v.z,H:v.handles,M:v.marks,x:v.x,y:v.y};{const mh=v.marks.map(m=>{const p={x:m.x*v.z+v.x,y:m.y*v.z+v.y};return`<i class="pvm${m.cls?' '+m.cls:''}" style="left:${p.x}px;top:${p.y}px">${esc(m.t||'')}</i>`}).join('');if(MK._h!==mh){MK.innerHTML=mh;MK._h=mh}}
    /* acomodo de etiquetas: se reusa si las etiquetas (id, texto, posición) y el zoom no cambiaron */
    const lk=l=>(l.id||'')+'|'+l.t+'|'+l.x+'|'+l.y+'|'+(l.nb?1:0);const sig=v.z+'#'+v.labels.map(lk).join('~');let PL;
    if(v._pl&&v._pl.sig===sig){const O=v._pl.O;PL=v.labels.map(l=>{const o=O.get(lk(l))||{dx:0,dy:0};return{...l,sx:l.x*v.z,sy:l.y*v.z,dx:o.dx,dy:o.dy}})}
    else{PL=placeLabels(v.labels.map(l=>({...l,sx:l.x*v.z,sy:l.y*v.z})));const O=new Map();PL.forEach(l=>O.set(lk(l),{dx:l.dx,dy:l.dy}));v._pl={sig,O}}
    let ln='';const lh=PL.map(l=>{const x=l.sx+l.dx+v.x,y=l.sy+l.dy+v.y;if(l.dx||l.dy){const x0=l.sx+v.x,y0=l.sy+v.y;ln+=`<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="${l.c||'#333'}" stroke-width="2"/><circle cx="${x0}" cy="${y0}" r="4" fill="${l.c||'#333'}" stroke="#fff" stroke-width="1.5"/>`}
      if(l.nb)return`<span class="pvl nb${l.ring?' '+l.ring:''}${l.np?' np':''}${l.cls?' '+l.cls:''}" data-z="${esc(l.id||'')}" title="${esc(l.tip||'')}" style="left:${x}px;top:${y}px;--c:${l.c||'#333'};color:${l.f||'#fff'}">${esc(l.t)}${l.cq?`<i class="cqt" data-cqt="${esc(l.cqa||'')}" style="--q:${l.cqc}" title="Cuadrilla ${esc(l.cq)}">${esc(l.cq)}</i>`:''}</span>`;
      return`<span class="pvl${l.cls?' '+l.cls:''}" data-z="${esc(l.id||'')}"${l.tip?` title="${esc(l.tip)}"`:''} style="left:${x}px;top:${y}px;--c:${l.c||'#333'};color:${l.f||'#fff'}${l.ang!=null?`;--a:${l.ang}deg`:''}${l.fs?`;font-size:${l.fs}px`:''}">${esc(l.t)}${l.hs?'<b class="tph nw" data-th="1"></b><b class="tph ne" data-th="1"></b><b class="tph sw" data-th="1"></b><b class="tph se" data-th="1"></b>':''}</span>`}).join('');
    /* solo si cambió: reescribir las etiquetas iguales en cada dibujo las hacía parpadear en la tablet */
    const lbh=`<svg class="pvld" xmlns="http://www.w3.org/2000/svg">${ln}</svg>`+lh+v.handles.map((h,i)=>`<b class="pvh${h.cls?' '+h.cls:''}" data-h="${i}" style="left:${h.x*v.z+v.x}px;top:${h.y*v.z+v.y}px"></b>`).join('');if(LB._h!==lbh){LB.innerHTML=lbh;LB._h=lbh}};
  v.fit=()=>{const b=v.bounds;if(!b)return;const r=host.getBoundingClientRect();if(!r.width)return;const ins=v.inset?v.inset():0;const RW=Math.max(200,r.width-ins);const z=Math.min(RW/b.w,r.height/b.h)*.96;v.z=z;v.x=(RW-b.w*z)/2-b.x*z;v.y=(r.height-b.h*z)/2-b.y*z;v.apply()};
  let rafA=0;v.applySoon=()=>{if(rafA)return;rafA=requestAnimationFrame(()=>{rafA=0;v.apply()})};
  v.zoomAt=(k,cx,cy)=>{const nz=Math.min(Math.max(v.z*k,.01),8);k=nz/v.z;v.x=cx-(cx-v.x)*k;v.y=cy-(cy-v.y)*k;v.z=nz;v.applySoon()};
  v.toWorld=(cx,cy)=>{const r=host.getBoundingClientRect();return{x:(cx-r.left-v.x)/v.z,y:(cy-r.top-v.y)/v.z}};
  v.set=(layers)=>{ // [{key,url,w,h,T,op}]
    const want=new Set(layers.map(l=>l.key));[...W.querySelectorAll('img')].forEach(c=>{if(!want.has(c.dataset.k))c.remove()});
    layers.forEach((l,i)=>{let im=W.querySelector(`img[data-k="${CSS.escape(l.key)}"]`);if(!im){im=document.createElement('img');im.dataset.k=l.key;im.draggable=false;im.alt='';W.insertBefore(im,v.svg)}
      if(l.url&&im.getAttribute('src')!==l.url)im.src=l.url;im.style.width=l.w+'px';im.style.height=l.h+'px';im.style.transform=cssM(l.T||I);im.style.opacity=l.op??1;im.style.zIndex=i;im.style.mixBlendMode=l.blend||'normal'})};
  const pts=new Map();let moved=0,start=null,pinch=null;
  /* capa de GPU solo mientras se arrastra o pellizca de verdad (oct 2026): fija, con láminas grandes, agotaba la memoria de la tablet
     y Android dejaba partes de la pantalla en negro o en blanco. Un toque (elegir un ambiente) no la crea: crearla y quitarla
     redibujaba el plano entero y se veía parpadear. */
  let mvT=0;const mvOn=()=>{clearTimeout(mvT);host.classList.add('pvmv')},mvOff=ms=>{clearTimeout(mvT);mvT=setTimeout(()=>{host.classList.remove('pvmv');if(v._lbs)v.apply()},ms)};
  host.addEventListener('pointerdown',e=>{if(e.button>0)return;clearTimeout(mvT);host.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;start={x:e.clientX,y:e.clientY};
    if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:v.z}}});
  host.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===1){moved+=Math.abs(dx)+Math.abs(dy);if(moved>=6&&!host.classList.contains('pvmv'))mvOn();v.x+=dx;v.y+=dy;v.applySoon()}
    else if(pts.size===2&&pinch){if(!host.classList.contains('pvmv'))mvOn();const[a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=host.getBoundingClientRect();moved=99;v.zoomAt((pinch.z*d/pinch.d)/v.z,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);if(pts.get(e.pointerId)===p){} }});
  const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size)mvOff(250);
    if(!pts.size&&moved<6&&v.onTap&&start&&e.type==='pointerup'){const w=v.toWorld(e.clientX,e.clientY);v.onTap(w,e)}};
  host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);
  host.addEventListener('wheel',e=>{e.preventDefault();mvOn();mvOff(300);const r=host.getBoundingClientRect();v.zoomAt(Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)),e.clientX-r.left,e.clientY-r.top)},{passive:false});
  let lw=0,lh=0;new ResizeObserver(()=>{const r=host.getBoundingClientRect();if(!v.fitted&&v.bounds){v.fit();v.fitted=1}else{if(lw&&lh){v.x+=(r.width-lw)/2;v.y+=(r.height-lh)/2}v.apply()}lw=r.width;lh=r.height}).observe(host);
  return v}
function boundsOf(l){const c=[{x:0,y:0},{x:l.w,y:0},{x:0,y:l.h},{x:l.w,y:l.h}].map(p=>ap(l.T||I,p));const xs=c.map(p=>p.x),ys=c.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}

/* ---------- vista principal ---------- */
function renderMapa(main){ensureLam();
  const ps=pisos();if(U.piso)M.piso=U.piso;if(!M.piso||!S.pis.has(M.piso)){const withL=ps.find(p=>lamsOf(p.id).length);M.piso=(withL||ps[0]||{}).id||''}
  if(M.lpiso!==M.piso){if(M.lpiso!=null){M.sel='';M.vista='';M.selId=null;M.tmp=null;M.pend=null;M.rvx=false}M.lpiso=M.piso}
  const L0=lamsOf(M.piso);const BS=basesOf(M.piso);if(!BS.some(b=>b.id===M.vista)){const sl=LAM.get(M.sel);M.vista=(sl&&sl.pisoId===M.piso&&vistaOf(sl))||(BS[0]||{}).id||''}
  const base=(LAM.get(M.vista)||{}).pisoId===M.piso?LAM.get(M.vista):null;const L=base?L0.filter(l=>vistaOf(l)===base.id):L0;if(!L.some(l=>l.id===M.sel))M.sel=(base||L[0]||{}).id||'';const cur=LAM.get(M.sel);
  {const sd=typeof curDay==='function'?curDay():todayIso();if(!M.date)M.date=sd;else if(M.date!==sd&&pd(sd).getUTCDay()!==0){zcClose();M.date=sd;M.selId=null;M.tmp=null;M.pend=null}}ensurePlan();hSync();if(typeof ensureDaily==='function')ensureDaily(addD(M.date,-11));pmSync();
  if(!main.dataset.built){main.innerHTML=`<div class="view mapa"><div class="bar" id="mbar"></div><div class="mnote" id="mnote"></div><div class="mbody"><aside class="mpanel" id="mpanel"></aside><div class="mwrap"><div class="mstage" id="mstage"></div><div class="mtools" id="mtools"></div><div class="mhint" id="mhint"></div><div class="mprops" id="mprops" hidden></div><div class="mmbar" id="mmbar" hidden></div><aside class="mcard" id="mcard" hidden></aside><div class="mrs" id="mrs"><aside class="mpdb" id="mpdb" hidden></aside><aside class="mfzb" id="mfzb" hidden></aside><aside class="mcxb" id="mcxb" hidden></aside><aside class="mchb" id="mchb" hidden></aside></div><div class="mcqb" id="mcqb" hidden></div><div class="mlgd" id="mleg" hidden></div><div class="mcleg" id="mcleg" hidden></div><div class="mempty" id="mempty"></div></div></div></div>`;main.dataset.built='1';main.addEventListener('toggle',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('mrdy'))M.rdyOpen=t.open},true);M.view=null;M.vpiso=null;if(M.panel==null)M.panel=innerWidth>=900}
  const bar=$('#mbar');
  const today=todayIso();const dw=DOWN_[(pd(M.date).getUTCDay()+6)%7];
  const hb=`<button class="ib${M.panel?' on':''}" id="mpan" title="Mostrar u ocultar el plan del día">Plan del día</button><span class="dnav"><button class="ib" data-mdd="-1" aria-label="Día anterior">&#8249;</button><b>${dw} ${fmtD(M.date)}</b><button class="ib" data-mdd="1" aria-label="Día siguiente">&#8250;</button>${M.date!==today?'<button class="ib" data-mdd="0">Hoy</button>':''}</span>${U.piso?'':`<select id="mpiso" aria-label="Piso">${ps.map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>`}
    ${BS.length>1?`<span class="mvis" title="Planos base de este piso (vistas)">${BS.map(b=>`<button class="mvb${b.id===M.vista?' on':''}" data-vis="${b.id}">${esc(lname(b))}</button>`).join('')}</span>`:''}
    <span class="mchips">${L.map(l=>`<button class="mchip${l.id===M.sel?' on':''}" data-lsel="${l.id}" title="${esc(EN(l.esp))} · doble clic para cambiar el nombre">${l.base?'<b>BASE</b> ':''}${esc(lname(l))}${!l.base&&!l.aligned?' <span class="warn">sin alinear</span>':''}</button>`).join('')||'<span class="note">Este piso aún no tiene láminas.</span>'}</span>
    ${cur&&!cur.base&&base?`<label class="chk"><input type="checkbox" id="munder"${M.under?' checked':''}> Arquitectura debajo</label><input type="range" id="mop" min="0.15" max="1" step="0.05" value="${M.op}" aria-label="Opacidad de la especialidad" title="Opacidad de la especialidad"${M.under?'':' disabled'}>`:''}
    <span class="sp" style="flex:1"></span>
 ${pmEng()?(()=>{const m=pmode();let n=0;try{computeCross();n=CROSS.list.length}catch(err){}return`<span class="mseg mpm" role="group" aria-label="Qué haces en el plano"><button data-pm="cu" class="${m==='cu'?'on':''}" title="Ver lo registrado en Campo. Clic derecho sobre una actividad: su cumplimiento">✓ Cumplimiento</button><button data-pm="prog" class="${m==='prog'?'on':''}" title="Clic derecho sobre una actividad: Va · No va · Culminado; sobre un ambiente: ＋ trabajo no programado">✏️ Programar</button><button data-pm="cx" class="${m==='cx'?'on':''}" title="Ver los cruces entre partidas. Clic derecho sobre un ambiente: revisar sus interferencias">⚠ Interferencias${n?` <b class="mpmn">${n}</b>`:''}</button></span>`})():''}
    <button class="ib pri" id="mmeetb" title="Proyectar el plan del día en la reunión">Modo reunión</button><button class="ib" id="mview" title="Etiquetas, plano de fondo y leyenda">Vista ▾</button><button class="ib" id="mpdf" title="Plan de trabajo de obra (PDF / Excel), detalle del piso o imagen"${DRPROG?' disabled':''}>${DRPROG?esc(DRPROG):'Exportar…'}</button><button class="ib" id="mfit" title="Encuadrar todo el plano en la pantalla">Ver todo</button><button class="ib" id="mhi" title="Calidad de imagen">${useHi()?'Alta resolución':'Resolución liviana'}</button>
    ${isAdmin&&cur&&!cur.base&&base?`<button class="ib" id="malign2">${cur.aligned?'Corregir alineación':'Alinear'}</button>`:''}${isAdmin?`<button class="ib pri" id="mup" title="Capas de especialidad sobre la lámina base. La lámina base del piso se sube en Sectorización.">Subir especialidad…</button>${cur?`<button class="ib" id="mmenu" title="Cambiar nombre, alinear, reemplazar o eliminar la lámina seleccionada">&#8943; Editar lámina</button>`:''}`:''}`;
  if(bar.dataset.h!==hb){bar.innerHTML=hb;bar.dataset.h=hb}
  const note=$('#mnote');const nh=lamErr?`<div class="callout">No se pudieron leer las láminas (${esc(lamErr)}). Si acabas de actualizar la página, falta publicar las reglas nuevas de Firestore (LEEME).</div>`:M.busy?`<div class="callout">${esc(M.busy)}</div>`:(cur&&!cur.base&&!cur.aligned&&base)?`<div class="callout warnc"><b>${esc(cur.esp)} aún no está alineada con la arquitectura</b>: por eso no coincide al superponerla. ${isAdmin?'<button class="ib pri" id="malign">Alinear ahora</button>':'Pide al administrador que la alinee.'}</div>`:'';
  if(note.dataset.h!==nh){note.innerHTML=nh;note.dataset.h=nh}
  const empty=$('#mempty');const eh=!lamReady?'Cargando láminas…':!L.length?`<div class="empty">${isAdmin||(typeof canWrite!=='undefined'&&canWrite)?'Este piso aún no tiene lámina base. Se sube en <b>Sectorización</b>, donde además se ubican sus sectores y ambientes. <button class="ib pri" data-gosz="1">Ir a Sectorización</button>':'Aún no hay láminas para este piso.'}</div>`:'';
  empty.innerHTML=eh;empty.hidden=!eh;
  if(!M.view){M.view=Viewer($('#mstage'),{onTap:tapSelect});
    /* clic derecho sobre un cruce: decidir (sin interferencia / prioridad) */
    $('#mstage').addEventListener('contextmenu',e=>{if(!M.view||M.tool!=='pan')return;e.preventDefault();const w=M.view.toWorld(e.clientX,e.clientY);if(M.meet){const c=crossAt(w);if(c&&cxVis()){zcClose();crossPop(anchorAt(e.clientX,e.clientY),c);return}}tapSelect(w,e,true)});installDraw(M.view);M.view.inset=()=>{const l=$('#mleg');if(l&&l.closest('.mrs.dock'))return 0;return l&&!l.hidden&&!l.classList.contains('col')&&innerWidth>=900?l.offsetWidth+16:0}}
  const layers=[];const lay=(l,op,key)=>({key:key||l.id,l,w:l.w,h:l.h,T:l.T||I,op});
  if(cur){if(!cur.base&&base&&M.under){layers.push(lay(base,M.bop,'base'));layers.push({...lay(cur,M.op),blend:'multiply'})}else layers.push(lay(cur,cur.base?M.bop:1))}
  M.view.bounds=base?boundsOf({...base,T:base.T||I}):cur?boundsOf(cur):null;
  const pk=M.piso+'|'+(base?base.id+base.rev:'');if(M.vpiso!==pk){M.vpiso=pk;M.view.fitted=0;requestAnimationFrame(()=>{if(M.view){M.view.fit();M.view.fitted=1}})}
  M.view.set(layers.map(x=>({key:x.key+'|'+x.l.rev,url:IMG.get(x.l.id+'|'+x.l.rev+'|'+(useHi()?'f':'l'))?.url||null,w:x.w,h:x.h,T:x.T,op:x.op,blend:x.blend})));M.view.apply();
  renderPlan(main,cur,base);
  layers.forEach(x=>{const k=x.l.id+'|'+x.l.rev+'|'+(useHi()?'f':'l');if(!IMG.get(k)?.url)imgURL(x.l,null,{auto:true}).then(imgRetry).catch(err=>{if(err&&err.lpsFirst!==false)toast('No se pudo cargar la lámina: '+(err.code||err.message)+'. Se reintenta solo.')})});
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
  main.addEventListener('change',e=>{if(e.target.id==='mcuex'){M.cuEx=e.target.checked;requestRender();return}if(e.target.id==='mmpiso'){const v=e.target.value;if(U.piso){U.piso=v;saveUI()}M.piso=v;M.sel='';M.vista='';M.selId=null;M.tmp=null;M.pend=null;M.meetSc='';zcClose();requestRender();return}
    if(e.target.id==='mmvis'){M.vista=e.target.value;M.sel=M.vista;requestRender();setTimeout(()=>meetGo(M.meetSc),200)}});
}

/* =====================================================================
   ETAPA 2 · Plan del día sobre el plano (zonas vinculadas al lookahead)
   pdz/{id}: {date,pisoId,sc,kind:'zona'|'nova'|'trazo'|'flecha'|'texto',pts:[x,y,…],actId,ambId,desc,fuera,motivo,t,by,byName,ts}
   pzon/{actId}: última zona usada por la actividad {pisoId,pts,ts}
   ===================================================================== */
const DOWN_=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const PD=new Map(),ZN=new Map();let PDV=0;/* sube con cada cambio del plan del día (para cachés) */let pdKey=null,znSub=null,znKey=null,planHook=false;M.pdErr=null;
/* Campo, Tablero y Liberaciones usan el plan de hoy (capInit) y el Plan diario abre en el día siguiente: cada ida y vuelta
   volvía a suscribirse a pdz. Ahora quedan suscritas las dos últimas fechas (PDS: fecha → {m, un, ok, err}) y al volver
   se repone PD con lo que ya llegó, sin otra suscripción. */
const PDS=new Map();
const pdRR=()=>{if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()};
function ensurePlan(){if(!db)return;
  if(pdKey!==M.date){const d=pdKey=M.date;PDV++;let e=PDS.get(d);
    if(e){PDS.delete(d);PDS.set(d,e)}
    else{e={m:new Map(),un:null,ok:false,err:null};PDS.set(d,e);
      e.un=fcol('pdz').where('date','==',d).onSnapshot(sn=>{e.m.clear();sn.docs.forEach(x=>e.m.set(x.id,{...x.data(),id:x.id}));e.ok=true;e.err=null;
          if(pdKey!==d)return;PDV++;PD.clear();for(const[k,v]of e.m)PD.set(k,v);M.pdErr=null;pdRR()},
        err=>{e.err=err&&err.code||'error';if(pdKey!==d)return;M.pdErr=e.err;pdRR()});
      while(PDS.size>2){const k=PDS.keys().next().value;const o=PDS.get(k);PDS.delete(k);if(o.un)o.un()}}
    PD.clear();for(const[k,v]of e.m)PD.set(k,v);M.pdErr=e.err}
  if(znKey!==M.piso){if(znSub)znSub();znKey=M.piso;ZN.clear();if(M.piso)znSub=fcol('pzon').where('pisoId','==',M.piso).onSnapshot(sn=>{ZN.clear();sn.docs.forEach(d=>ZN.set(d.id,{...d.data(),id:d.id}));if(U.tab==='mapa'||U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()},()=>{})}
  if(!planHook){planHook=true;unsubs.push(()=>{for(const o of PDS.values())if(o.un)o.un();PDS.clear();if(znSub)znSub();znSub=null;pdKey=znKey=null;PD.clear();ZN.clear();planHook=false})}}
const flat=a=>a.flatMap(p=>[Math.round(p.x*10)/10,Math.round(p.y*10)/10]);
const unflat=f=>{const o=[];for(let i=0;i+1<(f||[]).length;i+=2)o.push({x:f[i],y:f[i+1]});return o};
const myRole=()=>me&&me.role;
const PHONE=()=>matchMedia('(max-width:760px)').matches;
const myScs=()=>(me&&me.scs&&me.scs.length?me.scs:(me&&me.sc?[me.sc]:[]));
const canPlan=sc=>!!sc&&!PHONE()&&((canWrite&&(typeof isPisoResp!=='function'||isPisoResp(M.piso)))||(myRole()==='sc'&&myScs().includes(sc)));
const DAC=new Map();
/** actividades programadas de un piso en un día (memo: cambia con los datos o con lo terminado) */
function dayActs(pid,d){const k=pid+'|'+d+'|'+DV+'|'+(typeof DONEV!=='undefined'?DONEV:0);const c=DAC.get(k);if(c)return c;if(DAC.size>30)DAC.clear();const L=dayActs_(pid,d);DAC.set(k,L);return L}
function dayActs_(pid,d){const out=[];for(const x of S.act.values()){if(!schedOn(x,d))continue;const a=S.amb.get(x.ambId);if(!a)continue;const s=S.sec.get(a.sectorId);if(!s||s.pisoId!==pid)continue;out.push({x,a,s})}
  return out.sort((p,q)=>(p.s.order||0)-(q.s.order||0)||(p.a.order||0)-(q.a.order||0)||(p.x.order||0)-(q.x.order||0))}
/* Ubicación automática: cada actividad programada del día toma la forma de su ambiente (Sectorización), salvo que
   ese día tenga una zona propia dibujada («solo una parte») o esté marcada como que no va. No se guarda: se calcula. */
const VZ=new Map();let VZK='';const VZC=new Map();
function virtZones(pid){const d=M.date;const k=d+'|'+pid;let c=VZC.get(k);const dv=(typeof DV!=='undefined'?DV:0)+'|'+(typeof DONEV!=='undefined'?DONEV:0)+'|'+LAM.size+'|'+basesOf(pid).map(b=>b.id).join();if(c&&c.dv===dv)return c.L;
  const L=[];for(const{x,a}of dayActs(pid,d)){const g=a.geo||{};const B=basesOf(pid);const v=(B.find(b=>g[b.id]&&g[b.id].length>=6)||{}).id;if(!v)continue;
    const z={id:'v:'+x.id,kind:'zona',virt:true,date:d,pisoId:pid,vista:v,sc:x.sc,actId:x.id,ambId:x.ambId,pts:g[v],desc:'',by:'',byName:'',ts:0};L.push(z);VZ.set(z.id,z)}
  VZC.set(k,{dv,L});if(VZC.size>40)VZC.delete(VZC.keys().next().value);return L}
const zget=id=>PD.get(id)||VZ.get(id);
/* lo agregado al plan desde el ambiente (padd, aún sin publicar) se resalta en su ambiente mientras no tenga áreas dibujadas */
function paVirt(pid,real){const drawn=new Set(real.filter(z=>z.kind==='zona'&&z.paId).map(z=>z.paId));const B=basesOf(pid);const L=[];
  for(const p of PD.values()){if(p.kind!=='padd'||!p.draft||p.st==='rej'||p.pisoId!==pid||p.date!==M.date||drawn.has(p.id))continue;const a=S.amb.get(p.ambId);const g=(a&&a.geo)||{};const v=(B.find(b=>g[b.id]&&g[b.id].length>=6)||{}).id;if(!v)continue;
    const z={id:'v:pa:'+p.id,kind:'zona',virt:true,date:M.date,pisoId:pid,vista:v,sc:p.sc,actId:null,paId:p.id,ambId:p.ambId,pts:g[v],desc:'＋ '+(p.name||''),fuera:false,by:'',byName:'',ts:0};L.push(z);VZ.set(z.id,z)}
  return L}
/** actividades que no van ese día: «nova» (real o borrador) y, en un borrador, el tren que también sale de ese día */
const NGC={k:'',S:null};
function noGoSet(){const k=M.date+'|'+PDV+'|'+DV+'|'+(typeof DONEV!=='undefined'?DONEV:0);if(NGC.k===k)return NGC.S;const S_=new Set();
  for(const z of PD.values()){if(z.kind!=='nova'||z.date!==M.date)continue;if(z.actId)S_.add(z.actId);if(z.draft)for(const id of (z.ids||[])){const y=S.act.get(id);if(y&&schedOn(y,z.date))S_.add(id)}}
  NGC.k=k;NGC.S=S_;return S_}
const SHC=new Map();
const shapesOf=pid=>{const k=pid+'|'+M.date+'|'+PDV+'|'+DV+'|'+(typeof DONEV!=='undefined'?DONEV:0)+'|'+LAM.size;const c=SHC.get(pid);if(c&&c.k===k)return c.L;
  const ng=noGoSet();const off=z=>{const y=S.act.get(z.actId);return!!y&&!schedOn(y,M.date)&&!(typeof recReal==='function'&&recReal(M.date,z.actId))};
  const real=[...PD.values()].filter(z=>z.pisoId===pid&&z.kind!=='dprop'&&z.kind!=='aviso'&&z.kind!=='pub'&&z.kind!=='padd'&&!(z.kind==='zona'&&z.actId&&(ng.has(z.actId)||off(z))));
  const has=new Set(real.filter(z=>z.actId&&(z.kind==='zona'||z.kind==='nova')).map(z=>z.actId));ng.forEach(id=>has.add(id));
  const L=real.concat(virtZones(pid).filter(z=>!has.has(z.actId)),paVirt(pid,real));if(SHC.size>25)SHC.clear();SHC.set(pid,{k,L});return L};
function scsOfDay(){const set=new Set(dayActs(M.piso,M.date).map(o=>o.x.sc));shapesOf(M.piso).forEach(z=>set.add(z.sc));return[...set].filter(Boolean).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))}
function centroid(P){let x=0,y=0;P.forEach(p=>{x+=p.x;y+=p.y});return{x:x/P.length,y:y/P.length}}
function bboxOf(P){const xs=P.map(p=>p.x),ys=P.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
const short=(t,n)=>t.length>n?t.slice(0,n-1)+'…':t;
function zoneLabel(z){if(z.kind!=='zona')return'';if(z.actId){const x=S.act.get(z.actId);const a=x&&S.amb.get(x.ambId);return`${a?a.code+' ':''}${short(x?x.name:'(actividad eliminada)',26)}`}return'NO PROG. · '+short(z.desc||'',24)}
function curAligned(cur,base){return !cur||cur.base||cur.aligned||!base}
/* cambios campo por campo (p. ej. 'asg.<actId>'): dos equipos del mismo SC no se pisan el reparto */
let DELS_=null;const delS=()=>DELS_||(DELS_=firebase.firestore.FieldValue.delete());
function pdPatch(z,p){for(const[k,v]of Object.entries(p)){const i=k.indexOf('.');if(i<0){if(v===DELS_&&v)delete z[k];else z[k]=v;continue}const a=k.slice(0,i),b=k.slice(i+1);const m={...(z[a]||{})};if(v===DELS_&&v)delete m[b];else m[b]=v;z[a]=m}}
async function savePD(id,doc){try{await fcol('pdz').doc(id).set(doc)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
async function updPD(id,patch){try{await fcol('pdz').doc(id).update(patch)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
async function delPD(id){try{await fcol('pdz').doc(id).delete()}catch(err){toast('No se pudo borrar: '+(err.code||err.message))}}
function learn(z){if(z&&z.kind==='zona'&&z.actId&&z.pts)fcol('pzon').doc(z.actId).set({pisoId:z.pisoId,vista:zVista(z),pts:z.pts,sc:z.sc||'',ts:NOW(),by:me.email}).catch(()=>{})}
const shapesV=pid=>shapesOf(pid).filter(z=>z.kind!=='xok'&&(z.kind==='nova'||zVista(z)===M.vista));
/* historial para deshacer / rehacer (solo lo hecho en esta sesión), uno por día y piso: ir a Campo, al Tablero o a
   Liberaciones (que usan el plan de hoy) y volver al plan de mañana ya no lo borra */
const HSTK=new Map();let HK='',HIST=[],REDO=[];
function hSync(){const k=M.date+'|'+M.piso;if(k===HK)return;HK=k;let o=HSTK.get(k);if(!o){o={h:[],r:[]};HSTK.set(k,o);if(HSTK.size>12)HSTK.delete(HSTK.keys().next().value)}HIST=o.h;REDO=o.r}
function rec(g){hSync();if(g&&g.length){HIST.push(g);if(HIST.length>80)HIST.shift();REDO.length=0}}
const strip_=z=>{const{id,...d}=z;return d};
function addDoc(id,doc){PDV++;PD.set(id,{...doc,id});savePD(id,doc);return{op:'add',id,doc}}
function remDoc(id){const z=PD.get(id);if(!z)return null;PDV++;PD.delete(id);delPD(id);return{op:'del',id,doc:strip_(z)}}
function updDoc(id,patch,before){const z=PD.get(id);if(!z)return null;PDV++;pdPatch(z,patch);updPD(id,patch);return{op:'upd',id,before,after:patch}}
/* deshacer en el plano: si otra persona cambió ese dibujo o decisión después, no se pisa (se avisa) */
const pdGet=(z,k)=>{const i=k.indexOf('.');return i<0?z[k]:(z[k.slice(0,i)]||{})[k.slice(i+1)]};
const pdSame=(a,b)=>canon(a===undefined?null:a)===canon(b===undefined?null:b);
function applyG(g,undo){PDV++;let sk=0;for(const o of (undo?[...g].reverse():g)){
    if(o.op==='add'){if(undo){const c=PD.get(o.id);if(c&&canon(strip_(c))!==canon(o.doc)){sk++;continue}PD.delete(o.id);delPD(o.id)}else{PD.set(o.id,{...o.doc,id:o.id});savePD(o.id,o.doc)}}
    else if(o.op==='del'){if(undo){if(PD.has(o.id)){sk++;continue}PD.set(o.id,{...o.doc,id:o.id});savePD(o.id,o.doc)}else{PD.delete(o.id);delPD(o.id)}}
    else if(o.op==='upd'){const p=undo?o.before:o.after;const z=PD.get(o.id);if(!z||!p||!Object.keys(p).length)continue;
      if(undo&&o.after&&Object.keys(o.after).some(k=>k!=='ts'&&!(o.after[k]===DELS_&&DELS_?pdGet(z,k)==null:pdSame(pdGet(z,k),o.after[k])))){sk++;continue}
      pdPatch(z,p);updPD(o.id,p)}}
  if(M.selId&&!PD.has(M.selId))M.selId=null;requestRender();if(sk)toast(`Deshecho en parte: ${sk} cambio(s) no se revirtieron porque otra persona los modificó después`)}
function undo(){hSync();const g=HIST.pop();if(!g){toast('No hay nada que deshacer.');return}applyG(g,true);REDO.push(g)}
function redo(){hSync();const g=REDO.pop();if(!g)return;applyG(g,false);HIST.push(g)}
const own=z=>!!z&&!z.virt&&z.kind!=='nova'&&z.kind!=='xok'&&canPlan(z.sc);
function rskMsg(aid){if(typeof restrPend!=='function')return'';const rs=restrPend(aid);if(!rs.length)return'';const x=S.act.get(aid);return`⚠ “${(x&&x.name)||'Actividad'}” tiene ${rs.length} restricción${rs.length>1?'es':''} pendiente${rs.length>1?'s':''}: ${rs.slice(0,2).map(rTxt).join(' | ')}${rs.length>2?' …':''}. Se programa igual, queda marcada con alerta.`}
function rskWarn(aid,quiet){const m=rskMsg(aid);if(m&&!quiet)toast(m);return m?1:0}
function zoneAlerts(zid,aid){const msgs=[];const rs=rskMsg(aid);if(rs)msgs.push(rs);try{computeCross()}catch(e){}
  const ZL_=planNumbering(null).zl;const c=CROSS.list.find(c=>c.a.id===zid||c.b.id===zid);if(c){const o=c.a.id===zid?c.b:c.a;msgs.push(`⚠ Superposición con ${conOf(o.sc).name}: ${zNo(o,ZL_)}${zoneLabel(o)}. Revisa el área rayada en rojo.`)}
  const s2=CROSS.seq.find(c=>c.a.id===zid||c.b.id===zid);if(s2){const o=s2.a.id===zid?s2.b:s2.a;msgs.push(`↔ Comparte zona con ${zNo(o,ZL_)}${zoneLabel(o)} (mismo subcontratista: secuencia constructiva, no es interferencia).`)}
  if(msgs.length)toast(msgs.join('  ·  '))}
/** zonas dibujadas a mano (no las de su ambiente) de una actividad en el día del plan */
function drawnOf(aid){return[...PD.values()].filter(z=>z.kind==='zona'&&z.actId===aid&&z.date===M.date&&z.pisoId===M.piso&&own(z))}
function newZone(pts,link,vista,cx,cy){const id=uid('pz');const x=link.actId?S.act.get(link.actId):null;
  const doc={date:M.date,pisoId:M.piso,vista:vista||M.vista,sc:x?x.sc:M.scDraw,kind:'zona',pts:flat(pts),actId:link.actId||null,ambId:x?x.ambId:(link.ambId||null),desc:link.desc||'',fuera:!link.actId&&!link.paId,...(link.paId?{paId:link.paId}:{}),by:me.email,byName:me.name||me.email,ts:NOW()};
  /* «Redibujar»: la zona nueva reemplaza a las que ya tenía la actividad ese día (se deshace junto) */
  const old=link.rep&&link.actId?drawnOf(link.actId).map(z=>remDoc(z.id)).filter(Boolean):[];
  rec([...old,addDoc(id,doc)]);learn(doc);M.selId=id;M.pend=link.paId?link:null;if(M.meet||link.fromPend&&!link.paId){M.tool='pan';M.selId=null}requestRender();if(!M.batch)setTimeout(()=>zoneAlerts(id,link.actId),500);
  /* lo agregado desde el ambiente puede ir en varias áreas: se sigue dibujando hasta «Listo» */
  if(link.paId){M.selId=null;const n=paZones(link.paId).length;if(cx!=null)setTimeout(()=>openPop(anchorAt(cx,cy),`<div class="ph">Área ${n} guardada</div><div class="ptx">${esc(short(link.desc||'',50))}${n>1?` · ${n} áreas`:''}</div><button data-do="ok" class="pri">✓ Listo</button><button data-do="otra">＋ Dibujar otra área</button><button data-do="und">↶ Deshacer esta área</button>`,{ok:paddDone,otra:()=>{},und:()=>undo()}),0);return}
  toast(link.actId?`Zona de “${short(x.name,40)}” guardada`:'Trabajo no programado ubicado','Deshacer',undo)}
function paddDone(){const p=M.pend&&PD.get(M.pend.paId);M.pend=null;M.tmp=null;M.tool='pan';requestRender();if(p)toast(p.st==='pend'?'Propuesta enviada: la decide el ingeniero':`Agregado al plan con ${paZones(p.id).length} área${paZones(p.id).length>1?'s':''}: se aplica al lookahead al publicar`)}
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
/** trabajo no programado planificado: qué se hará y dónde — en un ambiente de la sectorización o dibujándolo */
function npDialog(anchor,pts,onPick){const full=!pts&&!onPick;const B=basesOf(M.piso);
  const ambs=full?[...S.amb.values()].filter(a=>{const s_=S.sec.get(a.sectorId);return s_&&s_.pisoId===M.piso}).sort((p,q)=>{const sp=S.sec.get(p.sectorId),sq=S.sec.get(q.sectorId);return(sp.order||0)-(sq.order||0)||(p.order||0)-(q.order||0)}):[];
  const gv=a=>{const b=B.find(b=>geoOf(a,b.id));return b?{v:b.id,g:geoOf(a,b.id)}:null};
  const scO=full?(canWrite?[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>c.id):myScs()):[];const scSel=scO.includes(M.scDraw)?M.scDraw:(scO.length===1?scO[0]:'');
  openPop(anchor,`<div class="ph">Trabajo no programado</div><div class="qrow" style="padding:0 10px 6px"><input id="npd" placeholder="¿Qué se hará?" style="width:260px;text-align:left" aria-label="Descripción"></div>
    ${full?`<div class="qrow" style="padding:0 10px 6px"><select id="nps" aria-label="Subcontratista" style="width:260px"><option value="">— ¿Quién lo hará? —</option>${scO.map(c=>`<option value="${c}"${c===scSel?' selected':''}>${esc(conOf(c).name)}</option>`).join('')}</select></div>
    <div class="qrow" style="padding:0 10px 8px"><select id="npa" aria-label="Ambiente" style="width:260px"><option value="">✏️ Lo dibujo en el plano</option>${ambs.map(a=>{const g=gv(a);return`<option value="${a.id}"${g?'':' disabled'}>${esc(a.code)} · ${esc(a.name)}${g?'':' (sin ubicar)'}</option>`}).join('')}</select></div>`:''}
    <button data-do="ok" class="pri">${full?'Guardar':'Guardar'}</button><button data-do="no">Cancelar</button>`,
  {ok:()=>{const d=($('#npd')?.value||'').trim();if(!d){toast('Describe el trabajo.');return}if(onPick){onPick({desc:d});return}if(pts){newZone(pts,{desc:d});return}
      const sc=($('#nps')||{}).value||M.scDraw;if(!sc){toast('Elige quién lo hará.');return}M.scDraw=sc;
      const aid=($('#npa')||{}).value;const a=aid&&S.amb.get(aid);const g=a&&gv(a);
      if(g){newZone(unflat(g.g),{desc:d,ambId:a.id},g.v);return}
      M.pend={desc:d};M.tool='zona';toast('Dibuja en el plano dónde se hará.');requestRender()},no:()=>{M.tmp=null;requestRender()}});
  setTimeout(()=>{const i=$('#npd');if(i){i.focus();i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=ok]').click()}})}},0)}
function textDialog(w,cx,cy,z){openPop(anchorAt(cx,cy),`<div class="ph">${z?'Editar texto':'Texto en el plano'}</div><div class="qrow" style="padding:0 10px 8px"><input id="ntx" placeholder="Escribe la nota" value="${z?esc(z.t||''):''}" style="width:240px;text-align:left" aria-label="Texto"></div><button data-do="ok">${z?'Guardar':'Poner texto'}</button>`,
  {ok:()=>{const t=($('#ntx')?.value||'').trim();if(!t)return;if(z){rec([updDoc(z.id,{t},{t:z.t})]);requestRender()}else newNote('texto',[w],t)}});setTimeout(()=>{const i=$('#ntx');if(i){i.focus();i.select();i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=ok]').click()}})}},0)}
function novaDialog(btn,x,opt){opt=opt||{};const cnc=(P().cnc||[]);const t0=todayIso();let def=addD(M.date,1);if(pd(def).getUTCDay()===0)def=addD(def,1);const cw=typeof canWrite!=='undefined'&&canWrite;
  const sug=opt.motivo&&(cnc.find(k=>k===opt.motivo)||cnc.find(k=>/interfer|cruce|frente|otra partida/i.test(k))||cnc.find(k=>cncCode(k)==='PROG'))||opt.motivo||'';const cncL=sug&&!cnc.includes(sug)?[sug,...cnc]:cnc;
  async function save(motivo,rdate){const D0=M.date,P0=M.piso,id=nvId(D0,x.id);
    /* se guarda lo de antes (registro del día y fechas) para que «Vuelve a ir» devuelva exactamente eso */
    const prevRec=typeof recReal==='function'?recReal(D0,x.id):null;
    const doc0={date:D0,pisoId:P0,sc:x.sc,kind:'nova',actId:x.id,ambId:x.ambId,motivo,repTo:rdate||'',...(opt.prio?{prio:opt.prio}:{}),...(opt.prop?{prop:opt.prop.id}:{}),...(dzEng()?{eng:true}:{}),prevRec:prevRec?JSON.parse(JSON.stringify(prevRec)):null,by:me.email,byName:me.name||me.email,ts:NOW()};
    /* dos personas a la vez sobre la misma actividad: solo la primera crea la «no va» (id fijo, en una transacción);
       la otra no reprograma, no registra la restricción ni el día: se le avisa */
    if(!await nvClaim(id,doc0))return;
    const xa=S.act.get(x.id)||x;const x0={days:[...(xa.days||[])],qty:{...(xa.qty||{})}};
    let mv=null;if(rdate&&cw){reprogAct(x.id,rdate,D0);const x1=S.act.get(x.id)||x;mv={[x.id]:{p:x0.days,pq:x0.qty,n:x1.days||[],nq:x1.qty||{}}}}
    const rid=opt.onSave?opt.onSave(id):'';
    const doc={...doc0,...(mv?{mv}:{}),...(rid?{rid}:{})};const g=[addDoc(id,doc)];
    if(opt.prop&&PD.has(opt.prop.id))g.push(updDoc(opt.prop.id,{st:'ok',dec:'No va hoy',decBy:me.email,decN:me.name||me.email,decT:NOW()},{st:'pend',dec:null,decBy:null,decN:null,decT:null}));
    shapesOf(P0).filter(z=>z.kind==='zona'&&z.actId===x.id&&!z.virt).forEach(z=>g.push(remDoc(z.id)));rec(g.filter(Boolean));
    let regd=false;if(typeof canDaily!=='undefined'&&canDaily&&D0<=t0){const cur=recOf(D0,x.id);writeDaily(D0,P0,{recs:{[x.id]:{...baseRec(D0,x,cur),status:'no',cnc:motivo,imp:opt.imp??null,...(opt.rsc?{rsc:opt.rsc,pc:!!opt.pc}:{}),note:(cur&&cur.note)||'No se hará hoy (plan diario)',viaNova:true}}});regd=true}
    requestRender();toast(`No se hará hoy${regd?' · registrada como no cumplida':''}${rdate&&cw?' · reprogramada para el '+fmtD(rdate):''}`,'Deshacer',()=>revertNova(id))}
  openPop(btn,`<div class="ph">${opt.title?esc(opt.title):'No se hará hoy'}</div><div class="ptx">${opt.lead?opt.lead+' ':''}Estaba programada para hoy pero no se va a ejecutar. ${M.date<=t0?'Queda registrada como <b>no cumplida</b> (cuenta en el PPC del día) con el motivo que elijas.':'Quedará anotada en el plan del día.'}</div>
   <div class="qrow"><select id="nvm" aria-label="Motivo">${cncL.map(k=>`<option value="${esc(k)}"${k===sug?' selected':''}>${esc(cncLabel(k))}</option>`).join('')}</select></div>
   ${cw?`<div class="qrow"><label class="mu">Reprogramar para <input type="date" id="nvd" min="${addD(M.date,1)}" value="${def}"></label></div>`:''}
   ${cw?'<button data-do="ok" class="pri">Confirmar y reprogramar</button><button data-do="nod">Confirmar, reprogramo después</button>':'<button data-do="nod" class="pri">Confirmar</button>'}<button data-do="no">Cancelar</button>`,
   {no:()=>{},nod:()=>save(($('#nvm')||{}).value||'',''),ok:()=>{const v=($('#nvd')||{}).value;if(!v){toast('Elige la fecha o usa “reprogramo después”.');return}if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}save(($('#nvm')||{}).value||'',v)}})}
/** «No va hoy»: reserva el id fijo de la «no va» en una transacción. Si ya existe (otra persona la decidió), no escribe y avisa. */
async function nvClaim(id,doc){if(!db)return true;let r;
  try{r=await db.runTransaction(async tx=>{const ref=fcol('pdz').doc(id);if((await tx.get(ref)).exists)return false;tx.set(ref,doc);return true})}
  catch(e){toast('No se pudo guardar: '+(e&&(e.code||e.message)||'error'));return false}
  if(!r){toast('Otro usuario ya decidió esta actividad: revisa');requestRender()}return r}
function revertNova(id){const z=PD.get(id);if(!z)return;if(z.k){if(!dzEng()){toast('Esa decisión la cambia el ingeniero.');return}revertRep(z);return}
  if(z.eng&&!dzEng()){toast('Esa decisión la tomó el ingeniero: él la cambia.');return}
  const o=remDoc(id);if(o)rec([o]);const x=S.act.get(z.actId);if(!x){requestRender();return}let warn='';
  /* registro del día: vuelve el que había antes (o se quita si no había) */
  const rc=typeof recReal==='function'?recReal(z.date,x.id):null;
  if(rc&&rc.viaNova&&typeof canDaily!=='undefined'&&canDaily){const pr=z.prevRec;writeDaily(z.date,z.pisoId,{recs:{[x.id]:pr?{...pr,viaNova:false}:{...baseRec(z.date,x,rc),status:null,exec:null,cnc:'',imp:null,note:'',viaNova:false}}})}
  /* fechas: vuelven las de antes solo si nadie las cambió después; versiones antiguas (sin «antes»): solo se quita el día agregado si no tenía cantidad previa */
  if(typeof canWrite!=='undefined'&&canWrite){const m=z.mv&&z.mv[x.id];
    if(m){if(canon(x.days||[])===canon(m.n||[])&&canon(x.qty||{})===canon(m.nq||{}))apply([op('acts',x.id,{...x,days:m.p||[],qty:m.pq||{}})],'Reprogramación deshecha');else warn='las fechas o cantidades ya se cambiaron después: revísalas en el lookahead'}
    else if(z.repTo&&(x.days||[]).includes(z.repTo)&&!recOf(z.repTo,x.id))warn='revisa en el lookahead el día '+fmtD(z.repTo)+' (registro antiguo sin el estado anterior)'}
  /* la restricción que se registró con esta decisión se archiva si sigue pendiente */
  if(z.rid){const r=S.res.get(z.rid);if(r&&r.status!=='lib'){const a=arc('restr',z.rid);if(a)apply([a],'')}}
  if(z.prop){const p=PD.get(z.prop);if(p&&p.st==='ok')dpReopen(p)}
  requestRender();toast(warn?'Vuelve a ir · '+warn:'Vuelve a ir: se dejó como estaba antes')}
/* ---------- dibujo sobre el plano ---------- */
/* lista de lo visto en obra sin estar programado (para el panel y la reunión) */
function npSeenHtml(kind){if(typeof npItems!=='function')return'';const L=npItems([M.date],new Set([M.piso])).filter(i=>i.src==='np');if(!L.length)return'';
  return L.map(i=>{const c=conOf(i.e.sc).color;const am=i.a?i.a.code+' · '+i.a.name:'';
    return kind==='mlr'?`<button class="mlr" data-npo="${esc(i.id)}"><i class="nbi np" style="--c:${c}">+</i><span><b>${esc(i.e.desc||'')}</b><small>${esc(conOf(i.e.sc).name)}${am?' · '+esc(am):''}${i.e.pt?'':' · sin ubicar'}</small></span></button>`
      :`<div class="mp-it np"><div class="t">${esc(i.e.desc||'')}<small>${esc(conOf(i.e.sc).name)}${am?' · '+esc(am):''} · ${esc(i.e.byName||'')}${(i.e.photos||[]).length?' · 📷':''}</small></div><div class="s"><button class="lnkb" data-npo="${esc(i.id)}">Ver</button></div></div>`}).join('')}
function tapSelect(w,e,rc){if(M.tool!=='pan')return;if(CQ_SKIP){CQ_SKIP=false;return}const els=document.elementsFromPoint(e.clientX,e.clientY);const X=e.clientX,Y=e.clientY;
  /* con un subcontratista elegido, las zonas atenuadas de otras partidas no responden al toque */
  const fvT=M.meet?M.meetSc:scVis();const z=els.map(el=>el.closest&&el.closest('[data-z]')).filter(Boolean).find(el=>{const id=el.dataset.z;if(!id||id.startsWith('np:'))return true;const zz=zget(id);return!zz||scIn(fvT,zz.sc)});const zid=z&&z.dataset.z?z.dataset.z:null;
  const onLbl=els.some(el=>el.closest&&el.closest('.pvl[data-z]'));
  /* reunión: en «Plan» un toque abre Va · No va · Culminado (y los cruces); en «Cumplimiento», lo registrado en Campo */
  if(M.meet){const pl=M.mmode==='plan';if(zid&&zid.startsWith('np:')){if(typeof npOpen==='function')npOpen(zid.slice(3));return}
    if(pl&&!onLbl&&typeof canWrite!=='undefined'&&canWrite&&cxVis()){const c=crossAt(w);if(c&&(scIn(fvT,c.a.sc)||scIn(fvT,c.b.sc))){zcClose();crossPop(anchorAt(X,Y),c);return}}
    const zz=zid&&zget(zid);if(zz&&zz.kind==='zona'&&zz.actId)zCard(zz.actId,X,Y,pl);else zcClose();return}
  /* fuera de la reunión manda el modo (Cumplimiento · Programar · Interferencias). Con mouse el clic izquierdo solo navega
     (y selecciona lo dibujado); el menú del modo se abre con clic derecho (rc). En tablet, con un toque */
  const zz=zid&&!zid.startsWith('np:')?zget(zid):null;const m=pmode();
  if(!rc&&e.pointerType==='mouse'){zcClose();M.selId=zz&&!zz.virt?zid:null;requestRender();if(zid||ambAt(M.piso,{x:w.x,y:w.y,v:M.vista}))pmTip(m);return}
  if(zid&&zid.startsWith('np:')){if(typeof npOpen==='function')npOpen(zid.slice(3));return}
  /* Cumplimiento: solo ver lo registrado (se registra en Campo) */
  if(m==='cu'){if(zz&&zz.kind==='zona'&&zz.actId&&S.act.get(zz.actId))zCard(zz.actId,X,Y,false,true);else zcClose();return}
  /* Interferencias: los cruces del lugar o del ambiente */
  if(m==='cx'){zcClose();cxAmbPop(w,X,Y);return}
  /* Programar: la actividad abre Va · No va · Culminado (y «＋ Trabajo no programado» en su ambiente); un ambiente, el «＋» */
  if(zz&&zz.kind==='zona'&&zz.actId&&S.act.get(zz.actId)&&(dzEng()||canPlan(zz.sc))){M.selId=zz.virt?null:zid;zCard(zz.actId,X,Y,true);requestRender();return}
  if((!zz||zz.virt||rc)&&paddCan()){const am=ambAt(M.piso,{x:w.x,y:w.y,v:M.vista});if(am){zcClose();paddDialog(anchorAt(X,Y),am);return}}
  zcClose();M.selId=zz&&!zz.virt?zid:null;requestRender()}
/* modo del plan diario fuera de la reunión. Los ingenieros eligen; el resto solo programa. Se recuerda uno para hoy/días pasados y otro para días futuros */
const pmEng=()=>typeof canDaily!=='undefined'&&!!canDaily;
function pmode(){if(!pmEng())return'prog';const k=M.date>todayIso()?'f':'p';M.pmK=M.pmK||{p:'cu',f:'prog'};return M.pmK[k]}
function pmSet(m){const k=M.date>todayIso()?'f':'p';M.pmK=M.pmK||{p:'cu',f:'prog'};M.pmK[k]=m;zcClose();M.selId=null;requestRender()}
function pmSync(){if(!M.meet)M.colorBy=pmode()==='cu'?'cu':'sc'}
function pmTip(m){M.rcTip=M.rcTip||{};if(M.rcTip[m])return;M.rcTip[m]=1;toast(m==='cu'?'Clic derecho sobre una actividad para ver su cumplimiento. El clic izquierdo solo mueve el plano.':m==='cx'?'Clic derecho sobre un ambiente para revisar sus interferencias. El clic izquierdo solo mueve el plano.':'Clic derecho sobre una actividad (Va · No va) o un ambiente (＋ trabajo no programado). El clic izquierdo solo mueve el plano.')}
/** Interferencias: clic derecho en un cruce lo abre; en un ambiente, sus cruces (uno: directo; varios: a elegir) */
function cxAmbPop(w,X,Y){computeCross();const fv=scVis();const ok=c=>scIn(fv,c.a.sc)||scIn(fv,c.b.sc);const c=crossAt(w);if(c&&ok(c)){crossPop(anchorAt(X,Y),c);return}
  const am=ambAt(M.piso,{x:w.x,y:w.y,v:M.vista});const a=am&&S.amb.get(am);if(!a){toast('Haz clic derecho sobre un ambiente para revisar sus interferencias.');return}
  const L=CROSS.list.filter(c=>ok(c)&&(c.a.ambId===am||c.b.ambId===am));if(!L.length){toast(`Sin interferencias en ${a.code} ${a.name}.`);return}
  if(L.length===1){crossPop(anchorAt(X,Y),L[0]);return}
  const h={};const b=L.map((c,i)=>{h['c'+i]=()=>setTimeout(()=>crossPop(anchorAt(X,Y),c),0);return`<button data-do="c${i}"><b>${esc(conOf(c.a.sc).name)} ↔ ${esc(conOf(c.b.sc).name)}</b><small>${esc(short(zoneLabel(c.a),40))} · ${esc(short(zoneLabel(c.b),40))}</small></button>`}).join('');
  openPop(anchorAt(X,Y),`<div class="ph">⚠ ${L.length} interferencias en ${esc(a.code)} ${esc(a.name)}</div><div class="pal">${b}</div>`,h)}
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
    if(t.kind==='zona'){if(M.pend){newZone(t.pts,{...M.pend,fromPend:1},null,e.clientX,e.clientY);return}M.tmp=t;drawOverlay();linkChooser(t.pts,e.clientX,e.clientY);return}
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
function finishPoly(cx,cy){const t=M.tmp;if(!t||t.pts.length<3){toast('Un polígono necesita al menos 3 puntos.');return}M.tmp={kind:'zona',pts:t.pts};if(M.pend){const p=M.tmp.pts;M.tmp=null;newZone(p,{...M.pend,fromPend:1},null,cx,cy);return}drawOverlay();linkChooser(M.tmp.pts,cx,cy)}
function delSel(){const z=zget(M.selId);if(own(z))delIds([z.id])}
const LW={1:2.5,2:4,3:7};
/** «Ver sectorización»: contorno de cada ambiente (color de su sector, como en Sectorización) y el código; no responde a los toques */
function szLayer(k){const T=typeof szTree==='function'?szTree(M.piso):[];const PAL=typeof SZ_PAL!=='undefined'?SZ_PAL:['#1F77B4'];let h='',t='';
  T.forEach(({s,ambs},i)=>{const c=PAL[i%PAL.length];const sg=geoOf(s,M.vista);
    if(sg){const P=unflat(sg);h+=`<polygon class="szl" points="${P.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${c}" stroke-width="3.5" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
    for(const{a}of ambs){const g=geoOf(a,M.vista);if(!g)continue;const P=unflat(g);const bb=bboxOf(P);
      h+=`<polygon class="szl" points="${P.map(p=>p.x+','+p.y).join(' ')}" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-width="1.6" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      t+=`<text class="szt" x="${bb.x+4*k}" y="${bb.y+4*k}" font-size="${11*k}" fill="${c}" stroke="#fff" stroke-width="${3*k}" paint-order="stroke" text-anchor="start" dominant-baseline="hanging" font-weight="700" pointer-events="none">${esc(a.code)}</text>`}});
  return h+t}
function drawOverlay(){const v=M.view;if(!v)return;computeCross();const NUMS=planNumbering(null);const HL=M.hl;const k=Math.max(1,1/v.z);const scR=myRole()==='sc';const all=shapesV(M.piso).filter(z=>z.kind!=='nova'&&!(scR&&z.actId&&dpPend(z.actId)));const sel=M.selId&&zget(M.selId);
  let svg=`<defs><pattern id="hxr" width="${10*k}" height="${10*k}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${4*k}" height="${10*k}" fill="#d32f2f"/></pattern><pattern id="hxs" width="${10*k}" height="${10*k}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${3*k}" height="${10*k}" fill="#546e7a"/></pattern></defs>`;const labels=[];const er=M.tool==='borrar';const inv=new Map();[...CROSS.ids,...CROSS.seqIds].forEach((id,n)=>inv.set(id,n));
  if(M.szShow)svg+=szLayer(k);
  const cu=M.colorBy==='cu';const RSK=typeof pendRestr==='function'?pendRestr():new Map();
  for(const z of all){const c0=conOf(z.sc).color;const st=cu&&z.kind==='zona'?(z.actId?zSt(z):'np'):null;const c=st&&st!=='np'?STC[st]:c0;const P=unflat(z.pts);if(!P.length)continue;const fv=M.meet?M.meetSc:scVis();const dim=fv&&!scIn(fv,z.sc);const cx=CROSS.ids.has(z.id);const isSel=sel&&sel.id===z.id;const op=dim?0.14:1;const hi=!!(HL&&HL.has(z.id)),dH=!!(HL&&!hi&&z.kind==='zona');
    const pts=P.map(p=>p.x+','+p.y).join(' ');const lw=LW[z.w||2];const eo=er&&erasable(z)?' class="erz"':'';
    if(z.kind==='zona'){const sw=isSel||hi?4:2.5;svg+=`<polygon points="${pts}" fill="none" stroke="#fff" stroke-width="${sw+3}" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity="${dim||dH?.35:.9}" pointer-events="none"/><polygon data-z="${z.id}"${eo} points="${pts}" fill="${c}" fill-opacity="${dim?.06:dH?.07:hi?.55:.34}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${z.fuera?'stroke-dasharray="7 5"':(inv.has(z.id)&&cxVis()?`stroke-dasharray="12 12" stroke-dashoffset="${inv.get(z.id)%2?12:0}"`:'')} opacity="${op}"/> ${z.actId&&RSK.get(z.actId)&&!dim?`<polygon points="${pts}" fill="none" stroke="#ef6c00" stroke-width="4" stroke-dasharray="10 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}${cx&&!dim&&cxVis()?`<polygon points="${pts}" fill="none" stroke="#d32f2f" stroke-width="3" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}${z.actId&&dpPend(z.actId)&&!dim?`<polygon points="${pts}" fill="url(#hxs)" fill-opacity=".45" stroke="#546e7a" stroke-width="2.5" stroke-dasharray="8 6" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}${z.actId&&avOf(z.actId)&&!dim?`<polygon points="${pts}" fill="none" stroke="#ef6c00" stroke-width="3.5" stroke-dasharray="2 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}`;
      if(!dim){const ce=centroid(P);const bb=bboxOf(P);const xa=z.actId&&S.act.get(z.actId),aa=xa&&S.amb.get(xa.ambId);const rs=z.actId&&RSK.get(z.actId);
        const tip=`${NUMS.zl.get(z.id)||''} · ${conOf(z.sc).name} · ${xa?xa.name+(aa?' — '+aa.code+' '+aa.name:''):'No programado: '+(z.desc||'')}${st&&st!=='np'?' · '+STT[st]:''}${rs?' · ⛔ restricción pendiente':''}${cx?' · ⚠ superposición con otro subcontratista':''}${z.actId&&dpPend(z.actId)?' · ⏸ en espera: '+dpText(dpPend(z.actId)):''}${z.actId&&avOf(z.actId)?' · ⚠ liberar a primera hora: '+(avOf(z.actId).desc||''):''}`;
        const CQ=z.actId?cqTag(z.sc,z.actId):null;
        if(M.lbl!=='name'&&NUMS.zl.has(z.id))labels.push({id:z.id,x:ce.x,y:ce.y,t:NUMS.zl.get(z.id),nb:1,cq:CQ&&CQ.t,cqc:CQ&&CQ.col,cqa:z.actId,np:!z.actId,ring:cx&&cxVis()?'rx':rs?'rr':'',area:bb.w*bb.h,tip,c,f:lum(c)>.55?'#1b1b1b':'#fff',cls:(isSel?'sel':'')+(hi?' hl':'')+(dH?' dm':'')});
        else labels.push({id:z.id,x:ce.x,y:ce.y,t:(st&&st!=='np'?STI[st]+' ':'')+(z.actId&&dpPend(z.actId)?'⏸ ':'')+(z.actId&&avOf(z.actId)?'⚠ ':'')+(rs?'⛔ ':'')+(cx?'⚠ ':CROSS.seqIds.has(z.id)?'↔ ':'')+zoneLabel(z),area:bb.w*bb.h,tip,c,f:z.fuera?c:(lum(c)>.55?'#1b1b1b':'#fff'),cq:CQ&&CQ.t,cqc:CQ&&CQ.col,cqa:z.actId,cls:(z.fuera?'np':'')+(isSel?' sel':'')+(hi?' hl':'')+(dH?' dm':'')})}}
    else if(z.kind==='trazo')svg+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${isSel?lw+1.5:lw}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/><polyline data-z="${z.id}"${eo} points="${pts}" fill="none" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;
    else if(z.kind==='flecha'){svg+=`<line x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="${c}" stroke-width="${isSel?lw+1.5:lw}" vector-effect="non-scaling-stroke" stroke-linecap="round" opacity="${op}"/><line data-z="${z.id}"${eo} x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="stroke"/>`;if(!dim)labels.push({id:z.id,x:P[1].x,y:P[1].y,t:'',c,cls:'arw w'+(z.w||2),ang:Math.atan2(P[1].y-P[0].y,P[1].x-P[0].x)*180/Math.PI})}
    else if(z.kind==='texto'){if(!dim)labels.push({id:z.id,x:P[0].x,y:P[0].y,t:z.t||'',c,f:c,fs:z.fs||18,cls:'txt'+(isSel?' sel':''),hs:isSel&&own(z)&&M.tool==='pan'})}}
  const fvv=M.meet?M.meetSc:scVis();
  for(const c of CROSS.list){if(!cxVis()||!c.r||(fvv&&!scIn(fvv,c.a.sc)&&!scIn(fvv,c.b.sc)))continue;svg+=`<rect x="${c.r.x}" y="${c.r.y}" width="${c.r.w}" height="${c.r.h}" fill="url(#hxr)" fill-opacity=".75" stroke="#d32f2f" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
  svg+=cqRoutes(all,fvv);
  for(const c of CROSS.seq){if(!cxVis()||!c.r||(fvv&&!scIn(fvv,c.a.sc)))continue;svg+=`<rect x="${c.r.x}" y="${c.r.y}" width="${c.r.w}" height="${c.r.h}" fill="url(#hxs)" fill-opacity=".55" stroke="#546e7a" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
  if(M.flash&&M.flash.pts&&M.flash.pts.length){const pp=M.flash.pts.map(p=>p.x+','+p.y).join(' ');svg+=`<polygon class="flz" points="${pp}" fill="#ffb300" fill-opacity=".18" stroke="#ff8f00" stroke-width="7" vector-effect="non-scaling-stroke" pointer-events="none"/><polygon class="flz2" points="${pp}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="10 8" vector-effect="non-scaling-stroke" pointer-events="none"/>`}
  const t=M.tmp;if(t){const c=t.kind==='erase'?'#c62828':(conOf(M.scDraw).color||'#1565c0');let P=t.pts;if(t.kind==='poly'&&t.hover)P=[...P,t.hover];const pts=P.map(p=>p.x+','+p.y).join(' ');
    if(t.kind==='zona'||t.kind==='poly'||t.kind==='erase')svg+=`<polygon points="${pts}" fill="${c}" fill-opacity="${t.kind==='erase'?.08:.22}" stroke="${c}" stroke-width="2" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`+(t.kind==='poly'?t.pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${5*k}" fill="${c}"/>`).join(''):'');
    else if(t.kind==='flecha'){svg+=`<line x1="${P[0].x}" y1="${P[0].y}" x2="${P[1].x}" y2="${P[1].y}" stroke="${c}" stroke-width="${LW[M.lw]}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`;labels.push({x:P[1].x,y:P[1].y,t:'',c,cls:'arw w'+M.lw,ang:Math.atan2(P[1].y-P[0].y,P[1].x-P[0].x)*180/Math.PI})}
    else if(t.kind==='trazo')svg+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${LW[M.lw]}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`}
  /* trabajo no programado visto en obra (registrado en el recorrido de Campo): un «+» en el punto donde se vio */
  if(typeof npMarks==='function'){if(typeof ensureNP==='function')ensureNP(M.date);
    for(const m of npMarks(M.date,M.piso)){if((m.v||M.vista)!==M.vista||(fvv&&!scIn(fvv,m.sc)))continue;svg+=`<circle cx="${m.x}" cy="${m.y}" r="5" fill="${m.c}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
      labels.push({id:'np:'+m.id,x:m.x,y:m.y,t:'+',nb:1,np:1,cls:'npo',area:1,c:m.c,f:m.c,tip:'Visto en obra sin estar programado · '+m.tip})}}
  if(v._svgH!==svg){v.svg.innerHTML=svg;v._svgH=svg}v.labels=labels;
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
M.meet=false;M.meetSc='';M.colorBy='sc';M.mmode='cu';M.szShow=false;
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
  /* de «Cumplido» a otro estado: la cantidad que se completó sola (= lo programado) ya no vale; un avance parcial escrito a mano se conserva */
  if(status!=='ok'&&cur&&cur.status==='ok'&&r.exec!=null&&r.prog!=null&&+r.exec===+r.prog)r.exec=null;
  if(status==='ok'&&r.exec==null&&r.prog!=null)r.exec=r.prog;writeDaily(M.date,M.piso,{recs:{[x.id]:r}});requestRender();toast(`${STT[status]} registrado en Campo`)}
function campoProps(z){if(!z||z.kind!=='zona'||!z.actId)return'';const r=zRec(z);const st=r?r.status:'none';const future=M.date>todayIso();
  let h=`<span class="cst" style="--c:${STC[st]}">${STI[st]} ${STT[st]}${r&&r.cnc?' · '+esc(r.cnc):''}</span>${r&&r.note?`<span class="mu">“${esc(short(r.note,60))}”</span>`:''}${r?`<span class="mu">${esc(r.byName||r.by||'')}</span>`:''}`;
  if(typeof canDaily!=='undefined'&&canDaily&&!future)h+=`<span class="mseg">${['ok','partial','no'].map(k=>`<button data-rst="${k}" class="${st===k?'on':''}" title="Registrar: ${STT[k]}">${STI[k]} ${STT[k]}</button>`).join('')}</span>`;
  return h}
/* ---------- decisión sobre un cruce (reunión / plano diario) ---------- */
/** las zonas que se superponen entre sí alrededor de un cruce (2, 3 o más partidas en el mismo lugar) */
function cxGroup(c){const Z=new Map([[c.a.id,c.a],[c.b.id,c.b]]);let more=true;
  while(more){more=false;for(const q of CROSS.list){const ha=Z.has(q.a.id),hb=Z.has(q.b.id);if(ha!==hb){Z.set(q.a.id,q.a);Z.set(q.b.id,q.b);more=true}}}return[...Z.values()]}
/** decidir un cruce: la lista ordenada (se arrastra para decidir quién va 1.º, 2.º, 3.º…; el orden se guarda solo),
   una ✗ en cada una para decir que no va (se reprograma como en el plan) y «Todas pueden trabajar a la vez» */
function crossPop(anchor,c){/* con el día cerrado se puede decidir el orden o «a la vez» (coordinar cuadrillas), no sacar a nadie del día */if(!dzEng()){toast(typeof canWrite!=='undefined'&&canWrite?'Este piso tiene responsable: los cruces los decide él (o el administrador).':'Las decisiones sobre los cruces las toma el ingeniero.');return}
  const ZL_=planNumbering(null).zl;const num=z=>ZL_.get(z.id)||'·';
  let ord=cxGroup(c).sort((p,q)=>(parseInt(num(p))||999)-(parseInt(num(q))||999));
  /* id fijo por grupo: si dos personas deciden a la vez, queda una sola decisión (la última) */
  const did='xk_'+M.date+'_'+ord.map(zKey).sort().join('~').replace(/[\/]/g,'_');let saved=PD.has(did);
  const nm=z=>`${ZL_.get(z.id)?'N.º '+ZL_.get(z.id)+' ':''}${conOf(z.sc).name}`;
  const keys=()=>ord.map(zKey);
  const saveOrd=()=>{if(ord.length<2){closePop();return}saved=true;if(PD.has(did)){rec([updDoc(did,{ord:keys(),keys:keys()},{ord:(PD.get(did)||{}).ord||null})].filter(Boolean))}
    else{rec([addDoc(did,{date:M.date,pisoId:M.piso,sc:ord[0].sc,kind:'xok',keys:keys(),pair:[keys()[0],keys()[1]].sort(),ord:keys(),n:me.name||me.email,by:me.email,byName:me.name||me.email,ts:NOW()})])}
    CROSS.key='';requestRender()};
  const chip=(z,i)=>{const x=z.actId&&S.act.get(z.actId);const col=conOf(z.sc).color;return`<div class="xo" data-xi="${i}" style="--c:${col}" title="Arrastra para cambiar el orden"><span class="xg" aria-hidden="true">⠿</span><em class="xp">${i+1}.º</em><i class="xn" style="color:${lum(col)>.55?'#1b1b1b':'#fff'}">${esc(num(z))}</i><span class="xt"><b>${esc(conOf(z.sc).name)}</b><small>${esc(x?short(x.name,30):(z.desc||'No programado'))}</small></span><button class="xno" data-xno="${i}" title="No va: reprogramar" aria-label="No va">✗</button></div>`};
  const html=()=>`<div class="xbox"><div class="ph">${ord.length} partidas en el mismo lugar</div><div class="ptx">${esc(zoneLabel(c.a))}</div>
    <div class="xlist">${ord.map(chip).join('')}</div>
    <div class="xhint">${saved?'✓ Orden guardado. ':''}Arrastra para decidir quién va primero; la ✗ dice que no va y se reprograma.</div>
    <div class="nvgo xgo"><button data-x="ok" class="pri"><b>✓ ${ord.length>2?'Todas pueden':'Pueden'} trabajar a la vez</b><small>no hay interferencia</small></button></div>
    ${M.rvx?`<div class="xrvn"><button data-x="prev">‹ Anterior</button><span>Cruce ${M.rvi+1} de ${CROSS.list.length}</span><button data-x="next">${saved?'Siguiente ›':'Saltar ›'}</button></div>`:''}</div>`;
  const no=(i,btn)=>{const los=ord[i];const win=ord.find(z=>z!==los);const xl=los.actId&&S.act.get(los.actId);const r=btn.getBoundingClientRect();const an=anchorAt(r.left,r.bottom-1);closePop();
    if(xl)setTimeout(()=>noVa(an,xl,{k:'int',desc:`Interferencia con ${conOf(win.sc).name}`,prio:{actId:win.actId||'',sc:win.sc,zona:win.id}}),0);
    else{const o=remDoc(los.id);if(o){rec([o]);requestRender();toast(`Se quitó el trabajo no programado de ${conOf(los.sc).name}`,'Deshacer',undo)}}};
  const show=()=>{openPop(anchor,html(),{});
    pop.onclick=e=>{const nb=e.target.closest('[data-xno]');if(nb){no(+nb.dataset.xno,nb);return}const b=e.target.closest('[data-x]');if(!b)return;
      if(b.dataset.x==='next'){rvxNext(1);return}if(b.dataset.x==='prev'){rvxNext(-1);return}
      if(b.dataset.x==='ok'){closePop();if(PD.has(did)){rec([updDoc(did,{ord:null},{ord:(PD.get(did)||{}).ord||null})].filter(Boolean))}else{rec([addDoc(did,{date:M.date,pisoId:M.piso,sc:ord[0].sc,kind:'xok',keys:keys(),pair:[keys()[0],keys()[1]].sort(),n:me.name||me.email,by:me.email,byName:me.name||me.email,ts:NOW()})])}
        CROSS.key='';requestRender();toast(ord.length>2?'Todas pueden trabajar a la vez':'Pueden trabajar a la vez','Deshacer',undo);if(M.rvx)setTimeout(()=>rvxNext(1),250)}};
    let dr=null;
    pop.onpointerdown=e=>{if(e.target.closest('[data-xno]'))return;const el=e.target.closest('.xo');if(!el)return;e.preventDefault();const L=[...pop.querySelectorAll('.xo')];
      dr={el,y0:e.clientY,i:+el.dataset.xi,mid:L.map(q=>{const r=q.getBoundingClientRect();return r.top+r.height/2})};el.setPointerCapture(e.pointerId);el.classList.add('drag')};
    pop.onpointermove=e=>{if(!dr)return;dr.el.style.transform=`translateY(${e.clientY-dr.y0}px)`};
    pop.onpointerup=pop.onpointercancel=e=>{if(!dr)return;const d=dr;dr=null;d.el.classList.remove('drag');d.el.style.transform='';if(Math.abs(e.clientY-d.y0)<12)return;
      const y=e.clientY;let j=d.mid.filter(m=>m<y).length;if(j>d.i)j--;j=Math.max(0,Math.min(ord.length-1,j));if(j===d.i)return;
      const z=ord.splice(d.i,1)[0];ord.splice(j,0,z);saveOrd();show()}};
  show()}
/* ---------- «Listo para la reunión» (oct 2026): por piso, lo que el ingeniero debe dejar resuelto antes de la reunión ----------
   cierres de hoy por verificar (Campo), cruces del plan del día elegido sin revisar y propuestas del SC sin decidir */
/* (auditoría de código 08/10, P1) recalcular todos los pisos con cada cambio que llega era caro en la reunión: lo que elige el usuario
   (abrir/cerrar, día, piso) se recalcula al momento; los cambios de datos, como mucho cada RDY_MIN ms (mientras, se muestra lo anterior
   y queda un redibujo pendiente); sin cambios, cada 30 s. */
const RDY={k:'',d:'',h:'',t:-1e9,tm:0},RDY_MIN=15000; /* t con reloj monótono (performance.now): es solo para espaciar, no es la hora de la obra */
function readyHtml(){const t=todayIso();const k=(M.rdyOpen?'o':'c')+'|'+t+'|'+M.date+'|'+(typeof U!=='undefined'?U.piso:'');const d=DV+'|'+PDV+'|'+(typeof DONEV!=='undefined'?DONEV:'');const age=performance.now()-RDY.t;
  if(RDY.k===k){if(RDY.d===d&&age<30000)return RDY.h;
    if(age<RDY_MIN){if(!RDY.tm)RDY.tm=setTimeout(()=>{RDY.tm=0;if(U.tab==='mapa')requestRender()},Math.min(RDY_MIN,Math.max(0,RDY_MIN-age))+50);return RDY.h}}
  if(RDY.tm){clearTimeout(RDY.tm);RDY.tm=0}
  const rows=[];for(const p of(typeof visPisos==='function'?visPisos():pisos())){const acts=dayActs(p.id,M.date).length;
    let ver=0;try{ver=dayData([t],new Set([p.id])).rows.filter(r=>!r.rc||r.rc._prop).length}catch(e){}
    let cx=0;try{cx=crossOf(p.id).length}catch(e){}const pr=[...PD.values()].filter(z=>z.kind==='dprop'&&z.st==='pend'&&z.pisoId===p.id&&z.date===M.date).length;
    if(!acts&&!ver)continue;rows.push({p,ver,cx,pr,ok:!ver&&!cx&&!pr})}
  const c=(n,l)=>n?`<span class="rdn" title="${l}">${n}</span>`:'<span class="rdk">✓</span>';
  const h=rows.length?`<details class="mrdy"${M.rdyOpen?' open':''}><summary>${rows.every(r=>r.ok)?'🟢':'🟡'} Listo para la reunión <span class="mu">${rows.filter(r=>r.ok).length} de ${rows.length} pisos${rows.some(r=>!r.ok)?' · '+[['ver','cierres'],['cx','cruces'],['pr','propuestas']].map(([k,l])=>{const n=rows.reduce((t,r)=>t+r[k],0);return n?n+' '+l:''}).filter(Boolean).join(' · '):''}</span></summary>
    <table><thead><tr><th>Piso</th><th title="Cierres de hoy sin verificar en Campo">Cierres hoy</th><th title="Cruces del plan del ${fmtD(M.date)} sin revisar">Cruces</th><th title="Propuestas del SC sin decidir">Propuestas</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.ok?'ok':''}"><td><button class="lnkb" data-rdyp="${r.p.id}">${esc(r.p.code)}</button></td><td>${c(r.ver,'por verificar')}</td><td>${c(r.cx,'sin revisar')}</td><td>${c(r.pr,'sin decidir')}</td></tr>`).join('')}</tbody></table></details>`:'';
  RDY.k=k;RDY.d=d;RDY.h=h;RDY.t=performance.now();return h}
/* ---------- revisión previa de cruces (oct 2026): el ingeniero del piso (o el admin) los recorre uno por uno antes de la reunión ---------- */
const xokOf=(pid,d)=>[...PD.values()].filter(z=>z.kind==='xok'&&z.pisoId===pid&&z.date===d);
function rvxGo(i){try{computeCross()}catch(e){}const L=CROSS.list;closePop();
  if(!L.length){M.rvx=false;M.rvc=null;requestRender();toast('✓ No quedan cruces por revisar en este piso.');return}
  M.rvx=true;M.rvi=Math.max(0,Math.min(L.length-1,i||0));const c=L[M.rvi];M.rvc=c.a.id+'|'+c.b.id;M.cxOpen=true;requestRender();
  zoomTo([...unflat(c.a.pts),...unflat(c.b.pts)]);
  setTimeout(()=>{if(!M.rvx)return;const st=$('#mstage');const r=st?st.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};crossPop(anchorAt(r.left+r.width/2,r.top+r.height/2),c)},380)}
/** siguiente cruce: si el actual ya se decidió salió de la lista (el mismo índice es el siguiente); si no, avanza */
function rvxNext(d){try{computeCross()}catch(e){}const[a,b]=(M.rvc||'|').split('|');const k=CROSS.list.findIndex(q=>q.a.id===a&&q.b.id===b);
  const n=CROSS.list.length;if(!n){rvxGo(0);return}const j=k<0?(d<0?M.rvi-1:M.rvi):k+d;rvxGo(((j%n)+n)%n)}
function rvxStop(){M.rvx=false;M.rvc=null;closePop();requestRender()}
function crossAt(w){for(const c of CROSS.list){const r=c.r;if(r&&w.x>=r.x&&w.x<=r.x+r.w&&w.y>=r.y&&w.y<=r.y+r.h)return c}return null}
/* ---------- acciones rápidas sobre una actividad del día (lista de la reunión) ---------- */
function actQuick(anchor,aid){const x=S.act.get(aid);if(!x)return;const a=S.amb.get(x.ambId);const prev=ZN.get(aid);const t0=todayIso();
  const cp=canPlan(x.sc),cd=typeof canDaily!=='undefined'&&canDaily&&M.date<=t0;const cr=typeof rCanAdd==='function'&&(typeof canWrite!=='undefined'&&canWrite||(typeof SCK==='function'&&SCK()&&myScs().includes(x.sc)));
  const later=(x.days||[]).filter(y=>y>M.date).length;const h={};let html=`<div class="ph">${esc(x.name||'(sin nombre)')}</div><div class="ptx">${esc(conOf(x.sc).name)} · ${esc(a?a.code+' · '+a.name:'')} · sin ubicar en el plano</div>`;
  if(cp&&prev){html+=`<button data-do="prev">📍 Ubicar donde trabajó la última vez</button>`;h.prev=()=>{M.scDraw=x.sc;newZone(unflat(prev.pts),{actId:aid},prev.vista);toast('Ubicada como la última vez. Ajústala si cambia.')}}
  if(cp&&!PHONE()){html+=`<button data-do="draw">✏️ Dibujar su zona en el plano</button>`;h.draw=()=>{M.scDraw=x.sc;M.pend={actId:aid};if(typeof rskWarn==='function')rskWarn(aid);M.tool='zona';M.selId=null;requestRender();toast('Dibuja la zona en el plano: toca las esquinas y cierra en la primera.')}}
  if(cd){html+=`<button data-do="done">✓ Ya está terminada${later?` <kbd>libera ${later} día${later>1?'s':''}</kbd>`:''}</button>`;h.done=()=>{if(typeof askDone==='function')askDone(aid,M.date).then(ok=>{if(ok)requestRender()})}}
  if(cp){html+=`<button data-do="nova">⏸ No se hará hoy…</button>`;h.nova=()=>setTimeout(()=>M.date>t0?noVa(anchor,x,{}):novaDialog(anchor,x),0)}
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
     if(nov)setTimeout(()=>M.date>todayIso()?noVa(anchor,x,{k:'int',desc:'Restricción registrada: '+desc.trim()}):novaDialog(anchor,x,{motivo:'Restricción',title:'Restricción · no se hará hoy'}),0)}});
  setTimeout(()=>{const i=$('#rqd');if(i)i.focus()},30)}
/* ---------- ventana de detalle de cumplimiento (modo Cumplimiento y modo reunión) ---------- */
let ZC=null;
function zcClose(){const el=document.getElementById('mzc');if(el)el.remove();ZC=null}
function zCard(aid,cx,cy,pl,ro){ZC={ask:ZC&&ZC.aid===aid?ZC.ask:null,aid,cx:cx??(ZC&&ZC.cx),cy:cy??(ZC&&ZC.cy),pl:pl??(ZC&&ZC.pl),ro:!!ro};zcRender()}
function zcRender(){if(!ZC)return;const x=S.act.get(ZC.aid);if(!x){zcClose();return}const a=S.amb.get(x.ambId);if(ZC.pl){zcShow(zcPlanHtml(x,a));return}const r=typeof recOf==='function'?recOf(M.date,x.id):null;const st=r?r.status:'none';
  const future=M.date>todayIso();const can=typeof canDaily!=='undefined'&&canDaily&&!future&&!ZC.ro;const N=nbMap();const lv=typeof liveOf==='function'?liveOf(M.date,x.id):null;
  const phs=[...new Set([...(r&&r.photos||[]),...(lv&&lv.photos||[])])];phs.forEach(id=>typeof loadFoto==='function'&&loadFoto(id));
  let h=`<div class="zch"><div class="zct">${nbHtml(N,x.id)}<div><b>${esc(x.name||'(sin nombre)')}</b><span><i class="zcsc" style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)} · ${esc(a?a.code+' · '+a.name:'')}</span></div></div><button class="kx" data-zcx aria-label="Cerrar">&times;</button></div>
    <div class="zcst" style="--c:${STC[st]}"><b>${STI[st]} ${STT[st]}</b>${r&&r.cnc?`<span>Causa: ${esc(r.cnc)}</span>`:''}${r&&r._prop?'<span>Cierre del capataz · por confirmar</span>':''}</div>
    ${r&&r.note?`<p class="zcn">“${esc(r.note)}”</p>`:''}
    ${r?`<p class="zcm">${r._prop?'Lo reportó':'Lo registró'} ${esc(r.byName||r.by||'—')}${r.ts?' · '+fmtD(ldt(r.ts))+' '+hhmm(r.ts):''}${r.corr?` · <b>corregido en ${esc(r.corr.via)}</b>`:''}</p>`:'<p class="zcm">Nadie registró el cumplimiento de este día.</p>'}
    ${r&&(r.hist||[]).length?`<ul class="zchi">${r.hist.slice().reverse().map(o=>`<li>Antes: ${STI[o.st]||''} ${esc(STT[o.st]||o.st)}${o.cnc?' · '+esc(o.cnc):''} · ${esc(o.n||'')}${o.t?' · '+fmtD(ldt(o.t))+' '+hhmm(o.t):''}</li>`).join('')}</ul>`:''}
    ${lv&&lv.mot?`<p class="zcm">Detención reportada: ${esc(lv.mot)}</p>`:''}
    ${phs.length?`<div class="zcph">${phs.map(id=>`<img data-ph="${id}" src="${FOTO.get(id)||''}" alt="Foto del registro"${FOTO.get(id)?'':' style="opacity:.3"'}>`).join('')}</div>`:''}
    ${ZC.ro&&typeof canDaily!=='undefined'&&canDaily&&!future?'<p class="zcm">Solo consulta: el cumplimiento se registra en Campo.</p>':''}
    ${can?`<div class="zcb">${r&&r._prop?'<button class="ib pri" data-zcs="conf">✓ Confirmar lo reportado</button>':''}${(st==='partial'?['ok','partial','no']:['ok','no']).map(k=>`<button class="ib zcb-${k}${(ZC.ask?ZC.ask===k:st===k&&!(r&&r._prop))?' on':''}" data-zcs="${k}">${k==='ok'?'✓ Cumplido':k==='no'?'✗ No':STI[k]+' '+STT[k]}</button>`).join('')}</div>
    ${ZC.ask?`<div class="zcq"><b>¿Por qué no se cumplió?</b>${(P().cnc||[]).map((c,i)=>`<button class="chip" data-zcc="${i}" title="${esc(cncTip(c))}">${esc(cncLabel(c))}</button>`).join('')}<button class="chip" data-zcc="-1">Sin causa</button></div>`:''}${r&&r.status&&!r._prop?'<p class="zcm">Si lo cambias, queda registrado quién lo corrigió y qué decía antes.</p>':''}`:future?'<p class="zcm">Día futuro: aún no se registra el cumplimiento.</p>':''}`;
  zcShow(h)}
function zcShow(h){let el=document.getElementById('mzc');if(!el){el=document.createElement('div');el.id='mzc';el.className='mzc';el.setAttribute('role','dialog');document.body.appendChild(el);el.onclick=zcClick}
  el.classList.toggle('pl',!!ZC.pl);if(el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}
  const W=el.offsetWidth,H=el.offsetHeight;if(innerWidth<=760){el.style.left='';el.style.top='';return}
  let lx=(ZC.cx||innerWidth/2)+14,ly=(ZC.cy||innerHeight/2)-20;if(lx+W>innerWidth-10)lx=Math.max(10,(ZC.cx||0)-W-14);if(ly+H>innerHeight-10)ly=Math.max(10,innerHeight-H-10);el.style.left=lx+'px';el.style.top=Math.max(10,ly)+'px'}
/** ficha del plan de mañana en la reunión: ¿va? (lo mismo que la fila del panel) */
/** los cruces de una actividad (o de unas zonas), en texto breve: con quién, dónde y qué hace el otro */
function cxOfIds(ids){const S_=new Set(ids);return CROSS.list.filter(c=>S_.has(c.a.id)||S_.has(c.b.id)).map(c=>{const me_=S_.has(c.a.id)?c.a:c.b,o=me_===c.a?c.b:c.a;return{c,me_,o}})}
function cxInfoHtml(L,attr){const ZL_=planNumbering(null).zl;const eng=typeof canWrite!=='undefined'&&canWrite;
  return L.map(({c,me_,o})=>{const xo=o.actId&&S.act.get(o.actId);const dec=xokDocs().find(d=>(d.ord||[]).length&&(d.pair||[]).includes(zKey(o)));
    return`<button class="zccx" ${attr}="${c.a.id}|${c.b.id}"><b>⚠ Comparte el lugar con ${ZL_.get(o.id)?'N.º '+esc(ZL_.get(o.id))+' · ':''}${esc(conOf(o.sc).name)}</b><small>${esc(xo?xo.name:(o.desc||'trabajo no programado'))} · ${esc(zoneLabel(o))}${Math.round(c.f*100)?` · se superponen ~${Math.round(c.f*100)} %`:''}</small><small class="go">${eng?'Toca para decidir: a la vez, en orden o quién no va':'Lo decide el ingeniero en la reunión'}</small></button>`}).join('')}
function zcPlanHtml(x,a){const N=nbMap();const nv=shapesOf(M.piso).find(z=>z.kind==='nova'&&z.actId===x.id);const can=dzCan(x);const CQ=cqTag(x.sc,x.id);
  const rs=typeof restrPend==='function'?restrPend(x.id):[];
  return`<div class="zch"><div class="zct">${nbHtml(N,x.id)}<div><b>${esc(x.name||'(sin nombre)')}</b><span><i class="zcsc" style="--c:${conOf(x.sc).color}"></i>${esc(conOf(x.sc).name)} · ${esc(a?a.code+' · '+a.name:'')}</span></div></div><button class="kx" data-zcx aria-label="Cerrar">&times;</button></div>
    <p class="zcm">${dvLbl(M.date)}${hasQ(x)?` · ${fq((x.qty||{})[M.date])} ${esc(x.und||'')}`:''}${CQ?` · cuadrilla <b>${esc(CQ.t)}</b>`:''}</p>
    ${rs.map(r=>`<div class="rsk">⚠ Restricción pendiente · ${esc(rTxt(r))}</div>`).join('')}
    ${(()=>{try{computeCross()}catch(e){}const ids=shapesV(M.piso).filter(z=>z.kind==='zona'&&z.actId===x.id).map(z=>z.id);return cxInfoHtml(cxOfIds(ids),'data-zcx2')})()}
    ${nv?`<div class="zcst" style="--c:#c62828"><b>✗ No va</b><span>${esc(nv.motivo||'')}${nv.repTo?' · → '+fmtD(nv.repTo):''}</span></div>${(nv.k||nv.eng?dzEng():can)?`<button class="lnkb" data-undo="${nv.id}">Vuelve a ir</button>`:''}`
      :`<div class="zcpl">${dvHtml(x,can)||'<span class="mu">Solo el ingeniero o el subcontratista deciden si va.</span>'}</div>`}
    ${paddCan()&&pubDraft()&&a?`<button class="ib zcpa" data-zpa="${a.id}">＋ Trabajo no programado en ${esc(a.code)}</button>`:''}`}
function zcClick(e){const t=e.target;if(t.closest('[data-zcx]')){zcClose();return}{const pb=t.closest('[data-zpa]');if(pb){const r=pb.getBoundingClientRect();const an=anchorAt(r.left,r.bottom-1);const am=pb.dataset.zpa;zcClose();setTimeout(()=>paddDialog(an,am),0);return}}if(lockStop(t))return;
  /* botones del plan (Va · No va · Culminado, aceptar/rechazar): la ventanita se ancla a un punto fijo para no perderse si la ficha se redibuja */
  {const b=t.closest('[data-dv],[data-dpa]');if(b){const rc=b.getBoundingClientRect();const an=anchorAt(rc.left,rc.bottom-1);
      if(b.dataset.dv){const[k,id]=b.dataset.dv.split('|');const x=S.act.get(id);if(x&&dzCan(x)&&!b.disabled)dvClick(an,x,k)}
      else{const p=PD.get(b.dataset.dpa);const x=p&&S.act.get(p.actId);if(x&&dzEng())dpAccept(an,x,p)}
      return}
    if(t.closest('[data-dpr],[data-avx],[data-undo]')){planClick(e);return}
    const xb=t.closest('[data-zcx2]');if(xb){const ids=xb.dataset.zcx2.split('|');const c=CROSS.list.find(q=>q.a.id===ids[0]&&q.b.id===ids[1]);const r=xb.getBoundingClientRect();if(c)crossPop(anchorAt(r.left,r.bottom-1),c);return}}
  const im=t.closest('img[data-ph]');if(im&&im.src&&im.src.startsWith('data:')&&typeof lightbox==='function'){lightbox(im.src);return}
  {const c=t.closest('[data-zcc]');if(c&&ZC){zcCause(+c.dataset.zcc);return}}
  const b=t.closest('[data-zcs]');if(!b||!ZC)return;const k=b.dataset.zcs;const x=S.act.get(ZC.aid);if(!x)return;const z={actId:x.id};
  if(k==='conf'){if(typeof confirmProp==='function'){confirmProp(M.date,x.id);toast('Confirmado');setTimeout(zcRender,60)}return}
  if(k==='ok'){ZC.ask=null;setRec(z,'ok');setTimeout(zcRender,60);return}
  /* la causa se elige dentro de la misma ficha (una ventanita aparte quedaba detrás) */
  ZC.ask=ZC.ask===k?null:k;zcRender()}
function zcCause(i){const x=ZC&&S.act.get(ZC.aid);if(!x||!ZC.ask)return;const c=i<0?'':(P().cnc||[])[i]||'';setRec({actId:x.id},ZC.ask,c);ZC.ask=null;setTimeout(zcRender,60)}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ZC){e.stopImmediatePropagation();zcClose()}});
function pip(p,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){if(((P[i].y>p.y)!==(P[j].y>p.y))&&(p.x<(P[j].x-P[i].x)*(p.y-P[i].y)/(P[j].y-P[i].y)+P[i].x))c=!c}return c}
/* puntos, caja y área de cada zona, calculados una vez por zona (se rehacen si cambian sus puntos) (auditoría de código 08/10, P6) */
const polyArea=P=>{let s=0;for(let i=0,j=P.length-1;i<P.length;j=i++)s+=(P[j].x+P[i].x)*(P[j].y-P[i].y);return Math.abs(s/2)};
const ZPB=new WeakMap();
function zPB(z){let c=ZPB.get(z);if(c&&c.f===z.pts)return c;const P=unflat(z.pts);c={f:z.pts,P,b:P.length?bboxOf(P):null,s:polyArea(P)};ZPB.set(z,c);return c}
/* ¿se tocan las cajas? (descarta el par antes de muestrear) */
const bbHit=(a,b)=>!!a&&!!b&&Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y);
function overlapFrac(A,B,a,b,sa,sb){a=a||bboxOf(A);b=b||bboxOf(B);const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h);if(x1<=x0||y1<=y0)return 0;
  const n=14;let both=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const p={x:x0+(i+.5)*(x1-x0)/n,y:y0+(j+.5)*(y1-y0)/n};if(pip(p,A)&&pip(p,B))both++}
  const inter=both/(n*n)*(x1-x0)*(y1-y0);return inter/Math.max(1,Math.min(sa??polyArea(A),sb??polyArea(B)))}
const CROSS={key:'',list:[],ids:new Set(),seq:[],seqIds:new Set()};
/* decisión de la reunión: el par de zonas puede trabajar a la vez (se guarda en la zona: xok:{otraZona:{n,by,t}}) */
/* N.º con que la zona aparece en el plano (número de la actividad o letra si no es programada) */
const zNo=(z,zl)=>{const n=zl&&zl.get(z.id);return n?`N.º ${n} · `:''};
const zNoH=(z,zl)=>{const n=zl&&zl.get(z.id);if(!n)return'';const c=conOf(z.sc).color;return`<i class="nbi${lum(c)>.55?' lt':''}" style="--c:${c}">${esc(n)}</i>`};
const zKey=z=>z.actId?'a:'+z.actId:'z:'+z.id;
const xokDocs=()=>[...PD.values()].filter(z=>z.kind==='xok'&&z.pisoId===M.piso&&z.date===M.date);
/* decisiones de cruces del día: índice por par (se rehace cuando cambia el plan) */
const XDC={k:-1,P:null,G:null};
function xdIdx(){if(XDC.k===PDV+'|'+M.date+'|'+M.piso)return XDC;const P=new Set(),G=[];for(const d of xokDocs()){if(d.pair)P.add(d.pair.join('|'));if(d.keys)G.push(new Set(d.keys))}XDC.k=PDV+'|'+M.date+'|'+M.piso;XDC.P=P;XDC.G=G;return XDC}
const xDecided=(a,b)=>{if((a.xok&&a.xok[b.id])||(b.xok&&b.xok[a.id]))return true;const ka=zKey(a),kb=zKey(b);const X=xdIdx();if(X.P.has([ka,kb].sort().join('|')))return true;return X.G.some(g=>g.has(ka)&&g.has(kb))};
function interRect(A,B,a,b){a=a||bboxOf(A);b=b||bboxOf(B);const x0=Math.max(a.x,b.x),y0=Math.max(a.y,b.y),x1=Math.min(a.x+a.w,b.x+b.w),y1=Math.min(a.y+a.h,b.y+b.h);return x1>x0&&y1>y0?{x:x0,y:y0,w:x1-x0,h:y1-y0}:null}
function computeCross(){const zs=shapesV(M.piso).filter(z=>z.kind==='zona'&&!(z.virt&&z.paId));shapesOf(M.piso);const key=M.piso+'|'+M.vista+'|'+M.date+'|'+(SHC.get(M.piso)||{}).k+'|'+PDV;if(key===CROSS.key)return;CROSS.key=key;CROSS.list=[];CROSS.ids=new Set();CROSS.seq=[];CROSS.seqIds=new Set();
  const Q=zs.map(zPB);for(let i=0;i<zs.length;i++)for(let j=i+1;j<zs.length;j++){const a=zs[i],b=zs[j],qa=Q[i],qb=Q[j];if(!bbHit(qa.b,qb.b))continue;const f=overlapFrac(qa.P,qb.P,qa.b,qb.b,qa.s,qb.s);if(f<=0.15)continue;const r=interRect(qa.P,qb.P,qa.b,qb.b);
    if(a.sc!==b.sc){if(xDecided(a,b))continue;CROSS.list.push({a,b,f,r});CROSS.ids.add(a.id);CROSS.ids.add(b.id)}
    else if(a.actId&&b.actId&&a.actId!==b.actId){CROSS.seq.push({a,b,f,r});CROSS.seqIds.add(a.id);CROSS.seqIds.add(b.id)}}}
function meetScs(){return scsOfDay()}
function zoneBoxes(sc){return shapesV(M.piso).filter(z=>z.kind!=='nova'&&scIn(sc,z.sc)).flatMap(z=>unflat(z.pts))}
function meetGo(sc){M.meetSc=sc;requestRender();requestAnimationFrame(()=>{const P=zoneBoxes(sc);if(sc&&P.length)zoomTo(P);else fitAll()})}
function actRows(sc){const acts=dayActs(M.piso,M.date).filter(o=>o.x.sc===sc);const sh=shapesOf(M.piso);
  return acts.map(({x,a})=>{const zs=sh.filter(z=>z.kind==='zona'&&z.actId===x.id);const nv=sh.find(z=>z.kind==='nova'&&z.actId===x.id);return{x,a,zs,nv}})}
/** filas del cumplimiento en la reunión: con plan publicado (foto), lo comprometido es la foto, igual que el PPC diario de
    Indicadores (lo agregado después no cuenta; lo que salió del día sin registro sigue contando; lo terminado antes, no) */
function cuRows(sc){const R=actRows(sc);const sn=typeof dplanOf==='function'?dplanOf(M.date,M.piso):null;if(!sn||!sn.ids)return R;
  const out=R.filter(r=>r.x.id in sn.ids);const seen=new Set(out.map(r=>r.x.id));
  for(const id of Object.keys(sn.ids)){if(seen.has(id))continue;const x=S.act.get(id)||(ARCH.act&&ARCH.act.get(id));if(!x)continue;const rc=recOf(M.date,id);
    if(((rc&&rc.sc)||x.sc)!==sc)continue;if(doneBefore(id,M.date)&&!rc)continue;out.push({x,a:S.amb.get(x.ambId),zs:[],nv:null,out:true})}
  return out}
/* reunión por excepción (oct 2026): con «Solo incumplimientos» (por defecto) la ficha muestra solo lo no cumplido, parcial o sin
   registro; lo cumplido queda contado pero no se recorre, y ‹ › salta las partidas que cumplieron todo */
const cuEx=()=>M.cuEx!==false;
const cuBad=r=>{const rc=typeof recOf==='function'?recOf(M.date,r.x.id):null;if(r.nv&&!rc)return false;return!rc||rc.status!=='ok'};
/** cuántas actividades quedaron ✓ ½ ✗ o sin registro (lo que vieron en Campo) */
function cuCount(R){const o={ok:0,partial:0,no:0,none:0};for(const r of R){const rc=typeof recOf==='function'?recOf(M.date,r.x.id):null;if(r.nv&&!rc)continue; /* «no va hoy» con registro cuenta, como en Campo e Indicadores */o[rc&&o[rc.status]!=null?rc.status:'none']++}return o}
function cuLine(o,n){const v=o.ok+o.partial+o.no;return `${o.ok} de ${n} cumplidas${o.partial?` · ${o.partial} parcial${o.partial>1?'es':''}`:''}${o.no?` · ${o.no} no`:''}${o.none?` · ${o.none} sin registro`:''}${v?` · ${Math.round(o.ok/v*100)} %`:''}`}
/** cambia lo que se revisa en la reunión: «cu» = cumplimiento del día · «plan» = el plan del día siguiente (va / no va, cruces) */
function meetMode(m,keepDay){M.mmode=m;zcClose();M.colorBy=m==='cu'?'cu':'sc';if(m==='plan'){M.cxOpen=true;M.chOpen=true}
  if(!keepDay){const d=m==='cu'?todayIso():wshift(todayIso(),1);if(typeof AUTO_OFF!=='undefined')AUTO_OFF=true;if(M.date!==d){M.date=d;M.selId=null;M.tmp=null;M.pend=null;if(typeof daySet==='function')daySet(d);ensurePlan()}}
  requestRender();setTimeout(()=>meetGo(M.meetSc),120)}
function meetExit(){M.meet=false;M.meetSc='';zcClose();if(M.cb0!=null){M.colorBy=M.cb0;M.cb0=null}try{if(document.fullscreenElement)document.exitFullscreen()}catch(err){}requestRender()}
function renderMeet(){const bar=$('#mmbar'),card=$('#mcard');if(!bar)return;document.body.classList.toggle('pl-meet',!!M.meet);$('.mapa')?.classList.toggle('meeting',!!M.meet);
  if(!M.meet){bar.hidden=true;card.hidden=true;const st=$('#mstage');if(st)st.style.top='';const rs=$('#mrs');if(rs)rs.style.top='';return}
  const scs=meetScs();if(M.meetSc){const k=M.meetSc.split(',').filter(c=>scs.includes(c)).join(',');if(k!==M.meetSc)M.meetSc=k}const SEL=M.meetSc?M.meetSc.split(','):[];const i=scs.indexOf(SEL[0]);const pl=M.mmode==='plan';
  const bh=`<button class="ib" id="mmx" title="Salir del modo reunión (Esc)">✕ Salir</button><span class="mseg mmode" role="group" aria-label="Qué se revisa"><button data-mmode="cu" class="${pl?'':'on'}" title="Lo que se hizo: cumplimiento registrado en Campo (C)">✓ Cumplimiento</button><button data-mmode="plan" class="${pl?'on':''}" title="Lo que viene: va / no va, cruces entre partidas y equipos (P)">📋 Plan e interferencias</button></span>${basesOf(M.piso).length>1?`<select id="mmvis" aria-label="Plano base">${basesOf(M.piso).map(b=>`<option value="${b.id}"${b.id===M.vista?' selected':''}>${esc(lname(b))}</option>`).join('')}</select>`:''}<span class="mmd"><select id="mmpiso" aria-label="Piso">${pisos().map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select><span class="mmday"><button class="ib" data-mdd="-1" title="Día anterior" aria-label="Día anterior">&#8249;</button><b>${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)}</b><button class="ib" data-mdd="1" title="Día siguiente" aria-label="Día siguiente">&#8250;</button>${M.date!==todayIso()?'<button class="ib" data-mdd="0">Hoy</button>':''}</span></span>
    <span class="mmnav"><button class="ib" data-mm="-1" title="Anterior (←)">‹</button><button class="mmall${M.meetSc?'':' on'}" data-msc="">Todos</button>${scs.map(c=>`<button class="mmsc${SEL.includes(c)?' on':''}" data-msc="${c}" title="Clic: solo esta partida · Ctrl+clic: sumar o quitar" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}<button class="ib" data-mm="1" title="Siguiente (→)">›</button></span>
    ${pl&&M.date>todayIso()&&dzEng()?(pubOf()&&!draftsOf().length?`<span class="pubok">✓ Publicado</span>`:`<button class="ib pri" data-pub="1" title="Aplicar el plan a todos: lookahead, Campo y En obra">📣 Publicar plan${draftsOf().length?` · ${draftsOf().length}`:''}</button>`):''}<button class="ib mtog${M.szShow?' on':''}" data-msz aria-pressed="${!!M.szShow}" title="Ver los sectores y ambientes de Sectorización sobre el plano">▦ Sectorización</button>${pl&&CROSS.list.length?`<button class="ib mtog${cxHid()?'':' on'}" data-cxv aria-pressed="${!cxHid()}" title="Mostrar u ocultar el achurado de los cruces entre partidas">▨ Achurado · ${CROSS.list.length} cruce${CROSS.list.length>1?'s':''}</button>`:''}<button class="ib mexp" title="Descargar como imagen lo que se está mostrando">Imagen</button><button class="ib" id="mmfs" title="Pantalla completa">⤢</button>${M.tool!=='pan'?`<span class="mmdraw">✏️ Dibuja la zona${M.pend&&M.pend.actId&&S.act.get(M.pend.actId)?' de «'+esc(short(S.act.get(M.pend.actId).name,28))+'»':''} <button class="ib" id="mcancel">Cancelar</button></span>`:''}`;
  if(bar.dataset.h!==bh){bar.innerHTML=bh;bar.dataset.h=bh}bar.hidden=false;
  let ch='';const NBM=nbMap();
  /* «Cumplimiento»: lo que se hizo el día (registrado en Campo) · «Plan»: la ficha se oculta y a la derecha quedan Por decidir, Equipos, Cruces y Cambios */
  if(pl){card.hidden=true;card.dataset.h=''}
  else if(SEL.length){ch=`<div class="mcex"><label class="chk"><input type="checkbox" id="mcuex"${cuEx()?' checked':''}> Solo incumplimientos</label></div>`+SEL.map(sc=>{const R0=cuRows(sc);const cs=cuCount(R0);const R=cuEx()?R0.filter(cuBad):R0;const nOk=R0.length-R.length;const np=shapesOf(M.piso).filter(z=>z.kind==='zona'&&!z.actId&&z.sc===sc);
    return`<div class="mch" style="--c:${conOf(sc).color}"><i></i><div><b>${esc(conOf(sc).name)}</b><span>${SEL.length>1?'':`${i+1} de ${scs.length} · `}${cuLine(cs,R0.length)}</span></div></div>
      <ol class="mcl">${R.map(r=>{const rc=typeof recOf==='function'?recOf(M.date,r.x.id):null;const st=rc?rc.status:'none';return`<li class="${r.nv?'nv':'cu-'+st}" data-mact="${r.x.id}" tabindex="0">${nbHtml(NBM,r.x.id)}<span class="mono">${esc(r.a.code)}</span><div><b>${esc(r.x.name)} <span class="cst sm" style="--c:${STC[st]}">${STI[st]} ${STT[st]}${rc&&rc.cnc?' · '+esc(rc.cnc):''}</span></b><small>${esc(r.a.name)}${hasQ(r.x)?` · ${fq((r.x.qty||{})[M.date])} ${esc(r.x.und||'')}`:''}</small>${r.nv?`<em>No iba este día · ${esc(r.nv.motivo||'')}</em>`:''}</div></li>`}).join('')||(R0.length?'<li class="pe ok"><div>✓ Cumplió todo lo programado.</div></li>':'<li class="pe"><div>Sin actividades programadas en este piso.</div></li>')}</ol>${cuEx()&&nOk&&R.length?`<div class="mcs mu">✓ ${nOk} cumplida${nOk>1?'s':''} (no se muestra${nOk>1?'n':''})</div>`:''}
      ${np.length?`<div class="mcs">No programado</div><ol class="mcl">${np.map(z=>`<li class="np"><span class="mono">NP</span><div><b>${esc(z.desc||'')}</b></div></li>`).join('')}</ol>`:''}`}).join('')}
  else{const rows=scs.map(c=>{const R=cuRows(c);return{c,n:R.length,cs:cuCount(R)}});const T=cuCount(scs.flatMap(c=>cuRows(c)));const n=rows.reduce((a,r)=>a+r.n,0);
    ch=`<div class="mch all"><div><b>Cumplimiento del día</b><span>${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)} · ${cuLine(T,n)}</span></div></div>
      <div class="mleg">${rows.map(r=>`<button data-msc="${r.c}" style="--c:${conOf(r.c).color}"><i></i><span>${esc(conOf(r.c).name)}</span><b>${r.cs.ok}/${r.n}</b>${r.cs.no+r.cs.partial?`<em>${r.cs.no+r.cs.partial} no cumple</em>`:r.cs.none?`<em class="mu">${r.cs.none} sin registro</em>`:''}</button>`).join('')}</div>
      ${(()=>{const B=scs.flatMap(c=>cuRows(c).filter(cuBad));if(!B.length)return n?'<div class="mcs ok">✓ Todo lo programado se cumplió.</div>':'';const G=new Map();
        B.forEach(r=>{const rc=typeof recOf==='function'?recOf(M.date,r.x.id):null;const k=!rc?'Sin registro':(typeof cncKey==='function'?cncKey(rc.cnc):(rc.cnc||'Sin causa registrada'));if(!G.has(k))G.set(k,[]);G.get(k).push({r,rc})});
        return`<div class="mcs">Incumplimientos (${B.length}) · por causa</div>`+[...G.entries()].sort((a,b)=>a[0]==='Sin registro'?1:b[0]==='Sin registro'?-1:b[1].length-a[1].length).map(([k,L])=>`<div class="mcg">${esc(k)} <b>${L.length}</b></div><ol class="mcl">${L.map(({r,rc})=>`<li class="cu-${rc?rc.status:'none'}" data-mact="${r.x.id}" tabindex="0">${nbHtml(NBM,r.x.id)}<span class="mono">${esc(r.a?r.a.code:'')}</span><div><b>${esc(r.x.name)}</b><small>${esc(r.a?r.a.name+' · ':'')}${esc(conOf(r.x.sc).name)}${rc&&impOf(rc)===false?' · no imputable':''}${rc&&rc.note?' · “'+esc(short(rc.note,50))+'”':''}</small></div></li>`).join('')}</ol>`).join('')})()}
      <div class="note" style="padding:6px 2px">Solo se revisan los incumplimientos. Toca uno para ver o corregir lo registrado. Luego pasa a <b>📋 Plan e interferencias</b>.</div>`}
  if(!pl){if(card.dataset.h!==ch){card.innerHTML=ch;card.dataset.h=ch}card.hidden=false}
  const bhh=bar.offsetHeight;const st=$('#mstage');if(st)st.style.top=bhh+'px';const rs=$('#mrs');if(rs)rs.style.top=pl&&innerWidth>899?(bhh+10)+'px':'';if(innerWidth>900)card.style.top=(bhh+10)+'px';else card.style.top=''}
function meetClick(e){const t=e.target;let b;
  if(t.closest('#mmeetb')){M.meet=true;M.meetSc='';M.selId=null;M.tmp=null;M.pend=null;M.tool='pan';M.cb0=M.colorBy;meetMode('cu');return true}
  if(legClick(e))return true;
  if(t.closest('#mpdf')){pdfDialog(t.closest('#mpdf'));return true}
  if(!M.meet){if(t.closest('#mexp')){exportPNG('');return true}return false}
  if(t.closest('#mmx')){meetExit();return true}
  if((b=t.closest('[data-mmode]'))){if(b.dataset.mmode!==M.mmode)meetMode(b.dataset.mmode);return true}
  if(t.closest('[data-msz]')){M.szShow=!M.szShow;requestRender();return true}
  if(t.closest('#mmfs')){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Tu navegador no permite pantalla completa aquí.'))}catch(err){toast('Tu navegador no permite pantalla completa aquí.')}return true}
  if((b=t.closest('[data-msc]'))){const c=b.dataset.msc;if((e.ctrlKey||e.metaKey)&&c){const L=M.meetSc?M.meetSc.split(','):[];meetGo((L.includes(c)?L.filter(x=>x!==c):[...L,c]).join(','))}else meetGo(c);return true}
  if((b=t.closest('[data-mm]'))){meetStep(+b.dataset.mm);return true}
  if((b=t.closest('[data-mact]'))){const rc=b.getBoundingClientRect();if(b.classList.contains('pe')){zcClose();actQuick(b,b.dataset.mact)}else zCard(b.dataset.mact,rc.right,rc.top);return true}
  if((b=t.closest('[data-cx]'))){const ids=b.dataset.cx.split('|');const P=ids.flatMap(id=>{const z=PD.get(id);return z?unflat(z.pts):[]});zoomTo(P);const c=CROSS.list.find(q=>(q.a.id===ids[0]&&q.b.id===ids[1])||(q.a.id===ids[1]&&q.b.id===ids[0]));if(c&&typeof canWrite!=='undefined'&&canWrite)setTimeout(()=>crossPop(b,c),250);return true}
  if(t.closest('#mexp,.mexp')){exportPNG(M.meetSc);return true}
  return false}
function meetStep(d){let scs=meetScs();if(M.mmode!=='plan'&&cuEx()){const f=scs.filter(c=>cuRows(c).some(cuBad));if(f.length||!M.meetSc)scs=f}const all=['',...scs];let i=all.indexOf(M.meetSc.split(',')[0]);if(i<0&&M.meetSc){const o=meetScs();const p=o.indexOf(M.meetSc.split(',')[0]);i=all.findIndex(c=>c&&o.indexOf(c)>p);i=i<0?(d>0?0:all.length):i-(d>0?1:0)}i=(i+d+all.length)%all.length;meetGo(all[i])}
document.addEventListener('keydown',e=>{if(U.tab!=='mapa'||!M.meet||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||''))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();meetStep(1)}else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();meetStep(-1)}else if(e.key==='Escape'&&M.tool!=='pan'){M.pend=null;M.tmp=null;M.tool='pan';requestRender()}else if(e.key==='Escape'&&!document.fullscreenElement&&!ZC&&pop.hidden){meetExit()}
  else if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key==='c'||e.key==='C'||e.key==='p'||e.key==='P')){const m=/c/i.test(e.key)?'cu':'plan';if(m!==M.mmode)meetMode(m)}});
/* ---------- exportar el plan del día como imagen PNG ---------- */
function loadImgEl(src){return new Promise((ok,ko)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ko(new Error('No se pudo leer la lámina'));i.src=src})}
/* ---------- exportar el plan del día: imagen y PDF ---------- */
const NATC=new Intl.Collator('es',{numeric:true});const nat=(a,b)=>NATC.compare(String(a),String(b));
const PT=v=>String(v==null?'':v).normalize('NFC').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g,'');
const PNC=new Map();
function planNumbering(vistaId,pid){const P_=pid||M.piso;shapesOf(P_);const k=(vistaId||'')+'|'+P_+'|'+(SHC.get(P_)||{}).k;const c=PNC.get(k);if(c)return c;if(PNC.size>20)PNC.clear();const r=planNumbering_(vistaId,pid);PNC.set(k,r);return r}
function planNumbering_(vistaId,pid){ // un número por actividad ubicada (ordenado por SC, ambiente y actividad); las zonas sin actividad llevan letra
  const zs=shapesOf(pid||M.piso).filter(z=>z.kind==='zona'&&(!vistaId||zVista(z)===vistaId));const by=new Map();const np=[];
  for(const z of zs){if(z.actId&&S.act.get(z.actId)){if(!by.has(z.actId))by.set(z.actId,[]);by.get(z.actId).push(z)}else np.push(z)}
  const items=[...by.entries()].map(([id,L])=>{const x=S.act.get(id);const a=S.amb.get(x.ambId);return{id,x,a,sc:x.sc,zones:L}})
    .sort((p,q)=>nat(conOf(p.sc).name,conOf(q.sc).name)||nat(p.a?p.a.code:'',q.a?q.a.code:'')||nat(p.x.name,q.x.name));
  items.forEach((it,i)=>{it.n=i+1});
  const AZ='ABCDEFGHIJKLMNOPQRSTUVWXYZ';const npl=np.sort((p,q)=>nat(conOf(p.sc).name,conOf(q.sc).name)).map((z,i)=>({z,l:i<26?AZ[i]:'N'+(i+1)}));
  const zl=new Map();items.forEach(it=>it.zones.forEach(z=>zl.set(z.id,String(it.n))));npl.forEach(o=>zl.set(o.z.id,o.l));
  return{items,np:npl,zl}}
function crossPairs(zs){const list=[],seq=[];const Z=zs.filter(z=>z.kind==='zona');
  const Q=Z.map(zPB);for(let i=0;i<Z.length;i++)for(let j=i+1;j<Z.length;j++){const a=Z[i],b=Z[j],qa=Q[i],qb=Q[j];if(!bbHit(qa.b,qb.b)||overlapFrac(qa.P,qb.P,qa.b,qb.b,qa.s,qb.s)<=.15)continue;const r=interRect(qa.P,qb.P,qa.b,qb.b);
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
/** llevar el plano a una actividad (desde Restricciones › «Ver en el plano»): acerca y resalta su zona o su ambiente */
function focusAct(aid,tries){const x=S.act.get(aid);if(!x)return;tries=tries||0;
  if(!M.view||!M.view.fitted){if(tries<40)setTimeout(()=>focusAct(aid,tries+1),150);return}
  const a=S.amb.get(x.ambId);const zs=shapesOf(M.piso).filter(z=>z.kind==='zona'&&z.actId===aid);
  let vis=zs.length?zVista(zs[0]):'';let P=[];
  if(!zs.length&&a){const b=basesOf(M.piso).find(b=>geoOf(a,b.id));if(b){vis=b.id;P=unflat(geoOf(a,b.id))}}
  if(vis&&vis!==M.vista){M.vista=vis;M.sel=vis;requestRender();if(tries<40)setTimeout(()=>focusAct(aid,tries+1),250);return}
  if(zs.length)P=zs.flatMap(z=>unflat(z.pts));
  if(!P.length){toast(a?`El ambiente ${a.code} aún no está ubicado en Sectorización.`:'La actividad no tiene ambiente.');return}
  zoomTo(P);
  /* se resalta el ambiente (o la zona) con un borde que parpadea unos segundos */
  M.flash={pts:a&&geoOf(a,M.vista)?unflat(geoOf(a,M.vista)):P,ext:zs.length?zs.flatMap(z=>[unflat(z.pts)]):[]};drawOverlay();clearTimeout(M.flashT);M.flashT=setTimeout(()=>{M.flash=null;drawOverlay()},4200);
  if(zs.length){const ids=zs.map(z=>z.id);M.hlk='';setHL(ids);clearTimeout(M.hlT);M.hlT=setTimeout(()=>setHL(null),3200)}
  else toast(`«${short(x.name,40)}» no está programada el ${dvLbl(M.date)}: se muestra su ambiente ${a.code}.`)}
function setHL(ids){const k=ids?ids.join(','):'';if(k===M.hlk)return;M.hlk=k;M.hl=ids&&ids.length?new Set(ids):null;if(!M.tmp)drawOverlay();
  $$('#mleg [data-lz]').forEach(b=>b.classList.toggle('on',!!M.hl&&b.dataset.lz.split(',').some(id=>M.hl.has(id))))}
/** los recuadros de la derecha no deben quedar debajo de la leyenda: se limitan al alto libre y se desplazan */
function mrsFit(){const rs=$('#mrs'),lg=$('#mleg'),w=rs&&rs.parentElement;if(!rs||!w)return;if(rs.classList.contains('dock')){rs.style.maxHeight='';return}if(innerWidth<900){rs.style.maxHeight='';return}
  const lh=lg&&!lg.hidden?lg.offsetHeight+16:0;const top=rs.offsetTop||10;const mh=Math.max(140,w.clientHeight-top-lh-10);rs.style.maxHeight=mh+'px';rs.style.overflowY='auto'}
/* ---------- panel lateral con pestañas (oct 2026): Por decidir, Cruces, Equipos, Cambios y Leyenda en un solo panel
   acoplado a la derecha (PC y tablet: el plano se achica, nada flota encima) o como hoja inferior en el celular ---------- */
M.cxOpen=true;M.pdOpen=true;M.chOpen=true;
const DOCK=[['mpdb','Por decidir'],['mcxb','Cruces'],['mfzb','Equipos'],['mchb','Cambios'],['mleg','Leyenda']];
function dockRender(){const rs=$('#mrs'),wrap=rs&&rs.parentElement;if(!rs)return;const lg=$('#mleg');if(lg&&lg.parentElement!==rs)rs.appendChild(lg);
  let tb=$('#mrst');if(!tb){tb=document.createElement('div');tb.id='mrst';tb.className='mrst';rs.prepend(tb)}
  rs.classList.add('dock');const ph=innerWidth<900;
  const av=DOCK.filter(([id])=>{const el=$('#'+id);return el&&!el.hidden});
  const cnt=id=>{const b=$('#'+id+' .mpdh b, #'+id+' .mcxh b, #'+id+' .mlh span');return b?b.textContent.trim():''};
  /* sin elección a mano: primero lo que hay que decidir (propuestas, cruces), luego lo demás */
  if(!M.rstMan||!av.some(([id])=>id===M.rst))M.rst=(av.find(([id])=>id==='mpdb')||av.find(([id])=>id==='mcxb'&&cnt(id)&&cnt(id)!=='0')||av.find(([id])=>id==='mfzb')||av[0]||[''])[0];
  /* en el celular empieza plegado (solo las pestañas); también mientras se reparte una cuadrilla */
  const shut=!!M.rsHide||(ph&&(M.rsPh!==true||(M.cqSel&&true)));
  const rdy=(typeof canWrite!=='undefined'&&canWrite&&!PHONE()&&!M.meet)?readyHtml():'';
  const h=av.length?`${rdy}<div class="mrstb" role="tablist">${av.map(([id,t])=>{const n=cnt(id);return`<button role="tab" data-rtab="${id}" class="${id===M.rst&&!shut?'on':''}${id==='mcxb'&&n&&n!=='0'?' bad':''}" aria-selected="${id===M.rst&&!shut}">${t}${n?` <b>${esc(n)}</b>`:''}</button>`}).join('')}<button class="mrsx" data-rsx="1" title="${shut?'Mostrar el panel':'Ocultar el panel (más plano a la vista)'}" aria-label="${shut?'Mostrar el panel':'Ocultar el panel'}">${shut?(ph?'▴':'‹'):(ph?'▾':'›')}</button></div>`:'';
  if(tb.dataset.h!==h){tb.innerHTML=h;tb.dataset.h=h}
  DOCK.forEach(([id])=>{const el=$('#'+id);if(el)el.classList.toggle('on',id===M.rst&&!shut)});
  rs.classList.toggle('shut',shut);rs.hidden=!av.length;
  const mp=rs.closest('.mapa');if(mp){mp.classList.toggle('docked',!!av.length&&!shut&&!ph&&!(M.meet&&M.mmode!=='plan'));mp.classList.toggle('dockmin',!!av.length&&shut&&!ph)}}
function renderLeg(){const el=$('#mleg');if(!el)return;const N=planNumbering(null);const fv=M.meet?M.meetSc:scVis();const cu=M.colorBy==='cu';
  const inV=z=>zVista(z)===M.vista;const items=N.items.filter(it=>it.zones.some(inV)&&scIn(fv,it.sc));const np=N.np.filter(o=>inV(o.z)&&(!fv||o.z.sc===fv));
  const n=items.length+np.length;const show=M.lbl==='num'&&n>0&&!!M.view&&!(M.meet&&M.meetSc);
  let h='';
  if(show){const RSK=typeof pendRestr==='function'?pendRestr():new Map();try{computeCross()}catch(e){}
    h=`<button class="mlh" id="mlegt" title="${M.leg?'Ocultar':'Mostrar'} la leyenda"><b>Leyenda</b><span>${n}</span><em>${M.leg?'▾':'▸'}</em></button>`;
    if(M.leg){h+='<div class="mll">';let last='';
      for(const it of items){const zs=it.zones.filter(inV);const c=cu?STC[zSt(zs[0])]:conOf(it.sc).color;const cx=cxVis()&&zs.some(z=>CROSS.ids.has(z.id));const rs=!!RSK.get(it.id);
        if(it.sc!==last){h+=`<div class="mlsc" style="--c:${conOf(it.sc).color}"><i></i>${esc(conOf(it.sc).name)}</div>`;last=it.sc}
        h+=`<button class="mlr" data-lz="${zs.map(z=>z.id).join(',')}"><i class="nbi${lum(c)>.55?' lt':''}${cx?' rx':rs?' rr':''}" style="--c:${c}">${it.n}</i><span><b>${esc(it.x.name)}</b><small>${esc(it.a?it.a.code+' · '+it.a.name:'')}</small></span>${rs?'<em title="Restricción pendiente">⛔</em>':''}${cx?`<em class="lcx" data-lcx="${zs.map(z=>z.id).join(',')}" role="button" title="Ver con quién comparte el lugar">⚠</em>`:''}</button>`}
      {const sn=npSeenHtml('mlr');if(sn)h+=`<div class="mlsc">Visto en obra · no programado</div>${sn}`}
      if(np.length){h+=`<div class="mlsc">Trabajo no programado</div>`;for(const o of np){const c=conOf(o.z.sc).color;h+=`<button class="mlr" data-lz="${o.z.id}"><i class="nbi np" style="--c:${c}">${o.l}</i><span><b>${esc(o.z.desc||'Sin descripción')}</b><small>${esc(conOf(o.z.sc).name)}</small></span></button>`}}
      h+='</div>'}}
  if(el.dataset.h!==h){const sc=el.querySelector('.mll');const st=sc?sc.scrollTop:0;el.innerHTML=h;el.dataset.h=h;const sc2=el.querySelector('.mll');if(sc2)sc2.scrollTop=st}
  el.hidden=!show;el.classList.toggle('col',!M.leg)}
function viewPop(btn){const on=(c)=>c?' class="on"':'';
  openPop(btn,`<div class="ph">Cómo se ve el plano</div>
   <div class="ptx">Etiquetas de las zonas</div><div class="pseg"><button data-do="ln"${on(M.lbl==='num')}>Números + leyenda</button><button data-do="lt"${on(M.lbl==='name')}>Nombres</button></div>
   <div class="ptx">Plano de fondo</div><div class="pseg"><button data-do="b1"${on(M.bop>=.95)}>Normal</button><button data-do="b5"${on(M.bop<.95&&M.bop>.4)}>Tenue</button><button data-do="b3"${on(M.bop<=.4)}>Muy tenue</button></div>
   <div class="ptx">Leyenda</div><div class="pseg"><button data-do="gs"${on(M.leg)}>Mostrar</button><button data-do="gh"${on(!M.leg)}>Ocultar</button></div>
   ${(()=>{const AR=typeof canWrite!=='undefined'&&canWrite?[...LAM.values()].filter(l=>l.pisoId===M.piso&&l.arch):[];return AR.length?`<div class="ptx">Láminas archivadas</div>${AR.map(l=>`<button data-do="lr_${esc(l.id)}">↺ Recuperar «${esc(lname(l))}»<small> · ${esc(l.arch.n||'')}</small></button>`).join('')}`:''})()}`,
   {...Object.fromEntries([...LAM.values()].filter(l=>l.arch).map(l=>['lr_'+l.id,()=>lamRestore(l.id)])),ln:()=>{M.lbl='num';savePV();requestRender()},lt:()=>{M.lbl='name';savePV();requestRender()},b1:()=>{M.bop=1;savePV();requestRender()},b5:()=>{M.bop=.5;savePV();requestRender()},b3:()=>{M.bop=.28;savePV();requestRender()},gs:()=>{M.leg=true;savePV();requestRender()},gh:()=>{M.leg=false;savePV();requestRender()}})}
function legClick(e){const t=e.target;let b;
  if(t.closest('#mview')){viewPop(t.closest('#mview'));return true}
  if(t.closest('#mlegt')){M.leg=!M.leg;savePV();requestRender();return true}
  if((b=t.closest('[data-lcx]'))){const L=cxOfIds(b.dataset.lcx.split(','));if(L.length){openPop(b,`<div class="ph">Interferencia</div>${cxInfoHtml(L,'data-do')}`,{});
      pop.onclick=e2=>{const q=e2.target.closest('[data-do]');if(!q)return;const ids=q.dataset.do.split('|');const c=CROSS.list.find(k=>k.a.id===ids[0]&&k.b.id===ids[1]);closePop();if(c&&typeof canWrite!=='undefined'&&canWrite)crossPop(b,c);else if(c)zoomTo([...unflat(c.a.pts),...unflat(c.b.pts)])}}return true}
  if((b=t.closest('[data-lz]'))){const ids=b.dataset.lz.split(',');const P=ids.flatMap(id=>{const z=PD.get(id);return z?unflat(z.pts):[]});if(P.length)zoomTo(P);M.hlk='';setHL(ids);clearTimeout(M.hlT);M.hlT=setTimeout(()=>setHL(null),1800);return true}
  return false}
function legHover(e){if(M.tmp||PHONE())return;const b=e.target.closest&&e.target.closest('.pvl[data-z],[data-lz]');if(b&&b.classList.contains('txt'))return;
  if(b)clearTimeout(M.hlT);setHL(b?(b.dataset.lz?b.dataset.lz.split(','):hlIds(b.dataset.z)):null)}

/* ---------- exportable con el formato de obra (Plan de trabajo de obra) ---------- */
const DR_LOGO='data:image/png;base64,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';
const DR_DEF={titulo:'PLAN DE TRABAJO DE OBRA',codigo:'GP-PR02-F-40',version:'1.0',vigencia:'19/02/2026',realizado:'ROMINA VASQUEZ / ALEXANDER PRINCIPE',revisado:'ING. HUGO CASTILLO',proyecto:'CONSORCIO PP-911',ubicacion:'CHORRILLOS - EL SOL',misc:'ARMADO DE ANDAMIOS | glb | 1\nIZAJE DE MATERIALES VARIOS | glb | 1\nORDEN Y LIMPIEZA DE OBRA | glb | 1'};
let DR_LOCAL=null;
const drCfg=()=>({...DR_DEF,...(P().dr||{}),...(DR_LOCAL||{})});
const DR_COL=['#4472C4','#C55A11','#70AD47','#2F5597','#1F3864','#009999','#00B050','#7030A0','#BF8F00','#C00000'],DR_MISC='#92D050';
const dayUp=d=>`${DOWN_[(pd(d).getUTCDay()+6)%7].toUpperCase()} ${d.slice(8,10)}.${d.slice(5,7)}.${d.slice(0,4)}`;
const hexRGB=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const n=m?parseInt(m[1],16):0x888888;return[n>>16&255,n>>8&255,n&255]};
const f2=v=>v==null||v===''?'':(typeof v==='number'?v.toFixed(2):String(v));
function drData(d){const ps=typeof pisos==='function'?pisos():[...S.pis.values()].sort((a,b)=>(a.order||0)-(b.order||0));const groups=[];let gi=0;
  for(const p of ps){const cur=d===M.date;const sh=cur?shapesOf(p.id):[...PD.values()].filter(z=>z.pisoId===p.id);const nova=new Set([...sh.filter(z=>z.kind==='nova').map(z=>z.actId),...(cur?noGoSet():[])]);
    const acts=dayActs(p.id,d).filter(o=>!nova.has(o.x.id));const np=sh.filter(z=>z.kind==='zona'&&!z.actId);if(!acts.length&&!np.length)continue;gi++;const rows=[];let k=0;
    const cd=()=>{k++;return`${gi}.${String(k).padStart(2,'0')}`};
    for(const{x,a}of acts){const q=(x.qty||{})[d];rows.push({code:cd(),x,a,sc:x.sc,desc:`${x.name} - ${a.name}`.toUpperCase(),und:x.und||'',met:q!=null&&q!==''?+q:null,zones:sh.filter(z=>z.kind==='zona'&&z.actId===x.id)})}
    for(const z of np)rows.push({code:cd(),x:null,a:null,sc:z.sc,desc:`${z.desc||'Trabajo no programado'} (no programado)`.toUpperCase(),und:'',met:null,zones:[z]});
    groups.push({n:gi,p,title:(p.name||p.code||'').toUpperCase(),rows,color:DR_COL[(gi-1)%DR_COL.length]})}
  const misc=String(drCfg().misc||'').split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(a=>a[0]).map((a,i)=>({code:`${gi+1}.${String(i+1).padStart(2,'0')}`,desc:a[0].toUpperCase(),und:a[1]||'',met:a[2]==null||a[2]===''?null:(isNaN(+a[2])?a[2]:+a[2])}));
  return{groups,misc,miscN:gi+1}}
/* un plano por piso (y vista) con las zonas numeradas con el ítem del listado (y uno por SC si se pide).
   Antes se guardaban todos los lienzos (~3300×2000 px, 19–32 MB cada uno) hasta armar el PDF/Excel y se cargaba la lámina
   en calidad completa (hasta 40 MP): en una tablet se cerraba la pestaña. Ahora va piso por piso: se dibuja, se pasa a JPEG
   al momento (drImg) y se suelta el lienzo antes del siguiente; la lámina liviana se usa si alcanza (drQ) y entre planos
   se cede a la pantalla (el botón muestra el avance). */
const DR_W=3300;
/** lámina para el exporte: la liviana ('l', ~3000 px) si alcanza para el ancho de salida con el recorte de las zonas (o en
    tablet/celular, que ya la usan en pantalla); si no, la completa ('f'). En la PC el resultado se ve igual. */
function drQ(v,pid,scs){if(!v.nl)return'f';if(!useHi())return'l';const lw=v.lw||Math.min(v.w||0,LITE);if(!lw||!v.w)return'f';const T=v.T||I;const s_=Math.hypot(T.a,T.b)||1;
  const B0=boundsOf({...v,T});const Z=shapesOf(pid).filter(z=>z.kind==='zona'&&zVista(z)===v.id);let need=0;
  for(const sc of scs){const B=cropBox(B0,Z.filter(z=>!sc||z.sc===sc));need=Math.max(need,DR_W*s_*v.w/B.w)}return lw*1.25>=need?'l':'f'}
/** el lienzo pasa a imagen (PDF: JPEG del lienzo; Excel: JPEG de 2400 px) y se suelta al momento */
function drImg(cv,kind){const w=cv.width,h=cv.height;let url;
  if(kind==='xlsx'){const sm=document.createElement('canvas');sm.width=2400;sm.height=Math.round(2400*h/w);sm.getContext('2d').drawImage(cv,0,0,sm.width,sm.height);url=sm.toDataURL('image/jpeg',.9);sm.width=sm.height=0}
  else url=cv.toDataURL('image/jpeg',.9);
  cv.width=cv.height=0;return{url,w,h}}
const drYield=()=>new Promise(r=>setTimeout(r,0));
async function drPlans(D,opt,say,kind){const jobs=[];
  for(const g of D.groups){const zl=new Map();g.rows.forEach(r=>r.zones.forEach(z=>zl.set(z.id,r.code)));if(!zl.size)continue;
    const vistas=basesOf(g.p.id);
    for(const v of vistas){const zv=[...PD.values()].filter(z=>z.pisoId===g.p.id&&z.kind==='zona'&&zVista(z)===v.id);if(!zv.some(z=>zl.has(z.id)))continue;
      const pairs=crossPairs(zv);const vn=vistas.length>1?' · '+lname(v).toUpperCase():'';
      const ent=g.rows.filter(r=>r.zones.some(z=>zVista(z)===v.id));const L=[{title:g.title+vn,ent,sc:''}];
      if(opt.perSc){const scs=[...new Set(ent.map(r=>r.sc))].sort((a,b)=>nat(conOf(a).name,conOf(b).name));
        for(const sc of scs)L.push({title:g.title+vn+' · '+conOf(sc).name,sc,ent:ent.filter(r=>r.sc===sc)})}
      jobs.push({g,v,zl,pairs,L})}}
  const tot=jobs.reduce((n,j)=>n+j.L.length,0);let k=0;const out=[];
  for(const j of jobs){let im=await loadImgEl(await imgURL(j.v,drQ(j.v,j.g.p.id,j.L.map(o=>o.sc))));
    for(const o of j.L){say&&say(`Dibujando ${j.g.title}${o.sc?' · '+conOf(o.sc).name:''}…`,++k,tot);
      const cv=await renderPlanCanvas(j.v,{pid:j.g.p.id,im,W:DR_W,R:54,nums:{zl:j.zl},pairs:j.pairs,...(o.sc?{scOnly:o.sc}:{})});
      out.push({g:j.g,v:j.v,title:o.title,...(o.sc?{sc:o.sc}:{}),ent:o.ent,pairs:j.pairs,img:drImg(cv,kind)});await drYield()}
    im=null}
  return out}
/* avance del exporte en el botón «Exportar…» (se mantiene aunque la pantalla se vuelva a dibujar) */
let DRPROG='';
function drProg(t){DRPROG=t;const b=$('#mpdf');if(b){b.textContent=t||'Exportar…';b.disabled=!!t}}
async function exportDR(kind,opt){if(DRPROG)return;const d=M.date;const D=drData(d);if(!D.groups.length){toast('No hay actividades programadas este día.');return}
  const K=kind==='xlsx'?'Excel':'PDF';const say=(m,k,n)=>{toast(m);if(n)drProg(`${K} ${k}/${n}…`)};say(`Generando ${K}…`);drProg(`${K}…`);
  try{const plans=opt.plans?await drPlans(D,opt,say,kind):[];drProg(`Armando ${K}…`);await drYield();if(kind==='xlsx')await drXlsx(D,d,plans);else await drPdf(D,d,plans)}
  catch(err){console.error(err);toast('No se pudo generar: '+(err.message||err))}
  finally{drProg('')}}
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
    const y0=Mg+17,availW=Wl-2*Mg,availH=Hl-y0-Mg-legH-6;const ratio=pl.img.w/pl.img.h;const iw=Math.min(availW,availH*ratio),ih=iw/ratio;const x0=Mg+(availW-iw)/2;
    doc.addImage(pl.img.url,'JPEG',x0,y0,iw,ih);pl.img.url=null;doc.setLineWidth(.2);doc.setDrawColor(150);doc.rect(x0,y0,iw,ih);
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
    const wpx=1500,hpx=Math.round(wpx*pl.img.h/pl.img.w);
    const iid=wb.addImage({base64:pl.img.url,extension:'jpeg'});pl.img.url=null;s.addImage(iid,{tl:{col:0,row:3},ext:{width:wpx,height:hpx}});
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
function novaOf(d,aid){for(const z of PD.values())if(z.kind==='nova'&&z.date===d&&z.actId===aid&&!z.draft)return z;return null}
function novaSet(d){return new Set([...PD.values()].filter(z=>z.kind==='nova'&&z.date===d&&!z.draft).map(z=>z.actId))}
/* cruces de un piso, memorizados por piso: la clave es la de shapesOf (día, PDV, DV, DONEV, láminas) más el piso elegido,
   porque las decisiones (xdIdx) se leen del piso elegido (auditoría de código 08/10, P1). No mutar lo que devuelve. */
const CXO=new Map();
function crossOf(pid){shapesOf(pid);const k=M.piso+'|'+(SHC.get(pid)||{}).k;const c=CXO.get(pid);if(c&&c.k===k)return c.L;const L=crossOf_(pid);if(CXO.size>40)CXO.clear();CXO.set(pid,{k,L});return L}
function crossOf_(pid){const out=[];const zs=shapesOf(pid).filter(z=>z.kind==='zona');const vs=[...new Set(zs.map(z=>zVista(z)))];const ZL_=planNumbering(null,pid).zl;
  vs.forEach(v=>crossPairs(zs.filter(z=>zVista(z)===v)).list.forEach(c=>out.push({a:zNo(c.a,ZL_)+conOf(c.a.sc).name+': '+zoneLabel(c.a),b:zNo(c.b,ZL_)+conOf(c.b.sc).name+': '+zoneLabel(c.b)})));return out}
function zonedSet(pid){return new Set(shapesOf(pid).filter(z=>z.kind==='zona'&&z.actId).map(z=>z.actId))}
function capPlan(host,o){const bs=basesOf(o.pid);if(o.onEmpty)znLoad(o.pid);const zsAll=o.zones||shapesOf(o.pid).filter(z=>z.kind==='zona');const mine=zsAll.filter(z=>z.actId&&o.colors.has(z.actId));
  if(!lamReady){if(!host._v)host.innerHTML='<div class="kemp">Cargando plano…</div>';return}
  if(!bs.length){host.innerHTML=`<div class="kemp">Este piso todavía no tiene plano cargado.${o.empty!=null?' '+o.empty:(typeof canWrite!=='undefined'&&canWrite?' Súbelo en <b>Sectorización</b>.':'')}</div>`;host._v=null;host._fk='';return}
  let base=bs[0],best=-1;bs.forEach(b=>{const n=mine.filter(z=>zVista(z)===b.id).length;if(n>best){best=n;base=b}});
  let v=host._v;if(!v||!host.contains(v.svg)){host.innerHTML='';host._fk='';v=Viewer(host,{onTap:(w,e)=>{const el=document.elementsFromPoint(e.clientX,e.clientY).map(q=>q.closest&&q.closest('[data-z]')).find(Boolean);const oo=host._o||o;
    const pt={x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10,v:host._base||''};
    /* doble toque rápido en cualquier lugar (también sobre una actividad de otro SC): trabajo no programado */
    /* con mouse (laptop) el doble clic sobre una actividad abre la actividad, no el no programado: en la PC es costumbre hacer doble clic */
    const mouse=e&&e.pointerType==='mouse';const onAct=(()=>{const zid=el?el.dataset.z:'';if(!zid||zid.startsWith('np:'))return false;const z=(oo.zones?oo.zones.find(q=>q.id===zid):zget(zid));return!!(z&&z.actId&&oo.colors.has(z.actId))})();
    const t=performance.now(),L=host._lt;if(oo.onDbl&&L&&t-L.t<350&&Math.hypot(e.clientX-L.x,e.clientY-L.y)<30&&!(mouse&&onAct)){clearTimeout(host._tt);host._lt=null;oo.onDbl(pt);return}
    host._lt={t,x:e.clientX,y:e.clientY};
    const run=()=>{const zid=el?el.dataset.z:'';if(zid&&zid.startsWith('np:')){if(oo.onMark)oo.onMark(zid.slice(3));return}
      /* con «＋ No programado» armado, cualquier lugar (aunque tenga una actividad) registra el no programado */
      if(oo.npAll&&oo.onEmpty){oo.onEmpty(pt);return}
      const z=el&&(oo.zones?oo.zones.find(q=>q.id===zid):zget(zid));if(z&&z.actId&&oo.colors.has(z.actId)){oo.onPick(z.actId,z,pt);return}
      /* toque en un lugar sin actividad programada: trabajo no programado */
      if(oo.onEmpty)oo.onEmpty(pt)};
    /* con doble toque activo, el toque simple espera un instante por si llega el segundo */
    clearTimeout(host._tt);if(oo.onDbl&&!(mouse&&onAct))host._tt=setTimeout(run,300);else if(!(mouse&&onAct&&L&&t-L.t<350&&$('#ksheet')))run()}});host._v=v}host._o=o;host._base=base.id;
  const url=IMG.get(base.id+'|'+base.rev+'|l')?.url||null;if(!url)imgURL(base,'l',{auto:true}).then(()=>{if(U.tab==='cap'||U.tab==='dash'||U.tab==='campo'||U.tab==='lib'||U.tab==='planos')requestRender()}).catch(()=>{});
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
  if(v._svgH!==svg){v.svg.innerHTML=svg;v._svgH=svg}v.labels=labels;v.apply()}

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
  const q=useHi()?'f':'l';const url=IMG.get(base.id+'|'+base.rev+'|'+q)?.url||null;if(!url)imgURL(base,q,{auto:true}).then(()=>{if(U.tab==='planos')requestRender()}).catch(()=>{});
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
  if(v._svgH!==svg){v.svg.innerHTML=svg;v._svgH=svg}v.labels=labels;v.handles=o.edit&&!o.draw?ambHandles(unflat(o.edit.pts)):[];v.apply();return base}
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
const PBC={k:'',v:null}; /* «No cumplidas sin reprogramar» memorizadas (auditoría de código 08/10, P4) */
function renderPlan(main,cur,base){
  const scs=scsOfDay();const role=myRole();
  if(role==='sc'){const ms=myScs();if(!ms.includes(M.scDraw))M.scDraw=ms[0]||''}/* el SC elegido también es el filtro: se mantiene aunque no se pueda dibujar (celular, lector); dibujar lo controla canPlan al empezar */else if(M.scDraw&&!S.con.has(M.scDraw))M.scDraw='';
  const acts=dayActs(M.piso,M.date);const sh=shapesOf(M.piso);
  const zBy={},nBy={};sh.forEach(z=>{if(z.kind==='zona'&&z.actId)(zBy[z.actId]=zBy[z.actId]||[]).push(z);if(z.kind==='nova')nBy[z.actId]=z});
  const stat=sc=>{const L=acts.filter(o=>o.x.sc===sc);return{n:L.length,ok:L.filter(o=>zBy[o.x.id]).length,no:L.filter(o=>nBy[o.x.id]).length}};
  const NBM=nbMap();const sc=M.scDraw;const mine=acts.filter(o=>o.x.sc===sc);const np=sh.filter(z=>z.kind==='zona'&&!z.actId&&z.sc===sc);const notes=sh.filter(z=>['trazo','flecha','texto'].includes(z.kind)&&z.sc===sc);
  const canD=canPlan(sc);const withPrev=mine.filter(o=>!zBy[o.x.id]&&!nBy[o.x.id]&&ZN.get(o.x.id));
  const st=sc?stat(sc):null;
  /* no cumplidas en días anteriores y aún sin reprogramar (solo al planificar hoy o días futuros).
     Solo las de la semana en curso: lo de semanas anteriores ya se reprogramó en la reunión semanal. Ocultarlas no toca los registros (el PPC no cambia). */
  const w0_=weekDays(weekOf(todayIso()))[0];
  /* memorizado: failInfo revisa 10 días atrás por actividad y esto corría en cada dibujo (auditoría de código 08/10, P4).
     Depende de los datos (DV), los registros/cierres (DONEV), el piso, el día y hoy. No mutar lo memorizado. */
  const pbk=M.piso+'|'+M.date+'|'+todayIso()+'|'+DV+'|'+(typeof DONEV!=='undefined'?DONEV:0);if(PBC.k!==pbk){const pb={};
    if(M.date>=todayIso()&&typeof failInfo==='function')for(const x of S.act.values()){const a=S.amb.get(x.ambId);const s_=a&&S.sec.get(a.sectorId);if(!s_||s_.pisoId!==M.piso)continue;const f=failInfo(x,M.date);if(f&&f.d>=w0_)(pb[x.sc]=pb[x.sc]||[]).push({x,a,f})}
    PBC.k=pbk;PBC.v=pb}const pendBy=PBC.v;
  let h=`<div class="mp-h"><b>Plan del día</b><span>${DOWN_[(pd(M.date).getUTCDay()+6)%7]} ${fmtD(M.date)} · ${esc(S.pis.get(M.piso)?.code||'')}</span><button class="ab" id="mpx" aria-label="Cerrar panel">&times;</button></div>`;
  if(PHONE()){if(M.tool!=='pan')M.tool='pan';h+=`<p class="mp-ph">En el celular el plano es de consulta: toca una zona para ver su estado${typeof canDaily!=='undefined'&&canDaily?' o marcar ✓ ½ ✗':''}. Para dibujar el plan usa una PC o tablet.</p>`}
  h+=pubBarHtml();
  if(M.pdErr)h+=`<div class="callout">No se pudo leer el plan del día (${esc(M.pdErr)}). Si acabas de actualizar la página, faltan las reglas nuevas de Firestore.</div>`;
  /* filtro por subcontratista (el elegido es también con quién se dibuja «solo una parte») */
  {const opts=role==='sc'?myScs():scs;if(opts.length>1||!sc)h+=`<div class="dzf">${role==='sc'?'':`<button class="${!sc?'on':''}" data-dzsc="">Todos</button>`}${opts.map(c=>`<button class="${scSel_().includes(c)?'on':''}" data-dzsc="${c}" title="Clic: solo esta partida · Ctrl+clic: sumar o quitar varias" style="--c:${conOf(c).color}"><i></i>${esc(conOf(c).name)}</button>`).join('')}</div>`;
    else h+=`<div class="mp-sc" style="--c:${conOf(sc).color}"><i></i><b>${esc(conOf(sc).name)}</b></div>`}
  const SF=M.meet?(M.meetSc?M.meetSc.split(','):[]):scSel_();const inSF=c=>!SF.length||SF.includes(c);const L=acts.filter(o=>inSF(o.x.sc));const nNo=L.filter(o=>nBy[o.x.id]).length,nSin=L.filter(o=>!nBy[o.x.id]&&!zBy[o.x.id]).length;
  h+=`<div class="mp-prog"><span><b>${L.length-nNo}</b> van${M.date>todayIso()?'':' hoy'}</span>${nNo?`<span class="no">${nNo} no van</span>`:''}${nSin?`<span class="no">${nSin} sin ubicar</span>`:''}${sc?`<label class="chk"><input type="checkbox" id="mscv"${U.pdHi!==false?' checked':''}> Resaltar solo ${esc(scSel_().map(c=>conOf(c).name).join(' + '))}</label>`:''}</div>`;
  try{computeCross()}catch(e){}
  {const cxs=CROSS.list.filter(c=>inSF(c.a.sc)||inSF(c.b.sc));let ch='';
    if(cxs.length)ch=`<button class="mcxh" data-cxtog="1" aria-expanded="${M.cxOpen?'true':'false'}">⚠ Dos partidas en el mismo lugar <b>${cxs.length}</b><span>${M.cxOpen?'▴':'▾'}</span></button><button class="lnkb cxvt" data-cxv="1">${!cxVis()?'▨ Mostrar el achurado en el plano':'▨ Ocultar el achurado del plano'}</button>${M.cxOpen?`<div class="mcxl">`+(ZL_=>cxs.map(c=>{const me_=sc&&c.b.sc===sc?c.b:c.a,o=me_===c.a?c.b:c.a;return`<button class="mp-cx" data-pcx="${me_.id}|${o.id}">${zNoH(me_,ZL_)} <b>${esc(conOf(me_.sc).name)}</b>: ${esc(zoneLabel(me_))} ↔ ${zNoH(o,ZL_)} <b>${esc(conOf(o.sc).name)}</b>: ${esc(zoneLabel(o))}<small>${typeof canWrite!=='undefined'&&canWrite?'Toca para revisar y decidir':'Toca para verlo en el plano'}</small></button>`}).join(''))(NBZ())+'</div>':''}`;
    const eng=dzEng()&&!PHONE();
    if(M.rvx)ch=`<div class="mrvx"><b>🔍 Revisando cruces</b><span>${cxs.length?`quedan ${CROSS.list.length}`:'todos revisados'}</span><button class="ib" data-rvx="go">Abrir el actual</button><button class="ib" data-rvx="stop">Terminar</button></div>`+ch;
    else if(eng&&CROSS.list.length&&!M.meet)ch=`<p class="mrvh">${PHONE()||!matchMedia('(pointer:fine)').matches?'Toca':'Clic derecho en'} el <b>achurado rojo</b> en el plano o un cruce de la lista para decidirlo, en el orden que quieras.</p><button class="ib mrvgo" data-rvx="start" title="Recorre los cruces uno por uno y decide: a la vez, quién va primero o no va">▶ Recorrer uno por uno (${CROSS.list.length})</button>`+ch;
    /* lo ya revisado (antes o durante la reunión): se ve plegado; el ingeniero lo puede reabrir */
    const XR=xokOf(M.piso,M.date);if(XR.length){const nmK=k=>{if(k.startsWith('a:')){const x=S.act.get(k.slice(2));return x?conOf(x.sc).name+' · '+short(x.name,26):'(actividad)'}const z=zget(k.slice(2));return z?conOf(z.sc).name+' · '+short(z.desc||'no programado',26):'(zona)'};
      ch+=`<button class="mcxh2" data-cxrtog="1" aria-expanded="${M.cxrOpen?'true':'false'}">✓ Cruces revisados <b>${XR.length}</b><span>${M.cxrOpen?'▴':'▾'}</span></button>${M.cxrOpen?`<div class="mcxl">${XR.sort((a,b)=>(a.ts||0)-(b.ts||0)).map(d=>`<div class="mp-cxr"><div>${(d.ord||d.keys||[]).map(nmK).map(esc).join(d.ord?' → ':' ↔ ')}</div><small>${d.ord?'Orden decidido':'Pueden trabajar a la vez'} · ${esc(d.byName||d.n||'')} ${hhmm(d.ts)}</small>${eng?`<button class="lnkb" data-xreo="${d.id}" title="Vuelve a quedar como cruce pendiente">Reabrir</button>`:''}</div>`).join('')}</div>`:''}`}
    const cb=$('#mcxb');if(cb){if(cb.dataset.h!==ch){cb.innerHTML=ch;cb.dataset.h=ch}cb.hidden=!ch||(!!M.meet&&M.mmode!=='plan')}}
  /* propuestas del día por decidir (todas las partidas: es lo que se ve en la reunión) */
  {const eng=dzEng();const mySc=role==='sc'?new Set(myScs()):null;const P_=[...PD.values()].filter(z=>z.kind==='dprop'&&z.st==='pend'&&z.pisoId===M.piso&&(!mySc||mySc.has(z.sc))&&(!M.meet||scIn(M.meetSc,z.sc))&&S.act.has(z.actId));
    let ph='';if(P_.length){const op_=M.pdOpen!==false;ph=`<button class="mpdh" data-pdtog="1" aria-expanded="${op_}">${eng?'Por decidir en la reunión':'Tus propuestas'} <b>${P_.length}</b><span>${op_?'▴':'▾'}</span></button>`;
      if(op_)ph+=`<div class="mpdl">${P_.sort((a,b)=>conOf(a.sc).name.localeCompare(conOf(b.sc).name)).map(p=>{const y=S.act.get(p.actId);const ay=S.amb.get(y.ambId);
        return`<div class="mpdi" style="--c:${conOf(p.sc).color}"><button class="mpdt" data-see="${(shapesOf(M.piso).find(z=>z.kind==='zona'&&z.actId===y.id)||{}).id||''}"><span class="mono">${esc(ay?ay.code:'')}</span> ${esc(short(y.name,30))}<small>${esc(conOf(p.sc).name)} · ${esc(dpText(p))}</small></button>${eng?`<span class="dzpb"><button class="ib pri" data-dpa="${p.id}" title="Decidir: aceptar lo propuesto o mantener que va">Revisar</button></span>`:''}</div>`}).join('')}</div>`}
    const pb=$('#mpdb');if(pb){if(pb.dataset.h!==ph){pb.innerHTML=ph;pb.dataset.h=ph}pb.hidden=!ph}}
  {const box=(id,h_)=>{const el=$('#'+id);if(!el)return;if(el.dataset.h!==h_){el.innerHTML=h_;el.dataset.h=h_}el.hidden=!h_};
    box('mchb',chHtml(M.meet?M.meetSc:sc));box('mfzb',fzBoxHtml(role,M.meet?M.meetSc:SF.join(',')));const cq=$('#mcqb');if(cq){const qh=cqBarHtml(role);if(cq.dataset.h!==qh){cq.innerHTML=qh;cq.dataset.h=qh}cq.hidden=!qh||!!M.meet}}
  h+=fzCardHtml(role,sc);
  const dcan=dzCan;let lastS='';
  h+=`<div class="mp-list dzl">${L.map(({x,a,s})=>{const zs=zBy[x.id],nv=nBy[x.id];const can=dcan(x);const geoOk=a.geo&&Object.values(a.geo).some(g=>g&&g.length>=6);
      let hh='';if(s.id!==lastS){lastS=s.id;hh=`<div class="dzs">${esc(s.code)} · ${esc(s.name)}</div>`}
      return hh+`<div class="mp-it dz ${nv?'nv':dpPend(x.id)?'wait':zs?'ok':''}" data-act="${x.id}" style="--c:${conOf(x.sc).color}"><div class="t"><span class="mono">${esc(a.code)}</span> ${esc(x.name)}<small>${esc(conOf(x.sc).name)} · ${esc(a.name)}${hasQ(x)?` · ${fq((x.qty||{})[M.date])} ${esc(x.und||'')}`:''}</small>${(typeof restrPend==='function'?restrPend(x.id):[]).map(r=>`<div class="rsk">⚠ Restricción pendiente · ${esc(rTxt(r))}</div>`).join('')}</div>
       <div class="s">${nv?`<span class="pill no">No va · ${esc(nv.motivo||'')}${nv.repTo?' · → '+fmtD(nv.repTo):''}</span>${(nv.k||nv.eng?dzEng():can)?`<button class="lnkb" data-undo="${nv.id}">Vuelve a ir</button>`:''}`
        :`${nbHtml(NBM,x.id)}${dvHtml(x,can)}
          <span class="dzu">${zs?(zs[0].virt?`<button class="lnkb" data-see="${zs[0].id}">en su ambiente</button>`:`<span class="pill ok">${zs.length>1?zs.length+' áreas dibujadas':'zona dibujada'}</span><button class="lnkb" data-see="${zs[0].id}">Ver</button>`):geoOk?'':`<span class="mu">Ambiente sin ubicar</span>${canWrite?`<button class="lnkb" data-goszamb="${a.id}">Ubicarlo en Sectorización</button>`:''}`}${canPlan(x.sc)?(zs&&!zs[0].virt?`<button class="lnkb" data-put="${x.id}" title="Agregar otra área del mismo ambiente (o de otro) para esta actividad">＋ Otra área</button><button class="lnkb" data-redo="${x.id}" title="Dibujar la zona de nuevo: reemplaza ${zs.length>1?'las '+zs.length+' áreas anteriores':'la anterior'}">Redibujar</button>${geoOk?`<button class="lnkb" data-zamb="${x.id}" title="Quitar la zona dibujada: vuelve a ocupar todo su ambiente">Volver a su ambiente</button>`:''}`:`<button class="lnkb" data-put="${x.id}" title="Si solo ocupa una parte del ambiente o abarca varios">Solo una parte…</button>`):''}</span>`}</div></div>`}).join('')||`<div class="note" style="padding:8px 2px">${sc?esc(conOf(sc).name)+' no tiene':'No hay'} actividades programadas este día en este piso.</div>`}</div>`;
  if((canWrite||role==='sc')&&!dayLk())h+=`<button class="ib mp-all" id="dzadd" title="Agregar al día una actividad del lookahead que no estaba programada">+ Programar otra actividad este día</button>`;
  h+=paddHtml();
  {const pr=Object.entries(pendBy).filter(([k])=>inSF(k)).flatMap(([,v])=>v);
    if(pr.length){h+=`<div class="mp-sec">No cumplidas sin reprogramar (${pr.length})</div><div class="mp-list">${pr.sort((p,q)=>q.f.d.localeCompare(p.f.d)).map(({x,a,f})=>{const sal=repSaldo(x,f.d);
      return`<div class="mp-it rp"><div class="t"><span class="mono">${esc(a.code)}</span> ${esc(x.name)}<small>${esc(a.name)} · ${esc(conOf(x.sc).name)} · ${f.r.status==='partial'?'½ Parcial':'✗ No cumplido'} el ${DOWN_[(pd(f.d).getUTCDay()+6)%7].toLowerCase()} ${fmtD(f.d)}${f.r.cnc?' · '+esc(f.r.cnc):''}${sal!=null?` · saldo ${fq(sal)} ${esc(x.und||'')}`:''}</small></div>
       <div class="s">${canWrite?`<button class="ib pri" data-rep="${x.id}|${f.d}">Programar ${fmtD(M.date)}</button><button class="ib" data-repd="${x.id}|${f.d}">Otro día…</button><button class="ib" data-repe="${x.id}|${f.d}" title="Se hizo otro día aunque no estaba programada">✓ Ya se ejecutó…</button><button class="lnkb" data-repx="${x.id}|${f.d}" title="Ya no hace falta reprogramarla">Descartar</button>`:'<span class="mu">Pide al planificador que la reprograme</span>'}</div></div>`}).join('')}</div>`}}
  {const np=sh.filter(z=>z.kind==='zona'&&!z.actId&&inSF(z.sc));if(np.length||canD||canWrite)h+=`<div class="mp-sec">Trabajo no programado (planificado)</div>${np.map(z=>`<div class="mp-it np"><div class="t">${esc(z.desc||'')}<small>${esc(conOf(z.sc).name)}</small></div><div class="s"><button class="lnkb" data-see="${z.id}">Ver</button>${own(z)?`<button class="lnkb" data-delz="${z.id}">Quitar</button>`:''}</div></div>`).join('')}${canD||(canWrite&&!PHONE())?'<button class="lnkb" id="mnp">+ Agregar trabajo no programado</button>':''}`}
  {const sn=npSeenHtml('mp-it');if(sn)h+=`<div class="mp-sec">Visto en obra · no programado</div>${sn}`}
  if(sc&&notes.length)h+=`<div class="mp-sec">Notas y dibujos</div><div class="note">${notes.length} en el plano. Selecciónalos con ✋ para moverlos o borrarlos.</div>`;
  const pn=$('#mpanel');if(pn.dataset.h!==h){pn.innerHTML=h;pn.dataset.h=h}pn.hidden=!M.panel||!!M.meet;
  const tb=$('#mtools');const aligned=curAligned(cur,base);const sel=M.selId&&zget(M.selId);
  const th=`${TOOLS.map(([k,i,n,t])=>`<button class="mt${M.tool===k?' on':''}${k==='borrar'?' er':''}" data-tool="${k}" title="${t}" aria-label="${t}"${k!=='pan'&&(!canD||(!aligned&&k!=='borrar'))?' disabled':''}><span>${i}</span><small>${n}</small></button>`).join('')}<span class="mtsep"></span><button class="mt" id="mundo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"${HIST.length?'':' disabled'}><span>↶</span><small>Deshacer</small></button><button class="mt" id="mredo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer"${REDO.length?'':' disabled'}><span>↷</span><small>Rehacer</small></button>`;
  if(tb.dataset.h!==th){tb.innerHTML=th;tb.dataset.h=th}tb.hidden=!base||!!M.meet;
  const hint=M.pend?(M.pend.paId?(()=>{const n=paZones(M.pend.paId).length;return`Dibuja ${n?'otra área':'el área'} de <b>${esc(short(M.pend.desc||'',40))}</b>${n?` (${n} dibujada${n>1?'s':''})`:''}: arrastra un rectángulo, o elige ⬠ para un polígono. ${n?'<button class="ib pri" id="mpadone">✓ Listo</button>':''}<button class="lnkb" id="mcancel">${n?'Terminar':'Cancelar'}</button>`})():M.pend.actId?`Dibuja la zona de <b>${esc(short(S.act.get(M.pend.actId)?.name||'',40))}</b>: arrastra un rectángulo, o elige ⬠ para un polígono. <button class="lnkb" id="mcancel">Cancelar</button>`:`Dibuja dónde irá el trabajo no programado. <button class="lnkb" id="mcancel">Cancelar</button>`)
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
  renderMeet();drawOverlay();renderLeg();dockRender();requestAnimationFrame(mrsFit);if(ZC){if(U.tab!=='mapa'||(!M.meet&&M.colorBy!=='cu'&&!ZC.pl))zcClose();else zcRender()}}
const hasQ=x=>x&&x.metrado>0&&(x.qty||{})[M.date]!=null;
const fq=v=>(Math.round((+v||0)*100)/100).toLocaleString('es-PE');
/* ---------- decidir el plan del día: va / mañana / terminada / restricción ---------- */
const dzCan=x=>!!x&&!PHONE()&&!dayLk()&&((typeof canWrite!=='undefined'&&canWrite)||(myRole()==='sc'&&myScs().includes(x.sc)));
/* día cerrado (publicado, cerrado solo a la hora de cierre, hoy o pasado): no se decide ni se reprograma; las cuadrillas sí */
const dayLk=()=>typeof planLocked==='function'&&planLocked(M.date,M.piso);
const LOCKSEL='[data-dv],[data-dpa],[data-undo],[data-chu],[data-avx],[data-dpr],#dzadd';
function lockStop(t){if(!dayLk()||!t.closest(LOCKSEL))return false;{const c=t.closest('[data-chu]');const z=c&&PD.get(c.dataset.chu);if(z&&z.draft)return false}toast(`El plan del ${dvLbl(M.date)} ya está cerrado (${lockWhy(M.date,M.piso)}): no se cambia. ${M.date>todayIso()?'Para corregirlo, deshaz la publicación.':'Registra el cumplimiento; lo que no se haga se reprograma desde mañana.'}`);return true}
/* ---------- Plan del día: Va · No va · Culminado ----------
   El subcontratista propone (queda «en espera» en el plano); el ingeniero decide en la reunión. «No va» pide el motivo:
   restricción (¿se libera mañana a primera hora? sí: va con aviso · no: se registra y se reprograma) o personal (se
   reprograma). Reprogramar: fecha y «solo esta» o «todo el tren del ambiente» (las que siguen en el ambiente). */
const dpId=(d,aid)=>'dp_'+d+'_'+aid,avId=(d,aid)=>'av_'+d+'_'+aid;
const dpOf=aid=>PD.get(dpId(M.date,aid))||null,avOf=aid=>PD.get(avId(M.date,aid))||null;
const dpPend=aid=>{const p=dpOf(aid);return p&&p.st==='pend'?p:null};
/* deciden en el plan diario: el administrador; un ingeniero de producción en los pisos a su cargo (si el piso no tiene responsable, cualquiera) */
const dzEng=()=>{if(typeof canWrite==='undefined'||!canWrite)return false;if(typeof isPisoResp!=='function')return true;return isPisoResp(M.piso)};
const DPK={res:'Restricción',per:'Sin personal',fin:'Culminado'};
const dpText=p=>p.k==='fin'?'Culminado':`No va · ${nvcOf(p.k)?nvLbl(p.k)+(p.k==='fre'&&p.pred?' ('+conOf(p.pred).name+')':''):DPK[p.k]||'Restricción'}${p.desc?': '+p.desc:''}`;
const dvLbl=d=>`${DOWN_[(pd(d).getUTCDay()+6)%7].toLowerCase()} ${fmtD(d)}`;
function dvHtml(x,can){const p=dpOf(x.id);const pe=p&&p.st==='pend'?p:null;const av=avOf(x.id);const eng=dzEng();const st=pe?(pe.k==='fin'?'fin':'no'):'va';const sc=myRole()==='sc';
  let h=can?`<span class="dzseg" role="group" aria-label="¿Va?"><button class="dzv va${st==='va'?' on':''}" data-dv="va|${x.id}" title="Va según el lookahead">✓ Va</button><button class="dzv no${st==='no'?' on':''}" data-dv="no|${x.id}" title="No va: por restricción o por falta de personal">✗ No va</button><button class="dzv fin${st==='fin'?' on':''}" data-dv="fin|${x.id}" title="Ya terminó: se liberan los días que le quedan">✔ Culminado</button></span>`:'';
  if(pe)h+=`<div class="dzp"><span>${sc&&!eng?'Propusiste':'⏸ '+esc(conOf(pe.sc).name)+' propone'}: <b>${esc(dpText(pe))}</b>${sc&&!eng?' · lo decide el ingeniero en la reunión':''}</span>${eng?`<span class="dzpb"><button class="ib pri" data-dpa="${pe.id}" title="Decidir: aceptar lo propuesto o mantener que va">Revisar</button></span>`:''}</div>`;
  else if(p&&p.st==='rej')h+=`<div class="dzp rej">✗ ${esc(p.decN||'El ingeniero')} la mantiene: va según lo programado</div>`;
  if(av)h+=`<div class="dzav">⚠ Liberar a primera hora: ${esc(av.desc||'')}${eng?`<button class="ab" data-avx="${av.id}" aria-label="Quitar aviso" title="Quitar aviso">&times;</button>`:''}</div>`;
  return h}
/* ---------- Publicar el plan del día ----------
   Mientras el plan de un día futuro no se publica, lo que «no va» queda en el plan (nova con draft:true, ids y shift)
   y el lookahead no cambia. «Publicar plan» aplica todo junto al lookahead (un solo apply, se deshace junto),
   registra las restricciones y guarda pdz kind:'pub' id pub_<fecha>_<piso>. Después de publicar, cada cambio se aplica al momento.
   La semana congelada (PPC semanal) no se toca: guarda su propia foto de los compromisos. */
const pubId=(d,p)=>`pub_${d}_${p}`;
const pubOf=()=>PD.get(pubId(M.date,M.piso));
const pubDraft=()=>M.date>todayIso()&&!pubOf();
const draftsOf=()=>[...PD.values()].filter(z=>z.kind==='nova'&&z.draft&&z.pisoId===M.piso&&z.date===M.date);
/* ---------- Agregar al plan del día (oct 2026): trabajo no programado desde el ambiente ----------
   pdz kind:'padd' {date, pisoId, ambId, sc, t:'rep'|'adel'|'new', actId?, from?, q?, name?, und?, newId?, st:'ok'|'pend'|'rej', draft, by, byName, ts}
   rep = reprogramar a este día una actividad no ejecutada · adel = adelantar a este día el próximo día de una actividad ·
   new = actividad nueva (no prevista en el lookahead). El ingeniero lo deja aceptado (ok); el SC lo propone (pend) y el ingeniero
   decide. Se aplica al lookahead al publicar el plan (página: pubPlan · servidor: publishDrafts). */
const paddsOf=st=>[...PD.values()].filter(z=>z.kind==='padd'&&z.draft&&z.pisoId===M.piso&&z.date===M.date&&(!st||z.st===st));
function paddApply(y,zz,date){let days=[...(y.days||[])],qty={...(y.qty||{})};
  if(zz.t==='adel'){if(!days.includes(zz.from))return null;days=days.filter(d=>d!==zz.from);if(qty[zz.from]!=null){qty[date]=qty[zz.from];delete qty[zz.from]}}
  if(!days.includes(date))days.push(date);days.sort();if(zz.t==='rep'&&zz.q!=null&&zz.q!=='')qty[date]=+zz.q;return{days,qty}}
const paddCan=()=>(dzEng()||myRole()==='sc')&&!PHONE();
function paddAmbActs(ambId){return[...S.act.values()].filter(x=>x.ambId===ambId&&!x.arch&&(myRole()!=='sc'||myScs().includes(x.sc)))}
function paddDialog(anchor,ambId){const a=S.amb.get(ambId);if(!a)return;if(!paddCan()){toast('Lo agrega el ingeniero del piso o el subcontratista.');return}
  if(!pubDraft()){toast(pubOf()?'El plan de este día ya se publicó: no se agrega nada.':'Solo se agrega al plan de un día que aún no se publica (mañana en adelante).');return}
  const d=M.date;const taken=new Set(paddsOf().filter(z=>z.st!=='rej').map(z=>z.actId).filter(Boolean));
  const L=paddAmbActs(ambId).filter(x=>!(x.days||[]).includes(d)&&!taken.has(x.id)&&!(typeof doneOf==='function'&&doneOf(x)));
  const rep=L.map(x=>({x,f:typeof failInfo==='function'?failInfo(x,d):null})).filter(o=>o.f);
  const adel=L.map(x=>({x,nx:(x.days||[]).filter(z=>z>d).sort()[0]})).filter(o=>o.nx);
  const H=`<div class="ph">＋ Trabajo no programado · ${esc(a.code)} ${esc(a.name)}</div><div class="ptx">${dvLbl(d)}. Se aplica al lookahead al publicar el plan.${myRole()==='sc'?' Queda como propuesta: la decide el ingeniero.':''}</div>
    <div class="pab"><button data-do="rep"${rep.length?'':' disabled'}><b>↻ Reprogramar actividad no ejecutada</b><small>${rep.length?rep.length+' pendiente'+(rep.length>1?'s':'')+' en este ambiente':'Ninguna pendiente en este ambiente'}</small></button>
    <button data-do="adel"${adel.length?'':' disabled'}><b>⇤ Adelantar actividad programada</b><small>${adel.length?adel.length+' con días más adelante':'Nada programado más adelante aquí'}</small></button>
    <button data-do="new"><b>＋ Nueva actividad (no prevista en el LH)</b><small>Se crea en el lookahead con este día</small></button></div>`;
  openPop(anchor,H,{rep:()=>paddPick(anchor,ambId,'rep',rep.map(o=>({x:o.x,sub:`no se cumplió el ${fmtD(o.f.d)}`+(typeof repSaldo==='function'&&repSaldo(o.x,o.f.d)!=null?` · saldo ${fq(repSaldo(o.x,o.f.d))} ${o.x.und||''}`:''),from:o.f.d,q:typeof repSaldo==='function'?repSaldo(o.x,o.f.d):null}))),
    adel:()=>paddPick(anchor,ambId,'adel',adel.map(o=>({x:o.x,sub:`programada el ${fmtD(o.nx)}${(o.x.qty||{})[o.nx]!=null?' · '+fq(o.x.qty[o.nx])+' '+(o.x.und||''):''}`,from:o.nx}))),
    new:()=>paddNew(anchor,ambId)})}
function paddPick(anchor,ambId,t,L){const H=`<div class="ph">${t==='rep'?'↻ Reprogramar a este día':'⇤ Adelantar a este día'}</div>${PHONE()?'':'<label class="chk paz"><input type="checkbox" id="pazona"> Solo una parte del ambiente (dibujar el área)</label>'}<div class="pal">${L.map((o,i)=>`<button data-do="p${i}"><i class="zcsc" style="--c:${conOf(o.x.sc).color}"></i><b>${esc(o.x.name)}</b><small>${esc(conOf(o.x.sc).name)} · ${esc(o.sub)}</small></button>`).join('')}</div>`;
  const hs={};L.forEach((o,i)=>hs['p'+i]=()=>paddSave({t,ambId,sc:o.x.sc,actId:o.x.id,from:o.from,q:o.q??null,name:o.x.name,draw:!!($('#pazona')||{}).checked}));setTimeout(()=>openPop(anchor,H,hs),0)}
function paddNew(anchor,ambId){const scs=myRole()==='sc'?myScs():[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>c.id);
  const H=`<div class="ph">＋ Nueva actividad · no prevista</div><label class="ptx">Subcontratista</label><select id="pasc" class="tin">${scs.length>1?'<option value="">— elige —</option>':''}${scs.map(c=>`<option value="${c}">${esc(conOf(c).name)}</option>`).join('')}</select>
    <label class="ptx">Actividad</label><input id="panm" class="tin" placeholder="Qué se hará" autocomplete="off"><div class="pa2"><input id="paq" class="tin" inputmode="decimal" placeholder="Cantidad (opcional)"><input id="paund" class="tin" placeholder="Und"></div>
    ${PHONE()?'':'<label class="chk paz"><input type="checkbox" id="pazona"> Solo una parte del ambiente (dibujar el área)</label>'}<div class="pab"><button class="pri" data-do="ok"><b>Agregar al plan</b></button></div>`;
  setTimeout(()=>{openPop(anchor,H,{ok:()=>{const sc=($('#pasc')||{}).value||'',nm=(($('#panm')||{}).value||'').trim(),q=(($('#paq')||{}).value||'').trim(),u=(($('#paund')||{}).value||'').trim();
    if(!sc){toast('Elige el subcontratista.');setTimeout(()=>paddNew(anchor,ambId),0);return}if(!nm){toast('Escribe la actividad.');setTimeout(()=>paddNew(anchor,ambId),0);return}
    const qn=q?parseNum(q):null;if(q&&Number.isNaN(qn)){toast('La cantidad debe ser un número.');return}paddSave({t:'new',ambId,sc,name:nm,und:u.toUpperCase(),q:qn,newId:uid('act'),draw:!!($('#pazona')||{}).checked})}});setTimeout(()=>{const i=$('#panm');if(i)i.focus()},40)},0)}
function paddSave(o){if(!pubDraft())return;const id=uid('pa');const eng=dzEng();
  const doc={date:M.date,pisoId:M.piso,sc:o.sc,kind:'padd',t:o.t,ambId:o.ambId,...(o.actId?{actId:o.actId}:{}),...(o.from?{from:o.from}:{}),...(o.q!=null&&o.q!==''?{q:+o.q}:{}),name:o.name||'',...(o.und?{und:o.und}:{}),...(o.newId?{newId:o.newId,order:[...S.act.values()].filter(y=>y.ambId===o.ambId).reduce((m,y)=>Math.max(m,+y.order||0),0)+10}:{}),
    st:eng?'ok':'pend',draft:true,by:me.email,byName:me.name||me.email,ts:NOW()};
  rec([addDoc(id,doc)]);dzLog(`＋ ${o.t==='rep'?'Reprogramada':o.t==='adel'?'Adelantada':'Nueva'}: ${o.name||''}`);requestRender();
  if(o.draw&&!PHONE())setTimeout(()=>paddDraw(id),50);
  else toast(eng?'Agregado al plan: se aplica al lookahead al publicar':'Propuesta enviada: la decide el ingeniero','Deshacer',undo)}
/* áreas dibujadas para lo agregado (pdz zona con paId): al publicar pasan a la actividad (actId) */
const paZones=id=>[...PD.values()].filter(z=>z.kind==='zona'&&z.paId===id);
function paddDraw(id){const z=PD.get(id);if(!z)return;if(PHONE()){toast('Para dibujar usa una PC o tablet.');return}M.scDraw=z.sc;M.pend={paId:id,ambId:z.ambId,desc:z.name||''};if(!['zona','poly'].includes(M.tool))M.tool='zona';M.selId=null;if(innerWidth<900)M.panel=false;requestRender();toast('Dibuja en el plano el área donde trabajará.')}
function paddHtml(){const L=paddsOf().filter(z=>z.st!=='rej');if(!L.length)return'';const eng=dzEng();
  return`<div class="mp-sec">Se agrega al publicar (${L.length})</div><div class="mp-list">${L.sort((a,b)=>(a.ts||0)-(b.ts||0)).map(z=>{const a=S.amb.get(z.ambId);const ic=z.t==='rep'?'↻':z.t==='adel'?'⇤':'＋';const tl=z.t==='rep'?'Reprogramada'+(z.from?' (no se hizo el '+fmtD(z.from)+')':''):z.t==='adel'?'Adelantada'+(z.from?' (era el '+fmtD(z.from)+')':''):'Nueva, no prevista';
    return`<div class="mp-it pa" style="--c:${conOf(z.sc).color}"><div class="t"><span class="mono">${esc(a?a.code:'')}</span> ${ic} ${esc(z.name||'')}<small>${esc(a?a.name+' · ':'')}${esc(conOf(z.sc).name)} · ${tl}${z.q!=null?' · '+fq(z.q)+' '+esc(z.und||(S.act.get(z.actId)||{}).und||''):''}${z.st==='pend'?' · <b class="bad">propuesta del SC</b>':''}</small></div>
      <div class="s">${(eng||z.by===(me&&me.email))&&!PHONE()?(()=>{const n=paZones(z.id).length;return`<button class="lnkb" data-padraw="${z.id}" title="${n?'Agregar otra área del ambiente':'Dibujar dónde trabajará (si no, ocupa todo el ambiente)'}">${n?'＋ Otra área':'✏️ Ubicar'}</button>${n?`<span class="mu">${n} área${n>1?'s':''}</span>`:''}`})():''}${z.st==='pend'&&eng?`<button class="ib pri" data-paok="${z.id}">Aceptar</button><button class="ib" data-parej="${z.id}">Rechazar</button>`:''}${eng||z.by===(me&&me.email)?`<button class="lnkb" data-padel="${z.id}">Quitar</button>`:''}</div></div>`}).join('')}</div>`}

function pubBarHtml(){const p=pubOf();const D=draftsOf();const eng=dzEng();const today=todayIso();const fut=M.date>today;
  const sn=typeof dplanOf==='function'?dplanOf(M.date,M.piso):null;const adm=typeof isAdmin!=='undefined'&&isAdmin;const lk=dayLk();
  const reoBtn=adm&&lk?'<button class="ib" data-lko="1" title="Solo el administrador: permite cambiar el plan de este día (queda registrado)">🔓 Reabrir</button>':'';
  /* reabierto por el administrador */
  if(sn&&sn.reo){const r=sn.reo;return`<div class="pubb reo">🔓 Plan reabierto<small>${esc(r.n||'')} · ${fmtD(ldt(r.t))} ${hhmm(r.t)}${r.why?' · '+esc(r.why):''} · el PPC del día se sigue midiendo contra lo que se publicó</small>${adm?'<button class="ib" data-lkc="1">🔒 Cerrar de nuevo</button>':''}${fut&&D.length&&eng?`<button class="ib pri" data-pub="1">Publicar ${D.length} cambio${D.length>1?'s':''}</button>`:''}</div>`}
  /* hoy o un día pasado: con borradores sin publicar, se publican ahora (quedan como no cumplidos); si no, el plan está cerrado */
  if(!fut){if(D.length&&eng){const n=D.reduce((a,z)=>a+(z.ids||[z.actId]).length,0);
      return`<div class="pubb late">⚠ Sin publicar<small>${D.length} reprogramación${D.length>1?'es':''} (${n} actividad${n>1?'es':''}) no se aplicaron: este día ya llegó y siguen en el lookahead</small><button class="ib pri" data-pub="1">📣 Publicar ahora</button><button class="ib" data-pubx="1" title="Quitar los cambios sin publicar (el lookahead no cambia)">Descartar</button></div>`}
    return`<div class="pubb lk">🔒 Plan ${M.date===today?'de hoy':'del día'} cerrado<small>${M.date===today?'Hoy solo se registra el cumplimiento (✓ ½ ✗ con su causa); lo que no se haga se reprograma desde mañana. Las cuadrillas sí se pueden repartir.':'Este día ya pasó.'}</small>${reoBtn}</div>`}
  /* día futuro publicado o cerrado solo a la hora de cierre */
  if(p||(sn&&sn.ids)){const who=p?`${esc(p.byName||'')} · ${fmtD(ldt(p.ts))} ${hhmm(p.ts)}`:`cerrado automáticamente a las ${planCutHH()}`;
    return`<div class="pubb ok">🔒 Plan ${p?'publicado':'cerrado'}<small>${who} · ya no se reprograma; las cuadrillas sí se pueden repartir</small>${p&&eng?'<button class="ib" data-unpub="1" title="Vuelve a borrador: las fechas del lookahead regresan (si nadie las cambió) y se puede volver a planificar">↶ Deshacer publicación</button>':''}${reoBtn}</div>`}
  if(!eng)return`<div class="pubb">Plan propuesto<small>Se revisa en la reunión; el ingeniero lo publica al terminar (si nadie lo publica, se publica solo a las ${planCutHH()}).</small></div>`;
  const n=D.reduce((a,z)=>a+(z.ids||[z.actId]).length,0);const np=dpPendAll().length;
  return`<div class="pubb">Plan propuesto<small>${D.length?`${D.length} reprogramación${D.length>1?'es':''} (${n} actividad${n>1?'es':''}) se aplican al lookahead al publicar`:'Revísalo en la reunión (cumplimiento, cruces y «no va») y publícalo al terminar'}${np?` · <b class="bad">${np} propuesta${np>1?'s':''} del SC por revisar</b>`:''} · si nadie lo publica, a las ${planCutHH()} se publica solo con estos cambios y las propuestas sin revisar se rechazan</small><button class="ib pri" data-pub="1">📣 Publicar plan</button>${D.length?'<button class="ib" data-pubx="1" title="Quitar los cambios sin publicar (el lookahead no cambia)">Descartar</button>':''}</div>`}
/* reabrir / volver a cerrar (solo el administrador; queda en el registro del día) */
async function lkReopen(){if(!isAdmin)return;const why=((await uiAsk({title:`Reabrir el plan del ${dvLbl(M.date)}`,input:{label:'¿Por qué se reabre? Queda registrado.',required:true},ok:'Reabrir',tone:'warn'}))||'').trim();if(!why)return;const e={t:NOW(),by:me.email,n:me.name||me.email,why};
  const k=M.date+'_'+M.piso;const cur=dplanOf(M.date,M.piso)||{};DPL.set(k,{...cur,id:k,date:M.date,pisoId:M.piso,reo:e});DV++;requestRender();
  fcol('dplan').doc(k).set({date:M.date,pisoId:M.piso,reo:e,log:firebase.firestore.FieldValue.arrayUnion({...e,what:'reabierto'})},{merge:true}).catch(err=>toast('No se pudo reabrir: '+(err.code||err.message)));
  toast(`Plan del ${dvLbl(M.date)} reabierto: ya se puede cambiar`)}
function lkClose(){if(!isAdmin)return;const k=M.date+'_'+M.piso;const cur=dplanOf(M.date,M.piso)||{};DPL.set(k,{...cur,id:k,reo:null});DV++;requestRender();
  fcol('dplan').doc(k).set({reo:null,log:firebase.firestore.FieldValue.arrayUnion({t:NOW(),by:me.email,n:me.name||me.email,what:'cerrado de nuevo'})},{merge:true}).catch(()=>{});toast('Plan cerrado de nuevo')}
/* «Deshacer publicación» desde la barra (también después de recargar): arma lo publicado desde las reprogramaciones del día */
function unpubBar(){const PID=pubId(M.date,M.piso);const out=[...PD.values()].filter(z=>z.kind==='nova'&&z.pub===PID&&!z.draft).map(z=>({id:z.id,mv:z.mv,rid:z.rid,date:z.date,aid:z.actId,k:z.k||''}));
  uiAsk({title:`¿Deshacer la publicación del ${dvLbl(M.date)}?`,text:'El plan vuelve a borrador.',note:out.length?`${out.length} reprogramación${out.length>1?'es':''} vuelve${out.length>1?'n':''} a borrador: las fechas regresan si nadie las cambió.`:'',ok:'Deshacer publicación',tone:'warn'}).then(ok=>{if(ok)unpubPlan(PID,{out,was:null})})}
function pubDiscard(){const D=draftsOf();const g=[];for(const z of D){const o=remDoc(z.id);if(o)g.push(o);if(z.prop){const p=PD.get(z.prop);if(p&&p.st==='ok')g.push(updDoc(p.id,{st:'pend',dec:null,decBy:null,decN:null,decT:null},{st:'ok'}))}}rec(g.filter(Boolean));toast(`${D.length} cambio${D.length>1?'s':''} sin publicar descartado${D.length>1?'s':''}`,'Deshacer',undo);requestRender()}
/** propuestas del SC sin decidir del día y piso que se ven */
const dpPendAll=()=>[...PD.values()].filter(z=>z.kind==='dprop'&&z.st==='pend'&&z.pisoId===M.piso&&z.date===M.date);
function pubAsk(btn){if(!dzEng()){toast('Publica el plan el responsable del piso (o el administrador).');return}const D=draftsOf();const n=D.reduce((a,z)=>a+(z.ids||[z.actId]).length,0);const nr=D.filter(z=>z.k).length;
  {const pp=paddsOf('pend');if(pp.length){openPop(btn,`<div class="ph">Antes de publicar el ${dvLbl(M.date)}</div><div class="ptx"><b class="bad">Quedan ${pp.length} trabajo${pp.length>1?'s':''} no programado${pp.length>1?'s':''} propuesto${pp.length>1?'s':''} por el SC.</b> Acéptalos o recházalos en «Se agrega al publicar» (panel del plan).</div>`,{});return}}
  const pend=dpPendAll();try{computeCross()}catch(e){}const cx=CROSS.list.length;const adm=typeof isAdmin!=='undefined'&&isAdmin;
  /* para publicar hay que revisar todas las propuestas del SC; solo el administrador puede aceptarlas o rechazarlas todas de una vez */
  if(pend.length){const nf=pend.filter(p=>p.k==='fin').length;
    openPop(btn,`<div class="ph">Antes de publicar el ${dvLbl(M.date)}</div><div class="ptx"><b class="bad">Quedan ${pend.length} propuesta${pend.length>1?'s':''} del SC por revisar.</b> Para publicar el plan hay que revisarlas todas (Revisar en «Por decidir»).${adm?`<br>Como administrador puedes decidirlas todas de una vez: aceptar = ${pend.length-nf?`los «no va» pasan al día hábil siguiente (solo esa actividad)`:''}${pend.length-nf&&nf?' y ':''}${nf?'las culminadas se dan por culminadas':''}; rechazar = van según lo programado.`:''}</div>
      <button data-do="ver" class="pri">Ir a revisar</button>${adm?`<button data-do="acc">✓ Aceptar todas (${pend.length})</button><button data-do="rej">✗ Rechazar todas (${pend.length})</button>`:''}<button data-do="no">Cerrar</button>`,
      {ver:()=>{M.pdOpen=true;requestRender()},acc:()=>dpAll(true),rej:()=>dpAll(false),no:()=>{}});return}
  openPop(btn,`<div class="ph">Publicar el plan del ${dvLbl(M.date)}</div><div class="ptx">${D.length?`Se aplican al lookahead <b>${D.length}</b> reprogramación${D.length>1?'es':''} (${n} actividad${n>1?'es':''})${nr?` y se registran <b>${nr}</b> restricción${nr>1?'es':''}`:''}.`:'No hay reprogramaciones pendientes.'} Al publicar se cierra el plan de ese día. La semana congelada del Plan semanal no cambia.${cx?`<br><b class="bad">Hay ${cx} cruce${cx>1?'s':''} sin decidir.</b>`:''}</div><button data-do="si" class="pri">📣 Publicar</button><button data-do="no">Seguir revisando</button>`,{si:pubPlan,no:()=>{}})}
/** solo el administrador: aceptar o rechazar todas las propuestas pendientes del día y piso. Aceptar un «no va» lo deja como
    borrador al día hábil siguiente (solo esa actividad, con la causa que puso el SC); una culminada se da por culminada. */
let DPALL=false;
async function dpAll(acc){if(DPALL||typeof isAdmin==='undefined'||!isAdmin)return;const L=dpPendAll();if(!L.length)return;
  if(!await uiAsk({title:`¿${acc?'Aceptar':'Rechazar'} las ${L.length} propuestas del SC?`,text:`Plan del ${dvLbl(M.date)}.`,ok:`${acc?'Aceptar':'Rechazar'} ${L.length}`,tone:acc?'ok':'danger'}))return;DPALL=true;let ok=0,no=0;
  try{for(const p of L){const x=S.act.get(p.actId);if(!x){no++;continue}
    if(!acc){if(await dpReject(p,true))ok++;else no++;continue}
    if(p.k==='fin'){if(await dvFin(x,p,true))ok++;else no++;continue}
    if(!pubDraft()){no++;continue}
    const st={k:p.k==='res'?'ot':(p.k||'ot'),desc:p.desc||'',prop:p,to:wshift(M.date,1),tren:false,pred:p.pred||predOf(x),pc:false,who:''};
    if(!await dpTake(p,dpDec('ok','Reprogramada al '+st.to))){no++;continue}nvDraftAdd(x,st,[],1);ok++}}
  finally{DPALL=false}
  toast(`${ok} propuesta${ok!==1?'s':''} ${acc?'aceptada':'rechazada'}${ok!==1?'s':''}${no?` · ${no} no se pudo (cambió o ya estaba decidida): revísala${no>1?'s':''}`:''}`);requestRender()}
/* Publicar va en una transacción: relee del servidor el aviso de publicado, cada borrador y cada actividad, así dos
   ingenieros que publican a la vez no corren dos veces las mismas fechas. Se saltan las actividades que ya no tienen ese día. */
let PUBBUSY=false;
async function pubPlan(){if(PUBBUSY||!db)return;const D=draftsOf();const PA=paddsOf('ok');const date=M.date,pid=M.piso,PID=pubId(date,pid);const pref=fcol('pdz').doc(PID);
  const ids=[...new Set([...D.flatMap(z=>z.ids||[z.actId]),...PA.map(z=>z.actId).filter(Boolean)])];PUBBUSY=true;let R_;
  /* la foto del plan se arma con lo que tiene el servidor: primero terminan de enviarse las escrituras propias */
  try{if(db.waitForPendingWrites)await Promise.race([db.waitForPendingWrites(),new Promise(r=>setTimeout(r,4000))])}catch(e){}
  /* candidatas a la foto: lo que esta página ve ese día en el piso, lo de la foto anterior y lo que se mueve (se releen en la transacción) */
  const cand=new Set(ids);for(const x of S.act.values())if((x.days||[]).includes(date)&&pisoOfAmb(x.ambId)===pid)cand.add(x.id);
  {const s0=typeof dplanOf==='function'?dplanOf(date,pid):null;if(s0&&s0.ids)Object.keys(s0.ids).forEach(i=>cand.add(i))}
  try{R_=await db.runTransaction(async tx=>{
    const ps=await tx.get(pref);const pubD=ps.exists?ps.data():null;const dref=fcol('dplan').doc(date+'_'+pid);const dsn=await tx.get(dref);const sn0=dsn.exists?dsn.data():null;
    /* lecturas en paralelo (un piso puede tener cientos de actividades ese día) */
    const ds=await Promise.all(D.map(z=>tx.get(fcol('pdz').doc(z.id))));const pas=await Promise.all(PA.map(z=>tx.get(fcol('pdz').doc(z.id))));
    const Pz=[];pas.forEach((d,i)=>{if(!d.exists)return;const zz={...d.data(),id:PA[i].id};if(zz.draft&&zz.st==='ok')Pz.push(zz)});Pz.sort((a,b)=>(a.ts||0)-(b.ts||0));
    const A=new Map();(await Promise.all([...cand].map(id=>tx.get(fcol('acts').doc(id))))).forEach(d=>{if(d.exists)A.set(d.id,actNorm({...d.data(),id:d.id}))});
    const Dz=[];ds.forEach((d,i)=>{if(!d.exists)return;const zz={...d.data(),id:D[i].id};if(zz.draft)Dz.push(zz)});Dz.sort((a,b)=>(a.ts||0)-(b.ts||0)||String(a.id).localeCompare(String(b.id)));
    /* planes ya cerrados de otras fechas que se tocarían: esa actividad no se mueve (si es la principal, el cambio queda sin publicar) */
    const closed=new Map();const DD=[...new Set([...pubDates(Dz,A,date),...Pz.filter(z=>z.t==='adel'&&z.from).map(z=>z.from)])].filter(d=>d!==date);(await Promise.all(DD.map(dd=>tx.get(fcol('dplan').doc(dd+'_'+pid))))).forEach((s_,i)=>{const v=s_.exists?s_.data():null;if(v&&v.ids&&!v.reo)closed.set(DD[i],new Set(Object.keys(v.ids)))});
    const lockedOn=(id,a,b)=>chgDays(a,b).filter(d=>d!==date&&closed.has(d)&&closed.get(d).has(id));
    const W=new Map(),out=[],skipped=[],held=[],restrs=[];
    for(const zz of Dz){const n=zz.shift||wdist(zz.date,zz.repTo);const mv={};const L=zz.ids||[zz.actId];let hold=false;
      for(let j=0;j<L.length;j++){const id=L[j];const y=W.get(id)||A.get(id);if(!y||y.arch)continue;
        const ok=j===0?(y.days||[]).includes(zz.date):(y.days||[]).some(dd=>dd>=zz.date);if(!ok){skipped.push(y.name||id);continue}
        const o=shiftOp(y,n,zz.date);const lk=lockedOn(id,y,o.after);if(lk.length){held.push(`${short(y.name||id,30)} (${lk.map(fmtD).join(', ')})`);if(j===0){hold=true;break}continue}
        mv[id]={p:y.days||[],pq:y.qty||{},n:o.after.days,nq:o.after.qty||{}};const nx={...y,days:o.after.days,qty:o.after.qty||{}};
        /* el día que no fue queda marcado en el lookahead (↷ con el motivo, la nueva fecha y la causa); en el tren, su primer día movido */
        const ca=zz.c?{c:zz.c,cnc:zz.cnc||'',imp:zz.imp!==false,rsc:zz.rsc||'',pc:!!zz.pc}:{};const rk=j===0?zz.date:rplDay(y,zz.date);
        if(rk)nx.rpl={...(y.rpl||{}),[rk]:{to:j===0?zz.repTo:wshift(rk,n),m:zz.motivo||'',...ca,...(j?{tr:zz.actId}:{})}};W.set(id,nx)}
      if(hold)return{held,blocked:true};
      /* toda reprogramación queda registrada en Restricciones con su causa (el tipo sale de la causa, no del primero de la lista) */
      let rid='';if(zz.k&&Object.keys(mv).length){const x=A.get(zz.actId);rid='res-'+zz.id;/* id fijo por borrador: dos publicaciones del mismo cambio nunca crean dos restricciones */restrs.push({id:rid,actId:zz.actId,pisoId:pisoOfAct(zz.actId),type:zz.rt||restrTypeFor(zz.c||''),desc:zz.rdesc||zz.motivo||'',resp:zz.rsc?conOf(zz.rsc).name:'',need:zz.repTo,freed:'',status:'pend',created:todayIso(),sc:x?x.sc:zz.sc,by:me.email,byName:me.name||'',via:'plan diario',...(zz.c?{cnc:zz.cnc||'',ccode:zz.c,imp:zz.imp!==false,rsc:zz.rsc||'',pc:!!zz.pc}:{})})}
      out.push({id:zz.id,mv,rid,date:zz.date,aid:zz.actId,k:zz.k||''})}
    /* lo agregado al plan (padd): reprogramar / adelantar a este día o actividad nueva */
    const paOut=[],newActs=[];for(const zz of Pz){
      if(zz.t==='new'){const nid=zz.newId||uid('act');const ord=zz.order||([...S.act.values()].filter(y=>y.ambId===zz.ambId).reduce((m,y)=>Math.max(m,+y.order||0),0)+10);
        newActs.push({id:nid,doc:{ambId:zz.ambId,sc:zz.sc,name:zz.name||'',und:zz.und||'',metrado:zz.q!=null?+zz.q:null,days:[date],qty:zz.q!=null?{[date]:+zz.q}:{},order:ord}});paOut.push({id:zz.id,actId:nid,nw:true});continue}
      const id=zz.actId;const y=W.get(id)||A.get(id);if(!y||y.arch){skipped.push(zz.name||id);continue}
      if(zz.t==='adel'&&closed.has(zz.from)&&closed.get(zz.from).has(id)){held.push(`${short(y.name||id,30)} (${fmtD(zz.from)})`);continue}
      const o=paddApply(y,zz,date);if(!o){skipped.push(y.name||id);continue}W.set(id,{...y,...o});paOut.push({id:zz.id,aid:id,mv:{[id]:{p:y.days||[],pq:y.qty||{},n:o.days,nq:o.qty}}})}
    for(const[id,y]of W)tx.update(fcol('acts').doc(id),{days:y.days,qty:y.qty||{},...(y.rpl?{rpl:y.rpl}:{})});
    for(const na of newActs)tx.set(fcol('acts').doc(na.id),na.doc);
    for(const o of paOut)tx.update(fcol('pdz').doc(o.id),{draft:false,pub:PID,...(o.actId?{actId:o.actId}:{})});
    /* las áreas dibujadas para lo agregado pasan a ser de la actividad */
    for(const o of paOut){o.zs=paZones(o.id).map(z=>z.id);for(const zid of o.zs)tx.update(fcol('pdz').doc(zid),{actId:o.actId||o.aid,fuera:false})}
    for(const r of restrs){const{id,...b}=r;tx.set(fcol('restr').doc(id),b)}
    for(const o of out)tx.update(fcol('pdz').doc(o.id),{draft:false,mv:o.mv,rid:o.rid,pub:PID});
    const doc={date,pisoId:pid,sc:'',kind:'pub',n:(pubD&&pubD.n||0)+out.length+paOut.length,by:me.email,byName:me.name||me.email,ts:NOW()};tx.set(pref,doc);
    /* foto del plan comprometido (contra ella se mide el PPC diario), con las actividades releídas del servidor;
       un día que ya llegó conserva la que tenía (o la de antes de publicar) */
    let snapIds=null;if(date>todayIso()||!sn0){const Acts=new Map(S.act);for(const[id,y]of A)Acts.set(id,y);if(date>todayIso()){for(const[id,y]of W)Acts.set(id,{...(Acts.get(id)||{}),...y});for(const na of newActs)Acts.set(na.id,{...na.doc,id:na.id})}
      snapIds=dplanIds(date,pid,Acts);tx.set(dref,{...(sn0||{}),date,pisoId:pid,ids:snapIds,who:dplanWho(snapIds,Acts),at:NOW(),by:me.email,byName:me.name||me.email,pub:PID,auto:false,reo:null})}
    return{out,skipped,held,W,restrs,doc,was:pubD,snapIds,paOut,newActs}})}
  catch(e){PUBBUSY=false;toast('No se pudo publicar: '+(e&&(e.code||e.message)||'error'));return}
  PUBBUSY=false;
  if(R_.blocked){toast(`No se publicó: ${R_.held.join(' · ')} tocaría un día ya publicado. Quita o cambia ese «no va» (Cambios del plan) o pide al administrador reabrir ese día.`);requestRender();return}
  /* queda en el Historial del lookahead (las reprogramaciones de la reunión no pasan por apply) */
  if(R_.W.size&&typeof lhLog==='function'){const ops=[...R_.W].map(([id,y])=>{const b=S.act.get(id);return b?{col:'acts',id,before:b,after:{...b,days:y.days,qty:y.qty,...(y.rpl?{rpl:y.rpl}:{})}}:null}).filter(Boolean);
    const n_=R_.out.filter(o=>Object.keys(o.mv||{}).length).length;lhLog(ops,`Plan del ${dvLbl(date)} publicado: ${n_} «No va» reprogramado${n_>1?'s':''} en la reunión`)}
  /* reflejar al momento (llegará igual por la base) */
  for(const[id,y]of R_.W){const c=S.act.get(id);if(c)S.act.set(id,{...c,days:y.days,qty:y.qty,...(y.rpl?{rpl:y.rpl}:{})})}
  for(const na of R_.newActs||[])if(!S.act.has(na.id))S.act.set(na.id,{...na.doc,id:na.id});for(const o of R_.paOut||[]){const z=PD.get(o.id);if(z)Object.assign(z,{draft:false,pub:PID,...(o.actId?{actId:o.actId}:{})});for(const zid of o.zs||[]){const q=PD.get(zid);if(q)Object.assign(q,{actId:o.actId||o.aid,fuera:false})}}for(const r of R_.restrs)S.res.set(r.id,r);
  for(const o of R_.out){const z=PD.get(o.id);if(z)Object.assign(z,{draft:false,mv:o.mv,rid:o.rid,pub:PID})}PD.set(PID,{...R_.doc,id:PID});if(R_.snapIds){DPL.set(date+'_'+pid,{...(DPL.get(date+'_'+pid)||{}),id:date+'_'+pid,date,pisoId:pid,ids:R_.snapIds,pub:PID,auto:false,reo:null})}DV++;PDV++;
  /* publicado tarde (el día ya llegó): lo que no fue queda como no cumplido ese día, igual que un «No va hoy» */
  if(typeof canDaily!=='undefined'&&canDaily)for(const o of R_.out){if(o.date>todayIso()||!Object.keys(o.mv||{}).length)continue;const x=S.act.get(o.aid);if(!x||(recReal(o.date,o.aid)||{}).status)continue;
    const zz=PD.get(o.id)||{};const cn=zz.cnc||cncFor(o.k==='per'?'per':o.k);writeDaily(o.date,pid,{recs:{[o.aid]:{...baseRec(o.date,x,null),status:'no',cnc:cn,imp:zz.c&&zz.imp!==cncImp(cn)?!!zz.imp:null,...(zz.rsc?{rsc:zz.rsc,pc:!!zz.pc}:{}),note:'No fue: plan publicado ese mismo día',viaNova:true}}});o.lr=true}
  const n=R_.out.length+(R_.paOut||[]).length;
  toast(`Plan del ${dvLbl(date)} publicado${n?` · ${n} reprogramación${n>1?'es':''} aplicada${n>1?'s':''} al lookahead`:''}${R_.skipped.length?` · ${R_.skipped.length} ya no estaba${R_.skipped.length>1?'n':''} ese día (sin cambio)`:''}${R_.was&&!n?' · ya estaba publicado':''}`,'Deshacer',()=>unpubPlan(PID,R_));
  if(R_.held.length)setTimeout(()=>toast(`No se movió (toca un día ya publicado): ${R_.held.join(' · ')}. Corrígelo en ese día o pide al administrador reabrirlo.`),1500);requestRender()}
/** días (y cantidades) que cambian entre antes y después (igual que el servidor: functions/lib.js changedDays) */
function chgDays(a,b){const A=new Set(a.days||[]),B=new Set(b.days||[]),T=new Set();A.forEach(d=>{if(!B.has(d))T.add(d)});B.forEach(d=>{if(!A.has(d))T.add(d)});
  const qa=a.qty||{},qb=b.qty||{};new Set([...Object.keys(qa),...Object.keys(qb)]).forEach(d=>{if((+qa[d]||0)!==(+qb[d]||0))T.add(d)});return[...T].sort()}
/** fechas cuyos planes cerrados hay que releer antes de publicar: los días ≥ fecha de lo que se mueve y adónde irían */
function pubDates(Dz,A,date){const S_=new Set();for(const z of Dz){const n=z.shift||wdist(z.date,z.repTo);for(const id of z.ids||[z.actId]){const y=A.get(id);if(!y)continue;for(const d of y.days||[])if(d>=date){S_.add(d);S_.add(wshift(d,n))}}}S_.delete(date);return[...S_].sort()}
/** deshacer la publicación: vuelven las fechas (solo las que nadie cambió después), las restricciones creadas se archivan y los cambios vuelven a borrador */
/** quita la marca «no fue» de un día (al deshacer) */
/** clave de la marca ↷ que dejó en una actividad del tren la reprogramación de lead (desde la fecha del plan) */
function rplKey(y,lead,from){for(const[k,v]of Object.entries(y.rpl||{}))if(v&&v.tr===lead&&k>=from)return k;return''}
function rplOff(y,d){if(!d||!y.rpl||!y.rpl[d])return y;const r={...y.rpl};delete r[d];return{...y,rpl:r}}
/* Deshacer la publicación, todo o nada y en una transacción: relee las actividades; si alguna ya se cambió después de publicar,
   no se toca nada (ni la foto ni el aviso de publicado) y se avisa. Si todo calza: vuelven las fechas, se archivan las
   restricciones creadas, los cambios vuelven a borrador y se quitan la foto del plan y el aviso de publicado. */
let UNPUBBUSY=false;
async function unpubPlan(PID,R_){if(UNPUBBUSY||!db)return;const d0=PID.slice(4,14),p0=PID.slice(15);const dk=d0+'_'+p0;
  /* la foto se quita solo si fue una publicación nueva (no una republicación) y si este usuario puede quitarla (el editor: días futuros) */
  const dropSnap=!R_.was&&(d0>todayIso()||(typeof isAdmin!=='undefined'&&isAdmin));const PO=R_.paOut||[];const ids=[...new Set([...R_.out.flatMap(o=>Object.keys(o.mv||{})),...PO.flatMap(o=>Object.keys(o.mv||{}))])];
  UNPUBBUSY=true;let T;
  try{T=await db.runTransaction(async tx=>{const A=new Map();for(const id of ids){const d=await tx.get(fcol('acts').doc(id));if(d.exists)A.set(id,actNorm({...d.data(),id}))}
    const RS=new Map();for(const o of R_.out)if(o.rid){const d=await tx.get(fcol('restr').doc(o.rid));if(d.exists)RS.set(o.rid,d.data())}
    const W=new Map(),bad=[];
    for(const o of [...R_.out].reverse())for(const[id,m]of Object.entries(o.mv||{})){const y=W.get(id)||A.get(id);if(!y)continue;
      if(canon(y.days||[])!==canon(m.n||[])||(m.nq&&canon(y.qty||{})!==canon(m.nq))){bad.push(y.name||id);continue}
      W.set(id,rplOff({...y,days:m.p||[],qty:m.pq||{}},id===o.aid?o.date:rplKey(y,o.aid,o.date)))}
    for(const o of [...PO].reverse())for(const[id,m]of Object.entries(o.mv||{})){const y=W.get(id)||A.get(id);if(!y)continue;
      if(canon(y.days||[])!==canon(m.n||[])){bad.push(y.name||id);continue}W.set(id,{...y,days:m.p||[],qty:m.pq||{}})}
    if(bad.length)return{bad};
    const arch={t:NOW(),by:me.email,n:me.name||''};
    for(const o of PO){if(o.nw&&o.actId)tx.update(fcol('acts').doc(o.actId),{arch});tx.update(fcol('pdz').doc(o.id),{draft:true,pub:null});for(const zid of o.zs||[])tx.update(fcol('pdz').doc(zid),{actId:null,fuera:false})}
    for(const[id,y]of W)tx.update(fcol('acts').doc(id),{days:y.days,qty:y.qty||{},rpl:y.rpl||{}});
    for(const o of R_.out){const r=o.rid&&RS.get(o.rid);if(r&&!r.arch&&r.status!=='lib')tx.update(fcol('restr').doc(o.rid),{arch})}
    for(const o of R_.out)tx.update(fcol('pdz').doc(o.id),{draft:true,mv:null,rid:'',pub:null});
    if(!R_.was){tx.delete(fcol('pdz').doc(PID));if(dropSnap)tx.delete(fcol('dplan').doc(dk))}
    return{W,arch}})}
  catch(e){UNPUBBUSY=false;toast('No se pudo deshacer la publicación: '+(e&&(e.code||e.message)||'error'));return}
  UNPUBBUSY=false;
  if(T.bad){toast(`No se deshizo nada: ${T.bad.length>1?'estas actividades ya se cambiaron':'esta actividad ya se cambió'} después de publicar (${T.bad.slice(0,3).map(n=>short(n,28)).join(' · ')}${T.bad.length>3?'…':''}). El plan sigue publicado; corrígelo en el lookahead o pide al administrador reabrir el día.`);return}
  /* reflejar al momento (llegará igual por la base) y dejarlo en el historial del lookahead */
  const ops=[];for(const[id,y]of T.W){const c=S.act.get(id);if(c){ops.push(op('acts',id,{...c,days:y.days,qty:y.qty||{},rpl:y.rpl||{}}));S.act.set(id,{...c,days:y.days,qty:y.qty||{},rpl:y.rpl||{}})}}
  if(typeof lhLog==='function'&&ops.length)lhLog(ops,'Publicación deshecha');
  for(const o of R_.out){const r=o.rid&&S.res.get(o.rid);if(r&&!r.arch&&r.status!=='lib')S.res.set(o.rid,{...r,arch:T.arch});const z=PD.get(o.id);if(z)Object.assign(z,{draft:true,mv:null,rid:'',pub:null})}
  for(const o of R_.paOut||[]){const z=PD.get(o.id);if(z)Object.assign(z,{draft:true,pub:null});if(o.nw&&o.actId)S.act.delete(o.actId);for(const zid of o.zs||[]){const q=PD.get(zid);if(q)q.actId=null}}
  if(!R_.was){PD.delete(PID);if(dropSnap&&DPL.has(dk))DPL.delete(dk)}DV++;PDV++;
  for(const o of R_.out)if(o.lr){const x=S.act.get(o.aid);const rc=recReal(o.date,o.aid);if(x&&rc&&rc.viaNova)writeDaily(o.date,pisoOfAct(o.aid),{recs:{[o.aid]:{...baseRec(o.date,x,rc),status:null,exec:null,cnc:'',imp:null,note:'',viaNova:false}}})}
  toast('Publicación deshecha: los cambios vuelven a borrador');requestRender()}
/** las actividades que siguen a x en su ambiente (el «tren») y tienen días desde la fecha del plan */
function trenOf(x){const L=[...S.act.values()].filter(y=>y.ambId===x.ambId).sort(byOrder);const i=L.findIndex(y=>y.id===x.id);
  return L.slice(i+1).filter(y=>!(typeof DONE!=='undefined'&&DONE.has(y.id))&&(y.days||[]).some(d=>d>=M.date))}
function shiftDays(y,n,from){const map=d=>d>=from?wshift(d,n):d;const days=[...new Set((y.days||[]).map(map))].sort();const qty={};for(const[d,v]of Object.entries(y.qty||{})){const k=map(d);qty[k]=(qty[k]||0)+(+v||0)}return{...y,days,qty}}
function shiftOp(y,n,from){return op('acts',y.id,shiftDays(y,n,from))}
function dvClick(btn,x,k){const eng=dzEng();const p=dpOf(x.id);
  if(k==='va'){if(p&&p.st==='pend'){const o=remDoc(p.id);if(o)rec([o]);dzLog(`✓ ${x.name}: va`);requestRender()}return}
  if(k==='fin'){if(eng){if(p&&p.st==='pend'){dpAccept(btn,x,{...p,k:'fin'});return}dvFin(x);return}
    dpPropose(x,'fin','');return}
  if(k==='no'){if(eng&&p&&p.st==='pend'&&p.k!=='fin'){dpAccept(btn,x,p);return}noVa(btn,x,{})}}
async function dvFin(x,prop,quiet){if(typeof canDaily==='undefined'||!canDaily){toast('Solo el ingeniero puede darla por culminada.');return false}const d=M.date>todayIso()?todayIso():M.date;
  if(prop&&!await dpTake(prop,dpDec('ok','Culminada')))return false;
  markDone(x.id,d);if(prop)dpDone(prop,'Culminada');dzLog(`✔ ${x.name}: culminada`);if(!quiet)toast(`“${short(x.name,40)}” culminada: se liberan sus días siguientes`,'Deshacer',()=>{reopenDone(x.id,true);if(prop)dpReopen(prop)});requestRender();return true}
/** propuesta del subcontratista para el día (una por actividad: la nueva reemplaza a la anterior) */
function dpPropose(x,k,desc,ex){const id=dpId(M.date,x.id);const g=[];const was=PD.get(id);if(was&&was.st==='ok'){toast('El ingeniero ya decidió esta actividad: habla con él para cambiarlo.');return}
  g.push(addDoc(id,{date:M.date,pisoId:M.piso,sc:x.sc,kind:'dprop',actId:x.id,ambId:x.ambId,k,desc:desc||'',...(ex||{}),st:'pend',by:me.email,byName:me.name||me.email,ts:NOW()}));rec(g.filter(Boolean));
  toast(`Propuesta: ${k==='fin'?'culminado':'no va'} · el ingeniero la decide en la reunión`);requestRender()}
function dpDone(p,txt){const z=PD.get(p.id);if(!z)return;updDoc(p.id,{st:'ok',dec:txt,decBy:me.email,decN:me.name||me.email,decT:NOW()})}
/** decidir una propuesta del SC: en una transacción, solo si sigue pendiente y es la misma que se revisó. Si el SC la cambió
    mientras tanto (otra hora o motivo), o si otro ingeniero ya la decidió, no se escribe nada y se avisa. */
async function dpTake(p,patch){if(!p)return false;if(!db)return true;let r;
  try{r=await db.runTransaction(async tx=>{const ref=fcol('pdz').doc(p.id);const d=await tx.get(ref);if(!d.exists)return'gone';const c=d.data();
    if(c.st!=='pend')return'decided';if((c.ts||0)!==(p.ts||0)||(c.k||'')!==(p.k||'')||(c.desc||'')!==(p.desc||''))return'changed';tx.update(ref,patch);return true})}
  catch(e){toast('No se pudo decidir: '+(e&&(e.code||e.message)||'error'));return false}
  if(r===true){const z=PD.get(p.id);if(z){pdPatch(z,patch);PDV++}return true}
  toast(r==='changed'?'El subcontratista cambió su propuesta mientras la revisabas: revísala de nuevo.':r==='decided'?'Otra persona ya decidió esta propuesta.':'El subcontratista retiró su propuesta.');requestRender();return false}
const dpDec=(st,dec)=>({st,...(dec!=null?{dec}:{}),decBy:me.email,decN:me.name||me.email,decT:NOW()});
function dpReopen(p){if(PD.get(p.id))updDoc(p.id,{st:'pend',dec:'',decBy:'',decN:'',decT:0})}
async function dpReject(p,quiet){const pt=dpDec('rej');if(!await dpTake(p,pt))return false;rec([{op:'upd',id:p.id,before:{st:'pend',decBy:null,decN:null,decT:null},after:pt}]);
  if(!quiet)toast('Se mantiene: va según lo programado','Deshacer',()=>dpReopen(p));requestRender();return true}
function dpAccept(btn,x,p){if(p.k==='fin'){openPop(btn,`<div class="ph">Revisar · ${esc(short(x.name,38))}</div><div class="ptx">${esc(p.byName||conOf(x.sc).name)} propone que ya culminó.</div><button data-do="si">✔ Sí, culminó<small> · se liberan los días que le quedan</small></button><button data-do="no">✓ No, sigue · va según lo programado</button>`,{si:()=>dvFin(x,p),no:()=>dpReject(p)});return}
  noVa(btn,x,{k:p.k,desc:p.desc,prop:p})}
/* ---------- «No va»: siempre una restricción, con su causa (cuadro de la empresa) ----------
   El motivo (k) define la causa (c = código del cuadro), si es imputable al SC de la actividad (imp) y quién responde (rsc).
   «Frente no entregado»: responde el SC de la partida anterior (rsc) y para el afectado no es imputable; pc = el ingeniero
   decide si también le cuenta en el PPC del SC predecesor. «Programación»: obra (PROG, no imputable) o el SC lo aceptó (SC).
   k antiguos: 'res' (restricción, PROG) y 'per' (personal). 'int' = interferencia desde los cruces (PROG). */
const NVC0=[{k:'per',c:'SC',t:'👷 Falta de personal',s:'el SC no tiene gente para ese frente'},{k:'fre',c:'SC',t:'🚧 Frente no entregado',s:'la partida anterior no lo dejó listo'},
  {k:'prg',c:'PROG',t:'📐 Error de programación',s:'estaba mal programada'},{k:'mat',c:'MAT',t:'📦 Materiales',s:'falta material o insumos'},
  {k:'qa',c:'QA/QC',t:'✅ Calidad',s:'liberación o proceso de calidad'},{k:'eq',c:'EQ',t:'🛠 Equipos',s:'equipos o herramientas'},
  {k:'cli',c:'CLI',t:'🏛 Cliente · supervisión',s:'información, cambios, RFI'},{k:'dis',c:'DIS',t:'📏 Diseño',s:'incompatibilidades del proyecto'},
  {k:'ext',c:'EXT',t:'🌧 Externo',s:'clima, social, sindical…'},{k:'ot',c:'OT',t:'… Otra restricción',s:'no está en las anteriores'}];
/* opciones de «No va» = los tipos de restricción de Configuración (cada uno con su causa del cuadro para el PPC).
   Los que hablan de personal, frente o programación usan la lógica especial (imputable al SC, partida anterior, quién aceptó).
   Sin tipos en Configuración se usa la lista de siempre (NVC0). */
const nvCode=t=>{const r=RT_RX.find(([,rx])=>rx.test(t));return r?r[0]:'OT'};
let NVCK='',NVCL=NVC0;
function nvcList(){const T=(P().restrTypes||[]).filter(t=>typeof t==='string'&&t.trim());const key=T.join('|');if(key===NVCK)return NVCL;NVCK=key;
  if(!T.length){NVCL=NVC0;return NVCL}const seen=new Set();
  NVCL=T.map(t=>{const k=/frente/i.test(t)?'fre':/personal|mano de obra/i.test(t)?'per':/program/i.test(t)?'prg':'rt:'+t;if(seen.has(k))return null;seen.add(k);const b=NVC0.find(o=>o.k===k);
    return{k,c:b?b.c:nvCode(t),t,l:t,s:b?b.s:'',rt:t}}).filter(Boolean);return NVCL}
const nvcOf=k=>{if(!k)return null;const o=nvcList().find(o=>o.k===k)||NVC0.find(o=>o.k===k);if(o)return o;if(String(k).startsWith('rt:')){const t=k.slice(3);return{k,c:nvCode(t),t,l:t,s:'',rt:t}}return null};
const nvLbl=k=>{const o=nvcOf(k);return o?(o.l||o.t.replace(/^\S+\s/,'')):k==='int'?'Interferencia con otra partida':k==='per'?'Falta de personal':'Restricción'};
/** nombre de la causa en la lista del proyecto (o la del cuadro) para un código */
function nvCnc(code){const L=P().cnc||[];return L.find(c=>cncCode(c)===code)||(CNC_STD.find(o=>o.c===code)||{}).n||code}
/** causa, imputabilidad y responsable según el motivo */
function nvAttr(x,st){const k=st.k;let c,imp,rsc='',pc=false;
  if(k==='per'){c='SC';imp=true;rsc=x.sc}
  else if(k==='fre'){c='SC';imp=false;rsc=st.pred||'';pc=!!(st.pc&&rsc)}
  else if(k==='prg'){if(st.who==='sc'){c='SC';imp=true;rsc=x.sc}else{c='PROG';imp=false}}
  else if(k==='int'||k==='res'||!nvcOf(k)){c='PROG';imp=false}
  else{c=nvcOf(k).c;imp=cncImp(nvCnc(c));rsc=imp?x.sc:''}
  const o=nvcOf(k);return{c,cnc:nvCnc(c),imp,rsc,pc,rt:(o&&o.rt)||''}}
/** texto del motivo (lo que se ve en el plan, el lookahead y la restricción) */
function nvMot(st){const d=(st.desc||'').trim();const l=nvLbl(st.k);const pr=st.k==='fre'&&st.pred?' ('+conOf(st.pred).name+')':'';return l+pr+(d&&d!==l?': '+d:'')}
/** SC de la actividad anterior en el ambiente (la que debía entregar el frente) */
function predOf(x){const L=[...S.act.values()].filter(y=>y.ambId===x.ambId).sort(byOrder);const i=L.findIndex(y=>y.id===x.id);for(let j=i-1;j>=0;j--)if(L[j].sc&&L[j].sc!==x.sc)return L[j].sc;return''}
/** registro en Restricciones de lo que no va (toda reprogramación queda registrada) */
function nvRestr(x,st,need,rid0){const rid=rid0||uid('res');const A=nvAttr(x,st);const resp=A.rsc?conOf(A.rsc).name:'';
  return{rid,doc:{id:rid,actId:x.id,pisoId:pisoOfAct(x.id),type:A.rt||restrTypeFor(A.c),desc:(st.desc||'').trim()||nvMot(st),resp,need,freed:'',status:'pend',created:todayIso(),sc:x.sc,by:me.email,byName:me.name||'',via:'plan diario',cnc:A.cnc,ccode:A.c,imp:A.imp,rsc:A.rsc,pc:A.pc}}}
/** por defecto en «Programación»: si el SC había propuesto cambiar esa actividad y se le rechazó (o sigue sin decidir), es de obra */
async function nvProgDef(x){try{const P_=typeof PROP!=='undefined'?PROP.get(x.sc):null;const leg=Object.values((P_&&P_.hist)||{}).some(h=>h&&h.id===x.id&&h.st==='rej'&&!h.undone);
    const pend=!!(P_&&P_.items&&P_.items[x.id]&&P_.items[x.id].sent);if(leg||pend)return'obra';if(!db)return'sc';
    const sn=await fcol('lhphist').where('actId','==',x.id).get();return sn.docs.some(d=>{const h=d.data();return h.st==='rej'&&!h.undone})?'obra':'sc'}catch(e){return'sc'}}
/** «No va»: causa → detalle (y quién responde) → ¿se libera a primera hora? → reprogramar. El subcontratista solo propone. */
function noVa(btn,x,o){if(dayLk()){toast(`El plan del ${dvLbl(M.date)} ya está cerrado (${lockWhy(M.date,M.piso)}): no se saca a nadie del día. ${M.date>todayIso()?'Para corregirlo, deshaz la publicación.':'Ordénalas o deja que trabajen a la vez; lo que no se haga se registra en el cumplimiento.'}`);return}const eng=dzEng();const today=M.date<=todayIso();const k0=o.k||'';
  const st={k:k0==='res'&&o.prop?'':k0,desc:o.desc||'',prop:o.prop||null,to:wshift(M.date,1),tren:false,pred:(o.prop&&o.prop.pred)||predOf(x),pc:false,who:'',whoAuto:''};
  if(k0==='res'&&o.prop)st.k='ot';
  const head=`<div class="ph">${st.prop?'Revisar':'No va'} · ${esc(short(x.name,38))}</div><div class="ptx">${esc(conOf(x.sc).name)} · ${dvLbl(M.date)}${st.prop?` · ${esc(st.prop.byName||conOf(x.sc).name)} propone que no va`:''}</div>${st.prop&&eng?`<div class="nvgo nvkeep"><button data-nv="keep"><b>✓ No, va igual</b><small>se mantiene lo programado</small></button></div><div class="nvl">o acepta que no va:</div>`:''}`;
  const show=h=>{openPop(btn,`<div class="nvbox">${head}${h}</div>`,{});pop.onclick=click;pop.oninput=e=>{if(e.target.id==='nvd'){st.desc=e.target.value}};
    pop.onchange=e=>{const t=e.target;if(t.id==='nvdt'&&t.value){const v=t.value;if(!isWork(v)){toast(nwReason(v)+': elige un día laborable.');return}if(v<=M.date){toast('Elige una fecha posterior.');return}st.to=v;step('rep')}
      if(t.id==='nvpred'){st.pred=t.value;if(!st.pred)st.pc=false;step('det')}if(t.id==='nvpc'){st.pc=t.checked}};
    pop.onkeydown=e=>{if(e.key==='Enter'&&e.target.id==='nvd'){e.preventDefault();const b=pop.querySelector('.nvbox .pri');if(b)b.click()}};const i=pop.querySelector('#nvd');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};
  const motHtml=()=>`<div class="nvl">¿Qué lo impide?</div><div class="nvmot nvc">${nvcList().map(c=>`<button data-nk="${c.k}" class="${st.k===c.k?'on':''}" title="${esc(c.s)}"><b>${c.t}</b></button>`).join('')}</div>`;
  const tagHtml=()=>{const A=nvAttr(x,st);return`<div class="nvtag nvtg"><span>${st.k==='int'?'⏸':'⛔'} <b>${esc(nvLbl(st.k))}</b> · causa ${esc(cncCode(A.cnc)||A.c)}${A.imp?` · imputable a ${esc(conOf(A.rsc||x.sc).name)}`:A.rsc?` · responde ${esc(conOf(A.rsc).name)}${A.pc?' (le cuenta)':''}`:' · no imputable al SC'}</span>${st.k!=='int'?'<button class="lnkb" data-nv="chg">Cambiar</button>':''}</div>`};
  const detHtml=()=>{const c=nvcOf(st.k);const scs=[...S.con.values()].filter(y=>y.id!==x.sc).sort((a,b)=>a.name.localeCompare(b.name));
    return`${tagHtml()}<div class="nvq"><input id="nvd" value="${esc(st.desc)}" placeholder="${st.k==='per'?'Detalle (opcional): cuántos faltan, desde cuándo…':'¿Qué falta? (p. ej. '+esc(c?c.s:'detalle')+')'}" aria-label="Qué falta" autocomplete="off"></div>
    ${st.k==='fre'?`<div class="nvl">¿Qué partida no entregó el frente?</div><div class="nvq"><select id="nvpred" aria-label="Partida que no entregó"><option value="">— elige la partida —</option>${scs.map(y=>`<option value="${y.id}"${st.pred===y.id?' selected':''}>${esc(y.name)}</option>`).join('')}</select></div>
      ${eng&&st.pred?`<label class="chk nvpc"><input type="checkbox" id="nvpc"${st.pc?' checked':''}> Contar también en el PPC de ${esc(conOf(st.pred).name)}</label>`:''}`:''}
    ${st.k==='prg'&&eng?`<div class="nvl">¿Quién se equivocó?</div><div class="nvgo"><button data-who="obra" class="${st.who==='obra'?'on':''}"><b>Lo programó mal obra</b><small>PROG · no imputable al SC</small></button><button data-who="sc" class="${st.who==='sc'?'on':''}"><b>El SC lo aceptó y no pudo</b><small>SC · imputable</small></button></div>${st.whoAuto?`<div class="ptx nvhint">${st.whoAuto==='obra'?'Sugerido: el SC había pedido cambiar esta actividad y no se le aceptó.':'Sugerido: el SC no propuso cambios a esta actividad.'}</div>`:''}`:''}
    ${eng?`<div class="nvl">¿Se libera el ${dvLbl(M.date)} a primera hora?</div><div class="nvgo"><button data-nv="lib"><b>Sí · va</b><small>queda como aviso y restricción por liberar</small></button><button data-nv="nolib" class="pri"><b>No · se reprograma</b><small>y queda registrada</small></button></div>`
      :`<div class="nvgo xgo"><button data-nv="prop" class="pri"><b>Proponer «no va»</b><small>lo decide el ingeniero en la reunión</small></button></div>`}`};
  const repHtml=()=>{const T=trenOf(x);const opts=[1,2,3].map(n=>wshift(M.date,n));const n=Math.max(1,wdist(M.date,st.to));const am=S.amb.get(x.ambId);
    const moved=[x,...(st.tren?T:[])];const late=am&&am.hito?moved.filter(y=>(y.days||[]).some(d=>d>=M.date&&wshift(d,n)>am.hito)):[];
    return`${tagHtml()}${st.desc&&st.k!=='int'?`<div class="ptx" style="padding-top:0">${esc(st.desc)} · se registra en Restricciones</div>`:st.k==='int'?`<div class="ptx" style="padding-top:0">${esc(st.desc||'Interferencia con otra partida')}</div>`:''}
    <div class="nvl">¿A qué fecha?</div><div class="nvd">${opts.map(d=>`<button data-to="${d}" class="${st.to===d?'on':''}">${dvLbl(d)}</button>`).join('')}<input type="date" id="nvdt" min="${addD(M.date,1)}" value="${opts.includes(st.to)?'':st.to}" aria-label="Otra fecha" title="Otra fecha"></div>
    <div class="nvl">¿Qué se mueve?</div><div class="nvgo"><button data-tr="0" class="${st.tren?'':'on'}"><b>Solo esta</b><small>las demás del ambiente no cambian</small></button><button data-tr="1" class="${st.tren?'on':''}"${T.length?'':' disabled'}><b>Todo el tren${T.length?' ('+(T.length+1)+')':''}</b><small>${T.length?'también '+esc(T.slice(0,3).map(y=>short(y.name,18)).join(', '))+(T.length>3?'…':''):'no hay más en el ambiente'}</small></button></div>
    <div class="ptx">Se ${moved.length>1?'mueven':'mueve'} ${n} día${n>1?'s':''} hábil${n>1?'es':''}: ${esc(moved.map(y=>short(y.name,22)).join(' · '))}.${late.length?` <b class="bad">⚑ Pasa el hito ${esc(am.hitoLabel||'')} (${fmtD(am.hito)}).</b>`:''}</div>
    <button data-nv="go" class="pri nvok">Reprogramar al ${dvLbl(st.to)}</button>`};
  const step=s=>{st.s=s;show(s==='mot'?motHtml():s==='det'?detHtml():repHtml())};
  const progDef=()=>{if(st.k!=='prg'||!eng||st.who)return;nvProgDef(x).then(w=>{if(st.who)return;st.who=w;st.whoAuto=w;if(st.s==='det'&&pop&&pop.isConnected)step('det')})};
  const ok=()=>{const d=(st.desc||'').trim();if(st.k==='fre'&&!st.pred){toast('Elige la partida que no entregó el frente.');return false}if(st.k==='prg'&&eng&&!st.who){toast('Elige quién se equivocó.');return false}
    if(!d&&st.k!=='per'&&st.k!=='fre'&&st.k!=='prg'){toast('Escribe qué falta.');return false}st.desc=d;return true};
  function click(e){const b=e.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.to){st.to=b.dataset.to;step('rep');return}
    if(b.dataset.tr!=null){st.tren=b.dataset.tr==='1';step('rep');return}
    if(b.dataset.nk){st.k=b.dataset.nk;if(st.k!=='prg'){st.who='';st.whoAuto=''}step('det');progDef();return}
    if(b.dataset.who){st.who=b.dataset.who;step('det');return}
    const v=b.dataset.nv;if(!v)return;
    if(v==='keep'){closePop();dpReject(st.prop);return}
    if(v==='chg'){step('mot');return}
    if(v==='prop'){if(!ok())return;closePop();dpPropose(x,st.k,st.desc,st.k==='fre'?{pred:st.pred}:null);return}
    if(v==='lib'){if(!ok())return;closePop();if(st.prop){dpTake(st.prop,dpDec('ok','Va: se libera a primera hora')).then(r=>{if(r)libGo()});return}libGo();return}
    if(v==='nolib'){if(!ok())return;if(today){closePop();dvResToday(btn,x,st,st.prop);return}step('rep');return}
    if(v==='go'){const dt=($('#nvdt')||{}).value;if(dt&&dt!==st.to){if(!isWork(dt)){toast(nwReason(dt)+': elige un día laborable.');return}st.to=dt}const n=wdist(M.date,st.to);if(n<1){toast('Elige una fecha posterior.');return}closePop();doRep();return}}
  function libGo(){
      /* va con aviso: la restricción queda registrada por liberar ese día a primera hora (se mide igual) */
      const R=nvRestr(x,st,M.date);apply([op('restr',R.rid,R.doc)],'');
      const id=avId(M.date,x.id);const g=[];if(PD.has(id))g.push(remDoc(id));g.push(addDoc(id,{date:M.date,pisoId:M.piso,sc:x.sc,kind:'aviso',actId:x.id,ambId:x.ambId,desc:st.desc||nvMot(st),k:st.k,rid:R.rid,by:me.email,byName:me.name||me.email,ts:NOW()}));
      if(st.prop)g.push(updDoc(st.prop.id,{st:'ok',dec:'Va: se libera a primera hora',decBy:me.email,decN:me.name||me.email,decT:NOW()},{st:'pend',dec:null,decBy:null,decN:null,decT:null}));rec(g.filter(Boolean));
      toast(`Va · aviso en el plano y restricción por liberar: ${nvMot(st)}`);requestRender()}
  function doRep(){const n=wdist(M.date,st.to);if(n<1){toast('Elige una fecha posterior.');return}
    const T=st.tren?trenOf(x):[];
    /* plan aún sin publicar: la decisión queda en el plan y se aplica al lookahead al «Publicar plan» */
    if(pubDraft()){const go=()=>{const nid=nvDraftAdd(x,st,T,n);
        toast(`“${short(x.name,32)}”${T.length?` y ${T.length} más`:''} → ${dvLbl(st.to)} · se aplica al publicar el plan`,'Deshacer',()=>{const o=remDoc(nid);if(o)rec([o]);if(st.prop)dpReopen(st.prop);requestRender()});requestRender()};
      if(st.prop){dpTake(st.prop,dpDec('ok','Reprogramada al '+st.to)).then(r=>{if(r)go()});return}go();return}
    /* ya publicado (día reabierto): se aplica al momento, en una transacción (nvRepPub) */
    nvRepPub(x,st,T,n)}
  if(st.k==='int'&&today){novaDialog(btn,x,{motivo:'Interferencia con otra partida',prio:o.prio||null,prop:st.prop,title:'No va por interferencia',lead:esc(st.desc||'')});return}
  if(st.k==='int'&&eng)step('rep');else if(st.k)step('det');else step('mot');progDef()}
/** «No va → reprogramar» en un plan sin publicar: queda como borrador (el lookahead no cambia hasta publicar). Devuelve el id. */
function nvDraftAdd(x,st,T,n){const A=nvAttr(x,st);const mot=nvMot(st);const ca={c:A.c,cnc:A.cnc,imp:A.imp,rsc:A.rsc,pc:A.pc,rt:A.rt||''};const nid=uid('pz');
  const g=[addDoc(nid,{date:M.date,pisoId:M.piso,sc:x.sc,kind:'nova',actId:x.id,ambId:x.ambId,motivo:mot,k:st.k,...ca,repTo:st.to,tren:T.length,draft:true,ids:[x.id,...T.map(y=>y.id)],shift:n,rdesc:st.desc||mot,pred:st.k==='fre'?st.pred:'',prop:st.prop?st.prop.id:'',by:me.email,byName:me.name||me.email,ts:NOW()})];
  if(st.prop)g.push(updDoc(st.prop.id,{st:'ok',dec:'Reprogramada al '+st.to,decBy:me.email,decN:me.name||me.email,decT:NOW()},{st:'pend',dec:null,decBy:null,decN:null,decT:null}));rec(g.filter(Boolean));return nid}
/* «No va → reprogramar» con el plan ya publicado (día reabierto). Antes se creaban la «no va» y la restricción con ids al azar y
   los días se corrían con la copia local: dos ingenieros a la vez (la PC de la reunión y una tablet) dejaban dos «no va», dos
   restricciones y, si eligieron fechas distintas, días de más. Ahora, como dpTake: id fijo nv_<fecha>_<actividad>, creado en una
   transacción que no escribe nada si ya existe (otro ya decidió) o si la propuesta del SC cambió; los días se corren desde la
   actividad leída en la transacción y la restricción usa el id fijo res-<id de la «no va»> (como al publicar). */
const nvId=(d,aid)=>'nv_'+d+'_'+aid;
const NVBUSY=new Set();
async function nvRepPub(x,st,T,n){if(!db){toast('Sin conexión con la base: no se reprogramó.');return}
  const date=M.date,nid=nvId(date,x.id);if(NVBUSY.has(nid))return;
  /* un día cerrado no se mueve sin aviso (igual que apply): se revisa con la copia local antes de ir a la base */
  if(typeof lockGuard==='function'&&!lockGuard([x,...T].map(y=>shiftOp(y,n,date)),()=>nvRepPub(x,st,T,n)))return;
  const A=nvAttr(x,st);const mot=nvMot(st);const ca={c:A.c,cnc:A.cnc,imp:A.imp,rsc:A.rsc,pc:A.pc,rt:A.rt||''};
  const R0=nvRestr(x,st,st.to,'res-'+nid);const{id:_r0,...rb}=R0.doc;const ids=[x.id,...T.map(y=>y.id)];const p=st.prop;const pt=p?dpDec('ok','Reprogramada al '+st.to):null;
  NVBUSY.add(nid);let r;
  try{r=await db.runTransaction(async tx=>{const zref=fcol('pdz').doc(nid);
    if((await tx.get(zref)).exists)return{bad:'taken'};
    if(p){const ps=await tx.get(fcol('pdz').doc(p.id));if(!ps.exists)return{bad:'gone'};const c=ps.data();if(c.st!=='pend')return{bad:'taken'};
      if((c.ts||0)!==(p.ts||0)||(c.k||'')!==(p.k||'')||(c.desc||'')!==(p.desc||''))return{bad:'changed'}}
    const rs=await tx.get(fcol('restr').doc(R0.rid));
    const Ad=await Promise.all(ids.map(id=>tx.get(fcol('acts').doc(id))));const Am=new Map();Ad.forEach((d,i)=>{if(d.exists)Am.set(ids[i],actNorm({...d.data(),id:ids[i]}))});
    const y0=Am.get(x.id);if(!y0||y0.arch||!(y0.days||[]).includes(date))return{bad:'moved'};
    const W=[],mv={};
    ids.forEach((id,i)=>{const y=Am.get(id);if(!y||y.arch||(i&&!(y.days||[]).some(d=>d>=date)))return;const nx=shiftDays(y,n,date);
      /* el día que no fue queda marcado en el lookahead (↷); en el tren, su primer día movido */
      const k=i===0?date:rplDay(y,date);if(k)nx.rpl={...(y.rpl||{}),[k]:{to:i===0?st.to:wshift(k,n),m:mot,...ca,...(i?{tr:x.id}:{})}};
      mv[id]={p:y.days||[],pq:y.qty||{},n:nx.days,nq:nx.qty||{}};W.push({id,b:y,a:nx})});
    /* la restricción usa el id fijo; si ya hay una vigente con ese id (de una «no va» anterior que se deshizo pero ya se liberó), no se pisa */
    const rid=rs.exists&&!rs.data().arch?uid('res'):R0.rid;
    for(const w of W)tx.update(fcol('acts').doc(w.id),{days:w.a.days,qty:w.a.qty||{},...(w.a.rpl?{rpl:w.a.rpl}:{})});
    tx.set(fcol('restr').doc(rid),rb);
    const doc={date,pisoId:M.piso,sc:x.sc,kind:'nova',actId:x.id,ambId:x.ambId,motivo:mot,k:st.k,...ca,repTo:st.to,tren:W.length-1,mv,rid,pred:st.k==='fre'?st.pred:'',prop:p?p.id:'',by:me.email,byName:me.name||me.email,ts:NOW()};
    tx.set(zref,doc);if(p)tx.update(fcol('pdz').doc(p.id),pt);
    return{W,rid,doc}})}
  catch(e){toast('No se pudo reprogramar: '+(e&&(e.code||e.message)||'error'));return}
  finally{NVBUSY.delete(nid)}
  if(r.bad){toast(r.bad==='taken'?'Otro usuario ya decidió esta actividad: revisa':r.bad==='changed'?'El subcontratista cambió su propuesta mientras la revisabas: revísala de nuevo.':r.bad==='gone'?'El subcontratista retiró su propuesta.':`Otro usuario ya cambió “${short(x.name,32)}” (ya no está el ${dvLbl(date)}): revisa`);requestRender();return}
  /* reflejar al momento (llega igual por la base) y dejar el deshacer y el historial del lookahead como hacía apply */
  const ops=[{col:'restr',id:r.rid,before:clone(getDoc('restr',r.rid)),after:{...clone(rb),id:r.rid}}];
  for(const w of r.W){const c=S.act.get(w.id)||w.b;const b={...c,days:w.b.days||[],qty:w.b.qty||{}};if(w.b.rpl)b.rpl=w.b.rpl;else delete b.rpl;
    const a={...c,days:w.a.days,qty:w.a.qty||{}};if(w.a.rpl)a.rpl=w.a.rpl;ops.push({col:'acts',id:w.id,before:clone(b),after:clone(a)});S.act.set(w.id,a)}
  if(ARCH.res)ARCH.res.delete(r.rid);S.res.set(r.rid,{...clone(rb),id:r.rid});DV++;
  ops.label='';if(typeof lhLog==='function')ops.lid=lhLog(ops,'');if(typeof undoS!=='undefined'){undoS.push(ops);if(undoS.length>150)undoS.shift();redoS.length=0;updUndo()}
  PD.set(nid,{...r.doc,id:nid});PDV++;const g=[{op:'add',id:nid,doc:r.doc}];
  if(p){const z=PD.get(p.id);if(z)pdPatch(z,pt);g.push({op:'upd',id:p.id,before:{st:'pend',dec:null,decBy:null,decN:null,decT:null},after:pt})}rec(g);
  const nT=r.W.length-1;toast(`“${short(x.name,32)}”${nT?` y ${nT} más`:''} → ${dvLbl(st.to)} · restricción registrada`,'Deshacer',()=>{const z=PD.get(nid);if(z)revertRep(z)});requestRender()}
/** primer día (desde la fecha del plan) que una actividad del tren deja de hacer: ahí queda su marca ↷ */
function rplDay(y,from){return(y.days||[]).filter(d=>d>=from).sort()[0]||''}
/** causa de no cumplimiento para lo que no va hoy (cuenta en el PPC del día) */
function cncFor(k){if(k&&nvcOf(k))return nvCnc(nvcOf(k).c);const L=P().cnc||[];const want=k==='per'?'SC':'PROG';return L.find(c=>cncCode(c)===want)||L[0]||''}
/** hoy (o un día pasado): la restricción se registra y sigue el flujo de «no se hará hoy» de siempre (con la causa y quién responde) */
function dvResToday(btn,x,st,prop){/* la restricción se registra solo si se confirma (cancelar no deja una restricción suelta) */
  const A=nvAttr(x,st);const reg=nid=>{/* id fijo res-<id de la «no va»> (si ya hay una vigente con ese id, otro) */let r0=nid?'res-'+nid:'';const ex=r0&&getDoc('restr',r0);if(ex&&!ex.arch)r0='';const R=nvRestr(x,st,M.date,r0);apply([op('restr',R.rid,R.doc)],'Restricción registrada');return R.rid};
  setTimeout(()=>novaDialog(btn,x,{motivo:A.cnc,imp:A.imp===cncImp(A.cnc)?null:A.imp,rsc:A.rsc,pc:A.pc,title:'No va hoy · '+nvMot(st),prop,onSave:reg}),0)}
/* ---------- Cambios del plan (recuadro a la derecha) ---------- */
function chHtml(sc){const K=M.date+'|'+M.piso;const E=[];
  for(const z of PD.values()){if(z.pisoId!==M.piso||!scIn(sc,z.sc))continue;const y=S.act.get(z.actId);const ay=y&&S.amb.get(y.ambId);const nm=`<span class="mono">${esc(ay?ay.code:'')}</span> ${esc(y?short(y.name,30):'(actividad eliminada)')}`;
    if(z.kind==='nova'&&z.k)E.push({t:z.ts||0,h:`<div class="mchi" style="--c:${conOf(z.sc).color}"><div>→ ${nm}<small>${esc(conOf(z.sc).name)} · ${esc(z.motivo||'')} · al ${dvLbl(z.repTo)}${z.tren?` · con ${z.tren} más del ambiente`:''}${z.draft?' · <b>se aplica al publicar</b>':''}</small></div><span class="mchact">${y?`<button class="lnkb" data-golk="${esc(z.actId)}" title="Ver la actividad en el lookahead">Lookahead ↗</button>`:''}${dzEng()?`<button class="lnkb" data-chu="${z.id}">Deshacer</button>`:''}</span></div>`});
    else if(z.kind==='nova')E.push({t:z.ts||0,h:`<div class="mchi" style="--c:${conOf(z.sc).color}"><div>✗ ${nm}<small>No va · ${esc(z.motivo||'')}${z.repTo?' · → '+fmtD(z.repTo):''}</small></div><span class="mchact">${y?`<button class="lnkb" data-golk="${esc(z.actId)}" title="Ver la actividad en el lookahead">Lookahead ↗</button>`:''}${(z.k||z.eng?dzEng():dzCan(y))?`<button class="lnkb" data-undo="${z.id}">Vuelve a ir</button>`:''}</span></div>`});
    else if(z.kind==='aviso')E.push({t:z.ts||0,h:`<div class="mchi" style="--c:${conOf(z.sc).color}"><div>⚠ ${nm}<small>Va · liberar a primera hora: ${esc(z.desc||'')}</small></div>${dzEng()?`<button class="lnkb" data-avx="${z.id}">Quitar aviso</button>`:''}</div>`});
    else if(z.kind==='xok'&&z.date===M.date){const kn=k=>{if(k.startsWith('a:')){const y_=S.act.get(k.slice(2));const a_=y_&&S.amb.get(y_.ambId);return y_?`${conOf(y_.sc).name} (${a_?a_.code+' ':''}${short(y_.name,22)})`:'—'}const z_=PD.get(k.slice(2));return z_?conOf(z_.sc).name+' (no programado)':'—'};
      const L_=z.ord||z.keys||z.pair||[];E.push({t:z.ts||0,h:`<div class="mchi" style="--c:${conOf(z.sc).color}"><div>${z.ord?'⇢':'✓'} ${z.ord?`Orden: ${L_.map((k,i)=>`${i+1}.º ${esc(kn(k))}`).join(' → ')}`:`Pueden trabajar a la vez: ${L_.map(k=>esc(kn(k))).join(' · ')}`}<small>Cruce decidido por ${esc(z.n||'')}</small></div>${dzEng()?`<button class="lnkb" data-xun="${z.id}">Deshacer</button>`:''}</div>`})}
    else if(z.kind==='dprop'&&z.st==='rej')E.push({t:z.decT||0,h:`<div class="mchi" style="--c:${conOf(z.sc).color}"><div>✓ ${nm}<small>Propuesta rechazada: va según lo programado</small></div></div>`})}
  E.sort((a,b)=>b.t-a.t);const L=(M.dzlog&&M.dzlog.d===K?M.dzlog.L:[]).map(t=>`<div class="mchi"><div>${esc(t)}</div></div>`);const n=E.length+L.length;if(!n)return'';const op_=!!M.chOpen;
  return`<button class="mpdh mchh" data-chtog="1" aria-expanded="${op_}">Cambios del plan <b>${n}</b><span>${op_?'▴':'▾'}</span></button>${op_?`<div class="mpdl">${E.map(e=>e.h).join('')}${L.join('')}</div>`:''}`}
/** deshacer una reprogramación antigua (sin el «antes» guardado): se devuelven los mismos días hábiles a la actividad y a su tren */
function revertOld(z,btn){const x=S.act.get(z.actId);if(!x||!z.repTo){toast('No se encontró la actividad: corrígela en el lookahead.');return}const n=wdist(z.date,z.repTo);if(n<1)return;
  const L=[...S.act.values()].filter(y=>y.ambId===x.ambId).sort(byOrder);const i=L.findIndex(y=>y.id===x.id);const T=L.slice(i+1).filter(y=>(y.days||[]).some(d=>d>=z.repTo)).slice(0,z.tren||0);const mv=[x,...T];
  const go=()=>{apply(mv.map(y=>shiftOp(y,-n,z.repTo)),'Reprogramación deshecha');const o=remDoc(z.id);if(o)rec([o]);if(z.prop){const p=PD.get(z.prop);if(p)dpReopen(p)}requestRender();toast('Reprogramación deshecha','Deshacer',()=>window.undo())};
  if(!btn){go();return}const r=btn.getBoundingClientRect();
  openPop(anchorAt(r.left,r.bottom-1),`<div class="ph">Deshacer la reprogramación</div><div class="ptx">Vuelve${mv.length>1?'n':''} ${n} día${n>1?'s':''} hábil${n>1?'es':''} atrás: ${esc(mv.map(y=>short(y.name,22)).join(' · '))}.</div><button data-do="si">↶ Deshacer</button><button data-do="no">Cancelar</button>`,{si:go,no:()=>{}})}
function revertRep(z,btn){if(z.draft){const o=remDoc(z.id);if(o)rec([o]);if(z.prop){const p=PD.get(z.prop);if(p)dpReopen(p)}requestRender();return}if(!z.mv){revertOld(z,btn);return}const ops=[];let blocked=0;
  for(const[id,o]of Object.entries(z.mv||{})){const y=S.act.get(id);if(!y)continue;if(canon(y.days||[])!==canon(o.n||[])||(o.nq&&canon(y.qty||{})!==canon(o.nq))){blocked++;continue}ops.push(op('acts',id,rplOff({...y,days:o.p||[],qty:o.pq||{}},id===z.actId?z.date:rplKey(y,z.actId,z.date))))}
  if(blocked){toast('Esas fechas o cantidades ya se cambiaron después: corrígelas en el lookahead (no se deshizo para no pisar ese cambio).');return}
  if(z.rid){const r=S.res.get(z.rid);if(r&&r.status!=='lib'){const a=arc('restr',z.rid);if(a)ops.push(a)}}
  apply(ops,'Reprogramación deshecha');const o=remDoc(z.id);if(o)rec([o]);if(z.prop){const p=PD.get(z.prop);if(p)dpReopen(p)}requestRender()}

/* ---------- Fuerza laboral, horario y cuadrillas del subcontratista (opcional por ahora) ----------
   Un registro por SC y día en pdz (kind 'fza', id fz_<fecha>_<sc>): {items:[{cat,esp,n}], cuad:[{id,n}], hor:{t:'n'|'e',fin}, asg:{actId:{c,o,n?}}, sinDist}.
   'fzl_<sc>' guarda lo último para copiarlo al día siguiente. Las cuadrillas se reparten arrastrándolas al plano (PC) o tocando (celular). */
const FZ_CATS=['Capataz','Operario','Oficial','Peón'];
/* achurado de «dos partidas en el mismo lugar»: no se dibuja mientras el SC arma su plan (lo ve el ingeniero) ni si el ingeniero lo oculta */
const cxHid=()=>M.cxHide??(myRole()==='sc');
const cxVis=()=>M.meet?!M.cqOn&&!cxHid()&&M.mmode==='plan':!M.cqOn&&(pmEng()?pmode()==='cx':!cxHid());
const CQC=['#7B1FA2','#00897B','#EF6C00','#1565C0','#C2185B','#558B2F','#6D4C41','#00838F'];
const fzId=(d,sc)=>'fz_'+d+'_'+sc;
const fzOf=sc=>sc?PD.get(fzId(M.date,sc))||null:null;
const fzMine=()=>myRole()==='sc'&&M.scDraw&&myScs().includes(M.scDraw)?M.scDraw:'';
const fzTot=f=>(f&&f.items||[]).reduce((a,i)=>a+(+i.n||0),0);
const cqCol=(f,c)=>{const i=(f&&f.cuad||[]).findIndex(q=>q.id===c);return CQC[(i<0?0:i)%CQC.length]};
const horTxt=f=>{const h=f&&f.hor||{t:'n'};return h.t==='e'?`extendido hasta ${hm12(h.fin||'19:00')}`:'hasta 5:00 p. m.'};
function hm12(t){const[H,m]=String(t||'17:00').split(':').map(Number);const ap=H>=12?'p. m.':'a. m.';const h=((H+11)%12)+1;return`${h}:${String(m||0).padStart(2,'0')} ${ap}`}
/** etiqueta de la cuadrilla de una actividad: «C1» o «C1·2» si es la segunda que hace en el día */
/** reparto vigente: solo actividades que siguen programadas ese día (si en la reunión una no va, sale del recorrido) */
function asgDay(f){const o={};const ng=noGoSet();for(const[k,v]of Object.entries(f&&f.asg||{})){const x=S.act.get(k);if(x&&schedOn(x,M.date)&&!dpPend(k)&&!ng.has(k))o[k]=v}return o}
function cqTag(sc,aid){const f=fzOf(sc);const A=asgDay(f);const a=A[aid];if(!a)return null;const L=Object.entries(A).filter(([,v])=>v.c===a.c).sort((p,q)=>(p[1].o||0)-(q[1].o||0));const r=L.findIndex(([k])=>k===aid)+1;return{t:r>1?a.c+'·'+r:a.c,col:cqCol(f,a.c),c:a.c,r}}
function cqRoute(f,c){return Object.entries(asgDay(f)).filter(([,v])=>v.c===c).sort((p,q)=>(p[1].o||0)-(q[1].o||0)).map(([k])=>k)}
/** flechas punteadas con el recorrido de cada cuadrilla sobre el plano */
function cqRoutes(all,fv){let o='';const byAct=new Map();all.forEach(z=>{if(z.kind==='zona'&&z.actId&&!byAct.has(z.actId))byAct.set(z.actId,z)});
  for(const f of PD.values()){if(f.kind!=='fza'||!f.asg||(fv&&!scIn(fv,f.sc)))continue;for(const q of f.cuad||[]){if(M.cqFocus!==f.sc+'|'+q.id)continue;
    const P=[];cqRoute(f,q.id).map(a=>byAct.get(a)).filter(Boolean).map(z=>centroid(unflat(z.pts))).forEach(p=>{const l=P[P.length-1];if(!l||Math.hypot(l.x-p.x,l.y-p.y)>1)P.push(p)});if(P.length<2)continue;const col=cqCol(f,q.id);
    o+=`<polyline points="${P.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" opacity=".85" pointer-events="none"/><polyline points="${P.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];const ang=Math.atan2(b.y-a.y,b.x-a.x);const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const k=Math.max(1,1/(M.view?M.view.z:1))*9;
      o+=`<polygon points="${mx+Math.cos(ang)*k},${my+Math.sin(ang)*k} ${mx+Math.cos(ang+2.5)*k},${my+Math.sin(ang+2.5)*k} ${mx+Math.cos(ang-2.5)*k},${my+Math.sin(ang-2.5)*k}" fill="${col}" pointer-events="none"/>`}}}return o}
function fzBlank(sc){return{date:M.date,sc,kind:'fza',items:[],cuad:[],hor:{t:'n',fin:'17:00'},asg:{},sinDist:false}}
function fzWrite(sc,patch,undoable){const id=fzId(M.date,sc);const cur=PD.get(id);
  if(cur&&undoable){const before={};Object.keys(patch).forEach(k=>before[k]=cur[k]===undefined?null:JSON.parse(JSON.stringify(cur[k])));rec([updDoc(id,{...patch,ts:NOW()},{...before})]);requestRender();return}
  /* si ya existe se actualizan solo los campos que cambian (no se pisa lo que guardó otro equipo) */
  let doc;if(cur){const p2={...patch,by:me.email,byName:me.name||me.email,ts:NOW()};PDV++;pdPatch(cur,p2);updPD(id,p2);doc=strip_(cur)}else{doc={...fzBlank(sc),...Object.fromEntries(Object.entries(patch).filter(([k])=>!k.includes('.'))),by:me.email,byName:me.name||me.email,ts:NOW()};PDV++;PD.set(id,{...doc,id});savePD(id,doc)}
  if(patch.items||patch.cuad||patch.hor)savePD('fzl_'+sc,{date:'_last',kind:'fzl',sc,items:doc.items||[],cuad:doc.cuad||[],hor:doc.hor||{t:'n',fin:'17:00'},ts:NOW()});requestRender()}
/* tarjeta del equipo en el panel (subcontratista) */
function fzCardHtml(role,sc){const mine=fzMine();if(!mine)return'';const f=fzOf(mine);
  if(f&&f.sinDist)return`<div class="fzc off"><span>👷 Programas sin distribución de personal</span><button class="lnkb" data-fz="open">Añadir fuerza laboral</button></div>`;
  if(!f||!(f.items||[]).length)return`<div class="fzc"><div><b>👷 Tu equipo para el ${dvLbl(M.date)}</b><small>Indica tu fuerza laboral, el horario y reparte tus cuadrillas en el plano.</small></div><div class="fzcb"><button class="ib pri" data-fz="open">Añadir fuerza laboral</button><button class="lnkb" data-fz="skip">Programar sin distribución</button></div></div>`;
  const n=fzTot(f),nq=(f.cuad||[]).length,asg=Object.keys(asgDay(f)).length;
  return`<div class="fzc ok"><div><b>👷 ${n} persona${n===1?'':'s'} · ${nq} cuadrilla${nq===1?'':'s'} · ${horTxt(f)}</b><small>${(f.items||[]).map(i=>`${i.n} ${esc(i.cat)}${i.esp?' '+esc(i.esp):''}`).join(' · ')}${nq?` · ${asg} actividad${asg===1?'':'es'} con cuadrilla`:''}</small></div><div class="fzcb"><button class="ib" data-fz="open">Editar</button>${nq?`<button class="ib${M.cqOn?' on':''}" data-fz="rep">${M.cqOn?'Ocultar reparto':'Repartir en el plano'}</button>`:''}</div></div>`}
/* hoja de fuerza laboral, horario y cuadrillas: cada cuadrilla tiene su personal; el total en obra es la suma.
   Los cambios se dibujan en su lugar (sin volver a armar la ventana), para que no parpadee. */
const cqItems=q=>Array.isArray(q.items)?q.items:[];
function fzAgg(cuad){const m=new Map();for(const q of cuad)for(const i of cqItems(q)){const cat=String(i.cat||'').trim(),esp=String(i.esp||'').trim();if(!cat||!(+i.n>0))continue;const k=cat.toLowerCase()+'|'+esp.toLowerCase();const o=m.get(k)||{cat,esp,n:0};o.n+=+i.n;m.set(k,o)}return[...m.values()]}
/* en el celular «Equipos del día» empieza plegado: abierto tapaba el plano */
function fzIsOpen(){/* en el panel con pestañas siempre se arma (se ve al elegir su pestaña) */return true}
async function fzOpen(sc,selC){const f=fzOf(sc);let src=f&&((f.cuad||[]).length||(f.items||[]).length)?f:null;let copied=false;
  if(!src){try{const d=await fcol('pdz').doc('fzl_'+sc).get();if(d.exists){src=d.data();copied=true}}catch(e){}}
  let cuad=src?JSON.parse(JSON.stringify(src.cuad||[])):[];
  if(cuad.length&&!cuad.some(q=>cqItems(q).length))cuad=cuad.map((q,k)=>({id:q.id,items:k===0?JSON.parse(JSON.stringify(src.items||[])):[]}));
  if(!cuad.length)cuad=[{id:'C1',items:src&&src.items&&src.items.length?JSON.parse(JSON.stringify(src.items)):[{cat:'Operario',esp:'',n:1},{cat:'Peón',esp:'',n:1}]}];
  cuad.forEach(q=>{q.items=cqItems(q).map(i=>({cat:i.cat||'',esp:i.esp||'',n:+i.n||0}))});
  const F={cuad,sel:Math.max(0,selC?cuad.findIndex(q=>q.id===selC):0),hor:{t:src&&src.hor&&src.hor.t==='e'?'e':'n',fin:(src&&src.hor&&src.hor.t==='e'&&src.hor.fin)||'19:00'},copied};
  const qn=q=>q.items.reduce((a,i)=>a+(+i.n||0),0),tot=()=>F.cuad.reduce((a,q)=>a+qn(q),0);
  const rowsHtml=()=>{const q=F.cuad[F.sel];return q.items.map((i,k)=>`<div class="fzr"><input list="fzcats" data-fi="${k}" data-ff="cat" value="${esc(i.cat||'')}" placeholder="Categoría" aria-label="Categoría"><input data-fi="${k}" data-ff="esp" value="${esc(i.esp||'')}" placeholder="Oficio (p. ej. pintor)" aria-label="Oficio"><span class="fzn"><button data-fn="${k}|-1" aria-label="Menos">−</button><b data-fnv="${k}">${+i.n||0}</b><button data-fn="${k}|1" aria-label="Más">+</button></span><button class="ab" data-fdel="${k}" aria-label="Quitar">&times;</button></div>`).join('')||'<p class="lqmsg">Esta cuadrilla aún no tiene personal.</p>'};
  const chipsHtml=()=>F.cuad.map((q,k)=>`<button class="fzqc${k===F.sel?' on':''}" data-fqs="${k}" style="--q:${CQC[k%CQC.length]}"><i>${esc(q.id)}</i><span data-fqn="${k}">${qn(q)} p.</span></button>`).join('')+'<button class="ib" data-fqadd="1">+ Cuadrilla</button>';
  const totHtml=()=>{const n=tot();return`Total en obra: <b>${n}</b> persona${n===1?'':'s'}${F.cuad.length>1?' · '+F.cuad.map(q=>esc(q.id)+': '+qn(q)).join(' · '):''}`};
  const inner=()=>{const q=F.cuad[F.sel];return`<div class="lqtop"><b>👷 ${esc(conOf(sc).name)} · ${dvLbl(M.date)}</b><button class="ab" data-lqx aria-label="Cerrar">&times;</button></div>
      ${F.copied?'<p class="lqmsg">Copiado de tu último registro: corrige solo lo que cambió.</p>':''}
      <div class="fzs"><b>Cuadrillas</b><div class="fzq" id="fzchips">${chipsHtml()}</div><p class="lqmsg">Elige una cuadrilla para ver y editar su personal.</p></div>
      <div class="fzs"><div class="fzsh"><b>Personal de ${esc(q.id)}</b>${F.cuad.length>1?`<button class="lnkb" data-fqdel="${F.sel}">Quitar ${esc(q.id)}</button>`:''}</div><datalist id="fzcats">${FZ_CATS.map(c=>`<option value="${c}">`).join('')}</datalist>
        <div id="fzrows">${rowsHtml()}</div>
        <div class="fzfoot"><button class="lnkb" data-fadd="1">+ Agregar categoría</button><span id="fztot">${totHtml()}</span></div></div>
      <div class="fzs"><b>Horario</b><div class="fzh"><button data-fh="n" class="${F.hor.t!=='e'?'on':''}">Normal · hasta 5:00 p. m.</button><button data-fh="e" class="${F.hor.t==='e'?'on':''}">Extendido hasta <input type="time" id="fzfin" value="${esc(F.hor.fin||'19:00')}" aria-label="Hora de salida"></button></div></div>
      <div class="fzbt"><button class="ib" data-fskip="1">Programar sin distribución</button><button class="ib pri" data-fok="1">Guardar y repartir en el plano</button></div>`};
  const full=()=>{const c=$('#lqm .lqc');if(c)c.innerHTML=inner();else lqModal(inner(),click,null);wire()};
  const counts=()=>{const t=$('#fztot');if(t)t.innerHTML=totHtml();F.cuad.forEach((q,k)=>{const e=$(`#lqm [data-fqn="${k}"]`);if(e)e.textContent=qn(q)+' p.'})};
  const wire=()=>{const m=$('#lqm');if(!m)return;m.oninput=e=>{const t=e.target;if(t.dataset.fi!=null){F.cuad[F.sel].items[+t.dataset.fi][t.dataset.ff]=t.value}if(t.id==='fzfin'){F.hor.fin=t.value;F.hor.t='e';hor()}}};
  const hor=()=>{$$('#lqm [data-fh]').forEach(b=>b.classList.toggle('on',b.dataset.fh===F.hor.t))};
  function click(e){const b=e.target.closest('button');if(!b)return;const d=b.dataset;const q=F.cuad[F.sel];
    if(d.fn){const[k,s_]=d.fn.split('|');const it=q.items[+k];it.n=Math.max(0,(+it.n||0)+(+s_));const v=$(`#lqm [data-fnv="${k}"]`);if(v)v.textContent=it.n;counts();return}
    if(d.fdel!=null){q.items.splice(+d.fdel,1);$('#fzrows').innerHTML=rowsHtml();counts();return}
    if(d.fadd){q.items.push({cat:'',esp:'',n:1});$('#fzrows').innerHTML=rowsHtml();counts();setTimeout(()=>{const L=$$('#lqm [data-ff="cat"]');if(L.length)L[L.length-1].focus()},30);return}
    if(d.fh){F.hor.t=e.target.tagName==='INPUT'?'e':d.fh;hor();return}
    if(d.fqs!=null){F.sel=+d.fqs;full();return}
    if(d.fqdel!=null){F.cuad.splice(+d.fqdel,1);F.sel=Math.max(0,Math.min(F.sel,F.cuad.length-1));full();return}
    if(d.fqadd){let i=1;const ids=new Set(F.cuad.map(q=>q.id));while(ids.has('C'+i))i++;F.cuad.push({id:'C'+i,items:[{cat:'Operario',esp:'',n:1}]});F.sel=F.cuad.length-1;full();return}
    if(d.fskip){lqClose();fzWrite(sc,{sinDist:true});M.cqOn=false;toast('Listo: programas sin distribución de personal.');return}
    if(d.fok){const cuad=F.cuad.map(q=>{const items=q.items.map(i=>({cat:String(i.cat||'').trim(),esp:String(i.esp||'').trim(),n:+i.n||0})).filter(i=>i.cat&&i.n>0);return{id:q.id,items,n:items.reduce((a,i)=>a+i.n,0)}});
      if(!cuad.some(q=>q.n>0)){toast('Indica el personal de al menos una cuadrilla.');return}
      /* el reparto no se reescribe entero (otro equipo del mismo SC puede estar repartiendo): solo se quitan las actividades de cuadrillas eliminadas */
      const ids=new Set(cuad.map(q=>q.id));const old=(fzOf(sc)||{}).asg||{};const rm={};for(const[k,v]of Object.entries(old))if(!ids.has(v.c))rm['asg.'+k]=delS();
      lqClose();fzWrite(sc,{items:fzAgg(cuad),cuad,hor:{t:F.hor.t==='e'?'e':'n',fin:F.hor.t==='e'?(F.hor.fin||'19:00'):'17:00'},sinDist:false,...rm});M.cqOn=true;M.cqSel='';return}}
  lqModal(inner(),click,null);wire()}
/* barra flotante de cuadrillas sobre el plano */
function cqBarHtml(role){const sc=fzMine();if(!sc||!M.cqOn)return'';const f=fzOf(sc);if(!f||!(f.cuad||[]).length)return'';
  const used={};const AD=asgDay(f);Object.values(AD).forEach(a=>used[a.c]=(used[a.c]||0)+1);
  const va=dayActs(M.piso,M.date).filter(o=>o.x.sc===sc&&!dpPend(o.x.id));const sin=va.filter(o=>!AD[o.x.id]).length;const tap=PHONE()||innerWidth<900;
  const any=Object.keys(AD).length;
  return`<span class="cqh">${tap?(M.cqSel?`Toca la actividad para <b>${esc(M.cqSel)}</b>`:'Toca una cuadrilla'):'<span title="Para quitarla, arrastra su etiqueta fuera de las actividades">Arrastra cada cuadrilla al número de su actividad</span>'}</span>${(f.cuad||[]).map(q=>`<button class="cqchip${M.cqSel===q.id?' on':''}${M.cqFocus===sc+'|'+q.id?' fo':''}" data-cqd="${esc(q.id)}" style="--q:${cqCol(f,q.id)}" title="${esc(q.id)} · ${q.n} persona${q.n===1?'':'s'}${used[q.id]?' · '+used[q.id]+' actividad'+(used[q.id]>1?'es':''):''} · pasa el mouse para ver su recorrido"><b>${esc(q.id)}</b><small>${q.n} p.${used[q.id]?' · '+used[q.id]:''}</small></button>`).join('')}
    <span class="cqsin${sin?' bad':''}">${sin?`${sin} sin cuadrilla`:'✓ Todas con cuadrilla'}</span>${any?'<button class="ib" data-cqclr="1" title="Quitar todas las cuadrillas del plano para empezar de nuevo">Limpiar todo</button>':''}<button class="ib pri" data-fz="rep">Listo</button>`}
function cqClear(){const sc=fzMine();const f=fzOf(sc);if(!f||!Object.keys(f.asg||{}).length)return;M.cqFocus='';M.cqSel='';fzWrite(sc,{asg:{}},true);toast('Se quitaron todas las cuadrillas del plano','Deshacer',()=>undo())}
/* lo que ve el ingeniero (y el SC lo suyo): equipos del día */
function fzBoxHtml(role,sf){const mine=role==='sc'?new Set(myScs()):null;const scs=[...new Set(dayActs(M.piso,M.date).map(o=>o.x.sc))].filter(c=>(!mine||mine.has(c))&&scIn(sf,c)).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));if(!scs.length)return'';
  const rows=scs.map(sc=>{const f=fzOf(sc);const c=conOf(sc);
    if(!f||(!f.sinDist&&!(f.items||[]).length))return`<div class="mfzi" style="--c:${c.color}"><b>${esc(c.name)}</b><small>Sin fuerza laboral indicada</small></div>`;
    if(f.sinDist)return`<div class="mfzi" style="--c:${c.color}"><b>${esc(c.name)}</b><small>Sin distribución</small></div>`;
    const acts=dayActs(M.piso,M.date).filter(o=>o.x.sc===sc&&!dpPend(o.x.id));const AD=asgDay(f);const sin=acts.filter(o=>!AD[o.x.id]).length;const ext=f.hor&&f.hor.t==='e';
    const rt=(f.cuad||[]).map(q=>{const R=cqRoute(f,q.id).map(a=>{const y=S.act.get(a);const ay=y&&S.amb.get(y.ambId);return ay?ay.code:'?'});return`<span class="mfzq${M.cqFocus===sc+'|'+q.id?' fo':''}" data-cqf="${sc}|${esc(q.id)}" role="button" title="Ver su recorrido en el plano" style="--q:${cqCol(f,q.id)}"><i>${esc(q.id)}</i>${R.length?esc(R.join(' → ')):'<em>sin actividad</em>'}${q.n?` · ${q.n} p.`:''}</span>`}).join('');
    return`<div class="mfzi" style="--c:${c.color}"><b>${esc(c.name)}</b><small>${fzTot(f)} personas · ${(f.cuad||[]).length} cuadrillas · <span class="${ext?'ext':''}">${horTxt(f)}</span>${sin?` · <span class="bad">${sin} sin cuadrilla</span>`:''}</small>${rt}</div>`});
  /* en el celular, mientras se reparte una cuadrilla elegida, el recuadro va plegado para no tapar los números del plano */
  const op_=fzIsOpen()&&!(M.cqSel&&innerWidth<900);return`<button class="mpdh mfzh" data-fztog="1" aria-expanded="${op_}">Equipos del ${dvLbl(M.date)} <b>${scs.length}</b><span>${op_?'▴':'▾'}</span></button>${op_?`<div class="mpdl">${rows.join('')}</div>`:''}`}
/* asignar, mover y quitar cuadrillas */
/** cambia solo las actividades tocadas del reparto (ch = {actId: {c,o,n?} | null}) */
function fzAsg(sc,ch){const id=fzId(M.date,sc);const f=PD.get(id);if(!f)return;const old=f.asg||{};const patch={},before={};
  for(const[aid,v]of Object.entries(ch)){patch['asg.'+aid]=v==null?delS():v;before['asg.'+aid]=old[aid]!=null?JSON.parse(JSON.stringify(old[aid])):delS()}
  patch.ts=NOW();rec([updDoc(id,patch,before)]);requestRender()}
function cqAssign(sc,aid,c,fromAid){const f=fzOf(sc);if(!f)return;const asg=f.asg||{};
  if(fromAid&&fromAid!==aid){const v=asg[fromAid];if(v)fzAsg(sc,{[fromAid]:null,[aid]:{...v}});return}
  if(asg[aid]&&asg[aid].c===c)return;const o=Math.max(0,...Object.values(asg).filter(a=>a.c===c).map(a=>a.o||0))+1;fzAsg(sc,{[aid]:{c,o}})}
function cqRemove(sc,aid){const f=fzOf(sc);if(!f||!(f.asg||{})[aid])return;fzAsg(sc,{[aid]:null})}
function cqZoneAt(x,y,sc){const el=document.elementFromPoint(x,y);const t=el&&el.closest&&el.closest('#mstage [data-z]');if(!t)return null;const z=zget(t.dataset.z);return z&&z.kind==='zona'&&z.actId&&z.sc===sc?z:null}
/* etiqueta de una cuadrilla en el plano: su personal por oficio (es el mismo de la fuerza laboral del día) */
function cqMenu(anchor,sc,aid){const f=fzOf(sc);const a=f&&f.asg&&f.asg[aid];if(!a)return;const y=S.act.get(aid);const qi=(f.cuad||[]).findIndex(q=>q.id===a.c);const q=(f.cuad||[])[qi];const tg=cqTag(sc,aid);
  const its=q?cqItems(q):[];const tot=its.reduce((s_,i)=>s_+(+i.n||0),0);
  const again=()=>setTimeout(()=>{const l=$(`#mstage [data-cqt="${CSS.escape(aid)}"]`);if(l)cqMenu(l,sc,aid)},60);
  const setN=(k,d)=>{const cuad=JSON.parse(JSON.stringify(f.cuad||[]));const it=cqItems(cuad[qi])[k];if(!it)return;it.n=Math.max(0,(+it.n||0)+d);cuad[qi].items=cqItems(cuad[qi]).filter(i=>+i.n>0||i===it);cuad[qi].n=cqItems(cuad[qi]).reduce((s_,i)=>s_+(+i.n||0),0);fzWrite(sc,{cuad,items:fzAgg(cuad)},true);again()};
  const H={first:()=>{const mn=Math.min(...Object.values(f.asg).filter(v=>v.c===a.c).map(v=>v.o||0));fzAsg(sc,{[aid]:{...a,o:mn-1}})},rm:()=>cqRemove(sc,aid),ed:()=>fzOpen(sc,a.c)};
  its.forEach((_,k)=>{H['m'+k]=()=>setN(k,-1);H['p'+k]=()=>setN(k,1)});
  openPop(anchor,`<div class="ph">${esc(tg?tg.t:a.c)} · ${esc(short(y?y.name:'',34))}</div>
    <div class="ptx">Personal de la cuadrilla ${esc(a.c)}: <b>${tot}</b> · cambia también su fuerza laboral del día</div>
    ${its.length?its.map((i,k)=>`<div class="qrow"><span class="mu">${esc(i.cat||'')}${i.esp?' · '+esc(i.esp):''}</span><span class="fzn"><button data-do="m${k}" aria-label="Menos ${esc(i.cat||'')}">−</button><b>${+i.n||0}</b><button data-do="p${k}" aria-label="Más ${esc(i.cat||'')}">+</button></span></div>`).join(''):'<div class="ptx">Sin detalle por oficio.</div>'}
    <button data-do="ed">Editar el personal (otro oficio, otra cuadrilla)…</button>
    ${tg&&tg.r>1?'<button data-do="first">Ponerla primero</button>':''}<button data-do="rm">Quitar la cuadrilla</button>`,H)}
let CQD=null;
document.addEventListener('pointerdown',e=>{if(U.tab!=='mapa'||e.button!==0)return;const chip=e.target.closest&&e.target.closest('[data-cqd]');const tag=!chip&&e.target.closest&&e.target.closest('#mstage [data-cqt]');if(!chip&&!tag)return;
  const sc=fzMine();if(!sc){if(tag){e.stopPropagation()}return}e.stopPropagation();e.preventDefault();
  CQD={chip,tag,c:chip?chip.dataset.cqd:null,from:tag?tag.dataset.cqt:null,x0:e.clientX,y0:e.clientY,drag:false,ghost:null,hov:null,sc};
  if(tag){const f=fzOf(sc);const a=f&&f.asg&&f.asg[CQD.from];if(!a){CQD=null;return}CQD.c=a.c}},true);
let CQ_SKIP=false;
/* al pasar el mouse por una cuadrilla de la barra se ve su recorrido (las flechas solo de una a la vez) */
document.addEventListener('pointerover',e=>{if(U.tab!=='mapa'||CQD||e.pointerType==='touch')return;const ch=e.target.closest&&e.target.closest('[data-cqd]');const sc=fzMine();if(!sc)return;const k=ch?sc+'|'+ch.dataset.cqd:'';
  if(ch&&M.cqFocus!==k){M.cqFocus=k;M._cqHov=true;requestRender()}else if(!ch&&M._cqHov&&!e.target.closest('#mcqb')){M._cqHov=false;M.cqFocus='';requestRender()}},true);
addEventListener('pointermove',e=>{const D=CQD;if(!D)return;if(!D.drag&&Math.hypot(e.clientX-D.x0,e.clientY-D.y0)<6)return;
  if(!D.drag){D.drag=true;try{PDOWN=true}catch(_){}M.cqFocus=D.sc+'|'+D.c;const g=document.createElement('div');g.className='cqghost';const f=fzOf(D.sc);g.style.setProperty('--q',cqCol(f,D.c));g.textContent=D.c;document.body.appendChild(g);D.ghost=g;document.body.classList.add('cqdragging')}
  D.ghost.style.left=e.clientX+'px';D.ghost.style.top=e.clientY+'px';
  const z=cqZoneAt(e.clientX,e.clientY,D.sc);const id=z?z.id:null;if(id!==D.hov){if(D.hov){const o=$(`#mstage .pvl[data-z="${CSS.escape(D.hov)}"]`);if(o)o.classList.remove('cqhov')}D.hov=id;if(id){const n=$(`#mstage .pvl[data-z="${CSS.escape(id)}"]`);if(n)n.classList.add('cqhov')}}
  document.body.classList.toggle('cqout',!!D.from&&!id)},true);
addEventListener('pointercancel',()=>{const D=CQD;if(!D)return;CQD=null;try{PDOWN=false}catch(_){}document.body.classList.remove('cqdragging');if(D.ghost)D.ghost.remove();if(D.hov){const o=$(`#mstage .pvl[data-z="${CSS.escape(D.hov)}"]`);if(o)o.classList.remove('cqhov')}},true);
addEventListener('pointerup',e=>{const D=CQD;if(!D)return;CQD=null;try{PDOWN=false}catch(_){}document.body.classList.remove('cqdragging','cqout');if(D.ghost)D.ghost.remove();
  $$('.pvl.cqhov').forEach(o=>o.classList.remove('cqhov'));
  const tapM=PHONE()||innerWidth<900;
  if(!D.drag){if(D.chip){if(tapM){M.cqSel=M.cqSel===D.c?'':D.c;M.cqFocus=M.cqSel?D.sc+'|'+D.c:''}else{M.cqFocus=M.cqFocus===D.sc+'|'+D.c?'':D.sc+'|'+D.c;toast('Arrastra '+D.c+' hasta el número de su actividad en el plano.')}requestRender()}else if(D.tag)cqMenu(D.tag,D.sc,D.from);return}
  const z=cqZoneAt(e.clientX,e.clientY,D.sc);
  if(z){if(D.from){if(z.actId!==D.from){cqAssign(D.sc,z.actId,D.c);toast(`${D.c} también hará «${short((S.act.get(z.actId)||{}).name||'',30)}» al terminar`)}return}cqAssign(D.sc,z.actId,D.c);if(tapM)cqNext(z,D.c);return}
  /* una etiqueta soltada fuera de las actividades (en el plano vacío, en la barra o fuera) se quita */
  if(D.from){cqRemove(D.sc,D.from);toast(`${D.c} quitada de la actividad`,'Deshacer',()=>undo())}},true);
/* celular (o al tocar): con una cuadrilla elegida, tocar una actividad la asigna */
let CQT=null;
document.addEventListener('pointerdown',e=>{CQT=null;if(U.tab!=='mapa'||!M.cqSel||!fzMine()||!(PHONE()||innerWidth<900))return;if(e.target.closest&&e.target.closest('#mstage')&&!e.target.closest('[data-cqt]'))CQT={x:e.clientX,y:e.clientY}},true);
addEventListener('pointerup',e=>{const T=CQT;CQT=null;if(!T||!M.cqSel||Math.hypot(e.clientX-T.x,e.clientY-T.y)>10)return;const sc=fzMine();if(!sc)return;
  const el=document.elementFromPoint(e.clientX,e.clientY);const t=el&&el.closest&&el.closest('#mstage [data-z]');if(!t)return;const z=zget(t.dataset.z);
  CQ_SKIP=true;if(!z||z.kind!=='zona'||!z.actId||z.sc!==sc){toast('Toca una actividad de tu partida.');return}
  const c=M.cqSel;cqAssign(sc,z.actId,c);cqNext(z,c)},true);
function cqNext(z,c){setTimeout(()=>{const l=$(`#mstage .pvl[data-z="${CSS.escape(z.id)}"]`)||$('#mcqb');if(!l)return;M.cqSel=c;
  openPop(l,`<div class="ph">${esc(c)} asignada</div><div class="ptx">¿${esc(c)} hará otra actividad más?</div><button data-do="si" class="pri">Sí · toco la siguiente</button><button data-do="no">No · listo con ${esc(c)}</button>`,
    {si:()=>{M.cqSel=c;requestRender()},no:()=>{M.cqSel='';requestRender()}})},80)}
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
  uiAsk({title:`¿“${x.name}” ya está terminada${d===todayIso()?' hoy':' el '+fmtD(d)}?`,text:typeof DONE_TXT==='string'?DONE_TXT:'Se liberan los días que le quedan en el lookahead.',ok:'Sí, terminada',tone:'ok'}).then(ok=>{if(!ok)return;markDone(x.id,d);dzLog(`✔ ${x.name} terminada`)})}
function dzRes(btn,x){const types=P().restrTypes||[];
  openPop(btn,`<div class="ph">Restricción · ${esc(short(x.name,40))}</div><div class="ptx">No va el ${fmtD(M.date)}. La restricción queda en <b>Restricciones</b>, amarrada a esta actividad.</div>
    <div class="qrow"><select id="dzrt" aria-label="Tipo">${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div>
    <div class="qrow"><input id="dzrd" placeholder="¿Qué falta?" style="width:240px;text-align:left" aria-label="Descripción"></div>
    <div class="qrow"><select id="dzrr" style="width:170px" aria-label="Responsable">${typeof respOpts==='function'?respOpts(conOf(x.sc).name):''}</select><input type="date" id="dzrn" value="${M.date}" aria-label="Para cuándo"></div>
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
  /* se busca en todas las candidatas; solo se muestran las primeras 150 coincidencias */
  L.forEach((o,i)=>{o.q=(o.a.code+' '+o.a.name+' '+o.x.name+' '+conOf(o.x.sc).name).toLowerCase();h['a'+i]=()=>{const after={...o.x,days:[...new Set([...(o.x.days||[]),M.date])].sort()};if(dzWrite(o.x,after,`“${short(o.x.name,40)}” programada para el ${fmtD(M.date)}`)){dzLog(`+ ${o.x.name} programada`);if(typeof reopenAfter==='function')reopenAfter(o.x.id,[M.date])}}});
  const MAXB=150;const list=q=>{const F=L.map((o,i)=>[o,i]).filter(([o])=>!q||o.q.includes(q));return F.slice(0,MAXB).map(([o,i])=>`<button data-do="a${i}" data-q="${esc(o.q)}"><b>${esc(o.a.code)}</b> ${esc(short(o.x.name,34))} <kbd>${esc(conOf(o.x.sc).name)}${nx(o.x)}</kbd></button>`).join('')+(F.length>MAXB?`<div class="ptx">… y ${F.length-MAXB} más: escribe para afinar la búsqueda</div>`:F.length?'':'<div class="ptx">Nada coincide.</div>')};
  openPop(btn,`<div class="ph">Programar el ${fmtD(M.date)}</div><div class="qrow"><input id="dzq" placeholder="Buscar ambiente o actividad" style="width:260px;text-align:left" aria-label="Buscar"></div><div class="dzpl">${list('')}</div>`,h);
  setTimeout(()=>{const i=$('#dzq');if(i){i.focus();i.oninput=()=>{const el=$('#pop .dzpl');if(el)el.innerHTML=list(i.value.trim().toLowerCase())}}},0)}
function planClick(e){const t=e.target;const g=(sel)=>t.closest(sel);let b;if(lockStop(t))return true;
  if((b=g('[data-dzsc]'))){const c=b.dataset.dzsc;
    if((e.ctrlKey||e.metaKey)&&c&&myRole()!=='sc'){const L=scSel_();const n=L.includes(c)?L.filter(x=>x!==c):[...L,c];M.scDraw=n[0]||'';M.scX=n.slice(1)}
    else{M.scDraw=c;M.scX=[]}
    M.scView='';M.cqFocus='';requestRender();return true}
  if((b=g('[data-dv]'))){const[k,id]=b.dataset.dv.split('|');const x=S.act.get(id);if(!x||!dzCan(x)||b.disabled)return true;dvClick(b,x,k);return true}
  if((b=g('[data-dpa]'))){const p=PD.get(b.dataset.dpa);const x=p&&S.act.get(p.actId);if(x&&dzEng())dpAccept(b,x,p);return true}
  if((b=g('[data-dpr]'))){const p=PD.get(b.dataset.dpr);if(p&&dzEng())dpReject(p);return true}
  if((b=g('[data-avx]'))){const av=PD.get(b.dataset.avx);const o=remDoc(b.dataset.avx);if(o)rec([o]);if(av&&av.rid){const r=S.res.get(av.rid);if(r&&r.status!=='lib'){const a=arc('restr',av.rid);if(a)apply([a],'')}}requestRender();return true}
  if((b=g('[data-cxv]'))){if(!M.meet&&pmEng())pmSet(cxVis()?(M.date>todayIso()?'prog':'cu'):'cx');else{M.cxHide=!cxHid();requestRender()}return true}
  if((b=g('[data-cqclr]'))){cqClear();return true}
  if((b=g('[data-cqf]'))){const k=b.dataset.cqf;M.cqFocus=M.cqFocus===k?'':k;requestRender();return true}
  if((b=g('[data-chtog]'))){M.chOpen=!M.chOpen;requestRender();return true}
  if((b=g('[data-fztog]'))){/* plegado por el reparto en el celular: abrirlo termina el reparto de esa cuadrilla */if(M.cqSel&&innerWidth<900){M.cqSel='';M.fzOpen=true}else M.fzOpen=!fzIsOpen();requestRender();return true}
  if((b=g('[data-pub]'))){pubAsk(b);return true}
  if(g('[data-lko]')){lkReopen();return true}
  if(g('[data-lkc]')){lkClose();return true}
  if(g('[data-unpub]')){unpubBar();return true}
  if((b=g('[data-pubx]'))){if(dzEng())pubDiscard();return true}
  if((b=g('[data-golk]'))){if(typeof gotoAct==='function')gotoAct(b.dataset.golk);return true}
  if((b=g('[data-chu]'))){const z=PD.get(b.dataset.chu);if(z&&dzEng())revertRep(z,b);return true}
  if((b=g('[data-xun]'))){const o=dzEng()&&remDoc(b.dataset.xun);if(o){rec([o]);CROSS.key='';requestRender();toast('Decisión del cruce deshecha')}return true}
  if((b=g('[data-fz]'))){const sc=fzMine();if(!sc)return true;const k=b.dataset.fz;if(k==='open')fzOpen(sc);else if(k==='skip'){fzWrite(sc,{sinDist:true});toast('Listo: programas sin distribución de personal.')}else if(k==='rep'){M.cqOn=!M.cqOn;M.cqSel='';requestRender()}return true}
  if((b=g('[data-pdtog]'))){M.pdOpen=M.pdOpen===false;requestRender();return true}
  if((b=g('[data-dz]'))){const[k,id]=b.dataset.dz.split('|');const x=S.act.get(id);if(!x||!dzCan(x))return true;if(k==='man')dzMove(b,x);else if(k==='fin')dzFin(x);else if(k==='res')dzRes(b,x);return true}
  if(t.id==='dzadd'){dzAdd(t);return true}
  if((b=g('[data-goszamb]'))){if(typeof szGoAmb==='function')szGoAmb(b.dataset.goszamb);return true}
  if(t.id==='mpan'||t.id==='mpx'){M.panel=!M.panel;requestRender();return true}
  if((b=g('[data-mdd]'))){zcClose();const v=+b.dataset.mdd;if(typeof AUTO_OFF!=='undefined')AUTO_OFF=true;M.date=v===0?todayIso():addD(M.date,v);if(pd(M.date).getUTCDay()===0)M.date=addD(M.date,v||1);M.selId=null;M.tmp=null;M.pend=null;if(typeof daySet==='function')daySet(M.date);ensurePlan();requestRender();return true}
  if((b=g('[data-tool]'))){M.tool=b.dataset.tool;M.tmp=null;if(M.tool==='pan')M.pend=M.pend;requestRender();return true}
  if(t.id==='mdel'){delSel();return true}
  if(t.closest('#mundo')){undo();return true}
  if((b=g('[data-pm]'))){pmSet(b.dataset.pm);return true}
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
  if(t.id==='mpadone'){paddDone();return true}
  if(t.id==='mcancel'){M.pend=null;M.tmp=null;M.tool='pan';requestRender();return true}
  if(t.id==='mscv'){U.pdHi=t.checked;M.scView='';saveUI();requestRender();return true}
  if((b=g('[data-zamb]'))){const L=drawnOf(b.dataset.zamb).map(z=>z.id);if(L.length)delIds(L,'Vuelve a su ambiente');return true}
  if((b=g('[data-put]'))||(b=g('[data-redo]'))){const id=b.dataset.put||b.dataset.redo;{const x=S.act.get(id);if(x&&canPlan(x.sc))M.scDraw=x.sc}M.pend={actId:id,rep:!!b.dataset.redo};rskWarn(id);if(!['zona','poly'].includes(M.tool))M.tool='zona';M.selId=null;if(innerWidth<900)M.panel=false;requestRender();return true}
  if((b=g('[data-prev]'))){const zn=ZN.get(b.dataset.prev);if(zn){M.scDraw=S.act.get(b.dataset.prev)?.sc||M.scDraw;newZone(unflat(zn.pts),{actId:b.dataset.prev},zn.vista)}return true}
  if(t.id==='mprev'){const L=dayActs(M.piso,M.date).filter(o=>o.x.sc===M.scDraw);const sh=shapesOf(M.piso);let n=0,nr=0;M.batch=true;for(const o of L){if(sh.some(z=>z.actId===o.x.id))continue;const zn=ZN.get(o.x.id);if(zn){newZone(unflat(zn.pts),{actId:o.x.id},zn.vista);n++;if(rskWarn(o.x.id,true))nr++}}M.batch=false;toast(`${n} zona(s) ubicadas como antes. Ajusta las que cambien hoy.${nr?` ⚠ ${nr} tiene${nr>1?'n':''} restricción pendiente (marcadas con ⛔).`:''}`);return true}
  if((b=g('[data-nova]'))){const x=S.act.get(b.dataset.nova);if(x){if(M.date>todayIso())noVa(b,x,{});else novaDialog(b,x)}return true}
  if((b=g('[data-undo]'))){revertNova(b.dataset.undo);return true}
  if((b=g('[data-see]'))){const z=zget(b.dataset.see);if(z){const zv=zVista(z);if(zv&&zv!==M.vista){M.vista=zv;M.sel=zv}M.selId=z.id;M.tool='pan';requestRender();setTimeout(()=>zoomTo(unflat(z.pts)),zv!==M.vista?250:0);if(innerWidth<900)M.panel=false}return true}
  if((b=g('[data-delz]'))){delIds([b.dataset.delz],'Trabajo no programado quitado');return true}
  if(t.id==='mnp'){npDialog(t,null);return true}
  if((b=g('[data-rep]'))){const[id,fd]=b.dataset.rep.split('|');reprogAct(id,M.date,fd);return true}
  if((b=g('[data-cxtog]'))){M.cxOpen=!M.cxOpen;requestRender();return true}
  if((b=g('[data-rdyp]'))){const v=b.dataset.rdyp;if(v!==M.piso){if(typeof U!=='undefined'&&U.piso){U.piso=v;if(typeof saveUI==='function')saveUI()}M.piso=v;M.sel='';M.vista='';M.selId=null;requestRender()}return true}
  if((b=g('[data-paok]'))){if(!dzEng())return true;const o=updDoc(b.dataset.paok,{st:'ok',decBy:me.email,decN:me.name||me.email,decT:NOW()},{st:'pend'});if(o){rec([o]);requestRender();toast('Aceptado: se aplica al publicar')}return true}
  if((b=g('[data-parej]'))){if(!dzEng())return true;const o=updDoc(b.dataset.parej,{st:'rej',draft:false,decBy:me.email,decN:me.name||me.email,decT:NOW()},{st:'pend',draft:true});if(o){rec([o]);requestRender();toast('Propuesta rechazada')}return true}
  if((b=g('[data-padel]'))){const z=PD.get(b.dataset.padel);if(!z||!(dzEng()||z.by===(me&&me.email)))return true;const o=[...paZones(z.id).map(q=>remDoc(q.id)),remDoc(z.id)].filter(Boolean);if(o.length){rec(o);requestRender();toast('Quitado del plan','Deshacer',undo)}return true}
  if((b=g('[data-padraw]'))){paddDraw(b.dataset.padraw);return true}
  if((b=g('[data-rtab]'))){const id=b.dataset.rtab;if(innerWidth<900){if(M.rst===id&&M.rsPh)M.rsPh=false;else M.rsPh=true}else M.rsHide=false;M.rst=id;M.rstMan=true;requestRender();return true}
  if((b=g('[data-rsx]'))){if(innerWidth<900)M.rsPh=!M.rsPh;else M.rsHide=!M.rsHide;requestRender();return true}
  if((b=g('[data-cxrtog]'))){M.cxrOpen=!M.cxrOpen;requestRender();return true}
  if((b=g('[data-rvx]'))){const k=b.dataset.rvx;if(k==='stop')rvxStop();else if(k==='go')rvxNext(0);else rvxGo(0);return true}
  if((b=g('[data-xreo]'))){if(!dzEng())return true;const o=remDoc(b.dataset.xreo);if(o){rec([o]);CROSS.key='';requestRender();toast('El cruce vuelve a quedar pendiente','Deshacer',undo)}return true}
  if((b=g('[data-pcx]'))){const ids=b.dataset.pcx.split('|');const P=ids.flatMap(id=>{const z=zget(id);return z?unflat(z.pts):[]});if(P.length)zoomTo(P);const c=CROSS.list.find(q=>(q.a.id===ids[0]&&q.b.id===ids[1])||(q.a.id===ids[1]&&q.b.id===ids[0]));if(c&&typeof canWrite!=='undefined'&&canWrite){const r=b.getBoundingClientRect();const an=anchorAt(r.left,r.bottom-1);setTimeout(()=>crossPop(an,c),260)}return true}
  if((b=g('[data-same]'))){const[aid,zid]=b.dataset.same.split('|');const z=zget(zid),x=S.act.get(aid);if(z&&x){M.scDraw=x.sc;newZone(unflat(z.pts),{actId:aid},zVista(z))}return true}
  if((b=g('[data-done]'))){askDone(b.dataset.done,M.date);return true}
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
  openPop(btn,`<div class="ph">${esc(lname(l))}${l.base?' · plano base':' · '+esc(EN(l.esp))}</div><div class="ptx">${l.w} × ${l.h} px · subida por ${esc(l.byName||l.by||'')}${l.src?' · '+esc(l.src):''}</div>
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
     setTimeout(()=>openPop(btn,`<div class="ph">¿Eliminar la lámina “${esc(lname(l))}”?</div><div class="ptx">Deja de verse en este piso para todos. Se guarda archivada: se recupera en «Vista ▾ › Láminas archivadas».${l.base&&basesOf(l.pisoId).length>1?' Lo dibujado sobre esta vista dejará de mostrarse.':''}</div><button data-do="yes" class="danger">Sí, archivar lámina</button><button data-do="no">Cancelar</button>`,{no:()=>{},
       yes:async()=>{try{await fcol('laminas').doc(l.id).update({arch:{t:NOW(),by:me.email,n:me.name||me.email}});toast('Lámina archivada','Deshacer',()=>lamRestore(l.id))}catch(err){toast('No se pudo archivar: '+(err.code||err.message))}}}),0)}})}
function renameDialog(btn,l){const box=document.createElement('div');box.className='mdlg';box.innerHTML=`<div class="mdlgc" role="dialog" aria-modal="true"><h3>Nombre de la lámina</h3>
   <label>Nombre (así aparece en los botones)<input id="rnm" value="${esc(l.name||'')}" placeholder="${esc(EN(l.esp))}" maxlength="60"></label>
   <label>Especialidad<select id="res">${ESPO(l.esp)}</select></label>
   <p class="note">Ejemplos: “Fachada Norte”, “IIEE · Tomacorrientes”, “Arquitectura rev. B”. Si dejas el nombre vacío se muestra la especialidad.</p>
   <div class="mdlgb"><button class="ib" id="rcancel">Cancelar</button><button class="ib pri" id="rok">Guardar</button></div></div>`;
  document.body.appendChild(box);const i=$('#rnm',box);i.focus();i.select();$('#res',box).onchange=e=>espPickL(e.target,l.esp);
  $('#rcancel',box).onclick=()=>box.remove();
  const ok=async()=>{const nm=$('#rnm',box).value.trim(),es0=$('#res',box).value,es=es0&&es0!=='__new'?es0:l.esp;try{await fcol('laminas').doc(l.id).update({name:nm,esp:es});box.remove();toast('Nombre guardado')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}};
  $('#rok',box).onclick=ok;box.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ok()}if(e.key==='Escape')box.remove()})}
async function lamRestore(id){try{await fcol('laminas').doc(id).update({arch:firebase.firestore.FieldValue.delete()});toast('Lámina recuperada')}catch(err){toast('No se pudo recuperar: '+(err.code||err.message))}}
async function delChunks(l,rev){const b=db.batch();for(let i=0;i<(l.nf||0);i++)b.delete(fcol('lamimg').doc(`${l.id}_${rev}_f_${i}`));for(let i=0;i<(l.nl||0);i++)b.delete(fcol('lamimg').doc(`${l.id}_${rev}_l_${i}`));await b.commit()}

/* ---------- subir / reemplazar ---------- */
function uploadDialog(btn,repl,opt){opt=opt||{};const ps=opt.pid?pisos().filter(p=>p.id===opt.pid):pisos();
  const box=document.createElement('div');box.className='mdlg';box.innerHTML=`<div class="mdlgc" role="dialog" aria-modal="true">
   <h3>${repl?'Reemplazar lámina: '+esc(lname(repl)):opt.mode==='base'?'Subir lámina base del piso':opt.mode==='spec'?'Subir especialidad':'Subir lámina'}</h3>
   ${repl?'':`<label>Piso<select id="upiso">${ps.map(p=>`<option value="${p.id}"${p.id===M.piso?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label>
   <label id="utw">Tipo<select id="utipo"><option value="spec">Especialidad sobre un plano base</option><option value="base">Plano base nuevo (otra vista: otra fachada, otra zona…)</option></select></label>
   <label id="ubw">Se superpone sobre<select id="ubase"></select></label>
   <label>Nombre (así aparecerá en los botones)<input id="uname" placeholder="Ej.: Fachada Norte, IIEE · Alumbrado" maxlength="60"></label>
   <label>Especialidad<select id="uesp">${ESPO('')}</select></label>`}
   <label>Archivo (PDF de AutoCAD, PNG o JPG)<input type="file" id="ufile" accept="application/pdf,image/png,image/jpeg,image/webp"></label>
   <p class="note" id="uinfo"></p>
   <div class="uprog" id="uprog"></div>
   <div class="mdlgb"><button class="ib" id="ucancel">Cancelar</button><button class="ib pri" id="ugo">Procesar</button></div></div>`;
  document.body.appendChild(box);const close=()=>box.remove();
  const info=$('#uinfo',box);
  const sync=()=>{if(repl){info.innerHTML=(repl.base?'Es un plano base: después de procesarlo marcarás puntos para alinearlo con la revisión anterior, así lo ya dibujado sobre el plano no se mueve.':'Después de procesarlo marcarás puntos para alinearlo con su plano base.')+' Súbelo desde una PC con Chrome o Edge.';return}
    const pid=$('#upiso',box).value;const B=basesOf(pid);const tsel=$('#utipo',box);if(!B.length||opt.mode==='base')tsel.value='base';if(opt.mode==='spec')tsel.value='spec';$('#utw',box).hidden=!B.length||!!opt.mode;
    const bsel=$('#ubase',box);const cur=bsel.value||(pid===M.piso?M.vista:'');bsel.innerHTML=B.map(b=>`<option value="${b.id}"${b.id===cur?' selected':''}>${esc(lname(b))}</option>`).join('');
    const isB=tsel.value==='base';$('#ubw',box).hidden=isB||!B.length;const esp=$('#uesp',box);if(isB&&!esp.value&&!B.length){const ar=typeof espFind==='function'?espFind('Arquitectura'):null;const v=ar&&!ar.arch?ar.id:'Arquitectura';if([...esp.options].some(o=>o.value===v))esp.value=v}
    info.innerHTML=(isB?(B.length?'Será <b>otro plano base</b> de este piso, con su propio plan del día (útil para cada fachada o una zona que no entra en la misma lámina). No se alinea con los demás.':'Será el <b>plano base</b> del piso (normalmente la arquitectura). Las demás especialidades se alinean sobre él.'):'Después de procesarla marcarás puntos para alinearla con el plano base elegido.')+' Súbelo desde una PC con Chrome o Edge.'};
  if(!repl){$('#upiso',box).onchange=sync;$('#utipo',box).onchange=sync;$('#uesp',box).onchange=e=>espPickL(e.target,'')}sync();
  $('#ucancel',box).onclick=close;
  $('#ugo',box).onclick=async()=>{const f=$('#ufile',box).files[0];if(!f){toast('Elige el archivo.');return}
    const pid=repl?repl.pisoId:$('#upiso',box).value;const esp=repl?repl.esp:(($('#uesp',box).value||'').trim().replace(/^__new$/,''));const name=repl?(repl.name||''):($('#uname',box).value||'').trim();
    if(!esp&&!name){toast('Escribe el nombre o la especialidad.');return}
    const B=basesOf(pid);const newBase=!repl&&(!B.length||$('#utipo',box).value==='base');const target=repl?baseOfL(repl):(newBase?null:LAM.get($('#ubase',box).value)||B[0]);
    const prog=$('#uprog',box);const say=t=>{prog.textContent=t};$('#ugo',box).disabled=true;
    if(opt.mode==='spec'&&newBase){toast('La lámina base se sube en Sectorización.');return}
    try{const out=await processFile(f,say);close();
      if(newBase){await saveLam({pisoId:pid,esp:esp||'Plano base',name,base:true,T:I,aligned:true},out);toast(opt.mode==='base'?'Lámina base guardada. Ahora ubica sus sectores y ambientes.':'Plano base guardado');M.piso=pid;if(opt.onBase)opt.onBase(M.vista);requestRender();return}
      const ref=repl&&repl.base?repl:target;M.busy='Cargando la referencia para alinear…';requestRender();const refURL=await imgURL(ref,'f');M.busy='';requestRender();
      const nm=name||EN(esp);
      alignDialog({ref,refURL,tgt:{w:out.w,h:out.h,url:out.fullURL},title:repl?`Alinear la nueva revisión de ${lname(repl)}`:`Alinear ${nm} con ${lname(ref)}`,allowSkip:!(repl&&repl.base),
        onSave:async(T,pts)=>{await saveLam(repl?{...repl,T,aligned:true,pts}:{pisoId:pid,esp:esp||name,name,base:false,baseId:target.id,T,aligned:true,pts},out,repl);toast('Lámina guardada y alineada')},
        onSkip:async()=>{await saveLam(repl?{...repl,aligned:false}:{pisoId:pid,esp:esp||name,name,base:false,baseId:target.id,T:I,aligned:false},out,repl);toast('Lámina guardada sin alinear')}})}
    catch(err){$('#ugo',box).disabled=false;say('');toast(err.message||'No se pudo procesar el archivo.')}}}
async function saveLam(meta,out,repl){const id=repl?repl.id:uid('lam');const rev=repl?(repl.rev||1)+1:1;M.busy='Guardando lámina…';requestRender();
  try{const w=async(q,b64)=>{const n=Math.ceil(b64.length/CHUNK);for(let i=0;i<n;i++){M.busy=`Guardando lámina… ${q==='f'?'alta':'liviana'} ${i+1}/${n}`;requestRender();await fcol('lamimg').doc(`${id}_${rev}_${q}_${i}`).set({d:b64.slice(i*CHUNK,(i+1)*CHUNK)})}return n};
    const nf=await w('f',out.full64),nl=await w('l',out.lite64);
    const prevRev=repl?{rev:repl.rev||1,nf:repl.nf||0,nl:repl.nl||0,w:repl.w,h:repl.h,lw:repl.lw||null,lh:repl.lh||null,fmt:repl.fmt||'',T:repl.T||I,ts:repl.ts||0,by:repl.by||''}:null;
    const doc={...(prevRev?{revs:[...(repl.revs||[]),prevRev]}:{}),pisoId:meta.pisoId,esp:meta.esp,name:meta.name||'',baseId:meta.base?null:(meta.baseId||null),base:!!meta.base,T:meta.T||I,aligned:!!meta.aligned,w:out.w,h:out.h,lw:out.lw,lh:out.lh,fmt:out.fmt,nf,nl,rev,src:out.src,order:meta.order??NOW(),ts:NOW(),by:me.email,byName:me.name||me.email};if(meta.pts)doc.pts=meta.pts;
    await fcol('laminas').doc(id).set(doc);
    IMG.set(id+'|'+rev+'|f',{url:out.fullURL,promise:Promise.resolve(out.fullURL)});
    /* la revisión anterior ya no se borra: queda en revs con sus imágenes */M.sel=id;M.piso=meta.pisoId;M.lpiso=meta.pisoId;if(U.piso&&U.piso!==meta.pisoId){U.piso=meta.pisoId;const fp=document.getElementById('fpiso');if(fp)fp.value=meta.pisoId}M.vista=meta.base?id:(meta.baseId||M.vista)}
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
    <div class="alnp"><div class="alnpane"><div class="alnlab">Referencia: ${esc(EN(o.ref.esp))}</div><div class="alnv" id="aref"></div></div><div class="alnpane"><div class="alnlab" id="atl">Lámina a alinear</div><div class="alnv" id="atgt"></div></div></div>
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
window.__plano={imgURL,ensureLam,focusAct,fromPts,ap,LAM,M,processFile,capInit,capPlan,capDraw,zoneFor,ambAt,ambAtP,znLoad,ambMap,ambFocus,ambSuggest,basesOf,lamUpload:uploadDialog,nums:capNums,novaSet,novaOf,zonedSet,crossOf,zcClose,cuRows,dpPendAll,draftsOf};
})();
