"use strict";
/* LPS 911 · Planos › láminas en DXF (31-10-2026, decidido con el dueño; docs/ia/planos.md «Láminas en DXF»).
   - Una revisión puede ser un DXF en vez de un PDF (las plantas: así tienen geometría). Un plano por archivo; el dibujo puede estar en el
     espacio modelo o en una presentación (layout) con ventanas al modelo: se elige solo (la presentación con ventanas, si la hay).
   - Se lee en la PC de quien carga y se dibuja a 300 ppp (modelo: como si fuera 1/100; presentación: el papel a tamaño real) en los mismos
     mosaicos que un PDF. Más simple que el ploteo (una fuente, grises), con la geometría exacta. La calibración (`cal`) sale del DXF.
   - Se suben también el DXF comprimido (`orig.dxf.gz`), la geometría por capa en píxeles del nivel de detalle (`geo.json.gz`) y el índice de
     texto (Buscar en el contenido). La geometría la usan Medir (se pega a líneas y esquinas) y Casco (ejes, columnas y caras, casco-dxf.js).
   - No depende de un proyectista: capas por función (sugeridas por nombre y contenido, se corrigen en «Capas del DXF…»), unidades por la
     separación de los ejes o por las medidas del dibujo, objetos lejanos fuera de la lámina. */

