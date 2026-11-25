"use strict";
/* LPS 911 · Módulo Avance: ida y vuelta con Excel (25-11-2026, pedido del dueño; docs/ia/avance.md «Excel: exportar, editar e importar»).
   «Exportar» descarga la planilla de la partida abierta; se edita libremente en Excel y «Importar…» con ese mismo archivo deja la
   app como el archivo, después de mostrar un resumen de los cambios.
   - Hoja: fila 1 = marca ['LPS911-AVANCE', partidaId, hora de la descarga (ms), nombre]; fila 2 = encabezados; desde la 3, una línea
     por fila de la planilla y, si tiene etapas, una por etapa. Columna «ID» = filaId o filaId#etapaId: identifica la fila aunque se le
     cambie el nombre. Los días van en CANTIDAD, una columna por día (dd/mm/aaaa).
   - Decidido con el dueño: (1) las filas que falten en el archivo NO se quitan; (2) las celdas que cambiaron en la app después de la
     descarga se marcan aparte y solo se pisan si se marca la casilla (se sabe por la hoja oculta «_lps», copia de lo descargado: lo
     que el usuario no tocó no pisa nada; si el archivo ya no la trae, por la hora del historial de cada celda); (3) las etapas no se crean ni renombran desde el Excel.
   - Filas nuevas: ID vacío, con piso y ambiente escritos tal como se llaman en la obra (o con una equivalencia ya guardada).
   - Lo que superaría el metrado se ajusta, como al pegar. Todo se aplica como UNA acción (Ctrl+Z) y cada celda deja su historial. */
const AVX_MARK='LPS911-AVANCE',AVX_ORIG='_lps',AVX_HD=['ID','Piso','Sector','Ambiente','Descripción','Etapa','Und','Metrado'];
const avXlD=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
/** encabezado de día → fecha ISO: «dd/mm/aaaa», «dd/mm» (año del rango), «aaaa-mm-dd» o el número de fecha de Excel */
function avXlDate(v,d0){if(typeof v==='number'&&v>20000&&v<80000)return addD('1899-12-30',Math.round(v));const s=String(v??'').trim();let m;
  const ok=x=>{try{return addD(x,0)===x?x:''}catch(e){return''}};   /* «11/25/2026» (Excel en inglés) no es una fecha: no debe crear una semana inválida */
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)))return ok(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
  if((m=/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?$/.exec(s))){const y=m[3]?(m[3].length===2?'20'+m[3]:m[3]):String(d0||todayIso()).slice(0,4);return ok(`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`)}return''}
/** planilla de la partida → matriz para Excel (función pura) */
function avXlAoa(p,rows,ex,now){const C=avWeeks(p),days=C.W.flatMap(w=>w.days).filter(d=>d>=C.d0&&d<=C.d1),out=[[AVX_MARK,p.id,now,p.nom],AVX_HD.concat(days.map(avXlD))];
  const nm=id=>{const o=S.pis.get(id)||ARCH.pis.get(id);return o?o.name:''};
  [...pisos(),...ARCH.pis.values()].forEach(pi=>{if(!rows.some(r=>r.piso===pi.id))return;const T=avTree(pi.id,rows,[]);
    const put=(r,sec,amb)=>avEtOf(r).forEach(e=>out.push([avHasEt(r)?r.id+'#'+e.id:r.id,nm(pi.id),sec,amb,r.desc,avHasEt(r)?e.n:'',r.und,r.q||''].concat(days.map(d=>avCell(ex,r.id,e.id,d)||''))));
    T.direct.forEach(r=>put(r,'',''));T.secs.forEach(s=>{s.direct.forEach(r=>put(r,s.id?s.nom:'',''));s.ambs.forEach(a=>a.rows.forEach(r=>put(r,s.id?s.nom:'',a.nom)))})});
  return out}
