"use strict";
/* LPS 911 · Plan semanal y Restricciones.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= PLAN SEMANAL ================= */
function liveItems(n,pid){const days=new Set(weekDays(n));const o={};
  for(const{p,secs}of tree()){if(pid&&p.id!==pid)continue;for(const{s,ambs}of secs)for(const{a,acts}of ambs)for(const x of acts){const d=(x.days||[]).filter(z=>days.has(z)).sort();if(d.length){const it={sc:x.sc,sector:s.code,code:a.code,amb:a.name,act:x.name,days:d,ord:s.order*1e6+a.order*1e3+x.order};if(hasM(x)){const qd={};let q=0;d.forEach(z=>{const v=(x.qty||{})[z];if(v!=null){qd[z]=v;q+=+v}});if(q>0){it.q=r2(q);it.qd=qd;it.und=x.und||''}}o[x.id]=it}}}
  return o}
/* PPC semanal oficial de la semana n en los pisos visibles (lo mismo que Indicadores › Semanal y el Tablero) */
function ppcWeekAgg(n,vset){const o={n:0,ok:0,ev:0};for(const w of S.wk.values()){if(w.n!==n||!w.frozenAt||!w.pisoId||!vset.has(w.pisoId))continue;const st=ppcOf(w);if(!st)continue;o.n+=st.n;o.ok+=st.ok;o.ev+=st.ev}return o.ev>0?{...o,ppc:o.ok/o.n}:null}
function ppcOf(w){if(!w||!w.frozenAt)return null;const ids=Object.keys(w.items||{});if(!ids.length)return null;const r=w.res||{};const ok=ids.filter(i=>r[i]&&r[i].ok===true).length;const ev=ids.filter(i=>r[i]&&(r[i].ok===true||r[i].ok===false)).length;return{ppc:ok/ids.length,ok,ev,n:ids.length}}
const confirmUF={};
function renderPlan(main){
  ensureDaily(addD(weekStart(U.week),-7));
  const n=U.week,wd=weekDays(n),cnc=P().cnc||[];const vp=visPisos();
  let tN=0,tOk=0,tNo=0,fz=0,body='';
  for(const p of vp){
    const w=S.wk.get(wkId(n,p.id)),frozen=!!(w&&w.frozenAt);
    const items=frozen?w.items||{}:liveItems(n,p.id);const res=frozen?w.res||{}:{};
    const ids=Object.keys(items).sort((a,b)=>(items[a].ord||0)-(items[b].ord||0));
    if(!ids.length&&!frozen){body+=`<section class="card" data-pid="${p.id}"><div class="hd"><span class="p-code">${esc(p.code)}</span>${esc(p.name)}<span class="sub">Sin actividades programadas en la semana ${n}</span></div></section>`;continue}
    const nOk=ids.filter(i=>res[i]&&res[i].ok===true).length,nNo=ids.filter(i=>res[i]&&res[i].ok===false).length;
    if(frozen){fz++;tN+=ids.length;tOk+=nOk;tNo+=nNo}
    const st=frozen?ppcOf(w):null;
    const extra=frozen?Object.entries(liveItems(n,p.id)).filter(([id])=>!(id in items)):[];
    const bySc={};ids.forEach(id=>(bySc[items[id].sc]=bySc[items[id].sc]||[]).push(id));
    const cf=(confirmUF[p.id]||0)>NOW();
    let h=`<section class="card" data-pid="${p.id}"><div class="hd"><span class="p-code">${esc(p.code)}</span>${esc(p.name)}<span class="sub">${ids.length} compromisos</span><span style="flex:1"></span>
     ${frozen?`<span class="pill ok">Congelado ${new Date(w.frozenAt).toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`:'<span class="pill warn">Borrador en vivo</span>'}
     ${canWrite&&frozen?(()=>{const k=ids.filter(id=>{const r=res[id]||{};const sg=fieldSug(id,items[id]);return sg&&sg.ok!=null&&r.ok==null}).length;return k?`<button class="ib" data-applyfield="1" title="Llena Sí/No, causa y ejecutado de los compromisos aún sin evaluar, según los registros de campo">Aplicar registros de campo (${k})</button>`:''})():''}
     ${canWrite?(frozen?`<button class="ib${cf?' warn':''}" data-unfreeze="1">${cf?'Confirmar: descongelar y borrar evaluación':'Descongelar'}</button>`:`<button class="ib pri" data-freeze="1">Congelar ${esc(p.code)}</button>`):''}</div>
     <div class="pad"><div class="tiles">
      <div class="tile"><span class="k">Cumplidos</span><span class="v" style="color:var(--ok)">${frozen?nOk:'—'}</span></div>
      <div class="tile"><span class="k">No cumplidos</span><span class="v" style="color:var(--bad)">${frozen?nNo:'—'}</span></div>
      <div class="tile"><span class="k">Por evaluar</span><span class="v">${frozen?ids.length-nOk-nNo:ids.length}</span></div>
      <div class="tile hl"><span class="k">PPC ${esc(p.code)}</span><span class="v">${st?pct(st.ppc):'—'}${st&&st.ev<st.n?' <small>parcial</small>':''}</span></div></div></div>
     <div class="tscroll"><table class="t rt ppcs"><thead><tr><th title="N.º de la actividad dentro de su ambiente (el mismo del lookahead)">Ítem</th><th>Descripción</th><th>Actividad</th><th>Días</th><th style="text-align:right">Metrado</th><th style="text-align:right">Ejecutado</th><th>Cumplido</th><th style="min-width:130px">Tipo de causa</th><th style="min-width:140px">Causa (detalle)</th><th style="min-width:140px">Mitigación</th></tr></thead><tbody>`;
    for(const sc of Object.keys(bySc).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name))){const c=conOf(sc);const l=bySc[sc];const ok=l.filter(i=>res[i]&&res[i].ok===true).length;
      h+=`<tr class="grp"><td colspan="10"><span class="chip" style="--c:${c.color};border:0;background:none;padding-left:0;font-size:13px"><i></i>${esc(c.name)}</span> <span class="note">${l.length} compromiso${l.length>1?'s':''}${frozen?` · PPC ${pct(ok/l.length)}`:''}</span></td></tr>`;
      for(const id of l){const it=items[id];const r=res[id]||{};const ds=new Set(it.days);
        h+=`<tr data-id="${id}"><td class="mono inum" data-l="Ítem">${actNum(id)||''}</td><td data-l="Descripción"><span class="mono">${esc(it.code)}</span><div class="note" style="font-size:12px">${esc(it.amb)}</div></td><td class="lead"><b style="font-weight:500">${esc(it.act)}</b>${frozen&&!S.act.has(id)?' <span class="pill neu">eliminada del lookahead</span>':''}</td>
        <td data-l="Días"><span class="mini" style="--c:${c.color}">${wd.map((d,i)=>`<i class="${ds.has(d)?'on':''}" title="${fmtD(d)}${it.qd&&it.qd[d]!=null?': '+fq(it.qd[d])+' '+esc(it.und||''):''}">${DL[i]}</i>`).join('')}</span></td>
        <td class="mono" style="text-align:right;white-space:nowrap" data-l="Metrado sem.">${it.q?fq(it.q)+' '+esc(it.und||''):'—'}</td>
        <td style="text-align:right;white-space:nowrap" data-l="Ejecutado">${it.q?`<input class="ci qexec" data-exec data-fk="ex:${p.id}:${id}" inputmode="decimal" value="${r.exec??''}" placeholder="${frozen?'0':''}"${frozen&&canWrite?'':' disabled'} aria-label="Metrado ejecutado">${r.exec!=null&&it.q?`<div class="note" style="font-size:11px">${Math.round(r.exec/it.q*100)}%</div>`:''}`:''}</td>
        <td class="full" data-l="Cumplido"><span class="yn"><button class="y${r.ok===true?' on':''}" data-yn="1"${canWrite?'':' disabled'}>Sí</button><button class="n${r.ok===false?' on':''}" data-yn="0"${canWrite?'':' disabled'}>No</button></span>${(()=>{const sg=fieldSug(id,it);if(!sg)return'<div class="fsug">Campo: sin registros</div>';return`<div class="fsug ${sg.ok===true?'ok':sg.ok===false?'no':''}" title="Registros de campo: ${sg.okd} de ${sg.total} días cumplidos${sg.cnc?' · causa más frecuente: '+esc(sg.cnc):''}">Campo: ${sg.okd}/${sg.total} días ✓${sg.rec?' · recuperada en la semana':''}${sg.ok!=null&&r.ok!==sg.ok?' · sugiere '+(sg.ok?'Sí':'No'):''}</div>`})()}</td>
        <td class="full" data-l="Tipo de causa"><select class="ci" data-cnc data-fk="cnc:${p.id}:${id}"${frozen&&canWrite&&(r.ok===false||r.cnc)?'':' disabled'} aria-label="Causa"><option value="">${r.ok===false?'Elegir tipo…':'—'}</option>${cncOpts(cnc,r.cnc)}</select></td>
        <td class="full" data-l="Causa (detalle)"><input class="ci" data-note data-fk="note:${p.id}:${id}" value="${esc(r.note||'')}" placeholder="${frozen&&r.ok===false?'Qué pasó':''}"${frozen&&canWrite?'':' disabled'} aria-label="Causa (detalle)"></td>
        <td class="full" data-l="Mitigación"><input class="ci" data-mit data-fk="mit:${p.id}:${id}" value="${esc(r.mit||'')}" placeholder="${frozen&&r.ok===false?'Qué se hará para que no se repita':''}"${frozen&&canWrite&&(r.ok===false||r.mit)?'':' disabled'} aria-label="Mitigación"></td></tr>`}}
    h+=`</tbody></table></div>`;
    if(extra.length)h+=`<div class="pad"><div class="note" style="margin-bottom:6px"><b>Programadas después de congelar</b> · no cuentan para el PPC</div><table class="t"><tbody>${extra.map(([id,it])=>`<tr><td class="mono" style="white-space:nowrap">${esc(it.code)}</td><td>${esc(it.amb)}</td><td>${esc(it.act)}</td><td>${esc(conOf(it.sc).name)}</td></tr>`).join('')}</tbody></table></div>`;
    body+=h+'</section>';
  }
  const gp=tN?tOk/tN:null;
  main.innerHTML=`<div class="scroll"><div class="wrap">
   ${pageHead('PPC semanal',`Semana ${n} · ${fmtD(wd[0])} – ${fmtD(wd[5])} · ${pisoLabel()}`,`<button class="ib" id="bppcx" title="Formato de la empresa: actividades, programación, cumplimiento y análisis de incumplimiento">Exportar Excel</button>`)}<div class="card">
   <div class="pad">${vp.length>1?`<div class="tiles" style="margin-bottom:12px"><div class="tile"><span class="k">Pisos congelados</span><span class="v">${fz}<small> de ${vp.length}</small></span></div><div class="tile"><span class="k">Compromisos congelados</span><span class="v">${tN}</span></div><div class="tile"><span class="k">Cumplidos</span><span class="v" style="color:var(--ok)">${tOk}</span></div><div class="tile hl"><span class="k">PPC global sem ${n}</span><span class="v">${pct(gp)}</span></div></div>`:''}
   ${helpBox('¿Cómo funciona congelar y evaluar?',`<p>Cada piso congela y evalúa su plan por separado, así los equipos trabajan en paralelo. Al <b>congelar</b> un piso, sus actividades de la semana ${n} quedan fijadas como compromisos y se guarda una foto del lookahead para ver los cambios. Si marcas directamente Sí o No, ese piso se congela en ese momento.</p>`)}</div></div>
   ${body||'<div class="empty">No hay pisos creados.</div>'}</div></div>`;
  main.onfocusin=e=>{if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onclick=e=>{if(e.target.closest('#bppcx')){ppcSemXlsx(n);return}const sec=e.target.closest('section[data-pid]');if(!sec)return;const pid=sec.dataset.pid;
    if(e.target.closest('[data-applyfield]')){const wk=S.wk.get(wkId(n,pid));if(!wk)return;const upd={};for(const[id,it]of Object.entries(wk.items||{})){const r=(wk.res||{})[id]||{};const sg=fieldSug(id,it);if(!sg||sg.ok==null||r.ok!=null)continue;upd[id]={...r,ok:sg.ok,cnc:sg.ok?'':(sg.cnc||r.cnc||''),note:r.note||'',exec:it.q?sg.exec:(r.exec??null)}}
      const k=Object.keys(upd).length;if(!k)return;patch('weeks',wkId(n,pid),{res:upd},()=>{wk.res={...(wk.res||{}),...upd}});requestRender();toast(`${k} compromisos evaluados con los registros de campo. Revisa y corrige si hace falta.`);return}
    if(e.target.closest('[data-freeze]')){freezeWeek(n,pid);return}
    if(e.target.closest('[data-unfreeze]')){if((confirmUF[pid]||0)>NOW()){confirmUF[pid]=0;apply([op('weeks',wkId(n,pid),null)],`${S.pis.get(pid)?.code||''} · semana ${n} descongelada`)}else{confirmUF[pid]=NOW()+5000;render();setTimeout(()=>{if(U.tab==='plan')render()},5100)}return}
    const b=e.target.closest('[data-yn]');if(!b||b.disabled)return;const id=b.closest('tr').dataset.id;const ok=b.dataset.yn==='1';const wk=S.wk.get(wkId(n,pid));
    if(!wk||!wk.frozenAt){freezeWeek(n,pid,{[id]:{ok,cnc:'',note:''}});return}
    const cur=(wk.res||{})[id]||{};const nv=cur.ok===ok?null:ok;setRes(n,pid,id,{...cur,ok:nv,cnc:nv===false?(cur.cnc||''):'',note:cur.note||''})};
  main.onchange=e=>{const t=e.target;const tr=t.closest('tr[data-id]');const sec=t.closest('section[data-pid]');if(!tr||!sec)return;const pid=sec.dataset.pid,id=tr.dataset.id;const wk=S.wk.get(wkId(n,pid));if(!wk)return;const cur=(wk.res||{})[id]||{};
    if(t.hasAttribute('data-exec')){const it=(wk.items||{})[id]||{};const v=parseNum(t.value);if(Number.isNaN(v)||(v!=null&&v<0)){toast('El ejecutado debe ser un número positivo.');t.value=cur.exec??'';return}t.dataset.o=t.value;
      const nv={...cur,exec:v};if(v!=null&&it.q){nv.ok=v>=it.q-1e-9;if(nv.ok)nv.cnc='';else nv.cnc=cur.cnc||''}setRes(n,pid,id,nv);if(v!=null&&it.q)toast(nv.ok?'Cumplido: se ejecutó todo lo programado.':`No cumplido: ${fq(v)} de ${fq(it.q)} ${it.und||''}. Elige la causa.`);return}
    if(t.hasAttribute('data-cnc'))setRes(n,pid,id,{...cur,cnc:t.value});if(t.hasAttribute('data-note')){t.dataset.o=t.value;setRes(n,pid,id,{...cur,note:t.value})}
    if(t.hasAttribute('data-mit')){t.dataset.o=t.value;setRes(n,pid,id,{...cur,mit:t.value.trim()})}};
}
function fieldSug(id,it0){if(!(it0.days||[]).length)return null;const x0=S.act.get(id);const dn0=x0&&DONE.get(x0.id);const it=dn0?{...it0,days:it0.days.filter(d=>d<=dn0)}:it0;if(!it.days.length)return null;const wd=weekDays(weekOf(it.days[0]));const cd=new Set(it.days);const today=todayIso();
  const rd=wd.map(d=>[d,recOf(d,id)]).filter(([d,r])=>r&&(cd.has(d)||r.status));const reg=rd.map(([,r])=>r);if(!reg.length)return null;
  const exec=r2(reg.reduce((s,r)=>s+(+r.exec||0),0));const okd=reg.filter(r=>r.status==='ok').length;const rec=rd.some(([d,r])=>!cd.has(d)&&r.status==='ok');
  const x=S.act.get(id);const pendF=(x&&x.days||[]).some(d=>wd.includes(d)&&d>=today&&!recOf(d,id));const over=wd[5]<today;
  const allC=it.days.every(d=>recOf(d,id));let ok=null;
  if(it.q){if(exec>=it.q-1e-9)ok=true;else if(over||(allC&&!pendF))ok=false}
  else{if(okd>=it.days.length)ok=true;else if(over||(allC&&!pendF))ok=false}
  const cc={};reg.forEach(r=>{if(r.cnc)cc[r.cnc]=(cc[r.cnc]||0)+1});const cnc=(Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]||[''])[0];
  return{ok,cnc,exec,n:reg.length,total:it.days.length,okd,rec}}
