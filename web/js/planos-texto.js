"use strict";
/* LPS 911 · Planos › Buscar en el contenido (docs/ia/planos.md «Búsqueda en el texto de las láminas», oct 2026, pedido del dueño).
   - Índice: al cargar una lámina (plProcess) se leen los textos del PDF con pdf.js (getTextContent) y su caja en la hoja mostrada
     (recorte al marco incluido, coordenadas 0–10000). Se guarda en Storage junto a los mosaicos (`<base>/tx.json.gz`, o `tx.json`
     si el navegador no comprime) y el documento solo lleva `tx:{v,n,z}` (n = textos; 0 = la lámina no tiene texto buscable, p. ej.
     letras SHX exportadas como líneas o un ETO escaneado). El texto NO va en Firestore: la lista de planos seguiría igual de liviana.
   - Láminas cargadas antes: «🔤 Indexar texto» (biblioteca, modo Contenido) baja su orig.pdf sin guardarlo en la caché del equipo,
     arma el índice en esta PC y lo sube. Proyecto: admin, editores y OT; ETO: admin (los mismos permisos de Storage que al cargar).
   - Buscar: interruptor «Nombre / Contenido» en la biblioteca (proyecto y ETO) y en el panel ☰ Planos del visor. Sin tildes ni
     mayúsculas y sin signos ni espacios («v101» encuentra «V-101», «det 4» encuentra «DET. 4»). Los índices se bajan a medida que
     se busca (6 a la vez) y quedan en la caché `lps-planos` (las rutas nunca cambian); en memoria, los últimos PLTX_KEEP.
   - Visor: al abrir una lámina desde la búsqueda por contenido, las coincidencias se resaltan (gancho `V.hl` de plTiles) y la barra
     «🔍 … 1 de N ‹ ›» acerca a cada una. Solo en la revisión vigente (el índice es de esa revisión).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const PLTX_V=1,PLTX_K=1e4,PLTX_KEEP=120,PLTX_PAR=6;
/** texto compacto para comparar: sin tildes, mayúsculas, solo letras y números */
const plTxC=s=>plUp(s).replace(/[^A-Z0-9]/g,'');

/* ---------- índice de una página ---------- */
/** textos de la página con su caja normalizada a la hoja mostrada (crop en puntos del PDF a escala 1, origen arriba a la izquierda).
   Junta los trozos que pdf.js entrega separados en una misma línea (mismo ángulo y altura, seguidos): «DET.» + «4» → «DET. 4». */
async function plTxBuild(pg,crop){
  const v1=pg.getViewport({scale:1});const tc=await pg.getTextContent();const Ut=window.pdfjsLib.Util;
  const X0=crop?crop.x0:0,Y0=crop?crop.y0:0,W=crop?crop.x1-crop.x0:v1.width,H=crop?crop.y1-crop.y0:v1.height;
  const L=[];let p=null;
  for(const it of tc.items||[]){const s=String(it.str||'');if(!s.trim()){if(it.hasEOL)p=null;continue}
    const m=Ut.transform(v1.transform,it.transform);const fh=Math.hypot(m[2],m[3]);if(!(fh>0))continue;
    const a=Math.atan2(m[1],m[0]),ux=Math.cos(a),uy=Math.sin(a),vx=m[2]/fh,vy=m[3]/fh,len=Math.abs(+it.width||0)||fh*0.6*s.length;
    const q={s,x:m[4],y:m[5],a,ux,uy,vx,vy,fh,len};
    if(p&&Math.abs(q.a-p.a)<0.05&&q.fh/p.fh>0.8&&q.fh/p.fh<1.25){const ex=q.x-(p.x+p.ux*p.len),ey=q.y-(p.y+p.uy*p.len);
      const al=ex*p.ux+ey*p.uy,pe=ex*p.vx+ey*p.vy;
      if(Math.abs(pe)<0.3*p.fh&&al>-0.3*p.fh&&al<p.fh){p.s+=(al>0.15*p.fh&&!/\s$/.test(p.s)&&!/^\s/.test(q.s)?' ':'')+q.s;
        p.len=Math.max(p.len,(q.x+q.ux*q.len-p.x)*p.ux+(q.y+q.uy*q.len-p.y)*p.uy);if(it.hasEOL)p=null;continue}}
    L.push(q);p=it.hasEOL?null:q}
  const T=[];
  for(const q of L){const s=q.s.replace(/\s+/g,' ').trim();if(!s||!plTxC(s))continue;
    const xs=[q.x,q.x+q.ux*q.len,q.x+q.ux*q.len+q.vx*q.fh,q.x+q.vx*q.fh],ys=[q.y,q.y+q.uy*q.len,q.y+q.uy*q.len+q.vy*q.fh,q.y+q.vy*q.fh];
    const n=(v,o,d)=>Math.round((v-o)/d*PLTX_K);
    const x0=n(Math.min(...xs),X0,W),x1=n(Math.max(...xs),X0,W),y0=n(Math.min(...ys),Y0,H),y1=n(Math.max(...ys),Y0,H);
    if(x1<0||y1<0||x0>PLTX_K||y0>PLTX_K)continue;   /* fuera del marco (p. ej. «FORMATO 120 x 90»): no se ve en la lámina */
    T.push([s,Math.max(0,x0),Math.max(0,y0),Math.min(PLTX_K,x1),Math.min(PLTX_K,y1)])}
  return{v:PLTX_V,T}}
