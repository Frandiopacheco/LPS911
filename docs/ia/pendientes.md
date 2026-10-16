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

## Para una próxima obra: módulo de casco (decidido con el dueño, oct 2026)

- No se implementa en esta obra (ya está en acabados). Se retoma cuando haya casco que programar.
- **Dos módulos independientes**, en pantallas distintas, cada uno con su propio lookahead, PPC, AR, etc.; no necesitan compartir la información: el actual (por ambiente, acabados) y uno **por partida/actividad** para casco.
- Formato elegido para el de casco (lienzo «Lookahead por partida — 3 propuestas», opción C): una fila por partida (agrupadas p. ej. Verticales / Horizontales), una **barra por partida dividida en tramos por sector**, **color = sector** (el mismo en todas las filas, para ver el tren S1→S4), el SC como punto junto al nombre, y un interruptor «Solo sector / Sector + metrado» que muestra la cantidad de cada tramo.
- Antes de construirlo, definir: qué comparte con el módulo actual (Equipo, Restricciones, Plan diario, Campo) y cómo se pasa de casco a acabados en una misma obra.

## Auditoría con datos reales (09/10/2026, respaldo de la obra)
Corregido en el PR «Auditoría con datos reales»:
- Eliminar restricción = archivar (`arc('restr')`, `ARCH.res`, Papelera en Configuración la muestra y restaura). Pide confirmación a todos.
- Rendimiento: `requestRemoteRender` (base.js) agrupa los redibujos que llegan de otros usuarios en vistas que tardan >120 ms (Plan semanal / Matriz con todos los pisos). Plan semanal: `actNum` memorizado por `DV`, `fieldSug` una vez por fila (`SUG`), `.plsecv` con `content-visibility:auto`. Medido con los datos reales: 1,0 s → 0,18 s por redibujo.
- PPC del SC con una sola fórmula: Tablero (`dashWeek`) y Excel del PPC usan `ppcOf`/`wkScStats`.
- Volver a publicar no reescribe una restricción `res-<borrador>` ya liberada (página `RLIB` y servidor `closePlanPiso`).
- «Aplicar registros de campo» ignora los cierres del capataz/SC sin confirmar (`_prop`): `fieldSug().prop` los muestra como «N por confirmar» y no concluye «No» (decisión del dueño: opción B).
Pendiente (no se tocó por decisión del dueño): la semana 58 quedó casi sin evaluar (PPC oficial 1 %).
Pendiente: Matriz con todos los pisos tarda ~0,5 s por dibujo (solo se agrupan los cambios ajenos).
