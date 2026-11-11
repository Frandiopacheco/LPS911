# Pendientes conocidos de las auditorías

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

## Pendientes conocidos (ver auditorías)

- Informe Lookahead/propuestas: **10** (que las reglas exijan ser responsable del piso para decidir una propuesta) quedó para después; hoy lo controla la interfaz (`canDecide`).
- Informe «propuestas tardías»: la hora de envío (`sentAt`) la pone el equipo del SC con `NOW()` (corregido con la hora del servidor); las reglas no la validan. La **revisión formal de la base congelada** (reemplazar un compromiso ya congelado por uno acordado después, con motivo y versión anterior) quedó para después; hoy: descongelar → recuperar.

- Auditoría 02e575c: las reglas de `fotos` exigen el autor, pero aún no comprueban que la foto pertenezca a un registro (daily, live, restricción, liberación, no programado) que esa persona pueda escribir. La **revisión formal** de un compromiso ya cerrado (versión, motivo y autor más allá de reabrir) sigue pendiente, igual que la de la semana congelada. El piso de un reporte en vivo solo se comprueba si el sector de la actividad tiene `pisoId`.

- Auditoría del ciclo diario (oct 2026), quedó para después: las reglas aún no exigen ser responsable del piso para escribir `acts` (las actividades no guardan su piso; es el pendiente 10); al detener una actividad en En obra no se ofrece crear la restricción (N09 de ChatGPT); bajas: la marca ↷ más reciente se usa sin límite de antigüedad (`rplFor`), un día reabierto (`reo`) no se vuelve a cerrar solo y el redibujo en cascada con muchos reportes en vivo (medir antes). Con varios usuarios, una ventanita abierta (Revisar) a veces se cierra cuando llegan datos de otros (lo anota `auditoria-ciclo`).
- Tanda B: avisos al celular (FCM), Lookahead que dibuje solo las filas visibles.
- Tanda C: proyecto nuevo guiado, ayuda táctil, fotos a Cloud Storage, App Check.
- Liberaciones: zonas como polígono (hoy rectángulo).
- Auditoría Matriz 08/10: los clientes con la versión anterior en caché no pueden guardar cambios del SC en la matriz hasta recargar (las reglas ahora exigen `l`). Los cambios de SC anteriores a esta versión no tienen `m.ok`: su «Terminado» queda «✓?» en el Lookahead hasta que un ingeniero lo confirme. Restablecer una foto (`mxFotoRestore`) sigue reemplazando lo marcado después (es la intención; solo el administrador).

## Módulo de casco: ya existe (ver `casco.md`)

- Se planteó para una próxima obra (esta ya está en acabados); desde el 26-10-2026 se desarrolla en `main` como módulo **Casco** con datos de ejemplo y **no va a producción** hasta que el dueño lo apruebe (regla 6 de `CLAUDE.md`). La vista principal es el tren (partidas en filas, sector en la celda).

## Ambientes desde el plano alistado (idea aprobada en principio con el dueño, 11-11-2026; por hacer)

Hoy los ambientes se escriben en el lookahead y luego se dibujan en Sectorización; lo correcto es al revés: **nacen del plano**. Proceso del dueño: niveles → cargar planos → frentes → sectorización → tren → lookahead → metrados → histograma de personal → balanceo de cuadrillas.
- **Dónde:** en **Sectorización**, por piso: «Traer ambientes del plano» (planta ARQ alistada; sus ambientes ya salen de `dxfRolesFix` + `plb.fix` con nombre y polígono). Tabla en tres grupos: nuevos (se crean en `ambientes` con su forma en `geo`), coinciden (se vinculan y toman la forma del plano, sin dibujar), solo en el lookahead (se quedan; nunca se borran solos). Los nombres se corrigen en la tabla y después en el lookahead sin perder el vínculo.
- **Sectores de las dos maneras, sincronizadas** (decisión del dueño): dibujar el sector sobre el plano (los ambientes cuyo centro cae adentro pasan a ese sector) o elegir el sector de cada ambiente en la tabla. Las dos cambian el mismo dato (`ambientes.sectorId`); la forma del sector se calcula del contorno de sus ambientes (no se guarda aparte), así nunca se contradicen.
- **Sin otra lista:** los ambientes siguen siendo los de Last Planner (`ambientes`); el plano es la fuente. Vínculo por **posición** calibrada con la malla de ejes (`plb.ok.fit`), no por nombre: con una revisión nueva del plano se muestran los cambios (área distinta, nuevos, ya no están) y el usuario decide; lo programado no se toca.
- **Área de cada ambiente** (m² del polígono): para metrar pisos, contrazócalos y pintura y alimentar el histograma de personal.
- Después: sugerir el tipo de ambiente por el nombre («SH…» → baño) para la Matriz.

