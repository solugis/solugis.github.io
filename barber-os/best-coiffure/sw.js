/* BARBER OS — l'interface s'ouvre depuis le cache (même sans réseau) puis se met à jour en arrière-plan.
   VERSION est remplacée par l'empreinte des fichiers à l'assemblage (build.py) ; les données ne passent jamais par ce cache. */
var VERSION = 'barberos-071dbbdbc9', CACHE = VERSION + '|' + self.registration.scope;
var FICHIERS = ['./', 'index.html', 'style.css', 'i18n.js', 'moteur.js', 'icones.js', 'sons.js', 'demo.js', 'app.js', 'manifest.webmanifest', 'icone-180.png', 'icone-192.png', 'config.js', 'logo-salon.png', 'fond-salon.jpg', 'favicon.png', 'logo-app.png', 'logo-mini.png', 'moyen-wave.png', 'moyen-om.svg', 'moyen-mtn.svg', 'moyen-moov.png', 'moyen-especes.svg', 'moyen-carte.svg', 'moyen-autre.svg'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  var maj = false;
  e.waitUntil(caches.keys().then(function (k) { var vieux = k.filter(function (n) { return n.indexOf('barberos-') === 0 && n.slice(n.indexOf('|') + 1) === self.registration.scope && n !== CACHE; }); maj = vieux.length > 0; return Promise.all(vieux.map(function (n) { return caches.delete(n); })); })
    .then(function () { return self.clients.claim(); }).then(function () { return maj ? rechargerAnciennes() : null; }));
});
/* Les pages d'avant le bandeau « Mettre à jour » ne répondent pas à « version ? » : elles sont rechargées d'office, une seule fois.
   Les pages récentes répondent et affichent elles-mêmes le bandeau. */
function rechargerAnciennes() {
  return self.clients.matchAll({ type: 'window' }).then(function (L) { return Promise.all(L.map(function (c) { return new Promise(function (fin) {
    var canal = new MessageChannel(), repondu = false; canal.port1.onmessage = function () { repondu = true; fin(); };
    try { c.postMessage({ en: 'version?' }, [canal.port2]); } catch (x) { }
    setTimeout(function () { if (!repondu && c.navigate) { try { c.navigate(c.url).catch(function () { }); } catch (x) { } } fin(); }, 2500);
  }); })); });
}
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (c) { return c.match(e.request, { ignoreSearch: true }).then(function (r) { var reseau = fetch(e.request).then(function (rep) { if (rep.ok) c.put(e.request, rep.clone()); return rep; }).catch(function () { return r; }); return r || reseau; }); }));
});
