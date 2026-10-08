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

## Recorrido (`js/matriz-rec.js`, oct 2026): llenar la matriz en campo con la tablet

Vista `U.mxV='rec'` («Recorrido»). Decidido con el dueño: entrar por **lista**, actividades en **secuencia de obra**, confirmar marca el ambiente **revisado**.
- **Lista** (`renderMxRec`): pisos a la vista → sector → tarjetas de ambiente (tipo, % terminado, por hacer, sin validar, «✓ Revisado …» esta semana). Barra «N de M revisados esta semana» (`mxWk0` = lunes de la semana) y «Solo los que faltan» (`MXR.only`).
- **Ambiente** (`renderMxRecAmb`): checklist de sus celdas con 4 botones grandes (≥ 44 px) por actividad; lo terminado / no aplica va plegado al final. Cada toque guarda al instante (`mxWrite`, con Deshacer). Info por fila: terminada en Campo, próximo día programado, «propuesta del sistema».
- **Secuencia de obra** (`mxSeq`): mediana del primer día de las filas del lookahead de cada actividad (toda la obra); sin fechas, al final por `ord`.
- **¿Falta algo?** (`mxRecSug`): hasta 5 actividades que tiene ≥ 50 % de los ambientes del mismo tipo (sin tipo: mismo nombre sin números) y este no; «+ Agregar» la pone pendiente.
- **Confirmar y seguir**: guarda lo propuesto tal cual (`c`) y `mamb.rv={d,t,by,n}` y pasa al siguiente ambiente de la lista. «Siguiente sin confirmar» no guarda.
- Prueba: `tests/e2e/matriz-rec.spec.js`.

## Los SC llenan su partida (`js/matriz-sc.js`, oct 2026)

Decidido con el dueño: el SC cambia **directo** (sin propuesta) el estado de las actividades de **su partida** en cualquier ambiente —también lo que el ingeniero ya confirmó, que queda destacado— o las agrega a un ambiente. Cualquier editor revisa.
- `mxScCan(cat)`: SC, actividad de su partida (`myScsI()`), no archivada. En la Matriz (ficha de la celda: botones `data-do="scs"`; las de otras partidas solo se ven) y en el Recorrido (sus filas habilitadas y sus sugerencias; sin «Confirmar», no marca `rv`).
- `mxScSet`: un lote con `mamb` (una celda, `k` = actividad, `m.<cat>={by,n,t,sc:true}`) y la constancia `mlog/{id}` `{amb, cat, sc, from, sugFrom, to, conf, confN, st:'pend', by, n, t}` (`conf` = antes la había confirmado un ingeniero). «Deshacer» del aviso: vuelve la celda y marca la constancia `st:'undo'`.
- **Metadatos por celda** `mamb.m.<cat>`: quién la cambió por última vez (también los ingenieros: `mxMeta` en `mxWrite` y en el Recorrido). La ficha lo muestra (`mxWhoHtml`).
- **Revisión** (editores; `MX.log` = `mlog` con `st=='pend'`): tarjeta en Hoy «Cambios de los SC en la matriz» (roja si alguno contradice lo confirmado), aviso en la Matriz y punto morado en la celda (`.scp`). `mxLogDlg`: por SC, «✓ Visto» (`st:'ok'`), «✓ Todo visto» y «↶ Revertir» (`mxLogRevert`: vuelve la celda a `from`; si cambió después, pregunta).
- Reglas: el SC escribe `mamb` solo con `k` de una actividad de su partida (`mcat/k.sc in scsOf()`), una celda por vez (`c` y `m` cambian solo en `k`), valores válidos, sin tocar `tipo`/`rv`; `mlog` lo crea quien cambia (`st:'pend'`), lo actualiza un editor, el SC solo a `undo` la suya; no se borra. Pruebas en `tests/rules` y `tests/e2e/matriz-sc.spec.js`.

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

## Alertas en el Lookahead (oct 2026; decidido con el dueño: la Matriz queda solo para registrar, sin recuadros ni filtros de alertas)

- El Lookahead carga catálogo, tipos y estados (`ensureMx()` en `renderLook`; las fotos `mver` solo en la Matriz con `ensureMver`). `mamb`/`mtipo` redibujan también el Lookahead.
- En cada celda (`mxCells`): `fut` = filas del lookahead con días ≥ hoy; `warn` = **confirmada** «Terminado» o «No aplica» con `fut`; `sp` = **Pendiente** (confirmada o propuesta por el tipo) sin días ≥ hoy. «En curso» no avisa.
- **Terminada y aún programada:** ⚠ en la fila (`mxRowBadge`/`mxRowWarn`); clic → ficha con «Quitar los días desde mañana…» (`mxUnprogram`: hoy y lo pasado no se tocan; `apply` con Deshacer, historial y días cerrados) y «Ver en la Matriz». Al agregar un día ≥ hoy a esa fila, aviso con Deshacer (`mxApplyWarn`, desde `apply`). No bloquea.
- **«Ver en la Matriz»** (`mxGoCell`): abre la Matriz en el piso del ambiente (quita el filtro de SC o «Típicas» si escondían la columna), centra la celda dentro de `#mxbox` y resalta fila, columna y celda 3 s (`MX.focus`, `mxFocusPaint` después de cada dibujo; clases `mxhl`/`mxhlc`/`mxhlx`).
- **Pendientes sin programar:** píldora en la barra del Lookahead (`#fmxp`, `mxPendPill`) con los pisos a la vista y los SC del filtro (el SC: los suyos). Abre la lista por ambiente (`mxPendDlg`) y permite **agregarlas al lookahead sin días** (un `apply`; el SC en modo propuesta las propone).
- Prueba: `tests/e2e/matriz-alertas.spec.js`.

## Cambiar el catálogo después de cargarlo

