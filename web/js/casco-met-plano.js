"use strict";
/* LPS 911 · Casco › Vigas desde el plano (29-10-2026, bosquejo aprobado por el dueño; docs/ia/casco.md «Vigas desde el plano»).
   - Trazar (Sectorización › Niveles, herramienta «═ Viga», grupo Estructura): dos toques en cruces de los ejes de la lámina de referencia
     (los de «＃ Ejes»), sobre el mismo eje; después, en cada eje que cruza, el plano se acerca al apoyo y se marcan sus dos caras
     (ancho y excentricidad). Sale la plantilla de Metrados › Vigas: ejes y distancias, juntas (eje + dx) donde la viga cruza el borde
     de un sector y el sector de cada tramo. El armado se sigue escribiendo como siempre.
   - Vinculada (`V.pl {eje, e0, e1, ref}`, por nombres de ejes): si cambia la sectorización, kvSync la actualiza sola (distancias,
     juntas y sectores; nunca el armado ni los apoyos) y deja una cinta con lo que cambió (Deshacer de Metrados).
   - Semáforo (Niveles): cada viga vinculada con su tercio central; cada junta en verde si cae en el tercio central de su luz libre,
     en rojo si no; «Pegar al tercio» mueve la cara del sector (con las esquinas iguales de los vecinos) al borde del tercio.
   Todo se calcula en la lámina de referencia (csRefLam) y se dibuja en la del nivel (csMap). */

const KVP={step:'',pid:'',a:null,ax:null,sup:[],ai:0,faces:[],vid:null,back:false};
const kvpPip=(p,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)c=!c}return c};
const kvpIsV=p=>Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);
/** intersección de dos rectas (cada una [x1,y1,x2,y2]) o null si son paralelas */
function kvpX(p,q){const d1={x:p[2]-p[0],y:p[3]-p[1]},d2={x:q[2]-q[0],y:q[3]-q[1]};const den=d1.x*d2.y-d1.y*d2.x;if(Math.abs(den)<1e-9)return null;
  const t=((q[0]-p[0])*d2.y-(q[1]-p[1])*d2.x)/den;return{x:p[0]+d1.x*t,y:p[1]+d1.y*t}}
const kvpEjes=ref=>(ref&&ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4&&e.n);
/** cruces de los ejes (en la referencia): {v, h (nombres), x, y} */
function kvpCross(E){const V=E.filter(e=>kvpIsV(e.p)),H=E.filter(e=>!kvpIsV(e.p));const out=[];for(const v of V)for(const h of H){const q=kvpX(v.p,h.p);if(q)out.push({v:v.n,h:h.n,x:q.x,y:q.y})}return out}
/** recta de la viga: origen en el cruce con e0, dirección hacia e1; toS(punto) → metros desde e0; at(metros) → punto */
function kvpLine(E,eje,e0,e1,mpp){const B=E.find(e=>e.n===eje),A=E.find(e=>e.n===e0),Z=E.find(e=>e.n===e1);if(!B||!A||!Z||!(mpp>0))return null;
  const o=kvpX(B.p,A.p),z=kvpX(B.p,Z.p);if(!o||!z)return null;const L=Math.hypot(z.x-o.x,z.y-o.y);if(L<1e-6)return null;const u={x:(z.x-o.x)/L,y:(z.y-o.y)/L};
  return{o,u,B,mpp,len:L*mpp,toS:p=>((p.x-o.x)*u.x+(p.y-o.y)*u.y)*mpp,at:s=>({x:o.x+u.x*s/mpp,y:o.y+u.y*s/mpp})}}
const kvpR2=v=>Math.round(v*100)/100;

/** geometría de la viga desde el plano (pura, todo en la lámina de referencia):
    E ejes [{n,p}], eje/e0/e1 nombres, mpp m por unidad, secs [{code, P:[{x,y}]}], sup {nombre:{w,o}} (metros) →
    {ejes:[{n,w,o,d}], jun:[{ref,dx}], sec:[código por tramo entre juntas], L} o {err} */
