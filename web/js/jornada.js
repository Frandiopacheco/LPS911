"use strict";
/* LPS 911 · Estado de la jornada por subcontratista (oct 2026, pedido del dueño). Dos vistas:
   · «Detenciones»: qué reportó cada SC como «Detenido» en campo (reporte por excepción): actividad, piso y ambiente, motivo con su
     detalle, hora y estado (sigue detenido, reanudado o reportado al cierre). Resumen por motivo, que filtra. Los SC con 2 o más
     detenciones van en tarjeta; los de una sola, en una línea. Es lo que el SC reportó, no la conclusión: esa queda en «Causas».
   · «Cierre del día»: quién ya cerró el día (cumplido o no cumplido, propuesto por el SC/capataz o verificado por el ingeniero).
   Se ven en una hoja con dos pestañas (botón «📊 Jornada» de Campo y del Tablero; abre en Detenciones y, desde las 2 pm, en Cierre),
   se mandan por WhatsApp como imagen (PNG dibujado en un lienzo, sin librerías) y son dos láminas de «▶ Presentar» del día
   (Indicadores › Diario). En Campo, tocar una detención abre su ficha; en el Tablero, su resumen (solo lectura).
   Misma población que «Sin iniciar» (sinIniData): lo programado ese día en los pisos visibles, sin lo reprogramado (No va).
   El estado de cada actividad sale de kState (en-obra-tablero.js).
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
/* ---------- detenciones ---------- */
/* detenciones del día: cada actividad programada (misma población) con un «Detenido» ese día. Por actividad, el último.
   st: stop (sigue detenido o se cerró sin reanudar), res (reanudado), late (reportado al cierre: no sugiere causa ajena) */
function jorDet(d){const vs=new Set(visPisos().map(p=>p.id));const API=window.__plano&&window.__plano.novaSet?window.__plano:null;const nv=API?API.novaSet(d):new Set();
  const L=[],scN=new Map();
  for(const x of S.act.values()){if(!schedOrSnap(x,d)||nv.has(x.id))continue;const pid=pisoOfAct(x.id);if(!pid||!vs.has(pid))continue;const a=S.amb.get(x.ambId);if(!a)continue;
    scN.set(x.sc,(scN.get(x.sc)||0)+1);const lv=liveOf(d,x.id);if(!lv)continue;
    const log=(lv.log||[]).filter(Boolean);let ei=-1;for(let i=log.length-1;i>=0;i--)if(log[i].s==='stop'&&log[i].m!==STOP_INFO){ei=i;break}
    const k=kState(d,x.id).k;let mot='',note='';
    if(k==='stop'&&lv.mot){const raw=String(lv.mot),i=raw.indexOf(' — ');mot=i<0?raw:raw.slice(0,i);note=i<0?'':raw.slice(i+3).trim()}
    else if(ei>=0){mot=String(log[ei].m||'');note=String(log[ei].x||'')}
    if(mot===STOP_INFO||(ei<0&&k!=='stop'))continue;
    const e=ei>=0?log[ei]:null;const rs=ei>=0?log.slice(ei+1).find(q=>q.s==='res'||q.s==='run'):null;
    const st=stopLate(d,x.id)?'late':k==='stop'||(k==='no'&&!rs)?'stop':'res';
    L.push({x,a,p:S.pis.get(pid),sc:x.sc,k,t:e?e.t:null,mot:mot||'Sin motivo',note,st,resT:rs?rs.t:null})}
  L.sort((p,q)=>(p.t||0)-(q.t||0));
  return{d,L,scN}}
