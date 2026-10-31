"use strict";
/* LPS 911 · Medir sobre los planos (docs/ia/planos.md › Medir): distancia, poligonal y área en el visor de Planos.
   - El visor (`plTiles`, planos.js) trabaja en «coordenadas del plano»: píxeles del nivel de detalle (W × H). Aquí los puntos
     se guardan en esas coordenadas, así que la medida no cambia al acercar, alejar o girar el equipo.
   - Para pasar píxeles a metros hace falta una CALIBRACIÓN por lámina: se marcan los dos extremos de una medida conocida y se
     escribe la real (metros por píxel = `mpp`). La guardan admin, editores y Oficina Técnica en `plb/<id>.cal` (vale para la
     revisión que se calibró); quien no puede escribir calibra solo en su equipo (no se guarda).
   - Las medidas son temporales: no se guardan en Firestore (el visor debe seguir siendo rápido y no hay nada que perder).
   - El dibujo va dentro del mismo lienzo del visor (`V.over`, al final de `V.paint`), para que no se desfase con el zoom ni
     con la inercia. Un toque corto pone un punto; arrastrar mueve el plano; tocar un punto puesto lo arrastra (con lupa). */

const plmNew=()=>({dist:[],poli:[],area:[],cal:[]}); /* cada herramienta conserva sus puntos al cambiar de una a otra */
const PLM={on:false,tool:'dist',L:plmNew(),loc:new Map(),drag:-1,mx:0,my:0};
const PLM_COL='#d6336c',PLM_HIT=22;

/* ---------- cuentas (puras: se prueban aparte) ---------- */
const plmD=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
function plmLen(pts,closed){let s=0;for(let i=1;i<pts.length;i++)s+=plmD(pts[i-1],pts[i]);if(closed&&pts.length>2)s+=plmD(pts[pts.length-1],pts[0]);return s}
function plmArea(pts){let s=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];s+=a.x*b.y-b.x*a.y}return Math.abs(s)/2}
function plmCentro(pts){let x=0,y=0;for(const p of pts){x+=p.x;y+=p.y}return{x:x/pts.length,y:y/pts.length}}
const plmFmtL=m=>m<1?(m*100).toFixed(1)+' cm':m.toFixed(2)+' m';
const plmFmtA=m2=>m2.toFixed(2)+' m²';
/* escala nominal 1/100 de la hoja (m por píxel) para avisar si la calibración se aleja demasiado de lo esperado */
const plmNominal=(p,sp)=>!p.eto&&sp.cur&&p.mm&&p.mm[0]&&sp.W?(p.mm[0]/sp.W)*0.1:0;

/* ---------- estado ---------- */
const plmList=()=>PLM.L[PLM.tool];
function plmMpp(){if(!PLV)return null;const p=PLB.get(PLV.id);if(!p)return null;const sp=plSpecOf(p,PLV.rev);
  if(sp.cur&&p.cal&&p.cal.rev===(p.rev||1)&&p.cal.mpp>0)return{mpp:p.cal.mpp,src:'oficial',cal:p.cal};
  const l=PLM.loc.get(sp.base);return l?{mpp:l.mpp,src:'local'}:null}
function plmReset(){PLM.on=false;PLM.L=plmNew();PLM.drag=-1;plmBarOff();if(PLV&&PLV.tv)plmUnhook(PLV.tv)}
function plmUnhook(v){v.over=v.onTap=v.onDown=v.onDrag=v.onUp=null;v.host.classList.remove('medir','sobre');v.host.removeEventListener('pointermove',plmHover);v.tick()}
function plmHook(v){v.over=plmDraw;v.onTap=plmTap;v.onDown=plmDown;v.onDrag=plmMove;v.onUp=plmUp;v.host.classList.add('medir');v.host.addEventListener('pointermove',plmHover);v.tick()}
/* el cursor es una cruz fina (CSS .plvc.medir) y pasa a «mover» cuando está sobre un punto que se puede arrastrar */
function plmHover(e){if(e.pointerType!=='mouse'||!PLV||!PLV.tv)return;PLV.tv.host.classList.toggle('sobre',plmNear(e.clientX,e.clientY)>=0);
  /* lámina DXF: muestra dónde se pegaría el punto */
  const g=plmGeo();if(g){const w=PLV.tv.toWorld(e.clientX,e.clientY),q=plmSnap(w);const hv=q!==w?q:null;if(JSON.stringify(hv)!==JSON.stringify(PLM.hv)){PLM.hv=hv;PLV.tv.tick()}}}
