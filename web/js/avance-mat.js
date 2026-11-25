"use strict";
/* LPS 911 · Módulo Avance: llegada de material a obra (25-11-2026, pedido del dueño; docs/ia/avance.md «Material en obra»).
   El material llega por TIPO, no por ambiente: las filas con la misma descripción y unidad (la silla SV-1 en 13 ambientes, la puerta
   P-3 en 20) son un mismo tipo, y de cada tipo se anota un solo número: cuánto ha llegado a obra (acumulado).
   - Botón «Material» de la barra → lista de tipos: metrado total, Llegó (lo único que se tipea), instalado y saldo en obra.
   - Un tipo con «Llegó» en blanco NO se controla (pintura y lo que llega a granel quedan fuera sin apagar nada).
   - El saldo de cada tipo (llegó − instalado) se REPARTE entre sus filas en orden de instalación: los pisos en el orden elegido en
     «Material» (avp.matOrd; por defecto el de la obra) y, dentro del piso, el orden de la tabla. Cada fila queda: con material
     (alcanza para terminarla), parcial, sin material, o terminada. De ahí sale todo lo demás, sin tipear nada más:
     · punto verde / ámbar / rojo en la fila y filtro «Con material | Sin material» (qué puedo instalar hoy);
     · marca en cada ambiente: «✓ material» (se puede terminar con lo que hay) o «falta material» con el detalle;
     · en «Material»: avance posible, material parado, falta llegar (con Excel) y el cuadro por nivel;
     · en Resumen: los mismos números por partida.
   - Se guarda en la partida: avp/{id}.mat[clave] = {q, d, u, by, n, t, log:[{q,a,by,n,t}]} (campo nuevo y opcional; no toca reglas).
     Lo edita quien configura la partida (admin y editores, como pide la regla de avp); el resto lo consulta. */
/** clave del tipo: descripción + unidad normalizadas, solo [a-z0-9_] (va como nombre de campo en Firestore) */
const avMatK1=(s,n)=>mnk(s).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,n);
const avMatKey=(desc,und)=>avMatK1(desc,100)+'__'+avMatK1(und,15);   /* «__» separa descripción y unidad: dos tipos distintos no comparten clave */
/** las mismas filas que muestra la planilla (sin las de pisos que ya no existen) */
const avMatRows=D=>D.rows.filter(r=>S.pis.has(r.piso)||ARCH.pis.has(r.piso));
/** tipos de la partida con su metrado, lo instalado y lo llegado (función pura). sin = controlado, falta instalar y no queda saldo */
function avMatTypes(rows,ex,mat){const M=new Map();rows.forEach(r=>{const k=avMatKey(r.desc,r.und);let x=M.get(k);if(!x){x={key:k,desc:r.desc,und:r.und,q:0,inst:0,n:0};M.set(k,x)}const q=+r.q||0;x.q=avR4(x.q+q);x.inst=avR4(x.inst+avRowPct(ex,r)*q);x.n++});
  M.forEach(x=>{const m=(mat||{})[x.key],ll=m&&typeof m.q==='number'&&m.q>=0?m.q:null;x.ll=ll;x.t=m?m.t:0;x.by=m?(m.n||m.by||''):'';x.saldo=ll==null?null:avR4(ll-x.inst);x.sin=ll!=null&&x.inst<x.q-1e-9&&ll-x.inst<=1e-9});
  return[...M.values()].sort((a,b)=>String(a.desc).localeCompare(String(b.desc),'es',{numeric:true}))}
/** claves de los tipos sin material: para marcar sus filas en la tabla */
function avMatSinN(p,D){return avMatSin(p,D).size}
function avMatSin(p,D){const mat=p&&p.mat;if(!mat||!Object.keys(mat).length)return new Set();return new Set(avMatTypes(avMatRows(D),D.ex,mat).filter(x=>x.sin).map(x=>x.key))}
/** pisos con filas, en orden de instalación: primero los de `ord` (avp.matOrd), luego el resto como están en la obra */
function avMatPisos(rows,ord){const has=new Set(rows.map(r=>r.piso));return[...new Set([...(ord||[]),...pisos().map(x=>x.id),...ARCH.pis.keys()])].filter(id=>has.has(id))}
/** filas en orden de instalación: piso por piso y, dentro del piso, como en la tabla */
function avMatOrder(rows,ord){const out=[];avMatPisos(rows,ord).forEach(pi=>{const T=avTree(pi,rows,[]);out.push(...T.direct);T.secs.forEach(s=>{out.push(...s.direct);s.ambs.forEach(a=>out.push(...a.rows))})});return out}
/** reparte el saldo de cada tipo controlado entre sus filas, en orden de instalación (función pura).
    R: filaId → {st:''(no se controla)|'done'|'ok'|'par'|'sin', falta, give, k};  T: tipos por clave */
