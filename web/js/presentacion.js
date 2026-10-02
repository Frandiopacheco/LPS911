"use strict";
/* LPS 911 · Modo presentación del Lookahead para la reunión semanal: pantalla completa, letra grande, sin barras de la app
   y una barra simple arriba (semana, piso, sector, semanas visibles, tamaño, puntero, bloquear edición, salir).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

let LKP=null;
function presStart(){if(LKP||isMob())return;
  LKP={lock:true,ptr:false,zoom:1,cw:canWrite,meeting:U.meeting,win:U.win};
  U.meeting=true;if(U.win>6)U.win=6;canWrite=false;closePop();
  document.body.classList.add('pres','pres-lock');
  try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
  presBar();requestRender()}
function presStop(){if(!LKP)return;const p=LKP;LKP=null;U.meeting=p.meeting;U.win=p.win;canWrite=p.cw;
  document.body.classList.remove('pres','pres-lock','pres-ptr');$('#presbar')?.remove();$('#presptr')?.remove();
  const gw=$('#gw');if(gw)gw.style.removeProperty('--pz');
  try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}
  requestRender()}

function presBar(){if(!LKP)return;let b=$('#presbar');
  if(!b){b=document.createElement('div');b.id='presbar';b.className='presbar';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Presentación del lookahead');document.body.prepend(b);
    b.onclick=e=>{const t=e.target.closest('[data-pb]');if(!t)return;const k=t.dataset.pb;
      if(k==='x')presStop();else if(k==='wp'){U.week--;requestRender()}else if(k==='wn'){U.week++;requestRender()}else if(k==='wt'){U.week=curWeek();requestRender()}
      else if(k==='z-'||k==='z+'){LKP.zoom=Math.max(.8,Math.min(1.8,+(LKP.zoom+(k==='z+'?.1:-.1)).toFixed(2)));presZoom()}
      else if(k==='lock'){LKP.lock=!LKP.lock;canWrite=LKP.lock?false:LKP.cw;document.body.classList.toggle('pres-lock',LKP.lock);gridRows=null;requestRender()}
      else if(k==='ptr'){LKP.ptr=!LKP.ptr;document.body.classList.toggle('pres-ptr',LKP.ptr);if(!LKP.ptr)$('#presptr')?.remove()}
      else if(t.dataset.w){U.win=+t.dataset.w;requestRender()}
      else if(k==='fx'){U.day='';U.wkF=0;requestRender()}
      presBar()};
    b.onchange=e=>{const t=e.target;if(t.id==='pbpiso'){U.piso=t.value;U.pisoAll=!t.value;U.sector='';saveUI();requestRender()}if(t.id==='pbsec'){U.sector=t.value;saveUI();requestRender()}
      if(t.id==='pbwk'){U.wkF=+t.value||0;U.day='';requestRender()}if(t.id==='pbday'){U.day=t.value;U.wkF=0;requestRender()}presBar()}}
  const wd0=weekDays(U.week)[0],wd1=weekDays(U.week+U.win-1)[5];
  const ps=pisos();const pOrd=id=>(S.pis.get(id)||{}).order||0;const secs=[...S.sec.values()].filter(s=>!U.piso||pisoOfSecObj(s)===U.piso).sort((a,b)=>pOrd(pisoOfSecObj(a))-pOrd(pisoOfSecObj(b))||byOrder(a,b));
  /* filtro por semana o por día (lo mismo que tocar el encabezado de la semana o del día en la tabla) */
  const wks=[];for(let w=U.week;w<U.week+U.win;w++)wks.push(w);if(U.wkF&&!wks.includes(U.wkF))U.wkF=0;
  const dys=wks.flatMap(w=>weekDays(w)).filter(d=>isWork(d));if(U.day&&!dys.includes(U.day))U.day='';
  const fsel=`<select class="tin" id="pbwk" aria-label="Semana" title="Ver solo las actividades de una semana"><option value="">Todas las semanas</option>${wks.map(w=>`<option value="${w}"${U.wkF===w?' selected':''}>Solo semana ${w} · ${fmtD(weekDays(w)[0])}</option>`).join('')}</select>
    <select class="tin" id="pbday" aria-label="Día" title="Ver solo las actividades de un día"><option value="">Todos los días</option>${dys.map(d=>`<option value="${d}"${U.day===d?' selected':''}>${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}${d===todayIso()?' · hoy':''}</option>`).join('')}</select>
    ${U.day||U.wkF?'<button class="ib on" data-pb="fx" title="Quitar el filtro de semana o día">Quitar filtro ✕</button>':''}`;
  const h=`<b class="pbt">${esc(P().name||'Lookahead')}<small>Lookahead · semanas ${U.week}–${U.week+U.win-1} · ${fmtD(wd0)} – ${fmtD(wd1)}</small></b>
    <span class="pbg"><button class="ib" data-pb="wp" aria-label="Semana anterior">‹</button><button class="ib" data-pb="wt"${U.week===curWeek()?' disabled':''}>Hoy</button><button class="ib" data-pb="wn" aria-label="Semana siguiente">›</button></span>
    <select class="tin" id="pbpiso" aria-label="Piso"><option value="">Todos los pisos</option>${ps.map(p=>`<option value="${p.id}"${U.piso===p.id?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>
    <select class="tin" id="pbsec" aria-label="Sector"><option value="">Todos los sectores</option>${secs.map(s=>`<option value="${s.id}"${U.sector===s.id?' selected':''}>${esc(s.code)} · ${esc(s.name)}</option>`).join('')}</select>
    ${fsel}
    <span class="seg">${[3,6].map(w=>`<button data-w="${w}" class="${U.win===w?'on':''}">${w} sem</button>`).join('')}</span>
    <span class="pbg"><button class="ib" data-pb="z-" aria-label="Letra más chica">A−</button><button class="ib" data-pb="z+" aria-label="Letra más grande">A+</button></span>
    <button class="ib${LKP.ptr?' on':''}" data-pb="ptr" title="Un punto rojo sigue al mouse para señalar">● Puntero</button>
    ${LKP.cw?`<button class="ib${LKP.lock?'':' on'}" data-pb="lock" title="Bloqueada: nadie cambia algo sin querer mientras se presenta">${LKP.lock?'🔒 Edición bloqueada':'✏️ Editando'}</button>`:''}
    <span class="fsp"></span><button class="ib pri" data-pb="x" title="Salir de la presentación (Esc)">Salir ✕</button>`;
  if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
function presZoom(){const gw=$('#gw');if(gw&&LKP)gw.style.setProperty('--pz',LKP.zoom)}

/* puntero rojo para señalar en la pantalla del proyector */
document.addEventListener('pointermove',e=>{if(!LKP||!LKP.ptr)return;let p=$('#presptr');if(!p){p=document.createElement('div');p.id='presptr';p.className='presptr';document.body.appendChild(p)}
  p.style.transform=`translate(${e.clientX}px,${e.clientY}px)`},{passive:true});
document.addEventListener('keydown',e=>{if(LKP&&e.key==='Escape')presStop()});
document.addEventListener('fullscreenchange',()=>{if(LKP&&!document.fullscreenElement)presStop()});