/** n.º de la actividad dentro de su ambiente (el mismo que muestra el lookahead) */
function actNum(id){const x=S.act.get(id);if(!x)return 0;const i=siblings('acts','ambId',x.ambId).findIndex(y=>y.id===id);return i<0?0:i+1}
/** opciones de causa: las configuradas y, si la guardada ya no está en la lista, también esa (para no perderla al editar) */
const cncOpts=(cnc,cur)=>(cur&&!cnc.includes(cur)?[...cnc,cur]:cnc).map(k=>`<option value="${esc(k)}" title="${esc(cncTip(k))}"${cur===k?' selected':''}>${esc(cncLabel(k))}</option>`).join('');
function setRes(n,pid,id,val){const w=S.wk.get(wkId(n,pid));if(!w)return;patch('weeks',wkId(n,pid),{res:{[id]:val}},()=>{w.res={...(w.res||{}),[id]:val}});requestRender()}
function freezeWeek(n,pid,res){const items=liveItems(n,pid);const snap={};for(const x of S.act.values())if(pisoOfAmb(x.ambId)===pid)snap[x.id]=(x.days||[]).slice().sort();
  const code=S.pis.get(pid)?.code||'';
  apply([op('weeks',wkId(n,pid),{n,pisoId:pid,frozenAt:new Date(NOW()).toISOString(),items,res:res||{},snap})],res?`${code} · semana ${n} congelada al registrar la primera evaluación`:`${code} · compromisos de la semana ${n} congelados`)}