const JDT_C={stop:'jdt-stop',res:'jdt-res',late:'jdt-late'};
const jdtLab=o=>o.st==='late'?'Reportado al cierre':o.st==='res'?'Reanudado'+(o.resT?' '+hhmm(o.resT):''):o.k==='no'?'No se reanudó':'Sigue detenido';
/* motivo elegido para filtrar (hoja y lámina comparten el filtro) */
let JOR_MOT='';
/* conteos, motivos y grupos por SC (de más a menos detenciones) con el filtro de motivo */
function jdtModel(D){const all=D.L;const mots={};all.forEach(o=>mots[o.mot]=(mots[o.mot]||0)+1);if(JOR_MOT&&!mots[JOR_MOT])JOR_MOT='';
  const L=JOR_MOT?all.filter(o=>o.mot===JOR_MOT):all;const nAll=new Map();all.forEach(o=>nAll.set(o.sc,(nAll.get(o.sc)||0)+1));
  const by=new Map();L.forEach(o=>{const g=by.get(o.sc)||{sc:o.sc,L:[],tot:nAll.get(o.sc),n:D.scN.get(o.sc)||0};g.L.push(o);by.set(o.sc,g)});
  const nm=g=>conOf(g.sc).name;const G=[...by.values()].sort((p,q)=>q.tot-p.tot||q.L.length-p.L.length||nm(p).localeCompare(nm(q),'es'));
  return{all,L,G,mots:Object.entries(mots).sort((p,q)=>q[1]-p[1]||p[0].localeCompare(q[0],'es')),
    k:{tot:all.length,sc:nAll.size,stop:all.filter(o=>o.st==='stop').length,res:all.filter(o=>o.st==='res').length,late:all.filter(o=>o.st==='late').length}}}
const jdtWhere=o=>`${o.p?esc(o.p.code||o.p.name||''):''}${o.p?' · ':''}${esc(o.a.name||'')}`;
const jdtWhy=o=>`<b>${esc(o.mot)}</b>${o.note?' · '+esc(o.note):''}`;
/* tap: en la hoja de Campo/Tablero cada detención abre su ficha */
function jdtLine(o,tap){return`<div class="jdt-i"${tap?` data-jdt="${esc(o.x.id)}" role="button" tabindex="0"`:''}><span class="jdt-h">${o.t?hhmm(o.t):'—'}</span><div class="jdt-w"><div class="jdt-a">${esc(o.x.name)}</div><div class="jdt-p">${jdtWhere(o)}</div><div class="jdt-m">${jdtWhy(o)}</div></div><span class="jdt-s ${JDT_C[o.st]}">${jdtLab(o)}</span></div>`}
function jorDetBlock(D,tap){const M=jdtModel(D);
  if(!M.all.length)return`<section class="jdt"><div class="empty">Ningún subcontratista reportó detenciones${D.d===todayIso()?' hasta ahora':''}.</div></section>`;
  const K=(v,t,c)=>`<div class="jdt-k${c?' '+c:''}"><b>${v}</b><span>${t}</span></div>`;
  const kp=`<div class="jdt-ks">${K(M.k.tot,`detenci${M.k.tot===1?'ón':'ones'} en ${M.k.sc} SC`,'bad')}${K(M.k.stop,'siguen detenidas','bad')}${K(M.k.res,'reanudadas','ok')}${M.k.late?K(M.k.late,'reportadas al cierre','late'):''}</div>`;
  const ch=`<div class="jdt-mot" role="group" aria-label="Filtrar por motivo"><button class="chip${JOR_MOT?'':' on'}" data-jor="mot" data-jm="">Todos <b>${M.all.length}</b></button>${M.mots.map(([m,n])=>`<button class="chip${JOR_MOT===m?' on':''}" data-jor="mot" data-jm="${esc(m)}">${esc(m)} <b>${n}</b></button>`).join('')}</div>`;
  const big=M.G.filter(g=>g.tot>=2),one=M.G.filter(g=>g.tot<2);
  const cards=big.length?`<div class="jdt-cs">${big.map(g=>{const c=conOf(g.sc);return`<div class="jdt-c"><div class="jdt-ch"><i style="background:${c.color}"></i><b>${esc(c.name)}</b><span><b>${g.tot}</b> de ${g.n}</span></div>${g.L.map(o=>jdtLine(o,tap)).join('')}</div>`}).join('')}</div>`:'';
  const ones=one.length?`<div class="jdt-one"><div class="jdt-sep">Con una sola detención</div>${one.map(g=>{const c=conOf(g.sc),o=g.L[0];return`<div class="jdt-ln"${tap?` data-jdt="${esc(o.x.id)}" role="button" tabindex="0"`:''}><i style="background:${c.color}"></i><b>${esc(c.name)}</b><span>${esc(o.x.name)} · ${jdtWhere(o)}</span><span class="mu">${jdtWhy(o)} · ${o.t?hhmm(o.t):'—'}</span><span class="jdt-s ${JDT_C[o.st]}">${jdtLab(o)}</span></div>`}).join('')}</div>`:'';
  return`<section class="jdt">${kp}${ch}${cards}${ones}</section>`}
