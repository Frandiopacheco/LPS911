# Módulo Planos (biblioteca de planos del proyecto)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca el módulo Planos.

## Qué es

Un **módulo aparte** (como el Tareo): el selector de la barra superior cambia entre «Last Planner», «Tareo» y «Planos». Reúne los ~300 planos del proyecto (PDF exportados desde AutoCAD) para que todo el equipo los consulte rápido, en alta definición, con filtros por piso, especialidad y tipo. Decidido con el dueño (oct 2026):

- **PDF, no DWG.** Exportados desde AutoCAD con `DWG To PDF.pc3`, papel del tamaño real (el formato del proyecto es 1200 × 900 mm, escala 1/100), Extensión + Ajustar al papel, CTB de cada especialidad, una lámina por archivo, mismo nombre del DWG.
- **Alta definición con mosaicos**: el PDF se dibuja **en la PC de quien carga** a 300 dpi del tamaño real (máx. 16 000 px por lado) y se corta en mosaicos de 1024 px por niveles (cada nivel la mitad del anterior). El visor carga primero el nivel grueso y, al acercar, solo los mosaicos visibles del nivel que corresponde. Medido con la AG03 real (120 × 90 cm): 14 175 × 10 629 px, 5 niveles, 215 archivos, 6,5 MB, ~18 s de proceso.
- **Fase 1 (esta):** biblioteca, carga masiva y visor. **Después:** que la Sectorización y el Plan diario tomen su lámina base de aquí (alineación por puntos ya existe en `plano.js`), anotaciones.

## Pestañas (`PLA_TABS`)

| id | Nombre | Quién |
| --- | --- | --- |
| `pbib` | Planos (biblioteca + visor) | `canPla()`: todo el equipo de LPS menos el capataz de un SC |
| `pcar` | Cargar planos | `plaEd()`: admin, editor y Oficina Técnica (`isOTArea()`: rol `area` con área «OT» u «Oficina Técnica»; reglas `isOT()`) |

`U.mod==='pla'`. En `base.js`: `canPla`, `plaEd`, `modOk(m)`, `MODS()` (módulos que puede abrir; el selector `#modsel` se arma con ellos y aparece si hay más de uno), `tabMod(t)`, `modHome(m)`, `offLps()` (Tareo o Planos: se ocultan piso, semana, deshacer y exportes de LPS; CSS `body.mod-pla`). La suscripción a `plb` es perezosa: empieza al abrir el módulo (`plSub()`), no carga nada para quien no entra.

## Datos

- Firestore `plb/{id}`, `id = <disc>_<cod>` (p. ej. `ARQ_AG03`): `{cod, disc, niv, pisoId, tipo, tit, eta, fname, fsize, rev, base, W, H, Z, T, mm:[ancho,alto], rot:{cod, ok}, revs:[{rev, base, W, H, Z, mm, fname, ts, byN}], by, byN, ts, arch?}`.
  - `disc`: especialidad del plano (`PL_DISC`: ARQ, EST, IS, IE, IM, COM, ACI, DACI, GAS, SEG, OTR). **No** es la lista de especialidades/partidas de los SC de Configuración.
  - Mismo `id` = **nueva revisión**: `rev+1`, nueva carpeta `r<rev>` y la anterior pasa a `revs`. El mismo archivo (nombre y tamaño) se marca «ya cargado» y no se procesa.
  - `rot`: código leído del rótulo (texto más grande con forma de código); `ok` si coincide con el del nombre.
  - Reglas: lee `plaRead()` (equipo LPS sin capataz), escribe `canEdit() || isOT()` con `plbOk()`; nadie borra (archivar = `arch:{t,by,n}`).
- Firebase **Storage** (`firebase/storage.rules`), carpeta `planos/<id>/r<rev>/`: `th.webp` (miniatura 480 px), `<z>/<x>_<y>.webp` (mosaicos; z=0 es el detalle) y `orig.pdf`. Se usa la **API REST** (`firebasestorage.googleapis.com/v0`) con `Authorization: Firebase <idToken>` (sin SDK de Storage). Las reglas leen `members` de Firestore (`firestore.get`). El CI instala las reglas y el CORS del depósito (`firebase/storage-cors.json`) en un paso aparte que **no corta** la publicación si Storage no está activado.
- Caché en el equipo: Cache API `lps-planos` (las rutas no cambian nunca: cada revisión tiene su carpeta).
- El documento se escribe **después** de subir todos los archivos: nunca aparece un plano a medias.

## Visor (`plTiles`): un solo lienzo

