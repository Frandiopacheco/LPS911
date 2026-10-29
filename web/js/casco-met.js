"use strict";
/* LPS 911 · Casco › pestaña Metrados (data-tab «met», solo en el módulo Casco). Decidido con el dueño el 28-10-2026.
   Tres vistas (U.kmV): Calculado (tipos de elemento + planilla por nivel + despiece + resumen por sector), Por ratio (área × incidencia)
   y Parámetros (tabla del plano: traslapes, ganchos, recubrimientos, varilla; se exporta e importa en Excel).
   Datos en la colección kmet (cs_kmet): «par» parámetros, «tipos» {L:[tipo]}, «n_<nivel>» {rows:[fila]}. El cálculo está en
   casco-met-calc.js. «Aplicar a los sectores» escribe el metrado en cada sector (ambientes.met[partida], mo[partida]='c').
   Detalle en docs/ia/casco.md «Metrados». */

const KM={par:null,tipos:[],lv:new Map(),vg:new Map(),ok:false};
const KMQ=new Set(),KMT={};const KMH=[];
const MET={sel:null,tsel:null};
let kmSub=null;
const kmF=(v,d)=>(+v||0).toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d});
const kmP=()=>kmPar(KM.par);
const kmV=()=>['calc','vig','ratio','par'].includes(U.kmV)?U.kmV:'calc';

function kmEnsure(){if(kmSub||!db||!CS())return;
  kmSub=fcol('kmet').onSnapshot(sn=>{sn.docs.forEach(d=>{const id=d.id;if(KMQ.has(id))return;const v=d.data()||{};
      if(id==='par')KM.par=v;else if(id==='tipos')KM.tipos=Array.isArray(v.L)?v.L:[];else if(id.startsWith('n_'))KM.lv.set(id.slice(2),Array.isArray(v.rows)?v.rows:[]);else if(id.startsWith('v_'))KM.vg.set(id.slice(2),Array.isArray(v.L)?v.L:[])});
    KM.ok=true;if(U.tab==='met')requestRender()},()=>{KM.ok=true});
  unsubs.push(()=>{if(kmSub)kmSub();kmSub=null;KM.par=null;KM.tipos=[];KM.lv.clear();KM.vg.clear();KM.ok=false})}

/** guarda un documento de kmet (500 ms después del último cambio); lo local manda mientras espera */
const kmDocOf=id=>id==='par'?KM.par:id==='tipos'?{L:KM.tipos}:id.startsWith('v_')?{L:KM.vg.get(id.slice(2))||[]}:{rows:KM.lv.get(id.slice(2))||[]};
function kmPut(id,data,label){const prev=kmDocOf(id);
  KMH.push({id,prev:JSON.stringify(prev||{}),label});if(KMH.length>80)KMH.shift();kmSetLocal(id,data);kmSave(id)}
function kmSetLocal(id,data){if(id==='par')KM.par=data;else if(id==='tipos')KM.tipos=data.L||[];else if(id.startsWith('v_'))KM.vg.set(id.slice(2),data.L||[]);else KM.lv.set(id.slice(2),data.rows||[])}
function kmSave(id){KMQ.add(id);clearTimeout(KMT[id]);KMT[id]=setTimeout(()=>{const data=kmDocOf(id);
  fcol('kmet').doc(id).set(JSON.parse(JSON.stringify({...data,t:NOW(),by:me.email}))).then(()=>KMQ.delete(id)).catch(e=>{KMQ.delete(id);toast('No se pudo guardar el metrado: '+(e&&e.code||e))})},500)}
function kmUndo(){const h=KMH.pop();if(!h){toast('No hay nada que deshacer en Metrados.');return}kmSetLocal(h.id,JSON.parse(h.prev));kmSave(h.id);requestRender();toast('Deshecho: '+(h.label||'último cambio'))}

/* ---------- nivel, sectores y partidas ---------- */
/* frente de trabajo del sector (sectors.fr, casco-sz.js); sin frente: null */
const kmFrOf=a=>{const s=csSecOf(a);return s&&s.fr?KFR.get(s.fr)||null:null};
/** sectores del nivel en orden de vaciado: grupo, frente (el orden de Sectorización: entre dos frentes el traslape va al primero; decidido con el dueño, 29-10-2026) y sector */
function kmSecs(pid){const fo=new Map(csFrs().map((f,i)=>[f.id,i]));const out=[];
  for(const s of S.sec.values()){if(s.pisoId!==pid)continue;const f=s.fr&&fo.has(s.fr)?fo.get(s.fr):-1;for(const a of S.amb.values())if(a.sectorId===s.id&&!a.fus)out.push({a,grp:s.grp||'E',f})}
  return out.sort((x,y)=>CSG_ORD.indexOf(x.grp)-CSG_ORD.indexOf(y.grp)||x.f-y.f||byOrder(x.a,y.a)).map(o=>o.a)}
function kmCtx(pid){const secs=kmSecs(pid);const byCode=new Map(secs.map(a=>[String(a.code||'').toUpperCase(),a.id]));const ord=new Map(secs.map((a,i)=>[a.id,i]));
  const fr=new Map(secs.map(a=>[a.id,kmFrOf(a)]));const secByCode=c=>byCode.get(String(c).toUpperCase())||null;
  /* frOf(código) → frente del sector (o null); nFr: frentes distintos con sectores en este nivel */
  return{secs,secByCode,secOrd:s=>ord.has(s)?ord.get(s):999,frOf:c=>{const id=secByCode(c);return id?fr.get(id)||null:null},nFr:new Set([...fr.values()].filter(Boolean).map(f=>f.id)).size}}
const kmSecCol=(secs,id)=>{const i=secs.findIndex(a=>a.id===id);return i<0?'var(--muted)':CS_SCOL[i%CS_SCOL.length]};
const kmRows=pid=>KM.lv.get(pid)||[];
const kmTipo=id=>KM.tipos.find(t=>t.id===id)||null;
/** partida del catálogo para cada salida: la elegida en Parámetros, la típica (k-AV…) o la del mismo nombre */
function kmCat(P,k){const o=KM_OUT.find(x=>x[0]===k);const pick=P.map[k];if(pick&&MX.cat.get(pick)&&!MX.cat.get(pick).arch)return MX.cat.get(pick);
  const t=MX.cat.get('k-'+o[3]);if(t&&!t.arch)return t;const f=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();return[...MX.cat.values()].find(c=>!c.arch&&f(c.name)===f(o[1]))||null}
/** m² de planta del sector (dibujo en la lámina del nivel con escala del módulo Planos) */
function kmArea(a){try{const s=csSecOf(a);if(!s)return null;const lam=csLamOf(s.pisoId,s.grp);const g=typeof cnvGeo==='function'?cnvGeo(a,lam):null;const mpp=csScale(lam).mpp;return g&&mpp?csPolyA(csUnflat(g))*mpp*mpp:null}catch(e){return null}}

/* ---------- tipos de elemento ---------- */
function kmTipoNew(cl){const id=uid('kt');const n=KM.tipos.filter(t=>t.cl===cl).length+1;
  const T={vig:{cod:'V-'+n,b:0.25,h:0.50,el:0.20,a:0.30,L:[{p:'sup',s:'2Ø5/8',t:'c',k:3},{p:'inf',s:'2Ø5/8',t:'c',k:3},{p:'sup',s:'1Ø5/8',t:'ba',k:3}],est:[{d:'3/8',z:'1@.05, 10@.10, r@.25',f:'r'}]},
    col:{cod:'C-'+n,b:0.30,h:0.60,hv:0.50,L:[{s:'8Ø3/4'}],est:[{d:'3/8',z:'1@.05, 7@.10, r@.25',f:'r'}]},
    pla:{cod:'P-'+n,b:0.25,h:2.00,hv:0.50,mv:'Ø3/8@.20',mh:'Ø3/8@.25',cap:2,nuc:{n:2,s:'6Ø5/8',ln:0.40,est:[{d:'3/8',z:'1@.05, r@.15',f:'r'}]}},
    ali:{cod:'AL-'+n,h:0.20,a:0.25,L:[{p:'inf',s:'1Ø1/2',t:'c',k:3},{p:'sup',s:'1Ø3/8',t:'ba',k:3}],tem:'Ø1/4@.25'},
    mac:{cod:'LM-'+n,h:0.20,a:0.25,mi:'Ø3/8@.20',ms:''},mur:{cod:'M-'+n}}[cl];return{id,cl,...T}}
