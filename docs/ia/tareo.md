# Módulo Tareo (personal obrero del consorcio)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca el módulo Tareo.

## Qué es

Un **módulo aparte** de LPS 911 (no una pestaña más): el selector de la barra superior cambia entre «Last Planner» y «Tareo»; cada módulo tiene sus propias pestañas. Reemplaza el Excel del asistente de tareo y el correo a costos. Propuesta y flujograma acordados con el dueño (oct 2026):

- Solo personal obrero **del consorcio** (los SC llevan su propio tareo).
- La **firma manual del formato físico es obligatoria** (tema legal) y cada obrero escribe su tareo con su letra: el sistema **no** pide firma digital ni imprime formatos prellenados. El obrero no usa el sistema.
- El **capataz del consorcio** llena en su celular la distribución de horas por partida de control y marca quién faltó (con motivo); envía con la foto del formato firmado. Si se equivoca, el asistente le reabre el tareo (o corrige él mismo errores chicos, con motivo).
- El **asistente de tareo** mantiene el máster de personal, coteja firmas (foto vs lista) y revisa observaciones.
- El **jefe de producción** publica el consolidado del día; **costos** solo ve y descarga lo publicado.

Fases: F0 base (selector de módulo, roles, máster, partidas de control, jornada) · F1 tareo del capataz en el celular · F2 bandeja del asistente · F3 publicación y Excel de costos · F4 garita (opcional) · F5 indicadores de HH.

## Contrato de F0 (no cambiar nombres sin actualizar este archivo)

### Roles (`members.role`)

| Rol | Etiqueta (`ROLE`) | Módulos | Notas |
| --- | --- | --- | --- |
| `tcap` | Capataz (tareo) | solo Tareo, celular | Distinto de `capataz` (que es de un SC). Entra con DNI y contraseña (cuenta `<dni>@tareo.lps911.pe`, ver «Cuentas de capataz»), con correo o con enlace de invitación anónimo (`u_<uid>`) como el capataz de SC. |
| `tasis` | Asistente de tareo | solo Tareo | Edita máster y partidas de control. |
| `tcos` | Costos | solo Tareo, lectura | En F3 verá solo días publicados. |
| `admin` | — | ambos | Edita también la configuración del tareo. |
| `editor` con `members.tpub == true` | marca «Publica tareo» | ambos | Jefe de producción: ve todo el Tareo; en F3 publica. |

Funciones en la app (`web/js/base.js`, junto a `ROLE`):

- `TAR_ONLY()` → `me.role in ['tcap','tasis','tcos']` (no carga nada de LPS).
- `canTar()` → `TAR_ONLY() || me.role==='admin' || (me.role==='editor' && me.tpub===true)`: ve el módulo Tareo.
- `canLps()` → `!TAR_ONLY()`.
- `tarEdit()` → `me.role in ['admin','tasis']`: edita máster y partidas.
- `me.tpub` se lee de `members.tpub` igual que `me.cli`.

### Módulo activo

- `U.mod`: `'lps'` (por defecto) o `'tar'`; se guarda con `saveUI()` (agregar la clave a la lista).
- Selector `#modsel` en la barra superior (`.seg` con dos botones `data-mod`), visible solo si `canLps() && canTar()`. Cambiar de módulo = `goMod(m)`: fija `U.mod`, lleva a la pestaña inicial del módulo y llama `render()`.
- Con `TAR_ONLY()`: `U.mod='tar'` fijo; al iniciar sesión **no** se suscribe a `COLS` ni a `daily`/`live`/`lib`… (no hace falta y en el celular pesa). `ready` debe quedar en `true` cuando cargan las colecciones del tareo (`TCOLS`).
- En modo Tareo se ocultan los controles de LPS de la barra (selector de piso, semana, deshacer/rehacer, Exportar Excel) y las pestañas de LPS; se muestran las del tareo.

### Pestañas del módulo Tareo (`data-tab`)

| id | Nombre | Quién | F |
| --- | --- | --- | --- |
| `tdia` | Tareos del día | todos los del módulo (placeholder en F0: «Llega en la fase 1») | F1 |
| `tper` | Personal | `canTar()`; edita `tarEdit()` | F0 |
| `tpc` | Partidas de control | `canTar()`; edita `tarEdit()` | F0 |
| `tcfg` | Configuración del tareo | `admin` | F0 |

`TAR_TABS=['tdia','tper','tpc','tcfg']`. `tabAllowed(t)` decide por módulo: en `U.mod==='tar'` solo `TAR_TABS` (y `team` para el admin, que sigue en LPS). Vistas en `web/js/tareo.js`: `renderTDia`, `renderTPer`, `renderTPc`, `renderTCfg`, registradas en el objeto `views` de `render()`. Pestaña inicial del tareo: `tdia` (el `tcap` en F1 tendrá su propia pantalla de celular).

### Datos (Firestore)

Colecciones nuevas, todas por `fcol()`:

- `tper/{dni}` — máster de personal (una ficha por DNI, con su historial de periodos): `{dni, ape, nom, pue, cat, cua, cap, ing, ces, mot, per, act, by, ts}`.
  - `dni`: texto. DNI de 8 dígitos **con ceros a la izquierda** (en el Excel de RR.HH. algunos vienen como número: `3684337` → `'03684337'`); carné de extranjería hasta 12 caracteres alfanuméricos. Limpiar basura (`'43241048 II'` → error para revisar, no adivinar).
  - `ape`: apellidos («PATERNO MATERNO»), `nom`: nombres. En RR.HH. vienen juntos como `'APELLIDOS, NOMBRES'` (separar por la coma; espacios dobles → uno).
  - `pue`: título del puesto tal cual (`'OPERARIO ALBAÑIL'`, `'RIGGER'`, `'PEON-VIGIA'`…).
  - `cat`: categoría derivada del puesto: empieza con OPERARIO → `'OP'`; OFICIAL → `'OF'`; PEON o AYUDANTE → `'PE'`; CAPATAZ → `'CA'`; otro → `'OT'` (editable).
  - `cua`: cuadrilla/especialidad (columna CATEGORIA de RR.HH.: `'ALBAÑILES'`, `'CARPINTEROS'`, `'ANDAMIEROS'`…).
  - `cap`: id de `members` del capataz (`tcap`) al que pertenece, o `''`.
  - `ing`/`ces`/`mot`: periodo vigente (último): fecha de ingreso, fecha de cese (`''` si sigue) y motivo de cese (`'Renuncia'`, `'Termino de partida'`…).
  - `per`: historial `[{ing, ces, mot}]` (hay **reingresos**: el mismo DNI aparece en varias filas).
  - `act`: `true` si el último periodo no tiene cese (o el cese es posterior a hoy). «Eliminar» archiva (`arch:{t,by,n}`), nunca borra.
  - **Importación del Excel de RR.HH.** (hoja «Datos del personal»): columnas `N°`, `Nombre`, `Tipo Trab.`, `Fecha De Ingreso`, `Título Puesto`, `CATEGORIA`, `DNI`, `Comentarios` (= fecha de cese, como fecha o texto `dd/mm/aaaa`; o `'Reingreso'`), y una 9.ª columna sin encabezado con el motivo de cese. Hay filas de encabezado repetidas dentro de los datos y filas vacías: ignorarlas. Agrupar por DNI y ordenar por fecha de ingreso para armar `per`.
- `tpc/{id}` — partidas de control (≈85): `{cod, grp, grpN, nom, und, met, hhp, ua, act, ord, by, ts}`.
  - `cod`: texto `'10.05'` (en el Excel vienen como fórmula o número flotante `2.0199999…` → redondear a 2 decimales y escribir con 2 decimales). `grp`: `'10'`, `grpN`: título del grupo (`'ESTRUCTURAS'`).
  - `nom`, `und` (unidad), `met` (metrado meta), `hhp` (HH presupuestadas), `ua` (cuenta de costos «UA - TAREO», p. ej. `'CD1030001-06'`).
  - Desactivar = `act:false` (siguen en tareos antiguos).
  - **Importación** desde la hoja «Lista de partidas» del Excel que hoy recibe costos: fila de grupo = número entero en B + título en C sin UA; fila de partida = código en B + descripción en C + und D + metrado E + HH F + UA H; filas «TOTAL PARTIDA DE CONTROL» se ignoran. Leer valores calculados (no fórmulas).
- `tcfg/main` — configuración: `{jor:{'1':{ini,fin,ref},…,'6':{…},'0':null}, refIni, limEnv, tolGar}`.
  - Por defecto (`TCFG_DEF`): lunes a viernes `ini:'07:30', fin:'17:00', ref:60`; sábado `ini:'07:30', fin:'13:00', ref:0`; domingo `null` (no laborable); `refIni:'12:00'`, `limEnv:'18:00'`, `tolGar:15` (minutos). Total 48 h semanales.
  - `TC()` devuelve la configuración con los valores por defecto (como `P()`).
- En la app: `TCOLS={tper:'tper',tpc:'tpc',tcfg:'tcfg'}` en `S.tper`, `S.tpc`, `S.tcfg` (Maps), suscritos solo si `canTar()`.
- `tper`, `tpc`, `tcfg` van en el respaldo (`BK_DATA`).

### Reglas (`firebase/firestore.rules`)

- `isTar()`: rol en `['tcap','tasis','tcos']`, o `admin`, o `editor` con `tpub == true`.
- `tarEd()`: rol en `['admin','tasis']`.
- `tper`, `tpc`: leen `isTar()`; escriben `tarEd()` (sin `delete`: se archiva).
- `tcfg`: leen `isTar()`; escribe solo `isAdmin()`.
- Los roles de solo tareo (`tcap`, `tasis`, `tcos`) **no** leen las colecciones de LPS ni escriben en ellas (las funciones de lectura existentes que usan `isMember()` deben excluirlos).
- `members`: `tasis` puede leer la lista (para asignar obreros a capataces); el `tcap` con enlace de invitación se registra como `capataz` hoy: en F1 se agrega la variante `tcap`.

## Contrato de F1: tareo del capataz en el celular

### Datos

- `tareo/{fecha}_{capId}` — un tareo por capataz y día (`capId` = id de `members` del capataz; si tiene `/` no aplica: los ids de members son correo o `u_<uid>`). Campos:
  - `date` (`YYYY-MM-DD`), `cap` (capId), `capN` (nombre del capataz), `st`: `'bor'` borrador · `'env'` enviado · `'reab'` reabierto por el asistente · `'rev'` revisado (F2) · `'pub'` publicado (F3).
  - `rows`: `{ <dni>: {ape, nom, cat, cua, as, mot, alt, ini, fin, h, trab, ext} }` — foto de la ficha (`ape, nom, cat, cua`) al agregarlo; `as` true = vino; `mot` motivo si no vino (`DM` descanso médico, `DA` descanso por accidente, `SU` suspensión, `SM` subsidio por maternidad, `SE` subsidio por enfermedad, `VA` vacaciones, `FA` falta, `LS` licencia sin goce, `L` liquidado); `alt` = trabajo en altura (bono (A)); `ini`/`fin` = primera entrada y última salida (de sus bloques); `h` = `{<pcId>: horas}`; `trab`/`ext` = horas trabajadas/extra (de `tCalcRow`).
  - `blq`: `[{id, pc, ini, fin, dnis:[...]}]` — lo que llena el capataz: partida + horario + quiénes. `rows[*].h/ini/fin/trab/ext` se **recalculan** de `blq` con `tCalc(doc)` antes de guardar (no se editan a mano en F1).
  - `foto`: `[fotoId,…]` — fotos del formato físico firmado en `tfot/{fotoId}` `{date, cap, n, d:<dataURL jpeg>, by, ts}` (JPEG reducido a ~1600 px de lado mayor, calidad 0.7; < 900 KB por documento; si es más, en trozos `d0,d1…` NO: reducir más).
  - `envAt`, `envN` (n.º de envíos: el celular lo incrementa al pasar a `env`; ver «Correcciones de la segunda auditoría — oficina»), `envBy`, `reab: {t, by, mot}`, `hist: [{t, by, a, mot}]` (`a`: `'env'|'reab'|'cor'|…`), `by`, `ts`.
- **Cálculo** (en `tareo.js`, funciones puras globales):
  - `tBlqH(fecha, ini, fin, cfg?)` → horas del bloque menos su **intersección** con la ventana de refrigerio del día (ver «Correcciones de la auditoría F2 — cálculo»).
  - `tCalc(doc)` → doc con `rows` recalculados: por obrero presente, `h[pc]` = suma de sus bloques; `ini`/`fin` = mín/máx; `trab` = suma de sus bloques (cada uno sin su parte de refrigerio) y `ext` = max(0, trab − jornada del día). Usa `doc.cfg` si existe.
  - `tValida(doc)` → `[{dni|null, k, msg, warn?}]`: presente sin horas (el motivo del ausente es opcional desde oct 2026); dos bloques del mismo obrero que se cruzan; bloque con fin ≤ ini o fuera de 05:00–23:59; sin foto (`k:'foto'`); sin obreros; jornada parcial (`k:'parcial'`, `warn:true`, **no bloquea**). Requisito para enviar: ninguna sin `warn` (`tValida(doc).filter(o=>!o.warn).length===0`).
- Reglas (`firestore.rules`):
  - `tareo`: lee `isTar()` salvo `tcap` (solo los suyos: `resource.data.cap == mid()`) y `tcos` (nada hasta F3). Crea/actualiza el `tcap` solo si `cap == mid()`, el id es `date + '_' + mid()`, y el estado anterior es `bor`/`reab` (o no existe) y el nuevo `bor`/`reab`/`env`; no puede cambiar `cap`/`date`; `date` no más de 3 días atrás ni en el futuro. `tasis`/`admin` actualizan cualquiera (reabrir = `st:'reab'`). Nadie borra.
  - `tfot`: crea el `tcap` con `cap == mid()`; leen `isTar()` (el tcap solo las suyas); nadie actualiza ni borra.
  - `inv`: variante de invitación para capataces del tareo: `inv/{code}` con `role:'tcap'` (sin `scs`); `members` create anónimo con `role:'tcap'` y `keys().hasOnly(['role','name','inv','added'])` si `invOk` y la invitación es `tcap`.

### Pantallas

- **`tcap`** (solo celular, `web/js/tareo-cap.js`): al entrar va directo a su tareo de hoy (`tdia` muestra `renderTCap` si `me.role==='tcap'`). Fecha arriba (hoy; puede elegir ayer o anteayer si no lo envió). Tres pasos con barra de progreso:
  1. **¿Quién vino?** Lista de su cuadrilla (`tper` activos con `cap == mi id`, más los que agregó ese día), todos marcados «vino» por defecto; tocar = «faltó» → chips de motivo (obligatorio). «+ Agregar obrero» busca por DNI o apellido en todos los activos (avisa si es de otro capataz). Casilla «altura» por obrero (o en el paso 2 por bloque, que marca a sus obreros).
  2. **¿En qué trabajaron?** Bloques: partida (buscador con las más usadas por este capataz arriba, por código o nombre), horario (inicio/fin con atajos de la jornada: «mañana» 7:30–12:00, «tarde» 13:00–17:00, «todo el día»), quiénes (por defecto todos los que vinieron; tocar para quitar). Barra por obrero: horas asignadas vs jornada; aviso si a alguien le faltan horas. Editar/duplicar/borrar bloque.
  3. **Revisar y enviar:** por obrero horario, horas, extra, altura; foto del formato firmado (cámara: `<input type=file accept=image/* capture=environment>`), obligatoria; «Enviar tareo» con `uiAsk`. Tras enviar: solo lectura con estado «Enviado ✓ · hora». Si el asistente lo reabre: aviso arriba con el motivo y vuelve a editable.
  - Guarda borrador automáticamente (debounce ~1 s) en `tareo`; funciona sin señal (persistencia de Firestore ya activa: `enablePersistence`), mostrando «Guardado en el celular · se enviará al tener señal» cuando la escritura no se confirmó.
  - Botones ≥ 44 px, texto grande, nada de tablas anchas.
- **Personal de oficina** (`tasis`, `admin`, editor con `tpub`) en `tdia` (`renderTDia`, PC y celular): selector de fecha; lista de capataces con tareo (o que tienen obreros asignados y no han enviado): estado (sin empezar / borrador / enviado / reabierto), obreros, faltas, HH, HE, observaciones de `tValida`. Abrir uno: detalle (obreros × partidas, fotos ampliables) y, para `tasis`/`admin`, «Reabrir al capataz» (motivo obligatorio con `uiAsk` input). Bandeja completa, corrección directa y cotejo de firmas: ver «Contrato de F2».
- **Equipo** (config-equipo.js): crear enlace/QR de invitación para capataces del tareo (como el de capataces de SC, pero con `role:'tcap'`); `capJoin` (base.js) registra `role:'tcap'` sin `scs` cuando la invitación es `tcap`.