async function avXlExport(){const p=avCur();if(!p||!avReady(p))return;try{toast('Generando el Excel…');await loadXlsx();const X=window.XLSX,D=avData(),aoa=avXlAoa(p,D.rows,D.ex,NOW()),ws=X.utils.aoa_to_sheet(aoa),bold={font:{bold:true},fill:{fgColor:{rgb:'E4E7E2'}}};
    aoa[1].forEach((v,c)=>{const k=X.utils.encode_cell({r:1,c});if(ws[k])ws[k].s=bold});ws['!cols']=[{wch:14},{wch:14},{wch:14},{wch:24},{wch:42},{wch:14},{wch:6},{wch:10}].concat(aoa[1].slice(8).map(()=>({wch:11})));ws['!rows']=[{hidden:true}];
    const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,String(p.nom).replace(/[\\/?*[\]:]/g,' ').slice(0,28)||'Partida');
    /* copia oculta de lo descargado: al importar dice qué cambió el usuario y qué cambió entretanto en la app */
    X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(aoa),AVX_ORIG);wb.Workbook={Sheets:[{Hidden:0},{Hidden:1}]};
    saveBlob(`${P().code||'LPS'}_Avance_${String(p.nom).replace(/[^\wáéíóúñÁÉÍÓÚÑ -]/g,'').trim().replace(/\s+/g,'_')}_${todayIso()}.xlsx`,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    toast('Excel descargado. Edítalo y vuelve a cargarlo con «Importar…».')}catch(e){toast('No se pudo generar el Excel: '+(e.message||e))}}
/** lee el .xlsx elegido en «Importar…»: si es una planilla exportada, abre el resumen de cambios; si no, lo pasa al importador de filas */
async function avXlRead(file){try{await loadXlsx();const X=window.XLSX,wb=X.read(new Uint8Array(await file.arrayBuffer()),{type:'array'});let aoa=null;
    const os=wb.Sheets[AVX_ORIG],orig=os?X.utils.sheet_to_json(os,{header:1,raw:true,defval:''}):null;
    for(const n of wb.SheetNames){if(n===AVX_ORIG)continue;const a=X.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:true,defval:''});if(a[0]&&a[0][0]===AVX_MARK){aoa=a;break}if(!aoa)aoa=a}
    if(aoa&&aoa[0]&&aoa[0][0]===AVX_MARK){avXlOpen(aoa,orig&&orig[0]&&orig[0][0]===AVX_MARK&&orig[0][1]===aoa[0][1]?orig:null);return}
    const ta=$('#avitxt');if(!ta||!avaCfg()){toast('Ese archivo no es una planilla descargada con «Exportar».');return}if(aoa){ta.value=aoa.map(r=>r.map(c=>String(c??'').replace(/[\t\n]/g,' ')).join('\t')).join('\n');avImpRead()}}
  catch(e){toast('No se pudo leer el Excel: '+(e.message||e))}}
