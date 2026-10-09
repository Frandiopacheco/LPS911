"use strict";
/* LPS 911 · Excel con el formato de la empresa (ExcelJS: admite imágenes).
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales.
   Los cuerpos de las hojas se siguen armando con xlsx-js-style (lookahead.js/exportes.js) y aquí se pasan a ExcelJS (xToJ);
   el encabezado (filas 1–6) se escribe tal cual el formato corregido por el dueño (XHDR), con los logos de Configuración
   (P().logoE = empresa, P().logoC = cliente: documentos de `fotos`). La hoja AR replica el análisis de restricciones con
   sus fórmulas y Sectorización lleva la imagen de cada piso con sus sectores. */
let xjsP=null;
function loadExcelJS(){if(window.ExcelJS)return Promise.resolve();if(xjsP)return xjsP;xjsP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';s.onload=ok;s.onerror=()=>{xjsP=null;ko(new Error('No se pudo cargar el generador de Excel. Revisa tu conexión.'))};document.head.appendChild(s)});return xjsP}
const XCOL=c=>{let s='';c++;while(c>0){const m=(c-1)%26;s=String.fromCharCode(65+m)+s;c=Math.floor((c-1)/26)}return s};
const argb=rgb=>rgb?('FF'+String(rgb).replace('#','').slice(-6).toUpperCase()):undefined;
/** estilo de xlsx-js-style → ExcelJS */
function xStyle(s){const o={};if(!s)return o;
  if(s.font){const f=s.font;o.font={...(f.name?{name:f.name}:{}),...(f.sz?{size:f.sz}:{}),...(f.bold?{bold:true}:{}),...(f.italic?{italic:true}:{}),...(f.color&&f.color.rgb?{color:{argb:argb(f.color.rgb)}}:{})}}
  if(s.fill&&s.fill.fgColor&&s.fill.fgColor.rgb)o.fill={type:'pattern',pattern:'solid',fgColor:{argb:argb(s.fill.fgColor.rgb)}};
  if(s.alignment){const a=s.alignment;o.alignment={...(a.horizontal?{horizontal:a.horizontal}:{}),...(a.vertical?{vertical:a.vertical==='center'?'middle':a.vertical}:{}),...(a.wrapText?{wrapText:true}:{}),...(a.textRotation?{textRotation:a.textRotation}:{})}}
  if(s.border){const b={};for(const k of['top','bottom','left','right']){const e=s.border[k];if(e&&e.style)b[k]={style:e.style,...(e.color&&e.color.rgb?{color:{argb:argb(e.color.rgb)}}:{})}}o.border=b}
  if(s.numFmt)o.numFmt=s.numFmt;return o}
/* estilos ya convertidos (auditoría de código 08/10, M7): un objeto por estilo distinto y no uno por celda. Primero por
   identidad del objeto (los estilos compartidos) y si no por su contenido. Las celdas comparten el objeto: no se modifica
   en el lugar (siempre se asigna uno nuevo, como ya hace este archivo). */
function xStyleC(cache,s){if(!s)return null;let o=cache.id.get(s);if(o)return o;const k=JSON.stringify(s);o=cache.k.get(k);
  if(!o){o=xStyle(s);cache.k.set(k,o)}cache.id.set(s,o);return o}
/** copia una hoja de xlsx-js-style a ExcelJS; skip = filas (base 0) del encabezado antiguo que no se copian.
    Generador: cada tanto cede el paso (xToJA lo usa para no congelar la pantalla con hojas grandes) */
function* xToJG(wb,name,ws,X,skip,out){const J=wb.addWorksheet(name);out.J=J;skip=skip||0;const cache={id:new WeakMap(),k:new Map()};const keys=Object.keys(ws);let n=0;
  for(const k of keys){if(k[0]==='!')continue;const{r,c}=X.utils.decode_cell(k);if(r<skip)continue;const x=ws[k];const cell=J.getCell(r+1,c+1);
    cell.value=x.f?{formula:x.f,...(x.v!==undefined&&x.v!==''?{result:x.v}:{})}:x.v;const st=xStyleC(cache,x.s);if(st)for(const p of Object.keys(st))cell[p]=st[p];
    if(++n%4000===0)yield n/keys.length}
  xToJEnd(J,ws,skip);return J}
function xToJ(wb,name,ws,X,skip){const out={};const g=xToJG(wb,name,ws,X,skip,out);while(!g.next().done);return out.J}
/** igual que xToJ pero cede el paso a la pantalla cada ~4000 celdas (≈ 200 filas del lookahead); prog(0..1) para el botón */
async function xToJA(wb,name,ws,X,skip,prog){const out={};const g=xToJG(wb,name,ws,X,skip,out);
  for(let s=g.next();!s.done;s=g.next()){if(prog)prog(s.value);await new Promise(r=>setTimeout(r))}return out.J}
function xToJEnd(J,ws,skip){
  for(const m of ws['!merges']||[]){if(m.s.r<skip)continue;try{J.mergeCells(m.s.r+1,m.s.c+1,m.e.r+1,m.e.c+1)}catch(e){}}
  (ws['!cols']||[]).forEach((c,i)=>{if(c&&(c.wch||c.wpx))J.getColumn(i+1).width=c.wch||Math.round(c.wpx/7)});
  (ws['!rows']||[]).forEach((rr,i)=>{if(rr&&rr.hpt&&i>=skip)J.getRow(i+1).height=rr.hpt});
  if(ws['!autofilter'])J.autoFilter=ws['!autofilter'].ref;
  const v=(ws['!views']||[])[0];if(v&&v.state==='frozen')J.views=[{state:'frozen',xSplit:v.xSplit||0,ySplit:v.ySplit||0}];
  return J}
/* ---- encabezado de la empresa: medidas y posiciones del formato corregido ---- */
const XHDR={
  look:{rows:{1:9,2:37.5,3:18,4:17.25,5:15},lab:'C',val:'D',valTo:'J',title:['K2:R5','4W LOOKAHEAD'],code:['S','U','V','X'],logo:'A2:B5',boxes:['A2:B5','C2:J5','K2:R5','S2:X5'],
    font:{lab:{name:'Arial',size:10,bold:true},val:{name:'Arial',size:10},title:{name:'Arial',size:12,bold:true},cl:{name:'Arial Narrow',size:10,bold:true},cv:{name:'Arial Narrow',size:9}},
    img:{e:{col:0.12,row:1.02,w:119,h:63},c:{col:0.15,row:2.33,w:112,h:53}}},
  ppc:{rows:{1:12.75,2:37.5,3:18,4:17.25,5:15},lab:'D',val:'E',valTo:'L',title:['M2:R5','PORCENTAJE DE PLAN CUMPLIDO  ( PPC )'],code:['S','S','T','T'],logo:'B2:C5',boxes:['B2:C5','D2:L5','M2:R5','S2:T5'],
    font:{lab:{name:'Arial',size:10,bold:true},val:{name:'Arial',size:10},title:{name:'Arial',size:12,bold:true},cl:{name:'Arial Narrow',size:10,bold:true},cv:{name:'Arial Narrow',size:9}},
    img:{e:{col:1.02,row:1.44,w:144,h:66},c:{col:2.41,row:1.5,w:146,h:54}}},
  ar:{rows:{1:13.5,2:18,3:18,4:18,5:18,6:9.6},lab:'E',val:'F',valTo:'AM',title:null,code:null,logo:null,boxes:['B2:C5','D2:D5','E2:AM5','AN2:AN5'],merge:['B2:C5','D2:D5'],
    font:{lab:{name:'Calibri',size:11,bold:true},val:{name:'Calibri',size:10}},valFmt:'": "@',dateFmt:'": "d-mmm-yy',
    img:{e:{col:2,row:1.17,w:155,h:83},c:{col:3.09,row:1.33,w:148,h:82}}}};
const xr=a=>{const m=/^([A-Z]+)(\d+)$/.exec(a);let c=0;for(const ch of m[1])c=c*26+ch.charCodeAt(0)-64;return{c,r:+m[2]}};
function xBox(J,ref){const[a,b]=ref.split(':');const A=xr(a),B=xr(b);const th={style:'thin',color:{argb:'FF000000'}};
  for(let r=A.r;r<=B.r;r++)for(let c=A.c;c<=B.c;c++){const cell=J.getCell(r,c);const bd={...(cell.border||{})};if(r===A.r)bd.top=th;if(r===B.r)bd.bottom=th;if(c===A.c)bd.left=th;if(c===B.c)bd.right=th;cell.border=bd}}
const xDate=iso=>{const[y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d))};
/** logos de la empresa y del cliente (Configuración › Proyecto), ya registrados en el libro; null si no hay */
async function xLogos(wb){const p=P();const o={};for(const[k,id]of[['e',p.logoE],['c',p.logoC]]){if(!id)continue;try{const d=await getFoto(id);if(!d)continue;const m=/^data:image\/(png|jpe?g|gif);base64,/.exec(d);if(!m)continue;const sz=await imgSize(d);
    o[k]={id:wb.addImage({base64:d,extension:m[1]==='jpg'?'jpeg':m[1]}),w:sz?sz[0]:1,h:sz?sz[1]:1}}catch(e){}}return o}
