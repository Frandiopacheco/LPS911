# Interfaz: navegación, fecha, páginas, presentación y ayuda

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

## Interfaz: navegación, fecha y páginas (`js/interfaz.js`, `js/hoy.js`)

- **Pestañas por rol:** `TAB_ORDER` (orden Last Planner), `tabAllowed(t)` (quién puede abrirla), `tabPrimary()` (las de la barra según el rol) y `tabSecondary()` (van en el menú **Más**). `navApply()` las ordena en cada dibujo. Una pestaña nueva: agrégala a `TAB_ORDER`, `TAB_SHORT`, `tabPrimary()` del rol que la usa a diario y a `views` en `render()`.
- **Celular:** `bnavItems()` = 4 accesos por rol (+ «Más» con `bnavMore()`); íconos en `BNI`.
- **Inicio:** todos (menos el capataz) entran a **Hoy** (`renderHoy`, tarjetas por tema con `hoyCards()`); `#<tab>` en la URL abre otra pestaña.
- **Fecha única:** se elige arriba. `dateMode()` dice si la pestaña es por semana (`U.week`) o por día; el día común es `DAY_SEL` (`curDay()`, `daySet(d)`); `CU.date`, `indDay()` y `M.date` del plan diario lo usan. No agregues otro selector de fecha dentro de una pestaña.
- **Barra superior:** `topToolsApply()` muestra Exportar Excel solo en el Lookahead y deshacer/rehacer solo en `UNDO_TABS`.
- **Página:** las pestañas «página» empiezan con `pageHead(título, contexto, acciones)` (la acción principal con `.ib.pri`) y luego una barra de filtros `.fbar`; Lookahead y Plan diario son «herramientas» a todo el ancho. Las explicaciones largas van en `helpBox(resumen, html)`. En el celular los filtros secundarios van en `.fmore` con el botón `[data-ftog]`, y las tablas usan `table.rt` con `data-l` en cada celda para verse como tarjetas.
- **Modo presentación** (`js/presentacion.js`, estado `LKP`): pantalla completa con barra propia (`#presbar`), letra con `--pz` (CSS `zoom`), edición bloqueada por defecto (`canWrite=false` mientras dure), filtro por semana o día en la barra (`#pbwk`/`#pbday`, los mismos `U.wkF`/`U.day` que tocar el encabezado), puntero rojo y salida con Esc. Ojo: `PRES` ya es el mapa de «conectados».
- **Ayuda** (`js/ayuda.js`): botón «? Ayuda» de la barra superior (`#bhelp`, oculto en celular), «Más» del celular (`data-act="help"`) y menú del capataz (`data-do="help"`) llaman `ayOpen()`. Flujogramas como datos en `AY_FLOWS` (nodos `{o}` inicio/fin, `{p,d,tab,w}` paso, `{q,y,n,yl,nl}` decisión, `{r}` retorno) y la lista por rol en `AY_ROLE` (`cal` = área de Calidad, `ayRoleOf()`; con «Ver como» sale la del rol simulado). El administrador real (`me.realAdmin`) elige cualquier rol (`#ayr`). Un paso con `tab` solo es botón si `tabAllowed(tab)`. Se arma al abrir (no pesa al cargar). **Si cambias un flujo de la app, actualiza su flujograma aquí.** Prueba: `tests/e2e/ayuda.spec.js`.
- **`lqModal`** (liberaciones.js, también Ayuda, Historial y plano.js): si la ventana ya está abierta solo cambia el contenido de `.lqc` (sin animarla otra vez, conserva desplazamiento y foco); redibujar con cada chip ya no parpadea.
- **Hoy › Cambios del plan** (`cplan`, hoy.js): reprogramaciones de ayer, hoy y el próximo día hábil según las marcas `acts.rpl` (sin `tr`): el SC ve las de su partida, el editor las de sus pisos, campo y admin todas.
- **Equipo:** los grupos por rol son plegables (`[data-tgrp]`, `U.teamOpen` guardado); con búsqueda o filtro se abren todos.
- **Ver como / Vista celular** también arriba a la derecha (`#bvat`, `#bpht` en index.html, `topToolsApply`): solo administrador real en la copia de prueba, ocultos en el celular.