function kvFromPlan(E,eje,e0,e1,mpp,secs,sup){const ln=kvpLine(E,eje,e0,e1,mpp);if(!ln)return{err:`No encuentro los ejes ${eje}, ${e0} y ${e1} en la lámina de referencia, o falta la escala.`};
  const vert=kvpIsV(ln.B.p);const S=[];for(const e of E){if(e===ln.B||kvpIsV(e.p)===vert)continue;const q=kvpX(ln.B.p,e.p);if(!q)continue;const s=ln.toS(q);if(s>-0.05&&s<ln.len+0.05)S.push({n:e.n,s:Math.max(0,Math.min(ln.len,s))})}
  S.sort((a,b)=>a.s-b.s);if(S.length<2)return{err:'La viga necesita al menos dos ejes que la crucen.'};
  const ejes=S.map((e,i)=>{const k=(sup||{})[e.n]||{};return{n:e.n,w:k.w!=null&&k.w!==''?String(k.w):'0.30',o:kvpR2(+k.o||0)?String(kvpR2(+k.o)):'',d:i<S.length-1?kvpR2(S[i+1].s-e.s).toFixed(2):''}});
  /* bordes de sector que cruza la viga: cortes en la recta; luego el sector que contiene el centro de cada tramo */
  const L=ln.len,cuts=[];for(const z of secs||[]){const P=z.P;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const q=kvpX([a.x,a.y,b.x,b.y],[ln.o.x,ln.o.y,ln.o.x+ln.u.x,ln.o.y+ln.u.y]);if(!q)continue;
      const t=Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(q.x-a.x)/(b.x-a.x):(q.y-a.y)/(b.y-a.y);if(t<-1e-6||t>1+1e-6)continue;const s=ln.toS(q);if(s>0.05&&s<L-0.05)cuts.push(s)}}
  cuts.sort((a,b)=>a-b);const C=[];for(const s of cuts)if(!C.length||s-C[C.length-1]>0.03)C.push(s);
  const bnd=[0,...C,L];const band=[];for(let i=0;i<bnd.length-1;i++){const m=ln.at((bnd[i]+bnd[i+1])/2);const z=(secs||[]).find(z=>kvpPip(m,z.P));band.push({a:bnd[i],b:bnd[i+1],c:z?z.code:''})}
  const mg=[];for(const b of band){const l=mg[mg.length-1];if(l&&l.c===b.c)l.b=b.b;else mg.push({...b})}
  const jun=[],sec=[mg[0]?mg[0].c:''];for(let i=1;i<mg.length;i++){const x=mg[i].a;let r=S[0];for(const e of S)if(e.s<=x+1e-9)r=e;jun.push({ref:r.n,dx:kvpR2(x-r.s).toFixed(2)});sec.push(mg[i].c)}
  return{ejes,jun,sec,L}}

/* ---------- contexto: referencia, lámina del nivel y sectores de estructura del nivel (todos los frentes) ---------- */
function kvpCtx(pid,refId){const API=window.__plano;const ref=(refId&&API&&API.LAM&&API.LAM.get(refId))||csRefLam(null,'E');const lam=csLamOf(pid,'E');if(!ref||!lam)return null;
  const m=csMap(ref,lam);if(!m)return null;const mi=csInvT(m);const mpp=csScale(ref).mpp;
  const secs=kmSecs(pid).filter(a=>(csSecOf(a)||{}).grp==='E').map(a=>{const g=cnvGeo(a,lam);return g?{code:a.code,id:a.id,P:csUnflat(csMapF(mi,g))}:null}).filter(Boolean);
  return{ref,lam,m,mi,mpp,secs,E:kvpEjes(ref)}}