/* ================= RESTRICCIONES ================= */
/* el subcontratista crea restricciones de sus actividades y edita las suyas mientras estén pendientes; liberarlas es del ingeniero */
/* el rol "Área de apoyo" (Oficina Técnica, Calidad…) ve todo y registra / resuelve / libera las restricciones de su área */
function AREA(){return!!me&&me.role==='area'}
const myArea=r=>AREA()&&!!me.area&&!!r&&r.area===me.area&&grpOf(r)==='area';
const rCanAdd=()=>!!canWrite&&!PM()||SCK()||(AREA()&&!!me.area);
function rCanEd(r){if(canWrite&&!PM())return true;if(myArea(r))return true;return SCK()&&!!r&&r.by===me.email&&myScsI().includes(r.sc)&&r.status!=='lib'}
const rCanLib=r=>!!canWrite&&!PM()||myArea(r);
const rCanDel=r=>!!canWrite&&!PM()||(SCK()&&rCanEd(r));
function myActs(){const mine=new Set(myScsI());return[...S.act.values()].filter(x=>mine.has(x.sc))}
function scRestrPick(btn){const L=myActs();if(!L.length){toast('No tienes actividades en el lookahead para asociar una restricción.');return}
  const d=todayIso();const win=L.filter(x=>(x.days||[]).some(z=>z>=addD(d,-7)));const use=(win.length?win:L).map(x=>{const a=S.amb.get(x.ambId);const p=S.pis.get(pisoOfAct(x.id));return{x,a,p,ini:actStats(x).ini||'9'}}).filter(o=>o.a).sort((o,q)=>o.ini.localeCompare(q.ini));
  openPop(btn,`<div class="ph">Nueva restricción</div><div class="ptx">¿Qué actividad de tu partida está restringida?</div><div class="qrow"><select id="rpick" style="max-width:320px" aria-label="Actividad">${use.map(o=>`<option value="${o.x.id}">${esc((o.p?o.p.code+' · ':'')+o.a.code)} · ${esc(o.x.name||'(sin nombre)')}${o.ini!=='9'?' · '+fmtD(o.ini):''}</option>`).join('')}</select><button data-do="go">Crear</button></div>`,
  {go:()=>{const v=($('#rpick')||{}).value;if(v)newRestr(v)}})}
