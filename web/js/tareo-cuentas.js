"use strict";
/* LPS 911 · Tareo: cuentas de capataz con usuario (DNI) y contraseña.
   Contrato en docs/ia/tareo.md («Cuentas de capataz (oct 2026)»). La cuenta la crea la función cuentaCapataz (functions/index.js,
   Admin SDK) con un correo sintético <dni>@tareo.lps911.pe que nunca recibe nada; el capataz entra con «Soy capataz» (login en base.js).
   tCapCuenta(dni): ventana para el administrador y el asistente de tareo (la abre «Hacer capataz» en Tareo › Personal).
   Globales con prefijo tCta/TCTA; CSS en el bloque «tareo: cuentas» de app.css. */
const TCTA_DOM='tareo.lps911.pe';
/* mismo criterio que ctaDni de functions/lib.js: 8 dígitos (7 → con cero a la izquierda) o carné de extranjería de 8 a 12 */
function tCtaDni(v){let d=String(v==null?'':v).trim().toUpperCase();if(/^\d{7}$/.test(d))d='0'+d;return/^[A-Z0-9]{8,12}$/.test(d)?d:''}
const tCtaMail=dni=>{const d=tCtaDni(dni);return d?d.toLowerCase()+'@'+TCTA_DOM:''};
const tCtaEs=m=>typeof m==='string'&&m.toLowerCase().endsWith('@'+TCTA_DOM);
/* contraseña propuesta: 6 dígitos al azar (fácil de dictar y de escribir en el celular) */
function tCtaClave(){let a;try{a=crypto.getRandomValues(new Uint32Array(6))}catch(e){a=Array.from({length:6},()=>Math.floor(Math.random()*1e6))}return Array.from(a,x=>x%10).join('')}
const tCtaPuede=()=>!!me&&(me.role==='admin'||me.role==='tasis'||isOwnerEmail(me.email));
/* estado de la cuenta según members: 'sin' · 'act' · 'off' */
function tCtaEstado(dni){const m=MEM.get(tCtaMail(dni));return!m?'sin':m.off?'off':'act'}
const TCTA_ST={sin:'SIN CUENTA',act:'CUENTA ACTIVA',off:'DESACTIVADA'};
/* capataces del tareo que entran con enlace (sesión anónima u_…): se les puede pasar sus obreros a la cuenta nueva */
function tCtaAnon(){const L=typeof tLive==='function'?tLive():[];return[...MEM.entries()].filter(([id,m])=>id.startsWith('u_')&&m&&m.role==='tcap'&&!m.off)
  .map(([id,m])=>({id,name:m.name||id,n:L.filter(p=>p.cap===id).length})).sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name))}
const tCtaUrl=()=>location.origin+location.pathname;
const tCtaTexto=(dni,clave)=>`Usuario: ${dni} · Contraseña: ${clave} · Entra a ${tCtaUrl()}`;
async function tCtaCall(data){if(!firebase.functions)throw Object.assign(new Error('No se cargó Firebase Functions: recarga la página.'),{code:'unavailable'});
  const r=await firebase.functions().httpsCallable('cuentaCapataz')(data);return(r&&r.data)||{}}
