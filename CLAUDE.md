# CLAUDE.md: guía del repositorio para asistentes de IA

Léela antes de tocar el código. Sirve para cualquier IA (Claude, Copilot, Codex, Cursor, Gemini…).

## Qué es

**LPS 911**: app web del *Last Planner System* para una obra de construcción en Lima (Perú). Incluye lookahead, plan semanal, restricciones, registro de campo, capataces en celular, tablero en vivo, plan diario (sectorización en planos), liberaciones de calidad e indicadores (PPC).
- Usuarios: ingenieros de producción y de campo, subcontratistas (SC), capataces, áreas de apoyo (Oficina Técnica, Calidad) y administrador.
- Pestañas (`data-tab`): `hoy` Hoy (inicio de cada rol), `dash` Tablero, `look` Lookahead, `campo` Campo, `mapa` Plan diario, `cap` En obra, `plan` Plan semanal, `restr` Restricciones, `lib` Liberaciones, `ind` Indicadores, `planos` Sectorización, `cfg` Configuración, `team` Equipo. Los nombres visibles cambiaron ("Plano diario" → "Plan diario", "Planos" → "Sectorización"); los ids no.
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
| `web/js/*.js` | El código de la app, por temas (en el orden de carga): `base` (utilidades, estado, escritura, conexión, sesión, menús, `render`), `lookahead`, `campo`, `en-obra-tablero`, `propuestas`, `auditoria` (papelera, calendario, hora del servidor, responsables de piso…), `liberaciones`, `mover` (mover en bloque), `presentacion` (modo presentación), `cliente` (versión cliente), `no-programado` (trabajo no programado visto en obra), `sectorizacion` (mapa de ambientes y sectores), `hoy` (pantalla Hoy), `interfaz` (navegación por rol, barra superior, selector de fecha, `pageHead`/`helpBox`), `plan-restricciones`, `indicadores`, `config-equipo` (Sectorización, Configuración, Equipo), `exportes` (PDF/Excel) e `inicio` (arranque de Firebase; **siempre el último**). Son *scripts* clásicos, no módulos: comparten las mismas variables globales, como si fueran un solo archivo. Cada uno empieza con `"use strict";`. |
| `web/plano.js` | Módulo del plan diario (~190 KB, una IIFE): láminas, zonas, modo reunión (piso/día, cruces, tarjeta de cumplimiento), exportes PDF/Excel, plano del capataz. Se carga tarde (`PLANO_SRC`). Lo que usa el resto de la app se exporta en `window.__plano` (`capPlan`, `capDraw`, `zoneFor`, `nums`, `crossOf`, `zcClose`…): una función interna **no** es global, expórtala ahí. |
| `web/sw.js` | Service worker: modo sin internet y aviso de "versión nueva". `VER` lo pone el build. |
| `config/produccion.js`, `config/pruebas.js` | `window.FIREBASE_CONFIG` de cada proyecto (no son secretos). |
| `firebase/firestore.rules` | Reglas de seguridad (roles, ver abajo). |
| `firebase/database.rules.json` | Realtime Database: solo `presence` ("conectados"). |
| `functions/` | Cloud Functions (Node.js 22): `versionDominical` (dom 12:05 Lima) y `aceptarCierres` (23:30 Lima). La lógica pura está en `lib.js`, con pruebas en `test/`. |
| `tests/rules/` | Pruebas de reglas con `@firebase/rules-unit-testing` (corren en GitHub con el emulador). |
| `scripts/build.mjs` | Lo usa la publicación: elige config por rama, pone la versión en `sw.js` y en las URLs `?v=` de `css/`, `js/` y `plano.js`, y llena `ASSETS` del service worker para que funcione sin internet. |
| `scripts/check.mjs` | Revisión de `web/`: sintaxis de cada archivo, que todo lo que carga `index.html` exista (y que no sobre nada en `js/`), `"use strict"` al inicio y `inicio.js` al final: `node scripts/check.mjs`. |
| `tests/e2e/` | Pruebas de la interfaz con Playwright y un Firebase falso en memoria (ver "Cómo probar"). |
| `.github/workflows/ci.yml` | Revisa (sintaxis, functions, reglas) y prueba la interfaz (Playwright) → instala en Firebase → publica en Netlify. |

## Entornos

| Rama | Firebase | Netlify |
| --- | --- | --- |
| `main` | `lps911-pruebas-49641` (sin Realtime Database) | `https://main--lps911-central.netlify.app` (cinta roja PRUEBAS) |
| `produccion` | `lps911` | `https://lps911-central.netlify.app` |

