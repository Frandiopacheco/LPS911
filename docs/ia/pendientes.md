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