/** geometría de la lámina DXF abierta (planos-dxf.js) o null */
function plmGeo(){if(!PLV)return null;const p=PLB.get(PLV.id);if(!p)return null;const sp=plSpecOf(p,PLV.rev);if(!sp.dxf)return null;const e=GEO.get(sp.base);if(e&&e.g)return e.g;if(!e)plGeoGet(sp).catch(()=>{});return null}
/** se pega a la esquina o línea del DXF más cercana (12 px de pantalla); Alt o sin DXF: tal cual */
function plmSnap(w,alt){const G=plmGeo();if(!G||alt)return w;const v=PLV.tv,a=v.toScreen(0,0),b=v.toScreen(1,0);const k=Math.hypot(b.x-a.x,b.y-a.y)||1;const q=plGeoSnap(G,w,12/k);return q?{x:q.x,y:q.y}:w}

/* el visor se arma de nuevo al cambiar de lámina o de revisión: las marcas son de una lámina, se limpian */
function plmAttach(){PLM.L=plmNew();PLM.drag=-1;PLM.hv=null;plmGeo();
  if(!PLM.on){plmBarOff();return}
  if(!plmMpp())PLM.tool='cal';else if(PLM.tool==='cal')PLM.tool='dist';
  plmHook(PLV.tv);plmBar()}
function plmToggle(){if(!PLV||!PLV.tv)return;PLM.on=!PLM.on;
  const b=PLV.box.querySelector('[data-pv="med"]');if(b)b.classList.toggle('on',PLM.on);
  if(!PLM.on){PLM.L=plmNew();PLM.drag=-1;plmBarOff();plmUnhook(PLV.tv);plkSync();if(typeof palSync==='function')palSync();return}  /* al salir de medir vuelve la capa de vínculos (y los toques de Alistar) */
  if(PLK.edit)plkEdit(false);                                                              /* Medir y Vincular no conviven */
  if(PLD.on)pldToggle(false);                                                              /* ni Medir y Marcar */
  PLM.L=plmNew();PLM.tool=plmMpp()?'dist':'cal';plmHook(PLV.tv);plmBar()}

/* ---------- toques ---------- */
function plmTap(cx,cy){const v=PLV.tv,w=plmSnap(v.toWorld(cx,cy)),L=plmList();
  if(w.x<0||w.y<0||w.x>v.W||w.y>v.H)return;                     /* fuera de la hoja */
  if((PLM.tool==='dist'||PLM.tool==='cal')&&L.length>=2)L.length=0; /* una medida de dos puntos: el tercer toque empieza otra */
  L.push(w);v.tick();plmBar()}
function plmNear(cx,cy){const L=plmList(),v=PLV.tv,r=v.cv.getBoundingClientRect();let best=-1,bd=PLM_HIT;
  L.forEach((q,i)=>{const s=v.toScreen(q.x,q.y),d=Math.hypot(r.left+s.x-cx,r.top+s.y-cy);if(d<bd){bd=d;best=i}});return best}
function plmDown(cx,cy){const best=plmNear(cx,cy);if(best<0)return false;PLM.drag=best;PLM.mx=cx;PLM.my=cy;PLV.tv.tick();return true}
function plmMove(cx,cy){const L=plmList(),v=PLV.tv;if(PLM.drag<0||!L[PLM.drag])return;
  const w=plmSnap(v.toWorld(cx,cy));L[PLM.drag]={x:Math.max(0,Math.min(v.W,w.x)),y:Math.max(0,Math.min(v.H,w.y))};PLM.mx=cx;PLM.my=cy;v.tick();plmVal()}
function plmUp(){PLM.drag=-1;if(PLV&&PLV.tv)PLV.tv.tick()}

/* ---------- dibujo (dentro del lienzo del visor) ---------- */
function plmDraw(g,v){const L=plmList();
  if(PLM.hv){const s=v.toScreen(PLM.hv.x,PLM.hv.y);g.lineWidth=2;g.strokeStyle='#7C3AED';g.beginPath();g.arc(s.x,s.y,7,0,2*Math.PI);g.stroke()}
  if(!L.length)return;const m=plmMpp(),area=PLM.tool==='area',cal=PLM.tool==='cal';
  const S=L.map(q=>v.toScreen(q.x,q.y));
  const stroke=(w,c)=>{g.lineWidth=w;g.strokeStyle=c;g.lineJoin='round';g.lineCap='round';g.beginPath();S.forEach((s,i)=>i?g.lineTo(s.x,s.y):g.moveTo(s.x,s.y));if(area&&S.length>2)g.closePath();g.stroke()};
  if(area&&S.length>2){g.beginPath();S.forEach((s,i)=>i?g.lineTo(s.x,s.y):g.moveTo(s.x,s.y));g.closePath();g.fillStyle='rgba(214,51,108,.16)';g.fill()}
  if(S.length>1){stroke(5,'rgba(255,255,255,.95)');stroke(2.4,PLM_COL)}
  g.font='600 13px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';
  const tag=(t,x,y)=>{g.lineWidth=4;g.strokeStyle='#fff';g.strokeText(t,x,y);g.fillStyle='#8a1538';g.fillText(t,x,y)};
  if(m&&!cal){
    if(PLM.tool==='area'){if(L.length>2){const c=plmCentro(L),cs=v.toScreen(c.x,c.y);tag(plmFmtA(plmArea(L)*m.mpp*m.mpp),cs.x,cs.y)}}
    else for(let i=1;i<L.length;i++)tag(plmFmtL(plmD(L[i-1],L[i])*m.mpp),(S[i-1].x+S[i].x)/2,(S[i-1].y+S[i].y)/2-12)}
  S.forEach((s,i)=>{g.beginPath();g.arc(s.x,s.y,i===PLM.drag?8:6,0,Math.PI*2);g.fillStyle='#fff';g.fill();g.lineWidth=2.4;g.strokeStyle=PLM_COL;g.stroke();
    g.beginPath();g.arc(s.x,s.y,1.6,0,Math.PI*2);g.fillStyle=PLM_COL;g.fill()});
  if(PLM.drag>=0&&S[PLM.drag])plmLupa(g,v,S[PLM.drag])}
