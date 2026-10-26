"use strict";
/* LPS 911 · Marcar sobre los planos (docs/ia/planos.md › Marcar, oct 2026, pedido del dueño): resaltar y dibujar cosas básicas
   (resaltador, lápiz, flecha, recuadro, círculo y texto corto) sobre la lámina para sacar una imagen y mandarla por WhatsApp.
   - Las marcas son TEMPORALES: no se guardan en Firestore ni en el equipo. Viven en memoria por lámina (y revisión) mientras el
     visor está abierto: se puede marcar AG03, pasar a IS-03, marcarla y volver a AG03 sin perder nada; al cerrar el visor se borra todo.
   - Las puede usar cualquiera que vea Planos (no escribe nada).
   - Coordenadas del plano (como Medir): las marcas siguen pegadas al dibujo al acercar, alejar o desplazarse. El grosor se fija
     al dibujar (como tinta sobre papel): visto de lejos se ve más fino.
   - Se dibujan en el lienzo del visor (`V.marks`, antes de `V.over`), así se ven aunque se salga del modo o se entre a Medir.
   - Táctil: un dedo dibuja, dos dedos mueven y acercan (si llega el segundo dedo, el trazo en curso se descarta: `V.onCancel`).
     Con lápiz óptico, el lápiz dibuja y el dedo mueve. Ratón: el botón izquierdo dibuja; rueda acerca; Espacio + arrastrar o el
     botón de la rueda mueven el plano.
   - 📷 Compartir arma una imagen de lo que se ve (plano nítido + marcas) con un rótulo abajo (lámina, revisión, fecha, quién) y abre
     el menú de compartir (tablet/celular) o la copia para pegarla (PC); ⤓ la descarga. */

const PLD_TOOLS=[['hl','🖍','Resaltar'],['pen','✏️','Lápiz'],['arr','➚','Flecha'],['rect','▭','Recuadro'],['circ','◯','Círculo'],['txt','T','Texto']];
const PLD_COLS=[['#ffd400','Amarillo'],['#e03131','Rojo'],['#1c7ed6','Azul'],['#2f9e44','Verde']];
const PLD_W={hl:20,pen:3,arr:4,rect:3.5,circ:3.5};   /* grosor en px de pantalla al dibujar */
const PLD_FS=17,PLD_MAXTXT=80;
const PLD={on:false,tool:'hl',col:{hl:'#ffd400',pen:'#e03131',arr:'#e03131',rect:'#e03131',circ:'#e03131',txt:'#e03131'},
  by:new Map(),cur:null,pen:false,space:false,clr:null,busy:false};

/* ---------- estado ---------- */
function pldKey(){if(!PLV)return null;const p=PLB.get(PLV.id);return p?plSpecOf(p,PLV.rev).base:null}
function pldList(){const k=pldKey();if(!k)return[];let L=PLD.by.get(k);if(!L){L=[];PLD.by.set(k,L)}return L}
const pldN=()=>{const k=pldKey(),L=k&&PLD.by.get(k);return L?L.length:0};
function pldOthers(){const k=pldKey();let n=0;for(const[kk,L]of PLD.by)if(kk!==k&&L.length)n++;return n}
function pldReset(){PLD.on=false;PLD.by=new Map();PLD.cur=null;PLD.space=false;PLD.clr=null;pldBarOff()}
function pldHook(v){v.onTap=pldTap;v.onDown=pldDown;v.onDrag=pldMove;v.onUp=pldUp;v.onCancel=pldCancel;v.onLink=null;v.host.classList.add('marcar');v.tick()}
function pldUnhook(v){v.onTap=v.onDown=v.onDrag=v.onUp=v.onCancel=null;v.host.classList.remove('marcar','pan');v.tick()}
/** cada vez que `plvDraw` arma el visor (otra lámina o revisión): la capa de marcas siempre; los toques solo en modo Marcar */
function pldAttach(){if(!PLV||!PLV.tv)return;PLD.cur=null;PLV.tv.marks=pldDraw;
  if(!PLV.box._pld){PLV.box._pld=1;PLV.box.addEventListener('keydown',pldKeyDown,true);PLV.box.addEventListener('keyup',pldKeyUp)}
  if(PLD.on){pldHook(PLV.tv);pldBar()}else pldBarOff()}
