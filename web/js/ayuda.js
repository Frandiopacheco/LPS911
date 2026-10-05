"use strict";
/* LPS 911 · Ayuda: tutorial por rol (lecciones con ejemplos, contenido en tutorial.js) y flujogramas de cómo funciona el sistema, según el rol de quien la abre.
   Se abre con el botón «? Ayuda» de la barra superior, el menú «Más» del celular y el menú del capataz.
   No pesa en el arranque: los flujogramas se arman solo al abrir la ventana.
   El administrador puede ver los flujos de cualquier rol (para capacitar); los demás, solo los suyos.
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */

/* Nodos de un flujo:
   {o:'texto'}                         inicio / fin (óvalo)
   {p:'paso', d:'detalle', tab:'look', w:'quién'}   paso; con tab, tocarlo lleva a esa pestaña (si el rol puede abrirla)
   {q:'¿pregunta?', y:[…], n:[…], yl:'Sí', nl:'No'}   decisión con dos caminos que luego siguen juntos
   {r:'texto'}                         nota de retorno («vuelve a …») al final de un camino */
const AY_FLOWS={
  ciclo:{t:'Ciclo Last Planner',s:'Cómo se mueve la información en la obra durante la semana, de la programación a la medición.',n:[
    {o:'Programación de la obra'},
    {p:'Lookahead',d:'El ingeniero de producción programa las actividades por piso, sector y ambiente.',tab:'look',w:'Producción'},
    {p:'Propuestas de los subcontratistas',d:'Cada SC propone cambios de su partida antes del corte semanal (por defecto sábado 13:00).',tab:'look',w:'SC'},
    {p:'Análisis de restricciones',d:'Lo que impide trabajar se registra y cada responsable lo libera.',tab:'restr',w:'Todos'},
    {p:'Reunión semanal (viernes)',d:'Se acuerda el compromiso de la semana siguiente.',tab:'plan',w:'Producción y SC'},
    {q:'¿Se congeló la semana a mano?',y:[{p:'Semana congelada',d:'El compromiso queda fijo para medir el PPC semanal.'}],n:[{p:'Congelado automático',d:'El servidor la congela en el corte (sábado 13:00 por defecto).'}]},
    {p:'Reunión diaria: plan del día siguiente',d:'Va / No va, cruces entre partidas y cuadrillas.',tab:'mapa',w:'Producción y SC'},
    {q:'¿Se publicó el plan al terminar la reunión?',y:[{p:'Plan publicado y cerrado'}],n:[{p:'Publicación automática (por defecto 21:00)',d:'Se aplican los cambios de la reunión; las propuestas del SC sin revisar se rechazan (va lo programado).'}]},
    {p:'Ejecución en obra',d:'El SC y sus capataces inician y detienen; al final del día (≈ 4 pm) proponen el cierre.',tab:'cap',w:'SC y capataces'},
    {p:'Registro de cumplimiento',d:'El ingeniero confirma lo propuesto o, si nadie lo propuso, registra Cumplido / No cumplido con su causa.',tab:'campo',w:'Campo'},
    {p:'PPC diario y semanal',d:'Se mide contra lo comprometido; los no cumplidos llevan causa e imputabilidad.',tab:'ind',w:'Producción'},
    {o:'Se actualiza el lookahead y empieza otra semana'}]},

  look:{t:'Actualizar el lookahead',s:'Cambios directos en la programación (administrador y editores).',n:[
    {o:'Abrir el Lookahead'},
    {p:'Tocar «✎ Editar»',d:'El lookahead abre en modo consulta para evitar cambios por accidente.',tab:'look'},
    {p:'Crear, mover o cambiar actividades',d:'Arrastra las barras, usa ⋮ › Mover en bloque o Ctrl+clic para varias. Ctrl+Z deshace.'},
    {q:'¿El cambio toca un día con el plan ya cerrado?',y:[{p:'No se aplica',d:'Hoy y los días publicados no se reprograman. Solo el administrador puede reabrir el día.'},{r:'Se corrige en el plan diario o se pide reabrir'}],n:[{p:'Se guarda al momento',d:'Queda en «🕑 Historial» con quién y cuándo.'}]},
    {p:'Tocar «✓ Terminar edición»'},
    {o:'El equipo ve el cambio en vivo'}]},

  prop:{t:'Revisar propuestas de los SC',s:'Cuando un subcontratista envía cambios de su partida.',n:[
    {o:'Llega una propuesta'},
    {p:'Tarjeta «Propuestas por revisar»',d:'En Hoy, con el número de cambios por SC.',tab:'hoy'},
    {q:'¿El piso está a tu cargo?',y:[{p:'Revisión en el Lookahead',d:'La grilla muestra la propuesta; al pasar el mouse dice el cambio en palabras.',tab:'look'}],n:[{p:'La decide el responsable del piso',d:'Si el piso no tiene responsable, cualquier editor o el administrador.'},{r:'Fin para ti'}]},
    {q:'¿Llegó fuera de plazo (después del corte)?',y:[{p:'Marcada «FUERA DE PLAZO»',d:'Para aceptarla se pide el motivo.'}],n:[{p:'Dentro del plazo'}]},
    {q:'¿Choca con un cambio oficial posterior?',y:[{p:'El sistema pregunta qué hacer',d:'«Aceptar todo» deja esas pendientes.'}],n:[{p:'Sin conflicto'}]},
    {q:'¿Aceptar?',y:[{p:'Aceptar',d:'Pasa al lookahead oficial; se puede deshacer con Ctrl+Z.'}],n:[{p:'Rechazar',d:'No pide motivo.'}]},
    {o:'El SC ve la respuesta en «Respuestas»'}]},

  pdEng:{t:'Reunión diaria: plan del día siguiente',s:'Lo que decide el ingeniero en el Plan diario la víspera.',n:[
    {o:'Abrir el Plan diario'},
    {p:'Día hábil siguiente',d:'Se abre solo en ese día. «Modo reunión › Plan e interferencias» para proyectar.',tab:'mapa'},
    {p:'Revisar «Por decidir»',d:'Propuestas del SC (No va, Culminado). Botón «Revisar». Hay que revisarlas todas para publicar (el administrador puede aceptarlas o rechazarlas todas).'},
    {p:'Revisar los cruces',d:'Dos o más partidas en el mismo lugar: ordenar 1.º, 2.º… o «Todas pueden trabajar a la vez».'},
    {q:'¿La actividad va?',y:[{p:'Va',d:'Sigue programada.'}],n:[
      {p:'No va: elegir la causa',d:'Personal, frente no entregado, programación, materiales, calidad, equipos…'},
      {q:'¿Se libera a primera hora?',y:[{p:'Aviso en el plano + restricción por liberar'}],n:[{p:'Restricción + reprogramar',d:'«Solo esta» o «todo el tren» del ambiente.'}]}]},
    {p:'Al terminar la reunión: «📣 Publicar plan»',d:'Aplica las reprogramaciones al lookahead y cierra el día. Se puede deshacer desde el aviso (todo o nada).'},
    {q:'¿Nadie publicó?',y:[{p:'Se publica solo (por defecto 21:00)',d:'Con los cambios de la reunión; las propuestas sin revisar se rechazan.'}],n:[{p:'Plan cerrado'}]},
    {o:'Durante el día solo se registra el cumplimiento y se reparten cuadrillas'}]},

  sem:{t:'Semana: congelar y medir el PPC',s:'Del compromiso del viernes al PPC semanal.',n:[
    {o:'Reunión semanal (viernes)'},
    {p:'Congelar la semana',d:'PPC semanal › Congelar. Si quedan propuestas sin decidir, avisa antes.',tab:'plan'},
    {q:'¿Se congeló antes del corte?',y:[{p:'Congelada a mano'}],n:[{p:'Congelado automático',d:'Sábado 13:00 por defecto (Configuración › Proyecto).'}]},
    {p:'Durante la semana: registros de campo',tab:'campo'},
    {p:'«Aplicar registros de campo»',d:'Trae cumplimiento, causa e imputabilidad de lo registrado.',tab:'plan'},
    {p:'Evaluar los no cumplidos',d:'Causa (cuadro de la empresa), detalle, mitigación y «Responde» si falló otra partida.'},
    {p:'PPC del piso y PPC del SC',d:'El del SC no cuenta lo que no le es imputable.',tab:'ind'},
    {p:'Exportar Excel',d:'Formato de la empresa (PPC semanal + PPC del SC).'},
    {o:'Las causas alimentan Indicadores'}]},

  campo:{t:'Registro diario en Campo',s:'Cumplimiento de las actividades programadas del día.',n:[
    {o:'Abrir Campo (día de hoy)'},
    {p:'Lista de actividades programadas',d:'Filtradas por piso; incluye lo que reportaron los capataces.',tab:'campo'},
    {q:'¿El capataz ya cerró la actividad?',y:[{p:'«Confirmar» su cierre',d:'Si nadie lo verifica, se acepta solo a las 23:30.'}],n:[{p:'Registrar a mano'}]},
    {q:'¿Se cumplió?',y:[
      {q:'¿Con menos de lo programado?',yl:'Sí',nl:'No',y:[{p:'Excepción con motivo o pasa a No cumplido'}],n:[{p:'Cumplido'}]}],
     n:[{p:'Parcial / No cumplido',d:'Elegir la causa; se puede reprogramar el saldo.'}]},
    {p:'Fotos y nota (opcional)'},
    {q:'¿La actividad terminó?',y:[{p:'Marcar terminada',d:'Se raya en el lookahead; se puede reabrir.'}],n:[{p:'Sigue en el lookahead'}]},
    {o:'Alimenta el PPC diario y semanal'}]},

  np:{t:'Trabajo no programado',s:'Lo que se ve en obra y no está en el plan del día.',n:[
    {o:'Recorrido de obra'},
    {p:'Campo › Plano',d:'Lámina del piso con lo programado.',tab:'campo'},
    {p:'«＋ No programado» y tocar el lugar',d:'Primero el botón (evita abrirlo sin querer al desplazarte); luego el lugar: ambiente según el punto, subcontratista, qué hacen y foto.'},
    {p:'Guardar',d:'Se ve en el Plan diario («Visto en obra»), Hoy, Indicadores y reportes. No cambia el PPC.'},
    {q:'¿Debe quedar programado?',y:[{p:'«Pasarlo al lookahead»',d:'Lo hace el ingeniero.'}],n:[{p:'Queda como registro'}]},
    {o:'Fin'}]},

  restr:{t:'Restricciones',s:'Desde que algo impide trabajar hasta que se libera.',n:[
    {o:'Se detecta algo que impide trabajar'},
    {q:'¿Dónde se detectó?',yl:'En la reunión diaria',nl:'En el análisis',y:[{p:'«No va» en el Plan diario',d:'Crea la restricción con su causa automáticamente.',tab:'mapa'}],n:[{p:'Registrar en Restricciones',d:'Amarrada a su actividad del lookahead (el SC, solo de su partida).',tab:'restr'}]},
    {p:'Responsable, área y fecha requerida'},
    {p:'El área da su compromiso',d:'Fecha de compromiso y observaciones (van al Excel AR).'},
    {q:'¿Se liberó?',y:[{p:'Liberar',d:'Queda quién y cuándo la liberó.'}],n:[{p:'Sigue pendiente',d:'Marca «R» en el lookahead y cuenta en Hoy.'},{r:'Se revisa en la siguiente reunión'}]},
    {o:'La actividad puede ejecutarse'}]},

  propSc:{t:'Proponer cambios al lookahead',s:'El subcontratista no cambia el lookahead: propone y el ingeniero decide.',n:[
    {o:'Abrir el Lookahead'},
    {p:'Modo propuesta',d:'Solo tu partida. No se crean ambientes ni sectores.',tab:'look'},
    {p:'Hacer los cambios',d:'Fechas, cantidades o actividades nuevas. Quedan como borrador.'},
    {p:'Enviar',d:'Se envía al ingeniero responsable del piso.'},
    {q:'¿Se envió antes del corte (sábado 13:00)?',y:[{p:'Dentro del plazo'}],n:[{p:'Llega «FUERA DE PLAZO»',d:'Igual se recibe; si la aceptan, piden motivo.'}]},
    {q:'¿La aceptaron?',y:[{p:'Pasa al lookahead oficial'}],n:[{p:'Rechazada',d:'Puedes corregir y volver a enviar.'},{r:'Vuelve a «Hacer los cambios»'}]},
    {o:'Ves cada respuesta en «Respuestas»'}]},

  pdSc:{t:'Plan diario del subcontratista',s:'Lo que llenas antes de la reunión diaria.',n:[
    {o:'Abrir el Plan diario'},
    {p:'Día hábil siguiente',d:'Tus actividades programadas en el plano.',tab:'mapa'},
    {q:'¿Cada actividad va?',yl:'Va',nl:'No va / Culminado',y:[{p:'Va'}],n:[{p:'Proponer con la causa',d:'Queda «en espera» (gris); el lookahead no cambia hasta que el ingeniero decida.'}]},
    {p:'Equipo del día',d:'Personal por cuadrilla y horario. Arrastra cada cuadrilla al número de la actividad (en celular: tocar ficha y luego actividad).'},
    {p:'Reunión diaria',d:'El ingeniero revisa tus propuestas y los cruces y publica el plan al terminar. Lo que nadie revisó hasta la hora de cierre (por defecto 21:00) va según lo programado.'},
    {o:'El plan publicado es el compromiso del día'}]},

  obraSc:{t:'En obra: el día de tu partida',s:'Seguimiento de lo programado hoy.',n:[
    {o:'Abrir En obra'},
    {p:'Actividades de hoy',d:'Las de tu partida, por piso.',tab:'cap'},
    {p:'«Iniciar» / «Detener…»',d:'Tú o tus capataces (desde su celular). Detener pide el motivo.'},
    {p:'Cierre del día (≈ 4 pm)',d:'Tú o tus capataces proponen Cumplido / No cumplido con su causa. Si nadie lo propone, el ingeniero lo registra igual.'},
    {q:'¿El ingeniero verificó el cierre?',y:[{p:'Confirmado en Campo'}],n:[{p:'Se acepta solo a las 23:30'}]},
    {o:'Cuenta en el PPC'}]},

  libSol:{t:'Solicitar una liberación de calidad',s:'El SC la pide cuando la necesita; el lookahead solo sugiere actividades.',n:[
    {o:'Actividad lista para inspección'},
    {p:'Liberaciones › + Solicitar',d:'Busca en el lookahead y elige una o varias; si no está, «Solicitar lo escrito» (qué se libera y en qué ambiente).',tab:'lib',w:'SC, producción o Calidad'},
    {p:'Datos de la solicitud',d:'Fecha en que estará lista, hora sugerida, protocolo y comentario.'},
    {q:'¿Se pidió un día antes (hasta las 18:00)?',y:[{p:'Dentro del plazo'}],n:[{p:'Fuera de plazo',d:'Calidad decide si la programa.'}]},
    {p:'Calidad programa la inspección',d:'La arrastra a «Programadas»: fecha, hora e inspector. Se ubica en el plano.'},
    {q:'¿Conforme?',y:[{p:'Liberada',d:'O liberada con observaciones menores.'}],n:[{p:'Observada',d:'Se corrige y se toca «Observaciones levantadas · pedir reinspección».'},{r:'Vuelve a «Solicitadas» para programarla otra vez'}]},
    {o:'Si Calidad la marcó crítica, libera la partida siguiente'}]},

  libCal:{t:'Liberaciones: programar e inspeccionar',s:'Trabajo de Calidad con las solicitudes.',n:[
    {o:'Llega una solicitud'},
    {p:'Revisar la solicitud',d:'Del SC, producción o Calidad, un día antes; puede ser de algo fuera del lookahead.',tab:'lib'},
    {q:'¿Está en plazo?',y:[{p:'Programar inspección',d:'Arrastra la tarjeta a «Programadas» (Ctrl+clic para varias a la vez).'}],n:[{q:'¿Se atiende igual?',y:[{p:'Programar inspección'}],n:[{p:'Anular solicitud'},{r:'Fin'}]}]},
    {p:'Al programar: marcas',d:'Día, hora e inspector con un toque; si es crítica (sugiere qué restringe) y si requiere supervisión.'},
    {p:'Inspección en obra',d:'Fecha, hora e inspector; ubicada en el plano.'},
    {q:'¿Conforme?',y:[{p:'Arrastrar a «Liberadas»',d:'Conforme o con observaciones menores. Solo desde «Programadas».'}],n:[{p:'Arrastrar a «Observadas»',d:'El SC levanta y pide reinspección.'},{r:'Vuelve a «Solicitadas»'}]},
    {o:'Liberada: la partida siguiente puede avanzar'}]},

  cap:{t:'Reportar desde el celular (capataz)',s:'Tu partida, día a día.',n:[
    {o:'Entrar con el enlace o QR del ingeniero'},
    {p:'Escribir tu nombre',d:'Solo la primera vez.'},
    {p:'Ver las actividades de hoy',d:'Solo las de tu partida.'},
    {p:'«Iniciar» al empezar'},
    {q:'¿Hubo que parar?',y:[{p:'«Detener…» con el motivo'},{r:'Vuelve a «Iniciar» cuando se retome'}],n:[{p:'Sigue en marcha'}]},
    {p:'«Cerrar el día…»',d:'Avance y fotos.'},
    {o:'El ingeniero lo verifica (o se acepta solo a las 23:30)'}]},

  area:{t:'Restricciones de tu área',s:'Oficina Técnica, Calidad u otra área de apoyo.',n:[
    {o:'Abrir Hoy o Restricciones'},
    {p:'Filtrar por tu área',d:'«La libera»: las que te toca resolver.',tab:'restr'},
    {p:'Dar el compromiso',d:'Fecha de compromiso y observaciones (salen en el Excel AR).'},
    {q:'¿Se resolvió?',y:[{p:'Liberar'}],n:[{p:'Actualizar el compromiso'},{r:'Se revisa en la siguiente reunión'}]},
    {o:'Producción ve la restricción liberada'}]},

  consulta:{t:'Consultar la información',s:'Qué mirar sin cambiar nada.',n:[
    {o:'Entrar'},
    {p:'Hoy',d:'Resumen de lo que pasa hoy.',tab:'hoy'},
    {p:'Tablero',d:'Avance en vivo de la obra.',tab:'dash'},
    {p:'Lookahead',d:'Programación vigente (solo lectura).',tab:'look'},
    {p:'Restricciones y liberaciones',tab:'restr'},
    {p:'Indicadores',d:'PPC diario y semanal, causas, reprogramaciones.',tab:'ind'},
    {o:'Exportar a Excel o PDF si lo necesitas'}]},

  team:{t:'Equipo y accesos',s:'Solo el administrador.',n:[
    {o:'Abrir Equipo'},
    {p:'Agregar el correo con su rol',d:'Editor, campo, SC, área, veedor o lector.',tab:'team'},
    {q:'¿Qué rol tiene?',yl:'Editor',nl:'SC / Área',y:[{p:'Asignar sus pisos',d:'Responsable de piso: decide propuestas y el plan diario ahí.'}],n:[{p:'Asignar su partida o su área',d:'Si el área contiene «Calidad», maneja liberaciones.'}]},
    {p:'La persona crea su cuenta',d:'«¿Primera vez? Crear mi cuenta» y confirma su correo.'},
    {p:'Capataces: invitación por QR',d:'Desde En obra o Equipo.'},
    {o:'Hoy avisa los pisos sin responsable'}]},

  cierre:{t:'Reabrir un día cerrado',s:'Solo el administrador, con motivo.',n:[
    {o:'Un día publicado necesita cambios'},
    {p:'Plan diario en ese día',tab:'mapa'},
    {q:'¿Se publicó por error?',y:[{p:'«↶ Deshacer publicación»',d:'Vuelve a borrador (solo lo que nadie cambió después).'}],n:[{p:'«🔓 Reabrir» con motivo',d:'Queda en el registro del día.'}]},
    {p:'Hacer los cambios'},
    {p:'«🔒 Cerrar de nuevo»'},
    {o:'El PPC diario sigue midiendo contra lo comprometido'}]}
};