### Mejoras del capataz (oct 2026)

Solo `tareo-cap.js` y el bloque CSS `/* tareo: capataz */`. Reemplaza lo dicho arriba para los pasos 1 y 2.

- **Asistencia explícita:** al crear el día nadie está marcado (`rows[dni].as: null`); cada obrero (lista numerada) tiene «Vino» / «No vino» (con motivo obligatorio en chips). «Todos vinieron» marca a los que faltan; contador «Marcados a de b». No se pasa al paso 2 (ni con las pestañas) si falta marcar a alguien o falta un motivo: lleva al primero y los resalta (`.tc-ob.need`). El agregado a mano entra con `as:true`. Sin obreros asignados: «No tienes obreros asignados. Pide a la oficina que te los asigne en Personal».
- **No vino ↔ vino no pierde horas:** marcar «No vino» ya **no** saca al obrero de los bloques (`tCalc` le da 0 h); en las tarjetas y chips del bloque sale tachado «no vino». Al volver a «vino» recupera sus horas. Por eso `tcErrs` ignora el `k:'falto'` de `tValida`.
- **Validación propia** (`tcErrs(D)` = `tValida(tCalc(D))` menos `falto` y menos `mot` de los sin marcar, más `k:'asis'` sin marcar y `k:'bloq'` partida bloqueada con `bid`). `tcFix(E)` lleva al primer problema (paso 1 → cruce → bloque/obrero del paso 2 → foto).
- **Cruces:** `tcCruces(D)` → `[{dni,a,b}]` entre bloques de los que vinieron. En el editor, el obrero que se cruza sale en rojo «se cruza con 10.05 7:30–12:00» y un recuadro ofrece: quitarlo de este trabajo, ajustar este (empieza al fin del otro o termina a su inicio) o ajustar el otro (si quedaría vacío, se le quita al obrero). «Guardar trabajo» no guarda con cruces. «Revisar y enviar» y el botón de enviar llevan al primer cruce y abren sus opciones (`TCS.cx`).
- **Línea de tiempo** por obrero (pasos 2 y 3), 6:00–20:00: bloques coloreados por partida (`TC_HUE`, luz en `--tc-sl`/`--tc-ss` con modo oscuro), refrigerio rayado, cruces en rojo tocables (`.tc-cxb`) y un botón «Se cruzan … · Resolver» (`.tc-cxl`) con: quitarlo de uno u otro, que el segundo empiece al fin del primero o que el primero termine al inicio del segundo.
- **Atajos de horario** (`tcAtajos`): Mañana, Tarde, +1 h, +2 h, +3 h (desde el fin del último bloque de los obreros elegidos o el inicio de la jornada; si cae en el refrigerio empieza al terminarlo y se alarga hasta sumar N horas reales con `tBlqH`), Extendido (fin de jornada → 19:00) y Todo el día. Un trabajo nuevo empieza por defecto donde terminó el último (hasta el fin de la jornada).
- **Partidas bloqueadas** (`tpc.bloq === true`, las pone costos): no salen en el buscador ni se copian del día anterior; un bloque que ya la tiene sale en rojo «Partida bloqueada por costos: cámbiala» y no deja enviar; «Cambiar partida» abre el editor con la partida vacía.
- Pruebas: `tests/e2e/tareo-cap.spec.js`.

## Contrato de F2: bandeja del asistente de tareo

Código en `web/js/tareo-rev.js` (después de `tareo-cap.js`); `renderTDia` sigue en `tareo.js` y llama a sus secciones. Globales con prefijo `tr`/`TR` (CSS `.tr-`, bloque `/* tareo: revisión */` al final de `app.css`).

### Datos nuevos en `tareo/{fecha}_{capId}`

- `st:'rev'` revisado (lo pone `tasis`/`admin`). `revAt` (ms), `revBy` (correo); se borran al «Quitar revisado».
- `rows[dni].fir`: `true` firmó · `false` vino y no firmó · ausente = sin cotejar. Solo cuenta para presentes.
- `rows[dni].gar`: `'HH:MM'` salida en garita (manual, opcional, regla 8).
- `hist[]` entradas nuevas `{t, by, a, mot?, cam?}`: `a:'fir'` cotejo guardado · `'cor'` corrección (`mot` obligatorio, `cam` resumen corto de lo cambiado; también «Registrar falta» desde «Sin tareo») · `'rev'` revisado (`cam` con las observaciones si alguien no firmó o la garita difiere) · `'qrev'` quitó revisado (`mot`) · `'reab'` (ya existía; ahora también desde `rev`). Siempre con `FieldValue.arrayUnion`.
- Todas las escrituras de la oficina van en transacción (`trTx`) que vuelve a comprobar el estado.

### Funciones (puras, en `tareo-rev.js`)

- `tObsRev(doc, calc?)` → `tValida` (con `bl:true`) + `k:'firp'` firma sin cotejar (`bl:true`) + `k:'nofir'` vino y no firmó + `k:'gar'` |gar − fin| > `TC().tolGar` min («Salida en garita distinta»). «Observaciones» en la lista y el filtro = todo menos `firp`.
- `tDups(docs)` → presentes en dos o más tareos del día `[{dni, nom, caps}]`.
- `tSinTareo(f, docs)` → activos (`tActivo`) que no figuran en ningún tareo del día (ni presentes ni con falta), agrupados por `cap` (`''` = «Sin capataz»).
- `tLate(f)` → pasó `TC().limEnv` (días anteriores sí; no laborable no).
- `tCam(antes, después)` → resumen de la corrección (bloques +/−/cambiados, vino/faltó, motivo, altura), ≤ 400 caracteres.

### Revisión (`toDetalle` → `trDraw`)

- Un solo detalle para la oficina; `tasis`/`admin` editan, el editor con `tpub` lo ve en solo lectura.
- Arriba: foto del formato (visor con acercar/alejar, rotar, pantalla completa y miniaturas) al lado de la lista de presentes (PC dos columnas, celular una debajo de otra). Por obrero: «Firmó» Sí/No y hora de garita. «Todos firmaron». El cotejo se edita en local (`TR.fir`/`TR.gar`, `TR.dirty`) y se guarda con «Guardar cotejo» o junto con «Marcar revisado».
- El cotejo solo se edita con `st:'env'`. En `rev` queda de solo lectura (primero «Quitar revisado»).
- **Corregir** (`env` o `rev`; no cambia el estado): tabla de bloques (partida con `select`, desde/hasta, quiénes con chips, quitar/agregar) y de obreros (vino, motivo si faltó, altura). Al guardar: si `tValida` deja problemas pide confirmar, luego motivo (`uiAsk` input requerido); recalcula con `tCalc` y guarda `rows`, `blq` y `hist` `cor`. Marcar a alguien como falta **no** lo saca de los bloques (0 h; si vuelve a «vino» recupera sus horas; ver «Mejoras de oficina»). No se agregan obreros desde aquí.
- **Marcar revisado** (`env` → `rev`): deshabilitado si hay observaciones que bloquean (`tValida` o firmas sin cotejar). Si alguien no firmó, pide confirmación y queda en `hist.cam`.
- **Quitar revisado** (`rev` → `env`) y **Reabrir al capataz** (`env` o `rev`), ambos con motivo.
- Si llegan datos con el detalle abierto, `trSync()` lo redibuja sin perder el cotejo o la corrección en curso.

### Tareos del día (oficina)

- Avisos: **duplicados** (`#trDup`), **no enviados a la hora límite** (`#trLate`; filas con «No enviado a las HH:MM»: sin tareo, borrador o reabierto), **Sin tareo** (`#trSin`, `<details>` por capataz; se recuerda abierto/cerrado en `TD.dOpen`). Los ve toda la oficina; las acciones solo `tasis`/`admin`.
- Filtros (`TD.flt`): todos · por revisar (`env`) · con observaciones · revisados (`rev`/`pub`), con contador. Columna nueva «Firmas»: «a de b», «✓» o «n sin firma».

### Reglas

- `tareo` update del `tcap`: además de lo de F1, no toca `revAt`/`revBy` y el `hist` solo crece al final, de a una entrada, sin cambiar las anteriores (`tHistOk`). Con `st` `env`/`rev` el `tcap` ya no escribe (F1). `tasis`/`admin` escriben todo; nadie borra.
- Pruebas: `tests/rules/firestore.test.mjs` «tareo F2»; interfaz: `tests/e2e/tareo-rev.spec.js`.

### Pantalla del capataz

- Un tareo `rev` se ve como enviado (solo lectura) con «Revisado por la oficina».

## Decisiones tomadas al implementar F2

- **«Registrar falta» desde «Sin tareo» solo escribe en el tareo de su capataz si está `env` o `rev`** (la oficina es dueña de ese documento): lo agrega como ausente con motivo (código) y comentario obligatorio, `hist` `cor`. **No crea tareos** a nombre del capataz ni escribe en uno `bor`/`reab`: el celular del capataz guarda el documento entero (`set` sin merge) y pisaría la falta, y con la regla de `hist` su guardado sería rechazado. Para esos casos (y «Sin capataz») está «Copiar lista» para avisarle.
- Corregir no cambia el estado aunque esté `rev` (pedido). El cotejo hecho antes de reabrir se conserva en `rows` (el celular no toca `fir`/`gar`); al reenviar, la oficina lo revisa de nuevo.
- Contador «Por revisar» en la pestaña: **no** se hizo (pediría una suscripción permanente a los tareos); el contador está en el filtro de la vista.
- Las reglas no impiden que el `tcap` escriba `fir`/`gar` en su borrador (revisar mapas anidados en reglas es caro); la app del capataz no los toca y la oficina los ve y corrige en el cotejo.

## Lo que dice el Excel que hoy recibe costos (semana 28.09–04.10)

- Una hoja por día (`'02.10'`): filas = obreros (N°, nombre, cuadrilla, DNI, categoría), columnas = partidas de control agrupadas (Obras provisionales, M. Tierras, Estructura, Arquitectura, Instalaciones, Varios), valor = horas; al final «Horas totales», «Horas extras» (= total − 8,5) y «Bonos» con `(A)` = **bono por trabajo en altura**. Leyenda: DM = descanso médico.
- «Resumen HH»: por obrero y día, HH y HE; totales HN/HE (H60/H100 rotos con `#REF!`).
- «Tareo Semana»: asistencia por día (`A` si ≥ 8,5 h, `I` si menos, `DM`), horas extra y horas de descanso médico (DM = 8,5 h L–V, 5,5 h sábado).
- Confirma la jornada asumida: 8,5 h de lunes a viernes y 5,5 h el sábado. Semana de lunes a domingo.
- Implica para F1: el capataz marca por obrero si tuvo **trabajo en altura** (bono), además de faltas y horas por partida.

## Decisiones tomadas al implementar F0

- `TAR_ROLES`, `TAR_TABS` están en `base.js` (los usa el arranque antes de cargar `tareo.js`); no redefinirlos.
- Equipo sigue solo en Last Planner: el admin cambia de módulo para gestionar usuarios.
- Celular: el selector de módulo va en la hoja «Más»; en modo tareo se ocultan Exportar y Ayuda (aún sin ayuda del tareo).
- `body.mod-tar` oculta los controles de LPS de la barra; Ctrl+Z no hace nada en el tareo.
- Si cambia el rol de forma que cambia lo que se carga (solo tareo, acceso al tareo, lista de miembros del asistente), la app avisa y recarga.
- `tHoras`: ~~sábado pasado de la jornada descuenta 60 min~~ (eliminado en la auditoría F2: refrigerio por intersección, ver «Correcciones de la auditoría F2 — cálculo»).
- Importar el máster nunca toca `cap`, nunca archiva; solo informa a quienes no están en el archivo. Una categoría editada a mano se respeta salvo que cambie el puesto.
- Ids de partidas: `p10_05` (`tPcId`).

## Decisiones tomadas al implementar F1 (oficina y cálculo)

- `tBlqH`, `tCalc`, `tValida` están en `tareo.js` (puros; `tareo-cap.js` los usa, no los redefine). Horas redondeadas a 2 decimales (`tR2`), sin redondeo a media hora.
  - Un bloque cuenta solo si tiene partida y horario válido (05:00–23:59, salida > entrada); si no, `tValida` lo marca.
  - `tCalc`: `ext` = max(0, trab − `tJorH` del día); domingo/feriado (`tNoLab`, solo `tcfg`) todo es extra. Ausentes: `h:{}`, `ini/fin:''`, `trab/ext:0`.
  - `tValida` `k`: `vacio`, `pc`, `hora`, `quien` (bloque sin obreros), `bloq` (partida bloqueada por costos), `marca` (sin marcar si vino), `mot`, `sinh`, `cruce` (uno por obrero), `foto`; y `parcial` (`warn:true`, no bloquea).
- `renderTDia` (oficina): globales con prefijo `to`/`TO_` (`TD` estado, `toSub`/`toUnsub`, `toList`, `toStats`, `toDetalle`, `toReabrir`, `TO_MOT` motivos de falta, `TO_ST` estados). CSS al final de `app.css` con prefijo `.to-`.
  - Suscripción temporal `fcol('tareo').where('date','==',fecha)` (`TD.sub`): cambia al cambiar de fecha; al salir de la pestaña se suelta en la siguiente llegada de datos (no hay gancho de salida de vista) y al cerrar sesión (`unsubs`).
  - Lista: tareos del día + capataces `tcap` con obreros activos asignados sin tareo («Sin empezar»). Orden: enviado, reabierto, borrador, sin empezar, revisado, publicado. «Enviados» del resumen = `env`/`rev`/`pub`.
  - Fecha: flechas y selector; no pasa de hoy. `tcos` ve el aviso de F3 (no se suscribe).
  - Reabrir (solo `admin`/`tasis`, solo `st:'env'`): `update({st:'reab', reab:{t,by,mot}, hist: arrayUnion({t,by,mot,a:'reab'}), by, ts})`.
  - Fotos: lee `tfot/{id}` al abrir el detalle (caché `TD.fotos`), miniatura y ampliar (`.to-zoom`).

## Mejoras de oficina (oct 2026)

- **Personal:** columna N° (posición en la lista filtrada) y contador `#tperN` «Mostrando N de M · K activos» (N y K respetan los filtros; M = fichas no archivadas). Para `admin`/`tasis`, si existe la global `tCapCuenta(dni)` (en `tareo-cuentas.js`), cada fila lleva «Hacer capataz» (`[data-tcta]`); si la ficha tiene `tper.cta` (correo de su cuenta de capataz) muestra el chip «Capataz» y la acción «Cuenta de capataz…» (misma función). Los capataces del filtro y de «Asignar capataz» siguen siendo los `members` con rol `tcap` (`tCaps()`).
- **Personal › filtros encadenados** (`tPerOk(p,hoy,q,sin)`, `tPerFacets()`, `tPerSelects()` en `tareo.js`): cada lista (cuadrilla, categoría, capataz) y el selector de estado ofrecen solo los valores que quedan con los **otros** filtros y la búsqueda, con su conteo («ALBAÑILES (50)», «Activos 120»). Las listas se rehacen en cada `tPerDraw()`; si el valor elegido ya no tiene a nadie, sigue en la lista con (0) para poder quitarlo. El capataz sale de los que tienen obreros (no de `tCaps()`). «Limpiar filtros» (`#tperClr`) vuelve a Activos sin búsqueda ni listas. Categoría sin código conocido cuenta como `OT` (`tPerCat`).
- **Partidas de control:** una sola tabla (`.tpc-tbl`, `table-layout:fixed` con `colgroup`) para que las columnas queden alineadas entre grupos; antes había una tabla por grupo y cada una medía distinto. Fila de encabezado por grupo (`tr.tpc-gh[data-tpg]`: número, nombre, n.º de partidas y HH ppto). Columnas: código, descripción, und, metrado, HH ppto, HH/und (`tRatio` = hhp/met, como la columna «Ratio» del Excel), cuenta UA, estado, acciones. Orden: `tCmpCod` compara por partes enteras (grupos 1, 2 … 13; 10.02 antes de 10.10). Buscador y filtro Todas/Activas/Bloqueadas/Inactivas (`TPU`). En celular cada partida es un bloque compacto.
- **Bloquear para carga** (`tpc.bloq: true|false`, `bloqBy` correo en minúsculas, `bloqAt` ms): lo hacen `tcos`, `tasis` y `admin` (`tBloqOk()`, `tPcBloq`). Bloqueada: candado y chip «BLOQUEADA»; no aparece en el celular del capataz (`tareo-cap.js`). `tValida`: `k:'bloq'` «La partida X está bloqueada por costos.» (una vez por partida). Reglas: `tcos` actualiza `tpc` solo con `affectedKeys().hasOnly(['bloq','bloqBy','bloqAt'])`, `bloq` booleano y `bloqBy == email()`; no crea ni borra.
- **tValida / tCalc:** ya no existe el error `falto`: un obrero que no vino puede seguir en sus bloques (tCalc le da 0 h y conserva `blq`, así recupera sus horas si vuelve a «vino»). Nuevo `k:'marca'` «Falta marcar si vino: APELLIDO» si `as` no es `true` ni `false`; `tCalc` trata `as` null/undefined como no presente sin horas.
- **Revisión (corregir):** desmarcar «vino» ya no saca al obrero de los bloques (antes, al volver a marcarlo, perdía sus horas). `trAs` conserva `as` null («Sin marcar»). «Todos/Ninguno» de un bloque no toca a los ausentes que siguen en él.

