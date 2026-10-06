"use strict";
/* LPS 911 · Módulo Tareo (fase 2): bandeja del asistente de tareo (rol tasis; también admin).
   Contrato en docs/ia/tareo.md («Contrato de F2»): revisión de un tareo (cotejo de firmas con la foto, hora de garita,
   corrección directa con motivo, marcar/quitar revisado, reabrir) y, en «Tareos del día», sin tareo, conflictos (un obrero en
   dos tareos) y no enviados. Correcciones de la auditoría F2: ver docs/ia/tareo.md («Correcciones de la auditoría F2 — revisión»).
   El jefe de producción (editor con tpub) edita como la oficina; los tareos por horas se revisan en una hoja tipo Excel (al final
   de este archivo; docs/ia/tareo.md «Jefe con edición completa y grilla tipo Excel»).
   La revisión es un espacio de trabajo a pantalla completa (#trWs) y permite pasar un obrero al tareo de otro capataz:
   ver docs/ia/tareo.md («Revisión en laptop (oct 2026)»). Corrección en grilla para los tareos por horas (modo:'hrs') y el
   arreglo del bug «No cambiaste nada»: docs/ia/tareo.md («Implementación de la grilla — oficina»).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* ---------- funciones puras ---------- */
const trNm=r=>r&&(r.ape||r.nom)?[r.ape,r.nom].filter(Boolean).join(', '):'';
const trHas=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const trSameSet=(a,b)=>{const A=[...new Set(Array.isArray(a)?a:[])].sort(),B=[...new Set(Array.isArray(b)?b:[])].sort();return A.length===B.length&&A.every((x,i)=>x===B[i])};
/* JSON con las claves ordenadas (para comparar versiones de un documento) */
const trStr=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,k2)=>(o[k2]=x[k2],o),{}):x);
/** cotejo vigente del tareo: {dni:{fir?, gar?}}. Solo vale `cot:{dni:{fir,gar,by,t}}` + `cotFot:[ids de fotos cotejadas]`:
    las firmas solo valen si cotFot son las fotos actuales (si el capataz cambió la foto, hay que cotejar de nuevo); la garita vale
    siempre. Segunda auditoría (A4, decisión del dueño): ya no se leen las firmas antiguas `rows[dni].fir/gar` (las podía escribir
    el capataz al crear el documento); un tareo sin `cot` vigente pide cotejar. */
function tCotDe(doc){const d=doc||{};const o={};if(!d.cot||typeof d.cot!=='object')return o;const fv=trSameSet(d.cotFot,d.foto);
  for(const[k,x]of Object.entries(d.cot)){if(!x||typeof x!=='object')continue;const y={};
    if(fv&&(x.fir===true||x.fir===false))y.fir=x.fir;if(typeof x.gar==='string'&&x.gar)y.gar=x.gar;if(trHas(y,'fir')||y.gar)o[k]=y}
  return o}
/** ¿hay firmas cotejadas que ya no valen porque cambiaron las fotos? */
const tCotVieja=d=>!!(d&&d.cot&&typeof d.cot==='object'&&!trSameSet(d.cotFot,d.foto)&&Object.values(d.cot).some(x=>x&&(x.fir===true||x.fir===false)));
/** copia del tareo con el cotejo puesto en rows[dni].fir/gar (como lo leen tObsRev y toStats); quita los fir/gar antiguos que no valen */
function tConCot(doc,cot){const d=doc||{};const C=cot||tCotDe(d);const rows={};
  for(const[k,r0]of Object.entries(d.rows||{})){const r={...r0};delete r.fir;delete r.gar;const c=C[k];if(c){if(trHas(c,'fir'))r.fir=c.fir;if(c.gar)r.gar=c.gar}rows[k]=r}
  return{...d,rows}}
/** obreros que figuran en más de un tareo del mismo día (presentes, con falta o sin marcar): un obrero va en un solo tareo por día
    (decisión del dueño). [{dni, nom, ts:[{id, cap, name, st, as}]}]. Lo usa F3 para no publicar con conflictos. */
function tConflictosDia(docs){const by=new Map();
  for(const t of docs||[]){if(!t||t.arch)continue;for(const[dni,r]of Object.entries(t.rows||{})){if(!r)continue;const L=by.get(dni)||[];
    L.push({id:t.id||'',cap:t.cap||'',name:t.capN||tCapName(t.cap)||t.cap||'',st:t.st||'bor',as:r.as===true?true:r.as===false?false:null,mot:r.mot||'',r});by.set(dni,L)}}
  return[...by].filter(([,L])=>L.length>1).map(([dni,L])=>({dni,nom:trNm((L.find(x=>x.as)||L[0]).r)||dni,ts:L.map(({r,...x})=>x)}))
    .sort((a,b)=>a.nom.localeCompare(b.nom)||a.dni.localeCompare(b.dni))}
const trAsTx=x=>x.as===true?'vino':x.as===false?`falta${x.mot?' '+x.mot:''}`:'sin marcar';
/** observaciones de la revisión: las de tValida (bloquean salvo las `warn`) más el cotejo de firmas, la garita y los conflictos del día.
    k: los de tValida · 'firp' firma sin cotejar (bloquea) · 'nofir' vino y no firmó · 'gar' salida en garita distinta ·
    'dup' figura también en otro tareo del día (bloquea). bl = bloquea. Lee el cotejo de rows[dni].fir/gar (ver tConCot).
    docs: tareos del día para los conflictos (por omisión, los de la vista abierta si el tareo está entre ellos). */
function tObsRev(doc,calc,docs){const d=doc||{};const c=calc&&!trOwnH(d)?calc:trCalc(d);const out=trValida(d).map(o=>({...o,bl:!o.warn}));const tol=TC().tolGar;
  for(const[dni,r]of Object.entries(c.rows||{})){if(!r.as)continue;const n=trNm(r)||dni;
    if(r.fir===false)out.push({dni,k:'nofir',bl:false,msg:`${n}: vino pero no firmó el formato.`});
    else if(r.fir!==true)out.push({dni,k:'firp',bl:true,msg:`${n}: falta cotejar su firma.`});
    const g=tMin(r.gar),f=tMin(r.fin);if(g!=null&&f!=null&&Math.abs(g-f)>tol)out.push({dni,k:'gar',bl:false,msg:`${n}: salida en garita distinta (garita ${r.gar}, tareo ${r.fin}).`})}
  if(docs===undefined&&d.id&&typeof TD!=='undefined'&&TD.docs.get(d.id))docs=[...TD.docs.values()];
  if(d.id&&docs)for(const x of tConflictosDia(docs.map(t=>t&&t.id===d.id?d:t))){if(!x.ts.some(y=>y.id===d.id))continue;
    const o=x.ts.filter(y=>y.id!==d.id).map(y=>`${y.name} (${trAsTx(y)})`).join(' y ');
    out.push({dni:x.dni,k:'dup',bl:true,msg:`${x.nom}: también figura en el tareo de ${o}. Un obrero va en un solo tareo por día.`})}
  return out}
/** obreros activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta), agrupados por capataz */
function tSinTareo(f,docs){const inT=new Set();for(const t of docs){if(!t||t.arch)continue;for(const k of Object.keys(t.rows||{}))inT.add(k)}
  const g=new Map();for(const p of tLive()){const k=p.dni||p.id;if(!tActivo(p,f)||inT.has(k))continue;const c=p.cap||'';const L=g.get(c)||[];L.push(p);g.set(c,L)}
  for(const L of g.values())L.sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||(a.dni||'').localeCompare(b.dni||''));
  return[...g].map(([cap,L])=>({cap,name:cap?tCapName(cap):'Sin capataz',L})).sort((a,b)=>(!a.cap)-(!b.cap)||a.name.localeCompare(b.name))}
/** ¿ya pasó la hora límite de envío para esa fecha? (días anteriores sí; hoy según TC().limEnv; no laborable no) */
function tLate(f){if(tNoLab(f))return false;const hoy=todayIso();if(f<hoy)return true;if(f>hoy)return false;return tHm(NOW())>=TC().limEnv}
/* ---------- tareo por horas («Contrato "horas por cantidad"», docs/ia/tareo.md) ---------- */
/** ¿tareo nuevo por cantidad de horas (modo:'hrs': pcs + rows[dni].h escritos a mano)? Los antiguos van por bloques (blq). */
const trHrs=d=>!!d&&d.modo==='hrs';
/* horas válidas de una celda: número > 0 (2 decimales) o 0 */
const trHv=v=>{const n=+v;return Number.isFinite(n)&&n>0?tR2(n):0};
/** total de horas de una fila (modo:'hrs'): usa tHrsTot (tareo.js) si existe */
const trHrsTot=r=>typeof tHrsTot==='function'?tHrsTot(r):tR2(Object.values((r&&r.h)||{}).reduce((s,v)=>s+trHv(v),0));
/** respaldo local de tCalc para modo:'hrs' (mientras tareo.js no lo implemente: se reconoce porque aún no existe tHrsTot).
    Presente: trab = suma de h, ext = max(0, trab − jornada) (no laborable: todo extra), ini = inicio de la jornada, fin = sal o
    estimado (ini + trab + refrigerio si lo cruza). Ausente o sin marcar: sin horas, pero conserva h (si vuelve a «vino» las recupera). */
function trCalcH(d){d=d||{};const D=tDia(d.date||todayIso(),d.cfg);const ini=D.j?D.j.ini:'';const a=tMin(ini);const rows={};
  for(const[dni,r0]of Object.entries(d.rows||{})){const r={...r0};const h={};for(const[pc,v]of Object.entries((r0&&r0.h)||{})){const n=trHv(v);if(n)h[pc]=n}r.h=h;
    if(r.as!==true){Object.assign(r,{ini:'',fin:'',trab:0,ext:0});rows[dni]=r;continue}
    const trab=tR2(Object.values(h).reduce((s,v)=>s+v,0));let fin='';
    if(typeof r.sal==='string'&&r.sal)fin=r.sal;else if(a!=null&&trab>0){let z=a+Math.round(trab*60);if(D.rw&&z>D.rw[0]&&a<D.rw[1])z+=D.rw[1]-Math.max(a,D.rw[0]);z=Math.min(z,1439);
      fin=String(Math.floor(z/60)).padStart(2,'0')+':'+String(z%60).padStart(2,'0')}
    Object.assign(r,{ini:a!=null&&trab>0?ini:'',fin,trab,ext:D.nl?trab:tR2(Math.max(0,trab-D.jh))});rows[dni]=r}
  return{...d,rows}}
/** respaldo local de tValida para modo:'hrs' (mismos k que el contrato: vacio, pcs, marca, sinh, max, bloq, parcial (warn), foto) */
function trValidaH(d){d=d||{};const out=[];const D=tDia(d.date||todayIso(),d.cfg);const rows=d.rows||{};const pcs=Array.isArray(d.pcs)?d.pcs:[];const bl=new Set();
  const nm=dni=>trNm(rows[dni])||dni;
  if(!Object.keys(rows).length)out.push({dni:null,k:'vacio',msg:'No hay obreros en el tareo: agrega a tu cuadrilla.'});
  if(!pcs.length&&Object.values(rows).some(r=>r&&r.as===true))out.push({dni:null,k:'pcs',msg:'No hay trabajos (partidas) del día: agrega al menos uno.'});
  for(const[dni,r]of Object.entries(rows)){if(!r)continue;
    if(r.as!==true&&r.as!==false){out.push({dni,k:'marca',msg:`Falta marcar si vino: ${r.ape||nm(dni)}`});continue}
    if(!r.as)continue;
    for(const[pc,v]of Object.entries(r.h||{})){if(!trHv(v)||bl.has(pc))continue;const p=S.tpc.get(pc);if(p&&p.bloq===true){bl.add(pc);out.push({dni:null,k:'bloq',msg:`La partida ${p.cod} está bloqueada por costos.`})}}
    const t=trHrsTot(r);
    if(!t){out.push({dni,k:'sinh',msg:`${nm(dni)}: vino pero no tiene horas. Pon sus horas o márcalo como falta.`});continue}
    if(t>16){out.push({dni,k:'max',msg:`${nm(dni)}: ${tHtxt(t)} h en el día. Revisa la digitación (máximo 16).`});continue}
    if(!D.nl&&D.jh>0&&t<D.jh)out.push({dni,k:'parcial',warn:true,msg:`Jornada parcial: ${r.ape||nm(dni)} ${tHtxt(t)} h de ${tHtxt(D.jh)}`})}
  if(!(Array.isArray(d.foto)&&d.foto.length))out.push({dni:null,k:'foto',msg:'Falta la foto del formato firmado.'});
  return out}
/** cálculo y validación para la oficina: tCalc/tValida (tareo.js); para modo:'hrs', el respaldo local si tareo.js aún no lo sabe */
const trOwnH=d=>trHrs(d)&&typeof tHrsTot!=='function';
const trCalc=d=>trOwnH(d)?trCalcH(d):tCalc(d);
const trValida=d=>trOwnH(d)?trValidaH(d):tValida(d);
const trAsW=v=>v===true?'vino':v===false?'faltó':'sin marcar';
/** resumen corto de lo que cambió una corrección (para hist.cam). Vale para los dos modos (bloques y horas). */
function tCam(a,b){const o=[];const pc=x=>{const p=x&&S.tpc.get(x);return p?p.cod:(x||'sin partida')};
  const ra=a.rows||{},rb=b.rows||{};const nm=d=>((rb[d]||ra[d]||{}).ape||d);const hrs=trHrs(a)||trHrs(b);
  if(hrs){const pa=Array.isArray(a.pcs)?a.pcs:[],pb=Array.isArray(b.pcs)?b.pcs:[];for(const p of pb)if(!pa.includes(p))o.push(`+ partida ${pc(p)}`);for(const p of pa)if(!pb.includes(p))o.push(`− partida ${pc(p)}`)}
  const A=new Map((a.blq||[]).filter(Boolean).map(x=>[x.id,x])),B=new Map((b.blq||[]).filter(Boolean).map(x=>[x.id,x]));
  for(const[id,x]of B){const y=A.get(id);const lb=`${pc(x.pc)} ${x.ini}–${x.fin}`;
    if(!y){o.push(`+ bloque ${lb} (${(x.dnis||[]).length})`);continue}
    const ch=[];if(y.pc!==x.pc)ch.push(`partida ${pc(y.pc)} → ${pc(x.pc)}`);if(y.ini!==x.ini||y.fin!==x.fin)ch.push(`${y.ini}–${y.fin} → ${x.ini}–${x.fin}`);
    const ya=new Set(y.dnis||[]),xa=new Set(x.dnis||[]);const add=[...xa].filter(d=>!ya.has(d)),rm=[...ya].filter(d=>!xa.has(d));
    if(add.length)ch.push('+'+add.map(nm).join(', +'));if(rm.length)ch.push('−'+rm.map(nm).join(', −'));
    if(ch.length)o.push(`bloque ${pc(y.pc)}: ${ch.join('; ')}`)}
  for(const[id,y]of A)if(!B.has(id))o.push(`− bloque ${pc(y.pc)} ${y.ini}–${y.fin}`);
  for(const d of Object.keys(rb)){const x=rb[d]||{},y=ra[d]||{};const xa=trAs(x.as),ya=trAs(y.as);
    /* vino / no vino / sin marcar (los tres estados: «sin marcar → no vino» también es un cambio) */
    if(xa!==ya)o.push(`${nm(d)}: ${xa===false?'faltó ('+(x.mot||'sin motivo')+')':trAsW(xa)}`);else if(xa===false&&(x.mot||'')!==(y.mot||''))o.push(`${nm(d)}: motivo ${y.mot||'—'} → ${x.mot||'—'}`);
    if(xa===true&&!!x.alt!==!!y.alt)o.push(`${nm(d)}: altura ${x.alt?'sí':'no'}`);
    if(hrs){for(const p of new Set([...Object.keys(y.h||{}),...Object.keys(x.h||{})])){const va=trHv((y.h||{})[p]),vb=trHv((x.h||{})[p]);if(va!==vb)o.push(`${nm(d)} ${pc(p)}: ${tHtxt(va)} → ${tHtxt(vb)} h`)}
      if((x.sal||'')!==(y.sal||''))o.push(`${nm(d)}: salida ${y.sal||'—'} → ${x.sal||'—'}`)}}
  for(const d of Object.keys(ra))if(!rb[d])o.push(`− ${nm(d)} (quitado del tareo)`);
  const s=o.join('; ');return s.length>400?s.slice(0,397)+'…':s}
/** detalle estructurado de una corrección (hist.det): [{dni?|blq?|pc?, campo, antes, despues}], máx. 50 (tDetAll: todos).
    campo: 'bloque' (alta/baja: «pc ini–fin»), 'pc', 'ini', 'fin', 'obrero' (en el bloque: true/false), 'fila' (en el tareo), 'as', 'mot', 'alt';
    modo:'hrs': 'pcs' (partida del día agregada/quitada: {pc, antes, despues} booleanos), 'h' ({dni, pc, antes, despues} horas o null), 'sal'. */
const tDet=(a,b)=>tDetAll(a,b).slice(0,50);
function tDetAll(a,b){const o=[];const ra=a.rows||{},rb=b.rows||{};const nv=x=>x==null||x===''?null:x;const bs=x=>`${x.pc||''} ${x.ini||''}–${x.fin||''}`;const hrs=trHrs(a)||trHrs(b);
  if(hrs){const pa=Array.isArray(a.pcs)?a.pcs:[],pb=Array.isArray(b.pcs)?b.pcs:[];for(const p of pb)if(!pa.includes(p))o.push({pc:p,campo:'pcs',antes:false,despues:true});for(const p of pa)if(!pb.includes(p))o.push({pc:p,campo:'pcs',antes:true,despues:false})}
  const A=new Map((a.blq||[]).filter(Boolean).map(x=>[x.id,x])),B=new Map((b.blq||[]).filter(Boolean).map(x=>[x.id,x]));
  for(const[id,x]of B){const y=A.get(id);if(!y){o.push({blq:id||'',campo:'bloque',antes:null,despues:bs(x)});continue}
    for(const f of['pc','ini','fin'])if(nv(y[f])!==nv(x[f]))o.push({blq:id||'',campo:f,antes:nv(y[f]),despues:nv(x[f])});
    const ya=new Set(y.dnis||[]),xa=new Set(x.dnis||[]);
    for(const d of xa)if(!ya.has(d))o.push({blq:id||'',dni:d,campo:'obrero',antes:false,despues:true});
    for(const d of ya)if(!xa.has(d))o.push({blq:id||'',dni:d,campo:'obrero',antes:true,despues:false})}
  for(const[id,y]of A)if(!B.has(id))o.push({blq:id||'',campo:'bloque',antes:bs(y),despues:null});
  for(const d of new Set([...Object.keys(ra),...Object.keys(rb)])){const x=rb[d],y=ra[d];
    if(!x||!y){o.push({dni:d,campo:'fila',antes:!!y,despues:!!x});continue}
    const as=v=>v===true?true:v===false?false:null;if(as(y.as)!==as(x.as))o.push({dni:d,campo:'as',antes:as(y.as),despues:as(x.as)});
    if(nv(y.mot)!==nv(x.mot))o.push({dni:d,campo:'mot',antes:nv(y.mot),despues:nv(x.mot)});
    if(!!y.alt!==!!x.alt)o.push({dni:d,campo:'alt',antes:!!y.alt,despues:!!x.alt});
    if(hrs){for(const p of new Set([...Object.keys(y.h||{}),...Object.keys(x.h||{})])){const va=trHv((y.h||{})[p]),vb=trHv((x.h||{})[p]);if(va!==vb)o.push({dni:d,pc:p,campo:'h',antes:va||null,despues:vb||null})}
      if(nv(y.sal)!==nv(x.sal))o.push({dni:d,campo:'sal',antes:nv(y.sal),despues:nv(x.sal)})}}
  return o}
/* quita los undefined (Firestore no los acepta) */
function trClean(rows){const o={};for(const[d,r]of Object.entries(rows||{})){const x={};for(const[k,v]of Object.entries(r||{}))if(v!==undefined)x[k]=v;o[d]=x}return o}
/** versión de lo que ve la oficina (para saber si otro usuario cambió el tareo): estado, obreros (vino/motivo/altura), bloques,
    fotos y, con cc, el cotejo vigente. No cuenta hist, by, ts ni lo calculado. */
function trSig(d,cc){d=d||{};const hrs=trHrs(d);const R={};for(const[k,r]of Object.entries(d.rows||{})){R[k]=[r&&r.as===true?1:r&&r.as===false?0:null,(r&&r.mot)||'',!!(r&&r.alt)];
    /* modo:'hrs': las horas por partida y la salida las escribe el capataz (no son calculadas) */
    if(hrs)R[k].push((r&&typeof r.sal==='string'&&r.sal)||'',Object.entries((r&&r.h)||{}).map(([p,v])=>[p,trHv(v)]).filter(x=>x[1]).sort((x,y)=>x[0].localeCompare(y[0])))}
  const o={st:d.st||'bor',rows:R,blq:(Array.isArray(d.blq)?d.blq:[]).map(b=>b?[b.id||'',b.pc||'',b.ini||'',b.fin||'',Array.isArray(b.dnis)?b.dnis:[]]:null),foto:Array.isArray(d.foto)?d.foto:[]};
  if(hrs){o.modo='hrs';o.pcs=Array.isArray(d.pcs)?d.pcs:[]}
  if(cc)o.cot=tCotDe(d);return trStr(o)}

/** ciclo de la evidencia que se coteja (segunda auditoría, A2): fotos + número de envío (envN; si no existe, envAt). Un cotejo
    hecho en pantalla solo se guarda sobre el mismo ciclo: si el capataz reenvió (aunque sea con la misma foto) o cambió las fotos,
    las marcas sin guardar se descartan y hay que cotejar de nuevo. */
const trCyc=d=>{d=d||{};return trStr({f:[...new Set(Array.isArray(d.foto)?d.foto:[])].sort(),n:d.envN==null?null:d.envN,at:d.envAt==null?null:d.envAt})};
/** ¿están cargadas todas las fotos del tareo? (A7: sin la evidencia vigente a la vista no se marcan firmas) */
const trFotosOk=t=>((t&&t.foto)||[]).every(f=>TD.fotos.has(f));

/* ---------- estado de la revisión abierta ---------- */
/* id: tareo abierto · fir/gar: cotejo en edición (empieza con el vigente, tCotDe) · b: el cotejo tal como se abrió (para escribir
   solo lo que cambió) · sig: versión del tareo que se ve (trSig con cotejo) · dirty: hay cotejo sin guardar ·
   ed: corrección en curso (trEdOpen: su propia copia base del tareo; edSig: versión de esa base) · visor de la foto (fi foto, z zoom,
   rot giro, fsig fotos dibujadas) · ord: orden de la lista al abrir (para «anterior · siguiente») · op: bloques/historial abiertos ·
   want: tareo a reabrir tras recargar · cyc: ciclo de la evidencia sobre la que se coteja (trCyc) · conf: hubo un conflicto
   ('ed' corrección, 'cot' cotejo/revisado): muestra «Recargar versión actual» · nota: aviso de que se descartó el cotejo sin guardar
   porque cambió la evidencia · pend: el panel derecho espera para redibujarse (se está escribiendo en una celda del editor) */
/* foto a la vista en la hoja: lo último que eligió en este equipo; si nunca eligió, visible para el asistente (coteja) y plegada
   para el jefe y el admin (revisan horas) */
function trFoLs(){try{const v=localStorage.getItem('lps.trfo');if(v==='0'||v==='1')return v==='1'}catch(e){}return!!(typeof me!=='undefined'&&me&&me.role==='tasis')}
const TR={id:'',fir:{},gar:{},b:{fir:{},gar:{}},sig:'',dirty:false,ed:null,edSig:'',fi:0,z:1,rot:0,busy:false,fsig:'',ord:[],op:{blq:true,hist:false},want:'',ro:null,cyc:'',conf:'',nota:'',pend:false,
  /* hoja (tareos por horas): pfo = foto a la vista (panel lateral plegable; se recuerda en el equipo) · want2: ya no se usa
     (antes, modo de la revisión de producción; se conserva para tpbAbrir) */
  sel:null,pfo:null,want2:''};
/* edita la oficina: asistente, administrador y jefe de producción (editor con tpub): toReabOk (tareo.js) los incluye a los tres */
const trEdOk=()=>toReabOk();
/** ¿el tareo se revisa en la hoja tipo Excel? (por horas, «Enviado» o «Revisado», y quien lo abre edita) */
const trGx=t=>!!t&&trHrs(t)&&trEdOk()&&['env','rev'].includes(t.st);
const TR_CHG='Otro usuario cambió este tareo mientras trabajabas: usa «Recargar versión actual».';
const TR_CYC='El capataz reenvió el tareo o cambió las fotos después de que cotejaste: se descartaron las firmas que marcaste sin guardar. Vuelve a cotejar con el formato actual.';
function trInit(t){const C=tCotDe(t);TR.fir={};TR.gar={};for(const[d,x]of Object.entries(C)){if(trHas(x,'fir'))TR.fir[d]=x.fir;if(x.gar)TR.gar[d]=x.gar}
  TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.sig=trSig(t,true);TR.cyc=trCyc(t);TR.dirty=false}
