"use strict";
/* LPS 911 · Sesión pull (pull planning con pósits), oct 2026, decidido con el dueño (docs/ia/pull.md).
   pull/{sid}: {nom, piso, ambs:[ambId], h:{hid:{n,tipo:'ingreso'|'entrega',d}}, ps:{pid:{n,sc,amb,d0,dur,src?,nw?,del?}},
     ln:{'a>b':1}, buf, base:{actId:{days,name,sc}}, lk:{pid:{by,n,t}}, st:'abierta', apl?, arch?, by, n, ts}
   - La sesión es un borrador: solo LEE el lookahead al crearse (base) y no escribe en él hasta «Aplicar al lookahead»
     (revisión con diferencias; un solo apply, se deshace junto). Solo cambia días desde mañana.
   - Se sincroniza en tiempo real (laptop que proyecta + tablet en pantalla completa): cada cambio va por campo
     (ps.<pid>.d0…), así dos personas no se pisan; mientras alguien arrastra un pósit queda bloqueado para el resto (lk).
   - Enlaces: a>b = «a termina antes de que empiece b». Hitos: ingreso (no empezar antes de) y entrega (terminar a más tardar). */
const PUL=new Map();let pulUn=null,pulErr=null;
const PU={sid:'',amb:'',sel:'',selL:'',ghost:false,fs:false,drag:null,rev:false,add:null,hitos:false,newS:null,undo:[],pend:false,apOv:false,apRs:true};
const pulEd=()=>!!me&&(me.role==='admin'||me.role==='editor');
const PU_W=()=>PU.fs?64:56, PU_LW=180, PU_HH=50;
function ensurePull(){if(!db||pulUn||!pulEd())return;
  pulUn=fcol('pull').onSnapshot(sn=>{PUL.clear();sn.docs.forEach(d=>PUL.set(d.id,{...d.data(),id:d.id}));pulErr=null;if(U.tab==='pull'){if(PU.drag)PU.pend=true;else requestRender()}},
    e=>{pulErr=e&&e.code||'error';if(U.tab==='pull')requestRender()});
  unsubs.push(()=>{if(pulUn)pulUn();pulUn=null;PUL.clear()})}
const puCur=()=>PU.sid?PUL.get(PU.sid):null;
const puKey=(a,b)=>a+'>'+b;
const puIsH=id=>String(id).indexOf('H:')===0;
const puFirst=()=>{let d=addD(todayIso(),1);let g=0;while(!isWork(d)&&g++<30)d=addD(d,1);return d};
/** días hábiles del tablero: desde mañana hasta pasado lo último programado o el último hito (mínimo 6 semanas) */
function puDays(s){const f=puFirst();let last=wshift(f,35);
  Object.values(s.ps||{}).forEach(p=>{if(!p.del&&p.d0){const e=wshift(p.d0,Math.max(0,(+p.dur||1)-1));if(e>last)last=e}});
  Object.values(s.h||{}).forEach(h=>{if(h.d&&h.d>last)last=h.d});last=wshift(last,8);
  const L=[];let d=f,g=0;while(d<=last&&g++<400){if(isWork(d))L.push(d);d=addD(d,1)}return L}
const puWk=d=>{const P0=P();const r=P0.refDate||'2026-09-28',w0=+P0.refWeek||58;return w0+Math.floor((pd(d)-pd(r))/(7*864e5))};
const puShort=d=>{if(!d)return'—';const x=pd(d);return String(x.getUTCDate()).padStart(2,'0')+'/'+String(x.getUTCMonth()+1).padStart(2,'0')};
const PU_WD=['dom','lun','mar','mié','jue','vie','sáb'];
const puFmt=d=>{if(!d)return'—';const x=pd(d);return PU_WD[x.getUTCDay()]+' '+fmtD(d)};
/** nodos (pósits vivos y hitos) con su inicio/fin como índice de día hábil */
function puNodes(s,IX){const N={};const ix=d=>IX.has(d)?IX.get(d):(d<puFirst()?-1:IX.size);
  Object.entries(s.ps||{}).forEach(([id,p])=>{if(p.del)return;const a=ix(p.d0);N[id]={s:a,e:a+Math.max(1,+p.dur||1)-1,p,id}});
  Object.entries(s.h||{}).forEach(([id,h])=>{const a=ix(h.d);N['H:'+id]={s:a,e:a-1,h,id:'H:'+id}});return N}
const puLinks=s=>Object.keys(s.ln||{}).map(k=>{const i=k.indexOf('>');return{a:k.slice(0,i),b:k.slice(i+1),k}});
function puBad(s,N){return puLinks(s).filter(l=>N[l.a]&&N[l.b]&&N[l.a].e>=N[l.b].s)}
const puName=(s,id)=>{if(puIsH(id)){const h=(s.h||{})[id.slice(2)];return h?h.n:'hito'}const p=(s.ps||{})[id];return p?p.n:''};
/* ---------- escritura (por campo; se refleja al instante en la copia local) ---------- */
function puSetPath(o,path,v){const k=path.split('.');let x=o;for(let i=0;i<k.length-1;i++){if(!x[k[i]]||typeof x[k[i]]!=='object')x[k[i]]={};x=x[k[i]]}if(v===undefined)delete x[k[k.length-1]];else x[k[k.length-1]]=v}
function puWrite(upd,undoable){const s=puCur();if(!s)return;if(undoable!==false){PU.undo.push({sid:s.id,ps:clone(s.ps||{}),ln:clone(s.ln||{}),h:clone(s.h||{})});if(PU.undo.length>60)PU.undo.shift()}
  const DEL=firebase.firestore.FieldValue.delete();const out={};
  for(const[k,v]of Object.entries(upd)){out[k]=v===undefined?DEL:v;puSetPath(s,k,v)}
  out.ts=NOW();out.eb=me.email||'';fcol('pull').doc(s.id).update(out).catch(e=>toast('No se pudo guardar en la sesión: '+(e.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(e.code||e.message))));requestRender()}
function puUndo(){const u=PU.undo.pop();const s=puCur();if(!u||!s||u.sid!==s.id){toast('No hay nada que deshacer en esta sesión');return}
  s.ps=u.ps;s.ln=u.ln;s.h=u.h;fcol('pull').doc(s.id).update({ps:u.ps,ln:u.ln,h:u.h,ts:NOW(),eb:me.email||''}).catch(e=>toast('No se pudo deshacer: '+(e.code||e.message)));toast('Se deshizo el último cambio de la sesión');requestRender()}
function puLink(a,b){const s=puCur();if(!s||a===b)return;if(puIsH(a)&&puIsH(b)){toast('Enlaza un hito con una actividad, no dos hitos entre sí.');return}
  if((s.ln||{})[puKey(a,b)]){toast('Ese enlace ya existe.');return}
  const seen=new Set(),st=[b];const L=puLinks(s);while(st.length){const x=st.pop();if(x===a){toast('No se puede: eso cerraría un círculo de dependencias.');return}if(seen.has(x))continue;seen.add(x);L.forEach(l=>{if(l.a===x)st.push(l.b)})}
  puWrite({['ln.'+puKey(a,b)]:1});toast(puIsH(a)?`«${puName(s,b)}» no puede empezar antes de «${puName(s,a)}».`:`«${puName(s,a)}» tiene que terminar antes de «${puName(s,b)}».`)}
/* ---------- crear sesión ---------- */
function puAmbsOf(piso){const secs=[...S.sec.values()].filter(x=>x.pisoId===piso).sort((a,b)=>(a.order||0)-(b.order||0));const L=[];
  secs.forEach(sc=>[...S.amb.values()].filter(a=>a.sectorId===sc.id).sort((a,b)=>(a.order||0)-(b.order||0)).forEach(a=>L.push({a,sec:sc})));return L}
