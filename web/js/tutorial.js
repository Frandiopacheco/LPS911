"use strict";
/* LPS 911 · Tutorial por rol: lecciones cortas con pasos y un ejemplo de obra, dentro de la ventana de Ayuda
   (pestaña «Tutorial», al lado de «Flujogramas»). Lo dibuja ayuda.js (ayTutHtml); aquí solo está el contenido.
   Lección: {t:'título', g:'para qué sirve', s:[pasos: 'texto' o {x:'texto', tab:'id de pestaña'}], e:'ejemplo en obra', tip:'consejo (opcional)'}
   Parte de la app: index.html carga los archivos de js/ en orden y todos comparten las mismas variables globales. */
const AY_TUT={
  hoy:{t:'Empezar el día con «Hoy»',g:'Hoy junta lo que te toca atender según tu rol: pendientes de Campo, restricciones por vencer, liberaciones, propuestas y cambios del plan.',
    s:[{x:'Abre la pestaña Hoy (es la primera al entrar).',tab:'hoy'},'Revisa las tarjetas de arriba hacia abajo: el número grande es lo pendiente.','Toca el botón de cada tarjeta para ir directo a resolverlo.','Cuando una tarjeta muestra ✓ ya no tienes nada pendiente ahí.'],
    e:'A las 7:30 la tarjeta «Restricciones» dice 2: «Falta arena fina» vence mañana. Tocas «Ver restricciones», llamas al proveedor y anotas el compromiso antes de la reunión.'},

  look:{t:'Programar en el Lookahead',g:'Mantener al día la programación por piso, sector y ambiente.',
    s:[{x:'Abre el Lookahead y elige el piso arriba.',tab:'look'},'Toca «✎ Editar»: el lookahead abre en modo consulta para no mover nada por accidente.','Arrastra una barra para cambiar sus días; estira sus bordes para alargarla o acortarla.','Para varias actividades a la vez: Ctrl+clic y luego ⋮ › Mover en bloque.','Si te equivocas, Ctrl+Z deshace. Al terminar toca «✓ Terminar edición».'],
    e:'El tarrajeo del Dpto 101 se atrasa 2 días por falta de arena. Seleccionas las actividades del ambiente que siguen (tren) y las mueves 2 días hábiles con «Mover en bloque». El historial guarda quién y cuándo lo cambió.',
    tip:'Hoy y los días con el plan ya publicado no se reprograman desde aquí: eso se decide en la reunión diaria.'},

  prop:{t:'Revisar las propuestas de los SC',g:'Los subcontratistas no cambian el lookahead: proponen y tú decides en los pisos a tu cargo.',
    s:[{x:'En Hoy, la tarjeta «Propuestas por revisar» dice cuántos cambios hay por SC.',tab:'hoy'},{x:'Ábrela: el Lookahead muestra la propuesta encima de lo oficial.',tab:'look'},'Pasa el mouse por cada cambio: dice en palabras qué se movió.','Acepta o rechaza cada uno. Si llegó después del corte del sábado (FUERA DE PLAZO) te pide el motivo para aceptarla.'],
    e:'SC Pinturas propone empezar el empaste del Dpto 102 el martes en vez del lunes porque el tarrajeo no estará seco. Lo aceptas: pasa al lookahead oficial y el SC lo ve en «Respuestas».'},

  reu:{t:'Reunión diaria y publicar el plan',g:'Decidir la víspera qué va mañana, ordenar los cruces entre partidas y publicar el plan.',
    s:[{x:'Abre el Plan diario: se abre solo en el día hábil siguiente.',tab:'mapa'},'«Modo reunión»: primero el cumplimiento de hoy (✓ / ✗ con causa).','Revisa «Por decidir»: lo que los SC marcaron No va o Culminado.','Revisa los cruces: dos partidas en el mismo ambiente → ordena 1.º, 2.º o «Todas pueden trabajar a la vez».','Al terminar, «📣 Publicar plan». Si nadie publica, se publica solo a la hora de cierre (21:00 por defecto).'],
    e:'Eléctricas y Sanitarias caen mañana en el SH 2 – Hombres. Acuerdan que entra primero Sanitarias (pruebas hidráulicas) y luego Eléctricas: marcas 1.º y 2.º en el cruce y publicas.'},

  sem:{t:'Congelar la semana y medir el PPC',g:'El viernes se compromete la semana siguiente y se mide contra eso.',
    s:[{x:'En PPC semanal, el viernes tras la reunión toca «Congelar» en cada piso.',tab:'plan'},'Si no lo congelas, el servidor lo congela solo el sábado a la 1 pm.','Durante la semana, «Aplicar registros de campo» trae lo que se marcó en Campo.','Evalúa cada No cumplido: causa, detalle, mitigación y si es imputable al SC.',{x:'Revisa el PPC del piso y del SC en Indicadores; exporta el Excel con el formato de la empresa.',tab:'ind'}],
    e:'La semana 59 tuvo 40 compromisos y 32 cumplidos: PPC 80 %. De los 8 fallos, 3 fueron por «frente no entregado» por otra partida: no le bajan el PPC al SC afectado.'},

  campo:{t:'Verificar el cumplimiento en Campo',g:'Registrar si lo programado del día se cumplió. Esto alimenta el PPC.',
    s:[{x:'Abre Campo: muestra lo programado hoy en tu piso.',tab:'campo'},'Si el SC o el capataz ya propuso el cierre, toca «✓ Confirmar».','Si nadie lo propuso, marca «Cumplido» o «No» y elige la causa.','Si la actividad terminó del todo, usa «Terminada»: se raya en el lookahead.','Puedes agregar foto y nota.'],
    e:'4:30 pm: el capataz de Tarrajeo cerró «Cumplido» en el Dpto 101. Lo ves en obra, coincide, y tocas «Confirmar». En el Dpto 102 no avanzaron por falta de andamio: marcas «No» con causa «Equipos».',
    tip:'Lo que nadie verifica se acepta solo a las 23:30 con lo que propuso el capataz.'},

  np:{t:'Registrar trabajo no programado',g:'Dejar constancia de lo que se ejecuta en obra sin estar en el plan del día (no cambia el PPC).',
    s:[{x:'Abre Campo › Plano y elige el piso.',tab:'campo'},'Toca dos veces rápido el lugar del plano donde ves a la cuadrilla, en cualquier ambiente (aunque ahí haya otra actividad programada). El ambiente sale solo.','También puedes tocar «＋ No programado» y luego el lugar.','Elige el subcontratista, qué hacen y toma una foto. Guarda.','Si debe quedar programado, el ingeniero toca «Pasarlo al lookahead».'],
    e:'En el recorrido de las 10 am ves a SC Eléctricas cableando en el Dpto 203, que no estaba programado. Lo registras con foto: aparece en el Plan diario como «Visto en obra» y en Indicadores.',
    tip:'Un solo toque no registra nada: puedes moverte por el plano con el dedo sin abrir la ficha por error.'},

  seq:{t:'Tren de trabajo: «En secuencia»',g:'Cuando una cuadrilla hace un ambiente tras otro en el día, los que aún no le tocan no se ven como atrasados.',
    s:[{x:'En Campo (o En obra) toca la actividad del ambiente que todavía no empieza.',tab:'campo'},'Toca «⏭ Va en secuencia…» y elige después de qué ambiente llega la cuadrilla.','La actividad se pone morada: «En secuencia: sigue después de A-1 (en ejecución)».','Cuando la cuadrilla llegue, «▶ Iniciar» la pasa a En ejecución.'],
    e:'SC Pinturas tiene hoy Dpto 101, 102 y 103. A las 9 am solo está en el 101: marcas el 102 en secuencia tras el 101 y el 103 tras el 102. En el Tablero ya no salen como «sin iniciar».',
    tip:'Es solo informativo: al cierre del día se marca cumplido o no cumplido como siempre.'},

  restr:{t:'Restricciones',g:'Registrar lo que impide trabajar y seguirlo hasta liberarlo.',
    s:[{x:'Abre Restricciones y toca «+ Nueva restricción».',tab:'restr'},'Amárrala a su actividad del lookahead, elige el tipo y escribe qué falta.','Pon el responsable y la fecha requerida (cuándo debe estar resuelta).','Cuando se resuelva, márcala Liberada («Liberar hoy» en el celular). Mientras siga pendiente, la actividad lleva una «R» en el lookahead.','Si la actividad ya pasó sin ejecutarse, sale «Actividad no ejecutada»: reprográmala o libera la restricción.'],
    e:'El tablero de cuarzo del SH 2 necesita la plancha que llega el jueves. Registras «Materiales · falta plancha de cuarzo», responsable Logística, requerida para el miércoles. El jueves llega y la liberas.'},

  propSc:{t:'Proponer cambios al lookahead (SC)',g:'Pedir cambios de fechas o cantidades de tu partida; el ingeniero los acepta o rechaza.',
    s:[{x:'Abre el Lookahead: entras en modo propuesta y solo ves tu partida.',tab:'look'},'Mueve las barras o cambia cantidades: quedan como borrador.','Toca «Enviar» antes del corte (sábado 1 pm).','Revisa la respuesta en «Respuestas». Si te la rechazan, corrige y vuelve a enviar.'],
    e:'Tu cuadrilla de empaste es de 4 personas y no llega a 3 departamentos por día. Propones repartirlos en 2 días y explicas el motivo; el ingeniero lo acepta.'},

  pdSc:{t:'Tu plan del día siguiente (SC)',g:'Antes de la reunión diaria dices qué va mañana y con qué personal.',
    s:[{x:'Abre el Plan diario: se abre en el día hábil siguiente con tus actividades.',tab:'mapa'},'Para cada actividad: «Va», o «No va» / «Culminado» con la causa.','En «Equipos del día» pon el personal por cuadrilla y el horario.','Asigna cada cuadrilla a su actividad (en el celular: toca la cuadrilla y luego el número de la actividad).'],
    e:'Mañana no llega el yeso: marcas «No va» en el empaste del Dpto 104 con causa «Materiales». En la reunión el ingeniero decide si se reprograma o se libera temprano.'},

  obraSc:{t:'En obra: iniciar, detener y cerrar (SC)',g:'Avisar en vivo cómo va tu partida durante el día.',
    s:[{x:'Abre En obra: tus actividades de hoy, por piso.',tab:'cap'},'«▶ Iniciar» cuando la cuadrilla empieza; «⏸ Detener…» con el motivo si para.','Si un ambiente va más tarde (tren de trabajo), «⏭ Va en secuencia…».','A las 4 pm propón el cierre: Cumplido o No cumplido con causa.'],
    e:'A las 11 am se corta el agua y la cuadrilla de sanitarias para: tocas «Detener…» y eliges el motivo. A las 2 pm vuelve y tocas «Reanudar».'},

  cap:{t:'Reportar desde el celular (capataz)',g:'Contar en vivo el avance de tu cuadrilla.',
    s:['Entra con el enlace o QR que te dio el ingeniero (la primera vez escribe tu nombre).','Ves solo las actividades de hoy de tu partida, en el plano o en tarjetas.','Toca el número de la actividad: «▶ Iniciar» al empezar.','Si hay que parar, «⏸ Detener…» con el motivo; luego «Reanudar».','Al final del día, «Cerrar el día…» con avance y foto.'],
    e:'Llegas al Dpto 101 a las 8:00 y tocas «Iniciar». A las 4 pm terminas el tarrajeo, tocas «Cerrar el día…» › Cumplido y tomas una foto del muro.'},

  libSol:{t:'Solicitar una liberación de calidad',g:'Pedir a Calidad que inspeccione un trabajo terminado.',
    s:[{x:'Abre Liberaciones › «+ Solicitar liberación».',tab:'lib'},'Busca la actividad en el lookahead (o escribe qué se libera y en qué ambiente).','Pon la fecha en que estará lista, la hora sugerida y el protocolo.','Pídela un día antes, hasta las 6 pm; si no, llega fuera de plazo.','Si la observan, corrige y toca «Observaciones levantadas · pedir reinspección».'],
    e:'El viernes terminas las redes empotradas del Dpto 102. El jueves a las 5 pm ya pides la liberación para el viernes 9:00: Calidad la programa con el Ing. Uno.'},

  libCal:{t:'Programar e inspeccionar liberaciones (Calidad)',g:'Atender las solicitudes y dejar constancia de lo liberado.',
    s:[{x:'Abre Liberaciones › Bandeja: columnas Solicitadas, Programadas, Observadas y Liberadas.',tab:'lib'},'Arrastra la solicitud a «Programadas» y elige día, hora e inspector (Ctrl+clic para varias).','Marca si es crítica (restringe lo que sigue) y si requiere supervisión.','Tras inspeccionar: arrástrala a «Liberadas» u «Observadas».'],
    e:'Llegan 3 solicitudes de redes empotradas para mañana. Las programas juntas a las 9:00 con el Ing. Uno y las marcas críticas: el tarrajeo no puede empezar hasta que se liberen.'},

  area:{t:'Restricciones de tu área',g:'Resolver lo que le toca a tu área (Oficina Técnica, Calidad, Logística…).',
    s:[{x:'En Restricciones, filtra «La libera» por tu área.',tab:'restr'},'Para cada una, pon la fecha de compromiso y observaciones (salen en el Excel del AR).','Cuando esté resuelta, márcala Liberada.'],
    e:'Oficina Técnica tiene «Falta plano de detalle de baños». Pones compromiso para el miércoles y «en revisión del proyectista». El miércoles se emite el plano y la liberas.'},

  ind:{t:'Leer los indicadores',g:'Entender cómo va la obra: PPC diario y semanal, causas y reprogramaciones.',
    s:[{x:'Abre Indicadores: elige Diario o Semanal.',tab:'ind'},'El PPC es lo cumplido entre lo comprometido.','Mira las causas más repetidas: ahí está lo que hay que atacar.','«Reporte PDF del día» o «Excel del PPC» para compartir.'],
    e:'Las últimas 3 semanas la causa n.º 1 fue «Materiales». Lo llevas a la reunión semanal para adelantar las compras.'},

  consulta:{t:'Consultar sin cambiar nada',g:'Ver la información de la obra.',
    s:[{x:'Hoy: resumen de lo que pasa hoy.',tab:'hoy'},{x:'Tablero: avance en vivo.',tab:'dash'},{x:'Lookahead: la programación vigente.',tab:'look'},{x:'Indicadores: PPC y causas.',tab:'ind'}],
    e:'Antes del comité de obra abres el Tablero y el PPC semanal para tener los números a la mano.'},

  team:{t:'Dar acceso al equipo (administrador)',g:'Sumar personas con el rol correcto.',
    s:[{x:'Abre Equipo, escribe el correo, el nombre y el rol; «Agregar al equipo».',tab:'team'},'Editor: asígnale sus pisos. SC: su partida. Área: su área («Calidad» maneja liberaciones).','La persona entra con «¿Primera vez? Crear mi cuenta» y confirma su correo.','A los capataces invítalos con el QR desde En obra o Equipo.'],
    e:'Llega un nuevo ingeniero de producción para los pisos 3 y 4: lo agregas como Editor con esos pisos. Desde ese momento él decide las propuestas de esos pisos.'}
};

/* lecciones de cada rol, en orden (las primeras son las del día a día) */
const AY_TROLE={
  admin:['hoy','look','prop','reu','campo','seq','sem','restr','np','ind','team'],
  editor:['hoy','look','prop','reu','campo','seq','sem','restr','np','libSol','ind'],
  campo:['hoy','campo','seq','np','restr','ind'],
  sc:['hoy','pdSc','obraSc','propSc','restr','libSol'],
  capataz:['cap'],
  cal:['hoy','libCal','libSol','area','np'],
  area:['hoy','area','restr','consulta'],
  veedor:['hoy','np','seq','consulta'],
  lector:['hoy','consulta','ind']};
