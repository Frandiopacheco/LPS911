# Plan maestro — diseño (etapa 1)

Decidido con el dueño el 4 de octubre de 2026. Es la guía para implementar el nivel superior del Last Planner en LPS 911.
Lo que no está aquí (planes de recuperación, tendencia de hitos, curva S, plan de fases, vínculo automático, SC y contratos
en el maestro) queda **fuera de esta etapa**.

## Objetivo de la etapa 1

1. **Generar el plan maestro en el sistema**: en este proyecto desde el Excel del planner (REV 12); en los siguientes desde
   Primavera (.xer preferente, PDF como respaldo), sin rehacerlo en Excel.
2. **Poner el avance en %** por partida × piso, a un corte mensual (fin de mes por defecto, editable).
3. **Vincular a mano** actividades del lookahead con su partida × piso y ver en el lookahead un **hito** (◆) que dice si
   esas actividades terminan dentro o fuera del plazo maestro.

Todo lo del maestro lo ven **solo el planner y el administrador**. Los SC no ven nada.

## Decisiones

| Tema | Decisión |
|---|---|
| Qué es el maestro | Meta interna. Las fechas de Primavera se guardan como **referencia** (`ref`). |
| Unidad de control | Partida × piso (`pp`). |
| Quién edita | Administrador y el rol nuevo **planner**. |
| Aprobación | Si guarda el administrador, se aprueba solo. Si guarda el planner, el administrador aprueba o devuelve. |
| Rol planner | Solo modifica el plan maestro. El resto lo ve como lector. |
| Avance | % por partida × piso, ingresado por el planner. El % del padre se **pondera por duración**. |
| Corte | Fin de mes por defecto, editable en la configuración del maestro. |
| Desde cuándo | Solo de aquí en adelante (no se vincula lo pasado). |
| Hitos | Fechas del Excel: el hito se **amarra** a partidas (toma su fin o inicio) o es **fijo**. Del .xer se usan sus hitos como plantilla (nombres y grupos) y más adelante sus fechas. |
| Hito en el lookahead | Un ◆ en **cada fila** vinculada. |
| Semáforo | Verde 0 días hábiles de desfase, ámbar 1–5, rojo más de 5 (configurable). |

## Rol `planner`

- `canMP()` = administrador o planner (app y reglas).
- Escribe solo en las colecciones del maestro; `canWrite` y `canDaily` siguen falsos.
- Pestañas en su barra: Hoy, Plan maestro, Lookahead (solo lectura, con «Vincular al maestro»). El resto en «Más».
- Se agrega en Equipo, en «Ver como» y en las reglas.

## Datos (Firestore)

No entran en `COLS` (que cargan todos al entrar). Se cargan con `ensureMP()` solo si `canMP()`; las reglas niegan la
lectura a los demás.

| Colección | Contenido |
|---|---|
| `mp/{id}` | Nodo del árbol (borrador vigente): `{tipo, parent, ord, code, name, pisoId?, und?, metrado?, ini, fin, ref?:{ini,fin,code}, grp?, hk?, src, arch?, by, t}` |
| `mpver/{n}` | Versión de la línea base: `{n, st:'pend'\|'ok'\|'dev', by, n_, at, nota, aprobBy?, aprobAt?, items:{id:{ini,fin,name,tipo,parent}}}` |
| `mpav/{corte}` | Avance de un corte (`corte` = fecha ISO): `{pct:{ppId:n}, by, at}` |
| `mpl/{actId}` | Vínculo: `{mp: ppId, by, t}` (una partida maestra por actividad) |
| `mpcfg/main` | `{corte:'eom'\|1–28, tol:[0,5]}` |

Tipos de nodo (`tipo`):

- `wbs` — agrupador (capítulo, especialidad, frente).
- `part` — partida.
- `pp` — partida × piso (`pisoId`); es lo que se controla y se vincula.
- `det` — actividad de detalle (nivel `P` del Excel), plegada; sirve para vincular más adelante.
- `hito` — hito. `grp`: `contractual` | `planificado` | `intermedio`. `hk`: `{modo:'fijo'|'amarrado', fecha?, nodos?:[ids], campo?:'fin'|'ini'}`.
  Amarrado: su fecha es la última (o primera, si `campo:'ini'`) de esos nodos. `ref` guarda código y fecha de Primavera.