## Pendientes

- ~~Formato del Excel de costos~~: hecho en F3 (ver «Implementación de F3 — pantallas»).
- Jornada oficial (asumida arriba, editable en `tcfg`).

## Decisiones tomadas al implementar F1 (reglas e invitación)

- Reglas `tareo`: el `tcap` puede hacer `get` de su día aunque no exista (id `<fecha>_<mi id>`); sus consultas deben filtrar `where('cap','==',mid)`. Fecha válida: entre hoy−4 y hoy+1 en hora de Lima (tolerancia de un día por reloj/zona; la app ofrece hoy, ayer y anteayer). El `tcap` no crea con `st:'reab'`, no toca `reab` ni `pub`, y desde `reab` solo queda en `reab` o pasa a `env`. `tfot`: id empieza con `<fecha>_<mi id>`, `d` texto < 1 000 000 caracteres.
- Invitación del tareo: `inv/{code}` `{role:'tcap', active, exp, by, ts}` (sin `scs`). El enlace lleva `&m=tar` (`localStorage` `lps.invm`) para que la pantalla de registro hable del tareo antes de iniciar sesión. En Equipo › Capataces se elige «Capataz del tareo (consorcio)» en el mismo selector de partida (`__tcap`); el código está en `en-obra-tablero.js` (`newInvite(scs,tcap)`, `invWho`, filas `tr[data-invtar]`). La variante `capataz` de `members` exige que la invitación no sea `tcap`.
- Fake de pruebas: `signInAnonymously` crea un usuario anónimo (`E.anonUid` o `anon1`); prueba en `tareo-inv.spec.js`.

## Cuentas de capataz (oct 2026)

Problema: con el enlace/QR el capataz del tareo entra con una sesión **anónima** guardada solo en ese navegador; si pierde el celular o borra los datos, pierde su usuario `u_<uid>` (al que están ligados su cuadrilla y sus tareos). Ahora la oficina le da **usuario (DNI) y contraseña**.

### Cómo funciona

- **Cuenta = DNI + contraseña.** Por debajo es una cuenta de correo y contraseña de Firebase Auth con correo **sintético** `<dni en minúsculas>@tareo.lps911.pe` (no existe; nunca se envía nada) y `emailVerified: true`, así que pasa por el mismo `startSession` que cualquier correo: `members/<correo>` con `role:'tcap'`, `mid()` = el correo. DNI como en el máster (`ctaDni`/`tCtaDni`: 8 dígitos, 7 → con cero a la izquierda; carné de extranjería de 8 a 12 alfanuméricos).
- **Función `cuentaCapataz`** (`functions/index.js`, v2 `onCall`, us-central1, Admin SDK). Solo el dueño, `admin` o `tasis` con correo confirmado y sin `off` (`ctaPuede`). Valida con `ctaPedido` (lógica pura en `functions/lib.js`, pruebas en `functions/test/cuentas.test.js`). Acciones (`{accion, dni, clave?, de?}`):
  - `crear`: exige ficha en `tper/<dni>` no archivada; crea el usuario de Auth (displayName = `ctaNombre(ficha)`, «Juan Carlos Quispe Mamani») o, si ya existe (cuenta desactivada), lo **reactiva** con la contraseña nueva; `members/<correo>` `{role:'tcap', name, dni, added, by}` (merge, borra `off/offAt/offBy`; si ya existía con otro rol, error); `tper/<dni>.cta = <correo>`. Con `de` también migra (abajo).
  - `clave`: cambia la contraseña.
  - `desactivar`: Auth `disabled:true` + `revokeRefreshTokens` y `members.off:true, offAt, offBy`. **No** cambia el rol ni borra nada; sus obreros siguen con `cap` = su correo (la oficina los reasigna en Personal).
  - `migrar` (`de` = `u_<uid>` de un `tcap` con enlace): `tper.cap` de sus obreros pasa al correo nuevo (por lotes) y `members/u_…` queda `off:true, movTo:<correo>`. **Los tareos antiguos se quedan con el id viejo** (`tareo/<fecha>_u_…`, `cap:'u_…'`): siguen visibles para la oficina; el capataz ya no los ve en su celular. Conviene migrar después de que envíe el tareo del día.
  - Contraseña: mínimo 6 caracteres sin espacios al borde; la ventana propone 6 dígitos al azar (editable).
- **Ventana `tCapCuenta(dni)`** (`web/js/tareo-cuentas.js`, global; la abre «Hacer capataz» en Tareo › Personal): estado según `MEM` (`SIN CUENTA` / `CUENTA ACTIVA` / `DESACTIVADA`), crear/reactivar con contraseña propuesta, «Pasar sus datos de» (capataces `tcap` con `u_…` sin `off`, con su número de obreros), cambiar contraseña, pasar obreros, desactivar (con `uiAsk`). Al crear o cambiar la clave muestra el texto para copiar o enviar por WhatsApp: `Usuario: 12345678 · Contraseña: 123456 · Entra a <URL de la app>` (la contraseña no se guarda en ninguna parte: no se vuelve a mostrar). Llama con `firebase.functions().httpsCallable('cuentaCapataz')` (`firebase-functions-compat.js` en `index.html`); `tCtaErr` traduce los errores.
- **Ingreso «Soy capataz»** (`index.html` `#lcap`, `base.js` `setupLogin`/`showLogin`): botón en la pantalla de ingreso y enlace en la de registro por enlace; DNI (`inputmode=numeric`) + contraseña → `signInWithEmailAndPassword(tCtaMail(dni), clave)`. Errores: «DNI o contraseña incorrectos. Pide a la oficina que te la cambie.» / «Tu cuenta está desactivada. Habla con la oficina.». Se recuerda en el equipo (`localStorage` `lps.lcap`): al cerrar sesión vuelve a esa pantalla. La sesión de Firebase Auth persiste (local): si cierra la página entra sin pedir nada; en otro celular entra con DNI y contraseña.
- **`members.off`**: en las reglas se revisa con `notOff()` dentro de `isTar()` y `tarEd()` (no en `isMember()`: sumar esa lectura hizo fallar reglas de LPS que ya están al límite de lecturas, p. ej. `dplan`). En la app, `startSession` / el listener de `members` cierran la sesión con aviso (`memOffMsg`: si tiene `movTo`, «Tu usuario de este celular se pasó a una cuenta con DNI y contraseña…» y abre «Soy capataz»). Cada uno sigue pudiendo leer su propio registro.
- **Reglas:** `members` con id `*@tareo.lps911.pe` no se crean desde el cliente (ni el admin; solo la función con el Admin SDK); el admin sí los actualiza o quita en Equipo. Pruebas: «cuentas de capataz» en `tests/rules/firestore.test.mjs`.
- **Equipo:** la tarjeta de invitaciones (en-obra-tablero.js, `[data-tctanote]`) recomienda la cuenta con usuario y contraseña. Las invitaciones anónimas `tcap` siguen funcionando.
- **Pruebas de la interfaz:** `tests/e2e/tareo-cuentas.spec.js`. El Firebase falso simula `firebase.functions().httpsCallable('cuentaCapataz')` contra la base falsa (misma lógica que la función; llamadas en `window.__fnCalls`) y `signInWithEmailAndPassword` con usuarios de `E.authUsers` `{correo:{uid, pass, disabled}}` más los que crea el stub (`window.__authUsers()`).

### Configuración en Firebase (una vez por proyecto)

- Authentication › Sign-in method: **Correo electrónico/contraseña** activado (ya lo usa la oficina).
- La función usa la cuenta de servicio por defecto de Cloud Functions v2 (`<n.º proyecto>-compute@developer.gserviceaccount.com`); necesita crear usuarios de Auth: rol **Firebase Authentication Admin** (`roles/firebaseauth.admin`) o Editor (que suele tener por defecto).
- La publicación (`firebase deploy --only functions`, desde GitHub) deja la función invocable por cualquiera (`allUsers` en Cloud Run; la función revisa el usuario). La cuenta de servicio de GitHub (`FIREBASE_SA_*`) necesita poder cambiar el IAM del servicio (Cloud Functions Admin o Cloud Run Admin). Si la organización de Google Cloud prohíbe `allUsers`, la página dirá «El servidor no respondió…».

### Pendiente

- `tCaps()` (tareo.js) lista también capataces con `off`: filtrarlos al asignar obreros.

## Auditoría externa F2 (ChatGPT, 05-10-2026): decisiones del dueño

- **Refrigerio:** de lunes a viernes siempre se descuenta 1 h, como **intersección** de cada bloque con la ventana de refrigerio del día (12:00–13:00 por defecto): partir los bloques no cambia el total. **Sábado: no se descuenta** refrigerio, ni siquiera pasadas las 13:00 (son horas extra). Todo configurable por día en `tcfg` (inicio y minutos de refrigerio por día de semana). Se elimina la regla anterior «sábado pasado de la jornada descuenta 60 min».
- **Corregir un tareo revisado lo devuelve a «Enviado»** (hay que volver a revisarlo).
- **Feriados propios del tareo** en `tcfg.fer` (lista de fechas `YYYY-MM-DD`), con botón para copiarlos del calendario de Last Planner; todos los roles calculan igual.
- **Un obrero no puede estar en dos tareos el mismo día** (ni presente en uno y con falta en otro): es un conflicto que bloquea marcar revisado (y publicar en F3) hasta resolverlo.

## Correcciones de la auditoría F2 — cálculo

Hallazgos 1, 2, 3, 11 y 13 del informe (`tareo.js`; pruebas en `tests/e2e/tareo-calc.spec.js`).

- **Refrigerio por intersección (1).** `tcfg.jor[<día 0–6>] = {ini, fin, ref (min), refIni ('HH:MM', opcional: si falta, el `tcfg.refIni` global)}` o `null` (no laborable). `TC().jor[k].refIni` siempre viene resuelto. Por defecto L–V 07:30–17:00 con 60 min desde 12:00 (8,5 h) y sábado 07:30–13:00 sin refrigerio (5,5 h); domingo `null`.
  - Horas de un bloque = duración − intersección del bloque con `[refIni, refIni + ref]` (`tBlqMin`). **Partir un bloque en cualquier minuto no cambia el total** (12:15–12:45 en L–V = 0 h).
  - `trab` = suma de los bloques del obrero (se suma en minutos y se redondea al final); `ext` = max(0, trab − horas de jornada del día) con horas de jornada = fin − ini − ref (`tJorH`).
  - Sábado (`ref` 0): **no se descuenta nada**, ni pasadas las 13:00: 07:30–17:00 = 9,5 h trabajadas y 4 extra. Se eliminó la regla anterior.
  - Domingo o feriado: sin jornada, todo es extra; refrigerio de no laborables configurable en `tcfg.refNoLab = {ref, refIni}` (por defecto 60 min desde 12:00; un número se toma como minutos desde `refIni`; `ref` 0 = no se descuenta).
  - `tDia(fecha, cfg?)` → `{nl, j, rw:[ini,fin] en minutos | null, jh}`: la regla del día para `tHoras`, `tBlqH`, `tCalc`, `tValida`, `tNoLab`. Firmas compatibles: `tBlqH(fecha, ini, fin, cfg?)`, `tHoras(fecha, ini, fin, cfg?)`, `tNoLab(fecha, cfg?)` (el `cfg` es opcional).
- **Feriados propios (2).** `tcfg.fer` = lista de fechas `YYYY-MM-DD`; `tcfg.ferN = {fecha: nombre}` (opcional; al quitar un feriado su nombre se queda en `ferN`, sin efecto). `tNoLab` usa **solo** eso + jornada nula del día de semana; ya **no** usa `nwReason` ni el calendario de Last Planner (los roles del tareo no cargan `meta/project`). Configuración › «Feriados del tareo»: agregar (fecha + nombre), quitar (con `uiAsk`) y «Copiar feriados de Last Planner» (solo si el admin tiene `S.meta project.cal.hol`; agrega los que faltan con su nombre). Se guardan al momento (`set merge` de `fer`/`ferN`); la jornada se guarda con «Guardar configuración».
- **Configuración congelada (3).** `tCfgDia(fecha)` → `{v:1, jor: <jornada del día con refIni> | null, fer: bool, rnl: {ref, refIni}}`. `tCalc`/`tValida` usan `doc.cfg` si `doc.cfg.v===1`; sin `cfg`, la configuración actual. **Pendiente para `tareo-cap.js` y `tareo-rev.js`: al pasar a `env` o al corregir, guardar `cfg: tCfgDia(date)` si el doc no lo tiene** (y pasar `t.cfg` como 4.º argumento a `tBlqH` donde muestren horas de un bloque). Los atajos del celular (`tcJor`) deben usar el inicio de refrigerio del día (`j.refIni`), no `TC().refIni`.
- **Periodos (11).** `tActivo(p, fecha)`: activo si algún periodo de `p.per` (`{ing, ces}`) cumple `ing ≤ fecha` y (sin `ces` o `fecha ≤ ces`); sin `per` (o vacío), usa `ing`/`ces` de la ficha. **El día del cese cuenta como trabajado** (antes no). Archivado: nunca.
- **Jornada parcial (13).** `tValida` agrega `{dni, k:'parcial', warn:true, msg:'Jornada parcial: APELLIDO 4 h de 8,5'}` cuando un presente sin cruces tiene menos horas que la jornada del día (no en domingo/feriado). **No bloquea**: quien use `tValida` para bloquear (enviar, «Marcar revisado», confirmar al corregir) debe filtrar `!o.warn`.
- Configuración visible: por día laborable, inicio, fin, «Refrigerio desde», minutos y horas; total semanal; refrigerio de domingo/feriado; hora límite y tolerancia de garita; feriados.

## Correcciones de la auditoría F2 — revisión

Código en `tareo-rev.js` (más una línea en `tareo.js`: `toStats` lee el cotejo con `tConCot`), reglas `tareo`/`tfot`, respaldo en `auditoria.js`. Reemplaza lo dicho en «Contrato de F2» sobre `rows[dni].fir/gar` y «Corregir no cambia el estado».

