/* Entre Nous : la page s'ouvre aussitôt depuis l'appareil. Une nouvelle version (ce fichier change à chaque publication :
   le nom du cache porte l'empreinte de la page, calculée par build.py) se télécharge en arrière-plan ; quand elle est prête,
   la page affiche « Mettre à jour » (lot 1.4). Les échanges avec le service Google ne passent pas par ici. */
const CACHE = 'entre-nous-b0453af95a48';
// Session kept by the page for notifications (service address + token): never removed by an update.
const SESSION = 'entre-nous-session';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './histoires.json', './icones/icone-180.png', './icones/icone-192.png'];
// One missing file (an icon not yet published) must not block the whole offline copy.
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FICHIERS.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  let maj = false;
  e.waitUntil(caches.keys().then(k => { const vieux = k.filter(n => n !== CACHE && n !== SESSION); maj = vieux.some(n => n.startsWith('entre-nous-')); return Promise.all(vieux.map(n => caches.delete(n))); })
    .then(() => self.clients.claim()).then(() => maj ? rechargerAnciennes() : null));
});
/* Les pages d'avant la 1.4 n'ont pas le bandeau « Mettre à jour » : elles ne répondent pas à la question « version ? » et sont
   rechargées d'office (une seule fois, au passage à la 1.4). Les pages récentes répondent et affichent elles-mêmes le bandeau. */
function rechargerAnciennes() {
  return self.clients.matchAll({ type: 'window' }).then(L => Promise.all(L.map(c => new Promise(fin => {
    const canal = new MessageChannel(); let repondu = false;
    canal.port1.onmessage = () => { repondu = true; fin(); };
    try { c.postMessage({ en: 'version?' }, [canal.port2]); } catch (x) { /* page fermée */ }
    setTimeout(() => { if (!repondu && c.navigate) { try { c.navigate(c.url).catch(() => {}); } catch (x) { /* navigation refusée */ } } fin(); }, 2500);
  }))));
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Stories (lot 1.9): network first, so that new ones appear at once; the copy serves without network.
  if (new URL(e.request.url).pathname.endsWith('/histoires.json')) { e.respondWith(caches.open(CACHE).then(c => fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => c.match(e.request, { ignoreSearch: true })))); return; }
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
