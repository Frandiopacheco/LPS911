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
const PL_PDFJS=window.PLANO_PDFJS||'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
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
const PLF=Object.assign({q:'',piso:'',disc:'',tipo:'',arch:false},store.get('plf',{}));PLF.q='';
const plfSave=()=>store.set('plf',{piso:PLF.piso,disc:PLF.disc,tipo:PLF.tipo});

/* ---------- datos ---------- */
function plSub(){if(plbUn||!me||!canPla())return;
  const open=()=>{plbUn=fcol('plb').onSnapshot(sn=>{PLB.clear();sn.docs.forEach(d=>PLB.set(d.id,{...d.data(),id:d.id}));plbReady=true;if(U.mod==='pla')requestRender()},
    err=>{plbUn=null;plbReady=true;console.error('plb',err);toast('No se pudo leer la lista de planos: '+(err.code||err.message));setTimeout(()=>{if(me&&canPla())open()},8000)})};
  open();unsubs.push(()=>{if(plbUn)plbUn();plbUn=null;PLB.clear();plbReady=false})}
const plAct=()=>[...PLB.values()].filter(p=>!p.arch);
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
async function plGet(path){const key=location.origin+'/__plan/'+path;let c=null;
  try{c=await caches.open(PLC_NAME);const hit=await c.match(key);if(hit)return await hit.blob()}catch(e){c=null}
  const r=await fetch(plApi()+'/o/'+encodeURIComponent(path)+'?alt=media',{headers:{Authorization:'Firebase '+await plTok()}});
  if(!r.ok)throw new Error(r.status===403||r.status===401?'Sin permiso para ver este plano.':r.status===404?'Archivo no encontrado en Storage.':'Storage respondió '+r.status);
  const b=await r.blob();if(c)try{await c.put(key,new Response(b,{headers:{'Content-Type':b.type||'application/octet-stream'}}))}catch(e){}return b}
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
const plIdOf=m=>((m.disc||'X')+'_'+(m.cod||('S'+plHash(m.fname||'')))).replace(/[^A-Za-z0-9_.-]/g,'');
function plHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return h.toString(36)}

/* ---------- lector de PDF ---------- */
let plPdfP=null;
function plPdfJs(){if(window.pdfjsLib)return Promise.resolve();if(plPdfP)return plPdfP;
  plPdfP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PL_PDFJS;s.onload=()=>{if(!window.pdfjsLib){plPdfP=null;ko(new Error('No se pudo cargar el lector de PDF.'));return}window.pdfjsLib.GlobalWorkerOptions.workerSrc=PL_PDFJS_W;ok()};
    s.onerror=()=>{plPdfP=null;ko(new Error('No se pudo cargar el lector de PDF. Revisa tu conexión.'))};document.head.appendChild(s)});return plPdfP}
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