- **Cotejo aparte (hallazgo 10):** `cot: {<dni>: {fir?, gar?, by, t}}` + `cotFot: [ids de fotos cotejadas]` a nivel del documento; `rows` ya no lleva `fir`/`gar`. `tCotDe(doc)` → cotejo vigente `{dni:{fir?,gar?}}`: las **firmas solo valen si `cotFot` = `foto`** (sin importar el orden); si el capataz cambió las fotos, el detalle avisa (`#trCotV`) y hay que cotejar de nuevo; la garita vale siempre. ~~Lectura compatible de `rows[dni].fir/gar`~~: eliminada en la segunda auditoría (A4). `tConCot(doc, cot?)` pone el cotejo vigente en `rows` (lo que leen `tObsRev` y `toStats`).
- **Escritura del cotejo:** `trCotUp(cur)` escribe **solo lo que cambió** el asistente (`TR.b` = cotejo al abrir; `trCotCh()`), por rutas `cot.<dni>.fir|gar|by|t` (con `FieldValue.delete()` al desmarcar). Si el tareo no tiene `cot` (antiguo) o cambiaron las fotos, escribe el `cot` entero (vigente + cambios) y `cotFot` = fotos actuales.
- **Reabrir:** borra las firmas y `cotFot` (al reenviar se cotejan con el formato nuevo) y **conserva la garita** en `cot` (`{dni:{gar,by,t}}`; si no queda ninguna, borra `cot`). También borra `revAt`/`revBy`. En un tareo antiguo pasa la garita a `cot` y quita `fir`/`gar` de `rows`. El celular guarda el documento entero copiando `cot` tal cual (lo permite la regla).
- **Versión que se ve (hallazgos 4 y 5):** `trSig(doc, conCot)` = estado, obreros (vino/motivo/altura), bloques, fotos y (con `conCot`) el cotejo vigente; no cuenta `hist`/`by`/`ts` ni lo calculado. `TR.sig` se toma al abrir (y al llegar datos si no hay cotejo sin guardar); `TR.edSig` al abrir «Corregir».
  - **Marcar revisado:** dentro de la transacción compara `trSig(cur)` con `TR.sig` (si difiere: «Otro usuario cambió este tareo, vuelve a abrirlo.»), aplica el cotejo en edición sobre `cur` y **recalcula `tObsRev`** (con los conflictos del día, `TD.docs` + `cur`); no marca si queda algo que bloquea.
  - **Corregir:** aplica la edición sobre `cur`; si el tareo cambió desde que se abrió el editor, no guarda y avisa lo mismo (Cancelar y volver a «Corregir» toma los datos nuevos). **Corregir un revisado lo devuelve a `env`** (borra `revAt`/`revBy`; `cam` empieza con «Quita revisado.»). Igual «Registrar falta» y «Quitar de este tareo» (`trCorExtra`). Si el tareo no tiene `cfg` y existe `tCfgDia`, guarda `cfg: tCfgDia(date)` (jornada congelada). La corrección no toca `cot`.
- **Observaciones `warn` de `tValida`:** no bloquean (`bl:false`); se muestran en la lista (en el editor, recuadro aparte «avisos»). Las que bloquean salen en rojo (`li.tr-obl`).
- **Un obrero en un solo tareo por día (hallazgo 6):** `tConflictosDia(docs)` (global, para F3) → `[{dni, nom, ts:[{id, cap, name, st, as, mot}]}]` con todo DNI que figure en dos o más tareos no archivados del día (presente, con falta o sin marcar). En `tObsRev` es `k:'dup'` (bloquea) con el nombre del otro capataz (por omisión usa `TD.docs` si el tareo está en la vista; también cuenta en «Observ.» de la lista). En «Tareos del día» reemplaza el aviso de duplicados: `#trConf` (rojo) por obrero, cada tareo con su estado y, para `tasis`/`admin`, **«Quitar de este tareo»** (`[data-trq]`, solo `env`/`rev`; en borrador/reabierto lo quita el capataz): pide motivo, borra `rows.<dni>` y `cot.<dni>`, lo saca de los bloques (un bloque que queda vacío se quita), `hist` `cor` con `det`. «Registrar falta» no agrega a quien ya figura en otro tareo.
- **Historial (hallazgo 12):** toda entrada `cor` lleva `det` = `tDet(antes, después)`: `[{dni?, blq?, campo, antes, despues}]` (máx. 50; `campo`: `bloque`, `pc`, `ini`, `fin`, `obrero` (en un bloque), `fila` (en el tareo), `as`, `mot`, `alt`), además de `cam`.
- **Respaldo (hallazgo 8):** `tareo` en `BK_DATA` y `tfot` en `BK_IMG` (respaldo con imágenes). «Cargar datos desde archivo» los acepta (usa `BK_ALL`); las fotos se restauran con el mismo id (siguen ligadas a `tareo.foto`). Regla `tfot`: `update` solo `tarEd()` y con datos idénticos (restaurar sobre la misma obra).
- **Reglas:** el `tcap` no crea con `cot`/`cotFot` ni los cambia (`affectedKeys`); su entrada nueva de `hist` no puede tener `a` de la oficina (`fir`, `rev`, `qrev`, `cor`, `reab`, `pub`). Pruebas: «tareo F2 auditoría» y «tfot: restaurar…» en `tests/rules/firestore.test.mjs`; interfaz en `tests/e2e/tareo-rev.spec.js` («auditoría F2: …» y conflicto).
- Pendiente: la protección del historial frente a la oficina (escritura amplia de `tasis`/`admin`) sigue igual; F3 debe exigir `tConflictosDia` vacío y revisión vigente.

## Correcciones de la auditoría F2 — capataz

Solo `tareo-cap.js`, el CSS `/* tareo: capataz */` y las reglas de la ventana de fechas. Hallazgos 7 y 9 y el punto 1 de «Evaluación del flujograma».

- **Foto confirmada (hallazgo 7):** al tomarla se reduce hasta que el dataURL mida ≤ `TC_FMAX` = 950 000 caracteres (la misma medida que la regla `d.size() < 1000000`; 1600 px/0.7 y bajando hasta 640 px/0.4). Queda en `TCS.fp[id]` `{n, st, msg, mem}` y **no** entra a `doc.foto` hasta que el `set` en `tfot` lo confirma el servidor (`tcFotUp`). Estados en la miniatura (`.tc-fp`): `up` «Subiendo…», `pend` «Pendiente de subir» (sin señal o tarda > 6 s; `navigator.onLine===false`), `err` «No se subió · Reintentar» (`fpRe`) con el error; ✕ (`fpX`) la descarta. Mientras haya una en `TCS.fp`, `tcErrs` agrega `k:'fotp'` y el botón dice «Foto sin subir» (no deja enviar).
  - Copia en el celular: `localStorage` `lps.tcfp.<fecha>_<capId>` = `{id: {n, d}}` (con try/catch; si no cabe, `mem:true` y el aviso dice que si cierra la app tendrá que tomarla de nuevo). Al abrir el día (ya cargado el tareo, `tcFpLoad`) y con el evento `online` se reintenta. Si el reintento es rechazado porque la primera escritura sí llegó (la regla no deja actualizar `tfot`), `get({source:'server'})` comprueba que existe con el mismo `cap` y `d` y la da por subida.
- **Enviado confirmado (flujograma 1):** `TCS.sendSt`: `sending` «Enviando…» → si en 2,5 s no confirmó (o sin señal) `queued`: aviso ámbar grande «⚠ Se enviará al tener señal» (`.tc-queued`, también en `#tcSt`) → «Enviado ✓ hh:mm» solo cuando la promesa de la escritura se cumple (el servidor la aceptó) o llega una foto de la base sin `hasPendingWrites` (la suscripción usa `includeMetadataChanges`; si se abre la app sin señal con el envío pendiente, `srvPend` muestra «Se enviará…»). Si el servidor lo rechaza, vuelve a como estaba (borrador o reabierto) y `#tcSt` muestra «No se pudo enviar el tareo: …».
- **Reabiertos de cualquier fecha (hallazgo 9):** suscripción `where('cap','==',id).where('st','==','reab')` (`tcReabSub`, `TCS.reabL`; solo igualdades: no necesita índice compuesto). Arriba, aviso «Por corregir (n)» (`#tcPorCor`) con un botón por tareo (fecha y motivo) que lo abre; la fecha abierta fuera de hoy/ayer/anteayer tiene su propio botón «Otro día».
  - Reglas: `tcapOwn(id)` (dueño e id) y `tcapNew(id)` = `tcapOwn` + `tDateOk`. El `tcap` actualiza su tareo si la fecha está en la ventana **o** el documento está en `reab` (crear y los borradores siguen con la ventana corta). `tfot`: crea con la ventana o si `tareo/<fecha>_<mi id>` está en `reab` (`tReab`). Pruebas: «tareo F2 (auditoría, hallazgo 9)» en `tests/rules/firestore.test.mjs`.
- **Jornada congelada:** al pasar a `env`, si existe `tCfgDia` y el tareo no tiene `cfg`, guarda `cfg: tCfgDia(fecha)` (un reabierto conserva el suyo).
- **Avisos que no bloquean:** las observaciones de `tValida` con `warn:true` no cuentan en `tcErrs`; se muestran en ámbar en el paso 3 (`#tcWarns`, «Avisos (puedes enviar igual)»).
- **El cotejo no es del capataz:** si el tareo ya existe, el guardado es `update` con los campos del capataz (cada uno se reemplaza entero) sin `cot`/`cotFot`; si no existe, `set`. Así nunca reescribe el cotejo de la oficina.
- Pruebas de la interfaz: «F2 capataz: …» en `tests/e2e/tareo-cap.spec.js` (interceptan `collection('tfot'|'tareo')` de la base falsa para simular rechazo o falta de señal).

## Revisión en laptop (oct 2026)

Pedido del dueño: la revisión se hace en laptop y es de lo más importante, así que deja de ser una ventana angosta. Solo `tareo-rev.js`, su CSS (`/* tareo: revisión */`) y las pruebas (`tareo-rev.spec.js`; selectores de `tareo-dia.spec.js`). `tareo.js` no cambió. Reemplaza lo dicho del diseño en «Revisión (`toDetalle` → `trDraw`)».

### Espacio de revisión (`#trWs`)

- **Capa fija a pantalla completa** (`.tr-ws`, `z-index` 140: debajo de `.lqm` 150, `.uask`/`.to-zoom` 170; con `body.tr-on` el aviso `.toast` sube a 160 y la página no se desplaza). Va **fuera de `<main>`**: el `render()` de la app (cuando llega un cambio de otro usuario o se redibuja la lista) no la toca. `trSync()` (lo llama `toSub` de `tareo.js` con cada foto de la base) la refresca sin perder el cotejo ni la corrección en curso.
- **Partes:** encabezado `#trHead` (fijo), visor `#trFoto` (izquierda) y panel `#trRight` (derecha). `trDraw()` rehace encabezado y panel con `trPut` (solo si el HTML cambió; conserva desplazamiento y foco). El visor solo se rehace si cambian las fotos o la foto elegida (`TR.fsig`): el zoom y la posición no se pierden con cada dato que llega.
- **Encabezado:** «← Tareos del día» (`#trBack`, Esc), capataz, fecha, estado (y «Corrigiendo»), «◀ Anterior · n de m · Siguiente ▶» (`#trPrev`/`#trPos`/`#trNext`, atajos ← →), resumen (presentes, faltas, HH, HE, en altura, observaciones; `#trKpi`) y las acciones: `env`: Guardar cotejo (si hay cambios) · Corregir · Reabrir al capataz · Marcar revisado; `rev`: Corregir · Quitar revisado · Reabrir; corrigiendo: Cancelar (`#trEdX`) · Guardar corrección (`#trEdOk`). El jefe de producción no ve acciones.
- **Orden de «anterior · siguiente»:** el de la lista con su filtro (`TD.flt`) **tal como estaba al abrir desde la lista** (`TR.ord`, de `toList` + el mismo filtro que `renderTDia`): marcar revisado no reordena la navegación. Si hay cotejo o corrección sin guardar, cambiar de tareo o salir pide confirmar (`trLeave`).
- **Atajos:** ← → y Esc no actúan mientras se escribe en un campo (Esc suelta el campo) ni con una ventana encima (`.uask`, `#lqm`); con la foto a pantalla completa (`.to-zoom`) Esc la cierra.
- **Visor:** con zoom 1 la hoja ocupa el ancho del visor; − / + (±50 %), «Ancho», «Entera» (la hoja completa a la vista), rotar 90° (se mide la caja girada, así se puede desplazar bien), pantalla completa (`toZoom`), rueda del mouse = zoom en el punto del cursor, arrastrar con el mouse para mover (con el dedo, el desplazamiento propio del navegador). Miniaturas solo con más de una foto (eligen la foto; `#toFotos` sigue existiendo porque `toFotos()` de `tareo.js` lo usa al cargar).
- **Panel derecho:** avisos (reabierto, revisado, fotos cambiadas `#trCotV`, observaciones `#trObs`), una sola tabla **obreros × partidas** (`.tr-mt`; fila `tr[data-trd][data-dni]`): obrero, categoría, horas por partida, total (con el horario debajo), HE, altura `(A)`, Firmó Sí/No, garita, observaciones de la fila (etiquetas cortas con el texto completo en `title`; `TR_TAG`) y «⇄» pasar a otro capataz. Los que faltaron van al final (`tr.tr-frow`, «Faltó · DM …»). Cabecera fija y primera columna fija al desplazar. Debajo, plegables, **Bloques** (`#trBlqD`, abierto por omisión) e **Historial** (`#trHistD`, `#trHist`); se recuerda cuál está abierto (`TR.op`).
- **Corregir** se hace en el mismo espacio: el panel derecho cambia al editor (bloques y obreros) con la foto a la izquierda; los botones van en el encabezado.
- **Tamaños:** ≥ 1100 px tres zonas (foto 44 %, tabla 56 %, cada una con su desplazamiento); 760–1100 px una columna: foto arriba (58 vh) y tabla abajo; ≤ 760 px igual con botones de 40 px y textos cortos.
- **Qué tareo está abierto:** `TR.id` (no se cierra con un redibujo) y `sessionStorage` `lps.trws` = `{id, f}`: al recargar la página, `TD.f` vuelve a esa fecha y la revisión se reabre en cuanto llegan los tareos y se está en «Tareos del día» (`TR.want`). Se borra al cerrar.
- **Reabrir al capataz** ya no cierra la revisión: queda abierta en «Reabierto» (solo lectura) para seguir con ←/→.

### Pasar un obrero al tareo de otro capataz (`tasis`/`admin`)

- En la revisión, por fila, «⇄» (`[data-tra="pas"]`) → ventana `#lqm` con los capataces (`trDestinos`: los `tcap` activos y los que tienen tareo ese día, menos el del tareo; radios `input[name="trPd"]` con `value` = id del tareo destino y `data-cap`), estado de su tareo y por qué no se puede, y **motivo obligatorio** (`#trPm`, `#trPok`).
- **Solo entre tareos «Enviado» o «Revisado» del mismo día** (origen y destino). **No** a un tareo en borrador o reabierto ni a un capataz sin tareo (no se crea a su nombre). Motivo: el celular del capataz guarda con `update` de `rows`/`blq` enteros (o `set` si el documento aún no existe) y borraría al obrero pasado, sin que nadie lo note. En esos casos: «Quitar de este tareo» y pedir al capataz que lo agregue, o pasarlo cuando lo envíe.
- **Bloques: se conservan sus horas.** `trPasa(A, B, dni)` (pura): en el origen se quita su fila, se lo saca de los bloques (un bloque vacío se quita) y se borra `cot.<dni>`; en el destino entra su fila (sin cotejo) y, por cada bloque suyo, si el destino ya tiene un bloque con la misma partida y horario se suma a él, y si no se crea uno igual solo con él (id nuevo). Sus horas se recalculan con `tCalc` en el destino. Una falta pasa como falta (con sus bloques, 0 h, como en «Corregir»).
- **La firma se coteja de nuevo en el destino** (firmó en el formato del otro capataz; queda «Falta cotejar su firma» hasta marcarla).
- **Transacción con los dos documentos** (`trPasar`): vuelve a comprobar estados (`env`/`rev`), misma fecha, que siga en el origen y que no esté ya en el destino. En ambos: `hist` `cor` con `mot`, `cam` («Pasado al tareo de …» / «Recibido del tareo de …; su firma se coteja en este tareo») y `det` (`tDet`), y `trCorExtra` (un revisado vuelve a «Enviado»; congela `cfg` si falta). No hace falta cambiar reglas: `tasis`/`admin` ya escriben todo en `tareo`.
- Si hay cotejo sin guardar no deja pasar (primero guardarlo), para no mezclar versiones.
- Pruebas: «revisión en laptop: …» y «revisión: pasar un obrero …» en `tests/e2e/tareo-rev.spec.js`.

## Observaciones del dueño — capataz (oct 2026)

Solo `tareo-cap.js`, el bloque CSS `/* tareo: capataz */` y, en `tareo.js`, `tValida`. Reemplaza lo dicho arriba sobre el motivo obligatorio y el obrero de otro capataz.

