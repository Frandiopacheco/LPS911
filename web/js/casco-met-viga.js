"use strict";
/* LPS 911 · Casco › Metrados › Vigas (U.kmV='vig'). Decidido con el dueño el 28-10-2026 (nivel C: metrado para planificar, sin despiece por piezas).
   Cada viga es una plantilla que se edita sobre su elevación: ejes y vanos, corridos por rango de ejes, bastones por apoyo, estribos por vano
   y juntas de sector con posición libre. El metrado sale por sector: acero de vigas, concreto (losa y vigas) y encofrado (fondo + 1.er costado,
   2.º costado). Datos: kmet/v_<nivel> {L:[viga]} (en Casco cs_kmet). Reglas y detalle en docs/ia/casco.md «Metrados › Vigas». */

const KV={drag:null,map:null,sx:null};
const KV_EST1='1@.05, 10@.10, r@.25';
const kvDC=d=>({'3/8':'d38','1/2':'d12','5/8':'d58','3/4':'d34','1':'d1'})[d]||'dx';
const kvDN=d=>KM_DK[d]?KM_DK[d][1]:d;
const kvN=v=>{const x=kmNum(v);return Number.isFinite(x)?x:0};
const kvVigas=pid=>KM.vg.get(pid)||[];
const kvRep=t=>Math.max(1,String(t||'').split(/[,;\s]+/).filter(Boolean).length);
const kvCoarse=()=>{try{return matchMedia('(pointer: coarse)').matches}catch(e){return false}};
const kvFicha=()=>U.kvMode==='ficha'||(U.kvMode!=='dib'&&kvCoarse());

/* ---------- motor (funciones puras sobre la viga y los parámetros) ---------- */
/** «4 + 8.25×3 + 4» → [4, 8.25, 8.25, 8.25, 4]; null si no se entiende */
function kvParseEjes(t){const out=[];for(const p of String(t||'').split('+')){const m=/^\s*([\d.,]+)\s*(?:[x×*]\s*(\d+))?\s*$/i.exec(p);if(!m)return null;const v=kvN(m[1]);const k=m[2]?+m[2]:1;if(!(v>0)||k<1||k>40)return null;for(let i=0;i<k;i++)out.push(v)}return out.length?out:null}
function kvEjesTxt(E){const d=E.slice(0,-1).map(e=>kvN(e.d));const out=[];for(let i=0;i<d.length;){let k=1;while(i+k<d.length&&d[i+k]===d[i])k++;out.push(k>1?`${d[i]}×${k}`:`${d[i]}`);i+=k}return out.join(' + ')}
/** posiciones de estribos en una luz libre, con la distribución desde cada extremo y el resto al centro */
function kvEstPos(x0,L,D){if(!(L>0)||!D||D.err)return[];const half=L/2;const out=[];let x=0,stop=false;for(const z of D.z){for(let i=0;i<z.n;i++){if(x+z.s>half+1e-9){stop=true;break}x+=z.s;out.push(x)}if(stop)break}
  const gap=L-2*x;const mid=[];if(D.r&&gap>D.r+1e-9){const k=Math.ceil(gap/D.r-1e-9)-1;for(let i=1;i<=k;i++)mid.push(x+gap*i/(k+1))}
  const all=[...out.map(v=>x0+v),...mid.map(v=>x0+v),...out.map(v=>x0+L-v)];if(out.length&&gap<1e-9)all.pop();return all}
function kvGeo(V){let x=0;const E=(V.ejes||[]).map(e=>{const o={n:e.n,w:kvN(e.w),x};x+=kvN(e.d);return o});
  const T=[];for(let i=0;i<E.length-1;i++){const a=E[i].x+E[i].w/2,b=E[i+1].x-E[i+1].w/2;T.push({i,a,b,L:Math.max(0,b-a),est:((V.tramos||[])[i]||{}).est||''})}
  return{E,T,x0:E.length?E[0].x-E[0].w/2:0,x1:E.length?E[E.length-1].x+E[E.length-1].w/2:0}}
function kvJoints(V,G){const J=[];(V.jun||[]).forEach((j,i)=>{const e=G.E.find(e=>e.n===j.ref);if(e){const x=e.x+kvN(j.dx);if(x>G.x0+0.05&&x<G.x1-0.05)J.push({x,i})}});J.sort((a,b)=>a.x-b.x);return J}
/** estribo: medidas automáticas desde la sección (doble estribo: cada uno ~60 % del ancho) o las escritas */
function kvEstDims(V){const b=kvN(V.b),h=kvN(V.h),rec=kvN(V.rec)||0.04,per=Math.max(1,Math.round(kvN(V.estN)||1));const r=v=>Math.round(v*100)/100;
  const aA=r(Math.max(0.05,(b-2*rec)*(per===1?1:Math.min(1,1.2/per)))),bA=r(Math.max(0.05,h-2*rec));const a=kvN(V.ea)>0?kvN(V.ea):aA,bb=kvN(V.eb)>0?kvN(V.eb):bA;
  return{a,b:bb,aA,bA,per,manual:kvN(V.ea)>0||kvN(V.eb)>0,fits:a<=b-2*rec+0.005&&bb<=h-2*rec+0.005}}
/** metrado de una viga: kg por sector (y su origen), concreto, encofrado, kg por diámetro y detalle por elemento.
    rank(código) = orden de vaciado del sector (el que se vacía primero se lleva el traslape de la junta). */
