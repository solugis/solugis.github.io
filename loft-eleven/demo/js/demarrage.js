/* LOFT ELEVEN — porte d'entrée, coquille (navigation), routeur, recherche, alertes, démarrage. */
'use strict';

var ROUTES = {
  accueil: { f: function () { return ecranAccueil(); }, t: 'Executive Office' },
  indicateur: { f: function (p) { return ecranIndicateur(p[0]); }, t: 'Indicateur', m: 'tableau' },
  biens: { f: function () { return ecranBiens(); }, t: 'Biens', m: 'biens' },
  bien: { f: function (p) { return ecranBien(p[0]); }, t: 'Bien', m: 'biens' },
  agenda: { f: function () { return ecranAgenda(); }, t: 'Agenda', m: 'agenda|reservations' },
  finance: { f: function () { return ecranFinance(); }, t: 'Finances', m: 'finance' },
  conciergerie: { f: function () { return ecranConciergerie(); }, t: 'Conciergerie', m: 'conciergerie' },
  projets: { f: function () { return ecranProjets(); }, t: 'Projets', m: 'projets' },
  projet: { f: function (p) { return ecranProjet(p[0]); }, t: 'Projet', m: 'projets' },
  contacts: { f: function () { return ecranContacts(); }, t: 'Contacts', m: 'tiers' },
  contact: { f: function (p) { return ecranContact(p[0]); }, t: 'Contact', m: 'tiers' },
  rapports: { f: function () { return ecranRapports(); }, t: 'Rapports', m: 'rapports' },
  acces: { f: function () { return ecranAcces(); }, t: 'Accès', m: 'acces' },
  journal: { f: function () { return ecranJournal(); }, t: 'Journal', m: 'journal' },
  reglages: { f: function () { return ecranReglages(); }, t: 'Réglages' },
  plus: { f: function () { return ecranPlus(); }, t: 'Plus' }
};
var DETAIL_ROUTES = ['reservation', 'facture', 'depense', 'tache', 'prestation'];