/* error de la transacción porque cambió el ciclo de la evidencia (A2) */
const trCycErr=()=>Object.assign(new Error(TR_CYC),{cyc:true});
/* descarta el cotejo sin guardar (cambió la evidencia) y avisa */
function trCycDrop(t){trInit(t||TD.docs.get(TR.id)||{});TR.nota=TR_CYC}
/* ---------- corrección: estado del editor, su base y sus cambios (bug «No cambiaste nada», oct 2026) ----------
   El editor guarda su PROPIA copia base del tareo (TR.ed.base, la versión que se abrió) y los cambios se calculan siempre contra
   ella (trEdPatch), nunca contra TD.docs (que cambia con cada foto de la base o, tras guardar, puede llegar atrasada). Al guardar,
   la transacción compara la versión base con el documento actual y aplica solo los cambios (trEdApply). «Recargar versión actual»
   vuelve a aplicar los cambios sobre la versión nueva (trEdRebase): no se pierden. */
/** estado editable de un tareo: {hrs, rows:{dni:{as, mot, alt, sal?, h?}}, blq? | pcs?} (ids de bloque estables: los sin id → 'i'+n) */
function trEdState(t){t=t||{};const hrs=trHrs(t);const rows={};
  for(const[d,r]of Object.entries(t.rows||{})){if(!r)continue;const x={as:trAs(r.as),mot:r.mot||'',alt:!!r.alt,nw:trNw(r)};
    if(hrs){x.sal=typeof r.sal==='string'?r.sal:'';x.h={};for(const[pc,v]of Object.entries(r.h||{})){const n=trHv(v);if(n)x.h[pc]=n}}rows[d]=x}
  const o={hrs,rows};
  if(hrs)o.pcs=[...new Set((Array.isArray(t.pcs)?t.pcs:[]).filter(Boolean))];
  else o.blq=(Array.isArray(t.blq)?t.blq:[]).map((x,i)=>x?{id:x.id||'i'+i,pc:x.pc||'',ini:x.ini||'',fin:x.fin||'',dnis:Array.isArray(x.dnis)?x.dnis.slice():[]}:null).filter(Boolean);
  return o}
/* datos de la ficha que lleva la fila (para una fila agregada desde la hoja: 'ra') */
const trNw=r=>{const o={ape:r.ape||'',nom:r.nom||'',cat:r.cat||'',cua:r.cua||''};if(r.ajeno)o.ajeno=true;if(r.ajeno||r.capOrig!=null)o.capOrig=r.capOrig||'';return o};
/* editor de «Corregir» con los datos del tareo t (copia base propia y su versión). g: la hoja tipo Excel (siempre abierta en los
   tareos por horas). Abrirlo (o reabrirlo sobre una versión nueva) vacía el deshacer de la hoja. */
function trEdOpen(t,g){const base=clone(t)||{};TR.edSig=trSig(base,false);TR.ed={...trEdState(base),base,sig:TR.edSig,g:!!g};TR.pend=false;if(typeof TX!=='undefined'){TX.un=[];TX.re=[]}}
/** cambios del editor respecto de su base: [{k:'r', d, f, v} fila (as/mot/alt/sal) · {k:'h', d, pc, v} horas · {k:'pa'|'pd', pc}
    partida del día agregada/quitada · {k:'ra', d, row} obrero agregado · {k:'rd', d} obrero quitado · {k:'ba', b} {k:'bd', id}
    {k:'bs', id, f, v} bloque agregado/quitado/cambiado] */
function trEdPatch(e){e=e||TR.ed;if(!e)return[];const B=trEdState(e.base);const P=[];
  for(const d of Object.keys(B.rows))if(!e.rows[d])P.push({k:'rd',d});
  for(const[d,x]of Object.entries(e.rows)){const y=B.rows[d];
    if(!y){const row={...(x.nw||{}),as:x.as,mot:x.mot||'',alt:!!x.alt,h:{...(x.h||{})}};delete row.i;if(x.sal)row.sal=x.sal;P.push({k:'ra',d,row});continue}
    for(const f of e.hrs?['as','mot','alt','sal']:['as','mot','alt'])if(x[f]!==y[f])P.push({k:'r',d,f,v:x[f]});
    if(e.hrs)for(const pc of new Set([...Object.keys(y.h),...Object.keys(x.h)]))if((x.h[pc]||0)!==(y.h[pc]||0))P.push({k:'h',d,pc,v:x.h[pc]||0})}
  if(e.hrs){for(const pc of e.pcs)if(!B.pcs.includes(pc))P.push({k:'pa',pc});for(const pc of B.pcs)if(!e.pcs.includes(pc))P.push({k:'pd',pc})}
  else{const A=new Map(B.blq.map(b=>[b.id,b]));const ids=new Set(e.blq.map(b=>b.id));
    for(const b of e.blq){const y=A.get(b.id);if(!y){P.push({k:'ba',b:clone(b)});continue}
      for(const f of['pc','ini','fin'])if(b[f]!==y[f])P.push({k:'bs',id:b.id,f,v:b[f]});
      if(!trSameSet(b.dnis,y.dnis))P.push({k:'bs',id:b.id,f:'dnis',v:b.dnis.slice()})}
    for(const y of B.blq)if(!ids.has(y.id))P.push({k:'bd',id:y.id})}
  return P}
/** el tareo t con los cambios P aplicados (puro). Solo toca lo que cambió el asistente: el resto queda como está en t. */
function trEdApply(t,P){t=t||{};const hrs=trHrs(t);const rows={};for(const[d,r]of Object.entries(t.rows||{}))rows[d]=r?{...r,...(r.h?{h:{...r.h}}:{})}:r;
  let pcs=hrs?(Array.isArray(t.pcs)?t.pcs.slice():[]):null;
  let blq=(Array.isArray(t.blq)?t.blq:[]).map((b,i)=>b?{...b,id:b.id||'i'+i,dnis:Array.isArray(b.dnis)?b.dnis.slice():[]}:null).filter(Boolean);
  for(const p of P||[]){if(p.k==='ra'){if(!rows[p.d])rows[p.d]=clone(p.row);continue}if(p.k==='rd'){delete rows[p.d];continue}
    const r=p.d!=null?rows[p.d]:null;
    if(p.k==='r'){if(!r)continue;if(p.f==='sal'&&!p.v)delete r.sal;else r[p.f]=p.v}
    else if(p.k==='h'){if(!r)continue;const h=r.h=r.h&&typeof r.h==='object'?r.h:{};if(p.v)h[p.pc]=p.v;else delete h[p.pc]}
    else if(p.k==='pa'){if(pcs&&!pcs.includes(p.pc))pcs.push(p.pc)}
    else if(p.k==='pd'){if(pcs)pcs=pcs.filter(x=>x!==p.pc)}
    else if(p.k==='ba'){if(!blq.some(b=>b.id===p.b.id))blq.push(clone(p.b))}
    else if(p.k==='bd')blq=blq.filter(b=>b.id!==p.id);
    else if(p.k==='bs'){const b=blq.find(x=>x.id===p.id);if(b)b[p.f]=Array.isArray(p.v)?p.v.slice():p.v}}
  const o={...t,rows};if(hrs)o.pcs=pcs;else o.blq=blq;return o}
/** n.º de cambios de la corrección en curso (0 = nada que guardar ni que preguntar al salir) */
const trEdN=()=>TR.ed?trEdPatch(TR.ed).length:0;
/** el tareo como quedaría con la corrección en curso (sobre la base del editor) */
const trEdCur=()=>trEdApply(TR.ed.base,trEdPatch(TR.ed));
/** vuelve a abrir el editor sobre la versión t y le aplica los cambios que había: → n.º de cambios conservados */
function trEdRebase(t){const P=trEdPatch(TR.ed);trEdOpen(t,TR.ed&&TR.ed.g);if(P.length){const s=trEdState(trEdApply(TR.ed.base,P));TR.ed.rows=s.rows;if(s.hrs)TR.ed.pcs=s.pcs;else TR.ed.blq=s.blq}return trEdN()}
/** «Recargar versión actual» (A3): tras un conflicto, vuelve a leer el tareo y reinicia la versión base. Si se estaba corrigiendo,
    reabre el editor con los datos nuevos y le vuelve a aplicar los cambios del asistente (no se pierden). El cotejo sin guardar
    sí se descarta (avisa antes). */
async function trReload(id){if(TR.busy)return;
  if(TR.dirty&&!await uiAsk({title:'¿Recargar la versión actual?',text:'Se descarta el cotejo de firmas que no guardaste y se carga el tareo como está ahora.',ok:'Recargar',cancel:'Seguir aquí',tone:'warn'}))return;
  let t=null;try{const s=await fcol('tareo').doc(id).get();if(s.exists)t={...s.data(),id}}catch(e){}
  t=t||TD.docs.get(id);if(!t||TR.id!==id)return;if(TD.docs.has(id))TD.docs.set(id,t);
  let n=0;if(TR.ed&&['env','rev'].includes(t.st))n=trEdRebase(t);else TR.ed=null;
  trInit(t);TR.conf='';TR.nota='';trDraw(true);
  toast(n?`Se cargó la versión actual. Se mantienen tus ${n} ${n===1?'cambio':'cambios'}: revísalos y guarda.`:'Se cargó la versión actual del tareo.')}
/** cambios del cotejo respecto de como se abrió: [[dni,'fir'|'gar']] */
function trCotCh(){const o=[];for(const f of['fir','gar']){const A=TR.b[f],B=TR[f];for(const d of new Set([...Object.keys(A),...Object.keys(B)]))if(A[d]!==B[d])o.push([d,f])}return o}
const trDirty=()=>{TR.dirty=trCotCh().length>0};
/** filas con el cotejo en edición aplicado */
function trRows(rows){const o={};for(const[d,r0]of Object.entries(rows||{})){const r={...r0};
  if(trHas(TR.fir,d))r.fir=TR.fir[d];else delete r.fir;if(TR.gar[d])r.gar=TR.gar[d];else delete r.gar;o[d]=r}return o}
/** resumen del cotejo guardado (hist.cam) */
function trCotCam(R,ch){let si=0;const no=[],qu=[],gar=[];const nm=d=>(R[d]&&R[d].ape)||d;
  for(const[d,f]of ch){if(f==='fir'){const v=TR.fir[d];if(v===true)si++;else if(v===false)no.push(nm(d));else qu.push(nm(d))}else gar.push(`${nm(d)} ${TR.gar[d]||'—'}`)}
  const o=[];if(si)o.push(`firmaron ${si}`);if(no.length)o.push(`no firmó: ${no.join(', ')}`);if(qu.length)o.push(`sin cotejar: ${qu.join(', ')}`);if(gar.length)o.push(`garita: ${gar.join(', ')}`);
  const s=o.join('; ');return s.length>400?s.slice(0,397)+'…':s}
/** escritura del cotejo sobre el documento actual: solo las entradas que cambió el asistente (rutas cot.<dni>.fir|gar), así no pisa
    lo que otro guardó en otras filas. Si el tareo aún no tiene `cot` (antiguo) o cambiaron las fotos, se escribe el cotejo entero
    (vigente + cambios) con cotFot = fotos actuales. → {up, cot (resultado), cotFot, n} */
function trCotUp(cur){const ch=trCotCh();const C=clone(tCotDe(cur));const up={};const cotFot=(Array.isArray(cur.foto)?cur.foto:[]).slice();
  if(!ch.length)return{up,cot:C,cotFot:cur.cotFot,n:0};
  const by=me.email||me.id||'',t=NOW();const full=!(cur.cot&&typeof cur.cot==='object')||!trSameSet(cur.cotFot,cur.foto);
  for(const[d,f]of ch){const v=f==='fir'?(trHas(TR.fir,d)?TR.fir[d]:undefined):(TR.gar[d]||undefined);const x=C[d]=C[d]||{};if(v===undefined)delete x[f];else x[f]=v;x.by=by;x.t=t;
    if(!full){up[`cot.${d}.${f}`]=v===undefined?trDel():v;up[`cot.${d}.by`]=by;up[`cot.${d}.t`]=t}}
  if(full){const o={};for(const[d,x]of Object.entries(C)){if(!trHas(x,'fir')&&!x.gar)continue;const y={};if(trHas(x,'fir'))y.fir=x.fir;if(x.gar)y.gar=x.gar;if(x.by)y.by=x.by;if(x.t)y.t=x.t;o[d]=y}
    up.cot=o;up.cotFot=cotFot}
  return{up,cot:C,cotFot:full?cotFot:cur.cotFot,n:ch.length}}
const trHist=(a,x)=>({t:NOW(),by:me.email||me.id||'',a,...x});
/* valores especiales de Firestore que usa la oficina: se anotan para poder aplicar el update también en la vista local (trApply) */
const TR_FV=new WeakMap();
const trDel=()=>{const v=firebase.firestore.FieldValue.delete();try{TR_FV.set(v,{del:true})}catch(e){}return v};
const trAU=(...x)=>{const v=firebase.firestore.FieldValue.arrayUnion(...x);try{TR_FV.set(v,{au:x})}catch(e){}return v};
/** el documento tal como queda tras un update (rutas con punto, trDel, trAU). Puro. */
function trApply(cur,up){const d=clone(cur)||{};
  for(const[k,v]of Object.entries(up||{})){const P=k.split('.');let o=d;for(let i=0;i<P.length-1;i++){if(!o[P[i]]||typeof o[P[i]]!=='object')o[P[i]]={};o=o[P[i]]}
    const f=P[P.length-1];const m=v&&typeof v==='object'?TR_FV.get(v):null;
    if(m&&m.del)delete o[f];else if(m&&m.au){const a=Array.isArray(o[f])?o[f]:[];o[f]=a.concat(m.au.filter(x=>!a.some(y=>trStr(y)===trStr(x))))}else o[f]=clone(v)}
  return d}
/** tras escribir, la vista local toma el resultado al momento (sin esperar la foto de la base, que en Firestore llega después de la
    transacción): así no se ve la versión vieja ni se abre «Corregir» sobre ella (causa del bug «No cambiaste nada»). Solo si la
    vista aún muestra la versión que se leyó (si ya llegó otra más nueva, no la pisa). */
function trLocal(id,cur,up){try{const o=TD.docs.get(id);if(!o||!cur||!up)return;const n={...trApply(cur,up),id};
    if(trSig(o,true)!==trSig(cur,true)&&trSig(o,true)!==trSig(n,true))return;TD.docs.set(id,n);if(toAct())requestRender()}catch(e){}}
/* escritura con transacción: fn(doc actual) → objeto de update, o lanza un Error con el motivo para el usuario */
async function trTx(id,fn){const ref=fcol('tareo').doc(id);let cur=null,up=null;
  await(db||FDB).runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new Error('El tareo ya no existe.');cur={...s.data(),id};up=fn(cur);tx.update(ref,up);return true});
  trLocal(id,cur,up);return true}
const trErr=(p,e)=>toast(p+(e&&(e.code?e.code:e.message)||''));
/** lo que agrega toda corrección de la oficina: un revisado vuelve a «Enviado» (decisión del dueño) y, si el tareo aún no tiene
    su jornada congelada (doc.cfg), se guarda la del día (tCfgDia, tareo.js) */
function trCorExtra(cur){const o={};
  if(cur.st==='rev')Object.assign(o,{st:'env',revAt:trDel(),revBy:trDel()});
  if(!cur.cfg&&typeof tCfgDia==='function'){const c=tCfgDia(cur.date);if(c)o.cfg=c}
  return o}

/* ---------- espacio de revisión (pantalla completa, «Revisión en laptop», docs/ia/tareo.md) ---------- */
/* #trWs: capa fija sobre toda la app, fuera de <main> (el render() de la app no la toca). Se dibuja por partes: el encabezado
   (#trHead) y el panel derecho (#trRight) con cada cambio; el visor de la foto (#trFoto) solo cuando cambian las fotos o la
   foto elegida (no se pierden el zoom ni la posición). TR.id = tareo abierto; sessionStorage 'lps.trws' {id, f} lo vuelve a
   abrir si se recarga la página. */
const TR_SS='lps.trws';
function trSsSet(v){try{if(v)sessionStorage.setItem(TR_SS,JSON.stringify(v));else sessionStorage.removeItem(TR_SS)}catch(e){}}
try{const s=JSON.parse(sessionStorage.getItem(TR_SS)||'null');if(s&&typeof s.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.f||'')){TD.f=s.f;TR.want=s.id}}catch(e){}
/* el mismo filtro que la lista de «Tareos del día» (renderTDia) */
const trFltOk=x=>!!x.t&&(TD.flt==='all'||!['rev','obs','ok'].includes(TD.flt)||(TD.flt==='rev'?x.t.st==='env':TD.flt==='obs'?x.s.obs.length>0:['rev','pub'].includes(x.t.st)));
const trOrdNow=()=>toList(TD.f).filter(trFltOk).map(x=>x.id);
/** vecino en el orden de la lista tal como estaba al abrir (dir −1 / +1); '' si no hay */
function trNb(dir){const L=TR.ord.filter(x=>x===TR.id||TD.docs.has(x));const i=L.indexOf(TR.id);if(i<0)return'';const j=i+dir;return j>=0&&j<L.length?L[j]:''}
const trCapOf=id=>{const x=TD.docs.get(id);return x?(x.capN||tCapName(x.cap)||x.cap||''):''};
/** abre la revisión (desde la lista: toma el orden de la lista; nav: viene de «anterior · siguiente») */
function toDetalle(id,nav){const t=TD.docs.get(id);if(!t)return;/* 3.er argumento (modo de la revisión de producción): ya no existe */
  if(!nav||!TR.ord.length)TR.ord=trOrdNow();if(!TR.ord.includes(id))TR.ord.push(id);
  const nuevo=!$('#trWs');
  if(TR.id!==id){Object.assign(TR,{id,ed:null,fi:0,z:1,rot:0,busy:false,fsig:'',conf:'',nota:'',pend:false,sel:null});txReset();trInit(t)}
  for(const f of t.foto||[])TD.fErr.delete(f);/* al abrir se reintenta la foto que no cargó */
  trSsSet({id,f:t.date||TD.f});trDraw();if(nuevo){const b=$('#trBack');if(b)b.focus()}}
/* al llegar datos: reabre la revisión tras recargar (TR.want) o refresca la abierta (sin pisar el cotejo o la corrección en curso) */
function trSync(){if(!TR.id){if(TR.want&&TD.ok){const w=TR.want;TR.want='';if(TD.docs.has(w)&&toAct())toDetalle(w,false);else trSsSet(null);TR.want2=''}return}
  if(!$('#trWs'))return;const t=TD.docs.get(TR.id);if(!t){trClose();toast('Ese tareo ya no está en la lista del día.');return}
  if(TR.dirty&&trCyc(t)!==TR.cyc){trCycDrop(t);toast(TR_CYC)}
  if(!TR.dirty&&(!TR.ed||TR.ed.g)){trInit(t);if(TR.conf==='cot')TR.conf=''}
  /* hoja sin cambios: toma la versión nueva en silencio (no hay nada que perder) */
  if(TR.ed&&TR.ed.g&&!TR.busy&&trSig(t,false)!==TR.ed.sig&&!trEdN()){trEdOpen(t,true);if(TR.conf==='ed')TR.conf=''}
  /* corrigiendo: si el tareo cambió desde que se abrió el editor, avisa ya (no al guardar) con «Recargar versión actual» */
  if(TR.ed&&!TR.busy&&trSig(t,false)!==TR.ed.sig)TR.conf='ed';
  trDraw()}
/** ventana de tres opciones para salir con cambios sin guardar → 'save' | 'discard' | 'stay' (Esc o clic afuera = 'stay') */
function trAsk3(o){return new Promise(res=>{const old=$('#trAsk3');if(old)old.remove();const ae=document.activeElement;
  const el=document.createElement('div');el.className='uask';el.id='trAsk3';
  el.innerHTML=`<div class="uac t-warn" role="alertdialog" aria-modal="true" aria-labelledby="trA3t" aria-describedby="trA3x"><div class="uah"><i aria-hidden="true">!</i><b id="trA3t">${esc(o.title)}</b></div>
    <div class="uat" id="trA3x">${esc(o.text||'')}</div>
    <div class="uab tr-a3"><button class="ib" data-l3="stay">Seguir editando</button><button class="ib tr-a3d" data-l3="discard">Descartar</button><button class="ib pri" data-l3="save">${esc(o.save||'Guardar')}</button></div></div>`;
  const kd=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done('stay')}else if(e.key==='Tab'){e.stopPropagation();trTrap(e,el.querySelector('.uac'))}};
  const done=v=>{el.remove();document.removeEventListener('keydown',kd,true);if(v==='stay'&&ae&&ae.isConnected)try{ae.focus()}catch(e){}res(v)};
  el.addEventListener('click',e=>{const b=e.target.closest('[data-l3]');if(b)done(b.dataset.l3);else if(e.target===el)done('stay')});
  document.body.appendChild(el);document.addEventListener('keydown',kd,true);el.querySelector('[data-l3="save"]').focus()})}
/* salir o cambiar de tareo: sin cambios no pregunta nada; con una corrección o un cotejo sin guardar ofrece guardar, descartar o
   seguir editando (y si se elige guardar y no se pudo, no sale) */
async function trLeave(fn){const id=TR.id;
  if(TR.ed){if(TX.ing)txCommit(null);const n=trEdN();if(n){const g=TR.ed.g;const r=await trAsk3({title:g?'Tienes cambios sin guardar en la hoja':'Tienes una corrección sin guardar',text:`${n} ${n===1?'cambio':'cambios'} en el tareo. ¿Qué hago con ${n===1?'él':'ellos'}?`,save:g?'Guardar cambios':'Guardar corrección'});
      if(r==='stay'||TR.id!==id)return;if(r==='save'){if(!await trEdSave(id))return}else{TR.ed=null;if(TR.conf==='ed')TR.conf=''}}else TR.ed=null}
  if(TR.dirty&&TR.id===id){const r=await trAsk3({title:'Tienes cotejo de firmas sin guardar',text:'Marcaste firmas u horas de garita que aún no guardas. ¿Qué hago con ellas?',save:'Guardar cotejo'});
    if(r==='stay'||TR.id!==id)return;if(r==='save'){if(!await trSaveCot(id))return}else{const t=TD.docs.get(id);if(t)trInit(t)}}
  if(TR.id===id)fn()}
function trClose(){const id=TR.id;const ws=$('#trWs');if(ws)ws.remove();document.body.classList.remove('tr-on');if(TR.ro){TR.ro.disconnect();TR.ro=null}
  const a3=$('#trAsk3');if(a3)a3.remove();
  Object.assign(TR,{id:'',ed:null,dirty:false,fsig:'',conf:'',nota:'',pend:false,sel:null});txReset();trSsSet(null);if(toAct())requestRender();
  /* el foco vuelve a la fila de la lista del tareo que se estaba revisando (la lista se redibuja: se reintenta un momento) */
  let n=0;const back=()=>{const b=id&&document.querySelector(`#toBody button[data-to="${CSS.escape(id)}"]`);if(b&&document.activeElement!==b)b.focus();if(++n<6&&!TR.id)setTimeout(back,120)};setTimeout(back,60)}
function trGo(dir){const n=trNb(dir);if(n)trLeave(()=>toDetalle(n,true))}
/* reemplaza el HTML de una parte sin perder el desplazamiento (también el de sus tablas con clase tr-ks) ni el campo con el foco */
function trPut(el,html){if(!el||el.__h===html)return;const st=el.scrollTop,ae=document.activeElement,aid=ae&&el.contains(ae)&&ae.id;
  const sc=[...el.querySelectorAll('.tr-ks[id]')].map(x=>[x.id,x.scrollTop,x.scrollLeft]);
  el.innerHTML=html;el.__h=html;el.scrollTop=st;for(const[i,a,b]of sc){const x=document.getElementById(i);if(x){x.scrollTop=a;x.scrollLeft=b}}
  if(aid){const f=document.getElementById(aid);if(f)f.focus({preventScroll:true})}}
