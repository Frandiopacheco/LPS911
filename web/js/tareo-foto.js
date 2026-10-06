"use strict";
/* LPS 911 · Tareo: mejora de la foto del formato firmado (tipo escáner, sin librerías).
   Contrato en docs/ia/tareo.md («Mejora de foto (oct 2026)»).
   tFotoEditor(dataURL) → Promise<dataURL|null>: pantalla completa sobre la app con
   1) 4 esquinas arrastrables sobre una propuesta automática del contorno (tfDetect),
   2) corrección de perspectiva (homografía 4 puntos, muestreo bilineal por franjas),
   3) filtros «Documento» (por omisión), «Color», «Original»; girar 90°.
   Resuelve: «Listo» → JPEG 0.8, lado mayor ≤ 2000 px; «Usar original» → el mismo dataURL; «Repetir foto» → null. */

const TF_PV=1200;      /* lado mayor de la copia de trabajo (pantalla de esquinas, lupa y vista previa) */
const TF_FULL=3000;    /* lado mayor de la fuente al pulsar «Listo» (una foto de 12 MP se reduce antes de muestrear) */
const TF_OUT=2000;     /* lado mayor del resultado */
const TF_DET=400;      /* lado mayor para detectar el contorno */
const TF_A4=Math.SQRT2;
let TFE=null;

/* ---------- utilidades de imagen ---------- */
const tfCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
/** Copia la imagen a un canvas con lado mayor ≤ max. */
function tfScaled(img,max){
  const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,k=Math.min(1,max/Math.max(W,H));
  const c=tfCanvas(W*k,H*k),g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,0,0,c.width,c.height);return c;
}
const tfTick=()=>new Promise(r=>setTimeout(r,0));

/* ---------- detección del contorno del formato ---------- */
/* Escala de grises a ~400 px → umbral de Otsu → cierre/apertura (r=2) → componente claro más grande →
   casco convexo de sus extremos por fila → cuadrilátero de área máxima inscrito en el casco.
   Si no es confiable (muy chico, ocupa toda la foto o no se parece a un cuadrilátero) propone un margen del 5 %. */
