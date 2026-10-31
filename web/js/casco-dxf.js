"use strict";
/* LPS 911 · Casco › Plano vectorial (DXF) de la planta (fase 1, 31-10-2026, decidido con el dueño; docs/ia/casco.md «Plano vectorial (DXF)»).
   - Solo las plantas (encofrado) llevan DXF; detalles, cortes y elevaciones siguen en PDF. El PDF se sigue viendo: el DXF pone la geometría encima.
   - Se lee en el navegador (AutoCAD › Guardar como › DXF, texto): capas de ejes (líneas con su burbuja: círculo + nombre, también dentro de bloques),
     columnas (polilíneas cerradas; las menores de 0,30 m se ignoran), caras de vigas (líneas de la capa de trazo) y rótulos de sección «(.50x.65)».
     Solo lo que cae dentro de los ejes: los detalles a otra escala del mismo dibujo quedan fuera. Se guarda solo eso, en metros (decenas de KB).
   - Se guarda en la lámina de referencia (`cs_laminas.dxf`) con su transformación a la lámina (`T`, semejanza): se alinea sola con los ejes ya
     trazados (mismos nombres) o con dos toques en dos cruces. Los ejes de la lámina pasan a ser los del DXF y la escala sale del DXF (`csScale` st 'dxf').
   - Al trazar, el clic se pega a las caras y columnas del DXF (`o.snapLines`/`o.snapPts` de ambMap). */

