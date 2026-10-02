"use strict";
/* LPS 911 · Lookahead (grilla, edición, versiones, plantillas).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= LOOKAHEAD ================= */
function tree(){
  const secBy={},ambBy={},actBy={};
  for(const s of S.sec.values()){const p=pisoOfSecObj(s);(secBy[p]=secBy[p]||[]).push(s)}
  for(const a of S.amb.values())(ambBy[a.sectorId]=ambBy[a.sectorId]||[]).push(a);
  for(const a of S.act.values())(actBy[a.ambId]=actBy[a.ambId]||[]).push(a);
  return pisos().map(p=>({p,secs:(secBy[p.id]||[]).sort(byOrder).map(s=>({s,ambs:(ambBy[s.id]||[]).sort(byOrder).map(a=>({a,acts:(actBy[a.id]||[]).sort(byOrder)}))}))}));
}
function visTree(){return tree().filter(t=>!U.piso||t.p.id===U.piso)}
const an=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function actNames(){ // actividades distintas visibles (respeta piso, sector y SC)
  const m=new Map();for(const{secs}of visTree())for(const{s,ambs}of secs){if(U.sector&&U.sector!==s.id)continue;for(const{acts}of ambs)for(const x of acts){if(U.sc&&x.sc!==U.sc)continue;const k=an(x.name);if(!k)continue;const e=m.get(k)||{k,name:String(x.name).trim(),n:0};e.n++;m.set(k,e)}}
  for(const k of U.acts)if(!m.has(k))m.set(k,{k,name:k,n:0});
  return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function actPop(btn){
  const draw=()=>{const q=an(($('#apq')||{}).value||'');const L=actNames().filter(e=>!q||e.k.includes(q));
    return L.length?L.map(e=>`<label class="apr"><input type="checkbox" data-ak="${esc(e.k)}"${U.acts.includes(e.k)?' checked':''}><span>${esc(e.name)}</span><small>${e.n}</small></label>`).join(''):'<div class="ptx">Sin coincidencias</div>'};
  openPop(btn,`<div class="ph">Filtrar por actividad</div><div class="qrow" style="padding:0 10px 6px"><input id="apq" type="search" placeholder="Buscar actividad…" aria-label="Buscar actividad" style="width:260px;text-align:left"></div><div id="apl" class="apl">${draw()}</div><div class="apf"><button data-do="clr" class="ib">Quitar selección</button></div>`,{clr:()=>{U.acts=[];saveUI();requestRender()}});
  const upd=()=>{$('#apl').innerHTML=draw()};
  $('#apq').oninput=upd;$('#apq').focus();
  $('#apl').onchange=e=>{const c=e.target.closest('[data-ak]');if(!c)return;const k=c.dataset.ak;U.acts=c.checked?[...new Set([...U.acts,k])]:U.acts.filter(x=>x!==k);saveUI();requestRender()}}
function actBtnLabel(){return U.acts.length?`Actividades · ${U.acts.length}`:'Actividades'}
function baselines(){ // por piso: última semana congelada <= semana visible
  const m=new Map();for(const w of S.wk.values()){if(!w.frozenAt||!w.pisoId||w.n>U.week)continue;const b=m.get(w.pisoId);if(!b||w.n>b.n)m.set(w.pisoId,w)}return m;
}
function buildLookShell(main){
  gridRows=null;gridHead='';
  main.innerHTML=`<div class="view">
  <div class="bar">
    <input type="search" id="fq" placeholder="Buscar ambiente, actividad o SC (varios: separa con coma)" aria-label="Buscar">
    <select id="fsec" aria-label="Sector"></select>
    <span class="seg" id="fmode" aria-label="Forma de programar" title="Por días: pinta celdas. Por metrado: escribe la cantidad de cada día."><button data-m="dias">Por días</button><button data-m="metrado">Por metrado</button></span>
    <span class="seg" id="fwin" aria-label="Semanas visibles"><button data-w="3">3 sem</button><button data-w="6">6 sem</button><button data-w="12">12 sem</button></span>
    <button class="ib" id="fmore" aria-expanded="false" title="Más filtros y opciones de vista">Filtros y vista <span class="fmn" id="fmn" hidden></span> ▾</button>
    <span id="fday"></span>
    <span class="sp" style="flex:1"></span>
    <select id="fver" aria-label="Versión del lookahead" title="Versiones guardadas del lookahead"><option value="">Lookahead actual</option></select>
    <span class="seg" id="fvm" hidden><button data-v="ver">Ver versión</button><button data-v="cmp">Comparar con actual</button></span>
    <button class="ib" id="fvsave" hidden>Guardar versión…</button><button class="ib" id="fvdel" hidden>Eliminar versión</button>
    <div class="bmore" id="bmore" hidden>
      <button class="ib" id="fact" title="Elegir una o varias actividades específicas (p. ej. Gabel y Pintura de 2da mano)">Actividades</button>
      <label class="chk"><input type="checkbox" id="fonly"> Solo con días en la ventana</label>
      <label class="chk"><input type="checkbox" id="frestr"> Con restricciones</label>
      <label class="chk" id="lobs" hidden title="Actividades marcadas al importar el Excel para revisar el subcontratista"><input type="checkbox" id="fobs"> Con observaciones <b id="nobs"></b></label>
      <label class="chk"><input type="checkbox" id="fchg"> Ver cambios</label>
      <label class="chk"><input type="checkbox" id="fleg"> Mostrar subcontratistas</label>
      <span class="sp"></span>
      <button class="ib" id="fcoll">Plegar todo</button>
      <button class="ib" id="fmeet">Modo reunión</button>
    </div>
  </div>
  <div id="verban"></div>
  <div class="legend" id="legend"></div>
  <div class="gridwrap" id="gw"><table class="g" id="grid"></table></div></div>`;
  $('#fq').oninput=e=>{U.q=e.target.value;requestRender()};
  $('#fmore').onclick=()=>{U.lbMore=!U.lbMore;saveUI();moreSync()};
  $('#fleg').onchange=e=>{U.legOff=!e.target.checked;saveUI();moreSync()};moreSync();
  $('#fsec').onchange=e=>{U.sector=e.target.value;saveUI();requestRender()};
  $('#fact').onclick=e=>{if(!pop.hidden&&popFor===e.currentTarget){closePop();return}actPop(e.currentTarget)};
  $('#fmode').onclick=e=>{const b=e.target.closest('button');if(!b)return;U.qmode=b.dataset.m;saveUI();closeQEditor(true);requestRender();if(U.qmode==='metrado')toast('Modo metrado: haz clic en un día para escribir la cantidad, o arrastra varios días para repartir el saldo.')};
  $('#fwin').onclick=e=>{const b=e.target.closest('button');if(!b)return;U.win=+b.dataset.w;saveUI();requestRender()};
  $('#fonly').onchange=e=>{U.onlyWin=e.target.checked;saveUI();requestRender()};
  $('#frestr').onchange=e=>{U.onlyRestr=e.target.checked;saveUI();requestRender()};
  $('#fobs').onchange=e=>{U.onlyObs=e.target.checked;saveUI();requestRender()};
  $('#fchg').onchange=e=>{U.changes=e.target.checked;saveUI();requestRender();if(U.changes&&!baselines().size)toast('Aún no hay un plan congelado para comparar. Congela el plan en la pestaña Plan semanal.')};
  $('#fcoll').onclick=()=>{const vs=new Set(visPisos().map(p=>p.id));const all=[...vs,...[...S.sec.values()].filter(s=>vs.has(pisoOfSecObj(s))).map(s=>s.id)];const allC=all.every(id=>U.collapsed.includes(id));U.collapsed=allC?U.collapsed.filter(id=>!all.includes(id)):[...new Set([...U.collapsed,...all.filter(id=>!vs.has(id))])];saveUI();requestRender()};
  $('#fmeet').onclick=()=>{U.meeting=!U.meeting;if(U.meeting&&U.win>3)U.win=3;saveUI();requestRender()};
  $('#fver').onchange=e=>{U.ver=e.target.value;if(U.ver&&!U.verMode)U.verMode='ver';if(U.ver)loadVer(U.ver);gridRows=null;closePop();requestRender()};
  $('#fvm').onclick=e=>{const b=e.target.closest('button');if(!b)return;U.verMode=b.dataset.v;gridRows=null;requestRender()};
  $('#fvsave').onclick=e=>saveVerMenu(e.currentTarget);
  $('#fvdel').onclick=async()=>{const v=LHI.get(U.ver);if(!v||!isAdmin)return;if(!confirm(`¿Eliminar la versión “${v.label}”? No se puede recuperar.`))return;
    try{const b=db.batch();Object.keys(v.pisos||{}).forEach(pid=>b.delete(fcol('lhver').doc(U.ver+'__'+pid)));b.delete(fcol('lhidx').doc(U.ver));await b.commit();VERD.delete(U.ver);U.ver='';toast('Versión eliminada');requestRender()}catch(err){toast('No se pudo eliminar: '+(err.code||err.message))}};
  $('#legend').onclick=e=>{const c=e.target.closest('.chip');if(!c)return;U.sc=U.sc===c.dataset.id?'':c.dataset.id;saveUI();requestRender()};
  wireGrid($('#grid'));$('#gw').addEventListener('scroll',()=>closeQEditor(true),{passive:true});
  main.dataset.built='1';
}
let gridRows=null,gridHead='';
function renderLook(main){
  if(isMob()&&!U.lookFull){main.dataset.built='';renderLookMob(main);return}
  ensureDaily(addD(weekStart(U.week),-7));ensureVers();
  if(!main.dataset.built)buildLookShell(main);
  renderVerBar();
  const vd=U.ver&&U.verMode==='ver'?VERD.get(U.ver):null;
  if(vd&&vd.ready){const un=swapVer(vd);const cw=canWrite;canWrite=false;try{renderLookInner(main)}finally{canWrite=cw;un()}return}
  if(revOn()){const un=revSwap();try{renderLookInner(main)}finally{un()}}else renderLookInner(main);renderPropBar();revWire();
  if(isMob()&&U.lookFull&&!main.querySelector('.lmback')){const bk=document.createElement('div');bk.className='lmback';bk.innerHTML='<span>Tabla completa del lookahead (mejor en PC)</span><button class="ib pri" id="lmlist">Vista de celular</button>';main.prepend(bk);bk.querySelector('#lmlist').onclick=()=>{U.lookFull=false;main.dataset.built='';render()}}}
let lmKeep=true;
function renderLookMob(main){ensureDaily(addD(weekStart(U.week),-7));
  const wd=weekDays(U.week);const today=todayIso();if(!U.lmDay||!wd.includes(U.lmDay))U.lmDay=wd.includes(today)?today:wd[0];const d=U.lmDay;
  const vt=visTree();const pend={};for(const r of S.res.values())if(r.status!=='lib'&&r.actId)pend[r.actId]=(pend[r.actId]||0)+1;
  const secs=[];vt.forEach(({p,secs:ss})=>ss.forEach(({s})=>secs.push({p,s})));if(U.sector&&!secs.some(x=>x.s.id===U.sector))U.sector='';
  const cntD={};wd.forEach(x=>cntD[x]=0);const groups=[];const scIn=new Set();let n=0;
  for(const{p,secs:ss}of vt)for(const{s,ambs}of ss){if(U.sector&&U.sector!==s.id)continue;for(const{a,acts}of ambs){
    for(const x of acts){if(U.acts.length&&!U.acts.includes(an(x.name)))continue;if(!U.sc||x.sc===U.sc)for(const dd of x.days||[])if(dd in cntD)cntD[dd]++;if((x.days||[]).includes(d))scIn.add(x.sc)}
    const L=acts.filter(x=>schedOn(x,d)&&(!U.sc||x.sc===U.sc)&&(!U.acts.length||U.acts.includes(an(x.name))));if(L.length){groups.push({p,s,a,L});n+=L.length}}}
  const cons=[...S.con.values()].filter(c=>scIn.has(c.id)||c.id===U.sc).sort((a,b)=>a.name.localeCompare(b.name));
  let h=`<div class="scroll lmob"><div class="lmd">${wd.map((x,i)=>`<button data-lmd="${x}" class="${x===d?'on':''}${x===today?' td':''}" aria-label="${DOWN[i]} ${fmtD(x)}"><span>${DL[i]}</span><b>${x.slice(8)}</b><small>${cntD[x]||''}</small></button>`).join('')}</div>
   <div class="lmf"><select id="lmsec" aria-label="Sector"><option value="">Todos los sectores</option>${secs.map(({p,s})=>`<option value="${s.id}"${U.sector===s.id?' selected':''}>${U.piso?'':esc(p.code)+' · '}${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select>
   <select id="lmsc" aria-label="Subcontratista"><option value="">Todos los SC</option>${cons.map(c=>`<option value="${c.id}"${U.sc===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select>
   <select id="lmact" aria-label="Actividad"><option value="">Todas las actividades</option>${actNames().map(e=>`<option value="${esc(e.k)}"${U.acts.length===1&&U.acts[0]===e.k?' selected':''}>${esc(e.name)}</option>`).join('')}</select></div>
   <div class="lmh"><b>${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}</b> · ${n} actividad${n===1?'':'es'} programada${n===1?'':'s'}${U.piso?'':' · todos los pisos'}</div>`;
  if(!n)h+=`<div class="empty">No hay actividades programadas este día${U.sc||U.sector?' con estos filtros':''}.</div>`;
  for(const{p,a,L}of groups){h+=`<div class="camb"><span class="mono">${U.piso?'':esc(p.code)+' · '}${esc(a.code)}</span>${esc(a.name)}</div>`;
    for(const x of L){const c=conOf(x.sc);const rc=d<=today?recOf(d,x.id):null;const q=hasM(x)?(x.qty||{})[d]:null;const ds=new Set(x.days||[]);
      h+=`<article class="lmc" data-a="${x.id}" style="--c:${c.color}"><div class="t"><b>${esc(x.name||'(sin nombre)')}</b>${rc?`<span class="stt ${ST[rc.status].c}">${ST[rc.status].i} ${ST[rc.status].t}</span>`:''}</div>
        <div class="s">${esc(c.name)}${q!=null?` · ${fq(q)} ${esc(x.und||'')}`:''}${pend[x.id]?` · <span class="rw">⚠ ${pend[x.id]} restricción${pend[x.id]>1?'es':''}</span>`:''}${x.obs?' · <span class="rw">con observación</span>':''}</div>
        <span class="mini" style="--c:${c.color}">${wd.map((y,i)=>`<i class="${ds.has(y)?'on':''}">${DL[i]}</i>`).join('')}</span></article>`}}
  h+=`<div class="lmfoot"><button class="ib" id="lmfull">Ver tabla completa del lookahead</button><span class="note">Para editar el lookahead usa una PC. Cambia de semana con las flechas de arriba.</span></div></div>`;
  const sc0=main.querySelector('.lmob');const st=sc0&&lmKeep?sc0.scrollTop:0;lmKeep=true;
  main.innerHTML=h;const sc1=main.querySelector('.lmob');if(sc1)sc1.scrollTop=st;
  main.onclick=e=>{const t=e.target;const db_=t.closest('[data-lmd]');if(db_){U.lmDay=db_.dataset.lmd;lmKeep=false;render();return}
    if(t.id==='lmfull'){U.lookFull=true;main.dataset.built='';render();return}
    const art=t.closest('article[data-a]');if(art){const rc=recOf(U.lmDay,art.dataset.a);if(rc&&U.lmDay<=todayIso())recPop(art,art.dataset.a,U.lmDay)}};
  main.onchange=e=>{if(e.target.id==='lmsec'){U.sector=e.target.value;lmKeep=false;saveUI();render()}if(e.target.id==='lmsc'){U.sc=e.target.value;lmKeep=false;saveUI();render()}if(e.target.id==='lmact'){U.acts=e.target.value?[e.target.value]:[];lmKeep=false;saveUI();render()}}}
function renderLookInner(main){
  const vset=new Set(visPisos().map(p=>p.id));const pOrd=id=>(S.pis.get(id)||{}).order||0;
  const secs=[...S.sec.values()].filter(s=>vset.has(pisoOfSecObj(s))).sort((a,b)=>pOrd(pisoOfSecObj(a))-pOrd(pisoOfSecObj(b))||byOrder(a,b));
  if(U.sector&&!secs.some(s=>s.id===U.sector))U.sector='';
  {const fa=$('#fact');if(fa){fa.textContent=actBtnLabel();fa.classList.toggle('on',U.acts.length>0)}}
  $('#fsec').innerHTML='<option value="">Todos los sectores'+(U.piso?' del piso':'')+'</option>'+secs.map(s=>`<option value="${s.id}"${U.sector===s.id?' selected':''}>${U.piso?'':esc((S.pis.get(pisoOfSecObj(s))||{}).code||'')+' · '}${esc(s.code)} · ${esc(s.name)}</option>`).join('');
  $$('#fwin button').forEach(b=>b.classList.toggle('on',+b.dataset.w===U.win));
  $$('#fmode button').forEach(b=>b.classList.toggle('on',b.dataset.m===U.qmode));$('#gw').classList.toggle('qm',U.qmode==='metrado');
  $('#fonly').checked=U.onlyWin;$('#frestr').checked=U.onlyRestr;
  {let no=0;for(const a of S.act.values())if(a.obs&&vset.has(pisoOfAmb(a.ambId)))no++;if(!no&&U.onlyObs)U.onlyObs=false;$('#lobs').hidden=!no;$('#nobs').textContent=no||'';$('#fobs').checked=U.onlyObs}$('#fchg').checked=U.changes;
  $('#fmeet').classList.toggle('on',U.meeting);
  $('#gw').classList.toggle('meet',U.meeting);$('#gw').classList.toggle('ro-mode',!canWrite);
  const days=winDays();const dset=new Set(days.map(x=>x.d));
  {const fd=$('#fday');const wIn=U.wkF&&U.wkF>=U.week&&U.wkF<U.week+U.win;const hv=U.day&&days.some(x=>x.d===U.day)?`<span class="dpill">Solo ${DOWN[(pd(U.day).getUTCDay()+6)%7].toLowerCase()} ${fmtD(U.day)}<button id="fdayx" aria-label="Ver todos los días" title="Ver todos los días">&times;</button></span>`:wIn?`<span class="dpill">Solo semana ${U.wkF} (${fmtD(weekDays(U.wkF)[0])} – ${fmtD(weekDays(U.wkF)[5])})<button id="fdayx" aria-label="Ver todas las semanas" title="Ver todas las semanas">&times;</button></span>`:'';if(fd.innerHTML!==hv){fd.innerHTML=hv;const bx=$('#fdayx');if(bx)bx.onclick=()=>{U.day='';U.wkF=0;requestRender()}}}
  const cnt={};for(const a of S.act.values()){if(vset.has(pisoOfAmb(a.ambId))&&(U.day?(a.days||[]).includes(U.day):U.wkF?(a.days||[]).some(d=>weekDays(U.wkF).includes(d)):(a.days||[]).some(d=>dset.has(d))))cnt[a.sc]=(cnt[a.sc]||0)+1}
  const present=new Set();for(const a of S.act.values()){const am=S.amb.get(a.ambId);if(!am||!vset.has(pisoOfAmb(a.ambId)))continue;if(U.sector&&am.sectorId!==U.sector)continue;present.add(a.sc)}
  const cons=[...S.con.values()].filter(c=>present.has(c.id)||U.sc===c.id).sort((a,b)=>a.name.localeCompare(b.name));
  const lg=cons.map(c=>`<button class="chip${U.sc===c.id?' on':''}${U.sc&&U.sc!==c.id?' dim':''}" data-id="${c.id}" style="--c:${c.color}" title="${esc(c.partida||'')}"><i></i>${esc(c.name)}${cnt[c.id]?` <b>${cnt[c.id]}</b>`:''}</button>`).join('');
  const lge=$('#legend');if(lge.dataset.h!==lg){lge.innerHTML=lg;lge.dataset.h=lg}
  const allIds=[...visPisos().map(p=>p.id),...secs.map(s=>s.id)];
  $('#fcoll').textContent=allIds.length&&allIds.every(id=>U.collapsed.includes(id))?'Desplegar todo':'Plegar todo';moreSync();
  renderGrid($('#grid'),days,dset);
}
function renderGrid(tbl,days,dset){
  const today=todayIso();const pr=pendRestr();const bases=pmBases()||(U.ver&&U.verMode==='cmp'&&VERD.get(U.ver)?.ready?verBases(VERD.get(U.ver)):U.changes?baselines():null);const RV=revOn();const RVF=RV&&!U.revCtx;const PPV=RV?null:propOverlay();const pmM=PM()?new Set(myScsI()):null;
  const q=U.q.trim().toLowerCase();if(U.day&&!dset.has(U.day))U.day='';if(U.wkF&&(U.wkF<U.week||U.wkF>=U.week+U.win))U.wkF=0;const wkSet=U.wkF?new Set(weekDays(U.wkF)):null;const aset=U.acts.length?new Set(U.acts):null;const qs=q?q.split(/[,;]/).map(t=>t.trim()).filter(Boolean):[];const filt=!!((revOn()&&!U.revCtx)||q||aset||U.sc||U.onlyWin||U.onlyRestr||U.onlyObs||U.day||U.wkF);
  const conOpts=[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const nd=days.length;const ro=canWrite&&!PM()?'':' readonly';
  let head='<colgroup><col class="s0"><col class="s1"><col class="s2"><col class="s3"><col class="s4"><col class="cU"><col class="cM"><col class="cS"><col class="cN"><col class="cI"><col class="cF">'+'<col>'.repeat(nd)+'</colgroup>';
  head+='<thead><tr><th class="fx s0" rowspan="2"></th><th class="fx s1" rowspan="2">Ítem</th><th class="fx s2" rowspan="2">Ambiente</th><th class="fx s3" rowspan="2">Subcontratista</th><th class="fx s4" rowspan="2">Actividad</th><th class="fx cU" rowspan="2">Und</th><th class="fx cM" rowspan="2">Metrado</th><th class="fx cS" rowspan="2" title="Metrado total menos lo programado">Saldo</th><th class="fx cN" rowspan="2" title="Días programados">Días</th><th class="fx cI" rowspan="2">Inicio</th><th class="fx cF" rowspan="2">Fin</th>';
  for(let w=U.week;w<U.week+U.win;w++){const wd=weekDays(w);head+=`<th class="wkh${U.wkF===w?' wsel':''}" colspan="6" data-wkh="${w}" title="${U.wkF===w?'Clic para ver todas las semanas':'Clic para ver solo las actividades de la semana '+w}"><b>Sem ${w}</b><span>${fmtD(wd[0])} – ${fmtD(wd[5])}</span></th>`}
  head+='</tr><tr>';
  days.forEach(x=>{const nw=nwReason(x.d);head+=`<th class="dh${x.i===0?' wk0':''}${x.d===today?' tdy':''}${x.d===U.day?' dsel':''}${nw?' hol':''}" data-dh="${x.d}" title="${nw?esc(nw)+' · ':''}${x.d===U.day?'Clic para ver todas las actividades':'Clic para ver solo las actividades del '+fmtD(x.d)}"><b>${DL[x.i]}</b>${x.d.slice(8)}</th>`});
  head+='</tr></thead>';
  const rows=[];let shown=0;
  for(const{p,secs}of visTree()){
    const snapW=bases&&bases.get(p.id);const snap=snapW?snapW.snap||{}:null;
    const blocks=[];let pAmb=0,pAct=0;
    for(const{s,ambs}of secs){
      if(U.sector&&U.sector!==s.id)continue;
      const list=[];let nAct=0;
      for(const{a,acts}of ambs){
        const vis=acts.filter(x=>{
          if(RVF&&!x._rv)return false;
          if(U.sc&&x.sc!==U.sc)return false;
          if(U.onlyWin&&!(x.days||[]).some(d=>dset.has(d)))return false;
          if(U.onlyRestr&&!pr.get(x.id))return false;
          if(U.onlyObs&&!x.obs)return false;
          if(U.day&&!(x.days||[]).includes(U.day)&&!recOf(U.day,x.id))return false;
          if(wkSet&&!(x.days||[]).some(d=>wkSet.has(d)))return false;
          if(aset&&!aset.has(an(x.name)))return false;
          if(qs.length){const t=(x.name+' '+a.name+' '+a.code+' '+conOf(x.sc).name).toLowerCase();if(!qs.some(w=>t.includes(w)))return false}
          return true});
        if(!vis.length&&(filt||acts.length))continue;
        nAct+=vis.length;list.push({a,vis});
      }
      if(filt&&!list.length)continue;
      blocks.push({s,list,nAmb:list.length,nAct});pAmb+=list.length;pAct+=nAct;
    }
    if((filt||U.sector)&&!blocks.length)continue;
    const pc=U.collapsed.includes(p.id);
    rows.push({k:'p:'+p.id,h:`<tr class="piso" data-piso-row="${p.id}"><td class="secc" colspan="5"><div class="secin"><button class="tg${pc?' cl':''}" data-tg="${p.id}" aria-label="Plegar piso">&#9662;</button><span class="p-code">${esc(p.code)}</span><input class="ci" data-piso="${p.id}" data-f="name" value="${esc(p.name)}" aria-label="Nombre del piso"${ro}><span class="meta">${blocks.length} sect. · ${pAmb} amb. · ${pAct} act.</span>${canWrite?`<button class="ib" data-addsec="${p.id}">+ Sector</button><button class="ab" data-pisomenu="${p.id}" aria-label="Opciones del piso" title="Opciones del piso">&#8943;</button>`:''}</div></td><td colspan="${6+nd}"></td></tr>`});
    if(pc)continue;
    if(!blocks.length)rows.push({k:'pe:'+p.id,h:`<tr><td colspan="${11+nd}"><div class="empty" style="padding:18px 16px;text-align:left">Este piso aún no tiene sectores. ${canWrite?`<button class="ib" data-addsec="${p.id}">+ Agregar sector</button>`:''}</div></td></tr>`});
    for(const{s,list,nAmb,nAct}of blocks){
      const coll=U.collapsed.includes(s.id);
      rows.push({k:'s:'+s.id,h:`<tr class="sec" data-sec-row="${s.id}"><td class="secc" colspan="5"><div class="secin"><button class="tg${coll?' cl':''}" data-tg="${s.id}" aria-label="Plegar sector">&#9662;</button><span class="sc-code">${esc(s.code)}</span><input class="ci" data-sec="${s.id}" data-f="name" value="${esc(s.name)}" aria-label="Nombre del sector"${ro}><span class="meta">${nAmb} amb. · ${nAct} act.</span>${canWrite?`<button class="ib" data-addamb="${s.id}">+ Ambiente</button><button class="ab" data-secmenu="${s.id}" aria-label="Opciones del sector" title="Opciones del sector">&#8943;</button>`:''}</div></td><td colspan="${6+nd}"></td></tr>`});
      if(coll)continue;
      for(const{a,vis}of list){

        const rs=Math.max(1,vis.length);
        const ambCells=`<td class="s1 amb" rowspan="${rs}"><input class="ci" data-amb="${a.id}" data-f="code" value="${esc(a.code)}" aria-label="Ítem"${ro}></td><td class="s2 amb" rowspan="${rs}"><div class="ambbox"><textarea class="ci an" rows="1" data-amb="${a.id}" data-f="name" aria-label="Ambiente"${ro}>${esc(a.name)}</textarea>${canWrite?`<button class="ab" data-ambmenu="${a.id}" aria-label="Opciones del ambiente">&#8943;</button>`:''}</div>${a.hito?`<span class="hbadge" title="Hito ${esc(a.hitoLabel||'')}: ${fmtD(a.hito)}">&#9873; ${esc(a.hitoLabel||'Hito')} ${fmtS(a.hito)}</span>`:''}</td>`;
        if(!vis.length){shown++;rows.push({k:'a:'+a.id,h:`<tr class="ar first"><td class="s0"></td>${ambCells}<td class="s3"></td><td class="s4">${canWrite?`<button class="ib" data-addact="${a.id}" style="margin-left:6px;height:24px;font-size:12px">+ Actividad</button>`:''}</td><td colspan="${6+nd}"></td></tr>`});continue}
        vis.forEach((x,i)=>{
          shown++;const c=conOf(x.sc);const st=actStats(x);const ds=new Set(x.days||[]);
          const sd=snap?new Set(snap[x.id]||[]):null;const isNew=snap&&!(x.id in snap);
          const roA=x._rv?' readonly':canWrite&&(!pmM||pmM.has(x.sc))?'':' readonly';const pv=PPV&&PPV.get(x.id);const rvC=x._rv?revConflicts(x):null;const rvSel=REVSEL&&REVSEL.id===x.id;const rvP=rvSel&&REVSEL.k&&x._rv&&!x._rv.del?new Set((x.days||[]).map(d=>wshift(d,REVSEL.k))):null;
          let h=`<tr class="ar${i===0?' first':''}${x._del?' pdel':''}${pv?' prow':''}${pmM?(pmM.has(x.sc)?' pmown':' pmro'):''}${x._rv?' rvrow'+(x._rv.del?' rvdel':'')+(x._rv.isNew?' rvnew':'')+(rvSel?' rvsel':''):RV?' rvctx':''}" data-a="${x.id}" style="--c:${c.color};--qc:${lum(c.color)>.55?'#1b1b1b':'#fff'}"><td class="s0">${canWrite&&!roA?`<button class="rb" data-actmenu="${x.id}" aria-label="Opciones de la actividad">&#8942;</button>`:''}</td>`;
          if(i===0)h+=ambCells;
          h+=`<td class="s3 sc" style="--c:${c.color}"><select class="ci" data-a="${x.id}" data-f="sc" aria-label="Subcontratista"${canWrite&&!roA?'':' disabled'}>${conOpts.map(o=>`<option value="${o.id}"${o.id===x.sc?' selected':''}>${esc(o.name)}</option>`).join('')}</select></td>`;
          h+=`<td class="s4 act${(x.obs?1:0)+((pr.get(x.id)||isNew)?1:0)===2?' hb2':x.obs||pr.get(x.id)||isNew?' hb':''}">${x._rv?revCellHtml(x,rvSel):''}<input class="ci" data-a="${x.id}" data-f="name" value="${esc(x.name)}" placeholder="Nueva actividad" aria-label="Actividad"${roA}${pv?` title="Propuesta de ${esc(conOf(pv.sc).name)}"`:''}>${x.obs?`<span class="obadge${pr.get(x.id)?' sh':''}" data-obs="${x.id}" role="button" tabindex="0" title="${esc(x.obs)}">!</span>`:''}${typeof libBadge==='function'?libBadge(x):''}${pr.get(x.id)?`<span class="rbadge" data-goto-restr="${x.id}" title="${pr.get(x.id)} restricción(es) pendiente(s)">R${pr.get(x.id)>1?pr.get(x.id):''}</span>`:isNew?'<span class="nbadge" title="Actividad nueva respecto al plan congelado">NUEVA</span>':''}</td>`;
          h+=`<td class="cU"><input class="ci" data-a="${x.id}" data-f="und" value="${esc(x.und||'')}" aria-label="Unidad"${roA}></td><td class="cM"><input class="ci num" inputmode="decimal" data-a="${x.id}" data-f="metrado" value="${x.metrado??''}" aria-label="Metrado"${roA}>${x._rv&&x._rv.off&&(x._rv.off.metrado??null)!==(x.metrado??null)?`<span class="rvw" title="Metrado vigente">antes ${x._rv.off.metrado??'—'}</span>`:''}</td>`;
          const mq=hasM(x),ps=mq?progSum(x):0,sal=mq?r2(x.metrado-ps):null;const qmode=U.qmode==='metrado';
          h+=mq?`<td class="cS${sal<0?' neg':sal===0?' zero':''}" title="Programado ${fq(ps)} de ${fq(x.metrado)} ${esc(x.und||'')}${sal<0?' · excede en '+fq(-sal):''}">${sal<0?'−'+fq(-sal):fq(sal)}</td>`:'<td class="cS"></td>';
          h+=`<td class="ro cN">${st.n||''}</td><td class="ro cI">${fmtS(st.ini)}</td><td class="ro cF">${fmtS(st.fin)}</td>`;
          for(let k=0;k<nd;k++){const x2=days[k];const on=ds.has(x2.d);let cl='d';if(!isWork(x2.d))cl+=' hol';
            if(on){cl+=' on';if(k===0||!ds.has(days[k-1].d))cl+=' rs';if(k===nd-1||!ds.has(days[k+1].d))cl+=' re'}
            if(sd){if(on&&!sd.has(x2.d)&&!isNew)cl+=' add';if(!on&&sd.has(x2.d))cl+=' rem'}
            if(pv){if(!on&&pv.add.has(x2.d))cl+=' pa';if(on&&pv.del.has(x2.d))cl+=' pr'}
            if(x._rv){const od=x._rv.off?new Set(x._rv.off.days||[]):null;if(od&&!x._rv.del){if(!on&&od.has(x2.d))cl+=' rvo';if(on&&!od.has(x2.d))cl+=' rvn'}if(on&&rvC&&rvC.has(x2.d))cl+=' rvc';if(rvP&&rvP.has(x2.d))cl+=' rvp'}
            if(on&&libDay(x,x2.d))cl+=' lib';if(x2.i===0)cl+=' wk0';if(x2.d===today)cl+=' tdy';if(x2.d===U.day)cl+=' dsel';if(a.hito===x2.d)cl+=' hito';
            const rc=x2.d<=today?recOf(x2.d,x.id):null;const mk=rc?`<i class="dm ${ST[rc.status].c}">${ST[rc.status].i}</i>`:'';const mt=(rvC&&rvC.has(x2.d)?' · Mismo ambiente: '+esc(rvC.get(x2.d).join(', ')):'')+(rc?` · Campo: ${ST[rc.status].t}${rc.exec!=null?' '+fq(rc.exec)+' '+esc(rc.und||x.und||''):''}${rc.cnc?' ('+esc(rc.cnc)+')':''}`:'');
            if(qmode&&mq&&on){const v=(x.qty||{})[x2.d];h+=`<td class="${cl}" data-d="${x2.d}" title="${fmtD(x2.d)}: ${v!=null?fq(v)+' '+esc(x.und||''):'sin metrado asignado'}${mt}"><span class="qv">${v!=null?fq(v):'•'}</span>${mk}</td>`}
            else h+=`<td class="${cl}" data-d="${x2.d}"${cl.includes(' lib')?` title="${fmtD(x2.d)} · liberado: la actividad se terminó el ${fmtD(DONE.get(x.id))}"`:mt?` title="${fmtD(x2.d)}${mt}"`:''}>${mk}</td>`}
          rows.push({k:'x:'+x.id+(i===0?':'+a.id+':'+rs:''),h:h+'</tr>'});
        });
      }
    }
  }
  if(!shown&&filt)rows.push({k:'empty',h:`<tr><td colspan="${11+nd}"><div class="empty">Ninguna actividad coincide con los filtros. <button class="ib" data-clearf="1">Quitar filtros</button></div></td></tr>`});
  if(!S.pis.size)rows.push({k:'nopiso',h:`<tr><td colspan="${11+nd}"><div class="empty">Todavía no hay datos. ${isAdmin?'Carga <b>datos-iniciales.json</b> desde la pestaña <b>Equipo</b>, o crea un piso con el botón de abajo.':'Pide al administrador que cargue los datos del proyecto.'}</div></td></tr>`});
  if(canWrite&&!filt&&!U.sector&&!U.piso)rows.push({k:'addpiso',h:`<tr class="addrow"><td colspan="5" style="position:sticky;left:0"><div style="padding:0 8px"><button class="ib" data-addpiso="1">+ Nuevo piso</button></div></td><td colspan="${6+nd}"></td></tr>`});
  const keep=document.activeElement&&tbl.contains(document.activeElement)?focusKey(document.activeElement):null;
  const tb=tbl.tBodies[0];
  if(tb&&gridHead===head&&gridRows&&gridRows.length===rows.length&&gridRows.every((r,i)=>r.k===rows[i].k)&&tb.rows.length===rows.length){
    rows.forEach((r,i)=>{if(r.h!==gridRows[i].h){const t=document.createElement('tbody');t.innerHTML=r.h;tb.rows[i].replaceWith(t.firstElementChild)}});
  }else tbl.innerHTML=head+'<tbody>'+rows.map(r=>r.h).join('')+'</tbody>';
  gridHead=head;gridRows=rows;
  if(keep){const a=document.activeElement;if(!a||!tbl.contains(a))restoreFocus(tbl,keep)}
  markPeers();
}
function focusKey(el){return{a:el.dataset.a,amb:el.dataset.amb,sec:el.dataset.sec,piso:el.dataset.piso,f:el.dataset.f,s:el.selectionStart,e:el.selectionEnd}}
function restoreFocus(root,k){const sel=k.a?`[data-a="${k.a}"][data-f="${k.f}"]`:k.amb?`[data-amb="${k.amb}"][data-f="${k.f}"]`:k.piso?`[data-piso="${k.piso}"][data-f="${k.f}"]`:k.sec?`[data-sec="${k.sec}"][data-f="${k.f}"]`:null;
  const el=sel&&root.querySelector('.ci'+sel);if(el){el.focus({preventScroll:true});el.dataset.o=el.value;try{if(k.s!=null)el.setSelectionRange(k.s,k.e)}catch(e){}}}

/* --- módulo Plano diario (archivo aparte, se carga al abrir la pestaña) --- */
let planoP=null;
function renderMapaTab(main){if(window.renderMapaImpl){window.renderMapaImpl(main);return}
  if(!planoP){planoP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PLANO_SRC;s.onload=ok;s.onerror=()=>{planoP=null;ko()};document.head.appendChild(s)});
    planoP.then(()=>{if(U.tab==='mapa'){main.dataset.built='';render()}}).catch(()=>{if(U.tab==='mapa')main.innerHTML='<div class="empty">No se pudo cargar el módulo de planos. Revisa tu conexión y recarga la página.</div>'})}
  if(!main.dataset.built)main.innerHTML='<div class="loading"><b>Cargando planos…</b></div>'}

/* --- versiones del lookahead --- */
const LHI=new Map(),VERD=new Map();let lhiSub=null,lhiErr=null,autoTimer=null;U.ver='';U.verMode='ver';
const verRO=()=>!!(U.tab==='look'&&U.ver&&U.verMode==='ver');
function ensureVers(){if(lhiSub||!db)return;
  lhiSub=fcol('lhidx').onSnapshot(sn=>{LHI.clear();sn.docs.forEach(d=>LHI.set(d.id,{...d.data(),id:d.id}));lhiErr=null;if(U.ver&&!LHI.has(U.ver))U.ver='';if(ready&&U.tab==='look')requestRender()},
    err=>{lhiErr=err&&err.code||'error';if(ready&&U.tab==='look')requestRender()});
  if(!autoTimer)autoTimer=setInterval(autoVersion,60000);
  unsubs.push(()=>{if(lhiSub)lhiSub();lhiSub=null;LHI.clear();VERD.clear();U.ver='';clearInterval(autoTimer);autoTimer=null})}
// domingo 12:00 (hora de Lima, UTC-5) más reciente que ya pasó
function lastSundayNoon(now=NOW()){const L=5*3600e3;const t=new Date(now-L);const dow=t.getUTCDay();
  let base=Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()-dow,12)+L;if(base>now)base-=7*864e5;
  const iso=new Date(base-L).toISOString().slice(0,10);return{ts:base,iso}}
function snapPiso(pid){const secs={},ambs={},acts={};
  for(const s of S.sec.values())if(pisoOfSecObj(s)===pid)secs[s.id]=strip(s);
  for(const a of S.amb.values())if(secs[a.sectorId])ambs[a.id]=strip(a);
  for(const x of S.act.values())if(ambs[x.ambId]){const c=strip(x);delete c.obs;delete c.obsSug;acts[x.id]=c}
  return{secs,ambs,acts}}
async function saveVersion(id,label,kind){
  const pis=pisos();if(!pis.length)return false;const idx={label,kind,ts:NOW(),date:todayIso(),by:me.email,byName:me.name||me.email,week:curWeek(),pisos:{}};
  const docs=[];for(const p of pis){const sn=snapPiso(p.id);idx.pisos[p.id]={code:p.code,name:p.name,order:p.order||0,acts:Object.keys(sn.acts).length};
    docs.push([id+'__'+p.id,{verId:id,pisoId:p.id,piso:strip(p),json:JSON.stringify(sn)}])}
  if(kind==='auto'){const sd=lastSundayNoon();idx.date=sd.iso;idx.week=weekOf(addD(sd.iso,1))}
  for(let i=0;i<docs.length;i+=8){const b=db.batch();docs.slice(i,i+8).forEach(([k,v])=>b.set(fcol('lhver').doc(k),v));await b.commit()}
  await fcol('lhidx').doc(id).set(idx);return true}
let autoBusy=false;const AUTO_FROM='2026-10-04'; // primer domingo con guardado automático
async function autoVersion(){if(!ready||!canWrite||PM()||!db||autoBusy||lhiErr)return;const sd=lastSundayNoon();const id='auto-'+sd.iso;if(sd.iso<AUTO_FROM||LHI.has(id)||!S.pis.size)return;
  autoBusy=true;try{const d=await fcol('lhidx').doc(id).get();if(!d.exists){await saveVersion(id,`Automática · dom ${fmtD(sd.iso)} 12:00 (sem ${weekOf(addD(sd.iso,1))})`,'auto')}}catch(e){}finally{autoBusy=false}}
function saveVerMenu(btn){if(!canWrite||PM())return;const now=new Date(NOW());const def=`Sem ${curWeek()} · ${fmtD(todayIso())} ${hhmm(now.getTime())}`;
  openPop(btn,`<div class="ph">Guardar versión del lookahead</div><div class="ptx">Se guarda una copia de todos los pisos tal como están ahora. Podrás verla o compararla más adelante.</div>
   <div class="qrow" style="padding:0 10px 8px"><input id="vlab" value="${esc(def)}" maxlength="60" aria-label="Nombre de la versión" style="width:230px;text-align:left"></div><button data-do="save">Guardar versión</button>`,
   {save:async()=>{const lab=($('#vlab')?.value||def).trim()||def;const id='v-'+NOW().toString(36);toast('Guardando versión…');
     try{await saveVersion(id,lab,'manual');toast('Versión “'+lab+'” guardada')}catch(err){toast(err&&err.code==='permission-denied'?'No se pudo guardar: falta actualizar las reglas de Firestore (ver LEEME).':'No se pudo guardar la versión: '+(err.code||err.message))}}});
  const i=$('#vlab');if(i){i.focus();i.select();i.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=save]').click()}})}}
async function loadVer(id){if(VERD.has(id)||!db)return;const v=LHI.get(id);if(!v)return;const o={ready:false,pis:new Map(),sec:new Map(),amb:new Map(),act:new Map()};VERD.set(id,o);
  try{for(const pid of Object.keys(v.pisos||{})){const d=await fcol('lhver').doc(id+'__'+pid).get();if(!d.exists)continue;const x=d.data();const sn=JSON.parse(x.json||'{}');
      o.pis.set(pid,{...x.piso,id:pid});for(const[k,z]of Object.entries(sn.secs||{}))o.sec.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.ambs||{}))o.amb.set(k,{...z,id:k});for(const[k,z]of Object.entries(sn.acts||{}))o.act.set(k,{...z,id:k})}
    o.ready=true}catch(err){VERD.delete(id);toast('No se pudo abrir la versión: '+(err.code||err.message))}
  gridRows=null;requestRender()}
function swapVer(v){const o={pis:S.pis,sec:S.sec,amb:S.amb,act:S.act};S.pis=v.pis;S.sec=v.sec;S.amb=v.amb;S.act=v.act;return()=>{S.pis=o.pis;S.sec=o.sec;S.amb=o.amb;S.act=o.act}}
function verBases(v){const m=new Map();const byP={};for(const x of v.act.values()){const a=v.amb.get(x.ambId);const s=a&&v.sec.get(a.sectorId);if(!s)continue;(byP[s.pisoId]=byP[s.pisoId]||{})[x.id]=(x.days||[]).slice().sort()}
  for(const[pid,snap]of Object.entries(byP))m.set(pid,{snap});return m}
function verDiff(v){const vset=new Set(visPisos().map(p=>p.id));let chg=0,nw=0,del=0,sc=0;
  const inV=x=>{const a=v.amb.get(x.ambId);const s=a&&v.sec.get(a.sectorId);return s&&vset.has(s.pisoId)};
  for(const x of S.act.values()){if(!vset.has(pisoOfAmb(x.ambId)))continue;const o=v.act.get(x.id);if(!o){nw++;continue}if((o.days||[]).slice().sort().join()!==(x.days||[]).slice().sort().join())chg++;if(o.sc!==x.sc)sc++}
  for(const o of v.act.values())if(inV(o)&&!S.act.has(o.id))del++;return{chg,nw,del,sc}}
function renderVerBar(){const sel=$('#fver');if(!sel)return;
  const list=[...LHI.values()].sort((a,b)=>b.ts-a.ts);
  const opts='<option value="">Lookahead actual</option>'+list.map(v=>`<option value="${esc(v.id)}"${v.id===U.ver?' selected':''}>${v.kind==='auto'?'⏱ ':''}${esc(v.label)}</option>`).join('');
  if(sel.dataset.h!==opts){sel.innerHTML=opts;sel.dataset.h=opts}sel.value=U.ver||'';sel.hidden=!list.length&&!U.ver;
  $('#fvm').hidden=!U.ver;$$('#fvm button').forEach(b=>b.classList.toggle('on',b.dataset.v===U.verMode));
  $('#fvsave').hidden=!canWrite||!!U.ver||!!lhiErr;$('#fvdel').hidden=!(isAdmin&&U.ver);
  const ban=$('#verban');let h='';const v=U.ver&&LHI.get(U.ver);const vd=U.ver&&VERD.get(U.ver);
  if(lhiErr&&canWrite)h=`<div class="verban">Las versiones del lookahead no están disponibles: falta publicar las reglas nuevas de Firestore (paso 1 del LEEME de la actualización).</div>`;
  else if(v&&(!vd||!vd.ready))h=`<div class="verban">Cargando la versión “${esc(v.label)}”…</div>`;
  else if(v&&U.verMode==='ver')h=`<div class="verban">Estás viendo la versión <b>${esc(v.label)}</b> (${v.kind==='auto'?'guardada automáticamente':'guardada por '+esc(v.byName||v.by||'')} el ${fmtD(new Date(v.ts-5*3600e3).toISOString().slice(0,10))} ${hhmm(v.ts)}) · solo lectura. <button class="ib" id="vback">Volver al actual</button></div>`;
  else if(v&&U.verMode==='cmp'){const d=verDiff(vd);h=`<div class="verban cmp">Comparando el lookahead actual con <b>${esc(v.label)}</b> — días cambiados: <b>${d.chg}</b> · nuevas: <b>${d.nw}</b> (etiqueta NUEVA) · eliminadas: <b>${d.del}</b> · con otro subcontratista: <b>${d.sc}</b>. En la grilla: los días agregados llevan un punto y los días quitados aparecen rayados. <button class="ib" id="vback">Salir de la comparación</button></div>`}
  if(ban.dataset.h!==h){ban.innerHTML=h;ban.dataset.h=h;const bb=$('#vback');if(bb)bb.onclick=()=>{U.ver='';gridRows=null;requestRender()}}}

/* --- detalle del registro de campo desde el lookahead --- */
function lightbox(src){const lb=document.createElement('div');lb.className='lb';lb.innerHTML=`<div class="lbbar"><button class="ib" data-x="1">Cerrar</button></div><img src="${src}" alt="">`;lb.onclick=ev=>{if(ev.target.dataset.x||ev.target===lb)lb.remove()};document.body.appendChild(lb)}
function recPop(anchor,aid,d){const x=S.act.get(aid);const rc=recOf(d,aid);if(!x||!rc)return;const am=S.amb.get(x.ambId)||{};const st=ST[rc.status];const und=esc(rc.und||x.und||'');
  openPop(anchor,`<div class="ph" style="color:var(--${st.c==='ok'?'ok':st.c==='pa'?'warn':'bad'})">${st.i} ${st.t} · ${fmtD(d)}</div>
   <div class="ptx"><b>${esc(x.name||'')}</b><br>${esc((am.code||'')+' · '+(am.name||''))} · ${esc(conOf(x.sc).name)}
   ${rc.prog!=null||rc.exec!=null?`<br>Programado: <b>${rc.prog!=null?fq(rc.prog)+' '+und:'—'}</b> · Ejecutado: <b>${rc.exec!=null?fq(rc.exec)+' '+und:'—'}</b>`:''}
   ${rc.status!=='ok'?(rc.cnc?`<br>Causa: <b>${esc(rc.cnc)}</b>`:'<br><span style="color:var(--bad)">Sin causa registrada</span>')+(impOf(rc)?` · imputable a ${esc(conOf(x.sc).name)}`:' · <b>no imputable</b> al subcontratista'):''}
   ${rc.note?`<br>Comentario: ${esc(rc.note)}`:''}
   <br><span class="mu">Registró ${esc(rc.byName||rc.by||'')} · ${hhmm(rc.ts)}</span></div>
   ${(rc.photos||[]).length?`<div class="pph">${rc.photos.map(id=>{loadFoto(id);return`<img data-ph="${id}" src="${FOTO.get(id)||''}" alt="Foto">`}).join('')}</div>`:''}
   <button data-do="campo">${canDaily?'Abrir en Campo para editar':'Abrir en Campo'}</button>`,{campo:()=>goCampo(aid,d)});
  pop.querySelectorAll('img[data-ph]').forEach(i=>i.addEventListener('click',()=>{if(i.src&&i.src.startsWith('data:'))lightbox(i.src)}))}
function goCampo(aid,d){const x=S.act.get(aid);if(!x)return;const am=S.amb.get(x.ambId);U.tab='campo';CU.date=d===todayIso()?null:d;CU.sec=am?am.sectorId:'';CU.sc='';CU.show='all';openCards.add(aid);cExtraForm=false;saveCU();saveUI();render();
  setTimeout(()=>{const el=document.querySelector(`article[data-a="${aid}"]`);if(el){el.scrollIntoView({block:'center'});el.classList.add('flash')}},80)}

/* --- edición en grilla --- */
let paint=null,tap=null;
function wireGrid(tbl){
  tbl.addEventListener('focusin',e=>{const t=e.target;if(t.classList.contains('ci'))t.dataset.o=t.value;const a=t.dataset&&t.dataset.a||null;if(a!==myAct){myAct=a;sendPresence()}});
  tbl.addEventListener('focusout',e=>{const t=e.target;if(t.classList.contains('ci')){commitField(t);delete t.dataset.o;setTimeout(()=>{if(!tbl.contains(document.activeElement)&&myAct){myAct=null;sendPresence()}flushDeferred()},0)}});
  tbl.addEventListener('change',e=>{const t=e.target;if(t.tagName==='SELECT')commitField(t)});
  tbl.addEventListener('keydown',e=>{
    const t=e.target;if(!t.classList.contains('ci'))return;
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){if(verRO())return;e.preventDefault();const aid=t.dataset.a||firstActOfAmb(t.dataset.amb);commitField(t);if(aid)insertAct(aid);else if(t.dataset.amb)addAct(t.dataset.amb);return}
    if(e.key==='Escape'){if(t.dataset.o!=null)t.value=t.dataset.o;t.blur();return}
    if(t.tagName==='SELECT')return;
    const up=e.key==='ArrowUp',down=e.key==='ArrowDown'||(e.key==='Enter'&&!e.shiftKey);
    if(t.tagName==='TEXTAREA'&&(up||down)&&e.key!=='Enter')return;
    if(up||down||(e.key==='Enter'&&e.shiftKey)){e.preventDefault();commitField(t);t.dataset.o=t.value;moveFocus(t,up||(e.key==='Enter'&&e.shiftKey)?-1:1)}
  });
  tbl.addEventListener('click',e=>{
    const dh=e.target.closest('th[data-dh]');if(dh){U.day=U.day===dh.dataset.dh?'':dh.dataset.dh;U.wkF=0;requestRender();return}
    const wh=e.target.closest('th[data-wkh]');if(wh){const w=+wh.dataset.wkh;U.wkF=U.wkF===w?0:w;U.day='';requestRender();return}
    const b=e.target.closest('button,[data-goto-restr],[data-obs]');if(!b)return;
    if(b.dataset.obs){obsMenu(b,b.dataset.obs);return}
    if(b.dataset.tg){const id=b.dataset.tg;U.collapsed=U.collapsed.includes(id)?U.collapsed.filter(x=>x!==id):[...U.collapsed,id];saveUI();requestRender()}
    else if(b.dataset.actmenu)actMenu(b,b.dataset.actmenu);
    else if(b.dataset.ambmenu)ambMenu(b,b.dataset.ambmenu);
    else if(b.dataset.addamb)addAmbMenu(b,b.dataset.addamb,null);
    else if(b.dataset.addact)addAct(b.dataset.addact);
    else if(b.dataset.addsec)addSector(b.dataset.addsec);
    else if(b.dataset.addpiso)addPiso();
    else if(b.dataset.pisomenu)pisoMenu(b,b.dataset.pisomenu);
    else if(b.dataset.secmenu)secMenu(b,b.dataset.secmenu);
    else if(b.dataset.clearf){U.q='';U.sc='';U.acts=[];U.onlyWin=false;U.onlyRestr=false;U.onlyObs=false;U.day='';U.wkF=0;$('#fq').value='';saveUI();requestRender()}
    else if(b.dataset.gotoRestr){U.tab='restr';U.rfilter='pend';U.rAct=b.dataset.gotoRestr;render()}
  });
  tbl.addEventListener('paste',e=>{
    const t=e.target;if(!canWrite||verRO()||!t.classList||!t.classList.contains('ci'))return;
    const txt=(e.clipboardData||window.clipboardData)?.getData('text')||'';if(!/\r?\n/.test(txt.trim()))return;
    const lines=txt.replace(/\r/g,'').split('\n').map(l=>l.replace(/\s+$/,'')).filter(l=>l.trim());if(lines.length<2&&!lines[0].includes('\t'))return;
    if(t.dataset.a&&t.dataset.f==='name'){e.preventDefault();pasteActs(t.dataset.a,lines)}
    else if(t.dataset.amb&&t.dataset.f==='name'){e.preventDefault();pasteAmbs(t.dataset.amb,lines)}
  });
  tbl.addEventListener('pointerdown',e=>{
    const dm=e.target.closest('.dm');if(dm){e.preventDefault();e.stopPropagation();const td0=dm.closest('td.d');recPop(dm,td0.parentElement.dataset.a,td0.dataset.d);return}
    const td=e.target.closest('td.d');if(!td||!canWrite)return;if(verRO()){if(!tap)toast('Estás viendo una versión guardada (solo lectura). Elige “Lookahead actual” para editar.');return}
    if(U.qmode==='metrado'){const x=S.act.get(td.parentElement.dataset.a);if(x&&hasM(x)){closeQEditor(false);if(e.pointerType==='touch'){qtap={td,x:e.clientX,y:e.clientY};return}if(e.button!==0)return;e.preventDefault();if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();qsel={a:x.id,start:td.dataset.d,cells:new Map([[td.dataset.d,td]])};td.classList.add('sel');return}}
    if(e.pointerType==='touch'){tap={td,x:e.clientX,y:e.clientY};return}
    if(e.button!==0)return;e.preventDefault();if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
    const a=S.act.get(td.parentElement.dataset.a);if(!a)return;
    paint={on:!(a.days||[]).includes(td.dataset.d),cells:new Map()};paintCell(td);
  });
  tbl.addEventListener('pointerup',e=>{if(qtap){const td=e.target.closest('td.d');if(td===qtap.td&&Math.hypot(e.clientX-qtap.x,e.clientY-qtap.y)<10)openQEditor(td);qtap=null;return}if(!tap)return;const td=e.target.closest('td.d');if(td===tap.td&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<10){const a=S.act.get(td.parentElement.dataset.a);if(a){paint={on:!(a.days||[]).includes(td.dataset.d),cells:new Map()};paintCell(td);endPaint()}}tap=null});
}
window.addEventListener('pointermove',e=>{if(qsel){const el=document.elementFromPoint(e.clientX,e.clientY);const td=el&&el.closest&&el.closest('#grid td.d');if(td&&td.parentElement.dataset.a===qsel.a&&!qsel.cells.has(td.dataset.d)){const tr=td.parentElement;const all=[...tr.querySelectorAll('td.d')];const i0=all.findIndex(t=>t.dataset.d===qsel.start),i1=all.indexOf(td);qsel.cells.forEach(t=>t.classList.remove('sel'));qsel.cells=new Map();all.slice(Math.min(i0,i1),Math.max(i0,i1)+1).forEach(t=>{t.classList.add('sel');qsel.cells.set(t.dataset.d,t)})}return}
  if(!paint)return;const el=document.elementFromPoint(e.clientX,e.clientY);const td=el&&el.closest&&el.closest('#grid td.d');if(td)paintCell(td)});
window.addEventListener('pointerup',()=>{if(paint)endPaint();if(qsel)endQSel()});
let qsel=null,qtap=null,qed=null;
function endQSel(){const q=qsel;qsel=null;const cells=[...q.cells.values()];if(cells.length===1){cells[0].classList.remove('sel');openQEditor(cells[0]);return}
  const x=S.act.get(q.a);if(!x){requestRender();return}const ds=[...q.cells.keys()].sort();const inRange=ds.reduce((s,d)=>s+(+(x.qty||{})[d]||0),0);const avail=r2(x.metrado-(progSum(x)-inRange));const und=esc(x.und||'');
  const anchor=cells[cells.length-1];
  openPop(anchor,`<div class="ph">${ds.length} días · ${fmtD(ds[0])} – ${fmtD(ds[ds.length-1])}</div>
   <button data-do="dist"${avail>0?'':' disabled'}>Repartir el saldo (${fq(Math.max(0,avail))} ${und}) en partes iguales<kbd>${avail>0?fq(Math.floor(avail/ds.length*100)/100):'—'}/día</kbd></button>
   <div class="ph">Misma cantidad cada día</div><div class="qrow"><input id="qper" inputmode="decimal" placeholder="${und||'cant.'}" aria-label="Cantidad por día"><button data-do="per">Aplicar</button></div>
   <hr><button data-do="mark">Solo marcar días (sin cantidad)</button><button data-do="clr" class="danger">Borrar estos días</button>`,
  {dist:()=>distribute(q.a,ds,null),per:()=>{const v=parseNum($('#qper').value);if(v==null||v<=0){toast('Escribe una cantidad mayor que cero.');requestRender();return}distribute(q.a,ds,v)},
   mark:()=>{const y=S.act.get(q.a);const days=new Set(y.days||[]);ds.forEach(d=>days.add(d));apply([op('acts',y.id,{...y,days:[...days].sort()})])},
   clr:()=>{let y=S.act.get(q.a);ds.forEach(d=>{y=withQty(y,d,null)});apply([op('acts',y.id,y)],'Días borrados')}});
  const qp=$('#qper');if(qp){qp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();pop.querySelector('[data-do=per]').click()}});setTimeout(()=>qp.focus(),0)}
  requestRender()}
function parseNum(t){t=String(t??'').trim().replace(/\s/g,'');if(t==='')return null;if(/^\d{1,3}(\.\d{3})+,\d+$/.test(t))t=t.replace(/\./g,'').replace(',','.');else t=t.replace(',','.');const v=Number(t);return isFinite(v)?v:NaN}
function distribute(aid,ds,per){let x=S.act.get(aid);if(!x)return;const und=x.und||'';ds.forEach(d=>{x=withQty(x,d,null)});let avail=r2(x.metrado-progSum(x));
  if(avail<=0){toast(`Ya está programado todo el metrado (${fq(S.act.get(aid).metrado)} ${und}).`);requestRender();return}
  let vals;if(per==null){const each=Math.floor(avail/ds.length*100)/100;vals=ds.map((d,i)=>i===ds.length-1?r2(avail-each*(ds.length-1)):each)}
  else{vals=[];let left=avail;for(const d of ds){const v=Math.min(per,left);vals.push(r2(v));left=r2(left-v)}}
  let cut=per!=null&&per*ds.length>avail+1e-9;ds.forEach((d,i)=>{x=withQty(x,d,vals[i]>0?vals[i]:null)});
  apply([op('acts',aid,x)],cut?`Se programó hasta completar el saldo (${fq(avail)} ${und}); los últimos días quedaron sin cantidad.`:`Programado ${fq(vals.reduce((s,v)=>s+v,0))} ${und} en ${vals.filter(v=>v>0).length} días`)}
function openQEditor(td){if(!td||!canWrite)return;const aid=td.parentElement.dataset.a,d=td.dataset.d;const x=S.act.get(aid);if(!x||!hasM(x))return;
  closeQEditor(true);const cur=(x.qty||{})[d];const others=r2(progSum(x)-(+cur||0));const max=r2(x.metrado-others);
  const r=td.getBoundingClientRect();const box=document.createElement('div');box.className='qed';const w=Math.max(r.width+30,92);
  box.style.left=Math.min(Math.max(4,r.left-(w-r.width)/2),innerWidth-w-4)+'px';box.style.top=(r.top-2)+'px';box.style.width=w+'px';
  box.innerHTML=`<input class="ci" inputmode="decimal" value="${cur!=null?cur:''}" aria-label="Metrado programado el ${fmtD(d)}"><div class="qhint">${DL[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)} · máx ${fq(Math.max(0,max))} ${esc(x.und||'')}</div>`;
  document.body.appendChild(box);const inp=box.querySelector('input');inp.dataset.o=inp.value;inp.focus();inp.select();
  qed={box,inp,aid,d};myAct=aid;sendPresence();
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeQEditor(false);return}
    const mv=e.key==='Enter'||e.key==='Tab'?(e.shiftKey?-1:1):e.key==='ArrowRight'&&inp.selectionStart===inp.value.length?1:e.key==='ArrowLeft'&&inp.selectionStart===0?-1:0;
    const vr=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
    if(mv||vr){e.preventDefault();const next=neighborCell(aid,d,mv,vr);closeQEditor(true);if(next)requestAnimationFrame(()=>requestAnimationFrame(()=>{const t=$(`#grid tr[data-a="${CSS.escape(next.a)}"] td.d[data-d="${next.d}"]`);if(t){t.scrollIntoView({block:'nearest',inline:'nearest'});openQEditor(t)}}))}});
  inp.addEventListener('blur',()=>setTimeout(()=>{if(qed&&qed.inp===inp)closeQEditor(true)},0));
}
function neighborCell(aid,d,dx,dy){const days=winDays().map(x=>x.d);if(dx){const i=days.indexOf(d)+dx;return i>=0&&i<days.length?{a:aid,d:days[i]}:null}
  const rows=$$('#grid tr.ar[data-a]').map(t=>t.dataset.a).filter(a=>{const x=S.act.get(a);return x&&hasM(x)});const i=rows.indexOf(aid)+dy;return i>=0&&i<rows.length?{a:rows[i],d}:null}