function tfMorph(m,w,h,r,dil){
  const t=new Uint8Array(w*h),o=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const b=y*w;let s=0,n=0;
    for(let x=0;x<=r&&x<w;x++){s+=m[b+x];n++;}
    for(let x=0;x<w;x++){t[b+x]=dil?(s>0?1:0):(s===n?1:0);
      const a=x+r+1,d=x-r;if(a<w){s+=m[b+a];n++;}if(d>=0){s-=m[b+d];n--;}}}
  for(let x=0;x<w;x++){let s=0,n=0;
    for(let y=0;y<=r&&y<h;y++){s+=t[y*w+x];n++;}
    for(let y=0;y<h;y++){o[y*w+x]=dil?(s>0?1:0):(s===n?1:0);
      const a=y+r+1,d=y-r;if(a<h){s+=t[a*w+x];n++;}if(d>=0){s-=t[d*w+x];n--;}}}
  return o;
}
function tfOtsu(g){
  const hist=new Float64Array(256);for(let i=0;i<g.length;i++)hist[g[i]]++;
  const N=g.length;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
  let sB=0,wB=0,best=-1,th=128;
  for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=N-wB;if(!wF)break;sB+=t*hist[t];
    const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;th=t;}}
  return th;
}
function tfHull(P){
  P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];
  for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
  for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
  lo.pop();up.pop();return lo.concat(up);
}
const tfArea=Q=>{let s=0;for(let i=0;i<Q.length;i++){const a=Q[i],b=Q[(i+1)%Q.length];s+=a[0]*b[1]-b[0]*a[1];}return Math.abs(s)/2;};
/** Ordena 4 puntos: arriba-izq, arriba-der, abajo-der, abajo-izq. */
function tfOrder(q){
  const cx=q.reduce((s,p)=>s+p[0],0)/4,cy=q.reduce((s,p)=>s+p[1],0)/4;
  const r=q.slice().sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
  let k=0;for(let i=1;i<4;i++)if(r[i][0]+r[i][1]<r[k][0]+r[k][1])k=i;
  return r.slice(k).concat(r.slice(0,k)).map(p=>[p[0],p[1]]);
}
const TF_MARGIN=()=>[[.05,.05],[.95,.05],[.95,.95],[.05,.95]];
/** cv: canvas con la foto (cualquier tamaño). → {q:[[x,y]×4] normalizados 0–1, ok, why} */
function tfDetect(cv){
  try{
    const k=Math.min(1,TF_DET/Math.max(cv.width,cv.height)),w=Math.max(8,Math.round(cv.width*k)),h=Math.max(8,Math.round(cv.height*k));
    const c=tfCanvas(w,h),x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingQuality='high';x.drawImage(cv,0,0,w,h);
    const d=x.getImageData(0,0,w,h).data,N=w*h,g=new Uint8Array(N);
    for(let i=0,j=0;i<N;i++,j+=4)g[i]=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8;
    const th=tfOtsu(g);
    let m=new Uint8Array(N);for(let i=0;i<N;i++)m[i]=g[i]>th?1:0;
    m=tfMorph(tfMorph(m,w,h,2,true),w,h,2,false);   /* cierre: une la hoja cortada por líneas de tinta */
    m=tfMorph(tfMorph(m,w,h,2,false),w,h,2,true);   /* apertura: corta puentes finos con el fondo */
    const lab=new Int32Array(N),st=new Int32Array(N);let best=0,bestN=0,cur=0;
    for(let i=0;i<N;i++){if(!m[i]||lab[i])continue;cur++;let sp=0,n=0;st[sp++]=i;lab[i]=cur;
      while(sp){const p=st[--sp];n++;const px=p%w;
        if(px>0&&m[p-1]&&!lab[p-1]){lab[p-1]=cur;st[sp++]=p-1;}
        if(px<w-1&&m[p+1]&&!lab[p+1]){lab[p+1]=cur;st[sp++]=p+1;}
        if(p>=w&&m[p-w]&&!lab[p-w]){lab[p-w]=cur;st[sp++]=p-w;}
        if(p<N-w&&m[p+w]&&!lab[p+w]){lab[p+w]=cur;st[sp++]=p+w;}}
      if(n>bestN){bestN=n;best=cur;}}
    if(!best||bestN<N*.12)return{q:TF_MARGIN(),ok:false,why:'chico'};
    if(bestN>N*.97)return{q:TF_MARGIN(),ok:false,why:'toda'};
    const P=[];
    for(let y=0;y<h;y++){let a=-1,b=-1;for(let xx=0;xx<w;xx++)if(lab[y*w+xx]===best){if(a<0)a=xx;b=xx;}
      if(a>=0){P.push([a,y]);P.push([b+1,y]);P.push([a,y+1]);P.push([b+1,y+1]);}}
    const H=tfHull(P),n=H.length;if(n<4)return{q:TF_MARGIN(),ok:false,why:'casco'};
    /* 4 extremos como inicio, luego cada vértice se mueve al punto del casco que maximiza el área */
    const ext=[(p)=>-(p[0]+p[1]),(p)=>p[0]-p[1],(p)=>p[0]+p[1],(p)=>p[1]-p[0]].map(f=>{let bi=0;for(let i=1;i<n;i++)if(f(H[i])>f(H[bi]))bi=i;return bi;});
    let id=[...new Set(ext)].sort((a,b)=>a-b);if(id.length<4)return{q:TF_MARGIN(),ok:false,why:'extremos'};
    for(let it=0,ch=true;ch&&it<20;it++){ch=false;
      for(let kk=0;kk<4;kk++){const a=id[(kk+3)%4],b=id[(kk+1)%4];let bi=id[kk],ba=tfArea(id.map(i=>H[i]));
        for(let j=(a+1)%n;j!==b;j=(j+1)%n){const t=id.slice();t[kk]=j;const ar=tfArea(t.map(i=>H[i]));if(ar>ba+1e-9){ba=ar;bi=j;}}
        if(bi!==id[kk]){id[kk]=bi;ch=true;}}}
    const Q=tfOrder(id.map(i=>H[i]));
    const qa=tfArea(Q),ha=tfArea(H);
    if(qa<ha*.85||bestN<qa*.82)return{q:TF_MARGIN(),ok:false,why:'forma'};
    for(let i=0;i<4;i++){const a=Q[(i+3)%4],b=Q[i],c2=Q[(i+1)%4],v1=[a[0]-b[0],a[1]-b[1]],v2=[c2[0]-b[0],c2[1]-b[1]];
      const ang=Math.acos(Math.max(-1,Math.min(1,(v1[0]*v2[0]+v1[1]*v2[1])/(Math.hypot(...v1)*Math.hypot(...v2)||1))))*180/Math.PI;
      if(ang<35||ang>145)return{q:TF_MARGIN(),ok:false,why:'angulo'};}
    return{q:Q.map(p=>[Math.max(0,Math.min(1,p[0]/w)),Math.max(0,Math.min(1,p[1]/h))]),ok:true};
  }catch(e){return{q:TF_MARGIN(),ok:false,why:'error'};}
}

