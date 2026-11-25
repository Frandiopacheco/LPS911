# Módulo Avance (avance físico de partidas por ambiente)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este módulo.

**Planilla única (25-11-2026, decidido con el dueño).** El primer formato (24-11: partidas con ítems, etapas con peso por partida, plantillas, columna «Llegó») no le gustó: lo quiso como su Excel de metrados, **un solo formato general para cualquier control**. Se rehizo sobre una maqueta que él aprobó. **Pendiente:** resumen por partida y semana, y exportar a Excel con el aspecto de su hoja.

## Qué es

Un **módulo aparte** en el selector de la barra (`U.mod==='ava'`, junto a Last Planner, Tareo y Planos) para controlar el avance físico de cualquier partida (mobiliario, pintura, enchape, cubículos…). **No se conecta** con el lookahead, el plan diario ni el PPC. Usa los pisos, sectores y ambientes de Last Planner **por su id** (no los copia); por eso no se ofrece dentro de Casco (`canAva()` exige `!CS()`).

- Dos pestañas (`AVA_TABS`, base.js): `areg` **Registro** (la planilla) y `ares` **Resumen** (`js/avance-res.js`).
- Archivos: `js/avance-calc.js` (cálculo puro), `js/avance.js` (datos, planilla, celular, partida, «⋯» de la fila), `js/avance-imp.js` (importar con equivalencias), `js/avance-res.js` (Resumen, curva, Excel y PDF).
- El piso se filtra con `U.piso` (el mismo estado de toda la app); como en este módulo la barra superior oculta su selector (`body.mod-ava`), la pantalla trae el suyo (`#avpiso`), que escribe el mismo `U.piso`: elegir piso aquí cambia también el filtro de Last Planner (a propósito).

## Decisiones del dueño

- **Un solo formato.** Se abre la planilla y se llenan filas, como en Excel. Nada se configura antes: la partida es solo **nombre y fechas**. Sin catálogo de ítems, sin plantillas, sin ficha larga, sin columna «Llegó», sin guías ni piezas. No los reintroduzcas sin que él lo pida.
- **Filas:** Piso → Sector → Ambiente → descripción libre. Una fila puede colgar del ambiente, del sector o de todo el piso. **Unidad por fila** (como su Excel) y el **metrado final se tipea** (sin columnas de ayuda a, b, h ni ejes).
- **Las filas se agregan dentro de la tabla**, no con un botón arriba (lo pidió expresamente): línea en blanco al final de cada ambiente.
- **Etapas en la misma planilla, sin predefinir:** una fila se desglosa en etapas desde su «⋯». Nacen con el mismo peso; el peso se cambia en la columna «Peso».
- **Interruptor Cantidad | %:** cambia cómo se ve y se tipea. Se guarda **siempre la cantidad** (3 de 7 muebles = 43 %; 50 % de 86 m² = 43 m²).
- **Domingo incluido** (la obra a veces lo trabaja).
- Configuran (partidas, filas, unidad, metrado, etapas, importar) **administrador y editores**; registran además **campo**. SC, áreas, veedor y lector solo leen. El capataz no ve el módulo.
- **Superar el metrado** (25-11-2026, pedido del dueño; antes era «Guardar igual»): la ventana `avOverAsk` da dos salidas. Por defecto, **ajustar el día** para que el acumulado cuadre con el metrado. O **aumentar el metrado** hasta lo ingresado, que pide una segunda confirmación (`uiAsk` rojo) y solo lo ve quien configura (administrador y editores); el metrado y la celda se guardan como una sola acción para Ctrl+Z. Al **pegar** un bloque no se pregunta: lo que superaría se ajusta y el aviso dice cuántas. Una fila puede seguir «superada» si después se baja su metrado (punto ámbar).
- **Fracción de unidad:** una fracción en una fila «und» (3.5 muebles) se marca, no se bloquea.
- **Días:** sin cierre; todo cambio queda en el historial de la celda. Se llena cualquier día del rango de la partida, **también los futuros** (lo pidió el 25-11-2026); fuera del rango no.
- **Sin corte inicial** (25-11-2026): «más fácil es poner el acumulado hasta ahora un día antes de donde voy a controlar». La columna «Corte inicial» solo aparece si la partida ya tiene datos de corte guardados (`'ini'`), que siguen contando; la partida ya no pide esa fecha.
- **La grilla se edita como Excel** (25-11-2026) y **no hay botón Celular**: la vista de celular sale sola en pantallas angostas (`isMob()`).
- **Importar nunca crea ambientes:** el que no existe se deja en «No importar» y se crea antes en el Lookahead.
- Los CSV de la obra **no van al repositorio** (es público): se cargan desde «Importar…».
- Queda separado de Productividad (`pcrit`/`pav`).

