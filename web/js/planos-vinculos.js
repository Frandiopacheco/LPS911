"use strict";
/* LPS 911 · Vínculos entre planos (docs/ia/planos.md › Vínculos): tocar un corte, elevación, detalle o referencia de una lámina y abrir
   la lámina a la que remite, en la zona exacta, con un botón «← Volver».
   - Sirve para cualquier remisión (planta → corte, corte → detalle, detalle → otro detalle…), no solo plantas y elevaciones.
   - Un vínculo es una zona rectangular de la lámina de origen + la lámina destino + (opcional) la zona y el zoom del destino.
     Se guardan dentro del documento de la lámina: `plb/<id>.lk = [{id, x0,y0,x1,y1, to, v, t, by, byN, ts, arch?}]`.
     · x0..y1 van NORMALIZADOS (0–1 del ancho y del alto de la hoja): siguen valiendo al cargar una revisión con el mismo formato.
     · `to` es el id de la lámina destino (`plb`); `v` = {nx,ny,k} (la misma vista que `V.getView()`; null = lámina entera).
     · «Borrar» no borra: archiva (`arch:{t,by,n}`), igual que el resto de la app.
   - Los crean admin, editores y Oficina Técnica (`plaEd()`); todos los que ven Planos pueden seguirlos.
   - Son INVISIBLES por defecto (el plano queda limpio) pero funcionan igual: un toque sobre la marca abre el destino. Con ratón
     se resalta solo el vínculo bajo el cursor. «Mostrar vínculos» (`lps911.plkvis`, por equipo) los dibuja todos.
   - Una misma remisión suele aparecer dos veces (los dos extremos de la línea de corte): «＋ Otra zona» copia destino, zona y
     texto del vínculo elegido y solo pide las dos esquinas de la otra marca.
   - Dibujo y toques van en el mismo lienzo del visor, igual que Medir: `V.over` pinta, `V.onLink` abre un vínculo con un toque
     (sin quitar el doble toque de zoom fuera de las zonas) y, al editar, `V.onTap/onDown/onDrag/onUp`. Medir y Vincular no
     conviven: al entrar a uno se sale del otro. */

const PLK={tapT:0,tx:-99,ty:-99,show:store.get('plkvis',false)===true,hov:null,dup:null,edit:false,sel:null,selId:null,a:null,live:null,drag:null,pick:null,ch:null};
const PLK_R=100;const PLK_COL='#1c7ed6',PLK_SEL='#e8590c',PLK_OFF='#868e96',PLK_HIT=22,PLK_MIN=40,PLK_MAX=300;

/* ---------- datos ---------- */
const plkLinks=p=>p&&Array.isArray(p.lk)?p.lk.filter(l=>l&&!l.arch&&l.id):[];
const plkId=()=>'k'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const plkClamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
/** edita la lista de vínculos de una lámina dentro de una transacción (varias personas pueden vincular a la vez) */
async function plkSave(pid,fn){const ref=fcol('plb').doc(pid);let out=null;
  await db.runTransaction(async tx=>{const sn=await tx.get(ref);if(!sn.exists)throw new Error('La lámina ya no existe');
    out=fn((sn.data().lk||[]).map(x=>({...x})));tx.update(ref,{lk:out})});
  const q=PLB.get(pid);if(q)q.lk=out;if(PLV&&PLV.tv)PLV.tv.tick();
  /* el contador del botón 🔗 de la cabecera */if(PLV&&PLV.id===pid&&q){const b=PLV.box.querySelector('[data-pv="lk"]');if(b){const t=document.createElement('div');t.innerHTML=plkHdrBtn(q);if(t.firstChild)b.replaceWith(t.firstChild)}}
  return out}

/* ---------- geometría ---------- */
/** rectángulo en pantalla (relativo al lienzo) de un vínculo */
function plkS(l,v){const a=v.toScreen(l.x0*v.W,l.y0*v.H),b=v.toScreen(l.x1*v.W,l.y1*v.H);
  return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}}
