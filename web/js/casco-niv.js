"use strict";
/* LPS 911 · Casco › Sectorización › Niveles (28-10-2026, bosquejo aprobado por el dueño; docs/ia/casco.md «Niveles»).
   Edita los sectores reales de cada nivel (los que usa el Tren) sobre la lámina base del nivel:
   - Ajustar: esquinas una por una, la barra del medio de una cara la mueve entera, doble clic en un borde agrega una esquina; con
     «Mover juntas las esquinas compartidas» el vecino se ajusta con él (ambMap o.edit.link, plano.js).
   - Partir: una línea que cruza un sector lo parte en dos. El original conserva su programación; el nuevo queda sin programar; los
     códigos se renumeran en orden y los metrados se reparten por área.
   - Juntar: dos sectores vecinos. Queda el primero en el orden del tren y recibe los días programados del otro desde mañana; el otro
     se archiva (si tiene días ya ejecutados se conserva como historia: amb.fus, no se dibuja ni se ofrece para programar).
   - Copiar de otro nivel: dos puntos en el origen y los mismos dos en el destino (con zoom); posición, escala y giro.
   Cada cambio vale solo para ese nivel y lo marca «ajustado a mano» (sectors.hand); «Aplicar a niveles» del asistente pregunta si
   los reemplaza. Todo va con apply() (Ctrl+Z). Parte de la app: comparte las variables globales de los demás archivos de js/. */

const CNV={pid:'',tool:'',sel:'',tmp:[],pend:'',shared:true,cp:null};
const cnvStrip=o=>{const x={...o};delete x.id;return x};
const cnvFid=f=>f?f.id:'_';
const cnvLevels=f=>f?csFrLv(f):pisos();
function cnvSec(pid,g,fid){return[...S.sec.values()].find(s=>s.pisoId===pid&&s.grp===g&&ctFrOfSec(s)===fid)||null}
const cnvAmbs=sec=>sec?[...S.amb.values()].filter(a=>a.sectorId===sec.id&&!a.fus).sort(byOrder):[];
const cnvGeo=(a,lam)=>a&&lam&&a.geo&&Array.isArray(a.geo[lam.id])&&a.geo[lam.id].length>=6?a.geo[lam.id]:null;
const cnvTag=(p,g)=>csPisoTag(p,g)||(p&&p.code)||'';
/** días programados desde mañana en el sector */
function cnvProg(ambId){const t=todayIso();let n=0;for(const x of S.act.values())if(!x.arch&&!x._del&&x.ambId===ambId)n+=(x.days||[]).filter(d=>d>t).length;return n}
function cnvCtx(){const f=csSzFr(),g=CSZ.fg,fid=cnvFid(f);const LV=cnvLevels(f);if(!LV.some(p=>p.id===CNV.pid))CNV.pid=(LV.find(p=>p.id===U.piso)||LV.find(p=>cnvAmbs(cnvSec(p.id,g,fid)).length)||LV[0]||{}).id||'';
  const p=S.pis.get(CNV.pid);const sec=cnvSec(CNV.pid,g,fid);const lam=CNV.pid?csLamOf(CNV.pid,g):null;const ambs=cnvAmbs(sec);return{f,g,fid,LV,p,sec,lam,ambs}}
function cnvHandOp(sec){return sec&&!sec.hand?op('sectors',sec.id,{...cnvStrip(sec),hand:{t:NOW(),by:me.email}}):null}
/** códigos A1…An en el orden dado (prefijo: el de los códigos actuales) */
function cnvRenum(list,g,f){const pre=(list.map(a=>String(a.code||'').replace(/\d+$/,'')).find(Boolean))||(f&&f.code)||(g==='A'?'A':'S');
  return list.map((a,i)=>({a,code:pre+(i+1),order:i+1}))}

/* ---------- geometría: unión de dos sectores vecinos (comparten un borde) ---------- */
function cnvOnSeg(p,a,b,e){const L2=(b.x-a.x)**2+(b.y-a.y)**2;if(!L2)return null;const t=((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/L2;if(t<=1e-4||t>=1-1e-4)return null;return Math.hypot(a.x+t*(b.x-a.x)-p.x,a.y+t*(b.y-a.y)-p.y)<e?t:null}
function cnvAddPts(P,Q,e){const o=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];o.push(a);Q.map(q=>({q,t:cnvOnSeg(q,a,b,e)})).filter(z=>z.t!=null).sort((u,v)=>u.t-v.t).forEach(z=>o.push({...z.q}))}return o}
const cnvSA=P=>{let a=0;for(let i=0,j=P.length-1;i<P.length;j=i++)a+=P[j].x*P[i].y-P[i].x*P[j].y;return a/2};
function cnvUnion(A,B,e){const ccw=P=>cnvSA(P)<0?P.slice().reverse():P.slice();const nr=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y)<e;
  A=cnvAddPts(ccw(A),B,e);B=cnvAddPts(ccw(B),A,e);const ed=P=>P.map((p,i)=>[p,P[(i+1)%P.length]]);const ea=ed(A),eb=ed(B);let sh=0;
  const kA=ea.filter(([p,q])=>{const s=eb.some(([r,t])=>nr(p,t)&&nr(q,r));if(s)sh++;return!s}),kB=eb.filter(([p,q])=>!ea.some(([r,t])=>nr(p,t)&&nr(q,r)));
  if(!sh)return null;const all=kA.concat(kB);if(!all.length)return null;let cur=all.shift();const out=[cur[0]];let g=0;
  while(all.length&&g++<2000){const i=all.findIndex(([p])=>nr(p,cur[1]));if(i<0)return null;out.push(all[i][0]);cur=all.splice(i,1)[0]}
  if(!nr(cur[1],out[0]))return null;
  return out.filter((p,i)=>{const a=out[(i-1+out.length)%out.length],b=out[(i+1)%out.length];const L=Math.hypot(b.x-a.x,b.y-a.y)||1;return Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))/L>Math.max(.5,e/2)})}

/* ---------- marco común: lámina de referencia del frente, alineación de niveles, ejes y tercios (28-10-2026, con el dueño) ---------- */
const csI={a:1,b:0,e:0,f:0};
const csAp=(T,p)=>({x:T.a*p.x-T.b*p.y+T.e,y:T.b*p.x+T.a*p.y+T.f});
const csInvT=T=>{const k2=T.a*T.a+T.b*T.b||1,a=T.a/k2,b=-T.b/k2;return{a,b,e:-(a*T.e-b*T.f),f:-(b*T.e+a*T.f)}};
const csCmpT=(M,T)=>({a:M.a*T.a-M.b*T.b,b:M.a*T.b+M.b*T.a,e:M.a*T.e-M.b*T.f+M.e,f:M.b*T.e+M.a*T.f+M.f});
const csMapF=(T,f)=>f.length?csgFlat(csUnflat(f).map(p=>csAp(T,p))):f;
/** lámina de referencia del frente y grupo: la del contorno del frente; sin contorno, la del primer nivel con lámina */
function csRefLam(f,g){const API=window.__plano;const C=csFrC(f,g);if(C&&C.vista&&API&&API.LAM&&API.LAM.get(C.vista))return API.LAM.get(C.vista);
  for(const p of(f?csFrLv(f):pisos())){const l=csLamOf(p.id,g);if(l)return l}return null}
const csAlOk=l=>l&&l.al&&(l.al.rev==null||l.al.rev===l.rev);
/** de la lámina de referencia a otra lámina (semejanza {a,b,e,f}) o null si no se sabe: la misma lámina, el mismo plano del módulo
    Planos (solo escala) o una alineación guardada (laminas.al, hecha con 1 o 2 puntos en «Alinear niveles») */
function csMap(ref,lam){if(!ref||!lam)return null;if(ref.id===lam.id)return csI;
  if(ref.plb&&lam.plb&&ref.plb.id===lam.plb.id&&ref.w>0){const k=lam.w/ref.w;return{a:k,b:0,e:0,f:0}}
  if(csAlOk(lam)&&lam.al.ref===ref.id)return lam.al;if(csAlOk(ref)&&ref.al.ref===lam.id)return csInvT(ref.al);
  if(csAlOk(lam)&&csAlOk(ref)&&lam.al.ref===ref.al.ref)return csCmpT(lam.al,csInvT(ref.al));return null}
/** tercios de las luces: entre cada par de ejes paralelos (en las coordenadas de la referencia) y de las luces sueltas */
function csThirds(ref){const E=(ref&&ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4);const out=[];if(!E.length&&!(ref&&ref.luces||[]).length)return out;
  const isV=e=>Math.abs(e.p[2]-e.p[0])<Math.abs(e.p[3]-e.p[1]);const V=E.filter(isV).map(e=>({e,c:(e.p[0]+e.p[2])/2})).sort((a,b)=>a.c-b.c),H=E.filter(e=>!isV(e)).map(e=>({e,c:(e.p[1]+e.p[3])/2})).sort((a,b)=>a.c-b.c);
  const ys=E.flatMap(e=>[e.p[1],e.p[3]]),xs=E.flatMap(e=>[e.p[0],e.p[2]]);const y0=Math.min(...ys),y1=Math.max(...ys),x0=Math.min(...xs),x1=Math.max(...xs);
  for(let i=0;i+1<V.length;i++){const a=V[i].c,b=V[i+1].c;[1,2].forEach(k=>{const c=a+(b-a)*k/3;out.push({pts:[c,y0,c,y1],lbl:`${k}/3 ${V[i].e.n}–${V[i+1].e.n}`})})}
  for(let i=0;i+1<H.length;i++){const a=H[i].c,b=H[i+1].c;[1,2].forEach(k=>{const c=a+(b-a)*k/3;out.push({pts:[x0,c,x1,c],lbl:`${k}/3 ${H[i].e.n}–${H[i+1].e.n}`})})}
  (ref.luces||[]).forEach((l,i)=>{const p=l.p;if(!Array.isArray(p)||p.length!==4)return;const L=Math.hypot(p[2]-p[0],p[3]-p[1])||1;const nx=-(p[3]-p[1])/L,ny=(p[2]-p[0])/L;const h=L*.6;
    [1,2].forEach(k=>{const cx=p[0]+(p[2]-p[0])*k/3,cy=p[1]+(p[3]-p[1])*k/3;out.push({pts:[cx-nx*h,cy-ny*h,cx+nx*h,cy+ny*h],lbl:`${k}/3 luz ${i+1}`,luz:1})})});
  return out}
