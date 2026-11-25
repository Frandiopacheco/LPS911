"use strict";
/* LPS 911 · Módulo Avance: llegada de material a obra (25-11-2026, pedido del dueño; docs/ia/avance.md «Material en obra»).
   El material llega por TIPO, no por ambiente: las filas con la misma descripción y unidad (la silla SV-1 en 13 ambientes, la puerta
   P-3 en 20) son un mismo tipo, y de cada tipo se anota un solo número: cuánto ha llegado a obra (acumulado).
   - Botón «Material» de la barra → lista de tipos: metrado total, Llegó (lo único que se tipea), instalado y saldo en obra.
   - Un tipo con «Llegó» en blanco NO se controla (pintura y lo que llega a granel quedan fuera sin apagar nada).
   - En la tabla no hay columnas nuevas: las filas de un tipo sin saldo (llegó ≤ instalado y aún falta instalar) llevan un punto rojo.
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
function avMatSin(p,D){const mat=p&&p.mat;if(!mat||!Object.keys(mat).length)return new Set();return new Set(avMatTypes(avMatRows(D),D.ex,mat).filter(x=>x.sin).map(x=>x.key))}
function avMatRow(x,cfg){const st=x.ll==null?'<span class="avmu">no se controla</span>':x.sin?'<span class="avtg b">sin material</span>':x.saldo<-1e-9?'<span class="avtg w" title="Llegó menos de lo que figura instalado: revisa el dato">revisar</span>':x.ll>=x.q-1e-9?'<span class="avtg o">completo</span>':`<span class="avmu">falta llegar ${avF(avR4(x.q-x.ll))}</span>`;
  return`<tr data-avmr="${esc(x.key)}"><td title="${esc(x.desc)}">${esc(x.desc)}${x.n>1?` <span class="avmu">· ${x.n} filas</span>`:''}</td><td>${esc(x.und)}</td><td class="num">${avF(x.q)}</td>
    <td class="num">${cfg?`<input class="tin avmli" inputmode="decimal" data-avml="${esc(x.key)}" value="${x.ll==null?'':esc(avE(x.ll))}" placeholder="–" aria-label="Cantidad que llegó de ${esc(x.desc)}">`:(x.ll==null?'–':avF(x.ll))}</td>
    <td class="num">${avF(x.inst)}</td><td class="num${x.saldo!=null&&x.saldo<-1e-9?' avneg':''}">${x.saldo==null?'':avF(x.saldo)}</td><td>${st}</td>
    <td>${cfg&&x.q>0&&!(x.ll!=null&&Math.abs(x.ll-x.q)<1e-9)?`<button type="button" class="ib" data-avmall="${esc(x.key)}" title="Pone en «Llegó» todo el metrado (${avF(x.q)} ${esc(x.und)})">Llegó todo</button>`:''}</td></tr>`}
function avMatDlg(){const p=avCur();if(!p||!avReady(p))return;const cfg=avaCfg(),T=avMatTypes(avMatRows(avData()),avData().ex,p.mat);
  let h=`<div class="avh"><b>Material en obra · ${esc(p.nom)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>
    <p class="avnote">El material llega por tipo, no por ambiente: las filas con la misma descripción y unidad son un mismo tipo. ${cfg?'Escribe en <b>Llegó</b> cuánto hay en obra en total (acumulado). Lo que dejes en blanco no se controla.':''}</p>`;
  if(!T.length)h+=`<div class="empty">Esta partida todavía no tiene filas.</div>`;
  else h+=`<div class="avmtw"><table class="avmt"><thead><tr><th>Tipo</th><th>Und</th><th class="num">Metrado</th><th class="num">Llegó</th><th class="num">Instalado</th><th class="num" title="Llegó menos instalado: lo que queda por colocar">En obra</th><th></th><th></th></tr></thead><tbody>${T.map(x=>avMatRow(x,cfg)).join('')}</tbody></table></div>
    <p class="avnote">En la tabla, las filas de un tipo <b>sin material</b> (todo lo que llegó ya está instalado y aún falta) llevan un punto rojo.</p>`;
  h+=`<div class="avact"><span class="avsp"></span><button type="button" class="ib pri" data-lqx="1">Listo</button></div>`;
  lqModal(h,e=>{const b=e.target.closest('[data-avmall]');if(b){const x=avMatTypes(avMatRows(avData()),avData().ex,avCur().mat).find(y=>y.key===b.dataset.avmall);if(x)avMatSet(x.key,x.q)}},
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
    const foc=tr.contains(document.activeElement)&&document.activeElement.tagName==='INPUT';tr.outerHTML=avMatRow(nx,true);if(foc){const j=[...document.querySelectorAll('#lqm input[data-avml]')].find(e=>e.dataset.avml===key);if(j)j.focus()}},0);
  requestRender()}