/* láminas de «▶ Presentar» del día (ind-dia.js): f = 'cer' (Cierre del día) o 'det' (Detenciones) */
function iprdJornada(d,f){f=f==='det'?'det':'cer';const btn=`<div class="jor-bt"><button class="ib pri" data-jor="share" data-jd="${d}" data-jf="${f}">📷 Compartir imagen</button><button class="ib" data-jor="dl" data-jd="${d}" data-jf="${f}">⬇ Descargar</button></div>`;
  if(f==='det')return`<div class="jor-p">${btn}${jorDetBlock(jorDet(d),false)}</div>`;
  const R=jorData(d);if(!R.rows.length)return'<div class="iprempty">Sin actividades programadas este día.</div>';
  return`<div class="jor-p">${btn}${jorBlock(R,'cer')}</div>`}

/* ---------- hoja (En obra / Tablero) y sección de «Hoy» ---------- */
let JOR=null;
/* sección «Estado de la jornada» de la pestaña Hoy (admin y editores): su propio día y pestaña */
let JORH=null;
/* historial: se puede ir hacia atrás hasta JOR_BACK días (lo que se baja del registro diario) */
const JOR_BACK=60;
const jorTab0=d=>d<todayIso()||nowHM()>='14:00'?'cer':'det';
/* abre en Detenciones; desde las 2 pm (cuando empiezan los cierres), en Cierre del día */
function jorOpen(){JOR={d:todayIso(),tab:jorTab0(todayIso())};jorDraw()}
/* día anterior / siguiente (sin domingos, como Campo); nunca después de hoy */
function jorShift(o,dir){const t=todayIso(),lim=addD(t,-JOR_BACK);let x=dir===0?t:shiftDay(o.d,dir);if(x>t)x=t;if(x<lim)x=lim;if(x===o.d)return false;
  o.d=x;if(x<t){const p=ensureDaily(x);if(p&&p.then)p.then(()=>{if(o===JOR)jorDraw();else requestRender()})}return true}
function jorNav(o){const t=todayIso(),lim=addD(t,-JOR_BACK);const dw=DOW_L[(pd(o.d).getUTCDay()+6)%7];
  return`<span class="jor-nav"><button class="ib" data-jor="day" data-jdd="-1" aria-label="Día anterior"${o.d<=lim?' disabled':''}>&#8249;</button><b>${dw} ${fmtD(o.d)}${o.d===t?' · hoy':''}</b><button class="ib" data-jor="day" data-jdd="1" aria-label="Día siguiente"${o.d>=t?' disabled':''}>&#8250;</button>${o.d!==t?'<button class="ib" data-jor="day" data-jdd="0">Hoy</button>':''}</span>`}
/* pestañas + días + contenido + compartir: lo mismo en la hoja y en Hoy */
function jorView(o,tap){const f=o.tab,R=jorData(o.d);const hoy=o.d===todayIso();
  const tabs=`<span class="seg jor-tabs"><button data-jor="tab" data-jt="det" class="${f==='det'?'on':''}">Detenciones</button><button data-jor="tab" data-jt="cer" class="${f==='cer'?'on':''}">Cierre del día</button></span>`;
  const body=f==='det'?jorDetBlock(jorDet(o.d),tap):R.rows.length?jorBlock(R,'cer'):`<p class="knote">No hay actividades programadas ${hoy?'hoy':'ese día'} en estos pisos.</p>`;
  return{R,html:`<div class="jor-top">${tabs}${jorNav(o)}</div><div class="jor-w">${body}</div>`,
    share:`<button class="kbig pri" data-jor="share" data-jd="${R.d}" data-jf="${f}">📷 Compartir imagen</button><button class="kbig ghost" data-jor="dl" data-jd="${R.d}" data-jf="${f}">⬇ Descargar</button>`}}
