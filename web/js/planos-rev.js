"use strict";
/* LPS 911 · Planos › revisiones de una planta digitalizada (17-11-2026, etapa 3 de «Planta digitalizada», decidido con el dueño;
   docs/ia/planos.md «Planta digitalizada» etapa 3).
   - Historial (`plh`): lo de Alistar de una revisión que deja de ser la vigente (correcciones `fix`, contorno `ctn`, revisados `alc`,
     ambientes `amb`, decisiones `amd`) se copia en un documento propio, en el mismo lote que la revisión nueva. Antes iba dentro de
     `plb.revs` (límite de 1 MB) y el contorno y los revisados se perdían. `revs[].h` apunta a la copia. Lo antiguo (`revs[].fix`) se sigue leyendo.
   - Revisión nueva: las correcciones, el contorno y el registro de ambientes de la última revisión con correcciones pasan solos, llevados
     por los cruces de ejes con el mismo nombre (`palRevFit`). Cada corrección se verifica contra el dibujo nuevo; las que ya vienen o ya
     no aplican quedan anotadas. La revisión sigue «Por alistar»: hay que revisarla y marcarla lista.
   - Ambientes con id estable (`plb.amb {rev, L:[{id, n, a (m²), x, y (px de esa revisión)}]}`): se asignan al marcar listo. Van en px de
     cada revisión y los metros se calculan con la malla vigente (decisión del dueño: así un cambio de malla no corre nada guardado).
     Con una revisión nueva, la lista de diferencias (nuevos, eliminados, con otra área) se decide uno por uno (`plb.amd`). */

/* ---------- historial ---------- */
const PLH_K=['fix','ctn','alc','amb','amd'];
/** lo de Alistar de la revisión vigente de p (null si no hay nada que guardar) */
function plHistOf(p){if(!p||p.eto)return null;const rv=p.rev||1;const o={};for(const k of PLH_K){const v=p[k];if(v&&v.rev===rv)o[k]=v}
  if(p.ok&&p.ok.rev===rv&&p.ok.chk)o.okChk=p.ok.chk;return Object.keys(o).length?o:null}
/** agrega al lote B la copia de lo de Alistar de la revisión vigente de p; devuelve el id de la copia o '' */
function plHistPut(B,p,why){const o=plHistOf(p);if(!o)return'';const id=`${p.id}_r${p.rev||1}_${NOW().toString(36)}`;
  B.set(fcol('plh').doc(id),{plb:p.id,rev:p.rev||1,base:p.base||'',...o,why:why||'',t:NOW(),by:me.email});return id}
/** `ok` de una revisión que pasa al historial: sin los revisados (quedan en la copia) */
const plHistOk=(ok,h)=>{if(!ok||!h||!ok.chk)return ok;const{chk,...r}=ok;return r};
const PLH=new Map();
function plHistGet(id){if(!id)return Promise.resolve(null);let e=PLH.get(id);if(e)return e.pr;e={d:undefined};
  e.pr=fcol('plh').doc(id).get().then(s=>{e.d=s.exists?s.data():null;return e.d}).catch(err=>{PLH.delete(id);throw err});PLH.set(id,e);return e.pr}
/** la copia ya leída, o undefined mientras se lee (y la pide) */
function plHistNow(id){if(!id)return null;const e=PLH.get(id);if(e&&e.d!==undefined)return e.d;if(!e)plHistGet(id).then(()=>requestRender()).catch(()=>{});return undefined}
/** lo de Alistar de una revisión anterior: de su copia (`h`) o, si es de antes, de `revs[].fix` */
async function plRevData(r){if(!r)return null;if(r.h){const d=await plHistGet(r.h);if(d)return d}return r.fix?{fix:r.fix}:null}

/* ---------- de una revisión a otra por los ejes ---------- */
const PLR_TOL=0.05;   /* m: residuo máximo de los cruces de ejes */
/** semejanza px de la revisión anterior → px de la nueva por los cruces de ejes del mismo nombre (sin la malla). Los ejes de la anterior
    van con sus correcciones; los de la nueva, con los cambios de nombre de la anterior. → {T, n, res (m)} o {err} */
