"use strict";
/* LPS 911 · Avisos de detenciones al celular y a la computadora (oct 2026, pedido del dueño; docs/ia/avisos.md).
   Cuando un SC/capataz/ingeniero marca «Detenido» en campo, la página pide al servidor (functions: avisoDetenido) que avise a los responsables de
   ese piso (editores con el piso a cargo) y a los administradores, menos a quien lo reportó, en días hábiles y dentro del
   horario de Configuración › Proyecto (pushIni–pushFin, por defecto 7:00–18:00). No avisa lo reportado al cierre.
   Aquí: activar / desactivar los avisos en cada equipo (Firebase Cloud Messaging, token en push/<sha256>), los pisos de los
   que quiere avisos un administrador (pushp/<correo>), el aviso de prueba y abrir la ficha al tocar un aviso.
   El SDK de mensajería se carga solo cuando hace falta. Necesita la clave Web Push del proyecto (window.FCM_VAPID, config/).
   En iPhone/iPad los avisos web solo funcionan con la app agregada a la pantalla de inicio (iOS 16.4 o más). */

const PUSH_SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js';
const PUSH_LS='lps.push';
/* horario de avisos (mismo criterio que functions/lib.js pushHorario) */
function pushHor(){const ok=v=>typeof v==='string'&&/^\d\d:\d\d$/.test(v);const p=P();const ini=ok(p.pushIni)?p.pushIni:'07:00';let fin=ok(p.pushFin)?p.pushFin:'18:00';if(fin<=ini)fin='18:00';return{ini,fin}}
const pushRole=()=>!!me&&(me.role==='admin'||me.role==='editor');
const pushMid=()=>String(me&&me.email||'').toLowerCase();
const pushIOS=()=>/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const pushStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
const pushApi=()=>'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window&&!window.NO_SW;
const pushLs=(v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(PUSH_LS)||'null');if(v===null)localStorage.removeItem(PUSH_LS);else localStorage.setItem(PUSH_LS,JSON.stringify(v))}catch(e){return null}};
/* activado en este equipo: hay registro guardado, es de este usuario y el navegador da permiso */
const pushActive=()=>{const r=pushLs();return!!(r&&r.id&&r.em===pushMid()&&pushApi()&&Notification.permission==='granted')};
function pushDev(){const u=navigator.userAgent;const os=/Android/.test(u)?'Android':/iPhone/.test(u)?'iPhone':pushIOS()?'iPad':/Windows/.test(u)?'Windows':/Mac/.test(u)?'Mac':'Linux';
  const br=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Navegador';return os+' · '+br}
async function pushSha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
let PUSH_SDKP=null;
function pushLoad(){if(firebase.messaging)return Promise.resolve();if(PUSH_SDKP)return PUSH_SDKP;
  PUSH_SDKP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=PUSH_SDK;s.crossOrigin='anonymous';s.onload=()=>ok();s.onerror=()=>{PUSH_SDKP=null;ko(new Error('No se pudo cargar el módulo de avisos (¿sin internet?)'))};document.head.appendChild(s)});return PUSH_SDKP}
async function pushToken(){await pushLoad();const reg=await navigator.serviceWorker.ready;return firebase.messaging().getToken({vapidKey:window.FCM_VAPID,serviceWorkerRegistration:reg})}
async function pushSave(tok){const id=await pushSha(tok);await fcol('push').doc(id).set({em:pushMid(),tok,dev:pushDev(),t:NOW()});return id}
/* activar en este equipo (pide permiso al navegador) */
async function pushEnable(){
  if(!window.FCM_VAPID){toast('Falta la clave de avisos del proyecto.');return}
  if(!pushApi()){toast(pushIOS()&&!pushStandalone()?'Primero agrega LPS 911 a la pantalla de inicio.':'Este navegador no permite avisos.');return}
  let perm=Notification.permission;if(perm==='default')perm=await Notification.requestPermission();
  if(perm!=='granted'){toast('No diste permiso para los avisos en este navegador.');pushDraw();return}
  PUSHUI.busy=true;pushDraw();
  try{const tok=await pushToken();if(!tok)throw new Error('sin token');const id=await pushSave(tok);const old=pushLs();if(old&&old.id&&old.id!==id)fcol('push').doc(old.id).delete().catch(()=>{});
    pushLs({id,em:pushMid(),t:NOW()});toast('Avisos activados en este equipo')}
  catch(err){console.error('avisos',err);toast('No se pudieron activar los avisos: '+(err&&err.message||err))}
  PUSHUI.busy=false;pushDraw()}
/* desactivar en este equipo */
async function pushDisable(){const r=pushLs();PUSHUI.busy=true;pushDraw();
  try{if(r&&r.id)await fcol('push').doc(r.id).delete()}catch(err){console.warn('avisos',err)}
  try{await pushLoad();await firebase.messaging().deleteToken()}catch(err){}
  pushLs(null);PUSHUI.busy=false;toast('Avisos desactivados en este equipo');pushDraw()}