/** el índice listo para subir: comprimido si el navegador puede (≈ 5 veces menos) */
async function plTxBlob(o){const j=JSON.stringify(o);
  if(window.CompressionStream)try{const b=await new Response(new Blob([j]).stream().pipeThrough(new CompressionStream('gzip'))).blob();return{b,z:1,type:'application/gzip'}}catch(e){}
  return{b:new Blob([j],{type:'application/json'}),z:0,type:'application/json'}}
const plTxName=z=>z?'tx.json.gz':'tx.json';
const plTxPath=p=>p&&p.tx&&p.base?p.base+'/'+plTxName(p.tx.z):'';
/** lo que se guarda en el documento de la lámina */
const plTxMeta=(o,z)=>({v:PLTX_V,n:o.T.length,z:z?1:0});

/* ---------- lectura (caché en memoria de los últimos PLTX_KEEP) ---------- */
const PLTX=new Map();
function plTxGet(p){const k=plTxPath(p);if(!k||!p.tx.n)return Promise.resolve(null);
  let e=PLTX.get(k);if(e){PLTX.delete(k);PLTX.set(k,e);return e}
  e=(async()=>{const b=await plGet(k);
    const txt=p.tx.z?await new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).text():await b.text();
    return plTxParse(JSON.parse(txt))})();
  PLTX.set(k,e);e.catch(()=>{if(PLTX.get(k)===e)PLTX.delete(k)});
  while(PLTX.size>PLTX_KEEP)PLTX.delete(PLTX.keys().next().value);
  return e}
/** arma el índice en memoria: dos cadenas largas (original y compacta, un texto por línea) con sus inicios y las cajas */
function plTxParse(o){const T=(o&&o.T)||[],n=T.length;const oR=new Int32Array(n+1),oC=new Int32Array(n+1),B=new Int32Array(n*4);const R=[],C=[];let r=0,c=0;
  T.forEach((t,i)=>{const s=String(t[0]),k=plTxC(s);oR[i]=r;oC[i]=c;R.push(s);C.push(k);r+=s.length+1;c+=k.length+1;B[i*4]=t[1];B[i*4+1]=t[2];B[i*4+2]=t[3];B[i*4+3]=t[4]});
  oR[n]=r;oC[n]=c;return{n,R:R.join('\n'),C:C.join('\n'),oR,oC,B}}
/** índices de los textos que contienen qc (compacto); uno por texto */
function plTxFind(ix,qc){const out=[];if(!ix||!qc)return out;let pos=0;
  while((pos=ix.C.indexOf(qc,pos))>=0){let lo=0,hi=ix.n-1;while(lo<hi){const md=(lo+hi+1)>>1;if(ix.oC[md]<=pos)lo=md;else hi=md-1}
    out.push(lo);pos=ix.oC[lo+1]}
  return out}
const plTxStr=(ix,i)=>ix.R.slice(ix.oR[i],ix.oR[i+1]-1);