## Ideas del dueño para más adelante (de su memoria del chat, oct 2026)

- **Valor ganado:** módulo aparte en una etapa siguiente, vinculando el catálogo de actividades con el catálogo de costos. No mezclarlo con el Last Planner (programar, liberar restricciones y medir la confiabilidad).
- **Avance del SC contra el lookahead** en la presentación del plan diario: gráfico de cuánto avanzó un SC en un piso frente a lo programado, eligiendo la ventana (semana, 3, 4 o 6 semanas, fin de proyecto).
- **Agenda de la reunión diaria** con tiempo por bloque.
- **Interruptor por partida / por ambiente** en el lookahead (lo único que le gustó del plan maestro retirado).
- **Matriz › Gráfico:** marcar estados desde el plano (segunda etapa; hoy solo se ve).
- **Celular del SC:** los borradores de sus propuestas se ven como oficiales; se dejó para después.
- **Modelo 3D:** sigue en beta (`planos.md`); la meta final es conectarlo al Last Planner.
- Evaluar una app nativa (iPhone/Android) solo si los avisos push de la web no bastan (`avisos.md`).

## Auditoría con datos reales (09/10/2026, respaldo de la obra)
Corregido en el PR «Auditoría con datos reales»:
- Eliminar restricción = archivar (`arc('restr')`, `ARCH.res`, Papelera en Configuración la muestra y restaura). Pide confirmación a todos.
- Rendimiento: `requestRemoteRender` (base.js) agrupa los redibujos que llegan de otros usuarios en vistas que tardan >120 ms (Plan semanal / Matriz con todos los pisos). Plan semanal: `actNum` memorizado por `DV`, `fieldSug` una vez por fila (`SUG`), `.plsecv` con `content-visibility:auto`. Medido con los datos reales: 1,0 s → 0,18 s por redibujo.
- PPC del SC con una sola fórmula: Tablero (`dashWeek`) y Excel del PPC usan `ppcOf`/`wkScStats`.
- Volver a publicar no reescribe una restricción `res-<borrador>` ya liberada (página `RLIB` y servidor `closePlanPiso`).
- «Aplicar registros de campo» ignora los cierres del capataz/SC sin confirmar (`_prop`): `fieldSug().prop` los muestra como «N por confirmar» y no concluye «No» (decisión del dueño: opción B).
Pendiente (no se tocó por decisión del dueño): la semana 58 quedó casi sin evaluar (PPC oficial 1 %).
Pendiente: Matriz con todos los pisos tarda ~0,5 s por dibujo (solo se agrupan los cambios ajenos; desde la auditoría núcleo REN-02 también los de `mcat`/`mamb`/`mver`/catálogo, `lib`, `nprog`, `lhprop`, `members`, cliente y `pdz`/`pzon`).
- Publicación de la página: desde oct 2026 va a Firebase Hosting (ya no Netlify); cada publicación cambia `VER` en `sw.js`, y eso dispara el aviso de «versión nueva» en los equipos abiertos.

## Auditoría SC ↔ ingeniero en propuestas (oct 2026), quedó para después
- Agregar un día con clic en una fila con cantidades por día lo deja sin cantidad (igual que en el lookahead normal).
- Reglas de `lhprop`: no revisan el contenido de `items` (un SC podría, desde la consola, proponer sobre actividades de otra partida o fijar `sentAt`). `lhphist` lo puede leer todo miembro, incluido el motivo `why` que el SC no ve en la app (SEG-05 paso 2).
- `dayLocked` depende de `ensureDplan` (asíncrono): recién abierto el Lookahead, un día publicado podría verse abierto por un momento.
- `lhprop/{sc}` acumula claves `id:null` de cada decisión; vigilar el límite de 1 MB en obras largas.
- Dos usuarios SC de la misma partida comparten `lhprop/{sc}`: «Enviar» de uno envía también los borradores del otro (¿por diseño?).
- Duda del informe externo: confirmar que al entrar a la revisión se limpie la selección en bloque (`SELA`, mover.js).
