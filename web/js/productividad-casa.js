"use strict";
/* LPS 911 · Productividad, F2: IP de casa por partida de control (oct 2026, decidido con el dueño; docs/ia/productividad.md).
   - Partidas = las de control del Tareo (tpc: cod, nom, und, met = metrado meta, hhp = HH presupuestadas).
   - pmet/{fecha}_{pc}_{piso}_{zona|-}: metrado ejecutado de casa {pc, d, piso, zona, q, by, byN, ts, h, arch}. Lo registran el admin y
     los ingenieros (canDaily); piso obligatorio, sector o ambiente opcional. Se guarda aunque el tareo del día no esté publicado.
   - hhpc/{fecha}: HH por partida de la publicación vigente del Tareo (la escribe la función publicarTareo; sin datos de personas).
   - IP = ratio presupuestado ÷ ratio real = HH ganadas ÷ HH gastadas (mayor a 1 es mejor). Solo cuentan los días con HH publicadas
     (metrado y HH del mismo periodo); el metrado de días sin publicar suma al avance, no al IP.
   - El tareo no registra piso: el avance va por piso, el IP es de toda la obra. */
const pcOk=()=>!!me&&(!!canDaily||(typeof canTar==='function'&&canTar()));
const PMET=new Map(),HHPC=new Map(),PTPC=new Map();let pcSubs=null,pcErr=null,PCSEL='',PCD='';
function ensurePc(){if(!db||pcSubs||!pcOk())return;
  const sub=(c,M)=>fcol(c).onSnapshot(sn=>{M.clear();sn.docs.forEach(d=>M.set(d.id,{...d.data(),id:d.id}));pcErr=null;if(ready)snapRender(sn)},e=>{pcErr=e&&e.code||'error';if(ready)requestRender()});
  pcSubs=[sub('pmet',PMET),sub('hhpc',HHPC)];if(!canTar())pcSubs.push(sub('tpc',PTPC));unsubs.push(stopPc)}
function stopPc(){if(pcSubs)pcSubs.forEach(f=>{try{f()}catch(e){}});pcSubs=null;PMET.clear();HHPC.clear();PTPC.clear()}
const pcTpc=()=>canTar()?S.tpc:PTPC;
const pcList=()=>[...pcTpc().values()].filter(x=>x&&!x.arch&&x.act!==false).sort((a,b)=>(a.ord??0)-(b.ord??0)||String(a.cod||'').localeCompare(String(b.cod||''),'es',{numeric:true}));
const pcMets=pc=>[...PMET.values()].filter(r=>r.pc===pc&&!r.arch&&+r.q>0);
const pcF2=v=>v==null||!isFinite(v)?'—':v.toFixed(2);
/* ratio HH/und: en kg sale 0.03…; se muestran 3 cifras significativas cuando es chico */
const pcR=v=>!v||!isFinite(v)?'—':v>=10?v.toFixed(1):v>=0.1?v.toFixed(2):String(+v.toPrecision(3));
const pcTone=v=>v==null?'':v>=1?'ok':v>=.9?'warn':'bad';
/** cálculo puro de una partida de control: avance, HH, ratios, IP (acumulado y por semana) y proyección */
function pcStats(x){const met=+x.met||0,hhp=+x.hhp||0,rp=met&&hhp?hhp/met:0;
  let eje=0,ejeC=0,hh=0;const byP=new Map(),W=new Map();const w=d=>{const k=weekOf(d);let o=W.get(k);if(!o)W.set(k,o={q:0,hh:0});return o};
  for(const r of pcMets(x.id)){const q=+r.q;eje+=q;byP.set(r.piso,(byP.get(r.piso)||0)+q);if(HHPC.has(r.d)){ejeC+=q;w(r.d).q+=q}}
  for(const[d,doc]of HHPC){const o=doc&&doc.pcs&&doc.pcs[x.id];if(o&&+o.hh){hh+=+o.hh;w(d).hh+=+o.hh}}
  const rr=ejeC?hh/ejeC:0,ip=rp&&rr?rp/rr:null,gan=ejeC*rp,saldo=Math.max(0,met-eje);
  const proj=hhp?hh+saldo*(rr||rp):null;
  const ipw=k=>{const o=W.get(k);return o&&o.q&&o.hh&&rp?rp/(o.hh/o.q):null};
  return{met,hhp,rp,eje,ejeC,hh,rr,ip,gan,saldo,pct:met?Math.min(100,eje/met*100):0,proj,desv:proj!=null?proj-hhp:null,byP,W,ipw,hhSinMet:hh>0&&!ejeC}}