const DXF_MIN_COL=0.30;
const DXF_SEC=/\(\s*\.?\d+(?:[.,]\d+)?\s*[xX×]\s*(?:\.?\d+(?:[.,]\d+)?|var\.?)\s*\)/i;
const DXF_NAME=/^V[A-Z]{0,3}\s*-?\s*\d+[A-Z']*$/i;

/* ---------- lector (funciones puras) ---------- */
/** texto de AutoCAD sin formato: %%c → Ø, códigos de MTEXT (\P, \H0.9x;, {\L…}) fuera */
function dxfTxt(s){return String(s||'').replace(/\\P/g,' ').replace(/\\S([^;]*);/g,(m,a)=>a.replace(/[\^#]/g,'/')).replace(/\\[ACFHQTWfp][^;]*;/g,'').replace(/\\[LlOoKkNX~]/g,'').replace(/[{}]/g,'')
  .replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,'').replace(/\s+/g,' ').trim()}
/** DXF de texto → {ver, ins ($INSUNITS), blocks: Map(nombre → {x,y,ents}), ents}. Solo lo que sirve: líneas, polilíneas, círculos, arcos, textos y bloques. */
function dxfParse(txt){if(/^AutoCAD Binary DXF/.test(txt.slice(0,22)))throw new Error('El DXF está en formato binario: guárdalo como DXF de texto (ASCII).');
  const L=txt.split(/\r\n|\n|\r/);const out={ver:'',ins:0,blocks:new Map(),ents:[]};const KEEP=new Set(['LINE','LWPOLYLINE','POLYLINE','CIRCLE','ARC','TEXT','MTEXT','INSERT']);
  let sec='',hv='',cur=null,blk=null,par=null;
  const fin=()=>{const e=cur;cur=null;if(!e)return;
    if(e.t==='SECTION'||e.t==='ENDSEC'||e.t==='EOF')return;
    if(e.t==='BLOCK'){blk={n:e.n||'',x:e.x||0,y:e.y||0,ents:[]};out.blocks.set(blk.n,blk);return}
    if(e.t==='ENDBLK'){blk=null;return}
    if(e.t==='VERTEX'){if(par&&par.t==='POLYLINE')par.P.push(e.x||0,e.y||0);return}
    if(e.t==='ATTRIB'){if(par&&par.t==='INSERT')par.att.push(e);return}
    if(e.t==='SEQEND'){par=null;return}
    if(!KEEP.has(e.t))return;if(sec!=='ENTITIES'&&!(sec==='BLOCKS'&&blk))return;
    (blk&&sec==='BLOCKS'?blk.ents:out.ents).push(e);if(e.t==='POLYLINE'||(e.t==='INSERT'&&e.af))par=e};
  for(let i=0;i+1<L.length;i+=2){const c=+L[i];const v=L[i+1];
    if(c===0){fin();if(v==='EOF')break;cur={t:v};if(v==='LWPOLYLINE'||v==='POLYLINE')cur.P=[];if(v==='INSERT')cur.att=[];continue}
    if(!cur)continue;const t=cur.t;
    if(t==='SECTION'){if(c===2)sec=v.trim();continue}
    if(sec==='HEADER'){if(c===9)hv=v.trim();else if(hv==='$INSUNITS'&&c===70)out.ins=+v;else if(hv==='$ACADVER'&&c===1)out.ver=v.trim();continue}
    if(c>=1000||c===100||c===102||c===5||c===330)continue;
    switch(c){case 8:cur.l=v.trim();break;case 67:cur.ps=+v===1;break;
      case 10:if(t==='LWPOLYLINE')cur.P.push(+v,0);else cur.x=+v;break;
      case 20:if(t==='LWPOLYLINE')cur.P[cur.P.length-1]=+v;else cur.y=+v;break;
      case 11:cur.x2=+v;break;case 21:cur.y2=+v;break;
      case 40:cur.r=+v;break;case 41:cur.sx=+v;break;case 42:if(t!=='LWPOLYLINE')cur.sy=+v;break;
      case 50:cur.a=+v;break;case 51:cur.a1=+v;break;case 70:cur.fl=+v;break;case 66:cur.af=+v===1;break;
      case 71:cur.at=+v;break;case 72:cur.h72=+v;break;case 73:cur.v73=+v;break;case 74:cur.v74=+v;break;
      case 1:cur.s=(cur.s3||'')+v;break;case 3:cur.s3=(cur.s3||'')+v;break;case 2:cur.n=v.trim();break;case 230:cur.ez=+v;break}}
  fin();return out}
/** bloques explotados (con escala, giro y simetría) → lista plana en coordenadas del dibujo:
    {k:'l', l, p:[x1,y1,x2,y2]} · {k:'p', l, P:[x,y,…], c (cerrada)} · {k:'c'|'a', l, x, y, r} · {k:'t', l, t, x, y (centro aproximado), h, r (°)} */
function dxfFlat(D){const out=[];const ap=(M,x,y)=>[M[0]*x+M[2]*y+M[4],M[1]*x+M[3]*y+M[5]];
  const mul=(A,B)=>[A[0]*B[0]+A[2]*B[1],A[1]*B[0]+A[3]*B[1],A[0]*B[2]+A[2]*B[3],A[1]*B[2]+A[3]*B[3],A[0]*B[4]+A[2]*B[5]+A[4],A[1]*B[4]+A[3]*B[5]+A[5]];
  const txt=(e,M,l,X)=>{const s=dxfTxt(e.s);if(!s)return;const h=e.r>0?e.r:0.2;const w=h*0.75*s.length;const R=(e.t==='MTEXT'&&e.x2!=null&&e.y2!=null?Math.atan2(e.y2,e.x2):(e.a||0)*Math.PI/180);
      let ax=e.x||0,ay=e.y||0,dx,dy;
      if(e.t==='MTEXT'){const at=e.at||1;const col=(at-1)%3,row=Math.floor((at-1)/3);dx=[w/2,0,-w/2][col];dy=[-h/2,0,h/2][row]}
      else{const H=e.h72||0,V=e.t==='ATTRIB'?(e.v74||0):(e.v73||0);
        if((H||V)&&e.x2!=null){if(H===3||H===5){ax=(ax+e.x2)/2;ay=(ay+(e.y2??ay))/2;dx=0;dy=h/2}else{ax=e.x2;ay=e.y2;dx=H===1||H===4?0:H===2?-w/2:w/2;dy=H===4?0:V===3?-h/2:V===2?0:h/2}}
        else{dx=w/2;dy=h/2}}
      const cx=ax+dx*Math.cos(R)-dy*Math.sin(R),cy=ay+dx*Math.sin(R)+dy*Math.cos(R);const p=X(cx,cy);const k=Math.hypot(M[0],M[1]);
      out.push({k:'t',l,t:s,x:p[0],y:p[1],h:h*k,r:Math.round((R+Math.atan2(M[1],M[0]))*180/Math.PI)})};
  const walk=(ents,M,lay,d)=>{for(const e of ents){if(e.ps)continue;const l=(!e.l||e.l==='0')&&lay?lay:(e.l||'0');const mir=e.ez<0;const X=(x,y)=>ap(M,mir?-x:x,y);
    switch(e.t){case'LINE':out.push({k:'l',l,p:[...ap(M,e.x||0,e.y||0),...ap(M,e.x2||0,e.y2||0)]});break;
      case'LWPOLYLINE':case'POLYLINE':{const P=[];for(let i=0;i+1<e.P.length;i+=2)P.push(...X(e.P[i],e.P[i+1]));if(P.length>=4)out.push({k:'p',l,P,c:!!(e.fl&1)});break}
      case'CIRCLE':case'ARC':{const c=X(e.x||0,e.y||0);const s=Math.sqrt(Math.abs(M[0]*M[3]-M[1]*M[2]));out.push({k:e.t==='CIRCLE'?'c':'a',l,x:c[0],y:c[1],r:(e.r||0)*s});break}
      case'TEXT':case'MTEXT':case'ATTRIB':txt(e,M,l,X);break;
      case'INSERT':{const B=D.blocks.get(e.n);if(!B||d>8||/^\*[DTE]\d/i.test(e.n||''))break;const sx=e.sx||1,sy=e.sy||sx,r=(e.a||0)*Math.PI/180,co=Math.cos(r),si=Math.sin(r);
        let T=[co*sx,si*sx,-si*sy,co*sy,0,0];T[4]=(e.x||0)-(T[0]*B.x+T[2]*B.y);T[5]=(e.y||0)-(T[1]*B.x+T[3]*B.y);if(mir)T=mul([-1,0,0,1,0,0],T);
        walk(B.ents,mul(M,T),l,d+1);for(const a of e.att||[])walk([a],M,l,d+1);break}}}};
  walk(D.ents,[1,0,0,1,0,0],'',0);return out}
/** capas con lo que tienen (para el diálogo) */
function dxfLayers(F){const m=new Map();for(const e of F){let o=m.get(e.l);if(!o)m.set(e.l,o={n:e.l,l:0,p:0,c:0,t:0,s:0});if(e.k==='l')o.l++;else if(e.k==='p')o.p++;else if(e.k==='c')o.c++;else if(e.k==='t'){o.t++;if(DXF_SEC.test(e.t))o.s++}}
  return[...m.values()].sort((a,b)=>a.n.localeCompare(b.n))}
/** capas sugeridas por su nombre y su contenido */
function dxfGuess(Ls){const by=(A,k)=>A.slice().sort((a,b)=>b[k]-a[k])[0];
  const ej=by(Ls.filter(x=>/EJE|GRID|AXIS/i.test(x.n)),'c')||by(Ls.filter(x=>x.c>4),'c');
  const col=by(Ls.filter(x=>/COLUM|PLACA/i.test(x.n)&&!/TEXT|NOMB/i.test(x.n)),'p');
  const vig=Ls.filter(x=>/TRAZO|VIGA|BEAM|CONTORNO/i.test(x.n)&&!/VIGUETA|TEXT|COTA|ACERO/i.test(x.n)&&(x.l+x.p)).map(x=>x.n);
  const tx=by(Ls.filter(x=>x.s>0),'s');return{ej:ej?ej.n:'',col:col?col.n:'',vig,tx:tx?tx.n:''}}
/** ejes de la capa: cada línea con el nombre de su burbuja (círculo con un texto adentro; si no hay, el texto en la prolongación de la línea).
    Líneas del mismo nombre en la misma recta se juntan. En unidades del dibujo. */
function dxfEjes(F,lay){const Ls=[],C=[],T=[];for(const e of F){if(e.l!==lay)continue;if(e.k==='l')Ls.push(e.p);else if(e.k==='p'&&e.P.length===4)Ls.push(e.P.slice());else if(e.k==='c')C.push(e);else if(e.k==='t')T.push(e)}
  const nm=s=>String(s).trim().toUpperCase().replace(/\s+/g,'').slice(0,4);
  const B=C.map(c=>{let b=null,bd=c.r*1.25;for(const t of T){const d=Math.hypot(t.x-c.x,t.y-c.y);if(d<bd&&nm(t.t)){bd=d;b=t}}return b?{x:c.x,y:c.y,r:c.r,n:nm(b.t)}:null}).filter(Boolean);
  const out=new Map();let sin=0;
  for(const p of Ls){const L=Math.hypot(p[2]-p[0],p[3]-p[1]);if(!(L>0))continue;const ux=(p[2]-p[0])/L,uy=(p[3]-p[1])/L;let n='',bd=Infinity;
    for(const c of B){const dx=c.x-p[0],dy=c.y-p[1];const t=dx*ux+dy*uy,d=Math.abs(dx*uy-dy*ux);if(d>c.r*.6||t<-8*c.r||t>L+8*c.r||(t>L*.2+c.r&&t<L*.8-c.r))continue;const end=Math.min(Math.abs(t),Math.abs(t-L));if(end<bd){bd=end;n=c.n}}
    if(!n)for(const x of T){const h=x.h||1;const dx=x.x-p[0],dy=x.y-p[1];const t=dx*ux+dy*uy,d=Math.abs(dx*uy-dy*ux);if(d>h*1.2||!(t<0||t>L)||Math.min(Math.abs(t),Math.abs(t-L))>h*6||!nm(x.t)||nm(x.t).length>3)continue;const end=Math.min(Math.abs(t),Math.abs(t-L));if(end<bd){bd=end;n=nm(x.t)}}
    if(!n){sin++;continue}
    const o=out.get(n);if(!o){out.set(n,p.slice());continue}
    const OL=Math.hypot(o[2]-o[0],o[3]-o[1])||1,ox=(o[2]-o[0])/OL,oy=(o[3]-o[1])/OL;const off=q=>Math.abs((q[0]-o[0])*oy-(q[1]-o[1])*ox);
    if(off([p[0],p[1]])>L*.01+1e-6||off([p[2],p[3]])>L*.01+1e-6)continue;const s=[0,OL,(p[0]-o[0])*ox+(p[1]-o[1])*oy,(p[2]-o[0])*ox+(p[3]-o[1])*oy];const a=Math.min(...s),b=Math.max(...s);
    out.set(n,[o[0]+ox*a,o[1]+oy*a,o[0]+ox*b,o[1]+oy*b])}
  return{E:[...out].map(([n,p])=>({n,p})),sin}}
/** metros por unidad del dibujo, por la separación típica entre ejes paralelos (2–12 m): m, cm o mm. El $INSUNITS no es confiable (este proyecto dice pulgadas y está en metros). */
function dxfUnitK(E){const isV=p=>Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);const gaps=[];
  for(const v of[true,false]){const c=E.filter(e=>isV(e.p)===v).map(e=>v?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2).sort((a,b)=>a-b);for(let i=1;i<c.length;i++)if(c[i]-c[i-1]>1e-9)gaps.push(c[i]-c[i-1])}
  if(!gaps.length)return 1;gaps.sort((a,b)=>a-b);const g=gaps[Math.floor(gaps.length/2)];return g<50?1:g<1500?0.01:0.001}
/** lo que se guarda, en metros, con y hacia abajo (como la lámina) y el origen en la esquina de los ejes:
    {ej:[{n,p}], col:[{p}], ln:[x1,y1,x2,y2,…] (caras), tx:[{t,x,y,r}] (rótulos), w, h, cnt} */
function dxfExtract(F,map,k){const{E,sin}=dxfEjes(F,map.ej);if(!k)k=dxfUnitK(E);const cnt={ej:E.length,ejSin:sin,col:0,chico:0,ln:0,tx:0};
  if(!E.length)return{ej:[],col:[],ln:[],tx:[],w:0,h:0,k,cnt};
  const xs=E.flatMap(e=>[e.p[0],e.p[2]]),ys=E.flatMap(e=>[e.p[1],e.p[3]]);const mg=1.5/k;const x0=Math.min(...xs)-mg,x1=Math.max(...xs)+mg,y0=Math.min(...ys)-mg,y1=Math.max(...ys)+mg;
  const inR=(x,y)=>x>=x0&&x<=x1&&y>=y0&&y<=y1;const r3=v=>Math.round(v*1000)/1000;const X=x=>r3((x-x0)*k),Y=y=>r3((y1-y)*k);
  const P=A=>{const o=[];for(let i=0;i+1<A.length;i+=2)o.push(X(A[i]),Y(A[i+1]));return o};
  const col=[],ln=[],seen=new Set();
  const seg=(a,b,c,d)=>{const s=[X(a),Y(b),X(c),Y(d)];if(Math.hypot(s[2]-s[0],s[3]-s[1])<0.01)return;const key=s[0]<s[2]||(s[0]===s[2]&&s[1]<=s[3])?s.join(','):[s[2],s[3],s[0],s[1]].join(',');if(seen.has(key))return;seen.add(key);ln.push(...s)};
  const vig=new Set(map.vig||[]);
  for(const e of F){
    if(e.l===map.col&&e.k==='p'){let A=e.P.slice();const n=A.length;const cl=e.c||Math.hypot(A[0]-A[n-2],A[1]-A[n-1])<0.02/k;if(!e.c&&cl&&n>=6)A=A.slice(0,-2);
      let cx=0,cy=0;for(let i=0;i<A.length;i+=2){cx+=A[i];cy+=A[i+1]}cx/=A.length/2;cy/=A.length/2;if(!inR(cx,cy))continue;
      if(cl&&A.length>=6){const ax=A.filter((v,i)=>!(i%2)),ay=A.filter((v,i)=>i%2);if(Math.max(Math.max(...ax)-Math.min(...ax),Math.max(...ay)-Math.min(...ay))*k<DXF_MIN_COL){cnt.chico++;continue}col.push({p:P(A)});continue}
      for(let i=0;i+3<A.length;i+=2)seg(A[i],A[i+1],A[i+2],A[i+3]);continue}
    if(e.l===map.col&&e.k==='l'){if(inR((e.p[0]+e.p[2])/2,(e.p[1]+e.p[3])/2))seg(...e.p);continue}
    if(vig.has(e.l)){if(e.k==='l'){if(inR((e.p[0]+e.p[2])/2,(e.p[1]+e.p[3])/2))seg(...e.p)}
      else if(e.k==='p'){const A=e.P,n=A.length;for(let i=0;i+3<n;i+=2)if(inR((A[i]+A[i+2])/2,(A[i+1]+A[i+3])/2))seg(A[i],A[i+1],A[i+2],A[i+3]);if(e.c&&n>=6&&inR((A[0]+A[n-2])/2,(A[1]+A[n-1])/2))seg(A[n-2],A[n-1],A[0],A[1])}}}
  const tx=F.filter(e=>e.l===map.tx&&e.k==='t'&&inR(e.x,e.y)&&(DXF_SEC.test(e.t)||DXF_NAME.test(e.t))).slice(0,3000).map(e=>({t:e.t,x:X(e.x),y:Y(e.y),r:((-e.r%360)+360)%360}));
  cnt.col=col.length;cnt.ln=ln.length/4;cnt.tx=tx.length;
  return{ej:E.map(e=>({n:e.n,p:[X(e.p[0]),Y(e.p[1]),X(e.p[2]),Y(e.p[3])]})),col,ln,tx,w:r3((x1-x0)*k),h:r3((y1-y0)*k),k,cnt}}
/** semejanza por mínimos cuadrados de los puntos P (DXF) a Q (lámina): {a,b,e,f} como csAp; res = error medio en metros */
function dxfFitT(P,Q){const n=P.length;if(n<2)return null;let px=0,py=0,qx=0,qy=0;for(let i=0;i<n;i++){px+=P[i].x;py+=P[i].y;qx+=Q[i].x;qy+=Q[i].y}px/=n;py/=n;qx/=n;qy/=n;
  let sa=0,sb=0,s2=0;for(let i=0;i<n;i++){const x=P[i].x-px,y=P[i].y-py,u=Q[i].x-qx,v=Q[i].y-qy;sa+=x*u+y*v;sb+=x*v-y*u;s2+=x*x+y*y}if(s2<1e-9)return null;
  const a=sa/s2,b=sb/s2;const T={a,b,e:qx-(a*px-b*py),f:qy-(b*px+a*py)};const k=Math.hypot(a,b);let r=0;for(let i=0;i<n;i++){const q=csAp(T,P[i]);r+=(q.x-Q[i].x)**2+(q.y-Q[i].y)**2}
  T.res=Math.round(Math.sqrt(r/n)/k*1000)/1000;return T}
/** cruces de ejes con el mismo nombre en el DXF y en la lámina → pares de puntos */
function dxfPairs(ej,E){const A=new Map(kvpCross(ej).map(c=>[c.v+'|'+c.h,c]));const out=[];for(const c of kvpCross(E)){const d=A.get(c.v+'|'+c.h);if(d)out.push({P:{x:d.x,y:d.y},Q:{x:c.x,y:c.y},n:c.v+'-'+c.h})}return out}

/* ---------- en la lámina ---------- */
/** el DXF vigente de la lámina (si cambió la revisión de la lámina, ya no vale) */
const dxfOf=l=>l&&l.dxf&&l.dxf.T&&Array.isArray(l.dxf.ej)&&(l.dxf.rev==null||l.dxf.rev===(l.rev??null))?l.dxf:null;
const dxfMpp=d=>d&&d.T?1/(Math.hypot(d.T.a,d.T.b)||1):null;
const DXFC={k:'',v:null};
/** dibujo y puntos para pegarse, en la lámina del nivel (m: referencia → lámina) */
function dxfGeo(ref,m){const d=dxfOf(ref);if(!d||!m)return null;const T=csCmpT(m,d.T);const key=[ref.id,d.t,T.a,T.b,T.e,T.f].join('|');if(DXFC.k===key)return DXFC.v;
  const R=v=>Math.round(v*10)/10;const ap=(x,y)=>csAp(T,{x,y});const segs=[],pts=[];let dl='',dc='';
  const L=d.ln||[];for(let i=0;i+3<L.length;i+=4){const a=ap(L[i],L[i+1]),b=ap(L[i+2],L[i+3]);segs.push({pts:[R(a.x),R(a.y),R(b.x),R(b.y)]});dl+=`M${R(a.x)} ${R(a.y)}L${R(b.x)} ${R(b.y)}`;pts.push(a,b)}
  for(const c of d.col||[]){const Q=csUnflat(c.p).map(p=>ap(p.x,p.y));dc+='M'+Q.map(q=>`${R(q.x)} ${R(q.y)}`).join('L')+'Z';Q.forEach((q,i)=>{const n=Q[(i+1)%Q.length];segs.push({pts:[R(q.x),R(q.y),R(n.x),R(n.y)]});pts.push(q)})}
  for(const c of kvpCross(d.ej))pts.push(ap(c.x,c.y));
  const v={paths:[{d:dc,c:'#334155',w:1.2,op:.95,fill:'#64748B',fop:.35},{d:dl,c:'#0E7490',w:1.1,op:.9}],segs,pts:pts.map(p=>({x:R(p.x),y:R(p.y)}))};DXFC.k=key;DXFC.v=v;return v}
/** líneas del DXF que cruzan la dirección u (para tocar las caras de un apoyo: las de las columnas y las caras transversales) */
function dxfAcross(G,u){if(!G)return[];return G.segs.filter(s=>{const p=s.pts;const L=Math.hypot(p[2]-p[0],p[3]-p[1])||1;return Math.abs(((p[2]-p[0])*u.x+(p[3]-p[1])*u.y)/L)<.5})}

/* ---------- cargar ---------- */
const DXF={name:'',F:null,Ls:null,map:null,k:0,X:null,g0:new Set()};
function dxfPick(){if(!csEd())return;const i=document.createElement('input');i.type='file';i.accept='.dxf';i.hidden=true;document.body.appendChild(i);i.onchange=()=>{const f=i.files&&i.files[0];i.remove();if(f)dxfLoad(f)};i.click()}
async function dxfLoad(file){if(!/\.dxf$/i.test(file.name||'')){toast('Elige un archivo .dxf (en AutoCAD: Guardar como › DXF).');return}
  if(file.size>120e6){toast('El DXF pesa más de 120 MB. Antes de exportar borra lo que no es de la planta o usa «PURGE».');return}
  toast('Leyendo el DXF…');let D;try{D=dxfParse(await file.text())}catch(e){toast(e&&e.message||'No se pudo leer el DXF.');return}
  const F=dxfFlat(D);if(!F.length){toast('El DXF no tiene dibujo en el espacio modelo.');return}
  const Ls=dxfLayers(F);const map=dxfGuess(Ls);Object.assign(DXF,{name:file.name,F,Ls,map,k:0,X:null,g0:new Set(map.vig)});DXF.X=dxfExtract(F,map,0);DXF.k=DXF.X.k;dxfDlg()}
function dxfDlg(){const{Ls,map,X}=DXF;const o=(sel,f)=>`<option value="">— ninguna —</option>${Ls.filter(f||(()=>true)).map(x=>`<option value="${esc(x.n)}"${x.n===sel?' selected':''}>${esc(x.n)}</option>`).join('')}`;
  const c=X.cnt;const isV=p=>Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);const nV=X.ej.filter(e=>isV(e.p)),nH=X.ej.filter(e=>!isV(e.p));const ok=nV.length&&nH.length;
  const names=A=>A.length?esc(A.map(e=>e.n).join(', ')):'—';
  lqModal(`<div class="lqtop"><b>Plano vectorial (DXF)</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
    <p class="mu">${esc(DXF.name)} · ${Ls.length} capa(s). Elige qué capa es cada cosa (vienen sugeridas por su nombre).</p>
    <div class="dxff"><label class="kmfl">Ejes (líneas con su burbuja)<select class="ci" data-dxfm="ej">${o(map.ej)}</select></label>
      <label class="kmfl">Columnas y placas<select class="ci" data-dxfm="col">${o(map.col)}</select></label>
      <label class="kmfl">Rótulos de sección «(.50x.65)»<select class="ci" data-dxfm="tx">${o(map.tx,x=>x.t)}</select></label>
      <label class="kmfl">Unidades del dibujo<select class="ci" data-dxfm="k">${[[1,'metros'],[0.01,'centímetros'],[0.001,'milímetros']].map(([k,t])=>`<option value="${k}"${k===DXF.k?' selected':''}>${t}</option>`).join('')}</select></label></div>
    <div class="kmfl">Caras de vigas (líneas de trazo)</div><div class="dxfl">${Ls.filter(x=>x.l+x.p).sort((a,b)=>DXF.g0.has(b.n)-DXF.g0.has(a.n)).map(x=>`<label class="chk"><input type="checkbox" data-dxfv="${esc(x.n)}"${(map.vig||[]).includes(x.n)?' checked':''}> ${esc(x.n)} <span class="mu">${x.l+x.p}</span></label>`).join('')}</div>
    <div class="callout${ok?'':' warn'}"><b>${ok?'Encontré':'Falta'}:</b> ${ok?`${c.ej} ejes — verticales ${names(nV)}; horizontales ${names(nH)} · ${c.col} columnas · ${c.ln} líneas de caras · ${c.tx} rótulos de sección.`:'ejes con nombre en las dos direcciones. Revisa la capa de ejes: cada eje debe tener su burbuja (círculo con el nombre).'}
      ${c.chico?`<br><span class="mu">Se ignoran ${c.chico} figura(s) menores de ${DXF_MIN_COL.toFixed(2)} m de la capa de columnas.</span>`:''}${c.ejSin?`<br><span class="mu">${c.ejSin} línea(s) de la capa de ejes sin nombre (no se usan).</span>`:''}</div>
    <p class="note">Solo se guarda lo que está dentro de los ejes (los detalles del mismo dibujo quedan fuera). Luego se alinea con la lámina: sola si ya trazaste los ejes con los mismos nombres; si no, tocando dos cruces.</p>
    <div class="lqbtns"><button type="button" class="ib" data-lqx>Cancelar</button><button type="button" class="ib pri" data-dxfa="use"${ok?'':' disabled'}>Usar este DXF</button></div>`,
    e=>{const b=e.target.closest('[data-dxfa]');if(b&&b.dataset.dxfa==='use')dxfUse()},
    e=>{const t=e.target;if(t.dataset.dxfm){const k=t.dataset.dxfm;if(k==='k')DXF.k=+t.value;else DXF.map={...DXF.map,[k]:t.value}}
      else if(t.dataset.dxfv!=null){const v=new Set(DXF.map.vig||[]);if(t.checked)v.add(t.dataset.dxfv);else v.delete(t.dataset.dxfv);DXF.map={...DXF.map,vig:[...v]}}else return;
      const kk=t.dataset.dxfm==='ej'?0:DXF.k;DXF.X=dxfExtract(DXF.F,DXF.map,kk);DXF.k=DXF.X.k;dxfDlg()})}
/** después del diálogo: alinear sola con los ejes de la lámina o pedir dos cruces */
function dxfUse(){const X=DXF.X;if(!X||!X.ej.length)return;lqClose();const C=cnvCtx();const ref=csRefLam(C.f,C.g);if(!ref||!C.lam){toast('Este nivel no tiene lámina.');return}
  if(!csMap(ref,C.lam)){toast('Alinea primero este nivel con la referencia (⌖ Alinear niveles…).');return}
  const pr=dxfPairs(X.ej,(ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4));const T=pr.length>=2?dxfFitT(pr.map(p=>p.P),pr.map(p=>p.Q)):null;
  if(T&&T.res<0.25){dxfSave(ref,X,T,{m:'ejes',n:pr.length});return}
  dxfAlStart(X,T?`Tus ejes no calzan con los del DXF (error ${kmF(T.res,2)} m): alinéalo con dos cruces. `:'')}
/** alinear con dos cruces: el primero y el último de cada dirección (diagonal) */
function dxfAlStart(X,pre){const isV=p=>Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);const pos=e=>isV(e.p)?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2;
  const V=X.ej.filter(e=>isV(e.p)).sort((a,b)=>pos(a)-pos(b)),H=X.ej.filter(e=>!isV(e.p)).sort((a,b)=>pos(a)-pos(b));const cr=kvpCross(X.ej);
  const c1=cr.find(c=>c.v===V[0].n&&c.h===H[0].n),c2=cr.find(c=>c.v===V[V.length-1].n&&c.h===H[H.length-1].n);if(!c1||!c2){toast('No encuentro dos cruces de ejes en el DXF.');return}
  if(KVP.step)kvpStop();CNV.tool='dxfal';CNV.tmp=[];CNV.sel='';CNV.dxa={X,c:[c1,c2],q:[],pre:pre||''};csNivDraw();if(pre)toast(pre)}
