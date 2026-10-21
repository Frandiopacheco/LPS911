"use strict";
/* LPS 911 · Propuestas de vínculos entre planos (docs/ia/planos.md › Vínculos › Propuestas, oct 2026).
   El dueño le pasa a Claude los PDF del proyecto; Claude lee las llamadas de corte, elevación, sección y detalle y arma un archivo
   de propuestas (JSON, formato `lps911-vinculos`). Aquí ese archivo:
   - se CARGA en Planos › Cargar planos (admin, editores y Oficina Técnica, `plaEd()`): se ubica cada lámina por su nombre de
     archivo (o código), se pasan las coordenadas del PDF a la hoja recortada y se guardan como `plb/<id>.lkp` (nunca como vínculos);
   - se REVISA en el visor, en modo 🔗 Vínculos: las propuestas se ven en morado punteado; tocar una (o «Revisar») la acerca y
     muestra ✓ Aceptar · ✕ Descartar · Probar · Cambiar destino · Siguiente ›. Aceptar la pasa a `lk` (vínculo normal) en la misma
     transacción; descartar la deja marcada `no:{t,by,n}` para que una carga nueva no la vuelva a proponer.
   - Nada se crea solo: quien no edita nunca ve ni sigue una propuesta.
   Datos: `plb/<id>.lkp = [{id, x0,y0,x1,y1, to, v, t, c, m, src, ts, no?}]` (x/y normalizados a la hoja como `lk`; `c` = confianza
   0–1; `m` = motivo, p. ej. «título CORTE E-E en AG21»). */

const PLKP_COL='#7048e8',PLKP_MAX=400;

/* ---------- datos ---------- */
const plkpList=p=>p&&Array.isArray(p.lkp)?p.lkp.filter(l=>l&&l.id&&!l.no):[];
/** hojas con propuestas pendientes, en el orden de la biblioteca */
const plkpSheets=()=>plAct().filter(p=>plkpList(p).length).sort((a,b)=>plDiscIx(a.disc)-plDiscIx(b.disc)||plCodCmp(a,b));
const plkpOrd=L=>L.slice().sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1)||(a.x0+a.x1)-(b.x0+b.x1));
/** edita vínculos y propuestas de una lámina en una sola transacción (aceptar = quitar de lkp y sumar a lk a la vez) */
async function plkpSave(pid,fn){const ref=fcol('plb').doc(pid);let out=null;
  await db.runTransaction(async tx=>{const sn=await tx.get(ref);if(!sn.exists)throw new Error('La lámina ya no existe');const d=sn.data();
    out=fn((d.lk||[]).map(x=>({...x})),(d.lkp||[]).map(x=>({...x})));tx.update(ref,{lk:out.lk,lkp:out.lkp})});
  const q=PLB.get(pid);if(q){q.lk=out.lk;q.lkp=out.lkp}
  if(PLV&&PLV.id===pid&&q){const b=PLV.box.querySelector('[data-pv="lk"]');if(b){const t=document.createElement('div');t.innerHTML=plkHdrBtn(q);if(t.firstChild)b.replaceWith(t.firstChild)}}
  if(PLV&&PLV.tv)PLV.tv.tick();return out}
const plkpHit=(cx,cy,p)=>PLK.edit&&plaEd()?plkHit(cx,cy,plkpList(p)):null;