/* flujos que ve cada rol, en orden */
const AY_ROLE={
  admin:['ciclo','look','prop','pdEng','sem','campo','restr','libCal','np','team','cierre'],
  editor:['ciclo','look','prop','pdEng','sem','campo','restr','libSol','np'],
  campo:['ciclo','campo','np','restr','consulta'],
  sc:['ciclo','propSc','pdSc','obraSc','restr','libSol'],
  capataz:['cap'],
  cal:['ciclo','libCal','libSol','area','np'],
  area:['ciclo','area','restr','consulta'],
  veedor:['ciclo','np','consulta'],
  lector:['ciclo','consulta']};
const AY_RN={...ROLE,cal:'Área de apoyo · Calidad'};

const AY={r:null,f:null,m:'tut',o:null};
/** rol para la ayuda: el de la sesión (o el simulado con «Ver como»); Calidad tiene sus propios flujos */
function ayRoleOf(){if(!me)return'lector';if(me.role==='area'&&isCalArea())return'cal';return AY_ROLE[me.role]?me.role:'lector'}

function ayNode(n){
  if(n.o)return`<div class="ayn ayo">${esc(n.o)}</div>`;
  if(n.r)return`<div class="ayn ayr">↩ ${esc(n.r)}</div>`;
  if(n.q)return`<div class="ayn ayq"><span>${esc(n.q)}</span></div><div class="aybr">${ayBranch(n.yl||'Sí','y',n.y)}${ayBranch(n.nl||'No','n',n.n)}</div>`;
  const go=n.tab&&tabAllowed(n.tab);
  return`<${go?'button type="button"':'div'} class="ayn ayp${go?' go':''}"${go?` data-aygo="${n.tab}" title="Ir a ${esc(tabName(n.tab))}"`:''}><b>${esc(n.p)}</b>${n.d?`<small>${esc(n.d)}</small>`:''}${n.w||go?`<span class="aymeta">${n.w?`<i>${esc(n.w)}</i>`:''}${go?`<em>${esc(tabName(n.tab))} ↗</em>`:''}</span>`:''}</${go?'button':'div'}>`}
