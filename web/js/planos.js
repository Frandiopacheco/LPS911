"use strict";
/* LPS 911 · Módulo Planos (docs/ia/planos.md): biblioteca de los planos del proyecto, aparte de Last Planner y del Tareo.
   - Biblioteca (`pbib`): todos los planos vigentes con filtros por piso, especialidad y tipo, y buscador. Al abrir uno se ve en
     alta definición con mosaicos (como un mapa): primero la vista liviana y, al acercar, solo los cuadros de la zona visible.
   - Carga (`pcar`, admin/editor): se arrastran muchos PDF a la vez; el código, la especialidad y el piso salen del nombre del
     archivo (nomenclatura 2459243-PTSA-XXX-P02-P2D-ARQ-E05-AG04_TITULO) y del rótulo; se revisan y se procesan en esta PC.
   - Archivos en Firebase Storage (planos/<id>/r<rev>/…: th.webp, <z>/<x>_<y>.webp, orig.pdf) por la API REST con el token
     de la sesión (sin cargar otro SDK); los datos en Firestore `plb/<id>`. Mismo código de lámina = nueva revisión
     (la anterior queda en `revs`). Nada se borra: archivar.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const PL_T=1024;              /* lado del mosaico (px) */
const PL_DPI=300;             /* resolución objetivo en el tamaño real de la hoja */
const PL_MAXPX=16000;         /* lado mayor máximo del nivel de detalle */
const PL_Q=0.82;              /* calidad WebP */
/* pdf.js propio (vendor/pdfjs, 3.11.174 con el arreglo de degradados de tamaño cero); el worker sigue del CDN, misma versión */
const PL_PDFJS=window.PLANO_PDFJS||new URL('vendor/pdfjs/pdf.min.js',location.href).href;
const PL_PDFJS_W=window.PLANO_PDFJS_WORKER||'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
/* especialidades de los planos (no son las partidas de los SC de Configuración): código → nombre */
const PL_DISC=[['ARQ','Arquitectura'],['EST','Estructuras'],['IS','Instalaciones sanitarias'],['IE','Instalaciones eléctricas'],['IM','Instalaciones mecánicas'],
  ['COM','Comunicaciones'],['ACI','Agua contra incendio'],['DACI','Detección y alarma'],['GAS','Gas'],['SEG','Seguridad y evacuación'],['OTR','Otros']];
const PL_DN=Object.fromEntries(PL_DISC);
/* token del nombre del archivo → especialidad (AFC agua fría/caliente, DES desagüe… son de sanitarias) */
const PL_DTOK={ARQ:'ARQ',EST:'EST',ES:'EST',AFC:'IS',DES:'IS',AGDES:'IS',IS:'IS',SAN:'IS',ISS:'IS',IIEE:'IE',IEE:'IE',IE:'IE',ELE:'IE',ELC:'IE',IM:'IM',MEC:'IM',HVAC:'IM',AAC:'IM',
  COM:'COM',TEL:'COM',CCTV:'COM',DAT:'COM',ACI:'ACI',DACI:'DACI',GAS:'GAS',GLP:'GAS',SEG:'SEG',EVA:'SEG',SEN:'SEG'};
const PL_TIPOS=['Planta','Corte','Elevación','Detalle','Esquema','Ubicación','Otro'];

const PLB=new Map();let plbReady=false,plbUn=null;
const PLF=Object.assign({q:'',piso:'',disc:'',tipo:'',arch:false,src:'',sc:'',qm:''},store.get('plf',{}));PLF.q='';
const plfSave=()=>store.set('plf',{piso:PLF.piso,disc:PLF.disc,tipo:PLF.tipo,src:PLF.src,sc:PLF.sc,qm:PLF.qm});

/* ---------- datos ---------- */
function plSub(){if(plbUn||!me||!canPla())return;
  const open=()=>{plbUn=fcol('plb').onSnapshot(sn=>{PLB.clear();sn.docs.forEach(d=>PLB.set(d.id,{...d.data(),id:d.id}));plbReady=true;if(U.mod==='pla'||(U.tab==='cfg'&&U.cfgV==='cas'))requestRender()},
    err=>{plbUn=null;plbReady=true;console.error('plb',err);toast('No se pudo leer la lista de planos: '+(err.code||err.message));setTimeout(()=>{if(me&&canPla())open()},8000)})};
  open();etoSub();unsubs.push(()=>{if(plbUn)plbUn();plbUn=null;if(etoUn)etoUn();etoUn=null;PLB.clear();plbReady=false})}
/* ---------- ETO: planos de taller de los subcontratistas (oct 2026, decidido con el dueño) ----------
   Colección aparte `eto` (no `plb`) y carpeta de Storage `etos/<sc>/…`: el SC solo puede leer los de su partida (reglas), el resto
   del equipo ve todos; carga y edita solo el administrador; solo aprobados. Formatos muy diversos: sin lectura de nomenclatura ni
   vínculos; se organizan por SC. En memoria van en el mismo PLB (ids `ETO_…`, nunca chocan con `plb`) con `eto:true`. */
let etoUn=null;
function etoSub(){if(etoUn)return;
  const put=L=>{for(const k of [...PLB.keys()])if(PLB.get(k).eto)PLB.delete(k);L.forEach(d=>PLB.set(d.id,{...d,eto:true}));if(U.mod==='pla')requestRender()};
  const fail=err=>{console.error('eto',err);etoUn=null};
  if(me.role==='sc')etoUn=scSubs('eto',null,null,L=>put(L),fail);
  else etoUn=fcol('eto').onSnapshot(sn=>put(sn.docs.map(d=>({...d.data(),id:d.id}))),fail)}
const plCol=p=>fcol(p&&p.eto?'eto':'plb');
const plEdOf=p=>p&&p.eto?plAdm():plaEd();
const etoRoot=sc=>'etos/'+String(sc||'x').replace(/[^A-Za-z0-9_-]/g,'');
const plAct=()=>[...PLB.values()].filter(p=>!p.arch&&!p.eto);
const etoAct=()=>[...PLB.values()].filter(p=>p.eto&&!p.arch);
const plUp=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
const plCodCmp=(a,b)=>String(a.cod).localeCompare(String(b.cod),'es',{numeric:true});
const plPisoName=id=>{const p=id&&(S.pis.get(id)||ARCH.pis.get(id));return p?`${p.code} · ${p.name}`:''};

/* ---------- Storage (API REST con el token de la sesión; las reglas son firebase/storage.rules) ---------- */
const plApi=()=>{const b=window.FIREBASE_CONFIG&&window.FIREBASE_CONFIG.storageBucket;if(!b)throw new Error('Falta storageBucket en la configuración de Firebase.');return 'https://firebasestorage.googleapis.com/v0/b/'+b}
async function plTok(){const u=auth&&auth.currentUser;if(!u)throw new Error('Sesión cerrada: vuelve a ingresar.');return u.getIdToken()}
const plWait=ms=>new Promise(r=>setTimeout(r,ms));
async function plPut(path,blob,type){let last=null;
  for(let i=0;i<4;i++){try{const r=await fetch(plApi()+'/o?uploadType=media&name='+encodeURIComponent(path),{method:'POST',headers:{Authorization:'Firebase '+await plTok(),'Content-Type':type},body:blob});
      if(r.ok)return;if(r.status===401||r.status===403)throw Object.assign(new Error('Sin permiso para subir a Storage (¿reglas de Storage instaladas?).'),{fatal:true});
      if(r.status===404)throw Object.assign(new Error('Storage no está activado en este proyecto de Firebase.'),{fatal:true});last=new Error('Storage respondió '+r.status)}
    catch(e){if(e.fatal)throw e;last=e}await plWait(800*(i+1)*(i+1))}
  throw last||new Error('No se pudo subir el archivo')}
const PLC_NAME='lps-planos';
async function plGet(path,opt){const key=location.origin+'/__plan/'+path;let c=null;
  try{c=await caches.open(PLC_NAME);const hit=await c.match(key);if(hit)return await hit.blob()}catch(e){c=null}
  const r=await fetch(plApi()+'/o/'+encodeURIComponent(path)+'?alt=media',{headers:{Authorization:'Firebase '+await plTok()}});
  if(!r.ok)throw new Error(r.status===403||r.status===401?'Sin permiso para ver este plano.':r.status===404?'Archivo no encontrado en Storage.':'Storage respondió '+r.status);
  const b=await r.blob();if(c&&!(opt&&opt.noStore))try{await c.put(key,new Response(b,{headers:{'Content-Type':b.type||'application/octet-stream'}}))}catch(e){}return b}
/* miniaturas: una URL por archivo, reutilizada mientras dure la sesión */
const PLTH=new Map();
function plThumb(path){let e=PLTH.get(path);if(!e){e=plGet(path).then(b=>URL.createObjectURL(b));PLTH.set(path,e);e.catch(()=>PLTH.delete(path))}return e}

/* ---------- lector de nombres de archivo ---------- */
const PL_CODRE=/^[A-Z]{1,4}-?\d{1,3}[A-Z]?$/;
function plNivOf(tok,tit){const t=plUp(tok),T=plUp(tit);let m;
  if(t&&/[,;]/.test(t))return{niv:t,cand:[]};
  if((m=t.match(/^P0*(\d{1,2})$/)))return{niv:'P'+(+m[1]),cand:['P'+(+m[1]),'P0'+(+m[1]),'N'+(+m[1])]};
  if((m=t.match(/^S0*(\d{1,2})$/))){const n=+m[1];return{niv:'S'+n,cand:['S'+n,'S0'+n,...(n===1?['S0','SS','SOT']:[])]}}
  if(/^AZ/.test(t))return{niv:'AZ',cand:['AZ','AZO']};
  if(/^CIM/.test(t))return{niv:'CIM',cand:['CIM','CI']};
  /* ZZZ/XXX u otro: el piso se deduce del título */
  if(/S[O]TANO/.test(T))return{niv:'S1',cand:['S1','S0','S01','SS','SOT']};
  const ord=[['PRIMER',1],['SEGUNDO',2],['TERCER',3],['CUARTO',4],['QUINTO',5],['SEXTO',6]];
  for(const[w,n]of ord)if(new RegExp(w+'O?\\s+(PISO|NIVEL)').test(T)||new RegExp('(PISO|NIVEL)\\s+'+n+'\\b').test(T))return{niv:'P'+n,cand:['P'+n,'P0'+n,'N'+n]};
  if(/AZOTEA|TECHOS?\b/.test(T))return{niv:'AZ',cand:['AZ','AZO']};
  if(/PISO\s+TECNICO/.test(T))return{niv:'PT',cand:['P0','PT']};
  if(/CIMENTACI/.test(T))return{niv:'CIM',cand:['CIM','CI']};
  return{niv:'',cand:[]}}
function plPisoOf(cand){if(!cand.length)return'';const ps=[...S.pis.values()];for(const c of cand){const p=ps.find(x=>plUp(x.code)===c);if(p)return p.id}return''}
function plTipoOf(tit){const T=plUp(tit);
  if(/CORTE|SECCI/.test(T))return'Corte';if(/ELEVACI|FACHADA/.test(T))return'Elevación';if(/ESQUEMA|ISOMETR|DIAGRAMA|MONTANTE/.test(T))return'Esquema';
  if(/DETALLE/.test(T)&&!/PLANTA/.test(T))return'Detalle';if(/PLANTA|NIVEL|PISO|TABIQUE|CIELO|DISTRIBUCI|REDES|AZOTEA|TECHO/.test(T))return'Planta';
  if(/DETALLE/.test(T))return'Detalle';if(/UBICACI|LOCALIZ/.test(T))return'Ubicación';return'Otro'}
function plDiscOfCod(cod){const c=plUp(cod);if(/^IS/.test(c))return'IS';if(/^IE/.test(c))return'IE';if(/^IM/.test(c))return'IM';if(/^(ACI|DACI)/.test(c))return c.startsWith('D')?'DACI':'ACI';
  if(/^E/.test(c))return'EST';if(/^A/.test(c))return'ARQ';if(/^(IC|CO|T)/.test(c))return'COM';if(/^G/.test(c))return'GAS';return''}
/** nombre del archivo → datos del plano (todo editable en la revisión antes de procesar) */
function plParse(fname){
  let b=String(fname).replace(/\.pdf$/i,'').trim().replace(/[-_ ](model|modelo|layout\s*\d*|presentaci[oó]n\s*\d*)$/i,'');
  const us=b.indexOf('_');let head=us>=0?b.slice(0,us):b,tail=us>=0?b.slice(us+1):'';
  const tk=head.split('-').map(s=>s.trim()).filter(Boolean);let cod='',dTok='',nTok='',eta='',extra=[];
  const ei=tk.findIndex((t,i)=>i>0&&/^E[O0]?\d{1,2}$/i.test(t));
  if(ei>0){eta=tk[ei].toUpperCase().replace('O','0');cod=(tk[ei+1]||'').toUpperCase();extra=tk.slice(ei+2);dTok=(tk[ei-1]||'').toUpperCase();
    const ni=/^[PM]\dD$/i.test(tk[ei-2]||'')?ei-3:ei-2;nTok=ni>=0?tk[ni]:''}
  else{const last=(tk[tk.length-1]||'').toUpperCase();if(PL_CODRE.test(last))cod=last;dTok=(tk.find(t=>PL_DTOK[t.toUpperCase()])||'').toUpperCase();
    nTok=tk.find(t=>/^(P0*\d{1,2}|S0*\d{1,2}|AZO?|CIM)$/i.test(t))||''}
  if(cod&&!PL_CODRE.test(cod)){extra.unshift(cod);cod=''}
  let tit=[...extra,tail].filter(Boolean).join(' - ').replace(/_/g,' ').replace(/\s+\d{1,2}\.\d{1,2}\.\d{2,4}$/,'').replace(/\s+RAPM\s+\d{6}$/i,'').replace(/\s{2,}/g,' ').trim();
  const disc=PL_DTOK[dTok]||plDiscOfCod(cod)||'';const nv=plNivOf(nTok,tit);
  return{cod:cod.replace('-',''),disc,niv:nv.niv,pisoId:plPisoOf(nv.cand),tipo:plTipoOf(tit),tit,eta}}
const plLkN=p=>Array.isArray(p.lk)?p.lk.filter(l=>l&&!l.arch).length:0;
const plIdOf=m=>(m.eto?'ETO_'+(m.sc||'X')+'_'+(m.cod||('S'+plHash(m.fname||''))):(m.disc||'X')+'_'+(m.cod||('S'+plHash(m.fname||'')))).replace(/[^A-Za-z0-9_.-]/g,'');
function plHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36)}

/* ---------- lector de PDF ---------- */
let plPdfP=null;
function plPdfJs(){if(window.pdfjsLib)return Promise.resolve();if(plPdfP)return plPdfP;
  plPdfP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PL_PDFJS;s.onload=()=>{if(!window.pdfjsLib){plPdfP=null;ko(new Error('No se pudo cargar el lector de PDF.'));return}window.pdfjsLib.GlobalWorkerOptions.workerSrc=PL_PDFJS_W;ok()};
    s.onerror=()=>{plPdfP=null;ko(new Error('No se pudo cargar el lector de PDF. Revisa tu conexión.'))};document.head.appendChild(s)});return plPdfP}
/* pdf-lib (solo al dividir hojas o girar): extrae una hoja a su propio PDF y le pone la rotación (/Rotate). Así orig.pdf siempre es
   de una hoja y ya girada: mosaicos, capa nítida, medir, vínculos y «PDF» la ven igual sin saber nada del giro. */
const PL_PDFLIB=window.PLANO_PDFLIB||'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
let plLibP=null;
function plPdfLib(){if(window.PDFLib)return Promise.resolve();if(plLibP)return plLibP;
  plLibP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PL_PDFLIB;s.onload=()=>window.PDFLib?ok():(plLibP=null,ko(new Error('No se pudo cargar el editor de PDF.')));
    s.onerror=()=>{plLibP=null;ko(new Error('No se pudo cargar el editor de PDF. Revisa tu conexión.'))};document.head.appendChild(s)});return plLibP}
/** PDF de una sola hoja (la n.º pg, desde 1) girada q cuartos de vuelta a la derecha */
async function plOnePage(buf,pg,q){await plPdfLib();const L=window.PDFLib;
  let src;try{src=await L.PDFDocument.load(buf,{ignoreEncryption:true})}catch(e){throw new Error('No se pudo leer el PDF para separar o girar la hoja.')}
  const out=await L.PDFDocument.create();const[p]=await out.copyPages(src,[Math.max(0,(pg||1)-1)]);
  p.setRotation(L.degrees(((p.getRotation().angle||0)+90*(q||0))%360));out.addPage(p);return out.save()}
/** cuántas hojas tiene un PDF (0 si no se pudo leer) */
async function plPages(file){try{await plPdfJs();const d=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const n=d.numPages;try{d.destroy()}catch(e){}return n}catch(e){return 0}}
/* giro a la derecha, en coordenadas normalizadas de la hoja (0–1): (x, y) → (1 − y, x) por cada cuarto de vuelta */
function plRotPt(x,y,q){for(let i=0;i<((q%4)+4)%4;i++)[x,y]=[1-y,x];return[x,y]}
function plRotRect(l,q){const a=plRotPt(l.x0,l.y0,q),b=plRotPt(l.x1,l.y1,q);return{...l,x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])}}
const plRotV=(v,q)=>{if(!v||v.nx==null)return v;const[nx,ny]=plRotPt(v.nx,v.ny,q);return{...v,nx,ny}};
/** recorte en puntos del PDF (vista con origen arriba a la izquierda, hoja W×H) tras girar q cuartos a la derecha */
function plRotCrop(c,W,H,q){for(let i=0;i<((q%4)+4)%4;i++){c={x0:H-c.y1,x1:H-c.y0,y0:c.x0,y1:c.x1};[W,H]=[H,W]}return c}
/** nombre con el que se registra una fila de la carga (con «hoja k de n» si el PDF se dividió) */
/** clave del nombre para el id de una lámina sin código (igual que antes para un PDF de una hoja) */
const plItKey=it=>(it.pgs||1)>1?plItName(it):it.file.name;
const plItName=it=>it.file.name.replace(/\.pdf$/i,'')+((it.pgs||1)>1?` (hoja ${it.pg} de ${it.pgs})`:'');
const plCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
/** ¿el navegador puede de verdad dibujar un lienzo de w×h? (si es muy grande, falla en silencio) */
function plCanvasOk(w,h){if(w*h>130e6)return null;try{const c=plCanvas(w,h);const g=c.getContext('2d');if(!g||c.width!==w)return null;g.fillStyle='#f00';g.fillRect(w-1,h-1,1,1);
  const d=g.getImageData(w-1,h-1,1,1).data;if(d[0]!==255){c.width=c.height=0;return null}return c}catch(e){return null}}
const plBlob=(cv,q)=>new Promise(ok=>cv.toBlob(b=>ok(b),'image/webp',q));
function plHalf(src){const c=plCanvas(Math.max(1,Math.ceil(src.width/2)),Math.max(1,Math.ceil(src.height/2)));const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,0,0,c.width,c.height);return c}
/** rótulo: busca el código de lámina (el texto más grande con forma de código) y la especialidad escrita */
function plRotulo(items){let best=null;const words=plUp(items.map(i=>i.str).join(' '));
  for(const it of items){const s=plUp(it.str).trim();if(!PL_CODRE.test(s)||/^(P\dD|E0?\d|[PS]0?\d)$/.test(s))continue;const h=Math.hypot(it.transform[2],it.transform[3]);if(!best||h>best.h)best={s:s.replace('-',''),h}}
  const disc=/ARQUITECTURA/.test(words)?'ARQ':/ESTRUCTURA/.test(words)?'EST':/SANITARIA/.test(words)?'IS':/ELECTRICA/.test(words)?'IE':/MECANICA/.test(words)?'IM':/COMUNICACION/.test(words)?'COM':'';
  return{cod:best?best.s:'',disc}}