- La carga inicial **solo crea**: volver a cargar el mismo archivo completa lo que falte (p. ej. el tipo de ambientes que no existían la primera vez) y no toca lo demás.
- Los estados de `mamb.c` están ligados al **id** de la actividad (`k015`…). Renombrar, cambiar SC o clase no los afecta. Fusionar o quitar actividades sí: sus estados quedarían huérfanos. Por eso los cambios de catálogo van **en la app** (Catálogo: fusionar traslada los estados), no con un archivo nuevo. Volver a cargar el archivo nunca borra ni cambia estados ya marcados.

## Terminadas en Campo ↔ Matriz (oct 2026, decidido con el dueño)

- «Terminada» en Campo / plan diario pide confirmar (`askDone`, base.js): «¿está terminada en todo el ambiente?».
- Lookahead: una fila en `DONE` se **oculta** solo si la Matriz la tiene **confirmada** Terminado (`mxDoneSt(x)==='ok'`, matriz-look.js); botón `#fdone` «N terminadas ocultas · Ver» (`U.showDone`). Si no está confirmada: sigue visible con «✓?» (`.mxbadge.mxdn`, `data-mxd`): confirmar Terminado en la Matriz (`mxWrite`, con Deshacer) o reabrir (`reopenDone`).
- Matriz: celda con punto (`td.mc.dsc`, `o.dsc` en `mxCells`) cuando todas sus filas están terminadas en Campo pero lo confirmado no es Terminado; la ficha (`mxInfo`) ofrece reabrir en el Lookahead.
## Consulta / edición y «Otra actividad» (oct 2026)
- La grilla abre en **consulta** (`MX.edit` falso, por sesión): se desplaza con el dedo y tocar una celda abre su ficha sin botones (`onclick`, no `pointerdown`). **✎ Editar** (`#mxedit`, `mxCanEd()`: editor/admin o SC) habilita seleccionar y marcar (`mxEdG()`); en edición `td.mc` tiene `touch-action:none` para arrastrar y seleccionar. Los avisos (cambios de SC, nombres sin catálogo) se ven sin entrar a editar (`mxEd()`).
- Recorrido: «¿Falta algo?» siempre visible; hasta 5 sugerencias de ambientes parecidos (≥ 25 % los tiene) y **+ Otra actividad** (`mxRecPick`) para buscar en todo el catálogo lo que el ambiente no tiene (SC: solo su partida). Al final del buscador, «Crear … en el catálogo» (`mxRecNew`): crea la actividad (mismas reglas que desde el lookahead: el SC queda `rev`; el ingeniero puede sumarla al tipo) y la agrega al ambiente como pendiente; si el nombre ya existe, solo la agrega.

## Vista de escritorio (oct 2026)

- Cabecera compacta: indicadores en una línea (`.mxstat`), «Cómo se usa» en el botón ⓘ (`#mxhelp`, texto en `MX.helpH`), SC en el menú «Subcontratistas ▾» (`#mxscdd` → `mxScMenu`, botones `data-mxsk`: clic = solo ese, Ctrl+clic = sumar/quitar).
- Tabla: alto de la pantalla (`mxFit`, también al cambiar el tamaño de la ventana), columnas fijas Ambiente/Tipo/% (vars `--aw/--tw/--pw`), nombre del SC del grupo y del sector siguen a la vista al desplazar.
- Tamaño de celda − / + (`U.mxZ` 0/1/2 → clase `mxz0..2`, vars `--cw/--nh`). Clic en el nombre del SC del grupo (`th[data-mxgo]`) salta a sus columnas (`mxGoCol`).

- **Orden de columnas** (`U.mxOrd`, select `#mxord`; por defecto «Por programación»): en `mxCols`, primero los SC con días programados en los ambientes a la vista de hoy a 3 semanas (más días primero), luego los que tienen Pendiente/En curso sin programar, al final los demás (encabezado `.mxdim`); dentro de cada SC, primero lo programado (`.mxpg`, punto con su color). `MX.ci` guarda días y nivel por actividad. «Alfabético» = orden anterior.

## El SC ve solo su partida (oct 2026, decidido con el dueño)
- `mxSel()` devuelve `myScsI()` para el SC: Matriz (columnas y ambientes donde tiene algo), Catálogo y Recorrido (`mxMine`) muestran solo su partida; sin selector de SC ni «Tipos de ambiente».
- Catálogo: el SC tiene «+ Actividad» (`mxCatNew`), solo para su partida, con `rev` (queda «Nueva · por revisar» para el ingeniero; mismas reglas que desde el lookahead).

## Fotos semanales: historial y restablecer (oct 2026)
- Formato `mver.a[amb] = 'cat:estado[?],…'` (`?` = sin validar) con `v:2`; las anteriores (sin `v`) no distinguen lo sin validar.
- Al guardar (`mxFoto`) se agrega al instante a `MX.ver`, se compara con ella y se abre el historial (`mxFotoHist`). Botón «🕘 Fotos (n)» (`#mxfhist`): Comparar (todos) y **Restablecer** (solo administrador, `mxFotoRestore`): primero guarda una foto `nota:'antes de restablecer'`, luego deja las celdas confirmadas como en la foto (lo sin validar de la foto deja de estar confirmado) con `mxWrite` y Deshacer.

## Exportar (oct 2026)
- «⬇ Excel» (`#mxxls`, `mxExport`): lo que está a la vista (`MX.view`: piso, filtros, orden). Hojas **Matriz** (encabezado por SC con su color, nombres en vertical, símbolos ✓ ◐ ○ – con color; sin validar en cursiva gris; % por ambiente y por columna; paneles fijos), **Lista** (una fila por celda, con autofiltro) y **Leyenda**. Prueba: `tests/e2e/matriz-excel.spec.js`.