/* al entrar: renueva el registro de este equipo (el token puede cambiar) una vez cada 3 días */
async function pushRefresh(){if(!pushRole()||!window.FCM_VAPID||!pushActive())return;const r=pushLs();if(NOW()-(r.t||0)<3*864e5)return;
  try{const tok=await pushToken();if(!tok)return;const id=await pushSave(tok);if(id!==r.id)fcol('push').doc(r.id).delete().catch(()=>{});pushLs({id,em:pushMid(),t:NOW()})}catch(err){console.warn('avisos',err)}}
async function pushTest(){PUSHUI.busy=true;pushDraw();
  try{const x=await firebase.functions().httpsCallable('avisoPrueba')({});const d=(x&&x.data)||{};toast(d.ok?`Aviso de prueba enviado a ${d.ok} equipo${d.ok===1?'':'s'}`:'No se pudo enviar el aviso de prueba')}
  catch(err){toast(err&&err.message||'No se pudo enviar el aviso de prueba')}
  PUSHUI.busy=false;pushDraw()}

/* ---------- hoja «🔔 Avisos» ---------- */
let PUSHUI=null;
function pushOpen(){if(!pushRole())return;PUSHUI={busy:false,pisos:null};pushDraw();
  if(me.role==='admin')fcol('pushp').doc(pushMid()).get().then(s=>{if(!PUSHUI)return;PUSHUI.pisos=(s.exists&&Array.isArray(s.data().pisos))?s.data().pisos:[];pushDraw()}).catch(()=>{if(PUSHUI){PUSHUI.pisos=[];pushDraw()}})}
function pushDraw(){if(!PUSHUI)return;const H=pushHor(),adm=me.role==='admin';
  const mine=adm?null:memPisos(MEM.get(pushMid())).map(id=>S.pis.get(id)).filter(Boolean);
  const scope=adm?(PUSHUI.pisos&&PUSHUI.pisos.length?PUSHUI.pisos.map(id=>esc((S.pis.get(id)||{}).code||id)).join(', '):'todos los pisos'):mine.length?mine.map(p=>esc(p.code||p.name)).join(', '):'';
  let st='';
  if(!window.FCM_VAPID)st=`<div class="callout warn">Falta configurar la clave de avisos del proyecto${adm?' (Firebase › Cloud Messaging › Certificados web push)':': avisa al administrador'}.</div>`;
  else if(!pushApi())st=pushIOS()&&!pushStandalone()?`<div class="callout"><b>En iPhone y iPad</b> los avisos solo llegan con LPS 911 en la pantalla de inicio:<ol class="pushol"><li>Abre esta página en <b>Safari</b>.</li><li>Toca <b>Compartir</b> (el cuadro con la flecha) › <b>Agregar a inicio</b>.</li><li>Abre LPS 911 desde ese ícono y vuelve aquí para activar los avisos.</li></ol></div>`:'<div class="callout">Este navegador no permite avisos. Usa Chrome, Edge o Safari actualizados.</div>';
  else if(Notification.permission==='denied')st='<div class="callout warn">Bloqueaste los avisos para LPS 911 en este navegador. Permítelos en la configuración del sitio (el candado junto a la dirección) y vuelve a abrir esta ventana.</div>';
  const act=pushActive(),can=!!window.FCM_VAPID&&pushApi()&&Notification.permission!=='denied',b=PUSHUI.busy?' disabled':'';
  const pis=adm?`<div class="ksl">Pisos de los que quieres avisos</div><div class="kchips kw">${PUSHUI.pisos==null?'<span class="knote">Cargando…</span>':`<button class="${PUSHUI.pisos.length?'':'on'}" data-push="pall">Todos</button>${pisos().map(p=>`<button class="${PUSHUI.pisos.includes(p.id)?'on':''}" data-push="pis" data-pp="${esc(p.id)}">${esc(p.code||p.name)}</button>`).join('')}`}</div>`:'';
  const h=`<div class="ksh"><i class="kn" style="--k:#B83A2E">🔔</i><div><b>Avisos de detenciones</b><span>${esc(pushDev())}</span></div><button class="kx" data-kx aria-label="Cerrar">×</button></div>
    <p class="knote" style="font-size:.95em">${adm||mine.length?`Te llega un aviso cuando un subcontratista marca <b>«Detenido»</b> en <b>${scope}</b>, de lunes a sábado de ${H.ini} a ${H.fin}. Al tocarlo se abre la ficha de esa actividad en Campo.`:'No tienes pisos a cargo, así que no te llegarán avisos. El administrador asigna los pisos en <b>Equipo</b>.'}</p>
    ${st}
    ${act?`<div class="pushok">✓ Avisos activados en este equipo</div><div class="kbtns two"><button class="kbig ghost" data-push="test"${b}>Enviar aviso de prueba</button><button class="kbig ghost" data-push="off"${b}>Desactivar aquí</button></div>`
      :can?`<div class="kbtns"><button class="kbig pri" data-push="on"${b}>🔔 Activar en este equipo</button></div>`:''}
    ${pis}
    <p class="knote">Actívalo en cada equipo donde quieras recibirlos: celular y computadora.</p>`;
  let sh=$('#pushsheet');if(!sh){sh=document.createElement('div');sh.className='ksheet';sh.id='pushsheet';sh.innerHTML='<div class="ksc"></div>';document.body.appendChild(sh);const t0=NOW();
    sh.onclick=e=>{const t=e.target;if((t===sh&&NOW()-t0>400)||t.closest('[data-kx]')){sh.remove();PUSHUI=null}}}
  const sc=sh.firstChild;if(sc.dataset.h!==h){sc.innerHTML=h;sc.dataset.h=h}}