function closeQEditor(save){if(!qed)return;const q=qed;qed=null;const raw=q.inp.value;q.box.remove();if(myAct===q.aid){myAct=null;sendPresence()}if(save&&raw!==q.inp.dataset.o)commitQ(q.aid,q.d,raw);else flushDeferred()}
function commitQ(aid,d,raw){const x=S.act.get(aid);if(!x)return;let v=parseNum(raw);const und=x.und||'';
  if(Number.isNaN(v)){toast('Escribe solo números (por ejemplo 30 o 12.5).');return}
  if(v!=null&&v<0){toast('La cantidad no puede ser negativa.');return}
  const cur=+(x.qty||{})[d]||0;const max=r2(x.metrado-(progSum(x)-cur));
  if(v!=null&&v>max+1e-9){if(max<=0){toast(`Ya está programado todo el metrado (${fq(x.metrado)} ${und}). Aumenta el metrado total o reduce otro día.`);requestRender();return}
    toast(`Se ajustó a ${fq(max)} ${und}: es el saldo disponible de ${fq(x.metrado)} ${und}.`);v=max}
  const nx=withQty(x,d,v);if(canon(nx)===canon(x)){requestRender();return}apply([op('acts',aid,nx)])}
function paintCell(td){const a=td.parentElement.dataset.a;if(!a)return;const k=a+'|'+td.dataset.d;if(paint.cells.has(k))return;paint.cells.set(k,{a,d:td.dataset.d});td.classList.toggle('on',paint.on);td.classList.add('rs','re')}
function endPaint(){
  const p=paint;paint=null;const by={};for(const{a,d}of p.cells.values())(by[a]=by[a]||[]).push(d);
  const ops=[];for(const[a,ds]of Object.entries(by)){const x=S.act.get(a);if(!x)continue;const set=new Set(x.days||[]);ds.forEach(d=>p.on?set.add(d):set.delete(d));
    const nd=[...set].sort();if(nd.join()!==(x.days||[]).slice().sort().join()){const q={...(x.qty||{})};if(!p.on)ds.forEach(d=>delete q[d]);const nx={...x,days:nd};if(x.qty)nx.qty=q;ops.push(op('acts',a,nx))}}
  apply(ops);if(!ops.length)requestRender();deferred=false;
}
function obsMenu(btn,aid){if(verRO())return;const x=S.act.get(aid);if(!x||!x.obs)return;
  const sug=(x.obsSug||[]).filter(id=>S.con.has(id)&&id!==x.sc);
  openPop(btn,`<div class="ph">Observación al importar</div><div class="ptx">${esc(x.obs)}</div>${canWrite?`${sug.map(id=>`<button data-do="sc" data-sc="${id}">Cambiar a ${esc(conOf(id).name)}</button>`).join('')}<button data-do="ok">Está bien así (quitar aviso)</button>`:''}`,{
    sc:ds=>{const y=S.act.get(aid);if(!y)return;const n={...y,sc:ds.sc};delete n.obs;delete n.obsSug;apply([op('acts',aid,n)],'Subcontratista cambiado a '+conOf(ds.sc).name)},
    ok:()=>{const y=S.act.get(aid);if(!y)return;const n={...y};delete n.obs;delete n.obsSug;apply([op('acts',aid,n)],'Observación resuelta')}})}
