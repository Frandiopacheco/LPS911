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

## Visor suave (`plTiles`)

Los mosaicos viven en una capa (`.plvl`); durante el gesto solo cambia la transformación de la capa (`translate3d`+`scale`, una por cuadro) y al quedar quieto 140 ms (`V.idle`) se reacomodan a su tamaño real (`V.relayout`, nítido). Zoom animado hacia el punto (`V.zoomAt` → `V.animTo`, interpolación por cuadro), inercia al soltar (`fling`), fundido al aparecer cada mosaico (`img.ok`, apagado con «reducir movimiento»), precarga del 35 % alrededor de lo visible y del nivel siguiente. Rueda del mouse = zoom animado; touchpad: dos dedos desplaza, pellizco (ctrl+rueda) acerca sin animar.

## Sin conexión (solo tablet)

`plTablet()` (pantalla táctil y lado menor ≥ 600 px; no celular ni PC). Botón «⤓ Sin conexión» en la biblioteca (guarda los planos de la lista filtrada, actualiza los de revisión nueva, quita) y en el visor (un plano). Baja **todos** los mosaicos (`plPaths(p)`) con `plGet` a la caché `lps-planos`, pide `navigator.storage.persist()` y revisa el espacio. Lo guardado se anota por equipo en `localStorage` `lps911.ploff` `{id:{rev,base,t,mb}}`; revisión nueva → «⟳ actualizar» y, al guardarla, se borra la carpeta de la anterior (`plOffDrop`). `plb.sz` = bytes subidos (para estimar MB; si falta, 7 MB).

## Lector de nombres (`plParse`)

Nomenclatura `2459243-PTSA-XXX-<NIVEL>-P2D-<ESP>-E05-<COD>_<TÍTULO>`. Se ubica el token de etapa (`E05`, también `EO5`) y desde él: código (siguiente), especialidad (anterior; `AFC`/`DES`/`AGDES` → IS) y nivel (dos antes, saltando `P2D`/`P3D`/`M3D`). `ZZZ`/`XXX` → piso por el título («PLANTA SEGUNDO PISO», «SÓTANO», «AZOTEA»…). Se quitan `-Model`, fechas finales (`22.10.25`) y `_RAPM_220524`. El piso se busca por código en `S.pis` (P01→P1, S01→S1/S0, AZO→AZ). Todo se puede corregir en la tabla antes de procesar.

## Pruebas

`tests/e2e/planos.spec.js`: selector y roles, lector de nombres, carga de un PDF generado (pdf.js servido desde `node_modules/pdfjs-dist`, Storage simulado reemplazando `plPut`/`plGet`), mosaicos esperados por nivel, visor que pide solo mosaicos visibles al acercar, nueva revisión. Reglas: `tests/rules/firestore.test.mjs` («planos: …»).
