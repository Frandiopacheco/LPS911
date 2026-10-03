"use strict";
/* LPS 911 · Reporte PDF de cumplimiento y exportes a Excel.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
/* ================= REPORTE PDF DE CUMPLIMIENTO ================= */
const PDFJS=['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'];let pdfP=null;
function loadPdf(){if(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API.autoTable)return Promise.resolve();if(pdfP)return pdfP;
  const ls=src=>new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ko(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión.'));document.head.appendChild(s)});
  pdfP=ls(PDFJS[0]).then(()=>ls(PDFJS[1])).catch(e=>{pdfP=null;throw e});return pdfP}
async function getFoto(id){if(FOTO.get(id))return FOTO.get(id);try{const d=await fcol('fotos').doc(id).get();if(d.exists){const v=d.data().data;FOTO.set(id,v);return v}}catch(e){}return null}
const imgSize=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok([i.naturalWidth,i.naturalHeight]);i.onerror=()=>ok(null);i.src=src});
async function reportPdf(d){const btn=$('#bpdf');const bt=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Generando…'}
  try{await ensureDaily(addD(d,-1));
    const vpAll=visPisos();const D0=dayData([d],new Set(vpAll.map(x=>x.id)));
    const noVer=vpAll.filter(x=>D0.piA[x.id]&&!D0.piA[x.id].ver&&!D0.extras.some(e=>e.p&&e.p.id===x.id)).map(x=>x.code+' '+x.name);
    const vp=U.pdfSkip?vpAll.filter(x=>(D0.piA[x.id]&&D0.piA[x.id].ver)||D0.extras.some(e=>e.p&&e.p.id===x.id)):vpAll;
    const vset=new Set(vp.map(x=>x.id));const D=dayData([d],vset);const t=D.tot;
    if(!D0.tot.prog&&!D0.extras.length){toast('No hay actividades programadas ese día.');return}
    if(!t.prog&&!D.extras.length){toast('Nadie registró avance ese día. Desmarca “Omitir pisos sin verificar” para sacar el reporte igual.');return}
    await loadPdf();const{jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    const p=P();const W=297,H=210,M=12;
    const T=v=>String(v??'').normalize('NFC').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g,'');
    const hex=c=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');const n=m?parseInt(m[1],16):0x888888;return[n>>16&255,n>>8&255,n&255]};
    const dname=`${DOWN[(pd(d).getUTCDay()+6)%7]} ${fmtD(d)} ${d.slice(0,4)}`;const scope=U.piso?(S.pis.get(U.piso)?.name||''):'Todos los pisos';
    const z={prog:0,ver:0,ok:0,partial:0,no:0};const pc=o=>o.ver?pct(o.ok/o.ver):'—';
    doc.setTextColor(20);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(T('Reporte de cumplimiento diario'),M,22);
    doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(70);doc.text(T(`${dname} · Semana ${weekOf(d)} · ${scope}`),M,28);
    if(p.fullName){doc.setFontSize(8);doc.setTextColor(110);doc.text(doc.splitTextToSize(T(p.fullName),W-2*M)[0],M,33)}
    const tiles=[['PPC diario (alerta)',pc(t),`${t.ok} de ${t.ver} verificadas`],['PPC diario imputable SC',pscOf(t)!=null?pct(pscOf(t)):'—',t.nimp?`${t.nimp} incumpl. no imputable(s)`:'Todos imputables'],['Verificadas',String(t.ver),t.prog?pct(t.ver/t.prog)+' de lo programado':''],['Parcial / No cumplido',`${t.partial} / ${t.no}`,''],['Sin verificar',String(t.prog-t.ver),D.extras.length?`${D.extras.length} trabajo(s) no programado(s)`:'']];
    tiles.forEach(([k,v,sub],i)=>{const x=M+i*55,y=37;doc.setDrawColor(205);if(i===0)doc.setFillColor(226,241,231);else doc.setFillColor(247,247,245);doc.roundedRect(x,y,52,21,2,2,'FD');
      doc.setFontSize(8);doc.setTextColor(95);doc.text(T(k),x+3,y+5.5);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(20);doc.text(T(v),x+3,y+13.5);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(105);doc.text(T(sub),x+3,y+18.5)});
    let y=64;
    doc.setFontSize(8.5);doc.setTextColor(100);doc.text(T('El % de cumplimiento se calcula sobre lo verificado en campo; "Parcial" cuenta como no cumplido. El PPC del SC no cuenta los incumplimientos no imputables al subcontratista.'),M,y);y+=4.5;
    if(noVer.length){doc.setTextColor(160,90,0);doc.text(doc.splitTextToSize(T('Pisos sin verificar este día: '+noVer.join(', ')+'. '+(U.pdfSkip?'No se incluyen en este reporte.':'Sus actividades figuran como "Sin verificar".')),W-2*M),M,y);y+=4.5}
    y+=3;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(20);doc.text('Resumen por subcontratista',M,y);y+=2;
    const scs=[...new Set([...Object.keys(D.scA),...D.extras.map(e=>e.e.sc)])].sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
    const sumRow=o=>[o.prog,o.ver,o.ok,o.partial,o.no,o.prog-o.ver,o.nimp||0,pc(o),pscOf(o)!=null?pct(pscOf(o)):'—'];
    const HS={fillColor:[31,58,77],textColor:255,fontStyle:'bold'};
    doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:14},head:[['Subcontratista','Programadas','Verificadas','Cumplido','Parcial','No cumplido','Sin verificar','No imputables','PPC bruto','PPC del SC']],
      body:scs.map(sc=>[T(conOf(sc).name),...sumRow(D.scA[sc]||z)]),foot:[['TOTAL',...sumRow(t)]],theme:'grid',styles:{fontSize:8.5,cellPadding:1.5,lineColor:[210,210,210]},headStyles:HS,footStyles:{fillColor:[232,236,238],textColor:20,fontStyle:'bold'},
      columnStyles:Object.assign({0:{cellWidth:62,fontStyle:'bold',cellPadding:{left:4,top:1.5,bottom:1.5,right:1.5}}},...[1,2,3,4,5,6,7,8,9].map(i=>({[i]:{halign:'center'}}))),
      didDrawCell:c=>{if(c.section==='body'&&c.column.index===0){doc.setFillColor(...hex(conOf(scs[c.row.index]).color));doc.rect(c.cell.x,c.cell.y,1.8,c.cell.height,'F')}}});
    const stTxt={ok:'Cumplido',partial:'Parcial',no:'No cumplido'},stFill={ok:[221,239,227],partial:[247,235,207],no:[246,224,221],none:[238,238,238],extra:[225,233,245]};
    const withPh=U.pdfPh;
    for(const sc of scs){const c=conOf(sc);const o=D.scA[sc]||z;
      const rows=D.rows.filter(r=>r.sc===sc).sort((a,b)=>a.p.order-b.p.order||a.s.order-b.s.order||a.a.order-b.a.order||a.x.order-b.x.order);const ex=D.extras.filter(e=>e.e.sc===sc);
      y=doc.lastAutoTable.finalY+10;if(y>H-45){doc.addPage();y=20}
      doc.setFillColor(...hex(c.color));doc.rect(M,y-5,3.5,11,'F');doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(20);doc.text(T(c.name),M+6,y);
      doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(80);doc.text(T(`Cumplimiento ${pc(o)} (${o.ok} de ${o.ver} verificadas)${o.nimp?` · PPC del SC ${pct(pscOf(o))} (${o.nimp} no imputable${o.nimp>1?'s':''})`:''} · Programadas ${o.prog} · Parcial ${o.partial} · No cumplido ${o.no} · Sin verificar ${o.prog-o.ver}${ex.length?' · No programados '+ex.length:''}`),M+6,y+5);
      const st=[];const body=rows.map(r=>{const und=r.rc?.und||r.x.und||'';const prog=r.rc?.prog??(hasM(r.x)?(r.x.qty||{})[d]:null);st.push(r.rc?r.rc.status:'none');
        return[T(r.p.code),T(r.a.code),T(r.a.name),T(r.x.name+(r.sched?'':' (no programada ese día)')),prog!=null?T(fq(prog)+' '+und):'',r.rc&&r.rc.exec!=null?T(fq(r.rc.exec)+' '+und):'',r.rc?stTxt[r.rc.status]:'Sin verificar',T((r.rc?.cnc||'')+(impOf(r.rc)===false?' (no imputable)':'')),T(r.rc?.note||'')]});
      ex.forEach(e=>{st.push('extra');body.push([T(e.p?.code||''),T(e.a?.code||''),T(e.a?.name||''),T(e.e.desc),'',e.e.exec!=null?T(fq(e.e.exec)+' '+(e.e.und||'')):'','No programado','',T(e.e.note||'')])});
      doc.autoTable({startY:y+8,margin:{left:M,right:M,top:16,bottom:14},head:[['Piso','Ítem','Ambiente','Actividad','Prog.','Ejec.','Estado','Causa','Comentario']],body,theme:'grid',
        styles:{fontSize:8,cellPadding:1.4,lineColor:[210,210,210],valign:'middle'},headStyles:HS,
        columnStyles:{0:{cellWidth:11},1:{cellWidth:14},2:{cellWidth:42},3:{cellWidth:62},4:{cellWidth:17,halign:'right'},5:{cellWidth:17,halign:'right'},6:{cellWidth:25,fontStyle:'bold'},7:{cellWidth:34},8:{cellWidth:'auto'}},
        didParseCell:c=>{if(c.section==='body'&&c.column.index===6)c.cell.styles.fillColor=stFill[st[c.row.index]]}});
      if(withPh){const ph=[];rows.forEach(r=>(r.rc?.photos||[]).forEach(id=>ph.push([id,`${r.a.code} · ${r.x.name}`])));ex.forEach(e=>(e.e.photos||[]).forEach(id=>ph.push([id,`${e.a?.code||''} · ${e.e.desc}`])));
        if(ph.length){if(btn)btn.textContent='Cargando fotos…';y=doc.lastAutoTable.finalY+4;let col=0;const cw=64,chh=48,gap=4;
          for(const[id,cap]of ph){const src=await getFoto(id);if(!src)continue;const sz=await imgSize(src);if(!sz)continue;
            if(col===0&&y+chh+8>H-14){doc.addPage();y=20}
            const k=Math.min(cw/sz[0],chh/sz[1]);const w=sz[0]*k,hh=sz[1]*k;const x=M+col*(cw+gap);
            try{doc.addImage(src,'JPEG',x,y,w,hh)}catch(e){continue}
            doc.setFontSize(7);doc.setTextColor(90);doc.text(doc.splitTextToSize(T(cap),cw)[0],x,y+hh+3.5);
            col++;if(col===4){col=0;y+=chh+8}}
          doc.lastAutoTable.finalY=col?y+chh+4:y}}}
    const n=doc.getNumberOfPages();const gen=new Date(NOW());const gs=`${fmtD(todayIso())} ${hhmm(gen.getTime())}`;
    for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(80);doc.text(T((p.code?p.code+' · ':'')+(p.name||'')),M,9);
      doc.setFont('helvetica','normal');doc.text(T(`Cumplimiento diario · ${dname} · ${scope}`),W-M,9,{align:'right'});doc.setDrawColor(200);doc.line(M,11,W-M,11);
      doc.setFontSize(7.5);doc.setTextColor(130);doc.text(T(`Generado el ${gs} por ${me?(me.name||me.email):''}`),M,H-6);doc.text(`Página ${i} de ${n}`,W-M,H-6,{align:'right'})}
    saveBlob(`${p.code||'LPS'}_Cumplimiento_${d}${U.piso?'_'+(S.pis.get(U.piso)?.code||''):''}.pdf`,doc.output('blob'));toast('Reporte PDF generado');
  }catch(e){toast(e&&e.message?e.message:'No se pudo generar el PDF.')}
  finally{const b2=$('#bpdf');if(b2){b2.disabled=false;b2.textContent=bt||'Reporte PDF del día'}}}