async function pushPisos(next){PUSHUI.pisos=next;pushDraw();try{await fcol('pushp').doc(pushMid()).set({pisos:next,t:NOW()})}catch(err){toast('No se pudo guardar: '+(err&&err.message||err))}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-push]');if(!b)return;const k=b.dataset.push;
  if(k==='open'){pushOpen();return}if(!PUSHUI||PUSHUI.busy)return;
  if(k==='on')pushEnable();else if(k==='off')pushDisable();else if(k==='test')pushTest();
  else if(k==='pall')pushPisos([]);
  else if(k==='pis'&&PUSHUI.pisos){const id=b.dataset.pp;const cur=new Set(PUSHUI.pisos);cur.has(id)?cur.delete(id):cur.add(id);pushPisos(pisos().map(p=>p.id).filter(x=>cur.has(x)))}});

/* ---------- tocar un aviso: abre la ficha de la actividad en Campo ---------- */
function pushGo(aid,d){if(!aid)return;let n=0;
  const go=()=>{if(!ready||!me){if(++n<100)setTimeout(go,300);return}
    if(!S.act.get(aid)){toast('Esa actividad ya no está en el lookahead.');return}
    if(typeof goMod==='function'&&U.mod!=='lps')goMod('lps');if(U.tab!=='campo'&&U.tab!=='cap')goTab('campo');
    setTimeout(()=>{if(typeof capSheet==='function')capSheet(aid,d||todayIso(),'main')},250)};
  go()}
{const q=new URLSearchParams(location.search);const aid=q.get('det');if(aid){const d=q.get('d')||'';try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}pushGo(aid,/^\d{4}-\d\d-\d\d$/.test(d)?d:'')}}
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{const m=e.data||{};if(m.t==='det')pushGo(m.aid,m.d)});
/* botón 🔔 arriba (responsables de piso y administrador) y renovación del registro al entrar */
function pushTop(){const b=$('#bpush');if(!b)return;const ok=pushRole()&&!(typeof IN_FRAME!=='undefined'&&IN_FRAME);if(b.hidden!==!ok)b.hidden=!ok;b.classList.toggle('on',ok&&pushActive());
  if(ok&&!PUSH_REF){PUSH_REF=true;setTimeout(pushRefresh,4000)}}
let PUSH_REF=false;

/* ---------- pedir el aviso al guardar un «Detenido» ----------
   Cola en el equipo (lps.pushq): se pide cuando el reporte ya llegó a la base; sin señal, se reintenta al volver la conexión
   (el servidor no avisa lo que llegó con más de 6 h de atraso ni lo que ya avisó). */
const PUSHQ='lps.pushq';
const pushQ=v=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(PUSHQ)||'[]');localStorage.setItem(PUSHQ,JSON.stringify(v))}catch(e){return[]}};
function pushNotify(d,aid){const lv=liveOf(d,aid);const e=lv&&[...(lv.log||[])].reverse().find(x=>x&&x.s==='stop');if(!e)return;
  const q=pushQ()||[];if(!q.some(o=>o.id===d+'_'+aid&&o.t===e.t))q.push({id:d+'_'+aid,t:e.t});pushQ(q.slice(-30));pushFlush()}
let PUSHF=false;
async function pushFlush(){if(PUSHF||!db||!me)return;let q=pushQ()||[];if(!q.length||navigator.onLine===false)return;PUSHF=true;
  try{try{await db.waitForPendingWrites()}catch(e){}
    q=pushQ()||[];const rest=[];
    for(const it of q){if(NOW()-it.t>6*3600e3)continue;
      try{await firebase.functions().httpsCallable('avisoDetenido')(it)}
      catch(err){const c=String(err&&err.code||'');if(/unavailable|deadline|internal|unknown|resource/.test(c))rest.push(it);else console.warn('aviso de detenido',err)}}
    const now=pushQ()||[];pushQ([...rest,...now.filter(o=>!q.some(x=>x.id===o.id&&x.t===o.t))])}
  finally{PUSHF=false}}
addEventListener('online',()=>setTimeout(pushFlush,2000));
setInterval(()=>{if(ready&&me&&(pushQ()||[]).length)pushFlush()},120000);