Netlify protege las copias que no son producción (`main--…` pide iniciar sesión en Netlify), así que no se abren desde otro celular ni en incógnito. Para probar roles y celular usa, en la copia de prueba, Equipo › **👁 Ver como…** y **📱 Vista celular** (solo el administrador real; ver abajo).

Secretos de GitHub: `FIREBASE_SA_PRUEBAS`, `FIREBASE_SA_PRODUCCION` y `NETLIFY_AUTH_TOKEN`. Netlify no compila por su cuenta: publica GitHub con `netlify deploy`.

## Datos (Firestore)

- **Estructura:** `meta/project`, `pisos`, `sectors`, `ambientes`, `acts`, `weeks`, `restr`, `contractors`. Se cargan enteras al entrar (`COLS`). Sectores y ambientes pueden tener `geo:{vistaId:[x,y,…]}`: su forma en la lámina base del piso (Sectorización).
- **Lookahead:**
  - `acts`: `{ambId, sc, name, und, metrado, days:[YYYY-MM-DD], qty:{fecha:n}, order, arch?}`.
  - `lhver` + `lhidx`: versiones guardadas.
  - `lhprop/{sc}`: propuestas de subcontratistas.
- **Campo:**
  - `daily/{fecha}_{pisoId}`: `{date, pisoId, recs:{actId:{status:'ok'|'no'|'partial', cnc, note, done, photos, prop, sc, nm, ambId, by, ts}}, extra:{}}`.
  - `live/{fecha}_{actId}`: reportes en vivo del capataz (`st` run/stop, `close`, `log`, `sat` = hora del servidor).
  - `doneidx/{pisoId}`: `{d:{actId:fecha}}`, índice de actividades terminadas.
  - `nprog/{id}`: trabajo **no programado** visto en obra `{date, pisoId, ambId, sc, desc, und, exec, note, photos, pt:{x,y,v}|null, by, byName, ts, del?, actId?, ed?}` (`pt` = punto en la lámina `v`; `actId` si se pasó al lookahead). Los antiguos están en `daily.extra`: léelos siempre juntos con `npItems(fechas, pisos)`.
  - `fotos`: imágenes base64 (se pasarán a Cloud Storage).
- **Plano diario:** `planos` (imágenes antiguas de Sectorización, se conservan plegadas), `laminas`, `lamimg` (imágenes base64 en trozos), `pdz` (zonas del día) y `pzon` (última zona por actividad).
- **Restricciones:** `restr`: `{actId, pisoId, type, desc, resp, need, freed, status, sc?, grp?, area?, by}`. `actId` la amarra a su fila del lookahead (se muestra la ubicación y "Ver en el lookahead").
- **Liberaciones de calidad:**
  - `lib/{id}`: `{actId, ambId, pisoId, sc, rule, crit, sup, need, st, prog:{d,h,insp}, obs:[{t,ok}], photos, proto, zona:{pts,vista,pisoId}, hist, by}`. Estados `st`: `sol` solicitada → `pro` programada → `obs` observada → `lev` levantada → `lib` liberada (`libm` liberada con obs. menores, `anu` anulada; `LST` tiene los nombres y colores). **`prog` puede ser null**: protege siempre `l.prog&&l.prog.d`.
  - `libm/main`: matriz `{rules:[{id, keys:[sc|nombre normalizado], sc, act, crit, rest:[keys], sup, proto, ant}], ex:{actId:'no'|ruleId}, autoRestr, insp:[nombres]}`. Las reglas se amarran al lookahead con `keyOf(x)=sc+'|'+nrm(name)` (no texto libre). `autoRestr` está apagado: lo pendiente de liberación **no** se vuelve restricción por ahora.
  - Solo se ubican en el plano las liberaciones **programadas**.
- **Versión cliente** (el admin y quienes él designe con `members.cli:true`, solo roles editor/campo/área/lector; reglas `canCli()`):
  - `cli/buf`: holguras en días hábiles `{all, p:{pisoId:n}, s:{sectorId:n}, a:{ambId:n}, x:{actId:n}}`; manda la más específica.
  - `clidx/{id}` + `cliver/{id}__{pisoId}`: versiones **emitidas** al cliente (como `lhidx`/`lhver`, con las fechas ya corridas).
- **Equipo:**
  - `members/{correo}`: `{role, name, sc, scs, dash, cli?, pisos?, area?}`; `cli` = acceso a la versión cliente (lo marca el admin en Equipo); `pisos` = pisos a cargo de un editor (responsable de piso); `area` = nombre del área de apoyo; capataces con id `u_<uid>` (sesión anónima por QR).
  - `inv`: invitaciones de capataces.
  - `clock/{uid}`: lo usa la sincronización de la hora.