function puSeed(ambs){const t=todayIso(),ps={},base={};
  [...S.act.values()].filter(x=>ambs.includes(x.ambId)&&!DONE.has(x.id)).forEach(x=>{const ds=(x.days||[]).slice().sort();const fut=ds.filter(d=>d>t);if(!fut.length)return;
    ps[x.id]={n:x.name||'',sc:x.sc||'',amb:x.ambId,d0:fut[0],dur:fut.length,src:x.id};base[x.id]={days:ds,name:x.name||'',sc:x.sc||''}});return{ps,base}}
async function puCreate(){const N=PU.newS;if(!N)return;const nom=(N.nom||'').trim();if(!N.piso){toast('Elige el piso');return}if(!N.ambs.length){toast('Elige al menos un ambiente');return}
  const{ps,base}=puSeed(N.ambs);let last=puFirst();Object.values(ps).forEach(p=>{const e=wshift(p.d0,p.dur-1);if(e>last)last=e});
  const id=uid('pull');const doc={nom:nom||('Sesión '+fmtD(todayIso())),piso:N.piso,ambs:N.ambs,ps,base,ln:{},h:{ent:{n:'Entrega (por confirmar)',tipo:'entrega',d:wshift(last,2)}},buf:1,lk:{},st:'abierta',by:me.email||'',n:me.name||'',t0:NOW(),ts:NOW()};
  try{await fcol('pull').doc(id).set(doc);PUL.set(id,{...doc,id});PU.newS=null;PU.sid=id;PU.amb=N.ambs[0];PU.undo=[];toast(`Sesión creada con ${Object.keys(ps).length} pósits. El lookahead no cambia hasta que la apliques.`);requestRender()}
  catch(e){toast('No se pudo crear la sesión: '+(e.code==='permission-denied'?'falta publicar las reglas nuevas de Firestore':(e.code||e.message)))}}
/* ---------- programar hacia atrás desde los hitos ---------- */
function puBackward(){const s=puCur();if(!s)return;const D=puDays(s);const IX=new Map(D.map((d,i)=>[d,i]));const N=puNodes(s,IX);const buf=+s.buf||0;
  const succ={};puLinks(s).forEach(l=>{if(N[l.a]&&N[l.b])(succ[l.a]=succ[l.a]||[]).push(l.b)});
  const reach={};const rch=(id,stk)=>{if(puIsH(id))return true;if(id in reach)return reach[id];if(stk[id])return false;stk[id]=1;return reach[id]=(succ[id]||[]).some(x=>rch(x,stk))};
  const memo={};const start=id=>{if(puIsH(id))return N[id].s;if(id in memo)return memo[id];let lf=Infinity;(succ[id]||[]).forEach(x=>{if(rch(x,{}))lf=Math.min(lf,start(x)-1-(puIsH(x)?buf:0))});return memo[id]=lf-Math.max(1,+N[id].p.dur||1)+1};
  const upd={};let late=0,mv=0;Object.keys(N).forEach(id=>{if(puIsH(id)||!rch(id,{}))return;let a=start(id);if(!isFinite(a))return;if(a<0){a=0;late++}a=Math.min(a,D.length-1);const d=D[a];if(d!==N[id].p.d0){upd['ps.'+id+'.d0']=d;mv++}});
  if(!mv){toast(late?`${late} pósit(s) no alcanzan: tendrían que haber empezado antes de mañana.`:'Nada que mover: todo ya está programado hacia atrás desde los hitos.');return}
  puWrite(upd);toast(`Programado hacia atrás desde los hitos: ${mv} pósit(s) movidos`+(late?` · ${late} no alcanzan (tendrían que empezar antes de mañana)`:''))}
/** margen entre «llegada + lo que depende de ella» y cada entrega (días hábiles; negativo = no alcanza) */
function puMargins(s,N){const preds={};puLinks(s).forEach(l=>{if(N[l.a]&&N[l.b])(preds[l.b]=preds[l.b]||[]).push(l.a)});const out=[];
  Object.entries(s.h||{}).filter(([,h])=>h.tipo==='ingreso').forEach(([hid,hi])=>{const src='H:'+hid;const memo={};
    const ef=(id,stk)=>{if(id===src)return N[src].s-1;if(id in memo)return memo[id];if(puIsH(id)||stk[id])return null;stk[id]=1;let es=null;(preds[id]||[]).forEach(p=>{const v=ef(p,stk);if(v!==null)es=es===null?v+1:Math.max(es,v+1)});return memo[id]=es===null?null:es+Math.max(1,+N[id].p.dur||1)-1};
    Object.entries(s.h||{}).filter(([,h])=>h.tipo==='entrega').forEach(([eid,he])=>{let f=null;(preds['H:'+eid]||[]).forEach(p=>{const v=ef(p,{});if(v!==null)f=f===null?v:Math.max(f,v)});if(f!==null)out.push({from:hi.n,to:he.n,m:N['H:'+eid].s-1-f})})});return out}
/* ---------- dibujo ---------- */
function renderPull(main){ensurePull();if(typeof ensureMcat==='function')ensureMcat();
  if(PU.drag){PU.pend=true;return}
  const s=puCur();if(PU.sid&&!s&&PUL.size){PU.sid=''}
  if(!s){renderPullList(main);return}
  const bw=main.querySelector('.pubw');const sl=bw?bw.scrollLeft:0,stp=bw?bw.scrollTop:0;
  main.innerHTML=puBoard(s);const nb=main.querySelector('.pubw');if(nb){nb.scrollLeft=sl;nb.scrollTop=stp}
  if(!main.dataset.puw){main.dataset.puw='1';puWire(main)}}
function renderPullList(main){const L=[...PUL.values()].filter(x=>!x.arch&&(!U.piso||x.piso===U.piso)).sort((a,b)=>(b.ts||0)-(a.ts||0));
  let h=`<div class="scroll"><div class="wrap">${pageHead('Sesión pull','Planificación hacia atrás con pósits, proyectada en la reunión. El lookahead no cambia hasta que apliques la sesión.',`<button class="ib pri" data-pu="new">+ Nueva sesión</button>`)}`;
  h+=helpBox('¿Cómo funciona?',`<p>Eliges los ambientes y el sistema trae como pósits sus actividades del lookahead desde mañana. En la reunión se arrastran, se enlazan jalando desde el círculo → de cada pósit y se fijan los hitos: <b>ingreso</b> (p. ej. llegada de equipos: no se puede empezar antes) y <b>entrega</b> (fecha contractual: hay que terminar antes). «Programar hacia atrás» acomoda todo desde los hitos y lo que no alcanza se pinta en rojo.</p><p>La sesión se ve igual en la laptop que proyecta y en la tablet (pantalla completa): lo que uno mueve, el otro lo ve al instante. Al final, «Revisar y aplicar» muestra las diferencias con el lookahead y lo aplica en un solo paso (se puede deshacer).</p>`);
  if(pulErr)h+=`<div class="callout warn">No se pudieron leer las sesiones (${esc(pulErr)}). ${pulErr==='permission-denied'?'Falta publicar las reglas nuevas de Firestore.':''}</div>`;
  if(!L.length)h+=`<div class="empty">${U.piso?'Aún no hay sesiones en este piso.':'Aún no hay sesiones.'} Crea la primera con «+ Nueva sesión».</div>`;
  else h+=`<div class="pulist">${L.map(x=>{const n=Object.values(x.ps||{}).filter(p=>!p.del).length;const am=(x.ambs||[]).map(a=>(S.amb.get(a)||{}).name).filter(Boolean);
    return`<div class="card pucard"><div class="pucmain"><b>${esc(x.nom||'Sesión')}</b><span class="mu">${esc((S.pis.get(x.piso)||{}).name||'')} · ${am.length} ambiente${am.length===1?'':'s'} · ${n} pósits · ${Object.keys(x.h||{}).length} hitos</span><small class="mu">${esc(am.slice(0,4).join(' · '))}${am.length>4?' …':''}</small><small class="mu">${x.apl?`Aplicada al lookahead el ${fmtD(ldt(x.apl.t).slice(0,10))} por ${esc(x.apl.n||'')}`:'Borrador: aún no se aplica al lookahead'} · editada el ${fmtD(ldt(x.ts||x.t0||0))}</small></div>
      <div class="pucact"><button class="ib pri" data-puo="${esc(x.id)}">Abrir</button><button class="ib" data-pua="${esc(x.id)}">Archivar</button></div></div>`}).join('')}</div>`;
  h+=`</div></div>`;if(PU.newS)h+=puNewDlg();main.innerHTML=h;if(!main.dataset.puw){main.dataset.puw='1';puWire(main)}}
