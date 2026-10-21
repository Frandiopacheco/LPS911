"use strict";
/* LPS 911 · Tareo: datos en vivo de un periodo para RR.HH. y Costos (docs/ia/tareo.md, «RR.HH. y Costos en vivo»).
   - Parámetros de planilla y costos del régimen de construcción civil (tcfg/pla, editables en «Parámetros»): TPL(), tplVig(f).
   - Publicaciones vigentes del periodo, en vivo: tseSub(slot,a,b,act) se suscribe a tpubidx del rango y trae cada tpub/{f}_v{n}
     que falte (TPUB, inmutables). tsePB(a,b) → Map fecha → publicación vigente cargada.
   - tsCalc(a,b,PB): asistencia y horas por obrero y día (código, HN, HE 60 %, HE 100 %, domingo/feriado, altura, movilidad,
     dominical) y HH por partida × categoría (con HE repartidas en proporción). Lo usan las pantallas y los Excel.
   Globales con prefijo ts/tse/tpl (TPLA_DEF, TPLA_COD). */

/* valores por omisión: convenio CAPECO–FTCCP 2026 y cartilla de derechos de la FTCCP (20-10-2026, decisión del dueño: «elige tú
   según la normativa»). Las vigencias guardan la fecha desde la que rige cada tabla: una semana vieja usa la suya. */
const TPLA_DEF={
  vig:[{desde:'2025-06-01',jb:{OP:87.30,OF:68.50,PE:61.65},buc:{OP:32,OF:30,PE:30},nota:'Convenio 2024–2025 (desde el 01/06/2025)'},
       {desde:'2026-01-01',jb:{OP:89.30,OF:69.75,PE:62.80},buc:{OP:32,OF:30,PE:30},nota:'Convenio CAPECO–FTCCP 2026'}],
  he60h:2,sob1:60,sob2:100,df100:true,alt:8,mov:8.6,dmEmp:20,dmTope:60,ae:30,aeEdad:24,leyes:null,soles:'cos',avisoUA:true};
/* códigos de asistencia por día: qué significa, si se paga, si cuenta para el dominical y para BUC/movilidad (días laborados) */
const TPLA_COD=[
  ['A','Asistió la jornada completa','Sí','Sí','Sí'],['P','Jornada parcial (menos horas que la jornada)','Las horas trabajadas','Sí','Sí'],
  ['F','Falta (sin motivo o «Falta»)','No','No','No'],['DM','Descanso médico (la empresa hasta el día 20 del año; luego EsSalud)','Sí (subsidio)','RR.HH. decide','No'],
  ['DA','Descanso por accidente','Sí (subsidio)','RR.HH. decide','No'],['VA','Vacaciones','Sí','RR.HH. decide','No'],
  ['SM','Subsidio por maternidad','EsSalud','No','No'],['SE','Subsidio por enfermedad','EsSalud','No','No'],['SU','Suspensión','No','No','No'],
  ['LS','Licencia sin goce','No','No','No'],['L','Liquidado','—','No','No'],['EX','Sin tareo con excepción (motivo en la publicación)','Según el motivo','—','No'],
  ['FE','Feriado no laborado','Sí','Sí','No'],['D','Descanso (domingo o día no laborable)','Dominical','—','No'],
  ['IN','Ingresó ese día (trabajó)','Sí','Sí','Sí'],['CE','Cesó ese día (trabajó)','Sí','Sí','Sí'],
  ['·','Día aún sin publicar','—','—','—'],['?','Activo, pero no figura en la publicación','—','—','—'],['—','Fuera de planilla (antes del ingreso o después del cese)','—','—','—']];