## Roles (reglas y app)

- `admin`: todo; el dueño `frandiopacheco@gmail.com` siempre es admin.
- `editor`: ingeniero de producción; edita el lookahead. Resuelve las propuestas de SC **solo en los pisos a su cargo** (`pisos`); piso sin responsable: solo el admin (`canDecide`, `respOf`).
- `campo`: ingeniero de campo; registro diario.
- `sc`: subcontratista; propone en el lookahead, solo su partida. Inicia/detiene sus actividades en "En obra" (no cierra el día), crea restricciones de su partida y solicita liberaciones.
- `capataz`: celular, solo su partida, reportes en vivo.
- `area`: área de apoyo (OT, Calidad…): ve todo y resuelve las restricciones de su área. Si el área contiene "Calidad", además programa/libera y edita la matriz e inspectores (`isCal()`, `canLibMatrix()`).
- `veedor`: recorre la obra y registra el trabajo no programado (Campo › Plano); el resto solo lo consulta.
- `lector`: solo lectura.

En el código: `canWrite` (admin/editor), `canDaily` (+campo), `PM()` (subcontratista en modo propuesta), `ENG()` (ingeniero en Campo), `SCK()` (subcontratista), `AREA()` (área de apoyo), `isCal()`, `canNP()` (registra no programado: campo/editor/admin, Calidad y veedor) y `VEED()` (lo registra pero no verifica el avance).

**Ver como** (solo copia de prueba, `LPS_ENV==='pruebas'`): el admin simula otro rol; se guarda en `sessionStorage` `lps.va` y lo aplica `vaApply()`. Solo cambia la interfaz: las escrituras van con el usuario real y las reglas reales. **📱 Vista celular** (`phonePreview`) abre la app en un `iframe` con medidas de teléfono; dentro del marco `html.in-frame` oculta esos controles.

## Interfaz: navegación, fecha y páginas (`js/interfaz.js`, `js/hoy.js`)

- **Pestañas por rol:** `TAB_ORDER` (orden Last Planner), `tabAllowed(t)` (quién puede abrirla), `tabPrimary()` (las de la barra según el rol) y `tabSecondary()` (van en el menú **Más**). `navApply()` las ordena en cada dibujo. Una pestaña nueva: agrégala a `TAB_ORDER`, `TAB_SHORT`, `tabPrimary()` del rol que la usa a diario y a `views` en `render()`.
- **Celular:** `bnavItems()` = 4 accesos por rol (+ «Más» con `bnavMore()`); íconos en `BNI`.
- **Inicio:** todos (menos el capataz) entran a **Hoy** (`renderHoy`, tarjetas por tema con `hoyCards()`); `#<tab>` en la URL abre otra pestaña.
- **Fecha única:** se elige arriba. `dateMode()` dice si la pestaña es por semana (`U.week`) o por día; el día común es `DAY_SEL` (`curDay()`, `daySet(d)`); `CU.date`, `indDay()` y `M.date` del plan diario lo usan. No agregues otro selector de fecha dentro de una pestaña.
- **Barra superior:** `topToolsApply()` muestra Exportar Excel solo en el Lookahead y deshacer/rehacer solo en `UNDO_TABS`.
- **Página:** las pestañas «página» empiezan con `pageHead(título, contexto, acciones)` (la acción principal con `.ib.pri`) y luego una barra de filtros `.fbar`; Lookahead y Plan diario son «herramientas» a todo el ancho. Las explicaciones largas van en `helpBox(resumen, html)`. En el celular los filtros secundarios van en `.fmore` con el botón `[data-ftog]`, y las tablas usan `table.rt` con `data-l` en cada celda para verse como tarjetas.