/* ---------- perspectiva ---------- */
/** Homografía que lleva el rectángulo destino (0,0)-(W,H) a los 4 puntos fuente S (en píxeles). → [h0..h7] */
function tfHomog(S,W,H){
  const D=[[0,0],[W,0],[W,H],[0,H]],A=[],B=[];
  for(let i=0;i<4;i++){const[x,y]=D[i],[u,v]=S[i];
    A.push([x,y,1,0,0,0,-x*u,-y*u]);B.push(u);A.push([0,0,0,x,y,1,-x*v,-y*v]);B.push(v);}
  for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;
    [A[c],A[p]]=[A[p],A[c]];[B[c],B[p]]=[B[p],B[c]];const piv=A[c][c]||1e-12;
    for(let r=0;r<8;r++){if(r===c)continue;const f=A[r][c]/piv;if(!f)continue;for(let k=c;k<8;k++)A[r][k]-=f*A[c][k];B[r]-=f*B[c];}}
  return B.map((b,i)=>b/(A[i][i]||1e-12));
}
/** Tamaño de salida: medido en la fuente; si se parece a A4 (±20 %) se ajusta a A4 horizontal o vertical. */
function tfOutSize(S,max){
  const L=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const w=Math.max(L(S[0],S[1]),L(S[3],S[2])),h=Math.max(L(S[0],S[3]),L(S[1],S[2]));
  let r=w/Math.max(1,h);
  if(r>=1&&Math.abs(r/TF_A4-1)<.2)r=TF_A4;else if(r<1&&Math.abs(r*TF_A4-1)<.2)r=1/TF_A4;
  const big=Math.min(max,Math.max(w,h,64));
  return r>=1?[Math.round(big),Math.round(big/r)]:[Math.round(big*r),Math.round(big)];
}
/** Endereza: sd = ImageData de la fuente, q normalizado. Por franjas con pausa si `slow` (no congela la pantalla). → canvas */
async function tfWarp(sd,q,max,slow){
  const sw=sd.width,sh=sd.height,S=tfOrder(q).map(p=>[p[0]*sw,p[1]*sh]);
  const[W,H]=tfOutSize(S,max),h=tfHomog(S,W,H),c=tfCanvas(W,H),g=c.getContext('2d'),od=g.createImageData(W,H),o=od.data,s=sd.data;
  const mx=sw-1.001,my=sh-1.001,row=sw*4;
  for(let y=0;y<H;y++){
    const Y=y+.5;let nu=h[0]*.5+h[1]*Y+h[2],nv=h[3]*.5+h[4]*Y+h[5],dn=h[6]*.5+h[7]*Y+1;let j=y*W*4;
    for(let x=0;x<W;x++,nu+=h[0],nv+=h[3],dn+=h[6],j+=4){
      let u=nu/dn-.5,v=nv/dn-.5;u=u<0?0:u>mx?mx:u;v=v<0?0:v>my?my:v;
      const xi=u|0,yi=v|0,fx=u-xi,fy=v-yi,p=yi*row+xi*4,q2=p+row;
      const w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
      o[j]=s[p]*w00+s[p+4]*w10+s[q2]*w01+s[q2+4]*w11;
      o[j+1]=s[p+1]*w00+s[p+5]*w10+s[q2+1]*w01+s[q2+5]*w11;
      o[j+2]=s[p+2]*w00+s[p+6]*w10+s[q2+2]*w01+s[q2+6]*w11;
      o[j+3]=255;}
    if(slow&&y%96===95)await tfTick();
  }
  g.putImageData(od,0,0);return c;
}