const DXF_MIN_COL=0.30;      /* columnas: lo menor (m) se ignora */
const DXF_SEC=/\(\s*\.?\d+(?:[.,]\d+)?\s*[xX×]\s*(?:\.?\d+(?:[.,]\d+)?|var\.?)\s*\)/i;
const DXF_NAME=/^V[A-Z]{0,3}\s*-?\s*\d+[A-Z']*$/i;
const DXF_PXM=300/25.4*10;   /* px por metro a 1/100 y 300 ppp (118,1): 1 m = 10 mm de papel */
const DXF_ROLES=[['ej','Ejes (líneas con su burbuja)'],['col','Columnas y placas'],['mur','Muros'],['amb','Ambientes (polilíneas cerradas)'],['tx','Rótulos de sección «(.50x.65)»']];

/* ---------- lector (funciones puras) ---------- */
/** texto de AutoCAD sin formato: %%c → Ø, códigos de MTEXT fuera; \P separa renglones (lines=true: lista) */
function dxfTxt(s,lines){const t=String(s||'').replace(/\\S([^;]*);/g,(m,a)=>a.replace(/[\^#]/g,'/')).replace(/\\[ACFHQTWfp][^;]*;/g,'').replace(/\\[LlOoKkNX~]/g,'').replace(/[{}]/g,'')
  .replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,'');const L=t.split(/\\P/).map(x=>x.replace(/\s+/g,' ').trim());return lines?L.filter(Boolean):L.filter(Boolean).join(' ')}
const DXF_KEEP=new Set(['LINE','LWPOLYLINE','POLYLINE','CIRCLE','ARC','ELLIPSE','SPLINE','TEXT','MTEXT','INSERT','DIMENSION','HATCH','SOLID','LEADER','VIEWPORT']);
const DXF_RAW=new Set(['HATCH','SPLINE','LEADER']);
/** DXF de texto → {ver, ins ($INSUNITS), layers: Map(nombre → {c, off, frz, np, lt, lw}), blocks: Map(nombre → {x,y,ents}), ents (modelo), paper (presentación activa)} */
function dxfParse(txt){if(/^AutoCAD Binary DXF/.test(txt.slice(0,22)))throw new Error('El DXF está en formato binario: guárdalo como DXF de texto (ASCII).');
  const L=txt.split(/\r\n|\n|\r/);const out={ver:'',ins:0,layers:new Map(),blocks:new Map(),ents:[],paper:[]};
  let sec='',hv='',cur=null,blk=null,par=null;
  const fin=()=>{const e=cur;cur=null;if(!e)return;const t=e.t;
    if(t==='LAYER'&&sec==='TABLES'){if(e.n)out.layers.set(e.n,{c:Math.abs(e.col||7),off:(e.col||0)<0,frz:!!((e.fl||0)&1),np:e.c290===0,lt:e.lt||'',lw:e.lw>0?e.lw:null});return}
    if(t==='BLOCK'){blk={n:e.n||'',x:e.x||0,y:e.y||0,ents:[]};out.blocks.set(blk.n,blk);return}
    if(t==='ENDBLK'){blk=null;return}
    if(t==='VERTEX'){if(par&&par.t==='POLYLINE'){if(!((e.fl||0)&16))par.P.push(e.x||0,e.y||0);par.B.push(e.b||0)}return}
    if(t==='ATTRIB'){if(par&&par.t==='INSERT'&&!((e.fl||0)&1))par.att.push(e);return}
    if(t==='SEQEND'){par=null;return}
    if(!DXF_KEEP.has(t))return;if(sec!=='ENTITIES'&&!(sec==='BLOCKS'&&blk))return;
    if(blk&&sec==='BLOCKS')blk.ents.push(e);else(e.ps?out.paper:out.ents).push(e);if(t==='POLYLINE'||(t==='INSERT'&&e.af))par=e};
  for(let i=0;i+1<L.length;i+=2){const c=+L[i];const v=L[i+1];
    if(c===0){fin();if(v==='EOF')break;cur={t:v};if(v==='LWPOLYLINE'||v==='POLYLINE'){cur.P=[];cur.B=[]}if(v==='INSERT')cur.att=[];if(DXF_RAW.has(v))cur.raw=[];continue}
    if(!cur)continue;const t=cur.t;
    if(t==='SECTION'){if(c===2)sec=v.trim();continue}
    if(sec==='HEADER'){if(c===9)hv=v.trim();else if(hv==='$INSUNITS'&&c===70)out.ins=+v;else if(hv==='$ACADVER'&&c===1)out.ver=v.trim();continue}
    if(cur.stop)continue;if(c===101){cur.stop=true;continue}   /* «Embedded Object» de MTEXT (AutoCAD 2018): repite 10/11/40 y pisaría los verdaderos */
    if(c>=1000||c===100||c===102||c===5||c===330||c===360)continue;
    if(cur.raw)cur.raw.push([c,v]);
    switch(c){case 8:cur.l=v.trim();break;case 67:cur.ps=+v===1;break;case 62:cur.col=+v;break;case 6:cur.lt=v.trim();break;case 370:cur.lw=+v;break;case 290:cur.c290=+v;break;
      case 10:if(t==='LWPOLYLINE'){cur.P.push(+v,0);cur.B.push(0)}else cur.x=+v;break;
      case 20:if(t==='LWPOLYLINE')cur.P[cur.P.length-1]=+v;else cur.y=+v;break;
      case 11:cur.x2=+v;break;case 21:cur.y2=+v;break;case 12:cur.x3=+v;break;case 22:cur.y3=+v;break;case 13:cur.x4=+v;break;case 23:cur.y4=+v;break;case 14:cur.x5=+v;break;case 24:cur.y5=+v;break;
      case 40:cur.r=+v;break;case 41:cur.sx=+v;break;case 42:if(t==='LWPOLYLINE')cur.B[cur.B.length-1]=+v;else if(t==='VERTEX')cur.b=+v;else if(t==='DIMENSION')cur.m=+v;else cur.sy=+v;break;
      case 44:cur.c44=+v;break;case 45:cur.c45=+v;break;case 50:cur.a=+v;break;case 51:cur.a1=+v;break;
      case 68:cur.c68=+v;break;case 69:cur.c69=+v;break;case 70:cur.fl=+v;break;case 66:cur.af=+v===1;break;
      case 71:cur.at=+v;break;case 72:cur.h72=+v;break;case 73:cur.v73=+v;break;case 74:cur.v74=+v;break;
      case 1:cur.s=(cur.s3||'')+v;break;case 3:cur.s3=(cur.s3||'')+v;break;case 2:cur.n=v.trim();break;case 230:cur.ez=+v;break}}
  fin();return out}
/** puntos de un arco de polilínea (bulge) de a a b, sin el primero */
function dxfBulgePts(ax,ay,bx,by,b){if(!b)return[bx,by];const th=4*Math.atan(b),d=Math.hypot(bx-ax,by-ay);if(d<1e-12)return[bx,by];
  const r=d/(2*Math.sin(th/2)),h=r*Math.cos(th/2);const cx=(ax+bx)/2-(by-ay)/d*h,cy=(ay+by)/2+(bx-ax)/d*h;const R=Math.abs(r),a0=Math.atan2(ay-cy,ax-cx);
  const n=Math.max(2,Math.ceil(Math.abs(th)/(Math.PI/18)));const o=[];for(let k=1;k<n;k++){const a=a0+th*k/n;o.push(cx+R*Math.cos(a),cy+R*Math.sin(a))}o.push(bx,by);return o}
/** polilínea con arcos → solo vértices */
function dxfPolyPts(P,B,closed){const n=P.length/2;if(!B||!B.some(Boolean))return P.slice();const o=[P[0],P[1]];
  for(let i=0;i<n-(closed?0:1);i++){const j=(i+1)%n;o.push(...dxfBulgePts(P[2*i],P[2*i+1],P[2*j],P[2*j+1],B[i]||0))}if(closed)o.splice(-2,2);return o}
/** arco (centro, radio, ángulos en grados de a0 a a1 antihorario; cw: medidos en sentido horario, como algunos bordes de achurado) → puntos */
function dxfArcPts(cx,cy,r,a0,a1,cw){let A=a0*Math.PI/180,B=a1*Math.PI/180;while(B<=A)B+=2*Math.PI;const n=Math.max(4,Math.ceil((B-A)/(Math.PI/18)));const s=cw?-1:1;const o=[];
  for(let k=0;k<=n;k++){const a=s*(A+(B-A)*k/n);o.push(cx+r*Math.cos(a),cy+r*Math.sin(a))}return o}
/** elipse (centro, eje mayor relativo, razón, parámetros en radianes) → puntos */
function dxfEllPts(cx,cy,mx,my,ra,t0,t1,cw){let B=t1;while(B<=t0)B+=2*Math.PI;const n=Math.max(8,Math.ceil((B-t0)/(Math.PI/24)));const s=cw?-1:1;const o=[];
  for(let k=0;k<=n;k++){const t=s*(t0+(B-t0)*k/n);o.push(cx+mx*Math.cos(t)-my*ra*Math.sin(t),cy+my*Math.cos(t)+mx*ra*Math.sin(t))}return o}
/** spline: De Boor con sus nudos; si no cuadran, los puntos de ajuste o el polígono de control */
function dxfSplinePts(R){const g=c=>R.filter(p=>p[0]===c).map(p=>+p[1]);const deg=g(71)[0]||3,K=g(40),cx=g(10),cy=g(20),W=g(41),fx=g(11),fy=g(21);
  const n=cx.length;if(n>deg&&K.length===n+deg+1){const o=[];const t0=K[deg],t1=K[n];const N=Math.max(8,n*8);
    for(let s=0;s<=N;s++){let t=t0+(t1-t0)*s/N;if(s===N)t=t1-1e-9;let k=deg;while(k<n-1&&!(t>=K[k]&&t<K[k+1]))k++;
      const d=[];for(let j=0;j<=deg;j++){const i=k-deg+j,w=W[i]||1;d.push([cx[i]*w,cy[i]*w,w])}
      for(let r=1;r<=deg;r++)for(let j=deg;j>=r;j--){const i=k-deg+j;const a=(t-K[i])/((K[i+deg-r+1]-K[i])||1);for(let q=0;q<3;q++)d[j][q]=(1-a)*d[j-1][q]+a*d[j][q]}
      o.push(d[deg][0]/d[deg][2],d[deg][1]/d[deg][2])}return o}
  if(fx.length>1)return fx.flatMap((x,i)=>[x,fy[i]]);return cx.flatMap((x,i)=>[x,cy[i]])}
/** bordes de un achurado → lazos (puntos) en su sistema; solid: relleno sólido */
function dxfHatch(R){let i=R.findIndex(p=>p[0]===91);const out={loops:[],solid:R.some(p=>p[0]===70&&+p[1]===1),pat:(R.find(p=>p[0]===2)||[0,''])[1].trim()};if(i<0)return out;const np=+R[i][1];i++;
  const at=c=>i<R.length&&R[i][0]===c;const nx=c=>{while(i<R.length&&R[i][0]!==c){if(R[i][0]===92&&c!==92)return NaN;i++}return i<R.length?+R[i++][1]:NaN};
  for(let k=0;k<np;k++){const fl=nx(92);if(Number.isNaN(fl))break;let P=[];
    if(fl&2){const hb=nx(72),cl=nx(73),m=nx(93);const Q=[],B=[];for(let j=0;j<m;j++){Q.push(nx(10),nx(20));let b=0;if(hb&&at(42)){b=+R[i][1];i++}B.push(b)}P=dxfPolyPts(Q,B,true)}
    else{const ne=nx(93);for(let j=0;j<ne;j++){const ty=nx(72);
      if(ty===1){const a=[nx(10),nx(20),nx(11),nx(21)];if(!P.length)P.push(a[0],a[1]);P.push(a[2],a[3])}
      else if(ty===2){const x=nx(10),y=nx(20),r=nx(40),a0=nx(50),a1=nx(51),ccw=nx(73);P.push(...dxfArcPts(x,y,r,a0,a1,!ccw))}
      else if(ty===3){const x=nx(10),y=nx(20),mx=nx(11),my=nx(21),ra=nx(40),a0=nx(50)*Math.PI/180,a1=nx(51)*Math.PI/180,ccw=nx(73);P.push(...dxfEllPts(x,y,mx,my,ra,a0,a1,!ccw))}
      else if(ty===4){nx(94);nx(73);nx(74);const nk=nx(95),nc=nx(96);for(let q=0;q<nk;q++)nx(40);for(let q=0;q<nc;q++){P.push(nx(10),nx(20));if(at(42))i++}if(at(97)){const nf=nx(97);for(let q=0;q<nf;q++){nx(11);nx(21)}}}
      else break}}
    if(P.length>=6&&P.every(Number.isFinite))out.loops.push(P)}
  return out}
const dxfLtOf=s=>/HIDDEN|OCULT|DASHED|TRAZOS|^DASH$|DASH\d|SEGM/i.test(s)?'h':/CENTER|CENTRO|EJE|DASHDOT|PHANTOM|DIVIDE|BORDER/i.test(s)?'c':/DOT|PUNT/i.test(s)?'d':'';
/** bloques explotados (escala, giro, simetría, matrices) con su estilo efectivo → lista plana en coordenadas del dibujo:
    {k:'l', p} · {k:'p', P, c (cerrada)} · {k:'c', x,y,r} · {k:'f', R:[lazos], so (sólido)} · {k:'t', t, L (renglones), x,y (centro), h, r (°)}; todos con l, ci, lt, lw.
    Se saltan las capas apagadas, congeladas, que no se plotean y Defpoints. */
function dxfFlat(D,ents,M0){const out=[];const LY=D.layers;const ap=(M,x,y)=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];
  const mul=(A,B)=>[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];
  const hid=l=>{const y=LY.get(l);return/^defpoints$/i.test(l)||!!(y&&(y.off||y.frz||y.np))};
  const tr=(M,mir,P)=>{const o=[];for(let i=0;i+1<P.length;i+=2)o.push(...ap(M,mir?-P[i]:P[i],P[i+1]));return o};
  const txt=(e,M,mir,st,l)=>{const Ls=dxfTxt(e.s,true);if(!Ls.length)return;const h=e.r>0?e.r:0.2;const nl=Ls.length,len=Math.max(...Ls.map(s=>s.length));const w=h*0.62*len,hh=h*(1+(nl-1)*1.6);
    const R=e.t==='MTEXT'&&e.x2!=null&&e.y2!=null?Math.atan2(e.y2,e.x2):(e.a||0)*Math.PI/180;let ax=e.x||0,ay=e.y||0,dx,dy;
    if(e.t==='MTEXT'){const at=e.at||1;const col=(at-1)%3,row=Math.floor((at-1)/3);dx=[w/2,0,-w/2][col];dy=[-hh/2,0,hh/2][row]}
    else{const H=e.h72||0,V=e.t==='ATTRIB'?(e.v74||0):(e.v73||0);
      if((H||V)&&e.x2!=null){if(H===3||H===5){ax=(ax+e.x2)/2;ay=(ay+(e.y2??ay))/2;dx=0;dy=h/2}else{ax=e.x2;ay=e.y2;dx=H===1||H===4?0:H===2?-w/2:w/2;dy=H===4?0:V===3?-h/2:V===2?0:h/2}}
      else{dx=w/2;dy=h/2}}
    const cx=ax+dx*Math.cos(R)-dy*Math.sin(R),cy=ay+dx*Math.sin(R)+dy*Math.cos(R);const p=ap(M,mir?-cx:cx,cy);const k=Math.hypot(M[0],M[1]);const rot=Math.atan2(M[1],M[0])+(mir?Math.PI-R:R);
    out.push({k:'t',...st,l,t:Ls.join(' '),L:Ls,x:p[0],y:p[1],h:h*k,r:Math.round(rot*180/Math.PI)})};
  const walk=(ents,M,lay,inh,d)=>{for(const e of ents){const l=(!e.l||e.l==='0')&&lay?lay:(e.l||'0');if(hid(l))continue;
    const y=LY.get(l)||{};let ci=e.col;if(ci==null||ci===256)ci=y.c;else if(ci===0)ci=inh.ci;let lt=e.lt;if(!lt||/^bylayer$/i.test(lt))lt=y.lt;else if(/^byblock$/i.test(lt))lt=inh.lt;
    let lw=e.lw;if(lw==null||lw===-1)lw=y.lw;else if(lw===-2)lw=inh.lw;else if(lw<0)lw=null;const st={ci:Math.abs(ci||7),lt:dxfLtOf(lt||''),lw:lw>0?lw:null};const mir=e.ez<0;
    switch(e.t){case'LINE':out.push({k:'l',...st,l,p:[...ap(M,e.x||0,e.y||0),...ap(M,e.x2||0,e.y2||0)]});break;
      case'LWPOLYLINE':case'POLYLINE':{const c=!!((e.fl||0)&1);const P=tr(M,mir,dxfPolyPts(e.P,e.B,c));if(P.length>=4)out.push({k:'p',...st,l,P,c});break}
      case'CIRCLE':{const c=ap(M,mir?-(e.x||0):(e.x||0),e.y||0);const s=Math.sqrt(Math.abs(M[0]*M[3]-M[1]*M[2]));out.push({k:'c',...st,l,x:c[0],y:c[1],r:(e.r||0)*s});break}
      case'ARC':{const P=tr(M,mir,dxfArcPts(e.x||0,e.y||0,e.r||0,e.a||0,e.a1||360));out.push({k:'p',...st,l,P,c:false});break}
      case'ELLIPSE':{const P=tr(M,mir,dxfEllPts(e.x||0,e.y||0,e.x2||0,e.y2||0,e.r||1,e.sx||0,e.sy??2*Math.PI));out.push({k:'p',...st,l,P,c:false});break}
      case'SPLINE':{const P=tr(M,false,dxfSplinePts(e.raw));if(P.length>=4)out.push({k:'p',...st,l,P,c:!!((e.fl||0)&1)});break}
      case'LEADER':{const P=tr(M,false,e.raw.filter(p=>p[0]===10||p[0]===20).map(p=>+p[1]));if(P.length>=4)out.push({k:'p',...st,l,P,c:false});break}
      case'SOLID':{const P=tr(M,mir,[e.x||0,e.y||0,e.x2||0,e.y2||0,e.x4??e.x3??0,e.y4??e.y3??0,e.x3||0,e.y3||0]);out.push({k:'f',...st,l,R:[P],so:true});break}
      case'HATCH':{const H=dxfHatch(e.raw);if(H.loops.length)out.push({k:'f',...st,l,R:H.loops.map(P=>tr(M,mir,P)),so:H.solid,pat:H.pat});break}
      case'TEXT':case'MTEXT':case'ATTRIB':txt(e,M,mir,st,l);break;
      case'DIMENSION':{const B=D.blocks.get(e.n);if(B&&d<8)walk(B.ents,M,l,st,d+1);
        /* la cota en sí (para verificar la escala, planos-alistar.js): medida real, texto escrito a mano y el que muestra, puntos medidos */
        if(e.m>0&&e.x4!=null&&e.x5!=null&&((e.fl||0)&7)<2){const tb=B&&B.ents.find(q=>q.t==='MTEXT'||q.t==='TEXT');out.push({k:'d',...st,l,m:e.m,s:e.s&&!e.s.includes('<>')?dxfTxt(e.s):'',sh:tb?dxfTxt(tb.s):'',p:[...ap(M,e.x4,e.y4),...ap(M,e.x5,e.y5)],sc:Math.hypot(M[0],M[1])})}break}
      case'INSERT':{const B=D.blocks.get(e.n);if(!B||d>8)break;const sx=e.sx||1,sy=e.sy||sx,r=(e.a||0)*Math.PI/180,co=Math.cos(r),si=Math.sin(r);const nc=Math.max(1,Math.min(50,e.fl||1)),nr=Math.max(1,Math.min(50,e.at||1));
        for(let rr=0;rr<nr;rr++)for(let cc=0;cc<nc;cc++){const ox=cc*(e.c44||0),oy=rr*(e.c45||0);let T=[co*sx,si*sx,-si*sy,co*sy,0,0];T[4]=(e.x||0)+co*ox-si*oy-(T[0]*B.x+T[2]*B.y);T[5]=(e.y||0)+si*ox+co*oy-(T[1]*B.x+T[3]*B.y);if(mir)T=mul([-1,0,0,1,0,0],T);
          walk(B.ents,mul(M,T),l,st,d+1)}
        for(const a of e.att||[])walk([a],M,l,st,d+1);break}}}};
  walk(ents,M0||[1,0,0,1,0,0],'',{ci:7,lt:'',lw:null},0);return out}
/** caja de una entidad plana (para extensiones) */
function dxfBox(e){if(e.k==='l'||e.k==='d')return[Math.min(e.p[0],e.p[2]),Math.min(e.p[1],e.p[3]),Math.max(e.p[0],e.p[2]),Math.max(e.p[1],e.p[3])];
  if(e.k==='c')return[e.x-e.r,e.y-e.r,e.x+e.r,e.y+e.r];
  if(e.k==='t'){const L=e.L||[e.t||''];const w=e.h*0.62*Math.max(1,...L.map(s=>s.length))/2,h=e.h*(1+(L.length-1)*1.6)/2;const a=(e.r||0)*Math.PI/180,c=Math.abs(Math.cos(a)),si=Math.abs(Math.sin(a));const X=w*c+h*si,Y=w*si+h*c;return[e.x-X,e.y-Y,e.x+X,e.y+Y]}
  const A=e.k==='f'?e.R.flat():e.P;let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(let i=0;i+1<A.length;i+=2){if(A[i]<x0)x0=A[i];if(A[i]>x1)x1=A[i];if(A[i+1]<y0)y0=A[i+1];if(A[i+1]>y1)y1=A[i+1]}return[x0,y0,x1,y1]}
/** extensión robusta: los objetos lejanos (sueltos, invisibles a la vista) quedan fuera; cercas a 3 rangos intercuartiles de los centros.
    Devuelve {box, keep (lista), far (cuántos)} */
function dxfExt(F){if(!F.length)return{box:[0,0,1,1],keep:[],far:0};const B=F.map(dxfBox);const cx=B.map(b=>(b[0]+b[2])/2).sort((a,b)=>a-b),cy=B.map(b=>(b[1]+b[3])/2).sort((a,b)=>a-b);
  const q=(A,p)=>A[Math.min(A.length-1,Math.max(0,Math.round(p*(A.length-1))))];const fence=A=>{const a=q(A,.25),b=q(A,.75),r=Math.max(b-a,(A[A.length-1]-A[0])*0.02,1e-9);return[a-3*r,b+3*r]};
  const[lx,hx]=fence(cx),[ly,hy]=fence(cy);
  const keep=[],box=[Infinity,Infinity,-Infinity,-Infinity];F.forEach((e,i)=>{const b=B[i],x=(b[0]+b[2])/2,y=(b[1]+b[3])/2;if(x<lx||x>hx||y<ly||y>hy)return;keep.push(e);box[0]=Math.min(box[0],b[0]);box[1]=Math.min(box[1],b[1]);box[2]=Math.max(box[2],b[2]);box[3]=Math.max(box[3],b[3])});
  if(!keep.length)return{box:[0,0,1,1],keep:[],far:F.length};return{box,keep,far:F.length-keep.length}}
/** capas con lo que tienen (para el diálogo) */
function dxfLayers(F){const m=new Map();for(const e of F){let o=m.get(e.l);if(!o)m.set(e.l,o={n:e.l,l:0,p:0,c:0,t:0,s:0,cl:0});if(e.k==='l')o.l++;else if(e.k==='p'){o.p++;if(e.c)o.cl++}else if(e.k==='c')o.c++;else if(e.k==='t'){o.t++;if(DXF_SEC.test(e.t))o.s++}}
  return[...m.values()].sort((a,b)=>a.n.localeCompare(b.n))}
/** capas sugeridas por su nombre y su contenido (sirven para cualquier proyectista; se corrigen a mano) */
function dxfGuess(Ls){const by=(A,k)=>A.slice().sort((a,b)=>b[k]-a[k])[0];
  const ej=by(Ls.filter(x=>/EJE|GRID|AXIS/i.test(x.n)&&!/TEXT|COTA/i.test(x.n)),'c')||by(Ls.filter(x=>x.c>4&&x.t>4&&x.l>2),'c');
  const col=by(Ls.filter(x=>/COLUM|PLACA|COLUMN/i.test(x.n)&&!/TEXT|NOMB|ACHUR/i.test(x.n)),'p');
  const mur=by(Ls.filter(x=>/MURO|WALL|TABIQ|ALBA/i.test(x.n)&&!/TEXT|COTA|ACHUR/i.test(x.n)),'l');
  const amb=by(Ls.filter(x=>/AMBIENT|AREA|ÁREA|ROOM|ESPACIO/i.test(x.n)&&x.cl>0),'cl');
  /* caras: capas de trazo con líneas de verdad; una capa con muy pocas (p. ej. «A-TRAZO» con las 2 bandas de contracción de la E-19) no entra */
  const vc=Ls.filter(x=>/TRAZO|VIGA|BEAM|CONTORNO/i.test(x.n)&&!/VIGUETA|TEXT|COTA|ACERO/i.test(x.n)&&(x.l+x.p));const vmx=Math.max(0,...vc.map(x=>x.l+x.p));
  const vig=vc.filter(x=>x.l+x.p>=vmx*0.05).map(x=>x.n);
  const tx=by(Ls.filter(x=>x.s>0),'s');return{ej:ej?ej.n:'',col:col?col.n:'',mur:mur?mur.n:'',amb:amb?amb.n:'',vig,tx:tx?tx.n:''}}
/** ejes de la capa: cada línea con el nombre de su burbuja (círculo con un texto adentro; si no hay, el texto en la prolongación de la línea).
    Líneas del mismo nombre en la misma recta se juntan. En las unidades de F. */
function dxfEjes(F,lay){const Ls=[],C=[],T=[],S=[];if(!lay)return{E:[],sin:0,dup:[],S};for(const e of F){if(e.l!==lay)continue;if(e.k==='l')Ls.push(e.p);else if(e.k==='p'&&e.P.length===4)Ls.push(e.P.slice());else if(e.k==='c')C.push(e);else if(e.k==='t')T.push(e)}
  const nm=s=>String(s).trim().toUpperCase().replace(/\s+/g,'').slice(0,4);
  const B=C.map(c=>{let b=null,bd=c.r*1.25;for(const t of T){const d=Math.hypot(t.x-c.x,t.y-c.y);if(d<bd&&nm(t.t)){bd=d;b=t}}return b?{x:c.x,y:c.y,r:c.r,n:nm(b.t)}:null}).filter(Boolean);
  const out=new Map(),dup=new Set();let sin=0;
  for(const p of Ls){const L=Math.hypot(p[2]-p[0],p[3]-p[1]);if(!(L>0))continue;const ux=(p[2]-p[0])/L,uy=(p[3]-p[1])/L;let n='',bd=Infinity;
    for(const c of B){const dx=c.x-p[0],dy=c.y-p[1];const t=dx*ux+dy*uy,d=Math.abs(dx*uy-dy*ux);if(d>c.r*.6||t<-8*c.r||t>L+8*c.r||(t>L*.2+c.r&&t<L*.8-c.r))continue;const end=Math.min(Math.abs(t),Math.abs(t-L));if(end<bd){bd=end;n=c.n}}
    if(!n)for(const x of T){const h=x.h||1;const dx=x.x-p[0],dy=x.y-p[1];const t=dx*ux+dy*uy,d=Math.abs(dx*uy-dy*ux);if(d>h*1.2||!(t<0||t>L)||Math.min(Math.abs(t),Math.abs(t-L))>h*6||!nm(x.t)||nm(x.t).length>3)continue;const end=Math.min(Math.abs(t),Math.abs(t-L));if(end<bd){bd=end;n=nm(x.t)}}
    if(!n){sin++;S.push({p:p.slice()});continue}
    const o=out.get(n);if(!o){out.set(n,p.slice());continue}
    const OL=Math.hypot(o[2]-o[0],o[3]-o[1])||1,ox=(o[2]-o[0])/OL,oy=(o[3]-o[1])/OL;const off=q=>Math.abs((q[0]-o[0])*oy-(q[1]-o[1])*ox);
    if(off([p[0],p[1]])>L*.01+1e-6||off([p[2],p[3]])>L*.01+1e-6){dup.add(n);S.push({p:p.slice(),dup:n});continue}const s=[0,OL,(p[0]-o[0])*ox+(p[1]-o[1])*oy,(p[2]-o[0])*ox+(p[3]-o[1])*oy];const a=Math.min(...s),b=Math.max(...s);
    out.set(n,[o[0]+ox*a,o[1]+oy*a,o[0]+ox*b,o[1]+oy*b])}
  return{E:[...out].map(([n,p])=>({n,p})),sin,dup:[...dup],S}}   /* S: líneas de la capa sin nombre o con un nombre repetido (para corregirlas en Alistar) */
/** metros por unidad por la separación típica entre ejes paralelos (2–12 m): 1, 0.01 o 0.001; 0 si no hay ejes paralelos */
function dxfUnitK(E){const isV=p=>Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);const gaps=[];
  for(const v of[true,false]){const c=E.filter(e=>isV(e.p)===v).map(e=>v?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2).sort((a,b)=>a-b);for(let i=1;i<c.length;i++)if(c[i]-c[i-1]>1e-9)gaps.push(c[i]-c[i-1])}
  if(!gaps.length)return 0;gaps.sort((a,b)=>a-b);const g=gaps[Math.floor(gaps.length/2)];return g<50?1:g<1500?0.01:0.001}
/** unidades del modelo (m por unidad): por los ejes; si no, $INSUNITS en mm/cm/m; si no, por el tamaño del dibujo */
function dxfUnits(D,Fm,box){const map=dxfGuess(dxfLayers(Fm));if(map.ej){const k=dxfUnitK(dxfEjes(Fm,map.ej).E);if(k)return{k,how:'ejes'}}
  const u={4:0.001,5:0.01,6:1}[D.ins];if(u)return{k:u,how:'unidades'};const S=Math.max(box[2]-box[0],box[3]-box[1]);return{k:S<2000?1:S<20000?0.01:0.001,how:'tamaño'}}

/** marco de la lámina: el rectángulo cerrado más grande (polilínea de 4 lados horizontales y verticales) que ocupa ≥ 50 % del dibujo; o null */
function dxfFrame(F,box){const A=(box[2]-box[0])*(box[3]-box[1]);let best=null,ba=A*0.5;
  for(const e of F){if(e.k!=='p'||!e.c||e.P.length!==8)continue;const P=e.P;let ok=true;for(let i=0;i<4&&ok;i++){const j=(i+1)%4,dx=Math.abs(P[2*j]-P[2*i]),dy=Math.abs(P[2*j+1]-P[2*i+1]);ok=Math.min(dx,dy)<=Math.max(dx,dy)*0.002}
    if(!ok)continue;const b=dxfBox(e),a=(b[2]-b[0])*(b[3]-b[1]);if(a>ba){ba=a;best=b}}return best}
/** recorta la lista al marco: queda lo que lo toca; la caja es el marco */
function dxfCrop(P,fr){return P.filter(e=>{const b=dxfBox(e);return!(b[2]<fr[0]||b[0]>fr[2]||b[3]<fr[1]||b[1]>fr[3])})}
/* ---------- la lámina: modelo o presentación ---------- */
/** {src:'modelo'|'presentación', P (entidades en unidades de la hoja), vps [{x0,y0,x1,y1,s}], box, ppu (px por unidad), W, H, mm, k, how, mpp, far, crop}
    o.crop (por defecto sí): recortar al marco de la lámina si lo tiene, como los PDF */
function dxfSheet(D,o){o=o||{};const Fm=dxfFlat(D,D.ents);
  /* presentaciones con ventanas al modelo (id 1 es la de la hoja) */
  const lays=[];if(D.paper.length)lays.push({n:'',E:D.paper});for(const[n,B]of D.blocks)if(/^\*Paper_Space\d+$/i.test(n)&&B.ents.length)lays.push({n,E:B.ents});
  let best=null;for(const L of lays){const V=L.E.filter(e=>e.t==='VIEWPORT'&&e.c69!==1&&(e.c68==null||e.c68!==0)&&e.r>0&&e.sx>0&&e.c45>0);const a=V.reduce((s,v)=>s+v.r*v.sx,0);if(V.length&&(!best||a>best.a))best={L,V,a}}
  if(best){const Fp=dxfFlat(D,best.L.E.filter(e=>e.t!=='VIEWPORT'));const vps=[];const P=[];
    best.V.forEach((v,i)=>{const s=v.sx/v.c45,tw=(v.a1||0)*Math.PI/180,co=Math.cos(tw)*s,si=Math.sin(tw)*s;const vx=v.x3||0,vy=v.y3||0;
      const M=[co,si,-si,co,(v.x||0)-(co*vx-si*vy),(v.y||0)-(si*vx+co*vy)];const R={x0:v.x-v.r/2,y0:v.y-v.sx/2,x1:v.x+v.r/2,y1:v.y+v.sx/2,s};vps.push(R);
      for(const e of dxfFlat(D,D.ents,M)){const b=dxfBox(e);if(b[2]<R.x0||b[0]>R.x1||b[3]<R.y0||b[1]>R.y1)continue;e.v=i;P.push(e)}});
    const X=dxfExt(Fp.length?Fp:P);let paper=Fp.length?X.keep:[];let box=X.box.slice();for(const R of vps){box[0]=Math.min(box[0],R.x0);box[1]=Math.min(box[1],R.y0);box[2]=Math.max(box[2],R.x1);box[3]=Math.max(box[3],R.y1)}
    const fr=o.crop!==false&&dxfFrame(paper,box);if(fr){paper=dxfCrop(paper,fr);box=fr.slice()}
    const span=Math.max(box[2]-box[0],box[3]-box[1]);const inch=span<100;let ppu=inch?300:300/25.4;if(span*ppu>PL_MAXPX)ppu=PL_MAXPX/span;
    const main=vps.reduce((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)>(a.x1-a.x0)*(a.y1-a.y0)?b:a);const U=dxfUnits(D,Fm,dxfExt(Fm).box);
    const W=Math.ceil((box[2]-box[0])*ppu),H=Math.ceil((box[3]-box[1])*ppu);const mmk=inch?25.4:1;
    return{src:'presentación',P:[...P,...paper],vps,box,ppu,W,H,mm:[Math.round((box[2]-box[0])*mmk),Math.round((box[3]-box[1])*mmk)],k:U.k,how:U.how,mpp:U.k/(main.s*ppu),pmm:ppu/mmk,far:X.far,crop:!!fr}}
  const X=dxfExt(Fm);let box=X.box,keep=X.keep;const U=dxfUnits(D,keep,box);const fr=o.crop!==false&&dxfFrame(keep,box);if(fr){keep=dxfCrop(keep,fr);box=fr.slice()}const span=Math.max(box[2]-box[0],box[3]-box[1])||1;let ppu=DXF_PXM*U.k;
  if(span*ppu>PL_MAXPX)ppu=PL_MAXPX/span;if(span*ppu<3000)ppu=3000/span;const W=Math.ceil((box[2]-box[0])*ppu),H=Math.ceil((box[3]-box[1])*ppu);
  return{src:'modelo',P:keep,vps:[],box,ppu,W,H,mm:[Math.round(W/(300/25.4)),Math.round(H/(300/25.4))],k:U.k,how:U.how,mpp:U.k/ppu,pmm:0.1*ppu/U.k,far:X.far,crop:!!fr}}
/** pasa la hoja a píxeles del nivel de detalle (y hacia abajo) */
function dxfToPx(S){const[x0,,,y1]=S.box,k=S.ppu;const X=x=>(x-x0)*k,Y=y=>(y1-y)*k;const A=P=>{const o=new Array(P.length);for(let i=0;i+1<P.length;i+=2){o[i]=X(P[i]);o[i+1]=Y(P[i+1])}return o};
  for(const e of S.P){if(e.k==='l'||e.k==='d')e.p=A(e.p);else if(e.k==='p')e.P=A(e.P);else if(e.k==='f')e.R=e.R.map(A);else{e.x=X(e.x);e.y=Y(e.y);if(e.r!=null&&e.k==='c')e.r*=k;if(e.k==='t')e.h*=k}}
  S.vps=S.vps.map(R=>({...R,px:[X(R.x0),Y(R.y1),X(R.x1),Y(R.y0)]}));S.px=true;return S}
const DXF_GRAY={8:'#808080',9:'#c0c0c0',250:'#333',251:'#505050',252:'#696969',253:'#828282',254:'#bebebe',255:'#fff'};
/** dibuja la hoja (ya en px) en g desde la fila oy: rellenos, luego líneas (por estilo) y textos; cada ventana recortada a su marco */
function dxfPaint(g,S,oy,sc){sc=sc||1;g.save();g.setTransform(sc,0,0,sc,0,-oy*sc);g.lineCap='round';g.lineJoin='round';const pm=S.pmm;
  const lw=e=>Math.max(1,(e.lw||18)/100*pm);const dash=e=>e.lt==='h'?[2*pm,1*pm]:e.lt==='c'?[6*pm,1*pm,1*pm,1*pm]:e.lt==='d'?[0.3*pm,1*pm]:null;
  const groups=[{clip:null,v:undefined}].concat(S.vps.map((R,i)=>({clip:R.px,v:i})));const y0=oy,y1=oy+g.canvas.height/sc;
  const inV=b=>!(b[3]<y0||b[1]>y1);
  for(const G of groups.slice(1).concat(groups.slice(0,1))){const P=S.P.filter(e=>e.v===G.v);if(!P.length)continue;g.save();if(G.clip){const c=G.clip;g.beginPath();g.rect(c[0],c[1],c[2]-c[0],c[3]-c[1]);g.clip()}
    for(const e of P){if(e.k!=='f')continue;const b=e._b||(e._b=dxfBox(e));if(!inV(b))continue;g.beginPath();for(const R of e.R){g.moveTo(R[0],R[1]);for(let i=2;i<R.length;i+=2)g.lineTo(R[i],R[i+1]);g.closePath()}
      g.fillStyle=e.so?(DXF_GRAY[e.ci]||'#555'):'rgba(0,0,0,.13)';g.fill('evenodd')}
    const by=new Map();for(const e of P){if(e.k==='f'||e.k==='t'||e.k==='d')continue;const b=e._b||(e._b=dxfBox(e));if(!inV(b))continue;const key=[lw(e).toFixed(1),DXF_GRAY[e.ci]||'#000',e.lt].join('|');let pa=by.get(key);if(!pa){pa={p:new Path2D(),e};by.set(key,pa)}
      if(e.k==='l'){pa.p.moveTo(e.p[0],e.p[1]);pa.p.lineTo(e.p[2],e.p[3])}else if(e.k==='p'){pa.p.moveTo(e.P[0],e.P[1]);for(let i=2;i<e.P.length;i+=2)pa.p.lineTo(e.P[i],e.P[i+1]);if(e.c)pa.p.closePath()}else if(e.k==='c'){pa.p.moveTo(e.x+e.r,e.y);pa.p.arc(e.x,e.y,e.r,0,2*Math.PI)}}
    for(const[key,pa]of by){const[w,c]=key.split('|');g.lineWidth=+w;g.strokeStyle=c;g.setLineDash(dash(pa.e)||[]);g.stroke(pa.p)}g.setLineDash([]);
    for(const e of P){if(e.k!=='t'||e.h<1.5)continue;const b=e._b||(e._b=dxfBox(e));if(!inV(b))continue;g.save();g.translate(e.x,e.y);g.rotate(-e.r*Math.PI/180);g.fillStyle=DXF_GRAY[e.ci]||'#000';g.font=`${e.h.toFixed(1)}px Arial,Helvetica,sans-serif`;g.textAlign='center';g.textBaseline='middle';
      const n=e.L.length;e.L.forEach((s,i)=>g.fillText(s,0,(i-(n-1)/2)*e.h*1.6));g.restore()}
    g.restore()}
  g.restore()}
/** geometría por capa para Medir y Casco (px del nivel de detalle): {v, W, H, mpp, k, src, L:[{n, l:[x1,y1,x2,y2,…], p:[[cerrada, x,y,…]], c:[x,y,r,…], t:[[texto,x,y,h,r]],
    d:[[medida (unidades del dibujo), texto escrito a mano, texto que muestra, x1,y1,x2,y2]] (cotas lineales, v2)}]} */
function dxfGeoOf(S){const r=v=>Math.round(v*100)/100;   /* 0,01 px (~0,1 mm a 1/100): las distancias entre ejes salen al milímetro */const L=new Map();const lay=n=>{let o=L.get(n);if(!o)L.set(n,o={n,l:[],p:[],c:[],t:[],d:[]});return o};const main=S.vps.length?S.vps.indexOf(S.vps.reduce((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)>(a.x1-a.x0)*(a.y1-a.y0)?b:a)):-1;
  for(const e of S.P){if(main>=0&&e.v!==undefined&&e.v!==main)continue;const o=lay(e.l);
    if(e.k==='l')o.l.push(...e.p.map(r));else if(e.k==='p')o.p.push([e.c?1:0,...e.P.map(r)]);else if(e.k==='c')o.c.push(r(e.x),r(e.y),r(e.r));else if(e.k==='f'){for(const R of e.R)o.p.push([1,...R.map(r)])}else if(e.k==='t')o.t.push([e.t,r(e.x),r(e.y),r(e.h),e.r]);else if(e.k==='d')o.d.push([Math.round(e.m*e.sc*1e4)/1e4,e.s,e.sh,...e.p.map(r)])}
  return{v:2,W:S.W,H:S.H,mpp:S.mpp,k:S.k,src:S.src,L:[...L.values()]}}
/** índice de texto (planos-texto.js) desde los textos del DXF */
function dxfTxIdx(S){const T=[];for(const e of S.P){if(e.k!=='t')continue;const s=e.t.replace(/\s+/g,' ').trim();if(!s||!plTxC(s))continue;const w=e.h*0.62*Math.max(...e.L.map(x=>x.length)),h=e.h*(1+(e.L.length-1)*1.6);
    const a=-e.r*Math.PI/180,c=Math.cos(a),si=Math.sin(a);const xs=[],ys=[];for(const[u,v]of[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]]){xs.push(e.x+u*c-v*si);ys.push(e.y+u*si+v*c)}
    const n=(v,d)=>Math.max(0,Math.min(PLTX_K,Math.round(v/d*PLTX_K)));T.push([s,n(Math.min(...xs),S.W),n(Math.min(...ys),S.H),n(Math.max(...xs),S.W),n(Math.max(...ys),S.H)])}
  return{v:PLTX_V,T}}
