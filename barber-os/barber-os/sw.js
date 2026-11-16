/* BARBER OS — l'interface s'ouvre depuis le cache (même sans réseau) puis se met à jour en arrière-plan.
   VERSION est remplacée par l'empreinte des fichiers à l'assemblage (build.py) ; les données ne passent jamais par ce cache. */
var VERSION = 'barberos-b7834e2051', CACHE = VERSION + '|' + self.registration.scope;
var FICHIERS = ['./', 'index.html', 'style.css', 'i18n.js', 'moteur.js', 'icones.js', 'sons.js', 'demo.js', 'app.js', 'manifest.webmanifest', 'icone-180.png', 'icone-192.png', 'favicon.png', 'logo-app.png', 'logo-mini.png', 'moyen-wave.png', 'moyen-om.svg', 'moyen-mtn.svg', 'moyen-moov.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n.indexOf('barberos-') === 0 && n.slice(n.indexOf('|') + 1) === self.registration.scope && n !== CACHE; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(e.request, { ignoreSearch: true }).then(function (r) { var reseau = fetch(e.request).then(function (rep) { if (rep.ok) c.put(e.request, rep.clone()); return rep; }).catch(function () { return r; }); return r || reseau; }); }));
});
