"use strict";
/* LPS 911 · Registro de campo.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= CAMPO ================= */
const CU=Object.assign({sec:'',sc:'',show:'all'},store.get('campo',{}));CU.date=null;
const openCards=new Set();
const saveCU=()=>store.set('campo',{sec:CU.sec,sc:CU.sc,show:CU.show,view:CU.view});
const CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const hhmm=t=>{if(!t)return'';const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
function campoDate(){return CU.date||todayIso()}
function shiftDay(d,dir){let x=addD(d,dir);if(pd(x).getUTCDay()===0)x=addD(x,dir);return x}
function shrinkPhoto(file){return new Promise((ok,ko)=>{const img=new Image();const u=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(u);let W=img.naturalWidth,H=img.naturalHeight,max=1280,q=.62,out='';
  for(let k=0;k<7;k++){const sc=Math.min(1,max/Math.max(W,H));const c=document.createElement('canvas');c.width=Math.round(W*sc);c.height=Math.round(H*sc);const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);out=c.toDataURL('image/jpeg',q);if(out.length<260000)break;if(q>.45)q-=.08;else max=Math.round(max*.8)}ok(out)};
  img.onerror=()=>{URL.revokeObjectURL(u);ko(new Error('No se pudo leer la foto.'))};img.src=u})}
