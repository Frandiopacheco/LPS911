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

/* ---------- dibujo ---------- */
function csNivDraw(){const C=cnvCtx(),{f,g,fid,LV,p,sec,lam,ambs}=C;const ed=csEd();
  const lvChip=q=>{const s=cnvSec(q.id,g,fid);const A=cnvAmbs(s);const l=csLamOf(q.id,g);const nd=A.filter(a=>cnvGeo(a,l)).length;
    return`<button type="button" class="cnvlv${q.id===CNV.pid?' on':''}" data-cnvp="${esc(q.id)}"><b>${esc(cnvTag(q,g))}</b> ${esc(q.name)}${s&&s.hand?'<span class="cnvtg hand">ajustado a mano</span>':''}${!l?'<span class="cnvtg none">sin lámina</span>':A.length&&!nd?'<span class="cnvtg none">sin dibujo</span>':''}<small>${A.length?`${A.length} sector${A.length>1?'es':''}${nd&&nd<A.length?` · ${nd} dibujados`:''}`:'sin sectores'}</small></button>`};
  csSet('csszh',`<div class="csszr">${csFrs().map(x=>`<button type="button" class="ib${x.id===CSZ.fr?' on':''}" data-cszf="${esc(x.id)}"><i class="csdot" style="--c:${esc(x.color||'#888')}"></i>${esc(x.name)}</button>`).join('')}
      <span class="seg" role="group" aria-label="Grupo">${['E','A'].map(k=>`<button type="button" data-cszg="${k}" class="${g===k?'on':''}">${k==='E'?'Estructura':'Albañilería'}</button>`).join('')}</span>
      <span class="cnvlvs" role="group" aria-label="Nivel">${LV.map(lvChip).join('')}</span></div>
    ${ed&&lam&&ambs.length?`<div class="csszr"><span class="seg" role="group" aria-label="Herramienta"><button type="button" data-cnvt="" class="${!CNV.tool?'on':''}" title="Elige un sector y arrastra sus esquinas o sus caras">✋ Ajustar</button><button type="button" data-cnvt="cut" class="${CNV.tool==='cut'?'on':''}" title="Traza una línea que cruce un sector">✂ Partir</button><button type="button" data-cnvt="join" class="${CNV.tool==='join'?'on':''}" title="Toca dos sectores vecinos">⊕ Juntar</button></span>
      <label class="chk cnvsh"><input type="checkbox" data-cnv="shared"${CNV.shared?' checked':''}> Mover juntas las esquinas compartidas</label>
      <button type="button" class="ib" data-cnv="copy" title="Copia los sectores de otro nivel alineando con dos puntos">⧉ Copiar de otro nivel…</button>
      <button type="button" class="ib" data-cszv="lam" title="Láminas del nivel: subir o cambiar la lámina, ubicar ambientes">Láminas del nivel</button>
      <span style="flex:1"></span><button type="button" class="ib${CSZ.side?' on':''}" data-csz="side" aria-pressed="${CSZ.side}">▤ Datos</button></div>`
    :ed&&lam?`<div class="csszr"><button type="button" class="ib" data-cnv="copy">⧉ Copiar de otro nivel…</button><button type="button" class="ib" data-cszv="lam">Láminas del nivel</button></div>`:''}`);
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
      ${E?`<tfoot><tr><td></td><td>Total</td><td class="n">${sc.mpp?tot('A').toFixed(1):'—'}</td><td class="n">${tot('carga').toFixed(1)}</td><td></td><td class="n">${m3c?(Math.round(E.met[m3c.id].reduce((s,x)=>s+(x||0),0)*10)/10).toFixed(1):'—'}</td><td class="n">${[...prog.values()].reduce((s,x)=>s+x,0)}</td></tr></tfoot>`:''}</table>`:'<p class="mu csfemp">Este nivel no tiene sectores de este frente. Aplica una alternativa en Sectores o cópialos de otro nivel.</p>'}</div>
    ${E?csSemTable(E):''}
    <div class="csfsec"><p class="note"><b>Solo cambia ${esc(cnvTag(p,g))}.</b> Lo programado se queda en su sector; al partir, el sector nuevo queda sin programar (prográmalo en Lookahead › Tren). Si vuelves a aplicar la alternativa, te preguntará si reemplaza los niveles ajustados a mano.</p></div>`;
  csSet('csszside',side);csSet('csszf','');document.getElementById('csszb').classList.toggle('noside',!CSZ.side);
  /* plano */
  const host=document.getElementById('csszmap'),hint=document.getElementById('csszhint');const API=window.__plano;
  if(!API||!API.ambMap){host.innerHTML='<div class="kemp">Cargando el plano…</div>';return}
  if(!p){host.innerHTML='<div class="kemp">Casco todavía no tiene niveles.</div>';host._v=null;host._fk='';hint.hidden=true;return}
  if(!lam){host.innerHTML=`<div class="kemp">${esc(p.name)} no tiene lámina de ${g==='A'?'arquitectura':'encofrado'}. Vincúlala en Configuración › Casco › Niveles.</div>`;host._v=null;host._fk='';hint.hidden=true;cnvCpDraw();return}
  const sel=ambs.find(a=>a.id===CNV.sel)||null;const selG=cnvGeo(sel,lam);const tl=CNV.tool;
  const shapes=ambs.map((a,j)=>{const gg=cnvGeo(a,lam);return gg?{id:a.id,kind:'a',pts:gg,c:CS_SCOL[j%CS_SCOL.length],label:a.code+(sc.mpp?` · ${Math.round(csPolyA(csUnflat(gg))*sc.mpp*sc.mpp)} m²`:''),sel:a.id===CNV.sel||a.id===CNV.pend,op:.3,sop:.45}:null}).filter(Boolean);
  const link=CNV.shared?ambs.filter(a=>a!==sel&&cnvGeo(a,lam)).map(a=>({id:a.id,pts:cnvGeo(a,lam)})):[];
  const o={pid:CNV.pid,vista:lam.id,shapes,canUp:false,draw:ed&&tl==='cut'?'poly':ed&&!tl&&sel&&!selG?'rect':null,tmp:tl==='cut'?CNV.tmp:null,
    edit:ed&&!tl&&selG?{pts:selG,link}:null,onEdit:(pts,ch)=>cnvGeoSave(C,sel,pts,ch),
    onDrawn:pts=>cnvGeoSave(C,sel,pts,null),onPoly:pt=>{CNV.tmp=[...CNV.tmp,pt];if(CNV.tmp.length===2){const[a,b]=CNV.tmp;CNV.tmp=[];cnvCut(C,a,b)}else csNivDraw()},onPolyClose:()=>{CNV.tmp=[];csNivDraw()},
    onPick:hit=>{if(tl==='join'){if(!hit)return;if(!CNV.pend||CNV.pend===hit){CNV.pend=CNV.pend===hit?'':hit;csNivDraw();return}const a=CNV.pend;CNV.pend='';cnvJoin(C,a,hit);return}
      if(tl)return;CNV.sel=hit||'';csNivDraw()}};
  API.ambMap(host,o);if(host._img!==lam.id){host._img=lam.id;API.imgURL(lam,'f').then(()=>{if(document.getElementById('csszmap')===host)csNivDraw()}).catch(()=>{})}
  let t='';if(!ambs.length)t=ed?'Este nivel no tiene sectores de este frente: aplica una alternativa en Sectores o usa «⧉ Copiar de otro nivel…».':'';
  else if(!drawn.length)t=ed?'Los sectores de este nivel no tienen dibujo en esta lámina: usa «⧉ Copiar de otro nivel…» o elige uno en la tabla y dibújalo.':'';
  else if(tl==='cut')t=CNV.tmp.length?'Toca el segundo punto: la línea se prolonga hasta los bordes del sector.':'Toca dos puntos de una línea que cruce el sector que quieres partir. Esc para salir.';
  else if(tl==='join')t=CNV.pend?'Ahora toca el sector vecino con el que se junta.':'Toca dos sectores vecinos para juntarlos.';
  else if(sel&&!selG)t=`Arrastra un rectángulo para dibujar ${sel.code}.`;
  else if(sel)t='Esquinas: muévelas una por una. Barra del medio de una cara: mueve toda la cara. Doble clic en un borde: agrega una esquina.';
  else if(ed)t='Toca un sector para ajustarlo.';
  hint.textContent=t;hint.hidden=!t;cnvCpDraw()}
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
function cnvCpDraw(){const box0=document.getElementById('cnvcp');if(!CNV.cp){if(box0)box0.remove();return}const C=cnvCtx();const API=window.__plano;
  let box=box0;if(!box){const mp=document.querySelector('#cssz .csfmap');if(!mp)return;box=document.createElement('div');box.className='cnvcp';box.id='cnvcp';
    box.innerHTML=`<div class="cnvcph" id="cnvcph"></div><div class="cnvcpb"><div class="cnvcpm"><span class="cnvcpl" id="cnvcpls"></span><div class="cssmap" id="cnvA"></div></div><div class="cnvcpm"><span class="cnvcpl" id="cnvcplt"></span><div class="cssmap" id="cnvB"></div></div></div><div class="cnvcpf" id="cnvcpf"></div>`;mp.appendChild(box)}
  const K=CNV.cp,g=C.g;const ps=S.pis.get(K.src);const lamS=csLamOf(K.src,g),lamT=C.lam;const As=cnvAmbs(cnvSec(K.src,g,C.fid)).filter(a=>cnvGeo(a,lamS));const T0=cnvSim(K.s,K.t);
  const ss=csScale(lamS).mpp,st=csScale(lamT).mpp;const exp=ss&&st?ss/st:null;const okK=T0&&exp?Math.abs(T0.k/exp-1)<.03:null;
  const stp=(n,t,on,done)=>`<span class="cnvst${on?' on':''}${done?' done':''}"><b>${done?'✓':n}</b>${t}</span>`;const ns=K.s.length,nt=K.t.length;
  csSet('cnvcph',`<b>Copiar la sectorización</b><label class="cssml">De<select data-cnv="cpsrc">${C.LV.filter(q=>q.id!==CNV.pid).map(q=>{const l=csLamOf(q.id,g);const n=l?cnvAmbs(cnvSec(q.id,g,C.fid)).filter(a=>cnvGeo(a,l)).length:0;return n?`<option value="${q.id}"${q.id===K.src?' selected':''}>${esc(cnvTag(q,g))} · ${esc(q.name)} (${n})</option>`:''}).join('')}</select></label><span class="mu">a <b>${esc(cnvTag(C.p,g))} · ${esc(C.p.name)}</b></span><span style="flex:1"></span>${stp(1,'2 puntos en el origen',ns<2,ns===2)}${stp(2,'los mismos 2 en el destino',ns===2&&nt<2,nt===2)}${stp(3,'revisar y copiar',nt===2,false)}`);
  csSet('cnvcpls',`Origen · ${esc(cnvTag(ps,g))}`);csSet('cnvcplt',`Destino · ${esc(cnvTag(C.p,g))}`);
  csSet('cnvcpf',`${!T0?`<span>${ns<2?`Toca dos puntos fáciles de reconocer en el origen (un cruce de ejes, la esquina de una columna). Punto ${ns+1} de 2.`:`Toca <b>los mismos dos puntos</b> en el destino, en el mismo orden. Punto ${nt+1} de 2.`} <span class="mu">Rueda o pellizco para acercar; arrastra para mover la lámina.</span></span>`
      :`<span>Escala <b>${T0.k.toFixed(3)}</b> · giro <b>${T0.rot.toFixed(1)}°</b></span>${okK==null?'<span class="mu">Sin calibrar las dos láminas no se puede revisar la escala.</span>':okK?'<span class="csszok">✓ coincide con la calibración de las dos láminas</span>':`<span class="csszwarn">⚠ la calibración daría ${exp.toFixed(3)}: revisa los puntos</span>`}<span class="mu">Arrastra los puntos para afinar.</span>`}
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
function cnvCpDo(){const K=CNV.cp;const C=cnvCtx();if(!K||!csEd())return;const g=C.g;const lamS=csLamOf(K.src,g),lamT=C.lam;const T0=cnvSim(K.s,K.t);if(!T0||!lamS||!lamT)return;
  const As=cnvAmbs(cnvSec(K.src,g,C.fid)).filter(a=>cnvGeo(a,lamS));const ops=[];let sec=C.sec;
  if(!sec){const p=C.p;const sid=p.id+'-'+g.toLowerCase()+(C.f?'-'+String(C.f.code||C.f.id).toLowerCase():'');const gn=g==='A'?'Albañilería':'Estructura';const d={pisoId:p.id,code:g==='A'?'A':'E',name:C.f?gn+' · '+(C.f.name||C.f.code):gn,grp:g,order:g==='A'?3:1,hand:{t:NOW(),by:me.email}};if(C.f)d.fr=C.f.id;ops.push(op('sectors',sid,d));sec={id:sid,...d}}
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
  const pb=t.closest('[data-cnvp]');if(pb){CNV.pid=pb.dataset.cnvp;CNV.sel='';CNV.tmp=[];CNV.pend='';if(CNV.cp){CNV.cp.t=[];if(CNV.cp.src===CNV.pid)CNV.cp=null}csNivDraw();return true}
  const tb=t.closest('[data-cnvt]');if(tb){CNV.tool=tb.dataset.cnvt;CNV.tmp=[];CNV.pend='';if(CNV.tool)CNV.sel='';csNivDraw();return true}
  const sr=t.closest('[data-cnvs]');if(sr){CNV.sel=sr.dataset.cnvs;CNV.tool='';const a=S.amb.get(CNV.sel);const C=cnvCtx();const g0=cnvGeo(a,C.lam);csNivDraw();if(g0&&window.__plano&&window.__plano.ambFocus)window.__plano.ambFocus(document.getElementById('csszmap'),g0);return true}
  const b=t.closest('[data-cnv]');if(!b||b.tagName==='SELECT'||b.tagName==='INPUT')return false;const k=b.dataset.cnv;
  if(k==='copy')cnvCpOpen();else if(k==='cpx'){CNV.cp=null;csNivDraw()}else if(k==='cpreset'){CNV.cp.s=[];CNV.cp.t=[];cnvCpDraw()}else if(k==='cpok')cnvCpDo();return true}
function csNivChange(e){const root=document.getElementById('cssz');if(!root||root.dataset.v!=='niv')return false;const t=e.target;const k=t.dataset.cnv;if(!k)return false;
  if(k==='shared'){CNV.shared=t.checked;csNivDraw();return true}
  if(k==='cpsrc'&&CNV.cp){CNV.cp={src:t.value,s:[],t:[]};cnvCpDraw();return true}return false}
document.addEventListener('keydown',e=>{if(U.tab!=='planos'||!CS())return;const root=document.getElementById('cssz');if(!root||root.dataset.v!=='niv')return;if(document.querySelector('.uask'))return;
  if(e.key==='Escape'&&(CNV.tool||CNV.tmp.length||CNV.pend||CNV.sel||CNV.cp)){if(CNV.cp)CNV.cp=null;else{CNV.tool='';CNV.tmp=[];CNV.pend='';CNV.sel=''}csNivDraw()}});