- **Motivo de «No vino» opcional:** los chips siguen (con «Motivo (opcional)»; tocar el elegido lo quita), pero se puede dejar vacío. `tValida` ya **no** devuelve `k:'mot'` (ni para la oficina: «Marcar revisado» y la corrección no lo piden). `TC_K1=['asis','vacio']`. En el paso 3 sale «No vino» o «No vino · <motivo>». `tareo-rev.js` solo usa `mot` como dato (detalle `campo:'mot'`, texto «sin motivo»), no como error: no se rompe.
- **Obrero de otra cuadrilla:** «+ Agregar obrero» busca entre todos los activos (en la lista: «de <capataz>» o «sin capataz»). Si `p.cap !== mi id` pide `uiAsk` «X no es de tu cuadrilla (es de <capataz> / sin capataz). ¿Lo tareas igual?» y guarda la fila con `ajeno: true` y `capOrig` (id del capataz de su ficha, `''` si no tiene) para la oficina. En la lista lleva la etiqueta ámbar «No es de tu cuadrilla» (`.tc-aj`). Pasarlo al tareo de otro capataz lo hace el asistente, no el capataz.
- **«¿Quiénes?» con ocupación:** en el editor de un trabajo cada obrero que vino es una fila (`.tc-who .tc-pp`) con lo que ya tiene en los **otros** trabajos (`tcOcc(D, e, dni)` → `{h, L, J, full, cx}`): «4,5 h · 20.01 7:30–12:00» (o «Sin otros trabajos»), su barra de jornada (lo de otros + este trabajo si está marcado) y, con el horario elegido, «se cruza con …» en rojo si está marcado (`.cx`) u «ocupado: …» si no (`.oc`). Los que completaron la jornada (`full`) salen atenuados con «Jornada completa». Un trabajo **nuevo** marca por defecto solo `tcLibres(D, e)`: vinieron, no completaron la jornada y no se cruzan con su horario (el horario por defecto se calcula antes, con todos). Cambiar el horario no cambia quiénes están marcados: solo recalcula el rojo. Botones «Todos los libres» (`data-tca="libres"`, conserva en el trabajo a los que no vinieron) y «Ninguno» (`none`). Editar o duplicar conserva los marcados del trabajo.
- **Bug «borrar un trabajo recién funciona al segundo intento»:** `tcAct` tomaba `D = TCS.doc` antes de `await uiAsk(...)`; mientras la confirmación estaba abierta el guardado automático (`tcSaveNow` pone `TCS.doc` = copia de `tCalc`) o la llegada de la base (`tcSnap`) reemplazaban `TCS.doc`, y el filtro se aplicaba al objeto viejo. Ahora `del`, `rm` y `add` vuelven a leer `TCS.doc` después de la confirmación (`cur(date)`; nada si cambió de día o quedó de solo lectura). **Regla:** en `tareo-cap.js`, después de cualquier `await`, no uses un `D`/`R` tomado antes.
- Pruebas: «Observaciones del dueño — capataz» al final de `tests/e2e/tareo-cap.spec.js` (borrar con la ventana real de `uiAsk` abierta mientras se guarda; motivo opcional y ajeno/capOrig; ocupación, libres y cruces en el editor).

## Segunda auditoría externa (ChatGPT, Chromium, 06-10-2026): decisiones del dueño

- Se **elimina la compatibilidad con firmas del formato antiguo** (`rows[dni].fir/gar` + historial): solo vale el cotejo en `cot`/`cotFot` (no hay datos del tareo en producción). Un tareo sin `cot` vigente pide cotejar.
- El capataz **puede abrir en solo lectura** sus tareos ya enviados de ayer/anteayer (y cualquier fecha listada); las reglas siguen bloqueando cambios.
- A6 (duplicado entre documentos con datos atrasados del navegador) se cierra en F3: la publicación la hace el servidor y rechaza cualquier DNI repetido en el día.

## Correcciones de la segunda auditoría — oficina

Solo `tareo-rev.js`, en `tareo.js` `toStats`/`renderTDia`/`toFotos` y `TD`, una línea de `lqModal`/`lqClose` (`liberaciones.js`), el CSS de revisión, reglas `tareo` y pruebas (`tests/e2e/tareo-audit2.spec.js`, «tareo segunda auditoría A4» en `tests/rules/firestore.test.mjs`). Reemplaza lo dicho antes sobre la «lectura compatible» del cotejo.

- **A1 · jornada congelada al revisar:** «Marcar revisado» guarda `cfg: tCfgDia(date)` dentro de la transacción si el tareo no la tiene (y valida con esa jornada): un revisado nunca queda sin `cfg`.
- **A2 · cotejo atado a la evidencia:** `trCyc(doc)` = fotos (sin orden) + **`envN`** (contador de envíos; si no existe, `envAt`). `TR.cyc` se toma con el cotejo (`trInit`). «Guardar cotejo» y «Marcar revisado» comparan dentro de la transacción `trCyc(cur)` con `TR.cyc`: si cambió, rechazan (`trCycErr`), **descartan las marcas sin guardar** y avisan (`#trCycV`, `TR_CYC`: «…vuelve a cotejar con el formato actual»). Lo mismo al llegar por la suscripción un cambio de fotos o un reenvío con marcas sin guardar (`trSync`). Un reenvío con la misma foto también invalida (por `envN`/`envAt`).
  - **Contrato con el celular:** al pasar a `env`, `tareo-cap.js` incrementa `envN` (`(+envN||0)+1`) junto con `envAt`. La regla del capataz no lo restringe (lo escribe en su borrador/reabierto).
- **A3 · recuperar un conflicto:** si «Guardar corrección» o «Marcar revisado» chocan con otro usuario (`TR_CHG`), sale `#trConfl` con **«Recargar versión actual»** (`#trReload`, `trReload`): avisa si hay corrección o cotejo sin guardar, vuelve a leer el tareo (`get`), reinicia la versión base (`TR.sig`, `TR.cyc`) y, si se estaba corrigiendo, reabre el editor con los datos nuevos (`trEdOpen`). Cerrar la revisión y volver a abrirla también empieza limpio (`trClose` borra editor, cotejo y aviso).
- **A4 · sin compatibilidad (decisión del dueño):** `tCotDe` lee **solo** `cot` con `cotFot` vigente; `rows[dni].fir/gar` y el historial ya no cuentan (un tareo sin `cot` pide cotejar). Reglas al **crear** (`tHistNew`): el `tcap` no trae `cot`, `cotFot`, `revAt`, `revBy`, `reab`, `pub`, y `hist` es vacío o una sola entrada `{a:'env', by: mid()}`. Al actualizar, su entrada nueva de `hist` además debe tener `by == mid()`. `rows.*.fir/gar` **no** se valida en reglas (mapas anidados): la app ya no los lee.
- **A7 · fotos que llegan con el detalle abierto:** `trDraw` carga las que falten (`trFotoLoad` → `toFotos`); `TD.fLd` (leyéndose) y `TD.fErr` (id → motivo). El visor muestra «Cargando la foto…» (`#trFLd`) o el error con **«Reintentar»** (`#trFErr`, `#trFRe`); `toFotos` avisa a la revisión (`trFotoSync`). Mientras alguna foto del tareo no esté cargada, «Firmó Sí/No» y «Todos firmaron» quedan deshabilitados (`trFotosOk`, `#trFWait`). Abrir el detalle reintenta las que fallaron.
- **UX1 · sin marcar no es falta:** `toStats` → `pres` (`as===true`), `fal` (solo `as===false`; motivo vacío = «sin motivo» en el desglose) y `sm` (sin marcar). Lista: columnas «Vinieron», «No vinieron», «Sin marcar» (`data-l`, chip ámbar `.tr-sm`); resumen: «No vinieron» (`#toFal`) y, si hay, «Sin marcar» (`#toSm`, ámbar); detalle: «n vino(n) · n no vino(n) · n sin marcar» (`.tr-ksm`) y filas `tr[data-as="no"]` «No vino · motivo» / `tr[data-as="sm"]` «Sin marcar» (las sin marcar primero).
- **UX5 · teclado:** al abrir, el foco va a «← Tareos del día»; Tab/Shift+Tab no salen de la capa de arriba (`trTrap`: foto ampliada, `#lqm` o `#trWs`); en el módulo Tareo, Esc cierra `#lqm` (pasar a otro capataz, registrar falta, cuentas de capataz) y `lqClose` devuelve el foco a quien la abrió (`LQ_RET`, solo en Tareo); Esc en la revisión pregunta si hay cambios sin guardar (`trLeave`); al cerrar, el foco vuelve a la fila del tareo que se estaba revisando.
- Pruebas: `tests/e2e/tareo-audit2.spec.js` (fallan con el código anterior). Pendiente conocido: A6 (duplicado entre documentos con la lista atrasada) se cierra en F3 en el servidor.

## Correcciones de la segunda auditoría — capataz

Solo `tareo-cap.js`, el CSS `/* tareo: capataz */` (bloque «segunda auditoría») y las pruebas (`tareo-cap.spec.js`, nueva `tareo-cap-ux.spec.js`, que convierte los casos A5 y UX de ChatGPT en pruebas de que el defecto ya no ocurre). Reemplaza lo dicho antes sobre «Jornada de hoy», el botón «Falta la foto» y los días ya enviados.

- **A5 · jornada del día = la de `tCalc`:** `tcCfg(fecha)` = `doc.cfg` (v:1) del tareo abierto si lo tiene; si no, `tCfgDia(fecha)`. `tcJor(fecha)` sale de `tDia(fecha, tcCfg)`: `h` (0 en no laborable), `nl`, ventana de refrigerio (`ri`, `ref`: la de `refNoLab` en domingo/feriado) y atajos. Encabezado, barras, «¿Quiénes?» (`tcOcc`), atajos y `tcBH` usan lo mismo. En día no laborable (feriado del tareo o día sin jornada): aviso `#tcNoLab` «Día no laborable: todas las horas cuentan como extra» (con «Feriado: <nombre>.» o «Domingo: sin jornada ordinaria.»), «Horas por obrero» dice «Día no laborable: todas las horas son extra» (`#tcJorH`; si no, «Jornada del día: X h»), las barras «todo extra (no laborable)» y el horario del editor lleva «sugerido · día no laborable…» (`.tc-sug`): los atajos usan la jornada de ese día de semana o, si no tiene (domingo), la del lunes, solo como sugerencia.
- **`envN`:** al pasar a `env`, `envN = (envN entero > 0 ? envN : 0) + 1` (1 el primer envío, +1 en cada reenvío de un reabierto); si el servidor rechaza el envío vuelve al valor anterior. La oficina ata el cotejo a ese ciclo. Reglas: el `update` del `tcap` no restringe `envN` (no está en la lista de `affectedKeys` prohibidas), así que se escribe sin cambiar reglas; tampoco obliga a que solo suba de a 1 (pendiente si se quiere blindar).
- **UX1 · contadores:** paso 1 muestra «Marcados a de b» y tres casillas (`#tcK3`): vinieron (`as===true`) · no vinieron (`as===false`) · sin marcar (el resto), la misma clasificación que la oficina. El paso 3 agrega «· n sin marcar» si hay.
- **UX2 · nombres identificables:** `tcLabels(rows)` → `TCS.lbl = {L, F, dup}` (se arma en cada `tcHtml`). `tcSN(dni)`: abreviatura («Juan Quispe»); si dos coinciden, nombre + apellidos completos («Juan Quispe Mamani») y, si aún coinciden, «·DNI 123» (últimos 3). `tcFN(dni)`: nombre completo (con «·DNI ###» si dos son idénticos). Se usa en el editor (chips; los repetidos llevan además el nombre completo escrito, `.tc-ppfn`), tarjetas de trabajo, línea de tiempo, cruces y resumen. El paso 1 muestra el DNI de cada obrero. Nombre tocable `.tc-nmt[data-tcnm]` (barras, tarjetas, «no vino» del editor): al tocarlo (o Enter) un aviso con nombre completo y DNI (`tcNmToast`).
- **UX3 · buscar en la cuadrilla:** paso 1, cabecera pegajosa `.tc-stk` (`#tcStk1`, `position:sticky` dentro de `#tcBody`) con título, «Marcados», `#tcK3`, buscador `#tcQ1` (nombre o DNI) y filtros `[data-tcf1]` Todos / Sin marcar / No vinieron (`TCS.q1`, `TCS.f1`). Editor: `#tcQ2` y `[data-tcf2]` Libres (`tcLibres`) / Seleccionados / Todos (`TCS.q2`, `TCS.f2`; se reinician al abrir un trabajo). Filtrar solo oculta: no cambia `as` ni `TCS.ed.dnis`; la numeración es la de la lista completa; sin resultados, «Ver a todos» (`f1x`/`f2x`). `tcFix` quita el filtro del paso 1 para mostrar a quien falta marcar.
- **UX4 · foto:** en el paso 3 la tarjeta `#tcFotoC` va arriba (después de errores y avisos, antes de la lista). Si solo falta la foto, el botón inferior es «📷 Falta la foto: tomarla» (`data-tca="foto"`, `tcFotoGo`): va al paso 3, resalta la tarjeta (`.tc-hi`, `TCS.fotoHi`, se quita al tomar una) y hace `click()` en `#tcFile` (abre la cámara; si el navegador no lo permite queda resaltada). Día y paso se guardan en `sessionStorage` `lps.tcv` `{cap, date, step, t}` en cada `tcDraw`; si la página se recarga (el celular la cerró mientras estaba la cámara) `renderTCap` vuelve a ese día y paso (vale 6 h). La foto sin confirmar ya se guardaba en `lps.tcfp.*`.
- **UX6 · días enviados en solo lectura:** los botones de ayer/anteayer ya no se deshabilitan: con estado `env`/`rev`/`pub` llevan «Enviado ✓» / «Revisado» / «Publicado» (`.tc-dst`, borde verde `.tc-dro`) y abren el tareo en solo lectura (`tcRO`: sin pasos, sin pie, sin cámara ni ✕ de fotos; `tcChg`/`tcAct` no hacen nada). El estado de ayer/anteayer se consulta siempre respecto de hoy, aunque se abra otro día. Las reglas siguen impidiendo que el `tcap` escriba un `env`/`rev`.

## Contrato «horas por cantidad» (grilla tipo formato físico, oct 2026, aprobado por el dueño)

Reemplaza el reparto por horarios (bloques con inicio/fin) en tareos **nuevos**. Los tareos antiguos con `blq` se siguen calculando como antes (compatibilidad de lectura).

- Doc `tareo`: `modo: 'hrs'`; `pcs: [pcId, …]` = trabajos (partidas) del día que agregó el capataz, en su orden; `rows[dni].h = {pcId: horas}` lo escribe el capataz directamente (múltiplos de 0,5; 0 o ausente = nada); `rows[dni].sal` = hora de salida `'HH:MM'` solo si salió antes/después de lo normal (opcional); `blq` no se usa.
- `tCalc(doc)` con `modo:'hrs'`: presente → `trab = suma de h`; `ext = max(0, trab − horas de la jornada del día)` (con `doc.cfg` si existe; no laborable → todo extra); `ini` = inicio de la jornada; `fin` = `sal` si existe, si no se estima = ini + trab + refrigerio del día si el tramo lo cruza (solo informativo, para cotejar con garita). Ausente/sin marcar → sin horas (conserva `h` para cuando vuelva a «vino»).
- `tValida` con `modo:'hrs'`: presente con 0 h → error «sin horas»; partida bloqueada con horas → error; sin trabajos (`pcs` vacío) con presentes → error; jornada parcial (trab < jornada) → aviso `warn`; trab > 16 → error de digitación. Ya no hay cruces.
- Celular: 1) ¿Quién vino? (motivo de «No vino» plegable y opcional; «salió temprano» opcional) → 2) Trabajos del día (agregar partidas; más usadas; copiar las de ayer) → 3) Horas: grilla con **obreros en columnas** (nombre corto) y **partidas en filas**, celdas editables (−/+ 0,5 o teclado numérico), total por obrero abajo (verde si = jornada, ámbar si no), «Toda la jornada a todos» por fila, columna de nombres/partidas fija al desplazar, mejor vista con el celular echado (landscape) → 4) Revisar y enviar (foto).
- Oficina: «Corregir» en un tareo `modo:'hrs'` usa una grilla (en PC, obreros en filas y partidas en columnas: ver «Implementación de la grilla — oficina»).
- Foto: antes de subir, editor de mejora (recorte de 4 esquinas con propuesta automática ligera + corrección de perspectiva + filtro «documento»), con «usar original». Función global `tFotoEditor(dataURL) → Promise<dataURL|null>` en `web/js/tareo-foto.js`.

## Implementación de la grilla — capataz (oct 2026)

`tareo.js` (cálculo), `tareo-cap.js` (reescrito), CSS `/* tareo: capataz */` (bloque «grilla "horas por cantidad"») y pruebas (`tareo-calc.spec.js` «horas por cantidad…», `tareo-cap.spec.js`, `tareo-cap-ux.spec.js`). Reemplaza para el celular lo dicho en «Mejoras del capataz», en «Observaciones del dueño — capataz» (ocupación, libres, cruces) y en la segunda auditoría sobre el editor de trabajos, la línea de tiempo y los atajos: ya no existen.

### Cálculo (`tareo.js`, globales para la oficina)

