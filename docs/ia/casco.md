# Módulo Casco (estructura, albañilería, tabiques y tarrajeo por sectores)

Parte de la guía para IA (ver `CLAUDE.md`). Léela si tu tarea toca el módulo Casco, el prefijo `cs_` o `scripts/reglas-casco.mjs`.

Decidido con el dueño (26-10-2026). La etapa de casco se programa distinto que la de arquitectura: pocas partidas que avanzan en **tren** por sectores. Va en un módulo aparte para no complicar el Last Planner por ambientes, pero **reutiliza todo el motor**: restricciones, plan semanal congelado, PPC, campo (inicio, detenido y cierre del capataz), plan diario sobre el plano, liberaciones, indicadores, tablero, hitos y avisos.

## Espacio de datos propio (prefijo `cs_`)
- Selector de módulos: «Last Planner», «**Casco**», «Tareo», «Planos». `U.mod='cas'`. Pasar entre Last Planner y Casco **recarga la página** (`goMod`, base.js) con `localStorage['lps.ns']='cs'`: así nunca se mezclan datos en memoria. Tareo y Planos no recargan (sus colecciones son compartidas).
- `DNS` (`''` o `'cs_'`) y `CS()` (base.js). `fcol(n)` antepone `cs_` salvo a las colecciones compartidas `DSHARED` (equipo `members`/`inv`/`clock`, tareo, módulo Planos `plb`/`eto`/`p3d`, `hhpc`, avisos `push`/`pushp`/`pushlog`). **La misma lista** está en `scripts/reglas-casco.mjs` (`SHARED`) y `functions/index.js` (`SHARED`): si agregas una colección compartida, cámbiala en los tres.
- `fcolLp(n)`: colección de Last Planner sin prefijo aunque se esté en Casco (la usa la entrega a Arquitectura: `hitos`, `pisos`).
- `store` (localStorage de la interfaz) usa `lps911.cs.<clave>` en Casco: filtros, piso y pestaña no se cruzan.
- Presencia (Realtime Database): cada uno manda `ns`; «conectados» muestra solo a los del mismo módulo.
- Quién ve Casco: quien ve Last Planner (menos el capataz) cuando existe `cs_meta/project` (`CASCO_ON`, se lee al entrar); el administrador siempre (para crearlo).
- En Casco no están las pestañas Matriz ni Cliente (`tabAllowed`), ni el botón «Habilitar propuestas»: se programa en la reunión con los capataces, sin propuestas de los SC (decisión del dueño). Si algún día hacen falta, se podrían habilitar por partida.

## Reglas (`scripts/reglas-casco.mjs`)
- La sección entre `// ==== CASCO …` y `// ==== FIN CASCO ====` de `firebase/firestore.rules` **se genera**: copia todas las reglas de Last Planner con las funciones renombradas (`_cs`), las rutas `/x/` → `/cs_x/` (también en `get()`/`exists()`), los nombres de colección de `dataCol` y del `match /{col}/{id}` genérico con prefijo, y sin las colecciones compartidas.
- **Nunca edites esa sección a mano.** Cambia las reglas de Last Planner y corre `node scripts/reglas-casco.mjs`. `scripts/check.mjs` (y por tanto CI) falla si quedó desactualizada.
- Colecciones solo de Casco: `ksec` (versiones de sectorización). Están en `dataCol` de Last Planner (sin uso ahí) para que la copia las tenga.
- Pruebas: «casco: …» en `tests/rules/firestore.test.mjs`.

## Servidor (`functions/index.js`)
- `db()` devuelve la base del espacio en curso (`AsyncLocalStorage` `NSC`, `nsWrap` antepone `cs_`). `eachSpace(nombre, fn)` corre la tarea en Last Planner y, si existe `cs_meta/project`, en Casco; un error en uno no frena el otro (se relanza al final para el reintento).
- Con `eachSpace`: `versionDominical`, `aceptarCierres`, `congelarSemana` (con re-congelar y migración wsnap) y `cerrarPlan`. `emitirCliente` solo Last Planner (Casco no tiene versión cliente).
- `avisoDetenido` recibe `ns` de la página (`avisos.js` lo guarda en la cola al encolar).

