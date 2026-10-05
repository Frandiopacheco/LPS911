"use strict";
/* LPS 911 · Mover en bloque en el Lookahead: un ambiente, un sector, un piso o las filas que elijas se desplazan juntos
   N días hábiles, manteniendo su tren. Se deshace con Ctrl+Z como cualquier cambio.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

const SELA=new Set();
const canMoveAct=x=>!!x&&canWrite&&!(U.ver&&U.verMode==='ver')&&(!PM()||myScsI().includes(x.sc));
function selToggle(aid){if(SELA.has(aid))SELA.delete(aid);else{const x=S.act.get(aid);if(!canMoveAct(x)){toast('No puedes mover esa actividad.');return}SELA.add(aid)}selBar();requestRender()}
function selClear(){if(!SELA.size)return;SELA.clear();selBar();requestRender()}
const actsOfAmb=id=>[...S.act.values()].filter(x=>x.ambId===id);
const actsOfSec=id=>{const A=new Set([...S.amb.values()].filter(a=>a.sectorId===id).map(a=>a.id));return[...S.act.values()].filter(x=>A.has(x.ambId))};
const actsOfPiso=id=>[...S.act.values()].filter(x=>pisoOfAct(x.id)===id);

/** Desplaza n días hábiles (n<0 adelanta) los días desde `from` de cada actividad; lo anterior a `from` no se toca. */
function shiftActs(ids,n,from,label){if(!n)return 0;const ops=[];let moved=0,done=0,blocked=0;
  for(const id of ids){const x=S.act.get(id);if(!canMoveAct(x))continue;if(DONE.has(id)){done++;continue}
    /* lo pasado y los días con el plan cerrado (hoy, publicados) se quedan: se mueve desde el primer día abierto */
    const f=typeof firstOpen==='function'?firstOpen(from,pisoOfAmb(x.ambId)):from;
    const days=x.days||[];if(!days.some(d=>d>=f))continue;const map=d=>d>=f?wshift(d,n):d;
    /* adelantar no puede llevar días a antes de `from` (se juntarían con días pasados ya registrados) */
    if(n<0&&days.some(d=>d>=f&&wshift(d,n)<f)){blocked++;continue}
    const nd=[...new Set(days.map(map))].sort();const nq={};for(const[d,v]of Object.entries(x.qty||{})){const k=map(d);nq[k]=(nq[k]||0)+(+v||0)}
    ops.push(op('acts',id,{...x,days:nd,qty:nq}));moved++}
  if(!ops.length){toast(blocked?'No se puede adelantar: no se mueve hacia hoy, días pasados ni días con el plan cerrado.':done?'Esas actividades ya están terminadas: no hay días que mover.':'No hay días que mover desde hoy.');return 0}
  const k=Math.abs(n);apply(ops,`${label}: ${moved} actividad${moved>1?'es':''} ${n>0?'atrasada':'adelantada'}${moved>1?'s':''} ${k} día${k>1?'s':''} hábil${k>1?'es':''}${done?` (${done} terminada${done>1?'s':''} no se movieron)`:''}${blocked?` (${blocked} ya empiezan hoy: no se adelantaron)`:''}`);return moved}

/** Ventana para mover un grupo: cuántos días hábiles, hacia dónde y si se mueven también los días pasados. */
function blockMoveDialog(btn,ids,label){const L=ids.filter(id=>canMoveAct(S.act.get(id)));
  if(!L.length){toast('No hay actividades que puedas mover aquí.');return}
  const t=todayIso();
  openPop(btn,`<div class="ph">Mover ${esc(label)}</div><div class="ptx">${L.length} actividad${L.length>1?'es':''}. Se mueven juntas en días hábiles, sin cambiar su tren.</div>
    <div class="qrow"><input type="number" id="bmn" value="1" min="1" max="60" style="width:64px" aria-label="Días hábiles"><span class="mu">día(s) hábil(es)</span></div>
    <label class="chk" style="display:flex;padding:2px 10px 6px"><input type="checkbox" id="bmpast"> Mover también los días ya pasados</label>
    <div class="pseg"><button data-do="back">← Adelantar</button><button data-do="fwd" class="on">Atrasar →</button></div>`,
    {back:()=>go(-1),fwd:()=>go(1)});
  function go(s){const n=Math.max(1,Math.min(60,parseInt(($('#bmn')||{}).value,10)||1));const past=!!($('#bmpast')||{}).checked;shiftActs(L,s*n,past?'0000-00-00':t,label)}}

/* barra de la selección: aparece abajo mientras haya filas elegidas */
function selBar(){let b=$('#mvbar');const on=SELA.size&&U.tab==='look'&&ready;
  if(!on){if(b)b.remove();return}
  for(const id of[...SELA])if(!S.act.has(id))SELA.delete(id);
  if(!b){b=document.createElement('div');b.id='mvbar';b.className='mvbar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Mover en bloque');document.body.appendChild(b);
    b.onclick=e=>{const k=e.target.closest('[data-sb]');if(!k)return;const v=k.dataset.sb;const L=[...SELA];
      if(v==='clr')selClear();else if(v==='more')blockMoveDialog(k,L,'la selección');else shiftActs(L,+v,todayIso(),'Selección')}}
  const n=SELA.size;const h=`<b>${n} actividad${n>1?'es':''}</b><button class="ib" data-sb="-1" title="Adelantar 1 día hábil (Alt+←)">← 1 día</button><button class="ib" data-sb="1" title="Atrasar 1 día hábil (Alt+→)">1 día →</button><button class="ib" data-sb="more">Mover…</button><button class="ib" data-sb="clr">Quitar selección</button><span class="mvh">Toca ⋮ en otras filas para sumarlas</span>`;
  if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
document.addEventListener('keydown',e=>{if(!SELA.size||U.tab!=='look')return;const inField=e.target.closest&&e.target.closest('input,textarea,select');if(inField)return;
  if(e.key==='Escape'){selClear();return}
  if(e.altKey&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();shiftActs([...SELA],e.key==='ArrowRight'?1:-1,todayIso(),'Selección')}});