function dxfAlHint(){const A=CNV.dxa;if(!A)return'';const c=A.c[A.q.length];return`${A.pre}DXF: toca en el plano el cruce de los ejes ${c.v} y ${c.h} (${A.q.length+1} de 2). Esc para cancelar.`}
/** clic en el plano durante la alineación (pt en la lámina del nivel) */
function dxfAlClick(pt){const A=CNV.dxa;const C=cnvCtx();const ref=csRefLam(C.f,C.g);const m=ref&&csMap(ref,C.lam);if(!A||!m)return;const q=csAp(csInvT(m),pt);A.q.push(q);
  if(A.q.length<2){/* el segundo cruce, más o menos donde debería estar con la escala de la lámina: se acerca el plano */
    const mpp=csScale(ref).mpp;if(mpp){const p2={x:q.x+(A.c[1].x-A.c[0].x)/mpp,y:q.y+(A.c[1].y-A.c[0].y)/mpp};const h=3/mpp;const box=[{x:p2.x-h,y:p2.y-h},{x:p2.x+h,y:p2.y+h}].map(p=>csAp(m,p));const M=csDispM(ref,C.lam);
      csNivDraw();const host=document.getElementById('csszmap');if(host&&window.__plano&&window.__plano.ambFocus)window.__plano.ambFocus(host,csgFlat(M?box.map(p=>csAp(M,p)):box));return}
    csNivDraw();return}
  const T=dxfFitT(A.c.map(c=>({x:c.x,y:c.y})),A.q);CNV.dxa=null;CNV.tool='';const host=document.getElementById('csszmap');if(host&&host._v)host._v.fit();
  if(!T){toast('Los dos cruces quedaron en el mismo sitio. Vuelve a intentarlo.');csNivDraw();return}
  const sc=csScale(ref);const dm=1/Math.hypot(T.a,T.b);const dif=sc.st==='cal'&&sc.mpp?dm/sc.mpp-1:0;
  const go=()=>dxfSave(ref,A.X,T,{m:'2p',n:2,c:A.c.map(c=>c.v+'-'+c.h)});
  if(Math.abs(dif)>.03)uiAsk({title:'¿Los cruces son los correctos?',text:`Con esos dos toques la escala del DXF difiere ${Math.round(Math.abs(dif)*100)} % de la calibración de la lámina.`,note:'Si tocaste otros cruces, cancela y vuelve a cargar el DXF.',ok:'Usar igual',tone:'warn'}).then(y=>{if(y)go();else csNivDraw()});
  else go()}
