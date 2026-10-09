"use strict";
/* LPS 911 · Especialidades (oct 2026, decidido con el dueño): UNA lista para toda la obra, en Configuración
   (meta/project.esps = {id:{n, arch?, fus?}}). Cada subcontratista tiene UNA especialidad (contractors.esp = id): si un SC
   hace dos, se registra como dos SC («ICR-ACI» e «ICR-DACI») para que los indicadores salgan por separado. Las actividades
   del catálogo toman la de su SC (mcat.esp antiguo ya no se usa) y las láminas del Plan diario eligen de la misma lista
   (laminas.esp = id). Como se guarda el id, renombrar en Configuración se refleja en todo el sistema.
   Textos antiguos escritos a mano (sin id) se muestran tal cual hasta que se registran («Registrar en la lista»).
   Ver docs/ia/datos.md. */

const ESP_BASE=['Arquitectura','Estructuras','Instalaciones eléctricas','Instalaciones sanitarias','Agua contra incendio','Aire acondicionado','Comunicaciones','Cielo raso','Enchapes','Carpintería','Fachada'];
const espMap=()=>P().esps||{};
const espIsId=v=>!!v&&typeof v==='string'&&Object.prototype.hasOwnProperty.call(espMap(),v);
/** nombre visible: el de la lista si es un id (también archivada o fusionada), si no el texto antiguo tal cual */
function espN(v){if(!v)return'';const M=espMap();let o=M[v];let k=0;while(o&&o.fus&&M[o.fus]&&k++<5)o=M[o.fus];return o?o.n:String(v)}
/** id efectivo (sigue las fusiones) */
function espId(v){const M=espMap();let id=v,k=0;while(M[id]&&M[id].fus&&M[M[id].fus]&&k++<5)id=M[id].fus;return id}
function espList(all){return Object.entries(espMap()).map(([id,o])=>({id,...o})).filter(e=>all||(!e.arch&&!e.fus)).sort((a,b)=>String(a.n).localeCompare(String(b.n)))}
const espOfSc=sc=>espN((S.con.get(sc)||{}).esp);
function espFind(name){const k=mnk(name);if(!k)return null;const L=espList(true).filter(e=>mnk(e.n)===k);return L.find(e=>!e.arch&&!e.fus)||L[0]||null}
/** opciones de un <select>; con «＋ Nueva especialidad…» si puede editar la configuración */
function espOpts(sel,o){o=o||{};const L=espList();const nuevo=o.nuevo??canWrite;sel=sel&&espIsId(sel)?espId(sel):sel;
  let h=o.blank===false?'':'<option value="">—</option>';h+=L.map(e=>`<option value="${esc(e.id)}"${e.id===sel?' selected':''}>${esc(e.n)}</option>`).join('');
  if(sel&&!L.some(e=>e.id===sel))h+=`<option value="${esc(sel)}" selected>${esc(espN(sel))}${espIsId(sel)?' (archivada)':' (sin registrar)'}</option>`;
  if(nuevo)h+='<option value="__new">＋ Nueva especialidad…</option>';return h}
const espNewId=i=>'e'+NOW().toString(36)+(i?String(i):'');
function espSave(esps,label){apply([op('meta','project',{...P(),esps})],label)}
/** pide el nombre y la agrega a la lista (si ya existe con otra escritura usa la existente); devuelve el id o null */
async function espNew(){if(!canWrite)return null;const t=await uiAsk({title:'Nueva especialidad',input:{label:'Nombre (p. ej. Agua contra incendio)',required:true},ok:'Agregar',tone:'info'});
  const v=t?String(t).replace(/\s+/g,' ').trim():'';if(!v)return null;const ex=espFind(v);
  if(ex){if(ex.arch){const M={...espMap()};M[ex.id]={...M[ex.id]};delete M[ex.id].arch;espSave(M,`Especialidad «${ex.n}» restaurada`)}else if(ex.n!==v)toast(`Ya existía como «${ex.n}»: se usa esa.`);return espId(ex.id)}
  const id=espNewId();espSave({...espMap(),[id]:{n:v}},`Especialidad «${v}» agregada`);return id}
/** para un <select> con espOpts: si eligió «Nueva…», la crea; devuelve el id elegido o null si canceló */
async function espPick(sel,prev){if(sel.value!=='__new')return sel.value;const id=await espNew();if(!id){sel.value=prev||'';return null}
  if(![...sel.options].some(o=>o.value===id)){const o=document.createElement('option');o.value=id;o.textContent=espN(id);sel.insertBefore(o,sel.lastElementChild)}sel.value=id;return id}

/* ---- textos antiguos (escritos a mano antes de la lista) ---- */
/** especialidades del catálogo antiguo (mcat.esp) por SC: {sc:{texto:n}} — sirve para sugerir la del SC y avisar si tiene varias */
function espCatTally(){const T={};if(typeof MX==='undefined')return T;for(const c of MX.cat.values()){if(c.arch||!c.sc||!c.esp)continue;const e=espN(c.esp);const o=T[c.sc]=T[c.sc]||{};o[e]=(o[e]||0)+1}return T}
function espLegacyTexts(){const L=[];for(const c of S.con.values())if(c.esp&&!espIsId(c.esp))L.push(c.esp);return L}

