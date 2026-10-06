"use strict";
/* LPS 911 · Módulo Tareo: máster de personal obrero, partidas de control y jornada (F0); cálculo del tareo y tareos del día para la oficina (F1). La revisión del asistente (F2) está en tareo-rev.js.
   Contrato en docs/ia/tareo.md. Vistas: renderTDia, renderTPer, renderTPc, renderTCfg.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* ---------- datos y utilidades puras ---------- */
const TCOLS={tper:'tper',tpc:'tpc',tcfg:'tcfg'};
for(const k of Object.keys(TCOLS))if(!(S[k] instanceof Map))S[k]=new Map();
const TCFG_DEF={jor:{'1':{ini:'07:30',fin:'17:00',ref:60},'2':{ini:'07:30',fin:'17:00',ref:60},'3':{ini:'07:30',fin:'17:00',ref:60},'4':{ini:'07:30',fin:'17:00',ref:60},'5':{ini:'07:30',fin:'17:00',ref:60},'6':{ini:'07:30',fin:'13:00',ref:0},'0':null},refIni:'12:00',limEnv:'18:00',tolGar:15};
const TCAT={OP:'Operario',OF:'Oficial',PE:'Peón',CA:'Capataz',OT:'Otro'};
const TDOW=[['1','Lunes'],['2','Martes'],['3','Miércoles'],['4','Jueves'],['5','Viernes'],['6','Sábado'],['0','Domingo']];
/** configuración del tareo con sus valores por defecto (como P()) */
function TC(){const c=(S.tcfg&&S.tcfg.get('main'))||{};const jor={};
  for(const[k]of TDOW){const v=c.jor&&Object.prototype.hasOwnProperty.call(c.jor,k)?c.jor[k]:TCFG_DEF.jor[k];jor[k]=v&&v.ini&&v.fin?{ini:v.ini,fin:v.fin,ref:+v.ref||0}:null}
  return{jor,refIni:c.refIni||TCFG_DEF.refIni,limEnv:c.limEnv||TCFG_DEF.limEnv,tolGar:c.tolGar!=null&&c.tolGar!==''?+c.tolGar:TCFG_DEF.tolGar}}
const tMin=s=>{const m=/^(\d{1,2}):(\d{2})/.exec(String(s||''));return m?+m[1]*60+ +m[2]:null};
const tR2=v=>Math.round(v*100)/100;
const tFold=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
/** horas de la jornada de un día (objeto {ini,fin,ref} o null) */
const tJorH=j=>{if(!j)return 0;const a=tMin(j.ini),b=tMin(j.fin);return a==null||b==null||b<=a?0:tR2((b-a-(+j.ref||0))/60)};
/** DNI normalizado: 8 dígitos con ceros a la izquierda; carné de extranjería 9–12 alfanuméricos. '' si no es válido (no adivina). */
function tDni(v){if(v==null)return'';
  if(typeof v==='number'){if(!Number.isFinite(v)||v<=0||!Number.isInteger(v))return'';const s=String(v);return s.length<=8?s.padStart(8,'0'):s.length<=12?s:''}
  const raw=String(v).trim();if(!raw)return'';const s=raw.replace(/\s+/g,'');
  if(/^\d{1,8}$/.test(s))return s.padStart(8,'0');
  if(/^\d{9,12}$/.test(s))return s;
  if(/^[A-Za-z0-9]{9,12}$/.test(s)&&!/\s/.test(raw)&&/\d/.test(s))return s.toUpperCase();
  return''}
/** categoría derivada del título del puesto */
function tCatDe(p){const s=tFold(p);if(s.startsWith('OPERARIO'))return'OP';if(s.startsWith('OFICIAL'))return'OF';if(s.startsWith('PEON')||s.startsWith('AYUDANTE'))return'PE';if(s.startsWith('CAPATAZ'))return'CA';return'OT'}
/** ¿activo en la fecha? (último periodo sin cese, o cese posterior; ingreso no posterior; no archivado) */
function tActivo(p,fecha){if(!p||p.arch)return false;fecha=fecha||todayIso();if(p.ing&&p.ing>fecha)return false;return!p.ces||p.ces>fecha}
/** ¿el día es no laborable para el tareo? (domingo según la jornada o feriado del calendario de la obra) */
function tNoLab(fecha){const dw=String(pd(fecha).getUTCDay());if(!TC().jor[dw])return true;
  if(typeof nwReason==='function'){try{return/^Feriado/.test(nwReason(fecha)||'')}catch(e){}}return false}
/** Horas de un obrero en el día: {trab, ext}. trab = horas trabajadas (sin refrigerio); ext = lo que pasa de la jornada del día.
    Refrigerio: se descuenta si el rango cruza refIni (hasta `ref` minutos). El sábado (ref 0) la jornada acaba al mediodía:
    si se queda pasada la hora de salida, se descuenta el refrigerio normal de la semana (el mayor). Domingo o feriado: todo es extra. */
function tHoras(fecha,ini,fin){const c=TC();const a=tMin(ini),b=tMin(fin);if(a==null||b==null||b<=a)return{trab:0,ext:0};
  const dw=String(pd(fecha).getUTCDay());const j=c.jor[dw];const nl=tNoLab(fecha);
  const refStd=Math.max(0,...Object.values(c.jor).filter(Boolean).map(x=>+x.ref||0));
  const jf=j?tMin(j.fin):null;const ref=!nl&&j&&j.ref>0?j.ref:(nl||(jf!=null&&b>jf)?refStd:0);
  const ri=tMin(c.refIni);let d=0;if(ri!=null&&a<ri&&b>ri)d=Math.min(ref,b-ri);
  const trab=tR2(Math.max(0,b-a-d)/60);if(nl)return{trab,ext:trab};
  return{trab,ext:tR2(Math.max(0,trab-tJorH(j)))}}

/* fechas de Excel: número de serie, Date, 'dd/mm/aaaa' o 'aaaa-mm-dd' → 'aaaa-mm-dd' ('' si no es fecha) */
function tFecha(v){if(v==null||v==='')return'';
  if(v instanceof Date)return isNaN(v)?'':iso(new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate())));
  if(typeof v==='number'){if(v<20000||v>80000)return'';return iso(new Date(Math.round((v-25569)*864e5)))}
  const s=String(v).trim();let m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s);
  if(m){let y=+m[3];if(y<100)y+=2000;const d=+m[1],mo=+m[2];if(mo<1||mo>12||d<1||d>31)return'';return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
  m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);return m?m[0]:''}
const tFmt=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'';
/* columnas del máster de RR.HH. por su encabezado */
const TM_FIELDS=[['nom','Nombre',/^NOMBRE/],['ing','Fecha de ingreso',/INGRESO/],['pue','Título puesto',/PUESTO/],['cua','Categoría (cuadrilla)',/^CATEGORIA/],['dni','DNI',/^(DNI|DOC)/],['ces','Comentarios / cese',/COMENTARIO|CESE/],['mot','Motivo de cese',/MOTIVO/]];
function tMasterCols(rows){for(let i=0;i<Math.min(rows.length,40);i++){const r=(rows[i]||[]).map(tFold);if(!r.some(x=>/^DNI$/.test(x))||!r.some(x=>/^NOMBRE/.test(x)))continue;
    const m={hdr:i};for(const[k,,re]of TM_FIELDS){const j=r.findIndex(x=>re.test(x));if(j>=0)m[k]=j}
    if(m.mot==null&&m.ces!=null&&!r[m.ces+1])m.mot=m.ces+1;/* 9.ª columna sin encabezado */return m}
  return{hdr:-1}}
/** Máster de RR.HH. (hoja «Datos del personal», filas como arrays) → {fichas, errores, cols}. Agrupa por DNI (reingresos) y ordena por ingreso. */
function tParseMaster(rows,cols,hoy){rows=rows||[];const c=cols&&cols.dni!=null?cols:tMasterCols(rows);hoy=hoy||todayIso();const errores=[],by=new Map();
  if(c.dni==null||c.nom==null)return{fichas:[],errores:[{fila:0,txt:'No se encontraron las columnas «Nombre» y «DNI».'}],cols:c};
  const g=(r,k)=>c[k]==null?'':r[c[k]];
  rows.forEach((r,i)=>{if(!r||i===c.hdr)return;const nomR=String(g(r,'nom')??'').trim(),dniR=g(r,'dni');
    if(!nomR&&(dniR===''||dniR==null))return;
    if(/^NOMBRE/.test(tFold(nomR))||/^DNI$/.test(tFold(dniR)))return;/* encabezado repetido */
    const dni=tDni(dniR);if(!dni){errores.push({fila:i+1,txt:`DNI no válido («${String(dniR??'').trim()||'vacío'}»)`,nom:nomR});return}
    const nm=nomR.replace(/\s+/g,' ');const k=nm.indexOf(',');const ape=(k>=0?nm.slice(0,k):nm).trim().toUpperCase(),nom=(k>=0?nm.slice(k+1):'').trim().toUpperCase();
    const cv=g(r,'ces');const ces=tFecha(cv);const mot=ces?String(g(r,'mot')??'').trim().replace(/\s+/g,' '):'';
    const ing=tFecha(g(r,'ing'));if(!ing)errores.push({fila:i+1,txt:'Sin fecha de ingreso (se importa igual)',nom:nm,warn:true});
    const pue=String(g(r,'pue')??'').trim().replace(/\s+/g,' ').toUpperCase(),cua=String(g(r,'cua')??'').trim().replace(/\s+/g,' ').toUpperCase();
    const L=by.get(dni)||[];L.push({ing,ces,mot,ape,nom,pue,cua,fila:i+1});by.set(dni,L)});
  const fichas=[];for(const[dni,L]of by){L.sort((a,b)=>(a.ing||'').localeCompare(b.ing||'')||a.fila-b.fila);
    const per=[];for(const x of L){const p=per[per.length-1];if(p&&p.ing===x.ing){if(!p.ces&&x.ces){p.ces=x.ces;p.mot=x.mot}continue}per.push({ing:x.ing,ces:x.ces,mot:x.mot})}
    const u=L[L.length-1],lp=per[per.length-1];const f={dni,ape:u.ape,nom:u.nom,pue:u.pue,cat:tCatDe(u.pue),cua:u.cua,ing:lp.ing,ces:lp.ces,mot:lp.mot,per};f.act=tActivo(f,hoy);fichas.push(f)}
  fichas.sort((a,b)=>a.ape.localeCompare(b.ape)||a.dni.localeCompare(b.dni));return{fichas,errores,cols:c}}