/** guías para dibujar en una lámina: ejes (naranja, con nombre) y tercios (morado, tenues) llevados de la referencia; y las líneas para pegarse */
function csGuides(ref,lam,show){return csGuidesM(ref,csMap(ref,lam),show)}
function csGuidesM(ref,m,show){if(!m||!ref)return{guides:[],snap:[]};const T=csThirds(ref).map(t=>({...t,pts:csMapF(m,t.pts)}));
  const E=(ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4).map(e=>({pts:csMapF(m,e.p),c:'#C2410C',w:1.6,dash:'14 4 3 4',op:.85,lbl:e.n}));
  const L=(ref.luces||[]).filter(l=>Array.isArray(l.p)&&l.p.length===4).map(l=>({pts:csMapF(m,l.p),c:'#7C3AED',w:2,op:.8}));
  return{guides:show?E.concat(L,T.map(t=>({pts:t.pts,c:'#7C3AED',w:1.2,dash:'5 4',op:.55}))):E,snap:show?T:[]}}
/** cómo se muestra una lámina: en el marco de la referencia (enderezada y a su escala) cuando se sabe cómo */
const csDispM=(ref,lam)=>{const m=csMap(ref,lam);return m&&m!==csI?csInvT(m):null};
/** guardar en la lámina (cs_laminas; LAM se actualiza con la foto de la base) */
function csLamSet(lam,o){if(!lam||!csEd())return;Object.assign(lam,o);fcol('laminas').doc(lam.id).set(o,{merge:true}).catch(e=>toast('No se pudo guardar en la lámina: '+(e&&e.code||e)))}
/** eje trazado con dos puntos en la lámina «lam» → en coordenadas de la referencia, con nombre automático */
function csEjeAdd(ref,lam,a,b){const m=csMap(ref,lam);if(!m){toast('Alinea primero este nivel con la referencia.');return}const mi=csInvT(m);const A=csAp(mi,a),B=csAp(mi,b);
  const p=[A,B].flatMap(q=>[Math.round(q.x*10)/10,Math.round(q.y*10)/10]);const v=Math.abs(p[2]-p[0])<Math.abs(p[3]-p[1]);const E=(ref.ejes||[]).slice();
  const used=new Set(E.map(e=>String(e.n)));let n='';if(v){for(let i=0;i<26&&!n;i++){const c=String.fromCharCode(65+i);if(!used.has(c))n=c}}else{for(let i=1;i<99&&!n;i++)if(!used.has(String(i)))n=String(i)}
  E.push({n:n||'?',p});csLamSet(ref,{ejes:E});toast(`Eje ${n} trazado`)}
function csLuzAdd(ref,lam,a,b){const m=csMap(ref,lam);if(!m){toast('Alinea primero este nivel con la referencia.');return}const mi=csInvT(m);const A=csAp(mi,a),B=csAp(mi,b);
  csLamSet(ref,{luces:[...(ref.luces||[]),{p:[A,B].flatMap(q=>[Math.round(q.x*10)/10,Math.round(q.y*10)/10])}]});toast('Luz de viga: sus dos tercios ya están en el plano')}
/** sección «Ejes» del panel (Sectores y Niveles) */
function csEjesSec(ref,ed){if(!ref)return'';const E=(ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4);const sc=csScale(ref);const isV=e=>Math.abs(e.p[2]-e.p[0])<Math.abs(e.p[3]-e.p[1]);
  const pos=e=>isV(e)?(e.p[0]+e.p[2])/2:(e.p[1]+e.p[3])/2;const V=E.filter(isV).sort((a,b)=>pos(a)-pos(b)),H=E.filter(e=>!isV(e)).sort((a,b)=>pos(a)-pos(b));
  const span=A=>sc.mpp?A.slice(1).map((x,i)=>`${esc(A[i].n)}–${esc(x.n)} ${((pos(x)-pos(A[i]))*sc.mpp).toFixed(2)} m`).join(' · '):'';const nT=csThirds(ref).length;
  return`<details class="csfsec"${CSZ.oe?' open':''} data-cszo="ejes"><summary><b>Ejes y tercios</b><span class="mu">${E.length} eje(s) · ${nT} tercio(s)</span></summary>
    ${E.length?`<table class="t cstab"><thead><tr><th>Eje</th><th>Dirección</th>${sc.mpp?'<th class="n">Desde el primero</th>':''}${ed?'<th></th>':''}</tr></thead><tbody>${[...V,...H].map(e=>{const i=(ref.ejes||[]).indexOf(e);const L=isV(e)?V:H;return`<tr><td>${ed?`<input class="ci csn" data-csen="${i}" value="${esc(e.n)}" maxlength="4" aria-label="Nombre del eje">`:`<b>${esc(e.n)}</b>`}</td><td>${isV(e)?'Vertical':'Horizontal'}</td>${sc.mpp?`<td class="n">${((pos(e)-pos(L[0]))*sc.mpp).toFixed(2)} m</td>`:''}${ed?`<td class="c"><button type="button" class="ab" data-csex="${i}" aria-label="Quitar el eje ${esc(e.n)}">✕</button></td>`:''}</tr>`}).join('')}</tbody></table>
      <p class="note">${dxfOf(ref)?'Vienen del DXF de la planta. ':''}${V.length>1?'Luces verticales: '+span(V):''}${H.length>1?'<br>Luces horizontales: '+span(H):''}</p>`:'<p class="mu">Sin ejes. Trázalos una vez con «＃ Ejes» sobre la lámina de referencia: sirven para todos los niveles alineados y dan los tercios de cada luz.</p>'}
    ${(ref.luces||[]).length?`<p class="note">${ref.luces.length} luz(ces) de viga suelta(s). ${ed?'<button type="button" class="ib" data-csz="luz0">Quitar luces sueltas</button>':''}</p>`:''}</details>`}
document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.cszo==='ejes')CSZ.oe=d.open},true);
function csEjeEdit(e){const t=e.target;const ref=csRefLam(csSzFr(),CSZ.fg);if(!ref||!csEd())return false;
  if(t.dataset&&t.dataset.csen!=null&&e.type==='change'){const E=(ref.ejes||[]).slice();const i=+t.dataset.csen;if(E[i]){E[i]={...E[i],n:String(t.value).trim().toUpperCase().slice(0,4)||E[i].n};csLamSet(ref,{ejes:E});csSzDraw()}return true}
  const x=t.closest&&t.closest('[data-csex]');if(x&&e.type==='click'){const E=(ref.ejes||[]).slice();E.splice(+x.dataset.csex,1);csLamSet(ref,{ejes:E});csSzDraw();return true}
  const lz=t.closest&&t.closest('[data-csz="luz0"]');if(lz&&e.type==='click'){csLamSet(ref,{luces:[]});csSzDraw();return true}return false}
/** barra común: ortogonal y tercios */
const csOrtTer=()=>`<label class="chk cnvsh" title="Las líneas quedan horizontales o verticales (Mayúscula: libre)"><input type="checkbox" data-csz2="ortho"${CSZ.ortho!==false?' checked':''}> ⊥ Ortogonal</label><label class="chk cnvsh" title="Ejes y tercios de las luces; el clic se pega a los tercios (Alt: no se pega)"><input type="checkbox" data-csz2="ter"${CSZ.ter!==false?' checked':''}> Tercios</label>`;