/** el vínculo bajo un toque (zonas muy chicas se agrandan a PLK_MIN px para poder tocarlas con el dedo); el más pequeño gana */
function plkHit(cx,cy,list){const v=PLV.tv,r=v.cv.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;let best=null,ba=Infinity;
  for(const l of list){const s=plkS(l,v),mx=s.x+s.w/2,my=s.y+s.h/2,hw=Math.max(s.w,PLK_MIN)/2,hh=Math.max(s.h,PLK_MIN)/2;
    if(Math.abs(px-mx)<=hw&&Math.abs(py-my)<=hh&&hw*hh<ba){ba=hw*hh;best=l}}return best}

/* ---------- enganche al visor ---------- */
/** deja el visor con lo que toca según el estado (Medir manda mientras está activo) */
function plkSync(){if(!PLV||!PLV.tv)return;const v=PLV.tv;
  if(PLM.on){v.onLink=null;return}
  const E=PLK.edit&&!PLK.pick;
  v.over=plkDraw;                                   /* sin vínculos visibles solo dibuja el que está bajo el cursor */
  v.onLink=!E&&!PLK.pick?plkLinkTap:null;             /* ocultos o no, un toque sobre la marca los sigue */
  v.onTap=E?plkTap:null;v.onDown=E?plkDown:null;v.onDrag=E?plkMove:null;v.onUp=E?plkUp:null;
  v.host.classList.toggle('vinc',E);
  if(!v._lk){v._lk=1;v.host.addEventListener('pointermove',plkHover)}
  v.tick()}
/** el visor se arma de nuevo al cambiar de lámina o de revisión */
function plkAttach(){if(!PLV)return;const p=PLB.get(PLV.id);
  PLK.sel=PLK.selId&&plkLinks(p).some(l=>l.id===PLK.selId)?PLK.selId:null;PLK.selId=null;PLK.a=null;PLK.live=null;PLK.drag=null;PLK.ch=null;PLK.hov=null;PLK.dup=null;
  if(PLM.on)PLK.edit=false;plkBar();plkSync()}
function plkReset(){PLK.edit=false;PLK.sel=null;PLK.selId=null;PLK.a=null;PLK.live=null;PLK.drag=null;PLK.pick=null;PLK.ch=null;PLK.hov=null;PLK.dup=null;if(PLV)PLV.back=[]}
function plkHover(e){if(e.pointerType!=='mouse'||!PLV||!PLV.tv||PLM.on)return;const p=PLB.get(PLV.id);
  const h=p&&!PLK.pick&&!PLK.ch?plkHit(e.clientX,e.clientY,plkLinks(p)):null,id=h?h.id:null;
  PLV.tv.host.classList.toggle('lkhov',!!h);if(id!==PLK.hov){PLK.hov=id;PLV.tv.tick()}}

/* ---------- seguir un vínculo ---------- */
function plkLinkTap(cx,cy){const p=PLB.get(PLV.id);if(!p)return false;const l=plkHit(cx,cy,plkLinks(p));if(!l)return false;plkOpen(l);return true}
function plkOpen(l){const t=PLB.get(l.to);if(!t||t.arch){toast('Esa lámina ya no está disponible.');return}
  PLV.back=(PLV.back||[]).concat([{id:PLV.id,rev:PLV.rev,view:PLV.tv?PLV.tv.getView():null}]).slice(-12);
  PLV.id=t.id;PLV.rev=t.rev||1;PLV.view=l.v||null;if(!PLV.list.includes(t.id))PLV.list=[...PLV.list,t.id];plvDraw()}
function plkBack(){const b=PLV&&PLV.back&&PLV.back.pop();if(!b)return;
  if(!PLB.has(b.id)){toast('La lámina de origen ya no está disponible.');return}
  PLV.id=b.id;PLV.rev=b.rev;PLV.view=b.view;plvDraw()}
/** botones de la cabecera del visor (los pone `plvDraw`) */
function plkBackBtn(){const b=PLV&&PLV.back&&PLV.back[PLV.back.length-1];if(!b)return'';const o=PLB.get(b.id);
  return`<button class="ib plback" data-pv="back" title="Volver a ${esc(o?o.cod:'la lámina anterior')}, donde estabas">← ${esc(o?o.cod:'Volver')}</button>`}
function plkHdrBtn(p){const n=plkLinks(p).length,ed=plaEd();if(!n&&!ed)return'';
  return`<button class="ib${(ed?PLK.edit:PLK.show)?' on':''}" data-pv="lk" title="${ed?'Vincular esta lámina con otras (cortes, detalles, referencias)':PLK.show?'Ocultar dónde están los vínculos (siguen funcionando)':'Mostrar dónde están los vínculos (funcionan igual aunque estén ocultos)'}">🔗 Vínculos${n?' '+n:''}</button>`}