function pldToggle(on){if(!PLV||!PLV.tv)return;on=on===undefined?!PLD.on:!!on;if(on===PLD.on)return;
  if(on){if(PLM.on)plmToggle();if(PLK.edit)plkEdit(false)}                    /* Marcar, Medir y Vincular no conviven */
  PLD.on=on;PLD.cur=null;PLD.space=false;
  const b=PLV.box.querySelector('[data-pv="mark"]');if(b)b.classList.toggle('on',on);
  if(on){pldHook(PLV.tv);pldBar()}else{pldUnhook(PLV.tv);pldBarOff();plkSync();pldHdrSync()}}
/** Esc: primero el trazo en curso, luego sale del modo; devuelve true si hizo algo */
function pldEsc(){if(PLD.cur){pldCancel();return true}if(PLD.on){pldToggle(false);return true}return false}
function pldHdrBtn(){const n=PLV?pldN():0;
  return`<button class="ib${PLD.on?' on':''}" data-pv="mark" title="Resaltar y dibujar sobre el plano para mandar una imagen (no se guarda)">✏️ Marcar${n?` <small class="pldn">${n}</small>`:''}</button>`}
function pldHdrSync(){if(!PLV)return;const b=PLV.box.querySelector('[data-pv="mark"]');if(b)b.outerHTML=pldHdrBtn()}

/* ---------- teclado: Espacio para mover con el ratón, Ctrl+Z para deshacer ---------- */
function pldKeyDown(e){if(!PLD.on||(e.target&&e.target.closest&&e.target.closest('input,select,textarea')))return;
  if(e.key===' '||e.code==='Space'){e.preventDefault();if(!PLD.space){PLD.space=true;PLV.tv.host.classList.add('pan')}return}
  if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){e.preventDefault();e.stopPropagation();pldUndo()}}
function pldKeyUp(e){if((e.key===' '||e.code==='Space')&&PLD.space){PLD.space=false;if(PLV&&PLV.tv)PLV.tv.host.classList.remove('pan')}}

/* ---------- toques ---------- */
const pldClamp=(v,w)=>({x:Math.max(0,Math.min(v.W,w.x)),y:Math.max(0,Math.min(v.H,w.y))});
function pldDown(cx,cy,e){const t=PLD.tool;if(t==='txt'||PLD.space)return false;
  if(e){if(e.pointerType==='mouse'&&e.button!==0)return false;          /* rueda presionada: mueve el plano */
    if(e.pointerType==='pen')PLD.pen=true;else if(e.pointerType==='touch'&&PLD.pen)return false}  /* con lápiz, el dedo mueve */
  const v=PLV.tv,w=v.toWorld(cx,cy);if(w.x<-20/v.s||w.y<-20/v.s||w.x>v.W+20/v.s||w.y>v.H+20/v.s)return false;   /* fuera de la hoja: mueve */
  const q=pldClamp(v,w);PLD.cur={t,c:PLD.col[t],w:PLD_W[t]/v.s,p:t==='hl'||t==='pen'?[q]:[q,q]};v.tick();return true}
function pldMove(cx,cy){const c=PLD.cur;if(!c)return;const v=PLV.tv,q=pldClamp(v,v.toWorld(cx,cy));
  if(c.t==='hl'||c.t==='pen'){const l=c.p[c.p.length-1];if(Math.hypot(q.x-l.x,q.y-l.y)*v.s<2)return;c.p.push(q)}else c.p[1]=q;v.tick()}