function kvCalc(V,P,rank){const G=kvGeo(V);const J=kvJoints(V,G);const rec=kvN(V.rec)||0.04;const lmax=kvN(V.lmax)||P.lv||12;const warn=[];
  const names=J.map((_,k)=>(V.sec||[])[k]).concat([(V.sec||[])[J.length]]).map((n,k)=>n||('S'+(k+1)));
  const secAt=x=>{let k=0;for(const j of J)if(x>j.x+1e-9)k++;return names[k]};const rk=n=>rank?rank(n):0;
  const S={};const dia={};const items=[];let cur=null;
  const add=(s,k,v)=>{const o=S[s]||(S[s]={corr:0,bas:0,est:0,ext:0,conc:0,ef1:0,ef2:0});o[k]+=v;if(cur&&k!=='conc'&&k!=='ef1'&&k!=='ef2'){cur.kg+=v;cur.sec[s]=(cur.sec[s]||0)+v;if(k==='ext')cur.ext+=v}};
  const addD=(d,v)=>{dia[d]=(dia[d]||0)+v};const item=(tipo,desc,n,d)=>{cur={tipo,desc,n,d,kg:0,ext:0,sec:{}};items.push(cur)};
  const split=(a,b,fn)=>{const cuts=[a,...J.map(j=>j.x).filter(x=>x>a&&x<b),b];for(let i=0;i<cuts.length-1;i++)fn(secAt((cuts[i]+cuts[i+1])/2),cuts[i+1]-cuts[i])};
  const zoneOk=(x,p)=>{const t=G.T.find(t=>x>=t.a&&x<=t.b);if(!t)return false;return p==='sup'?(x>=t.a+t.L/3&&x<=t.b-t.L/3):(x<=t.a+t.L/4||x>=t.b-t.L/4)};
  const up5=v=>Math.ceil(v*20-1e-9)/20;const last=G.E.length-1;const bars=[];
  if(G.E.length<2)return{G,J,names,S,dia,warn:['La viga necesita al menos dos ejes'],items,vanos:[],bars,hn:0,per:1,ed:'3/8',ED:kvEstDims(V),Le:0};
  for(const c of V.corr||[]){const bs=kmSpec(c.s);const ia=G.E.findIndex(e=>e.n===c.de),ib=G.E.findIndex(e=>e.n===c.a);
    if(!bs||bs.err||ia<0||ib<0||ia>=ib){warn.push(bs&&bs.err?`Corrido: ${bs.err}`:`Corrido «${c.s||'?'}» de ${c.de||'?'} a ${c.a||'?'}: revisa barras y ejes`);continue}
    for(const b of bs){const D=P.dia[b.d],kg=D.kg,lp=c.p==='sup'?D.lts:D.lt,hk=D.g90;const ea=G.E[ia],eb=G.E[ib];
      /* extremo de la viga: hasta la cara exterior menos recubrimiento, con gancho; eje interior: pasa el apoyo y ancla un traslape */
      const s0=ia===0?G.x0+rec:ea.x-ea.w/2-lp,s1=ib===last?G.x1-rec:eb.x+eb.w/2+lp;bars.push({p:c.p,n:b.n,d:b.d,a:s0,b:s1,bas:false});
      item(c.p==='sup'?'Corrido superior':'Corrido inferior',`${c.de}–${c.a}`,b.n,b.d);
      split(s0,s1,(s,l)=>{add(s,'corr',b.n*l*kg);addD(b.d,b.n*l*kg)});
      const v1=b.n*hk*kg;if(ia===0){add(secAt(s0+0.01),'ext',v1);addD(b.d,v1)}if(ib===last){add(secAt(s1-0.01),'ext',v1);addD(b.d,v1)}
      /* junta de sector: un traslape por barra (+30 % fuera de la zona del plano), al sector que se vacía primero */
      const segs=[s0];J.forEach((j,k)=>{if(j.x>s0+0.3&&j.x<s1-0.3){const L=names[k],R=names[k+1];const lj=zoneOk(j.x,c.p)?lp:up5(lp*1.3);const s=rk(L)<=rk(R)?L:R;
        add(s,'ext',b.n*lj*kg);addD(b.d,b.n*lj*kg);segs.push(j.x)}});segs.push(s1);
      /* empalmes por longitud de varilla dentro de cada tramo entre juntas */
      for(let i=0;i<segs.length-1;i++){const Lt=segs[i+1]-segs[i]+(i===0&&ia===0?hk:0)+(i===segs.length-2&&ib===last?hk:0)+(i<segs.length-2?lp:0);
        const ex=Lt>lmax&&lmax>lp?Math.ceil((Lt-lmax)/(lmax-lp)-1e-9):0;if(ex){const s=secAt((segs[i]+segs[i+1])/2);add(s,'ext',b.n*ex*lp*kg);addD(b.d,b.n*ex*lp*kg)}}}}
  for(const t of V.bas||[]){const bs=kmSpec(t.s);const k=G.E.findIndex(e=>e.n===t.ap);if(!bs||bs.err||k<0){warn.push(bs&&bs.err?`Bastón: ${bs.err}`:`Bastón en ${t.ap||'?'}: revisa barras y eje`);continue}const e=G.E[k];
    for(const b of bs){const D=P.dia[b.d],kg=D.kg,hk=D.g90;const a=k===0?G.x0+rec:e.x-e.w/2-kvN(t.i),z=k===last?G.x1-rec:e.x+e.w/2+kvN(t.d);bars.push({p:t.p||'sup',n:b.n,d:b.d,a,b:z,bas:true});
      item('Bastón superior',`apoyo ${e.n}`,b.n,b.d);split(a,z,(s,l)=>{add(s,'bas',b.n*l*kg);addD(b.d,b.n*l*kg)});
      const hooks=(k===0?1:0)+(k===last?1:0);if(hooks){const v=b.n*hooks*hk*kg;add(secAt(e.x),'ext',v);addD(b.d,v)}}}
  const ed=V.estD||'3/8';const ED=kvEstDims(V);const Le=2*(ED.a+ED.b)+2*(P.dia[ed]?P.dia[ed].g135:0.13);const kgE=(P.dia[ed]||{kg:0.56}).kg;const per=ED.per;let nEst=0;
  G.T.forEach((t,i)=>{const D=kmDist(t.est);if(D&&D.err){warn.push(`Estribos ${G.E[i].n}–${G.E[i+1].n}: ${D.err}`);return}const X=kvEstPos(t.a,t.L,D);if(!X.length)return;
    item('Estribos',`vano ${G.E[i].n}–${G.E[i+1].n}`,X.length*per,ed);for(const x of X){add(secAt(x),'est',per*Le*kgE);nEst+=per}});
  const adic=Math.max(0,Math.round(kvN(V.adic)));if(adic){item('Estribos adicionales',`${adic} por nudo × ${G.E.length} nudos`,adic*G.E.length,ed);for(const e of G.E){add(secAt(e.x),'est',adic*Le*kgE);nEst+=adic}}
  cur=null;addD(ed,nEst*Le*kgE);for(const it of items)it.lu=it.n>0?it.kg/(it.n*P.dia[it.d].kg):0;
  const b=kvN(V.b),hn=Math.max(0,kvN(V.h)-kvN(V.losa));const vanos=[];
  G.T.forEach((t,i)=>{const o={desc:`${G.E[i].n}–${G.E[i+1].n}`,L:t.L,conc:b*hn*t.L,ef1:(b+hn)*t.L,ef2:hn*t.L,sc:{},se:{}};vanos.push(o);
    split(t.a,t.b,(s,l)=>{add(s,'conc',b*hn*l);add(s,'ef1',(b+hn)*l);add(s,'ef2',hn*l);o.sc[s]=(o.sc[s]||0)+b*hn*l;o.se[s]=(o.se[s]||0)+(b+2*hn)*l})});
  for(const s of names)if(!S[s])S[s]={corr:0,bas:0,est:0,ext:0,conc:0,ef1:0,ef2:0};for(const s of Object.keys(S)){const o=S[s];o.kg=o.corr+o.bas+o.est+o.ext}
  return{G,J,names,S,dia,warn,nEst,Le,items,vanos,bars,hn,per,ed,ED}}
const kvRank=C=>code=>{const id=C.secByCode(code);return id?C.secOrd(id):999};
/* frentes (29-10-2026): una viga puede cruzar de un frente a otro; con dos o más frentes en el nivel el selector agrupa los sectores por frente */
function kvSecOpts(C,sel0){const o=a=>`<option${a.code===sel0?' selected':''}>${esc(a.code||'')}</option>`;let h='';
  if(C.nFr>1){const g=new Map();for(const a of C.secs){const f=C.frOf(a.code);const k=f?f.id:'';if(!g.has(k))g.set(k,{f,L:[]});g.get(k).L.push(a)}
    for(const{f,L}of g.values())h+=`<optgroup label="${esc(f?f.name:'Sin frente')}">${L.map(o).join('')}</optgroup>`}else h=C.secs.map(o).join('');
  return h+(C.secByCode(sel0)?'':`<option selected>${esc(sel0)}</option>`)}
const kvFrName=(C,n)=>{const f=C.nFr>1?C.frOf(n):null;return f?f.name:''};
/** junta k de la viga entre sectores de frentes distintos → {a, b, first (sector que se lleva el traslape)}; si no, null */
function kvFrJ(C,R,k){const L=R.names[k],Rn=R.names[k+1];const a=C.frOf(L),b=C.frOf(Rn);if(!a||!b||a.id===b.id)return null;const rk=kvRank(C);return{a,b,first:rk(L)<=rk(Rn)?L:Rn}}
/** suma las vigas del nivel al resultado de Elementos (R.sec por id de sector, claves de KM_OUT) */
function kvMerge(R,pid,P,C){const L=kvVigas(pid);if(!L.length)return R;const sec={};for(const[k,v]of Object.entries(R.sec||{}))sec[k]={...v};const vmiss=[];
  for(const V of L){const r=kvCalc(V,P,kvRank(C));const ve=kvRep(V.rep);for(const n of r.names){const o=r.S[n];if(!o)continue;const id=C.secByCode(n);
    if(!id){if(o.kg>0)vmiss.push(`${V.cod||'Viga'}: sector ${n}`);continue}const a=sec[id]||(sec[id]={});a.avg=(a.avg||0)+o.kg*ve;a.vl=(a.vl||0)+o.conc*ve;a.ef1=(a.ef1||0)+o.ef1*ve;a.ef2=(a.ef2||0)+o.ef2*ve}}
  return{...R,sec,vmiss,nVig:L.length}}

/* ---------- datos y cambios ---------- */
function kvNueva(C,n){const s=(C.secs.find(a=>(csSecOf(a)||{}).grp==='E')||C.secs[0]||{}).code||'S1';
  return{id:uid('kv'),cod:'V-'+n,b:'0.30',h:'0.60',losa:'0.20',rec:'0.04',lmax:'',ejes:[{n:'A',w:'0.30',d:'5.00'},{n:'B',w:'0.30',d:'5.00'},{n:'C',w:'0.30',d:''}],tramos:[{est:KV_EST1},{est:KV_EST1}],
    estN:'1',estD:'3/8',ea:'',eb:'',adic:'0',corr:[{p:'sup',s:'2Ø5/8',de:'A',a:'C'},{p:'inf',s:'2Ø5/8',de:'A',a:'C'}],bas:[],jun:[],sec:[s],rep:''}}