function jorDraw(){if(!JOR)return;const f=JOR.tab;const tap=U.tab==='dash'||U.tab==='hoy'||((U.tab==='cap'||U.tab==='campo')&&canDaily);const V=jorView(JOR,tap);
  const h=`<div class="ksh"><i class="kn" style="--k:#2563eb">📊</i><div><b>Estado de la jornada</b><span>${fmtD(V.R.d)} · ${nowHM()} · ${U.piso?esc(S.pis.get(U.piso)?.name||''):'todos los pisos'}</span><span>${f==='det'?'Lo que los subcontratistas reportaron como «Detenido»':'Quién ya cerró el día (corte '+cutT()+')'}</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    ${V.html}
    <div class="kbtns two">${V.share}</div>
    <div class="kbtns"><button class="kbig ghost" data-jor="ref">↻ Actualizar</button></div>
    <p class="knote">${tap?'Toca una detención para ver su ficha; al cerrarla vuelves aquí. ':''}En el celular y la tablet «Compartir» abre WhatsApp; en la computadora copia la imagen para pegarla (Ctrl+V) en WhatsApp Web.</p>`;
  let sh=$('#jsheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='jsheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);const t0=NOW();
    sh.onclick=e=>{const t=e.target;if((t===sh&&NOW()-t0>400)||t.closest('[data-kx]')){sh.remove();JOR=null}}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}
/* sección de la pestaña Hoy (admin y editores): el detalle completo, con historial; tocar una detención abre su ficha encima */
const jorHoyOk=()=>!!me&&canWrite&&me.role!=='sc';
function jorHoySec(){if(!jorHoyOk())return'';if(!JORH)JORH={d:todayIso(),tab:jorTab0(todayIso())};const V=jorView(JORH,canDaily);
  return`<section class="card jorhoy" id="hoyjor"><h2>📊 Estado de la jornada <span class="sub">${JORH.tab==='det'?'lo que los SC reportaron como «Detenido»':'quién ya cerró el día (corte '+cutT()+')'} · ${pisoLabel()}</span></h2>
    <div class="pad">${V.html}<div class="jor-bt">${V.share.replace(/kbig pri/,'ib pri').replace(/kbig ghost/,'ib')}</div></div></section>`}
const FICHA_SEL='#ksheet,#dpsheet';
/* tocar una detención: en el Tablero su resumen; en Campo y Hoy su ficha. Desde la hoja, la hoja se aparta mientras
   la ficha está abierta y vuelve (actualizada) al cerrarla: así se revisan una tras otra sin perder la lista */
function jdtOpen(aid,d,fromSheet){d=d||(JOR?JOR.d:todayIso());const sh=fromSheet?$('#jsheet'):null;
  if(U.tab==='dash'&&typeof dashPop==='function')dashPop(aid,d);else if(canDaily&&typeof capSheet==='function')capSheet(aid,d,'main');
  if(!sh||!document.querySelector(FICHA_SEL))return;sh.style.display='none';
  const mo=new MutationObserver(()=>{if(document.querySelector(FICHA_SEL))return;mo.disconnect();if(!sh.isConnected||!JOR)return;sh.style.display='';jorDraw()});
  mo.observe(document.body,{childList:true})}

/* ---------- imagen para WhatsApp (siempre con fondo blanco y colores claros, se vea como se vea la app) ---------- */
const JOR_C={ok:'#2E7D4F',warn:'#9A6A12',bad:'#B83A2E',track:'#E4E7E2',line:'#CDD3CC',ink:'#1B211E',mu:'#737C76',acc:'#1F5F7A'};
/* lienzo con la cabecera común (obra, título, fecha y piso); devuelve el lienzo, el contexto y utilidades */
function jorCanvas(d,H,title){const W=1080,M0=44,SC=2;
  const cv=document.createElement('canvas');cv.width=W*SC;cv.height=H*SC;const g=cv.getContext('2d');g.scale(SC,SC);
  const FF='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
  const rr=(x,y,w,h,r)=>{r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()};
  const fit=(t,mw)=>{t=String(t);if(g.measureText(t).width<=mw)return t;while(t.length>1&&g.measureText(t+'…').width>mw)t=t.slice(0,-1);return t+'…'};
  g.fillStyle='#fff';g.fillRect(0,0,W,H);
  const dw=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][pd(d).getUTCDay()];
  g.textBaseline='alphabetic';g.textAlign='left';
  g.fillStyle=JOR_C.mu;g.font='600 22px '+FF;g.fillText(fit(P().name||'LPS 911',W-2*M0),M0,M0+22);
  g.fillStyle=JOR_C.ink;g.font='700 40px '+FF;g.fillText(title,M0,M0+72);
  g.fillStyle=JOR_C.mu;g.font='500 24px '+FF;g.fillText(`${dw} ${fmtD(d)}${d===todayIso()?' · '+nowHM():''} · ${U.piso?(S.pis.get(U.piso)?.name||''):'todos los pisos'}`,M0,M0+108);
  const foot=()=>{g.fillStyle=JOR_C.mu;g.font='500 20px '+FF;g.textAlign='left';g.fillText('LPS 911 · '+fmtD(d)+(d===todayIso()?' '+nowHM():''),M0,H-22)};
  return{cv,g,W,M0,FF,rr,fit,foot}}
