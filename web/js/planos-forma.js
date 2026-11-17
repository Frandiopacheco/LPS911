"use strict";
/* LPS 911 · Planos › reconocer por la forma (17-11-2026, etapa 2 de «Alistar mejorado», decidido con el dueño; docs/ia/planos.md).
   El proyectista no siempre separa columnas y vigas en capas: la capa es una pista y la geometría la confirma. Aquí se buscan, sin
   depender de las capas elegidas, cuatro casos y se ofrecen como **sugerencias agrupadas** en Alistar:
   - colLin {l}: columnas dibujadas con líneas sueltas (rectángulos «explotados») en la capa de columnas;
   - colLay {l}: figuras cerradas de tamaño de columna en otra capa (p. ej. la del achurado), en los cruces de ejes;
   - clsVig {w,h}: rectángulos largos y angostos en la capa de columnas que unen columnas: son vigas (sus bordes pasan a caras);
   - vigLay {l}: una capa con pares de líneas paralelas a 0,15–0,60 m: caras de vigas.
   Al aceptar una, se guarda como **corrección por regla** en `plb.fix` (como `colDelSz`: nunca una por objeto), se deshace desde
   «Correcciones» y pasa sola a la revisión siguiente. Un plano listo no cambia hasta que alguien acepta. */

const DXF_COL0=0.2,DXF_COL1=1.5,DXF_XNEAR=1;   /* m: tamaño de columna y distancia a un cruce de ejes */
/** segmentos de una capa (líneas y tramos de polilíneas; con abiertas=true solo las abiertas) */
function dxfSegsOf(F,l,abiertas){const S=[];for(const e of F){if(e.l!==l)continue;if(e.k==='l')S.push(e.p);
  else if(e.k==='p'&&(!abiertas||!e.c)){const A=e.P,n=A.length;for(let i=0;i+3<n;i+=2)S.push([A[i],A[i+1],A[i+2],A[i+3]]);if(e.c&&n>=6)S.push([A[n-2],A[n-1],A[0],A[1]])}}return S}
/** «rectángulo» de columna: lados entre DXF_COL0 y DXF_COL1 */
const dxfColSz=(P,mpp)=>{const z=dxfSz(P,mpp);return z[0]>=DXF_COL0-0.005&&z[1]>=DXF_MIN_COL-0.005&&z[1]<=DXF_COL1+0.005};   /* lado mayor ≥ DXF_MIN_COL, como dxfRoles */
/** rectángulos armados con segmentos sueltos (cuatro esquinas unidas por segmentos), del tamaño de una columna */
function dxfRings(S,mpp){const q=v=>Math.round(v*mpp*100);const key=(x,y)=>q(x)+','+q(y);const adj=new Map(),pos=new Map();
  const add=(a,b)=>{let s=adj.get(a);if(!s)adj.set(a,s=new Set());s.add(b)};
  for(const s of S){const a=key(s[0],s[1]),b=key(s[2],s[3]);if(a===b)continue;pos.set(a,[s[0],s[1]]);pos.set(b,[s[2],s[3]]);add(a,b);add(b,a)}
  const out=[],seen=new Set();
  const MAXG=12;   /* nodos con muchas líneas (cruces de muros, achurados): no se buscan ahí */
  for(const[u,Nu]of adj){const nb=[...Nu];if(nb.length>MAXG)continue;
    for(let i=0;i<nb.length;i++)for(let j=i+1;j<nb.length;j++){const v=nb[i],w=nb[j];const Nv=adj.get(v),Nw=adj.get(w);if(!Nv||!Nw||Nv.size>MAXG||Nw.size>MAXG)continue;
      for(const x of Nv){if(x===u||!Nw.has(x))continue;const k=[u,v,x,w].sort().join('|');if(seen.has(k))continue;const P=[...pos.get(u),...pos.get(v),...pos.get(x),...pos.get(w)];
        const xs=P.filter((t,i)=>!(i%2)),ys=P.filter((t,i)=>i%2);const bb=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));
        /* se marca vista solo al aceptarla: con diagonales en X la figura cruzada (área 0) no tapa el rectángulo de las mismas esquinas */
        if(bb>0&&dxfAreaP(P)>=bb*0.9&&dxfColSz(P,mpp)){seen.add(k);out.push(P)}}}}
  return out}