/* HH de una publicación (copia de tpResumenHH en functions/tpub.js, para traer los días publicados antes de que existiera hhpc) */
function pcResumen(snap){const pcs={};let hh=0;for(const r of snap.rows||[])for(const[pc,h]of Object.entries(r.h||{})){const v=+h||0;if(!v)continue;hh+=v;const m=(snap.pcs||{})[pc]||{};const o=pcs[pc]||(pcs[pc]={hh:0,cod:m.cod||'',nom:m.nom||'',und:m.und||''});o.hh+=v}
  const r2=x=>Math.round(x*100)/100;for(const o of Object.values(pcs))o.hh=r2(o.hh);return{fecha:snap.fecha,v:snap.v,at:snap.at,hh:r2(hh),pcs}}
async function pcBackfill(){if(!isAdmin||!canTar())return;if(!await uiAsk({title:'Traer HH del tareo publicado',text:'Arma el resumen de HH por partida de cada día ya publicado (los nuevos se arman solos al publicar).',ok:'Traer',tone:'info'}))return;
  try{const ix=await fcol('tpubidx').get();let n=0;for(const d of ix.docs){const x=d.data()||{};if(!(+x.v>0))continue;const s=await fcol('tpub').doc(d.id+'_v'+x.v).get();if(!s.exists)continue;await fcol('hhpc').doc(d.id).set(pcResumen({...s.data(),fecha:d.id}));n++}
    toast(n?`HH de ${n} día${n===1?'':'s'} publicado${n===1?'':'s'}`:'No hay días publicados en el tareo')}catch(err){toast('No se pudo traer: '+(err.code||err.message))}}

function pvSeg(){if(!pcOk()||SCK())return'';const v=U.pvV==='casa'||U.pvV==='reg'?'casa':'sc';
  return`<div class="seg pvseg" role="group" aria-label="Vista"><button data-pvv="sc" class="${v==='sc'?'on':''}">Subcontratistas</button><button data-pvv="casa" class="${v==='casa'?'on':''}">Casa (IP)</button></div>`}