var App = {
  invitation: null, pret: false, moduleCourant: '',

  theme: function () {
    var r = document.documentElement;
    r.setAttribute('data-theme', S.prefs.theme === 'sombre' ? 'sombre' : 'clair');
    r.setAttribute('data-palette', PALETTES[S.prefs.palette] ? S.prefs.palette : 'saumon');
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getComputedStyle(r).getPropertyValue('--fond-2').trim() || '#FBF6F1';
  },

  /* ---------------------------------------------------------------- porte d'entrée */
  porte: function (message) {
    App.pret = false;
    document.getElementById('app').innerHTML = '';
    var p = document.createElement('section'); p.className = 'porte'; p.setAttribute('aria-label', 'Entrée');
    var demo = API.demo, h = '<div class="halo"></div><div class="porte-contenu">' + MONOGRAMME + '<h1>LOFT ELEVEN</h1><div class="sous">Private Office</div><div class="filet"></div>';
    if (demo) {
      h += '<p class="phrase">Le bureau de direction du groupe. Vos sociétés, vos résidences et vos équipes, réunies dans la paume de votre main.</p>'
        + '<div class="porte-actions"><button class="bt grand principal-bt bt-entrer" data-entrer="son">Entrer avec la signature sonore</button><button class="lien" data-entrer="silence">Entrer en silence</button></div>'
        + '<div class="profils" role="radiogroup" aria-label="Profil de démonstration">' + DEMO.PROFILS.map(function (x) { return '<button class="profil' + (API.profilCourant() === x.email ? ' choisi' : '') + '" role="radio" aria-checked="' + (API.profilCourant() === x.email) + '" data-profil="' + x.email + '"><b>' + esc(x.titre) + '</b><span>' + esc(x.sous) + '</span></button>'; }).join('') + '</div>'
        + '<div class="mention">Démonstration · données entièrement fictives, conservées dans ce navigateur</div>';
    } else if (API.jetonPresent() && !message) {
      h += '<p class="phrase">Bienvenue.</p><div class="porte-actions"><button class="bt grand principal-bt bt-entrer" data-entrer="son">Entrer avec la signature sonore</button><button class="lien" data-entrer="silence">Entrer en silence</button><button class="lien" data-autre-compte>Changer de compte</button></div><div class="erreur" data-erreur role="alert"></div>';
    } else {
      h += '<p class="phrase">Espace privé de direction. Connectez-vous avec l’adresse et le code qui vous ont été remis.</p>'
        + '<form class="connexion" data-connexion novalidate><label class="champ"><span>Adresse e-mail</span><input name="email" type="email" autocomplete="username" autocapitalize="off" required></label>'
        + '<label class="champ"><span>Code personnel</span><input name="code" type="password" autocomplete="current-password" required></label>'
        + '<label class="champ cache" data-etape="nouveau"><span>Choisissez votre code (8 caractères au moins)</span><input name="nouveau" type="password" autocomplete="new-password"></label>'
        + '<label class="champ cache" data-etape="nouveau"><span>Confirmez ce code</span><input name="confirmation" type="password" autocomplete="new-password"></label>'
        + '<label class="champ cache" data-etape="totp"><span>Code de l’application d’authentification</span><input name="totp" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>'
        + '<div class="erreur" data-erreur role="alert">' + esc(message || '') + '</div><button class="bt grand principal-bt" type="submit">Entrer</button></form>';
    }
    h += '</div>';
    p.innerHTML = h; document.body.appendChild(p);
    p.addEventListener('click', function (e) {
      var pr = e.target.closest('[data-profil]');
      if (pr) { API.profil(pr.getAttribute('data-profil')); p.querySelectorAll('.profil').forEach(function (x) { x.classList.toggle('choisi', x === pr); x.setAttribute('aria-checked', x === pr); }); return; }
      var en = e.target.closest('[data-entrer]');
      if (en) App.entrer(en.getAttribute('data-entrer') === 'son', p);
      if (e.target.closest('[data-autre-compte]')) API.deconnexion().then(function () { p.remove(); App.porte(); });
    });
    var form = p.querySelector('[data-connexion]');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = { email: form.email.value.trim(), code: form.code.value, nouveau: form.nouveau.value, confirmation: form.confirmation.value, totp: form.totp.value.trim() }, err = form.querySelector('[data-erreur]');
      if (!v.email || !v.code) { err.textContent = 'Indiquez votre adresse et votre code.'; return; }
      if (v.nouveau && v.nouveau !== v.confirmation) { err.textContent = 'Les deux codes ne sont pas identiques.'; return; }
      err.textContent = ''; var bt = form.querySelector('[type=submit]'); bt.disabled = true; bt.textContent = 'Vérification…';
      SONS.preparer();
      API.connexion(v.email, v.code, v.totp, v.nouveau).then(function (r) {
        bt.disabled = false; bt.textContent = 'Entrer';
        if (r.etape) { form.querySelectorAll('[data-etape="' + r.etape + '"]').forEach(function (x) { x.classList.remove('cache'); }); err.textContent = r.etape === 'nouveau' ? 'Première connexion : choisissez votre code personnel.' : 'Saisissez le code à 6 chiffres de votre application d’authentification.'; return; }
        App.entrer(true, p);
      }, function (e2) { bt.disabled = false; bt.textContent = 'Entrer'; err.textContent = e2.message; SONS.jouer('erreur'); });
    });
  },
  entrer: function (avecSon, porte) {
    if (avecSon) { SONS.preparer(); S.prefs.sons = true; sauverPrefs(); SONS.regler(S.prefs); SONS.jouer('signature', true); if (S.prefs.ambiance) setTimeout(function () { SONS.ambiance(true); }, 2600); }
    else { SONS.regler(S.prefs); }
    var err = porte.querySelector('[data-erreur]');
    var garde = S.prefs.garder && !API.demo ? Local.lire('le.etat', null) : null;
    if (garde) { S.db = garde.db; S.moi = garde.moi; App.ouvrir(porte); }
    API.demarrer().then(function (r) {
      if (!r.pret) { if (garde) return; porte.remove(); return App.porte(r.erreur || ''); }
      return App.recharger(true).then(function () { if (!garde) App.ouvrir(porte); });   // état déjà reçu au démarrage : pas de second appel
    }).catch(function (e) { if (err) err.textContent = e.message; else toast(e.message, true); });
  },
  ouvrir: function (porte) {
    App.coquille();
    App.route();
    porte.classList.add('sortie'); setTimeout(function () { porte.remove(); }, 750);
    App.pret = true;
  },
  recharger: function (dejaRecu) {
    return (dejaRecu && API.db() ? Promise.resolve({ db: API.db(), moi: API.moi(), mfaObligatoire: API.mfaObligatoire && API.mfaObligatoire() }) : API.etat()).then(function (r) {
      S.db = r.db; S.moi = r.moi; S.auj = LE.jour(); _kpiCache.cle = '';
      if (S.filtre.societeId && !S.db.societes[S.filtre.societeId]) { S.filtre.societeId = ''; S.filtre.branchId = ''; S.filtre.bienId = ''; sauverFiltre(); }
      if (S.filtre.branchId && !S.db.branches[S.filtre.branchId]) { S.filtre.branchId = ''; sauverFiltre(); }
      if (S.filtre.bienId && !S.db.biens[S.filtre.bienId]) { S.filtre.bienId = ''; sauverFiltre(); }
      if (S.prefs.garder && !API.demo) Local.ecrire('le.etat', { db: S.db, moi: S.moi, quand: new Date().toISOString() });
      if (r.mfaObligatoire) setTimeout(function () { toast('Activez la double authentification pour continuer (Réglages).', true); location.hash = '#/reglages'; }, 300);
      if (App.pret || document.querySelector('.coquille')) { App.coquille(); App.rendre(true); }
      App.signalerAlertes();
    });
  },
  signalerAlertes: function () {
    var n = alertesCourantes().filter(function (a) { return a.niveau === 'urgent'; }).length;
    if (n > S.alertesVues) { setTimeout(function () { SONS.jouer('notification'); }, 2800); }
    S.alertesVues = n; Local.ecrire('le.alertesVues', n);
  },

  /* ---------------------------------------------------------------- coquille */
  navItems: function () {
    if (propre()) return [['accueil', 'tache', 'Mes missions'], ['agenda', 'agenda', 'Agenda'], ['reglages', 'reglages', 'Réglages']];
    var l = [['accueil', 'accueil', 'Executive Office', 'tableau'], ['biens', 'biens', 'Biens', 'biens'], ['agenda', 'agenda', 'Agenda', 'agenda|reservations'], ['finance', 'finance', 'Finances', 'finance'], ['rapports', 'rapports', 'Rapports', 'rapports'],
      ['conciergerie', 'conciergerie', 'Conciergerie', 'conciergerie'], ['projets', 'projets', 'Projets', 'projets'], ['contacts', 'contacts', 'Contacts', 'tiers'], ['acces', 'acces', 'Accès', 'acces'], ['journal', 'journal', 'Journal', 'journal'], ['reglages', 'reglages', 'Réglages']];
    return l.filter(function (x) { return !x[3] || x[3].split('|').some(function (m) { return peut(m); }); });
  },
  coquille: function () {
    var app = document.getElementById('app'), items = App.navItems(), demo = API.demo, al = alertesCourantes(), nUrg = al.filter(function (a) { return a.niveau !== 'info'; }).length;
    var lien = function (x) { var n = x[0] === 'agenda' ? V(S.db.taches).filter(function (t) { return (t.statut === 'a_faire' || t.statut === 'en_cours') && t.date <= S.auj && (!propre() || t.assigneId === S.moi.id); }).length : 0; return '<a href="#/' + x[0] + '" data-nav="' + x[0] + '">' + ic(x[1]) + '<span>' + esc(x[2]) + '</span>' + (n ? '<i class="pastille">' + n + '</i>' : '') + '</a>'; };
    var sections = propre() ? [['', items]] : [['Pilotage', items.filter(function (x) { return ['accueil', 'biens', 'agenda', 'finance', 'rapports'].indexOf(x[0]) >= 0; })], ['Métiers', items.filter(function (x) { return ['conciergerie', 'projets', 'contacts'].indexOf(x[0]) >= 0; })], ['Administration', items.filter(function (x) { return ['acces', 'journal', 'reglages'].indexOf(x[0]) >= 0; })]];
    var basItems = propre() ? items : [items[0]].concat(items.filter(function (x) { return x[0] === 'biens'; }), items.filter(function (x) { return x[0] === 'agenda'; }), items.filter(function (x) { return x[0] === 'rapports'; }), [['plus', 'plus', 'Plus']]);
    var sonOn = S.prefs.sons || S.prefs.ambiance;
    var h = '<div class="coquille' + (S.prefs.barre === 'mini' ? ' mini' : '') + '"><aside class="barre" aria-label="Navigation principale"><a class="marque" href="#/accueil">' + MONOGRAMME + '<div class="marque-texte"><div class="marque-nom">LOFT ELEVEN</div><div class="marque-sous">Private Office</div></div></a>'
      + sections.filter(function (s) { return s[1].length; }).map(function (s) { return (s[0] ? '<div class="nav-titre">' + s[0] + '</div>' : '') + '<nav class="nav">' + s[1].map(lien).join('') + '</nav>'; }).join('')
      + '<div class="barre-pied"><button data-act="sonRapide">' + ic(sonOn ? 'son' : 'muet') + '<span class="texte">' + (sonOn ? 'Son activé' : 'Son désactivé') + '</span></button><button data-act="barre" class="masque-tablette">' + ic('panneau') + '<span class="texte">Réduire le menu</span></button></div></aside>'
      + '<div class="principal"><header class="haut"><a class="marque marque-mobile" href="#/accueil" aria-label="Accueil">' + MONOGRAMME.replace('class="monogramme"', 'class="monogramme" style="width:32px;height:32px"') + '</a>'
      + '<div class="recherche" data-recherche>' + ic('recherche') + '<input type="search" placeholder="Rechercher un bien, un client, une facture…" aria-label="Recherche globale" data-recherche-champ autocomplete="off"><kbd class="masque-tablette">⌘K</kbd></div>'
      + '<div class="haut-droite">' + (propre() ? '' : '<button class="puce-perimetre" data-act="perimetre" aria-haspopup="true">' + ic('filtre') + '<span>' + esc(nomPerimetre()) + '</span>' + ic('bas') + '</button>')
      + '<button class="bt-icone seulement-mobile-inline" data-act="rechercheMobile" aria-label="Rechercher">' + ic('recherche') + '</button>'
      + '<button class="bt-icone masque-mobile' + (sonOn ? ' on' : '') + '" data-act="sonRapide" aria-label="' + (sonOn ? 'Couper le son' : 'Activer le son') + '" title="' + (sonOn ? 'Couper le son' : 'Activer le son') + '">' + ic(sonOn ? 'son' : 'muet') + '</button>'
      + '<button class="bt-icone" data-act="alertes" aria-label="Alertes (' + nUrg + ')">' + ic('cloche') + (nUrg ? '<span class="point"></span>' : '') + '</button>'
      + '<a class="avatar" href="#/reglages" title="' + esc(S.moi.nom) + '" aria-label="Mon compte">' + esc(initiales(S.moi.nom)) + '</a></div></header>'
      + (demo ? '<div class="bandeau-demo">' + ic('info') + '<span><span class="masque-mobile">Démonstration · données fictives · profil : </span><span class="seulement-mobile-inline2">Démo fictive · </span><b>' + esc(S.moi.nom) + '</b><span class="masque-mobile"> (' + esc(LE.ROLES[S.moi.role].nom) + ')</span></span><button data-go="reglages">Changer de profil</button></div>' : '')
      + (!S.enLigne && !demo ? '<div class="bandeau-demo bandeau-hors">' + ic('alerte') + '<span>Hors connexion : consultation seule, rien ne peut être enregistré pour l’instant.</span></div>' : '')
      + '<main class="contenu" id="contenu" tabindex="-1"></main></div>'
      + '<nav class="nav-bas" aria-label="Navigation" style="grid-template-columns:repeat(' + basItems.length + ',1fr)">' + basItems.map(function (x) { return '<a href="#/' + x[0] + '" data-nav="' + x[0] + '">' + ic(x[1]) + '<span>' + esc(x[0] === 'accueil' && !propre() ? 'Accueil' : x[2]) + '</span>' + (x[0] === 'accueil' && nUrg && !propre() ? '<i class="pastille"></i>' : '') + '</a>'; }).join('') + '</nav>'
      + (propre() ? '' : '<button class="fab" data-act="ajoutRapide" aria-label="Ajouter">' + ic('ajout') + '</button>') + '</div>';
    var ancien = document.getElementById('contenu'), contenu = ancien ? ancien.innerHTML : '';
    app.innerHTML = h;
    if (contenu) document.getElementById('contenu').innerHTML = contenu;
    App.marquerNav();
  },
  marquerNav: function () {
    var n = S.route.nom, groupe = { bien: 'biens', projet: 'projets', contact: 'contacts', indicateur: 'accueil' }[n] || n;
    var basPlus = ['conciergerie', 'projets', 'contacts', 'acces', 'journal', 'reglages', 'finance', 'plus'];
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var k = a.getAttribute('data-nav'), dansBas = !!a.closest('.nav-bas');
      a.classList.toggle('actif', k === groupe || (dansBas && k === 'plus' && basPlus.indexOf(groupe) >= 0 && !document.querySelector('.nav-bas [data-nav="' + groupe + '"]')));
    });
  },

  /* ---------------------------------------------------------------- routeur */
  route: function () {
    var h = (location.hash || '#/accueil').replace(/^#\/?/, '').split('/'), nom = h[0] || 'accueil', p = h.slice(1).map(decodeURIComponent);
    if (DETAIL_ROUTES.indexOf(nom) >= 0) { if (!S.route.nom || S.route.nom === nom) { S.route = { nom: 'accueil', p: [] }; App.rendre(); } ouvrirDetail(nom, p[0]); history.replaceState(null, '', '#/' + S.route.nom + (S.route.p.length ? '/' + S.route.p.join('/') : '')); return; }
    if (!ROUTES[nom]) nom = 'accueil';
    var change = nom !== S.route.nom || p.join('/') !== S.route.p.join('/');
    var module = ROUTES[nom].m || nom;
    if (module !== App.moduleCourant && App.pret) SONS.jouer('ouverture');
    App.moduleCourant = module;
    if (nom !== 'bien') S.ongletBien = null;
    S.route = { nom: nom, p: p };
    Feuille.toutFermer(); fermerPopover(); fermerRecherche();
    App.rendre(!change);
  },
  rendre: function (garderScroll) {
    var c = document.getElementById('contenu'); if (!c || !S.db) return;
    var r = ROUTES[S.route.nom] || ROUTES.accueil, y = window.scrollY, html;
    if (r.m && !r.m.split('|').some(function (m) { return peut(m); })) html = vide('acces', 'Accès réservé', 'Ce module ne fait pas partie de vos habilitations.');
    else { try { html = r.f(S.route.p); } catch (e) { console.error(e); html = vide('alerte', 'Affichage impossible', esc(e.message)); } }
    c.innerHTML = html;
    if (!garderScroll) { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; window.scrollTo(0, 0); } else window.scrollTo(0, y);
    document.title = (S.route.nom === 'accueil' ? 'Loft Eleven · Private Office' : r.t + ' · Loft Eleven');
    chargerPhotos(c); App.marquerNav(); rafraichirDetails();
    var puce = document.querySelector('.puce-perimetre span'); if (puce) puce.textContent = nomPerimetre();
    var cloche = document.querySelector('[data-act="alertes"]'); if (cloche) { var n = alertesCourantes().filter(function (a) { return a.niveau !== 'info'; }).length; cloche.innerHTML = ic('cloche') + (n ? '<span class="point"></span>' : ''); }
  }
};