/* ---------- visor ---------- */
function plkpDraw(g,v,p,cw,ch){if(!plaEd())return;
  for(const l0 of plkpList(p)){const l=PLK.live&&PLK.live.id===l0.id?PLK.live:l0,s=plkS(l,v),rw=Math.max(s.w,22),rh=Math.max(s.h,22),rx=s.x+s.w/2-rw/2,ry=s.y+s.h/2-rh/2;
    if(rx>cw||ry>ch||rx+rw<0||ry+rh<0)continue;const sel=PLK.psel===l.id,t=PLB.get(l.to);
    g.setLineDash(sel?[]:[6,4]);g.lineWidth=sel?3:2;g.strokeStyle=PLKP_COL;g.fillStyle=sel?'rgba(112,72,232,.18)':'rgba(112,72,232,.08)';
    g.beginPath();g.rect(rx,ry,rw,rh);g.fill();g.stroke();g.setLineDash([]);
    if(sel||rw>=40){const txt='? '+(l.t||(t?'→ '+t.cod:'sin destino')),ty=ry>16?ry-3:ry+rh+15;g.lineWidth=3.5;g.strokeStyle='#fff';g.strokeText(txt,rx,ty);g.fillStyle='#4c2bb5';g.fillText(txt,rx,ty)}
    if(sel)for(const c of [[s.x,s.y],[s.x+s.w,s.y],[s.x+s.w,s.y+s.h],[s.x,s.y+s.h]]){g.beginPath();g.arc(c[0],c[1],7,0,Math.PI*2);g.fillStyle='#fff';g.fill();g.lineWidth=2.4;g.strokeStyle=PLKP_COL;g.stroke()}}}
/** acerca la propuesta elegida (que se vea la marca con algo de contexto) */
function plkpFocus(){const p=PLV&&PLB.get(PLV.id),l=p&&plkpList(p).find(x=>x.id===PLK.psel);if(!l||!PLV.tv)return;
  PLV.tv.setView(plkpView(l))}
function plkpBarHint(p){if(!plaEd())return'';const n=plkpList(p).length,all=plkpSheets().reduce((a,q)=>a+plkpList(q).length,0);
  if(!all)return'';return` <button type="button" class="ib plkpb" data-pk="p-rev" title="Revisar una por una las propuestas de vínculos">🟣 Revisar propuestas · ${n} aquí${all>n?` · ${all} en total`:''}</button>`}
function plkpBarHtml(p){const l=plkpList(p).find(x=>x.id===PLK.psel),t=l&&PLB.get(l.to),L=plkpOrd(plkpList(p)),i=L.findIndex(x=>x.id===PLK.psel);
  const all=plkpSheets().reduce((a,q)=>a+plkpList(q).length,0);
  return`<div class="plkv" aria-live="polite"><b class="plkpt">Propuesta ${i+1} de ${L.length}${all>L.length?` (${all} en total)`:''}</b> · ${esc(l.t||'')} → <b class="mono">${esc(t?t.cod:'lámina no encontrada')}</b> ${esc(t&&t.tit||'')}${l.v?'':' · lámina entera'}
      ${l.m?`<br><small>${esc(l.m)}${l.c!=null?` · confianza ${Math.round(l.c*100)} %`:''}</small>`:''}<br><small>Arrastra las esquinas para ajustar la zona; «Cambiar destino» si lleva a otra lámina.</small></div>
    <div class="plkx"><button type="button" class="ib pri" data-pk="p-ok"${t?'':' disabled'}>✓ Aceptar</button><button type="button" class="ib bad" data-pk="p-no">✕ Descartar</button><button type="button" class="ib" data-pk="p-go"${t?'':' disabled'} title="Abrir el destino para ver si es el correcto">Probar</button><button type="button" class="ib" data-pk="p-dest">Cambiar destino</button></div>
    <div class="plkx"><button type="button" class="ib" data-pk="p-all" title="Aceptar todas las propuestas de esta lámina">✓ Aceptar las ${L.length} de esta lámina</button>${all>L.length?`<button type="button" class="ib" data-pk="p-every" title="Aceptar todas las propuestas de todas las láminas">✓ Aceptar todas (${all})</button>`:''}<span class="plvsp"></span><button type="button" class="ib" data-pk="p-x">Cerrar</button><button type="button" class="ib pri" data-pk="p-next">Siguiente ›</button></div>`}