/* imagen del cierre del día */
function jorImgCer(d){const R=jorData(d);const RH=46,M=44;const rows=jorSort(R.rows,'cer');
  const H=M+118+74+Math.max(1,rows.length)*RH+18+40;const C=jorCanvas(d,H,'Cierre del día');const{g,W,M0,FF,rr,fit}=C;
  let y=M0+118+20;
  g.fillStyle=JOR_C.mu;g.font='500 22px '+FF;g.fillText(jorHead(R.cer,'cer')+' · corte '+cutT(),M0,y+30);
  g.fillStyle=JOR_C.line;g.fillRect(M0,y+44,W-2*M0,2);y+=60;
  if(!rows.length){g.fillStyle=JOR_C.mu;g.font='500 24px '+FF;g.fillText('Sin actividades programadas.',M0,y+RH*0.65)}
  for(const r of rows){const c=conOf(r.sc),cl=jorCls(r,'cer'),col=JOR_C[cl],cy=y+RH/2;
    g.fillStyle=c.color||JOR_C.acc;rr(M0,cy-9,18,18,4);g.fill();
    g.fillStyle=JOR_C.ink;g.font='600 24px '+FF;g.fillText(fit(c.name,300),M0+30,cy+8);
    const bx=M0+356,bw=W-2*M0-356-150,bh=22;g.fillStyle=JOR_C.track;rr(bx,cy-bh/2,bw,bh,bh/2);g.fill();
    const fw=r.n?bw*r.cer/r.n:0;if(fw>0){g.fillStyle=col;rr(bx,cy-bh/2,Math.max(fw,bh),bh,bh/2);g.fill()}
    g.fillStyle=col;g.font='700 24px '+FF;g.textAlign='right';g.fillText(jorCnt(r,'cer',cl),W-M0,cy+8);g.textAlign='left';y+=RH}
  C.foot();return C.cv}
/* imagen de las detenciones (con el filtro de motivo, si hay uno) */
const JDT_IC={stop:{f:'#F6E0DD',c:'#B83A2E'},res:{f:'#DDEFE3',c:'#2E7D4F'},late:{f:'#F7EBCF',c:'#9A6A12'}};
function jorImgDet(d){const M=jdtModel(jorDet(d));const RH=92,GH=56,M0x=44;
  const H=M0x+118+70+(M.G.length?M.G.reduce((t,g)=>t+GH+g.L.length*RH+14,0):60)+70;
  const C=jorCanvas(d,H,'Detenciones'+(JOR_MOT?' · '+JOR_MOT:''));const{g,W,M0,FF,rr,fit}=C;
  let y=M0+118+20;g.fillStyle=JOR_C.mu;g.font='500 22px '+FF;
  g.fillText(M.all.length?`${M.k.tot} detenciones en ${M.k.sc} SC · ${M.k.stop} siguen detenidas · ${M.k.res} reanudadas${M.k.late?` · ${M.k.late} al cierre`:''}`:'Ningún subcontratista reportó detenciones.',M0,y+30);
  g.fillStyle=JOR_C.line;g.fillRect(M0,y+44,W-2*M0,2);y+=70;
  for(const G of M.G){const c=conOf(G.sc);
    g.fillStyle=c.color||JOR_C.acc;rr(M0,y+14,20,20,4);g.fill();
    g.fillStyle=JOR_C.ink;g.font='700 28px '+FF;g.fillText(fit(c.name,W-2*M0-200),M0+32,y+34);
    g.fillStyle=JOR_C.bad;g.font='700 24px '+FF;g.textAlign='right';g.fillText(`${G.tot} de ${G.n}`,W-M0,y+34);g.textAlign='left';y+=GH;
    for(const o of G.L){const P0=JDT_IC[o.st];const lab=jdtLab(o);
      g.font='700 20px '+FF;const pw=g.measureText(lab).width+28;
      g.fillStyle=JOR_C.mu;g.font='600 22px '+FF;g.fillText(o.t?hhmm(o.t):'—',M0+4,y+30);
      const tx=M0+90,tw=W-M0-tx-pw-16;
      g.fillStyle=JOR_C.ink;g.font='600 24px '+FF;g.fillText(fit(o.x.name,tw),tx,y+28);
      g.fillStyle=JOR_C.mu;g.font='500 21px '+FF;g.fillText(fit(`${o.p?(o.p.code||o.p.name||'')+' · ':''}${o.a.name||''}`,tw),tx,y+56);
      g.fillStyle=JOR_C.ink;g.font='500 21px '+FF;g.fillText(fit(o.mot+(o.note?' · '+o.note:''),tw),tx,y+82);
      g.fillStyle=P0.f;rr(W-M0-pw,y+8,pw,32,16);g.fill();g.fillStyle=P0.c;g.font='700 20px '+FF;g.textAlign='center';g.fillText(lab,W-M0-pw/2,y+31);g.textAlign='left';
      g.fillStyle=JOR_C.track;g.fillRect(tx,y+RH-4,W-M0-tx,1);y+=RH}
    y+=14}
  C.foot();return C.cv}
