"use strict";
/* LPS 911 · Tareo: Excel de RR.HH. y Costos (docs/ia/tareo.md, «RR.HH. y Costos en vivo»), con las mismas cifras de las pantallas
   (tsCalc). Un libro por periodo: 0 Resumen (con controles de cuadre), 1–3 RR.HH. (asistencia, horas para planilla, altas y bajas),
   4–6 Costos (por partida, por UA Powers, avance vs meta), 7 Detalle (una fila por obrero, día y partida) y 8–9 catálogos.
   Solo valores, encabezado fijo, filtros y DNI como texto. El Excel con el formato antiguo de costos sigue en Costos › Publicaciones.
   Globales: tsx*. */

function tsxSt(){const bd={style:'thin',color:{rgb:'CDD3CC'}};const B={top:bd,bottom:bd,left:bd,right:bd};const ctr={horizontal:'center',vertical:'center',wrapText:true};
  const f=(o)=>({border:B,...o});
  return{tit:{font:{bold:true,sz:15,color:{rgb:'1B211E'}}},sub:{font:{sz:11,color:{rgb:'646D67'}}},h2:{font:{bold:true,sz:12}},
    hdr:{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F5F7A'}},alignment:ctr,border:B},
    grp:{font:{bold:true},fill:{fgColor:{rgb:'EEF1EC'}},border:B},txt:f({}),num:f({alignment:{horizontal:'right'}}),ctr:f({alignment:{horizontal:'center'}}),
    tot:{font:{bold:true},fill:{fgColor:{rgb:'F5F6F3'}},border:B,alignment:{horizontal:'right'}},totL:{font:{bold:true},fill:{fgColor:{rgb:'F5F6F3'}},border:B},
    ok:f({font:{bold:true,color:{rgb:'2E7D4F'}}}),no:f({font:{bold:true,color:{rgb:'B83A2E'}}}),pie:{font:{italic:true,sz:9,color:{rgb:'646D67'}}},
    cod:c=>f({alignment:{horizontal:'center'},font:{bold:true,color:{rgb:{F:'B83A2E',SU:'B83A2E',LS:'B83A2E','?':'B83A2E',CE:'B83A2E',P:'9A6A12',EX:'9A6A12',DM:'1F5F7A',DA:'1F5F7A',VA:'1F5F7A',SM:'1F5F7A',SE:'1F5F7A',IN:'2E7D4F'}[c]||'1B211E'}},
      ...(c==='D'||c==='FE'||c==='·'||c==='—'?{fill:{fgColor:{rgb:'F5F6F3'}},font:{color:{rgb:'646D67'}}}:{})})}}
/* encabezado común: proyecto, título de la hoja y periodo */
function tsxHead(sh,S0,tit,per){sh.set(0,0,tpProj(),S0.sub);sh.set(1,0,tit,S0.tit);sh.set(2,0,per,S0.sub);return 4}
const tsxFil=(ws,X,r,c1,c2,n)=>{ws['!autofilter']={ref:X.utils.encode_range({s:{r,c:c1},e:{r:r+Math.max(1,n),c:c2}})}};

async function tsxBajar(origen,a,b,tipo){if(TPK.busy)return;TPK.busy='x';requestRender();
  try{await loadXlsx();const X=window.XLSX;const PB=await tpxVigentes(a,b);
    if(!PB.size){toast('No hay días publicados en ese periodo.');return}
    let H=TCO.hhpc;if(!TCO.hok){const sn=await fcol('hhpc').get();H=new Map();sn.docs.forEach(x=>H.set(x.id,x.data()||{}))}
    const A=new Map();for(const[f,d]of H){if(f>b)continue;for(const[k,o]of Object.entries(d.pcs||{}))A.set(k,tR2((A.get(k)||0)+tpNum(o&&o.hh)))}
    const R=tsCalc(a,b,PB);const per=tsPerTxt(tipo,a,b);const wb=X.utils.book_new();const L=[...R.PC.values()].map(x=>({...x,...tcoPc(x.id,R)})).sort((p,q)=>tCmpCod(p.cod,q.cod));
    const add=(ws,n)=>X.utils.book_append_sheet(wb,ws,n);
    add(tsxResumen(X,R,per,L,PB),'0 Resumen');add(tsxAsis(X,R,per),'1 RRHH Asistencia');add(tsxHoras(X,R,per),'2 RRHH Horas');add(tsxAltas(X,R,per),'3 RRHH Altas y bajas');
    add(tsxPart(X,R,per,L,A),'4 Costos por partida');add(tsxUA(X,R,per,L),'5 Costos por UA');add(tsxMeta(X,R,per,A),'6 Costos vs meta');add(tsxDet(X,R,per,PB),'7 Detalle');
    add(tsxPer(X,R),'8 Personal');add(tsxCat(X,R),'9 Partidas');
    const n=typeof tSemN==='function'?tSemN(a):null;const pre=(P().code||'').trim();
    const name=tipo==='sem'?`Tareo_${n?'S'+n+'_':''}${tpxDm(a)}-${tpxDm(b)}.xlsx`:`Tareo_${a}_al_${b}.xlsx`;
    saveBlob((pre?pre+'_':'')+name,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel generado')}
  catch(e){console.error(e);toast('No se pudo armar el Excel: '+(e&&(e.code||e.message)||e))}
  finally{TPK.busy='';requestRender()}}

function tsxResumen(X,R,per,L,PB){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Tareo · resumen del periodo',per);const T=R.T;
  const hhPc=tR2(L.reduce((s,x)=>s+x.tot,0));const sinUA=L.filter(x=>!tpxUaP(x.ua));const lab=R.days.filter(f=>!tNoLab(f)&&f<=todayIso());
  sh.set(r,0,'Totales',S0.h2);r++;
  const kv=[['Obreros',T.obreros],['Horas normales (HN)',T.hn],[`HE al ${R.P.sob1} %`,T.h60],[`HE al ${R.P.sob2} %`,T.h100],['Domingo y feriado (al 100 %)',T.df],['Total HH',T.hh],
    ['Días con bono por altura',T.alt],['Días de descanso médico',T.dm],['Faltas',T.f],['Días laborados (movilidad)',T.mov],['Dominical (jornales)',T.dsc]];
  if(tplSoles())kv.push(['Costo de mano de obra estimado (S/)',tR2(T.cost)]);
  for(const[k,v]of kv){sh.set(r,0,k,S0.txt);sh.set(r,1,v,S0.num);r++}
  r++;sh.set(r,0,'Controles de cuadre',S0.h2);r++;
  const ck=[[Math.abs(hhPc-T.hh)<0.01,'HH por partida = HH de RR.HH.',`${hhPc} = ${T.hh}`],...(R.P.avisoUA?[[!sinUA.length,'Todas las partidas con horas tienen UA de Powers',sinUA.map(x=>`${x.cod} ${x.nom} (${x.tot} HH)`).join('; ')||'sí']]:[]),
    [R.T.sinTareo===0,'Todos los activos figuran en las publicaciones',R.T.sinTareo?`${R.T.sinTareo} con días «?»`:'sí'],[lab.every(f=>R.pub.includes(f)),'Días laborables publicados',`${lab.filter(f=>R.pub.includes(f)).length} de ${lab.length}`]];
  for(const[ok,t,v]of ck){sh.set(r,0,t,S0.txt);sh.set(r,1,ok?'OK':'REVISAR',ok?S0.ok:S0.no);sh.set(r,2,v,S0.txt);r++}
  r++;sh.set(r,0,'Versiones publicadas',S0.h2);r++;['Fecha','Versión','Publicó','Cuándo','Motivo'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));r++;
  for(const f of R.days){const p=PB.get(f);[toDia(f),p?'v'+p.v:tNoLab(f)?'no laborable':'sin publicar',p?tpWho(p.by,p.byN):'',p?tpAt(p.at):'',p&&p.motivo||''].forEach((v,c)=>sh.set(r,c,v,c===1&&!p&&!tNoLab(f)?S0.no:S0.txt));r++}
  r++;sh.set(r,0,`Generado el ${tpAt(NOW())} desde la app (cifras de las publicaciones vigentes).`,S0.pie);
  return sh.done([44,16,30,18,30])}

function tsxAsis(X,R,per){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'RR.HH. · asistencia por día',per);
  const H=['N°','DNI','Apellido paterno','Apellido materno','Nombres','Categoría','Cuadrilla',...R.days.map(f=>tsDiaL(f)),'Días laborados','Días con altura','Días DM','Faltas'];
  H.forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;const nd=R.days.length;
  R.W.forEach((w,i)=>{const ap=tpxApes(w);[i+1,String(w.dni),ap[0],ap[1],w.nom||'',w.catN,w.cua||''].forEach((v,c)=>sh.set(r,c,v,c===0?S0.ctr:S0.txt));
    w.d.forEach((c,j)=>sh.set(r,7+j,c.code+(c.alt?' ▲':''),S0.cod(c.code)));[w.dias,w.alt,w.dm,w.f].forEach((v,k)=>sh.set(r,7+nd+k,v,S0.num));r++});
  sh.set(r,4,'Total',S0.totL);[R.T.dias,R.T.alt,R.T.dm,R.T.f].forEach((v,k)=>sh.set(r,7+nd+k,v,S0.tot));r+=2;
  sh.set(r,0,TPLA_COD.map(x=>`${x[0]} = ${x[1]}`).join(' · ')+' · ▲ = bono por altura',S0.pie);
  const ws=sh.done([5,11,16,16,22,10,15,...R.days.map(()=>7),10,9,8,7],{xSplit:5,ySplit:r0+1});tsxFil(ws,X,r0,0,H.length-1,R.W.length);return ws}

function tsxHoras(X,R,per){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'RR.HH. · horas para planilla',per);const P=R.P;
  const H=['N°','DNI','Apellidos y nombres','Categoría',...R.days.map(f=>tsDiaL(f)),'HN',`HE ${P.sob1}%`,`HE ${P.sob2}%`,'Dom/Fer (100%)','Total HH','Días laborados','Movilidad (días)','Dominical'];
  H.forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;const nd=R.days.length;
  R.W.forEach((w,i)=>{[i+1,String(w.dni),[w.ape,w.nom].filter(Boolean).join(' '),w.catN].forEach((v,c)=>sh.set(r,c,v,c===0?S0.ctr:S0.txt));
    w.d.forEach((c,j)=>sh.set(r,4+j,c.h||'',c.h?S0.num:S0.cod(c.code)));[w.hn,w.h60,w.h100,w.df,w.hh,w.dias,w.mov,w.dsc].forEach((v,k)=>sh.set(r,4+nd+k,v,S0.num));r++});
  sh.set(r,2,'Total',S0.totL);const T=R.T;[T.hn,T.h60,T.h100,T.df,T.hh,T.dias,T.mov,T.dsc].forEach((v,k)=>sh.set(r,4+nd+k,v,S0.tot));const rT=r;r+=2;
  sh.set(r,0,`HE: las ${P.he60h} primeras horas después de la jornada del día al ${P.sob1} %; desde la siguiente al ${P.sob2} %. Domingo y feriado trabajados: todas las horas al ${P.sob2} %. Dominical: días laborados de lunes a sábado (el feriado trabajado o no laborado cuenta) ÷ 6 por semana (tope 1 jornal), con 4 decimales.`,S0.pie);
  const ws=sh.done([5,11,34,10,...R.days.map(()=>7),8,8,8,10,9,9,9,9],{xSplit:3,ySplit:r0+1});tsxFil(ws,X,r0,0,H.length-1,R.W.length);
  /* dominical con 4 decimales (1/6 = 0,1667), no redondeado a 2 */
  const cD=4+nd+7;for(let i=r0+1;i<=rT;i++){const c=ws[X.utils.encode_cell({r:i,c:cD})];if(c&&c.t==='n')c.z='0.0###'}return ws}

