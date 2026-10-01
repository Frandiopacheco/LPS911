# Cómo publicar cambios

Hay dos lugares:

- **Copia de prueba:** rama `main` → `https://main--lps911-central.netlify.app`, con la cinta roja PRUEBAS y datos de prueba.
- **Obra:** rama `produccion` → `https://lps911-central.netlify.app`, con los datos reales.

Todo cambio entra primero a `main`. A la obra solo llega cuando tú lo apruebas.

## A. Hacer un cambio pequeño tú mismo (desde el navegador)

1. Entra a **github.com/Frandiopacheco/LPS911**.
2. Arriba a la izquierda, revisa que el selector de rama diga **main**.
3. Abre el archivo, por ejemplo `web` › `index.html`.
4. Pulsa el lápiz ✏️ (**Edit this file**), arriba a la derecha del archivo.
5. Haz el cambio. Para buscar dentro del archivo: haz clic en el texto y pulsa **Ctrl + F**.
6. Pulsa **Commit changes…** (botón verde).
   - En **Commit message** escribe qué cambiaste, por ejemplo "Corrige texto del botón Guardar".
   - Deja marcado **Commit directly to the main branch**.
   - Pulsa **Commit changes**.
7. Espera unos 3 minutos y revisa la pestaña **Actions**:
   - ✅ verde: ya está en la copia de prueba.
   - ❌ rojo: no se publicó nada. Abre la ejecución y mira el aviso, o avísale a la IA.
8. Abre la copia de prueba y pulsa **Actualizar** cuando aparezca "Hay una versión nueva".

## B. Pasar a la obra (*pull request* de main a produccion)

Hazlo cuando la copia de prueba esté bien.

1. Entra a **github.com/Frandiopacheco/LPS911** y abre la pestaña **Pull requests**.
2. Pulsa **New pull request** (botón verde).
3. Arriba hay dos selectores. Deja:
   - **base:** `produccion` (a dónde va).
   - **compare:** `main` (lo que llevas).
4. Abajo aparece la lista de cambios. Pulsa **Create pull request**.
5. En el título escribe algo como "Pasar a producción: mejoras de Campo" y pulsa **Create pull request** otra vez.
6. Espera a que en la parte de abajo aparezcan los ✅ de la revisión automática (unos 3 minutos).
7. Pulsa **Merge pull request** y luego **Confirm merge**.
8. GitHub instala en la obra en unos 4 minutos: página, reglas y tareas automáticas. Puedes seguirlo en **Actions**: la ejecución dirá **produccion**.
9. El equipo verá "Hay una versión nueva – Actualizar" al abrir la app.

Si el botón dice "This branch has conflicts", no lo fuerces. Avísale a la IA para que lo resuelva en `main`.

## C. Si algo sale mal en la obra

**Página:** vuelve a una versión anterior en segundos.

1. En Netlify › **lps911-central** › **Deploys**, elige la versión anterior que funcionaba.
2. Pulsa **Publish deploy**.

Los datos no se tocan.

**Reglas o tareas automáticas:** vuelve el código a como estaba.

1. En GitHub › **Pull requests** › **Closed**, abre el *pull request* que causó el problema.
2. Pulsa **Revert**. Se crea un *pull request* nuevo hacia `produccion`.
3. Acéptalo (paso B.7).

## D. Si trabaja otra IA o persona

- Que haga sus cambios en `main`, o mejor en una rama nueva con un *pull request* hacia `main`. Así pasan por la revisión automática y por la copia de prueba.
- **Nunca** directo en `produccion`.
- Que lea primero `CLAUDE.md`.
- Mejor una sola a la vez: si dos editan `web/index.html` al mismo tiempo, pueden pisarse.