/* código de partida: número o texto ('2.0199999' → '2.02') */
const tCod=v=>{if(v==null||v==='')return'';const n=typeof v==='number'?v:+String(v).trim().replace(',','.');return Number.isFinite(n)&&n>0?n.toFixed(2):''};
const tPcId=cod=>'p'+String(cod).replace('.','_');
const tNum=v=>{if(v===''||v==null)return null;const n=typeof v==='number'?v:+String(v).replace(',','.');return Number.isFinite(n)?tR2(n):null};
/** hoja «Lista de partidas» (filas como arrays) → {partidas, grupos, errores} */
function tParsePartidas(rows){rows=rows||[];let C=2,UA=7;
  for(let i=0;i<Math.min(rows.length,30);i++){const r=(rows[i]||[]).map(tFold);const d=r.findIndex(x=>/^DESCRIPCI/.test(x));if(d>0){C=d;const u=r.findIndex(x=>/^UA\s*-\s*TAREO/.test(x));UA=u>=0?u:d+5;break}}
  const B=C-1;const partidas=[],grupos=[],errores=[],seen=new Set();let cur=null;
  rows.forEach((r,i)=>{if(!r)return;const t=String(r[C]??'').trim().replace(/\s+/g,' ');const raw=r[B];if(raw===''||raw==null){return}
    if(/^TOTAL/.test(tFold(t)))return;const cod=tCod(raw);if(!cod){if(t&&!/^DESCRIPCI/.test(tFold(t)))errores.push({fila:i+1,txt:`Código no válido («${String(raw).trim()}»)`,nom:t});return}
    const und=String(r[C+1]??'').trim(),ua=String(r[UA]??'').trim();
    const n=typeof raw==='number'?raw:+String(raw).replace(',','.');
    if(Number.isInteger(n)&&!und&&!ua){cur={grp:String(n),grpN:t};grupos.push(cur);return}
    if(!t){errores.push({fila:i+1,txt:`Partida ${cod} sin descripción`});return}
    if(seen.has(cod)){errores.push({fila:i+1,txt:`Código ${cod} repetido (se toma el primero)`,nom:t});return}seen.add(cod);
    const grp=cod.split('.')[0];const gN=cur&&cur.grp===grp?cur.grpN:((grupos.find(x=>x.grp===grp)||{}).grpN||'');
    partidas.push({id:tPcId(cod),cod,grp,grpN:gN,nom:t,und,met:tNum(r[C+2]),hhp:tNum(r[C+3]),ua,ord:partidas.length+1})});
  return{partidas,grupos,errores}}
/** orden de códigos por partes enteras: 2 antes de 10; 10.02 antes de 10.10 (no como texto) */
const tCmpCod=(a,b)=>{const A=String(a??'').split('.'),B=String(b??'').split('.');for(let i=0;i<Math.max(A.length,B.length);i++){const x=parseInt(A[i],10),y=parseInt(B[i],10);
    const d=(Number.isFinite(x)?x:-1)-(Number.isFinite(y)?y:-1);if(d)return d}return String(a??'').localeCompare(String(b??''))};

/* ---------- lectura de Excel (librería diferida de exportes.js) ---------- */
function tPickFile(accept){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept=accept||'.xlsx,.xls,.csv';i.style.display='none';i.id='tfile';
  i.onchange=()=>{const f=i.files&&i.files[0];i.remove();res(f||null)};document.body.appendChild(i);i.click()})}
async function tReadBook(f){await loadXlsx();const buf=await f.arrayBuffer();return window.XLSX.read(buf,{type:'array'})}
/** filas de una hoja como arrays de valores calculados; recorta el rango (hay hojas con «A1:XFD134») */
function tRows(ws){const X=window.XLSX;if(!ws||!ws['!ref'])return[];const R=X.utils.decode_range(ws['!ref']);let mc=0,mr=0;
  for(const k of Object.keys(ws)){if(k[0]==='!')continue;const a=X.utils.decode_cell(k);const v=ws[k]&&ws[k].v;if(v!==''&&v!=null){if(a.c>mc)mc=a.c;if(a.r>mr)mr=a.r}}
  R.e.c=Math.min(R.e.c,mc,60);R.e.r=Math.min(R.e.r,mr);return X.utils.sheet_to_json(ws,{header:1,raw:true,defval:'',range:R,blankrows:true})}
async function tSheetOf(wb,want){const names=wb.SheetNames||[];const hit=names.find(n=>tFold(n)===tFold(want));if(hit)return hit;if(names.length===1)return names[0];
  return new Promise(res=>{lqModal(`<div class="lqtop"><b>Elige la hoja</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
    <p class="lqmsg">No encontré la hoja «${esc(want)}». ¿Cuál tiene los datos?</p><div class="t-sheets">${names.map((n,i)=>`<button class="ib" data-tsh="${i}">${esc(n)}</button>`).join('')}</div>`,
    e=>{const b=e.target.closest('[data-tsh]');if(b){lqClose();res(names[+b.dataset.tsh])}});
    const el=$('#lqm');const mo=new MutationObserver(()=>{if(!el.isConnected){mo.disconnect();res(null)}});mo.observe(document.body,{childList:true})})}
async function tBatch(writes){/* writes: [[ref,data,opts]] en lotes de 400 */for(let i=0;i<writes.length;i+=400){const b=(db||FDB).batch();for(const[r,d,o]of writes.slice(i,i+400))o?b.set(r,d,o):b.set(r,d);await b.commit()}}
const tStamp=()=>({by:me&&me.email||'',ts:NOW()});
const tEdit=()=>typeof tarEdit==='function'&&tarEdit();
const tCaps=()=>[...MEM.entries()].filter(([,m])=>m&&m.role==='tcap').map(([id,m])=>({id,name:m.name||id})).sort((a,b)=>a.name.localeCompare(b.name));
const tCapName=id=>{if(!id)return'';const m=MEM.get(id);return m?(m.name||id):'(capataz retirado)'};
const tName=p=>[p.ape,p.nom].filter(Boolean).join(', ');
const tLive=()=>[...S.tper.values()].filter(p=>!p.arch);

/* ---------- Cálculo del tareo (F1; contrato en docs/ia/tareo.md) ---------- */
/** horas de un bloque: descuenta el refrigerio si lo cruza (misma regla que tHoras, sin extra) */
function tBlqH(fecha,ini,fin){return tHoras(fecha,ini,fin).trab}
/* bloque con partida y horario válido (05:00–23:59, salida después de la entrada) */
const tBlqOk=b=>{if(!b||!b.pc)return false;const a=tMin(b.ini),z=tMin(b.fin);return a!=null&&z!=null&&z>a&&a>=300&&z<=1439};
const tBlqDe=(blq,dni)=>(Array.isArray(blq)?blq:[]).filter(b=>b&&Array.isArray(b.dnis)&&b.dnis.includes(dni));
/** copia del tareo con `rows` recalculados desde `blq`: por obrero presente, horas por partida, primera entrada/última salida,
    trab = suma de sus bloques, ext = lo que pasa de la jornada del día (domingo o feriado: todo extra). Ausentes: sin horas. */
function tCalc(doc){const d=doc||{};const f=d.date||todayIso();const rows={};
  const nl=tNoLab(f);const jh=tJorH(TC().jor[String(pd(f).getUTCDay())]);
  for(const[dni,r0]of Object.entries(d.rows||{})){const r={...r0};
    if(r.as!==true){Object.assign(r,{h:{},ini:'',fin:'',trab:0,ext:0});rows[dni]=r;continue}/* no vino o sin marcar: sin horas (conserva sus bloques) */
    const h={};let a=null,z=null,t=0;
    for(const b of tBlqDe(d.blq,dni)){if(!tBlqOk(b))continue;const x=tBlqH(f,b.ini,b.fin);h[b.pc]=tR2((h[b.pc]||0)+x);t+=x;
      const bi=tMin(b.ini),bf=tMin(b.fin);if(a==null||bi<a[0])a=[bi,b.ini];if(z==null||bf>z[0])z=[bf,b.fin]}
    const trab=tR2(t);Object.assign(r,{h,ini:a?a[1]:'',fin:z?z[1]:'',trab,ext:nl?trab:tR2(Math.max(0,trab-jh))});rows[dni]=r}
  return{...d,rows}}
/** problemas que impiden enviar el tareo: [{dni|null, k, msg}] (mensajes para el capataz). Vacío = se puede enviar.
    Un obrero que no vino puede seguir en sus bloques (no es error: tCalc le da 0 h y los recupera si vuelve a «vino»). */
function tValida(doc){const d=doc||{};const out=[];const rows=d.rows||{};const blq=Array.isArray(d.blq)?d.blq:[];
  const nm=dni=>{const r=rows[dni];return r&&(r.ape||r.nom)?[r.ape,r.nom].filter(Boolean).join(', '):dni};
  const pcC=pc=>{const p=pc&&S.tpc.get(pc);return p?p.cod:pc||'sin partida'};const bloqs=new Set();
  if(!Object.keys(rows).length)out.push({dni:null,k:'vacio',msg:'No hay obreros en el tareo: agrega a tu cuadrilla.'});
  blq.forEach((b,i)=>{b=b||{};const lb=`Bloque ${i+1} (${pcC(b.pc)}, ${b.ini||'?'}–${b.fin||'?'})`;const a=tMin(b.ini),z=tMin(b.fin);
    if(!b.pc)out.push({dni:null,k:'pc',msg:`${lb}: elige la partida.`});
    else{const p=S.tpc.get(b.pc);if(p&&p.bloq===true&&!bloqs.has(b.pc)){bloqs.add(b.pc);out.push({dni:null,k:'bloq',msg:`La partida ${p.cod} está bloqueada por costos.`})}}
    if(a==null||z==null||z<=a)out.push({dni:null,k:'hora',msg:`${lb}: la hora de salida debe ser después de la de entrada.`});
    else if(a<300||z>1439)out.push({dni:null,k:'hora',msg:`${lb}: el horario debe estar entre 05:00 y 23:59.`});
    if(!Array.isArray(b.dnis)||!b.dnis.length)out.push({dni:null,k:'quien',msg:`${lb}: marca quiénes trabajaron.`})});
  for(const[dni,r]of Object.entries(rows)){
    if(r.as!==true&&r.as!==false){out.push({dni,k:'marca',msg:`Falta marcar si vino: ${(r&&r.ape)||nm(dni)}`});continue}
    if(!r.as){if(!r.mot)out.push({dni,k:'mot',msg:`${nm(dni)}: elige el motivo de la falta.`});continue}
    const L=tBlqDe(blq,dni).filter(tBlqOk).map(b=>[tMin(b.ini),tMin(b.fin),b]).sort((x,y)=>x[0]-y[0]);
    if(!L.length){out.push({dni,k:'sinh',msg:`${nm(dni)}: vino pero no tiene horas. Ponlo en un bloque o márcalo como falta.`});continue}
    let m=L[0];for(let i=1;i<L.length;i++){if(L[i][0]<m[1]){out.push({dni,k:'cruce',msg:`${nm(dni)}: dos bloques se cruzan (${m[2].ini}–${m[2].fin} y ${L[i][2].ini}–${L[i][2].fin}).`});break}if(L[i][1]>m[1])m=L[i]}}
  if(!(Array.isArray(d.foto)&&d.foto.length))out.push({dni:null,k:'foto',msg:'Falta la foto del formato firmado.'});
  return out}

