# CLAUDE.md: guía del repositorio para asistentes de IA

Léela antes de tocar el código. Sirve para cualquier IA (Claude, Copilot, Codex, Cursor, Gemini…).

## Qué es

**LPS 911**: app web del *Last Planner System* para una obra de construcción en Lima (Perú). Incluye lookahead, plan semanal, restricciones, registro de campo, capataces en celular, tablero en vivo, plan diario (sectorización en planos), liberaciones de calidad e indicadores (PPC).
- Usuarios: ingenieros de producción y de campo, subcontratistas (SC), capataces, áreas de apoyo (Oficina Técnica, Calidad) y administrador.
- Pestañas (`data-tab`): `hoy` Hoy (inicio de cada rol), `dash` Tablero, `look` Lookahead, `mat` Matriz de ambientes, `campo` Campo, `mapa` Plan diario, `cap` En obra, `plan` PPC semanal, `restr` Restricciones, `lib` Liberaciones, `ind` Indicadores, `planos` Sectorización, `cfg` Configuración, `team` Equipo. Los nombres visibles cambiaron ("Plano diario" → "Plan diario", "Planos" → "Sectorización", "Plan semanal" → "PPC semanal"); los ids no.
- **Toda la interfaz y los mensajes van en español** (Perú), con trato de "tú".

## Reglas que no se rompen

1. **Nunca perder datos de la obra.** No borres colecciones ni documentos sin pedirlo. "Eliminar" en la app **archiva** (`arch:{t,by,n}`); el borrado real solo existe en Equipo › Limpieza (pide escribir BORRAR).
2. **Nunca escribas en la rama `produccion`.** Los cambios van a `main` o en un *pull request* hacia `main`. La obra solo se actualiza cuando el dueño aprueba `main → produccion` (ver `PUBLICAR.md`).
3. No edites `web/firebase-config.js`: no está en el repo, lo genera `scripts/build.mjs` desde `config/`.
4. Cambios de reglas (`firebase/firestore.rules`): agrega o ajusta pruebas en `tests/rules/firestore.test.mjs`.
5. Mensajes de commit en español, explicando *qué cambia para el usuario*.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `web/index.html` | Solo el esqueleto HTML (~6 KB): carga `css/app.css` y luego los archivos de `js/` **en orden**. Sin framework ni empaquetador. |
| `web/css/app.css` | Todos los estilos de la app. |
| `web/js/*.js` | El código de la app, por temas (en el orden de carga): `base` (utilidades, estado, escritura, conexión, sesión, menús, `render`), `lookahead`, `campo`, `en-obra-tablero`, `propuestas`, `auditoria` (papelera, calendario, hora del servidor, responsables de piso…), `liberaciones`, `mover` (mover en bloque), `presentacion` (modo presentación), `cliente` (versión cliente), `no-programado` (trabajo no programado visto en obra), `sectorizacion` (mapa de ambientes y sectores), `historial`, `excel`, `ayuda` (flujogramas por rol), `matriz` (matriz de ambientes), `matriz-cat` (su catálogo y tipos de ambiente), `matriz-look` (catálogo ↔ lookahead: unificar nombres, exigir catálogo, alertas), `matriz-rec` (recorrido en campo), `matriz-sc` (los SC llenan su partida; revisión del ingeniero), `especialidades` (lista única de especialidades), `matriz-des` (desglosar actividades genéricas), `hoy` (pantalla Hoy), `interfaz` (navegación por rol, barra superior, selector de fecha, `pageHead`/`helpBox`), `plan-restricciones`, `indicadores`, `config-equipo` (Sectorización, Configuración, Equipo), `exportes` (PDF/Excel) e `inicio` (arranque de Firebase; **siempre el último**). Son *scripts* clásicos, no módulos: comparten las mismas variables globales, como si fueran un solo archivo. Cada uno empieza con `"use strict";`. |
| `web/plano.js` | Módulo del plan diario (~190 KB, una IIFE): láminas, zonas, modo reunión (piso/día, cruces, tarjeta de cumplimiento), exportes PDF/Excel, plano del capataz. Se carga tarde (`PLANO_SRC`). Lo que usa el resto de la app se exporta en `window.__plano` (`capPlan`, `capDraw`, `zoneFor`, `nums`, `crossOf`, `zcClose`…): una función interna **no** es global, expórtala ahí. |
| `web/sw.js` | Service worker: modo sin internet y aviso de "versión nueva". `VER` lo pone el build. |
| `config/produccion.js`, `config/pruebas.js` | `window.FIREBASE_CONFIG` de cada proyecto (no son secretos). |
| `firebase/firestore.rules` | Reglas de seguridad (roles, ver abajo). |
| `firebase/database.rules.json` | Realtime Database: solo `presence` ("conectados"). |
| `functions/` | Cloud Functions (Node.js 22): `versionDominical` (dom 12:05 Lima), `aceptarCierres` (23:30 Lima), `congelarSemana` (cada 15 min; congela en el corte semanal) y `cerrarPlan` (cada 15 min; pasada la hora de Configuración › Proyecto `planCutHH`, por defecto 21:00, máx. 23:30, una vez por día con constancia en `pcl/<fecha>`; **publica** el plan del día hábil siguiente donde nadie lo publicó: aplica los borradores de la reunión, rechaza las propuestas del SC sin revisar y guarda la foto). La lógica pura está en `lib.js`, con pruebas en `test/`. |
| `tests/rules/` | Pruebas de reglas con `@firebase/rules-unit-testing` (corren en GitHub con el emulador). |
| `scripts/build.mjs` | Lo usa la publicación: elige config por rama, pone la versión en `sw.js` y en las URLs `?v=` de `css/`, `js/` y `plano.js`, y llena `ASSETS` del service worker para que funcione sin internet. |
| `scripts/check.mjs` | Revisión de `web/`: sintaxis de cada archivo, que todo lo que carga `index.html` exista (y que no sobre nada en `js/`), `"use strict"` al inicio y `inicio.js` al final: `node scripts/check.mjs`. |
| `tests/e2e/` | Pruebas de la interfaz con Playwright y un Firebase falso en memoria (ver "Cómo probar"). `mundo-compartido.js` + `auditoria-ciclo.spec.js`: el ciclo diario con 16 usuarios a la vez sobre una misma base (corre aparte con `CICLO=1`). |
| `.github/workflows/ci.yml` | Revisa (sintaxis, functions, reglas) y prueba la interfaz (Playwright en 3 partes + ciclo diario, a la vez; no se repite al unir si el código ya pasó en el PR) → instala en Firebase → publica en Netlify. |