function commitField(t){
  if(verRO())return;if(!canWrite||t.dataset.o===undefined&&t.tagName!=='SELECT')return;
  const f=t.dataset.f;let v=t.value;if(t.tagName!=='SELECT'&&v===t.dataset.o)return;
  if(t.dataset.a){const x=S.act.get(t.dataset.a);if(!x)return;
    if(f==='metrado'){v=parseNum(v);if(Number.isNaN(v)||(v!=null&&v<0)){t.value=t.dataset.o;toast('El metrado debe ser un número positivo.');return}
      const ps=progSum(x);if(v!=null&&ps>v+1e-9)toast(`Ojo: ya hay ${fq(ps)} ${x.und||''} programados y el nuevo total es ${fq(v)}. El saldo queda en rojo (−${fq(ps-v)}); reduce algunos días.`);
      else if((v==null||v===0)&&ps>0)toast('La actividad quedó sin metrado total: sus cantidades por día se conservan, pero se programa por días hasta que vuelvas a poner un total.')}
    if(f==='und')v=v.trim().toUpperCase();
    if(x[f]===v)return;const nx={...x,[f]:v};if((f==='sc'||f==='name')&&nx.obs){delete nx.obs;delete nx.obsSug}apply([op('acts',x.id,nx)]);}
  else if(t.dataset.amb){const x=S.amb.get(t.dataset.amb);if(!x)return;v=f==='code'?v.trim():v.replace(/\s+/g,' ').trim();if(x[f]===v)return;apply([op('ambientes',x.id,{...x,[f]:v})])}
  else if(t.dataset.piso){const x=S.pis.get(t.dataset.piso);if(!x)return;v=v.trim();if(t.dataset.codeedit){delete t.dataset.codeedit;const m=v.split(/\s*·\s*/);if(m.length>=2){apply([op('pisos',x.id,{...x,code:m[0].trim(),name:m.slice(1).join(' · ').trim()})]);t.dataset.o=t.value;return}}if(x[f]===v)return;apply([op('pisos',x.id,{...x,[f]:v})])}
  else if(t.dataset.sec){const x=S.sec.get(t.dataset.sec);if(!x)return;v=v.trim();if(t.dataset.codeedit){delete t.dataset.codeedit;const m=v.split(/\s*·\s*/);if(m.length>=2){apply([op('sectors',x.id,{...x,code:m[0].trim(),name:m.slice(1).join(' · ').trim()})]);t.dataset.o=t.value;return}}if(x[f]===v)return;apply([op('sectors',x.id,{...x,[f]:v})])}
  t.dataset.o=t.value;
}
function moveFocus(t,dir){const f=t.dataset.f;const key=t.dataset.a?'a':t.dataset.amb?'amb':t.dataset.piso?'piso':'sec';
  const list=$$(`#grid .ci[data-${key}][data-f="${f}"]`);const i=list.indexOf(t);const n=list[i+dir];if(n){n.focus();if(n.select&&n.tagName==='INPUT')n.select()}}