/* ---------- dibujo ---------- */
function csNivDraw(){const C=cnvCtx(),{f,g,fid,LV,p,sec,lam,ambs}=C;if(CNV.tool==='viga'&&KVP.pid!==CNV.pid)Object.assign(KVP,{pid:CNV.pid,step:'a',a:null,ax:null,faces:[],vid:null});const ed=csEd();const ref=csRefLam(f,g);const isRef=!!(ref&&lam&&ref.id===lam.id);const mp=csMap(ref,lam);
  const lvChip=q=>{const s=cnvSec(q.id,g,fid);const A=cnvAmbs(s);const l=csLamOf(q.id,g);const nd=A.filter(a=>cnvGeo(a,l)).length;const al=!l?'':ref&&l.id===ref.id?'<span class="cnvtg ref">referencia</span>':csMap(ref,l)?'':'<span class="cnvtg none">sin alinear</span>';
    return`<button type="button" class="cnvlv${q.id===CNV.pid?' on':''}" data-cnvp="${esc(q.id)}"><b>${esc(cnvTag(q,g))}</b> ${esc(q.name)}${al}${s&&s.hand?'<span class="cnvtg hand">ajustado a mano</span>':''}${!l?'<span class="cnvtg none">sin lámina</span>':A.length&&!nd?'<span class="cnvtg none">sin dibujo</span>':''}<small>${A.length?`${A.length} sector${A.length>1?'es':''}${nd&&nd<A.length?` · ${nd} dibujados`:''}`:'sin sectores'}</small></button>`};
  const T=(k,ico,t,tip)=>`<button type="button" data-cnvt="${k}" class="${CNV.tool===k?'on':''}" title="${tip}">${ico} ${t}</button>`;
  csSet('csszh',`<div class="csszr">${csFrs().map(x=>`<button type="button" class="ib${x.id===CSZ.fr?' on':''}" data-cszf="${esc(x.id)}"><i class="csdot" style="--c:${esc(x.color||'#888')}"></i>${esc(x.name)}</button>`).join('')}
      <span class="seg" role="group" aria-label="Grupo">${['E','A'].map(k=>`<button type="button" data-cszg="${k}" class="${g===k?'on':''}">${k==='E'?'Estructura':'Albañilería'}</button>`).join('')}</span>
      <span class="cnvlvs" role="group" aria-label="Nivel">${LV.map(lvChip).join('')}</span></div>
    ${ed&&lam?`<div class="csszr"><span class="seg" role="group" aria-label="Herramienta">${T('','✋','Ajustar','Elige un sector y arrastra sus esquinas o sus caras; clic derecho en una esquina: agregar o quitar vértices')}${T('nr','▭','Nuevo','Dibuja un sector nuevo con un rectángulo')}${T('np','⬠','Nuevo','Dibuja un sector nuevo con un polígono')}${T('rd','↻','Redibujar','Vuelve a dibujar el sector elegido (polígono)')}${T('cut','✂','Partir','Traza una línea que cruce un sector')}${T('join','⊕','Juntar','Toca dos sectores vecinos')}${T('div','÷','Contorno y dividir','Dibuja el contorno del nivel y pártelo en N sectores de igual área')}</span>
      <span class="seg" role="group" aria-label="Referencias">${T('ejes','＃','Ejes','Traza cada eje con dos clics')}${T('luz','⟷','Luz de viga','Dos clics en las caras de una viga: sus tercios')}${g==='E'?T('viga','═','Viga','Traza una viga por ejes y marca sus apoyos: sale su plantilla en Metrados › Vigas'):''}</span>
      ${csOrtTer()}${dxfOf(ref)?`<label class="chk cnvsh" title="Columnas y caras de vigas del DXF encima de la lámina; el clic se pega a ellas (Alt: no se pega)"><input type="checkbox" data-csz2="dxf"${CSZ.dxf!==false?' checked':''}> DXF</label>`:''}<label class="chk cnvsh"><input type="checkbox" data-cnv="shared"${CNV.shared?' checked':''}> Mover juntas las esquinas compartidas</label>
      <button type="button" class="ib" data-cnv="del"${CNV.sel?'':' disabled'} title="Eliminar el sector elegido">Eliminar sector</button>
      <button type="button" class="ib" data-cnv="copy" title="Copia los sectores de otro nivel">⧉ Copiar de otro nivel…</button><button type="button" class="ib" data-cnv="al" title="Alinea las láminas de los niveles con la referencia">⌖ Alinear niveles…</button>
      <button type="button" class="ib" data-cszv="lam" title="Láminas del nivel: subir o cambiar la lámina, ubicar ambientes">Láminas del nivel</button>
      <span style="flex:1"></span><button type="button" class="ib${CSZ.side?' on':''}" data-csz="side" aria-pressed="${CSZ.side}">▤ Datos</button></div>`:''}`);
  csSet('csszsc',lam?csScaleBadge(lam):'');
  /* panel de datos */
  const sc=csScale(lam);const drawn=ambs.filter(a=>cnvGeo(a,lam));
  const met={};for(const c of csCats(g))met[c.id]=drawn.map(a=>a.met&&a.met[c.id]!=null?+a.met[c.id]:null);
  const E=drawn.length?csSzEval({grp:g,met,ritmo:1,mode:'f'},f,{sec:drawn.map(a=>({P:csUnflat(cnvGeo(a,lam)),n:a.code})),lam}):null;
  const idx=new Map(drawn.map((a,i)=>[a.id,i]));const pc=x=>(x>=0?'+':'')+Math.round(x*100)+' %';
  const m3c=E&&E.cats.find(c=>c.vac&&/m3|m³/i.test(c.und||''));const prog=new Map(ambs.map(a=>[a.id,cnvProg(a.id)]));
  const tot=k=>E?E[k].reduce((s,x)=>s+(x||0),0):0;
  const side=!p?'':`<div class="csfsec"><div class="csfsh"><b>Sectores de ${esc(cnvTag(p,g))}</b><span class="mu">${ambs.length} sector(es)${E&&sc.mpp?' · '+Math.round(tot('A'))+' m²':''}</span></div>
      ${ambs.length?`<table class="t csfst cstab"><thead><tr><th></th><th>Sector</th><th class="n">m²</th><th class="n" title="Σ metrado ÷ rendimiento">Pers·día</th><th class="n">Balance</th><th class="n" title="Vaciado (m³)">m³</th><th class="n" title="Días programados desde mañana">Prog.</th></tr></thead><tbody>
      ${ambs.map((a,j)=>{const i=idx.get(a.id);const has=i!=null;return`<tr class="${a.id===CNV.sel?'on':''}" data-cnvs="${esc(a.id)}"><td><i class="csdot" style="--c:${CS_SCOL[j%CS_SCOL.length]}"></i></td><td><b>${esc(a.code)}</b>${has?'':' <span class="mu">sin dibujo</span>'}</td>
        <td class="n">${has&&E.A[i]!=null?E.A[i].toFixed(1):'—'}</td><td class="n">${has?(Math.round(E.carga[i]*10)/10).toFixed(1):'—'}</td><td class="n">${has&&E.n>1?`<span class="csbal ${csBalCls(E.dev[i])}">${pc(E.dev[i])}</span>`:''}</td><td class="n">${has&&m3c?(Math.round(E.met[m3c.id][i]*10)/10).toFixed(1):'—'}</td><td class="n">${prog.get(a.id)||'—'}</td></tr>`}).join('')}</tbody>
      ${E?`<tfoot><tr><td></td><td>Total</td><td class="n">${sc.mpp?tot('A').toFixed(1):'—'}</td><td class="n">${tot('carga').toFixed(1)}</td><td></td><td class="n">${m3c?(Math.round(E.met[m3c.id].reduce((s,x)=>s+(x||0),0)*10)/10).toFixed(1):'—'}</td><td class="n">${[...prog.values()].reduce((s,x)=>s+x,0)}</td></tr></tfoot>`:''}</table>`:'<p class="mu csfemp">Este nivel no tiene sectores de este frente: dibújalos con «▭ Nuevo» o «÷ Contorno y dividir», aplica una alternativa en Sectores o cópialos de otro nivel.</p>'}</div>
    ${E?csSemTable(E):''}${dxfSec(ref,ed)}${csEjesSec(ref,ed)}${g==='E'?kvpTable(p.id,ed):''}
    <div class="csfsec"><p class="note"><b>Solo cambia ${esc(cnvTag(p,g))}.</b> Lo programado se queda en su sector; al partir, el sector nuevo queda sin programar (prográmalo en Lookahead › Tren). Si vuelves a aplicar la alternativa, te preguntará si reemplaza los niveles ajustados a mano.</p></div>`;
  csSet('csszside',side);csSet('csszf','');document.getElementById('csszb').classList.toggle('noside',!CSZ.side);
  /* plano */
  const host=document.getElementById('csszmap'),hint=document.getElementById('csszhint');const API=window.__plano;
  if(!API||!API.ambMap){host.innerHTML='<div class="kemp">Cargando el plano…</div>';return}
  if(!p){host.innerHTML='<div class="kemp">Casco todavía no tiene niveles.</div>';host._v=null;host._fk='';hint.hidden=true;return}
  if(!lam){host.innerHTML=`<div class="kemp">${esc(p.name)} no tiene lámina de ${g==='A'?'arquitectura':'encofrado'}. ${isAdmin?'<button type="button" class="ib pri" data-cnv="link">Vincular la lámina en Configuración › Casco › Niveles</button>':'El administrador la vincula en Configuración › Casco › Niveles.'}</div>`;host._v=null;host._fk='';hint.hidden=true;cnvCpDraw();cnvAlDraw();return}
  const sel=ambs.find(a=>a.id===CNV.sel)||null;const selG=cnvGeo(sel,lam);const tl=CNV.tool;const gd=csGuides(ref,lam,CSZ.ter!==false);
  const shapes=ambs.map((a,j)=>{const gg=cnvGeo(a,lam);return gg?{id:a.id,kind:'a',pts:gg,c:CS_SCOL[j%CS_SCOL.length],label:a.code+(sc.mpp?` · ${Math.round(csPolyA(csUnflat(gg))*sc.mpp*sc.mpp)} m²`:''),sel:a.id===CNV.sel||a.id===CNV.pend,op:.3,sop:.45}:null}).filter(Boolean);
  const link=CNV.shared?ambs.filter(a=>a!==sel&&cnvGeo(a,lam)).map(a=>({id:a.id,pts:cnvGeo(a,lam)})):[];
  const poly=['cut','np','rd','div','ejes','luz'].includes(tl);const draw=!ed?null:tl==='nr'?'rect':poly?'poly':null;
  const M=csDispM(ref,lam);
  /* vigas desde el plano (casco-met-plano.js): las vinculadas con su tercio central y sus juntas; el trazado en curso */
  const vo=g==='E'?kvpOverlay(p.id):{guides:[],dots:[]};const vt=tl==='viga'?kvpDrawO():{guides:[],dots:[],snap:[]};
  /* plano vectorial (casco-dxf.js): columnas y caras encima de la lámina; al dibujar contornos y luces el clic se pega a ellas */
  const dg=CSZ.dxf!==false?dxfGeo(ref,mp):null;const dsn=dg&&['np','rd','div','luz'].includes(tl);
  const o={pid:CNV.pid,vista:lam.id,shapes,canUp:false,draw:(tl==='viga'||tl==='dxfal')&&ed?'poly':draw,tmp:poly?CNV.tmp:null,M:M||undefined,guides:[...gd.guides,...vo.guides,...vt.guides],dots:[...vo.dots,...vt.dots],paths:dg?dg.paths:null,
    snapLines:(tl==='cut'||tl==='div'||tl==='np'||tl==='rd')?gd.snap.concat(dsn?dg.segs:[]):tl==='viga'?vt.snap:tl==='luz'&&dg?dg.segs:null,snapPts:dsn&&tl!=='luz'?dg.pts:null,ortho:tl==='viga'||tl==='dxfal'?false:CSZ.ortho!==false,
    edit:ed&&!tl&&selG?{pts:selG,link}:null,onEdit:(pts,ch)=>cnvGeoSave(C,sel,pts,ch),
    onDrawn:pts=>{if(tl==='nr'){CNV.tool='';cnvNew(C,pts)}},
    onPoly:pt=>{if(tl==='viga'){kvpClick(pt);return}if(tl==='dxfal'){dxfAlClick(pt);return}CNV.tmp=[...CNV.tmp,pt];const two=CNV.tmp.length===2;if(two&&(tl==='cut'||tl==='ejes'||tl==='luz')){const[a,b]=CNV.tmp;CNV.tmp=[];if(tl==='cut')cnvCut(C,a,b);else if(tl==='ejes'){csEjeAdd(ref,lam,a,b);csNivDraw()}else{csLuzAdd(ref,lam,a,b);csNivDraw()}return}csNivDraw()},
    onPolyClose:()=>{const P=CNV.tmp;CNV.tmp=[];if(P.length<3||!['np','rd','div'].includes(tl)){csNivDraw();return}const pts=csgFlat(P);if(tl==='np'){CNV.tool='';cnvNew(C,pts)}else if(tl==='rd'){CNV.tool='';if(sel)cnvGeoSave(C,sel,pts,null);else csNivDraw()}else cnvDivPop(C,P,M)},
    onPick:hit=>{if(tl==='join'){if(!hit)return;if(!CNV.pend||CNV.pend===hit){CNV.pend=CNV.pend===hit?'':hit;csNivDraw();return}const a=CNV.pend;CNV.pend='';cnvJoin(C,a,hit);return}
      if(tl)return;CNV.sel=hit||'';csNivDraw()}};
  API.ambMap(host,o);if(host._img!==lam.id){host._img=lam.id;API.imgURL(lam,'f').then(()=>{if(document.getElementById('csszmap')===host)csNivDraw()}).catch(()=>{})}
  let t='';const need=ref&&!isRef&&!mp;
  if(tl==='cut')t=CNV.tmp.length?'Toca el segundo punto: la línea se prolonga hasta los bordes del sector.':'Toca dos puntos de una línea que cruce el sector que quieres partir (se pega a los tercios). Esc para salir.';
  else if(tl==='join')t=CNV.pend?'Ahora toca el sector vecino con el que se junta.':'Toca dos sectores vecinos para juntarlos.';
  else if(tl==='nr')t='Arrastra un rectángulo: será un sector nuevo al final del tren.';
  else if(tl==='np'||tl==='rd'||tl==='div')t=(CNV.tmp.length?`${CNV.tmp.length} esquina(s). Cierra tocando la primera, doble clic o Enter.`:tl==='div'?'Dibuja el contorno del nivel (polígono); luego eliges en cuántos sectores partirlo.':tl==='rd'?(sel?`Dibuja de nuevo ${sel.code} (polígono). Lo programado se queda.`:'Primero elige un sector.'):'Toca cada esquina del sector nuevo.')+' ⊥ ortogonal: Mayúscula para un lado libre.';
  else if(tl==='ejes')t=need?'Alinea primero este nivel con la referencia.':CNV.tmp.length?'Segundo clic: el eje queda recto.':'Traza cada eje con dos clics sobre la línea del eje del plano. Se nombran solos (A, B… y 1, 2…).';
  else if(tl==='viga')t=need?'Alinea primero este nivel con la referencia.':kvpHint();
  else if(tl==='dxfal')t=dxfAlHint();
  else if(tl==='luz')t=need?'Alinea primero este nivel con la referencia.':CNV.tmp.length?'Segundo clic en la otra cara de la viga.':'Clic en una cara de la viga y en la otra: salen sus dos tercios.';
  else if(!ambs.length)t=ed?'Este nivel no tiene sectores de este frente: «▭ Nuevo», «÷ Contorno y dividir» o «⧉ Copiar de otro nivel…».':'';
  else if(!drawn.length)t=ed?'Los sectores de este nivel no tienen dibujo en esta lámina: elige uno y «↻ Redibujar», o «⧉ Copiar de otro nivel…».':'';
  else if(sel&&!selG)t=`${sel.code} no tiene dibujo: «↻ Redibujar» para dibujarlo.`;
  else if(sel)t='Esquinas: muévelas una por una. Barra del medio de una cara: mueve toda la cara. Clic derecho en una esquina: agregar o quitar vértices.';
  else if(ed)t='Toca un sector para ajustarlo.';
  hint.innerHTML=(tl==='viga'&&!need?kvpBar():'')+(need&&!CNV.cp&&!CNV.al?`<span class="cnvwarn">⚠ Este nivel usa otra lámina y no está alineado con la referencia (${esc(cnvTag(S.pis.get(ref.pisoId),g))}).</span> ${ed?'<button type="button" class="ib pri" data-cnv="alnow">Alinear ahora</button><br>':''}`:'')+esc(t);hint.hidden=!t&&!need;cnvCpDraw();cnvAlDraw();if(g==='E'){kmEnsure();kvSyncSoon(p.id)}}