const kvpSup=V=>Object.fromEntries((V.ejes||[]).map(e=>[e.n,{w:e.w,o:e.o}]));
/** aplica el plano a la viga (copia): cambia solo ejes/distancias, juntas y sectores; arregla corridos y bastones si cambian los ejes */
function kvpGeoTo(V,R){const names=new Set(R.ejes.map(e=>e.n));const first=R.ejes[0].n,last=R.ejes[R.ejes.length-1].n;const oldLast=(V.ejes[V.ejes.length-1]||{}).n;
  V.tramos=R.ejes.slice(0,-1).map((e,i)=>{const k=(V.ejes||[]).findIndex(x=>x.n===e.n);return(k>=0&&V.tramos[k])||V.tramos[i]||{est:(V.tramos[V.tramos.length-1]||{}).est||KV_EST1}});
  V.ejes=R.ejes;V.jun=R.jun;V.sec=R.sec;(V.corr||[]).forEach(c=>{if(!names.has(c.de))c.de=first;if(!names.has(c.a)||c.a===oldLast)c.a=last});V.bas=(V.bas||[]).filter(b=>names.has(b.ap))}

/** actualiza las vigas vinculadas del nivel con la sectorización actual. Devuelve los cambios; si hay, guarda y deja el aviso. */
function kvSync(pid,quiet){if(!pid||!KM.ok||!csEd())return[];const L=kvVigas(pid);if(!L.some(v=>v.pl))return[];const ch=[],vids=[];let any=false;
  const out=L.map(V0=>{if(!V0.pl)return V0;const X=kvpCtx(pid,V0.pl.ref);if(!X||!X.secs.length)return V0;/* sin sectores dibujados (o aún cargando) no se toca nada */const R=kvFromPlan(X.E,V0.pl.eje,V0.pl.e0,V0.pl.e1,X.mpp,X.secs,kvpSup(V0));
    if(R.err)return V0;const V=JSON.parse(JSON.stringify(V0));const same=JSON.stringify([V.ejes.map(e=>[e.n,e.d]),V.jun,V.sec])===JSON.stringify([R.ejes.map(e=>[e.n,e.d]),R.jun,R.sec]);if(same)return V0;
    const G0=kvGeo(V0),J0=kvJoints(V0,G0);const key=(V,J,k)=>`${(V.sec||[])[k]||'?'}|${(V.sec||[])[k+1]||'?'}`;const old=new Map(J0.map((j,k)=>[key(V0,J0,k),j.x]));
    kvpGeoTo(V,R);const G1=kvGeo(V),J1=kvJoints(V,G1);J1.forEach((j,k)=>{const kk=key(V,J1,k);const x0=old.get(kk);const v=V.jun[j.i];const t=`${v.ref} ${kvN(v.dx)>=0?'+':'−'} ${kmF(Math.abs(kvN(v.dx)),2)}`;
      if(x0==null)ch.push(`${V.cod||'Viga'}: junta nueva ${kk} en ${t}`);else if(Math.abs(x0-j.x)>0.005)ch.push(`${V.cod||'Viga'}: junta ${kk} → ${t} (se movió ${kmF(Math.abs(x0-j.x),2)} m)`)});
    for(const k of old.keys())if(!J1.some((j,i)=>key(V,J1,i)===k))ch.push(`${V.cod||'Viga'}: ya no tiene la junta ${k}`);
    if(JSON.stringify(V0.ejes.map(e=>[e.n,e.d]))!==JSON.stringify(V.ejes.map(e=>[e.n,e.d])))ch.push(`${V.cod||'Viga'}: cambiaron los ejes o sus distancias`);
    if(JSON.stringify(V0.sec)!==JSON.stringify(V.sec)&&!ch.some(t=>t.startsWith((V.cod||'Viga')+':')))ch.push(`${V.cod||'Viga'}: sectores ${V.sec.join(' · ')}`);
    any=true;vids.push(V.id);return V});
  if(!any)return[];kmPut('v_'+pid,{L:out},'Vigas actualizadas desde la sectorización');MET.kvAviso={pid,vids,ch:ch.length?ch:['Se actualizaron las vigas vinculadas'],t:NOW()};
  if(!quiet)toast(`La sectorización cambió: ${ch.length||1} cambio(s) en las vigas vinculadas`,'Dejar como estaban',kvAvisoUndo);requestRender();return ch}