function firstActOfAmb(ambId){if(!ambId)return null;const l=[...S.act.values()].filter(x=>x.ambId===ambId).sort(byOrder);return l.length?l[l.length-1].id:null}
function siblings(col,field,val){return[...S[COLS[col]].values()].filter(x=>x[field]===val).sort(byOrder)}
function orderAfter(list,item){const i=list.findIndex(x=>x.id===item.id);const n=list[i+1];return n?(item.order+n.order)/2:item.order+10}
function focusLater(sel){requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=$(sel);if(el){el.focus();el.scrollIntoView({block:'nearest',inline:'nearest'})}}))}
function insertAct(aid,copy){const x=S.act.get(aid);if(!x)return;const sib=siblings('acts','ambId',x.ambId);const id=uid('act');
  const n=copy?{...clone(x),id,order:orderAfter(sib,x),obs:undefined,obsSug:undefined}:{id,ambId:x.ambId,sc:x.sc,name:'',und:'',metrado:null,days:[],order:orderAfter(sib,x)};
  apply([op('acts',id,n)],copy?'Actividad duplicada':null);focusLater(`#grid .ci[data-a="${id}"][data-f="name"]`)}
function addAct(ambId){const sib=siblings('acts','ambId',ambId);const id=uid('act');const last=sib[sib.length-1];
  apply([op('acts',id,{id,ambId,sc:PM()&&!(last&&myScsI().includes(last.sc))?myScsI()[0]:last?last.sc:([...S.con.keys()][0]||''),name:'',und:'',metrado:null,days:[],order:last?last.order+10:10})]);focusLater(`#grid .ci[data-a="${id}"][data-f="name"]`)}
