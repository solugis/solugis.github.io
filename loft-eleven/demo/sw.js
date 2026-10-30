/* Loft Eleven — cache limité à l'interface (fichiers statiques, non sensibles).
   Les données ne transitent jamais par ce cache : les appels au service Apps Script partent directement au réseau. */
var VERSION = 'le-d1a74fcb';
var FICHIERS = ['./', 'index.html', 'style.css?v=d1a74fcb', 'config.js?v=d1a74fcb', 'moteur.js?v=d1a74fcb', 'demo-donnees.js?v=d1a74fcb', 'sons.js?v=d1a74fcb', 'js/base.js?v=d1a74fcb', 'js/ecrans.js?v=d1a74fcb', 'js/actions.js?v=d1a74fcb', 'js/demarrage.js?v=d1a74fcb', 'manifest.webmanifest', 'icones/icone-192.png', 'icones/favicon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (l) { return Promise.all(l.filter(function (k) { return k.indexOf('le-') === 0 && k !== VERSION; })   // adresse partagée (solugis.github.io) : ne toucher qu'aux caches de Loft Eleven.map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;   // service de données : jamais mis en cache
  // Réseau d'abord (mise à jour immédiate), cache si la connexion manque.
  e.respondWith(fetch(e.request).then(function (r) { var copie = r.clone(); if (r.ok) caches.open(VERSION).then(function (c) { c.put(e.request, copie); }); return r; }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match('index.html', { cacheName: VERSION }); }); }));
});