/** guarda el DXF en la lámina de referencia y sus ejes como los ejes de la lámina */
async function dxfSave(ref,X,T,al){const ej=X.ej.map(e=>({n:e.n,p:csMapF(T,e.p)}));const names=new Set(ej.map(e=>e.n));const gone=(ref.ejes||[]).filter(e=>!names.has(String(e.n)));
  if(gone.length&&!await uiAsk({title:'Reemplazar los ejes de la lámina',text:`Los ejes pasan a ser los ${ej.length} del DXF. Estos no están en el DXF y se quitan:`,list:gone.map(e=>'Eje '+e.n),note:'Las vigas trazadas por esos ejes dejarán de actualizarse solas.',ok:'Reemplazar',tone:'warn'})){csNivDraw();return}
  const d={n:DXF.name||'',t:NOW(),by:me.email,rev:ref.rev??null,k:X.k,lay:{ej:DXF.map.ej||'',col:DXF.map.col||'',vig:DXF.map.vig||[],tx:DXF.map.tx||''},T:{a:T.a,b:T.b,e:T.e,f:T.f},
    al:{m:al.m,n:al.n,res:T.res||0,c:al.c||[]},ej:X.ej,col:X.col,ln:X.ln,tx:X.tx,w:X.w,h:X.h,cnt:X.cnt};
  csLamSet(ref,{dxf:d,ejes:ej});CSZ.dxf=true;DXF.F=null;csNivDraw();
  toast(`DXF cargado: ${ej.length} ejes, ${X.cnt.col} columnas y ${X.cnt.ln} caras. ${al.m==='ejes'?`Se alineó solo con tus ejes (error ${kmF(T.res||0,2)} m).`:'Alineado con dos cruces.'} La escala de la lámina sale del DXF.`)}