function kvSel(pid){const L=kvVigas(pid);if(!L.some(v=>v.id===MET.vid))MET.vid=L[0]?L[0].id:null;return L.find(v=>v.id===MET.vid)||null}
/** cambia la viga elegida (copia, aplica fn y guarda con Deshacer) */
function kvSet(fn,label){const pid=U.piso;const L=JSON.parse(JSON.stringify(kvVigas(pid)));const V=L.find(v=>v.id===MET.vid);if(!V)return;if(fn(V)===false)return;kmPut('v_'+pid,{L},label||'Viga '+(V.cod||''));requestRender()}
function kvRenAxis(V,i,v){v=String(v).trim().toUpperCase();if(!v)return false;if(V.ejes.some((e,k)=>k!==i&&e.n===v)){toast(`Ya hay un eje ${v} en esta viga.`);requestRender();return false}
  const old=V.ejes[i].n;V.ejes[i].n=v;V.corr.forEach(c=>{if(c.de===old)c.de=v;if(c.a===old)c.a=v});V.bas.forEach(b=>{if(b.ap===old)b.ap=v});V.jun.forEach(j=>{if(j.ref===old)j.ref=v})}
function kvDelSpan(V,i){if(V.ejes.length<=2)return false;const k=i+1;const gone=V.ejes[k].n,nb=V.ejes[k-1].n;if(k<V.ejes.length-1)V.ejes[k-1].d=V.ejes[k].d;V.ejes.splice(k,1);V.tramos.splice(i,1);V.ejes[V.ejes.length-1].d='';
  V.corr.forEach(c=>{if(c.de===gone)c.de=nb;if(c.a===gone)c.a=nb});V.corr=V.corr.filter(c=>c.de!==c.a);V.bas=V.bas.filter(b=>b.ap!==gone);V.jun=V.jun.filter(j=>j.ref!==gone);MET.vsel=null}
function kvInsSpan(V,i){const used=new Set(V.ejes.map(e=>e.n));let k=1,n='N1';while(used.has(n))n='N'+(++k);
  if(i>=V.ejes.length-1){const oldLast=V.ejes[V.ejes.length-1].n;V.ejes[V.ejes.length-1].d=V.ejes[V.ejes.length-2]?V.ejes[V.ejes.length-2].d:'5.00';V.ejes.push({n,w:V.ejes[V.ejes.length-1].w,d:''});
    V.tramos.push({est:(V.tramos[V.tramos.length-1]||{}).est||KV_EST1});V.corr.forEach(c=>{if(c.a===oldLast)c.a=n})}
  else{V.ejes.splice(i+1,0,{n,w:V.ejes[i].w,d:V.ejes[i].d||'5.00'});V.tramos.splice(i+1,0,{est:(V.tramos[i]||{}).est||KV_EST1})}}
function kvApplyEjes(V,t){const D=kvParseEjes(t);if(!D){toast('Escribe las distancias entre ejes, p. ej. 4 + 8.25×3 + 4');requestRender();return false}
  const old=V.ejes;const used=new Set();const E=[];for(let i=0;i<=D.length;i++){let n=old[i]?old[i].n:'';if(!n||used.has(n)){let k=i+1;n='N'+k;while(used.has(n))n='N'+(++k)}used.add(n);E.push({n,w:old[i]?old[i].w:(old[0]||{}).w||'0.30',d:i<D.length?String(D[i]):''})}
  const names=new Set(E.map(e=>e.n));const lastN=E[E.length-1].n;const oldLast=(old[old.length-1]||{}).n;V.ejes=E;V.tramos=D.map((_,i)=>V.tramos[i]||{est:(V.tramos[V.tramos.length-1]||{}).est||KV_EST1});
  V.corr.forEach(c=>{if(!names.has(c.de))c.de=E[0].n;if(!names.has(c.a)||c.a===oldLast)c.a=lastN});V.bas=V.bas.filter(b=>names.has(b.ap));V.jun=V.jun.filter(j=>names.has(j.ref))}
/** cambios de los campos (data-kv="campo" o "campo:índice") */
function kvChange(el){const f=el.dataset.kv;const[k,ix]=f.split(':');const i=+ix;const v=el.value;
  const simple=['cod','b','h','losa','rec','ea','eb','estN','adic','rep'];
  kvSet(V=>{if(simple.includes(k)){V[k]=String(v).trim();return}
    if(k==='ejes')return kvApplyEjes(V,v);
    if(k==='en')return kvRenAxis(V,i,v);if(k==='ew')V.ejes[i].w=v.trim();else if(k==='ed')V.ejes[i].d=v.trim();else if(k==='es')V.tramos[i]={est:v.trim()};
    else if(k==='cs')V.corr[i].s=v.trim();else if(k==='cde')V.corr[i].de=v.trim().toUpperCase();else if(k==='ca')V.corr[i].a=v.trim().toUpperCase();
    else if(k==='bs')V.bas[i].s=v.trim();else if(k==='bi')V.bas[i].i=v.trim();else if(k==='bd')V.bas[i].d=v.trim();
    else if(k==='jr')V.jun[i].ref=v.trim().toUpperCase();else if(k==='jd')V.jun[i].dx=v.trim();else if(k==='sc')V.sec[i]=v;else return false},'Viga')}
/** botones de la vista (data-kva); devuelve true si lo atendió */
function kvClick(e){const b=e.target.closest('[data-kva],[data-kvs]');if(!b)return false;const pid=U.piso;
  if(b.dataset.kvs!=null){const[k,i]=b.dataset.kvs.split(':');MET.vsel={k,i:+i};if(k==='vano')MET.cut=2*(+i)+1;if(k==='apoyo')MET.cut=2*(+i);requestRender();return true}
  const a=b.dataset.kva,i=+(b.dataset.i||0);
  if(a==='pick'){MET.vid=b.dataset.id;MET.vsel=null;MET.cut=1;requestRender();return true}
  if(a==='tab'){U.kmVt=b.dataset.t;saveUI();requestRender();return true}
  if(a==='mode'){U.kvMode=kvFicha()?'dib':'ficha';MET.vsel=null;saveUI();requestRender();return true}
  if(a==='cutp'||a==='cutn'){const V=kvSel(pid);if(!V)return true;const n=2*V.ejes.length-1;MET.cut=((MET.cut||0)+(a==='cutp'?-1:1)+n)%n;requestRender();return true}
  if(a==='cutv'){MET.cut=2*i+1;requestRender();return true}if(a==='cuta'){MET.cut=2*i;requestRender();return true}
  if(a==='close'){MET.vsel=null;requestRender();return true}
  if(!csEd())return true;const C=kmCtx(pid);
  if(a==='new'){const L=kvVigas(pid).slice();const V=kvNueva(C,L.length+1);L.push(V);MET.vid=V.id;MET.vsel=null;MET.cut=1;kmPut('v_'+pid,{L},'Nueva viga');requestRender();return true}
  if(a==='dup'){const V0=kvSel(pid);if(!V0)return true;const L=kvVigas(pid).slice();const V=JSON.parse(JSON.stringify(V0));V.id=uid('kv');V.cod=(V.cod||'Viga')+' (copia)';V.rep='';L.splice(L.indexOf(V0)+1,0,V);MET.vid=V.id;kmPut('v_'+pid,{L},'Duplicar viga');requestRender();return true}
  if(a==='del'){const V0=kvSel(pid);if(!V0)return true;kmPut('v_'+pid,{L:kvVigas(pid).filter(v=>v.id!==V0.id)},'Eliminar viga '+(V0.cod||''));MET.vid=null;requestRender();toast(`Viga ${V0.cod||''} eliminada`,'Deshacer',kmUndo);return true}
  const nextCode=V=>{const codes=C.secs.map(x=>String(x.code||''));const lastC=V.sec[V.sec.length-1];const j=codes.indexOf(lastC);return codes[j+1]||codes.find(c=>!V.sec.includes(c))||('S'+(V.sec.length+1))};
  kvSet(V=>{switch(a){
    case'addSup':V.corr.push({p:'sup',s:'2Ø5/8',de:V.ejes[0].n,a:V.ejes[V.ejes.length-1].n});break;
    case'addInf':V.corr.push({p:'inf',s:'2Ø5/8',de:V.ejes[0].n,a:V.ejes[V.ejes.length-1].n});break;
    case'delCorr':V.corr.splice(i,1);MET.vsel=null;break;
    case'pSup':V.corr[i].p='sup';break;case'pInf':V.corr[i].p='inf';break;
    case'addBas':V.bas.push({ap:V.ejes[i].n,p:'sup',s:'2Ø5/8',i:'1.50',d:'1.50'});break;
    case'delBas':V.bas.splice(i,1);break;
    case'addJun':{const G=kvGeo(V);if(!G.T.length)return false;const J=kvJoints(V,G);const free=G.T.filter(t=>!J.some(j=>j.x>=t.a-0.01&&j.x<=t.b+0.01));const t=(free.length?free:G.T).reduce((x,y)=>y.L>x.L?y:x);const e=G.E[t.i];V.jun.push({ref:e.n,dx:(e.w/2+t.L/2).toFixed(2)});V.sec.push(nextCode(V));break}
    case'delJun':{const G=kvGeo(V);const J=kvJoints(V,G);const k=J.findIndex(x=>x.i===i);V.jun.splice(i,1);if(V.sec.length>1)V.sec.splice(Math.max(1,k+1),1);MET.vsel=null;break}
    case'addVano':kvInsSpan(V,V.ejes.length-1);break;case'insVano':kvInsSpan(V,i);break;case'delVano':return kvDelSpan(V,i);
    case'd38':V.estD='3/8';break;case'd12':V.estD='1/2';break;case'lm':V.lmax=b.dataset.v;break;case'autoE':V.ea='';V.eb='';break;
    default:return false}},'Viga');return true}
