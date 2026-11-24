# Módulo Avance (avance físico de partidas por ambiente)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este módulo.

Decidido con el dueño el 24-11-2026 (bosquejo y maqueta aprobados en esa conversación). **Fase 1 hecha** (partidas, metrado, registro diario, «Llegó», importación). **Fase 2 pendiente:** tablero, curva acumulada, Excel y PDF.

## Qué es

Un **módulo aparte** en el selector de la barra (`U.mod==='ava'`, junto a Last Planner, Tareo y Planos) para controlar el avance físico de partidas de acabados e instalaciones por ambiente: mobiliario, pintura, enchape, cubículos y las que se creen después. **No se conecta** con el lookahead, el plan diario ni el PPC. Usa los pisos y ambientes de Last Planner **por su id** (no los copia); por eso no se ofrece dentro de Casco (`canAva()` exige `!CS()`).

- Una sola pestaña: `areg` **Registro** (`AVA_TABS`, base.js). El tablero será `atab`.
- Archivos: `js/avance-calc.js` (cálculo puro), `js/avance.js` (datos, pantalla, ficha de partida, ＋ Fila), `js/avance-imp.js` (importar con equivalencias).
- El piso se filtra con `U.piso` (el mismo estado de toda la app); como en este módulo la barra superior oculta su selector (`body.mod-ava`), la pantalla trae el suyo (`#avpiso`), que escribe el mismo `U.piso`.

## Decisiones del dueño (24-11-2026)

- **Simple:** no hay pestañas de Llegadas, Metrados ni Partidas. Todo va en Registro: **Metrado** y **Llegó** son columnas de la misma tabla, y la partida se crea o edita con botones (`＋ Partida`, `✎ Editar partida`).
- **«Llegó» es un número por fila** (cuánto llegó del metrado de esa fila). Se descartó a propósito: guías con número y fecha, piezas con «llegado completo = mínimo de las piezas», y la asignación de lo llegado por secuencia de pisos. No los reintroduzcas sin que él lo pida.
- Configuran (partidas, metrado, importación) **administrador y editores**; registran avance y «Llegó» además **campo**. SC, áreas, veedor y lector solo leen. El capataz no ve el módulo.
- **Cliente:** recibirá el Excel/PDF del tablero (fase 2); no hay usuario cliente.
- **Superar el metrado:** pide confirmar y guarda con alerta (avisa, no bloquea).
- **Días pasados:** sin cierre; todo cambio queda en el historial de la celda. Los días futuros y los que están fuera del rango de la partida no se llenan.
- **Importar nunca crea ambientes:** el ambiente que no existe se deja en «No importar» y se crea antes en el Lookahead (crear aquí lo haría aparecer vacío en el Lookahead y la Matriz).
- **Global por piso:** la partida sin metrado en un piso no entra y su peso se reparte entre las demás (`avGlobal`).
- Queda separado de Productividad (`pcrit`/`pav`); unirlos es una idea para después.
- Los CSV de la obra **no van al repositorio** (es público): se cargan desde «Importar CSV…».

## Datos (colecciones propias, compartidas como las de Planos: sin copia `cs_`)

Están en `DSHARED` (base.js), `SHARED` (`scripts/reglas-casco.mjs` y `functions/index.js`) y en el respaldo (`BK_DATA`).

- `avp/{id}`: partida `{nom, und, sum, ubi:[nombres], et:[{id,nom,peso}], items:{id:{cod,des,ord}}, peso, glob, d0, d1, corte, ord, eq, by, n, t, arch?}`.
  - `sum`: controla llegadas (muestra la columna «Llegó»). `ubi`: ubicaciones dentro del ambiente (vacío = no usa). `et`: etapas en orden; los pesos suman 100 (`avPesosOk`).
  - `peso`/`glob`: peso manual para el avance global que mezcla partidas. `d0`–`d1`: rango de fechas de la grilla. `corte`: fecha del corte inicial (solo informativa).
  - `eq:{niv:{clave:pisoId|'-'}, amb:{'pisoId|clave':ambId|'-'}}`: equivalencias guardadas de la última importación (`clave` = `mnk(nombre)`).
  - Se suscribe entera al entrar al módulo (`ensureAv`).
- `avm/{partida}_{piso}`: metrado `{p, piso, r:{filaId:{it, amb, ub, q, an, arch?}}, ll:{filaId:llegado}, by, t}`.
  - La fila tiene **id propio**: corregir el metrado no descuelga el avance. `an` = nombre del ambiente al cargar; se muestra si el ambiente ya no existe.
  - «Llegó» va en `ll`, aparte de `r`, para que las reglas dejen a campo escribir solo eso.
  - Quitar una fila = `r.<id>.arch` (no se borra; su avance queda en la base y deja de contar).