let AVX=null;
/** compara la matriz del archivo con lo que hay → plan de cambios (función pura sobre el estado de la partida abierta) */
function avXlPick(){const i=document.createElement('input');i.type='file';i.accept='.xlsx';i.onchange=()=>{if(i.files&&i.files[0])avXlRead(i.files[0])};i.click()}
function avXlPlan(aoa,pisar,orig){const p=avCur(),D=avData(),ex=D.ex,P={errs:[],rowsP:[],news:[],cells:[],conf:0,adj:0,noperm:0,faltan:0,fuera:0,otra:false,sin:false};
  if(!aoa[0]||aoa[0][0]!==AVX_MARK||!p){P.sin=true;return P}if(aoa[0][1]!==p.id){P.otra=String(aoa[0][3]||'otra partida');return P}
  const ts=+aoa[0][2]||0,hd=aoa[1]||[],C=avWeeks(p),cfg=avaCfg(),reg=avaReg(),ix=n=>hd.findIndex(h=>mnk(h)===mnk(n)),I={id:ix('ID'),piso:ix('Piso'),sec:ix('Sector'),amb:ix('Ambiente'),desc:ix('Descripción'),et:ix('Etapa'),und:ix('Und'),q:ix('Metrado')};
  if(I.id<0||I.desc<0||I.q<0){P.errs.push('Al archivo le faltan las columnas ID, Descripción o Metrado: descárgalo de nuevo con «Exportar».');return P}
  const fixed=new Set(Object.values(I)),days=[];hd.forEach((h,c)=>{if(fixed.has(c)||h==='')return;const d=avXlDate(h,C.d0);if(!d){P.errs.push(`Columna «${h}»: no es una fecha (se ignora).`);return}if(days.some(x=>x[1]===d)){P.errs.push(`Columna «${h}»: el día está repetido (se ignora la segunda).`);return}if(d<C.d0||d>C.d1){P.fuera++;return}days.push([c,d])});
  /* celdas que alguien cambió en la app después de la descarga */
  const tocadas=new Set();AVD.forEach(doc=>(doc.log||[]).forEach(l=>{if(l.t>ts)tocadas.add(l.d+'|'+l.r+'|'+l.e)}));
  const byId=new Map(D.rows.map(r=>[r.id,r])),seen=new Set(),qNew=new Map(),num=(v,ln,que)=>{if(v===''||v==null)return 0;const n=typeof v==='number'?v:avNum(v);if(typeof v!=='number'&&!/^[\d\s.,]+$/.test(String(v))||!(n>=0)){P.errs.push(`Fila ${ln}: «${v}» en ${que} no es un número.`);return null}return n};
  /* copia oculta de la descarga (si el archivo la conserva): columnas fijas, como las escribe avXlAoa */
  const O=orig&&orig[1]?{rows:new Map(orig.slice(2).map(r=>[String(r[0]),r])),day:new Map()}:null;if(O)orig[1].forEach((h,c)=>{const d=c>7?avXlDate(h,C.d0):'';if(d)O.day.set(d,c)});
  const eq=(p.eq||{}),g=(r,c)=>c<0?'':r[c];
  /* celdas de una fila (o etapa): primero se juntan todos sus cambios y recién ahí se mira el metrado, para que mover cantidad de un
     día a otro no pierda nada; si el total supera el metrado se recortan las subidas desde el último día */
  const put=(row,etId,q,ln,r,or)=>{const ch=[];days.forEach(([c,d])=>{const v=num(r[c],ln,avXlD(d));if(v==null)return;const old=avCell(ex,row.id,etId,d),nv=avR4(v),oc=or&&O.day.has(d)?avR4(avNum(or[O.day.get(d)])||0):null;
      if(oc!=null&&Math.abs(nv-oc)<1e-9)return;if(Math.abs(nv-old)<1e-9)return;   /* lo que el usuario no tocó en el Excel no pisa lo que cambió en la app */
      if(!reg){P.noperm++;return}if(oc!=null?Math.abs(old-oc)>1e-9:tocadas.has(d+'|'+row.id+'|'+etId)){P.conf++;if(!pisar)return}ch.push({row,et:etId,d,q:nv,old})});
    let over=avAcc(ex,row.id,etId)+ch.reduce((s,c)=>s+c.q-c.old,0)-q;
    for(let i=ch.length-1;i>=0&&over>1e-9;i--){const c=ch[i],cut=Math.min(over,c.q-c.old);if(cut>1e-9){c.q=avR4(c.q-cut);over-=cut;P.adj++}}
    ch.forEach(c=>{if(Math.abs(c.q-c.old)>1e-9)P.cells.push(c)})};
  aoa.slice(2).forEach((r,i)=>{const ln=i+3,id=String(g(r,I.id)||'').trim(),desc=String(g(r,I.desc)||'').trim();if(!id&&!desc&&!r.some(x=>x!==''))return;
    if(id){const[rid,eid]=id.split('#'),row=byId.get(rid);if(!row){P.errs.push(`Fila ${ln}: el ID «${id}» no es de esta partida o la fila ya se quitó (se ignora).`);return}
      const et=avHasEt(row)?row.et.find(e=>e.id===eid):null;if(avHasEt(row)!==!!eid||(eid&&!et)){P.errs.push(`Fila ${ln}: «${row.desc}» cambió de etapas en la app después de la descarga (se ignora; descarga de nuevo).`);return}
      let q=row.q;if(!seen.has(rid)){seen.add(rid);const patch={},und=String(g(r,I.und)||'').trim(),nq=num(g(r,I.q),ln,'Metrado');
        let np=0;const or=O&&O.rows.get(id),sS=(a,b)=>a===b,sN=(a,b)=>Math.abs(a-b)<1e-9,set=(k,nv,same,oi)=>{if(same(nv,row[k]))return;if(!cfg){np=1;return}
          if(or){const ov=k==='q'?avR4(avNum(or[oi])||0):String(or[oi]??'').trim().slice(0,k==='desc'?160:10);if(same(nv,ov))return;if(!same(row[k],ov)){P.conf++;if(!pisar)return}}patch[k]=nv};
        if(desc)set('desc',desc.slice(0,160),sS,4);if(und)set('und',und.slice(0,10),sS,6);if(nq!=null&&nq>0)set('q',avR4(nq),sN,7);
        if(np)P.noperm++;if(Object.keys(patch).length){P.rowsP.push({row,patch});if(patch.q)qNew.set(rid,patch.q)}}
      q=qNew.get(rid)||row.q;if(q>0)put(row,et?et.id:AV_E0,q,ln,r,O&&O.rows.get(id));return}
    /* fila nueva */
    if(!cfg){P.noperm++;return}if(!desc){P.errs.push(`Fila ${ln}: fila nueva sin descripción.`);return}if(String(g(r,I.et)||'').trim()){P.errs.push(`Fila ${ln}: las etapas se crean en la app, no desde el Excel (fila nueva «${desc}» sin importar).`);return}
    const pn=mnk(g(r,I.piso)),pis=pn?pisos().filter(x=>mnk(x.name)===pn||mnk(x.code)===pn):[],pi=pis.length===1?pis[0].id:(eq.niv&&S.pis.has(eq.niv[pn])?eq.niv[pn]:'');if(!pi){P.errs.push(`Fila ${ln}: no reconozco el piso «${g(r,I.piso)}» (fila nueva «${desc}»).`);return}
    const an=String(g(r,I.amb)||'').trim(),sn=String(g(r,I.sec)||'').trim();let amb='',sec='';
    if(an){const L=[...S.amb.values()].filter(a=>pisoOfAmb(a.id)===pi&&mnk(a.name)===mnk(an));amb=L.length===1?L[0].id:(eq.amb&&S.amb.has(eq.amb[pi+'|'+mnk(an)])?eq.amb[pi+'|'+mnk(an)]:'');if(!amb){P.errs.push(`Fila ${ln}: ${L.length>1?'hay varios ambientes llamados':'no reconozco el ambiente'} «${an}» en ese piso (fila nueva «${desc}»).`);return}}
    else if(sn){const L=[...S.sec.values()].filter(s=>s.pisoId===pi&&mnk(s.name)===mnk(sn));if(L.length!==1){P.errs.push(`Fila ${ln}: no reconozco el sector «${sn}» (fila nueva «${desc}»).`);return}sec=L[0].id}
    const q=num(g(r,I.q),ln,'Metrado');if(q==null)return;const und=String(g(r,I.und)||'').trim()||'und';
    const igual=x=>x.piso===pi&&(x.amb||'')===amb&&(amb||(x.sec||'')===sec)&&mnk(x.desc)===mnk(desc)&&mnk(x.und)===mnk(und);
    if(D.rows.some(igual)||P.news.some(x=>igual({piso:x.row.piso,...x.data}))){P.errs.push(`Fila ${ln}: «${desc}» ya existe en ese lugar (para cambiarla usa su fila con ID).`);return}
    const row={id:avNid('r'),piso:pi,q:avR4(q)};P.news.push({row,data:{amb,sec,desc:desc.slice(0,160),und:und.slice(0,10),q:avR4(q),et:null,o:NOW()+P.news.length,an:amb?(S.amb.get(amb).name||''):''}});if(q>0)put(row,AV_E0,avR4(q),ln,r,null)});
  P.faltan=D.rows.filter(r=>!seen.has(r.id)).length;return P}
