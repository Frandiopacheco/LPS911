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

- `tper/{dni}` — máster de personal: `{dni, ape, nom, cat, cap, ing, ces, act, by, ts}`.
  - `dni`: 8 dígitos (texto; también carné de extranjería hasta 12 caracteres alfanuméricos).
  - `cat`: `'OP'` operario, `'OF'` oficial, `'PE'` peón, `'CA'` capataz.
  - `cap`: id de `members` del capataz (`tcap`) al que pertenece, o `''`.
  - `ing`: fecha de ingreso `YYYY-MM-DD`; `ces`: fecha de cese (liquidado) o `''`.
  - `act`: `true` mientras no tenga cese a la fecha. «Eliminar» archiva (`arch:{t,by,n}`), nunca borra.
- `tpc/{id}` — partidas de control: `{cod, nom, act, ord, by, ts}` (`cod` como `'4.01'`, `nom` como `'Acarreo horizontal'`). Desactivar = `act:false` (siguen en tareos antiguos).
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

## Pendientes

- F1: colección `tareo/{fecha}_{capId}` y pantallas del celular.
- Formato del Excel de costos (lo enviará el dueño) — F3.
- Jornada oficial (asumida arriba, editable en `tcfg`).
