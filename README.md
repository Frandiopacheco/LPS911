# LPS 911 · Last Planner de obra

App web del Last Planner System: lookahead, plan semanal, registro de campo, capataces, tablero e indicadores. Usa Firebase (Firestore, Auth y Realtime Database) y se publica en Netlify.

## Cómo se publica

```
cambio en GitHub ──► rama main        ──► Netlify: copia de PRUEBAS   (main--<sitio>.netlify.app)
                 │                     └► GitHub: reglas + tareas en lps911-pruebas
                 └► rama produccion  ──► Netlify: sitio de la OBRA
                                       └► GitHub: reglas + tareas en el proyecto real
```

1. Todo cambio entra primero a **main** y se ve en la copia de prueba, que muestra la cinta roja "PRUEBAS".
2. Cuando la prueba está bien, se pasa a **produccion** con un *pull request* de `main` a `produccion`. Al aceptarlo se publica en la obra.
3. Cada cambio pasa antes por la revisión automática (pestaña **Actions**): sintaxis, tareas del servidor y reglas de seguridad. Si algo falla, no se instala nada.

## Carpetas

| Carpeta | Qué tiene |
| --- | --- |
| `web/` | La página: `index.html`, `plano.js`, `sw.js` (modo sin internet), íconos |
| `config/` | Configuración de Firebase de cada entorno (`produccion.js`, `pruebas.js`) |
| `firebase/` | Reglas de Firestore y Realtime Database |
| `functions/` | Tareas automáticas del servidor: versión del domingo y cierres no revisados |
| `tests/rules/` | Pruebas de las reglas de seguridad |
| `scripts/` | Preparación de la publicación y revisión de sintaxis |

## Tareas automáticas del servidor

- **versionDominical**: los domingos a las 12:05 (Lima) guarda la versión automática del lookahead, aunque nadie tenga la página abierta.
- **aceptarCierres**: cada día a las 23:30 (Lima) registra los cierres de capataces que nadie revisó en 2 días.

## Guías

- `PUBLICAR.md`: cómo hacer un cambio pequeño, pasarlo a la obra (*pull request*) y volver atrás.
- `CLAUDE.md`: cómo está armada la app, para cualquier asistente de IA que trabaje en el código.
- `INSTALACION.md`: configuración inicial (ya hecha).