function avMatAlloc(rows,ex,mat,ord){const T=new Map(avMatTypes(rows,ex,mat).map(x=>[x.key,x])),left=new Map(),R=new Map(),byAmb=new Map(),E=1e-6;
  /* el saldo se calcula sin redondeos intermedios (con etapas de peso no exacto, redondear fila por fila dejaba «parcial» a quien sí tenía material) */
  const O=avMatOrder(rows,ord).map(r=>({r,k:avMatKey(r.desc,r.und),q:+r.q||0,v:avRowPct(ex,r)})),inst=new Map();O.forEach(o=>inst.set(o.k,(inst.get(o.k)||0)+o.q*o.v));
  T.forEach(x=>{if(x.ll!=null)left.set(x.key,Math.max(0,x.ll-(inst.get(x.key)||0)))});
  O.forEach(({r,k,q,v})=>{if(r.amb){const a=r.piso+'|'+r.amb;byAmb.has(a)?byAmb.get(a).push(r):byAmb.set(a,[r])}const falta=q*(1-v);if(!left.has(k)||q<=0){R.set(r.id,{st:'',falta,give:0,k});return}
    const s=left.get(k),give=Math.min(s,falta);left.set(k,s-give);R.set(r.id,{st:falta<=E?'done':give>=falta-E?'ok':give>E?'par':'sin',falta,give,k})});
  return{R,T,rows,byAmb}}
/** reparto de la partida abierta (se recalcula solo cuando cambian los datos, lo llegado o el orden); null si no se controla nada */
let AVMA=null;
function avMatOf(p,D){const m=p.mat||null,o=p.matOrd||null;if(AVMA&&AVMA.p===p.id&&AVMA.cv===D.cv&&AVMA.dv===DV&&AVMA.m===m&&AVMA.o===o)return AVMA.A;   /* DV: si cambian pisos, sectores o ambientes, cambia el orden */
  const A=m&&Object.values(m).some(x=>x&&typeof x.q==='number')?avMatAlloc(avMatRows(D),D.ex,m,o):null;AVMA={p:p.id,cv:D.cv,dv:DV,m,o,A};return A}
/** un grupo de filas (ambiente, piso…): cuántas por instalar se controlan, si alcanza para todas y qué falta por tipo */
function avMatGrp(A,rs){let n=0,ok=0,pa=0,sn=0;const miss=new Map(),fr=[];let need=0,cov=0,und=null,mix=false;rs.forEach(r=>{const a=A.R.get(r.id);if(!a||!a.st||a.st==='done')return;n++;if(a.st==='ok')ok++;else if(a.st==='par')pa++;else sn++;need+=a.falta;cov+=a.give;fr.push(a.falta>0?a.give/a.falta:1);
    if(und===null)und=mnk(r.und);else if(und!==mnk(r.und))mix=true;const f=a.falta-a.give;if(f>1e-6){const t=A.T.get(a.k),o=miss.get(a.k)||{d:t.desc,u:t.und,f:0};o.f=o.f+f;miss.set(a.k,o)}});
  return{n,ok,pa,sn,full:n>0&&!miss.size,miss:[...miss.values()],cub:!n?null:mix?fr.reduce((s,x)=>s+x,0)/fr.length:need>0?cov/need:1}}
/** marca del ambiente en la tabla */
function avMatTag(G){if(!G.n)return'';if(G.full)return'<span class="avtg o avmtg" title="Con lo que hay en obra se puede terminar lo que falta aquí">✓ material</span>';
  return`<span class="avtg b avmtg" title="${esc('Falta material: '+G.miss.slice(0,6).map(x=>x.d+' ('+avF(avR4(x.f))+' '+x.u+')').join('; ')+(G.miss.length>6?'; …':''))}">falta material</span>`}