/** escribe el encabezado de la empresa en las filas 1–6 de la hoja */
function xHeader(J,kind,L){const H=XHDR[kind];const p=P();const today=todayIso();
  for(const[r,h]of Object.entries(H.rows))J.getRow(+r).height=h;
  const labs=[['PROYECTO',p.fullName||p.name||''],['PROPIETARIO',p.owner||''],['UBICACIÓN',p.location||''],['FECHA',xDate(today)]];
  labs.forEach(([k,v],i)=>{const r=2+i;const lc=J.getCell(H.lab+r);lc.value=k;lc.font=H.font.lab;lc.alignment={horizontal:'left',vertical:'middle'};
    try{J.mergeCells(`${H.val}${r}:${H.valTo}${r}`)}catch(e){}const vc=J.getCell(H.val+r);vc.value=v;vc.font=H.font.val;vc.alignment={horizontal:'left',vertical:'middle',wrapText:kind!=='ar'};
    if(i===3)vc.numFmt=H.dateFmt||'d-mmm-yy';else if(H.valFmt)vc.numFmt=H.valFmt});
  if(H.title){try{J.mergeCells(H.title[0])}catch(e){}const t=J.getCell(H.title[0].split(':')[0]);t.value=H.title[1];t.font=H.font.title;t.alignment={horizontal:'center',vertical:'middle'}}
  if(H.code){const[l1,l2,v1,v2]=H.code;[['CÓDIGO',p.ppcCode||'GP-PR02-F-10'],['REVISIÓN','1.0'],['HECHO POR',me?(me.name||me.email):''],['REVISADO POR','']].forEach(([k,v],i)=>{const r=2+i;
      if(l1!==l2)try{J.mergeCells(`${l1}${r}:${l2}${r}`)}catch(e){}if(v1!==v2)try{J.mergeCells(`${v1}${r}:${v2}${r}`)}catch(e){}
      const a=J.getCell(l1+r);a.value=k;a.font=H.font.cl;a.alignment={horizontal:'left',vertical:'middle'};const b=J.getCell(v1+r);b.value=v?': '+v:'';b.font=H.font.cv;b.alignment={horizontal:'left',vertical:'middle'}})}
  if(H.logo)try{J.mergeCells(H.logo)}catch(e){}for(const m of H.merge||[])try{J.mergeCells(m)}catch(e){}
  H.boxes.forEach(b=>xBox(J,b));
  /* logos: dentro de su recuadro, sin deformarse */
  for(const k of['e','c']){const g=L&&L[k];const box=H.img[k];if(!g||!box)continue;const s=Math.min(box.w/g.w,box.h/g.h);J.addImage(g.id,{tl:{col:box.col,row:box.row},ext:{width:Math.round(g.w*s),height:Math.round(g.h*s)},editAs:'oneCell'})}}