/** «Dejar como estaban»: deshace la actualización y desvincula esas vigas (si no, volverían a seguir a la sectorización) */
function kvAvisoUndo(){const A=MET.kvAviso;MET.kvAviso=null;if(!A)return;kmUndo();const L=JSON.parse(JSON.stringify(kvVigas(A.pid)));L.forEach(v=>{if(A.vids.includes(v.id))delete v.pl});
  kmPut('v_'+A.pid,{L},'Desvincular vigas del plano');requestRender();toast('Las vigas quedaron como estaban y ya no siguen a la sectorización.')}
let kvSyncT=null;
const kvSyncSoon=pid=>{clearTimeout(kvSyncT);kvSyncT=setTimeout(()=>kvSync(pid,U.tab==='met'),0)};

/* ---------- análisis para el semáforo: cada junta de cada viga vinculada, con su tercio central ---------- */
function kvpJuntas(pid){const out=[];for(const V of kvVigas(pid)){if(!V.pl)continue;const X=kvpCtx(pid,V.pl.ref);if(!X)continue;const ln=kvpLine(X.E,V.pl.eje,V.pl.e0,V.pl.e1,X.mpp);if(!ln)continue;
    const G=kvGeo(V),J=kvJoints(V,G);const T=G.T.map(t=>({...t,t0:t.a+t.L/3,t1:t.b-t.L/3}));
    const jun=J.map((j,k)=>{const t=T.find(t=>j.x>=t.a-1e-6&&j.x<=t.b+1e-6)||T.reduce((a,b)=>Math.abs((b.a+b.b)/2-j.x)<Math.abs((a.a+a.b)/2-j.x)?b:a);const ok=j.x>=t.t0-0.005&&j.x<=t.t1+0.005;
      const v=V.jun[j.i];return{i:j.i,x:j.x,t,ok,far:ok?0:Math.min(Math.abs(j.x-t.t0),Math.abs(j.x-t.t1)),L:(V.sec||[])[k]||'?',R:(V.sec||[])[k+1]||'?',lab:`${v.ref} ${kvN(v.dx)>=0?'+':'−'} ${kmF(Math.abs(kvN(v.dx)),2)}`}});
    /* la recta de la viga va de eje a eje; G.x = 0 en el primero */
    out.push({V,X,ln,G,T,jun})}return out}
/** guías y puntos para el plano del nivel (coordenadas de la lámina del nivel) */
function kvpOverlay(pid){const g=[],d=[];for(const B of kvpJuntas(pid)){const m=B.X.m;const P=(s0,s1)=>csMapF(m,csgFlat([B.ln.at(s0),B.ln.at(s1)]));
    g.push({pts:P(B.G.x0,B.G.x1),c:'#1F5F7A',w:5,op:.45});B.T.forEach(t=>{if(t.t1>t.t0)g.push({pts:P(t.t0,t.t1),c:'#2E7D4F',w:6,op:.55})});
    const lb=B.ln.at(B.G.x0);const q=csAp(m,lb);g.push({pts:[q.x,q.y,q.x,q.y],c:'#1F5F7A',w:0,op:0,lbl:B.V.cod||'Viga'});
    B.jun.forEach(j=>{const q=csAp(m,B.ln.at(j.x));d.push({x:q.x,y:q.y,c:j.ok?'#2E7D4F':'#B83A2E'})})}return{guides:g,dots:d}}