const plkpView=l=>({nx:(l.x0+l.x1)/2,ny:(l.y0+l.y1)/2,k:Math.max(2,Math.min(10,0.09/Math.max(l.x1-l.x0,0.004)))});
/** pasa a la siguiente propuesta. `at` = posición que ocupaba la recién aceptada/descartada (ya salió de la lista): sigue la que quedó
   en su lugar. Sin `at` («Siguiente ›»): la que sigue en esta lámina; si no hay, la primera de la lámina siguiente que tenga. */
function plkpNext(at){if(!PLV)return;const p=PLB.get(PLV.id),L=plkpOrd(plkpList(p));
  const i=at!=null?at:L.findIndex(x=>x.id===PLK.psel)+1;let n=L[i];
  if(n){PLK.psel=n.id;PLV.tv.tick();plkBar();plkpFocus();return}
  const at2=plkpSheets(),pos=at2.findIndex(q=>q.id===PLV.id),nx=at2.find((q,j)=>j>pos&&q.id!==PLV.id)||at2.find(q=>q.id!==PLV.id);
  if(nx){const f=plkpOrd(plkpList(nx))[0];PLK.pnext=f.id;PLV.back=[];PLV.id=nx.id;PLV.rev=nx.rev||1;PLV.view=plkpView(f);if(!PLV.list.includes(nx.id))PLV.list=[...PLV.list,nx.id];plvDraw();return}
  if(L.length){PLK.psel=L[0].id;PLV.tv.tick();plkBar();plkpFocus();return}
  PLK.psel=null;PLV.tv.tick();plkBar();toast('No quedan propuestas por revisar.')}
/** acepta propuestas: pasan a vínculos normales (`lk`) con quien las aceptó */
async function plkpAccept(p,ids){const set=new Set(ids);let n=0;
  await plkpSave(p.id,(lk,lkp)=>{const live=lk.filter(x=>!x.arch).length;const keep=[];
    for(const x of lkp){if(!set.has(x.id)||x.no||!PLB.has(x.to)){keep.push(x);continue}
      if(live+n>=PLK_MAX){keep.push(x);continue}
      lk.push({id:plkId(),x0:x.x0,y0:x.y0,x1:x.x1,y1:x.y1,to:x.to,v:x.v||null,t:x.t||'',by:me.email,byN:me.name||me.email,ts:NOW(),src:'prop'});n++}
    return{lk,lkp:keep}});
  return n}
async function plkpClick(a,p){const l=plkpList(p).find(x=>x.id===PLK.psel),pos=plkpOrd(plkpList(p)).findIndex(x=>x.id===PLK.psel);
  if(a==='p-rev'){const L=plkpOrd(plkpList(p));if(L.length){PLK.psel=L[0].id;PLK.sel=null;PLV.tv.tick();plkBar();plkpFocus()}else plkpNext();return}
  if(a==='p-x'){PLK.psel=null;PLV.tv.tick();plkBar();return}
  if(a==='p-next'){plkpNext();return}
  if(a==='p-every'){await plkpAcceptAll(null);if(PLV){PLK.psel=null;PLV.tv.tick();plkBar()}return}
  if(!l)return;
  if(a==='p-go'){plkOpen(l);return}
  if(a==='p-dest'){plkChoose({...l,_p:1},p.id,false);return}
  if(a==='p-ok'){try{const n=await plkpAccept(p,[l.id]);if(!n){toast('No se pudo aceptar (¿lámina destino eliminada o tope de vínculos?).');return}toast('Vínculo aceptado');plkpNext(pos)}catch(e){toast('No se pudo aceptar: '+(e.code||e.message))}return}
  if(a==='p-no'){try{await plkpSave(p.id,(lk,lkp)=>({lk,lkp:lkp.map(x=>x.id===l.id?{...x,no:{t:NOW(),by:me.email,n:me.name||me.email}}:x)}));plkpNext(pos)}catch(e){toast('No se pudo descartar: '+(e.code||e.message))}return}
  if(a==='p-all'){const L=plkpList(p);if(!await uiAsk({title:`¿Aceptar las ${L.length} propuestas de ${p.cod}?`,text:'Pasan a ser vínculos normales (luego se pueden ajustar o quitar uno por uno).',ok:'Aceptar todas',cancel:'Cancelar',tone:'info'}))return;
    try{const n=await plkpAccept(p,L.map(x=>x.id));toast(`${n} vínculo${n===1?'':'s'} aceptado${n===1?'':'s'}`);plkpNext(0)}catch(e){toast('No se pudo aceptar: '+(e.code||e.message))}}}