## Datos (colecciones propias, compartidas como las de Planos: sin copia `cs_`)

Están en `DSHARED` (base.js), `SHARED` (`scripts/reglas-casco.mjs` y `functions/index.js`) y en el respaldo (`BK_DATA`).

- `avp/{id}`: partida `{v:2, nom, d0, d1, corte, ord, eq, by, n, t, arch?}`.
  - `d0`–`d1`: rango de fechas de la planilla. `corte`: fecha del corte inicial (informativa).
  - `eq:{niv:{clave:pisoId|'-'}, amb:{'pisoId|clave':ambId|'-'}}`: equivalencias de la última importación (`clave` = `mnk(nombre)`).
  - **`v:2` marca el formato vigente.** Las partidas del primer formato (sin `v`) eran datos de prueba: siguen en la base, pero `avParts()` no las muestra.
- `avm/{partida}_{piso}`: filas `{p, piso, r:{filaId:{amb, sec, desc, und, q, et, o, an, arch?}}, by, t}`.
  - `amb` = ambiente; `sec` = sector, solo si la fila es de todo el sector (sin `amb`); los dos vacíos = todo el piso. El sector de una fila con ambiente **se deriva** del ambiente (`avData`).
  - `q` = metrado final; `o` = orden (hora de creación); `an` = nombre del ambiente al cargar (se muestra si el ambiente ya no existe).
  - `et` = etapas de esa fila `[{id, n, w}]` o `null`. **La primera etapa lleva el id `'_'`** (`AV_E0`), el mismo de la fila sin etapas: así lo ya registrado pasa a ella sin mover datos, y al quitar las etapas la fila conserva lo de su primera. Las demás llevan un id que **no se reusa nunca** (reusarlo reviviría avance viejo).
  - Quitar una fila = `r.<id>.arch` (no se borra; su avance queda en la base y deja de contar).
  - `ll` (del primer formato) ya no se usa.
- `ava/{partida}_{piso}_{lunes|ini}`: avance de una semana `{p, piso, w, c:{fecha|'ini':{filaId:{etapaId|'_':cantidad}}}, log:[{d,r,e,q,a,by,n,t}], by, t}`.
  - `ini` = corte inicial. `lunes` = el lunes del calendario de esa fecha (`avMon`; no depende de `refDate` del proyecto).
  - Cada celda se escribe **sola** con `set(…,{merge:true})` y su entrada de historial con `arrayUnion` (`avPutCell`): dos personas en celdas distintas del mismo documento no se pisan. No uses `apply`/`put` aquí (`fsDiff` solo baja un nivel).
  - Una celda en 0 se guarda como 0 (no se borra el campo). Cantidades con 4 decimales (`avR4`), para que tipear en % no acumule redondeos.
- `avm` y `ava` se leen **solo de la partida elegida** (`avSubData`: `where('p','==',id)`); `avReady(p)` dice si ya cargaron. Mientras no cargan no se puede escribir ni importar (antes se podían duplicar filas).
- `avRowPatch` refleja el cambio en memoria al instante (`AVM`) además de escribirlo, y `avPutCell`/`avPutCells` hacen lo mismo con `AVD` (`avCellMem`): la foto de la base llega después con lo mismo. Sin eso, Ctrl+Z seguido de Ctrl+Y (o varios «＋» seguidos en el celular) partía de un valor viejo y el segundo cambio se perdía.
- Nada calculado se guarda.

### Reglas (`firestore.rules`, prueba «avance: …»)

- Leen todos los de LPS (`lpsMember`). Nadie borra.
- `avp`: `canEdit()`, con nombre.
- `avm`: `canEdit()`; el id debe ser `p_piso`. (Queda la excepción de `canDaily()` para `ll`, del primer formato; no estorba.)
- `ava`: `canDaily()`; el id debe ser `p_piso_w`; solo las claves conocidas; `log` nunca se acorta.
- Las reglas no pueden recorrer mapas anidados: que las cantidades sean números ≥ 0 lo valida la página.