function kvpTable(pid,ed){const L=kvpJuntas(pid);const nv=kvVigas(pid).length;
  if(!L.length)return`<div class="csfsec"><div class="csfsh"><b>Juntas en vigas</b><span class="mu">${nv?`${nv} viga(s) sin vincular`:'sin vigas'}</span></div><p class="mu csfemp">Traza las vigas con «═ Viga» (dos toques en los cruces de ejes y luego las caras de cada apoyo): salen solas en Metrados › Vigas y aquí ves si sus juntas caen en el tercio central.</p></div>`;
  const rows=L.flatMap(B=>B.jun.map(j=>({B,j})));const bad=rows.filter(r=>!r.j.ok).length;
  return`<div class="csfsec"><div class="csfsh"><b>Juntas en vigas</b><span class="mu">${L.length} viga(s) · ${rows.length} junta(s)${bad?` · <b class="kvpbad">${bad} fuera del tercio</b>`:rows.length?' · todas en el tercio central':''}</span></div>
    ${rows.length?`<table class="t cstab"><thead><tr><th>Viga</th><th>Junta</th><th class="n">Ubicación</th><th>Tercio central</th>${ed?'<th></th>':''}</tr></thead><tbody>${rows.map(({B,j})=>`<tr><td><b>${esc(B.V.cod||'Viga')}</b></td><td>${esc(j.L)}|${esc(j.R)}</td><td class="n">${esc(j.lab)}</td>
      <td>${j.ok?'<span class="kvpok">✓ en el tercio</span>':`<span class="kvpbad">fuera por ${kmF(j.far,2)} m</span>`}</td>${ed?`<td>${j.ok?'':`<button type="button" class="ib" data-kvpt="${esc(B.V.id)}:${j.i}" title="Mueve la cara del sector al borde del tercio central">Pegar al tercio</button>`}</td>`:''}</tr>`).join('')}</tbody></table>`:'<p class="mu csfemp">Las vigas vinculadas quedan en un solo sector.</p>'}
    <p class="note">Verde: la junta cae en el tercio central de la luz libre. «Pegar al tercio» mueve la cara entera del sector con las esquinas que comparte; si otra viga pasa por la misma cara, también cambia.</p></div>`}

/** «Pegar al tercio»: traslada a lo largo de la viga la cara del sector que pasa por la junta (y lo que está sobre esa misma recta) */
function kvpSnapThird(pid,vid,ji){if(!csEd())return;const B=kvpJuntas(pid).find(b=>b.V.id===vid);const j=B&&B.jun.find(z=>z.i===ji);if(!j||j.ok)return;const X=B.X;
  const tgt=Math.abs(j.x-j.t.t0)<Math.abs(j.x-j.t.t1)?j.t.t0+0.05:j.t.t1-0.05;const s0=j.x;const p0=B.ln.at(s0);const tol=0.08/X.mpp;
  /* cara: el borde de sector más cercano al punto de la junta; la recta que lo contiene, extendida por los bordes colineales que la tocan */
  let best=null;for(const z of X.secs){const P=z.P;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];const l2=(b.x-a.x)**2+(b.y-a.y)**2;if(!l2)continue;const t=((p0.x-a.x)*(b.x-a.x)+(p0.y-a.y)*(b.y-a.y))/l2;if(t<-0.01||t>1.01)continue;
    const d=Math.hypot(a.x+t*(b.x-a.x)-p0.x,a.y+t*(b.y-a.y)-p0.y);if(d<tol&&(!best||d<best.d))best={d,a,b}}}
  if(!best){toast('No encuentro el borde del sector en esa junta.');return}
  const L=Math.hypot(best.b.x-best.a.x,best.b.y-best.a.y);const u={x:(best.b.x-best.a.x)/L,y:(best.b.y-best.a.y)/L};const on=q=>Math.abs((q.x-best.a.x)*u.y-(q.y-best.a.y)*u.x)<tol;const pr=q=>(q.x-best.a.x)*u.x+(q.y-best.a.y)*u.y;
  let lo=Math.min(0,L),hi=Math.max(0,L),grow=true;while(grow){grow=false;for(const z of X.secs){const P=z.P;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if(!on(a)||!on(b))continue;const x=Math.min(pr(a),pr(b)),y=Math.max(pr(a),pr(b));if(y>=lo-tol&&x<=hi+tol&&(x<lo-1e-6||y>hi+1e-6)){lo=Math.min(lo,x);hi=Math.max(hi,y);grow=true}}}}
  const ds=(tgt-s0)/X.mpp;const dv={x:B.ln.u.x*ds,y:B.ln.u.y*ds};const ops=[];const secIds=new Set();
  for(const z of X.secs){let hit=false;const P=z.P.map(q=>{if(on(q)&&pr(q)>=lo-tol&&pr(q)<=hi+tol){hit=true;return{x:q.x+dv.x,y:q.y+dv.y}}return q});if(!hit)continue;
    const a=S.amb.get(z.id);if(!a)continue;ops.push(op('ambientes',a.id,{...cnvStrip(a),geo:{...(a.geo||{}),[X.lam.id]:csMapF(X.m,csgFlat(P))}}));if(a.sectorId)secIds.add(a.sectorId)}
  if(!ops.length)return;for(const id of secIds){const s=S.sec.get(id);const o=cnvHandOp(s);if(o)ops.push(o)}
  apply(ops,`Junta ${j.L}|${j.R} pegada al tercio central`,()=>kvSyncSoon(pid));toast(`Junta ${j.L}|${j.R}: la cara del sector se movió ${kmF(Math.abs(tgt-s0),2)} m al tercio central`)}