function tsxAltas(X,R,per){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'RR.HH. · altas y bajas',per);const L=[];
  if(S.tper)for(const t of S.tper.values()){if(t.arch)continue;const pr=Array.isArray(t.per)&&t.per.length?t.per:[{ing:t.ing,ces:t.ces,mot:t.mot}];
    for(const x of pr){if(x.ing&&x.ing>=R.a&&x.ing<=R.b)L.push([x.ing,'Ingreso',t,'']);if(x.ces&&x.ces>=R.a&&x.ces<=R.b)L.push([x.ces,'Cese',t,x.mot||''])}}
  L.sort((p,q)=>p[0]<q[0]?-1:1);['Fecha','Movimiento','DNI','Apellidos y nombres','Categoría','Cuadrilla','Motivo'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));r++;
  for(const[f,k,t,m]of L){[tFmt(f),k,String(t.dni||t.id),tName(t),tpxCat(t.cat)||'',t.cua||'',m].forEach((v,c)=>sh.set(r,c,v,c===1?(k==='Cese'?S0.no:S0.ok):S0.txt));r++}
  if(!L.length)sh.set(r,0,'Nadie ingresó ni cesó en este periodo.',S0.pie);return sh.done([11,11,11,34,10,15,26])}

function tsxPart(X,R,per,L,A){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Costos · HH por partida',per);const days=R.pub;const soles=tplSoles();
  const H=['Código','Partida','UA tareo','UA Powers','Operario','Oficial','Peón','Otros','Total HH','de ellas HE',...(soles?['Costo (S/)']:[]),...days.map(f=>tsDiaL(f)),'HH meta','HH acumuladas','% consumido'];
  H.forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;let g=null;const o=soles?1:0;
  for(const x of L){if(x.grp!==g){g=x.grp;const gt=tR2(L.filter(y=>y.grp===g).reduce((s,y)=>s+y.tot,0));sh.set(r,0,g,S0.grp);sh.set(r,1,(x.grpN||'').toUpperCase(),S0.grp);for(let c=2;c<H.length;c++)sh.set(r,c,c===8?gt:'',S0.grp);r++}
    const ac=A.get(x.id)||0;[x.cod,x.nom,x.ua||'',tpxUaP(x.ua)||'SIN UA',x.c.OP,x.c.OF,x.c.PE,x.c.OT,x.tot,x.he].forEach((v,c)=>sh.set(r,c,v,c===3&&!tpxUaP(x.ua)?S0.no:c>3?S0.num:S0.txt));
    if(soles)sh.set(r,10,tR2(x.cost),S0.num);days.forEach((f,j)=>sh.set(r,10+o+j,x.dia[f]||'',S0.num));const c2=10+o+days.length;
    sh.set(r,c2,x.hhp||'',S0.num);sh.set(r,c2+1,ac||'',S0.num);sh.set(r,c2+2,x.hhp?tR2(ac/x.hhp*100):'',x.hhp&&ac>x.hhp?S0.no:S0.num);r++}
  sh.set(r,1,'Total',S0.totL);['OP','OF','PE','OT'].forEach((k,i)=>sh.set(r,4+i,tR2(L.reduce((s,x)=>s+x.c[k],0)),S0.tot));sh.set(r,8,tR2(L.reduce((s,x)=>s+x.tot,0)),S0.tot);sh.set(r,9,tR2(L.reduce((s,x)=>s+x.he,0)),S0.tot);
  if(soles)sh.set(r,10,tR2(L.reduce((s,x)=>s+x.cost,0)),S0.tot);r+=2;
  sh.set(r,0,'Las HE de cada obrero se reparten entre sus partidas del día en proporción a las horas. % consumido = HH acumuladas desde el inicio (días publicados) ÷ HH del presupuesto meta.',S0.pie);
  return sh.done([8,38,15,12,9,9,9,8,9,9,...(soles?[11]:[]),...days.map(()=>7),9,11,10],{xSplit:2,ySplit:r0+1})}