/* ---------- búsqueda en varias láminas ---------- */
const PLS={seq:0,key:'',res:new Map(),st:null,done:true};
/** busca q en las láminas L (en paralelo, PLTX_PAR a la vez); onUp() se llama a medida que llegan resultados y al terminar */
function plTxSearch(L,q,onUp){const qc=plTxC(q);const key=qc+'|'+L.map(p=>p.id+':'+(p.tx?p.base+p.tx.n:'-')).join(',');
  if(key===PLS.key){onUp();return}
  const my=++PLS.seq;PLS.key=key;PLS.res=new Map();PLS.done=false;
  const todo=L.filter(p=>p.tx&&p.tx.n>0);PLS.st={tot:todo.length,done:0,no:L.filter(p=>!p.tx).length,sin:L.filter(p=>p.tx&&!p.tx.n).length,err:0,q:qc};
  if(qc.length<2||!todo.length){PLS.done=true;onUp();return}
  let i=0,last=0;const tick=f=>{const t=performance.now();if(f||t-last>160){last=t;onUp()}};
  const work=async()=>{while(i<todo.length&&my===PLS.seq){const p=todo[i++];
    try{const ix=await plTxGet(p);if(my!==PLS.seq)return;const h=plTxFind(ix,qc);
      if(h.length){const sn=[...new Set(h.map(k=>plTxStr(ix,k)))];PLS.res.set(p.id,{n:h.length,s:sn.slice(0,3)})}}
    catch(e){PLS.st.err++;console.error('índice de texto',p.id,e)}
    PLS.st.done++;tick(false)}};
  Promise.all(Array.from({length:PLTX_PAR},work)).then(()=>{if(my===PLS.seq){PLS.done=true;tick(true)}})}
/** línea de estado y avisos bajo el buscador */
function plTxStatus(L,canIdx){const st=PLS.st;if(!st)return'';const q=PLS.st.q;const nRes=PLS.res.size;
  const a=[];
  if(q.length<2)a.push('<span>Escribe al menos 2 letras o números para buscar dentro de las láminas.</span>');
  else if(!PLS.done)a.push(`<span>Buscando dentro de las láminas… ${st.done} de ${st.tot}</span>`);
  else a.push(`<span>${nRes?`<b>${nRes}</b> ${nRes===1?'lámina tiene':'láminas tienen'} ese texto.`:'Ninguna lámina tiene ese texto.'}</span>`);
  if(st.no)a.push(`<span class="pltxw">${st.no} ${st.no===1?'lámina aún no está indexada':'láminas aún no están indexadas'} (no entran en la búsqueda).${canIdx?' <button type="button" class="ib" data-tx="idx">🔤 Indexar texto</button>':''}</span>`);
  if(st.sin)a.push(`<span class="pltxm" title="El PDF no trae el texto como texto (letras SHX exportadas como líneas o un plano escaneado). Reexportándolas con el texto como texto, entran en la búsqueda.">${st.sin} sin texto buscable</span>`);
  if(st.err)a.push(`<span class="pltxw">${st.err} no se pudieron leer (¿sin conexión?).</span>`);
  return a.join('')}
const plTxSnip=r=>r?`<small class="pltxs">${r.n>1?`<b>${r.n}×</b> `:''}${r.s.map(s=>esc(s.length>48?s.slice(0,47)+'…':s)).join(' · ')}</small>`:'';

/* ---------- biblioteca: modo Contenido ---------- */
const plTxOn=()=>PLF.qm==='tx';
/** la lista de la biblioteca en modo Contenido (L: las láminas de los demás filtros, sin el buscador) */
function plTxList(main,host,L){const q=PLF.q||'';const canIdx=L.some(p=>!p.tx&&plEdOf(p));
  const draw=()=>{if(!host.isConnected)return;const st=$('#pltxst',main);if(st)shx(st,plTxStatus(L,canIdx));
    const R=L.filter(p=>PLS.res.has(p.id));stx($('#plcnt',main),plTxC(q).length<2?L.length+' planos':R.length===1?'1 plano':R.length+' planos');
    if(plTxC(q).length<2){shx(host,'');host.dataset.h='';return}
    const g=new Map();R.forEach(p=>{const k=p.eto?p.sc:p.disc;if(!g.has(k))g.set(k,[]);g.get(k).push(p)});
    const h=R.length?[...g].map(([d,ps])=>`<h3 class="plg">${ps[0].eto?`<i class="etosw" style="background:${esc(conOf(d).color||'#9AA0A6')}"></i>${esc(etoScName(d))}`:esc(PL_DN[d]||d)} <span>${ps.length}</span></h3><div class="plgrid">${ps.map(p=>`<button type="button" class="plc" data-pl="${esc(p.id)}" data-tq="1" title="${esc(p.fname||'')}">
        <span class="plth"><img data-th="${esc(p.base+'/th.webp')}" alt="" loading="lazy"></span>
        <span class="plci"><b class="mono">${esc(p.cod)}</b><span>${esc(p.tit||'Sin título')}</span>${plTxSnip(PLS.res.get(p.id))}</span></button>`).join('')}</div>`).join('')
      :PLS.done?'<p class="note">Ninguna lámina tiene ese texto con estos filtros.</p>':'';
    if(host.dataset.h!==h){host.innerHTML=h;host.dataset.h=h;plThumbs(host)}};
  plTxSearch(L,q,draw)}