## Entornos

| Rama | Firebase | Netlify |
| --- | --- | --- |
| `main` | `lps911-pruebas-49641` (sin Realtime Database) | `https://main--lps911-central.netlify.app` (cinta roja PRUEBAS) |
| `produccion` | `lps911` | `https://lps911-central.netlify.app` |

Netlify protege las copias que no son producción (`main--…` pide iniciar sesión en Netlify), así que no se abren desde otro celular ni en incógnito. Para probar roles y celular usa, en la copia de prueba, Equipo › **👁 Ver como…** y **📱 Vista celular** (solo el administrador real; ver abajo).

Secretos de GitHub: `FIREBASE_SA_PRUEBAS`, `FIREBASE_SA_PRODUCCION` y `NETLIFY_AUTH_TOKEN`. Netlify no compila por su cuenta: publica GitHub con `netlify deploy`.

## Roles (reglas y app)

- `admin`: todo; el dueño `frandiopacheco@gmail.com` siempre es admin.
- `editor`: ingeniero de producción; edita el lookahead. Resuelve las propuestas de SC **solo en los pisos a su cargo** (`pisos`); piso sin responsable: solo el admin (`canDecide`, `respOf`).
- `campo`: ingeniero de campo; registro diario.
- `sc`: subcontratista; propone en el lookahead, solo su partida. Inicia/detiene sus actividades en "En obra" y, como el capataz, **propone el cierre del día** (≈ 4 pm, `live.close`; el ingeniero lo confirma o, si nadie lo propuso, lo registra igual en Campo), crea restricciones de su partida y solicita liberaciones.
- `capataz`: celular, solo su partida, reportes en vivo.
- `area`: área de apoyo (OT, Calidad…): ve todo y resuelve las restricciones de su área. Si el área contiene "Calidad", además programa/libera, marca crítica/supervisión y edita los inspectores (`isCal()`, `canLibCfg()`).
- `veedor`: recorre la obra y registra el trabajo no programado (Campo › Plano); el resto solo lo consulta.
- `planner`: rol del plan maestro, **retirado (oct 2026)**: quien lo tenga entra como `lector`.
- `lector`: solo lectura.