## Cálculo (`avance-calc.js`, funciones puras)

- `ex` = `{filaId:{etapaId|'_':{fecha|'ini':cantidad}}}` (lo arma `avData()` desde los documentos `ava`).
- `avEtOf(row)`: las etapas de la fila o la única implícita `'_'`.
- Fila: `avRowPct` = Σ etapas (mín(ejecutado ÷ metrado, 1) × peso) ÷ Σ pesos. Ejemplo: 100 m², empaste 100 (40) + 1.ª mano 50 (30) + 2.ª mano 0 (30) = 55 %.
- `avRowDay`: lo que aportó un día (fracción del metrado).
- Grupo (ambiente, sector, piso, partida): `avGrpPct`/`avGrpDay`. **Misma unidad** en todas sus filas (`avSame`) → ponderado por metrado, y se muestra el metrado sumado. **Unidades mezcladas** → promedio simple de sus filas, sin sumar metrado («varias»).
- `hasta` (fecha) corta el acumulado a ese día (para la curva futura); el corte inicial siempre cuenta.
- `avSetW(et, id, pct)`: cambia el peso de una etapa y reparte el resto entre las demás en la proporción que tenían (quedan sumando 100).
- `avNum` entiende «6.5», «6,5», «50 %» y «1,473.5». `avCsv` lee coma, punto y coma o tabulación, con comillas.

## Planilla (`renderAReg` → `avGridHtml`)

