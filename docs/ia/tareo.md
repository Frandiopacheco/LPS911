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

## Pendientes

- F1: colección `tareo/{fecha}_{capId}` y pantallas del celular.
- Formato del Excel de costos (lo enviará el dueño) — F3.
- Jornada oficial (asumida arriba, editable en `tcfg`).