En el código: `canWrite` (admin/editor), `canDaily` (+campo), `PM()` (subcontratista en modo propuesta), `ENG()` (ingeniero en Campo), `SCK()` (subcontratista), `AREA()` (área de apoyo), `isCal()`, `canNP()` (registra no programado: campo/editor/admin, Calidad y veedor) y `VEED()` (lo registra pero no verifica el avance).

**Ver como** (solo copia de prueba, `LPS_ENV==='pruebas'`): el admin simula otro rol; se guarda en `sessionStorage` `lps.va` y lo aplica `vaApply()`. Solo cambia la interfaz: las escrituras van con el usuario real y las reglas reales. **📱 Vista celular** (`phonePreview`) abre la app en un `iframe` con medidas de teléfono; dentro del marco `html.in-frame` oculta esos controles.

## Guía por tema (`docs/ia/`): lee solo la que toca tu tarea

Este archivo tiene lo esencial. El detalle de cada módulo está aparte para no cargarlo entero en cada conversación:

| Archivo | Cuándo leerlo |
| --- | --- |
| `docs/ia/datos.md` | Cualquier cambio que lea o escriba Firestore (colecciones, campos, reglas). |
| `docs/ia/interfaz.md` | Pestañas, navegación por rol, selector de fecha, páginas, modo presentación, Ayuda. |
| `docs/ia/lookahead.md` | Grilla del lookahead, terminadas/reabrir, orden, modo consulta, vencidas, mover en bloque, historial. |
| `docs/ia/propuestas.md` | Propuestas de los SC, revisión, tardías, historial de decisiones. |
| `docs/ia/plan-diario.md` | `plano.js`: plan diario, reunión, cruces, cuadrillas, publicar/cerrar el plan, Sectorización, no programado. |
| `docs/ia/ppc-campo.md` | Campo, PPC semanal y diario, causas, «No va», congelado, plan cerrado, Indicadores. |
| `docs/ia/matriz.md` | Matriz de ambientes: catálogo de actividades, tipos de ambiente, estado por ambiente, fotos semanales. |
| `docs/ia/restricciones.md` | Pantalla de Restricciones. |
| `docs/ia/cliente-excel.md` | Versión cliente y exportes a Excel con el formato de la empresa. |
| `docs/ia/seguridad.md` | Reglas de `live`, `fotos`, `dplan` (auditoría 02e575c). |
| `docs/ia/tareo.md` | Módulo Tareo (personal obrero): selector de módulo, roles `tcap`/`tasis`/`tcos`, máster, partidas de control, jornada. |
| `docs/ia/pendientes.md` | Pendientes conocidos de las auditorías: revísalo antes de una auditoría nueva. |

Al terminar un cambio, actualiza **el archivo del tema** (no este), salvo que cambie algo general.

## Patrones generales del código (`web/js/`)

- **Datos:**
  - Todo acceso pasa por `fcol('coleccion')`. Se usará para separar obras/empresas; no uses `db.collection` directo.
  - Hora: usa `NOW()`, `todayIso()` y `ldt(t)`, nunca `Date.now()` ni `new Date()`. `NOW()` corrige el reloj del equipo con la hora del servidor (`SKEW`).