/** procesa un PDF: dibuja en alta definición, corta mosaicos por niveles, sube todo y registra el plano */
async function plProcess(it,say){
  await plPdfJs();const t0=performance.now();
  say('Leyendo PDF…');const buf=await it.file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise;const pg=await pdf.getPage(1);
  try{const rot=plRotulo((await pg.getTextContent()).items||[]);it.rot=rot;
    if(!it.m.cod&&rot.cod)it.m.cod=rot.cod;if(!it.m.disc&&rot.disc)it.m.disc=rot.disc}catch(e){it.rot={cod:'',disc:''}}
  if(!it.m.cod)throw new Error('Sin código de lámina: escríbelo en la tabla.');if(!it.m.disc)throw new Error('Sin especialidad: elígela en la tabla.');
  const id=plIdOf({...it.m,fname:it.file.name});const old=PLB.get(id);const rev=old?(old.rev||1)+1:1;const base=`planos/${id}/r${rev}`;
  const v1=pg.getViewport({scale:1});const lp=Math.max(v1.width,v1.height);const px=Math.min(PL_MAXPX,Math.round(lp/72*PL_DPI));const vp=pg.getViewport({scale:px/lp});
  const W=Math.floor(vp.width),H=Math.floor(vp.height);let Z=1;while(Math.max(W,H)/2**(Z-1)>PL_T)Z++;
  const mm=[Math.round(v1.width/72*25.4),Math.round(v1.height/72*25.4)];
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
  if(full){const g=full.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);await pg.render({canvasContext:g,viewport:vp}).promise;
    await cut(full,0,0,0);if(Z>1)L=plHalf(full);full.width=full.height=0}
  else{/* franjas de 4 mosaicos de alto: el navegador no permite un lienzo tan grande */
    const SH=PL_T*4;if(Z>1)L=plCanvas(Math.ceil(W/2),Math.ceil(H/2));const lg=L&&L.getContext('2d');if(lg){lg.imageSmoothingQuality='high';lg.fillStyle='#fff';lg.fillRect(0,0,L.width,L.height)}
    for(let y0=0;y0<H;y0+=SH){const sh=Math.min(SH,H-y0);const c=plCanvas(W,sh);const g=c.getContext('2d');if(!g)throw new Error('La lámina es demasiado grande para este navegador.');
      g.fillStyle='#fff';g.fillRect(0,0,W,sh);say(`Dibujando franja ${Math.floor(y0/SH)+1} de ${Math.ceil(H/SH)}…`);
      await pg.render({canvasContext:g,viewport:vp,transform:[1,0,0,1,0,-y0]}).promise;await cut(c,0,0,y0);if(lg)lg.drawImage(c,0,y0/2,c.width/2,sh/2);c.width=c.height=0}}
  let thumbSrc=null;
  for(let z=1;z<Z;z++){await cut(L,z,0,0);if(!thumbSrc&&Math.max(L.width,L.height)<=2*PL_T)thumbSrc=L;
    if(z<Z-1){const n=plHalf(L);if(L!==thumbSrc)L.width=L.height=0;L=n}}
  /* miniatura (480 px de ancho) */
  {const s=thumbSrc||L;const tw=480,th=Math.max(1,Math.round(480*H/W));const c=plCanvas(tw,th);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,tw,th);g.imageSmoothingQuality='high';
    if(s&&s.width)g.drawImage(s,0,0,tw,th);await room();send(`${base}/th.webp`,await plBlob(c,0.8),'image/webp');c.width=c.height=0}
  if(L)L.width=L.height=0;if(thumbSrc)thumbSrc.width=thumbSrc.height=0;
  say('Subiendo el PDF original…');await room();send(`${base}/orig.pdf`,new Blob([buf],{type:'application/pdf'}),'application/pdf');
  while(pend.size)await Promise.race(pend);if(fail)throw fail;try{pdf.destroy()}catch(e){}
  /* recién con todo subido se registra el plano (así nunca aparece uno a medias) */
  const m=it.m;const prev=old?{rev:old.rev||1,base:old.base,W:old.W,H:old.H,Z:old.Z,mm:old.mm||null,fname:old.fname||'',ts:old.ts||0,byN:old.byN||''}:null;
  const doc={cod:m.cod,disc:m.disc,niv:m.niv||'',pisoId:m.pisoId||'',tipo:m.tipo||'Otro',tit:m.tit||'',eta:m.eta||'',fname:it.file.name.replace(/\.pdf$/i,''),fsize:it.file.size,
    rev,base,W,H,Z,T:PL_T,mm,sz:bytes,rot:{cod:(it.rot&&it.rot.cod)||'',ok:!!(it.rot&&it.rot.cod&&it.rot.cod===m.cod)},revs:[...((old&&old.revs)||[]),...(prev?[prev]:[])],
    by:me.email,byN:me.name||me.email,ts:NOW()};
  await fcol('plb').doc(id).set(doc);
  return{id,rev,secs:Math.round((performance.now()-t0)/1000),files:total}}

/* ---------- Biblioteca ---------- */
function plFiltered(){const q=plUp(PLF.q).trim();const words=q?q.split(/\s+/):[];
  return [...PLB.values()].filter(p=>(PLF.arch?!!p.arch:!p.arch)&&(!PLF.disc||p.disc===PLF.disc)&&(!PLF.tipo||p.tipo===PLF.tipo)
    &&(!PLF.piso||(PLF.piso==='-'?!p.pisoId:p.pisoId===PLF.piso))&&(!words.length||words.every(w=>plUp([p.cod,p.tit,p.fname,p.niv,PL_DN[p.disc]].join(' ')).includes(w))))
    .sort((a,b)=>PL_DISC.findIndex(d=>d[0]===a.disc)-PL_DISC.findIndex(d=>d[0]===b.disc)||plCodCmp(a,b))}
