/* LOFT ELEVEN · PRIVATE OFFICE — socle de l'interface : accès aux données, état, outils, composants. */
'use strict';
var CFG = window.LE_CONFIG || { mode: 'demo' };

/* ------------------------------------------------------------------ stockage local prudent */
var Local = {
  lire: function (k, defaut) { try { var v = localStorage.getItem(k); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; } },
  ecrire: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  effacer: function (k) { try { localStorage.removeItem(k); } catch (e) { } }
};

/* ------------------------------------------------------------------ accès aux données
   Démonstration : le moteur tourne dans le téléphone, sur des données fictives.
   Production : chaque lecture et écriture passe par le service Apps Script (droits vérifiés côté serveur). */
var API = (function () {
  var demo = CFG.mode !== 'serveur';
  var CLE_DB = 'le.demo.db.v4', CLE_PROFIL = 'le.demo.profil', CLE_JETON = 'le.jeton';
  var base = null, vueCourante = null, moi = null, mfaExige = false, jeton = Local.lire(CLE_JETON, null);

  /* ---- démonstration */
  function chargerDemo() {
    var auj = LE.jour();
    base = Local.lire(CLE_DB, null);
    var intacte = base && !LE.valeurs(base.journal).length;
    if (!base || !base.demo || (intacte && base.meta.demoCreeLe !== auj)) { base = DEMO.creerBase(auj); Local.ecrire(CLE_DB, base); }
  }
  function profilDemo() {
    var email = Local.lire(CLE_PROFIL, 'direction@demo.loft-eleven.ci');
    return LE.valeurs(base.utilisateurs).filter(function (u) { return u.email === email && u.actif; })[0] || base.utilisateurs['US-DIRECTION'];
  }
  function rafraichirVue() { moi = profilDemo(); vueCourante = LE.vue(base, moi, LE.jour()); }

  /* ---- serveur Apps Script (une seule connexion Google par appel, délai maximal et reprises) */
  function appel(fn, args, options) {
    options = options || {};
    var essais = options.essais === undefined ? 2 : options.essais, delai = options.delai || 20000;
    return new Promise(function (ok, ko) {
      var tentative = 0;
      (function essayer() {
        tentative++;
        var ctrl = window.AbortController ? new AbortController() : null, fini = false;
        var minuteur = setTimeout(function () { if (ctrl) ctrl.abort(); echec(new Error('Le serveur ne répond pas.')); }, delai);
        function echec(e) { if (fini) return; fini = true; clearTimeout(minuteur); if (tentative <= essais && !e.refus) setTimeout(essayer, 900 * tentative); else ko(e); }
        fetch(CFG.url, { method: 'POST', body: JSON.stringify({ fn: fn, args: args || {}, jeton: jeton }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctrl ? ctrl.signal : undefined, redirect: 'follow' })
          .then(function (r) { return r.json(); })
          .then(function (r) {
            if (fini) return; fini = true; clearTimeout(minuteur);
            if (r && r.ok) return ok(r);
            var e = new Error((r && r.message) || 'Réponse inattendue du serveur.'); e.refus = true; e.code = r && r.code;
            if (e.code === 'session') { jeton = null; Local.effacer(CLE_JETON); }
            ko(e);
          })
          .catch(function (e) { echec(navigator.onLine === false ? new Error('Pas de connexion internet.') : e); });
      })();
    });
  }
  function fusionner(enr) {
    Object.keys(enr || {}).forEach(function (col) {
      Object.keys(enr[col]).forEach(function (id) { if (enr[col][id] === null) delete vueCourante[col][id]; else vueCourante[col][id] = enr[col][id]; });
    });
  }

  function nouvelOpId() { return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  return {
    demo: demo,
    demarrer: function () {
      if (demo) { chargerDemo(); rafraichirVue(); return Promise.resolve({ pret: true }); }
      if (!jeton) return Promise.resolve({ pret: false });
      return this.etat().then(function () { return { pret: true }; }, function (e) { return { pret: false, erreur: e.code === 'session' ? '' : e.message }; });
    },
    connexion: function (email, code, totp, nouveau) {
      return appel('connexion', { email: email, code: code, totp: totp || '', nouveau: nouveau || '' }, { essais: 1 }).then(function (r) {
        if (r.jeton) { jeton = r.jeton; Local.ecrire(CLE_JETON, jeton); }
        return r;
      });
    },
    etat: function () {
      if (demo) { rafraichirVue(); return Promise.resolve({ moi: moi, db: vueCourante }); }
      return appel('etat', {}).then(function (r) { moi = r.moi; vueCourante = r.db; mfaExige = !!r.mfaObligatoire; return { moi: moi, db: vueCourante, mfaObligatoire: mfaExige }; });
    },
    ecrire: function (op) {
      op.opId = op.opId || nouvelOpId();
      if (demo) {
        return new Promise(function (ok, ko) {
          setTimeout(function () {
            try { var r = LE.appliquer(base, profilDemo(), op); Local.ecrire(CLE_DB, base); rafraichirVue(); ok(r); }
            catch (e) { ko(e); }
          }, 140);
        });
      }
      return appel('ecrire', { op: op }).then(function (r) { fusionner(r.enregistrements); vueCourante.meta.version = r.version; return r; });
    },
    moi: function () { return moi; },
    mfaObligatoire: function () { return mfaExige; },
    db: function () { return vueCourante; },
    deconnexion: function () {
      if (demo) return Promise.resolve();
      var j = jeton; jeton = null; Local.effacer(CLE_JETON);
      return j ? fetch(CFG.url, { method: 'POST', body: JSON.stringify({ fn: 'deconnexion', jeton: j }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }).catch(function () { }) : Promise.resolve();
    },
    mfa: function (etape, code) { return appel('mfa', { etape: etape, code: code || '' }, { essais: 1 }); },
    changerCode: function (ancien, nouveau) { return appel('changerCode', { ancien: ancien, nouveau: nouveau }, { essais: 1 }); },
    codeAcces: function (id) { return demo ? Promise.resolve({ code: null, demo: true }) : appel('codeAcces', { id: id }, { essais: 0 }); },
    /* Photos : en démonstration, gardées dans ce navigateur (IndexedDB) ; en production, dans le Drive privé du client. */
    envoyerPhoto: function (dataUrl) {
      if (demo) return Photos.garder(dataUrl);
      return appel('photoEnvoyer', { dataUrl: dataUrl }, { essais: 1, delai: 45000 }).then(function (r) { Photos.memoire[r.id] = dataUrl; return r.id; });
    },
    photo: function (id) {
      if (Photos.memoire[id]) return Promise.resolve(Photos.memoire[id]);
      if (demo) return Photos.lire(id);
      return appel('photo', { id: id }).then(function (r) { Photos.memoire[id] = r.dataUrl; return r.dataUrl; }, function () { return null; });
    },
    profil: function (email) { Local.ecrire(CLE_PROFIL, email); if (base) rafraichirVue(); },
    profilCourant: function () { return Local.lire(CLE_PROFIL, 'direction@demo.loft-eleven.ci'); },
    reinitialiser: function () { base = DEMO.creerBase(LE.jour()); Local.ecrire(CLE_DB, base); Photos.vider(); rafraichirVue(); },
    jetonPresent: function () { return !!jeton; }
  };
})();

var Photos = {
  memoire: {},
  _db: function () {
    return new Promise(function (ok, ko) {
      if (!window.indexedDB) return ko(new Error('indisponible'));
      var r = indexedDB.open('loft-eleven-photos', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('p'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ko(r.error); };
    });
  },
  garder: function (dataUrl) {
    var id = 'ph-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    Photos.memoire[id] = dataUrl;
    return Photos._db().then(function (db) { return new Promise(function (ok) { var t = db.transaction('p', 'readwrite'); t.objectStore('p').put(dataUrl, id); t.oncomplete = function () { ok(id); }; t.onerror = function () { ok(id); }; }); }, function () { return id; });
  },
  lire: function (id) {
    return Photos._db().then(function (db) { return new Promise(function (ok) { var r = db.transaction('p').objectStore('p').get(id); r.onsuccess = function () { if (r.result) Photos.memoire[id] = r.result; ok(r.result || null); }; r.onerror = function () { ok(null); }; }); }, function () { return null; });
  },
  vider: function () { Photos.memoire = {}; try { indexedDB.deleteDatabase('loft-eleven-photos'); } catch (e) { } },
  /* Réduit une image (1600 px, JPEG) avant envoi : rapide sur réseau mobile. */
  reduire: function (fichier, max) {
    max = max || 1600;
    return new Promise(function (ok, ko) {
      var lecteur = new FileReader();
      lecteur.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = function () { ko(new Error('Image illisible.')); };
        img.src = lecteur.result;
      };
      lecteur.onerror = function () { ko(new Error('Fichier illisible.')); };
      lecteur.readAsDataURL(fichier);
    });
  }
};

/* ------------------------------------------------------------------ état de l'interface */
var S = {
  db: null, moi: null, auj: LE.jour(),
  filtre: Local.lire('le.filtre', { societeId: '', branchId: '', bienId: '', periode: '30j', debut: '', fin: '' }),
  prefs: (function () {
    var p = Local.lire('le.prefs', { theme: 'clair', palette: 'saumon', sons: false, ambiance: false, volume: 0.6, barre: 'ouverte', garder: false });
    if (!p.palette) { p.palette = 'saumon'; p.theme = 'clair'; }   // première version : sombre par défaut, abandonné le 29/10/2026
    return p;
  })(),
  route: { nom: 'accueil', p: [] }, enLigne: navigator.onLine !== false, alertesVues: Local.lire('le.alertesVues', 0)
};
function sauverFiltre() { Local.ecrire('le.filtre', S.filtre); }
function sauverPrefs() { Local.ecrire('le.prefs', S.prefs); }

/* ------------------------------------------------------------------ outils */
var L = LE.LISTES, V = LE.valeurs;
function esc(s) { return s === null || s === undefined ? '' : String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fc(n) { return LE.fcfa(n); }
function nombre(n) { return n === null || n === undefined || isNaN(n) ? '—' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
function montantHTML(n) { return n === null || n === undefined ? '<span class="texte-3">Non renseigné</span>' : (n < 0 ? '−' : '') + nombre(Math.abs(n)) + '<small>FCFA</small>'; }
function pct(x, dec) { return x === null || x === undefined || isNaN(x) ? '—' : (x * 100).toFixed(dec || 0).replace('.', ',') + ' %'; }
var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function dObj(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
function dateLongue(s) { if (!s) return ''; var d = dObj(s); return JOURS[d.getDay()] + ' ' + d.getDate() + (d.getDate() === 1 ? 'er' : '') + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear(); }
function dateCourte(s, annee) { if (!s) return '—'; var d = dObj(s); return d.getDate() + ' ' + MOIS_C[d.getMonth()] + (annee || d.getFullYear() !== dObj(S.auj).getFullYear() ? ' ' + d.getFullYear() : ''); }
function dateRel(s) {
  if (!s) return ''; var e = LE.ecart(S.auj, s);
  return e === 0 ? 'aujourd’hui' : e === 1 ? 'demain' : e === -1 ? 'hier' : e > 1 && e < 7 ? JOURS[dObj(s).getDay()] : dateCourte(s);
}
function heureDe(iso) { return iso ? iso.slice(11, 16) : ''; }
function initiales(n) { return String(n || '?').replace(/^(M\.|Mme|Mlle)\s+/, '').split(/\s+/).map(function (x) { return x.charAt(0); }).join('').slice(0, 2).toUpperCase(); }
function nomDe(col, id, champ) { var r = id && S.db[col] && S.db[col][id]; return r ? r[champ || 'nom'] : ''; }
function peut(module, n) { return LE.niveau(S.moi, module) >= (n || 1); }
function propre() { return !!(S.moi && LE.ROLES[S.moi.role].propre); }
function bonjour() { var h = new Date().getHours(); return h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'; }
function prenom(n) { var p = String(n || '').replace(/^(M\.|Mme|Mlle)\s+/, '').split(' '); return p[0]; }
function uid() { return Math.random().toString(36).slice(2, 9); }
function trierPar(l, f, inverse) { return l.slice().sort(function (a, b) { var x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * (inverse ? -1 : 1); }); }

/* Filtre courant appliqué aux enregistrements (société, branche, bien). */
function dansFiltre(r) {
  var f = S.filtre;
  if (f.societeId && r.societeId !== f.societeId) return false;
  if (f.branchId && r.branchId !== f.branchId) return false;
  if (f.bienId && r.bienId !== f.bienId && r.id !== f.bienId) return false;
  return true;
}
function periodeCourante() { return LE.periode(S.filtre.periode, S.auj, S.filtre.debut, S.filtre.fin); }
function nomPerimetre() {
  var f = S.filtre;
  if (f.bienId && S.db.biens[f.bienId]) return S.db.biens[f.bienId].nom;
  if (f.branchId && S.db.branches[f.branchId]) return S.db.branches[f.branchId].nom;
  if (f.societeId && S.db.societes[f.societeId]) return S.db.societes[f.societeId].nom;
  return Object.keys(S.db.societes).length > 1 ? 'Tout le groupe' : (V(S.db.societes)[0] || {}).nom || 'Mon périmètre';
}
var _kpiCache = { cle: '', val: null };
function kpis(filtre) {
  var p = periodeCourante(), f = filtre || { societeId: S.filtre.societeId, branchId: S.filtre.branchId, bienId: S.filtre.bienId };
  var cle = [S.db.meta.version, S.moi.id, p.debut, p.fin, f.societeId, f.branchId, f.bienId, S.auj, Object.keys(S.db.paiements).length].join('|');
  if (_kpiCache.cle === cle) return _kpiCache.val;
  var k = LE.indicateurs(S.db, { societeId: f.societeId, branchId: f.branchId, bienId: f.bienId, debut: p.debut, fin: p.fin, aujourdhui: S.auj });
  _kpiCache = { cle: cle, val: k }; return k;
}
var _alCache = { cle: '', val: null };
function alertesCourantes() {
  var cle = [S.db.meta.version, S.moi.id, S.filtre.societeId, S.filtre.branchId, S.filtre.bienId, S.auj, Object.keys(S.db.paiements).length].join('|');
  if (_alCache.cle !== cle) _alCache = { cle: cle, val: LE.alertes(S.db, S.auj, { societeId: S.filtre.societeId, branchId: S.filtre.branchId, bienId: S.filtre.bienId }) };
  return _alCache.val;
}

/* ------------------------------------------------------------------ icônes (dessinées pour Loft Eleven, trait fin) */
var ICONES = {
  accueil: '<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v10.5h13V9"/><path d="M10 19.5v-5h4v5"/>',
  biens: '<path d="M4 20.5h16"/><path d="M6 20.5V6.5L12 3.5l6 3v14"/><path d="M9.5 9h1M13.5 9h1M9.5 12.5h1M13.5 12.5h1M9.5 16h1M13.5 16h1"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2"/>',
  finance: '<rect x="3" y="6" width="18" height="13.5" rx="2.5"/><path d="M3 10h18"/><path d="M15.5 14.5h2.5"/><path d="M6 6V4.8a1 1 0 0 1 1.2-1l10 2.2"/>',
  rapports: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  plus: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  conciergerie: '<path d="M4 17.5h16"/><path d="M5.5 17.5a6.5 6.5 0 0 1 13 0"/><path d="M12 11V9.2"/><path d="M10.5 9.2h3"/><path d="M3 20.5h18"/>',
  projets: '<path d="M4 20.5h16"/><path d="M6 20.5v-8l6-5 6 5v8"/><path d="M14.5 4.5l5 4"/><path d="M10 20.5v-4.5h4v4.5"/>',
  studio: '<path d="M5 20.5h14"/><path d="M7 20.5v-5.5h10v5.5"/><path d="M6 15l1.5-6.5h9L18 15"/><path d="M12 8.5V4"/><circle cx="12" cy="3.5" r=".6"/>',
  contacts: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.5a3 3 0 0 1 0 6"/><path d="M17.5 14.5a5 5 0 0 1 3 5"/>',
  acces: '<path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z"/><path d="M9.3 12.2l1.9 1.9 3.7-3.9"/>',
  journal: '<path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
  reglages: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  recherche: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  cloche: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  son: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  muet: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  ajout: '<path d="M12 5v14M5 12h14"/>',
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>', bas: '<path d="M6 9.5l6 6 6-6"/>',
  retour: '<path d="M19 12H5.5"/><path d="M11 6l-6 6 6 6"/>',
  photo: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  lieu: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  lit: '<path d="M3 18.5V6.5M3 14h18v4.5M21 14v-2.5a3 3 0 0 0-3-3h-7.5V14"/><circle cx="6.8" cy="11" r="1.6"/>',
  personnes: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.5 14.4a4.5 4.5 0 0 1 5 4.6"/>',
  surface: '<path d="M4 4h16v16H4z"/><path d="M4 9h3M4 14h2M9 4v3M14 4v2"/>',
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alerte: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  export: '<path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 16v3.5h15V16"/>',
  imprimer: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  lune: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  sortie: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  panneau: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9 4.5v15"/>',
  etoile: '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.6l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z"/>',
  filtre: '<path d="M4 5.5h16l-6.2 7.2v5.6l-3.6 1.7v-7.3z"/>',
  arrivee: '<path d="M10 4.5H5.5v15H10"/><path d="M14 8l4 4-4 4M18 12H8"/>',
  depart: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  menage: '<path d="M14.5 3.5 10 12"/><path d="M6 12.5h8l1.5 8h-11z"/><path d="M8.5 16.5v4M11.5 16.5v4"/>',
  outil: '<path d="M14.8 5.2a4 4 0 0 0-5.3 5.3L4 16l4 4 5.5-5.5a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  maison: '<path d="M4 11 12 4.5l8 6.5"/><path d="M6 9.5v10h12v-10"/>',
  carte: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  banque: '<path d="M3.5 9 12 4.5 20.5 9z"/><path d="M5.5 9.5v7M10 9.5v7M14 9.5v7M18.5 9.5v7M3.5 19.5h17"/>',
  telephone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  especes: '<rect x="3" y="7" width="18" height="10" rx="1.5"/><circle cx="12" cy="12" r="2.3"/><path d="M6 10v4M18 10v4"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  facture: '<path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5z"/><path d="M9 8h6M9 11.5h6M9 15h4"/>',
  depense: '<path d="M12 4v16"/><path d="M8 8.5c0-2 1.8-3 4-3s4 1 4 3-1.8 2.6-4 3.5-4 1.5-4 3.5 1.8 3 4 3 4-1 4-3"/>',
  tache: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M14 9l2 2"/>',
  boucle: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  oeil: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  installer: '<path d="M12 3.5v11M7.5 10 12 14.5 16.5 10"/><rect x="4" y="16.5" width="16" height="4" rx="1.5"/>',
  musique: '<path d="M9 18.5V6l11-2.5v12"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>'
};
function ic(nom, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nom] || ICONES.info) + '</svg>'; }
var MONOGRAMME = '<svg class="monogramme" viewBox="0 0 80 80" aria-hidden="true"><rect x="1.5" y="1.5" width="77" height="77" rx="3" fill="none" style="stroke:var(--accent)" stroke-width="1.2"/><rect x="6.5" y="6.5" width="67" height="67" rx="1.5" fill="none" style="stroke:var(--accent)" stroke-width=".5" opacity=".55"/>'
  + '<path d="M23 21v38h17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/><path d="M48 21v38M57 21v38" fill="none" style="stroke:var(--accent)" stroke-width="2.4"/></svg>';
var PALETTES = {
  saumon: { nom: 'Saumon & ivoire', sous: 'Douceur et élégance', couleurs: ['#FBF6F1', '#E08E79', '#2E2421'] },
  poudre: { nom: 'Rose poudré & champagne', sous: 'Plus discret, très feutré', couleurs: ['#FBF7F6', '#D3A29B', '#2C2426'] },
  terracotta: { nom: 'Terracotta & sable', sous: 'Chaleureux, ancré à Abidjan', couleurs: ['#F8F2EA', '#AA5334', '#2B221C'] },
  charbon: { nom: 'Charbon & champagne', sous: 'Première proposition', couleurs: ['#F4F0E9', '#C8AD7F', '#14181B'] }
};

/* ------------------------------------------------------------------ visuels de biens (en l'absence de photographies)
   Compositions architecturales abstraites, propres à chaque ambiance : à remplacer par les photos réelles des biens. */
/* En affichage clair : tons pastel, traits taupe, soleil saumon. En sombre : tons profonds, traits champagne. */
var AMBIANCES_CLAIR = {
  azur: ['#E9D3CA', '#F6EEE9'], lagune: ['#CCD9DD', '#ECF1F2'], ivoire: ['#EADBCB', '#FBF6F0'], signature: ['#E0C9C4', '#F5ECEA'], palmes: ['#D3DCCB', '#EFF1EA'],
  emeraude: ['#C9D6CC', '#ECF0EB'], horizon: ['#D8D1CB', '#F2EFEC'], palmeraie: ['#E1D5C0', '#F6F0E6'], bassam: ['#D2DCDF', '#EEF1F2']
};
var AMBIANCES = {
  azur: ['#22343C', '#5B7F88', '#C8AD7F'], lagune: ['#1E2A33', '#3E5A68', '#D9C29A'], ivoire: ['#2B2824', '#8A7A63', '#F4F0E9'], signature: ['#1B1D22', '#4B4A56', '#C8AD7F'],
  palmes: ['#1F2B24', '#4E6B55', '#D9C29A'], emeraude: ['#17251F', '#2F5446', '#C8AD7F'], horizon: ['#1C2024', '#59626B', '#C8AD7F'], palmeraie: ['#262620', '#6C6A50', '#E4D6B8'], bassam: ['#1D2830', '#6D8A93', '#E8D8B8']
};
function art(bien) {
  var clair = document.documentElement.getAttribute('data-theme') !== 'sombre';
  var a = AMBIANCES[bien.ambiance] || AMBIANCES.signature, n = 0;
  if (clair) { var c = AMBIANCES_CLAIR[bien.ambiance] || AMBIANCES_CLAIR.signature; a = [c[0], c[1], '#9A7466']; }
  for (var i = 0; i < (bien.id || '').length; i++) n = (n * 31 + bien.id.charCodeAt(i)) % 997;
  var g = 'g' + (bien.id || uid()).replace(/[^a-z0-9]/gi, ''), t = bien.type, s = '';
  s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a[1] + '"/><stop offset="1" stop-color="' + a[0] + '"/></linearGradient>'
    + '<radialGradient id="' + g + 'l" cx="' + (0.65 + (n % 20) / 100) + '" cy=".18" r=".55"><stop offset="0" stop-color="' + (clair ? '#FFFFFF' : a[2]) + '" stop-opacity="' + (clair ? '.8' : '.45') + '"/><stop offset="1" stop-color="' + (clair ? '#FFFFFF' : a[2]) + '" stop-opacity="0"/></radialGradient></defs>';
  s += '<rect width="320" height="200" fill="url(#' + g + ')"/><rect width="320" height="200" fill="url(#' + g + 'l)"/>';
  var ligne = 'fill="none" stroke="' + a[2] + '" stroke-width=".9" opacity=".75"';
  if (t === 'villa') {
    s += '<path d="M40 150h240M60 150V98h120v52M180 150V82h80v68M56 98l64-30 64 30M176 82l44-22 44 22" ' + ligne + '/>';
    s += '<path d="M80 150v-32h22v32M120 118h40v18h-40zM196 100h20v22h-20zM228 100h20v22h-20z" ' + ligne + '/><path d="M30 172h260" stroke="' + a[2] + '" opacity=".35"/><path d="M40 162h70" stroke="#9FC3C9" stroke-width="3" opacity=".35"/>';
    s += '<path d="M276 150c-2-26 4-46 18-60M294 90c-12 2-20 8-24 16M294 90c-4 8-4 16 0 24M294 90c10 2 16 8 18 16" ' + ligne + '/>';
  } else if (t === 'penthouse' || t === 'appartement' || t === 'studio') {
    var etages = t === 'studio' ? 6 : 7, x0 = 96 + (n % 3) * 10;
    for (var e = 0; e < etages; e++) s += '<path d="M' + x0 + ' ' + (60 + e * 14) + 'h120" ' + ligne + ' opacity=".5"/>';
    s += '<path d="M' + x0 + ' 160V46h120v114M' + (x0 - 14) + ' 46h148" ' + ligne + '/><path d="M' + (x0 + 10) + ' 46V30h70v16" ' + ligne + '/>';
    for (var c = 0; c < 5; c++) s += '<path d="M' + (x0 + 14 + c * 22) + ' 60v100" ' + ligne + ' opacity=".35"/>';
    s += '<path d="M20 172h280" stroke="' + a[2] + '" opacity=".4"/><path d="M20 182c40-6 80 6 120 0s80-6 160 0" fill="none" stroke="' + a[2] + '" opacity=".25"/>';
  } else if (t === 'bureau') {
    s += '<path d="M110 168V30h100v138M130 168V50h60v118" ' + ligne + '/>';
    for (var r = 0; r < 9; r++) s += '<path d="M110 ' + (44 + r * 14) + 'h100" ' + ligne + ' opacity=".4"/>';
    s += '<path d="M40 168V110h50v58M230 168V90h50v78M20 168h280" ' + ligne + ' opacity=".55"/>';
  } else {
    s += '<path d="M30 150h260M70 150v-40h180v40M60 110l100-40 100 40" ' + ligne + '/><path d="M20 168h280" stroke="' + a[2] + '" opacity=".35"/>';
  }
  s += '<circle cx="' + (230 + n % 50) + '" cy="' + (36 + n % 14) + '" r="13" fill="' + (clair ? '#E9A08C' : a[2]) + '" opacity="' + (clair ? '.55' : '.22') + '"/>';
  return '<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + s + '</svg>';
}
function visuelBien(b, interieur, style) {
  var ph = (b.photos || [])[0];
  return '<div class="visuel"' + (style ? ' style="' + style + '"' : '') + (ph ? ' data-photo="' + esc(ph) + '"' : '') + '>' + art(b) + (interieur || '') + '</div>';
}
/* Remplace les visuels par les photos réelles, chargées à la demande. */
function chargerPhotos(racine) {
  (racine || document).querySelectorAll('[data-photo]').forEach(function (el) {
    var id = el.getAttribute('data-photo'); el.removeAttribute('data-photo');
    API.photo(id).then(function (src) { if (!src) return; var img = new Image(); img.alt = ''; img.src = src; img.onload = function () { el.insertBefore(img, el.firstChild); var a = el.querySelector('svg.art'); if (a) a.remove(); }; });
  });
}

/* ------------------------------------------------------------------ badges de statut */
var TON = {
  statutBien: { disponible: 'ok', occupee: 'or', reservee: 'info', preparation: 'att', maintenance: 'urg', indisponible: '', louee: 'or' },
  statutReservation: { option: 'info', confirmee: 'or', en_cours: 'ok', terminee: '', annulee: 'urg' },
  etatFacture: { payee: 'ok', partielle: 'info', a_echoir: 'or', en_retard: 'urg', annulee: '' },
  statutPaiement: { en_attente: 'att', confirme: 'ok', annule: '' },
  statutDepense: { engagee: 'att', payee: 'ok', annulee: '' },
  statutTache: { a_faire: 'info', en_cours: 'or', faite: 'att', validee: 'ok', annulee: '' },
  statutPrestation: { demandee: 'info', planifiee: 'or', en_cours: 'att', realisee: 'ok', annulee: '' },
  statutProjet: { etude: 'info', en_cours: 'or', livre: 'ok', suspendu: 'att', annule: '' },
  priorite: { normale: '', haute: 'att', urgente: 'urg' }
};
function badge(liste, v, texte) {
  var lib = texte || (liste === 'etatFacture' ? LE.ETAT_FACTURE[v] : (L[liste] || {})[v]) || v || '—';
  return '<span class="badge ' + ((TON[liste] || {})[v] || '') + '">' + esc(lib) + '</span>';
}

/* ------------------------------------------------------------------ graphiques (SVG faits main, sans bibliothèque) */
function courbe(series, etiquettes, opts) {
  opts = opts || {};
  var W = 640, H = opts.h || 210, g = 46, d = 8, hh = 16, b = 26, max = 0;
  series.forEach(function (s) { s.valeurs.forEach(function (v) { if (v > max) max = v; }); });
  if (!max) max = 1;
  var pas = Math.pow(10, Math.floor(Math.log10(max))), haut = Math.ceil(max / pas) * pas; if (haut / pas < 3) { pas /= 2; }
  var n = etiquettes.length, x = function (i) { return g + (n === 1 ? (W - g - d) / 2 : i * (W - g - d) / (n - 1)); }, y = function (v) { return hh + (H - hh - b) * (1 - v / haut); };
  var s = '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.titre || 'Graphique') + '">';
  for (var v = 0; v <= haut + 1; v += pas) s += '<line class="axe" x1="' + g + '" x2="' + (W - d) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (g - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + abrege(v) + '</text>';
  etiquettes.forEach(function (e, i) { if (n <= 12 || i % Math.ceil(n / 12) === 0) s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(e) + '</text>'; });
  series.forEach(function (se, k) {
    var pts = se.valeurs.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    if (k === 0 && !opts.sansAire) s += '<path d="M' + pts.join('L') + 'L' + x(n - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z" fill="' + se.couleur + '" opacity=".09"/>';
    s += '<path d="M' + pts.join('L') + '" fill="none" stroke="' + se.couleur + '" stroke-width="' + (k === 0 ? 2 : 1.5) + '"' + (se.pointille ? ' stroke-dasharray="4 4"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>';
    se.valeurs.forEach(function (v, i) { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (i === n - 1 ? 3.5 : 2.2) + '" fill="' + se.couleur + '"><title>' + esc(etiquettes[i] + ' · ' + se.nom + ' : ' + fc(v)) + '</title></circle>'; });
  });
  return s + '</svg>';
}
function abrege(v) { return v >= 1e9 ? (v / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + ' Md' : v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '').replace('.', ',') + ' M' : v >= 1e3 ? Math.round(v / 1e3) + ' k' : String(Math.round(v)); }
function spark(valeurs, couleur) {
  var max = Math.max.apply(null, valeurs.concat([1])), n = valeurs.length;
  var pts = valeurs.map(function (v, i) { return (i * 100 / Math.max(1, n - 1)).toFixed(1) + ',' + (32 - v / max * 28).toFixed(1); });
  return '<svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true"><path d="M' + pts.join('L') + '" fill="none" stroke="' + (couleur || 'var(--accent)') + '" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>';
}
function anneau(x, lib) {
  var r = 46, c = 2 * Math.PI * r, v = x === null ? 0 : Math.max(0, Math.min(1, x));
  return '<svg class="anneau" viewBox="0 0 120 120" role="img" aria-label="' + esc(lib || '') + '"><circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="5"/>'
    + '<circle cx="60" cy="60" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (c * v).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 60 60)"/>'
    + '<text x="60" y="66" text-anchor="middle" style="font: 300 24px var(--chiffres); fill: var(--texte)">' + (x === null ? '—' : Math.round(v * 100) + '%') + '</text></svg>';
}
function barresH(lignes, opts) {
  opts = opts || {}; var max = Math.max.apply(null, lignes.map(function (l) { return Math.abs(l.valeur); }).concat([1]));
  if (!lignes.length) return '<div class="vide-etat">Aucune donnée sur la période.</div>';
  return '<div class="barres-h">' + lignes.map(function (l) {
    return '<div class="barre-h' + (l.go ? ' cliquable' : '') + '"' + (l.go ? ' data-go="' + l.go + '"' : '') + '><div class="lib"><span>' + esc(l.nom) + '</span><span>' + (opts.format ? opts.format(l.valeur) : fc(l.valeur)) + '</span></div>'
      + '<div class="piste-h"><i style="width:' + (Math.abs(l.valeur) / max * 100).toFixed(1) + '%;background:' + (l.valeur < 0 ? 'var(--urg)' : (l.couleur || 'var(--accent)')) + '"></i></div></div>';
  }).join('') + '</div>';
}

/* ------------------------------------------------------------------ composants : toast, attente, feuille, popover */
function toast(msg, err) {
  var z = document.querySelector('.toasts'); if (!z) { z = document.createElement('div'); z.className = 'toasts'; z.setAttribute('role', 'status'); document.body.appendChild(z); }
  var t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.innerHTML = ic(err ? 'alerte' : 'ok') + '<span>' + esc(msg) + '</span>';
  z.appendChild(t); setTimeout(function () { t.classList.add('sortie'); setTimeout(function () { t.remove(); }, 320); }, err ? 4200 : 2600);
}
var _attente = 0;
function attente(on) { _attente += on ? 1 : -1; var el = document.querySelector('.attente'); if (_attente > 0 && !el) { el = document.createElement('div'); el.className = 'attente'; document.body.appendChild(el); } if (_attente <= 0 && el) { _attente = 0; el.remove(); } }

var Feuille = {
  pile: [],
  ouvrir: function (o) {
    var fond = document.createElement('div'); fond.className = 'voile-fond';
    var f = document.createElement('aside'); f.className = 'feuille'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true'); f.setAttribute('aria-label', o.titre);
    f.innerHTML = '<div class="feuille-tete"><div style="min-width:0">' + (o.surtitre ? '<div class="surtitre">' + esc(o.surtitre) + '</div>' : '') + '<h2>' + esc(o.titre) + '</h2>' + (o.sous ? '<p>' + o.sous + '</p>' : '') + '</div><button class="bt-icone" data-fermer aria-label="Fermer">' + ic('fermer') + '</button></div>'
      + '<div class="feuille-corps">' + (o.corps || '') + '</div>' + (o.pied ? '<div class="feuille-pied">' + o.pied + '</div>' : '');
    document.body.appendChild(fond); document.body.appendChild(f);
    var item = { fond: fond, f: f, o: o }; Feuille.pile.push(item);
    fond.addEventListener('click', function () { Feuille.fermer(); });
    f.querySelector('[data-fermer]').addEventListener('click', function () { Feuille.fermer(); });
    document.body.style.overflow = 'hidden';
    if (o.apres) o.apres(f);
    chargerPhotos(f);
    var premier = f.querySelector('input:not([type=checkbox]):not([type=hidden]), select, textarea');
    if (premier && window.matchMedia('(min-width: 761px)').matches) setTimeout(function () { premier.focus(); }, 80);
    return f;
  },
  fermer: function () {
    var item = Feuille.pile.pop(); if (!item) return;
    item.f.remove(); item.fond.remove();
    if (!Feuille.pile.length) document.body.style.overflow = '';
    if (item.o.ferme) item.o.ferme();
  },
  toutFermer: function () { while (Feuille.pile.length) Feuille.fermer(); },
  courante: function () { var i = Feuille.pile[Feuille.pile.length - 1]; return i && i.f; }
};
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (document.querySelector('.popover')) fermerPopover(); else Feuille.fermer(); } });

function popover(ancre, html, apres) {
  fermerPopover();
  var p = document.createElement('div'); p.className = 'popover'; p.innerHTML = html; document.body.appendChild(p);
  var r = ancre.getBoundingClientRect(), w = p.offsetWidth;
  var gauche = r.left + w <= window.innerWidth - 12 ? r.left : Math.max(12, r.right - w);
  p.style.left = gauche + 'px'; p.style.top = Math.min(r.bottom + 8, window.innerHeight - 80) + 'px';
  setTimeout(function () { document.addEventListener('click', _horsPopover, true); }, 0);
  if (apres) apres(p);
  return p;
}
function _horsPopover(e) { var p = document.querySelector('.popover'); if (p && !p.contains(e.target)) { fermerPopover(); if (e.target.closest('[data-pop]')) { e.stopPropagation(); e.preventDefault(); } } }
function fermerPopover() { var p = document.querySelector('.popover'); if (p) p.remove(); document.removeEventListener('click', _horsPopover, true); }

/* ------------------------------------------------------------------ formulaires génériques
   champ : { k, l, t: texte|long|montant|nombre|date|heure|select|case|liste|email|tel|code, opts, req, aide, plein, si(v), defaut } */
function opts(objet, vide) { var o = Object.keys(objet).map(function (k) { return [k, objet[k]]; }); return vide ? [['', vide]].concat(o) : o; }
function champHTML(c, v) {
  var id = 'c-' + c.k + '-' + uid(), val = v === undefined || v === null ? (c.defaut === undefined ? '' : c.defaut) : v, att = ' name="' + c.k + '" id="' + id + '"' + (c.req ? ' required' : '');
  var h = '<label class="champ' + (c.plein || c.t === 'long' || c.t === 'case' || c.t === 'multi' ? ' plein' : '') + '" data-champ="' + c.k + '" for="' + id + '">';
  if (c.t === 'multi') h = h.replace('<label', '<div').replace(' for="' + id + '"', '');
  if (c.t !== 'case') h += '<span>' + esc(c.l) + (c.req ? '' : ' <span class="texte-3" style="opacity:.6">· facultatif</span>') + '</span>';
  if (c.t === 'select') h += '<select' + att + '>' + (c.opts || []).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  else if (c.t === 'long') h += '<textarea' + att + ' rows="3">' + esc(val) + '</textarea>';
  else if (c.t === 'case') h += '<span class="case"><input type="checkbox"' + att + (val ? ' checked' : '') + '><span>' + esc(c.l) + '</span></span>';
  else if (c.t === 'montant') h += '<input type="text" inputmode="numeric" autocomplete="off" data-montant' + att + ' value="' + (val === '' ? '' : nombre(val)) + '" placeholder="0">';
  else if (c.t === 'nombre') h += '<input type="number" inputmode="decimal" min="0" step="any"' + att + ' value="' + esc(val) + '">';
  else if (c.t === 'liste') h += '<input type="text"' + att + ' value="' + esc((val || []).join(', ')) + '" placeholder="Séparer par des virgules">';
  else if (c.t === 'multi') h += '<span class="etiquettes" style="gap:10px 18px">' + (c.opts || []).map(function (o) { return '<span class="case"><input type="checkbox" name="' + c.k + '" value="' + esc(o[0]) + '"' + ((val || []).indexOf(o[0]) >= 0 ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></span>'; }).join('') + '</span>';
  else if (c.t === 'code') h += '<input type="password" inputmode="numeric" autocomplete="one-time-code"' + att + ' value="">';
  else h += '<input type="' + ({ date: 'date', heure: 'time', email: 'email', tel: 'tel' }[c.t] || 'text') + '"' + att + ' value="' + esc(val) + '"' + (c.t === 'email' ? ' autocomplete="email" autocapitalize="off"' : '') + '>';
  if (c.aide) h += '<span class="aide">' + c.aide + '</span>';
  return h + (c.t === 'multi' ? '</div>' : '</label>');
}
function lireForm(racine, champs) {
  var v = {};
  champs.forEach(function (c) {
    var el = racine.querySelector('[name="' + c.k + '"]'); if (!el) return;
    if (el.closest('[data-champ]').classList.contains('cache')) return;
    if (c.t === 'multi') v[c.k] = Array.prototype.map.call(racine.querySelectorAll('[name="' + c.k + '"]:checked'), function (x) { return x.value; });
    else if (c.t === 'case') v[c.k] = el.checked;
    else if (c.t === 'montant') { var x = el.value.replace(/[^\d-]/g, ''); v[c.k] = x === '' ? '' : +x; }
    else if (c.t === 'nombre') v[c.k] = el.value === '' ? '' : +el.value;
    else if (c.t === 'liste') v[c.k] = el.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    else v[c.k] = el.value.trim();
  });
  return v;
}
/* Ouvre un formulaire ; envoyer(v) renvoie une promesse. Les refus du serveur s'affichent dans le formulaire. */
function formulaire(o) {
  var champs = o.champs.filter(Boolean);
  var corps = (o.intro || '') + '<form class="form-grille" novalidate>' + champs.map(function (c) { return champHTML(c, (o.valeurs || {})[c.k]); }).join('') + (o.calcul ? '<div class="calcul" data-calcul></div>' : '') + (o.apresChamps || '') + '<div class="form-msg plein" style="grid-column:1/-1" data-msg role="alert"></div><button type="submit" class="cache"></button></form>';
  var f = Feuille.ouvrir({ titre: o.titre, surtitre: o.surtitre, sous: o.sous, corps: corps, pied: '<button class="bt discret" data-fermer2>Annuler</button><button class="bt principal-bt" data-envoyer>' + esc(o.bouton || 'Enregistrer') + '</button>' });
  var form = f.querySelector('form'), msg = f.querySelector('[data-msg]');
  function maj() {
    var v = lireForm(form, champs);
    champs.forEach(function (c) { if (c.si) { var el = form.querySelector('[data-champ="' + c.k + '"]'); if (el) el.classList.toggle('cache', !c.si(v)); } });
    if (o.calcul) { var html = o.calcul(lireForm(form, champs), form); var z = f.querySelector('[data-calcul]'); z.innerHTML = html || ''; z.classList.toggle('cache', !html); }
    if (o.change) o.change(v, form);
  }
  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('data-montant')) { var pos = e.target.value.length - e.target.selectionStart; var x = e.target.value.replace(/[^\d]/g, ''); e.target.value = x ? nombre(+x) : ''; try { var p = e.target.value.length - pos; e.target.setSelectionRange(p, p); } catch (er) { } }
    maj();
  });
  form.addEventListener('change', maj);
  function envoyer(e) {
    if (e) e.preventDefault();
    msg.textContent = '';
    var v = lireForm(form, champs), manque = champs.filter(function (c) { var el = form.querySelector('[data-champ="' + c.k + '"]'); return c.req && el && !el.classList.contains('cache') && (v[c.k] === '' || v[c.k] === undefined); });
    if (manque.length) { msg.textContent = 'À compléter : ' + manque.map(function (c) { return c.l.toLowerCase(); }).join(', ') + '.'; SONS.jouer('erreur'); return; }
    var bt = f.querySelector('[data-envoyer]'); bt.disabled = true; bt.textContent = 'Enregistrement…';
    Promise.resolve().then(function () { return o.envoyer(v, form); }).then(function () { Feuille.fermer(); }, function (err) {
      bt.disabled = false; bt.textContent = o.bouton || 'Enregistrer'; msg.textContent = err && err.message ? err.message : 'Enregistrement impossible.'; SONS.jouer('erreur');
    });
  }
  form.addEventListener('submit', envoyer);
  f.querySelector('[data-envoyer]').addEventListener('click', envoyer);
  f.querySelector('[data-fermer2]').addEventListener('click', function () { Feuille.fermer(); });
  maj();
  return f;
}
/* Confirmation sobre, avec motif facultatif ou obligatoire. */
function confirmer(o) {
  return new Promise(function (ok) {
    var champs = o.motif ? [{ k: 'motif', l: o.motif, t: 'texte', req: true, plein: true }] : [];
    formulaire({ titre: o.titre, sous: o.texte, champs: champs, bouton: o.bouton || 'Confirmer', envoyer: function (v) { return o.action(v); } });
    ok();
  });
}

/* Écriture : passe par l'API, joue le son de validation, rafraîchit l'écran. */
function ecrire(type, donnees, message, son) {
  if (!S.enLigne && !API.demo) return Promise.reject(new Error('Hors connexion : rien n’a été enregistré. Réessayez une fois la connexion revenue.'));
  attente(true);
  return API.ecrire({ type: type, donnees: donnees }).then(function (r) {
    attente(false); S.db = API.db(); _kpiCache.cle = '';
    SONS.jouer(son || 'validation'); toast(message || LE.LIBELLES_OPS[type] || 'Enregistré');
    App.rendre(true);
    return r;
  }, function (e) { attente(false); throw e; });
}

/* Export CSV (séparateur point-virgule, lisible par Excel en français). */
function exporterCSV(nom, entetes, lignes) {
  var c = function (v) { v = v === null || v === undefined ? '' : String(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var texte = '﻿' + [entetes].concat(lignes).map(function (l) { return l.map(c).join(';'); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texte], { type: 'text/csv;charset=utf-8' }));
  a.download = nom + ' ' + S.auj + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('Fichier « ' + nom + ' » prêt');
}