function palRevFit(G0,d0,fix0,G1,d1){if(!G0||!G1||!d0||!d1)return{err:'Falta la geometría de alguna de las dos revisiones.'};
  const R0=dxfRolesFix(G0,d0.lay||{},d0.mpp,fix0);const nm=((fix0&&fix0.L)||[]).filter(f=>f.k==='ejRen'||f.k==='ejDel');
  const R1=dxfRolesFix(G1,d1.lay||{},d1.mpp,{L:nm});const X1=new Map();for(const q of palCross(R1.ej)){X1.set(q.v+'|'+q.h,q);X1.set(q.h+'|'+q.v,q)}   /* girada 90°: los verticales pasan a horizontales */const P=[],Q=[];
  for(const q of palCross(R0.ej)){const r=X1.get(q.v+'|'+q.h);if(r){P.push({x:q.x,y:q.y});Q.push({x:r.x,y:r.y})}}
  if(P.length<3)return{err:`Las dos revisiones tienen ${P.length} cruce(s) de ejes con el mismo nombre (hacen falta 3).`};
  const tol=PLR_TOL/d1.mpp;let I=P.map((x,i)=>i),T=palFit(P,Q);
  const worst=(T,ix)=>ix.map(i=>{const q=palAp(T,P[i]);return{i,d:Math.hypot(q.x-Q[i].x,q.y-Q[i].y)}}).sort((a,b)=>b.d-a.d)[0];
  for(;;){const w=T&&worst(T,I);if(!w||w.d<=tol||I.length<=3||(I.length-1)*2<=P.length)break;I=I.filter(i=>i!==w.i);T=palFit(I.map(i=>P[i]),I.map(i=>Q[i]))}
  const w=T&&worst(T,I);if(!simOk(T)||!w)return{err:'No se pudo calcular cómo calzan las dos revisiones.'};
  if(w.d>tol)return{err:`Los ejes de las dos revisiones no calzan: quedan a ${(w.d*d1.mpp*100).toFixed(1)} cm (máximo ${PLR_TOL*100} cm). ¿Se movieron o se renombraron los ejes?`};
  return{T:{a:T.a,b:T.b,e:T.e,f:T.f},n:I.length,de:P.length,res:Math.round(w.d*d1.mpp*1000)/1000}}
const plr2=v=>Math.round(v*100)/100;
const palTP=(T,P)=>{const o=[];for(let i=0;i+1<P.length;i+=2){const q=simAp(T,{x:P[i],y:P[i+1]});o.push(plr2(q.x),plr2(q.y))}return o};
/** una corrección sobre una línea sin nombre (descartarla o nombrarla eje) se pega a esa línea del dibujo nuevo (Alistar la reconoce a 1 px) */
function palLinSnap(g,S,tol){const d=(p,q)=>Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]),Math.abs(p[2]-q[2]),Math.abs(p[3]-q[3]));let b=null,bd=tol;
  for(const l of S||[]){const v=Math.min(d(l.p,g.p),d(l.p,[g.p[2],g.p[3],g.p[0],g.p[1]]));if(v<bd){bd=v;b=l}}if(b)g.p=b.p.slice();return!!b}