function renderCasa(main){ensurePc();const t=todayIso();if(U.pvV==='reg'){renderPcReg(main);return}
  const L=pcList().map(x=>({x,s:pcStats(x)}));const vis=U.pcAll?L:L.filter(o=>o.s.eje||o.s.hh);if(PCSEL&&!L.some(o=>o.x.id===PCSEL))PCSEL='';
  const acts=`${canDaily?'<button class="ib pri" data-pc="reg">Registrar metrado</button>':''}${isAdmin&&canTar()?'<button class="ib" data-pc="bf" title="Arma el resumen de HH de los días que se publicaron antes de esta pantalla">Traer HH del tareo</button>':''}`;
  let h=`<div class="scroll"><div class="wrap pvwrap">${pageHead('Productividad','Casa: IP por partida de control',acts)}${pvSeg()}`;
  h+=helpBox('¿Cómo se calcula?',`<p><b>Ratio presupuestado</b> = HH presupuestadas ÷ metrado meta de la partida. <b>Ratio real</b> = HH gastadas ÷ metrado ejecutado. <b>IP</b> = presupuestado ÷ real (= HH ganadas ÷ HH gastadas): mayor a 1, mejor que el presupuesto.</p><p>Las HH salen del tareo <b>publicado</b>; el metrado lo registran los ingenieros por piso. Para el IP solo cuentan los días con HH publicadas; el metrado de días aún sin publicar suma al avance. El tareo no registra piso: el avance se ve por piso y el IP es de toda la obra.</p>`);
  if(pcErr)h+=`<div class="callout warn">No se pudieron leer los datos (${esc(pcErr)}).</div>`;
  /* avisos: hasta qué día hay HH publicadas, días con HH sin metrado y días con metrado sin publicar (últimas 3 semanas) */
  {const dh=[...HHPC.keys()].sort();const last=dh[dh.length-1];const from=addD(t,-21);const metD=new Set([...PMET.values()].filter(r=>!r.arch&&+r.q>0).map(r=>r.d));
    const sinMet=dh.filter(d=>d>=from&&!metD.has(d)&&+(HHPC.get(d)||{}).hh>0),sinHH=[...metD].filter(d=>d>=from&&d<t&&!HHPC.has(d)).sort();
    if(last||sinMet.length||sinHH.length)h+=`<div class="callout ${sinMet.length?'warn':'info'} pccall">${last?`<b>HH del tareo publicadas hasta el ${fmtD(last)}.</b> `:'<b>Aún no hay HH publicadas del tareo.</b> '}${sinHH.length?`${sinHH.length} día${sinHH.length>1?'s':''} con metrado esperan la publicación del tareo (${sinHH.slice(-3).map(fmtD).join(', ')}). `:''}${sinMet.length?`<b>${sinMet.length} día${sinMet.length>1?'s':''} con HH sin metrado registrado</b> (${sinMet.slice(-4).map(fmtD).join(', ')}): esas HH bajan el IP.`:''}</div>`}
  const T=L.filter(o=>o.s.ip!=null);const gan=T.reduce((a,o)=>a+o.s.gan,0),gas=T.reduce((a,o)=>a+o.s.hh,0);const ipo=gas?gan/gas:null;const low=T.filter(o=>o.s.ip<.9);const dv=L.reduce((a,o)=>a+(o.s.ip!=null&&o.s.desv!=null?o.s.desv:0),0);
  h+=`<div class="tiles pvtl"><div class="tile"><span class="k">IP acumulado de la obra</span><span class="v pv${pcTone(ipo)}">${pcF2(ipo)}</span><small class="pvsub">mayor a 1 es mejor</small></div>
    <div class="tile"><span class="k">HH ganadas / gastadas</span><span class="v">${pvN(Math.round(gan))} <small>/ ${pvN(Math.round(gas))}</small></span></div>
    <div class="tile"><span class="k">Partidas con IP menor a 0.90</span><span class="v pvbad">${low.length}</span>${low.length?`<small class="pvsub">${esc(low.slice(0,2).map(o=>o.x.nom).join(' · '))}</small>`:''}</div>
    <div class="tile"><span class="k">Desvío proyectado al término</span><span class="v ${dv>0?'pvbad':'pvok'}">${T.length?(dv>0?'+':'−')+pvN(Math.abs(Math.round(dv)))+' <small>HH</small>':'—'}</span></div></div>`;
  h+=`<div class="card pvtw"><div class="pvch pad"><b>Partidas de control</b><span>${vis.length} de ${L.length}</span><span class="sp"></span><label class="chk"><input type="checkbox" data-pc="all"${U.pcAll?' checked':''}> Ver todas</label></div><div class="pvsc"><table class="t pvt"><thead><tr><th>Código</th><th>Partida de control</th><th>Und</th><th class="r">Metrado meta</th><th class="r">Ejecutado</th><th>Avance</th><th class="r">HH gastadas</th><th class="r" title="HH presupuestadas ÷ metrado meta">Ratio presup.</th><th class="r" title="HH gastadas ÷ metrado ejecutado (días con HH publicadas)">Ratio real</th><th class="r">IP semana ${weekOf(t)}</th><th class="r">IP acum.</th><th class="r" title="HH gastadas + saldo × ratio real, menos las presupuestadas">Al término vs presup.</th></tr></thead><tbody>`;
  if(!vis.length)h+=`<tr><td colspan="12" class="note">${L.length?'Ninguna partida tiene metrado ni HH todavía. Registra el metrado del día o marca «Ver todas».':'No hay partidas de control. Se cargan en Tareo › Partidas.'}</td></tr>`;
  for(const{x,s}of vis){const iw=s.ipw(weekOf(t));
    h+=`<tr class="pvr${PCSEL===x.id?' on':''}" data-pcs="${esc(x.id)}" tabindex="0"><td class="m">${esc(x.cod||'')}</td><td><b>${esc(x.nom||'')}</b></td><td>${esc(x.und||'')}</td><td class="r m">${s.met?pvN(s.met):'—'}</td><td class="r m">${pvN(s.eje)}</td>
      <td>${s.met?`<span class="pvbar"><i style="width:${s.pct.toFixed(1)}%"></i></span><small class="m">${Math.round(s.pct)}%</small>`:''}</td><td class="r m">${pvN(Math.round(s.hh*10)/10)}</td><td class="r m">${pcR(s.rp)}</td><td class="r m">${s.hhSinMet?'<span class="pvbad" title="Hay HH publicadas y ningún metrado en esos días">sin metrado</span>':pcR(s.rr)}</td>
      <td class="r">${iw!=null?`<span class="pvst ${pcTone(iw)}">${pcF2(iw)}</span>`:'—'}</td><td class="r">${s.ip!=null?`<span class="pvst ${pcTone(s.ip)}">${pcF2(s.ip)}</span>`:'—'}</td>
      <td class="r m ${s.ip!=null&&s.desv!=null?(s.desv>0?'pvbad':'pvok'):''}">${s.ip!=null&&s.desv!=null?(s.desv>0?'+':'−')+pvN(Math.abs(Math.round(s.desv)))+' HH':'—'}</td></tr>`}
  h+='</tbody></table></div></div>';
  const sel=L.find(o=>o.x.id===PCSEL);if(sel)h+=pcDetail(sel.x,sel.s,t);else if(vis.length)h+='<div class="note pvhint">Toca una partida para ver su avance por piso, el IP por semana y la proyección.</div>';
  h+='</div></div>';main.innerHTML=h;pvWire(main)}

