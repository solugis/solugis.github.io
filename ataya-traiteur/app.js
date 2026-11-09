/* ATAYA TRAITEUR — interface. Données gardées sur le téléphone (affichage immédiat, hors ligne), envoyées au service Apps Script dès que le réseau le permet.
   Modes : démo (TRAITEUR_CONFIG.api vide, données fictives locales), banc (service simulé), en ligne (adresse /exec du script). Une solution SoluGis. */
(function () {
  'use strict';
  var M = window.TM, C = window.TRAITEUR_CONFIG || {}, N = window.MARQUE;
  var MODE = !C.api ? 'demo' : C.api === 'banc' ? 'banc' : 'ligne';
  var PFX = 'traiteur.' + (MODE === 'ligne' ? 'app' : MODE) + '.';
  var PARAMS = new URLSearchParams(location.search);

  function lireL(k, d) { try { var v = localStorage.getItem(PFX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrireL(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ } }
  var S = { data: lireL('data', null), file: lireL('file', []), version: lireL('version', 0), jeton: lireL('jeton', ''), maj: lireL('maj', 0) };
  var R = Object.assign({ sons: true, theme: 'clair', taille: 'normal' }, lireL('reglages', {}));
  var NAV = Object.assign({ vue: 'jour', jour: '', periode: 'semaine', decal: 0 }, lireL('nav', {}));
  var B = lireL('brouillon', null);                     // commande en cours de saisie (gardée si l'on change d'onglet)
  function sauver() { ecrireL('data', S.data); ecrireL('file', S.file); ecrireL('version', S.version); ecrireL('jeton', S.jeton); ecrireL('maj', S.maj); }

  /* ================================================================== outils */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function auj() { var d = PARAMS.get('date'); return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : M.iso(new Date()); }
  function attendre(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function e(x) { return '<i class="e">' + x + '</i>'; }
  function F(n) { return M.F(n); }
  function logoMoyen(m, cls) { m = typeof m === 'string' ? M.moyen(m) : m; return m.logo ? '<img class="logo-moyen ' + (cls || '') + '" src="' + m.logo + '" alt="">' : '<span class="logo-moyen especes ' + (cls || '') + '">💵</span>'; }
  function champ(lib, html) { return '<label class="champ"><span>' + esc(lib) + '</span>' + html + '</label>'; }
  function champMontant(nom, v) { return '<input name="' + nom + '" class="gros" inputmode="numeric" autocomplete="off" value="' + (v ? M.nombre(v) : '') + '" placeholder="0">'; }
  function formaterMontants(r) { $$('input.gros', r).forEach(function (i) { i.addEventListener('input', function () { var n = M.lireMontant(i.value); i.value = n ? M.nombre(n) : ''; }); }); }
  function toast(t) { var el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.classList.add('on'); }, 10); setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 400); }, 2800); }
  /* grande coche de confirmation, couleur du sens (vert argent, bleu commande, violet dépense, orange crédit) */
  function okPlein(texte, coul, son) {
    var el = document.createElement('div'); el.className = 'ok-plein c-' + (coul || 'vert');
    el.innerHTML = '<div class="ok-rond"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><b>' + esc(texte) + '</b></div>';
    document.body.appendChild(el); requestAnimationFrame(function () { el.classList.add('on'); });
    Sons.jouer(son || 'enregistre');
    setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 300); }, 1300);
  }

  /* ================================================================== données */
  function col(c) { if (!S.data[c]) S.data[c] = {}; return S.data[c]; }
  function tous(c) { var o = col(c); return Object.keys(o).map(function (k) { return o[k]; }); }
  function doc(c, id) { return col(c)[id]; }
  function poser(c, d) { d.maj = Date.now(); col(c)[d.id] = d; empiler({ op: 'put', col: c, id: d.id, doc: d }); }
  function retirer(c, id) { delete col(c)[id]; empiler({ op: 'del', col: c, id: id }); }
  function empiler(op) {
    if (MODE !== 'demo') { op.opId = uid(); S.file = S.file.filter(function (o) { return !(o.col === op.col && o.id === op.id); }); S.file.push(op); }
    sauver(); planifierSync();
  }
  function D() { return { commandes: tous('commandes'), paiements: tous('paiements'), depenses: tous('depenses'), clients: tous('clients'), plats: tous('plats'), menus: tous('menus') }; }
  function activite() { return doc('reglages', 'activite') || { nom: '', prenom: '' }; }
  function moyensActifs() { var d = doc('reglages', 'moyens'), L = d && d.liste && d.liste.length ? d.liste : ['especes', 'wave', 'om', 'mtn', 'moov']; return M.MOYENS.filter(function (m) { return L.indexOf(m.id) >= 0; }); }
  function platsActifs() { return tous('plats').filter(function (p) { return p.actif !== false; }).sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0) || (a.nom < b.nom ? -1 : 1); }); }
  function client(id) { return id ? doc('clients', id) : null; }
  function couleurClient(k) { return M.COULEURS_CLIENTS[(+k.couleur || 0) % M.COULEURS_CLIENTS.length]; }
  function avatar(k, cls) {
    if (!k) return '<span class="av ' + (cls || '') + '" style="--ac:#7b8580">' + e('👤') + '</span>';
    return '<span class="av ' + (cls || '') + '" style="--ac:' + couleurClient(k) + '">' + esc(M.initiales(k.nom)) + '<i class="b">' + (k.type === 'entreprise' ? '🏢' : '👤') + '</i></span>';
  }
  function nomCommande(c) { var k = client(c.client); return k ? k.nom : (c.passage ? c.passage + ' (de passage)' : 'Client de passage'); }
  function resumePlats(c) { return (c.lignes || []).map(function (l) { return l.ic + ' ×' + l.q; }).join('   '); }
  function etatCmd(c, sit) {
    var s = (sit || M.situation(D())).cmd[c.id] || { total: M.total(c), reste: M.total(c), paye: 0 };
    var L = [];
    L.push(c.livree ? '<span class="st c-vert">🛵 Livrée</span>' : '<span class="st c-bleu">🛵 À livrer' + (c.heure ? ' · ' + esc(c.heure.replace(':', 'h')) : '') + '</span>');
    if (s.reste <= 0) L.push('<span class="st c-vert">✓ Payé</span>');
    else if (!c.livree && c.mode === 'livraison') L.push('<span class="st c-bleu">💵 Paie à la livraison</span>');
    else L.push('<span class="st c-orange">📒 ' + (s.paye > 0 ? 'Reste ' : 'Crédit ') + F(s.reste) + '</span>');
    return { html: L.join(''), s: s };
  }

  /* ================================================================== échanges avec le service Apps Script */
  var sync = { enCours: false, encore: false, etat: 'ok', minuterie: null };
  function erreur(m, code) { var x = new Error(m); x.code = code || ''; return x; }
  function appel(fn, args) {
    args = Object.assign({ jeton: S.jeton }, args || {});
    var corps = JSON.stringify({ fn: fn, args: args }), envoi;
    if (MODE === 'banc') {
      envoi = new Promise(function (ok, ko) {
        setTimeout(function () {
          if (PARAMS.get('horsligne')) return ko(erreur('Connexion impossible pour le moment.', 'reseau'));
          try { ok(JSON.parse(JSON.stringify(window.TRAITEUR_SERVEUR.traiter(JSON.parse(corps))))); } catch (x) { ko(x); }
        }, +(PARAMS.get('lent') || 150));
      });
    } else {
      envoi = (async function () {
        for (var essai = 0; ; essai++) {
          try {
            var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 12000);
            var r = await fetch(C.api, { method: 'POST', body: corps, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal });
            clearTimeout(t); return await r.json();
          } catch (x) { if (essai >= 2) throw erreur('Connexion impossible pour le moment.', 'reseau'); await attendre(1200 * (essai + 1)); }
        }
      })();
    }
    return envoi.then(function (rep) { if (!rep || !rep.ok) throw erreur((rep && rep.erreur) || 'Erreur inconnue.', rep && rep.code); return rep; });
  }
  function planifierSync() { if (MODE === 'demo') return; clearTimeout(sync.minuterie); sync.minuterie = setTimeout(synchroniser, 500); majPastille(); }
  async function synchroniser() {
    if (MODE === 'demo' || !S.jeton) return;
    if (sync.enCours) { sync.encore = true; return; }
    sync.enCours = true; majPastille();
    try {
      while (S.file.length) {
        var lot = S.file.slice(0, sync.unParUn ? 1 : 40), faits = {};
        try { var r = await appel('ecrire', { ops: lot }); S.version = r.version; sync.ecrit = Date.now(); }
        catch (x) {
          if (x.code === 'reseau' || x.code === 'serveur' || x.code === 'session') throw x;
          if (lot.length > 1) { sync.unParUn = true; continue; }
          var rej = lireL('rejets', []); rej.push({ op: lot[0], erreur: x.message, quand: Date.now() }); ecrireL('rejets', rej.slice(-20));
          toast('Un enregistrement n’a pas pu être envoyé : ' + x.message);
        }
        lot.forEach(function (o) { faits[o.opId] = 1; });
        S.file = S.file.filter(function (o) { return !faits[o.opId]; });
        S.maj = Date.now(); sauver();
      }
      sync.unParUn = false; sync.etat = 'ok';
    } catch (x) {
      if (x.code === 'session') { sync.enCours = false; return deconnecter('Votre session a expiré : entrez de nouveau votre code. Vos saisies sont gardées.'); }
      sync.etat = 'horsligne'; setTimeout(planifierSync, 20000);
    }
    sync.enCours = false; majPastille();
    if (sync.encore) { sync.encore = false; synchroniser(); }
  }
  async function rafraichir() {
    if (MODE === 'demo' || !S.jeton) return;
    try {
      var r = await appel('etat', {}), data = r.data || {};
      if (r.version < S.version && Date.now() - (sync.ecrit || 0) < 60000) { majPastille(); return; }
      S.file.forEach(function (op) { data[op.col] = data[op.col] || {}; if (op.op === 'put') data[op.col][op.id] = op.doc; else delete data[op.col][op.id]; });
      S.data = data; S.version = r.version; S.maj = Date.now(); sauver();
      if (!S.file.length) sync.etat = 'ok';
      majPastille(); redessinerSiLibre();
      if (S.file.length) synchroniser();
    } catch (x) {
      if (x.code === 'session') return deconnecter('Votre session a expiré : entrez de nouveau votre code.');
      sync.etat = 'horsligne'; majPastille();
    }
  }
  function majPastille() {
    var p = $('#pastille'); if (!p) return;
    var t = MODE === 'demo' ? 'demo' : sync.enCours ? 'attente' : sync.etat === 'horsligne' ? 'horsligne' : S.file.length ? 'attente' : sync.etat;
    p.className = 'pastille ' + t;
  }
  function deconnecter(msg, toutEffacer) {
    S.jeton = '';
    if (toutEffacer) { S.data = null; S.file = []; S.version = 0; }
    sauver(); fermerModales(); demarrer(); if (msg) toast(msg);
  }

  /* ================================================================== modales */
  var PILE = [];
  function ouvrirModale(titre, html, o) {
    o = o || {};
    var el = document.createElement('div'); el.className = 'modale' + (o.plein ? ' plein' : '');
    el.innerHTML = '<div class="voile"></div><div class="feuille" role="dialog" aria-label="' + esc(titre) + '"><div class="feuille-tete"><h2>' + titre + '</h2><button class="fermer" aria-label="Fermer">✕</button></div><div class="feuille-corps">' + html + '</div></div>';
    document.body.appendChild(el); PILE.push(el); document.body.classList.add('modale-ouverte');
    el.querySelector('.voile').onclick = fermerModale; el.querySelector('.fermer').onclick = fermerModale;
    requestAnimationFrame(function () { el.classList.add('on'); });
    return el.querySelector('.feuille-corps');
  }
  function fermerModale() {
    var el = PILE.pop(); if (!el) return;
    el.classList.remove('on'); setTimeout(function () { el.remove(); }, 250);
    if (!PILE.length) { document.body.classList.remove('modale-ouverte'); dessiner(); }
  }
  function fermerModales() { while (PILE.length) PILE.pop().remove(); document.body.classList.remove('modale-ouverte'); }
  function demander(texte, lib) {
    return new Promise(function (ok) {
      var c = ouvrirModale('Confirmer', '<p style="font-weight:650">' + esc(texte) + '</p><div class="rang-btn"><button class="btn sec" data-r="0">Annuler</button><button class="btn sec danger" data-r="1">' + esc(lib || 'Confirmer') + '</button></div>');
      $$('[data-r]', c).forEach(function (b) { b.onclick = function () { fermerModale(); ok(b.dataset.r === '1'); }; });
    });
  }
  function redessinerSiLibre() { var a = document.activeElement; if (PILE.length || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return; dessiner(); }

  /* ================================================================== connexion (un seul profil : la patronne) */
  function porte() {
    document.getElementById('app').innerHTML = '<div class="porte"><div class="porte-haut"><img src="icone-192.png" alt=""><h1>' + esc(N.appli) + '</h1><p>' + esc(N.devise) + '</p></div>' +
      '<form class="carte formulaire porte-form" autocomplete="on">' + champ('Votre code personnel', '<input name="code" type="password" autocomplete="current-password" required>') +
      '<div class="nouveau formulaire" hidden>' + champ('Choisissez votre code (6 caractères au moins)', '<input name="nouveau" type="password" autocomplete="new-password" minlength="6">') + champ('Écrivez-le une seconde fois', '<input name="confirme" type="password" autocomplete="new-password">') + '</div>' +
      '<p class="erreur" role="alert"></p><button class="btn plein geant" type="submit">' + e('🔓') + ' Entrer</button></form><p class="porte-pied">Une solution SoluGis</p></div>';
    var f = $('.porte-form'), etapeNouveau = false;
    f.onsubmit = async function (ev) {
      ev.preventDefault(); var err = $('.erreur', f), btn = $('button[type=submit]', f); err.textContent = ''; err.classList.remove('info');
      var a = { profil: 'patronne', code: f.code.value };
      if (etapeNouveau) {
        if (f.nouveau.value.length < 6) { err.textContent = 'Votre code doit compter au moins 6 caractères.'; return; }
        if (f.nouveau.value !== f.confirme.value) { err.textContent = 'Les deux codes ne sont pas identiques.'; return; }
        a.nouveau = f.nouveau.value;
      }
      btn.disabled = true;
      try {
        var r = await appel('connexion', a);
        if (r.etape === 'nouveau') { etapeNouveau = true; $('.nouveau', f).hidden = false; err.classList.add('info'); err.textContent = 'Première connexion : choisissez votre code personnel.'; f.nouveau.focus(); }
        else { S.jeton = r.jeton; sauver(); Sons.jouer('ouverture'); demarrer(); }
      } catch (x) { err.textContent = x.message; }
      btn.disabled = false;
    };
  }

  /* ================================================================== charpente */
  var ONGLETS = [['jour', 'Aujourd’hui', '🍲', 'c-marque'], ['commande', 'Commande', '➕', 'c-bleu'], ['credits', 'Crédits', '📒', 'c-orange'], ['comptes', 'Comptes', '💰', 'c-vert']];
  function charpente() {
    var a = activite();
    document.getElementById('app').innerHTML =
      '<header class="barre"><img class="logo" src="icone-192.png" alt=""><div class="barre-txt"><b>' + esc(a.nom || N.appli) + '</b><span>' + esc(N.appli) + (MODE === 'demo' ? '<em class="badge-demo">Démo</em>' : '') + '</span></div>' +
      '<button class="btn-rond" id="btn-reglages" aria-label="Réglages">⚙️<span id="pastille" class="pastille"></span></button></header>' +
      '<main id="vue"></main>' +
      '<nav class="onglets">' + ONGLETS.map(function (o, i) { return '<button class="' + o[3] + '" data-vue="' + o[0] + '" data-i="' + i + '">' + e(o[2]) + '<span>' + o[1] + '</span></button>'; }).join('') + '</nav>';
    $$('.onglets button').forEach(function (b) { b.onclick = function () { if (b.dataset.vue === 'jour') NAV.jour = ''; aller(b.dataset.vue); Sons.jouer('onglet', +b.dataset.i); }; });
    $('#btn-reglages').onclick = reglages;
    majPastille();
  }
  function aller(chemin) {
    var p = String(chemin).split('/'); NAV.vue = p[0];
    if (p[0] === 'jour') NAV.jour = p[1] || NAV.jour || '';
    ecrireL('nav', NAV); fermerModales(); dessiner(); window.scrollTo(0, 0);
  }
  function dessiner() {
    var v = $('#vue'); if (!v) return;
    $$('.onglets button').forEach(function (b) { b.classList.toggle('on', b.dataset.vue === NAV.vue); });
    document.body.dataset.vue = NAV.vue;
    ({ jour: vueJour, commande: vueCommande, credits: vueCredits, comptes: vueComptes }[NAV.vue] || vueJour)(v);
  }
  function brancher(r) {
    $$('[data-aller]', r).forEach(function (b) { b.onclick = function () { aller(b.dataset.aller); }; });
    $$('[data-cmd]', r).forEach(function (b) { b.onclick = function () { detailCommande(doc('commandes', b.dataset.cmd)); }; });
    $$('[data-cli]', r).forEach(function (b) { b.onclick = function () { ficheClient(b.dataset.cli); }; });
  }

  /* ================================================================== AUJOURD'HUI */
  function salut() { var h = PARAMS.get('heure') ? +PARAMS.get('heure') : new Date().getHours(); return h < 13 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'; }
  function carteCommande(c, sit) {
    var k = client(c.client), et = etatCmd(c, sit);
    return '<button class="cmd' + (c.livree ? ' livree' : '') + '" data-cmd="' + c.id + '">' + avatar(k) + '<div class="cmd-txt"><b>' + esc(nomCommande(c)) + '</b><span class="plats">' + esc(resumePlats(c)) + '</span><div class="statuts">' + et.html + '</div></div><div class="cmd-droite"><span class="montant">' + F(et.s.total) + '</span></div></button>';
  }
  function vueJour(v) {
    var a = auj(), jour = NAV.jour || a, d = D(), sit = M.situation(d), act = activite();
    var cmds = d.commandes.filter(function (c) { return c.date === jour; }).sort(function (x, y) { return (x.livree - y.livree) || ((x.heure || '99') < (y.heure || '99') ? -1 : 1) || (x.cree || 0) - (y.cree || 0); });
    var recu = d.paiements.filter(function (p) { return p.date === jour; }).reduce(function (s, p) { return s + (+p.montant || 0); }, 0);
    var aLivrer = cmds.filter(function (c) { return !c.livree; }).length;
    var credit = M.credits(d).reduce(function (s, x) { return s + x.reste; }, 0);
    var estAuj = jour === a;
    var html = (estAuj ? '<div class="bonjour"><h1>' + salut() + (act.prenom ? ' ' + esc(act.prenom) : '') + ' 👋🏾</h1></div>' : '') +
      '<div class="jour-nav"><button data-j="-1" aria-label="Jour précédent">‹</button><div class="jour-txt">' + esc(estAuj ? 'Aujourd’hui' : M.quand(jour, a).replace(/^./, function (x) { return x.toUpperCase(); })) + '<small>' + esc(M.dateLongue(jour)) + '</small></div><button data-j="1" aria-label="Jour suivant">›</button></div>' +
      '<div class="tuiles trois">' +
      '<button class="tuile c-vert" data-aller="comptes">' + e('💵') + '<span>Reçu</span><b>' + F(recu) + '</b></button>' +
      '<div class="tuile c-bleu">' + e('🛵') + '<span>À livrer</span><b>' + aLivrer + '</b></div>' +
      '<button class="tuile c-orange" data-aller="credits">' + e('📒') + '<span>On vous doit</span><b>' + F(credit) + '</b></button></div>';
    if (estAuj) html += M.conseils(d, a).map(function (c) { return '<button class="conseil c-' + c.c + '"' + (c.aller ? ' data-aller="' + c.aller + '"' : '') + '>' + e(c.ic) + '<span>' + esc(c.texte) + '</span></button>'; }).join('');
    /* menu du jour */
    var menu = doc('menus', jour), vendus = M.periode(d, jour, jour).plats;
    html += '<section class="carte"><div class="carte-tete">' + e('🍽️') + 'Menu ' + (estAuj ? 'du jour' : 'de ce jour') + '<button class="lien" id="btn-menu">' + (menu ? 'Modifier' : 'Préparer') + ' ›</button></div>';
    if (menu && menu.plats.length) {
      var princ = menu.plats.filter(function (p) { var pl = doc('plats', p.plat); return pl && !/🧃|🍹|🥤|🍵/.test(pl.ic); }), bois = menu.plats.filter(function (p) { return princ.indexOf(p) < 0; });
      html += '<div class="menu-liste">' + princ.map(function (p) {
        var pl = doc('plats', p.plat) || {}, q = (vendus[p.plat] || { q: 0 }).q, pct = p.prevu ? Math.min(100, Math.round(q * 100 / p.prevu)) : 0;
        return '<div class="menu-plat">' + e(pl.ic || '🍛') + '<b>' + esc(pl.nom) + '</b><span class="prix">' + F(p.prix) + '</span>' + (p.prevu ? '<div class="jauge"><i style="width:' + pct + '%"></i></div><small>' + q + ' vendus sur ' + p.prevu + '</small>' : '<small>' + q + ' vendus</small>') + '</div>';
      }).join('') + '</div>' + (bois.length ? '<div class="boissons">' + bois.map(function (p) { var pl = doc('plats', p.plat) || {}; return '<span>' + esc((pl.ic || '') + ' ' + pl.nom + ' · ' + F(p.prix)) + '</span>'; }).join('') + '</div>' : '');
    } else html += '<p class="vide">Pas encore de menu pour ce jour.</p><button class="btn plein sec" id="btn-menu2">' + e('🍽️') + ' Préparer le menu</button>';
    html += '</section>';
    /* commandes */
    html += '<h2 class="titre">' + e('🧾') + 'Commandes<small>' + cmds.length + '</small></h2>';
    html += cmds.length ? cmds.map(function (c) { return carteCommande(c, sit); }).join('') : '<div class="vide-grand">' + e('🛵') + 'Aucune commande pour ce jour.</div>';
    html += '<button class="btn plein bleu geant" id="btn-nouvelle">' + e('➕') + ' Nouvelle commande</button>';
    if (estAuj) {
      var avenir = d.commandes.filter(function (c) { return c.date > a; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
      if (avenir.length) {
        var parJour = {}; avenir.forEach(function (c) { parJour[c.date] = (parJour[c.date] || 0) + 1; });
        html += '<h2 class="titre">' + e('📅') + 'Déjà commandé pour plus tard</h2><section class="carte">' + Object.keys(parJour).map(function (j) { return '<button class="ligne-reg" data-aller="jour/' + j + '">' + e('🗓️') + '<div class="txt"><b>' + esc(M.quand(j, a).replace(/^./, function (x) { return x.toUpperCase(); })) + '</b><span>' + esc(M.dateLongue(j)) + '</span></div><b>' + parJour[j] + ' commande' + (parJour[j] > 1 ? 's' : '') + '</b><span class="fl">›</span></button>'; }).join('') + '</section>';
      }
    }
    if (MODE === 'demo') html += '<p class="note-demo">Démonstration : activité et clients fictifs. Vos essais restent sur ce téléphone.</p>';
    v.innerHTML = html; brancher(v);
    $$('[data-j]', v).forEach(function (b) { b.onclick = function () { NAV.jour = M.ajouter(jour, +b.dataset.j); ecrireL('nav', NAV); Sons.jouer('onglet', 1); dessiner(); }; });
    [$('#btn-menu', v), $('#btn-menu2', v)].forEach(function (b) { if (b) b.onclick = function () { formMenu(jour); }; });
    $('#btn-nouvelle', v).onclick = function () { nouveauBrouillon(jour); aller('commande'); };
  }

  /* ---------- menu du jour */
  function formMenu(jour) {
    var menu = doc('menus', jour), L = platsActifs(), choix = {};
    var precedent = tous('menus').filter(function (m) { return m.id < jour && m.plats && m.plats.length; }).sort(function (a, b) { return a.id < b.id ? 1 : -1; })[0];
    function charger(m) { choix = {}; (m ? m.plats : []).forEach(function (p) { choix[p.plat] = { prix: p.prix, prevu: m === menu ? p.prevu : '' }; }); }
    charger(menu);
    var r = ouvrirModale('🍽️ Menu du ' + esc(M.dateLongue(jour)), '<div id="menu-corps"></div>', { plein: true });
    function rendre() {
      $('#menu-corps', r).innerHTML = (!menu && precedent ? '<button class="btn plein sec" id="reprendre">' + e('↩️') + ' Reprendre le menu du ' + esc(M.dateCourte(precedent.id)) + '</button>' : '') +
        '<p class="aide">Touchez les plats servis ce jour. Le nombre de portions préparées est facultatif : il permet de voir ce qui reste.</p>' +
        L.map(function (p) {
          var c = choix[p.id];
          return '<div class="carte" style="padding:12px;margin:10px 0;' + (c ? 'outline:3px solid var(--bleu)' : '') + '"><button class="ligne-reg" style="border:0;padding:4px 0" data-p="' + p.id + '">' + e(p.ic) + '<div class="txt"><b>' + esc(p.nom) + '</b><span>' + F(p.prix) + '</span></div><span class="interrupteur' + (c ? ' on' : '') + '"></span></button>' +
            (c ? '<div class="deux" style="margin-top:8px">' + champ('Prix ce jour', '<input data-prix="' + p.id + '" inputmode="numeric" value="' + M.nombre(c.prix) + '">') + champ('Portions préparées', '<input data-prevu="' + p.id + '" inputmode="numeric" value="' + (c.prevu || '') + '" placeholder="—">') + '</div>' : '') + '</div>';
        }).join('') +
        '<button class="btn plein bleu geant" id="garder">' + e('✅') + ' Enregistrer le menu</button>' + (menu ? '<div class="rang-btn"><button class="btn sec danger" id="vider">Effacer ce menu</button></div>' : '');
      $$('[data-p]', r).forEach(function (b) { b.onclick = function () { lireChamps(); var id = b.dataset.p; if (choix[id]) delete choix[id]; else choix[id] = { prix: doc('plats', id).prix, prevu: '' }; Sons.jouer('coche'); rendre(); }; });
      if ($('#reprendre', r)) $('#reprendre', r).onclick = function () { charger(precedent); rendre(); };
      $('#garder', r).onclick = function () {
        lireChamps();
        var ids = L.map(function (p) { return p.id; }).filter(function (id) { return choix[id]; });
        if (!ids.length) return toast('Choisissez au moins un plat.');
        poser('menus', { id: jour, plats: ids.map(function (id) { return { plat: id, prix: +choix[id].prix || doc('plats', id).prix, prevu: +choix[id].prevu || 0 }; }) });
        fermerModale(); okPlein('Menu enregistré', 'bleu');
      };
      if ($('#vider', r)) $('#vider', r).onclick = async function () { if (await demander('Effacer le menu de ce jour ? Les commandes restent.', 'Effacer')) { retirer('menus', jour); fermerModales(); dessiner(); } };
    }
    function lireChamps() { $$('[data-prix]', r).forEach(function (i) { if (choix[i.dataset.prix]) choix[i.dataset.prix].prix = M.lireMontant(i.value); }); $$('[data-prevu]', r).forEach(function (i) { if (choix[i.dataset.prevu]) choix[i.dataset.prevu].prevu = M.lireMontant(i.value); }); }
    rendre();
  }

  /* ---------- détail d'une commande */
  function detailCommande(c) {
    if (!c) return;
    var k = client(c.client), sit = M.situation(D()), et = etatCmd(c, sit), s = et.s;
    var pai = tous('paiements').filter(function (p) { return p.commande === c.id; });
    var r = ouvrirModale(esc(nomCommande(c)),
      '<div class="statuts" style="margin-top:0">' + et.html + '</div>' +
      '<section class="carte"><div class="histo lignes-cmd">' + (c.lignes || []).map(function (l) { return '<div class="histo-l">' + e(l.ic) + '<div class="txt"><b>' + esc(l.nom) + '</b><span>' + l.q + ' × ' + F(l.prix) + '</span></div><span class="m">' + F(l.q * l.prix) + '</span></div>'; }).join('') + '</div>' +
      '<div class="detail-total"><span>Total</span><b>' + F(s.total) + '</b></div>' + (s.paye > 0 && s.reste > 0 ? '<div class="detail-total" style="color:var(--orange)"><span>Reste à payer</span><b>' + F(s.reste) + '</b></div>' : '') + '</section>' +
      '<section class="carte"><div class="histo">' +
      '<div class="histo-l">' + e('📅') + '<div class="txt"><b>' + esc(M.dateLongue(c.date)) + (c.heure ? ' à ' + esc(c.heure.replace(':', 'h')) : '') + '</b><span>Livraison</span></div></div>' +
      (c.lieu ? '<div class="histo-l">' + e('📍') + '<div class="txt"><b>' + esc(c.lieu) + '</b><span>Lieu</span></div></div>' : '') +
      (c.note ? '<div class="histo-l">' + e('📝') + '<div class="txt"><b>' + esc(c.note) + '</b><span>Note</span></div></div>' : '') +
      pai.map(function (p) { var m = M.moyen(p.moyen); return '<div class="histo-l">' + logoMoyen(m, 'h') + '<div class="txt"><b>Payé ' + esc(M.quand(p.date, auj())) + '</b><span>' + esc(m.nom) + '</span></div><span class="m plus">' + F(p.montant) + '</span></div>'; }).join('') +
      '</div></section>' +
      '<div class="rang-btn">' + (c.livree ? '' : '<button class="btn bleu geant" id="livrer">' + e('🛵') + ' Marquer livrée</button>') +
      (s.reste > 0 ? '<button class="btn vert geant" id="encaisser">' + e('💵') + ' Encaisser ' + F(s.reste) + '</button>' : '') + '</div>' +
      '<div class="rang-btn">' + (k && k.tel ? '<button class="btn wa" id="wa">' + e('💬') + ' WhatsApp</button>' : '') + (k ? '<button class="btn sec" id="fiche">' + e('👤') + ' Le client</button>' : '') + '</div>' +
      '<div class="rang-btn"><button class="btn sec" id="modifier">' + e('✏️') + ' Modifier</button>' + (c.livree ? '<button class="btn sec" id="pas-livree">' + e('↩️') + ' Pas encore livrée</button>' : '') + '<button class="btn sec danger" id="suppr">' + e('🗑️') + ' Supprimer</button></div>');
    if ($('#livrer', r)) $('#livrer', r).onclick = function () { fermerModale(); livrer(c); };
    if ($('#encaisser', r)) $('#encaisser', r).onclick = function () { formEncaisser({ client: c.client, commande: c.id, montant: s.reste, titre: nomCommande(c) }); };
    if ($('#wa', r)) $('#wa', r).onclick = function () { ouvrirWhatsApp(k.tel, messageCommande(c, s)); };
    if ($('#fiche', r)) $('#fiche', r).onclick = function () { ficheClient(k.id); };
    $('#modifier', r).onclick = function () { brouillonDepuis(c); fermerModales(); aller('commande'); };
    if ($('#pas-livree', r)) $('#pas-livree', r).onclick = function () { c.livree = false; poser('commandes', c); fermerModales(); dessiner(); };
    $('#suppr', r).onclick = async function () {
      if (!(await demander('Supprimer cette commande' + (pai.length ? ' et les paiements qui y sont liés' : '') + ' ?', 'Supprimer'))) return;
      pai.forEach(function (p) { retirer('paiements', p.id); }); retirer('commandes', c.id); fermerModales(); dessiner(); toast('Commande supprimée.');
    };
  }
  /* livrée : on demande tout de suite si le client a payé (un toucher) */
  function livrer(c) {
    var sit = M.situation(D()), s = sit.cmd[c.id] || { reste: M.total(c) }, k = client(c.client);
    c.livree = true; poser('commandes', c);
    if (s.reste <= 0) { okPlein('Livrée', 'bleu', 'coche'); dessiner(); return; }
    var r = ouvrirModale('🛵 Livrée ! Le client a-t-il payé ?',
      '<p style="font-weight:700;margin-bottom:6px">' + esc(nomCommande(c)) + ' · <b style="color:var(--orange)">' + F(s.reste) + '</b></p>' +
      '<p class="aide">Touchez le moyen de paiement utilisé :</p><div class="moyens">' + moyensActifs().map(function (m) { return '<button class="moyen-btn" data-m="' + m.id + '" style="--mc:' + m.c + '">' + logoMoyen(m) + '' + esc(m.nom) + '</button>'; }).join('') + '</div>' +
      '<div class="rang-btn" style="flex-direction:column">' + (k ? '<button class="btn orange geant" id="credit">' + e('📒') + ' Non, il paiera plus tard (crédit)</button>' : '') + '<button class="btn sec" id="plus-tard">Je verrai plus tard</button></div>');
    $$('[data-m]', r).forEach(function (b) { b.onclick = function () { payerCommande(c, s.reste, b.dataset.m); fermerModale(); okPlein('Livrée et payée', 'vert', 'argent'); }; });
    if ($('#credit', r)) $('#credit', r).onclick = function () { c.mode = 'credit'; poser('commandes', c); fermerModale(); okPlein('Noté en crédit', 'orange', 'credit'); };
    $('#plus-tard', r).onclick = function () { fermerModale(); };
  }
  function payerCommande(c, montant, moyen) { poser('paiements', { id: uid(), date: auj(), client: c.client || '', commande: c.id, montant: montant, moyen: moyen, cree: Date.now() }); }

  /* ---------- encaisser (commande ou crédit d'un client) */
  function formEncaisser(o) {
    var mo = moyensActifs(), choisi = mo[0].id;
    var r = ouvrirModale('💵 Encaisser', '<form class="formulaire">' + (o.titre ? '<p style="font-weight:800">' + esc(o.titre) + '</p>' : '') +
      champ('Montant reçu (F CFA)', champMontant('montant', o.montant)) +
      '<div class="champ"><span>Moyen de paiement</span><div class="moyens" style="margin-top:0">' + mo.map(function (m) { return '<button type="button" class="moyen-btn' + (m.id === choisi ? ' on' : '') + '" data-m="' + m.id + '" style="--mc:' + m.c + '">' + logoMoyen(m) + '' + esc(m.nom) + '</button>'; }).join('') + '</div></div>' +
      champ('Date', '<input name="date" type="date" value="' + auj() + '" max="' + auj() + '">') +
      '<p class="erreur"></p><button class="btn plein vert geant" type="submit">' + e('✅') + ' Enregistrer</button></form>');
    formaterMontants(r);
    $$('[data-m]', r).forEach(function (b) { b.onclick = function () { choisi = b.dataset.m; $$('[data-m]', r).forEach(function (x) { x.classList.toggle('on', x === b); }); Sons.jouer('coche'); }; });
    var f = $('form', r);
    f.onsubmit = function (ev) {
      ev.preventDefault(); var m = M.lireMontant(f.montant.value);
      if (!m) { $('.erreur', r).textContent = 'Indiquez le montant reçu.'; return; }
      poser('paiements', { id: uid(), date: f.date.value || auj(), client: o.client || '', commande: o.commande || '', montant: m, moyen: choisi, cree: Date.now() });
      fermerModales(); dessiner(); okPlein(F(m) + ' reçus', 'vert', 'argent');
    };
  }

  /* ================================================================== NOUVELLE COMMANDE */
  function nouveauBrouillon(jour) { B = { client: null, passage: '', lignes: {}, ordre: [], date: jour && jour >= auj() ? jour : auj(), heure: '', lieu: '', mode: 'paye', montant: '', moyen: moyensActifs()[0].id, note: '', tous: false }; ecrireL('brouillon', B); }
  function brouillonDepuis(c) {
    var L = {}, ordre = []; (c.lignes || []).forEach(function (l) { L[l.plat] = { q: l.q, prix: l.prix }; ordre.push(l.plat); });
    B = { id: c.id, client: c.client || '', passage: c.passage || '', lignes: L, ordre: ordre, date: c.date, heure: c.heure || '', lieu: c.lieu || '', mode: c.mode || 'paye', montant: '', moyen: moyensActifs()[0].id, note: c.note || '', tous: false, livree: !!c.livree, cree: c.cree };
    ecrireL('brouillon', B);
  }
  function totalB() { return Object.keys(B.lignes).reduce(function (s, k) { return s + B.lignes[k].q * B.lignes[k].prix; }, 0); }
  function vueCommande(v) {
    if (!B) nouveauBrouillon();
    var a = auj(), d = D(), menu = doc('menus', B.date), k = client(B.client);
    /* clients rangés par fréquence sur 30 jours */
    var freq = {}; d.commandes.forEach(function (c) { if (c.client && c.date >= M.ajouter(a, -30)) freq[c.client] = (freq[c.client] || 0) + 1; });
    var cls = d.clients.slice().sort(function (x, y) { return (freq[y.id] || 0) - (freq[x.id] || 0) || (x.nom < y.nom ? -1 : 1); });
    var visibles = B.voirClients ? cls : cls.slice(0, 7);
    if (k && visibles.indexOf(k) < 0) visibles.unshift(k);
    var platsMenu = menu ? menu.plats.map(function (p) { var pl = doc('plats', p.plat); return pl ? { id: pl.id, nom: pl.nom, ic: pl.ic, prix: p.prix } : null; }).filter(Boolean) : [];
    var autres = platsActifs().filter(function (p) { return !platsMenu.some(function (x) { return x.id === p.id; }); }).map(function (p) { return { id: p.id, nom: p.nom, ic: p.ic, prix: p.prix }; });
    var affiches = platsMenu.length && !B.tous ? platsMenu : platsMenu.concat(autres);
    Object.keys(B.lignes).forEach(function (id) { if (!affiches.some(function (p) { return p.id === id; })) { var pl = doc('plats', id); if (pl) affiches.push({ id: id, nom: pl.nom, ic: pl.ic, prix: B.lignes[id].prix }); } });
    var tot = totalB(), passage = B.client === '';
    var html = '<div class="bonjour"><h1>' + (B.id ? '✏️ Modifier la commande' : '➕ Nouvelle commande') + '</h1></div>';
    /* 1. client */
    html += '<div class="etape"><span class="num">1</span>Pour qui ?</div><div class="clients-choix">' +
      '<button class="client-btn' + (passage ? ' on' : '') + '" data-c="">' + avatar(null) + '<b>Client de passage</b></button>' +
      visibles.map(function (x) { return '<button class="client-btn' + (B.client === x.id ? ' on' : '') + '" data-c="' + x.id + '">' + avatar(x) + '<b>' + esc(x.nom) + '</b></button>'; }).join('') +
      '<button class="client-btn" id="nouveau-client"><span class="av" style="--ac:var(--bleu)">' + e('➕') + '</span><b>Nouveau client</b></button></div>' +
      (cls.length > 7 ? '<button class="lien" id="voir-clients">' + (B.voirClients ? 'Moins de clients ‹' : 'Voir tous les clients (' + cls.length + ') ›') + '</button>' : '') +
      (passage ? '<div class="formulaire" style="margin-top:10px">' + champ('Nom (facultatif)', '<input id="passage" value="' + esc(B.passage) + '" placeholder="Ex. : la dame du marché">') + '</div>' : '');
    /* 2. plats */
    html += '<div class="etape"><span class="num">2</span>Quels plats ?</div>' + (!platsMenu.length ? '<p class="aide">Pas de menu pour ce jour : tous vos plats sont proposés.</p>' : '') +
      '<div class="plats-choix">' + affiches.map(function (p) {
        var l = B.lignes[p.id], q = l ? l.q : 0;
        return '<div class="plat-tuile' + (q ? ' on' : '') + '" data-p="' + p.id + '" data-prix="' + p.prix + '">' + (q ? '<span class="q">' + q + '</span>' : '') + e(p.ic) + '<b>' + esc(p.nom) + '</b><span class="prix">' + F(p.prix) + '</span><div class="qte"><button type="button" data-moins="' + p.id + '" aria-label="Un de moins">−</button><b>' + q + '</b><button type="button" data-plus="' + p.id + '" aria-label="Un de plus">+</button></div></div>';
      }).join('') + '</div>' +
      (platsMenu.length && autres.length ? '<button class="lien" id="tous-plats">' + (B.tous ? 'Seulement le menu du jour ‹' : 'Autres plats (' + autres.length + ') ›') + '</button>' : '');
    /* 3. livraison */
    var dem = M.ajouter(a, 1), autreJour = B.date !== a && B.date !== dem;
    html += '<div class="etape"><span class="num">3</span>Livraison</div><div class="puces">' +
      [[a, 'Aujourd’hui', '📍'], [dem, 'Demain', '📅']].map(function (x) { return '<button class="puce' + (B.date === x[0] ? ' on' : '') + '" data-date="' + x[0] + '">' + e(x[2]) + x[1] + '</button>'; }).join('') +
      '<button class="puce' + (autreJour ? ' on' : '') + '" id="autre-jour">' + e('🗓️') + 'Autre jour</button></div>' +
      (autreJour ? '<div class="formulaire" style="margin-top:10px">' + champ('Jour de livraison', '<input type="date" id="date-livr" value="' + B.date + '">') + '</div>' : '') +
      '<div class="champ" style="margin-top:12px"><span>Heure</span></div><div class="puces">' + ['11:30', '12:00', '12:30', '13:00', '13:30', '19:00'].map(function (h) { return '<button class="puce' + (B.heure === h ? ' on' : '') + '" data-h="' + h + '">' + h.replace(':', 'h') + '</button>'; }).join('') + '</div>' +
      '<div class="formulaire" style="margin-top:12px">' + champ('Lieu de livraison', '<input id="lieu" value="' + esc(B.lieu || (k ? k.lieu || '' : '')) + '" placeholder="' + (passage ? 'Sur place' : 'Bureau, quartier…') + '">') + champ('Note (facultatif)', '<input id="note" value="' + esc(B.note) + '" placeholder="Ex. : sans piment">') + '</div>';
    /* 4. paiement */
    var dejaPaye = B.id ? tous('paiements').filter(function (p) { return p.commande === B.id; }).reduce(function (s, p) { return s + (+p.montant || 0); }, 0) : 0;
    html += '<div class="etape"><span class="num">4</span>Paiement</div>';
    if (B.id) html += '<p class="aide">' + (dejaPaye ? 'Déjà reçu pour cette commande : <b>' + F(dejaPaye) + '</b>. ' : '') + 'Pour un nouvel encaissement, utilisez « Encaisser » sur la commande.</p>';
    else {
      html += '<div class="payer-choix">' +
        '<button class="payer-btn c-vert' + (B.mode === 'paye' ? ' on' : '') + '" data-mode="paye">' + e('✅') + 'Payé</button>' +
        '<button class="payer-btn c-bleu' + (B.mode === 'livraison' ? ' on' : '') + '" data-mode="livraison">' + e('🛵') + 'À la livraison</button>' +
        '<button class="payer-btn c-orange' + (B.mode === 'credit' ? ' on' : '') + '" data-mode="credit">' + e('📒') + 'À crédit</button></div>';
      if (B.mode === 'paye') html += '<div class="moyens">' + moyensActifs().map(function (m) { return '<button class="moyen-btn' + (B.moyen === m.id ? ' on' : '') + '" data-m="' + m.id + '" style="--mc:' + m.c + '">' + logoMoyen(m) + '' + esc(m.nom) + '</button>'; }).join('') + '</div>' +
        '<div class="formulaire" style="margin-top:12px">' + champ('Montant reçu (s’il a donné moins, le reste passe en crédit)', champMontant('montant', B.montant || tot)) + '</div>';
      if (B.mode === 'credit' && passage) html += '<p class="erreur" style="margin-top:10px">Pour un crédit, choisissez le client ou créez-le (étape 1).</p>';
      if (B.mode === 'livraison') html += '<p class="aide">Quand vous marquerez la commande « livrée », l’application vous demandera s’il a payé.</p>';
    }
    /* total + enregistrer */
    html += '<div class="rang-btn" style="margin-top:22px"><button class="btn sec" id="effacer">' + e('🧽') + (B.id ? ' Abandonner les changements' : ' Tout effacer') + '</button></div>' +
      '<div class="total-barre"><div class="total-ligne"><span>Total</span><b>' + F(tot) + '</b></div><button class="btn bleu" id="enregistrer">' + e('✅') + ' Enregistrer</button></div>';
    v.innerHTML = html;
    function garder() { ecrireL('brouillon', B); }
    function relire() { var p = $('#passage', v), l = $('#lieu', v), n = $('#note', v), m = $('input[name=montant]', v); if (p) B.passage = p.value; if (l) B.lieu = l.value; if (n) B.note = n.value; if (m && m.dataset.touche) B.montant = M.lireMontant(m.value); garder(); }
    function maj() { relire(); var y = window.scrollY; dessiner(); window.scrollTo(0, y); }
    $$('[data-c]', v).forEach(function (b) { b.onclick = function () { relire(); var avant = B.client; B.client = b.dataset.c; if (avant !== B.client) { var kk = client(B.client); B.lieu = kk ? kk.lieu || '' : ''; if (B.client === '' && B.mode === 'credit') B.mode = 'paye'; } Sons.jouer('coche'); maj(); }; });
    if ($('#voir-clients', v)) $('#voir-clients', v).onclick = function () { B.voirClients = !B.voirClients; maj(); };
    $('#nouveau-client', v).onclick = function () { relire(); formClient(null, function (kk) { B.client = kk.id; B.lieu = kk.lieu || ''; garder(); }); };
    $$('.plat-tuile', v).forEach(function (t) {
      t.onclick = function (ev) {
        var id = t.dataset.p, prix = +t.dataset.prix, l = B.lignes[id];
        if (ev.target.closest('[data-moins]')) { if (l) { l.q--; if (l.q <= 0) { delete B.lignes[id]; B.ordre = B.ordre.filter(function (x) { return x !== id; }); } } Sons.jouer('onglet', 0); }
        else if (ev.target.closest('[data-plus]') || !l) { if (!l) { B.lignes[id] = { q: 1, prix: prix }; B.ordre.push(id); } else l.q++; Sons.jouer('onglet', 3); }
        else return;
        B.montant = ''; maj();
      };
    });
    if ($('#tous-plats', v)) $('#tous-plats', v).onclick = function () { B.tous = !B.tous; maj(); };
    $$('[data-date]', v).forEach(function (b) { b.onclick = function () { B.date = b.dataset.date; Sons.jouer('coche'); maj(); }; });
    $('#autre-jour', v).onclick = function () { if (B.date === a || B.date === dem) B.date = M.ajouter(a, 2); maj(); };
    if ($('#date-livr', v)) $('#date-livr', v).onchange = function () { if (this.value) { B.date = this.value; maj(); } };
    $$('[data-h]', v).forEach(function (b) { b.onclick = function () { B.heure = B.heure === b.dataset.h ? '' : b.dataset.h; Sons.jouer('coche'); maj(); }; });
    $$('[data-mode]', v).forEach(function (b) { b.onclick = function () { B.mode = b.dataset.mode; Sons.jouer('coche'); maj(); }; });
    $$('[data-m]', v).forEach(function (b) { b.onclick = function () { B.moyen = b.dataset.m; Sons.jouer('coche'); maj(); }; });
    $$('input', v).forEach(function (i) { i.addEventListener('change', relire); });
    formaterMontants(v);
    if ($('input[name=montant]', v)) $('input[name=montant]', v).addEventListener('input', function () { this.dataset.touche = '1'; });
    $('#effacer', v).onclick = async function () { if (await demander(B.id ? 'Abandonner les changements ?' : 'Effacer cette commande en cours ?', B.id ? 'Abandonner' : 'Effacer')) { nouveauBrouillon(); dessiner(); window.scrollTo(0, 0); } };
    $('#enregistrer', v).onclick = function () { relire(); enregistrerCommande(); };
  }
  function enregistrerCommande() {
    var tot = totalB();
    if (B.client === null) { toast('Étape 1 : choisissez pour qui est la commande.'); window.scrollTo(0, 0); return; }
    if (!tot) { toast('Étape 2 : touchez au moins un plat.'); return; }
    if (!B.id && B.mode === 'credit' && !B.client) { toast('Pour un crédit, choisissez le client ou créez-le.'); return; }
    var lignes = B.ordre.filter(function (id) { return B.lignes[id]; }).map(function (id) { var pl = doc('plats', id) || { nom: 'Plat', ic: '🍛' }; return { plat: id, nom: pl.nom, ic: pl.ic, prix: B.lignes[id].prix, q: B.lignes[id].q }; });
    var c = B.id ? Object.assign({}, doc('commandes', B.id) || {}) : { id: uid(), cree: Date.now(), livree: false };
    Object.assign(c, { date: B.date, heure: B.heure, client: B.client || '', passage: B.client ? '' : (B.passage || '').trim(), lignes: lignes, lieu: (B.lieu || '').trim(), note: (B.note || '').trim() });
    if (!B.id) c.mode = B.mode;
    poser('commandes', c);
    var recu = 0;
    if (!B.id && B.mode === 'paye') { recu = Math.min(B.montant === '' || B.montant == null ? tot : +B.montant, tot); if (recu > 0) payerCommande(c, recu, B.moyen); if (recu < tot) { c.mode = B.client ? 'credit' : 'livraison'; poser('commandes', c); } }
    var modif = !!B.id, jour = c.date;
    nouveauBrouillon();
    NAV.jour = jour === auj() ? '' : jour; NAV.vue = 'jour'; ecrireL('nav', NAV);
    dessiner(); window.scrollTo(0, 0);
    okPlein(modif ? 'Commande modifiée' : 'Commande notée' + (recu ? ' et payée' : ''), recu ? 'vert' : 'bleu', recu ? 'argent' : 'enregistre');
  }

  /* ================================================================== CRÉDITS */
  function vueCredits(v) {
    var d = D(), a = auj(), L = M.credits(d), tot = L.reduce(function (s, x) { return s + x.reste; }, 0);
    var html = '<div class="grand-total c-orange"><span>' + e('📒') + ' On vous doit en tout</span><b>' + F(tot) + '</b><small>' + (L.length ? L.length + ' client' + (L.length > 1 ? 's' : '') : 'Personne ne vous doit rien. Bravo !') + '</small></div>';
    html += L.map(function (x) {
      var vieux = x.depuis && M.ecart(x.depuis, a) >= 14;
      return '<button class="ligne-cli" data-cli="' + x.client.id + '">' + avatar(x.client) + '<div class="txt"><b>' + esc(x.client.nom) + '</b><span' + (vieux ? ' class="vieux"' : '') + '>' + (vieux ? '⏰ ' : '') + esc(M.depuis(x.depuis || a, a)) + '</span></div><span class="montant">' + F(x.reste) + '</span></button>';
    }).join('');
    var sans = d.clients.filter(function (k) { return !L.some(function (x) { return x.client.id === k.id; }); }).sort(function (x, y) { return x.nom < y.nom ? -1 : 1; });
    if (sans.length) html += '<h2 class="titre">' + e('✅') + 'Clients à jour<small>' + sans.length + '</small></h2><section class="carte">' + sans.map(function (k) { return '<button class="ligne-reg" data-cli="' + k.id + '">' + avatar(k, 'petit') + '<div class="txt"><b>' + esc(k.nom) + '</b><span>' + (k.type === 'entreprise' ? 'Entreprise' : 'Particulier') + '</span></div><span class="fl">›</span></button>'; }).join('') + '</section>';
    html += '<button class="btn plein sec geant" id="nouveau-client">' + e('➕') + ' Nouveau client</button>' +
      '<p class="aide" style="text-align:center">Un client qui vous devait déjà de l’argent dans le cahier ? Ouvrez sa fiche › Modifier › « Ce qu’il vous doit déjà ».</p>';
    v.innerHTML = html; brancher(v);
    $('#nouveau-client', v).onclick = function () { formClient(null, function (k) { ficheClient(k.id); }); };
  }
  function ficheClient(id) {
    var k = client(id); if (!k) return;
    var d = D(), sit = M.situation(d), s = sit.cli[id], a = auj();
    var ev = [];
    d.commandes.filter(function (c) { return c.client === id; }).forEach(function (c) { var x = sit.cmd[c.id]; ev.push({ date: c.date, t: c.cree || 0, html: '<button class="histo-l" style="width:100%;text-align:left" data-cmd="' + c.id + '">' + e('🧾') + '<div class="txt"><b>Commande · ' + esc(M.dateCourte(c.date)) + '</b><span>' + esc(resumePlats(c)) + (x.reste > 0 ? ' · reste ' + F(x.reste) : ' · payée') + '</span></div><span class="m ' + (x.reste > 0 ? 'moins' : '') + '">' + F(x.total) + '</span></button>' }); });
    d.paiements.filter(function (p) { return p.client === id; }).forEach(function (p) { ev.push({ date: p.date, t: p.cree || 1, html: '<div class="histo-l">' + logoMoyen(p.moyen, 'h') + '<div class="txt"><b>Paiement · ' + esc(M.dateCourte(p.date)) + '</b><span>' + esc(M.moyen(p.moyen).nom) + (p.commande ? ' · à la livraison' : '') + '</span></div><span class="m plus">+' + F(p.montant) + '</span></div>' }); });
    if (k.depart) ev.push({ date: k.departDate || '0000', t: 0, html: '<div class="histo-l">' + e('📓') + '<div class="txt"><b>Repris du cahier</b><span>' + esc(k.departDate ? M.dateCourte(k.departDate) : '') + '</span></div><span class="m moins">' + F(k.depart) + '</span></div>' });
    ev.sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : y.t - x.t; });
    var r = ouvrirModale(avatar(k, 'petit') + ' ' + esc(k.nom),
      (s.reste > 0 ? '<div class="grand-total c-orange" style="margin-top:4px"><span>Vous doit</span><b>' + F(s.reste) + '</b><small>' + esc(M.depuis(s.depuis || a, a)) + '</small></div>' : '<div class="grand-total c-vert" style="margin-top:4px"><span>' + e('✅') + ' À jour</span><b>0 F</b><small>Ne vous doit rien</small></div>') +
      '<div class="rang-btn">' + (s.reste > 0 ? '<button class="btn vert geant" id="encaisser">' + e('💵') + ' Encaisser</button>' : '') + (k.tel && s.reste > 0 ? '<button class="btn wa geant" id="rappel">' + e('💬') + ' Rappel WhatsApp</button>' : '') + '</div>' +
      '<div class="rang-btn">' + (k.tel ? '<a class="btn sec" href="tel:+' + esc(M.telInter(k.tel)) + '">' + e('📞') + ' Appeler</a>' : '') + '<button class="btn sec" id="cmd">' + e('➕') + ' Commande</button><button class="btn sec" id="modif">' + e('✏️') + ' Modifier</button></div>' +
      '<section class="carte"><div class="carte-tete">' + e(k.type === 'entreprise' ? '🏢' : '👤') + (k.type === 'entreprise' ? 'Entreprise' : 'Particulier') + '</div><div class="histo">' +
      (k.tel ? '<div class="histo-l">' + e('📱') + '<div class="txt"><b>' + esc(k.tel) + '</b><span>Téléphone</span></div></div>' : '') +
      (k.lieu ? '<div class="histo-l">' + e('📍') + '<div class="txt"><b>' + esc(k.lieu) + '</b><span>Lieu de livraison</span></div></div>' : '') + '</div></section>' +
      '<h2 class="titre">' + e('🗂️') + 'Historique</h2><section class="carte"><div class="histo">' + (ev.length ? ev.slice(0, 40).map(function (x) { return x.html; }).join('') : '<p class="vide">Rien pour l’instant.</p>') + '</div></section>', { plein: true });
    brancher(r);
    if ($('#encaisser', r)) $('#encaisser', r).onclick = function () { formEncaisser({ client: id, montant: s.reste, titre: k.nom }); };
    if ($('#rappel', r)) $('#rappel', r).onclick = function () { ouvrirWhatsApp(k.tel, messageRappel(k, s)); };
    $('#cmd', r).onclick = function () { nouveauBrouillon(); B.client = id; B.lieu = k.lieu || ''; ecrireL('brouillon', B); aller('commande'); };
    $('#modif', r).onclick = function () { formClient(k, function () { fermerModales(); ficheClient(id); }); };
  }
  function formClient(k, apres) {
    var neuf = !k; k = k || { id: uid(), type: 'particulier', couleur: tous('clients').length, cree: Date.now(), depart: 0 };
    var type = k.type;
    var r = ouvrirModale(neuf ? '➕ Nouveau client' : '✏️ ' + esc(k.nom), '<form class="formulaire">' +
      champ('Nom', '<input name="nom" required value="' + esc(k.nom || '') + '" placeholder="Ex. : Cabinet Konan, Mme Koné…">') +
      '<div class="champ"><span>C’est…</span><div class="payer-choix" style="grid-template-columns:repeat(2,minmax(0,1fr))"><button type="button" class="payer-btn c-bleu' + (type === 'entreprise' ? ' on' : '') + '" data-t="entreprise">' + e('🏢') + 'Une entreprise</button><button type="button" class="payer-btn c-bleu' + (type !== 'entreprise' ? ' on' : '') + '" data-t="particulier">' + e('👤') + 'Un particulier</button></div></div>' +
      champ('Téléphone (pour WhatsApp et les appels)', '<input name="tel" type="tel" inputmode="tel" value="' + esc(k.tel || '') + '" placeholder="07 00 00 00 00">') +
      champ('Lieu de livraison habituel', '<input name="lieu" value="' + esc(k.lieu || '') + '" placeholder="Bureau, quartier…">') +
      '<section class="carte c-orange" style="background:var(--cf);margin:0"><div class="carte-tete" style="color:var(--orange)">' + e('📓') + 'Repris du cahier</div><div class="formulaire">' +
      champ('Ce qu’il vous doit déjà (F CFA)', champMontant('depart', k.depart)) + champ('Depuis le', '<input name="departDate" type="date" value="' + esc(k.departDate || auj()) + '" max="' + auj() + '">') + '</div></section>' +
      '<p class="erreur"></p><button class="btn plein bleu geant" type="submit">' + e('✅') + ' Enregistrer</button>' + (!neuf ? '<div class="rang-btn"><button type="button" class="btn sec danger" id="suppr">' + e('🗑️') + ' Supprimer ce client</button></div>' : '') + '</form>');
    formaterMontants(r);
    $$('[data-t]', r).forEach(function (b) { b.onclick = function () { type = b.dataset.t; $$('[data-t]', r).forEach(function (x) { x.classList.toggle('on', x === b); }); Sons.jouer('coche'); }; });
    var f = $('form', r);
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var nom = f.nom.value.trim(); if (!nom) { $('.erreur', r).textContent = 'Indiquez le nom du client.'; return; }
      Object.assign(k, { nom: nom, type: type, tel: f.tel.value.trim(), lieu: f.lieu.value.trim(), depart: M.lireMontant(f.depart.value), departDate: f.departDate.value || auj() });
      poser('clients', k); fermerModale(); okPlein(neuf ? 'Client ajouté' : 'Client modifié', 'bleu');
      if (apres) apres(k);
      if (!PILE.length) dessiner();
    };
    if ($('#suppr', r)) $('#suppr', r).onclick = async function () {
      var n = tous('commandes').filter(function (c) { return c.client === k.id; }).length;
      if (n) return toast('Ce client a ' + n + ' commande(s) : il ne peut pas être supprimé.');
      if (await demander('Supprimer ' + k.nom + ' ?', 'Supprimer')) { retirer('clients', k.id); fermerModales(); dessiner(); }
    };
  }
  /* messages WhatsApp (préparés, la patronne relit puis envoie elle-même) */
  function signature() { var a = activite(); return [a.prenom, a.nom].filter(Boolean).join(' – '); }
  function politesse(k) { return k.type === 'entreprise' ? 'Bonjour' : 'Bonjour ' + k.nom; }
  function messageRappel(k, s) {
    var a = auj(), plusRecent = s.commandes.filter(function (c) { return (M.situation(D()).cmd[c.id] || {}).reste > 0; }).map(function (c) { return c.date; }).sort().pop();
    var periode = s.depuis && plusRecent && plusRecent !== s.depuis ? ' du ' + M.dateCourte(s.depuis) + ' au ' + M.dateCourte(plusRecent) : s.depuis ? ' du ' + M.dateCourte(s.depuis) : '';
    return politesse(k) + ', j’espère que vous allez bien.\nPetit rappel amical : il reste ' + F(s.reste).replace(/ /g, ' ') + ' à régler pour les repas' + periode + '.\nVous pouvez payer en espèces à la livraison ou par Mobile Money.\nMerci beaucoup et bonne journée !\n' + signature();
  }
  function messageCommande(c, s) {
    return 'Bonjour, votre commande du ' + M.dateLongue(c.date) + ' :\n' + c.lignes.map(function (l) { return '• ' + l.q + ' × ' + l.nom + ' (' + F(l.prix * l.q).replace(/ /g, ' ') + ')'; }).join('\n') + '\nTotal : ' + F(s.total).replace(/ /g, ' ') + (s.reste <= 0 ? ' — payé, merci !' : s.paye > 0 ? ' — reste à payer : ' + F(s.reste).replace(/ /g, ' ') : '') + '\nMerci et bon appétit !\n' + signature();
  }
  function ouvrirWhatsApp(tel, texte) { window.open('https://wa.me/' + M.telInter(tel) + '?text=' + encodeURIComponent(texte), '_blank'); }

  /* ================================================================== COMPTES */
  function bornes() {
    var a = auj(), p = NAV.periode, k = NAV.decal || 0, deb, fin, nom;
    if (p === 'jour') { deb = fin = M.ajouter(a, k); nom = k === 0 ? 'Aujourd’hui' : M.dateLongue(deb); }
    else if (p === 'semaine') { deb = M.ajouter(M.debutSemaine(a), 7 * k); fin = M.ajouter(deb, 6); nom = k === 0 ? 'Cette semaine' : k === -1 ? 'La semaine dernière' : 'Semaine du ' + M.dateCourte(deb); }
    else { var d0 = new Date(+a.slice(0, 4), +a.slice(5, 7) - 1 + k, 1, 12); deb = M.iso(d0); fin = M.finMois(deb); nom = k === 0 ? 'Ce mois-ci' : M.nomMois(deb).replace(/^./, function (x) { return x.toUpperCase(); }); }
    return { deb: deb, fin: fin, nom: nom, detail: p === 'jour' ? '' : 'du ' + M.dateCourte(deb) + ' au ' + M.dateCourte(fin < a || k ? fin : a) };
  }
  function vueComptes(v) {
    var d = D(), b = bornes(), a = auj(), fin = b.fin > a ? a : b.fin, r = M.periode(d, b.deb, fin);
    var html = '<div class="segments">' + [['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois']].map(function (x) { return '<button data-per="' + x[0] + '" class="' + (NAV.periode === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="jour-nav"><button data-dec="-1" aria-label="Période précédente">‹</button><div class="jour-txt">' + esc(b.nom) + '<small>' + esc(b.detail || M.dateLongue(b.deb)) + '</small></div><button data-dec="1" aria-label="Période suivante"' + (NAV.decal >= 0 ? ' disabled style="opacity:.3"' : '') + '>›</button></div>' +
      '<div class="tuiles">' +
      '<div class="tuile c-bleu">' + e('🧾') + '<span>Ventes</span><b>' + F(r.ventes) + '</b><small>' + r.commandes + ' commandes · ' + r.portions + ' portions</small></div>' +
      '<div class="tuile c-vert">' + e('💵') + '<span>Argent reçu</span><b>' + F(r.recu) + '</b><small>espèces et Mobile Money</small></div>' +
      '<div class="tuile c-violet">' + e('🛒') + '<span>Dépenses</span><b>' + F(r.depenses) + '</b><small>marché, gaz, emballages…</small></div>' +
      '<div class="tuile ' + (r.reste >= 0 ? 'c-vert' : 'c-orange') + '">' + e(r.reste >= 0 ? '💚' : '🧡') + '<span>Il vous reste</span><b>' + F(r.reste) + '</b><small>ventes moins dépenses</small></div></div>' +
      '<button class="btn plein violet geant" id="nouvelle-dep">' + e('➖') + ' Noter une dépense</button>';
    /* graphique */
    if (NAV.periode !== 'jour') {
      var cols = [];
      if (NAV.periode === 'semaine') for (var i = 0; i < 7; i++) { var j = M.ajouter(b.deb, i), x = r.jours[j] || { ventes: 0, depenses: 0 }; cols.push({ l: M.JOURS[M.jourSemaine(j)].slice(0, 3), v: x.ventes, dp: x.depenses }); }
      else { var s0 = M.debutSemaine(b.deb); for (var w = 0; w < 6; w++) { var dw = M.ajouter(s0, 7 * w); if (dw > b.fin) break; var tv = 0, td = 0; for (var q = 0; q < 7; q++) { var jq = M.ajouter(dw, q); if (jq < b.deb || jq > b.fin) continue; var y = r.jours[jq]; if (y) { tv += y.ventes; td += y.depenses; } } cols.push({ l: 'S' + (w + 1), v: tv, dp: td }); } }
      var mx = Math.max.apply(null, cols.map(function (c) { return Math.max(c.v, c.dp); }).concat([1]));
      html += '<section class="carte"><div class="carte-tete">' + e('📊') + 'Ventes et dépenses</div><div class="barres">' + cols.map(function (c) { return '<div class="col"><div class="paire"><i style="height:' + Math.round(c.v * 100 / mx) + '%"></i><i class="dep" style="height:' + Math.round(c.dp * 100 / mx) + '%"></i></div><small>' + esc(c.l) + '</small></div>'; }).join('') + '</div>' +
        '<div class="legende"><span><i style="background:var(--bleu)"></i>Ventes</span><span><i style="background:var(--violet)"></i>Dépenses</span></div></section>';
    }
    /* argent reçu par moyen */
    var mo = Object.keys(r.parMoyen).sort(function (x, y) { return r.parMoyen[y] - r.parMoyen[x]; });
    if (mo.length) html += '<section class="carte c-vert"><div class="carte-tete">' + e('💵') + 'Argent reçu</div>' + mo.map(function (k) { var m = M.moyen(k); return '<div class="rang" style="--c:' + m.c + '">' + logoMoyen(m, 'r') + '<div class="txt"><b>' + esc(m.nom) + '</b><div class="barre-fine"><i style="width:' + Math.round(r.parMoyen[k] * 100 / r.recu) + '%"></i></div></div><span class="m">' + F(r.parMoyen[k]) + '</span></div>'; }).join('') + '</section>';
    /* dépenses par catégorie */
    var cats = Object.keys(r.parCat).sort(function (x, y) { return r.parCat[y] - r.parCat[x]; });
    html += '<section class="carte c-violet"><div class="carte-tete">' + e('🛒') + 'Dépenses<button class="lien" id="liste-dep">Le détail ›</button></div>' + (cats.length ? cats.map(function (k) { var c = M.categorie(k); return '<div class="rang">' + e(c.ic) + '<div class="txt"><b>' + esc(c.nom) + '</b><div class="barre-fine"><i style="width:' + Math.round(r.parCat[k] * 100 / r.depenses) + '%"></i></div></div><span class="m">' + F(r.parCat[k]) + '</span></div>'; }).join('') : '<p class="vide">Aucune dépense notée.</p>') + '</section>';
    /* plats et clients */
    if (r.listePlats.length) { var mp = r.listePlats[0].q; html += '<section class="carte c-bleu"><div class="carte-tete">' + e('🏆') + 'Plats les plus vendus</div>' + r.listePlats.slice(0, 6).map(function (p) { return '<div class="rang">' + e(p.ic) + '<div class="txt"><b>' + esc(p.nom) + '</b><div class="barre-fine"><i style="width:' + Math.round(p.q * 100 / mp) + '%"></i></div></div><span class="m">' + p.q + ' portions</span></div>'; }).join('') + '</section>'; }
    if (r.listeClients.length) { var mc = r.listeClients[0].montant; html += '<section class="carte c-marque"><div class="carte-tete">' + e('⭐') + 'Meilleurs clients</div>' + r.listeClients.slice(0, 5).map(function (x) { var k = client(x.id); if (!k) return ''; return '<button class="rang" style="width:100%;text-align:left" data-cli="' + k.id + '">' + avatar(k, 'petit') + '<div class="txt"><b>' + esc(k.nom) + '</b><div class="barre-fine"><i style="width:' + Math.round(x.montant * 100 / mc) + '%"></i></div></div><span class="m">' + F(x.montant) + '</span></button>'; }).join('') + '</section>'; }
    v.innerHTML = html; brancher(v);
    $$('[data-per]', v).forEach(function (bt) { bt.onclick = function () { NAV.periode = bt.dataset.per; NAV.decal = 0; ecrireL('nav', NAV); Sons.jouer('onglet', 2); dessiner(); }; });
    $$('[data-dec]', v).forEach(function (bt) { bt.onclick = function () { var n = (NAV.decal || 0) + (+bt.dataset.dec); if (n > 0) return; NAV.decal = n; ecrireL('nav', NAV); Sons.jouer('onglet', 1); dessiner(); }; });
    $('#nouvelle-dep', v).onclick = function () { formDepense(null); };
    $('#liste-dep', v).onclick = function () { listeDepenses(b.deb, fin, b.nom); };
  }
  function listeDepenses(deb, fin, nom) {
    var L = tous('depenses').filter(function (x) { return x.date >= deb && x.date <= fin; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.cree || 0) - (a.cree || 0); });
    var r = ouvrirModale('🛒 Dépenses · ' + esc(nom), '<button class="btn plein violet geant" id="nouvelle" style="margin-top:0">' + e('➖') + ' Noter une dépense</button><section class="carte"><div class="histo">' + (L.length ? L.map(function (x) { var c = M.categorie(x.cat); return '<button class="histo-l" style="width:100%;text-align:left" data-dep="' + x.id + '">' + e(c.ic) + '<div class="txt"><b>' + esc(x.note || c.nom) + '</b><span>' + esc(M.dateCourte(x.date) + ' · ' + c.nom + ' · ' + M.moyen(x.moyen).nom) + '</span></div><span class="m" style="color:var(--violet)">' + F(x.montant) + '</span></button>'; }).join('') : '<p class="vide">Aucune dépense.</p>') + '</div></section>', { plein: true });
    $('#nouvelle', r).onclick = function () { formDepense(null); };
    $$('[data-dep]', r).forEach(function (b) { b.onclick = function () { formDepense(doc('depenses', b.dataset.dep)); }; });
  }
  function formDepense(x) {
    var neuf = !x; x = x || { id: uid(), date: auj(), cat: 'marche', montant: 0, moyen: 'especes', note: '', cree: Date.now() };
    var cat = x.cat, moy = x.moyen, mo = moyensActifs();
    if (!mo.some(function (m) { return m.id === moy; })) moy = mo[0].id;
    var r = ouvrirModale(neuf ? '➖ Noter une dépense' : '✏️ Dépense', '<form class="formulaire">' +
      '<div class="champ"><span>Pour quoi ?</span><div class="plats-choix" style="grid-template-columns:repeat(3,minmax(0,1fr))">' + M.CATEGORIES.map(function (c) { return '<button type="button" class="plat-tuile' + (c.id === cat ? ' on' : '') + '" data-cat="' + c.id + '" style="padding:10px 4px;' + (c.id === cat ? 'border-color:var(--violet);background:var(--violet-fond)' : '') + '">' + e(c.ic) + '<b style="font-size:.74rem;overflow-wrap:normal;hyphens:auto;-webkit-hyphens:auto">' + esc(c.nom) + '</b></button>'; }).join('') + '</div></div>' +
      champ('Montant (F CFA)', champMontant('montant', x.montant)) +
      '<div class="champ"><span>Payé avec</span><div class="moyens" style="margin-top:0">' + mo.map(function (m) { return '<button type="button" class="moyen-btn' + (m.id === moy ? ' on' : '') + '" data-m="' + m.id + '" style="--mc:' + m.c + '">' + logoMoyen(m) + '' + esc(m.nom) + '</button>'; }).join('') + '</div></div>' +
      champ('Détail (facultatif)', '<input name="note" value="' + esc(x.note || '') + '" placeholder="Ex. : poissons, tomates, oignons">') +
      champ('Date', '<input name="date" type="date" value="' + esc(x.date) + '" max="' + auj() + '">') +
      '<p class="erreur"></p><button class="btn plein violet geant" type="submit">' + e('✅') + ' Enregistrer</button>' + (!neuf ? '<div class="rang-btn"><button type="button" class="btn sec danger" id="suppr">' + e('🗑️') + ' Supprimer</button></div>' : '') + '</form>');
    formaterMontants(r);
    $$('[data-cat]', r).forEach(function (b) { b.onclick = function () { cat = b.dataset.cat; $$('[data-cat]', r).forEach(function (y) { var on = y === b; y.classList.toggle('on', on); y.style.borderColor = on ? 'var(--violet)' : ''; y.style.background = on ? 'var(--violet-fond)' : ''; }); Sons.jouer('coche'); }; });
    $$('[data-m]', r).forEach(function (b) { b.onclick = function () { moy = b.dataset.m; $$('[data-m]', r).forEach(function (y) { y.classList.toggle('on', y === b); }); Sons.jouer('coche'); }; });
    var f = $('form', r);
    f.onsubmit = function (ev) {
      ev.preventDefault(); var m = M.lireMontant(f.montant.value);
      if (!m) { $('.erreur', r).textContent = 'Indiquez le montant.'; return; }
      Object.assign(x, { cat: cat, montant: m, moyen: moy, note: f.note.value.trim(), date: f.date.value || auj() });
      poser('depenses', x); fermerModales(); dessiner(); okPlein('Dépense notée', 'violet', 'depense');
    };
    if ($('#suppr', r)) $('#suppr', r).onclick = async function () { if (await demander('Supprimer cette dépense ?', 'Supprimer')) { retirer('depenses', x.id); fermerModales(); dessiner(); } };
  }

  /* ================================================================== RÉGLAGES */
  function appliquerApparence() {
    var h = document.documentElement;
    h.dataset.theme = R.theme === 'sombre' ? 'sombre' : 'clair';
    if (R.taille === 'normal') delete h.dataset.taille; else h.dataset.taille = R.taille;
    Sons.regler(R.sons);
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = '#075234';
  }
  function reglages() {
    var a = activite(), actifs = moyensActifs().map(function (m) { return m.id; });
    var r = ouvrirModale('⚙️ Réglages',
      '<section class="carte"><div class="carte-tete">' + e('🏠') + 'Mon activité</div><form class="formulaire" id="f-act">' + champ('Nom de l’activité', '<input name="nom" value="' + esc(a.nom || '') + '">') + '<div class="deux">' + champ('Votre prénom', '<input name="prenom" value="' + esc(a.prenom || '') + '">') + champ('Téléphone', '<input name="tel" type="tel" value="' + esc(a.tel || '') + '">') + '</div><button class="btn plein" type="submit">' + e('✅') + ' Enregistrer</button></form></section>' +
      '<section class="carte"><button class="ligne-reg" id="r-plats">' + e('🍲') + '<div class="txt"><b>Mes plats et leurs prix</b><span>' + platsActifs().length + ' plats</span></div><span class="fl">›</span></button>' +
      '<button class="ligne-reg" id="r-clients">' + e('👥') + '<div class="txt"><b>Mes clients</b><span>' + tous('clients').length + ' clients</span></div><span class="fl">›</span></button></section>' +
      '<section class="carte"><div class="carte-tete">' + e('🔠') + 'Taille du texte</div><div class="puces">' + [['normal', 'Normale'], ['grand', 'Grande'], ['tresgrand', 'Très grande']].map(function (x) { return '<button class="puce' + (R.taille === x[0] ? ' on' : '') + '" data-taille="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="carte-tete" style="margin-top:16px">' + e('🌓') + 'Affichage</div><div class="puces">' + [['clair', '☀️ Clair'], ['sombre', '🌙 Sombre']].map(function (x) { return '<button class="puce' + (R.theme === x[0] ? ' on' : '') + '" data-theme="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<button class="ligne-reg" id="r-sons" style="margin-top:8px">' + e('🔔') + '<div class="txt"><b>Sons</b><span>Petite musique à chaque enregistrement</span></div><span class="interrupteur' + (R.sons ? ' on' : '') + '"></span></button></section>' +
      '<section class="carte"><div class="carte-tete">' + e('💳') + 'Moyens de paiement acceptés</div>' + M.MOYENS.map(function (m) { return '<button class="ligne-reg" data-moy="' + m.id + '">' + logoMoyen(m, 'r') + '<div class="txt"><b>' + esc(m.nom) + '</b></div><span class="interrupteur' + (actifs.indexOf(m.id) >= 0 ? ' on' : '') + '"></span></button>'; }).join('') + '</section>' +
      '<section class="carte"><div class="carte-tete">' + e('💾') + 'Mes données</div><button class="btn plein sec" id="exporter">' + e('⬇️') + ' Télécharger une copie</button>' +
      (MODE === 'demo' ? '<button class="btn plein sec danger" id="raz">' + e('↩️') + ' Remettre la démo à zéro</button>' : '<button class="btn plein sec" id="sync">' + e('🔄') + ' Synchroniser maintenant</button><button class="btn plein sec danger" id="deco">' + e('🚪') + ' Se déconnecter</button>') + '</section>' +
      '<p class="porte-pied">' + esc(N.appli) + ' · une solution SoluGis</p><p class="porte-pied" style="font-size:.72rem">Logos de paiement : Wave © Wave ; Orange Money et MTN (Wikimedia Commons, domaine public) ; Moov Money © Moov Africa (Wikimedia Commons, CC BY-SA 4.0). Marques de leurs propriétaires.</p>', { plein: true });
    $('#f-act', r).onsubmit = function (ev) { ev.preventDefault(); var f = ev.target; poser('reglages', Object.assign({}, a, { id: 'activite', nom: f.nom.value.trim(), prenom: f.prenom.value.trim(), tel: f.tel.value.trim() })); okPlein('Enregistré', 'bleu'); charpente(); dessiner(); };
    $('#r-plats', r).onclick = listePlats;
    $('#r-clients', r).onclick = listeClients;
    $$('[data-taille]', r).forEach(function (b) { b.onclick = function () { R.taille = b.dataset.taille; ecrireL('reglages', R); appliquerApparence(); $$('[data-taille]', r).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $$('[data-theme]', r).forEach(function (b) { b.onclick = function () { R.theme = b.dataset.theme; ecrireL('reglages', R); appliquerApparence(); $$('[data-theme]', r).forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    $('#r-sons', r).onclick = function () { R.sons = !R.sons; ecrireL('reglages', R); appliquerApparence(); $('#r-sons .interrupteur', r).classList.toggle('on', R.sons); Sons.jouer('coche'); };
    $$('[data-moy]', r).forEach(function (b) { b.onclick = function () { var L = moyensActifs().map(function (m) { return m.id; }), id = b.dataset.moy, i = L.indexOf(id); if (i >= 0) { if (L.length === 1) return toast('Gardez au moins un moyen de paiement.'); L.splice(i, 1); } else L.push(id); poser('reglages', { id: 'moyens', liste: L }); b.querySelector('.interrupteur').classList.toggle('on', i < 0); }; });
    $('#exporter', r).onclick = function () { var bl = new Blob([JSON.stringify({ application: N.appli, date: new Date().toISOString(), donnees: S.data }, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = 'Copie ' + N.appli + ' ' + auj() + '.json'; document.body.appendChild(l); l.click(); l.remove(); };
    if ($('#raz', r)) $('#raz', r).onclick = async function () { if (await demander('Remettre la démonstration à zéro ? Vos essais seront effacés.', 'Remettre à zéro')) { S.data = window.TRAITEUR_DEMO(auj()); sauver(); nouveauBrouillon(); fermerModales(); charpente(); dessiner(); } };
    if ($('#sync', r)) $('#sync', r).onclick = function () { rafraichir(); synchroniser(); toast('Synchronisation lancée.'); };
    if ($('#deco', r)) $('#deco', r).onclick = async function () { if (await demander('Se déconnecter de ce téléphone ?', 'Se déconnecter')) { try { await appel('deconnexion', {}); } catch (x) { } deconnecter('', true); } };
  }
  function listePlats() {
    var L = tous('plats').sort(function (a, b) { return (a.actif === false) - (b.actif === false) || (a.ordre || 0) - (b.ordre || 0); });
    var r = ouvrirModale('🍲 Mes plats', '<button class="btn plein bleu geant" id="nouveau" style="margin-top:0">' + e('➕') + ' Nouveau plat</button><section class="carte">' + L.map(function (p) { return '<button class="ligne-reg" data-p="' + p.id + '"' + (p.actif === false ? ' style="opacity:.5"' : '') + '>' + e(p.ic) + '<div class="txt"><b>' + esc(p.nom) + '</b><span>' + F(p.prix) + (p.actif === false ? ' · plus servi' : '') + '</span></div><span class="fl">›</span></button>'; }).join('') + '</section>', { plein: true });
    $('#nouveau', r).onclick = function () { formPlat(null); };
    $$('[data-p]', r).forEach(function (b) { b.onclick = function () { formPlat(doc('plats', b.dataset.p)); }; });
  }
  function formPlat(p) {
    var neuf = !p; p = p || { id: uid(), nom: '', ic: '', prix: 0, actif: true, ordre: tous('plats').length };
    var ic = p.ic, choisiMain = !!p.ic;
    var r = ouvrirModale(neuf ? '➕ Nouveau plat' : '✏️ ' + esc(p.nom), '<form class="formulaire">' + champ('Nom du plat', '<input name="nom" required value="' + esc(p.nom) + '" placeholder="Ex. : Attiéké poisson braisé">') + champ('Prix (F CFA)', champMontant('prix', p.prix)) +
      '<div class="champ"><span>Image</span><div class="icones-choix">' + M.ICONES_PLATS.map(function (x) { return '<button type="button" data-ic="' + x + '" class="' + (x === ic ? 'on' : '') + '">' + x + '</button>'; }).join('') + '</div></div>' +
      (!neuf ? '<button type="button" class="ligne-reg" id="actif">' + e('✅') + '<div class="txt"><b>Encore servi</b><span>Décocher pour le retirer des listes sans perdre l’historique</span></div><span class="interrupteur' + (p.actif !== false ? ' on' : '') + '"></span></button>' : '') +
      '<p class="erreur"></p><button class="btn plein bleu geant" type="submit">' + e('✅') + ' Enregistrer</button></form>');
    formaterMontants(r);
    var f = $('form', r), actif = p.actif !== false;
    function marquer() { $$('[data-ic]', r).forEach(function (b) { b.classList.toggle('on', b.dataset.ic === ic); }); }
    f.nom.addEventListener('input', function () { if (!choisiMain) { ic = M.iconeAuto(f.nom.value); marquer(); } });
    $$('[data-ic]', r).forEach(function (b) { b.onclick = function () { ic = b.dataset.ic; choisiMain = true; marquer(); Sons.jouer('coche'); }; });
    if ($('#actif', r)) $('#actif', r).onclick = function () { actif = !actif; $('#actif .interrupteur', r).classList.toggle('on', actif); };
    f.onsubmit = function (ev) {
      ev.preventDefault(); var nom = f.nom.value.trim(), prix = M.lireMontant(f.prix.value);
      if (!nom || !prix) { $('.erreur', r).textContent = 'Indiquez le nom et le prix.'; return; }
      Object.assign(p, { nom: nom, prix: prix, ic: ic || M.iconeAuto(nom), actif: actif }); poser('plats', p);
      fermerModales(); listePlats(); okPlein(neuf ? 'Plat ajouté' : 'Plat modifié', 'bleu');
    };
  }
  function listeClients() {
    var L = tous('clients').sort(function (a, b) { return a.nom < b.nom ? -1 : 1; });
    var r = ouvrirModale('👥 Mes clients', '<button class="btn plein bleu geant" id="nouveau" style="margin-top:0">' + e('➕') + ' Nouveau client</button><input class="recherche" id="cherche" placeholder="🔍 Chercher un client" style="margin-top:12px"><section class="carte" id="liste">' + L.map(function (k) { return '<button class="ligne-reg" data-cli="' + k.id + '" data-nom="' + esc(k.nom.toLowerCase()) + '">' + avatar(k, 'petit') + '<div class="txt"><b>' + esc(k.nom) + '</b><span>' + esc(k.tel || (k.type === 'entreprise' ? 'Entreprise' : 'Particulier')) + '</span></div><span class="fl">›</span></button>'; }).join('') + '</section>', { plein: true });
    brancher(r);
    $('#nouveau', r).onclick = function () { formClient(null, function (k) { fermerModales(); ficheClient(k.id); }); };
    $('#cherche', r).oninput = function () { var q = this.value.trim().toLowerCase(); $$('[data-nom]', r).forEach(function (b) { b.style.display = !q || b.dataset.nom.indexOf(q) >= 0 ? '' : 'none'; }); };
  }

  /* ================================================================== démarrage */
  function demarrer() {
    appliquerApparence();
    if (MODE === 'demo') { var DEMO_V = 2; if (!S.data || PARAMS.get('raz') || lireL('demoV', 0) !== DEMO_V) { S.data = window.TRAITEUR_DEMO(auj()); sauver(); ecrireL('demoV', DEMO_V); B = null; } }   // DEMO_V : à augmenter quand les données fictives changent
    else if (!S.jeton) { porte(); return; }
    if (!S.data) S.data = {};
    if (PARAMS.get('vue')) { NAV.vue = PARAMS.get('vue'); }
    if (NAV.jour && NAV.jour < M.ajouter(auj(), -60)) NAV.jour = '';
    charpente(); dessiner();
    var ov = PARAMS.get('ouvrir');      // aperçus : ?ouvrir=reglages|menu|client|depense|commande
    if (ov) setTimeout(function () { var c = tous('commandes').filter(function (x) { return x.date === auj(); })[0]; ({ reglages: reglages, menu: function () { formMenu(auj()); }, client: function () { ficheClient('c3'); }, depense: function () { formDepense(null); }, commande: function () { detailCommande(c); } }[ov] || function () { })(); }, 50);
    if (MODE !== 'demo') { rafraichir(); if (S.file.length) synchroniser(); }
  }
  var dejaSonne = false;
  document.addEventListener('pointerdown', function () { Sons.debloquer(); if (!dejaSonne) { dejaSonne = true; if (S.jeton || MODE === 'demo') Sons.jouer('ouverture'); } }, { once: true, capture: true });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && MODE !== 'demo' && S.jeton && Date.now() - S.maj > 60000) rafraichir(); });
  window.addEventListener('online', function () { planifierSync(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () { });
  window.TRAITEUR = { S: S, aller: aller, fermer: fermerModales, doc: doc, tous: tous, ouvrir: { detailCommande: detailCommande, formEncaisser: formEncaisser, ficheClient: ficheClient, formClient: formClient, formDepense: formDepense, listeDepenses: listeDepenses, formMenu: formMenu, reglages: reglages, listePlats: listePlats, formPlat: formPlat, listeClients: listeClients, livrer: livrer } };
  demarrer();
})();