async function dxfGz(data,type){if(window.CompressionStream)try{return{b:await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))).blob(),z:1,type:'application/gzip'}}catch(e){}return{b:new Blob([data],{type}),z:0,type}}
async function dxfUnGz(b){if(window.DecompressionStream)try{return await new Response(b.stream().pipeThrough(new DecompressionStream('gzip'))).text()}catch(e){}return b.text()}

/* ---------- carga en Planos (la llama plProcess) ---------- */
/** {W, H, mm, mpp, draw(g, oy), txo, orig, geo, meta}: todo lo que plProcess necesita de un DXF */
async function plDxfPrep(it,say){say('Leyendo el DXF…');const txt=await it.file.text();const D=dxfParse(txt);say('Armando la lámina…');const S=dxfToPx(dxfSheet(D,{crop:it.crop!==false}));
  if(!S.P.length)throw new Error('El DXF no tiene dibujo visible (capas apagadas o vacío).');if(!(S.W>0&&S.H>0))throw new Error('No se pudo medir el dibujo del DXF.');
  const G=dxfGeoOf(S);const Fg=dxfGeoF(G);const lay=dxfGuess(dxfLayers(Fg));
  const geo=await dxfGz(JSON.stringify(G),'application/json');const orig=await dxfGz(txt,'application/dxf');
  let txo=null;try{txo=dxfTxIdx(S)}catch(e){console.error('índice de texto DXF',e)}
  const meta={v:1,src:S.src,k:S.k,how:S.how,mpp:S.mpp,lay,gz:geo.z,oz:orig.z,far:S.far,crop:!!S.crop,n:S.P.length};
  return{W:S.W,H:S.H,mm:S.mm,mpp:S.mpp,crop:S.crop,draw:(g,oy)=>dxfPaint(g,S,oy),txo,orig,geo,meta,S}}