/** arrastrar una junta: se mueve en pantalla y al soltar se guarda (eje a la izquierda + distancia) */
function kvDown(e){const h=e.target.closest('[data-kvj]');if(!h||!csEd())return;const box=h.closest('[data-kvel]');if(!box||!KV.map)return;e.preventDefault();const i=+h.dataset.kvj;
  const V=kvSel(U.piso);if(!V)return;const G=kvGeo(V);KV.drag={i,box,G,x:null};try{h.setPointerCapture(e.pointerId)}catch(_){}
  const mv=ev=>{const d=KV.drag;if(!d)return;const r=d.box.getBoundingClientRect();let m=KV.map.inv(ev.clientX-r.left);m=Math.max(d.G.x0+0.1,Math.min(d.G.x1-0.1,m));d.x=Math.round(m*20)/20;
    const px=Math.round(KV.map.px(d.x));d.box.querySelectorAll(`[data-kvjl="${i}"],[data-kvjc="${i}"]`).forEach(n=>{n.style.left=px+'px'});
    let ax=d.G.E[0];for(const a of d.G.E)if(a.x<=d.x)ax=a;const lab=d.box.querySelector(`[data-kvjt="${i}"]`);if(lab)lab.textContent=`${ax.n} ${d.x-ax.x>=0?'+':'−'}${kmF(Math.abs(d.x-ax.x),2)}`};
  const up=()=>{h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);const d=KV.drag;KV.drag=null;if(!d||d.x==null)return;
    let ax=d.G.E[0];for(const a of d.G.E)if(a.x<=d.x)ax=a;kvSet(W=>{W.jun[i].ref=ax.n;W.jun[i].dx=(Math.round((d.x-ax.x)*100)/100).toFixed(2)},'Mover junta')};
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)}
async function kvCopyNext(pid,nx){const L=kvVigas(pid);if(!L.length){toast('Este nivel no tiene vigas.');return}const has=kvVigas(nx.id).length;
  if(!(await uiAsk({title:`¿Copiar ${L.length} viga${L.length>1?'s':''} a ${csPisoTag(nx,'E')||nx.name}?`,text:has?`Ese nivel ya tiene ${has} viga${has>1?'s':''}: se reemplazan.`:'Se copian con los mismos códigos de sector.',ok:'Copiar',tone:has?'warn':'info'})))return;
  kmPut('v_'+nx.id,{L:L.map(v=>({...JSON.parse(JSON.stringify(v)),id:uid('kv')}))},'Copiar vigas al nivel '+(csPisoTag(nx,'E')||''));toast('Vigas copiadas','Ir al nivel',()=>{U.piso=nx.id;saveUI();requestRender()})}
function kvXlsSheet(X,wb,pid,P,C){const L=kvVigas(pid);if(!L.length)return;const rows=[['Viga','Veces','Elemento','Detalle','Cant.','Ø','Long. por barra (m)','kg (todas las veces)','Sectores']];
  for(const V of L){const R=kvCalc(V,P,kvRank(C));const ve=kvRep(V.rep);for(const it of R.items)rows.push([V.cod||'',ve,it.tipo,it.desc,it.n*ve,kvDN(it.d),r2(it.lu),Math.round(it.kg*ve),Object.entries(it.sec).map(([s,v])=>`${s}: ${Math.round(v*ve)}`).join(' · ')]);
    for(const o of R.vanos)rows.push([V.cod||'',ve,'Concreto y encofrado',`vano ${o.desc}`,'','',r2(o.L),'',`${r2(o.conc*ve)} m³ · ${r2((o.ef1+o.ef2)*ve)} m²`])}
  X.utils.book_append_sheet(wb,kmSheet(X,rows,[10,7,22,26,8,7,14,14,40]),'Vigas')}

/* ---------- dibujo ---------- */
/** posición en pantalla: a escala, cada vano con un ancho mínimo para poder escribir en él */
function kvLayout(G,W0,minSpan){const L=Math.max(1,G.x1-G.x0);const sx=Math.max(20,(W0-150)/L);const segs=[];
  G.E.forEach((e,i)=>{segs.push([e.x-e.w/2,e.x+e.w/2,Math.max(e.w*sx,18)]);if(i<G.T.length){const t=G.T[i];segs.push([t.a,t.b,Math.max(t.L*sx,minSpan)])}});
  let p=64;const sp=segs.map(s=>{const o={m0:s[0],m1:s[1],p0:p,p1:p+s[2]};p+=s[2];return o});
  const px=x=>{if(x<=sp[0].m0)return sp[0].p0-(sp[0].m0-x)*sx;for(const s of sp)if(x<=s.m1+1e-9)return s.m1>s.m0?s.p0+(x-s.m0)/(s.m1-s.m0)*(s.p1-s.p0):s.p0;const l=sp[sp.length-1];return l.p1+(x-l.m1)*sx};
  const inv=q=>{if(q<=sp[0].p0)return sp[0].m0-(sp[0].p0-q)/sx;for(const s of sp)if(q<=s.p1)return s.m0+(q-s.p0)/Math.max(1,s.p1-s.p0)*(s.m1-s.m0);const l=sp[sp.length-1];return l.m1+(q-l.p1)/sx};
  return{px,inv,W:Math.round(p+90)}}