/** dentro de los ejes + 1,5 m (como dxfRoles) */
function dxfInR(E,mpp){if(!E.length)return()=>true;const xs=E.flatMap(e=>[e.p[0],e.p[2]]),ys=E.flatMap(e=>[e.p[1],e.p[3]]);const mg=1.5/mpp;
  const x0=Math.min(...xs)-mg,x1=Math.max(...xs)+mg,y0=Math.min(...ys)-mg,y1=Math.max(...ys)+mg;return(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1}
const dxfInCol=(col,c)=>col.some(q=>dxfPip(q.p,c.x,c.y));
/** figuras cerradas de tamaño de columna de una capa (dentro de los ejes, sin las que ya son columnas) */
function dxfColsOf(F,l,mpp,inR,col){const o=[];for(const e of F){if(e.l!==l||e.k!=='p'||!e.c||e.P.length<6)continue;const c=dxfCen(e.P);if(!inR(c.x,c.y)||!dxfColSz(e.P,mpp)||dxfInCol(col,c)||dxfInCol(o,c))continue;o.push({p:e.P.slice(),add:1})}return o}
/** bordes de un polígono como segmentos */
const dxfEdges=P=>{const o=[],n=P.length;for(let i=0;i+3<n;i+=2)o.push([P[i],P[i+1],P[i+2],P[i+3]]);if(n>=6)o.push([P[n-2],P[n-1],P[0],P[1]]);return o};
const dxfSegK=(s,mpp)=>{const a=[s[0],s[1],s[2],s[3]].map(v=>Math.round(v*mpp*100));   /* la misma grilla de 1 cm que dxfRings */return a[0]<a[2]||(a[0]===a[2]&&a[1]<=a[3])?a.join(','):[a[2],a[3],a[0],a[1]].join(',')};
/** ¿rectángulo largo y angosto de viga (≤ 0,60 m × ≥ 1,5 m) que toca columnas en sus dos extremos? */
function dxfEsViga(q,col,mpp){const z=dxfSz(q.p,mpp);if(!(z[0]<=0.6&&z[1]>=1.5&&z[1]>=z[0]*4))return false;const xs=q.p.filter((v,i)=>!(i%2)),ys=q.p.filter((v,i)=>i%2);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),hz=x1-x0>y1-y0,t=0.15/mpp;
  const ends=hz?[[x0,(y0+y1)/2],[x1,(y0+y1)/2]]:[[(x0+x1)/2,y0],[(x0+x1)/2,y1]];
  return ends.every(([x,y])=>col.some(c=>c!==q&&!dxfSameSz(c.p,z,mpp)&&dxfBoxD(c.p,x,y)<=t))}
