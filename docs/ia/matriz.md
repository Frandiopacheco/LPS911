# Matriz de ambientes (`js/matriz.js`, pestaña `mat`)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

## Qué es (fase 1, oct 2026)

Estado **actual** de cada actividad del catálogo en cada ambiente (pendiente / en curso / terminado / no aplica). Sirve para sincerar la obra cada semana y programar el lookahead sobre lo que de verdad falta: el lookahead puede tener filas borradas, terminadas mal marcadas, etc.; la matriz es la referencia de «cómo está la obra hoy».

- **Fase 1 (decidido con el dueño):** editan administrador y editores (`mxEd()` = `canWrite && !PM() && !verRO()`); el resto la ve. Estados: `p` Pendiente, `c` En curso, `t` Terminado, `n` No aplica (sin «liberado por Calidad»).
- **Pendiente para fases siguientes:** el SC propone y el ingeniero valida; editar el catálogo y los tipos desde la app (hoy solo se cargan y se asignan alias); ligar el lookahead al catálogo (lista de actividades en vez de texto libre) y avisos al programar; gráficos de avance por SC y ventana (semana / 3 / 6 semanas).

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

- Filas por piso (selector principal `U.piso`) → sector → ambiente; columnas agrupadas por SC (`conOf(sc).color`). Filtro de SC propio (`#mxsc`, usa `U.sc` de un solo SC), «Típicas / Todas» (`U.mxAll`, en `saveUI`), «Comparar con» una foto (`MX.cmp`: punto azul en las celdas que cambiaron).
- Selección (`MX.sel`, claves `ambId|catId`): arrastrar, Shift+clic, Ctrl+clic, clic en encabezado de columna o en el ambiente (toma las celdas que aplican). Barra fija `#mxsb` y teclas 1/2/3/0/Enter/Esc. Un clic sin arrastrar abre la ficha (`mxInfo`, `openPop`) con el origen, las filas del lookahead y (si edita) los estados. Mientras se arrastra, `DRAGGING=true` (no se redibuja).
- Cambios en bloque con «Deshacer» en el aviso (`mxWrite` guarda los valores anteriores; lo que no existía se borra con `FieldValue.delete()`).
- Tipo del ambiente: `select[data-mxtipo]` en cada fila (editores).
- Carga inicial: «⬆ Cargar catálogo» (solo administrador) con un archivo `formato:'lps911-matriz-v1'` `{mcat, mtipo, mamb:{ambId:{tipo}}}`. **Solo crea lo que no existe** (no reemplaza ni borra; omite ambientes que no están en la obra). El primero se armó con el Excel revisado por el dueño (respaldo 07/10/2026).
- Rendimiento medido con la obra real: un piso (≈55 ambientes, 66 columnas) ~0,16 s; todos los pisos ~0,65 s.
- Prueba: `tests/e2e/matriz.spec.js`.