/* ---------- Tareos del día: personal de oficina (asistente, admin, jefe de producción) ---------- */
const TO_MOT={DM:'Descanso médico',DA:'Descanso por accidente',SU:'Suspensión',SM:'Subsidio por maternidad',SE:'Subsidio por enfermedad',VA:'Vacaciones',FA:'Falta',LS:'Licencia sin goce',L:'Liquidado'};
const TO_ST={sin:['Sin empezar','to-sin'],bor:['Borrador','to-bor'],env:['Enviado','to-env'],reab:['Reabierto','to-reab'],rev:['Revisado','to-rev'],pub:['Publicado','to-pub']};
const TO_ORD={env:0,reab:1,bor:2,sin:3,rev:4,pub:5};
const TO_HA={env:'Enviado',reab:'Reabierto',cor:'Corregido',fir:'Cotejo de firmas',rev:'Revisado',qrev:'Quitó revisado',pub:'Publicado'};
/* estado de la vista: fecha elegida y suscripción temporal a los tareos de esa fecha (solo mientras la pestaña está abierta) */
const TD={f:'',d:'',sub:null,docs:new Map(),ok:false,err:null,fotos:new Map(),flt:'all',sinTxt:''};
const toAct=()=>U.mod==='tar'&&U.tab==='tdia'&&!!me&&me.role!=='tcap'&&me.role!=='tcos';
const toReabOk=()=>!!me&&(isAdmin||me.role==='tasis');
const toH=v=>(+v||0).toLocaleString('es-PE',{maximumFractionDigits:2});
const toWho=e=>{const m=e&&MEM.get(e);return m&&m.name||e||''};
const tHm=t=>t?new Date(t-LIMA_OFF).toISOString().slice(11,16):'';
const toDia=f=>{const w=TDOW.find(([k])=>k===String(pd(f).getUTCDay()));return`${w?w[1]:''} ${fmtD(f)}${f===todayIso()?' · hoy':''}${tNoLab(f)?' · no laborable':''}`};
function toUnsub(){if(TD.sub){try{TD.sub()}catch(e){}}TD.sub=null;TD.d=''}
/* se suscribe a fcol('tareo') de la fecha; cambia de fecha = cambia de suscripción. Al salir de la pestaña se suelta en la
   siguiente llegada de datos (no hay gancho de salida de vista) y al cerrar sesión (unsubs). */
function toSub(f){if(TD.sub&&TD.d===f)return;toUnsub();TD.d=f;TD.docs=new Map();TD.ok=false;TD.err=null;if(!db)return;
  const un=fcol('tareo').where('date','==',f).onSnapshot(sn=>{if(TD.sub!==un)return;if(!toAct()){toUnsub();return}
    const m=new Map();sn.docs.forEach(x=>m.set(x.id,{...x.data(),id:x.id}));TD.docs=m;TD.ok=true;TD.err=null;if(ready)requestRender();if(typeof trSync==='function')trSync()},
    err=>{if(TD.sub!==un)return;TD.err=err&&err.code||'error';TD.ok=true;if(ready&&toAct())requestRender()});
  TD.sub=un;unsubs.push(()=>{if(TD.sub===un)toUnsub();else try{un()}catch(e){}})}
function toChip(t){const k=t?t.st||'bor':'sin';const[l,c]=TO_ST[k]||[k,''];return`<span class="to-st ${c}" data-st="${esc(k)}">${esc(l)}${k==='env'&&t.envAt?' '+esc(tHm(t.envAt)):''}</span>`}
function toStats(t){const c=tCalc(t);let pres=0,fal=0,hh=0,he=0,alt=0;const mot={};
  for(const r of Object.values(c.rows)){if(r.as){pres++;hh+=r.trab||0;he+=r.ext||0;if(r.alt)alt++}else{fal++;const m=r.mot||'?';mot[m]=(mot[m]||0)+1}}
  const ob=tObsRev(t,c);let cot=0,nof=0;for(const r of Object.values(c.rows))if(r.as){if(r.fir===true||r.fir===false)cot++;if(r.fir===false)nof++}
  return{c,pres,fal,hh:tR2(hh),he:tR2(he),alt,mot,obs:ob.filter(o=>o.k!=='firp'),cot,nof}}
/* capataces del día: los que tienen tareo + los capataces (tcap) con obreros activos asignados que aún no empiezan */
function toList(f){const L=[],seen=new Set();
  for(const t of TD.docs.values()){if(t.arch)continue;seen.add(t.cap);L.push({id:t.id,cap:t.cap,name:t.capN||tCapName(t.cap)||t.cap,t,s:toStats(t)})}
  const asg=new Map();for(const p of tLive())if(p.cap&&tActivo(p,f))asg.set(p.cap,(asg.get(p.cap)||0)+1);
  for(const c of tCaps())if(!seen.has(c.id)&&asg.get(c.id))L.push({id:'',cap:c.id,name:c.name,t:null,n:asg.get(c.id)});
  return L.sort((a,b)=>(TO_ORD[a.t?a.t.st||'bor':'sin']??9)-(TO_ORD[b.t?b.t.st||'bor':'sin']??9)||a.name.localeCompare(b.name))}

function renderTDia(main){if(me&&me.role==='tcap'){toUnsub();return renderTCap(main)}
  if(me&&me.role==='tcos'){toUnsub();main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Tareos del día','')}<div class="callout t-soon">Los tareos aparecen aquí cuando el jefe de producción los publique (fase 3).</div></div></div>`;return}
  const hoy=todayIso();if(!TD.f)TD.f=hoy;const f=TD.f;toSub(f);
  const L=toList(f);let env=0,hh=0,he=0,fal=0;const mot={};
  for(const x of L){if(!x.t)continue;if(['env','rev','pub'].includes(x.t.st))env++;hh+=x.s.hh;he+=x.s.he;fal+=x.s.fal;for(const[k,n]of Object.entries(x.s.mot))mot[k]=(mot[k]||0)+n}
  const num=(v,l)=>`<td class="mono t-r" data-l="${l}">${v}</td>`;
  const late=tLate(f);const isLate=x=>late&&(!x.t||['bor','reab'].includes(x.t.st));
  const cotC=x=>{const t=x.t;if(!['env','rev','pub'].includes(t.st))return'';if(x.s.nof)return`<span class="tr-no">${x.s.nof} sin firma</span>`;
    return x.s.cot>=x.s.pres?'<span class="tr-si">✓</span>':`<span class="note">${x.s.cot} de ${x.s.pres}</span>`};
  const lateT=x=>isLate(x)?` <span class="tr-tag">No enviado a las ${esc(TC().limEnv)}</span>`:'';
  const row=x=>x.t?`<tr class="to-row${isLate(x)?' tr-lrow':''}" data-to="${esc(x.id)}"><td data-l="Capataz"><button class="t-lnk" data-to="${esc(x.id)}">${esc(x.name)}</button></td><td data-l="Estado">${toChip(x.t)}${lateT(x)}</td>
      ${num(x.s.pres,'Vinieron')}${num(x.s.fal||'',  'Faltas')}${num(toH(x.s.hh),'HH')}${num(x.s.he?toH(x.s.he):'','HE')}<td class="t-r" data-l="Observ.">${x.s.obs.length?`<span class="to-obsn" title="${esc(x.s.obs.map(o=>o.msg).join('\n'))}">${x.s.obs.length}</span>`:''}</td><td class="t-r" data-l="Firmas">${cotC(x)}</td></tr>`
    :`<tr class="t-off to-row${isLate(x)?' tr-lrow':''}" data-tcap="${esc(x.cap)}"><td data-l="Capataz">${esc(x.name)}</td><td data-l="Estado">${toChip(null)}${lateT(x)}</td><td class="mono t-r" data-l="Asignados" colspan="6"><span class="note">${x.n} ${x.n===1?'obrero asignado':'obreros asignados'}</span></td></tr>`;
  const T=L.filter(x=>x.t);const FL={all:['Todos',L.length],rev:['Por revisar',T.filter(x=>x.t.st==='env').length],obs:['Con observaciones',T.filter(x=>x.s.obs.length).length],ok:['Revisados',T.filter(x=>['rev','pub'].includes(x.t.st)).length]};
  if(!FL[TD.flt])TD.flt='all';
  const vis=L.filter(x=>TD.flt==='all'||(x.t&&(TD.flt==='rev'?x.t.st==='env':TD.flt==='obs'?x.s.obs.length>0:['rev','pub'].includes(x.t.st))));
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Tareos del día',esc(toDia(f)),`<span class="to-date"><button class="ib" id="toPrev" aria-label="Día anterior">‹</button><input class="tin" type="date" id="toDate" value="${esc(f)}" max="${esc(hoy)}" aria-label="Fecha"><button class="ib" id="toNext" aria-label="Día siguiente"${f>=hoy?' disabled':''}>›</button>${f!==hoy?'<button class="ib" id="toHoy">Hoy</button>':''}</span>`)}
   ${TD.err?`<div class="callout t-warn">No se pudieron leer los tareos de este día (${esc(TD.err)}).</div>`:''}
   <div class="lqtiles to-tiles"><div class="lqtile" style="--c:var(--ok)"><span>Enviados</span><b id="toEnv">${env}<small> de ${L.length}</small></b></div>
    <div class="lqtile" style="--c:var(--accent)"><span>HH del día</span><b id="toHH">${toH(hh)}</b></div>
    <div class="lqtile" style="--c:var(--warn)"><span>Horas extra</span><b id="toHE">${toH(he)}</b></div>
    <div class="lqtile" style="--c:var(--bad)"><span>Faltas</span><b id="toFal">${fal}</b>${fal?`<small>${Object.entries(mot).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`<span title="${esc(TO_MOT[k]||k)}">${esc(k)} ${n}</span>`).join(' · ')}</small>`:''}</div></div>
   ${TD.ok?trSecciones(f,L):''}
   <div class="tr-flt"><span class="seg" id="trFlt" role="group" aria-label="Filtrar por estado">${Object.entries(FL).map(([k,[l,n]])=>`<button data-trflt="${k}" class="${TD.flt===k?'on':''}">${l}${k==='all'?'':` <b>${n}</b>`}</button>`).join('')}</span></div>
   <div class="card"><div class="tscroll"><table class="t t-tbl to-list"><thead><tr><th>Capataz</th><th>Estado</th><th class="t-r">Vinieron</th><th class="t-r">Faltas</th><th class="t-r">HH</th><th class="t-r">HE</th><th class="t-r">Observ.</th><th class="t-r">Firmas</th></tr></thead>
    <tbody id="toBody">${vis.map(row).join('')||`<tr><td colspan="8" class="note">${!(TD.ok||TD.err)?'Cargando tareos…':L.length?'Ningún tareo con este filtro.':'No hay tareos ni capataces con obreros asignados este día.'}</td></tr>`}</tbody></table></div></div>
  </div></div>`;
  const go=d=>{TD.f=d>hoy?hoy:d;requestRender()};
  $('#toPrev').onclick=()=>go(addD(f,-1));$('#toNext').onclick=()=>go(addD(f,1));const h=$('#toHoy');if(h)h.onclick=()=>go(hoy);
  $('#toDate').onchange=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.target.value))go(e.target.value)};
  $('#toBody').onclick=e=>{const b=e.target.closest('[data-to]');if(b)toDetalle(b.dataset.to)};
  $('#trFlt').onclick=e=>{const b=e.target.closest('[data-trflt]');if(b){TD.flt=b.dataset.trflt;requestRender()}};
  const cp=$('#trCopy');if(cp)cp.onclick=()=>trCopy(TD.sinTxt);
  main.querySelectorAll('details[data-tk]').forEach(d=>d.ontoggle=()=>{(TD.dOpen=TD.dOpen||{})[d.dataset.tk]=d.open});
  const sn=$('#trSin');if(sn)sn.onclick=e=>{const b=e.target.closest('[data-trfal]');if(b)trFalta(b.dataset.trfal)}}

/* detalle y revisión de un tareo: toDetalle, toReabrir y el resto de la bandeja del asistente están en tareo-rev.js (F2) */
async function toFotos(id,ids){for(const fid of ids){if(TD.fotos.has(fid))continue;
    try{const d=await fcol('tfot').doc(fid).get();if(d.exists&&d.data().d)TD.fotos.set(fid,d.data().d)}catch(e){}
    const b=document.querySelector(`#toFotos [data-tft="${CSS.escape(fid)}"]`);if(!b)return;
    if(typeof trView==='function')trView();
    b.innerHTML=TD.fotos.has(fid)?`<img src="${esc(TD.fotos.get(fid))}" alt="Formato firmado">`:'<span class="note">No se pudo cargar</span>'}}
