# Avisos de detenciones (push al celular y la computadora)

Oct 2026, pedido del dueño. Archivos: `web/js/avisos.js`, `web/sw.js` (eventos `push` y `notificationclick`),
`functions/index.js` (`avisoDetenido` y `avisoPrueba`, ambos onCall; `avisoPrueba`, `pushTokens`, `pushSend`), `functions/lib.js` (`nuevoDetenido`,
`avisoNo`, `avisoDestinos`, `avisoTexto`, `pushHorario`; pruebas en `functions/test/avisos.test.js`).

## Qué hace

- Cuando alguien marca **«Detenido»** en campo (evento nuevo `s:'stop'` en `live/<fecha>_<act>.log`, sin el antiguo
  «Inicia después»), la página (`pushNotify` → cola `lps.pushq` → `pushFlush`, cuando el reporte ya llegó a la base; sin
  señal reintenta al volver la conexión) llama a la función `avisoDetenido` (onCall). El servidor lee el reporte de `live`
  (no confía en la página), lo envía una sola vez por evento (`pushlog/<live>_<hora>`, solo el servidor) y avisa a:
  - los **editores responsables de ese piso** (`members.pisos`, sin `off`) y
  - los **administradores** (y el dueño), que pueden limitar sus pisos en `pushp/<correo>.pisos` (vacío = todos),
  - menos a quien lo reportó (`log[].by`).
- **No se avisa** (`avisoNo`): días no laborables (`isWork`), fuera del horario `pushIni`–`pushFin` de Configuración ›
  Proyecto (por defecto 07:00–18:00), lo reportado al cierre (desde la hora de corte `closeCutHH` o junto con el cierre),
  lo que no es de hoy o llegó con más de 6 h de atraso (capataz sin señal), o si `meta/project.pushOff` es `true`.
- **No se avisa al reanudar** (decisión del dueño: el celular solo suena cuando hay algo que resolver).
- Texto: título `⏸ Detenido · P3 · <SC>`; cuerpo `<actividad> · <ambiente>` y `<motivo> — <detalle> · <hora>`.
  `tag = det-<actId>`: si la misma actividad se vuelve a detener, el aviso nuevo reemplaza al anterior.
- **Tocar el aviso** abre el resumen de la actividad **en solo lectura** (`dashPop`, el mismo del Tablero) sin cambiar de
  pestaña, con el botón «📊 Ver todas las detenciones de hoy» (hoja de Jornada › Detenciones). Decisión del dueño (22 oct 2026):
  el aviso solo informa; reanudar o verificar el cumplimiento se hace en Campo. `pushGo` llega por `?det=<act>&d=<fecha>` o
  por mensaje del service worker `{t:'det'}` si la app ya está abierta.

- **La ficha se completa sola (30-10-2026, reporte del dueño):** abierta desde el aviso con la app recién lanzada, se armaba antes de
  que llegaran los reportes en vivo (`live`) y no se actualizaba: decía «En curso · sin novedad» aunque estuviera detenida. Ahora
  `pushGo` pide `ensureDaily(d)`, la ficha muestra «Cargando lo reportado en campo…» mientras `LIVE_OK` (base.js: primera foto de
  `live` recibida) es falso, y `render()` llama a `dashPopRefresh()` (en-obra-tablero.js: `DPOP` guarda la ficha abierta; se vuelve a
  armar con `dashPopHtml` si cambió). Con la actividad detenida, `dashDetHtml` agrega el recuadro `.dpdet`: desde qué hora y hace
  cuánto (`agoTxt`), motivo, detalle y quién la reportó.
- **Hoy › «⏸ Detenidas ahora»** (`jorHoyTop`, jornada.js; admin y editores, `jorHoyOk`): arriba de todas las tarjetas, lo que **sigue
  detenido** (`jorDet` con `st==='stop'`), lo más reciente primero, con SC, dónde, motivo y detalle y «hace X min»; tocar abre su
  ficha (`#hoydet [data-jdt]` → `jdtOpen`). Sin detenciones, una línea verde. «Ver todas las detenciones de hoy» (`data-jor="hdet"`)
  pone Estado de la jornada en Detenciones y baja hasta ella. Prueba: `avisos.spec.js` «aviso de detención: la ficha se completa…».

## Datos y reglas

- `push/<sha256 del token>`: `{em, tok, dev, t}`, un documento por equipo. Lo crea y borra solo su dueño (admin/editor).
  El servidor borra los tokens que FCM da por inválidos.
- `pushp/<correo>`: `{pisos, t}`, solo administradores y solo el propio.
- `meta/project.pushIni`, `pushFin`, `pushOff`: solo el administrador (reglas SEG-01).

## Activar (cliente)

- Botón **🔔** arriba (y «Más» en el celular), solo admin/editor. Hoja `#pushsheet`: estado del equipo, activar /
  desactivar, aviso de prueba (`avisoPrueba`), pisos del administrador.
- Usa Firebase Cloud Messaging (SDK `firebase-messaging-compat` 10.12.2, cargado solo al activar o renovar) con el
  service worker de la app (`sw.js`). Clave pública Web Push en `config/<entorno>.js` → `window.FCM_VAPID`
  (Firebase › Configuración del proyecto › Cloud Messaging › Certificados web push). Sin clave, la hoja lo dice.
- El registro del equipo se guarda en `localStorage` `lps.push` y se renueva al entrar cada 3 días (`pushRefresh`).
- **iPhone/iPad:** solo con la app agregada a la pantalla de inicio (iOS 16.4+); la hoja da los pasos.
- En las pruebas e2e no hay service worker (`NO_SW`); `tests/e2e/avisos.spec.js` revisa la hoja, los pisos, el horario y `pushGo`.

## Por qué no es un disparador de Firestore

La primera versión era `onDocumentWritten('live/{id}')`, pero la instalación automática desde GitHub falló: un disparador de
Firestore (Eventarc) necesita roles de IAM para los agentes de servicio de Google Cloud y la cuenta de servicio de GitHub no
puede darlos (oct 2026). Por eso la página pide el aviso con un onCall, como `publicarTareo`.
