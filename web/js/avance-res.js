"use strict";
/* LPS 911 · Módulo Avance › Resumen (pestaña `ares`, docs/ia/avance.md «Resumen»): lo que hacía la hoja RESUMEN del Excel del dueño.
   Avance por partida y por piso, lo avanzado cada semana, el avance global y su curva, y los exportes a Excel y PDF.
   - Lee TODAS las partidas con una lectura suelta (get) de avm y ava al entrar; no queda escuchando («Actualizar» vuelve a leer).
   - Global = Σ (avance de la partida × su peso) ÷ Σ pesos, solo con las partidas que ya tienen metrado. El peso (avp.peso) vale 1 si
     no se puso: todas pesan igual. Lo cambian administrador y editores en la misma tabla. Nunca se suman unidades distintas.
   - Lo avanzado en una semana = avance hasta su domingo − avance hasta el domingo anterior (el corte inicial cuenta desde antes). */
const ARS={ok:false,loading:false,t:0,by:new Map(),err:'',who:''};
const avPeso=p=>+p.peso>0?+p.peso:1;
function avResLoad(){if(ARS.loading||!db)return;ARS.loading=true;ARS.err='';ARS.who=me.email||'';
  Promise.all([fcol('avm').get(),fcol('ava').get()]).then(([m,d])=>{const by=new Map(),g=(sn)=>{const o=new Map();sn.docs.forEach(x=>{const v={...x.data(),id:x.id};if(!o.has(v.p))o.set(v.p,[]);o.get(v.p).push(v)});return o},M=g(m),D=g(d);
    M.forEach((docs,pid)=>by.set(pid,avBuild(docs,D.get(pid)||[])));ARS.by=by;ARS.ok=true;ARS.t=NOW()})
    .catch(e=>{ARS.err=e&&(e.code||e.message)||'error';toast('No se pudo leer el avance: '+ARS.err)}).finally(()=>{ARS.loading=false;if(U.tab==='ares')requestRender()})}
/** datos del resumen: partidas con sus filas, avance, por piso y por semana; y el global */
function avResData(){const t=todayIso(),mon=avMon(t),P=avParts().map(p=>{const B=ARS.by.get(p.id)||{rows:[],ex:{}},rows=B.rows.filter(r=>r.q>0);return{p,rows,ex:B.ex,all:B.rows.length,has:rows.length>0,peso:avPeso(p),pct:avGrpPct(B.ex,rows)}});
  const act=P.filter(x=>x.has),glob=h=>{const w=act.reduce((s,x)=>s+x.peso,0);return w?act.reduce((s,x)=>s+x.peso*avGrpPct(x.ex,x.rows,h),0)/w:0};
  /* semanas: desde el primer inicio de las partidas hasta esta semana (como mucho las últimas 26 para la curva) */
  let d0=mon;act.forEach(x=>{if(x.p.d0&&x.p.d0<d0)d0=x.p.d0});const W=[];for(let m=avMon(d0);m<=mon&&W.length<400;m=addD(m,7))W.push(m);const Ws=W.slice(-26);
  const at=(x,m)=>avGrpPct(x.ex,x.rows,addD(m,6));
  const wk=x=>Ws.map((m,i)=>at(x,m)-(i?at(x,Ws[i-1]):avGrpPct(x.ex,x.rows,addD(m,-1))));
  const gAt=Ws.map(m=>glob(addD(m,6))),gWk=Ws.map((m,i)=>gAt[i]-(i?gAt[i-1]:glob(addD(m,-1))));
  const ps=[...pisos(),...ARCH.pis.values()].filter(pi=>act.some(x=>x.rows.some(r=>r.piso===pi.id)));
  return{t,P,act,Ws,ps,g:glob(''),gAt,gWk,wk,piso:(x,pi)=>{const rs=x.rows.filter(r=>r.piso===pi.id);return rs.length?avGrpPct(x.ex,rs):null},
    gPiso:pi=>{let w=0,s=0;act.forEach(x=>{const rs=x.rows.filter(r=>r.piso===pi.id);if(rs.length){w+=x.peso;s+=x.peso*avGrpPct(x.ex,rs)}});return w?s/w:null}}}