function toZoom(fid){const u=TD.fotos.get(fid);if(!u)return;const el=document.createElement('div');el.className='to-zoom';el.setAttribute('role','dialog');el.setAttribute('aria-label','Foto del formato');
  el.innerHTML=`<img src="${esc(u)}" alt="Formato firmado"><button class="kx" aria-label="Cerrar">&times;</button>`;el.onclick=()=>el.remove();document.body.appendChild(el)}

/* ---------- Personal (máster) ---------- */
const TU={q:'',est:'act',cua:'',cat:'',cap:'',sel:new Set()};
function tPerList(){const hoy=todayIso();const q=tFold(TU.q);
  return[...S.tper.values()].filter(p=>{if(TU.est==='arch'){if(!p.arch)return false}else{if(p.arch)return false;const a=tActivo(p,hoy);if(TU.est==='act'&&!a)return false;if(TU.est==='ces'&&a)return false}
    if(TU.cua&&(p.cua||'')!==TU.cua)return false;if(TU.cat&&(p.cat||'OT')!==TU.cat)return false;if(TU.cap&&(TU.cap==='-'?!!p.cap:p.cap!==TU.cap))return false;
    if(q&&!(p.dni||'').includes(q)&&!tFold(p.ape).includes(q)&&!tFold(p.nom).includes(q))return false;return true})
   .sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||(a.dni||'').localeCompare(b.dni||''))}
/* «Hacer capataz»: la cuenta (usuario y contraseña) la crea tareo-cuentas.js con tCapCuenta(dni); aquí solo el botón y el chip */
const tCtaFn=()=>typeof tCapCuenta==='function';
function tPerRows(L){const ed=tEdit(),hoy=todayIso();const max=600;const cf=ed&&tCtaFn();
  return L.slice(0,max).map((p,i)=>{const a=tActivo(p,hoy);const dni=p.dni||p.id;return`<tr class="${a?'':'t-off'}" data-tp="${esc(p.id)}">${ed?`<td class="t-ck"><input type="checkbox" data-tsel="${esc(p.id)}"${TU.sel.has(p.id)?' checked':''} aria-label="Elegir"></td>`:''}
   <td class="mono t-r t-num" data-l="N°">${i+1}</td><td class="mono" data-l="DNI">${esc(dni)}</td><td data-l="Nombre"><button class="t-lnk" data-tfi="${esc(p.id)}">${esc(p.ape||'')}<span>${esc(p.nom||'')}${p.cta?' <i class="lqt t-capc">Capataz</i>':''}</span></button></td>
   <td data-l="Puesto">${esc(p.pue||'')} <i class="t-cat">${esc(p.cat||'OT')}</i></td><td data-l="Cuadrilla">${esc(p.cua||'')}</td><td data-l="Capataz">${esc(tCapName(p.cap))||'<span class="note">—</span>'}</td>
   <td class="mono" data-l="Ingreso">${esc(tFmt(p.ing))}</td><td class="mono" data-l="Cese">${esc(tFmt(p.ces))}${p.ces&&a?' <span class="note">(próximo)</span>':''}</td><td data-l="Motivo">${esc(p.mot||'')}</td>${cf?`<td class="t-acts"><button class="ib" data-tcta="${esc(dni)}">${p.cta?'Cuenta de capataz…':'Hacer capataz'}</button></td>`:''}</tr>`}).join('')
   +(L.length>max?`<tr><td colspan="12" class="note">Se muestran ${max} de ${L.length}: usa el buscador o los filtros.</td></tr>`:'')}
function tPerDraw(){const b=$('#tperBody');if(!b)return;const L=tPerList();b.innerHTML=tPerRows(L);const n=$('#tperN');if(n){const hoy=todayIso();n.textContent=`Mostrando ${L.length} de ${tLive().length} · ${L.filter(p=>tActivo(p,hoy)).length} activos`}
  const s=$('#tselBar');if(s){s.hidden=!TU.sel.size;const c=$('#tselN');if(c)c.textContent=TU.sel.size}}
function renderTPer(main){const ed=tEdit();const all=tLive();const hoy=todayIso();const nAct=all.filter(p=>tActivo(p,hoy)).length;
  const cuas=[...new Set(all.map(p=>p.cua).filter(Boolean))].sort();const caps=tCaps();
  for(const id of[...TU.sel])if(!S.tper.has(id))TU.sel.delete(id);
  const opt=(v,l,cur)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`;
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Personal',`${nAct} activos · ${all.length} en el máster`,`<button class="ib" id="tperXls">Exportar Excel</button>${ed?`<button class="ib" id="tperImp">Importar Excel de RR.HH.</button><button class="ib pri" id="tperAdd">+ Obrero</button>`:''}`)}
   ${helpBox('¿Cómo se mantiene el máster?',`<p>Importa el Excel de RR.HH. (hoja «Datos del personal»): verás qué personas son nuevas, cuáles cambian y cuáles siguen igual antes de confirmar. La importación <b>no</b> borra a nadie ni cambia el capataz asignado.</p><p>Un reingreso agrega un periodo nuevo a la misma ficha (por DNI). «Archivar» la oculta sin borrarla.</p>`)}
   ${ed?'':`<div class="callout">Solo lectura: el máster lo mantiene el asistente de tareo.</div>`}
   ${ed&&!caps.length?`<div class="callout t-warn">No hay capataces de tareo en el equipo (rol «Capataz (tareo)»)${MEM.size<2?' o tu rol no puede ver la lista del equipo':''}: agrégalos en Equipo para poder asignarles obreros.</div>`:''}
   <div class="card"><div class="pad t-bar">
    <input class="tin t-q" id="tperQ" data-fk="tperQ" type="search" placeholder="Buscar DNI o apellido" value="${esc(TU.q)}" aria-label="Buscar">
    <span class="seg" id="tperEst">${[['act','Activos'],['ces','Cesados'],['all','Todos'],['arch','Archivados']].map(([k,l])=>`<button data-test="${k}" class="${TU.est===k?'on':''}">${l}</button>`).join('')}</span>
    <select class="tin" id="tperCua" aria-label="Cuadrilla">${opt('','Todas las cuadrillas',TU.cua)}${cuas.map(c=>opt(c,c,TU.cua)).join('')}</select>
    <select class="tin" id="tperCat" aria-label="Categoría">${opt('','Todas las categorías',TU.cat)}${Object.entries(TCAT).map(([k,l])=>opt(k,l,TU.cat)).join('')}</select>
    <select class="tin" id="tperCap" aria-label="Capataz">${opt('','Todos los capataces',TU.cap)}${opt('-','Sin capataz',TU.cap)}${caps.map(c=>opt(c.id,c.name,TU.cap)).join('')}</select>
    <span class="note" id="tperN"></span></div>
    ${ed?`<div class="pad t-selbar" id="tselBar" hidden><b><span id="tselN">0</span> elegidos</b><button class="ib pri" id="tselCap">Asignar capataz</button><button class="ib" id="tselNone">Quitar selección</button></div>`:''}
    <div class="tscroll"><table class="t t-tbl"><thead><tr>${ed?'<th class="t-ck"><input type="checkbox" id="tselAll" aria-label="Elegir todos los visibles"></th>':''}<th class="t-r t-num">N°</th><th>DNI</th><th>Apellidos y nombres</th><th>Puesto</th><th>Cuadrilla</th><th>Capataz</th><th>Ingreso</th><th>Cese</th><th>Motivo</th>${ed&&tCtaFn()?'<th></th>':''}</tr></thead><tbody id="tperBody"></tbody></table></div></div>
  </div></div>`;
  tPerDraw();
  const q=$('#tperQ');q.oninput=()=>{TU.q=q.value;tPerDraw()};
  $('#tperEst').onclick=e=>{const b=e.target.closest('[data-test]');if(!b)return;TU.est=b.dataset.test;$$('#tperEst button').forEach(x=>x.classList.toggle('on',x===b));tPerDraw()};
  $('#tperCua').onchange=e=>{TU.cua=e.target.value;tPerDraw()};$('#tperCat').onchange=e=>{TU.cat=e.target.value;tPerDraw()};$('#tperCap').onchange=e=>{TU.cap=e.target.value;tPerDraw()};
  $('#tperXls').onclick=tPerExport;
  const body=$('#tperBody');body.onclick=e=>{const c=e.target.closest('[data-tcta]');if(c){if(tEdit()&&tCtaFn())tCapCuenta(c.dataset.tcta);return}const b=e.target.closest('[data-tfi]');if(b)tFicha(b.dataset.tfi)};
  if(!ed)return;
  body.onchange=e=>{const c=e.target.closest('[data-tsel]');if(!c)return;if(c.checked)TU.sel.add(c.dataset.tsel);else TU.sel.delete(c.dataset.tsel);tPerDraw()};
  $('#tselAll').onchange=e=>{const L=tPerList().slice(0,600);if(e.target.checked)L.forEach(p=>TU.sel.add(p.id));else L.forEach(p=>TU.sel.delete(p.id));tPerDraw()};
  $('#tselNone').onclick=()=>{TU.sel.clear();const a=$('#tselAll');if(a)a.checked=false;tPerDraw()};
  $('#tselCap').onclick=tAsignarCap;$('#tperAdd').onclick=()=>tPerForm(null);$('#tperImp').onclick=tImportMaster}

