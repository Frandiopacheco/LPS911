# Contexto de la obra y del dueño

Parte de la guía para IA (ver `CLAUDE.md`). Aquí está lo que **no se deduce del código**: cómo trabaja la obra, los principios que fijó el dueño y cómo quiere trabajar con la IA. Léelo cuando una decisión dependa de cómo se usa la app en obra o al conversar del proyecto fuera del código. Lo técnico de cada módulo está en su archivo de `docs/ia/`.

Viene de la memoria del chat de Claude del dueño (pasada al repo el 10-11-2026 para que el repo sea la única fuente). **El repo es público:** aquí no va nada personal ni comercial.

## Origen

- LPS 911 nació para reemplazar el **Excel .xlsm del lookahead**: mismo formato y la flexibilidad de Excel, pero robusto frente a ediciones accidentales y mejor presentado. Prioridad inicial: plan semanal, PPC y análisis de restricciones; los demás módulos después.
- La reunión diaria se hacía dibujando sobre **~60 planos en Miro** (por piso y especialidad); el SC y los ingenieros del consorcio llenaban su plan antes y se proyectaba. De ahí salió el Plan diario. Para eso Firebase pasó al plan **Blaze**.
- Se pensó desde el inicio para reutilizarse en otras obras (una marca y un subdominio por proyecto; `fcol` está preparado para separar obras). Para la próxima obra: catálogo, planos y tren de trabajo configurables desde el inicio, sin repetir lo que en esta obra se armó tarde.

## La obra y el equipo

- Obra de edificación en Lima, hoy en **acabados** (arquitectura por ambientes). **No hay casco en esta obra**: el módulo Casco se prueba con datos de ejemplo para entrar a la próxima obra con el sistema definido.
- Usuarios a la vez: unos **10 SC, 5 ingenieros editores y el administrador**. El Tareo: unos **14 capataces del consorcio**.
- El área de apoyo de planificación se llama en la obra **«Control de proyecto»** (en la app sirve «Planificación» o «Control de proyecto», `isPlanArea()`).
- «POR DEFINIR» no es un SC: marca que todavía no se sabe quién ejecuta (`scTBD`, `matriz.md`).
- Es muy común trabajar **feriados y domingos**. Un domingo trabajado suele ser solo hasta la 1 pm.
- Los SC trabajan **en tren**: un ambiente tras otro en el mismo día; no cumplir un día afecta a las partidas que siguen.
- Se usa en laptop (revisión, proyección) y en **tablet** en obra (recorrido de la Matriz, revisión de propuestas, pull planning).
- Lo de capataces en Last Planner (enlace, En obra) **todavía no se usa**; el capataz solo se proyecta para el Tareo.
- Planos: DWG en el SharePoint de Oficina Técnica, exportados a PDF/DXF para el módulo Planos. Modelos BIM en IFC (desde Revit) también en ese SharePoint; los planos están hoy en Dalux, pero no hay presupuesto para sus licencias.

## Ritmo semanal y diario

- **Jueves:** se planifica la semana siguiente, con lunes a jueves ya sincerado. Corte de propuestas de los SC: jueves 20:00 (configurable).
- **Viernes 3–7 pm:** reunión semanal del lookahead.
- **Sábado:** se emite y envía la versión cliente (a mano, o sola a las 23:00). **Domingo:** se sigue sincerando la programación interna y se congela la semana de noche (corte configurable, hoy domingo 23:00); desde el lunes se trabaja con la congelada.
- La **Matriz** se actualiza una vez por semana, antes de programar el lookahead.
- **Ciclo diario (lunes a sábado):** el SC propone su plan → el ingeniero revisa → se publica (al terminar la reunión, o solo a la hora de cierre) → durante el día el SC reporta por excepción (detenido con motivo) → **17:00** corte del cierre del SC → reunión diaria → hasta el **Cierre del ingeniero (21:00)** solo el ingeniero corrige; después nadie. Detalle en `ppc-campo.md` y `plan-diario.md`.
- La reunión diaria termina entre 7 y 8 pm (en el peor caso, 9 pm). Tomaba ~2 h porque se revisaba uno a uno cada incumplimiento y cada interferencia. Pautas acordadas: mostrar rápido el PPC de ayer de todos y dedicar el resto a las actividades críticas, con meta de 35–45 min (máximo 1 h). El análisis detallado se centra en **3 a 5 SC de partidas críticas** (ruta crítica), no en los de PPC más bajo; reunión aparte con el SC que arrastre PPC bajo por semanas. El ingeniero revisa los cruces antes de la reunión para que el plan llegue casi limpio.
- Un SC propone unas 50–60 filas por semana.

## Principios del dueño (valen para toda la app)

- **La velocidad va antes que lo visual:** «no sirve que se vea bonito y fluido si eso sacrifica la velocidad».
- **Todo vinculado, sin funciones duplicadas:** si cambia un nombre (p. ej. una especialidad), cambia en todo el sistema; no dos pantallas que hagan lo mismo.
- **El sistema asiste y recomienda, no restringe al ingeniero:** solo se bloquea lo que protege la medición (días pasados, día cerrado, lo congelado y lo emitido al cliente).
- **Nunca perder datos de la obra**: la obra ya alimenta el sistema; cualquier cambio respeta lo registrado (incluida la semana congelada). En el Tareo, las HH de los capataces son sagradas: de ellas depende el pago al trabajador.
- **Fuentes:** el PPC semanal sale de lo marcado en el Plan semanal; el PPC diario, del registro de Campo; el estado real de la obra, de la **Matriz** (que puede estar desactualizada: solo avisa, nunca excluye nada del plan).
- **El lookahead asegura el plazo contractual:** el SC no programa solo lo que puede; recibe lo que la obra requiere y gestiona sus recursos. Interesa detectar brechas de capacidad al menos una semana antes.
- **Pocas opciones a la vista:** demasiados botones «marean»; las herramientas se agrupan por **momento** (consultar, programar, revisar propuestas). La grilla o el plano es lo que manda en la pantalla.
- Avisos y confirmaciones con buena presentación, nunca las ventanas del navegador (`uiAsk`).
- La revisión de propuestas no debe volverse un chat entre SC e ingeniero: mensajes solo para lo esencial.

## Forma de trabajo con la IA

- Implementa en **Claude Code en la nube** (repo `Frandiopacheco/LPS911`); a veces conversa ideas en el chat de Claude. Quiere dar una instrucción, apagar la PC y seguir desde el celular.
- El contexto del proyecto vive **solo en el repo** (`CLAUDE.md` y `docs/ia/`), no en la memoria de la cuenta. No quiere reemplazar archivos de contexto a mano: la IA actualiza `docs/ia/` al implementar.
- Rapidez: una pregunta simple o un cambio chico no puede tomar ~20 min (ver «Modo rápido» en `CLAUDE.md`).
- Cuando pide **analizar, un boceto o una maqueta**, no se implementa hasta que él lo apruebe. Para explicar el sistema prefiere **diagramas con cajas y conexiones numeradas** (1, 2, 3…), legibles en grande en la tablet, para decir «en la caja X quiero…».
- Auditorías: las hacen otras IA (ChatGPT, Argon/Gemini) en solo lectura; Claude aplica solo lo aprobado (`auditoria-externa.md`). Para auditar con Claude: revisión de código con un modelo fuerte y prueba en Chromium con uno más ligero, dos agentes en paralelo que integra el principal.
- Casco no va a producción hasta que él lo apruebe (regla 6 de `CLAUDE.md`).

## Ideas para más adelante

Ver `pendientes.md` › «Ideas del dueño para más adelante».