- `tEsHrs(doc)` → `doc.modo === 'hrs'`. `tCalc` y `tValida` derivan a `tCalcHrs` / `tValidaHrs` si es de horas; si no, el cálculo por bloques de siempre (compatibilidad).
- `tHrsTot(row)` → suma de `row.h` (ignora 0, vacíos, negativos y no numéricos), redondeada a 2 decimales.
- `tJorDia(doc)` → horas de la jornada ordinaria del día con `doc.cfg` si lo tiene (si no, la configuración actual); feriado o día sin jornada → `0` (todo es extra).
- `tCalcHrs`: limpia `h` (quita 0 y no válidos); presente → `trab = tHrsTot`, `ext = max(0, trab − jornada)` (no laborable: todo), `ini` = inicio de la jornada del día (domingo: la congelada o la del lunes, solo informativo), `fin` = `sal` o la estimada `tHrsFin(ini, trab, ventana de refrigerio)` (salta el refrigerio si el tramo lo cruza). Sin horas: `ini`/`fin` vacíos. No vino / sin marcar: `trab/ext` 0, `ini/fin` vacíos y **conserva `h`**.
- `tValidaHrs` `k`: `vacio`, `pcs` (hay presentes y `pcs` vacío), `marca`, `sinh` (vino con 0 h), `hval` (horas negativas o no numéricas), `hmax` (> `T_HMAX` = 16 h), `bloq` (partida bloqueada **con horas** de un presente; lleva `pc`), `foto`; `parcial` (`warn`). Ya no hay cruces ni horarios.

### Pantalla del capataz (`tareo-cap.js`)

- **Cuatro pasos** (`TCS.step` 1–4, también en `sessionStorage lps.tcv`): ¿Quién vino? · Trabajos · Horas · Enviar. Los tareos nuevos se crean con `modo:'hrs'`, `pcs:[]` y sin `blq`. Un borrador existente sin modo **y sin bloques** pasa a `modo:'hrs'` al abrirlo (se guarda con el próximo cambio).
- **Compatibilidad (decisión):** un tareo con `blq` y sin modo (`tcLegacy`) **no se edita con la pantalla vieja** (se quitó). Enviado/revisado: solo lectura como siempre (horario `ini–fin` de `tCalc` por bloques). Borrador o reabierto: aviso `#tcOld` «formato anterior» con la vista de solo lectura y el botón **«Pasar a horas por partida»** (`data-tca="conv"`): `h` de cada obrero = la de `tCalc` por bloques calculada como si todos hubieran venido (así el que no vino conserva sus horas), `pcs` = partidas de los bloques en su orden, `blq: []`, `modo:'hrs'`; lleva a la grilla. Solo lo hace el capataz con un toque; nada se migra solo. `tcChg` no escribe mientras sea antiguo.
- **Paso 1:** «No vino» marca la ausencia **sin** desplegar motivos; enlace `.tc-fold[data-tca="motT"]` «Motivo (opcional) ▾» (o «Motivo: Descanso médico») despliega los chips (`TCS.motO` = dni) y se pliega al elegir. A los que vinieron: «Salió a otra hora ▾» (`salT`, `TCS.salO`) con `input[type=time][data-tca="sal"]` → `rows[dni].sal` (`salX` lo quita; «No vino» lo borra). Sigue: Altura, Todos vinieron, buscador y filtros, agregar obrero (ajeno).
- **Paso 2 (`tcStep2`):** tarjetas `.tc-pcr[data-pc]` numeradas con ▲ ▼ (`pcUp`/`pcDn`) y ✕ (`pcRm`): si la partida tiene horas cargadas (de cualquiera, también de los que no vinieron) pide confirmar con `uiAsk` y borra esas horas de todas las filas (relee `TCS.doc` después del `await`). Buscador `#tcPcQ`/`#tcPcL` (abierto si no hay partidas; luego «+ Agregar trabajo» `pcOn` y «Listo» `pcOff`): sin texto, las más usadas (`lps.tcpc.<cap>`); nunca las bloqueadas ni las ya agregadas; agregar no cierra el buscador (para agregar varias). «Copiar los trabajos del <día>» (`copy`) si no hay partidas: las del último tareo de los 3 días anteriores (de horas: `pcs`; antiguo: partidas de sus bloques) menos las bloqueadas o inactivas. Una partida bloqueada en `pcs` sale en rojo y no deja enviar (`tcErrs` `k:'bloq'` con `pc`, aunque no tenga horas): «quítala».
- **Paso 3 — grilla (`tcStep3`):** `#tcGrid` (`.tc-gw`, desplaza en ambos ejes) con `table.tc-g`: fila de nombres `th.tc-gn[data-dni]` (solo los que vinieron; `tcSN` con desambiguación, tocable para ver nombre y DNI) fija arriba; columna `th.tc-gp` (código, nombre corto en 2 líneas y «Toda la jornada» `rowAll`) fija a la izquierda; fila «Total» (`td.tc-gt[data-dni]`) fija abajo: verde `ok` = jornada exacta, ámbar `warn` = menos («faltan 4,5») o más («+2 HE»), rojo `bad` = 0 h o > 16; en no laborable ámbar «todo extra». Celdas `button.tc-gcell[data-dni][data-pc]` (≥ 60 px; vacía muestra «+»; en partida bloqueada deshabilitada salvo que tenga horas, para borrarlas). La columna de un obrero con error de horas va en rojo (`.tc-gn.bad`).
  - **Editor de celda (decisión):** tocar una celda abre una hoja abajo (`#tcCell`, `TCS.cell = {dni, pc}`; fondo `.tc-csb` la cierra, Esc también) con nombre completo, partida y «En el día: X h de 8,5 h»; **−½ / +½** (no cierran), horas rápidas **1 2 3 4 4,5 5 5,5 6 7 8 8,5** (cierran), «Resto de su jornada → X h» (lo que le falta, cierra), «Borrar» y «Listo». Se eligió botones en vez de `input` numérico: con el dedo es un toque por celda en el caso común, no abre el teclado (que en el celular echado tapa la grilla) y no hay comas/puntos que digitar. Máximo por celda 24 (`TC_HTOP`).
  - **«Toda la jornada»** de una fila: a cada uno que vino le suma en esa partida lo que le falta para su jornada (`tcJor().full`: la jornada del día; en no laborable la de ese día de semana o la del lunes, como referencia).
  - **«Copiar horas del <día>»** (`copyH`): solo con la grilla vacía, si el tareo anterior es de horas, tiene todas las partidas de hoy y todos los que vinieron hoy vinieron ese día con horas (`tcPrevH`); copia solo las partidas de hoy.
  - **Echado:** `#tcRoot.g3` (paso 3 editable). `@media (orientation:landscape) and (max-height:500px)`: con `body:has(#tcRoot.g3)` se ocultan `.top` (barra y pestañas) y `#bnav`, y en el tareo `.tc-head` (fechas, pasos y estado); el pie queda compacto (40 px) y la columna de partidas se ensancha (206 px, botón al lado). En vertical (≤ 760 px) sale `#tcRot` «Gira el celular para ver más columnas» (con más de 2 obreros), descartable y recordado (`localStorage lps.tcrot`).
- **Paso 4 (`tcStep4`, antes paso 3):** igual que antes (foto arriba, errores, avisos, resumen por obrero con horas por partida, extra, altura y «salió hh:mm»), sin línea de tiempo. También es la vista de solo lectura.
- **Foto:** `tcAddFoto` → si existe `tFotoEditor`, le pasa el dataURL del archivo (`tcReadUrl`) y usa lo que devuelve (`null` = cancelado: no sube nada); luego `tcShrink` (acepta archivo o dataURL) y la subida confirmada de siempre. Después de los `await` vuelve a comprobar día y estado.
- **Navegación (`tcGo`, `tcFix`):** del paso 1 no se pasa sin marcar a todos. Los botones de abajo no pasan a la grilla sin trabajos o con una bloqueada, ni a «Enviar» con errores de horas: `tcFix` lleva al paso 1 (asistencia) → 2 (`pcs`/`bloq`, a la tarjeta) → 3 (`sinh`/`hval`/`hmax`, desplaza la grilla a la columna del obrero) → 4 (foto). Las pestañas de pasos dejan ir libremente (salvo el paso 1).
- `tcSend` relee `TCS.doc` después de la confirmación (no usa un objeto tomado antes del `await`).
- Pruebas: `tests/e2e/tareo-cap.spec.js` (flujo completo 390×844 y echado 844×390, compatibilidad, copiar, foto con `tFotoEditor`, auditorías F2) y `tareo-cap-ux.spec.js` (A5, envN, UX1–UX6 adaptados). Capturas para mirar: `TC_SHOTS=<carpeta> npx playwright test tareo-cap`.

## Implementación de la grilla — oficina (oct 2026)

Solo `tareo-rev.js`, el CSS `/* tareo: revisión */` y las pruebas (`tareo-rev.spec.js`; ajustes en `tareo-audit2.spec.js`). Reemplaza lo dicho antes sobre el editor (`trEdDoc` ya no existe), «Recargar versión actual» (descartaba la corrección) y la pregunta al salir.

### Bug «No cambiaste nada» (reportado por el dueño)

- **Causa:** la vista no se enteraba de lo que la propia oficina acababa de guardar. Una transacción de Firestore no pasa por la caché local: la suscripción recibe el documento nuevo recién cuando llega la foto de la base, después de que termina la transacción, y mientras tanto `trSync()` redibujaba con el documento **viejo** (los cambios parecían no haberse guardado). Si el asistente abría «Corregir» en ese lapso, el editor tomaba como base la versión vieja; al guardar → «Otro usuario cambió este tareo»; «Recargar versión actual» **descartaba** la corrección y reabría el editor igual a lo guardado → «No cambiaste nada»; Esc → «¿Salir sin guardar?» → lo último no se guardaba. Además `tCam` no veía «sin marcar → no vino» (comparaba `!!as`) y redibujar el panel en cada `change` de un `<input type=time>` (Chrome lo avisa en cada parte de la hora) cambiaba lo que se tecleaba (13:00 → 18:00).
- **Arreglo de raíz:**
  - `trTx` aplica el update al documento leído y lo pone al momento en `TD.docs` (`trLocal` + `trApply`; los valores especiales se crean con `trDel()`/`trAU()` para poder aplicarlos). No pisa una versión más nueva que ya haya llegado. `trPasar` hace lo mismo con sus dos documentos.
  - El editor guarda **su propia copia base** (`TR.ed.base`; `TR.ed.sig` = `TR.edSig`) y los cambios se calculan siempre contra ella: `trEdState(doc)` (estado editable), `trEdPatch(e)` (cambios: fila `r` as/mot/alt/sal, horas `h`, partida del día `pa`/`pd`, bloque `ba`/`bd`/`bs`), `trEdApply(doc, P)` (aplica solo esos cambios), `trEdN()` (n.º de cambios), `trEdCur()` (cómo quedaría). La transacción compara la base con el documento actual y guarda `trEdApply(cur, P)`.
  - **«Recargar versión actual» ya no pierde la corrección:** `trEdRebase(t)` reabre el editor sobre la versión nueva y le vuelve a aplicar los cambios («Se mantienen tus n cambios: revísalos y guarda»). Si los dos tocaron lo mismo, queda lo del asistente. El cotejo sin guardar sí se descarta (pregunta antes).
  - Si llega un cambio de otro usuario con el editor abierto, el aviso `#trConfl` sale de inmediato (`trSync`), no recién al guardar.
  - `tCam`/`tDetAll` comparan vino / no vino / sin marcar en tres estados. `tDet` = `tDetAll(...).slice(0,50)`.
  - Horas (desde/hasta, salida) y celdas: al cambiar solo se actualizan totales, avisos y encabezado (`trEdLive`), sin redibujar la tabla. Si llega un redibujo mientras se escribe en un campo del editor (`trBusyIn`), el panel espera (`TR.pend`) y se redibuja al salir del campo; el aviso de conflicto (`#trAv`) sí se actualiza. Los clics que cambian la estructura llaman `trDraw(true)`.
- **Salir:** encabezado con «← Volver a la lista» (`#trBack`) y «✕ Cerrar» (`#trX`) siempre a la vista; corrigiendo, «n cambios sin guardar» (`#trEdN`), «Cancelar corrección» (`#trEdX`, confirma si hay cambios) y «Guardar corrección» (`#trEdOk`; sin cambios avisa «Aún no cambiaste nada…»), con borde ámbar (`.tr-ws.tr-editing`). Esc, ←/→ y los botones de salir pasan por `trLeave`: **sin cambios no pregunta**; con corrección o cotejo sin guardar abre `trAsk3` (`#trAsk3`, `[data-l3]`: «Seguir editando» · «Descartar» · «Guardar corrección»/«Guardar cotejo»; Esc o clic afuera = seguir). Si guardar falla o se cancela el motivo, no sale. `trEdSave` y `trSaveCot` devuelven `true`/`false`. En un campo de texto u hora Esc solo lo suelta; en una casilla sale.

### Corregir en grilla (`modo:'hrs'`)

- **Disposición (decisión para laptop):** obreros en **filas** y partidas en **columnas**, como el formato físico, el Excel de costos y el detalle de solo lectura (el celular va al revés porque es angosto y vertical). Corrigiendo, la foto baja a ~36 % del ancho y la grilla sube a ~64 % (≥ 1100 px): a 1440 px caben ~5 partidas sin desplazar; con más, desplazamiento horizontal con N° y obrero fijos (cabecera y totales también).
- Columnas: N°, obrero, asistencia («Vino» / «No vino» `[data-tra="as"]`, motivo opcional `select[data-tre="mot"]`, «Sin marcar» si `as` es null), una por partida (`th[data-pc]` con código, nombre y ✕ `[data-tra="pcdel"]`, que confirma si tiene horas), Total (`#trht_<dni>`: verde = jornada del día, ámbar si no), HE (`#trhe_<dni>`), Salida (`input[type=time][data-tre="sal"]`, opcional) y altura. Pie: total por partida (`#trhc_<pc>`), total y HE (`#trhg`, `#trhx`). «Agregar partida» (`#trPcAdd`, activas y no bloqueadas) la agrega al final de `pcs` y lleva el foco a su primera celda. Columnas = `pcs` + cualquier partida con horas (`trEdCols`).
- Celdas `input[data-trh][data-dni][data-pc]` (id `trh_<dni>_<pc>`), texto con `inputmode=decimal`: aceptan «4,5» o «4.5» (se muestran con punto, como el resto de horas); al entrar se selecciona todo; cada tecla actualiza totales y avisos (`trHSet(el,false)`); al salir, con Enter o Tab se redondea a 0,5 (máx. 24; avisa si redondeó) y lo que no es número vuelve al valor anterior. Teclado (`trHKey`, antes que el foco atrapado): Enter/↓ baja, Shift+Enter/↑ sube, Tab/Shift+Tab y ←/→ (cursor en el borde o todo seleccionado) cambian de partida. Los que no vinieron quedan con sus horas tachadas y deshabilitadas (las recuperan al volver a «vino»).
- Se guarda `rows` (calculado), `pcs` (nunca `blq`), `cfg` si faltaba, `hist` `cor` con `cam` («+ partida 10.20», «ALFA 10.10: 4 → 3 h», «BETA: salida — → 15:00») y `det` (`{pc, campo:'pcs'}`, `{dni, pc, campo:'h', antes, despues}`, `{dni, campo:'sal'}`). `trSig` incluye `modo`, `pcs`, `h` y `sal` en los tareos por horas.
- **Detalle de solo lectura** con `modo:'hrs'`: la misma tabla obreros × partidas en el orden de `pcs` (no por código), «sale ~HH:MM» (estimada) o «sale HH:MM» (`sal`) bajo el total y sin la sección «Bloques».
- El editor por bloques (`trEdHtmlB`) sigue para los tareos antiguos con `blq`.
- **Pasar a otro capataz:** con `modo:'hrs'` pasa la fila con sus horas y agrega al destino las partidas que no tenía; entre un tareo por horas y uno por bloques no se puede (`trDestinos` lo explica). «Quitar de este tareo» no escribe `blq` en uno por horas.
- **Cálculo asumido:** la oficina usa `tCalc`/`tValida` de `tareo.js` con `modo:'hrs'` cuando existe `tHrsTot` (señal de que `tareo.js` ya lo implementa); si no, respaldos locales `trCalcH`/`trValidaH` con el contrato (presente: `trab` = suma de `h`, `ext` = trab − jornada o todo en no laborable, `ini` = inicio de la jornada, `fin` = `sal` o estimado con refrigerio; ausente o sin marcar: 0 h pero conserva `h`; errores `vacio`, `pcs`, `marca`, `sinh`, `max` (> 16 h), `bloq`, `foto`; aviso `parcial`). `trCalc`/`trValida` eligen. `toStats` (resumen del encabezado y de la lista, en `tareo.js`) sigue usando `tCalc`: hasta que `tareo.js` sepa de `modo:'hrs'`, ahí las HH de esos tareos salen 0.