function plkBtn(){if(!PLV||!PLV.tv)return;
  if(plaEd())plkEdit(!PLK.edit);
  else{PLK.show=!PLK.show;store.set('plkvis',PLK.show);const b=PLV.box.querySelector('[data-pv="lk"]');if(b)b.classList.toggle('on',PLK.show);plkSync()}}
/** Esc: cierra lo último que se abrió; devuelve true si hizo algo */
function plkEsc(){if(!PLV)return false;
  if(PLK.ch){plkChClose();return true}
  if(PLK.pick){plkPickEnd(false);return true}
  if(PLK.a||PLK.dup){PLK.a=null;PLK.dup=null;PLV.tv.tick();plkBar();return true}
  if(PLK.sel){PLK.sel=null;PLV.tv.tick();plkBar();return true}
  if(PLK.edit){plkEdit(false);return true}
  return false}

/* ---------- editar ---------- */
function plkEdit(on){if(!PLV||!PLV.tv)return;if(on&&PLM.on)plmToggle();
  PLK.edit=!!on;if(!on){PLK.sel=null;PLK.a=null;PLK.live=null;PLK.drag=null;PLK.dup=null}
  const b=PLV.box.querySelector('[data-pv="lk"]');if(b)b.classList.toggle('on',PLK.edit);plkSync();plkBar()}
/* en tablet, tras el toque llega un «clic» de compatibilidad ~300 ms después, en el mismo punto: si allí acaba de aparecer la
   lista de láminas o la barra, ese clic elegía una lámina al azar. Se ignoran los clics de la interfaz justo después de un toque. */
const plkGhost=e=>performance.now()-PLK.tapT<700&&Math.hypot(e.clientX-PLK.tx,e.clientY-PLK.ty)<30;
/* un solo toque sobre la marca (burbuja de corte, globo de detalle…) crea el vínculo con una zona del tamaño de una burbuja
   centrada en el toque (`PLK_R` píxeles del plano a cada lado ≈ 1,7 cm de hoja a 300 dpi); luego se ajusta con las esquinas.
   Antes eran dos toques (esquina y esquina opuesta) y, con un vínculo elegido, el primero solo lo soltaba: se perdía la cuenta. */
async function plkTap(cx,cy){const v=PLV.tv,p=PLB.get(PLV.id);if(!p||PLK.ch||PLK.pick)return;PLK.tapT=performance.now();PLK.tx=cx;PLK.ty=cy;const w=v.toWorld(cx,cy);
  const h=PLK.dup?null:plkHit(cx,cy,plkLinks(p));
  if(h){PLK.sel=h.id;v.tick();plkBar();return}                  /* tocar un vínculo lo elige para ajustarlo */
  if(w.x<0||w.y<0||w.x>v.W||w.y>v.H)return;                      /* fuera de la hoja */
  PLK.sel=null;
  if(plkLinks(p).length>=PLK_MAX){toast('Esta lámina ya tiene el máximo de vínculos ('+PLK_MAX+').');plkBar();return}
  const g={x0:plkClamp((w.x-PLK_R)/v.W),y0:plkClamp((w.y-PLK_R)/v.H),x1:plkClamp((w.x+PLK_R)/v.W),y1:plkClamp((w.y+PLK_R)/v.H)};
  if(PLK.dup){const s=PLK.dup,nid=plkId();PLK.dup=null;          /* otra marca de la misma remisión: mismo destino, zona y texto */
    try{await plkSave(p.id,arr=>{arr.push({id:nid,...g,to:s.to,v:s.v||null,t:s.t||'',by:me.email,byN:me.name||me.email,ts:NOW()});return arr});PLK.sel=nid;toast('Otra marca vinculada')}
    catch(e){toast('No se pudo guardar el vínculo: '+(e.code||e.message))}
    plkBar();return}
  v.tick();plkChoose({id:plkId(),...g,to:'',t:'',v:null},p.id,true)}