function kvHtml(p,ed){const P=kmP();const C=kmCtx(p.id);const L=kvVigas(p.id);const V=kvSel(p.id);const fi=kvFicha();const dis=ed?'':' disabled';
  const bar=`<div class="kmbar">${ed?`<button type="button" class="ib" data-kva="new">+ Viga</button>`:''}<button type="button" class="ib" data-km="xls">Exportar Excel</button>${ed?`<button type="button" class="ib" data-km="copy">Copiar vigas al nivel siguiente</button><button type="button" class="ib pri" data-km="apply">Aplicar a los sectores</button>`:''}</div>`;
  const nivel={};const lst=L.map(w=>{const r=kvCalc(w,P,kvRank(C));const ve=kvRep(w.rep);let kg=0;for(const n of r.names){const v=((r.S[n]||{}).kg||0)*ve;kg+=v;nivel[n]=(nivel[n]||0)+v}
    return`<button type="button" class="kvli${V&&w.id===V.id?' on':''}" data-kva="pick" data-id="${esc(w.id)}"><span><b>${esc(w.cod||'Viga')}</b>${ve>1?` <i>×${ve}</i>`:''}</span><span class="mono">${kmF(kg,0)} kg</span><small>${esc(w.b)}×${esc(w.h)}</small></button>`}).join('');
  const colOf=code=>{const id=C.secByCode(code);return id?kmSecCol(C.secs,id):'var(--muted)'};
  /* por sector y, con dos o más frentes, con el subtotal de cada frente (el orden de vaciado ya los deja juntos) */
  const nk=Object.keys(nivel).sort((a,b)=>kvRank(C)(a)-kvRank(C)(b));const fid=n=>(C.frOf(n)||{}).id||'';let nivelH='',fPrev=null;
  for(const n of nk){if(C.nFr>1&&fid(n)!==fPrev){fPrev=fid(n);const f=C.frOf(n);const t=nk.filter(m=>fid(m)===fPrev).reduce((s,m)=>s+nivel[m],0);
      nivelH+=`<li class="kvfr"><span><i class="csdot" style="--c:${esc((f&&f.color)||'#888')}"></i> ${esc(f?f.name:'Sin frente')}</span><span class="mono">${kmF(t,0)} kg</span></li>`}
    nivelH+=`<li><b style="color:${colOf(n)}">${esc(n)}</b><span class="mono">${kmF(nivel[n],0)} kg</span></li>`}
  const nEl=kmRows(p.id).filter(r=>(kmTipo(r.t)||{}).cl==='vig').length;
  if(!V)return`${bar}<div class="card"><div class="pad"><p>Este nivel aún no tiene vigas. Cada viga se arma como en la elevación del plano: ejes, barras corridas, bastones, estribos y juntas de sector.</p>${ed?'<button type="button" class="ib pri" data-kva="new">+ Primera viga</button>':''}</div></div>`;
  const R=kvCalc(V,P,kvRank(C));const G=R.G;const ve=kvRep(V.rep);
  const aside=`<aside class="kvas"><section class="card"><div class="kmh"><b>Vigas</b><span class="mu">del nivel</span></div><div class="kvl">${lst}</div>${ed?`<div class="kmadd"><button type="button" class="ib" data-kva="new">+ Viga</button><button type="button" class="ib" data-kva="dup">Duplicar</button><button type="button" class="ib" data-kva="del">Eliminar</button></div>`:''}</section>
    ${kvSecHtml(V,R,G)}<section class="card"><div class="kmh"><b>Nivel</b><span class="mu">acero de vigas por sector</span></div><ul class="kvniv">${nivelH}</ul>${nEl?`<p class="kmw pad" style="margin:0">Elementos también tiene ${nEl} fila${nEl>1?'s':''} de vigas en este nivel: al aplicar se suman las dos.</p>`:''}</section></aside>`;
  const F2=(k,l,w,ph)=>`<label class="kvf">${l}<input class="ci${k==='cod'||k==='rep'?'':' num'}" style="width:${w}px" data-kv="${k}" data-kk="kv|${k}" value="${esc(V[k]??'')}"${ph?` placeholder="${esc(ph)}"`:''}${dis}></label>`;
  const ED=R.ED;const segB=(a,on,l,extra)=>`<button type="button" class="${on?'on':''}" data-kva="${a}"${extra||''}${dis}>${l}</button>`;
  const datos=`<section class="card"><div class="kvdat">${F2('cod','Viga',90)}<label class="kvf">Sección b × h (m)<span class="kvrow"><input class="ci num" style="width:56px" data-kv="b" data-kk="kv|b" value="${esc(V.b)}" aria-label="Ancho b"${dis}> × <input class="ci num" style="width:56px" data-kv="h" data-kk="kv|h" value="${esc(V.h)}" aria-label="Peralte h"${dis}></span></label>
    ${F2('losa','Losa',56)}${F2('rec','Recub.',56)}<label class="kvf">Ejes: distancias entre ejes<input class="ci mono" style="width:220px" data-kv="ejes" data-kk="kv|ejes" value="${esc(kvEjesTxt(V.ejes))}" title="p. ej. 4 + 8.25×3 + 4 (Enter)"${dis}></label>
    ${F2('rep','Se repite en ejes',120,'9, 10, 11')}<span class="mu kvve">${ve>1?`× ${ve} vigas iguales`:'una sola viga'}</span><span class="kvbr"></span>
    <span class="kvf">Estribo Ø<span class="seg">${segB('d38',V.estD!=='1/2','3/8"')}${segB('d12',V.estD==='1/2','1/2"')}</span></span>
    <label class="kvf">Estribo a × b (m) · vacío = auto<span class="kvrow"><input class="ci num" style="width:56px" data-kv="ea" data-kk="kv|ea" value="${esc(V.ea||'')}" placeholder="${kmF(ED.aA,2)}" aria-label="Estribo a"${dis}> × <input class="ci num" style="width:56px" data-kv="eb" data-kk="kv|eb" value="${esc(V.eb||'')}" placeholder="${kmF(ED.bA,2)}" aria-label="Estribo b"${dis}></span></label>
    ${F2('estN','Estribos por posición',56)}${F2('adic','Adicionales por nudo',56)}<span class="kvf">Varilla<span class="seg">${segB('lm',(kvN(V.lmax)||P.lv)!==9,'12 m',' data-v="12"')}${segB('lm',(kvN(V.lmax)||P.lv)===9,'9 m',' data-v="9"')}</span></span>
    <span class="kvf">Edición<button type="button" class="ib" data-kva="mode" title="Escribir sobre el dibujo o tocar y editar en una ficha (tablet)">${fi?'✎ Ficha (tablet)':'✎ Sobre el dibujo'}</button></span></div></section>`;
  const W0=Math.max(720,(window.innerWidth||1300)-(window.innerWidth>1100?400:80));const M=kvLayout(G,W0,fi?150:178);KV.map=M;const px=x=>Math.round(M.px(x));
  const sup=V.corr.map((c,i)=>({c,i})).filter(o=>o.c.p==='sup'),inf=V.corr.map((c,i)=>({c,i})).filter(o=>o.c.p!=='sup');
  const LH=fi?40:36,yJ=30,yAx=fi?68:58,yS=fi?108:96;const yBas=yS+Math.max(1,sup.length)*LH+4;const yBeam=yBas+(fi?62:52);const BH=58;const yU=yBeam+BH+12;const yEs=yU+36;const yI=yEs+40;const H=yI+Math.max(1,inf.length)*LH+14;
  const sel=MET.vsel||{};const isS=(k,i)=>sel.k===k&&sel.i===i;let h='';const I=(f,v,st,lab,ex)=>`<input class="ci${ex||''}" style="${st}" data-kv="${f}" data-kk="kv|${f}" value="${esc(v??'')}" aria-label="${esc(lab)}" title="${esc(lab)}"${dis}>`;
  const bnd=[G.x0,...R.J.map(j=>j.x),G.x1];
  /* juntas y ejes (detrás) */
  const jfr=R.J.map((_,k)=>kvFrJ(C,R,k));const jtip=k=>{const z=jfr[k];return z?` title="${esc(`Junta entre frentes: ${z.a.name} | ${z.b.name}. El traslape va a ${z.first} (su frente va primero en Sectorización).`)}"`:''};
  R.J.forEach((j,k)=>{h+=`<div class="kvjl${jfr[k]?' fr':''}" data-kvjl="${j.i}" style="left:${px(j.x)}px;height:${H}px"></div>`});
  G.E.forEach(e=>{h+=`<div class="kvax" style="left:${px(e.x)}px;top:${yAx}px;height:${H-yAx}px"></div>`});
  /* bandas de sector */
  R.names.forEach((n,k)=>{const l=px(bnd[k]),w=Math.max(2,px(bnd[k+1])-l);const c=colOf(n);const kg=kmF(((R.S[n]||{}).kg||0)*ve,0);const fn=kvFrName(C,n);const tip=esc(n+(fn?' · '+fn:'')+' · '+kg+' kg');
    const narrow=w<96;h+=fi?`<button type="button" class="kvband${isS('band',k)?' on':''}" data-kvs="band:${k}" title="${tip}" style="left:${l}px;width:${w}px;--kc:${c}">${w<40?'':esc(n)+(narrow?'':` · ${kg} kg`)}</button>`
      :`<div class="kvband" title="${tip}" style="left:${l}px;width:${w}px;--kc:${c}">${w<56?'':`<select class="ci" data-kv="sc:${k}" data-kk="kv|sc:${k}" aria-label="Sector"${dis}>${kvSecOpts(C,n)}</select>${narrow?'':` ${kg} kg`}${C.secByCode(n)?'':' <span class="kmw">no existe</span>'}`}</div>`});
  R.J.forEach((j,k)=>{const v=V.jun[j.i];const lab=`${v.ref} ${kvN(v.dx)>=0?'+':'−'}${kmF(Math.abs(kvN(v.dx)),2)}`;
    h+=`<div class="kvjc${isS('jun',j.i)?' on':''}${jfr[k]?' fr':''}" data-kvjc="${j.i}" style="left:${px(j.x)}px;top:${yJ}px"${jtip(k)}>${ed?`<span class="kvgrip" data-kvj="${j.i}" title="Arrastra para mover la junta">⇔</span>`:''}${fi||!ed?`<button type="button" data-kvs="jun:${j.i}" data-kvjt="${j.i}">${esc(lab)}</button>`:`${I(`jr:${j.i}`,v.ref,'width:30px;text-align:center','Eje de referencia')}${I(`jd:${j.i}`,v.dx,'width:52px','Distancia al eje (m)',' num')}<button type="button" class="kx" data-kva="delJun" data-i="${j.i}" aria-label="Quitar junta">×</button>`}</div>`});
  G.E.forEach((e,i)=>{h+=fi||!ed?`<button type="button" class="kvbub${isS('apoyo',i)?' on':''}" data-kvs="apoyo:${i}" style="left:${px(e.x)}px;top:${yAx}px">${esc(e.n)}</button>`:`<input class="ci kvbub" data-kv="en:${i}" data-kk="kv|en:${i}" value="${esc(e.n)}" aria-label="Nombre del eje" style="left:${px(e.x)}px;top:${yAx}px"${dis}>`});
  /* corridos */
  const lane=(o,k,y0,isInf)=>{const c=o.c,i=o.i;const ia=G.E.findIndex(e=>e.n===c.de),ib=G.E.findIndex(e=>e.n===c.a);const ok=ia>=0&&ib>ia;const a=ok?px(G.E[ia].x):px(G.x0),b=ok?px(G.E[ib].x):px(G.x1);const sp=kmSpec(c.s);
    const d=sp&&!sp.err&&sp.length?sp[sp.length-1].d:'';const cls=ok&&sp&&!sp.err?kvDC(d):'bad';const y=y0+k*LH;const cw=fi?150:200;const cl=Math.max(60,Math.round((a+b)/2-cw/2));
    h+=`<div class="kvbar ${cls}" style="left:${a}px;width:${Math.max(4,b-a)}px;top:${y+(isInf?3:26)}px"></div>`;
    h+=fi||!ed?`<button type="button" class="kvtag ${cls}${isS('corr',i)?' on':''}" data-kvs="corr:${i}" style="left:${cl}px;top:${y+(isInf?8:0)}px">${esc(c.s)} · ${esc(c.de)}–${esc(c.a)}</button>`
      :`<div class="kvchip ${cls}" style="left:${cl}px;top:${y+(isInf?8:0)}px;width:${cw}px">${I(`cde:${i}`,c.de,'width:34px;text-align:center','Desde el eje')}${I(`cs:${i}`,c.s,'flex:1;font-weight:600','Barras (p. ej. 5Ø3/4)')}${I(`ca:${i}`,c.a,'width:34px;text-align:center','Hasta el eje')}<button type="button" class="kx" data-kva="delCorr" data-i="${i}" aria-label="Quitar">×</button></div>`};
  h+=`<span class="kvgl" style="top:${yS}px">Sup.</span>`+(ed?`<button type="button" class="kvplus" data-kva="addSup" title="Agregar barras corridas superiores" aria-label="Agregar corrido superior" style="left:30px;top:${yS+Math.max(1,sup.length)*LH-LH+18}px">+</button>`:'');
  sup.forEach((o,k)=>lane(o,k,yS,false));
  /* bastones */
  const last=G.E.length-1;h+=`<span class="kvgl" style="top:${yBas}px">Bast.</span>`;
  G.E.forEach((e,k)=>{const j=V.bas.findIndex(b=>b.ap===e.n);if(j<0){if(ed)h+=`<button type="button" class="kvplus" data-kva="addBas" data-i="${k}" title="Agregar bastón en este apoyo" aria-label="Agregar bastón" style="left:${px(e.x)-13}px;top:${yBas+12}px">+</button>`;return}
    const b=V.bas[j];const a=k===0?G.x0+kvN(V.rec):e.x-e.w/2-kvN(b.i),z=k===last?G.x1-kvN(V.rec):e.x+e.w/2+kvN(b.d);const l=px(a),r=px(z);const sp=kmSpec(b.s);const cls=sp&&!sp.err&&sp.length?kvDC(sp[sp.length-1].d):'bad';
    h+=`<div class="kvbar ${cls}" style="left:${l}px;width:${Math.max(4,r-l)}px;top:${yBas+38}px"></div>`;
    if(fi||!ed)h+=`<button type="button" class="kvtag ${cls}${isS('apoyo',k)?' on':''}" data-kvs="apoyo:${k}" style="left:${px(e.x)}px;top:${yBas}px;transform:translateX(-50%)">${esc(b.s)}  ${k===0?'⌐':kmF(kvN(b.i),2)}|${k===last?'¬':kmF(kvN(b.d),2)}</button>`;
    else{h+=`<div class="kvchip ${cls}" style="left:${px(e.x)-38}px;top:${yBas}px;width:76px">${I(`bs:${j}`,b.s,'width:48px;font-weight:600','Barras del bastón')}<button type="button" class="kx" data-kva="delBas" data-i="${j}" aria-label="Quitar bastón">×</button></div>`;
      if(k!==0)h+=I(`bi:${j}`,b.i,`position:absolute;width:46px;height:22px;left:${l-2}px;top:${yBas+28}px`,'Largo a la izquierda desde la cara (m)',' num');
      if(k!==last)h+=I(`bd:${j}`,b.d,`position:absolute;width:46px;height:22px;left:${r-46}px;top:${yBas+28}px`,'Largo a la derecha desde la cara (m)',' num')}});
  /* cuerpo de la viga */
  h+=`<div class="kvbeam" style="left:${px(G.x0)}px;width:${px(G.x1)-px(G.x0)}px;top:${yBeam}px;height:${BH}px"></div>`;
  G.T.forEach((t,i)=>{h+=`<button type="button" class="kvspan${isS('vano',i)?' on':''}" ${fi?`data-kvs="vano:${i}"`:`data-kva="cutv" data-i="${i}"`} aria-label="Vano ${esc(G.E[i].n)}–${esc(G.E[i+1].n)}" style="left:${px(t.a)}px;width:${px(t.b)-px(t.a)}px;top:${yBeam}px;height:${BH}px"></button>`;
    for(const x of kvEstPos(t.a,t.L,kmDist(t.est)))h+=`<i class="kvtk" style="left:${px(x)}px;top:${yBeam+6}px;height:${BH-26}px"></i>`});
  if(kvN(V.adic)>0)G.E.forEach(e=>{h+=`<i class="kvtk ad" style="left:${px(e.x)}px;top:${yBeam+6}px;height:${BH-26}px"></i>`});
  G.E.forEach((e,i)=>{h+=`<button type="button" class="kvsup${isS('apoyo',i)?' on':''}" ${fi?`data-kvs="apoyo:${i}"`:`data-kva="cuta" data-i="${i}"`} aria-label="Apoyo ${esc(e.n)}" style="left:${px(e.x-e.w/2)}px;width:${Math.max(8,px(e.x+e.w/2)-px(e.x-e.w/2))}px;top:${yBeam-10}px;height:${BH+20}px"></button>`});
  G.T.forEach(t=>{h+=`<span class="kvluz" style="left:${px((t.a+t.b)/2)}px;top:${yBeam+BH-19}px">luz ${kmF(t.L,2)}</span>`});
  /* corte */
  const nCut=2*G.E.length-1;const ci=Math.min(Math.max(0,MET.cut??1),nCut-1);const cx=ci%2===0?G.E[ci/2].x:(G.T[(ci-1)/2].a+G.T[(ci-1)/2].b)/2;
  h+=`<div class="kvcut" style="left:${px(cx)}px;top:${yBeam-6}px;height:${BH+12}px"></div><span class="kvcutl" style="left:${px(cx)}px;top:${yBeam+3}px">corte</span>`;
  if(ed)h+=`<button type="button" class="ib" data-kva="addVano" style="position:absolute;left:${M.W-70}px;top:${yBeam+14}px">+ Vano</button>`;
  /* distancias, anchos y estribos */
  h+=`<span class="kvgl" style="top:${yU}px">e–e</span><span class="kvgl" style="top:${yEs}px">Estr.</span>`;
  G.T.forEach((t,i)=>{const c=px((t.a+t.b)/2),l=px(t.a),w=px(t.b)-l;
    if(fi||!ed){h+=`<button type="button" class="kvtx" data-kvs="vano:${i}" style="left:${c}px;top:${yU}px;transform:translateX(-50%)">↔ ${esc(V.ejes[i].d)}</button><button type="button" class="kvtx kves" data-kvs="vano:${i}" style="left:${l}px;width:${w}px;top:${yEs}px">${esc(t.est)}</button>`;return}
    h+=`<div class="kvee" style="left:${c}px;top:${yU}px">${I(`ed:${i}`,V.ejes[i].d,'width:62px','Distancia entre ejes (m)',' num')}<button type="button" class="kx" data-kva="insVano" data-i="${i}" title="Insertar un vano igual después" aria-label="Insertar vano">+</button>${G.T.length>1?`<button type="button" class="kx" data-kva="delVano" data-i="${i}" title="Quitar este vano" aria-label="Quitar vano">×</button>`:''}</div>`;
    h+=I(`es:${i}`,t.est,`position:absolute;left:${l+3}px;width:${w-6}px;top:${yEs}px`,'Estribos del vano (desde cada extremo)',' mono kvesi')});
  if(!fi&&ed)G.E.forEach((e,i)=>{h+=I(`ew:${i}`,V.ejes[i].w,`position:absolute;width:44px;left:${px(e.x)-22}px;top:${yU}px`,'Ancho del apoyo (m)',' num')});
  /* corridos inferiores */
  h+=`<span class="kvgl" style="top:${yI+10}px">Inf.</span>`+(ed?`<button type="button" class="kvplus" data-kva="addInf" title="Agregar barras corridas inferiores" aria-label="Agregar corrido inferior" style="left:30px;top:${yI+24}px">+</button>`:'');
  inf.forEach((o,k)=>lane(o,k,yI,true));
  const elev=`<section class="card"><div class="kmh"><b>${esc(V.cod||'Viga')}</b><span class="mu">${fi?'toca un elemento para editarlo':'escribe directo sobre el dibujo'}${ed?' · arrastra ⇔ para mover una junta':''}</span><span style="flex:1"></span>${ed?'<button type="button" class="ib" data-kva="addJun">+ Junta de sector</button>':''}</div>
    <div class="kvsc"><div class="kvel${fi?' fi':''}" data-kvel="1" style="width:${M.W}px;height:${H}px">${h}</div></div>${R.warn.length?`<div class="callout warnc kvwarn">${R.warn.map(esc).join('<br>')}</div>`:''}</section>`;
  return`${bar}<div class="kvg">${aside}<div class="kvmain">${datos}${elev}${fi&&MET.vsel?kvFichaHtml(V,G,ed):''}${kvTabsHtml(V,R,ve,C)}</div></div>`}