function pldUp(){const c=PLD.cur;PLD.cur=null;if(!c||!PLV||!PLV.tv)return;const v=PLV.tv;
  const len=c.p.length>1?Math.hypot(c.p[c.p.length-1].x-c.p[0].x,c.p[c.p.length-1].y-c.p[0].y)*v.s:0;
  /* un toque suelto o un arrastre mínimo no deja marca (suele ser un toque sin querer) */
  if((c.t==='hl'||c.t==='pen')?c.p.length<2:len<8){v.tick();return}
  pldList().push(c);PLD.clr=null;v.tick();pldBar();pldHdrSync()}
function pldCancel(){PLD.cur=null;if(PLV&&PLV.tv)PLV.tv.tick()}
async function pldTap(cx,cy){if(PLD.tool!=='txt'||PLD.busy)return;const v=PLV.tv,w=v.toWorld(cx,cy);if(w.x<0||w.y<0||w.x>v.W||w.y>v.H)return;
  const key=pldKey(),s=PLD_FS/v.s,c=PLD.col.txt;PLD.busy=true;
  let t=null;try{t=await uiAsk({title:'Texto en el plano',input:{label:`Escribe un texto corto (máx. ${PLD_MAXTXT} caracteres)`,required:true},ok:'Poner',cancel:'Cancelar',tone:'info'})}finally{PLD.busy=false}
  if(PLV)PLV.box.focus();
  t=String(t||'').trim().slice(0,PLD_MAXTXT);if(!t||!PLV||!PLV.tv||pldKey()!==key)return;
  pldList().push({t:'txt',c,x:w.x,y:w.y,s,txt:t});PLD.clr=null;PLV.tv.tick();pldBar();pldHdrSync()}
function pldUndo(){const L=pldList(),k=pldKey();
  if(L.length)L.pop();else if(PLD.clr&&PLD.clr.k===k){L.push(...PLD.clr.L);PLD.clr=null}   /* deshacer «Limpiar» */
  else return;PLV.tv.tick();pldBar();pldHdrSync()}
function pldClear(){const L=pldList();if(!L.length)return;PLD.clr={k:pldKey(),L:L.splice(0)};PLV.tv.tick();pldBar();pldHdrSync();
  toast('Marcas de esta lámina borradas','Deshacer',()=>{if(PLV&&PLD.clr)pldUndo()})}

/* ---------- dibujo (dentro del lienzo del visor) ---------- */
function pldDraw(g,v){const L=PLV&&PLV.tv===v?pldList():[];for(const m of L)pldOne(g,v,m);if(PLD.cur)pldOne(g,v,PLD.cur)}
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
  else if(m.t==='txt'){const fs=m.s*v.s;if(fs<3){g.restore();return}const s=v.toScreen(m.x,m.y),lines=m.txt.split('\n');
    g.font=`700 ${fs}px system-ui,sans-serif`;g.textBaseline='middle';g.textAlign='left';
    const pad=fs*.4,lh=fs*1.25,tw=Math.max(...lines.map(l=>g.measureText(l).width)),bw=tw+pad*2,bh=lh*lines.length+pad*.8;
    const bx=s.x,by=s.y-bh/2;g.beginPath();if(g.roundRect)g.roundRect(bx,by,bw,bh,fs*.3);else g.rect(bx,by,bw,bh);
    g.fillStyle='rgba(255,255,255,.94)';g.fill();g.lineWidth=Math.max(1,fs*.11);g.strokeStyle=m.c;g.stroke();
    g.fillStyle=m.c==='#ffd400'?'#8a6d00':m.c;lines.forEach((l,i)=>g.fillText(l,bx+pad,by+pad*.4+lh*(i+.5)))}
  g.restore()}

