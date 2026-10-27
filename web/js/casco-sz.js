"use strict";
/* LPS 911 · Casco › Sectorización: frentes de trabajo y asistente de sectorización (F1 y F2, 27-10-2026, decidido con el dueño;
   docs/ia/casco.md y el documento de planificación «Casco · Frentes y asistente de sectorización»).
   - Frente de trabajo (cs_kfr): zona que avanza en paralelo con su propio tren y SUS PROPIAS cuadrillas. Contorno por grupo sobre la
     lámina del nivel de referencia (cE estructura · planta de encofrado; cA albañilería · planta de arquitectura), niveles que abarca,
     capacidad de vaciado (m³/día) y cuadrilla disponible por partida (cua).
   - Alternativa de sectorización (cs_ksec, la misma colección de antes): por frente y grupo. Modo «juntas» (líneas que parten el
     contorno; por defecto) o «libre» (rectángulos y polígonos). Se guarda sola al cambiar. Al aplicarla se crean los sectores del
     frente en cada nivel (csSecApply, casco.js).
   - Indicadores (csSzEval): balance de carga, eficiencia de balance, cuadrilla necesaria, concreto por vaciado, ciclo y fin del
     casco, cobertura y secuencia; y la recomendación del número de sectores.
   Parte de la app: comparte las variables globales de los demás archivos de js/. */

const KFR=new Map();let kfrSub=null;
function csKfrEnsure(){if(kfrSub||!db||!CS())return;kfrSub=fcol('kfr').onSnapshot(sn=>{KFR.clear();sn.docs.forEach(d=>{const v={...d.data(),id:d.id};if(!v.arch)KFR.set(d.id,v)});if(U.tab==='planos'||U.tab==='cfg')requestRender()},()=>{});unsubs.push(()=>{if(kfrSub)kfrSub();kfrSub=null;KFR.clear()})}
const csFrs=()=>[...KFR.values()].sort((a,b)=>(a.order??0)-(b.order??0)||String(a.code||'').localeCompare(String(b.code||'')));
const CS_FRCOL=['#1D9E75','#378ADD','#D85A30','#7F77DD','#BA7517','#D4537E'];
const csFrC=(f,g)=>f?(g==='A'?f.cA:f.cE)||null:null;
/** niveles que abarca el frente (en orden) */
function csFrLv(f){const L=pisos();if(!f)return[];const i0=Math.max(0,L.findIndex(p=>p.id===f.from)),i1=L.findIndex(p=>p.id===f.to);return L.slice(i0,(i1<0?L.length-1:i1)+1)}

/* ---------- escala: la calibración vigente del módulo Planos ---------- */
/** lámina base del nivel para el grupo (estructura: el plano EST; albañilería: el ARQ) */
function csLamOf(pid,grp){const API=window.__plano;if(!pid||!API||!API.basesOf)return null;const B=API.basesOf(pid);const d=grp==='A'?'ARQ':'EST';return B.find(b=>b.plb&&b.plb.disc===d)||B.find(b=>b.plb)||B[0]||null}
/** metros por píxel de una lámina: la calibración de Planos de esa revisión (se lee siempre del plano, no la copia al vincular);
    sin calibrar, la escala nominal 1/100 del formato (st 'nom', áreas aproximadas); sin plano del módulo Planos, nada */
function csScale(l){if(!l)return{mpp:null,st:'none'};const r=l.plb;
  if(r&&typeof PLB!=='undefined'){const p=PLB.get(r.id);if(p&&p.cal&&p.cal.mpp>0&&p.cal.rev===r.rev&&l.w>0&&typeof plSpecOf==='function'){const sp=plSpecOf(p,r.rev);if(sp&&sp.W>0)return{mpp:p.cal.mpp*sp.W/l.w,st:'cal',plb:r.id}}}
  if(r&&r.calMpp>0&&r.mpp>0)return{mpp:r.mpp,st:'cal',plb:r.id};
  if(r&&r.mpp>0)return{mpp:r.mpp,st:'nom',plb:r.id};
  return{mpp:null,st:'none',plb:r?r.id:''}}

/* ---------- geometría (coordenadas de la lámina, en píxeles) ---------- */
const csgCr=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
const csgFlat=P=>P.flatMap(p=>[Math.round(p.x*10)/10,Math.round(p.y*10)/10]);
function csgCen(P){let a=0,x=0,y=0;for(let i=0,j=P.length-1;i<P.length;j=i++){const f=P[j].x*P[i].y-P[i].x*P[j].y;a+=f;x+=(P[j].x+P[i].x)*f;y+=(P[j].y+P[i].y)*f}
  if(Math.abs(a)<1e-9){const n=P.length||1;return{x:P.reduce((s,p)=>s+p.x,0)/n,y:P.reduce((s,p)=>s+p.y,0)/n}}return{x:x/(3*a),y:y/(3*a)}}
function csgBB(P){const xs=P.map(p=>p.x),ys=P.map(p=>p.y);const x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y}}
function csgPip(P,q){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)c=!c}return c}
/** parte del polígono a un lado de la recta a→b (s=1 o -1); Sutherland–Hodgman */
function csgClip(P,a,b,s){const f=p=>((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))*s;const out=[];
  for(let i=0;i<P.length;i++){const c=P[i],n=P[(i+1)%P.length],fc=f(c),fn=f(n);if(fc>=0)out.push(c);if((fc>=0)!==(fn>=0)){const t=fc/(fc-fn);out.push({x:c.x+(n.x-c.x)*t,y:c.y+(n.y-c.y)*t})}}
  return out.length>=3?out:[]}
/** parámetro t (sobre a→b) donde la recta a→b corta el segmento c→d (u en [0,1]); null si no */
function csgSegT(a,b,c,d){const den=(b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x);if(Math.abs(den)<1e-9)return null;
  const t=((c.x-a.x)*(d.y-c.y)-(c.y-a.y)*(d.x-c.x))/den,u=((c.x-a.x)*(b.y-a.y)-(c.y-a.y)*(b.x-a.x))/den;return u>=-1e-9&&u<=1+1e-9?t:null}
function csgHits(P,a,b){const T=[];for(let i=0;i<P.length;i++){const t=csgSegT(a,b,P[i],P[(i+1)%P.length]);if(t!=null)T.push(t)}return T.sort((x,y)=>x-y)}
/** ¿el segmento a→b pasa por dentro del polígono? */
function csgCrosses(P,a,b){const T=csgHits(P,a,b);for(let i=0;i+1<T.length;i++){const lo=Math.max(T[i],0),hi=Math.min(T[i+1],1);if(hi-lo>1e-3){const m=(lo+hi)/2;if(csgPip(P,{x:a.x+(b.x-a.x)*m,y:a.y+(b.y-a.y)*m}))return true}}return false}
/** sectores = el contorno partido por las juntas, en el orden en que se trazaron */
function csgPieces(C,J){let L=[C];for(const j of J||[]){const a={x:j[0],y:j[1]},b={x:j[2],y:j[3]};const N=[];
  for(const P of L){if(csgCrosses(P,a,b)){const p1=csgClip(P,a,b,1),p2=csgClip(P,a,b,-1);if(p1.length)N.push(p1);if(p2.length)N.push(p2)}else N.push(P)}L=N}
  return L.filter(P=>csPolyA(P)>4)}
/** junta trazada con dos puntos: se endereza si está a menos de 5° de la horizontal o la vertical y se prolonga hasta el borde del
    contorno o hasta otra junta (lo primero que encuentre a cada lado del punto medio) */