const TPLA_CAT=[['OP','Operario'],['OF','Oficial'],['PE','Peón']];
const tplNum=(v,d)=>v===''||v==null||!Number.isFinite(+v)?d:+v;
function TPL(){const c=(S.tcfg&&S.tcfg.get('pla'))||{};const D=TPLA_DEF;
  const vig=(Array.isArray(c.vig)&&c.vig.length?c.vig:D.vig).filter(v=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v.desde||'')).map(v=>({desde:v.desde,nota:v.nota||'',
    jb:Object.fromEntries(TPLA_CAT.map(([k])=>[k,tplNum(v.jb&&v.jb[k],0)])),buc:Object.fromEntries(TPLA_CAT.map(([k])=>[k,tplNum(v.buc&&v.buc[k],0)]))})).sort((a,b)=>a.desde<b.desde?-1:1);
  const n=k=>tplNum(c[k],D[k]);
  return{vig:vig.length?vig:D.vig,he60h:Math.max(0,n('he60h')),sob1:n('sob1'),sob2:n('sob2'),df100:c.df100!==false,alt:n('alt'),mov:n('mov'),dmEmp:n('dmEmp'),dmTope:n('dmTope'),
    ae:n('ae'),aeEdad:n('aeEdad'),leyes:c.leyes===''||c.leyes==null||!Number.isFinite(+c.leyes)?null:+c.leyes,soles:c.soles==='ofi'?'ofi':'cos',avisoUA:c.avisoUA!==false,ts:c.ts||0,by:c.by||''}}
/** tabla de jornales que rige en la fecha f (la última con desde ≤ f; antes de todas, la primera) */
function tplVig(f,P0){const P=P0||TPL();let v=P.vig[0];for(const x of P.vig)if(x.desde<=f)v=x;return v}
/** ¿quién ve los soles? costos y el administrador (o toda la oficina si Parámetros lo dice) */
const tplSoles=()=>!!me&&(me.role==='admin'||me.role==='tcos'||isOwnerEmail(me.email)||(TPL().soles==='ofi'&&tpCosOk()));
const tplEd=()=>!!me&&(me.role==='admin'||TASIS());

/* ---------- periodo ---------- */
/** periodo de tipo 'sem' (lunes–domingo), 'qui' (1–15 o 16–fin), 'mes' o 'ran' (a..b) que contiene ref */
function tsPeriodo(tipo,ref,b2){if(tipo==='ran'){const a=ref<=b2?ref:b2,b=ref<=b2?b2:ref;return[a,b]}
  if(tipo==='mes'){const a=ref.slice(0,8)+'01';return[a,addD(tpkMesAdd(ref.slice(0,7),1)+'-01',-1)]}
  if(tipo==='qui'){const d=+ref.slice(8,10);const a=ref.slice(0,8)+(d<=15?'01':'16');return[a,d<=15?ref.slice(0,8)+'15':addD(tpkMesAdd(ref.slice(0,7),1)+'-01',-1)]}
  const a=tpMon(ref);return[a,addD(a,6)]}
function tsPerTxt(tipo,a,b){const n=typeof tSemN==='function'?tSemN(a):null;
  if(tipo==='sem')return`${n?'Semana '+n+' · ':''}${fmtD(a)} al ${fmtD(b)}`;if(tipo==='mes')return tpkMesN(a.slice(0,7));
  return`${fmtD(a)} al ${fmtD(b)}`}

/* ---------- publicaciones vigentes del periodo, en vivo ---------- */
const TSE={};/* slot → {k, idx:Map, ok, err, pend:Set} */
function tseSub(slot,a,b,act){const k=a+'|'+b;let o=TSE[slot];if(!o||o.k!==k){o={k,idx:new Map(),ok:false,err:'',pend:new Set()};TSE[slot]=o}
  tpSub('se'+slot,k,fcol('tpubidx').where('fecha','>=',a).where('fecha','<=',b),(sn,err)=>{if(TSE[slot]!==o)return;
    if(err){o.err=err.code||'error';o.ok=true;return}const M=new Map();sn.docs.forEach(x=>{const d=x.data()||{};M.set(d.fecha||x.id,{...d,id:x.id})});o.idx=M;o.ok=true;o.err='';
    for(const[f,I]of M){if(I.v==null)continue;const id=tpId(f,I.v);if(TPUB.has(id)||o.pend.has(id))continue;o.pend.add(id);
      tpGet(id).then(()=>{o.pend.delete(id);if(ready&&act())requestRender()}).catch(()=>{o.pend.delete(id)})}},act);return o}
/** fecha → publicación vigente ya leída (las que se están trayendo aún no figuran) */
function tsePB(slot){const o=TSE[slot];const M=new Map();if(!o)return M;for(const[f,I]of o.idx){if(I.v==null)continue;const p=TPUB.get(tpId(f,I.v));if(p)M.set(f,{...p,fecha:p.fecha||f})}return M}
const tseCargando=slot=>{const o=TSE[slot];return!o||!o.ok||o.pend.size>0};