function restrPiso(r){return r.actId&&S.act.has(r.actId)?pisoOfAct(r.actId):(r.pisoId||'')}
function restrInScope(){return[...S.res.values()].filter(r=>{if(!U.piso)return true;const p=restrPiso(r);return!p||p===U.piso})}
function actOptions(sel,only){let h=only?'':'<option value="">— Sin actividad —</option>';for(const{p,secs}of visTree())for(const{s,ambs}of secs)for(const{a,acts:all}of ambs){const acts=only?all.filter(x=>only.has(x.sc)):all;if(!acts.length)continue;h+=`<optgroup label="${esc((U.piso?'':p.code+' · ')+a.code+' · '+a.name)}">`+acts.map(x=>`<option value="${x.id}"${x.id===sel?' selected':''}>${esc(x.name||'(sin nombre)')} — ${esc(conOf(x.sc).name)}</option>`).join('')+'</optgroup>'}
  if(sel&&S.act.has(sel)&&!h.includes(`value="${sel}"`)){const x=S.act.get(sel);h+=`<option value="${sel}" selected>${esc(x.name)} (otro piso)</option>`}return h}
const rOpen=new Set();
/* dónde está la actividad de una restricción (piso · sector · ambiente · SC) y cómo ir a ella en el lookahead */
function actLoc(aid){const x=S.act.get(aid);if(!x)return'';const a=S.amb.get(x.ambId);const sc=a&&S.sec.get(a.sectorId);const p=S.pis.get(pisoOfAct(aid));
  return[p&&p.code,sc&&sc.code,a&&(a.code+' · '+a.name)].filter(Boolean).join(' · ')+' · '+conOf(x.sc).name}
function gotoAct(aid){const x=S.act.get(aid);if(!x){toast('La actividad ya no está en el lookahead.');return}const a=S.amb.get(x.ambId);const pid=pisoOfAct(aid);
  if(U.piso&&U.piso!==pid){U.piso=pid;U.pisoAll=false}if(a)U.collapsed=(U.collapsed||[]).filter(c=>c!==a.sectorId&&c!==pid);if(U.sector&&a&&U.sector!==a.sectorId)U.sector='';U.tab='look';saveUI();render();
  let n=0;const find=()=>{if(typeof gridReveal==='function')gridReveal(aid);const tr=$(`#grid tr[data-a="${CSS.escape(aid)}"]`);if(tr){tr.scrollIntoView({block:'center',behavior:'smooth'});tr.classList.add('rflash');setTimeout(()=>tr.classList.remove('rflash'),3800);return}if(++n<8)setTimeout(find,150);else toast('La actividad no se ve con los filtros actuales del lookahead (semanas o filtros).')};setTimeout(find,120)}
/** «Ver en el plano»: abre el Plan diario en el piso y el día en que la actividad va (el próximo desde hoy) y la resalta */
function gotoPlano(aid){const x=S.act.get(aid);if(!x){toast('La actividad ya no está en el lookahead.');return}const pid=pisoOfAct(aid);const t=todayIso();
  const D=(x.days||[]).slice().sort();const d=D.find(y=>y>=t)||D[D.length-1]||t;
  U.piso=pid;U.pisoAll=false;if(typeof AUTO_OFF!=='undefined')AUTO_OFF=true;U.tab='mapa';saveUI();if(typeof daySet==='function')daySet(d);render();
  let n=0;const go=()=>{if(window.__plano&&window.__plano.focusAct){window.__plano.focusAct(aid);return}if(++n<60)setTimeout(go,150)};setTimeout(go,150)}
