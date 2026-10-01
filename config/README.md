# Configuración por entorno

- `produccion.js`: la obra real. Se publica desde la rama **produccion**.
- `pruebas.js`: el proyecto `lps911-pruebas`. Se publica desde la rama **main**.

Al publicar, `scripts/build.mjs` copia el archivo que corresponde a `web/firebase-config.js`.
Nunca se edita `web/firebase-config.js` a mano: no está en el repositorio.
