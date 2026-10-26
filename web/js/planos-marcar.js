"use strict";
/* LPS 911 · Marcar sobre los planos (docs/ia/planos.md › Marcar, oct 2026, pedido del dueño): resaltar y dibujar cosas básicas
   (resaltador, lápiz, flecha, recuadro, círculo y texto) sobre la lámina para sacar una imagen y mandarla por WhatsApp.
   - Las marcas son TEMPORALES: no se guardan en Firestore ni en el equipo. Viven en memoria por lámina (y revisión) mientras el
     visor está abierto: se puede marcar AG03, pasar a IS-03, marcarla y volver a AG03 sin perder nada; al cerrar el visor se borra todo.
   - Las puede usar cualquiera que vea Planos (no escribe nada).
   - Coordenadas del plano (como Medir): las marcas siguen pegadas al dibujo al acercar, alejar o desplazarse. El grosor se fija
     al dibujar (como tinta sobre papel): visto de lejos se ve más fino.
   - Se dibujan en el lienzo del visor (`V.marks`, antes de `V.over`), así se ven aunque se salga del modo o se entre a Medir.
   - Trazos a mano (resaltador y lápiz) SUAVIZADOS: se toman todos los puntos del puntero (eventos agrupados), se filtran mientras
     se dibuja y al soltar se redondean (Chaikin) y se simplifican; un resaltado casi recto queda recto.
   - Texto DIRECTO sobre el plano: un toque abre un cuadro para escribir en ese mismo punto (Enter pone, Mayús+Enter otra línea,
     Esc cancela, tocar fuera pone); tocar un texto ya puesto lo edita.
   - Borrador: tocar o pasar sobre una marca la quita. Deshacer (Ctrl+Z) revierte poner, borrar, editar y Limpiar.
   - Táctil: un dedo dibuja, dos dedos mueven y acercan (si llega el segundo dedo, el trazo en curso se descarta: `V.onCancel`).
     Con lápiz óptico, el lápiz dibuja y el dedo mueve. Ratón: el botón izquierdo dibuja; rueda acerca; Espacio + arrastrar o el
     botón de la rueda mueven el plano.
   - 📷 Compartir arma una imagen de lo que se ve (plano nítido + marcas) con un rótulo abajo (lámina, revisión, fecha, quién) y abre
     el menú de compartir (tablet/celular) o la copia para pegarla (PC); ⤓ la descarga. */

const PLD_TOOLS=[['hl','🖍','Resaltar'],['pen','✏️','Lápiz'],['arr','➚','Flecha'],['rect','▭','Recuadro'],['circ','◯','Círculo'],['txt','T','Texto'],['del','⌫','Borrador']];
const PLD_COLS=[['#ffd400','Amarillo'],['#e03131','Rojo'],['#1c7ed6','Azul'],['#2f9e44','Verde']];
const PLD_W={hl:20,pen:3,arr:4,rect:3.5,circ:3.5};   /* grosor en px de pantalla al dibujar */
const PLD_FS=17,PLD_MAXTXT=80;
const PLD={on:false,tool:'hl',col:{hl:'#ffd400',pen:'#e03131',arr:'#e03131',rect:'#e03131',circ:'#e03131',txt:'#e03131'},
  by:new Map(),h:new Map(),cur:null,er:null,ed:null,pen:false,space:false,busy:false};
const pldFree=t=>t==='hl'||t==='pen';