/** semáforo como tabla (Indicador · Valor · estado), compartido con el asistente */
function csSemTable(E){return`<div class="csfsec"><div class="csfsh"><b>Semáforo</b><span class="mu">${E.n} sector(es) · ${E.R===1?'1 sector/día':'1 cada 2 días'}</span></div>
  <table class="t cstab cssem"><thead><tr><th>Indicador</th><th>Valor</th><th class="c" aria-label="Estado"></th></tr></thead><tbody>${E.I.map(x=>`<tr><td><b>${x.id}</b> ${esc(x.t)}</td><td>${esc(x.v)}</td><td class="c"><i class="csszd ${x.s}" title="${CSZ_ST[x.s]}"></i></td></tr>`).join('')}</tbody></table></div>`}

/* ---------- guardar ---------- */
function cnvGeoSave(C,sel,pts,ch){if(!sel||!csEd())return;const ops=[];const L=C.lam.id;
  ops.push(op('ambientes',sel.id,{...cnvStrip(sel),geo:{...(sel.geo||{}),[L]:pts}}));
  for(const[id,g]of Object.entries(ch||{})){const a=S.amb.get(id);if(a)ops.push(op('ambientes',id,{...cnvStrip(a),geo:{...(a.geo||{}),[L]:g}}))}
  ops.push(cnvHandOp(C.sec));apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: ajustar ${sel.code}`)}
function cnvCut(C,a,b){if(!csEd())return;const L=C.lam.id;const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const geoP=x=>csUnflat(cnvGeo(x,C.lam));const s=C.ambs.find(x=>cnvGeo(x,C.lam)&&csgPip(geoP(x),m))||C.ambs.find(x=>cnvGeo(x,C.lam)&&csgPip(geoP(x),a))||C.ambs.find(x=>cnvGeo(x,C.lam)&&csgPip(geoP(x),b));
  if(!s||Math.hypot(b.x-a.x,b.y-a.y)<3){toast('Traza la línea dentro del sector que quieres partir.');csNivDraw();return}
  const P=geoP(s);const p1=csgClip(P,a,b,1),p2=csgClip(P,a,b,-1);const A1=p1.length?csPolyA(p1):0,A2=p2.length?csPolyA(p2):0;const At=csPolyA(P);
  if(!p1.length||!p2.length||A1<At*.03||A2<At*.03){toast('La línea tiene que cruzar el sector de lado a lado.');csNivDraw();return}
  /* el que sigue en el tren: el pedazo más cerca del sector anterior conserva el código y lo programado */
  const i=C.ambs.indexOf(s);const prev=C.ambs.slice(0,i).reverse().find(x=>cnvGeo(x,C.lam)),next=C.ambs.slice(i+1).find(x=>cnvGeo(x,C.lam));const ce=csgCen;const d=(P1,Q)=>{const u=ce(P1),v=ce(Q);return Math.hypot(u.x-v.x,u.y-v.y)};
  const first=prev?(d(p1,geoP(prev))<=d(p2,geoP(prev))?p1:p2):next?(d(p1,geoP(next))>=d(p2,geoP(next))?p1:p2):(ce(p1).x+ce(p1).y<=ce(p2).x+ce(p2).y?p1:p2);const second=first===p1?p2:p1;
  const ra=csPolyA(first)/(csPolyA(first)+csPolyA(second));const m1={},m2={};for(const[k,v]of Object.entries(s.met||{})){if(v==null||!(+v>=0)){m1[k]=v;continue}const x=Math.round(+v*ra*100)/100;m1[k]=x;m2[k]=Math.round((+v-x)*100)/100}
  const nid=uid('am');const ns={id:nid,sectorId:s.sectorId,code:'',name:'',order:0,met:m2,geo:{[L]:csgFlat(second)}};if(s.ksec)ns.ksec=s.ksec;
  const list=C.ambs.slice();list.splice(i+1,0,ns);const R=cnvRenum(list,C.g,C.f);const ops=[];const geoNew=new Map([[s.id,csgFlat(first)]]);
  /* las esquinas del corte entran también en el borde del vecino (así siguen pegados al ajustar) */
  const nv=first.concat(second).filter(q=>!P.some(r=>Math.hypot(r.x-q.x,r.y-q.y)<.6));
  for(const o of C.ambs){if(o===s)continue;const g0=cnvGeo(o,C.lam);if(!g0)continue;let Q=csUnflat(g0),ch=false;for(const q of nv){if(Q.some(r=>Math.hypot(r.x-q.x,r.y-q.y)<.6))continue;for(let j=0;j<Q.length;j++){if(cnvOnSeg(q,Q[j],Q[(j+1)%Q.length],.8)!=null){Q.splice(j+1,0,{...q});ch=true;break}}}if(ch)geoNew.set(o.id,csgFlat(Q))}
  const oldCode=s.code;
  for(const{a:x,code,order}of R){const base=x===ns?cnvStrip(ns):cnvStrip(x);const o={...base,code,name:'Sector '+code,order};if(x===s)o.met=m1;if(geoNew.has(x.id))o.geo={...(x.geo||{}),[L]:geoNew.get(x.id)};
    if(x===ns){ops.push(op('ambientes',nid,o));continue}if(canon(o)!==canon(cnvStrip(x)))ops.push(op('ambientes',x.id,o))}
  ops.push(cnvHandOp(C.sec));const nc=R.find(r=>r.a===ns).code,sc2=R.find(r=>r.a===s).code;
  apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: partir ${oldCode}`);CNV.tool='';CNV.sel=nid;
  toast(`${oldCode} partido en ${sc2} y ${nc}: ${sc2} conserva su programación; ${nc} queda sin programar (prográmalo en Lookahead › Tren).${R.length>i+2?' Los siguientes se renumeran.':''}`,'Deshacer',undo)}