/** «Cambiar destino» de una propuesta: se elige otra lámina y su zona; al fijarla se acepta con ese destino (lo llama plkPickEnd) */
async function plkpRetarget(originId,d){const pid=originId;
  await plkpSave(pid,(lk,lkp)=>{const i=lkp.findIndex(x=>x.id===d.id);if(i<0)return{lk,lkp};const x=lkp[i];
    lk.push({id:plkId(),x0:x.x0,y0:x.y0,x1:x.x1,y1:x.y1,to:d.to,v:d.v||null,t:d.t||'',by:me.email,byN:me.name||me.email,ts:NOW(),src:'prop'});
    lkp.splice(i,1);return{lk,lkp}})}

/* ---------- abrir la revisión desde Cargar planos ---------- */
function plkpReview(){const S=plkpSheets();if(!S.length){toast('No hay propuestas por revisar.');return}
  const f=S[0],l=plkpOrd(plkpList(f))[0];plOpen(f.id,S.map(q=>q.id));if(!PLV||!PLV.tv)return;
  plkEdit(true);PLK.psel=l.id;plkBar();PLV.tv.tick();requestAnimationFrame(()=>requestAnimationFrame(plkpFocus))}

/* ---------- cargar el archivo de propuestas ---------- */
const plkpKey=s=>plUp(String(s||'').replace(/\.pdf$/i,'')).replace(/\s+/g,' ').trim();
/** ubica una lámina por nombre de archivo, id (`ARQ_AG03`) o código (si hay varias con el código, la de la especialidad sugerida) */
function plkpFind(ref,disc){if(!ref)return null;const k=plkpKey(ref),A=plAct();
  return A.find(p=>plkpKey(p.fname)===k)||A.find(p=>plUp(p.id)===k)||(()=>{const L=A.filter(p=>plUp(p.cod)===k);return L.length===1?L[0]:L.find(p=>p.disc===disc)||null})()}
/** la lámina de una entrada del archivo: por nombre de archivo y, si ese no está en la biblioteca, por código.
    El nombre del PDF que usó Claude casi nunca es el del archivo cargado (revisiones, nombre completo del proyecto),
    así que sin este respaldo la lámina salía como «no encontrada» aunque su código sí estuviera. */
const plkpOf=L=>L?(plkpFind(L.archivo,L.esp)||plkpFind(L.cod,L.esp)):null;
/** puntos del PDF (origen arriba a la izquierda, escala 1) → fracción de la hoja que muestra el visor (recortada o completa) */
function plkpNorm(p,pt,x,y){const c=p.crop;let ox=0,oy=0,w,h;
  if(c){ox=c.x0;oy=c.y0;w=c.x1-c.x0;h=c.y1-c.y0}else if(pt&&pt[0]){w=pt[0];h=pt[1]}else if(p.mm&&p.mm[0]){w=p.mm[0]/25.4*72;h=p.mm[1]/25.4*72}else return null;
  return[plkClamp((x-ox)/w),plkClamp((y-oy)/h)]}
