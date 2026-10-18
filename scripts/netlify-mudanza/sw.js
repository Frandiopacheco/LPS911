/* Service worker de mudanza (dirección antigua de Netlify). Reemplaza al de la app antigua, que seguía mostrando la versión guardada:
   se activa al tiro, borra todo lo guardado, manda cada pestaña abierta a la dirección nueva y se desinstala. */
self.addEventListener('install', function () { self.skipWaiting() });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k) })) } catch (x) {}
    try { await self.clients.claim() } catch (x) {}
    try {
      var cs = await self.clients.matchAll({ type: 'window' });
      for (var c of cs) { try { var u = new URL(c.url); await c.navigate('https://lps911.web.app/' + u.search + u.hash) } catch (x) {} }
    } catch (x) {}
    try { await self.registration.unregister() } catch (x) {}
  })());
});
/* mientras tanto, nada desde lo guardado: todo va al servidor (que ahora solo tiene la página de mudanza) */
self.addEventListener('fetch', function () {});