/* arrastrar una esquina del vínculo elegido, o todo el vínculo desde dentro */
function plkDown(cx,cy){if(PLK.ch||PLK.pick||PLK.a||!PLK.sel)return false;const v=PLV.tv,p=PLB.get(PLV.id);
  const l=plkLinks(p).find(x=>x.id===PLK.sel);if(!l)return false;
  const r=v.cv.getBoundingClientRect(),s=plkS(l,v),cs=[[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]];
  let hit=-1,bd=PLK_HIT;cs.forEach((c,i)=>{const d=Math.hypot(r.left+c[0]-cx,r.top+c[1]-cy);if(d<bd){bd=d;hit=i}});
  if(hit>=0)PLK.drag={k:'c',i:hit};
  else if(cx-r.left>s.x&&cx-r.left<s.x+s.w&&cy-r.top>s.y&&cy-r.top<s.y+s.h)PLK.drag={k:'m',w:v.toWorld(cx,cy),b:{...l}};
  else return false;
  PLK.live={...l};v.tick();return true}
function plkMove(cx,cy){const v=PLV.tv,d=PLK.drag,L=PLK.live;if(!d||!L)return;const w=v.toWorld(cx,cy),nx=plkClamp(w.x/v.W),ny=plkClamp(w.y/v.H);
  if(d.k==='c'){if(d.i===0||d.i===3)L.x0=nx;else L.x1=nx;if(d.i===0||d.i===1)L.y0=ny;else L.y1=ny}
  else{const b=d.b,lx=Math.min(b.x0,b.x1),hx=Math.max(b.x0,b.x1),ly=Math.min(b.y0,b.y1),hy=Math.max(b.y0,b.y1);
    const dx=plkClamp((w.x-d.w.x)/v.W,-lx,1-hx),dy=plkClamp((w.y-d.w.y)/v.H,-ly,1-hy);L.x0=b.x0+dx;L.x1=b.x1+dx;L.y0=b.y0+dy;L.y1=b.y1+dy}
  v.tick()}
async function plkUp(){const L=PLK.live;PLK.drag=null;PLK.live=null;if(!PLV||!PLV.tv)return;
  if(L){const v=PLV.tv,g={x0:Math.min(L.x0,L.x1),x1:Math.max(L.x0,L.x1),y0:Math.min(L.y0,L.y1),y1:Math.max(L.y0,L.y1)};
    if((g.x1-g.x0)*v.W>=6&&(g.y1-g.y0)*v.H>=6){const pid=PLV.id;
      try{await plkSave(pid,arr=>arr.map(x=>x.id===L.id?{...x,...g}:x))}catch(e){toast('No se pudo mover el vínculo: '+(e.code||e.message))}}}
  PLV&&PLV.tv&&PLV.tv.tick()}