/* ---------------------------------------------------------------- actions de la coquille */
ACTIONS.barre = function () { S.prefs.barre = S.prefs.barre === 'mini' ? 'ouverte' : 'mini'; sauverPrefs(); document.querySelector('.coquille').classList.toggle('mini', S.prefs.barre === 'mini'); };
ACTIONS.sonRapide = function () {
  var on = S.prefs.sons || S.prefs.ambiance;
  if (on) { S.prefs.sons = false; S.prefs.ambiance = false; SONS.ambiance(false); } else { S.prefs.sons = true; SONS.preparer(); }
  sauverPrefs(); SONS.regler(S.prefs); if (!on) SONS.jouer('validation');
  toast(on ? 'Son coupé' : 'Sons de navigation activés'); App.coquille(); App.rendre(true);
};
ACTIONS.alertes = function () {
  var al = alertesCourantes();
  Feuille.ouvrir({ surtitre: nomPerimetre(), titre: 'Centre d’alertes', sous: al.length + ' alerte(s) calculée(s) à partir des données', corps: al.length ? '<div class="liste panneau-alertes">' + al.map(ligneAlerte).join('') + '</div>' : vide('ok', 'Aucune alerte', 'Tout est en ordre sur ce périmètre.') });
};
ACTIONS.perimetre = function (el) {
  var f = S.filtre, h = '<div class="titre-pop">Périmètre affiché</div>';
  var opt = function (cls, attrs, lib, sel) { return '<button class="opt ' + cls + (sel ? ' sel' : '') + '" ' + attrs + '>' + (sel ? ic('ok') : '<span style="width:20px"></span>') + esc(lib) + '</button>'; };
  if (Object.keys(S.db.societes).length > 1) h += opt('', 'data-per=""', 'Tout le groupe · consolidé', !f.societeId);
  V(S.db.societes).forEach(function (s) {
    h += opt('', 'data-per="s:' + s.id + '"', s.nom, f.societeId === s.id && !f.branchId && !f.bienId);
    V(S.db.branches).filter(function (b) { return b.societeId === s.id; }).forEach(function (b) { h += opt('n2', 'data-per="b:' + b.id + '"', b.nom, f.branchId === b.id && !f.bienId); });
  });
  var biens = trierPar(V(S.db.biens), function (b) { return b.nom; });
  if (biens.length) h += '<hr><div class="titre-pop">Un bien précis</div>' + biens.map(function (b) { return opt('n2', 'data-per="i:' + b.id + '"', b.nom, f.bienId === b.id); }).join('');
  popover(el, h, function (p) {
    p.addEventListener('click', function (e) {
      var o = e.target.closest('[data-per]'); if (!o) return;
      var v = o.getAttribute('data-per'), t = v.slice(0, 1), id = v.slice(2);
      f.societeId = ''; f.branchId = ''; f.bienId = '';
      if (t === 's') f.societeId = id;
      if (t === 'b') { f.branchId = id; f.societeId = S.db.branches[id].societeId; }
      if (t === 'i') { f.bienId = id; f.branchId = S.db.biens[id].branchId; f.societeId = S.db.biens[id].societeId; }
      sauverFiltre(); fermerPopover(); SONS.jouer('ouverture'); App.rendre(true);
    });
  });
};
ACTIONS.ajoutRapide = function (el) {
  var n = S.route.nom, l = [];
  var ajout = function (act, icone, lib, module) { if (peut(module, 2)) l.push('<button class="opt" data-ajout="' + act + '">' + ic(icone) + esc(lib) + '</button>'); };
  if (n === 'biens' || n === 'bien') ajout('nouveauBien', 'biens', 'Nouveau bien', 'biens');
  if (n === 'projets' || n === 'projet') ajout('nouveauProjet', 'projets', 'Nouveau projet', 'projets');
  if (n === 'contacts' || n === 'contact') ajout('nouveauContact', 'contacts', 'Nouveau contact', 'tiers');
  if (n === 'conciergerie') ajout('nouvellePrestation', 'conciergerie', 'Nouvelle demande VIP', 'conciergerie');
  ajout('nouvelleReservation', 'agenda', 'Réservation', 'reservations');
  ajout('encaissement', 'banque', 'Encaissement', 'finance');
  ajout('nouvelleDepense', 'depense', 'Dépense', 'finance');
  ajout('nouvelleTache', 'tache', 'Tâche', 'agenda');
  if (n !== 'conciergerie') ajout('nouvellePrestation', 'conciergerie', 'Prestation VIP', 'conciergerie');
  ajout('nouvelleFacture', 'facture', 'Facture', 'finance');
  if (n !== 'projets') ajout('nouveauProjet', 'projets', 'Projet', 'projets');
  if (n !== 'biens' && n !== 'bien') ajout('nouveauBien', 'biens', 'Bien', 'biens');
  if (!l.length) return toast('Votre accès est en lecture seule.', true);
  popover(el, '<div class="titre-pop">Ajouter</div>' + l.join(''), function (p) {
    if (window.matchMedia('(max-width: 760px)').matches) { p.style.top = 'auto'; p.style.bottom = 'calc(var(--nav-bas) + 80px + env(safe-area-inset-bottom))'; }
    p.addEventListener('click', function (e) { var o = e.target.closest('[data-ajout]'); if (!o) return; fermerPopover(); ACTIONS[o.getAttribute('data-ajout')](o, {}); });
  });
};
ACTIONS.rechercheMobile = function () { var r = document.querySelector('[data-recherche]'); r.classList.add('ouverte'); r.querySelector('input').focus(); };