Un `<canvas class="plcv">` (con `devicePixelRatio`, máx. 2,5) donde cada cuadro se dibujan los mosaicos ya decodificados (`createImageBitmap` → `ImageBitmap`), primero los niveles gruesos y encima los finos, con fundido de 140 ms y medio píxel extra contra las juntas. Nunca hay un cuadro en blanco: el nivel grueso siempre está cargado. Memoria: máx. `PL_CAP` (56) mosaicos decodificados; se sueltan (`close()`) los que no hacen falta, los más viejos primero, nunca el nivel grueso. Zoom animado (`V.zoomAt` → `V.animTo`), inercia del arrastre (`fling`) y del pellizco (`zfling`: al soltar los dedos el zoom y el centro siguen y frenan; `PL_ZOOM_DECAY`=0,94 y `PL_PAN_DECAY`=0,95 por cada 16 ms, según el tiempo real entre cuadros; velocidad de los últimos 60 ms; simétrica al acercar y alejar), doble toque; precarga del 30 % alrededor y del nivel siguiente. **Antes** eran `<img>` sueltas que se reacomodaban al terminar cada gesto: en tablets Android parpadeaba (oct 2026). `V.loaded()` = mosaicos dibujables (pruebas). **Dedos:** un toque nuevo (`isPrimary`) limpia los dedos «fantasma» que la tablet no avisó al levantarse (antes el pellizco contaba 3 dedos y no hacía zoom); el pellizco usa los dos últimos; el dedo que queda al terminar un pellizco (`afterPinch`) no arrastra ni corta la inercia del zoom hasta levantar todos los dedos; `lostpointercapture`/`touchend` sin dedos limpian todo. **Doble toque** se detecta al levantar (dos toques cortos, quietos y cercanos en < 0,3 s), nunca al apoyar: antes, tocar y empezar a pellizcar disparaba un zoom animado que peleaba con el pellizco.

## Navegar sin salir del visor

- **☰ Planos** (arriba a la izquierda): panel con buscador y chips de piso, especialidad y tipo (`PLV.pf`; especialidad y tipo se recuerdan en `lps911.plvf`, el piso abre en el del plano actual). Tocar un resultado abre esa lámina y las flechas ‹ › recorren esos resultados.
- **Fila «Mismo punto»** (`plSameSpot`): láminas del mismo piso y tipo; tocar una abre esa especialidad **en la misma zona y con el mismo zoom** (`V.getView()`/`V.setView()` en coordenadas normalizadas de la hoja: sirve porque las láminas de un piso tienen el mismo formato y encuadre). **▲ ▼** (`plFloorStep`): misma especialidad y tipo en el piso de arriba/abajo, con el título más parecido (agua ↔ agua), también en la misma zona.

## Sin conexión (solo tablet)

`plTablet()` (pantalla táctil y lado menor ≥ 600 px; no celular ni PC). Botón «⤓ Sin conexión» en la biblioteca (guarda los planos de la lista filtrada, actualiza los de revisión nueva, quita) y en el visor (un plano). Baja **todos** los mosaicos (`plPaths(p)`) con `plGet` a la caché `lps-planos`, pide `navigator.storage.persist()` y revisa el espacio. Lo guardado se anota por equipo en `localStorage` `lps911.ploff` `{id:{rev,base,t,mb}}`; revisión nueva → «⟳ actualizar» y, al guardarla, se borra la carpeta de la anterior (`plOffDrop`). `plb.sz` = bytes subidos (para estimar MB; si falta, 7 MB).

## Lector de nombres (`plParse`)

Nomenclatura `2459243-PTSA-XXX-<NIVEL>-P2D-<ESP>-E05-<COD>_<TÍTULO>`. Se ubica el token de etapa (`E05`, también `EO5`) y desde él: código (siguiente), especialidad (anterior; `AFC`/`DES`/`AGDES` → IS) y nivel (dos antes, saltando `P2D`/`P3D`/`M3D`). `ZZZ`/`XXX` → piso por el título («PLANTA SEGUNDO PISO», «SÓTANO», «AZOTEA»…). Se quitan `-Model`, fechas finales (`22.10.25`) y `_RAPM_220524`. El piso se busca por código en `S.pis` (P01→P1, S01→S1/S0, AZO→AZ). Todo se puede corregir en la tabla antes de procesar.

## Pruebas