/* ---------- cálculo ---------- */
const TS_MOT={FA:'F','':'F',NV:'F'};
const tsCat=c=>c==='OP'||c==='OF'||c==='PE'?c:'OT';
const tsSum=(a,b)=>tR2((a||0)+(b||0));
/** periodos de la ficha (ingreso/cese) → ¿activo el día f?, ¿ingresó / cesó ese día? */
function tsFicha(dni){const f=(S.tper&&S.tper.get(dni))||null;const per=f?(Array.isArray(f.per)&&f.per.length?f.per:[{ing:f.ing,ces:f.ces}]):[];
  return{f,act:d=>!f?true:per.some(x=>(!x.ing||x.ing<=d)&&(!x.ces||d<=x.ces)),ing:d=>per.some(x=>x.ing===d),ces:d=>per.some(x=>x.ces===d)}}
/** asistencia, horas y HH por partida del periodo a..b con las publicaciones PB (Map fecha → pub). Solo valores; nada se escribe. */
function tsCalc(a,b,PB){const P=TPL();const days=tpDates(a,b);const hoy=todayIso();const fer=new Set((TC().fer)||[]);
  /* gente: quien figura en alguna publicación + los activos del máster en el periodo */
  const G=new Map();const meta=(dni,x)=>{const o=G.get(dni)||{dni,ape:'',nom:'',cat:'',cua:'',cap:'',capN:''};for(const k of['ape','nom','cat','cua','cap','capN'])if(x&&x[k])o[k]=x[k];G.set(dni,o)};
  for(const f of days){const p=PB.get(f);if(!p)continue;for(const r of tpRows(p))meta(r.dni,r);for(const[dni,x]of Object.entries(p.exc||{}))meta(dni,x)}
  if(S.tper)for(const t of S.tper.values()){if(t.arch)continue;const dni=t.dni||t.id;const F=tsFicha(dni);if(days.some(d=>F.act(d)))meta(dni,G.has(dni)?null:{ape:t.ape,nom:t.nom,cat:t.cat,cua:t.cua,cap:t.cap})}
  for(const o of G.values()){const t=S.tper&&S.tper.get(o.dni);if(t){if(!o.cat)o.cat=t.cat||'';if(!o.cua)o.cua=t.cua||'';if(!o.ape)o.ape=t.ape||'';if(!o.nom)o.nom=t.nom||''}if(!o.capN&&o.cap&&typeof tCapName==='function')o.capN=tCapName(o.cap)}
  const RI=new Map();for(const f of days){const p=PB.get(f);if(p)RI.set(f,new Map(tpRows(p).map(r=>[r.dni,r])))}
  /* HH por partida × categoría y por cuadrilla */
  const PC=new Map();const cuaM=new Map();const pcsMeta={};
  const pcAdd=(id,cat,f,h,he,cua,co)=>{let o=PC.get(id);if(!o){o={id,c:{OP:0,OF:0,PE:0,OT:0},he:0,tot:0,dia:{},cua:{},cost:0};PC.set(id,o)}
    o.c[cat]=tsSum(o.c[cat],h);o.tot=tsSum(o.tot,h);o.he=tsSum(o.he,he);o.dia[f]=tsSum(o.dia[f],h);o.cua[cua]=tsSum(o.cua[cua],h);o.cost+=co};
  /* costo de un día de un obrero: (jornal + BUC) ÷ 8 por hora × (1 + leyes sociales) + recargo de las horas extra (sin categoría: el del peón) */
  const costo=(cat,f,c)=>{const V=tplVig(f,P);const k=V.jb[cat]?cat:'PE';const jh=(V.jb[k]||0)/8;const base=jh*(1+(V.buc[k]||0)/100)*(1+(P.leyes||0)/100);
    return c.h*base+c.h60*jh*P.sob1/100+(c.h100+c.df)*jh*P.sob2/100};
  const W=[];const T={cost:0,hh:0,hn:0,h60:0,h100:0,df:0,alt:0,dm:0,f:0,dias:0,mov:0,dsc:0,obreros:0,nov:0,sinTareo:0};
  for(const g of [...G.values()].sort(tpxCmp)){const F=tsFicha(g.dni);const cat=tsCat(g.cat);const d=[];
    const w={...g,cat,catN:tpxCat(g.cat)||'Otro',d,cost:0,hh:0,hn:0,h60:0,h100:0,df:0,alt:0,dm:0,f:0,dias:0,dLab:0,mov:0,nov:false,altas:[]};
    for(const f of days){const p=PB.get(f);const nl=p?!!p.nl:tNoLab(f);const c={f,code:'',h:0,hn:0,h60:0,h100:0,df:0,alt:false,pcs:[],mot:''};
      if(!F.act(f)&&!(p&&RI.get(f).has(g.dni)))c.code='—';
      else if(!p){c.code=f>hoy?'':nl?(fer.has(f)?'FE':'D'):'·'}
      else{const r=RI.get(f).get(g.dni);const ex=p.exc&&p.exc[g.dni];
        if(r&&r.as===true){const t=tpNum(r.trab),e=Math.min(t,tpNum(r.ext));c.h=t;c.alt=!!r.alt;
          if(nl&&P.df100){c.df=t}else{const h6=Math.min(P.he60h,e);c.h60=tR2(h6);c.h100=tR2(e-h6);c.hn=tR2(t-e)}
          const jor=tpxJor(p,f);c.code=F.ing(f)?'IN':F.ces(f)?'CE':(!nl&&jor>0&&t<jor)?'P':'A';c.cost=t>0?costo(cat,f,c):0;c.hor=r.ent||r.sal||r.cor?`${r.ent?'entró '+r.ent:''}${r.sal?(r.ent?' · ':'')+'salió '+r.sal:''}${r.cor?' · corrido':''}`:'';
          for(const[k,v]of Object.entries(r.h||{})){const h=tpNum(v);if(h>0){c.pcs.push([k,h]);pcAdd(k,cat,f,h,t>0?tR2(h*e/t):0,g.cua||'(sin cuadrilla)',t>0?c.cost*h/t:0);const m=(p.pcs||{})[k];if(m&&!pcsMeta[k])pcsMeta[k]=m}}}
        else if(r){const m=r.mot||'';c.code=TS_MOT[m]||m;c.mot=m}
        else if(ex){c.code=tpxExcCod(ex.motivo);c.mot=ex.motivo||''}
        else c.code=nl?(fer.has(f)?'FE':'D'):'?'}
      d.push(c);
      w.hh=tsSum(w.hh,c.h);w.cost+=c.cost||0;w.hn=tsSum(w.hn,c.hn);w.h60=tsSum(w.h60,c.h60);w.h100=tsSum(w.h100,c.h100);w.df=tsSum(w.df,c.df);
      if(c.alt)w.alt++;if(c.code==='DM'||c.code==='DA')w.dm++;if(c.code==='F')w.f++;
      if(c.h>0){w.dias++;w.mov++;if(!nl)w.dLab++}if(c.code==='FE')w.dLab++;
      if(c.code==='IN'||c.code==='CE')w.altas.push([c.code,f]);
      if(c.h>0&&g.cua){cuaM.set(g.cua,tsSum(cuaM.get(g.cua),c.h))}}
    /* dominical: por semana, días laborados (lunes a sábado, con feriados no laborados) ÷ 6, tope 1 jornal */
    const wk=new Map();d.forEach(c=>{if(c.h>0&&!(PB.get(c.f)||{}).nl||c.code==='FE'){const m=tpMon(c.f);wk.set(m,(wk.get(m)||0)+1)}});
    w.dsc=tR2([...wk.values()].reduce((s,n)=>s+Math.min(6,n)/6,0));w.dscTxt=wk.size<=1?`${Math.min(6,[...wk.values()][0]||0)}/6`:toH(w.dsc);
    w.nov=w.f>0||w.dm>0||w.h60+w.h100+w.df>0||w.alt>0||w.altas.length>0||d.some(c=>c.code&&!['A','D','·','','—'].includes(c.code));
    if(d.some(c=>c.code==='?'))w.sinT=true;
    W.push(w);
    for(const k of['hh','hn','h60','h100','df'])T[k]=tsSum(T[k],w[k]);T.cost+=w.cost;T.alt+=w.alt;T.dm+=w.dm;T.f+=w.f;T.dias+=w.dias;T.mov+=w.mov;T.dsc=tR2(T.dsc+w.dsc);
    if(w.hh>0||d.some(c=>c.code&&!['·','','—','?','D'].includes(c.code)))T.obreros++;if(w.nov)T.nov++;if(w.sinT)T.sinTareo++}
  const pub=days.filter(f=>PB.has(f));
  return{a,b,days,pub,W,T,PC,pcsMeta,cua:cuaM,P}}