function tFicha(id){const p=S.tper.get(id);if(!p)return;const ed=tEdit();const a=tActivo(p);const per=(Array.isArray(p.per)&&p.per.length?p.per:[{ing:p.ing,ces:p.ces,mot:p.mot}]).slice().reverse();
  lqModal(`<div class="lqtop"><b>${esc(p.ape||'')}${p.nom?', '+esc(p.nom):''}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <div class="lqh"><span class="mono">DNI ${esc(p.dni||p.id)}</span><span>${esc(p.pue||'')} · ${esc(TCAT[p.cat]||'Otro')} · ${esc(p.cua||'sin cuadrilla')}</span><span>Capataz: ${esc(tCapName(p.cap)||'sin asignar')}</span>
    <span class="lqtags"><i class="lqt ${a?'t-ok':''}">${p.arch?'ARCHIVADO':a?'ACTIVO':'CESADO'}</i></span></div>
   <div><b class="t-h3">Historial de periodos</b><table class="t t-per"><thead><tr><th>Ingreso</th><th>Cese</th><th>Motivo</th></tr></thead><tbody>${per.map(x=>`<tr><td class="mono">${esc(tFmt(x.ing))||'—'}</td><td class="mono">${esc(tFmt(x.ces))||'<span class="note">vigente</span>'}</td><td>${esc(x.mot||'')}</td></tr>`).join('')}</tbody></table></div>
   ${p.ts?`<p class="note">Último cambio: ${esc(p.by||'')} · ${esc(fmtD(ldt(p.ts)))}</p>`:''}
   ${ed?`<div class="lqbtns lqbw">${p.arch?`<button class="ib pri" data-tfa="unarch">Restaurar</button>`:`<button class="ib" data-tfa="edit">Editar</button>${p.ces&&!a?`<button class="ib pri" data-tfa="rein">Reingreso</button>`:`<button class="ib" data-tfa="ces">Marcar cese</button>`}<button class="ib bad" data-tfa="arch">Archivar</button>`}</div>`:''}`,
   e=>{const b=e.target.closest('[data-tfa]');if(!b)return;const k=b.dataset.tfa;if(k==='edit')tPerForm(id);else if(k==='ces')tCese(id);else if(k==='rein')tReingreso(id);else if(k==='arch')tArchivar(id);else if(k==='unarch')tRestaurar(id)})}

function tPerForm(id){const p=id?S.tper.get(id):null;const caps=tCaps();const cuas=[...new Set(tLive().map(x=>x.cua).filter(Boolean))].sort();
  const v=p||{dni:'',ape:'',nom:'',pue:'',cat:'',cua:'',cap:'',ing:todayIso()};
  lqModal(`<div class="lqtop"><b>${p?'Editar obrero':'Nuevo obrero'}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <div class="t-form">
    <label class="lqlab">DNI<input class="tin" id="tfDni" value="${esc(v.dni)}" inputmode="numeric" maxlength="12"${p?' readonly':''}></label>
    <label class="lqlab">Fecha de ingreso<input class="tin" id="tfIng" type="date" value="${esc(v.ing||'')}"></label>
    <label class="lqlab">Apellidos<input class="tin" id="tfApe" value="${esc(v.ape)}"></label>
    <label class="lqlab">Nombres<input class="tin" id="tfNom" value="${esc(v.nom)}"></label>
    <label class="lqlab">Puesto<input class="tin" id="tfPue" value="${esc(v.pue)}" placeholder="OPERARIO ALBAÑIL"></label>
    <label class="lqlab">Categoría<select class="tin" id="tfCat"><option value="">Según el puesto</option>${Object.entries(TCAT).map(([k,l])=>`<option value="${k}"${p&&v.cat===k?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="lqlab">Cuadrilla<input class="tin" id="tfCua" value="${esc(v.cua)}" list="tfCuaL"><datalist id="tfCuaL">${cuas.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
    <label class="lqlab">Capataz<select class="tin" id="tfCap"><option value="">Sin capataz</option>${caps.map(c=>`<option value="${esc(c.id)}"${c.id===v.cap?' selected':''}>${esc(c.name)}</option>`).join('')}${v.cap&&!caps.some(c=>c.id===v.cap)?`<option value="${esc(v.cap)}" selected>${esc(tCapName(v.cap))}</option>`:''}</select></label>
   </div><p class="lqmsg bad" id="tfMsg"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="tfOk">Guardar</button></div>`,
   async e=>{if(!e.target.closest('#tfOk'))return;const msg=t=>{$('#tfMsg').textContent=t};
     const dni=p?p.id:tDni($('#tfDni').value);if(!dni)return msg('El DNI no es válido: 8 dígitos (o carné de extranjería de 9 a 12 caracteres).');
     if(!p&&S.tper.has(dni)){const o=S.tper.get(dni);return msg(`Ya existe una ficha con el DNI ${dni}${o.arch?' (archivada: restáurala desde «Archivados»)':` (${tName(o)})`}.`)}
     const ape=$('#tfApe').value.trim().replace(/\s+/g,' ').toUpperCase(),nom=$('#tfNom').value.trim().replace(/\s+/g,' ').toUpperCase();if(!ape)return msg('Escribe los apellidos.');
     const ing=$('#tfIng').value;const pue=$('#tfPue').value.trim().replace(/\s+/g,' ').toUpperCase();const cat=$('#tfCat').value||tCatDe(pue);
     const d={dni,ape,nom,pue,cat,cua:$('#tfCua').value.trim().toUpperCase(),cap:$('#tfCap').value,ing,...tStamp()};
     if(p){const per=Array.isArray(p.per)&&p.per.length?p.per.map(x=>({...x})):[{ing:p.ing||'',ces:p.ces||'',mot:p.mot||''}];per[per.length-1].ing=ing;d.per=per;d.act=tActivo({...p,...d})}
     else{Object.assign(d,{ces:'',mot:'',per:[{ing,ces:'',mot:''}]});d.act=tActivo(d)}
     try{await fcol(TCOLS.tper).doc(dni).set(d,{merge:true});lqClose();toast(p?'Ficha actualizada.':'Obrero agregado.')}catch(err){msg('No se pudo guardar: '+(err.code||err.message))}})}

const TMOT=['Renuncia','Termino de partida','Termino total de partida','Abandono de trabajo','Faltas injustificadas'];
function tCese(id){const p=S.tper.get(id);if(!p)return;
  lqModal(`<div class="lqtop"><b>Marcar cese</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><div class="lqh"><b>${esc(tName(p))}</b><span class="mono">DNI ${esc(p.dni||id)}</span></div>
   <div class="t-form"><label class="lqlab">Fecha de cese<input class="tin" id="tcF" type="date" value="${esc(todayIso())}"></label>
   <label class="lqlab">Motivo<input class="tin" id="tcM" list="tcML" placeholder="Renuncia, Termino de partida…"><datalist id="tcML">${TMOT.map(m=>`<option value="${esc(m)}">`).join('')}</datalist></label></div>
   <p class="lqmsg bad" id="tcMsg"></p><div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="tcOk">Guardar cese</button></div>`,
   async e=>{if(!e.target.closest('#tcOk'))return;const f=$('#tcF').value,m=$('#tcM').value.trim();if(!f)return $('#tcMsg').textContent='Elige la fecha de cese.';
     if(p.ing&&f<p.ing)return $('#tcMsg').textContent='El cese no puede ser anterior al ingreso ('+tFmt(p.ing)+').';
     const per=Array.isArray(p.per)&&p.per.length?p.per.map(x=>({...x})):[{ing:p.ing||'',ces:'',mot:''}];Object.assign(per[per.length-1],{ces:f,mot:m});
     const d={ces:f,mot:m,per,...tStamp()};d.act=tActivo({...p,...d});
     try{await fcol(TCOLS.tper).doc(id).set(d,{merge:true});lqClose();toast('Cese registrado.')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}})}
function tReingreso(id){const p=S.tper.get(id);if(!p)return;
  lqModal(`<div class="lqtop"><b>Reingreso</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><div class="lqh"><b>${esc(tName(p))}</b><span>Cesó el ${esc(tFmt(p.ces))}${p.mot?' · '+esc(p.mot):''}</span></div>
   <div class="t-form"><label class="lqlab">Fecha de reingreso<input class="tin" id="trF" type="date" value="${esc(todayIso())}"></label><label class="lqlab">Puesto<input class="tin" id="trP" value="${esc(p.pue||'')}"></label></div>
   <p class="lqmsg bad" id="trMsg"></p><div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trOk">Registrar reingreso</button></div>`,
   async e=>{if(!e.target.closest('#trOk'))return;const f=$('#trF').value;if(!f)return $('#trMsg').textContent='Elige la fecha.';if(p.ces&&f<=p.ces)return $('#trMsg').textContent='El reingreso debe ser posterior al cese ('+tFmt(p.ces)+').';
     const pue=$('#trP').value.trim().replace(/\s+/g,' ').toUpperCase();const per=(Array.isArray(p.per)&&p.per.length?p.per:[{ing:p.ing||'',ces:p.ces||'',mot:p.mot||''}]).map(x=>({...x}));per.push({ing:f,ces:'',mot:''});
     const d={ing:f,ces:'',mot:'',per,pue,cat:pue===p.pue?(p.cat||tCatDe(pue)):tCatDe(pue),...tStamp()};d.act=tActivo({...p,...d});
     try{await fcol(TCOLS.tper).doc(id).set(d,{merge:true});lqClose();toast('Reingreso registrado.')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}})}
async function tArchivar(id){const p=S.tper.get(id);if(!p)return;lqClose();
  if(!await uiAsk({title:'¿Archivar la ficha?',text:`${tName(p)} (DNI ${p.dni||id}) deja de aparecer en el máster. No se borra: puedes restaurarla desde «Archivados».`,ok:'Archivar',tone:'warn'}))return;
  try{await fcol(TCOLS.tper).doc(id).update({arch:{t:NOW(),by:me.email,n:tName(p)},act:false,...tStamp()});toast('Ficha archivada.')}catch(err){toast('No se pudo archivar: '+(err.code||err.message))}}
async function tRestaurar(id){const p=S.tper.get(id);if(!p)return;lqClose();
  try{await fcol(TCOLS.tper).doc(id).update({arch:firebase.firestore.FieldValue.delete(),act:tActivo({...p,arch:null}),...tStamp()});toast('Ficha restaurada.')}catch(err){toast('No se pudo restaurar: '+(err.code||err.message))}}
function tAsignarCap(){const ids=[...TU.sel].filter(id=>S.tper.has(id));if(!ids.length)return;const caps=tCaps();
  if(!caps.length){toast('No hay capataces de tareo en el equipo: agrégalos en Equipo con el rol «Capataz (tareo)».');return}
  lqModal(`<div class="lqtop"><b>Asignar capataz</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><p class="lqmsg">${ids.length} ${ids.length===1?'obrero elegido':'obreros elegidos'}.</p>
   <label class="lqlab">Capataz<select class="tin" id="tacSel"><option value="">Sin capataz (quitar)</option>${caps.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="tacOk">Asignar</button></div>`,
   async e=>{if(!e.target.closest('#tacOk'))return;const cap=$('#tacSel').value;const st=tStamp();
     try{await tBatch(ids.map(id=>[fcol(TCOLS.tper).doc(id),{cap,...st},{merge:true}]));lqClose();TU.sel.clear();toast(`${ids.length} ${ids.length===1?'obrero asignado':'obreros asignados'}${cap?' a '+tCapName(cap):' sin capataz'}.`);requestRender()}catch(err){toast('No se pudo asignar: '+(err.code||err.message))}})}
async function tPerExport(){try{await loadXlsx();const X=window.XLSX;const L=tPerList();
  const aoa=[['DNI','Apellidos','Nombres','Puesto','Categoría','Cuadrilla','Capataz','Ingreso','Cese','Motivo','Estado']];const hoy=todayIso();
  for(const p of L)aoa.push([p.dni||p.id,p.ape||'',p.nom||'',p.pue||'',TCAT[p.cat]||'Otro',p.cua||'',tCapName(p.cap),tFmt(p.ing),tFmt(p.ces),p.mot||'',p.arch?'Archivado':tActivo(p,hoy)?'Activo':'Cesado']);
  const ws=X.utils.aoa_to_sheet(aoa);ws['!cols']=[10,24,22,26,10,16,22,11,11,22,10].map(w=>({wch:w}));for(let c=0;c<11;c++){const k=X.utils.encode_cell({r:0,c});if(ws[k])ws[k].s={font:{bold:true}}}
  for(let r=1;r<aoa.length;r++){const k=X.utils.encode_cell({r,c:0});if(ws[k])ws[k].t='s'}
  const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Personal');saveBlob(`Personal obrero ${hoy}.xlsx`,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/octet-stream'}))}
  catch(err){toast('No se pudo exportar: '+(err.message||err))}}