/* lupa 3× por encima del dedo mientras se arrastra un punto (el dedo tapa justo lo que se quiere ver) */
function plmLupa(g,v,s){const R=62,k=3,dpr=v.getDpr(),cw=v.cv.width/dpr;let lx=Math.max(R+6,Math.min(cw-R-6,s.x)),ly=s.y-R-52;if(ly<R+6)ly=s.y+R+52;
  const sw=2*R/k;g.save();g.beginPath();g.arc(lx,ly,R,0,Math.PI*2);g.clip();g.fillStyle='#fff';g.fillRect(lx-R,ly-R,2*R,2*R);
  g.imageSmoothingEnabled=true;g.drawImage(v.cv,(s.x-sw/2)*dpr,(s.y-sw/2)*dpr,sw*dpr,sw*dpr,lx-R,ly-R,2*R,2*R);g.restore();
  g.lineWidth=3;g.strokeStyle='#fff';g.beginPath();g.arc(lx,ly,R,0,Math.PI*2);g.stroke();g.lineWidth=1.5;g.strokeStyle=PLM_COL;g.stroke();
  g.lineWidth=1.2;g.strokeStyle=PLM_COL;g.beginPath();g.moveTo(lx-10,ly);g.lineTo(lx+10,ly);g.moveTo(lx,ly-10);g.lineTo(lx,ly+10);g.stroke()}

/* ---------- barra de medición ---------- */
const PLM_TOOLS=[['dist','Distancia'],['poli','Poligonal'],['area','Área'],['cal','Calibrar']];
function plmBarOff(){const b=document.querySelector('#plv .plmbar');if(b)b.remove()}
function plmBar(){if(!PLV||!PLM.on)return;let el=PLV.box.querySelector('.plmbar');
  if(!el){el=document.createElement('div');el.className='plmbar';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Medir sobre el plano');PLV.box.appendChild(el);
    el.onclick=e=>{const b=e.target.closest('[data-pm]');if(!b)return;const a=b.dataset.pm;
      if(a==='undo'){plmList().pop();PLV.tv.tick();plmBar()}
      else if(a==='clear'){plmList().length=0;PLV.tv.tick();plmBar()}
      else if(a==='off')plmToggle();
      else if(a==='calok')plmCalSave();
      else if(a==='ctnok')palCtnSave();   /* Alistar plano: el área trazada es el contorno de la planta */
      else if(PLM_TOOLS.some(t=>t[0]===a)){if(a!==PLM.tool){PLM.tool=a;PLV.tv.tick();plmBar()}}};
    el.onkeydown=e=>{if(e.key==='Enter'&&e.target.id==='plmL'){e.preventDefault();plmCalSave()}e.stopPropagation()}}
  const m=plmMpp(),p=PLB.get(PLV.id);
  const est=m?(m.src==='oficial'?`Escala calibrada${m.cal.byN?' por '+esc(m.cal.byN):''} · 1 px = ${(m.mpp*100).toFixed(2)} cm`:`Calibración solo de este equipo · 1 px = ${(m.mpp*100).toFixed(2)} cm`):'Sin calibrar: marca una medida que conozcas';
  const sp=p?plSpecOf(p,PLV.rev):null;
  el.innerHTML=`<div class="plmt">${PLM_TOOLS.map(([k,n])=>`<button type="button" class="ib${PLM.tool===k?' on':''}" data-pm="${k}"${k!=='cal'&&!m?' disabled':''}>${n}</button>`).join('')}</div>
    <div class="plmv" id="plmv" aria-live="polite"></div>
    ${PLM.tool==='cal'?`<div class="plmc"><input class="tin" id="plmL" inputmode="decimal" placeholder="Medida real en metros (ej. 3.60)" aria-label="Medida real en metros"><button type="button" class="ib pri" data-pm="calok">Calibrar</button></div>`:''}
    <div class="plmx"><button type="button" class="ib" data-pm="undo" title="Quitar el último punto">↶ Deshacer</button><button type="button" class="ib" data-pm="clear">Limpiar</button>${palCtnBar()}<span class="plvsp"></span><button type="button" class="ib" data-pm="off" title="Salir de medir (Esc)">✓ Listo</button></div>
    <small class="plms">${est}${sp&&!sp.cur?' · revisión anterior':''}</small>`;
  plmVal();
  /* al rehacer la barra el botón tocado desaparece y el foco se pierde: sin foco en el visor, Esc y las flechas no responden */
  if(!document.activeElement||document.activeElement===document.body)PLV.box.focus()}