/* ---------- trazar: herramienta «═ Viga» de Niveles ---------- */
function kvpStart(pid,vid,back){Object.assign(KVP,{step:'a',pid,a:null,ax:null,sup:[],ai:0,faces:[],vid:vid||null,back:!!back});CNV.tool='viga';CNV.tmp=[]}
function kvpStop(){KVP.step='';KVP.a=null;KVP.ax=null;KVP.faces=[];if(CNV.tool==='viga')CNV.tool=''}
/** acerca el plano al apoyo actual */
function kvpZoom(){const host=document.getElementById('csszmap');const X=kvpCtx(KVP.pid);if(!host||!X||!KVP.ax)return;const s=KVP.ax.S[KVP.ai].s;const h=1.4/X.mpp;const c=KVP.ax.ln.at(s);
  const box=[{x:c.x-h,y:c.y-h},{x:c.x+h,y:c.y+h}].map(p=>csAp(X.m,p));const M=csDispM(X.ref,X.lam);const D=M?box.map(p=>csAp(M,p)):box;if(window.__plano&&window.__plano.ambFocus)window.__plano.ambFocus(host,csgFlat(D))}
function kvpFit(){const host=document.getElementById('csszmap');if(host&&host._v)host._v.fit()}
/** clic en el plano con la herramienta Viga (pt en coordenadas de la lámina del nivel) */
function kvpClick(pt){const X=kvpCtx(KVP.pid);if(!X){toast('Falta la lámina de referencia, la escala o la alineación de este nivel.');return}if(!X.E.length){toast('Primero traza los ejes con «＃ Ejes».');return}
  const q=csAp(X.mi,pt);
  if(KVP.step==='a'||KVP.step==='b'){const tol=1.5/X.mpp;let best=null,bd=tol;for(const c of kvpCross(X.E)){const d=Math.hypot(c.x-q.x,c.y-q.y);if(d<bd){bd=d;best=c}}
    if(!best){toast('Toca cerca de un cruce de ejes.');return}
    if(KVP.step==='a'){KVP.a=best;KVP.step='b';csNivDraw();return}
    const a=KVP.a;if(best.v===a.v&&best.h===a.h)return;if(best.v!==a.v&&best.h!==a.h){toast(`Los dos cruces deben estar en el mismo eje: toca otro cruce sobre el eje ${a.v} o el ${a.h}.`);return}
    const eje=best.v===a.v?a.v:a.h;const e0=eje===a.v?a.h:a.v,e1=eje===a.v?best.h:best.v;const ln=kvpLine(X.E,eje,e0,e1,X.mpp);if(!ln)return;
    const R=kvFromPlan(X.E,eje,e0,e1,X.mpp,X.secs,{});if(R.err){toast(R.err);return}
    const V0=KVP.vid?kvVigas(KVP.pid).find(v=>v.id===KVP.vid):null;const old=V0?kvpSup(V0):{};let s=0;
    KVP.ax={eje,e0,e1,ln,S:R.ejes.map(e=>{const o={n:e.n,s,w:old[e.n]?kvN(old[e.n].w):null,o:old[e.n]?kvN(old[e.n].o):0,set:false};s+=kvN(e.d);return o})};KVP.step='ap';KVP.ai=0;KVP.faces=[];csNivDraw();kvpZoom();return}
  if(KVP.step==='ap'){const s=KVP.ax.ln.toS(q);KVP.faces.push(s);if(KVP.faces.length<2){csNivDraw();return}
    const u=KVP.ax.S[KVP.ai];const[f1,f2]=KVP.faces.slice().sort((x,y)=>x-y);u.w=kvpR2(f2-f1);u.o=kvpR2((f1+f2)/2-u.s);u.set=true;kvpNext()}}
