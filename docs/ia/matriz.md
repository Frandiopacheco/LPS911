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

- `mnk(s)`: sin tildes, minúsculas, solo letras y números. El archivo de carga inicial usa la misma regla. Tiene memoria (`MNK`, se vacía al pasar de 5000 nombres; auditoría de código 08/10, L1).
- Selección (`mxPaintSel`, M8): solo cambia la clase `sl` de las celdas que entran o salen de la selección. `mxSelIx(tabla)` arma una vez por tabla dibujada el índice `amb|cat → td` y lo pintado (`MX.ix`); al redibujar la tabla es otra y se rehace. La barra de abajo solo actualiza el número si ya está.
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
- **Especialidad (oct 2026, decidido con el dueño): ya no se edita en el catálogo.** La columna muestra la del subcontratista (`espOfSc(c.sc)`, lista única de Configuración, ver `datos.md` › Especialidades). `mcat.esp` antiguo se conserva en la base pero no se usa (solo para sugerir la del SC al registrar y avisar si un SC tenía varias).
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
- **¿Falta algo?** (`mxRecSug`; plegable `<details id="mxrsugd">`, cerrado por defecto, se recuerda en `U.mxRecSug`): hasta 5 actividades que tiene ≥ 25 % de los ambientes del mismo tipo (sin tipo: mismo nombre sin números) y este no; «+ Agregar» la pone pendiente.
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
- En cada celda (`mxCells`): `fut` = filas del lookahead con días ≥ hoy; `warn` = **confirmada** «Terminado» o «No aplica» con días **posteriores a hoy** (`fwd`; hoy no cuenta: ya no se reprograma y suele ser el día en que se terminó, oct 2026); `sp` = **Pendiente** (confirmada o propuesta por el tipo) sin días ≥ hoy. «En curso» no avisa.
- **Terminada y aún programada:** ⚠ en la fila (`mxRowBadge`/`mxRowWarn`); clic → ficha con «Quitar los días desde mañana…» (`mxUnprogram`: hoy y lo pasado no se tocan; `apply` con Deshacer, historial y días cerrados) y «Ver en la Matriz». Al agregar un día ≥ hoy a esa fila, aviso con Deshacer (`mxApplyWarn`, desde `apply`). No bloquea.
- **«Ver en la Matriz»** (`mxGoCell`): abre la Matriz en el piso del ambiente (quita el filtro de SC o «Típicas» si escondían la columna), centra la celda dentro de `#mxbox` y resalta fila, columna y celda 3 s (`MX.focus`, `mxFocusPaint` después de cada dibujo; clases `mxhl`/`mxhlc`/`mxhlx`).
- **Faltan programar dentro del Lookahead (oct 2026; reemplaza la lista aparte `mxPendDlg`):** lo de `mxPendList` (pendiente en la Matriz sin días ≥ hoy) sale como **fila fantasma** en su ambiente (`lkGhosts`, `lkGhostRow`, `tr.gh[data-gh="amb|cat"]`), después de sus filas reales y dentro del `rowspan` del ambiente. Se ve **solo** con el interruptor «Faltan programar N» encendido (`#fmxp`, `U.lkGh`, en `saveUI`, por persona y navegador; apagado por defecto, decidido con el dueño 10/10: tampoco salen los chips). Encendido, cada ambiente con faltantes lleva el chip «−N por programar» para plegar solo ese ambiente (`[data-ghamb]`, `GHT` = ambientes plegados). Solo con filtros de piso, sector y SC (búsqueda, semana, día, etc. las ocultan); el SC ve solo su partida. **Tocar un día** (desde hoy) la programa (`lkGhostDay`): si la actividad ya tenía fila (oculta por vencida) le suma el día; si no, crea la fila con ese día y el SC del catálogo (`lkGhostSc`; el SC en modo propuesta, el suyo). ⋮ (`lkGhostMenu`): «Agregar sin días», «No aplica en este ambiente» (editores, `mxWrite` con Deshacer) y «Ver en la Matriz». Las fantasmas no se guardan ni cuentan en nada. **Auditoría 10/10 (corregido):** `lkGhosts` con caché (`LKGHC`, clave MX.v|DV|DONEV|hoy|pisos|U.sc|rol); `lkGhostRows` = filas usables (sin `_del`, del SC en modo propuesta, visibles con el filtro de SC); `lkGhostDay` prefiere una fila no terminada y, si solo hay terminadas, la **reabre** (`reopenAfter` en el `after` de `apply`; si no, el día quedaba «liberado» fuera del plan); `lkGhostSc` usa el SC del filtro si hace la actividad; «Agregar sin días» vuelve a mirar al hacer clic; hoy se puede tocar (lockGuard decide si está publicado); Ctrl/Shift/Alt+clic no programan; `g.past` («¿Terminó?») solo si alguna fila tuvo días; con búsqueda/semana/día/etc. el botón queda `.off` (`LK_GHOK`) y explica qué quitar. **«¿Terminó?»** (`.ghb.ghq`): la actividad ya tuvo fila con días vencidos y nadie la cerró; ⋮ › «Ya está terminada (Matriz)» la confirma Terminado. El contador cuenta solo las que se pueden mostrar (sin fila visible). Prueba con el respaldo real del 09/10: 604 en toda la obra (495 «Falta», 109 «¿Terminó?»; solo 57 confirmadas por un ingeniero, el resto viene del tipo de ambiente), grilla de todos los pisos ~65 ms con fantasmas vs ~35 ms sin ellas. Claves `x:g<amb>_<cat>` para que `gridBlocks` las junte con su ambiente.
- Prueba: `tests/e2e/matriz-alertas.spec.js`.