/* importación del máster de RR.HH. */
const TP_CMP=[['ape','Apellidos'],['nom','Nombres'],['pue','Puesto'],['cua','Cuadrilla'],['ing','Ingreso'],['ces','Cese'],['mot','Motivo']];
function tMasterDiff(fichas){const nuevos=[],cambios=[],iguales=[];const inFile=new Set();
  for(const f of fichas){inFile.add(f.dni);const o=S.tper.get(f.dni);if(!o){nuevos.push(f);continue}
    const ch=[];for(const[k,l]of TP_CMP)if((o[k]||'')!==(f[k]||''))ch.push(`${l}: ${k==='ing'||k==='ces'?tFmt(o[k])||'—':o[k]||'—'} → ${k==='ing'||k==='ces'?tFmt(f[k])||'—':f[k]||'—'}`);
    const op=JSON.stringify((o.per||[]).map(x=>[x.ing||'',x.ces||'',x.mot||''])),fp=JSON.stringify(f.per.map(x=>[x.ing,x.ces,x.mot]));if(op!==fp&&!ch.length)ch.push(`Periodos: ${(o.per||[]).length} → ${f.per.length}`);
    if(ch.length)cambios.push({f,o,ch});else iguales.push(f)}
  const fuera=tLive().filter(p=>!inFile.has(p.id)&&!inFile.has(p.dni));const hoy=todayIso();
  let act=0;for(const f of fichas){const o=S.tper.get(f.dni);if(!(o&&o.arch)&&tActivo(f,hoy))act++}for(const p of fuera)if(tActivo(p,hoy))act++;
  return{nuevos,cambios,iguales,fuera,act}}
async function tImportMaster(){const f=await tPickFile();if(!f)return;let wb;try{wb=await tReadBook(f)}catch(err){toast('No se pudo leer el archivo: '+(err.message||err));return}
  const sh=await tSheetOf(wb,'Datos del personal');if(!sh)return;const rows=tRows(wb.Sheets[sh]);tImportMasterRows(rows,sh,null)}
function tImportMasterRows(rows,sh,cols){const R=tParseMaster(rows,cols);const D=tMasterDiff(R.fichas);const c=R.cols;const hdr=c.hdr>=0?rows[c.hdr]||[]:rows[0]||[];
  const ncol=Math.max(...rows.slice(0,50).map(r=>(r||[]).length),hdr.length);const X=window.XLSX;const letter=i=>X?X.utils.encode_col(i):String(i+1);
  const colSel=(k,l)=>`<label class="lqlab t-map">${esc(l)}<select class="tin" data-tmap="${k}"><option value="">—</option>${Array.from({length:ncol},(_,i)=>`<option value="${i}"${c[k]===i?' selected':''}>${letter(i)}${hdr[i]?' · '+esc(String(hdr[i]).replace(/\s+/g,' ').slice(0,24)):''}</option>`).join('')}</select></label>`;
  const errs=R.errores.filter(e=>!e.warn),warns=R.errores.filter(e=>e.warn);const lim=(L,fn)=>L.slice(0,150).map(fn).join('')+(L.length>150?`<li class="note">… y ${L.length-150} más</li>`:'');
  const sec=(id,t,n,body,open)=>`<details class="t-sec" id="${id}"${open?' open':''}><summary><b>${n}</b> ${t}</summary><ul class="t-list">${body}</ul></details>`;
  lqModal(`<div class="lqtop"><b>Importar personal</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">Hoja «${esc(sh)}» · ${R.fichas.length} personas (por DNI) en el archivo.</p>
   <details class="t-sec"><summary>Columnas detectadas</summary><div class="t-maps">${TM_FIELDS.map(([k,l])=>colSel(k,l)).join('')}</div></details>
   <div class="lqtiles t-imptiles"><div class="lqtile" style="--c:var(--ok)"><span>Nuevos</span><b id="timpNew">${D.nuevos.length}</b></div><div class="lqtile" style="--c:var(--accent)"><span>Con cambios</span><b id="timpChg">${D.cambios.length}</b></div>
    <div class="lqtile" style="--c:var(--line2)"><span>Sin cambios</span><b id="timpEq">${D.iguales.length}</b></div><div class="lqtile" style="--c:var(--bad)"><span>Errores</span><b id="timpErr">${errs.length}</b></div></div>
   <p class="lqmsg ok">Quedarían <b id="timpAct">${D.act}</b> obreros activos.</p>
   ${sec('timpLN','nuevos',D.nuevos.length,lim(D.nuevos,x=>`<li><span class="mono">${esc(x.dni)}</span> ${esc(tName(x))} · ${esc(x.pue)}${x.act?'':' <i class="note">(cesado)</i>'}</li>`),false)}
   ${sec('timpLC','con cambios',D.cambios.length,lim(D.cambios,x=>`<li><span class="mono">${esc(x.f.dni)}</span> ${esc(tName(x.f))}<div class="t-chg">${x.ch.map(esc).join('<br>')}</div></li>`),false)}
   ${errs.length?sec('timpLE','con errores (no se importan)',errs.length,lim(errs,x=>`<li>Fila ${x.fila}: ${esc(x.txt)}${x.nom?' · '+esc(x.nom):''}</li>`),true):''}
   ${warns.length?sec('timpLW','avisos',warns.length,lim(warns,x=>`<li>Fila ${x.fila}: ${esc(x.txt)}${x.nom?' · '+esc(x.nom):''}</li>`),false):''}
   ${D.fuera.length?sec('timpLF','en el máster pero no en el archivo (no se tocan)',D.fuera.length,lim(D.fuera,x=>`<li><span class="mono">${esc(x.dni||x.id)}</span> ${esc(tName(x))}</li>`),false):''}
   <p class="note">No se borra ni archiva a nadie y no se cambia el capataz asignado.</p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="timpOk"${D.nuevos.length+D.cambios.length?'':' disabled'}>Importar ${D.nuevos.length+D.cambios.length} ${D.nuevos.length+D.cambios.length===1?'ficha':'fichas'}</button></div>`,
   async e=>{const b=e.target.closest('#timpOk');if(!b)return;b.disabled=true;b.textContent='Importando…';const st=tStamp();const W=[];
     for(const x of D.nuevos)W.push([fcol(TCOLS.tper).doc(x.dni),{dni:x.dni,ape:x.ape,nom:x.nom,pue:x.pue,cat:x.cat,cua:x.cua,cap:'',ing:x.ing,ces:x.ces,mot:x.mot,per:x.per,act:x.act,...st},{merge:true}]);
     for(const{f,o}of D.cambios){const d={dni:f.dni,ape:f.ape,nom:f.nom,pue:f.pue,cua:f.cua,ing:f.ing,ces:f.ces,mot:f.mot,per:f.per,act:o.arch?false:f.act,...st};d.cat=f.pue===o.pue&&o.cat?o.cat:f.cat;W.push([fcol(TCOLS.tper).doc(f.dni),d,{merge:true}])}
     try{await tBatch(W);lqClose();toast(`Importación lista: ${D.nuevos.length} nuevos, ${D.cambios.length} actualizados.`)}catch(err){b.disabled=false;b.textContent='Reintentar';toast('No se pudo importar: '+(err.code||err.message))}},
   e=>{const s=e.target.closest('[data-tmap]');if(!s)return;const nc={...c};$$('[data-tmap]').forEach(x=>{nc[x.dataset.tmap]=x.value===''?null:+x.value});tImportMasterRows(rows,sh,nc)})}