function loadFoto(id){if(FOTO.has(id)||!db)return;FOTO.set(id,null);fcol('fotos').doc(id).get().then(d=>{if(d.exists){FOTO.set(id,d.data().data);$$(`img[data-ph="${id}"]`).forEach(i=>i.src=FOTO.get(id))}}).catch(()=>FOTO.delete(id))}
function baseRec(d,x,cur){const prog=hasM(x)?((x.qty||{})[d]??null):null;return{status:cur?.status||null,prog,und:x.und||'',exec:cur?.exec??null,cnc:cur?.cnc||'',imp:cur?.imp??null,note:cur?.note||'',late:!!(cur&&cur.late),done:!!(cur&&cur.done),photos:cur?.photos||[],prop:cur?.prop||null,sc:x.sc||'',nm:x.name||'',ambId:x.ambId||'',by:me?me.email:'',byName:me?(me.name||me.email):'',ts:NOW()}}
function thumbs(ids,kind,key){return(ids||[]).map(id=>{loadFoto(id);const src=FOTO.get(id)||'';return`<div class="th"><img data-ph="${id}" src="${src}" alt="Foto"${src?'':' style="opacity:.3"'}>${canDaily?`<button data-phdel="${id}" data-k="${kind}:${key}" aria-label="Quitar foto">&times;</button>`:''}</div>`}).join('')}
function renderCampo(main){if(VEED()&&!CU.view)CU.view='plan';if(CU.view==='plan'&&canNP()){renderCap(main);return}main.dataset.built='';
  const d=campoDate();ensureDaily(addD(d,-7));const today=todayIso();const dow=(pd(d).getUTCDay()+6)%7;
  const vt=visTree();const secs=[];vt.forEach(({p,secs:ss})=>ss.forEach(({s})=>secs.push({p,s})));if(CU.sec&&!secs.some(x=>x.s.id===CU.sec))CU.sec='';
  const groups=[];let nS=0,nR=0;const cnt={ok:0,partial:0,no:0};const nProp={};
  for(const{p,secs:ss}of vt)for(const{s,ambs}of ss){if(CU.sec&&CU.sec!==s.id)continue;for(const{a,acts}of ambs){
    const items=acts.filter(x=>(schedOn(x,d)||recOf(d,x.id))&&(!CU.sc||x.sc===CU.sc)).map(x=>({x,rc:recOf(d,x.id),sched:schedOn(x,d)}));
    items.forEach(i=>{if(i.sched)nS++;if(i.rc){nR++;cnt[i.rc.status]++}});
    items.forEach(i=>{if(i.rc&&i.rc._prop)(nProp[i.x.sc]=(nProp[i.x.sc]||0)+1)});const shown=items.filter(i=>CU.show==='all'||(CU.show==='prop'?!!(i.rc&&i.rc._prop):CU.show==='pend'?!i.rc:!!i.rc));if(shown.length)groups.push({p,s,a,items:shown})}}
  const npf=i=>(!CU.sc||i.e.sc===CU.sc)&&(!CU.sec||(i.a&&i.a.sectorId===CU.sec));const extras=npItems([d],new Set(vt.map(t=>t.p.id))).filter(npf);
  const cnc=P().cnc||[];const cons=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const cPres=new Set();vt.forEach(({secs:ss})=>ss.forEach(({ambs})=>ambs.forEach(({acts})=>acts.forEach(x=>cPres.add(x.sc)))));const consF=cons.filter(c=>cPres.has(c.id)||CU.sc===c.id);
  let h=`<div class="scroll" style="padding-top:0"><div class="campo">${pageHead('Campo',`${DOW_L[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}${d===today?' · hoy':''} · ${pisoLabel()}`)}
   <div class="cbar">
    <div class="cdate"><button class="ib" data-cd="-1" aria-label="Día anterior">&#8249;</button><div class="d"><b>${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][dow]} ${fmtD(d)}</b><span>Semana ${weekOf(d)}${d===today?' · hoy':''}</span></div><button class="ib" data-cd="1" aria-label="Día siguiente">&#8250;</button>${d!==today?'<button class="ib" data-cd="0">Hoy</button>':''}</div>
    <button class="cfxt" data-cfx aria-expanded="${CU.fx?'true':'false'}">${cfxSum(secs,consF,nS)}</button>
    <div class="cfx"${CU.fx?'':' data-closed'}>
    <div class="cfil"><select id="csec" aria-label="Sector"><option value="">Todos los sectores</option>${secs.map(({p,s})=>`<option value="${s.id}"${CU.sec===s.id?' selected':''}>${U.piso?'':esc(p.code)+' · '}${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select>
     <select id="csc" aria-label="Subcontratista"><option value="">Todos los subcontratistas</option>${consF.map(c=>`<option value="${c.id}"${CU.sc===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="csum">${canNP()?'<span class="seg cview"><button class="on">Tarjetas</button><button data-cv="plan">Plano</button></span>':''}<span class="seg" id="cshow"><button data-v="all" class="${CU.show==='all'?'on':''}">Todas</button><button data-v="pend" class="${CU.show==='pend'?'on':''}">Pendientes</button><button data-v="reg" class="${CU.show==='reg'?'on':''}">Registradas</button><button data-v="prop" class="${CU.show==='prop'?'on':''}">Por confirmar${Object.values(nProp).reduce((a,b)=>a+b,0)?' <b class="bc">'+Object.values(nProp).reduce((a,b)=>a+b,0)+'</b>':''}</button></span>
     <span class="cstat"><span><b>${nS}</b> prog.</span><span style="color:var(--ok)"><b>${cnt.ok}</b> ✓</span>${cnt.partial?`<span style="color:var(--warn)"><b>${cnt.partial}</b> ½</span>`:''}<span style="color:var(--bad)"><b>${cnt.no}</b> ✗</span><span><b>${Math.max(0,nS-(cnt.ok+cnt.partial+cnt.no))}</b> pend.</span></span></div>
   </div></div>`;
  if(nwReason(d)&&(groups.length||extras.length))h+=`<div class="callout hol">📅 <b>${esc(nwReason(d))}</b> · día no laborable. Se muestran igual las actividades programadas.</div>`;
  if(!U.piso&&S.pis.size>1)h+=`<div class="callout">Consejo: elige tu piso arriba (selector de piso) para ver solo tus frentes. El filtro queda guardado en este celular.</div>`;
  {const tp=Object.values(nProp).reduce((a,b)=>a+b,0);if(tp&&canDaily)h+=`<div class="cprop"><div><b>${tp} cierre${tp>1?'s':''} propuesto${tp>1?'s':''} por capataces</b> sin confirmar. Revisa y confirma, o toca el estado correcto para corregir. Si nadie lo revisa, a los 2 días queda como lo marcó el capataz.</div><div class="cpb">${Object.entries(nProp).sort((a,b)=>conOf(a[0]).name.localeCompare(conOf(b[0]).name)).map(([sc,n])=>`<button class="ib" data-cconfsc="${sc}">✓ Confirmar ${esc(conOf(sc).name)} (${n})</button>`).join('')}${Object.keys(nProp).length>1?`<button class="ib pri" data-cconfsc="">✓ Confirmar todos (${tp})</button>`:''}</div></div>`}
  if(dayErr)h+=`<div class="callout">No se pudieron leer los registros (${esc(dayErr)}). Si acabas de actualizar la página, falta publicar las reglas nuevas de Firestore.</div>`;
  if(VEED())h+=`<div class="callout">Registra el <b>trabajo no programado</b> que veas en obra (mejor desde la vista <b>Plano</b>: toca el lugar). El avance de lo programado lo verifica el ingeniero de campo.</div>`;
  else if(!canDaily)h+=`<div class="callout">Tu rol es solo de consulta: puedes ver el avance pero no registrarlo.</div>`;
  if(!groups.length&&!extras.length)h+=`<div class="empty">${nwReason(d)?esc(nwReason(d))+': día no laborable.':'No hay actividades '+(CU.show==='pend'?'pendientes ':CU.show==='reg'?'registradas ':'programadas ')+'para este día con estos filtros.'}</div>`;
  for(const{p,a,items}of groups){
    h+=`<div class="camb"><span class="mono">${U.piso?'':esc(p.code)+' · '}${esc(a.code)}</span>${esc(a.name)}</div>`;
    for(const{x,rc,sched}of items){const c=conOf(x.sc);const prog=hasM(x)?(x.qty||{})[d]:null;const st=rc?rc.status:null;const open=!!st&&openCards.has(x.id);const und=esc(x.und||rc?.und||'');
      h+=`<article class="cc${st?' st-'+ST[st].c:''}${rc&&rc._prop?' prop':''}" data-a="${x.id}" style="--c:${c.color}">
       <div class="cct"><b>${esc(x.name||'(sin nombre)')}</b><span>${esc(c.name)}${prog!=null?` · Prog. <b>${fq(prog)} ${und}</b>`:''}${!sched?(rc&&rc.late?' · <em>ejecutada sin estar programada</em>':' · <em>ya no está programada este día</em>'):''}</span></div>${liveLine(d,x.id)}${canDaily&&sched&&d===today&&!(rc&&!rc._prop)?(()=>{const k=kState(d,x.id).k;return k==='none'?'<div class="clvb"><button class="ib" data-clv="run">▶ Marcar iniciada</button><button class="ib" data-clv="stop">⏸ No pudo iniciar…</button></div>':k==='run'?'<div class="clvb"><span class="clvs run">▶ En ejecución</span><button class="ib" data-clv="stop">⏸ Marcar detenida…</button></div>':k==='stop'?'<div class="clvb"><span class="clvs stop">⏸ Detenida</span><button class="ib" data-clv="res">▶ Marcar reanudada</button></div>':''})():''}
       <div class="csb"><button data-st="ok" class="${st==='ok'?'on':''}"${canDaily?'':' disabled'}>✓ Cumplido</button>${st==='partial'?`<button data-st="partial" class="on"${canDaily?'':' disabled'}>½ Parcial</button>`:''}<button data-st="no" class="${st==='no'?'on':''}"${canDaily?'':' disabled'}>✗ No</button></div>`;
      {const dn=doneOf(x);const later=(x.days||[]).filter(y=>y>d).length;
        if(dn&&(d===dn||rc&&rc.done))h+=`<div class="cdone ok">✓ Terminada${d===dn?'':' el '+fmtD(dn)}${later&&d===dn?` · ${later} día${later>1?'s':''} liberado${later>1?'s':''}`:''}${canDaily?`<button class="ib" data-creopen="1">Reabrir</button>`:''}</div>`;
        else if(canDaily&&!dn&&later&&d<=today&&sched)h+=`<div class="cdone"><button class="ib" data-cdone="1" title="La actividad ya se completó: los días que faltan dejan de contar">✓ Terminada · liberar los ${later} día${later>1?'s':''} que faltan</button></div>`}
      if(open){h+=`<div class="cdet">
        <label for="ce-${x.id}">Ejecutado hoy${prog!=null?` (prog. ${fq(prog)})`:''}</label><div class="cexr"><input id="ce-${x.id}" class="ci" data-cexec inputmode="decimal" data-fk="ce:${x.id}" value="${rc.exec??''}" placeholder="0"${canDaily?'':' disabled'}><span>${und||'und'}</span></div>
        ${st!=='ok'?`<label>Causa</label><div class="cchips">${cnc.map(k=>`<button class="chipb${rc.cnc===k?' on':''}" data-ccnc="${esc(k)}" title="${esc(cncTip(k))}"${canDaily?'':' disabled'}>${esc(cncLabel(k))}</button>`).join('')}</div>
        <label>¿Imputable a ${esc(c.name)}?</label><div class="cimp"><span class="seg"><button data-cimp="1" class="${impOf(rc)?'on':''}"${canDaily?'':' disabled'}>Sí</button><button data-cimp="0" class="${impOf(rc)?'':'on'}"${canDaily?'':' disabled'}>No</button></span><span class="mu">${rc.imp!=null?'cambiado a mano':rc.cnc?'según la causa':'sin causa: cuenta como imputable'}</span></div>`:''}
        ${st!=='ok'?(()=>{const nx=(x.days||[]).filter(y=>y>d).sort()[0];const nd=shiftDay(d,1);const lk=(()=>{for(let k=1;k<=10;k++){const dd=shiftDay(d,k);const r3=recOf(dd,x.id);if(r3&&r3.status==='ok'&&r3.late)return dd}return null})();return lk?`<div class="crep">✓ Ejecutada el <b>${DOWN[(pd(lk).getUTCDay()+6)%7].toLowerCase()} ${fmtD(lk)}</b> sin estar programada</div>`:nx?`<div class="crep">Reprogramada para el <b>${DOWN[(pd(nx).getUTCDay()+6)%7].toLowerCase()} ${fmtD(nx)}</b></div>`:(canWrite||canDaily)?`<div class="crep">${canWrite?`<button class="ib" data-crep="${nd}">↻ Reprogramar para el ${DOWN[(pd(nd).getUTCDay()+6)%7].toLowerCase()} ${fmtD(nd)}</button>`:''}<button class="ib" data-cexe="${d}">✓ Ya se ejecutó…</button><span class="mu">o cámbialo en el lookahead / plano diario</span></div>`:''})():''}
        <label for="cn-${x.id}">Comentario</label><textarea id="cn-${x.id}" class="ci" data-cnote data-fk="cn:${x.id}" rows="2" placeholder="Opcional"${canDaily?'':' disabled'}>${esc(rc.note||'')}</textarea>
        <div class="cph">${thumbs(rc.photos,'r',x.id)}${canDaily?`<label class="phbtn">${CAM} Foto<input type="file" accept="image/*" capture="environment" data-cphoto hidden></label>`:''}</div>
        <div class="cdone"><button class="ib pri" data-cdone>Listo</button></div></div>`}
      if(rc&&!open&&(st!=='ok'||rc.note))h+=`<div class="csumr">${st!=='ok'?(rc.cnc?`Causa: <b>${esc(rc.cnc)}</b>`:'<span class="miss">Falta indicar la causa</span>')+(impOf(rc)===false?' · <span class="nimp">no imputable al SC</span>':'')+((()=>{const nx=(x.days||[]).filter(y=>y>d).sort()[0];return nx?` · <span class="mu">reprogramada al ${fmtD(nx)}</span>`:''})()):''}${rc.note?`${st!=='ok'?' · ':''}<span class="mu">“${esc(rc.note.length>90?rc.note.slice(0,88)+'…':rc.note)}”</span>`:''}</div>`;
      if(rc&&rc._prop)h+=`<div class="cby cpr"><span>Propuesto por <b>${esc(rc.byName||'capataz')}</b> (capataz) · ${hhmm(rc.ts)}${rc.cnc?' · '+esc(rc.cnc):''}${rc.done?' · terminada':''}</span>${canDaily?'<span><button class="ib pri" data-cconf>✓ Confirmar</button></span>':''}</div>`;
      else if(rc)h+=`<div class="cby"><span>${esc(rc.byName||rc.by||'')} · ${hhmm(rc.ts)}${rc.prop?(rc.prop.status!==rc.status?` · <span class="miss">capataz marcó ${ST[rc.prop.status]?.i||''} ${esc(ST[rc.prop.status]?.t||'')}</span>`:rc.auto?' · <span class="mu">sin revisión (propuesta del capataz)</span>':' · <span class="mu">confirmado</span>'):''}${!open&&(rc.photos||[]).length?` · ${rc.photos.length} foto(s)`:''}${!open&&rc.exec!=null?` · ejec. ${fq(rc.exec)} ${und}`:''}</span><span><button class="lnkb" data-more>${open?'Ocultar':canDaily?'Editar':'Ver detalle'}</button> ${canDaily&&!open?'<button class="lnkb" data-cclear>Quitar registro</button>':''}</span></div>`;
      h+='</article>'}}
  if(extras.length)h+=`<div class="camb npsec">Trabajo no programado <b>${extras.length}</b></div>${extras.map(npCard).join('')}`;
  if(canNP()&&pd(d).getUTCDay()!==0&&d<=today)h+=`<button class="cadd" id="xopen">+ Trabajo no programado</button>`;
  h+='</div></div>';
  main.innerHTML=h;
  main.onfocusin=e=>{if(e.target.classList&&e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  $('#csec',main).onchange=e=>{CU.sec=e.target.value;saveCU();render()};
  $('#csc',main).onchange=e=>{CU.sc=e.target.value;saveCU();render()};
  main.onclick=async e=>{const t=e.target;
    const cdb=t.closest('[data-cd]');if(cdb){const v=+cdb.dataset.cd;CU.date=v===0?null:shiftDay(campoDate(),v);if(CU.date===todayIso())CU.date=null;const sc=main.querySelector('.scroll');render();if(sc)main.querySelector('.scroll').scrollTop=0;return}
    const cvb=t.closest('[data-cv]');if(cvb){CU.view=cvb.dataset.cv;saveCU();main.dataset.built='';render();return}
    const sh=t.closest('#cshow button');if(sh){CU.show=sh.dataset.v;saveCU();render();return}
    const cfs=t.closest('[data-cconfsc]');if(cfs&&canDaily){const sc=cfs.dataset.cconfsc;let n=0;for(const x of S.act.values()){if(sc&&x.sc!==sc)continue;const r=recOf(d,x.id);if(r&&r._prop&&visPisos().some(p=>p.id===pisoOfAct(x.id))){confirmProp(d,x.id);n++}}toast(`${n} cierre${n===1?'':'s'} confirmado${n===1?'':'s'}`);return}
    if(t.id==='xopen'){const ps=visPisos();npNew({d,pid:(CU.sec&&pisoOfSecObj(S.sec.get(CU.sec)))||U.piso||(ps[0]||{}).id||''});return}
    const ph=t.closest('img[data-ph]');if(ph&&ph.src){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-x="1">Cerrar</button></div><img src="${ph.src}" alt="">`;lb.onclick=ev=>{if(ev.target.dataset.x||ev.target===lb)lb.remove()};document.body.appendChild(lb);return}
    const pd_=t.closest('[data-phdel]');if(pd_&&canDaily){const fid=pd_.dataset.phdel;const[kind,key]=pd_.dataset.k.split(/:(.*)/s);
      if(kind==='r'){const x=S.act.get(key);const rc=recOf(d,key);if(x&&rc)writeDaily(d,pisoOfAct(key),{recs:{[key]:{...rc,photos:(rc.photos||[]).filter(i=>i!==fid)}}})}
      else{const[pid,xid]=key.split(':');const doc=DAY.get(dayId(d,pid));const ex=doc&&doc.extra&&doc.extra[xid];if(ex)writeDaily(d,pid,{extra:{[xid]:{...ex,photos:(ex.photos||[]).filter(i=>i!==fid)}}})}
      if(db)fcol('fotos').doc(fid).delete().catch(()=>{});return}
    const art=t.closest('article[data-a]');if(!art)return;const aid=art.dataset.a;const x=S.act.get(aid);if(!x)return;const pid=pisoOfAct(aid);const cur=recOf(d,aid);
    const stb=t.closest('[data-st]');if(stb&&canDaily){const nst=stb.dataset.st;const r=baseRec(d,x,cur);r.status=nst;if(nst==='ok'){r.cnc='';r.imp=null;if(r.exec==null&&r.prog!=null)r.exec=r.prog;openCards.delete(aid)}else{openCards.add(aid);if(cur&&cur.status==='ok'&&cur.exec!=null&&cur.exec===r.prog)r.exec=null}
      if(!(x.days||[]).includes(d)&&!cur){toast('Esta actividad no está programada este día.');return}
      writeDaily(d,pid,{recs:{[aid]:r}});if(nst!=='ok'&&!r.cnc)toast('Elige la causa y, si quieres, agrega una foto.');return}
    if(t.closest('[data-cconf]')&&canDaily){confirmProp(d,aid);toast('Confirmado');return}
    const lvb=t.closest('[data-clv]');if(lvb&&canDaily){const k=lvb.dataset.clv;if(k==='stop')capSheet(aid,d,'stop');else kAct(aid,d,k);return}
    const dnb=t.closest('[data-cdone]');if(dnb&&canDaily){markDone(aid,d);return}
    const rob=t.closest('[data-creopen]');if(rob&&canDaily){reopenDone(aid);return}
    const exb=t.closest('[data-cexe]');if(exb&&cur&&canDaily){execPop(exb,aid,exb.dataset.cexe);return}
    const rpb=t.closest('[data-crep]');if(rpb&&cur&&canWrite){reprogAct(aid,rpb.dataset.crep,d);return}
    if(t.closest('[data-more]')){openCards.has(aid)?openCards.delete(aid):openCards.add(aid);render();return}
    if(t.closest('[data-cdone]')){const ae=document.activeElement;if(ae&&art.contains(ae)&&ae.blur)ae.blur();setTimeout(()=>{openCards.delete(aid);const c2=recOf(d,aid);if(c2&&c2.status!=='ok'&&!c2.cnc)toast('Guardado sin causa. Puedes agregarla luego con “Editar”.');else toast('Registro guardado');render()},60);return}
    if(t.closest('[data-cclear]')&&cur){writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,cur),status:null,exec:null,cnc:'',note:'',photos:[]}}});openCards.delete(aid);(cur.photos||[]).forEach(fid=>db&&fcol('fotos').doc(fid).delete().catch(()=>{}));toast('Registro quitado');return}
    const cb=t.closest('[data-ccnc]');if(cb&&cur&&canDaily){const v=cb.dataset.ccnc;writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,cur),cnc:cur.cnc===v?'':v,imp:null}}});return}
    const ib=t.closest('[data-cimp]');if(ib&&cur&&canDaily){const v=ib.dataset.cimp==='1';const def=cncImp(cur.cnc);writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,cur),imp:v===def?null:v}}});return}};
  main.onchange=async e=>{const t=e.target;if(!canDaily)return;
    const art=t.closest('article');if(!art)return;
    if(art.dataset.a){const aid=art.dataset.a;const x=S.act.get(aid);const cur=recOf(d,aid);if(!x||!cur)return;const pid=pisoOfAct(aid);
      if(t.hasAttribute('data-cexec')){const v=parseNum(t.value);if(Number.isNaN(v)||(v!=null&&v<0)){toast('Escribe un número positivo.');t.value=cur.exec??'';return}t.dataset.o=t.value;writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,cur),exec:v}}});return}
      if(t.hasAttribute('data-cnote')){t.dataset.o=t.value;writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,cur),note:t.value.trim()}}});return}
      if(t.hasAttribute('data-cphoto')&&t.files[0]){const f=t.files[0];t.value='';try{toast('Comprimiendo foto…');const data=await shrinkPhoto(f);const fid=uid('f');FOTO.set(fid,data);
        fcol('fotos').doc(fid).set({data,date:d,pisoId:pid,actId:aid,by:me.email,ts:NOW()}).catch(err=>toast('No se pudo guardar la foto: '+(err.code||err.message)));
        const c2=recOf(d,aid)||cur;writeDaily(d,pid,{recs:{[aid]:{...baseRec(d,x,c2),photos:[...(c2.photos||[]),fid]}}});toast(`Foto agregada (${Math.round(data.length*.75/1024)} KB)`)}catch(err){toast(err.message)}}}
  };
}

