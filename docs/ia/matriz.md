# Matriz de ambientes (`js/matriz.js`, pestaña `mat`)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

## Qué es (fase 1, oct 2026)

Estado **actual** de cada actividad del catálogo en cada ambiente (pendiente / en curso / terminado / no aplica). Sirve para sincerar la obra cada semana y programar el lookahead sobre lo que de verdad falta: el lookahead puede tener filas borradas, terminadas mal marcadas, etc.; la matriz es la referencia de «cómo está la obra hoy».

- **Fase 1 (decidido con el dueño):** editan administrador y editores (`mxEd()` = `canWrite && !PM() && !verRO()`); el resto la ve. Estados: `p` Pendiente, `c` En curso, `t` Terminado, `n` No aplica (sin «liberado por Calidad»).
- **Fase 2 (hecho):** editar catálogo y tipos en la app (`js/matriz-cat.js`, ver abajo).
- **Pendiente para fases siguientes:** el SC propone y el ingeniero valida; ligar el lookahead al catálogo (lista de actividades en vez de texto libre) y avisos al programar; gráficos de avance por SC y ventana (semana / 3 / 6 semanas).

## Datos (colecciones propias; **no** escribe `acts`, `ambientes` ni `weeks`)

- `mcat/{id}`: catálogo `{ref, name, sc, esp, cl:'t'|'e'|'d', al:[alias], ord, by, t, arch?}`. `cl`: Típica (se repite por ambiente), Específica (entregable de un solo ambiente; oculta con el filtro «Típicas»), Por desglosar (nombre genérico que el SC debe dividir). `al` = nombres del lookahead normalizados con `mnk()` que corresponden a esta actividad.
- `mtipo/{id}`: tipos de ambiente `{name, acts:[catId], order}`.
- `mamb/{ambId}`: `{tipo, c:{catId:estado}, by, n, t}`. Se escribe con `set(...,{merge:true})` por ambiente (dos personas pueden marcar celdas distintas a la vez). `c` solo guarda lo **confirmado** por una persona.
- `mver/{id}`: foto semanal `{t, d, w, by, n, a:{ambId:'catId:estado,…'}}` (todas las celdas, también las sin validar). Se crea y no se cambia.
- Reglas: leen todos los de LPS (`lpsMember`); crean/cambian `canEdit()`; `mamb` y `mver` exigen `by == mid()`; nada se borra. Pruebas en `tests/rules/firestore.test.mjs`.
- Se cargan **al abrir la pestaña** (`ensureMx`), no en el arranque. `mver`: solo las 8 últimas.
- Están en el respaldo (`BK_DATA`).

## Cómo se arma cada celda (`mxCells`, caché por `MX.v|DV|DONEV`)

Un ambiente tiene una actividad si viene de: su **tipo** (`mtipo.acts`), el **lookahead** (fila de `acts` cuyo nombre normalizado está en algún `al`: `mxAli()`), o se agregó **a mano** (clave en `mamb.c`). Estado: el de `mamb.c` si existe; si no, lo **propone** el sistema (`sug`, borde punteado): terminado si todas sus filas del lookahead están en `DONE`, si no pendiente. «Validar» guarda lo propuesto tal cual.

- `mnk(s)`: sin tildes, minúsculas, solo letras y números. El archivo de carga inicial usa la misma regla.
- Nombres del lookahead que no están en ningún `al` salen en el aviso «N nombres… no están en el catálogo» → `mxMapDlg` agrega el alias (`arrayUnion`) a la actividad elegida. No toca el lookahead.

## Interfaz

- Filas por piso (selector principal `U.piso`) → sector → ambiente; columnas agrupadas por SC (`conOf(sc).color`). Filtro de **varios SC** con chips (`[data-mxsc]`, `U.mxSc` en `saveUI`; propio de la matriz, no cambia `U.sc` del lookahead): con SC elegidos solo salen sus columnas y los ambientes donde tienen algo, «Típicas / Todas» (`U.mxAll`, en `saveUI`), «Comparar con» una foto (`MX.cmp`: punto azul en las celdas que cambiaron).
- Selección (`MX.sel`, claves `ambId|catId`): arrastrar, Shift+clic, Ctrl+clic, clic en encabezado de columna o en el ambiente (toma las celdas que aplican). Barra fija `#mxsb` y teclas 1/2/3/0/Enter/Esc. Un clic sin arrastrar abre la ficha (`mxInfo`, `openPop`) con el origen, las filas del lookahead y (si edita) los estados. Mientras se arrastra, `DRAGGING=true` (no se redibuja).
- Cambios en bloque con «Deshacer» en el aviso (`mxWrite` guarda los valores anteriores; lo que no existía se borra con `FieldValue.delete()`).
- Tipo del ambiente: `select[data-mxtipo]` en cada fila (editores).
- Carga inicial: «⬆ Cargar catálogo» (solo administrador) con un archivo `formato:'lps911-matriz-v1'` `{mcat, mtipo, mamb:{ambId:{tipo}}}`. **Solo crea lo que no existe** (no reemplaza ni borra; omite ambientes que no están en la obra). El primero se armó con el Excel revisado por el dueño (respaldo 07/10/2026).
- Rendimiento medido con la obra real: un piso (≈55 ambientes, 66 columnas) ~0,16 s; todos los pisos ~0,65 s.
- Prueba: `tests/e2e/matriz.spec.js`.