function ayBranch(lbl,k,ns){return`<div class="ayb ${k}"><em class="ayl">${esc(lbl)}</em><div class="aycol">${ayList(ns||[])}</div></div>`}
function ayList(ns){return ns.map(ayNode).join('<i class="aya" aria-hidden="true"></i>')}

function ayHtml(){const rk=AY.r,keys=AY_ROLE[rk]||AY_ROLE.lector;if(!keys.includes(AY.f))AY.f=keys[0];const F=AY_FLOWS[AY.f];const adm=!!(me&&me.realAdmin);
  return`<div class="lqtop"><b>Ayuda · Cómo funciona LPS 911</b><button class="kx" data-lqx aria-label="Cerrar">×</button></div>
  <div class="seg aymode" role="tablist"><button type="button" data-aym="tut" class="${AY.m==='tut'?'on':''}">Tutorial</button><button type="button" data-aym="flow" class="${AY.m==='flow'?'on':''}">Flujogramas</button></div>
  <div class="ayrole">${adm?`<label>Flujos del rol <select id="ayr">${Object.keys(AY_ROLE).map(k=>`<option value="${k}"${k===rk?' selected':''}>${esc(AY_RN[k]||k)}</option>`).join('')}</select></label>`:`<span>Tu rol: <b>${esc(AY_RN[rk]||rk)}</b></span>`}
   <button type="button" class="ib" id="aypdf" title="Descargar en PDF el tutorial y los flujogramas de este rol">⬇ PDF</button><span class="mu">${AY.m==='tut'?'Lecciones cortas con un ejemplo de obra. Toca ↗ para ir a la sección.':'Toca un paso con ↗ para ir a esa sección.'}</span></div>
  ${AY.m==='tut'?ayTutHtml(rk):`${keys.length>1?`<div class="aytabs" role="tablist">${keys.map(k=>`<button type="button" role="tab" data-ayf="${k}" aria-selected="${k===AY.f}" class="${k===AY.f?'on':''}">${esc(AY_FLOWS[k].t)}</button>`).join('')}</div>`:''}
  <section class="ayflow" aria-label="${esc(F.t)}"><header><h3>${esc(F.t)}</h3><p>${esc(F.s)}</p></header>
   <div class="ayleg"><span><i class="lo"></i>Inicio / fin</span><span><i class="lp"></i>Paso</span><span><i class="lq"></i>Decisión</span></div>
   <div class="aycol aymain">${ayList(F.n)}</div></section>`}`}