## Patrones del código (`web/js/`)

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
- **Dibujo:** `render()` → `views[U.tab](main)`. Usa `requestRender()` en vez de `render()` directo. Si una vista lanza un error, `render()` muestra "No se pudo mostrar…" con botón de recarga (no queda en blanco, pero el error sigue siendo un error: revísalo). Vistas con plano (Liberaciones › Plano) se arman **una vez** y luego solo actualizan sus partes; redibujarlas enteras descuadra el visor. El **Lookahead** no se destruye al cambiar de pestaña: `leaveView()`/`enterView()` apartan su `<main>` (id `mainLook`, clase `.lkeep` con `content-visibility:hidden`) y lo reponen al volver; a `.lkeep` no le pongas nada heredable (`visibility`, `pointer-events`, `color`…), porque obligaría a recalcular el estilo de miles de filas (se midió: de ~30 ms a ~1,5 s). El HTML se arma con template strings y `esc()` para todo texto del usuario.
- **Lookahead grande:** desde `VIRT_MIN` (400) filas, `renderGrid` dibuja solo la ventana visible (`virtPaint`, bloques de `gridBlocks` que no cortan el `rowspan` del ambiente, filas `.vsp` de relleno). Una fila puede **no estar en la página**: para llevar a una actividad usa `gridReveal(aid)` antes de buscar su `tr`. El `<select>` de subcontratista de cada fila trae solo la opción elegida y se llena al abrirlo (`scFill`). La prueba `tests/e2e/rendimiento.spec.js` (obra de 2400 actividades) falla si se vuelve lento.
- **Mover en bloque** (`js/mover.js`): `shiftActs(ids, n, desde, etiqueta)` corre n días hábiles los días ≥ `desde` (lo pasado no se toca, lo terminado no se mueve) en un solo `apply` (se deshace junto). Menús de actividad/ambiente/sector/piso y selección con Ctrl+clic en ⋮ (`SELA`, barra `#mvbar`, Alt+←/→).
- **Versión cliente** (`js/cliente.js`): un solo programa interno; la versión del cliente se calcula = fecha interna + holgura (`bufOf`, `cliActs()`, en caché). Lookahead › **Vista cliente** (`U.cliv`, banda `#cliban`, solo lectura: `verRO()` la incluye) muestra las fechas internas como marcas grises (`td.d.cin`) y botones `+n` para la holgura de cada nivel; también en los menús ⋮ («Holgura para el cliente…»). **Emitir al cliente** guarda una foto semanal; el **PPC del cliente** (Indicadores › Semanal, `cliPpc`) se mide contra la última versión emitida hasta el lunes de cada semana. Acceso: `canCli()` (admin, o `me.cli` con rol en `CLI_ROLES`); al perderlo, `cliStop()`. `cliLate()` marca con ⚑ lo que ya pasa la fecha emitida (y la tarjeta «Holgura del cliente» en Hoy). El Excel del cliente (`exportXlsx` en vista cliente) lleva solo Lookahead, PPC y Leyenda.
- **Trabajo no programado** (`js/no-programado.js`): en Campo › Plano (`renderCap`), un toque en un lugar sin actividad llama a `onEmpty` de `capPlan` y abre la ficha (`npNew`): ambiente según el punto (`__plano.ambAt`/`ambAtP`, por las zonas del día y las últimas `pzon`), subcontratista, qué hacen (actividades de ese SC en el lookahead) y foto. Los puntos se dibujan con `marks` (`npMarks`) y se abren con `onMark` (`npOpen`). También se ven en el **Plan diario** (marcas `np:<id>` que abre `tapSelect`, y la lista «Visto en obra» con `npSeenHtml`). Se cuentan en Campo, Hoy, Indicadores (`dayData().extras`), el reporte PDF y el Excel; no cambian el PPC. El ingeniero puede «Pasarlo al lookahead» (`npToLook`).
- **Sectorización** (`js/sectorizacion.js`, estado `SZ`): usa las **mismas láminas** del Plan diario. **La lámina base de cada piso se sube aquí** (`__plano.lamUpload(btn,null,{mode:'base',pid})`); el Plan diario solo sube especialidades (`mode:'spec'`) sobre una base existente. El contorno de cada sector se calcula solo con sus ambientes (`szHull`, envolvente); el ambiente elegido muestra esquinas para ajustarlo (`edit`/`onEdit` de `ambMap`, puntos medios agregan esquinas). Polígono: tocar cada esquina y cerrar tocando la primera, doble clic o Enter. Por nivel (`U.piso`, con chips de avance por piso), lista ordenada de sectores y ambientes del lookahead y la lámina base (`__plano.ambMap`); «Ubicar» dibuja rectángulo (usa `capDraw`) o polígono y guarda `geo` con `apply()` (Ctrl+Z). «Proponer desde el Plan diario» (`ambSuggest`: rectángulo de sus zonas) y «Copiar de otro piso» (por código, pisos típicos). El menú ⋮ del ambiente en el Lookahead abre Sectorización en ese ambiente (`szGoAmb`). `ambAt` (recorrido de Campo) usa primero estas formas.
- **Modo presentación** (`js/presentacion.js`, estado `LKP`): pantalla completa con barra propia (`#presbar`), letra con `--pz` (CSS `zoom`), edición bloqueada por defecto (`canWrite=false` mientras dure), filtro por semana o día en la barra (`#pbwk`/`#pbday`, los mismos `U.wkF`/`U.day` que tocar el encabezado), puntero rojo y salida con Esc. Ojo: `PRES` ya es el mapa de «conectados».
- **Calendario:** `isWork(d)`, `nwReason(d)` (domingo, feriado, sábado no laborable), `wshift` y `wdist` (días hábiles).
- **Dónde va el código nuevo:** en el archivo de `js/` de su tema. Una funcionalidad grande nueva va en un archivo nuevo de `js/` (con `"use strict";` y su comentario de encabezado), agregado en `index.html` **antes de `js/hoy.js`**; `check.mjs` avisa si olvidas cargarlo.
- **Orden de carga:** el código suelto (fuera de funciones) de un archivo solo puede usar lo definido en archivos anteriores; dentro de funciones se puede usar todo. Por eso el arranque (`inicio.js`) va al final. Los nombres son globales y únicos entre todos los archivos.
- **CSS** (`css/app.css`):
  - **Sistema de componentes** (al final del archivo): variables `--r-ctl` (8 px, botones y campos), `--r-card`, `--r-dlg`, `--r-sheet`, `--h-ctl`, `--sh-1`/`--sh-2`, `--backdrop`, `--ease`/`--t-fast`/`--t`/`--t-slow`, `--ring`. Para algo nuevo usa las clases que ya existen (`.ib`, `.ib.pri`, `.seg`, `.tin`, `.chip`, `.kx`, `.card`, `.tile`, `.callout`, `.pop`, `.lqm`+`.lqc`, `.ksheet`+`.ksc`) y estas variables; no inventes otra medida ni otra sombra.
  - **Transiciones:** ventanas, hojas, menús y avisos entran con `lps-fade`/`lps-pop`/`lps-up`/`lps-rise`; al cambiar de pestaña, `viewIn(main)` agrega `.vin` (solo opacidad, para no mover lo fijo). No animes contenido que se redibuja con cada dato que llega (se vería parpadear). Con "reducir movimiento" en el equipo, todo se apaga.
  - **Revisa que un nombre de clase nuevo no exista ya**: `.ppc`, `.wrap`, `.mleg` y `.dsv` ya chocaron antes.
  - Cada color nuevo necesita su versión en modo oscuro (`@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) …}` y `:root[data-theme="dark"]`).
