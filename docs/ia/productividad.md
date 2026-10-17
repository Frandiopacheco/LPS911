# Productividad (pestaña `prod`, `js/productividad.js`)

Decidido con el dueño (oct 2026). Dos partes; **F1 (subcontratistas) está hecha**, F2 (casa / IP) y F3 (sugerencias y rendimientos para planificar) pendientes. Boceto aprobado: lienzo «LPS 911 · Productividad (boceto)».

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

## F2 (pendiente): IP de casa
- Partidas = `tpc` del Tareo (und, `met`, `hhp`). Metrado diario por partida **por piso** (registro del ingeniero). HH = publicaciones vigentes del Tareo (`tpub`, `rows[].h[pcId]`); el metrado se guarda aunque el día no esté publicado.
- IP = ratio presupuestado ÷ ratio real (= HH ganadas ÷ HH gastadas); mayor a 1 es mejor. Lo ven admin e ingenieros (hoy `tpub` solo lo leen `isTar()`: hará falta un resumen legible por los ingenieros).
- Límite conocido: el tareo no registra piso, así que el IP es de toda la obra; el avance sí va por piso.
