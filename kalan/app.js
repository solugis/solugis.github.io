/* KALAN — interface. Données gardées sur le téléphone (affichage immédiat, hors ligne), envoyées au service Apps Script dès que le réseau le permet.
   Modes : démo (KALAN_CONFIG.api vide, données fictives locales), banc (serveur simulé), en ligne (adresse /exec du script). */
(function () {
  'use strict';
  var M = window.KM, KB = window.KB, C = window.KALAN_CONFIG || {};
  var MODE = !C.api ? 'demo' : C.api === 'banc' ? 'banc' : 'ligne';
  var PFX = 'kalan.' + (MODE === 'ligne' ? 'app' : MODE) + '.';
  var PARAMS = new URLSearchParams(location.search);
  var IOS = PARAMS.get('ios') === '1' || /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var Reco = window.SpeechRecognition || window.webkitSpeechRecognition;
  var DICTEE = !IOS && !!Reco;     // sur iPhone : seulement la touche micro du clavier (la reconnaissance de la page fait planter l'appli ouverte depuis l'icône)

  function lireL(k, d) { try { var v = localStorage.getItem(PFX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function ecrireL(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { /* stockage plein ou bloqué */ } }
  var S = { data: lireL('data', null), file: lireL('file', []), version: lireL('version', 0), jeton: lireL('jeton', ''), role: lireL('role', 'eleve'), maj: lireL('maj', 0) };
  var R = Object.assign({ sons: true, theme: 'auto', accent: 'turquoise' }, lireL('reglages', {}));
  var NAV = Object.assign({ vue: 'accueil', agenda: 'semaine', cours: 'programme', tri: 0, jourEdt: 0, filtre: '' }, lireL('nav', {}));
  var CHAT = lireL('chat', []), REPLIS = lireL('replis', {});
  function sauver() { ecrireL('data', S.data); ecrireL('file', S.file); ecrireL('version', S.version); ecrireL('jeton', S.jeton); ecrireL('role', S.role); ecrireL('maj', S.maj); }

  /* ================================================================== icônes */
  var I = {
    maison: '<path d="M3.5 11L12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
    calendrier: '<rect x="4" y="5" width="16" height="15.5" rx="2"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
    graphique: '<path d="M4 4v16h16"/><path d="M8 15l3.5-4.5 3 3L20 7"/>',
    livre: '<path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14"/>',
    bulle: '<path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L4 20l1.3-4.4a8 8 0 1 1 15.2-4.1z"/><path d="M8.5 11.5h0M12.5 11.5h0M16.5 11.5h0"/>',
    reglages: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', croix: '<path d="M6 6l12 12M18 6L6 18"/>',
    droite: '<path d="M9 6l6 6-6 6"/>', gauche: '<path d="M15 6l-6 6 6 6"/>',
    haut: '<path d="M4 16l6-6 4 4 6-7"/><path d="M15 7h5v5"/>', bas: '<path d="M4 8l6 6 4-4 6 7"/><path d="M15 17h5v-5"/>', stable: '<path d="M4 12h15"/><path d="M15 8l4 4-4 4"/>',
    horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    etoile: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    ampoule: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    cible: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    chapeau: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5M21.5 9.5V15"/>',
    cartes: '<rect x="3" y="7" width="13" height="13.5" rx="2"/><path d="M8 4h11a2 2 0 0 1 2 2v11"/>',
    crayon: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    poubelle: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    micro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    envoyer: '<path d="M4.5 11.5L20 4l-5.5 16-3.2-6.8z"/><path d="M11.3 13.2L20 4"/>',
    son: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    sync: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
    maths: '<path d="M5 7h5M7.5 4.5v5M14 7h5M5.5 15.5l4 4M9.5 15.5l-4 4M14 16h5M14 19h5"/>',
    fiole: '<path d="M9.5 3h5M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 14h9"/>',
    feuille: '<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l7-7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    langue: '<path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5.5 7M11 5c-.8 3.5-3 6-6.5 7.5"/><path d="M13 21l3.5-9 3.5 9M14.2 18h4.6"/>',
    balance: '<path d="M12 4v16M7.5 20h9M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
    ballon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l4 3-1.5 4.5h-5L8 10.5z"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7H17a3.5 3.5 0 0 0 3.5-3.5c0-4.2-3.8-7.5-8.5-7.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
    cloche: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    trophee: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4v3.5h-4z"/>',
    etincelle: '<path d="M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    telecharger: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    sortie: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/>',
    personne: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-3.8 4-5.5 7.5-5.5s6.5 1.7 7.5 5.5"/>',
    parent: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M15 15c3 0 5.5 1.5 6.5 4.5"/>',
    cadenas: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h0"/>',
    imprimer: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6.5H7z"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h0"/>',
    retourner: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5"/>',
    feu: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.4-5 3.5-7.5.6 1.5 1.5 2.4 2.5 2.8C12 7.5 12.5 5 14.5 3c.5 3 4 5.5 4 10.5 0 4.4-2.8 7.5-6.5 7.5z"/>'
  };
  function ico(n, cls) { return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[n] || I.livre) + '</svg>'; }
  var LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16304f"/><stop offset="1" stop-color="#0d1b2e"/></linearGradient><linearGradient id="lgT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fe3ff"/><stop offset="1" stop-color="#1596d6"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#lgF)"/><path d="M10 25c7-2.5 14-1.5 21 3v22c-7-4.5-14-5.5-21-3z" fill="#fbeee4"/><path d="M54 25c-7-2.5-14-1.5-21 3v22c7-4.5 14-5.5 21-3z" fill="#e3ad8c"/><path d="M32 7l2.6 6.2 6.4.6-4.9 4.2 1.5 6.3L32 21l-5.6 3.3 1.5-6.3-4.9-4.2 6.4-.6z" fill="url(#lgT)"/></svg>';
  var AVATAR = '<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="url(#lgT2)"/><defs><linearGradient id="lgT2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fe3ff"/><stop offset="1" stop-color="#1596d6"/></linearGradient></defs><path d="M12 64c2-12 10-17 20-17s18 5 20 17z" fill="#0d1b2e"/><path d="M26 47l6 7 6-7" fill="#fbeee4"/><circle cx="32" cy="30" r="14" fill="#8a5a3c"/><path d="M18 27c0-9 6-14 14-14s14 5 14 13c-3-3-8-5-14-5s-10 2-14 6z" fill="#1b1410"/><circle cx="26.5" cy="31" r="4.2" fill="none" stroke="#0d1b2e" stroke-width="1.6"/><circle cx="37.5" cy="31" r="4.2" fill="none" stroke="#0d1b2e" stroke-width="1.6"/><path d="M30.7 31h2.6" stroke="#0d1b2e" stroke-width="1.6"/><circle cx="26.5" cy="31" r="1.3" fill="#1b1410"/><circle cx="37.5" cy="31" r="1.3" fill="#1b1410"/><path d="M27 38c3 2.6 7 2.6 10 0" fill="none" stroke="#1b1410" stroke-width="1.8" stroke-linecap="round"/></svg>';

  /* ================================================================== outils */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function riche(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function auj() { return PARAMS.get('date') || M.iso(new Date()); }
  function attendre(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  function pluriel(n, mot, motP) { return n + ' ' + (n > 1 ? (motP || mot + 's') : mot); }
  function opt(L, v) { return L.map(function (o) { var val = Array.isArray(o) ? o[0] : o, lib = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(lib) + '</option>'; }).join(''); }
  function champ(lib, html, cls) { return '<label class="champ ' + (cls || '') + '"><span>' + esc(lib) + '</span>' + html + '</label>'; }
  function toast(t) { var el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.appendChild(el); setTimeout(function () { el.classList.add('on'); }, 10); setTimeout(function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 400); }, 2600); }
  function couleurNote(m) { return m == null ? 'var(--doux)' : m >= 14 ? 'var(--vert)' : m >= 10 ? 'var(--orange)' : 'var(--rouge)'; }

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
  function profil() { return doc('profil', 'profil') || { prenom: '', trimestre: 1 }; }
  function matieres() { var d = doc('reglages', 'matieres'); return d && d.liste && d.liste.length ? d.liste : KB.MATIERES; }
  function mat(id) { return matieres().filter(function (m) { return m.id === id; })[0] || { id: id, nom: 'Autre', couleur: '#8a94a6', icone: 'livre', coef: 1 }; }
  function chapitres(mid) { var d = doc('programme', mid); return d ? d.chapitres : []; }
  function programme() { var o = {}; matieres().forEach(function (m) { o[m.id] = chapitres(m.id); }); return o; }
  function ctx() { return { auj: auj(), profil: profil(), matieres: matieres(), notes: tous('notes'), edt: tous('edt'), devoirs: tous('devoirs'), programme: programme(), cours: tous('cours'), fiches: tous('fiches') }; }
  function initialiserDonnees(prenom) {
    poser('profil', { id: 'profil', prenom: prenom || '', classe: '3e', etablissement: '', annee: '2026-2027', trimestre: 1, bepc: '' });
    poser('reglages', { id: 'matieres', liste: KB.MATIERES.map(function (m) { return Object.assign({}, m); }) });
    Object.keys(KB.PROGRAMME).forEach(function (m) { poser('programme', { id: m, chapitres: KB.PROGRAMME[m].map(function (t, i) { return { id: m + i, titre: t, etat: 'avenir' }; }) }); });
  }
  function pastilleMat(m, petit) { return '<span class="pm' + (petit ? ' petit' : '') + '" style="--c:' + m.couleur + '">' + ico(m.icone) + '</span>'; }

  /* ================================================================== échanges avec le service Apps Script */
  var sync = { enCours: false, encore: false, etat: 'ok', minuterie: null };
  function erreur(m, code) { var e = new Error(m); e.code = code || ''; return e; }
  function appel(fn, args) {
    args = Object.assign({ jeton: S.jeton }, args || {});
    var corps = JSON.stringify({ fn: fn, args: args });
    var envoi;
    if (MODE === 'banc') {
      envoi = new Promise(function (ok, ko) {
        setTimeout(function () {
          if (PARAMS.get('horsligne')) return ko(erreur('Connexion impossible pour le moment.', 'reseau'));
          try { ok(JSON.parse(JSON.stringify(window.KALAN_SERVEUR.traiter(JSON.parse(corps))))); } catch (e) { ko(e); }
        }, +(PARAMS.get('lent') || 150));
      });
    } else {
      envoi = (async function () {
        for (var essai = 0; ; essai++) {
          try {
            var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 12000);
            var r = await fetch(C.api, { method: 'POST', body: corps, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal });
            clearTimeout(t); return await r.json();
          } catch (e) { if (essai >= 2) throw erreur('Connexion impossible pour le moment.', 'reseau'); await attendre(1200 * (essai + 1)); }
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
        var lot = S.file.slice(0, 40), r = await appel('ecrire', { ops: lot }), faits = {};
        lot.forEach(function (o) { faits[o.opId] = 1; });
        S.file = S.file.filter(function (o) { return !faits[o.opId]; });
        S.version = r.version; S.maj = Date.now(); sauver();
      }
      sync.etat = 'ok';
    } catch (e) {
      if (e.code === 'session') { sync.enCours = false; return deconnecter('Ta session a expiré : entre de nouveau ton code.'); }
      sync.etat = 'horsligne'; setTimeout(planifierSync, 20000);
    }
    sync.enCours = false; majPastille();
    if (sync.encore) { sync.encore = false; synchroniser(); }
  }
  async function rafraichir() {
    if (MODE === 'demo' || !S.jeton) return;
    try {
      var r = await appel('etat', {}), data = r.data || {};
      S.file.forEach(function (op) { data[op.col] = data[op.col] || {}; if (op.op === 'put') data[op.col][op.id] = op.doc; else delete data[op.col][op.id]; });
      S.data = data; S.version = r.version; S.maj = Date.now(); S.role = r.role || S.role; sauver();
      if (!doc('profil', 'profil')) initialiserDonnees(r.prenom);
      if (!S.file.length) sync.etat = 'ok';
      majPastille(); redessinerSiLibre();
      if (S.file.length) synchroniser();
    } catch (e) {
      if (e.code === 'session') return deconnecter('Ta session a expiré : entre de nouveau ton code.');
      sync.etat = 'horsligne'; majPastille();
    }
  }
  function majPastille() {
    var p = $('#pastille'); if (!p) return;
    var e = MODE === 'demo' ? 'demo' : sync.enCours ? 'attente' : sync.etat === 'horsligne' ? 'horsligne' : S.file.length ? 'attente' : sync.etat;
    p.className = 'pastille ' + e;
    p.title = { demo: 'Démonstration', attente: 'Envoi en cours…', ok: 'À jour', horsligne: 'Hors ligne : tes saisies sont gardées et partiront dès que le réseau revient' }[e] || '';
  }
  function deconnecter(msg) {
    S.jeton = ''; S.data = null; S.file = []; sauver(); fermerModales(); demarrer(); if (msg) toast(msg);
  }

  /* ================================================================== modales */
  var PILE = [], aRedessiner = false;
  function ouvrirModale(titre, html, o) {
    o = o || {};
    var el = document.createElement('div'); el.className = 'modale' + (o.plein ? ' plein' : '');
    el.innerHTML = '<div class="voile"></div><div class="feuille" role="dialog" aria-label="' + esc(titre) + '"><div class="feuille-tete"><h2>' + esc(titre) + '</h2><button class="btn-rond fermer" aria-label="Fermer">' + ico('croix') + '</button></div><div class="feuille-corps">' + html + '</div></div>';
    document.body.appendChild(el); PILE.push(el); document.body.classList.add('modale-ouverte');
    el.querySelector('.voile').onclick = fermerModale; el.querySelector('.fermer').onclick = fermerModale;
    requestAnimationFrame(function () { el.classList.add('on'); });
    return el.querySelector('.feuille-corps');
  }
  function fermerModale() {
    var el = PILE.pop(); if (!el) return;
    el.classList.remove('on'); setTimeout(function () { el.remove(); }, 250);
    if (!PILE.length) { document.body.classList.remove('modale-ouverte'); if (aRedessiner) { aRedessiner = false; dessiner(); } else dessiner(); }
  }
  function fermerModales() { while (PILE.length) { var el = PILE.pop(); el.remove(); } document.body.classList.remove('modale-ouverte'); }
  function demander(texte, lib) {
    return new Promise(function (ok) {
      var c = ouvrirModale('Confirmer', '<p class="texte">' + esc(texte) + '</p><div class="rang-btn"><button class="btn sec" data-r="0">Annuler</button><button class="btn danger" data-r="1">' + esc(lib || 'Confirmer') + '</button></div>');
      $$('[data-r]', c).forEach(function (b) { b.onclick = function () { fermerModale(); ok(b.dataset.r === '1'); }; });
    });
  }
  function redessinerSiLibre() {
    var a = document.activeElement;
    if (PILE.length || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { aRedessiner = true; return; }
    dessiner();
  }
  function repli(cle, titre, corps, ouvertParDefaut, extra) {
    var ouvert = cle in REPLIS ? REPLIS[cle] : !!ouvertParDefaut;
    return '<section class="carte repli' + (ouvert ? ' ouvert' : '') + '" data-repli="' + esc(cle) + '"><button class="repli-tete" type="button">' + titre + '<span class="repli-signe">' + (ouvert ? '−' : '+') + '</span></button><div class="repli-corps">' + corps + '</div>' + (extra || '') + '</section>';
  }
  function activerReplis(r) {
    $$('.repli-tete', r).forEach(function (b) {
      b.onclick = function () { var s = b.parentNode, o = !s.classList.contains('ouvert'); s.classList.toggle('ouvert', o); b.querySelector('.repli-signe').textContent = o ? '−' : '+'; REPLIS[s.dataset.repli] = o; ecrireL('replis', REPLIS); };
    });
  }

  /* ================================================================== porte (connexion) */
  function porte() {
    var choix = lireL('profilPorte', 'eleve');
    document.getElementById('app').innerHTML = '<div class="porte"><div class="porte-haut">' + LOGO + '<h1>Kalan</h1><p>Ton espace pour réussir ta 3e</p></div>' +
      '<form class="carte porte-form" autocomplete="on"><div class="choix-profil">' +
      '<button type="button" data-p="eleve" class="' + (choix === 'eleve' ? 'on' : '') + '">' + ico('personne') + '<span>Élève</span></button>' +
      '<button type="button" data-p="parent" class="' + (choix === 'parent' ? 'on' : '') + '">' + ico('parent') + '<span>Parent</span></button></div>' +
      champ('Code personnel', '<input name="code" type="password" autocomplete="current-password" required>') +
      '<div class="nouveau" hidden>' + champ('Choisis ton code (6 caractères au moins)', '<input name="nouveau" type="password" autocomplete="new-password" minlength="6">') + champ('Confirme ce code', '<input name="confirme" type="password" autocomplete="new-password">') + '</div>' +
      '<p class="erreur" role="alert"></p><button class="btn plein" type="submit">' + ico('cadenas') + ' Entrer</button></form>' +
      '<p class="porte-pied">Une solution SoluGis</p></div>';
    var f = $('.porte-form'), etapeNouveau = false;
    $$('[data-p]', f).forEach(function (b) { b.onclick = function () { choix = b.dataset.p; ecrireL('profilPorte', choix); $$('[data-p]', f).forEach(function (x) { x.classList.toggle('on', x === b); }); Sons.jouer('onglet', choix === 'eleve' ? 0 : 2); }; });
    f.onsubmit = async function (e) {
      e.preventDefault(); var err = $('.erreur', f), btn = $('button[type=submit]', f); err.textContent = ''; err.classList.remove('info');
      var a = { profil: choix, code: f.code.value };
      if (etapeNouveau) {
        if (f.nouveau.value.length < 6) { err.textContent = 'Ton code doit compter au moins 6 caractères.'; return; }
        if (f.nouveau.value !== f.confirme.value) { err.textContent = 'Les deux codes ne sont pas identiques.'; return; }
        a.nouveau = f.nouveau.value;
      }
      btn.disabled = true; btn.classList.add('charge');
      try {
        var r = await appel('connexion', a);
        if (r.etape === 'nouveau') { etapeNouveau = true; $('.nouveau', f).hidden = false; err.classList.add('info'); err.textContent = 'Première connexion : choisis ton code personnel.'; f.nouveau.focus(); }
        else { S.jeton = r.jeton; S.role = choix; S.data = null; sauver(); Sons.jouer('ouverture'); demarrer(); }
      } catch (x) { err.textContent = x.message; }
      btn.disabled = false; btn.classList.remove('charge');
    };
  }

  /* ================================================================== charpente */
  var ONGLETS = [['accueil', 'Accueil', 'maison'], ['agenda', 'Agenda', 'calendrier'], ['notes', 'Notes', 'graphique'], ['cours', 'Cours', 'livre'], ['koro', 'Koro', 'bulle']];
  function charpente() {
    document.getElementById('app').innerHTML =
      '<header class="barre"><div class="marque">' + LOGO + '<b>Kalan</b>' + (MODE === 'demo' ? '<span class="badge-demo">Démo</span>' : '') + '</div>' +
      '<div class="barre-actions"><span id="pastille" class="pastille"></span><button class="btn-rond" id="btn-reglages" aria-label="Réglages">' + ico('reglages') + '</button></div></header>' +
      '<main id="vue"></main>' +
      '<nav class="onglets">' + ONGLETS.map(function (o, i) { return '<button data-vue="' + o[0] + '" data-i="' + i + '">' + ico(o[2]) + '<span>' + o[1] + '</span></button>'; }).join('') + '</nav>';
    $$('.onglets button').forEach(function (b) { b.onclick = function () { aller(b.dataset.vue); Sons.jouer('onglet', +b.dataset.i); }; });
    $('#btn-reglages').onclick = reglages;
    majPastille();
  }
  function aller(chemin) {
    var p = String(chemin).split('/'); NAV.vue = p[0];
    if (p[1] && p[0] === 'agenda') NAV.agenda = p[1];
    if (p[1] && p[0] === 'cours') NAV.cours = p[1];
    ecrireL('nav', NAV); fermerModales(); dessiner(); window.scrollTo(0, 0);
  }
  function dessiner() {
    var v = $('#vue'); if (!v) return;
    $$('.onglets button').forEach(function (b) { b.classList.toggle('on', b.dataset.vue === NAV.vue); });
    document.body.dataset.vue = NAV.vue;
    var f = { accueil: vueAccueil, agenda: vueAgenda, notes: vueNotes, cours: vueCours, koro: vueKoro }[NAV.vue] || vueAccueil;
    f(v);
  }
  function segments(cle, L, val) { return '<div class="segments" data-seg="' + cle + '">' + L.map(function (o) { return '<button data-v="' + o[0] + '" class="' + (o[0] === val ? 'on' : '') + '">' + (o[2] ? ico(o[2]) : '') + o[1] + '</button>'; }).join('') + '</div>'; }
  function activerSegments(r, fn) { $$('.segments button', r).forEach(function (b) { b.onclick = function () { fn(b.parentNode.dataset.seg, b.dataset.v); Sons.jouer('onglet', 3); }; }); }
  function brancherActions(r) {
    $$('[data-aller]', r).forEach(function (b) { b.onclick = function () { aller(b.dataset.aller); }; });
    $$('[data-question]', r).forEach(function (b) { b.onclick = function () { aller('koro'); poser_question(b.dataset.question); }; });
  }

  /* ================================================================== ACCUEIL */
  function anneau(pct, coul) {
    var r = 26, c = 2 * Math.PI * r;
    return '<svg class="anneau" viewBox="0 0 64 64"><circle cx="32" cy="32" r="' + r + '" class="fond"/><circle cx="32" cy="32" r="' + r + '" class="plein" style="stroke:' + (coul || 'var(--accent)') + '" stroke-dasharray="' + (c * pct / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">' + pct + '%</text></svg>';
  }
  function ligneCours(c, maintenant) {
    var m = mat(c.matiere), enCours = maintenant && c.debut <= maintenant && maintenant < c.fin;
    return '<div class="cours-ligne' + (enCours ? ' maintenant' : '') + '" style="--c:' + m.couleur + '"><div class="heures"><b>' + esc(c.debut.replace(':', 'h')) + '</b><span>' + esc(c.fin.replace(':', 'h')) + '</span></div><div class="trait"></div>' + pastilleMat(m, true) + '<div class="cours-txt"><b>' + esc(m.nom) + '</b><span>' + esc([c.salle ? 'Salle ' + c.salle : '', c.prof].filter(Boolean).join(' · ')) + (enCours ? ' <em>en ce moment</em>' : '') + '</span></div></div>';
  }
  function ligneDevoir(d) {
    var m = mat(d.matiere), j = M.ecart(auj(), d.pour), cl = d.fait ? 'fait' : j < 0 ? 'retard' : j <= 1 ? 'proche' : '';
    return '<div class="devoir ' + cl + '" data-id="' + d.id + '"><button class="case" aria-label="Fait">' + ico('coche') + '</button><div class="devoir-txt" data-edit="' + d.id + '"><b>' + esc(d.titre) + '</b><span><i class="point" style="background:' + m.couleur + '"></i>' + esc(m.nom) + ' · ' + (j < 0 && !d.fait ? 'en retard, pour ' : 'pour ') + esc(M.quand(d.pour, auj())) + '</span></div></div>';
  }
  function brancherDevoirs(r) {
    $$('.devoir .case', r).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var d = doc('devoirs', b.parentNode.dataset.id); if (!d) return; d.fait = !d.fait; poser('devoirs', d); Sons.jouer(d.fait ? 'coche' : 'onglet', 1); if (d.fait) toast('Bravo, un devoir de moins !'); dessiner(); }; });
    $$('[data-edit]', r).forEach(function (b) { b.onclick = function () { formDevoir(doc('devoirs', b.dataset.edit)); }; });
  }
  function premiersPas(D) {
    if (MODE === 'demo' || lireL('premiersPasFini', false)) return '';
    var E = [['Vérifier ton prénom et ta classe', !!D.profil.prenom && !/^Prénom/.test(D.profil.prenom), 'reglages'],
      ['Remplir ton emploi du temps', D.edt.length > 0, 'agenda'],
      ['Recopier les coefficients du bulletin', !!(doc('reglages', 'matieres') || {}).verifie, 'reglages'],
      ['Noter tes devoirs', D.devoirs.length > 0, 'agenda/devoirs'],
      ['Ajouter ta première note', D.notes.length > 0, 'notes'],
      ['Écrire ton premier cours', D.cours.length > 0, 'cours/cours']];
    var faits = E.filter(function (e) { return e[1]; }).length;
    if (faits === E.length) { ecrireL('premiersPasFini', true); return ''; }
    return '<section class="carte premiers"><div class="carte-tete"><h3>' + ico('etincelle') + 'Premiers pas</h3><span class="doux">' + faits + ' / ' + E.length + '</span></div>' +
      E.map(function (e) { return '<button class="pas' + (e[1] ? ' fait' : '') + '" data-pas="' + e[2] + '"><i class="case">' + ico('coche') + '</i><span>' + e[0] + '</span>' + ico('droite') + '</button>'; }).join('') + '</section>';
  }
  function vueAccueil(v) {
    var D = ctx(), p = D.profil, tri = p.trimestre || 1, pm = M.parMatiere(D.notes, D.matieres, tri), gen = M.generale(pm);
    var h = new Date().getHours(), soir = h >= 17, jAff = soir ? M.ajouter(D.auj, 1) : D.auj, js = M.jour(jAff).getDay();
    var cours = M.coursDuJour(D.edt, js), now = new Date(), maintenant = soir ? '' : (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
    for (var k = 1; !cours.length && D.edt.length && k < 7; k++) { jAff = M.ajouter(D.auj, (soir ? 1 : 0) + k); js = M.jour(jAff).getDay(); cours = M.coursDuJour(D.edt, js); maintenant = ''; }
    var titreJour = jAff === D.auj ? 'Aujourd’hui' : jAff === M.ajouter(D.auj, 1) ? 'Demain, ' + M.JOURS[js].toLowerCase() : M.JOURS[js] + ' ' + M.jour(jAff).getDate();
    var conseils = Koro.conseils(D), c0 = conseils[0];
    var dv = D.devoirs.filter(function (d) { return !d.fait; }).sort(function (a, b) { return a.pour < b.pour ? -1 : 1; });
    var dues = M.cartesDues(D.fiches, D.auj).length;
    var tousCh = []; Object.keys(D.programme).forEach(function (k) { tousCh = tousCh.concat(D.programme[k]); });
    var prog = M.progression(tousCh), jb = p.bepc ? M.ecart(D.auj, p.bepc) : null;
    var salut = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    v.innerHTML =
      '<section class="hero"><div class="hero-txt"><p class="hero-date">' + esc(M.dateLongue(D.auj)) + '</p><h1>' + salut + (p.prenom ? ', ' + esc(p.prenom) : '') + ' !</h1></div>' +
      '<div class="hero-stats"><button data-aller="notes"><b>' + (gen == null ? '–' : M.nombre(gen)) + '</b><span>Moyenne T' + tri + '</span></button>' +
      '<button data-aller="agenda/devoirs"><b>' + dv.length + '</b><span>' + (dv.length > 1 ? 'Devoirs' : 'Devoir') + ' à faire</span></button>' +
      (jb != null && jb >= 0 ? '<button data-aller="cours/programme"><b>J-' + jb + '</b><span>BEPC</span></button>' : '<button data-aller="cours/programme"><b>' + prog.pct + '%</b><span>Programme</span></button>') + '</div></section>' +
      premiersPas(D) +
      '<section class="carte koro-carte"><div class="koro-tete">' + AVATAR + '<div><b>Le conseil de Koro</b><span>Ton grand frère des études</span></div></div><p class="koro-txt niv-' + c0.niveau + '">' + ico(c0.icone) + '<span>' + riche(c0.texte) + '</span></p>' +
      '<div class="rang-btn">' + (c0.action ? (c0.action.aller ? '<button class="btn sec" data-aller="' + c0.action.aller + '">' + esc(c0.action.lib) + '</button>' : '<button class="btn sec" data-question="' + esc(c0.action.question) + '">' + esc(c0.action.lib) + '</button>') : '') + '<button class="btn" data-aller="koro">' + ico('bulle') + ' Parler à Koro</button></div></section>' +
      '<section class="carte"><div class="carte-tete"><h3>' + ico('calendrier') + esc(titreJour) + '</h3><button class="lien" data-aller="agenda">Semaine ' + ico('droite') + '</button></div>' +
      (cours.length ? '<div class="cours-liste">' + cours.map(function (c) { return ligneCours(c, maintenant); }).join('') + '</div>' : '<p class="vide">' + (D.edt.length ? 'Pas de cours. Profite pour réviser !' : 'Ton emploi du temps est vide.') + '</p>' + (D.edt.length ? '' : '<button class="btn sec" data-aller="agenda">' + ico('plus') + ' Remplir mon emploi du temps</button>')) + '</section>' +
      '<section class="carte"><div class="carte-tete"><h3>' + ico('crayon') + 'Devoirs à faire</h3><button class="lien" data-aller="agenda/devoirs">Tout voir ' + ico('droite') + '</button></div>' +
      (dv.length ? dv.slice(0, 4).map(ligneDevoir).join('') : '<p class="vide">Aucun devoir en attente.</p>') + '<button class="btn sec" id="ajout-devoir">' + ico('plus') + ' Noter un devoir</button></section>' +
      '<section class="carte revision"><div class="rev-ico">' + ico('cartes') + '</div><div><b>' + (dues ? pluriel(dues, 'carte') + ' à revoir' : 'Révisions à jour') + '</b><span>' + (dues ? 'Environ ' + Math.max(2, Math.ceil(dues / 3)) + ' minutes, c’est parti ?' : 'Fais une fiche à partir d’un cours pour avoir des cartes.') + '</span></div><button class="btn" data-aller="cours/' + (dues ? 'reviser' : 'cours') + '">' + (dues ? 'Réviser' : 'Mes cours') + '</button></section>' +
      '<section class="carte"><div class="carte-tete"><h3>' + ico('cible') + 'Programme de l’année</h3><button class="lien" data-aller="cours/programme">Détail ' + ico('droite') + '</button></div><div class="prog-resume">' + anneau(prog.pct) + '<div class="prog-barres">' +
      D.matieres.filter(function (m) { return (D.programme[m.id] || []).length; }).slice(0, 5).map(function (m) { var q = M.progression(D.programme[m.id]); return '<div class="mini-barre"><span>' + esc(m.nom) + '</span><i><b style="width:' + q.pct + '%;background:' + m.couleur + '"></b></i></div>'; }).join('') + '</div></div></section>' +
      (MODE === 'demo' ? '<p class="note-demo">' + ico('info') + 'Démonstration : élève et données fictives.</p>' : '');
    brancherActions(v); brancherDevoirs(v);
    $('#ajout-devoir', v).onclick = function () { formDevoir(null); };
    $$('[data-pas]', v).forEach(function (b) { b.onclick = function () { if (b.dataset.pas === 'reglages') reglages(); else aller(b.dataset.pas); }; });
  }

  /* ================================================================== AGENDA */
  var JOURS_C = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam']];
  function vueAgenda(v) {
    var D = ctx();
    var html = segments('agenda', [['semaine', 'Emploi du temps', 'calendrier'], ['devoirs', 'Devoirs', 'crayon']], NAV.agenda);
    if (NAV.agenda === 'devoirs') {
      var L = D.devoirs.slice().sort(function (a, b) { return a.pour < b.pour ? -1 : 1; }), a = D.auj;
      var G = [['En retard', function (d) { return !d.fait && d.pour < a; }], ['Aujourd’hui', function (d) { return !d.fait && d.pour === a; }], ['Demain', function (d) { return !d.fait && d.pour === M.ajouter(a, 1); }], ['Cette semaine', function (d) { return !d.fait && d.pour > M.ajouter(a, 1) && d.pour <= M.ajouter(a, 7); }], ['Plus tard', function (d) { return !d.fait && d.pour > M.ajouter(a, 7); }]];
      html += '<button class="btn plein" id="ajout-devoir">' + ico('plus') + ' Noter un devoir</button>';
      var rien = true;
      G.forEach(function (g) { var x = L.filter(g[1]); if (!x.length) return; rien = false; html += '<section class="carte"><h3 class="groupe">' + g[0] + ' <small>' + x.length + '</small></h3>' + x.map(ligneDevoir).join('') + '</section>'; });
      if (rien) html += '<div class="vide-grand">' + ico('etoile') + '<p>Aucun devoir en attente. Bien joué !</p></div>';
      var faits = L.filter(function (d) { return d.fait; }).reverse();
      if (faits.length) html += repli('devoirs-faits', '<span>' + ico('coche') + ' Faits <small>' + faits.length + '</small></span>', faits.slice(0, 15).map(ligneDevoir).join(''), false);
      v.innerHTML = html; brancherDevoirs(v); activerReplis(v);
      $('#ajout-devoir', v).onclick = function () { formDevoir(null); };
    } else {
      var jsAuj = M.jour(D.auj).getDay(), jSel = NAV.jourEdt || (jsAuj === 0 ? 1 : jsAuj);
      html += '<div class="jours">' + JOURS_C.map(function (j) { var n = M.coursDuJour(D.edt, j[0]).length; return '<button data-j="' + j[0] + '" class="' + (j[0] === jSel ? 'on' : '') + (j[0] === jsAuj ? ' auj' : '') + '"><b>' + j[1] + '</b><span>' + (n ? n + ' cours' : '–') + '</span></button>'; }).join('') + '</div>';
      var L2 = M.coursDuJour(D.edt, jSel);
      html += '<section class="carte"><h3 class="groupe">' + esc(M.JOURS[jSel]) + '</h3>' + (L2.length ? '<div class="cours-liste">' + L2.map(function (c) { return '<div class="cliquable" data-c="' + c.id + '">' + ligneCours(c) + '</div>'; }).join('') + '</div>' : '<p class="vide">Aucun cours ce jour-là.</p>') +
        '<button class="btn sec" id="ajout-cours">' + ico('plus') + ' Ajouter un cours le ' + esc(M.JOURS[jSel].toLowerCase()) + '</button></section>';
      html += '<p class="aide">' + ico('info') + 'Touche un cours pour le modifier. Koro s’en sert chaque soir pour te dire quoi préparer.</p>';
      v.innerHTML = html;
      $$('[data-j]', v).forEach(function (b) { b.onclick = function () { NAV.jourEdt = +b.dataset.j; ecrireL('nav', NAV); Sons.jouer('onglet', +b.dataset.j); dessiner(); }; });
      $$('[data-c]', v).forEach(function (b) { b.onclick = function () { formCours(doc('edt', b.dataset.c)); }; });
      $('#ajout-cours', v).onclick = function () { formCours(null, jSel); };
    }
    activerSegments(v, function (k, val) { NAV.agenda = val; ecrireL('nav', NAV); dessiner(); });
  }
  function optMatieres(v) { return opt(matieres().map(function (m) { return [m.id, m.nom]; }), v); }
  function formCours(c, jour) {
    var n = !c; c = c || { id: uid(), jour: jour || 1, debut: '07:30', fin: '09:30', matiere: matieres()[0].id, salle: '', prof: '' };
    var r = ouvrirModale(n ? 'Ajouter un cours' : 'Modifier le cours', '<form class="formulaire">' +
      champ('Matière', '<select name="matiere">' + optMatieres(c.matiere) + '</select>') +
      champ('Jour', '<select name="jour">' + opt(JOURS_C.map(function (j) { return [j[0], M.JOURS[j[0]]]; }), c.jour) + '</select>') +
      '<div class="deux">' + champ('Début', '<input name="debut" type="time" value="' + esc(c.debut) + '" required>') + champ('Fin', '<input name="fin" type="time" value="' + esc(c.fin) + '" required>') + '</div>' +
      '<div class="deux">' + champ('Salle', '<input name="salle" value="' + esc(c.salle) + '" placeholder="3e2">') + champ('Professeur', '<input name="prof" value="' + esc(c.prof) + '" placeholder="M. Koné">') + '</div>' +
      '<div class="rang-btn">' + (n ? '' : '<button type="button" class="btn danger sec" id="suppr">' + ico('poubelle') + ' Supprimer</button>') + '<button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>');
    var f = $('form', r);
    f.onsubmit = function (e) { e.preventDefault(); if (f.fin.value <= f.debut.value) return toast('L’heure de fin doit suivre l’heure de début.'); Object.assign(c, { matiere: f.matiere.value, jour: +f.jour.value, debut: f.debut.value, fin: f.fin.value, salle: f.salle.value.trim(), prof: f.prof.value.trim() }); poser('edt', c); NAV.jourEdt = c.jour; Sons.jouer('enregistre'); fermerModale(); };
    if (!n) $('#suppr', r).onclick = async function () { if (await demander('Supprimer ce cours de l’emploi du temps ?', 'Supprimer')) { retirer('edt', c.id); fermerModale(); } };
  }
  function formDevoir(d, matiere) {
    var n = !d; d = d || { id: uid(), matiere: matiere || matieres()[0].id, titre: '', pour: M.ajouter(auj(), 1), fait: false };
    var r = ouvrirModale(n ? 'Noter un devoir' : 'Modifier le devoir', '<form class="formulaire">' +
      champ('Matière', '<select name="matiere">' + optMatieres(d.matiere) + '</select>') +
      champ('À faire', '<textarea name="titre" rows="3" required placeholder="Exercices 4 et 5 page 112">' + esc(d.titre) + '</textarea>') +
      champ('Pour le', '<input name="pour" type="date" value="' + esc(d.pour) + '" required>') +
      '<div class="rang-btn">' + (n ? '' : '<button type="button" class="btn danger sec" id="suppr">' + ico('poubelle') + ' Supprimer</button>') + '<button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>');
    var f = $('form', r);
    f.onsubmit = function (e) { e.preventDefault(); Object.assign(d, { matiere: f.matiere.value, titre: f.titre.value.trim(), pour: f.pour.value }); poser('devoirs', d); Sons.jouer('enregistre'); fermerModale(); };
    if (!n) $('#suppr', r).onclick = async function () { if (await demander('Supprimer ce devoir ?', 'Supprimer')) { retirer('devoirs', d.id); fermerModale(); } };
  }

  /* ================================================================== NOTES */
  function courbe(pts) {
    if (pts.length < 2) return '<p class="vide petit">La courbe apparaîtra dès la deuxième note.</p>';
    var W = 300, H = 90, P = 8, min = Math.min(8, Math.floor(Math.min.apply(null, pts.map(function (p) { return p.v; })))), max = Math.max(16, Math.ceil(Math.max.apply(null, pts.map(function (p) { return p.v; }))));
    var x = function (i) { return P + i * (W - 2 * P) / (pts.length - 1); }, y = function (v) { return H - P - (v - min) * (H - 2 * P) / (max - min); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
    return '<svg class="courbe" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"><line x1="0" x2="' + W + '" y1="' + y(10) + '" y2="' + y(10) + '" class="dix"/><path d="' + d + ' L' + x(pts.length - 1) + ' ' + H + ' L' + x(0) + ' ' + H + 'Z" class="aire"/><path d="' + d + '" class="ligne"/><circle cx="' + x(pts.length - 1) + '" cy="' + y(pts[pts.length - 1].v) + '" r="4" class="pt"/></svg><div class="courbe-leg"><span>' + M.dateCourte(pts[0].date) + '</span><span>— 10/20</span><span>' + M.dateCourte(pts[pts.length - 1].date) + '</span></div>';
  }
  function vueNotes(v) {
    var D = ctx(), tri = NAV.tri || D.profil.trimestre || 1, pm = M.parMatiere(D.notes, D.matieres, tri), gen = M.generale(pm);
    var notesT = D.notes.filter(function (n) { return n.trimestre === tri; });
    var html = segments('tri', [[1, '1er trimestre'], [2, '2e trimestre'], [3, '3e trimestre']].map(function (x) { return [String(x[0]), x[1]]; }), String(tri));
    html += '<section class="carte resume-notes"><div class="moy-gen"><span>Moyenne générale</span><b style="color:' + couleurNote(gen) + '">' + (gen == null ? '–' : M.nombre(gen)) + '<small>/20</small></b><em>' + esc(M.mention(gen)) + '</em></div>' + courbe(M.evolution(notesT, D.matieres)) + '</section>';
    html += '<button class="btn plein" id="ajout-note">' + ico('plus') + ' Ajouter une note</button>';
    html += '<section class="carte liste-mat">' + D.matieres.map(function (m) {
      var x = pm[m.id], t = x.tendance;
      return '<button class="ligne-mat" data-m="' + m.id + '">' + pastilleMat(m) + '<div class="lm-txt"><b>' + esc(m.nom) + '</b><span>coef ' + m.coef + ' · ' + (x.notes.length ? pluriel(x.notes.length, 'note') : 'aucune note') + '</span></div>' +
        (x.notes.length >= 3 ? ico(t >= 1 ? 'haut' : t <= -1 ? 'bas' : 'stable', 'tend ' + (t >= 1 ? 'monte' : t <= -1 ? 'baisse' : '')) : '') + '<b class="lm-moy" style="color:' + couleurNote(x.moy) + '">' + (x.moy == null ? '–' : M.nombre(x.moy)) + '</b></button>';
    }).join('') + '</section>';
    html += '<p class="aide">' + ico('info') + 'Les coefficients se règlent dans Réglages › Matières. Recopie ceux de ton bulletin.</p>';
    v.innerHTML = html;
    activerSegments(v, function (k, val) { NAV.tri = +val; ecrireL('nav', NAV); dessiner(); });
    $('#ajout-note', v).onclick = function () { formNote(null); };
    $$('[data-m]', v).forEach(function (b) { b.onclick = function () { detailMatiere(b.dataset.m, tri); }; });
  }
  function detailMatiere(mid, tri) {
    var m = mat(mid), L = tous('notes').filter(function (n) { return n.matiere === mid; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var LT = L.filter(function (n) { return n.trimestre === tri; }), moy = M.moyenne(LT);
    var r = ouvrirModale(m.nom, '<div class="detail-tete" style="--c:' + m.couleur + '">' + pastilleMat(m) + '<div><b style="color:' + couleurNote(moy) + '">' + (moy == null ? '–' : M.nombre(moy)) + ' / 20</b><span>Trimestre ' + tri + ' · coefficient ' + m.coef + '</span></div></div>' +
      (L.length ? '<div class="liste-notes">' + L.map(function (n) { return '<button class="ligne-note" data-n="' + n.id + '"><div><b>' + esc(n.type || 'Note') + '</b><span>' + esc(M.dateCourte(n.date)) + ' · T' + n.trimestre + (n.coef > 1 ? ' · coef ' + n.coef : '') + (n.commentaire ? ' · ' + esc(n.commentaire) : '') + '</span></div><b class="val" style="color:' + couleurNote(M.sur20(n)) + '">' + M.nombre(n.note, n.note % 1 ? 2 : 0) + '<small>/' + (n.sur || 20) + '</small></b></button>'; }).join('') + '</div>' : '<p class="vide">Aucune note pour l’instant.</p>') +
      '<button class="btn plein" id="ajout">' + ico('plus') + ' Ajouter une note en ' + esc(m.nom) + '</button><button class="btn sec plein" id="koro">' + ico('bulle') + ' Demander conseil à Koro</button>');
    $$('[data-n]', r).forEach(function (b) { b.onclick = function () { formNote(doc('notes', b.dataset.n)); }; });
    $('#ajout', r).onclick = function () { formNote(null, mid); };
    $('#koro', r).onclick = function () { aller('koro'); poser_question('Ma moyenne en ' + m.nom); };
  }
  function formNote(n, mid) {
    var neuf = !n; n = n || { id: uid(), matiere: mid || matieres()[0].id, note: '', sur: 20, type: 'Interrogation', coef: 1, date: auj(), trimestre: profil().trimestre || 1, commentaire: '' };
    var r = ouvrirModale(neuf ? 'Ajouter une note' : 'Modifier la note', '<form class="formulaire">' +
      champ('Matière', '<select name="matiere">' + optMatieres(n.matiere) + '</select>') +
      '<div class="deux">' + champ('Note', '<input name="note" inputmode="decimal" value="' + esc(n.note === '' ? '' : String(n.note).replace('.', ',')) + '" required placeholder="12,5">') + champ('Sur', '<select name="sur">' + opt([10, 20, 40, 100], n.sur) + '</select>') + '</div>' +
      '<div class="deux">' + champ('Type', '<select name="type">' + opt(['Interrogation', 'Devoir', 'Composition', 'Exposé', 'Oral', 'Travaux pratiques'], n.type) + '</select>') + champ('Coefficient', '<select name="coef">' + opt([1, 2, 3, 4, 5], n.coef) + '</select>') + '</div>' +
      '<div class="deux">' + champ('Date', '<input name="date" type="date" value="' + esc(n.date) + '" required>') + champ('Trimestre', '<select name="trimestre">' + opt([1, 2, 3], n.trimestre) + '</select>') + '</div>' +
      champ('Remarque (facultatif)', '<input name="commentaire" value="' + esc(n.commentaire) + '" placeholder="Chapitre, appréciation du professeur…">') +
      '<p class="erreur"></p><div class="rang-btn">' + (neuf ? '' : '<button type="button" class="btn danger sec" id="suppr">' + ico('poubelle') + ' Supprimer</button>') + '<button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>');
    var f = $('form', r);
    f.onsubmit = function (e) {
      e.preventDefault(); var val = parseFloat(f.note.value.replace(',', '.')), sur = +f.sur.value;
      if (isNaN(val) || val < 0 || val > sur) { $('.erreur', f).textContent = 'La note doit être comprise entre 0 et ' + sur + '.'; return; }
      Object.assign(n, { matiere: f.matiere.value, note: val, sur: sur, type: f.type.value, coef: +f.coef.value, date: f.date.value, trimestre: +f.trimestre.value, commentaire: f.commentaire.value.trim() });
      poser('notes', n); Sons.jouer(M.sur20(n) >= 14 ? 'bravo' : 'enregistre');
      if (neuf) toast(M.sur20(n) >= 14 ? 'Excellente note, bravo !' : M.sur20(n) >= 10 ? 'Note enregistrée.' : 'Note enregistrée. Koro va t’aider à remonter.');
      fermerModale(); if (PILE.length) fermerModale();
    };
    if (!neuf) $('#suppr', r).onclick = async function () { if (await demander('Supprimer cette note ?', 'Supprimer')) { retirer('notes', n.id); fermerModale(); if (PILE.length) fermerModale(); } };
  }

  /* ================================================================== COURS : programme, cours, fiches, révision */
  function vueCours(v) {
    var html = segments('cours', [['programme', 'Programme'], ['cours', 'Mes cours'], ['fiches', 'Fiches'], ['reviser', 'Réviser']], NAV.cours);
    v.innerHTML = html + '<div id="sous"></div>';
    activerSegments(v, function (k, val) { NAV.cours = val; ecrireL('nav', NAV); if (val !== 'reviser') REV = null; dessiner(); });
    var s = $('#sous', v);
    ({ programme: vueProgramme, cours: vueMesCours, fiches: vueFiches, reviser: vueReviser }[NAV.cours] || vueProgramme)(s);
  }
  function vueProgramme(s) {
    var D = ctx(), tous_ = []; Object.keys(D.programme).forEach(function (k) { tous_ = tous_.concat(D.programme[k]); });
    var p = M.progression(tous_);
    var html = '<section class="carte prog-glob">' + anneau(p.pct) + '<div><b>' + (p.vu + p.revise) + ' chapitres vus sur ' + p.total + '</b><span>' + p.revise + ' révisés · ' + p.encours + ' en cours</span><div class="legende">' + M.ETATS.map(function (e) { return '<i class="etat ' + e + '">' + M.ETAT_NOM[e] + '</i>'; }).join('') + '</div></div></section>';
    D.matieres.forEach(function (m, i) {
      var ch = D.programme[m.id] || [], q = M.progression(ch);
      var tete = '<span class="rt-mat">' + pastilleMat(m, true) + '<span><b>' + esc(m.nom) + '</b><small>' + (q.vu + q.revise) + '/' + q.total + ' vus</small></span></span><i class="barre-prog"><b style="width:' + q.pct + '%;background:' + m.couleur + '"></b></i>';
      var corps = ch.map(function (c) { return '<div class="chap"><button class="etat ' + (c.etat || 'avenir') + '" data-cycle="' + m.id + '|' + c.id + '">' + M.ETAT_NOM[c.etat || 'avenir'] + '</button><button class="chap-titre" data-chap="' + m.id + '|' + c.id + '">' + esc(c.titre) + '</button></div>'; }).join('') +
        '<button class="btn sec petit" data-ajchap="' + m.id + '">' + ico('plus') + ' Ajouter un chapitre</button>';
      html += repli('prog-' + m.id, tete, corps, i === 0);
    });
    html += '<p class="aide">' + ico('info') + 'Programme de départ à ajuster selon la progression de tes professeurs. Touche l’étiquette d’un chapitre pour changer son état.</p>';
    s.innerHTML = html; activerReplis(s);
    $$('[data-cycle]', s).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.cycle.split('|'), d = doc('programme', k[0]), c = d.chapitres.filter(function (x) { return x.id === k[1]; })[0];
        c.etat = M.ETATS[(M.ETATS.indexOf(c.etat || 'avenir') + 1) % 4]; poser('programme', d);
        b.className = 'etat ' + c.etat; b.textContent = M.ETAT_NOM[c.etat]; Sons.jouer(c.etat === 'revise' ? 'juste' : 'onglet', M.ETATS.indexOf(c.etat));
        var q = M.progression(d.chapitres), sec = b.closest('.repli'); $('.barre-prog b', sec).style.width = q.pct + '%'; $('.rt-mat small', sec).textContent = (q.vu + q.revise) + '/' + q.total + ' vus';
      };
    });
    $$('[data-chap]', s).forEach(function (b) { b.onclick = function () { var k = b.dataset.chap.split('|'); formChapitre(k[0], k[1]); }; });
    $$('[data-ajchap]', s).forEach(function (b) { b.onclick = function () { formChapitre(b.dataset.ajchap, null); }; });
  }
  function formChapitre(mid, cid) {
    var d = doc('programme', mid) || { id: mid, chapitres: [] }, c = cid ? d.chapitres.filter(function (x) { return x.id === cid; })[0] : null, neuf = !c;
    c = c || { id: mid + uid(), titre: '', etat: 'avenir' };
    var lies = tous('cours').filter(function (k) { return k.chapitre === c.id; });
    var r = ouvrirModale(neuf ? 'Nouveau chapitre' : 'Chapitre', '<form class="formulaire"><p class="sous-titre">' + pastilleMat(mat(mid), true) + esc(mat(mid).nom) + '</p>' +
      champ('Titre du chapitre', '<input name="titre" value="' + esc(c.titre) + '" required>') +
      champ('État', '<select name="etat">' + opt(M.ETATS.map(function (e) { return [e, M.ETAT_NOM[e]]; }), c.etat) + '</select>') +
      (lies.length ? '<div class="lies"><span>Cours de ce chapitre</span>' + lies.map(function (k) { return '<button type="button" class="puce" data-k="' + k.id + '">' + ico('livre') + esc(k.titre) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="rang-btn">' + (neuf ? '' : '<button type="button" class="btn danger sec" id="suppr">' + ico('poubelle') + '</button><button type="button" class="btn sec" id="ecrire">' + ico('crayon') + ' Écrire le cours</button>') + '<button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>');
    var f = $('form', r);
    f.onsubmit = function (e) { e.preventDefault(); c.titre = f.titre.value.trim(); c.etat = f.etat.value; if (neuf) d.chapitres.push(c); poser('programme', d); Sons.jouer('enregistre'); fermerModale(); };
    $$('[data-k]', r).forEach(function (b) { b.onclick = function () { voirCours(doc('cours', b.dataset.k)); }; });
    if (!neuf) {
      $('#suppr', r).onclick = async function () { if (await demander('Retirer ce chapitre du programme ?', 'Retirer')) { d.chapitres = d.chapitres.filter(function (x) { return x.id !== c.id; }); poser('programme', d); fermerModale(); } };
      $('#ecrire', r).onclick = function () { fermerModale(); formCoursTexte(null, mid, c.id); };
    }
  }
  function puces(sel) {
    return '<div class="puces">' + [['', 'Toutes']].concat(matieres().map(function (m) { return [m.id, m.nom, m.couleur]; })).map(function (x) { return '<button data-f="' + x[0] + '" class="' + (x[0] === sel ? 'on' : '') + '"' + (x[2] ? ' style="--c:' + x[2] + '"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function vueMesCours(s) {
    var f = NAV.filtre || '', L = tous('cours').filter(function (c) { return !f || c.matiere === f; }).sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; });
    var fiches = {}; tous('fiches').forEach(function (x) { if (x.coursId) fiches[x.coursId] = x; });
    var html = puces(f) + '<button class="btn plein" id="nouveau">' + ico('plus') + ' Nouveau cours</button>';
    html += L.length ? L.map(function (c) { var m = mat(c.matiere); return '<button class="carte carte-cours" data-k="' + c.id + '" style="--c:' + m.couleur + '">' + pastilleMat(m, true) + '<div><b>' + esc(c.titre) + '</b><span>' + esc(m.nom) + ' · ' + esc(M.dateCourte(c.date || auj())) + '</span><p>' + esc(String(c.texte || '').slice(0, 110)) + (String(c.texte || '').length > 110 ? '…' : '') + '</p></div>' + (fiches[c.id] ? '<i class="badge-fiche">' + ico('etincelle') + 'Fiche</i>' : '') + '</button>'; }).join('')
      : '<div class="vide-grand">' + ico('livre') + '<p>Recopie ici l’essentiel de tes cours (ou dicte-le). Kalan en fera des fiches de révision.</p></div>';
    s.innerHTML = html;
    $$('[data-f]', s).forEach(function (b) { b.onclick = function () { NAV.filtre = b.dataset.f; ecrireL('nav', NAV); dessiner(); }; });
    $$('[data-k]', s).forEach(function (b) { b.onclick = function () { voirCours(doc('cours', b.dataset.k)); }; });
    $('#nouveau', s).onclick = function () { formCoursTexte(null, f || null); };
  }
  function ficheDuCours(id) { return tous('fiches').filter(function (f) { return f.coursId === id; })[0]; }
  function voirCours(c) {
    if (!c) return;
    var m = mat(c.matiere), fi = ficheDuCours(c.id), ch = chapitres(c.matiere).filter(function (x) { return x.id === c.chapitre; })[0];
    var r = ouvrirModale(c.titre, '<p class="sous-titre">' + pastilleMat(m, true) + esc(m.nom) + (ch ? ' · ' + esc(ch.titre) : '') + ' · ' + esc(M.dateCourte(c.date || auj())) + '</p><div class="texte-cours">' + String(c.texte || '').split('\n').map(function (l) { return /^\s*!/.test(l) ? '<mark>' + esc(l.replace(/^\s*!\s*/, '')) + '</mark>' : esc(l); }).join('<br>') + '</div>' +
      '<div class="rang-btn col">' + (fi ? '<button class="btn" id="voirfiche">' + ico('etincelle') + ' Voir la fiche</button><button class="btn sec" id="fiche">' + ico('retourner') + ' Refaire la fiche</button>' : '<button class="btn" id="fiche">' + ico('etincelle') + ' Faire la fiche de révision</button>') +
      '<div class="rang-btn"><button class="btn sec" id="modif">' + ico('crayon') + ' Modifier</button><button class="btn sec danger" id="suppr">' + ico('poubelle') + ' Supprimer</button></div></div>');
    $('#fiche', r).onclick = async function () {
      if (fi && !(await demander('Refaire la fiche à partir du cours ? Les modifications faites à la main sur la fiche seront remplacées.', 'Refaire'))) return;
      var f = faireFiche(c, fi); fermerModale(); voirFiche(f);
    };
    if (fi) $('#voirfiche', r).onclick = function () { fermerModale(); voirFiche(fi); };
    $('#modif', r).onclick = function () { fermerModale(); formCoursTexte(c); };
    $('#suppr', r).onclick = async function () { if (await demander('Supprimer ce cours ? (sa fiche est gardée)', 'Supprimer')) { retirer('cours', c.id); fermerModale(); } };
  }
  function vide(f) { return !f.retenir.length && !f.definitions.length && !f.formules.length && !f.dates.length; }
  function faireFiche(c, ancienne) {
    var sec = M.genererFiche(c), a = auj(), cartes = M.cartesDeFiche(sec, a);
    if (ancienne) { var parQ = {}; (ancienne.cartes || []).forEach(function (k) { parQ[k.q] = k; }); cartes = cartes.map(function (k) { return parQ[k.q] ? Object.assign(k, { boite: parQ[k.q].boite, prochaine: parQ[k.q].prochaine }) : k; }); }
    var f = { id: ancienne ? ancienne.id : uid(), matiere: c.matiere, coursId: c.id, chapitre: c.chapitre || '', titre: 'Fiche — ' + c.titre, sections: sec, cartes: cartes };
    poser('fiches', f); Sons.jouer('bravo');
    toast(vide(sec) ? 'Fiche créée, mais ton cours contient peu d’éléments à retenir : complète-la.' : 'Fiche prête : ' + pluriel(cartes.length, 'carte') + ' de révision.');
    return f;
  }
  function formCoursTexte(c, mid, chapId) {
    var neuf = !c; c = c || { id: uid(), matiere: mid || matieres()[0].id, chapitre: chapId || '', titre: '', texte: '', date: auj() };
    if (neuf && chapId && !c.titre) { var ch0 = chapitres(c.matiere).filter(function (x) { return x.id === chapId; })[0]; if (ch0) c.titre = ch0.titre; }
    function optChap(m, v) { return '<option value="">— Aucun —</option>' + opt(chapitres(m).map(function (x) { return [x.id, x.titre]; }), v); }
    var r = ouvrirModale(neuf ? 'Nouveau cours' : 'Modifier le cours', '<form class="formulaire">' +
      champ('Matière', '<select name="matiere">' + optMatieres(c.matiere) + '</select>') +
      champ('Chapitre du programme', '<select name="chapitre">' + optChap(c.matiere, c.chapitre) + '</select>') +
      champ('Titre', '<input name="titre" value="' + esc(c.titre) + '" required placeholder="La propriété de Thalès">') +
      '<label class="champ"><span>Le cours' + (DICTEE ? '<button type="button" class="btn-dicter" id="dicter">' + ico('micro') + ' Dicter</button>' : '') + '</span><textarea name="texte" rows="12" placeholder="Recopie l’essentiel…">' + esc(c.texte) + '</textarea></label>' +
      '<details class="astuces"><summary>' + ico('ampoule') + ' Astuces pour une bonne fiche</summary><ul><li>Une définition par ligne : <b>mot : définition</b></li><li>Une formule par ligne : <b>Loi d’Ohm : U = R × I</b></li><li>Commence par <b>!</b> une phrase à retenir absolument</li><li>Écris les dates en chiffres : <b>En 1960, …</b></li>' + (IOS ? '<li>Pour dicter, touche le micro 🎤 du clavier.</li>' : '') + '</ul></details>' +
      '<div class="rang-btn"><button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>', { plein: true });
    var f = $('form', r);
    f.matiere.onchange = function () { f.chapitre.innerHTML = optChap(f.matiere.value, ''); };
    f.onsubmit = function (e) {
      e.preventDefault();
      Object.assign(c, { matiere: f.matiere.value, chapitre: f.chapitre.value, titre: f.titre.value.trim(), texte: f.texte.value.trim() });
      poser('cours', c);
      if (c.chapitre) { var d = doc('programme', c.matiere), x = d && d.chapitres.filter(function (y) { return y.id === c.chapitre; })[0]; if (x && x.etat === 'avenir') { x.etat = 'encours'; poser('programme', d); } }
      Sons.jouer('enregistre'); fermerModale(); voirCours(c);
    };
    if (DICTEE) brancherDictee($('#dicter', r), f.texte);
  }
  function brancherDictee(btn, zone) {
    var reco = null;
    btn.onclick = function () {
      if (reco) { reco.stop(); return; }
      reco = new Reco(); reco.lang = 'fr-FR'; reco.continuous = true; reco.interimResults = false;
      reco.onresult = function (e) { for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { var t = e.results[i][0].transcript.trim(); zone.value += (zone.value && !/\s$/.test(zone.value) ? ' ' : '') + t.charAt(0).toUpperCase() + t.slice(1) + '.'; } };
      reco.onend = function () { reco = null; btn.classList.remove('actif'); btn.innerHTML = ico('micro') + ' Dicter'; };
      reco.onerror = function () { toast('Dictée indisponible : utilise le micro du clavier.'); };
      reco.start(); btn.classList.add('actif'); btn.innerHTML = ico('micro') + ' Arrêter';
    };
  }
  function vueFiches(s) {
    var f = NAV.filtre || '', a = auj(), L = tous('fiches').filter(function (x) { return !f || x.matiere === f; }).sort(function (x, y) { return (y.maj || 0) - (x.maj || 0); });
    var html = puces(f) + '<button class="btn plein sec" id="nouvelle">' + ico('plus') + ' Fiche écrite à la main</button>';
    html += L.length ? L.map(function (x) { var m = mat(x.matiere), sec = x.sections || {}, dues = (x.cartes || []).filter(function (k) { return !k.prochaine || k.prochaine <= a; }).length; return '<button class="carte carte-fiche" data-fi="' + x.id + '" style="--c:' + m.couleur + '">' + pastilleMat(m, true) + '<div><b>' + esc(x.titre) + '</b><span>' + esc(m.nom) + ' · ' + pluriel((sec.definitions || []).length, 'définition') + ' · ' + pluriel((x.cartes || []).length, 'carte') + '</span></div>' + (dues ? '<i class="badge-dues">' + dues + '</i>' : '') + '</button>'; }).join('')
      : '<div class="vide-grand">' + ico('etincelle') + '<p>Pas encore de fiche. Ouvre un cours et touche « Faire la fiche de révision ».</p><button class="btn" data-aller="cours/cours">Mes cours</button></div>';
    s.innerHTML = html; brancherActions(s);
    $$('[data-f]', s).forEach(function (b) { b.onclick = function () { NAV.filtre = b.dataset.f; ecrireL('nav', NAV); dessiner(); }; });
    $$('[data-fi]', s).forEach(function (b) { b.onclick = function () { voirFiche(doc('fiches', b.dataset.fi)); }; });
    $('#nouvelle', s).onclick = function () { formFiche(null); };
  }
  function voirFiche(fi) {
    if (!fi) return;
    var m = mat(fi.matiere), s = fi.sections || {}, a = auj(), dues = (fi.cartes || []).filter(function (k) { return !k.prochaine || k.prochaine <= a; }).length;
    function bloc(cle, titre, icone, corps) { return corps ? '<section class="bloc-fiche b-' + cle + '"><h4>' + ico(icone) + titre + '</h4>' + corps + '</section>' : ''; }
    var html = '<div class="fiche" style="--c:' + m.couleur + '"><p class="sous-titre">' + pastilleMat(m, true) + esc(m.nom) + '</p>' +
      bloc('retenir', 'À retenir', 'ampoule', (s.retenir || []).length ? '<ul>' + s.retenir.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      bloc('def', 'Définitions', 'livre', (s.definitions || []).length ? '<dl>' + s.definitions.map(function (d) { return '<dt>' + esc(d.terme) + '</dt><dd>' + esc(d.def) + '</dd>'; }).join('') + '</dl>' : '') +
      bloc('form', 'Formules', 'maths', (s.formules || []).length ? s.formules.map(function (x) { return '<div class="formule">' + esc(x) + '</div>'; }).join('') : '') +
      bloc('dates', 'Dates', 'calendrier', (s.dates || []).length ? s.dates.map(function (d) { return '<div class="date-l"><b>' + esc(d.annee) + '</b><span>' + esc(d.fait) + '</span></div>'; }).join('') : '') +
      bloc('mots', 'Mots-clés', 'etincelle', (s.motsCles || []).length ? '<div class="mots">' + s.motsCles.map(function (w) { return '<i>' + esc(w) + '</i>'; }).join('') + '</div>' : '') +
      (vide({ retenir: s.retenir || [], definitions: s.definitions || [], formules: s.formules || [], dates: s.dates || [] }) ? '<p class="vide">Fiche vide pour l’instant : touche « Modifier » pour la compléter.</p>' : '') + '</div>' +
      '<div class="rang-btn col">' + ((fi.cartes || []).length ? '<button class="btn" id="rev">' + ico('cartes') + ' Réviser cette fiche (' + pluriel(fi.cartes.length, 'carte') + (dues ? ', ' + dues + ' à revoir' : '') + ')</button>' : '') +
      '<div class="rang-btn"><button class="btn sec" id="modif">' + ico('crayon') + ' Modifier</button><button class="btn sec" id="impr">' + ico('imprimer') + ' Imprimer</button><button class="btn sec danger" id="suppr" aria-label="Supprimer">' + ico('poubelle') + '</button></div></div>';
    var r = ouvrirModale(fi.titre, html, { plein: true });
    if ($('#rev', r)) $('#rev', r).onclick = function () { REV = sessionRevision([fi], true); NAV.cours = 'reviser'; ecrireL('nav', NAV); aller('cours/reviser'); };
    $('#modif', r).onclick = function () { fermerModale(); formFiche(fi); };
    $('#impr', r).onclick = function () { document.body.classList.add('impression'); window.print(); setTimeout(function () { document.body.classList.remove('impression'); }, 500); };
    $('#suppr', r).onclick = async function () { if (await demander('Supprimer cette fiche et ses cartes ?', 'Supprimer')) { retirer('fiches', fi.id); fermerModale(); } };
  }
  function formFiche(fi) {
    var neuf = !fi; fi = fi || { id: uid(), matiere: NAV.filtre || matieres()[0].id, titre: '', sections: { retenir: [], definitions: [], formules: [], dates: [], motsCles: [] }, cartes: [] };
    var s = fi.sections;
    var r = ouvrirModale(neuf ? 'Nouvelle fiche' : 'Modifier la fiche', '<form class="formulaire">' +
      champ('Matière', '<select name="matiere">' + optMatieres(fi.matiere) + '</select>') +
      champ('Titre', '<input name="titre" value="' + esc(fi.titre) + '" required>') +
      champ('À retenir (une idée par ligne)', '<textarea name="retenir" rows="4">' + esc((s.retenir || []).join('\n')) + '</textarea>') +
      champ('Définitions (« mot : définition », une par ligne)', '<textarea name="definitions" rows="4">' + esc((s.definitions || []).map(function (d) { return d.terme + ' : ' + d.def; }).join('\n')) + '</textarea>') +
      champ('Formules (une par ligne)', '<textarea name="formules" rows="3">' + esc((s.formules || []).join('\n')) + '</textarea>') +
      champ('Dates (« 1960 : événement », une par ligne)', '<textarea name="dates" rows="3">' + esc((s.dates || []).map(function (d) { return d.annee + ' : ' + d.fait; }).join('\n')) + '</textarea>') +
      champ('Mots-clés (séparés par des virgules)', '<input name="mots" value="' + esc((s.motsCles || []).join(', ')) + '">') +
      '<div class="rang-btn"><button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>', { plein: true });
    var f = $('form', r);
    f.onsubmit = function (e) {
      e.preventDefault();
      function lignes(t) { return t.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
      var sec = { retenir: lignes(f.retenir.value), formules: lignes(f.formules.value), motsCles: f.mots.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean),
        definitions: lignes(f.definitions.value).map(function (l) { var i = l.indexOf(':'); return i > 0 ? { terme: l.slice(0, i).trim(), def: l.slice(i + 1).trim() } : { terme: l, def: '' }; }).filter(function (d) { return d.def; }),
        dates: lignes(f.dates.value).map(function (l) { var m = l.match(/^(\d{3,4})\s*[:\-–]\s*(.+)$/); return m ? { annee: m[1], fait: m[2] } : null; }).filter(Boolean) };
      var parQ = {}; (fi.cartes || []).forEach(function (k) { parQ[k.q] = k; });
      fi.cartes = M.cartesDeFiche(sec, auj()).map(function (k) { return parQ[k.q] ? Object.assign(k, { boite: parQ[k.q].boite, prochaine: parQ[k.q].prochaine }) : k; });
      Object.assign(fi, { matiere: f.matiere.value, titre: f.titre.value.trim(), sections: sec });
      poser('fiches', fi); Sons.jouer('enregistre'); fermerModale(); voirFiche(fi);
    };
  }

  /* révision par cartes */
  var REV = null;
  function sessionRevision(fiches, toutes) {
    var a = auj(), L = [];
    fiches.forEach(function (f) { (f.cartes || []).forEach(function (k) { if (toutes || !k.prochaine || k.prochaine <= a) L.push({ f: f.id, k: k.id }); }); });
    for (var i = L.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = L[i]; L[i] = L[j]; L[j] = t; }
    return { liste: L.slice(0, 25), i: 0, ok: 0, ko: 0, montre: false, fiches: {} };
  }
  function vueReviser(s) {
    if (!REV) { var due = M.cartesDues(tous('fiches'), auj()); if (due.length) REV = sessionRevision(tous('fiches'), false); }
    if (!REV || !REV.liste.length) {
      var F = tous('fiches').filter(function (f) { return (f.cartes || []).length; });
      s.innerHTML = '<div class="vide-grand">' + ico('etoile') + '<p><b>Aucune carte à revoir aujourd’hui.</b><br>Tes révisions sont à jour.</p></div>' +
        (F.length ? '<section class="carte"><h3 class="groupe">Réviser quand même une fiche</h3>' + F.map(function (f) { var m = mat(f.matiere); return '<button class="ligne-mat" data-rf="' + f.id + '">' + pastilleMat(m, true) + '<div class="lm-txt"><b>' + esc(f.titre) + '</b><span>' + pluriel(f.cartes.length, 'carte') + '</span></div>' + ico('droite') + '</button>'; }).join('') + '</section>' : '<button class="btn plein" data-aller="cours/cours">' + ico('livre') + ' Mes cours</button>');
      brancherActions(s);
      $$('[data-rf]', s).forEach(function (b) { b.onclick = function () { REV = sessionRevision([doc('fiches', b.dataset.rf)], true); dessiner(); }; });
      return;
    }
    if (REV.i >= REV.liste.length) {
      var tot = REV.ok + REV.ko, pct = tot ? Math.round(REV.ok / tot * 100) : 0;
      s.innerHTML = '<div class="fin-rev">' + ico(pct >= 70 ? 'trophee' : 'feu') + '<h2>' + (pct >= 70 ? 'Bravo !' : 'Bien travaillé !') + '</h2><p>' + REV.ok + ' sur ' + tot + ' réussies (' + pct + ' %).</p><p class="doux">' + (REV.ko ? 'Les cartes ratées reviendront bientôt : c’est comme ça qu’on retient.' : 'Tout est su. Les cartes reviendront dans quelques jours pour bien ancrer.') + '</p><button class="btn" id="fin">' + ico('coche') + ' Terminer</button></div>';
      $('#fin', s).onclick = function () { REV = null; aller('accueil'); };
      return;
    }
    var e = REV.liste[REV.i], fi = doc('fiches', e.f), k = fi && (fi.cartes || []).filter(function (x) { return x.id === e.k; })[0];
    if (!k) { REV.i++; return vueReviser(s); }
    var m = mat(fi.matiere);
    s.innerHTML = '<div class="rev-prog"><i><b style="width:' + Math.round(REV.i / REV.liste.length * 100) + '%"></b></i><span>' + (REV.i + 1) + ' / ' + REV.liste.length + '</span></div>' +
      '<div class="carte-rev' + (REV.montre ? ' retournee' : '') + '" style="--c:' + m.couleur + '"><p class="cr-mat">' + pastilleMat(m, true) + esc(m.nom) + ' · ' + esc(fi.titre.replace(/^Fiche — /, '')) + '</p><p class="cr-q">' + esc(k.q) + '</p>' + (REV.montre ? '<p class="cr-r">' + esc(k.r) + '</p>' : '') + '</div>' +
      (REV.montre ? '<div class="rang-btn rev-btn"><button class="btn rouge" id="ko">' + ico('retourner') + ' À revoir</button><button class="btn vert" id="ok">' + ico('coche') + ' Je savais</button></div>' : '<button class="btn plein" id="voir">Voir la réponse</button><p class="aide centre">Réponds dans ta tête (ou à voix haute) avant de retourner la carte.</p>');
    if (!REV.montre) $('#voir', s).onclick = function () { REV.montre = true; Sons.jouer('onglet', 4); vueReviser(s); };
    else {
      var rep = function (su) {
        M.repondre(k, su, auj()); poser('fiches', fi); REV[su ? 'ok' : 'ko']++; REV.fiches[fi.id] = REV.fiches[fi.id] || { ok: 0, n: 0 }; REV.fiches[fi.id].n++; if (su) REV.fiches[fi.id].ok++;
        Sons.jouer(su ? 'juste' : 'revoir'); REV.i++; REV.montre = false;
        if (REV.i >= REV.liste.length) { finRevision(); Sons.jouer('bravo'); }
        vueReviser(s);
      };
      $('#ok', s).onclick = function () { rep(true); }; $('#ko', s).onclick = function () { rep(false); };
    }
  }
  /* une fiche réussie à 70 % au moins : son chapitre passe à « Révisé » */
  function finRevision() {
    Object.keys(REV.fiches).forEach(function (id) {
      var r = REV.fiches[id], fi = doc('fiches', id); if (!fi || !fi.chapitre || r.ok / r.n < 0.7) return;
      var d = doc('programme', fi.matiere), c = d && d.chapitres.filter(function (x) { return x.id === fi.chapitre; })[0];
      if (c && c.etat !== 'revise') { c.etat = 'revise'; poser('programme', d); toast('Chapitre « ' + c.titre + ' » marqué comme révisé.'); }
    });
  }

  /* ================================================================== KORO */
  var brouillon = '';
  function uniques(L) { var vu = {}; return (L || []).filter(function (a) { if (vu[a.lib]) return false; vu[a.lib] = 1; return true; }); }
  function bulle(msg, i) {
    if (msg.de === 'moi') return '<div class="msg moi"><p>' + esc(msg.texte) + '</p></div>';
    var act = (msg.actions || []).map(function (a, j) { return '<button class="puce" data-act="' + i + '|' + j + '">' + esc(a.lib) + ' ' + ico('droite') + '</button>'; }).join('');
    return '<div class="msg koro">' + AVATAR + '<div class="msg-corps"><p>' + riche(msg.texte) + '</p>' + (act || msg.noter ? '<div class="msg-actions">' + act + (msg.noter ? '<button class="puce" data-noter="' + i + '">' + ico('question') + ' Noter pour mon professeur</button>' : '') + '</div>' : '') + ('speechSynthesis' in window ? '<button class="lire" data-lire="' + i + '" aria-label="Lire à voix haute">' + ico('son') + '</button>' : '') + '</div></div>';
  }
  function vueKoro(v) {
    if (!CHAT.length) {
      var D = ctx(), C0 = Koro.conseils(D).slice(0, 3);
      CHAT.push({ de: 'koro', texte: 'Salut ' + (D.profil.prenom || '') + ' ! Je suis **Koro**, ton grand frère des études. Je connais tes notes, ton emploi du temps, tes devoirs et tes cours.\nPour commencer, voici ce que je vois :\n' + C0.map(function (c) { return '• ' + c.texte; }).join('\n'), actions: uniques(C0.filter(function (c) { return c.action && c.action.aller; }).map(function (c) { return c.action; })).slice(0, 2) });
      ecrireL('chat', CHAT);
    }
    var nq = tous('questions').filter(function (q) { return !q.repondu; }).length;
    v.innerHTML = '<div class="koro-entete">' + AVATAR + '<div><b>Koro</b><span>Ton grand frère des études</span></div><button class="btn-rond" id="questions" aria-label="Questions pour le professeur">' + ico('question') + (nq ? '<i class="compteur">' + nq + '</i>' : '') + '</button><button class="btn-rond" id="effacer" aria-label="Effacer la conversation">' + ico('poubelle') + '</button></div>' +
      '<div class="fil" id="fil">' + CHAT.map(bulle).join('') + '</div>' +
      '<div class="saisie-koro"><div class="puces sugg">' + Koro.SUGGESTIONS.map(function (q) { return '<button data-sugg="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<form id="form-koro"><input name="q" autocomplete="off" enterkeyhint="send" placeholder="' + (IOS ? 'Écris ou dicte avec 🎤 du clavier…' : 'Pose ta question…') + '" value="' + esc(brouillon) + '">' + (DICTEE ? '<button type="button" class="btn-rond" id="dicter-koro" aria-label="Dicter">' + ico('micro') + '</button>' : '') + '<button class="btn-rond envoi" aria-label="Envoyer">' + ico('envoyer') + '</button></form></div>';
    var fil = $('#fil', v); fil.scrollTop = fil.scrollHeight; setTimeout(function () { window.scrollTo(0, document.body.scrollHeight); }, 30);
    var f = $('#form-koro', v);
    f.q.oninput = function () { brouillon = f.q.value; };
    f.onsubmit = function (e) { e.preventDefault(); var q = f.q.value.trim(); if (!q) return; brouillon = ''; f.q.value = ''; poser_question(q); };
    $$('[data-sugg]', v).forEach(function (b) { b.onclick = function () { poser_question(b.dataset.sugg); }; });
    $('#effacer', v).onclick = async function () { if (await demander('Effacer la conversation avec Koro ?', 'Effacer')) { CHAT = []; ecrireL('chat', CHAT); dessiner(); } };
    $('#questions', v).onclick = questionsProf;
    if (DICTEE) { var b = $('#dicter-koro', v); brancherDictee(b, { get value() { return f.q.value; }, set value(x) { f.q.value = x.replace(/\.$/, ''); brouillon = f.q.value; } }); }
    brancherBulles(v);
  }
  function brancherBulles(v) {
    $$('[data-act]', v).forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.act.split('|'), a = CHAT[+k[0]].actions[+k[1]];
        if (a.aller) aller(a.aller); else if (a.question) poser_question(a.question);
        else if (a.ouvrir === 'cours') voirCours(doc('cours', a.id)); else if (a.ouvrir === 'fiche') voirFiche(doc('fiches', a.id));
      };
    });
    $$('[data-noter]', v).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.noter, q = CHAT[i].q || ''; if (!q) return;
        poser('questions', { id: uid(), texte: q, matiere: '', date: auj(), repondu: false });
        CHAT[i].noter = false; ecrireL('chat', CHAT); Sons.jouer('enregistre'); toast('Question notée : pose-la à ton professeur.'); dessiner();
      };
    });
    $$('[data-lire]', v).forEach(function (b) {
      b.onclick = function () {
        var t = CHAT[+b.dataset.lire].texte.replace(/\*\*/g, '').replace(/•/g, '').replace(/\//g, ' sur ');
        speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.02; speechSynthesis.speak(u);
      };
    });
  }
  function poser_question(q) {
    CHAT.push({ de: 'moi', texte: q });
    var r = Koro.repondre(q, ctx());
    CHAT.push({ de: 'koro', texte: r.texte, actions: uniques(r.actions), noter: !!r.noter, q: q });
    if (CHAT.length > 60) CHAT = CHAT.slice(-60);
    ecrireL('chat', CHAT);
    if (NAV.vue !== 'koro') { aller('koro'); } else { var v = $('#vue'); var fil = $('#fil', v); if (fil) { fil.innerHTML = CHAT.map(bulle).join(''); brancherBulles(v); fil.scrollTop = fil.scrollHeight; window.scrollTo(0, document.body.scrollHeight); } }
    setTimeout(function () { Sons.jouer('koro'); }, 120);
  }
  function questionsProf() {
    var L = tous('questions').sort(function (a, b) { return (a.repondu - b.repondu) || (a.date < b.date ? 1 : -1); });
    var r = ouvrirModale('Questions pour mes professeurs', (L.length ? L.map(function (q) { return '<div class="question' + (q.repondu ? ' faite' : '') + '"><button class="case" data-q="' + q.id + '">' + ico('coche') + '</button><div><p>' + esc(q.texte) + '</p><span>Notée ' + esc(M.quand(q.date, auj())) + (q.repondu ? ' · réponse obtenue' : '') + '</span></div><button class="btn-rond" data-sq="' + q.id + '" aria-label="Supprimer">' + ico('poubelle') + '</button></div>'; }).join('') : '<p class="vide">Quand Koro ne sait pas répondre, note la question ici pour la poser en classe.</p>') +
      '<form class="formulaire ajout-q">' + champ('Ajouter une question', '<input name="q" placeholder="Ma question…">') + '<button class="btn" type="submit">' + ico('plus') + ' Ajouter</button></form>');
    $$('[data-q]', r).forEach(function (b) { b.onclick = function () { var q = doc('questions', b.dataset.q); q.repondu = !q.repondu; poser('questions', q); Sons.jouer('coche'); fermerModale(); questionsProf(); }; });
    $$('[data-sq]', r).forEach(function (b) { b.onclick = function () { retirer('questions', b.dataset.sq); fermerModale(); questionsProf(); }; });
    var f = $('form', r); f.onsubmit = function (e) { e.preventDefault(); var t = f.q.value.trim(); if (!t) return; poser('questions', { id: uid(), texte: t, matiere: '', date: auj(), repondu: false }); fermerModale(); questionsProf(); };
  }

  /* ================================================================== RÉGLAGES */
  var ACCENTS = [['turquoise', 'Turquoise', '#1596d6'], ['corail', 'Corail', '#ef6b57'], ['violet', 'Violet', '#7c5cff'], ['vert', 'Vert', '#16a34a'], ['or', 'Or', '#d4a017']];
  function appliquerApparence() {
    var h = document.documentElement; if (PARAMS.get('theme')) R.theme = PARAMS.get('theme'); if (R.theme === 'auto') h.removeAttribute('data-theme'); else h.setAttribute('data-theme', R.theme);
    h.setAttribute('data-accent', R.accent); Sons.regler(R.sons);
  }
  function reglages() {
    var p = profil(), ml = matieres();
    var html = repli('r-profil', '<span>' + ico('personne') + ' Profil de l’élève</span>', '<form class="formulaire" id="f-profil">' +
      champ('Prénom', '<input name="prenom" value="' + esc(p.prenom) + '">') +
      '<div class="deux">' + champ('Classe', '<input name="classe" value="' + esc(p.classe || '3e') + '">') + champ('Année scolaire', '<input name="annee" value="' + esc(p.annee || '') + '">') + '</div>' +
      champ('Établissement', '<input name="etablissement" value="' + esc(p.etablissement || '') + '">') +
      '<div class="deux">' + champ('Trimestre en cours', '<select name="trimestre">' + opt([1, 2, 3], p.trimestre || 1) + '</select>') + champ('Date du BEPC', '<input name="bepc" type="date" value="' + esc(p.bepc || '') + '">') + '</div>' +
      '<button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></form>', true);
    html += repli('r-matieres', '<span>' + ico('livre') + ' Matières et coefficients</span>', '<form class="formulaire" id="f-mat"><p class="aide">Recopie les coefficients inscrits sur le bulletin : la moyenne générale en dépend.</p>' +
      ml.map(function (m, i) { return '<div class="ligne-reg" data-i="' + i + '">' + pastilleMat(m, true) + '<input name="nom' + i + '" value="' + esc(m.nom) + '" aria-label="Nom de la matière"><select name="coef' + i + '" aria-label="Coefficient">' + opt([1, 2, 3, 4, 5, 6], m.coef) + '</select><button type="button" class="btn-rond" data-retire="' + i + '" aria-label="Retirer">' + ico('croix') + '</button></div>'; }).join('') +
      '<div class="rang-btn"><button type="button" class="btn sec" id="aj-mat">' + ico('plus') + ' Matière</button><button class="btn" type="submit">' + ico('coche') + ' Enregistrer</button></div></form>');
    html += repli('r-app', '<span>' + ico('palette') + ' Apparence et sons</span>', '<div class="formulaire">' +
      champ('Thème', '<select id="theme">' + opt([['auto', 'Automatique (comme le téléphone)'], ['clair', 'Clair'], ['sombre', 'Sombre']], R.theme) + '</select>') +
      '<div class="champ"><span>Couleur</span><div class="nuancier">' + ACCENTS.map(function (a) { return '<button type="button" data-acc="' + a[0] + '" class="' + (R.accent === a[0] ? 'on' : '') + '" style="background:' + a[2] + '" aria-label="' + a[1] + '"></button>'; }).join('') + '</div></div>' +
      '<label class="interrupteur"><input type="checkbox" id="sons"' + (R.sons ? ' checked' : '') + '><i></i><span>Sons de l’application</span></label></div>');
    if (MODE !== 'demo') {
      html += repli('r-compte', '<span>' + ico('cadenas') + ' Mon compte</span>', '<p class="texte">Connecté en tant que <b>' + (S.role === 'parent' ? 'parent' : 'élève') + '</b>.</p>' +
        '<form class="formulaire" id="f-code">' + champ('Code actuel', '<input name="ancien" type="password" autocomplete="current-password" required>') + champ('Nouveau code (6 caractères au moins)', '<input name="nouveau" type="password" autocomplete="new-password" minlength="6" required>') + '<p class="erreur"></p><button class="btn sec" type="submit">Changer mon code</button></form>' +
        (S.role === 'parent' ? '<button class="btn sec plein" id="code-eleve">' + ico('personne') + ' Nouveau code de départ pour l’élève</button>' : '') +
        '<button class="btn sec danger plein" id="sortir">' + ico('sortie') + ' Se déconnecter de cet appareil</button>');
    }
    html += repli('r-donnees', '<span>' + ico('telecharger') + ' Mes données</span>', '<p class="texte">' + (MODE === 'demo' ? 'Démonstration : les données sont fictives et restent sur cet appareil.' : 'Tes données sont enregistrées dans le compte Google de ta famille, et gardées sur ce téléphone pour s’ouvrir même sans réseau.' + (S.maj ? ' Dernier échange : ' + esc(new Date(S.maj).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })) + '.' : '') + (S.file.length ? ' ' + pluriel(S.file.length, 'modification') + ' en attente d’envoi.' : '')) + '</p>' +
      '<div class="rang-btn col"><button class="btn sec" id="exporter">' + ico('telecharger') + ' Télécharger une copie (fichier)</button>' + (MODE === 'demo' ? '<button class="btn sec danger" id="raz">' + ico('retourner') + ' Remettre la démo à zéro</button>' : '<button class="btn sec" id="sync">' + ico('sync') + ' Synchroniser maintenant</button>') + '</div>');
    html += repli('r-apropos', '<span>' + ico('info') + ' À propos</span>', '<div class="apropos">' + LOGO + '<div><b>Kalan</b><span>Version 1.0 · « kalan » : apprendre, en dioula</span></div></div><p class="texte">Kalan est une solution <b>SoluGis</b> — Solutions numériques &amp; IA, Abidjan.<br>Koro calcule tout sur le téléphone : aucune donnée n’est envoyée à un service d’intelligence artificielle.</p><p class="texte doux">Assistance SoluGis : WhatsApp +225 01 72 76 77 91</p>');
    var r = ouvrirModale('Réglages', html, { plein: true }); activerReplis(r);
    var fp = $('#f-profil', r);
    fp.onsubmit = function (e) { e.preventDefault(); var d = Object.assign({}, profil(), { id: 'profil', prenom: fp.prenom.value.trim(), classe: fp.classe.value.trim(), annee: fp.annee.value.trim(), etablissement: fp.etablissement.value.trim(), trimestre: +fp.trimestre.value, bepc: fp.bepc.value }); poser('profil', d); NAV.tri = 0; ecrireL('nav', NAV); Sons.jouer('enregistre'); toast('Profil enregistré.'); };
    var fm = $('#f-mat', r), liste = ml.map(function (m) { return Object.assign({}, m); });
    fm.onsubmit = function (e) { e.preventDefault(); liste.forEach(function (m, i) { if (fm['nom' + i]) { m.nom = fm['nom' + i].value.trim() || m.nom; m.coef = +fm['coef' + i].value; } }); poser('reglages', { id: 'matieres', verifie: true, liste: liste.filter(function (m) { return !m._retire; }) }); Sons.jouer('enregistre'); toast('Matières enregistrées.'); fermerModale(); reglages(); };
    $$('[data-retire]', fm).forEach(function (b) { b.onclick = async function () { var i = +b.dataset.retire, m = liste[i], n = tous('notes').filter(function (x) { return x.matiere === m.id; }).length; if (await demander('Retirer « ' + m.nom + ' » ?' + (n ? ' Ses ' + n + ' notes sont gardées mais ne compteront plus.' : ''), 'Retirer')) { m._retire = true; b.closest('.ligne-reg').remove(); } }; });
    $('#aj-mat', fm).onclick = function () {
      var couleurs = ['#64748b', '#0891b2', '#c026d3', '#65a30d', '#ea580c'], id = 'm' + uid().slice(-5);
      liste.push({ id: id, nom: 'Nouvelle matière', coef: 1, couleur: couleurs[liste.length % couleurs.length], icone: 'livre' });
      poser('reglages', { id: 'matieres', liste: liste.filter(function (m) { return !m._retire; }) }); fermerModale(); reglages();
    };
    $('#theme', r).onchange = function () { R.theme = this.value; ecrireL('reglages', R); appliquerApparence(); };
    $$('[data-acc]', r).forEach(function (b) { b.onclick = function () { R.accent = b.dataset.acc; ecrireL('reglages', R); appliquerApparence(); $$('[data-acc]', r).forEach(function (x) { x.classList.toggle('on', x === b); }); Sons.jouer('onglet', 2); }; });
    $('#sons', r).onchange = function () { R.sons = this.checked; ecrireL('reglages', R); appliquerApparence(); Sons.jouer('enregistre'); };
    if (MODE !== 'demo') {
      var fc = $('#f-code', r);
      fc.onsubmit = async function (e) { e.preventDefault(); try { await appel('changerCode', { ancien: fc.ancien.value, nouveau: fc.nouveau.value }); fc.reset(); toast('Code changé.'); } catch (x) { $('.erreur', fc).textContent = x.message; } };
      if ($('#code-eleve', r)) $('#code-eleve', r).onclick = async function () {
        if (!(await demander('Créer un nouveau code de départ pour l’élève ? Son code actuel ne marchera plus.', 'Créer'))) return;
        try { var x = await appel('codeEleve', {}); ouvrirModale('Code de départ de l’élève', '<p class="texte">Donne ce code à ton enfant. À sa première connexion, il choisira son propre code. Valable 3 jours.</p><p class="code-grand">' + esc(x.code) + '</p>'); } catch (y) { toast(y.message); }
      };
      $('#sortir', r).onclick = async function () { if (await demander('Se déconnecter de cet appareil ?' + (S.file.length ? ' Attention : ' + pluriel(S.file.length, 'modification') + ' pas encore envoyée' + (S.file.length > 1 ? 's' : '') + '.' : ''), 'Se déconnecter')) { appel('deconnexion', {}).catch(function () {}); deconnecter(); } };
      $('#sync', r).onclick = async function () { await synchroniser(); await rafraichir(); toast(sync.etat === 'ok' ? 'Tout est à jour.' : 'Pas de réseau pour l’instant.'); };
    } else {
      $('#raz', r).onclick = async function () { if (await demander('Remettre la démonstration à zéro ?', 'Remettre à zéro')) { S.data = window.KALAN_DEMO(auj()); CHAT = []; sauver(); ecrireL('chat', CHAT); fermerModales(); dessiner(); } };
    }
    $('#exporter', r).onclick = function () {
      var blob = new Blob([JSON.stringify({ application: 'Kalan', exporte: new Date().toISOString(), donnees: S.data }, null, 1)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kalan-' + (profil().prenom || 'eleve').toLowerCase() + '-' + auj() + '.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
  }

  /* ================================================================== démarrage */
  function demarrer() {
    appliquerApparence();
    if (MODE === 'demo') { if (!S.data || PARAMS.get('raz')) { S.data = window.KALAN_DEMO(auj()); CHAT = []; ecrireL('chat', CHAT); sauver(); } }
    else if (!S.jeton) { porte(); return; }
    if (!S.data) S.data = {};
    if (PARAMS.get('vue')) { var pv = PARAMS.get('vue').split('/'); NAV.vue = pv[0]; if (pv[1]) NAV[pv[0] === 'agenda' ? 'agenda' : 'cours'] = pv[1]; }
    charpente(); dessiner();
    var ov = PARAMS.get('ouvrir');    // aperçus : ?ouvrir=reglages|fiche|cours|note|matiere
    if (ov) setTimeout(function () {
      var f = tous('fiches')[0], c = tous('cours')[0];
      ({ reglages: reglages, fiche: function () { voirFiche(f); }, cours: function () { voirCours(c); }, note: function () { formNote(null); }, matiere: function () { detailMatiere('ma', 1); }, ecrire: function () { formCoursTexte(c); } }[ov] || function () {})();
    }, 50);
    if (MODE !== 'demo') { rafraichir(); if (S.file.length) synchroniser(); }
  }
  var dejaSonne = false;
  document.addEventListener('pointerdown', function () { Sons.debloquer(); if (!dejaSonne) { dejaSonne = true; if (S.jeton || MODE === 'demo') Sons.jouer('ouverture'); } }, { once: true, capture: true });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && MODE !== 'demo' && S.jeton && Date.now() - S.maj > 60000) rafraichir(); });
  window.addEventListener('online', function () { planifierSync(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.KALAN = { S: S, aller: aller, ctx: ctx, fermer: fermerModales, ouvrir: { formCours: formCours, formDevoir: formDevoir, formNote: formNote, detailMatiere: detailMatiere, formChapitre: formChapitre, voirCours: voirCours, formCoursTexte: formCoursTexte, voirFiche: voirFiche, formFiche: formFiche, reglages: reglages, questionsProf: questionsProf }, doc: doc, tous: tous };   // pour le banc d'essai et les contrôles
  demarrer();
})();
