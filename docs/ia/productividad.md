# Productividad (pestaña `prod`, `js/productividad.js`)

Decidido con el dueño (oct 2026). Dos partes; **F1 (subcontratistas) y F2 (casa / IP) hechas**; F3 (sugerencias y rendimientos para planificar) pendiente. Boceto aprobado: lienzo «LPS 911 · Productividad (boceto)».

## Principio
- El metrado de Productividad es el **ejecutado sincerado**. No se usa el del Lookahead/Campo (mide confiabilidad: se programa, se mueve, se borra). En F3 Campo servirá solo como **sugerencia** al reportar.

## F1: partidas críticas de los subcontratistas
- `pcrit/{id}` `{sc, nom, und, met, fin, mp:{pisoId:meta}, ord, arch?, by, ts}`: las crean y editan admin e ingenieros (`canDaily`: admin, editor, campo). Se archivan (`arch`), no se borran.
- `pav/{fecha}_{pc}_{piso}_{zona|-}` `{pc, sc, d, piso, zona, q, hh|null, nota, by, byN, ts, h:[{q,hh,by,ts}] (últimos 10), arch|null}`.
  - **Piso obligatorio**; sector o ambiente (`zona`, id de `sectors` o `ambientes`) opcional. HH opcionales (si las hay: HH/und del SC).
  - El SC reporta lo de su partida **sin confirmación** (hasta 3 días atrás en la página); los ingenieros editan cualquiera (queda `h`). «Quitar este reporte» archiva.
- Reglas: `pcrit` lee `lpsMember`, escribe `canDaily`; `pav` lee `lpsMember`, escribe `canDaily` o el SC con `by == mid()`, `sc in scsOf()` y `pcrit/{pc}.sc == sc`; `q` numérico ≥ 0 y `piso` no vacío. Borrado real: solo admin. Pruebas: «productividad: …» en `tests/rules/firestore.test.mjs`.
- Lectura: `ensurePv()` (al entrar a la pestaña o a Hoy); el SC lee con `scSubs` (solo su partida, SEG-05).
- Cálculo puro `pvStats(p, reps, hoy)`: acumulado, saldo, **ritmo** = suma de la ventana ÷ días hábiles de la ventana (`PV_N`=10 hábiles hasta hoy si ya reportó hoy, si no hasta el día hábil anterior; no antes del primer reporte), **fin proyectado** = `wshift(fin de ventana, ceil(saldo/ritmo))`, **ritmo necesario** = saldo ÷ días hábiles hasta `fin` (desde mañana si ya reportó hoy), estado `ok` (ritmo ≥ necesario), `risk` (≥ 85 %), `late`, `done`, `nodata`, `none` (sin fecha).
- Pantalla: tablero (fichas, tabla por partida, toca una fila → detalle: avance por piso con meta `mp`, avance diario con ritmo y ritmo necesario, reportes con Editar). Hoja `#pvsheet` para reportar (`pvRepOpen`) y para crear/editar partida (`pvPartOpen`).
- Hoy: tarjeta `pav` (SC: «Avance de tus partidas críticas»; ingenieros: «Avance de los subcontratistas») con las partidas sin reporte de hoy.
- Respaldo: `pcrit` y `pav` en `BK_DATA`.
- Prueba: `tests/e2e/productividad.spec.js`.

## F2: IP de casa (`js/productividad-casa.js`)
- Vista «Casa (IP)» de la pestaña (`U.pvV`: `sc` | `casa` | `reg`, en `saveUI`; seg `pvSeg()`). La ven admin, ingenieros (`canDaily`) y quien ve el Tareo (`pcOk()`); el SC y el lector no.
- Partidas = `tpc` del Tareo (`cod, nom, und, met` = metrado meta, `hhp` = HH presupuestadas). Los ingenieros sin Tareo las leen con su propia suscripción (`PTPC`; reglas: `tpc` lee `isTar() || canDaily()`).
- `pmet/{fecha}_{pc}_{piso}_{zona|-}` `{pc, d, piso, zona, q, by, byN, ts, h, arch}`: metrado ejecutado de casa. Registro: tabla partida × piso (`renderPcReg`, guarda al salir de la casilla con `pcPut`; vacío o 0 archiva); «Detalle» (`pcDetOpen`) para sector o ambiente. Respeta el piso elegido arriba (`visPisos`). Si llega un dato mientras escribes, la casilla conserva el foco y el valor.
- `hhpc/{fecha}` `{fecha, v, at, hh, pcs:{pcId:{hh, cod, nom, und}}}`: HH por partida de la publicación vigente, **sin datos de personas**. La escribe `publicarTareo` (`tpResumenHH` en `functions/tpub.js`, también al rectificar); el admin puede rearmar los días publicados antes con «Traer HH del tareo» (`pcBackfill`, copia de la misma cuenta en `pcResumen`). Reglas: lee `isTar() || canDaily()`, escribe solo `isAdmin()` (la función usa Admin SDK).
- `pcStats(x)`: ratio presupuestado `rp = hhp/met`; ratio real `rr = HH / metrado de los días con HH publicadas` (`ejeC`); **IP = rp/rr** (= HH ganadas ÷ gastadas; mayor a 1 es mejor; decidido con el dueño); IP por semana (`weekOf`); proyección = HH + saldo × `rr` (o `rp` sin real) y desvío vs `hhp`. `hhSinMet`: HH publicadas sin ningún metrado (se marca «sin metrado»). El metrado de días sin publicar suma al avance, no al IP.
- Avisos: hasta qué día hay HH publicadas, días con HH sin metrado y días con metrado esperando la publicación (últimas 3 semanas).
- Decimales con punto (como el resto de la app); ratios chicos (kg) con 3 cifras significativas (`pcR`).
- Pruebas: `tests/e2e/productividad-casa.spec.js`, «productividad casa: …» en las reglas, `functions/test/tpub.test.js` (hhpc al publicar).
- Límite conocido: el tareo no registra piso: el IP es de toda la obra; el avance va por piso.

## F3 (pendiente)
- Sugerencia desde Campo al registrar (requiere enlazar actividad del catálogo ↔ partida de control / partida crítica) y rendimiento histórico en el Lookahead al programar por metrado.
