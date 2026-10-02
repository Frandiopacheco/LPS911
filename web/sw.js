/* LPS 911 · service worker
   - La página abre aunque no haya internet (usa la última versión guardada).
   - Cuando subes una versión nueva, la app avisa "Hay una versión nueva".
   - No toca los datos: Firestore guarda y sincroniza por su cuenta. */
const VER = 'lps911-33';
const CDN_CACHE = 'lps911-cdn-1';
// ASSETS lo completa scripts/build.mjs con los archivos de css/ y js/ (con su versión)
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
async function put(cacheName, key, res) { try { if (res && (res.ok || res.type === 'opaque')) { const c = await caches.open(cacheName); await c.put(key, res.clone()); } } catch (e) {} return res; }
// Red primero (con espera máxima): si la señal es mala, se usa lo guardado y se actualiza en segundo plano
async function networkFirst(req, key, ms) {
  const net = fetch(req).then(r => put(VER, key, r));
  const cached = await caches.match(key, { ignoreSearch: key !== req });
  if (!cached) { try { return await net; } catch (e) { return new Response('Sin conexión', { status: 503 }); } }
  const r = await Promise.race([net.catch(() => null), timeout(ms)]);
  return r || cached;
}
async function cacheFirst(req, cacheName) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  return put(cacheName, req, r);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/mockdb/')) return;
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
      e.respondWith(networkFirst(req, 'index.html', 4000));
      return;
    }
    if (url.pathname.endsWith('/sw.js')) return;
    // archivos con versión (js/…?v=NN, css/…?v=NN, plano.js?v=NN): no cambian nunca, se guardan la primera vez
    if (url.search) { e.respondWith(cacheFirst(req, VER).catch(() => fetch(req))); return; }
    e.respondWith(networkFirst(req, req, 4000));
    return;
  }
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req, CDN_CACHE).catch(() => fetch(req)));
  }
});
