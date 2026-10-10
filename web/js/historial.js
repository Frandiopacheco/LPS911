"use strict";
/* LPS 911 · Historial del lookahead por fecha: cambios directos del ingeniero (lhlog) y decisiones sobre propuestas de SC (lhphist).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales.
   lhlog/{id}: {t, d (día en Lima), by, n, label, tab, items:[{id, nm, amb, sc, k:'new'|'mod'|'del'|'arch'|'res', b:{…}, a:{…}}], more}
   Se escribe en segundo plano después de cada apply() que toca actividades (no frena la pantalla); no se edita ni se borra. */
const HFLDS=['days','qty','metrado','und','name','sc','ambId'];
const HMAX=150;
/** registra un cambio del lookahead (lo llama apply) */
function lhLog(ops,label,extra){try{if(!db||!me||!canWrite||(typeof PM==='function'&&PM()))return;const items=[];
  for(const o of ops){if(!o||o.col!=='acts')continue;const b=o.before,a=o.after;const k=!b?'new':!a?'del':a.arch&&!b.arch?'arch':!a.arch&&b.arch?'res':'mod';
    const pick=x=>{const r={};if(!x)return r;HFLDS.forEach(f=>{if(x[f]!==undefined&&x[f]!==null)r[f]=x[f]});return r};
    const B=pick(b),A=pick(a);if(k==='mod'&&canon(B)===canon(A))continue;const x=a||b;const am=S.amb.get(x.ambId)||(ARCH.amb&&ARCH.amb.get(x.ambId));
    const keep=f=>k==='mod'?canon(B[f]??null)!==canon(A[f]??null):k==='new'?f in A:false;const bb={},aa={};HFLDS.forEach(f=>{if(keep(f)){if(f in B)bb[f]=B[f];if(f in A)aa[f]=A[f]}});
    items.push({id:o.id,nm:x.name||'',amb:am?am.code:'',sc:x.sc||'',k,b:bb,a:aa})}
  if(!items.length)return;const t=NOW();const gid=t+'_'+Math.random().toString(36).slice(2,8);const np=Math.ceil(items.length/HMAX);
  /* todo el detalle se guarda: en tandas de HMAX, documentos del mismo grupo (g, parte pt de np); la ventana los junta */
  /* en segundo plano, pero si falla se ve en la barra (bgWrite, base.js) */
  for(let i=0;i<np;i++)bgWrite(fcol('lhlog').doc(i?gid+'_'+i:gid).set({t,d:todayIso(),by:(me.email||'').toLowerCase(),n:me.name||me.email,label:label||'',tab:U.tab||'',items:items.slice(i*HMAX,(i+1)*HMAX),...(np>1?{g:gid,pt:i,np}:{}),...(extra||{})}));
  return gid}catch(e){}}
/** junta las partes de un mismo cambio (g) en una sola entrada */
function histMerge(L){const out=[],by=new Map();for(const d of L.slice().sort((a,b)=>(a.pt||0)-(b.pt||0))){if(!d.g){out.push(d);continue}const c=by.get(d.g);if(c){c.items=[...c.items,...(d.items||[])];continue}const n={...d,items:[...(d.items||[])]};by.set(d.g,n);out.push(n)}return out}
/* ---- ventana «Historial» (Lookahead): un día a la vez, lo más reciente arriba ---- */
const HST={d:'',f:'all',q:'',L:null,P:null,busy:false};
async function histLoad(){if(!db){HST.L=[];HST.P=[];return}HST.busy=true;histDraw();const t0=Date.parse(HST.d+'T00:00:00Z')+LIMA_OFF,t1=t0+864e5;
  try{const[a,b]=await Promise.all([fcol('lhlog').where('t','>=',t0).where('t','<',t1).get(),fcol('lhphist').where('t','>=',t0).where('t','<',t1).get()]);
    HST.L=histMerge(a.docs.map(d=>({...d.data(),id:d.id})));HST.P=b.docs.map(d=>({...d.data(),id:d.id}))}
  catch(e){HST.L=[];HST.P=[];toast('No se pudo leer el historial: '+(e.code||e.message))}HST.busy=false;histDraw()}
function histItem(it){const sc=conOf(it.sc).name;const head=`<span class="mono">${esc(it.amb||'')}</span> ${esc(it.nm||'(sin nombre)')} <span class="mu">· ${esc(sc)}</span>`;
  const txt=it.k==='new'?`Nueva actividad${(it.a.days||[]).length?' · '+rngTxt(it.a.days):''}`:it.k==='del'?'Eliminada':it.k==='arch'?'Enviada a la Papelera':it.k==='res'?'Recuperada de la Papelera':
    (()=>{const b={days:[],qty:{},...it.b},a={days:[],qty:{},...it.a};if(!('days' in it.b)){b.days=a.days=[]}if(!('qty' in it.b)){b.qty=a.qty={}}const L=[];const p=propPlain(b,a);if(p)L.push(p);
      if('sc' in it.a)L.push(`partida ${conOf(it.b.sc).name} → ${conOf(it.a.sc).name}`);if('ambId' in it.a){const x=S.amb.get(it.a.ambId);L.push(`pasa a ${x?x.code:'otro ambiente'}`)}return L.join(' · ')||'Cambio de orden'})();
  return`<li>${head}<small>${esc(txt)}</small></li>`}