/** marco de la lámina (docs/ia/planos.md › Recorte al marco): con «Extensión» AutoCAD mete en el PDF lo que está fuera del marco
   (el texto «FORMATO 120 x 90», objetos invisibles…) y la lámina sale chica o con franjas. Se dibuja la hoja a ~2400 px y se buscan
   líneas largas horizontales y verticales (tramo continuo con huecos de hasta 2 px, ≥ 12 % de la hoja). Se prueba cada línea
   horizontal como borde superior: necesita una vertical en cada extremo que baje desde ella y una horizontal abajo que las una
   (cada lado cubre ≥ 85 %). Gana el rectángulo cerrado MÁS GRANDE: así no importa que la lámina ocupe poco de la hoja ni que haya
   líneas sueltas fuera del marco. Devuelve {x0,y0,x1,y1} en puntos del PDF (vista a escala 1, origen arriba a la izquierda) o null
   (sin marco claro, o el marco ya ocupa casi toda la hoja). */
async function plFrame(pg){const v1=pg.getViewport({scale:1}),a=2400/Math.max(v1.width,v1.height),vp=pg.getViewport({scale:a});
  const w=Math.floor(vp.width),h=Math.floor(vp.height),c=plCanvas(w,h),g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,w,h);
  await pg.render({canvasContext:g,viewport:vp}).promise;const d=g.getImageData(0,0,w,h).data;c.width=c.height=0;
  const dark=new Uint8Array(w*h);for(let i=0,j=0;i<dark.length;i++,j+=4)dark[i]=(d[j]*0.3+d[j+1]*0.59+d[j+2]*0.11)<170?1:0;
  return plFrameFind(dark,w,h,a,v1)}
/** la búsqueda del rectángulo, aparte para probarla con imágenes sintéticas */
function plFrameFind(dark,w,h,a,v1){const GAP=2,MIN=0.12,TOL=Math.max(3,Math.round(Math.min(w,h)*0.003));
  /* tramo más largo de cada fila / columna (tolera huecos de GAP px), con su inicio y fin */
  const runs=(n,len,at)=>{const out=new Array(n);for(let k=0;k<n;k++){let best=0,bs=0,be=0,st=-1,last=-99;
      for(let t=0;t<len;t++){if(at(k,t)){if(t-last>GAP+1)st=t;last=t;if(t-st+1>best){best=t-st+1;bs=st;be=t}}}out[k]={n:best,s:bs,e:be}}return out};
  const R=runs(h,w,(y,x)=>dark[y*w+x]),C=runs(w,h,(x,y)=>dark[y*w+x]);
  const vOk=x=>x>=0&&x<w&&C[x].n>=MIN*h;
  /* vertical que pasa por (x≈x0, y) y baja: devuelve la columna con el tramo más largo cerca de x0 que contenga y */
  const vAt=(x0,y)=>{let b=null;for(let x=x0-TOL;x<=x0+TOL;x++){if(!vOk(x))continue;const r=C[x];if(r.s<=y+TOL&&r.e>y+0.1*h&&(!b||r.e>b.r.e))b={x,r}}return b};
  const cov=(r,lo,hi)=>Math.min(r.e,hi)-Math.max(r.s,lo);
  let best=null;
  for(let y=0;y<h;y++){const r=R[y];if(r.n<MIN*w)continue;if(y>0&&R[y-1].n>=MIN*w&&Math.abs(R[y-1].s-r.s)<=TOL&&Math.abs(R[y-1].e-r.e)<=TOL)continue;   /* misma línea gruesa: solo su primera fila */
    const L=vAt(r.s,y),Rt=vAt(r.e,y);if(!L||!Rt)continue;
    const top=y,lef=Math.min(L.x,r.s),rig=Math.max(Rt.x,r.e),bw=rig-lef;
    /* borde inferior: la horizontal más baja que cubra el ancho, dentro de lo que bajan las dos verticales */
    const yMax=Math.min(L.r.e,Rt.r.e);let bot=-1;
    for(let yb=Math.min(h-1,yMax+TOL);yb>top+0.1*h;yb--){if(R[yb].n>=0.85*bw&&cov(R[yb],lef,rig)>=0.85*bw){bot=yb;break}}
    if(bot<0)continue;const bh=bot-top;
    if(cov(L.r,top,bot)<0.85*bh||cov(Rt.r,top,bot)<0.85*bh||cov(r,lef,rig)<0.85*bw)continue;   /* no es un rectángulo cerrado */
    if(bw<0.15*w||bh<0.15*h)continue;
    if(!best||bw*bh>best.bw*best.bh)best={top,bot,lef,rig,bw,bh}}
  if(!best)return null;const{top,bot,lef,rig}=best;
  if(lef<=0.015*w&&top<=0.015*h&&rig>=0.985*w&&bot>=0.985*h)return null;   /* el marco ya llena la hoja: nada que recortar */
  const pad=2/a;   /* medio trazo más: que la línea del marco quede entera */
  return{x0:Math.max(0,lef/a-pad),y0:Math.max(0,top/a-pad),x1:Math.min(v1.width,(rig+1)/a+pad),y1:Math.min(v1.height,(bot+1)/a+pad)}}
/** procesa un PDF: dibuja en alta definición, corta mosaicos por niveles, sube todo y registra el plano */
async function plProcess(it,say){
  await plPdfJs();const t0=performance.now();
  say('Leyendo PDF…');let buf=await it.file.arrayBuffer();
  /* hoja de un PDF de varias (ETO dividido) o girada: se arma su propio PDF de una hoja, ya girado */
  if((it.pgs||1)>1||it.q){say((it.pgs||1)>1?`Separando la hoja ${it.pg} de ${it.pgs}…`:'Girando la lámina…');buf=await plOnePage(buf,it.pg||1,it.q||0)}
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise;const pg=await pdf.getPage(1);
  try{const rot=plRotulo((await pg.getTextContent()).items||[]);it.rot=rot;
    if(!it.m.cod&&rot.cod)it.m.cod=rot.cod;if(!it.m.disc&&rot.disc)it.m.disc=rot.disc}catch(e){it.rot={cod:'',disc:''}}
  const eto=!!it.m.eto;if(eto){if(!it.m.sc)throw new Error('Elige el subcontratista en la tabla.')}
  else{if(!it.m.cod)throw new Error('Sin código de lámina: escríbelo en la tabla.');if(!it.m.disc)throw new Error('Sin especialidad: elígela en la tabla.')}
  const id=it.id||plIdOf({...it.m,fname:plItKey(it)});const old=PLB.get(id);const keep=!!(it.keep&&old);
  /* «Empezar en Rev. 1» (solo admin): la lámina ya existía (cargas de prueba) y se reemplaza sin historial, vínculos ni calibración.
     Carpeta nueva (las rutas de Storage nunca se reutilizan: la caché de los equipos se guía por ellas); la anterior no se borra. */
  const fresh=!!(it.fresh&&old);const rev=keep?(old.rev||1):fresh?1:old?(old.rev||1)+1:1;
  /* carpeta ÚNICA por carga (`planos/<id>.<marca>/r<rev>`): la caché de cada equipo (Cache API `lps-planos`) se guía por la ruta y
     da por hecho que nunca cambia. Antes era `planos/<id>/r<rev>`: al eliminar una lámina y volver a cargarla (otra vez Rev. 1) la
     ruta se repetía y los equipos mostraban los mosaicos y el PDF viejos (sin recortar; la capa nítida salía corrida). */
  const base=`${eto?etoRoot(it.m.sc):'planos'}/${id}.${NOW().toString(36)}${Math.random().toString(36).slice(2,6)}/r${rev}`;
  const v1=pg.getViewport({scale:1});
  /* recorte al marco: lo de fuera (texto «FORMATO…», objetos invisibles) no entra; el área queda a la misma resolución (es vectorial) */
  let crop=it.cropAt||null;if(!crop&&it.crop!==false){say('Buscando el marco de la lámina…');try{crop=await plFrame(pg)}catch(e){crop=null}}
  /* índice del texto de la lámina para «Buscar en el contenido» (planos-texto.js); si falla, la lámina se carga igual sin índice */
  let txo=null;try{txo=await plTxBuild(pg,crop)}catch(e){console.error('índice de texto',e)}
  it.cropped=!!crop;const cx0=crop?crop.x0:0,cy0=crop?crop.y0:0,cwp=crop?crop.x1-crop.x0:v1.width,chp=crop?crop.y1-crop.y0:v1.height;
  const lp=Math.max(cwp,chp);const px=Math.min(PL_MAXPX,Math.round(lp/72*PL_DPI));const sc=px/lp;const vp=pg.getViewport({scale:sc});
  const W=Math.floor(cwp*sc),H=Math.floor(chp*sc);let Z=1;while(Math.max(W,H)/2**(Z-1)>PL_T)Z++;
  const tx=-cx0*sc,ty=-cy0*sc;   /* desplazamiento del recorte */
  let mm=[Math.round(cwp/72*25.4),Math.round(chp/72*25.4)];
  /* marco con proporción del formato del proyecto (120 × 90): su tamaño real es 1200 × 900 mm aunque «Ajustar al papel» lo haya encogido
     (p. ej. 1178 mm) o la lámina ocupara poco de la hoja; así la escala de referencia de Medir (plmNominal) queda en 1/100 exacta */
  if(crop&&!eto&&Math.abs(cwp/chp-4/3)<0.02)mm=[1200,900];else if(crop&&!eto&&Math.abs(chp/cwp-4/3)<0.02)mm=[900,1200];   /* girada */
  /* subidas en paralelo (máx. 6) mientras se siguen cortando mosaicos */
  const pend=new Set();let up=0,total=0,fail=null;
  let bytes=0;const send=(path,blob,type)=>{total++;bytes+=blob.size||0;const p=plPut(path,blob,type).then(()=>{up++},e=>{fail=fail||e}).finally(()=>pend.delete(p));pend.add(p);return p};
  const room=async()=>{while(pend.size>=6)await Promise.race(pend);if(fail)throw fail};
  const cut=async(src,z,ox,oy)=>{/* mosaicos del nivel z que caen en src (que empieza en ox,oy del nivel) */
    const lw=Math.ceil(W/2**z),lh=Math.ceil(H/2**z);const x0=Math.floor(ox/PL_T),y0=Math.floor(oy/PL_T),x1=Math.ceil(Math.min(lw,ox+src.width)/PL_T),y1=Math.ceil(Math.min(lh,oy+src.height)/PL_T);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const tw=Math.min(PL_T,lw-x*PL_T),th=Math.min(PL_T,lh-y*PL_T);if(tw<=0||th<=0)continue;
      if(y*PL_T<oy||y*PL_T+th>oy+src.height)continue;/* mosaico partido entre franjas: lo corta la franja que lo contiene entero */
      const c=plCanvas(tw,th);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,tw,th);g.drawImage(src,x*PL_T-ox,y*PL_T-oy,tw,th,0,0,tw,th);
      const b=await plBlob(c,PL_Q);c.width=c.height=0;await room();send(`${base}/${z}/${x}_${y}.webp`,b,'image/webp');
      say(`Mosaicos de alta definición… ${up}/${total}`)}};
  say(`Dibujando en alta definición (${W.toLocaleString('es-PE')} × ${H.toLocaleString('es-PE')} px)…`);
  let L=null;/* nivel 1 (mitad), base de los siguientes */
  const full=plCanvasOk(W,H);
  if(full){const g=full.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);await pg.render({canvasContext:g,viewport:vp,transform:[1,0,0,1,tx,ty]}).promise;
    await cut(full,0,0,0);if(Z>1)L=plHalf(full);full.width=full.height=0}
  else{/* franjas de 4 mosaicos de alto: el navegador no permite un lienzo tan grande */
    const SH=PL_T*4;if(Z>1)L=plCanvas(Math.ceil(W/2),Math.ceil(H/2));const lg=L&&L.getContext('2d');if(lg){lg.imageSmoothingQuality='high';lg.fillStyle='#fff';lg.fillRect(0,0,L.width,L.height)}
    for(let y0=0;y0<H;y0+=SH){const sh=Math.min(SH,H-y0);const c=plCanvas(W,sh);const g=c.getContext('2d');if(!g)throw new Error('La lámina es demasiado grande para este navegador.');
      g.fillStyle='#fff';g.fillRect(0,0,W,sh);say(`Dibujando franja ${Math.floor(y0/SH)+1} de ${Math.ceil(H/SH)}…`);
      await pg.render({canvasContext:g,viewport:vp,transform:[1,0,0,1,tx,ty-y0]}).promise;await cut(c,0,0,y0);if(lg)lg.drawImage(c,0,y0/2,c.width/2,sh/2);c.width=c.height=0}}
  let thumbSrc=null;
  for(let z=1;z<Z;z++){await cut(L,z,0,0);if(!thumbSrc&&Math.max(L.width,L.height)<=2*PL_T)thumbSrc=L;
    if(z<Z-1){const n=plHalf(L);if(L!==thumbSrc)L.width=L.height=0;L=n}}
  /* miniatura (480 px de ancho) */
  {const s=thumbSrc||L;const tw=480,th=Math.max(1,Math.round(480*H/W));const c=plCanvas(tw,th);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,tw,th);g.imageSmoothingQuality='high';
    if(s&&s.width)g.drawImage(s,0,0,tw,th);await room();send(`${base}/th.webp`,await plBlob(c,0.8),'image/webp');c.width=c.height=0}
  if(L)L.width=L.height=0;if(thumbSrc)thumbSrc.width=thumbSrc.height=0;
  say('Subiendo el PDF original…');await room();send(`${base}/orig.pdf`,new Blob([buf],{type:'application/pdf'}),'application/pdf');
  let txm=null;if(txo){const t=await plTxBlob(txo);await room();send(`${base}/${plTxName(t.z)}`,t.b,t.type);txm=plTxMeta(txo,t.z)}
  while(pend.size)await Promise.race(pend);if(fail)throw fail;try{pdf.destroy()}catch(e){}
  /* girar una lámina ya cargada (plRotate): misma revisión, carpeta nueva; los vínculos de la lámina y sus propuestas se giran en la
     MISMA transacción (si alguien vinculaba a la vez no se pierde); la calibración vale igual (misma resolución). La carpeta anterior no se borra. */
  if(keep){const q=it.q||0,ref=plCol(old).doc(id),g0=(old.giro&&old.giro.q)||0;let res=null;
    await db.runTransaction(async tx=>{const sn=await tx.get(ref);if(!sn.exists)throw new Error('La lámina ya no existe');const d=sn.data();
      if(d.base!==old.base)throw new Error('Alguien cargó otra versión de esta lámina mientras tanto: vuelve a intentarlo.');
      const self=l=>{const r=plRotRect(l,q);return r.to===id?{...r,v:plRotV(r.v,q)}:r};
      res={base,W,H,Z,T:PL_T,mm,crop:crop?{x0:+crop.x0.toFixed(2),y0:+crop.y0.toFixed(2),x1:+crop.x1.toFixed(2),y1:+crop.y1.toFixed(2)}:null,sz:bytes,
        giro:{q:(g0+q)%4,t:NOW(),by:me.email,byN:me.name||me.email}};if(txm)res.tx=txm;else res.tx=firebase.firestore.FieldValue.delete();
      if(Array.isArray(d.lk))res.lk=d.lk.map(self);if(Array.isArray(d.lkp))res.lkp=d.lkp.map(self);tx.update(ref,res)});
    Object.assign(old,res);return{id,rev,keep:true,secs:Math.round((performance.now()-t0)/1000),files:total,crop:!!crop,mm}}
  /* recién con todo subido se registra el plano (así nunca aparece uno a medias) */
  const m=it.m;const prev=old&&!fresh?{rev:old.rev||1,base:old.base,W:old.W,H:old.H,Z:old.Z,mm:old.mm||null,crop:old.crop||null,fname:old.fname||'',ts:old.ts||0,byN:old.byN||''}:null;
  const doc={cod:m.cod,disc:m.disc,niv:m.niv||'',pisoId:m.pisoId||'',tipo:m.tipo||'Otro',tit:m.tit||'',eta:m.eta||'',fname:plItName(it),fsize:it.file.size,
    rev,base,W,H,Z,T:PL_T,mm,crop:crop?{x0:+crop.x0.toFixed(2),y0:+crop.y0.toFixed(2),x1:+crop.x1.toFixed(2),y1:+crop.y1.toFixed(2)}:null,sz:bytes,rot:{cod:(it.rot&&it.rot.cod)||'',ok:!!(it.rot&&it.rot.cod&&it.rot.cod===m.cod)},revs:fresh?[]:[...((old&&old.revs)||[]),...(prev?[prev]:[])],
    by:me.email,byN:me.name||me.email,ts:NOW()};if(txm)doc.tx=txm;
  /* los vínculos pasan a la nueva revisión (antes se perdían); con «Empezar en Rev. 1» no */
  if(old&&!fresh&&!eto&&Array.isArray(old.lk)&&old.lk.length)doc.lk=plLkCarry(old,crop,v1);
  if(eto){doc.sc=m.sc;doc.disc='ETO';doc.tipo='ETO';doc.cod=m.cod||'';delete doc.niv;delete doc.eta;delete doc.rot}
  await fcol(eto?'eto':'plb').doc(id).set(doc);
  return{id,rev,fresh,secs:Math.round((performance.now()-t0)/1000),files:total,crop:!!crop,mm}}
/** vínculos de la revisión anterior en coordenadas de la nueva: van normalizados a la hoja o al recorte de cada una. Si cambió el
   recorte (p. ej. la anterior era hoja completa y la nueva viene recortada al marco), se pasan por puntos del PDF; solo si las hojas
   tienen el mismo tamaño (si no, se dejan igual: se revisan a mano). */
function plLkCarry(old,crop,v1){const L=old.lk.map(l=>({...l}));
  const oc=old.crop||null,nc=crop||null,same=(a,b)=>!a&&!b||a&&b&&Math.abs(a.x0-b.x0)<1&&Math.abs(a.y0-b.y0)<1&&Math.abs(a.x1-b.x1)<1&&Math.abs(a.y1-b.y1)<1;
  if(same(oc,nc))return L;
  let oW,oH,ox=0,oy=0;if(oc){ox=oc.x0;oy=oc.y0;oW=oc.x1-oc.x0;oH=oc.y1-oc.y0}
  else{if(!old.mm||!old.mm[0])return L;oW=old.mm[0]/25.4*72;oH=old.mm[1]/25.4*72;if(Math.abs(oW-v1.width)>9||Math.abs(oH-v1.height)>9)return L}   /* otra hoja: no se adivina */
  const nx=nc?nc.x0:0,ny=nc?nc.y0:0,nW=nc?nc.x1-nc.x0:v1.width,nH=nc?nc.y1-nc.y0:v1.height;
  const fx=x=>Math.max(0,Math.min(1,(ox+x*oW-nx)/nW)),fy=y=>Math.max(0,Math.min(1,(oy+y*oH-ny)/nH));
  return L.map(l=>({...l,x0:fx(l.x0),x1:fx(l.x1),y0:fy(l.y0),y1:fy(l.y1)}))}

