"use strict";
/* LPS 911 · Planos › Alistar plano (31-10-2026, decidido con el dueño; docs/ia/planos.md «Alistar plano»).
   - Flujo: niveles → cargar planos (las plantas de estructuras y arquitectura en DXF) → ALISTAR → recién después Sectorización, frentes,
     Plan diario y Metrados. Una planta DXF no se puede vincular ni la usa Casco hasta que su revisión está «Lista» (`plb.ok`).
   - Verificación por revisión (`dxfCheck`, pura): datos del plano, escala por las cotas del propio DXF, ejes, malla de ejes del proyecto,
     capas por función, columnas, contorno de la planta, rótulos, ambientes y encuadre. Semáforo: ✓ automático, ⚠ hay que confirmarlo
     (con nota opcional, `plb.alc`), ✕ bloquea. «Marcar como listo» solo sin ✕ y con todo lo ⚠ confirmado.
   - Malla de ejes del proyecto: la fija el primer plano alistado (`ok.malla`, `ok.ej` en metros); los demás niveles y la arquitectura se
     comparan contra ella (tolerancia 2 cm). Marcan «Listo»: el administrador y Oficina Técnica.
   - Correcciones (1-11-2026, pedido del dueño): lo que está mal se arregla aquí, no solo se avisa. Capa de correcciones por revisión
     (`plb.fix.L`, aplicada con `dxfRolesFix`; el DXF no se toca), cada una con quién y cuándo y con deshacer: enderezar ejes girados
     (eligiendo arriba / abajo / medio / distancia al vecino; los ejes girados bloquean), renombrar, mover, quitar y agregar ejes, nombrar
     o descartar líneas sin nombre, quitar o agregar columnas, rótulos y ambientes. Se toca el objeto en el plano y salen sus acciones. */

const PAL_TOL=0.02;   /* m: diferencia máxima con la malla de ejes */
const PAL={on:false,id:'',show:{ej:true,col:true,vig:true,tx:false,amb:true,ctn:true,iss:true},C:null,ctn:false,trace:'',sel:null,prev:null};
const PAL_SHOW=[['ej','Ejes'],['col','Columnas'],['vig','Caras'],['tx','Rótulos'],['amb','Ambientes'],['ctn','Contorno'],['iss','Avisos']];

/* ---------- estado del plano ---------- */
/** quién marca «Listo»: el administrador y Oficina Técnica (decisión del dueño) */
const plAlEd=p=>!!me&&!!p&&!!p.dxf&&!p.eto&&(me.role==='admin'||isOTArea());
/** la revisión rev del plano se puede usar: no es DXF, o es DXF y está alistada */
function plRevOk(p,rev){if(!p)return false;rev=rev||p.rev||1;if(rev===(p.rev||1))return!p.dxf||!!(p.ok&&p.ok.rev===rev);
  const r=(p.revs||[]).find(x=>x.rev===rev);if(!r)return false;return!r.dxf||!!(r.ok&&r.ok.rev===rev)}
const plUsable=p=>plRevOk(p,(p&&p.rev)||1);
const plAlPend=p=>!!p&&!!p.dxf&&!p.eto&&!p.arch&&!plUsable(p);
/** el plano que fija la malla de ejes del proyecto (o null) */
function plMalla(){if(typeof PLB==='undefined')return null;for(const p of PLB.values())if(!p.arch&&p.ok&&p.ok.malla&&p.ok.rev===(p.rev||1)&&Array.isArray(p.ok.ej))return p;return null}
const plAlTag=p=>!p||!p.dxf||p.eto?'':plUsable(p)?' <span class="plalt ok">✓ Listo</span>':' <span class="plalt pend">Por alistar</span>';

/* ---------- verificación (pura) ---------- */
/** número de una cota («6.08», «8,25», «25 cm»): {n, tol (media unidad del último decimal)} o null */
function palNum(s){const m=/^\s*(-?\d+(?:[.,]\d+)?)\s*(?:m|cm|mm)?\s*$/i.exec(String(s||''));if(!m)return null;const t=m[1].replace(',','.');const dec=(t.split('.')[1]||'').length;return{n:+t,tol:0.5*10**-dec*1.0001+1e-9}}
const palIsV=q=>Math.abs(q[2]-q[0])<Math.abs(q[3]-q[1]);
/** cruces de ejes {v, h, x, y} */
function palCross(E){const X=(p,q)=>{const d1x=p[2]-p[0],d1y=p[3]-p[1],d2x=q[2]-q[0],d2y=q[3]-q[1];const den=d1x*d2y-d1y*d2x;if(Math.abs(den)<1e-12)return null;const t=((q[0]-p[0])*d2y-(q[1]-p[1])*d2x)/den;return{x:p[0]+d1x*t,y:p[1]+d1y*t}};
  const V=E.filter(e=>palIsV(e.p)),H=E.filter(e=>!palIsV(e.p));const out=[];for(const v of V)for(const h of H){const q=X(v.p,h.p);if(q)out.push({v:v.n,h:h.n,x:q.x,y:q.y})}return out}
/** semejanza por mínimos cuadrados de P a Q {a,b,e,f} (como csAp) */
function palFit(P,Q){const n=P.length;if(n<2)return null;let px=0,py=0,qx=0,qy=0;for(let i=0;i<n;i++){px+=P[i].x;py+=P[i].y;qx+=Q[i].x;qy+=Q[i].y}px/=n;py/=n;qx/=n;qy/=n;
  let sa=0,sb=0,s2=0;for(let i=0;i<n;i++){const x=P[i].x-px,y=P[i].y-py,u=Q[i].x-qx,v=Q[i].y-qy;sa+=x*u+y*v;sb+=x*v-y*u;s2+=x*x+y*y}if(s2<1e-12)return null;const a=sa/s2,b=sb/s2;return{a,b,e:qx-(a*px-b*py),f:qy-(b*px+a*py)}}