/** registrar en la lista los textos antiguos: SC (y su especialidad más usada en el catálogo si no tenía), láminas y la lista base */
async function espMigrate(){if(!canWrite)return;const M={...espMap()};const first=!Object.keys(M).length;let i=0;const made=[];
  const idOf=txt=>{const v=String(txt||'').replace(/\s+/g,' ').trim();if(!v)return'';if(espIsId(v))return espId(v);const k=mnk(v);
    for(const[id,o]of Object.entries(M))if(mnk(o.n)===k&&!o.fus)return id;const id=espNewId(++i);M[id]={n:v};made.push(v);return id};
  if(first)ESP_BASE.forEach(idOf);
  const tally=espCatTally();const ops=[];const scs=[];
  for(const c of [...S.con.values()].sort((a,b)=>a.name.localeCompare(b.name))){let v=c.esp;
    if(!v){const t=Object.entries(tally[c.id]||{}).sort((a,b)=>b[1]-a[1])[0];if(t)v=t[0]}
    if(!v||espIsId(v))continue;const id=idOf(v);if(id&&id!==c.esp){ops.push(op('contractors',c.id,{...c,esp:id}));scs.push(`${c.name}: ${M[id].n}`)}}
  let lams=[];try{lams=(await fcol('laminas').get()).docs.map(d=>({id:d.id,esp:d.data().esp})).filter(l=>l.esp&&!espIsId(l.esp)&&l.esp!=='Plano base')}catch(e){}
  const lup=lams.map(l=>[l.id,idOf(l.esp)]).filter(([,id])=>id);
  if(!made.length&&!ops.length&&!lup.length){toast('No hay nada por registrar: todo ya usa la lista.');return}
  const ok=await uiAsk({title:'Registrar especialidades en la lista',text:'Las especialidades escritas a mano pasan a la lista única. Desde ahí se renombran y el cambio se ve en todo el sistema.',
    list:[made.length?`Se agregan ${made.length} a la lista: ${made.join(', ')}.`:'',scs.length?`${scs.length} subcontratista(s) quedan con su especialidad: ${scs.join(' · ')}.`:'',lup.length?`${lup.length} lámina(s) del Plan diario quedan ligadas a la lista.`:''].filter(Boolean),
    note:'Revisa después la lista: si dos especialidades son la misma, usa «Fusionar».',ok:'Registrar',tone:'info'});if(!ok)return;
  apply([op('meta','project',{...P(),esps:M}),...ops],'Especialidades registradas en la lista');
  if(lup.length)try{for(let k=0;k<lup.length;k+=400){const bt=db.batch();lup.slice(k,k+400).forEach(([id,e])=>bt.set(fcol('laminas').doc(id),{esp:e},{merge:true}));await bt.commit()}}catch(e){toast('Las láminas no se pudieron actualizar: '+(e&&e.code||e))}}