/* ---------- Biblioteca ---------- */
const etoOn=()=>PLF.src==='eto';
const etoScName=sc=>conOf(sc).name;
function plFiltered(noQ){const q=noQ?'':plUp(PLF.q).trim();const words=q?q.split(/\s+/):[];
  if(etoOn())return [...PLB.values()].filter(p=>p.eto&&(PLF.arch?!!p.arch:!p.arch)&&(!PLF.sc||p.sc===PLF.sc)&&(!PLF.piso||(PLF.piso==='-'?!p.pisoId:p.pisoId===PLF.piso))
      &&(!words.length||words.every(w=>plUp([p.cod,p.tit,p.fname,etoScName(p.sc)].join(' ')).includes(w))))
    .sort((a,b)=>etoScName(a.sc).localeCompare(etoScName(b.sc),'es')||plCodCmp(a,b)||String(a.tit).localeCompare(String(b.tit),'es',{numeric:true}));
  return [...PLB.values()].filter(p=>!p.eto).filter(p=>(PLF.arch?!!p.arch:!p.arch)&&(!PLF.disc||p.disc===PLF.disc)&&(!PLF.tipo||p.tipo===PLF.tipo)
    &&(!PLF.piso||(PLF.piso==='-'?!p.pisoId:p.pisoId===PLF.piso))&&(!words.length||words.every(w=>plUp([p.cod,p.tit,p.fname,p.niv,PL_DN[p.disc]].join(' ')).includes(w))))
    .sort((a,b)=>PL_DISC.findIndex(d=>d[0]===a.disc)-PL_DISC.findIndex(d=>d[0]===b.disc)||plCodCmp(a,b))}