function csgSnap(C,J,p1,p2,skip){let a={...p1},b={...p2};const dx=b.x-a.x,dy=b.y-a.y;if(Math.hypot(dx,dy)<2)return null;
  if(Math.abs(dx)<Math.abs(dy)*0.0875){const x=(a.x+b.x)/2;a.x=b.x=x}else if(Math.abs(dy)<Math.abs(dx)*0.0875){const y=(a.y+b.y)/2;a.y=b.y=y}
  const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(!csgPip(C,m))return null;
  const T=csgHits(C,a,b);(J||[]).forEach((j,i)=>{if(i===skip)return;const t=csgSegT(a,b,{x:j[0],y:j[1]},{x:j[2],y:j[3]});if(t!=null)T.push(t)});
  const lo=Math.max(...T.filter(t=>t<0.5-1e-6)),hi=Math.min(...T.filter(t=>t>0.5+1e-6));if(!isFinite(lo)||!isFinite(hi))return null;
  return csgFlat([{x:a.x+(b.x-a.x)*lo,y:a.y+(b.y-a.y)*lo},{x:a.x+(b.x-a.x)*hi,y:a.y+(b.y-a.y)*hi}])}
/** distancia de un punto a un segmento */
function csgDS(p,a,b){const l=(b.x-a.x)**2+(b.y-a.y)**2;let t=l?((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*(b.x-a.x),p.y-a.y-t*(b.y-a.y))}
/** ¿dos sectores se tocan? (comparten un tramo de borde, con tolerancia) */
function csgTouch(P,Q,tol){const near=(A,B)=>{let k=0;for(const p of A)for(let i=0;i<B.length;i++)if(csgDS(p,B[i],B[(i+1)%B.length])<=tol){k++;break}return k};return near(P,Q)+near(Q,P)>=2}
/** N sectores de igual área con juntas paralelas (dir 'v' = cortes verticales) */
function csgDivide(C,n,dir){const P=C,bb=csgBB(P),A=csPolyA(P);const J=[];const vert=dir==='v';
  for(let k=1;k<n;k++){const tgt=A*k/n;let lo=vert?bb.x:bb.y,hi=vert?bb.x+bb.w:bb.y+bb.h;
    for(let it=0;it<40;it++){const c=(lo+hi)/2;const part=vert?csgClip(P,{x:c,y:0},{x:c,y:1},1):csgClip(P,{x:0,y:c},{x:1,y:c},-1);const a=part.length?csPolyA(part):0;if(a<tgt)lo=c;else hi=c}
    const c=Math.round((lo+hi)/2*10)/10;J.push(vert?[c,bb.y-2,c,bb.y+bb.h+2]:[bb.x-2,c,bb.x+bb.w+2,c])}
  return J}

/* ---------- alternativa y sus indicadores ---------- */
/* Firestore no guarda listas dentro de listas: juntas y formas libres van como [{p:[…]}] y se leen con csSzNorm */
const csSzUnp=L=>(L||[]).map(e=>Array.isArray(e)?e:e&&e.p).filter(x=>Array.isArray(x)&&x.length>=4);
function csSzNorm(v){if(!v)return v;const o=clone(v);o.jun=csSzUnp(o.jun);o.shp=csSzUnp(o.shp);return o}
/** sectores de la alternativa: [{P (puntos), n (nombre)}], en el orden del tren */
function csSzSectors(v,f){const C=csFrC(f,v.grp);let L=[];
  if(v.mode==='f')L=csSzUnp(v.shp).map(g=>csUnflat(g)).filter(P=>P.length>=3);
  else if(C&&C.pts&&C.pts.length>=6){const J=csSzUnp(v.jun);L=csgPieces(csUnflat(C.pts),J);const vert=J.reduce((s,j)=>s+(Math.abs(j[2]-j[0])<=Math.abs(j[3]-j[1])?1:-1),0)>=0;
    const cs=new Map(L.map(P=>[P,csgCen(P)]));L.sort((p,q)=>{const a=cs.get(p),b=cs.get(q);return vert?(a.x-b.x)||(a.y-b.y):(a.y-b.y)||(a.x-b.x)});}
  if(v.rev)L.reverse();
  const pre=(f&&f.code)||(v.grp==='A'?'a':'S');const pf=v.grp==='A'?pre.toLowerCase():pre;
  return L.map((P,i)=>({P,n:pf+(i+1)}))}
function csSzLam(v,f){const C=csFrC(f,v.grp);const API=window.__plano;return C&&C.vista&&API&&API.LAM?API.LAM.get(C.vista)||null:null}
const CSZ_ST={good:'Bien',warn:'Revisar',bad:'Mal',na:'Sin datos'};
/** todos los indicadores de una alternativa (sección 3 del documento) */
function csSzEval(v,f){const sec=csSzSectors(v,f),n=sec.length,sc=csScale(csSzLam(v,f)),R=+v.ritmo||1;const k2=sc.mpp?sc.mpp*sc.mpp:0;
  const A=sec.map(s=>k2?Math.round(csPolyA(s.P)*k2*10)/10:null);
  const cats=csCats(v.grp).filter(c=>c.und);const met={};
  for(const c of cats)met[c.id]=sec.map((_,i)=>c.rat>0&&A[i]!=null?Math.round(A[i]*c.rat*10)/10:(+(((v.met||{})[c.id]||[])[i])||0));
  const rc=cats.filter(c=>c.rend>0);
  const carga=sec.map((_,i)=>rc.reduce((t,c)=>t+(met[c.id][i]||0)/c.rend,0));
  const tot=carga.reduce((a,b)=>a+b,0),avg=n?tot/n:0,mx=n?Math.max(...carga):0;
  const dev=carga.map(x=>avg?(x-avg)/avg:0),devMx=n?Math.max(...dev.map(Math.abs)):0;
  const eff=mx>0?tot/(n*mx):null;const cua=(f&&f.cua)||{};
  const crew=rc.map(c=>{const m=Math.max(0,...met[c.id]);const tm=met[c.id].reduce((a,b)=>a+b,0);const need=m>0?Math.ceil(m/(c.rend*R)-1e-9):0;const have=+cua[c.id]>0?+cua[c.id]:null;
    return{c,need,have,tm,idle:Math.max(0,need*R*n-tm/c.rend)}}).filter(x=>x.need>0);
  const idle=crew.reduce((t,x)=>t+x.idle,0);
  const vc=cats.filter(c=>c.vac&&/m3|m³/i.test(c.und||''));let cmx=0,cTot=0,cName='';for(const c of vc){const m=Math.max(0,...met[c.id]);if(m>cmx){cmx=m;cName=c.name;cTot=met[c.id].reduce((a,b)=>a+b,0)}}
  const cap=f&&+f.vac>0?+f.vac:null;
  /* ciclo y fin: el frente repite el ciclo en cada nivel; al final, lo que tarda el tren en salir del último sector */
  const LV=csFrLv(f),ciclo=n*R,tren=Math.max(0,...csCats(v.grp).map(c=>(+c.off||0)+(+c.dur||1)));const dur=n?LV.length*ciclo+tren:0;
  const fin=dur&&typeof wshift==='function'?wshift(csTomorrow(),dur-1):'';
  if(typeof ensureHitos==='function')ensureHitos();
  const hito=typeof HIT!=='undefined'?[...HIT.values()].filter(h=>h&&h.tipo==='fin'&&!h.arch&&h.d).sort((a,b)=>a.d.localeCompare(b.d))[0]||null:null;
  /* cobertura y secuencia */
  const C=csFrC(f,v.grp),CP=C&&C.pts&&C.pts.length>=6?csUnflat(C.pts):null;let cov=null,ovl=0;
  if(CP){if(v.mode!=='f')cov=n?1:0;else{const bb=csgBB(CP);let inn=0,one=0,two=0;for(let i=0;i<50;i++)for(let j=0;j<50;j++){const q={x:bb.x+bb.w*(i+.5)/50,y:bb.y+bb.h*(j+.5)/50};if(!csgPip(CP,q))continue;inn++;const k=sec.filter(s=>csgPip(s.P,q)).length;if(k===1)one++;else if(k>1)two++}cov=inn?(one+two)/inn:0;ovl=inn?two/inn:0}}
  const tol=CP?Math.max(csgBB(CP).w,csgBB(CP).h)*0.015:8;const jumps=[];for(let i=0;i+1<n;i++)if(!csgTouch(sec[i].P,sec[i+1].P,tol))jumps.push(sec[i].n+'→'+sec[i+1].n);
  /* recomendación: el mínimo de sectores que sostiene el ritmo con las cuadrillas del frente (y la capacidad de vaciado) */
  let nmin=0;const why=[];for(const x of crew)if(x.have){const k=Math.ceil(x.tm/(x.have*x.c.rend*R)-1e-9);if(k>nmin)nmin=k}
  if(cap&&cTot){const k=Math.ceil(cTot/cap-1e-9);if(k>nmin)nmin=k}
  const falt=crew.filter(x=>x.have!=null&&x.need>x.have).map(x=>({c:x.c,k:x.need-x.have}));
  /* semáforo */
  const st=(x,g,w)=>x==null?'na':x<=g?'good':x<=w?'warn':'bad';const I=[];
  I.push({id:'I1',t:'Balance de carga',s:n>1&&tot?st(devMx,.1,.2):'na',v:n>1&&tot?`±${Math.round(devMx*100)} %`:'—'});
  I.push({id:'I2',t:'Eficiencia de balance',s:eff==null||n<2?'na':eff>=.9?'good':eff>=.8?'warn':'bad',v:eff==null?'—':`${Math.round(eff*100)} %${n>1?` · ${Math.round((n*mx-tot)*10)/10} pers·día perdidos por desbalance en cada nivel`:''}`});
  const wd=falt.length?Math.max(...falt.map(x=>x.k)):0;const hasC=crew.some(x=>x.have!=null);
  I.push({id:'I3',t:'Cuadrilla necesaria',s:!crew.length||!hasC?'na':wd===0?'good':wd===1?'warn':'bad',v:!crew.length?'—':!hasC?'Pon las cuadrillas del frente':wd?`Faltan ${falt.reduce((a,b)=>a+b.k,0)} persona(s)`:'Alcanzan'});
  I.push({id:'I4',t:'Concreto por vaciado',s:!cmx||!cap?'na':cmx/cap<=.9?'good':cmx/cap<=1?'warn':'bad',v:!cmx?'—':`${Math.round(cmx*10)/10} m³${cap?` de ${cap} m³/día`:' · pon la capacidad del frente'}`});
  let s5='na',v5=fin?`Fin estimado ${typeof fmtD==='function'?fmtD(fin):fin}`:'—';if(fin&&hito){const late=hito.d>=fin?0:(typeof wdist==='function'?wdist(hito.d,fin):9);s5=late===0?'good':late<=5?'warn':'bad';v5+=` · hito ${typeof fmtD==='function'?fmtD(hito.d):hito.d}`}
  I.push({id:'I5',t:'Ciclo y fin del casco',s:s5,v:n?`Ciclo ${ciclo} día(s) por nivel · ${v5}`:'—'});
  const s6=cov==null||!n?'na':(cov>=.98&&ovl<=.02&&!jumps.length)?'good':(cov>=.95&&ovl<=.05)?'warn':'bad';
  I.push({id:'I6',t:'Cobertura y secuencia',s:s6,v:cov==null?'Sin contorno del frente':`${Math.round(cov*100)} % cubierto${ovl>.005?` · ${Math.round(ovl*100)} % traslapado`:''}${jumps.length?` · salto ${jumps[0]}`:''}`});
  return{sec,n,A,met,cats,carga,dev,devMx,eff,idle,crew,cmx,cName,cap,ciclo,dur,fin,hito,cov,ovl,jumps,nmin,falt,I,sc,R,LV}}
/** recomendación en palabras */
function csSzRec(E){if(!E.n)return'Traza el primer sector: con el contorno del frente, «Dividir en N» es lo más rápido.';
  if(!E.sc.mpp)return'Sin escala no hay áreas ni metrados: vincula la lámina desde el módulo Planos y calíbrala.';
  if(!E.nmin)return'Pon en Frentes las cuadrillas del frente (y su capacidad de vaciado) para recomendar el número de sectores.';
  const rt=E.R===1?'1 sector/día':`1 sector cada ${E.R} días`;let t=`${E.nmin} sector${E.nmin>1?'es':''} sostiene${E.nmin>1?'n':''} ${rt} con las cuadrillas de este frente.`;
  if(E.falt.length)t+=` Con ${E.n} te falta${E.falt.length>1||E.falt[0].k>1?'n':''} ${E.falt.map(x=>`${x.k} en ${x.c.name}`).join(', ')}.`;
  else if(E.n>E.nmin+1)t+=` Con ${E.n} te sobra margen: podrías usar menos sectores (menos juntas y vaciados).`;
  else t+=` Con ${E.n} alcanza.`;return t}

/* ---------- vista (pestaña Sectorización en Casco) ---------- */
const CSZ={vid:'',v:null,dirty:false,svT:0,tool:'',tmp:[],sel:null,side:true,hist:[],fr:'',fg:'E',ftool:''};
const csSzV=()=>U.csSzV==='fr'||U.csSzV==='lam'?U.csSzV:'sec';
function csSzNav(){const v=csSzV();return`<div class="csszn" id="csszn"><span class="seg" role="tablist" aria-label="Sectorización">${[['fr','Frentes'],['sec','Sectores'],['lam','Láminas']].map(([k,t])=>`<button type="button" role="tab" data-cszv="${k}" class="${v===k?'on':''}" aria-selected="${v===k}">${t}</button>`).join('')}</span></div>`}
function csSzFr(){const L=csFrs();if(!L.some(f=>f.id===CSZ.fr))CSZ.fr=(L[0]||{}).id||'';return KFR.get(CSZ.fr)||null}
/** alternativas del frente y grupo, la elegida y su copia de trabajo */
function csSzAlts(f,g){return[...KSEC.values()].filter(v=>v.fr===(f&&f.id)&&(v.grp||'E')===g).sort((a,b)=>(a.t0||a.t||0)-(b.t0||b.t||0))}
function csSzCur(f){const L=csSzAlts(f,CSZ.fg);
  if(CSZ.v&&CSZ.v.fr===f.id&&(CSZ.v.grp||'E')===CSZ.fg){if(!CSZ.dirty&&KSEC.has(CSZ.vid))CSZ.v=csSzNorm(KSEC.get(CSZ.vid));return CSZ.v}
  const v=L.find(x=>x.ap)||L[L.length-1]||null;CSZ.vid=v?v.id:'';CSZ.v=v?csSzNorm(v):null;CSZ.hist=[];CSZ.sel=null;CSZ.tool='';CSZ.dirty=false;return CSZ.v}
function csSzNew(f,from){const v=from?csSzNorm(from):{mode:'j',jun:[],shp:[],met:{},ritmo:1};delete v.id;delete v.ap;
  const n=csSzAlts(f,CSZ.fg).length+1;Object.assign(v,{n:'Alternativa '+n,fr:f.id,grp:CSZ.fg,t0:NOW(),by:me.email});CSZ.vid=uid('ks');CSZ.v=v;CSZ.dirty=true;CSZ.hist=[];CSZ.sel=null;csSzSave(true);return v}
/** guarda la alternativa (sola, 600 ms después del último cambio) */
function csSzSave(now){clearTimeout(CSZ.svT);const go=()=>{if(!CSZ.v||!CSZ.vid||!csEd())return;const d={...CSZ.v,t:NOW(),by:me.email,jun:(CSZ.v.jun||[]).map(p=>({p})),shp:(CSZ.v.shp||[]).map(p=>({p}))};delete d.id;
    const gen=CSZ.gen=(CSZ.gen||0)+1;fcol('ksec').doc(CSZ.vid).set(d).then(()=>{if(CSZ.gen===gen)CSZ.dirty=false;const el=document.getElementById('csszsv');if(el)el.textContent='Guardado ✓'}).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)))};
  const el=document.getElementById('csszsv');if(el)el.textContent='Guardando…';if(now)go();else CSZ.svT=setTimeout(go,600)}