function kvpNext(){KVP.faces=[];KVP.ai++;if(KVP.ai<KVP.ax.S.length){csNivDraw();kvpZoom();return}kvpFinish()}
function kvpSame(){if(KVP.step!=='ap'||!KVP.ai)return;const p=KVP.ax.S[KVP.ai-1],u=KVP.ax.S[KVP.ai];u.w=p.w;u.o=0;u.set=true;kvpNext()}
function kvpBack(){if(KVP.step==='ap'){if(KVP.faces.length)KVP.faces=[];else if(KVP.ai>0){KVP.ai--;KVP.ax.S[KVP.ai].set=false}else{KVP.step='a';KVP.a=null;KVP.ax=null;kvpFit()}}else if(KVP.step==='b'){KVP.step='a';KVP.a=null}csNivDraw();if(KVP.step==='ap')kvpZoom()}
function kvpFinish(){const pid=KVP.pid,X=kvpCtx(pid);const A=KVP.ax;if(!X||!A)return;const sup=Object.fromEntries(A.S.map(u=>[u.n,{w:u.w.toFixed(2),o:u.o}]));
  const R=kvFromPlan(X.E,A.eje,A.e0,A.e1,X.mpp,X.secs,sup);if(R.err){toast(R.err);return}const L=JSON.parse(JSON.stringify(kvVigas(pid)));const C=kmCtx(pid);
  let V=KVP.vid?L.find(v=>v.id===KVP.vid):null;const isNew=!V;
  if(!V){V=kvNueva(C,L.length+1);V.cod=`V-${A.eje}`;if(L.some(v=>v.cod===V.cod))V.cod+=` (${A.e0}–${A.e1})`;V.ejes=R.ejes.map(e=>({...e}));V.tramos=R.ejes.slice(0,-1).map(()=>({est:KV_EST1}));
    V.corr=[{p:'sup',s:'2Ø5/8',de:R.ejes[0].n,a:R.ejes[R.ejes.length-1].n},{p:'inf',s:'2Ø5/8',de:R.ejes[0].n,a:R.ejes[R.ejes.length-1].n}];L.push(V)}
  kvpGeoTo(V,R);V.pl={eje:A.eje,e0:A.e0,e1:A.e1,ref:X.ref.id};
  kmPut('v_'+pid,{L},(isNew?'Viga desde el plano ':'Viga retrazada ')+(V.cod||''));MET.vid=V.id;MET.vsel=null;MET.cut=1;const back=KVP.back;kvpStop();kvpFit();
  const msg=`${V.cod}: ${R.ejes.length} ejes, ${R.jun.length} junta(s) de sector. Escribe su armado en Metrados › Vigas.`;
  if(back){U.tab='met';U.kmV='vig';saveUI();render();toast(msg)}else{csNivDraw();toast(msg,'Ir a Metrados',()=>{U.tab='met';U.kmV='vig';U.piso=pid;saveUI();render()})}}