## Modelo
- **Niveles** se manejan en **Configuración › Casco › Niveles** (admin y editores): nombre, código (selector), código de techo y de piso editables (se guardan al salir de la casilla, `csLvSet`); ▲▼ reordena (`csLvMove`, el orden va de abajo hacia arriba); «+↑ / +↓» agrega un nivel antes o después (`csLvAdd`, p. ej. otro sótano o la azotea; con su escalera); «×» archiva el nivel con sus sectores y actividades (`csLvDel`, avisa cuántas; Deshacer y Papelera); «+ Niveles al final» (`csLevelsAdd`). Todo con `apply` (Deshacer). No uses el «+ Piso» de la grilla para Casco: no pone techo, piso ni escalera.
- **Láminas por nivel (columnas Encofrado y Arquitectura de Niveles):** cada nivel puede tener dos láminas base tomadas del módulo Planos: **Encofrado (techo)** = plano `EST` y **Arquitectura (piso)** = plano `ARQ` (dos vistas del nivel en Sectorización y el Plan diario). Sugerencia automática (`csLvSug`): mismo nivel en `plb.niv` (nivel con número n → `P<n>`, sótano → `S1`, azotea → `AZ`), prefiere tipo Planta y, en EST, «encofrado» en el título. ✓ vincula la sugerida, la lista permite elegir otra y «Vincular sugeridos (N)» hace todas (`csLvLink` → `__plano.lamFromPlb`, sin diálogo, fija en la revisión vigente). Una lámina vinculada muestra código y revisión, y avisa si en Planos hay una revisión nueva (se cambia en Sectorización, menú de la lámina). Se reconoce por `laminas.plb.disc`.
- **Nivel = piso** (`cs_pisos`): `{name:'Nivel 3', code:'N3', tc:'T3', pc:'P3', order, lp?}`. `tc` = techo (estructura), `pc` = piso (albañilería), `lp` = piso de Last Planner al que se entrega.
- Cada nivel tiene hasta tres grupos (`cs_sectors.grp`): `E` **Estructura** (planta de encofrado del techo N: losa y vigas, con las columnas y placas que la sostienen), `S` **Frentes sueltos** (escalera, cisterna: fuera del ritmo de los sectores) y `A` **Albañilería, tabiques y tarrajeo** (planta de arquitectura del piso N, entre el techo N−1 y el techo N).
- **Sector = ambiente** (`cs_ambientes`): `{sectorId, code:'S2'|'A2'|'ESC', name, order, met:{catId:metrado}, ksec?}`. Así el plan diario dibuja los sectores en la lámina del nivel y todo lo demás funciona igual.
- Frontera con Last Planner (decisión del dueño): lo que **divide o atraviesa ambientes** (muros, armado y emplacado de tabiques, instalaciones empotradas) y el **tarrajeo** (acabado húmedo, se programa en tren) van por sector en Casco; lo que **se termina dentro de un ambiente** (acabado de cada cara, pisos, carpintería, aparatos) va por ambiente en Last Planner.
- **Catálogo de casco** = `cs_mcat` (el mismo `mcat` de la Matriz, así «Por personal», el rendimiento y el vínculo de nombres funcionan): `{name, sc, und, rend, grp, tr (orden), off (desfase en días), dur (días por sector), vac (vaciado), ent (entrega a Arquitectura), mets (metrado típico por sector), cl:'t', al}`. Se edita en Configuración › Casco (se guarda al salir de cada casilla). «Cargar catálogo típico» si está vacío.
- **Ejecutor** = `contractors` con `casa:true` para las cuadrillas de casa (Configuración › Casco › Ejecutores). El PPC se mide por ejecutor como por SC.

