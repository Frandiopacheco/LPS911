"use strict";
/* LPS 911 · Estado de la jornada por subcontratista (oct 2026, pedido del dueño): gráfico comparativo de los «Detenido» reportados
   por cada SC (reporte por excepción: ya no se marca el inicio) y de quién ya cerró el día. Se ve en una hoja (botón «📊 Jornada» de En obra y del Tablero), se manda por WhatsApp
   como imagen (PNG dibujado en un lienzo, sin librerías) y es una lámina de «▶ Presentar» del día (Indicadores › Diario).
   Misma población que «Sin iniciar» (sinIniData): lo programado ese día en los pisos visibles, sin lo reprogramado (No va).
   El estado de cada actividad sale de kState (en-obra-tablero.js): detenido = «Detenido» vigente (det; tard = reportado al cierre);
   cierre = cumplido o no cumplido (propuesto por el SC/capataz o ya verificado por el ingeniero).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* por subcontratista: n programadas, det detenidas (tard: reportadas al cierre), cer cerradas */
function jorData(d){const vs=new Set(visPisos().map(p=>p.id));const API=window.__plano&&window.__plano.novaSet?window.__plano:null;const nv=API?API.novaSet(d):new Set();
  const by=new Map();
  for(const x of S.act.values()){if(!schedOrSnap(x,d)||nv.has(x.id))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid))continue;if(!S.amb.get(x.ambId))continue;
    const o=by.get(x.sc)||{sc:x.sc,n:0,det:0,tard:0,cer:0};o.n++;by.set(x.sc,o);const k=kState(d,x.id).k;
    /* detenida: «Detenido» vigente, o cerrada como no cumplida con un «Detenido» en el día */
    if(k==='stop'||(k==='no'&&lastStop(d,x.id))){o.det++;if(stopLate(d,x.id))o.tard++}if(k==='ok'||k==='no')o.cer++}
  const rows=[...by.values()];
  const sum=f=>({sc:rows.length,done:rows.filter(r=>r[f]===r.n).length,acts:rows.reduce((t,r)=>t+r[f],0),tot:rows.reduce((t,r)=>t+r.n,0)});
  const det={sc:rows.filter(r=>r.det).length,acts:rows.reduce((t,r)=>t+r.det,0),tard:rows.reduce((t,r)=>t+r.tard,0),tot:rows.reduce((t,r)=>t+r.n,0)};
  return{d,rows,det,cer:sum('cer')}}
/* los que faltan primero (los que más les falta, arriba) y después los completos */
function jorSort(rows,f){const nm=r=>conOf(r.sc).name;
  if(f==='det')return[...rows].sort((a,b)=>b.det-a.det||nm(a).localeCompare(nm(b),'es'));
  return[...rows].sort((a,b)=>{const ia=a[f]===a.n,ib=b[f]===b.n;if(ia!==ib)return ia?1:-1;return(b.n-b[f])-(a.n-a[f])||nm(a).localeCompare(nm(b),'es')})}
const jorCls=(r,f)=>f==='det'?(r.det?'warn':'ok'):r[f]===r.n?'ok':r[f]===0?'bad':'warn';
const JOR_T={det:'⏸ Detenidos reportados',cer:'Cierre del día'};
const jorHead=(s,f)=>f==='det'?`${s.sc} SC con detenidos · ${s.acts} de ${s.tot} actividades${s.tard?` · ${s.tard} reportada${s.tard===1?'':'s'} al cierre`:''}`:`${s.done} de ${s.sc} SC completos · ${s.acts} de ${s.tot} actividades`;
const jorCnt=(r,f,cl)=>f==='det'?`${r.det} de ${r.n}${r.tard?` (${r.tard} al cierre)`:''}`:`${r[f]} de ${r.n}${cl==='ok'?' ✓':''}`;
function jorBlock(R,f){const rows=jorSort(R.rows,f),s=R[f];
  const head=`<div class="jor-h"><b>${JOR_T[f]}</b><span>${jorHead(s,f)}</span></div>`;
  if(!rows.length)return`<section class="jor-b" data-jf="${f}">${head}<div class="empty">Sin actividades programadas.</div></section>`;
  return`<section class="jor-b" data-jf="${f}">${head}${rows.map(r=>{const c=conOf(r.sc),cl=jorCls(r,f);const pc=r.n?Math.round(100*r[f]/r.n):0;
    return`<div class="jor-r ${cl}" data-jsc="${esc(r.sc)}"><span class="nm"><i style="background:${c.color}"></i>${esc(c.name)}</span><span class="tr"><span class="fl" style="width:${pc}%"></span></span><span class="ct">${f==='det'?`<b>${r.det}</b> de ${r.n}${r.tard?` · ${r.tard} al cierre`:''}`:`<b>${r[f]}</b> de ${r.n}${cl==='ok'?' ✓':''}`}</span></div>`}).join('')}</section>`}
