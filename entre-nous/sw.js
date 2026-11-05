/* Entre Nous : la page s'ouvre aussitôt depuis l'appareil, puis se met à jour en arrière-plan
   (la nouvelle version s'affiche à l'ouverture suivante). Les échanges avec le service Google ne passent pas par ici. */
const CACHE = 'entre-nous-v1';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icones/icone-180.png', './icones/icone-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(e.request, { ignoreSearch: true });
    const frais = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => enCache);
    return enCache || frais;
  }));
});