/* ---------- filtros ---------- */
/* «Documento»: fondo = desenfoque grande de la hoja sin tinta (reducir a ~96 px, máximo 5×5 que borra los trazos, promedio 5×5,
   volver a ampliar con suavizado). Cada canal ÷ fondo → iluminación pareja y blanco neutro; curva que lleva el papel a blanco y
   oscurece la tinta sin umbral duro (las firmas tenues siguen grises/azules); un poco más de saturación para la tinta azul. */
async function tfFilter(c,f,slow){
  if(f==='orig')return c;
  const W=c.width,H=c.height,g=c.getContext('2d',{willReadFrequently:true}),id=g.getImageData(0,0,W,H),d=id.data;
  if(f==='color'){
    const L=new Uint8ClampedArray(256);for(let i=0;i<256;i++)L[i]=(i-128)*1.12+134;
    for(let i=0;i<d.length;i+=4){d[i]=L[d[i]];d[i+1]=L[d[i+1]];d[i+2]=L[d[i+2]];}
    g.putImageData(id,0,0);return c;
  }
  const k=96/Math.max(W,H),sw=Math.max(4,Math.round(W*k)),sh=Math.max(4,Math.round(H*k));
  const sm=tfCanvas(sw,sh),sg=sm.getContext('2d',{willReadFrequently:true});sg.imageSmoothingQuality='high';sg.drawImage(c,0,0,sw,sh);
  const sd=sg.getImageData(0,0,sw,sh),a=sd.data;
  const pass=(src,fn,r)=>{const o=new Uint8ClampedArray(src.length);
    for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)for(let ch=0;ch<3;ch++){let acc=0,n=0;
      for(let dy=-r;dy<=r;dy++){const yy=y+dy;if(yy<0||yy>=sh)continue;for(let dx=-r;dx<=r;dx++){const xx=x+dx;if(xx<0||xx>=sw)continue;
        const v=src[(yy*sw+xx)*4+ch];if(fn==='max'){if(v>acc)acc=v;}else{acc+=v;n++;}}}
      o[(y*sw+x)*4+ch]=fn==='max'?acc:acc/n;o[(y*sw+x)*4+3]=255;}
    return o;};
  sd.data.set(pass(pass(a,'max',2),'avg',2));sg.putImageData(sd,0,0);
  const bg=tfCanvas(W,H),bgx=bg.getContext('2d',{willReadFrequently:true});bgx.imageSmoothingQuality='high';bgx.drawImage(sm,0,0,W,H);
  const b=bgx.getImageData(0,0,W,H).data;
  const LUT=new Uint8ClampedArray(1025);for(let i=0;i<=1024;i++){const t=i/1024;LUT[i]=t>=.9?255:255*Math.pow(t/.9,1.7);}
  const step=W*4*128;
  for(let i=0;i<d.length;i+=4){
    let r=LUT[Math.min(1024,(d[i]*1024/(b[i]||1))|0)],gg=LUT[Math.min(1024,(d[i+1]*1024/(b[i+1]||1))|0)],bb=LUT[Math.min(1024,(d[i+2]*1024/(b[i+2]||1))|0)];
    const m=(r+gg+bb)/3;d[i]=m+(r-m)*1.25;d[i+1]=m+(gg-m)*1.25;d[i+2]=m+(bb-m)*1.25;
    if(slow&&i%step===0&&i)await tfTick();
  }
  g.putImageData(id,0,0);return c;
}
function tfRot(c,rot){
  if(!rot)return c;const o=rot%2?tfCanvas(c.height,c.width):tfCanvas(c.width,c.height),g=o.getContext('2d');
  g.translate(o.width/2,o.height/2);g.rotate(rot*Math.PI/2);g.drawImage(c,-c.width/2,-c.height/2);return o;
}