function pcDetail(x,s,t){const und=x.und||'und';const wk=weekOf(t);const ws=[];for(let k=wk-7;k<=wk;k++)ws.push(k);const vals=ws.map(k=>s.ipw(k));
  const W=600,H=190,B=164,top=14,lo=.6,hi=1.4;const y=v=>B-(Math.max(lo,Math.min(hi,v))-lo)/(hi-lo)*(B-top);const bw=W/ws.length;
  const chart=`<svg class="pvsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="IP por semana de ${esc(x.nom||'')}, semanas ${ws[0]} a ${wk}"><line x1="0" y1="${B}" x2="${W}" y2="${B}" class="ax"></line><line x1="0" y1="${y(1).toFixed(1)}" x2="${W}" y2="${y(1).toFixed(1)}" class="rit"></line>
    ${vals.map((v,i)=>v==null?'':`<rect x="${(i*bw+8).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw-16).toFixed(1)}" height="${(B-y(v)).toFixed(1)}" rx="3" class="pcb ${pcTone(v)}"><title>Semana ${ws[i]}: IP ${pcF2(v)}</title></rect><text x="${(i*bw+bw/2).toFixed(1)}" y="${(y(v)-4).toFixed(1)}" text-anchor="middle" class="lb">${pcF2(v)}</text>`).join('')}
    ${ws.map((k,i)=>`<text x="${(i*bw+bw/2).toFixed(1)}" y="${H-6}" text-anchor="middle" class="lb">S${k}</text>`).join('')}</svg><div class="pvleg"><span><i class="l rit"></i>IP 1.00 (igual al presupuesto)</span></div>`;
  const pis=pisos().map(pi=>({pi,q:s.byP.get(pi.id)||0})).filter(o=>o.q);const mx=Math.max(1,...pis.map(o=>o.q));
  return`<section class="pvdet"><div class="card pvc"><div class="pvch"><b>${esc(x.cod||'')} · ${esc(x.nom||'')}</b><span>${esc(und)}${x.ua?' · cuenta '+esc(x.ua):''}</span></div>
    <div class="pcfg"><div><span>Ejecutado</span><b class="m">${pvN(s.eje)}${s.met?` / ${pvN(s.met)}`:''} ${esc(und)}</b></div><div><span>HH gastadas</span><b class="m">${pvN(Math.round(s.hh))}${s.hhp?` / ${pvN(s.hhp)} presup.`:''}</b></div>
      <div><span>Ratio real vs presupuestado</span><b class="m">${pcR(s.rr)} vs ${pcR(s.rp)} HH/${esc(und)}</b></div><div><span>Proyección al término</span><b class="m ${s.desv>0?'pvbad':'pvok'}">${s.proj!=null&&s.ip!=null?pvN(Math.round(s.proj))+' HH':'—'}</b><small>${s.desv!=null&&s.ip!=null?`${s.desv>0?'sobre':'bajo'} el presupuesto por ${pvN(Math.abs(Math.round(s.desv)))} HH`:'falta metrado, HH o presupuesto'}</small></div></div>
    <b class="pcsh">Avance por piso</b><div class="pvpis">${pis.map(o=>`<div class="pvpr"><span>${esc(o.pi.code)} · ${esc(o.pi.name)}</span><span class="pvbar lg"><i style="width:${(o.q/mx*100).toFixed(1)}%"></i></span><span class="m">${pvN(o.q)} ${esc(und)}</span></div>`).join('')||'<div class="note">Sin metrado registrado todavía.</div>'}</div>
    ${s.rr?`<div class="note">Para planificar: con el ratio real de esta obra, <b>${pcR(s.rr)} HH/${esc(und)}</b> ≈ <b>${pvN(Math.round(8.5/s.rr*10)/10)} ${esc(und)}</b> por obrero en una jornada de 8,5 h.</div>`:''}</div>
    <div class="card pvc"><div class="pvch"><b>IP por semana</b><span>últimas 8 semanas</span></div>${chart}</div></section>`}