/* ---------- barra ---------- */
function pldBarOff(){const b=document.querySelector('#plv .pldbar');if(b)b.remove()}
const pldTouch=()=>matchMedia('(pointer:coarse)').matches;
function pldBar(){if(!PLV||!PLD.on)return;let el=PLV.box.querySelector('.pldbar');
  if(!el){el=document.createElement('div');el.className='pldbar';el.setAttribute('role','toolbar');el.setAttribute('aria-label','Marcar sobre el plano');PLV.box.appendChild(el);
    el.onclick=e=>{const b=e.target.closest('[data-pd]');if(!b||b.disabled)return;const a=b.dataset.pd;
      if(a==='undo')pldUndo();else if(a==='clear')pldClear();else if(a==='off')pldToggle(false);
      else if(a==='share'||a==='dl')pldShare(a,b);
      else if(a.startsWith('c:')){PLD.col[PLD.tool]=a.slice(2);pldBar()}
      else if(PLD_TOOLS.some(t=>t[0]===a)){PLD.tool=a;PLD.cur=null;pldBar()}};
    el.onkeydown=e=>{if(e.key!=='Escape')e.stopPropagation()}}
  const n=pldN(),o=pldOthers(),col=PLD.col[PLD.tool];
  const hint=PLD.tool==='txt'?'Toca donde va el texto.':pldTouch()?'Un dedo dibuja · dos dedos mueven y acercan.':'Arrastra para dibujar · Espacio + arrastrar mueve el plano · rueda: acercar.';
  el.innerHTML=`<div class="plmt">${PLD_TOOLS.map(([k,i,nm])=>`<button type="button" class="ib${PLD.tool===k?' on':''}" data-pd="${k}" title="${nm}" aria-pressed="${PLD.tool===k}"><span aria-hidden="true">${i}</span> ${nm}</button>`).join('')}</div>
    <div class="plmx"><span class="pldcs" role="group" aria-label="Color">${PLD_COLS.map(([c,nm])=>`<button type="button" class="pldsw${c===col?' on':''}" data-pd="c:${c}" style="--sw:${c}" title="${nm}" aria-label="${nm}" aria-pressed="${c===col}"></button>`).join('')}</span>
      <button type="button" class="ib" data-pd="undo" title="Deshacer la última marca (Ctrl+Z)"${n||(PLD.clr&&PLD.clr.k===pldKey())?'':' disabled'}>↶ Deshacer</button><button type="button" class="ib" data-pd="clear"${n?'':' disabled'}>Limpiar</button>
      <span class="plvsp"></span>
      <button type="button" class="ib pri" data-pd="share" title="${pldTouch()?'Compartir la imagen (WhatsApp…)':'Copiar la imagen para pegarla en WhatsApp (Ctrl+V)'}">📷 ${pldTouch()?'Compartir':'Copiar imagen'}</button><button type="button" class="ib" data-pd="dl" title="Descargar la imagen" aria-label="Descargar la imagen">⤓</button>
      <button type="button" class="ib" data-pd="off" title="Salir de marcar (Esc); las marcas siguen visibles">✓ Listo</button></div>
    <small class="plms">${hint} ${n?`${n} marca${n>1?'s':''} en esta lámina${o?` · marcas en ${o} lámina${o>1?'s':''} más`:''}. `:''}No se guardan: se borran al cerrar el visor.</small>`;
  if(!document.activeElement||document.activeElement===document.body)PLV.box.focus()}

/* ---------- imagen para compartir ---------- */
const pldWait=ms=>new Promise(r=>setTimeout(r,ms));
const pldFrame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
function pldStamp(){const d=new Date(NOW()-LIMA_OFF),z=n=>String(n).padStart(2,'0');
  return{txt:`${z(d.getUTCDate())}/${z(d.getUTCMonth()+1)}/${d.getUTCFullYear()} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`,
    fn:`${d.getUTCFullYear()}${z(d.getUTCMonth()+1)}${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}`}}
/** lo que se ve en el visor (plano + marcas) con un rótulo abajo: lámina, revisión, fecha y quién */
async function pldImage(){const v=PLV.tv,p=PLB.get(PLV.id);if(!v||!p)return null;
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