function tsxUA(X,R,per,L){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Costos · HH por cuenta UA de Powers y categoría',per);
  ['UA Powers','Partidas','Operario','Oficial','Peón','Otros','Total HH'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;const U2=tcoUAagg(L);
  for(const o of U2){[o.u,o.cods.sort(tCmpCod).join(', '),o.c.OP,o.c.OF,o.c.PE,o.c.OT,o.tot].forEach((v,c)=>sh.set(r,c,v,c===0&&o.u==='(sin UA)'?S0.no:c>1?S0.num:S0.txt));r++}
  sh.set(r,0,'TOTAL',S0.totL);['OP','OF','PE','OT'].forEach((k,i)=>sh.set(r,2+i,tR2(U2.reduce((s,o)=>s+o.c[k],0)),S0.tot));sh.set(r,6,tR2(U2.reduce((s,o)=>s+o.tot,0)),S0.tot);
  return sh.done([14,40,10,10,10,9,10],{xSplit:1,ySplit:r0+1})}

function tsxMeta(X,R,per,A){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Costos · avance contra el presupuesto meta',per+' · acumulado desde el inicio');
  ['Código','Partida','und','Metrado','HH meta','HH/und meta','HH del periodo','HH acumuladas','% consumido'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;
  const L=(S.tpc?[...S.tpc.values()]:[]).filter(x=>!x.arch&&(x.act!==false||A.get(x.id))).map(x=>({...tcoPc(x.id,R),ac:A.get(x.id)||0,pe:(R.PC.get(x.id)||{}).tot||0})).sort((p,q)=>tCmpCod(p.cod,q.cod));
  for(const x of L){[x.cod,x.nom,x.und,x.met||'',x.hhp||'',x.met&&x.hhp?tR2(x.hhp/x.met):'',x.pe||'',x.ac||'',x.hhp?tR2(x.ac/x.hhp*100):''].forEach((v,c)=>sh.set(r,c,v,c===8&&x.hhp&&x.ac>x.hhp?S0.no:c>2?S0.num:S0.txt));r++}
  return sh.done([8,40,7,10,10,10,10,11,10],{xSplit:2,ySplit:r0+1})}

function tsxDet(X,R,per,PB){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Detalle · una fila por obrero, día y partida (para filtros y tablas dinámicas)',per);
  const H=['Fecha','DNI','Apellidos y nombres','Categoría','Cuadrilla','Capataz','Código','Partida','UA tareo','UA Powers','HH','HE (prorrateo)','Bono altura','Versión'];H.forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;let n=0;
  for(const w of R.W)for(const c of w.d)for(const[k,h,x3]of c.pcs){const p=PB.get(c.f);const m=(p&&p.pcs||{})[k]||tcoPc(k,R);const e=x3!=null?x3:c.h?tR2(h*(c.h60+c.h100+c.df)/c.h):0;
    [tFmt(c.f),String(w.dni),[w.ape,w.nom].filter(Boolean).join(' '),c.catN||w.catN,c.cua||w.cua||'',w.capN||'',m.cod||k,m.nom||'',m.ua||'',tpxUaP(m.ua)||'',h,e,c.alt?'Sí':'',p?'v'+p.v:''].forEach((v,j)=>sh.set(r,j,v,j===10||j===11?S0.num:S0.txt));r++;n++}
  const ws=sh.done([11,11,32,10,15,20,8,36,15,12,7,9,8,8],{xSplit:0,ySplit:r0+1});tsxFil(ws,X,r0,0,H.length-1,n);return ws}

function tsxPer(X,R){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Personal obrero del periodo','Ficha del máster (Personal)');
  ['N°','DNI','Apellido paterno','Apellido materno','Nombres','Categoría','Puesto','Cuadrilla','Capataz','Ingreso','Cese','Pensiones','N.° hijos'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;
  R.W.forEach((w,i)=>{const t={...((S.tper&&S.tper.get(w.dni))||{}),...tPriv(w.dni)};const ap=tpxApes(w);[i+1,String(w.dni),ap[0],ap[1],w.nom||'',w.catN,t.pue||'',w.cua||'',w.capN||(t.cap?tCapName(t.cap):''),tFmt(t.ing)||'',tFmt(t.ces)||'',t.afp||'',t.hij!=null&&t.hij!==''?+t.hij:''].forEach((v,c)=>sh.set(r,c,v,c===0||c===12?S0.ctr:S0.txt));r++});
  const ws=sh.done([5,11,16,16,22,10,24,15,22,11,11,14,8],{xSplit:0,ySplit:r0+1});tsxFil(ws,X,r0,0,12,R.W.length);return ws}

function tsxCat(X,R){const S0=tsxSt(),sh=tpxSheet(X);let r=tsxHead(sh,S0,'Partidas de control','Presupuesto meta');
  ['Código','Descripción','und','Metrado','HH meta','HH/und','UA tareo','UA Powers'].forEach((h,c)=>sh.set(r,c,h,S0.hdr));const r0=r;r++;let g=null;
  const L=(S.tpc?[...S.tpc.values()]:[]).filter(x=>!x.arch).map(x=>tcoPc(x.id,R)).sort((p,q)=>tCmpCod(p.cod,q.cod));
  for(const x of L){if(x.grp!==g){g=x.grp;sh.set(r,0,g,S0.grp);sh.set(r,1,(x.grpN||'').toUpperCase(),S0.grp);for(let c=2;c<8;c++)sh.set(r,c,'',S0.grp);r++}
    [x.cod,x.nom,x.und,x.met||'',x.hhp||'',x.met&&x.hhp?tR2(x.hhp/x.met):'',x.ua||'',tpxUaP(x.ua)||''].forEach((v,c)=>sh.set(r,c,v,c===7&&!x.ua?S0.no:c>2&&c<6?S0.num:S0.txt));r++}
  return sh.done([8,44,7,10,10,9,16,13],{xSplit:2,ySplit:r0+1})}
