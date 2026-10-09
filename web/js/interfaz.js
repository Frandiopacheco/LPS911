"use strict";
/* LPS 911 · Navegación por rol: qué pestañas ve cada uno, en qué orden, el menú "Más" y el menú inferior del celular.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* Orden del ciclo Last Planner: planificar → liberar → comprometer → ejecutar → medir; lo de configuración al final */
const TAB_ORDER=['hoy','dash','look','mat','restr','plan','mapa','campo','cap','lib','ind','planos','cfg','team'];
/* nombres cortos (menú del celular); el nombre completo es el del botón de la pestaña */
const TAB_SHORT={hoy:'Hoy',dash:'Tablero',look:'Lookahead',mat:'Matriz',restr:'Restricciones',plan:'Plan semanal',mapa:'Plan diario',campo:'Campo',cap:'En obra',lib:'Liberaciones',ind:'Indicadores',planos:'Sectorización',cfg:'Configuración',team:'Equipo',
  tdia:'Tareos',tpub:'Publicación',tcos:'Costos',tper:'Personal',tpc:'Partidas',tcfg:'Configuración'};
const isCalArea=()=>!!me&&me.role==='area'&&/calidad/i.test(me.area||'');
/* Cada módulo tiene sus pestañas: Last Planner (TAB_ORDER) y Tareo (TAR_TABS, base.js). U.mod dice cuál se ve */
const tabOrder=()=>U.mod==='tar'?TAR_TABS:TAB_ORDER;

/** ¿Puede este usuario abrir la pestaña? (las reglas de seguridad siguen mandando sobre lo que puede guardar) */
function tabAllowed(t){if(!me)return false;
  if(TAR_TABS.includes(t)){if(U.mod!=='tar'||!canTar())return false;if(t==='tcfg')return me.role==='admin';
    /* F3: costos no entra a Tareos del día (su inicio es Costos); Publicación: admin y jefe de producción (tareo-pub.js) */
    if(t==='tdia')return me.role!=='tcos';if(t==='tpub')return tpPubOk();if(t==='tcos')return tpCosOk();return true}
  if(U.mod==='tar'||!canLps()||!TAB_ORDER.includes(t))return false;if(me.role==='capataz')return t==='cap';
  if(t==='hoy')return typeof renderHoy==='function';if(t==='dash')return canDash();if(t==='cap')return SCK();
  if(t==='team')return !SCK()&&me.role!=='lector'&&me.role!=='veedor';return true}

/** Pestañas principales de cada rol (van en la barra); el resto queda en "Más" */
function tabPrimary(){if(!me)return[];if(U.mod==='tar')return TAR_TABS.filter(tabAllowed);const r=me.role;
  const M={admin:['dash','look','mat','restr','plan','mapa','campo','lib','ind'],editor:['dash','look','mat','restr','plan','mapa','campo','lib','ind'],
    campo:['dash','campo','mapa','restr','plan','lib','ind'],sc:['look','cap','mapa','restr','lib','ind'],veedor:['campo','mapa','ind','restr','look'],lector:['dash','look','restr','plan','lib','ind'],
    area:isCalArea()?['lib','restr','look','mapa','ind']:['restr','look','plan','lib','ind'],capataz:['cap']};
  const set=new Set(['hoy',...(M[r]||M.lector)]);return TAB_ORDER.filter(t=>set.has(t)&&tabAllowed(t))}
function tabSecondary(){const p=new Set(tabPrimary());return tabOrder().filter(t=>!p.has(t)&&tabAllowed(t))}
function tabHome(){return tabPrimary()[0]||(U.mod==='tar'?'tdia':'look')}

/** Ordena la barra de pestañas y arma el botón "Más" (se llama en cada dibujo de la barra superior) */
function navApply(){const nav=$('#tabs');if(!nav||!me)return;const prim=tabPrimary(),sec=tabSecondary();
  const btn=t=>nav.querySelector(`button[data-tab="${t}"]`);
  const sig=prim.join()+'|'+sec.join();const re=nav.dataset.sig!==sig;nav.dataset.sig=sig;
  [...TAB_ORDER,...TAR_TABS].forEach(t=>{const b=btn(t);if(b){const h=!prim.includes(t);if(b.hidden!==h)b.hidden=h;if(re)nav.appendChild(b)}});
  let mb=$('#tabMore');if(!mb){mb=document.createElement('button');mb.id='tabMore';mb.type='button';mb.className='tmore';mb.setAttribute('aria-haspopup','menu');mb.onclick=()=>moreMenu(mb)}
  if(re||mb.parentNode!==nav)nav.appendChild(mb);mb.hidden=!sec.length;const inSec=sec.includes(U.tab);
  const mh=`${inSec?esc(TAB_SHORT[U.tab]||U.tab):'Más'} <span aria-hidden="true">▾</span>`;if(mb.innerHTML!==mh)mb.innerHTML=mh;mb.setAttribute('aria-selected',inSec);mb.classList.toggle('on',inSec)}
