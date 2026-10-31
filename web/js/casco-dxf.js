"use strict";
/* LPS 911 · Casco › geometría del DXF de la planta (31-10-2026, decidido con el dueño; docs/ia/casco.md «Plano vectorial (DXF)»).
   - El DXF se carga en el módulo Planos (planos-dxf.js), como cualquier lámina: la lámina del nivel que viene de un plano DXF trae su
     geometría (`geo.json.gz`) y su escala exacta (`plb.cal`). Nada se carga por nivel.
   - De ahí salen: los ejes de la lámina de referencia con su nombre (reemplazan a los trazados con «＃ Ejes»), las columnas y caras de vigas
     encima de la lámina y para pegarse al trazar, y la alineación entre niveles con DXF por los cruces de ejes del mismo nombre.
   - Las capas (qué es eje, columna…) se eligen en Planos › visor › «◇ Capas». (La fase 1 del 31-10-2026 guardaba el DXF en `cs_laminas.dxf`: ya no se usa.) */

/** geometría DXF de una lámina de Casco, en coordenadas de esa lámina: {ej, col, ln, tx, cnt, p (plano), sp (revisión), mpp} o null (sin DXF o aún cargando) */
const CSDX=new Map();
function csDxf(l){if(!l||!l.plb||typeof PLB==='undefined')return null;const p=PLB.get(l.plb.id);if(!p)return null;const sp=plSpecOf(p,l.plb.rev);if(!sp.dxf||!(sp.W>0)||!(l.w>0)||!plRevOk(p,sp.rev))return null;   /* solo alistado */
  const G=plGeoNow(sp);if(!G)return null;const lay=sp.dxf.lay||{},mpp=sp.dxf.mpp;const fx=sp.fix||null;const key=[sp.base,JSON.stringify(lay),mpp,l.w,fx?fx.L.length+':'+((fx.L[fx.L.length-1]||{}).id||''):''].join('|');const c=CSDX.get(l.id);if(c&&c.key===key)return c.v;
  const R=dxfRolesFix(G,lay,mpp,fx);const f=l.w/sp.W;   /* con las correcciones de Alistar */const S=A=>A.map(v=>Math.round(v*f*10)/10);
  const v={ej:R.ej.map(e=>({n:e.n,p:S(e.p)})),col:R.col.map(q=>({p:S(q.p)})),ln:S(R.ln),tx:R.tx.map(t=>({...t,x:t.x*f,y:t.y*f})),cnt:R.cnt,p,sp,mpp:mpp/f};
  CSDX.set(l.id,{key,v});return v}
/** ejes de la lámina de referencia: los del DXF si tiene; si no, los trazados con «＃ Ejes» */
function csEjesOf(ref){const d=ref&&csDxf(ref);if(d&&d.ej.length)return d.ej;return(ref&&ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4)}
const csEjesDx=ref=>{const d=ref&&csDxf(ref);return!!(d&&d.ej.length)};
/** semejanza por mínimos cuadrados de P a Q ({a,b,e,f} como csAp); res = error medio en unidades de P */
function csFitT(P,Q){const n=P.length;if(n<2)return null;let px=0,py=0,qx=0,qy=0;for(let i=0;i<n;i++){px+=P[i].x;py+=P[i].y;qx+=Q[i].x;qy+=Q[i].y}px/=n;py/=n;qx/=n;qy/=n;
  let sa=0,sb=0,s2=0;for(let i=0;i<n;i++){const x=P[i].x-px,y=P[i].y-py,u=Q[i].x-qx,v=Q[i].y-qy;sa+=x*u+y*v;sb+=x*v-y*u;s2+=x*x+y*y}if(s2<1e-9)return null;
  const a=sa/s2,b=sb/s2;const T={a,b,e:qx-(a*px-b*py),f:qy-(b*px+a*py)};let r=0;for(let i=0;i<n;i++){const q=csAp(T,P[i]);r+=(q.x-Q[i].x)**2+(q.y-Q[i].y)**2}T.res=Math.sqrt(r/n)/(Math.hypot(a,b)||1);return T}