/* ---------- presentación compartida ---------- */
const TS_COD_CL={A:'ts-a',P:'ts-p',F:'ts-f',DM:'ts-dm',DA:'ts-dm',VA:'ts-va',SM:'ts-va',SE:'ts-va',SU:'ts-f',LS:'ts-f',L:'ts-f',EX:'ts-p',FE:'ts-dd',D:'ts-dd','·':'ts-x','?':'ts-f',IN:'ts-in',CE:'ts-ce','—':'ts-x'};
const tsDiaL=f=>['D','L','M','Mi','J','V','S'][pd(f).getUTCDay()]+' '+f.slice(8,10);
function tsDiasChips(R,idx){return R.days.map(f=>{const I=idx&&idx.get(f);const p=R.pub.includes(f);const nl=tNoLab(f);
  return`<span class="ts-chip${p?' on':''}${nl&&!p?' nl':''}" title="${p?'Publicado':f>todayIso()?'Aún no llega':nl?'No laborable':'Sin publicar'}">${esc(tsDiaL(f))}${p&&I&&I.v?` · v${esc(String(I.v))}`:p?'':nl?' · desc.':f>todayIso()?'':' · pendiente'}</span>`}).join('')}
/** barra del periodo común a RR.HH. y Costos: tipo (semana/quincena/mes/rango), ‹ fecha ›, Parámetros, Exportar */
function tsPerBar(st,pre){const hoy=todayIso();const tipos=[['sem','Semana'],['qui','Quincena'],['mes','Mes'],['ran','Rango']];
  return`<div class="ts-per"><span class="seg" id="${pre}Tipo">${tipos.map(([k,l])=>`<button data-tst="${k}" class="${st.tipo===k?'on':''}">${l}</button>`).join('')}</span>
    ${st.tipo==='ran'?`<input class="tin" type="date" id="${pre}A" value="${esc(st.ref)}" max="${esc(hoy)}" aria-label="Desde"><span class="note">al</span><input class="tin" type="date" id="${pre}B" value="${esc(st.b2||st.ref)}" max="${esc(hoy)}" aria-label="Hasta">`
     :`<button class="ib" id="${pre}Prev" aria-label="Periodo anterior">‹</button><input class="tin" type="date" id="${pre}Ref" value="${esc(st.ref)}" max="${esc(hoy)}" aria-label="Un día del periodo"><button class="ib" id="${pre}Next" aria-label="Periodo siguiente">›</button>`}
    <button class="ib" id="${pre}Par" title="Jornales, sobretasas, bonificaciones y códigos del régimen de construcción civil">⚙ Parámetros</button></div>`}