function csSzEdit(fn){if(!CSZ.v||!csEd())return;CSZ.hist.push(JSON.stringify({jun:CSZ.v.jun,shp:CSZ.v.shp,mode:CSZ.v.mode,met:CSZ.v.met,rev:CSZ.v.rev}));if(CSZ.hist.length>50)CSZ.hist.shift();fn(CSZ.v);CSZ.dirty=true;csSzSave();csSzDraw()}
function csSzUndo(){const h=CSZ.hist.pop();if(!h||!CSZ.v)return false;Object.assign(CSZ.v,JSON.parse(h));CSZ.sel=null;CSZ.dirty=true;csSzSave();csSzDraw();return true}

function csSzRender(main){if(typeof ensureMcat==='function')ensureMcat();csKsecEnsure();csKfrEnsure();if(typeof ensurePlanos==='function')try{ensurePlanos()}catch(e){}
  const API=window.__plano&&window.__plano.ambMap?window.__plano:null;if(!API){loadPlanoMod().then(()=>{if(window.__plano.ensureLam)window.__plano.ensureLam();requestRender()}).catch(()=>{})}else if(API.ensureLam)API.ensureLam();
  const view=csSzV();let root=$('#cssz',main);
  if(!root||root.dataset.v!==view){main.onclick=null;main.onchange=null;main.oninput=null;
    main.innerHTML=`<div class="cssz" id="cssz" data-v="${view}">${csSzNav()}<div class="csszh" id="csszh"></div><div class="csszb${CSZ.side?'':' noside'}" id="csszb"><div class="csfmap"><div class="cssmap" id="csszmap"></div><div class="csfhint" id="csszhint" hidden></div><div class="csszsc" id="csszsc"></div></div><aside class="csfside" id="csszside"></aside></div><div class="csszf" id="csszf"></div></div>`;
    root=$('#cssz',main);root.addEventListener('click',csSzClick);root.addEventListener('change',csSzChange);}
  csSzDraw()}