- `ava/{partida}_{piso}_{lunes|ini}`: avance de una semana `{p, piso, w, c:{fecha|'ini':{filaId:{etapaId:cantidad}}}, log:[{d,r,e,q,a,by,n,t}], by, t}`.
  - `ini` = corte inicial (lo ejecutado antes del registro diario). `lunes` = el lunes del calendario de esa fecha (`avMon`; no depende de `refDate` del proyecto).
  - Cada celda se escribe **sola** con `set(…,{merge:true})` y su entrada de historial con `arrayUnion` (`avPutCell`): dos personas en celdas distintas del mismo documento no se pisan. No uses `apply`/`put` aquí (`fsDiff` solo baja un nivel).
  - Una celda en 0 se guarda como 0 (no se borra el campo).
- `avm` y `ava` se leen **solo de la partida elegida** (`avSubData`: `where('p','==',id)`), y se reabren al cambiar de partida. El tablero de la fase 2 necesitará leer todas.
- Nada calculado se guarda: los porcentajes salen de `avance-calc.js`.

### Reglas (`firestore.rules`, pruebas «avance: …»)

- Leen todos los de LPS (`lpsMember`). Nadie borra.
- `avp`: `canEdit()`, con nombre y al menos una etapa.
- `avm`: crea `canEdit()`; actualiza `canEdit()`, o `canDaily()` si solo cambian `ll`, `by`, `t`. El id debe ser `p_piso`.
- `ava`: `canDaily()`; el id debe ser `p_piso_w`; solo las claves conocidas; `log` nunca se acorta.
- Las reglas no pueden recorrer mapas anidados: que las cantidades sean números ≥ 0 lo valida la página.

## Cálculo (`avance-calc.js`, funciones puras)

- `ex` = `{filaId:{etapaId:{fecha|'ini':cantidad}}}` (lo arma `avData()` desde los documentos `ava`).
- Fila: `avRowPct` = Σ etapas mín(ejecutado ÷ metrado, 1) × peso ÷ 100. Ejemplo del dueño: 100 m², empaste 100 (40 %) + 1.ª mano 50 (30 % × 0,5) + 2.ª mano 0 = 55 %.
- Grupo (ambiente, piso, partida): `avGrpPct`, ponderado por metrado. Una etapa en un grupo: `avEtPct`. Llegado: `avLlPct`.
- `hasta` (fecha) en `avAcc`/`avRowPct`/`avGrpPct` corta el acumulado a ese día (para la curva de la fase 2); el corte inicial siempre cuenta.
- Global: `avGlobal([{peso, pct, has}])`; nunca se suman unidades distintas.
- `avNum` entiende «6.5», «6,5» y «1,473.5». `avCsv` lee coma, punto y coma o tabulación, con comillas.
- `AV_TPL`: plantillas de fábrica (Mobiliario, Pintura, Enchape, Cubículos).

## Pantalla Registro (`renderAReg`)

- Barra 1: partida (`#avp`, se recuerda en `U.avP`, en `saveUI`), piso (`#avpiso`), `✎ Editar partida`, `＋ Partida` (menú: en blanco, plantillas, duplicar la actual), Grilla / Celular (`AV.cel`; por defecto celular en pantallas angostas).
- Barra 2: etapa (una a la vez; «Resumen» = ponderado de todas, solo lectura), avance de la partida, `＋ Fila`, `Importar CSV…`.
- **Grilla** (`avGridHtml`): piso → ambiente → fila, plegables (`AV.pc` pisos plegados, `AV.ambC` ambientes plegados), con subtotales. Columnas fijas: Metrado, Llegó (si `sum`), Ejec., Pend., % de la etapa, Alerta, Corte inicial. Luego las semanas (lunes a domingo, `avWeeks`), plegables (`AV.wkO` = abiertas; por defecto la actual y la anterior); la plegada muestra solo su total. Hoy resaltado, no laborables en gris (`nwReason`; igual se pueden llenar, la obra trabaja domingos). Al entrar, la tabla se desplaza hasta hoy. Con más de 80 filas solo se abre el primer piso.
- Celdas editables = `td.aved` con `contenteditable` y `data-k`: `q|fila` (metrado, solo `avaCfg`), `l|fila` (Llegó) y `c|fila|fecha` (avance). Se guarda al salir de la celda (`avBlur`); Enter y flechas ↑↓ mueven por la columna, Esc deshace.
  - **Si llega un dato mientras se escribe**, `renderAReg` no redibuja (`AV.pend`) y lo hace al salir de la celda: así no se pierde lo tecleado.
  - `focusin`/`focusout` no tienen propiedad `on…` en Chromium: se escuchan con `addEventListener` una vez por `<main>` (`main.__avf`).