## Catálogo y Tipos de ambiente (`js/matriz-cat.js`, fase 2)

Vistas internas de la pestaña (`U.mxV` = `mat` | `cat` | `tipo`, en `saveUI`; botones `[data-mxv]`, `mxViewSeg()`). Editan `mxEd()`; el resto las ve.

- **Catálogo** (`renderMxCat`): tabla con filtros (chips de SC compartidos con la matriz `U.mxSc`, búsqueda por nombre o alias, clase, activas/archivadas). Columnas «Amb.» (dónde aparece) y «Marcadas» (celdas con estado confirmado) (`mxCatUse`). Cambiar nombre / SC / clase / especialidad (`mxCatSet`, con Deshacer) **no toca** los estados: van por id. Nombre repetido: avisa y sugiere fusionar.
- **Especialidad = lista cerrada** (`mxEspList`: las del catálogo y de los subcontratistas, sin repetir por `mnk`) + «＋ Nueva especialidad…» (`mxEspPick`: si ya existe con otra escritura usa la existente). En la tabla, al crear (`mxCatNew`), al agregar desde el lookahead y al aprobar propuestas; por defecto la más usada del SC (`mxEspOf`).
- **Nueva actividad** (`mxCatNew`): id `k<NOW base36>`, alias con su propio nombre; no deja crear un nombre ya existente.
- **Archivar** (`arch:{t,by,n}`): deja de salir en la matriz; sus estados quedan en `mamb.c` y vuelven al restaurar.
- **Fusionar A → B** (`mxMerge`, en lotes): en cada `mamb` con estado de A, lo pasa a B si B no tenía (si tenía, se conserva el de B) y borra el de A; en los tipos reemplaza A por B; agrega a B los alias de A (y el nombre de A). A queda archivada con `arch.fus=B` y todo lo necesario para deshacer: `moved` {amb:estado}, `added` [amb donde se escribió B], `tp` {tipo: ¿ya tenía B?}, `al` [alias agregados a B].
- **Restaurar** (`mxCatRestore`): quita `arch`; si fue fusión, devuelve los estados de A, borra de B solo lo que la fusión escribió y nadie cambió después, vuelve a poner A en los tipos y quita de B los alias que se le pasaron. También es el «Deshacer» del aviso.
- **Nombres del lookahead** (`mxAliasPop`): ver y quitar alias (con Deshacer).
- **Tipos** (`renderMxTipo`): tarjetas con nombre editable, actividades como chips (quitar ×, agregar con la lista), «+ Tipo», archivar/restaurar tipo (un tipo archivado ya no da actividades: `mxCells` lo ignora). Lo marcado en cada ambiente se conserva siempre.
- Pruebas: `tests/e2e/matriz-cat.spec.js`.

## Catálogo ↔ Lookahead (`js/matriz-look.js`, oct 2026)

Decidido con el dueño: un solo nombre por actividad en todo el lookahead; el vínculo sigue siendo **por nombre** (alias `al` + nombre del catálogo, `mxAli`), no se agrega ningún campo a `acts`.