/* ---------------------------------------------------------------- recherche globale */
function rechercher(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return [];
  var R = [], ok = function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; };
  V(S.db.biens).forEach(function (b) { if (ok(b.nom) || ok(b.quartier)) R.push({ ic: 'biens', t: b.nom, s: (L.modeBien[b.mode] || '') + ' · ' + (b.quartier || ''), go: 'bien/' + b.id }); });
  V(S.db.tiers).forEach(function (t) { if (ok(t.nom) || ok(t.telephone) || ok(t.email)) R.push({ ic: 'contacts', t: t.nom, s: L.typeTiers[t.type] + (t.telephone ? ' · ' + t.telephone : ''), go: 'contact/' + t.id }); });
  V(S.db.reservations).forEach(function (r) { if (ok(r.clientNom)) R.push({ ic: 'agenda', t: r.clientNom + ' · ' + nomDe('biens', r.bienId), s: dateCourte(r.debut) + ' → ' + dateCourte(r.fin) + ' · ' + L.statutReservation[r.statut], o: 'reservation:' + r.id, d: r.debut }); });
  V(S.db.factures).forEach(function (f) { if (ok(f.numero) || ok(f.libelle) || ok(f.clientNom)) R.push({ ic: 'facture', t: f.numero + ' · ' + (f.clientNom || nomDe('tiers', f.tiersId) || ''), s: f.libelle + ' · ' + fc(LE.totalFacture(f)), o: 'facture:' + f.id, d: f.date }); });
  V(S.db.projets).forEach(function (p) { if (ok(p.nom)) R.push({ ic: 'projets', t: p.nom, s: L.typeProjet[p.type], go: 'projet/' + p.id }); });
  V(S.db.prestations).forEach(function (p) { if (ok(p.libelle) || ok(p.clientNom)) R.push({ ic: 'conciergerie', t: p.libelle, s: (p.clientNom || '') + ' · ' + dateCourte(p.date), o: 'prestation:' + p.id, d: p.date }); });
  V(S.db.taches).forEach(function (t) { if (ok(t.titre) && t.statut !== 'validee') R.push({ ic: 'tache', t: t.titre, s: dateCourte(t.date) + ' · ' + L.statutTache[t.statut], o: 'tache:' + t.id, d: t.date }); });
  return R.sort(function (a, b) { return (a.go ? 0 : 1) - (b.go ? 0 : 1) || ((b.d || '') > (a.d || '') ? 1 : -1); }).slice(0, 12);
}
function fermerRecherche() { var r = document.querySelector('.resultats'); if (r) r.remove(); var z = document.querySelector('[data-recherche]'); if (z) z.classList.remove('ouverte'); }
document.addEventListener('input', function (e) {
  if (e.target.matches('[data-recherche-champ]')) {
    var z = e.target.closest('[data-recherche]'), res = rechercher(e.target.value), box = z.querySelector('.resultats');
    if (!e.target.value.trim()) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'resultats'; z.appendChild(box); }
    box.innerHTML = res.length ? res.map(function (r, i) { return '<a href="' + (r.go ? '#/' + r.go : '#') + '"' + (r.o ? ' data-ouvrir="' + r.o + '"' : '') + ' class="' + (i === 0 ? 'sel' : '') + '"><span class="pastille-ic">' + ic(r.ic) + '</span><span style="min-width:0"><span style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(r.t) + '</span><small>' + esc(r.s) + '</small></span></a>'; }).join('') : '<div class="vide">Aucun résultat pour « ' + esc(e.target.value) + ' »</div>';
  }
  if (e.target.matches('[data-volume]')) { S.prefs.volume = +e.target.value; sauverPrefs(); SONS.volume(S.prefs.volume); }
  if (e.target.matches('[data-rech-contacts]')) {
    S.rechContacts = e.target.value; var pos = e.target.selectionStart; App.rendre(true);
    var i = document.querySelector('[data-rech-contacts]'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) { } }
  }
});
document.addEventListener('keydown', function (e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { var i = document.querySelector('[data-recherche-champ]'); if (i) { e.preventDefault(); if (window.matchMedia('(max-width: 760px)').matches) ACTIONS.rechercheMobile(); else i.focus(); } }
  if (e.target.matches && e.target.matches('[data-recherche-champ]')) {
    var box = document.querySelector('.resultats'); if (!box) return;
    var l = Array.prototype.slice.call(box.querySelectorAll('a')), k = l.findIndex(function (a) { return a.classList.contains('sel'); });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (l[k]) l[k].classList.remove('sel'); k = (k + (e.key === 'ArrowDown' ? 1 : -1) + l.length) % l.length; l[k].classList.add('sel'); }
    if (e.key === 'Enter' && l[k]) { e.preventDefault(); l[k].click(); }
    if (e.key === 'Escape') { e.target.value = ''; fermerRecherche(); e.target.blur(); }
  }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('[role=link][tabindex], article.bien')) e.target.click();
});
document.addEventListener('focusout', function (e) { if (e.target.matches && e.target.matches('[data-recherche-champ]')) setTimeout(function () { if (!document.activeElement || !document.activeElement.closest || !document.activeElement.closest('[data-recherche]')) fermerRecherche(); }, 200); });