function dxfDel(){const C=cnvCtx();const ref=csRefLam(C.f,C.g);if(!ref||!ref.dxf||!csEd())return;
  uiAsk({title:'Quitar el DXF',text:'La lámina deja de mostrar el DXF y vuelve a la escala de Planos. Los ejes se quedan como están.',ok:'Quitar',tone:'warn'}).then(y=>{if(!y)return;csLamSet(ref,{dxf:null});csNivDraw()})}

/* ---------- panel ---------- */
function dxfSec(ref,ed){if(!ref)return'';const d=ref.dxf;const v=dxfOf(ref);
  const btn=ed?`<button type="button" class="ib" data-dxfa="load">⇪ ${d?'Cambiar DXF…':'Cargar DXF…'}</button>`:'';
  if(!d)return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">sin DXF</span></div>
    <p class="mu csfemp">Sube el DXF de esta planta (AutoCAD › Guardar como › DXF) y salen solos los ejes con su nombre y la escala exacta; las columnas y las caras de las vigas quedan encima de la lámina y el clic se pega a ellas. La lámina PDF se sigue viendo.</p>${btn}</div>`;
  const c=d.cnt||{};const mpp=dxfMpp(d);
  return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">${esc(d.n||'DXF')}</span></div>
    ${v?'':'<p class="cnvwarn">⚠ Cambió la revisión de la lámina: vuelve a cargar el DXF de esta revisión.</p>'}
    <table class="t cstab"><tbody><tr><td>Ejes</td><td class="n">${(d.ej||[]).length}</td></tr><tr><td>Columnas</td><td class="n">${c.col??(d.col||[]).length}</td></tr><tr><td>Caras de vigas (líneas)</td><td class="n">${c.ln??0}</td></tr><tr><td>Rótulos de sección</td><td class="n">${c.tx??(d.tx||[]).length}</td></tr>
      <tr><td>Escala</td><td class="n">${mpp?`1 m = ${kmF(1/mpp,1)} px`:'—'}</td></tr><tr><td>Alineado</td><td>${d.al&&d.al.m==='ejes'?`con ${d.al.n} cruces de tus ejes (error ${kmF(d.al.res||0,2)} m)`:`con dos cruces${d.al&&d.al.c&&d.al.c.length?' ('+esc(d.al.c.join(' y '))+')':''}`}</td></tr></tbody></table>
    <p class="note">Cargado el ${esc(d.t?fmtD(ldt(d.t)):'')}${d.by?' por '+esc(d.by):''}. Los ejes de la lámina son los del DXF.</p>
    ${ed?`<div class="lqbtns lqbw">${btn}${v?'<button type="button" class="ib" data-dxfa="al">Alinear con dos cruces</button>':''}<button type="button" class="ib" data-dxfa="del">Quitar</button></div>`:''}</div>`}
/** botones del panel (los llama csNivClick) */
function dxfOnClick(e){const b=e.target.closest('#csszside [data-dxfa]');if(!b)return false;const k=b.dataset.dxfa;
  if(k==='load')dxfPick();else if(k==='del')dxfDel();else if(k==='al'){const C=cnvCtx();const ref=csRefLam(C.f,C.g);const d=dxfOf(ref);if(d)dxfAlStart({...d,cnt:d.cnt||{},k:d.k},'');DXF.name=d?d.n:'';DXF.map=d?d.lay:{}}return true}