`tests/e2e/planos.spec.js`: selector y roles, lector de nombres, carga de un PDF generado (pdf.js servido desde `node_modules/pdfjs-dist`, Storage simulado reemplazando `plPut`/`plGet`), mosaicos esperados por nivel, visor que pide solo mosaicos visibles al acercar, nueva revisión. Reglas: `tests/rules/firestore.test.mjs` («planos: …»).

## Modelo 3D (beta, solo el administrador)

Pestaña `p3d` del módulo Planos (`web/js/planos3d.js`). Experimental para evaluar en la tablet (oct 2026). Reconstruido sobre **That Open Components** (MIT) en la etapa 1; la meta es vincular el modelo con el Last Planner (ambientes ↔ Sectorización y Matriz, colores por estado) en etapas siguientes.
- **Visor empaquetado aparte** en `web/vendor/visor3d/` (three.js 0.186, `@thatopen/components` 3.4.9, `fragments` 3.4.8, `camera-controls` 3.1.2, web-ifc 0.0.77), fuente en `scripts/visor3d/` (`npm install && node build.mjs`; el resultado se sube al repo porque la app no tiene empaquetador). `visor3d.js` (~2,3 MB; web-ifc se reemplaza por un *stub*, `stubs/web-ifc.js`) + `visor3d-worker.js` (~1,2 MB) se bajan al entrar; `ifc-import.js` (~3,8 MB) + `web-ifc.wasm` solo al cargar IFC. `window.Visor3D = {convert(file,onProgress), create(host,{preset,logo})}`. Archivos: `src.js` (motor: mundo, cámara, visibilidad por capas, selección, vistas, rendimiento), `levels.js` (pisos), `props.js` (paleta), `section.js` (cortes, sobre `Clipper`), `measure.js` (medir). Ojo: aparece el aviso «Multiple instances of Three.js» (viene de components; no es error).
- **Cámara:** `OrthoPerspectiveCamera` (camera-controls) con inercia (`smoothTime` 0,32; `draggingSmoothTime` 0,09); un dedo gira, dos dedos acercan y mueven, tres mueven; ratón: izquierdo gira, derecho/medio mueve, rueda acerca hacia el cursor. Dibuja **bajo demanda** (`RendererMode.MANUAL`): en reposo no hay cuadros. Se encuadra con `fitToSphere` (`fitToBox` fuerza ejes).
- **Carga:** «Cargar IFC…» convierte cada IFC **en la PC** a `.frag` (ARQ 107 MB → ~18 MB, AFC → ~6 MB) y lo sube a Storage `modelos/<esp>/r<rev>.frag`; Firestore `p3d/<esp>` `{disc, nm, path, rev, fsize, isize, secs, by, byN, ts}` (reglas `p3dOk`, cargan admin/editor/OT). La especialidad sale del nombre (`…-M3D-ARQ-E05.ifc` → `ARQ`). Se cargan solas ARQ, EST y AFC (o todas si hay ≤ 3); el resto con su chip.
- **Interfaz de tablet:** barra inferior (`.p3dock`: Pisos, Cortes, Medir, Vista, Mostrar, Fluidez) que abre paneles (`.p3pn`); paleta de propiedades (`.p3prop`) al tocar un elemento, con Aislar / Ocultar / Transparentar / Atenuar el resto / Enfocar / Caja aquí / ＋Varios. En celular (≤ 760 px) los paneles van como hoja sobre la barra. Atajos de teclado: Esc, H/Supr (ocultar), I (aislar), T (transparentar), Mayús+A (mostrar todo). Los controles táctiles miden ≥ 44 px.
- **Visibilidad por capas:** especialidad · piso · ocultos · aislado · transparentes (opacidad 0,12). «Mostrar» las limpia (el contador en el botón dice cuántas modificaciones hay).
- **Pisos:** `IfcBuildingStorey` de cada modelo unidos por nombre («2. SEGUNDO PISO» = «SEGUNDO PISO») y los niveles `…FL` sumados al piso de encima; al elegir uno se aísla y se corta a 1,3 m (ajustable) sobre el piso. Altura real del piso = cara superior más común de sus losas (ponderada por área), en coordenadas del mundo (`model.object.position`). «Planta 2D» = ortogonal desde arriba.
- **Cortes:** tocar una superficie crea un plano 2 cm dentro del elemento (evita parpadeo) con flechas para moverlo; **caja de sección** alrededor de todo el modelo, el piso o la selección (6 planos con flecha). Se pueden invertir, ocultar las flechas y quitar. **Medir:** toque en A y en B (se ajusta al vértice más cercano a 22 px); muestra total, ↔ horizontal y ↕ vertical; temporal.
- **Fluidez:** panel «Fluidez» con medidor en vivo (FPS, cuadro típico, llamadas, triángulos), tres calidades (`alta`/`equilibrada`/`rapida` = resolución × calidad de malla; en tablet arranca «Equilibrada»; se guarda en `lps.p3q`) y una prueba de 4 s. En el sandbox de desarrollo no hay GPU (WebGL por software, ~2 FPS en ambos visores), así que **solo se midieron cosas relativas**; la medición real se hace en la tablet con ese panel.
- **Pruebas:** `tests/e2e/modelo3d.spec.js` (convierte un IFC sintético en Chromium, pisos, planta, cajas, toque, ocultar, medir, gestos táctiles por CDP, volver a la pestaña). `scripts/visor3d/tools/make-ifc.mjs` genera IFC sintéticos; `scripts/visor3d/harness/` es una página de prueba del motor solo (`node harness/serve.mjs`, con `IFC_DIR`/`FRAG_DIR`).
- **Pendiente:** el IFC de arquitectura no trae ambientes (`IfcSpace`: solo 2); para vincular con la Matriz hay que reexportar con Rooms/Spaces (ya pedido a la oficina del proyectista). Etapas siguientes: ambientes ↔ Sectorización/Matriz, colores por estado.