function renderPBib(main){plSub();const eo=etoOn(),bk='pbib'+(eo?'e':'')+(plTxOn()?'t':'');
  if(main.dataset.built!==bk){main.dataset.built=bk;
    const seg=`<div class="seg plsrc" role="tablist" aria-label="Origen de los planos"><button type="button" data-src=""${eo?'':' class="on"'} aria-selected="${!eo}">Proyecto</button><button type="button" data-src="eto"${eo?' class="on"':''} aria-selected="${eo}">ETO de subcontratistas</button></div>`;
    main.innerHTML=`<div class="scroll"><div class="wrap plw">${pageHead('Planos',eo?(me.role==='sc'?'Los ETO (planos de taller) aprobados de tu partida.':'ETO (planos de taller) aprobados de los subcontratistas, ordenados por SC.'):`Todos los planos vigentes del proyecto. Toca uno para verlo en alta definición.`,(eo?plAdm():plaEd())?'<button class="ib pri" id="plgocar">'+(eo?'Cargar ETO…':'Cargar planos…')+'</button>':'')}
      ${seg}<div class="plbar"><input class="tin plq" id="plq" type="search" placeholder="${plTxOn()?'Buscar dentro de las láminas: DET. 4, V-101, bombas…':'Buscar: código, título, archivo…'}" autocomplete="off" aria-label="Buscar planos">
        <div class="seg plqm" role="tablist" aria-label="Buscar en"><button type="button" data-qm=""${plTxOn()?'':' class="on"'} aria-selected="${!plTxOn()}" title="Buscar por código, título o nombre del archivo">Nombre</button><button type="button" data-qm="tx"${plTxOn()?' class="on"':''} aria-selected="${plTxOn()}" title="Buscar el texto escrito dentro de las láminas">Contenido</button></div>
        ${eo?'<select class="tin" id="plfs" aria-label="Subcontratista"></select>':''}<select class="tin" id="plfp" aria-label="Piso"></select>${eo?'':'<select class="tin" id="plfd" aria-label="Especialidad"></select><select class="tin" id="plft" aria-label="Tipo"></select>'}
        ${plaEd()?'<label class="plchk"><input type="checkbox" id="plfa"> Archivados</label>':''}${plTablet()?'<button class="ib" id="ploff" title="Guardar planos en esta tablet para verlos sin internet">⤓ Sin conexión</button>':''}${plAdm()?'<button class="ib bad" id="pldel" title="Eliminar de verdad los planos que muestra la lista (con sus archivos). Solo el administrador.">🗑 Eliminar…</button>':''}<span class="plcnt" id="plcnt"></span></div>
      ${plTxOn()?'<div class="pltxst" id="pltxst"></div>':''}<div id="pllist"></div></div></div>`;
    $('#plq',main).value=PLF.q||'';let qt=0;$('#plq',main).oninput=e=>{PLF.q=e.target.value;clearTimeout(qt);if(plTxOn())qt=setTimeout(()=>plList(main),PLTX_WAIT);else plList(main)};
    $('.plqm',main).onclick=e=>{const b=e.target.closest('[data-qm]');if(!b||b.dataset.qm===PLF.qm)return;PLF.qm=b.dataset.qm;plfSave();main.dataset.built='';renderPBib(main);const i=$('#plq',main);if(i&&!plTablet())i.focus()};
    const tst=$('#pltxst',main);if(tst)tst.onclick=e=>{const b=e.target.closest('[data-tx="idx"]');if(!b)return;
      plTxIndexAll(plFiltered(true),m=>{const st=$('#pltxst',main);if(m&&st)shx(st,`<span>${esc(m)}</span>`);else plList(main)})};
    const ch=(sel,k)=>{const el=$(sel,main);if(el)el.onchange=e=>{PLF[k]=e.target.value;plfSave();plList(main)}};ch('#plfp','piso');ch('#plfd','disc');ch('#plft','tipo');ch('#plfs','sc');
    $('.plsrc',main).onclick=e=>{const b=e.target.closest('[data-src]');if(!b||b.dataset.src===PLF.src)return;PLF.src=b.dataset.src;plfSave();renderPBib(main)};
    const fa=$('#plfa',main);if(fa)fa.onchange=e=>{PLF.arch=e.target.checked;plList(main)};
    const gc=$('#plgocar',main);if(gc)gc.onclick=()=>{PQ.eto=eo;goTab('pcar')};
    const ob=$('#ploff',main);if(ob)ob.onclick=()=>plOffMenu(ob);
    const db=$('#pldel',main);if(db)db.onclick=()=>plDelete(plFiltered());
    $('#pllist',main).onclick=e=>{const b=e.target.closest('[data-pl]');if(!b)return;
      if(b.dataset.tq)plOpen(b.dataset.pl,plTxIds(plFiltered(true)),{hq:PLF.q});else plOpen(b.dataset.pl,plFiltered().map(p=>p.id))}}
  /* opciones de los filtros (cambian con los pisos y con los planos cargados) */
  const act=plAct();const ds=PL_DISC.filter(d=>act.some(p=>p.disc===d[0])||PLF.disc===d[0]);
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`;
  shx($('#plfp',main),opt('','Todos los pisos',PLF.piso)+pisos().map(p=>opt(p.id,p.code+' · '+p.name,PLF.piso)).join('')+opt('-','Generales (sin piso)',PLF.piso));
  if(eo){const scs=[...new Set(etoAct().map(p=>p.sc))].sort((a,b)=>etoScName(a).localeCompare(etoScName(b),'es'));if(PLF.sc&&!scs.includes(PLF.sc))scs.push(PLF.sc);
    shx($('#plfs',main),(scs.length>1||!scs.length?opt('','Todos los SC',PLF.sc):'')+scs.map(c=>opt(c,etoScName(c),PLF.sc)).join(''))}
  else{shx($('#plfd',main),opt('','Todas las especialidades',PLF.disc)+ds.map(d=>opt(d[0],d[1],PLF.disc)).join(''));
  shx($('#plft',main),opt('','Todos los tipos',PLF.tipo)+PL_TIPOS.map(t=>opt(t,t,PLF.tipo)).join(''))}
  plList(main);plTxPreload()}
function plList(main){const host=$('#pllist',main);if(!host)return;
  if(!plbReady){shx(host,'<div class="loading"><b>Cargando planos…</b></div>');return}
  const L=plFiltered();stx($('#plcnt',main),L.length===1?'1 plano':L.length+' planos');
  if(etoOn()&&!etoAct().length&&!PLF.arch){shx(host,`<div class="callout"><b>Aún no hay ETO cargados${me.role==='sc'?' de tu partida':''}.</b> ${plAdm()?'Usa <b>Cargar ETO…</b> para subir los PDF aprobados de cada subcontratista.':'Cuando el administrador los cargue, aparecerán aquí.'}</div>`);return}
  if(!PLB.size){shx(host,`<div class="callout"><b>Aún no hay planos cargados.</b> ${plaEd()?'Usa <b>Cargar planos…</b> para subir los PDF del proyecto (puedes arrastrar muchos a la vez).':'Cuando el administrador los cargue, aparecerán aquí.'}</div>`);return}
  if(plTxOn()){if(PLTXQ.run)return;plTxList(main,host,plFiltered(true));return}
  if(!L.length){shx(host,'<p class="note">Ningún plano coincide con los filtros.</p>');return}
  const g=new Map();L.forEach(p=>{const k=p.eto?p.sc:p.disc;if(!g.has(k))g.set(k,[]);g.get(k).push(p)});
  const h=[...g].map(([d,ps])=>`<h3 class="plg">${ps[0].eto?`<i class="etosw" style="background:${esc(conOf(d).color||'#9AA0A6')}"></i>${esc(etoScName(d))}`:esc(PL_DN[d]||d)} <span>${ps.length}</span></h3><div class="plgrid">${ps.map(p=>`<button type="button" class="plc" data-pl="${esc(p.id)}" title="${esc(p.fname||'')}">
      <span class="plth"><img data-th="${esc(p.base+'/th.webp')}" alt="" loading="lazy"></span>
      <span class="plci"><b class="mono">${esc(p.cod)}</b><span>${esc(p.tit||'Sin título')}</span><small>${esc([p.eto?'':p.tipo,plPisoName(p.pisoId)||(p.niv?p.niv:'General'),'R'+(p.rev||1)].filter(Boolean).join(' · '))}${plOffTag(p)}</small></span></button>`).join('')}</div>`).join('');
  if(host.dataset.h!==h){host.innerHTML=h;host.dataset.h=h;plThumbs(host)}}
function plThumbs(host){if(host._io)host._io.disconnect();
  const load=img=>{const p=img.dataset.th;if(!p||img.dataset.ld)return;img.dataset.ld='1';plThumb(p).then(u=>{img.src=u;img.classList.add('ok')},()=>{img.dataset.ld='';img.closest('.plth').classList.add('err')})};
  if(!('IntersectionObserver' in window)){$$('img[data-th]',host).forEach(load);return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);load(e.target)}}),{root:host.closest('.plvpl')||null,rootMargin:'400px'});host._io=io;
  $$('img[data-th]',host).forEach(i=>io.observe(i))}

/* ---------- Visor de alta definición (mosaicos) ---------- */
/* Visor (como Dalux/Revizto): un solo lienzo (canvas) donde cada cuadro se dibujan los mosaicos ya decodificados en memoria
   (ImageBitmap). Nunca hay un cuadro en blanco: debajo siempre está el nivel grueso y encima el detalle que ya llegó, con un
   fundido corto. Zoom animado (rueda, botones, doble toque), inercia al soltar, pellizco, y precarga alrededor de lo visible.
   (Antes eran <img> sueltas que se reacomodaban al terminar cada gesto: en tablets Android eso parpadeaba.) */
const PL_CAP=56;
/* mosaicos alrededor de la pantalla (docs/ia/planos.md › Degradado de calidad): además del nivel que corresponde al zoom (con PL_TM[0] de
   margen por lado, como siempre) se piden los niveles siguientes hasta el grueso, cada uno con más margen (PL_TM[1], PL_TM[2]…). Cada
   nivel tiene 4 veces menos mosaicos que el anterior, así que cuesta poco, y al desplazar o alejar lo que entra baja de calidad de a poco
   y no de golpe al nivel grueso (1/8). PL_NEED_MAX: tope de mosaicos pedidos a la vez (memoria de la tablet: cada uno ≈ 4 MB decodificado,
   PL_CAP = 56); lo que no cabe se descarta empezando por lo más lejano de la pantalla, y lo de siempre (nivel del zoom + grueso) nunca. */
const PL_TM=[0.3,0.6,1.0],PL_NEED_MAX=48,PL_FLING_MS=250;
/* capa nítida (docs/ia/planos.md › Nitidez): con zoom más allá del detalle de los mosaicos, al detenerse se redibuja lo que está
   en pantalla desde el PDF original (vectorial). PL_SH_MIN: píxeles de pantalla por píxel del plano desde los que hace falta;
   PL_SH_IDLE: espera quieto antes de dibujar; PL_SH_PX: tope de píxeles del lienzo nítido (memoria de la tablet). */
const PL_SH_MIN=0.95,PL_SH_IDLE=170,PL_SH_PX=8e6,PL_SH_DOCS=3;
/* margen nítido alrededor de la pantalla (fracción del ancho/alto por lado, máx.): al desplazarse dentro de él no se ve el cambio
   a baja resolución. Dibujar más área cuesta casi lo mismo (pdf.js tarda por recorrer el plano, no por los píxeles); lo limita la
   memoria (PL_SH_PX). PL_SH_KEEP: si al detenerse la pantalla sigue dentro de la zona nítida con este margen, no se redibuja. */
const PL_SH_M=0.6,PL_SH_KEEP=0.08,PL_SH_FADE=180;
const PLPDF=new Map();   /* base → promesa de la página 1 del PDF original (las últimas PL_SH_DOCS láminas abiertas) */
function plPdfPage(base){let e=PLPDF.get(base);
  if(e){PLPDF.delete(base);PLPDF.set(base,e);return e.pg}
  e={doc:null};e.pg=(async()=>{await plPdfJs();const b=await plGet(base+'/orig.pdf');
    const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(await b.arrayBuffer())}).promise;e.doc=doc;return doc.getPage(1)})();
  e.pg.catch(()=>{if(PLPDF.get(base)===e)PLPDF.delete(base)});PLPDF.set(base,e);
  while(PLPDF.size>PL_SH_DOCS){const[k,o]=PLPDF.entries().next().value;PLPDF.delete(k);o.pg.then(()=>{try{o.doc&&o.doc.destroy()}catch(err){}},()=>{})}
  return e.pg}
/* inercia: cuánto conserva la velocidad cada 16 ms (más cerca de 1 = se desliza más lejos). Ajustado con el dueño (oct 2026) */
const PL_ZOOM_DECAY=0.94,PL_PAN_DECAY=0.95;/* mosaicos decodificados en memoria como máximo (1024² ≈ 4 MB cada uno) */
function plTiles(host,spec){/* spec: {base,W,H,Z,T,view?} — devuelve el visor */
  const V={s:1,x:0,y:0,tiles:new Map(),need:new Set(),raf:0,dead:false,fit:1};const T=spec.T||PL_T;
  host.innerHTML='<canvas class="plcv"></canvas>';host.classList.add('plvc');const cv=host.firstChild;const g=cv.getContext('2d',{alpha:false});
  let dpr=1,cw=1,ch=1,anim=null,fling=null,zfling=null,lastNeed=0,moving=false,lastF=0;
  const size=()=>[host.clientWidth||1,host.clientHeight||1];
  const resize=()=>{dpr=Math.min(window.devicePixelRatio||1,2.5);const[w,h]=size();cw=w;ch=h;const W=Math.round(w*dpr),H=Math.round(h*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}cv.style.width=w+'px';cv.style.height=h+'px'};
  const sMin=()=>V.fit*0.5,sMax=()=>6/(window.devicePixelRatio||1);   /* hasta 6 px de pantalla por px del plano: la capa nítida (PDF) da el detalle */
  const clampS=v=>Math.max(sMin(),Math.min(sMax(),v));
  /* ---- capa nítida: estado. sharp = último dibujo del PDF {c (lienzo), s,x,y (vista con que se dibujó), w,h, t0} ---- */
  let sharp=null,shPrev=null,shTask=null,shTimer=0,shKey='',shOff=false;
  const shWant=()=>!shOff&&V.s*dpr>PL_SH_MIN;
  const shFree=o=>{if(o)o.c.width=o.c.height=0};
  const shDrop=()=>{shFree(sharp);sharp=null;shFree(shPrev);shPrev=null};
  /* rectángulo (en pantalla) que hoy cubre una capa nítida */
  const shRect=o=>{const r=V.s/o.s;return{x:V.x+(o.ox-o.x)*r,y:V.y+(o.oy-o.y)*r,w:o.w*r,h:o.h*r,r}};
  /* ¿la pantalla sigue cubierta (con margen) por la capa nítida actual, a la misma escala? → no hace falta redibujar */
  const shCovers=()=>{if(!sharp)return false;const q=shRect(sharp);if(Math.abs(q.r-1)>0.002)return false;const mx=cw*PL_SH_KEEP,my=ch*PL_SH_KEEP;
    return q.x<=-mx&&q.y<=-my&&q.x+q.w>=cw+mx&&q.y+q.h>=ch+my};
  const shStop=()=>{clearTimeout(shTimer);shTimer=0;if(shTask){try{shTask.cancel()}catch(e){}shTask=null}};
  /* se llama en cada cuadro: si la vista cambió, se cancela lo pendiente; quieto y con zoom profundo, se programa el dibujo */
  const shStep=act=>{const key=[V.s*1e6|0,V.x*10|0,V.y*10|0,cw,ch].join(',');
    if(key!==shKey){shKey=key;shStop()}
    if(act){shStop();return}
    if(!shWant()){if(sharp&&V.s*dpr<PL_SH_MIN*0.7)shDrop();return}
    if(shTimer||shTask||(sharp&&sharp.key===key))return;
    if(shCovers()){sharp.key=key;return}
    shTimer=setTimeout(()=>{shTimer=0;shRender(key)},PL_SH_IDLE)};
  const shRender=async key=>{if(V.dead||key!==shKey)return;const s=V.s,x=V.x,y=V.y,w=cw,h=ch;let k=dpr,m=0;
    if(w*h*k*k>PL_SH_PX)k=Math.sqrt(PL_SH_PX/(w*h));else m=Math.min(PL_SH_M,(Math.sqrt(PL_SH_PX/(w*h*k*k))-1)/2);
    /* zona a dibujar en pantalla (css px): la pantalla más el margen; recortada a la hoja para no gastar en el blanco de fuera */
    let ox=-m*w,oy=-m*h,ex=w+m*w,ey=h+m*h;ox=Math.max(ox,x);oy=Math.max(oy,y);ex=Math.min(ex,x+spec.W*s);ey=Math.min(ey,y+spec.H*s);
    if(ex-ox<2||ey-oy<2)return;const rw=ex-ox,rh=ey-oy;
    let pg;try{pg=await plPdfPage(spec.base)}catch(e){shOff=true;console.warn('nitidez: sin PDF original',e&&e.message);return}   /* sin PDF (sin conexión): quedan los mosaicos */
    if(V.dead||key!==shKey||shTask)return;
    const c=document.createElement('canvas');c.width=Math.ceil(rw*k);c.height=Math.ceil(rh*k);const cg=c.getContext('2d');
    const cr=spec.crop,S0=spec.W/(cr?cr.x1-cr.x0:pg.getViewport({scale:1}).width);  /* escala del PDF que dio el nivel de detalle (W px); con recorte, el ancho del marco */
    const t0=performance.now();
    const task=pg.render({canvasContext:cg,viewport:pg.getViewport({scale:S0*s*k}),transform:[1,0,0,1,(x-ox)*k-(cr?cr.x0:0)*S0*s*k,(y-oy)*k-(cr?cr.y0:0)*S0*s*k]});shTask=task;
    try{await task.promise}catch(e){if(shTask===task)shTask=null;c.width=c.height=0;return}
    if(shTask===task)shTask=null;if(V.dead||key!==shKey){c.width=c.height=0;return}
    /* bordes difuminados: donde termina la zona nítida (y no es el borde de la hoja) se funde con los mosaicos, sin línea de corte */
    const f=Math.min(48,m*Math.min(w,h)*0.5)*k;
    if(f>2){cg.setTransform(1,0,0,1,0,0);cg.globalCompositeOperation='destination-out';
      const edge=(x0,y0,x1,y1,rx,ry,rw2,rh2)=>{const gr=cg.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');cg.fillStyle=gr;cg.fillRect(rx,ry,rw2,rh2)};
      const W2=c.width,H2=c.height,sx=x*1,sy=y*1;
      if(ox>sx+1)edge(0,0,f,0,0,0,f,H2);if(ex<sx+spec.W*s-1)edge(W2,0,W2-f,0,W2-f,0,f,H2);
      if(oy>sy+1)edge(0,0,0,f,0,0,W2,f);if(ey<sy+spec.H*s-1)edge(0,H2,0,H2-f,0,H2-f,W2,f);
      cg.globalCompositeOperation='source-over'}
    /* la capa anterior queda debajo hasta que la nueva termina de aparecer: lo que ya estaba nítido no pasa por borroso */
    shFree(shPrev);shPrev=sharp;sharp={c,s,x,y,ox,oy,w:rw,h:rh,key,t0:performance.now(),ms:Math.round(performance.now()-t0)};V.tick()};
  V.fitView=(animate)=>{resize();zfling=null;const[w,h]=size();V.fit=Math.min(w/spec.W,h/spec.H)*0.97;const s=V.fit,x=(w-spec.W*s)/2,y=(h-spec.H*s)/2;
    if(animate){V.animTo(s,x,y)}else{anim=null;fling=null;V.s=s;V.x=x;V.y=y;V.tiles_();V.tick()}};
  V.zoomAt=(k,cx,cy)=>{const s0=anim?anim.s:V.s,x0=anim?anim.x:V.x,y0=anim?anim.y:V.y;const ts=clampS(s0*k),r=ts/s0;V.animTo(ts,cx-(cx-x0)*r,cy-(cy-y0)*r)};
  V.animTo=(s,x,y)=>{fling=null;zfling=null;anim={s,x,y};V.tick()};
  V.tick=()=>{if(!V.raf&&!V.dead)V.raf=requestAnimationFrame(V.frame)};
  V.draw=V.tick;
  V.frame=()=>{V.raf=0;if(V.dead)return;let more=false;const tf=performance.now();/* inercia según el tiempo real entre cuadros: igual de rápida aunque la tablet baje de 60 cuadros/s */const dt=lastF&&tf-lastF<100?tf-lastF:16;lastF=tf;
    if(anim){const f=0.28;V.s+=(anim.s-V.s)*f;V.x+=(anim.x-V.x)*f;V.y+=(anim.y-V.y)*f;
      if(Math.abs(anim.s-V.s)/anim.s<0.002&&Math.abs(anim.x-V.x)<0.5&&Math.abs(anim.y-V.y)<0.5){V.s=anim.s;V.x=anim.x;V.y=anim.y;anim=null}else more=true}
    if(fling){V.x+=fling.vx*dt;V.y+=fling.vy*dt;const d=Math.pow(PL_PAN_DECAY,dt/16);fling.vx*=d;fling.vy*=d;if(Math.hypot(fling.vx,fling.vy)<0.02)fling=null;else more=true}
    /* inercia del pellizco (como Dalux): al soltar los dedos el zoom sigue un poco y frena; también el desplazamiento del centro */
    if(zfling){const ns=clampS(V.s*Math.exp(zfling.v*dt)),k=ns/V.s;V.x=zfling.cx-(zfling.cx-V.x)*k+zfling.vx*dt;V.y=zfling.cy-(zfling.cy-V.y)*k+zfling.vy*dt;zfling.cx+=zfling.vx*dt;zfling.cy+=zfling.vy*dt;
      const hit=ns===V.s;V.s=ns;const d=Math.pow(PL_ZOOM_DECAY,dt/16);zfling.v*=d;zfling.vx*=d;zfling.vy*=d;if(hit||(Math.abs(zfling.v)<0.00004&&Math.hypot(zfling.vx,zfling.vy)<0.02))zfling=null;else more=true}
    const act=more||P.size>0;const now=performance.now();shStep(act);
    if(!act||now-lastNeed>110){lastNeed=now;V.tiles_()}
    moving=act;const fading=V.paint(now);if(more||fading)V.tick()};
  /* dibuja: primero los niveles gruesos y encima los finos; cada mosaico nuevo entra con un fundido de 140 ms */
  V.paint=now=>{g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);
    g.setTransform(dpr,0,0,dpr,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality=moving?'medium':'high';
    const L=[];for(const e of V.tiles.values())if(e.bm)L.push(e);L.sort((a,b)=>b.z-a.z);let fading=false;
    for(const e of L){const x=V.x+e.wx*V.s,y=V.y+e.wy*V.s,w=e.ww*V.s,h=e.wh*V.s;if(x>cw||y>ch||x+w<0||y+h<0)continue;
      const a=Math.min(1,(now-e.t0)/140);if(a<1)fading=true;g.globalAlpha=a;
      /* medio píxel de más para que no se vean juntas entre mosaicos */g.drawImage(e.bm,x,y,w+0.6,h+0.6)}
    /* capa nítida encima de los mosaicos: sigue al plano al moverlo o acercarlo hasta que se vuelve a dibujar */
    if(sharp){const dr=o=>{const q=shRect(o);if(q.r>0.5&&q.r<2)g.drawImage(o.c,q.x,q.y,q.w,q.h)};const a=Math.min(1,(now-sharp.t0)/PL_SH_FADE);
      if(a<1){fading=true;if(shPrev){g.globalAlpha=1;dr(shPrev)}}else if(shPrev){shFree(shPrev);shPrev=null}
      g.globalAlpha=a;dr(sharp)}
    g.globalAlpha=1;if(V.hl){g.setTransform(dpr,0,0,dpr,0,0);try{V.hl(g,V)}catch(err){console.error('resaltar',err)}g.globalAlpha=1}
    if(V.marks){g.setTransform(dpr,0,0,dpr,0,0);try{V.marks(g,V)}catch(err){console.error('marcar',err)}g.globalAlpha=1;g.globalCompositeOperation='source-over'}
    if(V.over){g.setTransform(dpr,0,0,dpr,0,0);try{V.over(g,V)}catch(err){console.error('medir',err)}g.globalAlpha=1}return fading};
  const coarse=Math.max(0,spec.Z-2);
  V.tiles_=()=>{const dprL=window.devicePixelRatio||1;const tgt=anim?anim.s:V.s;
    const zd=Math.max(0,Math.min(spec.Z-1,Math.floor(Math.log2(1/(tgt*dprL)))));const now=performance.now();
    /* vistas que hay que cubrir: la actual, la de destino de la animación de zoom (al alejar, lo que va a entrar ya se pide) y hacia
       donde la lleva la inercia del arrastre */
    const vws=[{s:V.s,x:V.x,y:V.y}];if(anim)vws.push({s:anim.s,x:anim.x,y:anim.y});if(fling)vws.push({s:V.s,x:V.x+fling.vx*PL_FLING_MS,y:V.y+fling.vy*PL_FLING_MS});
    /* rectángulo del plano (en px del detalle) que cubren esas vistas con un margen m (fracción de la pantalla por lado) */
    const rect=m=>{let a=1e12,b=1e12,c=-1e12,d=-1e12;for(const v of vws){const vw=cw/v.s,vh=ch/v.s,x0=-v.x/v.s,y0=-v.y/v.s;
      a=Math.min(a,x0-vw*m);b=Math.min(b,y0-vh*m);c=Math.max(c,x0+vw*(1+m));d=Math.max(d,y0+vh*(1+m))}return[a,b,c,d]};
    const r0=rect(0);
    /* mosaicos del nivel z dentro del rectángulo con margen m, con su distancia (en px del plano) a lo que se ve ahora */
    const tilesIn=(z,m)=>{const k=2**z,nx=Math.ceil(Math.ceil(spec.W/k)/T),ny=Math.ceil(Math.ceil(spec.H/k)/T),[a,b,c,d]=rect(m),out=[];
      const x0=Math.max(0,Math.floor(a/(T*k))),y0=Math.max(0,Math.floor(b/(T*k))),x1=Math.min(nx,Math.ceil(c/(T*k))),y1=Math.min(ny,Math.ceil(d/(T*k)));
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const wx=x*T*k,wy=y*T*k;
        out.push({k:z+'/'+x+'_'+y,z,d:Math.max(0,r0[0]-(wx+T*k),wx-r0[2],r0[1]-(wy+T*k),wy-r0[3])})}return out};
    const need=new Set();
    /* nivel grueso: toda la lámina, siempre */
    {const k=2**coarse,nx=Math.ceil(Math.ceil(spec.W/k)/T),ny=Math.ceil(Math.ceil(spec.H/k)/T);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)need.add(coarse+'/'+x+'_'+y)}
    if(zd<coarse){
      /* lo de siempre: el nivel del zoom con margen y el siguiente solo en pantalla; lo más cercano a la pantalla se pide primero */
      const base=[...tilesIn(zd,PL_TM[0]),...(zd+1<coarse?tilesIn(zd+1,0):[])].sort((p,q)=>p.d-q.d||p.z-q.z);
      for(const t of base)need.add(t.k);
      /* niveles intermedios con más margen: lo más cercano primero y, si no caben (PL_NEED_MAX), se descarta lo más lejano */
      const ex=[];for(let z=zd+1;z<coarse;z++)for(const t of tilesIn(z,PL_TM[Math.min(z-zd,PL_TM.length-1)]))if(!need.has(t.k))ex.push(t);
      ex.sort((p,q)=>p.d-q.d||p.z-q.z);const room=Math.max(0,PL_NEED_MAX-need.size);
      for(let i=0;i<ex.length&&i<room;i++)need.add(ex[i].k)}
    V.need=need;
    for(const k of need){let e=V.tiles.get(k);if(e){e.used=now;continue}
      const[z,xy]=k.split('/');const[x,y]=xy.split('_').map(Number);const zz=+z,f=2**zz;const lw=Math.ceil(spec.W/f),lh=Math.ceil(spec.H/f);
      e={z:zz,wx:x*T*f,wy:y*T*f,ww:Math.min(T,lw-x*T)*f,wh:Math.min(T,lh-y*T)*f,bm:null,t0:0,used:now};V.tiles.set(k,e);
      plGet(`${spec.base}/${k}.webp`).then(b=>plBitmap(b)).then(bm=>{if(V.dead||V.tiles.get(k)!==e){plBmClose(bm);return}
        e.bm=bm;e.t0=performance.now();V.evict();V.tick()},()=>{V.tiles.delete(k)})}};
  /* memoria: se sueltan los mosaicos que no hacen falta, los más viejos primero (nunca el nivel grueso) */
  V.evict=()=>{const L=[...V.tiles.entries()].filter(([k,e])=>e.bm&&e.z!==coarse&&!V.need.has(k));let n=[...V.tiles.values()].filter(e=>e.bm).length;
    L.sort((a,b)=>a[1].used-b[1].used);for(const[k,e]of L){if(n<=PL_CAP)break;plBmClose(e.bm);V.tiles.delete(k);n--}};
  /* gestos: rueda (touchpad: dos dedos desplaza, pellizco acerca), arrastre con inercia, pellizco con dos dedos y doble toque */
  const P=new Map();let pinch=null,vel=[],zvel=[],tap=null,lastTap=null,afterPinch=false,mdrag=null,mpt=null;
  host.addEventListener('wheel',e=>{e.preventDefault();const r=host.getBoundingClientRect();const cx=e.clientX-r.left,cy=e.clientY-r.top;
    const d=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*400:e.deltaY;
    if(e.ctrlKey){anim=null;fling=null;const ns=clampS(V.s*Math.exp(-d*0.01));const k=ns/V.s;V.x=cx-(cx-V.x)*k;V.y=cy-(cy-V.y)*k;V.s=ns;V.tick();return}
    if(e.deltaX!==0||(Math.abs(d)<50&&!Number.isInteger(e.deltaY))){anim=null;fling=null;V.x-=e.deltaX;V.y-=d;V.tick();return}
    V.zoomAt(Math.exp(-d*0.0022),cx,cy)},{passive:false});
  /* dedos «fantasma»: si la tablet no avisó que un dedo se levantó (salió por el borde, el sistema tomó el gesto…), el visor
     contaba un dedo de más y el siguiente pellizco no hacía zoom. Un toque nuevo (isPrimary) limpia lo que quedó colgado. */
  host.addEventListener('pointerdown',e=>{
    /* marcar (planos-marcar.js): si llega un segundo dedo mientras se dibuja, el trazo se descarta y empieza el pellizco */
    if(mdrag!=null){if(e.pointerType!=='touch'||!V.onCancel||!mpt)return;V.onCancel();const id=mdrag;mdrag=null;P.clear();afterPinch=false;P.set(id,{x:mpt.x,y:mpt.y})}else
    /* medir: tocar un punto ya puesto lo arrastra (sin mover el plano) */
    if(V.onDown&&e.isPrimary&&V.onDown(e.clientX,e.clientY,e)){mdrag=e.pointerId;mpt={x:e.clientX,y:e.clientY};try{host.setPointerCapture(e.pointerId)}catch(err){}return}
    if(e.isPrimary||(e.pointerType==='touch'&&P.size>=2)){P.clear();afterPinch=false}pinch=null;
    try{host.setPointerCapture(e.pointerId)}catch(err){}P.set(e.pointerId,{x:e.clientX,y:e.clientY});host.classList.add('drag');anim=null;fling=null;zfling=null;vel=[];
    if(P.size>=2){afterPinch=false;const[a,b]=[...P.values()].slice(-2);pinch={d:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};zvel=[]}
    if(P.size===1)tap={t:performance.now(),x:e.clientX,y:e.clientY,ok:true};else{tap=null;lastTap=null;anim=null}});
  host.addEventListener('pointermove',e=>{if(mdrag===e.pointerId){mpt={x:e.clientX,y:e.clientY};if(V.onDrag)V.onDrag(e.clientX,e.clientY,e);return}const p=P.get(e.pointerId);if(!p)return;const r=host.getBoundingClientRect();
    if(P.size>=2&&pinch){p.x=e.clientX;p.y=e.clientY;const[a,b]=[...P.values()].slice(-2);const d=Math.hypot(a.x-b.x,a.y-b.y);
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      if(pinch.d>0){const ns=clampS(V.s*d/pinch.d),k=ns/V.s,cx=mx-r.left,cy=my-r.top;V.x=cx-(cx-V.x)*k+(mx-pinch.cx);V.y=cy-(cy-V.y)*k+(my-pinch.cy);
        const t=performance.now();zvel.push({t,lk:Math.log(d/pinch.d),dx:mx-pinch.cx,dy:my-pinch.cy,cx,cy});while(zvel.length&&t-zvel[0].t>60)zvel.shift();V.s=ns}
      pinch.d=d;pinch.cx=mx;pinch.cy=my;V.tick();return}
    /* el dedo que queda al terminar un pellizco (casi nunca se levantan los dos a la vez) no arrastra ni corta la inercia del zoom, como en Dalux */
    if(afterPinch){p.x=e.clientX;p.y=e.clientY;return}
    const dx=e.clientX-p.x,dy=e.clientY-p.y;if(zfling&&Math.hypot(dx,dy)>2)zfling=null;if(tap&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>8)tap=null;V.x+=dx;V.y+=dy;p.x=e.clientX;p.y=e.clientY;const t=performance.now();vel.push({t,dx,dy});while(vel.length&&t-vel[0].t>90)vel.shift();V.tick()});
  const end=e=>{if(mdrag===e.pointerId){mdrag=null;if(V.onUp)V.onUp();return}const was=P.size===1&&!pinch&&!afterPinch;
    /* en modo medir un toque corto pone un punto (y no hay doble toque de zoom) */
    if(was&&tap&&V.onTap&&performance.now()-tap.t<400){V.onTap(tap.x,tap.y);lastTap=null}else
    /* vínculos (planos-vinculos.js): un toque corto sobre una zona vinculada la abre; fuera de las zonas sigue el doble toque de zoom */
    if(was&&tap&&V.onLink&&performance.now()-tap.t<400&&V.onLink(tap.x,tap.y)){lastTap=null}else
    /* doble toque = dos toques cortos, quietos y cercanos en menos de 0,3 s */
    if(was&&tap&&performance.now()-tap.t<250){const now=performance.now();
      if(lastTap&&now-lastTap.t<300&&Math.hypot(tap.x-lastTap.x,tap.y-lastTap.y)<40){const r=host.getBoundingClientRect();V.zoomAt(2,tap.x-r.left,tap.y-r.top);lastTap=null}else lastTap={t:now,x:tap.x,y:tap.y}}
    tap=null;const wasPinch=P.size>=2&&!!pinch;P.delete(e.pointerId);if(P.size<2){if(pinch&&P.size)afterPinch=true;pinch=null}if(!P.size)afterPinch=false;
    if(wasPinch&&zvel.length>1){const t=performance.now(),last=zvel[zvel.length-1];const dt=Math.max(16,t-zvel[0].t);
      const v=zvel.reduce((a,z)=>a+z.lk,0)/dt,vx=zvel.reduce((a,z)=>a+z.dx,0)/dt,vy=zvel.reduce((a,z)=>a+z.dy,0)/dt;
      /* solo si los dedos se movían al soltar (no si se quedaron quietos antes de levantarlos) */
      if(t-last.t<70&&(Math.abs(v)>0.0004||Math.hypot(vx,vy)>0.25))zfling={v,vx,vy,cx:last.cx,cy:last.cy};zvel=[];V.tick()}
    if(!P.size){host.classList.remove('drag');
      if(was&&vel.length>1){const dt=Math.max(16,performance.now()-vel[0].t),sx=vel.reduce((a,v)=>a+v.dx,0),sy=vel.reduce((a,v)=>a+v.dy,0);const vx=sx/dt,vy=sy/dt;
        if(Math.hypot(vx,vy)>0.25&&performance.now()-vel[vel.length-1].t<60)fling={vx,vy}}vel=[];V.tick()}};
  host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
  host.addEventListener('lostpointercapture',e=>{if(mdrag===e.pointerId){mdrag=null;if(V.onUp)V.onUp();return}if(P.has(e.pointerId))end(e)});
  /* red de seguridad: cuando ya no queda ningún dedo en la pantalla, se olvida todo */
  host.addEventListener('touchend',e=>{if(!e.touches.length&&P.size){P.clear();pinch=null;afterPinch=false;host.classList.remove('drag')}},{passive:true});
  host.addEventListener('touchcancel',()=>{P.clear();pinch=null;host.classList.remove('drag')},{passive:true});
  const ro=new ResizeObserver(()=>{const atFit=Math.abs(V.s-V.fit)<1e-9;resize();if(atFit)V.fitView();else V.tick()});ro.observe(host);
  /* medir: coordenadas del plano (píxeles del nivel de detalle) ↔ pantalla; el dibujo de encima (V.over) y los toques (V.onTap, V.onDown…) los pone planos-medir.js */
  V.toWorld=(cx,cy)=>{const r=host.getBoundingClientRect();return{x:(cx-r.left-V.x)/V.s,y:(cy-r.top-V.y)/V.s}};
  V.toScreen=(wx,wy)=>({x:V.x+wx*V.s,y:V.y+wy*V.s});
  V.cv=cv;V.host=host;V.getDpr=()=>dpr;V.W=spec.W;V.H=spec.H;
  V.getView=()=>({nx:(cw/2-V.x)/V.s/spec.W,ny:(ch/2-V.y)/V.s/spec.H,k:V.s/V.fit});
  V.setView=v=>{resize();V.fit=Math.min(cw/spec.W,ch/spec.H)*0.97;V.s=clampS(V.fit*v.k);V.x=cw/2-v.nx*spec.W*V.s;V.y=ch/2-v.ny*spec.H*V.s;anim=null;fling=null;zfling=null;V.tiles_();V.tick()};
  V.dbg=()=>({zfling,afterPinch,pointers:P.size,pinch:!!pinch});
  V.loaded=()=>[...V.tiles.values()].filter(e=>e.bm).length;
  V.sharp=()=>sharp?{s:sharp.s,x:sharp.x,y:sharp.y,ms:sharp.ms,w:sharp.c.width,h:sharp.c.height,rect:shRect(sharp),n:sharp.t0}:null;   /* pruebas */
  V.sharpBusy=()=>!!(shTimer||shTask);
  V.destroy=()=>{V.dead=true;shStop();shDrop();ro.disconnect();if(V.raf)cancelAnimationFrame(V.raf);for(const e of V.tiles.values())plBmClose(e.bm);V.tiles.clear();cv.width=cv.height=0;host.innerHTML=''};
  requestAnimationFrame(()=>{V.fitView();if(spec.view)V.setView(spec.view)});return V}
/* decodifica fuera del hilo principal (createImageBitmap); si el navegador no lo tiene, con <img>.decode() */
async function plBitmap(blob){if(window.createImageBitmap)return createImageBitmap(blob);
  const u=URL.createObjectURL(blob);const im=new Image();im.src=u;try{await im.decode()}finally{setTimeout(()=>URL.revokeObjectURL(u),0)}return im}
const plBmClose=bm=>{try{if(bm&&bm.close)bm.close()}catch(e){}};
let PLV=null;
function plOpen(id,list,opt){const p=PLB.get(id);if(!p)return;plClose(true);opt=opt||{};
  const box=document.createElement('div');box.className='plv';box.id='plv';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.tabIndex=-1;
  PLV={id,list:list&&list.length?list:[id],box,rev:p.rev||1,tv:null,ret:document.activeElement,panel:false,view:null,canDock:!!opt.dock,tab:opt.tab||'look',hq:opt.hq||null,hits:null,dock:false,piso0:opt.piso,
    pf:{piso:p.pisoId||'',disc:'',tipo:'',q:'',...store.get('plvf',{}),...(p.pisoId?{piso:p.pisoId}:{})}};document.body.appendChild(box);if(opt.dock&&!isMob())plDockSet(true,true);plvDraw();box.focus();
  box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(PLV.panel){PLV.panel=false;plvPanel();PLV.box.focus()}else if(pldEsc()){}else if(plkEsc()){}else if(PLM.on){plmToggle()}else plClose();return}
    if(e.target.closest('input,select,textarea,[contenteditable]'))return;
    if(e.key==='ArrowRight'){plStep(1)}else if(e.key==='ArrowLeft'){plStep(-1)}
    else if(e.key==='+'||e.key==='='){plvZoom(1.5)}else if(e.key==='-'){plvZoom(1/1.5)}else if(e.key==='0'){PLV.tv&&PLV.tv.fitView(true)}})}
function plvZoom(k){if(!PLV||!PLV.tv)return;const c=PLV.box.querySelector('.plvc');PLV.tv.zoomAt(k,c.clientWidth/2,c.clientHeight/2)}
function plClose(silent){if(!PLV)return;plmReset();plkReset();pldReset();if(PLV.tv)PLV.tv.destroy();if(PLV.dock)plDockBody(false);PLV.box.remove();const r=PLV.ret;const lk=PLV.canDock;PLV=null;if(lk)lkPlanoBtn();if(!silent&&r&&r.isConnected)try{r.focus()}catch(e){}}
function plStep(d){if(!PLV)return;const L=PLV.list.filter(i=>PLB.has(i));const i=L.indexOf(PLV.id);if(i<0||L.length<2)return;const n=L[(i+d+L.length)%L.length];PLV.id=n;PLV.rev=PLB.get(n).rev||1;PLV.back=[];plvDraw()}
function plSpecOf(p,rev){if(!rev||rev===(p.rev||1))return{base:p.base,W:p.W,H:p.H,Z:p.Z,T:p.T||PL_T,crop:p.crop||null,fname:p.fname,ts:p.ts,byN:p.byN,cur:true,rev:p.rev||1};
  const r=(p.revs||[]).find(x=>x.rev===rev);return r?{base:r.base,W:r.W,H:r.H,Z:r.Z,T:PL_T,crop:r.crop||null,fname:r.fname,ts:r.ts,byN:r.byN,cur:false,rev:r.rev}:plSpecOf(p,0)}
function plvDraw(){const p=PLB.get(PLV.id);if(!p){plClose();return}const sp=plSpecOf(p,PLV.rev);const L=PLV.list.filter(i=>PLB.has(i));const n=L.length,i=L.indexOf(PLV.id);
  const revs=[{rev:p.rev||1,cur:true},...(p.revs||[]).slice().reverse()];
  const sib=p.eto?[]:plSameSpot(p),up=p.eto?null:plFloorStep(p,1),dn=p.eto?null:plFloorStep(p,-1);const pc=id=>esc((S.pis.get(id)||ARCH.pis.get(id)||{}).code||'');
  PLV.box.innerHTML=`<div class="plvh">
    ${p.eto?'':`<button class="ib plvmenu${PLV.panel?' on':''}" data-pv="menu" aria-expanded="${PLV.panel}" title="Buscar y filtrar planos sin salir">☰ Planos</button>`}
    ${plkBackBtn()}
    <button class="ib" data-pv="prev" aria-label="Plano anterior"${n<2?' disabled':''}>‹</button>
    <div class="plvt"><b class="mono">${esc(p.cod)}</b> <span>${esc(p.tit||'')}</span><small>${esc((p.eto?['ETO · '+etoScName(p.sc)]:[PL_DN[p.disc]||p.disc,p.tipo]).concat([plPisoName(p.pisoId)||p.niv||'General']).filter(Boolean).join(' · '))}${n>1?` · ${i+1} de ${n}`:''}</small></div>
    <button class="ib" data-pv="next" aria-label="Plano siguiente"${n<2?' disabled':''}>›</button>
    <span class="plvsp"></span>
    ${revs.length>1?`<select class="tin" data-pv="rev" aria-label="Revisión">${revs.map(r=>`<option value="${r.rev}"${r.rev===sp.rev?' selected':''}>Rev. ${r.rev}${r.cur?' (vigente)':''}</option>`).join('')}</select>`:`<span class="plvr">Rev. ${sp.rev}</span>`}
    <button class="ib" data-pv="zout" aria-label="Alejar">−</button><button class="ib" data-pv="fit" title="Ver la lámina entera (0)">Ajustar</button><button class="ib" data-pv="zin" aria-label="Acercar">+</button>
    <button class="ib${PLM.on?' on':''}" data-pv="med" title="Medir distancias y áreas sobre el plano">📏 Medir</button>
    ${pldHdrBtn()}
    ${p.eto?'':plkHdrBtn(p)}
    <button class="ib" data-pv="pdf" title="Descargar el PDF original">PDF</button>
    ${plTablet()&&sp.cur?`<button class="ib${plOffSt(p)==='ok'?' on':''}" data-pv="off" title="Guardar este plano completo en la tablet para verlo sin internet">${plOffSt(p)==='ok'?'✓ Sin conexión':plOffSt(p)==='old'?'⟳ Actualizar':'⤓ Sin conexión'}</button>`:''}
    ${plEdOf(p)?`<button class="ib" data-pv="edit" title="Corregir los datos o archivar">⋯</button>`:''}
    ${PLV.canDock&&!isMob()?`<button class="ib" data-pv="dock" title="${PLV.dock?'Agrandar a pantalla completa':PLV.tab==='mapa'?'Volver al lado del plan diario':'Volver al lado del lookahead'}" aria-label="${PLV.dock?'Pantalla completa':'Al lado'}">${PLV.dock?'⛶':'◧'}</button>`:''}
    <button class="ib" data-pv="x" aria-label="Cerrar">✕</button></div>
    ${sp.cur&&(sib.length>1||up||dn)?`<div class="plvq">${sib.length>1?`<span class="plvql" title="Abre otra especialidad del mismo piso en la misma zona y con el mismo zoom">Mismo punto</span>${sib.map(q=>`<button type="button" class="plchip${q.id===p.id?' on':''}" data-pj="${esc(q.id)}" title="${esc(q.cod+' · '+(q.tit||''))}"><b>${esc(q.disc)}</b> ${esc(q.cod)}</button>`).join('')}`:''}
      <span class="plvsp"></span>${dn?`<button type="button" class="plchip" data-pj="${esc(dn.id)}" title="Piso de abajo, misma zona: ${esc(dn.cod+' · '+(dn.tit||''))}">▼ ${pc(dn.pisoId)}</button>`:''}${up?`<button type="button" class="plchip" data-pj="${esc(up.id)}" title="Piso de arriba, misma zona: ${esc(up.cod+' · '+(up.tit||''))}">▲ ${pc(up.pisoId)}</button>`:''}</div>`:''}
    ${sp.cur?'':`<div class="plvold">Estás viendo la <b>revisión ${sp.rev}</b>, que ya no es la vigente (vigente: rev. ${p.rev||1}).</div>`}
    <div class="plvb"></div>
    <div class="plvf">${esc(sp.fname||'')}${sp.ts?' · cargado '+esc(ldt(sp.ts))+(sp.byN?' por '+esc(sp.byN):''):''}${p.rot&&p.rot.cod&&!p.rot.ok?` · <b class="plwarn">El rótulo dice ${esc(p.rot.cod)}</b>`:''}</div>`;
  if(PLV.tv)PLV.tv.destroy();PLV.tv=plTiles(PLV.box.querySelector('.plvb'),{...sp,view:PLV.view});PLV.view=null;if(PLV.panel)plvPanel();plmAttach();plkAttach();pldAttach();plTxAttach();plDockSplitAdd();
  PLV.box.onclick=async e=>{const j=e.target.closest('[data-pj]');if(j){plJump(j.dataset.pj,true);return}
    const g=e.target.closest('[data-pg]');if(g){if(PLV.pf.qm==='tx'){PLV.hq=PLV.pf.q;PLV.list=plTxIds(plvRes(true))}else PLV.list=plvRes().map(x=>x.id);plJump(g.dataset.pg,false);if(window.innerWidth<900){PLV.panel=false;plvPanel()}return}
    const f=e.target.closest('[data-pf]');if(f){const[k,v]=f.dataset.pf.split(':');PLV.pf[k]=v;store.set('plvf',{disc:PLV.pf.disc,tipo:PLV.pf.tipo,qm:PLV.pf.qm||''});plvPanel();return}
    const b=e.target.closest('[data-pv]');if(!b||b.tagName==='SELECT')return;const a=b.dataset.pv;
    if(a==='menu'){PLV.panel=!PLV.panel;plvPanel();return}if(a==='pclose'){PLV.panel=false;plvPanel();return}
    if(a==='x')plClose();else if(a==='prev')plStep(-1);else if(a==='next')plStep(1);else if(a==='fit')PLV.tv.fitView(true);else if(a==='zin')plvZoom(1.5);else if(a==='zout')plvZoom(1/1.5);
    else if(a==='dock')plDockSet(!PLV.dock);
    else if(a==='med')plmToggle();else if(a==='mark')pldToggle();else if(a==='lk')plkBtn();else if(a==='back')plkBack();else if(a==='pdf')plPdf(p,sp,b);else if(a==='off')plOffOne(p,b);else if(a==='edit')plEdit(p,b)};
  const rs=PLV.box.querySelector('select[data-pv="rev"]');if(rs)rs.onchange=e=>{PLV.rev=+e.target.value;plvDraw()}}
/* ---------- Plano del piso al lado del lookahead (oct 2026, pedido del dueño) ----------
   «▦ Plano» en la barra del Lookahead abre este mismo visor acoplado a la derecha: el lookahead se angosta y sigue editable
   a la izquierda (pantalla dividida); ⛶ lo agranda a pantalla completa y ◧ lo devuelve al lado. Abre el plano del piso que
   muestra el lookahead (planta de arquitectura primero) y, al cambiar de piso, salta a la misma especialidad y tipo del piso
   nuevo. «☰ Planos» filtra otro plano. El ancho se cambia arrastrando el borde (se aplica al soltar: redimensionar la grilla
   en cada movimiento sería lento con miles de filas) y se recuerda en el equipo. Celular: no se acopla (pantalla completa). */
const PLD_MIN=320;
function plDockW(){const f=+store.get('lkdw',0.5)||0.5;const W=innerWidth;return Math.round(Math.min(W-420,Math.max(PLD_MIN,W*f)))}
function plDockPlace(){if(!PLV||!PLV.dock)return;const m=$('#main');const top=m?Math.max(0,m.getBoundingClientRect().top):0;const r=document.documentElement.style;
  r.setProperty('--lkdt',top+'px');r.setProperty('--lkdw',plDockW()+'px')}
function plDockBody(on){document.body.classList.toggle('lkdock',on);if(on){plDockPlace();addEventListener('resize',plDockPlace);requestAnimationFrame(plDockScroll)}else removeEventListener('resize',plDockPlace)}
/* con el plano al lado solo la columna Actividad queda fija (como en pantallas angostas): se corre la grilla hasta los días
   (o hasta Metrado/Saldo en modo metrado) para que no queden escondidos detrás de las columnas de la izquierda */
function plDockScroll(){const gw=$('#gw');if(!gw)return;const t=gw.querySelector(U.qmode==='metrado'?'#grid tr.ar td.cM':'#grid tr.ar td.d');const s4=gw.querySelector('#grid tr.ar td.s4');if(!t||!s4)return;
  const x=Math.max(0,t.offsetLeft-s4.offsetWidth);if(gw.scrollLeft<x)gw.scrollLeft=x}
function plDockSet(on,silent){if(!PLV||!PLV.canDock)return;on=!!on&&!isMob();PLV.dock=on;const box=PLV.box;box.classList.toggle('dock',on);box.setAttribute('aria-modal',on?'false':'true');plDockBody(on);
  if(!silent)plvDraw();lkPlanoBtn()}
/* el borde para cambiar el ancho (plvDraw rehace el contenido del visor, así que lo vuelve a poner) */
function plDockSplitAdd(){if(!PLV||!PLV.dock||PLV.box.querySelector('.plvsplit'))return;const sp=document.createElement('div');sp.className='plvsplit';sp.title='Arrastra para cambiar el ancho';PLV.box.appendChild(sp);plDockSplit(sp)}
function plDockSplit(sp){sp.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();sp.setPointerCapture(e.pointerId);
  const g=document.createElement('div');g.className='plvghost';document.body.appendChild(g);const lim=x=>Math.min(innerWidth-PLD_MIN,Math.max(420,x));let x=lim(e.clientX);g.style.left=x+'px';
  const mv=ev=>{x=lim(ev.clientX);g.style.left=x+'px'};
  const up=()=>{sp.removeEventListener('pointermove',mv);sp.removeEventListener('pointerup',up);sp.removeEventListener('pointercancel',up);g.remove();store.set('lkdw',Math.round((innerWidth-x)/innerWidth*1000)/1000);plDockPlace()};
  sp.addEventListener('pointermove',mv);sp.addEventListener('pointerup',up);sp.addEventListener('pointercancel',up)})}
function lkPlanoBtn(){const b=$('#fplano');if(b)b.classList.toggle('on',!!(PLV&&PLV.canDock));
  /* Plan diario › Reunión: redibuja el botón «◫ Planos» y vuelve a encuadrar (el plano del día cambió de ancho) */
  if(U.tab==='mapa'&&window.__plano){requestRender();if(window.__plano.meetRefit)window.__plano.meetRefit()}}
/** láminas del piso ordenadas (especialidad, código) */
function plFloorList(piso){return plAct().filter(q=>piso?q.pisoId===piso:true).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b))}
/** la lámina a mostrar para un piso: con ref, la misma especialidad y tipo (título más parecido); si no, planta de arquitectura */
function plPickFor(piso,ref){const L=plFloorList(piso).filter(q=>piso?true:!q.pisoId);if(!L.length)return null;
  if(ref){const c=L.filter(q=>q.disc===ref.disc&&q.tipo===ref.tipo);if(c.length){c.sort((a,b)=>plSim(b,ref)-plSim(a,ref)||plCodCmp(a,b));return c[0]}}
  return L.find(q=>q.tipo==='Planta'&&q.disc==='ARQ')||L.find(q=>q.tipo==='Planta')||L[0]}
function lkPlano(){if(!canPla())return;if(PLV&&PLV.canDock){plClose();return}plDockOpen(U.piso||'','look')}
/** abre el visor acoplado a la derecha de la pestaña `tab` (Lookahead o Plan diario › Reunión) con el plano del piso */
function plDockOpen(piso,tab){if(!canPla())return;
  plSub();if(!plbReady){toast('Cargando la lista de planos…');let n=0;const w=()=>{if(U.tab!==tab)return;if(plbReady)plDockOpen(piso,tab);else if(++n<40)setTimeout(w,250);else toast('No se pudo leer la lista de planos. Revisa la conexión.')};setTimeout(w,250);return}
  if(!plAct().length){toast('Aún no hay planos cargados (se cargan en el módulo Planos).');return}
  const p=piso?plPickFor(piso,null):null;
  if(p){plOpen(p.id,plFloorList(piso).map(q=>q.id),{dock:true,piso,tab});return}
  /* sin piso elegido o el piso aún no tiene planos: se abre con el panel de búsqueda para elegir */
  const any=plFloorList('')[0];plOpen(any.id,plFloorList('').map(q=>q.id),{dock:true,piso,tab});PLV.panel=true;if(piso)PLV.pf.piso=piso;plvPanel();
  if(piso)toast(`${(S.pis.get(piso)||{}).name||'Este piso'} aún no tiene planos cargados: elige otro en «☰ Planos».`)}
/** el lookahead (o la reunión del plan diario, con su piso) cambió de piso: el plano acoplado salta al mismo tipo de lámina del piso nuevo */
function plDockFollow(piso){piso=piso==null?(U.piso||''):piso;if(!PLV||!PLV.canDock||PLV.piso0===piso)return;PLV.piso0=piso;if(!PLV.piso0)return;
  const q=plPickFor(PLV.piso0,PLB.get(PLV.id));if(!q||q.id===PLV.id)return;PLV.list=plFloorList(PLV.piso0).map(x=>x.id);PLV.pf.piso=PLV.piso0;plJump(q.id,true)}
/* ---------- Panel «☰ Planos» dentro del visor y saltos entre láminas ---------- */
const PL_NOISE=/^(PRIMER|SEGUNDO|TERCER|CUARTO|QUINTO|SEXTO|SOTANO|AZOTEA|PISO|NIVEL|PLANTA|DEL|LOS|LAS|CON|PARA)$/;
const plWords=t=>new Set(plUp(t).replace(/[^A-Z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!PL_NOISE.test(w)));
function plSim(a,b){const A=plWords(a.tit),B=plWords(b.tit);let n=0;A.forEach(w=>{if(B.has(w))n++});return n}
const plDiscIx=d=>{const i=PL_DISC.findIndex(x=>x[0]===d);return i<0?99:i};
/** láminas del mismo piso y tipo (una por especialidad y por código): para cambiar de especialidad en la misma zona */
function plSameSpot(p){if(!p.pisoId)return[];return plAct().filter(q=>q.pisoId===p.pisoId&&q.tipo===p.tipo).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b))}
/** misma especialidad y tipo en el piso de arriba (d=1) o de abajo (d=-1), con el título más parecido (agua ↔ agua, desagüe ↔ desagüe) */
function plFloorStep(p,d){if(!p.pisoId)return null;const ps=pisos().map(x=>x.id);const i=ps.indexOf(p.pisoId);if(i<0)return null;
  for(let k=i+d;k>=0&&k<ps.length;k+=d){const c=plAct().filter(q=>q.pisoId===ps[k]&&q.disc===p.disc&&q.tipo===p.tipo);if(c.length){c.sort((a,b)=>plSim(b,p)-plSim(a,p)||plCodCmp(a,b));return c[0]}}return null}
/** cambia de lámina sin salir; keep: conserva la zona y el zoom (las láminas de un piso tienen el mismo formato y encuadre) */
function plJump(id,keep){const q=PLB.get(id);if(!q||!PLV)return;PLV.view=keep&&PLV.tv?PLV.tv.getView():null;
  /* con los saltos de «mismo punto» y ▲▼ el filtro de piso del panel sigue al plano */if(keep&&PLV.pf.piso&&PLV.pf.piso!=='-'&&q.pisoId)PLV.pf.piso=q.pisoId;PLV.id=id;PLV.rev=q.rev||1;PLV.back=[];
  if(!PLV.list.includes(id))PLV.list=[...PLV.list,id];plvDraw()}
function plvRes(noQ){const f=PLV.pf,w=noQ?[]:plUp(f.q).trim().split(/\s+/).filter(Boolean);
  return plAct().filter(p=>(!f.piso||(f.piso==='-'?!p.pisoId:p.pisoId===f.piso))&&(!f.disc||p.disc===f.disc)&&(!f.tipo||p.tipo===f.tipo)
    &&(!w.length||w.every(x=>plUp([p.cod,p.tit,p.fname,PL_DN[p.disc]].join(' ')).includes(x)))).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b))}
function plvPanel(){if(!PLV)return;let el=PLV.box.querySelector('.plvp');const mb=PLV.box.querySelector('.plvmenu');if(mb){mb.classList.toggle('on',PLV.panel);mb.setAttribute('aria-expanded',PLV.panel)}
  if(!PLV.panel){if(el)el.remove();return}
  const body=PLV.box.querySelector('.plvb');
  if(!el){el=document.createElement('div');el.className='plvp';el.innerHTML=`<div class="plvph"><b>Planos</b><button class="ib" data-pv="pclose" aria-label="Cerrar el panel">✕</button></div>
      <input class="tin" type="search" placeholder="Buscar: IS07, bombas, cortes…" aria-label="Buscar planos" autocomplete="off">
      <div class="seg plqm" role="tablist" aria-label="Buscar en"><button type="button" data-qm="">Nombre</button><button type="button" data-qm="tx">Contenido</button></div><div class="plvpf"></div><div class="pltxst"></div><div class="plvpl"></div>`;
    PLV.box.appendChild(el);const inp=el.querySelector('input');inp.value=PLV.pf.q||'';let qt=0;inp.oninput=()=>{PLV.pf.q=inp.value;clearTimeout(qt);if(PLV.pf.qm==='tx')qt=setTimeout(()=>{if(PLV)plvPanelList(el)},PLTX_WAIT);else plvPanelList(el)};
    el.querySelector('.plqm').onclick=e=>{const b=e.target.closest('[data-qm]');if(!b)return;e.stopPropagation();PLV.pf.qm=b.dataset.qm;store.set('plvf',{disc:PLV.pf.disc,tipo:PLV.pf.tipo,qm:PLV.pf.qm});plvPanel()};
    if(!plTablet())setTimeout(()=>inp.focus(),0)}
  el.style.top=(body?body.offsetTop:56)+'px';const tm=PLV.pf.qm==='tx';
  el.querySelectorAll('.plqm [data-qm]').forEach(b=>{const on=(b.dataset.qm==='tx')===tm;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  el.querySelector('input').placeholder=tm?'Buscar dentro: DET. 4, V-101…':'Buscar: IS07, bombas, cortes…';
  const f=PLV.pf,act=plAct();const inP=act.filter(p=>!f.piso||(f.piso==='-'?!p.pisoId:p.pisoId===f.piso));
  const chip=(k,v,l,t)=>`<button type="button" class="plchip${f[k]===v?' on':''}" data-pf="${k}:${esc(v)}"${t?` title="${esc(t)}"`:''}>${esc(l)}</button>`;
  const ps=pisos().filter(x=>act.some(p=>p.pisoId===x.id));const gen=act.some(p=>!p.pisoId);
  const ds=PL_DISC.filter(d=>inP.some(p=>p.disc===d[0]));const ts=PL_TIPOS.filter(t=>inP.some(p=>p.tipo===t&&(!f.disc||p.disc===f.disc)));
  if(f.disc&&!ds.some(d=>d[0]===f.disc))f.disc='';
  el.querySelector('.plvpf').innerHTML=`<div class="plvps"><span>Piso</span>${chip('piso','','Todos')}${ps.map(x=>chip('piso',x.id,x.code,x.name)).join('')}${gen?chip('piso','-','Gen.','Generales (sin piso)'):''}</div>
    <div class="plvps"><span>Especialidad</span>${chip('disc','','Todas')}${ds.map(d=>chip('disc',d[0],d[0],d[1])).join('')}</div>
    <div class="plvps"><span>Tipo</span>${chip('tipo','','Todos')}${ts.map(t=>chip('tipo',t,t)).join('')}</div>`;
  plvPanelList(el)}
function plvPanelList(el){const st=el.querySelector('.pltxst');if(PLV.pf.qm==='tx'){plTxPanelList(el,plvRes(true));return}if(st)shx(st,'');
  const L=plvRes();const host=el.querySelector('.plvpl');
  const h=L.length?L.map(p=>`<button type="button" class="plvpr${p.id===PLV.id?' on':''}" data-pg="${esc(p.id)}"><span class="plvpt"><img data-th="${esc(p.base+'/th.webp')}" alt=""></span><span class="plvpi"><b class="mono">${esc(p.cod)}</b> ${esc(p.tit||'')}<small>${esc([PL_DN[p.disc]||p.disc,p.tipo,plPisoName(p.pisoId)||'General'].join(' · '))}</small></span></button>`).join('')
    :'<p class="note">Ningún plano con esos filtros.</p>';
  if(host.dataset.h!==h){host.innerHTML=h;host.dataset.h=h;plThumbs(host);const on=host.querySelector('.plvpr.on');if(on)on.scrollIntoView({block:'nearest'})}}
async function plPdf(p,sp,btn){btn.disabled=true;const t=btn.textContent;btn.textContent='Descargando…';
  try{const b=await plGet(sp.base+'/orig.pdf');const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=(sp.fname||p.cod)+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
  catch(e){toast('No se pudo descargar el PDF: '+e.message)}finally{btn.disabled=false;btn.textContent=t}}
function plEdit(p,btn){
  openPop(btn,`<div class="ph">${esc(p.cod)} · datos del plano</div><div class="plef">
    <label>Título<input class="tin" id="pleT" value="${esc(p.tit||'')}" maxlength="160"></label>
    <label>Piso<select class="tin" id="pleP"><option value="">General (sin piso)</option>${pisos().map(x=>`<option value="${x.id}"${x.id===p.pisoId?' selected':''}>${esc(x.code+' · '+x.name)}</option>`).join('')}</select></label>
    ${p.eto?'':`<label>Tipo<select class="tin" id="pleK">${PL_TIPOS.map(t=>`<option${t===p.tipo?' selected':''}>${t}</option>`).join('')}</select></label>`}
    <p class="note">${p.eto?'El subcontratista y el código identifican el ETO (las revisiones se reconocen por ellos); no se cambian aquí.':'El código y la especialidad identifican la lámina (las revisiones se reconocen por ellos); no se cambian aquí.'}</p>
    ${p.arch?'':`<div class="plea plrot"><span>Girar la lámina</span><button class="ib" data-do="rl" title="Girar 90° a la izquierda">⟲ Izquierda</button><button class="ib" data-do="rr" title="Girar 90° a la derecha">⟳ Derecha</button></div>`}
    <div class="plea"><button class="ib pri" data-do="sv">Guardar</button>${p.arch?'<button class="ib" data-do="ua">Recuperar</button>':'<button class="ib" data-do="ar">Archivar</button>'}${plAdm()?'<button class="ib bad" data-do="del" title="Borrar de verdad la lámina y todos sus archivos (solo el administrador)">Eliminar…</button>':''}</div></div>`,
    {sv:async()=>{const d={tit:$('#pleT').value.trim(),pisoId:$('#pleP').value};if(!p.eto)d.tipo=$('#pleK').value;try{await plCol(p).doc(p.id).update(d);toast('Datos del plano guardados')}catch(e){toast('No se pudo guardar: '+(e.code||e.message))}},
     ar:async()=>{if(!await uiAsk({title:'¿Archivar este plano?',text:`${p.cod} · ${p.tit||''} deja de verse en la biblioteca. Se puede recuperar desde «Archivados».`,ok:'Archivar',tone:'warn'}))return;
       try{await plCol(p).doc(p.id).update({arch:{t:NOW(),by:me.email,n:me.name||me.email}});plClose();toast('Plano archivado')}catch(e){toast('No se pudo archivar: '+(e.code||e.message))}},
     ua:async()=>{try{await plCol(p).doc(p.id).update({arch:firebase.firestore.FieldValue.delete()});toast('Plano recuperado')}catch(e){toast('No se pudo recuperar: '+(e.code||e.message))}},
     del:()=>plDelete([p]),rl:()=>plRotate(p,3),rr:()=>plRotate(p,1)})}

/* ---------- Girar una lámina ya cargada (oct 2026, pedido del dueño) ----------
   Se baja su orig.pdf, se gira con pdf-lib y se vuelve a procesar EN ESTA PC (mosaicos en una carpeta nueva; la anterior no se borra).
   Queda en la MISMA revisión: sus vínculos y propuestas se giran con ella (plProcess, `keep`), los que llegan desde otras láminas a una
   zona de esta también (v), y la calibración sigue valiendo (misma resolución). El recorte al marco se gira (no se vuelve a buscar).
   Si la usa una lámina del Plan diario o de Sectorización, no se gira (sus zonas quedarían corridas): primero se desvincula. */
let plRotBusy=false;
async function plRotate(p,q){if(!plEdOf(p)||plRotBusy)return;
  if(!p.eto){const us=await plUsos([p.id]);if(us.length){await uiAsk({title:'No se puede girar',tone:'warn',text:'Esta lámina la usa el Plan diario o la Sectorización: sus zonas quedarían corridas. Primero desvincúlala (menú de la lámina › «Desvincular del módulo Planos»).',
    list:us.slice(0,8).map(u=>`${u.mod}${u.mod==='Last Planner'&&S.pis.get(u.pisoId)?' · '+S.pis.get(u.pisoId).name:''} · ${u.nm}${u.base?' (lámina base)':''}`),ok:'Entendido',cancel:''});return}}
  if(!await uiAsk({title:`¿Girar ${p.cod||'la lámina'} 90° a la ${q===1?'derecha':'izquierda'}?`,tone:'info',text:'La lámina se vuelve a procesar en esta PC (unos 20–60 s): deja la pestaña visible. Sigue en la misma revisión; sus vínculos y su calibración se conservan. Todo el equipo la verá girada.',ok:'Girar',cancel:'Cancelar'}))return;
  plRotBusy=true;const bar=document.createElement('div');bar.className='swupd ploffbar';bar.innerHTML='<span></span>';document.body.appendChild(bar);const say=t=>{bar.firstChild.textContent=`Girando ${p.cod||''}: ${t}`};
  try{say('bajando el PDF…');const blob=await plGet(p.base+'/orig.pdf');await plPdfJs();
    let cropAt=null;if(p.crop){const d=await window.pdfjsLib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;const v=(await d.getPage(1)).getViewport({scale:1});try{d.destroy()}catch(e){}cropAt=plRotCrop(p.crop,v.width,v.height,q)}
    const it={id:p.id,keep:true,q,pg:1,pgs:1,crop:!!p.crop,cropAt,file:new File([blob],(p.fname||p.cod||'lamina')+'.pdf',{type:'application/pdf'}),
      m:{eto:!!p.eto,sc:p.sc||'',cod:p.cod||'',disc:p.disc||'',niv:p.niv||'',pisoId:p.pisoId||'',tipo:p.tipo||'Otro',tit:p.tit||'',eta:p.eta||''}};
    const r=await plProcess(it,say);
    /* vínculos de OTRAS láminas que abren una zona de esta: la zona también gira */
    if(!p.eto){say('ajustando los vínculos que llegan a esta lámina…');const fx=L=>(L||[]).map(l=>l&&l.to===p.id&&l.v?{...l,v:plRotV(l.v,q)}:l);
      for(const o of plAct())if(o.id!==p.id&&[...(o.lk||[]),...(o.lkp||[])].some(l=>l&&l.to===p.id&&l.v)){try{await plkpSave(o.id,(lk,lkp)=>({lk:fx(lk),lkp:fx(lkp)}))}catch(e){console.error('girar: vínculos de',o.id,e)}}}
    toast(`Lámina girada (${r.secs} s).${PLOFF[p.id]?' En esta tablet, vuelve a guardarla sin conexión (⟳ Actualizar).':''}`);if(PLV&&PLV.id===p.id){PLV.view=null;plvDraw()}}
  catch(e){console.error('girar',p.id,e);toast('No se pudo girar: '+(e.message||e))}
  finally{plRotBusy=false;bar.remove()}}

/* ---------- Eliminar planos (solo el administrador; docs/ia/planos.md › Eliminar) ----------
   A diferencia de «Archivar», borra de verdad: el documento `plb/<id>` y todos sus archivos de Storage (todas las revisiones, también
   las carpetas que dejó «Empezar en Rev. 1»: `planos/<id>/…` y `planos/<id>.<marca>/…`). Pide escribir BORRAR. */
const plAdm=()=>!!me&&me.role==='admin';
/** nombres de los archivos de Storage que empiezan con `prefix` (API REST, de 1000 en 1000) */
async function plStList(prefix){const out=[];let tok='';
  for(let i=0;i<100;i++){const r=await fetch(plApi()+'/o?prefix='+encodeURIComponent(prefix)+(tok?'&pageToken='+encodeURIComponent(tok):''),{headers:{Authorization:'Firebase '+await plTok()}});
    if(!r.ok)throw new Error('Storage respondió '+r.status);const j=await r.json();(j.items||[]).forEach(x=>out.push(x.name));if(!j.nextPageToken)break;tok=j.nextPageToken}
  return out}
async function plStDel(path){const r=await fetch(plApi()+'/o/'+encodeURIComponent(path),{method:'DELETE',headers:{Authorization:'Firebase '+await plTok()}});
  if(!r.ok&&r.status!==404)throw new Error(r.status===403?'Sin permiso para borrar en Storage (¿reglas de Storage instaladas?).':'Storage respondió '+r.status)}
/** láminas del Plan diario y de Sectorización (Last Planner y Casco) que usan estos planos (plb.id) y no están archivadas */
async function plUsos(ids){const want=new Set(ids),out=[];
  for(const[col,mod]of[['laminas','Last Planner'],['cs_laminas','Casco']]){let sn;try{sn=await(db||FDB).collection(col).get()}catch(e){continue}
    sn.docs.forEach(d=>{const l=d.data()||{};if(!l.arch&&l.plb&&want.has(l.plb.id))out.push({plb:l.plb.id,mod,nm:l.name||l.esp||'',pisoId:l.pisoId,base:!!l.base})})}
  return out}
async function plDelete(list){if(!plAdm())return;list=(list||[]).filter(Boolean);if(!list.length){toast('No hay planos en la lista.');return}
  /* un plano que usa una lámina del Plan diario o de Sectorización no se elimina (decidido con el dueño, oct 2026): primero se desvincula */
  {const us=await plUsos(list.filter(p=>!p.eto).map(p=>p.id));if(us.length){const by=id=>(PLB.get(id)||{}).cod||id;
    await uiAsk({title:'No se puede eliminar',tone:'warn',text:`${us.length===1?'Este plano lo usa una lámina':'Estos planos los usan láminas'} del Plan diario o de Sectorización. Primero desvincúlalas (menú de la lámina › «Desvincular del módulo Planos») o reemplázalas por otro plano.`,
      list:us.slice(0,12).map(u=>`${by(u.plb)} · ${u.mod}${u.mod==='Last Planner'&&S.pis.get(u.pisoId)?' · '+S.pis.get(u.pisoId).name:''} · ${u.nm}${u.base?' (lámina base)':''}`).concat(us.length>12?[`… y ${us.length-12} más`]:[]),ok:'Entendido',cancel:''});return}}
  const one=list.length===1,lk=list.reduce((a,p)=>a+plLkN(p),0);
  const v=await uiAsk({title:one?`¿Eliminar ${list[0].cod}?`:`¿Eliminar ${list.length} planos?`,tone:'danger',
    text:`Se borran de verdad${one?'':' los planos que muestra la lista'}: la lámina, todas sus revisiones y sus archivos${lk?` (y ${lk} vínculo${lk===1?'':'s'})`:''}. No se puede deshacer. Si solo quieres ocultarla, usa «Archivar».`,
    list:list.slice(0,12).map(p=>`${p.cod} · ${p.tit||''} · rev. ${p.rev||1}${p.revs&&p.revs.length?` (+${p.revs.length})`:''}`).concat(list.length>12?[`… y ${list.length-12} más`]:[]),
    input:{label:'Escribe BORRAR para confirmar',required:true},ok:'Eliminar',cancel:'Cancelar'});
  if(v==null)return;if(String(v).trim().toUpperCase()!=='BORRAR'){toast('No se eliminó: había que escribir BORRAR.');return}
  if(PLV&&list.some(p=>p.id===PLV.id))plClose(true);
  let ok=0,files=0,fail=0;toast(`Eliminando ${list.length} plano${list.length===1?'':'s'}…`);
  for(const p of list){
    try{await plCol(p).doc(p.id).delete();ok++}catch(e){fail++;console.error('eliminar plano',p.id,e);continue}
    /* archivos: primero el registro (desaparece al instante para todos); luego Storage, que puede tardar */
    const rt=p.eto?etoRoot(p.sc):'planos';
    try{const names=[...await plStList(`${rt}/${p.id}/`),...await plStList(`${rt}/${p.id}.`)];
      for(let i=0;i<names.length;i+=8)await Promise.all(names.slice(i,i+8).map(n=>plStDel(n).then(()=>files++)))}
    catch(e){console.error('eliminar archivos',p.id,e)}
    if(PLOFF[p.id]){delete PLOFF[p.id];plOffPut()}
    await plCacheDrop(p.id);PLPDF.forEach((v,k)=>{if(k.startsWith(`${rt}/${p.id}/`)||k.startsWith(`${rt}/${p.id}.`))PLPDF.delete(k)})}
  toast(fail?`Se eliminaron ${ok} de ${list.length} (${fail} con error).`:`Eliminado${one?'':'s'}: ${ok} plano${ok===1?'':'s'} y ${files} archivo${files===1?'':'s'}.`);requestRender()}

/* ---------- Carga masiva ---------- */
const PQ={items:[],run:false,stop:false,t0:0,done:0,secs:[]};
/** ETO: del nombre solo se intenta sacar el piso (N3, P03, PISO 3), un código corto al final (M02) y un título legible; todo se corrige en la tabla */
function etoParse(fname){const n=fname.replace(/\.pdf$/i,'').replace(/-Model$/i,'');const toks=n.split(/[_\s]+|\s-\s/).filter(Boolean);
  let pisoId='';const pm=plUp(n).match(/(?:^|[^A-Z0-9])(?:N|P|PISO|NIVEL)\s*0?(\d{1,2})(?![0-9])/);
  if(pm){const k=+pm[1];const p=pisos().find(x=>{const c=plUp(x.code).match(/(\d+)$/);return c&&+c[1]===k&&!/^S/.test(plUp(x.code))});if(p)pisoId=p.id}
  let cod='';for(let i=toks.length-1;i>=0;i--){const t=plUp(toks[i]).replace(/[^A-Z0-9-]/g,'');if(/^[A-Z]{1,3}-?\d{1,3}[A-Z]?$/.test(t)&&!/^(N|P)\d{1,2}$/.test(t)){cod=t;break}}
  const tit=toks.filter(t=>!/^\d[\d-]*$/.test(t)&&plUp(t)!==cod&&!/^ETO\d*$/i.test(t)&&!/^(N|P)\d{1,2}$/i.test(t)&&t!=='-').join(' ').replace(/\s+-\s*$/,'').trim();
  return{eto:true,sc:PQ.sc||'',cod,pisoId,tit:tit||n}}
function renderPCar(main){plSub();if(PQ.eto&&!plAdm())PQ.eto=false;if(!plaEd()){main.innerHTML='<div class="scroll"><div class="wrap"><p class="note">Solo el administrador y los editores cargan planos.</p></div></div>';return}
  const eo=!!PQ.eto,bk='pcar'+(eo?'e':'');
  if(main.dataset.built!==bk){main.dataset.built=bk;
    const seg=plAdm()?`<div class="seg plsrc" role="tablist" aria-label="Qué cargar"><button type="button" data-src=""${eo?'':' class="on"'}>Planos del proyecto</button><button type="button" data-src="eto"${eo?' class="on"':''}>ETO de subcontratistas</button></div>`:'';
    main.innerHTML=`<div class="scroll"><div class="wrap plw">${eo?pageHead('Cargar ETO','Planos de taller <b>aprobados</b> de los subcontratistas. Elige el SC, arrastra los PDF (los formatos varían: revisa piso, código y título en la tabla) y pulsa <b>Procesar</b>. Los SC solo ven los de su partida.'):pageHead('Cargar planos','Arrastra los PDF (uno por lámina). El sistema lee el código, la especialidad y el piso del nombre del archivo y del rótulo; revisa la tabla y pulsa <b>Procesar</b>.')}
      ${seg}${eo?'':helpBox('Cómo exportar los PDF desde AutoCAD',`<ul><li>Impresora <b>DWG To PDF.pc3</b>, papel del tamaño real de la lámina (p. ej. 1200 × 900 mm), <b>Extensión</b>, <b>Ajustar al papel</b>, centrado, con el CTB del proyecto.</li><li>Una lámina por archivo y con el mismo nombre del DWG (el «-Model» que agrega AutoCAD se quita solo).</li><li>Si subes otra vez una lámina con el mismo código, queda como <b>nueva revisión</b> y la anterior se guarda en el historial.</li><li>El proceso corre en esta PC (unos 20–60 s por lámina): usa una PC con Chrome o Edge y deja la pestaña <b>visible</b> hasta que termine (minimizada o tapada, el navegador la frena). Puedes trabajar en otra pantalla o dejar esta ventana a un lado. El avance se ve en el título de la pestaña.</li><li>En Edge: Configuración › Sistema y rendimiento › «No suspender nunca estos sitios» → agrega la dirección de LPS 911.</li></ul>`)}
      ${eo?`<div class="plbar"><label class="plchk">Subcontratista <select class="tin" id="etosc"><option value="">— Elige el SC —</option>${[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<option value="${esc(c.id)}"${c.id===PQ.sc?' selected':''}>${esc(c.name)}</option>`).join('')}</select></label><span class="note">Se aplica a los PDF que agregues y a los pendientes de la lista.</span></div>`:''}
      <label class="pldrop" id="pldrop"><input type="file" id="plfile" accept="application/pdf,.pdf" multiple hidden><b>Arrastra aquí los PDF</b><span>o toca para elegirlos (puedes elegir muchos a la vez)</span></label>
      <div id="plqbar" class="plbar"></div><div id="plqtab"></div>${eo?'':plkpSecHtml()}</div></div>`;
    if(!eo)plkpSecBind(main);
    const sw=$('.plsrc',main);if(sw)sw.onclick=e=>{const b=e.target.closest('[data-src]');if(!b||PQ.run)return;const v=b.dataset.src==='eto';if(v===!!PQ.eto)return;
      if(PQ.items.some(x=>x.st!=='ok'&&x.st!=='skip')){toast('Primero procesa o vacía la lista actual.');return}PQ.items=[];PQ.eto=v;renderPCar(main)};
    const es=$('#etosc',main);if(es)es.onchange=()=>{PQ.sc=es.value;PQ.items.forEach(x=>{if(x.m.eto&&(x.st==='pend'||x.st==='bad'))x.m.sc=PQ.sc});plqCheck();plqDraw(true)};
    const inp=$('#plfile',main),dz=$('#pldrop',main);inp.onchange=()=>{plAdd([...inp.files]);inp.value=''};
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('on')});dz.addEventListener('dragleave',()=>dz.classList.remove('on'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('on');plAdd([...e.dataTransfer.files])});
    $('#plqbar',main).onchange=e=>{if(e.target.dataset.q==='crop')store.set('plcrop',e.target.checked);if(e.target.dataset.q==='fresh')PQ.fresh=e.target.checked};
    $('#plqbar',main).onclick=e=>{const b=e.target.closest('[data-q]');if(!b||b.tagName==='INPUT')return;const a=b.dataset.q;
      if(a==='go')plRun();else if(a==='stop'){PQ.stop=true;toast('Se detendrá al terminar la lámina en curso.')}else if(a==='clr'){PQ.items=PQ.items.filter(x=>x.st==='run');plqDraw(true)}
      else if(a==='clrok'){PQ.items=PQ.items.filter(x=>x.st!=='ok'&&x.st!=='skip');plqDraw(true)}};
    $('#plqtab',main).addEventListener('change',e=>{const el=e.target.closest('[data-f]');if(!el)return;const it=PQ.items[+el.closest('[data-i]').dataset.i];if(!it||it.st==='run'||it.st==='ok')return;
      it.m[el.dataset.f]=el.value.trim();if(el.dataset.f==='cod')it.m.cod=it.m.cod.toUpperCase().replace(/\s+/g,'');plqCheck();plqDraw(true)});
    $('#plqtab',main).addEventListener('click',e=>{const v=e.target.closest('[data-vw]');if(v){plqPrev(+v.dataset.vw);return}
      const ro=e.target.closest('[data-rot]');if(ro){plqRot(+ro.dataset.rot,1);return}const b=e.target.closest('[data-rm]');if(!b)return;const i=+b.dataset.rm;if(PQ.items[i]&&PQ.items[i].st!=='run'){PQ.items.splice(i,1);plqCheck();plqDraw(true)}})}
  plqDraw(false);if(!eo)plkpSecUpd()}