function puNewDlg(){const N=PU.newS;const pisos=[...S.pis.values()].sort((a,b)=>(a.order||0)-(b.order||0));const A=N.piso?puAmbsOf(N.piso):[];const q=(N.q||'').toLowerCase();
  const vis=A.filter(o=>!q||(o.a.name+' '+o.a.code+' '+o.sec.name).toLowerCase().includes(q));
  return`<div class="pumod" data-puclose="1"><div class="pudlg" role="dialog" aria-modal="true" aria-label="Nueva sesión pull"><h3>Nueva sesión pull</h3>
    <label class="pulb" for="punom">Nombre</label><input id="punom" class="tin" data-pun="nom" value="${esc(N.nom||'')}" placeholder="p. ej. Salas de operadores P2">
    <label class="pulb" for="pupiso">Piso</label><select id="pupiso" class="tin" data-pun="piso"><option value="">Elige el piso…</option>${pisos.map(p=>`<option value="${esc(p.id)}"${p.id===N.piso?' selected':''}>${esc(p.name)}</option>`).join('')}</select>
    ${N.piso?`<label class="pulb" for="puq">Ambientes (${N.ambs.length} elegidos)</label><input id="puq" class="tin" data-pun="q" value="${esc(N.q||'')}" placeholder="Buscar ambiente…">
    <div class="puambl">${vis.map(o=>{const on=N.ambs.includes(o.a.id);const n=[...S.act.values()].filter(x=>x.ambId===o.a.id&&(x.days||[]).some(d=>d>todayIso())).length;return`<button type="button" class="puamb${on?' on':''}" data-puamb="${esc(o.a.id)}"><span>${on?'✓ ':''}${esc(o.a.code||'')} ${esc(o.a.name||'')}</span><small>${esc(o.sec.name||'')} · ${n} act.</small></button>`}).join('')||'<span class="mu">Sin ambientes.</span>'}</div>`:''}
    <div class="pudf"><span class="mu">Se traen las actividades de esos ambientes con días desde mañana. El lookahead no cambia.</span><button class="ib" data-pu="newx">Cancelar</button><button class="ib pri" data-pu="create">Crear sesión</button></div></div></div>`}