/* lo que se lee en vivo: se actualiza sin rehacer la barra (así no se pierde lo escrito en el campo) */
function plmVal(){const el=document.getElementById('plmv');if(!el)return;const L=plmList(),m=plmMpp(),t=PLM.tool;let h='';
  if(t==='cal')h=L.length<2?'Toca los dos extremos de una medida que conozcas (eje a eje, el ancho de una puerta…). Acerca el plano para marcar con precisión.':'Escribe cuánto mide en la realidad y toca Calibrar. Puedes arrastrar los puntos para afinarlos.';
  else if(!m)h='Calibra primero esta lámina.';
  else if(t==='dist')h=L.length<2?'Toca dos puntos.':`<b>${plmFmtL(plmD(L[0],L[1])*m.mpp)}</b>`;
  else if(t==='poli')h=L.length<2?'Toca los puntos del recorrido.':`<b>${plmFmtL(plmLen(L)*m.mpp)}</b> · ${L.length} puntos`;
  else h=L.length<3?'Toca las esquinas del área.':`<b>${plmFmtA(plmArea(L)*m.mpp*m.mpp)}</b> · perímetro ${plmFmtL(plmLen(L,true)*m.mpp)}`;
  el.innerHTML=h}

/* ---------- calibrar ---------- */
async function plmCalSave(){if(!PLV||PLM.L.cal.length<2)return;const inp=document.getElementById('plmL');
  const real=parseFloat(String(inp&&inp.value||'').replace(',','.'));const px=plmD(PLM.L.cal[0],PLM.L.cal[1]);
  if(!(real>0)){toast('Escribe la medida real en metros.');if(inp)inp.focus();return}
  if(px<8){toast('Los dos puntos están casi juntos: acerca el plano y sepáralos más.');return}
  const p=PLB.get(PLV.id);if(!p)return;const sp=plSpecOf(p,PLV.rev),mpp=real/px;
  const nom=plmNominal(p,sp);
  if(nom&&Math.abs(mpp/nom-1)>0.05&&!await uiAsk({title:'La escala se aleja de 1/100',text:`Con esa medida la escala sale ${(Math.abs(mpp/nom-1)*100).toFixed(0)} % distinta de la nominal 1/100. Revisa que la medida real y los dos puntos sean los correctos.`,ok:'Calibrar igual',cancel:'Revisar',tone:'warn'}))return;
  const ya=plmMpp();
  if(ya&&ya.src==='oficial'&&Math.abs(mpp/ya.mpp-1)>0.02&&!await uiAsk({title:'¿Reemplazar la calibración?',text:`Esta lámina ya estaba calibrada por ${ya.cal.byN||'otra persona'} y la nueva difiere ${(Math.abs(mpp/ya.mpp-1)*100).toFixed(1)} %. La nueva la verá todo el equipo.`,ok:'Reemplazar',cancel:'Cancelar',tone:'warn'}))return;
  if(plEdOf(p)&&sp.cur){
    try{await plCol(p).doc(p.id).update({cal:{mpp,rev:p.rev||1,L:real,px,by:me.email,byN:me.name||me.email,ts:NOW()}});
      toast('Lámina calibrada para todo el equipo')}
    catch(e){toast('No se pudo guardar la calibración: '+(e.code||e.message));return}
    /* la lámina ya cambió en PLB solo cuando llega la foto de Firestore; mientras tanto vale también en este equipo */
    PLM.loc.set(sp.base,{mpp});
  }else{PLM.loc.set(sp.base,{mpp});toast(sp.cur?'Calibración solo en este equipo (no tienes permiso para guardarla para todos)':'Calibración solo en este equipo (es una revisión anterior)')}
  PLM.L.cal=[];PLM.tool='dist';PLV.tv.tick();plmBar()}