## Mejora de foto (oct 2026)

Solo `web/js/tareo-foto.js` (cargado justo antes de `js/tareo-cap.js`), el CSS `/* tareo: foto */` (clases `tf-`) y `tests/e2e/tareo-foto.spec.js`. Sin librerías: todo en canvas.

- **`tFotoEditor(dataURL) → Promise<dataURL|null>`**: capa fija a pantalla completa (`#tfWs`, `.tf-ws`, `z-index` 165: sobre `.tr-ws`/`.lqm`, debajo de `.uask`; `body.tf-on` no desplaza la página). Resuelve: «Listo» → JPEG 0,8 con lado mayor ≤ 2000 px; «Usar original» → **el mismo** dataURL recibido; «Repetir foto» → `null`. Si la imagen no se puede leer, resuelve el original. El capataz luego la reduce a ≤ `TC_FMAX`.
- **Paso 1 · esquinas:** la foto (copia de trabajo `TFE.pv`, lado mayor 1200) con 4 manijas (`.tf-h`, 48 px de toque; flechas del teclado ±0,4 %, con Mayús ±2 %) y lupa ×2,5 al arrastrar (`#tfLupa`, en la esquina opuesta al dedo). «Toda la foto», «Detectar» (vuelve a la propuesta), «Ver resultado →». Estado en `TFE` (`q` = esquinas normalizadas 0–1 en orden arriba-izq, arriba-der, abajo-der, abajo-izq; `det` = `{q, ok, why}`; `f` filtro; `rot` 0–3).
- **Detección (`tfDetect(canvas)`)**: reduce a 400 px de lado mayor → grises → umbral de **Otsu** → cierre y apertura binarios r=2 (`tfMorph`; une la hoja cortada por las líneas de tinta y corta puentes con el fondo) → **componente claro más grande** (4-vecinos) → casco convexo de sus extremos por fila (`tfHull`) → cuadrilátero de **área máxima** inscrito en el casco (empieza en los 4 extremos x±y y mueve cada vértice al punto del casco que agranda el área). No confiable (`ok:false` → **margen del 5 %** y el subtítulo pide arrastrar las esquinas) si el componente es < 12 % o > 97 % de la foto, el cuadrilátero cubre < 85 % del casco, el componente < 82 % del cuadrilátero o algún ángulo sale de 35°–145°.
- **Perspectiva:** `tfHomog` resuelve la homografía 3×3 (8 incógnitas, Gauss con pivoteo) del rectángulo destino a las 4 esquinas; `tfWarp` muestrea con interpolación bilineal (incremental por fila). Tamaño (`tfOutSize`): lados medidos en la fuente; si la proporción está a ±20 % de A4, se ajusta a A4 apaisado (√2) o vertical; nunca amplía más de lo medido.
- **Filtros** (`tfFilter`): «Documento» (por omisión): fondo = hoja reducida a ~96 px, máximo 5×5 (borra la tinta) y promedio 5×5, ampliada con suavizado; cada canal ÷ fondo (luz pareja y blanco neutro), curva que lleva ≥ 90 % a blanco y oscurece el resto **sin umbral duro** (las firmas tenues no desaparecen) y saturación ×1,25 (la tinta azul sigue azul). «Color»: solo contraste leve. «Original»: solo el recorte. «Girar 90°» (`tfRot`) se aplica al final.
- **Rendimiento:** la vista previa trabaja sobre la copia de 1200 px (salida ≤ 900 px); la resolución final solo al pulsar «Listo»: la foto se reduce a ≤ 3000 px antes de muestrear y el enderezado y el filtro van por franjas con pausas (`setTimeout`) para que se vea «Procesando…» (`#tfBusy`) sin congelar. Medido en la prueba (Chromium con CPU ×4): foto de 12 MP → abrir y detectar ~0,8 s (detección ~0,25 s), vista previa ~1 s, «Listo» ~0,2–0,5 s; salida 2000×1414, ~130 KB. `TFE.detMs` y `window.__tfMs` guardan los tiempos.
- **Teclado:** Esc en «Resultado» vuelve a las esquinas (en las esquinas no hace nada: no se pierde la foto por accidente); Tab no sale de la capa; al cerrar, el foco vuelve a quien la abrió.

## Contrato de F3: publicación del día y entrega a costos (oct 2026)

Principios (auditorías externas, aprobadas por el dueño): la publicación la hace **el servidor**, sobre los datos vigentes del día; cada publicación es una **versión inmutable**; costos solo ve publicaciones; el Excel sale de la publicación; una rectificación crea una versión nueva con motivo y conserva la anterior.

### Función `publicarTareo` (Cloud Function invocable, `functions/index.js`; lógica pura en `functions/lib.js` con pruebas)

- Quién: admin, o `editor` con `tpub == true` (y no `off`). Nadie más.
- Acciones:
  - `previa {fecha}` → devuelve el resumen y los bloqueos SIN escribir nada (para la pantalla del jefe).
  - `publicar {fecha, excepciones?: {<dni>: motivo}, motivo?}` → valida y publica (motivo obligatorio si ya existe una versión: rectificación).
  - `rectificar {fecha, motivo}` → abre el día publicado para corregir: pasa sus tareos de `pub` a `rev` (la oficina corrige; corregir devuelve a `env` y hay que volver a revisar) y marca `tpubidx/{fecha}.abierto = {t, by, motivo}`. La versión vigente sigue visible para costos hasta que se publique la nueva.
- Validaciones de `publicar` (todas en el servidor, leyendo Firestore en el momento; si falla alguna, no escribe nada y devuelve la lista):
  1. Todo tareo del día con obreros está en `rev` (o `pub` en rectificación). Borradores, enviados o reabiertos bloquean.
  2. **Un DNI en un solo tareo del día** (presente, ausente o sin marcar) — cierra el hallazgo A6.
  3. Nadie «sin marcar»; presentes con horas > 0; nadie con más de 16 h.
  4. Cada tareo tiene `cfg` (jornada congelada) y cotejo vigente (`cot` con `cotFot` igual a `foto`; todos los presentes con `fir` definido).
  5. Partidas con horas existen en `tpc`.
  6. **Cobertura:** obreros activos del máster en esa fecha (periodos `per`) que no figuran en ningún tareo → bloquean salvo que vengan en `excepciones` con motivo (p. ej. «Vacaciones», «Destacado a otra obra»).
- Cálculo en el servidor (mismo criterio que `tCalc`): `modo:'hrs'` → trab = suma de `h`, ext = max(0, trab − horas de la jornada en `cfg`; no laborable → todo extra); tareos antiguos con `blq` → se usan `rows[*].h/trab/ext` guardados. Las horas extra se calculan **por obrero sobre su total del día**.
- Escritura (en una transacción o lote atómico):
  - `tpub/{fecha}_v{n}` — **inmutable**: `{fecha, v, at, by, byN, motivo, ant: n-1|null, fuentes: [{id, cap, capN, envN, revBy, revAt}], pcs: {<pcId>: {cod, nom, und, grp, grpN, ua}}, rows: [{dni, ape, nom, cat, cua, cap, capN, as, mot, alt, h: {<pcId>: horas}, trab, ext}], exc: {<dni>: {motivo, ape, nom}}, tot: {obreros, pres, aus, porMot, hh, he, alt}, dif: <resumen de cambios vs. versión anterior o null>}`.
  - `tpubidx/{fecha}` — `{fecha, v: <vigente>, vers: [{v, at, by, motivo}], abierto: null|{t,by,motivo}}`.
  - Tareos fuente: `st:'pub'`, `pubV: n`, `hist` con `a:'pub'`.
- Reglas: `tpub` y `tpubidx` los lee `isTar()` (incluido `tcos`); nadie los escribe desde la app (solo la función con Admin SDK). `tcos` sigue sin leer `tareo` ni `tfot`.

### Pantallas

- Pestaña nueva **`tpub` «Publicación»** (admin y editor con `tpub`): elegir fecha → previa del servidor: obreros únicos, presentes, ausentes por motivo, sin tareo, HH, HE, altura, tareos por estado, bloqueos (con enlace al tareo o a la revisión) y casillas de excepción con motivo para los «sin tareo». Botón «Publicar día» (o «Publicar rectificación (v2)» con motivo). Historial de versiones del día con quién/cuándo/motivo y diferencias. Botón «Rectificar» (motivo).
- Pestaña nueva **`tcos` «Costos»** (tcos, admin, editor con tpub; reemplaza el aviso actual de `tdia` para tcos): calendario/lista de días publicados (vigente y versiones anteriores marcadas «sustituida»), detalle de una publicación (tabla obreros × partidas), y **descargas Excel** desde las publicaciones: un día, una semana (lunes–domingo) o un rango.
- **Excel de costos** (formato del archivo `semana_02.10.26.xlsx`, ver «Lo que dice el Excel que hoy recibe costos»): una hoja por día (`dd.mm`) con N°, obrero, cuadrilla, DNI, categoría, columnas de partidas agrupadas por grupo con su código (todas las partidas del catálogo congelado en la publicación, en orden numérico), Horas totales, Horas extras, Bonos `(A)`; hoja «Resumen HH» (HH y HE por obrero y día, totales HN/HE) y hoja «Tareo Semana» (asistencia A / I / DM… por día, horas extra, horas de descanso médico: DM = jornada del día). Encabezado con proyecto, fecha, versión publicada y quién publicó. Sin fórmulas rotas: valores.
- `TAR_TABS` agrega `tpub` y `tcos`; `tabAllowed` según rol.

## Implementación de F3 — servidor (oct 2026)

`functions/tpub.js` (lógica pura), `functions/index.js` (`publicarTareo`), `functions/lib.js` (reexporta), `functions/test/tpub.test.js`, reglas `tareo`/`tpub`/`tpubidx` («tareo F3» en `tests/rules/firestore.test.mjs`) y el Firebase falso (`tests/e2e/fake-firebase.js`, prueba `tests/e2e/tareo-pub-fn.spec.js`).

### Dónde está la lógica

- **`functions/tpub.js`**: todo lo puro, **sin `require`** (UMD: en Node `module.exports`, en el navegador `window.TPUB`). `lib.js` lo reexporta (`require('../lib')` trae `tpCalcRow`, `tpValidarDia`, `tpArmarPublicacion`, `tpDif`, `tpPuede`, `tpPedido`, `tpFirma`, `tpEjecutar`, `tpCfgDia`, `tpActivo`, `tpCotVig`, `tpDia`).
- **`tpEjecutar(ctx)`** es la función entera sin Firebase: recibe lo leído `{P, tareos, personal, partidas, tcfg, idx, vigente, by, byN, now}` y devuelve `{err:{code,msg}}` o `{res, escr:[{col, id, tipo:'crear'|'poner'|'cambiar', datos, hist?}]}` (`cambiar` + `hist` = `update(datos + hist: arrayUnion(hist))`). `index.js` solo lee (en la transacción) y aplica `escr`; el falso hace lo mismo sobre la base en memoria.
- **`tpCalcRow(row, cfg, modo)`**: `modo:'hrs'` → `trab` = suma de `h` (> 0), `ext` = max(0, trab − jornada de `cfg`) sobre el total del día; feriado o día sin jornada → todo extra; sábado sin refrigerio porque la jornada congelada ya trae `ref: 0`. Tareo antiguo (bloques, sin modo) → `rows[*].h/trab/ext` **guardados**. No vino / sin marcar → `{h:{}, trab:0, ext:0}`. Solo usa la jornada **congelada** (`cfg`); `tpCfgDia(tcfg, fecha)` (copia de `TC()`+`tCfgDia`) solo sirve para mostrar horas en la previa de un tareo sin `cfg` (eso igual bloquea).

### `publicarTareo` (onCall, us-central1, 120 s)

- **Quién** (`tpPuede`): el dueño, `admin`, o `editor` con `tpub === true`; correo confirmado y sin `off`. Si no: `permission-denied` «Solo el administrador o el jefe de producción con «Publica tareo» pueden publicar el tareo.».
- **Pedido** (`tpPedido(data, hoyLima)`): `{accion:'previa'|'publicar'|'rectificar', fecha:'YYYY-MM-DD' (no futura), excepciones?: {dni: motivo}, motivo?, firma?}`. Excepciones con motivo vacío se descartan (≤ 200 caracteres); motivo ≤ 500; `rectificar` exige motivo. Error → `invalid-argument` con el mensaje.
- **Lecturas:** `tper`, `tpc`, `tcfg/main` fuera de la transacción; `tpubidx/{fecha}`, `tareo where date == fecha` y la versión vigente `tpub/{fecha}_v{idx.v}` **dentro** (en `previa`, lecturas simples).
- **`previa`** (no escribe) → respuesta:
  ```
  { fecha, ok, bloqueos:[{k, msg, tareo?, tareos?, dni?, pc?}], resumen, sinTareo:[{dni, ape, nom, cua, cat, cap, exc}],
    firma, rect, v, motivoReq, vigente: {v, at, by, byN, motivo} | null, abierto: {t, by, motivo} | null, dif: <tpDif> | null }
  ```
  - `resumen = {fecha, tareos:[{id, cap, capN, st, n, pres, aus, sm, hh, he, bloq}], porEstado:{st:n}, obreros (DNI únicos en tareos), pres, aus, sm, porMot:{mot|'_':n}, sinTareo, exc, hh, he, alt, porPc:{pcId:horas}}` (`'_'` = falta sin motivo: Firestore no admite claves vacías).
  - `v` = la versión que se publicaría; `rect`/`motivoReq` = ya hay versión (publicar exige motivo); `dif` = diferencias contra la vigente (solo sin bloqueos). `sinTareo[].exc` = motivo recibido (para mantener las casillas).
  - `firma` = hash de **todos** los tareos del día (`tpFirma`): pásala a `publicar`.
- **`publicar`** → en una transacción vuelve a leer y validar. Errores: firma distinta → `aborted` «Un tareo del día cambió desde que abriste la previa: vuelve a revisar.»; hay versión y no hay motivo → `invalid-argument`; otra publicación a la vez (`tpub` ya existe) → `aborted`. **Con bloqueos no lanza error**: devuelve lo mismo que la previa con `ok:false` y no escribe. Si publica:
  ```
  { ...lo de la previa, ok: true, id: '<fecha>_v<n>', v, tot, dif, n (tareos fuente) }
  ```
  Escribe `tpub/{fecha}_v{n}` (`create`, forma del contrato: `{fecha, v, at, by, byN, motivo, ant, fuentes, pcs, rows, exc, tot, dif}`; `tot = {obreros, pres, aus, porMot, hh, he, alt, exc, porPc}`), `tpubidx/{fecha}` = `{fecha, v, vers:[…, {v, at, by, byN, motivo}], abierto:null}` y cada tareo fuente `{st:'pub', pubV:n, by, ts}` + `hist` `{t, by, a:'pub', v, mot?}`.
  - `rows` ordenadas por apellidos y nombres; `ape/nom/cat/cua` de la ficha del máster (si no, la foto de la fila); el ausente va con `h:{}` y su `mot`; `alt` solo para presentes.
  - `pcs` = **catálogo congelado**: todas las partidas activas (`act !== false`) más cualquiera con horas, en orden numérico de código (`{cod, nom, und, grp, grpN, ua}`).
  - `exc` solo de activos sin tareo (las de DNI que sí están en un tareo o no activos se ignoran).