function rthumbs(r){const ce=rCanEd(r);const L=(r.photos||[]).map(id=>{loadFoto(id);const src=FOTO.get(id)||'';return`<div class="th"><img data-ph="${id}" src="${src}" alt="Foto de la restricción"${src?'':' style="opacity:.3"'}>${ce?`<button data-rphdel="${r.id}|${id}" aria-label="Quitar foto">&times;</button>`:''}</div>`}).join('');
  return`<div class="rph">${L}${ce?`<label class="phb" title="Adjuntar foto de la restricción">📷 ${(r.photos||[]).length?'+':'Foto'}<input type="file" accept="image/*" data-rphoto="${r.id}" hidden></label>`:''}</div>`}
function newRestr(actId){const x=actId&&S.act.get(actId);if(SCK()&&(!x||!myScsI().includes(x.sc))){toast('Elige una actividad de tu partida.');return}if(AREA()&&!me.area){toast('Pide al administrador que te asigne un área en Equipo.');return}const id=uid('res');rOpen.add(id);
  apply([op('restr',id,{id,actId:actId||'',pisoId:actId?pisoOfAct(actId):(U.piso||''),type:(P().restrTypes||[])[0]||'',desc:'',resp:x?conOf(x.sc).name:'',need:x?actStats(x).ini:'',freed:'',status:'pend',created:todayIso(),...(x?{sc:x.sc}:{}),...(AREA()?{grp:'area',area:me.area,resp:me.area}:{}),by:me.email,byName:me.name||''})],'Restricción creada');
  U.tab='restr';U.rfilter='pend';U.rAct=null;render();focusLater(`.ci[data-r="${id}"][data-f="desc"]`)}
/* el selector de actividad de cada restricción trae solo la elegida y se llena al abrirlo:
   armar miles de opciones por fila era lo que hacía lenta la pestaña */
function actOne(aid){const x=aid&&S.act.get(aid);if(!x)return aid?`<option value="${esc(aid)}" selected>(actividad eliminada)</option>`:'<option value="">— Sin actividad —</option>';
  const a=S.amb.get(x.ambId);return`<option value="${x.id}" selected>${esc((a?a.code+' · ':'')+(x.name||'(sin nombre)'))} — ${esc(conOf(x.sc).name)}</option>`}
function actFill(sel){if(!sel||sel.dataset.alzd)return;sel.dataset.alzd='1';const v=sel.value;sel.innerHTML=actOptions(v,sel.dataset.alz==='sc'?new Set(myScsI()):null);sel.value=v}
/* filtros de la lista: a quién afecta, quién la registró, quién la libera y fechas */
function rAff(r){const x=S.act.get(r.actId);const sc=r.sc||(x&&x.sc);return sc?conOf(sc).name:'—'}
function rReg(r){const m=r.by&&MEM.get(r.by);if(m&&m.role==='sc'&&m.sc)return conOf(m.sc).name;return r.byName||(m&&m.name)||r.by||'—'}
function rWho(r){return(r.status==='lib'?(r.libN||r.resp):r.resp)||'—'}
function rFOk(r){const F=U.rF||{};return(!F.aff||rAff(r)===F.aff)&&(!F.reg||rReg(r)===F.reg)&&(!F.who||rWho(r)===F.who)
  &&(!F.c1||(r.created||'')>=F.c1)&&(!F.c2||(r.created&&r.created<=F.c2))&&(!F.l1||(r.freed&&r.freed>=F.l1))&&(!F.l2||(r.freed&&r.freed<=F.l2))}