async function cnvJoin(C,idA,idB){if(!csEd())return;const A=S.amb.get(idA),B=S.amb.get(idB);if(!A||!B)return;const gA=cnvGeo(A,C.lam),gB=cnvGeo(B,C.lam);if(!gA||!gB){csNivDraw();return}
  const sc=csScale(C.lam);const tol=Math.max(.8,(csgBB(csUnflat(gA)).w+csgBB(csUnflat(gB)).w)*.004);const Un=cnvUnion(csUnflat(gA),csUnflat(gB),tol);
  if(!Un||Un.length<3){toast('Solo se juntan sectores vecinos (que comparten un borde).');csNivDraw();return}
  const[keep,gone]=C.ambs.indexOf(A)<C.ambs.indexOf(B)?[A,B]:[B,A];const t=todayIso();
  const acts=[...S.act.values()].filter(x=>!x.arch&&!x._del&&x.ambId===gone.id);const fut=d=>d>t||isAdmin;
  const nFut=acts.reduce((n,x)=>n+(x.days||[]).filter(fut).length,0),nPast=acts.reduce((n,x)=>n+(x.days||[]).filter(d=>!fut(d)).length,0);
  const ar=sc.mpp?Math.round(csPolyA(Un)*sc.mpp*sc.mpp):null;
  const ok=await uiAsk({title:`¿Juntar ${keep.code} y ${gone.code}?`,list:[`Queda un solo sector, ${keep.code}${ar!=null?`, de ${ar} m²`:''}.`,nFut?`Los ${nFut} día(s) programados de ${gone.code} desde mañana pasan a ${keep.code} (misma partida, mismos días).`:`${gone.code} no tiene nada programado desde mañana.`,
      nPast?`${gone.code} tiene ${nPast} día(s) de hoy o anteriores: se conserva solo como historia (no se dibuja ni se ofrece para programar).`:`${gone.code} se archiva (se recupera con Deshacer).`,'Los siguientes se renumeran. Solo cambia este nivel.'],ok:'Juntar',tone:'warn'});
  if(!ok){csNivDraw();return}
  const ops=[];const L=C.lam.id;const zMod=new Map();const keepActs=[...S.act.values()].filter(x=>!x.arch&&!x._del&&x.ambId===keep.id);
  for(const y of acts){const fd=(y.days||[]).filter(fut),pd=(y.days||[]).filter(d=>!fut(d));if(!fd.length)continue;
    let z=keepActs.find(q=>ctKey(q)===ctKey(y));
    if(z){const cur=zMod.get(z.id)||{...cnvStrip(z),days:(z.days||[]).slice(),...(z.qty?{qty:{...z.qty}}:{})};cur.days=[...new Set([...cur.days,...fd])].sort();if(y.qty){cur.qty=cur.qty||{};fd.forEach(d=>{if(y.qty[d]!=null)cur.qty[d]=(+cur.qty[d]||0)+(+y.qty[d])})}zMod.set(z.id,cur);
      if(pd.length){const o={...cnvStrip(y),days:pd};if(y.qty){o.qty={};pd.forEach(d=>{if(y.qty[d]!=null)o.qty[d]=y.qty[d]})}ops.push(op('acts',y.id,o))}else{const a=arc('acts',y.id);if(a)ops.push(a)}}
    else if(pd.length){const o={...cnvStrip(y),days:pd};const n={...cnvStrip(y),ambId:keep.id,days:fd};if(y.qty){o.qty={};n.qty={};pd.forEach(d=>{if(y.qty[d]!=null)o.qty[d]=y.qty[d]});fd.forEach(d=>{if(y.qty[d]!=null)n.qty[d]=y.qty[d]})}ops.push(op('acts',y.id,o),op('acts',uid('a'),n))}
    else ops.push(op('acts',y.id,{...cnvStrip(y),ambId:keep.id}))}
  for(const[id,o]of zMod)ops.push(op('acts',id,o));
  const met={...(keep.met||{})};for(const[k,v]of Object.entries(gone.met||{}))if(v!=null&&+v>=0)met[k]=Math.round(((+met[k]||0)+(+v))*100)/100;
  const rest=C.ambs.filter(x=>x!==gone);const R=cnvRenum(rest,C.g,C.f);
  for(const{a:x,code,order}of R){const o={...cnvStrip(x),code,name:'Sector '+code,order};if(x===keep){o.geo={...(keep.geo||{}),[L]:csgFlat(Un)};o.met=met}if(canon(o)!==canon(cnvStrip(x)))ops.push(op('ambientes',x.id,o))}
  if(nPast){const g2={...(gone.geo||{})};delete g2[L];ops.push(op('ambientes',gone.id,{...cnvStrip(gone),geo:g2,fus:keep.id}))}else{const a=arc('ambientes',gone.id);if(a)ops.push(a)}
  ops.push(cnvHandOp(C.sec));const kc=R.find(r=>r.a===keep).code;
  apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: juntar ${keep.code} y ${gone.code}`);CNV.tool='';CNV.sel=keep.id;toast(`Juntados en ${kc}.`,'Deshacer',undo)}

/* ---------- copiar de otro nivel con dos puntos ---------- */
function cnvSim(s,t){if(s.length<2||t.length<2)return null;const[s1,s2]=s,[t1,t2]=t;const dx=s2.x-s1.x,dy=s2.y-s1.y,ex=t2.x-t1.x,ey=t2.y-t1.y;const d=dx*dx+dy*dy;if(d<1e-6)return null;
  const a=(ex*dx+ey*dy)/d,b=(ey*dx-ex*dy)/d;return{k:Math.hypot(a,b),rot:Math.atan2(b,a)*180/Math.PI,f:p=>({x:Math.round((t1.x+a*(p.x-s1.x)-b*(p.y-s1.y))*10)/10,y:Math.round((t1.y+b*(p.x-s1.x)+a*(p.y-s1.y))*10)/10})}}
function cnvCpOpen(){const C=cnvCtx();if(!C.lam){toast('Este nivel no tiene lámina: vincúlala en Configuración › Casco › Niveles.');return}
  const src=C.LV.filter(q=>q.id!==CNV.pid).find(q=>{const l=csLamOf(q.id,C.g);return l&&cnvAmbs(cnvSec(q.id,C.g,C.fid)).some(a=>cnvGeo(a,l))});
  if(!src){toast('Ningún otro nivel de este frente tiene sectores dibujados.');return}CNV.cp={src:src.id,s:[],t:[]};CNV.tool='';csNivDraw()}
/** transformación de la copia: los dos puntos de cada lado o, si los dos niveles están alineados con la referencia, la de la alineación */
function cnvCpT(K,C){const T0=cnvSim(K.s,K.t);if(T0)return T0;if(K.s.length||K.t.length)return null;const ref=csRefLam(C.f,C.g);const mS=csMap(ref,csLamOf(K.src,C.g)),mT=csMap(ref,C.lam);if(!mS||!mT)return null;
  const F=csCmpT(mT,csInvT(mS));return{k:Math.hypot(F.a,F.b),rot:Math.atan2(F.b,F.a)*180/Math.PI,auto:true,f:p=>{const q=csAp(F,p);return{x:Math.round(q.x*10)/10,y:Math.round(q.y*10)/10}}}}
function cnvCpDraw(){let box0=document.getElementById('cnvcp');if(!CNV.cp){if(box0&&box0.dataset.k!=='al')box0.remove();return}if(box0&&box0.dataset.k==='al'){box0.remove();box0=null}const C=cnvCtx();const API=window.__plano;
  let box=box0;if(!box){const mp=document.querySelector('#cssz .csfmap');if(!mp)return;box=document.createElement('div');box.className='cnvcp';box.id='cnvcp';
    box.innerHTML=`<div class="cnvcph" id="cnvcph"></div><div class="cnvcpb"><div class="cnvcpm"><span class="cnvcpl" id="cnvcpls"></span><div class="cssmap" id="cnvA"></div></div><div class="cnvcpm"><span class="cnvcpl" id="cnvcplt"></span><div class="cssmap" id="cnvB"></div></div></div><div class="cnvcpf" id="cnvcpf"></div>`;mp.appendChild(box)}
  const K=CNV.cp,g=C.g;const ps=S.pis.get(K.src);const lamS=csLamOf(K.src,g),lamT=C.lam;const As=cnvAmbs(cnvSec(K.src,g,C.fid)).filter(a=>cnvGeo(a,lamS));const T0=cnvCpT(K,C);
  const ss=csScale(lamS).mpp,st=csScale(lamT).mpp;const exp=ss&&st?ss/st:null;const okK=T0&&exp?Math.abs(T0.k/exp-1)<.03:null;
  const stp=(n,t,on,done)=>`<span class="cnvst${on?' on':''}${done?' done':''}"><b>${done?'✓':n}</b>${t}</span>`;const ns=K.s.length,nt=K.t.length;
  csSet('cnvcph',`<b>Copiar la sectorización</b><label class="cssml">De<select data-cnv="cpsrc">${C.LV.filter(q=>q.id!==CNV.pid).map(q=>{const l=csLamOf(q.id,g);const n=l?cnvAmbs(cnvSec(q.id,g,C.fid)).filter(a=>cnvGeo(a,l)).length:0;return n?`<option value="${q.id}"${q.id===K.src?' selected':''}>${esc(cnvTag(q,g))} · ${esc(q.name)} (${n})</option>`:''}).join('')}</select></label><span class="mu">a <b>${esc(cnvTag(C.p,g))} · ${esc(C.p.name)}</b></span><span style="flex:1"></span>${stp(1,'2 puntos en el origen',ns<2,ns===2)}${stp(2,'los mismos 2 en el destino',ns===2&&nt<2,nt===2)}${stp(3,'revisar y copiar',nt===2,false)}`);
  csSet('cnvcpls',`Origen · ${esc(cnvTag(ps,g))}`);csSet('cnvcplt',`Destino · ${esc(cnvTag(C.p,g))}`);
  csSet('cnvcpf',`${!T0?`<span>${ns<2?`Toca dos puntos fáciles de reconocer en el origen (un cruce de ejes, la esquina de una columna). Punto ${ns+1} de 2.`:`Toca <b>los mismos dos puntos</b> en el destino, en el mismo orden. Punto ${nt+1} de 2.`} <span class="mu">Rueda o pellizco para acercar; arrastra para mover la lámina.</span></span>`
      :T0.auto?'<span class="csszok">✓ Los dos niveles están alineados con la referencia: la copia cae en su sitio.</span><span class="mu">Si quieres, marca dos puntos en cada plano para hacerlo a mano.</span>':`<span>Escala <b>${T0.k.toFixed(3)}</b> · giro <b>${T0.rot.toFixed(1)}°</b></span>${okK==null?'<span class="mu">Sin calibrar las dos láminas no se puede revisar la escala.</span>':okK?'<span class="csszok">✓ coincide con la calibración de las dos láminas</span>':`<span class="csszwarn">⚠ la calibración daría ${exp.toFixed(3)}: revisa los puntos</span>`}<span class="mu">Arrastra los puntos para afinar.</span>`}
    <span style="flex:1"></span><button type="button" class="ib" data-cnv="cpreset">Empezar de nuevo</button><button type="button" class="ib" data-cnv="cpx">Cancelar</button><button type="button" class="ib pri" data-cnv="cpok"${T0?'':' disabled'}>Copiar a ${esc(cnvTag(C.p,g))}</button>`);
  if(!API||!API.ambMap||!lamS)return;
  const hA=document.getElementById('cnvA'),hB=document.getElementById('cnvB');
  const mk=(P,c)=>P.length?{tmp:P,edit:{pts:csgFlat(P),noMid:true}}:{};
  API.ambMap(hA,{pid:K.src,vista:lamS.id,canUp:false,shapes:As.map((a,j)=>({id:'s'+a.id,kind:'a',pts:cnvGeo(a,lamS),c:CS_SCOL[j%CS_SCOL.length],label:a.code,op:.28})),...mk(K.s),
    onEdit:pts=>{K.s=csUnflat(pts);cnvCpDraw()},onPick:(h,w)=>{if(K.s.length>=2){toast('Ya hay dos puntos: arrástralos para afinar o «Empezar de nuevo».');return}K.s=[...K.s,{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10}];cnvCpDraw()}});
  const prev=T0?As.map((a,j)=>({id:'p'+a.id,kind:'a',pts:csgFlat(csUnflat(cnvGeo(a,lamS)).map(T0.f)),c:CS_SCOL[j%CS_SCOL.length],label:a.code,op:.32})):C.ambs.filter(a=>cnvGeo(a,lamT)).map((a,j)=>({id:'t'+a.id,kind:'a',pts:cnvGeo(a,lamT),c:'#888780',label:a.code,op:.12,dim:true}));
  API.ambMap(hB,{pid:CNV.pid,vista:lamT.id,canUp:false,shapes:prev,...mk(K.t),
    onEdit:pts=>{K.t=csUnflat(pts);cnvCpDraw()},onPick:(h,w)=>{if(K.s.length<2){toast('Primero los dos puntos del origen.');return}if(K.t.length>=2){toast('Ya hay dos puntos: arrástralos para afinar o «Empezar de nuevo».');return}K.t=[...K.t,{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10}];cnvCpDraw()}});
  for(const[h,l]of[[hA,lamS],[hB,lamT]])if(h._img!==l.id){h._img=l.id;API.imgURL(l,'f').then(()=>cnvCpDraw()).catch(()=>{})}}
function cnvCpDo(){const K=CNV.cp;const C=cnvCtx();if(!K||!csEd())return;const g=C.g;const lamS=csLamOf(K.src,g),lamT=C.lam;const T0=cnvCpT(K,C);if(!T0||!lamS||!lamT)return;
  const As=cnvAmbs(cnvSec(K.src,g,C.fid)).filter(a=>cnvGeo(a,lamS));const ops=[];let sec=C.sec;
  if(!sec){const p=C.p;sec=cnvSecEnsure(C,ops)}
  else ops.push(cnvHandOp(sec));
  const cur=C.ambs;const used=new Set([...S.act.values()].filter(x=>!x.arch&&!x._del).map(x=>x.ambId));let keep=0;
  As.forEach((a,i)=>{const geo=csgFlat(csUnflat(cnvGeo(a,lamS)).map(T0.f));const o=cur[i];
    if(o){ops.push(op('ambientes',o.id,{...cnvStrip(o),code:a.code,name:a.name||('Sector '+a.code),order:i+1,geo:{...(o.geo||{}),[lamT.id]:geo}}))}
    else{const n={sectorId:sec.id,code:a.code,name:a.name||('Sector '+a.code),order:i+1,met:{...(a.met||{})},geo:{[lamT.id]:geo}};if(a.ksec)n.ksec=a.ksec;ops.push(op('ambientes',uid('am'),n))}});
  for(const o of cur.slice(As.length)){if(used.has(o.id)){keep++;continue}const a=arc('ambientes',o.id);if(a)ops.push(a)}
  const had=cur.some(a=>cnvGeo(a,lamT));CNV.cp=null;
  apply(ops,`Sectores de ${cnvTag(C.p,g)}: copiar de ${cnvTag(S.pis.get(K.src),g)}`);
  toast(`${As.length} sector(es) copiados de ${cnvTag(S.pis.get(K.src),g)} a ${cnvTag(C.p,g)}${had?' (reemplazan el dibujo anterior; lo programado se queda en su sector)':''}${keep?` · ${keep} sobrante(s) con actividades quedan`:''}. Ajústalos si hace falta.`,'Deshacer',undo)}

/* ---------- eventos (los llama csSzClick / csSzChange de casco-sz.js) ---------- */
function csNivClick(e){const root=document.getElementById('cssz');if(!root||root.dataset.v!=='niv')return false;const t=e.target;
  if(kvpOnClick(e)||dxfOnClick(e))return true;
  const pb=t.closest('[data-cnvp]');if(pb){if(KVP.step)kvpStop();CNV.pid=pb.dataset.cnvp;CNV.sel='';CNV.tmp=[];CNV.pend='';if(CNV.cp){CNV.cp.t=[];if(CNV.cp.src===CNV.pid)CNV.cp=null}csNivDraw();return true}
  const tb=t.closest('[data-cnvt]');if(tb){if(tb.dataset.cnvt==='viga'){if(CNV.tool==='viga')kvpStop();else kvpStart(CNV.pid);CNV.sel='';csNivDraw();return true}if(KVP.step)kvpStop();CNV.tool=tb.dataset.cnvt;CNV.tmp=[];CNV.pend='';if(CNV.tool)CNV.sel='';csNivDraw();return true}
  const sr=t.closest('[data-cnvs]');if(sr){CNV.sel=sr.dataset.cnvs;CNV.tool='';const a=S.amb.get(CNV.sel);const C=cnvCtx();const g0=cnvGeo(a,C.lam);csNivDraw();if(g0&&window.__plano&&window.__plano.ambFocus)window.__plano.ambFocus(document.getElementById('csszmap'),g0);return true}
  const b=t.closest('[data-cnv]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return false;const k=b.dataset.cnv;
  if(k==='copy')cnvCpOpen();else if(k==='cpx'){CNV.cp=null;csNivDraw()}else if(k==='cpreset'){CNV.cp.s=[];CNV.cp.t=[];cnvCpDraw()}else if(k==='cpok')cnvCpDo();
  else if(k==='del')cnvDel();else if(k==='al'){CNV.cp=null;CNV.al={list:true};csNivDraw()}else if(k==='alnow'){CNV.cp=null;cnvAlOpen(CNV.pid)}else if(k==='alx'){CNV.al=null;csNivDraw()}
  else if(k==='algo')cnvAlOpen(b.dataset.p);else if(k==='alreset'){CNV.al.s=[];CNV.al.t=[];cnvAlDraw()}else if(k==='alok')cnvAlSave();else if(k==='allist'){CNV.al={list:true};cnvAlDraw()}
  else if(k==='link'){U.tab='cfg';U.cfgV='cas';saveUI();render()}return true}
function csNivChange(e){const root=document.getElementById('cssz');if(!root||root.dataset.v!=='niv')return false;const t=e.target;const k=t.dataset.cnv;if(!k)return false;
  if(k==='shared'){CNV.shared=t.checked;csNivDraw();return true}
  if(k==='alstr'&&CNV.al){CNV.al.str=t.checked;cnvAlDraw();return true}
  if(k==='cpsrc'&&CNV.cp){CNV.cp={src:t.value,s:[],t:[]};cnvCpDraw();return true}return false}
document.addEventListener('keydown',e=>{if(U.tab!=='planos'||!CS())return;const root=document.getElementById('cssz');if(!root||root.dataset.v!=='niv')return;if(document.querySelector('.uask'))return;
  if(e.key==='Enter'&&CNV.tmp.length>=3){e.preventDefault();const h=document.getElementById('csszmap');if(h&&h._o&&h._o.onPolyClose)h._o.onPolyClose();return}
  if(e.key==='Escape'&&KVP.step){kvpOnClick({target:{closest:()=>({dataset:{kvp:'cancel'}})}});return}
  if(e.key==='Escape'&&(CNV.tool||CNV.tmp.length||CNV.pend||CNV.sel||CNV.cp||CNV.al)){if(CNV.al)CNV.al=null;else if(CNV.cp)CNV.cp=null;else if(CNV.tmp.length)CNV.tmp=[];else{CNV.tool='';CNV.pend='';CNV.sel=''}csNivDraw()}
  if((e.key==='Delete'||e.key==='Backspace')&&CNV.sel&&!CNV.tool&&!/^(INPUT|SELECT|TEXTAREA)$/.test((e.target||{}).tagName||'')){e.preventDefault();cnvDel()}});

/* ---------- sectorizar el nivel desde cero: nuevo, dividir, eliminar ---------- */
/** grupo de sectores del nivel para el frente (lo crea si no existe, como csSecApply) */
function cnvSecEnsure(C,ops){if(C.sec)return C.sec;const p=C.p,g=C.g;const sid=p.id+'-'+g.toLowerCase()+(C.f?'-'+String(C.f.code||C.f.id).toLowerCase():'');
  if(S.sec.has(sid))return S.sec.get(sid);const gn=g==='A'?'Albañilería':'Estructura';const d={pisoId:p.id,code:g==='A'?'A':'E',name:C.f?gn+' · '+(C.f.name||C.f.code):gn,grp:g,order:g==='A'?3:1,hand:{t:NOW(),by:me.email}};if(C.f)d.fr=C.f.id;ops.push(op('sectors',sid,d));return{id:sid,...d}}
const cnvPre=C=>(C.ambs.map(a=>String(a.code||'').replace(/\d+$/,'')).find(Boolean))||(C.f&&C.f.code)||(C.g==='A'?'A':'S');
function cnvNew(C,pts){if(!csEd())return;const ops=[];const sec=cnvSecEnsure(C,ops);if(C.sec)ops.push(cnvHandOp(C.sec));const n=C.ambs.length+1;const code=cnvPre(C)+n;const id=uid('am');
  ops.push(op('ambientes',id,{sectorId:sec.id,code,name:'Sector '+code,order:n,met:{},geo:{[C.lam.id]:pts}}));apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: nuevo ${code}`);CNV.sel=id;
  toast(`${code} creado al final del tren. Prográmalo en Lookahead › Tren.`,'Deshacer',undo)}