/** números de la partida: avance de lo controlado hoy y posible con lo que hay en obra, material parado y lo que falta llegar */
function avMatSum(A,ex){const rs=A.rows.filter(r=>r.q>0&&(A.R.get(r.id)||{}).st),same=avSame(rs);let a=0,b=0,q=0;rs.forEach(r=>{const v=avRowPct(ex,r),g=A.R.get(r.id).give;if(same){a+=v*r.q;b+=v*r.q+g;q+=r.q}else{a+=v;b+=v+g/r.q;q++}});
  const C=[...A.T.values()].filter(x=>x.ll!=null),par=C.filter(x=>x.saldo>1e-9),fal=C.filter(x=>x.q-x.ll>1e-9),u=L=>L.length&&L.every(x=>mnk(x.und)===mnk(L[0].und))?L[0].und:'';
  return{n:C.length,hoy:q?a/q:0,pos:q?Math.min(1,b/q):0,par:par.reduce((s,x)=>s+x.saldo,0),parN:par.length,parU:u(par),fal:fal.reduce((s,x)=>s+x.q-x.ll,0),falN:fal.length,falU:u(fal)}}
const avMatQty=(v,n,u)=>!n?'0':u?`${avF(avR4(v))} ${esc(u)}`:`${n} tipo${n===1?'':'s'}`;
function avMatSumHtml(A,ex){if(!A)return'';const s=avMatSum(A,ex);return`<div class="avtile"><span>Avance posible</span><b>${avPc(s.pos)}</b><small>hoy ${avPc(s.hoy)} · instalando todo lo que hay en obra</small></div>
    <div class="avtile"><span>Material parado</span><b>${avMatQty(s.par,s.parN,s.parU)}</b><small>en obra y sin instalar</small></div>
    <div class="avtile"><span>Falta llegar</span><b>${avMatQty(s.fal,s.falN,s.falU)}</b><small>${s.falN?`<button type="button" class="lnkb" data-avmx="1">Descargar la lista (Excel)</button>`:'llegó todo lo que se controla'}</small></div>`}
/** de un grupo de filas controladas (un nivel): qué parte de su metrado está instalada y qué parte ya tiene material en obra
    (lo instalado + lo que le toca del saldo según el orden de instalación). Con unidades mezcladas, promedio de las filas */
function avMatPct(A,rs,ex){const L=rs.filter(r=>r.q>0&&(A.R.get(r.id)||{}).st);if(!L.length)return null;const same=avSame(L);let a=0,b=0,q=0;L.forEach(r=>{const v=avRowPct(ex,r),g=A.R.get(r.id).give;if(same){a+=v*r.q;b+=v*r.q+g;q+=r.q}else{a+=v;b+=v+g/r.q;q++}});return{inst:a/q,lleg:Math.min(1,b/q)}}
/** cuadro por nivel, en orden de instalación */
function avMatNivHtml(A,ord,cfg,ex){if(!A)return'';const ids=avMatPisos(A.rows,ord);return`<table class="avmt"><thead><tr><th>Orden de instalación</th><th class="num" title="Qué parte del metrado de este nivel ya tiene material en obra (instalado o por instalar), repartiendo lo llegado en este orden">Llegó</th><th class="num" title="Qué parte del metrado de este nivel está instalada">Instalado</th><th class="num" title="Filas controladas que aún no están terminadas">Filas por instalar</th><th class="num" title="Hay material para terminar la fila">Con material</th><th class="num" title="Alcanza solo para una parte de la fila">Parcial</th><th class="num">Sin material</th><th></th></tr></thead><tbody>${ids.map((id,i)=>{const pi=S.pis.get(id)||ARCH.pis.get(id),rs=A.rows.filter(r=>r.piso===id),G=avMatGrp(A,rs),Pc=avMatPct(A,rs,ex);
    return`<tr data-avmp="${esc(id)}"><td>${i+1}. ${esc(pi?pi.name:id)}</td><td class="num">${Pc?`<b>${avPc(Pc.lleg)}</b>`:'<span class="avmu">–</span>'}</td><td class="num">${Pc?avPc(Pc.inst):''}</td><td class="num">${G.n||''}</td><td class="num">${G.n?G.ok:''}</td><td class="num">${G.n?G.pa:''}</td><td class="num${G.sn?' avneg':''}">${G.n?G.sn:''}</td><td>${cfg&&ids.length>1?`<button type="button" class="ib avmob" data-avmo="${esc(id)}|-1"${i?'':' disabled'} title="Instalar antes" aria-label="Subir">▲</button><button type="button" class="ib avmob" data-avmo="${esc(id)}|1"${i<ids.length-1?'':' disabled'} title="Instalar después" aria-label="Bajar">▼</button>`:''}</td></tr>`}).join('')}</tbody></table>`}