/** Tutorial del rol: lecciones con pasos y un ejemplo (contenido en tutorial.js). La primera viene abierta. */
function ayTutHtml(rk){const L=(AY_TROLE[rk]||AY_TROLE.lector).filter(k=>AY_TUT[k]);if(AY.o==null)AY.o=L[0];
  const st=x=>{const o=typeof x==='string'?{x}:x;const go=o.tab&&tabAllowed(o.tab);return`<li>${esc(o.x)}${go?` <button type="button" class="lnkb" data-aygo="${o.tab}">${esc(tabName(o.tab))} ↗</button>`:''}</li>`};
  return`<div class="aytut">${L.map((k,i)=>{const T=AY_TUT[k];const op=AY.o===k;return`<section class="aytl${op?' open':''}"><button type="button" class="aytlh" data-ayt="${k}" aria-expanded="${op}"><i>${i+1}</i><span><b>${esc(T.t)}</b><small>${esc(T.g)}</small></span><em aria-hidden="true">${op?'▴':'▾'}</em></button>${op?`<div class="aytlb"><ol>${T.s.map(st).join('')}</ol><div class="ayej"><b>Ejemplo en obra</b><p>${esc(T.e)}</p></div>${T.tip?`<p class="aytip">💡 ${esc(T.tip)}</p>`:''}</div>`:''}</section>`}).join('')}</div>`}