/* ---------- pantalla ---------- */
const TF_CN=['Esquina superior izquierda','Esquina superior derecha','Esquina inferior derecha','Esquina inferior izquierda'];
const TF_FL=[['doc','Documento'],['color','Color'],['orig','Original']];
function tfHtml(){
  return `<div class="tf-top"><div class="tf-tt"><b id="tfT">Ajusta las esquinas</b><span id="tfSub" class="tf-sub"></span></div>
    <div class="tf-ta"><button type="button" class="ib" data-tf="retake">Repetir foto</button><button type="button" class="ib" data-tf="orig">Usar original</button></div></div>
  <div class="tf-stage" id="tfStage"><div class="tf-box" id="tfBox"><canvas id="tfCv" class="tf-cv"></canvas><canvas id="tfRes" class="tf-cv" hidden></canvas>
    <svg class="tf-svg" id="tfSvg" preserveAspectRatio="none" viewBox="0 0 1 1" aria-hidden="true"><polygon id="tfPoly" points=""/></svg>
    ${TF_CN.map((n,i)=>`<button type="button" class="tf-h" data-tfh="${i}" aria-label="${n} (muévela con las flechas)"><i></i></button>`).join('')}</div>
    <canvas class="tf-lupa" id="tfLupa" width="132" height="132" hidden aria-hidden="true"></canvas>
    <div class="tf-busy" id="tfBusy" role="status" aria-live="polite" hidden><span class="tf-spin"></span>Procesando…</div></div>
  <div class="tf-bar" id="tfBar"></div>`;
}
function tfBar(){
  const B=document.getElementById('tfBar');if(!B)return;
  if(TFE.st==='q')B.innerHTML=`<button type="button" class="ib" data-tf="all">Toda la foto</button>${TFE.auto?`<button type="button" class="ib" data-tf="auto">Detectar</button>`:''}<span class="tf-sp"></span><button type="button" class="ib pri" data-tf="next">Ver resultado →</button>`;
  else B.innerHTML=`<button type="button" class="ib" data-tf="back">← Esquinas</button><span class="seg tf-seg" role="group" aria-label="Filtro">${TF_FL.map(([k,n])=>`<button type="button" data-tff="${k}" class="${TFE.f===k?'on':''}" aria-pressed="${TFE.f===k}">${n}</button>`).join('')}</span><button type="button" class="ib" data-tf="rot">Girar 90°</button><span class="tf-sp"></span><button type="button" class="ib pri" data-tf="ok">Listo</button>`;
  document.getElementById('tfT').textContent=TFE.st==='q'?'Ajusta las esquinas':'Resultado';
  document.getElementById('tfSub').textContent=TFE.st==='q'?(TFE.det&&TFE.det.ok?'Propuesta automática: arrastra las esquinas si no calzan con el formato.':'No se reconoció bien el formato: arrastra las 4 esquinas a sus puntas.'):'Elige el filtro y revisa que se lean las firmas.';
}
/* encaja la caja (foto o resultado) en el espacio disponible */
function tfLayout(){
  if(!TFE)return;const st=document.getElementById('tfStage'),bx=document.getElementById('tfBox');if(!st||!bx)return;
  const cv=TFE.st==='q'?TFE.pv:TFE.pres;if(!cv)return;
  const pad=TFE.st==='q'?26:10,aw=Math.max(40,st.clientWidth-2*pad),ah=Math.max(40,st.clientHeight-2*pad),k=Math.min(aw/cv.width,ah/cv.height);
  bx.style.width=Math.round(cv.width*k)+'px';bx.style.height=Math.round(cv.height*k)+'px';
}
function tfDrawQ(){
  if(!TFE)return;const q=TFE.q;
  document.getElementById('tfPoly').setAttribute('points',q.map(p=>p[0]+','+p[1]).join(' '));
  document.querySelectorAll('#tfBox .tf-h').forEach((h,i)=>{h.style.left=(q[i][0]*100)+'%';h.style.top=(q[i][1]*100)+'%';});
}
function tfShow(){
  const q=TFE.st==='q';
  document.getElementById('tfCv').hidden=!q;document.getElementById('tfRes').hidden=q;document.getElementById('tfSvg').style.display=q?'':'none';
  document.querySelectorAll('#tfBox .tf-h').forEach(h=>h.hidden=!q);
  document.getElementById('tfWs').dataset.st=TFE.st;tfBar();tfLayout();if(q)tfDrawQ();
}
function tfBusy(on){
  if(!TFE)return;TFE.busy=on;const b=document.getElementById('tfBusy');if(b)b.hidden=!on;
  document.querySelectorAll('#tfWs button').forEach(x=>x.disabled=on);
}
async function tfPreview(){
  if(!TFE)return;const key=TFE.q.map(p=>p.join(',')).join(';')+'|'+TFE.f;
  if(TFE.pkey!==key){
    tfBusy(true);await tfTick();
    try{const w=await tfWarp(TFE.pvD,TFE.q,900,false);TFE.pf=await tfFilter(w,TFE.f,false);TFE.pkey=key;}finally{tfBusy(false);}
    if(!TFE)return;
  }
  TFE.pres=tfRot(TFE.pf,TFE.rot);const r=document.getElementById('tfRes');r.width=TFE.pres.width;r.height=TFE.pres.height;r.getContext('2d').drawImage(TFE.pres,0,0);
  tfShow();
}
async function tfFinal(){
  tfBusy(true);await tfTick();const t0=performance.now();
  try{
    const full=TFE.img?tfScaled(TFE.img,TF_FULL):TFE.pv,sd=full.getContext('2d',{willReadFrequently:true}).getImageData(0,0,full.width,full.height);
    if(full!==TFE.pv)full.width=full.height=1;  /* libera memoria antes de muestrear */
    let c=await tfWarp(sd,TFE.q,TF_OUT,true);if(!TFE)return;
    c=await tfFilter(c,TFE.f,true);c=tfRot(c,TFE.rot);
    const url=c.toDataURL('image/jpeg',.8);TFE.ms=Math.round(performance.now()-t0);window.__tfMs=TFE.ms;
    tfEnd(url);
  }catch(e){tfBusy(false);const s=document.getElementById('tfSub');if(s)s.textContent='No se pudo procesar la foto: '+(e&&e.message||e)+'. Usa «Usar original».';}
}
function tfEnd(v){
  if(!TFE)return;const T=TFE;TFE=null;
  window.removeEventListener('resize',T.onRs);document.removeEventListener('keydown',T.onKey,true);
  T.el.remove();document.body.classList.remove('tf-on');
  try{if(T.ret&&T.ret.isConnected)T.ret.focus();}catch(e){}
  T.res(v);
}
function tfMove(i,x,y){
  TFE.q[i]=[Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))];tfDrawQ();
}
function tfLupa(i,cx,cy){
  const L=document.getElementById('tfLupa'),st=document.getElementById('tfStage');if(!L)return;
  if(i<0){L.hidden=true;return;}
  const pv=TFE.pv,bx=document.getElementById('tfBox').getBoundingClientRect(),sr=st.getBoundingClientRect(),s=bx.width/pv.width,z=2.5,src=L.width/(s*z);
  const px=TFE.q[i][0]*pv.width,py=TFE.q[i][1]*pv.height,g=L.getContext('2d');
  g.fillStyle='#000';g.fillRect(0,0,L.width,L.height);g.drawImage(pv,px-src/2,py-src/2,src,src,0,0,L.width,L.height);
  g.strokeStyle='#fff';g.lineWidth=3;g.beginPath();g.moveTo(L.width/2,L.height/2-16);g.lineTo(L.width/2,L.height/2+16);g.moveTo(L.width/2-16,L.height/2);g.lineTo(L.width/2+16,L.height/2);g.stroke();
  g.strokeStyle='#e0442c';g.lineWidth=1.5;g.stroke();
  /* lupa en la esquina de la pantalla opuesta al dedo */
  const left=(cx-sr.left)>sr.width/2;L.style.left=left?'10px':'';L.style.right=left?'':'10px';L.hidden=false;
}
function tfBind(el){
  const box=el.querySelector('#tfBox');let drag=-1;
  box.addEventListener('pointerdown',e=>{
    const h=e.target.closest('.tf-h');if(!h||TFE.st!=='q'||TFE.busy)return;e.preventDefault();drag=+h.dataset.tfh;
    try{h.setPointerCapture(e.pointerId);}catch(_){}
    h.classList.add('on');tfLupa(drag,e.clientX,e.clientY);
  });
  box.addEventListener('pointermove',e=>{
    if(drag<0)return;const r=box.getBoundingClientRect();tfMove(drag,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);tfLupa(drag,e.clientX,e.clientY);
  });
  const up=()=>{if(drag<0)return;box.querySelectorAll('.tf-h.on').forEach(h=>h.classList.remove('on'));drag=-1;tfLupa(-1);};
  box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);box.addEventListener('lostpointercapture',up);
  box.addEventListener('keydown',e=>{
    const h=e.target.closest('.tf-h');if(!h)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;
    e.preventDefault();const i=+h.dataset.tfh,s=e.shiftKey?.02:.004;tfMove(i,TFE.q[i][0]+d[0]*s,TFE.q[i][1]+d[1]*s);
  });
  el.addEventListener('click',e=>{
    if(!TFE||TFE.busy)return;const b=e.target.closest('[data-tf],[data-tff]');if(!b)return;const a=b.dataset.tf;
    if(b.dataset.tff){TFE.f=b.dataset.tff;tfPreview();return;}
    if(a==='retake')tfEnd(null);
    else if(a==='orig')tfEnd(TFE.src);
    else if(a==='all'){TFE.q=[[0,0],[1,0],[1,1],[0,1]];tfDrawQ();}
    else if(a==='auto'){TFE.q=TFE.det.q.map(p=>p.slice());tfDrawQ();}
    else if(a==='next'){TFE.q=tfOrder(TFE.q);TFE.st='r';tfPreview();}
    else if(a==='back'){TFE.st='q';tfShow();}
    else if(a==='rot'){TFE.rot=(TFE.rot+1)%4;tfPreview();}
    else if(a==='ok')tfFinal();
  });
}
/** Editor de la foto del formato. dataURL → Promise<dataURL JPEG mejorado | el original («Usar original») | null («Repetir foto»)>. */
function tFotoEditor(dataURL){
  if(TFE)tfEnd(null);
  return new Promise(res=>{
    const el=document.createElement('div');el.className='tf-ws';el.id='tfWs';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Mejorar la foto del formato');
    el.innerHTML=tfHtml();document.body.appendChild(el);document.body.classList.add('tf-on');
    TFE={res,el,src:dataURL,st:'q',f:'doc',rot:0,q:TF_MARGIN(),auto:false,det:null,busy:false,ret:document.activeElement};
    const T=TFE;
    T.onRs=()=>tfLayout();window.addEventListener('resize',T.onRs);
    T.onKey=e=>{if(TFE!==T)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(T.st==='r'&&!T.busy){T.st='q';tfShow();}}
      else if(e.key==='Tab'){const f=[...el.querySelectorAll('button:not([disabled]):not([hidden])')].filter(b=>b.offsetParent);if(!f.length)return;
        const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}}};
    document.addEventListener('keydown',T.onKey,true);
    tfBind(el);tfBar();tfBusy(true);
    const img=new Image();
    img.onload=()=>{if(TFE!==T)return;
      T.img=img;T.pv=tfScaled(img,TF_PV);T.pvD=T.pv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,T.pv.width,T.pv.height);
      const cv=document.getElementById('tfCv');cv.width=T.pv.width;cv.height=T.pv.height;cv.getContext('2d').drawImage(T.pv,0,0);
      const t0=performance.now();T.det=tfDetect(T.pv);T.detMs=Math.round(performance.now()-t0);T.q=T.det.q.map(p=>p.slice());T.auto=true;
      tfBusy(false);tfShow();const f=el.querySelector('[data-tf="next"]');if(f)f.focus();
    };
    img.onerror=()=>{if(TFE===T)tfEnd(dataURL);};  /* no se pudo leer: se queda la foto tal cual */
    img.src=dataURL;
  });
}