const dxfSameSz=(P,z,mpp)=>{const w=dxfSz(P,mpp);return Math.abs(w[0]-z[0])<0.006&&Math.abs(w[1]-z[1])<0.006};
const dxfBoxD=(P,x,y)=>{const xs=P.filter((v,i)=>!(i%2)),ys=P.filter((v,i)=>i%2);const dx=Math.max(Math.min(...xs)-x,0,x-Math.max(...xs)),dy=Math.max(Math.min(...ys)-y,0,y-Math.max(...ys));return Math.hypot(dx,dy)};
/** pares de segmentos paralelos (horizontales o verticales) a 0,15–0,60 m que se solapan ≥ 1 m */
function dxfPares(S,mpp,E){const d0=0.15/mpp,d1=0.6/mpp,ov=1/mpp,tol=0.02,ax=0.6/mpp;let n=0;
  /* el eje del par tiene que quedar a ≤ 0,60 m de un eje de la planta de la misma dirección (así una losa aligerada o un rayado no cuentan) */
  const pos=hz=>(E||[]).filter(e=>palIsV(e.p)!==hz).map(e=>hz?(e.p[1]+e.p[3])/2:(e.p[0]+e.p[2])/2);
  for(const hz of[true,false]){const A=pos(hz);const L=S.map(s=>hz?[Math.min(s[0],s[2]),Math.max(s[0],s[2]),(s[1]+s[3])/2,Math.abs(s[3]-s[1])]:[Math.min(s[1],s[3]),Math.max(s[1],s[3]),(s[0]+s[2])/2,Math.abs(s[2]-s[0])])
      .filter(a=>a[1]-a[0]>=ov&&a[3]<=(a[1]-a[0])*tol).sort((a,b)=>a[2]-b[2]);
    for(let i=0;i<L.length&&L.length<=6000;i++)for(let j=i+1;j<L.length&&L[j][2]-L[i][2]<=d1;j++){if(L[j][2]-L[i][2]<d0)continue;if(Math.min(L[i][1],L[j][1])-Math.max(L[i][0],L[j][0])>=ov&&A.some(a=>Math.abs(a-(L[i][2]+L[j][2])/2)<=ax)){n++;break}}}
  return n}

/** las reglas aceptadas sobre lo leído del DXF (las llama dxfRolesFix, en el orden de las correcciones) */
function dxfRegla(f,R,F,mpp,lay){const inR=dxfInR(R.ej,mpp);
  switch(f.k){
    case'colLin':{const S=dxfSegsOf(F,f.l,true).filter(s=>inR((s[0]+s[2])/2,(s[1]+s[3])/2));const rings=dxfRings(S,mpp).filter(P=>!dxfInCol(R.col,dxfCen(P)));
      const used=new Set(rings.flatMap(P=>dxfEdges(P).map(s=>dxfSegK(s,mpp))));R.col=R.col.concat(rings.map(p=>({p,add:1})));R.ln=dxfLnFilter(R.ln,s=>!used.has(dxfSegK(s,mpp)));break}
    case'colLay':R.col=R.col.concat(dxfColsOf(F,f.l,mpp,inR,R.col));break;
    /* solo los que tocan columnas en sus dos puntas (lo mismo que se sugirió); pasan a caras sus dos lados largos */
    case'clsVig':{const V=R.col.filter(q=>dxfSameSz(q.p,[f.w,f.h],mpp)&&dxfEsViga(q,R.col,mpp));if(!V.length)break;R.col=R.col.filter(q=>!V.includes(q));
      R.ln=R.ln.concat(V.flatMap(q=>dxfEdges(q.p).sort((a,b)=>Math.hypot(b[2]-b[0],b[3]-b[1])-Math.hypot(a[2]-a[0],a[3]-a[1])).slice(0,2)).flat());break}
    case'vigLay':{if((lay.vig||[]).includes(f.l))break;const S=dxfSegsOf(F,f.l,false).filter(s=>{const c={x:(s[0]+s[2])/2,y:(s[1]+s[3])/2};return inR(c.x,c.y)&&!dxfInCol(R.col,c)});R.ln=R.ln.concat(S.flat());break}}}
const dxfLnFilter=(ln,ok)=>{const o=[];for(let i=0;i+3<ln.length;i+=4){const s=ln.slice(i,i+4);if(ok(s))o.push(...s)}return o};
/** los tipos de corrección que son reglas (sin coordenadas): palFixCarry las aplica antes de verificar las demás */
const DXF_REGLAS=['colLin','colLay','clsVig','vigLay'];