function jorImage(d,f){const cv=f==='det'?jorImgDet(d):jorImgCer(d);return new Promise(ok=>cv.toBlob(ok,'image/png'))}
/* compartir: hoja de compartir del equipo (celular/tablet → WhatsApp); si no hay, copia la imagen al portapapeles; si tampoco, la descarga */
async function jorShare(d,mode,f){f=f==='det'?'det':'cer';let blob=null;try{blob=await jorImage(d,f)}catch(err){console.error('jornada',err)}
  if(!blob){toast('No se pudo crear la imagen');return}
  const name=(f==='det'?'detenciones_':'cierre_')+d+'.png',tt=(f==='det'?'Detenciones ':'Cierre del día ')+fmtD(d);
  if(mode==='share'){
    try{const fl=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[fl]})){await navigator.share({files:[fl],title:tt});return}}catch(err){if(err&&err.name==='AbortError')return}
    try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Imagen copiada: pégala en WhatsApp (Ctrl+V)');return}}catch(err){}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Imagen descargada: adjúntala en WhatsApp')}
document.addEventListener('click',e=>{const t=e.target;if(!t.closest)return;
  const ln=t.closest('#jsheet [data-jdt],#hoyjor [data-jdt]');if(ln){const inS=!!ln.closest('#jsheet');jdtOpen(ln.dataset.jdt,inS?null:JORH&&JORH.d,inS);return}
  const b=t.closest('[data-jor]');if(!b)return;const k=b.dataset.jor;
  if(k==='open'){jorOpen();return}
  if(k==='opendet'){document.querySelectorAll('#dpsheet').forEach(o=>o.remove());JOR={d:todayIso(),tab:'det'};jorDraw();return}if(k==='ref'){jorDraw();return}
  const inH=!!b.closest('#hoyjor'),st=inH?JORH:JOR;const redraw=()=>{if(inH)requestRender();else jorDraw()};
  if(k==='tab'){if(st){st.tab=b.dataset.jt==='cer'?'cer':'det';redraw()}return}
  if(k==='day'){if(st&&jorShift(st,+b.dataset.jdd))redraw();return}
  if(k==='mot'){JOR_MOT=b.dataset.jm||'';if(b.closest('#ipr')){if(typeof iprDraw==='function')iprDraw()}else{if(JOR)jorDraw();if(U.tab==='hoy')requestRender()}return}
  if(k==='share'||k==='dl')jorShare(b.dataset.jd||todayIso(),k,b.dataset.jf)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target&&e.target.closest&&e.target.closest('#jsheet [data-jdt],#hoyjor [data-jdt]')){e.preventDefault();e.target.closest('[data-jdt]').click()}});