/* ---------------------------------------------------------------- délégation des clics */
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-fermer-feuille]');
  if (t) { Feuille.fermer(); if (t.tagName !== 'A') return; }
  t = e.target.closest('.resultats a');
  if (t) { fermerRecherche(); var champ = document.querySelector('[data-recherche-champ]'); if (champ) { champ.value = ''; champ.blur(); } if (t.hasAttribute('data-ouvrir')) { e.preventDefault(); var q = t.getAttribute('data-ouvrir').split(':'); ouvrirDetail(q[0], q[1]); } return; }
  t = e.target.closest('[data-act]');
  if (t && !(t.matches('input[type=checkbox]'))) {
    if (!ACTIONS[t.getAttribute('data-act')]) return;
    e.preventDefault(); e.stopPropagation();
    try { ACTIONS[t.getAttribute('data-act')](t, t.dataset); } catch (er) { console.error(er); toast(er.message, true); }
    return;
  }
  if (t) return;
  t = e.target.closest('[data-ouvrir]');
  if (t) { var p = t.getAttribute('data-ouvrir').split(':'); ouvrirDetail(p[0], p[1]); return; }
  t = e.target.closest('[data-go]');
  if (t) { e.preventDefault(); Feuille.toutFermer(); location.hash = '#/' + t.getAttribute('data-go'); }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.matches('input[type=checkbox][data-act]') && ACTIONS[t.getAttribute('data-act')]) ACTIONS[t.getAttribute('data-act')](t, t.dataset);
});