/** lee el JSON y arma, por lámina, la lista de propuestas ya normalizadas (sin escribir nada) */
function plkpParse(J){if(!J||J.formato!=='lps911-vinculos'||!Array.isArray(J.laminas))throw new Error('No es un archivo de propuestas de vínculos de LPS 911.');
  const PT=new Map();for(const L of J.laminas){const p=plkpOf(L);if(p&&Array.isArray(L.pt))PT.set(p.id,L.pt)}
  const out=new Map(),miss=[],missTo=new Set();let n=0,dup=0,old=0,bad=0;
  for(const L of J.laminas){const p=plkpOf(L);if(!p){miss.push(L.archivo||L.cod||'?');continue}
    const have=plkLinks(p),gone=(p.lkp||[]).filter(x=>x&&x.no),arr=out.get(p.id)||[];
    for(const r of L.vinculos||[]){const q=plkpFind(r.a,p.disc);if(!q){missTo.add(String(r.a||'?'));bad++;continue}
      if(!Array.isArray(r.r)||r.r.length!==4){bad++;continue}
      const a=plkpNorm(p,L.pt,r.r[0],r.r[1]),b=plkpNorm(p,L.pt,r.r[2],r.r[3]);if(!a||!b){bad++;continue}
      const g={x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])},mx=(g.x0+g.x1)/2,my=(g.y0+g.y1)/2;
      const near=x=>x.to===q.id&&Math.abs((x.x0+x.x1)/2-mx)<0.012&&Math.abs((x.y0+x.y1)/2-my)<0.012;
      if(have.some(near)){dup++;continue}if(gone.some(near)){old++;continue}if(arr.some(near)){dup++;continue}
      let v=null;if(Array.isArray(r.ar)&&r.ar.length===4){const qa=plkpNorm(q,PT.get(q.id),r.ar[0],r.ar[1]),qb=plkpNorm(q,PT.get(q.id),r.ar[2],r.ar[3]);
        if(qa&&qb){const fw=Math.abs(qb[0]-qa[0]),fh=Math.abs(qb[1]-qa[1]);v={nx:(qa[0]+qb[0])/2,ny:(qa[1]+qb[1])/2,k:+Math.max(1,Math.min(12,0.85/Math.max(fw,fh,0.02))).toFixed(2)}}}
      arr.push({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),...g,to:q.id,v,t:String(r.t||'').slice(0,40),c:typeof r.c==='number'?Math.max(0,Math.min(1,r.c)):null,m:String(r.m||'').slice(0,160),src:String(J.origen||'archivo').slice(0,30),ts:NOW()});n++}
    out.set(p.id,arr)}
  return{out,n,dup,old,bad,miss,missTo:[...missTo]}}
async function plkpLoad(file){let J;try{J=JSON.parse(await file.text())}catch(e){toast('El archivo no es un JSON válido.');return}
  let R;try{R=plkpParse(J)}catch(e){toast(e.message);return}
  const sheets=[...R.out.entries()].filter(([,a])=>a.length),pend=[...R.out.keys()].reduce((a,id)=>a+plkpList(PLB.get(id)).length,0);
  const list=[`${R.n} propuesta${R.n===1?'':'s'} nueva${R.n===1?'':'s'} en ${sheets.length} lámina${sheets.length===1?'':'s'}`];
  if(R.dup)list.push(`${R.dup} ya existían como vínculo (se omiten)`);if(R.old)list.push(`${R.old} ya se habían descartado antes (se omiten)`);
  if(R.miss.length)list.push(`Láminas de origen no encontradas (${R.miss.length}): ${R.miss.slice(0,8).join(', ')}${R.miss.length>8?'…':''}`);
  if(R.missTo.length)list.push(`Destinos no encontrados (${R.missTo.length}): ${R.missTo.slice(0,8).join(', ')}${R.missTo.length>8?'…':''}`);
  if(!R.n){await uiAsk({title:'No hay propuestas nuevas',list,ok:'Entendido',cancel:false,tone:'info'});return}
  if(!await uiAsk({title:'¿Cargar las propuestas de vínculos?',list,note:pend?`Reemplaza las ${pend} propuestas aún sin revisar de esas láminas. Los vínculos ya puestos no se tocan.`:'Los vínculos ya puestos no se tocan. Nada se crea hasta que alguien acepte cada propuesta.',ok:'Cargar propuestas',cancel:'Cancelar',tone:'info'}))return;
  let ok=0,err=0;for(const[id,arr]of R.out){try{await plkpSave(id,(lk,lkp)=>({lk,lkp:[...lkp.filter(x=>x.no),...arr].slice(-PLKP_MAX)}));ok++}catch(e){err++}}
  toast(err?`Propuestas cargadas en ${ok} láminas; ${err} con error.`:`Propuestas cargadas en ${ok} lámina${ok===1?'':'s'}.`);plkpSecUpd()}