/** ficha del elemento tocado (modo tablet) */
function kvFichaHtml(V,G,ed){const s=MET.vsel;const dis=ed?'':' disabled';const I=(f,v,w,lab,ex)=>`<label class="kvf">${esc(lab)}<input class="ci${ex||''}" style="width:${w}" data-kv="${f}" data-kk="kv|${f}" value="${esc(v??'')}"${dis}></label>`;
  const btn=(a,l,i,cls)=>ed?`<button type="button" class="ib${cls?' '+cls:''}" data-kva="${a}"${i!=null?` data-i="${i}"`:''}>${l}</button>`:'';let t='',b='';const last=G.E.length-1;
  if(s.k==='vano'&&G.T[s.i]){t=`Vano ${G.E[s.i].n}–${G.E[s.i+1].n} · luz ${kmF(G.T[s.i].L,2)} m`;b=I(`ed:${s.i}`,V.ejes[s.i].d,'110px','Distancia entre ejes (m)',' num')+I(`es:${s.i}`,(V.tramos[s.i]||{}).est,'min(420px,60vw)','Estribos del vano (desde cada extremo)',' mono')+btn('insVano','Insertar vano igual después',s.i)+(G.T.length>1?btn('delVano','Quitar vano',s.i,'danger'):'')}
  else if(s.k==='apoyo'&&G.E[s.i]){const e=G.E[s.i];const j=V.bas.findIndex(x=>x.ap===e.n);t=`Apoyo ${e.n}`;b=I(`en:${s.i}`,e.n,'70px','Eje')+I(`ew:${s.i}`,V.ejes[s.i].w,'90px','Ancho del apoyo (m)',' num');
    if(j>=0){const x=V.bas[j];b+=I(`bs:${j}`,x.s,'120px','Bastón superior')+(s.i!==0?I(`bi:${j}`,x.i,'90px','Izq. desde la cara (m)',' num'):'')+(s.i!==last?I(`bd:${j}`,x.d,'90px','Der. desde la cara (m)',' num'):'')+((s.i===0||s.i===last)?'<span class="mu">en el extremo se ancla con gancho</span>':'')+btn('delBas','Quitar bastón',j,'danger')}
    else b+=btn('addBas','+ Bastón en este apoyo',s.i)}
  else if(s.k==='corr'&&V.corr[s.i]){const c=V.corr[s.i];t='Barras corridas';b=`<span class="kvf">Posición<span class="seg"><button type="button" class="${c.p==='sup'?'on':''}" data-kva="pSup" data-i="${s.i}"${dis}>Superior</button><button type="button" class="${c.p!=='sup'?'on':''}" data-kva="pInf" data-i="${s.i}"${dis}>Inferior</button></span></span>`+I(`cs:${s.i}`,c.s,'150px','Barras')+I(`cde:${s.i}`,c.de,'70px','Desde el eje')+I(`ca:${s.i}`,c.a,'70px','Hasta el eje')+btn('delCorr','Quitar',s.i,'danger')}
  else if(s.k==='jun'&&V.jun[s.i]){const j=V.jun[s.i];const C=kmCtx(U.piso),R=kvCalc(V,kmP(),kvRank(C));const z=kvFrJ(C,R,R.J.findIndex(x=>x.i===s.i));t=z?`Junta entre frentes · el traslape va a ${z.first}`:'Junta de sector';b=I(`jr:${s.i}`,j.ref,'70px','Desde el eje')+I(`jd:${s.i}`,j.dx,'110px','Distancia (m, + derecha · − izquierda)',' num')+btn('delJun','Quitar junta',s.i,'danger')}
  else if(s.k==='band'&&V.sec[s.i]!=null){const C=kmCtx(U.piso);t='Sector';b=`<label class="kvf">Sector del nivel<select class="ci" data-kv="sc:${s.i}" data-kk="kv|sc:${s.i}"${dis}>${kvSecOpts(C,V.sec[s.i])}</select></label>`}
  else return'';
  return`<section class="card kvficha"><div class="kmh"><b>${esc(t)}</b><span style="flex:1"></span><button type="button" class="ib" data-kva="close">Listo</button></div><div class="kvdat">${b}</div></section>`}