function avMatRow(x,cfg){const st=x.ll==null?'<span class="avmu">no se controla</span>':x.sin?'<span class="avtg b">sin material</span>':x.saldo<-1e-9?'<span class="avtg w" title="Llegó menos de lo que figura instalado: revisa el dato">revisar</span>':x.ll>=x.q-1e-9?'<span class="avtg o">completo</span>':`<span class="avmu">falta llegar ${avF(avR4(x.q-x.ll))}</span>`;
  return`<tr data-avmr="${esc(x.key)}"><td title="${esc(x.desc)}">${esc(x.desc)}${x.n>1?` <span class="avmu">· ${x.n} filas</span>`:''}</td><td>${esc(x.und)}</td><td class="num">${avF(x.q)}</td>
    <td class="num">${cfg?`<input class="tin avmli" inputmode="decimal" data-avml="${esc(x.key)}" value="${x.ll==null?'':esc(avE(x.ll))}" placeholder="–" aria-label="Cantidad que llegó de ${esc(x.desc)}">`:(x.ll==null?'–':avF(x.ll))}</td>
    <td class="num">${avF(x.inst)}</td><td class="num${x.saldo!=null&&x.saldo<-1e-9?' avneg':''}">${x.saldo==null?'':avF(x.saldo)}</td><td>${st}</td>
    <td>${cfg&&x.q>0&&!(x.ll!=null&&Math.abs(x.ll-x.q)<1e-9)?`<button type="button" class="ib" data-avmall="${esc(x.key)}" title="Pone en «Llegó» todo el metrado (${avF(x.q)} ${esc(x.und)})">Llegó todo</button>`:''}</td></tr>`}
function avMatDlg(){const p=avCur();if(!p||!avReady(p))return;const cfg=avaCfg(),D=avData(),T=avMatTypes(avMatRows(D),D.ex,p.mat),A=avMatOf(p,D);
  let h=`<div class="avh"><b>Material en obra · ${esc(p.nom)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>
    <p class="avnote">El material llega por tipo, no por ambiente: las filas con la misma descripción y unidad son un mismo tipo. ${cfg?'Escribe en <b>Llegó</b> cuánto hay en obra en total (acumulado). Lo que dejes en blanco no se controla.':''}</p>`;
  if(!T.length)h+=`<div class="empty">Esta partida todavía no tiene filas.</div>`;
  else h+=`<div class="avtiles" id="avmsum">${avMatSumHtml(A,D.ex)}</div><div class="avmtw"><table class="avmt"><thead><tr><th>Tipo</th><th>Und</th><th class="num">Metrado</th><th class="num">Llegó</th><th class="num">Instalado</th><th class="num" title="Llegó menos instalado: lo que queda por colocar">En obra</th><th></th><th></th></tr></thead><tbody>${T.map(x=>avMatRow(x,cfg)).join('')}</tbody></table></div>
    <p class="avnote">Lo que hay en obra de cada tipo se reparte entre sus filas en el <b>orden de instalación</b>: primero el nivel de arriba de esta lista y, dentro de cada nivel, el orden de la tabla.${cfg?' Cambia el orden con ▲▼.':''}</p>
    <div class="avmtw" id="avmniv">${avMatNivHtml(A,p.matOrd,cfg,D.ex)||'<p class="avnote avmpad">Anota en «Llegó» lo que hay en obra de algún tipo para ver el reparto por nivel.</p>'}</div>
    <p class="avnote">En la tabla: punto <b>verde</b> = hay material para terminar la fila, <b>naranja</b> = alcanza para una parte, <b>rojo</b> = sin material. Cada ambiente dice si se puede terminar con lo que hay.</p>`;
  h+=`<div class="avact"><span class="avsp"></span><button type="button" class="ib pri" data-lqx="1">Listo</button></div>`;
  lqModal(h,e=>{if(e.target.closest('[data-avmx]')){avMatXls();return}const mo=e.target.closest('[data-avmo]');if(mo){const k=mo.dataset.avmo.split('|');avMatMove(k[0],+k[1]);return}
    const b=e.target.closest('[data-avmall]');if(b){const x=avMatTypes(avMatRows(avData()),avData().ex,avCur().mat).find(y=>y.key===b.dataset.avmall);if(x)avMatSet(x.key,x.q)}},
    e=>{const t=e.target;if(!t.dataset||t.dataset.avml==null)return;const s=t.value.trim();if(s===''){avMatSet(t.dataset.avml,null);return}
      const v=avNum(s);if(!/^[\d\s.,]+$/.test(s)||!(v>=0)){toast('Escribe una cantidad (o déjalo en blanco para no controlarlo).');t.value=t.defaultValue;return}avMatSet(t.dataset.avml,avR4(v))})}