/* ---------- estado ---------- */
function pldKey(){if(!PLV)return null;const p=PLB.get(PLV.id);return p?plSpecOf(p,PLV.rev).base:null}
function pldList(k){k=k||pldKey();if(!k)return[];let L=PLD.by.get(k);if(!L){L=[];PLD.by.set(k,L)}return L}
/* historial para Deshacer, por lámina: {a:'add',m} · {a:'del',it:[{m,i}]} · {a:'clr',L} · {a:'rep',o,n} */
function pldHist(k){k=k||pldKey();if(!k)return[];let H=PLD.h.get(k);if(!H){H=[];PLD.h.set(k,H)}return H}
const pldN=()=>{const k=pldKey(),L=k&&PLD.by.get(k);return L?L.length:0};
function pldOthers(){const k=pldKey();let n=0;for(const[kk,L]of PLD.by)if(kk!==k&&L.length)n++;return n}
function pldReset(){pldEdEnd(false);PLD.on=false;PLD.by=new Map();PLD.h=new Map();PLD.cur=null;PLD.er=null;PLD.space=false;pldBarOff()}
function pldHook(v){v.onTap=pldTap;v.onDown=pldDown;v.onDrag=pldMove;v.onUp=pldUp;v.onCancel=pldCancel;v.onLink=null;v.host.classList.add('marcar');pldCursor();v.tick()}
function pldUnhook(v){v.onTap=v.onDown=v.onDrag=v.onUp=v.onCancel=null;v.host.classList.remove('marcar','pan','borrar');v.tick()}
function pldCursor(){if(PLV&&PLV.tv)PLV.tv.host.classList.toggle('borrar',PLD.on&&PLD.tool==='del')}
/** cada vez que `plvDraw` arma el visor (otra lámina o revisión): la capa de marcas siempre; los toques solo en modo Marcar */
function pldAttach(){if(!PLV||!PLV.tv)return;pldEdEnd(true);PLD.cur=null;PLD.er=null;PLV.tv.marks=pldDraw;
  if(!PLV.box._pld){PLV.box._pld=1;PLV.box.addEventListener('keydown',pldKeyDown,true);PLV.box.addEventListener('keyup',pldKeyUp)}
  if(PLD.on){pldHook(PLV.tv);pldBar()}else pldBarOff()}
function pldToggle(on){if(!PLV||!PLV.tv)return;on=on===undefined?!PLD.on:!!on;if(on===PLD.on)return;
  if(on){if(PLM.on)plmToggle();if(PLK.edit)plkEdit(false)}                    /* Marcar, Medir y Vincular no conviven */
  else pldEdEnd(true);
  PLD.on=on;PLD.cur=null;PLD.er=null;PLD.space=false;
  const b=PLV.box.querySelector('[data-pv="mark"]');if(b)b.classList.toggle('on',on);
  if(on){pldHook(PLV.tv);pldBar()}else{pldUnhook(PLV.tv);pldBarOff();plkSync();pldHdrSync()}}
/** Esc: primero el texto o el trazo en curso, luego sale del modo; devuelve true si hizo algo */
function pldEsc(){if(PLD.ed){pldEdEnd(false);return true}if(PLD.cur||PLD.er){pldCancel();return true}if(PLD.on){pldToggle(false);return true}return false}
function pldHdrBtn(){const n=PLV?pldN():0;
  return`<button class="ib${PLD.on?' on':''}" data-pv="mark" title="Resaltar y dibujar sobre el plano para mandar una imagen (no se guarda)">✏️ Marcar${n?` <small class="pldn">${n}</small>`:''}</button>`}
function pldHdrSync(){if(!PLV)return;const b=PLV.box.querySelector('[data-pv="mark"]');if(b)b.outerHTML=pldHdrBtn()}
function pldChanged(){if(PLV&&PLV.tv)PLV.tv.tick();pldBar();pldHdrSync()}

/* ---------- teclado: Espacio para mover con el ratón, Ctrl+Z para deshacer ---------- */
function pldKeyDown(e){if(!PLD.on||(e.target&&e.target.closest&&e.target.closest('input,select,textarea,[contenteditable]')))return;
  if(e.key===' '||e.code==='Space'){e.preventDefault();if(!PLD.space){PLD.space=true;PLV.tv.host.classList.add('pan')}return}
  if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){e.preventDefault();e.stopPropagation();pldUndo()}}
function pldKeyUp(e){if((e.key===' '||e.code==='Space')&&PLD.space){PLD.space=false;if(PLV&&PLV.tv)PLV.tv.host.classList.remove('pan')}}

/* ---------- trazos a mano: suavizado ---------- */
/** distancia de p al segmento a–b */
function pldSeg(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let t=l2?((p.x-a.x)*dx+(p.y-a.y)*dy)/l2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
/** Chaikin: redondea las esquinas del trazo conservando los extremos */
function pldChaikin(P,n){for(let k=0;k<n&&P.length>2;k++){const Q=[P[0]];
  for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];Q.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75})}
  Q.push(P[P.length-1]);P=Q}return P}
/** Ramer–Douglas–Peucker: quita los puntos que no cambian la forma (eps en px del plano) */
function pldRdp(P,eps){if(P.length<3)return P;let m=0,ix=0;const a=P[0],b=P[P.length-1];
  for(let i=1;i<P.length-1;i++){const d=pldSeg(P[i],a,b);if(d>m){m=d;ix=i}}
  if(m<=eps)return[a,b];const L=pldRdp(P.slice(0,ix+1),eps),R=pldRdp(P.slice(ix),eps);return L.slice(0,-1).concat(R)}
