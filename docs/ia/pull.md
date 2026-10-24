# Sesión pull (pull planning con pósits)

Parte de la guía para IA (ver `CLAUDE.md`). Léela solo si tu tarea toca este tema. Código: `web/js/pull.js`, estilos `.pu*` al final de `css/app.css`, prueba `tests/e2e/pull.spec.js`.

## Qué es (oct 2026, decidido con el dueño tras probar una maqueta)
- Pestaña `pull` «Sesión pull» (en «Más»), solo **admin y editores** (`pulEd()`; `tabAllowed`). Planificación hacia atrás en la reunión: el tablero se proyecta desde una **laptop** y se puede entregar una **tablet** (misma sesión, «Pantalla completa») a un SC para que mueva o jale pósits. Ambos editan a la vez.
- Es un **borrador**: al crearse solo LEE el lookahead (copia `base`); no escribe en `acts` hasta «Revisar y aplicar».
- Una sesión = un piso y varios ambientes (chips arriba, uno a la vez). Los pósits son las actividades de esos ambientes con días **desde mañana** que no están terminadas (`DONE`). Franjas por SC (orden `PU_SEQ`, el tren de acabados).

## Datos: `pull/{sid}`
`{nom, piso, ambs:[ambId], ps:{pid:{n,sc,amb,d0,dur,src?,nw?,del?}}, ln:{'a>b':1}, h:{hid:{n,tipo:'ingreso'|'entrega',d}}, buf, base:{actId:{days,name,sc}}, lk:{pid:{by,n,t}}, st, apl?:{t,by,n,cnt}, arch?, by, n, t0, ts}`
- `d0` fecha ISO de inicio, `dur` días hábiles (`isWork`/`wshift`). `src` = id de la fila del lookahead; `nw` = pósit nuevo (se crea la fila al aplicar); `del` = quitado (al aplicar se quitan sus días desde mañana).
- Enlace `a>b` = «a termina antes de que empiece b». Hitos con `H:<hid>`: `H:x>p` = p no empieza antes del ingreso x; `p>H:y` = p termina antes de la entrega y. Hitos libres (no amarrados a una partida) y comunes a todos los ambientes de la sesión.
- **Escritura por campo** (`puWrite({'ps.<pid>.d0':…})`, `undefined` = `FieldValue.delete()`): dos personas no se pisan. Se aplica al instante en la copia local. Deshacer de la sesión (`PU.undo`) repone `ps/ln/h` enteros.
- **Bloqueo al arrastrar**: `lk.<pid>` mientras se arrastra (los demás ven «✋ nombre» y no pueden moverlo; caduca a los 20 s).
- Reglas: lee `lpsMember()`, crea/edita `canEdit()` (exige `ps` mapa y `piso` texto), borra solo admin (la app archiva). Está en el respaldo (`BK_DATA`).

## Interacción
- Arrastrar el cuerpo del pósit = cambiar de día (se suelta en el día más cercano). Tocar = seleccionar (panel de abajo: inicio ‹ ›, duración − +, «Necesita antes» con × para quitar, «Vincular a hito» con un toque, Duplicar, Quitar).
- Enlazar: jalar desde el círculo → del pósit hasta otro pósit o la franja del hito (se ilumina al jalar). Desde la cabecera de un hito (◆) se jala hasta una actividad. Tocar una flecha la selecciona y ofrece «× Quitar enlace». Sin círculos (ciclos) ni hito→hito.
- «Programar hacia atrás» (`puBackward`): solo los pósits con camino a un hito; cada uno termina antes de su sucesor (y `buf` días antes de un hito). Lo que tendría que empezar antes de mañana queda en el primer día y en rojo.
- Margen (`puMargins`): de cada hito de ingreso a cada entrega por la cadena enlazada (días hábiles; negativo = no alcanza).
- «Planos»: abre el visor del módulo Planos (`plOpen`, no acoplado) en el piso de la sesión; al cerrarlo la sesión sigue igual. «Pantalla completa»: `body.pufs` + Fullscreen API.
- «+ Pósit» / «+» de cada franja: elegir SC y nombre (sugerencias del catálogo de la Matriz para ese SC).

## Aplicar al lookahead (`puPlan` / `puApply`)
- Solo admin o responsable del piso (`isPisoResp`). Un solo `apply` (Deshacer del aviso lo revierte; queda en el historial).
- Solo días **posteriores a hoy**; lo pasado y hoy no se tocan. Si solo se movió (misma duración) se corren los días originales con sus huecos (`wshift`); si cambió la duración, queda un tramo seguido desde `d0`.
- **El metrado por día (`qty`) se mueve con sus días** (tanda 2, C-19/CON-06): el i-ésimo día futuro pasa al i-ésimo día nuevo; si se acorta, lo que sobra se suma al último día (no se pierde metrado); los días agregados quedan «sin cantidad», como al pintar; quitar el pósit (`del`) borra el `qty` de los días quitados. Nunca queda `qty` en fechas que no están en `days`. Prueba: `auditoria-tanda2-pull-des.spec.js`.
- Filas que cambiaron en el lookahead desde que se abrió la sesión (`base` ≠ actual): por defecto **no se tocan**; casilla para pisarlas.
- Pósits nuevos con «exigir catálogo» y nombre fuera del catálogo: no se crean (aviso).
- Choques que quedan: casilla para crear restricciones `pend` (TAREA PREDECESORA; MATERIALES si es un hito de ingreso) amarradas a la actividad que depende.
- Después de aplicar, la sesión se re-alinea (`base`, `d0/dur`, los nuevos pasan a `src`) para usarla la semana siguiente.

## Auditoría tanda 3 · frente H (24/10/2026)
- **CON-09:** una fila culminada en Campo (`DONE`) que recibiría días posteriores a la terminada sale en la revisión («culminada en Campo el …», `X.dn`) y por defecto **no se toca**; con la casilla `PU.apDn` se aplica y se reabre (`reopenAfter` en el `after`).
- **CON-10:** los choques de enlace cuya sucesora es un **pósit nuevo** también se listan y crean su restricción con el id de la fila que se crea en el mismo `apply` (`'act-'+…+'p'`); si el pósit no se crea (fuera del catálogo) se lista sin restricción.
- **DAT-08:** `PU_ORD` ordena las franjas por el lugar del SC en el tren de la Matriz (menor `mcat.tr` de sus actividades, por id); `PU_SEQ` (nombres) queda solo de respaldo.