/** guarda lo llegado de un tipo (null = deja de controlarse) con su historial corto y refresca solo esa línea de la lista */
function avMatSet(key,q){const p=avCur();if(!p||!avaCfg())return;const D=avData(),R=avMatRows(D),x=avMatTypes(R,D.ex,p.mat).find(y=>y.key===key);if(!x)return;
  const old=(p.mat||{})[key]||null,a=old&&typeof old.q==='number'?old.q:null;if(a===q||a!=null&&q!=null&&Math.abs(a-q)<1e-9)return;
  const w=avWho(),doc={q,d:String(x.desc).slice(0,160),u:String(x.und).slice(0,10),...w,log:((old&&old.log)||[]).slice(-19).concat([{q,a,...w}])};
  AVP.set(p.id,{...p,mat:{...(p.mat||{}),[key]:doc}});   /* al instante en memoria; la foto de la base llega después con lo mismo */
  bgWrite(fcol('avp').doc(p.id).update({['mat.'+key]:doc,...w}));
  /* la línea se cambia un instante después: si el cambio vino de soltar el campo al pulsar «Llegó todo», ese clic todavía debe encontrar su botón */
  setTimeout(()=>{const pp=AVP.get(p.id),tr=[...document.querySelectorAll('#lqm tr[data-avmr]')].find(e=>e.dataset.avmr===key),nx=pp&&avMatTypes(R,D.ex,pp.mat).find(y=>y.key===key);if(!tr||!nx)return;
    const A=avMatOf(pp,avData()),s=$('#avmsum'),nv=$('#avmniv');if(s)s.innerHTML=avMatSumHtml(A,D.ex);if(nv)nv.innerHTML=avMatNivHtml(A,pp.matOrd,true,D.ex)||'';
    const foc=tr.contains(document.activeElement)&&document.activeElement.tagName==='INPUT';tr.outerHTML=avMatRow(nx,true);if(foc){const j=[...document.querySelectorAll('#lqm input[data-avml]')].find(e=>e.dataset.avml===key);if(j)j.focus()}},0);
  requestRender()}
/** sube o baja un nivel en el orden de instalación (se guarda en la partida: avp.matOrd) */
function avMatMove(id,dir){const p=avCur();if(!p||!avaCfg())return;const D=avData(),ids=avMatPisos(avMatRows(D),p.matOrd),i=ids.indexOf(id),j=i+dir;if(i<0||j<0||j>=ids.length)return;
  [ids[i],ids[j]]=[ids[j],ids[i]];const w=avWho();AVP.set(p.id,{...p,matOrd:ids});bgWrite(fcol('avp').doc(p.id).update({matOrd:ids,...w}));
  const nv=$('#avmniv');if(nv)nv.innerHTML=avMatNivHtml(avMatOf(AVP.get(p.id),D),ids,true,D.ex);requestRender()}
/** lista de lo que falta llegar, para reclamar a logística o al proveedor (función pura + descarga) */
function avMatFalAoa(p,T){return[['Falta llegar · '+p.nom,'','','','','',''],['Tipo','Und','Metrado','Llegó','Instalado','En obra','Falta llegar']].concat(T.filter(x=>x.ll!=null&&x.q-x.ll>1e-9).map(x=>[x.desc,x.und,x.q,x.ll,x.inst,Math.max(0,x.saldo),avR4(x.q-x.ll)]))}
async function avMatXls(){const p=avCur();if(!p||!avReady(p))return;try{toast('Generando el Excel…');await loadXlsx();const X=window.XLSX,D=avData(),aoa=avMatFalAoa(p,avMatTypes(avMatRows(D),D.ex,p.mat)),ws=X.utils.aoa_to_sheet(aoa);
    ws['!cols']=[{wch:46},{wch:7},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12}];const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Falta llegar');
    saveBlob(`${P().code||'LPS'}_Falta_llegar_${String(p.nom).replace(/[^\wáéíóúñÁÉÍÓÚÑ -]/g,'').trim().replace(/\s+/g,'_')}_${todayIso()}.xlsx`,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
  catch(e){toast('No se pudo generar el Excel: '+(e.message||e))}}