- **Piso:** el selector principal `U.piso` filtra todas las pestañas; no agregues un selector de piso propio que compita con él.
- **Celular:** el diseño cambia a `max-width:760px` (barra inferior `#bnav`). Los botones táctiles deben medir ≥ 40 px.

## Cómo probar

- **Sintaxis:** `node scripts/check.mjs`.
- **Interfaz (Playwright):** `cd tests/e2e && npm install && npx playwright install chromium && npx playwright test`. Abre la app en Chromium con un Firebase falso en memoria (`fake-firebase.js`: obra de prueba con pisos, actividades, restricciones, liberaciones y un usuario por rol) y recorre todas las pestañas con cada rol, en PC, celular y modo oscuro, más los flujos principales. `window.__dbGet(col,id)` y `window.__dbAll(col)` leen la base falsa desde la prueba. Los Excel se prueban sirviendo `xlsx-js-style` local (ver `cliente.spec.js`). Agrega una prueba cuando hagas una pestaña o flujo nuevo. Corre en GitHub antes de publicar.
- **Tareas del servidor:** `cd functions && npm install && npm test`.
- **Reglas:** se prueban en GitHub. En local:

  ```
  firebase emulators:exec --only firestore --project demo-lps "cd tests/rules && npm test"
  ```

  Requiere Java.
- **De punta a punta:** sube a `main` y revisa la copia de prueba. Para probar con datos reales: en la obra, Equipo › Descargar respaldo de datos; en la copia de prueba, Equipo › Cargar datos desde archivo.

## Flujo de trabajo con GitHub

- Rama nueva → *pull request* a `main` → esperar el check "Revisar" → unir (squash) → esperar "Instalar en Firebase" y "Publicar la página en Netlify".
- Solo con aprobación explícita del dueño: *pull request* `main → produccion` y unir con *merge* (no squash).
- Si `gh pr create` falla por GraphQL, usa la API REST: `gh api repos/Frandiopacheco/LPS911/pulls` (POST) y `.../pulls/N/merge` (PUT).

## Pendientes conocidos (ver auditorías)

- Tanda B: avisos al celular (FCM), Lookahead que dibuje solo las filas visibles.
- Tanda C: proyecto nuevo guiado, ayuda táctil, fotos a Cloud Storage, App Check.
- Liberaciones: zonas como polígono (hoy rectángulo), restricción automática por liberación pendiente (apagada hasta decidir con Calidad).