/** trazo terminado: casi recto (resaltador) → recto; si no, simplificado y redondeado. `s` = escala de pantalla al dibujar */
function pldSmooth(P,t,s){if(P.length<3)return P;const a=P[0],b=P[P.length-1],L=Math.hypot(b.x-a.x,b.y-a.y)*s;
  if(t==='hl'&&L>30){let m=0;for(const q of P)m=Math.max(m,pldSeg(q,a,b));if(m*s<Math.max(5,L*.05))return[a,b]}
  return pldChaikin(pldRdp(pldAvg(pldAvg(P)),1/s),2)}
/** promedio móvil de 5 puntos (quita el temblor del pulso o del dedo); los extremos no se mueven */
function pldAvg(P){if(P.length<5)return P;const Q=P.map(q=>({x:q.x,y:q.y}));
  for(let i=1;i<P.length-1;i++){const a=Math.max(0,i-2),b=Math.min(P.length-1,i+2);let x=0,y=0;for(let j=a;j<=b;j++){x+=P[j].x;y+=P[j].y}Q[i]={x:x/(b-a+1),y:y/(b-a+1)}}return Q}

/* ---------- toques ---------- */
const pldClamp=(v,w)=>({x:Math.max(0,Math.min(v.W,w.x)),y:Math.max(0,Math.min(v.H,w.y))});
function pldDown(cx,cy,e){const t=PLD.tool;if(PLD.ed)pldEdEnd(true,1);   /* ese toque solo cierra el cuadro */if(t==='txt'||PLD.space)return false;
  if(e){if(e.pointerType==='mouse'&&e.button!==0)return false;          /* rueda presionada: mueve el plano */
    if(e.pointerType==='pen')PLD.pen=true;else if(e.pointerType==='touch'&&PLD.pen)return false}  /* con lápiz, el dedo mueve */
  const v=PLV.tv,w=v.toWorld(cx,cy);
  if(t==='del'){PLD.er={x:cx,y:cy,it:[],r:e&&e.pointerType==='touch'?20:13};pldErase(cx,cy);return true}
  if(w.x<-20/v.s||w.y<-20/v.s||w.x>v.W+20/v.s||w.y>v.H+20/v.s)return false;   /* fuera de la hoja: mueve */
  const q=pldClamp(v,w);PLD.cur={t,c:PLD.col[t],w:PLD_W[t]/v.s,p:pldFree(t)?[q]:[q,q],f:q,s:v.s};v.tick();return true}
function pldMove(cx,cy,e){const v=PLV.tv;
  if(PLD.er){const er=PLD.er,d=Math.hypot(cx-er.x,cy-er.y),n=Math.max(1,Math.ceil(d/6));   /* sin saltarse marcas al pasar rápido */
    for(let i=1;i<=n;i++)pldErase(er.x+(cx-er.x)*i/n,er.y+(cy-er.y)*i/n);er.x=cx;er.y=cy;v.tick();return}
  const c=PLD.cur;if(!c)return;
  if(!pldFree(c.t)){c.p[1]=pldClamp(v,v.toWorld(cx,cy));v.tick();return}
  /* todos los puntos que dio el puntero desde el último cuadro, filtrados (sigue al dedo con un poco de inercia: no tiembla) */
  const ev=e&&e.getCoalescedEvents?e.getCoalescedEvents():[];const pts=ev.length?ev.map(x=>[x.clientX,x.clientY]):[[cx,cy]];
  for(const[x,y]of pts){const q=pldClamp(v,v.toWorld(x,y));c.f={x:c.f.x+(q.x-c.f.x)*.5,y:c.f.y+(q.y-c.f.y)*.5};c.raw=q;
    const l=c.p[c.p.length-1];if(Math.hypot(c.f.x-l.x,c.f.y-l.y)*v.s>=1.5)c.p.push({x:c.f.x,y:c.f.y})}
  v.tick()}