/* ---------- registro diario del ingeniero: una fila por partida, una columna por piso ---------- */
function renderPcReg(main){const fa=document.activeElement;const keep=fa&&fa.dataset&&fa.dataset.pcq!==undefined&&main.contains(fa)?{pc:fa.dataset.pcq,piso:fa.dataset.piso,v:fa.value,s:fa.selectionStart}:null;const t=todayIso();if(!PCD||PCD>t)PCD=t;const d=PCD;const P=visPisos();const hc=HHPC.get(d);
  const recent=new Set();{const f=addD(d,-14);for(const r of PMET.values())if(!r.arch&&+r.q>0&&r.d>=f&&r.d<=d)recent.add(r.pc);for(const[k,doc]of HHPC)if(k>=f&&k<=d)Object.keys((doc&&doc.pcs)||{}).forEach(p=>recent.add(p))}
  const L=pcList().filter(x=>U.pcAll||recent.has(x.id));
  const cell=(pc,piso)=>{const R=[...PMET.values()].filter(r=>r.d===d&&r.pc===pc&&r.piso===piso&&!r.arch&&+r.q>0);return{q:R.reduce((a,r)=>a+(+r.q),0),zona:R.some(r=>r.zona)}};
  let h=`<div class="scroll"><div class="wrap pvwrap">${pageHead('Registrar metrado ejecutado','Casa · lo ejecutado de verdad, por piso (sector o ambiente en «Detalle»)',`<button class="ib" data-pc="back">‹ Volver al IP</button>`)}
    <div class="pcdate"><button class="ib" data-pc="prev" aria-label="Día anterior">‹</button><input type="date" data-pc="d" value="${d}" max="${t}" aria-label="Fecha"><button class="ib" data-pc="next" aria-label="Día siguiente"${d>=t?' disabled':''}>›</button>
      <span class="pchh">${hc?`HH del tareo publicadas: <b>${pvN(hc.hh)}</b>`:'<span class="pvst warn">HH del tareo por publicar</span> el metrado se guarda igual'}</span><span class="sp"></span><label class="chk"><input type="checkbox" data-pc="all"${U.pcAll?' checked':''}> Todas las partidas</label></div>`;
  if(!L.length)h+=`<div class="empty">${pcList().length?'Ninguna partida tuvo HH ni metrado en las últimas 2 semanas. Marca «Todas las partidas» para registrar.':'No hay partidas de control. Se cargan en Tareo › Partidas.'}</div>`;
  else{h+=`<div class="card pvtw"><div class="pvsc"><table class="t pvt pcreg"><thead><tr><th>Código</th><th>Partida de control</th><th>Und</th><th class="r">HH del día</th>${P.map(p=>`<th class="r">${esc(p.code)}</th>`).join('')}<th class="r">Total</th><th></th></tr></thead><tbody>`;
    for(const x of L){const hh=hc&&hc.pcs&&hc.pcs[x.id]?hc.pcs[x.id].hh:null;let tot=0;
      h+=`<tr><td class="m">${esc(x.cod||'')}</td><td><b>${esc(x.nom||'')}</b></td><td>${esc(x.und||'')}</td><td class="r m">${hh!=null?pvN(hh):hc?'—':'<span class="mu">por publicar</span>'}</td>
        ${P.map(p=>{const c=cell(x.id,p.id);tot+=c.q;return`<td class="r">${c.zona?`<button class="ib pcz" data-pc="det" data-id="${esc(x.id)}" title="Tiene detalle por sector o ambiente">${pvN(c.q)} ▸</button>`:`<input class="pcq" type="number" inputmode="decimal" min="0" step="any" data-pcq="${esc(x.id)}" data-piso="${esc(p.id)}" value="${c.q?c.q:''}" aria-label="${esc(x.nom||'')} en ${esc(p.code)}">`}</td>`}).join('')}
        <td class="r m"><b>${tot?pvN(tot):'—'}</b></td><td><button class="ib" data-pc="det" data-id="${esc(x.id)}">Detalle</button></td></tr>`}
    h+='</tbody></table></div></div><div class="note">Se guarda al salir de cada casilla. Deja la casilla vacía o en 0 para quitar el metrado de ese piso.</div>'}
  h+='</div></div>';main.innerHTML=h;pvWire(main);
  /* un dato que llega mientras escribes no te saca de la casilla */
  if(keep){const i=main.querySelector(`input[data-pcq="${CSS.escape(keep.pc)}"][data-piso="${CSS.escape(keep.piso)}"]`);if(i){i.value=keep.v;i.focus()}}}