const avP1=v=>(Math.round(v*1000)/10).toLocaleString('es-PE',{maximumFractionDigits:1})+' %';
const avDl=v=>Math.abs(v)<0.0005?'':(v>0?'+':'')+avP1(v);
function renderARes(main){ensureAv();if(ARS.who!==(me.email||'')){ARS.ok=false;ARS.by=new Map();ARS.err='';ARS.who=me.email||''}
  /* se lee al entrar la primera vez y luego cada 15 min o con «Actualizar» (son colecciones enteras); la partida abierta en Registro va siempre con sus datos en vivo */
  if(!ARS.loading&&avOk&&(!ARS.ok||NOW()-ARS.t>9e5)&&!ARS.err)avResLoad();
  if(ARS.ok&&avSubP&&AV.dok===3&&AVP.has(avSubP)){const D=avData();ARS.by.set(avSubP,{rows:D.rows,ex:D.ex})}
  let h=`<div class="scroll"><div class="avpage">`;
  if(!avOk||(!ARS.ok&&!ARS.err))h+='<div class="empty">Calculando el resumen…</div>';
  else if(!ARS.ok)h+=`<div class="empty"><b>No se pudo leer el avance.</b><br><button class="ib" data-ar="load">Reintentar</button></div>`;
  else{const R=avResData(),cfg=avaCfg(),nw=Math.min(R.Ws.length,8),Wv=R.Ws.slice(-nw),off=R.Ws.length-nw,cur=R.gWk[R.gWk.length-1]||0;
    h+=`<div class="avbar"><b class="avrt">Resumen de avance</b><span class="avtot">al ${fmtD(R.t)} ${R.t.slice(0,4)}</span><span class="avsp"></span><button class="ib" data-ar="load"${ARS.loading?' disabled':''}>${ARS.loading?'Actualizando…':'Actualizar'}</button><button class="ib" data-ar="xls">Excel</button><button class="ib" data-ar="pdf">PDF</button></div>`;
    if(!R.act.length)h+=`<div class="empty"><b>Aún no hay partidas con metrado.</b><br>Se cargan en la pestaña Registro.</div>`;
    else{h+=`<div class="avtiles"><div class="avtile"><span>Avance global</span><b>${avPc(R.g)}</b><small>${R.act.length} partida${R.act.length===1?'':'s'} con metrado</small></div><div class="avtile"><span>Falta</span><b>${avPc(1-R.g)}</b><small>&nbsp;</small></div><div class="avtile"><span>Esta semana</span><b>${avDl(cur)||'0 %'}</b><small>Semana ${weekOf(R.Ws[R.Ws.length-1])}</small></div></div>
      <div class="avrcard"><h3>Por partida y por piso</h3><div class="avrbox"><table class="avrtb"><thead><tr><th>Partida</th><th class="num" title="Cuánto pesa la partida en el avance global">Peso</th><th>Avance</th>${R.ps.map(pi=>`<th class="num">${esc(pi.name)}</th>`).join('')}</tr></thead><tbody>${R.P.map(x=>`<tr${x.has?'':' class="avmu"'}><td><button type="button" class="lnkb" data-argo="${esc(x.p.id)}" title="Abrir su planilla">${esc(x.p.nom)}</button></td><td class="num">${cfg?`<input class="tin avrpw" type="number" min="0" step="any" data-arpw="${esc(x.p.id)}" data-fk="arpw-${esc(x.p.id)}" value="${x.peso}" aria-label="Peso de ${esc(x.p.nom)}">`:x.peso}</td><td>${x.has?avBar(x.pct):(x.all?'por metrar':'sin filas')}</td>${R.ps.map(pi=>{const v=x.has?R.piso(x,pi):null;return`<td class="num">${v==null?'':avPc(v)}</td>`}).join('')}</tr>`).join('')}</tbody>
        <tfoot><tr><th>Global</th><th class="num">${avF(R.act.reduce((s,x)=>s+x.peso,0))}</th><th>${avBar(R.g)}</th>${R.ps.map(pi=>{const v=R.gPiso(pi);return`<th class="num">${v==null?'':avPc(v)}</th>`}).join('')}</tr></tfoot></table></div>
        <p class="avnote">El global pondera cada partida por su peso; sin cambiarlo, todas pesan igual. En un piso solo cuentan las partidas que tienen filas ahí.</p></div>
      <div class="avrcard"><h3>Avance de cada semana</h3><div class="avrbox"><table class="avrtb"><thead><tr><th>Partida</th>${Wv.map(m=>`<th class="num" title="${fmtD(m)} – ${fmtD(addD(m,6))}">S${weekOf(m)}<small>${fmtD(m)}</small></th>`).join('')}<th class="num">Acumulado</th></tr></thead><tbody>${R.act.map(x=>{const w=R.wk(x);return`<tr><td>${esc(x.p.nom)}</td>${Wv.map((m,i)=>`<td class="num">${avDl(w[off+i])}</td>`).join('')}<td class="num"><b>${avPc(x.pct)}</b></td></tr>`}).join('')}</tbody>
        <tfoot><tr><th>Global</th>${Wv.map((m,i)=>`<th class="num">${avDl(R.gWk[off+i])}</th>`).join('')}<th class="num">${avPc(R.g)}</th></tr></tfoot></table></div></div>
      <div class="avrcard"><h3>Avance global acumulado</h3>${avResCurve(R)}</div>`}}
  main.innerHTML=h+'</div></div>';
  main.onclick=e=>{if(U.tab!=='ares')return;const b=e.target.closest('[data-ar],[data-argo]');if(!b)return;if(b.dataset.argo){U.avP=b.dataset.argo;saveUI();goTab('areg');return}
    const k=b.dataset.ar;if(k==='load'){ARS.err='';avResLoad()}else if(k==='xls')avResXls();else if(k==='pdf')avResPdf();requestRender()};
  main.onchange=e=>{const t=e.target;if(U.tab!=='ares'||!t.dataset||!t.dataset.arpw||!avaCfg())return;const v=avNum(t.value);if(!(v>0)){toast('El peso debe ser mayor que 0.');requestRender();return}
    const p=AVP.get(t.dataset.arpw);if(p){AVP.set(p.id,{...p,peso:v});bgWrite(fcol('avp').doc(p.id).update({peso:v,...avWho()}))}requestRender()};
  main.onkeydown=null;main.oncontextmenu=null;main.oninput=null}