- Barra: partida (`#avp`, `U.avP`), piso (`#avpiso`), **Cantidad | %** (`U.avPct`; los dos en `saveUI`), avance de la partida, `Hoy` (lleva la tabla a hoy), `Todas las semanas` / `Plegar semanas` (`AV.wkAll`), ↶ ↷, **`Editar filas`** (`AV.edf`), `Traer ambientes…`, `Importar…` y `Partida ▾` (nombre y fechas, nueva). Ningún botón va en color de acento: lo de todos los días es llenar la tabla.
- **Auditoría de interfaz (25-11-2026, el dueño dejó decidir):** filas de 26 px (antes 37); cabecera fija con `thead{position:sticky}` (antes cada `th` con el alto de la primera línea a ojo: quedaba una rendija); columnas fijas más angostas (570 px en vez de 746) para ver más días, también en tablet (desde 900 px); se quitaron las columnas **Peso** (ahora es un número editable junto al nombre de la etapa, `span.avpw`) y **Alerta** (ahora un punto `.avdt` junto al %, con su texto en `title`: ámbar = supera el metrado, gris = fracción de unidad); borde marcado entre lo fijo y lo que se desplaza (`.avskl`); en modo % los totales y las celdas de solo lectura llevan «%»; la ayuda larga va plegada (`details.avhlp`).
- **La fila con etapas («madre») deja sus días en blanco en modo Cantidad** (sumar etapas ponderadas no da una cantidad real); en % muestra lo que aportó cada día.
- **«Editar filas»** enciende las líneas en blanco `tr.avgho` y el `select.avadd` de cada piso; apagado (por defecto) no se ven: con decenas de ambientes eran decenas de líneas vacías. Una partida sin filas muestra tres botones: Traer ambientes, Importar y «Agregar filas a mano» (que lo enciende).
- Árbol por piso: `avTree(pisoId, rows, AV.xa)`. Con un solo sector y sin filas a nivel de sector, el nivel «sector» se omite (`showSec`). Quien configura ve todos los pisos (para poder agregarles ambientes); los demás, solo los que tienen filas.
- Columnas fijas a la izquierda (`.avs0` y `.avsk` con `left` calculado; solo la descripción si la pantalla mide menos de 900 px): descripción, Und, Metrado, Acum., %. Luego Corte inicial (si hay) y las semanas (lunes a domingo, `avWeeks`), plegables (`AV.wkO` = abiertas; por defecto la actual y la anterior). Hoy resaltado, no laborables en gris (igual se llenan). Al entrar, la tabla se desplaza hasta hoy. Con más de 80 filas solo se abre el primer piso (`AV.C` = grupos plegados).
- Celdas editables = `.aved` con `contenteditable` y `data-k`: `c|fila|etapa|fecha` (avance), `q|fila` (metrado), `u|fila` (unidad, texto), `w|fila|etapa` (peso), `d|fila` (descripción) y `n|fila|etapa` (nombre de la etapa); las dos últimas son un `span.avnm` dentro de la celda fija. Se guarda al salir de la celda (`avBlur`).
- **Edición tipo Excel** (`avKey`, `avMove`, `avPaste`): la celda entra «seleccionada» (escribir reemplaza); flechas en las cuatro direcciones, Enter baja y Mayús+Enter sube (`avColOf` dice qué celdas son la misma columna); **F2 o doble clic** = corregir dentro (`AV.edit`: ahí ←→ mueven el cursor); Supr borra; Esc deshace. **Ctrl+V** con un bloque copiado de Excel lo reparte desde la celda con foco hacia la derecha y abajo, saltando filas madre y grupos. Cada línea va a la fila de datos siguiente y cada columna de días a **su fecha**: lo que caería en una celda que no está (semana plegada, fuera del rango, fila «por metrar») no se corre a otra, se avisa como «sin pegar»; los días van en una escritura por documento de semana (`avPutCells`), cada celda con su historial. Al pegar no se pregunta por «supera el metrado» (queda la alerta). Pendiente: seleccionar un rango y copiar varias celdas.
- **Deshacer / rehacer** (Ctrl+Z, Ctrl+Y o Ctrl+Mayús+Z, y los botones ↶ ↷; pedido del dueño el 25-11-2026: «Ctrl+Z es muy importante»). Pila propia `AVU` (el deshacer global de base.js no actúa aquí: `areg` no está en `UNDO_TABS`): de esta sesión y de la partida abierta, hasta 100 acciones. Se registra en las escrituras de bajo nivel (`avRowPatch`, `avPutCell`, `avPutCells`) con `avURec`; `avUGroup` junta en una acción lo compuesto (pegar un bloque, «todo lo que falta», aplicar etapas, traer ambientes). Deshacer **escribe de nuevo** el valor anterior (queda en el historial de la celda) y deshacer una fila creada la archiva; nada se borra. Mientras se teclea en una celda, Ctrl+Z deshace lo tecleado (navegador). **Importar no se deshace.** **No pisa a otros:** antes de deshacer se comprueba que la celda (o los campos de la fila) sigan como los dejó la acción; lo que otra persona cambió después se salta y se avisa. La pila se vacía al cerrar sesión (`avStop`).
- **Ajustar texto** (`U.avWrap`, en `saveUI`; 25-11-2026, pedido del dueño: los nombres largos se cortaban): botón de la barra que pone la clase `.avwr` en la tabla y deja los nombres completos en varias líneas (la fila crece). Apagado, el nombre va en una línea con «…» y se lee entero al pasar el mouse (`title`).
- **Plegar etapas** (25-11-2026, pedido del dueño): la fila con etapas lleva una flecha `button.avetg` que oculta o muestra sus sub-filas (`AV.C` con la clave `e:<fila>`), y la barra un botón «Plegar etapas / Mostrar etapas» para todas. Plegada, la fila sigue mostrando su % combinado.
- **Etapas en la tabla:** el nombre se cambia escribiendo encima; dejarlo vacío quita esa etapa (`avEtDel`, pide confirmar; su peso se reparte). La primera (`'_'`) no se quita sola porque guarda lo registrado antes de desglosar: sale al quitar todas. En % la celda muestra `cantidad ÷ metrado × 100` y lo tipeado se convierte a cantidad.
- La fila con etapas («madre») no se llena: muestra el combinado de sus etapas, que van debajo como sub-filas (`tr.avet`).
- **Fila nueva en la tabla:** `tr.avgho` al final de cada ambiente (y de un sector o piso que ya tenga filas sueltas), con `data-g="piso|sector|ambiente"`. Descripción → Enter → metrado → Enter crea la fila (`avGhoTry` → `avAddRow`) y deja el cursor en la línea siguiente (`AV.gf`). La unidad viene sugerida con la de la fila anterior.
- **Ambiente sin filas todavía:** al final de cada piso, `select.avadd` con los ambientes de la obra por sector, «todo el sector» y «todo el piso»; lo elegido va a `AV.xa` (solo en memoria) para que aparezca su línea en blanco con el cursor puesto.
- **«⋯» de la fila** (`avRowMenu`, `lqModal`): cambiar la descripción, agregar una etapa, aplicar sus etapas a las demás filas de la misma unidad que no tienen etapas (un lote; solo el piso elegido si hay uno, y pide confirmar si alguna ya tiene avance, porque su % baja), quitar las etapas, quitar la fila.
- **«Traer ambientes…»** (`avAmbDlg`, 25-11-2026, pedido del dueño): crea **la misma fila** (descripción y unidad) en cada ambiente marcado del Lookahead, del piso elegido o de toda la obra; se desmarcan los que no aplican. Las filas nacen con `q:0` = **«por metrar»**: no cuentan en el avance (`avGrpPct` las deja fuera también con unidades mezcladas), sus días no se pueden llenar y no salen en el celular hasta que se les pone metrado (Enter baja por la columna Metrado). No duplica: salta el ambiente que ya tiene esa descripción y unidad. No crea ambientes.
- **Si llega un dato mientras se escribe** (celda, línea nueva con texto o campo del celular), `renderAReg` no redibuja (`AV.pend`) y lo hace al salir: así no se pierde lo tecleado.
- `focusin`/`focusout` no tienen propiedad `on…` en Chromium: se escuchan con `addEventListener` una vez por `<main>` (`main.__avf`).
- Alertas por fila: «supera el metrado», «fracción de unidad». Solo avisan.
- Historial de una celda: clic derecho o mantener el dedo (`avCtx` → `openPop`), desde `ava.log`.
- **Celular** (`avCelHtml`): piso → tarjetas de lugar (`avCelGroups`) → filas (o etapas) con − / valor / + para Hoy o Ayer, y «Todo lo que falta». Cada toque suma 1, o 10 % en modo %.