- Alertas por fila: «supera el metrado», «más de lo llegado» (alguna etapa ejecutó más que `ll`), «va delante de <etapa anterior>». Solo avisan.
- Historial de una celda: clic derecho o mantener el dedo (`avCtx` → `openPop`), desde `ava.log`.
- Metrado en blanco o 0 = quitar la fila (pide confirmar; archiva).
- **Celular** (`avCelHtml`): piso → tarjetas de ambiente → ítems con − / cantidad / + para Hoy o Ayer, y «Todo lo que falta». Sin grilla.
- **Ficha de partida** (`avFicha`, `lqModal`): nombre, unidad, fechas, etapas con peso (no guarda si no suman 100), ítems en un cuadro de texto (un código y su descripción por línea; se pegan dos columnas de Excel; `avItParse` conserva el id de los códigos que ya existían), ubicaciones separadas por coma, «Controla llegadas», peso global. No se puede quitar un ítem con filas; quitar una etapa con avance pide confirmar. La suma de pesos se actualiza al escribir **sin redibujar la ventana** (`avFSum`): redibujarla al cambiar de campo se comía el clic en el campo siguiente.

## Importar (`avance-imp.js`)

- CSV o pegado de Excel. Encabezados (se reconocen sin tildes ni mayúsculas, `AVI_COL`): `codigo`, `descripcion`, `nivel`, `ambiente`, `cantidad` y, si la partida usa ubicación, `ubicacion`. Las demás columnas (`partida`, `unidad`, `plano`) se ignoran: se importa a la partida abierta.
- **Cuadro de equivalencias:** cada nivel y cada ambiente del archivo se empareja con uno de la obra o «No importar». Sale solo si el nombre coincide (por `mnk`) y es único en ese piso, o si quedó guardado en `avp.eq`. Mientras falte alguno, «Importar» está apagado. Por defecto solo se listan los ambientes que faltan resolver («Ver todos»).
- Resumen antes de importar (`avImpPlan`): filas nuevas, que cambian de metrado, iguales, sin importar, ítems nuevos y filas con error. Filas repetidas en el archivo (mismo ambiente, ítem y ubicación) se suman.
- Volver a importar el mismo archivo no duplica: la fila existente conserva su id (y su avance) y solo cambia el metrado si es distinto. Los códigos nuevos se agregan como ítems de la partida.
- Todo va en un lote (`db.batch`): `avp` (ítems y `eq`) y un `avm` por piso.

## Pruebas

- `tests/e2e/avance.spec.js`: cálculo, registro con historial y confirmación al superar el metrado, etapas y permisos por rol, crear partida desde plantilla y agregar fila, importar con equivalencias sin crear ambientes ni duplicar, celular.
- `tests/rules/firestore.test.mjs` «avance: …».

## Pendiente (fase 2 y después)

- `ava.log` crece sin límite dentro del documento de la semana (y sobre todo en el de `ini`): vigilar el tamaño (límite 1 MiB); si hiciera falta, pasar el historial a una colección aparte. La regla solo exige que no se acorte.
- Restaurar un respaldo viejo no pisa los `ava` cuyo historial creció después (la regla lo rechaza): esos documentos se saltan.
- El SC lee todas las partidas (como el resto de LPS); revisar si entra a SEG-05 paso 2.
- `#avpiso` escribe `U.piso`: elegir piso en Avance cambia también el filtro de Last Planner (a propósito).
- Los ids de etapa no se reusan nunca (reusarlos reviviría avance viejo).

- Tablero (`atab`): % ejecutado, llegado y faltante por partida, piso y global; bajar al detalle; curva acumulada (`hasta`); Excel y PDF (también para el cliente).
- Equipo › Limpieza borra pisos y ambientes de verdad: debería avisar si un piso tiene metrado de Avance (hoy las filas quedarían con el nombre guardado en `an`).
- Pegar un bloque de celdas desde Excel directo en la grilla.
- Opcional, si el dueño lo pide: que el SC y su capataz registren solo su partida (la partida guardaría su `sc`), y el puente con la Matriz o Productividad.