/** ids de las láminas con resultado, en el orden de la lista */
const plTxIds=L=>L.filter(p=>PLS.res.has(p.id)).map(p=>p.id);

/* ---------- indexar las láminas ya cargadas ---------- */
const PLTXQ={run:false,stop:false};
async function plTxIndexAll(L,onUp){L=L.filter(p=>!p.tx&&plEdOf(p));if(!L.length||PLTXQ.run)return;
  if(!await uiAsk({title:'Indexar el texto de las láminas',text:`Se leerá el texto de ${L.length} ${L.length===1?'lámina':'láminas'} en esta PC: se baja cada PDF original (no se guarda en el equipo) y se sube su índice. Unos segundos por lámina; deja esta pestaña abierta.`,ok:'Indexar',tone:'info'}))return;
  PLTXQ.run=true;PLTXQ.stop=false;let ok=0,sin=0,err=0,i=0;const t0=performance.now();
  const say=()=>onUp&&onUp(`Indexando ${ok+sin+err} de ${L.length}…`);say();
  try{await plPdfJs();
    const work=async()=>{while(i<L.length&&!PLTXQ.stop){const p=L[i++];try{const n=await plTxIndexOne(p);if(n)ok++;else sin++}catch(e){err++;console.error('indexar',p.id,e)}say()}};
    await Promise.all([work(),work()])}
  finally{PLTXQ.run=false}
  toast(`Texto indexado: ${ok} ${ok===1?'lámina':'láminas'}${sin?`, ${sin} sin texto buscable`:''}${err?`, ${err} con error (vuelve a intentarlo)`:''} (${Math.round((performance.now()-t0)/1000)} s).`);
  PLS.key='';onUp&&onUp('')}
/** una lámina: índice desde su orig.pdf; devuelve cuántos textos tiene */
async function plTxIndexOne(p){const base=p.base;const b=await plGet(base+'/orig.pdf',{noStore:true});
  const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await b.arrayBuffer())}).promise;
  try{const pg=await pdf.getPage(1);const o=await plTxBuild(pg,p.crop||null);const t=await plTxBlob(o);
    await plPut(base+'/'+plTxName(t.z),t.b,t.type);const tx=plTxMeta(o,t.z);const ref=plCol(p).doc(p.id);
    await db.runTransaction(async x=>{const sn=await x.get(ref);if(!sn.exists)throw new Error('La lámina ya no existe');
      if(sn.data().base!==base)return;   /* entre tanto se cargó otra revisión: esa ya trae su índice */
      x.update(ref,{tx})});
    return tx.n}
  finally{try{pdf.destroy()}catch(e){}}}

/* ---------- panel ☰ Planos del visor: modo Contenido ---------- */
function plTxPanelList(el,L){const host=el.querySelector('.plvpl');const q=PLV.pf.q||'';const st=el.querySelector('.pltxst');
  const draw=()=>{if(!PLV||!host.isConnected)return;if(st)shx(st,plTxStatus(L,false));
    if(plTxC(q).length<2){shx(host,'');host.dataset.h='';return}
    const R=L.filter(p=>PLS.res.has(p.id));
    const h=R.length?R.map(p=>`<button type="button" class="plvpr${p.id===PLV.id?' on':''}" data-pg="${esc(p.id)}"><span class="plvpt"><img data-th="${esc(p.base+'/th.webp')}" alt=""></span><span class="plvpi"><b class="mono">${esc(p.cod)}</b> ${esc(p.tit||'')}${plTxSnip(PLS.res.get(p.id))}</span></button>`).join('')
      :PLS.done?'<p class="note">Ninguna lámina tiene ese texto con esos filtros.</p>':'';
    if(host.dataset.h!==h){host.innerHTML=h;host.dataset.h=h;plThumbs(host);const on=host.querySelector('.plvpr.on');if(on)on.scrollIntoView({block:'nearest'})}};
  plTxSearch(L,q,draw)}