function moveItem(col,field,x,dir){const sib=siblings(col,field,x[field]);const i=sib.findIndex(s=>s.id===x.id);const j=i+dir;if(j<0||j>=sib.length)return;const y=sib[j];
  let oa=y.order,ob=x.order;if(oa===ob){ob=oa+dir}apply([op(col,x.id,{...x,order:oa}),op(col,y.id,{...y,order:ob})])}
function actMenu(btn,aid){const x=S.act.get(aid);if(!x)return;
  openPop(btn,`<div class="ph">Actividad</div><button data-do="ins">Insertar actividad debajo<kbd>Ctrl+Enter</kbd></button><button data-do="dup">Duplicar con sus días</button><button data-do="up">Subir</button><button data-do="dn">Bajar</button><hr>${hasM(x)&&(x.days||[]).length?`<button data-do="rep">Repartir el metrado en los días marcados<kbd>${(x.days||[]).length} días</kbd></button>`:''}${doneOf(x)?'<button data-do="reo">Reabrir actividad (quitar “terminada”)</button>':''}<button data-do="clr">Borrar días programados</button><button data-do="rst">Agregar restricción</button>${canLibAsk(x)?`<button data-do="lib">◆ ${libOf(aid)&&!libDone(libOf(aid).st)?'Ver liberación':'Solicitar liberación…'}${libRuleOf(x)?'':' <kbd>no está en la matriz</kbd>'}</button>`:''}${canLibMatrix()?'<button data-do="libx">◆ Excepción de liberación…</button>':''}<hr><button data-do="del" class="danger">Eliminar actividad</button>`,
  {reo:()=>reopenDone(aid),ins:()=>insertAct(aid),dup:()=>insertAct(aid,true),up:()=>moveItem('acts','ambId',x,-1),dn:()=>moveItem('acts','ambId',x,1),
   clr:()=>apply([op('acts',aid,{...x,days:[],qty:{}})],'Días borrados'),rst:()=>newRestr(aid),lib:()=>setTimeout(()=>libAsk(aid),0),libx:()=>setTimeout(()=>libExMenu(btn,aid),0),rep:()=>distribute(aid,(x.days||[]).slice().sort(),null),
   del:()=>apply([arc('acts',aid)],PM()?`Pedido de quitar “${x.name||'sin nombre'}” (queda en tu propuesta)`:`Actividad “${x.name||'sin nombre'}” eliminada (queda en la Papelera de Configuración)`)})}