/** contorno → N sectores de igual área (cortes en pantalla: verticales u horizontales tal como se ve la lámina) */
function cnvDivPop(C,P,M){const host=document.getElementById('csszmap');const row=(d,t)=>`<div class="ph">${t}</div><div class="pmr csszdv">${[2,3,4,5,6,8].map(n=>`<button data-do="d" data-n="${n}" data-dir="${d}">${n}</button>`).join('')}</div>`;
  openPop(host,row('v','Cortes verticales (de izquierda a derecha)')+row('h','Cortes horizontales (de arriba hacia abajo)')+'<hr><button data-do="x">Cancelar</button>',{d:ds=>cnvDivide(C,P,M,+ds.n,ds.dir),x:()=>{CNV.tool='';csNivDraw()}})}
function cnvDivide(C,P,M,n,dir){if(!csEd())return;const T=M||csI,Ti=csInvT(T);const D=P.map(p=>csAp(T,p));const J=csgDivide(D,n,dir);let L=csgPieces(D,J);
  L.sort((p,q)=>{const a=csgCen(p),b=csgCen(q);return dir==='v'?(a.x-b.x)||(a.y-b.y):(a.y-b.y)||(a.x-b.x)});L=L.map(Q=>Q.map(p=>csAp(Ti,p)));
  const ops=[];const sec=cnvSecEnsure(C,ops);if(C.sec)ops.push(cnvHandOp(C.sec));const pre=cnvPre(C);const used=new Set([...S.act.values()].filter(x=>!x.arch&&!x._del).map(x=>x.ambId));let keep=0;
  L.forEach((Q,i)=>{const code=pre+(i+1);const o=C.ambs[i];const geo=csgFlat(Q);if(o)ops.push(op('ambientes',o.id,{...cnvStrip(o),code,name:'Sector '+code,order:i+1,geo:{...(o.geo||{}),[C.lam.id]:geo}}));else ops.push(op('ambientes',uid('am'),{sectorId:sec.id,code,name:'Sector '+code,order:i+1,met:{},geo:{[C.lam.id]:geo}}))});
  for(const o of C.ambs.slice(L.length)){if(used.has(o.id)){keep++;const g2={...(o.geo||{})};delete g2[C.lam.id];ops.push(op('ambientes',o.id,{...cnvStrip(o),geo:g2}));continue}const a=arc('ambientes',o.id);if(a)ops.push(a)}
  CNV.tool='';apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: ${L.length} sectores de igual área`);
  toast(`${L.length} sectores de igual área. Los que ya existían se reutilizan en orden con lo programado.${keep?` ${keep} sobrante(s) con actividades quedan sin dibujo: júntalos o mueve sus actividades.`:''}`,'Deshacer',undo)}
/** eliminar un sector: sus días desde mañana pasan al vecino (el anterior en el tren o, si es el primero, el siguiente) */
async function cnvDel(){const C=cnvCtx();const s=C.ambs.find(a=>a.id===CNV.sel);if(!s||!csEd())return;const i=C.ambs.indexOf(s);const nb=C.ambs[i-1]||C.ambs[i+1]||null;const t=todayIso();const fut=d=>d>t||isAdmin;
  const acts=[...S.act.values()].filter(x=>!x.arch&&!x._del&&x.ambId===s.id);const nFut=acts.reduce((n,x)=>n+(x.days||[]).filter(fut).length,0),nPast=acts.reduce((n,x)=>n+(x.days||[]).filter(d=>!fut(d)).length,0);
  if(nFut&&!nb){toast(`${s.code} tiene días programados y no hay otro sector al que pasarlos: muévelos primero en Lookahead › Tren.`);return}
  const ok=await uiAsk({title:`¿Eliminar ${s.code}?`,list:[nFut?`Sus ${nFut} día(s) programados desde mañana pasan a ${nb.code} (misma partida, mismos días).`:`${s.code} no tiene nada programado desde mañana.`,nPast?`Tiene ${nPast} día(s) de hoy o anteriores: se conserva solo como historia.`:'Se archiva (se recupera con Deshacer).','Los siguientes se renumeran. Solo cambia este nivel.'],ok:'Eliminar',tone:'warn'});if(!ok)return;
  const ops=[];if(nFut){const keepActs=[...S.act.values()].filter(x=>!x.arch&&!x._del&&x.ambId===nb.id);const zMod=new Map();
    for(const y of acts){const fd=(y.days||[]).filter(fut),pd=(y.days||[]).filter(d=>!fut(d));if(!fd.length)continue;const z=keepActs.find(q=>ctKey(q)===ctKey(y));
      if(z){const cur=zMod.get(z.id)||{...cnvStrip(z),days:(z.days||[]).slice(),...(z.qty?{qty:{...z.qty}}:{})};cur.days=[...new Set([...cur.days,...fd])].sort();zMod.set(z.id,cur);if(pd.length)ops.push(op('acts',y.id,{...cnvStrip(y),days:pd}));else{const a=arc('acts',y.id);if(a)ops.push(a)}}
      else if(pd.length)ops.push(op('acts',y.id,{...cnvStrip(y),days:pd}),op('acts',uid('a'),{...cnvStrip(y),ambId:nb.id,days:fd}));else ops.push(op('acts',y.id,{...cnvStrip(y),ambId:nb.id}))}
    for(const[id,o]of zMod)ops.push(op('acts',id,o))}
  const rest=C.ambs.filter(x=>x!==s);for(const{a:x,code,order}of cnvRenum(rest,C.g,C.f)){const o={...cnvStrip(x),code,name:'Sector '+code,order};if(canon(o)!==canon(cnvStrip(x)))ops.push(op('ambientes',x.id,o))}
  if(nPast){const g2={...(s.geo||{})};delete g2[C.lam.id];ops.push(op('ambientes',s.id,{...cnvStrip(s),geo:g2,fus:nb?nb.id:'-'}))}else{const a=arc('ambientes',s.id);if(a)ops.push(a)}
  ops.push(cnvHandOp(C.sec));CNV.sel='';apply(ops,`Sectores de ${cnvTag(C.p,C.g)}: eliminar ${s.code}`);toast(`${s.code} eliminado.`,'Deshacer',undo)}

/* ---------- alinear niveles con la lámina de referencia (1 o 2 puntos; se guarda en laminas.al) ---------- */
function cnvAlOpen(pid){const C=cnvCtx();const ref=csRefLam(C.f,C.g);const lam=csLamOf(pid,C.g);if(!ref||!lam){toast('Falta la lámina de referencia o la de este nivel.');return}if(ref.id===lam.id){toast('Este nivel es la referencia.');return}
  CNV.al={pid,s:[],t:[],str:true};csNivDraw()}
function cnvAlT(K,ref,lam){const n=Math.min(K.s.length,K.t.length);if(!n||K.s.length!==K.t.length)return null;const[s1,s2]=K.s,[t1,t2]=K.t;let a,b;
  if(n===1){const ms=csScale(ref).mpp,mt=csScale(lam).mpp;a=ms&&mt?ms/mt:(lam.w&&ref.w?lam.w/ref.w:1);b=0}else{const dx=s2.x-s1.x,dy=s2.y-s1.y,ex=t2.x-t1.x,ey=t2.y-t1.y;const d=dx*dx+dy*dy;if(d<1e-6)return null;a=(ex*dx+ey*dy)/d;b=(ey*dx-ex*dy)/d}
  return{a,b,e:t1.x-(a*s1.x-b*s1.y),f:t1.y-(b*s1.x+a*s1.y),n}}
function cnvAlSave(){const K=CNV.al;const C=cnvCtx();const ref=csRefLam(C.f,C.g);const lam=K&&csLamOf(K.pid,C.g);const T=K&&cnvAlT(K,ref,lam);if(!T||!csEd())return;
  csLamSet(lam,{al:{ref:ref.id,a:T.a,b:T.b,e:T.e,f:T.f,n:T.n,rev:lam.rev??null,t:NOW(),by:me.email}});CNV.al={list:true};
  toast(`${cnvTag(S.pis.get(K.pid),C.g)} alineado: se ve derecho, a la escala y en el sitio de la referencia, con sus ejes y tercios.`);csNivDraw()}
function cnvAlDraw(){const box0=document.getElementById('cnvcp');const K=CNV.al;if(!K){if(box0&&box0.dataset.k==='al')box0.remove();return}if(CNV.cp)return;const C=cnvCtx();const API=window.__plano;const ref=csRefLam(C.f,C.g);const g=C.g;
  let box=box0;const mp=document.querySelector('#cssz .csfmap');if(!mp)return;
  if(K.list){if(!box||box.dataset.k!=='al'||!box.querySelector('.cnval')){if(box)box.remove();box=document.createElement('div');box.className='cnvcp cnvall';box.id='cnvcp';box.dataset.k='al';box.innerHTML='<div class="cnval" id="cnval"></div>';mp.appendChild(box)}
    const rows=C.LV.map(q=>{const l=csLamOf(q.id,g);const st=!l?'<span class="cnvtg none">sin lámina</span>':ref&&l.id===ref.id?'<span class="cnvtg ref">referencia</span>':ref&&ref.plb&&l.plb&&ref.plb.id===l.plb.id?'<span class="cnvtg ok">✓ mismo plano</span>':csMap(ref,l)?'<span class="cnvtg ok">✓ alineado</span>':l.al&&!csAlOk(l)?'<span class="cnvtg hand">⚠ cambió la revisión</span>':'<span class="cnvtg hand">⚠ falta alinear</span>';
      const can=l&&ref&&l.id!==ref.id&&!(ref.plb&&l.plb&&ref.plb.id===l.plb.id);return`<tr><td><b>${esc(cnvTag(q,g))}</b> ${esc(q.name)}</td><td>${l?esc((l.plb&&l.plb.cod)||l.name||''):'—'}</td><td>${st}</td><td>${can&&csEd()?`<button type="button" class="ib${csMap(ref,l)?'':' pri'}" data-cnv="algo" data-p="${esc(q.id)}">${csMap(ref,l)?'Volver a alinear':'Alinear'}</button>`:''}</td></tr>`}).join('');
    csSet('cnval',`<div class="card cnvalc"><div class="csfsh"><b>Alinear los niveles con la referencia${ref?' ('+esc(cnvTag(S.pis.get(ref.pisoId),g))+')':''}</b><span style="flex:1"></span><button type="button" class="ib" data-cnv="alx">Cerrar</button></div>
      <p class="note">Se hace una vez por lámina. Con los niveles alineados se ven derechos y a la misma escala, los ejes y los tercios aparecen en su sitio, «Aplicar a niveles» dibuja también en los de otra lámina y copiar entre niveles es inmediato.</p>
      <table class="t cstab"><thead><tr><th>Nivel</th><th>Lámina</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`);return}
  if(!box||box.dataset.k!=='al'||!box.querySelector('#cnvA')){if(box)box.remove();box=document.createElement('div');box.className='cnvcp';box.id='cnvcp';box.dataset.k='al';
    box.innerHTML=`<div class="cnvcph" id="cnvcph"></div><div class="cnvcpb"><div class="cnvcpm"><span class="cnvcpl" id="cnvcpls"></span><div class="cssmap" id="cnvA"></div></div><div class="cnvcpm"><span class="cnvcpl" id="cnvcplt"></span><div class="cssmap" id="cnvB"></div></div></div><div class="cnvcpf" id="cnvcpf"></div>`;mp.appendChild(box)}
  const lam=csLamOf(K.pid,g);if(!lam||!ref){CNV.al=null;box.remove();return}const T=cnvAlT(K,ref,lam);const ns=K.s.length,nt=K.t.length;const pr=S.pis.get(ref.pisoId),pt=S.pis.get(K.pid);
  const ss=csScale(ref).mpp,st=csScale(lam).mpp;const exp=ss&&st?ss/st:null;const k=T?Math.hypot(T.a,T.b):0;const okK=T&&T.n===2&&exp?Math.abs(k/exp-1)<.03:null;
  const stp=(n,t,on,done)=>`<span class="cnvst${on?' on':''}${done?' done':''}"><b>${done?'✓':n}</b>${t}</span>`;
  csSet('cnvcph',`<b>Alinear ${esc(cnvTag(pt,g))} con la referencia ${esc(cnvTag(pr,g))}</b><button type="button" class="ib" data-cnv="allist">Todos los niveles</button><span style="flex:1"></span>${stp(1,'1 o 2 puntos en la referencia',ns===nt&&!T,ns>0)}${stp(2,'los mismos en '+esc(cnvTag(pt,g)),ns>nt,!!T)}${stp(3,'revisar y guardar',!!T,false)}`);
  csSet('cnvcpls',`Referencia · ${esc(cnvTag(pr,g))}`);csSet('cnvcplt',`${esc(cnvTag(pt,g))}${T&&K.str?' · enderezado':''}`);
  csSet('cnvcpf',`${!T?`<span>${ns===nt?`En la referencia toca un punto fácil de reconocer, de preferencia un <b>cruce de ejes</b>${(ref.ejes||[]).length?' (se pega a los cruces de los ejes trazados)':''}: ${ns?'el segundo':'el primero'}. Con 2 puntos se ajusta posición, escala y giro; con 1, solo la posición.`:`Toca <b>el mismo punto</b> en ${esc(cnvTag(pt,g))}.`} <span class="mu">Rueda o pellizco para acercar; arrastra para mover la lámina.</span></span>`
      :`<span>${T.n===1?'1 punto: escala por la calibración, sin giro':`Escala <b>${k.toFixed(3)}</b> · giro <b>${(Math.atan2(T.b,T.a)*180/Math.PI).toFixed(1)}°</b>`}</span>${okK==null?'':okK?'<span class="csszok">✓ coincide con la calibración</span>':`<span class="csszwarn">⚠ la calibración daría ${exp.toFixed(3)}: revisa los puntos</span>`}<label class="chk cnvsh"><input type="checkbox" data-cnv="alstr"${K.str?' checked':''}> Ver enderezado</label><span class="mu">${K.str?'Así se verá: derecho, a la escala y en el sitio de la referencia. Los ejes deben caer sobre los del plano.':'Arrastra los puntos para afinar.'}</span>`}
    <span style="flex:1"></span><button type="button" class="ib" data-cnv="alreset">Empezar de nuevo</button><button type="button" class="ib" data-cnv="alx">Cancelar</button><button type="button" class="ib pri" data-cnv="alok"${T?'':' disabled'}>Guardar alineación</button>`);
  if(!API||!API.ambMap)return;const hA=document.getElementById('cnvA'),hB=document.getElementById('cnvB');const gr=csGuides(ref,ref,false).guides;
  const cross=()=>{const E=(ref.ejes||[]).filter(e=>Array.isArray(e.p)&&e.p.length===4);const isV=e=>Math.abs(e.p[2]-e.p[0])<Math.abs(e.p[3]-e.p[1]);const out=[];
    for(const v of E.filter(isV))for(const h of E.filter(e=>!isV(e))){const a={x:v.p[0],y:v.p[1]},b={x:v.p[2],y:v.p[3]},c={x:h.p[0],y:h.p[1]},d={x:h.p[2],y:h.p[3]};const t=csgSegT(a,b,c,d);if(t!=null)out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})}return out};
  const snapX=w=>{const z=hA._v&&hA._v.z||1;let best=null,bd=14/z;for(const c of cross()){const d=Math.hypot(c.x-w.x,c.y-w.y);if(d<bd){bd=d;best=c}}return best?{x:Math.round(best.x*10)/10,y:Math.round(best.y*10)/10}:{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10}};
  const mk=P=>P.length?{tmp:P,edit:{pts:csgFlat(P),noMid:true}}:{};
  API.ambMap(hA,{pid:ref.pisoId,vista:ref.id,canUp:false,shapes:[],guides:gr,...mk(K.s),onEdit:pts=>{K.s=csUnflat(pts).map(snapX);cnvAlDraw()},
    onPick:(h,w)=>{if(K.s.length>K.t.length){toast(`Ahora el mismo punto en ${cnvTag(pt,g)}.`);return}if(K.s.length>=2){toast('Ya hay dos puntos: arrástralos para afinar o «Empezar de nuevo».');return}K.s=[...K.s,snapX(w)];cnvAlDraw()}});
  const showStr=T&&K.str;const Tm=T?{a:T.a,b:T.b,e:T.e,f:T.f}:null;
  const gB=T?csGuidesM(ref,Tm,CSZ.ter!==false).guides:[];
  API.ambMap(hB,{pid:K.pid,vista:lam.id,canUp:false,shapes:[],guides:gB,M:showStr?csInvT(Tm):undefined,...(showStr?{}:mk(K.t)),onEdit:pts=>{K.t=csUnflat(pts);cnvAlDraw()},
    onPick:(h,w)=>{if(showStr)return;if(K.t.length>=K.s.length){toast('Primero el punto en la referencia.');return}K.t=[...K.t,{x:Math.round(w.x*10)/10,y:Math.round(w.y*10)/10}];cnvAlDraw()}});
  for(const[h,l]of[[hA,ref],[hB,lam]])if(h._img!==l.id){h._img=l.id;API.imgURL(l,'f').then(()=>cnvAlDraw()).catch(()=>{})}}