/** vista previa de una fila de la carga (lado mayor PLP_PX) */
async function plDxfPrev(it){if(it._pv)return it._pv;const D=dxfParse(await it.file.text());const S=dxfToPx(dxfSheet(D,{crop:store.get('plcrop',true)!==false}));const sc=Math.min(1,PLP_PX/Math.max(S.W,S.H));
  const c=plCanvas(Math.max(1,Math.floor(S.W*sc)),Math.max(1,Math.floor(S.H*sc)));const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);dxfPaint(g,S,0,sc);it._pv=c;return c}
const plGeoName=d=>d&&d.gz===0?'geo.json':'geo.json.gz';
/** la geometría de una revisión DXF (caché en memoria; sin conexión, de la caché del equipo) */
const GEO=new Map();
function plGeoGet(sp){if(!sp||!sp.dxf)return Promise.resolve(null);const k=sp.base;let e=GEO.get(k);if(e)return e.pr;
  e={g:null};e.pr=(async()=>{const b=await plGet(sp.base+'/'+plGeoName(sp.dxf));const G=JSON.parse(sp.dxf.gz===0?await b.text():await dxfUnGz(b));e.g=G;return G})();e.pr.catch(()=>{});GEO.set(k,e);return e.pr}
/** ya cargada (o null; si no, la pide y redibuja al llegar) */
function plGeoNow(sp){if(!sp||!sp.dxf)return null;const e=GEO.get(sp.base);if(e&&e.g)return e.g;if(!e)plGeoGet(sp).then(()=>requestRender()).catch(()=>{});return null}
/** geometría → entidades planas (para buscar capas y ejes con las mismas funciones) */
function dxfGeoF(G){const F=[];for(const o of G.L){const l=o.n;for(let i=0;i+3<o.l.length;i+=4)F.push({k:'l',l,p:o.l.slice(i,i+4)});for(const p of o.p)F.push({k:'p',l,c:!!p[0],P:p.slice(1)});
  for(let i=0;i+2<o.c.length;i+=3)F.push({k:'c',l,x:o.c[i],y:o.c[i+1],r:o.c[i+2]});for(const t of o.t)F.push({k:'t',l,t:t[0],x:t[1],y:t[2],h:t[3],r:t[4]})}return F}
