"use strict";
/* LPS 911 · Sectorización › ambientes desde el plano alistado (11-11-2026, decidido con el dueño; docs/ia/plan-diario.md «Ambientes desde el plano»).
   Los ambientes nacen del plano: la planta de arquitectura alistada en Planos trae cada ambiente con su nombre y su forma (Alistar los
   identifica y el dueño los corrige). Aquí se traen a Last Planner por piso:
   - «Traer ambientes del plano»: tabla con los nuevos (se crean con su forma ya dibujada), los que coinciden (por ubicación o por nombre:
     toman la forma del plano) y los que solo están en el lookahead (no se tocan; nunca se borra nada solo).
   - Sectores de las dos maneras, sincronizadas: el sector de cada ambiente nuevo se elige en la tabla, o con «Agrupar en este sector» se
     dibuja un contorno sobre la lámina y los ambientes que quedan adentro pasan a ese sector. Las dos cambian el mismo dato
     (`ambientes.sectorId`); la forma de un sector en esta vista ya es la de sus ambientes.
   - Los ambientes siguen siendo los de Last Planner (`ambientes`): sin otra lista. Cada uno traído guarda `pl {plb, rev}` (de qué plano vino).
   Solo en Last Planner (en Casco los «ambientes» son sectores de obra). Escribe con apply(): todo se deshace con Ctrl+Z. */