/** de la referencia a otra lámina con DXF, por los cruces de ejes del mismo nombre (≥ 2; error < 0,25 m); null si no se puede */
const CSDXA=new Map();
function csDxfAl(ref,lam){const A=csDxf(ref),B=csDxf(lam);if(!A||!B||A.ej.length<2||B.ej.length<2)return null;const key=ref.id+'|'+lam.id;const c=CSDXA.get(key);if(c&&c.A===A&&c.B===B)return c.T;
  const M=new Map(kvpCross(B.ej).map(x=>[x.v+'|'+x.h,x]));const P=[],Q=[];for(const x of kvpCross(A.ej)){const y=M.get(x.v+'|'+x.h);if(y){P.push({x:x.x,y:x.y});Q.push({x:y.x,y:y.y})}}
  let T=P.length>=2?csFitT(P,Q):null;if(T&&!(T.res*A.mpp<0.25))T=null;if(T)T={a:T.a,b:T.b,e:T.e,f:T.f,n:P.length,dxf:1};CSDXA.set(key,{A,B,T});return T}
/** dibujo encima y puntos para pegarse, en la lámina del nivel */
const CSDXD=new WeakMap();
function csDxfDraw(l){const d=csDxf(l);if(!d)return null;const c=CSDXD.get(d);if(c)return c;const R=v=>Math.round(v*10)/10;const segs=[],pts=[];let dl='',dc='';const L=d.ln;
  for(let i=0;i+3<L.length;i+=4){segs.push({pts:[L[i],L[i+1],L[i+2],L[i+3]]});dl+=`M${L[i]} ${L[i+1]}L${L[i+2]} ${L[i+3]}`;pts.push({x:L[i],y:L[i+1]},{x:L[i+2],y:L[i+3]})}
  for(const q of d.col){const Q=csUnflat(q.p);dc+='M'+Q.map(p=>`${R(p.x)} ${R(p.y)}`).join('L')+'Z';Q.forEach((p,i)=>{const n=Q[(i+1)%Q.length];segs.push({pts:[p.x,p.y,n.x,n.y]});pts.push(p)})}
  for(const x of kvpCross(d.ej))pts.push({x:R(x.x),y:R(x.y)});
  const v={paths:[{d:dc,c:'#334155',w:1.2,op:.95,fill:'#64748B',fop:.35},{d:dl,c:'#0E7490',w:1.1,op:.9}],segs,pts};CSDXD.set(d,v);return v}
/** líneas que cruzan la dirección u (al tocar las caras de un apoyo: las de las columnas y las caras transversales) */
function csDxfAcross(G,u){if(!G)return[];return G.segs.filter(s=>{const p=s.pts;const L=Math.hypot(p[2]-p[0],p[3]-p[1])||1;return Math.abs(((p[2]-p[0])*u.x+(p[3]-p[1])*u.y)/L)<.5})}
/** panel de Niveles: de dónde vienen ejes y escala, y el aviso para usar DXF */
function csDxfSec(lam){if(!lam||!lam.plb)return'';const p=typeof PLB!=='undefined'&&PLB.get(lam.plb.id);const sp=p&&plSpecOf(p,lam.plb.rev);
  if(!sp||!sp.dxf)return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">la lámina es PDF</span></div><p class="mu csfemp">Si cargas esta planta en DXF en el módulo Planos (nueva revisión del mismo plano), salen solos los ejes con su nombre y la escala exacta, y las columnas y caras de vigas quedan encima para pegarse al trazar.</p></div>`;
  if(!plRevOk(p,sp.rev))return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">${esc(p.cod)} rev. ${sp.rev} · por alistar</span></div><p class="mu csfemp">El plano todavía no está alistado en Planos: sus ejes, columnas y escala no se usan hasta que el administrador u Oficina Técnica lo verifiquen.</p></div>`;
  const d=csDxf(lam);if(!d)return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">${esc(p.cod)} · cargando la geometría…</span></div></div>`;const c=d.cnt;
  return`<div class="csfsec"><div class="csfsh"><b>Plano vectorial (DXF)</b><span class="mu">${esc(p.cod)} rev. ${sp.rev}</span></div>
    <p class="note">${c.ej} ejes${c.ej?` (${esc(d.ej.map(e=>e.n).join(', '))})`:''} · ${c.col} columnas · ${c.ln} caras de vigas · ${c.tx} rótulos. Escala exacta del DXF.${c.chico?` Se ignoran ${c.chico} figura(s) menores de ${DXF_MIN_COL.toFixed(2)} m.`:''}${!c.ej?' <b>Sin ejes:</b> revisa en Planos qué capa son los ejes.':''}</p>
    ${plEdOf(p)&&sp.cur?`<button type="button" class="ib" data-csdx="lay">◇ Capas del DXF…</button>`:''}</div>`}
function csDxfClick(e){const b=e.target.closest('#csszside [data-csdx]');if(!b)return false;const C=cnvCtx();const p=C.lam&&C.lam.plb&&PLB.get(C.lam.plb.id);if(p)plDxfLay(p);return true}