/** por función (px del nivel de detalle): ejes con nombre, columnas (cerradas, ≥ 0,30 m), caras (líneas de las capas de trazo y de columnas abiertas), rótulos.
    Solo dentro de los ejes + 1,5 m si hay ejes (los detalles quedan fuera); si no, todo. */
function dxfRoles(G,lay,mpp){const F=dxfGeoF(G);const{E,sin,dup,S}=dxfEjes(F,lay.ej);const cnt={ej:E.length,ejSin:sin,dup:dup||[],col:0,chico:0,ln:0,tx:0};
  let inR=()=>true;if(E.length){const xs=E.flatMap(e=>[e.p[0],e.p[2]]),ys=E.flatMap(e=>[e.p[1],e.p[3]]);const mg=1.5/mpp;const x0=Math.min(...xs)-mg,x1=Math.max(...xs)+mg,y0=Math.min(...ys)-mg,y1=Math.max(...ys)+mg;inR=(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1}
  const col=[],ln=[],seen=new Set();const seg=(a,b,c,d)=>{if(Math.hypot(c-a,d-b)*mpp<0.01)return;const k=a<c||(a===c&&b<=d)?[a,b,c,d].join(','):[c,d,a,b].join(',');if(seen.has(k))return;seen.add(k);ln.push(a,b,c,d)};
  const vig=new Set(lay.vig||[]);
  for(const e of F){
    if(lay.col&&e.l===lay.col&&e.k==='p'){let A=e.P.slice();const n=A.length;const cl=e.c||Math.hypot(A[0]-A[n-2],A[1]-A[n-1])*mpp<0.02;if(!e.c&&cl&&n>=6)A=A.slice(0,-2);
      let cx=0,cy=0;for(let i=0;i<A.length;i+=2){cx+=A[i];cy+=A[i+1]}cx/=A.length/2;cy/=A.length/2;if(!inR(cx,cy))continue;
      if(cl&&A.length>=6){const ax=A.filter((v,i)=>!(i%2)),ay=A.filter((v,i)=>i%2);if(Math.max(Math.max(...ax)-Math.min(...ax),Math.max(...ay)-Math.min(...ay))*mpp<DXF_MIN_COL){cnt.chico++;continue}col.push({p:A});continue}
      for(let i=0;i+3<A.length;i+=2)seg(A[i],A[i+1],A[i+2],A[i+3]);continue}
    if(lay.col&&e.l===lay.col&&e.k==='l'){if(inR((e.p[0]+e.p[2])/2,(e.p[1]+e.p[3])/2))seg(...e.p);continue}
    if(vig.has(e.l)){if(e.k==='l'){if(inR((e.p[0]+e.p[2])/2,(e.p[1]+e.p[3])/2))seg(...e.p)}
      else if(e.k==='p'){const A=e.P,n=A.length;for(let i=0;i+3<n;i+=2)if(inR((A[i]+A[i+2])/2,(A[i+1]+A[i+3])/2))seg(A[i],A[i+1],A[i+2],A[i+3]);if(e.c&&n>=6&&inR((A[0]+A[n-2])/2,(A[1]+A[n-1])/2))seg(A[n-2],A[n-1],A[0],A[1])}}}
  const tx=lay.tx?F.filter(e=>e.l===lay.tx&&e.k==='t'&&inR(e.x,e.y)&&(DXF_SEC.test(e.t)||DXF_NAME.test(e.t))).slice(0,3000).map(e=>({t:e.t,x:e.x,y:e.y,r:e.r})):[];
  /* ambientes (ARQ): polilíneas cerradas de su capa, con el nombre del texto de adentro más cercano al centro */
  const T=F.filter(e=>e.k==='t');const amb=lay.amb?F.filter(e=>e.l===lay.amb&&e.k==='p'&&e.c&&e.P.length>=6).map(q=>{const c=dxfCen(q.P);const nm=T.filter(t=>dxfPip(q.P,t.x,t.y)).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];return{p:q.P,n:nm?nm.t:''}}):[];
  cnt.col=col.length;cnt.ln=ln.length/4;cnt.tx=tx.length;cnt.amb=amb.length;return{ej:E,col,ln,tx,amb,S,cnt}}