/* PDF de varias hojas (oct 2026, pedido del dueño): un ETO se divide en una lámina por hoja (código «M02-1», «M02-2»…, título
   «· hoja k de n»); cada hoja se extrae a su propio PDF al procesar (plOnePage). En los planos del proyecto (una lámina por archivo)
   solo se avisa que se cargará la primera hoja. */
async function plAdd(files){const pdfs=files.filter(f=>/\.pdf$/i.test(f.name)||f.type==='application/pdf');const no=files.length-pdfs.length;
  const have=new Set(PQ.items.map(x=>x.file.name+'|'+x.file.size));let n=0,split=0;const eto=!!PQ.eto;
  const nw=pdfs.filter(f=>!have.has(f.name+'|'+f.size));if(nw.length>3)toast(`Leyendo ${nw.length} PDF…`);
  for(const f of nw){const pgs=await plPages(f);
    if(eto&&pgs>1){const m0=etoParse(f.name);split++;
      for(let k=1;k<=pgs;k++){PQ.items.push({file:f,pg:k,pgs,q:0,m:{...m0,cod:m0.cod?`${m0.cod}-${k}`:'',tit:`${m0.tit} · hoja ${k} de ${pgs}`},st:'pend',msg:''});n++}}
    else{PQ.items.push({file:f,pg:1,pgs:1,pdfPgs:pgs,q:0,m:eto?etoParse(f.name):plParse(f.name),st:'pend',msg:''});n++}}
  plqCheck();plqDraw(true);if(no)toast(`${no} archivo(s) no son PDF y se omitieron.`);
  else if(n)toast(split?`${n} lámina(s) agregadas: ${split} PDF de varias hojas se dividieron en una lámina por hoja.`:`${n} plano(s) agregados a la lista.`)}