function pldUp(){const v=PLV&&PLV.tv;
  if(PLD.er){const er=PLD.er;PLD.er=null;if(er.it.length){pldHist().push({a:'del',it:er.it});pldChanged()}else if(v)v.tick();return}
  const c=PLD.cur;PLD.cur=null;if(!c||!v)return;
  if(pldFree(c.t)&&c.raw){const l=c.p[c.p.length-1];if(Math.hypot(c.raw.x-l.x,c.raw.y-l.y)*v.s>=1)c.p.push(c.raw)}   /* termina donde se soltó */
  const len=c.p.length>1?Math.hypot(c.p[c.p.length-1].x-c.p[0].x,c.p[c.p.length-1].y-c.p[0].y)*v.s:0;
  /* un toque suelto o un arrastre mínimo no deja marca (suele ser un toque sin querer) */
  if(pldFree(c.t)?c.p.length<2:len<8){v.tick();return}
  const m={t:c.t,c:c.c,w:c.w,p:pldFree(c.t)?pldSmooth(c.p,c.t,c.s):c.p};
  pldList().push(m);pldHist().push({a:'add',m});pldChanged()}
function pldCancel(){if(PLD.er){const er=PLD.er;PLD.er=null;if(er.it.length){pldHist().push({a:'del',it:er.it});pldChanged();return}}
  PLD.cur=null;if(PLV&&PLV.tv)PLV.tv.tick()}

/* ---------- borrador ---------- */
/** ¿la marca pasa a menos de r px (pantalla) del punto? */
function pldHit(m,px,py,v,r){const p={x:px,y:py},lw=Math.max(.6,(m.w||0)*v.s)/2+r;
  if(pldFree(m.t)){const S=m.p.map(q=>v.toScreen(q.x,q.y));for(let i=1;i<S.length;i++)if(pldSeg(p,S[i-1],S[i])<=lw)return true;return false}
  if(m.t==='arr'){const a=v.toScreen(m.p[0].x,m.p[0].y),b=v.toScreen(m.p[1].x,m.p[1].y);return pldSeg(p,a,b)<=lw+4}
  if(m.t==='rect'||m.t==='circ'){const a=v.toScreen(m.p[0].x,m.p[0].y),b=v.toScreen(m.p[1].x,m.p[1].y);
    const x0=Math.min(a.x,b.x),y0=Math.min(a.y,b.y),x1=Math.max(a.x,b.x),y1=Math.max(a.y,b.y);
    if(m.t==='rect'){const c=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];for(let i=0;i<4;i++)if(pldSeg(p,c[i],c[(i+1)%4])<=lw)return true;return false}
    const rx=Math.max(1,(x1-x0)/2),ry=Math.max(1,(y1-y0)/2),dx=(px-x0-rx)/rx,dy=(py-y0-ry)/ry;return Math.abs(Math.hypot(dx,dy)-1)*Math.min(rx,ry)<=lw}
  if(m.t==='txt'){const b=pldTxtBox(m,v);return!!b&&px>=b.x-r&&px<=b.x+b.w+r&&py>=b.y-r&&py<=b.y+b.h+r}
  return false}
function pldErase(cx,cy){const v=PLV.tv,r=v.host.getBoundingClientRect(),L=pldList(),er=PLD.er;
  for(let i=L.length-1;i>=0;i--)if(pldHit(L[i],cx-r.left,cy-r.top,v,er.r)){er.it.push({m:L[i],i});L.splice(i,1)}
  er.sx=cx-r.left;er.sy=cy-r.top;v.tick()}
function pldUndo(){const H=pldHist(),op=H.pop();if(!op)return;const L=pldList();
  if(op.a==='add'){const i=L.indexOf(op.m);if(i>=0)L.splice(i,1)}
  else if(op.a==='del'){for(const{m,i}of op.it.slice().sort((a,b)=>a.i-b.i))L.splice(Math.min(i,L.length),0,m)}
  else if(op.a==='clr')L.push(...op.L);
  else if(op.a==='rep'){const i=L.indexOf(op.n);if(i>=0)L[i]=op.o;else L.push(op.o)}
  pldChanged()}
function pldClear(){const L=pldList();if(!L.length)return;pldEdEnd(false);pldHist().push({a:'clr',L:L.splice(0)});pldChanged();
  toast('Marcas de esta lámina borradas','Deshacer',()=>{if(PLV)pldUndo()})}