const HST_ST={ok:'✓ Aceptó',shift:'↔ Aceptó con otra fecha',rej:'✗ Rechazó'};
function histDraw(){const el=$('#lqm');if(!el||!el.querySelector('.hst'))return;const q=fold(HST.q||'').trim();
  const E=[];if(HST.f!=='prop')for(const g of HST.L||[]){const its=(g.items||[]).filter(it=>!q||fold(it.nm+' '+it.amb+' '+conOf(it.sc).name).includes(q));if(its.length)E.push({t:g.t,h:`<div class="hsi"><div class="hsh"><b>${hhmm(g.t)}</b> ${esc(g.n||'')}${g.label?` · ${esc(g.label)}`:g.tab==='mapa'?' · Plan diario':''}</div><ul>${its.slice(0,HMAX).map(histItem).join('')}${its.length>HMAX?`<li><details><summary class="mu">y ${its.length-HMAX} más…</summary><ul>${its.slice(HMAX).map(histItem).join('')}</ul></details></li>`:''}${g.more?`<li class="mu">y ${g.more} más…</li>`:''}</ul></div>`})}
  if(HST.f!=='dir')for(const h of HST.P||[]){if(q&&!fold((h.name||'')+' '+(h.amb||'')+' '+conOf(h.sc).name).includes(q))continue;
    E.push({t:h.t,h:`<div class="hsi pr"><div class="hsh"><b>${hhmm(h.t)}</b> ${esc(h.n||'')} · ${HST_ST[h.st]||esc(h.st||'')} la propuesta de ${esc(conOf(h.sc).name)}${h.undone?' <span class="pill neu">deshecho</span>':''}</div><ul><li><span class="mono">${esc((h.amb||'').split(' ')[0])}</span> ${esc(h.name||'')}<small>${h.kind==='del'?'Pedía quitarla':h.kind==='new'?'Actividad nueva':''}${h.from||h.to?` ${esc(h.from||'—')} → ${esc(h.to||'—')}`:''}${h.late?' · fuera de plazo'+(h.lateNote?': '+esc(h.lateNote):''):''}${h.note?' · '+esc(h.note):''}</small></li></ul></div>`})}
  E.sort((a,b)=>b.t-a.t);
  el.querySelector('.hstl').innerHTML=HST.busy?'<div class="empty">Cargando…</div>':E.length?E.map(e=>e.h).join(''):`<div class="empty">Sin cambios ${HST.f==='prop'?'de propuestas ':HST.f==='dir'?'directos ':''}el ${fmtD(HST.d)}.</div>`;
  el.querySelector('.hstd').textContent=`${DOW_N[pd(HST.d).getUTCDay()]} ${fmtD(HST.d)}`}
function histOpen(){HST.d=HST.d||todayIso();lqModal(`<div class="lqtop"><b>Historial del lookahead</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
  <div class="hst"><div class="hstb"><button class="ib" data-hd="-1" aria-label="Día anterior">‹</button><span class="hstd"></span><button class="ib" data-hd="1" aria-label="Día siguiente">›</button><input type="date" id="hstdt" value="${HST.d}" aria-label="Elegir día">
    <span class="seg" id="hstf"><button data-f="all" class="${HST.f==='all'?'on':''}">Todo</button><button data-f="dir" class="${HST.f==='dir'?'on':''}">Cambios directos</button><button data-f="prop" class="${HST.f==='prop'?'on':''}">Propuestas</button></span>
    <input class="tin" id="hstq" type="search" placeholder="Buscar actividad, ambiente o SC…" value="${esc(HST.q)}"></div>
    <div class="hstl"></div><p class="note">Se registran desde que existe el historial: cada cambio del lookahead (quién, a qué hora y qué cambió) y cada decisión sobre propuestas de subcontratistas.</p></div>`,
  e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.hd){HST.d=addD(HST.d,+b.dataset.hd);$('#hstdt').value=HST.d;histLoad();return}if(b.dataset.f){HST.f=b.dataset.f;b.parentNode.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));histDraw()}},
  e=>{if(e.target.id==='hstdt'&&e.target.value){HST.d=e.target.value;histLoad()}});
  const q=$('#hstq');if(q)q.oninput=()=>{HST.q=q.value;histDraw()};histLoad()}