function puBoard(s){const D=puDays(s);const IX=new Map(D.map((d,i)=>[d,i]));const W=PU_W(),LW=PU_LW,HH=PU_HH;const N=puNodes(s,IX);const B=puBad(s,N);const ed=pulEd();
  const ambs=(s.ambs||[]).filter(a=>S.amb.has(a));if(!ambs.includes(PU.amb))PU.amb=ambs[0]||'';
  const badIds=new Set();B.forEach(l=>{badIds.add(l.a);badIds.add(l.b)});
  const live=Object.entries(s.ps||{}).filter(([,p])=>!p.del&&p.amb===PU.amb).map(([id,p])=>({id,...p,s:N[id].s}));
  const scs=[...new Set(live.map(p=>p.sc))].sort((a,b)=>{const ia=PU_ORD(a),ib=PU_ORD(b);return ia-ib||conOf(a).name.localeCompare(conOf(b).name,'es')});
  const ROWH=PU.fs?64:56,PH=PU.fs?56:48,HS=PU.fs?34:28;const pos={};let y=HH;const now=NOW();
  const lanes=scs.map(sc=>{const L=live.filter(p=>p.sc===sc).sort((a,b)=>a.s-b.s);const ends=[];L.forEach(p=>{let r=0;while(r<ends.length&&ends[r]>=p.s)r++;ends[r]=p.s+Math.max(1,+p.dur||1)-1;p._r=r});
    const h=Math.max(1,ends.length)*ROWH+8;const c=conOf(sc).color||'#5A7D9A';
    const ps=L.map(p=>{const dur=Math.max(1,+p.dur||1);const x0=Math.max(0,p.s);const top=4+p._r*ROWH;const w=dur*W-6;pos[p.id]={x:LW+x0*W+3,w,y:y+top+PH/2};
      const lk=(s.lk||{})[p.id];const lkO=lk&&lk.by!==me.email&&now-(lk.t||0)<20000;const bad=badIds.has(p.id)||p.s<0;const sel=PU.sel===p.id;
      const tag=lkO?`✋ ${esc(lk.n||'otro')}`:p.s<0?'antes de mañana':p.nw?`nuevo · ${dur} d`:bad?`choque · ${dur} d`:`${dur} d`;
      const gh=PU.ghost&&p.src&&s.base&&s.base[p.src]?(()=>{const bf=s.base[p.src].days.filter(d=>d>todayIso());if(!bf.length)return'';const b0=IX.has(bf[0])?IX.get(bf[0]):-1;if(b0===p.s&&bf.length===dur)return'';return`<div class="pugh" style="left:${Math.max(0,b0)*W+3}px;top:${top}px;width:${bf.length*W-6}px;height:${PH}px;--c:${c}"></div>`})():'';
      return`${gh}<div class="pup${bad?' bad':''}${sel?' sel':''}${lkO?' lko':''}" data-pid="${esc(p.id)}" style="left:${x0*W+3}px;top:${top}px;width:${w}px;height:${PH}px;--c:${c};--t:${puTint(c)};padding-right:${HS/2+4}px"><span class="put">${tag}</span><span class="pun">${esc(p.n||'(sin nombre)')}</span></div>${ed&&!lkO?`<div class="puh" data-puh="${esc(p.id)}" style="left:${x0*W+3+w-HS/2}px;top:${top+PH/2-HS/2}px;width:${HS}px;height:${HS}px;--c:${c}" title="Jala hasta lo que va después" aria-label="Jalar para enlazar"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 6H9M6.5 3L9.5 6L6.5 9"/></svg></div>`:''}`}).join('');
    const row=`<div class="pulane" style="height:${h}px"><div class="pulab"><div><b><i style="--c:${c}"></i>${esc(conOf(sc).name)}</b><small>${L.length} pósit${L.length===1?'':'s'}</small></div>${ed?`<button class="ib puadd" data-puadd="${esc(sc)}" aria-label="Agregar actividad de ${esc(conOf(sc).name)}" title="Agregar actividad">+</button>`:''}</div><div class="putrk" style="width:${D.length*W}px;--w:${W}px">${ps}</div></div>`;y+=h;return row}).join('');
  const totalH=Math.max(y,HH+120);const H=Object.entries(s.h||{});
  H.forEach(([hid,h])=>{pos['H:'+hid]={x:LW+N['H:'+hid].s*W,hito:true}});
  PU._selPos=null;const arrows=puLinks(s).map(l=>{const a=pos[l.a],b=pos[l.b];if(!a||!b||(a.hito&&b.hito))return'';let x1,y1,x2,y2;
    if(a.hito){x1=a.x;y1=b.y;x2=b.x;y2=b.y}else if(b.hito){x1=a.x+a.w;y1=a.y;x2=b.x;y2=a.y}else{x1=a.x+a.w;y1=a.y;x2=b.x;y2=b.y}
    const bad=B.some(z=>z.k===l.k),sel=PU.selL===l.k,hit=a.hito||b.hito;const c=sel?'#1B211E':bad?'#C62828':hit?'var(--accent)':'#7d8781';const k=Math.max(24,Math.abs(x2-x1)*.4),bk=x2<x1;
    const d=`M${x1} ${y1}C${x1+(bk?-k:k)} ${y1},${x2-(bk?-k:k)} ${y2},${x2+(bk?1:-1)} ${y2}`;const hd=bk?`M${x2} ${y2}L${x2+8} ${y2-4.5}L${x2+8} ${y2+4.5}Z`:`M${x2} ${y2}L${x2-8} ${y2-4.5}L${x2-8} ${y2+4.5}Z`;
    if(sel)PU._selPos={x:(x1+x2)/2,y:(y1+y2)/2};
    return`<path d="${d}" class="pua${bad?' bad':''}${sel?' sel':''}${hit?' hit':''}" style="stroke:${c}"/><path d="${hd}" style="fill:${c}"/><path d="${d}" class="puahit" data-pul="${esc(l.k)}"/>`}).join('');
  const hByD={};H.forEach(([hid,h])=>{const i=N['H:'+hid].s;(hByD[i]=hByD[i]||[]).push([hid,h])});
  const head=D.map((d,i)=>{const hs=hByD[i];const x=pd(d);const mon=x.getUTCDay()===1;const h0=hs&&hs[0];
    return`<div class="pud${mon?' mon':''}${h0?' h-'+h0[1].tipo:''}" style="width:${W}px"${h0?` data-hdrop="${esc(h0[0])}" data-puhd="${esc(h0[0])}" title="${esc(hs.map(z=>z[1].n+' · '+puFmt(z[1].d)).join(' · '))}"`:''}><span>${h0?'◆ '+esc((String(h0[1].n||'').replace(/\s*\(.*\)/,'').replace(/^(Llegada|Entrega)( de| del)? /i,'').split(' ')[0]||h0[1].tipo).slice(0,9)):mon?'S'+puWk(d)+' '+PU_WD[x.getUTCDay()]:PU_WD[x.getUTCDay()]}</span><b>${puShort(d)}</b></div>`}).join('');
  const hl=H.map(([hid,h])=>{const i=N['H:'+hid].s;if(i<0||i>D.length)return'';const x=LW+i*W;return`${h.tipo==='entrega'?`<div class="pushade" style="left:${x}px;top:${HH}px;width:${Math.max(0,(D.length-i)*W)}px;height:${totalH-HH}px"></div>`:''}<div class="puhl ${h.tipo}" style="left:${x-1}px;height:${totalH}px"></div><div class="pudrop ${h.tipo}" data-hdrop="${esc(hid)}" style="left:${x-16}px;top:${HH}px;height:${totalH-HH}px"></div>`}).join('');
  const svg=`<svg class="pusvg" width="${LW+D.length*W}" height="${totalH}" aria-hidden="true">${arrows}<path class="pulive" d="M0 0"/></svg>`;
  const nAmb=a=>{const L=Object.entries(s.ps||{}).filter(([,p])=>!p.del&&p.amb===a).map(([id])=>id);return B.filter(l=>L.includes(l.a)||L.includes(l.b)).length+L.filter(id=>N[id]&&N[id].s<0).length};
  const chips=ambs.map(a=>{const am=S.amb.get(a);const n=nAmb(a);return`<button class="pucz${a===PU.amb?' on':''}" data-puz="${esc(a)}">${esc(am.name||am.code||'Ambiente')}${n?`<i>${n}</i>`:''}</button>`}).join('');
  const M=puMargins(s,N);const marg=M.slice(0,2).map(m=>`<span class="pumg ${m.m>=0?'ok':'bad'}" title="${esc(m.from)} → ${esc(m.to)}">Margen ${esc(m.from.replace(/^Llegada (de|del) /i,'llegada '))} → ${esc(m.to.split(' ')[0].toLowerCase())}: ${m.m>0?'+':''}${m.m} d</span>`).join('');
  const sel=PU.sel&&s.ps&&s.ps[PU.sel]&&!s.ps[PU.sel].del?{id:PU.sel,...s.ps[PU.sel]}:null;
  let h=`<div class="puwrap${PU.fs?' fs':''}"><div class="putb"><button class="ib" data-pu="back" aria-label="Volver a las sesiones">‹ Sesiones</button><b class="punm">${esc(s.nom||'Sesión pull')}</b><div class="puczs">${chips}</div><span class="pugap"></span>
    <span class="pust${s.apl?' ok':''}">${s.apl?'Aplicada · ':''}Borrador: el lookahead no se toca</span><button class="ib" data-pu="planos">Planos</button><button class="ib${PU.fs?' on':''}" data-pu="fs">${PU.fs?'Salir de pantalla completa':'Pantalla completa'}</button>${ed?'<button class="ib pri" data-pu="rev">Revisar y aplicar</button>':''}</div>
    <div class="putb2">${ed?`<button class="ib${PU.hitos?' on':''}" data-pu="hitos"><span class="pudm" aria-hidden="true"></span>Hitos · ${H.length}</button>${marg}<span class="pubuf"><span class="mu">Colchón</span><button class="ib" data-pubuf="-1" aria-label="Menos colchón">−</button><b>${+s.buf||0} d</b><button class="ib" data-pubuf="1" aria-label="Más colchón">+</button></span><button class="ib" data-pu="bwd">⇤ Programar hacia atrás</button>`:''}<span class="pugap"></span>
    <button class="ib${PU.ghost?' on':''}" data-pu="ghost">Ver lookahead</button>${ed?`<button class="ib" data-pu="add">+ Pósit</button><button class="ib" data-pu="undo"${PU.undo.length?'':' disabled'}>↶ Deshacer</button>`:''}</div>
    <div class="pubox"><div class="pubw"><div class="puin" style="width:${LW+D.length*W}px;min-height:${totalH}px"><div class="puhead" style="height:${HH}px"><div class="pucorner">Subcontratista</div>${head}</div>${lanes||`<div class="empty" style="margin:20px">Este ambiente no tiene actividades desde mañana. Agrégalas con «+ Pósit».</div>`}${hl}${svg}${puSelLBox(s)}</div></div>
    ${PU.hitos?puHitosPop(s):''}</div>
    <div class="pufoot">${sel?puSelPanel(s,sel,N,B):`<div class="puhint"><b>Arrastra un pósit para cambiar su día. Para enlazar, jala desde su círculo → hasta lo que va después (u otro hito).</b><span>Desde un hito de ingreso (◆ arriba) jala hasta una actividad para que no empiece antes. Toca una flecha para quitarla. Rojo = choque. «+» en cada franja agrega una actividad.</span></div>`}</div></div>`;
  if(PU.add)h+=puAddDlg(s);if(PU.rev)h+=puRevDlg(s);return h}
const PU_SEQ=['CPP911','GABEL ESTRUCTURAS','GECODEM','MWF','TECNIFLOOR','CANOVAS VM','CHITR','JV','GABEL PINTURA','CYM','ICR-ACI','ICR-DACI','DECORLUX','ILLAPAY','FORGA'];
function PU_ORD(sc){const n=String(conOf(sc).name||'').toUpperCase();const i=PU_SEQ.indexOf(n);return i<0?50:i}
function puTint(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return'#eef1ee';const n=parseInt(m[1],16);const f=c=>Math.round(c+(255-c)*.74);return`rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`}
function puSelLBox(s){if(!PU.selL||!PU._selPos||!(s.ln||{})[PU.selL])return'';const i=PU.selL.indexOf('>');const a=PU.selL.slice(0,i),b=PU.selL.slice(i+1);const p=PU._selPos;
  return`<div class="pusl" style="left:${Math.max(PU_LW+4,p.x-150)}px;top:${p.y-54}px"><span>${esc(puName(s,a))} → ${esc(puName(s,b))}</span>${pulEd()?'<button class="ib dng" data-pu="rmlink">× Quitar enlace</button>':''}<button class="ib" data-pu="clrl" aria-label="Cerrar">×</button></div>`}
function puSelPanel(s,p,N,B){const ed=pulEd();const preds=puLinks(s).filter(l=>l.b===p.id&&N[l.a]);const bad=new Set(B.map(l=>l.k));
  const hch=Object.entries(s.h||{}).map(([hid,h])=>{const ing=h.tipo==='ingreso';const k=ing?puKey('H:'+hid,p.id):puKey(p.id,'H:'+hid);const on=!!(s.ln||{})[k];const nm=String(h.n||'').replace(/ \(.*\)/,'').replace(/^Llegada (de|del) /i,'');
    return`<button class="puhc ${h.tipo}${on?' on':''}" data-puhc="${esc(k)}" title="${ing?'No puede empezar antes de':'Tiene que terminar antes de'}: ${esc(h.n)}"${ed?'':' disabled'}>${on?'✓ ':''}${ing?'◆ '+esc(nm)+' →':'→ ◆ '+esc(nm)}</button>`}).join('');
  const am=S.amb.get(p.amb)||{};
  return`<div class="pusp"><div class="pusf w"><label class="pulb" for="puname">${esc(conOf(p.sc).name)} · ${esc(am.name||'')}</label><input id="puname" class="tin" data-pupn="1" value="${esc(p.n||'')}"${ed&&p.nw?'':' readonly title="El nombre de una actividad que ya está en el lookahead se cambia en el lookahead"'}></div>
    <div class="pusf"><span class="pulb">Inicio</span><div class="purw">${ed?'<button class="ib" data-pud="-1" aria-label="Un día antes">‹</button>':''}<b class="mono">${esc(puFmt(p.d0))}</b>${ed?'<button class="ib" data-pud="1" aria-label="Un día después">›</button>':''}</div></div>
    <div class="pusf"><span class="pulb">Duración</span><div class="purw">${ed?'<button class="ib" data-pudu="-1" aria-label="Menos días">−</button>':''}<b class="mono">${Math.max(1,+p.dur||1)} d</b>${ed?'<button class="ib" data-pudu="1" aria-label="Más días">+</button>':''}</div></div>
    <div class="pusf g"><span class="pulb">Necesita antes</span><div class="puchs">${preds.map(l=>`<button class="puch${bad.has(l.k)?' bad':''}" data-purm="${esc(l.k)}"${ed?'':' disabled'}>${esc(puIsH(l.a)?'◆ '+puName(s,l.a):puName(s,l.a))}${ed?' ×':''}</button>`).join('')||'<span class="mu">Nada enlazado: avanza libre.</span>'}</div></div>
    <div class="pusf"><span class="pulb">Vincular a hito</span><div class="puchs">${hch||'<span class="mu">Sin hitos</span>'}</div></div>
    ${ed?`<div class="purw"><button class="ib" data-pu="dup">Duplicar</button><button class="ib dng" data-pu="del">Quitar</button></div>`:''}</div>`}
function puHitosPop(s){const H=Object.entries(s.h||{}).sort((a,b)=>String(a[1].d).localeCompare(String(b[1].d)));
  return`<div class="puhp"><div class="puhph"><b>Hitos de la sesión</b><span class="mu">Valen para todos los ambientes de la sesión</span><button class="ib" data-pu="hitos" aria-label="Cerrar hitos">×</button></div>
    ${H.map(([hid,h])=>`<div class="puhr"><i class="pudm ${h.tipo}" aria-hidden="true"></i><label class="pusr" for="puhn-${esc(hid)}">Nombre del hito</label><input id="puhn-${esc(hid)}" class="tin" data-puhn="${esc(hid)}" value="${esc(h.n||'')}">
      <span class="seg"><button type="button" class="${h.tipo==='ingreso'?'on':''}" data-puht="${esc(hid)}|ingreso">Ingreso</button><button type="button" class="${h.tipo==='entrega'?'on':''}" data-puht="${esc(hid)}|entrega">Entrega</button></span>
      <label class="pusr" for="puhd-${esc(hid)}">Fecha</label><input id="puhd-${esc(hid)}" type="date" class="tin" data-puhdt="${esc(hid)}" value="${esc(h.d||'')}"><button class="ib dng" data-puhx="${esc(hid)}" aria-label="Quitar hito">×</button></div>`).join('')||'<div class="mu">Sin hitos todavía.</div>'}
    <div class="purw"><button class="ib" data-pu="addh">+ Hito</button><span class="mu">Ingreso = no se puede empezar antes (llegada de equipos). Entrega = hay que terminar antes (fecha contractual).</span></div></div>`}
function puAddDlg(s){const A=PU.add;const scs=[...S.con.values()].filter(c=>!c.arch&&c.name).sort((a,b)=>PU_ORD(a.id)-PU_ORD(b.id)||a.name.localeCompare(b.name,'es'));
  const live=Object.values(s.ps||{}).filter(p=>!p.del&&p.amb===PU.amb);
  const sug=A.sc&&typeof mxCatAct==='function'?mxCatAct().filter(c=>(typeof mxScsOf==='function'?mxScsOf(c):[c.sc]).includes(A.sc)).map(c=>c.name).filter(n=>!live.some(p=>p.sc===A.sc&&mnk(p.n)===mnk(n))).sort((a,b)=>a.localeCompare(b,'es')).slice(0,24):[];
  return`<div class="pumod" data-puaddx="1"><div class="pudlg" role="dialog" aria-modal="true" aria-label="Nueva actividad"><h3>Nueva actividad · ${esc((S.amb.get(PU.amb)||{}).name||'')}</h3>
    <span class="pulb">Subcontratista</span><div class="puscs">${scs.map(c=>`<button type="button" class="pusc${A.sc===c.id?' on':''}" data-pusc="${esc(c.id)}" style="--c:${c.color||'#5A7D9A'}"><i></i>${esc(c.name)}</button>`).join('')}</div>
    <label class="pulb" for="puan">Actividad</label><input id="puan" class="tin" data-puan="1" value="${esc(A.n||'')}" placeholder="Escribe o elige una del catálogo">
    <div class="puchs">${sug.map(n=>`<button type="button" class="puch sug" data-pusg="${esc(n)}">${esc(n)}</button>`).join('')}</div>
    <div class="pudf"><span class="mu">Aparece en su franja; arrástrala a su día y enlázala jalando desde su borde.</span><button class="ib" data-pu="addx">Cancelar</button><button class="ib pri" data-pu="addok">Agregar</button></div></div></div>`}
/* ---------- revisión y aplicación al lookahead ---------- */
function puPlan(s){const t=todayIso();const R=[],ops=[],moved=[],cat=[];let nNew=0;
  const run=(d0,n)=>{const L=[];let d=d0,g=0;if(!isWork(d))d=wshift(d,1);while(L.length<n&&g++<500){if(d>t&&isWork(d))L.push(d);d=addD(d,1)}return L};
  const orderOf=amb=>{const sib=[...S.act.values()].filter(x=>x.ambId===amb);return sib.reduce((m,x)=>Math.max(m,+x.order||0),0)};const ordAdd={};
  for(const[pid,p]of Object.entries(s.ps||{})){const am=S.amb.get(p.amb);if(!am)continue;const dur=Math.max(1,+p.dur||1);
    if(p.nw){if(p.del)continue;if(typeof mxCatReq==='function'&&mxCatReq()&&!mxAli().get(mnk(p.n))){cat.push(p);continue}const nd=run(p.d0,dur);const id='act-'+pid.replace(/^[^-]*-/,'')+'p';ordAdd[p.amb]=(ordAdd[p.amb]||orderOf(p.amb))+10;
      ops.push(op('acts',id,{id,ambId:p.amb,sc:p.sc,name:p.n,und:'',metrado:null,days:nd,order:ordAdd[p.amb]}));R.push({pid,p,am,was:'—',now:puShort(nd[0])+' → '+puShort(nd[nd.length-1]),chg:'Nueva',k:'new'});nNew++;continue}
    const x=p.src&&S.act.get(p.src);if(!x)continue;const b=(s.base||{})[p.src]||{days:x.days||[]};const bf=(b.days||[]).filter(d=>d>t);const cur=(x.days||[]).slice().sort();
    const changedLk=JSON.stringify(cur)!==JSON.stringify((b.days||[]).slice().sort());let fut;
    if(p.del)fut=[];else if(bf.length&&p.d0===bf[0]&&dur===bf.length)continue;
    else if(bf.length&&dur===bf.length){const sh=wdist(bf[0],p.d0);fut=bf.map(d=>wshift(d,sh));if(fut.some(d=>d<=t)||new Set(fut).size!==fut.length)fut=run(p.d0,dur)}
    else fut=run(p.d0,dur);
    const nd=[...new Set([...cur.filter(d=>d<=t),...fut])].sort();if(JSON.stringify(nd)===JSON.stringify(cur))continue;
    const sh=bf.length&&fut.length?wdist(bf[0],fut[0]):0;
    const chg=p.del?'Se quitan los días desde mañana':[sh?(sh>0?'+':'')+sh+' d':'',dur!==bf.length?'dura '+dur+' d':''].filter(Boolean).join(' · ')||'reprogramada';
    const row={pid,p,am,x,was:bf.length?puShort(bf[0])+' → '+puShort(bf[bf.length-1]):'—',now:fut.length?puShort(fut[0])+' → '+puShort(fut[fut.length-1]):'—',chg,k:p.del?'del':sh>0?'late':'early',lk:changedLk};
    R.push(row);if(changedLk){moved.push(row);if(!PU.apOv)continue}
    /* C-19 (CON-06): el metrado por día se mueve con sus días (el i-ésimo día futuro pasa al i-ésimo nuevo; si la actividad se acorta,
       lo que sobra se suma al último día, así no se pierde metrado; los días agregados quedan «sin cantidad», como al pintar) */
    const nx={...x,days:nd};if(x.qty){const cf=cur.filter(d=>d>t),fs=[...new Set(fut)].sort();const nq={};
      for(const[d,v]of Object.entries(x.qty)){if(d<=t){nq[d]=v;continue}const i=cf.indexOf(d);if(i<0||!fs.length)continue;const k=fs[Math.min(i,fs.length-1)];nq[k]=r2((+nq[k]||0)+(+v||0))}
      nx.qty=nq}
    ops.push(op('acts',x.id,nx))}
  /* choques sin resolver → restricciones (tarea predecesora) */
  const D=puDays(s);const IX=new Map(D.map((d,i)=>[d,i]));const N=puNodes(s,IX);const rs=[];
  puBad(s,N).forEach(l=>{const bp=(s.ps||{})[l.b];if(!bp||puIsH(l.b))return;const act=bp.nw?null:bp.src;if(!act||!S.act.get(act))return;
    const an=puName(s,l.a);const asc=puIsH(l.a)?'':conOf(((s.ps||{})[l.a]||{}).sc).name;
    rs.push({act,txt:`«${bp.n}» (${conOf(bp.sc).name}) necesita antes «${an}»${asc?' ('+asc+')':''}`,desc:`Sesión pull «${s.nom||''}»: necesita terminado antes «${an}»${asc?' de '+asc:''}`,resp:puIsH(l.a)?'':asc,sc:bp.sc,need:bp.d0,typ:puIsH(l.a)?'MATERIALES':'TAREA PREDECESORA'})});
  return{R,ops,moved,cat,rs,nNew}}
function puRevDlg(s){const X=puPlan(s);const ap=isAdmin||isPisoResp(s.piso);const nOps=X.ops.length+(PU.apRs?X.rs.length:0);
  const rows=X.R.map(r=>`<tr class="${r.lk?'pulk':''}"><td>${esc(r.am.name||'')}</td><td>${esc(r.p.n)}</td><td>${esc(conOf(r.p.sc).name)}</td><td class="mono">${r.was}</td><td class="mono">${r.now}</td><td class="puk ${r.k}">${esc(r.chg)}${r.lk?' · <b>cambió en el lookahead</b>':''}</td></tr>`).join('');
  return`<div class="pumod" data-purevx="1"><div class="pudlg wide" role="dialog" aria-modal="true" aria-label="Revisar la sesión"><span class="pulb">Borrador de la sesión · revisión antes de aplicar</span><h3>${X.R.length} cambio${X.R.length===1?'':'s'} frente al lookahead</h3>
    ${X.moved.length?`<div class="callout warn"><b>${X.moved.length} actividad(es) cambiaron en el lookahead desde que se abrió la sesión</b> (otra persona las movió). Por defecto no se tocan.<label class="puck"><input type="checkbox" data-puov="1"${PU.apOv?' checked':''}> Aplicar también esas (la sesión pisa lo que cambiaron)</label></div>`:`<div class="callout ok">Nadie cambió estas actividades en el lookahead desde que se abrió la sesión.</div>`}
    ${X.cat.length?`<div class="callout warn">No se crean porque no están en el catálogo (Matriz › Catálogo exige catálogo): ${esc(X.cat.map(p=>p.n).join(' · '))}. Agrégalas al catálogo o cámbiales el nombre.</div>`:''}
    <div class="purvt"><table class="t"><thead><tr><th>Ambiente</th><th>Actividad</th><th>Subcontratista</th><th>Lookahead</th><th>Sesión</th><th>Cambio</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="mu">Sin cambios de fechas.</td></tr>'}</tbody></table></div>
    ${X.rs.length?`<div class="purs"><label class="puck"><input type="checkbox" data-pursk="1"${PU.apRs?' checked':''}> Crear ${X.rs.length} restricción(es) por los choques que quedan sin resolver</label><ul>${X.rs.map(r=>`<li>${esc(r.txt)}</li>`).join('')}</ul></div>`:''}
    <div class="pudf"><span class="mu">Se cambian solo días desde mañana, todo en un solo paso (Deshacer lo revierte).${ap?'':' Solo el responsable del piso o un administrador puede aplicarla.'}</span><button class="ib" data-pu="revx">Volver al tablero</button><button class="ib pri" data-pu="apply"${ap&&nOps?'':' disabled'}>Aplicar al lookahead</button></div></div></div>`}
function puApply(){const s=puCur();if(!s)return;if(!(isAdmin||isPisoResp(s.piso))){toast('Solo el responsable del piso o un administrador puede aplicar la sesión.');return}
  const X=puPlan(s);const ops=X.ops.slice();const tp=P().restrTypes||[];const typ=n=>tp.includes(n)?n:(tp[0]||n);
  if(PU.apRs)X.rs.forEach(r=>{const id=uid('restr');ops.push(op('restr',id,{id,actId:r.act,pisoId:s.piso,type:typ(r.typ),desc:r.desc,resp:r.resp,...(respScOf(r.resp)?{respSc:respScOf(r.resp)}:{}),need:r.need,freed:'',status:'pend',created:todayIso(),sc:r.sc,by:me.email,byName:me.name||''}))});
  if(!ops.length){toast('No hay cambios para aplicar.');return}
  const nA=X.ops.length,nR=ops.length-nA;
  const ok=apply(ops,`Sesión pull aplicada: ${nA} actividad(es)${nR?` y ${nR} restricción(es)`:''}`,()=>{
    /* la sesión queda alineada con el lookahead nuevo (base y pósits), para seguir usándola la semana siguiente */
    const t=todayIso();const upd={apl:{t:NOW(),by:me.email||'',n:me.name||'',cnt:nA}};
    X.ops.forEach(o=>{if(o.col!=='acts'||!o.after)return;const a=o.after;const pid=Object.keys(s.ps||{}).find(k=>{const p=s.ps[k];return p.src===a.id||(p.nw&&('act-'+k.replace(/^[^-]*-/,'')+'p')===a.id)});
      upd['base.'+a.id]={days:a.days,name:a.name||'',sc:a.sc||''};if(!pid)return;const fut=a.days.filter(d=>d>t);
      if(!fut.length){upd['ps.'+pid]=undefined;return}upd['ps.'+pid+'.d0']=fut[0];upd['ps.'+pid+'.dur']=fut.length;upd['ps.'+pid+'.src']=a.id;upd['ps.'+pid+'.nw']=undefined});
    puWrite(upd,false);PU.rev=false;PU.undo=[];requestRender()});
  if(ok===false)return}
/* ---------- planos y pantalla completa ---------- */
function puPlanos(){const s=puCur();if(!s)return;if(!canPla()){toast('No tienes acceso a los planos.');return}plSub();
  if(!plbReady){toast('Cargando la lista de planos…');let n=0;const w=()=>{if(U.tab!=='pull')return;if(plbReady)puPlanos();else if(++n<40)setTimeout(w,250);else toast('No se pudo leer la lista de planos.')};setTimeout(w,250);return}
  const L=plFloorList(s.piso);if(!L.length){toast('Este piso aún no tiene planos cargados (módulo Planos).');return}const p=plPickFor(s.piso,null)||L[0];plOpen(p.id,L.map(q=>q.id),{piso:s.piso});toast('Cierra el plano (×) para volver a la sesión tal como la dejaste.')}
function puFs(on){PU.fs=on;document.body.classList.toggle('pufs',on);try{if(on&&document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{})}catch(e){}requestRender()}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&PU.fs&&U.tab==='pull'){PU.fs=false;document.body.classList.remove('pufs');requestRender()}});
/* ---------- eventos ---------- */
function puWire(main){
  main.addEventListener('click',e=>{if(U.tab!=='pull')return;const t=e.target;const s=puCur();const ed=pulEd();let b;
    if(PU.noClick)return;
    if(t.classList&&t.classList.contains('pumod')){if(t.dataset.puclose)PU.newS=null;if(t.dataset.puaddx)PU.add=null;if(t.dataset.purevx)PU.rev=false;requestRender();return}
    if((b=t.closest('[data-puo]'))){PU.sid=b.dataset.puo;PU.amb='';PU.sel='';PU.selL='';PU.undo=[];requestRender();return}
    if((b=t.closest('[data-pua]'))){const x=PUL.get(b.dataset.pua);if(!x)return;uiAsk({title:'Archivar sesión',text:`«${x.nom||'Sesión'}» deja de aparecer en la lista. No cambia el lookahead.`,ok:'Archivar',tone:'warn'}).then(ok=>{if(ok)fcol('pull').doc(x.id).update({arch:{t:NOW(),by:me.email||'',n:me.name||''},ts:NOW()}).then(()=>toast('Sesión archivada')).catch(er=>toast('No se pudo archivar: '+(er.code||er.message)))});return}
    if((b=t.closest('[data-puamb]'))){const id=b.dataset.puamb;const L=PU.newS.ambs;const i=L.indexOf(id);if(i<0)L.push(id);else L.splice(i,1);requestRender();return}
    if((b=t.closest('[data-puz]'))){PU.amb=b.dataset.puz;PU.sel='';PU.selL='';requestRender();return}
    if((b=t.closest('[data-pul]'))){PU.selL=b.dataset.pul;PU.sel='';requestRender();return}
    if((b=t.closest('[data-pubuf]'))&&ed&&s){puWrite({buf:Math.max(0,Math.min(5,(+s.buf||0)+ +b.dataset.pubuf))},false);return}
    if((b=t.closest('[data-pud]'))&&ed&&s&&PU.sel){const p=s.ps[PU.sel];const D=puDays(s);let i=D.indexOf(p.d0);if(i<0)i=0;i=Math.max(0,Math.min(D.length-1,i+ +b.dataset.pud));puWrite({['ps.'+PU.sel+'.d0']:D[i]});return}
    if((b=t.closest('[data-pudu]'))&&ed&&s&&PU.sel){const p=s.ps[PU.sel];puWrite({['ps.'+PU.sel+'.dur']:Math.max(1,Math.min(60,(+p.dur||1)+ +b.dataset.pudu))});return}
    if((b=t.closest('[data-purm]'))&&ed){puWrite({['ln.'+b.dataset.purm]:undefined});toast('Se quitó el enlace.');return}
    if((b=t.closest('[data-puhc]'))&&ed&&s){const k=b.dataset.puhc;if((s.ln||{})[k]){puWrite({['ln.'+k]:undefined});toast('Se quitó el vínculo con el hito.')}else{const i=k.indexOf('>');puLink(k.slice(0,i),k.slice(i+1))}return}
    if((b=t.closest('[data-puht]'))&&ed){const[hid,tp]=b.dataset.puht.split('|');puWrite({['h.'+hid+'.tipo']:tp});return}
    if((b=t.closest('[data-puhx]'))&&ed&&s){const hid=b.dataset.puhx;const upd={['h.'+hid]:undefined};puLinks(s).forEach(l=>{if(l.a==='H:'+hid||l.b==='H:'+hid)upd['ln.'+l.k]=undefined});puWrite(upd);toast('Hito quitado (Deshacer lo devuelve).');return}
    if((b=t.closest('[data-pusc]'))){PU.add.sc=b.dataset.pusc;requestRender();return}
    if((b=t.closest('[data-pusg]'))){PU.add.n=b.dataset.pusg;requestRender();return}
    if((b=t.closest('[data-puadd]'))&&ed){PU.add={sc:b.dataset.puadd,n:''};requestRender();return}
    if((b=t.closest('[data-pid]'))){return}
    const k=(b=t.closest('[data-pu]'))&&b.dataset.pu;if(!k){if(PU.selL&&!t.closest('.pusl')){PU.selL='';requestRender()}return}
    if(k==='new'){PU.newS={nom:'',piso:U.piso||'',ambs:[],q:''};requestRender()}
    else if(k==='newx'){PU.newS=null;requestRender()}
    else if(k==='create')puCreate();
    else if(k==='back'){if(PU.fs)puFs(false);PU.sid='';PU.sel='';PU.selL='';requestRender()}
    else if(k==='planos')puPlanos();
    else if(k==='fs')puFs(!PU.fs);
    else if(k==='rev'){PU.rev=true;PU.apOv=false;PU.apRs=true;requestRender()}
    else if(k==='revx'){PU.rev=false;requestRender()}
    else if(k==='apply')puApply();
    else if(k==='hitos'){PU.hitos=!PU.hitos;requestRender()}
    else if(k==='addh'&&s){const D=puDays(s);const hid=uid('h').replace(/-/g,'');puWrite({['h.'+hid]:{n:'Nuevo hito',tipo:'ingreso',d:D[Math.min(D.length-1,15)]}});toast('Hito nuevo: ponle nombre, tipo y fecha.')}
    else if(k==='bwd')puBackward();
    else if(k==='ghost'){PU.ghost=!PU.ghost;requestRender()}
    else if(k==='undo')puUndo();
    else if(k==='add'){PU.add={sc:PU.sel&&s&&s.ps[PU.sel]?s.ps[PU.sel].sc:'',n:''};requestRender()}
    else if(k==='addx'){PU.add=null;requestRender()}
    else if(k==='addok'&&s){const A=PU.add;if(!A.sc){toast('Elige el subcontratista');return}const n=(A.n||'').trim();if(!n){toast('Escribe el nombre de la actividad');return}
      const pid=uid('pp');const D=puDays(s);const e=Object.values(s.h||{}).find(h=>h.tipo==='entrega');let i=e&&D.indexOf(e.d)>=0?D.indexOf(e.d)-8:10;i=Math.max(0,Math.min(D.length-2,i));
      PU.add=null;PU.sel=pid;puWrite({['ps.'+pid]:{n,sc:A.sc,amb:PU.amb,d0:D[i],dur:2,nw:1}});toast(`«${n}» agregada en la franja de ${conOf(A.sc).name}. Arrástrala a su día.`)}
    else if(k==='dup'&&s&&PU.sel){const p=s.ps[PU.sel];const pid=uid('pp');PU.sel=pid;puWrite({['ps.'+pid]:{n:p.n+' (2)',sc:p.sc,amb:p.amb,d0:p.d0,dur:+p.dur||1,nw:1}});toast('Copia creada. Cámbiale el nombre, p. ej. «frente video wall».')}
    else if(k==='del'&&s&&PU.sel){const id=PU.sel;const p=s.ps[id];const upd={};puLinks(s).forEach(l=>{if(l.a===id||l.b===id)upd['ln.'+l.k]=undefined});if(p.nw)upd['ps.'+id]=undefined;else upd['ps.'+id+'.del']=1;PU.sel='';puWrite(upd);toast(`Se quitó «${p.n}» de la sesión${p.nw?'':' (al aplicar se liberan sus días desde mañana)'}. Deshacer lo devuelve.`)}
    else if(k==='rmlink'&&PU.selL){puWrite({['ln.'+PU.selL]:undefined});PU.selL='';toast('Se quitó el enlace. Deshacer lo devuelve.')}
    else if(k==='clrl'){PU.selL='';requestRender()}});
  main.addEventListener('input',e=>{const t=e.target;if(t.dataset.pun&&PU.newS){PU.newS[t.dataset.pun]=t.value;if(t.dataset.pun==='q'){clearTimeout(PU.qT);PU.qT=setTimeout(()=>{requestRender();setTimeout(()=>{const q=$('#puq');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}},30)},250)}}
    else if(t.dataset.puan&&PU.add)PU.add.n=t.value});
  main.addEventListener('change',e=>{const t=e.target;const s=puCur();
    if(t.dataset.pun==='piso'&&PU.newS){PU.newS.piso=t.value;PU.newS.ambs=[];requestRender()}
    else if(t.dataset.pupn&&s&&PU.sel&&s.ps[PU.sel]&&s.ps[PU.sel].nw){const v=t.value.trim();if(v)puWrite({['ps.'+PU.sel+'.n']:v})}
    else if(t.dataset.puhn&&s){const v=t.value.trim();if(v)puWrite({['h.'+t.dataset.puhn+'.n']:v})}
    else if(t.dataset.puhdt&&s&&t.value){puWrite({['h.'+t.dataset.puhdt+'.d']:t.value})}
    else if(t.dataset.puov){PU.apOv=t.checked;requestRender()}
    else if(t.dataset.pursk){PU.apRs=t.checked;requestRender()}});
  /* arrastre: cuerpo del pósit = mover de día; círculo → (o un hito de arriba) = enlazar */
  main.addEventListener('pointerdown',e=>{if(U.tab!=='pull'||!pulEd()||e.button>0)return;const s=puCur();if(!s)return;const t=e.target;
    const hd=t.closest('[data-puh]'),hh=t.closest('[data-puhd]'),pp=t.closest('.pup');
    if(!hd&&!hh&&!pp)return;const bw=main.querySelector('.pubw');const r=main.querySelector('.puin').getBoundingClientRect();
    if(hd||hh){e.preventDefault();const from=hd?hd.dataset.puh:'H:'+hh.dataset.puhd;const el=hd?main.querySelector(`.pup[data-pid="${CSS.escape(from)}"]`):hh;const er=el.getBoundingClientRect();
      PU.drag={k:'link',from,x0:e.clientX,y0:e.clientY,sx:(hd?er.right:er.left+er.width/2)-r.left,sy:(hd?er.top+er.height/2:er.bottom)-r.top,moved:false};}
    else{if(pp.classList.contains('lko')){toast('Otra persona está moviendo este pósit.');return}PU.drag={k:'move',id:pp.dataset.pid,el:pp,x0:e.clientX,moved:false,h:main.querySelector(`[data-puh="${CSS.escape(pp.dataset.pid)}"]`)}}
    try{(hd||hh||pp).setPointerCapture(e.pointerId)}catch(er){}
    const mv=ev=>{const d=PU.drag;if(!d)return;const dx=ev.clientX-d.x0,dy=ev.clientY-(d.y0||ev.clientY);
      if(!d.moved&&Math.abs(dx)+Math.abs(dy)>8){d.moved=true;if(d.k==='move'){d.el.classList.add('drag');puWrite({['lk.'+d.id]:{by:me.email||'',n:(me.name||me.email||'').split(' ')[0],t:NOW()}},false)}else main.querySelector('.puin').classList.add('linking')}
      if(!d.moved)return;
      if(d.k==='move'){d.el.style.transform=`translateX(${dx}px)`;if(d.h)d.h.style.transform=`translateX(${dx}px)`;
        if(bw){const br=bw.getBoundingClientRect();if(ev.clientX>br.right-40)bw.scrollLeft+=12;else if(ev.clientX<br.left+PU_LW+30)bw.scrollLeft-=12}}
      else{const pl=main.querySelector('.pulive');const x2=d.sx+dx,y2=d.sy+(ev.clientY-d.y0);if(pl)pl.setAttribute('d',`M${d.sx} ${d.sy}L${x2} ${y2}`)}};
    const up=ev=>{window.removeEventListener('pointermove',mv,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cn,true);const d=PU.drag;PU.drag=null;
      const inn=main.querySelector('.puin');if(inn)inn.classList.remove('linking');
      if(!d)return;if(!d.moved){if(d.k==='move'){PU.sel=PU.sel===d.id?'':d.id;PU.selL=''}requestRender();return}
      PU.noClick=true;setTimeout(()=>{PU.noClick=false},60);
      if(d.k==='move'){const n=Math.round((ev.clientX-d.x0)/PU_W());const s2=puCur();const p=s2&&s2.ps[d.id];const upd={['lk.'+d.id]:undefined};
        if(p&&n){const D=puDays(s2);let i=D.indexOf(p.d0);if(i<0)i=0;const j=Math.max(0,Math.min(D.length-1,i+n));PU.sel=d.id;puWrite({['ps.'+d.id+'.d0']:D[j],['lk.'+d.id]:undefined});toast(`«${p.n}» ahora empieza el ${puFmt(D[j])}.`)}
        else puWrite(upd,false);if(PU.pend)PU.pend=false;return}
      const el=document.elementFromPoint(ev.clientX,ev.clientY);const tg=el&&el.closest?el.closest('.pup[data-pid],[data-hdrop]'):null;let to='';
      if(tg)to=tg.dataset.pid||('H:'+tg.dataset.hdrop);if(!to||to===d.from){toast('Suelta la flecha sobre otra actividad o sobre un hito.');requestRender();return}puLink(d.from,to);if(PU.pend){PU.pend=false}requestRender()};
    const cn=()=>{const d=PU.drag;PU.drag=null;window.removeEventListener('pointermove',mv,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cn,true);if(d&&d.k==='move'&&d.moved)puWrite({['lk.'+d.id]:undefined},false);requestRender()};
    window.addEventListener('pointermove',mv,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cn,true)});
}
