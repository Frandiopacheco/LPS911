# Página de mudanza para Netlify

La app pasó de Netlify a Firebase Hosting (oct 2026). Esta carpeta es lo único que queda en la dirección antigua
(`lps911-central.netlify.app`): avisa de la nueva dirección (`lps911.web.app`), redirige y quita el service worker y la
versión guardada de la app antigua en cada equipo (`sw.js`).

Se publica a mano, una sola vez: Netlify › sitio **lps911-central** › **Deploys** › arrastrar la carpeta `netlify-mudanza`
(o un .zip con estos archivos) al recuadro «Drag and drop your site output folder». Una publicación a producción gasta
créditos de Netlify: revisar antes en **Billing / Usage** que alcancen.