/** estado de cada fila antes de procesar: nuevo, nueva revisión, ya cargado (mismo archivo) o falta un dato */
function plqCheck(){const seen=new Map();
  PQ.items.forEach((it,i)=>{if(it.st==='run'||it.st==='ok'||it.st==='err')return;const m=it.m;it.warn='';
    if(m.eto){if(!m.sc){it.st='bad';it.msg='Falta el subcontratista';return}}
    else if(!m.cod||!m.disc){it.st='bad';it.msg=!m.cod?'Falta el código de lámina':'Falta la especialidad';return}
    const id=plIdOf({...m,fname:plItKey(it)});const old=PLB.get(id);
    if(!it.q&&old&&!old.arch&&old.fname===plItName(it)&&old.fsize===it.file.size){it.st='skip';it.msg='Ya está cargado (mismo archivo)';return}
    it.st='pend';it.msg=old?`Nueva revisión (vigente: rev. ${old.rev||1})`:'Nuevo';
    if(seen.has(id))it.warn=`Mismo código que la fila ${seen.get(id)+1}: se cargará como la revisión siguiente.`;else seen.set(id,i);
    if(!m.eto&&it.pdfPgs>1)it.warn=(it.warn?it.warn+' ':'')+`El PDF tiene ${it.pdfPgs} hojas: solo se carga la primera (exporta una lámina por archivo).`;
    if(!m.eto&&!m.pisoId&&m.tipo==='Planta')it.warn=(it.warn?it.warn+' ':'')+'Planta sin piso: elige el piso si corresponde.'})}