/* ---------- visor: resaltar las coincidencias y saltar entre ellas ---------- */
/** se llama al dibujar el visor (plvDraw): con una búsqueda activa (PLV.hq) carga el índice de la lámina y pone la barra */
function plTxAttach(){if(!PLV||!PLV.tv)return;const V=PLV.tv,p=PLB.get(PLV.id),sp=p&&plSpecOf(p,PLV.rev);PLV.hits=null;
  const old=PLV.box.querySelector('.pltxb');if(old)old.remove();
  if(!PLV.hq||!p)return;const qc=plTxC(PLV.hq);if(qc.length<2)return;
  const bar=document.createElement('div');bar.className='pltxb';const body=PLV.box.querySelector('.plvb');bar.style.top=((body?body.offsetTop:56)+8)+'px';PLV.box.appendChild(bar);
  const id=PLV.id,tv=V;
  const show=()=>{if(!PLV||PLV.tv!==tv)return;const H=PLV.hits;
    bar.innerHTML=`<span class="pltxq">🔍 «${esc(PLV.hq)}»</span>${!sp.cur?'<span>Solo en la revisión vigente</span>':!p.tx?'<span>Lámina sin indexar</span>':!p.tx.n?'<span>Sin texto buscable</span>':!H?'<span>Buscando…</span>':!H.L.length?'<span>No está en esta lámina</span>'
      :`<b>${H.i+1} de ${H.L.length}</b><button type="button" class="ib" data-tx="hp" aria-label="Coincidencia anterior">‹</button><button type="button" class="ib" data-tx="hn" aria-label="Coincidencia siguiente">›</button>`}<button type="button" class="ib" data-tx="hx" aria-label="Quitar la búsqueda" title="Quitar el resaltado">✕</button>`};
  bar.onclick=e=>{const b=e.target.closest('[data-tx]');if(!b)return;e.stopPropagation();const a=b.dataset.tx;
    if(a==='hx'){PLV.hq=null;PLV.hits=null;bar.remove();tv.hl=null;tv.tick();return}
    if(a==='hn')plTxGo(1);else if(a==='hp')plTxGo(-1)};
  show();if(!sp.cur||!p.tx||!p.tx.n)return;
  plTxGet(p).then(ix=>{if(!PLV||PLV.tv!==tv||PLV.id!==id)return;
    const L=plTxFind(ix,qc).map(k=>({s:plTxStr(ix,k),x0:ix.B[k*4]/PLTX_K*sp.W,y0:ix.B[k*4+1]/PLTX_K*sp.H,x1:ix.B[k*4+2]/PLTX_K*sp.W,y1:ix.B[k*4+3]/PLTX_K*sp.H}))
      .sort((a,b)=>a.y0-b.y0||a.x0-b.x0);
    PLV.hits={L,i:0};tv.hl=plTxPaint;show();PLV.hitShow=show;
    if(L.length)requestAnimationFrame(()=>requestAnimationFrame(()=>plTxGo(0)));else tv.tick()},
    e=>{bar.innerHTML=`<span class="pltxq">🔍 «${esc(PLV.hq)}»</span><span>No se pudo leer el índice</span><button type="button" class="ib" data-tx="hx" aria-label="Quitar la búsqueda">✕</button>`;console.error('índice de texto',e)})}
/** dibujo de las coincidencias (encima de los mosaicos y la capa nítida, debajo de las marcas y de Medir) */
function plTxPaint(g,V){const H=PLV&&PLV.hits;if(!H||!H.L.length)return;const pad=3;
  H.L.forEach((h,i)=>{const a=V.toScreen(h.x0,h.y0),b=V.toScreen(h.x1,h.y1);const x=a.x-pad,y=a.y-pad,w=b.x-a.x+2*pad,hh=b.y-a.y+2*pad;
    if(x>V.cv.clientWidth||y>V.cv.clientHeight||x+w<0||y+hh<0)return;const cur=i===H.i;
    g.globalAlpha=cur?0.42:0.3;g.fillStyle=cur?'#ff8f00':'#ffd400';g.fillRect(x,y,w,hh);
    g.globalAlpha=1;g.lineWidth=cur?2.5:1.2;g.strokeStyle=cur?'#e65100':'#c9a400';g.strokeRect(x,y,w,hh)});
  g.globalAlpha=1}
/** acerca a la coincidencia actual + d (0: la actual) */
function plTxGo(d){const H=PLV&&PLV.hits,V=PLV&&PLV.tv;if(!H||!H.L.length||!V)return;H.i=(H.i+d+H.L.length)%H.L.length;const h=H.L[H.i];
  const host=PLV.box.querySelector('.plvb');const cw=host.clientWidth,ch=host.clientHeight;const dpr=window.devicePixelRatio||1;
  /* el texto a ~30 px de alto en pantalla, sin pasar del zoom máximo ni quedar más lejos que la lámina entera */
  const th=Math.max(1,Math.min(h.y1-h.y0,h.x1-h.x0));let s=30/th;s=Math.min(s,6/dpr,Math.max(V.fit,cw*0.8/Math.max(1,h.x1-h.x0)));s=Math.max(s,V.fit);
  const cx=(h.x0+h.x1)/2,cy=(h.y0+h.y1)/2;V.animTo(s,cw/2-cx*s,ch/2-cy*s);if(PLV.hitShow)PLV.hitShow()}
