# CLAUDE.md: guía del repositorio para asistentes de IA

Léela antes de tocar el código. Sirve para cualquier IA (Claude, Copilot, Codex, Cursor, Gemini…).

## Qué es

**LPS 911**: app web del *Last Planner System* para una obra de construcción en Lima (Perú). Incluye lookahead, plan semanal, restricciones, registro de campo, capataces en celular, tablero en vivo, plano diario e indicadores (PPC).
- Usuarios: ingenieros de producción y de campo, subcontratistas (SC), capataces y administrador.
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
| `web/index.html` | **Toda la app** (~390 KB): HTML + 2 bloques `<style>` + 1 `<script>` grande. Sin build ni framework. |
| `web/plano.js` | Módulo del plano diario (láminas, zonas, exportes PDF/Excel del plan de trabajo, plano del capataz). Se carga tarde (`PLANO_SRC`). |
| `web/sw.js` | Service worker: modo sin internet y aviso de "versión nueva". `VER` lo pone el build. |
| `config/produccion.js`, `config/pruebas.js` | `window.FIREBASE_CONFIG` de cada proyecto (no son secretos). |
| `firebase/firestore.rules` | Reglas de seguridad (roles, ver abajo). |
| `firebase/database.rules.json` | Realtime Database: solo `presence` ("conectados"). |
| `functions/` | Cloud Functions (Node.js 22): `versionDominical` (dom 12:05 Lima) y `aceptarCierres` (23:30 Lima). La lógica pura está en `lib.js`, con pruebas en `test/`. |
| `tests/rules/` | Pruebas de reglas con `@firebase/rules-unit-testing` (corren en GitHub con el emulador). |
| `scripts/build.mjs` | Lo usa la publicación: elige config por rama, pone la versión en `sw.js` y en `plano.js?v=`, y revisa la sintaxis. |
| `scripts/check.mjs` | Revisión de sintaxis de `web/`: `node scripts/check.mjs`. |
| `.github/workflows/ci.yml` | Revisa (sintaxis, functions, reglas) → instala en Firebase → publica en Netlify. |

## Entornos

| Rama | Firebase | Netlify |
| --- | --- | --- |
| `main` | `lps911-pruebas-49641` (sin Realtime Database) | `https://main--lps911-central.netlify.app` (cinta roja PRUEBAS) |
| `produccion` | `lps911` | `https://lps911-central.netlify.app` |

Secretos de GitHub: `FIREBASE_SA_PRUEBAS`, `FIREBASE_SA_PRODUCCION` y `NETLIFY_AUTH_TOKEN`. Netlify no compila por su cuenta: publica GitHub con `netlify deploy`.

## Datos (Firestore)

- **Estructura:** `meta/project`, `pisos`, `sectors`, `ambientes`, `acts`, `weeks`, `restr`, `contractors`. Se cargan enteras al entrar (`COLS`).
- **Lookahead:**
  - `acts`: `{ambId, sc, name, und, metrado, days:[YYYY-MM-DD], qty:{fecha:n}, order, arch?}`.
  - `lhver` + `lhidx`: versiones guardadas.
  - `lhprop/{sc}`: propuestas de subcontratistas.
- **Campo:**
  - `daily/{fecha}_{pisoId}`: `{date, pisoId, recs:{actId:{status:'ok'|'no'|'partial', cnc, note, done, photos, prop, sc, nm, ambId, by, ts}}, extra:{}}`.
  - `live/{fecha}_{actId}`: reportes en vivo del capataz (`st` run/stop, `close`, `log`, `sat` = hora del servidor).
  - `doneidx/{pisoId}`: `{d:{actId:fecha}}`, índice de actividades terminadas.
  - `fotos`: imágenes base64 (se pasarán a Cloud Storage).
- **Plano diario:** `planos`, `laminas`, `lamimg` (imágenes base64 en trozos), `pdz` (zonas del día) y `pzon` (última zona por actividad).
- **Equipo:**
  - `members/{correo}`: `{role, name, sc, scs, dash}`; capataces con id `u_<uid>` (sesión anónima por QR).
  - `inv`: invitaciones de capataces.
  - `clock/{uid}`: lo usa la sincronización de la hora.

## Roles (reglas y app)

- `admin`: todo; el dueño `frandiopacheco@gmail.com` siempre es admin.
- `editor`: ingeniero de producción; edita el lookahead.
- `campo`: ingeniero de campo; registro diario.
- `sc`: subcontratista; propone en el lookahead, solo su partida.
- `capataz`: celular, solo su partida, reportes en vivo.
- `lector`: solo lectura.

En el código: `canWrite` (admin/editor), `canDaily` (+campo), `PM()` (subcontratista en modo propuesta), `ENG()` (ingeniero en Campo).

## Patrones del código (`index.html`)

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
- **Dibujo:** `render()` → `views[U.tab](main)`. Usa `requestRender()` en vez de `render()` directo. El HTML se arma con template strings y `esc()` para todo texto del usuario.
- **Calendario:** `isWork(d)`, `nwReason(d)` (domingo, feriado, sábado no laborable), `wshift` y `wdist` (días hábiles).
- **Bloques por etapa:** las funcionalidades nuevas se agregan como bloque `/* ===== ETAPA NN · … ===== */` antes de `/* ================= PLAN SEMANAL ================= */`.
- **CSS:**
  - Hay 2 bloques `<style>`; el primero termina antes del HTML.
  - **Revisa que un nombre de clase nuevo no exista ya**: `.ppc`, `.wrap`, `.mleg` y `.dsv` ya chocaron antes.
  - Cada color nuevo necesita su versión en modo oscuro (`@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) …}` y `:root[data-theme="dark"]`).
- **Celular:** el diseño cambia a `max-width:760px` (barra inferior `#bnav`). Los botones táctiles deben medir ≥ 40 px.

## Cómo probar

- **Sintaxis:** `node scripts/check.mjs`.
- **Tareas del servidor:** `cd functions && npm install && npm test`.
- **Reglas:** se prueban en GitHub. En local:

  ```
  firebase emulators:exec --only firestore --project demo-lps "cd tests/rules && npm test"
  ```

  Requiere Java.
- **De punta a punta:** sube a `main` y revisa la copia de prueba. Para probar con datos reales: en la obra, Equipo › Descargar respaldo de datos; en la copia de prueba, Equipo › Cargar datos desde archivo.

## Pendientes conocidos (ver auditorías)

- Tanda B: avisos al celular (FCM), pantalla "Hoy" por rol, Lookahead que dibuje solo las filas visibles.
- Tanda C: proyecto nuevo guiado, ayuda táctil, fotos a Cloud Storage, App Check, separar `index.html` en módulos.