let plqT=0;
function plqDraw(force){const bar=$('#plqbar'),tab=$('#plqtab');if(!bar||!tab)return;
  const I=PQ.items,cnt=k=>I.filter(x=>x.st===k).length;const pend=cnt('pend'),ok=cnt('ok'),err=cnt('err'),bad=cnt('bad'),skip=cnt('skip');
  const avg=PQ.secs.length?PQ.secs.reduce((a,b)=>a+b,0)/PQ.secs.length:45;const left=pend+(PQ.run?1:0);
  shx(bar,!I.length?'':`${PQ.run?`<button class="ib" data-q="stop">Detener</button>`:`<button class="ib pri" data-q="go"${pend?'':' disabled'}>Procesar ${pend} plano${pend===1?'':'s'}</button>`}
    ${PQ.run?'<span class="plbusy">⏳ Procesando en esta PC: deja esta pestaña <b>visible</b> (no la minimices ni la tapes con otra ventana). Si quedó oculta, sigue al volver.</span>':''}<span class="plcnt">${[ok?`✓ ${ok} listos`:'',err?`✕ ${err} con error`:'',bad?`${bad} por completar`:'',skip?`${skip} ya cargados`:''].filter(Boolean).join(' · ')}${PQ.run&&left?` · faltan ~${Math.max(1,Math.round(left*avg/60))} min`:''}</span>
    ${!PQ.run?`<label class="plcrop" title="Quita lo que está fuera del marco de la lámina (texto «FORMATO…», objetos invisibles que la achican)"><input type="checkbox" data-q="crop"${store.get('plcrop',true)!==false?' checked':''}> Recortar al marco</label>${me&&me.role==='admin'&&!PQ.eto?`<label class="plcrop" title="Para reemplazar cargas de prueba: las láminas que ya existen quedan como Rev. 1, sin su historial, vínculos ni calibración"><input type="checkbox" data-q="fresh"${PQ.fresh?' checked':''}> Empezar en Rev. 1</label>`:''}<button class="ib" data-q="clrok"${ok+skip?'':' disabled'}>Quitar los listos</button><button class="ib" data-q="clr">Vaciar lista</button>`:''}`);
  if(!force&&tab.dataset.n===String(I.length)&&PQ.run)return;
  clearTimeout(plqT);plqT=setTimeout(()=>plqTable(tab),force?0:200)}
function plqTable(tab){const I=PQ.items;tab.dataset.n=String(I.length);
  if(!I.length){shx(tab,'');return}
  const dsel=v=>`<option value="">—</option>`+PL_DISC.map(d=>`<option value="${d[0]}"${d[0]===v?' selected':''}>${esc(d[1])}</option>`).join('');
  const psel=v=>`<option value="">General</option>`+pisos().map(p=>`<option value="${p.id}"${p.id===v?' selected':''}>${esc(p.code)}</option>`).join('');
  const tsel=v=>PL_TIPOS.map(t=>`<option${t===v?' selected':''}>${t}</option>`).join('');
  const ST={pend:'',run:'run',ok:'ok',err:'err',bad:'bad',skip:'skip'};
  const csel=v=>`<option value="">—</option>`+[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>`<option value="${esc(c.id)}"${c.id===v?' selected':''}>${esc(c.name)}</option>`).join('');
  const eo=I.some(x=>x.m.eto);
  const fn=it=>`<td class="plfn" title="${esc(it.file.name)}">${esc(it.file.name)}${(it.pgs||1)>1?` <b class="plhoja">hoja ${it.pg} de ${it.pgs}</b>`:''}<small>${(it.file.size/1048576).toFixed(1)} MB</small></td>`;
  /* ⟳ gira la lámina 90° a la derecha antes de subirla (cada toque suma un cuarto de vuelta) */
  const rb=(it,i,lock)=>`<button class="ib${it.q?' on':''}" data-rot="${i}" aria-label="Girar 90° a la derecha" title="Girar la lámina 90° a la derecha antes de subirla"${lock?' disabled':''}>⟳${it.q?` ${it.q*90}°`:''}</button>`;
  const rows=I.map((it,i)=>{const m=it.m,lock=it.st==='run'||it.st==='ok';const dis=lock?' disabled':'';
    if(m.eto)return`<tr data-i="${i}" class="${ST[it.st]||''}">${fn(it)}
      <td><select class="tin" data-f="sc"${dis}>${csel(m.sc)}</select></td><td><input class="tin mono" data-f="cod" value="${esc(m.cod)}" size="7"${dis}></td>
      <td><select class="tin" data-f="pisoId"${dis}>${psel(m.pisoId)}</select></td><td><input class="tin" data-f="tit" value="${esc(m.tit)}"${dis}></td>
      <td class="plst" id="plst${i}">${esc(it.msg)}${it.warn?`<small class="plwarn">${esc(it.warn)}</small>`:''}</td>
      <td class="plra"><button class="ib" data-vw="${i}" aria-label="Ver la lámina" title="Ver la lámina para completar los datos">👁</button>${rb(it,i,lock)}${lock?'':`<button class="ib" data-rm="${i}" aria-label="Quitar de la lista" title="Quitar">✕</button>`}</td></tr>`;
    return`<tr data-i="${i}" class="${ST[it.st]||''}">${fn(it)}
      <td><input class="tin mono" data-f="cod" value="${esc(m.cod)}" size="7"${dis}></td><td><select class="tin" data-f="disc"${dis}>${dsel(m.disc)}</select></td>
      <td><select class="tin" data-f="pisoId"${dis}>${psel(m.pisoId)}</select></td><td><select class="tin" data-f="tipo"${dis}>${tsel(m.tipo)}</select></td>
      <td><input class="tin" data-f="tit" value="${esc(m.tit)}"${dis}></td>
      <td class="plst" id="plst${i}">${esc(it.msg)}${it.warn?`<small class="plwarn">${esc(it.warn)}</small>`:''}</td>
      <td class="plra"><button class="ib" data-vw="${i}" aria-label="Ver la lámina" title="Ver la lámina para completar los datos">👁</button>${rb(it,i,lock)}${lock?'':`<button class="ib" data-rm="${i}" aria-label="Quitar de la lista" title="Quitar">✕</button>`}</td></tr>`}).join('');
  const hd=eo?'<th>Archivo</th><th>Subcontratista</th><th>Código</th><th>Piso</th><th>Título</th><th>Estado</th><th></th>':'<th>Archivo</th><th>Código</th><th>Especialidad</th><th>Piso</th><th>Tipo</th><th>Título</th><th>Estado</th><th></th>';
  shx(tab,`<div class="pltw"><table class="plt"><thead><tr>${hd}</tr></thead><tbody>${rows}</tbody></table></div>`)}
/* ---------- Vista previa en la carga (oct 2026, pedido del dueño) ----------
   👁 en cada fila: la lámina se dibuja desde el PDF en esta PC (sin subir nada) con zoom y desplazamiento, y al lado los datos de
   esa fila para llenarlos mirando el rótulo. ‹ › guardan y pasan a la otra fila conservando zona y zoom (los rótulos de un mismo
   SC o especialidad suelen estar en el mismo sitio). */
const PLP={i:-1,box:null,v:null,cv:null,tok:0};
const PLP_PX=4200;   /* lado mayor del dibujo de la vista previa: se lee el rótulo sin cargar la PC */
async function plqPrevPage(it){const q=it.q||0;if(it._pv&&it._pvq===q)return it._pv;if(it._pv){it._pv.width=it._pv.height=0;delete it._pv}await plPdfJs();const buf=await it.file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise;const pg=await pdf.getPage(it.pg||1);const rot=(pg.rotate+90*q)%360;const v1=pg.getViewport({scale:1,rotation:rot});
  const sc=PLP_PX/Math.max(v1.width,v1.height);const vp=pg.getViewport({scale:sc,rotation:rot});it._pvq=q;const c=plCanvas(Math.floor(vp.width),Math.floor(vp.height));const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:g,viewport:vp}).promise;try{pdf.destroy()}catch(e){}
  it._pv=c;return c}
/** girar una fila de la carga d cuartos de vuelta (1 = derecha, 3 = izquierda); la vista previa se redibuja girada */
function plqRot(i,d){const it=PQ.items[i];if(!it||it.st==='run'||it.st==='ok')return;it.q=((it.q||0)+d)%4;plqCheck();plqDraw(true);
  if(PLP.box&&PLP.i===i){PLP.v=null;plqPrevDraw()}}