/** sección de la viga en el corte elegido (apoyo o centro de vano) */
function kvSecHtml(V,R,G){if(G.E.length<2)return'';const nCut=2*G.E.length-1;const ci=Math.min(Math.max(0,MET.cut??1),nCut-1);const isA=ci%2===0;const k=Math.floor(ci/2);
  const x=isA?G.E[k].x:(G.T[k].a+G.T[k].b)/2;const lab=isA?`Apoyo ${G.E[k].n}`:`Vano ${G.E[k].n}–${G.E[k+1].n}`;
  const BX=200;const b=kvN(V.b)||0.3,hh=kvN(V.h)||0.5,lo=Math.min(kvN(V.losa),hh),rec=kvN(V.rec)||0.04;const sc=Math.min(150/Math.max(b,hh),120/hh);const W=b*sc,H=hh*sc,X0=(BX-W)/2,Y0=(BX-H)/2+6;let s='';
  const rect=(x0,y0,w,h,c,rx)=>{s+=`<rect x="${x0.toFixed(1)}" y="${y0.toFixed(1)}" width="${Math.max(0,w).toFixed(1)}" height="${Math.max(0,h).toFixed(1)}" class="${c}"${rx?` rx="${rx}"`:''}/>`};
  if(lo>0)rect(6,Y0,BX-12,lo*sc,'kl2');rect(X0,Y0,W,H,'kc');
  const ED=R.ED,per=ED.per;for(let i=0;i<per;i++){const xx=per===1?(b-ED.a)/2:rec+(b-2*rec-ED.a)*i/(per-1);rect(X0+xx*sc,Y0+rec*sc,ED.a*sc,ED.b*sc,'ke',3)}
  const DMM={'6mm':6,'1/4':6.4,'8mm':8,'3/8':9.5,'12mm':12,'1/2':12.7,'5/8':15.9,'3/4':19.1,'1':25.4,'1 3/8':34.9};const A={top:[],bot:[]};for(const q of R.bars)if(x>=q.a-1e-6&&x<=q.b+1e-6)(q.p==='sup'?A.top:A.bot).push(q);
  const row=(Lb,y)=>{const all=[];for(const g of Lb)for(let i=0;i<g.n;i++)all.push(g);const n=all.length;const a=X0+(rec+0.012)*sc+5,z=X0+W-(rec+0.012)*sc-5;
    all.forEach((g,i)=>{const r=Math.max(3,(DMM[g.d]||16)/1000*sc*0.75);const cx=n===1?(a+z)/2:a+(z-a)*i/(n-1);s+=`<circle cx="${cx.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="kvb ${kvDC(g.d)}${g.bas?' o':''}"/>`})};
  row(A.top,Y0+(rec+0.02)*sc+3);row(A.bot,Y0+H-(rec+0.02)*sc-3);
  const txt=Lb=>{const m={};for(const g of Lb){const k2=g.d+(g.bas?'|b':'');m[k2]=(m[k2]||0)+g.n}return Object.entries(m).map(([k2,n])=>`${n}Ø${kvDN(k2.split('|')[0])}${k2.endsWith('|b')?' bastón':''}`).join(' + ')||'—'};
  return`<section class="card kvsec"><div class="kmh"><b>Sección</b><span class="mu">${isA?'sobre el apoyo':'centro del vano'}</span></div>
    <div class="kvsecn"><button type="button" class="ib" data-kva="cutp" aria-label="Corte anterior">‹</button><b>${esc(lab)}</b><button type="button" class="ib" data-kva="cutn" aria-label="Corte siguiente">›</button></div>
    <svg class="kmsv kvsv" viewBox="0 0 200 200" role="img" aria-label="Sección ${esc(lab)}">${s}</svg>
    <div class="kvsect"><div><span class="mu">Sup.</span> <b>${esc(txt(A.top))}</b></div><div><span class="mu">Inf.</span> <b>${esc(txt(A.bot))}</b></div>
    <div><span class="mu">Estribos</span> ${per} □Ø${esc(kvDN(R.ed))} · ${kmF(ED.a,2)}×${kmF(ED.b,2)}${ED.manual?'':' (auto)'}</div><div class="mu">b ${kmF(b,2)} × h ${kmF(hh,2)}${lo>0?' · losa '+kmF(lo,2):''}</div>
    ${ED.fits?'':'<div class="kmw">El estribo escrito no cabe en la sección: borra a × b para calcularlo solo.</div>'}<div class="mu">Toca un vano o un apoyo en el dibujo para ver su corte.</div></div></section>`}