function ayDraw(){const c=$('#lqm .lqc');if(!c)return;c.innerHTML=ayHtml();c.scrollTop=0}

/** Abre la ayuda. rol (opcional) solo lo usa el administrador para ver la de otro rol. */
function ayOpen(rol){AY.r=rol&&me&&me.realAdmin&&AY_ROLE[rol]?rol:ayRoleOf();AY.f=null;AY.o=null;
  lqModal(ayHtml(),e=>{const t=e.target;let b;
    if((b=t.closest('[data-ayf]'))){AY.f=b.dataset.ayf;ayDraw();return}
    if(t.closest('#aypdf')){ayPdf(t.closest('#aypdf'));return}
    if((b=t.closest('[data-aym]'))){AY.m=b.dataset.aym;ayDraw();return}
    if((b=t.closest('[data-ayt]'))){const k=b.dataset.ayt;AY.o=AY.o===k?'':k;const c=$('#lqm .lqc');const y=c?c.scrollTop:0;ayDraw();if(c)c.scrollTop=y;return}
    if((b=t.closest('[data-aygo]'))){const tab=b.dataset.aygo;lqClose();if(tabAllowed(tab)&&U.tab!==tab)goTab(tab);return}},
   e=>{if(e.target.id==='ayr'){AY.r=e.target.value;AY.f=null;AY.o=null;ayDraw()}});
  const c=$('#lqm .lqc');if(c){c.classList.add('ayc');c.setAttribute('aria-label','Ayuda')}}