function plqPrev(i){const it=PQ.items[i];if(!it)return;PLP.i=i;
  if(!PLP.box){const b=document.createElement('div');b.className='plv plpv';b.setAttribute('role','dialog');b.setAttribute('aria-modal','true');b.tabIndex=-1;
    b.innerHTML=`<div class="plvh"><button class="ib" data-pp="prev" aria-label="Fila anterior">‹</button><div class="plvt"><b class="plpn"></b><small class="plpc"></small></div><button class="ib" data-pp="next" aria-label="Fila siguiente">›</button><span class="plvsp"></span>
      <button class="ib" data-pp="rl" aria-label="Girar a la izquierda" title="Girar 90° a la izquierda">⟲</button><button class="ib" data-pp="rr" aria-label="Girar a la derecha" title="Girar 90° a la derecha">⟳</button>
      <button class="ib" data-pp="zout" aria-label="Alejar">−</button><button class="ib" data-pp="fit">Ajustar</button><button class="ib" data-pp="zin" aria-label="Acercar">+</button><button class="ib" data-pp="x" aria-label="Cerrar">✕</button></div>
      <div class="plpb"><div class="plpvw"><div class="plpst"></div><p class="plpld">Dibujando la lámina…</p></div><form class="plpf" autocomplete="off"></form></div>`;
    document.body.appendChild(b);PLP.box=b;
    b.onclick=e=>{const k=e.target.closest('[data-pp]');if(!k)return;const a=k.dataset.pp;
      if(a==='x')plqPrevClose();else if(a==='prev')plqPrevGo(-1);else if(a==='next')plqPrevGo(1);else if(a==='fit')plqFit();else if(a==='rr')plqRot(PLP.i,1);else if(a==='rl')plqRot(PLP.i,3);else if(a==='zin')plqZoom(1.5);else if(a==='zout')plqZoom(1/1.5)};
    b.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();plqPrevClose();return}
      if(e.target.closest('input,select,textarea')){if(e.key==='Enter'){e.preventDefault();plqPrevGo(1)}return}
      if(e.key==='ArrowRight')plqPrevGo(1);else if(e.key==='ArrowLeft')plqPrevGo(-1);else if(e.key==='+'||e.key==='=')plqZoom(1.5);else if(e.key==='-')plqZoom(1/1.5);else if(e.key==='0')plqFit()});
    b.querySelector('.plpf').addEventListener('input',e=>{const el=e.target.closest('[data-f]');const t=PQ.items[PLP.i];if(!el||!t||t.st==='run'||t.st==='ok')return;
      t.m[el.dataset.f]=el.dataset.f==='cod'?el.value.trim().toUpperCase().replace(/\s+/g,''):el.value.trim();if(e.type==='input'&&el.tagName==='INPUT')return;plqSync()});
    b.querySelector('.plpf').addEventListener('change',()=>plqSync());
    plqPan(b.querySelector('.plpvw'));b.focus()}
  plqPrevDraw()}
function plqSync(){plqCheck();plqDraw(true);const t=PQ.items[PLP.i];if(t&&PLP.box)stx(PLP.box.querySelector('.plpc'),plqPrevSub(t))}
const plqPrevSub=t=>`Fila ${PLP.i+1} de ${PQ.items.length} · ${t.msg||''}${t.warn?' · '+t.warn:''}`;
function plqPrevForm(it){const m=it.m,dis=it.st==='run'||it.st==='ok'?' disabled':'';
  const o=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`;
  const piso=`<label>Piso<select class="tin" data-f="pisoId"${dis}>${o('','General (sin piso)',m.pisoId)}${pisos().map(p=>o(p.id,p.code+' · '+p.name,m.pisoId)).join('')}</select></label>`;
  const cod=`<label>Código<input class="tin mono" data-f="cod" value="${esc(m.cod||'')}"${dis}></label>`,tit=`<label>Título<textarea class="tin" data-f="tit" rows="3"${dis}>${esc(m.tit||'')}</textarea></label>`;
  if(m.eto)return`<label>Subcontratista<select class="tin" data-f="sc"${dis}>${o('','—',m.sc)}${[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')).map(c=>o(c.id,c.name,m.sc)).join('')}</select></label>${cod}${piso}${tit}`;
  return`${cod}<label>Especialidad<select class="tin" data-f="disc"${dis}>${o('','—',m.disc)}${PL_DISC.map(d=>o(d[0],d[1],m.disc)).join('')}</select></label>${piso}<label>Tipo<select class="tin" data-f="tipo"${dis}>${PL_TIPOS.map(t=>o(t,t,m.tipo)).join('')}</select></label>${tit}`}
async function plqPrevDraw(){const it=PQ.items[PLP.i];if(!it||!PLP.box)return;const b=PLP.box,tok=++PLP.tok;
  stx(b.querySelector('.plpn'),it.file.name+((it.pgs||1)>1?` · hoja ${it.pg} de ${it.pgs}`:'')+(it.q?` · girada ${it.q*90}°`:''));stx(b.querySelector('.plpc'),plqPrevSub(it));
  b.querySelector('[data-pp="prev"]').disabled=PLP.i<=0;b.querySelector('[data-pp="next"]').disabled=PLP.i>=PQ.items.length-1;
  b.querySelector('.plpf').innerHTML=plqPrevForm(it)+'<p class="note">Enter o › guarda y pasa a la siguiente. La lámina se dibuja en esta PC; no se sube nada hasta «Procesar».</p>';
  const st=b.querySelector('.plpst'),ld=b.querySelector('.plpld');ld.hidden=false;ld.textContent='Dibujando la lámina…';if(!it._pv){st.innerHTML='';PLP.cv=null}
  let c;try{c=await plqPrevPage(it)}catch(e){if(tok===PLP.tok)ld.textContent='No se pudo leer el PDF: '+(e.message||e);return}
  if(tok!==PLP.tok||!PLP.box)return;ld.hidden=true;st.innerHTML='';st.appendChild(c);PLP.cv=c;
  if(!PLP.v)plqFit();else plqApply();
  const f=b.querySelector('.plpf [data-f]:not([disabled])');if(f&&!plTablet())f.focus({preventScroll:true})}
/* vista en coordenadas normalizadas de la hoja (cx, cy) y k = zoom relativo a «ajustar»: se conserva al pasar de fila aunque cambie el tamaño */
function plqBase(){const w=PLP.box.querySelector('.plpvw'),c=PLP.cv;return{w,c,fit:Math.min(w.clientWidth/c.width,w.clientHeight/c.height)||1}}
function plqApply(){if(!PLP.cv||!PLP.box)return;const{w,c,fit}=plqBase(),v=PLP.v,s=fit*v.k;
  const x=w.clientWidth/2-v.cx*c.width*s,y=w.clientHeight/2-v.cy*c.height*s;const st=PLP.box.querySelector('.plpst');
  st.style.transform=`translate(${x}px,${y}px) scale(${s})`}
function plqFit(){PLP.v={cx:.5,cy:.5,k:1};plqApply()}
function plqZoom(f,px,py){if(!PLP.cv)return;const{w,c,fit}=plqBase(),v=PLP.v;const r=w.getBoundingClientRect();px=px==null?w.clientWidth/2:px-r.left;py=py==null?w.clientHeight/2:py-r.top;
  const s0=fit*v.k,k=Math.max(0.5,Math.min(40,v.k*f)),s1=fit*k;
  const ux=v.cx+(px-w.clientWidth/2)/(c.width*s0),uy=v.cy+(py-w.clientHeight/2)/(c.height*s0);/* punto bajo el cursor: queda fijo */
  v.cx=ux-(px-w.clientWidth/2)/(c.width*s1);v.cy=uy-(py-w.clientHeight/2)/(c.height*s1);v.k=k;plqApply()}
function plqPan(w){const P=new Map();let d0=0,k0=1;
  w.addEventListener('wheel',e=>{e.preventDefault();plqZoom(Math.exp(-e.deltaY*0.0018),e.clientX,e.clientY)},{passive:false});
  w.addEventListener('dblclick',e=>plqZoom(2,e.clientX,e.clientY));
  w.addEventListener('pointerdown',e=>{if(!PLP.cv)return;w.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(P.size===2){const[a,b]=[...P.values()];d0=Math.hypot(a.x-b.x,a.y-b.y);k0=PLP.v.k}});
  w.addEventListener('pointermove',e=>{const p=P.get(e.pointerId);if(!p||!PLP.cv)return;
    if(P.size===1){const{c,fit}=plqBase(),s=fit*PLP.v.k;PLP.v.cx-=(e.clientX-p.x)/(c.width*s);PLP.v.cy-=(e.clientY-p.y)/(c.height*s);p.x=e.clientX;p.y=e.clientY;plqApply();return}
    p.x=e.clientX;p.y=e.clientY;const[a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(d0>0)plqZoom(k0*d/d0/PLP.v.k,(a.x+b.x)/2,(a.y+b.y)/2)});
  const up=e=>{P.delete(e.pointerId);if(P.size<2)d0=0};w.addEventListener('pointerup',up);w.addEventListener('pointercancel',up);
  addEventListener('resize',()=>{if(PLP.box)plqApply()})}
function plqPrevGo(d){const n=PLP.i+d;if(n<0||n>=PQ.items.length)return;plqSync();PLP.i=n;plqPrevDraw()}
function plqPrevClose(){if(!PLP.box)return;plqSync();PLP.box.remove();PLP.box=null;PLP.cv=null;PLP.i=-1;PQ.items.forEach(x=>{if(x._pv){x._pv.width=x._pv.height=0;delete x._pv}})}
function plRowSay(i,t){const c=document.getElementById('plst'+i);if(c)c.textContent=t;const it=PQ.items[i];if(it)it.msg=t}
const plUnload=e=>{e.preventDefault();e.returnValue=''};
async function plRun(){if(PQ.run)return;plqCheck();if(!PQ.items.some(x=>x.st==='pend'))return;
  if(PQ.fresh){const rep=PQ.items.filter(x=>x.st==='pend'&&PLB.has(plIdOf({...x.m,fname:plItKey(x)}))).map(x=>{const p=PLB.get(plIdOf({...x.m,fname:plItKey(x)}));return`${p.cod} · rev. ${p.rev||1}${p.revs&&p.revs.length?` (+${p.revs.length} anteriores)`:''}${plLkN(p)?` · ${plLkN(p)} vínculo${plLkN(p)===1?'':'s'}`:''}`});
    if(rep.length&&!await uiAsk({title:`¿Reemplazar ${rep.length} lámina${rep.length===1?'':'s'} y empezar en Rev. 1?`,text:'Quedarán como Rev. 1: se descarta su historial de revisiones, sus vínculos y su calibración (eran cargas de prueba). Los archivos anteriores no se borran.',list:rep.slice(0,12).concat(rep.length>12?[`… y ${rep.length-12} más`]:[]),ok:'Reemplazar',cancel:'Cancelar',tone:'warn'}))return}
  PQ.run=true;PQ.stop=false;window.addEventListener('beforeunload',plUnload);let wl=null;const wlGet=async()=>{try{if(navigator.wakeLock&&document.visibilityState==='visible')wl=await navigator.wakeLock.request('screen')}catch(e){}};await wlGet();
  /* la pantalla de bloqueo suelta el «mantener encendida»: se pide de nuevo al volver a la pestaña */
  const onVis=()=>{if(document.visibilityState==='visible'&&PQ.run)wlGet()};document.addEventListener('visibilitychange',onVis);
  const title0=document.title;const tot=PQ.items.filter(x=>x.st==='pend').length;let n=0;
  plqDraw(true);
  try{for(;;){if(PQ.stop)break;const i=PQ.items.findIndex(x=>x.st==='pend');if(i<0)break;const it=PQ.items[i];it.st='run';it.msg='Empezando…';n++;document.title=`(${n}/${tot}) Cargando planos · LPS 911`;plqDraw(true);
      try{it.crop=store.get('plcrop',true)!==false;it.fresh=!!PQ.fresh;const r=await plProcess(it,t=>plRowSay(i,t));it.st='ok';it.msg=`✓ Listo · rev. ${r.rev}${r.fresh?' (reemplazó a la de prueba)':''} · ${r.crop?`recortado al marco (${r.mm[0]} × ${r.mm[1]} mm)`:(it.crop===false?'hoja completa':'sin marco claro: hoja completa')} · ${r.files} archivos · ${r.secs} s`;PQ.secs.push(r.secs);if(PQ.secs.length>8)PQ.secs.shift()}
      catch(e){console.error('plano',it.file.name,e);it.st='err';it.msg='✕ '+(e.message||'Error al procesar');if(e.fatal){PQ.stop=true;toast(e.message)}}
      plqCheck();plqDraw(true)}}
  finally{PQ.run=false;document.title=title0;document.removeEventListener('visibilitychange',onVis);window.removeEventListener('beforeunload',plUnload);try{if(wl)wl.release()}catch(e){}plqDraw(true);
    const ok=PQ.items.filter(x=>x.st==='ok').length;if(ok)toast(`Carga terminada: ${ok} plano(s) listos en la biblioteca.`)}}

/* ---------- Sin conexión (solo tablet, decidido con el dueño oct 2026) ----------
   Baja todos los mosaicos de los planos elegidos a la caché del equipo (la misma de plGet, que siempre mira primero ahí:
   sin internet se ven completos). Lo guardado se anota por equipo en localStorage `lps911.ploff` {id:{rev,base,t,mb}};
   si el plano tiene una revisión nueva, la tarjeta dice «actualizar» y al guardarla se borra la revisión anterior. */
const plTablet=()=>{try{return matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)>=600}catch(e){return false}};
const PLOFF=Object.assign({},store.get('ploff',{}));
const plOffPut=()=>store.set('ploff',PLOFF);
const plOffSt=p=>{const o=PLOFF[p.id];return !o?'':o.rev===(p.rev||1)&&(!o.base||o.base===p.base)?'ok':'old'};   /* «Empezar en Rev. 1» repite el número: se compara también la carpeta */
const plOffTag=p=>{if(!plTablet())return'';const st=plOffSt(p);return st==='ok'?' · <b class="ploffok">✓ sin conexión</b>':st==='old'?' · <b class="plwarn">⟳ actualizar</b>':''};
const plMB=p=>p.sz?p.sz/1048576:7;
function plPaths(p){const T=p.T||PL_T,L=[p.base+'/th.webp',p.base+'/orig.pdf'];if(p.tx&&p.tx.n)L.push(plTxPath(p));   /* índice de texto: buscar sin conexión */   /* el PDF original: capa nítida sin conexión */for(let z=0;z<p.Z;z++){const k=2**z,nx=Math.ceil(Math.ceil(p.W/k)/T),ny=Math.ceil(Math.ceil(p.H/k)/T);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)L.push(`${p.base}/${z}/${x}_${y}.webp`)}return L}
/** borra de la caché de este equipo todo lo de una lámina (todas sus carpetas) */
async function plCacheDrop(id){try{const c=await caches.open(PLC_NAME);const a=location.origin+'/__plan/planos/'+id+'/',b=location.origin+'/__plan/planos/'+id+'.';
  for(const r of await c.keys())if(r.url.startsWith(a)||r.url.startsWith(b))await c.delete(r)}catch(e){}}
async function plOffDrop(base){try{const c=await caches.open(PLC_NAME);const pre=location.origin+'/__plan/'+base+'/';for(const r of await c.keys())if(r.url.startsWith(pre))await c.delete(r)}catch(e){}}
const PLOQ={run:false,stop:false};
function plOffBar(t,pct){let b=$('#ploffbar');if(t==null){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='ploffbar';b.className='swupd ploffbar';b.innerHTML='<span></span><i><em></em></i><button type="button" class="ib">Detener</button>';b.querySelector('button').onclick=()=>{PLOQ.stop=true};document.body.appendChild(b)}
  b.querySelector('span').textContent=t;b.querySelector('em').style.width=Math.round(pct*100)+'%'}
async function plOffSave(list){if(PLOQ.run){toast('Ya se están guardando planos.');return}
  list=list.filter(p=>p&&!p.arch&&plOffSt(p)!=='ok');if(!list.length){toast('Esos planos ya están guardados en esta tablet.');return}
  if(navigator.onLine===false){toast('Necesitas internet para guardarlos.');return}
  const need=list.reduce((a,p)=>a+plMB(p),0);
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist();const e=navigator.storage&&navigator.storage.estimate&&await navigator.storage.estimate();
    if(e&&e.quota&&(e.quota-e.usage)/1048576<need*1.2){toast(`No hay espacio suficiente en la tablet (se necesitan ~${Math.round(need)} MB).`);return}}catch(e){}
  PLOQ.run=true;PLOQ.stop=false;let ok=0,err=0;const tasks=list.map(p=>({p,paths:plPaths(p)}));const tot=tasks.reduce((a,t)=>a+t.paths.length,0);let done=0;
  try{for(const[i,t]of tasks.entries()){if(PLOQ.stop)break;const p=t.p;let fail=false;const q=[...t.paths];
      const worker=async()=>{while(q.length&&!PLOQ.stop){const path=q.shift();try{await plGet(path)}catch(e){fail=true}done++;plOffBar(`Guardando para sin conexión: plano ${i+1} de ${tasks.length} (${p.cod})`,done/tot)}};
      await Promise.all([1,2,3,4,5,6].map(worker));
      if(PLOQ.stop)break;if(fail){err++;continue}
      const old=PLOFF[p.id];if(old&&old.base!==p.base)plOffDrop(old.base);PLOFF[p.id]={rev:p.rev||1,base:p.base,t:NOW(),mb:+plMB(p).toFixed(1)};plOffPut();ok++}}
  finally{PLOQ.run=false;plOffBar(null);requestRender();if(PLV)plvDraw();
    toast(PLOQ.stop?`Detenido: ${ok} plano(s) guardados.`:err?`${ok} guardados; ${err} no se pudieron bajar (revisa la conexión y vuelve a intentar).`:`Listo: ${ok} plano(s) disponibles sin conexión en esta tablet.`)}}
async function plOffRemove(ids){for(const id of ids){const o=PLOFF[id];if(!o)continue;await plOffDrop(o.base);delete PLOFF[id]}plOffPut();requestRender();if(PLV)plvDraw()}
function plOffOne(p,btn){const st=plOffSt(p);
  if(st==='ok'){openPop(btn,`<div class="ph">Guardado en esta tablet</div><div class="ptx">${esc(p.cod)} se ve completo sin internet (~${Math.round(plMB(p))} MB).</div><button data-do="rm">Quitar de esta tablet</button>`,{rm:()=>plOffRemove([p.id]).then(()=>toast('Quitado de esta tablet'))});return}
  plOffSave([p])}
function plOffMenu(btn){const L=plFiltered(),act=plAct();const pend=L.filter(p=>plOffSt(p)!=='ok'),upd=act.filter(p=>plOffSt(p)==='old');
  const saved=Object.keys(PLOFF).filter(id=>PLB.has(id));const mb=saved.reduce((a,id)=>a+(PLOFF[id].mb||7),0);const need=pend.reduce((a,p)=>a+plMB(p),0);
  openPop(btn,`<div class="ph">Ver sin conexión (esta tablet)</div><div class="ptx">Guarda los planos completos en la tablet para verlos sin internet en obra. Usa los filtros (piso, especialidad) para elegir cuáles. Guardados ahora: <b>${saved.length}</b> (~${Math.round(mb)} MB).</div>
    ${pend.length?`<button data-do="sv">⤓ Guardar los ${pend.length} plano${pend.length===1?'':'s'} de la lista (~${Math.round(need)} MB)</button>`:'<div class="ptx">✓ Todos los planos de la lista ya están guardados.</div>'}
    ${upd.length?`<button data-do="up">⟳ Actualizar ${upd.length} con revisión nueva</button>`:''}
    ${saved.length?`<button data-do="rl">Quitar de la tablet los de esta lista</button><button data-do="ra">Quitar todos de esta tablet</button>`:''}`,
    {sv:()=>plOffSave(pend),up:()=>plOffSave(upd),rl:()=>plOffRemove(L.map(p=>p.id)).then(()=>toast('Quitados de esta tablet')),
     ra:async()=>{if(await uiAsk({title:'¿Quitar todos los planos de esta tablet?',text:'Se podrán volver a guardar cuando haya internet.',ok:'Quitar',tone:'warn'})){await plOffRemove(Object.keys(PLOFF));toast('Planos quitados de esta tablet')}}})}