/* ---------- elegir la lámina destino ---------- */
function plkChoose(d,originId,isNew){PLK.ch={d,originId,isNew};plkChDraw()}
function plkChClose(){const el=PLV&&PLV.box.querySelector('.plkch');if(el)el.remove();PLK.ch=null;if(PLV&&PLV.tv)PLV.tv.tick();if(PLV)PLV.box.focus()}
function plkChDraw(){if(!PLV||!PLK.ch)return;let el=PLV.box.querySelector('.plkch');if(el)el.remove();
  el=document.createElement('div');el.className='plkch';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Elegir la lámina destino');
  el.innerHTML=`<div class="plkchc"><div class="plkchh"><b>¿A qué lámina lleva este vínculo?</b><button type="button" class="ib" data-kc="x" aria-label="Cancelar">✕</button></div>
    <input class="tin" id="plkq" type="search" placeholder="Buscar: AG09, cortes, detalles, sanitarias…" aria-label="Buscar la lámina destino" autocomplete="off">
    <input class="tin" id="plkt" placeholder="Texto junto a la zona (opcional, ej. Corte E-E)" aria-label="Texto del vínculo" maxlength="40" autocomplete="off">
    <div class="plkl" role="listbox"></div></div>`;
  PLV.box.appendChild(el);const q=el.querySelector('#plkq'),t=el.querySelector('#plkt'),host=el.querySelector('.plkl');t.value=PLK.ch.d.t||'';
  const list=()=>{const w=plUp(q.value).trim().split(/\s+/).filter(Boolean);
    const L=plAct().filter(p=>!w.length||w.every(x=>plUp([p.cod,p.tit,p.fname,PL_DN[p.disc]].join(' ')).includes(x))).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b));
    /* arriba, las láminas a las que ya lleva esta misma lámina (la otra flecha del corte suele ir al mismo destino) */
    const used=w.length?[]:[...new Set(plkLinks(PLB.get(PLK.ch.originId)).map(l=>l.to))].map(id=>PLB.get(id)).filter(p=>p&&!p.arch);
    const row=p=>`<button type="button" class="plkr${p.id===PLK.ch.d.to?' on':''}" role="option" data-kc="${esc(p.id)}"><b class="mono">${esc(p.cod)}</b> <span>${esc(p.tit||'')}</span><small>${esc([PL_DN[p.disc]||p.disc,p.tipo,plPisoName(p.pisoId)||'General'].join(' · '))}</small></button>`;
    host.innerHTML=(used.length?`<div class="plkg">Ya vinculadas desde esta lámina</div>${used.map(row).join('')}<div class="plkg">Todas</div>`:'')+(L.length?L.slice(0,80).map(p=>`<button type="button" class="plkr${p.id===PLK.ch.d.to?' on':''}" role="option" data-kc="${esc(p.id)}"><b class="mono">${esc(p.cod)}</b> <span>${esc(p.tit||'')}</span><small>${esc([PL_DN[p.disc]||p.disc,p.tipo,plPisoName(p.pisoId)||'General'].join(' · '))}</small></button>`).join('')+(L.length>80?'<p class="note">Hay más: escribe para acotar.</p>':''):'<p class="note">Ninguna lámina con esa búsqueda.</p>')};
  list();q.oninput=list;
  el.onclick=e=>{const b=e.target.closest('[data-kc]');if(!b)return;e.stopPropagation();if(plkGhost(e))return;const k=b.dataset.kc;
    if(k==='x'){plkChClose();return}
    const c=PLK.ch;if(!c||!PLB.has(k))return;const txt=t.value.trim();el.remove();PLK.ch=null;plkPickStart({...c.d,to:k,t:txt},c.originId,c.isNew)};
  el.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();plkChClose()}else e.stopPropagation()};
  if(!plTablet())setTimeout(()=>q.focus(),0);PLV.tv.tick()}

/* ---------- elegir la zona del destino ---------- */
/** abre la lámina destino para que quien vincula acerque la zona que debe verse; al fijarla se guarda y se vuelve al origen */
function plkPickStart(d,originId,isNew){const t=PLB.get(d.to);if(!t||!PLV)return;
  PLK.pick={d,isNew,o:{id:originId,rev:PLV.rev,view:PLV.tv?PLV.tv.getView():null}};
  PLV.id=t.id;PLV.rev=t.rev||1;PLV.view=d.v||null;if(!PLV.list.includes(t.id))PLV.list=[...PLV.list,t.id];plvDraw()}
async function plkPickEnd(save,whole){const k=PLK.pick;if(!k||!PLV)return;const v=PLV.tv;const d={...k.d};
  if(save)d.v=whole?null:v.getView();
  PLK.pick=null;PLV.id=k.o.id;PLV.rev=k.o.rev;PLV.view=k.o.view;
  if(save){const g={x0:Math.min(d.x0,d.x1),x1:Math.max(d.x0,d.x1),y0:Math.min(d.y0,d.y1),y1:Math.max(d.y0,d.y1)};
    try{await plkSave(k.o.id,arr=>{const i=arr.findIndex(x=>x.id===d.id);
      if(i<0)arr.push({id:d.id,...g,to:d.to,v:d.v,t:d.t||'',by:me.email,byN:me.name||me.email,ts:NOW()});
      else arr[i]={...arr[i],to:d.to,v:d.v,t:d.t||'',ts:NOW()};return arr});
      PLK.selId=d.id;toast('Vínculo guardado')}
    catch(e){toast('No se pudo guardar el vínculo: '+(e.code||e.message))}}
  plvDraw()}

