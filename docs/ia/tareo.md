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
  - `envAt`, `envBy`, `reab: {t, by, mot}`, `hist: [{t, by, a, mot}]` (`a`: `'env'|'reab'|'cor'|…`), `by`, `ts`.
- **Cálculo** (en `tareo.js`, funciones puras globales):
  - `tBlqH(fecha, ini, fin)` → horas del bloque descontando el refrigerio si lo cruza (misma regla que `tHoras`, sin extra).
  - `tCalc(doc)` → doc con `rows` recalculados: por obrero presente, `h[pc]` = suma de sus bloques; `ini`/`fin` = mín/máx; `trab`/`ext` con `tHoras(fecha, ini, fin)` ajustado a la suma real de horas (si hay huecos entre bloques, `trab` = suma de bloques y `ext` = max(0, trab − jornada del día)).
  - `tValida(doc)` → `[{dni|null, k, msg}]`: presente sin horas; ausente sin motivo; dos bloques del mismo obrero que se cruzan; bloque con fin ≤ ini o fuera de 05:00–23:59; sin foto (`k:'foto'`); sin obreros. `tValida(doc).length===0` es requisito para enviar.
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
- `tHoras`: descuenta el refrigerio (`ref` min) si el rango cruza `refIni`; **sábado** (`ref` 0) si se queda pasada la jornada se descuenta el refrigerio normal de la semana (60 min); domingo/feriado todo es extra. **Por confirmar con el dueño.**
- Importar el máster nunca toca `cap`, nunca archiva; solo informa a quienes no están en el archivo. Una categoría editada a mano se respeta salvo que cambie el puesto.
- Ids de partidas: `p10_05` (`tPcId`).

## Decisiones tomadas al implementar F1 (oficina y cálculo)

- `tBlqH`, `tCalc`, `tValida` están en `tareo.js` (puros; `tareo-cap.js` los usa, no los redefine). Horas redondeadas a 2 decimales (`tR2`), sin redondeo a media hora.
  - Un bloque cuenta solo si tiene partida y horario válido (05:00–23:59, salida > entrada); si no, `tValida` lo marca.
  - `tCalc`: `ext` = max(0, trab − `tJorH` del día); domingo/feriado (`tNoLab`) todo es extra. Ausentes: `h:{}`, `ini/fin:''`, `trab/ext:0`.
  - `tValida` `k`: `vacio`, `pc`, `hora`, `quien` (bloque sin obreros), `bloq` (partida bloqueada por costos), `marca` (sin marcar si vino), `mot`, `sinh`, `cruce` (uno por obrero), `foto`.
- `renderTDia` (oficina): globales con prefijo `to`/`TO_` (`TD` estado, `toSub`/`toUnsub`, `toList`, `toStats`, `toDetalle`, `toReabrir`, `TO_MOT` motivos de falta, `TO_ST` estados). CSS al final de `app.css` con prefijo `.to-`.
  - Suscripción temporal `fcol('tareo').where('date','==',fecha)` (`TD.sub`): cambia al cambiar de fecha; al salir de la pestaña se suelta en la siguiente llegada de datos (no hay gancho de salida de vista) y al cerrar sesión (`unsubs`).
  - Lista: tareos del día + capataces `tcap` con obreros activos asignados sin tareo («Sin empezar»). Orden: enviado, reabierto, borrador, sin empezar, revisado, publicado. «Enviados» del resumen = `env`/`rev`/`pub`.
  - Fecha: flechas y selector; no pasa de hoy. `tcos` ve el aviso de F3 (no se suscribe).
  - Reabrir (solo `admin`/`tasis`, solo `st:'env'`): `update({st:'reab', reab:{t,by,mot}, hist: arrayUnion({t,by,mot,a:'reab'}), by, ts})`.
  - Fotos: lee `tfot/{id}` al abrir el detalle (caché `TD.fotos`), miniatura y ampliar (`.to-zoom`).

## Mejoras de oficina (oct 2026)

- **Personal:** columna N° (posición en la lista filtrada) y contador `#tperN` «Mostrando N de M · K activos» (N y K respetan los filtros; M = fichas no archivadas). Para `admin`/`tasis`, si existe la global `tCapCuenta(dni)` (en `tareo-cuentas.js`), cada fila lleva «Hacer capataz» (`[data-tcta]`); si la ficha tiene `tper.cta` (correo de su cuenta de capataz) muestra el chip «Capataz» y la acción «Cuenta de capataz…» (misma función). Los capataces del filtro y de «Asignar capataz» siguen siendo los `members` con rol `tcap` (`tCaps()`).
- **Partidas de control:** una sola tabla (`.tpc-tbl`, `table-layout:fixed` con `colgroup`) para que las columnas queden alineadas entre grupos; antes había una tabla por grupo y cada una medía distinto. Fila de encabezado por grupo (`tr.tpc-gh[data-tpg]`: número, nombre, n.º de partidas y HH ppto). Columnas: código, descripción, und, metrado, HH ppto, HH/und (`tRatio` = hhp/met, como la columna «Ratio» del Excel), cuenta UA, estado, acciones. Orden: `tCmpCod` compara por partes enteras (grupos 1, 2 … 13; 10.02 antes de 10.10). Buscador y filtro Todas/Activas/Bloqueadas/Inactivas (`TPU`). En celular cada partida es un bloque compacto.
- **Bloquear para carga** (`tpc.bloq: true|false`, `bloqBy` correo en minúsculas, `bloqAt` ms): lo hacen `tcos`, `tasis` y `admin` (`tBloqOk()`, `tPcBloq`). Bloqueada: candado y chip «BLOQUEADA»; no aparece en el celular del capataz (`tareo-cap.js`). `tValida`: `k:'bloq'` «La partida X está bloqueada por costos.» (una vez por partida). Reglas: `tcos` actualiza `tpc` solo con `affectedKeys().hasOnly(['bloq','bloqBy','bloqAt'])`, `bloq` booleano y `bloqBy == email()`; no crea ni borra.
- **tValida / tCalc:** ya no existe el error `falto`: un obrero que no vino puede seguir en sus bloques (tCalc le da 0 h y conserva `blq`, así recupera sus horas si vuelve a «vino»). Nuevo `k:'marca'` «Falta marcar si vino: APELLIDO» si `as` no es `true` ni `false`; `tCalc` trata `as` null/undefined como no presente sin horas.
- **Revisión (corregir):** desmarcar «vino» ya no saca al obrero de los bloques (antes, al volver a marcarlo, perdía sus horas). `trAs` conserva `as` null («Sin marcar»). «Todos/Ninguno» de un bloque no toca a los ausentes que siguen en él.

## Pendientes

- Formato del Excel de costos (lo enviará el dueño) — F3.
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