- **`rectificar {fecha, motivo}`** → `{ok:true, fecha, v (vigente), abierto:{t, by, motivo}, n (tareos que vuelven a rev)}`. Exige versión publicada y que no esté ya abierto (`failed-precondition`). Tareos `pub` → `{st:'rev', by, ts}` + `hist` `{a:'rect', mot, v}`; `tpubidx.abierto`. La versión vigente sigue para costos. En la rectificación los tareos que siguen `pub` (no se tocaron) no bloquean; corregir uno lo devuelve a `env` y hay que revisarlo.
- **Bloqueos** (`k`): `nada` (no hay tareos con obreros ni activos), `estado` (no `rev`; `pub` solo si ya hay versión), `cfg` (sin jornada congelada), `cot` (sin foto o `cotFot` ≠ `foto`), `marca`, `hval`, `sinh`, `hmax` (> 16 h), `pc` (partida con horas que no está en `tpc`; una vez por partida), `firp` (presente sin `fir` true/false en el cotejo vigente; «no firmó» no bloquea), `dup` (DNI en dos o más tareos no archivados del día, presente/ausente/sin marcar; `tareos:[ids]`), `cob` (activo del máster en la fecha, con periodos `per`, sin tareo ni excepción con motivo). Tareos archivados o sin filas no cuentan (ni bloquean).
- `tpDif(anterior, nueva)` → `{agregados:[{dni, nom, capN}], quitados, cambios:[{dni, nom, campo:'as'|'mot'|'alt'|'cap'|'h'|'ext', pc?, antes, despues}], excAgregadas:[dni], excQuitadas, tot:{obreros|pres|aus|hh|he|alt:{antes, despues}}, n, mas}` (listas hasta 300; `mas` = lo que quedó fuera).
- Todo lo escrito pasa por `limpio()` (sin `undefined`).

### Reglas

- `tpub`, `tpubidx`: `read: isTar()` (incluye `tcos`, `tcap` y el editor con `tpub`; no `off`); `write: false` (solo la función).
- `tareo`, oficina (`tarEd`): al crear no trae `st:'pub'` ni `pubV` (`tOfiNew`); al actualizar, ni el anterior ni el nuevo están en `pub` y no cambia `pubV` (`tOfiUpd`), **salvo** que el documento quede idéntico (restaurar un respaldo sobre la misma obra). Un tareo publicado solo se corrige tras «Rectificar» (la función lo devuelve a `rev`; conserva `pubV`).
- `tareo`, capataz: `pubV` se suma a las claves que no crea ni cambia; `tHistOk` también prohíbe `a:'rect'`.
- Pendiente: restaurar un respaldo **en otra obra** (copia de prueba vacía) con tareos `pub` falla por la regla (y `tpub`/`tpubidx` no están en el respaldo); hoy no hay datos del tareo en producción.

### Firebase falso (pruebas de la interfaz)

- `helpers.js` (`openApp`) carga **`functions/tpub.js` antes del falso** (`TPUB_JS`); `mundo-compartido.js` lo antepone al falso generado. `firebase.functions().httpsCallable('publicarTareo')` usa `window.TPUB`: mismas validaciones, cálculo, respuesta y escrituras que el servidor (lee la base en memoria, `tpEjecutar`, aplica `escr` de una sola vez). Errores con `code: 'functions/<código>'` y el mismo mensaje. Las otras pruebas que cargan el falso a mano (`tareo-cuentas`, `tareo-inv`) no lo necesitan; si falta, la llamada da `functions/unavailable`.
- Llamadas en `window.__fnCalls`; datos con `window.__dbGet('tpub', '<fecha>_v1')`, `__dbGet('tpubidx', fecha)`. Ejemplo y contrato de respuestas: `tests/e2e/tareo-pub-fn.spec.js`.

## Implementación de F3 — pantallas (oct 2026)

Código en `web/js/tareo-pub.js` (después de `tareo-cuentas.js`), CSS en el bloque `/* tareo: publicación */` (clases `tp-`), pruebas en `tests/e2e/tareo-pub.spec.js`. Globales: `TPB`/`tpb*` (Publicación), `TPK`/`tpk*` (Costos), `tpx*` (Excel), `TPUB` (caché de publicaciones leídas: son inmutables). Ids del DOM con prefijo `tpb`/`tpk` (en Partidas ya existen `#tpOk`, `#tpMsg`, `#tpCod`…).

- **Pestañas:** `TAR_TABS=['tdia','tpub','tcos','tper','tpc','tcfg']`. `tabAllowed`: `tpub` → `tpPubOk()` (admin o editor con `tpub`); `tcos` → `tpCosOk()` (además `tcos`); `tdia` ya **no** para `tcos` (su inicio es Costos; se quitó el aviso de `renderTDia`). `tasis` no ve ninguna de las dos. Vistas `renderTPub`/`renderTCos` en `views` de `render()`.
- **Llamada a la función:** `tpCall(data)` = `firebase.functions().httpsCallable('publicarTareo')(data)`; errores con `tpErr` (sin conexión, función no instalada, sesión vencida, o el mensaje del servidor). Si el error trae `details.bloqueos`, reemplazan los de la previa.
- **Lecturas:** suscripciones temporales `tpSub(slot,key,ref,cb,act)` (se sueltan en la siguiente llegada si la pestaña ya no se ve, y al cerrar sesión): Publicación `tpubidx/{fecha}` y `tpub where fecha==`; Costos `tpubidx` y `tpub` con `fecha` entre `<mes>-01` y `<mes>-31`. Todo tolerante: `tot` se recalcula de `rows` si falta (`tpTot`), `at` puede ser ms o Timestamp (`tpMs`), `dif` puede ser texto, lista u objeto (`tpDif`), `sinTareo` en `resumen.sinTareo` o en la raíz.
- **Publicación (`tpub`):** fecha (‹ › Hoy); estado del índice («Sin publicar» / «Publicado vN · cuándo · quién»; aviso `#tpbAb` si `abierto`). «Ver estado del día» (`#tpbVer`) llama a `previa` y muestra tarjetas (obreros, vinieron, no vinieron por motivo, sin tareo, HH, HE, altura), tareos por estado (`TO_ST`) y **bloqueos agrupados por `k`** (`TPB_K`; `#tpbBlq`, «Abrir tareo» `[data-tpbt]` → `tpbAbrir`: pone `TD.f` y `TR.want` y va a Tareos del día, que abre la revisión al llegar los tareos). Los bloqueos con `dni` de un obrero de «Sin tareo» no se listan ahí: se resuelven con la **excepción** (`#tpbSin`: casilla `[data-tpbx]`, chips `[data-tpbm]` Vacaciones / Descanso médico / Destacado a otra obra / Licencia / Otro, texto `[data-tpbi]`; «Marcar a todos con» `[data-tpba]`). «Publicar día» (`#tpbPub`) se habilita sin bloqueos y con motivo para todos los sin tareo (`tpbCalc().why` en `#tpbWhy`); confirma con `uiAsk` y totales y llama `publicar {fecha, excepciones:{dni:motivo}}`; luego vuelve a pedir la previa. Publicado y **no** abierto: no hay botón de publicar, solo «Rectificar…» (`#tpbRect`, motivo obligatorio → `rectificar {fecha, motivo}`). Abierto: «Publicar rectificación v(N+1)» con motivo obligatorio (`uiAsk` input) → `publicar {…, motivo}`. Historial `#tpbHist` (de `tpubidx.vers`, o de los `tpub` leídos): vigente/sustituida, cuándo, quién, motivo, totales, «Diferencias con la vN» (`dif`) y «Ver en Costos» (abre el detalle).
- **Costos (`tcos`):** mes (‹ input month ›). Descargas (`#tpkX`): un día, semana (lunes–domingo de la fecha elegida) y rango (≤ 62 días), siempre de la versión **vigente** (`tpxVigentes`: `tpubidx` del periodo → `tpub/{fecha}_v{v}`). Lista `#tpkList` por fecha descendente: vigente (`tr.tp-day`, obreros, vinieron, HH, HE, quién/cuándo, «En rectificación» si está abierto, Ver, Excel) y debajo las anteriores (`tr.tp-old`, «sustituida»). Detalle (`TPK.det` = id de `tpub`): selector de versiones `#tpkVs`, datos `#tpkMeta` (publicó, cuándo, motivo, tareos fuente), tarjetas, diferencias, tabla obreros (presentes) × **partidas usadas** con totales (`#tpkMt`), «No vinieron» por motivo (`#tpkAus`), excepciones (`#tpkExc`) y «Excel de esta versión» (`#tpkXv`: el de una versión elegida, aunque esté sustituida).
- **Excel** (`tpxBajar(tipo,a,b,doc?)`, xlsx-js-style con `loadXlsx`; solo valores, formato `0.0#`). Hojas: «Resumen HH» y «Tareo Semana» (o «Tareo Rango») primero si es semana o rango, luego una hoja `dd.mm` por día publicado. Nombre `Tareo_<fecha>_v<n>.xlsx` / `Tareo_semana_<lunes>_al_<domingo>.xlsx` / `Tareo_<a>_al_<b>.xlsx` (con `P().code` delante si existe).
  - **Día** (`tpxWsDia`): fila 1 proyecto + «DM = DESCANSO MÉDICO»; fila 2 FECHA, día y fecha, «Versión publicada vN», «(A) = BONO POR TRABAJO EN ALTURA»; fila 3 grupos (fusionados, verde `92D050`); fila 4 nombres de partida; fila 5 códigos; fila 6 N°, Personal Obrero, CUADRILLA, DNI, Categoría, «hrs». Columnas de partidas: **todas** las de `pcs` de la publicación (más las que tengan horas y no estén), en orden `tCmpCod`; luego HORAS TOTALES, HORAS EXTRAS (con la jornada), BONOS `(A)` y MOTIVO / OBSERVACIÓN (código de falta, «No vino», «Sin tareo: <motivo>» para las excepciones). Obreros por apellido (presentes, ausentes y excepciones), fila TOTAL y pie «Versión publicada vN · publicó X · fecha hora[ · rectificación: motivo]». Paneles fijos en E6.
  - **Resumen HH** (`tpxWsRes`): por obrero y día (dos columnas: HH y HE; día sin publicar = vacío y «(sin publicar)»), TOTAL HH, HN (= total − HE), HE, fila TOTAL y pie con las versiones usadas.
  - **Tareo Semana** (`tpxWsAsis`): N°, DNI, apellidos, nombres, categoría, cuadrilla; ASISTENCIA por día (`A` si trab ≥ jornada del día, `I` si menos, código de falta, `NV` no vino sin motivo, `VA`/`DM`/`EX` para las excepciones), HORAS EXTRAS por día + PARCIAL y HORAS DESCANSO MÉDICO (DM = jornada del día) + PARCIAL; leyenda al pie.
  - Jornada del día: `pub.jor` si la publicación la trae (número), si no `tJorDia({date, cfg: pub.cfg})` (configuración actual si no hay `cfg`).
- **Supuestos sobre la función** (si el servidor cambia la forma, ajustar `tpbCalc`/`tpkDias`): `previa` → `{resumen:{obreros,pres,aus,porMot,sinTareo:[{dni,ape,nom,cap,capN?}],hh,he,alt,porEstado}, bloqueos:[{k,msg,tareo?,dni?}], vigente, abierto}`; `publicar` → `{v,id}`; error con `details.bloqueos` opcional. La pantalla no usa `vigente`/`abierto` de la previa: usa `tpubidx` (en vivo).
- **Pruebas** (`tareo-pub.spec.js`): la función se simula en la prueba (envoltorio de `firebase.functions` con respuestas en `window.__tpResp` y errores en `window.__tpErr`; llamadas en `window.__tpCalls`), así no depende del stub del Firebase falso. Cubre: lista por mes, sustituida, detalle y versión; Excel del día, de una versión y de la semana (hojas, encabezados, fusión de grupos, horas, extra, `(A)`, motivo, pie, Resumen HH y asistencia A/I/DM/VA, horas de DM); bloqueos deshabilitan, excepción con motivo, parámetros de `publicar`, errores, enlace a la revisión; rectificar y rectificación con motivo obligatorio; quién ve las pestañas.

### Integración F3 (pantallas + servidor)

- La publicación guarda además `cfg` (jornada congelada del día, tomada del primer tareo fuente con `cfg`), `jor` (horas de jornada) y `nl` (no laborable): el Excel usa `jor` para la asistencia A/I y las horas de descanso médico, así que un cambio posterior de jornada no altera Excels anteriores.
- La pantalla de Publicación envía la `firma` de la previa; si el servidor responde `ok:false` (bloqueos), los muestra sin publicar.
- El historial del tareo etiqueta `rect` como «Abierto para rectificar».

## Pedido del dueño (06-10-2026): revisión de producción y grilla como el formato

- **Revisión del jefe de producción** (admin y editor con `tpub`) antes de publicar, en la misma grilla de horas: NO coteja firmas; revisa que las horas estén bien asignadas a las partidas y puede editar (mover horas de una partida a otra, agregar o quitar partida del día). Si cambia las **HH totales** de un obrero, aparece un aviso claro (y confirmación al guardar) y queda en el historial. Es opcional (no bloquea publicar); queda marcado `prod: {t, by, byN}` = «Revisado por producción» y la pantalla de Publicación muestra cuántos tareos lo tienen. Su edición NO devuelve el tareo a «Enviado» (las firmas no cambian); el estado se conserva.
- **Celular del capataz:** la grilla de horas va como el formato físico: **obreros en FILAS, partidas en COLUMNAS** (nombres fijos a la izquierda, códigos de partida fijos arriba). «Revisar y enviar» muestra la misma grilla (solo lectura) con totales, en vez de una lista.

## Grilla como el formato — capataz (06-10-2026)

Implementa la parte del celular del pedido anterior. **Reemplaza** en «Implementación de la grilla — capataz» lo dicho del paso 3 (orientación de la grilla, `rowAll`) y del paso 4 (lista `.tc-sum`). `tareo-cap.js`, CSS `/* tareo: capataz */` (bloque «grilla como el formato físico») y pruebas `tareo-cap.spec.js` / `tareo-cap-ux.spec.js`.

- **Paso 3 (`tcStep3`, `#tcGrid`):** `table.tc-g` con **obreros en filas** (`tr[data-dni]`; solo los que vinieron) y **partidas en columnas** (en el orden de `pcs`).
  - Columna fija a la izquierda `th.tc-gn[data-dni]`: N° (`.tc-gnn`, su lugar en la lista completa del paso 1, `tcNum`) + nombre corto identificable (`tcNmT`, tocándolo: nombre completo y DNI). En rojo (`.bad`) si tiene un error de horas; `tcFix` sigue llevando ahí.
  - Encabezado fijo arriba `th.tc-gp[data-pc]`: código + nombre abreviado en 2 líneas (`.tc-gpt[data-tcpc]`, tocándolo sale el nombre completo en un aviso) y **«Toda la jornada»** de esa partida (`data-tca="pcAll"`, antes `rowAll` por fila): a cada uno que vino le suma lo que le falta para su jornada. Bloqueada: «Bloqueada» y borde rojo arriba.
  - Última columna fija a la derecha `td.tc-gt[data-dni]` (total del obrero; `tcTotKS`: verde = jornada, ámbar = «faltan X» / «+2 HE» / «todo extra», rojo = 0 h o > 16). Última fila fija abajo «Total partida» (`td.tc-gs[data-pc]` y `td.tc-gss` con el total del día).
  - Medidas (celdas `box-sizing:border-box`): en vertical nombres 98 px, partidas 70 px, total 58 px → con 390 px caben **3 partidas enteras** y se desplaza de lado con nombres y totales fijos. Echado (`#tcRoot.g3`, pantalla completa como antes): nombres 150, partidas 100, total 76 → 6 partidas en 844 px.
  - `#tcRot` («Gira el celular para ver más partidas») ahora sale con **más de 3 partidas** (antes: más de 2 obreros).
  - Editor de celda (hoja `#tcCell`) sin cambios.
- **Paso 4 (`tcStep4` → `tcGridRO`, `#tcGridR`):** la foto y los avisos arriba; debajo la **misma grilla en solo lectura**: filas `tr.tc-rr[data-dni]`, primero los que vinieron (con «(A)» si altura y, debajo del nombre, «salió hh:mm» o, en un tareo antiguo, su horario `ini–fin`), al final los que no vinieron o sin marcar (`.tc-rr.off`, atenuados, una celda `td.tc-rmot` con «No vino · motivo»); total por obrero con HE, total por partida y total del día con HE.
  - Si se puede editar, cada celda de un presente es `button.tc-rc[data-tca="go3"][data-dni][data-pc]`: lleva al paso 3 con esa celda abierta (`TCS.cell`) y la desplaza a la vista.
  - Es también la vista de solo lectura (enviado/revisado/publicado) y la de un tareo antiguo (`blq`: partidas de sus bloques).
  - Echado (`#tcRoot.g4`, paso 4 o solo lectura) usa todo el ancho (no oculta el encabezado).
- Pruebas: «grilla como el formato (12 obreros × 6 partidas)» en `tareo-cap.spec.js` (≥ 3 partidas a la vista en 390×844 y ≥ 5 echado, nombres/totales fijos, el que no vino al final con su motivo, (A), HE, tocar una celda del paso 4 abre su editor). Capturas: `TC_SHOTS=<carpeta> npx playwright test tareo-cap` (8–11).