/* ---------- barra de vínculos ---------- */
function plkBar(){if(!PLV)return;let el=PLV.box.querySelector('.plkbar');
  if(!PLK.edit&&!PLK.pick){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.className='plkbar';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Vínculos entre planos');PLV.box.appendChild(el);
    el.onclick=plkBarClick;el.onchange=e=>{if(e.target.dataset.pk==='show'){PLK.show=e.target.checked;store.set('plkvis',PLK.show);plkSync()}};el.onkeydown=e=>e.stopPropagation()}
  const p=PLB.get(PLV.id),L=plkLinks(p);let h='';
  if(PLK.pick){const t=PLB.get(PLK.pick.d.to);
    h=`<div class="plkv">Acerca la zona de <b class="mono">${esc(t?t.cod:'')}</b> que debe verse al tocar el vínculo.</div>
      <div class="plkx"><button type="button" class="ib pri" data-pk="fix">✓ Fijar esta zona</button><button type="button" class="ib" data-pk="whole" title="Abrir la lámina completa">Lámina entera</button><span class="plvsp"></span><button type="button" class="ib" data-pk="cancel">Cancelar</button></div>`}
  else{const l=PLK.sel&&L.find(x=>x.id===PLK.sel);let msg;
    if(l){const t=PLB.get(l.to);msg=`<b>${esc(l.t||'→ '+(t?t.cod:'sin destino'))}</b> → <span class="mono">${esc(t?t.cod:'—')}</span> ${esc(t&&t.tit||'')}${l.v?'':' · lámina entera'}<br><small>¿El corte tiene otra burbuja? Toca <b>＋ Otra marca</b>. Arrastra las esquinas para ajustar la zona. Para un vínculo nuevo, toca otra marca del plano.</small>`}
    else if(PLK.dup){const t=PLB.get(PLK.dup.to);msg=`Otra marca hacia <b class="mono">${esc(t?t.cod:'')}</b>: toca la otra marca (p. ej. la otra burbuja del corte).`}
    else msg='Toca la <b>marca</b> (burbuja de corte, globo de detalle, rótulo) que remite a otra lámina. Toca un vínculo ya puesto para ajustarlo o borrarlo.';
    h=`<div class="plkv" aria-live="polite">${msg}</div>
      ${l&&!PLK.dup?`<div class="plkx"><button type="button" class="ib pri" data-pk="dup" title="La misma remisión aparece en otro lugar (el otro extremo del corte): solo marca la otra zona">＋ Otra marca</button><button type="button" class="ib" data-pk="go" title="Abrir el destino para probarlo">Probar</button><button type="button" class="ib" data-pk="dest">Cambiar destino</button><button type="button" class="ib" data-pk="txt">Texto</button><button type="button" class="ib bad" data-pk="del">Borrar</button></div>`:''}
      <div class="plkx"><label class="plkshow"><input type="checkbox" data-pk="show"${PLK.show?' checked':''}> Mostrar vínculos</label><small class="plms">${L.length} en esta lámina</small><span class="plvsp"></span>${PLK.a||PLK.dup?'<button type="button" class="ib" data-pk="undo">↶ Cancelar</button>':''}<button type="button" class="ib" data-pk="off" title="Salir (Esc)">✓ Listo</button></div>`}
  el.innerHTML=h;if(!document.activeElement||document.activeElement===document.body)PLV.box.focus()}
async function plkBarClick(e){const b=e.target.closest('[data-pk]');if(!b||b.tagName==='INPUT'||plkGhost(e))return;const a=b.dataset.pk;if(!PLV)return;
  const p=PLB.get(PLV.id),l=plkLinks(p).find(x=>x.id===PLK.sel);
  if(a==='off')plkEdit(false);
  else if(a==='undo'){PLK.a=null;PLK.dup=null;PLV.tv.tick();plkBar()}
  else if(a==='dup'&&l){PLK.dup={to:l.to,v:l.v||null,t:l.t||''};PLK.sel=null;PLV.tv.tick();plkBar()}
  else if(a==='fix')plkPickEnd(true,false);
  else if(a==='whole')plkPickEnd(true,true);
  else if(a==='cancel')plkPickEnd(false);
  else if(a==='go'&&l)plkOpen(l);
  else if(a==='dest'&&l)plkChoose({...l},p.id,false);
  else if(a==='txt'&&l){const t=await uiAsk({title:'Texto del vínculo',text:'Es lo que se ve junto a la zona. Vacío = el código de la lámina destino.',input:{label:'Texto',value:l.t||''},ok:'Guardar'});
    if(t==null)return;try{await plkSave(p.id,arr=>arr.map(x=>x.id===l.id?{...x,t:t.slice(0,40)}:x));plkBar()}catch(er){toast('No se pudo guardar: '+(er.code||er.message))}}
  else if(a==='del'&&l){const t=PLB.get(l.to);
    if(!await uiAsk({title:'¿Quitar este vínculo?',text:`Deja de mostrarse${t?' el vínculo hacia '+t.cod:''}. Queda archivado, no se pierde.`,ok:'Quitar',cancel:'Cancelar',tone:'warn'}))return;
    try{await plkSave(p.id,arr=>arr.map(x=>x.id===l.id?{...x,arch:{t:NOW(),by:me.email,n:me.name||me.email}}:x));PLK.sel=null;plkBar();toast('Vínculo quitado')}
    catch(er){toast('No se pudo quitar: '+(er.code||er.message))}}}