/** correcciones de la revisión anterior llevadas a la nueva (T) y verificadas contra su dibujo (G1, d1) → {L, no:[{k, t, why}]} */
function palFixCarry(fix0,T,rv0,G1,d1){const L0=(fix0&&fix0.L)||[];const mpp=d1.mpp;
  /* las reglas (planos-forma.js, sin coordenadas) se aplican antes: un colDel sobre una columna que agregó una regla sigue valiendo */
  const RG=typeof DXF_REGLAS!=='undefined'?L0.filter(f=>DXF_REGLAS.includes(f.k)):[];const R=RG.length?dxfRolesFix(G1,d1.lay||{},mpp,{L:RG}):dxfRoles(G1,d1.lay||{},mpp);const ej=new Set(R.ej.map(e=>e.n));
  const amb=R.amb.slice();const L=[],no=[];const skip=(f,why)=>no.push({k:f.k,t:palFixTxt(f,mpp),why});const tol=0.05/mpp;
  for(const f of L0){const g={...f,id:uid('fx'),de:{rev:rv0,id:f.id||''}};if(Array.isArray(f.p))g.p=palTP(T,f.p);
    if(typeof f.x==='number'&&typeof f.y==='number'){const q=simAp(T,{x:f.x,y:f.y});g.x=plr2(q.x);g.y=plr2(q.y)}
    const cen=g.p&&g.p.length>=6?dxfCen(g.p):null;
    switch(f.k){
      case'ejRen':if(!ej.has(f.n)){skip(f,ej.has(f.a)?'ya viene con ese nombre':'el eje ya no está');continue}ej.delete(f.n);ej.add(f.a);break;
      case'ejDel':case'ejSet':if(!ej.has(f.n)){skip(f,'el eje ya no está');continue}if(f.k==='ejDel')ej.delete(f.n);break;
      case'ejAdd':if(!f.lin&&ej.has(f.n)){skip(f,'ya viene en el plano');continue}if(f.lin&&!palLinSnap(g,R.S,tol)){skip(f,'la línea ya no está');continue}ej.add(f.n);break;
      case'linIgn':if(!palLinSnap(g,R.S,tol)){skip(f,'la línea ya no está');continue}break;
      case'colDel':if(!R.col.some(q=>dxfPip(q.p,g.x,g.y))){skip(f,'la columna ya no está');continue}break;
      case'colDelSz':if(!R.col.some(q=>{const z=dxfSz(q.p,mpp);return Math.abs(z[0]-f.w)<0.006&&Math.abs(z[1]-f.h)<0.006})){skip(f,'ya no hay columnas de ese tamaño');continue}break;
      case'colAdd':if(cen&&R.col.some(q=>dxfPip(q.p,cen.x,cen.y))){skip(f,'ya viene en el plano');continue}break;
      case'txDel':if(!R.tx.some(t=>Math.hypot(t.x-g.x,t.y-g.y)<=tol)){skip(f,'el rótulo ya no está');continue}break;
      case'ambRen':case'ambDel':{const a=dxfAmbAt(amb,g.x,g.y);if(!a){skip(f,'el ambiente ya no está');continue}
        if(f.k==='ambRen'&&fold(String(a.n||'')).trim()===fold(String(f.a||'')).trim()){skip(f,'ya viene con ese nombre');continue}break}
      case'ambAdd':if(cen){const a=dxfAmbAt(R.amb,cen.x,cen.y);const ar=palArea(g.p);if(a&&Math.abs(palArea(a.p)-ar)<=ar*0.1){skip(f,'ya viene en el plano');continue}}amb.push({p:g.p,n:f.a||''});break}
    L.push(g)}
  return{L,no}}
/** contorno de la revisión anterior llevado a la nueva; el área se recalcula */
function palCtnCarry(c,T,rv0,rv1,mpp){if(!c||!Array.isArray(c.P))return null;const P=palTP(T,c.P),H=(c.H||[]).map(h=>({p:palTP(T,h.p)}));
  const a=(palArea(P)-H.reduce((t,h)=>t+palArea(h.p),0))*mpp*mpp;return{...c,P,H,a:Math.round(a*100)/100,rev:rv1,de:rv0,t:NOW(),by:me.email}}
/** registro de ambientes armado de la geometría (revisiones listas antes de esta etapa: ids nuevos) */
function palAmbReg(R,mpp){return(R.amb||[]).map(q=>{const ip=palInPt(q.p,R.amb);return ip?{id:uid('pa'),n:q.n||'',a:Math.round(palArea(q.p)*mpp*mpp*100)/100,x:plr2(ip.x),y:plr2(ip.y)}:null}).filter(Boolean)}
/** ambientes y decisiones llevados por una transformación de px (x' = f·x + o): «Recalcular el calce», unir con el PDF */
function plAmbScale(o,f,ox,oy){if(!o||!Array.isArray(o.L))return o;return{...o,L:o.L.map(r=>typeof r.x==='number'?{...r,x:plr2(r.x*f+(ox||0)),y:plr2(r.y*f+(oy||0))}:r)}}

/** la última revisión anterior con algo de Alistar para pasar (DXF, con correcciones o copia en el historial) */
function palCarrySrc(p){return(p.revs||[]).slice().reverse().find(r=>r.dxf&&(r.h||(r.fix&&r.fix.L&&r.fix.L.length)))||null}
/** ya tiene algo propio en la revisión vigente (no se pasa encima) */
const palHasOwn=d=>{const rv=d.rev||1;return['fix','ctn','amb'].some(k=>d[k]&&d[k].rev===rv)};
/** ya está listo: no se le pasa nada encima (quedaría «Listo» con correcciones que nadie revisó) */
const palOkRev=d=>!!(d.ok&&d.ok.rev===(d.rev||1));
/** pasa a la revisión vigente del plano `id` lo de Alistar de la anterior. o.same = {data} (otro DXF en la misma revisión: mismo PDF, mismas
    coordenadas). Escribe en una transacción y no hace nada si la revisión ya tiene correcciones propias. → {n, no, ctn, amb, de} o {err} o {skip} */