const palAp=(T,p)=>({x:T.a*p.x-T.b*p.y+T.e,y:T.b*p.x+T.a*p.y+T.f});
function palArea(P){let s=0;for(let i=0,n=P.length/2;i<n;i++){const j=(i+1)%n;s+=P[2*i]*P[2*j+1]-P[2*j]*P[2*i+1]}return Math.abs(s)/2}
function palPerim(P){let s=0;for(let i=0,n=P.length/2;i<n;i++){const j=(i+1)%n;s+=Math.hypot(P[2*j]-P[2*i],P[2*j+1]-P[2*i+1])}return s}
function palPip(P,x,y){let c=false;for(let i=0,n=P.length/2,j=n-1;i<n;j=i++){const xi=P[2*i],yi=P[2*i+1],xj=P[2*j],yj=P[2*j+1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
const pal2=v=>(Math.round(v*100)/100).toFixed(2);
const pal3=v=>(Math.round(v*1000)/1000).toFixed(3);
/** distancia (px) del punto a la recta de un eje */
const palDist=(e,x,y)=>{const L=Math.hypot(e.p[2]-e.p[0],e.p[3]-e.p[1])||1;return Math.abs((x-e.p[0])*(e.p[3]-e.p[1])-(y-e.p[1])*(e.p[2]-e.p[0]))/L};
/** contorno propuesto: la polilínea cerrada más grande que ocupa entre el 30 % y el 110 % del área de los ejes (o null) */
function palCtnGuess(G,R){if(!R.ej.length)return null;const xs=R.ej.flatMap(e=>[e.p[0],e.p[2]]),ys=R.ej.flatMap(e=>[e.p[1],e.p[3]]);const A=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));let best=null,ba=0;
  for(const o of G.L)for(const q of o.p){if(!q[0]||q.length<7)continue;const P=q.slice(1),a=palArea(P);if(a>A*0.3&&a<A*1.1&&a>ba){ba=a;best=P}}return best}
/** la verificación de un plano DXF. c = {p (plb), G (geometría), lay, mpp, malla (plb que fija la malla o null), ctn ({P,a} o null)}
    → {it:[{id, t, st:'ok'|'warn'|'err', msg, det:[], act:[], pts:[{x,y}] (px, avisos)}], R, mine (ejes en metros), cand (contorno propuesto)} */
function dxfCheck(c){const{p,G,lay,mpp}=c;const k=(p.dxf&&p.dxf.k)||1;const R=dxfRolesFix(G,lay,mpp,c.fix);const it=[];const add=(id,t,st,msg,det,act,pts,btn)=>it.push({id,t,st,msg,det:det||[],act:act||[],pts:pts||[],btn:btn||[]});
  const est=p.disc==='EST',arq=p.disc==='ARQ';const E=R.ej;const pos=e=>palIsV(e.p)?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2;
  const V=E.filter(e=>palIsV(e.p)).sort((a,b)=>pos(a)-pos(b)),H=E.filter(e=>!palIsV(e.p)).sort((a,b)=>pos(a)-pos(b));const span=A=>A.slice(1).map((e,i)=>`${A[i].n}–${e.n} ${pal3((pos(e)-pos(A[i]))*mpp)}`);
  /* medida de control: la primera luz entre dos ejes rectos (no inclinados) */
  const recto=e=>Math.min(Math.abs(e.p[2]-e.p[0]),Math.abs(e.p[3]-e.p[1]))/(Math.hypot(e.p[2]-e.p[0],e.p[3]-e.p[1])||1)<1e-3;
  const ctlOf=A=>{for(let i=1;i<A.length;i++)if(recto(A[i-1])&&recto(A[i]))return`${A[i-1].n}–${A[i].n} = ${pal3((pos(A[i])-pos(A[i-1]))*mpp)} m`;return''};const ctl=ctlOf(V)||ctlOf(H);
  /* 1. datos */
  {const bad=[];if(!est&&!arq)bad.push('La especialidad debe ser Estructuras o Arquitectura (solo esas plantas van en DXF).');if(!p.pisoId)bad.push('Falta el nivel del plano.');if(!/planta/i.test(p.tipo||''))bad.push('El tipo debe ser «Planta».');
    const pis=typeof plPisoName==='function'?plPisoName(p.pisoId):p.pisoId;
    add('datos','Datos del plano',bad.length?'err':'warn',bad.length?bad.join(' '):`${p.cod} · ${PL_DN[p.disc]||p.disc} · ${p.tipo} · ${pis} · Rev. ${p.rev||1}. Confirma que es el plano y el nivel correctos${est?' (un encofrado es el techo de su nivel)':''}.`,[],['edit'])}
  /* 2. escala por las cotas */
  const D=G.L.flatMap(o=>(o.d||[]).map(d=>({m:d[0],s:d[1],sh:d[2],P:d.slice(3)})));const FAC=[1,100,1000],cnt=[0,0,0];const num=[],mal=[];
  for(const d of D){const q=palNum(d.s||d.sh);if(!q)continue;const v=d.m*k;num.push(d);let hit=-1;FAC.forEach((f,i)=>{if(hit<0&&Math.abs(q.n-v*f)<=q.tol)hit=i});if(hit>=0)cnt[hit]++;else if(d.s)mal.push({d,q,v})}
  const b=cnt.indexOf(Math.max(...cnt));const fb=FAC[b];const un=k===1?'metros':k===0.01?'centímetros':k===0.001?'milímetros':`1 unidad = ${k} m`;
  if(num.length<5)add('escala','Escala y unidades','warn',`El dibujo tiene pocas cotas para comprobar la escala sola. Confirma con una cota del plano: ${ctl||'mide una distancia conocida'}.`,[`Unidades del dibujo: ${un}.`],['lay']);
  else if(cnt[b]/num.length>=0.8){const ml=mal.filter(x=>Math.abs(x.q.n-x.v*fb)>x.q.tol);
    add('escala','Escala y unidades',ml.length?'warn':'ok',`${cnt[b]} de ${num.length} cotas coinciden con el dibujo: la escala y las unidades (${un}) están bien.${ml.length?` ${ml.length} cota(s) con el texto escrito a mano no coinciden con lo dibujado: revísalas.`:''}`,
      [`Medida de control: ${ctl}.`,...ml.slice(0,12).map(x=>`Cota escrita «${x.d.s}», el dibujo mide ${pal2(x.v*fb)}`)],[],ml.map(x=>({x:(x.d.P[0]+x.d.P[2])/2,y:(x.d.P[1]+x.d.P[3])/2})))}
  else add('escala','Escala y unidades','err',`Solo ${cnt[b]} de ${num.length} cotas coinciden con el dibujo: las unidades parecen equivocadas. Revísalas en «◇ Capas» (hoy: ${un}).`,[`Medida de control: ${ctl}.`],['lay']);
  /* 3. ejes */
  {let st='ok';const msg=[],pts=[];const up=s=>{if(s==='err'||st==='ok')st=s};
    if(!V.length||!H.length){up('err');msg.push(!E.length?'No se encontraron ejes con nombre: revisa la capa de ejes en «◇ Capas».':`Faltan ejes ${!V.length?'verticales':'horizontales'}.`)}
    if(R.cnt.dup.length){up('err');msg.push(`Nombre repetido en ejes distintos: ${R.cnt.dup.join(', ')}. Toca la línea marcada y ponle otro nombre o descártala.`)}
    if(R.cnt.ejSin){up('warn');msg.push(`${R.cnt.ejSin} línea(s) de la capa de ejes sin nombre: tócalas para nombrarlas o descartarlas.`)}
    (R.S||[]).forEach(l=>pts.push({x:(l.p[0]+l.p[2])/2,y:(l.p[1]+l.p[3])/2}));
    const nums=E.map(e=>e.n).filter(n=>/^\d+$/.test(n)).map(Number).sort((a,b)=>a-b);const gap=[];for(let i=1;i<nums.length;i++)for(let x=nums[i-1]+1;x<nums[i];x++)gap.push(x);
    const let_=[...new Set(E.map(e=>e.n).filter(n=>/^[A-Z]'*$/.test(n)).map(n=>n[0].charCodeAt(0)))].sort((a,b)=>a-b);for(let i=1;i<let_.length;i++)for(let x=let_[i-1]+1;x<let_[i];x++)gap.push(String.fromCharCode(x));
    if(gap.length){up('warn');msg.push(`Faltan en la secuencia: ${gap.join(', ')} (confirma si es a propósito).`)}
    const inc=E.map(e=>{const dx=Math.abs(e.p[2]-e.p[0]),dy=Math.abs(e.p[3]-e.p[1]);return{e,a:Math.atan2(Math.min(dx,dy),Math.max(dx,dy))*180/Math.PI}}).filter(x=>x.a>0.05);
    /* decisión del dueño: no debe haber ejes girados; bloquea hasta enderezarlos */
    if(inc.length){up('err');msg.push(`Ejes girados: ${inc.map(x=>`${x.e.n} (${x.a.toFixed(2)}°)`).join(', ')}. Enderézalos: no debe haber ejes girados.`);inc.forEach(x=>pts.push({x:(x.e.p[0]+x.e.p[2])/2,y:(x.e.p[1]+x.e.p[3])/2}))}
    const endz=inc.map(x=>({a:'end:'+x.e.n,t:'Enderezar '+x.e.n}));
    /* cotas entre ejes: cada extremo sobre un eje de la misma dirección */
    const onE=(x,y)=>E.find(e=>palDist(e,x,y)<0.05/mpp);let okC=0;const badC=[];
    for(const d of D){const q=palNum(d.s||d.sh);if(!q)continue;const a=onE(d.P[0],d.P[1]),z=onE(d.P[2],d.P[3]);if(!a||!z||a===z||palIsV(a.p)!==palIsV(z.p))continue;/* los extremos de la cota están sobre los ejes: lo dibujado entre ejes es su medida real (en su dirección, sirve con ejes inclinados) */const L=d.m*k;
      if(Math.abs(q.n-L*fb)<=q.tol+0.001)okC++;else{badC.push(`Cota ${a.n}–${z.n} dice ${d.s||d.sh}, entre ejes mide ${pal3(L*fb)}`);pts.push({x:(d.P[0]+d.P[2])/2,y:(d.P[1]+d.P[3])/2})}}
    if(badC.length){up('warn');msg.push(`${badC.length} cota(s) entre ejes no coinciden con la distancia entre los ejes.`)}
    add('ejes','Ejes',st,(msg.length?msg.join(' '):`${E.length} ejes completos y bien nombrados`)+(okC?` · ${okC} cota(s) entre ejes coinciden.`:'.'),[`Verticales: ${V.map(e=>e.n).join(', ')||'—'}`,`Horizontales: ${H.map(e=>e.n).join(', ')||'—'}`,V.length>1?'Luces: '+span(V).join(' · '):'',H.length>1?'Luces: '+span(H).join(' · '):'',...badC.slice(0,12)].filter(Boolean),['lay','ejAdd'],pts,endz)}
  /* 4. malla de ejes del proyecto */
  const mine=E.map(e=>({n:e.n,p:e.p.map(v=>Math.round(v*mpp*1e4)/1e4)}));const M=c.malla;
  if(M&&M.id===p.id)add('malla','Malla de ejes del proyecto','ok','Este plano fija la malla de ejes del proyecto: los demás planos se comparan con él.');
  else if(!M)add('malla','Malla de ejes del proyecto',E.length?'warn':'err',E.length?`Todavía no hay malla de ejes del proyecto: al marcar este plano como listo, sus ${E.length} ejes serán la malla con la que se comparan los demás niveles y la arquitectura.`:'Sin ejes no puede fijar la malla.');
  else{const ME=M.ok.ej;const nm=new Set(mine.map(e=>e.n)),nM=new Set(ME.map(e=>e.n));const falta=[...nM].filter(n=>!nm.has(n)),sobra=[...nm].filter(n=>!nM.has(n));
    const A=new Map(palCross(ME).map(x=>[x.v+'|'+x.h,x]));const P=[],Q=[],nmX=[];for(const x of palCross(mine)){const y=A.get(x.v+'|'+x.h);if(y){P.push(x);Q.push(y);nmX.push(x.v+'-'+x.h)}}
    if(P.length<2)add('malla','Malla de ejes del proyecto','err',`No comparte ejes con la malla del proyecto (${M.cod}): revisa los nombres de los ejes.`);
    else{const T=palFit(P,Q);const sk=Math.hypot(T.a,T.b);const res=P.map((x,i)=>{const q=palAp(T,x);return{n:nmX[i],d:Math.hypot(q.x-Q[i].x,q.y-Q[i].y),x:x.x/mpp,y:x.y/mpp}}).sort((a,b)=>b.d-a.d);
      const far=res.filter(r=>r.d>PAL_TOL);const sc=Math.abs(sk-1)>0.002;const st=far.length||sc?'err':falta.length||sobra.length?'warn':'ok';
      add('malla','Malla de ejes del proyecto',st,sc?`La escala no coincide con la malla (${M.cod}): ${((sk-1)*100).toFixed(2)} %.`:far.length?`${far.length} cruce(s) de ejes corridos más de ${PAL_TOL*100} cm respecto a la malla (${M.cod}).`:
        `Coincide con la malla (${M.cod}): ${P.length} cruces, diferencia máxima ${(res[0].d*100).toFixed(1)} cm.${falta.length?` Faltan ejes de la malla: ${falta.join(', ')}.`:''}${sobra.length?` Ejes que la malla no tiene: ${sobra.join(', ')}.`:''}`,
        far.slice(0,12).map(r=>`${r.n} corrido ${(r.d*100).toFixed(1)} cm`),[],far.map(r=>({x:r.x,y:r.y})))}}
  /* 5. capas por función */
  {const r=[['ej','Ejes'],['col','Columnas'],['vig','Caras de vigas'],['tx','Rótulos'],['mur','Muros'],['amb','Ambientes']].filter(([x])=>est?!['mur','amb'].includes(x):arq?['ej','mur','amb'].includes(x):true);
    /* cuántas líneas trae cada capa elegida: así se nota si la de caras es la equivocada (p. ej. solo las bandas de contracción) */
    const nL=new Map(dxfLayers(dxfGeoF(G)).map(x=>[x.n,x.l+x.p+x.c+x.t]));const lb=n=>n?`${n} (${nL.get(n)||0})`:'—';const pocas=est&&R.cnt.ln<20;
    add('capas','Capas por función',lay.ej?'warn':'err',lay.ej?`Confirma que cada función está en su capa (se ve encima del plano en su color). Caras de vigas: ${R.cnt.ln} líneas.${pocas?' Son muy pocas: revisa en «◇ Capas» que esté marcada la capa del trazo de las vigas.':''}`:'Falta elegir la capa de los ejes.',
      r.map(([x,t])=>`${t}: ${x==='vig'?((lay.vig||[]).map(lb).join(', ')||'—'):lb(lay[x])}`),['lay'])}
  /* 6. columnas */
  if(est){const X=palCross(E);const by=new Map();const off=[];
    for(const q of R.col){const P=q.p;const xs=P.filter((v,i)=>!(i%2)),ys=P.filter((v,i)=>i%2);const w=(Math.max(...xs)-Math.min(...xs))*mpp,h=(Math.max(...ys)-Math.min(...ys))*mpp;const key=`${pal2(Math.min(w,h))}×${pal2(Math.max(w,h))}`;by.set(key,(by.get(key)||0)+1);
      const cx=xs.reduce((s,v)=>s+v,0)/xs.length,cy=ys.reduce((s,v)=>s+v,0)/ys.length;if(X.length&&!X.some(x=>Math.hypot(x.x-cx,x.y-cy)*mpp<1))off.push({x:cx,y:cy})}
    const L=[...by].sort((a,b)=>b[1]-a[1]);const noc=X.filter(x=>!R.col.some(q=>palPip(q.p,x.x,x.y))).length;
    add('col','Columnas','warn',R.col.length?`${R.col.length} columnas: ${L.slice(0,4).map(([k2,n])=>`${n} de ${k2}`).join(', ')}${L.length>4?'…':''}.${off.length?` ${off.length} fuera de un cruce de ejes.`:''}${R.cnt.chico?` Se ignoran ${R.cnt.chico} figura(s) menores de ${DXF_MIN_COL.toFixed(2)} m.`:''}`:'No se encontraron columnas: revisa la capa en «◇ Capas».',
      [...L.map(([k2,n])=>`${n} × ${k2} m`),noc?`${noc} cruce(s) de ejes sin columna`:'','Toca una figura en el plano para quitarla («No es columna» o «ninguna de este tamaño»).'].filter(Boolean),['lay','colAdd'],off)}
  /* 7. contorno de la planta */
  const cand=palCtnGuess(G,R);
  if(c.ctn&&c.ctn.P&&c.ctn.P.length>=6){const H=palHoles(c.ctn);const ab=palArea(c.ctn.P)*mpp*mpp,ah=H.reduce((t,h)=>t+palArea(h.p),0)*mpp*mpp;
    add('ctn','Contorno de la planta','ok',`Área ${pal2(ab-ah)} m²${H.length?` (${pal2(ab)} m² menos ${H.length} hueco(s) de ${pal2(ah)} m²)`:''} · perímetro ${pal2(palPerim(c.ctn.P)*mpp)} m. Es el área que usan la sectorización y los metrados por ratio. Las escaleras exteriores no van: se metran aparte.`,
      H.map((h,ix)=>`Hueco ${ix+1}: ${pal2(palArea(h.p)*mpp*mpp)} m²`),['ctn','hueco'],[],H.map((h,ix)=>({a:'hdel:'+ix,t:`Quitar hueco ${ix+1}`})))}
  else add('ctn','Contorno de la planta','err',`Traza el contorno de la planta (${est?'borde de losa':'perímetro'}): da el área que usan la sectorización y los metrados por ratio.${cand?` Hay uno propuesto de ${pal2(palArea(cand)*mpp*mpp)} m².`:''}`,[],cand?['ctn','ctnauto']:['ctn']);
  /* 8. rótulos */
  if(est){const u=[...new Set(R.tx.map(t=>t.t.replace(/\s+/g,'')))].slice(0,6);add('tx','Rótulos de vigas','warn',R.tx.length?`${R.tx.length} rótulos de sección (${u.join(', ')}${u.length>=6?'…':''}): darán la sección de cada tramo en Metrados.`:'Sin rótulos de sección: las secciones de las vigas se escribirán a mano en Metrados.',[],['lay'])}
  /* 9. ambientes */
  if(arq){const A=R.amb;let sinN=0,sum=0;const pts=[];const det=[];
    for(const q of A){const a=palArea(q.p)*mpp*mpp;sum+=a;const c0=dxfCen(q.p);if(!q.n){sinN++;pts.push(c0)}else if(det.length<20)det.push(`${q.n} · ${pal2(a)} m²`)}
    const ca=c.ctn&&c.ctn.P?palArea(c.ctn.P)*mpp*mpp:0;
    add('amb','Ambientes','warn',A.length?`${A.length} ambientes, ${pal2(sum)} m² en total${ca?` (${Math.round(sum/ca*100)} % del contorno)`:''}.${sinN?` ${sinN} sin nombre.`:''}`:'Sin ambientes: elige la capa de ambientes (polilíneas cerradas) en «◇ Capas», agrégalos trazándolos o confirma que esta planta no los usa.',det,['lay','ambAdd'],pts)}
  /* 10. encuadre */
  {const d=p.dxf||{};add('enc','Encuadre de la lámina','warn',`Lámina de ${(p.mm||[0,0]).join(' × ')} mm desde el ${d.src||'modelo'}${d.crop?', recortada al marco':''}${d.far?`; ${d.far} objeto(s) lejanos quedaron fuera`:''}. Confirma que se ve completa y que no falta nada importante. Si falta algo, vuelve a cargar el DXF como nueva revisión con «Recortar al marco» desmarcado.`)}
  return{it,R,mine,cand}}
/** estado efectivo con lo confirmado: cada ítem con ef 'ok'|'conf'|'warn'|'err'; listo si no queda ⚠ ni ✕ */
function palState(it,chk){chk=chk||{};const L=it.map(x=>({...x,ef:x.st==='warn'?(chk[x.id]?'conf':'warn'):x.st}));return{L,ready:L.every(x=>x.ef==='ok'||x.ef==='conf')}}

/* ---------- pantalla (panel en el visor de Planos) ---------- */
const palP=()=>PLV&&PLB.get(PLV.id);
const palAlc=p=>p&&p.alc&&p.alc.rev===(p.rev||1)?p.alc:{rev:(p&&p.rev)||1,chk:{}};
const palCtn=p=>p&&p.ctn&&p.ctn.rev===(p.rev||1)?p.ctn:null;
/** huecos del contorno (escaleras interiores, ductos, tragaluces): se restan del área */
const palHoles=ct=>ct&&Array.isArray(ct.H)?ct.H.filter(h=>h&&Array.isArray(h.p)&&h.p.length>=6):[];
const palFix=p=>p&&p.fix&&p.fix.rev===(p.rev||1)?p.fix:{rev:(p&&p.rev)||1,L:[]};
function palToggle(on){PAL.on=on==null?!PAL.on:!!on;if(!PAL.on){palReset();return}palAttach()}
function palReset(){PAL.on=false;PAL.C=null;PAL.ctn=false;PAL.trace='';PAL.sel=null;PAL.prev=null;if(PLV){const el=PLV.box.querySelector('.plalp');if(el)el.remove();if(PLV.tv){PLV.tv.al=null;if(PLV.tv.onTap===palTap)PLV.tv.onTap=null;PLV.tv.tick()}const b=PLV.box.querySelector('[data-pv="alis"]');if(b)b.classList.remove('on')}}
/** al abrir o cambiar de lámina en el visor */
function palAttach(){if(!PAL.on||!PLV||!PLV.tv)return;const p=palP();const sp=p&&plSpecOf(p,PLV.rev);if(!p||!sp||!sp.dxf||!sp.cur){palReset();return}
  if(PAL.id!==p.id){PAL.sel=null;PAL.prev=null}PAL.id=p.id;PLV.tv.al=palDraw;const b=PLV.box.querySelector('[data-pv="alis"]');if(b)b.classList.add('on');palRender()}
/** toques en el plano: eligen un objeto (si Medir no está activo) */
function palHook(){if(PLV&&PLV.tv&&PAL.on&&!PLM.on&&!PLV.tv.onTap)PLV.tv.onTap=palTap}
async function palRender(){const p=palP();if(!PAL.on||!p)return;const sp=plSpecOf(p,PLV.rev);if(!PLM.on){PAL.trace='';PAL.ctn=false}let el=PLV.box.querySelector('.plalp');
  /* en la caja del visor (no dentro del lienzo: ahí los toques mueven el plano), a la altura del plano, como el panel ☰ Planos */
  if(!el){el=document.createElement('div');el.className='plalp';el.setAttribute('role','region');el.setAttribute('aria-label','Alistar plano');PLV.box.appendChild(el);el.onclick=palClick;el.onchange=palChange;el.addEventListener('keydown',e=>e.stopPropagation())}
  {const body=PLV.box.querySelector('.plvb');el.style.top=(body?body.offsetTop:56)+'px'}
  let G=GEO.get(sp.base);if(!G||!G.g){shx(el,'<div class="plalh"><b>Alistar plano</b><button class="ib" data-pal="x" aria-label="Cerrar">✕</button></div><p class="mu">Cargando la geometría del DXF…</p>');try{await plGeoGet(sp)}catch(e){shx(el,`<div class="plalh"><b>Alistar plano</b><button class="ib" data-pal="x" aria-label="Cerrar">✕</button></div><p class="note">No se pudo leer la geometría: ${esc(e.message||e)}</p>`);return}if(!PAL.on||palP()!==p)return;G=GEO.get(sp.base)}
  const C=dxfCheck({p,G:G.g,lay:p.dxf.lay||{},mpp:p.dxf.mpp,malla:plMalla(),ctn:palCtn(p),fix:palFix(p)});PAL.C=C;const A=palAlc(p);const S=palState(C.it,A.chk);const ed=plAlEd(p);const ok=plUsable(p);const M=plMalla();const FX=palFix(p).L;
  const ico={ok:'✓',conf:'☑',warn:'⚠',err:'✕'};const nE=S.L.filter(x=>x.ef==='err').length,nW=S.L.filter(x=>x.ef==='warn').length;
  const actB={edit:'Corregir datos',lay:'◇ Capas…',ctn:palCtn(p)?'Ajustar contorno':'Trazar contorno',hueco:'+ Agregar hueco',ctnauto:'Usar el propuesto',ejAdd:'+ Agregar eje',colAdd:'+ Agregar columna',ambAdd:'+ Agregar ambiente'};
  shx(el,`<div class="plalh"><b>Alistar ${esc(p.cod)} · Rev. ${p.rev||1}</b><button class="ib" data-pal="x" aria-label="Cerrar">✕</button></div>
    <div class="plals ${ok?'ok':nE?'err':'warn'}">${ok?`<b>✓ Listo</b> · ${esc(p.ok.byN||p.ok.by||'')} · ${esc(fmtD(ldt(p.ok.t)))}${p.ok.malla?' · fija la malla de ejes':''}`:nE?`<b>${nE} punto(s) por resolver</b>${nW?` y ${nW} por confirmar`:''}`:nW?`<b>${nW} punto(s) por confirmar</b>`:'<b>Todo revisado</b>: ya puedes marcarlo como listo'}</div>
    ${palSelHtml(p,ed)}
    <div class="plalv" role="group" aria-label="Ver encima del plano">${PAL_SHOW.filter(([k])=>p.disc==='ARQ'?!['col','vig','tx'].includes(k):k!=='amb').map(([k,t])=>`<button type="button" class="plchip${PAL.show[k]?' on':''}" data-pal="show:${k}">${t}</button>`).join('')}</div>
    ${ed?'<p class="note palhint">Toca un eje, una columna, una línea marcada o un ambiente en el plano para corregirlo.</p>':''}
    <ol class="plall">${S.L.map(x=>`<li class="palit ${x.ef}"><div class="paltop"><span class="palic" aria-hidden="true">${ico[x.ef]}</span><b>${esc(x.t)}</b>${x.pts.length?`<button type="button" class="ab palgo" data-pal="go:${x.id}" title="Ver en el plano">◎ Ver</button>`:''}</div><p>${esc(x.msg)}</p>
      ${x.det.length?`<details><summary>Detalle</summary><ul>${x.det.map(d=>`<li>${esc(d)}</li>`).join('')}</ul></details>`:''}
      ${ed&&(x.act.length||x.btn.length||(x.st==='warn'&&!ok))?`<div class="palac">${x.btn.map(b=>`<button type="button" class="ib pri" data-pal="${esc(b.a)}">${esc(b.t)}</button>`).join('')}${x.act.map(a=>`<button type="button" class="ib" data-pal="${a}">${actB[a]}</button>`).join('')}${x.st==='warn'&&!ok?`<label class="chk"><input type="checkbox" data-palc="${x.id}"${A.chk[x.id]?' checked':''}> Revisado</label><input class="tin paln" data-paln="${x.id}" placeholder="Nota (opcional)" value="${esc((A.chk[x.id]&&A.chk[x.id].n)||'')}" aria-label="Nota de ${esc(x.t)}">`:''}</div>`:''}
      ${!ed&&A.chk[x.id]&&A.chk[x.id].n?`<p class="mu">Nota: ${esc(A.chk[x.id].n)}</p>`:''}</li>`).join('')}</ol>
    ${FX.length?`<details class="palfx"${PAL.fxo?' open':''}><summary><b>Correcciones (${FX.length})</b> <span class="mu">hechas en el sistema; el DXF no cambia</span></summary><ol>${FX.map(f=>`<li><span>${esc(palFixTxt(f,p.dxf.mpp))}</span><small class="mu">${esc(f.byN||f.by||'')} · ${esc(fmtD(ldt(f.t)))}${f.nota?' · '+esc(f.nota):''}</small>${ed?`<button type="button" class="ab" data-pal="fxdel:${esc(f.id)}" title="Deshacer esta corrección">↶</button>`:''}</li>`).join('')}</ol></details>`:''}
    ${ed?`<div class="lqbtns">${ok?`<button type="button" class="ib" data-pal="undo">Volver a revisar</button>${me.role==='admin'&&M&&M.id!==p.id?'<button type="button" class="ib" data-pal="malla">Usar como malla de ejes</button>':''}`:`<button type="button" class="ib pri" data-pal="ok"${S.ready?'':' disabled'}>Marcar como listo</button>`}</div>`:`<p class="note">${ok?'':'Lo alistan el administrador y Oficina Técnica.'}</p>`}
    <p class="note">Hasta que esté listo, este plano no se puede vincular a Sectorización, Plan diario ni Metrados.</p>`);
  const fxd=el.querySelector('.palfx');if(fxd)fxd.addEventListener('toggle',()=>{PAL.fxo=fxd.open});
  const bt=PLV.box.querySelector('[data-pv="alis"]');if(bt){bt.textContent=ok?'✓ Listo':'⚠ Alistar';bt.classList.toggle('ok',ok)}
  palHook();PLV.tv.tick()}
/** texto de una corrección para el registro */
function palFixTxt(f,mpp){const m=v=>pal2(v);switch(f.k){
  case'ejRen':return`Eje ${f.n} renombrado a ${f.a}`;case'ejDel':return`Eje ${f.n} quitado`;
  case'ejSet':return f.how?`Eje ${f.n} ${f.how}`:`Eje ${f.n} movido`;case'ejAdd':return f.lin?`Línea sin nombre nombrada como eje ${f.n}`:`Eje ${f.n} agregado`;
  case'linIgn':return'Línea de la capa de ejes descartada (no es eje)';case'colDel':return`Columna quitada${f.sz?` (${f.sz} m)`:''}`;case'colDelSz':return`Columnas de ${m(f.w)}×${m(f.h)} m quitadas (no son columnas)`;
  case'colAdd':return`Columna agregada${f.sz?` (${f.sz} m)`:''}`;case'txDel':return`Rótulo «${f.t||''}» quitado`;case'ambRen':return`Ambiente renombrado a «${f.a}»`;case'ambDel':return`Ambiente «${f.n||''}» quitado`;case'ambAdd':return`Ambiente «${f.a||''}» agregado`}return f.k}
async function palSet(p,o,msg){try{await plCol(p).doc(p.id).update(o);if(msg)toast(msg)}catch(e){toast('No se pudo guardar: '+(e.code||e.message||e))}}
/** agrega una corrección (con quién y cuándo); si el plano estaba listo vuelve a «Por alistar» */
async function palFixAdd(p,f,msg){const F=palFix(p);const L=[...F.L,{...f,id:uid('fx'),by:me.email,byN:me.name||me.email,t:NOW()}];const o={fix:{rev:p.rev||1,L}};if(plUsable(p))o.ok=firebase.firestore.FieldValue.delete();
  PAL.sel=null;PAL.prev=null;await palSet(p,o,msg)}
async function palFixDel(p,id){const F=palFix(p);const f=F.L.find(x=>x.id===id);if(!f)return;const o={fix:{rev:p.rev||1,L:F.L.filter(x=>x.id!==id)}};if(plUsable(p))o.ok=firebase.firestore.FieldValue.delete();await palSet(p,o,'Corrección deshecha: '+palFixTxt(f,p.dxf.mpp))}
async function palClick(e){const b=e.target.closest('[data-pal]');if(!b)return;const k=b.dataset.pal;const p=palP();if(!p)return;
  if(k==='x'){palToggle(false);return}
  if(k.startsWith('show:')){const s=k.slice(5);PAL.show[s]=!PAL.show[s];palRender();return}
  if(k.startsWith('go:')){const it=PAL.C&&PAL.C.it.find(x=>x.id===k.slice(3));if(it&&it.pts.length){PAL.goi=((PAL.goi||0)+1)%it.pts.length;const q=it.pts[PAL.goi];palGo(q.x,q.y)}return}
  if(k==='selx'){PAL.sel=null;PAL.prev=null;palRender();return}
  if(!plAlEd(p))return;
  /* con el plano ya listo todo se puede seguir corrigiendo: se avisa una vez y vuelve a «Por alistar» */
  if(plUsable(p)&&!['undo','malla','edit'].includes(k)&&!await palOkEdit(p))return;
  if(k==='edit')plEdit(p,b);else if(k==='lay')plDxfLay(p);
  else if(k==='ctn'||k==='hueco'||k==='colAdd'||k==='ambAdd'||k==='ejAdd')palTraceStart(k);
  else if(k.startsWith('hdel:')){const ct=palCtn(p);if(!ct)return;const H=palHoles(ct).filter((h,i)=>i!==+k.slice(5));await palCtnPut(p,ct.P,H,'Hueco quitado.')}
  else if(k==='ctnauto'){const C=PAL.C;if(C&&C.cand)await palCtnPut(p,C.cand)}
  else if(k==='ok')await palOk(p);
  else if(k.startsWith('end:'))palEnd(p,k.slice(4),'end');
  else if(k.startsWith('fxdel:'))await palFixDel(p,k.slice(6));
  else if(k.startsWith('sel:'))await palSelAct(p,k.slice(4));
  else if(k==='undo'){if(!await uiAsk({title:'¿Volver a revisar este plano?',tone:'warn',text:'Lo que ya lo usa sigue igual, pero no se podrá vincular de nuevo hasta alistarlo.'+(p.ok&&p.ok.malla?' Este plano fija la malla de ejes: el próximo que se aliste será la nueva malla.':''),ok:'Volver a revisar'}))return;await palSet(p,{ok:firebase.firestore.FieldValue.delete()},'El plano volvió a «Por alistar».')}
  else if(k==='malla')await palMallaSet(p)}
/** editar el contorno de un plano ya listo lo devuelve a «Por alistar»: se avisa antes */
async function palOkEdit(p){if(!plUsable(p))return true;return uiAsk({title:'¿Corregir un plano ya listo?',tone:'warn',text:'Al corregir algo vuelve a «Por alistar» y hay que marcarlo listo de nuevo. Lo que ya lo usa sigue igual hasta entonces.',ok:'Corregir'})}
async function palChange(e){const t=e.target;const p=palP();if(!p||!plAlEd(p))return;const A=palAlc(p);const chk={...A.chk};
  if(t.dataset.palc){const id=t.dataset.palc;if(t.checked)chk[id]={n:(chk[id]&&chk[id].n)||'',t:NOW(),by:me.email};else delete chk[id]}
  else if(t.dataset.paln){const id=t.dataset.paln;if(!chk[id]){toast('Marca «Revisado» para guardar la nota.');return}chk[id]={...chk[id],n:t.value.trim().slice(0,300)}}else return;
  await palSet(p,{alc:{rev:p.rev||1,chk}})}
/** acerca el plano a un punto (px del nivel de detalle) */
function palGo(x,y){const v=PLV&&PLV.tv;if(!v)return;v.setView({nx:x/v.W,ny:y/v.H,k:6})}

/* ---------- elegir un objeto en el plano ---------- */
/** el objeto más cercano al toque: eje, línea sin nombre, columna, rótulo o ambiente */
function palPick(C,w,tol){const R=C.R;const dl=(p)=>{const dx=p[2]-p[0],dy=p[3]-p[1],l2=dx*dx+dy*dy||1;const t=Math.max(0,Math.min(1,((w.x-p[0])*dx+(w.y-p[1])*dy)/l2));return Math.hypot(p[0]+t*dx-w.x,p[1]+t*dy-w.y)};
  let best=null,bd=tol;const try_=(o,d)=>{if(d<bd){bd=d;best=o}};
  (R.S||[]).forEach(l=>try_({k:'lin',p:l.p,dup:l.dup||''},dl(l.p)*0.8));
  R.ej.forEach(e=>try_({k:'ej',n:e.n,p:e.p},dl(e.p)));
  if(best)return best;
  for(const t of R.tx)if(Math.hypot(t.x-w.x,t.y-w.y)<tol)return{k:'tx',t:t.t,x:t.x,y:t.y};
  for(const q of R.col)if(palPip(q.p,w.x,w.y))return{k:'col',p:q.p,x:w.x,y:w.y};
  for(const a of R.amb||[])if(palPip(a.p,w.x,w.y))return{k:'amb',p:a.p,n:a.n,x:w.x,y:w.y};
  return null}
function palTap(cx,cy){const p=palP();if(!PAL.on||!p||!PAL.C||PLM.on)return;const v=PLV.tv;const w=v.toWorld(cx,cy);const a=v.toScreen(0,0),b=v.toScreen(1,0);const k=Math.hypot(b.x-a.x,b.y-a.y)||1;
  PAL.sel=palPick(PAL.C,w,14/k);PAL.prev=null;palRender()}
/** acciones del objeto elegido */
function palSelHtml(p,ed){const s=PAL.sel;if(!s)return'';const mpp=p.dxf.mpp;let t='',B=[];
  const inc=s.k==='ej'&&(()=>{const dx=Math.abs(s.p[2]-s.p[0]),dy=Math.abs(s.p[3]-s.p[1]);return Math.atan2(Math.min(dx,dy),Math.max(dx,dy))*180/Math.PI})();
  if(s.k==='ej'){t=`Eje ${s.n}${inc>0.05?` · girado ${inc.toFixed(2)}°`:''}`;B=[inc>0.05?['end','Enderezar']:null,['mov','Mover'],['ren','Renombrar'],['del','Quitar']].filter(Boolean)}
  else if(s.k==='lin'){t=s.dup?`Línea con el nombre repetido «${s.dup}»`:'Línea de la capa de ejes sin nombre';B=[['name','Nombrar como eje'],['ign','No es un eje']]}
  else if(s.k==='col'){const z=dxfSz(s.p,mpp);t=`Columna ${pal2(z[0])}×${pal2(z[1])} m`;B=[['cdel','No es columna'],['csz',`Ninguna de ${pal2(z[0])}×${pal2(z[1])}`]]}
  else if(s.k==='tx'){t=`Rótulo «${s.t}»`;B=[['tdel','Quitar']]}
  else if(s.k==='amb'){t=`Ambiente «${s.n||'sin nombre'}» · ${pal2(palArea(s.p)*mpp*mpp)} m²`;B=[['aren','Renombrar'],['adel','Quitar']]}
  return`<div class="palsel"><div class="paltop"><b>${esc(t)}</b><button type="button" class="ab" data-pal="selx" aria-label="Quitar la selección">✕</button></div>${ed?`<div class="palac">${B.map(([a,l])=>`<button type="button" class="ib" data-pal="sel:${a}">${esc(l)}</button>`).join('')}</div>`:''}</div>`}
async function palSelAct(p,a){const s=PAL.sel;if(!s)return;const mpp=p.dxf.mpp;const names=new Set(PAL.C.R.ej.map(e=>e.n));
  const askName=async(t,v)=>{const n=await uiAsk({title:t,input:{label:'Nombre del eje',required:true,value:v||''},ok:'Guardar'});if(!n)return'';const u=String(n).trim().toUpperCase().slice(0,4);if(names.has(u)&&u!==v){toast(`Ya hay un eje ${u}.`);return''}return u};
  if(a==='end')return palEnd(p,s.n,'end');if(a==='mov')return palEnd(p,s.n,'mov');
  if(a==='ren'){const u=await askName(`Renombrar el eje ${s.n}`,s.n);if(u&&u!==s.n)await palFixAdd(p,{k:'ejRen',n:s.n,a:u},`Eje ${s.n} → ${u}`);return}
  if(a==='del'){if(!await uiAsk({title:`¿Quitar el eje ${s.n}?`,text:'Deja de usarse como eje en Sectorización, Metrados y la malla. Se puede deshacer en «Correcciones».',ok:'Quitar',tone:'warn'}))return;await palFixAdd(p,{k:'ejDel',n:s.n},`Eje ${s.n} quitado`);return}
  if(a==='name'){const u=await askName('Nombrar la línea como eje','');if(u)await palFixAdd(p,{k:'ejAdd',n:u,p:s.p.map(v=>Math.round(v*100)/100),lin:1},`Eje ${u} agregado`);return}
  if(a==='ign'){await palFixAdd(p,{k:'linIgn',p:s.p.map(v=>Math.round(v*100)/100)},'Línea descartada');return}
  if(a==='cdel'){const z=dxfSz(s.p,mpp);await palFixAdd(p,{k:'colDel',x:Math.round(s.x*100)/100,y:Math.round(s.y*100)/100,sz:`${pal2(z[0])}×${pal2(z[1])}`},'Columna quitada');return}
  if(a==='csz'){const z=dxfSz(s.p,mpp);await palFixAdd(p,{k:'colDelSz',w:z[0],h:z[1]},`Columnas de ${pal2(z[0])}×${pal2(z[1])} quitadas`);return}
  if(a==='tdel'){await palFixAdd(p,{k:'txDel',x:s.x,y:s.y,t:s.t},'Rótulo quitado');return}
  if(a==='aren'){const n=await uiAsk({title:'Renombrar el ambiente',input:{label:'Nombre',required:true,value:s.n||''},ok:'Guardar'});if(n)await palFixAdd(p,{k:'ambRen',x:s.x,y:s.y,a:String(n).trim().slice(0,60)},'Ambiente renombrado');return}
  if(a==='adel'){await palFixAdd(p,{k:'ambDel',x:s.x,y:s.y,n:s.n||''},'Ambiente quitado');return}}

/* ---------- enderezar y mover ejes ---------- */
/** opciones para dejar el eje n recto (o moverlo): arriba/abajo (o izquierda/derecha), al medio, o a una distancia del eje vecino */
function palEndOpts(R,n,mpp){const E=R.ej;const e=E.find(x=>x.n===n);if(!e)return null;const v=palIsV(e.p);const ix=v?0:1;const p=e.p;
  const [a,b]=v?(p[1]<=p[3]?[[p[0],p[1]],[p[2],p[3]]]:[[p[2],p[3]],[p[0],p[1]]]):(p[0]<=p[2]?[[p[0],p[1]],[p[2],p[3]]]:[[p[2],p[3]],[p[0],p[1]]]);
  const c=e=>palIsV(e.p)===v?(v?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2):null;const me=(a[ix]+b[ix])/2;
  const N=E.filter(x=>x!==e&&palIsV(x.p)===v).sort((x,y)=>Math.abs(c(x)-me)-Math.abs(c(y)-me))[0]||null;
  const lo=v?Math.min(p[1],p[3]):Math.min(p[0],p[2]),hi=v?Math.max(p[1],p[3]):Math.max(p[0],p[2]);
  const line=q=>v?[q,lo,q,hi]:[lo,q,hi,q];const d=q=>N?Math.abs(q-c(N))*mpp:null;
  const O=[{k:'a',t:v?'Como está arriba':'Como está a la izquierda',c:a[ix]},{k:'b',t:v?'Como está abajo':'Como está a la derecha',c:b[ix]},{k:'m',t:'Al medio',c:me}].map(o=>({...o,p:line(o.c),d:d(o.c)}));
  return{e,v,N,O,line,cN:N?c(N):null,me}}
function palEnd(p,n,mode){const C=PAL.C;if(!C)return;const mpp=p.dxf.mpp;const X=palEndOpts(C.R,n,mpp);if(!X)return;const end=mode==='end';
  const opt=end?X.O:[];let sel=end?'a':'d';const dist=X.N?pal3(Math.abs(X.me-X.cN)*mpp):'';
  const pOf=()=>{if(sel==='d'){const v=+String((document.getElementById('paldd')||{}).value||'').replace(',','.');if(!(v>0)||!X.N)return null;const sg=Math.sign(X.me-X.cN)||1;return X.line(X.cN+sg*v/mpp)}const o=opt.find(x=>x.k===sel);return o?o.p:null};
  const draw=()=>{PAL.prev=pOf();if(PLV&&PLV.tv)PLV.tv.tick()};
  lqModal(`<div class="lqtop"><b>${end?'Enderezar':'Mover'} el eje ${esc(n)}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
    <p class="mu">${end?`El eje está girado. Elige dónde queda recto${X.N?` (distancias al eje ${esc(X.N.n)})`:''}; se ve en naranja sobre el plano.`:`Escribe a qué distancia del eje ${X.N?esc(X.N.n):'vecino'} debe quedar.`}</p>
    <div class="palopt">${opt.map(o=>`<label class="chk"><input type="radio" name="palend" value="${o.k}"${o.k===sel?' checked':''}> ${esc(o.t)}${o.d!=null?` · a ${pal3(o.d)} m del eje ${esc(X.N.n)}`:''}</label>`).join('')}
      ${X.N?`<label class="chk"><input type="radio" name="palend" value="d"${sel==='d'?' checked':''}> A una distancia del eje ${esc(X.N.n)}: <input class="tin" id="paldd" inputmode="decimal" value="${dist}" style="width:90px" aria-label="Distancia en metros"> m</label>`:''}</div>
    <label class="kmfl">Nota (opcional)<input class="tin" id="paldn" placeholder="Ej.: según cota 1–2 = 3.27 del plano"></label>
    <div class="lqbtns"><button type="button" class="ib" data-lqx>Cancelar</button><button type="button" class="ib pri" data-palend="ok">${end?'Enderezar':'Mover'}</button></div>`,
    async e=>{const b=e.target.closest('[data-palend]');if(!b)return;const q=pOf();if(!q){toast('Escribe una distancia válida.');return}const o=opt.find(x=>x.k===sel);
      const how=sel==='d'?`${end?'enderezado':'movido'} a ${pal3(+String(document.getElementById('paldd').value).replace(',','.'))} m del eje ${X.N.n}`:`enderezado ${o.t.toLowerCase()}${o.d!=null?` (a ${pal3(o.d)} m del eje ${X.N.n})`:''}`;
      const nota=(document.getElementById('paldn').value||'').trim().slice(0,200);lqClose();PAL.prev=null;await palFixAdd(p,{k:'ejSet',n,p:q.map(v=>Math.round(v*100)/100),how,...(nota?{nota}:{})},`Eje ${n} ${how}`)},
    e=>{const t=e.target;if(t.name==='palend'){sel=t.value;draw()}else if(t.id==='paldd'){sel='d';const r=document.querySelector('input[name="palend"][value="d"]');if(r)r.checked=true;draw()}});
  const dd=document.getElementById('paldd');if(dd)dd.addEventListener('input',()=>{sel='d';const r=document.querySelector('input[name="palend"][value="d"]');if(r)r.checked=true;draw()});
  const lq=document.getElementById('lqm');if(lq){const obs=new MutationObserver(()=>{if(!document.getElementById('lqm')){PAL.prev=null;if(PLV&&PLV.tv)PLV.tv.tick();obs.disconnect()}});obs.observe(document.body,{childList:true})}
  draw()}

/* ---------- trazar con Medir: contorno, columna, ambiente o eje ---------- */
const PAL_TR={ctn:['area','Usar como contorno'],hueco:['area','Usar como hueco'],colAdd:['area','Usar como columna'],ambAdd:['area','Usar como ambiente'],ejAdd:['dist','Usar como eje']};
function palTraceStart(k){const p=palP();PAL.trace=k;PAL.ctn=k==='ctn';PAL.sel=null;if(PLV.tv.onTap===palTap)PLV.tv.onTap=null;if(!PLM.on)plmToggle();const[tool]=PAL_TR[k];PLM.tool=tool;
  const ct=k==='ctn'&&palCtn(p);PLM.L[tool]=ct?csUnflatPal(ct.P):[];PLV.tv.tick();plmBar();
  if(k==='hueco'){toast('Toca cada esquina del hueco (escalera interior, ducto, tragaluz) y luego «Usar como hueco».');return}
  toast(k==='ctn'?(ct?'Arrastra las esquinas para ajustar el contorno y toca «Usar como contorno».':'Toca cada esquina del contorno (se pega al dibujo) y luego «Usar como contorno».'):k==='ejAdd'?'Toca los dos extremos del eje (se pega al dibujo) y luego «Usar como eje».':'Toca cada esquina (se pega al dibujo) y luego «'+PAL_TR[k][1]+'».')}
const csUnflatPal=P=>{const o=[];for(let i=0;i+1<P.length;i+=2)o.push({x:P[i],y:P[i+1]});return o};
/** barra de Medir: el botón para usar lo trazado */
const palCtnBar=()=>{if(!PAL.on||!PAL.trace)return'';const[tool,t]=PAL_TR[PAL.trace];if(PLM.tool!==tool)return'';const need=tool==='dist'?2:3;return`<button type="button" class="ib pri" data-pm="ctnok"${plmList().length>=need?'':' disabled'}>${t}</button>`};
async function palCtnSave(){const p=palP();if(!p||!plAlEd(p)||!PAL.trace)return;const k=PAL.trace;const[tool]=PAL_TR[k];const L=PLM.L[tool];const P=L.flatMap(q=>[Math.round(q.x*100)/100,Math.round(q.y*100)/100]);
  if(tool==='area'&&L.length<3){toast('Necesita al menos 3 esquinas.');return}if(tool==='dist'&&L.length<2){toast('Toca los dos extremos del eje.');return}
  PAL.trace='';PAL.ctn=false;plmToggle();const mpp=p.dxf.mpp;
  if(k==='ctn'){const ct=palCtn(p);await palCtnPut(p,P,palHoles(ct))}
  else if(k==='hueco'){const ct=palCtn(p);if(!ct){toast('Primero traza el contorno.');return}await palCtnPut(p,ct.P,[...palHoles(ct),{p:P}],'Hueco agregado: su área se resta del contorno.')}
  else if(k==='colAdd'){const z=dxfSz(P,mpp);await palFixAdd(p,{k:'colAdd',p:P,sz:`${pal2(z[0])}×${pal2(z[1])}`},'Columna agregada')}
  else if(k==='ambAdd'){const n=await uiAsk({title:'Nombre del ambiente',input:{label:'Nombre',required:false,value:''},ok:'Guardar'});if(n==null)return;await palFixAdd(p,{k:'ambAdd',p:P,a:String(n||'').trim().slice(0,60)},'Ambiente agregado')}
  else if(k==='ejAdd'){const names=new Set(PAL.C.R.ej.map(e=>e.n));const n=await uiAsk({title:'Nombre del eje nuevo',input:{label:'Nombre',required:true,value:''},ok:'Guardar'});const u=String(n||'').trim().toUpperCase().slice(0,4);if(!u)return;if(names.has(u)){toast(`Ya hay un eje ${u}.`);return}
    /* recto: horizontal o vertical según su dirección */const v=Math.abs(P[2]-P[0])<Math.abs(P[3]-P[1]);const q=v?[(P[0]+P[2])/2,P[1],(P[0]+P[2])/2,P[3]]:[P[0],(P[1]+P[3])/2,P[2],(P[1]+P[3])/2];
    await palFixAdd(p,{k:'ejAdd',n:u,p:q},`Eje ${u} agregado`)}}
/** guarda el contorno (px del nivel de detalle) */
async function palCtnPut(p,P,H,msg){const mpp=p.dxf.mpp;const r=v=>Math.round(v*10)/10;const Q=P.map(r);const HH=(H||[]).map(h=>({p:h.p.map(r)}));const a=palArea(Q)-HH.reduce((t,h)=>t+palArea(h.p),0);
  const o={ctn:{rev:p.rev||1,P:Q,H:HH,a:Math.round(a*mpp*mpp*100)/100,t:NOW(),by:me.email}};if(plUsable(p))o.ok=firebase.firestore.FieldValue.delete();await palSet(p,o,msg||'Contorno guardado.')}
async function palOk(p){const C=PAL.C;if(!C)return;const A=palAlc(p);const S=palState(C.it,A.chk);if(!S.ready){toast('Faltan puntos por resolver o confirmar.');return}const M=plMalla();const fija=!M;
  const sum={ej:C.R.cnt.ej,col:C.R.cnt.col,ln:C.R.cnt.ln,tx:C.R.cnt.tx,fix:palFix(p).L.length};const ok={rev:p.rev||1,t:NOW(),by:me.email,byN:me.name||me.email,chk:A.chk,sum,malla:fija};if(fija){ok.ej=C.mine;ok.mpp=p.dxf.mpp}
  await palSet(p,{ok},fija?`${p.cod} listo: sus ${C.mine.length} ejes son la malla del proyecto.`:`${p.cod} listo: ya se puede vincular.`)}
/** el administrador cambia qué plano fija la malla de ejes */
async function palMallaSet(p){if(me.role!=='admin'||!p.ok)return;const M=plMalla();const C=PAL.C;if(!C)return;
  if(!await uiAsk({title:`¿Usar ${p.cod} como malla de ejes del proyecto?`,tone:'warn',text:`Reemplaza a ${M?M.cod:'la actual'}. Los demás planos se compararán con los ejes de ${p.cod}; los ya alistados no cambian.`,ok:'Usar como malla'}))return;
  if(M)await palSet(M,{'ok.malla':false,'ok.ej':firebase.firestore.FieldValue.delete()});await palSet(p,{'ok.malla':true,'ok.ej':C.mine,'ok.mpp':p.dxf.mpp},`${p.cod} es ahora la malla de ejes del proyecto.`)}
/** dibujo encima del plano (gancho V.al de plTiles) */
function palDraw(g,V){const C=PAL.C;const p=palP();if(!C||!p)return;const R=C.R,s=V.toScreen.bind(V),sh=PAL.show;const lt=(P,cl)=>{g.beginPath();for(let i=0;i+1<P.length;i+=2){const q=s(P[i],P[i+1]);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)}if(cl)g.closePath()};
  if(sh.ctn&&!(PAL.trace==='ctn'&&PLM.on)){const ct=palCtn(p);if(ct){lt(ct.P,true);g.fillStyle='rgba(31,95,122,.10)';g.fill();g.lineWidth=3;g.strokeStyle='#1F5F7A';g.stroke();
      for(const h of palHoles(ct)){lt(h.p,true);g.fillStyle='rgba(184,58,46,.12)';g.fill();g.setLineDash([6,4]);g.lineWidth=2;g.strokeStyle='#B83A2E';g.stroke();g.setLineDash([])}}else if(C.cand){lt(C.cand,true);g.setLineDash([8,6]);g.lineWidth=2;g.strokeStyle='#1F5F7A';g.stroke();g.setLineDash([])}}
  if(sh.amb)for(const a of R.amb||[]){lt(a.p,true);g.fillStyle='rgba(46,125,79,.16)';g.fill();g.lineWidth=1.5;g.strokeStyle='#2E7D4F';g.stroke()}
  if(sh.col)for(const q of R.col){lt(q.p,true);g.fillStyle=q.add?'rgba(46,125,79,.35)':'rgba(51,65,85,.35)';g.fill();g.lineWidth=1.5;g.strokeStyle='#334155';g.stroke()}
  if(sh.vig){g.beginPath();for(let i=0;i+3<R.ln.length;i+=4){const a=s(R.ln[i],R.ln[i+1]),b=s(R.ln[i+2],R.ln[i+3]);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y)}g.lineWidth=1.5;g.strokeStyle='#0E7490';g.stroke()}
  if(sh.ej){g.lineWidth=2;g.strokeStyle='#B83A2E';g.setLineDash([6,5]);for(const l of R.S||[]){lt(l.p,false);g.stroke()}
    g.setLineDash([14,4,3,4]);g.lineWidth=1.6;g.strokeStyle='#C2410C';g.font='600 12px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
    for(const e of R.ej){lt(e.p,false);g.stroke();const q=s(e.p[0],e.p[1]);g.setLineDash([]);g.fillStyle='#C2410C';g.beginPath();g.arc(q.x,q.y,10,0,2*Math.PI);g.fill();g.fillStyle='#fff';g.fillText(e.n,q.x,q.y);g.setLineDash([14,4,3,4])}g.setLineDash([])}
  if(sh.tx){g.fillStyle='#7C3AED';for(const t of R.tx){const q=s(t.x,t.y);g.beginPath();g.arc(q.x,q.y,3,0,2*Math.PI);g.fill()}}
  if(sh.iss){g.lineWidth=2.5;g.strokeStyle='#B83A2E';for(const x of C.it)for(const q0 of x.pts){const q=s(q0.x,q0.y);g.beginPath();g.arc(q.x,q.y,14,0,2*Math.PI);g.stroke()}}
  /* lo elegido y la vista previa de enderezar/mover */
  const S=PAL.sel;if(S){g.lineWidth=5;g.strokeStyle='rgba(234,179,8,.9)';g.setLineDash([]);if(S.k==='ej'||S.k==='lin'){lt(S.p,false);g.stroke()}else if(S.p&&S.p.length>4){lt(S.p,true);g.stroke()}else if(S.k==='tx'){const q=s(S.x,S.y);g.beginPath();g.arc(q.x,q.y,10,0,2*Math.PI);g.stroke()}}
  if(PAL.prev){g.lineWidth=3;g.strokeStyle='#EA580C';g.setLineDash([]);lt(PAL.prev,false);g.stroke()}}
/* la verificación se rehace cuando cambia el plano (capas, contorno, confirmaciones, correcciones) */
function palSync(){if(PAL.on&&PLV&&PLV.id===PAL.id)palRender()}
