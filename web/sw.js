/* LPS 911 · service worker
   - La página abre aunque no haya internet (usa la última versión guardada).
   - Cuando subes una versión nueva, la app avisa "Hay una versión nueva".
   - No toca los datos: Firestore guarda y sincroniza por su cuenta. */
const VER = 'lps911-33';
// Se cambia el número para descartar lo guardado antes: la versión 1 guardaba también respuestas opacas (errores incluidos) para siempre.
const CDN_CACHE = 'lps911-cdn-2';
// ASSETS lo completa scripts/build.mjs con los archivos de css/ y js/ y firebase-config.js (con su versión)
const ASSETS = [];
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'firebase-config.js', ...ASSETS];
const CDN_HOSTS = ['www.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('lps911-') && k !== VER && k !== CDN_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

function timeout(ms) { return new Promise(r => setTimeout(() => r(null), ms)); }
// solo respuestas buenas: una opaca puede ser un error (404/500) y quedaba guardada para siempre
async function put(cacheName, key, res) { try { if (res && res.ok) { const c = await caches.open(cacheName); await c.put(key, res.clone()); } } catch (e) {} return res; }
// Red primero (con espera máxima): si la señal es mala, se usa lo guardado y se actualiza en segundo plano
async function networkFirst(req, key, ms) {
  const net = fetch(req).then(r => put(VER, key, r));
  const cached = await caches.match(key, { ignoreSearch: key !== req });
  if (!cached) { try { return await net; } catch (e) { return new Response('Sin conexión', { status: 503 }); } }
  const r = await Promise.race([net.catch(() => null), timeout(ms)]);
  return r || cached;
}
// Lo guardado primero (la página abre al instante aunque la señal sea mala) y se actualiza en segundo plano para la próxima vez.
// La versión nueva la sigue avisando el service worker nuevo («Hay una versión nueva»): al instalarse guarda su propio index.html.
function staleWhileRevalidate(e, req, key) {
  const net = fetch(req).then(r => put(VER, key, r));
  e.waitUntil(net.then(() => {}, () => {}));
  return caches.match(key).then(hit => hit || net).catch(() => new Response('Sin conexión', { status: 503 }));
}
async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  return put(cacheName, req, r);
}
// CDN: se pide con CORS (todos estos servidores lo permiten) para poder ver si la respuesta es buena antes de guardarla.
// Un <script> sin crossorigin pide en modo no-cors (respuesta opaca, que ya no se guarda); si CORS fallara, se pide como vino.
async function cdnFetch(req) {
  const hit = await caches.match(req.url);
  if (hit) return hit;
  let r = null;
  if (req.mode === 'no-cors') { try { r = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' })); } catch (e) { r = null; } }
  if (!r || !r.ok) r = await fetch(req);
  return put(CDN_CACHE, req.url, r);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/mockdb/')) return;
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
      e.respondWith(staleWhileRevalidate(e, req, 'index.html'));
      return;
    }
    if (url.pathname.endsWith('/sw.js')) return;
    // archivos con versión (js/…?v=NN, css/…?v=NN, plano.js?v=NN, firebase-config.js?v=NN): no cambian nunca, se guardan la primera vez
    if (url.search) { e.respondWith(cacheFirst(req, VER).catch(() => fetch(req))); return; }
    e.respondWith(networkFirst(req, req, 4000));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(cdnFetch(req).catch(() => fetch(req)));
  }
});