/* ================= EXCEL DEL PPC (diario / semanal) ================= */
async function exportPpcXlsx(){const btn=$('#bxppc');const bt=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Generando…'}
  try{const dia=U.indMode!=='sem';const today=todayIso();const dates=dia?[indDay()]:weekDays(U.week).filter(d=>d<=today);
    if(!dates.length){toast('La semana aún no empieza.');return}
    await ensureDaily(addD(dates[0],-1));await loadXlsx();const X=window.XLSX;const p=P();const vp=visPisos();const vset=new Set(vp.map(x=>x.id));const D=dayData(dates,vset);
    const bd={top:{style:'thin',color:{rgb:'BFBFBF'}},bottom:{style:'thin',color:{rgb:'BFBFBF'}},left:{style:'thin',color:{rgb:'BFBFBF'}},right:{style:'thin',color:{rgb:'BFBFBF'}}};
    const hs={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F3A4D'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:bd};
    const cs={border:bd,alignment:{vertical:'center'}},ns={border:bd,alignment:{horizontal:'center',vertical:'center'}},ps={border:bd,numFmt:'0%',alignment:{horizontal:'center'},font:{bold:true}};
    const ts={font:{bold:true},fill:{fgColor:{rgb:'E8ECEE'}},border:bd,alignment:{horizontal:'center'}};
    const scope=U.piso?(S.pis.get(U.piso)?.name||''):'Todos los pisos';const per=dia?`${DOWN[(pd(dates[0]).getUTCDay()+6)%7]} ${fmtD(dates[0])} ${dates[0].slice(0,4)}`:`Semana ${U.week} (${fmtD(dates[0])} al ${fmtD(dates[dates.length-1])})`;
    const wb=X.utils.book_new();
    const sheet=(name,title,head,rows,cols,fmt,foot)=>{const ws={};const set=(r,c,v,st)=>{ws[X.utils.encode_cell({r,c})]={v:v??'',t:typeof v==='number'?'n':'s',s:st}};
      set(0,0,title,{font:{bold:true,sz:13}});set(1,0,`${p.name||''} · ${per} · ${scope}`,{font:{color:{rgb:'555555'}}});
      head.forEach((h,c)=>set(3,c,h,hs));rows.forEach((row,i)=>row.forEach((v,c)=>set(4+i,c,v,fmt?fmt(c,v,false):cs)));
      let last=3+rows.length;if(foot){last++;foot.forEach((v,c)=>set(last,c,v,fmt?{...fmt(c,v,true),...(typeof v==='number'&&fmt(c,v,true).numFmt?{}:{}),font:{bold:true},fill:{fgColor:{rgb:'E8ECEE'}}}:ts))}
      ws['!ref']=X.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(last,1),c:head.length-1}});ws['!cols']=cols.map(w=>({wch:w}));ws['!freeze']={xSplit:1,ySplit:4};ws['!views']=[{state:'frozen',xSplit:1,ySplit:4}];
      X.utils.book_append_sheet(wb,ws,name)};
    const num=(o)=>[o.prog,o.ver,o.ok,o.partial,o.no,o.prog-o.ver,o.nimp||0,o.ver?o.ok/o.ver:'—',pscOf(o)??'—'];
    const H=['Programadas','Verificadas','Cumplido','Parcial','No cumplido','Sin verificar','No imputables al SC','PPC bruto','PPC del SC'];
    const f=(c,v)=>c===0?cs:(c>=8&&typeof v==='number')?ps:ns;
    const scs=Object.keys(D.scA).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
    sheet('Resumen por SC',`PPC ${dia?'diario':'semanal (registros diarios de Campo)'} por subcontratista`,['Subcontratista',...H],scs.map(sc=>[conOf(sc).name,...num(D.scA[sc])]),[22,12,12,10,9,12,12,14,11,11],f,['TOTAL',...num(D.tot)]);
    const pis=vp.filter(x=>D.piA[x.id]);
    sheet('Resumen por piso',`PPC ${dia?'diario':'semanal'} por piso`,['Piso',...H],pis.map(x=>[`${x.code} · ${x.name}`,...num(D.piA[x.id])]),[22,12,12,10,9,12,12,14,11,11],f,['TOTAL',...num(D.tot)]);
    const stT={ok:'Cumplido',partial:'Parcial',no:'No cumplido'};
    const det=D.rows.slice().sort((a,b)=>a.d.localeCompare(b.d)||a.p.order-b.p.order||a.s.order-b.s.order||a.a.order-b.a.order||a.x.order-b.x.order).map(r=>{const und=r.rc?.und||r.x.und||'';const prog=r.rc?.prog??(hasM(r.x)?(r.x.qty||{})[r.d]:null);const im=impOf(r.rc);
      return[r.d,r.p.code,r.a.code,r.a.name,r.x.name+(r.sched?'':' (no programada ese día)'),conOf(r.sc).name,prog??'',r.rc&&r.rc.exec!=null?r.rc.exec:'',und,r.rc?stT[r.rc.status]:'Sin verificar',r.rc?.cnc||'',im==null?'':im?'Sí':'No',r.rc?.note||'',r.rc?(r.rc.byName||r.rc.by||''):'']});
    D.extras.forEach(e=>det.push([e.d,e.p?.code||'',e.a?.code||'',e.a?.name||'',e.e.desc+' (no programado)',conOf(e.e.sc).name,'',e.e.exec??'',e.e.und||'','No programado','','',e.e.note||'',e.e.byName||e.e.by||'']));
    const stF={Cumplido:'DDEFE3',Parcial:'F7EBCF','No cumplido':'F6E0DD','Sin verificar':'EEEEEE','No programado':'E1E9F5'};
    sheet('Detalle','Detalle de actividades',['Fecha','Piso','Ítem','Ambiente','Actividad','Subcontratista','Programado','Ejecutado','Und','Estado','Causa','Imputable al SC','Comentario','Registrado por'],det,[11,6,8,24,34,18,11,10,6,14,22,10,30,18],
      (c,v)=>c===9&&stF[v]?{...cs,font:{bold:true},fill:{fgColor:{rgb:stF[v]}}}:(c===6||c===7||c===11)?ns:cs);
    const cc={};D.rows.forEach(r=>{if(!r.rc||r.rc.status==='ok')return;const k=r.rc.cnc||'Sin causa registrada';const o=cc[k]=cc[k]||{n:0,imp:0,no:0};o.n++;impOf(r.rc)?o.imp++:o.no++});
    const cl=Object.entries(cc).sort((a,b)=>b[1].n-a[1].n);
    sheet('Causas','Causas de incumplimiento (Parcial y No cumplido)',['Causa','Configurada como','Total','Imputables al SC','No imputables al SC'],cl.map(([k,o])=>[k,k==='Sin causa registrada'?'Imputable (sin causa)':cncImp(k)?'Imputable':'No imputable',o.n,o.imp,o.no]),[26,20,8,16,18],(c)=>c<2?cs:ns,
      cl.length?['TOTAL','',cl.reduce((s,[,o])=>s+o.n,0),cl.reduce((s,[,o])=>s+o.imp,0),cl.reduce((s,[,o])=>s+o.no,0)]:null);
    if(!dia){const W={};const WP=[];for(const pp of vp){const w=S.wk.get(wkId(U.week,pp.id));if(!w||!w.frozenAt)continue;const o={n:0,ok:0,no:0,nimp:0,pend:0};
        for(const[id,it]of Object.entries(w.items||{})){const rr=(w.res||{})[id];const a=W[it.sc]=W[it.sc]||{n:0,ok:0,no:0,nimp:0,pend:0};const ni=rr?.ok===false&&!(rr.imp!=null?rr.imp:cncImp(rr.cnc));
          for(const q of[a,o]){q.n++;if(rr?.ok===true)q.ok++;else if(rr?.ok===false){q.no++;if(ni)q.nimp++}else q.pend++}}WP.push([pp,o])}
      const wr=o=>[o.n,o.ok,o.no,o.nimp,o.pend,o.n?o.ok/o.n:'—',o.n-o.nimp>0?o.ok/(o.n-o.nimp):'—'];const WH=['Compromisos','Cumplidos','No cumplidos','De ellos no imputables','Sin evaluar','PPC','PPC del SC'];
      const T0={n:0,ok:0,no:0,nimp:0,pend:0};WP.forEach(([,o])=>{for(const k in T0)T0[k]+=o[k]});
      const g=(c,v)=>c===0?cs:(c>=6&&typeof v==='number')?ps:ns;
      const ks=Object.keys(W).sort((a,b)=>conOf(a).name.localeCompare(conOf(b).name));
      sheet('PPC semanal SC',`PPC semanal (compromisos del Plan semanal) · semana ${U.week}`,['Subcontratista',...WH],ks.length?ks.map(sc=>[conOf(sc).name,...wr(W[sc])]):[[`Ningún piso congeló la semana ${U.week} (se congela en Plan semanal).`]],[22,12,10,12,18,11,9,11],g,ks.length?['TOTAL',...wr(T0)]:null);
      sheet('PPC semanal piso',`PPC semanal por piso · semana ${U.week}`,['Piso',...WH],WP.length?WP.map(([pp,o])=>[`${pp.code} · ${pp.name}`,...wr(o)]):[[`Ningún piso congeló la semana ${U.week}.`]],[22,12,10,12,18,11,9,11],g,WP.length?['TOTAL',...wr(T0)]:null)}
    const buf=X.write(wb,{type:'array',bookType:'xlsx'});
    saveBlob(`${p.code||'LPS'}_PPC_${dia?dates[0]:'Sem'+U.week}${U.piso?'_'+(S.pis.get(U.piso)?.code||''):''}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel del PPC generado');
  }catch(e){toast(e&&e.message?e.message:'No se pudo generar el Excel.')}
  finally{const b2=$('#bxppc');if(b2){b2.disabled=false;b2.textContent=bt||'Excel del PPC'}}}

/* ================= EXPORTAR EXCEL ================= */
let xlsxP=null;
function loadXlsx(){if(window.XLSX)return Promise.resolve();if(xlsxP)return xlsxP;xlsxP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';s.onload=ok;s.onerror=()=>{xlsxP=null;ko(new Error('No se pudo cargar el generador de Excel'))};document.head.appendChild(s)});return xlsxP}
/** filtro de Excel sobre la tabla que empieza en la fila hr (0 = primera) y fija esa fila */
function autoF(X,ws,hr){if(!ws['!ref'])return;const R=X.utils.decode_range(ws['!ref']);let last=R.e.r;
  while(last>hr&&!Object.keys(ws).some(k=>k[0]!=='!'&&X.utils.decode_cell(k).r===last&&ws[k].v!==''&&ws[k].v!=null))last--;
  /* la tabla termina en la primera fila vacía después del encabezado */
  for(let r=hr+1;r<=last;r++){let any=false;for(let c=R.s.c;c<=R.e.c;c++){const v=ws[X.utils.encode_cell({r,c})];if(v&&v.v!==''&&v.v!=null){any=true;break}}if(!any){last=r-1;break}}
  ws['!autofilter']={ref:X.utils.encode_range({s:{r:hr,c:R.s.c},e:{r:Math.max(last,hr),c:R.e.c}})};ws['!views']=[{state:'frozen',ySplit:hr+1}]}
async function exportXlsx(){
  const btn=$('#bexport');btn.disabled=true;btn.textContent='Generando…';let unswap=null;
  const CLV=U.tab==='look'&&U.cliv&&canCli();let cliLab='';
  try{await loadXlsx();const vd0=!CLV&&U.tab==='look'&&U.ver&&U.verMode==='ver'?VERD.get(U.ver):null;if(vd0&&vd0.ready)unswap=swapVer(vd0);
    if(CLV){const cv=U.cliVer&&CLVD.get(U.cliVer);if(U.cliVer&&!(cv&&cv.ready))throw new Error('La versión emitida aún se está cargando. Intenta en un momento.');
      if(cv){unswap=swapVer(cv);cliLab=(CLX.get(U.cliVer)||{}).label||''}else{const o=S.act;S.act=cliActs();unswap=()=>{S.act=o};cliLab='Programa con holgura al '+fmtD(todayIso())}}const X=window.XLSX;const p=P();const days=winDays();const nd=days.length;
    const bd={top:{style:'thin',color:{rgb:'BFBFBF'}},bottom:{style:'thin',color:{rgb:'BFBFBF'}},left:{style:'thin',color:{rgb:'BFBFBF'}},right:{style:'thin',color:{rgb:'BFBFBF'}}};
    const hs={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F3A4D'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:bd};
    const ws={};const merges=[];const F9={name:'Calibri',sz:10};const set=(r,c,v,s)=>{ws[X.utils.encode_cell({r,c})]={v:v??'',t:typeof v==='number'?'n':'s',s:s||{border:bd,font:F9,alignment:{vertical:'center'}}}};
    const today=todayIso();const L1='D9DEE4';const thin=c=>({style:'thin',color:{rgb:c}});
    /* título y datos del proyecto */
    set(0,0,'LOOKAHEAD',{font:{name:'Calibri',sz:16,bold:true,color:{rgb:'1F3A4D'}}});
    set(1,0,`Semanas ${U.week}–${U.week+U.win-1} · ${fmtD(days[0].d)} al ${fmtD(days[nd-1].d)} · ${U.piso?(S.pis.get(U.piso)?.name||''):'Todos los pisos'}${CLV?' · '+cliLab:''}`,{font:{name:'Calibri',sz:10,color:{rgb:'555555'}}});
    [['PROYECTO',p.fullName],['PROPIETARIO',p.owner],['UBICACIÓN',p.location],['FECHA',fmtD(today)+' '+today.slice(0,4)]].forEach(([k,v],i)=>{set(1+i,2,k,{font:{name:'Calibri',sz:9,bold:true,color:{rgb:'6B7785'}},alignment:{horizontal:'right'}});set(1+i,4,v||'',{font:{name:'Calibri',sz:10,bold:i===0}})});
    const hr=6;const H=['SC','ITEM','DESCRIPCIÓN','','ACTIVIDAD','UND','METRADO','DÍAS','F. INICIO','F. FIN'];
    H.forEach((t,c)=>{set(hr,c,t,hs);set(hr+1,c,'',hs);set(hr+2,c,'',hs)});
    for(let c=0;c<10;c++){if(c!==2&&c!==3)merges.push({s:{r:hr,c},e:{r:hr+2,c}})}merges.push({s:{r:hr,c:2},e:{r:hr+2,c:3}});
    const wkF=['1F3A4D','2C5068'];
    for(let w=0;w<U.win;w++){const f={...hs,fill:{fgColor:{rgb:wkF[w%2]}}};set(hr,10+w*6,'SEM '+(U.week+w)+'  ·  '+fmtD(weekDays(U.week+w)[0]),f);for(let k=1;k<6;k++)set(hr,10+w*6+k,'',f);merges.push({s:{r:hr,c:10+w*6},e:{r:hr,c:10+w*6+5}})}
    days.forEach((x,k)=>{const td=x.d===today,hol=!isWork(x.d);const f={...hs,fill:{fgColor:{rgb:td?'E0A01B':hol?'7F8C99':wkF[Math.floor(k/6)%2]}},font:{bold:true,sz:9,color:{rgb:td?'1B1400':'FFFFFF'}}};
      set(hr+1,10+k,DL[x.i],f);set(hr+2,10+k,fmtS(x.d),{...f,font:{bold:false,sz:8,color:{rgb:td?'1B1400':'FFFFFF'}}})});
    let r=hr+3;const r0d=r;
    for(const{p:pp,secs}of visTree()){const pf={font:{name:'Calibri',sz:11,bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1F5F7A'}},border:bd,alignment:{vertical:'center'}};set(r,0,'',pf);set(r,1,pp.code,pf);set(r,2,pp.name.toUpperCase(),pf);for(let c=3;c<10+nd;c++)set(r,c,'',pf);r++;
    for(const{s,ambs}of secs){const sf={font:{name:'Calibri',sz:10,bold:true},fill:{fgColor:{rgb:L1}},border:bd,alignment:{vertical:'center'}};set(r,0,'',sf);set(r,1,s.code,sf);set(r,2,s.name.toUpperCase(),sf);for(let c=3;c<10+nd;c++)set(r,c,'',sf);r++;
      for(const{a,acts}of ambs){const r0=r;const L=acts.length?acts:[null];
        L.forEach(x=>{const c=x?conOf(x.sc):null;const st=x?actStats(x):{};const ds=new Set(x?x.days||[]:[]);const first=r===r0;
          /* bordes: una línea más marcada separa cada ambiente; el código y el nombre se repiten en cada fila (en gris) para poder filtrar */
          const b=first?{...bd,top:{style:'medium',color:{rgb:'7F8C99'}}}:bd;const base=(o={})=>({border:b,font:{...F9,...(o.font||{})},alignment:{vertical:'center',...(o.al||{})},...(o.fill?{fill:o.fill}:{})});
          set(r,0,c?c.name:'',base(c?{fill:{fgColor:{rgb:c.color.replace('#','').toUpperCase()}},font:{bold:true,color:{rgb:lum(c.color)>.55?'000000':'FFFFFF'}}}:{}));
          set(r,1,a.code,base({font:{bold:first,color:{rgb:first?'000000':'A6A6A6'}},al:{horizontal:'center'}}));
          set(r,2,a.name,base({font:{bold:first,color:{rgb:first?'000000':'A6A6A6'}},al:{wrapText:first}}));set(r,3,'',base());
          set(r,4,x?x.name:'',base());set(r,5,x?x.und||'':'',base({al:{horizontal:'center'}}));
          {const o={...base({al:{horizontal:'right'}}),numFmt:'#,##0.##'};set(r,6,x&&x.metrado!=null?x.metrado:'',o)}
          set(r,7,st.n||'',base({al:{horizontal:'center'}}));set(r,8,st.ini?fmtS(st.ini):'',base({al:{horizontal:'center'}}));set(r,9,st.fin?fmtS(st.fin):'',base({al:{horizontal:'center'}}));
          days.forEach((d,k)=>{const dc=10+k;const wk0=d.i===0;const bb=wk0?{...b,left:{style:'thin',color:{rgb:'7F8C99'}}}:b;
            if(ds.has(d.d)){const hx=c.color.replace('#','').toUpperCase();const qv=x&&(x.qty||{})[d.d];set(r,dc,qv!=null?qv:'X',{fill:{fgColor:{rgb:hx}},font:{name:'Calibri',sz:9,bold:true,color:{rgb:lum(c.color)>.55?'000000':'FFFFFF'}},alignment:{horizontal:'center',vertical:'center'},border:bb})}
            else if(first&&a.hito===d.d)set(r,dc,a.hitoLabel||'HITO',{fill:{fgColor:{rgb:'C00000'}},font:{name:'Calibri',sz:8,bold:true,color:{rgb:'FFFFFF'}},alignment:{horizontal:'center'},border:bb});
            else set(r,dc,'',{border:bb,...(d.d===today?{fill:{fgColor:{rgb:'FFF4D6'}}}:!isWork(d.d)?{fill:{fgColor:{rgb:'EEF0F2'}}}:{})})});r++});
        }}}
    ws['!ref']=X.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(r-1,hr+2),c:9+nd}});ws['!merges']=merges;
    ws['!autofilter']={ref:X.utils.encode_range({s:{r:hr+2,c:0},e:{r:Math.max(r-1,hr+2),c:9}})};
    ws['!cols']=[{wch:16},{wch:8},{wch:22},{wch:2},{wch:34},{wch:6},{wch:9},{wch:6},{wch:8},{wch:8},...days.map(()=>({wch:3.6}))];
    ws['!rows']=[{hpt:22},{hpt:15}];
    ws['!freeze']={xSplit:10,ySplit:hr+3};ws['!views']=[{state:'frozen',xSplit:10,ySplit:hr+3}];
    const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Lookahead');
    if(CLV){/* al cliente solo va su programa y su PPC: nada del plan interno, restricciones ni avance diario */
      const pc=cliPpcAoa();const wsP=X.utils.aoa_to_sheet(pc.sum);wsP['!cols']=pc.cols;pc.hdr.forEach(r0=>{for(let c=0;c<pc.sum[r0].length;c++){const k=X.utils.encode_cell({r:r0,c});if(wsP[k])wsP[k].s=hs}});X.utils.book_append_sheet(wb,wsP,'PPC');
      const lg=[['SUBCONTRATISTA','PARTIDA']];[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>lg.push([c.name,c.partida||'']));const ws4=X.utils.aoa_to_sheet(lg);ws4['!cols']=[{wch:18},{wch:26}];X.utils.book_append_sheet(wb,ws4,'Leyenda');
      const buf=X.write(wb,{type:'array',bookType:'xlsx'});
      saveBlob(`${(p.code||'LPS')}_Lookahead_CLIENTE_${U.piso?(S.pis.get(U.piso)?.code||'')+'_':''}Sem${U.week}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));return}
    // plan semanal por piso
    const pl=[['PPC SEMANAL · SEMANA '+U.week],[],['PISO','ESTADO','SUBCONTRATISTA','CÓDIGO','AMBIENTE','ACTIVIDAD','DÍAS','METRADO SEM.','UND','EJECUTADO','CUMPLIDO','TIPO DE CAUSA','CAUSA (DETALLE)','MITIGACIÓN']];const ppcRows=[];
    for(const pp of visPisos()){const w=S.wk.get(wkId(U.week,pp.id));const fz=!!(w&&w.frozenAt);const items=fz?w.items||{}:liveItems(U.week,pp.id);const res=fz&&w.res||{};
      Object.entries(items).sort((a,b)=>(a[1].ord||0)-(b[1].ord||0)).forEach(([id,it])=>{const rr=res[id]||{};pl.push([pp.code,fz?'Congelado':'Borrador',conOf(it.sc).name,it.code,it.amb,it.act,it.days.map(fmtS).join(' '),it.q??'',it.und||'',rr.exec??'',rr.ok===true?'SÍ':rr.ok===false?'NO':'',rr.cnc?cncLabel(rr.cnc):'',rr.note||'',rr.mit||''])});
      const st=ppcOf(w);ppcRows.push(['PPC '+pp.code,st?pct(st.ppc):'—'])}
    pl.push([],...ppcRows);const ws2=X.utils.aoa_to_sheet(pl);ws2['!cols']=[{wch:6},{wch:10},{wch:16},{wch:8},{wch:28},{wch:32},{wch:26},{wch:12},{wch:6},{wch:11},{wch:10},{wch:24},{wch:30},{wch:30}];
    for(let c=0;c<14;c++){const k=X.utils.encode_cell({r:2,c});if(ws2[k])ws2[k].s=hs}autoF(X,ws2,2);X.utils.book_append_sheet(wb,ws2,'PPC semanal');
    const rs=[['ESTADO','ÍTEM','AMBIENTE','ACTIVIDAD','TIPO','DESCRIPCIÓN','RESPONSABLE','REQUERIDA','LIBERADA']];
    for(const q of restrInScope()){const x=S.act.get(q.actId);const a=x&&S.amb.get(x.ambId);rs.push([q.status==='lib'?'Liberada':'Pendiente',a?a.code:'',a?a.name:'',x?x.name:'',q.type,q.desc,q.resp,q.need,q.freed])}
    const ws3=X.utils.aoa_to_sheet(rs);ws3['!cols']=[{wch:11},{wch:8},{wch:24},{wch:28},{wch:18},{wch:40},{wch:16},{wch:11},{wch:11}];for(let c=0;c<9;c++)ws3[X.utils.encode_cell({r:0,c})].s=hs;autoF(X,ws3,0);X.utils.book_append_sheet(wb,ws3,'Restricciones');
    const lg=[['SUBCONTRATISTA','PARTIDA','COLOR']];[...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>lg.push([c.name,c.partida||'','X']));const ws4=X.utils.aoa_to_sheet(lg);
    [...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name)).forEach((c,i)=>{ws4[X.utils.encode_cell({r:i+1,c:2})].s={fill:{fgColor:{rgb:c.color.replace('#','').toUpperCase()}},font:{bold:true,color:{rgb:lum(c.color)>.55?'000000':'FFFFFF'}},alignment:{horizontal:'center'}}});
    for(let c=0;c<3;c++)ws4[X.utils.encode_cell({r:0,c})].s=hs;ws4['!cols']=[{wch:18},{wch:26},{wch:8}];X.utils.book_append_sheet(wb,ws4,'Leyenda');
    const ad=[['FECHA','PISO','ÍTEM','AMBIENTE','ACTIVIDAD','SUBCONTRATISTA','PROGRAMADO','UND','ESTADO','EJECUTADO','CAUSA','COMENTARIO','FOTOS','REGISTRADO POR']];const vps=new Set(visPisos().map(x=>x.id));
    [...DAY.values()].filter(doc=>vps.has(doc.pisoId)&&doc.date>=days[0].d&&doc.date<=days[days.length-1].d).sort((a,b)=>a.date.localeCompare(b.date)).forEach(doc=>{
      for(const[aid,rc]of Object.entries(doc.recs||{})){if(!rc||!rc.status)continue;const x=S.act.get(aid);const am=x&&S.amb.get(x.ambId);ad.push([doc.date,S.pis.get(doc.pisoId)?.code||'',am?am.code:'',am?am.name:'',x?x.name:'(eliminada)',x?conOf(x.sc).name:'',rc.prog??'',rc.und||'',ST[rc.status].t,rc.exec??'',rc.cnc||'',rc.note||'',(rc.photos||[]).length||'',rc.byName||rc.by||''])}
      });
    npItems(new Set(days.map(x=>x.d)),vps).forEach(({e,d:dd,p:pp,a:am})=>ad.push([dd,pp?.code||'',am?am.code:'',am?am.name:'',e.desc+' (no programado)',conOf(e.sc).name,'',e.und||'','No programado',e.exec??'','',e.note||'',(e.photos||[]).length||'',e.byName||e.by||'']));
    const ws5=X.utils.aoa_to_sheet(ad);ws5['!cols']=[{wch:11},{wch:6},{wch:8},{wch:24},{wch:34},{wch:16},{wch:11},{wch:6},{wch:13},{wch:10},{wch:22},{wch:30},{wch:6},{wch:18}];for(let c=0;c<14;c++)ws5[X.utils.encode_cell({r:0,c})].s=hs;autoF(X,ws5,0);X.utils.book_append_sheet(wb,ws5,'Avance diario');
    const buf=X.write(wb,{type:'array',bookType:'xlsx'});
    saveBlob(`${(p.code||'LPS')}_Lookahead_${unswap?'VERSION_'+(LHI.get(U.ver)?.date||'')+'_':''}${U.piso?(S.pis.get(U.piso)?.code||'')+'_':''}Sem${U.week}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(e){if(!(e&&e.code==='declined'))toast(e&&e.message?e.message:'No se pudo generar el Excel.')}
  finally{if(unswap)unswap();btn.disabled=false;btn.textContent='Exportar Excel'}
}

/* ---------- PPC semanal en el formato de la empresa (GP-PR02-F-10, rev. 2) ----------
   Columnas: ITEM · DESCRIPCIÓN · U. · METR TOTAL · METR SEMANA · días L–S (código del sector, color del SC) · SI/NO (días)
   · TIPO (código de causa) · CAUSAS · MITIGACIÓN. Pie: confiabilidad de la programación (días cumplidos / días programados). */
async function ppcSemXlsx(n){const btn=$('#bppcx');const bt=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Generando…'}
  try{await loadXlsx();const X=window.XLSX;const p=P();const wd=weekDays(n);const vp=visPisos();
    const B={style:'thin',color:{rgb:'000000'}};const bd={top:B,bottom:B,left:B,right:B};
    const F=(o={})=>({name:o.name||'Arial',sz:o.sz||9,bold:!!o.b,color:{rgb:o.c||'000000'}});
    const st=(o={})=>{const r={border:o.nb?undefined:bd,font:F(o),alignment:{horizontal:o.h||'left',vertical:'center',wrapText:!!o.w}};if(o.fill)r.fill={patternType:'solid',fgColor:{rgb:o.fill}};if(o.fmt)r.numFmt=o.fmt;return r};
    const HF='DCE6F1';const hd=st({b:true,h:'center',w:true,fill:HF}),hd9=st({b:true,h:'center',sz:9,w:true,fill:HF}),cc=st({h:'center'}),cl=st({w:true}),cl11=st({name:'Calibri',sz:11});
    const ws={};const M=[];const set=(r,c,v,s)=>{const o={v:v??'',t:typeof v==='number'?'n':'s',s:s||cl};ws[X.utils.encode_cell({r,c})]=o;return o};
    const box=(r0,c0,r1,c1,v,s)=>{for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++)set(r,c,r===r0&&c===c0?v:'',s);if(r1>r0||c1>c0)M.push({s:{r:r0,c:c0},e:{r:r1,c:c1}})};
    /* encabezado (filas 2–5): logos (vacío), datos del proyecto, título y código */
    box(1,1,4,2,'',st({}));
    const lab=st({b:true,sz:10,nb:true,name:'Arial Narrow'}),val=st({sz:9,nb:true,name:'Arial Narrow'});
    [['PROYECTO',p.fullName||p.name||''],['PROPIETARIO',p.owner||''],['UBICACIÓN',p.location||''],['FECHA',`${fmtD(todayIso())} ${todayIso().slice(0,4)}`]].forEach(([k,v],i)=>{set(1+i,3,k,lab);set(1+i,4,': '+v,val)});
    box(1,8,4,17,'PORCENTAJE DE PLAN CUMPLIDO  ( PPC )',st({b:true,sz:14,h:'center',name:'Euphemia'}));
    [['CÓDIGO',p.ppcCode||'GP-PR02-F-10'],['REVISIÓN','1.0'],['HECHO POR',me&&(me.name||me.email)||''],['REVISADO POR','']].forEach(([k,v],i)=>{set(1+i,18,k,lab);set(1+i,19,v?': '+v:'',val)});
    /* fila 6: leyenda de códigos de causa */
    CNC_STD.forEach((o,i)=>set(5,8+i,o.c,st({sz:7,h:'center',nb:true,name:'Arial Narrow'})));
    /* encabezado de la tabla (filas 7–9) */
    box(6,1,6,7,'ACTIVIDADES PROGRAMADAS',st({b:true,sz:10,h:'center',fill:HF}));box(6,8,6,13,'SEMANA '+n,st({b:true,sz:10,h:'center',c:'FFFFFF',fill:'1F3A4D'}));
    box(6,14,7,15,'CUMPLI-MIENTO',st({b:true,sz:10,h:'center',w:true,fill:HF}));box(6,16,7,19,'ANÁLISIS DE INCUMPLIMIENTO',st({b:true,sz:10,h:'center',fill:HF}));
    box(6,20,7,22,'PARA FILTRAR',st({b:true,sz:9,h:'center',c:'6B7785',fill:'F2F2F2'}));['PISO','AMBIENTE','SUBCONTRATISTA'].forEach((t,i)=>set(8,20+i,t,st({b:true,sz:9,h:'center',c:'6B7785',fill:'F2F2F2'})));
    box(7,1,8,1,'ITEM',hd9);box(7,2,8,4,'DESCRIPCIÓN',hd9);box(7,5,8,5,'U.',hd9);box(7,6,8,6,'METR\nTOTAL',hd9);box(7,7,8,7,'METR\nSEMANA',hd9);
    wd.forEach((d,k)=>{const td=d===todayIso();set(7,8+k,DOWN[k].slice(0,3),st({b:true,h:'center',c:td?'1B1400':'FFFFFF',fill:td?'E0A01B':'2C5068'}));set(8,8+k,+d.slice(8),st({h:'center',c:td?'1B1400':'FFFFFF',fill:td?'E0A01B':'2C5068'}))});
    set(8,14,'SI',hd9);set(8,15,'NO',hd9);set(8,16,'TIPO',hd9);set(8,17,'CAUSAS',hd9);box(8,18,8,19,'MITIGACIÓN',hd9);
    let r=9;const r1=r;const fx=st({sz:8,c:'808080'});const RH=[];
    /* fila del proyecto */
    {const pj=st({b:true,sz:12,c:'FFFFFF',fill:'000099'});set(r,1,(p.fullName||p.name||'').toUpperCase(),pj);for(let c=2;c<20;c++)set(r,c,'',pj);for(let c=20;c<23;c++)set(r,c,'',fx)}r++;
    const fl=st({b:true,sz:11,c:'FFFFFF',fill:'963634'}),flC=st({b:true,sz:10,c:'FFFFFF',fill:'963634'});
    const gr=st({b:true,sz:11,name:'Calibri',fill:'F2DCDB'}),grC=st({b:true,sz:11,name:'Calibri',fill:'F2DCDB',h:'center'});
    const SI=st({b:true,h:'center',c:'00B050'}),NO=st({b:true,h:'center',c:'FF0000'});
    let tSi=0,tNo=0,tN=0,tOk=0;
    for(const pp of vp){const w=S.wk.get(wkId(n,pp.id));const fz=!!(w&&w.frozenAt);const items=fz?w.items||{}:liveItems(n,pp.id);const res=fz?w.res||{}:{};
      const ids=Object.keys(items).sort((a,b)=>(items[a].ord||0)-(items[b].ord||0));if(!ids.length)continue;
      set(r,1,pp.code||'',flC);set(r,2,(pp.name||'').toUpperCase()+(fz?'':'  (borrador: aún no congelado)'),fl);for(let c=3;c<20;c++)set(r,c,'',fl);set(r,20,pp.code||'',fx);set(r,21,'',fx);set(r,22,'',fx);r++;
      for(let i=0;i<ids.length;){const it0=items[ids[i]];let j=i;while(j<ids.length&&items[ids[j]].code===it0.code&&items[ids[j]].amb===it0.amb)j++;
        /* ambiente: fila de grupo */
        set(r,1,it0.code||'',grC);box(r,2,r,4,(it0.amb||'').toUpperCase(),gr);for(let c=5;c<8;c++)set(r,c,'',gr);for(let c=8;c<20;c++)set(r,c,'',c>=18?cl:cc);M.push({s:{r,c:18},e:{r,c:19}});set(r,20,pp.code||'',fx);set(r,21,(it0.code||'')+' '+(it0.amb||''),fx);set(r,22,'',fx);r++;
        for(let k=i;k<j;k++){const id=ids[k],it=items[id],rr=res[id]||{};const x=S.act.get(id);const c=conOf(it.sc);const am=x&&S.amb.get(x.ambId);const sec=am&&S.sec.get(am.sectorId);
          const dd=(it.days||[]).slice().sort();const ds=new Set(dd);
          set(r,1,actNum(id)||'',st({b:true,h:'center'}));box(r,2,r,4,it.act||'',cl11);set(r,5,it.und||(x&&x.und)||'',cc);
          set(r,6,x&&typeof x.metrado==='number'?x.metrado:'',cc);set(r,7,it.q!=null?it.q:'',cc);
          const hx=(c.color||'#999999').replace('#','').toUpperCase();const ink=lum(c.color||'#999')>.55?'000000':'FFFFFF';
          wd.forEach((d,q)=>{if(ds.has(d))set(r,8+q,(sec&&sec.code)||'X',st({h:'center',sz:10,fill:hx,c:ink}));else set(r,8+q,'',cc)});
          /* SI / NO en días, como el formato: cumplido = todos sus días; no cumplido = días cumplidos según Campo y el resto */
          let si='',no='';if(rr.ok===true){si=dd.length;no=0}else if(rr.ok===false){let ok=dd.filter(d=>{const rc=recOf(d,id);return rc&&rc.status==='ok'}).length;if(ok>=dd.length)ok=Math.max(0,dd.length-1);si=ok;no=dd.length-ok}
          set(r,14,si||'',SI);set(r,15,no||'',NO);if(typeof si==='number'){tSi+=si;tNo+=no}
          const bad=rr.ok===false;set(r,16,bad&&rr.cnc?cncCode(rr.cnc):'',st({h:'center',c:'FF0000'}));
          set(r,17,bad?[(rr.cnc||'').toUpperCase(),rr.note||''].filter(Boolean).join(': '):'',st({b:true,c:'ED0000',w:true}));
          box(r,18,r,19,bad||rr.mit?rr.mit||'':'',st({h:'center',w:true}));
          set(r,20,pp.code||'',fx);set(r,21,(it.code||'')+' '+(it.amb||''),fx);set(r,22,c.name||'',fx);RH[r]={hpt:16};
          if(rr.ok===true)tOk++;tN++;r++}
        i=j}}
    if(!tN)throw new Error(`No hay compromisos en la semana ${n}${U.piso?' de este piso':''}.`);
    /* pie: confiabilidad de la programación (como el formato) y PPC por compromisos */
    const fb=st({b:true,sz:10,nb:true}),fbc=st({b:true,sz:10,h:'center',nb:true});const rl=r;
    set(r,1,'CONFIABILIDAD DE LA PROGRAMACIÓN',fb);set(r,7,'Total de registros  :',st({b:true,sz:10,nb:true,h:'right'}));
    const cell=(c,v,f,s)=>{const o=set(r,c,v,s);if(f)o.f=f};
    const oc=X.utils.encode_col(14),pc=X.utils.encode_col(15);
    cell(8,tSi+tNo,`M${rl+1}+Q${rl+1}`,fbc);set(r,10,'Cumplidos :',fb);cell(12,tSi,`SUM(${oc}${r1+1}:${oc}${rl})`,st({b:true,sz:10,h:'center',nb:true,c:'00B050'}));
    set(r,13,'NO Cumplidos :',fb);cell(16,tNo,`SUM(${pc}${r1+1}:${pc}${rl})`,st({b:true,sz:10,h:'center',nb:true,c:'FF0000'}));
    set(r,17,'Porcentaje de confiabilidad :',fb);{const o=set(r,18,tSi+tNo?tSi/(tSi+tNo):0,{...fbc,numFmt:'0%'});o.f=`IFERROR(M${rl+1}/I${rl+1},0)`}
    r++;set(r,1,`PPC de la semana (compromisos cumplidos / programados): ${tOk} de ${tN}`,st({sz:9,nb:true,c:'555555'}));set(r,18,tN?tOk/tN:0,{...st({b:true,sz:10,h:'center',nb:true}),numFmt:'0%'});
    ws['!ref']=X.utils.encode_range({s:{r:0,c:0},e:{r:r,c:22}});ws['!merges']=M;ws['!autofilter']={ref:X.utils.encode_range({s:{r:8,c:1},e:{r:rl-1,c:22}})};
    ws['!cols']=[{wch:2},{wch:7},{wch:34},{wch:13},{wch:9},{wch:5},{wch:8},{wch:8},...wd.map(()=>({wch:6})),{wch:4.5},{wch:4.5},{wch:7},{wch:30},{wch:16},{wch:16},{wch:7},{wch:18},{wch:18}];
    [12.75,18,18,18,18,11.25,17.25,15,15].forEach((h,i)=>RH[i]={hpt:h});ws['!rows']=RH;
    ws['!views']=[{state:'frozen',xSplit:0,ySplit:9}];
    const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'PPC');
    const buf=X.write(wb,{type:'array',bookType:'xlsx'});
    saveBlob(`${p.code||'LPS'}_PPC_${U.piso?(S.pis.get(U.piso)?.code||'')+'_':''}Sem${n}.xlsx`,new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  }catch(e){toast(e&&e.message?e.message:'No se pudo generar el Excel.')}finally{if(btn){btn.disabled=false;btn.textContent=bt}}}