const dxfCen=P=>{let x=0,y=0;const n=P.length/2;for(let i=0;i<P.length;i+=2){x+=P[i];y+=P[i+1]}return{x:x/n,y:y/n}};
function dxfPip(P,x,y){let c=false;for(let i=0,n=P.length/2,j=n-1;i<n;j=i++){const xi=P[2*i],yi=P[2*i+1],xj=P[2*j],yj=P[2*j+1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
const dxfSz=(P,mpp)=>{const xs=P.filter((v,i)=>!(i%2)),ys=P.filter((v,i)=>i%2);const w=Math.round((Math.max(...xs)-Math.min(...xs))*mpp*100)/100,h=Math.round((Math.max(...ys)-Math.min(...ys))*mpp*100)/100;return[Math.min(w,h),Math.max(w,h)]};
/** lo leído del DXF con las correcciones de Alistar encima (`plb.fix.L`, en orden; el DXF original no se toca). Tipos:
    ejRen {n,a} renombrar · ejDel {n} quitar · ejSet {n,p} recta nueva (enderezar, mover) · ejAdd {n,p} agregar (también nombrar una línea sin nombre) ·
    linIgn {p} la línea no es eje · colDel {x,y} no es columna · colDelSz {w,h} ninguna de ese tamaño · colAdd {p} · txDel {x,y} · ambRen {x,y,a} · ambDel {x,y} · ambAdd {p,a} */
function dxfRolesFix(G,lay,mpp,fix){const R=dxfRoles(G,lay,mpp);const L=fix&&Array.isArray(fix.L)?fix.L:[];if(!L.length)return R;
  let E=R.ej.map(e=>({...e})),col=R.col.slice(),tx=R.tx.slice(),amb=R.amb.map(a=>({...a}));const near=(p,q,t)=>Math.abs(p[0]-q[0])<t&&Math.abs(p[1]-q[1])<t&&Math.abs(p[2]-q[2])<t&&Math.abs(p[3]-q[3])<t||Math.abs(p[0]-q[2])<t&&Math.abs(p[1]-q[3])<t&&Math.abs(p[2]-q[0])<t&&Math.abs(p[3]-q[1])<t;
  const done=[];const tol=0.05/mpp;
  for(const f of L){switch(f.k){
    case'ejRen':E.forEach(e=>{if(e.n===f.n)e.n=f.a});break;
    case'ejDel':E=E.filter(e=>e.n!==f.n);break;
    case'ejSet':E=E.map(e=>e.n===f.n?{...e,p:f.p.slice()}:e);break;
    case'ejAdd':E=E.filter(e=>e.n!==f.n);E.push({n:f.n,p:f.p.slice()});done.push(f.p);break;
    case'linIgn':done.push(f.p);break;
    case'colDel':col=col.filter(q=>!dxfPip(q.p,f.x,f.y));break;
    case'colDelSz':col=col.filter(q=>{const z=dxfSz(q.p,mpp);return!(Math.abs(z[0]-f.w)<0.006&&Math.abs(z[1]-f.h)<0.006)});break;
    case'colAdd':col.push({p:f.p.slice(),add:1});break;
    case'txDel':tx=tx.filter(t=>Math.hypot(t.x-f.x,t.y-f.y)>tol);break;
    case'ambRen':amb.forEach(a=>{if(dxfPip(a.p,f.x,f.y))a.n=f.a});break;
    case'ambDel':amb=amb.filter(a=>!dxfPip(a.p,f.x,f.y));break;
    case'ambAdd':amb.push({p:f.p.slice(),n:f.a||'',add:1});break}}
  /* las líneas sin nombre o repetidas que ya se nombraron o se descartaron dejan de avisar */
  const S=R.S.filter(l=>!done.some(q=>near(l.p,q,1)));const cnt={...R.cnt,ej:E.length,ejSin:S.filter(l=>!l.dup).length,dup:[...new Set(S.filter(l=>l.dup).map(l=>l.dup))],col:col.length,tx:tx.length,amb:amb.length};
  return{...R,ej:E,col,tx,amb,S,cnt}}
/** punto más cercano para pegarse (px del plano): vértice o cruce a menos de tol; si no, la proyección sobre una línea a menos de tol */
function plGeoSnap(G,w,tol){if(!G)return null;let bp=null,bd=tol;const pt=(x,y)=>{const d=Math.hypot(x-w.x,y-w.y);if(d<bd){bd=d;bp={x,y,k:'pt'}}};
  const ln=[];for(const o of G.L){for(let i=0;i+3<o.l.length;i+=4){const a=o.l;if(Math.min(a[i],a[i+2])>w.x+tol||Math.max(a[i],a[i+2])<w.x-tol||Math.min(a[i+1],a[i+3])>w.y+tol||Math.max(a[i+1],a[i+3])<w.y-tol)continue;pt(a[i],a[i+1]);pt(a[i+2],a[i+3]);ln.push([a[i],a[i+1],a[i+2],a[i+3]])}
    for(const p of o.p){for(let i=1;i+1<p.length;i+=2){pt(p[i],p[i+1]);const j=i+2<p.length?i+2:(p[0]?1:0);if(j&&j!==i&&(Math.min(p[i],p[j])<=w.x+tol&&Math.max(p[i],p[j])>=w.x-tol&&Math.min(p[i+1],p[j+1])<=w.y+tol&&Math.max(p[i+1],p[j+1])>=w.y-tol))ln.push([p[i],p[i+1],p[j],p[j+1]])}}
    for(let i=0;i+2<o.c.length;i+=3)pt(o.c[i],o.c[i+1])}
  if(bp)return bp;bd=tol;for(const s of ln){const dx=s[2]-s[0],dy=s[3]-s[1],l2=dx*dx+dy*dy;if(!l2)continue;const t=Math.max(0,Math.min(1,((w.x-s[0])*dx+(w.y-s[1])*dy)/l2));const x=s[0]+t*dx,y=s[1]+t*dy;const d=Math.hypot(x-w.x,y-w.y);if(d<bd){bd=d;bp={x,y,k:'ln'}}}
  return bp}
/** textos cortos de una revisión DXF para los vínculos (planos-vinculos.js) */
async function plGeoTexts(sp){const G=await plGeoGet(sp);if(!G)return[];const out=[];for(const o of G.L)for(const t of o.t){const s=String(t[0]).trim();if(s&&s.length<=8)out.push({x:t[1],y:t[2],h:t[3],n:s.length})}return out}

/* ---------- Capas del DXF (visor › ⋯) ---------- */
async function plDxfLay(p){if(!p||!p.dxf||!plEdOf(p))return;const sp=plSpecOf(p,p.rev);let G;try{G=await plGeoGet(sp)}catch(e){toast('No se pudo leer la geometría del DXF.');return}
  const Ls=dxfLayers(dxfGeoF(G));let lay={...(p.dxf.lay||{})},k=p.dxf.k||1;
  const draw=()=>{const R=dxfRoles(G,lay,(p.dxf.mpp||1)*k/(p.dxf.k||1));const c=R.cnt;const o=(sel,f)=>`<option value="">— ninguna —</option>${Ls.filter(f||(()=>true)).map(x=>`<option value="${esc(x.n)}"${x.n===sel?' selected':''}>${esc(x.n)}</option>`).join('')}`;
    lqModal(`<div class="lqtop"><b>Capas del DXF · ${esc(p.cod)}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
      <p class="mu">Qué capa es cada cosa. Vienen sugeridas por su nombre y su contenido; todas son opcionales. Lo usan Casco (ejes, columnas, caras de vigas) y lo que venga después.</p>
      <div class="dxff">${DXF_ROLES.map(([r,t])=>`<label class="kmfl">${t}<select class="ci" data-dxl="${r}">${o(lay[r],r==='tx'?(x=>x.t):null)}</select></label>`).join('')}
        <label class="kmfl">Unidades del dibujo<select class="ci" data-dxl="k">${[[1,'metros'],[0.01,'centímetros'],[0.001,'milímetros']].map(([v,t])=>`<option value="${v}"${v===k?' selected':''}>${t}</option>`).join('')}</select></label></div>
      <div class="kmfl">Caras de vigas (líneas de trazo)</div><div class="dxfl">${Ls.filter(x=>x.l+x.p).sort((a,b)=>(lay.vig||[]).includes(b.n)-(lay.vig||[]).includes(a.n)).map(x=>`<label class="chk"><input type="checkbox" data-dxv="${esc(x.n)}"${(lay.vig||[]).includes(x.n)?' checked':''}> ${esc(x.n)} <span class="mu">${x.l+x.p}</span></label>`).join('')}</div>
      <div class="callout"><b>Con estas capas:</b> ${c.ej} ejes${c.ej?` (${esc(R.ej.map(e=>e.n).join(', '))})`:''} · ${c.col} columnas · ${c.ln} líneas de caras · ${c.tx} rótulos.${c.chico?` <span class="mu">Se ignoran ${c.chico} figura(s) menores de ${DXF_MIN_COL.toFixed(2)} m de la capa de columnas.</span>`:''}</div>
      <p class="note">Las unidades se dedujeron ${p.dxf.how==='ejes'?'por la separación de los ejes':p.dxf.how==='unidades'?'por las unidades del archivo':'por el tamaño del dibujo'}; cambiarlas cambia la escala (calibración) de la lámina.</p>
      <div class="lqbtns"><button type="button" class="ib" data-lqx>Cancelar</button><button type="button" class="ib pri" data-dxa="ok">Guardar</button></div>`,
      async e=>{const b=e.target.closest('[data-dxa]');if(!b)return;const mpp=(p.dxf.mpp||0)*k/(p.dxf.k||1);const up={'dxf.lay':lay,'dxf.k':k,'dxf.mpp':mpp,'dxf.how':k===p.dxf.k?p.dxf.how:'a mano'};
        if(k!==p.dxf.k)up.cal={mpp,rev:p.rev||1,dxf:1,by:me.email,byN:me.name||me.email,ts:NOW()};
        /* cambiar capas o unidades de un plano ya alistado lo devuelve a «Por alistar» (planos-alistar.js) */
        const was=typeof plUsable==='function'&&plUsable(p);if(was)up.ok=firebase.firestore.FieldValue.delete();
        try{await plCol(p).doc(p.id).update(up);lqClose();toast(was?'Capas guardadas. El plano volvió a «Por alistar»: revísalo de nuevo.':'Capas del DXF guardadas.')}catch(err){toast('No se pudo guardar: '+(err.code||err.message||err))}},
      e=>{const t=e.target;if(t.dataset.dxl){if(t.dataset.dxl==='k')k=+t.value;else lay={...lay,[t.dataset.dxl]:t.value}}else if(t.dataset.dxv!=null){const v=new Set(lay.vig||[]);if(t.checked)v.add(t.dataset.dxv);else v.delete(t.dataset.dxv);lay={...lay,vig:[...v]}}else return;draw()})};
  draw()}