/* ---------- texto directo sobre el plano ---------- */
/** caja del texto en pantalla (la calcula el dibujo; vale para tocarlo o borrarlo) */
function pldTxtBox(m,v){const fs=m.s*v.s,s=v.toScreen(m.x,m.y),lines=m.txt.split('\n');
  const g=pldTxtBox.g||(pldTxtBox.g=document.createElement('canvas').getContext('2d'));g.font=`700 ${fs}px system-ui,sans-serif`;
  const pad=fs*.4,lh=fs*1.25,tw=Math.max(...lines.map(l=>g.measureText(l).width)),w=tw+pad*2,h=lh*lines.length+pad*.8;return{x:s.x,y:s.y-h/2,w,h,fs,pad,lh}}
function pldTap(cx,cy){if(PLD.tool!=='txt')return;const v=PLV.tv,r=v.host.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;
  if(PLD.ed){pldEdEnd(true);return}                                         /* tocar fuera del cuadro lo pone */
  if(performance.now()-(PLD.edT||0)<500)return;                             /* ese toque ya cerró el cuadro (al perder el foco) */
  const L=pldList();for(let i=L.length-1;i>=0;i--){const m=L[i];if(m.t==='txt'&&pldHit(m,px,py,v,4)){pldEdOpen(m);return}}  /* editar */
  const w=v.toWorld(cx,cy);if(w.x<0||w.y<0||w.x>v.W||w.y>v.H)return;
  pldEdOpen({t:'txt',c:PLD.col.txt,x:w.x,y:w.y,s:PLD_FS/v.s,txt:''})}
function pldEdOpen(m){const v=PLV.tv,old=m.txt?m:null,L=pldList();
  if(old){const i=L.indexOf(old);if(i>=0)L.splice(i,1)}                      /* mientras se edita, el texto lo muestra el cuadro */
  const el=document.createElement('div');el.className='pldin';el.spellcheck=false;el.setAttribute('aria-label','Texto en el plano');
  try{el.contentEditable='plaintext-only'}catch(err){}if(el.contentEditable!=='plaintext-only')el.contentEditable='true';
  el.textContent=m.txt;v.host.appendChild(el);
  PLD.ed={m:{...m},old,el,k:pldKey()};pldEdPlace();
  el.addEventListener('keydown',e=>{e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();pldEdEnd(false)}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();pldEdEnd(true)}
    else if(el.textContent.length>=PLD_MAXTXT&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!(getSelection()+''))e.preventDefault()});
  el.addEventListener('input',()=>{if(el.textContent.length>PLD_MAXTXT){el.textContent=el.textContent.slice(0,PLD_MAXTXT);pldEdCaret(el)}});
  el.addEventListener('blur',()=>setTimeout(()=>{if(PLD.ed&&PLD.ed.el===el&&document.activeElement!==el)pldEdEnd(true,1)},0));
  for(const t of['pointerdown','pointermove','pointerup','wheel'])el.addEventListener(t,e=>e.stopPropagation());   /* el plano no se mueve al tocar el cuadro */
  el.focus();pldEdCaret(el);v.tick();pldBar()}
function pldEdCaret(el){try{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);const s=getSelection();s.removeAllRanges();s.addRange(r)}catch(err){}}
/** el cuadro sigue al plano al moverlo o acercarlo (lo llama el dibujo de cada cuadro) */
function pldEdPlace(){const ed=PLD.ed;if(!ed||!PLV||!PLV.tv)return;const v=PLV.tv,m=ed.m,fs=Math.max(8,m.s*v.s),s=v.toScreen(m.x,m.y),st=ed.el.style;
  st.left=s.x+'px';st.top=s.y+'px';st.fontSize=fs+'px';st.padding=`${fs*.16}px ${fs*.4}px`;st.borderWidth=Math.max(1.5,fs*.11)+'px';st.borderRadius=fs*.3+'px';
  st.borderColor=m.c;st.color=m.c==='#ffd400'?'#8a6d00':m.c;st.minWidth=fs*2+'px'}