const pcId=(d,pc,piso,zona)=>`${d}_${pc}_${piso}_${zona||'-'}`;
async function pcPut(d,pc,piso,zona,q){const id=pcId(d,pc,piso,zona);const old=PMET.get(id);
  if(!(q>0)){if(!old||old.arch||!(+old.q>0))return;const doc={...old,arch:{t:NOW(),by:me.email||'',n:me.name||''},by:me.email||'',byN:me.name||'',ts:NOW()};delete doc.id;PMET.set(id,{...doc,id});
    try{await fcol('pmet').doc(id).set(doc)}catch(err){toast('No se pudo quitar: '+(err.code||err.message))}return}
  if(old&&!old.arch&&+old.q===q)return;
  const doc={pc,d,piso,zona:zona||'',q,by:me.email||'',byN:me.name||'',ts:NOW(),arch:null};if(old)doc.h=[...(old.h||[]),{q:old.arch?0:old.q,by:old.by||'',ts:old.ts||0}].slice(-10);
  PMET.set(id,{...doc,id});try{await fcol('pmet').doc(id).set(doc)}catch(err){toast('No se pudo guardar: '+(err.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(err.code||err.message)))}}
/* detalle de una partida en el día: filas por piso y sector/ambiente */
function pcDetOpen(pc){const x=pcTpc().get(pc);if(!x)return;const d=PCD;
  const draw=()=>{const R=[...PMET.values()].filter(r=>r.d===d&&r.pc===pc&&!r.arch&&+r.q>0).sort((a,b)=>String(a.piso).localeCompare(String(b.piso))||String(a.zona).localeCompare(String(b.zona)));
    const pis=pisos();const zs=pid=>[...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid).sort(byOrder).map(s=>`<option value="${esc(s.id)}">${esc(s.code)} · ${esc(s.name)}</option>${[...S.amb.values()].filter(a=>a.sectorId===s.id).sort(byOrder).map(a=>`<option value="${esc(a.id)}">&nbsp;&nbsp;${esc(a.code||'')} ${esc(a.name||'')}</option>`).join('')}`).join('');
    const sh=pvSheet('pvsheet',`<div class="ksh"><div><b>${esc(x.cod||'')} · ${esc(x.nom||'')}</b><span>${fmtD(d)} · ${esc(x.und||'')}</span></div><button class="ib" data-pd="x" aria-label="Cerrar">✕</button></div>
      ${R.length?`<table class="t"><thead><tr><th>Piso</th><th>Sector / ambiente</th><th class="r">Metrado</th><th></th></tr></thead><tbody>${R.map(r=>`<tr><td>${esc((S.pis.get(r.piso)||{}).code||'—')}</td><td>${esc(pvZona(r))}</td><td class="r">${pvN(r.q)}</td><td class="r"><button class="ib" data-pd="del" data-id="${esc(r.id)}">Quitar</button></td></tr>`).join('')}</tbody></table>`:'<div class="note">Sin metrado este día.</div>'}
      <fieldset class="pvf"><legend>Agregar</legend><div class="pvf2"><label class="pvf">Piso <b class="pvreq">*</b><select data-pd="piso"><option value="">Elige…</option>${pis.map(p=>`<option value="${esc(p.id)}">${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label>
        <label class="pvf">Sector o ambiente (opcional)<select data-pd="zona" disabled><option value="">Todo el piso</option></select></label></div>
        <div class="pvf2"><label class="pvf">Metrado <b class="pvreq">*</b><span class="pvin"><input type="number" inputmode="decimal" min="0" step="any" data-pd="q"><span>${esc(x.und||'')}</span></span></label><div class="pvact"><span class="sp"></span><button class="ib pri" data-pd="ok">Agregar</button></div></div></fieldset>`);
    const sc=sh.querySelector('.ksc');
    sc.querySelector('[data-pd="piso"]').onchange=e=>{const z=sc.querySelector('[data-pd="zona"]');z.innerHTML='<option value="">Todo el piso</option>'+(e.target.value?zs(e.target.value):'');z.disabled=!e.target.value};
    sc.onclick=async e=>{const b=e.target.closest('button[data-pd]');if(!b)return;const k=b.dataset.pd;if(k==='x'){sh.remove();requestRender();return}
      if(k==='del'){const r=PMET.get(b.dataset.id);if(r){await pcPut(r.d,r.pc,r.piso,r.zona,0);draw()}return}
      if(k==='ok'){const piso=sc.querySelector('[data-pd="piso"]').value,zona=sc.querySelector('[data-pd="zona"]').value,q=+String(sc.querySelector('[data-pd="q"]').value).replace(',','.');
        if(!piso){toast('Elige el piso');return}if(!(q>0)){toast('Escribe el metrado (mayor que 0)');return}
        const old=PMET.get(pcId(d,pc,piso,zona));await pcPut(d,pc,piso,zona,(old&&!old.arch?+old.q:0)+q);draw()}}};
  draw()}
function pcChange(e){{const i=e.target;if(i.dataset.pcq!==undefined&&U.pvV==='reg'){const v=i.value===''?0:+String(i.value).replace(',','.');if(!(v>=0)){toast('Escribe un número');return}pcPut(PCD,i.dataset.pcq,i.dataset.piso,'',v)}
  if(i.dataset.pc==='d'&&i.value){PCD=i.value>todayIso()?todayIso():i.value;requestRender()}if(i.dataset.pc==='all'){U.pcAll=i.checked;saveUI();requestRender()}}}