function moreMenu(anchor){const sec=tabSecondary();
  openPop(anchor,`<div class="ph">Más secciones</div>${sec.map(t=>`<button data-do="t_${t}"${U.tab===t?' class="on"':''}>${esc(tabName(t))}</button>`).join('')}`,
    Object.fromEntries(sec.map(t=>['t_'+t,()=>goTab(t)])))}

/* ---------- menú inferior del celular: 4 accesos según el rol + "Más" ---------- */
function bnavItems(){if(!me)return[];if(U.mod==='tar')return TAR_TABS.filter(tabAllowed).slice(0,4);const r=me.role;
  const L=r==='sc'?['cap','mapa','restr','lib']:r==='campo'?['campo','mapa','restr','ind']:r==='area'?(isCalArea()?['lib','restr','mapa','ind']:['restr','lib','ind','look'])
    :r==='lector'?['restr','lib','ind','look']:r==='veedor'?['campo','mapa','ind','restr']:['campo','mapa','restr','lib'];
  return ['hoy',...L].filter(tabAllowed).slice(0,4)}
function bnavMore(){const b=new Set(bnavItems());return tabOrder().filter(t=>!b.has(t)&&tabAllowed(t))}
Object.assign(BNI,{
  mat:SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.5h17M3.5 15h17M9 3.5v17M14.5 3.5v17"/>'),
  hoy:SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2.2 2.2 4.8-4.7"/>'),
  lib:SVG('<path d="M12 3l7 3v5.5c0 4.3-3 7.8-7 9.5-4-1.7-7-5.2-7-9.5V6z"/><path d="M8.8 12.2l2.3 2.3 4.4-4.5"/>'),
  look:SVG('<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v4M14 10v4M11 16v4"/>'),
  plan:SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  dash:SVG('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>'),
  /* Tareo */
  tdia:SVG('<rect x="5" y="3.5" width="14" height="17.5" rx="2"/><path d="M9 3.5h6v3H9zM8.5 11h7M8.5 14.5h7M8.5 18h4"/>'),
  tper:SVG('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.8.8 3 2.6 3 4.6"/>'),
  tpc:SVG('<path d="M4 6h16M4 12h16M4 18h16"/><path d="M8 4v4M8 10v4M8 16v4"/>'),
  tpub:SVG('<path d="M12 3.5v11"/><path d="M7.5 8L12 3.5 16.5 8"/><path d="M4.5 14.5v4a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4"/>'),
  tcos:SVG('<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M4 9h16M4 14.5h16M10 3.5v17"/>'),
  tcfg:SVG('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8"/>')});

/* ---------- un solo selector de fecha, arriba (P7) ----------
   Pestañas por semana (Lookahead, Restricciones, Plan semanal, Liberaciones, Indicadores semanal) muestran la semana;
   pestañas por día (Campo, Plan diario, En obra, Indicadores diario) muestran el día. El día elegido es el mismo en todas
   y al elegir un día la semana lo sigue; «Hoy» vuelve las dos a hoy. */
let DAY_SEL=null;
const curDay=()=>DAY_SEL||todayIso();
function daySet(d){DAY_SEL=d&&d!==todayIso()?d:null;U.week=DAY_SEL?weekOf(DAY_SEL):curWeek()}
/* Campo y En obra guardaban su día en CU.date: ahora es el día común */
Object.defineProperty(CU,'date',{get(){return DAY_SEL},set(v){daySet(v)},enumerable:false,configurable:true});
function dateMode(){if(!me||me.role==='capataz')return'none';const t=U.tab;
  if(t==='lib')return U.libV==='map'?'day':'week';if(['look','plan','restr'].includes(t))return'week';if(t==='ind')return U.indMode==='sem'?'week':'day';
  if(['campo','mapa','cap'].includes(t))return'day';return'none'}
const DOW_L=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
function topDateApply(){const m=dateMode();if(document.body.dataset.dmode!==m)document.body.dataset.dmode=m;document.body.classList.toggle('top-date',m!=='none');
  const show=m!=='none';['#wprev','#wnext','#wtoday'].forEach(s=>{const e=$(s);if(e)e.hidden=!show});const lb=$('.wk .lbl');if(lb)lb.hidden=!show;if(!show)return;
  const today=todayIso();
  if(m==='week'){$('#wprev').setAttribute('aria-label','Semana anterior');$('#wnext').setAttribute('aria-label','Semana siguiente');$('#wnext').disabled=false;$('#wtoday').disabled=U.week===curWeek();return}
  const d=curDay();stx('#wnum',`${DOW_L[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)}`);stx('#wdates',`Semana ${weekOf(d)}${d===today?' · hoy':''}`);
  $('#wprev').setAttribute('aria-label','Día anterior');$('#wnext').setAttribute('aria-label','Día siguiente');
  $('#wnext').disabled=U.tab==='ind'&&d>=today;$('#wtoday').disabled=d===today}