function tCtaErr(e){const c=String(e&&e.code||'').replace(/^functions\//,'');const m=String(e&&e.message||'');
  if(c==='unavailable'||c==='deadline-exceeded')return'Sin conexión con el servidor. Revisa tu internet y vuelve a intentar.';
  if(c==='internal'&&(!m||/^internal$/i.test(m)))return'El servidor no respondió. ¿Ya se instaló la función «cuentaCapataz» en Firebase? (docs/ia/tareo.md)';
  if(c==='unauthenticated')return'Tu sesión venció: vuelve a ingresar.';
  return m||('No se pudo completar ('+(c||'error')+').')}

let TCTA=null;
/** Ventana de la cuenta de capataz de un obrero del máster (por DNI). */
function tCapCuenta(dni){
  if(!tCtaPuede()){toast('Solo el administrador o el asistente de tareo crean cuentas de capataz.');return}
  const id=S.tper.has(String(dni))?String(dni):tCtaDni(dni);const p=S.tper.get(id);
  if(!p){toast('No se encontró la ficha de ese DNI en el máster.');return}
  if(!tCtaDni(id)){toast('El DNI de la ficha no es válido: corrígelo antes de crear la cuenta.');return}
  TCTA={dni:tCtaDni(id),clave:tCtaClave(),busy:false,msg:'',bad:false,ok:null};tCtaDraw()}
function tCtaDraw(){const T=TCTA;if(!T)return;const p=S.tper.get(T.dni)||{};const mail=tCtaMail(T.dni);const st=T.ok?'act':tCtaEstado(T.dni);
  const anon=tCtaAnon();const nObr=(typeof tLive==='function'?tLive():[]).filter(x=>x.cap===mail).length;const dis=T.busy?' disabled':'';
  const deSel=`<label class="lqlab">Pasar sus datos de (capataz que hoy entra con enlace)<select class="tin" id="tctaDe"${dis}><option value="">No pasar nada</option>${anon.map(a=>`<option value="${esc(a.id)}">${esc(a.name)} · ${a.n} ${a.n===1?'obrero':'obreros'}</option>`).join('')}</select></label>`;
  const pw=lbl=>`<label class="lqlab">${lbl}<span class="tcta-pw"><input class="tin mono" id="tctaPw" value="${esc(T.clave)}" autocomplete="off" spellcheck="false" maxlength="64"${dis}><button type="button" class="ib" data-tcta="gen"${dis}>Otra</button></span></label>`;
  let body;
  if(T.ok){const txt=tCtaTexto(T.dni,T.ok.clave);
    body=`<div class="callout tcta-ok"><p class="lqmsg ok">${esc(T.ok.msg)}</p><p class="tcta-txt mono" id="tctaTxt">${esc(txt)}</p>
     <div class="lqbtns lqbw"><button class="ib" data-tcta="copy">Copiar</button><a class="ib pri" id="tctaWa" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">Enviar por WhatsApp</a></div>
     <p class="note">Al entrar elige «Soy capataz». La contraseña no se vuelve a mostrar: si la olvida, usa «Cambiar contraseña».</p></div>
     <div class="lqbtns"><button class="ib" data-tcta="back">Listo</button></div>`}
  else if(st==='act'){
    body=`<p class="note">Entra con «Soy capataz»: usuario <b class="mono">${esc(T.dni)}</b> y su contraseña. Tiene ${nObr} ${nObr===1?'obrero asignado':'obreros asignados'}. Si pierde el celular, entra en otro con los mismos datos.</p>
     ${pw('Contraseña nueva')}<div class="lqbtns lqbw"><button class="ib pri" data-tcta="clave"${dis}>Cambiar contraseña</button></div>
     ${anon.length?`${deSel}<div class="lqbtns lqbw"><button class="ib" data-tcta="migrar"${dis}>Pasar sus obreros</button></div>`:''}
     <div class="lqbtns lqbw tcta-off"><button class="ib bad" data-tcta="off"${dis}>Desactivar cuenta</button></div>`}
  else if(p.arch)body=`<p class="lqmsg bad">La ficha está archivada: restáurala antes de crearle una cuenta.</p>`;
  else body=`<p class="note">${st==='off'?'La cuenta está desactivada. Al reactivarla se le pone una contraseña nueva.':'El capataz entrará con «Soy capataz» usando su <b>DNI</b> como usuario y esta contraseña, en cualquier celular. Ya no depende del enlace ni de los datos del navegador.'}</p>
     <label class="lqlab">Usuario<input class="tin mono" value="${esc(T.dni)}" readonly></label>${pw('Contraseña')}
     ${anon.length?deSel+'<p class="note">Sus obreros pasan a la cuenta nueva y el enlace de ese celular deja de funcionar. Los tareos ya hechos quedan con el usuario anterior.</p>':''}
     <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" data-tcta="crear"${dis}>${st==='off'?'Reactivar cuenta':'Crear cuenta de capataz'}</button></div>`;
  lqModal(`<div class="lqtop"><b>Cuenta de capataz</b><button class="kx" data-lqx aria-label="Cerrar">&times;</button></div>
   <div class="lqh"><b>${esc(tName(p))}</b><span class="mono">DNI ${esc(T.dni)}</span><span class="lqtags"><i class="lqt ${st==='act'?'t-ok':''}" id="tctaSt">${TCTA_ST[st]}</i></span></div>
   <div class="tcta">${body}</div><p class="lqmsg${T.bad?' bad':''}" id="tctaMsg" role="status">${esc(T.msg)}</p>`,e=>{const b=e.target.closest('[data-tcta]');if(b&&!b.disabled)tCtaAct(b.dataset.tcta)})}
async function tCtaAct(k){const T=TCTA;if(!T||T.busy)return;const pwI=$('#tctaPw'),deI=$('#tctaDe');if(pwI)T.clave=pwI.value;const de=deI?deI.value:'';
  const msg=(t,bad)=>{T.msg=t;T.bad=!!bad;const el=$('#tctaMsg');if(el){el.textContent=t;el.classList.toggle('bad',!!bad)}};
  if(k==='gen'){T.clave=tCtaClave();tCtaDraw();return}
  if(k==='back'){T.ok=null;T.clave=tCtaClave();T.msg='';tCtaDraw();return}
  if(k==='copy'){const txt=tCtaTexto(T.dni,T.ok.clave);try{await navigator.clipboard.writeText(txt);toast('Copiado.')}catch(e){const r=document.createRange();const el=$('#tctaTxt');if(el){r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}toast('Selecciona el texto y cópialo.')}return}
  const clave=T.clave.trim();
  if((k==='crear'||k==='clave')&&(clave.length<6||clave!==T.clave))return msg('La contraseña debe tener al menos 6 caracteres, sin espacios.',true);
  const p=S.tper.get(T.dni)||{};const ant=de?tCtaAnon().find(a=>a.id===de):null;
  if(k==='migrar'&&!de)return msg('Elige de qué capataz con enlace se pasan los obreros.',true);
  if(de&&!await uiAsk({title:'¿Pasar sus datos?',text:`Los ${ant?ant.n:0} obreros de ${ant?ant.name:de} pasan a la cuenta de ${tName(p)}. El enlace de ese celular deja de funcionar (tendrá que entrar con «Soy capataz»). Los tareos ya hechos quedan con el usuario anterior.`,ok:'Pasar',tone:'warn'}))return;
  if(k==='off'&&!await uiAsk({title:'¿Desactivar la cuenta?',text:`${tName(p)} ya no podrá entrar al tareo. Sus obreros siguen asignados a él (reasígnalos en Personal) y sus tareos no se borran. Puedes reactivarla luego con una contraseña nueva.`,ok:'Desactivar',tone:'danger'}))return;
  const data={accion:{crear:'crear',clave:'clave',off:'desactivar',migrar:'migrar'}[k],dni:T.dni};if(k==='crear'||k==='clave')data.clave=clave;if(de&&(k==='crear'||k==='migrar'))data.de=de;
  const st0=tCtaEstado(T.dni);T.busy=true;tCtaDraw();msg({crear:'Creando la cuenta…',clave:'Cambiando la contraseña…',off:'Desactivando…',migrar:'Pasando los obreros…'}[k]);
  try{const r=await tCtaCall(data);T.busy=false;T.msg='';T.bad=false;const pas=r.n?` · ${r.n} ${r.n===1?'obrero pasó':'obreros pasaron'} a su cuenta`:'';
    if(k==='crear')T.ok={clave,msg:(st0==='off'?'Cuenta reactivada':'Cuenta creada')+pas+'. Envíale sus datos:'};
    else if(k==='clave')T.ok={clave,msg:'Contraseña cambiada. Envíale sus datos nuevos:'};
    else{toast(k==='off'?'Cuenta desactivada.':'Listo'+pas+'.');if(k==='off'){lqClose();TCTA=null;return}}
    tCtaDraw()}
  catch(e){T.busy=false;tCtaDraw();msg(tCtaErr(e),true)}}
