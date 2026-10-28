"use strict";
/* LPS 911 · Casco › Metrados: motor de cálculo (funciones puras: sin interfaz ni Firestore). La pestaña está en casco-met.js.
   Idea (decidida con el dueño, 28-10-2026): el armado se escribe UNA vez por tipo de elemento, tal como está en el plano
   («2Ø5/8 + 1Ø1/2», «Ø3/8: 1@.05, 10@.10, r@.25»), y cada fila de la planilla solo dice dónde está (sector, eje, luces).
   El motor arma el despiece real con los parámetros del plano (traslapes, ganchos, recubrimientos, longitud de varilla)
   y reparte cada cantidad en el sector y en la partida del tren que le toca. Detalle en docs/ia/casco.md «Metrados». */

/* diámetros: clave, nombre visible, peso nominal kg/m */
const KM_DIA=[['6mm','6 mm',0.222],['1/4','1/4"',0.250],['8mm','8 mm',0.395],['3/8','3/8"',0.560],['12mm','12 mm',0.888],['1/2','1/2"',0.994],['5/8','5/8"',1.552],['3/4','3/4"',2.235],['1','1"',3.973],['1 3/8','1 3/8"',7.907]];
const KM_DK=Object.fromEntries(KM_DIA.map(d=>[d[0],d]));
/* valores típicos de ejemplo (se reemplazan por la tabla del plano en Parámetros): traslape, gancho estándar 90° (lo que suma a la
   barra) y gancho de estribo 135° (cada uno) */
const KM_DIA_DEF={'6mm':[0.30,0.10,0.075],'1/4':[0.30,0.10,0.075],'8mm':[0.35,0.12,0.08],'3/8':[0.45,0.15,0.10],'12mm':[0.55,0.19,0.12],'1/2':[0.55,0.20,0.12],'5/8':[0.70,0.25,0.15],'3/4':[0.85,0.30,0.18],'1':[1.15,0.40,0.24],'1 3/8':[1.60,0.55,0.33]};
/* clases de elemento */
const KM_CL={vig:'Viga',col:'Columna',pla:'Placa',ali:'Losa aligerada',mac:'Losa maciza',mur:'Muro de albañilería'};
/* salidas: clave, nombre, unidad, partida del catálogo típico (cs_mcat k-<clave>) */
const KM_OUT=[['av','Acero de verticales','kg','AV'],['ev','Encofrado de verticales','m²','EV'],['vv','Concreto de verticales','m³','VV'],['dv','Desencofrado de verticales','m²','DV'],
  ['ef1','Encofrado de fondo y 1.er costado de viga','m²','EF1'],['avg','Acero de vigas','kg','AVG'],['ef2','Encofrado de 2.º costado de viga y fondo de losa','m²','EF2'],
  ['alo','Acero de losa','kg','ALO'],['vl','Concreto de losa y vigas','m³','VL'],['as','Asentado de muros','m²','AS']];
const KM_STEEL={col:'av',pla:'av',vig:'avg',ali:'alo',mac:'alo'};

function kmParDef(){const dia={};for(const[k,,kg]of KM_DIA){const v=KM_DIA_DEF[k];dia[k]={kg,lt:v[0],g90:v[1],g135:v[2]}}
  return{lv:9,vsp:0.40,lad:{b:0.30,l:0.30},rec:{vig:0.04,col:0.04,pla:0.04,los:0.02},dia,
    rg:{vig:[80,180],col:[100,260],pla:[40,130],ali:[30,80],mac:[40,120]},map:{}}}
/** parámetros guardados completados con los típicos (lo que falta o no es número válido toma el típico) */
function kmPar(saved){const D=kmParDef(),s=saved||{};const num=(v,d)=>Number.isFinite(+v)&&+v>0?+v:d;
  const P={lv:num(s.lv,D.lv),vsp:num(s.vsp,D.vsp),lad:{b:num(s.lad&&s.lad.b,D.lad.b),l:num(s.lad&&s.lad.l,D.lad.l)},rec:{},dia:{},rg:{},map:Object.assign({},s.map||{})};
  for(const k of Object.keys(D.rec))P.rec[k]=Number.isFinite(+(s.rec||{})[k])&&+(s.rec||{})[k]>=0?+(s.rec||{})[k]:D.rec[k];
  for(const k of Object.keys(D.dia)){const a=(s.dia||{})[k]||{},d=D.dia[k];P.dia[k]={kg:num(a.kg,d.kg),lt:num(a.lt,d.lt),g90:num(a.g90,d.g90),g135:num(a.g135,d.g135)}}
  for(const k of Object.keys(D.rg)){const a=(s.rg||{})[k]||[];P.rg[k]=[num(a[0],D.rg[k][0]),num(a[1],D.rg[k][1])]}
  return P}