## Cambiar el catálogo después de cargarlo

- La carga inicial **solo crea**: volver a cargar el mismo archivo completa lo que falte (p. ej. el tipo de ambientes que no existían la primera vez) y no toca lo demás.
- Los estados de `mamb.c` están ligados al **id** de la actividad (`k015`…). Renombrar, cambiar SC o clase no los afecta. Fusionar o quitar actividades sí: sus estados quedarían huérfanos. Por eso los cambios de catálogo van **en la app** (Catálogo: fusionar traslada los estados), no con un archivo nuevo. Volver a cargar el archivo nunca borra ni cambia estados ya marcados.

## La Matriz es la referencia; Campo solo para el PPC (decidido con el dueño, 10/10/2026)
- Campo (registros diarios) sirve para el **PPC diario** y como **sugerencia** para el PPC semanal (validación manual al congelar). Lo que el Lookahead oculta o recomienda sale **solo de la Matriz**.
- **Ocultar filas** (`mxDoneSt(x)==='ok'`, matriz-look.js): la Matriz tiene **confirmado** Terminado o No aplica en ese ambiente (no «sin validar», no un cambio del SC sin «✓ Visto», M05) y la fila no tiene días **después de hoy** (esos avisan con ⚠, `mxRowWarn`). El «Terminada» de Campo (`DONE`) no influye. Botón `#fdone` «N terminadas ocultas · Ver» (`U.showDone`).
- **Sin «✓?»** en el Lookahead (`mxDonePend` siempre falso; `mxd=false` en la grilla).
- **Propuesta de la Matriz** (`mxCells`, celda sin confirmar): siempre **Pendiente** (antes era Terminado si todas sus filas estaban terminadas en Campo). Lo de Campo queda como **aviso**: punto en la celda (`td.mc.dsc`, `o.dsc` = no Terminado/No aplica y todas sus filas terminadas en Campo), texto en la ficha (`mxInfo`, reabrir) e info en el Recorrido.
- **Sigue igual (ciclo diario):** «Terminada»/«Culminado» (`askDone`) libera los días siguientes de esa fila para el plan diario, el PPC y el congelado (`libDay`, `functions/lib.js`); en el Lookahead se ven rayados «liberado». Programar un día después reabre (`reopenAfter`).
- Con el respaldo real del 09/10: se ocultan 117 filas en la ventana (176 en total); de 70 filas terminadas en Campo, 67 no estaban confirmadas en la Matriz y ahora quedan a la vista; «Faltan programar» pasa de 604 a 653.
- Pruebas: `tests/e2e/terminadas-matriz.spec.js`, `matriz-auditoria.spec.js` (M05).

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
- Al guardar (`mxFoto`) se agrega al instante a `MX.ver`, se compara con ella y se abre el historial (`mxFotoHist`). No espera la confirmación del servidor (`bgWrite`; si la rechaza, se quita y avisa); más de ~950 KB avisa que se guarde por piso. El botón se conecta en todas las vistas (`mxWireV`): antes en Catálogo, Recorrido y Tipos no hacía nada. Botón «🕘 Fotos (n)» (`#mxfhist`): Comparar (todos) y **Restablecer** (solo administrador, `mxFotoRestore`): primero guarda una foto `nota:'antes de restablecer'`, luego deja las celdas confirmadas como en la foto (lo sin validar de la foto deja de estar confirmado) con `mxWrite` y Deshacer.