function navDate(v){const m=dateMode();if(m==='week'){U.week+=v;render();return}if(m!=='day')return;
  const d=shiftDay(curDay(),v);if(U.tab==='ind'&&d>todayIso())return;if(U.tab==='mapa')AUTO_OFF=true; /* elegido a mano: no volver al día automático */daySet(d);render()}
function goToday(){if(U.tab==='mapa')AUTO_OFF=true;DAY_SEL=null;U.week=curWeek();render()}
/* El plan diario se arma el día anterior: al entrar abre en el siguiente día hábil (si no se eligió otro día).
   Al salir del Plan diario, si se quedó en ese día automático, las demás pestañas vuelven a hoy. «Hoy» lo desactiva. */
let AUTO_D=null,AUTO_OFF=false,AUTO_W=null;
function dayAuto(){if(!me||me.role==='capataz')return;
  if(U.tab==='mapa'){if(!DAY_SEL&&!AUTO_OFF){const n=wshift(todayIso(),1);AUTO_W=U.week;DAY_SEL=n;U.week=weekOf(n);AUTO_D=n}}
  else{AUTO_OFF=false;if(AUTO_D&&DAY_SEL===AUTO_D){DAY_SEL=null;U.week=AUTO_W!=null?AUTO_W:curWeek()}AUTO_D=null;AUTO_W=null}} /* al salir vuelve a la semana que se veía antes */
$('#wprev').onclick=()=>navDate(-1);$('#wnext').onclick=()=>navDate(1);$('#wtoday').onclick=goToday;
{const lb=$('.wk .lbl');if(lb){lb.title='Volver a hoy';lb.style.cursor='pointer';lb.onclick=goToday}}

/* ---------- barra superior según la pestaña (P6) ---------- */
const UNDO_TABS=['look','plan','restr','cfg','planos'];
function topToolsApply(){const t=U.tab;
  /* Ver como / Vista celular arriba a la derecha (solo el administrador real en la copia de prueba) */
  {const ok=!!(me&&me.realAdmin&&typeof VA_OK==='function'&&VA_OK()&&!IN_FRAME);const a=$('#bvat'),b=$('#bpht');
    if(a){a.hidden=!ok||innerWidth<=760;if(ok&&!a.onclick)a.onclick=()=>vaDialog(a)}if(b){b.hidden=!ok||innerWidth<=760;if(ok&&!b.onclick)b.onclick=()=>phonePreview('iphone')}}if(t!=='look'&&$('#mvbar'))selBar();const ex=$('#bexport');if(ex){ex.hidden=t!=='look';ex.classList.remove('pri')}
  ['#bundo','#bredo'].forEach(s=>{const e=$(s);if(e)e.hidden=!UNDO_TABS.includes(t)})}

/* ---------- plantilla común de página (P5) ----------
   Dos tipos de pantalla: «herramienta» a todo el ancho (Lookahead, Plan diario) y «página» centrada con este encabezado:
   título · periodo/contexto · acciones a la derecha (la principal con .ib.pri). Debajo, la barra de filtros .fbar. */
function pageHead(title,sub,actions){return`<header class="phd"><div class="pht"><h2>${esc(title)}</h2>${sub?`<span>${sub}</span>`:''}</div>${actions?`<div class="pha">${actions}</div>`:''}</header>`}
const pisoLabel=()=>U.piso?esc(S.pis.get(U.piso)?.name||''):'Todos los pisos';
/* ayuda que se abre con «?» en lugar de párrafos fijos (P13) */
function helpBox(summary,html,open){return`<details class="hlp"${open?' open':''}><summary><i aria-hidden="true">?</i>${esc(summary)}</summary><div class="hlpb">${html}</div></details>`}

/* «Guardado» se marca un momento cuando termina de guardar (P16) */
{let prevP=0,tS=0;const orig=setStatus;setStatus=function(){orig();const el=$('#status');if(!el)return;
  if(prevP>0&&pending===0&&!lastErr&&db){el.classList.add('saved');clearTimeout(tS);tS=setTimeout(()=>el.classList.remove('saved'),1600)}prevP=pending}}

/* filtros que se pliegan en el celular (P10) */
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ftog]');if(!b)return;e.stopPropagation();U.fOpen=!U.fOpen;render()},true);