function rFBar(all){const F=U.rF||{};const opts=(k,fn,lbl)=>{const v=[...new Set(all.map(fn))].filter(x=>x&&x!=='—').sort((a,b)=>a.localeCompare(b,'es'));return`<label class="rfl">${lbl}<select data-rf="${k}"><option value="">Todos</option>${[...new Set([...v,F[k]].filter(Boolean))].map(o=>`<option${o===F[k]?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`};
  const on=Object.values(F).some(Boolean);
  return`<div class="fbar rfb">${opts('aff',rAff,'Afecta a')}${opts('reg',rReg,'Registró')}${opts('who',rWho,'La libera')}
    <label class="rfl">Registrada<span><input type="date" data-rf="c1" value="${esc(F.c1||'')}" aria-label="Registrada desde"> – <input type="date" data-rf="c2" value="${esc(F.c2||'')}" aria-label="Registrada hasta"></span></label>
    <label class="rfl">Liberada<span><input type="date" data-rf="l1" value="${esc(F.l1||'')}" aria-label="Liberada desde"> – <input type="date" data-rf="l2" value="${esc(F.l2||'')}" aria-label="Liberada hasta"></span></label>
    ${on?'<button class="ib" id="rfclr">Quitar filtros</button>':''}</div>`}
function renderRestr(main){
  const today=todayIso();const all=restrInScope();const types=P().restrTypes||[];
  const aw=n=>{const x=S.act.get(n);return x&&actStats(x).ini?weekOf(actStats(x).ini):null};
  let list=all.filter(r=>U.rfilter==='all'||(U.rfilter==='pend'?r.status!=='lib':r.status==='lib'));
  if(U.rAct)list=list.filter(r=>r.actId===U.rAct);list=list.filter(rFOk);
  if(U.rgrp)list=list.filter(r=>grpOf(r)===U.rgrp);if(AREA()&&U.rMine!==false&&me.area)list=list.filter(r=>myArea(r));
  list.sort((a,b)=>(a.need||'9').localeCompare(b.need||'9')||String(a.created).localeCompare(String(b.created)));
  const pend=all.filter(r=>r.status!=='lib');const late=pend.filter(r=>r.need&&r.need<today);
  const winEnd=weekDays(U.week+U.win-1)[5];const inWin=pend.filter(r=>{const x=S.act.get(r.actId);return x&&(x.days||[]).some(d=>d>=weekStart(U.week)&&d<=winEnd)});
  const libW=all.filter(r=>r.status==='lib'&&r.freed&&weekOf(r.freed)===U.week).length;
  const showP=!U.piso&&S.pis.size>1;const mob=isMob();
  let h=`<div class="scroll"><div class="wrap">${pageHead('Restricciones',`${pisoLabel()} · ${pend.length} pendiente${pend.length===1?'':'s'}${late.length?` · <b class="bad">${late.length} vencida${late.length===1?'':'s'}</b>`:''}`,rCanAdd()?'<button class="ib pri" id="radd">+ Nueva restricción</button>':'')}<div class="tiles">
   <div class="tile"><span class="k">Pendientes</span><span class="v">${pend.length}<small> · ${pend.filter(r=>grpOf(r)==='campo').length} campo · ${pend.filter(r=>grpOf(r)==='area').length} otras áreas</small></span></div>
   <div class="tile"><span class="k">Vencidas</span><span class="v" style="color:${late.length?'var(--bad)':'inherit'}">${late.length}</span></div>
   <div class="tile"><span class="k">Afectan la ventana</span><span class="v">${inWin.length}<small> · sem ${U.week}–${U.week+U.win-1}</small></span></div>
   <div class="tile"><span class="k">Liberadas sem ${U.week}</span><span class="v">${libW}</span></div></div>
  ${(()=>{if(!libAuto())return'';const vs=new Set(visPisos().map(p=>p.id));const B=libBlocks().filter(b=>vs.has(pisoOfAct(b.y.id))&&(!U.rAct||b.y.id===U.rAct)).sort((a,b)=>a.need.localeCompare(b.need));if(!B.length)return'';
    return`<div class="card"><div class="hd">Liberaciones de calidad pendientes <span class="sub">${B.length} · automáticas: se cierran solas cuando Calidad libera</span><span style="flex:1"></span><button class="ib" data-lqgo="1">Ir a Liberaciones</button></div><div class="tscroll"><table class="t"><thead><tr><th>Actividad restringida</th><th>Entra</th><th>Falta liberar</th><th>Estado de la liberación</th><th></th></tr></thead><tbody>
    ${B.map(b=>{const st=b.l?b.l.st:'sin';const a=S.amb.get(b.y.ambId);return`<tr class="${b.need<=wshift(today,1)?'late':''}"><td><b>${esc(b.y.name)}</b><div class="rloc">${esc(actLoc(b.y.id))}</div></td><td class="mono">${fmtD(b.need)}</td><td>${esc(b.p.name)}<div class="rloc">${esc(conOf(b.p.sc).name)}</div></td><td><i class="lqst" style="--c:${LST[st].c}">${esc(LST[st].t)}</i>${b.l&&b.l.prog&&b.l.prog.d?` <span class="mu">${fmtD(b.l.prog.d)} ${esc(b.l.prog.h||'')}</span>`:''}</td><td>${b.l?`<button class="ib" data-lqid="${b.l.id}">Ver</button>`:canLibAsk(b.p)?`<button class="ib pri" data-lqask="${b.p.id}">Solicitar</button>`:''}</td></tr>`}).join('')}</tbody></table></div></div>`})()}
  <div class="card"><div class="hd">Lista
   <span class="seg" id="rf"><button data-f="pend" class="${U.rfilter==='pend'?'on':''}">Pendientes</button><button data-f="lib" class="${U.rfilter==='lib'?'on':''}">Liberadas</button><button data-f="all" class="${U.rfilter==='all'?'on':''}">Todas</button></span>
   <span class="seg" id="rg" title="Operativas de campo vs. las que dependen de otras áreas (OT, Ingeniería, etc.)"><button data-g="" class="${U.rgrp?'':'on'}">Todas</button><button data-g="campo" class="${U.rgrp==='campo'?'on':''}">Campo</button><button data-g="area" class="${U.rgrp==='area'?'on':''}">Otras áreas</button></span>
   ${AREA()&&me.area?`<span class="seg" id="rmine"><button data-m="1" class="${U.rMine!==false?'on':''}">De ${esc(me.area)}</button><button data-m="0" class="${U.rMine===false?'on':''}">Todas</button></span>`:''}
   ${U.rAct?`<span class="pill neu">Filtrado: ${esc(S.act.get(U.rAct)?.name||'actividad')} <button class="ab" id="rclr" aria-label="Quitar filtro">&times;</button></span>`:''}
   </div>${rFBar(all)}${SCK()?'<div class="pad note" style="padding-top:0">Puedes registrar restricciones de las actividades de tu partida y corregirlas mientras estén pendientes. Las libera el ingeniero.</div>':''}${AREA()?`<div class="pad note" style="padding-top:0">${me.area?`Registras, resuelves y liberas las restricciones de <b>${esc(me.area)}</b>. Las demás las ves como consulta.`:'Aún no tienes un área asignada: pide al administrador que la elija en Equipo.'}</div>`:''}
  ${mob?'<div class="rcards">':`<div class="tscroll"><table class="t"><thead><tr><th style="min-width:105px">Estado</th>${showP?'<th>Piso</th>':''}<th style="min-width:190px">Actividad</th><th style="min-width:70px">Sem.</th><th style="min-width:130px">Tipo</th><th style="min-width:140px">Clase / área</th><th style="min-width:160px">Descripción</th><th style="min-width:110px">Fotos</th><th style="min-width:100px">Responsable</th><th style="min-width:125px">Requerida</th><th style="min-width:125px">Liberada</th><th></th></tr></thead><tbody>`}`;
  const emp=`<div class="empty">${all.length?'No hay restricciones en este filtro.':'Todavía no hay restricciones. Regístralas aquí o desde el menú ⋮ de una actividad en el lookahead.'}</div>`;
  if(!list.length)h+=mob?emp:`<tr><td colspan="12">${emp}</td></tr>`;
  const SCm=SCK()?new Set(myScsI()):null;const aOpts={};
  const gsel=(r,fk)=>{const g=grpOf(r);const ar=restrAreasL();const ro=rCanEd(r)&&!AREA()?'':' disabled';return`<select class="ci" ${fk('grp')}${ro}><option value="campo"${g==='campo'?' selected':''}>Operativa de campo</option><option value="area"${g==='area'?' selected':''}>Otras áreas</option></select>${g==='area'?`<select class="ci" ${fk('area')}${ro}><option value="">— área —</option>${[...new Set([...ar,r.area].filter(Boolean))].map(t=>`<option${t===r.area?' selected':''}>${esc(t)}</option>`).join('')}</select>`:''}`};
  for(const r of list){const isLate=r.status!=='lib'&&r.need&&r.need<today;const w=aw(r.actId);const fk=f=>`data-r="${r.id}" data-f="${f}" data-fk="r:${r.id}:${f}"`;const ce=rCanEd(r);const ro=ce?'':' disabled';const roL=rCanLib(r)?'':' disabled';const own=ce&&SCm;const ao=actOne(r.actId);const alz=` data-alz="${own?'sc':'all'}"`;
    if(mob){const x=S.act.get(r.actId);const am=x&&S.amb.get(x.ambId);const lib=r.status==='lib';const op_=rOpen.has(r.id);
      h+=`<article class="rcard${isLate?' late':''}"><div class="r1"><span class="pill ${lib?'ok':isLate?'bad':'warn'}">${lib?'Liberada':isLate?'Vencida':'Pendiente'}</span><span class="rgtag ${grpOf(r)}">${grpOf(r)==='area'?('Otras áreas'+(r.area?' · '+esc(r.area):'')):'Campo'}</span>${showP?`<span class="mono">${esc(S.pis.get(restrPiso(r))?.code||'')}</span>`:''}${w!=null?`<span>Inicia sem ${w}</span>`:''}${r.need?`<span>Requerida ${fmtD(r.need)}</span>`:''}${lib&&r.freed?`<span>Liberada ${fmtD(r.freed)}</span>`:''}</div>
        <b>${x?esc(x.name):'<span class="mu">Sin actividad</span>'}</b>${x?`<span class="mu" style="font-size:12.5px">${esc(actLoc(x.id))} <button type="button" class="lnkb" data-rgo="${x.id}">Ver en el lookahead ↗</button> <button type="button" class="lnkb" data-rmap="${x.id}">Ver en el plano ↗</button></span>`:''}
        ${op_?`<div class="rf"><label>Actividad<select class="ci" ${fk('actId')}${alz}${ro}>${ao}</select></label>
          <label>Tipo<select class="ci" ${fk('type')}${ro}>${[...new Set([...types,r.type].filter(Boolean))].map(t=>`<option${t===r.type?' selected':''}>${esc(t)}</option>`).join('')}</select></label>
          <label>Clase / área${gsel(r,fk)}</label>
          <label>Descripción<input class="ci" ${fk('desc')} value="${esc(r.desc)}" placeholder="¿Qué falta liberar?"${ro}></label>
          <label>Responsable<input class="ci" ${fk('resp')} value="${esc(r.resp)}" placeholder="Responsable"${ro}></label>
          <label>Fecha requerida<input class="ci" type="date" ${fk('need')} value="${esc(r.need)}"${ro}></label></div>`
        :`<div>${esc(r.type||'')}${r.desc?' · '+esc(r.desc):''}</div>${r.resp?`<div class="mu" style="font-size:12.5px">Responsable: ${esc(r.resp)}</div>`:''}`}
        ${rthumbs(r)}<div class="mu" style="font-size:12px">Afecta a ${esc(rAff(r))} · registró ${esc(rReg(r))}${r.created?' el '+fmtD(r.created):''}${r.status==='lib'&&r.libN?` · liberó ${esc(r.libN)}`:''}</div><div class="rbt">${rCanLib(r)?`<button class="ib${lib?'':' pri'}" data-rtog="${r.id}">${lib?'Reabrir':'Liberar hoy'}</button>`:''}${ce?`<button class="ib" data-ropen="${r.id}">${op_?'Listo':'Editar'}</button>${op_&&rCanDel(r)?`<button class="ib" data-rdel="${r.id}">Eliminar</button>`:''}`:''}</div></article>`;continue}
    h+=`<tr class="${isLate?'late':''}"><td><select class="ci" ${fk('status')}${roL}><option value="pend"${r.status!=='lib'?' selected':''}>Pendiente</option><option value="lib"${r.status==='lib'?' selected':''}>Liberada</option></select>${isLate?'<div><span class="pill bad">Vencida</span></div>':''}</td>
    ${showP?`<td class="mono">${esc(S.pis.get(restrPiso(r))?.code||'—')}</td>`:''}
    <td><select class="ci" ${fk('actId')}${alz}${ro}>${ao}</select>${r.actId&&S.act.has(r.actId)?`<div class="rloc">${esc(actLoc(r.actId))} <button type="button" class="lnkb" data-rgo="${r.actId}">Ver en el lookahead ↗</button> <button type="button" class="lnkb" data-rmap="${r.actId}">Ver en el plano ↗</button></div>`:r.actId?'<div class="rloc">La actividad ya no está en el lookahead</div>':''}<div class="rloc">Afecta a ${esc(rAff(r))} · registró ${esc(rReg(r))}${r.created?' el '+fmtD(r.created):''}${r.status==='lib'&&r.libN?` · liberó ${esc(r.libN)}`:''}</div></td>
    <td class="mono" style="white-space:nowrap">${w!=null?'Sem '+w:'—'}</td>
    <td><select class="ci" ${fk('type')}${ro}>${[...new Set([...types,r.type].filter(Boolean))].map(t=>`<option${t===r.type?' selected':''}>${esc(t)}</option>`).join('')}</select></td>
    <td>${gsel(r,fk)}</td>
    <td><input class="ci" ${fk('desc')} value="${esc(r.desc)}" placeholder="¿Qué falta liberar?"${ro}></td>
    <td>${rthumbs(r)}</td>
    <td><input class="ci" ${fk('resp')} value="${esc(r.resp)}" placeholder="Responsable"${ro}></td>
    <td><input class="ci" type="date" ${fk('need')} value="${esc(r.need)}"${ro}></td>
    <td><input class="ci" type="date" ${fk('freed')} value="${esc(r.freed)}"${roL}></td>
    <td>${rCanDel(r)?`<button class="ab" data-rdel="${r.id}" aria-label="Eliminar restricción" title="Eliminar">&times;</button>`:''}</td></tr>`}
  h+=mob?'</div></div></div></div>':'</tbody></table></div></div></div></div>';
  main.innerHTML=h;
  $('#rg',main).onclick=e=>{const b=e.target.closest('button');if(!b)return;U.rgrp=b.dataset.g;saveUI();render()};
  {const rm=$('#rmine',main);if(rm)rm.onclick=e=>{const b=e.target.closest('button');if(!b)return;U.rMine=b.dataset.m==='1';render()}}
  $('#rf',main).onclick=e=>{const b=e.target.closest('button');if(!b)return;U.rfilter=b.dataset.f;saveUI();render()};
  const ra=$('#radd',main);if(ra)ra.onclick=()=>{if(SCK()){const x=U.rAct&&S.act.get(U.rAct);if(x&&myScsI().includes(x.sc))newRestr(U.rAct);else scRestrPick(ra);return}newRestr(U.rAct||'')};
  {const fc=$('#rfclr',main);if(fc)fc.onclick=()=>{U.rF={};render()}}
  const rc=$('#rclr',main);if(rc)rc.onclick=()=>{U.rAct=null;render()};
  main.onclick=e=>{
    const im=e.target.closest('.rph img[data-ph]');if(im&&im.src&&im.src.startsWith('data:')){lightbox(im.src);return}
    const pdl=e.target.closest('[data-rphdel]');if(pdl){const[rid,fid]=pdl.dataset.rphdel.split('|');const r=S.res.get(rid);if(r&&rCanEd(r)){apply([op('restr',rid,{...r,photos:(r.photos||[]).filter(i=>i!==fid)})],'Foto quitada');if(db)fcol('fotos').doc(fid).delete().catch(()=>{})}return}
    const b=e.target.closest('[data-rdel]');if(b){const r=S.res.get(b.dataset.rdel);if(!r||!rCanDel(r))return;if(SCK()&&!confirm('¿Eliminar esta restricción?'))return;(r.photos||[]).forEach(fid=>db&&fcol('fotos').doc(fid).delete().catch(()=>{}));apply([op('restr',r.id,null)],'Restricción eliminada');return}
    const tg=e.target.closest('[data-rtog]');if(tg){const r=S.res.get(tg.dataset.rtog);if(!r||!rCanLib(r))return;const lib=r.status==='lib';apply([op('restr',r.id,{...r,status:lib?'pend':'lib',freed:lib?'':todayIso(),libBy:lib?'':me.email,libN:lib?'':(me.name||me.email)})],lib?'Restricción reabierta':'Restricción liberada');return}
    const rg=e.target.closest('[data-rgo]');if(rg){gotoAct(rg.dataset.rgo);return}
    const rm=e.target.closest('[data-rmap]');if(rm){gotoPlano(rm.dataset.rmap);return}
    {const q=e.target.closest('[data-lqid]');if(q){libDetail(q.dataset.lqid);return}const k=e.target.closest('[data-lqask]');if(k){libAsk(k.dataset.lqask);return}if(e.target.closest('[data-lqgo]')){U.tab='lib';saveUI();render();return}}
    const ro_=e.target.closest('[data-ropen]');if(ro_){const id=ro_.dataset.ropen;rOpen.has(id)?rOpen.delete(id):rOpen.add(id);render()}};
  main.onchange=async e=>{const t=e.target;
    if(t.dataset.rf){U.rF={...(U.rF||{}),[t.dataset.rf]:t.value};render();return}
    if(t.dataset.rphoto!=null&&t.files&&t.files[0]){const r=S.res.get(t.dataset.rphoto);const f=t.files[0];t.value='';if(!r||!rCanEd(r))return;
      try{toast('Comprimiendo foto…');const data=await shrinkPhoto(f);const fid=uid('f');FOTO.set(fid,data);
        await fcol('fotos').doc(fid).set({data,restrId:r.id,pisoId:restrPiso(r)||'',by:me.email,ts:NOW()});
        const r2=S.res.get(r.id)||r;apply([op('restr',r.id,{...r2,photos:[...(r2.photos||[]),fid]})]);toast(`Foto agregada (${Math.round(data.length*.75/1024)} KB)`)}catch(err){toast('No se pudo guardar la foto: '+(err.code||err.message))}return}
    if(!t.dataset.r)return;const r=S.res.get(t.dataset.r);if(!r||!rCanEd(r))return;const f=t.dataset.f;if(SCK()&&(f==='status'||f==='freed'))return;if(AREA()&&(f==='grp'||f==='area'))return;const n={...r,[f]:t.value};
    if(SCK()&&f==='actId'){const x=S.act.get(t.value);if(!x||!myScsI().includes(x.sc)){toast('Elige una actividad de tu partida.');render();return}n.sc=x.sc}if(f==='grp'&&t.value==='campo')n.area='';
    if(f==='status'&&t.value==='lib'&&!r.freed)n.freed=todayIso();if(f==='status'&&t.value==='pend')n.freed='';if(f==='freed'&&t.value)n.status='lib';
    if(n.status==='lib'&&r.status!=='lib'){n.libBy=me.email;n.libN=me.name||me.email}if(n.status!=='lib'&&r.status==='lib'){n.libBy='';n.libN=''}if(f==='actId'&&t.value)n.pisoId=pisoOfAct(t.value);
    t.dataset.o=t.value;apply([op('restr',r.id,n)])};
  main.onfocusin=e=>{if(e.target.dataset&&e.target.dataset.alz)actFill(e.target);if(e.target.classList.contains('ci'))e.target.dataset.o=e.target.value};
  main.onmousedown=e=>{const t=e.target;if(t&&t.tagName==='SELECT'&&t.dataset.alz)actFill(t)};
  main.ontouchstart=e=>{const t=e.target;if(t&&t.tagName==='SELECT'&&t.dataset.alz)actFill(t)};
}

