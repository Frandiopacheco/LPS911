# Instalación (una sola vez)

Son cinco pasos. Cuando termines, cada cambio se revisa y se publica solo.

## 1. Preparar el proyecto de pruebas (`lps911-pruebas`, ID `lps911-pruebas-49641`)

En [console.firebase.google.com](https://console.firebase.google.com), dentro de **lps911-pruebas**:

1. **Firestore Database** › Crear base de datos › modo **producción**. Usa la misma ubicación que el proyecto real.
2. **Authentication** › Comenzar › Método de acceso: activa **Correo electrónico/contraseña** y **Anónimo** (este último es para los capataces).
3. **Authentication** › Configuración › **Dominios autorizados** › Agregar: `main--<tu-sitio>.netlify.app`, cambiando `<tu-sitio>` por el nombre de tu sitio en Netlify.
4. ⚙️ **Configuración del proyecto** › General › Tus apps › Web (‹/›) › registrar. Copia el bloque `firebaseConfig`; va en `config/pruebas.js`.
5. El proyecto ya está en plan **Blaze**. Ponle también una alerta de presupuesto (por ejemplo 5 USD).

En el proyecto **real**, agrega el mismo dominio de prueba solo si quieres probar con datos reales. No es lo recomendado.

## 2. Llave para que GitHub instale en Firebase (una por proyecto)

Repite esto en **cada** proyecto, empezando por el de pruebas:

1. Abre [console.cloud.google.com](https://console.cloud.google.com) y elige el proyecto arriba.
2. Ve a **IAM y administración › Cuentas de servicio › Crear cuenta de servicio**.
   - Nombre: `github-publicar`.
   - Roles: **Editor**, **Usuario de cuenta de servicio** y **Administrador de Cloud Functions**.
3. Abre la cuenta creada › pestaña **Claves** › **Agregar clave › Crear clave nueva › JSON**. Se descarga un archivo.
4. En GitHub entra a **LPS911 › Settings › Secrets and variables › Actions › New repository secret**.
   - Proyecto de pruebas: el nombre del secreto es `FIREBASE_SA_PRUEBAS`.
   - Proyecto real: el nombre del secreto es `FIREBASE_SA_PRODUCCION`.
   - En el valor pegas todo el contenido del archivo JSON.
5. Borra el archivo JSON de tu computadora. Esa llave da acceso total al proyecto: no la compartas ni la subas al repositorio.

## 3. Netlify: GitHub publica la página

En el plan gratuito, Netlify no arma por su cuenta repositorios privados con cambios de otras personas. Por eso es GitHub quien publica, después de revisar.

1. **Detener las compilaciones propias de Netlify.** En el sitio **lps911-central**, entra a **Project configuration › Build & deploy › Continuous deployment**. En **Build settings**, pulsa **Configure**, elige **Stop builds** y guarda.
2. **Crear el token.** Haz clic en tu ícono (abajo a la izquierda) › **User settings** › **Applications** › **Personal access tokens** › **New access token**.
   - Nombre: `github-lps911`.
   - Vencimiento: el más largo que ofrezca.
   - Pulsa **Generate token** y **copia** el token. Solo se muestra una vez.
3. **Guardarlo en GitHub.** Ve a **LPS911 › Settings › Secrets and variables › Actions › New repository secret**. En Name escribe `NETLIFY_AUTH_TOKEN`, en Secret pega el token y pulsa **Add secret**.

Resultado:
- **main** se publica en `https://main--lps911-central.netlify.app`, la copia de prueba.
- **produccion** se publica en `https://lps911-central.netlify.app`, la obra.

## 4. Datos en la copia de prueba

1. Abre `https://main--<tu-sitio>.netlify.app`. Verás la cinta roja **PRUEBAS**.
2. Crea tu cuenta con el mismo correo de administrador y confírmala.
3. En **Equipo › Cargar datos desde archivo**, carga un **respaldo de datos** del sitio real. Así pruebas con datos parecidos sin tocar la obra.

## 5. Cómo se trabaja desde ahora

- Los cambios se suben a **main**. Revisas la copia de prueba.
- Si todo está bien, se abre un *pull request* `main → produccion`; lo aceptas en GitHub y se publica en la obra.
- En la pestaña **Actions** de GitHub ves si la revisión pasó (✓) o falló (✗). Si falla, no se instala nada.