function tsPerBind(st,pre){const hoy=todayIso();const go=r=>{st.ref=r>hoy?hoy:r;requestRender()};
  const t=$('#'+pre+'Tipo');if(t)t.onclick=e=>{const b=e.target.closest('[data-tst]');if(!b)return;st.tipo=b.dataset.tst;if(st.tipo==='ran'&&!st.b2)st.b2=st.ref;requestRender()};
  const stp=d=>{const[a,b]=tsPeriodo(st.tipo,st.ref,st.b2);go(d<0?addD(a,-1):addD(b,1))};
  const p=$('#'+pre+'Prev'),n=$('#'+pre+'Next'),r=$('#'+pre+'Ref'),A=$('#'+pre+'A'),B=$('#'+pre+'B');
  if(p)p.onclick=()=>stp(-1);if(n){const[,b]=tsPeriodo(st.tipo,st.ref,st.b2);n.disabled=b>=hoy;n.onclick=()=>stp(1)}
  if(r)r.onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))go(e.target.value)};
  if(A)A.onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){st.ref=e.target.value;requestRender()}};
  if(B)B.onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)){st.b2=e.target.value;requestRender()}};
  const par=$('#'+pre+'Par');if(par)par.onclick=()=>{TPLA.on=true;TPLA.from=U.tab;requestRender()}}
/** periodo vigente del estado st (tope 93 días en rango) */
function tsAB(st){let[a,b]=tsPeriodo(st.tipo,st.ref,st.b2);if(tpDates(a,b).length>93)b=addD(a,92);return[a,b]}