## Exportar (oct 2026)
- «⬇ Excel» (`#mxxls`, `mxExport`): lo que está a la vista (`MX.view`: piso, filtros, orden). Hojas **Matriz** (encabezado por SC con su color, nombres en vertical, símbolos ✓ ◐ ○ – con color; sin validar en cursiva gris; % por ambiente y por columna; paneles fijos), **Lista** (una fila por celda, con autofiltro) y **Leyenda**. Prueba: `tests/e2e/matriz-excel.spec.js`.

## Tablet y pantalla completa (oct 2026)
- ⛶ (`#mxfs`, `mxFsSet`): oculta barra superior y pestañas (`body.mxfs`) y pide pantalla completa al navegador; se apaga al salir de la pestaña.
- Tablet (`min-width:761px and max-width:1366px and pointer:coarse`): botones de la cabecera solo con ícono (`.mxlbl` oculto), sin subtítulo, indicadores resumidos (`.mxsx` oculto; el detalle y la leyenda van en ⓘ), Ambiente 170 px sin Tipo, encabezado de actividades a 150 px.

## Auditoría 08/10/2026 (ChatGPT, pestaña Matriz) — correcciones (decididas con el dueño)
- **Vínculo con el SC (M02/M03):** una actividad del catálogo es de **un solo SC**. `mxCatOf(x)` liga la fila solo si `x.sc` coincide con el SC del catálogo (`mxScOk`); `mxCatOfN(x)` es solo por nombre y se usa para renombrar, fusionar y unificar. Filas con otro SC: aviso en la Matriz «… de otro subcontratista» (`mxScMismatch`/`mxScMisDlg`: «Pasar a <SC del catálogo>», un `apply`, salta propuestas pendientes). En el Lookahead, `mxNameGate` avisa al escribir un nombre de otro SC. Cambiar el SC en el Catálogo (`mxCatScSet`) ofrece pasar también las filas del SC anterior (o «Solo el catálogo»).
- **Selección en bloque (M09):** `mxRect` (arrastre y Shift+clic) toma solo las celdas que el ambiente ya tiene; agregar una actividad a un ambiente sigue siendo clic sobre la celda vacía.
- **Escritura (M10/M01):** `mxWrite` guarda en lotes (`db.batch`, 400 ambientes por lote) y avisa si quedó guardado solo una parte. «Deshacer» (`mxUndo`) vuelve solo las celdas que siguen como las dejó ese cambio; las que otra persona cambió después se respetan.
- **Metadatos de celda** `mamb.m.<cat>` = `{by,n,t,sc?,ok?,bk?}` (`mxCM`): se escriben siempre con `sc`/`ok`/`bk` explícitos (con *merge* Firestore conservaba los viejos: una celda confirmada por el ingeniero seguía figurando como del SC). `ok` = «✓ Visto» del ingeniero sobre el cambio del SC (`mxLogOk`, solo si la celda sigue con ese cambio: `m.t == mlog.t`); `bk` = el SC deshizo y volvió a algo ya dado por bueno.
- **M04:** `conf` del siguiente cambio del SC también es verdadero si el ingeniero había dado «✓ Visto» (`m.ok`).
- **M05:** `mxScPend(amb,cat)` = lo cambió un SC y nadie lo vio. Su «Terminado» **no oculta** la fila terminada del Lookahead (`mxDoneSt` → `pend`, texto «falta el ✓ Visto»). Confirmar Terminado o «Validar» desde la Matriz también lo da por bueno. El % de la Matriz sigue contando todo (decidido: incluye lo sin validar, M08).
- **M06 (reglas):** el SC escribe `mamb` con `l` = id de su constancia, en el **mismo lote** que `mlog/l` nuevo (`pend`, misma celda y valor) o que su paso de `pend` a `undo`; `m.<k>` debe ser suyo (`by == mid()`, `sc == true`, sin `ok`; `bk` solo al deshacer). Pruebas en `tests/rules`.
- No se cambió (decidido): M07 «Revisado esta semana» no se invalida con cambios posteriores; M08 el % incluye lo sin validar.
- Prueba: `tests/e2e/matriz-auditoria.spec.js`.

