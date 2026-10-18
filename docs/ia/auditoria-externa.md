# Auditorías externas con otra IA (Argon/Gemini 4, ChatGPT u otra)

Parte de la guía para IA (ver `CLAUDE.md`, sección «Auditorías externas»). Aquí está **cómo se prepara el encargo**; cómo se procesa el informe que vuelve está en `CLAUDE.md`.

## Reglas (decididas con el dueño, oct 2026)

- La IA principal del proyecto es Claude: implementa y aplica solo lo que el dueño aprueba. Las otras IA **solo leen y opinan**.
- **Nunca** se les da acceso de escritura: ni token de GitHub, ni cuenta de Firebase, ni respaldo de datos de la obra. Se les entrega el paquete que arma `scripts/paquete-auditoria.mjs` (un commit fijo).
- Datos de personas (respaldos, máster de personal del Tareo, DNI) no salen a otra IA. Si hace falta probar con datos, se usa la obra falsa de `tests/e2e/fake-firebase.js`.
- Una auditoría = un informe = una conversación con Claude = una rama y un PR.

## 1. Armar el paquete

```
node scripts/paquete-auditoria.mjs                    # perfil «lps» (por defecto)
node scripts/paquete-auditoria.mjs --perfil completo  # los 3 módulos
node scripts/paquete-auditoria.mjs --perfil tareo     # o planos
node scripts/paquete-auditoria.mjs web/js/propuestas.js web/js/campo.js   # solo un tema
```

Opciones: `--commit <sha>` (por defecto el actual), `--con-css`, `--con-pruebas`. Sale en `auditoria/` (no se sube al repo): un `.md` (todo en un archivo, para adjuntar o pegar) y un `.zip` (mismas carpetas, para IA que leen .zip). El script dice cuántos tokens estima.

Tamaños medidos en `acb48a7` (aprox.; ~3,2 caracteres por token):

| Perfil | Archivos | Tokens | Para qué IA |
| --- | --- | --- | --- |
| `lps` | 66 | ~610 mil | Argon/Gemini 4 (1 millón de contexto) |
| `completo` | 86 | ~860 mil | Argon, al límite: preferir `lps` + otro módulo aparte |
| `tareo` | 25 | ~285 mil | Argon o IA con contexto grande |
| `planos` | 35 | ~200 mil | Argon o IA con contexto grande |
| archivos sueltos | — | 20–100 mil | ChatGPT y cualquier otra |

Con IA de contexto menor: un tema por encargo, listando sus archivos (el tema → archivos está en la tabla de `CLAUDE.md` y en cada `docs/ia/<tema>.md`).

## 2. Pedido para pegar (auditoría de código)

Adjunta el paquete y pega esto, cambiando lo que está entre ‹ ›:

> Eres auditor de software. Adjunto el código de LPS 911 (app web del Last Planner System para una obra en Lima; JavaScript sin framework + Firebase). Lee primero `CLAUDE.md` y los `docs/ia/` del paquete: explican roles, reglas que no se rompen y decisiones ya tomadas por el dueño. **No propongas cambiar decisiones que esos documentos dan como tomadas**, y no repitas lo que ya está en `docs/ia/pendientes.md` (puedes decir si se agravó).
>
> Enfoque de esta auditoría: ‹p. ej. «coherencia entre módulos: Plan semanal ↔ PPC cliente ↔ Indicadores», «reglas de Firestore frente a lo que la app escribe», «pérdida de datos con varios usuarios a la vez», «rendimiento en tablet con obras grandes»›.
>
> Formato del informe, obligatorio:
> 1. Primera línea: `Commit auditado: <sha del paquete>`.
> 2. Tabla de hallazgos: n.º · gravedad (crítica/alta/media/baja) · módulo · resumen en una línea.
> 3. Por cada hallazgo: archivo y función, **un fragmento corto del código citado** (2–5 líneas, para ubicarlo aunque cambien los números de línea), qué pasa, cómo reproducirlo paso a paso en la app (rol, pestaña, acciones) y la corrección que propones. Indica si lo **reprodujiste** o si es **solo lectura de código**.
> 4. No inventes: si algo no se puede afirmar con el código adjunto, dilo como duda, no como hallazgo.
> 5. Escribe en español. No reescribas archivos completos; solo el cambio mínimo propuesto.

## 3. Revisión visual desde video (tablet/celular)

Graba la pantalla en la tablet o el celular haciendo un flujo real (p. ej. SC propone → ingeniero revisa → publicar → marcar cumplimiento) y adjunta el video con:

> Este video muestra a ‹rol› usando LPS 911 en ‹tablet/celular› para ‹flujo›. Señala, con el segundo del video: dónde duda o se traba el usuario, botones difíciles de encontrar o de tocar (menos de 40 px), textos que confunden, pasos que sobran y esperas largas. Prioriza lo que más tiempo hace perder en obra. No propongas rediseños completos: cambios concretos y pequeños, en español.

El informe vuelve a Claude como cualquier otro (opinión → el dueño aprueba → un PR).

## 4. Planos: vínculos y rótulos (tarea de preparación)

Para los vínculos entre láminas (`docs/ia/planos.md`): adjunta los PDF de un grupo (p. ej. arquitectura de un piso) y pide:

> Para cada lámina: código, título, especialidad, piso y revisión del rótulo. Luego lista los vínculos: en qué lámina aparece cada llamada de corte, elevación, sección o detalle, su texto exacto (p. ej. «3/A-301») y a qué lámina remite. Entrega una tabla CSV con columnas: lamina_origen, llamada, lamina_destino, nota. Si una llamada remite a una lámina que no está entre las adjuntas, márcala como «falta».

El CSV se le pasa a Claude, que lo cruza con lo cargado en la app y propone los vínculos para que el dueño los revise antes de crearlos. Nada se crea solo.