/* ---- hoja AR: análisis de restricciones (4 semanas que vienen desde la semana n0, con fórmulas X / O) ---- */
/* Las liberadas antes de la ventana de 4 semanas se archivan (decidido con el dueño, auditoría de código 08/10, M7): en AR quedan
   las pendientes y las liberadas desde el primer día de la ventana; las demás van a la hoja «Liberadas (archivo)» (solo valores,
   sin fórmulas), que se agrega solo si hay alguna. Async: cede el paso a la pantalla cada 200 filas (hay que esperarla). */
const xArDays=n0=>{const D=[];for(let w=0;w<4;w++)D.push(...weekDays(n0+w),addD(weekDays(n0+w)[5],1));return D};
/** separa la lista del AR: {ar: pendientes y liberadas desde d0 (o sin fecha), arch: liberadas antes de d0} */
function xArSplit(list,d0){const ar=[],arch=[];for(const q of list)(q.status==='lib'&&q.freed&&q.freed<d0?arch:ar).push(q);return{ar,arch}}
const xYield=()=>new Promise(r=>setTimeout(r));
async function xAR(wb,list0,n0,L){const J=wb.addWorksheet('AR');wb.calcProperties={fullCalcOnLoad:true};
  /* resultado de cada día (como la fórmula): O = se levantó ese día; X = la fecha comprometida (o la requerida si no hay compromiso) */
  const dayRes=(q,d)=>{const fr=q.status==='lib'?q.freed:'';if(fr)return fr===d?'O':'';return(q.comp||q.need)===d?'X':''};
  const DAYS=xArDays(n0);const{ar:list,arch}=xArSplit(list0,DAYS[0]);
  const cnt=w=>{let o=0,x=0;for(const q of list)for(let k=0;k<7;k++){const r=dayRes(q,DAYS[w*7+k]);if(r==='O')o++;else if(r==='X')x++}return{o,x}};
  const tot=[0,1,2,3].reduce((t,w)=>{const c=cnt(w);return t+c.o+c.x},0);const W=4,D=W*7;const C0=12;/* L */const last=Math.max(13,12+list.length);const today=todayIso();
  const thin={style:'thin',color:{argb:'FF000000'}};const B={top:thin,bottom:thin,left:thin,right:thin};const f8={name:'Calibri',size:8,bold:true};const f10={name:'Calibri',size:10};
  const gray={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F2F2'}};const red={type:'pattern',pattern:'solid',fgColor:{argb:'FFC00000'}};
  const widths={A:4.14,B:6.86,C:34.86,D:36,E:14.29,F:14.29,G:14.29,H:14.29,I:14.29,J:14.14,K:13.29,AN:39.86};for(const[k,w]of Object.entries(widths))J.getColumn(k).width=w;for(let i=0;i<D;i++)J.getColumn(C0+i).width=3.14;
  xHeader(J,'ar',L);
  const cell=(ref,v,o={})=>{const c=J.getCell(ref);c.value=v;c.font=o.font||f8;c.alignment={horizontal:'center',vertical:'middle',wrapText:!!o.wrap,...(o.rot?{textRotation:o.rot}:{})};c.border=B;if(o.fill)c.fill=o.fill;if(o.fmt)c.numFmt=o.fmt;return c};
  const box=(ref,v,o)=>{try{J.mergeCells(ref)}catch(e){}const[a,b]=ref.split(':');const A=xr(a),Z=xr(b);for(let r=A.r;r<=Z.r;r++)for(let c=A.c;c<=Z.c;c++){const x=J.getCell(r,c);x.border=B;if(o&&o.fill)x.fill=o.fill}return cell(a,v,o)};
  [7,8,9].forEach(r=>J.getRow(r).height=16.15);J.getRow(10).height=15.75;J.getRow(11).height=54.6;J.getRow(12).height=6.75;
  box('B7:D9','',{fill:gray});box('E7:K7','RESTRICCIONES LEVANTADAS SOBRE RESTRICCIONES TOTALES',{fill:gray});box('E8:K8','N° TOTAL DE RESTRICCIONES',{fill:gray});box('E9:K9','% DE RESTRICCIONES POR SEMANA',{fill:gray});
  for(let w=0;w<W;w++){const a=XCOL(C0-1+w*7),b=XCOL(C0-1+w*7+6),m1=XCOL(C0-1+w*7+3),m2=XCOL(C0-1+w*7+4);const rg=`${a}13:${b}${last}`;
    const c=cnt(w);
    box(`${a}7:${m1}7`,{formula:`CONCATENATE(COUNTIF(${rg},"O"),"/",COUNTIF(${rg},"O")+COUNTIF(${rg},"X"))`,result:`${c.o}/${c.o+c.x}`},{fill:gray});
    box(`${m2}7:${b}7`,{formula:`IF((COUNTIF(${rg},"O")+COUNTIF(${rg},"X"))=0,0,COUNTIF(${rg},"O")/(COUNTIF(${rg},"O")+COUNTIF(${rg},"X")))`,result:c.o+c.x?c.o/(c.o+c.x):0},{fill:gray,fmt:'0%'});
    box(`${a}8:${b}8`,{formula:`COUNTIF(${rg},"X")+COUNTIF(${rg},"O")`,result:c.o+c.x},{fill:gray});
    box(`${a}9:${b}9`,{formula:`IFERROR(${a}8/SUM($L$8:$AM$8),"")`,result:tot?(c.o+c.x)/tot:''},{fill:gray,fmt:'0%'});
    box(`${a}10:${b}10`,w===0?n0:{formula:`${XCOL(C0-1+(w-1)*7)}10+1`,result:n0+w},{fmt:'"SEMANA" 00'});
    for(let d=0;d<7;d++){const col=XCOL(C0-1+w*7+d);cell(`${col}11`,w===0&&d===0?xDate(DAYS[0]):{formula:`${XCOL(C0-2+w*7+d)}11+1`,result:xDate(DAYS[w*7+d])},{rot:90,fmt:'d-mmm-yy',wrap:true})}}
  cell('AN8',{formula:'SUM(L8:AM8)',result:tot},{fill:gray});cell('AN9',{formula:'SUM(L9:AM9)',result:tot?1:0},{fill:gray,fmt:'0%'});cell('AN7','',{fill:gray});
  const H=[['B','Item'],['C','Descripción de la Actividad'],['D','Descripción de la Restricción'],['E','Fecha de Identificación'],['F','Fecha requerida de levantamiento\n(PROD)'],['G','Responsable Levantamiento'],['H','Área responsable'],['I','Compromiso de Levantamiento\n(AS)'],['J','Fecha de levantamiento'],['K','Especialidad']];
  H.forEach(([c,t])=>box(`${c}10:${c}11`,t,{wrap:true,...(c==='J'||c==='K'?{fill:red,font:{...f8,color:{argb:'FFFFFFFF'}}}:{})}));
  box('AN10:AN11','OBSERVACIONES - AS\n(Impedimento de las Áreas de Soporte para levantar la restricción, comentarios, etc)',{wrap:true});
  /* una fila por restricción: X en la fecha comprometida (o la requerida si no hay compromiso) y O cuando se levantó */
  for(let i=0;i<list.length;i++){const q=list[i];if(i&&i%200===0)await xYield();const r=13+i;const x=S.act.get(q.actId);const sc=q.sc||(x&&x.sc)||'';J.getRow(r).height=25.5;
    const d=(v,col)=>{const c=cell(col+r,v?xDate(v):null,{font:f10,fmt:'d-mmm',wrap:true});return c};
    cell('B'+r,i+1,{font:f10});cell('C'+r,x?x.name:(q.actId?'(ya no está en el lookahead)':''),{font:f10,wrap:true}).alignment={horizontal:'left',vertical:'middle',wrapText:true};
    cell('D'+r,q.desc||q.type||'',{font:f10,wrap:true}).alignment={horizontal:'left',vertical:'middle',wrapText:true};
    d(q.created,'E');d(q.need,'F');cell('G'+r,q.resp||'',{font:f10,wrap:true});cell('H'+r,grpOf(q)==='area'?(q.area||'Otras áreas').toUpperCase():'PRODUCCIÓN',{font:f10,wrap:true});
    d(q.comp,'I');d(q.status==='lib'?q.freed:'','J');cell('K'+r,sc?(conOf(sc).esp||conOf(sc).partida||''):'',{font:f10,wrap:true});
    for(let k=0;k<D;k++){const col=XCOL(C0-1+k);cell(col+r,{formula:`IF($J${r}="",IF($I${r}="",IF($F${r}=${col}$11,"X",""),IF($I${r}=${col}$11,"X","")),IF($J${r}=${col}$11,"O",""))`,result:dayRes(q,DAYS[k])},{font:f10})}
    cell('AN'+r,q.obsAs||'',{font:f10,wrap:true})}
  if(list.length)J.addConditionalFormatting({ref:`L13:AM${last}`,rules:[
    {type:'containsText',operator:'containsText',text:'O',style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FF00B050'}},font:{color:{argb:'FFFFFFFF'},bold:true}}},
    {type:'containsText',operator:'containsText',text:'X',style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFF0000'}},font:{color:{argb:'FFFFFFFF'},bold:true}}}]});
  J.views=[{state:'frozen',xSplit:4,ySplit:12,showGridLines:false}];
  if(arch.length)await xArArch(wb,arch,DAYS[0]);return J}
/** hoja «Liberadas (archivo)»: restricciones liberadas antes de la ventana del AR, solo valores (sin fórmulas) */
async function xArArch(wb,list,d0){const J=wb.addWorksheet('Liberadas (archivo)');
  const thin={style:'thin',color:{argb:'FFBFBFBF'}};const B={top:thin,bottom:thin,left:thin,right:thin};const f10={name:'Calibri',size:10};
  const t=J.getCell('A1');t.value='RESTRICCIONES LIBERADAS (ARCHIVO)';t.font={name:'Calibri',size:14,bold:true,color:{argb:'FF1F3A4D'}};
  const s=J.getCell('A2');s.value=`Liberadas antes del ${fmtD(d0)} ${d0.slice(0,4)} (inicio de las 4 semanas del AR) · ${list.length} ${list.length===1?'restricción':'restricciones'}`;s.font={name:'Calibri',size:10,color:{argb:'FF555555'}};
  const H=[['N.º',5],['Actividad',34],['Ubicación',22],['Tipo',16],['Descripción de la restricción',40],['Responsable',20],['Área responsable',18],['Especialidad',18],['Fecha de identificación',13],['Fecha requerida',13],['Compromiso',13],['Fecha liberada',13],['Liberó',18],['Observaciones',36]];
  const hf={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F3A4D'}};const hr=4;
  H.forEach(([h,w],i)=>{const c=J.getCell(hr,i+1);c.value=h;c.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};c.fill=hf;c.border=B;c.alignment={horizontal:'center',vertical:'middle',wrapText:true};J.getColumn(i+1).width=w});
  J.getRow(hr).height=30;const al={vertical:'middle',wrapText:true},alc={horizontal:'center',vertical:'middle'};
  for(let i=0;i<list.length;i++){if(i&&i%200===0)await xYield();const q=list[i];const x=S.act.get(q.actId)||(ARCH.act&&ARCH.act.get(q.actId));const a=x&&(S.amb.get(x.ambId)||(ARCH.amb&&ARCH.amb.get(x.ambId)));
    const pp=S.pis.get(restrPiso(q))||(ARCH.pis&&ARCH.pis.get(restrPiso(q)));const sc=q.sc||(x&&x.sc)||'';
    const v=[i+1,x?x.name:(q.actId?'(ya no está en el lookahead)':''),[pp&&pp.code,a&&(a.code+' '+(a.name||''))].filter(Boolean).join(' · '),q.type||'',q.desc||'',q.resp||'',grpOf(q)==='area'?(q.area||'Otras áreas').toUpperCase():'PRODUCCIÓN',sc?(conOf(sc).esp||conOf(sc).partida||''):'',
      q.created?xDate(q.created):null,q.need?xDate(q.need):null,q.comp?xDate(q.comp):null,q.freed?xDate(q.freed):null,q.libN||'',q.obsAs||''];
    v.forEach((val,c)=>{const cell=J.getCell(hr+1+i,c+1);cell.value=val;cell.font=f10;cell.border=B;cell.alignment=c===0||(c>=8&&c<=11)?alc:al;if(c>=8&&c<=11)cell.numFmt='d-mmm-yy'})}
  J.autoFilter={from:{row:hr,column:1},to:{row:hr+Math.max(1,list.length),column:H.length}};
  J.views=[{state:'frozen',xSplit:0,ySplit:hr}];return J}
/* ---- hoja Sectorización: la lámina base de cada piso con sus sectores y ambientes ---- */
async function xSector(wb,pids){const J=wb.addWorksheet('Sectorización');J.getColumn(1).width=2;let r=2;let any=false;
  for(const pid of pids){const p=S.pis.get(pid);if(!p)continue;const im=typeof szImage==='function'?await szImage(pid).catch(()=>null):null;
    const t=J.getCell(r,2);t.value=`${p.code} · ${p.name}`;t.font={name:'Calibri',size:13,bold:true,color:{argb:'FF1F3A4D'}};r++;
    if(!im){J.getCell(r,2).value='Sin lámina base o sin ambientes ubicados en Sectorización.';J.getCell(r,2).font={name:'Calibri',size:10,italic:true,color:{argb:'FF777777'}};r+=2;continue}
    any=true;const id=wb.addImage({base64:im.data,extension:'jpeg'});J.addImage(id,{tl:{col:1,row:r-1},ext:{width:im.w,height:im.h},editAs:'oneCell'});r+=Math.ceil(im.h/20)+2}
  return any||pids.length?J:null}
/** guarda el libro */
async function xSave(wb,name){const buf=await wb.xlsx.writeBuffer();saveBlob(name,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}))}
/** restricciones del piso o pisos visibles, en el orden del análisis (las más antiguas primero) */
const arList=()=>restrInScope().filter(q=>!rArch(q)).sort((a,b)=>(a.created||'').localeCompare(b.created||'')||String(a.id).localeCompare(String(b.id)));