## Más de la planilla (25-11-2026, pasos 2 y 3 que el dueño pidió seguir)

- **Total de la partida** (`tr.avtt`): primera fila de la tabla; con búsqueda dice «Total de lo buscado».
- **Buscar** (`#avq`, `AV.q`): todas las palabras, en la descripción o en el nombre del ambiente o del sector (`mnk`). Con búsqueda activa no se muestran las líneas de «Editar filas» de los pisos sin coincidencias.
- **Reordenar:** «⋯» › Subir / Bajar intercambia el `o` de la fila con su vecina del mismo ambiente (una acción para Ctrl+Z).
- **Rango seleccionado** (`AV.sa`/`AV.sb`, clase `.avsel`, solo en pantalla): Mayús+flechas o Mayús+clic desde la celda con foco. Ctrl+C lo copia como texto con tabulaciones (`avSelCopy`) y Supr lo vacía (`avSelDel`, solo celdas de días, una acción). Cualquier otra tecla, un clic o un redibujo lo quitan.
- **Tablet vertical:** las columnas fijas (`.avsk`) se activan desde 700 px; la descripción mide 260 / 200 / 170 px según el ancho.
- **Celular:** sin piso elegido se listan los lugares de **todos los pisos** (`avCelAll`; la clave del lugar es `piso~lugar`); el día se elige con Hoy, Ayer o un `input type=date` limitado al rango de la partida (`AV.day` ya no vuelve solo a hoy); el campo vacío muestra 0.

## Resumen (`avance-res.js`, pestaña `ares`)

Lo que hacía la hoja RESUMEN del Excel del dueño. La ven todos los que ven el módulo.

- **Datos:** una lectura suelta (`get`) de `avm` y `ava` enteras al entrar (`avResLoad` → `ARS.by`: partida → `avBuild`), que se repite si pasaron más de 15 min o con «Actualizar» (son colecciones enteras: no leerlas en cada visita). La partida abierta en Registro entra siempre con sus datos en vivo. No queda escuchando. `avBuild(docsAvm, docsAva)` es el mismo armado de la planilla.
- **Por partida y por piso:** avance de cada partida (solo filas con metrado) y de cada piso; tocar el nombre abre su planilla.
- **Global con pesos** (confirmado por el dueño el 25-11-2026: «por ahora está bien»; más adelante se verá si los pesos salen del presupuesto): `avp.peso` (sin valor = 1, todas pesan igual); global = Σ avance × peso ÷ Σ pesos de las partidas **con metrado**. En un piso solo cuentan las partidas con filas ahí. El peso se edita en la misma tabla (administrador y editores).
- **Avance de cada semana:** avance hasta el domingo − avance hasta el domingo anterior (`hasta` de `avGrpPct`), de las últimas 8 semanas; el corte inicial cuenta desde antes de la primera.
- **Curva** del global acumulado por semana (`avResCurve`, SVG a mano, hasta 26 semanas).
- **Excel** (`avResXls`, xlsx-js-style con `loadXlsx`): hoja «Resumen» (`avResSum`) y una hoja por partida con el aspecto de la planilla (`avResAoa`: una fila por fila y por etapa, una columna por día, cantidades). **PDF** (`avResPdf`, jsPDF + autotable): las dos tablas, sin la curva. Sirve para enviar al cliente.

