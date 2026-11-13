/* KALAN — l'interface s'ouvre depuis le cache (même sans réseau) puis se met à jour en arrière-plan.
   Les données passent par le service Apps Script (POST), jamais par ce cache. Ne supprime que ses propres caches (adresse partagée). */
var VERSION = 'kalan-v3', CACHE = VERSION + '|' + self.registration.scope;   // la démo (/kalan/) et l'application (/kalan/app/) ont chacune leur cache
var FICHIERS = ['./', 'index.html', 'style.css', 'config.js', 'base.js', 'programmes.js', 'moteur.js', 'koro.js', 'marque.js', 'sons.js', 'demo.js', 'app.js', 'manifest.webmanifest', 'icones/icone-180.png', 'icones/icone-192.png', 'icones/favicon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (n) { return n.indexOf('kalan-') === 0 && n.slice(n.indexOf('|') + 1) === self.registration.scope && n !== CACHE; }).map(function (n) { return caches.delete(n); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request).then(function (r) {
      var reseau = fetch(e.request).then(function (rep) { if (rep.ok) c.put(e.request, rep.clone()); return rep; }).catch(function () { return r; });
      return r || reseau;
    });
  }));
});