- **Escritura del lookahead:**
  - `apply([op(col,id,despues)], 'mensaje')` registra para deshacer y llama a `put()`, que guarda **solo los campos que cambian** (`fsDiff`).
  - Para eliminar usa `arc(col,id)` (archiva), nunca `op(col,id,null)` salvo en modo propuesta.
- **Registro diario:**
  - `writeDaily(fecha, pisoId, {recs:{...}})` con `baseRec(...)`.
  - `liveWrite(...)` para los reportes en vivo.
  - Lectura con `recOf(fecha, actId)`; ojo, incluye propuestas del capataz (`_prop`).
- **Estado:**
  - `S.<col>`: Maps con los datos activos.
  - `ARCH.<col>`: lo archivado.
  - `U`: estado de la interfaz; se guarda con `saveUI()`, que tiene una **lista explícita de claves**, así que agrega allí las nuevas.
  - `P()`: configuración del proyecto, con valores por defecto.
- **Dibujo:** `render()` → `views[U.tab](main)`. Usa `requestRender()` en vez de `render()` directo. `requestRender` espera (`uiBusy`) mientras hay una lista desplegable abierta o se arrastra sobre un plano (`.pv`): redibujar ahí cerraba la lista o borraba el rectángulo en curso cuando llegaban cambios de otros usuarios. Si una vista lanza un error, `render()` muestra "No se pudo mostrar…" con botón de recarga (no queda en blanco, pero el error sigue siendo un error: revísalo). Vistas con plano (Liberaciones › Plano) se arman **una vez** y luego solo actualizan sus partes; redibujarlas enteras descuadra el visor. El **Lookahead** no se destruye al cambiar de pestaña: `leaveView()`/`enterView()` apartan su `<main>` (id `mainLook`, clase `.lkeep` con `content-visibility:hidden`) y lo reponen al volver; a `.lkeep` no le pongas nada heredable (`visibility`, `pointer-events`, `color`…), porque obligaría a recalcular el estilo de miles de filas (se midió: de ~30 ms a ~1,5 s). El HTML se arma con template strings y `esc()` para todo texto del usuario.
- **Escrituras en cola:** `put` encadena las escrituras por documento; mientras una espera a la anterior, `QK` la marca y `keepQueued` evita que la foto que llega de la base pise la versión local (eso hacía parpadear las barras al mover).
- **Filtro de subcontratistas:** `U.sc` guarda uno o varios ids separados por coma; usa `scOk(sc)`/`scSel()`, nunca `U.sc===x.sc`. Ctrl+clic en la leyenda suma o quita.
- **Calendario:** `isWork(d)`, `nwReason(d)` (domingo, feriado, sábado no laborable), `wshift` y `wdist` (días hábiles).
- **Dónde va el código nuevo:** en el archivo de `js/` de su tema. Una funcionalidad grande nueva va en un archivo nuevo de `js/` (con `"use strict";` y su comentario de encabezado), agregado en `index.html` **antes de `js/hoy.js`**; `check.mjs` avisa si olvidas cargarlo.
- **Orden de carga:** el código suelto (fuera de funciones) de un archivo solo puede usar lo definido en archivos anteriores; dentro de funciones se puede usar todo. Por eso el arranque (`inicio.js`) va al final. Los nombres son globales y únicos entre todos los archivos.
- **CSS** (`css/app.css`):
  - **Sistema de componentes** (al final del archivo): variables `--r-ctl` (8 px, botones y campos), `--r-card`, `--r-dlg`, `--r-sheet`, `--h-ctl`, `--sh-1`/`--sh-2`, `--backdrop`, `--ease`/`--t-fast`/`--t`/`--t-slow`, `--ring`. Para algo nuevo usa las clases que ya existen (`.ib`, `.ib.pri`, `.seg`, `.tin`, `.chip`, `.kx`, `.card`, `.tile`, `.callout`, `.pop`, `.lqm`+`.lqc`, `.ksheet`+`.ksc`) y estas variables; no inventes otra medida ni otra sombra.
  - **Transiciones:** ventanas, hojas, menús y avisos entran con `lps-fade`/`lps-pop`/`lps-up`/`lps-rise`; al cambiar de pestaña, `viewIn(main)` agrega `.vin` (solo opacidad, para no mover lo fijo). No animes contenido que se redibuja con cada dato que llega (se vería parpadear). Con "reducir movimiento" en el equipo, todo se apaga.
  - **Revisa que un nombre de clase nuevo no exista ya**: `.ppc`, `.wrap`, `.mleg` y `.dsv` ya chocaron antes.
  - Cada color nuevo necesita su versión en modo oscuro (`@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) …}` y `:root[data-theme="dark"]`).