/* ¿se está escribiendo en un campo de texto u hora del editor? (redibujar el panel ahí borraría lo que se teclea: espera) */
const trBusyIn=()=>{const a=document.activeElement;return!!(TR.ed&&a&&a.matches&&a.matches('#trRight input:not([type=checkbox]):not([type=radio])'))};
/** dibuja la revisión. force: también si se está escribiendo en una celda (lo piden los clics que cambian la estructura) */
function trDraw(force){const id=TR.id;const t=TD.docs.get(id);if(!t)return;let ws=$('#trWs');
  if(!ws){ws=document.createElement('div');ws.id='trWs';ws.className='tr-ws';ws.setAttribute('role','dialog');ws.setAttribute('aria-modal','true');ws.setAttribute('aria-label','Revisión del tareo');
    ws.innerHTML='<header class="tr-wh" id="trHead"></header><div class="tr-wb" id="trBody"><section class="tr-wf" id="trFoto" aria-label="Formato firmado"></section><div class="tr-split" id="trSplit" role="separator" aria-orientation="vertical" aria-label="Ancho de la foto (arrastra o usa ← →; doble clic la oculta)" tabindex="0"></div><div class="tr-wr" id="trRight"></div></div>';
    document.body.appendChild(ws);document.body.classList.add('tr-on');
    ws.addEventListener('click',e=>trClick(e,TR.id));ws.addEventListener('change',e=>trChange(e,TR.id));
    /* hoja tipo Excel: selección con el mouse, teclado, buscador y menú de filtros (ver «hoja tipo Excel» más abajo) */
    ws.addEventListener('mousedown',txDown);ws.addEventListener('mouseover',txOver);ws.addEventListener('dblclick',txDbl);
    ws.addEventListener('keydown',txKeyR);ws.addEventListener('input',txInput);
    ws.addEventListener('focusout',e=>{if(e.target&&e.target.id==='txIn'&&TX.ing)txCommit(null);
      if(!TR.pend)return;const r=$('#trRight'),to=e.relatedTarget;if(to&&r&&r.contains(to))return;setTimeout(()=>{if(TR.pend&&!trBusyIn())trDraw()},0)});
    ws.addEventListener('toggle',e=>{const d=e.target;if(d&&d.dataset&&d.dataset.trop)TR.op[d.dataset.trop]=d.open},true);
    ws.addEventListener('load',e=>{if(e.target&&e.target.id==='trImg')trView()},true);
    trPanInit(ws);trSplitInit(ws);if(window.ResizeObserver){TR.ro=new ResizeObserver(()=>trView());TR.ro.observe($('#trFoto'))}}
  /* tareo por horas «Enviado» o «Revisado» y quien lo abre edita: la hoja tipo Excel, siempre en edición sobre su propia base */
  const gx=trGx(t);if(TR.pfo==null)TR.pfo=trFoLs();
  if(gx&&!TR.ed)trEdOpen(t,true);
  if(TR.ed&&TR.ed.g&&!gx){TR.ed=null;TR.sel=null;if(TR.conf==='ed')TR.conf=''}
  ws.classList.toggle('tr-gx',gx);ws.classList.toggle('tr-nofo',gx&&!TR.pfo);
  if(gx){const w=trFwLs();if(w)ws.style.setProperty('--trfw',w+'px');else ws.style.removeProperty('--trfw')}
  const M=trModel(t);
  trPut($('#trHead'),trHeadHtml(t,M));
  trFotoLoad(t);
  const fs=(t.foto||[]).join('|')+'#'+TR.fi+'#'+trFotoSt(trFotoCur(t));
  if(TR.fsig!==fs||ws.dataset.id!==id){$('#trFoto').innerHTML=trFotoHtml(t);TR.fsig=fs;ws.dataset.id=id;const v=$('#trView');if(v){v.scrollTop=0;v.scrollLeft=0}}
  ws.classList.toggle('tr-editing',!!TR.ed&&!TR.ed.g);ws.classList.toggle('tr-pch',!!TR.ed&&TR.ed.g&&trEdN()>0);
  if(!force&&trBusyIn()){TR.pend=true;const av=$('#trAv');if(av){const h=trAvisos();if(av.__h!==h){av.innerHTML=h;av.__h=h}}}
  else{TR.pend=false;trPut($('#trRight'),TR.ed?(TR.ed.g?txPanel(t,M):trEdHtml(t)):trRightHtml(t,M));if(gx)txPaint()}
  trView()}
/* todo lo que muestran el encabezado y la tabla (con el cotejo en edición aplicado) */
function trModel(t){const ed=trEdOk();const cot=ed&&t.st==='env'&&(!TR.ed||TR.ed.g);const dv={...t,rows:trRows(t.rows)};const c=trCalc(dv);const s=toStats(t);
  const ob=tObsRev(dv,c);const vis=ob.filter(o=>o.k!=='firp');const pend=ob.filter(o=>o.k==='firp').length;
  const R=Object.entries(c.rows).map(([dni,r])=>({...r,dni})).sort((a,b)=>(a.ape||'').localeCompare(b.ape||'')||a.dni.localeCompare(b.dni));
  const oDni=new Map();for(const o of vis)if(o.dni)oDni.set(o.dni,(oDni.get(o.dni)||[]).concat(o));
  return{ed,cot,c,s,ob,vis,pend,R,P:R.filter(r=>r.as),F:R.filter(r=>!r.as).sort((a,b)=>(a.as===false)-(b.as===false)),oDni,blk:ob.filter(o=>o.bl),nofir:ob.filter(o=>o.k==='nofir'),pas:ed&&(!TR.ed||TR.ed.g)&&['env','rev'].includes(t.st),fok:trFotosOk(t)}}