/* ---------- lectura de lo que se escribe como en el plano ---------- */
/** número con punto o coma decimal */
function kmNum(t){const s=String(t??'').trim().replace(',','.');if(s==='')return null;const v=Number(s);return Number.isFinite(v)?v:NaN}
/** espaciamiento o longitud: «.20», «0.20» o «20» (cm si es mayor que 1,5) */
function kmLen(t){const v=kmNum(String(t||'').replace(/cm|m$/i,''));if(v==null||!Number.isFinite(v))return null;return v>1.5?v/100:v}
/** diámetro: «5/8», «5/8"», «12mm», «12 mm», «1 3/8», «1» */
function kmDia(t){let s=String(t||'').toLowerCase().replace(/[“”″"'´`]/g,'').replace(/\s+/g,' ').trim();
  const mm=/^(\d+)\s*mm$/.exec(s);if(mm)return KM_DK[mm[1]+'mm']?mm[1]+'mm':null;
  s=s.replace(/^1[\s-]?3\/8$/,'1 3/8');return KM_DK[s]?s:null}
/** «2Ø5/8 + 1Ø1/2» → [{n:2,d:'5/8'},{n:1,d:'1/2'}]; null si está vacío; {err} si no se entiende */
function kmSpec(t){const s=String(t||'').trim();if(!s)return null;const out=[];
  for(const part of s.split('+')){const m=/^\s*(\d+)\s*(?:[øØ∅φΦ]|phi|fi|f)\s*(.+?)\s*$/i.exec(part);const d=m&&kmDia(m[2]);if(!m||!d||!(+m[1]>0))return{err:`no entiendo «${part.trim()}» (escribe p. ej. 2Ø5/8)`};out.push({n:+m[1],d})}
  return out}
/** malla «Ø3/8@.20» → {d,s}; null si está vacía; {err} */
function kmMalla(t){const s=String(t||'').trim();if(!s)return null;const m=/^\s*(?:(?:[øØ∅φΦ]|phi|fi|f)\s*)?(.+?)\s*@\s*([\d.,]+\s*(?:cm|m)?)\s*$/i.exec(s);const d=m&&kmDia(m[1]),sp=m&&kmLen(m[2]);
  if(!d||!(sp>0))return{err:`no entiendo «${s}» (escribe p. ej. Ø3/8@.20)`};return{d,s:sp}}
/** distribución de estribos «1@.05, 10@.10, r@.25 c/e» → {z:[{n,s}], r} (se aplica desde cada extremo); null; {err} */
function kmDist(t){let s=String(t||'').trim();if(!s)return null;s=s.replace(/^[^@]*:/,'').trim();s=s.replace(/c\s*\/\s*e(xt(remo)?)?\.?|c\/ext\.?|cada\s+extremo/ig,'').trim().replace(/[;,]\s*$/,'');const z=[];let r=null;
  for(const tk of s.split(/[;,]|\s+(?=\d+\s*@|r\w*\s*@)/i).map(x=>x.trim()).filter(Boolean)){const m=/^(\d+|r|rto|resto|res)\.?\s*@\s*([\d.,]+\s*(?:cm|m)?)$/i.exec(tk);const sp=m&&kmLen(m[2]);
    if(!m||!(sp>0))return{err:`no entiendo «${tk}» en los estribos (escribe p. ej. 1@.05, 10@.10, r@.25)`};if(/^\d/.test(m[1]))z.push({n:+m[1],s:sp});else r=sp}
  if(r==null){if(!z.length)return{err:'faltan los espaciamientos de los estribos'};r=z[z.length-1].s}return{z,r}}
/** luces «5.35 + 4.80» o con sector propio por tramo «5.35 + S2:4.80» → [{L, code}] (code null = el de la fila); {err} */
function kmLuces(t){const s=String(t||'').trim();if(!s)return[];const out=[];
  for(const part of s.split(/[+;]/)){const p=part.trim();if(!p)continue;const m=/^([A-Za-z]{1,4}\d{0,3})\s*:\s*(.+)$/.exec(p);const L=kmNum(m?m[2]:p);
    if(!(L>0))return{err:`no entiendo la luz «${p}» (escribe p. ej. 5.35 + 4.80)`};out.push({L,code:m?m[1].toUpperCase():null})}
  return out}

const kmS=v=>'.'+String(Math.round(v*100)).padStart(2,'0');
/** estribos en una luz libre Lc con la distribución desde cada extremo; el centro va al espaciamiento r */
function kmEstN(Lc,D){if(!(Lc>0)||!D||D.err)return 0;const half=Lc/2;let x=0,nl=0;
  out:for(const z of D.z){for(let i=0;i<z.n;i++){if(x+z.s>half+1e-9)break out;x+=z.s;nl++}}
  const gap=Lc-2*x;let nc=0;if(gap>D.r+1e-9)nc=Math.ceil(gap/D.r-1e-9)-1;
  return 2*nl+nc-(nl>0&&gap<1e-9?1:0)}
/** largo de una barra con sus empalmes cuando pasa la longitud comercial: cada varilla extra aporta (lv − traslape) */
function kmSplice(len,d,P){const lv=P.lv,lt=P.dia[d].lt;if(!(len>lv)||!(lv>lt))return{len,ns:0};const ns=Math.ceil((len-lv)/(lv-lt)-1e-9);return{len:len+ns*lt,ns}}
/** largo de un estribo: r = cerrado; gb = gancho a lo ancho (b); gh = gancho a lo alto (h) */
function kmEstLen(f,b,h,rec,g135){const bi=Math.max(0,b-2*rec),hi=Math.max(0,h-2*rec);return f==='gb'?bi+2*g135:f==='gh'?hi+2*g135:2*bi+2*hi+2*g135}

/* ---------- cálculo por fila ---------- */
function kmNew(){return{bars:[],al:{},kg:0,cq:0,err:[],area:0,lad:0}}
function kmAdd(o,sec,k,v){if(!(v>0)&&v!==0)return;const a=o.al[sec]||(o.al[sec]={});a[k]=(a[k]||0)+v}
/** agrega una barra al despiece y reparte su peso entre sectores (parts: [{sec,w}] pesos relativos) */
function kmBar(o,P,m,d,n,len,parts,key){if(!(n>0)||!(len>0))return;const kgm=P.dia[d].kg;const kg=n*len*kgm;o.bars.push({m,d,n,l:len,kg});o.kg+=kg;
  const W=parts.reduce((s,p)=>s+p.w,0)||1;for(const p of parts)kmAdd(o,p.sec,key,kg*p.w/W)}
/** tramos de la fila con su sector (sector propio por tramo «S2:4.80» si existe en el nivel) */
function kmSpans(R,ctx,o){const L=kmLuces(R.lu);if(L.err){o.err.push(L.err);return[]}
  return L.map(s=>{let sec=R.sec;if(s.code){const id=ctx&&ctx.secByCode?ctx.secByCode(s.code):null;if(id)sec=id;else o.err.push(`el sector ${s.code} no existe en este nivel`)}return{L:s.L,sec}})}
const kmOrd=(ctx,sec)=>ctx&&ctx.secOrd?ctx.secOrd(sec):0;

/** barras de una viga continua (también cada vigueta del aligerado): corridos, bastones en apoyos y en tramo, estribos por tramo */
function kmBeam(o,T,sp,P,rec,mult,key,pre,ctx){const a=+T.a||0,N=sp.length;if(!N)return;const tot=sp.reduce((s,x)=>s+x.L,0)+(N-1)*a;
  for(const ln of T.L||[]){const bs=kmSpec(ln.s);if(!bs)continue;if(bs.err){o.err.push(bs.err);continue}const pos=(pre||'')+(ln.p==='inf'?'Inf.':'Sup.');const k=+ln.k>1?+ln.k:3;
    for(const b of bs){const D=P.dia[b.d];const n=b.n*mult;
      if(ln.t==='ba'){/* bastón en cada apoyo: extremo con gancho, interior a ambos lados */
        const ext=[];const int=[];for(let j=0;j<=N;j++){if(j===0)ext.push({len:sp[0].L/k+(a-rec)+D.g90,parts:[{sec:sp[0].sec,w:1}]});else if(j===N)ext.push({len:sp[N-1].L/k+(a-rec)+D.g90,parts:[{sec:sp[N-1].sec,w:1}]});
          else int.push({len:sp[j-1].L/k+a+sp[j].L/k,parts:[{sec:sp[j-1].sec,w:sp[j-1].L},{sec:sp[j].sec,w:sp[j].L}]})}
        const put=(L,lab)=>{if(!L.length)return;const len=L.reduce((s,x)=>s+x.len,0)/L.length;const kgm=D.kg;const kg=L.reduce((s,x)=>s+x.len,0)*n*kgm;o.bars.push({m:`${pos} bastón L/${k} · ${lab}`,d:b.d,n:n*L.length,l:len,kg});o.kg+=kg;
          for(const x of L){const W=x.parts.reduce((s,p)=>s+p.w,0)||1;for(const p of x.parts)kmAdd(o,p.sec,key,x.len*n*kgm*p.w/W)}};
        put(ext,'apoyo extremo');put(int,'apoyo interior')}
      else if(ln.t==='bt'){for(const s of sp){const len=s.L*(1-2/k);kmBar(o,P,`${pos} bastón en tramo (corte a L/${k})`,b.d,n,len,[{sec:s.sec,w:1}],key)}}
      else{/* corrido: de extremo a extremo con gancho 90° en los apoyos extremos y empalmes si pasa la varilla */
        const base=tot+2*(a-rec)+2*D.g90;const S=kmSplice(base,b.d,P);kmBar(o,P,`${pos} corrido${S.ns?` (${S.ns} empalme${S.ns>1?'s':''})`:''}`,b.d,n,S.len,sp.map(s=>({sec:s.sec,w:s.L+a})),key);
        /* junta de sector entre tramos: un traslape más, al sector que se vacía primero */
        for(let j=1;j<N;j++)if(sp[j].sec!==sp[j-1].sec){const first=kmOrd(ctx,sp[j-1].sec)<=kmOrd(ctx,sp[j].sec)?sp[j-1].sec:sp[j].sec;kmBar(o,P,`${pos} traslape en junta de sector`,b.d,n,D.lt,[{sec:first,w:1}],key)}}}}
  for(const e of T.est||[]){const Dz=kmDist(e.z);if(!Dz)continue;if(Dz.err){o.err.push(Dz.err);continue}const d=kmDia(e.d);if(!d){o.err.push('falta el diámetro del estribo');continue}
    const len=kmEstLen(e.f,+T.b,+T.h,rec,P.dia[d].g135);for(const s of sp){const n=kmEstN(s.L,Dz)*mult;kmBar(o,P,`${pre||''}Estribo ${e.f==='r'||!e.f?'':'(gancho) '}${e.z}`,d,n,len,[{sec:s.sec,w:1}],key)}}}

/** verticales (columna y placa): longitudinales con traslape arriba, estribos en la altura libre y en el nudo */
function kmVert(o,T,R,P,mult){const H=+R.al||0,hv=Math.max(0,+T.hv||0),Lc=Math.max(0,H-hv),sec=R.sec,rec=T.cl==='pla'?P.rec.pla:P.rec.col;const b=+T.b||0,h=+T.h||0;
  if(!(H>0)){o.err.push('falta la altura de piso a piso');return}
  kmAdd(o,sec,'vv',b*h*Lc*mult);const enc=(T.cl==='pla'?2*h+2*b:2*(b+h))*Lc*mult;kmAdd(o,sec,'ev',enc);kmAdd(o,sec,'dv',enc);kmAdd(o,sec,'vl',b*h*hv*mult);o.cq+=b*h*H*mult;
  const one=[{sec,w:1}];
  for(const ln of T.L||[]){const bs=kmSpec(ln.s);if(!bs)continue;if(bs.err){o.err.push(bs.err);continue}for(const x of bs){const S=kmSplice(H+P.dia[x.d].lt,x.d,P);kmBar(o,P,'Longitudinal + traslape',x.d,x.n*mult,S.len,one,'av')}}
  const est=(list,bb,hh,lab,nn)=>{for(const e of list||[]){const Dz=kmDist(e.z);if(!Dz)continue;if(Dz.err){o.err.push(Dz.err);continue}const d=kmDia(e.d);if(!d){o.err.push('falta el diámetro del estribo');continue}
    const n=(kmEstN(Lc,Dz)+(hv>0?Math.ceil(hv/Dz.r-1e-9):0))*nn*mult;kmBar(o,P,`${lab}Estribo ${e.f==='r'||!e.f?'':'(gancho) '}${e.z}`,d,n,kmEstLen(e.f,bb,hh,rec,P.dia[d].g135),one,'av')}};
  if(T.cl==='col')est(T.est,b,h,'',1);
  else{const cap=+T.cap===1?1:2;const V=kmMalla(T.mv),Hh=kmMalla(T.mh);
    if(V&&V.err)o.err.push(V.err);else if(V){const n=(Math.floor(Math.max(0,h-2*rec)/V.s+1e-9)+1)*cap;const S=kmSplice(H+P.dia[V.d].lt,V.d,P);kmBar(o,P,`Malla vertical Ø${V.d}@${kmS(V.s)}`,V.d,n*mult,S.len,one,'av')}
    if(Hh&&Hh.err)o.err.push(Hh.err);else if(Hh){const n=(Math.floor(Lc/Hh.s+1e-9)+1)*cap;const S=kmSplice(Math.max(0,h-2*rec)+2*P.dia[Hh.d].g90,Hh.d,P);kmBar(o,P,`Malla horizontal Ø${Hh.d}@${kmS(Hh.s)}`,Hh.d,n*mult,S.len,one,'av')}
    const nu=T.nuc||{};const nn=Math.max(0,Math.round(+nu.n||0));if(nn){const bs=kmSpec(nu.s);if(bs&&bs.err)o.err.push(bs.err);else if(bs)for(const x of bs){const S=kmSplice(H+P.dia[x.d].lt,x.d,P);kmBar(o,P,'Núcleo: longitudinal + traslape',x.d,x.n*nn*mult,S.len,one,'av')}
      est(nu.est,b,+nu.ln||b,'Núcleo: ',nn)}}}

/** una fila de la planilla con su tipo: despiece, peso por sector y partida, concreto de la cuantía y avisos */
function kmCalc(T,R,P,ctx){const o=kmNew();if(!T){o.err.push('el tipo no existe');return o}const mult=Math.max(0,kmNum(R.v)??1)||0;const key=KM_STEEL[T.cl];
  if(T.cl==='col'||T.cl==='pla'){kmVert(o,T,R,P,mult);return o}
  const sp=kmSpans(R,ctx,o);if(!sp.length){if(!o.err.length)o.err.push('faltan las luces');return o}
  if(T.cl==='vig'){const hn=Math.max(0,(+T.h||0)-(+T.el||0)),b=+T.b||0;for(const s of sp){kmAdd(o,s.sec,'vl',b*hn*s.L*mult);kmAdd(o,s.sec,'ef1',(b+hn)*s.L*mult);kmAdd(o,s.sec,'ef2',hn*s.L*mult);o.cq+=b*(+T.h||0)*s.L*mult}
    kmBeam(o,T,sp,P,P.rec.vig,mult,key,'',ctx);return o}
  if(T.cl==='mur'){const H=+R.al||0;if(!(H>0)){o.err.push('falta la altura del muro');return o}const vn=Math.max(0,kmNum(R.vn)||0);const tot=sp.reduce((s,x)=>s+x.L,0);
    for(const s of sp){const a=Math.max(0,s.L*H-vn*s.L/tot)*mult;kmAdd(o,s.sec,'as',a);o.area+=a}return o}
  const B=kmNum(R.an);if(!(B>0)){o.err.push('falta el ancho del paño');return o}const tot=sp.reduce((s,x)=>s+x.L,0);
  if(T.cl==='ali'){const h=+T.h||0.20,nl=1/P.vsp/P.lad.l;const cpm=Math.max(0,h-nl*P.lad.b*P.lad.l*Math.max(0,h-0.05));
    for(const s of sp){const A=s.L*B*mult;kmAdd(o,s.sec,'vl',A*cpm);kmAdd(o,s.sec,'ef2',A);o.cq+=A*cpm;o.area+=A;o.lad+=A*nl}
    const nv=Math.max(1,Math.round(B/P.vsp));kmBeam(o,{...T,b:0.10,h},sp,P,P.rec.los,nv*mult,key,'Vigueta: ',ctx);
    const M=kmMalla(T.tem);if(M&&M.err)o.err.push(M.err);else if(M){const n=Math.floor(tot/M.s+1e-9)+1;const S=kmSplice(B,M.d,P);kmBar(o,P,`Temperatura Ø${M.d}@${kmS(M.s)}`,M.d,n*mult,S.len,sp.map(s=>({sec:s.sec,w:s.L})),key)}
    return o}
  /* losa maciza: mallas inferior y superior en ambos sentidos */
  const e=+T.h||0.20,a=+T.a||0,rec=P.rec.los;for(const s of sp){const A=s.L*B*mult;kmAdd(o,s.sec,'vl',A*e);kmAdd(o,s.sec,'ef2',A);o.cq+=A*e;o.area+=A}
  for(const[k,lab]of[['mi','inferior'],['ms','superior']]){const M=kmMalla(T[k]);if(!M)continue;if(M.err){o.err.push(M.err);continue}const D=P.dia[M.d];
    const nx=Math.floor(B/M.s+1e-9)+1;const S=kmSplice(tot+(sp.length-1)*a+2*(a-rec)+2*D.g90,M.d,P);kmBar(o,P,`Malla ${lab} Ø${M.d}@${kmS(M.s)} · sentido de la luz`,M.d,nx*mult,S.len,sp.map(s=>({sec:s.sec,w:s.L})),key);
    for(const s of sp){const ny=Math.floor(s.L/M.s+1e-9)+1;const Sy=kmSplice(B+2*D.g90,M.d,P);kmBar(o,P,`Malla ${lab} Ø${M.d}@${kmS(M.s)} · sentido del ancho`,M.d,ny*mult,Sy.len,[{sec:s.sec,w:1}],key)}}
  return o}

/** todo el nivel: cada fila, totales por sector y salida, cuantía por tipo y peso por diámetro */
function kmLevel(rows,tipos,P,ctx){const TM=new Map((tipos||[]).map(t=>[t.id,t]));const R={rows:{},sec:{},tipo:{},dia:{},err:0};
  for(const r of rows||[]){const T=TM.get(r.t);const o=kmCalc(T,r,P,ctx);R.rows[r.id]=o;if(o.err.length)R.err++;
    for(const[s,v]of Object.entries(o.al)){const a=R.sec[s]||(R.sec[s]={});for(const[k,x]of Object.entries(v))a[k]=(a[k]||0)+x}
    if(T){const t=R.tipo[T.id]||(R.tipo[T.id]={kg:0,cq:0,n:0});t.kg+=o.kg;t.cq+=o.cq;t.n++}
    for(const b of o.bars)R.dia[b.d]=(R.dia[b.d]||0)+b.kg}
  return R}
/** cuantía de un tipo (kg/m³) y si sale del rango configurado para su clase */
function kmQ(T,agg,P){if(!T||T.cl==='mur')return null;let kg=agg&&agg.kg,cq=agg&&agg.cq;
  if(!(cq>0)){const R={id:'_',t:T.id,sec:'_',v:1,lu:'5',an:'4',al:'3'};const o=kmCalc(T,R,P,null);kg=o.kg;cq=o.cq}
  if(!(cq>0))return null;const q=kg/cq;const rg=P.rg[T.cl]||[0,1e9];return{q,out:q<rg[0]||q>rg[1],rg}}