async function palCarry(id,o){o=o||{};const ref=fcol('plb').doc(id);const s=await ref.get();if(!s.exists)return{skip:1};const p={id,...s.data()};
  if(!p.dxf||p.eto||palHasOwn(p)||palOkRev(p))return{skip:1};const rv=p.rev||1;let H,T,rv0,G1;
  try{G1=await plGeoGet(plSpecOf(p));}catch(e){return{err:'No se pudo leer la geometría del DXF nuevo.'}}if(!G1)return{err:'No se pudo leer la geometría del DXF nuevo.'};
  if(!o.same&&p.dxfH&&p.dxfH.rev===rv){try{const d=await plHistGet(p.dxfH.h);if(d)o={...o,same:d}}catch(e){return{err:'No se pudo leer la copia del DXF anterior.'}}}
  if(o.same){H=o.same;rv0=rv;T={a:1,b:0,e:0,f:0}}
  else{const r=palCarrySrc(p);if(!r)return{skip:1};rv0=r.rev;try{H=await plRevData(r)}catch(e){return{err:'No se pudo leer el historial de la Rev. '+r.rev}}if(!H)return{skip:1};
    let G0;try{G0=await plGeoGet(plSpecOf(p,r.rev))}catch(e){G0=null}
    const F=palRevFit(G0,r.dxf,H.fix,G1,p.dxf);if(F.err)return{err:F.err,de:rv0};T=F.T}
  const fx=H.fix&&H.fix.L&&H.fix.L.length?palFixCarry(H.fix,T,rv0,G1,p.dxf):{L:[],no:[]};
  const ct=H.ctn?palCtnCarry(H.ctn,T,rv0,rv,p.dxf.mpp):null;
  let reg=H.amb&&Array.isArray(H.amb.L)?H.amb.L:null;
  if(!reg&&!o.same){const r=palCarrySrc(p);try{const G0=await plGeoGet(plSpecOf(p,r.rev));if(G0)reg=palAmbReg(dxfRolesFix(G0,r.dxf.lay||{},r.dxf.mpp,H.fix),r.dxf.mpp)}catch(e){}}
  const u={};const de={rev:rv0,t:NOW(),by:me.email,...(o.same?{dxf:1}:{}),no:fx.no.slice(0,80)};
  if(fx.L.length||fx.no.length)u.fix={rev:rv,L:fx.L,de};if(ct)u.ctn=ct;
  if(reg&&reg.length)u.amb={rev:rv,de:{rev:rv0,...(o.same?{dxf:1}:{})},t:NOW(),L:reg.map(x=>{const q=simAp(T,{x:x.x,y:x.y});return{...x,x:plr2(q.x),y:plr2(q.y)}})};
  if(!Object.keys(u).length)return{skip:1};
  try{await db.runTransaction(async tx=>{const sn=await tx.get(ref);const d=sn.data();if(!d||(d.rev||1)!==rv||palHasOwn(d)||palOkRev(d))throw new Error('skip');tx.update(ref,u)})}
  catch(e){if(e.message==='skip')return{skip:1};return{err:'No se pudo guardar: '+(e.code||e.message)}}
  return{n:fx.L.length,no:fx.no,ctn:!!ct,amb:u.amb?u.amb.L.length:0,de:rv0}}
/** aviso al terminar de pasar (carga masiva o botón) */
function palCarryMsg(cod,r){if(!r||r.skip)return'';if(r.err)return`${cod}: no se pasaron las correcciones${r.de?` de la Rev. ${r.de}`:''}: ${r.err} Revísalo en Alistar.`;
  const t=[r.n?`${r.n} corrección(es)`:'',r.ctn?'el contorno':'',r.amb?`${r.amb} ambiente(s)`:''].filter(Boolean).join(', ');
  return`${cod}: pasaron ${t||'los datos'} de la Rev. ${r.de}${r.no&&r.no.length?` (${r.no.length} ya no aplican)`:''}. Revísalo en Alistar y márcalo listo.`}