## Importar (`avance-imp.js`)

- CSV o pegado de Excel. Encabezados (sin tildes ni mayúsculas, `AVI_COL`): `nivel`, `ambiente`, `cantidad` y la descripción: `descripcion`, `codigo` o las dos (queda «código · descripción»); `unidad` es opcional (sin ella, «und»). Las demás columnas se ignoran.
- **Cuadro de equivalencias:** cada nivel y cada ambiente del archivo se empareja con uno de la obra o «No importar». Sale solo si el nombre coincide (por `mnk`) y es único en ese piso, o si quedó guardado en `avp.eq`. Mientras falte alguno, «Importar» está apagado. Por defecto solo se listan los que faltan («Ver todos»).
- Resumen antes de importar (`avImpPlan`): filas nuevas, que cambian de metrado, iguales, sin importar y con error. Filas repetidas en el archivo (mismo ambiente, descripción y unidad) se suman.
- Volver a importar no duplica: la fila existente (mismo ambiente, descripción y unidad, comparados con `mnk`) conserva su id, su nombre y su avance, y solo cambia el metrado si es distinto; se corrige en **su** documento de piso.
- Todo va en un lote (`db.batch`): `avp.eq` y un `avm` por piso.

## Pruebas

- `tests/e2e/avance.spec.js` (9; incluye «fila de total, buscar, reordenar y rango» y «Resumen»): cálculo; registro con historial, confirmación al superar el metrado y fracción de unidad; interruptor Cantidad | %, pesos de etapas, unidades mezcladas y permisos de lectura; partida nueva, filas desde la tabla y etapas; importar con equivalencias; celular.
- `tests/rules/firestore.test.mjs` «avance: …».

## Pendiente

- El global del Resumen suma también lo registrado en días futuros; las columnas por semana llegan hasta la semana actual, así que pueden no cuadrar si se llenó hacia adelante.
- El buscador redibuja en cada tecla: con cientos de filas convendrá esperar unos 150 ms.
- Idea del dueño para más adelante: que los pesos de las partidas en el global salgan del presupuesto (hoy: peso manual, igual por defecto).
- El PDF no lleva la curva; el Excel no lleva los logos ni el encabezado de la empresa (`excel.js` `xHeader`).
- Copiar las filas de una partida a otra.
- El Resumen lee `avm` y `ava` enteras: con muchas partidas y semanas convendrá un resumen guardado.
- `ava.log` crece sin límite dentro del documento de la semana (y sobre todo en el de `ini`): vigilar el tamaño (límite 1 MiB); si hiciera falta, pasar el historial a una colección aparte. La regla solo exige que no se acorte.
- Restaurar un respaldo viejo no pisa los `ava` cuyo historial creció después (la regla lo rechaza): esos documentos se saltan.
- Equipo › Limpieza borra pisos y ambientes de verdad: debería avisar si un piso tiene filas de Avance (hoy quedarían con el nombre guardado en `an`).
- El SC lee todas las partidas (como el resto de LPS); revisar si entra a SEG-05 paso 2.
- `et` se reemplaza entero con `set` + merge: dos editores cambiando las etapas de la misma fila a la vez pueden perder una (su avance quedaría huérfano en `ava`). Si llega a pasar, usar una transacción.
- Lo escrito a medias en una línea nueva se pierde si el foco pasa a otra línea nueva y justo llega un dato (`renderAReg` solo protege la línea con foco).
- Quitar una etapa con avance deja ese avance en la base sin forma de recuperarlo desde la pantalla: decidir con el dueño si la etapa se archiva en vez de quitarse.
- Reordenar filas dentro de un ambiente (hoy van en el orden en que se crearon).
- Opcional, si el dueño lo pide: que el SC y su capataz registren solo su partida, y el puente con la Matriz o Productividad.