/* etiqueta corta de cada observación en su fila (el texto completo va en el title y arriba en la lista) */
const TR_TAG={nofir:'No firmó',gar:'Garita',dup:'En otro tareo',marca:'Sin marcar',mot:'Sin motivo',sinh:'Sin horas',cruce:'Cruce',parcial:'Parcial',quien:'Sin bloque',max:'Revisar horas',hmax:'Más de 16 h',hval:'Horas no válidas',bloq:'Bloqueada'};
function trHeadHtml(t,M){const s=M.s;const prev=trNb(-1),next=trNb(1);const L=TR.ord.filter(x=>x===t.id||TD.docs.has(x));const pos=L.indexOf(t.id);
  const kp=(v,l,c='')=>`<span class="tr-k${c}"><b>${v}</b> ${l}</span>`;const nObs=M.vis.length;
  const btn=[];
  if(TR.ed&&TR.ed.g){/* hoja: guardar/descartar los cambios; sin cambios, las acciones del tareo */
    const n=trEdN();
    if(n)btn.push(`<span class="tr-edn on" id="trEdN" role="status">${n} ${n===1?'cambio':'cambios'} sin guardar</span>`,`<button class="ib" data-tra="edx" id="trEdX">Descartar</button>`,`<button class="ib pri tr-edok" data-tra="edok" id="trEdOk">Guardar cambios</button>`);
    if(TR.dirty)btn.push(`<button class="ib tr-sv" data-tra="save" id="trSave">Guardar cotejo</button>`);
    if(!n){if(trProdOk())btn.push(`<button class="ib" data-tra="prconf" id="trPrConf" title="Marca «Revisado por producción» sin cambiar nada">${t.prod&&t.prod.t?'Conforme otra vez':'Conforme sin cambios'}</button>`);
      if(t.st==='env')btn.push(`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`,`<button class="ib pri" data-tra="rev" id="trRev"${M.blk.length?` disabled title="${esc(M.blk.map(o=>o.msg).join('\n'))}"`:''}>Marcar revisado${M.nofir.length?' (con observación)':''}</button>`);
      else btn.push(`<button class="ib" data-tra="qrev" id="trQrev">Quitar revisado</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`)}}
  else if(M.ed){
    if(TR.ed){const n=trEdN();btn.push(`<span class="tr-edn${n?' on':''}" id="trEdN" role="status">${n?`${n} ${n===1?'cambio':'cambios'} sin guardar`:'Sin cambios todavía'}</span>`,
      `<button class="ib" data-tra="edx" id="trEdX">Cancelar corrección</button>`,`<button class="ib pri tr-edok" data-tra="edok" id="trEdOk"${n?'':' title="Aún no cambiaste nada"'}>Guardar corrección</button>`)}
    else if(t.st==='env'){if(TR.dirty)btn.push(`<button class="ib tr-sv" data-tra="save" id="trSave">Guardar cotejo</button>`);
      btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`,
        `<button class="ib pri" data-tra="rev" id="trRev"${M.blk.length?` disabled title="${esc(M.blk.map(o=>o.msg).join('\n'))}"`:''}>Marcar revisado${M.nofir.length?' (con observación)':''}</button>`)}
    else if(t.st==='rev')btn.push(`<button class="ib" data-tra="cor" id="trCor">Corregir</button>`,`<button class="ib" data-tra="qrev" id="trQrev">Quitar revisado</button>`,`<button class="ib" id="toReab" data-tra="reab">Reabrir al capataz</button>`)}
  return`<div class="tr-wh1"><button class="ib tr-back" data-trw="close" id="trBack" title="Volver a la lista de tareos del día (Esc)" aria-label="Volver a la lista">←<span class="tr-hl"> Volver a la lista</span></button>
    <div class="tr-wt"><b class="tr-wn">Tareo de ${esc(t.capN||tCapName(t.cap))}</b><span class="note">${esc(toDia(t.date))}</span>${toChip(t)}${trProdChip(t)}${TR.ed&&!TR.ed.g?'<span class="tr-edt">Corrigiendo</span>':''}</div>
    <nav class="tr-nav" aria-label="Otros tareos del día"><button class="ib" data-trw="prev" id="trPrev"${prev?` title="Anterior: ${esc(trCapOf(prev))} (←)"`:' disabled'}>◀<span class="tr-hl"> Anterior</span></button><span class="note mono" id="trPos">${pos>=0&&L.length>1?`${pos+1} de ${L.length}`:''}</span><button class="ib" data-trw="next" id="trNext"${next?` title="Siguiente: ${esc(trCapOf(next))} (→)"`:' disabled'}><span class="tr-hl">Siguiente </span>▶</button></nav><button class="ib tr-x" data-trw="close" id="trX" title="Cerrar la revisión (Esc)" aria-label="Cerrar la revisión">✕<span class="tr-hl"> Cerrar</span></button></div>
   <div class="tr-wh2"><div class="tr-kpis" id="trKpi">${kp(s.pres,s.pres===1?'vino':'vinieron')}${kp(s.fal,'no '+(s.fal===1?'vino':'vinieron'),s.fal?' tr-kb':'')}${s.sm?kp(s.sm,'sin marcar',' tr-ksm'):''}${kp(toH(s.hh),'HH')}${kp(toH(s.he),'HE',s.he?' tr-kw':'')}${s.alt?kp(s.alt,'en altura'):''}${kp(nObs,nObs===1?'observación':'observaciones',nObs?' tr-kw':' tr-kok')}</div>
   ${btn.length?`<div class="tr-acts">${btn.join('')}</div>`:''}</div>`}
/* fotos del detalle (A7): se cargan las que falten (también si llegan nuevas con el detalle abierto); estado de la foto elegida:
   'o' cargada · 'l' cargando · 'e' no se pudo (con «Reintentar») */
const trFotoCur=t=>{const fs=(t&&t.foto)||[];return fs.length?fs[Math.min(TR.fi,fs.length-1)]:''};
const trFotoSt=fid=>!fid?'':TD.fotos.has(fid)?'o':TD.fErr.has(fid)?'e':'l';
function trFotoLoad(t){const miss=(t.foto||[]).filter(f=>!TD.fotos.has(f)&&!TD.fLd.has(f)&&!TD.fErr.has(f));if(miss.length)toFotos(t.id,miss)}
/* lo llama toFotos (tareo.js) al terminar de leer una foto */
function trFotoSync(){if(TR.id&&$('#trWs'))trDraw()}
/* visor: foto grande con zoom (botones, rueda), rotar y arrastrar */
function trFotoHtml(t){const fotos=t.foto||[];const fi=Math.min(TR.fi,Math.max(0,fotos.length-1));const st=trFotoSt(fotos[fi]);
  return`<div class="tr-vbar"><b>Formato firmado</b>${fotos.length>1?`<span class="tr-vbtn"><button class="ib" data-trv="prev" aria-label="Foto anterior">‹</button><span class="note">${fi+1} de ${fotos.length}</span><button class="ib" data-trv="next" aria-label="Foto siguiente">›</button></span>`:''}
    ${fotos.length?`<span class="tr-vbtn"><button class="ib" data-trv="zo" aria-label="Alejar" title="Alejar">−</button><span class="note mono tr-zl" id="trZl">100%</span><button class="ib" data-trv="zi" aria-label="Acercar" title="Acercar">+</button><button class="ib" data-trv="fitw" title="Ajustar al ancho">Ancho</button><button class="ib" data-trv="fit" title="Ver la hoja entera">Entera</button><button class="ib" data-trv="rot" aria-label="Rotar" title="Rotar 90°">⟳</button><button class="ib" data-trv="full" aria-label="Pantalla completa" title="Pantalla completa">⛶</button></span>`:''}</div>
   <div class="tr-view" id="trView">${!fotos.length?'<span class="note tr-nof">Sin foto del formato.</span>'
     :st==='o'?`<div class="tr-pz" id="trPz"><img id="trImg" alt="Formato firmado" draggable="false"></div>`
     :st==='e'?`<div class="tr-ferr" id="trFErr" role="alert"><b>No se pudo cargar la foto del formato.</b><span class="note">${esc(TD.fErr.get(fotos[fi])||'')}</span><button class="ib pri" data-trv="retry" id="trFRe">Reintentar</button></div>`
     :'<span class="note tr-nof" id="trFLd" role="status">Cargando la foto del formato…</span>'}</div>
   <div class="to-fotos tr-thumbs" id="toFotos"${fotos.length>1?'':' hidden'}>${fotos.map((fid,i)=>`<button class="to-ft${i===fi?' on':''}" data-tft="${esc(fid)}" data-i="${i}" aria-label="Ver foto ${i+1}">${TD.fotos.has(fid)?`<img src="${esc(TD.fotos.get(fid))}" alt="Formato firmado">`:`<span class="note">${TD.fErr.has(fid)?'No se pudo cargar':'Cargando…'}</span>`}</button>`).join('')}</div>
   ${fotos.length?'<p class="note tr-vh">Arrastra para mover · rueda del mouse para acercar</p>':''}`}
/* tamaño del visor: con z = 1 la hoja ocupa el ancho del visor; girada 90° se mide su caja girada (así se desplaza bien) */
function trView(){const im=$('#trImg');if(!im)return;const t=TD.docs.get(TR.id);const fs=(t&&t.foto)||[];const fid=fs[Math.min(TR.fi,fs.length-1)];
  if(fid&&TD.fotos.has(fid)&&im.getAttribute('src')!==TD.fotos.get(fid))im.src=TD.fotos.get(fid);
  im.dataset.z=String(Math.round(TR.z*100)/100);im.dataset.rot=String(TR.rot);const zl=$('#trZl');if(zl)zl.textContent=Math.round(TR.z*100)+'%';
  const v=$('#trView'),pz=$('#trPz');const nw=im.naturalWidth,nh=im.naturalHeight;if(!v||!pz)return;
  if(!nw||!nh){pz.style.width='100%';pz.style.height='';im.style.cssText='position:static;width:100%';return}
  const side=TR.rot%180!==0,ar=nw/nh;const W=Math.max(40,v.clientWidth*TR.z);const H=side?W*ar:W/ar;
  pz.style.width=W+'px';pz.style.height=H+'px';im.style.cssText=`width:${side?H:W}px;transform:translate(-50%,-50%)${TR.rot?` rotate(${TR.rot}deg)`:''}`}
/* zoom manteniendo fijo el punto (cx, cy) del visor (por omisión, el centro) */
function trZoomTo(nz,cx,cy){nz=Math.max(0.25,Math.min(5,nz));const v=$('#trView'),pz=$('#trPz');if(!v||!pz){TR.z=nz;trView();return}
  if(cx==null){cx=v.clientWidth/2;cy=v.clientHeight/2}const px=v.scrollLeft+cx-pz.offsetLeft,py=v.scrollTop+cy-pz.offsetTop;const k=nz/TR.z;TR.z=nz;trView();
  v.scrollLeft=px*k+pz.offsetLeft-cx;v.scrollTop=py*k+pz.offsetTop-cy}
function trFitZ(){const v=$('#trView'),im=$('#trImg');if(!v||!im||!im.naturalWidth)return 1;const ar=im.naturalWidth/im.naturalHeight;const H1=TR.rot%180?v.clientWidth*ar:v.clientWidth/ar;return Math.max(0.25,Math.min(1,v.clientHeight/H1))}
/* arrastrar con el mouse (el dedo usa el desplazamiento propio del navegador) y rueda = zoom */
function trPanInit(ws){let P=null;
  ws.addEventListener('pointerdown',e=>{const v=e.target.closest&&e.target.closest('#trView');if(!v||e.pointerType!=='mouse'||e.button!==0||!$('#trImg'))return;
    P={x:e.clientX,y:e.clientY,l:v.scrollLeft,t:v.scrollTop,v};try{v.setPointerCapture(e.pointerId)}catch(err){}v.classList.add('drag');e.preventDefault()});
  ws.addEventListener('pointermove',e=>{if(!P)return;P.v.scrollLeft=P.l-(e.clientX-P.x);P.v.scrollTop=P.t-(e.clientY-P.y)});
  const end=()=>{if(P){P.v.classList.remove('drag');P=null}};ws.addEventListener('pointerup',end);ws.addEventListener('pointercancel',end);
  ws.addEventListener('wheel',e=>{const v=e.target.closest&&e.target.closest('#trView');if(!v||!$('#trImg'))return;e.preventDefault();const r=v.getBoundingClientRect();
    trZoomTo(TR.z*Math.pow(1.0015,-e.deltaY),e.clientX-r.left,e.clientY-r.top)},{passive:false})}
/* atajos: ← → otro tareo del día, Esc volver a la lista (no mientras se escribe en un campo o hay una ventana encima) */
/* foco atrapado (UX5): con Tab el foco no sale de la capa de arriba (foto ampliada, ventana #lqm o la revisión #trWs) */
function trTrap(e,box){const F=[...box.querySelectorAll('button,[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&!x.closest('[hidden]')&&x.getClientRects().length);
  if(!F.length){e.preventDefault();return}const a=document.activeElement,i=F.indexOf(a);
  if(!box.contains(a)||i<0){e.preventDefault();(e.shiftKey?F[F.length-1]:F[0]).focus();return}
  if(e.shiftKey&&i===0){e.preventDefault();F[F.length-1].focus()}else if(!e.shiftKey&&i===F.length-1){e.preventDefault();F[0].focus()}}
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;
  /* en el módulo Tareo: Tab dentro de la ventana de arriba; Esc cierra la ventana #lqm (pasar a otro capataz, registrar falta, cuentas…) */
  if(typeof U!=='undefined'&&U.mod==='tar'&&!$('.uask')&&(e.key==='Tab'||e.key==='Escape')){const z=$('.to-zoom'),lq=$('#lqm .lqc'),ws=TR.id&&$('#trWs');
    if(e.key==='Tab'){const box=z||lq||ws;if(box){trTrap(e,box);return}}
    else if(lq&&!z){e.preventDefault();lqClose();return}}
  if(!TR.id||!$('#trWs'))return;
  const z=$('.to-zoom');if(z){if(e.key==='Escape')z.remove();return}if($('.uask')||$('#lqm'))return;
  /* en un campo, Esc solo lo suelta (no sale); en una casilla (vino, altura) Esc sale como en un botón */
  const tg=e.target;const box=tg&&tg.tagName==='INPUT'&&/^(checkbox|radio)$/.test(tg.type)&&e.key==='Escape';
  if(!box&&tg&&(/^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)||tg.isContentEditable)){if(e.key==='Escape')tg.blur();return}
  if(e.key==='ArrowLeft'){e.preventDefault();trGo(-1)}else if(e.key==='ArrowRight'){e.preventDefault();trGo(1)}else if(e.key==='Escape'){e.preventDefault();trLeave(trClose)}});

/* panel derecho: avisos, tabla obreros × partidas con el cotejo y, plegables, bloques e historial */
/* aviso de conflicto con «Recargar versión actual» (A3) y de cotejo descartado porque cambió la evidencia (A2) */
const trAvisos=()=>`${TR.conf?`<div class="callout t-warn tr-confl" id="trConfl" role="alert"><span>Otro usuario cambió este tareo mientras ${TR.conf==='ed'?'corregías':'cotejabas'}: no se guardó nada. Carga la versión actual para seguir${TR.conf==='ed'?' (tendrás que repetir la corrección)':''}.</span><button class="ib pri" data-tra="reload" id="trReload">Recargar versión actual</button></div>`:''}
   ${TR.nota?`<div class="callout t-warn" id="trCycV" role="alert">${esc(TR.nota)}</div>`:''}`;
function trRightHtml(t,M){const{c,cot,P,F,oDni,pend,vis,fok}=M;const s=M.s;
  const pcL=pc=>{const p=S.tpc.get(pc);return p?{cod:p.cod,nom:p.nom}:{cod:pc,nom:'(partida no encontrada)'}};
  const hrs=trHrs(t);
  /* modo:'hrs': las partidas en el orden en que las puso el capataz (pcs); por bloques: por código */
  const pcs=hrs?[...new Set([...(Array.isArray(t.pcs)?t.pcs:[]),...P.flatMap(r=>Object.keys(r.h||{}).filter(k=>trHv(r.h[k])))].filter(Boolean))]
    :[...new Set([...(t.blq||[]).map(b=>b&&b.pc),...Object.values(c.rows).flatMap(r=>Object.keys(r.h||{}))].filter(Boolean))].sort((a,b)=>tCmpCod(pcL(a).cod,pcL(b).cod));
  const tot={};for(const r of P)for(const[pc,v]of Object.entries(r.h||{}))tot[pc]=tR2((tot[pc]||0)+trHv(v));
  const hor=r=>hrs?(r.fin?`<small>${r.sal?'sale':'sale ~'} ${esc(r.fin)}</small>`:''):r.ini?`<small>${esc(r.ini)}–${esc(r.fin)}</small>`:'';
  const rn=dni=>{const r=c.rows[dni];return r?(r.ape||dni):dni};
  const hist=(Array.isArray(t.hist)?t.hist:[]).slice().sort((a,b)=>(a.t||0)-(b.t||0));
  const nCot=P.filter(r=>r.fir===true||r.fir===false).length;
  const dis=fok?'':' disabled title="Espera a que cargue la foto del formato"';
  const firCell=r=>{if(cot)return`<span class="seg tr-fir"><button data-tra="fir" data-v="1" class="${r.fir===true?'on':''}" aria-pressed="${r.fir===true}"${dis}>Sí</button><button data-tra="fir" data-v="0" class="${r.fir===false?'on':''}" aria-pressed="${r.fir===false}"${dis}>No</button></span>`;
    return r.fir===true?'<span class="tr-si">Sí</span>':r.fir===false?'<span class="tr-no">No firmó</span>':'<span class="note">—</span>'};
  const garCell=r=>cot?`<input class="tin tr-gar" type="time" step="60" id="trg_${esc(r.dni)}" data-trg="${esc(r.dni)}" value="${esc(r.gar||'')}" aria-label="Salida en garita">`:`<span class="mono">${esc(r.gar||'')}</span>`;
  const tags=d=>(oDni.get(d)||[]).map(o=>`<span class="tr-tg${o.bl?' tr-tgb':''}" data-k="${esc(o.k)}" title="${esc(o.msg)}">${esc(TR_TAG[o.k]||'Revisar')}</span>`).join('');
  const pas=d=>M.pas?`<button class="ib tr-pas" data-tra="pas" data-v="${esc(d)}" title="Pasar a otro capataz…" aria-label="Pasar a otro capataz">⇄</button>`:'';
  const obc=d=>`<td class="tr-tgs"><div class="tr-oc"><span>${tags(d)}</span>${pas(d)}</div></td>`;
  const who=r=>`<td class="tr-nmc"><b>${esc(r.ape||r.dni)}</b> <small class="note">${esc(r.nom||'')} · <span class="mono">${esc(r.dni)}</span></small></td><td>${esc(r.cat||'')}</td>`;
  const ncol=pcs.length+8;
  const body=P.map(r=>{const k=(oDni.get(r.dni)||[]).map(o=>o.k);return`<tr data-trd="${esc(r.dni)}" data-dni="${esc(r.dni)}" class="${k.includes('nofir')?'tr-bad':''}${k.includes('gar')?' tr-wgar':''}">${who(r)}
      ${pcs.map(pc=>`<td class="mono t-r">${r.h&&r.h[pc]?toH(r.h[pc]):''}</td>`).join('')}<td class="mono t-r tr-tot"><b>${toH(r.trab)}</b>${hor(r)}</td><td class="mono t-r">${r.ext?toH(r.ext):''}</td><td>${r.alt?'(A)':''}</td>
      <td>${firCell(r)}</td><td class="tr-gc">${garCell(r)}</td>${obc(r.dni)}</tr>`}).join('')
    +F.map(r=>`<tr class="tr-frow${r.as===false?'':' tr-smrow'}" data-dni="${esc(r.dni)}" data-as="${r.as===false?'no':'sm'}">${who(r)}<td colspan="${pcs.length+3}" class="tr-fx">${r.as===false?`No vino${r.mot?` · <b>${esc(r.mot)}</b>${TO_MOT[r.mot]?' '+esc(TO_MOT[r.mot]):''}`:''}`:'<span class="tr-sm">Sin marcar</span> <span class="note">el capataz no marcó si vino</span>'}</td><td></td><td></td>${obc(r.dni)}</tr>`).join('')
    ||`<tr><td colspan="${ncol}" class="note">No hay obreros en este tareo.</td></tr>`;
  const blq=t.blq||[];
  return`${trAvisos()}${t.st==='reab'&&t.reab?`<div class="callout t-warn">Reabierto por ${esc(toWho(t.reab.by))} a las ${esc(tHm(t.reab.t))}: ${esc(t.reab.mot||'')}</div>`:''}
   ${t.st==='rev'&&t.revBy?`<div class="callout tr-okc">Revisado por ${esc(toWho(t.revBy))}${t.revAt?' a las '+esc(tHm(t.revAt)):''}.</div>`:''}
   ${t.prod&&t.prod.t?`<div class="callout tr-okc tr-prodn" id="trProdV">Revisado por producción: ${esc(t.prod.byN||toWho(t.prod.by))} · ${esc(fmtD(ldt(t.prod.t)))} ${esc(tHm(t.prod.t))}.</div>`:''}
   ${tCotVieja(t)?`<div class="callout t-warn" id="trCotV">El capataz cambió las fotos después del cotejo: vuelve a cotejar las firmas con el formato nuevo.</div>`:''}
   ${vis.length?`<div class="callout t-warn to-obs" id="trObs"><b>${vis.length} ${vis.length===1?'observación':'observaciones'}</b><ul>${vis.map(o=>`<li data-k="${esc(o.k)}"${o.bl?' class="tr-obl"':''}>${esc(o.msg)}</li>`).join('')}</ul></div>`:''}
   <section class="card tr-mtc"><div class="tr-vbar"><b>Obreros y horas por partida</b><span class="note" id="trCotN">${nCot} de ${P.length} cotejados</span>${cot&&pend?`<span class="note tr-pend">Falta cotejar ${pend} ${pend===1?'firma':'firmas'}.</span>`:''}${cot&&P.length&&!fok&&(t.foto||[]).length?'<span class="note tr-pend" id="trFWait">Para cotejar, espera a que cargue la foto.</span>':''}${cot&&P.length?`<button class="ib" data-tra="all" id="trAll"${dis}>Todos firmaron</button>`:''}</div>
    <div class="tr-mtw"><table class="t tr-mt"><thead><tr><th>Obrero</th><th>Cat.</th>${pcs.map(pc=>{const p=pcL(pc);return`<th class="t-r" title="${esc(p.nom)}">${esc(p.cod)}</th>`}).join('')}<th class="t-r" title="Horas trabajadas y horario">Total</th><th class="t-r" title="Horas extra">HE</th><th title="Trabajo en altura (bono)">A</th><th>Firmó</th><th title="Hora de salida en garita (opcional)">Garita</th><th title="Observaciones${M.pas?' · ⇄ pasar a otro capataz':''}">Obs.</th></tr></thead>
     <tbody>${body}</tbody>
     ${P.length?`<tfoot><tr><td colspan="2"><b>Total</b></td>${pcs.map(pc=>`<td class="mono t-r"><b>${toH(tot[pc])}</b></td>`).join('')}<td class="mono t-r"><b>${toH(s.hh)}</b></td><td class="mono t-r"><b>${toH(s.he)}</b></td><td colspan="4"></td></tr></tfoot>`:''}</table></div></section>
   ${hrs?'':`<details class="card tr-dt" id="trBlqD" data-trop="blq"${TR.op.blq?' open':''}><summary><b>Bloques</b> <span class="note">${blq.length}</span></summary>
    ${blq.length?`<ul class="t-list to-blq">${blq.map(b=>{b=b||{};const p=b.pc?pcL(b.pc):null;const n=Array.isArray(b.dnis)?b.dnis:[];
     return`<li><span class="mono">${esc(b.ini||'?')}–${esc(b.fin||'?')}</span> · ${p?`<b class="mono">${esc(p.cod)}</b> ${esc(p.nom)}`:'<i>sin partida</i>'} · ${n.length} ${n.length===1?'obrero':'obreros'}${tBlqOk(b)?` · ${toH(tBlqH(t.date,b.ini,b.fin,t.cfg||undefined))} h`:''}<div class="t-chg">${n.map(d=>esc(rn(d))).join(', ')}</div></li>`}).join('')}</ul>`:'<p class="note">Sin bloques.</p>'}</details>`}
   <details class="card tr-dt" id="trHistD" data-trop="hist"${TR.op.hist?' open':''}><summary><b>Historial</b> <span class="note">${hist.length}</span></summary>
    ${hist.length?`<ul class="t-list to-hist" id="trHist">${hist.map(x=>`<li data-a="${esc(x.a||'')}"><span class="mono">${esc(fmtD(ldt(x.t||0)))} ${esc(tHm(x.t))}</span> · <b>${esc(TO_HA[x.a]||x.a||'')}</b> · ${esc(toWho(x.by))}${x.mot?': '+esc(x.mot):''}${x.cam?`<div class="t-chg">${esc(x.cam)}</div>`:''}</li>`).join('')}</ul>`:'<p class="note">Sin movimientos.</p>'}</details>`}

function trClick(e,id){if(TR.ed&&TR.ed.g&&txClick(e))return;const w=e.target.closest('[data-trw]');if(w&&!w.disabled){const a=w.dataset.trw;if(a==='close')trLeave(trClose);else trGo(a==='next'?1:-1);return}
  const v=e.target.closest('[data-trv]');if(v){const t=TD.docs.get(id);const n=(t&&t.foto||[]).length;const a=v.dataset.trv;
    if(a==='zi')trZoomTo(TR.z+0.5);else if(a==='zo')trZoomTo(TR.z-0.5);else if(a==='fitw')trZoomTo(1);else if(a==='fit')trZoomTo(trFitZ());
    else if(a==='rot'){TR.rot=(TR.rot+90)%360;trView()}
    else if(a==='full'){const fid=n&&t.foto[Math.min(TR.fi,n-1)];if(fid)toZoom(fid)}
    else if(a==='retry'){for(const f of t.foto||[])TD.fErr.delete(f);trDraw()}
    else if(n){TR.fi=(TR.fi+(a==='next'?1:-1)+n)%n;TR.z=1;TR.rot=0;trDraw()}return}
  const f=e.target.closest('[data-tft]');if(f){const i=+f.dataset.i||0;if(i!==TR.fi){TR.fi=i;TR.z=1;TR.rot=0;trDraw()}return}
  const b=e.target.closest('[data-tra]');if(!b||b.disabled)return;const a=b.dataset.tra;
  if(a==='reload')return trReload(id);
  if(TR.ed&&TR.ed.g&&txAct(a,b,id))return;
  if((a==='fir'||a==='all')&&!trFotosOk(TD.docs.get(id))){toast('Espera a que cargue la foto del formato para cotejar.');return}
  if(a==='fir'){const tr=b.closest('[data-trd]');if(!tr)return;TR.nota='';const d=tr.dataset.trd;const val=b.dataset.v==='1';
    if(TR.fir[d]===val)delete TR.fir[d];else TR.fir[d]=val;trDirty();trDraw();return}
  if(a==='all'){TR.nota='';const t=TD.docs.get(id);if(TR.ed&&TR.ed.g)txSnapPush();for(const[d,r]of Object.entries(t.rows||{}))if(r&&r.as)TR.fir[d]=true;trDirty();trDraw();return}
  if(a==='save')return trSaveCot(id);
  if(a==='rev')return trRevisar(id);
  if(a==='qrev')return trQuitarRev(id);
  if(a==='reab')return toReabrir(id);
  if(a==='pas')return trPasarDlg(id,b.dataset.v);
  if(a==='cor'){trEdOpen(TD.docs.get(id));TR.conf='';trDraw(true);return}
  if(TR.ed)return trEdClick(a,b,id)}
function trChange(e,id){if(e.target.closest&&e.target.closest('#txMenu')){txMenuChg(e);return}
  if(TR.ed&&TR.ed.g&&e.target.id==='trPcAdd'){txPcAdd(e.target);return}
  const g=e.target.closest('[data-trg]');if(g){const v=/^\d{2}:\d{2}/.test(g.value)?g.value.slice(0,5):'';if(v)TR.gar[g.dataset.trg]=v;else delete TR.gar[g.dataset.trg];trDirty();trDraw();return}
  if(TR.ed)trEdChange(e,id)}

/* guardar cotejo (firmas y garita): solo lo que cambió el asistente */
async function trSaveCot(id){if(!trEdOk()||TR.busy)return false;TR.busy=true;let sig='';const cyc0=TR.cyc;
  try{await trTx(id,cur=>{if(trCyc(cur)!==cyc0)throw trCycErr();if(cur.st!=='env')throw new Error('El tareo cambió de estado.');const{up,cot,cotFot,n}=trCotUp(cur);if(!n)throw new Error('no hay firmas ni garitas nuevas que guardar.');
      sig=trSig({...cur,cot,cotFot:cotFot||cur.foto},true);const cam=trCotCam(cur.rows||{},trCotCh());
      return{...up,hist:trAU(trHist('fir',cam?{cam}:{})),by:me.email||'',ts:NOW()}});
    TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.dirty=false;if(sig&&TR.id===id)TR.sig=sig;toast('Cotejo guardado.');return true}
  catch(err){if(err&&err.cyc&&TR.id===id){trCycDrop();toast(TR_CYC)}else trErr('No se pudo guardar el cotejo: ',err);return false}finally{TR.busy=false;trSync()}}
/* marcar revisado: dentro de la transacción vuelve a revisar el documento actual (con el cotejo en edición aplicado) y los
   conflictos del día; no marca si hay observaciones que bloquean o si otro usuario cambió el tareo desde que se abrió.
   Si alguien no firmó, con confirmación (queda en el historial). */
async function trRevisar(id){const t=TD.docs.get(id);if(!t||t.st!=='env'||!trEdOk()||TR.busy)return;
  const dv={...t,rows:trRows(t.rows)};const ob=tObsRev(dv);const blk=ob.filter(o=>o.bl);
  if(blk.length){toast(blk[0].msg);return}
  const nof=ob.filter(o=>o.k==='nofir'),gar=ob.filter(o=>o.k==='gar'),wn=ob.filter(o=>!o.bl&&!['nofir','gar','firp'].includes(o.k));
  if(nof.length&&!await uiAsk({title:'¿Marcar revisado con observaciones?',text:`${nof.length===1?'Un obrero vino pero no firmó':nof.length+' obreros vinieron pero no firmaron'} el formato. Quedará anotado en el historial.`,list:nof.map(o=>o.msg),ok:'Marcar revisado',tone:'warn'}))return;
  const obs=[...nof,...gar,...wn].map(o=>o.msg).join(' ');const sig0=TR.sig,cyc0=TR.cyc;TR.busy=true;
  try{await trTx(id,cur=>{if(trCyc(cur)!==cyc0)throw trCycErr();if(cur.st!=='env')throw new Error('El tareo cambió de estado.');if(trSig(cur,true)!==sig0)throw new Error(TR_CHG);
      /* A1: un revisado nunca queda sin su jornada congelada (tareos enviados antes de guardar cfg) */
      const cfg=!cur.cfg&&typeof tCfgDia==='function'?tCfgDia(cur.date):null;
      const{up,cot}=trCotUp(cur);const after=tConCot({...cur,cotFot:cur.foto,...(cfg?{cfg}:{})},cot);
      const docs=[...TD.docs.values()].filter(x=>x.id!==id).concat([after]);const bl=tObsRev(after,undefined,docs).filter(o=>o.bl);
      if(bl.length)throw new Error(bl[0].msg);
      const cam=[trCotCam(cur.rows||{},trCotCh()),obs?'Observaciones: '+obs:''].filter(Boolean).join(' · ');const t2=NOW();
      return{...up,...(cfg?{cfg}:{}),st:'rev',revAt:t2,revBy:me.email||'',hist:trAU(trHist('rev',cam?{cam:cam.length>400?cam.slice(0,397)+'…':cam}:{})),by:me.email||'',ts:t2}});
    TR.b={fir:{...TR.fir},gar:{...TR.gar}};TR.dirty=false;toast('Tareo revisado ✓')}
  catch(err){if(err&&err.cyc&&TR.id===id){trCycDrop();toast(TR_CYC)}else{if(err&&err.message===TR_CHG&&TR.id===id)TR.conf='cot';trErr('No se pudo marcar revisado: ',err)}}finally{TR.busy=false;trSync()}}
async function trQuitarRev(id){const t=TD.docs.get(id);if(!t||t.st!=='rev'||!trEdOk())return;
  const mot=await uiAsk({title:'¿Quitar «revisado»?',text:'El tareo vuelve a «Enviado» para revisarlo de nuevo.',input:{label:'Motivo',required:true},ok:'Quitar revisado',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  try{await trTx(id,cur=>{if(cur.st!=='rev')throw new Error('El tareo cambió de estado.');
      return{st:'env',revAt:trDel(),revBy:trDel(),hist:trAU(trHist('qrev',{mot:m})),by:me.email||'',ts:NOW()}});
    toast('El tareo volvió a «Enviado».')}
  catch(err){trErr('No se pudo cambiar: ',err)}finally{trSync()}}
/* reabrir al capataz: desde «Enviado» o «Revisado» (siempre con motivo). Las firmas cotejadas se borran (al reenviar se cotejan
   de nuevo con el formato que mande); la hora de garita se conserva en `cot` (no depende de la foto). En un tareo antiguo
   (cotejo en rows) se pasa la garita a `cot` y se quitan fir/gar de las filas. */
async function toReabrir(id){const t=TD.docs.get(id);if(!t||!['env','rev'].includes(t.st)||!toReabOk())return;const name=t.capN||tCapName(t.cap);
  const mot=await uiAsk({title:'¿Reabrir el tareo al capataz?',text:`${name} podrá corregirlo y volver a enviarlo. Verá el motivo que escribas.${t.st==='rev'?' Se quita la marca de revisado.':''} Las firmas se cotejan de nuevo cuando lo reenvíe.`,input:{label:'Motivo',required:true},ok:'Reabrir',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;
  const r={t:NOW(),by:me.email||me.id||'',mot:m};const FV={delete:trDel,arrayUnion:trAU};
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado: ya no se puede reabrir.');
      const up={st:'reab',reab:r,hist:FV.arrayUnion({...r,a:'reab'}),by:r.by,ts:r.t};const C=tCotDe(cur);const old=cur.cot&&typeof cur.cot==='object'?cur.cot:{};const G={};
      for(const[d,x]of Object.entries(C))if(x.gar){const o=old[d]||{};G[d]={gar:x.gar,...(o.by?{by:o.by}:{}),...(o.t?{t:o.t}:{})}}
      if(Object.keys(G).length)up.cot=G;else if('cot'in cur)up.cot=FV.delete();if('cotFot'in cur)up.cotFot=FV.delete();
      if(cur.revAt!=null)up.revAt=FV.delete();if(cur.revBy!=null)up.revBy=FV.delete();
      if(cur.prod!=null)up.prod=FV.delete();/* lo que reenvíe el capataz se revisa de nuevo en producción */
      const R=cur.rows||{};if(Object.values(R).some(x=>x&&('fir'in x||'gar'in x)))up.rows=Object.fromEntries(Object.entries(R).map(([d,x])=>{const y={...x};delete y.fir;delete y.gar;return[d,y]}));
      return up});
    toast(`Tareo reabierto: ${name} ya puede corregirlo.`)}
  catch(err){trErr('No se pudo reabrir: ',err)}finally{trSync()}}

/* ---------- corrección directa (editor para PC) ----------
   Dos editores sobre el mismo estado (TR.ed, ver trEdState): por bloques para los tareos antiguos (blq) y una grilla
   obreros × partidas para los de modo:'hrs' («Contrato "horas por cantidad"»). Ver docs/ia/tareo.md («Implementación de la
   grilla — oficina»). Los cambios se miden contra la base del editor (trEdPatch), no contra lo que llega de la base. */
const trBid=()=>'b'+Math.random().toString(36).slice(2,9);
/* vino: true · no vino: false · sin marcar: null (tValida lo pide) */
const trAs=v=>v===true?true:v===false?false:null;
const trPcL=pc=>{const p=pc&&S.tpc.get(pc);return p?{cod:p.cod,nom:p.nom,bloq:p.bloq===true}:{cod:pc||'?',nom:'(partida no encontrada)',bloq:false}};
const trSortRows=rows=>Object.entries(rows||{}).filter(([,r])=>r).sort((a,b)=>(a[1].ape||'').localeCompare(b[1].ape||'')||a[0].localeCompare(b[0]));
/* «Corregir» por bloques (tareos antiguos); los tareos por horas se corrigen en la hoja tipo Excel */
function trEdHtml(t){return trEdHtmlB(t)}
/* avisos del editor (problemas que bloquean y avisos que no); se actualizan sin redibujar la tabla (trEdLive) */
function trEdChkHtml(nd){const V=trValida(nd);const E=V.filter(o=>!o.warn),W=V.filter(o=>o.warn);
  return`${E.length?`<div class="callout t-warn to-obs" id="trEdObs"><b>${E.length} ${E.length===1?'problema':'problemas'}</b><ul>${E.map(o=>`<li class="tr-obl">${esc(o.msg)}</li>`).join('')}</ul></div>`:''}
   ${W.length?`<div class="callout t-warn to-obs" id="trEdWarn"><b>${W.length} ${W.length===1?'aviso':'avisos'}</b> <span class="note">(no impiden revisar)</span><ul>${W.map(o=>`<li>${esc(o.msg)}</li>`).join('')}</ul></div>`:''}`}
const trEdIntro=t=>`<div id="trAv">${trAvisos()}</div><div class="callout tr-edc"><b>Corregir el tareo</b><span>Cambia lo necesario mirando la foto. «Guardar corrección» (arriba) recalcula las horas, pide el motivo y lo deja en el historial.${t.st==='rev'?' El tareo vuelve a «Enviado» para revisarlo de nuevo.':''}</span></div>`;

/* --- editor por bloques (tareos antiguos con blq) --- */
function trEdObrB(nd,c){const e=TR.ed;
  return trSortRows(nd.rows).map(([d,r])=>{const x=e.rows[d]||{};const cr=c.rows[d]||{};return`<tr data-tro="${esc(d)}"><td><b>${esc(r.ape||d)}</b> <small class="note">${esc(r.nom||'')} · ${esc(d)}</small></td>
     <td><input type="checkbox" id="tre_as_${esc(d)}" data-tre="as"${x.as?' checked':''} aria-label="Vino"></td>
     <td>${x.as===true?'':x.as!==false?'<span class="note">Sin marcar</span>':`<select class="tin" id="tre_mot_${esc(d)}" data-tre="mot" aria-label="Motivo"><option value="">Sin motivo</option>${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${x.mot===k?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select>`}</td>
     <td>${x.as?`<input type="checkbox" id="tre_alt_${esc(d)}" data-tre="alt"${x.alt?' checked':''} aria-label="Altura">`:''}</td>
     <td class="mono t-r">${x.as?toH(cr.trab):''}</td><td class="mono t-r">${x.as&&cr.ext?toH(cr.ext):''}</td></tr>`}).join('')}
function trEdHtmlB(t){const e=TR.ed;const nd=trEdCur();const c=trCalc(nd);
  const pres=trSortRows(nd.rows).filter(([d])=>e.rows[d]&&e.rows[d].as===true);
  const pcs=[...S.tpc.values()].filter(x=>x&&!x.arch&&x.act!==false).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const pcOpt=cur=>{const L=pcs.slice();if(cur&&!L.some(x=>x.id===cur)){const x=S.tpc.get(cur);L.unshift({id:cur,cod:x?x.cod:cur,nom:x?x.nom+' (inactiva)':'(partida no encontrada)'})}
    return`<option value=""${cur?'':' selected'}>Elige la partida</option>`+L.map(x=>`<option value="${esc(x.id)}"${x.id===cur?' selected':''}>${esc(x.cod)} · ${esc(x.nom)}</option>`).join('')};
  const short=d=>{const r=nd.rows[d]||{};return(r.ape||d).split(' ')[0]};
  return`${trEdIntro(t)}
   <b class="t-h3">Bloques</b>
   <div class="tscroll"><table class="t tr-et"><thead><tr><th>Partida</th><th>Desde</th><th>Hasta</th><th class="t-r">Horas</th><th>Quiénes</th><th></th></tr></thead><tbody>
   ${e.blq.map((b,i)=>{const on=new Set(b.dnis);return`<tr data-tri="${i}"><td><select class="tin tr-pc" id="tre_pc_${i}" data-tre="pc" aria-label="Partida">${pcOpt(b.pc)}</select></td>
     <td><input class="tin" type="time" step="300" id="tre_ini_${i}" data-tre="ini" value="${esc(b.ini)}" aria-label="Desde"></td><td><input class="tin" type="time" step="300" id="tre_fin_${i}" data-tre="fin" value="${esc(b.fin)}" aria-label="Hasta"></td>
     <td class="mono t-r" id="trEdBh_${i}">${tBlqOk(b)?toH(tBlqH(nd.date,b.ini,b.fin,nd.cfg||undefined)):''}</td>
     <td><div class="tr-chips">${pres.map(([d])=>`<button class="chip${on.has(d)?' on':''}" data-tra="who" data-v="${esc(d)}" aria-pressed="${on.has(d)}">${esc(short(d))}</button>`).join('')}<button class="chip tr-cha" data-tra="wall">${pres.every(([d])=>on.has(d))&&pres.length?'Ninguno':'Todos'}</button></div></td>
     <td><button class="ib" data-tra="bdel" aria-label="Quitar bloque">Quitar</button></td></tr>`}).join('')||'<tr><td colspan="6" class="note">Sin bloques.</td></tr>'}
   </tbody></table></div>
   <div><button class="ib" data-tra="badd" id="trBadd">+ Agregar bloque</button></div>
   <b class="t-h3">Obreros</b>
   <div class="tscroll"><table class="t tr-eo"><thead><tr><th>Obrero</th><th>Vino</th><th>Motivo si faltó</th><th>Altura</th><th class="t-r">Horas</th><th class="t-r">HE</th></tr></thead><tbody id="trEdO">
   ${trEdObrB(nd,c)}</tbody></table></div>
   <div id="trEdChk">${trEdChkHtml(nd)}</div>`}

/* --- hoja (modo:'hrs'): utilidades de horas --- */
const trHFmt=v=>v?String(v):'';
/** texto de una celda → horas (0 si vacía; NaN si no es un número válido) */
function trHParse(s){s=String(s==null?'':s).trim().replace(',','.');if(!s)return 0;if(!/^\d{0,2}(\.\d*)?$/.test(s)||s==='.')return NaN;const n=+s;return Number.isFinite(n)?n:NaN}
/* columnas de la hoja: las partidas del día (pcs) y, al final, cualquier otra que tenga horas */
const trEdCols=e=>[...new Set([...e.pcs,...Object.values(e.rows).flatMap(x=>Object.keys(x.h||{}))])];
/** corrección por bloques: actualiza horas, obreros, avisos y encabezado sin redibujar la tabla de bloques (no se pierde lo que se
    está tecleando en una hora) */
function trEdLive(){const t=TD.docs.get(TR.id);const e=TR.ed;if(!t||!e||e.hrs)return;
  trPut($('#trHead'),trHeadHtml(t,trModel(t)));
  const nd=trEdCur();const c=trCalc(nd);const set=(id,h)=>{const x=document.getElementById(id);if(x&&x.innerHTML!==h)x.innerHTML=h};
  e.blq.forEach((b,i)=>set('trEdBh_'+i,tBlqOk(b)?toH(tBlqH(nd.date,b.ini,b.fin,nd.cfg||undefined)):''));const o=$('#trEdO');if(o){const h=trEdObrB(nd,c);if(o.__h!==h){o.innerHTML=h;o.__h=h}}
  const k=$('#trEdChk');if(k){const h=trEdChkHtml(nd);if(k.__h!==h){k.innerHTML=h;k.__h=h}}
  const r=$('#trRight');if(r)r.__h=''/* el próximo redibujo completo no debe saltarse por la caché */}

async function trEdClick(a,b,id){const e=TR.ed;const t=TD.docs.get(id);const i=+((b.closest('[data-tri]')||{}).dataset||{}).tri;
  if(a==='edx'){const n=trEdN();if(n&&!await uiAsk({title:'¿Descartar la corrección?',text:`Tienes ${n} ${n===1?'cambio':'cambios'} sin guardar: se pierden.`,ok:'Descartar',cancel:'Seguir editando',tone:'warn'}))return;
    if(TR.ed!==e)return;TR.ed=null;if(TR.conf==='ed')TR.conf='';if(!TR.dirty&&t)trInit(t);trDraw(true);return}
  if(a==='edok')return trEdSave(id);
  if(!e.blq)return;
  if(a==='badd'){const j=TC().jor[String(pd(t.date).getUTCDay())]||TC().jor['1']||{ini:'07:30',fin:'17:00'};
    e.blq.push({id:trBid(),pc:'',ini:j.ini,fin:j.fin,dnis:Object.keys(e.rows).filter(d=>e.rows[d].as===true)});trDraw(true);return}
  if(a==='bdel'&&e.blq[i]){e.blq.splice(i,1);trDraw(true);return}
  if(a==='who'&&e.blq[i]){const d=b.dataset.v;const L=e.blq[i].dnis;e.blq[i].dnis=L.includes(d)?L.filter(x=>x!==d):[...L,d];trDraw(true);return}
  if(a==='wall'&&e.blq[i]){const p=Object.keys(e.rows).filter(d=>e.rows[d].as===true);const L=e.blq[i].dnis;const fu=L.filter(d=>!p.includes(d));e.blq[i].dnis=(L.filter(d=>p.includes(d)).length===p.length?[]:p).concat(fu);trDraw(true);return}}
/* cambios de campos del editor. Horas (desde/hasta, salida) y celdas: solo totales y avisos (trEdLive), sin redibujar la tabla:
   redibujarla mientras se teclea una hora cambiaba lo escrito (Chrome avisa «change» en cada parte de la hora). */
function trEdChange(ev,id){const el=ev.target;const e=TR.ed;if(!e||!el)return;
  const w=el.closest('[data-tre]');if(!w)return;const k=w.dataset.tre;const bi=w.closest('[data-tri]'),ro=w.closest('[data-tro]');const hm=v=>v?String(v).slice(0,5):'';
  if(bi&&e.blq){const b=e.blq[+bi.dataset.tri];if(!b)return;if(k==='pc'){b.pc=w.value;trDraw(true)}else if(k==='ini'||k==='fin'){b[k]=hm(w.value);trEdLive()}return}
  if(ro){const x=e.rows[ro.dataset.tro];if(!x)return;
    if(k==='sal'){x.sal=hm(w.value);trEdLive();return}
    if(k==='as'){x.as=w.checked;if(x.as)x.mot='';else x.alt=false}else if(k==='mot')x.mot=w.value;else if(k==='alt')x.alt=w.checked;
    trDraw(true)}}
/** guardar la corrección → true si se guardó. Los cambios son los del editor contra su base (trEdPatch); dentro de la transacción
    se comprueba que el tareo siga como estaba al abrir el editor y se aplican sobre el documento actual (trEdApply). */
async function trEdSave(id){if(TR.ed&&TR.ed.g)return trGxSave(id);const t=TD.docs.get(id);const e=TR.ed;if(!t||!e||!['env','rev'].includes(t.st)||!trEdOk()||TR.busy)return false;
  const P=trEdPatch(e);if(!P.length){toast('Aún no cambiaste nada: cambia algo o usa «Cancelar corrección».');return false}
  if(trSig(t,false)!==e.sig){TR.conf='ed';trDraw(true);toast(TR_CHG);return false}
  const nd=trEdApply(e.base,P);const cam=tCam(e.base,nd)||`${P.length} ${P.length===1?'cambio':'cambios'}`;const E=trValida(nd).filter(o=>!o.warn);
  if(E.length&&!await uiAsk({title:'La corrección deja problemas',text:'¿Guardar igual? No se podrá marcar revisado hasta resolverlos.',list:E.map(o=>o.msg),ok:'Guardar igual',tone:'warn'}))return false;
  const mot=await uiAsk({title:'Motivo de la corrección',text:`Cambios: ${cam}${t.st==='rev'?' · El tareo vuelve a «Enviado».':''}`,input:{label:'Motivo',required:true},ok:'Guardar corrección',tone:'info'});
  const m=typeof mot==='string'?mot.trim():'';if(!m||TR.ed!==e)return false;TR.busy=true;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');if(trSig(cur,false)!==e.sig)throw new Error(TR_CHG);
      const n2=trEdApply(cur,P);const c=trCalc(n2);const x=trCorExtra(cur);
      const h=trHist('cor',{mot:m,cam:(cur.st==='rev'?'Quita revisado. ':'')+(tCam(cur,n2)||cam),det:tDet(cur,n2)});
      return{rows:trClean(c.rows),...(trHrs(cur)?{pcs:n2.pcs||[]}:{blq:n2.blq||[]}),...x,hist:trAU(h),by:me.email||'',ts:NOW()}});
    if(TR.ed===e)TR.ed=null;TR.conf='';toast(t.st==='rev'?'Corrección guardada: el tareo volvió a «Enviado».':'Corrección guardada.');return true}
  catch(err){if(err&&err.message===TR_CHG&&TR.id===id)TR.conf='ed';trErr('No se pudo guardar la corrección: ',err);return false}finally{TR.busy=false;trSync()}}

/* ---------- «Sin tareo»: registrar falta en el tareo enviado de su capataz ---------- */
/* Solo si ese tareo está «Enviado» o «Revisado» (la oficina es dueña del documento). Si el capataz no tiene tareo o lo está
   llenando (borrador/reabierto) no se escribe: su celular guarda el documento entero y pisaría la falta. Ahí: «Copiar lista». */
function trFaltaOk(f,cap){const t=cap&&TD.docs.get(f+'_'+cap);return!!(t&&!t.arch&&['env','rev'].includes(t.st)&&toReabOk())}
function trFalta(dni){const p=S.tper.get(dni);const f=TD.f;if(!p||!trFaltaOk(f,p.cap))return;const tid=f+'_'+p.cap;const t=TD.docs.get(tid);
  lqModal(`<div class="lqtop"><b>Registrar falta</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">${esc(tName(p))} <span class="mono note">${esc(p.dni||dni)}</span> se agrega como ausente al tareo de <b>${esc(t.capN||tCapName(p.cap))}</b> del ${esc(fmtD(f))}.</p>
   <label>Motivo de la ausencia<select id="trFm">${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}"${k==='FA'?' selected':''}>${k} · ${esc(l)}</option>`).join('')}</select></label>
   <label>Comentario (queda en el historial)<input id="trFt" type="text" maxlength="200" placeholder="Ej. RR.HH. confirma descanso médico"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trFok">Registrar falta</button></div>`,
   async e=>{if(!e.target.closest('#trFok'))return;const mot=$('#trFm').value,txt=($('#trFt').value||'').trim();if(!txt){toast('Escribe el comentario.');$('#trFt').focus();return}
     lqClose();const row={ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',as:false,mot,alt:false,ini:'',fin:'',h:{},trab:0,ext:0};
     try{await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo del capataz cambió de estado.');if(cur.rows&&cur.rows[dni])throw new Error('Ya figura en ese tareo.');
         const otro=[...TD.docs.values()].find(x=>x.id!==tid&&!x.arch&&x.rows&&x.rows[dni]);if(otro)throw new Error(`Ya figura en el tareo de ${otro.capN||tCapName(otro.cap)}.`);
         const x=trCorExtra(cur);
         return{[`rows.${dni}`]:row,...x,hist:trAU(trHist('cor',{mot:txt,cam:`${cur.st==='rev'?'Quita revisado. ':''}Falta registrada desde «Sin tareo»: ${p.ape||dni} (${mot})`,det:[{dni,campo:'fila',antes:false,despues:true},{dni,campo:'as',antes:null,despues:false},{dni,campo:'mot',antes:null,despues:mot}]})),by:me.email||'',ts:NOW()}});
       toast('Falta registrada.')}
     catch(err){trErr('No se pudo registrar: ',err)}})}