/** guías del trazado en curso (coordenadas de la lámina del nivel) */
function kvpDrawO(){const X=kvpCtx(KVP.pid);if(!X||!KVP.step)return{guides:[],dots:[],snap:[]};const m=X.m;const g=[],d=[];
  /* al tocar las caras de un apoyo no se pega a los ejes (la cara está al lado del eje); con DXF se pega a las caras de columnas y vigas que cruzan la viga */
  const snap=KVP.step==='ap'?(CSZ.dxf!==false?dxfAcross(dxfGeo(X.ref,m),(u=>{const q={x:m.a*u.x-m.b*u.y,y:m.b*u.x+m.a*u.y};const k=Math.hypot(q.x,q.y)||1;return{x:q.x/k,y:q.y/k}})(KVP.ax.ln.u)):[]):X.E.map(e=>({pts:csMapF(m,e.p)}));
  if(KVP.a){const q=csAp(m,KVP.a);d.push({x:q.x,y:q.y,c:'#1F5F7A'})}
  if(KVP.ax){const A=KVP.ax;const S=A.S;const last=S[S.length-1];g.push({pts:csMapF(m,csgFlat([A.ln.at(0),A.ln.at(last.s)])),c:'#1F5F7A',w:4,op:.5});
    const nx=-A.ln.u.y,ny=A.ln.u.x;const h=.45/X.mpp;const tick=(s,c,w)=>{const p=A.ln.at(s);g.push({pts:csMapF(m,csgFlat([{x:p.x-nx*h,y:p.y-ny*h},{x:p.x+nx*h,y:p.y+ny*h}])),c,w:w||3,op:.95})};
    S.forEach((u,i)=>{if(u.set&&i!==KVP.ai){tick(u.s+u.o-u.w/2,'#2E7D4F');tick(u.s+u.o+u.w/2,'#2E7D4F')}});if(KVP.step==='ap')KVP.faces.forEach(s=>tick(s,'#C2410C',3))}
  return{guides:g,dots:d,snap}}
function kvpHint(){const A=KVP.ax;if(KVP.step==='a')return'Viga: toca el cruce de ejes donde empieza (se pega al cruce). Esc para salir.';
  if(KVP.step==='b')return`Ahora toca el cruce donde termina, sobre el eje ${KVP.a.v} o el eje ${KVP.a.h}. Los ejes intermedios se cuentan solos.`;
  if(KVP.step==='ap'){const u=A.S[KVP.ai];return`Apoyo en el eje ${u.n} (${KVP.ai+1} de ${A.S.length}): toca sus dos caras sobre la viga${KVP.faces.length?' · falta la segunda':''}.`}return''}
function kvpBar(){if(!KVP.step)return'';return`<div class="kvpbar">${KVP.step==='ap'?`<span class="kvpch">${KVP.ax.S.map((u,i)=>`<span class="kvpc${i===KVP.ai?' cur':u.set?' ok':''}">${esc(u.n)}${u.set?' · '+kmF(u.w,2):''}</span>`).join('')}</span><button type="button" class="ib" data-kvp="same"${KVP.ai?'':' disabled'}>Mismo ancho que el anterior</button>`:''}
  ${KVP.step!=='a'?'<button type="button" class="ib" data-kvp="back">← Atrás</button>':''}<button type="button" class="ib" data-kvp="cancel">Cancelar</button></div>`}
function kvpOnClick(e){const b=e.target.closest('[data-kvp],[data-kvpt]');if(!b)return false;
  if(b.dataset.kvpt){const[vid,ji]=b.dataset.kvpt.split(':');kvpSnapThird(CNV.pid,vid,+ji);return true}
  const k=b.dataset.kvp;if(k==='same')kvpSame();else if(k==='back')kvpBack();else if(k==='cancel'){const back=KVP.back;kvpStop();kvpFit();if(back){U.tab='met';U.kmV='vig';saveUI();render()}else csNivDraw()}return true}