## Actividades de varios SC y aviso en el Lookahead (oct 2026, pedido del dueño)
- **Varios SC por actividad:** `mcat.scs` = otros SC que también la hacen (`c.sc` sigue siendo el principal: su columna en la Matriz). `mxScsOf(c)`, `mxHasSc(c,list)`: el vínculo de filas (`mxScOk`), lo que ve y llena el SC (`mxMine`, `mxScCan`; la constancia `mlog.sc` va a nombre de su partida), el filtro de SC de Matriz y Catálogo y los pendientes sin programar usan todos sus SC. Se edita en Catálogo › ⋮ › «Otros subcontratistas que la hacen…» (`mxCatScsDlg`, `arrayUnion`/`arrayRemove`), en el aviso «otro subcontratista» (`[data-mxsadd]` «Sumar X a la actividad») y desde la fila del Lookahead. Reglas: el SC llena celdas si `mcat.sc` o `mcat.scs` es de su partida; al crear una actividad no puede poner `scs`.
- **Aviso en el Lookahead** (`mxRowCat`, `mxCatBadge` dentro de `mxRowBadge`): `∉` = el nombre no está en el catálogo (clic: `mxNoCatDlg`, elegir una parecida o agregarla; quien no edita solo ve el aviso); `SC` = es de una actividad de otro SC (clic: «Sumar X a la actividad» o «Pasar esta fila a …», solo editores). Solo con el catálogo cargado y no vacío.
- Prueba: `tests/e2e/matriz-catalogo-lk.spec.js`.

## Desglosar una actividad genérica (`js/matriz-des.js`, oct 2026, decidido con el dueño)
- Catálogo › ⋮ › «Desglosar en varias actividades…» (**solo administrador**, `mxdCan()`): partes con nombre (lista del catálogo: si ya existe se usa esa, `mxDesParts`) y SC (por defecto el de la genérica = el de cada fila). Vista previa con `mxDesPlan`/`mxDesTxt` (no escribe).
- `mxDesApply`: un lote (`db.batch`) con las partes nuevas (`mcat` con `des:<genérica>`), los tipos (la genérica se reemplaza en su lugar), la matriz (cada parte hereda el estado **confirmado**; si no hay confirmado y el ambiente no recibiría la parte por tipo ni por filas nuevas, el propuesto) y la genérica archivada con `arch.des={parts,names,created,tp,cells,ren,cut,add}`. Luego **un `apply`** en el lookahead (historial y Deshacer):
  - por fila de la genérica (todos los pisos, `mxCatOfN`): se saltan las de propuesta del SC pendiente (`mxPendProp`) y las terminadas (`DONE`);
  - sin días cerrados (`planLocked`: pasados, hoy o publicados) → se **renombra** a la primera parte (conserva id: restricciones, liberaciones; `metrado`/`qty` se guardan en `ren` para restaurar) y se agregan las demás con los mismos días;
  - con días cerrados → la fila conserva esos días y su nombre (PPC, semanas congeladas) y las partes se agregan debajo con los días reprogramables (`cut`).
- «Deshacer» del aviso o «Restaurar» de la archivada → `mxDesRestore`: tipos, celdas escritas (si nadie las cambió), partes creadas archivadas (`desUndo`), filas renombradas y días devueltos; filas agregadas → `arc`.
- Las filas antiguas que quedan con el nombre de la genérica no salen como «∉» (`mxDesAli` en `mxRowCat` y `mxLookOff`).
- **Posibles por desglosar** (Catálogo, `#mxdlist` → `mxDesListDlg`, `mxDesCands`): clase «Por desglosar», nombre general (palabras de `MXD_GEN` en nombres de ≤ 4 palabras) o mediana de días por fila ≥ máx(8, 2,5 × la de la obra). «Está bien así» guarda `mcat.okd` (y pasa la clase «Por desglosar» a Típica).
- Prueba: `tests/e2e/matriz-des.spec.js`.

