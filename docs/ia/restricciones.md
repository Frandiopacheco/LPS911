# Restricciones: lista grande e «ir a»

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

- **Restricciones grandes:** la lista se dibuja por tandas (`U.rLim`, 150 + «Mostrar más»; la recién creada siempre se ve).
- **Ir desde Restricciones:** «Ver en el lookahead» (`gotoAct`) resalta la fila (`tr.rflash`, ~3,6 s) y «Ver en el plano» (`gotoPlano` → `__plano.focusAct`) abre el Plan diario en el próximo día programado de la actividad, acerca y hace parpadear su ambiente unos segundos (`M.flash`, `polygon.flz`). La tabla de Restricciones agrupa columnas (`table.rtab`: estado+semana, tipo+clase, qué falta+fotos, fechas) para no desplazarse a los lados; «Exportar Excel» (`restrXlsx`/`restrWs`) sale con los filtros de la pantalla. Restricciones de una actividad en la papelera (`rArch`) no cuentan como pendientes (`rOpenC`).
- **«Ver en el lookahead» desde Restricciones** (`gotoAct`): la actividad se muestra aunque esté vencida (`LK_SHOW`, exenta de `hidePast`) y, si un filtro la tapa, se quitan los filtros y se vuelve a buscar; un aviso dice si era vencida.
- **«Actividad no ejecutada»** (`actVenc`; reemplaza a la píldora «Vencida» de la fila para no repetir la palabra): restricción pendiente cuya actividad tiene todos sus días antes de hoy y no está terminada. Píldora en la fila/tarjeta y botón `#rven` que filtra solo esas (`RVEN`, solo la sesión).

## Responsable (oct 2026, pedido del dueño)
- El responsable se **elige del equipo**, no se escribe: `respSel`/`respOpts` (plan-restricciones.js) arman un `<select>` con *Personas del equipo* (members, sin roles del tareo, lectores ni ingresos por enlace; con rol y empresa/área), *Empresas (subcontratistas)* y *Áreas* (`restrAreasL`). Se guarda el nombre en `resp` (igual que antes: exportes, Excel y avisos lo leen como texto). Los valores por defecto automáticos (empresa del SC, área) están en la lista.
- Un nombre antiguo que no está en el equipo se conserva, sale «(no está en el equipo)» y el campo en rojo (`.rbad`) hasta que se elija otro. Elegir un valor fuera de la lista se rechaza (`respOk`).
- La lista de personas viene de `members`, que solo leen ingenieros y administrador: el SC y las áreas ven su propio nombre, las empresas y las áreas. Caché de 2 s (`RESPC`).
- El plan diario (restricción desde «No va», `#dzrr` en plano.js) usa la misma lista.
