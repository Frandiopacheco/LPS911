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

## Asistente de sectorización (`cs_ksec`, Configuración › Casco)
- Versiones por rango de niveles `{n, grp:'E'|'A', from, to (ids de nivel), k (sectores, máx. 8), names, met:{catId:[metrado por sector]}, note, ref (nivel donde se dibujó), vista (lámina base), geo:{i:[x,y,…]} (en píxeles de esa lámina), area:[m²]}`.
- **Plano** (izquierda, `__plano.ambMap` de plano.js): nivel y lámina base, chips por sector (con su área), **▭ Rectángulo** (arrastrar) y **⬠ Polígono** (tocar esquinas; cerrar en la primera, doble clic o Enter); el sector elegido muestra esquinas para ajustarlo; «Borrar el dibujo».
- **Área** = área del polígono × `mpp²` de la lámina (`laminas.plb.mpp`, solo si la lámina viene del módulo Planos: con su calibración o la escala nominal 1/100). Sin eso avisa «Lámina sin escala».
- **Ratios** (`mcat.rat`, metrado por m² de planta; columna «Ratio/m²» del catálogo): con dibujo, cada partida con ratio calcula su metrado = área × ratio (casillas en gris, solo lectura); las demás se escriben. Ratios por defecto (`CS_RAT`, elegidos por Claude para un edificio típico de concreto armado, el dueño los ajusta): por m² de techo acero de verticales 12 kg, encofrado de verticales 0,8 m², concreto de verticales 0,10 m³, desencofrado 0,8 m², encofrado de vigas y losa 1,15 m², acero de vigas y losa 16 kg, instalaciones en losa 0,25 pto, concreto de vigas y losa 0,20 m³; por m² de piso asentado de bloqueta 0,9 m², instalaciones en muros 0,2 pto, tabique 1.ª y 2.ª cara 0,5 m² cada una, instalaciones en tabiques 0,1 pto, tarrajeo 1,8 m². «Completar ratios por defecto» los pone donde falten (por partida típica).
- La tabla muestra área (con desviación entre los sectores dibujados), metrados por partida y la **carga** de cada sector en persona-días (Σ metrado ÷ rendimiento) con su desviación del promedio (verde ±10 %, ámbar ±20 %, rojo más).
- «Guardar y aplicar a los niveles» (`csSecApply`): en cada nivel del rango deja el grupo con esos sectores (crea los que faltan, renombra y pone `met`); los que sobran se archivan solo si no tienen actividades. **El dibujo pasa a la lámina base de cada nivel** que use el mismo plano del módulo Planos (`csGeoTarget`, escalado si la lámina mide distinto); los niveles con otro plano quedan sin dibujo (se dibujan en Sectorización). Cambiar desde un nivel no toca lo programado ni lo congelado de otros niveles. Con Deshacer.

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