function csSzDraw(){const root=document.getElementById('cssz');if(!root)return;if(root.dataset.v==='fr')csFrDraw();else csSecDraw()}
const csSet=(id,h)=>{const el=document.getElementById(id);if(el&&el.dataset.h!==h){el.innerHTML=h;el.dataset.h=h}return el};
function csScaleBadge(l){const s=csScale(l);if(!l)return'';
  return s.st==='cal'?`<span class="csszok">Escala calibrada en Planos ✓</span>`:s.st==='nom'?`<span class="csszwarn">Escala nominal 1/100: áreas aproximadas</span>${s.plb?` <button type="button" class="ib" data-csz="cal" data-plb="${esc(s.plb)}">Calibrar en Planos</button>`:''}`:`<span class="csszwarn">Lámina sin escala: vincúlala desde el módulo Planos</span>`}

/* ---- vista Frentes ---- */
function csFrDraw(){const f=csSzFr(),g=CSZ.fg,ed=csEd(),dis=ed?'':' disabled',L=pisos();const C=csFrC(f,g);const ref=(C&&C.ref)||(f&&(csFrLv(f).find(p=>csLamOf(p.id,g))||{}).id)||'';const lam=C&&C.vista?(window.__plano&&window.__plano.LAM.get(C.vista))||csLamOf(ref,g):csLamOf(ref,g);
  csSet('csszh',`<div class="csszr">${csFrs().map(x=>`<button type="button" class="ib${x.id===CSZ.fr?' on':''}" data-cszf="${esc(x.id)}"><i class="csdot" style="--c:${esc(x.color||'#888')}"></i>${esc(x.name)}</button>`).join('')}${ed?'<button type="button" class="ib" data-csz="frnew">+ Frente</button>':''}
      <span class="seg" role="group" aria-label="Grupo">${['E','A'].map(k=>`<button type="button" data-cszg="${k}" class="${g===k?'on':''}">${k==='E'?'Estructura':'Albañilería'}</button>`).join('')}</span>
      ${f?`<label class="cssml">Nivel de referencia<select data-csz="fref"${dis}>${csFrLv(f).map(p=>`<option value="${p.id}"${p.id===ref?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`:''}</div>
    ${f&&ed?`<div class="csszr"><span class="mu">Contorno de ${esc(f.name)} (${g==='A'?'planta de arquitectura':'planta de encofrado'}):</span><span class="seg"><button type="button" data-cszt="rect" class="${CSZ.ftool==='rect'?'on':''}">▭ Rectángulo</button><button type="button" data-cszt="poly" class="${CSZ.ftool==='poly'?'on':''}">⬠ Polígono</button></span>${C&&C.pts?'<button type="button" class="ib" data-csz="frdelc">Borrar el contorno</button>':''}</div>`:''}`);
  csSet('csszsc',csScaleBadge(lam));
  /* panel: datos del frente y sus cuadrillas */
  let h='';if(!f)h=`<div class="csfsec"><p><b>Primero, los frentes de trabajo.</b> Un frente es una zona que avanza en paralelo con su propio tren y sus propias cuadrillas (una torre, un bloque separado por junta). Si la obra avanza como un solo bloque, crea un único frente.</p>${ed?'<button type="button" class="ib pri" data-csz="frnew">Crear Frente A (todo el edificio)</button>':''}</div>`;
  else{const sc=csScale(lam);const ar=C&&C.pts&&sc.mpp?Math.round(csPolyA(csUnflat(C.pts))*sc.mpp*sc.mpp):null;const cats=csCats(g).filter(c=>c.rend>0);const cua=f.cua||{};
    h=`<div class="csfsec"><div class="csfsh"><b>${esc(f.name)}</b><span class="mu">${ar!=null?ar+' m² de contorno':C&&C.pts?'contorno sin escala':'sin contorno'}</span></div>
      <div class="csgf"><label>Nombre<input data-csfr="name" value="${esc(f.name||'')}"${dis}></label><label>Letra de sus sectores<input data-csfr="code" value="${esc(f.code||'')}" maxlength="3"${dis}></label>
      <label>Desde<select data-csfr="from"${dis}>${L.map(p=>`<option value="${p.id}"${p.id===f.from?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Hasta<select data-csfr="to"${dis}>${L.map(p=>`<option value="${p.id}"${p.id===f.to?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label>Capacidad de vaciado (m³/día)<input type="number" min="0" step="any" data-csfr="vac" value="${f.vac??''}" placeholder="Ej.: 60"${dis}></label><label>Color<input type="color" data-csfr="color" value="${esc(f.color||'#1D9E75')}"${dis}></label></div></div>
      <div class="csfsec"><div class="csfsh"><b>Cuadrillas de este frente</b><span class="mu">${esc(CSG[g])} · personas por partida</span></div>
      ${cats.length?`<table class="t csfst"><thead><tr><th>Partida</th><th>Ejecutor</th><th title="Rendimiento por persona y día (catálogo)">Rend.</th><th title="Personas que este frente tiene para la partida">Personas</th></tr></thead><tbody>${cats.map(c=>`<tr><td>${esc(c.name)}</td><td class="mu">${esc((S.con.get(c.sc)||{}).name||'—')}</td><td class="mono mu">${c.rend} ${esc(c.und||'')}</td><td><input class="ci csn" type="number" min="0" step="1" data-csfc="${esc(c.id)}" value="${cua[c.id]??''}" aria-label="Personas de ${esc(c.name)}"${dis}></td></tr>`).join('')}</tbody></table>`:'<p class="mu">El catálogo no tiene partidas con rendimiento en este grupo (Configuración › Casco).</p>'}
      <p class="note">Cada frente tiene sus propias cuadrillas. Con ellas el asistente dice cuántos sectores sostienen el ritmo.</p></div>
      ${ed?`<div class="csfsec"><button type="button" class="ib" data-csz="frdel">Eliminar el frente</button></div>`:''}`}
  csSet('csszside',h);csSet('csszf',f?`<span class="note">Siguiente paso: <button type="button" class="lnkb" data-cszv="sec">sectorizar ${esc(f.name)}</button></span>`:'');
  /* plano */
  const host=document.getElementById('csszmap'),hint=document.getElementById('csszhint');const API=window.__plano;
  if(!API||!API.ambMap){host.innerHTML='<div class="kemp">Cargando el plano…</div>';return}
  if(!ref){host.innerHTML='<div class="kemp">Este frente no tiene niveles con lámina. Vincúlalas en Configuración › Casco › Niveles.</div>';host._v=null;host._fk='';hint.hidden=true;return}
  const shapes=csFrs().map(x=>{const c=csFrC(x,g);return c&&c.ref===ref&&c.pts?{id:'f:'+x.id,kind:'s',pts:c.pts,c:x.color||'#888',label:x.name,sel:x.id===CSZ.fr}:null}).filter(Boolean);
  const o={pid:ref,vista:lam?lam.id:'',shapes,canUp:false,draw:ed&&f&&CSZ.ftool?CSZ.ftool:null,tmp:CSZ.ftool==='poly'?CSZ.tmp:null,
    edit:ed&&f&&!CSZ.ftool&&C&&C.pts&&C.ref===ref?{pts:C.pts}:null,onEdit:pts=>csFrSet({['c'+g]:{...C,pts}}),
    onDrawn:pts=>{CSZ.ftool='';csFrSet({['c'+g]:{ref,vista:lam?lam.id:'',pts}})},onPoly:pt=>{CSZ.tmp=[...CSZ.tmp,pt];csFrDraw()},
    onPolyClose:()=>{const P=CSZ.tmp;CSZ.tmp=[];CSZ.ftool='';if(P.length>=3)csFrSet({['c'+g]:{ref,vista:lam?lam.id:'',pts:csgFlat(P)}});else csFrDraw()},
    onPick:hit=>{if(hit&&hit.startsWith('f:')){CSZ.fr=hit.slice(2);csFrDraw()}}};
  API.ambMap(host,o);if(lam&&host._img!==lam.id){host._img=lam.id;API.imgURL(lam,'f').then(()=>{if(document.getElementById('csszmap')===host)csFrDraw()}).catch(()=>{})}
  const t=!f?'':CSZ.ftool==='rect'?'Arrastra un rectángulo que cubra el frente.':CSZ.ftool==='poly'?(CSZ.tmp.length?`${CSZ.tmp.length} esquina(s). Cierra tocando la primera, doble clic o Enter.`:'Toca cada esquina del contorno del frente.'):!(C&&C.pts)?'Dibuja el contorno del frente: ▭ Rectángulo o ⬠ Polígono.':ed?'Arrastra las esquinas para ajustar el contorno.':'';
  hint.innerHTML=t;hint.hidden=!t}
function csFrSet(o){const f=csSzFr();if(!f||!csEd())return;const nf={...f,...o};KFR.set(f.id,nf);const d={...o};fcol('kfr').doc(f.id).set(d,{merge:true}).catch(e=>toast('No se pudo guardar: '+(e&&e.code||e)));csSzDraw()}
async function csFrNew(){if(!csEd())return;const L=csFrs(),P=pisos();const used=new Set(L.map(f=>String(f.code||'').toUpperCase()));let c='A';for(const ch of'ABCDEFGHIJ')if(!used.has(ch)){c=ch;break}
  const id=uid('fr');const d={name:'Frente '+c,code:c,color:CS_FRCOL[L.length%CS_FRCOL.length],from:(P[0]||{}).id||'',to:(P[P.length-1]||{}).id||'',order:L.length,cua:{},by:me.email,t:NOW()};
  try{await fcol('kfr').doc(id).set(d)}catch(e){toast('No se pudo crear: '+(e&&e.code||e));return}KFR.set(id,{...d,id});CSZ.fr=id;CSZ.ftool='rect';csSzDraw();toast(`${d.name} creado: dibuja su contorno sobre la planta`)}

/* ---- vista Sectores (asistente) ---- */
function csSecDraw(){const f=csSzFr(),g=CSZ.fg,ed=csEd();const v=f?csSzCur(f):null;const C=csFrC(f,g);const lam=v?csSzLam(v,f):null;
  const alts=f?csSzAlts(f,g):[];
  csSet('csszh',!f?'':`<div class="csszr">${csFrs().map(x=>`<button type="button" class="ib${x.id===CSZ.fr?' on':''}" data-cszf="${esc(x.id)}"><i class="csdot" style="--c:${esc(x.color||'#888')}"></i>${esc(x.name)}</button>`).join('')}
      <span class="seg" role="group" aria-label="Grupo">${['E','A'].map(k=>`<button type="button" data-cszg="${k}" class="${g===k?'on':''}">${k==='E'?'Estructura':'Albañilería'}</button>`).join('')}</span>
      <label class="cssml">Alternativa<select data-csz="alt">${alts.map(a=>`<option value="${esc(a.id)}"${a.id===CSZ.vid?' selected':''}>${esc(a.n||'Alternativa')}${a.ap?' · vigente':''}</option>`).join('')}${CSZ.v&&!KSEC.has(CSZ.vid)?`<option value="${esc(CSZ.vid)}" selected>${esc(CSZ.v.n)}</option>`:''}</select></label>
      ${ed?`<button type="button" class="ib" data-csz="altnew">+ Nueva</button>${v?'<button type="button" class="ib" data-csz="altdup">Duplicar</button>':''}`:''}${v&&ed?`<input class="tin csfn" data-csz="altn" value="${esc(v.n||'')}" aria-label="Nombre de la alternativa">`:''}<span class="mu" id="csszsv"></span></div>
    ${v&&ed?`<div class="csszr"><span class="seg" role="group" aria-label="Herramienta"><button type="button" data-cszt="" class="${!CSZ.tool?'on':''}" title="Elegir una junta o un sector">✋ Elegir</button><button type="button" data-cszt="jun" class="${CSZ.tool==='jun'?'on':''}" title="Toca dos puntos: la junta se prolonga sola hasta el borde o hasta otra junta">╱ Junta</button><button type="button" data-cszt="rect" class="${CSZ.tool==='rect'?'on':''}">▭ Rectángulo</button><button type="button" data-cszt="poly" class="${CSZ.tool==='poly'?'on':''}">⬠ Polígono</button></span>
      <button type="button" class="ib" data-csz="div" title="N sectores de igual área con juntas paralelas">÷ Dividir en N</button><button type="button" class="ib" data-csz="eq" title="Mueve las juntas paralelas hasta igualar la carga">⚖ Equilibrar</button><button type="button" class="ib" data-csz="rev" title="Invierte el orden del tren">⇄ Invertir orden</button>
      <button type="button" class="ib" data-csz="del"${CSZ.sel?'':' disabled'} title="Borra la junta o el sector elegido (Supr)">Borrar</button><button type="button" class="ib" data-csz="undo"${CSZ.hist.length?'':' disabled'} title="Ctrl+Z">↶ Deshacer</button>
      <label class="cssml">Ritmo<select data-csz="ritmo"><option value="1"${(+v.ritmo||1)===1?' selected':''}>1 sector/día</option><option value="2"${+v.ritmo===2?' selected':''}>1 sector cada 2 días</option></select></label>
      <span style="flex:1"></span><button type="button" class="ib${CSZ.side?' on':''}" data-csz="side" aria-pressed="${CSZ.side}">▤ Datos</button></div>`:''}`);
  csSet('csszsc',v?csScaleBadge(lam):'');
  const host=document.getElementById('csszmap'),hint=document.getElementById('csszhint');const API=window.__plano;
  if(!f){csSet('csszside','');csSet('csszf','');host.innerHTML=`<div class="kemp">Primero define los frentes de trabajo. <button type="button" class="ib pri" data-cszv="fr">Ir a Frentes</button></div>`;host._v=null;host._fk='';hint.hidden=true;return}
  if(!v){csSet('csszside','');csSet('csszf','');host.innerHTML=`<div class="kemp">${C&&C.pts?`${esc(f.name)} todavía no tiene alternativas de sectorización.`:`Dibuja primero el contorno de ${esc(f.name)} en Frentes.`} ${ed?(C&&C.pts?'<button type="button" class="ib pri" data-csz="altnew">Crear la primera alternativa</button>':'<button type="button" class="ib pri" data-cszv="fr">Ir a Frentes</button>'):''}</div>`;host._v=null;host._fk='';hint.hidden=true;return}
  const E=csSzEval(v,f);
  /* panel de datos */
  const dot=s=>`<i class="csszd ${s}" title="${CSZ_ST[s]}"></i>`;const pc=x=>(x>=0?'+':'')+Math.round(x*100)+' %';
  const m3=i=>{const c=E.cats.find(c=>c.vac&&/m3|m³/i.test(c.und||'')&&E.met[c.id].some(x=>x>0));return c?Math.round(E.met[c.id][i]*10)/10:'—'};
  const selI=CSZ.sel&&CSZ.sel.k==='s'?CSZ.sel.i:-1;
  const side=`<div class="csfsec"><div class="csfsh"><b>Semáforo</b><span class="mu">${E.n} sector(es) · ${E.R===1?'1 sector/día':'1 cada 2 días'}</span></div><ul class="csszi">${E.I.map(x=>`<li>${dot(x.s)}<span><b>${x.id} ${esc(x.t)}</b><small>${esc(x.v)}</small></span></li>`).join('')}</ul></div>
    <div class="csfsec"><div class="csfsh"><b>Recomendación</b></div><p class="csszrec">${esc(csSzRec(E))}</p></div>
    <div class="csfsec"><div class="csfsh"><b>Sectores</b><span class="mu">${E.A.some(a=>a!=null)?Math.round(E.A.reduce((s,a)=>s+(a||0),0))+' m²':''}</span></div>
      ${E.n?`<table class="t csfst"><thead><tr><th></th><th>Sector</th><th>m²</th><th title="Σ metrado ÷ rendimiento">pers·día</th><th>±</th><th>m³</th></tr></thead><tbody>${E.sec.map((s,i)=>`<tr class="${i===selI?'on':''}" data-cszs="${i}"><td><i class="csdot" style="--c:${CS_SCOL[i%CS_SCOL.length]}"></i></td><td><b>${esc(s.n)}</b></td><td class="mono">${E.A[i]??'—'}</td><td class="mono">${Math.round(E.carga[i]*10)/10}</td><td>${E.n>1?`<span class="csbal ${csBalCls(E.dev[i])}">${pc(E.dev[i])}</span>`:''}</td><td class="mono">${m3(i)}</td></tr>`).join('')}</tbody></table>`:'<p class="mu csfemp">Sin sectores todavía.</p>'}</div>
    ${E.n?`<details class="csfsec" data-cszo="met"${CSZ.om?' open':''}><summary><b>Por partida</b><span class="mu">metrado por sector y cuadrilla</span></summary><div class="tscroll"><table class="t csmet"><thead><tr><th>Partida</th><th title="Metrado por m² (catálogo)">Ratio</th>${E.sec.map(s=>`<th>${esc(s.n)}</th>`).join('')}<th title="Personas necesarias para el ritmo / del frente">Cuadrilla</th></tr></thead><tbody>
      ${E.cats.map(c=>{const cr=E.crew.find(x=>x.c.id===c.id);return`<tr><td>${esc(c.name)} <span class="mu">${esc(c.und)}</span></td><td class="mono mu">${c.rat>0?c.rat:'—'}</td>${E.sec.map((_,i)=>c.rat>0&&E.A[i]!=null?`<td class="mono mu">${E.met[c.id][i]}</td>`:`<td><input class="ci csn" type="number" min="0" step="any" data-cszm="${esc(c.id)}:${i}" value="${(((v.met||{})[c.id]||[])[i])??''}"${ed?'':' disabled'} aria-label="${esc(c.name)} en ${esc(E.sec[i].n)}"></td>`).join('')}<td class="mono${cr&&cr.have!=null&&cr.need>cr.have?' csszbad':''}">${cr?`${cr.need}${cr.have!=null?' / '+cr.have:''}`:'—'}</td></tr>`}).join('')}
      </tbody></table></div><p class="note">En gris: área × ratio. Las partidas sin ratio se escriben. Cuadrilla: necesaria para el ritmo / la del frente.</p></details>`:''}`;
  csSet('csszside',side);
  csSet('csszf',`<button type="button" class="ib" data-csz="cmp"${alts.length>1?'':' disabled'} title="Compara las alternativas de este frente">Comparar alternativas</button><span style="flex:1"></span>${v.ap?'<span class="mu">Alternativa vigente (aplicada a los niveles)</span>':''}${ed?`<button type="button" class="ib pri" data-csz="apply"${E.n?'':' disabled'}>Aplicar a niveles…</button>`:''}`);
  document.getElementById('csszb').classList.toggle('noside',!CSZ.side);
  /* plano */
  if(!API||!API.ambMap){host.innerHTML='<div class="kemp">Cargando el plano…</div>';return}
  if(!C||!C.ref){host.innerHTML=`<div class="kemp">Dibuja el contorno de ${esc(f.name)} en Frentes.</div>`;host._v=null;host._fk='';return}
  const shapes=[{id:'cont',kind:'s',pts:C.pts||[],c:f.color||'#555',label:f.name,sel:false},...E.sec.map((s,i)=>({id:'s'+i,kind:'a',pts:csgFlat(s.P),c:CS_SCOL[i%CS_SCOL.length],label:s.n+(E.A[i]!=null?` · ${Math.round(E.A[i])} m²`:''),sel:i===selI,op:.28,sop:.45}))];
  const lines=v.mode==='f'?[]:(v.jun||[]).map((j,i)=>({id:'j'+i,pts:j,c:'#111',sel:CSZ.sel&&CSZ.sel.k==='j'&&CSZ.sel.i===i}));
  const J=v.jun||[],CP=C.pts?csUnflat(C.pts):null;const tl=CSZ.tool;
  const editPts=!ed||tl?null:CSZ.sel&&CSZ.sel.k==='j'&&J[CSZ.sel.i]?{pts:J[CSZ.sel.i],noMid:true}:CSZ.sel&&CSZ.sel.k==='s'&&v.mode==='f'&&(v.shp||[])[CSZ.sel.i]?{pts:v.shp[CSZ.sel.i]}:null;
  const o={pid:C.ref,vista:C.vista,shapes,lines,canUp:false,draw:ed&&(tl==='rect'||tl==='poly'||tl==='jun')?(tl==='jun'?'poly':tl):null,tmp:tl==='poly'||tl==='jun'?CSZ.tmp:null,edit:editPts,
    onEdit:pts=>{if(CSZ.sel.k==='j'){const P=csUnflat(pts);const j=csgSnap(CP,J,P[0],P[1],CSZ.sel.i);if(!j){toast('La junta tiene que cruzar el frente.');csSecDraw();return}const i=CSZ.sel.i;csSzEdit(x=>{x.jun=x.jun.slice();x.jun[i]=j})}else{const i=CSZ.sel.i;csSzEdit(x=>{x.shp=x.shp.slice();x.shp[i]=pts})}},
    onDrawn:pts=>csSzFree(pts),
    onPoly:pt=>{CSZ.tmp=[...CSZ.tmp,pt];if(tl==='jun'&&CSZ.tmp.length===2){const[a,b]=CSZ.tmp;CSZ.tmp=[];if(!CP){toast('Dibuja primero el contorno del frente.');csSecDraw();return}const j=csgSnap(CP,J,a,b);if(!j){toast('Traza la junta dentro del frente.');csSecDraw();return}
      if(v.mode==='f'&&(v.shp||[]).length){toast('Esta alternativa tiene sectores libres: crea otra alternativa para usar juntas.');csSecDraw();return}csSzEdit(x=>{x.mode='j';x.jun=[...(x.jun||[]),j]});return}csSecDraw()},
    onPolyClose:()=>{const P=CSZ.tmp;CSZ.tmp=[];if(tl==='poly'&&P.length>=3)csSzFree(csgFlat(P));else csSecDraw()},
    onPick:(hit,w)=>{const z=host._v&&host._v.z||1;let best=-1,bd=14/z;J.forEach((j,i)=>{if(v.mode==='f')return;const d=csgDS(w,{x:j[0],y:j[1]},{x:j[2],y:j[3]});if(d<bd){bd=d;best=i}});
      if(best>=0)CSZ.sel={k:'j',i:best};else if(hit&&/^s\d+$/.test(hit))CSZ.sel={k:'s',i:+hit.slice(1)};else CSZ.sel=null;csSecDraw()}};
  API.ambMap(host,o);const bl=lam;if(bl&&host._img!==bl.id){host._img=bl.id;API.imgURL(bl,'f').then(()=>{if(document.getElementById('csszmap')===host)csSecDraw()}).catch(()=>{})}
  let t='';if(tl==='jun')t=CSZ.tmp.length?'Toca el segundo punto de la junta.':'Toca dos puntos de la junta: se prolonga sola hasta el borde o hasta otra junta. Esc para terminar.';
  else if(tl==='rect')t='Arrastra un rectángulo: cada uno es un sector.';else if(tl==='poly')t=CSZ.tmp.length?`${CSZ.tmp.length} esquina(s). Cierra tocando la primera, doble clic o Enter.`:'Toca cada esquina del sector.';
  else if(CSZ.sel&&CSZ.sel.k==='j')t='Arrastra un extremo de la junta para moverla; Supr la borra (los sectores vecinos se unen).';
  else if(CSZ.sel&&CSZ.sel.k==='s')t=v.mode==='f'?'Arrastra las esquinas para ajustar el sector; Supr lo borra.':'Para cambiar este sector mueve o borra una de sus juntas.';
  else if(ed&&!E.n)t='Empieza con «÷ Dividir en N» o traza juntas con «╱ Junta».';
  hint.innerHTML=esc(t);hint.hidden=!t}
function csSzFree(pts){const v=CSZ.v;if(!v)return;if(v.mode!=='f'&&(v.jun||[]).length){toast('Esta alternativa usa juntas: crea otra alternativa para dibujar sectores libres.');csSecDraw();return}
  if((v.shp||[]).length>=8){toast('Máximo 8 sectores por alternativa.');csSecDraw();return}csSzEdit(x=>{x.mode='f';x.shp=[...(x.shp||[]),pts]});CSZ.sel={k:'s',i:(v.shp||[]).length-1}}
function csSzDivPop(btn){const f=csSzFr(),C=csFrC(f,CSZ.fg);if(!C||!C.pts){toast('Dibuja primero el contorno del frente en Frentes.');return}
  const row=(d,t)=>`<div class="ph">${t}</div><div class="pmr csszdv">${[2,3,4,5,6,8].map(n=>`<button data-do="d" data-n="${n}" data-dir="${d}">${n}</button>`).join('')}</div>`;
  openPop(btn,row('v','Cortes verticales (sectores de izquierda a derecha)')+row('h','Cortes horizontales (de arriba hacia abajo)'),{d:ds=>{const P=csUnflat(C.pts);const J=csgDivide(P,+ds.n,ds.dir);CSZ.sel=null;CSZ.tool='';csSzEdit(x=>{x.mode='j';x.jun=J;x.shp=[];x.rev=false})}})}
function csSzEqualize(){const f=csSzFr(),v=CSZ.v,C=csFrC(f,CSZ.fg);if(!v||!C||!C.pts)return;const J=v.jun||[];if(v.mode==='f'||!J.length){toast('Equilibrar mueve juntas paralelas: usa «Dividir en N» o traza juntas.');return}
  const ver=J.every(j=>Math.abs(j[2]-j[0])<1),hor=J.every(j=>Math.abs(j[3]-j[1])<1);if(!ver&&!hor){toast('Equilibrar funciona cuando todas las juntas son paralelas (verticales u horizontales).');return}
  const n=csSzSectors(v,f).length;const NJ=csgDivide(csUnflat(C.pts),n,ver?'v':'h');csSzEdit(x=>{x.jun=NJ});toast('Juntas equilibradas: con metrados por ratio, la carga es proporcional al área')}
async function csSzCompare(){const f=csSzFr();const L=csSzAlts(f,CSZ.fg);if(L.length<2)return;const R=L.map(v0=>{const v=v0.id===CSZ.vid&&CSZ.v?CSZ.v:csSzNorm(v0);return{v,E:csSzEval(v,f)}});
  const dot=s=>`<i class="csszd ${s}"></i>`;
  const html=`<div class="tscroll"><table class="t csszcmp"><thead><tr><th></th>${R.map(r=>`<th>${esc(r.v.n||'')}${r.v.ap?' <span class="mu">vigente</span>':''}</th>`).join('')}</tr></thead><tbody>
    <tr><td>Sectores</td>${R.map(r=>`<td class="mono">${r.E.n}</td>`).join('')}</tr>
    ${R[0].E.I.map((x,k)=>`<tr><td>${x.id} ${esc(x.t)}</td>${R.map(r=>`<td>${dot(r.E.I[k].s)} ${esc(r.E.I[k].v)}</td>`).join('')}</tr>`).join('')}
    <tr><td>Recomendación</td>${R.map(r=>`<td>${r.E.nmin?r.E.nmin+' sectores':'—'}</td>`).join('')}</tr></tbody></table></div>`;
  await uiAsk({title:`Alternativas de ${f.name}`,html,ok:'Cerrar',cancel:false})}
async function csSzApply(){const f=csSzFr(),v=CSZ.v;if(!f||!v||!csEd())return;const E=csSzEval(v,f);if(!E.n)return;const LV=csFrLv(f);if(!LV.length){toast('El frente no tiene niveles: revísalo en Frentes.');return}
  const bad=E.I.filter(x=>x.s==='bad');
  const ok=await uiAsk({title:`Aplicar «${v.n}» a ${LV.length} nivel(es) de ${f.name}`,tone:bad.length?'warn':'info',
    text:`De ${LV[0].name} a ${LV[LV.length-1].name}: ${E.n} sector(es) de ${CSG[v.grp].toLowerCase()} (${E.sec.map(s=>s.n).join(', ')}).${bad.length?`\nOjo: en rojo ${bad.map(x=>x.t.toLowerCase()).join(', ')}.`:''}`,
    list:['Juntas en el tercio central de la luz, lejos de columnas y placas','Coordinadas con el proyectista estructural','Acceso para la bomba y la descarga de material en cada sector'],
    note:'Lo ya programado y lo congelado no cambian. Con Deshacer.',ok:'Aplicar',cancel:'Volver'});if(!ok)return;
  const C=csFrC(f,v.grp);const met={};for(const c of E.cats)met[c.id]=E.met[c.id];const geo={};E.sec.forEach((s,i)=>{geo[i]=csgFlat(s.P)});
  if(CSZ.dirty)csSzSave(true);
  await csSecApply({id:CSZ.vid,n:v.n,grp:v.grp,from:LV[0].id,to:LV[LV.length-1].id,k:E.n,names:E.sec.map(s=>s.n),met,geo,vista:C.vista,fr:f.id,frc:f.code||'',frn:f.name});
  /* vigente: esta alternativa (las otras del frente y grupo dejan de serlo) */
  const b=db.batch();for(const a of csSzAlts(f,v.grp))if(a.ap&&a.id!==CSZ.vid)b.set(fcol('ksec').doc(a.id),{ap:null},{merge:true});b.set(fcol('ksec').doc(CSZ.vid),{ap:{t:NOW(),by:me.email}},{merge:true});b.commit().catch(()=>{});
  if(CSZ.v)CSZ.v.ap={t:NOW(),by:me.email}}

/* ---- eventos ---- */
function csSzClick(e){const t=e.target;const nv=t.closest('[data-cszv]');if(nv){U.csSzV=nv.dataset.cszv;saveUI();CSZ.tmp=[];render();return}
  const fb=t.closest('[data-cszf]');if(fb){CSZ.fr=fb.dataset.cszf;CSZ.tmp=[];CSZ.ftool='';CSZ.v=null;CSZ.vid='';csSzDraw();return}
  const gb=t.closest('[data-cszg]');if(gb){CSZ.fg=gb.dataset.cszg;CSZ.tmp=[];CSZ.v=null;CSZ.vid='';csSzDraw();return}
  const tb=t.closest('[data-cszt]');if(tb){const root=document.getElementById('cssz');const k=tb.dataset.cszt;if(root.dataset.v==='fr')CSZ.ftool=CSZ.ftool===k?'':k;else{CSZ.tool=CSZ.tool===k?'':k;CSZ.sel=null}CSZ.tmp=[];csSzDraw();return}
  const sr=t.closest('[data-cszs]');if(sr&&!t.closest('input,button')){CSZ.sel={k:'s',i:+sr.dataset.cszs};CSZ.tool='';csSecDraw();return}
  const b=t.closest('[data-csz]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return;const k=b.dataset.csz;
  if(k==='frnew')csFrNew();
  else if(k==='frdelc'){const g=CSZ.fg;csFrSet({['c'+g]:null})}
  else if(k==='frdel'){(async()=>{const f=csSzFr();if(!f)return;if(!await uiAsk({title:`¿Eliminar ${f.name}?`,text:'Se archiva. Sus alternativas de sectorización quedan guardadas; los sectores ya aplicados a los niveles no cambian.',ok:'Eliminar',tone:'warn'}))return;
    fcol('kfr').doc(f.id).set({arch:{t:NOW(),by:me.email,n:me.name||me.email}},{merge:true}).then(()=>{KFR.delete(f.id);CSZ.fr='';csSzDraw()}).catch(er=>toast('No se pudo: '+(er&&er.code||er)))})()}
  else if(k==='cal'){if(typeof plOpen==='function'&&typeof PLB!=='undefined'&&PLB.has(b.dataset.plb)){plOpen(b.dataset.plb);toast('Usa «Medir» › Calibrar con una medida conocida')}else toast('Abre el módulo Planos para calibrar esta lámina.')}
  else if(k==='altnew'){const f=csSzFr();if(f)csSzNew(f);csSzDraw()}
  else if(k==='altdup'){const f=csSzFr();if(f&&CSZ.v)csSzNew(f,CSZ.v);csSzDraw()}
  else if(k==='div')csSzDivPop(b);
  else if(k==='eq')csSzEqualize();
  else if(k==='rev')csSzEdit(x=>{x.rev=!x.rev});
  else if(k==='del')csSzDel();
  else if(k==='undo')csSzUndo();
  else if(k==='side'){CSZ.side=!CSZ.side;csSecDraw();setTimeout(()=>{const h=document.getElementById('csszmap');if(h&&h._v&&h._v.fit)h._v.fit()},60)}
  else if(k==='cmp')csSzCompare();
  else if(k==='apply')csSzApply()}
function csSzDel(){const s=CSZ.sel,v=CSZ.v;if(!s||!v)return;if(s.k==='j'){const i=s.i;CSZ.sel=null;csSzEdit(x=>{x.jun=x.jun.filter((_,k)=>k!==i)})}
  else if(v.mode==='f'){const i=s.i;CSZ.sel=null;csSzEdit(x=>{x.shp=x.shp.filter((_,k)=>k!==i)})}else toast('Para quitar este sector borra una de sus juntas.')}
function csSzChange(e){const t=e.target;const ed=csEd();
  if(t.dataset.csfr){const k=t.dataset.csfr;let v=t.value;if(k==='vac')v=v===''?null:+v;if(k==='code')v=String(v).trim().toUpperCase().slice(0,3)||'A';if(k==='name')v=String(v).trim()||'Frente';csFrSet({[k]:v});return}
  if(t.dataset.csfc){const f=csSzFr();if(!f)return;const cua={...(f.cua||{})};if(t.value==='')delete cua[t.dataset.csfc];else cua[t.dataset.csfc]=Math.max(0,Math.round(+t.value));csFrSet({cua});return}
  if(t.dataset.cszm&&ed){const[c,i]=t.dataset.cszm.split(':');csSzEdit(x=>{const m={...(x.met||{})};(m[c]=(m[c]||[]).slice())[+i]=t.value===''?null:+t.value;x.met=m});return}
  const k=t.dataset.csz;if(!k)return;
  if(k==='fref'){const f=csSzFr(),g=CSZ.fg;const C=csFrC(f,g);const lam=csLamOf(t.value,g);
    if(C&&C.pts&&C.vista&&lam&&lam.id!==C.vista){const API=window.__plano;const a=API.LAM.get(C.vista);if(a&&a.plb&&lam.plb&&a.plb.id===lam.plb.id){const s=a.w>0?lam.w/a.w:1;csFrSet({['c'+g]:{ref:t.value,vista:lam.id,pts:C.pts.map(x=>Math.round(x*s*10)/10)}});return}
      (async()=>{if(await uiAsk({title:'Cambiar el nivel de referencia',text:'Ese nivel usa otro plano: el contorno se borra y lo vuelves a dibujar.',ok:'Cambiar',tone:'warn'}))csFrSet({['c'+g]:{ref:t.value,vista:lam.id,pts:null}});else csSzDraw()})();return}
    csFrSet({['c'+g]:{...(C||{}),ref:t.value,vista:lam?lam.id:''}});return}
  if(k==='alt'){if(CSZ.dirty)csSzSave(true);CSZ.vid=t.value;CSZ.v=KSEC.has(t.value)?csSzNorm(KSEC.get(t.value)):CSZ.v;CSZ.hist=[];CSZ.sel=null;CSZ.dirty=false;csSzDraw();return}
  if(k==='altn'&&ed&&CSZ.v){CSZ.v.n=t.value.trim()||CSZ.v.n;CSZ.dirty=true;csSzSave();csSzDraw();return}
  if(k==='ritmo'&&ed&&CSZ.v){CSZ.v.ritmo=+t.value||1;CSZ.dirty=true;csSzSave();csSzDraw()}}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.cszo==='met')CSZ.om=d.open},true);
document.addEventListener('keydown',e=>{if(U.tab!=='planos'||!CS()||!document.getElementById('cssz'))return;if(document.querySelector('.uask'))return;const tg=e.target;const typing=tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT');
  const fr=document.getElementById('cssz').dataset.v==='fr';
  if(e.key==='Escape'&&(CSZ.tool||CSZ.ftool||CSZ.sel)){CSZ.tool='';CSZ.ftool='';CSZ.tmp=[];CSZ.sel=null;csSzDraw();return}
  if(e.key==='Enter'&&CSZ.tmp.length>=3){e.preventDefault();const host=document.getElementById('csszmap');if(host&&host._o&&host._o.onPolyClose)host._o.onPolyClose();return}
  if(typing||fr)return;
  if((e.key==='Delete'||e.key==='Backspace')&&CSZ.sel){e.preventDefault();csSzDel();return}
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&CSZ.hist.length){e.preventDefault();e.stopPropagation();csSzUndo()}},true);