function ambMenu(btn,ambId){const a=S.amb.get(ambId);if(!a)return;
  openPop(btn,`<div class="ph">Ambiente ${esc(a.code)}</div><button data-do="act">+ Actividad al final</button><button data-do="new">Nuevo ambiente debajo…</button><button data-do="dup">Duplicar ambiente con actividades</button><button data-do="dup0">Duplicar ambiente sin días</button><hr><div class="ph">Hito del ambiente</div><div class="qrow"><input id="hlab" value="${esc(a.hitoLabel||'FC')}" maxlength="12" aria-label="Nombre corto del hito" style="width:70px;text-align:left"><input type="date" id="hdate" value="${esc(a.hito||'')}" aria-label="Fecha del hito"><button data-do="hito">Guardar</button></div>${a.hito?'<button data-do="hclr">Quitar hito</button>':''}<hr><button data-do="up">Subir</button><button data-do="dn">Bajar</button><button data-do="mv">Mover a otro sector…</button><hr><button data-do="del" class="danger">Eliminar ambiente y sus actividades</button>`,
  {act:()=>addAct(ambId),new:()=>addAmbMenu(btn,a.sectorId,a),dup:()=>dupAmb(a),dup0:()=>dupAmb(a,true),
   hito:()=>{const v=$('#hdate').value;const l=($('#hlab').value||'Hito').trim().toUpperCase();if(!v){toast('Elige una fecha.');return}apply([op('ambientes',a.id,{...a,hito:v,hitoLabel:l})],`Hito ${l} de ${a.code}: ${fmtD(v)}`)},
   hclr:()=>{const n={...a};delete n.hito;delete n.hitoLabel;apply([op('ambientes',a.id,n)],'Hito quitado')},up:()=>moveItem('ambientes','sectorId',a,-1),dn:()=>moveItem('ambientes','sectorId',a,1),mv:()=>setTimeout(()=>moveAmbDialog(btn,a),0),
   del:()=>{const ops=siblings('acts','ambId',ambId).map(x=>arc('acts',x.id));ops.push(arc('ambientes',ambId));apply(ops,`Ambiente ${a.code} eliminado`)}})}