function trSinTxt(f,G){return`Obreros sin tareo · ${fmtD(f)}\n`+G.map(g=>`${g.name}\n`+g.L.map(p=>`  ${tName(p)} — DNI ${p.dni||p.id}${p.cua?' — '+p.cua:''}`).join('\n')).join('\n')}
function trCopy(txt){(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Lista copiada.')).catch(()=>{
  lqModal(`<div class="lqtop"><b>Copia la lista</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div><textarea class="tr-copy" rows="12" readonly>${esc(txt)}</textarea>`);const ta=$('#lqm textarea');if(ta)ta.select()})}

/* ---------- secciones de «Tareos del día» (oficina) ---------- */
function trSecciones(f,L){const docs=[...TD.docs.values()];const ed=toReabOk();let h='';
  const cf=tConflictosDia(docs);
  if(cf.length)h+=`<div class="callout tr-conf" id="trConf"><b>${cf.length} ${cf.length===1?'obrero figura':'obreros figuran'} en dos tareos del día</b><span>Un obrero va en un solo tareo por día: quítalo del que no corresponde. Hasta resolverlo no se pueden marcar revisados.</span>
    <ul>${cf.map(x=>`<li data-dni="${esc(x.dni)}"><b>${esc(x.nom)}</b> <span class="mono note">${esc(x.dni)}</span><ul>${x.ts.map(y=>{const can=ed&&['env','rev'].includes(y.st);
      return`<li data-trqt="${esc(y.id)}">${esc(y.name)} · ${esc(trAsTx(y))} · <span class="note">${esc((TO_ST[y.st]||[y.st])[0])}</span>${can?` <button class="ib tr-fbtn" data-trq="${esc(y.id)}" data-dni="${esc(x.dni)}">Quitar de este tareo</button>`:ed?' <span class="note">(lo quita el capataz: aún no lo envía)</span>':''}</li>`}).join('')}</ul></li>`).join('')}</ul></div>`;
  if(tLate(f)){const late=L.filter(x=>!x.t||['bor','reab'].includes(x.t.st));
    if(late.length)h+=`<div class="callout t-warn tr-late" id="trLate"><b>${late.length} ${late.length===1?'capataz no envió':'capataces no enviaron'} su tareo a las ${esc(TC().limEnv)}</b><span>${late.map(x=>esc(x.name)).join(' · ')}</span></div>`}
  if(!tNoLab(f)){const G=tSinTareo(f,docs);const n=G.reduce((s,g)=>s+g.L.length,0);
    if(n){TD.sinTxt=trSinTxt(f,G);
      const op=(k,d)=>{const v=(TD.dOpen||{})[k];return(v==null?d:v)?' open':''};
      h+=`<details class="card tr-sin" id="trSin" data-tk="sin"${op('sin',true)}><summary><b>Sin tareo</b> <span class="to-obsn">${n}</span> <span class="note">Activos del máster que no figuran en ningún tareo del día (ni presentes ni con falta)</span></summary>
       <div class="pad"><div class="tr-sbar"><button class="ib" id="trCopy">Copiar lista</button>${ed?'<span class="note">«Registrar falta» lo agrega como ausente al tareo enviado de su capataz. Si el capataz aún no envía, avísale.</span>':''}</div>
       ${G.map(g=>{const t=g.cap&&TD.docs.get(f+'_'+g.cap);const st=t?(TO_ST[t.st||'bor']||[t.st])[0]:(g.cap?'Sin tareo':'');const can=ed&&trFaltaOk(f,g.cap);
         return`<details class="tr-sg" data-cap="${esc(g.cap)}" data-tk="g:${esc(g.cap)}"${op('g:'+g.cap,!!(t||!g.cap))}><summary><b>${esc(g.name)}</b> <span class="note">${g.L.length} ${g.L.length===1?'obrero':'obreros'}${st?' · tareo: '+esc(st):''}</span></summary>
          <ul class="t-list tr-sl">${g.L.map(p=>`<li data-tsn="${esc(p.dni||p.id)}"><span>${esc(tName(p))} <span class="mono note">${esc(p.dni||p.id)}</span>${p.cua?` <span class="note">· ${esc(p.cua)}</span>`:''}</span>${can?`<button class="ib tr-fbtn" data-trfal="${esc(p.dni||p.id)}">Registrar falta</button>`:''}</li>`).join('')}</ul></details>`}).join('')}</div></details>`}}
  return h}

/* ---------- conflicto: un obrero en dos tareos del día → «Quitar de este tareo» (tasis/admin, con motivo) ---------- */
/* Solo en tareos «Enviado» o «Revisado» (la oficina es dueña del documento; en borrador o reabierto lo quita el capataz).
   Quita su fila, lo saca de los bloques (un bloque que queda sin nadie se quita), borra su cotejo y, si estaba revisado,
   vuelve a «Enviado». Historial `cor` con motivo y detalle. */