- **Confirmaciones y motivos:** nunca `confirm()`/`prompt()`/`alert()` del navegador (`check.mjs` lo rechaza): usa `await uiAsk({title, text|html, list, note, ok, cancel, tone:'info'|'warn'|'danger'|'ok', input:{label, required}})` (base.js) → `true/false` o el texto. En las pruebas pasa por `confirm`/`prompt` (`window.__uiAskNative` del Firebase falso), así que `page.on('dialog')` sigue sirviendo; la ventana real se prueba en `uiask.spec.js` con `window.__uiAskReal=true`. `apply(ops, label, after)`: `after` corre cuando el cambio se aplica de verdad (también si el admin confirma un día cerrado después).
- **Piso:** el selector principal `U.piso` filtra todas las pestañas; no agregues un selector de piso propio que compita con él.
- **Celular:** el diseño cambia a `max-width:760px` (barra inferior `#bnav`). Los botones táctiles deben medir ≥ 40 px.

## Cómo probar

- **Sintaxis:** `node scripts/check.mjs`.
- **Interfaz (Playwright):** `cd tests/e2e && npm install && npx playwright install chromium && npx playwright test`. El ciclo con 16 usuarios a la vez va aparte: `CICLO=1 npx playwright test auditoria-ciclo` (en GitHub es un paso propio). Abre la app en Chromium con un Firebase falso en memoria (`fake-firebase.js`: obra de prueba con pisos, actividades, restricciones, liberaciones y un usuario por rol) y recorre todas las pestañas con cada rol, en PC, celular y modo oscuro, más los flujos principales. `window.__dbGet(col,id)` y `window.__dbAll(col)` leen la base falsa desde la prueba. Los Excel se prueban sirviendo `xlsx-js-style` local (ver `cliente.spec.js`). Agrega una prueba cuando hagas una pestaña o flujo nuevo. Corre en GitHub antes de publicar.
- **Tareas del servidor:** `cd functions && npm install && npm test`.
- **Reglas:** se prueban en GitHub. En local:

  ```
  firebase emulators:exec --only firestore --project demo-lps "cd tests/rules && npm test"
  ```

  Requiere Java.
- **De punta a punta:** sube a `main` y revisa la copia de prueba. Para probar con datos reales: en la obra, Equipo › Descargar respaldo de datos; en la copia de prueba, Equipo › Cargar datos desde archivo.

## Flujo de trabajo con GitHub

- Rama nueva → *pull request* a `main` con etiqueta `auto-unir` → GitHub prueba (Revisar, interfaz en 3 partes a la vez y, si el cambio toca el ciclo diario, la de 16 usuarios), une (squash) y publica la copia de prueba solo. La prueba de 16 usuarios corre solo si cambian `plano.js`, `base`/`propuestas`/`campo`/`en-obra-tablero`/`auditoria`/`lookahead`/`plan-restricciones.js`, `functions/`, `firebase/`, `.github/` o sus pruebas (`previo` → `ciclo`).
- Al unir a `main` las pruebas de la interfaz **no se repiten** si el código es idéntico (mismo árbol de archivos) al que ya pasó en el PR: el trabajo `previo` busca la constancia `e2e-ok-<árbol>` que deja `aprobado`. Si `main` cambió entre medio (otra conversación unió algo), se corren de nuevo.
- Al unir a `main`, si el cambio no toca `firebase/`, `functions/`, `firebase.json`, `.firebaserc` ni `.github/`, no se reinstala Firebase (el trabajo «Instalar» pasa en segundos); en `produccion` siempre se instala.
- Solo con aprobación explícita del dueño: *pull request* `main → produccion` y unir con *merge* (no squash). En `produccion` no se repiten las pruebas de la interfaz (ya pasaron en `main`): corre «Revisar» → instalar → publicar (~5 min).
- Si `gh pr create` falla por GraphQL, usa la API REST: `gh api repos/Frandiopacheco/LPS911/pulls` (POST) y `.../pulls/N/merge` (PUT).