/* ---------- ambientes con id ---------- */
/** reparte los ids del registro L entre los ambientes `amb` (el más chico que contiene su punto) según las decisiones `amd`
    → {ids: Map(ambiente → id), used: Set(id)} */
function palAmbMatch(L,amb,amd){const ids=new Map(),used=new Set(),D=(amd&&amd.L)||[];const otro=new Set(D.filter(d=>d.k==='otro'||d.k==='del').map(d=>d.id));
  for(const d of D)if(d.k==='same'){const a=dxfAmbAt(amb,d.x,d.y);if(a&&!ids.has(a)&&!used.has(d.id)){ids.set(a,d.id);used.add(d.id)}}
  for(const r of L||[]){if(used.has(r.id)||otro.has(r.id))continue;const a=dxfAmbAt(amb,r.x,r.y);if(a&&!ids.has(a)){ids.set(a,r.id);used.add(r.id)}}
  return{ids,used}}
/** umbral de «otra área» (decisión del dueño): 3 % o 0,5 m², el mayor */
const palAreaDif=(a0,a1)=>Math.abs(a1-a0)>=Math.max(0.03*a0,0.5);
const palAmd=p=>p&&p.amd&&p.amd.rev===(p.rev||1)?p.amd:{rev:(p&&p.rev)||1,L:[]};
const palAmbOf=p=>p&&p.amb&&p.amb.rev===(p.rev||1)?p.amb:null;
/** diferencias de ambientes con la revisión anterior (solo si el registro viene de otra revisión) → {rows, pend, de} o null */
function palAmbDiff(p,R,mpp){const reg=palAmbOf(p);if(!reg||!reg.de)return null;const amd=palAmd(p);const amb=R.amb||[];const{ids,used}=palAmbMatch(reg.L,amb,amd);const D=amd.L;
  const has=(k,id)=>D.some(d=>d.k===k&&d.id===id);const rows=[];const ar=a=>palArea(a.p)*mpp*mpp;
  for(const r of reg.L){const a=[...ids].find(([,v])=>v===r.id);
    if(a){const a1=ar(a[0]);if(D.some(x=>x.k==='same'&&x.id===r.id)){rows.push({k:'same',id:r.id,n:a[0].n||r.n,n0:r.n,a0:r.a,a1,st:'ok',amb:a[0]});continue}if(palAreaDif(r.a||0,a1))rows.push({k:'area',id:r.id,n:a[0].n||r.n,a0:r.a,a1,st:has('area',r.id)?'ok':'pend',amb:a[0]});
      else if(fold(String(a[0].n||'')).trim()!==fold(String(r.n||'')).trim())rows.push({k:'ren',id:r.id,n:a[0].n,n0:r.n,a1,st:'ok',amb:a[0]});continue}
    if(used.has(r.id))continue;rows.push({k:has('otro',r.id)?'otro':'del',id:r.id,n:r.n,a0:r.a,st:has('del',r.id)||has('otro',r.id)?'ok':'pend',x:r.x,y:r.y})}
  const nuevos=amb.filter(a=>!ids.has(a));
  for(const a of nuevos){const ip=palInPt(a.p,amb);const ok=D.some(d=>d.k==='new'&&dxfAmbAt(amb,d.x,d.y)===a);rows.push({k:'new',n:a.n||'',a1:ar(a),st:ok?'ok':'pend',x:ip?ip.x:dxfCen(a.p).x,y:ip?ip.y:dxfCen(a.p).y,amb:a})}
  return{rows,pend:rows.filter(r=>r.st==='pend').length,de:reg.de}}
