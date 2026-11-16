/* BARBER OS (SoluGis) — interface, données sur l'appareil, synchronisation avec le service Google du salon.
   Trois modes (config.js) : démonstration (données FICTIVES, demo.js), banc d'essai (vrai service simulé dans la page), application réelle.
   Tous les textes passent par i18n.js (t('clé')) : aucun texte en dur. */
(function () {
  'use strict';
  var M = window.BM, IC = window.BIC, I18N = window.BI18N, C = window.BARBER_CONFIG || { api: '' }, VERSION = 'V1 · ' + (window.BARBER_VERSION || 'dev');
  var MODE = !C.api ? 'demo' : C.api === 'banc' ? 'banc' : 'ligne', REEL = MODE !== 'demo';
  var PFX = MODE === 'demo' ? 'barberos.' : MODE === 'banc' ? 'barberos.banc.' : 'barberos.app.';
  var CLE = MODE === 'demo' ? 'barberos.demo.v2' : PFX + 'db', CLE_PREF = PFX === 'barberos.' ? 'barberos.prefs' : PFX + 'prefs', CLE_SERVEUR = 'barberos.serveur.v1', APPAREIL = 'A';
  var PARAMS = new URLSearchParams(location.search);
  var DB, PR, U = null, VUE = 'accueil', CART, ST = {}, PILE = [];

  /* ---------------------------------------------------------------- stockage sur l'appareil
     Préférences : localStorage. Données : localStorage en démonstration ; IndexedDB pour l'application réelle (plusieurs mois de ventes),
     avec repli sur localStorage si IndexedDB est indisponible. */
  function lire(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrire(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast(t('err.stockage'), 'alerte'); } }
  var IDB = null, minuterieSauver = null;
  function ouvrirIDB() { return new Promise(function (ok) { try { var r = indexedDB.open(PFX + 'idb', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { IDB = r.result; ok(IDB); }; r.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
  function idbLire(k) { return new Promise(function (ok) { if (!IDB) return ok(null); try { var q = IDB.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
  function idbEcrire(k, v) { if (!IDB) { ecrire(k, JSON.parse(v)); return; } try { IDB.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch (e) { ecrire(k, JSON.parse(v)); } }
  function sauver() {
    if (!REEL) { ecrire(CLE, DB); return; }
    clearTimeout(minuterieSauver); minuterieSauver = setTimeout(function () { idbEcrire(CLE, JSON.stringify(DB)); }, 250);
  }
  window.addEventListener('pagehide', function () { if (REEL && DB) idbEcrire(CLE, JSON.stringify(DB)); });
  function aujourdhui() { var d = PARAMS.get('date'); return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : M.iso(new Date()); }
  function uid() { return M.uid(APPAREIL); }

  /* ---------------------------------------------------------------- langue (i18n) */
  function langue() { return (U && U.langue) || PR.langue || 'fr'; }
  function t(k, p) {
    var s = I18N[langue()][k]; if (s == null) s = I18N.fr[k]; if (s == null) return '⟦' + k + '⟧';
    if (p) s = s.replace(/\{(\w+)\}/g, function (_, x) { return p[x] != null ? p[x] : ''; });
    return s;
  }
  function nm(o) { return o ? (typeof o === 'string' ? o : (o[langue()] || o.fr)) : ''; }
  function dateLongue(iso) { return new Intl.DateTimeFormat(langue() === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso + 'T12:00:00')); }
  function dateCourte(iso) { return new Intl.DateTimeFormat(langue() === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso + 'T12:00:00')); }

  /* ---------------------------------------------------------------- petits outils */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var F = M.F;
  function ic(n, c) { return IC(n, c); }
  function large() { return window.matchMedia('(min-width: 768px)').matches; }
  function caisseLarge() { return window.matchMedia('(min-width: 1000px)').matches; }   // caisse en deux colonnes : tablette en paysage, ordinateur
  function estGerant() { return U && (U.role === 'proprio' || U.role === 'gerant'); }
  function mixte() { return DB.salon.type === 'mixte'; }
  function user(id) { return DB.utilisateurs.filter(function (u) { return u.id === id; })[0]; }
  function client(id) { return id ? DB.clients.filter(function (k) { return k.id === id; })[0] : null; }
  function prestation(id) { return DB.prestations.filter(function (p) { return p.id === id; })[0]; }
  function produit(id) { return DB.produits.filter(function (p) { return p.id === id; })[0]; }
  function catF(cat) { var c = DB.categories.filter(function (x) { return x.id === cat; })[0]; return c && c.f; }
  function prestVisible(p) { return p.actif && (mixte() || (p.seg !== 'F' && !catF(p.cat))); }
  function prodVisible(a) { return a.actif && (mixte() || !a.f); }
  function stocks() { return M.stocks(DB.mouvements); }
  var COULEURS = ['#8a6a4a', '#4f6d7a', '#6b5b8a', '#8a4f5e', '#5b7a5a'];
  function avatar(u, cls) { return '<span class="avatar ' + (cls || '') + '" style="background:' + COULEURS[(u.couleur || 0) % COULEURS.length] + '">' + esc((u.prenom || '?').slice(0, 1)) + '</span>'; }
  function logoMoyen(id) {
    /* remarque n° 9 : une vraie icône pour chaque moyen (espèces, carte et autre dessinées pour BARBER OS) */
    var img = { especes: 'moyen-especes.svg', wave: 'moyen-wave.png', om: 'moyen-om.svg', mtn: 'moyen-mtn.svg', moov: 'moyen-moov.png', carte: 'moyen-carte.svg', autre: 'moyen-autre.svg' }[id];
    return img ? '<img class="logo-moyen" src="' + img + '" alt="">' : '<span class="logo-moyen trait">' + ic('autre') + '</span>';
  }
  function estMM(id) { return id === 'wave' || id === 'om' || id === 'mtn' || id === 'moov'; }
  function segTag(s) { return mixte() && s ? '<span class="seg seg-' + s + '">' + t('seg.' + s) + '</span>' : ''; }
  function toast(x, ton) { var el = document.createElement('div'); el.className = 'toast ' + (ton || ''); el.textContent = x; document.body.appendChild(el); setTimeout(function () { el.classList.add('on'); }, 10); setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 400); }, 2600); }
  function son(n) { if (PR.sons !== false && window.Sons) window.Sons.jouer(n); }
  function champ(lib, html, aide) { return '<label class="champ"><span class="champ-lib">' + esc(lib) + '</span>' + html + (aide ? '<small class="aide">' + esc(aide) + '</small>' : '') + '</label>'; }
  function inputMontant(nom, v, ph) { return '<input name="' + nom + '" class="montant" inputmode="numeric" autocomplete="off" value="' + (v ? M.nombre(v) : '') + '" placeholder="' + esc(ph || '0') + '">'; }
  function formaterMontants(r) { $$('input.montant', r).forEach(function (i) { i.addEventListener('input', function () { var n = M.lireMontant(i.value); i.value = n ? M.nombre(n) : ''; }); }); }

  /* ---------------------------------------------------------------- fenêtres (feuilles) */
  function ouvrir(titre, html, o) {
    o = o || {};
    var f = document.createElement('div'); f.className = 'voile' + (o.plein ? ' plein' : '');
    f.innerHTML = '<div class="feuille" role="dialog" aria-modal="true"><div class="feuille-tete"><h2>' + esc(titre) + '</h2><button class="btn-rond" data-a="fermer" aria-label="' + esc(t('fermer')) + '">' + ic('croix') + '</button></div><div class="feuille-corps">' + html + '</div></div>';
    f.addEventListener('click', function (e) { if (e.target === f) fermer(); });
    document.body.appendChild(f); PILE.push(f); document.documentElement.classList.add('fige');
    formaterMontants(f);
    return f;
  }
  function fermer() { var f = PILE.pop(); if (f) f.remove(); if (!PILE.length) document.documentElement.classList.remove('fige'); }
  function fermerTout() { while (PILE.length) fermer(); }
  function confirmer(texte, lib, danger) {
    return new Promise(function (ok) {
      var f = ouvrir(t('confirmer'), '<p class="texte">' + esc(texte) + '</p><div class="actions"><button class="btn" data-x="non">' + esc(t('annuler')) + '</button><button class="btn ' + (danger ? 'danger' : 'primaire') + '" data-x="oui">' + esc(lib) + '</button></div>');
      f.addEventListener('click', function (e) { var b = e.target.closest('[data-x]'); if (!b) return; fermer(); ok(b.dataset.x === 'oui'); });
    });
  }

  /* ---------------------------------------------------------------- synchronisation
     Chaque enregistrement part avec un identifiant d'envoi unique (opId) : un renvoi après coupure est ignoré par le service.
     Chaque envoi part avec la session de la personne qui a fait l'opération (appareil partagé). En démonstration, le service est simulé. */
  function enLigne() { return navigator.onLine !== false && !PR.horsLigne; }
  var COL_TYPE = { vente: 'transactions', annulation: 'transactions', client: 'clients', mouvement: 'mouvements', depense: 'depenses', produit: 'produits', prestation: 'prestations', salon: 'salon', utilisateur: 'utilisateurs', passage: 'passages', audit: 'audit' };
  function trouver(col, id) { return col === 'salon' ? DB.salon : (DB[col] || []).filter(function (x) { return x.id === id; })[0]; }
  function empiler(type, ref, opId) {
    if (!REEL) { DB.file.push({ opId: opId || uid(), type: type, ref: ref, ts: Date.now() }); sauver(); planifierSync(); return; }
    var col = COL_TYPE[type], id = col === 'salon' ? 'salon' : ref, doc = col && trouver(col, id); if (!doc || !U) return;
    var copie = JSON.parse(JSON.stringify(doc)); delete copie.sync;
    DB.file = DB.file.filter(function (o) { return !(o.col === col && o.id === id && o.u === U.id); });   // la dernière version suffit
    DB.file.push({ opId: (type === 'vente' && opId) || uid(), u: U.id, col: col, id: id, doc: copie, ts: Date.now() });
    sauver(); planifierSync();
  }
  function noter(o) { o.id = o.id || uid(); o.ts = o.ts || Date.now(); o.par = o.par || (U && U.id); DB.audit.push(o); empiler('audit', o.id); }
  var minuterieSync = null, sync = { etat: 'ok', enCours: false, encore: false, der: 0 };
  function planifierSync() { majPuce(); clearTimeout(minuterieSync); minuterieSync = setTimeout(synchroniser, REEL ? 400 : 1800); }
  /* appel au service : banc = Code.gs dans la page ; réel = fetch en text/plain (pas de requête préalable), 12 s maxi, 2 reprises */
  function attendre(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function erreurCode(m, code) { var e = new Error(m); e.code = code || ''; return e; }
  function appel(fn, args) {
    var corps = JSON.stringify({ fn: fn, args: args || {} }), envoi;
    if (!enLigne()) return Promise.reject(erreurCode(t('sync.horsTxt'), 'reseau'));
    if (MODE === 'banc') envoi = new Promise(function (ok, ko) { setTimeout(function () { try { ok(JSON.parse(JSON.stringify(window.BARBER_SERVEUR.traiter(JSON.parse(corps))))); } catch (e) { ko(e); } }, +(PARAMS.get('lent') || 120)); });
    else envoi = (async function () {
      for (var essai = 0; ; essai++) {
        try { var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, 12000); var r = await fetch(C.api, { method: 'POST', body: corps, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal }); clearTimeout(tm); return await r.json(); }
        catch (e) { if (essai >= 2) throw erreurCode(t('err.reseau'), 'reseau'); await attendre(1200 * (essai + 1)); }
      }
    })();
    return envoi.then(function (rep) { if (!rep || !rep.ok) throw erreurCode((rep && rep.erreur) || t('err.inconnue'), rep && rep.code); return rep; });
  }
  function jeton(u) { var s = (PR.sessions || {})[u]; return s && s.jeton; }
  function sessionExpiree(u) { if (PR.sessions && PR.sessions[u]) { delete PR.sessions[u].jeton; sauverPrefs(); } if (U && U.id === u) { toast(t('connexion.expiree'), 'alerte'); } }
  async function synchroniserReel() {
    if (sync.enCours) { sync.encore = true; return; }
    if (!enLigne() || !DB.file.length) { majPuce(); if (enLigne()) rafraichir(); return; }
    sync.enCours = true; majPuce(); var auteur = null;
    try {
      var auteurs = DB.file.map(function (o) { return o.u; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      for (var k = 0; k < auteurs.length; k++) {
        auteur = auteurs[k]; var j = jeton(auteur); if (!j) continue;          // attendra que cette personne se reconnecte sur l'appareil
        for (;;) {
          var lot = DB.file.filter(function (o) { return o.u === auteur; }).slice(0, 40); if (!lot.length) break;
          var r = await appel('ecrire', { jeton: j, ops: lot.map(function (o) { return { op: 'put', col: o.col, id: o.id, doc: o.doc, opId: o.opId }; }) });
          var faits = {}; lot.forEach(function (o) { faits[o.opId] = 1; if (o.col === 'transactions') { var x = trouver('transactions', o.id); if (x) x.sync = true; } });
          (r.refuses || []).forEach(function (x) { var o = lot.filter(function (y) { return y.opId === x.opId; })[0]; DB.rejets = (DB.rejets || []).concat([{ col: o && o.col, id: o && o.id, erreur: x.erreur, ts: Date.now() }]).slice(-30); });
          if ((r.refuses || []).length) toast(t('sync.refus', { n: r.refuses.length }), 'alerte');
          DB.file = DB.file.filter(function (o) { return !faits[o.opId]; }); sauver();
        }
      }
      sync.etat = 'ok'; sync.der = Date.now();
    } catch (e) {
      if (e.code === 'session' && auteur) sessionExpiree(auteur); else sync.etat = 'hors';
    }
    sync.enCours = false; majPuce();
    if (sync.encore) { sync.encore = false; synchroniserReel(); } else rafraichir();
  }
  /* lecture : seulement ce qui a changé depuis la dernière fois (par personne : chacun ne reçoit que ce qu'il a le droit de voir) */
  async function rafraichir() {
    if (!REEL || !U || !enLigne() || ST.lecture) return; var j = jeton(U.id); if (!j) return;
    ST.lecture = true;
    try {
      DB.vu = DB.vu || {}; var r = await appel('etat', { jeton: j, depuis: DB.vu[U.id] || 0 });
      fusionner(r.data); DB.vu[U.id] = r.version; DB.lu = Date.now(); sauver(); if (sync.etat !== 'hors') sync.etat = 'ok';
      majPuce(); redessinerSiLibre();
    } catch (e) { if (e.code === 'session') sessionExpiree(U.id); else { sync.etat = 'hors'; majPuce(); } }
    ST.lecture = false;
  }
  function fusionner(data) {
    var attente = {}; DB.file.forEach(function (o) { attente[o.col + '|' + o.id] = 1; });
    Object.keys(data || {}).forEach(function (col) {
      if (col === 'salon') { data.salon.forEach(function (d) { if (!attente['salon|salon']) DB.salon = Object.assign({}, DB.salon, d); }); return; }
      var L = DB[col] || (DB[col] = []), idx = {}; L.forEach(function (x, i) { idx[x.id] = i; });
      data[col].forEach(function (d) { if (attente[col + '|' + d.id]) return; d.sync = true; if (idx[d.id] != null) L[idx[d.id]] = d; else { idx[d.id] = L.length; L.push(d); } });
      if (col === 'transactions' || col === 'mouvements' || col === 'audit') L.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      if (col === 'passages') L.sort(function (a, b) { return (a.arrivee || 0) - (b.arrivee || 0); });
    });
    if (U) U = user(U.id) || U;
  }
  function redessinerSiLibre() { var a = document.activeElement; if (PILE.length || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) || !U) return; var y = window.scrollY; dessiner(); window.scrollTo(0, y); }
  function synchroniser() {
    if (REEL) return synchroniserReel();
    if (!enLigne() || !DB.file.length) { majPuce(); return; }
    var serveur = lire(CLE_SERVEUR, { ops: {}, recus: 0, doublons: 0 });
    DB.file.forEach(function (op) {
      if (serveur.ops[op.opId]) { serveur.doublons++; return; }   // déjà reçu : ignoré (anti-doublon)
      serveur.ops[op.opId] = op.type + ':' + op.ref; serveur.recus++;
      if (op.type === 'vente') { var tx = DB.transactions.filter(function (x) { return x.id === op.ref; })[0]; if (tx) tx.sync = true; }
    });
    DB.file = []; ecrire(CLE_SERVEUR, serveur); sauver(); majPuce();
  }
  function majPuce() {
    var p = $('#puce-sync'); if (!p) return;
    var n = DB.file.length, hl = !enLigne() || (REEL && sync.etat === 'hors');
    p.className = 'puce-sync ' + (hl ? 'hors' : n ? 'attente' : 'ok');
    p.innerHTML = ic(hl ? 'horsLigne' : 'nuage') + '<span>' + esc(hl ? (n ? t('sync.horsN', { n: n }) : t('sync.hors')) : n ? t('sync.attente', { n: n }) : t('sync.ok')) + '</span>';
  }

  /* ---------------------------------------------------------------- démarrage */
  function baseVide() {
    var m = window.BDEMO.MODELE;
    return { salon: { nom: '', ville: '', type: 'masculin', configure: false, devise: 'FCFA', modules: { fidelite: true, commissionsVisibles: true, file: false }, fidelite: { seuil: 10 }, remiseCoiffeur: false, moyens: m.salon.moyens.slice(), moyensActifs: m.salon.moyensActifs.slice() },
      utilisateurs: [], categories: m.categories, prestations: [], produits: [], clients: [], transactions: [], mouvements: [], depenses: [], audit: [], passages: [], file: [], numero: 0, vu: {} };
  }
  async function charger(raz) {
    PR = lire(CLE_PREF, {});
    if (!PR.appareil) { PR.appareil = 'A' + Math.random().toString(36).slice(2, 6).toUpperCase(); sauverPrefs(); }
    APPAREIL = PR.appareil;
    if (raz) try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('barberos.panier.') === 0) localStorage.removeItem(k); }); } catch (e) { }
    if (REEL) {
      await ouvrirIDB();
      var brut = raz ? null : await idbLire(CLE); try { DB = brut ? JSON.parse(brut) : lire(CLE, null); } catch (e) { DB = null; }
      if (!DB || !DB.salon) DB = baseVide();
      DB.categories = window.BDEMO.MODELE.categories;
    } else {
      DB = raz ? null : lire(CLE, null);
      if (!DB || !DB.salon) { DB = window.BDEMO.construire(aujourdhui(), new Date()); DB.file = []; sauver(); try { localStorage.removeItem(CLE_SERVEUR); } catch (e) { } }
    }
    ['file', 'passages', 'audit', 'clients', 'depenses', 'mouvements', 'transactions', 'prestations', 'produits', 'utilisateurs'].forEach(function (c) { if (!DB[c]) DB[c] = []; });
    if (!DB.vu) DB.vu = {};
    U = PR.user ? user(PR.user) : null;
    if (REEL && U && !jeton(U.id)) U = null;          // l'appli réelle demande le code à chaque ouverture si la session n'est plus là
    if (REEL && U && !PARAMS.get('user')) { ST.verrou = U.id; U = null; }   // à l'ouverture : code personnel demandé (appareil partagé)
  }
  function sauverPrefs() { ecrire(CLE_PREF, PR); }
  function appliquerTheme() { var r = document.documentElement; r.dataset.theme = PR.theme || 'auto'; r.lang = langue(); }

  /* ---------------------------------------------------------------- navigation */
  var ONGLETS = {
    gerant: [['accueil', 'accueil'], ['stocks', 'stock'], ['vendre', 'vente'], ['stats', 'stats'], ['plus', 'plusMenu']],
    express: [['accueil', 'accueil'], ['produits', 'flacon'], ['vendre', 'vente'], ['historique', 'historique'], ['moi', 'client']]
  };
  var LATERAL_GERANT = [['accueil', 'accueil'], ['vendre', 'vente'], ['file', 'file'], ['stocks', 'stock'], ['stats', 'stats'], ['depenses', 'depense'], ['equipe', 'equipe'], ['clients', 'client'], ['historique', 'historique'], ['parametres', 'reglages']];
  var ROUTES_GERANT = { stocks: 1, stats: 1, plus: 1, depenses: 1, equipe: 1, clients: 1, parametres: 1, config: 1, catalogue: 1 };
  function onglets() { return estGerant() ? ONGLETS.gerant : ONGLETS.express; }
  function lateral() { var L = estGerant() ? LATERAL_GERANT : ONGLETS.express.concat([['file', 'file']]); return fileActive() ? L : L.filter(function (o) { return o[0] !== 'file'; }); }
  function fileActive() { return !!(DB && DB.salon.modules.file); }
  function aller(v, garderDefil) { VUE = v; if (!garderDefil) window.scrollTo(0, 0); dessiner(); }

  function dessiner() {
    if (VUE === 'config') { var cn = $('input[name=nomSalon]'), cv = $('input[name=ville]'); if (cn && cn.value.trim()) DB.salon.nom = cn.value.trim(); if (cv) DB.salon.ville = cv.value.trim(); }   // ne jamais effacer une saisie
    appliquerTheme(); appliquerFond();
    var app = $('#app');
    if (!PR.langue) { app.innerHTML = ecranLangue(); return; }
    if (!U) { if (REEL && ST.verrou && !ST.connexion) ST.connexion = { u: ST.verrou, etape: 'code', saisie: '' }; app.innerHTML = REEL && ST.connexion ? ecranCode() : ecranQui(); if (REEL && !ST.connexion) chargerAnnuaire(); return; }
    var actif = VUE === 'plus' || ['depenses', 'equipe', 'clients', 'parametres'].indexOf(VUE) >= 0 && !large() ? 'plus' : VUE;
    if (VUE === 'file' && !large()) actif = estGerant() ? 'plus' : 'accueil';
    if (!estGerant() && VUE === 'parametres') actif = 'moi';
    if (VUE === 'config' || VUE === 'catalogue') actif = large() ? 'parametres' : 'plus';
    app.innerHTML =
      '<div class="cadre">' +
        '<aside class="nav-lat"><div class="marque">' + marque() + '</div>' +
          lateral().map(function (o) { return '<button class="nav-l' + (VUE === o[0] || (o[0] === 'moi' && VUE === 'moi') ? ' actif' : '') + (o[0] === 'vendre' ? ' vendre' : '') + '" data-a="aller" data-v="' + o[0] + '">' + ic(o[1]) + '<span>' + esc(t('nav.' + o[0])) + '</span></button>'; }).join('') +
          '<button class="nav-l moi" data-a="profil">' + avatar(U) + '<span>' + esc(U.prenom) + '</span></button>' +
        '</aside>' +
        '<div class="colonne">' +
          '<header class="barre">' + logoSalon() + '<div class="barre-txt"><b>' + esc(DB.salon.nom) + '</b><span>' + esc(t('mode.' + (estGerant() ? 'gerant' : 'express'))) + (MODE === 'ligne' ? '' : ' · <em class="badge-demo">' + esc(t(MODE === 'banc' ? 'banc.badge' : 'demo.badge')) + '</em>') + '</span></div>' +
            '<button id="puce-sync" class="puce-sync" data-a="infoSync"></button>' +
            '<button class="btn-profil" data-a="profil" aria-label="' + esc(t('profil.titre')) + '">' + avatar(U) + '</button></header>' +
          '<main id="vue" class="vue vue-' + VUE + '"></main>' +
        '</div>' +
        '<nav class="nav-bas">' + onglets().map(function (o) { return '<button class="nav-b' + (actif === o[0] ? ' actif' : '') + (o[0] === 'vendre' ? ' vendre' : '') + '" data-a="aller" data-v="' + o[0] + '">' + '<span class="nav-ic">' + ic(o[1]) + '</span><span class="nav-lib">' + esc(t('nav.' + o[0])) + '</span></button>'; }).join('') + '</nav>' +
      '</div>';
    majPuce();
    var el = $('#vue');
    if (ROUTES_GERANT[VUE] && !estGerant()) { el.innerHTML = vide('cadenas', t('acces.reserve'), t('acces.reserveTxt')); return; }
    var f = { accueil: estGerant() ? vueAccueilGerant : vueAccueilExpress, vendre: vueVendre, stocks: vueStocks, stats: vueStats, plus: vuePlus, depenses: vueDepenses, equipe: vueEquipe,
      clients: vueClients, historique: vueHistorique, parametres: vueParametres, produits: vueProduits, moi: vueMoi, file: vueFile, config: vueConfig, catalogue: vueCatalogue }[VUE] || vueAccueilExpress;
    f(el);
  }
  function marque() { return '<img class="marque-logo" src="logo-mini.png" alt=""><span class="marque-nom">BARBER OS</span>'; }
  /* personnalisation : logo et arrière-plan du salon (gardés dans les réglages du salon, donc partagés par tous les appareils) */
  function logoSalon(cls) { var s = DB.salon, lg = s.logo || C.logo; return '<span class="logo-salon ' + (cls || '') + '">' + (lg ? '<img src="' + lg + '" alt="">' : esc((s.nom || 'B').replace(/^(le|la|les|the)\s+/i, '').slice(0, 1).toUpperCase())) + '</span>'; }
  var FONDS = ['uni', 'rayures', 'points', 'cuivre', 'photo'];
  function appliquerFond() {
    var f = (DB && DB.salon.fond) || (C.fond ? { id: 'photo', photo: C.fond } : { id: 'uni' }), b = document.body;   // photo du salon par défaut (installation)
    b.dataset.fond = f.id === 'photo' && !f.photo ? 'uni' : f.id;
    if (f.id === 'photo' && f.photo) b.style.setProperty('--photo', 'url("' + f.photo + '")'); else b.style.removeProperty('--photo');
  }
  function lireImage(fichier, max, type, qualite) {
    return new Promise(function (ok, ko) {
      if (!fichier || !/^image\//.test(fichier.type)) { ko(new Error('type')); return; }
      var lecteur = new FileReader();
      lecteur.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL(type, qualite));
        };
        img.onerror = ko; img.src = lecteur.result;
      };
      lecteur.onerror = ko; lecteur.readAsDataURL(fichier);
    });
  }
  function vide(icn, titre, txt, bouton) { return '<div class="etat-vide">' + ic(icn) + '<b>' + esc(titre) + '</b>' + (txt ? '<p>' + esc(txt) + '</p>' : '') + (bouton || '') + '</div>'; }

  /* ---------------------------------------------------------------- première utilisation */
  function ecranLangue() {
    return '<div class="ecran-entree"><img class="logo-entree" src="' + (C.logo || 'logo-app.png') + '" alt="">' +
      '<h1>Choisissez votre langue<br><span>Choose your language</span></h1>' +
      '<div class="choix-langue"><button class="btn-langue" data-a="langueDepart" data-l="fr"><b>Français</b><span>Continuer en français</span></button>' +
      '<button class="btn-langue" data-a="langueDepart" data-l="en"><b>English</b><span>Continue in English</span></button></div>' +
      (REEL ? '' : '<p class="mention-demo">' + ic('info') + 'Démonstration · données fictives — Demo · sample data</p>') + '</div>';
  }
  function ecranQui() {
    return '<div class="ecran-entree"><div class="entree-salon">' + logoSalon('grand') + '<b>' + esc(DB.salon.nom) + '</b></div><h1>' + esc(t('qui.titre')) + '</h1>' + (REEL ? '' : '<p class="sous">' + esc(t('demo.badge')) + ' · ' + esc(t('demo.fictif')) + '</p>') + '' +
      '<div class="liste-qui">' + DB.utilisateurs.filter(function (u) { return u.actif !== false; }).map(function (u) {
        return '<button class="carte-qui" data-a="choisirUser" data-u="' + u.id + '">' + avatar(u, 'grand') + '<span class="qui-txt"><b>' + esc(u.prenom) + '</b><span>' + esc(t('role.' + u.role)) + ' · ' + (u.langue === 'en' ? 'English' : 'Français') + '</span></span>' + ic('droite', 'chev') + '</button>';
      }).join('') + '</div>' +
      (REEL && !DB.utilisateurs.filter(function (u) { return u.actif !== false; }).length ? '<div class="etat-vide">' + ic(enLigne() ? 'nuage' : 'horsLigne') + '<b>' + esc(t(enLigne() ? 'connexion.chargement' : 'connexion.premiere')) + '</b><button class="btn" data-a="annuaire">' + ic('refaire') + esc(t('reessayer')) + '</button></div>' : '') +
      '<p class="mention-demo">' + ic('cadenas') + esc(t(REEL ? 'qui.codePerso' : 'qui.pin')) + '</p>' +
      '<button class="lien" data-a="changerLangueDepart">' + ic('langue') + esc(langue() === 'fr' ? 'English' : 'Français') + '</button>' +
      '<div class="signature-produit">' + marque() + '</div></div>';
  }

  /* ---------------------------------------------------------------- CONNEXION (application réelle) : code personnel de 4 à 8 chiffres
     1re fois sur un appareil : code de départ donné par le gérant, vérifié par le service, puis choix de son propre code.
     Ensuite : le code est vérifié sur l'appareil (empreinte salée, jamais le code lui-même), même sans réseau. */
  var dernierAnnuaire = 0;
  async function chargerAnnuaire(force) {
    if (!REEL || !enLigne() || (!force && Date.now() - dernierAnnuaire < 60000)) return;
    dernierAnnuaire = Date.now();
    try {
      var r = await appel('annuaire', {}), vus = {};
      r.utilisateurs.forEach(function (a) { vus[a.id] = 1; var u = user(a.id); if (u) { u.prenom = a.prenom; u.role = a.role; u.langue = u.langue || a.langue; u.couleur = a.couleur; u.actif = true; } else DB.utilisateurs.push({ id: a.id, prenom: a.prenom, role: a.role, langue: a.langue, couleur: a.couleur, actif: true, favoris: [] }); });
      DB.utilisateurs.forEach(function (u) { if (!vus[u.id]) u.actif = false; });
      ['nom', 'ville', 'logo', 'type', 'configure'].forEach(function (k) { if (!DB.file.some(function (o) { return o.col === 'salon'; })) DB.salon[k] = r.salon[k]; });
      sauver(); if (!U && !ST.connexion) dessiner();
    } catch (e) { if (!U && !ST.connexion) { var b = $('.etat-vide b'); if (b) b.textContent = e.message; } }
  }
  async function hacher(x) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return Array.prototype.map.call(new Uint8Array(b), function (o) { return (o < 16 ? '0' : '') + o.toString(16); }).join(''); }
  async function retenir(u, code, j) { var sel = M.uid(APPAREIL); PR.sessions = PR.sessions || {}; PR.sessions[u] = { jeton: j, sel: sel, h: await hacher(sel + '|' + code) }; sauverPrefs(); }
  function ecranCode() {
    var c = ST.connexion, u = user(c.u) || { prenom: '?' }, n = c.saisie.length, s = (PR.sessions || {})[c.u];
    var titre = c.etape === 'code' ? t('connexion.titre', { p: u.prenom }) : c.etape === 'nouveau' ? t('connexion.choisir') : t('connexion.confirmer');
    var aide = c.etape === 'code' ? t(s && s.h ? 'connexion.aide' : 'connexion.aideDepart') : t(c.etape === 'nouveau' ? 'connexion.aideNouveau' : 'connexion.aideConfirmer');
    return '<div class="ecran-entree ecran-code">' + avatar(u, 'grand') + '<h1>' + esc(titre) + '</h1><p class="sous">' + esc(aide) + '</p>' +
      '<div class="points-code" aria-label="' + esc(t('connexion.saisis', { n: n })) + '">' + [0, 1, 2, 3, 4, 5, 6, 7].slice(0, Math.max(4, n + (n < 8 ? 1 : 0))).map(function (i) { return '<i class="' + (i < n ? 'plein' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="erreur-code" role="alert">' + esc(c.erreur || (c.attente ? t('connexion.verification') : '')) + '</p>' +
      '<div class="pave">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'eff', '0', 'ok'].map(function (k) { return '<button class="touche' + (k === 'ok' ? ' ok' : k === 'eff' ? ' eff' : '') + '" data-a="touche" data-k="' + k + '"' + (c.attente ? ' disabled' : '') + ' aria-label="' + esc(k === 'ok' ? t('valider') : k === 'eff' ? t('effacer') : k) + '">' + (k === 'ok' ? ic('coche') : k === 'eff' ? ic('gauche') : k) + '</button>'; }).join('') + '</div>' +
      '<button class="lien" data-a="changerUser">' + ic('client') + esc(t('connexion.autre')) + '</button></div>';
  }
  function majCode() { var a = $('#app'); if (a && ST.connexion) a.innerHTML = ecranCode(); }
  async function validerCode() {
    var c = ST.connexion; if (!c || c.attente) return;
    if (c.saisie.length < 4) { c.erreur = t('connexion.court'); majCode(); return; }
    c.erreur = '';
    if (c.etape === 'nouveau') { c.nouveau = c.saisie; c.etape = 'confirmer'; c.saisie = ''; majCode(); return; }
    if (c.etape === 'confirmer' && c.saisie !== c.nouveau) { c.erreur = t('connexion.different'); c.etape = 'nouveau'; c.saisie = ''; majCode(); return; }
    var s = (PR.sessions || {})[c.u];
    if (c.etape === 'code' && s && s.h && s.jeton && await hacher(s.sel + '|' + c.saisie) === s.h) return ouvrirSession(c.u);
    if (!enLigne()) { c.erreur = t(s && s.h ? 'connexion.incorrect' : 'connexion.horsLigne'); c.saisie = ''; majCode(); return; }
    c.attente = true; majCode();
    try {
      var r = c.etape === 'code' ? await appel('connexion', { user: c.u, code: c.saisie }) : await appel('connexion', { user: c.u, code: c.depart, nouveau: c.nouveau });
      if (r.etape === 'nouveau') { c.depart = c.saisie; c.etape = 'nouveau'; c.saisie = ''; c.attente = false; majCode(); return; }
      await retenir(c.u, c.etape === 'code' ? c.saisie : c.nouveau, r.jeton);
      ouvrirSession(c.u);
    } catch (e) { c.attente = false; c.erreur = e.message; c.saisie = ''; if (c.etape === 'confirmer') c.etape = 'nouveau'; majCode(); }
  }
  function ouvrirSession(u) {
    ST.connexion = null; ST.verrou = null; U = user(u); PR.user = u; sauverPrefs(); CART = null; chargerPanier();
    VUE = estGerant() && !DB.salon.configure ? 'config' : 'accueil'; son('ouverture'); dessiner();
    rafraichir().then(function () { if (U && estGerant() && !DB.salon.configure && VUE === 'accueil') aller('config'); });
    synchroniser();
  }
  document.addEventListener('keydown', function (e) {
    if (!ST.connexion || U) return;
    if (/^\d$/.test(e.key)) { if (ST.connexion.saisie.length < 8) { ST.connexion.saisie += e.key; ST.connexion.erreur = ''; majCode(); } }
    else if (e.key === 'Backspace') { ST.connexion.saisie = ST.connexion.saisie.slice(0, -1); majCode(); }
    else if (e.key === 'Enter') validerCode();
  });

  /* ---------------------------------------------------------------- calculs partagés par les écrans */
  function stPeriode(deb, fin, seg) { return M.periode({ txs: DB.transactions, deb: deb, fin: fin, seg: seg, utilisateurs: DB.utilisateurs, produits: DB.produits, prestations: DB.prestations }); }
  function alertesStock() { var s = stocks(); return DB.produits.filter(function (a) { return prodVisible(a) && M.etatStock(a, s[a.id] || 0) !== 'ok'; }); }
  function mesTx(jour) { return DB.transactions.filter(function (x) { return x.date === jour && (estGerant() || U.role === 'caissier' || x.caissier === U.id || x.lignes.some(function (l) { return l.par === U.id; })); }); }
  function resumeLignes(x) { return x.lignes.map(function (l) { return nm(l.nom) + (l.q > 1 ? ' ×' + l.q : ''); }).join(' + '); }
  function moyensTx(x) { return (x.paiements || []).map(function (p) { return logoMoyen(p.moyen); }).join(''); }
  function ligneTx(x) {
    return '<button class="ligne-tx' + (x.statut !== 'validee' ? ' annulee' : '') + '" data-a="detailTx" data-id="' + x.id + '"><span class="tx-h">' + M.heure(x.ts) + '</span><span class="tx-txt"><b>' + esc(resumeLignes(x)) + '</b><span>' +
      esc((user(x.lignes[0] && x.lignes[0].par) || {}).prenom || '') + (x.client ? ' · ' + esc((client(x.client) || {}).prenom || '') : '') + (x.statut !== 'validee' ? ' · ' + esc(t('tx.annulee')) : '') + (x.sync === false ? ' · ' + esc(t('sync.nonEnvoye')) : '') + '</span></span>' +
      '<span class="tx-m">' + moyensTx(x) + '<b>' + F(x.total) + '</b></span></button>';
  }
  /* case chiffrée ; avec `det`, un toucher ouvre son détail (remarque n° 3 du 16/11/2026) */
  function kpi(lib, val, sous, cls, det) {
    var dedans = (det ? ic('droite', 'kpi-plus') : '') + '<span class="kpi-lib">' + esc(lib) + '</span><b class="kpi-val">' + val + '</b>' + (sous ? '<span class="kpi-sous">' + sous + '</span>' : '');
    return det ? '<button class="kpi ' + (cls || '') + '" data-a="kpi" data-k="' + esc(det) + '">' + dedans + '</button>' : '<div class="kpi ' + (cls || '') + '">' + dedans + '</div>';
  }
  function K() { return Array.prototype.slice.call(arguments).map(function (x) { return x == null ? '' : x; }).join('|'); }

  /* ---------------------------------------------------------------- ACCUEIL EXPRESS (coiffeur, caissier) */
  function salut() { var h = new Date().getHours(); return t(h < 12 ? 'salut.matin' : h < 18 ? 'salut.aprem' : 'salut.soir', { p: U.prenom }); }
  function vueAccueilExpress(el) {
    if (REEL && !DB.salon.configure) { el.innerHTML = vide('reglages', t('config.attente'), t('config.attenteTxt')); return; }
    var auj = aujourdhui(), st = stPeriode(auj, auj), moi = st.employes[U.id] || { ca: 0, nbPrest: 0, commission: 0 };
    var favs = (U.favoris || []).map(function (id) { return prestation(id) || produit(id); }).filter(function (x) { return x && (x.prix != null ? prestVisible(x) : prodVisible(x)); });
    var recents = mesTx(auj).filter(function (x) { return x.statut === 'validee'; }).slice(-4).reverse();
    el.innerHTML =
      '<section class="bloc-salut"><h1>' + esc(salut()) + '</h1><p>' + esc(dateLongue(auj)) + '</p></section>' +
      '<button class="btn-vente-geant" data-a="aller" data-v="vendre">' + ic('plus') + '<span>' + esc(t('vente.nouvelle')) + '</span></button>' + carteFile() +
      '<section class="section"><div class="section-tete"><h2>' + esc(t('fav.titre')) + '</h2><span class="section-aide">' + esc(t('fav.aide')) + '</span></div>' +
        (favs.length ? '<div class="tuiles tuiles-fav">' + favs.map(function (x) { var estP = x.prix != null; return '<button class="tuile" data-a="vendreFav" data-k="' + (estP ? 'P:' : 'A:') + x.id + '">' + ic(estP ? catIc(x.cat) : 'flacon', 'tuile-ic') + '<b>' + esc(nm(x.nom)) + '</b><span class="tuile-prix">' + prixTxt(x) + '</span></button>'; }).join('') + '</div>' : vide('etoile', t('fav.vide'), t('fav.videTxt'))) + '</section>' +
      '<section class="section"><div class="section-tete"><h2>' + esc(t('accueil.maJournee')) + '</h2></div><div class="kpis kpis-3">' +
        kpi(t('kpi.prestations'), M.nombre(U.role === 'caissier' ? st.nbPrest : moi.nbPrest), '', '', K('prest', auj, auj, '', U.role === 'caissier' ? '' : U.id)) +
        kpi(U.role === 'caissier' ? t('kpi.ventesJour') : t('kpi.monCA'), F(U.role === 'caissier' ? st.ca : moi.ca), '', '', K('ventes', auj, auj, '', U.role === 'caissier' ? '' : U.id)) +
        (U.role !== 'caissier' && DB.salon.modules.commissionsVisibles ? kpi(t('kpi.maCommission'), F(moi.commission), esc(t('kpi.commissionCalc')), '', K('com', auj, auj, '', U.id)) : '') +
      '</div></section>' +
      '<section class="section"><div class="section-tete"><h2>' + esc(t('accueil.refaire')) + '</h2></div>' +
        (recents.length ? '<div class="liste">' + recents.map(function (x) { return '<div class="ligne-refaire"><span class="tx-h">' + M.heure(x.ts) + '</span><span class="tx-txt"><b>' + esc(resumeLignes(x)) + '</b><span>' + F(x.total) + '</span></span><button class="btn petit" data-a="refaire" data-id="' + x.id + '">' + ic('refaire') + esc(t('refaire')) + '</button></div>'; }).join('') + '</div>' : vide('historique', t('accueil.aucuneVente'), t('accueil.aucuneVenteTxt'))) + '</section>';
  }
  function catIc(cat) { var c = DB.categories.filter(function (x) { return x.id === cat; })[0]; return c ? c.ic : 'ciseaux'; }
  function prixTxt(x) { return x.prix != null ? (x.variable ? esc(t('prix.des', { p: F(x.prix) })) : F(x.prix)) : F(x.vente); }

  /* ---------------------------------------------------------------- ACCUEIL GÉRANT (tableau de bord du jour) */
  function vueAccueilGerant(el) {
    var auj = aujourdhui(), st = stPeriode(auj, auj), dep = M.depenses(DB.depenses, auj, auj);
    /* comparaison : moyenne des 4 mêmes jours de semaine précédents, à la même heure */
    var h = new Date().getHours(), comp = 0;
    for (var w = 1; w <= 4; w++) { var d = M.ajouter(auj, -7 * w); DB.transactions.forEach(function (x) { if (x.date === d && x.statut === 'validee' && new Date(x.ts).getHours() < h) comp += x.total; }); }
    comp = Math.round(comp / 4);
    var ecart = comp ? Math.round((st.ca - comp) * 100 / comp) : 0;
    var al = alertesStock(), especesCaisse = st.especes - dep.especes;
    var der = DB.transactions.filter(function (x) { return x.date === auj; }).slice(-5).reverse();
    var obs = M.observations({ st: stPeriode(M.ajouter(auj, -6), auj), prec: stPeriode(M.ajouter(auj, -13), M.ajouter(auj, -7)), alertesStock: al.length });
    el.innerHTML =
      '<section class="bloc-salut"><h1>' + esc(salut()) + '</h1><p>' + esc(dateLongue(auj)) + ' · ' + esc(t('accueil.aHeure', { h: M.heure(Date.now()) })) + '</p></section>' +
      '<div class="grille-dash">' +
      '<section class="carte carte-ca large2"><button class="ca-bouton" data-a="kpi" data-k="' + K('ca', auj, auj) + '">' + ic('droite', 'kpi-plus') + '<span class="kpi-lib">' + esc(t('kpi.caJour')) + '</span><b class="ca-geant">' + F(st.ca) + '</b>' +
        (comp ? '<span class="tendance ' + (ecart >= 0 ? 'haut' : 'bas') + '">' + (ecart >= 0 ? '▲ +' : '▼ ') + ecart + ' % ' + esc(t('accueil.vsHabitude')) + '</span>' : '') + '</button>' +
        '<div class="kpis kpis-3">' + kpi(t('kpi.transactions'), M.nombre(st.nbTx), '', '', K('ventes', auj, auj)) + kpi(t('kpi.panier'), F(st.panier), '', '', K('panier', auj, auj)) + kpi(t('kpi.prestations'), M.nombre(st.nbPrest), '', '', K('prest', auj, auj)) + '</div></section>' +
      '<section class="carte"><h2>' + esc(t('kpi.encaisse')) + ' · ' + F(st.encaisse) + '</h2>' + parMoyen(st, auj, auj) +
        '<button class="ligne-info" data-a="kpi" data-k="' + K('especes', auj, auj) + '">' + ic('especes') + '<span>' + esc(t('accueil.especesAttendues')) + '</span><b>' + F(especesCaisse) + '</b>' + ic('droite', 'chev-mini') + '</button><small class="aide">' + esc(t('accueil.especesAide')) + '</small></section>' +
      (fileActive() ? '<section class="carte">' + carteFile(true) + '</section>' : '') +
      '<section class="carte"><h2>' + esc(t('accueil.actions')) + '</h2><div class="actions-rapides">' +
        '<button class="action-r primaire" data-a="aller" data-v="vendre">' + ic('plus') + '<span>' + esc(t('vente.nouvelle')) + '</span></button>' +
        '<button class="action-r" data-a="formDepense">' + ic('depense') + '<span>' + esc(t('dep.ajouter')) + '</span></button>' +
        '<button class="action-r" data-a="choisirEntree">' + ic('entree') + '<span>' + esc(t('stock.entree')) + '</span></button></div></section>' +
      '<section class="carte"><h2>' + esc(t('accueil.alertes')) + '</h2>' + (al.length || st.annulees ?
        (al.length ? '<button class="alerte" data-a="aller" data-v="stocks">' + ic('alerte') + '<span>' + esc(t('accueil.alerteStock', { n: al.length })) + '<small>' + esc(al.slice(0, 3).map(function (a) { return nm(a.nom); }).join(', ')) + '</small></span>' + ic('droite') + '</button>' : '') +
        (st.annulees ? '<button class="alerte" data-a="aller" data-v="historique">' + ic('alerte') + '<span>' + esc(t('accueil.alerteAnnul', { n: st.annulees })) + '</span>' + ic('droite') + '</button>' : '')
        : '<p class="ok-txt">' + ic('coche') + esc(t('accueil.rienASignaler')) + '</p>') + '</section>' +
      '<section class="carte large2"><h2>' + esc(t('accueil.observations')) + '</h2><ul class="obs">' + obs.map(obsTxt).join('') + '</ul><small class="aide">' + esc(t('obs.source')) + '</small></section>' +
      '<section class="carte large2"><div class="section-tete"><h2>' + esc(t('accueil.dernieres')) + '</h2><button class="lien" data-a="aller" data-v="historique">' + esc(t('voirTout')) + '</button></div>' +
        (der.length ? '<div class="liste">' + der.map(ligneTx).join('') + '</div>' : vide('historique', t('accueil.aucuneVente'), t('accueil.aucuneVenteTxt'))) + '</section>' +
      '</div>';
  }
  function parMoyen(st, deb, fin) {
    var tot = st.encaisse || 1, ids = DB.salon.moyens.filter(function (m) { return st.parMoyen[m]; });
    if (!ids.length) return '<p class="aide">' + esc(t('accueil.rienEncaisse')) + '</p>';
    return '<div class="barres-moyens">' + ids.map(function (m) { return (deb ? '<button class="bm" data-a="kpi" data-k="' + K('moyen', deb, fin, m) + '">' : '<div class="bm">') + logoMoyen(m) + '<span class="bm-lib">' + esc(t('moyen.' + m)) + '</span><span class="bm-barre"><i style="width:' + Math.max(3, Math.round(st.parMoyen[m] * 100 / tot)) + '%"></i></span><b>' + F(st.parMoyen[m]) + '</b>' + (deb ? '</button>' : '</div>'); }).join('') + '</div>';
  }
  function obsTxt(o) {
    var p = {}; for (var k in o.p) p[k] = o.p[k];
    if (o.cle === 'obs.jourFort') p.j = t('jour.' + p.j);
    if (o.cle === 'obs.heureForte') p.h = p.h + ' h – ' + (p.h + 1) + ' h';
    if (o.cle === 'obs.topPrest') p.nom = nm(p.nom);
    if (p.m != null) p.m = F(p.m);
    return '<li class="' + (o.ton || '') + '">' + esc(t(o.cle, p)) + '</li>';
  }

  /* ---------------------------------------------------------------- CAISSE EXPRESS */
  function panierVide() { return { lignes: [], client: '', par: parDefaut(), remise: 0, motifRemise: '', pay: [{ moyen: DB.salon.moyensActifs[0] || 'especes', montant: 0, recu: 0 }], refMM: '' }; }
  function parDefaut() { return U.role === 'caissier' ? (PR.dernierPar || coiffeurs()[0].id) : U.id; }
  function coiffeurs() { return DB.utilisateurs.filter(function (u) { return u.role === 'coiffeur' || u.role === 'proprio' || u.role === 'gerant'; }); }
  function chargerPanier() { CART = lire('barberos.panier.' + U.id, null) || panierVide(); }
  function sauverPanier() { ecrire('barberos.panier.' + U.id, CART); }
  function totalPanier() { return M.totaux(CART.lignes, CART.remise); }
  function ajouterArticle(k, prixImpose) {
    var type = k.slice(0, 1), id = k.slice(2), x = type === 'P' ? prestation(id) : produit(id); if (!x) return;
    if (type === 'P' && x.variable && prixImpose == null) { formPrixVariable(x); return; }
    var pu = type === 'P' ? (prixImpose != null ? prixImpose : x.prix) : x.vente;
    var l = CART.lignes.filter(function (y) { return y.k === k && y.pu === pu && !y.offert; })[0];
    if (l) l.q++; else CART.lignes.push({ k: k, type: type, ref: id, nom: x.nom, q: 1, pu: pu, seg: type === 'P' ? x.seg : '', cat: x.cat, fid: !!x.fid });
    if (type === 'A' && (stocks()[id] || 0) <= 0) toast(t('vente.stockZero'), 'alerte');
    sauverPanier(); son('ajout');
  }
  function formPrixVariable(x) {
    var f = ouvrir(nm(x.nom), '<p class="texte">' + esc(t('vente.prixConsult')) + '</p>' + champ(t('vente.prixConvenu'), inputMontant('prix', x.prix)) +
      '<div class="rapides">' + [0, 2000, 5000, 10000].map(function (d) { return '<button class="btn petit" data-plus="' + d + '">' + (d ? '+ ' + F(d) : esc(t('vente.prixBase'))) + '</button>'; }).join('') + '</div>' +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('ajouter')) + '</button></div>');
    var inp = $('input[name=prix]', f);
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-plus]'); if (b) { inp.value = M.nombre(x.prix + +b.dataset.plus); return; }
      if (e.target.closest('[data-x=ok]')) { var p = M.lireMontant(inp.value); if (p <= 0) { toast(t('err.montant'), 'alerte'); return; } fermer(); ajouterArticle('P:' + x.id, p); majCaisse(); }
    });
  }
  ST.caisse = { cat: 'fav', seg: '', q: '', editFav: false };
  function vueVendre(el) {
    if (!CART) chargerPanier();
    var L = caisseLarge(), favs = U.favoris || [];
    if (ST.caisse.cat === 'fav' && !favs.length) ST.caisse.cat = 'coiffure';
    var cats = [['fav', 'etoile', t('cat.fav')]].concat(DB.categories.filter(function (c) { return !c.f || mixte(); }).map(function (c) { return [c.id, c.ic, nm(c.nom)]; })).concat([['produits', 'flacon', t('cat.produits')]]);
    if (!cats.some(function (c) { return c[0] === ST.caisse.cat; })) ST.caisse.cat = 'coiffure';
    el.innerHTML = '<div class="caisse' + (L ? ' large' : '') + '">' +
      '<section class="caisse-cat">' +
        '<div class="recherche">' + ic('recherche') + '<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="' + esc(t('vente.rechercher')) + '" value="' + esc(ST.caisse.q) + '"></div>' +
        (mixte() ? '<div class="segs">' + ['', 'H', 'F', 'U'].map(function (s) { return '<button class="chip' + (ST.caisse.seg === s ? ' actif' : '') + '" data-a="seg" data-s="' + s + '">' + esc(s ? t('seg.' + s) : t('seg.tous')) + '</button>'; }).join('') + '</div>' : '') +
        '<div class="onglets-cat">' + cats.map(function (c) { return '<button class="ong' + (ST.caisse.cat === c[0] ? ' actif' : '') + '" data-a="cat" data-c="' + c[0] + '">' + ic(c[1]) + '<span>' + esc(c[2]) + '</span></button>'; }).join('') + '</div>' +
        (CART.passage && passage(CART.passage) ? '<p class="bandeau-info">' + ic('file') + esc(t('file.encaissement', { n: nomPassage(passage(CART.passage)) })) + '</p>' : '') +
        '<div id="bandeau-fav"></div><div class="tuiles" id="tuiles"></div>' +
        '<button class="lien centre" data-a="editFav">' + ic('etoile') + esc(ST.caisse.editFav ? t('fav.terminer') : t('fav.modifier')) + '</button>' +
      '</section>' +
      (L ? '<aside class="caisse-panier" id="panneau"></aside>' : '') +
    '</div>' + (L ? '' : '<div class="barre-panier" id="barre-panier"></div>');
    var q = $('#q'); q.addEventListener('input', function () { ST.caisse.q = q.value; dessinerTuiles(); });
    majCaisse();
  }
  function articlesCaisse() {
    var s = ST.caisse, q = s.q.trim().toLowerCase(), favs = U.favoris || [], st = stocks();
    var P = DB.prestations.filter(prestVisible).filter(function (p) { return !s.seg || p.seg === s.seg; }).map(function (p) { return { k: 'P:' + p.id, x: p, P: true }; });
    var A = DB.produits.filter(function (a) { return prodVisible(a) && a.usage === 'revente'; }).map(function (a) { return { k: 'A:' + a.id, x: a, P: false, st: st[a.id] || 0 }; });
    var tout = P.concat(s.seg ? [] : A);
    if (q) return tout.filter(function (o) { return (o.x.nom.fr + ' ' + o.x.nom.en).toLowerCase().indexOf(q) >= 0; });
    if (s.cat === 'fav' && !s.editFav) return favs.map(function (id) { return tout.filter(function (o) { return o.x.id === id; })[0]; }).filter(Boolean);
    if (s.cat === 'produits') return A;
    return P.filter(function (o) { return o.x.cat === (s.cat === 'fav' ? 'coiffure' : s.cat); });
  }
  function dessinerTuiles() {
    var g = $('#tuiles'); if (!g) return;
    var favs = U.favoris || [], liste = articlesCaisse(), dans = {};
    CART.lignes.forEach(function (l) { dans[l.k] = (dans[l.k] || 0) + l.q; });
    $('#bandeau-fav').innerHTML = ST.caisse.editFav ? '<p class="bandeau-info">' + ic('etoile') + esc(t('fav.modeEdit')) + '</p>' : '';
    g.innerHTML = liste.length ? liste.map(function (o) {
      var x = o.x, fav = favs.indexOf(x.id) >= 0;
      /* remarque n° 4 : sur une tuile choisie, un bouton « − » retire un article sans ouvrir l'encaissement (bouton frère de la tuile : pas de bouton dans un bouton) */
      var n = ST.caisse.editFav ? 0 : dans[o.k] || 0, stockTxt = o.P ? '' : '<span class="tuile-stock' + (o.st <= x.seuil ? ' bas' : '') + '">' + esc(t('stock.reste', { n: M.nombre(o.st) })) + '</span>';
      return '<div class="tuile-env"><button class="tuile' + (dans[o.k] ? ' choisie' : '') + (ST.caisse.editFav ? ' edit' : '') + '" data-a="tuile" data-k="' + o.k + '">' +
        (n ? '<span class="qte">' + n + '</span>' : '') + (ST.caisse.editFav ? '<span class="fav-et' + (fav ? ' on' : '') + '">' + ic('etoile') + '</span>' : '') +
        '<b>' + esc(nm(x.nom)) + '</b>' + (n && stockTxt ? stockTxt : '') +
        '<span class="tuile-pied' + (n ? ' avec-moins' : '') + '"><span class="tuile-prix">' + prixTxt(x) + '</span>' + (o.P ? segTag(x.seg) : n ? '' : stockTxt) + '</span></button>' +
        (n ? '<button class="tuile-moins" data-a="moinsTuile" data-k="' + o.k + '" aria-label="' + esc(t('vente.retirerUn')) + '">' + ic('moins') + '</button>' : '') + '</div>';
    }).join('') : vide('recherche', t('vente.rien'), '');
  }
  function majCaisse() {
    dessinerTuiles();
    var tot = totalPanier(), n = CART.lignes.reduce(function (s, l) { return s + l.q; }, 0);
    var p = $('#panneau'); if (p) { p.innerHTML = panneauEncaissement(); brancherPanneau(p); }
    var b = $('#barre-panier');
    if (b) b.innerHTML = n ? '<button class="bp-voir" data-a="ouvrirEncaissement"><span class="bp-n">' + n + '</span><span class="bp-txt">' + esc(t('vente.articles', { n: n })) + '<b>' + F(tot.total) + '</b></span></button><button class="btn primaire bp-go" data-a="ouvrirEncaissement">' + esc(t('vente.encaisser')) + ic('droite') + '</button>' : '';
    if (b) b.classList.toggle('on', !!n);
    var f = $('.voile.encaissement .feuille-corps'); if (f) { f.innerHTML = panneauEncaissement(); brancherPanneau(f); }
  }
  function panneauEncaissement() {
    if (!CART.lignes.length) return '<div class="pan-vide">' + vide('vente', t('vente.panierVide'), t('vente.panierVideTxt')) + '</div>';
    var tot = totalPanier(), k = client(CART.client), fid = null;
    if (k && DB.salon.modules.fidelite) fid = M.fidelite(k.id, DB.transactions, DB.salon.fidelite);
    var ligneFid = CART.lignes.filter(function (l) { return l.fid && !l.offert; })[0], offerte = CART.lignes.some(function (l) { return l.offert; });
    var moyens = DB.salon.moyensActifs, split = CART.pay.length > 1, p0 = CART.pay[0];
    var h = '<div class="pan">' +
      '<div class="pan-lignes">' + CART.lignes.map(function (l, i) {
        return '<div class="pl"><span class="pl-txt"><b>' + esc(nm(l.nom)) + '</b><span>' + (l.offert ? '<em class="offert">' + esc(t('fid.offert')) + '</em>' : F(l.pu)) + (l.type === 'A' ? ' · ' + esc(t('vente.produit')) : '') + '</span></span>' +
          '<span class="pl-q"><button class="mini" data-a="q" data-i="' + i + '" data-d="-1" aria-label="−">' + ic('moins') + '</button><b>' + l.q + '</b><button class="mini" data-a="q" data-i="' + i + '" data-d="1" aria-label="+">' + ic('plus') + '</button></span>' +
          '<b class="pl-m">' + F(M.ligneNet(l)) + '</b></div>';
      }).join('') + '</div>' +
      '<div class="pan-rang"><span class="pan-lib">' + esc(t('vente.prestataire')) + '</span><div class="chips">' + coiffeurs().map(function (u) { return '<button class="chip' + (CART.par === u.id ? ' actif' : '') + '" data-a="par" data-u="' + u.id + '">' + esc(u.prenom) + '</button>'; }).join('') + '</div></div>' +
      '<button class="rang" data-a="choisirClient">' + ic('client') + '<span>' + esc(t('vente.client')) + '</span><b>' + esc(k ? k.prenom : t('vente.anonyme')) + '</b>' + ic('droite') + '</button>' +
      (fid ? '<div class="fid-bloc">' + ic('cadeau') + '<span>' + esc(t('fid.progres', { n: fid.progres, s: fid.seuil })) + (fid.disponibles ? '<b>' + esc(t('fid.dispo', { n: fid.disponibles })) + '</b>' : '') + '</span>' +
        (fid.disponibles && ligneFid && !offerte ? '<button class="btn petit primaire" data-a="utiliserFid">' + esc(t('fid.utiliser')) + '</button>' : '') + (offerte ? '<button class="btn petit" data-a="retirerFid">' + esc(t('fid.retirer')) + '</button>' : '') + '</div>' : '') +
      (estGerant() || DB.salon.remiseCoiffeur ? '<button class="rang" data-a="remise">' + ic('remise') + '<span>' + esc(t('vente.remise')) + '</span><b>' + (CART.remise ? '− ' + F(CART.remise) : esc(t('vente.aucune'))) + '</b>' + ic('droite') + '</button>' : '') +
      '<div class="pan-total"><span>' + esc(t('vente.total')) + '</span><b>' + F(tot.total) + '</b></div>' +
      (tot.remises ? '<small class="aide droite">' + esc(t('vente.dontRemise', { m: F(tot.remises) })) + '</small>' : '') +
      '<div class="pan-lib">' + esc(split ? t('vente.paiements') : t('vente.moyen')) + '</div>';
    if (!split) {
      h += '<div class="moyens">' + moyens.map(function (m) { return '<button class="moyen' + (p0.moyen === m ? ' actif' : '') + '" data-a="moyen" data-m="' + m + '">' + logoMoyen(m) + '<span>' + esc(t('moyen.' + m)) + '</span></button>'; }).join('') + '</div>';
      if (p0.moyen === 'especes') {
        var billets = [tot.total].concat([Math.ceil(tot.total / 1000) * 1000, Math.ceil(tot.total / 5000) * 5000, 10000, 20000].filter(function (b, i, a) { return b > tot.total && a.indexOf(b) === i; }).slice(0, 3));
        h += '<div class="especes-bloc">' + champ(t('vente.recu'), inputMontant('recu', p0.recu, M.nombre(tot.total))) +
          '<div class="rapides">' + billets.map(function (b, i) { return '<button class="btn petit' + (p0.recu === b ? ' actif' : '') + '" data-a="billet" data-b="' + b + '">' + (i === 0 ? esc(t('vente.exact')) : F(b)) + '</button>'; }).join('') + '</div>' +
          '<div class="rendu" id="rendu">' + renduTxt(tot.total, p0.recu) + '</div></div>';
      }
    } else {
      var reste = tot.total - CART.pay.slice(0, -1).reduce(function (s, p) { return s + (p.montant || 0); }, 0);
      h += '<div class="split">' + CART.pay.map(function (p, i) {
        var dernier = i === CART.pay.length - 1;
        return '<div class="split-l"><select data-sm="' + i + '">' + moyens.map(function (m) { return '<option value="' + m + '"' + (p.moyen === m ? ' selected' : '') + '>' + esc(t('moyen.' + m)) + '</option>'; }).join('') + '</select>' +
          (dernier ? '<b class="split-reste" id="split-reste">' + F(reste) + '</b>' : '<input class="montant" data-sv="' + i + '" inputmode="numeric" value="' + (p.montant ? M.nombre(p.montant) : '') + '" placeholder="0">') +
          (i > 0 ? '<button class="mini" data-a="retirerPay" data-i="' + i + '" aria-label="' + esc(t('retirer')) + '">' + ic('croix') + '</button>' : '<span class="mini-vide"></span>') + '</div>';
      }).join('') + '<small class="aide">' + esc(t('vente.splitAide')) + '</small></div>';
    }
    h += '<button class="lien" data-a="partager">' + ic('diviser') + esc(split ? t('vente.ajouterMoyen') : t('vente.partager')) + '</button>';
    if (CART.pay.some(function (p) { return estMM(p.moyen); })) h += '<div class="note-mm">' + ic('info') + '<span>' + esc(t('vente.mmNote')) + '</span></div>' + champ(t('vente.refMM'), '<input name="refMM" autocomplete="off" value="' + esc(CART.refMM) + '" placeholder="' + esc(t('facultatif')) + '">');
    h += '<div class="zone-valider"><button class="btn-valider" data-a="valider" id="btn-valider">' + ic('coche') + '<span>' + esc(t('vente.valider', { m: F(tot.total) })) + '</span></button>' +
      '<button class="lien centre discret" data-a="viderPanier">' + esc(t('vente.vider')) + '</button></div></div>';
    return h;
  }
  function renduTxt(total, recu) { return recu > total ? '<span>' + esc(t('vente.aRendre')) + '</span><b>' + F(recu - total) + '</b>' : recu && recu < total ? '<span class="manque">' + esc(t('vente.manque', { m: F(total - recu) })) + '</span>' : ''; }
  function brancherPanneau(r) {
    formaterMontants(r);
    var recu = $('input[name=recu]', r);
    if (recu) recu.addEventListener('input', function () { CART.pay[0].recu = M.lireMontant(recu.value); sauverPanier(); $('#rendu', r).innerHTML = renduTxt(totalPanier().total, CART.pay[0].recu); $$('[data-a=billet]', r).forEach(function (b) { b.classList.toggle('actif', +b.dataset.b === CART.pay[0].recu); }); });
    $$('input[data-sv]', r).forEach(function (i) { i.addEventListener('input', function () { CART.pay[+i.dataset.sv].montant = M.lireMontant(i.value); sauverPanier(); var reste = totalPanier().total - CART.pay.slice(0, -1).reduce(function (s, p) { return s + (p.montant || 0); }, 0); var el = $('#split-reste', r); if (el) { el.textContent = F(reste); el.classList.toggle('neg', reste < 0); } }); });
    $$('select[data-sm]', r).forEach(function (s) { s.addEventListener('change', function () { CART.pay[+s.dataset.sm].moyen = s.value; sauverPanier(); majCaisse(); }); });
    var ref = $('input[name=refMM]', r); if (ref) ref.addEventListener('input', function () { CART.refMM = ref.value; sauverPanier(); });
  }
  function ouvrirEncaissement() {
    var f = ouvrir(t('vente.encaissement'), panneauEncaissement(), { plein: true }); f.classList.add('encaissement'); brancherPanneau($('.feuille-corps', f));
  }

  var enCours = false;
  function valider() {
    if (enCours || !CART.lignes.length) return;
    var tot = totalPanier(), pays;
    if (CART.pay.length === 1) {
      var p = CART.pay[0], recu = p.moyen === 'especes' && p.recu ? p.recu : tot.total;
      if (recu < tot.total) { toast(t('vente.manque', { m: F(tot.total - recu) }), 'alerte'); return; }
      pays = [{ moyen: p.moyen, montant: recu, rendu: recu - tot.total, recu: p.moyen === 'especes' ? recu : undefined }];
    } else {
      var autres = CART.pay.slice(0, -1).reduce(function (s, x) { return s + (x.montant || 0); }, 0), reste = tot.total - autres;
      if (reste < 0 || CART.pay.slice(0, -1).some(function (x) { return !x.montant; })) { toast(t('vente.splitErreur'), 'alerte'); return; }
      pays = CART.pay.map(function (x, i) { return { moyen: x.moyen, montant: i === CART.pay.length - 1 ? reste : x.montant, rendu: 0 }; }).filter(function (x) { return x.montant > 0; });
    }
    enCours = true; var b = $('#btn-valider'); if (b) b.disabled = true;
    var tx = { id: uid(), num: REEL ? APPAREIL + '-' + (++DB.numero) : ++DB.numero, ts: Date.now(), date: aujourdhui(), caissier: U.id, client: CART.client || '', statut: 'validee',
      lignes: CART.lignes.map(function (l) { return { type: l.type, ref: l.ref, nom: l.nom, q: l.q, pu: l.pu, remise: 0, offert: !!l.offert, par: CART.par, seg: l.seg, cat: l.cat, fid: l.fid }; }),
      remise: tot.remiseGlobale, motifRemise: CART.motifRemise || '', total: tot.total, paiements: pays, refMM: CART.refMM || '', opId: uid(), sync: false };
    if (pays.length && CART.refMM) pays.forEach(function (x) { if (estMM(x.moyen)) x.ref = CART.refMM; });
    DB.transactions.push(tx);
    M.mouvementsVente(tx, DB.prestations, uid, DB.produits).forEach(function (m) { DB.mouvements.push(m); empiler('mouvement', m.id); });
    if (tx.remise) noter({ ts: tx.ts, action: 'remise', ref: tx.id, motif: tx.motifRemise, montant: tx.remise });
    if (tx.lignes.some(function (l) { return l.offert; })) noter({ ts: tx.ts, action: 'fidelite', ref: tx.id, motif: '', montant: 0 });
    if (CART.passage) { var pq = DB.passages.filter(function (q) { return q.id === CART.passage; })[0]; if (pq) { pq.statut = 'fini'; pq.fin = tx.ts; pq.tx = tx.id; if (!pq.debut) pq.debut = pq.arrivee; if (!pq.par) pq.par = CART.par; empiler('passage', pq.id); } }
    PR.dernierPar = CART.par; sauverPrefs();
    empiler('vente', tx.id, tx.opId);
    CART = panierVide(); sauverPanier();
    fermerTout(); majCaisse(); son('vente');
    afficherSucces(tx);
    setTimeout(function () { enCours = false; }, 400);
  }
  function afficherSucces(tx) {
    var rendu = M.rendu(tx.paiements), mm = tx.paiements.some(function (p) { return estMM(p.moyen); });
    var f = document.createElement('div'); f.className = 'succes';
    f.innerHTML = '<div class="succes-boite"><div class="succes-coche">' + ic('coche') + '</div><h2>' + esc(t('vente.enregistree')) + '</h2><b class="succes-total">' + F(tx.total) + '</b>' +
      '<p class="succes-moyens">' + tx.paiements.map(function (p) { return logoMoyen(p.moyen) + esc(t('moyen.' + p.moyen)) + ' ' + F(p.montant - (p.rendu || 0)); }).join(' · ') + '</p>' +
      (rendu ? '<div class="succes-rendu"><span>' + esc(t('vente.aRendre')) + '</span><b>' + F(rendu) + '</b></div>' : '') +
      (mm ? '<p class="note-mm">' + ic('info') + esc(t('vente.mmRappel')) + '</p>' : '') +
      '<p class="aide">' + esc(t('vente.majFaites')) + '</p>' +
      '<div class="actions"><button class="btn" data-x="recu">' + ic('recu') + esc(t('recu.voir')) + '</button><button class="btn primaire" data-x="nouvelle">' + ic('plus') + esc(t('vente.nouvelle')) + '</button></div></div>';
    document.body.appendChild(f);
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-x]'); if (!b) return; f.remove(); if (b.dataset.x === 'recu') afficherRecu(tx); dessiner(); });
  }
  function texteRecu(tx) {
    var L = [DB.salon.nom, DB.salon.ville, t('recu.num', { n: tx.num }) + ' · ' + dateCourte(tx.date) + ' ' + M.heure(tx.ts), ''];
    tx.lignes.forEach(function (l) { L.push(nm(l.nom) + (l.q > 1 ? ' ×' + l.q : '') + ' : ' + (l.offert ? t('fid.offert') : F(l.q * l.pu))); });
    if (tx.remise) L.push(t('vente.remise') + ' : − ' + F(tx.remise));
    L.push('', t('vente.total') + ' : ' + F(tx.total));
    tx.paiements.forEach(function (p) { L.push(t('moyen.' + p.moyen) + ' : ' + F(p.montant) + (p.rendu ? ' (' + t('vente.rendu') + ' ' + F(p.rendu) + ')' : '')); });
    L.push('', t('recu.mention'));
    return L.join('\n');
  }
  function afficherRecu(tx) {
    var f = ouvrir(t('recu.titre'), '<pre class="recu">' + esc(texteRecu(tx)) + '</pre><p class="aide">' + esc(t('recu.aide')) + '</p><div class="actions"><button class="btn" data-x="copier">' + esc(t('recu.copier')) + '</button><button class="btn primaire" data-x="partager">' + ic('partager') + esc(t('recu.partager')) + '</button></div>');
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return; var txt = texteRecu(tx);
      if (b.dataset.x === 'copier') { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(t('recu.copie')); }, function () { toast(t('err.copie'), 'alerte'); }); }
      else if (navigator.share) navigator.share({ text: txt }).catch(function () { });
      else window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
    });
  }
  function choisirClient() {
    var regle = DB.salon.modules.fidelite;
    function liste(q) {
      q = (q || '').toLowerCase();
      return '<button class="rang" data-k="">' + ic('client') + '<span>' + esc(t('vente.anonyme')) + '</span>' + (CART.client ? '' : ic('coche')) + '</button>' +
        DB.clients.filter(function (k) { return !q || k.prenom.toLowerCase().indexOf(q) >= 0 || (k.tel || '').replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) >= 0; }).map(function (k) {
          var f = regle ? M.fidelite(k.id, DB.transactions, DB.salon.fidelite) : null;
          return '<button class="rang" data-k="' + k.id + '">' + avatar({ prenom: k.prenom, couleur: +k.id.slice(1) }) + '<span>' + esc(k.prenom) + (f ? '<small>' + esc(t('fid.progres', { n: f.progres, s: f.seuil })) + (f.disponibles ? ' · ' + esc(t('fid.dispo', { n: f.disponibles })) : '') + '</small>' : '') + '</span>' + (CART.client === k.id ? ic('coche') : '') + '</button>';
        }).join('');
    }
    var f = ouvrir(t('vente.client'), '<p class="aide">' + esc(t('client.facultatif')) + '</p><div class="recherche">' + ic('recherche') + '<input id="qk" type="search" autocomplete="off" placeholder="' + esc(t('client.rechercher')) + '"></div><div id="lk" class="liste">' + liste('') + '</div>' +
      '<button class="btn plein" data-x="nouveau">' + ic('plus') + esc(t('client.nouveau')) + '</button>');
    $('#qk', f).addEventListener('input', function () { $('#lk', f).innerHTML = liste(this.value); });
    f.addEventListener('click', function (e) {
      if (e.target.closest('[data-x=nouveau]')) { fermer(); formClient(function (k) { CART.client = k.id; sauverPanier(); majCaisse(); }); return; }
      var b = e.target.closest('[data-k]'); if (!b) return; CART.client = b.dataset.k; CART.lignes.forEach(function (l) { l.offert = false; }); sauverPanier(); fermer(); majCaisse();
    });
  }
  function formClient(apres) {
    var f = ouvrir(t('client.nouveau'), champ(t('client.prenom'), '<input name="prenom" autocomplete="off" maxlength="40">') + champ(t('client.tel'), '<input name="tel" inputmode="tel" autocomplete="off" placeholder="' + esc(t('facultatif')) + '">', t('client.telAide')) +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', function (e) {
      if (!e.target.closest('[data-x=ok]')) return; var p = $('input[name=prenom]', f).value.trim(); if (!p) { toast(t('client.prenomManque'), 'alerte'); return; }
      var k = { id: uid(), prenom: p, tel: $('input[name=tel]', f).value.trim(), cree: Date.now() }; DB.clients.push(k); empiler('client', k.id); fermer(); toast(t('client.ajoute')); if (apres) apres(k); else dessiner();
    });
  }
  function formRemise() {
    var tot = totalPanier();
    var f = ouvrir(t('vente.remise'), champ(t('vente.remiseMontant'), inputMontant('m', CART.remise)) +
      '<div class="rapides">' + [500, 1000, Math.round(tot.brut * 0.1 / 100) * 100].filter(function (x, i, a) { return x > 0 && a.indexOf(x) === i; }).map(function (x, i) { return '<button class="btn petit" data-r="' + x + '">' + (i === 2 ? '10 % · ' : '') + F(x) + '</button>'; }).join('') + '</div>' +
      champ(t('vente.remiseMotif'), '<input name="motif" autocomplete="off" value="' + esc(CART.motifRemise) + '">', t('vente.remiseTrace')) +
      '<div class="actions"><button class="btn" data-x="zero">' + esc(t('vente.sansRemise')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('appliquer')) + '</button></div>');
    f.addEventListener('click', function (e) {
      var r = e.target.closest('[data-r]'); if (r) { $('input[name=m]', f).value = M.nombre(+r.dataset.r); return; }
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'zero') { CART.remise = 0; CART.motifRemise = ''; }
      else { var m = M.lireMontant($('input[name=m]', f).value), mo = $('input[name=motif]', f).value.trim(); if (m && !mo) { toast(t('vente.remiseMotifManque'), 'alerte'); return; } if (m > tot.total + CART.remise) { toast(t('err.montant'), 'alerte'); return; } CART.remise = m; CART.motifRemise = mo; }
      sauverPanier(); fermer(); majCaisse();
    });
  }

  /* ---------------------------------------------------------------- HISTORIQUE */
  ST.histo = { per: 'jour' };
  function vueHistorique(el) {
    var auj = aujourdhui(), per = ST.histo.per, deb = per === 'jour' ? auj : per === 'hier' ? M.ajouter(auj, -1) : M.ajouter(auj, -6), fin = per === 'hier' ? deb : auj;
    var L = DB.transactions.filter(function (x) { return x.date >= deb && x.date <= fin; }).filter(function (x) { return estGerant() || U.role === 'caissier' || x.caissier === U.id || x.lignes.some(function (l) { return l.par === U.id; }); }).reverse();
    var tot = L.filter(function (x) { return x.statut === 'validee'; }).reduce(function (s, x) { return s + x.total; }, 0);
    var jours = {}; L.forEach(function (x) { (jours[x.date] = jours[x.date] || []).push(x); });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(estGerant() || U.role === 'caissier' ? t('histo.titre') : t('histo.mien')) + '</h1></div>' +
      '<div class="chips">' + ['jour', 'hier', 'sept'].map(function (p) { return '<button class="chip' + (per === p ? ' actif' : '') + '" data-a="histoPer" data-p="' + p + '">' + esc(t('per.' + p)) + '</button>'; }).join('') + '</div>' +
      '<p class="resume">' + esc(t('histo.resume', { n: L.length, m: F(tot) })) + '</p>' +
      (L.length ? Object.keys(jours).map(function (d) { return '<h3 class="jour-tete">' + esc(dateLongue(d)) + '</h3><div class="liste">' + jours[d].map(ligneTx).join('') + '</div>'; }).join('') : vide('historique', t('histo.vide'), ''));
  }
  function detailTx(id) {
    var x = DB.transactions.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    var k = client(x.client), peutAnnuler = estGerant() && x.statut === 'validee', com = 0, tot = M.totaux(x.lignes, x.remise);
    x.lignes.forEach(function (l) { com += M.commissionLigne(l, tot.coef, user(l.par)); });
    var f = ouvrir(t('recu.num', { n: x.num }),
      (x.statut !== 'validee' ? '<div class="bandeau-annule">' + ic('alerte') + '<span>' + esc(t('tx.annuleePar', { p: (user(x.annul.par) || {}).prenom || '', m: x.annul.motif })) + '</span></div>' : '') +
      '<div class="detail-l">' + x.lignes.map(function (l) { return '<div class="pl"><span class="pl-txt"><b>' + esc(nm(l.nom)) + (l.q > 1 ? ' ×' + l.q : '') + '</b><span>' + esc((user(l.par) || {}).prenom || '') + (l.type === 'A' ? ' · ' + esc(t('vente.produit')) : '') + '</span></span><b class="pl-m">' + (l.offert ? esc(t('fid.offert')) : F(l.q * l.pu)) + '</b></div>'; }).join('') + '</div>' +
      (x.remise ? '<div class="ligne-info"><span>' + esc(t('vente.remise')) + (x.motifRemise ? ' (' + esc(x.motifRemise) + ')' : '') + '</span><b>− ' + F(x.remise) + '</b></div>' : '') +
      '<div class="pan-total"><span>' + esc(t('vente.total')) + '</span><b>' + F(x.total) + '</b></div>' +
      x.paiements.map(function (p) { return '<div class="ligne-info">' + logoMoyen(p.moyen) + '<span>' + esc(t('moyen.' + p.moyen)) + (p.ref ? ' · ' + esc(p.ref) : '') + '</span><b>' + F(p.montant) + (p.rendu ? ' · ' + esc(t('vente.rendu')) + ' ' + F(p.rendu) : '') + '</b></div>'; }).join('') +
      '<dl class="meta"><dt>' + esc(t('tx.date')) + '</dt><dd>' + esc(dateLongue(x.date)) + ' · ' + M.heure(x.ts) + '</dd><dt>' + esc(t('tx.caissier')) + '</dt><dd>' + esc((user(x.caissier) || {}).prenom || '') + '</dd><dt>' + esc(t('vente.client')) + '</dt><dd>' + esc(k ? k.prenom : t('vente.anonyme')) + '</dd>' +
        (estGerant() || DB.salon.modules.commissionsVisibles ? '<dt>' + esc(t('tx.commission')) + '</dt><dd>' + F(x.statut === 'validee' ? com : 0) + '</dd>' : '') +
        '<dt>' + esc(t('tx.sync')) + '</dt><dd>' + esc(x.sync === false ? t('sync.nonEnvoye') : t('sync.envoye')) + '</dd><dt>' + esc(t('tx.id')) + '</dt><dd class="mono">' + esc(x.id) + '</dd></dl>' +
      '<div class="actions">' + '<button class="btn" data-x="recu">' + ic('recu') + esc(t('recu.voir')) + '</button>' + (x.statut === 'validee' ? '<button class="btn" data-x="refaire">' + ic('refaire') + esc(t('refaire')) + '</button>' : '') + '</div>' +
      (peutAnnuler ? '<button class="btn danger plein" data-x="annuler">' + esc(t('tx.annuler')) + '</button>' : (x.statut === 'validee' && !estGerant() ? '<p class="aide centre">' + ic('cadenas') + esc(t('tx.annulerGerant')) + '</p>' : '')));
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'recu') afficherRecu(x);
      if (b.dataset.x === 'refaire') { fermerTout(); refaire(x.id); }
      if (b.dataset.x === 'annuler') formAnnulation(x);
    });
  }
  function formAnnulation(x) {
    var f = ouvrir(t('tx.annuler'), '<p class="texte">' + esc(t('tx.annulerTxt', { m: F(x.total) })) + '</p>' + champ(t('tx.motif'), '<input name="motif" autocomplete="off" maxlength="120">') +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('retour')) + '</button><button class="btn danger" data-x="ok">' + esc(t('tx.confirmerAnnul')) + '</button></div>');
    f.addEventListener('click', function (e) {
      if (!e.target.closest('[data-x=ok]')) return; var mo = $('input[name=motif]', f).value.trim(); if (!mo) { toast(t('tx.motifManque'), 'alerte'); return; }
      annulerTx(x, mo); fermerTout(); toast(t('tx.annuleeOk')); son('annule'); dessiner();
    });
  }
  function annulerTx(x, motif) {
    if (x.statut !== 'validee') return;
    x.statut = 'annulee'; x.annul = { par: U.id, motif: motif, ts: Date.now() };
    M.mouvementsAnnulation(x, DB.mouvements, uid, U.id).forEach(function (m) { DB.mouvements.push(m); empiler('mouvement', m.id); });
    noter({ action: 'annulation', ref: x.id, motif: motif, montant: x.total });
    empiler('annulation', x.id);
  }
  function refaire(id) {
    var x = DB.transactions.filter(function (y) { return y.id === id; })[0]; if (!x) return;
    if (!CART) chargerPanier();
    CART = panierVide(); CART.client = x.client || '';
    x.lignes.forEach(function (l) { var src = l.type === 'P' ? prestation(l.ref) : produit(l.ref); if (!src) return; var pu = l.type === 'P' ? (src.variable ? l.pu : src.prix) : src.vente; CART.lignes.push({ k: l.type + ':' + l.ref, type: l.type, ref: l.ref, nom: src.nom, q: l.q, pu: pu, seg: l.seg, cat: l.cat, fid: l.fid }); });
    sauverPanier(); aller('vendre'); if (!caisseLarge()) ouvrirEncaissement();
  }

  /* ---------------------------------------------------------------- DÉTAIL D'UNE CASE CHIFFRÉE (remarque n° 3) */
  function periodeTxt(deb, fin) { return !deb ? '' : deb === fin ? dateLongue(deb) : dateCourte(deb) + ' → ' + dateCourte(fin); }
  function detailKpi(k) {
    var p = k.split('|'), type = p[0], deb = p[1], fin = p[2], seg = p[3] || '', emp = p[4] || '';
    var gerantSeul = { file: 1, ca: 1, panier: 1, especes: 1, moyen: 1, remises: 1, annul: 1, prod: 1, valeur: 1, alertes: 1, refs: 1, dep: 1 };
    if (!estGerant()) { if (gerantSeul[type]) return; if (U.role !== 'caissier') emp = U.id; }
    var auMoins = function (x) { return (!seg || type === 'moyen' || x.lignes.some(function (l) { return l.type === 'P' && l.seg === seg; })) && (!emp || x.lignes.some(function (l) { return l.par === emp; })); };
    var txs = DB.transactions.filter(function (x) { return x.date >= deb && x.date <= fin && auMoins(x); });
    var val = txs.filter(function (x) { return x.statut === 'validee'; });
    var titre = '', h = '<p class="resume">' + esc(periodeTxt(deb, fin)) + (emp ? ' · ' + esc((user(emp) || {}).prenom || '') : '') + (seg && type !== 'moyen' && type !== 'dep' && type !== 'file' ? ' · ' + esc(t('seg.' + seg)) : '') + '</p>';
    function listeTx(L) { var lim = 150, tri = L.slice().reverse(); return tri.length ? '<div class="liste">' + tri.slice(0, lim).map(ligneTx).join('') + '</div>' + (tri.length > lim ? '<p class="aide">' + esc(t('det.limite', { n: lim })) + '</p>' : '') : vide('historique', t('det.aucune'), ''); }
    function agreger(typeL) {
      var o = {};
      val.forEach(function (x) { var tot = M.totaux(x.lignes, x.remise); x.lignes.forEach(function (l) { if (l.type !== typeL || (emp && l.par !== emp) || (seg && typeL === 'P' && l.seg !== seg)) return; var r = o[l.ref] || (o[l.ref] = { nom: l.nom, q: 0, ca: 0 }); r.q += l.q; r.ca += Math.round(M.ligneNet(l) * tot.coef); }); });
      return Object.keys(o).map(function (x) { return o[x]; }).sort(function (a, b) { return b.ca - a.ca; });
    }
    function tableau(L, colQ) { if (!L.length) return vide('stats', t('det.aucune'), ''); var max = L[0].ca || 1; return '<ol class="top">' + L.map(function (x) { return '<li><span class="top-nom">' + esc(nm(x.nom)) + '<small>' + esc(t(colQ, { n: x.q, m: F(x.marge || 0) })) + '</small></span><span class="top-barre"><i style="width:' + Math.max(2, Math.round(x.ca * 100 / max)) + '%"></i></span><b>' + F(x.ca) + '</b></li>'; }).join('') + '</ol>'; }
    if (type === 'ca') {
      var st = stPeriode(deb, fin, seg); titre = t('kpi.ca') + ' · ' + F(st.ca);
      h += '<div class="kpis">' + kpi(t('kpi.caPrest'), F(st.caPrest), '', '', K('prest', deb, fin, seg)) + kpi(t('kpi.caProd'), F(st.caProd), esc(t('kpi.nbProd', { n: st.nbProd })), '', seg ? '' : K('prod', deb, fin)) + '</div>' +
        '<h3 class="jour-tete">' + esc(t('det.parEmploye')) + '</h3>' + tableEmployes(st);
      if (deb !== fin) h += '<h3 class="jour-tete">' + esc(t('det.parJour')) + '</h3><div class="table-fin">' + Object.keys(st.parJour).sort().reverse().map(function (d) { return '<div class="tf"><span>' + esc(dateLongue(d)) + '</span><b>' + F(st.parJour[d]) + '</b></div>'; }).join('') + '</div>';
      h += '<button class="btn plein" data-a="kpi" data-k="' + K('ventes', deb, fin, seg) + '">' + ic('historique') + esc(t('det.voirVentes')) + '</button>';
    } else if (type === 'ventes') {
      titre = emp ? t('histo.mien') : t('kpi.transactions'); h += '<p class="resume">' + esc(t('histo.resume', { n: txs.length, m: F(val.reduce(function (s, x) { return s + x.total; }, 0)) })) + '</p>' + listeTx(txs);
    } else if (type === 'panier') {
      var ca = val.reduce(function (s, x) { return s + x.total; }, 0), n = val.length, bornes = [0, 2000, 5000, 10000], cpt = [0, 0, 0, 0];
      val.forEach(function (x) { for (var i = 3; i >= 0; i--) if (x.total >= bornes[i]) { cpt[i]++; break; } });
      var mx = Math.max.apply(null, cpt.concat([1]));
      titre = t('kpi.panier') + ' · ' + F(n ? Math.round(ca / n) : 0);
      h += '<p class="texte">' + esc(t('det.panierCalc', { ca: F(ca), n: n, p: F(n ? Math.round(ca / n) : 0) })) + '</p><h3 class="jour-tete">' + esc(t('det.tranches')) + '</h3>' +
        '<ol class="top">' + cpt.map(function (c, i) { return '<li><span class="top-nom">' + esc(t('det.tranche.' + i)) + '</span><span class="top-barre"><i style="width:' + Math.max(2, Math.round(c * 100 / mx)) + '%"></i></span><b>' + c + '</b></li>'; }).join('') + '</ol>' +
        '<button class="btn plein" data-a="kpi" data-k="' + K('ventes', deb, fin, seg) + '">' + ic('historique') + esc(t('det.voirVentes')) + '</button>';
    } else if (type === 'prest') {
      var LP = agreger('P'); titre = t('kpi.prestations') + ' · ' + LP.reduce(function (s, x) { return s + x.q; }, 0); h += tableau(LP, 'stats.qte');
    } else if (type === 'prod') {
      var LA = agreger('A'); LA.forEach(function (x) { var a = DB.produits.filter(function (y) { return nm(y.nom) === nm(x.nom); })[0]; x.marge = a ? x.ca - a.achat * x.q : 0; });
      titre = t('cat.produits') + ' · ' + LA.reduce(function (s, x) { return s + x.q; }, 0); h += tableau(LA, 'stats.qteMarge');
    } else if (type === 'remises') {
      var LR = val.filter(function (x) { return x.remise || x.lignes.some(function (l) { return l.offert; }); }); titre = t('kpi.remises'); h += listeTx(LR);
    } else if (type === 'annul') {
      var LN = DB.transactions.filter(function (x) { return x.date >= deb && x.date <= fin && x.statut !== 'validee'; }); titre = t('kpi.annulees') + ' · ' + LN.length;
      h += LN.length ? '<div class="liste">' + LN.slice().reverse().map(function (x) { return ligneTx(x) + '<p class="aide">' + esc(t('tx.annuleePar', { p: (user(x.annul.par) || {}).prenom || '', m: x.annul.motif })) + '</p>'; }).join('') + '</div>' : vide('coche', t('det.aucune'), '');
    } else if (type === 'moyen') {
      var LM = val.filter(function (x) { return x.paiements.some(function (q) { return q.moyen === seg; }); }), tm = 0;
      LM.forEach(function (x) { x.paiements.forEach(function (q) { if (q.moyen === seg) tm += q.montant - (q.rendu || 0); }); });
      titre = t('moyen.' + seg) + ' · ' + F(tm); h += (estMM(seg) ? '<div class="note-mm">' + ic('info') + '<span>' + esc(t('det.mmManuel')) + '</span></div>' : '') + listeTx(LM);
    } else if (type === 'especes') {
      var recu = 0, rendu = 0; val.forEach(function (x) { x.paiements.forEach(function (q) { if (q.moyen === 'especes') { recu += q.montant; rendu += q.rendu || 0; } }); });
      var depE = M.depenses(DB.depenses, deb, fin).especes; titre = t('accueil.especesAttendues');
      h += tableFin([[t('det.especesRecu'), recu], [t('det.especesRendu'), -rendu], [t('det.especesDep'), -depE], [t('det.especesAttendu'), recu - rendu - depE, t('det.especesFond'), 'total']]) +
        '<button class="btn plein" data-a="kpi" data-k="' + K('moyen', deb, fin, 'especes') + '">' + ic('historique') + esc(t('det.voirVentes')) + '</button>';
    } else if (type === 'com') {
      var tc = 0, lignesC = val.map(function (x) { var tot = M.totaux(x.lignes, x.remise), c = 0; x.lignes.forEach(function (l) { if (l.par === emp) c += M.commissionLigne(l, tot.coef, user(emp)); }); tc += c; return { x: x, c: c }; }).filter(function (o) { return o.c; });
      titre = t('kpi.maCommission') + ' · ' + F(tc);
      h += '<p class="texte">' + esc(t('det.comCalc')) + ' ' + esc(t('moi.regle', { p: (user(emp).commission || {}).prest || 0, a: (user(emp).commission || {}).prod || 0 })) + '</p>' +
        (lignesC.length ? '<div class="liste">' + lignesC.reverse().slice(0, 150).map(function (o) { return '<button class="ligne-tx" data-a="detailTx" data-id="' + o.x.id + '"><span class="tx-h">' + M.heure(o.x.ts) + '</span><span class="tx-txt"><b>' + esc(resumeLignes(o.x)) + '</b><span>' + esc(dateCourte(o.x.date)) + ' · ' + F(o.x.total) + '</span></span><span class="tx-m"><b>' + F(o.c) + '</b></span></button>'; }).join('') + '</div>' : vide('depense', t('det.aucune'), ''));
    } else if (type === 'file') {
      var LQ = DB.passages.filter(function (q) { return q.date >= deb && q.date <= fin && (seg !== 'parti' || q.statut === 'parti') && (seg !== 'duree' || (q.statut === 'fini' && q.debut)) && (seg !== 'attente' || q.debut); });
      if (seg === 'attente') LQ.sort(function (a, b) { return (b.debut - b.arrivee) - (a.debut - a.arrivee); }); else if (seg === 'duree') LQ.sort(function (a, b) { return (b.fin - b.debut) - (a.fin - a.debut); }); else LQ.sort(function (a, b) { return b.arrivee - a.arrivee; });
      titre = t(seg === 'parti' ? 'file.partis' : seg === 'attente' ? 'file.attenteMoy' : seg === 'duree' ? 'file.dureeMoy' : 'file.arrives') + ' · ' + LQ.length;
      h += LQ.length ? '<div class="liste">' + LQ.slice(0, 150).map(function (q) {
        var att = q.debut ? M.minutes(q.debut - q.arrivee) : M.minutes((q.fin || Date.now()) - q.arrivee), du = q.debut && q.fin ? M.minutes(q.fin - q.debut) : 0;
        return '<' + (q.tx ? 'button data-a="detailTx" data-id="' + q.tx + '"' : 'div') + ' class="ligne-tx"><span class="tx-h">' + M.heure(q.arrivee) + '</span><span class="tx-txt"><b>' + esc(nomPassage(q)) + '</b><span>' + esc(t('file.st.' + q.statut)) + (q.par ? ' · ' + esc((user(q.par) || {}).prenom || '') : '') + (deb !== fin ? ' · ' + esc(dateCourte(q.date)) : '') + '</span></span><span class="tx-m"><b>' + esc(seg === 'duree' ? t('file.min', { m: du }) : t('file.min', { m: att })) + '</b></span></' + (q.tx ? 'button' : 'div') + '>';
      }).join('') + '</div>' : vide('file', t('det.aucune'), '');
    } else if (type === 'valeur' || type === 'alertes' || type === 'refs') {
      var s = stocks(), LS = DB.produits.filter(prodVisible).filter(function (a) { return type !== 'alertes' || M.etatStock(a, s[a.id] || 0) !== 'ok'; });
      if (type === 'valeur') LS.sort(function (a, b) { return Math.max(0, s[b.id] || 0) * b.achat - Math.max(0, s[a.id] || 0) * a.achat; });
      titre = t(type === 'valeur' ? 'stock.valeur' : type === 'alertes' ? 'stock.alertes' : 'stock.references') + ' · ' + LS.length;
      h = (type === 'valeur' ? '<p class="aide">' + esc(t('det.valeurCalc')) + '</p>' : '') + (LS.length ? '<div class="liste">' + LS.map(function (a) { var q = s[a.id] || 0, e = M.etatStock(a, q); return '<button class="ligne-stock" data-a="ficheProduit" data-id="' + a.id + '"><span class="tx-txt"><b>' + esc(nm(a.nom)) + '</b><span class="etat-' + e + '">' + esc(uniteTxt(a, q)) + (e !== 'ok' ? ' · ' + esc(t('stock.' + e)) : '') + '</span></span><b>' + F(Math.max(0, q) * a.achat) + '</b>' + ic('droite') + '</button>'; }).join('') + '</div>' : vide('coche', t('det.aucune'), ''));
    } else if (type === 'dep') {
      var D = DB.depenses.filter(function (x) { return !x.annulee && x.date >= deb && x.date <= fin && (!seg || (seg === 'hors') === !!M.HORS_RESULTAT[x.cat]); }), parC = {}, tot = 0;
      D.forEach(function (x) { parC[x.cat] = (parC[x.cat] || 0) + x.montant; tot += x.montant; });
      titre = t(seg === 'exploit' ? 'dep.exploitation' : seg === 'hors' ? 'dep.horsResultat' : 'dep.total') + ' · ' + F(tot);
      var LC = Object.keys(parC).sort(function (a, b) { return parC[b] - parC[a]; }), mxc = LC.length ? parC[LC[0]] : 1;
      h += '<h3 class="jour-tete">' + esc(t('det.parCat')) + '</h3>' + (LC.length ? '<ol class="top">' + LC.map(function (c) { return '<li><span class="top-nom avec-ic">' + icDep(c) + esc(t('dep.' + c)) + '</span><span class="top-barre"><i style="width:' + Math.max(2, Math.round(parC[c] * 100 / mxc)) + '%"></i></span><b>' + F(parC[c]) + '</b></li>'; }).join('') + '</ol>' : vide('depense', t('det.aucune'), ''));
    } else return;
    ouvrir(titre, h);
  }

  /* ---------------------------------------------------------------- FILE D'ATTENTE (module facultatif, remarque n° 8) */
  function passagesJour() { var d = aujourdhui(); return DB.passages.filter(function (p) { return p.date === d; }); }
  function nomPassage(p) { var k = client(p.client); return t('file.numero', { n: p.num }) + (k ? ' · ' + k.prenom : p.prenom ? ' · ' + p.prenom : ''); }
  function depuis(ts) { return M.minutes(Date.now() - ts); }
  function carteFile(dansCarte) {
    if (!fileActive()) return '';
    var J = passagesJour(), att = J.filter(function (p) { return p.statut === 'attente'; }), enc = J.filter(function (p) { return p.statut === 'encours'; });
    var plusLongue = att.length ? Math.max.apply(null, att.map(function (p) { return depuis(p.arrivee); })) : 0;
    return (dansCarte ? '<h2>' + esc(t('nav.file')) + '</h2>' : '<section class="carte carte-file">') +
      '<button class="resume-file" data-a="aller" data-v="file"><span class="rf-n">' + att.length + '</span><span class="tx-txt"><b>' + esc(t('file.enAttente', { n: att.length })) + '</b><span>' + esc(t('file.resume', { e: enc.length, m: plusLongue })) + '</span></span>' + ic('droite') + '</button>' +
      '<div class="actions-file"><button class="btn primaire" data-a="clientArrive">' + ic('plus') + esc(t('file.arrive')) + '</button><button class="btn" data-a="aller" data-v="file">' + ic('file') + esc(t('file.voir')) + '</button></div>' +
      (dansCarte ? '' : '</section>');
  }
  function vueFile(el) {
    if (!fileActive()) { el.innerHTML = vide('file', t('file.inactive'), estGerant() ? t('file.inactiveTxt') : ''); return; }
    var J = passagesJour().sort(function (a, b) { return a.arrivee - b.arrivee; }), att = J.filter(function (p) { return p.statut === 'attente'; }), enc = J.filter(function (p) { return p.statut === 'encours'; });
    var st = M.file(DB.passages, aujourdhui(), aujourdhui());
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.file')) + '</h1><button class="btn petit primaire" data-a="clientArrive">' + ic('plus') + esc(t('file.arrive')) + '</button></div>' +
      '<p class="bandeau-info">' + ic('info') + esc(t('file.facultatif')) + '</p>' +
      '<h3 class="jour-tete">' + esc(t('file.enCoursTitre', { n: enc.length })) + '</h3>' +
      (enc.length ? '<div class="liste">' + enc.map(function (p) { var u = user(p.par) || {}; return '<div class="passage encours"><span class="pas-n">' + p.num + '</span><span class="tx-txt"><b>' + esc(nomPassage(p)) + '</b><span>' + esc(t('file.avec', { p: u.prenom || '', m: depuis(p.debut) })) + '</span></span><button class="btn petit primaire" data-a="terminerPassage" data-id="' + p.id + '">' + esc(t('file.terminer')) + '</button></div>'; }).join('') + '</div>' : '<p class="aide">' + esc(t('file.aucunEnCours')) + '</p>') +
      '<h3 class="jour-tete">' + esc(t('file.attenteTitre', { n: att.length })) + '</h3>' +
      (att.length ? '<div class="liste">' + att.map(function (p, i) { var su = user(p.souhait); return '<div class="passage' + (depuis(p.arrivee) >= 20 ? ' long' : '') + '"><span class="pas-n">' + p.num + '</span><span class="tx-txt"><b>' + esc(nomPassage(p)) + '</b><span>' + esc(t('file.attend', { m: depuis(p.arrivee) })) + ' · ' + esc(su ? t('file.souhaite', { p: su.prenom }) : t('file.premierLibre')) + (i === 0 ? ' · ' + esc(t('file.suivant')) : '') + '</span></span>' +
        '<span class="pas-actions"><button class="btn petit primaire" data-a="prendrePassage" data-id="' + p.id + '">' + esc(t('file.prendre')) + '</button><button class="btn petit" data-a="partiPassage" data-id="' + p.id + '">' + esc(t('file.parti')) + '</button></span></div>'; }).join('') + '</div>' : vide('file', t('file.vide'), t('file.videTxt'))) +
      '<h3 class="jour-tete">' + esc(t('file.journee')) + '</h3><div class="kpis kpis-3">' +
        kpi(t('file.arrives'), M.nombre(st.arrives), '', '', estGerant() ? K('file', aujourdhui(), aujourdhui()) : '') + kpi(t('file.attenteMoy'), t('file.min', { m: st.attenteMoy }), '', '', estGerant() ? K('file', aujourdhui(), aujourdhui(), 'attente') : '') + kpi(t('file.partis'), M.nombre(st.partis), '', st.partis ? 'alerte' : '', estGerant() ? K('file', aujourdhui(), aujourdhui(), 'parti') : '') + '</div>';
  }
  function clientArrive() {
    var f = ouvrir(t('file.arrive'), champ(t('file.prenom'), '<input name="prenom" autocomplete="off" maxlength="40" placeholder="' + esc(t('facultatif')) + '">', t('file.prenomAide')) +
      '<div class="pan-lib">' + esc(t('file.coiffeur')) + '</div><div class="chips"><button class="chip actif" data-s="">' + esc(t('file.premierLibre')) + '</button>' + coiffeurs().map(function (u) { return '<button class="chip" data-s="' + u.id + '">' + esc(u.prenom) + '</button>'; }).join('') + '</div>' +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + ic('plus') + esc(t('file.ajouter')) + '</button></div>');
    var souhait = '';
    f.addEventListener('click', function (e) {
      var c = e.target.closest('[data-s]'); if (c) { souhait = c.dataset.s; $$('[data-s]', f).forEach(function (b) { b.classList.toggle('actif', b === c); }); return; }
      if (!e.target.closest('[data-x=ok]')) return;
      var prenom = $('input[name=prenom]', f).value.trim(), k = prenom ? DB.clients.filter(function (x) { return x.prenom.toLowerCase() === prenom.toLowerCase(); })[0] : null;
      var J = passagesJour(), p = { id: uid(), date: aujourdhui(), num: J.reduce(function (m, x) { return Math.max(m, x.num || 0); }, 0) + 1, arrivee: Date.now(), debut: 0, fin: 0, statut: 'attente', par: '', souhait: souhait, client: k ? k.id : '', prenom: k ? '' : prenom, tx: '' };
      DB.passages.push(p); empiler('passage', p.id); fermer(); toast(t('file.ajoute', { n: p.num })); son('ajout'); dessiner();
    });
  }
  function passage(id) { return DB.passages.filter(function (p) { return p.id === id; })[0]; }
  function prendrePassage(id) {
    var p = passage(id); if (!p || p.statut !== 'attente') return;
    function prendre(par) { p.statut = 'encours'; p.par = par; p.debut = Date.now(); empiler('passage', p.id); toast(t('file.pris', { n: p.num, p: (user(par) || {}).prenom || '' })); son('onglet'); dessiner(); }
    if (U.role === 'coiffeur') { prendre(U.id); return; }
    var f = ouvrir(t('file.quiPrend', { n: p.num }), '<div class="liste">' + coiffeurs().map(function (u) { return '<button class="rang" data-u="' + u.id + '">' + avatar(u) + '<span>' + esc(u.prenom) + (p.souhait === u.id ? '<small>' + esc(t('file.demande')) + '</small>' : '') + '</span>' + ic('droite') + '</button>'; }).join('') + '</div>');
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-u]'); if (!b) return; fermer(); prendre(b.dataset.u); });
  }
  function terminerPassage(id) {
    var p = passage(id); if (!p) return;
    if (!CART) chargerPanier();
    CART = panierVide(); CART.par = p.par || CART.par; CART.client = p.client || ''; CART.passage = p.id; sauverPanier();
    ST.caisse.cat = (U.favoris || []).length ? 'fav' : 'coiffure'; aller('vendre');
  }
  function partiPassage(id) {
    var p = passage(id); if (!p) return;
    confirmer(t('file.partiTxt', { n: p.num, m: depuis(p.arrivee) }), t('file.parti')).then(function (ok) { if (!ok) return; p.statut = 'parti'; p.fin = Date.now(); empiler('passage', p.id); toast(t('file.partiOk')); dessiner(); });
  }
  /* rafraîchir les minutes d'attente sans jamais effacer une saisie ni fermer une fenêtre */
  setInterval(function () { if (U && (VUE === 'file' || VUE === 'accueil') && fileActive() && !PILE.length && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { var y = window.scrollY; dessiner(); window.scrollTo(0, y); } }, 30000);

  /* ---------------------------------------------------------------- PRODUITS (consultation, mode express) */
  function vueProduits(el) {
    var s = stocks();
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.produits')) + '</h1></div><div class="liste">' + DB.produits.filter(function (a) { return prodVisible(a) && a.usage === 'revente'; }).map(function (a) {
      var q = s[a.id] || 0, e = M.etatStock(a, q);
      return '<div class="ligne-prod"><span class="tx-txt"><b>' + esc(nm(a.nom)) + '</b><span class="etat-' + e + '">' + esc(t('stock.reste', { n: M.nombre(q) })) + (e !== 'ok' ? ' · ' + esc(t('stock.' + e)) : '') + '</span></span><b>' + F(a.vente) + '</b><button class="btn petit primaire" data-a="vendreFav" data-k="A:' + a.id + '">' + esc(t('vendre')) + '</button></div>';
    }).join('') + '</div>' + flaconsDuPoste();
  }
  function flaconsDuPoste() {
    var s = stocks(), L = DB.produits.filter(function (a) { return prodVisible(a) && flacon(a); });
    if (!L.length) return '';
    return '<div class="section-tete section"><h2>' + esc(t('produits.flacons')) + '</h2></div><p class="aide">' + esc(t('produits.flaconsAide')) + '</p><div class="liste">' + L.map(function (a) {
      var e = flaconCours(a), q = s[a.id] || 0;
      return '<div class="ligne-prod"><span class="tx-txt"><b>' + esc(nm(a.nom)) + '</b>' + jauge(a) + '<span>' + esc(t('stock.enCoursCourt', { p: e.pct })) + ' · ' + esc(uniteTxt(a, q)) + '</span></span><button class="btn petit primaire" data-a="flaconTermine" data-id="' + a.id + '">' + esc(t('stock.flaconTermine')) + '</button></div>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- MOI (profil du mode express) */
  function vueMoi(el) {
    var auj = aujourdhui(), deb = M.debutMois(auj), st = stPeriode(deb, auj), moi = st.employes[U.id] || { ca: 0, nbPrest: 0, nbProd: 0, commission: 0 };
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('profil.titre')) + '</h1></div>' +
      '<section class="carte profil-carte">' + avatar(U, 'grand') + '<div><b>' + esc(U.prenom) + '</b><span>' + esc(t('role.' + U.role)) + '</span></div></section>' +
      (U.role !== 'caissier' && DB.salon.modules.commissionsVisibles ? '<section class="section"><div class="section-tete"><h2>' + esc(t('moi.ceMois')) + '</h2></div><div class="kpis kpis-3">' + kpi(t('kpi.prestations'), M.nombre(moi.nbPrest), '', '', K('prest', deb, auj, '', U.id)) + kpi(t('kpi.monCA'), F(moi.ca), '', '', K('ventes', deb, auj, '', U.id)) + kpi(t('kpi.maCommission'), F(moi.commission), esc(t('kpi.commissionCalc')), '', K('com', deb, auj, '', U.id)) + '</div><small class="aide">' + esc(t('moi.regle', { p: U.commission.prest, a: U.commission.prod })) + '</small></section>' : '') +
      reglagesPerso();
  }
  function reglagesPerso() {
    return '<section class="carte"><h2>' + esc(t('profil.langue')) + '</h2><div class="segmente">' + [['fr', 'Français'], ['en', 'English']].map(function (l) { return '<button class="' + (langue() === l[0] ? 'actif' : '') + '" data-a="langue" data-l="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div><small class="aide">' + esc(t('profil.langueAide')) + '</small></section>' +
      '<section class="carte"><h2>' + esc(t('profil.theme')) + '</h2><div class="segmente">' + ['auto', 'clair', 'sombre'].map(function (x) { return '<button class="' + ((PR.theme || 'auto') === x ? 'actif' : '') + '" data-a="theme" data-t="' + x + '">' + esc(t('theme.' + x)) + '</button>'; }).join('') + '</div>' +
      '<label class="interrupteur"><span>' + ic('son') + esc(t('profil.sons')) + '</span><input type="checkbox" data-a="sons"' + (PR.sons !== false ? ' checked' : '') + '><i></i></label></section>' +
      (REEL ? '<section class="carte"><h2>' + esc(t('compte.titre')) + '</h2><button class="rang" data-a="formChangerCode">' + ic('cadenas') + '<span>' + esc(t('compte.changerCode')) + '</span>' + ic('droite') + '</button><button class="rang" data-a="deconnecter">' + ic('sortir') + '<span>' + esc(t('compte.deconnecter')) + '<small>' + esc(t('compte.deconnecterAide')) + '</small></span>' + ic('droite') + '</button></section>' : '') +
      '<button class="btn plein" data-a="changerUser">' + ic('client') + esc(t('profil.changer')) + '</button>';
  }
  function formChangerCode() {
    var f = ouvrir(t('compte.changerCode'), champ(t('compte.ancien'), '<input name="ancien" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8">') + champ(t('compte.nouveau'), '<input name="nouveau" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8">', t('compte.regle')) + champ(t('compte.confirmer'), '<input name="confirmer" type="password" inputmode="numeric" autocomplete="new-password" maxlength="8">') +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', async function (ev) {
      if (!ev.target.closest('[data-x=ok]')) return; var a = $('[name=ancien]', f).value, n = $('[name=nouveau]', f).value, c = $('[name=confirmer]', f).value;
      if (!/^\d{4,8}$/.test(n)) { toast(t('compte.regle'), 'alerte'); return; } if (n !== c) { toast(t('connexion.different'), 'alerte'); return; }
      try { await appel('changerCode', { jeton: jeton(U.id), ancien: a, nouveau: n }); await retenir(U.id, n, jeton(U.id)); fermerTout(); toast(t('compte.codeChange')); } catch (e) { toast(e.message, 'alerte'); }
    });
  }
  function feuilleProfil() {
    var f = ouvrir(U.prenom + ' · ' + t('role.' + U.role), reglagesPerso());
    f.addEventListener('change', function () { });
  }

  /* ---------------------------------------------------------------- STOCKS */
  ST.stock = { usage: 'revente', q: '' };
  function vueStocks(el) {
    var s = stocks(), al = alertesStock(), valeur = 0;
    DB.produits.forEach(function (a) { if (prodVisible(a)) valeur += Math.max(0, s[a.id] || 0) * a.achat; });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.stocks')) + '</h1><button class="btn petit primaire" data-a="formProduit">' + ic('plus') + esc(t('stock.nouveau')) + '</button></div>' +
      '<div class="kpis kpis-3">' + kpi(t('stock.valeur'), F(valeur), esc(t('stock.valeurAide')), '', K('valeur')) + kpi(t('stock.alertes'), M.nombre(al.length), '', al.length ? 'alerte' : '', K('alertes')) + kpi(t('stock.references'), M.nombre(DB.produits.filter(prodVisible).length), '', '', K('refs')) + '</div>' +
      '<div class="segmente">' + ['revente', 'conso'].map(function (u) { return '<button class="' + (ST.stock.usage === u ? 'actif' : '') + '" data-a="stockUsage" data-u="' + u + '">' + esc(t('stock.usage.' + u)) + '</button>'; }).join('') + '</div>' +
      '<small class="aide">' + esc(t('stock.usageAide.' + ST.stock.usage)) + '</small>' +
      '<div class="recherche">' + ic('recherche') + '<input id="qs" type="search" autocomplete="off" placeholder="' + esc(t('stock.rechercher')) + '" value="' + esc(ST.stock.q) + '"></div>' +
      '<div class="liste" id="liste-stock"></div>';
    var q = $('#qs'); q.addEventListener('input', function () { ST.stock.q = q.value; listeStock(); });
    listeStock();
  }
  function uniteTxt(a, q) { return M.nombre(q) + ' ' + t((Math.abs(q) <= 1 ? 'unite1.' : 'uniteN.') + a.unite); }
  function listeStock() {
    var s = stocks(), q = ST.stock.q.toLowerCase();
    var L = DB.produits.filter(function (a) { return prodVisible(a) && a.usage === ST.stock.usage && (!q || (a.nom.fr + ' ' + a.nom.en + ' ' + a.ref).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { var o = { rupture: 0, bas: 1, ok: 2 }; return o[M.etatStock(a, s[a.id] || 0)] - o[M.etatStock(b, s[b.id] || 0)]; });
    $('#liste-stock').innerHTML = L.length ? L.map(function (a) {
      var n = s[a.id] || 0, e = M.etatStock(a, n);
      return '<button class="ligne-stock" data-a="ficheProduit" data-id="' + a.id + '"><span class="tx-txt"><b>' + esc(nm(a.nom)) + '</b><span>' + (flacon(a) ? esc(t('stock.enCoursCourt', { p: flaconCours(a).pct })) : esc(a.ref)) + ' · ' + esc(t('stock.seuil', { n: uniteTxt(a, a.seuil) })) + '</span></span><span class="qte-stock etat-' + e + '"><b>' + esc(uniteTxt(a, n)) + '</b>' + (e !== 'ok' ? '<em>' + esc(t('stock.' + e)) + '</em>' : '') + '</span>' + ic('droite') + '</button>';
    }).join('') : vide('stock', t('stock.vide'), '');
  }
  function flacon(a) { return a.unite === 'flacon'; }
  function flaconCours(a) { return M.flaconEnCours(a, DB.transactions, DB.prestations, DB.mouvements); }
  function jauge(a) { var e = flaconCours(a); return '<span class="jauge' + (e.pct <= 15 ? ' bas' : '') + '"><i style="width:' + Math.max(2, e.pct) + '%"></i></span>'; }
  function ficheProduit(id) {
    var a = produit(id), n = stocks()[id] || 0, mv = DB.mouvements.filter(function (m) { return m.produit === id; }).slice(-12).reverse(), fl = flacon(a), ec = fl ? flaconCours(a) : null;
    var kp = fl ? kpi(t('stock.enStock'), esc(uniteTxt(a, n)), '', M.etatStock(a, n) !== 'ok' ? 'alerte' : '') + kpi(t('stock.flaconEnCours'), '≈ ' + M.nombre(ec.reste) + ' ml', jauge(a) + esc(ec.pct + ' %'), ec.pct <= 15 ? 'alerte' : '') + kpi(t('stock.seuilLib'), esc(uniteTxt(a, a.seuil)))
      : kpi(t('stock.enStock'), esc(uniteTxt(a, n)), '', M.etatStock(a, n) !== 'ok' ? 'alerte' : '') + (a.usage === 'revente' ? kpi(t('stock.prixVente'), F(a.vente)) + kpi(t('stock.margeUnit'), F(a.vente - a.achat)) : kpi(t('stock.coutUnit'), F(a.achat)) + kpi(t('stock.seuilLib'), esc(uniteTxt(a, a.seuil))));
    var actions = (fl ? [['termine', 'coche']] : []).concat([['entree', 'entree'], ['perte', 'perte'], ['inventaire', 'inventaire']]);
    var f = ouvrir(nm(a.nom),
      '<div class="kpis kpis-3">' + kp + '</div>' +
      (fl ? '<p class="aide">' + esc(t('stock.flaconEstim', { u: M.nombre(ec.utilise), c: M.nombre(a.contenance) })) + '</p>' + (ec.pct <= 15 ? '<p class="bandeau-info">' + ic('info') + esc(t('stock.flaconVide')) + '</p>' : '') : '') +
      '<div class="actions-rapides' + (actions.length === 4 ? ' quatre' : '') + '">' + actions.map(function (x) { return '<button class="action-r' + (x[0] === 'termine' ? ' primaire' : '') + '" data-x="' + x[0] + '">' + ic(x[1]) + '<span>' + esc(t(x[0] === 'termine' ? 'stock.flaconTermine' : 'stock.' + x[0])) + '</span></button>'; }).join('') + '</div>' +
      '<dl class="meta"><dt>' + esc(t('stock.ref')) + '</dt><dd>' + esc(a.ref) + '</dd><dt>' + esc(t('stock.prixAchat')) + '</dt><dd>' + F(a.achat) + (a.unite !== 'piece' ? ' / ' + esc(t('unite1.' + a.unite)) : '') + '</dd>' +
        (fl ? '<dt>' + esc(t('stock.contenance')) + '</dt><dd>' + M.nombre(a.contenance) + ' ml</dd>' : '') + '<dt>' + esc(t('stock.fournisseur')) + '</dt><dd>' + esc(a.fournisseur || '—') + '</dd></dl>' +
      '<button class="btn plein" data-x="modifierProduit">' + ic('crayon') + esc(t('stock.modifier')) + '</button>' +
      (a.usage === 'conso' ? utilisePar(a) : '') +
      '<h3 class="jour-tete">' + esc(t('stock.mouvements')) + '</h3><div class="liste">' + mv.map(function (m) { return '<div class="ligne-mv"><span class="tx-txt"><b>' + esc(t('mv.' + m.type)) + '</b><span>' + esc(dateCourte(M.iso(m.ts))) + ' ' + M.heure(m.ts) + (m.motif ? ' · ' + esc(m.motif) : '') + '</span></span><b class="' + (m.q < 0 ? 'neg' : 'pos') + '">' + (m.q > 0 ? '+' : '') + esc(uniteTxt(a, m.q)) + '</b></div>'; }).join('') + '</div>' +
      '<small class="aide">' + esc(t(fl ? 'stock.calculAideFlacon' : 'stock.calculAide')) + '</small>');
    f.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (b) { if (b.dataset.x === 'termine') flaconTermine(a); else if (b.dataset.x === 'modifierProduit') { fermer(); formProduit(a); } else formMouvement(a, b.dataset.x); return; }
      var r = e.target.closest('[data-retirer-conso]'); if (r) { modifierConso(a, r.dataset.retirerConso, 0); fermer(); ficheProduit(id); return; }
      if (e.target.closest('[data-ajout-conso]')) { var sel = $('select[name=ajoutPrest]', f), q = M.lireMontant($('input[name=ajoutQ]', f).value); if (!sel.value || q <= 0) { toast(t('err.quantite'), 'alerte'); return; } modifierConso(a, sel.value, q); fermer(); ficheProduit(id); }
    });
    $$('input[data-conso]', f).forEach(function (i) { i.addEventListener('change', function () { var q = M.lireMontant(i.value); if (q <= 0) { toast(t('err.quantite'), 'alerte'); return; } modifierConso(a, i.dataset.conso, q); toast(t('stock.consoEnregistree')); }); });
  }
  /* remarque n° 5 : prestations qui utilisent ce produit, quantité modifiable par le gérant (vaut pour les ventes suivantes) */
  function utilisePar(a) {
    var lies = DB.prestations.filter(function (p) { return (p.conso || []).some(function (c) { return c.produit === a.id; }); });
    var u = flacon(a) ? 'ml' : t('unite.' + a.unite), autres = DB.prestations.filter(function (p) { return prestVisible(p) && lies.indexOf(p) < 0; });
    return '<h3 class="jour-tete">' + esc(t('stock.utilisePar')) + '</h3><p class="aide">' + esc(t(flacon(a) ? 'stock.utiliseParAideFlacon' : 'stock.utiliseParAide')) + '</p>' +
      (lies.length ? '<div class="liste">' + lies.map(function (p) { var c = p.conso.filter(function (x) { return x.produit === a.id; })[0]; return '<div class="ligne-conso"><span class="tx-txt"><b>' + esc(nm(p.nom)) + '</b><span>' + esc(t('stock.parPrest', { u: u })) + '</span></span><input class="conso-q" data-conso="' + p.id + '" inputmode="numeric" autocomplete="off" value="' + M.nombre(c.q) + '" aria-label="' + esc(t('stock.quantite')) + '"><button class="mini" data-retirer-conso="' + p.id + '" aria-label="' + esc(t('retirer')) + '">' + ic('croix') + '</button></div>'; }).join('') + '</div>' : '<p class="aide">' + esc(t('stock.aucunePrest')) + '</p>') +
      (autres.length ? '<div class="ajout-conso"><select name="ajoutPrest" aria-label="' + esc(t('stock.ajouterPrest')) + '"><option value="">' + esc(t('stock.ajouterPrest')) + '…</option>' + autres.map(function (p) { return '<option value="' + p.id + '">' + esc(nm(p.nom)) + '</option>'; }).join('') + '</select><input name="ajoutQ" class="conso-q" inputmode="numeric" autocomplete="off" placeholder="' + esc(u) + '"><button class="btn petit" data-ajout-conso="1">' + esc(t('ajouter')) + '</button></div>' : '');
  }
  function modifierConso(a, prestId, q) {
    var p = prestation(prestId); if (!p) return; p.conso = (p.conso || []).filter(function (c) { return c.produit !== a.id; }); var avant = q;
    if (q > 0) p.conso.push({ produit: a.id, q: q });
    noter({ action: 'conso', ref: p.id + '→' + a.id, motif: '', montant: avant });
    sauver(); empiler('prestation', p.id);
  }
  /* remarque n° 6 : « Flacon terminé » retire un flacon du stock et remet la jauge du flacon en cours à plein */
  function flaconTermine(a) {
    var n = stocks()[a.id] || 0;
    if (n <= 0) { toast(t('stock.flaconAucun'), 'alerte'); return; }
    confirmer(t('stock.flaconConfirmer', { nom: nm(a.nom), a: M.nombre(n), b: M.nombre(n - 1) }), t('stock.flaconTermine')).then(function (ok) {
      if (!ok) return;
      var m = { id: uid(), produit: a.id, type: 'termine', q: -1, ts: Date.now(), par: U.id, motif: '' };
      DB.mouvements.push(m); empiler('mouvement', m.id); fermerTout(); toast(t('stock.flaconOk')); son('ajout'); dessiner();
    });
  }
  function formMouvement(a, type) {
    var n = stocks()[a.id] || 0, h = '';
    if (type === 'entree') h = champ(t('stock.quantite') + ' (' + t('unite.' + a.unite) + ')', '<input name="q" class="montant" inputmode="numeric" autocomplete="off">') + champ(t('stock.coutUnit'), inputMontant('cout', a.achat)) +
      champ(t('dep.moyen'), '<select name="moyen">' + DB.salon.moyensActifs.map(function (m) { return '<option value="' + m + '">' + esc(t('moyen.' + m)) + '</option>'; }).join('') + '</select>') +
      '<label class="interrupteur"><span>' + esc(t('stock.aussiDepense')) + '</span><input type="checkbox" name="dep" checked><i></i></label><small class="aide">' + esc(t('stock.aussiDepenseAide')) + '</small>';
    if (type === 'perte') h = champ(t('stock.quantite') + ' (' + t('unite.' + a.unite) + ')', '<input name="q" class="montant" inputmode="numeric" autocomplete="off">') + champ(t('stock.motif'), '<select name="motif">' + ['casse', 'perime', 'vol', 'usage', 'autre'].map(function (m) { return '<option value="' + m + '">' + esc(t('perte.' + m)) + '</option>'; }).join('') + '</select>') + champ(t('stock.precision'), '<input name="note" autocomplete="off">');
    if (type === 'inventaire') h = '<p class="texte">' + esc(t('stock.inventaireTxt', { n: uniteTxt(a, n) })) + '</p>' + champ(t('stock.compte') + ' (' + t('unite.' + a.unite) + ')', '<input name="q" class="montant" inputmode="numeric" autocomplete="off">') + champ(t('stock.precision'), '<input name="note" autocomplete="off" placeholder="' + esc(t('facultatif')) + '">');
    var f = ouvrir(t('stock.' + type) + ' · ' + nm(a.nom), h + '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', function (e) {
      if (!e.target.closest('[data-x=ok]')) return;
      var q = M.lireMontant($('input[name=q]', f).value), m = { id: uid(), produit: a.id, ts: Date.now(), par: U.id, motif: '' };
      if (type !== 'inventaire' && q <= 0) { toast(t('err.quantite'), 'alerte'); return; }
      if (type === 'inventaire' && $('input[name=q]', f).value.trim() === '') { toast(t('err.quantite'), 'alerte'); return; }
      if (type === 'entree') { var cout = M.lireMontant($('input[name=cout]', f).value); m.type = 'entree'; m.q = q; m.cout = cout; if ($('input[name=dep]', f).checked && cout) { var d = { id: uid(), date: aujourdhui(), cat: 'stock', montant: Math.round(q * cout), moyen: $('select[name=moyen]', f).value, note: nm(a.nom) + ' ×' + q, par: U.id, ts: Date.now() }; DB.depenses.push(d); empiler('depense', d.id); } }
      if (type === 'perte') { m.type = 'perte'; m.q = -q; m.motif = t('perte.' + $('select[name=motif]', f).value) + ($('input[name=note]', f).value.trim() ? ' – ' + $('input[name=note]', f).value.trim() : ''); }
      if (type === 'inventaire') { m.type = 'inventaire'; m.q = q - n; m.motif = $('input[name=note]', f).value.trim(); if (!m.q) { fermerTout(); toast(t('stock.inventaireJuste')); return; } noter({ ts: m.ts, action: 'inventaire', ref: a.id, motif: m.motif, montant: m.q }); }
      DB.mouvements.push(m); empiler('mouvement', m.id); fermerTout(); toast(t('stock.enregistre')); son('ajout'); dessiner();
    });
  }
  function choisirEntree() {
    var f = ouvrir(t('stock.entree'), '<p class="aide">' + esc(t('stock.choisirProduit')) + '</p><div class="liste">' + DB.produits.filter(prodVisible).map(function (a) { return '<button class="rang" data-p="' + a.id + '">' + ic(a.usage === 'revente' ? 'flacon' : 'stock') + '<span>' + esc(nm(a.nom)) + '</span><b>' + esc(uniteTxt(a, stocks()[a.id] || 0)) + '</b></button>'; }).join('') + '</div>');
    f.addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; fermer(); formMouvement(produit(b.dataset.p), 'entree'); });
  }
  function formProduit() {
    var cats = ['lotions', 'huiles', 'shampoings', 'gels', 'pomades', 'apresRasage', 'peignes', 'brosses', 'bonnets', 'soinsVisage', 'meches', 'extensions', 'perruques', 'divers'];
    var f = ouvrir(t('stock.nouveau'), champ(t('prod.nomFr'), '<input name="fr" autocomplete="off">') + champ(t('prod.nomEn'), '<input name="en" autocomplete="off" placeholder="' + esc(t('facultatif')) + '">') +
      '<div class="deux">' + champ(t('prod.usage'), '<select name="usage"><option value="revente">' + esc(t('stock.usage.revente')) + '</option><option value="conso">' + esc(t('stock.usage.conso')) + '</option></select>') +
      champ(t('prod.categorie'), '<select name="cat">' + cats.map(function (c) { return '<option value="' + c + '">' + esc(t('pcat.' + c)) + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="deux">' + champ(t('stock.prixAchat'), inputMontant('achat')) + champ(t('stock.prixVente'), inputMontant('vente')) + '</div>' +
      '<div class="deux">' + champ(t('prod.unite'), '<select name="unite"><option value="piece">' + esc(t('unite.piece')) + '</option><option value="flacon">' + esc(t('unite.flacon')) + '</option><option value="ml">ml</option><option value="g">g</option></select>') + champ(t('stock.seuilLib'), '<input name="seuil" class="montant" inputmode="numeric" value="5">') + '</div>' +
      '<div id="champ-contenance" hidden>' + champ(t('prod.contenance'), '<input name="contenance" class="montant" inputmode="numeric" placeholder="500">', t('prod.contenanceAide')) + '</div>' +
      champ(t('prod.stockInitial'), '<input name="init" class="montant" inputmode="numeric" placeholder="0">') +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', function (e) {
      if (!e.target.closest('[data-x=ok]')) return; var v = function (n) { return $('[name=' + n + ']', f).value.trim(); };
      if (!v('fr')) { toast(t('prod.nomManque'), 'alerte'); return; }
      var a = { id: uid(), usage: v('usage'), cat: v('cat'), nom: { fr: v('fr'), en: v('en') || v('fr') }, achat: M.lireMontant(v('achat')), vente: M.lireMontant(v('vente')), unite: v('unite'), seuil: M.lireMontant(v('seuil')), ref: v('fr').slice(0, 3).toUpperCase() + '-' + (DB.produits.length + 1), fournisseur: '', actif: true };
      if (a.usage === 'revente' && !a.vente) { toast(t('prod.prixManque'), 'alerte'); return; }
      if (a.unite === 'flacon') { a.contenance = M.lireMontant(v('contenance')); if (!a.contenance) { toast(t('prod.contenanceManque'), 'alerte'); return; } }
      DB.produits.push(a); empiler('produit', a.id);
      var init = M.lireMontant(v('init')); if (init) { var mi = { id: uid(), produit: a.id, type: 'initial', q: init, cout: a.achat, ts: Date.now(), par: U.id, motif: '' }; DB.mouvements.push(mi); empiler('mouvement', mi.id); }
      fermer(); toast(t('prod.ajoute')); ST.stock.usage = a.usage; dessiner();
    });
    $('select[name=unite]', f).addEventListener('change', function () { $('#champ-contenance', f).hidden = this.value !== 'flacon'; });
  }

  /* ---------------------------------------------------------------- STATISTIQUES */
  ST.stats = { per: 'sept', seg: '' };
  function bornesStats() {
    var auj = aujourdhui(), p = ST.stats.per;
    if (p === 'jour') return [auj, auj, M.ajouter(auj, -7), M.ajouter(auj, -7)];
    if (p === 'sept') return [M.ajouter(auj, -6), auj, M.ajouter(auj, -13), M.ajouter(auj, -7)];
    if (p === 'trente') return [M.ajouter(auj, -29), auj, M.ajouter(auj, -59), M.ajouter(auj, -30)];
    var d = M.debutMois(auj), n = Math.round((new Date(auj) - new Date(d)) / 864e5); return [d, auj, M.ajouter(d, -n - 1 < -31 ? -31 : -n - 1), M.ajouter(d, -1)];
  }
  function vueStats(el) {
    var b = bornesStats(), seg = mixte() ? ST.stats.seg : '', st = stPeriode(b[0], b[1], seg), prec = stPeriode(b[2], b[3], seg), dep = M.depenses(DB.depenses, b[0], b[1]);
    var res = M.resultat(st, dep), comp = function (a, p) { if (!p) return ''; var v = Math.round((a - p) * 100 / p); return '<span class="tendance ' + (v >= 0 ? 'haut' : 'bas') + '">' + (v >= 0 ? '▲ +' : '▼ ') + v + ' %</span>'; };
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.stats')) + '</h1><button class="btn petit" data-a="exporter">' + ic('telecharger') + esc(t('stats.export')) + '</button></div>' +
      '<div class="chips">' + ['jour', 'sept', 'trente', 'mois'].map(function (p) { return '<button class="chip' + (ST.stats.per === p ? ' actif' : '') + '" data-a="statsPer" data-p="' + p + '">' + esc(t('per.' + p)) + '</button>'; }).join('') + '</div>' +
      (mixte() ? '<div class="chips">' + ['', 'H', 'F', 'U'].map(function (s) { return '<button class="chip' + (seg === s ? ' actif' : '') + '" data-a="statsSeg" data-s="' + s + '">' + esc(s ? t('seg.' + s) : t('seg.tous')) + '</button>'; }).join('') + '</div>' + (seg ? '<p class="bandeau-info">' + ic('info') + esc(t('stats.segAide')) + '</p>' : '') : '') +
      '<p class="resume">' + esc(dateCourte(b[0])) + (b[0] !== b[1] ? ' → ' + esc(dateCourte(b[1])) : '') + ' · ' + esc(t('stats.compare')) + '</p>' +
      '<div class="grille-dash">' +
      '<section class="carte large2"><div class="kpis kpis-4">' +
        kpi(t('kpi.ca'), F(st.ca), comp(st.ca, prec.ca), 'fort', K('ca', b[0], b[1], seg)) + kpi(t('kpi.transactions'), M.nombre(st.nbTx), comp(st.nbTx, prec.nbTx), '', K('ventes', b[0], b[1], seg)) + kpi(t('kpi.panier'), F(st.panier), comp(st.panier, prec.panier), '', K('panier', b[0], b[1], seg)) + kpi(t('kpi.prestations'), M.nombre(st.nbPrest), comp(st.nbPrest, prec.nbPrest), '', K('prest', b[0], b[1], seg)) +
        kpi(t('kpi.caPrest'), F(st.caPrest), '', '', K('prest', b[0], b[1], seg)) + kpi(t('kpi.caProd'), F(st.caProd), esc(t('kpi.nbProd', { n: st.nbProd })), '', seg ? '' : K('prod', b[0], b[1])) + kpi(t('kpi.remises'), F(st.remises), '', '', K('remises', b[0], b[1], seg)) + kpi(t('kpi.annulees'), M.nombre(st.annulees), st.montantAnnule ? F(st.montantAnnule) : '', '', K('annul', b[0], b[1])) +
      '</div></section>' +
      '<section class="carte large2"><h2>' + esc(t('stats.evolution')) + '</h2>' + graphe(st, b) + '</section>' +
      (seg ? '' : '<section class="carte"><h2>' + esc(t('stats.resultat')) + '</h2>' + tableFin([
        [t('fin.ca'), st.ca], [t('fin.cout'), -st.cout, t('fin.coutAide')], [t('fin.marge'), st.marge, '', 'sous'], [t('fin.commissions'), -st.commissions, t('fin.commissionsAide')], [t('fin.depenses'), -dep.exploitation, t('fin.depensesAide')], [t('fin.resultat'), res, t('fin.resultatAide'), 'total']
      ]) + '<h3 class="jour-tete">' + esc(t('fin.tresorerie')) + '</h3>' + tableFin([[t('fin.encaisse'), st.encaisse], [t('fin.toutesDep'), -dep.total, t('fin.toutesDepAide')], [t('fin.mouvement'), M.tresorerie(st, dep), '', 'total']]) + '</section>' +
      '<section class="carte"><h2>' + esc(t('kpi.encaisse')) + '</h2>' + parMoyen(st, b[0], b[1]) + '<small class="aide">' + esc(t('stats.encaisseAide')) + '</small></section>') +
      (function () {
        var fq = fileActive() || DB.passages.length ? M.file(DB.passages, b[0], b[1]) : null, arr = fq && fq.arrives && ST.stats.carte === 'arr';
        return (fq && fq.arrives ? '<section class="carte large2"><h2>' + esc(t('nav.file')) + '</h2><div class="kpis kpis-4">' +
            kpi(t('file.arrives'), M.nombre(fq.arrives), '', '', K('file', b[0], b[1])) + kpi(t('file.attenteMoy'), t('file.min', { m: fq.attenteMoy }), '', '', K('file', b[0], b[1], 'attente')) +
            kpi(t('file.dureeMoy'), t('file.min', { m: fq.dureeMoy }), '', '', K('file', b[0], b[1], 'duree')) + kpi(t('file.partis'), M.nombre(fq.partis), fq.pctPartis + ' %', fq.partis ? 'alerte' : '', K('file', b[0], b[1], 'parti')) + '</div></section>' : '') +
          '<section class="carte large2"><h2>' + esc(t('stats.affluence')) + '</h2>' +
          (fq && fq.arrives ? '<div class="segmente">' + [['enc', 'stats.carteEnc'], ['arr', 'stats.carteArr']].map(function (o) { return '<button class="' + ((arr ? 'arr' : 'enc') === o[0] ? 'actif' : '') + '" data-a="statsCarte" data-c="' + o[0] + '">' + esc(t(o[1])) + '</button>'; }).join('') + '</div>' : '') +
          carteChaleur(arr ? fq : st) + '<p class="bandeau-info">' + ic('info') + esc(t(arr ? 'stats.affluenceArr' : 'stats.affluenceAide')) + '</p></section>';
      })() +
      '<section class="carte"><h2>' + esc(t('stats.topPrest')) + '</h2>' + top(st.topPrest, st.caPrest) + '</section>' +
      (seg ? '' : '<section class="carte"><h2>' + esc(t('stats.topProd')) + '</h2>' + top(st.topProd, st.caProd, true) + '</section>') +
      '<section class="carte large2"><h2>' + esc(t('stats.employes')) + '</h2>' + tableEmployes(st) + '</section>' +
      '<section class="carte large2"><h2>' + esc(t('accueil.observations')) + '</h2><ul class="obs">' + M.observations({ st: st, prec: prec, alertesStock: seg ? 0 : alertesStock().length }).map(obsTxt).join('') + '</ul><small class="aide">' + esc(t('obs.source')) + '</small></section>' +
      '</div>';
  }
  function tableFin(L) { return '<div class="table-fin">' + L.map(function (r) { return '<div class="tf ' + (r[3] || '') + '"><span>' + esc(r[0]) + (r[2] ? '<small>' + esc(r[2]) + '</small>' : '') + '</span><b class="' + (r[1] < 0 ? 'neg' : '') + '">' + F(r[1]) + '</b></div>'; }).join('') + '</div>'; }
  function graphe(st, b) {
    var cles, vals, lib;
    if (b[0] === b[1]) { cles = []; for (var h = 8; h <= 21; h++) cles.push(h); vals = cles.map(function (h) { var s = 0; DB.transactions.forEach(function (x) { if (x.date === b[0] && x.statut === 'validee' && new Date(x.ts).getHours() === h) s += x.total; }); return s; }); lib = function (h) { return h + 'h'; }; }
    else { cles = Object.keys(st.parJour).sort(); vals = cles.map(function (d) { return st.parJour[d]; }); lib = function (d) { return d.slice(8); }; }
    var max = Math.max.apply(null, vals.concat([1])), W = 600, H = 180, n = vals.length, bw = W / n, pas = n > 16 ? Math.ceil(n / 8) : 1;
    var moy = vals.reduce(function (s, v) { return s + v; }, 0) / (n || 1);
    return '<svg class="graphe" viewBox="0 0 ' + W + ' ' + (H + 26) + '" preserveAspectRatio="none" role="img" aria-label="' + esc(t('stats.evolution')) + '">' +
      '<line x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '" class="axe"/>' +
      '<line x1="0" x2="' + W + '" y1="' + (H - moy / max * (H - 8)) + '" y2="' + (H - moy / max * (H - 8)) + '" class="moy"/>' +
      vals.map(function (v, i) { var h = v / max * (H - 8); return '<rect x="' + (i * bw + bw * 0.15) + '" y="' + (H - h) + '" width="' + bw * 0.7 + '" height="' + Math.max(h, v ? 2 : 0) + '" rx="3"><title>' + esc(lib(cles[i])) + ' : ' + F(v) + '</title></rect>'; }).join('') +
      vals.map(function (v, i) { return i % pas ? '' : '<text x="' + (i * bw + bw / 2) + '" y="' + (H + 18) + '" text-anchor="middle">' + esc(lib(cles[i])) + '</text>'; }).join('') +
      '</svg><div class="legende"><span><i class="l-barre"></i>' + esc(t('kpi.ca')) + '</span><span><i class="l-moy"></i>' + esc(t('stats.moyenne', { m: F(Math.round(moy)) })) + '</span><span>' + esc(t('stats.max', { m: F(max) })) + '</span></div>';
  }
  function carteChaleur(st) {
    var max = 1, H0 = 8, H1 = 21; st.carte.forEach(function (r) { for (var h = H0; h <= H1; h++) max = Math.max(max, r[h]); });
    var h = '<div class="chaleur-defile"><table class="chaleur"><thead><tr><th></th>';
    for (var x = H0; x <= H1; x++) h += '<th>' + x + '</th>';
    h += '</tr></thead><tbody>';
    st.carte.forEach(function (r, j) { h += '<tr><th>' + esc(t('jourC.' + j)) + '</th>'; for (var x = H0; x <= H1; x++) { var v = r[x], a = v ? 0.12 + 0.88 * v / max : 0; h += '<td style="--a:' + a.toFixed(2) + '" title="' + esc(t('jour.' + j)) + ' ' + x + 'h : ' + v + '">' + (v && v / max > 0.75 ? '<i></i>' : '') + '</td>'; } h += '</tr>'; });
    return h + '</tbody></table></div><div class="legende"><span>' + esc(t('stats.moins')) + '</span><span class="degrade"></span><span>' + esc(t('stats.plus')) + '</span></div>';
  }
  function top(L, total, prod) {
    if (!L.length) return '<p class="aide">' + esc(t('stats.aucune')) + '</p>';
    var max = L[0].ca || 1;
    return '<ol class="top">' + L.slice(0, 10).map(function (x) { return '<li><span class="top-nom">' + esc(nm(x.nom)) + '<small>' + esc(t(prod ? 'stats.qteMarge' : 'stats.qte', { n: x.q, m: F(x.marge || 0) })) + '</small></span><span class="top-barre"><i style="width:' + Math.round(x.ca * 100 / max) + '%"></i></span><b>' + F(x.ca) + '</b></li>'; }).join('') + '</ol>';
  }
  function tableEmployes(st) {
    var L = DB.utilisateurs.filter(function (u) { return st.employes[u.id]; }).sort(function (a, b) { return st.employes[b.id].ca - st.employes[a.id].ca; });
    if (!L.length) return '<p class="aide">' + esc(t('stats.aucune')) + '</p>';
    return '<div class="table-emp"><div class="te tete"><span>' + esc(t('equipe.nom')) + '</span><span>' + esc(t('kpi.prestations')) + '</span><span>' + esc(t('kpi.ca')) + '</span><span>' + esc(t('equipe.commission')) + '</span></div>' +
      L.map(function (u) { var e = st.employes[u.id]; return '<div class="te"><span>' + avatar(u) + esc(u.prenom) + '</span><span>' + e.nbPrest + '</span><span>' + F(e.ca) + '</span><span>' + F(e.commission) + '</span></div>'; }).join('') + '</div>';
  }
  function exporter() {
    var b = bornesStats(), L = [['numero', 'date', 'heure', 'statut', 'type', 'article', 'quantite', 'prix_unitaire', 'montant_net', 'prestataire', 'caissier', 'moyens'].join(';')];
    DB.transactions.forEach(function (x) {
      if (x.date < b[0] || x.date > b[1]) return; var tot = M.totaux(x.lignes, x.remise);
      x.lignes.forEach(function (l) { L.push([x.num, x.date, M.heure(x.ts), x.statut, l.type === 'P' ? 'prestation' : 'produit', '"' + nm(l.nom).replace(/"/g, '""') + '"', l.q, l.pu, Math.round(M.ligneNet(l) * tot.coef), (user(l.par) || {}).prenom || '', (user(x.caissier) || {}).prenom || '', x.paiements.map(function (p) { return p.moyen; }).join('+')].join(';')); });
    });
    var blob = new Blob(['﻿' + L.join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'barber-os-ventes-' + b[0] + '-' + b[1] + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast(t('stats.exporte', { n: L.length - 1 }));
  }

  /* ---------------------------------------------------------------- PLUS (téléphone, gérant) */
  function vuePlus(el) {
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.plus')) + '</h1></div><div class="liste">' + (fileActive() ? [['file', 'file']] : []).concat([['depenses', 'depense'], ['equipe', 'equipe'], ['clients', 'client'], ['historique', 'historique'], ['parametres', 'reglages']]).map(function (o) {
      return '<button class="rang grand" data-a="aller" data-v="' + o[0] + '">' + ic(o[1]) + '<span>' + esc(t('nav.' + o[0])) + '<small>' + esc(t('plus.' + o[0])) + '</small></span>' + ic('droite') + '</button>';
    }).join('') + '</div>';
  }

  /* ---------------------------------------------------------------- DÉPENSES */
  /* une icône par catégorie de dépense (remarque n° 7) */
  var IC_DEP = { loyer: 'loyer', electricite: 'eclair', eau: 'goutte', internet: 'wifi', salaires: 'paie', commissions: 'pourcent', stock: 'stock', consommables: 'peigne', maintenance: 'cle', marketing: 'megaphone', nettoyage: 'balai', autre: 'autre' };
  function icDep(c) { return ic(IC_DEP[c] || 'depense'); }
  var CAT_DEP = ['loyer', 'electricite', 'eau', 'internet', 'salaires', 'commissions', 'stock', 'consommables', 'maintenance', 'marketing', 'nettoyage', 'autre'];
  function vueDepenses(el) {
    var auj = aujourdhui(), deb = M.debutMois(auj), dep = M.depenses(DB.depenses, deb, auj), L = DB.depenses.filter(function (x) { return x.date >= deb && x.date <= auj && !x.annulee; }).sort(function (a, b) { return b.ts - a.ts; });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.depenses')) + '</h1><button class="btn petit primaire" data-a="formDepense">' + ic('plus') + esc(t('dep.ajouter')) + '</button></div>' +
      '<p class="resume">' + esc(t('dep.ceMois')) + '</p><div class="kpis kpis-3">' + kpi(t('dep.exploitation'), F(dep.exploitation), esc(t('dep.exploitationAide')), '', K('dep', deb, auj, 'exploit')) + kpi(t('dep.horsResultat'), F(dep.horsResultat), esc(t('dep.horsResultatAide')), '', K('dep', deb, auj, 'hors')) + kpi(t('dep.total'), F(dep.total), '', '', K('dep', deb, auj, '')) + '</div>' +
      '<div class="liste">' + (L.length ? L.map(function (x) { return '<div class="ligne-dep"><span class="dep-ic">' + icDep(x.cat) + '</span><span class="tx-txt"><b>' + esc(t('dep.' + x.cat)) + '</b><span>' + esc(dateCourte(x.date)) + (x.note ? ' · ' + esc(x.note) : '') + (M.HORS_RESULTAT[x.cat] ? ' · ' + esc(t('dep.horsRes')) : '') + '</span></span><span class="tx-m">' + logoMoyen(x.moyen) + '<b>' + F(x.montant) + '</b></span></div>'; }).join('') : vide('depense', t('dep.vide'), '')) + '</div>';
  }
  function formDepense() {
    var f = ouvrir(t('dep.ajouter'), '<div class="pan-lib">' + esc(t('dep.categorie')) + '</div><div class="chips chips-cat">' + CAT_DEP.map(function (c, i) { return '<button class="chip chip-ic' + (i === 1 ? ' actif' : '') + '" data-c="' + c + '">' + icDep(c) + esc(t('dep.' + c)) + '</button>'; }).join('') + '</div><p class="bandeau-info" id="dep-note" hidden></p>' +
      champ(t('dep.montant'), inputMontant('m')) + champ(t('dep.moyen'), '<select name="moyen">' + DB.salon.moyensActifs.map(function (m) { return '<option value="' + m + '">' + esc(t('moyen.' + m)) + '</option>'; }).join('') + '</select>') +
      champ(t('dep.date'), '<input name="date" type="date" value="' + aujourdhui() + '" max="' + aujourdhui() + '">') + champ(t('dep.note'), '<input name="note" autocomplete="off" placeholder="' + esc(t('facultatif')) + '">') +
      '<p class="aide">' + esc(t('dep.pasCA')) + '</p><div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    var cat = 'electricite';
    f.addEventListener('click', function (e) {
      var c = e.target.closest('[data-c]'); if (c) { cat = c.dataset.c; $$('[data-c]', f).forEach(function (b) { b.classList.toggle('actif', b === c); }); var n = $('#dep-note', f); n.hidden = !M.HORS_RESULTAT[cat]; n.textContent = M.HORS_RESULTAT[cat] ? t('dep.note.' + cat) : ''; return; }
      if (!e.target.closest('[data-x=ok]')) return; var m = M.lireMontant($('input[name=m]', f).value); if (m <= 0) { toast(t('err.montant'), 'alerte'); return; }
      var d = { id: uid(), date: $('input[name=date]', f).value || aujourdhui(), cat: cat, montant: m, moyen: $('select[name=moyen]', f).value, note: $('input[name=note]', f).value.trim(), par: U.id, ts: Date.now() };
      DB.depenses.push(d); empiler('depense', d.id); fermer(); toast(t('dep.enregistree', { m: F(m) })); son('depense'); dessiner();
    });
  }

  /* ---------------------------------------------------------------- ÉQUIPE et comptes des collaborateurs (remarque n° 2) */
  function vueEquipe(el) {
    var auj = aujourdhui(), st = stPeriode(M.debutMois(auj), auj), L = DB.utilisateurs.slice().sort(function (a, b) { return (a.actif === false) - (b.actif === false); });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.equipe')) + '</h1><button class="btn petit primaire" data-a="formCollab">' + ic('plus') + esc(t('equipe.ajouter')) + '</button></div><p class="resume">' + esc(t('equipe.ceMois')) + '</p><div class="liste">' + L.map(function (u) {
      var e = st.employes[u.id] || { ca: 0, nbPrest: 0, commission: 0 };
      return '<button class="ligne-emp' + (u.actif === false ? ' inactif' : '') + '" data-a="ficheCollab" data-u="' + u.id + '">' + avatar(u, 'moyen') + '<span class="tx-txt"><b>' + esc(u.prenom) + '</b><span>' + esc(t('role.' + u.role)) + ' · ' + (u.langue === 'en' ? 'EN' : 'FR') + (u.actif === false ? ' · ' + esc(t('equipe.desactive')) : u.commission && u.commission.prest ? ' · ' + esc(t('equipe.regle', { p: u.commission.prest, a: u.commission.prod })) : '') + '</span></span>' +
        '<span class="emp-chiffres"><b>' + F(e.ca) + '</b><span>' + esc(t('equipe.prest', { n: e.nbPrest })) + '</span>' + (e.commission ? '<span class="com">' + esc(t('equipe.com', { m: F(e.commission) })) + '</span>' : '') + '</span></button>';
    }).join('') + '</div><p class="bandeau-info">' + ic('info') + esc(t(REEL ? 'equipe.aideReel' : 'equipe.v1')) + '</p>';
  }
  function ficheCollab(id) {
    var u = user(id); if (!u) return; var auj = aujourdhui(), e = stPeriode(M.debutMois(auj), auj).employes[id] || { ca: 0, nbPrest: 0, commission: 0 };
    var f = ouvrir(u.prenom, '<div class="profil-carte">' + avatar(u, 'grand') + '<div><b>' + esc(u.prenom) + '</b><span>' + esc(t('role.' + u.role)) + ' · ' + (u.langue === 'en' ? 'English' : 'Français') + (u.actif === false ? ' · ' + esc(t('equipe.desactive')) : '') + '</span></div></div>' +
      '<div class="kpis kpis-3">' + kpi(t('kpi.prestations'), M.nombre(e.nbPrest)) + kpi(t('kpi.ca'), F(e.ca)) + kpi(t('equipe.commission'), F(e.commission)) + '</div><p class="aide">' + esc(t('equipe.ceMoisCourt')) + '</p>' +
      '<div class="actions-rapides">' + '<button class="action-r" data-x="modifier">' + ic('crayon') + '<span>' + esc(t('modifier')) + '</span></button>' +
        (u.actif !== false ? '<button class="action-r primaire" data-x="code">' + ic('cadenas') + '<span>' + esc(t('equipe.code')) + '</span></button>' : '') +
        (u.id !== U.id ? '<button class="action-r" data-x="actif">' + ic(u.actif === false ? 'refaire' : 'sortir') + '<span>' + esc(t(u.actif === false ? 'equipe.reactiver' : 'equipe.desactiver')) + '</span></button>' : '') + '</div>' +
      '<p class="aide">' + esc(t('equipe.codeAide')) + '</p>');
    f.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-x]'); if (!b) return;
      if (b.dataset.x === 'modifier') { fermer(); formCollab(u); }
      if (b.dataset.x === 'code') donnerCode(u);
      if (b.dataset.x === 'actif') {
        if (u.actif !== false && u.role === 'proprio' && DB.utilisateurs.filter(function (x) { return x.role === 'proprio' && x.actif !== false; }).length < 2) { toast(t('equipe.dernierProprio'), 'alerte'); return; }
        confirmer(t(u.actif === false ? 'equipe.reactiverTxt' : 'equipe.desactiverTxt', { p: u.prenom }), t(u.actif === false ? 'equipe.reactiver' : 'equipe.desactiver'), u.actif !== false).then(function (ok) { if (!ok) return; u.actif = u.actif === false; noter({ action: u.actif ? 'reactivation' : 'desactivation', ref: u.id, motif: '', montant: 0 }); empiler('utilisateur', u.id); fermerTout(); dessiner(); });
      }
    });
  }
  function formCollab(u) {
    var nouveau = !u, roles = ['coiffeur', 'caissier', 'gerant'].concat(U.role === 'proprio' ? ['proprio'] : []);
    u = u || { prenom: '', role: 'coiffeur', langue: 'fr', commission: { prest: 40, prod: 10 }, actif: true };
    var f = ouvrir(t(nouveau ? 'equipe.ajouter' : 'equipe.modifier'), champ(t('client.prenom'), '<input name="prenom" autocomplete="off" maxlength="30" value="' + esc(u.prenom) + '">') +
      '<div class="deux">' + champ(t('equipe.role'), '<select name="role"' + (u.role === 'proprio' && U.role !== 'proprio' ? ' disabled' : '') + '>' + roles.concat(roles.indexOf(u.role) < 0 ? [u.role] : []).map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + esc(t('role.' + r)) + '</option>'; }).join('') + '</select>') +
      champ(t('profil.langue'), '<select name="langue"><option value="fr"' + (u.langue !== 'en' ? ' selected' : '') + '>Français</option><option value="en"' + (u.langue === 'en' ? ' selected' : '') + '>English</option></select>') + '</div>' +
      '<div class="deux">' + champ(t('equipe.comPrest'), '<input name="cp" class="montant" inputmode="numeric" value="' + ((u.commission || {}).prest || 0) + '">') + champ(t('equipe.comProd'), '<input name="ca" class="montant" inputmode="numeric" value="' + ((u.commission || {}).prod || 0) + '">') + '</div>' +
      '<p class="aide">' + esc(t('equipe.comAide')) + '</p><div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-x=ok]')) return;
      var prenom = $('input[name=prenom]', f).value.trim(); if (!prenom) { toast(t('client.prenomManque'), 'alerte'); return; }
      var cp = Math.min(100, M.lireMontant($('input[name=cp]', f).value)), ca = Math.min(100, M.lireMontant($('input[name=ca]', f).value));
      var role = $('select[name=role]', f).value;
      if (!nouveau && u.role === 'proprio' && role !== 'proprio' && DB.utilisateurs.filter(function (x) { return x.role === 'proprio' && x.actif !== false; }).length < 2) { toast(t('equipe.dernierProprio'), 'alerte'); return; }
      if (nouveau) { u = { id: 'u-' + uid(), favoris: [], couleur: DB.utilisateurs.length % 5, actif: true }; DB.utilisateurs.push(u); }
      u.prenom = prenom; u.role = role; u.langue = $('select[name=langue]', f).value; u.commission = { prest: cp, prod: ca };
      empiler('utilisateur', u.id); fermerTout(); toast(t('enregistre')); dessiner();
      if (nouveau && REEL) setTimeout(function () { ficheCollab(u.id); }, 50);
    });
  }
  /* code de départ : demandé au service (le collaborateur doit déjà y être enregistré) ; affiché une seule fois */
  async function donnerCode(u) {
    if (!REEL) { toast(t('equipe.codeDemo')); return; }
    if (!enLigne()) { toast(t('connexion.horsLigne'), 'alerte'); return; }
    try {
      if (DB.file.some(function (o) { return o.col === 'utilisateurs' && o.id === u.id; })) await synchroniserReel();
      var r = await appel('codeDepart', { jeton: jeton(U.id), user: u.id });
      var lien = location.origin + location.pathname, texte = t('equipe.codeMessage', { p: u.prenom, s: DB.salon.nom, l: lien, c: r.code });
      var f = ouvrir(t('equipe.code'), '<p class="texte">' + esc(t('equipe.codePour', { p: u.prenom })) + '</p><p class="code-depart">' + esc(r.code.replace(/(\d{4})(\d{4})/, '$1 $2')) + '</p>' +
        '<p class="aide">' + esc(t('equipe.codeConsigne', { l: lien })) + '</p><div class="actions"><button class="btn" data-a="fermer">' + esc(t('fermer')) + '</button><button class="btn primaire" data-x="partager">' + ic('partager') + esc(t('recu.partager')) + '</button></div>');
      f.addEventListener('click', function (ev) { if (!ev.target.closest('[data-x=partager]')) return; if (navigator.share) navigator.share({ text: texte }).catch(function () { }); else window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank'); });
    } catch (e) { toast(e.message, 'alerte'); }
  }

  /* ---------------------------------------------------------------- CONFIGURATION DU SALON (gérant, 1re ouverture) */
  function vueConfig(el) {
    var s = DB.salon, nP = DB.prestations.length, nA = DB.produits.length;
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('config.titre')) + '</h1></div><p class="bandeau-info">' + ic('info') + esc(t('config.intro')) + '</p>' +
      '<section class="carte etape"><h2><span class="num-etape">1</span>' + esc(t('config.salon')) + '</h2>' + champ(t('par.nomSalon'), '<input name="nomSalon" autocomplete="off" maxlength="40" value="' + esc(s.nom) + '">') + champ(t('par.ville'), '<input name="ville" autocomplete="off" maxlength="60" value="' + esc(s.ville || '') + '">') +
        '<div class="choix-type">' + ['masculin', 'mixte'].map(function (x) { return '<button class="type-c' + (s.type === x ? ' actif' : '') + '" data-a="configType" data-t="' + x + '"><b>' + esc(t('type.' + x)) + '</b><span>' + esc(t('type.' + x + 'Txt')) + '</span></button>'; }).join('') + '</div>' +
        '<div class="pan-lib">' + esc(t('perso.logo')) + '</div><div class="logo-choix">' + logoSalon('grand') + '<div class="logo-btns"><label class="btn petit">' + ic('telecharger') + esc(s.logo ? t('perso.changerLogo') : t('perso.ajouterLogo')) + '<input type="file" accept="image/*" class="fichier-cache" data-a="logo"></label></div></div>' +
        '<div class="actions"><button class="btn primaire" data-a="configSalon">' + esc(t('enregistrer')) + '</button></div></section>' +
      '<section class="carte etape"><h2><span class="num-etape">2</span>' + esc(t('config.catalogue')) + '</h2>' +
        (nP || nA ? '<p class="texte">' + esc(t('config.catalogueFait', { p: nP, a: nA })) + '</p><div class="actions"><button class="btn" data-a="aller" data-v="catalogue">' + esc(t('config.voirCatalogue')) + '</button></div>'
          : '<p class="texte">' + esc(t('config.catalogueTxt')) + '</p><div class="actions"><button class="btn primaire" data-a="configModele">' + esc(t('config.modele')) + '</button><button class="btn" data-a="aller" data-v="catalogue">' + esc(t('config.vide')) + '</button></div>') + '</section>' +
      '<section class="carte etape"><h2><span class="num-etape">3</span>' + esc(t('par.moyens')) + '</h2>' + s.moyens.map(function (m) { return '<label class="interrupteur"><span class="avec-logo">' + logoMoyen(m) + esc(t('moyen.' + m)) + '</span><input type="checkbox" data-a="moyenActif" data-m="' + m + '"' + (s.moyensActifs.indexOf(m) >= 0 ? ' checked' : '') + '><i></i></label>'; }).join('') + '</section>' +
      '<section class="carte etape"><h2><span class="num-etape">4</span>' + esc(t('nav.equipe')) + '</h2><p class="texte">' + esc(t('config.equipeTxt')) + '</p><div class="liste">' + DB.utilisateurs.filter(function (u) { return u.actif !== false; }).map(function (u) { return '<button class="rang" data-a="ficheCollab" data-u="' + u.id + '">' + avatar(u) + '<span>' + esc(u.prenom) + '<small>' + esc(t('role.' + u.role)) + '</small></span>' + ic('droite') + '</button>'; }).join('') + '</div><button class="btn plein" data-a="formCollab">' + ic('plus') + esc(t('equipe.ajouter')) + '</button></section>' +
      '<button class="btn-valider" data-a="configFin">' + ic('coche') + '<span>' + esc(t(s.configure ? 'config.retour' : 'config.terminer')) + '</span></button>';
  }

  function lireConfig() {
    var n = $('input[name=nomSalon]'), v = $('input[name=ville]'); if (!n) return true;
    if (!n.value.trim()) { toast(t('config.nomManque'), 'alerte'); n.focus(); return false; }
    DB.salon.nom = n.value.trim(); DB.salon.ville = v ? v.value.trim() : ''; empiler('salon', 'salon'); return true;
  }

  /* ---------------------------------------------------------------- CATALOGUE DES PRESTATIONS (gérant) */
  function vueCatalogue(el) {
    var cats = DB.categories.filter(function (c) { return !c.f || mixte(); });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('catalogue.titre')) + '</h1><button class="btn petit primaire" data-a="formPrestation">' + ic('plus') + esc(t('catalogue.ajouter')) + '</button></div>' +
      '<p class="aide">' + esc(t('catalogue.aide')) + '</p>' +
      (DB.prestations.length ? cats.map(function (c) {
        var L = DB.prestations.filter(function (p) { return p.cat === c.id; }); if (!L.length) return '';
        return '<h3 class="jour-tete">' + esc(nm(c.nom)) + '</h3><div class="liste">' + L.map(function (p) { return '<button class="ligne-stock' + (p.actif === false ? ' inactif' : '') + '" data-a="formPrestation" data-id="' + p.id + '"><span class="tx-txt"><b>' + esc(nm(p.nom)) + '</b><span>' + esc(p.duree ? t('file.min', { m: p.duree }) : '') + (mixte() ? ' · ' + esc(t('seg.' + p.seg)) : '') + (p.actif === false ? ' · ' + esc(t('catalogue.inactive')) : '') + '</span></span><b>' + prixTxt(p) + '</b>' + ic('droite') + '</button>'; }).join('') + '</div>';
      }).join('') : vide('ciseaux', t('catalogue.vide'), t('catalogue.videTxt'), '<button class="btn primaire" data-a="configModele">' + esc(t('config.modele')) + '</button>')) +
      '<p class="bandeau-info">' + ic('info') + esc(t('catalogue.produitsAide')) + '</p>';
  }
  function formPrestation(p) {
    var nouveau = !p, cats = DB.categories.filter(function (c) { return !c.f || mixte(); });
    p = p || { nom: { fr: '', en: '' }, cat: cats[0].id, seg: 'H', prix: 0, duree: 20, actif: true, fid: false, variable: false };
    var f = ouvrir(t(nouveau ? 'catalogue.ajouter' : 'catalogue.modifier'), champ(t('prod.nomFr'), '<input name="fr" autocomplete="off" maxlength="40" value="' + esc(p.nom.fr) + '">') + champ(t('prod.nomEn'), '<input name="en" autocomplete="off" maxlength="40" value="' + esc(p.nom.en || '') + '" placeholder="' + esc(t('facultatif')) + '">') +
      '<div class="deux">' + champ(t('prod.categorie'), '<select name="cat">' + cats.map(function (c) { return '<option value="' + c.id + '"' + (p.cat === c.id ? ' selected' : '') + '>' + esc(nm(c.nom)) + '</option>'; }).join('') + '</select>') +
        (mixte() ? champ(t('catalogue.segment'), '<select name="seg">' + ['H', 'F', 'U'].map(function (x) { return '<option value="' + x + '"' + (p.seg === x ? ' selected' : '') + '>' + esc(t('seg.' + x)) + '</option>'; }).join('') + '</select>') : '') + '</div>' +
      '<div class="deux">' + champ(t('catalogue.prix'), inputMontant('prix', p.prix)) + champ(t('catalogue.duree'), '<input name="duree" class="montant" inputmode="numeric" value="' + (p.duree || '') + '">') + '</div>' +
      '<label class="interrupteur"><span>' + esc(t('catalogue.variable')) + '<small>' + esc(t('catalogue.variableAide')) + '</small></span><input type="checkbox" name="variable"' + (p.variable ? ' checked' : '') + '><i></i></label>' +
      '<label class="interrupteur"><span>' + esc(t('catalogue.fid')) + '<small>' + esc(t('catalogue.fidAide')) + '</small></span><input type="checkbox" name="fid"' + (p.fid ? ' checked' : '') + '><i></i></label>' +
      '<label class="interrupteur"><span>' + esc(t('catalogue.active')) + '<small>' + esc(t('catalogue.activeAide')) + '</small></span><input type="checkbox" name="actif"' + (p.actif !== false ? ' checked' : '') + '><i></i></label>' +
      '<div class="actions"><button class="btn" data-a="fermer">' + esc(t('annuler')) + '</button><button class="btn primaire" data-x="ok">' + esc(t('enregistrer')) + '</button></div>');
    f.addEventListener('click', function (ev) {
      if (!ev.target.closest('[data-x=ok]')) return; var v = function (n) { var e = $('[name=' + n + ']', f); return e ? (e.type === 'checkbox' ? e.checked : e.value.trim()) : ''; };
      if (!v('fr')) { toast(t('prod.nomManque'), 'alerte'); return; }
      var prix = M.lireMontant(v('prix')); if (!prix) { toast(t('err.montant'), 'alerte'); return; }
      if (nouveau) { p = { id: 'p-' + uid(), conso: [] }; DB.prestations.push(p); }
      if (!nouveau && p.prix !== prix) noter({ action: 'prix', ref: p.id, motif: F(p.prix) + ' → ' + F(prix), montant: prix });
      p.nom = { fr: v('fr'), en: v('en') || v('fr') }; p.cat = v('cat'); p.seg = mixte() ? v('seg') : (p.seg || 'H'); p.prix = prix; p.duree = M.lireMontant(v('duree')) || 0; p.variable = v('variable'); p.fid = v('fid'); p.actif = v('actif');
      empiler('prestation', p.id); fermer(); toast(t('enregistre')); dessiner();
    });
  }
  function copierModele() {
    var m = window.BDEMO.MODELE;
    m.prestations.forEach(function (x) { if (prestation(x.id)) return; var c = JSON.parse(JSON.stringify(x)); DB.prestations.push(c); empiler('prestation', c.id); });
    m.produits.forEach(function (x) { if (produit(x.id)) return; var c = JSON.parse(JSON.stringify(x)); c.fournisseur = ''; DB.produits.push(c); empiler('produit', c.id); });
    toast(t('config.modeleOk', { p: m.prestations.length, a: m.produits.length })); son('vente'); dessiner();
  }

  /* ---------------------------------------------------------------- CLIENTS */
  function vueClients(el) {
    var fidOn = DB.salon.modules.fidelite;
    var L = DB.clients.map(function (k) { var tx = DB.transactions.filter(function (x) { return x.client === k.id && x.statut === 'validee'; }); return { k: k, n: tx.length, der: tx.length ? tx[tx.length - 1].date : '', f: fidOn ? M.fidelite(k.id, DB.transactions, DB.salon.fidelite) : null }; }).sort(function (a, b) { return a.der < b.der ? 1 : -1; });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.clients')) + '</h1><button class="btn petit primaire" data-a="nouveauClient">' + ic('plus') + esc(t('client.nouveau')) + '</button></div>' +
      (fidOn ? '<p class="bandeau-info">' + ic('cadeau') + esc(t('fid.regle', { s: DB.salon.fidelite.seuil })) + '</p>' : '') +
      '<div class="liste">' + L.map(function (o) {
        return '<div class="ligne-client">' + avatar({ prenom: o.k.prenom, couleur: o.k.prenom.length }) + '<span class="tx-txt"><b>' + esc(o.k.prenom) + '</b><span>' + esc(t('client.visites', { n: o.n })) + (o.der ? ' · ' + esc(t('client.derniere', { d: dateCourte(o.der) })) : '') + '</span>' +
          (o.f ? '<span class="fid-barre"><i style="width:' + Math.round(o.f.progres * 100 / o.f.seuil) + '%"></i></span><small>' + esc(t('fid.progres', { n: o.f.progres, s: o.f.seuil })) + (o.f.disponibles ? ' · ' + esc(t('fid.dispo', { n: o.f.disponibles })) : '') + '</small>' : '') + '</span></div>';
      }).join('') + '</div><p class="aide">' + esc(t('client.minimal')) + '</p>';
  }

  /* ---------------------------------------------------------------- PARAMÈTRES (gérant) */
  function bloc(id, titre, html, ouvertDefaut) {
    var ouverts = PR.blocs || {}, o = ouverts[id] != null ? ouverts[id] : !!ouvertDefaut;
    return '<section class="carte bloc' + (o ? ' ouvert' : '') + '" data-bloc="' + id + '"><button class="bloc-tete" data-a="bloc" data-b="' + id + '"><h2>' + esc(titre) + '</h2><span class="bloc-signe">' + (o ? '−' : '+') + '</span></button><div class="bloc-corps">' + html + '</div></section>';
  }
  function vueParametres(el) {
    var s = DB.salon, serveur = lire(CLE_SERVEUR, { recus: 0, doublons: 0 });
    el.innerHTML = '<div class="page-tete"><h1>' + esc(t('nav.parametres')) + '</h1></div>' +
      bloc('type', t('par.type'), '<div class="choix-type">' + ['masculin', 'mixte', 'feminin'].map(function (x) { return '<button class="type-c' + (s.type === x ? ' actif' : '') + '" data-a="typeSalon" data-t="' + x + '"' + (x === 'feminin' ? ' disabled' : '') + '><b>' + esc(t('type.' + x)) + '</b><span>' + esc(t('type.' + x + 'Txt')) + '</span></button>'; }).join('') + '</div><small class="aide">' + esc(t('par.typeAide')) + '</small>', true) +
      bloc('salon', t('par.salon'), champ(t('par.nomSalon'), '<input name="nomSalon" autocomplete="off" maxlength="40" value="' + esc(s.nom) + '">') + champ(t('par.ville'), '<input name="ville" autocomplete="off" maxlength="60" value="' + esc(s.ville) + '">') +
        '<div class="pan-lib">' + esc(t('perso.logo')) + '</div><div class="logo-choix">' + logoSalon('grand') + '<div class="logo-btns"><label class="btn petit">' + ic('telecharger') + esc(s.logo ? t('perso.changerLogo') : t('perso.ajouterLogo')) + '<input type="file" accept="image/*" class="fichier-cache" data-a="logo"></label>' + (s.logo ? '<button class="btn petit" data-a="retirerLogo">' + esc(t('retirer')) + '</button>' : '') + '</div></div><small class="aide">' + esc(t('perso.logoAide')) + '</small>' +
        '<div class="pan-lib">' + esc(t('perso.fond')) + '</div><div class="fonds">' + FONDS.map(function (f) { var actif = ((s.fond && s.fond.id) || 'uni') === f; return f === 'photo' ? '<label class="fond-c fond-photo' + (actif ? ' actif' : '') + '"' + (s.fond && s.fond.photo ? ' style="background-image:url(&quot;' + s.fond.photo + '&quot;)"' : '') + '><span>' + esc(t('fond.photo')) + '</span><input type="file" accept="image/*" class="fichier-cache" data-a="fondPhoto"></label>' : '<button class="fond-c fond-' + f + (actif ? ' actif' : '') + '" data-a="fond" data-f="' + f + '"><span>' + esc(t('fond.' + f)) + '</span></button>'; }).join('') + '</div><small class="aide">' + esc(t('perso.fondAide')) + '</small>' +
        '<div class="actions"><button class="btn primaire" data-a="sauverSalon">' + esc(t('enregistrer')) + '</button></div>', true) +
      bloc('modules', t('par.modules'),
        interrupteur('fidelite', t('mod.fidelite'), s.modules.fidelite, t('mod.fideliteAide')) + (s.modules.fidelite ? champ(t('mod.seuil'), '<input name="seuil" class="montant" inputmode="numeric" value="' + s.fidelite.seuil + '">') : '') +
        interrupteur('commissionsVisibles', t('mod.commissions'), s.modules.commissionsVisibles, t('mod.commissionsAide')) +
        interrupteur('remiseCoiffeur', t('mod.remise'), s.remiseCoiffeur, t('mod.remiseAide')) +
        interrupteur('file', t('mod.file'), s.modules.file, t('mod.fileAide'))) +
      bloc('moyens', t('par.moyens'), s.moyens.map(function (m) { return '<label class="interrupteur"><span class="avec-logo">' + logoMoyen(m) + esc(t('moyen.' + m)) + '</span><input type="checkbox" data-a="moyenActif" data-m="' + m + '"' + (s.moyensActifs.indexOf(m) >= 0 ? ' checked' : '') + '><i></i></label>'; }).join('') + '<small class="aide">' + esc(t('par.moyensAide')) + '</small>') +
      bloc('catalogue', t('catalogue.titre'), '<button class="rang" data-a="aller" data-v="catalogue">' + ic('ciseaux') + '<span>' + esc(t('catalogue.prestations', { n: DB.prestations.length })) + '</span>' + ic('droite') + '</button><button class="rang" data-a="aller" data-v="stocks">' + ic('flacon') + '<span>' + esc(t('catalogue.produits', { n: DB.produits.length })) + '</span>' + ic('droite') + '</button>' +
        (REEL ? '<button class="rang" data-a="aller" data-v="config">' + ic('reglages') + '<span>' + esc(t('config.titre')) + '</span>' + ic('droite') + '</button>' : '')) +
      bloc('perso', t('par.perso'), reglagesPerso()) +
      (REEL ? bloc('sync', t('par.sync'), '<div class="ligne-info">' + ic('nuage') + '<span>' + esc(t('sync.enAttente')) + '</span><b>' + DB.file.length + '</b></div><div class="ligne-info">' + ic('historique') + '<span>' + esc(t('sync.derniere')) + '</span><b>' + (DB.lu ? M.heure(DB.lu) : '—') + '</b></div>' +
          ((DB.rejets || []).length ? '<div class="ligne-info">' + ic('alerte') + '<span>' + esc(t('sync.rejets')) + '</span><b>' + DB.rejets.length + '</b></div><p class="aide">' + esc(DB.rejets.slice(-3).map(function (r) { return r.erreur; }).join(' · ')) + '</p>' : '') +
          '<div class="actions"><button class="btn primaire" data-a="syncMaintenant">' + esc(t('sync.maintenant')) + '</button></div><p class="aide">' + esc(t('sync.reelAide')) + '</p><p class="aide">' + esc(t('sync.appareil', { a: APPAREIL })) + '</p>') :
        bloc('sync', t('par.sync'), '<div class="ligne-info">' + ic('nuage') + '<span>' + esc(t('sync.enAttente')) + '</span><b>' + DB.file.length + '</b></div><div class="ligne-info">' + ic('coche') + '<span>' + esc(t('sync.recues')) + '</span><b>' + (serveur.recus || 0) + '</b></div><div class="ligne-info">' + ic('refaire') + '<span>' + esc(t('sync.doublons')) + '</span><b>' + (serveur.doublons || 0) + '</b></div>' +
        '<label class="interrupteur"><span>' + esc(t('sync.simuler')) + '<small>' + esc(t('sync.simulerAide')) + '</small></span><input type="checkbox" data-a="horsLigne"' + (PR.horsLigne ? ' checked' : '') + '><i></i></label>' +
        '<div class="actions"><button class="btn" data-a="renvoyer">' + esc(t('sync.renvoyer')) + '</button><button class="btn primaire" data-a="syncMaintenant">' + esc(t('sync.maintenant')) + '</button></div><p class="bandeau-info">' + ic('info') + esc(t('sync.simule')) + '</p>')) +
      (REEL ? '' : bloc('demo', t('par.demo'), '<p class="texte">' + esc(t('par.demoTxt')) + '</p><button class="btn danger plein" data-a="raz">' + esc(t('par.raz')) + '</button>')) +
      bloc('apropos', t('par.apropos'), '<p class="texte">BARBER OS · ' + esc(VERSION) + ' · SoluGis</p><p class="aide">' + esc(t('par.recuMention')) + '</p><p class="aide">' + esc(t('par.droits')) + '</p>');
    $$('[name=seuil]', el).forEach(function (i) { i.addEventListener('change', function () { var n = M.lireMontant(i.value); if (n >= 2) { DB.salon.fidelite.seuil = n; sauver(); empiler('salon', 'salon'); toast(t('enregistre')); } }); });
  }
  function interrupteur(cle, lib, on, aide) { return '<label class="interrupteur"><span>' + esc(lib) + (aide ? '<small>' + esc(aide) + '</small>' : '') + '</span><input type="checkbox" data-a="module" data-m="' + cle + '"' + (on ? ' checked' : '') + '><i></i></label>'; }

  /* ---------------------------------------------------------------- actions (délégation d'évènements) */
  var A = {
    fermer: fermer,
    langueDepart: function (b) { PR.langue = b.dataset.l; sauverPrefs(); son('ouverture'); dessiner(); },
    changerLangueDepart: function () { PR.langue = PR.langue === 'en' ? 'fr' : 'en'; sauverPrefs(); dessiner(); },
    choisirUser: function (b) {
      if (REEL) { ST.connexion = { u: b.dataset.u, etape: 'code', saisie: '' }; dessiner(); return; }
      U = user(b.dataset.u); PR.user = U.id; sauverPrefs(); CART = null; chargerPanier(); VUE = 'accueil'; son('ouverture'); dessiner();
    },
    changerUser: function () { fermerTout(); U = null; PR.user = ''; ST.connexion = null; ST.verrou = null; sauverPrefs(); CART = null; dessiner(); },
    touche: function (b) {
      var c = ST.connexion, k = b.dataset.k; if (!c || c.attente) return;
      if (k === 'ok') { validerCode(); return; }
      if (k === 'eff') c.saisie = c.saisie.slice(0, -1); else if (c.saisie.length < 8) c.saisie += k;
      c.erreur = ''; majCode();
    },
    annuaire: function () { chargerAnnuaire(true); },
    aller: function (b) { fermerTout(); aller(b.dataset.v); son('onglet'); },
    profil: function () { if (!estGerant()) { aller('moi'); return; } feuilleProfil(); },
    langue: function (b) { U.langue = b.dataset.l; PR.langue = b.dataset.l; sauver(); sauverPrefs(); empiler('utilisateur', U.id); var p = PILE.length; fermerTout(); dessiner(); if (p) feuilleProfil(); toast(t('profil.langueOk')); },
    theme: function (b) { PR.theme = b.dataset.t; sauverPrefs(); appliquerTheme(); $$('[data-a=theme]').forEach(function (x) { x.classList.toggle('actif', x === b); }); },
    infoSync: function () { if (estGerant()) { PR.blocs = PR.blocs || {}; PR.blocs.sync = true; sauverPrefs(); aller('parametres'); setTimeout(function () { var s = $('[data-bloc=sync]'); if (s) s.scrollIntoView({ block: 'start' }); }, 50); } else toast(enLigne() ? (DB.file.length ? t('sync.attente', { n: DB.file.length }) : t('sync.ok')) : t('sync.horsTxt')); },
    vendreFav: function (b) { if (!CART) chargerPanier(); ajouterArticle(b.dataset.k); aller('vendre'); },
    refaire: function (b) { refaire(b.dataset.id); },
    seg: function (b) { ST.caisse.seg = b.dataset.s; $$('[data-a=seg]').forEach(function (x) { x.classList.toggle('actif', x === b); }); dessinerTuiles(); },
    cat: function (b) { ST.caisse.cat = b.dataset.c; ST.caisse.q = ''; var q = $('#q'); if (q) q.value = ''; $$('[data-a=cat]').forEach(function (x) { x.classList.toggle('actif', x === b); }); dessinerTuiles(); son('onglet'); },
    editFav: function () { ST.caisse.editFav = !ST.caisse.editFav; if (!ST.caisse.editFav && !(U.favoris || []).length) ST.caisse.cat = 'coiffure'; dessiner(); },
    moinsTuile: function (b) {
      var k = b.dataset.k, L = CART.lignes, i;
      for (i = L.length - 1; i >= 0; i--) if (L[i].k === k && !L[i].offert) break;
      if (i < 0) for (i = L.length - 1; i >= 0; i--) if (L[i].k === k) break;
      if (i < 0) return;
      L[i].q--; if (L[i].q <= 0) L.splice(i, 1);
      sauverPanier(); son('onglet'); majCaisse();
    },
    tuile: function (b) {
      if (ST.caisse.editFav) { var id = b.dataset.k.slice(2), f = U.favoris = U.favoris || [], i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); sauver(); empiler('utilisateur', U.id); dessinerTuiles(); return; }
      ajouterArticle(b.dataset.k); majCaisse();
    },
    q: function (b) { var l = CART.lignes[+b.dataset.i]; l.q += +b.dataset.d; if (l.q <= 0) CART.lignes.splice(+b.dataset.i, 1); sauverPanier(); majCaisse(); if (!CART.lignes.length && !caisseLarge()) fermerTout(); },
    par: function (b) { CART.par = b.dataset.u; sauverPanier(); majCaisse(); },
    choisirClient: choisirClient,
    remise: formRemise,
    utiliserFid: function () { var l = CART.lignes.filter(function (x) { return x.fid && !x.offert; }).sort(function (a, b) { return b.pu - a.pu; })[0]; if (!l) return; if (l.q > 1) { l.q--; CART.lignes.push({ k: l.k, type: l.type, ref: l.ref, nom: l.nom, q: 1, pu: l.pu, seg: l.seg, cat: l.cat, fid: true, offert: true }); } else l.offert = true; sauverPanier(); son('ajout'); majCaisse(); },
    retirerFid: function () { CART.lignes.forEach(function (l) { l.offert = false; }); sauverPanier(); majCaisse(); },
    moyen: function (b) { CART.pay[0].moyen = b.dataset.m; CART.pay[0].recu = 0; sauverPanier(); majCaisse(); },
    billet: function (b) { CART.pay[0].recu = +b.dataset.b; sauverPanier(); majCaisse(); },
    partager: function () { if (CART.pay.length === 1) CART.pay[0].montant = 0; var autre = DB.salon.moyensActifs.filter(function (m) { return !CART.pay.some(function (p) { return p.moyen === m; }); })[0] || 'especes'; CART.pay.push({ moyen: autre, montant: 0 }); sauverPanier(); majCaisse(); },
    retirerPay: function (b) { CART.pay.splice(+b.dataset.i, 1); sauverPanier(); majCaisse(); },
    ouvrirEncaissement: ouvrirEncaissement,
    valider: valider,
    viderPanier: function () { confirmer(t('vente.viderTxt'), t('vente.vider'), true).then(function (ok) { if (!ok) return; CART = panierVide(); sauverPanier(); fermerTout(); majCaisse(); }); },
    detailTx: function (b) { detailTx(b.dataset.id); },
    clientArrive: function () { clientArrive(); },
    formCollab: function () { formCollab(null); },
    ficheCollab: function (b) { ficheCollab(b.dataset.u); },
    formPrestation: function (b) { formPrestation(b.dataset.id ? prestation(b.dataset.id) : null); },
    formChangerCode: function () { formChangerCode(); },
    deconnecter: function () { confirmer(t('compte.deconnecterTxt'), t('compte.deconnecter'), true).then(function (ok) { if (!ok) return; var j = jeton(U.id); if (j && enLigne()) appel('deconnexion', { jeton: j }).catch(function () { }); if (PR.sessions) delete PR.sessions[U.id]; fermerTout(); U = null; PR.user = ''; sauverPrefs(); dessiner(); }); },
    configType: function (b) { DB.salon.type = b.dataset.t; empiler('salon', 'salon'); dessiner(); },
    configSalon: function () { lireConfig(); toast(t('enregistre')); dessiner(); },
    configModele: function () { copierModele(); },
    configFin: function () { if (!lireConfig()) return; DB.salon.configure = true; empiler('salon', 'salon'); toast(t('config.ok')); son('vente'); aller('accueil'); },
    prendrePassage: function (b) { prendrePassage(b.dataset.id); },
    terminerPassage: function (b) { terminerPassage(b.dataset.id); },
    partiPassage: function (b) { partiPassage(b.dataset.id); },
    kpi: function (b) { detailKpi(b.dataset.k); },
    histoPer: function (b) { ST.histo.per = b.dataset.p; dessiner(); },
    stockUsage: function (b) { ST.stock.usage = b.dataset.u; dessiner(); },
    ficheProduit: function (b) { ficheProduit(b.dataset.id); },
    flaconTermine: function (b) { flaconTermine(produit(b.dataset.id)); },
    formProduit: formProduit,
    choisirEntree: choisirEntree,
    statsPer: function (b) { ST.stats.per = b.dataset.p; aller('stats', true); },
    statsCarte: function (b) { ST.stats.carte = b.dataset.c; aller('stats', true); },
    statsSeg: function (b) { ST.stats.seg = b.dataset.s; aller('stats', true); },
    exporter: exporter,
    formDepense: formDepense,
    nouveauClient: function () { formClient(null); },
    bloc: function (b) { var id = b.dataset.b, s = b.closest('.bloc'), o = !s.classList.contains('ouvert'); s.classList.toggle('ouvert', o); $('.bloc-signe', s).textContent = o ? '−' : '+'; PR.blocs = PR.blocs || {}; PR.blocs[id] = o; sauverPrefs(); },
    typeSalon: function (b) {
      var x = b.dataset.t; if (x === DB.salon.type) return;
      confirmer(t(x === 'mixte' ? 'type.activerTxt' : 'type.desactiverTxt'), t(x === 'mixte' ? 'type.activer' : 'type.desactiver')).then(function (ok) {
        if (!ok) return; noter({ action: 'typeSalon', ref: DB.salon.type + '→' + x, motif: '', montant: 0 });
        DB.salon.type = x; ST.caisse.seg = ''; ST.stats.seg = ''; sauver(); empiler('salon', 'type'); toast(t(x === 'mixte' ? 'type.activeOk' : 'type.desactiveOk')); dessiner();
      });
    },
    fond: function (b) { var anc = DB.salon.fond || {}; DB.salon.fond = { id: b.dataset.f, photo: anc.photo }; sauver(); empiler('salon', 'fond'); dessiner(); },
    retirerLogo: function () { DB.salon.logo = ''; sauver(); empiler('salon', 'logo'); dessiner(); },
    sauverSalon: function () { var n = $('input[name=nomSalon]').value.trim(); if (!n) return; DB.salon.nom = n; DB.salon.ville = $('input[name=ville]').value.trim(); sauver(); empiler('salon', 'nom'); toast(t('enregistre')); dessiner(); },
    raz: function () { confirmer(t('par.razTxt'), t('par.raz'), true).then(function (ok) { if (!ok) return; try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('barberos.') === 0 && k !== CLE_PREF) localStorage.removeItem(k); }); } catch (e) { } charger(true); CART = null; chargerPanier(); toast(t('par.razOk')); dessiner(); }); },
    syncMaintenant: function () { if (!enLigne()) { toast(t('sync.horsTxt'), 'alerte'); return; } synchroniser(); toast(t('sync.fait')); dessiner(); },
    renvoyer: function () { var x = DB.transactions.filter(function (y) { return y.statut === 'validee'; }).slice(-1)[0]; if (!x) return; DB.file.push({ opId: x.opId, type: 'vente', ref: x.id, ts: Date.now() }); sauver(); if (enLigne()) synchroniser(); toast(t('sync.renvoye')); dessiner(); }
  };
  var CHANGE = {
    sons: function (i) { PR.sons = i.checked; sauverPrefs(); if (window.Sons) window.Sons.regler(i.checked); },
    module: function (i) { var k = i.dataset.m; if (k === 'remiseCoiffeur') DB.salon.remiseCoiffeur = i.checked; else DB.salon.modules[k] = i.checked; sauver(); empiler('salon', k); dessiner(); },
    moyenActif: function (i) { var m = i.dataset.m, L = DB.salon.moyensActifs, j = L.indexOf(m); if (i.checked && j < 0) L.push(m); if (!i.checked && j >= 0) { if (L.length === 1) { i.checked = true; toast(t('par.unMoyen'), 'alerte'); return; } L.splice(j, 1); } DB.salon.moyensActifs = DB.salon.moyens.filter(function (x) { return L.indexOf(x) >= 0; }); sauver(); empiler('salon', 'salon'); CART && (CART.pay = [{ moyen: DB.salon.moyensActifs[0], montant: 0, recu: 0 }]); },
    logo: function (i) { lireImage(i.files[0], 320, 'image/png').then(function (d) { DB.salon.logo = d; sauver(); empiler('salon', 'logo'); toast(t('perso.logoOk')); dessiner(); }, function () { toast(t('perso.imageErreur'), 'alerte'); }); },
    fondPhoto: function (i) { lireImage(i.files[0], 1400, 'image/jpeg', 0.72).then(function (d) { DB.salon.fond = { id: 'photo', photo: d }; sauver(); empiler('salon', 'fond'); toast(t('perso.fondOk')); dessiner(); }, function () { toast(t('perso.imageErreur'), 'alerte'); }); },
    horsLigne: function (i) { PR.horsLigne = i.checked; sauverPrefs(); majPuce(); if (!i.checked) synchroniser(); dessiner(); }
  };
  document.addEventListener('click', function (e) {
    if (window.Sons) window.Sons.debloquer();
    var b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT' || b.disabled) return;
    var f = A[b.dataset.a]; if (f) { e.preventDefault(); f(b); }
  });
  document.addEventListener('change', function (e) { var i = e.target; if (i.dataset && CHANGE[i.dataset.a]) CHANGE[i.dataset.a](i); });
  window.addEventListener('online', function () { majPuce(); synchroniser(); });
  window.addEventListener('offline', majPuce);
  var largeAvant = null;
  window.addEventListener('resize', function () { var l = large() + '|' + caisseLarge(); if (largeAvant !== null && l !== largeAvant && U && PR.langue) { fermerTout(); dessiner(); } largeAvant = l; });

  /* ---------------------------------------------------------------- mises à jour : bandeau « Mettre à jour » (méthode UNIVERS C.O / Entre Nous)
     À l'ouverture et au retour à l'écran, le téléphone demande à GitHub si sw.js a changé (son cache porte l'empreinte des fichiers).
     La nouvelle version se télécharge en arrière-plan ; quand elle prend la main, un bandeau propose « Mettre à jour ». Rien n'est perdu. */
  var MAJ = { reg: null, vu: 0, affiche: false };
  function bandeauMaj() {
    if (MAJ.affiche) return; MAJ.affiche = true;
    var d = document.createElement('div'); d.className = 'maj-bandeau'; d.setAttribute('role', 'status');
    d.innerHTML = '<span>' + esc(t('maj.prete')) + '</span><button class="btn petit primaire">' + esc(t('maj.bouton')) + '</button>';
    d.querySelector('button').addEventListener('click', function () { try { if (REEL) idbEcrire(CLE, JSON.stringify(DB)); } catch (e) { } location.reload(); });
    document.body.appendChild(d);
  }
  function verifierMaj() { if (MAJ.reg && Date.now() - MAJ.vu > 30000) { MAJ.vu = Date.now(); MAJ.reg.update().catch(function () { }); } }
  if ('serviceWorker' in navigator && location.protocol === 'https:' && MODE !== 'banc') {
    var avait = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (avait) bandeauMaj(); });
    navigator.serviceWorker.addEventListener('message', function (ev) { if (ev.data && ev.data.en === 'version?' && ev.ports && ev.ports[0]) ev.ports[0].postMessage({ v: window.BARBER_VERSION }); });
    navigator.serviceWorker.register('sw.js').then(function (reg) { MAJ.reg = reg; verifierMaj(); if (reg.waiting && avait) bandeauMaj(); }).catch(function () { });
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible') return; verifierMaj(); if (REEL && U) synchroniser(); });
  if (REEL) setInterval(function () { if (document.visibilityState === 'visible' && U) synchroniser(); }, 45000);

  /* ---------------------------------------------------------------- lancement */
  charger(PARAMS.get('raz') === '1').then(function () {
    if (window.Sons) window.Sons.regler(PR.sons !== false);
    if (PARAMS.get('langue')) PR.langue = PARAMS.get('langue');
    if (!REEL && PARAMS.get('user') && user(PARAMS.get('user'))) { U = user(PARAMS.get('user')); PR.user = U.id; }
    if (U) chargerPanier();
    if (PARAMS.get('vue')) VUE = PARAMS.get('vue');
    largeAvant = large() + '|' + caisseLarge();
    dessiner();
    if (DB.file.length) planifierSync();
    window.BARBER_PRET = true;
  });

  /* accès pour le banc d'essai et les contrôles (test/) */
  window.BARBER = { MODE: MODE, reglerHorsLigne: function (v) { PR.horsLigne = !!v; sauverPrefs(); majPuce(); }, DB: function () { return DB; }, U: function () { return U; }, CART: function () { return CART; }, aller: aller, dessiner: dessiner, fermerTout: fermerTout, ajouterArticle: function (k, p) { if (!CART) chargerPanier(); ajouterArticle(k, p); majCaisse(); }, valider: valider, annulerTx: annulerTx,
    stocks: stocks, stPeriode: stPeriode, choisir: function (id) { U = user(id); PR.user = id; sauverPrefs(); CART = null; chargerPanier(); }, A: A, t: t, synchroniser: synchroniser, ouvrir: { detailTx: detailTx, ficheProduit: ficheProduit, formMouvement: formMouvement, formDepense: formDepense, formProduit: formProduit, choisirClient: choisirClient, formRemise: formRemise, ouvrirEncaissement: ouvrirEncaissement, formClient: formClient, feuilleProfil: feuilleProfil, formPrixVariable: formPrixVariable, afficherRecu: afficherRecu, detailKpi: detailKpi, flaconTermine: flaconTermine }, enCours: function (id) { return flaconCours(produit(id)); } };
})();