/* ---- tarjeta de Configuración ---- */
function espCard(){const L=espList();const arch=espList(true).filter(e=>e.arch&&!e.fus);const use={};for(const c of S.con.values()){const id=espIsId(c.esp)?espId(c.esp):'';if(id)(use[id]=use[id]||[]).push(c)}
  const legacy=[...new Set(espLegacyTexts())];const noEsp=[...S.con.values()].filter(c=>!c.esp).length;const ro=canWrite?'':' readonly';
  return`<div class="card" id="espcard"><h2>Especialidades <span class="sub">Una sola lista para la obra: subcontratistas, catálogo, AR y láminas del Plan diario. Al renombrar, cambia en todo el sistema.</span></h2>
   ${legacy.length||(!L.length&&canWrite)?`<div class="callout">${legacy.length?`Hay ${legacy.length} especialidad(es) escrita(s) a mano que todavía no están en la lista: <b>${legacy.map(esc).join(', ')}</b>.`:'La lista está vacía.'}${canWrite?' <button class="ib pri" id="espmig">Registrar en la lista…</button>':''}</div>`:''}
   <div class="tscroll"><table class="t rt"><thead><tr><th>Especialidad</th><th>Subcontratistas</th><th></th></tr></thead><tbody>
   ${L.map(e=>{const u=use[e.id]||[];return`<tr><td data-l="Especialidad"><input class="ci" data-esn="${esc(e.id)}" value="${esc(e.n)}" aria-label="Nombre de la especialidad"${ro}></td>
     <td data-l="Subcontratistas">${u.length?u.map(c=>`<span class="mxsw" style="--c:${esc(c.color)}"></span>${esc(c.name)}`).join(' · '):'<span class="mu">Ninguno</span>'}</td>
     <td>${canWrite?`<button class="ab" data-esm="${esc(e.id)}" aria-label="Más acciones" title="Fusionar, archivar">⋮</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="3" class="note">Sin especialidades todavía.</td></tr>'}
   </tbody></table></div>
   <div class="pad">${canWrite?'<button class="ib" id="espadd">+ Especialidad</button> ':''}${noEsp?`<span class="note">${noEsp} subcontratista(s) sin especialidad.</span>`:''}
   ${arch.length?`<p class="note">Archivadas: ${arch.map(e=>`${esc(e.n)}${canWrite?` <button class="lnkb" data-esres="${esc(e.id)}">restaurar</button>`:''}`).join(' · ')}</p>`:''}</div></div>`}
/** aviso por SC: en el catálogo antiguo sus actividades tienen varias especialidades → conviene separarlo en dos SC */
function espScHint(c,tally){const t=Object.entries((tally||{})[c.id]||{});if(t.length<2)return'';t.sort((a,b)=>b[1]-a[1]);
  return`<small class="note" style="display:block" title="Para que los indicadores salgan por especialidad, registra un subcontratista por cada una (p. ej. «ICR-ACI» e «ICR-DACI») y pasa sus actividades en el Catálogo">⚠ En el catálogo: ${t.map(([k,n])=>`${esc(k)} (${n})`).join(', ')}</small>`}
function espWire(main){const box=$('#espcard',main);if(!box)return;
  box.onchange=e=>{const t=e.target;if(!canWrite||!t.dataset.esn)return;const id=t.dataset.esn;const v=t.value.replace(/\s+/g,' ').trim();const o=espMap()[id];if(!o)return;
    if(!v){t.value=o.n;return}if(v===o.n)return;const ex=espFind(v);if(ex&&ex.id!==id&&!ex.fus){toast(`Ya existe «${ex.n}». Si son la misma, usa ⋮ › Fusionar.`);t.value=o.n;return}
    espSave({...espMap(),[id]:{...o,n:v}},`Especialidad: «${o.n}» → «${v}» (se ve así en todo el sistema)`)};
  box.onclick=async e=>{if(!canWrite)return;const b=e.target.closest('button');if(!b)return;
    if(b.id==='espmig'){espMigrate();return}
    if(b.id==='espadd'){espNew();return}
    if(b.dataset.esres){const M={...espMap()};const o={...M[b.dataset.esres]};delete o.arch;M[b.dataset.esres]=o;espSave(M,`«${o.n}» restaurada`);return}
    if(b.dataset.esm){const id=b.dataset.esm;const o=espMap()[id];if(!o)return;const used=[...S.con.values()].filter(c=>espId(c.esp)===id);
      openPop(b,`<div class="ph">${esc(o.n)}</div><button data-do="fus">Fusionar con otra…</button>${used.length?`<div class="ptx">Para archivarla, primero cambia la especialidad de ${used.length} subcontratista(s) o fusiónala.</div>`:'<button data-do="arc" class="danger">Archivar</button>'}`,
        {fus:()=>espMergeDlg(id),arc:()=>{const M={...espMap()};M[id]={...o,arch:{t:NOW(),by:me.email}};espSave(M,`«${o.n}» archivada`)}})}}}
/** fusionar a → b: los SC y las láminas pasan a b; a queda como alias (espN sigue mostrando b) */
function espMergeDlg(a){const A=espMap()[a];if(!A)return;const L=espList().filter(e=>e.id!==a);
  lqModal(`<div class="lqtop"><b>Fusionar «${esc(A.n)}»</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
   <div class="mxform"><label>Es la misma especialidad que<select id="espfb"><option value="">— elegir —</option>${L.map(e=>`<option value="${esc(e.id)}">${esc(e.n)}</option>`).join('')}</select></label></div>
   <p class="note">Los subcontratistas y las láminas del Plan diario con «${esc(A.n)}» pasan a la elegida. «${esc(A.n)}» deja de salir en la lista.</p><p class="note" id="espfm"></p>
   <div class="lqbtns"><button class="ib" data-lqx>Cancelar</button><button class="ib pri" id="espfok">Fusionar</button></div>`,
   async e=>{const bt=e.target.closest('#espfok');if(!bt)return;const b=$('#espfb').value;if(!b){$('#espfm').textContent='Elige con cuál se fusiona.';return}bt.disabled=true;
     const M={...espMap()};M[a]={...A,fus:b,arch:{t:NOW(),by:me.email}};
     const ops=[op('meta','project',{...P(),esps:M}),...[...S.con.values()].filter(c=>c.esp===a).map(c=>op('contractors',c.id,{...c,esp:b}))];
     apply(ops,`«${A.n}» fusionada con «${M[b].n}»`);lqClose();
     try{const ds=(await fcol('laminas').where('esp','==',a).get()).docs;for(let k=0;k<ds.length;k+=400){const B=db.batch();ds.slice(k,k+400).forEach(d=>B.set(d.ref,{esp:b},{merge:true}));await B.commit()}}catch(err){/* espN ya muestra la nueva por la fusión */}})}
