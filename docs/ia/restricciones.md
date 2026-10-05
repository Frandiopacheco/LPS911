# Restricciones: lista grande e «ir a»

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema.

- **Restricciones grandes:** la lista se dibuja por tandas (`U.rLim`, 150 + «Mostrar más»; la recién creada siempre se ve).
- **Ir desde Restricciones:** «Ver en el lookahead» (`gotoAct`) resalta la fila (`tr.rflash`, ~3,6 s) y «Ver en el plano» (`gotoPlano` → `__plano.focusAct`) abre el Plan diario en el próximo día programado de la actividad, acerca y hace parpadear su ambiente unos segundos (`M.flash`, `polygon.flz`). La tabla de Restricciones agrupa columnas (`table.rtab`: estado+semana, tipo+clase, qué falta+fotos, fechas) para no desplazarse a los lados; «Exportar Excel» (`restrXlsx`/`restrWs`) sale con los filtros de la pantalla. Restricciones de una actividad en la papelera (`rArch`) no cuentan como pendientes (`rOpenC`).
- **«Ver en el lookahead» desde Restricciones** (`gotoAct`): la actividad se muestra aunque esté vencida (`LK_SHOW`, exenta de `hidePast`) y, si un filtro la tapa, se quitan los filtros y se vuelve a buscar; un aviso dice si era vencida.