## Lookahead › Vista › Tren (`csTrenRender`, casco.js)
- Partidas en filas (catálogo por grupo y en orden; aparte, nombres que no están en el catálogo), días en columnas; cada celda lleva chips `T3·S2` (estructura y frentes sueltos: techo) o `P1·A2` (albañilería: piso), coloreados por sector (S1…S4, `.csk.k0…k3`).
- Marcas: borde = vaciado (`vac`) con estado de la liberación (✓ liberada, ◷ programada, ! observada); `R` = restricción abierta; punto verde = cumplido; tachado = no cumplido; ◆ = entrega.
- Pie: personal necesario por día (casa y SC), con `persOf`/`persRend` (metrado del día ÷ rendimiento).
- Tocar un chip abre la ficha (`csChipPop`): nivel, sector, días, ejecutor, metrado, rendimiento, personal, liberación y restricciones; en «✎ Programar», ‹ 1 día / 1 día › (`csShift`, con Deshacer; hoy y lo pasado solo el administrador) y «Ver en la grilla».
- «Grilla» muestra lo mismo por nivel y sector (el lookahead de siempre). Durante la revisión de propuestas se usa la grilla (`lkFlowOk`).

## Generador del tren (`csGenPlan`, `csGenOpen`)
- Rango de niveles, inicio (desde mañana), ritmo (1 sector por día o cada 2), días tras vaciar la losa del S1 para empezar el techo siguiente (`gap`) y desde qué techo empieza la albañilería del piso N (`N+albK`, por defecto N+2).
- Estructura: el techo k empieza `offVL + gap` días hábiles después del anterior (`offVL` = desfase de la partida de vaciado más tardía). Sector s de una partida: inicio del techo + `off` + s × ritmo; dura `dur` días hábiles.
- Frentes sueltos: inicio del techo + `offVL` + 1 + `off`.
- Albañilería del piso k: empieza el día hábil siguiente a vaciar el último sector del techo k+albK; cada sector avanza cada `max(dur)` días.
- Contra lo existente (misma partida en el mismo sector, por catálogo o nombre): conserva los días de hoy y pasados, reemplaza los futuros y reparte el metrado restante; crea lo que falta (con `metrado` del sector `met[catId]` o `mets`, `qa:true`). **Nunca programa hoy ni días pasados.**
- Hasta 450 cambios van en un `apply` (con Deshacer y en el historial); más, en lotes directos (avisa que no hay Deshacer).

## Entrega por sector a Arquitectura
- La partida con «Entrega» (`ent`) del catálogo (en el ejemplo, después del tarrajeo) marca cuándo el sector queda listo para acabados.
- Configuración › Casco › Niveles: cada nivel elige su **piso de Last Planner** (`pisos.lp`). «◆ Publicar entregas en Last Planner» (`csEntPublish`) crea o actualiza `hitos/cs_<actId>` **en Last Planner** (sin prefijo) `{n:'Entrega de Casco · P1 A2', tipo:'ini', d, d0, piso, st, real?, h, cs:true, csAct}`: aparece como rombo de inicio en el Lookahead de arquitectura. Si cambió la fecha, la agrega a `h`. Si el día de la entrega se marcó Cumplido, el hito queda cerrado.

## Flujo para empezar una obra desde cero (decidido con el dueño, 26-10-2026)
1. Cargar los planos en el **módulo Planos** (encofrado de cada techo y arquitectura de cada piso) y calibrar una lámina típica.
2. Crear Casco (Configuración › Casco) y los niveles (**+ Niveles**); en **Sectorización** agregar a cada nivel su lámina base **del módulo Planos** (encofrado del techo; en otra vista, la arquitectura del piso).
3. Catálogo: «Cargar catálogo típico» y ajustar ejecutores, rendimientos y **ratios**.
4. **Asistente de sectorización:** dibujar sectores de prueba (rectángulo o polígono) sobre la lámina de un nivel, ver áreas, metrados y carga; comparar alternativas (cada versión es un borrador hasta aplicarla).
5. Aplicar la versión elegida a un rango de niveles (crea los sectores con su dibujo) y lanzar el **generador del tren**.