/** sugerencias para un plano de estructuras: [{k, l?, w?, h?, n, t (texto), pts}] sin las ya aceptadas */
function dxfSug(G,lay,mpp,R,fix,F){F=F||dxfGeoF(G);const BY=new Map();for(const e of F){let a=BY.get(e.l);if(!a)BY.set(e.l,a=[]);a.push(e)}const inR=dxfInR(R.ej,mpp);const X=typeof palCross==='function'?palCross(R.ej):[];
  const near=c=>X.some(x=>Math.hypot(x.x-c.x,x.y-c.y)*mpp<=DXF_XNEAR);const has=f=>((fix&&fix.L)||[]).some(g=>g.k===f.k&&(g.l||'')===(f.l||'')&&(g.w==null||Math.abs(g.w-f.w)<0.006&&Math.abs(g.h-f.h)<0.006));
  const out=[];const push=f=>{if(!has(f))out.push(f)};
  /* columnas con líneas sueltas en la capa de columnas */
  if(lay.col){const rings=dxfRings(dxfSegsOf(BY.get(lay.col)||[],lay.col,true).filter(s=>inR((s[0]+s[2])/2,(s[1]+s[3])/2)),mpp).filter(P=>!dxfInCol(R.col,dxfCen(P)));const n=rings.filter(P=>near(dxfCen(P))).length;
    if(n>=2)push({k:'colLin',l:lay.col,n,t:`${rings.length} columna(s) dibujadas con líneas sueltas en la capa ${lay.col} (${n} en cruces de ejes): tomarlas como columnas.`,pts:rings.map(dxfCen)})}
  /* columnas en otra capa (p. ej. el achurado) */
  const skip=new Set([lay.col,lay.ej,lay.amb,lay.tx,lay.mur].filter(Boolean));
  for(const[l,Fl]of BY){if(skip.has(l)||!Fl.some(e=>e.k==='p'&&e.c))continue;const C=dxfColsOf(Fl,l,mpp,inR,R.col);if(C.length<2)continue;const n=C.filter(q=>near(dxfCen(q.p))).length;
    if(n>=2&&n>=C.length*0.5)push({k:'colLay',l,n:C.length,t:`${C.length} figura(s) cerradas del tamaño de una columna en la capa ${l} (${n} en cruces de ejes): tomarlas como columnas.`,pts:C.map(q=>dxfCen(q.p))})}
  /* vigas como rectángulos en la capa de columnas */
  const by=new Map();for(const q of R.col){if(!dxfEsViga(q,R.col,mpp))continue;const z=dxfSz(q.p,mpp),k=z.join('x');let g=by.get(k);if(!g)by.set(k,g={z,L:[]});g.L.push(q)}
  for(const{z,L}of by.values())push({k:'clsVig',w:z[0],h:z[1],n:L.length,t:`${L.length} rectángulo(s) de ${pal2(z[0])}×${pal2(z[1])} m que unen columnas parecen vigas: tratarlos como vigas (sus bordes pasan a caras).`,pts:L.map(q=>dxfCen(q.p))});
  /* caras de vigas en otra capa */
  const vig=new Set(lay.vig||[]);for(const[l,Fl]of BY){if(vig.has(l)||skip.has(l))continue;let S=dxfSegsOf(Fl,l,false);if(S.length<6)continue;S=S.filter(s=>inR((s[0]+s[2])/2,(s[1]+s[3])/2));
    if(S.length<6||dxfPares(S,mpp,R.ej)<3)continue;S=S.filter(s=>!dxfInCol(R.col,{x:(s[0]+s[2])/2,y:(s[1]+s[3])/2}));const n=dxfPares(S,mpp,R.ej);if(n>=3&&n*2>=S.length*0.3)push({k:'vigLay',l,n,t:`La capa ${l} tiene ${n} par(es) de líneas paralelas a 0,15–0,60 m: parecen caras de vigas. Tomarlas como caras.`,pts:S.slice(0,40).map(s=>({x:(s[0]+s[2])/2,y:(s[1]+s[3])/2}))})}
  return out}
/** texto de una regla para la lista de correcciones */
function dxfReglaTxt(f){switch(f.k){case'colLin':return`Columnas con líneas sueltas de la capa ${f.l}`;case'colLay':return`Columnas de la capa ${f.l}`;
  case'clsVig':return`Rectángulos de ${pal2(f.w)}×${pal2(f.h)} m tratados como vigas`;case'vigLay':return`Caras de vigas de la capa ${f.l}`}return f.k}