Fechas de un `wbs`/`part` sin fechas propias = mínimo inicio y máximo fin de sus hijos.

El hito del lookahead se compara siempre contra la **versión aprobada vigente** (`mpver` con `st:'ok'` de mayor `n`),
nunca contra el borrador.

## Importar

Tres lectores que llevan a la misma **tabla de revisión** (filas bien / aviso / error, editables) y a **«Emparejar pisos»**
(texto del archivo → piso del sistema; lo que no es piso queda como subgrupo):

1. **.xer** (en el navegador, Windows-1252): `PROJWBS` → árbol; `TASK` → partidas, referencia y estado;
   `TT_Mile`/`TT_FinMile` → hitos (grupo según el WBS padre); `TASKPRED` se guarda para más adelante.
2. **Excel del planner**: columna ITEM: `N`/`C.x`/`C`/`D` → `wbs`; `E` → `part`; `F` → `pp` si se empareja con un piso,
   si no `wbs`; `P` → `det`. Fechas K/L, unidad, metrado.
3. **PDF** (respaldo): texto con posición, filas por el ID `A####` y fechas dd/mm/aa («A» = real).

Volver a importar compara por código: nuevo / cambiado / quitado, sobre el borrador.

## Desglosar por piso

Sobre una partida sin pisos: elegir pisos y orden del tren, duración por piso (igual o por metrado), desfase entre pisos
(días hábiles, `wshift`/`isWork`) e inicio. Genera los `pp`. «Copiar desglose de otra partida» para pisos típicos.

## Versiones y aprobación

Planner: «Enviar a aprobación» → `mpver` `pend`. Administrador: ve las diferencias con la base vigente → «Aprobar» o
«Devolver con nota». Si guarda el administrador, queda `ok` al momento. No se borran versiones. Hoy: tarjeta
«Maestro por aprobar» (admin) / «Devuelto» (planner).

## Pestaña «Plan maestro» (`maestro`)

Herramienta a todo el ancho; se abre en consulta con «✎ Editar».

- **Estructura**: árbol plegable (WBS › partida › piso › detalle) + Gantt (semanas o meses). Barra gris = base aprobada,
  barra de color = borrador si difiere, relleno = % de avance, ◆ = hitos, líneas de hoy y del último corte. Filtro de piso:
  el general (`U.piso`).
- **Avance**: lista de partida × piso iniciadas al corte, % real, % programado (lineal por días hábiles) y diferencia;
  «Copiar el corte anterior».
- **Versiones**: historial y comparación.
- **Importar**: los tres lectores.

## Vínculo y hito en el Lookahead (solo planner y administrador)

- «Vincular al maestro…» en el menú ⋮ de la actividad, del ambiente o en la selección múltiple. Lista de partida × piso del
  piso de la actividad, con buscador y sugerencia por nombre. No modifica `acts` (funciona en modo consulta).
- ◆ en la celda de la fecha de fin de la base, en cada fila vinculada; fuera de la ventana: «◆→ 14/11» en el borde.
  Verde si el último día del conjunto de actividades vinculadas a esa partida × piso cae en o antes del fin base; rojo si
  se pasa. Título: «Fin maestro 14/11 · el lookahead termina 18/11 (+3 días hábiles)». Caché por `DV` + versión del maestro;
  se dibuja en `virtPaint`. Se apaga en «Vista ▾ › Hitos del maestro».

## Reglas

`mp`, `mpav`, `mpl`, `mpcfg`: leer y escribir `canMP()`. `mpver`: leer `canMP()`; el planner crea en `pend`; solo el
administrador crea en `ok` o pasa a `ok`/`dev`; nadie borra. El planner no escribe en ninguna otra colección.

## Orden de implementación (un *pull request* por paso)

1. Rol planner, colecciones, reglas, pestaña con árbol + Gantt, edición manual e hitos (amarrados y fijos).
2. Importar el Excel del planner y emparejar pisos.
3. Versiones y aprobación.
4. Vínculo y hito en el Lookahead.
5. Avance mensual.
6. Importar .xer (hitos como plantilla, volver a importar comparando).
7. Desglosar por piso.
8. Importar PDF.

## Estado

- [x] Paso 1: rol planner, colecciones y reglas, pestaña con árbol + Gantt, edición manual, hitos fijos y amarrados, archivar/recuperar, deshacer, tarjeta en Hoy.
- [ ] Paso 2: importar el Excel del planner.