/* ---------------------------------------------------------------- démarrage */
window.addEventListener('hashchange', function () { if (S.db) App.route(); });
window.addEventListener('online', function () { S.enLigne = true; if (App.pret) { App.coquille(); App.rendre(true); if (!API.demo) App.recharger().catch(function () { }); } });
window.addEventListener('offline', function () { S.enLigne = false; if (App.pret) { App.coquille(); App.rendre(true); } });
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); App.invitation = e; var b = document.querySelector('[data-act="installer"]'); if (b) b.classList.remove('cache'); });
document.addEventListener('visibilitychange', function () {
  // Au retour sur l'application : nouvelle journée ou données modifiées ailleurs.
  if (!document.hidden && App.pret && !API.demo && S.enLigne) App.recharger().catch(function () { });
  if (!document.hidden && App.pret && S.auj !== LE.jour()) { S.auj = LE.jour(); _kpiCache.cle = ''; App.rendre(true); }
});
var _redim; window.addEventListener('resize', function () { clearTimeout(_redim); _redim = setTimeout(function () { if (App.pret && (S.route.nom === 'agenda')) App.rendre(true); }, 250); });

(function () {
  // Aperçu d'une palette sans l'enregistrer (page de comparaison) : ?palette=…&theme=…&auto=1
  var q = new URLSearchParams(location.search);
  if (q.get('palette') && PALETTES[q.get('palette')]) S.prefs = Object.assign({}, S.prefs, { palette: q.get('palette'), theme: q.get('theme') === 'sombre' ? 'sombre' : 'clair' });
  if (q.get('auto') && API.demo) { App.theme(); App.porte(); var p = document.querySelector('.porte'); if (p) App.entrer(false, p); return; }
  App.theme();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  App.porte();
})();