/** curva del avance global acumulado, semana a semana (SVG a mano, como los gráficos de Indicadores) */
function avResCurve(R){const W=720,H=200,L=40,T=12,B=30,iw=W-L-14,ih=H-T-B,n=R.Ws.length,x=i=>L+(n>1?iw*i/(n-1):iw/2),y=v=>T+ih*(1-Math.min(1,Math.max(0,v)));
  let s=`<svg class="avrsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Avance global acumulado por semana: ${avPc(R.g)} a la fecha">`;
  [0,.25,.5,.75,1].forEach(v=>s+=`<line class="g" x1="${L}" x2="${L+iw}" y1="${y(v)}" y2="${y(v)}"/><text class="t" x="${L-6}" y="${y(v)+3.5}" text-anchor="end">${v*100}</text>`);
  const st=Math.max(1,Math.ceil(n/9));R.Ws.forEach((m,i)=>{if(i%st===0||i===n-1)s+=`<text class="t" x="${x(i)}" y="${H-10}" text-anchor="middle">S${weekOf(m)}</text>`});
  const pts=R.gAt.map((v,i)=>[x(i),y(v)]);
  if(n>1)s+=`<path class="a" d="M${pts[0][0]},${y(0)} ${pts.map(p=>'L'+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')} L${pts[n-1][0]},${y(0)} Z"/><path class="l" d="M${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L')}"/>`;
  pts.forEach((p,i)=>s+=`<circle class="p" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===n-1?4.5:2.5}"><title>Semana ${weekOf(R.Ws[i])}: ${avP1(R.gAt[i])}</title></circle>`);
  const q=pts[n-1];return s+`<text class="v" x="${Math.min(q[0],W-34)}" y="${Math.max(q[1]-9,12)}" text-anchor="end">${avPc(R.g)}</text></svg>`}