/* mover un ambiente (con sus actividades, días y registros) a otro sector del mismo piso */
function moveAmbDialog(btn,a){const pid=pisoOfAmb(a.id);const secs=[...S.sec.values()].filter(x=>x.id!==a.sectorId&&pisoOfSecObj(x)===pid).sort((x,y)=>(x.order||0)-(y.order||0));
  if(!secs.length){toast('No hay otro sector en este piso. Crea primero el sector de destino.');return}
  openPop(btn,`<div class="ph">Mover ${esc(a.code)} · ${esc(a.name)}</div><div class="ptx">Pasa el ambiente con todas sus actividades, días y registros a otro sector de este mismo piso. Va al final del sector elegido.</div>
    <div class="qrow"><select id="mvsec" aria-label="Sector de destino">${secs.map(x=>`<option value="${x.id}">${esc(x.code)} · ${esc(x.name)}</option>`).join('')}</select><button data-do="go">Mover</button></div>
    <label class="chk" style="padding:4px 10px"><input type="checkbox" id="mvcode" checked> Cambiar el ítem al código del nuevo sector</label>`,
  {go:()=>{const sid=($('#mvsec')||{}).value;const sec=S.sec.get(sid);const cur=S.amb.get(a.id);if(!sec||!cur)return;const rn=!!($('#mvcode')||{}).checked;
    const sib=siblings('ambientes','sectorId',sid);const order=sib.length?Math.max(...sib.map(x=>x.order||0))+10:10;const code=rn?nextCode(sid):cur.code;
    if(U.collapsed.includes(sid)){U.collapsed=U.collapsed.filter(x=>x!==sid);saveUI()}
    apply([op('ambientes',a.id,{...cur,sectorId:sid,order,code})],`Ambiente ${cur.code} movido a ${sec.code} · ${sec.name}${rn&&code!==cur.code?' (ahora '+code+')':''}`)}})}
function nextCode(secId){const s=S.sec.get(secId);const n=siblings('ambientes','sectorId',secId).length+1;return(s?s.code:'S')+'-'+n}
function addAmbMenu(btn,secId,after){const tpls=P().templates||[];
  openPop(btn,`<div class="ph">Nuevo ambiente</div><button data-do="blank">Vacío (una actividad)</button>${tpls.length?'<hr><div class="ph">Desde plantilla</div>':''}${tpls.map((t,i)=>`<button data-do="tpl" data-i="${i}">${esc(t.name)}<kbd>${t.acts.length} act.</kbd></button>`).join('')}`,
  {blank:()=>createAmb(secId,after,null),tpl:d=>createAmb(secId,after,tpls[+d.i])})}