function renderPBib(main){plSub();
  if(main.dataset.built!=='pbib'){main.dataset.built='pbib';
    main.innerHTML=`<div class="scroll"><div class="wrap plw">${pageHead('Planos',`Todos los planos vigentes del proyecto. Toca uno para verlo en alta definición.`,plaEd()?'<button class="ib pri" id="plgocar">Cargar planos…</button>':'')}
      <div class="plbar"><input class="tin plq" id="plq" type="search" placeholder="Buscar: código, título, archivo…" autocomplete="off" aria-label="Buscar planos">
        <select class="tin" id="plfp" aria-label="Piso"></select><select class="tin" id="plfd" aria-label="Especialidad"></select><select class="tin" id="plft" aria-label="Tipo"></select>
        ${plaEd()?'<label class="plchk"><input type="checkbox" id="plfa"> Archivados</label>':''}${plTablet()?'<button class="ib" id="ploff" title="Guardar planos en esta tablet para verlos sin internet">⤓ Sin conexión</button>':''}<span class="plcnt" id="plcnt"></span></div>
      <div id="pllist"></div></div></div>`;
    $('#plq',main).oninput=e=>{PLF.q=e.target.value;plList(main)};
    const ch=(sel,k)=>{$(sel,main).onchange=e=>{PLF[k]=e.target.value;plfSave();plList(main)}};ch('#plfp','piso');ch('#plfd','disc');ch('#plft','tipo');
    const fa=$('#plfa',main);if(fa)fa.onchange=e=>{PLF.arch=e.target.checked;plList(main)};
    const gc=$('#plgocar',main);if(gc)gc.onclick=()=>goTab('pcar');
    const ob=$('#ploff',main);if(ob)ob.onclick=()=>plOffMenu(ob);
    $('#pllist',main).onclick=e=>{const b=e.target.closest('[data-pl]');if(b)plOpen(b.dataset.pl,plFiltered().map(p=>p.id))}}
  /* opciones de los filtros (cambian con los pisos y con los planos cargados) */
  const act=plAct();const ds=PL_DISC.filter(d=>act.some(p=>p.disc===d[0])||PLF.disc===d[0]);
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`;
  shx($('#plfp',main),opt('','Todos los pisos',PLF.piso)+pisos().map(p=>opt(p.id,p.code+' · '+p.name,PLF.piso)).join('')+opt('-','Generales (sin piso)',PLF.piso));
  shx($('#plfd',main),opt('','Todas las especialidades',PLF.disc)+ds.map(d=>opt(d[0],d[1],PLF.disc)).join(''));
  shx($('#plft',main),opt('','Todos los tipos',PLF.tipo)+PL_TIPOS.map(t=>opt(t,t,PLF.tipo)).join(''));
  plList(main)}
function plList(main){const host=$('#pllist',main);if(!host)return;
  if(!plbReady){shx(host,'<div class="loading"><b>Cargando planos…</b></div>');return}
  const L=plFiltered();stx($('#plcnt',main),L.length===1?'1 plano':L.length+' planos');
  if(!PLB.size){shx(host,`<div class="callout"><b>Aún no hay planos cargados.</b> ${plaEd()?'Usa <b>Cargar planos…</b> para subir los PDF del proyecto (puedes arrastrar muchos a la vez).':'Cuando el administrador los cargue, aparecerán aquí.'}</div>`);return}
  if(!L.length){shx(host,'<p class="note">Ningún plano coincide con los filtros.</p>');return}
  const g=new Map();L.forEach(p=>{if(!g.has(p.disc))g.set(p.disc,[]);g.get(p.disc).push(p)});
  const h=[...g].map(([d,ps])=>`<h3 class="plg">${esc(PL_DN[d]||d)} <span>${ps.length}</span></h3><div class="plgrid">${ps.map(p=>`<button type="button" class="plc" data-pl="${esc(p.id)}" title="${esc(p.fname||'')}">
      <span class="plth"><img data-th="${esc(p.base+'/th.webp')}" alt="" loading="lazy"></span>
      <span class="plci"><b class="mono">${esc(p.cod)}</b><span>${esc(p.tit||'Sin título')}</span><small>${esc([p.tipo,plPisoName(p.pisoId)||(p.niv?p.niv:'General'),'R'+(p.rev||1)].filter(Boolean).join(' · '))}${plOffTag(p)}</small></span></button>`).join('')}</div>`).join('');
  if(host.dataset.h!==h){host.innerHTML=h;host.dataset.h=h;plThumbs(host)}}
let plIO=null;
function plThumbs(host){if(plIO)plIO.disconnect();
  const load=img=>{const p=img.dataset.th;if(!p||img.dataset.ld)return;img.dataset.ld='1';plThumb(p).then(u=>{img.src=u;img.classList.add('ok')},()=>{img.dataset.ld='';img.closest('.plth').classList.add('err')})};
  if(!('IntersectionObserver' in window)){$$('img[data-th]',host).forEach(load);return}
  plIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){plIO.unobserve(e.target);load(e.target)}}),{rootMargin:'400px'});
  $$('img[data-th]',host).forEach(i=>plIO.observe(i))}

/* ---------- Visor de alta definición (mosaicos) ---------- */
function plTiles(host,spec){/* spec: {base,W,H,Z,T} — devuelve el visor */
  const V={s:1,x:0,y:0,imgs:new Map(),need:new Set(),raf:0,dead:false,fit:1};const T=spec.T||PL_T;
  host.innerHTML='';host.classList.add('plvc');
  const size=()=>[host.clientWidth||1,host.clientHeight||1];
  V.fitView=()=>{const[w,h]=size();V.fit=Math.min(w/spec.W,h/spec.H)*0.97;V.s=V.fit;V.x=(w-spec.W*V.s)/2;V.y=(h-spec.H*V.s)/2;V.draw()};
  V.zoomAt=(k,cx,cy)=>{const ns=Math.max(V.fit*0.5,Math.min(2/(window.devicePixelRatio||1)*1.5,V.s*k));const r=ns/V.s;V.x=cx-(cx-V.x)*r;V.y=cy-(cy-V.y)*r;V.s=ns;V.draw()};
  V.draw=()=>{if(V.raf)return;V.raf=requestAnimationFrame(()=>{V.raf=0;if(!V.dead)V.update()})};
  const coarse=Math.max(0,spec.Z-2);
  V.update=()=>{const[w,h]=size();const dpr=window.devicePixelRatio||1;
    const zd=Math.max(0,Math.min(spec.Z-1,Math.floor(Math.log2(1/(V.s*dpr)))));
    const need=new Set();const add=(z,vis)=>{const k=2**z,lw=Math.ceil(spec.W/k),lh=Math.ceil(spec.H/k),nx=Math.ceil(lw/T),ny=Math.ceil(lh/T);
      let x0=0,y0=0,x1=nx,y1=ny;if(vis){const wx0=-V.x/V.s,wy0=-V.y/V.s,wx1=wx0+w/V.s,wy1=wy0+h/V.s;x0=Math.max(0,Math.floor(wx0/(T*k)));y0=Math.max(0,Math.floor(wy0/(T*k)));x1=Math.min(nx,Math.ceil(wx1/(T*k)));y1=Math.min(ny,Math.ceil(wy1/(T*k)))}
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)need.add(z+'/'+x+'_'+y)};
    add(coarse,false);if(zd<coarse)add(zd,true);V.need=need;
    for(const k of need)if(!V.imgs.has(k)){const[z,xy]=k.split('/');const[x,y]=xy.split('_').map(Number);const zz=+z,f=2**zz;const lw=Math.ceil(spec.W/f),lh=Math.ceil(spec.H/f);
      const im=document.createElement('img');im.alt='';im.draggable=false;im.style.zIndex=String(10+spec.Z-zz);
      const e={im,z:zz,wx:x*T*f,wy:y*T*f,ww:Math.min(T,lw-x*T)*f,wh:Math.min(T,lh-y*T)*f,ok:false,url:''};V.imgs.set(k,e);host.appendChild(im);
      plGet(`${spec.base}/${k}.webp`).then(b=>{if(V.dead||!V.imgs.has(k))return;e.url=URL.createObjectURL(b);im.onload=()=>{e.ok=true;V.purge()};im.src=e.url},()=>{im.classList.add('err')})}
    for(const e of V.imgs.values())e.im.style.transform=`translate(${V.x+e.wx*V.s}px,${V.y+e.wy*V.s}px)`,e.im.style.width=e.ww*V.s+'px',e.im.style.height=e.wh*V.s+'px';
    V.purge()};
  /* quita lo que ya no hace falta, pero solo cuando lo nuevo ya cargó (así no parpadea al acercar o alejar) */
  V.purge=()=>{let ready=true;for(const k of V.need){const e=V.imgs.get(k);if(e&&!e.ok&&!e.im.classList.contains('err')){ready=false;break}}
    for(const[k,e]of V.imgs)if(!V.need.has(k)&&(ready||V.imgs.size>160)){e.im.remove();if(e.url)URL.revokeObjectURL(e.url);V.imgs.delete(k)}};
  /* gestos: rueda, arrastre, pellizco y doble toque */
  const P=new Map();let pinch=null,lastTap=0;
  host.addEventListener('wheel',e=>{e.preventDefault();const r=host.getBoundingClientRect();V.zoomAt(Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0016)),e.clientX-r.left,e.clientY-r.top)},{passive:false});
  host.addEventListener('pointerdown',e=>{host.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});host.classList.add('drag');
    if(P.size===2){const[a,b]=[...P.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}}
    const t=performance.now();if(P.size===1&&t-lastTap<300){const r=host.getBoundingClientRect();V.zoomAt(2,e.clientX-r.left,e.clientY-r.top);lastTap=0}else lastTap=t});
  host.addEventListener('pointermove',e=>{const p=P.get(e.pointerId);if(!p)return;const r=host.getBoundingClientRect();
    if(P.size===2&&pinch){p.x=e.clientX;p.y=e.clientY;const[a,b]=[...P.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch.d>0)V.zoomAt(d/pinch.d,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.d=d;return}
    V.x+=e.clientX-p.x;V.y+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;V.draw()});
  const end=e=>{P.delete(e.pointerId);if(P.size<2)pinch=null;if(!P.size)host.classList.remove('drag')};
  host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
  const ro=new ResizeObserver(()=>{if(V.s===V.fit)V.fitView();else V.draw()});ro.observe(host);
  V.destroy=()=>{V.dead=true;ro.disconnect();for(const e of V.imgs.values())if(e.url)URL.revokeObjectURL(e.url);V.imgs.clear();host.innerHTML=''};
  requestAnimationFrame(()=>V.fitView());return V}
let PLV=null;
function plOpen(id,list){const p=PLB.get(id);if(!p)return;plClose(true);
  const box=document.createElement('div');box.className='plv';box.id='plv';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.tabIndex=-1;
  PLV={id,list:list&&list.length?list:[id],box,rev:p.rev||1,tv:null,ret:document.activeElement};document.body.appendChild(box);plvDraw();box.focus();
  box.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;
    if(e.key==='Escape'){e.preventDefault();plClose()}else if(e.key==='ArrowRight'){plStep(1)}else if(e.key==='ArrowLeft'){plStep(-1)}
    else if(e.key==='+'||e.key==='='){plvZoom(1.5)}else if(e.key==='-'){plvZoom(1/1.5)}else if(e.key==='0'){PLV.tv&&PLV.tv.fitView()}})}
function plvZoom(k){if(!PLV||!PLV.tv)return;const c=PLV.box.querySelector('.plvc');PLV.tv.zoomAt(k,c.clientWidth/2,c.clientHeight/2)}
function plClose(silent){if(!PLV)return;if(PLV.tv)PLV.tv.destroy();PLV.box.remove();const r=PLV.ret;PLV=null;if(!silent&&r&&r.isConnected)try{r.focus()}catch(e){}}
function plStep(d){if(!PLV)return;const L=PLV.list.filter(i=>PLB.has(i));const i=L.indexOf(PLV.id);if(i<0||L.length<2)return;const n=L[(i+d+L.length)%L.length];PLV.id=n;PLV.rev=PLB.get(n).rev||1;plvDraw()}
function plSpecOf(p,rev){if(!rev||rev===(p.rev||1))return{base:p.base,W:p.W,H:p.H,Z:p.Z,T:p.T||PL_T,fname:p.fname,ts:p.ts,byN:p.byN,cur:true,rev:p.rev||1};
  const r=(p.revs||[]).find(x=>x.rev===rev);return r?{base:r.base,W:r.W,H:r.H,Z:r.Z,T:PL_T,fname:r.fname,ts:r.ts,byN:r.byN,cur:false,rev:r.rev}:plSpecOf(p,0)}
function plvDraw(){const p=PLB.get(PLV.id);if(!p){plClose();return}const sp=plSpecOf(p,PLV.rev);const L=PLV.list.filter(i=>PLB.has(i));const n=L.length,i=L.indexOf(PLV.id);
  const revs=[{rev:p.rev||1,cur:true},...(p.revs||[]).slice().reverse()];
  PLV.box.innerHTML=`<div class="plvh">
    <button class="ib" data-pv="prev" aria-label="Plano anterior"${n<2?' disabled':''}>‹</button>
    <div class="plvt"><b class="mono">${esc(p.cod)}</b> <span>${esc(p.tit||'')}</span><small>${esc([PL_DN[p.disc]||p.disc,p.tipo,plPisoName(p.pisoId)||p.niv||'General'].filter(Boolean).join(' · '))}${n>1?` · ${i+1} de ${n}`:''}</small></div>
    <button class="ib" data-pv="next" aria-label="Plano siguiente"${n<2?' disabled':''}>›</button>
    <span class="plvsp"></span>
    ${revs.length>1?`<select class="tin" data-pv="rev" aria-label="Revisión">${revs.map(r=>`<option value="${r.rev}"${r.rev===sp.rev?' selected':''}>Rev. ${r.rev}${r.cur?' (vigente)':''}</option>`).join('')}</select>`:`<span class="plvr">Rev. ${sp.rev}</span>`}
    <button class="ib" data-pv="zout" aria-label="Alejar">−</button><button class="ib" data-pv="fit" title="Ver la lámina entera (0)">Ajustar</button><button class="ib" data-pv="zin" aria-label="Acercar">+</button>
    <button class="ib" data-pv="pdf" title="Descargar el PDF original">PDF</button>
    ${plTablet()&&sp.cur?`<button class="ib${plOffSt(p)==='ok'?' on':''}" data-pv="off" title="Guardar este plano completo en la tablet para verlo sin internet">${plOffSt(p)==='ok'?'✓ Sin conexión':plOffSt(p)==='old'?'⟳ Actualizar':'⤓ Sin conexión'}</button>`:''}
    ${plaEd()?`<button class="ib" data-pv="edit" title="Corregir los datos o archivar">⋯</button>`:''}
    <button class="ib" data-pv="x" aria-label="Cerrar">✕</button></div>
    ${sp.cur?'':`<div class="plvold">Estás viendo la <b>revisión ${sp.rev}</b>, que ya no es la vigente (vigente: rev. ${p.rev||1}).</div>`}
    <div class="plvb"></div>
    <div class="plvf">${esc(sp.fname||'')}${sp.ts?' · cargado '+esc(ldt(sp.ts))+(sp.byN?' por '+esc(sp.byN):''):''}${p.rot&&p.rot.cod&&!p.rot.ok?` · <b class="plwarn">El rótulo dice ${esc(p.rot.cod)}</b>`:''}</div>`;
  if(PLV.tv)PLV.tv.destroy();PLV.tv=plTiles(PLV.box.querySelector('.plvb'),sp);
  PLV.box.onclick=async e=>{const b=e.target.closest('[data-pv]');if(!b||b.tagName==='SELECT')return;const a=b.dataset.pv;
    if(a==='x')plClose();else if(a==='prev')plStep(-1);else if(a==='next')plStep(1);else if(a==='fit')PLV.tv.fitView();else if(a==='zin')plvZoom(1.5);else if(a==='zout')plvZoom(1/1.5);
    else if(a==='pdf')plPdf(p,sp,b);else if(a==='off')plOffOne(p,b);else if(a==='edit')plEdit(p,b)};
  const rs=PLV.box.querySelector('select[data-pv="rev"]');if(rs)rs.onchange=e=>{PLV.rev=+e.target.value;plvDraw()}}
async function plPdf(p,sp,btn){btn.disabled=true;const t=btn.textContent;btn.textContent='Descargando…';
  try{const b=await plGet(sp.base+'/orig.pdf');const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=(sp.fname||p.cod)+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
  catch(e){toast('No se pudo descargar el PDF: '+e.message)}finally{btn.disabled=false;btn.textContent=t}}
function plEdit(p,btn){
  openPop(btn,`<div class="ph">${esc(p.cod)} · datos del plano</div><div class="plef">
    <label>Título<input class="tin" id="pleT" value="${esc(p.tit||'')}" maxlength="160"></label>
    <label>Piso<select class="tin" id="pleP"><option value="">General (sin piso)</option>${pisos().map(x=>`<option value="${x.id}"${x.id===p.pisoId?' selected':''}>${esc(x.code+' · '+x.name)}</option>`).join('')}</select></label>
    <label>Tipo<select class="tin" id="pleK">${PL_TIPOS.map(t=>`<option${t===p.tipo?' selected':''}>${t}</option>`).join('')}</select></label>
    <p class="note">El código y la especialidad identifican la lámina (las revisiones se reconocen por ellos); no se cambian aquí.</p>
    <div class="plea"><button class="ib pri" data-do="sv">Guardar</button>${p.arch?'<button class="ib" data-do="ua">Recuperar</button>':'<button class="ib" data-do="ar">Archivar</button>'}</div></div>`,
    {sv:async()=>{const d={tit:$('#pleT').value.trim(),pisoId:$('#pleP').value,tipo:$('#pleK').value};try{await fcol('plb').doc(p.id).update(d);toast('Datos del plano guardados')}catch(e){toast('No se pudo guardar: '+(e.code||e.message))}},
     ar:async()=>{if(!await uiAsk({title:'¿Archivar este plano?',text:`${p.cod} · ${p.tit||''} deja de verse en la biblioteca. Se puede recuperar desde «Archivados».`,ok:'Archivar',tone:'warn'}))return;
       try{await fcol('plb').doc(p.id).update({arch:{t:NOW(),by:me.email,n:me.name||me.email}});plClose();toast('Plano archivado')}catch(e){toast('No se pudo archivar: '+(e.code||e.message))}},
     ua:async()=>{try{await fcol('plb').doc(p.id).update({arch:firebase.firestore.FieldValue.delete()});toast('Plano recuperado')}catch(e){toast('No se pudo recuperar: '+(e.code||e.message))}}})}

/* ---------- Carga masiva ---------- */
const PQ={items:[],run:false,stop:false,t0:0,done:0,secs:[]};
function renderPCar(main){plSub();if(!plaEd()){main.innerHTML='<div class="scroll"><div class="wrap"><p class="note">Solo el administrador y los editores cargan planos.</p></div></div>';return}
  if(main.dataset.built!=='pcar'){main.dataset.built='pcar';
    main.innerHTML=`<div class="scroll"><div class="wrap plw">${pageHead('Cargar planos','Arrastra los PDF (uno por lámina). El sistema lee el código, la especialidad y el piso del nombre del archivo y del rótulo; revisa la tabla y pulsa <b>Procesar</b>.')}
      ${helpBox('Cómo exportar los PDF desde AutoCAD',`<ul><li>Impresora <b>DWG To PDF.pc3</b>, papel del tamaño real de la lámina (p. ej. 1200 × 900 mm), <b>Extensión</b>, <b>Ajustar al papel</b>, centrado, con el CTB del proyecto.</li><li>Una lámina por archivo y con el mismo nombre del DWG (el «-Model» que agrega AutoCAD se quita solo).</li><li>Si subes otra vez una lámina con el mismo código, queda como <b>nueva revisión</b> y la anterior se guarda en el historial.</li><li>El proceso corre en esta PC (unos 20–60 s por lámina): usa una PC con Chrome o Edge y deja la pestaña <b>visible</b> hasta que termine (minimizada o tapada, el navegador la frena). Puedes trabajar en otra pantalla o dejar esta ventana a un lado. El avance se ve en el título de la pestaña.</li><li>En Edge: Configuración › Sistema y rendimiento › «No suspender nunca estos sitios» → agrega la dirección de LPS 911.</li></ul>`)}
      <label class="pldrop" id="pldrop"><input type="file" id="plfile" accept="application/pdf,.pdf" multiple hidden><b>Arrastra aquí los PDF</b><span>o toca para elegirlos (puedes elegir muchos a la vez)</span></label>
      <div id="plqbar" class="plbar"></div><div id="plqtab"></div></div></div>`;
    const inp=$('#plfile',main),dz=$('#pldrop',main);inp.onchange=()=>{plAdd([...inp.files]);inp.value=''};
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('on')});dz.addEventListener('dragleave',()=>dz.classList.remove('on'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('on');plAdd([...e.dataTransfer.files])});
    $('#plqbar',main).onclick=e=>{const b=e.target.closest('[data-q]');if(!b)return;const a=b.dataset.q;
      if(a==='go')plRun();else if(a==='stop'){PQ.stop=true;toast('Se detendrá al terminar la lámina en curso.')}else if(a==='clr'){PQ.items=PQ.items.filter(x=>x.st==='run');plqDraw(true)}
      else if(a==='clrok'){PQ.items=PQ.items.filter(x=>x.st!=='ok'&&x.st!=='skip');plqDraw(true)}};
    $('#plqtab',main).addEventListener('change',e=>{const el=e.target.closest('[data-f]');if(!el)return;const it=PQ.items[+el.closest('[data-i]').dataset.i];if(!it||it.st==='run'||it.st==='ok')return;
      it.m[el.dataset.f]=el.value.trim();if(el.dataset.f==='cod')it.m.cod=it.m.cod.toUpperCase().replace(/\s+/g,'');plqCheck();plqDraw(true)});
    $('#plqtab',main).addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const i=+b.dataset.rm;if(PQ.items[i]&&PQ.items[i].st!=='run'){PQ.items.splice(i,1);plqCheck();plqDraw(true)}})}
  plqDraw(false)}
function plAdd(files){const pdfs=files.filter(f=>/\.pdf$/i.test(f.name)||f.type==='application/pdf');const no=files.length-pdfs.length;
  const have=new Set(PQ.items.map(x=>x.file.name+'|'+x.file.size));let n=0;
  for(const f of pdfs){if(have.has(f.name+'|'+f.size))continue;PQ.items.push({file:f,m:plParse(f.name),st:'pend',msg:''});n++}
  plqCheck();plqDraw(true);if(no)toast(`${no} archivo(s) no son PDF y se omitieron.`);else if(n)toast(`${n} plano(s) agregados a la lista.`)}
/** estado de cada fila antes de procesar: nuevo, nueva revisión, ya cargado (mismo archivo) o falta un dato */
function plqCheck(){const seen=new Map();
  PQ.items.forEach((it,i)=>{if(it.st==='run'||it.st==='ok'||it.st==='err')return;const m=it.m;it.warn='';
    if(!m.cod||!m.disc){it.st='bad';it.msg=!m.cod?'Falta el código de lámina':'Falta la especialidad';return}
    const id=plIdOf({...m,fname:it.file.name});const old=PLB.get(id);
    if(old&&!old.arch&&old.fname===it.file.name.replace(/\.pdf$/i,'')&&old.fsize===it.file.size){it.st='skip';it.msg='Ya está cargado (mismo archivo)';return}
    it.st='pend';it.msg=old?`Nueva revisión (vigente: rev. ${old.rev||1})`:'Nuevo';
    if(seen.has(id))it.warn=`Mismo código que la fila ${seen.get(id)+1}: se cargará como la revisión siguiente.`;else seen.set(id,i);
    if(!m.pisoId&&m.tipo==='Planta')it.warn=(it.warn?it.warn+' ':'')+'Planta sin piso: elige el piso si corresponde.'})}
let plqT=0;
function plqDraw(force){const bar=$('#plqbar'),tab=$('#plqtab');if(!bar||!tab)return;
  const I=PQ.items,cnt=k=>I.filter(x=>x.st===k).length;const pend=cnt('pend'),ok=cnt('ok'),err=cnt('err'),bad=cnt('bad'),skip=cnt('skip');
  const avg=PQ.secs.length?PQ.secs.reduce((a,b)=>a+b,0)/PQ.secs.length:45;const left=pend+(PQ.run?1:0);
  shx(bar,!I.length?'':`${PQ.run?`<button class="ib" data-q="stop">Detener</button>`:`<button class="ib pri" data-q="go"${pend?'':' disabled'}>Procesar ${pend} plano${pend===1?'':'s'}</button>`}
    ${PQ.run?'<span class="plbusy">⏳ Procesando en esta PC: deja esta pestaña <b>visible</b> (no la minimices ni la tapes con otra ventana). Si quedó oculta, sigue al volver.</span>':''}<span class="plcnt">${[ok?`✓ ${ok} listos`:'',err?`✕ ${err} con error`:'',bad?`${bad} por completar`:'',skip?`${skip} ya cargados`:''].filter(Boolean).join(' · ')}${PQ.run&&left?` · faltan ~${Math.max(1,Math.round(left*avg/60))} min`:''}</span>
    ${!PQ.run?`<button class="ib" data-q="clrok"${ok+skip?'':' disabled'}>Quitar los listos</button><button class="ib" data-q="clr">Vaciar lista</button>`:''}`);
  if(!force&&tab.dataset.n===String(I.length)&&PQ.run)return;
  clearTimeout(plqT);plqT=setTimeout(()=>plqTable(tab),force?0:200)}
function plqTable(tab){const I=PQ.items;tab.dataset.n=String(I.length);
  if(!I.length){shx(tab,'');return}
  const dsel=v=>`<option value="">—</option>`+PL_DISC.map(d=>`<option value="${d[0]}"${d[0]===v?' selected':''}>${esc(d[1])}</option>`).join('');
  const psel=v=>`<option value="">General</option>`+pisos().map(p=>`<option value="${p.id}"${p.id===v?' selected':''}>${esc(p.code)}</option>`).join('');
  const tsel=v=>PL_TIPOS.map(t=>`<option${t===v?' selected':''}>${t}</option>`).join('');
  const ST={pend:'',run:'run',ok:'ok',err:'err',bad:'bad',skip:'skip'};
  const rows=I.map((it,i)=>{const m=it.m,lock=it.st==='run'||it.st==='ok';const dis=lock?' disabled':'';
    return`<tr data-i="${i}" class="${ST[it.st]||''}"><td class="plfn" title="${esc(it.file.name)}">${esc(it.file.name)}<small>${(it.file.size/1048576).toFixed(1)} MB</small></td>
      <td><input class="tin mono" data-f="cod" value="${esc(m.cod)}" size="7"${dis}></td><td><select class="tin" data-f="disc"${dis}>${dsel(m.disc)}</select></td>
      <td><select class="tin" data-f="pisoId"${dis}>${psel(m.pisoId)}</select></td><td><select class="tin" data-f="tipo"${dis}>${tsel(m.tipo)}</select></td>
      <td><input class="tin" data-f="tit" value="${esc(m.tit)}"${dis}></td>
      <td class="plst" id="plst${i}">${esc(it.msg)}${it.warn?`<small class="plwarn">${esc(it.warn)}</small>`:''}</td>
      <td>${lock?'':`<button class="ib" data-rm="${i}" aria-label="Quitar de la lista" title="Quitar">✕</button>`}</td></tr>`}).join('');
  shx(tab,`<div class="pltw"><table class="plt"><thead><tr><th>Archivo</th><th>Código</th><th>Especialidad</th><th>Piso</th><th>Tipo</th><th>Título</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`)}
function plRowSay(i,t){const c=document.getElementById('plst'+i);if(c)c.textContent=t;const it=PQ.items[i];if(it)it.msg=t}
const plUnload=e=>{e.preventDefault();e.returnValue=''};
async function plRun(){if(PQ.run)return;plqCheck();if(!PQ.items.some(x=>x.st==='pend'))return;
  PQ.run=true;PQ.stop=false;window.addEventListener('beforeunload',plUnload);let wl=null;const wlGet=async()=>{try{if(navigator.wakeLock&&document.visibilityState==='visible')wl=await navigator.wakeLock.request('screen')}catch(e){}};await wlGet();
  /* la pantalla de bloqueo suelta el «mantener encendida»: se pide de nuevo al volver a la pestaña */
  const onVis=()=>{if(document.visibilityState==='visible'&&PQ.run)wlGet()};document.addEventListener('visibilitychange',onVis);
  const title0=document.title;const tot=PQ.items.filter(x=>x.st==='pend').length;let n=0;
  plqDraw(true);
  try{for(;;){if(PQ.stop)break;const i=PQ.items.findIndex(x=>x.st==='pend');if(i<0)break;const it=PQ.items[i];it.st='run';it.msg='Empezando…';n++;document.title=`(${n}/${tot}) Cargando planos · LPS 911`;plqDraw(true);
      try{const r=await plProcess(it,t=>plRowSay(i,t));it.st='ok';it.msg=`✓ Listo · rev. ${r.rev} · ${r.files} archivos · ${r.secs} s`;PQ.secs.push(r.secs);if(PQ.secs.length>8)PQ.secs.shift()}
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
const plOffSt=p=>{const o=PLOFF[p.id];return !o?'':o.rev===(p.rev||1)?'ok':'old'};
const plOffTag=p=>{if(!plTablet())return'';const st=plOffSt(p);return st==='ok'?' · <b class="ploffok">✓ sin conexión</b>':st==='old'?' · <b class="plwarn">⟳ actualizar</b>':''};
const plMB=p=>p.sz?p.sz/1048576:7;
function plPaths(p){const T=p.T||PL_T,L=[p.base+'/th.webp'];for(let z=0;z<p.Z;z++){const k=2**z,nx=Math.ceil(Math.ceil(p.W/k)/T),ny=Math.ceil(Math.ceil(p.H/k)/T);for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)L.push(`${p.base}/${z}/${x}_${y}.webp`)}return L}
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