## Modo rápido (por defecto, decidido con el dueño, oct 2026)

El dueño prioriza ver los cambios pronto en la copia de prueba. Salvo que pida lo contrario o el cambio sea delicado:

- **No correr la batería completa en local.** Solo `node scripts/check.mjs` y los archivos de prueba del tema tocado (`npx playwright test <archivo>.spec.js`). La batería completa la corre GitHub en el PR (en 3 partes a la vez, ~3 min).
- **Pruebas nuevas solo para lógica delicada:** PPC, transacciones, permisos/reglas, cierre/publicación del plan, datos que se puedan perder. Ajustes de texto, estilo o diseño van sin prueba nueva. No hace falta demostrar que la prueba falla con el código anterior salvo en correcciones de auditoría.
- **Juntar** los cambios pedidos en la misma conversación en **una rama y un PR**.
- **No esperar a GitHub (unir solo):** crear el PR a `main` con la etiqueta **`auto-unir`** (`gh api repos/Frandiopacheco/LPS911/issues/N/labels -X POST -f 'labels[]=auto-unir'`) y **responder al dueño en ese momento**: si todo pasa, GitHub lo une (trabajo `unir`) y lanza el flujo en `main` que publica la copia de prueba (~5–8 min en total). Si el dueño avisa que no apareció, revisar con `scripts/esperar-ci.sh <rama>`; si una prueba falló y es ajena al cambio, `gh run rerun <id> --failed`. Sin etiqueta: unir a mano como antes.
- **A producción**, cuando el dueño lo apruebe: PR `main → produccion` y unir en cuanto pase «Revisar» (~4–5 min en total); no se repiten las pruebas de la interfaz.
- **Conversaciones cortas:** una conversación por tema; todo lo necesario está en este archivo y en `docs/ia/` (lee solo el tema que tocas).
- **Flujo completo** (batería entera en local, prueba que falla antes) solo para cambios grandes en reglas, servidor (`functions/`) o el ciclo diario/PPC.

## Auditorías externas (ChatGPT u otra IA)

El dueño encarga auditorías por tema a otra IA y trae el informe. Así se trabaja con ellos:

1. **Una conversación nueva por informe.** Todo lo necesario está en este archivo y en `docs/ia/`; no hace falta el historial.
2. **Comprobar la versión:** el informe dice qué commit auditó. Si no es el de `main`, revisa con `git diff <commit> main -- <archivos citados>` si las líneas siguen valiendo.
3. **No repetir lo ya probado:** lo que el informe marca como **reproducido en Chromium** (con su evidencia) se da por confirmado y pasa directo a corregir. Lo que es solo lectura de código se contrasta leyendo **solo las líneas citadas** (si son muchas, con un subagente de modelo económico). Lo de gravedad baja lleva un veredicto de una línea.
4. **Opinión antes de tocar nada:** tabla corta por n.º (confirmado / en parte / no, y si cambia la gravedad), puntos que repiten pendientes ya conocidos y decisiones que necesita el dueño. **Solo se implementa lo que él aprueba.**
5. **Una sola rama y un solo *pull request* por informe** (salvo que algo sea riesgoso y convenga separarlo). Cada punto de lógica delicada lleva su prueba de regresión. En local solo corren los archivos de prueba tocados; la batería completa la corre GitHub en el PR (ver «Modo rápido»).
6. Al terminar: actualizar el archivo del tema en `docs/ia/` (patrones nuevos) y `docs/ia/pendientes.md` y entregar un resumen corto. `produccion` nunca se toca sin aprobación.