/* lámina de «▶ Presentar» del día (ind-dia.js) */
function iprdJornada(d){const R=jorData(d);if(!R.rows.length)return'<div class="iprempty">Sin actividades programadas este día.</div>';
  return`<div class="jor-p"><div class="jor-bt"><button class="ib pri" data-jor="share" data-jd="${d}">📷 Compartir imagen</button><button class="ib" data-jor="dl" data-jd="${d}">⬇ Descargar</button></div><div class="jor-2">${jorBlock(R,'det')}${jorBlock(R,'cer')}</div></div>`}

/* ---------- hoja (En obra / Tablero) ---------- */
let JOR=null;
function jorOpen(){JOR={d:todayIso()};jorDraw()}
function jorDraw(){if(!JOR)return;const R=jorData(JOR.d);
  const h=`<div class="ksh"><i class="kn" style="--k:#2563eb">📊</i><div><b>Estado de la jornada</b><span>${fmtD(R.d)} · ${nowHM()} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span><span>Detenidos reportados y quién ya cerró el día (corte ${CLOSE_CUT_T})</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    ${R.rows.length?`<div class="jor-w">${jorBlock(R,'det')}${jorBlock(R,'cer')}</div>
    <div class="kbtns two"><button class="kbig pri" data-jor="share" data-jd="${R.d}">📷 Compartir imagen</button><button class="kbig ghost" data-jor="dl" data-jd="${R.d}">⬇ Descargar</button></div>
    <div class="kbtns"><button class="kbig ghost" data-jor="ref">↻ Actualizar</button></div>
    <p class="knote">En el celular y la tablet «Compartir» abre WhatsApp; en la computadora copia la imagen para pegarla (Ctrl+V) en WhatsApp Web.</p>`
    :'<p class="knote">No hay actividades programadas hoy en estos pisos.</p>'}`;
  let sh=$('#jsheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='jsheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);const t0=NOW();
    sh.onclick=e=>{const t=e.target;if((t===sh&&NOW()-t0>400)||t.closest('[data-kx]')){sh.remove();JOR=null}}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}