/* ---------- exportes ---------- */
/** hoja de una partida con el aspecto de la planilla del dueño: una fila por fila (y por etapa) y una columna por día. Función pura → matriz */
function avResAoa(p,rows,ex){const C=avWeeks(p),days=C.W.flatMap(w=>w.days).filter(d=>d>=C.d0&&d<=C.d1),ini=rows.some(r=>Object.values(ex[r.id]||{}).some(o=>o&&o[AV_INI]));
  const hd=['Piso','Sector','Ambiente','Descripción','Etapa','Und','Metrado','Acumulado','% avance'].concat(ini?['Corte inicial']:[],days.map(d=>d.slice(8)+'/'+d.slice(5,7))),out=[hd];
  const nm=id=>{const o=S.pis.get(id)||ARCH.pis.get(id);return o?o.name:''};
  [...pisos(),...ARCH.pis.values()].forEach(pi=>{if(!rows.some(r=>r.piso===pi.id))return;const T=avTree(pi.id,rows,[]);
    const put=(r,sec,amb)=>avEtOf(r).forEach((e,i)=>{const he=avHasEt(r),a=avAcc(ex,r.id,e.id);if(he&&i===0)out.push([nm(pi.id),sec,amb,r.desc,'(todas)',r.und,r.q,Math.round(avRowPct(ex,r)*r.q*100)/100,Math.round(avRowPct(ex,r)*1000)/10].concat(ini?['']:[],days.map(()=>'')));
      out.push([nm(pi.id),sec,amb,r.desc,he?e.n:'',r.und,he?'':r.q,Math.round(a*100)/100,r.q?Math.round(Math.min(a/r.q,1)*1000)/10:0].concat(ini?[avCell(ex,r.id,e.id,AV_INI)||'']:[],days.map(d=>avCell(ex,r.id,e.id,d)||'')))});
    T.direct.forEach(r=>put(r,'',''));T.secs.forEach(s=>{s.direct.forEach(r=>put(r,s.nom,''));s.ambs.forEach(a=>a.rows.forEach(r=>put(r,s.id?s.nom:'',a.nom)))})});
  return out}
/** hoja Resumen → matriz */
function avResSum(R){const out=[['Resumen de avance',P().name||''],['Al',R.t],['Avance global',Math.round(R.g*1000)/10],[],['Partida','Peso','Avance %'].concat(R.ps.map(p=>p.name))];
  R.act.forEach(x=>out.push([x.p.nom,x.peso,Math.round(x.pct*1000)/10].concat(R.ps.map(pi=>{const v=R.piso(x,pi);return v==null?'':Math.round(v*1000)/10}))));
  out.push(['Global',Math.round(R.act.reduce((s,x)=>s+x.peso,0)*100)/100,Math.round(R.g*1000)/10].concat(R.ps.map(pi=>{const v=R.gPiso(pi);return v==null?'':Math.round(v*1000)/10})),[],['Avance de cada semana (%)'].concat(R.Ws.map(m=>'S'+weekOf(m)+' '+fmtD(m))));
  R.act.forEach(x=>out.push([x.p.nom].concat(R.wk(x).map(v=>Math.round(v*1000)/10))));out.push(['Global'].concat(R.gWk.map(v=>Math.round(v*1000)/10)),['Global acumulado'].concat(R.gAt.map(v=>Math.round(v*1000)/10)));return out}