/** cierra el cuadro: ok = poner el texto (vacío = no queda nada); si no, vuelve como estaba */
function pldEdEnd(ok,blur){const ed=PLD.ed;if(!ed)return;PLD.ed=null;const txt=String(ed.el.textContent||'').replace(/\r/g,'').replace(/\n{2,}/g,'\n').trim().slice(0,PLD_MAXTXT);
  ed.el.remove();if(blur)PLD.edT=performance.now();if(PLV)PLV.box.focus();
  const L=pldList(ed.k),H=pldHist(ed.k);                                    /* la lámina donde se escribió (pudo cambiar) */
  if(!ok){if(ed.old)L.push(ed.old)}
  else if(!txt){if(ed.old)H.push({a:'del',it:[{m:ed.old,i:L.length}]})}
  else if(ed.old){if(txt===ed.old.txt&&ed.m.c===ed.old.c)L.push(ed.old);else{const n={...ed.m,txt};L.push(n);H.push({a:'rep',o:ed.old,n})}}
  else{const n={...ed.m,txt};L.push(n);H.push({a:'add',m:n})}
  pldChanged()}

/* ---------- dibujo (dentro del lienzo del visor) ---------- */
function pldDraw(g,v){const L=PLV&&PLV.tv===v?pldList():[];for(const m of L)pldOne(g,v,m);if(PLD.cur)pldOne(g,v,PLD.cur);
  if(PLD.ed)pldEdPlace();
  if(PLD.er&&PLD.er.sx!=null){g.save();g.beginPath();g.arc(PLD.er.sx,PLD.er.sy,PLD.er.r,0,Math.PI*2);g.fillStyle='rgba(255,255,255,.35)';g.fill();
    g.lineWidth=1.5;g.strokeStyle='rgba(60,60,60,.8)';g.setLineDash([4,3]);g.stroke();g.restore()}}
function pldPath(g,S){g.beginPath();g.moveTo(S[0].x,S[0].y);
  for(let i=1;i<S.length-1;i++){const mx=(S[i].x+S[i+1].x)/2,my=(S[i].y+S[i+1].y)/2;g.quadraticCurveTo(S[i].x,S[i].y,mx,my)}
  const l=S[S.length-1];g.lineTo(l.x,l.y)}
/* línea con borde blanco para que se lea sobre cualquier fondo del plano */
function pldHalo(g,lw,c,fn){g.lineJoin='round';g.lineCap='round';fn();g.lineWidth=lw+3;g.strokeStyle='rgba(255,255,255,.92)';g.stroke();fn();g.lineWidth=lw;g.strokeStyle=c;g.stroke()}
function pldOne(g,v,m){const lw=Math.max(.6,(m.w||0)*v.s);g.save();
  if(m.t==='hl'){const S=m.p.map(q=>v.toScreen(q.x,q.y));g.globalCompositeOperation='multiply';g.globalAlpha=.42;g.lineJoin='round';g.lineCap='round';
    pldPath(g,S);g.lineWidth=lw;g.strokeStyle=m.c;g.stroke()}
  else if(m.t==='pen'){const S=m.p.map(q=>v.toScreen(q.x,q.y));pldHalo(g,lw,m.c,()=>pldPath(g,S))}
  else if(m.t==='arr'){const a=v.toScreen(m.p[0].x,m.p[0].y),b=v.toScreen(m.p[1].x,m.p[1].y),an=Math.atan2(b.y-a.y,b.x-a.x),L=Math.hypot(b.x-a.x,b.y-a.y);
    const h=Math.min(L*.6,Math.max(12,lw*4.2)),hw=h*.55,ex=b.x-Math.cos(an)*h*.7,ey=b.y-Math.sin(an)*h*.7;
    pldHalo(g,lw,m.c,()=>{g.beginPath();g.moveTo(a.x,a.y);g.lineTo(ex,ey)});
    const head=()=>{g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x-Math.cos(an)*h+Math.sin(an)*hw,b.y-Math.sin(an)*h-Math.cos(an)*hw);
      g.lineTo(b.x-Math.cos(an)*h-Math.sin(an)*hw,b.y-Math.sin(an)*h+Math.cos(an)*hw);g.closePath()};
    head();g.lineJoin='round';g.lineWidth=3;g.strokeStyle='rgba(255,255,255,.92)';g.stroke();g.fillStyle=m.c;g.fill()}
  else if(m.t==='rect'||m.t==='circ'){const a=v.toScreen(m.p[0].x,m.p[0].y),b=v.toScreen(m.p[1].x,m.p[1].y);
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);
    pldHalo(g,lw,m.c,()=>{g.beginPath();if(m.t==='rect')g.rect(x,y,w,h);else g.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2)})}
  else if(m.t==='txt'){const b=pldTxtBox(m,v);if(b.fs<3){g.restore();return}const lines=m.txt.split('\n');
    g.font=`700 ${b.fs}px system-ui,sans-serif`;g.textBaseline='middle';g.textAlign='left';
    g.beginPath();if(g.roundRect)g.roundRect(b.x,b.y,b.w,b.h,b.fs*.3);else g.rect(b.x,b.y,b.w,b.h);
    g.fillStyle='rgba(255,255,255,.94)';g.fill();g.lineWidth=Math.max(1,b.fs*.11);g.strokeStyle=m.c;g.stroke();
    g.fillStyle=m.c==='#ffd400'?'#8a6d00':m.c;lines.forEach((l,i)=>g.fillText(l,b.x+b.pad,b.y+b.pad*.4+b.lh*(i+.5)))}
  g.restore()}