function avXlOpen(aoa,orig){AVX={aoa,orig:orig||null,pisar:false};avXlDraw()}
function avXlDraw(){const X=AVX,p=avCur();if(!X||!p)return;const P=avXlPlan(X.aoa,X.pisar,X.orig),n=P.rowsP.length+P.news.length+P.cells.length,it=(c,t)=>c?`<span><b>${c}</b> ${t}</span>`:'';
  let h=`<div class="avh"><b>Importar la planilla editada · ${esc(p.nom)}</b><button class="ib" data-lqx="1" aria-label="Cerrar">✕</button></div>`;
  if(P.otra)h+=`<p class="avtg b avblk">Este archivo es de «${esc(P.otra)}». Abre esa partida en la planilla y vuelve a importarlo.</p>`;
  else{h+=`<p class="avnote">Esto es lo que cambiaría. Nada se aplica hasta que confirmes.</p><div class="avisum">${it(P.news.length,'filas nuevas')}${it(P.rowsP.length,'filas con descripción, unidad o metrado cambiados')}${it(P.cells.length,'celdas de avance')}${n?'':'<span>No hay cambios que aplicar.</span>'}</div>`;
    const L=[];P.rowsP.slice(0,6).forEach(x=>L.push(`${esc(x.row.desc)}: ${Object.entries(x.patch).map(([k,v])=>`${{desc:'descripción',und:'unidad',q:'metrado'}[k]} <b>${esc(String(x.row[k]))} → ${esc(String(v))}</b>`).join(', ')}`));
    P.news.slice(0,4).forEach(x=>L.push(`Nueva: ${esc(x.data.desc)} · <b>${avF(x.data.q)} ${esc(x.data.und)}</b>`));P.cells.slice(0,8).forEach(c=>L.push(`${esc(c.row.desc||'fila nueva')} · ${fmtD(c.d)}: <b>${avF(c.old)} → ${avF(c.q)}</b>`));
    if(L.length)h+=`<div class="avxl">${L.map(x=>`<div>${x}</div>`).join('')}${n>L.length?`<div class="avmu">… y ${n-L.length} cambios más</div>`:''}</div>`;
    if(P.conf)h+=`<label class="avck"><input type="checkbox" id="avxpis"${X.pisar?' checked':''}> <span><b>${P.conf}</b> dato${P.conf===1?'':'s'} ${P.conf===1?'cambió':'cambiaron'} en la app después de tu descarga. Marca aquí para pisar${P.conf===1?'lo':'los'} con el Excel; sin marcar, se conserva${P.conf===1?'':'n'} lo de la app.</span></label>`;
    const notas=[P.adj?`${P.adj} celda${P.adj===1?'':'s'} se ajusta${P.adj===1?'':'n'} para no superar el metrado.`:'',P.faltan?`${P.faltan} fila${P.faltan===1?'':'s'} de la app no está${P.faltan===1?'':'n'} en el archivo: se deja${P.faltan===1?'':'n'} como está${P.faltan===1?'':'n'}.`:'',P.fuera?`${P.fuera} columna${P.fuera===1?'':'s'} de días fuera de las fechas de la partida: se ignora${P.fuera===1?'':'n'}.`:'',P.noperm?`${P.noperm} cambio${P.noperm===1?'':'s'} que tu rol no puede aplicar (filas y metrados: administrador y editores).`:''].filter(Boolean);
    if(notas.length)h+=`<p class="avnote">${notas.join(' ')}</p>`;
    if(P.errs.length)h+=`<details class="avierr"${P.errs.length<4?' open':''}><summary>${P.errs.length} línea${P.errs.length===1?'':'s'} que no se pueden importar</summary>${P.errs.slice(0,40).map(x=>`<div>${esc(x)}</div>`).join('')}</details>`}
  h+=`<div class="avact"><span class="avsp"></span><button type="button" class="ib" data-lqx="1">Cancelar</button><button type="button" class="ib pri" data-avx="go"${n&&!P.otra?'':' disabled'}>Aplicar ${n} cambio${n===1?'':'s'}</button></div>`;
  lqModal(h,e=>{if(e.target.closest('[data-avx="go"]'))avXlGo()},e=>{if(e.target.id==='avxpis'){AVX.pisar=e.target.checked;avXlDraw()}})}
function avXlGo(){const X=AVX,p=avCur();if(!X||!p||!avReady(p))return;const P=avXlPlan(X.aoa,X.pisar,X.orig),n=P.rowsP.length+P.news.length+P.cells.length;if(!n||P.otra)return;
  avUGroup(()=>{P.rowsP.forEach(x=>avRowPatch(p,x.row,x.patch));P.news.forEach(x=>avRowPatch(p,x.row,x.data));avPutCells(p,P.cells)});
  AVX=null;AVI=null;lqClose();toast(`Aplicados ${n} cambio${n===1?'':'s'} del Excel · Ctrl+Z para deshacer`);requestRender()}