/* ---------- imagen para WhatsApp (siempre con fondo blanco y colores claros, se vea como se vea la app) ---------- */
const JOR_C={ok:'#2E7D4F',warn:'#9A6A12',bad:'#B83A2E',track:'#E4E7E2',line:'#CDD3CC',ink:'#1B211E',mu:'#737C76',acc:'#1F5F7A'};
async function jorImage(d){const R=jorData(d);const W=1080,M0=44,RH=46,SC=2;
  const secs=['det','cer'].map(f=>({f,rows:jorSort(R.rows,f),s:R[f]}));
  const H=M0+118+secs.reduce((t,o)=>t+74+Math.max(1,o.rows.length)*RH+18,0)+40;
  const cv=document.createElement('canvas');cv.width=W*SC;cv.height=H*SC;const g=cv.getContext('2d');g.scale(SC,SC);
  const FF='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  const rr=(x,y,w,h,r)=>{r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
  const fit=(t,mw)=>{t=String(t);if(g.measureText(t).width<=mw)return t;while(t.length>1&&g.measureText(t+'…').width>mw)t=t.slice(0,-1);return t+'…'};
  g.fillStyle='#fff';g.fillRect(0,0,W,H);
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  g.textBaseline='alphabetic';g.textAlign='left';
  g.fillStyle=JOR_C.mu;g.font='600 22px '+FF;g.fillText(fit(P().name||'LPS 911',W-2*M0),M0,M0+22);
  g.fillStyle=JOR_C.ink;g.font='700 40px '+FF;g.fillText('Estado de la jornada',M0,M0+72);
  g.fillStyle=JOR_C.mu;g.font='500 24px '+FF;g.fillText(`${dw} ${fmtD(d)}${d===todayIso()?' · '+nowHM():''} · ${U.piso?(S.pis.get(U.piso)?.name||''):'todos los pisos'}`,M0,M0+108);
  let y=M0+118+20;
  for(const o of secs){
    g.fillStyle=JOR_C.ink;g.font='700 30px '+FF;g.fillText(JOR_T[o.f].replace('▶ ',''),M0,y+30);
    g.fillStyle=JOR_C.mu;g.font='500 22px '+FF;g.textAlign='right';g.fillText(jorHead(o.s,o.f),W-M0,y+30);g.textAlign='left';
    g.fillStyle=JOR_C.line;g.fillRect(M0,y+44,W-2*M0,2);y+=60;
    if(!o.rows.length){g.fillStyle=JOR_C.mu;g.font='500 24px '+FF;g.fillText('Sin actividades programadas.',M0,y+RH*0.65);y+=RH}
    for(const r of o.rows){const c=conOf(r.sc),cl=jorCls(r,o.f),col=JOR_C[cl],cy=y+RH/2;
      g.fillStyle=c.color||JOR_C.acc;rr(M0,cy-9,18,18,4);g.fill();
      g.fillStyle=JOR_C.ink;g.font='600 24px '+FF;g.fillText(fit(c.name,300),M0+30,cy+8);
      const bx=M0+356,bw=W-2*M0-356-150,bh=22;g.fillStyle=JOR_C.track;rr(bx,cy-bh/2,bw,bh,bh/2);g.fill();
      const fw=r.n?bw*r[o.f]/r.n:0;if(fw>0){g.fillStyle=col;rr(bx,cy-bh/2,Math.max(fw,bh),bh,bh/2);g.fill()}
      g.fillStyle=col;g.font='700 24px '+FF;g.textAlign='right';g.fillText(jorCnt(r,o.f,cl),W-M0,cy+8);g.textAlign='left';
      y+=RH}
    y+=18}
  g.fillStyle=JOR_C.mu;g.font='500 20px '+FF;g.fillText('LPS 911 · '+fmtD(d)+(d===todayIso()?' '+nowHM():''),M0,H-22);
  return new Promise(ok=>cv.toBlob(ok,'image/png'))}
/* compartir: hoja de compartir del equipo (celular/tablet → WhatsApp); si no hay, copia la imagen al portapapeles; si tampoco, la descarga */
async function jorShare(d,mode){let blob=null;try{blob=await jorImage(d)}catch(err){console.error('jornada',err)}
  if(!blob){toast('No se pudo crear la imagen');return}
  const name='jornada_'+d+'.png';
  if(mode==='share'){
    try{const f=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Estado de la jornada '+fmtD(d)});return}}catch(err){if(err&&err.name==='AbortError')return}
    try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Imagen copiada: pégala en WhatsApp (Ctrl+V)');return}}catch(err){}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Imagen descargada: adjúntala en WhatsApp')}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-jor]');if(!b)return;const k=b.dataset.jor;
  if(k==='open'){jorOpen();return}if(k==='ref'){jorDraw();return}
  if(k==='share'||k==='dl')jorShare(b.dataset.jd||todayIso(),k)});