/* ---------- Partidas de control ---------- */
/* una sola tabla (columnas alineadas entre grupos) con fila de encabezado por grupo, como la hoja «Lista de partidas» */
const TPU={q:'',est:'all'};
const tBloqOk=()=>!!me&&(!!isAdmin||me.role==='tasis'||me.role==='tcos');
const tF2=v=>v==null||v===''?'':Number(v).toLocaleString('es-PE',{maximumFractionDigits:2});
/* ratio HH/und (columna «Ratio» del Excel): HH presupuestadas entre metrado */
const tRatio=x=>{const m=+x.met,h=+x.hhp;return m>0&&h>0?(h/m).toLocaleString('es-PE',{maximumFractionDigits:4}):''};
function tPcGroups(L){const G=new Map();for(const x of L){const k=String(x.grp||String(x.cod||'').split('.')[0]||'');if(!G.has(k))G.set(k,{k,n:'',L:[]});const g=G.get(k);if(!g.n&&x.grpN)g.n=x.grpN;g.L.push(x)}
  for(const g of G.values())g.L.sort((a,b)=>tCmpCod(a.cod,b.cod));return[...G.values()].sort((a,b)=>tCmpCod(a.k,b.k))}
function tPcVis(){const q=tFold(TPU.q);return[...S.tpc.values()].filter(x=>{if(!x||x.arch)return false;
  if(TPU.est==='act'&&x.act===false)return false;if(TPU.est==='bloq'&&x.bloq!==true)return false;if(TPU.est==='ina'&&x.act!==false)return false;
  return!q||String(x.cod||'').includes(q)||tFold(x.nom).includes(q)||tFold(x.ua).includes(q)||tFold(x.grpN).includes(q)})}
function tPcDraw(){const b=$('#tpcBody');if(!b)return;const ed=tEdit(),bq=tBloqOk();const G=tPcGroups(tPcVis());const nc=8+(ed||bq?1:0);
  b.innerHTML=G.map(g=>{const hh=g.L.reduce((s,x)=>s+(+x.hhp||0),0);
    return`<tr class="tpc-gh" data-tpg="${esc(g.k)}"><th colspan="${nc}"><span class="mono">${esc(g.k)}</span> ${esc(g.n||'(sin grupo)')}<span class="sub">${g.L.length} ${g.L.length===1?'partida':'partidas'}${hh?` · ${tF2(hh)} HH ppto`:''}</span></th></tr>`+
    g.L.map(x=>{const off=x.act===false,lk=x.bloq===true;
      return`<tr class="tpc-r${off?' t-off':''}${lk?' tpc-lk':''}" data-tpc="${esc(x.id)}"><td class="mono" data-l="Código">${esc(x.cod)}</td><td class="tpc-nom" data-l="Descripción">${lk?'<span class="tpc-lock" title="Bloqueada por costos" aria-label="Bloqueada">🔒</span> ':''}${esc(x.nom)}</td>
       <td data-l="Und">${esc(x.und||'')}</td><td class="mono t-r" data-l="Metrado">${tF2(x.met)}</td><td class="mono t-r" data-l="HH ppto">${tF2(x.hhp)}</td><td class="mono t-r" data-l="HH/und">${tRatio(x)}</td><td class="mono" data-l="Cuenta UA">${esc(x.ua||'')}</td>
       <td data-l="Estado"><span class="tpc-st">${off?'<i class="lqt">INACTIVA</i>':'<i class="lqt t-ok">ACTIVA</i>'}${lk?`<i class="lqt tpc-bq" title="${esc(x.bloqBy?'Por '+x.bloqBy:'')}">BLOQUEADA</i>`:''}</span></td>
       ${ed||bq?`<td class="t-acts">${bq?`<button class="ib" data-tpb="${esc(x.id)}">${lk?'Desbloquear':'Bloquear para carga'}</button>`:''}${ed?`<button class="ib" data-tpe="${esc(x.id)}">Editar</button><button class="ib" data-tpt="${esc(x.id)}">${off?'Activar':'Desactivar'}</button>`:''}</td>`:''}</tr>`}).join('')}).join('')
   ||`<tr><td colspan="${nc}" class="note">${S.tpc.size?'Ninguna partida con este filtro.':'Aún no hay partidas de control.'}</td></tr>`;
  const n=$('#tpcN');if(n){const L=G.reduce((s,g)=>s+g.L.length,0);n.textContent=`${L} ${L===1?'partida':'partidas'} en ${G.length} ${G.length===1?'grupo':'grupos'}`}}
