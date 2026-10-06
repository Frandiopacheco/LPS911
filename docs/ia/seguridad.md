# Auditoría integral 02e575c: reglas live/fotos/dplan y otros

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

- **Informe externo (ChatGPT, auditoría integral 02e575c) aplicado:**
  - `live`: un capataz o SC solo escribe documentos de una actividad real de su partida: id = `fecha_actividad`, `sc` = el de la actividad y, si su sector indica piso, `pisoId` = ese piso (reglas `liveActOk`/`livePisoOk`). La página tampoco cuenta un cierre de otra partida (`liveOwn` en `doneRebuild`, `doneDates`, `recOf`, `autoAccept`) y el servidor lo descarta (`closesToAccept`). Todo `live` lleva `sc` (lo pone `liveWrite`); en las pruebas también.
  - `fotos`: se crean a nombre de quien sube (`by` = `mid()`: correo o `u_<uid>`); ya guardadas solo el administrador las cambia (`fotoNewOk`, rol calculado una vez por el límite de 1000 expresiones de las reglas). No se valida aún el registro asociado (ver pendientes).
  - `dplan` cerrado (con `ids` y sin `reo`): el editor no cambia `ids`, `log`, `date` ni `pisoId` (sí republicar igual); vuelve a publicar un día reabierto o sin foto. Borrar (= «Deshacer publicación») el editor solo días futuros (`dplanFuture`, hora de Lima); el administrador siempre.
  - Lo comprometido del día es la cantidad de la foto (`progOf(d,x)` en Campo: `dplan.ids[x]` si hay foto, si no la vigente); `baseRec`, la tarjeta de Campo y `closesToAccept` (recibe los `dplan`) la usan. El administrador puede rebajar la programación del lookahead, pero el PPC se mide contra lo publicado.
  - `bufSave` guarda solo la holgura tocada (`set` con `merge`, `FieldValue.delete()` para quitarla). `cliActs` se recalcula también si cambia `P().cal`. El PPC del cliente cuenta el cierre del capataz con `recOf` (respeta «Quitar registro»).
  - `npToLook` no vincula ni avisa si `apply` devuelve `false` (día cerrado).
  - Indicadores históricos con «Todos los pisos» usan `histPisoSet()` (incluye pisos archivados); el piso elegido sigue siendo solo ese.
  - Plan diario en el celular: con una cuadrilla elegida (`M.cqSel`, `innerWidth<900`) «Equipos del día» va plegado; tocar su encabezado termina el reparto y lo abre.
  - Publicación (`ci.yml`): `publicar-web` depende de `instalar`; sin llave de Firebase, `instalar` falla. `check.mjs` lo comprueba (`checkCI`). Los fallos de las pruebas de reglas salen como anotaciones (línea y motivo) en GitHub.
- `live` y el veedor (oct 2026): solo puede crear/actualizar el campo `seq` («en secuencia») de una actividad real (`liveActOk`); no inicia, detiene ni cierra (prueba en `tests/rules`).

## Límite de accesos en las reglas del tareo (oct 2026)

En `match /tareo/{id}` el guardado del capataz quedaba rechazado (PERMISSION_DENIED) al sumar otra rama que lee `members` (revisión de producción, `tOfiEd`), aunque esa rama fuera falsa: el pedido llegaba al límite de lecturas/evaluación. Regla práctica: **cada rama de un `allow` empieza por una condición que no lee documentos y que distingue a quién va dirigida** (p. ej. `resource.data.cap == mid()` para el capataz y `!= mid()` para la oficina), y solo después llama a funciones que leen `members`. Las pruebas de reglas no corren en el entorno de las IA (el emulador no descarga): se ven en GitHub.