function createAmb(secId,after,tpl){const sib=siblings('ambientes','sectorId',secId);const order=after?orderAfter(sib,after):(sib.length?sib[sib.length-1].order+10:10);
  const id=uid('amb');const ops=[op('ambientes',id,{id,sectorId:secId,code:nextCode(secId),name:tpl?tpl.name.toUpperCase():'NUEVO AMBIENTE',order})];
  const lines=(tpl?tpl.acts:[{sc:[...S.con.keys()][0]||'',name:''}]).map(a=>Array.isArray(a)?{sc:a[0],name:a[1]}:a);let firstAct=null;
  lines.forEach(({sc,name},i)=>{const aid=uid('act')+i;if(!firstAct)firstAct=aid;ops.push(op('acts',aid,{id:aid,ambId:id,sc:S.con.has(sc)?sc:([...S.con.keys()][0]||''),name,und:'',metrado:null,days:[],order:(i+1)*10}))});
  if(U.collapsed.includes(secId)){U.collapsed=U.collapsed.filter(x=>x!==secId);saveUI()}
  apply(ops,tpl?`Ambiente creado con ${lines.length} actividades`:'Ambiente creado');focusLater(`#grid .ci[data-amb="${id}"][data-f="name"]`)}
function dupAmb(a,noDays){const sib=siblings('ambientes','sectorId',a.sectorId);const id=uid('amb');const ops=[op('ambientes',id,{...clone(a),id,code:nextCode(a.sectorId),order:orderAfter(sib,a)})];
  siblings('acts','ambId',a.id).forEach((x,i)=>{const aid=uid('act')+i;ops.push(op('acts',aid,noDays?{...clone(x),id:aid,ambId:id,days:[],qty:{}}:{...clone(x),id:aid,ambId:id}))});apply(ops,noDays?'Ambiente duplicado sin días':'Ambiente duplicado')}
function addSector(pid){pid=pid||U.piso||firstPiso();if(!pid){toast('Primero crea un piso.');return}const secs=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid).sort(byOrder);const last=secs[secs.length-1];const id=uid('sec');const n=secs.length+1;
  if(U.collapsed.includes(pid)){U.collapsed=U.collapsed.filter(x=>x!==pid);saveUI()}
  apply([op('sectors',id,{id,pisoId:pid,code:'S'+n,name:'Sector '+n,order:last?last.order+10:10})],'Sector creado');focusLater(`#grid .ci[data-sec="${id}"]`)}
function conByName(n){n=String(n||'').trim().toUpperCase();if(!n)return null;for(const c of S.con.values())if(c.name.toUpperCase()===n)return c.id;return null}
function pasteActs(aid,lines){const x=S.act.get(aid);if(!x)return;const sib=siblings('acts','ambId',x.ambId);const i=sib.findIndex(a=>a.id===x.id);const nxt=sib[i+1];
  const parse=l=>{const c=l.split('\t').map(v=>v.trim());if(c.length>=2){const sc=conByName(c[0]);if(sc)return{sc,name:c.slice(1).join(' ').trim()};}return{sc:null,name:c.filter(Boolean).join(' ')}};
  const items=lines.map(parse);const ops=[];const f=items[0];ops.push(op('acts',x.id,{...x,name:f.name,sc:f.sc||x.sc}));
  const step=nxt?(nxt.order-x.order)/(items.length+1):10;let lastSc=f.sc||x.sc;
  items.slice(1).forEach((it,k)=>{const id=uid('act')+k;lastSc=it.sc||lastSc;ops.push(op('acts',id,{id,ambId:x.ambId,sc:lastSc,name:it.name,und:'',metrado:null,days:[],order:x.order+step*(k+1)}))});
  apply(ops,`${items.length} actividades pegadas`)}
function pasteAmbs(ambId,lines){const a=S.amb.get(ambId);if(!a)return;const sib=siblings('ambientes','sectorId',a.sectorId);const i=sib.findIndex(z=>z.id===a.id);const nxt=sib[i+1];
  const s=S.sec.get(a.sectorId);let n=sib.length;const parse=l=>{const c=l.split('\t').map(v=>v.trim()).filter(Boolean);return c.length>=2?{code:c[0],name:c.slice(1).join(' ')}:{code:null,name:c.join(' ')}};
  const items=lines.map(parse);const ops=[op('ambientes',a.id,{...a,name:items[0].name.toUpperCase(),code:items[0].code||a.code})];
  const step=nxt?(nxt.order-a.order)/(items.length+1):10;const firstSc=(siblings('acts','ambId',a.id)[0]||{}).sc||([...S.con.keys()][0]||'');
  items.slice(1).forEach((it,k)=>{n++;const id=uid('amb')+k;ops.push(op('ambientes',id,{id,sectorId:a.sectorId,code:it.code||((s?s.code:'S')+'-'+n),name:it.name.toUpperCase(),order:a.order+step*(k+1)}));
    const aid=uid('act')+k;ops.push(op('acts',aid,{id:aid,ambId:id,sc:firstSc,name:'',und:'',metrado:null,days:[],order:10}))});
  apply(ops,`${items.length} ambientes creados`)}
function copySectorOps(sec,dstPid,order,ops,withDays){const nid=uid('sec')+ops.length;ops.push(op('sectors',nid,{id:nid,pisoId:dstPid,code:sec.code,name:sec.name,order}));let na=0,nx=0;
  for(const a of siblings('ambientes','sectorId',sec.id)){const aid=uid('amb')+ops.length;ops.push(op('ambientes',aid,{id:aid,sectorId:nid,code:a.code,name:a.name,order:a.order}));na++;
    for(const x of siblings('acts','ambId',a.id)){const xid=uid('act')+ops.length;ops.push(op('acts',xid,{id:xid,ambId:aid,sc:x.sc,name:x.name,und:x.und||'',metrado:x.metrado??null,days:withDays?(x.days||[]).slice():[],order:x.order}));nx++}}
  return{nid,na,nx}}
function copyPisoStructure(srcPid,dstPid){const src=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===srcPid).sort(byOrder);const dst=[...S.sec.values()].filter(s=>pisoOfSecObj(s)===dstPid);
  let base=dst.reduce((m,s)=>Math.max(m,s.order||0),0);const ops=[];let na=0,nx=0;
  src.forEach(s=>{base+=10;const r=copySectorOps(s,dstPid,base,ops,false);na+=r.na;nx+=r.nx});
  if(!ops.length){toast('Ese piso no tiene sectores para copiar.');return}
  if(U.collapsed.includes(dstPid)){U.collapsed=U.collapsed.filter(x=>x!==dstPid);saveUI()}
  apply(ops,`Copiados ${src.length} sectores, ${na} ambientes y ${nx} actividades (sin días)`)}
function pisoMenu(btn,pid){const p=S.pis.get(pid);if(!p)return;const others=pisos().filter(o=>o.id!==pid);
  const cnt=o=>[...S.sec.values()].filter(s=>pisoOfSecObj(s)===o.id).length;
  openPop(btn,`<div class="ph">${esc(p.code)} · ${esc(p.name)}</div><button data-do="sec">+ Sector</button>
   ${others.length?'<hr><div class="ph">Copiar estructura desde…</div>'+others.map(o=>`<button data-do="copy" data-src="${o.id}">${esc(o.code)} · ${esc(o.name)}<kbd>${cnt(o)} sect.</kbd></button>`).join(''):''}
   <hr><button data-do="code">Cambiar código del piso</button><button data-do="up">Subir</button><button data-do="dn">Bajar</button><hr><button data-do="del" class="danger">Eliminar piso y todo su contenido</button>`,
  {sec:()=>addSector(pid),copy:d=>copyPisoStructure(d.src,pid),
   code:()=>{const inp=document.querySelector(`#grid .ci[data-piso="${pid}"]`);toast('Escribe el nuevo código en el nombre así: “P2 · Segundo piso” y pulsa Enter.');if(inp){inp.value=p.code+' · '+p.name;inp.focus();inp.dataset.codeedit='1'}},
   up:()=>movePiso(p,-1),dn:()=>movePiso(p,1),
   del:()=>{const ops=[];for(const s of [...S.sec.values()].filter(s=>pisoOfSecObj(s)===pid)){for(const a of siblings('ambientes','sectorId',s.id)){for(const x of siblings('acts','ambId',a.id))ops.push(arc('acts',x.id));ops.push(arc('ambientes',a.id))}ops.push(arc('sectors',s.id))}ops.push(arc('pisos',pid));apply(ops,`Piso ${p.code} eliminado`)}})}
function movePiso(p,dir){const l=pisos();const i=l.findIndex(x=>x.id===p.id);const j=i+dir;if(j<0||j>=l.length)return;const y=l[j];let oa=y.order,ob=p.order;if(oa===ob)ob=oa+dir;apply([op('pisos',p.id,{...p,order:oa}),op('pisos',y.id,{...y,order:ob})])}
function secMenu(btn,sid){const s=S.sec.get(sid);if(!s)return;const pid=pisoOfSecObj(s);const others=pisos().filter(o=>o.id!==pid);
  openPop(btn,`<div class="ph">Sector ${esc(s.code)}</div><button data-do="amb">+ Ambiente…</button><button data-do="dup">Duplicar sector (sin días)</button>
   ${others.length?'<hr><div class="ph">Copiar este sector a…</div>'+others.map(o=>`<button data-do="to" data-dst="${o.id}">${esc(o.code)} · ${esc(o.name)}</button>`).join(''):''}
   <hr><button data-do="code">Cambiar código</button><button data-do="up">Subir</button><button data-do="dn">Bajar</button><hr><button data-do="del" class="danger">Eliminar sector y su contenido</button>`,
  {amb:()=>addAmbMenu(btn,sid,null),
   dup:()=>{const sib=siblings('sectors','pisoId',pid);const ops=[];const r=copySectorOps(s,pid,orderAfter(sib,s),ops,false);ops[0].after.code=s.code+"'";apply(ops,`Sector duplicado: ${r.na} ambientes, ${r.nx} actividades`)},
   to:d=>{const dst=[...S.sec.values()].filter(x=>pisoOfSecObj(x)===d.dst);const ops=[];const r=copySectorOps(s,d.dst,dst.reduce((m,x)=>Math.max(m,x.order||0),0)+10,ops,false);apply(ops,`Sector copiado a ${S.pis.get(d.dst)?.code}: ${r.na} ambientes, ${r.nx} actividades`)},
   code:()=>{const inp=document.querySelector(`#grid .ci[data-sec="${sid}"]`);toast('Escribe “CÓDIGO · Nombre”, por ejemplo “S2 · Sector 2”, y pulsa Enter.');if(inp){inp.value=s.code+' · '+s.name;inp.focus();inp.dataset.codeedit='1'}},
   up:()=>moveItem('sectors','pisoId',{...s,pisoId:pid},-1),dn:()=>moveItem('sectors','pisoId',{...s,pisoId:pid},1),
   del:()=>{const ops=[];for(const a of siblings('ambientes','sectorId',sid)){for(const x of siblings('acts','ambId',a.id))ops.push(arc('acts',x.id));ops.push(arc('ambientes',a.id))}ops.push(arc('sectors',sid));apply(ops,`Sector ${s.code} eliminado`)}})}
function addPiso(){const ps=pisos();const last=ps[ps.length-1];const n=ps.length+1;const id=uid('piso');
  apply([op('pisos',id,{id,code:'P'+n,name:'Piso '+n,order:last?last.order+10:10})],'Piso creado');focusLater(`#grid .ci[data-piso="${id}"]`)}

