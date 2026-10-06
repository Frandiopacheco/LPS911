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
| `tcap` | Capataz (tareo) | solo Tareo, celular | Distinto de `capataz` (que es de un SC). Puede entrar con correo o con enlace de invitación anónimo (`u_<uid>`) como el capataz de SC. |
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
- **Personal de oficina** (`tasis`, `admin`, editor con `tpub`) en `tdia` (`renderTDia`, PC y celular): selector de fecha; lista de capataces con tareo (o que tienen obreros asignados y no han enviado): estado (sin empezar / borrador / enviado / reabierto), obreros, faltas, HH, HE, observaciones de `tValida`. Abrir uno: detalle de solo lectura (obreros × partidas, fotos ampliables) y, para `tasis`/`admin`, «Reabrir al capataz» (motivo obligatorio con `uiAsk` input). Bandeja completa, corrección directa y cotejo de firmas son F2.
- **Equipo** (config-equipo.js): crear enlace/QR de invitación para capataces del tareo (como el de capataces de SC, pero con `role:'tcap'`); `capJoin` (base.js) registra `role:'tcap'` sin `scs` cuando la invitación es `tcap`.

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
  - `tValida` `k`: `vacio`, `pc`, `hora`, `quien` (bloque sin obreros), `falto` (obrero marcado falta dentro de un bloque), `mot`, `sinh`, `cruce` (uno por obrero), `foto`.
- `renderTDia` (oficina): globales con prefijo `to`/`TO_` (`TD` estado, `toSub`/`toUnsub`, `toList`, `toStats`, `toDetalle`, `toReabrir`, `TO_MOT` motivos de falta, `TO_ST` estados). CSS al final de `app.css` con prefijo `.to-`.
  - Suscripción temporal `fcol('tareo').where('date','==',fecha)` (`TD.sub`): cambia al cambiar de fecha; al salir de la pestaña se suelta en la siguiente llegada de datos (no hay gancho de salida de vista) y al cerrar sesión (`unsubs`).
  - Lista: tareos del día + capataces `tcap` con obreros activos asignados sin tareo («Sin empezar»). Orden: enviado, reabierto, borrador, sin empezar, revisado, publicado. «Enviados» del resumen = `env`/`rev`/`pub`.
  - Fecha: flechas y selector; no pasa de hoy. `tcos` ve el aviso de F3 (no se suscribe).
  - Reabrir (solo `admin`/`tasis`, solo `st:'env'`): `update({st:'reab', reab:{t,by,mot}, hist: arrayUnion({t,by,mot,a:'reab'}), by, ts})`.
  - Fotos: lee `tfot/{id}` al abrir el detalle (caché `TD.fotos`), miniatura y ampliar (`.to-zoom`).

## Pendientes

- Formato del Excel de costos (lo enviará el dueño) — F3.
- Jornada oficial (asumida arriba, editable en `tcfg`).