const szplKey=s=>fold(s).replace(/[^a-z0-9]/g,'');
const szplCen=P=>{let x=0,y=0;const n=P.length/2;for(let i=0;i<P.length;i+=2){x+=P[i];y+=P[i+1]}return{x:x/n,y:y/n}};
function szplPip(P,x,y){let c=false;for(let i=0,n=P.length/2,j=n-1;i<n;j=i++){const xi=P[2*i],yi=P[2*i+1],xj=P[2*j],yj=P[2*j+1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function szplArea(P){let s=0;for(let i=0,n=P.length/2;i<n;i++){const j=(i+1)%n;s+=P[2*i]*P[2*j+1]-P[2*j]*P[2*i+1]}return Math.abs(s)/2}
/** la lámina base elegida del piso, si viene de un plano DXF alistado del módulo Planos: {lam, p, d (geometría en coordenadas de la lámina)} o {err} */
function szplSrc(pid){const API=window.__plano;const bs=API&&API.basesOf?API.basesOf(pid):[];const lam=bs.find(b=>b.id===SZ.vista)||bs[0];
  if(!lam)return{err:'Este piso no tiene lámina base.'};
  if(!lam.plb)return{err:'La lámina base de este piso no viene del módulo Planos: súbela desde Planos (planta de arquitectura en DXF) para traer sus ambientes.'};
  if(typeof plSub==='function')plSub();const p=typeof PLB!=='undefined'&&PLB.get(lam.plb.id);if(!p)return{err:'Cargando los planos del proyecto… vuelve a intentarlo en unos segundos.'};
  const sp=plSpecOf(p,lam.plb.rev);if(!sp.dxf)return{err:`La lámina base (${p.cod}) es un PDF: los ambientes solo se leen de una planta en DXF.`};
  if(!plRevOk(p,sp.rev))return{err:`Alista primero ${p.cod} en Planos (visor › ⚠ Alistar): ahí se revisan los ambientes que se van a traer.`};
  const d=csDxf(lam);if(!d)return{err:'Cargando la geometría del plano… vuelve a intentarlo en unos segundos.'};
  if(!d.amb||!d.amb.length)return{err:`${p.cod} no tiene ambientes identificados: revísalos en Planos › Alistar (capa de ambientes o «+ Agregar ambiente»).`};
  return{lam,p,sp,d}}
/** filas de la tabla: cada ambiente del plano con su ambiente del lookahead (por ubicación o por nombre) o nuevo; y los que solo están en el lookahead */
function szplRows(pid,src){const v=src.lam.id,mpp=src.d.mpp||0;const L=szTree(pid).flatMap(({s,ambs})=>ambs.map(({a})=>({a,s})));const used=new Set();
  const rows=src.d.amb.map((q,i)=>{const c=szplCen(q.p);return{i,n:String(q.n||'').trim(),p:q.p,c,m2:szplArea(q.p)*mpp*mpp}});
  for(const r of rows){const hit=L.find(o=>!used.has(o.a.id)&&szGeo(o.a,v)&&szplPip(szGeo(o.a,v),r.c.x,r.c.y));if(hit){r.a=hit.a;r.by='pos';used.add(hit.a.id)}}
  for(const r of rows){if(r.a||!r.n)continue;const k=szplKey(r.n);const hit=L.find(o=>!used.has(o.a.id)&&szplKey(o.a.name)===k);if(hit){r.a=hit.a;r.by='nom';used.add(hit.a.id)}}
  return{rows,solo:L.filter(o=>!used.has(o.a.id))}}
function szplOpen(){const pid=U.piso;if(!pid||!canWrite||CS())return;const src=szplSrc(pid);if(src.err){toast(src.err);return}
  const{rows,solo}=szplRows(pid,src);const secs=szTree(pid).map(o=>o.s);const v=src.lam.id;
  const so=(sel,blank)=>`${blank?`<option value="">${blank}</option>`:''}${secs.map(s=>`<option value="${s.id}"${s.id===sel?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}`;
  const nN=rows.filter(r=>!r.a).length,nC=rows.length-nN;
  const tr=r=>{const has=r.a&&szGeo(r.a,v);return`<tr data-r="${r.i}"><td><input type="checkbox" data-szplc="${r.i}"${!r.a||!has?' checked':''} aria-label="Traer ${esc(r.n||'ambiente')}"></td>
    <td>${r.a?esc(r.n||'(sin nombre)'):`<input class="tin" data-szpln="${r.i}" value="${esc((r.n||'').toUpperCase())}" placeholder="Nombre" aria-label="Nombre del ambiente">`}</td><td class="n">${r.m2?r.m2.toFixed(2):'—'}</td>
    <td>${r.a?`<b>${esc(r.a.code)}</b> · ${esc(r.a.name)} <span class="mu">${r.by==='pos'?'(misma ubicación)':'(mismo nombre)'}${has?' · ya ubicado: marca para tomar la forma del plano':''}</span>`:'<span class="szplnew">Nuevo</span>'}</td>
    <td>${r.a?esc((S.sec.get(r.a.sectorId)||{}).code||''):`<select class="tin" data-szpls="${r.i}" aria-label="Sector"><option value="">El de arriba</option>${so('')}</select>`}</td></tr>`};
  lqModal(`<div class="lqtop"><b>Traer ambientes del plano · ${esc(S.pis.get(pid).code)} · ${esc(src.p.cod)} Rev. ${src.sp.rev}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
    <p class="note">${rows.length} ambiente(s) en el plano: <b>${nN} nuevo(s)</b> se crean con su forma ya dibujada y <b>${nC} coinciden</b> con el lookahead (por ubicación o por nombre) y toman la forma del plano. ${solo.length?`${solo.length} ambiente(s) del lookahead no están en el plano: no se tocan.`:''} Se deshace con Ctrl+Z.</p>
    ${nN?`<label class="lqlab szplsec">Sector para los nuevos<select class="tin" id="szplsec">${so(secs[0]&&secs[0].id)}<option value="__new">+ Sector nuevo</option></select></label>`:''}
    <div class="szplw"><table class="t szplt"><thead><tr><th><input type="checkbox" id="szplall" checked aria-label="Todos"></th><th>Ambiente del plano</th><th class="n">m²</th><th>En el lookahead</th><th>Sector</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div>
    ${solo.length?`<details class="szplsolo"><summary>Solo en el lookahead (${solo.length})</summary><p class="mu">${solo.map(o=>`${esc(o.a.code)} · ${esc(o.a.name)}`).join(' · ')}</p></details>`:''}
    <p class="lqmsg bad" id="szplmsg"></p><div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="szplok">Traer</button></div>`,
    e=>{if(e.target.id==='szplall'){document.querySelectorAll('#lqm [data-szplc]').forEach(x=>{x.checked=e.target.checked});return}
      if(e.target.id==='szplok')szplApply(pid,src,rows)});}
function szplApply(pid,src,rows){const v=src.lam.id;const q=s=>document.querySelector('#lqm '+s);const ops=[];let nN=0,nC=0;
  const top=q('#szplsec')?q('#szplsec').value:'';let topId=top;
  if(top==='__new'){const ss=siblings('sectors','pisoId',pid);const n=ss.length+1,last=ss[ss.length-1];topId=uid('sec');ops.push(op('sectors',topId,{id:topId,pisoId:pid,code:'S'+n,name:'Sector '+n,order:last?last.order+10:10}))}
  const cnt=new Map();const pl={plb:src.p.id,rev:src.sp.rev};
  for(const r of rows){const c=q(`[data-szplc="${r.i}"]`);if(!c||!c.checked)continue;
    if(r.a){ops.push(op('ambientes',r.a.id,{...r.a,geo:{...(r.a.geo||{}),[v]:r.p},pl}));nC++;continue}
    const sid=(q(`[data-szpls="${r.i}"]`)||{}).value||topId;if(!sid){q('#szplmsg').textContent='Elige el sector de los ambientes nuevos (o crea uno).';return}
    const name=String((q(`[data-szpln="${r.i}"]`)||{}).value||'').trim().toUpperCase()||'AMBIENTE';
    const sib=S.sec.has(sid)?siblings('ambientes','sectorId',sid):[];const k=(cnt.get(sid)||0)+1;cnt.set(sid,k);const sc=S.sec.get(sid)||{code:'S'+(siblings('sectors','pisoId',pid).length+1)};
    const id=uid('amb');const last=sib[sib.length-1];ops.push(op('ambientes',id,{id,sectorId:sid,code:`${sc.code}-${sib.length+k}`,name,order:(last?last.order:0)+10*k,geo:{[v]:r.p},pl}));nN++}
  if(!ops.length){q('#szplmsg').textContent='Marca al menos un ambiente.';return}
  lqClose();apply(ops,`Ambientes del plano: ${nN} nuevo(s), ${nC} ubicado(s)`);toast(`${nN} ambiente(s) nuevo(s) y ${nC} ubicado(s) desde ${src.p.cod}`,'Deshacer',undo)}
/** «Agrupar en este sector»: los ambientes ubicados cuyo centro cae dentro del contorno dibujado pasan al sector elegido */
async function szplLasso(sid,pts,vista){const s=S.sec.get(sid);if(!s||!canWrite)return;const pid=U.piso;
  const L=szTree(pid).flatMap(({ambs})=>ambs.map(({a})=>a)).filter(a=>a.sectorId!==sid&&szGeo(a,vista)&&(c=>szplPip(pts,c.x,c.y))(szplCen(szGeo(a,vista))));
  if(!L.length){toast('No quedó ningún ambiente de otro sector dentro del contorno.');return}
  if(!(await uiAsk({title:`¿Pasar ${L.length} ambiente(s) a ${s.code} · ${s.name}?`,text:'Sus actividades se van con ellos (siguen siendo las mismas). Se deshace con Ctrl+Z.',list:L.slice(0,20).map(a=>`${a.code} · ${a.name} (de ${(S.sec.get(a.sectorId)||{}).code||'—'})`),ok:'Pasar al sector',tone:'info'})))return;
  const sib=siblings('ambientes','sectorId',sid);let o=(sib[sib.length-1]||{order:0}).order;
  apply(L.map(a=>op('ambientes',a.id,{...a,sectorId:sid,order:(o+=10)})),`${L.length} ambiente(s) agrupados en ${s.code}`);toast(`${L.length} ambiente(s) pasaron a ${s.code}`,'Deshacer',undo)}