## Niveles: agregar y vincular láminas (26-10-2026)
- «+ Agregar niveles arriba» (`csLevelsAdd`) acepta un **nombre** (un nivel, p. ej. «Azotea», código corto con `csLvAbbr`) o una **cantidad** (se numeran solos). Antes solo aceptaba un número y con un nombre no hacía nada.
- Vincular (✓, la lista o «Vincular sugeridos») va a una **cola** (`CS_LAMQ`, `csLvLink`): los clics durante una vinculación se suman; la tarjeta muestra el avance (`#cslamst`) y cada celda «Vinculando…/En cola…».
- `lamFromPlb` (plano.js) arma la lámina con los **mosaicos del módulo Planos** (`plbTiles`: el nivel más fino ≤ `FULL` px, de 8 en 8; ya vienen recortados al marco) y solo si falla baja el PDF original. Con `quiet:true` (`saveLam`) no cambia el nivel elegido ni la lámina abierta. `saveLam` guarda las partes de la imagen a la vez.

## Sectorización de Casco: frentes y asistente (`casco-sz.js`, F1 y F2, 27-10-2026, decidido con el dueño)
En Casco la pestaña **Sectorización** tiene tres vistas (`U.csSzV`, en `saveUI`): **Frentes**, **Sectores** (el asistente) y **Láminas** (la vista de siempre, `sectorizacion.js`, que en Casco recibe la barra `csSzNav`). `renderPlanos` delega en `csSzRender` salvo en Láminas. El asistente ya no está en Configuración (queda una tarjeta que lleva aquí).
- **Frente de trabajo** (`cs_kfr`, en `dataCol`): `{name, code (letra de sus sectores), color, from, to (niveles), order, vac (m³/día de vaciado), cua:{catId: personas}, cE:{ref, vista, pts}, cA:{…}}`. **Cada frente tiene sus propias cuadrillas** (decisión del dueño). Contorno por grupo sobre la lámina del nivel de referencia (`csLamOf`: EST para estructura, ARQ para albañilería); cambiar el nivel de referencia escala el contorno si es el mismo plano del módulo Planos, si no lo borra.
- **Escala** (`csScale`): la calibración vigente del plano en el módulo Planos (`plb.cal` de esa revisión, leída siempre del plano, no la copia al vincular) → «calibrada»; si no, la escala nominal 1/100 (`nom`, áreas aproximadas, botón «Calibrar en Planos» que abre el visor). `csAreas` (casco.js) también la usa.
- **Alternativa** (`cs_ksec`): `{n, fr, grp, mode:'j'|'f', jun:[{p:[x1,y1,x2,y2]}], shp:[{p:[…]}], met:{catId:[metrado por sector]} (solo partidas sin ratio), ritmo (1|2), rev, ap (vigente)}`. **Firestore no admite listas dentro de listas**: juntas y formas van como `{p}` y se leen con `csSzNorm`. Se guarda sola 600 ms después de cada cambio (`csSzSave`); Deshacer propio (`CSZ.hist`, botón y Ctrl+Z en la vista).
- **Juntas** (modo por defecto): dos toques; `csgSnap` la endereza (±5°) y la prolonga hasta el borde del contorno o la primera junta. Sectores = contorno partido por las juntas (`csgPieces`, recorte por semiplano), ordenados por la dirección de las juntas (`⇄ Invertir orden`). «÷ Dividir en N» (`csgDivide`): N de igual área con cortes verticales u horizontales; «⚖ Equilibrar» redistribuye juntas paralelas (con metrados por ratio la carga es proporcional al área). Elegir una junta (cerca de la línea) muestra sus extremos para moverla (`ambMap` admite `o.lines` y `edit.noMid`); Supr la borra. Modo libre: rectángulos y polígonos.
- **Indicadores** (`csSzEval`): I1 balance de carga (±10/20 %), I2 eficiencia de balance (Σ carga ÷ (n × máx.) y pers·día perdidos por desbalance), I3 cuadrilla necesaria (máx. metrado ÷ (rend × ritmo)) frente a la del frente, I4 concreto del sector más grande (partidas con vaciado y und m³) frente a la capacidad del frente, I5 ciclo (sectores × ritmo) y fin estimado (niveles × ciclo + largo del tren, desde mañana) frente al primer hito de fin, I6 cobertura del contorno y secuencia (cada sector toca al siguiente). Recomendación (`csSzRec`): mínimo de sectores que sostiene el ritmo con las cuadrillas del frente y la capacidad de vaciado.
- **Aplicar a niveles** (`csSzApply` → `csSecApply`): niveles del frente, lista de chequeo de juntas, nombres `A1…`; un grupo de sectores por nivel, grupo y frente (`sectors.fr`; con un solo frente adopta el grupo antiguo sin frente). La alternativa queda `ap` (vigente). Lo programado y congelado no cambia.
- Pendiente (F3): generador del tren por frente con ciclo y fin frente al hito; umbrales editables.