async function trQuitar(tid,dni){const t=TD.docs.get(tid);if(!t||!toReabOk()||!['env','rev'].includes(t.st)||!(t.rows||{})[dni])return;
  const r=t.rows[dni];const nm=trNm(r)||dni;const otros=[...TD.docs.values()].filter(x=>x.id!==tid&&!x.arch&&x.rows&&x.rows[dni]).map(x=>x.capN||tCapName(x.cap));
  const mot=await uiAsk({title:'¿Quitar de este tareo?',text:`${nm} sale del tareo de ${t.capN||tCapName(t.cap)}${otros.length?` y queda solo en el de ${otros.join(' y ')}`:''}. Pierde sus horas en este tareo.${t.st==='rev'?' El tareo vuelve a «Enviado».':''}`,input:{label:'Motivo',required:true},ok:'Quitar',tone:'warn'});
  const m=typeof mot==='string'?mot.trim():'';if(!m)return;const FV={delete:trDel,arrayUnion:trAU};
  try{await trTx(tid,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');const R=cur.rows||{};if(!R[dni])throw new Error('Ya no figura en ese tareo.');
      const blq=[];for(const b of Array.isArray(cur.blq)?cur.blq:[]){if(b&&Array.isArray(b.dnis)&&b.dnis.includes(dni)){const n={...b,dnis:b.dnis.filter(x=>x!==dni)};if(n.dnis.length)blq.push(n)}else blq.push(b)}
      const R2={...R};delete R2[dni];const det=tDet(cur,{...cur,rows:R2,blq});
      const up={[`rows.${dni}`]:FV.delete(),...(trHrs(cur)?{}:{blq}),...trCorExtra(cur),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${cur.st==='rev'?'Quita revisado. ':''}Quitado de este tareo: ${R[dni].ape||dni} (${trAsTx(R[dni])})${otros.length?'; figura en el de '+otros.join(' y '):''}`,det})),by:me.email||'',ts:NOW()};
      if(cur.cot&&typeof cur.cot==='object'&&cur.cot[dni])up[`cot.${dni}`]=FV.delete();
      return up});
    toast(`${nm} ya no figura en ese tareo.`)}
  catch(err){trErr('No se pudo quitar: ',err)}}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#trConf [data-trq]');if(b&&!b.disabled)trQuitar(b.dataset.trq,b.dataset.dni)});

/* ---------- pasar un obrero al tareo de otro capataz (tasis/admin, desde la revisión) ---------- */
/* Solo entre tareos «Enviado» o «Revisado» del mismo día (la oficina es dueña de los dos documentos). No se escribe en un
   tareo en borrador o reabierto ni se crea uno a nombre del capataz: su celular guarda con update de rows/blq enteros (o set si
   aún no existe) y borraría al obrero pasado. Ver docs/ia/tareo.md («Revisión en laptop (oct 2026)»). */
/** pasa la fila de un obrero del tareo A al B (pura; no escribe). En A: sin su fila y fuera de los bloques (un bloque que queda
    vacío se quita). En B: su fila sin cotejo y sus mismos bloques: si B ya tiene uno con la misma partida y horario, se suma a
    él; si no, se crea uno igual solo con él. Sus horas se recalculan con tCalc en B. → {a, b, row} | null */
function trPasa(A,B,dni){const r0=(A&&A.rows||{})[dni];if(!r0)return null;
  /* modo:'hrs': pasa su fila con sus horas por partida y agrega al destino las partidas que no tenía (los dos deben ser del mismo modo) */
  if(trHrs(A)||trHrs(B)){if(trHrs(A)!==trHrs(B))return null;const row={...r0};delete row.fir;delete row.gar;const rA={...(A.rows||{})};delete rA[dni];
    const pcs=(Array.isArray(B.pcs)?B.pcs:[]).slice();for(const[pc,v]of Object.entries(row.h||{}))if(trHv(v)&&!pcs.includes(pc))pcs.push(pc);
    const b={...B,rows:{...(B.rows||{}),[dni]:row},pcs};const row2=trCalc(b).rows[dni]||row;return{a:{...A,rows:rA},b:{...b,rows:{...b.rows,[dni]:row2}},row:row2}}
  const blA=[],mine=[];
  for(const b of Array.isArray(A.blq)?A.blq:[]){if(!b)continue;const n=Array.isArray(b.dnis)?b.dnis:[];if(n.includes(dni)){mine.push(b);const m={...b,dnis:n.filter(x=>x!==dni)};if(m.dnis.length)blA.push(m)}else blA.push(b)}
  const blB=(Array.isArray(B.blq)?B.blq:[]).filter(Boolean).map(b=>({...b,dnis:Array.isArray(b.dnis)?b.dnis.slice():[]}));
  for(const b of mine){const y=blB.find(x=>x.pc===b.pc&&x.ini===b.ini&&x.fin===b.fin);if(y){if(!y.dnis.includes(dni))y.dnis.push(dni)}
    else blB.push({id:trBid(),pc:b.pc||'',ini:b.ini||'',fin:b.fin||'',dnis:[dni]})}
  const row={...r0};delete row.fir;delete row.gar;const rA={...(A.rows||{})};delete rA[dni];
  const b={...B,rows:{...(B.rows||{}),[dni]:row},blq:blB};const c=tCalc(b);const row2=c.rows[dni]||row;
  return{a:{...A,rows:rA,blq:blA},b:{...b,rows:{...b.rows,[dni]:row2}},row:row2}}
/** capataces a los que se puede pasar (why = por qué no): los tcap activos y los que tienen tareo ese día, menos el del tareo */
function trDestinos(t,dni){const by=new Map();for(const x of TD.docs.values())if(x&&!x.arch&&x.date===t.date&&x.id!==t.id&&x.cap!==t.cap)by.set(x.cap,x);
  const L=tCaps().filter(c=>c.id!==t.cap).map(c=>({cap:c.id,name:c.name}));for(const[cap,x]of by)if(!L.some(y=>y.cap===cap))L.push({cap,name:x.capN||tCapName(cap)||cap});
  return L.map(y=>{const d=by.get(y.cap)||null;const st=d?d.st||'bor':'sin';
    const why=!d?'aún no tiene tareo este día':trHrs(d)!==trHrs(t)?'su tareo es de otro formato (por horas / por horarios)':st==='reab'?'reabierto: lo está corrigiendo':!['env','rev'].includes(st)?'lo está llenando: que lo agregue él':(d.rows||{})[dni]?'ya figura en ese tareo':'';
    return{...y,name:(d&&d.capN)||y.name,id:d?d.id:'',st,why}}).sort((a,b)=>(!!a.why)-(!!b.why)||a.name.localeCompare(b.name))}
function trPasarDlg(id,dni){const t=TD.docs.get(id);if(!t||!toReabOk()||!['env','rev'].includes(t.st)||!(t.rows||{})[dni])return;
  if(TR.dirty){toast('Primero guarda el cotejo antes de pasar a un obrero.');return}
  const r=t.rows[dni];const nm=trNm(r)||dni;const L=trDestinos(t,dni);const ok=L.filter(x=>!x.why);
  lqModal(`<div class="lqtop"><b>Pasar a otro capataz</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg"><b>${esc(nm)}</b> <span class="mono note">${esc(dni)}</span> sale del tareo de <b>${esc(t.capN||tCapName(t.cap))}</b> y entra al del capataz que elijas, ${r.as===false?`con su falta (${esc(r.mot||'sin motivo')})`:'con sus mismas horas y partidas'}.</p>
   <div class="tr-dst" id="trPd" role="radiogroup" aria-label="Capataz destino">${L.map(x=>`<label class="tr-dso${x.why?' off':''}"><input type="radio" name="trPd" value="${esc(x.id)}" data-cap="${esc(x.cap)}"${x.why?' disabled':''}${ok.length===1&&x===ok[0]?' checked':''}><span><b>${esc(x.name)}</b> <span class="note">${esc((TO_ST[x.st]||[x.st])[0])}${x.why?' · '+esc(x.why):''}</span></span></label>`).join('')||'<p class="note">No hay otros capataces.</p>'}</div>
   <p class="note">Solo a un tareo «Enviado» o «Revisado»: si el capataz aún lo está llenando, su celular guardaría encima. La firma se coteja de nuevo en el tareo de destino; un tareo revisado vuelve a «Enviado».</p>
   <label>Motivo (queda en el historial de los dos tareos)<input id="trPm" type="text" maxlength="200" placeholder="Ej. trabajó toda la jornada con otra cuadrilla"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trPok"${ok.length?'':' disabled'}>Pasar</button></div>`,
   e=>{if(!e.target.closest('#trPok'))return;const sel=$('#lqm input[name="trPd"]:checked');const m=($('#trPm').value||'').trim();
     if(!sel){toast('Elige el capataz.');return}if(!m){toast('Escribe el motivo.');$('#trPm').focus();return}
     lqClose();trPasar(id,dni,sel.value,m)})}
/* en una transacción con los dos tareos: vuelve a comprobar estados y filas; hist `cor` con motivo y detalle en ambos */
async function trPasar(oid,dni,did,m){if(!toReabOk()||TR.busy||!did)return;TR.busy=true;const FV={delete:trDel,arrayUnion:trAU};let msg='',loc=[];
  try{const rA=fcol('tareo').doc(oid),rB=fcol('tareo').doc(did);
    await(db||FDB).runTransaction(async tx=>{const sA=await tx.get(rA),sB=await tx.get(rB);if(!sA.exists||!sB.exists)throw new Error('El tareo ya no existe.');
      const A={...sA.data(),id:oid},B={...sB.data(),id:did};const nA=A.capN||tCapName(A.cap),nB=B.capN||tCapName(B.cap);
      if(!['env','rev'].includes(A.st))throw new Error('Este tareo cambió de estado.');
      if(!['env','rev'].includes(B.st))throw new Error(`El tareo de ${nB} ya no está enviado (el capataz lo está llenando).`);
      if(A.date!==B.date||A.arch||B.arch)throw new Error('El tareo de destino no es del mismo día.');
      const r=(A.rows||{})[dni];if(!r)throw new Error('Ya no figura en este tareo.');if((B.rows||{})[dni])throw new Error(`Ya figura en el tareo de ${nB}.`);
      const x=trPasa(A,B,dni);if(!x)throw new Error('Los dos tareos son de distinto formato (por horas y por horarios): quítalo de este y que lo agregue el otro capataz.');
      const ape=r.ape||dni;const t2=NOW(),by=me.email||'';const hrs=trHrs(A);
      const upA={[`rows.${dni}`]:FV.delete(),...(hrs?{}:{blq:x.a.blq}),...trCorExtra(A),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${A.st==='rev'?'Quita revisado. ':''}Pasado al tareo de ${nB}: ${ape} (${trAsTx(r)})`,det:tDet(A,x.a)})),by,ts:t2};
      if(A.cot&&typeof A.cot==='object'&&A.cot[dni])upA[`cot.${dni}`]=FV.delete();
      const upB={[`rows.${dni}`]:trClean({[dni]:x.row})[dni],...(hrs?{pcs:x.b.pcs}:{blq:x.b.blq}),...trCorExtra(B),hist:FV.arrayUnion(trHist('cor',{mot:m,cam:`${B.st==='rev'?'Quita revisado. ':''}Recibido del tareo de ${nA}: ${ape} (${trAsTx(r)}); su firma se coteja en este tareo`,det:tDet(B,x.b)})),by,ts:t2};
      tx.update(rA,upA);tx.update(rB,upB);msg=`${ape} pasó al tareo de ${nB}.`;loc=[[oid,A,upA],[did,B,upB]]});
    for(const[i,c,u]of loc)trLocal(i,c,u);toast(msg)}
  catch(err){trErr('No se pudo pasar: ',err)}finally{TR.busy=false;trSync()}}

/* ---------- revisión de producción y jefe con edición completa (docs/ia/tareo.md «Revisión de producción — implementación» y
   «Jefe con edición completa y grilla tipo Excel») ----------
   El jefe de producción (editor con «Publica tareo») edita como la oficina (trEdOk = toReabOk, que lo incluye): coteja, corrige,
   marca o quita revisado, reabre y pasa obreros. Lo propio de producción que queda: «Conforme sin cambios» (marca prod) y, en la hoja,
   guardar cambios que SOLO tocan horas y partidas sin cambiar el estado (hist a:'prod'; lo hacen el jefe y el admin). Si cambia el
   total de HH de un obrero que estaba en el tareo (ya no coincide con lo que firmó), aviso en ámbar, confirmación y motivo obligatorio. */
const trProdOk=()=>typeof tpPubOk==='function'&&tpPubOk();
const trProdMark=()=>{const by=me.email||me.id||'';const n=toWho(by);return{t:NOW(),by,...(n&&n!==by?{byN:n}:{})}};
/** chip «Producción ✓» (lista del día, encabezado de la revisión) */
function trProdChip(t){const p=t&&t.prod;if(!p||!p.t)return'';const w=p.byN||toWho(p.by)||'';
  return` <span class="tr-prodc" data-prod="1" title="Revisado por producción${w?': '+esc(w):''} · ${esc(fmtD(ldt(p.t)))} ${esc(tHm(p.t))}">Producción ✓</span>`}
/** obreros presentes (que ya estaban en el tareo) cuyo total de HH cambia de a → b: [{dni, nom, a, b}] */
function trPrTotCh(a,b){const o=[];const ra=(a&&a.rows)||{},rb=(b&&b.rows)||{};
  for(const[d,r]of Object.entries(rb)){if(!r||r.as!==true||!ra[d])continue;const x=trHrsTot(ra[d]),y=trHrsTot(r);if(x!==y)o.push({dni:d,nom:trNm(r)||d,a:x,b:y})}
  return o.sort((p,q)=>p.nom.localeCompare(q.nom))}
/* aviso de HH totales cambiadas: una línea; la lista se despliega (con muchos obreros no tapa la hoja) */
const trPrTotHtml=ch=>ch.length?`<details class="callout t-warn tr-ptot" id="trPrTot" role="status"${ch.length<=2?' open':''}><summary><b>Cambiaste las HH totales de ${ch.length} ${ch.length===1?'obrero':'obreros'}</b>: ya no coinciden con lo que firmaron en el formato. <span class="note">Filas en ámbar.</span></summary><span>${ch.map(x=>`${esc(x.nom)} ${tHtxt(x.a)} → ${tHtxt(x.b)} h`).join(' · ')}</span></details>`:'';
/* partidas a las que se pueden mover horas: las de la hoja (menos from) y las activas no bloqueadas */
function trMvOpts(e,from){const cols=trEdCols(e).filter(pc=>pc!==from);
  const more=[...S.tpc.values()].filter(x=>x&&x.id&&!x.arch&&x.act!==false&&x.bloq!==true&&x.id!==from&&!cols.includes(x.id)).sort((a,b)=>tCmpCod(a.cod,b.cod));
  return{cols,more}}
const trMvSel=(id,more,lbl)=>`<label class="tr-mvo">${lbl}<select class="tin" id="${id}"><option value="">—</option>${more.map(x=>`<option value="${esc(x.id)}">${esc(x.cod)} · ${esc(x.nom)}</option>`).join('')}</select></label>`;
/** «Mover horas…»: horas de la celda s = {dni, pc} a otra partida (por defecto todas). Se deshace con Ctrl+Z. */
function trMvDlg(id,s){const e=TR.ed;const x=e&&s&&e.rows[s.dni];if(!x)return;if(x.as!==true){toast('No vino: no tiene horas que mover.');return}const v=x.h[s.pc]||0;if(!v){toast('Esa celda no tiene horas.');return}
  const r=(e.base.rows||{})[s.dni]||x.nw||{};const p=trPcL(s.pc);const{cols,more}=trMvOpts(e,s.pc);
  lqModal(`<div class="lqtop"><b>Mover horas a otra partida</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg"><b>${esc(trNm(r)||s.dni)}</b>: <b class="mono">${toH(v)} h</b> en <b class="mono">${esc(p.cod)}</b> ${esc(p.nom)}. Su total del día no cambia.</p>
   ${cols.length?`<div class="tr-dst" id="trMvL" role="radiogroup" aria-label="Partida destino">${cols.map((pc,i)=>{const q=trPcL(pc);return`<label class="tr-dso"><input type="radio" name="trMvP" value="${esc(pc)}"${i===0?' checked':''}><span><b class="mono">${esc(q.cod)}</b> ${esc(q.nom)} <span class="note">${toH(x.h[pc]||0)} h ahora</span></span></label>`}).join('')}</div>`:''}
   ${trMvSel('trMvO',more,cols.length?'O a otra partida (se agrega al día)':'Partida destino (se agrega al día)')}
   <label>Horas a mover <input class="tin" id="trMvN" type="text" inputmode="decimal" autocomplete="off" value="${esc(trHFmt(v))}"></label>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trMvOk">Mover</button></div>`,
   ev=>{if(!ev.target.closest('#trMvOk'))return;const o=$('#trMvO').value;const rb=$('#lqm input[name="trMvP"]:checked');const to=o||(rb&&rb.value)||'';
     if(!to){toast('Elige la partida destino.');return}let n=trHParse($('#trMvN').value);
     if(!Number.isFinite(n)||n<=0){toast('Escribe cuántas horas mover (por ejemplo 4 o 4,5).');$('#trMvN').focus();return}
     n=Math.round(n*2)/2;if(n>v){toast(`Solo hay ${tHtxt(v)} h en esa celda.`);$('#trMvN').focus();return}
     if(TR.ed!==e||e.rows[s.dni]!==x){lqClose();return}
     txSnapPush();const left=tR2(v-n);if(left)x.h[s.pc]=left;else delete x.h[s.pc];x.h[to]=tR2((x.h[to]||0)+n);if(!e.pcs.includes(to))e.pcs.push(to);
     lqClose();TX.a=TX.f={d:s.dni,k:'h:'+to};trDraw(true);txFocus();toast(`Se movieron ${tHtxt(n)} h de ${p.cod} a ${trPcL(to).cod}.`)})}
/** quitar una partida del día: sin horas se quita; con horas, moverlas a otra partida o borrarlas. Se deshace con Ctrl+Z. */
function trPcDelDlg(id,pc){const e=TR.ed;if(!e)return;const p=trPcL(pc);const W=Object.entries(e.rows).filter(([,x])=>x.h&&x.h[pc]);
  const quitar=mv=>{if(TR.ed!==e)return;txSnapPush();for(const[,x]of W){const v=x.h[pc]||0;delete x.h[pc];if(mv&&v)x.h[mv]=tR2((x.h[mv]||0)+v)}
    if(mv&&!e.pcs.includes(mv))e.pcs.push(mv);e.pcs=e.pcs.filter(y=>y!==pc);delete TX.flt['h:'+pc];if(TX.sort&&TX.sort.k==='h:'+pc)TX.sort=null;trDraw(true);txFocus()};
  if(!W.length){quitar('');return}
  const hh=tR2(W.reduce((s2,[,x])=>s2+(x.h[pc]||0),0));const{cols,more}=trMvOpts(e,pc);
  lqModal(`<div class="lqtop"><b>Quitar la partida ${esc(p.cod)}</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">${esc(p.nom)} tiene <b class="mono">${toH(hh)} h</b> de ${W.length} ${W.length===1?'obrero':'obreros'}. ¿Qué hago con esas horas?</p>
   <div class="tr-dst" id="trPdL" role="radiogroup" aria-label="Horas de la partida">${cols.map((q,i)=>{const z=trPcL(q);return`<label class="tr-dso"><input type="radio" name="trPdP" value="${esc(q)}"${i===0?' checked':''}><span>Moverlas a <b class="mono">${esc(z.cod)}</b> ${esc(z.nom)}</span></label>`}).join('')}
    <label class="tr-dso"><input type="radio" name="trPdP" value="__del"${cols.length?'':' checked'}><span><b>Borrarlas</b> <span class="note">los totales de esos obreros bajan</span></span></label></div>
   ${trMvSel('trPdO',more,'O moverlas a otra partida (se agrega al día)')}
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="trPdOk">Quitar partida</button></div>`,
   ev=>{if(!ev.target.closest('#trPdOk'))return;const o=$('#trPdO').value;const rb=$('#lqm input[name="trPdP"]:checked');const v=o||(rb&&rb.value)||'';
     if(!v){toast('Elige qué hacer con las horas.');return}lqClose();quitar(v==='__del'?'':v)})}
/** guardar los cambios de la hoja → true si se guardó. Base propia del editor (trEdPatch), transacción que comprueba que el tareo
    siga como al abrir (si no: «Recargar versión actual», que conserva los cambios) y aplica solo los cambios sobre el documento actual.
    Solo horas y partidas, del jefe o el admin → revisión de producción (a:'prod', el estado no cambia, motivo opcional salvo que
    cambien HH totales). Cualquier otro cambio, o del asistente → corrección (a:'cor', motivo obligatorio; un revisado vuelve a
    «Enviado»; el jefe y el admin además dejan la marca prod). */
async function trGxSave(id){const t=TD.docs.get(id);const e=TR.ed;if(!t||!e||!e.g||!['env','rev'].includes(t.st)||!trEdOk()||TR.busy)return false;
  if(TX.ing)txCommit(null);
  const P=trEdPatch(e);if(!P.length){toast('Aún no cambiaste nada.');return false}
  if(trSig(t,false)!==e.sig){TR.conf='ed';trDraw(true);toast(TR_CHG);return false}
  const pr=trProdOk()&&P.every(p=>p.k==='h'||p.k==='pa'||p.k==='pd');
  const nd=trEdApply(e.base,P);const ch=trPrTotCh(e.base,nd);const cam=tCam(e.base,nd)||`${P.length} ${P.length===1?'cambio':'cambios'}`;
  const v0=new Set(trValida(e.base).map(o=>o.msg));const E=trValida(nd).filter(o=>!o.warn&&!v0.has(o.msg));
  if(E.length&&!await uiAsk({title:'Los cambios dejan problemas',text:'¿Guardar igual? No se podrá marcar revisado hasta resolverlos.',list:E.map(o=>o.msg),ok:'Guardar igual',tone:'warn'}))return false;
  if(ch.length&&!await uiAsk({title:`Cambiaste las HH totales de ${ch.length} ${ch.length===1?'obrero':'obreros'}`,tone:'warn',
    text:'Ya no coinciden con lo que firmaron en el formato. Queda en el historial del tareo con tu nombre y el motivo.',list:ch.map(x=>`${x.nom}: ${tHtxt(x.a)} → ${tHtxt(x.b)} h`),ok:'Sí, cambiar los totales',cancel:'Revisar de nuevo'}))return false;
  const req=!pr||ch.length>0;
  const mot=await uiAsk({title:pr?'Guardar revisión de producción':'Guardar cambios',text:`Cambios: ${cam}${!pr&&t.st==='rev'?' · El tareo vuelve a «Enviado» (hay que revisarlo de nuevo).':''}`,
    input:{label:req?(ch.length?'Motivo (obligatorio: cambiaste HH totales)':'Motivo'):'Motivo (opcional)',required:req},ok:'Guardar',tone:'info'});
  if(mot==null||mot===false||TR.ed!==e)return false;const m=String(mot).trim();if(req&&!m)return false;
  TR.busy=true;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');if(trSig(cur,false)!==e.sig)throw new Error(TR_CHG);
      const n2=trEdApply(cur,P);const c=trCalc(n2);const ch2=trPrTotCh(cur,n2);
      let cm=(ch2.length?`Cambió HH totales (${ch2.map(x=>`${x.nom.split(',')[0]} ${tHtxt(x.a)} → ${tHtxt(x.b)}`).join(', ')}). `:'')+(tCam(cur,n2)||cam);
      const cut=s=>s.length>400?s.slice(0,397)+'…':s;
      if(pr)return{rows:trClean(c.rows),pcs:n2.pcs||[],prod:trProdMark(),hist:trAU(trHist('prod',{...(m?{mot:m}:{}),cam:cut(cm),det:tDet(cur,n2),tot:ch2.length>0})),by:me.email||'',ts:NOW()};
      cm=(cur.st==='rev'?'Quita revisado. ':'')+cm;
      const up={rows:trClean(c.rows),pcs:n2.pcs||[],...trCorExtra(cur),...(trProdOk()?{prod:trProdMark()}:{}),hist:trAU(trHist('cor',{mot:m,cam:cut(cm),det:tDet(cur,n2),...(ch2.length?{tot:true}:{})})),by:me.email||'',ts:NOW()};
      /* obrero quitado: también su cotejo */
      for(const p of P)if(p.k==='rd'&&cur.cot&&typeof cur.cot==='object'&&cur.cot[p.d])up[`cot.${p.d}`]=trDel();
      return up});
    if(TR.ed===e)TR.ed=null;TR.conf='';
    toast(pr?(ch.length?'Revisión guardada: cambiaron HH totales (queda en el historial).':'Revisión de producción guardada.'):t.st==='rev'?'Cambios guardados: el tareo volvió a «Enviado».':'Cambios guardados.');return true}
  catch(err){if(err&&err.message===TR_CHG&&TR.id===id)TR.conf='ed';trErr('No se pudo guardar: ',err);return false}finally{TR.busy=false;trSync();txFocus()}}
/** «Conforme sin cambios»: solo marca prod (y su entrada en el historial) */
async function trProdConf(id){const t=TD.docs.get(id);if(!t||!['env','rev'].includes(t.st)||!trProdOk()||TR.busy)return;
  if(TR.ed&&trEdN()){toast('Tienes cambios sin guardar: guárdalos o descártalos.');return}
  if(!await uiAsk({title:'¿Conforme sin cambios?',text:'Queda marcado «Revisado por producción» con tu nombre. No cambia nada del tareo.',ok:'Conforme',tone:'ok'}))return;
  const sig0=TR.ed?TR.ed.sig:trSig(t,false);TR.busy=true;
  try{await trTx(id,cur=>{if(!['env','rev'].includes(cur.st))throw new Error('El tareo cambió de estado.');if(trSig(cur,false)!==sig0)throw new Error(TR_CHG);
      return{prod:trProdMark(),hist:trAU(trHist('prod',{cam:'Conforme sin cambios'})),by:me.email||'',ts:NOW()}});
    toast('Revisado por producción ✓')}
  catch(err){if(err&&err.message===TR_CHG&&TR.id===id)TR.conf='ed';trErr('No se pudo marcar: ',err)}finally{TR.busy=false;trSync()}}

/* ---------- hoja tipo Excel (tareos por horas «Enviado» o «Revisado»; docs/ia/tareo.md «Jefe con edición completa y grilla tipo
   Excel») ----------
   Una tabla con encabezado, primeras 5 columnas y totales fijos; la selección y la edición son de la hoja (no hay un input por celda):
   clic / Mayús+clic / arrastrar, flechas, Tab, Enter, F2, Supr, escribir reemplaza, Ctrl+C / Ctrl+V (también rangos de Excel con
   tabulaciones), Ctrl+D, Ctrl+Z / Ctrl+Y. Lo editado va a TR.ed (horas, asistencia, motivo, altura, salida, obreros y partidas) o al
   cotejo en edición (TR.fir / TR.gar: Firmó y Garita, solo en «Enviado»). Se guarda con «Guardar cambios» / «Guardar cotejo».
   TX: a = celda activa (ancla) y f = esquina de la selección ({d: dni, k: columna}), flt = filtros por columna ({k: Set de valores
   visibles}), q = buscador, sort {k, dir}, fx = filtros rápidos ('chg' cambiados, 'nej' total ≠ jornada), un/re = deshacer/rehacer
   (fotos del estado editable), ing = celda en edición {d, k, rep}, drag, menu = filtro abierto {k}, X = lo último dibujado, seq =
   orden de los obreros agregados. */
const TX={a:null,f:null,flt:{},q:'',sort:null,fx:new Set(),un:[],re:[],ing:null,drag:false,menu:null,X:null,seq:0};
function txReset(){Object.assign(TX,{a:null,f:null,flt:{},q:'',sort:null,fx:new Set(),un:[],re:[],ing:null,drag:false,X:null});txMenuX()}
/* anchos de las columnas fijas (N°, DNI, apellidos y nombres, cuadrilla, categoría): los mismos que en app.css (.tx-t .tx-fz) */
const TX_FZW=[40,82,200,100,58];
const TX_EMPTY='(vacías)';
const TX_IC={dn:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6.5 8 10l3.5-3.5"/></svg>',flt:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11L9.2 8.6v4.2l-2.4 1.1V8.6z"/></svg>',
  q:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.3"/><path d="m10.2 10.2 3.3 3.3"/></svg>'};
const txNorm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/* Firmó / Garita se editan en un tareo «Enviado» (como el cotejo de siempre) */
const txCot=t=>trEdOk()&&!!t&&t.st==='env';
const txFocus=()=>{const W=$('#txW');if(W&&document.activeElement!==W)try{W.focus({preventScroll:true})}catch(e){}};
/* sí/no escrito a mano: S, Sí, V, 1, X → true · N, No, 0 → false (alt: también A o (A)) */
const txBool=(s,alt)=>{s=txNorm(s).trim();if(/^(s|si|v|vino|1|x|y|ok|true)$/.test(s)||(alt&&/^\(?a\)?$/.test(s)))return true;if(/^(n|no|no vino|0|f|false)$/.test(s))return false;return null};
/* hora escrita a mano → 'HH:MM' ('' vacía; null no válida): 15:30, 15.30, 1530, 7:5 no; 7 → 07:00 */
const txHm=s=>{s=String(s==null?'':s).trim();if(!s)return'';let m=s.match(/^(\d{1,2})[:.h]?(\d{2})$/);if(!m){const n=s.match(/^(\d{1,2})$/);if(n)m=[0,n[1],'00']}
  if(!m)return null;const h=+m[1],mi=+m[2];if(h>23||mi>59)return null;return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')};
/** columnas de la hoja: fijas, asistencia, una por partida (pcs + las que tengan horas), totales, altura, salida, cotejo, obs. y acciones */
function txColsOf(e,cot){const C=[{k:'n',l:'N°',fz:1,num:1,nof:1,t:'Número de fila (clic: elige la fila)'},{k:'dni',l:'DNI',fz:1},{k:'nm',l:'Apellidos y nombres',fz:1},{k:'cua',l:'Cuadrilla',fz:1},{k:'cat',l:'Cat.',fz:1,t:'Categoría'},
  {k:'as',l:'Vino',w:64,ed:1,t:'Asistencia: escribe S o N (espacio cambia)'},{k:'mot',l:'Motivo',w:76,ed:1,t:'Motivo si no vino: '+Object.entries(TO_MOT).map(([k,l])=>k+' '+l).join(', ')}];
  for(const pc of trEdCols(e)){const p=trPcL(pc);C.push({k:'h:'+pc,pc,l:p.cod,sub:p.nom,w:78,ed:1,num:1,bloq:p.bloq,t:p.cod+' · '+p.nom+(p.bloq?' · BLOQUEADA por costos':'')})}
  C.push({k:'tot',l:'Total',w:70,num:1,t:'Horas trabajadas en el día (verde = jornada completa)'},{k:'he',l:'HE',w:56,num:1,t:'Horas extra'},
    {k:'fdo',l:'Firmado',w:86,num:1,t:'Total al abrir: lo que firmó en el formato'},{k:'alt',l:'Altura',w:72,ed:1,t:'Trabajo en altura, bono (A): escribe A o espacio'},
    {k:'sal',l:'Salida',w:72,ed:1,t:'Hora de salida, solo si salió antes o después de lo normal'},
    {k:'fir',l:'Firmó',w:86,ed:cot?1:0,t:cot?'Cotejo con la foto: S o N (espacio cambia)':'Cotejo de firmas (se marca en un tareo «Enviado»)'},
    {k:'gar',l:'Garita',w:74,ed:cot?1:0,t:'Hora de salida en garita (opcional)'},{k:'obs',l:'Observaciones',w:190},{k:'x',l:'',w:66,nof:1,t:'⇄ pasar a otro capataz · ✕ quitar del tareo'});
  return C}
/* orden de las filas: los que vinieron (al abrir) por apellido, luego los que no, y al final los agregados en la hoja */
const txOrd=(B,e)=>(p,q)=>{const k=d=>B[d]?(B[d].as===true?0:1):2;const a=k(p),b=k(q);if(a!==b)return a-b;
  if(a===2)return(((e.rows[p].nw||{}).i||0)-((e.rows[q].nw||{}).i||0))||p.localeCompare(q);return(B[p].ape||'').localeCompare(B[q].ape||'')||p.localeCompare(q)};
/** todo lo que se dibuja: filas (con su cálculo, su base y sus observaciones), columnas, filas visibles (filtros y orden) */
function txCtx(t){const e=TR.ed;const nd=trEdCur();const dv={...nd,rows:trRows(nd.rows)};const c=trCalc(dv);
  const D=tDia(nd.date||todayIso(),nd.cfg);const B=e.base.rows||{};const bs=trEdState(e.base).rows;const cot=txCot(t);
  const ob=tObsRev(dv,c);const oD=new Map();for(const o of ob)if(o.dni&&o.k!=='firp')oD.set(o.dni,(oD.get(o.dni)||[]).concat(o));
  const all=Object.keys(e.rows).sort(txOrd(B,e)).map((d,i)=>({d,i:i+1,x:e.rows[d],r:dv.rows[d]||{},c:c.rows[d]||{},b:B[d]||null,bs:bs[d]||null,ob:oD.get(d)||[]}));
  const X={t,e,nd,c,D,cot,fok:trFotosOk(t),cols:txColsOf(e,cot),all,ob,pas:['env','rev'].includes(t.st)};
  for(const R of all){R.ch=txRowCh(R);R.tch=R.x.as===true&&!!R.b&&trHrsTot(R.b)!==(R.c.trab||0)}
  X.rows=all.filter(R=>txPass(R,X,null));
  if(TX.sort){const col=X.cols.find(z=>z.k===TX.sort.k);if(col){const dir=TX.sort.dir;
    X.rows.sort((p,q)=>{const a=txVal(p,col),b=txVal(q,col);const ea=a===''||a==null,eb=b===''||b==null;if(ea!==eb)return ea?1:-1;if(ea)return p.i-q.i;
      const r=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'es',{numeric:true});return r?r*dir:p.i-q.i})}else TX.sort=null}
  return X}
function txRowCh(R){if(!R.bs)return true;const{x,bs,d}=R;if(x.as!==bs.as||(x.mot||'')!==(bs.mot||'')||!!x.alt!==!!bs.alt||(x.sal||'')!==(bs.sal||''))return true;
  for(const pc of new Set([...Object.keys(x.h||{}),...Object.keys(bs.h||{})]))if((x.h[pc]||0)!==(bs.h[pc]||0))return true;
  return TR.fir[d]!==TR.b.fir[d]||(TR.gar[d]||'')!==(TR.b.gar[d]||'')}
function txCellCh(R,col){if(!col.ed&&!col.pc&&col.k!=='fir'&&col.k!=='gar')return false;if(!R.bs)return!!(col.ed||col.pc);const{x,bs,d}=R;
  if(col.pc)return(x.h[col.pc]||0)!==(bs.h[col.pc]||0);
  switch(col.k){case'as':return x.as!==bs.as;case'mot':return(x.mot||'')!==(bs.mot||'');case'alt':return!!x.alt!==!!bs.alt;case'sal':return(x.sal||'')!==(bs.sal||'');
    case'fir':return TR.fir[d]!==TR.b.fir[d];case'gar':return(TR.gar[d]||'')!==(TR.b.gar[d]||'')}return false}
/** valor de una celda (número o texto; '' vacía): lo que se copia, se ordena y se suma */
function txVal(R,col){const{x,r,c}=R;const pres=x.as===true;if(col.pc)return x.h[col.pc]||'';
  switch(col.k){case'n':return R.i;case'dni':return R.d;case'nm':return trNm(r)||R.d;case'cua':return r.cua||'';case'cat':return r.cat||'';
    case'as':return x.as===true?'Sí':x.as===false?'No':'';case'mot':return x.as===false?(x.mot||''):'';
    case'tot':return pres?(c.trab||0):'';case'he':return pres&&c.ext?c.ext:'';case'fdo':return R.b&&R.b.as===true?trHrsTot(R.b):'';
    case'alt':return pres&&x.alt?'A':'';case'sal':return pres?(x.sal||''):'';
    case'fir':return pres?(r.fir===true?'Sí':r.fir===false?'No':''):'';case'gar':return pres?(r.gar||''):'';
    case'obs':return R.ob.map(o=>TR_TAG[o.k]||'Revisar').join(', ')}return''}
const txRaw=(R,col)=>{const v=txVal(R,col);return v==null?'':String(v)};
/* valor para los filtros (lo que se ve en la lista del menú) */
function txFv(R,col){if(col.k==='as')return R.x.as===true?'Vino':R.x.as===false?'No vino':'Sin marcar';const v=txVal(R,col);if(v===''||v==null)return TX_EMPTY;return typeof v==='number'?toH(v):String(v)}
const txFvCmp=col=>(a,b)=>a===b?0:a===TX_EMPTY?1:b===TX_EMPTY?-1:col.num?(parseFloat(a.replace(/,/g,''))-parseFloat(b.replace(/,/g,''))):a.localeCompare(b,'es',{numeric:true});
/** ¿la fila pasa los filtros? (skip: la columna cuyo menú se arma, para ofrecer sus valores como en Excel) */
function txPass(R,X,skip){if(TX.q){const q=txNorm(TX.q).trim();if(q&&!txNorm([R.d,trNm(R.r),R.r.cua,R.r.cat].join(' ')).includes(q))return false}
  if(TX.fx.has('chg')&&!R.ch)return false;
  if(TX.fx.has('nej')&&skip!=='tot'&&(R.x.as!==true||(!X.D.nl&&X.D.jh>0&&(R.c.trab||0)===X.D.jh)))return false;
  for(const[k,S2]of Object.entries(TX.flt)){if(k===skip)continue;const col=X.cols.find(z=>z.k===k);if(col&&(S2.hon?txFv(R,col)===TX_EMPTY:!S2.has(txFv(R,col))))return false}
  return true}
/** ¿se puede escribir en esa celda? */
function txEd(R,col,X){if(!col.ed||!TR.ed||!TR.ed.g)return false;const pres=R.x.as===true;
  if(col.k==='as')return true;if(col.k==='mot')return R.x.as===false;if(col.pc||col.k==='alt'||col.k==='sal')return pres;
  if(col.k==='fir')return X.cot&&pres&&!!R.b&&X.fok;if(col.k==='gar')return X.cot&&pres&&!!R.b;return false}
function txWhy(R,col,X){const pres=R.x.as===true;
  if(['n','dni','nm','cua','cat'].includes(col.k))return'Los datos del obrero vienen del máster de Personal.';
  if(['tot','he','fdo','obs','x'].includes(col.k))return'Esta columna se calcula: no se escribe.';
  if(col.k==='mot')return'El motivo es solo para los que no vinieron.';
  if(col.k==='fir'||col.k==='gar'){if(!X.cot)return X.t.st==='rev'?'Revisado: usa «Quitar revisado» para cambiar el cotejo.':'El cotejo se hace en un tareo «Enviado».';
    if(!pres)return'Solo se coteja a los que vinieron.';if(!R.b)return'Guarda primero: el obrero recién agregado se coteja después.';return'Espera a que cargue la foto del formato para cotejar.'}
  if(!pres)return'No vino: pon «Sí» en «Vino» para ponerle horas.';return'Esta celda no se edita.'}
const txTotK=(R,X)=>{const v=R.c.trab||0;if(v<=0||v>16)return'bad';if(X.D.nl||!(X.D.jh>0))return'wn';return v===X.D.jh?'ok':'wn'};
function txTd(R,col,X){const{x,r,c,d}=R;const pres=x.as===true;const v=txVal(R,col);let cls='tx-c'+(col.fz?' tx-fz':'')+(col.num?' tx-n':'');let h='',id='';
  if(col.ed||col.pc||col.k==='fir'||col.k==='gar')cls+=txEd(R,col,X)?' tx-e':' tx-ro';if(txCellCh(R,col))cls+=' tx-ch';
  if(col.pc){id=` id="trh_${esc(d)}_${esc(col.pc)}"`;h=v?toH(v):'';if(!pres&&v)cls+=' tx-x';if(col.bloq&&v&&pres)cls+=' tx-bad'}
  else switch(col.k){
    case'n':h=String(R.i);break;case'dni':h=esc(d);break;
    case'nm':{const aj=r.ajeno||(x.nw&&x.nw.ajeno);h=`<b>${esc(r.ape||d)}</b>${r.nom?` <span class="tx-nom">${esc(r.nom)}</span>`:''}${R.bs?'':' <span class="tx-tag tx-tnw">nuevo</span>'}${aj?' <span class="tx-tag" title="No es de la cuadrilla de este capataz">otra cuadrilla</span>':''}`;cls+=' tx-nm';break}
    case'cua':h=esc(r.cua||'');break;case'cat':h=esc(r.cat||'');break;
    case'as':h=x.as===true?'<span class="tx-si">Sí</span>':x.as===false?'<span class="tx-no">No</span>':'<span class="tx-smk">Sin marcar</span>';break;
    case'mot':h=x.as===false&&x.mot?`<span title="${esc(TO_MOT[x.mot]||'')}">${esc(x.mot)}</span>`:'';break;
    case'tot':id=` id="trht_${esc(d)}"`;if(pres){cls+=' tx-'+txTotK(R,X);h=toH(c.trab||0)}break;
    case'he':id=` id="trhe_${esc(d)}"`;h=pres&&c.ext?toH(c.ext):'';break;
    case'fdo':h=v===''?'':toH(v);cls+=R.tch?' tx-fdc':' tx-mu';break;
    case'alt':h=pres&&x.alt?'<b>(A)</b>':'';break;case'sal':h=pres&&x.sal?esc(x.sal):'';break;
    case'fir':h=!pres?'':r.fir===true?'<span class="tx-si">Sí</span>':r.fir===false?'<span class="tx-no">No firmó</span>':X.cot&&R.b?'<span class="tx-pend">Por cotejar</span>':'';break;
    case'gar':h=pres&&r.gar?esc(r.gar):'';if(R.ob.some(o=>o.k==='gar'))cls+=' tx-wn';break;
    case'obs':h=R.ob.map(o=>`<span class="tr-tg${o.bl?' tr-tgb':''}" data-k="${esc(o.k)}" title="${esc(o.msg)}">${esc(TR_TAG[o.k]||'Revisar')}</span>`).join('');cls+=' tx-ob';break;
    case'x':{const nm=esc(r.ape||d);h=`${R.bs&&X.pas?`<button class="tx-rb" data-tra="pas" data-v="${esc(d)}" title="Pasar a otro capataz…" aria-label="Pasar a ${nm} a otro capataz" tabindex="-1">⇄</button>`:''}<button class="tx-rb tx-rbx" data-txa="rm" data-v="${esc(d)}" title="Quitar del tareo (Ctrl+Z deshace)" aria-label="Quitar a ${nm} del tareo" tabindex="-1">✕</button>`;cls+=' tx-xc';break}}
  return`<td class="${cls}"${id}>${h}</td>`}
function txTable(X){const{cols,rows}=X;const wd=(c,j)=>c.fz?TX_FZW[j]:c.w;const W=cols.reduce((s,c,j)=>s+wd(c,j),0);
  const th=cols.map((c,j)=>{const f=!!TX.flt[c.k]||(c.k==='tot'&&TX.fx.has('nej'));const so=TX.sort&&TX.sort.k===c.k?TX.sort.dir:0;
    return`<th class="tx-h${c.fz?' tx-fz':''}${c.num?' tx-n':''}${c.pc?' tx-hp':''}${c.bloq?' tx-hb':''}${f?' tx-hf':''}" data-k="${esc(c.k)}"${c.pc?` data-pc="${esc(c.pc)}"`:''} scope="col"${c.t?` title="${esc(c.t)}"`:''}${so?` aria-sort="${so>0?'ascending':'descending'}"`:''}><span class="tx-hl"><b>${esc(c.l)}${so?`<i class="tx-so" aria-hidden="true">${so>0?'↑':'↓'}</i>`:''}</b>${c.sub?`<small>${esc(c.sub)}</small>`:''}</span>${c.nof?'':`<button class="tx-fb${f?' on':''}" data-txf="${esc(c.k)}" aria-label="Filtrar y ordenar: ${esc(c.l)}" aria-haspopup="dialog" tabindex="-1">${f?TX_IC.flt:TX_IC.dn}</button>`}${c.pc?`<button class="tx-fb tx-hx" data-tra="pcdel" data-v="${esc(c.pc)}" aria-label="Quitar la partida ${esc(c.l)}" title="Quitar la partida del día" tabindex="-1">✕</button>`:''}</th>`}).join('');
  const body=rows.map((R,i)=>{const{x}=R;const cl=[x.as===true?'':x.as===false?'tx-no':'tx-sm',R.tch?'tx-tch':'',R.bs?'':'tx-new',R.ob.some(o=>o.bl)?'tx-bl':''].filter(Boolean).join(' ');
      return`<tr data-dni="${esc(R.d)}"${cl?` class="${cl}"`:''}>${cols.map(c=>txTd(R,c,X)).join('')}<td class="tx-fill"></td></tr>`}).join('')
    ||`<tr class="tx-empty"><td colspan="${cols.length+1}">${X.all.length?'Ningún obrero cumple los filtros. <button class="ib" data-txa="clr">Limpiar filtros</button>':'No hay obreros en este tareo: usa «+ Obrero».'}</td></tr>`;
  const P=rows.filter(R=>R.x.as===true);const sm=f=>toH(tR2(P.reduce((s,R)=>s+(+f(R)||0),0)));
  const ft=cols.map(c=>{let h='',id='';
    if(c.k==='nm')h=`<b>Total</b> <span class="note">${P.length} ${P.length===1?'vino':'vinieron'}${rows.length<X.all.length?' · filtrado':''}</span>`;
    else if(c.pc){id=` id="trhc_${esc(c.pc)}"`;h=sm(R=>R.x.h[c.pc])}else if(c.k==='tot'){id=' id="trhg"';h=sm(R=>R.c.trab)}else if(c.k==='he'){id=' id="trhx"';h=sm(R=>R.c.ext)}
    else if(c.k==='fdo')h=sm(R=>R.b&&R.b.as===true?trHrsTot(R.b):0);
    return`<td class="tx-c${c.fz?' tx-fz':''}${c.num?' tx-n':''}"${id}>${h}</td>`}).join('');
  /* la última columna (sin ancho) se queda con el sobrante: las demás miden siempre lo mismo (las fijas no se corren) */
  return`<table class="tx-t" id="txT" style="min-width:${W+24}px"><colgroup>${cols.map((c,j)=>`<col style="width:${wd(c,j)}px">`).join('')}<col></colgroup><thead><tr>${th}<th class="tx-fill" aria-hidden="true"></th></tr></thead><tbody>${body}</tbody><tfoot><tr>${ft}<td class="tx-fill"></td></tr></tfoot></table>`}
const txAny=()=>!!(Object.keys(TX.flt).length||TX.q.trim()||TX.fx.size);
const txCntTxt=X=>X.rows.length===X.all.length?`${X.all.length} ${X.all.length===1?'obrero':'obreros'}`:`Mostrando ${X.rows.length} de ${X.all.length}`;
function txBarHtml(X){const chips=Object.entries(TX.flt).map(([k,S2])=>{const c=X.cols.find(z=>z.k===k);if(!c)return'';const L=S2.hon?['con horas']:[...S2];
    return`<span class="tx-chip" data-k="${esc(k)}"><span><b>${esc(c.l)}</b> ${esc(L.slice(0,2).join(', '))}${L.length>2?` +${L.length-2}`:''}</span><button data-txcx="${esc(k)}" aria-label="Quitar el filtro de ${esc(c.l)}" title="Quitar este filtro">✕</button></span>`}).join('');
  const cols=trEdCols(X.e);const opts=[...S.tpc.values()].filter(x=>x&&x.id&&!x.arch&&x.act!==false&&x.bloq!==true&&!cols.includes(x.id)).sort((a,b)=>tCmpCod(a.cod,b.cod));
  const P=X.all.filter(R=>R.x.as===true&&R.b);const nCot=P.filter(R=>R.r.fir===true||R.r.fir===false).length;
  return`<div class="tx-bar" id="txBar"><div class="tx-tools" role="toolbar" aria-label="Herramientas de la hoja">
    <button class="ib tx-fo${TR.pfo?' on':''}" data-tra="pfo" id="trPfo" aria-pressed="${!!TR.pfo}" title="Muestra u oculta la foto del formato (arrastra su borde para cambiar el ancho)">${TR.pfo?'Ocultar foto':'Ver foto'}</button>
    <span class="tx-grp"><button class="ib tx-ic" data-txa="un" id="txUn" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"${TX.un.length?'':' disabled'}>↶</button><button class="ib tx-ic" data-txa="re" id="txRe" title="Rehacer (Ctrl+Y)" aria-label="Rehacer"${TX.re.length?'':' disabled'}>↷</button></span>
    <span class="tx-grp"><button class="ib" data-txa="fill" id="txFill" title="Pone un mismo valor en las celdas elegidas · Ctrl+D copia la primera fila hacia abajo">Rellenar con…</button><button class="ib" data-tra="mv" id="trMv" title="Pasa horas de la celda elegida a otra partida (su total no cambia)">Mover horas…</button>${X.cot&&P.length?`<button class="ib" data-tra="all" id="trAll"${X.fok?'':' disabled title="Espera a que cargue la foto del formato"'}>Todos firmaron</button>`:''}</span>
    <span class="tx-grp"><button class="ib" data-txa="addo" id="txAddO" title="Agrega un obrero del máster a este tareo">+ Obrero</button><select class="tin tx-pcadd" id="trPcAdd" aria-label="Agregar una partida del día"><option value="">+ Partida…</option>${opts.map(x=>`<option value="${esc(x.id)}">${esc(x.cod)} · ${esc(x.nom)}</option>`).join('')}</select></span>
</div>
   <div class="tx-flts"><label class="tx-q">${TX_IC.q}<input class="tin" id="txQ" type="search" placeholder="Buscar obrero, DNI o cuadrilla" value="${esc(TX.q)}" aria-label="Buscar en la hoja" autocomplete="off"></label>
    <button class="tx-tg" data-txfx="chg" aria-pressed="${TX.fx.has('chg')}" title="Solo las filas que cambiaste">Solo cambiados</button>
    <button class="tx-tg" data-txfx="nej" aria-pressed="${TX.fx.has('nej')}" title="Solo los que vinieron y no suman la jornada del día">Total ≠ jornada</button>
    <span class="tx-chips" id="txChips">${chips}</span>
    <button class="ib tx-clr" data-txa="clr" id="txClr"${txAny()?'':' hidden'}>Limpiar filtros</button>
    <span class="note tx-cnt"><span id="txCnt">${txCntTxt(X)}</span> · ${X.D.nl?'día no laborable: todo es extra':`jornada ${toH(X.D.jh)} h`}${X.cot?` · <span id="trCotN">${nCot} de ${P.length} cotejados</span>`:''}</span></div></div>`}
function trHistHtml(t){const hist=(Array.isArray(t.hist)?t.hist:[]).slice().sort((a,b)=>(a.t||0)-(b.t||0));
  return`<details class="card tr-dt" id="trHistD" data-trop="hist"${TR.op.hist?' open':''}><summary><b>Historial</b> <span class="note">${hist.length}</span></summary>
    ${hist.length?`<ul class="t-list to-hist" id="trHist">${hist.map(x=>`<li data-a="${esc(x.a||'')}"><span class="mono">${esc(fmtD(ldt(x.t||0)))} ${esc(tHm(x.t))}</span> · <b>${esc(TO_HA[x.a]||x.a||'')}</b> · ${esc(toWho(x.by))}${x.mot?': '+esc(x.mot):''}${x.cam?`<div class="t-chg">${esc(x.cam)}</div>`:''}</li>`).join('')}</ul>`:'<p class="note">Sin movimientos.</p>'}</details>`}
/** panel derecho en la hoja: avisos, observaciones (plegables), herramientas y filtros, la hoja, la barra de suma e historial */
function txPanel(t,M){const X=txCtx(t);TX.X=X;txFix(X);const ch=trPrTotCh(X.e.base,X.nd);const vis=X.ob.filter(o=>o.k!=='firp');const nb=vis.filter(o=>o.bl).length;
  const oo=!!TR.op.obs;/* plegadas: cada fila lleva sus etiquetas en «Observaciones» */
  return`<div id="trAv">${trAvisos()}</div>
   ${t.st==='rev'&&t.revBy?`<div class="callout tr-okc">Revisado por ${esc(toWho(t.revBy))}${t.revAt?' a las '+esc(tHm(t.revAt)):''}.</div>`:''}
   ${t.prod&&t.prod.t?`<div class="callout tr-okc tr-prodn" id="trProdV">Revisado por producción: ${esc(t.prod.byN||toWho(t.prod.by))} · ${esc(fmtD(ldt(t.prod.t)))} ${esc(tHm(t.prod.t))}.</div>`:''}
   ${tCotVieja(t)?`<div class="callout t-warn" id="trCotV">El capataz cambió las fotos después del cotejo: vuelve a cotejar las firmas con el formato nuevo.</div>`:''}
   <div id="trPrTotW">${trPrTotHtml(ch)}</div>
   ${vis.length?`<details class="callout t-warn to-obs tx-obs" id="trObs" data-trop="obs"${oo?' open':''}><summary><b>${vis.length} ${vis.length===1?'observación':'observaciones'}</b>${nb?` <span class="tx-obn">${nb} ${nb===1?'impide':'impiden'} marcar revisado</span>`:''}</summary><ul>${vis.map(o=>`<li data-k="${esc(o.k)}"${o.bl?' class="tr-obl"':''}>${esc(o.msg)}</li>`).join('')}</ul></details>`:''}
   <section class="card tx-card" aria-label="Hoja del tareo">${txBarHtml(X)}
    <div class="tx-w tr-ks" id="txW" tabindex="0" role="grid" aria-label="Hoja del tareo: obreros y horas por partida" aria-multiselectable="true">${txTable(X)}</div>
    <div class="tx-sum" id="txSum" role="status" aria-live="polite">${txSumHtml(X)}</div></section>
   ${trHistHtml(t)}`}
/* la celda activa y la selección siguen en filas y columnas visibles (si no, la primera celda de horas) */
function txFix(X){const ok=p=>!!p&&X.rows.some(R=>R.d===p.d)&&X.cols.some(c=>c.k===p.k);
  if(!ok(TX.a)){const R=X.rows[0];const c=X.cols.find(z=>z.pc)||X.cols.find(z=>z.k==='as');TX.a=TX.f=R&&c?{d:R.d,k:c.k}:null}else if(!ok(TX.f))TX.f=TX.a}
const txIx=(X,p)=>p?{r:X.rows.findIndex(R=>R.d===p.d),c:X.cols.findIndex(c=>c.k===p.k)}:null;
const txPos=X=>{const p=X&&txIx(X,TX.a);return p&&p.r>=0&&p.c>=0?p:null};
function txRect(X){const a=txPos(X);if(!a)return null;let f=txIx(X,TX.f);if(!f||f.r<0||f.c<0)f=a;
  return{r0:Math.min(a.r,f.r),r1:Math.max(a.r,f.r),c0:Math.min(a.c,f.c),c1:Math.max(a.c,f.c),ar:a.r,ac:a.c}}
const txCell=(r,c)=>{const T=$('#txT');const tr=T&&T.tBodies[0].rows[r];return tr&&!tr.classList.contains('tx-empty')?tr.cells[c]:null};
/** barra de abajo: celda o rango elegido, Suma, Promedio y Cuenta (como Excel) */
function txSumHtml(X){const s=txRect(X);if(!s)return'<span class="note">Elige una celda.</span>';let n=0,sum=0,cnt=0;
  for(let r=s.r0;r<=s.r1;r++)for(let c=s.c0;c<=s.c1;c++){const col=X.cols[c],R=X.rows[r];if(col.k==='x')continue;const v=txVal(R,col);if(v!==''&&v!=null)cnt++;
    if(typeof v==='number'&&col.k!=='n'&&!(col.pc&&R.x.as!==true)){sum+=v;n++}}
  const R=X.rows[s.ar],col=X.cols[s.ac];const one=s.r0===s.r1&&s.c0===s.c1;
  const adr=one?`${R.r.ape||R.d} · ${col.l||'Acciones'}`:`${s.r1-s.r0+1} ${s.r1>s.r0?'filas':'fila'} × ${s.c1-s.c0+1} ${s.c1>s.c0?'columnas':'columna'}`;
  return`<span class="tx-adr" id="txAdr">${esc(adr)}</span>${n?`<span>Suma <b id="txSs">${toH(tR2(sum))}</b></span><span>Promedio <b id="txSp">${toH(tR2(sum/n))}</b></span>`:''}<span>Cuenta <b id="txSc">${cnt}</b></span><span class="tx-kh">F2 edita · Ctrl+C / Ctrl+V · Ctrl+D rellena · Ctrl+Z deshace</span>`}
/** pinta la selección (sin redibujar la tabla) y actualiza la barra de suma */
function txPaint(){const X=TX.X;const T=$('#txT');if(!X||!T)return;
  T.querySelectorAll('.tx-sel,.tx-act,.tx-hs').forEach(z=>z.classList.remove('tx-sel','tx-act','tx-hs'));
  const s=txRect(X);const tb=T.tBodies[0];
  if(s){const hr=T.tHead.rows[0];for(let c=s.c0;c<=s.c1;c++)if(hr.cells[c])hr.cells[c].classList.add('tx-hs');
    for(let r=s.r0;r<=s.r1;r++){const tr=tb.rows[r];if(!tr||tr.classList.contains('tx-empty'))continue;tr.cells[0].classList.add('tx-hs');for(let c=s.c0;c<=s.c1;c++)if(tr.cells[c])tr.cells[c].classList.add('tx-sel')}
    const a=txCell(s.ar,s.ac);if(a)a.classList.add('tx-act')}
  const sm=$('#txSum');if(sm)sm.innerHTML=txSumHtml(X);
  const u=$('#txUn'),re=$('#txRe');if(u)u.disabled=!TX.un.length;if(re)re.disabled=!TX.re.length}
/* lleva la celda activa a la vista (descontando encabezado, totales y columnas fijos) */
function txReveal(){const W=$('#txW');const s=TX.X&&txRect(TX.X);const a=s&&txCell(s.ar,s.ac);if(!W||!a)return;
  const wr=W.getBoundingClientRect(),r=a.getBoundingClientRect();const T=$('#txT');const th=T.tHead.getBoundingClientRect().height,tf=T.tFoot?T.tFoot.getBoundingClientRect().height:0;
  const fzw=a.classList.contains('tx-fz')?0:TX_FZW.reduce((x,y)=>x+y,0);const top=wr.top+th,bot=wr.top+W.clientHeight-tf,lft=wr.left+fzw,rgt=wr.left+W.clientWidth;
  if(r.top<top)W.scrollTop-=top-r.top;else if(r.bottom>bot)W.scrollTop+=r.bottom-bot;
  if(r.left<lft)W.scrollLeft-=lft-r.left;else if(r.right>rgt)W.scrollLeft+=r.right-rgt}
function txGo(r,c,ext){const X=TX.X;if(!X||!X.rows.length)return;r=Math.max(0,Math.min(X.rows.length-1,r));c=Math.max(0,Math.min(X.cols.length-1,c));
  const k={d:X.rows[r].d,k:X.cols[c].k};if(ext)TX.f=k;else TX.a=TX.f=k;txPaint();txReveal()}
function txMove(key,ext,edge){const X=TX.X;const s=txRect(X);if(!s)return;const f=ext?txIx(X,TX.f):{r:s.ar,c:s.ac};
  const dr=key==='ArrowUp'?-1:key==='ArrowDown'?1:0,dc=key==='ArrowLeft'?-1:key==='ArrowRight'?1:0;
  const r=edge?(dr<0?0:dr>0?X.rows.length-1:f.r):f.r+dr,c=edge?(dc<0?0:dc>0?X.cols.length-1:f.c):f.c+dc;txGo(r,c,ext)}
/* --- deshacer / rehacer: fotos del estado editable (horas, asistencia, obreros, partidas y cotejo en edición) --- */
const txSnap=()=>({rows:clone(TR.ed.rows),pcs:(TR.ed.pcs||[]).slice(),fir:{...TR.fir},gar:{...TR.gar}});
const txSnapPush=()=>{if(!TR.ed)return;TX.un.push(txSnap());if(TX.un.length>200)TX.un.shift();TX.re=[]};
/** aplica fn como un solo paso de deshacer (solo si cambió algo) */
function txDo(fn){if(!TR.ed)return;const s0=txSnap();const j0=JSON.stringify(s0);fn();if(JSON.stringify(txSnap())!==j0){TX.un.push(s0);if(TX.un.length>200)TX.un.shift();TX.re=[]}}
function txRestore(s){TR.ed.rows=clone(s.rows);TR.ed.pcs=s.pcs.slice();TR.fir={...s.fir};TR.gar={...s.gar};trDirty();trDraw(true);txFocus()}
function txUndo(){if(!TR.ed||!TX.un.length){toast('No hay nada que deshacer.');return}TX.re.push(txSnap());txRestore(TX.un.pop())}
function txRedo(){if(!TR.ed||!TX.re.length){toast('No hay nada que rehacer.');return}TX.un.push(txSnap());txRestore(TX.re.pop())}
/** escribe un valor en la celda (d, k) → {s:'ok'|'skip'|'bad', msg?, rnd? (horas redondeadas a media hora)} */
function txSet(d,k,raw){const X=TX.X;const e=TR.ed;const R=X&&X.all.find(z=>z.d===d);const col=X&&X.cols.find(z=>z.k===k);if(!e||!R||!col||!e.rows[d])return{s:'skip'};
  if(!txEd(R,col,X))return{s:'skip'};const x=e.rows[d];const s=String(raw==null?'':raw).trim();
  if(col.pc){const n=trHParse(s);if(Number.isNaN(n)||n<0)return{s:'bad',msg:'Escribe las horas con números (por ejemplo 8 o 4,5).'};const r=Math.min(24,Math.round(n*2)/2);if(r)x.h[col.pc]=r;else delete x.h[col.pc];return{s:'ok',rnd:r!==n?r:null}}
  switch(k){
    case'as':{if(!s)return{s:'skip'};const v=txBool(s);if(v==null)return{s:'bad',msg:'«Vino»: escribe Sí o No.'};x.as=v;if(v)x.mot='';else x.alt=false;return{s:'ok'}}
    case'mot':{const m=s.toUpperCase().split(/[\s·]/)[0]||'';if(m&&!TO_MOT[m])return{s:'bad',msg:`Motivo no válido: usa ${Object.keys(TO_MOT).join(', ')}.`};x.mot=m;return{s:'ok'}}
    case'alt':{const v=s?txBool(s,true):false;if(v==null)return{s:'bad',msg:'«Altura»: escribe A o déjala vacía.'};x.alt=v;return{s:'ok'}}
    case'sal':{const h=txHm(s);if(h==null)return{s:'bad',msg:'Escribe la hora como 15:30.'};x.sal=h;return{s:'ok'}}
    case'fir':{const v=s?txBool(s):null;if(s&&v==null)return{s:'bad',msg:'«Firmó»: escribe Sí o No.'};TR.nota='';if(v==null)delete TR.fir[d];else TR.fir[d]=v;trDirty();return{s:'ok'}}
    case'gar':{const h=txHm(s);if(h==null)return{s:'bad',msg:'Escribe la hora como 17:05.'};if(h)TR.gar[d]=h;else delete TR.gar[d];trDirty();return{s:'ok'}}}
  return{s:'skip'}}
/* --- edición de una celda: un campo encima de la celda (F2, doble clic o escribir directo, que reemplaza) --- */
function txEdit(init){const X=TX.X;const s=X&&txRect(X);if(!s)return;const R=X.rows[s.ar],col=X.cols[s.ac];
  if(!txEd(R,col,X)){toast(txWhy(R,col,X));return}
  TX.f=TX.a;txPaint();txReveal();const td=txCell(s.ar,s.ac);if(!td)return;const cur=init!=null?init:txRaw(R,col);
  TX.ing={d:R.d,k:col.k,rep:init!=null};td.classList.add('tx-ing');
  td.innerHTML=`<input id="txIn" class="tx-in${col.num?' tx-n':''}" autocomplete="off" spellcheck="false"${col.pc?' inputmode="decimal"':''}${col.k==='mot'?' list="txMotL"':''} aria-label="${esc((R.r.ape||R.d)+' · '+col.l)}" value="${esc(cur)}">${col.k==='mot'?`<datalist id="txMotL">${Object.entries(TO_MOT).map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('')}</datalist>`:''}`;
  const i=$('#txIn');i.focus();if(init!=null)i.setSelectionRange(cur.length,cur.length);else i.select()}
/** termina la edición y guarda el valor (mv: 'u'|'d'|'l'|'r' mueve la celda activa, como Enter o Tab en Excel) */
function txCommit(mv){const ing=TX.ing;if(!ing)return;const i=$('#txIn');const v=i?i.value:'';TX.ing=null;txFocus();let o={s:'skip'};
  txDo(()=>{o=txSet(ing.d,ing.k,v)});trDraw(true);
  if(o.s==='bad')toast(o.msg);else if(o.rnd!=null)toast(`Las horas van de media en media: quedó ${trHFmt(o.rnd)||'0'}.`);
  if(mv){const X=TX.X;const p=X&&txPos(X);if(p){const d={u:[-1,0],d:[1,0],l:[0,-1],r:[0,1]}[mv];txGo(p.r+d[0],p.c+d[1])}}}
function txCancel(){TX.ing=null;txFocus();trDraw(true)}
function txToggle(){const X=TX.X;const s=txRect(X);if(!s)return;const R=X.rows[s.ar],col=X.cols[s.ac];if(!txEd(R,col,X)){toast(txWhy(R,col,X));return}
  const v=col.k==='as'?(R.x.as===true?'No':'Sí'):col.k==='alt'?(R.x.alt?'':'A'):(R.r.fir===true?'No':R.r.fir===false?'':'Sí');
  txDo(()=>txSet(R.d,col.k,v));trDraw(true)}
/** Supr: vacía las celdas elegidas que se pueden editar (la asistencia no se vacía) */
function txClear(){const X=TX.X;const s=txRect(X);if(!s)return;let n=0;
  txDo(()=>{for(let r=s.r0;r<=s.r1;r++)for(let c=s.c0;c<=s.c1;c++){const col=X.cols[c];if(col.k==='as')continue;if(txSet(X.rows[r].d,col.k,'').s==='ok')n++}});
  if(n)trDraw(true);else{const R=X.rows[s.ar],col=X.cols[s.ac];toast(s.r0===s.r1&&s.c0===s.c1?txWhy(R,col,X):'Nada que borrar: esas celdas no se editan.')}}
/** Ctrl+D: copia la primera fila de la selección hacia abajo (con una sola fila, copia la de arriba) */
function txFillDown(){const X=TX.X;const s=txRect(X);if(!s)return;let src=s.r0,from=s.r0+1;if(s.r0===s.r1){if(!s.r0){toast('No hay una fila arriba para copiar.');return}src=s.r0-1;from=s.r0}
  let n=0;txDo(()=>{for(let c=s.c0;c<=s.c1;c++){const col=X.cols[c];const v=txRaw(X.rows[src],col);for(let r=from;r<=s.r1;r++)if(txSet(X.rows[r].d,col.k,v).s==='ok')n++}});
  trDraw(true);toast(n?`Se ${n===1?'rellenó 1 celda':'rellenaron '+n+' celdas'}.`:'Nada que rellenar: esas celdas no se editan.')}
/** «Rellenar con…»: un mismo valor en todas las celdas elegidas que se pueden editar */
async function txFillWith(){const X=TX.X;const s=X&&txRect(X);if(!s)return;const n0=(s.r1-s.r0+1)*(s.c1-s.c0+1);const e=TR.ed;
  const v=await uiAsk({title:'Rellenar con…',text:`Escribe el valor para ${n0===1?'la celda elegida':`las ${n0} celdas elegidas`} (horas como 8 o 4,5; Vino: Sí o No; Altura: A; horas del día como 15:30). Las celdas que no se editan se saltan.`,input:{label:'Valor',required:false},ok:'Rellenar',tone:'info'});
  if(v==null||v===false||TR.ed!==e||!TX.X)return;let n=0,bad='';
  txDo(()=>{for(let r=s.r0;r<=s.r1;r++)for(let c=s.c0;c<=s.c1;c++){const R=TX.X.rows[r],col=TX.X.cols[c];if(!R||!col)continue;const o=txSet(R.d,col.k,v);if(o.s==='ok')n++;else if(o.s==='bad')bad=bad||o.msg}});
  trDraw(true);txFocus();toast(n?`Se ${n===1?'rellenó 1 celda':'rellenaron '+n+' celdas'}.${bad?' '+bad:''}`:(bad||'Nada que rellenar: esas celdas no se editan.'))}
/** pegar (de la hoja o de Excel: filas separadas por saltos de línea, columnas por tabulaciones) desde la celda activa; un solo
    valor sobre un rango elegido lo rellena entero */
function txPaste(txt){const X=TX.X;const s=X&&txRect(X);if(!s)return;let L=String(txt||'').replace(/\r\n?/g,'\n').split('\n');if(L.length>1&&L[L.length-1]==='')L.pop();
  const M=L.map(l=>l.split('\t'));if(!M.length||(M.length===1&&M[0].length===1&&M[0][0]===''&&!txt))return;
  const one=M.length===1&&M[0].length===1;const T=[];let out=0;
  if(one){for(let r=s.r0;r<=s.r1;r++)for(let c=s.c0;c<=s.c1;c++)T.push([r,c,M[0][0]])}
  else for(let i=0;i<M.length;i++)for(let j=0;j<M[i].length;j++){const r=s.r0+i,c=s.c0+j;if(r>=X.rows.length||c>=X.cols.length){out++;continue}T.push([r,c,M[i][j]])}
  let n=0,sk=0,bad=0,rn=0,msg='';
  txDo(()=>{for(const[r,c,v]of T){const o=txSet(X.rows[r].d,X.cols[c].k,v);if(o.s==='ok'){n++;if(o.rnd!=null)rn++}else if(o.s==='bad'){bad++;msg=msg||o.msg}else sk++}});
  if(!one){const r1=Math.min(X.rows.length-1,s.r0+M.length-1),c1=Math.min(X.cols.length-1,s.c0+Math.max(...M.map(x=>x.length))-1);TX.a={d:X.rows[s.r0].d,k:X.cols[s.c0].k};TX.f={d:X.rows[r1].d,k:X.cols[c1].k}}
  trDraw(true);txFocus();
  toast(`${n===1?'Se pegó 1 celda':`Se pegaron ${n} celdas`}${sk?` · ${sk} no se editan`:''}${out?` · ${out} quedaron fuera de la hoja`:''}${bad?` · ${bad} con valor no válido (${msg})`:''}${rn?` · ${rn} redondeadas a media hora`:''}.`)}
document.addEventListener('paste',e=>{const W=$('#txW');if(!W||document.activeElement!==W||TX.ing||!TR.ed||!TR.ed.g)return;e.preventDefault();
  const dt=e.clipboardData||window.clipboardData;txPaste(dt?dt.getData('text/plain')||dt.getData('text')||'':'')});
document.addEventListener('copy',e=>{const W=$('#txW');if(!W||document.activeElement!==W||TX.ing)return;const X=TX.X;const s=X&&txRect(X);if(!s||!e.clipboardData)return;
  const out=[];for(let r=s.r0;r<=s.r1;r++){const L=[];for(let c=s.c0;c<=s.c1;c++)L.push(txRaw(X.rows[r],X.cols[c]).replace(/[\t\n]/g,' '));out.push(L.join('\t'))}
  e.clipboardData.setData('text/plain',out.join('\n'));e.preventDefault();const n=(s.r1-s.r0+1)*(s.c1-s.c0+1);toast(n===1?'Celda copiada.':`${n} celdas copiadas: pégalas aquí o en Excel.`)});
/* --- mouse: clic elige, Mayús+clic y arrastrar amplían, N° elige la fila, el encabezado elige la columna, doble clic edita --- */
function txDown(e){if(TX.menu&&!e.target.closest('#txMenu')&&!e.target.closest('.tx-fb'))txMenuX();
  const W=e.target.closest&&e.target.closest('#txW');if(!W||e.button!==0||e.target.closest('button,input,select,a,datalist'))return;const X=TX.X;if(!X)return;
  const td=e.target.closest('tbody td'),th=e.target.closest('thead th');let d=null,k=null,mode='';
  if(td&&!td.closest('.tx-empty')){d=td.parentElement.dataset.dni;const c=X.cols[td.cellIndex];k=c&&c.k;if(k==='n')mode='row'}else if(th){const c=X.cols[th.cellIndex];k=c&&c.k;mode='col'}
  if(!k||(!d&&mode!=='col'))return;e.preventDefault();
  if(TX.ing)txCommit(null);const Y=TX.X;if(!Y.rows.length)return;
  if(mode==='row'){if(e.shiftKey&&TX.a)TX.f={d,k:Y.cols[Y.cols.length-1].k};else{TX.a={d,k:Y.cols[0].k};TX.f={d,k:Y.cols[Y.cols.length-1].k}}}
  else if(mode==='col'){if(e.shiftKey&&TX.a)TX.f={d:Y.rows[Y.rows.length-1].d,k};else{TX.a={d:Y.rows[0].d,k};TX.f={d:Y.rows[Y.rows.length-1].d,k}}}
  else{if(e.shiftKey&&TX.a)TX.f={d,k};else TX.a=TX.f={d,k};TX.drag=true}
  txFocus();txPaint()}
function txOver(e){if(!TX.drag||!TX.X)return;const td=e.target.closest&&e.target.closest('#txT tbody td');if(!td)return;const d=td.parentElement.dataset.dni;const c=TX.X.cols[td.cellIndex];
  if(!d||!c||(TX.f&&TX.f.d===d&&TX.f.k===c.k))return;TX.f={d,k:c.k};txPaint()}
document.addEventListener('mouseup',()=>{TX.drag=false});
function txDbl(e){const td=e.target.closest&&e.target.closest('#txT tbody td');if(!td||e.target.closest('button')||!TX.X)return;const col=TX.X.cols[td.cellIndex];if(!col)return;
  if(['as','alt','fir'].includes(col.k))txToggle();else txEdit(null)}
/* --- teclado --- */
function txKeyR(e){const tg=e.target;if(!tg)return;if(tg.id==='trSplit')return trSplitKey(e);if(!TR.ed||!TR.ed.g)return;
  if(tg.id==='txIn')return txInKey(e);if(tg.closest&&tg.closest('#txMenu'))return txMenuKey(e);if(tg.id==='txW')return txKey(e)}
function txKey(e){const X=TX.X;if(!X||$('.uask'))return;const k=e.key,ctrl=e.ctrlKey||e.metaKey;const stop=()=>{e.preventDefault();e.stopPropagation()};const s=txRect(X);
  if(ctrl&&!e.altKey){const l=k.toLowerCase();
    if(l==='z'){stop();if(e.shiftKey)txRedo();else txUndo();return}if(l==='y'){stop();txRedo();return}if(l==='d'){stop();txFillDown();return}
    if(l==='a'){stop();if(X.rows.length){TX.a={d:X.rows[0].d,k:X.cols[0].k};TX.f={d:X.rows[X.rows.length-1].d,k:X.cols[X.cols.length-1].k};txPaint()}return}
    if(k.startsWith('Arrow')){stop();txMove(k,e.shiftKey,true);return}if(k==='Home'){stop();txGo(0,0,e.shiftKey);return}if(k==='End'){stop();txGo(X.rows.length-1,X.cols.length-1,e.shiftKey);return}
    return/* Ctrl+C / Ctrl+V: eventos copy y paste */}
  if(e.altKey||!s)return;
  if(k.startsWith('Arrow')){stop();txMove(k,e.shiftKey,false);return}
  if(k==='Tab'){const c=s.ac+(e.shiftKey?-1:1);if(c<0||c>=X.cols.length)return;/* en el borde, Tab sale de la hoja */stop();txGo(s.ar,c);return}
  if(k==='Enter'){stop();txGo(s.ar+(e.shiftKey?-1:1),s.ac);return}
  if(k==='Home'){stop();txGo(s.ar,0,e.shiftKey);return}if(k==='End'){stop();txGo(s.ar,X.cols.length-1,e.shiftKey);return}
  if(k==='PageDown'||k==='PageUp'){stop();txGo(s.ar+(k==='PageDown'?12:-12),s.ac,e.shiftKey);return}
  if(k==='F2'){stop();txEdit(null);return}
  if(k==='Delete'||k==='Backspace'){stop();txClear();return}
  if(k===' '&&['as','alt','fir'].includes((X.cols[s.ac]||{}).k)){stop();txToggle();return}
  if(k.length===1&&k!==' '){stop();txEdit(k);return}}
function txInKey(e){const k=e.key;e.stopPropagation();const ing=TX.ing;if(!ing)return;
  if(k==='Enter'||k==='Tab'){e.preventDefault();txCommit(k==='Enter'?(e.shiftKey?'u':'d'):(e.shiftKey?'l':'r'));return}
  if(k==='Escape'){e.preventDefault();txCancel();return}
  const A={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r'}[k];
  if(A&&(ing.rep||A==='u'||A==='d')){e.preventDefault();txCommit(A)}}
function txInput(e){const x=e.target;if(!x)return;
  if(x.id==='txQ'){TX.q=x.value;txQuick();return}
  if(x.id==='txMq'){const q=txNorm(x.value).trim();document.querySelectorAll('#txMv label[data-v]').forEach(l=>{l.hidden=!!q&&!l.dataset.v.includes(q)})}}
/* buscador: redibuja solo la tabla (el campo de búsqueda no se toca: no se pierde lo que se teclea) */
function txQuick(){const t=TD.docs.get(TR.id);if(!t||!TR.ed||!TR.ed.g)return;const X=txCtx(t);TX.X=X;txFix(X);const W=$('#txW');if(W){W.innerHTML=txTable(X);W.scrollTop=0}
  const n=$('#txCnt');if(n)n.textContent=txCntTxt(X);const c=$('#txClr');if(c)c.hidden=!txAny();const r=$('#trRight');if(r)r.__h='';txPaint()}
/* --- clics de la hoja (→ true si los tomó) --- */
function txClick(e){const f=e.target.closest('[data-txf]');if(f){if(TX.menu&&TX.menu.k===f.dataset.txf)txMenuX();else txMenu(f.dataset.txf,f);return true}
  const m=e.target.closest('[data-txm]');if(m){txMenuAct(m.dataset.txm);return true}
  if(e.target.closest('#txMenu'))return true;
  const cx=e.target.closest('[data-txcx]');if(cx){delete TX.flt[cx.dataset.txcx];trDraw(true);txFocus();return true}
  const fx=e.target.closest('[data-txfx]');if(fx){const k=fx.dataset.txfx;if(TX.fx.has(k))TX.fx.delete(k);else TX.fx.add(k);trDraw(true);return true}
  const b=e.target.closest('[data-txa]');if(!b||b.disabled)return false;const a=b.dataset.txa;
  if(a==='un'){txUndo();return true}if(a==='re'){txRedo();return true}if(a==='fill'){txFillWith();return true}if(a==='addo'){txAddDlg(TR.id);return true}
  if(a==='clr'){TX.flt={};TX.q='';TX.fx.clear();trDraw(true);txFocus();return true}
  if(a==='rm'){const d=b.dataset.v;const e2=TR.ed;const x=e2&&e2.rows[d];if(!x)return true;const nm=(x.nw&&x.nw.ape)||d;
    txDo(()=>{delete e2.rows[d]});trDraw(true);txFocus();toast(`${nm} sale del tareo al guardar (Ctrl+Z deshace).`);return true}
  return false}
/* acciones data-tra de la hoja (→ true si las tomó) */
function txAct(a,b,id){
  if(a==='pfo'){TR.pfo=!TR.pfo;try{localStorage.setItem('lps.trfo',TR.pfo?'1':'0')}catch(e){}trDraw(true);return true}
  if(a==='prconf'){trProdConf(id);return true}
  if(a==='mv'){const X=TX.X;const s=X&&txRect(X);const col=s&&X.cols[s.ac];if(!col||!col.pc){toast('Elige una celda de horas (un obrero en una partida) y luego «Mover horas…».');return true}trMvDlg(id,{dni:X.rows[s.ar].d,pc:col.pc});return true}
  if(a==='pcdel'){trPcDelDlg(id,b.dataset.v);return true}
  if((a==='pas'||a==='rev'||a==='reab'||a==='qrev')&&trEdN()){toast('Guarda o descarta tus cambios primero.');return true}
  return false}
/* agregar una partida del día desde la hoja: la columna aparece y queda elegida su primera celda */
function txPcAdd(el){const pc=el.value;const e=TR.ed;if(!pc||!e)return;if(!e.pcs.includes(pc))txDo(()=>{e.pcs.push(pc)});
  const X=TX.X;const R=X&&(X.rows.find(z=>z.x.as===true)||X.rows[0]);if(R)TX.a=TX.f={d:R.d,k:'h:'+pc};trDraw(true);txFocus();txReveal()}
/* --- menú de filtro de una columna (como el autofiltro de Excel): ordenar, filtros rápidos, buscar y elegir valores --- */
function txMenu(k,btn){txMenuX();const X=TX.X;const col=X&&X.cols.find(z=>z.k===k);if(!col)return;
  const cnt=new Map();for(const R of X.all){if(!txPass(R,X,k))continue;const v=txFv(R,col);cnt.set(v,(cnt.get(v)||0)+1)}
  const cur=TX.flt[k];if(cur&&!cur.hon)for(const v of cur)if(!cnt.has(v))cnt.set(v,0);
  const vals=[...cnt.keys()].sort(txFvCmp(col));const so=TX.sort&&TX.sort.k===k?TX.sort.dir:0;const num=!!col.num;
  const el=document.createElement('div');el.id='txMenu';el.className='tx-menu';el.setAttribute('role','dialog');el.setAttribute('aria-label','Filtro de '+(col.l||'columna'));
  el.innerHTML=`<div class="tx-mh"><b>${esc(col.l)}</b>${col.sub?` <span class="note">${esc(col.sub)}</span>`:''}</div>
   <button class="tx-mi${so>0?' on':''}" data-txm="asc">${num?'Ordenar de menor a mayor':'Ordenar de la A a la Z'}</button>
   <button class="tx-mi${so<0?' on':''}" data-txm="desc">${num?'Ordenar de mayor a menor':'Ordenar de la Z a la A'}</button>
   ${so?'<button class="tx-mi" data-txm="nos">Quitar el orden</button>':''}
   ${col.pc?'<button class="tx-mi" data-txm="hon">Solo con horas en esta partida</button>':''}
   ${col.k==='tot'?`<button class="tx-mi${TX.fx.has('nej')?' on':''}" data-txm="nej">Solo totales distintos de la jornada</button>`:''}
   <div class="tx-msep"></div>
   <input class="tin tx-mq" id="txMq" type="search" placeholder="Buscar valores" aria-label="Buscar valores" autocomplete="off">
   <div class="tx-mv" id="txMv" role="group" aria-label="Valores que se muestran"><label class="tx-mall"><input type="checkbox" data-txv="__all"${!cur?' checked':''}> <span>(Seleccionar todo)</span></label>
    ${vals.map(v=>`<label data-v="${esc(txNorm(v))}"><input type="checkbox" data-txv="${esc(v)}"${!cur||(cur.hon?v!==TX_EMPTY:cur.has(v))?' checked':''}> <span>${esc(v)}</span><i>${cnt.get(v)}</i></label>`).join('')}</div>
   <div class="tx-mb">${cur||(col.k==='tot'&&TX.fx.has('nej'))?'<button class="ib" data-txm="clr">Quitar filtro</button>':''}<span class="tx-grow"></span><button class="ib" data-txm="x">Cancelar</button><button class="ib pri" data-txm="ok">Aceptar</button></div>`;
  $('#trWs').appendChild(el);TX.menu={k};const r=btn.getBoundingClientRect();
  el.style.left=Math.max(8,Math.min(r.right-el.offsetWidth,innerWidth-el.offsetWidth-8))+'px';el.style.top=Math.max(8,Math.min(r.bottom+4,innerHeight-el.offsetHeight-8))+'px';
  const q=$('#txMq');if(q)q.focus()}
function txMenuX(){const m=$('#txMenu');if(m)m.remove();TX.menu=null}
function txMenuChg(e){const x=e.target;if(!x.matches||!x.matches('[data-txv]'))return;const vis=[...document.querySelectorAll('#txMv label:not([hidden]) input[data-txv]:not([data-txv="__all"])')];
  if(x.dataset.txv==='__all')vis.forEach(c=>{c.checked=x.checked});else{const all=$('#txMv [data-txv="__all"]');if(all)all.checked=vis.every(c=>c.checked)}}
function txMenuKey(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();txMenuX();txFocus()}else if(e.key==='Enter'&&e.target.id==='txMq'){e.preventDefault();txMenuAct('ok')}}
function txMenuAct(a){const k=TX.menu&&TX.menu.k;const X=TX.X;const col=k&&X&&X.cols.find(z=>z.k===k);if(!col){txMenuX();return}
  if(a==='x'){txMenuX();txFocus();return}
  if(a==='asc'||a==='desc')TX.sort={k,dir:a==='asc'?1:-1};
  else if(a==='nos')TX.sort=null;
  else if(a==='hon'){const S2=new Set();S2.hon=true;TX.flt[k]=S2}/* «con horas»: cualquier valor no vacío (también los que aparezcan después) */
  else if(a==='nej'){if(TX.fx.has('nej'))TX.fx.delete('nej');else TX.fx.add('nej')}
  else if(a==='clr'){delete TX.flt[k];if(k==='tot')TX.fx.delete('nej')}
  else if(a==='ok'){const q=(($('#txMq')||{}).value||'').trim();const B=[...document.querySelectorAll('#txMv input[data-txv]:not([data-txv="__all"])')];
    const on=B.filter(c=>!c.closest('label').hidden&&c.checked).map(c=>c.dataset.txv);if(!on.length){toast('Elige al menos un valor.');return}
    if(!q&&on.length===B.length)delete TX.flt[k];else TX.flt[k]=new Set(on)}
  txMenuX();trDraw(true);txFocus()}
/* --- agregar un obrero del máster (activo en la fecha). Avisa si es de otra cuadrilla; si ya figura en otro tareo del día no se
   agrega (un obrero va en un solo tareo por día): se pasa con ⇄ desde ese tareo --- */
function txAddDlg(id){const t=TD.docs.get(id);const e=TR.ed;if(!t||!e)return;
  const draw=q0=>{const q=txNorm(q0).trim();const L=tLive().filter(p=>tActivo(p,t.date)&&!e.rows[p.dni||p.id]).filter(p=>!q||txNorm([p.dni||p.id,tName(p),p.cua].join(' ')).includes(q))
      .sort((a,b)=>((a.cap||'')===t.cap?0:1)-((b.cap||'')===t.cap?0:1)||tName(a).localeCompare(tName(b))).slice(0,40);
    return L.map(p=>{const d=p.dni||p.id;const o=[...TD.docs.values()].find(x=>x&&x.id!==t.id&&!x.arch&&x.date===t.date&&x.rows&&x.rows[d]);const aj=(p.cap||'')!==t.cap;
      return`<button class="tx-ao${o?' off':''}" data-txadd="${esc(d)}"${o?' disabled':''}><span><b>${esc(tName(p))}</b> <span class="mono note">${esc(d)}</span></span><span class="note">${esc([p.cua,p.cat].filter(Boolean).join(' · '))}${o?` · ya figura en el tareo de ${esc(o.capN||tCapName(o.cap))}: pásalo con ⇄ desde ese tareo`:aj?` · <b class="tx-aw">${p.cap?'de '+esc(tCapName(p.cap)):'sin capataz'}</b>`:''}</span></button>`}).join('')
      ||'<p class="note">Nadie coincide. Salen los activos del máster en esta fecha que aún no están en el tareo.</p>'};
  lqModal(`<div class="lqtop"><b>Agregar obrero</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <p class="lqmsg">Al tareo de <b>${esc(t.capN||tCapName(t.cap))}</b>: entra como «vino» y sin horas. Primero salen los de su cuadrilla.</p>
   <label>Buscar por DNI, apellido o cuadrilla<input class="tin" id="txAq" type="search" autocomplete="off"></label>
   <div class="tx-al" id="txAl">${draw('')}</div>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button></div>`,
   async ev=>{const b=ev.target.closest('[data-txadd]');if(!b||b.disabled)return;const d=b.dataset.txadd;const p=S.tper.get(d)||tLive().find(x=>(x.dni||x.id)===d);if(!p)return;
     const aj=(p.cap||'')!==t.cap;lqClose();
     if(aj&&!await uiAsk({title:'¿Agregar a un obrero de otra cuadrilla?',text:`${tName(p)} no es de la cuadrilla de ${t.capN||tCapName(t.cap)} (${p.cap?'es de '+tCapName(p.cap):'no tiene capataz'}). ¿Lo agregas igual a este tareo?`,ok:'Agregar',tone:'warn'}))return;
     if(TR.ed!==e||e.rows[d])return;
     txDo(()=>{e.rows[d]={as:true,mot:'',alt:false,sal:'',h:{},nw:{ape:p.ape||'',nom:p.nom||'',cat:p.cat||'OT',cua:p.cua||'',...(aj?{ajeno:true,capOrig:p.cap||''}:{}),i:++TX.seq}}});
     const c=trEdCols(e)[0];TX.a=TX.f={d,k:c?'h:'+c:'as'};trDraw(true);txFocus();txReveal();toast(`${tName(p)} se agregó: ponle sus horas y guarda.`)});
  const q=$('#txAq');if(q){q.addEventListener('input',()=>{const l=$('#txAl');if(l)l.innerHTML=draw(q.value)});
    q.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();const f=$('#txAl [data-txadd]:not([disabled])');if(f)f.click()}})}}