/** bloque de Cargar planos (lo pone renderPCar) */
function plkpSecHtml(){return`<div class="card plkpsec" id="plkpsec"><b>🟣 Propuestas de vínculos</b>
  <p class="note">Archivo que prepara Claude a partir de los PDF (llamadas de corte, sección, elevación y detalle → la lámina a la que remiten). Se cargan como <b>propuestas</b>: no funcionan hasta que alguien las acepta en el visor.</p>
  <div class="plkpx"><label class="ib"><input type="file" id="plkpf" accept=".json,application/json" hidden>Cargar archivo de propuestas…</label><button type="button" class="ib pri" id="plkpgo">Revisar propuestas</button><button type="button" class="ib" id="plkpall80" title="Acepta de una vez las propuestas con confianza de 80 % o más; las demás quedan para revisar">✓ Aceptar las de confianza alta</button><button type="button" class="ib" id="plkpall" title="Acepta de una vez todas las propuestas pendientes de todas las láminas">✓ Aceptar todas</button><span class="plcnt" id="plkpn"></span></div></div>`}
/** acepta de una vez las propuestas pendientes de todas las láminas (con `min`, solo las de esa confianza o más) */
async function plkpAcceptAll(min){const S=plkpSheets(),sel=p=>plkpList(p).filter(x=>min==null||(x.c!=null&&x.c>=min));
  const T=S.map(p=>[p,sel(p)]).filter(([,L])=>L.length),n=T.reduce((a,[,L])=>a+L.length,0),tot=S.reduce((a,p)=>a+plkpList(p).length,0);
  if(!n){toast(min==null?'No hay propuestas por revisar.':'No hay propuestas con esa confianza.');return}
  if(!await uiAsk({title:`¿Aceptar ${n} propuesta${n===1?'':'s'} de vínculos?`,list:[`${n} de ${tot} pendientes, en ${T.length} lámina${T.length===1?'':'s'}`,min==null?'Todas, sin revisarlas una por una':`Solo las de confianza ${Math.round(min*100)} % o más; las otras ${tot-n} quedan para revisar`],note:'Pasan a ser vínculos normales: se pueden probar, ajustar o quitar uno por uno después.',ok:`Aceptar ${n}`,cancel:'Cancelar',tone:'info'}))return;
  let ok=0,err=0;for(const[p,L]of T){try{ok+=await plkpAccept(p,L.map(x=>x.id))}catch(e){err++}}
  toast(err?`${ok} vínculos aceptados; ${err} lámina${err===1?'':'s'} con error.`:`${ok} vínculo${ok===1?'':'s'} aceptado${ok===1?'':'s'}.`);plkpSecUpd()}
function plkpSecBind(main){const f=$('#plkpf',main),g=$('#plkpgo',main);if(f)f.onchange=()=>{const x=f.files[0];f.value='';if(x)plkpLoad(x)};if(g)g.onclick=plkpReview;const a=$('#plkpall',main),a8=$('#plkpall80',main);if(a)a.onclick=()=>plkpAcceptAll(null);if(a8)a8.onclick=()=>plkpAcceptAll(0.8);plkpSecUpd()}
function plkpSecUpd(){const el=$('#plkpn'),g=$('#plkpgo');if(!el)return;const S=plkpSheets(),n=S.reduce((a,q)=>a+plkpList(q).length,0);
  el.textContent=n?`${n} por revisar en ${S.length} lámina${S.length===1?'':'s'}`:'Ninguna por revisar';for(const b of [g,$('#plkpall'),$('#plkpall80')])if(b)b.disabled=!n}