- **El catálogo se carga también en el Lookahead** (`ensureMcat()` en `renderLook`; el resto de la matriz solo al abrir su pestaña).
- **Unificar nombres** (solo administrador, Catálogo › «Unificar nombres del lookahead…», `mxUnifyDlg`): por los pisos a la vista (`U.piso`), agrupa filas cuyo nombre corresponde a una actividad pero está escrito distinto («REDES EMPOTRADAS» → «Redes empotradas»). Vista previa con casillas por variante; aplica **un solo `apply`** que cambia solo `name` (Deshacer e historial `lhlog`). Opcional: también las plantillas de ambiente (`meta/project.templates`). **Se saltan** las filas con un elemento en `lhprop` (borrador o enviado; se leen en el momento con `get()`). No toca `weeks` (semanas congeladas), `daily`, `dplan`, `cliver`: conservan el nombre con que se comprometieron.
- **Exigir catálogo** (`P().catReq`, solo administrador, Catálogo › «Exigir catálogo»; `mxCatReq()`): en `commitField` del lookahead, `mxNameGate` convierte el nombre al del catálogo (variantes por `mnk`) o lo bloquea y abre `mxNoCatDlg`: parecidas (`mxSimilar`) y **agregar al catálogo y usarla**. La lista de sugerencias (`actSuggest` → `mxSuggest`) pasa a ser el catálogo, primero el SC de la fila. Las filas antiguas con nombre fuera del catálogo siguen igual hasta que se edite su nombre.
- **El SC agrega directo (decidido con el dueño, oct 2026: sin esperar aprobación, para no frenar su propuesta de programación).** Crea `mcat` con `rev:{by,n,t,amb,tipo}` (por revisar); solo elige SC de su partida. Por defecto la actividad queda **solo en ese ambiente** (por el lookahead); la casilla «Agregar a todos los ambientes del tipo…» viene **desmarcada** (el ingeniero la aplica directo; el SC deja el pedido en `rev.tipo`). Reglas: el SC crea `mcat` solo con `rev` (map, `rev.by == mid`), de su partida, sin `arch`/`revOk`; no edita.
- **Revisión del ingeniero:** tarjeta en Hoy («Actividades nuevas en el catálogo», `mxRevList`; su botón abre Matriz › Catálogo), aviso en la Matriz y tarjeta «Agregadas por los subcontratistas» en Catálogo: «+ Tipo «X»» (si el SC lo pidió), «Fusionar…», «✓ Revisada» (borra `rev`, guarda `revOk`). En la tabla salen con «Nueva · por revisar».
- **El lookahead sigue al catálogo:** renombrar una actividad (`mxCatRename`) agrega el nombre anterior a sus alias y cambia el nombre de **todas sus filas del lookahead** (todas los pisos; `mxRowsOf` por nombre/alias, salta las filas con propuesta del SC pendiente), en un `apply` (historial); «Deshacer» del aviso devuelve catálogo y filas (`mxUnrename`, solo las que nadie cambió). Fusionar A→B también renombra las filas de A a B y guarda `arch.ren` para que «Restaurar» las devuelva.
- **Propuestas antiguas** `mcatp` (antes de que el SC agregara directo): se siguen mostrando y resolviendo (Aprobar / Rechazar); ya no se crean nuevas desde la app.
- Con el respaldo del 07/10: 654 filas cambiarían de nombre (160 variantes), 1352 ya usan el nombre del catálogo, 8 sin catálogo.
- Prueba: `tests/e2e/matriz-look.spec.js`.

## Alertas Matriz ↔ Lookahead (oct 2026)

- `mamb` se carga también en el Lookahead (`ensureMamb()` en `renderLook`; su snapshot sube `DV` y redibuja).
- En cada celda (`mxCells`): `fut` = filas del lookahead con días ≥ hoy; `warn` = estado **confirmado** «Terminado» o «No aplica» y `fut` no vacío; `sp` = pendiente / en curso sin días ≥ hoy («sin programar»).
- **Matriz:** tiles «Terminado y aún programado» y «Pendiente sin programar»; filtro «Ver: Todo / ⚠ Alertas / Sin programar» (`U.mxF`, en `saveUI`; solo ambientes con alguna y atenúa el resto); celdas `warn` con borde rojo. En la ficha: «Quitar del lookahead los días desde mañana…» (`mxUnprogram`: hoy y lo pasado no se tocan; `apply` → Deshacer, historial y control de días cerrados).
- **Lookahead:** marca ⚠ en la fila (`mxRowBadge`, `mxRowWarn`; clic → Matriz con «Alertas» y el piso de la fila) y aviso al agregar un día ≥ hoy a una fila en alerta (`mxApplyWarn`, llamado desde `apply` en base.js), con Deshacer. No bloquea.

## Cambiar el catálogo después de cargarlo

- La carga inicial **solo crea**: volver a cargar el mismo archivo completa lo que falte (p. ej. el tipo de ambientes que no existían la primera vez) y no toca lo demás.
- Los estados de `mamb.c` están ligados al **id** de la actividad (`k015`…). Renombrar, cambiar SC o clase no los afecta. Fusionar o quitar actividades sí: sus estados quedarían huérfanos. Por eso los cambios de catálogo van **en la app** (Catálogo: fusionar traslada los estados), no con un archivo nuevo. Volver a cargar el archivo nunca borra ni cambia estados ya marcados.