/* --- panel de la foto en la hoja: plegable («Ver foto») y redimensionable (arrastrar el borde, ← → con el foco en él) --- */
function trFwLs(){try{const v=+localStorage.getItem('lps.trfw');return v>=200?v:0}catch(e){return 0}}
function trFwSet(w){const B=$('#trBody');const max=Math.max(280,(B?B.clientWidth:1200)*0.62);w=Math.round(Math.max(220,Math.min(max,w)));const ws=$('#trWs');if(ws)ws.style.setProperty('--trfw',w+'px');
  try{localStorage.setItem('lps.trfw',String(w))}catch(e){}return w}
function trSplitInit(ws){const sp=ws.querySelector('#trSplit');if(!sp)return;let P=null;
  sp.addEventListener('pointerdown',e=>{if(e.button!==0)return;const f=$('#trFoto').getBoundingClientRect();P={x:e.clientX,w:f.width};try{sp.setPointerCapture(e.pointerId)}catch(err){}ws.classList.add('tr-sizing');e.preventDefault()});
  sp.addEventListener('pointermove',e=>{if(P)trFwSet(P.w+e.clientX-P.x)});
  const end=()=>{if(!P)return;P=null;ws.classList.remove('tr-sizing');trView()};sp.addEventListener('pointerup',end);sp.addEventListener('pointercancel',end);
  sp.addEventListener('dblclick',()=>{TR.pfo=false;try{localStorage.setItem('lps.trfo','0')}catch(e){}trDraw(true)})}
function trSplitKey(e){if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();e.stopPropagation();const f=$('#trFoto');trFwSet((f?f.getBoundingClientRect().width:400)+(e.key==='ArrowLeft'?-32:32));trView()}