/** ítem «Diferencias con la Rev. K» de Alistar (se agrega a la verificación) */
function palAmbItem(p,C,ed){const mpp=p.dxf.mpp;const d=palAmbDiff(p,C.R,mpp);if(!d)return;const de=d.de.dxf?'el DXF anterior':`la Rev. ${d.de.rev}`;
  const n=k=>d.rows.filter(r=>r.k===k).length;const lbl={new:'Nuevo',del:'Ya no está',area:'Otra área',ren:'Otro nombre',otro:'Es otro ambiente',same:'Es el mismo'};
  const dels=d.rows.filter(r=>r.k==='del'&&r.st==='pend'),news=d.rows.filter(r=>r.k==='new');
  const m=a=>a==null?'—':pal2(a);
  const rowH=(r,i)=>{const ac=!ed?'':r.k==='new'?(r.st==='ok'?'':`<button type="button" class="ab" data-pal="amd:new:${i}">Es nuevo</button><button type="button" class="ab" data-pal="amd:nodel:${i}">No es ambiente</button>`)
      :r.k==='del'?(r.st==='ok'?`<button type="button" class="ab" data-pal="amd:undo:${i}" title="Deshacer">↶</button>`:`<button type="button" class="ab" data-pal="amd:del:${i}">Se eliminó</button>${news.length?`<select class="tin" data-pals="${i}" aria-label="Es el mismo que…"><option value="">Es el mismo que…</option>${news.map(o=>`<option value="${d.rows.indexOf(o)}">${esc(o.n||'sin nombre')} · ${m(o.a1)} m²</option>`).join('')}</select>`:''}`)
      :r.k==='area'?(r.st==='ok'?`<button type="button" class="ab" data-pal="amd:undo:${i}" title="Deshacer">↶</button>`:`<button type="button" class="ab" data-pal="amd:area:${i}">Correcto</button><button type="button" class="ab" data-pal="amd:otro:${i}">Es otro ambiente</button>`)
      :r.k==='otro'||r.k==='same'?`<button type="button" class="ab" data-pal="amd:undo:${i}" title="Deshacer">↶</button>`:'';
    const tx=r.k==='area'?`${m(r.a0)} → ${m(r.a1)} m²`:r.k==='ren'||r.k==='same'?`antes «${esc(r.n0||'')}» · ${m(r.a1)} m²`:r.k==='new'?`${m(r.a1)} m²`:`${m(r.a0)} m²`;
    return`<li class="${r.st==='pend'?'pend':''}"><span><b>${lbl[r.k]}</b> · ${esc(r.n||'sin nombre')}</span><small class="mu">${tx}${r.st==='ok'&&r.k!=='ren'?' · decidido':''}</small><button type="button" class="ab" data-pal="amd:go:${i}" title="Ver en el plano" aria-label="Ver en el plano">◎</button>${ac}</li>`};
  const msg=d.rows.length?`Comparado con ${de}: ${n('new')} nuevo(s), ${n('del')+n('otro')} que ya no están, ${n('area')} con otra área${n('ren')?`, ${n('ren')} con otro nombre`:''}. ${d.pend?`Faltan decidir ${d.pend}.`:'Todo decidido.'} Los ambientes que siguen conservan su código y lo que tienen vinculado.`:`Comparado con ${de}: los ambientes son los mismos.`;
  C.it.push({id:'ambdif',t:`Diferencias de ambientes con ${de}`,st:d.pend?'err':'ok',msg,det:[],act:[],btn:ed&&news.some(r=>r.st==='pend')?[{a:'amd:newall',t:'Todos los nuevos son nuevos'}]:[],
    pts:d.rows.filter(r=>r.st==='pend').map(r=>({x:r.x!=null?r.x:dxfCen(r.amb.p).x,y:r.y!=null?r.y:dxfCen(r.amb.p).y})),
    html:d.rows.length?`<details class="palamb paldif" open><summary>Diferencias (${d.rows.length})</summary><ul>${d.rows.map(rowH).join('')}</ul></details>`:''});PAL.dif=d}
/** guarda una decisión (o la deshace) */
async function palAmdSet(p,add,rmId){const A=palAmd(p);let L=A.L.slice();if(rmId)L=L.filter(d=>d.id!==rmId);for(const d of add||[])L.push({...d,by:me.email,t:NOW()});
  const o={amd:{rev:p.rev||1,L}};if(plUsable(p))o.ok=firebase.firestore.FieldValue.delete();await palSet(p,o)}