## Revisión de actividades nuevas del SC (oct 2026, decidido con el dueño)
- Tarjeta «Agregadas por los subcontratistas» (Catálogo, `mxCatTools`): **✓ Aceptar** (borra `rev`, guarda `revOk`), **✎ Nombre** (`mxRevRename` → `mxCatRename`: catálogo + filas del lookahead; si el nombre ya existe ofrece combinar), **Combinar…** (`mxMergeDlg`), **Rechazar…** (`mxRevReject`: solo archiva —`arch.rej`— si no tiene filas ni estados; si los tiene, abre Combinar) y **+ Todos los «tipo»** (`mxRevTipo`: el tipo que pidió el SC o, si no, el del ambiente donde la agregó).
- **Posible duplicado** (`mxDupOf`): misma especialidad (`espOfSc`) o mismo SC y ≥ 60 % de palabras en común → botón «⚠ ¿Es «X»? Combinar» que abre Combinar con X elegida (`mxMergeDlg(a,pre)`).
- **Combinar con estados distintos:** queda el **más avanzado** (`MXRANK`/`mxMaxSt`: Terminado › En curso › Pendiente › No aplica); el diálogo lista los ambientes en conflicto. Lo que se sobrescribe en B se guarda en `arch.bset {amb:[antes,después]}` y Restaurar lo devuelve si nadie lo cambió. Combinar también borra `rev`.
- Pruebas: `tests/e2e/matriz-look.spec.js` (duplicado/combinar, rechazar).

## Diseño más amigable (oct 2026, pedido del dueño)
- Celdas como fichas de color (borde de 3 px del color del panel + `border-radius`): **Terminado** verde lleno con ✓ blanco, **En curso** ámbar, **Pendiente** gris claro con borde, **No aplica** solo «–». **Sin validar** = la misma ficha en versión clara (sin borde punteado). Celdas que no aplican al ambiente (`.mc.x`) sin rayado.
- Encabezados más altos (`--nh` 150/190/220 según tamaño) para leer el nombre completo; banda del SC teñida con su color. Tipo de ambiente: el `select` se ve como texto hasta pasar el mouse. % del ambiente con barra (`--p`); totales en 0 % atenuados (`.mxf.z`).
- Avisos en **una bandeja** `.mxals` con botones `.mxal` (mismos ids: `#mxlog`, `[data-mxv=cat]`, `#mxsmis`, `#mxmap`); ya no hay `.callout.mxun` en la Matriz.

## Plano (`js/matriz-plano.js`, vista `U.mxV='pla'`, oct 2026, decidido con el dueño)
- Sobre la lámina base del piso (`U.piso`) con las formas de Sectorización (`a.geo[vista]`, `szGeo`) resalta los ambientes según la Matriz **tal cual** (`mxCells`, incluye lo «sin validar»): **Pendiente** rojo, **En curso** ámbar, lo demás sin color (`MXPL_C`). Solo lectura: no escribe nada.
- Filtro: SC (`U.mxPlSc`; el SC solo los suyos) y **una actividad** (`U.mxPlCat`, por defecto) o **toda la partida** (`'*'`): rojo si alguna actividad del SC está pendiente, si no ámbar si alguna en curso; la etiqueta lleva el número.
- Se arma una vez (`#mxplmap` con `__plano.ambMap`, el visor no se destruye); lámina = la base con más ambientes dibujados (o `#mxplv`). Lista lateral de pendientes / en curso (clic resalta el ambiente) y aviso de ambientes con pendientes sin forma. `plano.js` vuelve a dibujar también con `U.tab==='mat'` al cargar láminas e imágenes.
- Etiquetas limpias (pedido del dueño): `ambMap({plain:true})` pone solo el **nombre** del ambiente en letra tenue (`.pvl.mxpll`), sin recuadro ni flechas ni código; en `apply` del visor (`l.mw` = ancho del ambiente) se abrevia (`mxPlShort`, y si aún no cabe, sus dos primeras palabras) o se oculta según el zoom. El código y el detalle van en el `title`.
- Prueba: `tests/e2e/matriz-plano.spec.js`. Con el respaldo real (P1, GABEL PINTURA · Segunda mano): 30 pendientes; dibujo ~4 ms.
