"use strict";
/* LPS 911 · Lookahead › vista «Flujo» (oct 2026, decidido con el dueño).
   Gantt de solo lectura para ver por dónde va cada subcontratista: una fila por piso (desplegable en sectores) y, dentro, una
   línea por SC elegido en la leyenda (sin elegir: una sola línea «Todos los SC»). Cada día es una barra del color del SC cuya
   intensidad es la cantidad de ambientes con trabajo ese día, relativa al día más cargado de ese SC en la vista.
   Ocupa toda la pantalla (ancho y alto se reparten entre días y filas) para verla en el proyector sin Ctrl+scroll.
   Con un solo piso elegido arriba se ven sus sectores desplegados. Respeta piso, sector, SC, búsqueda, actividades y «solo semana/día». Clic en un día con trabajo → Grilla en esa actividad. */
const lkFlowOk=()=>!(typeof revOn==='function'&&revOn());
const flowTerms=()=>String(U.q||'').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean);
let FLW={cells:null};
function flowRender(el,days){
  if(U.wkF){const s=new Set(weekDays(U.wkF));days=days.filter(x=>s.has(x.d))}
  if(U.day)days=days.filter(x=>x.d===U.day);
  const nd=days.length,di=new Map(days.map((x,i)=>[x.d,i])),today=todayIso();
  const vp=visPisos(),vset=new Set(vp.map(p=>p.id));
  const sel=scSel().filter(id=>S.con.has(id));const lanes=sel.length?sel:[''];
  const aset=U.acts.length?new Set(U.acts):null,qt=flowTerms();
  const open=new Set(Array.isArray(U.flOpen)?U.flOpen:[]);
  /* agregado: «p:<piso>|<sc>» y «s:<sector>|<sc>» → por día {amb:Set, acts:[ids], t:[textos]} */
  const cells=new Map();const cell=(k,i)=>{let v=cells.get(k);if(!v){v=new Array(nd).fill(null);cells.set(k,v)}return v[i]||(v[i]={amb:new Set(),acts:[],t:[]})};
  const secsOf=new Map();
  for(const s of S.sec.values()){const p=pisoOfSecObj(s);if(!vset.has(p))continue;if(U.sector&&U.sector!==s.id)continue;(secsOf.get(p)||secsOf.set(p,[]).get(p)).push(s)}
  for(const x of S.act.values()){const ad=x.days;if(!Array.isArray(ad)||!ad.length||!scOk(x.sc))continue;
    const am=S.amb.get(x.ambId);if(!am)continue;const pid=pisoOfAmb(x.ambId);if(!vset.has(pid))continue;if(U.sector&&am.sectorId!==U.sector)continue;
    if(aset&&!aset.has(an(x.name)))continue;
    if(qt.length){const h=`${x.name||''} ${am.code||''} ${am.name||''} ${conOf(x.sc).name}`.toLowerCase();if(!qt.some(t=>h.includes(t)))continue}
    const ln=sel.length?x.sc:'';
    for(const d of ad){const i=di.get(d);if(i===undefined)continue;
      for(const k of['p:'+pid,'s:'+am.sectorId]){const c=cell(k+'|'+ln,i);c.amb.add(x.ambId);c.acts.push(x.id);if(c.t.length<8)c.t.push(`${am.code||''} ${am.name||''} · ${x.name||'(sin nombre)'}`.trim())}}}
  /* máximo por SC y por nivel (piso / sector) para la intensidad */
  const mx=new Map();for(const[k,v]of cells){const lv=k[0],ln=k.slice(k.indexOf('|')+1),mk=lv+'|'+ln;let m=mx.get(mk)||0;for(const c of v)if(c&&c.amb.size>m)m=c.amb.size;mx.set(mk,m)}
  FLW={cells};
  const rows=[];
  for(const p of vp){const ss=(secsOf.get(p.id)||[]).sort(byOrder);rows.push({k:'p:'+p.id,lv:0,pid:p.id,lab:`${p.code||''} · ${p.name||''}`,n:ss.length,open:open.has(p.id)});
    if(open.has(p.id)||U.sector||U.piso)for(const s of ss)rows.push({k:'s:'+s.id,lv:1,pid:p.id,lab:`${s.code||''} · ${s.name||''}`})}
  if(!rows.length||!nd){el.innerHTML=`<div class="empty">${nd?'No hay pisos en esta vista.':'No hay días en la ventana elegida.'}</div>`;return}
  /* encabezado: semanas y días */
  const wk=[];for(const x of days){const l=wk[wk.length-1];if(l&&l.w===x.w)l.n++;else wk.push({w:x.w,n:1,d0:x.d})}
  const sub=sel.length?2:1;
  let h=`<div class="flhint">${sel.length?`Flujo de ${sel.length===1?esc(conOf(sel[0]).name):sel.length+' subcontratistas'}`:'Todos los subcontratistas juntos · elige uno en la leyenda (Ctrl+clic para varios) para ver su flujo'} · más oscuro = más ambientes ese día · toca un día para verlo en la grilla</div>
  <table class="flt${sel.length?' fl2':''}" style="--nd:${nd}"><colgroup><col class="flc0">${sel.length?'<col class="flc1">':''}${days.map(()=>'<col>').join('')}</colgroup><thead><tr><th class="flx" colspan="${sub}" rowspan="2">${U.piso?'Piso y sectores':'Piso'}${sel.length?' · Subcontratista':''}</th>${wk.map(w=>`<th class="flwk" colspan="${w.n}">Sem ${w.w} <small>${fmtD(w.d0)}</small></th>`).join('')}</tr>
  <tr>${days.map(x=>`<th class="fldh${x.d===today?' tdy':''}${isWork(x.d)?'':' hol'}${x.i===0?' wk0':''}" title="${esc(fmtD(x.d))}${isWork(x.d)?'':' · '+esc(nwReason(x.d)||'no laborable')}"><b>${DL[x.i]}</b><span>${x.d.slice(8)}</span></th>`).join('')}</tr></thead><tbody>`;
  for(const r of rows){lanes.forEach((ln,li)=>{const k=r.k+'|'+ln,v=cells.get(k),m=mx.get(r.k[0]+'|'+ln)||1;const c=ln?conOf(ln).color:'var(--accent)';
    h+=`<tr class="fl${r.lv}${li===lanes.length-1?' flend':''}">`;
    if(li===0)h+=`<th class="fln fll${r.lv}" rowspan="${lanes.length}" scope="rowgroup">${r.lv===0&&r.n&&!U.sector&&!U.piso?`<button class="flt0" data-flt="${r.pid}" aria-expanded="${r.open}" title="${r.open?'Plegar':'Ver por sector'}">${r.open?'▾':'▸'}</button>`:''}<span>${esc(r.lab)}</span></th>`;
    if(sel.length)h+=`<th class="flsc" scope="row"><i style="--c:${c}"></i>${esc(conOf(ln).name)}</th>`;
    for(let i=0;i<nd;i++){const x=days[i],q=v&&v[i];const cls=`fd${x.d===today?' tdy':''}${isWork(x.d)?'':' hol'}${x.i===0?' wk0':''}`;
      if(!q){h+=`<td class="${cls}"></td>`;continue}
      const pv=v[i-1],nx=v[i+1];const n=q.amb.size;const a=(.28+.72*Math.min(1,n/m)).toFixed(2);
      const tip=`${ln?conOf(ln).name:'Todos los SC'} · ${r.lab} · ${fmtD(x.d)}\n${n} ambiente${n>1?'s':''}, ${q.acts.length} actividad${q.acts.length>1?'es':''}\n${q.t.join('\n')}${q.acts.length>q.t.length?'\n…':''}`;
      h+=`<td class="${cls} on${pv?'':' rs'}${nx?'':' re'}" data-k="${k}" data-i="${i}" title="${esc(tip)}"><i style="--c:${c};--a:${a}"></i></td>`}
    h+='</tr>'})}
  el.innerHTML=h+'</tbody></table>';
  if(!el.dataset.w){el.dataset.w='1';el.addEventListener('click',flowClick);window.addEventListener('resize',()=>{if(!el.hidden)flowFit(el)},{passive:true})}
  flowFit(el);
}
/* reparte el alto disponible entre las filas (entre 16 y 40 px cada una) para que entren todos los pisos */
function flowFit(el){requestAnimationFrame(()=>{const t=el.querySelector('table.flt');if(!t||el.hidden)return;
  const top=el.getBoundingClientRect().top,av=Math.max(240,window.innerHeight-top-12);el.style.height=av+'px';
  const hh=t.tHead?t.tHead.offsetHeight:50,hint=(el.querySelector('.flhint')||{}).offsetHeight||0,n=t.tBodies[0]?t.tBodies[0].rows.length:1;
  const rh=Math.max(16,Math.min(40,Math.floor((av-hh-hint-4)/Math.max(1,n))));el.style.setProperty('--flh',rh+'px')})}
function flowClick(e){const b=e.target.closest('[data-flt]');
  if(b){const id=b.dataset.flt;const o=new Set(Array.isArray(U.flOpen)?U.flOpen:[]);o.has(id)?o.delete(id):o.add(id);U.flOpen=[...o];saveUI();requestRender();return}
  const td=e.target.closest('td.on[data-k]');if(!td||!FLW.cells)return;const v=FLW.cells.get(td.dataset.k);const q=v&&v[+td.dataset.i];if(!q||!q.acts.length)return;
  const ln=td.dataset.k.slice(td.dataset.k.indexOf('|')+1);
  const aid=[...q.acts].sort((a,b)=>byOrder(S.act.get(a)||{},S.act.get(b)||{}))[0];
  U.lkV='grid';if(ln)U.sc=ln;saveUI();gotoAct(aid)}