## Obra de ejemplo (solo copia de prueba, administrador, Casco vacío)
- Configuración › Casco › «Cargar obra de ejemplo» (`csDemo`): `cs_meta/project` copiado de Last Planner (semanas, calendario, horas de corte, causas), 5 ejecutores (Cuadrilla Ramos y Cuadrilla Quispe de casa; Aceros Andinos, Instalaciones Pacífico y Tabiques Lima), 18 partidas, sótano y 8 niveles (4 sectores de estructura hasta el techo 4 y 3 desde el 5; escalera; 3 sectores de albañilería por piso), 3 versiones de sectorización con metrados algo desbalanceados a propósito, y el tren desde mañana a partir del techo 3 (los techos del sótano al 2 se dan por hechos).

## Vaciar Casco (solo copia de prueba, administrador; 26-10-2026, decidido con el dueño)
- Configuración › Casco › «Vaciar Casco…» (`csVaciar`, `CS_VAC`): para empezar desde cero tras la obra de ejemplo. Pide escribir BORRAR y **borra de verdad** (no archiva) en `cs_`: niveles, sectores, actividades, semanas y wsnap, restricciones, avance y fotos, live, liberaciones, plan diario (`dplan`, `pdz`, `pzon`), láminas de Sectorización (`planos`, `laminas`, `lamimg`; los planos vinculados del módulo Planos quedan libres), versiones del asistente (`ksec`), `kcat`, hitos, no programado, índices, productividad, pull, `frev`, `pmet`, `lhidx`, `lhver`; y las entregas publicadas en Last Planner (`hitos` con `cs:true`).
- Opcional: ejecutores (`contractors`, marcado por defecto) y catálogo (desmarcado; se **archiva** porque las reglas no dejan borrar `mcat`).
- Se conservan siempre `cs_meta` (configuración), lo que las reglas no dejan borrar (`lhlog`, `mlog`, `mver`…), lo compartido (equipo, Planos, Tareo) y todo Last Planner. Solo corre si `DNS==='cs_'`.
- Borra por colección (lotes de 400); si una falla, sigue con las demás y lo dice. Al terminar recarga la página (en las pruebas, `window.__e2eNoReload`).

## Pruebas
- `tests/e2e/casco.spec.js`: obra de ejemplo en `cs_` sin tocar Last Planner, ficha y correr un día con Deshacer, generador (no programa hoy ni el pasado), asistente (balance y aplicar con 5 sectores), entregas como hitos de Last Planner, cambio de módulo con recarga y visibilidad para el editor. Para abrir Casco en una prueba: `localStorage['lps.ns']='cs'` antes de cargar (ver `casco()` en la prueba).
- Reglas «casco: …» en `tests/rules`.

## Pendiente / ideas
- Textos de la interfaz que aún dicen «piso» o «ambiente» en Casco (solo el selector principal dice «niveles»).
- Propuestas del SC por partida, si algún proyecto las pide (hoy no se ofrecen en Casco).
- Calcular metrados por sector desde el plano o el modelo (hoy se escriben en el asistente).