/* ---------- barra ---------- */
function pldBarOff(){const b=document.querySelector('#plv .pldbar');if(b)b.remove()}
const pldTouch=()=>matchMedia('(pointer:coarse)').matches;
function pldBar(){if(!PLV||!PLD.on)return;let el=PLV.box.querySelector('.pldbar');
  if(!el){el=document.createElement('div');el.className='pldbar';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Marcar sobre el plano');PLV.box.appendChild(el);
    /* que tocar la barra no cierre el cuadro de texto antes de cambiar su color */
    el.addEventListener('pointerdown',e=>{if(PLD.ed&&e.target.closest('[data-pd^="c:"]'))e.preventDefault()});
    el.onclick=e=>{const b=e.target.closest('[data-pd]');if(!b||b.disabled)return;const a=b.dataset.pd;
      if(a.startsWith('c:')){const c=a.slice(2);if(PLD.ed){PLD.ed.m.c=c;PLD.col.txt=c;pldEdPlace();pldBar();PLD.ed.el.focus();return}PLD.col[PLD.tool]=c;pldBar();return}
      pldEdEnd(true);
      if(a==='undo')pldUndo();else if(a==='clear')pldClear();else if(a==='off')pldToggle(false);
      else if(a==='share'||a==='dl')pldShare(a,b);
      else if(PLD_TOOLS.some(t=>t[0]===a)){PLD.tool=a;PLD.cur=null;pldCursor();pldBar()}};
    el.onkeydown=e=>{if(e.key!=='Escape')e.stopPropagation()}}
  const n=pldN(),o=pldOthers(),T=PLD.tool,col=PLD.ed?PLD.ed.m.c:PLD.col[T],H=pldHist();
  const hint=T==='txt'?(PLD.ed?'Escribe · Enter pone · Mayús+Enter otra línea · Esc cancela.':'Toca donde va el texto y escribe; toca un texto puesto para corregirlo.')
    :T==='del'?'Toca o pasa sobre una marca para quitarla.'
    :pldTouch()?'Un dedo dibuja · dos dedos mueven y acercan.':'Arrastra para dibujar · Espacio + arrastrar mueve el plano · rueda: acercar.';
  el.innerHTML=`<div class="plmt">${PLD_TOOLS.map(([k,i,nm])=>`<button type="button" class="ib${T===k?' on':''}" data-pd="${k}" title="${nm}" aria-pressed="${T===k}"><span aria-hidden="true">${i}</span> ${nm}</button>`).join('')}</div>
    <div class="plmx">${T==='del'?'':`<span class="pldcs" role="group" aria-label="Color">${PLD_COLS.map(([c,nm])=>`<button type="button" class="pldsw${c===col?' on':''}" data-pd="c:${c}" style="--sw:${c}" title="${nm}" aria-label="${nm}" aria-pressed="${c===col}"></button>`).join('')}</span>`}
      <button type="button" class="ib" data-pd="undo" title="Deshacer (Ctrl+Z)"${H.length?'':' disabled'}>↶ Deshacer</button><button type="button" class="ib" data-pd="clear"${n?'':' disabled'}>Limpiar</button>
      <span class="plvsp"></span>
      <button type="button" class="ib pri" data-pd="share" title="${pldTouch()?'Compartir la imagen (WhatsApp…)':'Copiar la imagen para pegarla en WhatsApp (Ctrl+V)'}">📷 ${pldTouch()?'Compartir':'Copiar imagen'}</button><button type="button" class="ib" data-pd="dl" title="Descargar la imagen" aria-label="Descargar la imagen">⤓</button>
      <button type="button" class="ib" data-pd="off" title="Salir de marcar (Esc); las marcas siguen visibles">✓ Listo</button></div>
    <small class="plms">${hint} ${n?`${n} marca${n>1?'s':''} en esta lámina${o?` · marcas en ${o} lámina${o>1?'s':''} más`:''}. `:''}No se guardan: se borran al cerrar el visor.</small>`;
  if(!PLD.ed&&(!document.activeElement||document.activeElement===document.body))PLV.box.focus()}

