"use strict";
/* LPS 911 · Plan maestro: importar el Excel del planner (paso 2 de docs/plan-maestro.md).
   Lee la hoja visible con la columna ITEM (N proyecto, C.x capítulo, C especialidad, D frente, E partida, F piso o
   subgrupo, P actividad; sin letra = según su nivel), arma el árbol con la letra y el nivel de agrupación de la fila,
   pide emparejar los textos del nivel F con los pisos del sistema y aplica los cambios al maestro en un solo paso
   (se deshace junto). Lo que ya existía con la misma ruta de nombres conserva su id: volver a importar actualiza. */

/* ---------- lectura ---------- */
const mpxNrm=s=>fold(s).replace(/[“”"]/g,'').replace(/\s+/g,' ').trim();
/** número de serie de Excel → fecha ISO (sin zona horaria) */
const mpxDate=v=>{if(typeof v==='number'&&v>20000&&v<80000)return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
  if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);if(typeof v==='string'){const m=v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];return`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}}return''};
/** Busca en una hoja la fila de títulos (ITEM … DESCRIPCION) y las columnas que interesan. */
function mpxHead(X,ws){if(!ws||!ws['!ref'])return null;const R=X.utils.decode_range(ws['!ref']);const lim=Math.min(R.e.r,R.s.r+40),cmax=Math.min(R.e.c,R.s.c+40);
  for(let r=R.s.r;r<=lim;r++){const col={};for(let c=R.s.c;c<=cmax;c++){const cell=ws[X.utils.encode_cell({r,c})];if(!cell||cell.v==null)continue;const t=mpxNrm(cell.v);
      if(t==='item')col.t=c;else if(/^descripci/.test(t)||t==='actividad'||t==='nombre')col.name=c;else if(t==='und'||t==='unidad')col.und=c;else if(t==='metrado')col.met=c;
      else if(/^(f\.? ?)?inicio$|^fecha (de )?inicio$/.test(t))col.ini=c;else if(/^(f\.? ?)?fin$|^fecha (de )?fin$/.test(t))col.fin=c;else if(/^dur/.test(t))col.dur=c}
    if(col.t!=null&&col.name!=null)return{r,col,R}}return null}
/** Filas de datos de la hoja: {r (fila de Excel), t (letra), name, und, met, ini, fin, lv (nivel de agrupación), txt (duración escrita, p. ej. «EN STOCK»)} */
function mpxRows(X,ws,H){const out=[];const rows=ws['!rows']||[];const g=(r,c)=>{if(c==null)return null;const cell=ws[X.utils.encode_cell({r,c})];return cell?cell.v:null};
  for(let r=H.r+1;r<=H.R.e.r;r++){const name=String(g(r,H.col.name)??'').replace(/\s+/g,' ').trim();if(!name)continue;
    const t=String(g(r,H.col.t)??'').trim().toUpperCase();const met=g(r,H.col.met);const dur=g(r,H.col.dur);
    out.push({r:r+1,t,name,und:String(g(r,H.col.und)??'').trim(),met:typeof met==='number'?Math.round(met*100)/100:null,ini:mpxDate(g(r,H.col.ini)),fin:mpxDate(g(r,H.col.fin)),lv:(rows[r]&&rows[r].level)||0,txt:typeof dur==='string'?dur.trim():''})}
  return out}
/** Hojas visibles que tienen la tabla del maestro, la de más filas primero */
function mpxSheets(X,wb){const info=(wb.Workbook&&wb.Workbook.Sheets)||[];
  return wb.SheetNames.filter((n,i)=>!(info[i]&&info[i].Hidden)).map(n=>{const H=mpxHead(X,wb.Sheets[n]);return H?{n,H,rows:mpxRows(X,wb.Sheets[n],H)}:null}).filter(Boolean).sort((a,b)=>b.rows.length-a.rows.length)}

/* ---------- árbol ----------
   Cada fila cuelga de la fila anterior más cercana de rango menor; el rango es (letra, nivel de agrupación):
   N < C.x < C < D < E < F < (sin letra) < P, y a igual letra manda el nivel (un F dentro de otro F, p. ej. PROCURA). */
const mpxRank=t=>{if(t==='N')return 0;if(/^C(\.\d+)+$/.test(t))return 1+(t.split('.').length-2)*.1;return{C:3,D:4,E:5,F:6,P:7}[t]??6.5};
function mpxTree(rows){const out=[],st=[];const lt=(a,b)=>a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1]);
  for(const x of rows){const k=[mpxRank(x.t),x.lv];while(st.length&&!lt(st[st.length-1].k,k))st.pop();const n={...x,k,i:out.length,par:st.length?st[st.length-1].i:-1,kids:[]};
    out.push(n);if(n.par>=0)out[n.par].kids.push(n.i);st.push(n)}return out}

/* ---------- pisos ---------- */
const MPX_PISO=/\b(piso|sotano|semisotano|azotea|nivel|techo|mezzanine|tecnico)\b/;
/** Sugerencia de piso del sistema para un texto del Excel («PISO 01», «SOTANO», «AZOTEA»…); '' si no hay uno claro */
function mpxGuess(text){const t=mpxNrm(text);const P=pisos();const pn=p=>mpxNrm(`${p.name||''} ${p.code||''}`);
  const ORD=['primer','segundo','tercer','cuarto','quinto','sexto','septimo','octavo','noveno','decimo'];
  const num=p=>{const s=pn(p);const m=s.match(/(\d+)/);if(m)return+m[1];const i=ORD.findIndex(o=>s.includes(o));return i>=0?i+1:null};
  const one=L=>L.length===1?L[0].id:'';const kind=(re)=>P.filter(p=>re.test(pn(p)));
  if(/sotano/.test(t)){const L=kind(/sot/);const n=(t.match(/(\d+)/)||[])[1];return one(n&&L.length>1?L.filter(p=>num(p)===+n):L)}
  if(/azotea/.test(t)||t==='techo')return one(kind(/azot|techo/));
  if(/tecnico/.test(t))return one(kind(/tecn/));
  const m=t.match(/^(piso|nivel|p)\s*0*(\d+)(\s*-.*)?$/);if(m)return one(P.filter(p=>!/sot|azot|techo|tecn/.test(pn(p))&&num(p)===+m[2]));
  return''}

/* ---------- del árbol del Excel a nodos del maestro ---------- */
/** map: texto normalizado del nivel F → id de piso ('' = no es piso). det: incluir las actividades P. */
function mpxBuild(tree,map,det){const warn=[];const tipo=new Array(tree.length);
  const isPiso=n=>n.t==='F'&&!!map[mpxNrm(n.name)];
  const struct=n=>(n.t==='E'||n.t==='F'||mpxRank(n.t)===6.5)&&!isPiso(n);
  for(const n of tree){if(n.t==='N'){tipo[n.i]='skip';continue}
    /* un título suelto sin letra, sin fechas ni filas debajo (p. ej. «C. CONSTRUCCIÓN Y SUPERVISIÓN») no es parte del plan */
    if(!n.t&&!n.kids.length&&!n.ini&&!n.fin&&n.lv===0){tipo[n.i]='skip';continue}
    if(/^C(\.\d+)*$/.test(n.t)||n.t==='D'||(n.lv===0&&!n.t&&n.kids.length)){tipo[n.i]='wbs';continue}
    if(isPiso(n)){tipo[n.i]='pp';continue}
    if(n.t!=='P'){tipo[n.i]=n.kids.some(k=>struct(tree[k])||/^(C|D)/.test(tree[k].t))?'wbs':'part';continue}
    const pt=n.par>=0?tipo[n.par]:'';tipo[n.i]=pt==='part'||pt==='pp'||pt==='det'?'det':'part'}
  /* padre efectivo: se saltan la fila del proyecto (N) y lo que no se importa */
  const keep=i=>tipo[i]!=='skip'&&!(tipo[i]==='det'&&!det);
  const parOf=n=>{let p=n.par;while(p>=0&&!keep(p))p=tree[p].par;return p};
  const nodes=[];const ordC=new Map();const seenPiso=new Map();
  for(const n of tree){if(!keep(n.i))continue;const p=parOf(n);const o=(ordC.get(p)||0)+1;ordC.set(p,o);const tp=tipo[n.i];
    let ini=n.ini,fin=n.fin;if(ini&&fin&&fin<ini){warn.push(`Fila ${n.r}: «${n.name}» termina antes de empezar; se deja el fin igual al inicio.`);fin=ini}
    if(!ini&&fin)ini=fin;if(!fin&&ini)fin=ini;
    if((tp==='part'||tp==='pp'||tp==='det')&&!ini&&!n.kids.some(k=>keep(k)))warn.push(`Fila ${n.r}: «${n.name}» no tiene fechas${n.txt?` (dice «${n.txt}»)`:''}.`);
    const x={i:n.i,par:p,tipo:tp,ord:o,name:n.name,code:/^C(\.\d+)+$/.test(n.t)?n.t:'',xl:{t:n.t,r:n.r}};
    if(ini){x.ini=ini;x.fin=fin}if(n.und)x.und=n.und;if(n.met!=null)x.metrado=n.met;if(n.txt)x.obs=n.txt;
    if(tp==='pp'){x.pisoId=map[mpxNrm(n.name)];const k=p+'|'+x.pisoId;if(seenPiso.has(k))warn.push(`Fila ${n.r}: «${n.name}» repite el piso de la fila ${seenPiso.get(k)} en la misma partida.`);else seenPiso.set(k,n.r)}
    nodes.push(x)}
  const cnt={wbs:0,part:0,pp:0,det:0};nodes.forEach(x=>cnt[x.tipo]++);
  return{nodes,warn,cnt}}

/* ---------- cambios sobre el maestro actual ----------
   La «ruta» de un nodo son los nombres desde la raíz (con el n.º de repetición si hay hermanos con el mismo nombre).
   Lo que coincide conserva su id (los hitos amarrados siguen apuntando bien); lo nuevo se crea; lo que ya no está se archiva. */
function mpxKeys(list,parOf,nameOf,idOf){const key=new Map();const rep=new Map();
  for(const x of list){const p=parOf(x);const pk=p==null||p===''||p<0?'':key.get(p)||'';const b=pk+'›'+mpxNrm(nameOf(x));const k=(rep.get(b)||0)+1;rep.set(b,k);key.set(idOf(x),b+'#'+k)}return key}
const MPX_F=['tipo','parent','ord','code','name','pisoId','und','metrado','ini','fin','obs'];
function mpxPlan(B,arch){const I=mpIdx();
  /* nodos actuales en orden de árbol (padres antes que hijos) */
  const cur=[];const walk=n=>{cur.push(n);(I.kids.get(n.id)||[]).forEach(walk)};(I.kids.get('')||[]).forEach(walk);
  const oldK=mpxKeys(cur,n=>n.parent&&MPN.has(n.parent)?n.parent:'',n=>n.name||'',n=>n.id);const byK=new Map();for(const[id,k]of oldK)if(!byK.has(k))byK.set(k,id);
  const newK=mpxKeys(B.nodes,x=>x.par,x=>x.name,x=>x.i);
  const idOf=new Map(),used=new Set();for(const x of B.nodes){const o=byK.get(newK.get(x.i));if(o&&!used.has(o)){idOf.set(x.i,o);used.add(o)}else idOf.set(x.i,uid('mp'))}
  const ops=[];let nNew=0,nUpd=0,nSame=0;
  for(const x of B.nodes){const id=idOf.get(x.i);const old=MPN.get(id);
    const nx={...(old||{}),tipo:x.tipo,parent:x.par>=0?idOf.get(x.par):'',ord:x.ord,name:x.name,src:'excel',xl:x.xl};
    for(const f of['code','pisoId','und','metrado','ini','fin','obs'])if(x[f]!=null&&x[f]!=='')nx[f]=x[f];else delete nx[f];
    if(!old){nNew++;ops.push(mpOp(id,nx));continue}
    const pick=o=>MPX_F.map(f=>o[f]??null);if(canon(pick(old))===canon(pick(nx))){nSame++;continue}nUpd++;ops.push(mpOp(id,nx))}
  const gone=cur.filter(n=>!used.has(n.id));const a={t:NOW(),by:me?me.email:'',n:me?(me.name||me.email):''};
  if(arch)gone.forEach(n=>ops.push(mpOp(n.id,{...n,arch:a})));
  const lost=new Set(gone.map(n=>n.id));const hitosRotos=arch?I.hitos.filter(h=>((h.hk||{}).nodos||[]).some(id=>lost.has(id))).length:0;
  return{ops,nNew,nUpd,nSame,nGone:gone.length,hitosRotos}}

/* ---------- ventana de importación ---------- */
let MX=null;
async function mpxOpen(file){if(!canMP())return;MX={file:file.name,det:true,arch:true,map:{},err:''};
  lqModal(`<div class="lqh"><b>Importar el Excel del planner</b><span>${esc(file.name)}</span></div><p class="mu">Leyendo el Excel… (un archivo grande puede tardar unos segundos)</p>`);
  try{await loadXlsx();const buf=await file.arrayBuffer();await new Promise(r=>setTimeout(r,30));
    const wb=window.XLSX.read(buf,{type:'array',cellStyles:true,cellHTML:false,cellText:false});
    MX.sheets=mpxSheets(window.XLSX,wb);if(!MX.sheets.length)throw new Error('No encontré ninguna hoja visible con las columnas ITEM y DESCRIPCIÓN.');
    MX.sheet=MX.sheets[0].n;
    /* emparejado guardado de una importación anterior */
    let saved={};try{const d=await fcol('mpcfg').doc('main').get();saved=(d.exists&&d.data().pisoMap)||{}}catch(e){}
    MX.saved=saved;mpxSheetSet(MX.sheet)}
  catch(e){lqModal(`<div class="lqh"><b>No se pudo leer el Excel</b><span>${esc(file.name)}</span></div><div class="callout warnc">${esc(e.message||String(e))}</div><div class="maedlgb"><span style="flex:1"></span><button class="ib pri" data-lqx>Cerrar</button></div>`);MX=null}}
function mpxSheetSet(n){const sh=MX.sheets.find(s=>s.n===n)||MX.sheets[0];MX.sheet=sh.n;MX.tree=mpxTree(sh.rows);
  /* textos del nivel F con sus filas; los que parecen pisos primero */
  const F=new Map();for(const x of MX.tree)if(x.t==='F'){const k=mpxNrm(x.name);const o=F.get(k)||{k,txt:x.name,n:0};o.n++;F.set(k,o)}
  MX.F=[...F.values()].map(o=>({...o,looks:MPX_PISO.test(o.k)})).sort((a,b)=>(b.looks-a.looks)||a.k.localeCompare(b.k,'es',{numeric:true}));
  MX.map={};for(const o of MX.F){const sv=MX.saved[o.k];MX.map[o.k]=sv!=null?(sv==='-'?'':(S.pis.has(sv)?sv:'')):mpxGuess(o.txt)}
  mpxPaint()}
function mpxPaint(){const B=mpxBuild(MX.tree,MX.map,MX.det);const PL=mpxPlan(B,MX.arch);MX.B=B;MX.PL=PL;const empty=!MPN.size;
  const sel=o=>`<select data-mxp="${esc(o.k)}" aria-label="Piso para ${esc(o.txt)}"><option value="">— No es piso (subgrupo) —</option>${pisos().map(p=>`<option value="${p.id}"${MX.map[o.k]===p.id?' selected':''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>`;
  const row=o=>`<tr><td>${esc(o.txt)}</td><td class="mu">${o.n}</td><td>${sel(o)}</td></tr>`;
  const looks=MX.F.filter(o=>o.looks),rest=MX.F.filter(o=>!o.looks);const nP=MX.F.filter(o=>MX.map[o.k]).length;
  lqModal(`<div class="lqh"><b>Importar el Excel del planner</b><span>${esc(MX.file)}${MX.sheets.length>1?'':` · hoja «${esc(MX.sheet)}»`} · ${MX.tree.length} filas</span></div>
    ${MX.sheets.length>1?`<label>Hoja<select id="mxsh">${MX.sheets.map(s=>`<option${s.n===MX.sheet?' selected':''}>${esc(s.n)}</option>`).join('')}</select></label>`:''}
    <div class="mxsec"><b>1. Pisos</b> <span class="mu">Empareja los textos del nivel F con los pisos del sistema. Los que no son pisos (PROCURA, INSTALACIÓN…) quedan como subgrupos. Se recuerda para la próxima vez.</span>
      ${pisos().length?'':'<div class="callout warnc">El proyecto no tiene pisos todavía: créalos en Configuración para poder emparejarlos.</div>'}
      <table class="t mxt"><thead><tr><th>Texto en el Excel</th><th>Filas</th><th>Piso del sistema</th></tr></thead><tbody>${looks.map(row).join('')||'<tr><td colspan="3" class="mu">No hay textos que parezcan pisos.</td></tr>'}</tbody></table>
      ${rest.length?`<details class="mxmore"><summary>Otros textos del nivel F (${rest.length}): se importan como subgrupos</summary><table class="t mxt"><tbody>${rest.map(row).join('')}</tbody></table></details>`:''}
      <p class="mu" style="margin:4px 0 0">${nP} texto${nP===1?'':'s'} emparejado${nP===1?'':'s'} con un piso.</p></div>
    <div class="mxsec"><b>2. Qué se importa</b>
      <div class="mxcnt"><span><b>${B.cnt.wbs}</b> agrupadores</span><span><b>${B.cnt.part}</b> partidas</span><span><b>${B.cnt.pp}</b> partidas por piso</span><span><b>${B.cnt.det}</b> actividades de detalle</span></div>
      <label class="chk"><input type="checkbox" id="mxdet"${MX.det?' checked':''}> Incluir las actividades de detalle (nivel P)</label>
      ${B.warn.length?`<details class="mxmore"${B.warn.length<=4?' open':''}><summary>${B.warn.length} aviso${B.warn.length===1?'':'s'} (se importa igual; lo corriges después en el maestro)</summary><ul class="mxw">${B.warn.slice(0,80).map(w=>`<li>${esc(w)}</li>`).join('')}${B.warn.length>80?`<li class="mu">y ${B.warn.length-80} más…</li>`:''}</ul></details>`:''}</div>
    ${empty?'':`<div class="mxsec"><b>3. Cambios en el plan maestro actual</b>
      <div class="mxcnt"><span><b>${PL.nNew}</b> nuevos</span><span><b>${PL.nUpd}</b> se actualizan</span><span><b>${PL.nSame}</b> sin cambios</span><span><b>${PL.nGone}</b> ya no están en el Excel</span></div>
      ${PL.nGone?`<label class="chk"><input type="checkbox" id="mxarch"${MX.arch?' checked':''}> Archivar los ${PL.nGone} que ya no están en el Excel (se pueden recuperar)</label>`:''}
      ${PL.hitosRotos?`<div class="callout warnc">${PL.hitosRotos} hito${PL.hitosRotos===1?' está amarrado':'s están amarrados'} a partidas que se archivarían: revísalos después.</div>`:''}
      <p class="mu" style="margin:4px 0 0">Los hitos no se tocan. Lo que tiene el mismo nombre en el mismo lugar se actualiza y conserva sus vínculos.</p></div>`}
    <div class="maedlgb"><span class="mu">Se aplica todo junto y se deshace con «Deshacer».</span><span style="flex:1"></span><button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-mxok${PL.ops.length?'':' disabled'}>${PL.ops.length?`Importar (${PL.ops.length} cambio${PL.ops.length===1?'':'s'})`:'No hay cambios'}</button></div>`,
   e=>{const b=e.target.closest('[data-mxok]');if(b&&!b.disabled)mpxGo()},
   e=>{const t=e.target;if(t.dataset.mxp!=null){MX.map[t.dataset.mxp]=t.value;mpxPaint();return}if(t.id==='mxdet'){MX.det=t.checked;mpxPaint();return}if(t.id==='mxarch'){MX.arch=t.checked;mpxPaint();return}if(t.id==='mxsh'){mpxSheetSet(t.value)}});
  const c=document.querySelector('#lqm .lqc');if(c)c.classList.add('lqwide')}
function mpxGo(){const PL=MX.PL,B=MX.B;if(!PL||!PL.ops.length)return;
  /* se recuerda el emparejado de pisos (los textos que no son piso se guardan como «-») */
  const pm={...(MX.saved||{})};for(const o of MX.F)pm[o.k]=MX.map[o.k]||'-';
  if(db)fcol('mpcfg').doc('main').set({pisoMap:pm},{merge:true}).catch(()=>{});
  const first=!MPN.size;lqClose();
  mpApply(PL.ops,`Plan maestro importado: ${PL.nNew} nuevo${PL.nNew===1?'':'s'}, ${PL.nUpd} actualizado${PL.nUpd===1?'':'s'}${MX.arch&&PL.nGone?`, ${PL.nGone} archivado${PL.nGone===1?'':'s'}`:''}`);
  /* al cargar por primera vez se ve plegado hasta los capítulos */
  if(first){U.mpCol=[...mpIdx().kids.keys()].filter(Boolean);saveUI();requestRender()}
  MX=null}