/* ---------- PDF: tutorial (texto) y flujogramas (imagen) del rol elegido ---------- */
const H2C='https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';let h2cP=null;
function loadH2C(){if(window.html2canvas)return Promise.resolve();if(h2cP)return h2cP;
  h2cP=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=H2C;s.onload=ok;s.onerror=()=>{h2cP=null;ko(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión.'))};document.head.appendChild(s)});return h2cP}
/* las fuentes del PDF no tienen emojis ni flechas: se quitan */
const ayTx=x=>String(x==null?'':x).replace(/＋/g,'+').replace(/[✓✎]/g,'').replace(/[^\x20-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\n]/g,'').replace(/ {2,}/g,' ').trim();
async function ayPdf(btn){if(btn.disabled)return;const bt=btn.textContent;btn.disabled=true;btn.textContent='Generando…';
  const rk=AY.r||ayRoleOf();const html=document.documentElement;const th=html.getAttribute('data-theme');let box=null;
  try{await Promise.all([loadPdf(),loadH2C()]);const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
    const W=210,H=297,M=15,CW=W-2*M;let y=M;const rol=AY_RN[rk]||rk;const obra=(P().name||'').trim();
    const foot=()=>{const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(130);doc.text(ayTx(`LPS 911 · Guía de uso · ${rol}`),M,H-8);doc.text(`${i} / ${n}`,W-M,H-8,{align:'right'})}};
    const need=h=>{if(y+h>H-16){doc.addPage();y=M}};
    const para=(t,o)=>{o=o||{};doc.setFont('helvetica',o.b?'bold':o.i?'italic':'normal');doc.setFontSize(o.s||10.5);doc.setTextColor(...(o.c||[30,30,30]));const L=doc.splitTextToSize(ayTx(t),(o.w||CW));const lh=(o.s||10.5)*.43;need(L.length*lh);doc.text(L,M+(o.x||0),y+lh*.8);y+=L.length*lh+(o.g==null?2:o.g)};
    /* portada */
    doc.setFillColor(31,95,122);doc.rect(0,0,W,58,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(24);doc.text('LPS 911 · Guía de uso',M,28);
    doc.setFontSize(13);doc.setFont('helvetica','normal');doc.text(ayTx(`Rol: ${rol}${obra?' · '+obra:''}`),M,40);doc.setFontSize(10);doc.text(ayTx(`Generado el ${fmtD(todayIso())}`),M,48);y=72;
    const L=(AY_TROLE[rk]||AY_TROLE.lector).filter(k=>AY_TUT[k]);const F=(AY_ROLE[rk]||AY_ROLE.lector).filter(k=>AY_FLOWS[k]);
    para('Contenido',{b:true,s:14,g:3});
    para('1. Tutorial: '+L.map(k=>AY_TUT[k].t).join(' · '),{g:2});para('2. Flujogramas: '+F.map(k=>AY_FLOWS[k].t).join(' · '),{g:6});
    /* tutorial */
    doc.addPage();y=M;para('Tutorial',{b:true,s:18,c:[31,95,122],g:4});
    L.forEach((k,i)=>{const T=AY_TUT[k];need(30);para(`${i+1}. ${T.t}`,{b:true,s:13,g:1});para(T.g,{i:true,c:[90,90,90],g:3});
      T.s.forEach((x,j)=>para(`${j+1}. ${typeof x==='string'?x:x.x}`,{x:4,w:CW-4,g:1.5}));
      y+=1.5;doc.setFont('helvetica','normal');doc.setFontSize(10);const E=doc.splitTextToSize(ayTx(T.e),CW-10);const eh=E.length*4.3+10;need(eh);
      doc.setFillColor(238,244,239);doc.rect(M,y,CW,eh,'F');doc.setFillColor(46,125,79);doc.rect(M,y,1.2,eh,'F');doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(46,125,79);doc.text('EJEMPLO EN OBRA',M+5,y+5);
      doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(30);doc.text(E,M+5,y+10);y+=eh+3;
      if(T.tip)para('Consejo: '+T.tip,{s:9.5,c:[80,80,80],g:2});y+=5});
    /* flujogramas: cada uno como imagen en su página (siempre en tema claro) */
    html.setAttribute('data-theme','light');box=document.createElement('div');box.style.cssText='position:fixed;left:-12000px;top:0;width:860px;background:#fff;padding:12px';document.body.appendChild(box);
    for(const k of F){const FL=AY_FLOWS[k];box.innerHTML=`<section class="ayflow" style="background:#fff;border:0"><div class="ayleg"><span><i class="lo"></i>Inicio / fin</span><span><i class="lp"></i>Paso</span><span><i class="lq"></i>Decisión</span></div><div class="aycol aymain">${ayList(FL.n)}</div></section>`;
      await new Promise(r=>requestAnimationFrame(()=>r()));const cv=await window.html2canvas(box,{scale:2,backgroundColor:'#ffffff',logging:false});
      doc.addPage();y=M;para(FL.t,{b:true,s:16,c:[31,95,122],g:1});para(FL.s,{i:true,c:[90,90,90],g:4});
      let iw=CW,ih=cv.height*iw/cv.width;const room=H-16-y;if(ih>room){ih=room;iw=cv.width*ih/cv.height}
      doc.addImage(cv.toDataURL('image/jpeg',.9),'JPEG',M+(CW-iw)/2,y,iw,ih)}
    foot();doc.save(`LPS911-guia-${rk}.pdf`);toast('PDF descargado')}
  catch(err){toast(err.message||'No se pudo generar el PDF')}
  finally{if(box)box.remove();if(th==null)html.removeAttribute('data-theme');else html.setAttribute('data-theme',th);btn.disabled=false;btn.textContent=bt}}

{const b=$('#bhelp');if(b)b.onclick=()=>ayOpen()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#lqm .ayc'))lqClose()});
