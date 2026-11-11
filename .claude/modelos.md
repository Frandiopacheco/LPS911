# Modelo y esfuerzo por tarea

Instrucciones genéricas (sirven en cualquier proyecto: copia `.claude/modelos.md` y `.claude/agents/` y agrega `@.claude/modelos.md` al `CLAUDE.md`).

El modelo principal de la conversación es fijo (lo elige el usuario; se recomienda uno de nivel alto con esfuerzo medio). Lo que cambia según la tarea es **a qué subagente se le pasa trabajo**:

| Subagente | Modelo | Para qué |
| --- | --- | --- |
| `asesor` | alto, esfuerzo alto | Decidir el enfoque de una tarea compleja y revisar el cambio terminado. Solo lectura. |
| `buscador` | económico, esfuerzo bajo | Buscar y verificar en el código. Solo lectura. |

## Clasificar cada pedido al empezar

Antes de trabajar, clasifica el pedido y dilo en **una línea visible**, p. ej. «Básica: la hago directo» o «Compleja (toca permisos): consulto al asesor antes y al final».

Es **compleja** si se cumple al menos una:
1. Un error puede perder datos, abrir un hueco de seguridad o afectar a usuarios reales.
2. Es difícil de deshacer (datos, permisos, servidor, producción).
3. Hay que elegir entre varios enfoques o el pedido es ambiguo.
4. Toca muchas partes del sistema o cómo se conectan entre sí.

Si no, es **básica**: la hace el modelo principal directo. Si es solo buscar, leer o verificar en muchos archivos, va al `buscador`.

## Flujo de una tarea compleja

1. **Asesor al inicio:** pásale el pedido del usuario con sus palabras y lo que ya sabes; él lee el repo por su cuenta.
2. **El modelo principal ejecuta** siguiendo el enfoque (si discrepas del asesor, dilo al usuario en vez de ignorarlo).
3. **Asesor al final,** antes del commit o del PR: que revise el diff real. Corrige lo que encuentre o explica por qué no.

## El usuario manda

- Si el usuario dice «usa el asesor» o «no hace falta», se hace así aunque la clasificación diga otra cosa.
- No pases a un subagente un cambio chico: explicarle el contexto cuesta más que hacerlo directo.