function kmDesc(T){const L=(T.L||[]).map(l=>l.s).filter(Boolean).join(' + ');
  if(T.cl==='vig')return`${Math.round(T.b*100)}×${Math.round(T.h*100)} · ${L}`;if(T.cl==='col')return`${Math.round(T.b*100)}×${Math.round(T.h*100)} · ${L}`;
  if(T.cl==='pla')return`e=${Math.round(T.b*100)} · L=${kmF(T.h,2)} · ${T.mv||''}`;if(T.cl==='ali')return`h=${Math.round((T.h||0)*100)} · ${L}`;if(T.cl==='mac')return`e=${Math.round((T.h||0)*100)} · ${T.mi||''}`;return'Asentado en m²'}
function kmTipoSave(T,label){const L=KM.tipos.map(t=>t.id===T.id?T:t);if(!KM.tipos.some(t=>t.id===T.id))L.push(T);kmPut('tipos',{L},label||'Tipo '+T.cod)}

/** sección del tipo dibujada (svg 200×200, colores del tema) */
function kmSvg(T){if(!T)return'';const S0=200;let h='';const R=(x,y,w,hh,c,f)=>{h+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0,w).toFixed(1)}" height="${Math.max(0,hh).toFixed(1)}" class="${c}"${f?` rx="${f}"`:''}/>`};
  const dot=(x,y,r,o)=>{h+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="${o?'kbo':'kb'}"/>`};const dmm={'6mm':6,'1/4':6.4,'8mm':8,'3/8':9.5,'12mm':12,'1/2':12.7,'5/8':15.9,'3/4':19.1,'1':25.4,'1 3/8':34.9};
  const first=s=>{const b=kmSpec(s);return b&&!b.err?b:[]};
  if(T.cl==='vig'||T.cl==='col'){const b=+T.b||0.25,hh=+T.h||0.5,s=150/Math.max(b,hh),w=b*s,H=hh*s,x0=(S0-w)/2,y0=(S0-H)/2,ci=0.04*s;R(x0,y0,w,H,'kc');R(x0+ci,y0+ci,w-2*ci,H-2*ci,'ke',3);
    const rd=d=>Math.max(3,(dmm[d]||12)/1000*s*0.8);
    if(T.cl==='vig'){const row=(L,y,o)=>{const n=L.reduce((a,x)=>a+x.n,0);let i=0;for(const x of L)for(let j=0;j<x.n;j++,i++){const r=rd(x.d),a=x0+ci+r+2,bb=x0+w-ci-r-2;dot(n===1?(a+bb)/2:a+(bb-a)*i/(n-1),y,r,o)}};
      const sup=[],inf=[],bas=[];for(const l of T.L||[]){const L=first(l.s);if(l.t==='c')(l.p==='inf'?inf:sup).push(...L);else bas.push(...L)}
      const r1=rd((sup[0]||{}).d),r2=rd((inf[0]||{}).d);row(sup,y0+ci+r1+2,false);row(bas,y0+ci+3*r1+6,true);row(inf,y0+H-ci-r2-2,false)}
    else{const L=[];for(const l of T.L||[])L.push(...first(l.s));const n=L.reduce((a,x)=>a+x.n,0);const d=(L[0]||{}).d;const r=rd(d),a=x0+ci+r+2,bb=x0+w-ci-r-2,c=y0+ci+r+2,e=y0+H-ci-r-2;
      const pts=[[a,c],[bb,c],[a,e],[bb,e]];const rest=Math.max(0,n-4);const lng=H>=w;const perSide=Math.ceil(rest/2);
      for(let k=1;k<=perSide;k++){const t=k/(perSide+1);if(lng){pts.push([a,c+(e-c)*t]);if(pts.length<n)pts.push([bb,c+(e-c)*t])}else{pts.push([a+(bb-a)*t,c]);if(pts.length<n)pts.push([a+(bb-a)*t,e])}}
      pts.slice(0,n).forEach(p=>dot(p[0],p[1],r))}}
  else if(T.cl==='pla'){const e=+T.b||0.25,L=+T.h||2,s=180/Math.max(L,e*6),w=L*s,H=e*s,x0=(S0-w)/2,y0=(S0-H)/2;R(x0,y0,w,H,'kc');const ln=+(T.nuc||{}).ln||0;
    if(+(T.nuc||{}).n>0&&ln>0){R(x0+2,y0+2,ln*s-4,H-4,'ke',2);R(x0+w-ln*s+2,y0+2,ln*s-4,H-4,'ke',2)}const M=kmMalla(T.mv);if(M&&!M.err){const st=Math.max(6,M.s*s);for(let x=x0+6;x<x0+w-4;x+=st){dot(x,y0+4,1.8);dot(x,y0+H-4,1.8)}}}
  else if(T.cl==='ali'){const s=150/0.40,x0=(S0-0.40*s)/2,hh=+T.h||0.20,y0=(S0-hh*s)/2;R(x0,y0+0.05*s,0.15*s,(hh-0.05)*s,'kl');R(x0+0.25*s,y0+0.05*s,0.15*s,(hh-0.05)*s,'kl');R(x0,y0,0.40*s,0.05*s,'kc');R(x0+0.15*s,y0+0.05*s,0.10*s,(hh-0.05)*s,'kc');
    for(let i=0;i<5;i++)dot(x0+0.04*s+i*0.08*s,y0+0.025*s,2.2);dot(S0/2,y0+(hh-0.03)*s,4.5);dot(S0/2,y0+0.07*s,3.6,true)}
  else if(T.cl==='mac'){const s=170/1.2,hh=+T.h||0.2,x0=15,y0=(S0-hh*s)/2;R(x0,y0,1.2*s,hh*s,'kc');const mi=kmMalla(T.mi),ms=kmMalla(T.ms);
    if(mi&&!mi.err)for(let x=x0+6;x<x0+1.2*s-4;x+=Math.max(8,mi.s*s))dot(x,y0+hh*s-5,2.6);if(ms&&!ms.err)for(let x=x0+6;x<x0+1.2*s-4;x+=Math.max(8,ms.s*s))dot(x,y0+5,2.6)}
  else{for(let r=0;r<6;r++)for(let c=0;c<4;c++)R(20+c*42+(r%2?21:0),40+r*20,38,16,'kl')}
  return`<svg class="kmsv" viewBox="0 0 200 200" role="img" aria-label="Sección de ${esc(T.cod||'')}">${h}</svg>`}

/* ---------- dibujo de la pestaña ---------- */
function renderMet(main){if(!CS()){main.innerHTML='<div class="scroll"><div class="wrap"><div class="callout">Metrados es del módulo Casco.</div></div></div>';return}
  kmEnsure();if(typeof ensureMcat==='function')ensureMcat();if(typeof ensurePlanos==='function')try{ensurePlanos()}catch(e){}
  const API=window.__plano;if(!API||!API.basesOf){if(typeof loadPlanoMod==='function')loadPlanoMod().then(()=>{if(window.__plano&&window.__plano.ensureLam)window.__plano.ensureLam();requestRender()}).catch(()=>{})}
  /* conservar foco y desplazamiento al redibujar */
  const ae=document.activeElement,fk=ae&&main.contains(ae)&&ae.dataset&&(ae.dataset.kk||null);{const e0=main.querySelector('.kvsc');KV.sx=e0?e0.scrollLeft:null}const sc=main.querySelector('.scroll'),st=sc?sc.scrollTop:0;const pb=main.querySelector('.kmpbox'),pst=pb?pb.scrollTop:0;
  const v=kmV(),ed=csEd();const p=U.piso?S.pis.get(U.piso):null;
  const seg=`<div class="seg kmseg" role="group" aria-label="Vista de metrados">${[['calc','Elementos'],['vig','Vigas'],['ratio','Por ratio'],['par','Parámetros']].map(([k,l])=>`<button type="button" data-kmv="${k}" class="${v===k?'on':''}" aria-pressed="${v===k}">${l}</button>`).join('')}</div>`;
  const acts=`${seg}${ed?`<button type="button" class="ib" data-km="undo" title="Deshacer el último cambio de Metrados"${KMH.length?'':' disabled'}>↶ Deshacer</button>`:''}`;
  let body='';
  if(v==='par')body=kmParHtml(ed);
  else if(!p)body=`<div class="card"><div class="pad"><p>Elige el nivel que vas a metrar.</p><div class="kmlv">${pisos().map(x=>`<button type="button" class="ib" data-kmpiso="${esc(x.id)}">${esc(csPisoTag(x,'E')||x.name)}</button>`).join('')}</div></div></div>`;
  else body=v==='ratio'?kmRatioHtml(p):v==='vig'?kvHtml(p,ed):kmCalcHtml(p,ed);
  main.innerHTML=`<div class="scroll"><div class="wrap wrapw km">${pageHead('Metrados',p&&v!=='par'?`${esc(p.name||'')} · ${esc(csPisoTag(p,'E'))}`:'Casco',acts)}${body}</div></div>`;
  main.onclick=kmClick;main.onchange=kmChange;main.oninput=null;main.onpointerdown=v==='vig'?kvDown:null;
  const sc2=main.querySelector('.scroll');if(sc2)sc2.scrollTop=st;const pb2=main.querySelector('.kmpbox');if(pb2)pb2.scrollTop=pst;const ev=main.querySelector('.kvsc');if(ev&&KV.sx!=null)ev.scrollLeft=KV.sx;
  if(fk){const el=main.querySelector(`[data-kk="${CSS.escape(fk)}"]`);if(el){el.focus();try{if(el.select&&el.type==='text')el.select()}catch(e){}}}}

function kmCalcHtml(p,ed){const P=kmP();const C=kmCtx(p.id);const rows=kmRows(p.id);const R=kmLevel(rows,KM.tipos,P,C);const dis=ed?'':' disabled';
  if(!MET.sel||!rows.some(r=>r.id===MET.sel))MET.sel=rows[0]?rows[0].id:null;const selRow=rows.find(r=>r.id===MET.sel);
  if(selRow)MET.tsel=selRow.t;if(!MET.tsel||!kmTipo(MET.tsel))MET.tsel=KM.tipos[0]?KM.tipos[0].id:null;const selT=kmTipo(MET.tsel);
  /* tipos */
  const tl=KM.tipos.map(T=>{const q=kmQ(T,R.tipo[T.id],P);const n=(R.tipo[T.id]||{}).n||0;return`<button type="button" class="kmti${T.id===MET.tsel?' on':''}${q&&q.out?' warn':''}" data-kmt="${esc(T.id)}">
      <span class="kmtt"><b>${esc(T.cod)}</b> <span class="mu">${esc(KM_CL[T.cl]||'')}</span>${q?`<i class="mono">${kmF(q.q,0)} kg/m³</i>`:''}</span><small>${esc(kmDesc(T))} · ${n} fila${n===1?'':'s'}</small>${q&&q.out?`<small class="kmw">Fuera del rango (${q.rg[0]}–${q.rg[1]} kg/m³): revisa el armado</small>`:''}</button>`}).join('');
  const tAdd=ed?`<div class="kmadd">${Object.entries(KM_CL).map(([k,l])=>`<button type="button" class="ib" data-kmtnew="${k}">+ ${esc(l)}</button>`).join('')}</div>`:'';
  const tipos=`<section class="card kmcol kmtip"><div class="kmh"><b>Tipos de elemento</b><span class="mu">el armado se escribe una vez</span></div><div class="kmtl">${tl||'<p class="mu pad">Crea los tipos (V-101, C-1…) con su armado tal como está en el plano.</p>'}</div>${tAdd}
    ${selT?`<div class="kmprev">${kmSvg(selT)}<div class="kmpt"><b>${esc(selT.cod)}</b> <span class="mu">${esc(KM_CL[selT.cl])}</span><div class="mu">${esc(kmDesc(selT))}</div>${ed?`<button type="button" class="ib pri" data-kmted="${esc(selT.id)}">Editar armado</button>`:`<button type="button" class="ib" data-kmted="${esc(selT.id)}">Ver armado</button>`}</div></div>`:''}</section>`;
  /* planilla */
  const fsec=U.kmSec&&C.secs.some(a=>a.id===U.kmSec)?U.kmSec:'';
  const chips=`<button type="button" class="chip${!fsec?' on':''}" data-kmsec="">Todos</button>`+C.secs.map(a=>`<button type="button" class="chip${fsec===a.id?' on':''}" data-kmsec="${esc(a.id)}" style="--kc:${kmSecCol(C.secs,a.id)}">${esc(a.code||a.name)}</button>`).join('');
  const secOpt=sel=>C.secs.map(a=>`<option value="${esc(a.id)}"${a.id===sel?' selected':''}>${esc(a.code||a.name)}</option>`).join('')+(sel&&!C.secs.some(a=>a.id===sel)?`<option value="${esc(sel)}" selected>(sin sector)</option>`:'');
  const tOpt=sel=>KM.tipos.map(t=>`<option value="${esc(t.id)}"${t.id===sel?' selected':''}>${esc(t.cod)}</option>`).join('')+(sel&&!kmTipo(sel)?'<option selected>(tipo borrado)</option>':'');
  const vis=rows.filter(r=>!fsec||r.sec===fsec||(R.rows[r.id]&&R.rows[r.id].al[fsec]));let tc=0,te=0,tk=0;
  const tr=vis.map(r=>{const o=R.rows[r.id]||kmNew();const T=kmTipo(r.t);const cl=T?T.cl:'vig';const conc=Object.values(o.al).reduce((s,x)=>s+(x.vv||0)+(x.vl||0),0);const enc=Object.values(o.al).reduce((s,x)=>s+(x.ev||0)+(x.ef1||0)+(x.ef2||0),0);
    tc+=conc;te+=enc;tk+=o.kg;const k=f=>`data-kr="${esc(r.id)}" data-kf="${f}" data-kk="${esc(r.id)}|${f}"`;
    const vert=cl==='col'||cl==='pla';const main=vert?`<input class="ci" ${k('al')} value="${esc(r.al??'')}" placeholder="altura m" inputmode="decimal" aria-label="Altura de piso a piso"${dis}>`:`<input class="ci" ${k('lu')} value="${esc(r.lu??'')}" placeholder="5.35 + 4.80" aria-label="Luces libres"${dis}>`;
    const extra=cl==='ali'||cl==='mac'?`<input class="ci num" ${k('an')} value="${esc(r.an??'')}" placeholder="ancho m" inputmode="decimal" aria-label="Ancho del paño"${dis}>`:cl==='mur'?`<input class="ci num kmsm" ${k('al')} value="${esc(r.al??'')}" placeholder="alto" inputmode="decimal" aria-label="Alto del muro"${dis}><input class="ci num kmsm" ${k('vn')} value="${esc(r.vn??'')}" placeholder="vanos m²" inputmode="decimal" aria-label="Vanos en m²"${dis}>`:'<span class="mu">—</span>';
    return`<tr class="${r.id===MET.sel?'on':''}${o.err.length?' bad':''}" data-krow="${esc(r.id)}"><td><span class="kmsw" style="background:${kmSecCol(C.secs,r.sec)}"></span><select class="ci" ${k('sec')} aria-label="Sector"${dis}>${secOpt(r.sec)}</select></td>
      <td><select class="ci" ${k('t')} aria-label="Tipo"${dis}>${tOpt(r.t)}</select></td><td><input class="ci" ${k('eje')} value="${esc(r.eje??'')}" placeholder="Eje A, 1–3" aria-label="Eje o tramo"${dis}></td>
      <td>${main}</td><td class="kmx">${extra}</td><td><input class="ci num kmsm" ${k('v')} value="${esc(r.v??1)}" inputmode="numeric" aria-label="Veces"${dis}></td>
      <td class="n">${conc?kmF(conc,2):'—'}</td><td class="n">${enc?kmF(enc,1):'—'}</td><td class="n"><b>${o.kg?kmF(o.kg,0):'—'}</b>${o.err.length?` <span class="kmerr" title="${esc(o.err.join(' · '))}">⚠</span>`:''}</td>
      <td class="kma">${ed?`<button type="button" class="kx" data-kmdup="${esc(r.id)}" title="Duplicar fila" aria-label="Duplicar fila">⧉</button><button type="button" class="kx" data-kmdel="${esc(r.id)}" title="Eliminar fila" aria-label="Eliminar fila">×</button>`:''}</td></tr>`}).join('');
  const so=selRow?R.rows[selRow.id]:null;const sT=selRow?kmTipo(selRow.t):null;
  const desp=so?`<div class="kmdes"><div class="kmh"><b>Despiece · ${esc(sT?sT.cod:'')} ${esc(selRow.eje||'')}</b><span class="mu">con traslapes, ganchos y varillas de ${kmF(P.lv,0)} m de Parámetros${+selRow.v>1?` · incluye las ${esc(selRow.v)} veces`:''}</span></div>
    ${so.err.length?`<div class="callout warnc">${so.err.map(esc).join('<br>')}</div>`:''}
    <div class="tscroll"><table class="t kmt"><thead><tr><th>Barra</th><th class="n">Ø</th><th class="n">N.º</th><th class="n">Long. c/u m</th><th class="n">kg/m</th><th class="n">kg</th></tr></thead><tbody>
    ${so.bars.map(b=>`<tr><td>${esc(b.m)}</td><td class="n">${esc(KM_DK[b.d]?KM_DK[b.d][1]:b.d)}</td><td class="n">${kmF(b.n,0)}</td><td class="n">${kmF(b.l,2)}</td><td class="n">${kmF(P.dia[b.d].kg,3)}</td><td class="n">${kmF(b.kg,1)}</td></tr>`).join('')||'<tr><td colspan="6" class="mu">Sin barras.</td></tr>'}
    </tbody><tfoot><tr><td colspan="5">Total${so.cq>0?` · cuantía ${kmF(so.kg/so.cq,0)} kg/m³`:''}${so.lad?` · ${kmF(so.lad,0)} ladrillos de techo`:''}</td><td class="n">${kmF(so.kg,1)}</td></tr></tfoot></table></div></div>`:'';
  const pla=`<section class="card kmcol kmpla"><div class="kmh"><b>Planilla</b><span class="kmchips">${chips}</span>${ed?`<button type="button" class="ib" data-km="add"${KM.tipos.length?'':' disabled title="Primero crea un tipo"'}>+ Fila</button>`:''}</div>
    <div class="kmpbox tscroll"><table class="t kmt kmrows"><thead><tr><th>Sector</th><th>Tipo</th><th>Eje / tramo</th><th title="Vigas y losas: luces libres entre caras, separadas por +. Un tramo de otro sector: S2:4.80. Columnas y placas: altura de piso a piso">Luces · altura</th><th title="Losas: ancho del paño. Muros: alto y vanos (m²)">Ancho · vanos</th><th>Veces</th><th class="n">Conc. m³</th><th class="n">Enc. m²</th><th class="n">Acero kg</th><th></th></tr></thead>
    <tbody>${tr||`<tr><td colspan="10" class="mu" style="padding:12px">${KM.tipos.length?'Agrega filas: cada una es un elemento (o varios iguales) con su sector y sus luces.':'Primero crea los tipos de elemento a la izquierda.'}</td></tr>`}</tbody>
    <tfoot><tr><td colspan="6">Total ${fsec?esc((C.secs.find(a=>a.id===fsec)||{}).code||''):'del nivel'}${R.err?` · <span class="kmw">${R.err} fila${R.err>1?'s':''} con avisos</span>`:''}</td><td class="n">${kmF(tc,2)}</td><td class="n">${kmF(te,1)}</td><td class="n">${kmF(tk,0)}</td><td></td></tr></tfoot></table></div>${desp}</section>`;
  return`<div class="kmbar">${ed?`<button type="button" class="ib" data-km="xls">Exportar Excel</button><button type="button" class="ib" data-km="imp">Importar planilla</button><button type="button" class="ib" data-km="copy">Copiar al nivel siguiente</button><button type="button" class="ib pri" data-km="apply">Aplicar a los sectores</button>`:`<button type="button" class="ib" data-km="xls">Exportar Excel</button>`}</div>
    <div class="kmg">${tipos}${pla}${kmResHtml(p,C,kvMerge(R,p.id,P,C),P)}</div>`}

function kmResHtml(p,C,R,P){const outs=KM_OUT.filter(o=>C.secs.some(a=>(R.sec[a.id]||{})[o[0]]>0));const secs=C.secs.filter(a=>R.sec[a.id]);
  const steel=['av','avg','alo'];const ratAc=steel.reduce((s,k)=>{const c=kmCat(P,k);return s+(c&&c.rat>0?+c.rat:0)},0);
  const chk=secs.map(a=>{const x=R.sec[a.id]||{};const kg=steel.reduce((s,k)=>s+(x[k]||0),0);const A=kmArea(a);if(!(A>0)||!(ratAc>0))return`<li><b style="color:${kmSecCol(C.secs,a.id)}">${esc(a.code)}</b> ${kmF(kg,0)} kg <span class="mu">${A>0?'sin incidencias':'sin área dibujada'}</span></li>`;
    const q=kg/A,d=(q-ratAc)/ratAc*100,bad=Math.abs(d)>15;return`<li><b style="color:${kmSecCol(C.secs,a.id)}">${esc(a.code)}</b> ${kmF(kg,0)} kg · ${kmF(q,1)} kg/m² <span class="kmbd ${bad?'warn':'ok'}">${d>0?'+':''}${kmF(d,0)} %${bad?(d<0?' · ¿falta algo?':' · revisa'):''}</span></li>`}).join('');
  return`<section class="card kmcol kmres"><div class="kmh"><b>Resumen por sector</b><span class="mu">en las partidas del tren</span></div>
    ${outs.length?`<div class="tscroll"><table class="t kmt"><thead><tr><th>Partida</th>${secs.map(a=>`<th class="n" style="color:${kmSecCol(C.secs,a.id)}">${esc(a.code||a.name)}</th>`).join('')}</tr></thead><tbody>
    ${outs.map(o=>{const c=kmCat(P,o[0]);return`<tr><td>${esc(c?c.name:o[1])} <span class="mu">${o[2]}</span>${c?'':' <span class="kmw" title="Elige la partida en Parámetros › Partidas del tren">sin partida</span>'}</td>${secs.map(a=>{const v=(R.sec[a.id]||{})[o[0]];const cur=c&&a.met?a.met[c.id]:null;
      return`<td class="n" title="${cur!=null?'En el sector hoy: '+kmF(cur,o[2]==='kg'?0:1)+(a.mo&&c&&a.mo[c.id]==='c'?' (calculado)':''):'El sector no tiene metrado en esta partida'}">${v>0?kmF(v,o[2]==='kg'?0:o[2]==='m³'?2:1):'—'}</td>`}).join('')}</tr>`}).join('')}</tbody></table></div>`:'<p class="mu pad">Aún no hay cantidades.</p>'}
    <div class="kmchk"><div class="kml">Control · acero kg/m² de planta frente al ratio (${ratAc>0?kmF(ratAc,1)+' kg/m²':'sin incidencias'})</div><ul>${chk||'<li class="mu">Sin datos.</li>'}</ul></div></section>`}

function kmRatioHtml(p){const C=kmCtx(p.id);const cats=csCats().filter(c=>c.rat>0);
  return`<div class="card"><h2>Por ratio <span class="sub">Área de planta del sector × incidencia de la partida (Sectorización › Sectores › Por partida). Sirve mientras un sector no tiene metrado calculado.</span></h2>
    <div class="tscroll"><table class="t kmt"><thead><tr><th>Sector</th><th class="n">Área m²</th>${cats.map(c=>`<th class="n" title="${esc(c.name)}">${esc(c.name)}<br><span class="mu">×${kmF(c.rat,2)} ${esc(c.und||'')}/m²</span></th>`).join('')}</tr></thead><tbody>
    ${C.secs.map(a=>{const A=kmArea(a);return`<tr><td><span class="kmsw" style="background:${kmSecCol(C.secs,a.id)}"></span>${esc(a.code||a.name)}</td><td class="n">${A>0?kmF(A,1):'—'}</td>${cats.map(c=>{const calc=a.mo&&a.mo[c.id]==='c';const cur=a.met?a.met[c.id]:null;
      return`<td class="n${calc?' kmcalc':''}" title="${calc?'Este sector usa el metrado calculado: '+kmF(cur,1):'En el sector hoy: '+(cur!=null?kmF(cur,1):'—')}">${A>0?kmF(A*c.rat,c.und==='kg'?0:1):'—'}${calc?' <span class="kmbd ok">calc.</span>':''}</td>`}).join('')}</tr>`}).join('')||'<tr><td colspan="9" class="mu">Este nivel no tiene sectores.</td></tr>'}
    </tbody></table></div></div>`}

function kmParHtml(ed){const P=kmP();const dis=ed?'':' disabled';const inp=(path,val,lab,w)=>`<input class="ci num${w?' '+w:''}" data-kp="${path}" data-kk="p|${path}" value="${esc(val)}" inputmode="decimal" aria-label="${esc(lab)}"${dis}>`;
  const gen=[['lv','Longitud comercial de la varilla','m'],['vsp','Viguetas del aligerado a cada','m'],['lad.b','Ladrillo de techo: ancho','m'],['lad.l','Ladrillo de techo: largo','m'],['rec.vig','Recubrimiento de vigas','m'],['rec.col','Recubrimiento de columnas','m'],['rec.pla','Recubrimiento de placas','m'],['rec.los','Recubrimiento de losas','m']];
  const get=path=>path.split('.').reduce((o,k)=>o&&o[k],P);
  const cats=csCats();
  return`<div class="kmbar">${ed?'<button type="button" class="ib" data-km="pxls">Exportar Excel</button><button type="button" class="ib" data-km="pimp">Importar Excel</button><button type="button" class="ib" data-km="pdef">Restablecer valores típicos</button>':''}</div>
  ${helpBox('Copia aquí la tabla del plano','<p>Los valores que vienen son típicos de ejemplo. Reemplázalos por los del cuadro de especificaciones de tus planos (longitudes de traslape, ganchos estándar, recubrimientos). Puedes exportar a Excel, editar allá e importar.</p><p><b>Gancho 90°</b> es lo que el gancho estándar suma a la barra; <b>gancho 135°</b> es lo que suma cada gancho de estribo.</p>',!KM.par)}
  <div class="kmgp"><div class="card"><h2>Generales</h2><div class="tscroll"><table class="t kmt"><tbody>${gen.map(([k,l,u])=>`<tr><td>${esc(l)}</td><td>${inp(k,get(k),l)}</td><td class="mu">${u}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card kmwide"><h2>Por diámetro <span class="sub">longitudes en metros</span></h2><div class="tscroll"><table class="t kmt"><thead><tr><th>Ø</th><th class="n">Peso kg/m</th><th class="n" title="Barras inferiores (y todas en Elementos)">Traslape inferior</th><th class="n" title="Barras superiores de vigas (vista Vigas)">Traslape superior</th><th class="n">Gancho 90°</th><th class="n">Gancho 135° (estribo)</th></tr></thead><tbody>
    ${KM_DIA.map(([k,l])=>{const d=P.dia[k];return`<tr><td><b>${esc(l)}</b></td><td>${inp(`dia.${k}.kg`,d.kg,'Peso '+l)}</td><td>${inp(`dia.${k}.lt`,d.lt,'Traslape inferior '+l)}</td><td>${inp(`dia.${k}.lts`,d.lts,'Traslape superior '+l)}</td><td>${inp(`dia.${k}.g90`,d.g90,'Gancho 90° '+l)}</td><td>${inp(`dia.${k}.g135`,d.g135,'Gancho 135° '+l)}</td></tr>`}).join('')}</tbody></table></div></div>
  <div class="card"><h2>Rangos de cuantía <span class="sub">kg/m³; fuera de rango se marca para revisar</span></h2><div class="tscroll"><table class="t kmt"><thead><tr><th>Clase</th><th class="n">Mínimo</th><th class="n">Máximo</th></tr></thead><tbody>
    ${Object.keys(P.rg).map(k=>`<tr><td>${esc(KM_CL[k])}</td><td>${inp(`rg.${k}.0`,P.rg[k][0],'Mínimo '+KM_CL[k])}</td><td>${inp(`rg.${k}.1`,P.rg[k][1],'Máximo '+KM_CL[k])}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><h2>Partidas del tren <span class="sub">a qué partida del catálogo va cada cantidad</span></h2><div class="tscroll"><table class="t kmt"><tbody>
    ${KM_OUT.map(([k,l,u])=>{const c=kmCat(P,k);return`<tr><td>${esc(l)} <span class="mu">${u}</span></td><td><select class="ci" data-kp="map.${k}" data-kk="p|map.${k}" aria-label="Partida para ${esc(l)}"${dis}><option value="">— sin partida —</option>${cats.map(x=>`<option value="${esc(x.id)}"${c&&c.id===x.id?' selected':''}>${esc(x.name)}</option>`).join('')}</select></td></tr>`}).join('')}</tbody></table></div></div></div>`}

/* ---------- tipo: editor ---------- */
function kmTedOpen(id){MET.ted=id;kmTedDraw()}
function kmTedDraw(){const T=kmTipo(MET.ted);if(!T){lqClose();return}const ed=csEd(),dis=ed?'':' disabled';const P=kmP();const q=kmQ(T,null,P);
  const f=(k,lab,val,ph)=>`<label class="kmfl">${esc(lab)}<input class="ci${ph==='t'?'':' num'}" id="kte_${k}" data-kt="${k}" value="${esc(val??'')}"${ph&&ph!=='t'?` placeholder="${esc(ph)}"`:''}${dis}></label>`;
  const dOpt=sel=>KM_DIA.map(([k,l])=>`<option value="${k}"${k===sel?' selected':''}>${esc(l)}</option>`).join('');
  const lines=(arr,kind)=>`<table class="t kmt"><thead><tr>${kind==='beam'?'<th>Posición</th>':''}<th>Barras <span class="mu">(2Ø5/8 + 1Ø1/2)</span></th>${kind==='beam'?'<th>Tipo</th><th title="Corte de los bastones a L/k">Corte L/</th>':''}<th></th></tr></thead><tbody>
    ${(arr||[]).map((l,i)=>{const b=kmSpec(l.s);return`<tr>${kind==='beam'?`<td><select class="ci" id="kte_L${i}p" data-ktl="${i}" data-ktk="p"${dis}><option value="sup"${l.p!=='inf'?' selected':''}>Superior</option><option value="inf"${l.p==='inf'?' selected':''}>Inferior</option></select></td>`:''}
      <td><input class="ci" id="kte_L${i}s" data-ktl="${i}" data-ktk="s" value="${esc(l.s||'')}" placeholder="2Ø5/8"${dis}>${b&&b.err?`<div class="kmw">${esc(b.err)}</div>`:''}</td>
      ${kind==='beam'?`<td><select class="ci" id="kte_L${i}t" data-ktl="${i}" data-ktk="t"${dis}><option value="c"${l.t==='c'?' selected':''}>Corrido</option><option value="ba"${l.t==='ba'?' selected':''}>Bastón en apoyos</option><option value="bt"${l.t==='bt'?' selected':''}>Bastón en tramo</option></select></td><td><input class="ci num kmsm" id="kte_L${i}k" data-ktl="${i}" data-ktk="k" value="${esc(l.k??3)}"${l.t==='c'?' disabled':dis}></td>`:''}
      <td>${ed?`<button type="button" class="kx" data-ktdel="L${i}" aria-label="Quitar línea">×</button>`:''}</td></tr>`}).join('')}</tbody></table>${ed?`<button type="button" class="ib" data-ktadd="L">+ Línea de barras</button>`:''}`;
  const ests=(arr,pre)=>`<table class="t kmt"><thead><tr><th>Ø</th><th>Distribución desde cada extremo</th><th>Forma</th><th></th></tr></thead><tbody>
    ${(arr||[]).map((e,i)=>{const D=kmDist(e.z);return`<tr><td><select class="ci" id="kte_${pre}${i}d" data-kte="${pre}${i}" data-ktk="d"${dis}>${dOpt(e.d)}</select></td><td><input class="ci" id="kte_${pre}${i}z" data-kte="${pre}${i}" data-ktk="z" value="${esc(e.z||'')}" placeholder="1@.05, 10@.10, r@.25"${dis}>${D&&D.err?`<div class="kmw">${esc(D.err)}</div>`:''}</td>
      <td><select class="ci" id="kte_${pre}${i}f" data-kte="${pre}${i}" data-ktk="f"${dis}><option value="r"${(e.f||'r')==='r'?' selected':''}>Cerrado</option><option value="gb"${e.f==='gb'?' selected':''}>Gancho a lo ancho</option><option value="gh"${e.f==='gh'?' selected':''}>Gancho a lo alto</option></select></td><td>${ed?`<button type="button" class="kx" data-ktdel="${pre}${i}" aria-label="Quitar estribo">×</button>`:''}</td></tr>`}).join('')}</tbody></table>${ed?`<button type="button" class="ib" data-ktadd="${pre}">+ Estribo</button>`:''}`;
  let body='';
  if(T.cl==='vig')body=`<div class="kmfr">${f('b','Ancho b (m)',T.b)}${f('h','Peralte h (m)',T.h)}${f('el','Losa que llega (m)',T.el)}${f('a','Ancho de apoyo (m)',T.a)}</div><h4>Barras longitudinales</h4>${lines(T.L,'beam')}<h4>Estribos (por tramo, en la luz libre)</h4>${ests(T.est,'E')}`;
  else if(T.cl==='col')body=`<div class="kmfr">${f('b','Lado b (m)',T.b)}${f('h','Lado h (m)',T.h)}${f('hv','Peralte de la viga que llega (m)',T.hv)}</div><h4>Longitudinales</h4>${lines(T.L,'long')}<h4>Estribos (altura libre + nudo)</h4>${ests(T.est,'E')}`;
  else if(T.cl==='pla')body=`<div class="kmfr">${f('b','Espesor (m)',T.b)}${f('h','Largo (m)',T.h)}${f('hv','Peralte de la viga (m)',T.hv)}${f('cap','Capas de malla',T.cap)}</div><div class="kmfr">${f('mv','Malla vertical',T.mv,'Ø3/8@.20')}${f('mh','Malla horizontal',T.mh,'Ø3/8@.25')}</div>
    <h4>Núcleos (extremos confinados)</h4><div class="kmfr">${f('nuc.n','Cantidad',(T.nuc||{}).n)}${f('nuc.s','Barras por núcleo',(T.nuc||{}).s,'6Ø5/8')}${f('nuc.ln','Largo del núcleo (m)',(T.nuc||{}).ln)}</div>${ests((T.nuc||{}).est,'N')}`;
  else if(T.cl==='ali')body=`<div class="kmfr">${f('h','Altura h (m)',T.h)}${f('a','Ancho de las vigas de apoyo (m)',T.a)}${f('tem','Acero de temperatura',T.tem,'Ø1/4@.25')}</div><h4>Por vigueta</h4>${lines(T.L,'beam')}`;
  else if(T.cl==='mac')body=`<div class="kmfr">${f('h','Espesor (m)',T.h)}${f('a','Ancho de las vigas de apoyo (m)',T.a)}${f('mi','Malla inferior (ambos sentidos)',T.mi,'Ø3/8@.20')}${f('ms','Malla superior (ambos sentidos)',T.ms,'Ø3/8@.25')}</div>`;
  else body='<p class="mu">El muro se metra en m² (largo × alto − vanos) para el asentado.</p>';
  const used=[...KM.lv.values()].reduce((s,rows)=>s+rows.filter(r=>r.t===T.id).length,0);
  lqModal(`<div class="lqtop"><b>Tipo ${esc(T.cod)}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
    <div class="kmted"><div class="kmtedl"><div class="kmfr">${f('cod','Código',T.cod,'t')}<label class="kmfl">Clase<select class="ci" id="kte_cl" data-kt="cl"${dis}>${Object.entries(KM_CL).map(([k,l])=>`<option value="${k}"${k===T.cl?' selected':''}>${esc(l)}</option>`).join('')}</select></label></div>${body}</div>
    <div class="kmtedr">${kmSvg(T)}<div class="mu">${esc(kmDesc(T))}</div>${q?`<div class="${q.out?'kmw':''}">Cuantía de muestra: <b>${kmF(q.q,0)} kg/m³</b> (rango ${q.rg[0]}–${q.rg[1]})</div>`:''}<div class="mu">Se usa en ${used} fila${used===1?'':'s'}.</div>
    ${ed?`<button type="button" class="ib" data-ktdup="1">Duplicar tipo</button><button type="button" class="ib danger" data-ktrm="1"${used?' disabled title="Está en uso en la planilla"':''}>Eliminar tipo</button>`:''}</div></div>`,kmTedClick,kmTedChange)}
function kmTedChange(e){const el=e.target;const T=JSON.parse(JSON.stringify(kmTipo(MET.ted)||null));if(!T||!csEd())return;const num=v=>{const x=kmNum(v);return x==null||Number.isNaN(x)?v:x};
  if(el.dataset.kt){const k=el.dataset.kt;if(k==='cl'){if(!T||el.value===T.cl)return;const N=kmTipoNew(el.value);Object.assign(T,N,{id:T.id,cod:T.cod})}
    else if(k.startsWith('nuc.')){T.nuc=T.nuc||{};const kk=k.slice(4);T.nuc[kk]=kk==='s'?el.value.trim():num(el.value)}
    else T[k]=['cod','mv','mh','tem','mi','ms'].includes(k)?el.value.trim():num(el.value)}
  else if(el.dataset.ktl!=null){const i=+el.dataset.ktl,k=el.dataset.ktk;T.L=T.L||[];if(!T.L[i])return;T.L[i][k]=k==='k'?num(el.value):el.value.trim()}
  else if(el.dataset.kte!=null){const pre=el.dataset.kte[0],i=+el.dataset.kte.slice(1),k=el.dataset.ktk;const arr=pre==='N'?((T.nuc=T.nuc||{}).est=(T.nuc.est||[])):(T.est=T.est||[]);if(!arr[i])return;arr[i][k]=el.value.trim()}
  else return;kmTipoSave(T);kmTedDraw();requestRender()}
async function kmTedClick(e){const b=e.target.closest('button');if(!b||!csEd())return;const T=JSON.parse(JSON.stringify(kmTipo(MET.ted)||null));if(!T)return;
  if(b.dataset.ktadd){const k=b.dataset.ktadd;if(k==='L'){T.L=T.L||[];T.L.push(T.cl==='col'?{s:''}:{p:'sup',s:'',t:'c',k:3})}else if(k==='E'){T.est=T.est||[];T.est.push({d:'3/8',z:'',f:'r'})}else if(k==='N'){T.nuc=T.nuc||{};T.nuc.est=T.nuc.est||[];T.nuc.est.push({d:'3/8',z:'',f:'r'})}kmTipoSave(T);kmTedDraw();return}
  if(b.dataset.ktdel){const k=b.dataset.ktdel,i=+k.slice(1);if(k[0]==='L')T.L.splice(i,1);else if(k[0]==='E')T.est.splice(i,1);else if(T.nuc&&T.nuc.est)T.nuc.est.splice(i,1);kmTipoSave(T);kmTedDraw();requestRender();return}
  if(b.dataset.ktdup){const N={...JSON.parse(JSON.stringify(T)),id:uid('kt'),cod:T.cod+' (copia)'};kmTipoSave(N,'Duplicar tipo');MET.ted=N.id;MET.tsel=N.id;kmTedDraw();requestRender();return}
  if(b.dataset.ktrm){if(!(await uiAsk({title:`¿Eliminar el tipo ${T.cod}?`,text:'No está en ninguna fila. Puedes deshacerlo con «Deshacer».',ok:'Eliminar',tone:'danger'})))return;kmPut('tipos',{L:KM.tipos.filter(t=>t.id!==T.id)},'Eliminar tipo '+T.cod);lqClose();requestRender()}}

/* ---------- eventos de la pestaña ---------- */
function kmRowsSet(pid,rows,label){kmPut('n_'+pid,{rows},label)}
async function kmClick(e){if(kmV()==='vig'&&kvClick(e))return;const b=e.target.closest('button,[data-krow]');if(!b)return;const ed=csEd();const pid=U.piso;
  if(b.dataset.kmv){U.kmV=b.dataset.kmv;saveUI();requestRender();return}
  if(b.dataset.kmpiso){U.piso=b.dataset.kmpiso;saveUI();requestRender();return}
  if(b.dataset.kmsec!=null){U.kmSec=b.dataset.kmsec;saveUI();requestRender();return}
  if(b.dataset.kmt){MET.tsel=b.dataset.kmt;const r=kmRows(pid).find(x=>x.t===MET.tsel);if(r)MET.sel=r.id;requestRender();return}
  if(b.dataset.kmted){kmTedOpen(b.dataset.kmted);return}
  if(b.dataset.krow&&b.tagName!=='BUTTON'){if(e.target.closest('input,select'))return;if(MET.sel!==b.dataset.krow){MET.sel=b.dataset.krow;requestRender()}return}
  if(!ed)return;const k=b.dataset.km;
  if(b.dataset.kmtnew){const T=kmTipoNew(b.dataset.kmtnew);kmTipoSave(T,'Nuevo tipo '+T.cod);MET.tsel=T.id;kmTedOpen(T.id);requestRender();return}
  if(b.dataset.kmdup){const rows=kmRows(pid).slice();const i=rows.findIndex(r=>r.id===b.dataset.kmdup);if(i<0)return;const n={...rows[i],id:uid('kr')};rows.splice(i+1,0,n);MET.sel=n.id;kmRowsSet(pid,rows,'Duplicar fila');requestRender();return}
  if(b.dataset.kmdel){kmRowsSet(pid,kmRows(pid).filter(r=>r.id!==b.dataset.kmdel),'Eliminar fila');requestRender();toast('Fila eliminada','Deshacer',kmUndo);return}
  if(k==='undo'){kmUndo();return}
  if(k==='add'){const rows=kmRows(pid).slice();const C=kmCtx(pid);const last=rows.find(r=>r.id===MET.sel)||rows[rows.length-1];const n={id:uid('kr'),sec:U.kmSec||(last&&last.sec)||(C.secs[0]&&C.secs[0].id)||'',t:(last&&last.t)||MET.tsel||(KM.tipos[0]&&KM.tipos[0].id),eje:'',lu:'',an:'',al:last?last.al||'':'',vn:'',v:1};
    const i=last?rows.indexOf(last):-1;rows.splice(i+1,0,n);MET.sel=n.id;kmRowsSet(pid,rows,'Nueva fila');requestRender();
    setTimeout(()=>{const el=document.querySelector(`[data-kk="${CSS.escape(n.id)}|eje"]`);if(el)el.focus()},60);return}
  if(k==='apply'){kmApply(pid);return}
  if(k==='copy'){kmCopyNext(pid);return}
  if(k==='xls'){kmXls(pid);return}
  if(k==='imp'){kmImp(pid);return}
  if(k==='pxls'){kmParXls();return}
  if(k==='pimp'){kmParImp();return}
  if(k==='pdef'){if(await uiAsk({title:'¿Restablecer los valores típicos?',text:'Se reemplaza toda la tabla de parámetros por los valores de ejemplo. Puedes deshacerlo.',ok:'Restablecer',tone:'warn'})){kmPut('par',{...kmParDef(),map:(KM.par||{}).map||{}},'Parámetros típicos');requestRender()}return}}
function kmChange(e){const el=e.target;if(!csEd())return;if(el.dataset.kv){kvChange(el);return}
  if(el.dataset.kp){const P=JSON.parse(JSON.stringify(kmP()));const path=el.dataset.kp.split('.');let o=P;for(let i=0;i<path.length-1;i++)o=o[path[i]];const last=path[path.length-1];
    if(path[0]==='map')o[last]=el.value||null;else{const v=kmNum(el.value);if(v==null||!Number.isFinite(v)||v<0){toast('Escribe un número válido.');requestRender();return}o[last]=v}
    kmPut('par',P,'Parámetros');requestRender();return}
  if(el.dataset.kr){const pid=U.piso;const rows=kmRows(pid).map(r=>r.id===el.dataset.kr?{...r,[el.dataset.kf]:el.value.trim()}:r);MET.sel=el.dataset.kr;kmRowsSet(pid,rows,'Planilla');requestRender()}}

/** escribe en cada sector del nivel el metrado calculado de cada partida (marca el origen «calculado») */
async function kmApply(pid){const P=kmP();const C=kmCtx(pid);const R=kvMerge(kmLevel(kmRows(pid),KM.tipos,P,C),pid,P,C);const ops=[],lst=[],miss=new Set();let nUpd=0;
  for(const a of C.secs){const x=R.sec[a.id];if(!x)continue;const met={...(a.met||{})},mo={...(a.mo||{})};let ch=0;
    for(const[k,v]of Object.entries(x)){if(!(v>0))continue;const o=KM_OUT.find(y=>y[0]===k);const c=kmCat(P,k);if(!c){miss.add(o[1]);continue}const val=Math.round(v*(o[2]==='kg'?1:100))/(o[2]==='kg'?1:100);
      if(met[c.id]!==val||mo[c.id]!=='c'){met[c.id]=val;mo[c.id]='c';ch++}}
    if(ch){ops.push(op('ambientes',a.id,{...cnvStrip(a),met,mo}));lst.push(`${a.code||a.name}: ${ch} partida${ch>1?'s':''}`);nUpd+=ch}}
  if(R.vmiss&&R.vmiss.length&&!(await uiAsk({title:'Hay vigas con sectores que no existen en este nivel',text:'Sus kg en esos sectores no se aplican.',list:R.vmiss,ok:'Aplicar igual',tone:'warn'})))return;
  if(R.err&&!(await uiAsk({title:`Hay ${R.err} fila${R.err>1?'s':''} con avisos`,text:'Esas filas pueden quedar incompletas. ¿Aplicar igual?',ok:'Aplicar igual',tone:'warn'})))return;
  if(!ops.length){toast(miss.size?'Falta elegir las partidas en Parámetros › Partidas del tren.':'Los sectores ya tienen estos metrados.');return}
  if(!(await uiAsk({title:'¿Aplicar el metrado calculado a los sectores?',text:'Cada sector guarda estas cantidades en sus partidas; las actividades nuevas del tren las toman de ahí.',list:lst,note:miss.size?'Sin partida en el catálogo (no se aplican): '+[...miss].join(', '):'',ok:'Aplicar',tone:'info'})))return;
  apply(ops,'Metrado calculado aplicado a los sectores');toast(`Metrado aplicado: ${nUpd} partida${nUpd>1?'s':''} en ${ops.length} sector${ops.length>1?'es':''}`)}
/** copia la planilla al nivel siguiente (mismos códigos de sector) */
async function kmCopyNext(pid){const L=pisos();const i=L.findIndex(p=>p.id===pid);const nx=L[i+1];if(!nx){toast('No hay un nivel siguiente.');return}if(kmV()==='vig'){kvCopyNext(pid,nx);return}const rows=kmRows(pid);if(!rows.length){toast('La planilla de este nivel está vacía.');return}
  const A=kmCtx(pid),B=kmCtx(nx.id);const codeOf=id=>{const a=A.secs.find(x=>x.id===id);return a?String(a.code||'').toUpperCase():''};let lost=0;
  const out=rows.map(r=>{const id=B.secByCode(codeOf(r.sec));if(!id)lost++;return{...r,id:uid('kr'),sec:id||r.sec}});const has=kmRows(nx.id).length;
  if(!(await uiAsk({title:`¿Copiar ${rows.length} filas a ${csPisoTag(nx,'E')||nx.name}?`,text:has?`Ese nivel ya tiene ${has} filas: se reemplazan.`:'Se copian con los mismos sectores (por código).',note:lost?`${lost} fila(s) con un sector que no existe allá: revísalas.`:'',ok:'Copiar',tone:has?'warn':'info'})))return;
  kmRowsSet(nx.id,out,'Copiar al nivel '+(csPisoTag(nx,'E')||''));toast('Planilla copiada','Ir al nivel',()=>{U.piso=nx.id;saveUI();requestRender()})}

/* ---------- Excel ---------- */
const kmXHead={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F5F7A'}},alignment:{vertical:'center',wrapText:true}};
function kmSheet(X,aoa,widths){const ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=widths.map(w=>({wch:w}));const R=X.utils.decode_range(ws['!ref']);for(let c=R.s.c;c<=R.e.c;c++){const a=X.utils.encode_cell({r:0,c});if(ws[a])ws[a].s=kmXHead}ws['!views']=[{state:'frozen',ySplit:1}];return ws}
async function kmParXls(){try{await loadXlsx();const X=window.XLSX;const P=kmP();const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,kmSheet(X,[['Diámetro','Peso kg/m','Traslape inferior m','Traslape superior m','Gancho 90° m','Gancho 135° estribo m'],...KM_DIA.map(([k,l])=>[l,P.dia[k].kg,P.dia[k].lt,P.dia[k].lts,P.dia[k].g90,P.dia[k].g135])],[12,12,16,16,14,20]),'Diámetros');
  X.utils.book_append_sheet(wb,kmSheet(X,[['Parámetro','Valor'],...KM_PGEN.map(([k,l])=>[l,KM_PGET(P,k)]),...Object.keys(P.rg).flatMap(k=>[[`Cuantía mínima · ${KM_CL[k]} (kg/m³)`,P.rg[k][0]],[`Cuantía máxima · ${KM_CL[k]} (kg/m³)`,P.rg[k][1]]])],[44,12]),'Generales');
  const buf=X.write(wb,{type:'array',bookType:'xlsx'});saveBlob('Parametros_metrado_casco.xlsx',new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel de parámetros generado')}catch(err){toast(err&&err.message||'No se pudo generar el Excel.')}}
const KM_PGEN=[['lv','Longitud comercial de la varilla (m)'],['vsp','Viguetas del aligerado a cada (m)'],['lad.b','Ladrillo de techo: ancho (m)'],['lad.l','Ladrillo de techo: largo (m)'],['rec.vig','Recubrimiento de vigas (m)'],['rec.col','Recubrimiento de columnas (m)'],['rec.pla','Recubrimiento de placas (m)'],['rec.los','Recubrimiento de losas (m)']];
const KM_PGET=(P,k)=>k.split('.').reduce((o,x)=>o&&o[x],P);
async function kmParImp(){const f=await tPickFile('.xlsx,.xls');if(!f)return;try{const wb=await tReadBook(f);const P=JSON.parse(JSON.stringify(kmP()));const fold=s=>tFold(s).replace(/[^A-Z0-9/ ]/g,'').replace(/\s+/g,' ').trim();let n=0;const bad=[];
  const sd=wb.SheetNames.find(s=>fold(s).startsWith('DIAMETRO'));if(sd){const rows=tRows(wb.Sheets[sd]);const H=(rows[0]||[]).map(fold);const hc=(...w)=>H.findIndex(h=>w.some(x=>h.startsWith(x)));
    const cols=[['kg',hc('PESO')],['lt',hc('TRASLAPE INF','TRASLAPE M','TRASLAPE')],['lts',hc('TRASLAPE SUP')],['g90',hc('GANCHO 90')],['g135',hc('GANCHO 135')]].filter(x=>x[1]>0);
    for(const r of rows.slice(1)){const d=kmDia(r[0]);if(!d){if(String(r[0]||'').trim())bad.push(String(r[0]));continue}
      cols.forEach(([k,c])=>{const v=kmNum(r[c]);if(v>0&&v!==P.dia[d][k]){P.dia[d][k]=v;n++}})}}
  const sg=wb.SheetNames.find(s=>fold(s).startsWith('GENERAL'));if(sg){const rows=tRows(wb.Sheets[sg]);const lab=new Map(KM_PGEN.map(([k,l])=>[fold(l),k]));
    for(const r of rows.slice(1)){const L=fold(r[0]);const v=kmNum(r[1]);if(!(v>=0))continue;const k=lab.get(L);if(k){const path=k.split('.');let o=P;for(let i=0;i<path.length-1;i++)o=o[path[i]];if(o[path[path.length-1]]!==v){o[path[path.length-1]]=v;n++}continue}
      const m=/^CUANTIA (MINIMA|MAXIMA) (.+?) KG/.exec(L);if(m){const cl=Object.keys(KM_CL).find(c=>fold(KM_CL[c])===m[2].trim());if(cl&&P.rg[cl]){const j=m[1]==='MINIMA'?0:1;if(P.rg[cl][j]!==v){P.rg[cl][j]=v;n++}}}}}
  if(!sd&&!sg){toast('El archivo no tiene las hojas «Diámetros» ni «Generales». Exporta primero para ver el formato.');return}
  if(!n){toast('El Excel no cambia ningún valor.');return}
  if(!(await uiAsk({title:`¿Importar ${n} valor${n>1?'es':''}?`,text:'Se actualiza la tabla de parámetros y se recalcula todo. Puedes deshacerlo.',note:bad.length?'Diámetros que no reconocí: '+bad.join(', '):'',ok:'Importar',tone:'info'})))return;
  kmPut('par',P,'Importar parámetros');requestRender();toast('Parámetros importados','Deshacer',kmUndo)}catch(err){toast('No se pudo leer el Excel: '+(err&&err.message||err))}}
async function kmXls(pid){try{await loadXlsx();const X=window.XLSX;const P=kmP();const C=kmCtx(pid);const rows=kmRows(pid);const R=kmLevel(rows,KM.tipos,P,C);const p=S.pis.get(pid);const tag=csPisoTag(p,'E')||'';
  const code=id=>{const a=C.secs.find(x=>x.id===id);return a?a.code||a.name:''};const wb=X.utils.book_new();
  X.utils.book_append_sheet(wb,kmSheet(X,[['Sector','Tipo','Eje / tramo','Luces (m)','Ancho (m)','Altura (m)','Vanos (m²)','Veces','Concreto m³','Encofrado m²','Acero kg','Avisos'],...rows.map(r=>{const o=R.rows[r.id];const T=kmTipo(r.t);
    const conc=Object.values(o.al).reduce((s,x)=>s+(x.vv||0)+(x.vl||0),0),enc=Object.values(o.al).reduce((s,x)=>s+(x.ev||0)+(x.ef1||0)+(x.ef2||0),0);return[code(r.sec),T?T.cod:'',r.eje||'',r.lu||'',kmNum(r.an)??'',kmNum(r.al)??'',kmNum(r.vn)??'',kmNum(r.v)??1,r2(conc),r2(enc),Math.round(o.kg*10)/10,o.err.join(' · ')]})],[8,10,22,18,10,10,10,7,12,12,10,40]),'Planilla');
  const des=[['Sector','Tipo','Eje / tramo','Barra','Ø','N.º','Long. c/u (m)','kg']];for(const r of rows){const o=R.rows[r.id];const T=kmTipo(r.t);for(const b of o.bars)des.push([code(r.sec),T?T.cod:'',r.eje||'',b.m,KM_DK[b.d]?KM_DK[b.d][1]:b.d,b.n,r2(b.l),Math.round(b.kg*10)/10])}
  X.utils.book_append_sheet(wb,kmSheet(X,des,[8,10,22,44,8,8,12,10]),'Despiece');
  const secs=C.secs.filter(a=>R.sec[a.id]);X.utils.book_append_sheet(wb,kmSheet(X,[['Partida','Und.',...secs.map(a=>a.code||a.name),'Total'],...KM_OUT.filter(o=>secs.some(a=>(R.sec[a.id]||{})[o[0]]>0)).map(o=>{const c=kmCat(P,o[0]);const v=secs.map(a=>r2((R.sec[a.id]||{})[o[0]]||0));return[c?c.name:o[1],o[2],...v,r2(v.reduce((s,x)=>s+x,0))]})],[44,8,...secs.map(()=>10),12]),'Resumen');
  X.utils.book_append_sheet(wb,kmSheet(X,[['Diámetro','kg'],...KM_DIA.filter(([k])=>R.dia[k]>0).map(([k,l])=>[l,Math.round(R.dia[k])])],[12,12]),'Por diámetro');
  X.utils.book_append_sheet(wb,kmSheet(X,[['Código','Clase','Descripción'],...KM.tipos.map(T=>[T.cod,KM_CL[T.cl],kmDesc(T)])],[12,20,60]),'Tipos');
  kvXlsSheet(X,wb,pid,P,C);
  const buf=X.write(wb,{type:'array',bookType:'xlsx'});saveBlob(`Metrado_${tag||'nivel'}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel del metrado generado')}catch(err){toast(err&&err.message||'No se pudo generar el Excel.')}}
async function kmImp(pid){const f=await tPickFile('.xlsx,.xls');if(!f)return;try{const wb=await tReadBook(f);const sh=await tSheetOf(wb,'Planilla');if(!sh)return;const rows=tRows(wb.Sheets[sh]);
  const hi=rows.findIndex(r=>r.some(c=>tFold(c)==='SECTOR')&&r.some(c=>tFold(c)==='TIPO'));if(hi<0){toast('No encontré los encabezados «Sector» y «Tipo». Exporta primero para ver el formato.');return}
  const H=rows[hi].map(c=>tFold(c));const col=(...n)=>H.findIndex(h=>n.some(x=>h.startsWith(x)));const ci={sec:col('SECTOR'),t:col('TIPO'),eje:col('EJE'),lu:col('LUCES'),an:col('ANCHO'),al:col('ALTURA','ALTO'),vn:col('VANOS'),v:col('VECES')};
  const C=kmCtx(pid);const tByCod=new Map(KM.tipos.map(t=>[tFold(t.cod),t.id]));const out=[],bad=[];
  rows.slice(hi+1).forEach((r,i)=>{const g=k=>ci[k]<0?'':String(r[ci[k]]??'').trim();if(!g('sec')&&!g('t'))return;const sec=C.secByCode(g('sec'));const t=tByCod.get(tFold(g('t')));
    if(!sec||!t){bad.push(`fila ${hi+i+2}: ${!sec?'sector «'+g('sec')+'»':''}${!sec&&!t?' y ':''}${!t?'tipo «'+g('t')+'»':''}`);return}out.push({id:uid('kr'),sec,t,eje:g('eje'),lu:g('lu'),an:g('an'),al:g('al'),vn:g('vn'),v:g('v')||1})});
  if(!out.length){toast('No hay filas que importar'+(bad.length?': '+bad.slice(0,3).join('; '):'.'));return}const has=kmRows(pid).length;
  if(!(await uiAsk({title:`¿Importar ${out.length} filas?`,text:has?`Reemplazan las ${has} filas de este nivel. Puedes deshacerlo.`:'Se agregan a este nivel.',note:bad.length?`No se importan ${bad.length}: `+bad.slice(0,5).join('; ')+(bad.length>5?'…':''):'',ok:'Importar',tone:has?'warn':'info'})))return;
  kmRowsSet(pid,out,'Importar planilla');requestRender();toast('Planilla importada','Deshacer',kmUndo)}catch(err){toast('No se pudo leer el Excel: '+(err&&err.message||err))}}