/** detalle del metrado en pestañas */
function kvTabsHtml(V,R,ve,C){const t=['res','ace','enc','con'].includes(U.kmVt)?U.kmVt:'res';const N=R.names;const col=n=>{const id=C.secByCode(n);return id?kmSecCol(C.secs,id):'var(--muted)'};
  const tabs=[['res','Resumen'],['ace','Acero'],['enc','Encofrado'],['con','Concreto']].map(([k,l])=>`<button type="button" class="${t===k?'on':''}" data-kva="tab" data-t="${k}" aria-pressed="${t===k}">${l}</button>`).join('');
  const sum=k=>N.reduce((a,n)=>a+((R.S[n]||{})[k]||0),0)*ve;const hs=N.map(n=>`<th class="n" style="color:${col(n)}">${esc(n)}</th>`).join('');let body='';
  /* con dos o más frentes en el nivel: columna Frente y aviso de las juntas entre frentes (el traslape va al frente que va primero) */
  const fc=C.nFr>1;const frj=R.J.map((_,k)=>kvFrJ(C,R,k)).filter(Boolean);
  const frN=frj.length?`<p class="kvnote mu">${frj.map(z=>`Junta entre frentes ${esc(z.a.name)} | ${esc(z.b.name)}: el traslape de las barras corridas va a ${esc(z.first)}, porque su frente va primero en Sectorización.`).join('<br>')}</p>`:'';
  if(t==='res'){const tk=sum('kg'),tc=sum('conc');
    body=`<div class="tscroll"><table class="t kmt"><thead><tr><th>Sector</th>${fc?'<th>Frente</th>':''}<th class="n">Acero kg</th><th class="n">Concreto m³</th><th class="n">Encofrado m²</th><th class="n">Cuantía kg/m³</th></tr></thead><tbody>
      ${N.map(n=>{const o=R.S[n]||{};return`<tr><td><b style="color:${col(n)}">${esc(n)}</b></td>${fc?`<td>${esc(kvFrName(C,n)||'—')}</td>`:''}<td class="n"><b>${kmF(o.kg*ve,0)}</b></td><td class="n">${kmF(o.conc*ve,2)}</td><td class="n">${kmF((o.ef1+o.ef2)*ve,1)}</td><td class="n">${o.conc>0?kmF(o.kg/o.conc,0):'—'}</td></tr>`}).join('')}</tbody>
      <tfoot><tr><td${fc?' colspan="2"':''}>Total</td><td class="n">${kmF(tk,0)}</td><td class="n">${kmF(tc,2)}</td><td class="n">${kmF(sum('ef1')+sum('ef2'),1)}</td><td class="n">${tc>0?kmF(tk/tc,0):'—'}</td></tr></tfoot></table></div>
      ${frN}
      <div class="kvnote"><span class="mu">Acero: corridos ${kmF(sum('corr'),0)} · bastones ${kmF(sum('bas'),0)} · estribos ${kmF(sum('est'),0)} · ganchos y traslapes ${kmF(sum('ext'),0)} kg${tk?` (${kmF(sum('ext')/tk*100,1)} %)`:''}</span><span style="flex:1"></span>
      ${KM_DIA.filter(([k])=>R.dia[k]>0).map(([k,l])=>`<span class="kvdia"><b class="${kvDC(k)}">Ø${esc(l)}</b> <span class="mono">${kmF(R.dia[k]*ve,0)} kg</span></span>`).join('')}</div>`}
  if(t==='ace')body=`<div class="tscroll"><table class="t kmt"><thead><tr><th>Elemento</th><th class="n">Cant.</th><th class="n">Ø</th><th class="n">Long. por barra m</th><th class="n">kg</th><th class="n" title="Ganchos, traslapes en juntas y empalmes incluidos">ganchos y trasl.</th>${hs}</tr></thead><tbody>
      ${R.items.map(it=>`<tr><td><b>${esc(it.tipo)}</b> <span class="mu">${esc(it.desc)}</span></td><td class="n">${kmF(it.n*ve,0)}</td><td class="n"><b class="${kvDC(it.d)}">${esc(kvDN(it.d))}</b></td><td class="n">${kmF(it.lu,2)}</td><td class="n"><b>${kmF(it.kg*ve,0)}</b></td><td class="n mu">${it.ext>0.5?kmF(it.ext*ve,0):''}</td>${N.map(n=>`<td class="n">${it.sec[n]?kmF(it.sec[n]*ve,0):'—'}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">Total acero de vigas</td><td class="n">${kmF(sum('kg'),0)}</td><td class="n">${kmF(sum('ext'),0)}</td>${N.map(n=>`<td class="n">${kmF(((R.S[n]||{}).kg||0)*ve,0)}</td>`).join('')}</tr></tfoot></table></div>
      <p class="kvnote mu">La longitud por barra incluye ganchos en los extremos, el traslape en cada junta de sector y los empalmes por varilla de ${kmF(kvN(V.lmax)||kmP().lv,0)} m.</p>`;
  if(t==='enc')body=`<div class="tscroll"><table class="t kmt"><thead><tr><th>Vano</th><th class="n">Luz m</th><th class="n">Fondo + 1.er costado</th><th class="n">2.º costado</th>${hs}</tr></thead><tbody>
      ${R.vanos.map(o=>`<tr><td><b>${esc(o.desc)}</b></td><td class="n">${kmF(o.L,2)}</td><td class="n">${kmF(o.ef1*ve,1)}</td><td class="n">${kmF(o.ef2*ve,1)}</td>${N.map(n=>`<td class="n">${o.se[n]?kmF(o.se[n]*ve,1):'—'}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">Total m²</td><td class="n">${kmF(sum('ef1'),1)}</td><td class="n">${kmF(sum('ef2'),1)}</td>${N.map(n=>{const o=R.S[n]||{};return`<td class="n">${kmF((o.ef1+o.ef2)*ve,1)}</td>`}).join('')}</tr></tfoot></table></div>
      <p class="kvnote mu">Fondo + 1.er costado y 2.º costado van a sus partidas del tren; los costados se miden con el peralte bajo la losa.</p>`;
  if(t==='con')body=`<div class="tscroll"><table class="t kmt"><thead><tr><th>Vano</th><th class="n">b × h bajo losa</th><th class="n">Luz m</th><th class="n">m³</th>${hs}</tr></thead><tbody>
      ${R.vanos.map(o=>`<tr><td><b>${esc(o.desc)}</b></td><td class="n">${kmF(kvN(V.b),2)} × ${kmF(R.hn,2)}</td><td class="n">${kmF(o.L,2)}</td><td class="n">${kmF(o.conc*ve,2)}</td>${N.map(n=>`<td class="n">${o.sc[n]?kmF(o.sc[n]*ve,2):'—'}</td>`).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3">Total m³</td><td class="n">${kmF(sum('conc'),2)}</td>${N.map(n=>`<td class="n">${kmF(((R.S[n]||{}).conc||0)*ve,2)}</td>`).join('')}</tr></tfoot></table></div>
      <p class="kvnote mu">Concreto de la viga bajo la losa, en la luz libre; el nudo y la losa se metran con sus elementos.</p>`;
  return`<section class="card kvtabs"><div class="kmh"><b>Metrado · ${esc(V.cod||'Viga')}</b><div class="seg kmseg" role="group" aria-label="Detalle del metrado">${tabs}</div><span class="mu">${ve>1?`× ${ve} vigas iguales`:'una sola viga'}</span></div>${body}</section>`}