async function avResXls(){if(!ARS.ok)return;try{toast('Generando el Excel…');await loadXlsx();const X=window.XLSX,R=avResData(),wb=X.utils.book_new(),bold={font:{bold:true},fill:{fgColor:{rgb:'E4E7E2'}}};
    const sheet=(aoa,name,hr,w)=>{const ws=X.utils.aoa_to_sheet(aoa);(aoa[hr]||[]).forEach((v,c)=>{const k=X.utils.encode_cell({r:hr,c});if(ws[k])ws[k].s=bold});ws['!cols']=w;const used=new Set(wb.SheetNames.map(x=>x.toLowerCase()));let n=String(name).replace(/[\\/?*[\]:]/g,' ').slice(0,28)||'Hoja',i=2;while(used.has(n.toLowerCase()))n=n.slice(0,25)+' '+(i++);/* Excel no distingue mayúsculas en los nombres de hoja */X.utils.book_append_sheet(wb,ws,n)};
    sheet(avResSum(R),'Resumen',4,[{wch:28},{wch:10},{wch:10}]);
    R.act.forEach(x=>{const B=ARS.by.get(x.p.id);sheet(avResAoa(x.p,B.rows,B.ex),x.p.nom,0,[{wch:16},{wch:14},{wch:24},{wch:40},{wch:14},{wch:6},{wch:10},{wch:10},{wch:9}])});
    saveBlob(`${P().code||'LPS'}_Avance_${R.t}.xlsx`,new Blob([X.write(wb,{type:'array',bookType:'xlsx'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));toast('Excel descargado.')}
  catch(e){toast('No se pudo generar el Excel: '+(e.message||e))}}
async function avResPdf(){if(!ARS.ok)return;try{toast('Generando el PDF…');await loadPdf();const{jsPDF}=window.jspdf,R=avResData(),doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),M=12;
    const T=v=>String(v??'').normalize('NFC').replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF–—‘’“”•…]/g,''),pc=v=>v==null?'':avPc(v),HS={fillColor:[31,95,122],textColor:255,fontStyle:'bold'},ST={fontSize:9,cellPadding:1.6,lineColor:[210,210,210]};
    doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(T('Avance físico de partidas'),M,18);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(T(`${P().name||''} · al ${fmtD(R.t)} ${R.t.slice(0,4)} · Avance global: ${avPc(R.g)}`),M,25);
    doc.autoTable({startY:31,margin:{left:M,right:M},head:[['Partida','Peso','Avance',...R.ps.map(p=>T(p.name))]],body:R.act.map(x=>[T(x.p.nom),x.peso,pc(x.pct),...R.ps.map(pi=>pc(R.piso(x,pi)))]),foot:[['Global',avF(R.act.reduce((s,x)=>s+x.peso,0)),pc(R.g),...R.ps.map(pi=>pc(R.gPiso(pi)))]],theme:'grid',styles:ST,headStyles:HS,footStyles:{fillColor:[228,231,226],textColor:20,fontStyle:'bold'}});
    const nw=Math.min(R.Ws.length,10),Wv=R.Ws.slice(-nw),off=R.Ws.length-nw;
    doc.autoTable({startY:doc.lastAutoTable.finalY+8,margin:{left:M,right:M},head:[['Avance de cada semana',...Wv.map(m=>'S'+weekOf(m)+' '+T(fmtD(m))),'Acumulado']],body:R.act.map(x=>{const w=R.wk(x);return[T(x.p.nom),...Wv.map((m,i)=>avDl(w[off+i])),pc(x.pct)]}),foot:[['Global',...Wv.map((m,i)=>avDl(R.gWk[off+i])),pc(R.g)]],theme:'grid',styles:ST,headStyles:HS,footStyles:{fillColor:[228,231,226],textColor:20,fontStyle:'bold'}});
    doc.save(`${P().code||'LPS'}_Avance_${R.t}.pdf`);toast('PDF descargado.')}
  catch(e){toast('No se pudo generar el PDF: '+(e.message||e))}}
