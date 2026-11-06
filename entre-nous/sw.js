/* Entre Nous : la page s'ouvre aussitôt depuis l'appareil, puis se met à jour en arrière-plan
   (la nouvelle version s'affiche à l'ouverture suivante). Les échanges avec le service Google ne passent pas par ici. */
const CACHE = 'entre-nous-v1.2';
// Session kept by the page for notifications (service address + token): never removed by an update.
const SESSION = 'entre-nous-session';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icones/icone-180.png', './icones/icone-192.png'];
// One missing file (an icon not yet published) must not block the whole offline copy.
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FICHIERS.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE && n !== SESSION).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(e.request, { ignoreSearch: true });
    const frais = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => enCache);
    return enCache || frais;
  }));
});

/* Notifications : le signal reçu est vide. Le téléphone demande le texte au service avec la session gardée par la page,
   puis l'affiche. Sans réseau ni session, une notification générale s'affiche quand même (exigé par Apple). */
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let a = null;
    try {
      const r = await (await caches.open(SESSION)).match('./session'), s = r && await r.json();
      const sub = await self.registration.pushManager.getSubscription();
      if (s && s.api && s.jeton) {
        const rep = await fetch(s.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'notifDetail', args: { jeton: s.jeton, endpoint: sub ? sub.endpoint : '' } }) });
        const o = await rep.json(); if (o && o.ok) a = o;
      }
    } catch (x) { /* notification générale */ }
    const vue = (a && a.vue) || '';
    await self.registration.showNotification((a && a.titre) || 'Entre Nous', { body: (a && a.texte) || 'Du nouveau dans votre univers à deux ♡',
      icon: 'icones/icone-192.png', badge: 'icones/icone-192.png', tag: 'entre-nous-' + (vue || 'accueil'), data: { vue } });
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const vue = (e.notification.data && e.notification.data.vue) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => {
    if (L.length) { L[0].postMessage({ en: 'aller', vue }); return L[0].focus(); }
    return self.clients.openWindow('./' + (vue ? '?aller=' + encodeURIComponent(vue) : ''));
  }));
});