async function tPcBloq(id){const x=S.tpc.get(id);if(!x||!tBloqOk())return;const on=x.bloq!==true;
  if(!await uiAsk({title:on?`¿Bloquear la partida ${x.cod}?`:`¿Desbloquear la partida ${x.cod}?`,text:on?`«${x.nom}» deja de aparecer en el celular de los capataces y un tareo que la use no se podrá enviar hasta cambiarla.`:`«${x.nom}» vuelve a estar disponible para cargar horas.`,ok:on?'Bloquear':'Desbloquear',tone:on?'warn':'info'}))return;
  try{await fcol(TCOLS.tpc).doc(id).update({bloq:on,bloqBy:(me.email||'').toLowerCase(),bloqAt:NOW()});toast(`Partida ${x.cod} ${on?'bloqueada para carga':'desbloqueada'}.`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}
function renderTPc(main){const ed=tEdit(),bq=tBloqOk();const all=[...S.tpc.values()].filter(x=>x&&!x.arch);
  const nA=all.filter(x=>x.act!==false).length,nB=all.filter(x=>x.bloq===true).length,nG=tPcGroups(all).length;
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Partidas de control',`${nA} activas · ${nG} grupos${nB?` · ${nB} bloqueadas`:''}`,ed?`<button class="ib" id="tpcImp">Importar Excel de costos</button><button class="ib pri" id="tpcAdd">+ Partida</button>`:'')}
   ${helpBox('¿Para qué sirven?',`<p>Son las partidas en las que el capataz reparte las horas de su cuadrilla. Importa la hoja «Lista de partidas» del Excel que hoy recibe costos para cargarlas o actualizarlas. Desactivar una partida la quita de los tareos nuevos (los antiguos la conservan).</p><p><b>Bloquear para carga</b> (costos, asistente o administrador): la partida no aparece en el celular del capataz y un tareo que la use no se puede enviar.</p>`)}
   ${ed?'':bq?`<div class="callout">Puedes bloquear o desbloquear partidas para la carga; el resto lo mantiene el asistente de tareo.</div>`:`<div class="callout">Solo lectura: las partidas las mantiene el asistente de tareo.</div>`}
   ${all.length?'':`<div class="callout">Aún no hay partidas de control.${ed?' Impórtalas del Excel de costos o agrégalas una por una.':''}</div>`}
   <div class="card"><div class="pad t-bar"><input class="tin t-q" id="tpcQ" data-fk="tpcQ" type="search" placeholder="Buscar código, partida o cuenta" value="${esc(TPU.q)}" aria-label="Buscar partida">
    <span class="seg" id="tpcEst">${[['all','Todas'],['act','Activas'],['bloq','Bloqueadas'],['ina','Inactivas']].map(([k,l])=>`<button data-tpest="${k}" class="${TPU.est===k?'on':''}">${l}</button>`).join('')}</span><span class="note" id="tpcN"></span></div>
    <div class="tscroll"><table class="t t-tbl tpc-tbl${ed||bq?' tpc-ed':''}"><colgroup><col class="tpc-c-cod"><col><col class="tpc-c-und"><col class="tpc-c-num"><col class="tpc-c-num"><col class="tpc-c-rat"><col class="tpc-c-ua"><col class="tpc-c-st">${ed||bq?`<col class="tpc-c-acts${ed&&bq?' w2':''}">`:''}</colgroup>
     <thead><tr><th>Código</th><th>Descripción</th><th>Und</th><th class="t-r">Metrado</th><th class="t-r">HH ppto</th><th class="t-r">HH/und</th><th>Cuenta UA</th><th>Estado</th>${ed||bq?'<th></th>':''}</tr></thead>
     <tbody id="tpcBody"></tbody></table></div></div>
  </div></div>`;
  tPcDraw();
  const q=$('#tpcQ');q.oninput=()=>{TPU.q=q.value;tPcDraw()};
  $('#tpcEst').onclick=e=>{const b=e.target.closest('[data-tpest]');if(!b)return;TPU.est=b.dataset.tpest;$$('#tpcEst button').forEach(x=>x.classList.toggle('on',x===b));tPcDraw()};
  if(ed){$('#tpcAdd').onclick=()=>tPcForm(null);$('#tpcImp').onclick=tImportPc}
  if(!ed&&!bq)return;
  $('#tpcBody').onclick=async e=>{let b;if((b=e.target.closest('[data-tpb]')))return tPcBloq(b.dataset.tpb);if(!ed)return;
    if((b=e.target.closest('[data-tpe]')))tPcForm(b.dataset.tpe);
    else if((b=e.target.closest('[data-tpt]'))){const x=S.tpc.get(b.dataset.tpt);if(!x)return;const on=x.act===false;
      try{await fcol(TCOLS.tpc).doc(x.id).set({act:on,...tStamp()},{merge:true});toast(`Partida ${x.cod} ${on?'activada':'desactivada'}.`)}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}}}
function tPcForm(id){const x=id?S.tpc.get(id):null;const v=x||{cod:'',grpN:'',nom:'',und:'',met:'',hhp:'',ua:''};
  const grpN=g=>{for(const p of S.tpc.values())if(p.grp===g&&p.grpN)return p.grpN;return''};
  lqModal(`<div class="lqtop"><b>${x?'Editar partida':'Nueva partida de control'}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <div class="t-form"><label class="lqlab">Código<input class="tin" id="tpCod" value="${esc(v.cod)}" placeholder="10.05" inputmode="decimal"${x?' readonly':''}></label>
    <label class="lqlab">Grupo<input class="tin" id="tpGrp" value="${esc(v.grpN||'')}" placeholder="ESTRUCTURAS"></label>
    <label class="lqlab t-wide">Partida<input class="tin" id="tpNom" value="${esc(v.nom)}"></label>
    <label class="lqlab">Unidad<input class="tin" id="tpUnd" value="${esc(v.und||'')}" placeholder="m2"></label><label class="lqlab">Metrado meta<input class="tin" id="tpMet" value="${esc(v.met??'')}" inputmode="decimal"></label>
    <label class="lqlab">HH presupuestadas<input class="tin" id="tpHh" value="${esc(v.hhp??'')}" inputmode="decimal"></label><label class="lqlab">Cuenta UA<input class="tin" id="tpUa" value="${esc(v.ua||'')}" placeholder="CD1030001-06"></label></div>
   <p class="lqmsg bad" id="tpMsg"></p><div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="tpOk">Guardar</button></div>`,
   async e=>{if(!e.target.closest('#tpOk'))return;const msg=t=>{$('#tpMsg').textContent=t};const cod=x?x.cod:tCod($('#tpCod').value);
     if(!cod||!/^\d+\.\d{2}$/.test(cod)||cod.endsWith('.00'))return msg('El código debe tener la forma grupo.número (p. ej. 10.05).');const pid=x?x.id:tPcId(cod);
     if(!x&&S.tpc.has(pid))return msg(`Ya existe la partida ${cod}.`);const nom=$('#tpNom').value.trim().replace(/\s+/g,' ');if(!nom)return msg('Escribe el nombre de la partida.');
     const grp=cod.split('.')[0];const d={cod,grp,grpN:$('#tpGrp').value.trim()||grpN(grp),nom,und:$('#tpUnd').value.trim(),met:tNum($('#tpMet').value),hhp:tNum($('#tpHh').value),ua:$('#tpUa').value.trim(),...tStamp()};
     if(!x){d.act=true;d.ord=S.tpc.size+1}
     try{await fcol(TCOLS.tpc).doc(pid).set(d,{merge:true});lqClose();toast(x?'Partida actualizada.':'Partida agregada.')}catch(err){msg('No se pudo guardar: '+(err.code||err.message))}})}
const TPC_CMP=[['nom','Nombre'],['grpN','Grupo'],['und','Unidad'],['met','Metrado'],['hhp','HH'],['ua','UA']];
async function tImportPc(){const f=await tPickFile();if(!f)return;let wb;try{wb=await tReadBook(f)}catch(err){toast('No se pudo leer el archivo: '+(err.message||err));return}
  const sh=await tSheetOf(wb,'Lista de partidas');if(!sh)return;const R=tParsePartidas(tRows(wb.Sheets[sh]));
  const nuevas=[],cambios=[],iguales=[];const inF=new Set();
  for(const p of R.partidas){inF.add(p.id);const o=S.tpc.get(p.id);if(!o){nuevas.push(p);continue}const ch=[];for(const[k,l]of TPC_CMP){const a=o[k]??'',b=p[k]??'';if(String(a)!==String(b))ch.push(`${l}: ${a===''?'—':a} → ${b===''?'—':b}`)}if(ch.length)cambios.push({p,ch});else iguales.push(p)}
  const fuera=[...S.tpc.values()].filter(x=>!x.arch&&!inF.has(x.id));const lim=L=>L.slice(0,200);
  lqModal(`<div class="lqtop"><b>Importar partidas de control</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">Hoja «${esc(sh)}» · ${R.partidas.length} partidas en ${R.grupos.length} grupos.</p>
   <div class="lqtiles t-imptiles"><div class="lqtile" style="--c:var(--ok)"><span>Nuevas</span><b id="tpiNew">${nuevas.length}</b></div><div class="lqtile" style="--c:var(--accent)"><span>Con cambios</span><b id="tpiChg">${cambios.length}</b></div>
    <div class="lqtile" style="--c:var(--line2)"><span>Sin cambios</span><b id="tpiEq">${iguales.length}</b></div><div class="lqtile" style="--c:var(--bad)"><span>Errores</span><b>${R.errores.length}</b></div></div>
   <details class="t-sec"><summary><b>${nuevas.length}</b> nuevas</summary><ul class="t-list">${lim(nuevas).map(p=>`<li><span class="mono">${esc(p.cod)}</span> ${esc(p.nom)} <span class="note">${esc(p.grpN)}</span></li>`).join('')}</ul></details>
   <details class="t-sec"><summary><b>${cambios.length}</b> con cambios</summary><ul class="t-list">${lim(cambios).map(x=>`<li><span class="mono">${esc(x.p.cod)}</span> ${esc(x.p.nom)}<div class="t-chg">${x.ch.map(esc).join('<br>')}</div></li>`).join('')}</ul></details>
   ${R.errores.length?`<details class="t-sec" open><summary><b>${R.errores.length}</b> con errores (no se importan)</summary><ul class="t-list">${R.errores.map(x=>`<li>Fila ${x.fila}: ${esc(x.txt)}${x.nom?' · '+esc(x.nom):''}</li>`).join('')}</ul></details>`:''}
   ${fuera.length?`<details class="t-sec"><summary><b>${fuera.length}</b> en la app pero no en el archivo (no se tocan)</summary><ul class="t-list">${fuera.map(x=>`<li><span class="mono">${esc(x.cod)}</span> ${esc(x.nom)}</li>`).join('')}</ul></details>`:''}
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="tpiOk"${nuevas.length+cambios.length?'':' disabled'}>Importar ${nuevas.length+cambios.length}</button></div>`,
   async e=>{const b=e.target.closest('#tpiOk');if(!b)return;b.disabled=true;const st=tStamp();const W=[];
     for(const p of nuevas){const{id,...d}=p;W.push([fcol(TCOLS.tpc).doc(id),{...d,act:true,...st},{merge:true}])}
     for(const{p}of cambios){const{id,...d}=p;W.push([fcol(TCOLS.tpc).doc(id),{...d,...st},{merge:true}])}
     try{await tBatch(W);lqClose();toast(`Partidas importadas: ${nuevas.length} nuevas, ${cambios.length} actualizadas.`)}catch(err){b.disabled=false;toast('No se pudo importar: '+(err.code||err.message))}})}

/* ---------- Configuración del tareo (admin) ---------- */
function renderTCfg(main){const c=TC();const ed=!!isAdmin;const dis=ed?'':' disabled';
  main.innerHTML=`<div class="scroll"><div class="wrap">${pageHead('Configuración del tareo','Jornada, refrigerio, hora límite de envío y tolerancia de garita')}
   ${ed?'':`<div class="callout">Solo el administrador cambia la configuración del tareo.</div>`}
   <div class="card"><h2>Jornada por día <span class="sub">Lo que pase de la jornada del día cuenta como horas extra</span></h2>
    <div class="tscroll"><table class="t t-tbl t-jor"><thead><tr><th>Día</th><th>Laborable</th><th>Inicio</th><th>Fin</th><th>Refrigerio (min)</th><th class="t-r">Horas</th></tr></thead><tbody>
    ${TDOW.map(([k,l])=>{const j=c.jor[k];const d=j||{ini:'07:30',fin:'17:00',ref:0};return`<tr data-tjd="${k}"><td data-l="Día"><b>${l}</b></td><td data-l="Laborable"><input type="checkbox" data-tj="on"${j?' checked':''}${dis} aria-label="${l} laborable"></td>
     <td data-l="Inicio"><input class="tin" type="time" data-tj="ini" value="${esc(d.ini)}"${j?'':' disabled'}${dis}></td><td data-l="Fin"><input class="tin" type="time" data-tj="fin" value="${esc(d.fin)}"${j?'':' disabled'}${dis}></td>
     <td data-l="Refrigerio"><input class="tin t-n" type="number" min="0" max="180" step="5" data-tj="ref" value="${+d.ref||0}"${j?'':' disabled'}${dis}></td><td class="mono t-r" data-l="Horas" data-tjh="${k}">${j?tJorH(j).toFixed(1):'No laborable'}</td></tr>`}).join('')}
    </tbody><tfoot><tr><td colspan="5"><b>Total semanal</b></td><td class="mono t-r"><b id="tjTot">${TDOW.reduce((s,[k])=>s+tJorH(c.jor[k]),0).toFixed(1)}</b></td></tr></tfoot></table></div></div>
   <div class="card"><div class="pad t-form">
    <label class="lqlab">Inicio del refrigerio<input class="tin" type="time" id="tjRefIni" value="${esc(c.refIni)}"${dis}></label>
    <label class="lqlab">Hora límite de envío del tareo<input class="tin" type="time" id="tjLim" value="${esc(c.limEnv)}"${dis}></label>
    <label class="lqlab">Tolerancia de garita (min)<input class="tin t-n" type="number" min="0" max="120" id="tjTol" value="${c.tolGar}"${dis}></label></div>
    ${ed?`<div class="pad"><button class="ib pri" id="tjSave">Guardar configuración</button></div>`:''}</div>
  </div></div>`;
  if(!ed)return;
  const read=()=>{const jor={};$$('[data-tjd]').forEach(r=>{const k=r.dataset.tjd;const on=r.querySelector('[data-tj="on"]').checked;
    jor[k]=on?{ini:r.querySelector('[data-tj="ini"]').value,fin:r.querySelector('[data-tj="fin"]').value,ref:Math.max(0,Math.round(+r.querySelector('[data-tj="ref"]').value||0))}:null});return jor};
  const upd=()=>{const jor=read();let t=0;for(const[k,j]of Object.entries(jor)){const h=tJorH(j);t+=h;const cell=main.querySelector(`[data-tjh="${k}"]`);if(cell)cell.textContent=j?h.toFixed(1):'No laborable';
      const r=main.querySelector(`[data-tjd="${k}"]`);r.querySelectorAll('[data-tj]:not([data-tj="on"])').forEach(x=>x.disabled=!j)}$('#tjTot').textContent=t.toFixed(1)};
  main.querySelector('.t-jor').oninput=upd;main.querySelector('.t-jor').onchange=upd;
  $('#tjSave').onclick=async()=>{const jor=read();for(const[k,j]of Object.entries(jor))if(j&&!(tJorH(j)>0)){toast(`Revisa la jornada del ${TDOW.find(x=>x[0]===k)[1].toLowerCase()}: el fin debe ser posterior al inicio.`);return}
    const d={jor,refIni:$('#tjRefIni').value||TCFG_DEF.refIni,limEnv:$('#tjLim').value||TCFG_DEF.limEnv,tolGar:Math.max(0,Math.round(+$('#tjTol').value||0)),...tStamp()};
    try{await fcol(TCOLS.tcfg).doc('main').set(d,{merge:true});toast('Configuración del tareo guardada.')}catch(err){toast('No se pudo guardar: '+(err.code||err.message))}}}
