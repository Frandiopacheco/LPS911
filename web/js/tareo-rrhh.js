"use strict";
/* LPS 911 · Tareo: pestaña «RR.HH.» (trh) en vivo y pantalla «Parámetros de planilla y costos» (docs/ia/tareo.md, «RR.HH. y Costos
   en vivo»). Todo sale de las publicaciones vigentes (tareo-sem.js): asistencia por día, HN, HE 60 %/100 %, domingo y feriado, días
   con altura, descanso médico, movilidad y dominical; altas y bajas, descansos médicos del año y asignación escolar del mes.
   Globales: TRH/trh* (RR.HH.), TPLA/tpla* (Parámetros). CSS: bloque «tareo: rrhh y costos» (clases ts-). */

const trhOk=()=>!!me&&(tpCosOk()||TASIS());
const TRH={tipo:'sem',ref:'',b2:'',vista:'sem',q:'',cua:'',cat:'',nov:false,sel:'',dmY:null,dmBusy:false};
const trhAct=()=>U.mod==='tar'&&U.tab==='trh'&&trhOk();
const TPLA={on:false,from:'',draft:null,msg:''};

function renderTRh(main){if(TPLA.on)return renderTPla(main);
  if(!trhOk()){main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('RR.HH.','')}<div class="callout">Sin acceso.</div></div></div>`;return}
  if(!TRH.ref)TRH.ref=todayIso();const[a,b]=tsAB(TRH);tseSub('rh',a,b,trhAct);const PB=tsePB('rh');const R=tsCalc(a,b,PB);const o=TSE.rh;
  const lo=tseCargando('rh');const cuas=[...new Set(R.W.map(w=>w.cua).filter(Boolean))].sort();
  const vistas=[['sem','Asistencia y horas'],['alt',`Altas y bajas`],['dm','Descansos médicos'],['ae','Asignación escolar']];
  const T=R.T;const k=(l,v,s,c)=>`<div class="lqtile"${c?` style="--c:${c}"`:''}><span>${l}</span><b>${v}</b>${s?`<small>${s}</small>`:''}</div>`;
  const body=TRH.vista==='alt'?trhAltas(R):TRH.vista==='dm'?trhDM(R):TRH.vista==='ae'?trhAE(R):trhSemana(R);
  main.innerHTML=`<div class="scroll"><div class="wrap ts">${pageHead('RR.HH.',esc(tsPerTxt(TRH.tipo,a,b))+' · se actualiza con cada publicación',`<button class="ib" id="trhXo"${TPK.busy?' disabled':''} title="El Excel de antes (una hoja por día, Resumen HH y Tareo Semana), mientras dura la transición">Excel formato anterior</button><button class="ib pri" id="trhX"${TPK.busy?' disabled':''}>Exportar Excel</button>`)}
    ${tsPerBar(TRH,'trh')}
    <div class="ts-chips" id="trhDias"><span class="note">Días:</span>${tsDiasChips(R,o&&o.idx)}${lo?'<span class="note">Cargando publicaciones…</span>':''}</div>
    ${o&&o.err?`<div class="callout t-warn">No se pudieron leer las publicaciones (${esc(o.err)}).</div>`:''}
    <div class="lqtiles ts-tiles" id="trhTot">${k('Obreros',T.obreros,`${T.nov} con novedades`)}${k('Horas normales',toH(T.hn),'HN','var(--accent)')}${k('HE al 60 %',toH(T.h60),`primeras ${R.P.he60h} h`,'var(--warn)')}
      ${k('HE al 100 %',toH(T.h100),'desde la siguiente','var(--bad)')}${k('Domingo y feriado',toH(T.df),R.P.df100?'todo al 100 %':'')}${k('Días con altura',T.alt,`bono ${R.P.alt} %`)}
      ${k('Descanso médico',T.dm+' d','','var(--accent)')}${k('Faltas',T.f,'','var(--bad)')}${k('Movilidad',T.mov+' d',`S/ ${R.P.mov.toFixed(2)} c/u`)}</div>
    <div class="ts-two">
      <div class="card ts-main"><div class="pad t-bar"><span class="seg" id="trhV">${vistas.map(([v,l])=>`<button data-trhv="${v}" class="${TRH.vista===v?'on':''}">${l}</button>`).join('')}</span>
        ${TRH.vista==='sem'?`<input class="tin t-q" id="trhQ" type="search" placeholder="Buscar nombre o DNI" value="${esc(TRH.q)}" aria-label="Buscar">
        <select class="tin" id="trhCua" aria-label="Cuadrilla"><option value="">Todas las cuadrillas</option>${cuas.map(c=>`<option${c===TRH.cua?' selected':''}>${esc(c)}</option>`).join('')}</select>
        <select class="tin" id="trhCat" aria-label="Categoría"><option value="">Todas las categorías</option>${TPLA_CAT.map(([c,l])=>`<option value="${c}"${c===TRH.cat?' selected':''}>${l}</option>`).join('')}<option value="OT"${TRH.cat==='OT'?' selected':''}>Otros</option></select>
        <label class="chk"><input type="checkbox" id="trhNov"${TRH.nov?' checked':''}> Solo con novedades</label>`:''}</div>${body}</div>
      <aside class="ts-side">${trhAlertas(R)}${trhDet(R)}</aside></div>
  </div></div>`;
  tsPerBind(TRH,'trh');
  $('#trhV').onclick=e=>{const x=e.target.closest('[data-trhv]');if(x){TRH.vista=x.dataset.trhv;requestRender()}};
  $('#trhXo').onclick=()=>tpxBajar(TRH.tipo==='sem'?'semana':a===b?'dia':'rango',a,b);
  $('#trhX').onclick=()=>{if(typeof tsxBajar==='function')tsxBajar('rrhh',a,b,TRH.tipo);else toast('El Excel nuevo llega en la próxima versión.')};
  const q=$('#trhQ');if(q){q.oninput=()=>{TRH.q=q.value;trhFiltrar()};$('#trhCua').onchange=e=>{TRH.cua=e.target.value;requestRender()};$('#trhCat').onchange=e=>{TRH.cat=e.target.value;requestRender()};$('#trhNov').onchange=e=>{TRH.nov=e.target.checked;requestRender()}}
  const tb=$('#trhTb');if(tb)tb.onclick=e=>{const r=e.target.closest('[data-trhd]');if(r){TRH.sel=TRH.sel===r.dataset.trhd?'':r.dataset.trhd;requestRender()}};
  const dmb=$('#trhDmY');if(dmb)dmb.onclick=()=>{const K=trhDmRango(R);trhDmAnio(K.y,K.hasta)};
  const cx=$('#trhDetX');if(cx)cx.onclick=()=>{TRH.sel='';requestRender()}}

/* búsqueda sin redibujar (no pierde el foco) */
function trhFiltrar(){const q=tFold(TRH.q);document.querySelectorAll('#trhTb tr[data-trhd]').forEach(tr=>{tr.hidden=!!q&&!tFold(tr.dataset.k||'').includes(q)})}

function trhSemana(R){const P=R.P;let L=R.W;if(TRH.cua)L=L.filter(w=>w.cua===TRH.cua);if(TRH.cat)L=L.filter(w=>w.cat===TRH.cat);if(TRH.nov)L=L.filter(w=>w.nov);
  const q=tFold(TRH.q);const dh=R.days.map(f=>`<th class="ts-dh${R.pub.includes(f)?'':' off'}${tNoLab(f)?' nl':''}" title="${esc(toDia(f))}">${esc(tsDiaL(f))}</th>`).join('');
  const cell=c=>{const cl=TS_COD_CL[c.code]||'';const sub=c.h?toH(c.h):'';return`<td class="ts-d ${cl}" title="${esc(c.mot?(TO_MOT[c.mot]||c.mot):'')}"><b>${esc(c.code)}${c.alt?'<i class="ts-alt" title="Bono por altura">▲</i>':''}</b>${sub?`<small>${sub}</small>`:''}</td>`};
  const n=v=>v?toH(v):'<span class="note">—</span>';
  const rows=L.map((w,i)=>{const k=[w.ape,w.nom,w.dni].join(' ');return`<tr data-trhd="${esc(w.dni)}" data-k="${esc(k)}"${q&&!tFold(k).includes(q)?' hidden':''} class="${TRH.sel===w.dni?'sel':''}">
    <td class="mono t-r">${i+1}</td><td class="ts-nm"><b>${esc([w.ape,w.nom].filter(Boolean).join(', '))}</b><small class="mono">DNI ${esc(w.dni)}${w.altas.map(([c,f])=>` · ${c==='IN'?'ingresó':'cesó'} ${esc(fmtD(f))}`).join('')}</small></td>
    <td>${esc(w.catN)}</td><td>${esc(w.cua||'')}</td>${w.d.map(cell).join('')}
    <td class="mono t-r">${w.dias||'<span class="note">—</span>'}</td><td class="mono t-r">${n(w.hn)}</td><td class="mono t-r ts-w">${n(w.h60)}</td><td class="mono t-r ts-b">${n(w.h100)}</td><td class="mono t-r">${n(w.df)}</td>
    <td class="mono t-r">${w.alt||'<span class="note">—</span>'}</td><td class="mono t-r">${w.dm||'<span class="note">—</span>'}</td><td class="mono t-r">${w.dias||w.dsc?esc(w.dscTxt):'<span class="note">—</span>'}</td></tr>`}).join('');
  const T=R.T;
  return`<div class="tscroll"><table class="t ts-tbl" id="trhTb"><thead><tr><th class="t-r">N°</th><th>Obrero</th><th>Cat.</th><th>Cuadrilla</th>${dh}
    <th class="t-r" title="Días laborados: base del BUC y la movilidad">Días</th><th class="t-r">HN</th><th class="t-r">HE 60%</th><th class="t-r">HE 100%</th><th class="t-r" title="Domingo o feriado trabajado">Dom/Fer</th><th class="t-r" title="Días con bono por altura">Altura</th><th class="t-r">DM</th><th class="t-r" title="Dominical: días laborados de lunes a sábado ÷ 6 (por semana)">Dominical</th></tr></thead>
    <tbody>${rows||`<tr><td colspan="${16+R.days.length}" class="note">${R.W.length?'Nadie con esos filtros.':'Sin obreros en este periodo.'}</td></tr>`}</tbody>
    <tfoot><tr><td></td><td colspan="3"><b>Total · ${L.length} obreros</b></td><td colspan="${R.days.length}"></td><td class="mono t-r">${L.reduce((s,w)=>s+w.dias,0)}</td>
      <td class="mono t-r">${toH(L.reduce((s,w)=>s+w.hn,0))}</td><td class="mono t-r">${toH(L.reduce((s,w)=>s+w.h60,0))}</td><td class="mono t-r">${toH(L.reduce((s,w)=>s+w.h100,0))}</td><td class="mono t-r">${toH(L.reduce((s,w)=>s+w.df,0))}</td>
      <td class="mono t-r">${L.reduce((s,w)=>s+w.alt,0)}</td><td class="mono t-r">${L.reduce((s,w)=>s+w.dm,0)}</td><td class="mono t-r">${toH(L.reduce((s,w)=>s+w.dsc,0))}</td></tr></tfoot></table></div>
    <p class="pad note ts-leg">A asistió · P jornada parcial · F falta · DM descanso médico · DA accidente · VA vacaciones · SM/SE subsidio · SU suspensión · LS licencia · FE feriado no laborado · D descanso · IN ingreso · CE cese · EX sin tareo con excepción · ? activo sin tareo · · sin publicar · — fuera de planilla · ▲ bono por altura (${P.alt} %). Clic en un obrero: su detalle.</p>`}

function trhAlertas(R){const T=R.T,P=R.P,hoy=todayIso();const L=[];const dot=c=>`<span class="ts-dot" style="background:${c}"></span>`;
  const pend=R.days.filter(f=>f<=hoy&&!R.pub.includes(f)&&!tNoLab(f));
  if(pend.length)L.push([dot('var(--warn)'),`${pend.length===1?'1 día':pend.length+' días'} sin publicar`,`${pend.map(f=>tsDiaL(f)).join(', ')}: no entran en los totales; se suman solos al publicar.`]);
  if(T.f)L.push([dot('var(--bad)'),`${T.f} ${T.f===1?'falta':'faltas'} sin motivo`,'Si hay sustento (descanso médico, permiso…), cambia el motivo en el tareo del día y vuelve a publicar.']);
  if(T.sinTareo)L.push([dot('var(--bad)'),`${T.sinTareo} activos sin tareo algún día`,'Figuran «?»: están en el máster pero no en la publicación. Revisa si cesaron o falta su motivo.']);
  if(T.dm){let s='Para saber si alguno pasó los '+P.dmEmp+' días del año (desde el siguiente paga EsSalud), abre «Descansos médicos».';
    if(trhDmVal(R)){const cerca=R.W.filter(w=>w.dm&&(TRH.dmY.m.get(w.dni)||0)>=P.dmEmp-2);if(cerca.length)s=cerca.map(w=>`${w.ape||w.dni}: ${TRH.dmY.m.get(w.dni)} de ${P.dmEmp}`).join(' · ')}
    L.push([dot('var(--accent)'),`${T.dm} ${T.dm===1?'día':'días'} de descanso médico`,s])}
  if(T.df)L.push([dot('var(--warn)'),`${toH(T.df)} h en domingo o feriado`,P.df100?'Van todas al 100 % (doble jornal).':'']);
  if(T.feT)L.push([dot('var(--accent)'),`${T.feT} ${T.feT===1?'día':'días'} de feriado trabajado`,`Además del 100 %, el convenio paga una asignación del ${P.feA} % de la BUC por cada uno (ya va en el costo).`]);
  /* el refrigerio (mín. 45 min) es irrenunciable (D.S. 007-2002-TR art. 7; SUNAFIL Res. 024-2024-TFL): el corrido no debe ser costumbre */
  const corr=R.W.filter(w=>w.corMax>=3);
  if(corr.length)L.push([dot('var(--warn)'),`${corr.length} ${corr.length===1?'obrero trabajó':'obreros trabajaron'} corrido 3 o más días en una semana`,
    `${corr.slice(0,6).map(w=>w.ape||w.dni).join(', ')}${corr.length>6?'…':''}. El refrigerio (mínimo 45 min) es irrenunciable: el corrido debe ser excepcional.`]);
  const hhPc=tR2([...R.PC.values()].reduce((s,o)=>s+o.tot,0));
  L.push([dot(Math.abs(hhPc-T.hh)<0.01?'var(--ok)':'var(--bad)'),`Cuadre con Costos: ${toH(T.hh)} HH = ${toH(hhPc)} HH`,Math.abs(hhPc-T.hh)<0.01?'Todas las horas pagadas están asignadas a una partida.':'Hay horas sin partida: revisa los tareos.']);
  return`<div class="card ts-al" id="trhAl"><div class="tp-bh"><b>Para revisar antes de la planilla</b></div><ul class="ts-ul">${L.map(([d,t,s])=>`<li>${d}<span><b>${esc(t)}</b><br><span class="note">${esc(s)}</span></span></li>`).join('')}</ul></div>`}

function trhDet(R){const w=TRH.sel&&R.W.find(x=>x.dni===TRH.sel);if(!w)return'';const t=S.tper&&S.tper.get(w.dni)||{};const PB=tsePB('rh');
  const pn=(f,k)=>{const p=PB.get(f);const m=p&&(p.pcs||{})[k];return m?`${m.cod} ${m.nom}`:(S.tpc&&S.tpc.get(k)?`${S.tpc.get(k).cod} ${S.tpc.get(k).nom}`:k)};
  const fi=[w.catN,w.cua,w.capN?('Capataz '+w.capN):'',t.ing?'ingresó '+tFmt(t.ing):'',(q=>q.hij!=null?`${q.hij} ${+q.hij===1?'hijo':'hijos'}`:'')(tPriv(w.dni)),tPriv(w.dni).afp||''].filter(Boolean).join(' · ');
  return`<div class="card ts-det" id="trhDet"><div class="tp-bh"><b>${esc([w.ape,w.nom].filter(Boolean).join(', '))}</b><button class="kx" id="trhDetX" aria-label="Cerrar detalle">&times;</button></div>
    <div class="note">DNI <span class="mono">${esc(w.dni)}</span>${fi?' · '+esc(fi):''}</div>
    <ul class="ts-ul ts-dl">${w.d.filter(c=>c.code&&c.code!=='—').map(c=>`<li><b>${esc(tsDiaL(c.f))}</b><span>${c.pcs.length?c.pcs.map(([k,h])=>`${esc(pn(c.f,k))} · ${toH(h)} h`).join('<br>'):esc(c.code==='·'?'Sin publicar':c.mot?(TO_MOT[c.mot]||c.mot):c.code==='D'?'Descanso':c.code==='?'?'No figura en la publicación':c.code)}${c.alt?' · ▲ altura':''}${c.hor?`<br><span class="note">${esc(c.hor)}</span>`:''}${c.h60||c.h100||c.df?`<br><span class="note">HE ${toH(c.h60+c.h100)}${c.df?` · dom/fer ${toH(c.df)}`:''}</span>`:''}</span><span class="mono">${c.h?toH(c.h):''}</span></li>`).join('')}
      <li><b>Total</b><span>HN ${toH(w.hn)} · HE60 ${toH(w.h60)} · HE100 ${toH(w.h100)}${w.df?' · dom/fer '+toH(w.df):''}<br><span class="note">altura ${w.alt} d · movilidad ${w.mov} d · dominical ${esc(w.dscTxt)}</span></span><span class="mono">${toH(w.hh)}</span></li></ul></div>`}

/* altas y bajas del periodo (del máster: ingreso y cese de cada periodo de la ficha) */
function trhAltas(R){const L=[];if(S.tper)for(const t of S.tper.values()){if(t.arch)continue;const per=Array.isArray(t.per)&&t.per.length?t.per:[{ing:t.ing,ces:t.ces,mot:t.mot}];
    for(const x of per){if(x.ing&&x.ing>=R.a&&x.ing<=R.b)L.push({t,f:x.ing,k:'Ingreso',mot:''});if(x.ces&&x.ces>=R.a&&x.ces<=R.b)L.push({t,f:x.ces,k:'Cese',mot:x.mot||''})}}
  L.sort((a,b)=>a.f<b.f?-1:a.f>b.f?1:0);
  return`<div class="tscroll"><table class="t t-tbl" id="trhAlt"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Obrero</th><th>DNI</th><th>Categoría</th><th>Cuadrilla</th><th>Motivo</th></tr></thead><tbody>
    ${L.map(x=>`<tr><td class="mono">${esc(fmtD(x.f))}</td><td><b class="${x.k==='Cese'?'ts-b':'ts-ok'}">${x.k}</b></td><td>${esc(tName(x.t))}</td><td class="mono">${esc(x.t.dni||x.t.id)}</td><td>${esc(tpxCat(x.t.cat)||'')}</td><td>${esc(x.t.cua||'')}</td><td>${esc(x.mot)}</td></tr>`).join('')||'<tr><td colspan="7" class="note">Nadie ingresó ni cesó en este periodo.</td></tr>'}</tbody></table></div>
    <p class="pad note">Salen del máster de Personal (fecha de ingreso y de cese de cada periodo). Para corregir una fecha, edita la ficha.</p>`}

/* descansos médicos del periodo y, a pedido, los días acumulados en el año (lee las publicaciones del año: tarda unos segundos) */
function trhDM(R){const P=R.P;const L=R.W.filter(w=>w.dm).map(w=>({w,dias:w.d.filter(c=>c.code==='DM'||c.code==='DA').map(c=>tsDiaL(c.f))}));const Y=trhDmVal(R);const K=trhDmRango(R);
  return`<div class="pad t-bar"><span class="note">La empresa paga los primeros ${P.dmEmp} días de descanso médico del año; desde el siguiente, el subsidio lo reconoce EsSalud. Hasta ${P.dmTope} días al año cuentan para gratificaciones, CTS, vacaciones y asignación escolar. «En el año» cuenta del 01/01 al ${esc(fmtD(K.hasta))} (fin del periodo).</span>
    <button class="ib" id="trhDmY"${TRH.dmBusy?' disabled':''}>${TRH.dmBusy?'Contando…':Y?`Volver a contar ${esc(K.y)}`:`Contar los días del año ${esc(K.y)}`}</button></div>
    <div class="tscroll"><table class="t t-tbl" id="trhDmT"><thead><tr><th>Obrero</th><th>DNI</th><th>Días en el periodo</th><th class="t-r">N.°</th><th class="t-r">En el año</th><th>Situación</th></tr></thead><tbody>
    ${L.map(({w,dias})=>{const y=Y?Y.m.get(w.dni)||0:null;const s=y==null?'':y>P.dmTope?`<b class="ts-b">Pasó los ${P.dmTope}: paga EsSalud y los días desde el ${P.dmTope+1} ya no cuentan para beneficios</b>`:y>P.dmEmp?`<b class="ts-b">Pasó los ${P.dmEmp}: desde el día ${P.dmEmp+1} paga EsSalud</b>`:y>=P.dmEmp-2?`<b class="ts-w">Cerca del límite</b>`:'Paga la empresa';
      return`<tr><td>${esc([w.ape,w.nom].filter(Boolean).join(', '))}</td><td class="mono">${esc(w.dni)}</td><td>${esc(dias.join(', '))}</td><td class="mono t-r">${w.dm}</td><td class="mono t-r">${y==null?'<span class="note">—</span>':y}</td><td>${s}</td></tr>`}).join('')||'<tr><td colspan="6" class="note">Sin descansos médicos en este periodo.</td></tr>'}</tbody></table></div>`}
/* año y fin del conteo: el año del INICIO del periodo (una semana que cruza el año cuenta en el suyo) y hasta el fin del periodo visto */
function trhDmRango(R){const y=R.a.slice(0,4);const fin=y+'-12-31';return{y,hasta:R.b<fin?R.b:fin}}
const trhDmVal=R=>{const K=trhDmRango(R),Y=TRH.dmY;return Y&&Y.y===K.y&&Y.hasta===K.hasta?Y:null};
async function trhDmAnio(y,hasta){if(TRH.dmBusy)return;TRH.dmBusy=true;requestRender();
  try{const a=y+'-01-01',fin=y+'-12-31',b=hasta&&hasta<fin?hasta:fin;const sn=await fcol('tpubidx').where('fecha','>=',a).where('fecha','<=',b).get();const m=new Map();
    const ids=sn.docs.map(x=>{const d=x.data()||{};return d.v!=null?tpId(d.fecha||x.id,d.v):null}).filter(Boolean);
    for(let i=0;i<ids.length;i+=20){const ps=await Promise.all(ids.slice(i,i+20).map(id=>tpGet(id).catch(()=>null)));
      for(const p of ps)if(p){const en=new Set();for(const r of tpRows(p)){en.add(r.dni);if(r.as!==true&&(r.mot==='DM'||r.mot==='DA'))m.set(r.dni,(m.get(r.dni)||0)+1)}
        /* también las excepciones (sin tareo) con motivo de descanso médico */
        for(const[dni,x]of Object.entries(p.exc||{}))if(!en.has(dni)&&tpxExcCod(x&&x.motivo)==='DM')m.set(dni,(m.get(dni)||0)+1)}}
    TRH.dmY={y,hasta:b,m,n:ids.length}}
  catch(e){toast('No se pudieron contar: '+(e.code||e.message||e))}finally{TRH.dmBusy=false;requestRender()}}

/* asignación escolar del mes: N.° de hijos de la ficha × jornales al año ÷ 12 × jornal de su categoría (se paga la última semana) */
function trhAE(R){const P=R.P;const m=R.b.slice(0,7);const fin=addD(tpkMesAdd(m,1)+'-01',-1);const V=tplVig(fin,P);const soles=tplSoles();
  const L=[];if(S.tper)for(const t of S.tper.values()){if(t.arch)continue;const h=+tPriv(t.dni||t.id).hij||0;if(!h)continue;const F=tsFicha(t.dni||t.id);if(!tpDates(m+'-01',fin).some(d=>F.act(d)))continue;
    /* sin categoría de jornal (capataz, «Otro»): el del peón, como el costo */
    const c=tsCat(t.cat);const jb=V.jb[V.jb[c]?c:'PE']||0;
    /* proporcional a los días del mes en planilla (quien ingresa o cesa a mitad de mes); constancia de estudios del año (ficha) */
    const dm=tpDates(m+'-01',fin);const act=dm.filter(d=>F.act(d)).length;const pv=tPriv(t.dni||t.id);const ok=String(pv.aeY||'')===m.slice(0,4);
    L.push({t,h,c,jb,act,nd:dm.length,ok,mes:tR2(h*jb*P.ae/12*act/dm.length)})}
  L.sort((a,b)=>tName(a.t).localeCompare(tName(b.t)));const tot=tR2(L.filter(x=>x.ok).reduce((s,x)=>s+x.mes,0));const sinC=L.filter(x=>!x.ok).length;
  return`<div class="pad note">Mes de ${esc(tpkMesN(m))}: ${P.ae} jornales al año por hijo (hasta ${P.aeEdad} años, con constancia de estudios), pagados en la última semana de cada mes, en proporción a los días del mes en planilla. El N.° de hijos y la constancia de estudios del año se registran en la ficha (Personal).${sinC?` <b>${sinC} sin constancia de ${esc(m.slice(0,4))}</b>: no entran en el total hasta que la presenten.`:''}</div>
    <div class="tscroll"><table class="t t-tbl" id="trhAeT"><thead><tr><th>Obrero</th><th>DNI</th><th>Categoría</th><th class="t-r">Hijos</th><th class="t-r">Días</th><th>Constancia</th>${soles?'<th class="t-r">Jornal</th><th class="t-r">Monto del mes (S/)</th>':''}</tr></thead><tbody>
    ${L.map(x=>`<tr><td>${esc(tName(x.t))}</td><td class="mono">${esc(x.t.dni||x.t.id)}</td><td>${esc(tpxCat(x.t.cat)||'Otro')}</td><td class="mono t-r">${x.h}</td><td class="mono t-r">${x.act}/${x.nd}</td><td>${x.ok?'✓':'<span class="t-bad">falta</span>'}</td>${soles?`<td class="mono t-r">${x.jb.toFixed(2)}</td><td class="mono t-r">${x.ok?x.mes.toFixed(2):`<s>${x.mes.toFixed(2)}</s>`}</td>`:''}</tr>`).join('')||`<tr><td colspan="8" class="note">Nadie activo este mes tiene hijos registrados en su ficha.</td></tr>`}</tbody>
    ${L.length&&soles?`<tfoot><tr><td colspan="7"><b>Total del mes${sinC?' (con constancia)':''}</b></td><td class="mono t-r"><b>${tot.toFixed(2)}</b></td></tr></tfoot>`:''}</table></div>`}

/* ======================================================================
   Parámetros de planilla y costos (tcfg/pla): editan admin y asistente de tareo; los demás los ven
   ====================================================================== */
function renderTPla(main){const P=TPL();const ed=tplEd();const dis=ed?'':' disabled';if(!TPLA.draft)TPLA.draft=JSON.parse(JSON.stringify(P));const D=TPLA.draft;
  const V=D.vig[D.vig.length-1];const f2=x=>(Math.round((+x||0)*100+1e-7)/100).toFixed(2);/* 22,325 → 22,33 como la tabla salarial */
  const inp=(id,v,l,suf)=>`<label class="lqlab">${l}<span class="ts-in"><input class="tin t-n" id="${id}" type="number" step="any" min="0" value="${v==null?'':esc(String(v))}"${dis}>${suf?`<i>${suf}</i>`:''}</span></label>`;
  main.innerHTML=`<div class="scroll"><div class="wrap ts">${pageHead('Parámetros de planilla y costos','Régimen de construcción civil: lo usan RR.HH., Costos y sus Excel',`<button class="ib" id="tplBack">← Volver</button>${ed?'<button class="ib pri" id="tplSave">Guardar</button>':''}`)}
    ${ed?'':'<div class="callout">Solo lectura: los cambia el administrador o el asistente de tareo.</div>'}
    <div class="card"><h2>Jornales por categoría <span class="sub">Cada tabla rige desde su fecha: las semanas anteriores usan la suya.</span></h2>
      <div class="pad t-bar"><label class="lqlab">Rige desde<input class="tin" type="date" id="tplDesde" value="${esc(V.desde)}"${dis}></label><label class="lqlab ts-w2">Nota<input class="tin" id="tplNota" value="${esc(V.nota||'')}"${dis}></label>
        ${ed?'<button class="ib" id="tplNueva">+ Nueva vigencia</button>':''}<span class="note">${D.vig.length>1?'Anteriores: '+D.vig.slice(0,-1).map(v=>`${esc(tFmt(v.desde))}${v.nota?' ('+esc(v.nota)+')':''}`).join(' · '):''}</span></div>
      <div class="tscroll"><table class="t t-tbl" id="tplJor"><thead><tr><th>Categoría</th><th>Jornal básico (S/ por 8 h)</th><th>BUC %</th><th class="t-r">Hora ordinaria</th><th class="t-r">Hora extra ${D.sob1}%</th><th class="t-r">Hora extra ${D.sob2}%</th><th class="t-r">Dominical por día laborado</th></tr></thead><tbody>
      ${TPLA_CAT.map(([c,l])=>{const jb=+V.jb[c]||0;return`<tr><td><b>${l}</b></td><td><input class="tin t-n" data-tpj="${c}" type="number" step="0.01" min="0" value="${esc(String(V.jb[c]??''))}" aria-label="Jornal ${l}"${dis}></td>
        <td><input class="tin t-n" data-tpb="${c}" type="number" step="1" min="0" value="${esc(String(V.buc[c]??''))}" aria-label="BUC ${l}"${dis}></td>
        <td class="mono t-r">${f2(jb/8)}</td><td class="mono t-r">${f2(jb/8*(1+D.sob1/100))}</td><td class="mono t-r">${f2(jb/8*(1+D.sob2/100))}</td><td class="mono t-r">${f2(jb/6)}</td></tr>`}).join('')}</tbody></table></div>
      <p class="pad note">Hora = jornal ÷ 8 · dominical = jornal ÷ 6 por día laborado de lunes a sábado (6 días = un jornal).</p></div>
    <div class="ts-g2">
      <div class="card"><h2>Horas extra y descansos</h2><div class="pad t-form">
        ${inp('tplH60',D.he60h,'Horas al primer recargo (desde la jornada del día)','h')}${inp('tplS1',D.sob1,'Primer recargo','%')}${inp('tplS2',D.sob2,'Recargo desde la siguiente hora','%')}
        <label class="chk t-wide"><input type="checkbox" id="tplDf"${D.df100?' checked':''}${dis}> Domingo y feriado trabajados: todas las horas al ${D.sob2} %</label></div>
        <p class="pad note">La jornada de cada día y los feriados están en Configuración del tareo (convenio: 9.ª y 10.ª hora al 60 %, desde la 11.ª al 100 %).</p></div>
      <div class="card"><h2>Bonificaciones</h2><div class="pad t-form">${inp('tplAlt',D.alt,'Bono por altura (solo con riesgo de caída libre)','%')}${inp('tplMov',D.mov,'Movilidad por día laborado','S/')}${inp('tplFeA',D.feA,'Asignación por feriado trabajado (sobre la BUC)','%')}</div>
        <p class="pad note">El capataz marca la altura en el tareo de cada día (▲).</p></div>
      <div class="card"><h2>Descanso médico y asignación escolar</h2><div class="pad t-form">${inp('tplDmE',D.dmEmp,'Días de DM que paga la empresa al año','d')}${inp('tplDmT',D.dmTope,'Tope de DM que cuenta para beneficios','d')}
        ${inp('tplAe',D.ae,'Asignación escolar: jornales al año por hijo','j')}${inp('tplAeE',D.aeEdad,'Edad máxima del hijo','años')}</div>
        <p class="pad note">El N.° de hijos y el sistema de pensiones (AFP u ONP) se registran en la ficha de cada obrero (Personal).</p></div>
      <div class="card"><h2>Costos</h2><div class="pad t-form">${inp('tplLey',D.leyes,'Leyes sociales y beneficios sobre el jornal (lo define costos)','%')}
        <p class="note" id="tplSol">Los montos en soles los ven solo Costos y el administrador.</p>
        <label class="chk t-wide"><input type="checkbox" id="tplUa"${D.avisoUA?' checked':''}${dis}> Avisar si una partida con horas no tiene UA de Powers</label></div>
        <p class="pad note">Costo HH = (jornal + BUC) ÷ 8 × (1 + leyes sociales) + recargo de las horas extra. Sin leyes sociales, el costo sale sin ellas y se avisa.</p></div>
    </div>
    ${tplDctCard(D,ed)}
    <div class="card"><h2>Códigos de asistencia</h2><div class="tscroll"><table class="t t-tbl" id="tplCod"><thead><tr><th>Código</th><th>Significado</th><th>Se paga</th><th>Cuenta para dominical</th><th>Cuenta para BUC y movilidad</th></tr></thead><tbody>
      ${TPLA_COD.map(([k,n,p,d,b])=>`<tr><td><b class="mono ${TS_COD_CL[k]||''}">${esc(k)}</b></td><td>${esc(k==='DM'?n.replace(/día \d+/,'día '+D.dmEmp):n)}</td><td>${esc(p)}</td><td>${esc(d)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div></div>
    ${P.ts?`<p class="note">Último cambio: ${esc(toWho(P.by)||P.by)} · ${esc(tpAt(P.ts))}</p>`:''}
  </div></div>`;
  $('#tplBack').onclick=()=>{TPLA.on=false;TPLA.draft=null;requestRender()};
  if(!ed)return;
  const rd=()=>{const g=id=>{const v=$(id).value;return v===''?null:+v};const v=D.vig[D.vig.length-1];v.desde=$('#tplDesde').value||v.desde;v.nota=$('#tplNota').value.trim();
    $$('[data-tpj]').forEach(i=>{v.jb[i.dataset.tpj]=i.value===''?0:+i.value});$$('[data-tpb]').forEach(i=>{v.buc[i.dataset.tpb]=i.value===''?0:+i.value});
    const dv=D.dtar[D.dtar.length-1];if(dv&&$('#tplDtDesde')){dv.desde=$('#tplDtDesde').value||dv.desde;dv.nota=$('#tplDtNota').value.trim();$$('[data-tpdt]').forEach(i=>{const x=i.value.trim().replace(',','.');dv.t[i.dataset.tpdt]=x===''||!(+x>0)?null:+x})}
    Object.assign(D,{he60h:g('#tplH60')??2,sob1:g('#tplS1')??60,sob2:g('#tplS2')??100,df100:$('#tplDf').checked,alt:g('#tplAlt')??0,mov:g('#tplMov')??0,feA:g('#tplFeA')??10,dmEmp:g('#tplDmE')??20,dmTope:g('#tplDmT')??60,ae:g('#tplAe')??30,aeEdad:g('#tplAeE')??24,leyes:g('#tplLey'),soles:'cos',avisoUA:$('#tplUa').checked})};
  /* los valores calculados se actualizan en su lugar: redibujar mientras se escribe borraría lo que se está tecleando */
  const calc=()=>{const v=D.vig[D.vig.length-1];$$('#tplJor tbody tr').forEach((tr,i)=>{const c=TPLA_CAT[i][0];const jb=+v.jb[c]||0;const td=tr.querySelectorAll('td.mono');
    if(td.length===4){td[0].textContent=f2(jb/8);td[1].textContent=f2(jb/8*(1+D.sob1/100));td[2].textContent=f2(jb/8*(1+D.sob2/100));td[3].textContent=f2(jb/6)}})};
  main.querySelector('.ts').addEventListener('input',e=>{if(e.target.closest('input,select')){rd();calc()}});
  const dn=$('#tplDtNueva');if(dn)dn.onclick=()=>{rd();const u=D.dtar[D.dtar.length-1];D.dtar.push({desde:todayIso(),nota:'',t:u?{...u.t}:{OP:null,OF:null,PE:null}});requestRender()};
  const nv=$('#tplNueva');if(nv)nv.onclick=()=>{rd();const u=D.vig[D.vig.length-1];D.vig.push({desde:todayIso(),nota:'',jb:{...u.jb},buc:{...u.buc}});requestRender()};
  $('#tplSave').onclick=async()=>{rd();const ds=D.vig.map(v=>v.desde);if(new Set(ds).size!==ds.length){toast('Dos tablas de jornales no pueden regir desde la misma fecha.');return}
    if(D.vig.some(v=>TPLA_CAT.some(([c])=>!(+v.jb[c]>0)))){toast('Escribe el jornal de las tres categorías.');return}
    /* rangos razonables (los mismos que exigen las reglas de tcfg/pla; auditoría 21-10-2026) */
    const R0=[['he60h','Horas al 60 %',0,12],['sob1','Recargo de las primeras HE',0,300],['sob2','Recargo de las demás HE',0,300],['alt','Bono por altura',0,100],['mov','Movilidad',0,200],['feA','Asignación por feriado trabajado',0,100],
      ['dmEmp','Días de DM que paga la empresa',0,366],['dmTope','Tope de días de DM',0,366],['ae','Asignación escolar',0,366],['aeEdad','Edad tope de los hijos',0,30],['leyes','Leyes sociales',0,300]];
    for(const[k,l,lo,hi]of R0){const v=D[k];if(v!=null&&!(Number.isFinite(+v)&&+v>=lo&&+v<=hi)){toast(`${l}: escribe un número entre ${lo} y ${hi}.`);return}}
    if(D.vig.some(v=>TPLA_CAT.some(([c])=>+v.jb[c]>2000||+v.buc[c]<0||+v.buc[c]>200))){toast('Revisa los jornales (hasta S/ 2000) y el BUC (0 a 200 %).');return}
    const vig=D.vig.map(v=>({desde:v.desde,nota:v.nota||'',jb:{...v.jb},buc:{...v.buc}})).sort((a,b)=>a.desde<b.desde?-1:1);
    const dds=D.dtar.map(v=>v.desde);if(new Set(dds).size!==dds.length){toast('Dos tablas de tarifas de descuento no pueden regir desde la misma fecha.');return}
    if(D.dtar.some(v=>TPLA_CAT.some(([c])=>v.t[c]!=null&&!(+v.t[c]>0&&+v.t[c]<=1000)))){toast('Revisa las tarifas de descuento (S/ por HH, hasta 1000; vacío = costo de la planilla).');return}
    const dtar=D.dtar.map(v=>({desde:v.desde,nota:v.nota||'',t:{...v.t}})).sort((a,b)=>a.desde<b.desde?-1:1);
    const d={vig,dtar,he60h:D.he60h,sob1:D.sob1,sob2:D.sob2,df100:D.df100,alt:D.alt,mov:D.mov,dmEmp:D.dmEmp,dmTope:D.dmTope,ae:D.ae,aeEdad:D.aeEdad,feA:D.feA,leyes:D.leyes,soles:D.soles,avisoUA:D.avisoUA,...tStamp()};
    try{await fcol(TCOLS.tcfg).doc('pla').set(d);TPLA.draft=null;toast('Parámetros guardados.');requestRender()}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}}

/* tarifas de descuento a SC (24-10-2026): S/ por HH normal por categoría, con vigencias como los jornales (cambiar la tarifa no altera
   los días anteriores a su «Rige desde»). Vacío = costo HH de la planilla (tplHH). Las HE llevan el recargo de arriba. */
function tplDctCard(D,ed){const dis=ed?'':' disabled';const V=D.dtar[D.dtar.length-1];const hoy=todayIso();const f=V?V.desde:hoy;
  const P0={...D,leyes:D.leyes};const pl=c=>{try{return tplHH(c,f,P0)}catch(e){return 0}};
  return`<div class="card" id="tplDct"><h2>Tarifas de descuento a SC <span class="sub">Lo que se descuenta a un subcontratista por cada HH de una partida descontable. Las horas extra llevan el recargo de arriba (${D.sob1} % y ${D.sob2} %).</span></h2>
    ${V?`<div class="pad t-bar"><label class="lqlab">Rige desde<input class="tin" type="date" id="tplDtDesde" value="${esc(V.desde)}"${dis}></label><label class="lqlab ts-w2">Nota<input class="tin" id="tplDtNota" value="${esc(V.nota||'')}"${dis}></label>
      ${ed?'<button class="ib" id="tplDtNueva">+ Nueva vigencia</button>':''}<span class="note">${D.dtar.length>1?'Anteriores: '+D.dtar.slice(0,-1).map(v=>`${esc(tFmt(v.desde))}${v.nota?' ('+esc(v.nota)+')':''}`).join(' · '):''}</span></div>
    <div class="tscroll"><table class="t t-tbl" id="tplDtT"><thead><tr><th>Categoría</th><th>Tarifa (S/ por HH)</th><th class="t-r">Costo HH de la planilla</th><th class="t-r">HE ${D.sob1} %</th><th class="t-r">HE ${D.sob2} %</th></tr></thead><tbody>
      ${TPLA_CAT.map(([c,l])=>{const t=V.t[c];const b=t>0?t:pl(c);return`<tr><td><b>${l}</b></td><td><input class="tin t-n" data-tpdt="${c}" inputmode="decimal" value="${t>0?esc(String(t)):''}" placeholder="${esc(pl(c).toFixed(2))}" aria-label="Tarifa de descuento ${l}"${dis}></td>
        <td class="mono t-r">${pl(c).toFixed(2)}</td><td class="mono t-r">${(b*(1+D.sob1/100)).toFixed(2)}</td><td class="mono t-r">${(b*(1+D.sob2/100)).toFixed(2)}</td></tr>`}).join('')}</tbody></table></div>`
    :`<p class="pad note">Sin tarifas propias: se descuenta el costo HH de la planilla de cada categoría (jornal + BUC ÷ 8 × leyes sociales).</p>${ed?'<div class="pad"><button class="ib" id="tplDtNueva">+ Poner tarifas de descuento</button></div>':''}`}
    <p class="pad note">Vacío = costo HH de la planilla. Cada tabla rige desde su fecha: los días anteriores conservan su tarifa.</p></div>`}