async function palRevClick(p,k,b){if(!plAlEd(p)&&!k.startsWith('amd:go:'))return;const d=PAL.dif;const[,a,ix]=k.split(':');const r=d&&d.rows[+ix];
  if(a==='go'){if(r){const x=r.x!=null?r.x:dxfCen(r.amb.p).x,y=r.y!=null?r.y:dxfCen(r.amb.p).y;palGo(x,y)}return}
  if(k==='carry'){const ok=await uiAsk({title:'¿Pasar las correcciones de la revisión anterior?',text:'Las correcciones, el contorno y los ambientes pasan a esta revisión llevados por los ejes. Cada una se compara con el dibujo nuevo; las que ya vienen o ya no aplican se anotan. Después revisas y marcas listo.',ok:'Pasar',tone:'info'});if(!ok)return;
    toast('Pasando las correcciones…');const res=await palCarry(p.id);toast(res.skip?'No hay nada que pasar.':palCarryMsg(p.cod,res));return}
  if(a==='newall'){if(!d)return;const add=d.rows.filter(o=>o.k==='new'&&o.st==='pend').map(o=>({k:'new',x:plr2(o.x),y:plr2(o.y)}));if(add.length)await palAmdSet(p,add);return}
  if(!r)return;
  if(a==='new')await palAmdSet(p,[{k:'new',x:plr2(r.x),y:plr2(r.y)}]);
  else if(a==='nodel'){if(!await palOkEdit(p))return;await palFixAdd(p,{k:'ambDel',x:plr2(r.x),y:plr2(r.y),n:r.n||''},`«${r.n||'sin nombre'}» quitado: no es ambiente.`)}
  else if(a==='del')await palAmdSet(p,[{k:'del',id:r.id}]);
  else if(a==='area')await palAmdSet(p,[{k:'area',id:r.id}]);
  else if(a==='otro'){const ip=palInPt(r.amb.p,PAL.C.R.amb)||dxfCen(r.amb.p);await palAmdSet(p,[{k:'otro',id:r.id},{k:'new',x:plr2(ip.x),y:plr2(ip.y)}])}
  else if(a==='undo'){const A=palAmd(p);const L=A.L.filter(o=>o.id!==r.id&&!(r.k==='otro'&&o.k==='new'&&r.amb&&dxfAmbAt(PAL.C.R.amb,o.x,o.y)===r.amb));await palSet(p,{amd:{rev:p.rev||1,L},...(plUsable(p)?{ok:firebase.firestore.FieldValue.delete()}:{})})}}
/** «Es el mismo que…»: el ambiente que ya no está toma el lugar de uno nuevo (conserva su código y lo vinculado) */
async function palRevSame(p,i,j){const d=PAL.dif;const r=d&&d.rows[i],o=d&&d.rows[j];if(!r||!o||!plAlEd(p))return;await palAmdSet(p,[{k:'same',id:r.id,x:plr2(o.x),y:plr2(o.y)}])}
/** registro de ambientes al marcar listo: los que siguen conservan su id; los nuevos, uno nuevo */
function palAmbSave(p,R,mpp){const amb=R.amb||[];if(!amb.length)return null;   /* sin ambientes no se toca el registro (no se pierden los ids) */const reg=palAmbOf(p);const{ids}=palAmbMatch(reg?reg.L:[],amb,reg&&reg.de?palAmd(p):null);
  return{rev:p.rev||1,t:NOW(),L:amb.map(q=>{const ip=palInPt(q.p,amb)||dxfCen(q.p);return{id:ids.get(q)||uid('pa'),n:q.n||'',a:Math.round(palArea(q.p)*mpp*mpp*100)/100,x:plr2(ip.x),y:plr2(ip.y)}})}}
/** ids de los ambientes de la revisión vigente (para plDxfLam): Map(ambiente → id) o null */
function plAmbIds(p,sp,amb){if(!sp||!sp.cur)return null;const reg=palAmbOf(p);if(!reg||reg.de)return null;return palAmbMatch(reg.L,amb,null).ids}
/** aviso en Alistar: una revisión sin nada propio cuya anterior tiene correcciones */
function palCarryHtml(p,ed){if(!ed||palHasOwn(p)||palOkRev(p))return'';
  if(p.dxfH&&p.dxfH.rev===(p.rev||1))return`<div class="callout palcar"><b>El DXF anterior de esta revisión tenía correcciones de Alistar.</b> Pásalas a este DXF (mismas coordenadas; se comparan con el dibujo nuevo). <button type="button" class="ib" data-pal="carry">Pasar las correcciones del DXF anterior</button></div>`;
  const r=palCarrySrc(p);if(!r)return'';
  return`<div class="callout palcar"><b>La Rev. ${r.rev} tiene correcciones de Alistar.</b> Pásalas a esta revisión (se llevan por los ejes y se comparan con el dibujo nuevo). <button type="button" class="ib" data-pal="carry">Pasar las correcciones de la Rev. ${r.rev}</button></div>`}