/* ---------- dibujo (dentro del lienzo del visor) ---------- */
function plkDraw(g,v){const p=PLB.get(PLV.id);if(!p)return;const E=PLK.edit&&!PLK.pick,dpr=v.getDpr(),cw=v.cv.width/dpr,ch=v.cv.height/dpr;
  if(PLK.pick){ /* mira central: lo que quede en el centro y el zoom actual son lo que verá quien siga el vínculo */
    g.save();g.lineWidth=3;g.strokeStyle='#fff';g.beginPath();g.moveTo(cw/2-14,ch/2);g.lineTo(cw/2+14,ch/2);g.moveTo(cw/2,ch/2-14);g.lineTo(cw/2,ch/2+14);g.stroke();
    g.lineWidth=1.4;g.strokeStyle=PLK_SEL;g.stroke();g.restore();return}
  g.save();g.lineJoin='round';g.font='600 12px system-ui,sans-serif';g.textBaseline='bottom';g.textAlign='left';
  const all=E||PLK.show;
  for(const l0 of plkLinks(p)){if(!all&&l0.id!==PLK.hov)continue;const l=PLK.live&&PLK.live.id===l0.id?PLK.live:l0;const s=plkS(l,v);
    const rw=Math.max(s.w,22),rh=Math.max(s.h,22),rx=s.x+s.w/2-rw/2,ry=s.y+s.h/2-rh/2;
    if(rx>cw||ry>ch||rx+rw<0||ry+rh<0)continue;
    const sel=E&&PLK.sel===l0.id,t=PLB.get(l.to),bad=!t||t.arch,col=sel?PLK_SEL:bad?PLK_OFF:PLK_COL;
    g.setLineDash(bad?[4,4]:[]);g.lineWidth=sel?3:2;g.strokeStyle=col;g.fillStyle=sel?'rgba(232,89,12,.14)':bad?'rgba(134,142,150,.10)':'rgba(28,126,214,.10)';
    g.beginPath();g.rect(rx,ry,rw,rh);g.fill();g.stroke();g.setLineDash([]);
    if(sel||rw>=44){const txt=l.t||(t?'→ '+t.cod:'sin destino'),ty=ry>16?ry-3:ry+rh+15;g.lineWidth=3.5;g.strokeStyle='#fff';g.strokeText(txt,rx,ty);g.fillStyle=sel?'#a63d08':'#0b4f94';g.fillText(txt,rx,ty)}
    if(sel)for(const c of [[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]]){g.beginPath();g.arc(c[0],c[1],7,0,Math.PI*2);g.fillStyle='#fff';g.fill();g.lineWidth=2.4;g.strokeStyle=PLK_SEL;g.stroke()}}
  if(PLK.ch){const s=plkS(PLK.ch.d,v);g.setLineDash([]);g.lineWidth=3;g.strokeStyle=PLK_SEL;g.fillStyle='rgba(232,89,12,.14)';g.beginPath();g.rect(s.x,s.y,s.w,s.h);g.fill();g.stroke()}   /* la marca que se está vinculando */
  if(E&&PLK.a){const s=v.toScreen(PLK.a.x,PLK.a.y);g.beginPath();g.arc(s.x,s.y,7,0,Math.PI*2);g.fillStyle='#fff';g.fill();g.lineWidth=2.4;g.strokeStyle=PLK_SEL;g.stroke();
    g.beginPath();g.arc(s.x,s.y,1.8,0,Math.PI*2);g.fillStyle=PLK_SEL;g.fill()}
  g.restore()}