/* ---------- imagen para compartir ---------- */
const pldWait=ms=>new Promise(r=>setTimeout(r,ms));
const pldFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
function pldStamp(){const d=new Date(NOW()-LIMA_OFF),z=n=>String(n).padStart(2,'0');
  return{txt:`${z(d.getUTCDate())}/${z(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`,
    fn:`${d.getUTCFullYear()}${z(d.getUTCMonth()+1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}`}}
/** lo que se ve en el visor (plano + marcas) con un rótulo abajo: lámina, revisión, fecha y quién */
async function pldImage(){pldEdEnd(true);const v=PLV.tv,p=PLB.get(PLV.id);if(!v||!p)return null;
  /* si la capa nítida se está dibujando, se espera un poco (sin pasarse: el menú de compartir necesita el toque reciente) */
  const t0=performance.now();while(v.sharpBusy&&v.sharpBusy()&&performance.now()-t0<700)await pldWait(50);
  v.tick();await pldFrame();
  const src=v.cv,W=src.width,H=src.height;if(!W||!H)return null;const k=v.getDpr(),band=Math.round(38*k),M=Math.round(12*k);
  const cv=document.createElement('canvas');cv.width=W;cv.height=H+band;const g=cv.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,H+band);g.drawImage(src,0,0);
  g.fillStyle='#f3f4f6';g.fillRect(0,H,W,band);g.fillStyle='#d0d4da';g.fillRect(0,H,W,Math.max(1,Math.round(k)));
  const st=pldStamp(),sp=plSpecOf(p,PLV.rev);
  const right=`Rev. ${sp.rev} · ${st.txt}${me&&(me.name||me.email)?' · '+(me.name||me.email):''} · LPS 911`;
  g.textBaseline='middle';g.font=`500 ${Math.round(12.5*k)}px system-ui,sans-serif`;const rw=g.measureText(right).width;
  g.fillStyle='#5b6470';g.textAlign='right';g.fillText(right,W-M,H+band/2);
  g.textAlign='left';g.font=`700 ${Math.round(14*k)}px system-ui,sans-serif`;g.fillStyle='#1b1f24';
  let left=`${p.cod||''}${p.tit?' · '+p.tit:''}`;const room=W-M*3-rw;
  if(g.measureText(left).width>room){while(left.length>4&&g.measureText(left+'…').width>room)left=left.slice(0,-1);left+='…'}
  if(room>40)g.fillText(left,M,H+band/2);
  const blob=await new Promise(ok=>cv.toBlob(ok,'image/png'));cv.width=cv.height=0;
  return blob?{blob,name:`${String(p.cod||'plano').replace(/[^\w.-]+/g,'_')}_marcado_${st.fn}.png`,title:`${p.cod||'Plano'} marcado`}:null}
async function pldShare(mode,btn){if(!PLV||PLD.busy)return;PLD.busy=true;if(btn)btn.disabled=true;let r=null;
  try{r=await pldImage()}catch(err){console.error('marcar',err)}finally{PLD.busy=false;if(btn&&btn.isConnected)btn.disabled=false}
  if(!r){toast('No se pudo crear la imagen');return}
  if(mode==='share'){const fl=new File([r.blob],r.name,{type:'image/png'});
    const share=async()=>{if(navigator.canShare&&navigator.canShare({files:[fl]})){await navigator.share({files:[fl],title:r.title});return true}return false};
    const copy=async()=>{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'image/png':r.blob})]);toast('Imagen copiada: pégala en WhatsApp (Ctrl+V)');return true}return false};
    /* tablet/celular: menú de compartir del equipo (WhatsApp); PC: copiar para pegar */
    for(const f of pldTouch()?[share,copy]:[copy,share]){try{if(await f())return}catch(err){if(err&&err.name==='AbortError')return}}}
  const a=document.createElement('a');a.href=URL.createObjectURL(r.blob);a.download=r.name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);toast('Imagen descargada'+(mode==='share'?': adjúntala en WhatsApp':''))}