## Medir (`web/js/planos-medir.js`, oct 2026)

Botón **📏 Medir** en la barra del visor: distancia, poligonal y área sobre la lámina, con una barra flotante (`.plmbar`). Decidido con el dueño: **calibrar cada lámina** con una medida conocida (no confiar en la escala nominal; la exportación usa «Ajustar al papel», así que puede no ser exactamente 1/100).
- **Coordenadas:** los puntos se guardan en «coordenadas del plano» (píxeles del nivel de detalle, W × H), no de pantalla: la medida no cambia con el zoom. `plTiles` expone `V.toWorld(cx,cy)`, `V.toScreen(wx,wy)`, `V.W/V.H`, `V.cv`, `V.getDpr()` y los ganchos `V.over(g,V)` (dibujo al final de `V.paint`, en el mismo lienzo), `V.onTap` (toque corto < 400 ms; mientras existe **no hay doble toque de zoom**), `V.onDown/onDrag/onUp` (tocar un punto puesto lo arrastra y no mueve el plano). Con un dedo, arrastrar sigue moviendo el plano y pellizcar sigue acercando.
- **Calibración:** `plb/<id>.cal = {mpp, rev, L, px, by, byN, ts}` (`mpp` = metros por píxel; solo vale para la revisión `rev` que se calibró). La guardan admin, editores y Oficina Técnica (`plaEd()`) sobre la revisión vigente; no requiere cambios de reglas (`plbOk` no restringe campos extra). Quien no puede escribir, o mira una revisión anterior, calibra **solo en su equipo** (`PLM.loc`, no se guarda). Se avisa (`uiAsk`) si la escala sale más de 5 % distinta de la nominal 1/100 (`plmNominal`: ancho del papel `mm[0]` / `W` × 0,1 m por píxel) y antes de reemplazar una calibración oficial distinta en más de 2 %.
- **Herramientas:** `dist` (2 puntos; el tercer toque empieza otra), `poli` (longitud total y por tramo), `area` (polígono; área y perímetro) y `cal`. Cada una conserva sus puntos al cambiar de herramienta (`PLM.L`); Deshacer / Limpiar / ✓ Listo (Esc sale de medir antes de cerrar el visor). Al cambiar de lámina o revisión las marcas se limpian.
- **No se guardan las mediciones** (son temporales, a propósito: el visor debe seguir rápido y no hay datos de obra en juego). Cuentas puras: `plmD`, `plmLen`, `plmArea`, `plmFmtL/A` (probadas en `planos.spec.js`).
- **Precisión:** a 300 dpi y 1/100, un píxel del plano ≈ 8,5 mm reales; con buen zoom se mide a ±1–2 cm. Es una medida a mano alzada sobre una imagen (sin imán a las líneas del DWG): sirve para chequeos de obra, no para metrados formales. Posible mejora: imán a líneas leyendo `orig.pdf`.
- **Táctil:** al arrastrar un punto aparece una lupa 3× sobre el dedo (`plmLupa`).
- **Cursor (mouse):** en modo medir el visor lleva la clase `.medir` y el cursor es una cruz fina con el centro libre (SVG en CSS, punto activo en el centro) en vez de la manito de mover el plano; sobre un punto ya puesto pasa a «mover» (`.sobre`, `plmHover`). Al salir de medir vuelve la manito.
