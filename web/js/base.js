"use strict";
/* escribir solo si cambió: reescribir lo mismo en cada dibujo hace parpadear la barra en la tablet */
const stx=(el,v)=>{if(typeof el==='string')el=document.querySelector(el);if(el&&el.textContent!==v)el.textContent=v};
const shx=(el,h)=>{if(typeof el==='string')el=document.querySelector(el);if(el&&el._h!==h){el.innerHTML=h;el._h=h}};
/* LPS 911 · Utilidades, estado, escritura con deshacer, conexión, inicio de sesión, menús y dibujo principal.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ---------- utilidades ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MES=['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
const DL=['L','M','M','J','V','S'];
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
const iso=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return iso(d)};
let SKEW=(()=>{try{return +localStorage.getItem('lps.skew')||0}catch(e){return 0}})();const NOW=()=>Date.now()+SKEW;
/* fechas en hora de Lima (UTC−5, sin horario de verano), como el servidor: un equipo con otra zona horaria no cambia de día antes de tiempo */
const LIMA_OFF=5*3600e3;
const ldt=t=>iso(new Date(t-LIMA_OFF));
const todayIso=()=>ldt(NOW());
const fmtD=s=>{if(!s)return'';const d=pd(s);return String(d.getUTCDate()).padStart(2,'0')+' '+MES[d.getUTCMonth()]};
const fmtS=s=>{if(!s)return'';const d=pd(s);return String(d.getUTCDate()).padStart(2,'0')+'/'+String(d.getUTCMonth()+1).padStart(2,'0')};
const clone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const uid=p=>p+'-'+NOW().toString(36)+Math.random().toString(36).slice(2,6);
const byOrder=(a,b)=>(a.order??0)-(b.order??0)||String(a.id).localeCompare(String(b.id));
const pct=v=>v==null?'—':Math.round(v*100)+'%';
function lum(hex){const h=(hex||'#888').replace('#','');const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255;return .2126*r+.7152*g+.0722*b}
const store={get(k,d){try{const v=localStorage.getItem('lps911.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('lps911.'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- estado ---------- */
let FDB=null;/* todas las rutas de datos pasan por aquí (preparación multiempresa: luego será obras/<id>/<colección>) */
const fcol=n=>(db||FDB).collection(n);
const PLANO_SRC='plano.js?v=33';
const ARCH={pis:new Map(),sec:new Map(),amb:new Map(),act:new Map()};
const COLS={meta:'meta',pisos:'pis',contractors:'con',sectors:'sec',ambientes:'amb',acts:'act',weeks:'wk',restr:'res'};
const S={meta:new Map(),pis:new Map(),con:new Map(),sec:new Map(),amb:new Map(),act:new Map(),wk:new Map(),res:new Map(),tper:new Map(),tpc:new Map(),tcfg:new Map(),loaded:{}};
const U=Object.assign({mod:'lps',tab:'look',week:null,win:6,qmode:'dias',piso:'',sector:'',sc:'',q:'',onlyWin:false,onlyRestr:false,onlyObs:false,changes:false,meeting:false,collapsed:[],rfilter:'pend',day:'',wkF:0,indMode:'dia',pdfPh:false,pdfSkip:true,acts:[],rgrp:''},store.get('ui',{}));if(!Array.isArray(U.acts))U.acts=[];U.indDate=null;
U.q='';
const saveUI=()=>store.set('ui',{mod:U.mod==='tar'?'tar':'lps',pisoAll:!!U.pisoAll,lbMore:!!U.lbMore,legOff:!!U.legOff,tab:U.tab,win:U.win,qmode:U.qmode,piso:U.piso,sector:U.sector,sc:U.sc,pdHi:U.pdHi,onlyWin:U.onlyWin,showPast:!!U.showPast,showDone:!!U.showDone,onlyRestr:U.onlyRestr,onlyObs:U.onlyObs,changes:U.changes,meeting:U.meeting,collapsed:U.collapsed,rfilter:U.rfilter,indMode:U.indMode,pdfPh:U.pdfPh,pdfSkip:U.pdfSkip,acts:U.acts,rgrp:U.rgrp,libV:U.libV,teamOpen:U.teamOpen,mxAll:!!U.mxAll,mxZ:U.mxZ,mxOrd:U.mxOrd,mxF:U.mxF||'',mxV:U.mxV||'mat',mxSc:Array.isArray(U.mxSc)?U.mxSc:[]});
const pisos=()=>[...S.pis.values()].sort(byOrder);
const firstPiso=()=>(pisos()[0]||{}).id||'';
const pisoOfSecObj=s=>s&&s.pisoId&&(S.pis.has(s.pisoId)||ARCH.pis.has(s.pisoId))?s.pisoId:firstPiso();
const pisoOfAmb=id=>{const a=S.amb.get(id)||ARCH.amb.get(id);return a?pisoOfSecObj(S.sec.get(a.sectorId)||ARCH.sec.get(a.sectorId)):''};
const pisoOfAct=id=>{const x=S.act.get(id)||ARCH.act.get(id);return x?pisoOfAmb(x.ambId):''};
const visPisos=()=>pisos().filter(p=>!U.piso||p.id===U.piso);
/** pisos para los indicadores históricos: con «Todos los pisos» incluye los archivados (sus semanas evaluadas siguen contando) */
const histPisoSet=()=>new Set(U.piso?[U.piso]:[...S.pis.keys(),...ARCH.pis.keys()]);
const wkId=(n,p)=>n+'_'+p;
let db=null,auth=null,rtdb=null,presRef=null,conRef=null,presAll=null,me=null,isAdmin=false,canWrite=false,ready=false,myAct=null,peerEdits=[],unsubs=[],lastPres='';
const PRES=new Map(),MEM=new Map();
const memScs=m=>Array.isArray(m&&m.scs)&&m.scs.length?m.scs:(m&&m.sc?[m.sc]:[]);
const ROLE={admin:'Administrador',editor:'Editor',campo:'Campo',sc:'Subcontratista',capataz:'Capataz',area:'Área de apoyo',veedor:'Veedor',planner:'Planner',lector:'Lector',tcap:'Capataz (tareo)',tasis:'Asistente de tareo',tcos:'Costos'};
/* Módulo Tareo (docs/ia/tareo.md): roles que solo usan el Tareo (no cargan nada de Last Planner), quién ve el módulo y quién lo edita */
const TAR_ROLES=['tcap','tasis','tcos'];
const TAR_TABS=['tdia','tpub','tcos','tper','tpc','tcfg'];
const TAR_ONLY=()=>!!me&&TAR_ROLES.includes(me.role);
const canTar=()=>!!me&&(TAR_ONLY()||me.role==='admin'||(me.role==='editor'&&me.tpub===true));
const canLps=()=>!!me&&!TAR_ONLY();
const tarEdit=()=>!!me&&(me.role==='admin'||me.role==='tasis');
/** cambia de módulo (selector de la barra o «Más» del celular): lleva a la pestaña inicial del módulo */
function goMod(m){if(m==='tar'?!canTar():!canLps())return;closePop();const sh=$('#msheet');if(sh)sh.remove();
  if(U.mod===m&&(m==='tar')===TAR_TABS.includes(U.tab))return;U.mod=m;U.tab=m==='tar'?'tdia':'hoy';U.tab=tabAllowed(U.tab)?U.tab:tabHome();saveUI();sendPresence();render()}
let canDaily=false;
const OWNER=()=>String(window.ADMIN_EMAIL||'').trim().toLowerCase();
const isOwnerEmail=e=>!!OWNER()&&String(e||'').toLowerCase()===OWNER();
/* "Ver como": el administrador prueba la app con otro rol (solo en la copia de prueba; lo que guarde se guarda con su usuario) */
const VA_OK=()=>window.LPS_ENV==='pruebas';
let VA=(()=>{try{return VA_OK()?JSON.parse(sessionStorage.getItem('lps.va')||'null'):null}catch(e){return null}})();
const roleSig=m=>[m.role||'',m.sc||'',memScs(m).join(),m.area||'',m.cli===true?'c':'',m.tpub===true?'t':''].join('|');
function vaApply(md){if(!VA||!me||!(md.role==='admin'||isOwnerEmail(me.email)))return md;return{...md,role:VA.role,sc:VA.sc||'',scs:VA.sc?[VA.sc]:[],area:VA.area||'',cli:!!VA.cli,tpub:!!VA.tpub}}
function vaSet(v){try{if(v)sessionStorage.setItem('lps.va',JSON.stringify(v));else sessionStorage.removeItem('lps.va')}catch(e){}location.reload()}
const PALETTE=['#1f5f7a','#b5651d','#6a4c93','#2e7d4f','#c0392b','#00838f','#8d6e00','#ad1457'];
const hashStr=s=>{let h=5381;for(const c of String(s))h=((h*33)^c.charCodeAt(0))>>>0;return h.toString(36)};
const colorOf=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return PALETTE[h%PALETTE.length]};
const nameOf=e=>{const m=MEM.get(e);return(m&&m.name)||String(e||'').split('@')[0]||'Alguien'};
const safeColor=c=>c;
function sendPresence(force){if(!presRef||!me)return;const d={name:me.name||'',eh:hashStr(me.email),piso:U.piso||'',tab:U.tab,act:myAct||''};const k=JSON.stringify(d);if(!force&&k===lastPres)return;lastPres=k;presRef.set({...d,ts:firebase.database.ServerValue.TIMESTAMP}).catch(()=>{})}
function renderWho(){
  const list=[...PRES.entries()].filter(([,p])=>p&&typeof p==='object').map(([uid,p])=>({...p,uid,isMe:!!me&&uid===me.uid})).sort((a,b)=>(b.isMe?1:0)-(a.isMe?1:0));
  const el=$('#who');
  if(el)el.innerHTML=list.slice(0,6).map(p=>{const full=String(p.name||'Alguien');const nm=p.isMe?'Tú':full;const pc=S.pis.get(p.piso)?.code||'Todos';
    return `<span class="who-c" title="${esc(full)} · ${esc(S.pis.get(p.piso)?.name||'Todos los pisos')}" style="--pc:${colorOf(p.uid)}"><span>${esc(nm.split(' ')[0])}</span><b>${esc(pc)}</b></span>`}).join('')+(list.length>6?`<span class="who-c">+${list.length-6}</span>`:'');
  peerEdits=list.filter(p=>!p.isMe&&typeof p.act==='string'&&p.act).map(p=>({act:p.act,name:String(p.name||'Alguien'),color:colorOf(p.uid)}));
  markPeers();
}
function markPeers(){const g=$('#grid');if(!g)return;g.querySelectorAll('tr.peer').forEach(tr=>{tr.classList.remove('peer');tr.removeAttribute('title')});
  for(const e of peerEdits){const tr=g.querySelector(`tr[data-a="${CSS.escape(e.act)}"]`);if(tr){tr.classList.add('peer');tr.style.setProperty('--pc',e.color);tr.title=e.name+' está editando esta fila'}}}
function saveBlob(name,blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
/* Cuadro de causas de no cumplimiento (formato de la empresa): código, nombre, qué incluye y si por defecto es imputable al SC */
const CNC_STD=[
  {c:'PROG',n:'Programación',d:['Error en la programación.'],i:false},
  {c:'MAT',n:'Materiales',d:['Falta de materiales.'],i:true},
  {c:'QA/QC',n:'Control de calidad',d:['Demoras en la liberación de calidad.','Procesos no previstos de gestión de calidad.'],i:false},
  {c:'EXT',n:'Externo',d:['Factores externos a obra (meteorológico, social, sindical, etc.).'],i:false},
  {c:'CLI',n:'Cliente - Supervisión',d:['Falta de información por parte del cliente.','Modificación de proyecto.','Demoras en respuesta a consultas (RFI).'],i:false},
  {c:'EJEC',n:'Errores de ejecución',d:['Mala ejecución de trabajos.'],i:true},
  {c:'SC',n:'Subcontratas',d:['Incumplimiento de subcontratista de proyecto.'],i:true},
  {c:'EQ',n:'Equipos y herramientas',d:['Falta de equipos operativos.','Falta de herramientas en buen estado.'],i:true},
  {c:'ADM',n:'Administrativos',d:['Demoras en la gestión documentaria para ingreso de personal.','Paralización por gestión de permisos.','Demora en pagos a subcontratistas.'],i:false},
  {c:'DIS',n:'Diseño',d:['Omisiones en revisión de incompatibilidades de proyecto.','Demoras en envío/respuesta de RFI.'],i:false},
  {c:'OT',n:'Otros',d:['No contempladas en los ítems anteriores.'],i:true}];
const CNC_STD_V=1;
/* tipo de restricción según la causa (código del cuadro): el de la lista del proyecto que le corresponde, o vacío.
   Misma tabla que el servidor (functions/lib.js RT_RX). */
/* hora de la publicación automática del plan del día siguiente (Configuración › Proyecto; como el servidor: por defecto 21:00, máx. 23:30) */
function planCutHH(){const v=P().planCutHH;return typeof v==='string'&&/^\d\d:\d\d$/.test(v)&&v<='23:30'?v:'21:00'}
const RT_RX=[['PROG',/program/i],['MAT',/materi/i],['QA/QC',/calidad|qa|qc/i],['EXT',/extern|clim/i],['CLI',/client|supervis/i],['EQ',/equipo|herramient/i],['DIS',/dise[ñn]o|ingenier/i],['SC',/subcontrat|personal|mano de obra/i],['ADM',/administr|permis/i],['EJEC',/ejecuci/i],['OT',/otro/i]];
function restrTypeFor(code,types){const rx=(RT_RX.find(([c])=>c===code)||[])[1];if(!rx)return'';return(types||(typeof P==='function'?P().restrTypes:[])||[]).find(t=>typeof t==='string'&&rx.test(t))||''}
/* código de una causa: la del cuadro por nombre; las antiguas, por parecido */
const CNC_GUESS=[[/program|previa|interfer|frente|secuencia/i,'PROG'],[/material|insumo|log[ií]st/i,'MAT'],[/calidad|liberaci|qa|qc/i,'QA/QC'],[/clima|lluvia|extern|sindic|social|huelga/i,'EXT'],[/client|supervis|rfi|modificaci/i,'CLI'],[/ejecuci|retrabajo|rehacer/i,'EJEC'],[/subcontrat|mano de obra|personal|cuadrilla|\bsc\b/i,'SC'],[/equipo|herramient/i,'EQ'],[/admin|permis|pago|document/i,'ADM'],[/dise[nñ]o|plano|incompatib|ingenier/i,'DIS']];
function cncStd(c){if(!c)return null;const k=String(c).trim().toLowerCase();return CNC_STD.find(o=>o.n.toLowerCase()===k||o.c.toLowerCase()===k)||null}
function cncCode(c){if(!c)return'';const o=cncStd(c);if(o)return o.c;const g=CNC_GUESS.find(([re])=>re.test(c));return g?g[1]:'OT'}
/** etiqueta para listas: «PROG · Programación» */
const cncLabel=c=>{const o=cncStd(c);return o?o.c+' · '+o.n:c};
const cncTip=c=>{const o=cncStd(c);return o?o.d.join(' '):''};
const P_DEF={refWeek:58,refDate:'2026-09-28',cnc:CNC_STD.map(o=>o.n),restrTypes:[],templates:[],propCutDow:6,propCutHH:'13:00',planCutHH:'21:00'};let P_SRC=null,P_VAL=P_DEF;
/* siempre con los datos mínimos (un proyecto nuevo puede tener meta/project a medias) */
const P=()=>{const s=S.meta.get('project');if(s!==P_SRC){P_SRC=s;P_VAL=s?{...P_DEF,...s}:P_DEF;if(!P_VAL.refDate||!P_VAL.refWeek)P_VAL={...P_VAL,refDate:P_VAL.refDate||P_DEF.refDate,refWeek:P_VAL.refWeek||P_DEF.refWeek}}return P_VAL};
/* imputabilidad de la causa al subcontratista: editable en Configuración; por defecto según el nombre */
const IMP_NO=/previa|dise[nñ]o|informaci|clima|lluvia|client|supervis|programaci|permis|interferencia/i;
function cncImp(c){const m=P().cncImp||{};if(c&&m[c]!=null)return!!m[c];if(!c)return true;const o=cncStd(c);if(o)return o.i;return!IMP_NO.test(c)}
function impOf(rc){if(!rc||!rc.status||rc.status==='ok')return null;return rc.imp!=null?!!rc.imp:cncImp(rc.cnc)}
const pscOf=o=>{const den=o.ver-(o.nimp||0);return den>0?o.ok/den:null};
const weekStart=n=>addD(P().refDate,(n-P().refWeek)*7);
const weekOf=s=>P().refWeek+Math.floor((pd(s)-pd(P().refDate))/864e5/7);
const weekDays=n=>{const a=weekStart(n);return[0,1,2,3,4,5].map(i=>addD(a,i))};
const curWeek=()=>weekOf(addD(todayIso(),1));
const winDays=()=>{const o=[];for(let w=U.week;w<U.week+U.win;w++)weekDays(w).forEach((d,i)=>o.push({d,w,i}));return o};
const conOf=id=>S.con.get(id)||{name:'—',color:'#9AA0A6'};
const r2=v=>Math.round((+v||0)*100)/100;
const hasM=x=>typeof x.metrado==='number'&&x.metrado>0;
const progSum=x=>r2(Object.values(x.qty||{}).reduce((s,v)=>s+(+v||0),0));
const fq=v=>{v=r2(v);if(Math.abs(v)>=10000)return(Math.round(v/100)/10)+'k';if(Math.abs(v)>=1000)return String(Math.round(v));return String(v)};
/* reprogramación de lo no cumplido: última falla antes de 'upTo' que aún no tiene un día posterior */
function failInfo(x,upTo,back=10){const rt=recOf(upTo,x.id);if(rt&&rt.status==='ok'&&rt.late)return null;let f=null;for(let d=addD(upTo,-1);d>=addD(upTo,-back);d=addD(d,-1)){const r=recOf(d,x.id);if(!r)continue;if(r.status==='ok')return null;f={d,r};break}
  if(!f||(x.days||[]).some(d=>d>f.d)||x.noRep===f.d)return null;const dn=DONE.get(x.id);if(dn&&dn>=f.d)return null;return f}
function repSaldo(x,fd){if(!hasM(x))return null;const r=recOf(fd,x.id);const prog=r&&r.prog!=null?r.prog:(x.qty||{})[fd];if(prog==null)return null;const rem=r2(prog-(+(r&&r.exec)||0));return rem>0?rem:prog}
function reprogAct(aid,d,fd){const x=S.act.get(aid);if(!x||!canWrite)return;let nx={...x,days:[...new Set([...(x.days||[]),d])].sort()};
  /* el saldo pasa al día nuevo y el día fallido queda con lo ejecutado (0 si no se hizo nada): el metrado no se duplica.
     El compromiso original sigue en el registro diario (prog) y en la semana congelada */
  const sal=repSaldo(x,fd);if(sal!=null){const r=recOf(fd,aid);const ex=r&&r.exec!=null?+r.exec||0:0;const q={...(nx.qty||{})};if(fd&&q[fd]!=null)q[fd]=r2(Math.min(ex,+q[fd]));q[d]=r2((+q[d]||0)+sal);nx={...nx,qty:q}}
  /* si estaba marcada terminada antes del día nuevo, se reabre: si no, el día reprogramado saldría «liberado» (rayado) y no contaría */
  const dn=DONE.get(aid);const reo=!!(dn&&d>dn&&canDaily);if(reo)reopenDone(aid,true);
  apply([op('acts',aid,nx)],`Reprogramada para el ${DOWN[(pd(d).getUTCDay()+6)%7].toLowerCase()} ${fmtD(d)}${sal!=null?` (${fq(sal)} ${x.und||''})`:''}${reo?` · estaba terminada el ${fmtD(dn)}: se reabrió`:''}`)}
function markExec(aid,ed,fd){const x=S.act.get(aid);if(!x||!canDaily)return;const cur=recOf(ed,aid);const late=!(x.days||[]).includes(ed);
  writeDaily(ed,pisoOfAct(aid),{recs:{[aid]:{...baseRec(ed,x,cur),status:'ok',late:late||!!(cur&&cur.late),cnc:'',imp:null,note:(cur&&cur.note)||(late?`Ejecutada sin estar programada${fd?' (no cumplida el '+fmtD(fd)+')':''}`:'')}}});
  toast(`“${x.name}” registrada como ejecutada el ${fmtD(ed)}`)}
function execPop(btn,aid,fd){const t0=todayIso();openPop(btn,`<div class="ph">¿Qué día se ejecutó?</div><div class="qrow"><input type="date" id="exdt" min="${fd}" max="${t0}" value="${t0}"></div><button data-do="ok" class="pri">Marcar como ejecutada</button><button data-do="no">Cancelar</button>`,
  {no:()=>{},ok:()=>{const v=($('#exdt')||{}).value;if(!v){toast('Elige la fecha.');return}if(v<=fd||v>t0){toast('La fecha debe ser posterior al día no cumplido y no futura.');return}markExec(aid,v,fd)}})}
function dismissRep(aid,fd){const x=S.act.get(aid);if(x&&canWrite)apply([op('acts',aid,{...x,noRep:fd})],'Quitada de “sin reprogramar”')}
function withQty(x,d,v){const q={...(x.qty||{})};const days=new Set(x.days||[]);if(v!=null&&v>0){q[d]=r2(v);days.add(d)}else{delete q[d];days.delete(d)}return{...x,qty:q,days:[...days].sort()}}
function actStats(a){const ds=(a.days||[]).slice().sort();return{n:ds.length,ini:ds[0]||'',fin:ds[ds.length-1]||''}}
const GRP_AREA=/dise[nñ]o|plano|informaci|rfi|permis|contrat|compra|log[ií]st|adquisi|calidad|ssoma|cliente|supervis|aprobaci|ingenier|\bot\b|presupuest|administr/i;
const restrAreasL=()=>{const a=P().restrAreas;return a&&a.length?a:['OT','Ingeniería','Logística','Calidad','SSOMA','Cliente / Supervisión','Administración']};
const typeGrp=t=>{const m=P().restrGrp||{};return t in m?m[t]:(GRP_AREA.test(t||'')?'area':'campo')};
const grpOf=r=>r.grp||typeGrp(r.type);
const GRPN={campo:'Operativa de campo',area:'Otras áreas'};
/* restricciones pendientes por actividad: índice que se rehace solo cuando cambian los datos (DV) */
let RPK=-1,RPM=new Map();
const restrPend=aid=>{if(RPK!==DV){RPK=DV;RPM=new Map();for(const r of S.res.values())if(r.actId&&r.status!=='lib'){const L=RPM.get(r.actId);if(L)L.push(r);else RPM.set(r.actId,[r])}}return RPM.get(aid)||[]};
const rTxt=r=>`${GRPN[grpOf(r)]}${grpOf(r)==='area'&&r.area?' · '+r.area:''} — ${r.type||'Restricción'}${r.desc?': '+r.desc:''}${r.resp?' (resp. '+r.resp+')':''}`;
const doneOf=x=>DONE.get(x.id)||null;
const libDay=(x,d)=>{const dn=DONE.get(x.id);return!!(dn&&d>dn&&(x.days||[]).includes(d))};
const schedOn=(x,d)=>(x.days||[]).includes(d)&&!libDay(x,d);
/* «Terminada» pide confirmar (oct 2026): un error aquí libera los días que faltan; en la Matriz queda por validar */
const DONE_TXT='Revisa que no falte nada en el ambiente (por ejemplo, una luminaria). Se liberan los días que le quedan en el lookahead; en la Matriz queda por validar hasta que un ingeniero lo confirme.';
async function askDone(aid,d){const x=S.act.get(aid);if(!x||!canDaily)return false;const a=S.amb.get(x.ambId);
  const ok=await uiAsk({title:`¿«${x.name}» está terminada en todo el ambiente${a?' '+a.code:''}?`,text:DONE_TXT,ok:'Sí, terminada',tone:'ok'});if(ok)markDone(aid,d);return!!ok}
function markDone(aid,d,keepR){const x=S.act.get(aid);if(!x||!canDaily)return;const cur=DAY.get(dayId(d,pisoOfAct(aid)))?.recs?.[aid]||null;
  const left=(x.days||[]).filter(y=>y>d).length;
  /* las marcas de «terminada» anteriores a la reapertura siguen sin contar: solo se baja la reapertura si la nueva fecha es anterior */
  if(!keepR&&REOP.has(aid)&&d<=REOP.get(aid)){const nr=addD(d,-1);REOP.set(aid,nr);didxWrite(pisoOfAct(aid),{[aid]:nr},'r')}
  writeDaily(d,pisoOfAct(aid),{recs:{[aid]:{...baseRec(d,x,cur&&cur.status?cur:null),status:(cur&&cur.status)||'ok',done:true,note:(cur&&cur.note)||''}}});
  toast(`“${x.name}” terminada el ${fmtD(d)}${left?` · se liberan ${left} día${left>1?'s':''} programado${left>1?'s':''}`:''}`)}
/** fechas en que alguna fuente (índice, registro diario o cierre del capataz) la marca terminada */
function doneDates(aid){const o=[];const a=DIDX.get(aid);if(a)o.push(a);for(const doc of DAY.values()){const r=doc.recs&&doc.recs[aid];if(r&&r.done)o.push(doc.date)}
  for(const lv of LIVE.values())if(lv.actId===aid&&lv.close&&lv.close.done&&liveOwn(lv)&&!recClr(lv.date,aid))o.push(lv.date);return o}
/** Reabre una actividad marcada terminada: sus días siguientes vuelven a contar. Lo puede hacer quien registra el avance
 *  (administrador, editor o campo) y queda registrado como reapertura, para que ni el cierre del capataz la vuelva a terminar. */
function reopenDone(aid,quiet){const x=S.act.get(aid);if(!x||!canDaily)return;const dn=DONE.get(aid);
  const ds=doneDates(aid);const upto=ds.length?ds.reduce((m,d)=>d>m?d:m):dn;const pid=pisoOfAct(aid);const prevR=REOP.get(aid)||null;
  if(upto){REOP.set(aid,upto);didxWrite(pid,{[aid]:upto},'r')}
  if(DIDX.has(aid)){DIDX.delete(aid);didxWrite(pid,{[aid]:null})}
  for(const doc of DAY.values()){const r=doc.recs&&doc.recs[aid];if(r&&r.done)writeDaily(doc.date,doc.pisoId,{recs:{[aid]:{...r,done:false}}})}
  doneRebuild();requestRender();
  if(!quiet)toast(`“${x.name}” reabierta: puedes seguir programándola`,dn?'Deshacer':'',dn?()=>{/* deshacer: vuelve la reapertura que había antes (o ninguna) */if(prevR){REOP.set(aid,prevR);didxWrite(pid,{[aid]:prevR},'r')}else{REOP.delete(aid);didxWrite(pid,{[aid]:null},'r')}markDone(aid,dn,true)}:null)}
function pendRestr(){const m=new Map();for(const r of S.res.values())if(r.status!=='lib'&&r.actId){m.set(r.actId,(m.get(r.actId)||0)+1)}return m}

/* ---------- escritura con cola por documento ---------- */
let pending=0,lastErr=null;const chains={};
function setStatus(){const el=$('#status');el.classList.toggle('busy',pending>0);el.classList.toggle('err',!!lastErr||!db);
  const off=navigator.onLine===false;el.classList.toggle('err',!!lastErr||!db||off);
  el.lastElementChild.textContent=!db?'Sin conexión':off?(pending?'Sin internet · '+pending+' cambio(s) por subir':'Sin internet'):lastErr?lastErr:pending>0?'Guardando…':(typeof PM==='function'&&PM()?'Modo propuesta · guardado':canWrite||canDaily||(me&&['capataz','sc','area','veedor','tcap','tasis'].includes(me.role))?'Guardado':'Solo lectura')}
addEventListener('online',()=>{lastErr=null;setStatus()});addEventListener('offline',()=>setStatus());
function strip(o){const c={...o};delete c.id;return c}
/* los días de una actividad se guardan con arrayUnion/arrayRemove (fsDiff): al leerlos se dejan ordenados y sin repetir */
function actNorm(o){const ds=o&&o.days;if(Array.isArray(ds))for(let i=1;i<ds.length;i++)if(!(ds[i-1]<ds[i])){o.days=[...new Set(ds)].sort();break}return o}
async function dbCall(fn){try{return await fn()}catch(e){if(e&&e.code==='unavailable'){await new Promise(r=>setTimeout(r,400+Math.random()*700));return await fn()}throw e}}
let DV=0; /* sube con cada cambio de datos (para cachés) */
/* escrituras propias en cola que aún no salen (esperan la anterior del mismo documento): mientras tanto, lo que llega
   de la base para ese documento es una versión vieja y no debe pisar la local (hacía parpadear las barras al mover) */
const QK={};
function keepQueued(col,mp){const k=COLS[col];if(!k)return;const pre=col+'/';for(const key in QK){if(!key.startsWith(pre))continue;const id=key.slice(pre.length);const cur=S[k].get(id)||(ARCH[k]&&ARCH[k].get(id));if(cur)mp.set(id,cur);else mp.delete(id)}}
function put(col,id,data){DV++;const scR=col==='restr'&&typeof SCK==='function'&&(SCK()||AREA());
  if(!scR&&typeof propPut==='function'&&propPut(col,id,data))return Promise.resolve();
  const k=COLS[col];const prev=getDoc(col,id);const AR=ARCH[k];if(data){if(data.arch&&AR){S[k].delete(id);AR.set(id,{...clone(data),id})}else{if(AR)AR.delete(id);S[k].set(id,{...clone(data),id})}}else{S[k].delete(id);if(AR)AR.delete(id)}
  if(!db||(!canWrite&&!scR))return Promise.resolve();
  const body=data?strip(clone(data)):null;const args=body&&prev?fsDiff(strip(prev),body,col):null;
  if(args&&!args.length)return Promise.resolve();
  pending++;setStatus();const key=col+'/'+id;const ref=fcol(col).doc(id);QK[key]=(QK[key]||0)+1;
  const run=()=>{QK[key]--;if(QK[key]<=0)delete QK[key];return run0()};
  /* mover días (args.then): quitar y agregar se encolan en el mismo instante, así sin señal quedan los dos en la cola local */
  const run0=()=>!body?ref.delete():args?Promise.all([ref.update(...args),args.then?ref.update(...args.then):null]).catch(e=>{if(e&&e.code==='not-found')return ref.set(body);throw e}):ref.set(body);
  const p=(chains[key]||Promise.resolve()).then(()=>dbCall(run))
    .then(()=>{lastErr=null},e=>{handleWriteErr(e)}).finally(()=>{pending--;setStatus()});
  chains[key]=p;return p;
}
function fsArgs(partial){const a=[];for(const[k,v]of Object.entries(partial)){if(v&&typeof v==='object'&&!Array.isArray(v))for(const[k2,v2]of Object.entries(v))a.push(new firebase.firestore.FieldPath(k,k2),v2);else a.push(k,v)}return a}
function patch(col,id,partial,localApply){
  if(localApply)localApply();
  if(!db||!canWrite)return;
  pending++;setStatus();const key=col+'/'+id;
  chains[key]=(chains[key]||Promise.resolve()).then(()=>dbCall(()=>fcol(col).doc(id).update(...fsArgs(partial))))
    .then(()=>{lastErr=null},e=>handleWriteErr(e)).finally(()=>{pending--;setStatus()});
}
function handleWriteErr(e){const c=e&&e.code;
  if(c==='permission-denied'&&typeof AREA==='function'&&AREA()){lastErr='Sin permiso';toast('No se pudo guardar: solo puedes registrar y resolver las restricciones de '+(me.area||'tu área')+'.')}
  else if(c==='permission-denied'&&typeof SCK==='function'&&SCK()&&U.tab==='restr'){lastErr='Sin permiso';toast('No se pudo guardar la restricción: solo puedes crear o cambiar las tuyas, de actividades de tu partida y sin liberar.')}
  else if(c==='permission-denied'){canWrite=false;lastErr='Sin permiso de edición';toast('Tu rol no permite editar. Pide al administrador el rol de Editor.');gridRows=null;render()}
  else if(c==='resource-exhausted'){lastErr='Cuota diaria agotada';toast('Se alcanzó el límite diario del plan gratuito de Firebase. Los cambios se guardarán cuando se renueve la cuota.')}
  else{lastErr='Error al guardar';toast('No se pudo guardar un cambio ('+(c||'error')+'). Revisa tu conexión y vuelve a intentarlo.')}
  setStatus();
}

/* ---------- deshacer / rehacer ---------- */
const undoS=[],redoS=[];
const op=(col,id,after)=>({col,id,before:clone(getDoc(col,id)),after:after?clone(after):null});
/* after: se llama cuando el cambio se aplica de verdad (al momento, o después si el administrador confirma un día cerrado) */
function apply(ops,label,after){ops=ops.filter(Boolean);if(!ops.length)return;if(typeof lockGuard==='function'&&!lockGuard(ops,()=>apply(ops,label,after)))return false;ops.forEach(o=>put(o.col,o.id,o.after));ops.label=label||'';if(typeof lhLog==='function')ops.lid=lhLog(ops,label);undoS.push(ops);if(undoS.length>150)undoS.shift();redoS.length=0;updUndo();requestRender();if(label)toast(label,'Deshacer',undo);if(typeof mxApplyWarn==='function')mxApplyWarn(ops);if(after)after()}
function canon(o){if(o==null)return'null';if(Array.isArray(o))return'['+o.map(canon).join(',')+']';if(typeof o==='object')return'{'+Object.keys(o).filter(k=>k!=='id').sort().map(k=>JSON.stringify(k)+':'+canon(o[k])).join(',')+'}';return JSON.stringify(o)}
function replay(g,from,to,done){let skipped=0;for(const o of g){const cur=getDoc(o.col,o.id);if(canon(cur)!==canon(o[from])){skipped++;continue}put(o.col,o.id,o[to]);if(done)done.push({col:o.col,id:o.id,before:o[from],after:o[to]})}return skipped}
/* deshacer y rehacer también quedan en el historial (solo lo que de verdad se revirtió), con referencia al cambio original */
function replayLog(g,dn,undoing){if(!dn.length||typeof lhLog!=='function')return;lhLog(dn,(undoing?'Deshacer':'Rehacer')+(g.label?': '+g.label:''),{[undoing?'undo':'redo']:g.lid||''})}
function undo(){if(!canWrite){toast('No puedes deshacer aquí: la edición está bloqueada.');return}const g=undoS.pop();if(!g)return;
  /* deshacer tampoco cambia un día ya cerrado (publicado) sin aviso: pasa por el mismo control que cualquier cambio */
  if(typeof lockGuard==='function'&&!lockGuard(g.map(o=>({col:o.col,id:o.id,before:o.after,after:o.before})),()=>undo())){undoS.push(g);return}const dn=[];const sk=replay(g.slice().reverse(),'after','before',dn);replayLog(g,dn,true);redoS.push(g);updUndo();requestRender();
  toast(sk?`Deshecho en parte: ${sk} cambio(s) no se revirtieron porque otra persona los modificó después`:'Cambio deshecho','Rehacer',redo);
  /* una propuesta aceptada vuelve a pendientes al deshacer (propuestas.js) */
  if(g.prop&&!sk&&typeof propUndoHook==='function')propUndoHook(g,true)}
function redo(){if(!canWrite)return;const g=redoS.pop();if(!g)return;if(typeof lockGuard==='function'&&!lockGuard(g,()=>redo())){redoS.push(g);return}const dn=[];const sk=replay(g,'before','after',dn);replayLog(g,dn,false);undoS.push(g);updUndo();requestRender();if(sk)toast(`${sk} cambio(s) no se rehicieron porque otra persona los modificó`);if(g.prop&&!sk&&typeof propUndoHook==='function')propUndoHook(g,false)}
function updUndo(){$('#bundo').disabled=!undoS.length||!canWrite;$('#bredo').disabled=!redoS.length||!canWrite}

/* ---------- toast & popover ---------- */
let tT;
/* Ventana de confirmación propia (reemplaza confirm/prompt del navegador). Devuelve una promesa:
   true/false, o el texto escrito si lleva `input` (null si cancela).
   uiAsk({title, text, html, list:[...], note, ok:'Aceptar', cancel:'Cancelar', tone:'info'|'warn'|'danger'|'ok', input:{label, value, placeholder, required}}) */
let UASK=null;
function uiAsk(o){o=typeof o==='string'?{text:o}:o||{};
  /* pruebas automáticas (window.__uiAskNative, lo pone el Firebase falso): se usa el diálogo del navegador para que Playwright lo conteste */
  if(window.__uiAskNative&&!window.__uiAskReal){const msg=[o.title,o.text,o.html&&o.html.replace(/<[^>]+>/g,''),(o.list||[]).filter(Boolean).map(x=>'· '+x).join('\n'),o.note,o.input&&o.input.label].filter(Boolean).join('\n\n');
    if(o.input){const v=prompt(msg,o.input.value||'');return Promise.resolve(v==null?null:v.trim())}return Promise.resolve(confirm(msg))}
  if(UASK)UASK.done(o.input?null:false);
  return new Promise(res=>{const el=document.createElement('div');el.className='uask';el.id='uask';
    const tone=o.tone||'info';const ico={info:'i',warn:'!',danger:'!',ok:'✓'}[tone]||'i';
    const inp=o.input?`<label class="uain"><span>${esc(o.input.label||'')}</span><textarea rows="3" placeholder="${esc(o.input.placeholder||'')}">${esc(o.input.value||'')}</textarea></label>`:'';
    el.innerHTML=`<div class="uac t-${tone}" role="alertdialog" aria-modal="true" aria-labelledby="uat"><div class="uah"><i aria-hidden="true">${ico}</i><b id="uat">${esc(o.title||'¿Confirmas?')}</b></div>
      ${o.text?`<div class="uat">${esc(o.text).replace(/\n/g,'<br>')}</div>`:''}${o.html?`<div class="uat">${o.html}</div>`:''}
      ${o.list&&o.list.length?`<ul class="ual">${o.list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${o.note?`<div class="uan">${esc(o.note)}</div>`:''}${inp}
      <div class="uab">${o.cancel===false?'':`<button class="ib" data-ua="no">${esc(o.cancel||'Cancelar')}</button>`}<button class="ib pri${tone==='danger'?' bad':''}" data-ua="si">${esc(o.ok||'Aceptar')}</button></div></div>`;
    document.body.appendChild(el);const ta=el.querySelector('textarea');const okB=el.querySelector('[data-ua="si"]');
    const val=()=>ta?ta.value.trim():true;const can=()=>!(o.input&&o.input.required&&!val());
    const sync=()=>{okB.disabled=!can()};sync();if(ta)ta.oninput=sync;
    const done=v=>{if(!UASK||UASK.el!==el)return;UASK=null;document.removeEventListener('keydown',key,true);el.remove();res(v)};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(o.input?null:false)}else if(e.key==='Enter'&&!e.shiftKey&&can()){e.preventDefault();e.stopPropagation();done(val())}};
    document.addEventListener('keydown',key,true);
    el.onclick=e=>{const b=e.target.closest('[data-ua]');if(b){if(b.dataset.ua==='si'){if(can())done(val())}else done(o.input?null:false)}else if(e.target===el)done(o.input?null:false)};
    UASK={el,done};setTimeout(()=>(ta||okB).focus(),30)})}
function toast(msg,btn,fn){const t=$('#toast');t.innerHTML='<span>'+esc(msg)+'</span>'+(btn?'<button type="button">'+esc(btn)+'</button>':'');t.hidden=false;if(btn)t.querySelector('button').onclick=()=>{t.hidden=true;fn()};clearTimeout(tT);tT=setTimeout(()=>t.hidden=true,btn?6500:3200)}
const pop=$('#pop');let popFor=null;
function popPlace(){const anchor=popFor;if(!anchor||pop.hidden)return;const r=anchor.getBoundingClientRect();const w=pop.offsetWidth,h=pop.offsetHeight;
  let x=Math.min(r.left,innerWidth-w-8),y=r.bottom+4;if(y+h>innerHeight-8)y=Math.max(8,r.top-h-4);pop.style.left=Math.max(8,x)+'px';pop.style.top=y+'px'}
/* la ventanita sigue a su botón al desplazar; si el botón sale de la vista (o se redibujó), se cierra */
addEventListener('scroll',e=>{if(pop.hidden||!popFor||(e.target&&e.target.nodeType===1&&pop.contains(e.target)))return;const a=popFor;
  if(!a.isConnected){closePop();return}const r=a.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||(!r.width&&!r.height)){closePop();return}popPlace()},true);
function openPop(anchor,html,handlers){pop.innerHTML=html;pop.hidden=false;popFor=anchor;popPlace();
  pop.onclick=e=>{const b=e.target.closest('button[data-do]');if(!b)return;closePop();handlers[b.dataset.do]&&handlers[b.dataset.do](b.dataset)};
  const f=pop.querySelector('button');f&&f.focus();}
function closePop(){pop.hidden=true;popFor=null}
document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&e.target!==popFor)closePop()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){closePop()}});

/* ---------- render scheduling ---------- */
let rq=false,deferred=false;
function isDirtyFocus(){const a=document.activeElement;return a&&a.classList&&a.classList.contains('ci')&&a.dataset.o!==undefined&&a.value!==a.dataset.o}
/* Mientras alguien elige en una lista desplegable o arrastra sobre un plano, los cambios que llegan de otros usuarios
   esperan: redibujar en ese momento cerraba la lista o borraba el rectángulo que se está dibujando. */
let SEL_T=0,PDOWN=false,dTimer=0,DRAGGING=false;/* DRAGGING: arrastre nativo en curso (Liberaciones › Bandeja) */
const uiBusy=()=>{const a=document.activeElement;return PDOWN||DRAGGING||(!!a&&a.tagName==='SELECT'&&performance.now()-SEL_T<20000)};
document.addEventListener('pointerdown',e=>{const t=e.target;if(!t||!t.closest)return;if(t.closest('select'))SEL_T=performance.now();if(t.closest('.pv'))PDOWN=true},true);
document.addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='SELECT')SEL_T=performance.now()},true);
{const rel=()=>{if(PDOWN){PDOWN=false;setTimeout(flushDeferred,0)}};document.addEventListener('pointerup',rel,true);document.addEventListener('pointercancel',rel,true)}
{const done=e=>{if(e.target&&e.target.tagName==='SELECT'){SEL_T=0;setTimeout(flushDeferred,0)}};document.addEventListener('change',done,true);document.addEventListener('focusout',done,true)}
function requestRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;if(paint||isDirtyFocus()||uiBusy()){deferred=true;if(!dTimer)dTimer=setTimeout(()=>{dTimer=0;flushDeferred()},700);return}render()})}
function flushDeferred(){if(deferred){deferred=false;requestRender()}}

/* ---------- conexión ---------- */
function fatal(msg){const l=$('#loading');if(l)l.innerHTML='<b>'+esc(msg)+'</b>';setStatus()}
if(window.LPS_ENV==='pruebas'){document.body.classList.add('env-pruebas');document.title='[PRUEBAS] '+document.title}
async function capJoin(fdb,u){const ref=fcol('members').doc('u_'+u.uid);let m=null;try{m=await ref.get()}catch(e){}
  if(m&&m.exists){clearInv();return true}
  if(!invCode){me=null;pendingMsg='Tu acceso como capataz ya no está activo en este celular. Pide un enlace nuevo al ingeniero.';await auth.signOut();return false}
  let iv=null;try{iv=await fcol('inv').doc(invCode).get()}catch(e){}const d=iv&&iv.exists?iv.data():null;
  const tcap=!!d&&d.role==='tcap';/* invitación del tareo (consorcio): capataz sin partida (docs/ia/tareo.md) */
  if(!d||!d.active||!(d.exp>NOW())||(!tcap&&!(d.scs||[]).length)){clearInv();me=null;pendingMsg='Este enlace ya venció o fue desactivado. Pide uno nuevo al ingeniero.';try{await u.delete()}catch(e){await auth.signOut()}return false}
  let name='';try{name=joinName||localStorage.getItem('lps.jname')||''}catch(e){name=joinName}name=(name||'Capataz').slice(0,60);
  try{await ref.set(tcap?{role:'tcap',name,inv:invCode,added:NOW()}:{role:'capataz',name,scs:d.scs,sc:d.scs[0],inv:invCode,added:NOW()})}catch(err){me=null;pendingMsg='No se pudo registrar ('+(err.code||err.message)+'). Avisa al administrador: puede que falten las reglas nuevas de Firestore.';await auth.signOut();return false}
  clearInv();setTimeout(()=>toast('¡Listo, '+name.split(' ')[0]+(tcap?'! Ya puedes llenar el tareo de tu cuadrilla.':'! Ya puedes reportar el avance de tu partida.')),1500);return true}
const memOffMsg=d=>d&&d.movTo?'Tu usuario de este celular se pasó a una cuenta con DNI y contraseña: entra con tu DNI y la contraseña que te dio la oficina.':'Tu cuenta está desactivada. Habla con la oficina.';
async function startSession(u,fdb){
  stopSession();
  const anon=!!u.isAnonymous;
  if(anon){me={uid:u.uid,email:'u_'+u.uid,anon:true};if(!(await capJoin(fdb,u)))return}
  else if(invCode){clearInv();setTimeout(()=>toast('Ese enlace es para registrar capataces: ábrelo en el celular del capataz (aquí ya tienes tu sesión).'),2500)}
  if(!anon&&!u.emailVerified){showLogin(`Confirma tu correo: te enviamos un enlace a ${u.email}. Ábrelo y luego pulsa “Ya confirmé mi correo”. Revisa también la carpeta de spam.`,true);return}
  if(!anon)me={uid:u.uid,email:String(u.email||'').toLowerCase()};
  const ref=fcol('members').doc(me.email);let m=null;
  try{m=await ref.get({source:'server'})}catch(e){try{m=await ref.get()}catch(e2){m=null}}
  if((!m||!m.exists)&&isOwnerEmail(me.email)){try{await ref.set({role:'admin',name:me.email.split('@')[0],added:NOW()});m=await ref.get()}catch(e){}}
  if(!m||!m.exists){const em=me.email;me=null;pendingMsg=tCtaEs(em)?`Tu usuario ${em.split('@')[0]} ya no tiene acceso. Habla con la oficina.`:`El correo ${em} todavía no está autorizado. Pide al administrador que te agregue en la pestaña Equipo y vuelve a ingresar.`;await auth.signOut();return}
  /* cuenta desactivada (members.off) o enlace de capataz pasado a una cuenta con DNI (movTo): docs/ia/tareo.md */
  if(m.data().off===true&&!isOwnerEmail(me.email)){const d=m.data();me=null;pendingMsg=memOffMsg(d);if(d.movTo)lcapSet(true);await auth.signOut();return}
  me.rsig=roleSig(m.data());me.realAdmin=m.data().role==='admin'||isOwnerEmail(me.email);const md=vaApply(m.data());me.role=(md.role==='planner'?'lector':md.role)||'lector';/* planner: rol del plan maestro (retirado, oct 2026): ve como lector */me.sc=md.sc||'';me.scs=memScs(md);me.area=md.area||'';me.cli=md.cli===true;me.tpub=md.tpub===true;if(me.role!=='capataz')U.tab='hoy';{const ht=location.hash.slice(1);if(['hoy','dash','look','mat','restr','plan','mapa','campo','cap','lib','ind','planos','cfg','team'].includes(ht)){U.tab=ht;U.mod='lps'}else if(TAR_TABS.includes(ht)){U.tab=ht;U.mod='tar'}}
  /* módulo: el de solo tareo siempre en Tareo; el resto vuelve al último que usó si puede verlo (render() lleva a la pestaña inicial) */
  if(TAR_ONLY())U.mod='tar';else if(U.mod!=='tar'||!canTar())U.mod='lps';isAdmin=me.role==='admin';canWrite=isAdmin||me.role==='editor';canDaily=canWrite||me.role==='campo';if(location.hash==='#plano')U.tab='mapa';if(me.role==='capataz')U.tab='cap';document.body.classList.toggle('cap-mode',me.role==='capataz');
  db=fdb;hideLogin();$('#blogout').hidden=false;$('#tabTeam').hidden=false;
  $('#meBox').textContent=(md.name||me.email)+' · '+(ROLE[me.role]||me.role);
  /* los roles de solo tareo no cargan nada de Last Planner (en el celular pesa y las reglas no se lo permiten) */
  if(!TAR_ONLY()){for(const[col,k]of Object.entries(COLS)){
    unsubs.push(fcol(col).onSnapshot(snap=>{const mp=new Map();snap.docs.forEach(d=>mp.set(d.id,col==='acts'?actNorm({...d.data(),id:d.id}):{...d.data(),id:d.id}));keepQueued(col,mp);setColData(k,mp);S.loaded[k]=true;onData()},err=>snapErr(err)));
  }
  ensureDaily(addD(todayIso(),me.role==='capataz'?-7:-14));ensureDoneIdx();if(me.role!=='capataz')ensureLib();}
  if(canTar()&&typeof TCOLS!=='undefined')for(const[col,k]of Object.entries(TCOLS)){
    unsubs.push(fcol(col).onSnapshot(snap=>{const mp=new Map();snap.docs.forEach(d=>mp.set(d.id,{...d.data(),id:d.id}));setColData(k,mp);S.loaded[k]=true;onData()},err=>snapErr(err)));
  }
  /* el asistente de tareo necesita la lista del equipo (asignar obreros a capataces) */
  const memQ=canDaily||me.role==='tasis'?fcol('members'):fcol('members').doc(me.email);
  unsubs.push(memQ.onSnapshot(snap=>{MEM.clear();(snap.docs||(snap.exists?[snap]:[])).forEach(d=>MEM.set(d.id,d.data()));
    const mine=me&&MEM.get(me.email);
    if(mine){if(mine.name&&mine.name!==me.name){me.name=mine.name;lastPres='';sendPresence(true)}
    if(roleSig(mine)!==me.rsig){const tk=TAR_ONLY()+'|'+canTar()+'|'+(me.role==='tasis');me.rsig=roleSig(mine);me.realAdmin=mine.role==='admin'||isOwnerEmail(me.email);const v=vaApply(mine);me.area=v.area||'';me.cli=v.cli===true;me.tpub=v.tpub===true;me.role=v.role;
    /* si cambia lo que hay que cargar (solo tareo, ve el Tareo, lista del equipo), se vuelve a abrir con las suscripciones correctas */
    if(tk!==TAR_ONLY()+'|'+canTar()+'|'+(me.role==='tasis')){toast('Tu rol cambió a '+(ROLE[me.role]||me.role)+'. Recargando…');setTimeout(()=>location.reload(),1200);return}me.sc=v.sc||'';me.scs=memScs(v);isAdmin=me.role==='admin';canWrite=isAdmin||me.role==='editor';canDaily=canWrite||me.role==='campo';$('#meBox').textContent=(mine.name||me.email)+' · '+(ROLE[me.role]||me.role);if(typeof cliStop==='function'&&!canCli())cliStop();gridRows=null;if(!VA)toast('Tu rol cambió a '+(ROLE[me.role]||me.role)+'.')}}
    else if(me&&!isOwnerEmail(me.email)){pendingMsg='Tu acceso fue retirado por el administrador.';auth.signOut();return}
    if(mine&&mine.off===true&&me&&!isOwnerEmail(me.email)){pendingMsg=memOffMsg(mine);if(mine.movTo)lcapSet(true);auth.signOut();return}
    renderWho();if(typeof respSync==='function')respSync();if(ready)requestRender()},()=>{}));
  me.name=md.name||(me.anon?'Capataz':me.email.split('@')[0]);
  if(rtdb&&!TAR_ONLY()){presRef=rtdb.ref('presence/'+me.uid);conRef=rtdb.ref('.info/connected');
    conRef.on('value',s=>{if(s.val()===true&&presRef)presRef.onDisconnect().remove().then(()=>sendPresence(true)).catch(()=>{})});
    presAll=rtdb.ref('presence');presAll.on('value',s=>{PRES.clear();const v=s.val()||{};for(const[k,d]of Object.entries(v))PRES.set(k,d);renderWho();if(U.tab==='team'&&ready&&!isDirtyFocus())requestRender()},()=>{});}
  setStatus();updUndo();
}
const DAY=new Map(),FOTO=new Map(),DONE=new Map(),LIVE=new Map();let liveSub=null,liveFrom=null,liveErr=null;
let DONEV=0; /* sube cada vez que se recalcula DONE (para cachés) */
function doneRebuild(){DONEV++;DONE.clear();const R=typeof REOP!=='undefined'?REOP:new Map();const add=(id,d)=>{const z=R.get(id);if(z&&d<=z)return;const c=DONE.get(id);if(!c||d<c)DONE.set(id,d)};
  for(const[a,dt]of DIDX)add(a,dt);for(const doc of DAY.values())for(const[id,r]of Object.entries(doc.recs||{}))if(r&&r.done)add(id,doc.date);
  for(const lv of LIVE.values()){const c=lv.close;if(!c||!c.done||c.status!=='ok'||!liveOwn(lv)||recReal(lv.date,lv.actId)||recClr(lv.date,lv.actId))continue;add(lv.actId,lv.date)}}
/** el ingeniero quitó el registro de ese día («Quitar registro»): el cierre del capataz o del SC ya no cuenta, tampoco como terminada */
function recClr(d,aid){const doc=DAY.get(dayId(d,pisoOfAct(aid)));const r=doc&&doc.recs&&doc.recs[aid];return!!(r&&r.clr)}
/** el reporte en vivo es de la partida (y el piso) de su actividad: si no, no cuenta (lo pudo escribir otra partida) */
function liveOwn(lv){const x=lv&&(S.act.get(lv.actId)||ARCH.act.get(lv.actId));if(!x||(x.sc||'')!==(lv.sc||''))return false;const p=pisoOfAmb(x.ambId);return!lv.pisoId||!p||p===lv.pisoId}let daySub=null,dayFrom=null,dayErr=null;
function ensureLive(from){if(!db)return;const lim=addD(todayIso(),me&&me.role==='capataz'?-2:-7);const f=from<lim?lim:from;if(liveFrom&&f>=liveFrom)return;if(liveSub)liveSub();liveFrom=f;
  liveSub=fcol('live').where('date','>=',f).onSnapshot({includeMetadataChanges:true},sn=>{LIVE.clear();sn.docs.forEach(d=>LIVE.set(d.id,{...d.data(),id:d.id,_pend:!!(d.metadata&&d.metadata.hasPendingWrites)}));doneRebuild();liveErr=null;if(ready)requestRender()},err=>{liveErr=err&&err.code||'error';if(ready)requestRender()});
  if(!unsubs.includes(stopLive))unsubs.push(stopLive)}
function stopLive(){if(liveSub)liveSub();liveSub=null;liveFrom=null;LIVE.clear()}
let dayP=Promise.resolve();
function ensureDaily(from){ensureLive(from);ensureDplan(from);if(typeof ensureNP==='function')ensureNP(from);if(!db||(dayFrom&&from>=dayFrom))return dayP;if(daySub)daySub();dayFrom=from;let ok;dayP=new Promise(r=>ok=r);setTimeout(()=>ok(),8000);
  daySub=fcol('daily').where('date','>=',from).onSnapshot(sn=>{DAY.clear();sn.docs.forEach(d=>DAY.set(d.id,{...d.data(),id:d.id}));doneRebuild();dayErr=null;ok();if(ready)requestRender()},err=>{dayErr=err&&err.code;ok();if(ready&&U.tab==='campo')requestRender()});
  if(!unsubs.includes(stopDaily))unsubs.push(stopDaily)}
function stopDaily(){if(daySub)daySub();daySub=null;dayFrom=null;dayP=Promise.resolve();DAY.clear();FOTO.clear()}
const dayId=(d,pid)=>d+'_'+pid;
/* ---------- Plan del día cerrado (dplan/<fecha>_<piso>) ----------
   El plan de un día se cierra al publicarlo en la reunión del día anterior (o solo a la hora de cierre, por defecto 21:00, si nadie lo publicó: tarea
   cerrarPlan del servidor). La foto {ids:{actId:cantidad|null}} es el compromiso del día: contra ella se mide el PPC diario.
   Hoy y los días pasados siempre están cerrados. Un día cerrado no se reprograma (lookahead ni plan diario), salvo lo que ya
   tiene registro de campo (cerrar el día: saldo, terminada). El administrador puede reabrirlo con un motivo (reo; queda en log). */
const DPL=new Map();let dplSub=null,dplFrom=null;
function ensureDplan(from){if(!db||(dplFrom&&from>=dplFrom))return;if(dplSub)dplSub();dplFrom=from;
  dplSub=fcol('dplan').where('date','>=',from).onSnapshot(sn=>{DPL.clear();sn.docs.forEach(d=>DPL.set(d.id,{...d.data(),id:d.id}));DV++;if(ready)requestRender()},()=>{});
  if(!unsubs.includes(stopDplan))unsubs.push(stopDplan)}
function stopDplan(){if(dplSub)dplSub();dplSub=null;dplFrom=null;DPL.clear()}
const dplanOf=(d,pid)=>DPL.get(d+'_'+pid)||null;
/* lookahead y propuestas: hoy y los días futuros cerrados (los pasados se pueden corregir: el PPC se mide contra las fotos) */
function dayLocked(d,pid){if(!d||!pid)return false;ensureDplan(addD(todayIso(),-7));const o=dplanOf(d,pid);if(o&&o.reo)return false;const t=todayIso();if(d<t)return false;if(d===t)return true;return!!(o&&o.ids)}
/* plan diario: además, los días pasados no se replanifican */
function planLocked(d,pid){if(!d||!pid)return false;const o=dplanOf(d,pid);if(o&&o.reo)return false;return d<todayIso()||dayLocked(d,pid)}
/* primer día desde `from` que no está cerrado en ese piso (mover en bloque no toca lo cerrado) */
function firstOpen(from,pid){let f=from;for(let i=0;i<40&&dayLocked(f,pid);i++)f=addD(f,1);return f}
/** razón legible de por qué un día está cerrado */
function lockWhy(d,pid){const o=dplanOf(d,pid);if(d<todayIso())return'ya pasó';if(d===todayIso())return'es hoy: solo se registra el cumplimiento';return o&&o.auto?`se publicó solo a las ${planCutHH()}`:'ya se publicó'}
/* lo que toca un cambio del lookahead en días cerrados (días o cantidades), sin contar los días que ya tienen registro de campo */
function lockHits(ops){const H=[];for(const o of ops){if(!o||o.col!=='acts')continue;const b=o.before||{},a=o.after||{};const pid=pisoOfAmb(a.ambId||b.ambId);if(!pid)continue;
    const bd=new Set(b.days||[]),ad=new Set(a.days||[]);const T=new Set();ad.forEach(d=>{if(!bd.has(d))T.add(d)});bd.forEach(d=>{if(!ad.has(d))T.add(d)});
    const bq=b.qty||{},aq=a.qty||{};new Set([...Object.keys(bq),...Object.keys(aq)]).forEach(d=>{if(canon(bq[d]??null)!==canon(aq[d]??null))T.add(d)});
    for(const d of T)if(dayLocked(d,pid)&&!recReal(d,o.id))H.push({d,pid,id:o.id})}return H}
/* se llama desde apply: false = no se aplica. El administrador puede seguir (queda registrado en el día). */
let LKOK=false;
function lockGuard(ops,retry){if(!me)return true;/* en modo propuesta el SC solo arma su propuesta: el cierre se revisa al aceptarla */if(typeof PM==='function'&&PM())return true;const H=lockHits(ops);if(!H.length)return true;const ds=[...new Set(H.map(h=>h.d))].sort();const lab=ds.map(d=>fmtD(d)).join(', ');
  if(isAdmin){if(!LKOK){uiAsk({title:`El plan del ${lab} ya está cerrado`,text:`${lockWhy(ds[0],H[0].pid)}.`,note:'Como administrador puedes cambiarlo igual: quedará registrado en el día. El PPC del día se sigue midiendo contra lo que se publicó.',ok:'Cambiarlo igual',tone:'warn'}).then(ok=>{if(ok&&retry){LKOK=true;try{retry()}finally{LKOK=false}}});return false}
    for(const k of new Set(H.map(h=>h.d+'_'+h.pid))){const[d,pid]=[k.slice(0,10),k.slice(11)];dplanLog(d,pid,{t:NOW(),by:me.email,n:me.name||me.email,what:'cambio en el lookahead'})}return true}
  toast(`El plan del ${lab} ya está cerrado (${lockWhy(ds[0],H[0].pid)}): no se reprograma. ${ds[0]>todayIso()?'Para corregirlo, deshaz la publicación en el Plan diario.':'Registra el cumplimiento en Campo y reprograma desde mañana.'}`);return false}
function dplanLog(d,pid,e){if(!db)return;const ref=fcol('dplan').doc(d+'_'+pid);ref.set({date:d,pisoId:pid,log:firebase.firestore.FieldValue.arrayUnion(e)},{merge:true}).catch(()=>{})}
/** foto de lo programado un día en un piso (lo que el plan diario deja comprometido): {actId: cantidad del día | null} */
/** terminada antes de ese día (no por un cierre de ese mismo día): ya no se le pide nada ese día */
function doneBefore(aid,d){const t=typeof DONE!=='undefined'&&DONE.get(aid);return!!t&&t<d}
/** estaba en el plan publicado (foto) de ese día, aunque después haya salido del lookahead: se puede registrar y cuenta en el PPC */
function inSnap(x,d){if(!x)return false;const sn=dplanOf(d,pisoOfAct(x.id));return!!(sn&&sn.ids&&x.id in sn.ids)&&!doneBefore(x.id,d)}
const schedOrSnap=(x,d)=>schedOn(x,d)||inSnap(x,d);
/** SC y ambiente de cada compromiso de la foto (hallazgo 6): el historial no se reasigna si después cambian */
function dplanWho(ids,acts){const o={};const M=acts||S.act;for(const id of Object.keys(ids||{})){const x=M.get(id);if(x)o[id]={sc:x.sc||'',amb:x.ambId||''}}return o}
function dplanIds(d,pid,acts){const o={};for(const x of(acts||S.act).values()){if(!(x.days||[]).includes(d)||libDay(x,d)||pisoOfAmb(x.ambId)!==pid)continue;const q=(x.qty||{})[d];o[x.id]=q!=null?+q:null}return o}
function recReal(d,aid){const doc=DAY.get(dayId(d,pisoOfAct(aid)));const r=doc&&doc.recs&&doc.recs[aid];return r&&r.status?r:null}
/* registro del día: el del ingeniero; si no hay, el cierre propuesto por el capataz (cuenta mientras nadie lo corrija) */
function recOf(d,aid){const r=recReal(d,aid);if(r)return r;
  /* «Quitar registro» deja una marca: el cierre del capataz ya no vuelve a contar */
  {const doc=DAY.get(dayId(d,pisoOfAct(aid)));const rr=doc&&doc.recs&&doc.recs[aid];if(rr&&rr.clr)return null}
  const lv=LIVE.get(d+'_'+aid);const c=lv&&lv.close;if(!c||!c.status||!liveOwn(lv))return null;
  return{status:c.status,cnc:c.cnc||'',note:c.note||'',exec:null,prog:null,und:'',imp:null,photos:lv.photos||[],done:!!c.done,late:false,by:c.by||'',byName:c.n||'',ts:c.t||0,_prop:true,prop:{status:c.status,cnc:c.cnc||'',by:c.by||'',byName:c.n||'',ts:c.t||0}}}
const ST={ok:{t:'Cumplido',i:'✓',c:'ok'},partial:{t:'Parcial',i:'½',c:'pa'},no:{t:'No cumplido',i:'✗',c:'no'}};
/* solo se envían los campos que cambian de cada registro: si otro ingeniero cambió otro campo (foto, nota, estado),
   una copia local atrasada no lo pisa */
function dailyPatch(cur,recs){const out={};for(const[aid,r]of Object.entries(recs||{})){const c=(cur.recs||{})[aid];if(!r||!c||typeof r!=='object'){out[aid]=r;continue}
  const p={};for(const[k,v]of Object.entries(r))if(canon(v)!==canon(c[k]))p[k]=v;
  /* fotos que solo se agregan: arrayUnion (otro usuario pudo agregar la suya al mismo tiempo) */
  const FVd=typeof firebase!=='undefined'&&firebase.firestore&&firebase.firestore.FieldValue;
  if(p.photos&&Array.isArray(p.photos)&&Array.isArray(c.photos)&&FVd&&FVd.arrayUnion&&c.photos.every(f=>p.photos.includes(f))){const add=p.photos.filter(f=>!c.photos.includes(f));if(add.length)p.photos=FVd.arrayUnion(...add);else delete p.photos}
  if(Object.keys(p).length)out[aid]=p}return out}
/* el avance de un día que aún no llega no se registra (se puede consultar; lo que no irá se maneja en el Plan diario) */
function futRec(d,obj){if(d<=todayIso())return false;return Object.values(obj.recs||{}).some(r=>r&&typeof r==='object'&&(r.status||r.exec!=null||r.done))}
function writeDaily(d,pid,obj){if(futRec(d,obj)){toast('No se puede registrar avance de un día que aún no llega.');return false}const id=dayId(d,pid);const cur=DAY.get(id)||{date:d,pisoId:pid,recs:{},extra:{}};
  /* cumplido sin cantidad ejecutada = lo programado (si no, el PPC semanal lo sugería como no cumplido); un registro nuevo borra la marca de «quitado» */
  for(const[aid,r]of Object.entries(obj.recs||{})){if(!r||typeof r!=='object')continue;if(r.status==='ok'&&r.exec==null&&r.prog!=null)r.exec=r.prog;if(r.status&&(cur.recs||{})[aid]&&cur.recs[aid].clr)r.clr=false}const sendRecs=obj.recs?dailyPatch(cur,obj.recs):null;
  DAY.set(id,{...cur,recs:{...(cur.recs||{}),...(obj.recs||{})},extra:{...(cur.extra||{}),...(obj.extra||{})}});
  if(db&&canDaily&&obj.recs)didxFromDaily(d,pid,obj.recs);doneRebuild();requestRender();
  if(!db||!canDaily)return;pending++;setStatus();const key='daily/'+id;
  chains[key]=(chains[key]||Promise.resolve()).then(()=>dbCall(()=>fcol('daily').doc(id).set({date:d,pisoId:pid,...obj,...(sendRecs?{recs:sendRecs}:{})},{merge:true})))
    .then(()=>{lastErr=null},e=>{if(e&&e.code==='permission-denied'){canDaily=false;lastErr='Sin permiso';toast('Tu rol no permite registrar avance. Pide el rol Campo o Editor.')}else handleWriteErr(e)}).finally(()=>{pending--;setStatus()})}
function stopSession(){unsubs.forEach(f=>{try{f()}catch(e){}});unsubs=[];try{if(presRef)presRef.remove();if(conRef)conRef.off();if(presAll)presAll.off()}catch(e){}presRef=conRef=presAll=null;ready=false;db=null;me=me&&me.uid?me:null;
  for(const k of Object.values(COLS))S[k]=new Map();if(typeof TCOLS!=='undefined')for(const k of Object.values(TCOLS))S[k]=new Map();for(const m of Object.values(ARCH))m.clear();S.loaded={};PRES.clear();MEM.clear();lastPres='';gridRows=null;undoS.length=0;redoS.length=0;
  const m=$('#main');m.dataset.view='';m.innerHTML='<div class="loading" id="loading"><b>Conectando…</b></div>';$('#who').innerHTML='';$('#meBox').textContent='';$('#blogout').hidden=true;$('#tabTeam').hidden=true;me=null;setStatus()}
function snapErr(err){const pd=err&&err.code==='permission-denied';lastErr=pd?'Sin acceso':'Conexión perdida';setStatus();toast(pd?'Tu cuenta no tiene acceso a estos datos. Pide acceso al administrador.':'Se perdió la conexión con la base de datos. Recarga la página.')}
function onData(){
  if(!ready&&TAR_ONLY()){/* solo tareo: listo cuando cargan sus colecciones (nada de Last Planner) */
    if(typeof TCOLS==='undefined'||!Object.values(TCOLS).every(k=>S.loaded[k]))return;ready=true;clockSync();swWarm()}
  if(!ready){if(!Object.values(COLS).every(k=>S.loaded[k]))return;ready=true;clockSync();brandSync();if(U.week==null)U.week=curWeek();pickPiso();ensureVers();setTimeout(autoVersion,2500);setTimeout(didxMigrate,4000);bkRemind();swWarm();}
  if(typeof respSync==='function')respSync();requestRender();
}
/* ---------- login ---------- */
let lmode='in',pendingMsg='';
let invCode=(()=>{try{const sp=new URLSearchParams(location.search),q=sp.get('inv');if(q){localStorage.setItem('lps.inv',q);localStorage.setItem('lps.invm',sp.get('m')||'');history.replaceState(null,'',location.pathname+location.hash)}return localStorage.getItem('lps.inv')||''}catch(e){return''}})();
/* el enlace de un capataz del tareo lleva &m=tar: antes de entrar no se puede leer la invitación, así que el texto sale del enlace */
const invTar=()=>{try{return!!invCode&&localStorage.getItem('lps.invm')==='tar'}catch(e){return false}};
let joinName='';
function clearInv(){invCode='';try{localStorage.removeItem('lps.inv');localStorage.removeItem('lps.invm')}catch(e){}}
/* «Soy capataz» (cuenta DNI + contraseña del tareo, docs/ia/tareo.md): se recuerda en el equipo para volver a esa pantalla */
const lcapOn=()=>{try{return localStorage.getItem('lps.lcap')==='1'}catch(e){return false}};
function lcapSet(v){try{if(v)localStorage.setItem('lps.lcap','1');else localStorage.removeItem('lps.lcap')}catch(e){}}
function showLogin(msg,verify){$('#login').hidden=false;const jn=!!invCode&&!verify;const cp=!jn&&!verify&&lcapOn();$('#lform').hidden=jn||cp;$('#ljoin').hidden=!jn;$('#lcap').hidden=!cp;
  if(cp){$('#cmsg').textContent=msg||'';$('#csubmit').disabled=false;return}if(jn){$('#jmsg').textContent=msg||'';$('#jsubmit').disabled=false;const t=invTar(),h=$('#ljoin .lhint'),b=$('#ljoin .lbrand');
    if(h){h.dataset.def=h.dataset.def||h.textContent;h.textContent=t?'Te invitaron a llenar el tareo diario de tu cuadrilla desde este celular. Solo escribe tu nombre.':h.dataset.def}if(b){b.dataset.def=b.dataset.def||b.textContent;b.textContent=t?'Tareo de personal obrero':b.dataset.def}return}$('#lmsg').textContent=msg||'';$('#lverify').hidden=!verify;$('#lresend').hidden=!verify;setLMode(lmode)}
function hideLogin(){$('#login').hidden=true}
function setLMode(m){lmode=m;$('#ltitle').textContent=m==='up'?'Crear mi cuenta':'Ingresar';$('#lsubmit').textContent=m==='up'?'Crear cuenta':'Ingresar';$('#lmode').textContent=m==='up'?'Ya tengo cuenta: ingresar':'¿Primera vez? Crear mi cuenta';$('#lpass').autocomplete=m==='up'?'new-password':'current-password';$('#lhint').hidden=m!=='up'}
function authMsg(e){const c=e&&e.code||'';return({'auth/invalid-email':'El correo no es válido.','auth/missing-email':'Escribe tu correo.','auth/missing-password':'Escribe tu contraseña.','auth/user-not-found':'No existe una cuenta con ese correo. Usa “¿Primera vez? Crear mi cuenta”.','auth/wrong-password':'Contraseña incorrecta.','auth/invalid-credential':'Correo o contraseña incorrectos.','auth/invalid-login-credentials':'Correo o contraseña incorrectos.','auth/email-already-in-use':'Ese correo ya tiene cuenta. Usa “Ingresar”.','auth/weak-password':'La contraseña debe tener al menos 6 caracteres.','auth/too-many-requests':'Demasiados intentos. Espera unos minutos y vuelve a intentar.','auth/network-request-failed':'Sin conexión a internet.','auth/operation-not-allowed':'El ingreso con correo no está activado en Firebase (paso 3 de la guía).','auth/unauthorized-domain':'Este dominio no está autorizado en Firebase (paso 7 de la guía).'})[c]||('No se pudo completar ('+(c||'error')+').')}
function setupLogin(){
  $('#jcancel').onclick=()=>{clearInv();lcapSet(false);showLogin('')};
  $('#jcap').onclick=()=>{clearInv();lcapSet(true);showLogin('')};
  $('#lcapgo').onclick=()=>{lcapSet(true);showLogin('');setTimeout(()=>$('#cdni').focus(),30)};
  $('#cback').onclick=()=>{lcapSet(false);showLogin('')};
  $('#lcap').onsubmit=async ev=>{ev.preventDefault();const d=tCtaDni($('#cdni').value),p=$('#cpass').value;
    if(!d){$('#cmsg').textContent='Escribe tu DNI (8 dígitos).';return}if(!p){$('#cmsg').textContent='Escribe tu contraseña.';return}
    $('#csubmit').disabled=true;$('#cmsg').textContent='Entrando…';
    try{await auth.signInWithEmailAndPassword(tCtaMail(d),p);lcapSet(true)}
    catch(err){const c=err&&err.code||'';$('#cmsg').textContent=['auth/invalid-credential','auth/invalid-login-credentials','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(c)?'DNI o contraseña incorrectos. Pide a la oficina que te la cambie.':c==='auth/user-disabled'?'Tu cuenta está desactivada. Habla con la oficina.':authMsg(err)}
    finally{$('#csubmit').disabled=false}};
  $('#ljoin').onsubmit=async ev=>{ev.preventDefault();const n=$('#jname').value.trim();if(n.length<3){$('#jmsg').textContent='Escribe tu nombre y apellido.';return}
    joinName=n;try{localStorage.setItem('lps.jname',n)}catch(e){}$('#jsubmit').disabled=true;$('#jmsg').textContent='Entrando…';
    try{await auth.signInAnonymously()}catch(err){$('#jsubmit').disabled=false;$('#jmsg').textContent=err&&err.code==='auth/operation-not-allowed'?'El administrador debe activar el ingreso “Anónimo” en Firebase (Authentication → Sign-in method).':authMsg(err)}};
  $('#lmode').onclick=()=>{setLMode(lmode==='up'?'in':'up');$('#lmsg').textContent='';$('#lverify').hidden=true;$('#lresend').hidden=true};
  $('#lforgot').onclick=async()=>{const e=$('#lemail').value.trim();if(!e){$('#lmsg').textContent='Escribe tu correo arriba y vuelve a pulsar “Olvidé mi contraseña”.';return}
    try{await auth.sendPasswordResetEmail(e);$('#lmsg').textContent='Si el correo tiene cuenta, te llegará un enlace para crear una nueva contraseña. Revisa también el spam.'}catch(err){$('#lmsg').textContent=authMsg(err)}};
  $('#lverify').onclick=async()=>{const u=auth.currentUser;if(!u){$('#lmsg').textContent='Ingresa con tu correo y contraseña.';return}
    try{await u.reload();if(auth.currentUser.emailVerified){await auth.currentUser.getIdToken(true);startSession(auth.currentUser,firebase.firestore())}else $('#lmsg').textContent='Tu correo aún no figura como confirmado. Abre el enlace del correo que te enviamos y vuelve a pulsar.'}catch(err){$('#lmsg').textContent=authMsg(err)}};
  $('#lresend').onclick=async()=>{const u=auth.currentUser;if(!u)return;try{await u.sendEmailVerification();$('#lmsg').textContent='Correo de confirmación reenviado a '+u.email+'.'}catch(err){$('#lmsg').textContent=authMsg(err)}};
  $('#lform').onsubmit=async ev=>{ev.preventDefault();const e=$('#lemail').value.trim().toLowerCase(),p=$('#lpass').value;if(!e||!p){$('#lmsg').textContent='Escribe tu correo y tu contraseña.';return}
    $('#lsubmit').disabled=true;$('#lmsg').textContent='';
    try{if(lmode==='up'){const cr=await auth.createUserWithEmailAndPassword(e,p);try{await cr.user.sendEmailVerification()}catch(x){}lmode='in'}else await auth.signInWithEmailAndPassword(e,p)}
    catch(err){$('#lmsg').textContent=authMsg(err)}finally{$('#lsubmit').disabled=false}};
  $('#blogout').onclick=async()=>{try{if(presRef)await presRef.remove()}catch(e){}auth.signOut()};
}

/* ---------- celular: menú inferior ---------- */
const MOBQ=matchMedia('(max-width:760px)');const isMob=()=>MOBQ.matches;
MOBQ.addEventListener('change',()=>{const m=$('#main');if(m){m.dataset.view='';m.dataset.built=''}const sh=$('#msheet');if(sh)sh.remove();if(ready)render()});
/* tablet vertical (≤ 900 px): las listas anchas (Restricciones) se muestran como tarjetas */
const TABQ=matchMedia('(max-width:900px)');const isNarrow=()=>TABQ.matches;TABQ.addEventListener('change',()=>{if(ready&&U.tab==='restr')render()});
const SVG=d=>`<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const BNI={campo:SVG('<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>'),mapa:SVG('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  ind:SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),cap:SVG('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z"/>'),restr:SVG('<path d="M4 21V4h11l-1 4h6v9h-9l1-4H4"/>'),more:SVG('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>')};
const tabName=t=>{const b=$(`#tabs [data-tab="${t}"]`);return b?b.firstChild.textContent.trim():t};
function goTab(t){U.tab=t;saveUI();sendPresence();render()}
function renderBnav(){const b=$('#bnav');if(!b)return;const pr=U.mod==='tar'?0:restrInScope().filter(rOpenC).length;const BNT=bnavItems().map(t=>[t,TAB_SHORT[t]]);const more=!BNT.some(x=>x[0]===U.tab);
  const h=BNT.map(([t,l])=>`<button data-bt="${t}" class="${U.tab===t?'on':''}" aria-label="${esc(tabName(t))}">${BNI[t]||BNI.more}<span>${l}${t==='restr'&&pr?` <b class="bc">${pr}</b>`:''}</span></button>`).join('')+`<button data-bt="more" class="${more?'on':''}">${BNI.more}<span>${more?esc(TAB_SHORT[U.tab]||tabName(U.tab)):'Más'}</span></button>`;
  if(b.dataset.h!==h){b.innerHTML=h;b.dataset.h=h}}
function moreSheet(){const ex=$('#msheet');if(ex){ex.remove();return}
  const items=bnavMore();
  const sh=document.createElement('div');sh.className='msheet';sh.id='msheet';
  sh.innerHTML=`<div class="msc" role="dialog" aria-label="Más secciones"><div class="msh">Más secciones</div>${items.map(t=>`<button data-bt="${t}" class="${U.tab===t?'on':''}">${esc(tabName(t))}</button>`).join('')}
    ${canLps()&&canTar()?`<div class="msmod"><span>Módulo</span>${modSegHtml()}</div>`:''}
    ${U.mod==='tar'?'<hr>':`<p class="note" style="margin:2px 10px 4px">El lookahead y el plan semanal se editan mejor desde una PC.</p><hr>
    <button data-act="xls">Exportar Excel del lookahead</button><button data-act="help">? Ayuda: cómo funciona</button>`}<div class="msme">${esc($('#meBox').textContent||'')}</div><button data-act="out">Salir</button></div>`;
  sh.onclick=e=>{if(e.target===sh){sh.remove();return}const b=e.target.closest('button');if(!b)return;if(b.dataset.mod){goMod(b.dataset.mod);return}sh.remove();if(b.dataset.bt)goTab(b.dataset.bt);else if(b.dataset.act==='xls'){if(ready)exportXlsx()}else if(b.dataset.act==='help')ayOpen();else if(b.dataset.act==='out')$('#blogout').click()};
  document.body.appendChild(sh)}
$('#bnav').onclick=e=>{const b=e.target.closest('[data-bt]');if(!b)return;if(b.dataset.bt==='more'){moreSheet();return}const sh=$('#msheet');if(sh)sh.remove();goTab(b.dataset.bt)};

/* ---------- barra superior ---------- */
/** selector de módulo (barra superior y «Más» del celular): solo para quien usa los dos */
const modSegHtml=()=>`<span class="seg modseg" role="group" aria-label="Módulo"><button type="button" data-mod="lps" class="${U.mod!=='tar'?'on':''}" aria-pressed="${U.mod!=='tar'}">Last Planner</button><button type="button" data-mod="tar" class="${U.mod==='tar'?'on':''}" aria-pressed="${U.mod==='tar'}">Tareo</button></span>`;
function modselApply(){const el=$('#modsel');document.body.classList.toggle('mod-tar',U.mod==='tar');if(!el)return;const show=canLps()&&canTar();if(el.hidden!==!show)el.hidden=!show;
  if(show)el.querySelectorAll('[data-mod]').forEach(b=>{const on=(b.dataset.mod==='tar')===(U.mod==='tar');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}
$('#modsel').onclick=e=>{const b=e.target.closest('[data-mod]');if(b)goMod(b.dataset.mod)};
function renderTop(){
  modselApply();
  if(U.mod==='tar'){/* Tareo: sin piso, semana, deshacer ni exportes de Last Planner (los oculta también el CSS con body.mod-tar) */
    let pn=P().name||'';if(!pn)try{pn=localStorage.getItem('lps.pname')||''}catch(e){}
    stx('#pname','Tareo de personal obrero');$('#pname').title='';stx('#pcode',(pn?pn+' · ':'')+'Tareo');
    $$('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===U.tab));
    navApply();topDateApply();topToolsApply();updUndo();setStatus();renderBnav();return}
  const p=P();stx('#pname',p.name||'Proyecto');$('#pname').title=p.fullName||'';
  stx('#pcode',(p.code||'')+' · Last Planner System');
  const wd=weekDays(U.week);if(typeof dateMode!=='function'||dateMode()==='week'){stx('#wnum','Semana '+U.week);stx('#wdates',fmtD(wd[0])+' – '+fmtD(wd[5]))}
  $$('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===U.tab));
  const ps=pisos();if(U.piso&&!S.pis.has(U.piso))U.piso='';
  shx('#fpiso','<option value="">Todos los pisos</option>'+ps.map(p=>`<option value="${p.id}"${U.piso===p.id?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join(''));
  const pr=restrInScope().filter(rOpenC).length;const rc=$('#rcount');rc.hidden=!pr;stx(rc,String(pr));
  {const lc=$('#lqcount');if(lc){const vs=new Set(visPisos().map(p=>p.id));/* Calidad: lo que debe programar; el SC: sus observadas por levantar */const n=isCal()?[...LIB.values()].filter(l=>(l.st==='sol'||l.st==='lev')&&vs.has(l.pisoId)).length:SCK()?[...LIB.values()].filter(l=>l.st==='obs'&&vs.has(l.pisoId)&&myScsI().includes(l.sc)).length:0;lc.hidden=!n;stx(lc,String(n))}}
  $('#wtoday').disabled=U.week===curWeek();
  navApply();topDateApply();topToolsApply();
  brandSync();
  updUndo();setStatus();renderBnav();
}
$('#fpiso').onchange=e=>{U.piso=e.target.value;U.pisoAll=!e.target.value;U.sector='';saveUI();sendPresence();render()};
$('#wprev').onclick=()=>{U.week--;render()};
$('#wnext').onclick=()=>{U.week++;render()};
$('#wtoday').onclick=()=>{U.week=curWeek();render()};
$('#tabs').onclick=e=>{const b=e.target.closest('button[data-tab]');if(!b)return;U.tab=b.dataset.tab;saveUI();sendPresence();render()};
$('#bundo').onclick=undo;$('#bredo').onclick=redo;
$('#bexport').onclick=()=>{if(ready)exportXlsx()};
document.addEventListener('keydown',e=>{
  if(U.mod==='tar')return;/* deshacer/rehacer es del lookahead: en el Tareo no debe tocar nada */
  const inField=e.target.closest&&e.target.closest('input,textarea,select');
  if((e.ctrlKey||e.metaKey)&&!inField&&e.key.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();undo()}
  else if((e.ctrlKey||e.metaKey)&&!inField&&(e.key.toLowerCase()==='y'||(e.key.toLowerCase()==='z'&&e.shiftKey))){e.preventDefault();redo()}
});

/* ---------- render principal ---------- */
/* transición suave al cambiar de pestaña (solo opacidad: no mueve nada ni afecta a lo que está fijo en pantalla) */
function viewIn(el){el.classList.remove('vin');void el.offsetWidth;el.classList.add('vin')}
/* El Lookahead armado (miles de filas) no se destruye al cambiar de pestaña: su <main> se aparta, oculto con
   content-visibility:hidden (el navegador guarda su estilo y su diseño ya calculados), y otro <main> muestra la pestaña
   nueva. Al volver, se intercambian: no hay que volver a armar ni a calcular miles de filas, solo las que cambiaron. */
let LOOK_KEEP=null;
function leaveView(main){
  if(main.dataset.view==='look'&&main.dataset.built==='1'&&!isMob()){const r=main.getBoundingClientRect();
    /* solo cambia su id y una clase sin nada heredable: tocar algo heredable obligaría a recalcular el estilo de miles de filas */
    main.id='mainLook';main.classList.add('lkeep');main.style.cssText=`position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
    const nm=document.createElement('main');nm.id='main';main.before(nm);LOOK_KEEP=main;return nm}
  main.innerHTML='';return main}
function enterView(main){
  if(U.tab==='look'&&LOOK_KEEP){const k=LOOK_KEEP;LOOK_KEEP=null;
    if(isMob()){k.remove()}else{main.remove();k.id='main';k.classList.remove('lkeep');k.style.cssText='';k.dataset.view='look';return k}}
  /* la entrada suave solo en páginas livianas: en el Lookahead y el Plan diario costaría más de lo que aporta */
  if(!['look','mapa','dash'].includes(U.tab))viewIn(main);return main}
function render(){
  if(!ready)return;
  if(me&&TAR_ONLY())U.mod='tar';else if(U.mod==='tar'&&!canTar())U.mod='lps';
  /* cada módulo tiene sus pestañas: una del otro módulo lleva a la inicial del actual */
  if(me&&(U.mod==='tar')!==TAR_TABS.includes(U.tab))U.tab=U.mod==='tar'?'tdia':'hoy';
  if(me&&!tabAllowed(U.tab))U.tab=tabHome();
  if(typeof dayAuto==='function')dayAuto();
  let main=$('#main');renderTop();
  if(U.mod==='tar'){document.body.classList.remove('cap-mode','v-dash','dash-tv');if(LKP)presStop();vaBanner()}else{
  if(me&&me.role==='capataz')U.tab='cap';else if(U.tab==='cap'&&!SCK())U.tab='look';if(me&&me.role==='sc')canWrite=PM();if(LKP&&LKP.lock)canWrite=false;if(LKP&&U.tab!=='look')presStop();if(U.tab==='look'||(me&&me.role==='sc'))ensureProp();pmSync();document.body.classList.toggle('cap-mode',!!(me&&me.role==='capataz'));
  if(U.tab==='dash'&&!canDash())U.tab='look';document.body.classList.toggle('v-dash',U.tab==='dash');if(U.tab!=='dash')document.body.classList.remove('dash-tv');
  if(U.tab!=='mapa'&&window.__plano&&window.__plano.zcClose)window.__plano.zcClose();vaBanner();}
  const views={hoy:renderHoy,dash:renderDash,cap:renderCap,look:renderLook,mat:renderMat,campo:renderCampo,mapa:renderMapaTab,plan:renderPlan,restr:renderRestr,lib:renderLib,ind:renderInd,planos:renderPlanos,cfg:renderCfg,team:renderTeam,tdia:renderTDia,tper:renderTPer,tpc:renderTPc,tcfg:renderTCfg,tpub:renderTPub,tcos:renderTCos};document.body.classList.toggle('v-campo',U.tab==='campo');if(typeof LKFS!=='undefined'&&LKFS&&U.tab!=='look')lkFs(false);if(U.tab!=='mat'&&document.body.classList.contains('mxfs')&&typeof mxFsSet==='function')mxFsSet(false);document.body.classList.toggle('v-mapa',U.tab==='mapa');if(!views[U.tab])U.tab=U.mod==='tar'?'tdia':'look';
  let st=null,fk=null,ss=null,se=null;
  if(main.dataset.view===U.tab&&U.tab!=='look'){const sc=main.querySelector('.scroll');st=sc?sc.scrollTop:null;const ae=document.activeElement;if(ae&&main.contains(ae)&&ae.dataset&&ae.dataset.fk){fk=ae.dataset.fk;ss=ae.selectionStart;se=ae.selectionEnd}}
  if(main.dataset.view!==U.tab){main=leaveView(main);main.dataset.view=U.tab;main.dataset.built='';main=enterView(main)}
  try{views[U.tab](main)}catch(err){console.error(err);main.dataset.view='';main.dataset.built='';main.dataset.lqv='';
    main.innerHTML=`<div class="scroll"><div class="wrap"><div class="callout warnc"><b>No se pudo mostrar “${esc(tabName(U.tab))}”.</b> Vuelve a intentarlo o recarga la página; si se repite, envía este detalle al administrador: <span class="mono">${esc(String(err&&err.message||err).slice(0,200))}</span><div style="margin-top:8px"><button class="ib pri" onclick="location.reload()">Recargar la página</button></div></div></div></div>`}
  if(st!=null){const sc=main.querySelector('.scroll');if(sc)sc.scrollTop=st}
  if(fk){const el=main.querySelector(`[data-fk="${CSS.escape(fk)}"]`);if(el){el.focus({preventScroll:true});el.dataset.o=el.value;try{if(ss!=null)el.setSelectionRange(ss,se)}catch(e){}}}
}

