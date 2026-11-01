/* KALAN — moteur : dates, moyennes, programme, fiches de révision et cartes (répétition espacée).
   Aucune dépendance ; tout le calcul se fait sur le téléphone. */
window.KM = (function () {
  'use strict';
  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  /* ---------------------------------------------------------------- dates (heure locale, format AAAA-MM-JJ) */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function jour(s) { var t = String(s).split('-'); return new Date(+t[0], +t[1] - 1, +t[2]); }
  function ajouter(s, n) { var d = jour(s); d.setDate(d.getDate() + n); return iso(d); }
  function ecart(a, b) { return Math.round((jour(b) - jour(a)) / 864e5); }
  function dateLongue(s) { var d = jour(s); return JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()]; }
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function dateCourte(s) { var d = jour(s); return d.getDate() + ' ' + MOIS_C[d.getMonth()]; }
  function quand(s, auj) {
    var n = ecart(auj, s);
    if (n === 0) return 'aujourd’hui'; if (n === 1) return 'demain'; if (n === -1) return 'hier';
    if (n > 1 && n < 7) return JOURS[jour(s).getDay()].toLowerCase();
    if (n < 0) return 'il y a ' + (-n) + ' jours';
    return 'le ' + dateCourte(s);
  }

  /* ---------------------------------------------------------------- texte */
  function sansAccents(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function nombre(n, d) { if (n == null || isNaN(n)) return '–'; return n.toFixed(d == null ? 2 : d).replace('.', ','); }

  /* ---------------------------------------------------------------- notes et moyennes (sur 20) */
  function sur20(n) { return n.note * 20 / (n.sur || 20); }
  function moyenne(notes) {
    var s = 0, c = 0; notes.forEach(function (n) { var k = +n.coef || 1; s += sur20(n) * k; c += k; });
    return c ? s / c : null;
  }
  function parMatiere(notes, matieres, trimestre) {
    var o = {};
    matieres.forEach(function (m) {
      var L = notes.filter(function (n) { return n.matiere === m.id && (!trimestre || n.trimestre === trimestre); })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      o[m.id] = { m: m, notes: L, moy: moyenne(L), tendance: tendance(L) };
    });
    return o;
  }
  function generale(pm) {
    var s = 0, c = 0;
    Object.keys(pm).forEach(function (k) { var x = pm[k]; if (x.moy != null) { var co = +x.m.coef || 1; s += x.moy * co; c += co; } });
    return c ? s / c : null;
  }
  /* Écart entre la moyenne des 2 dernières notes et celle des précédentes (en points sur 20). */
  function tendance(L) {
    if (L.length < 3) return 0;
    var der = L.slice(-2), avant = L.slice(0, -2);
    return moyenne(der) - moyenne(avant);
  }
  function mention(m) {
    if (m == null) return '';
    if (m >= 16) return 'Excellent'; if (m >= 14) return 'Très bien'; if (m >= 12) return 'Bien';
    if (m >= 10) return 'Passable'; if (m >= 8) return 'Peut mieux faire'; return 'À renforcer';
  }
  /* Évolution de la moyenne générale note après note (pour le graphique). */
  function evolution(notes, matieres) {
    var L = notes.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), pts = [];
    for (var i = 0; i < L.length; i++) {
      var g = generale(parMatiere(L.slice(0, i + 1), matieres));
      if (g != null) pts.push({ date: L[i].date, v: g });
    }
    return pts;
  }

  /* ---------------------------------------------------------------- programme */
  var ETATS = ['avenir', 'encours', 'vu', 'revise'];
  var ETAT_NOM = { avenir: 'À venir', encours: 'En cours', vu: 'Vu en classe', revise: 'Révisé' };
  function progression(chapitres) {
    var t = chapitres.length, o = { total: t, avenir: 0, encours: 0, vu: 0, revise: 0 };
    chapitres.forEach(function (c) { o[c.etat || 'avenir']++; });
    o.pct = t ? Math.round((o.vu + o.revise + o.encours * 0.5) / t * 100) : 0;
    o.pctRevise = t ? Math.round(o.revise / t * 100) : 0;
    return o;
  }

  /* ---------------------------------------------------------------- fiche de révision tirée d'un cours */
  var VIDES = ('les des une un le la de du et en est sont que qui dans pour par sur avec pas plus mais ou au aux ce cette ces se sa son ses leur leurs il elle ils elles on nous vous je tu a ont etre avoir fait faire comme tout tous toute toutes donc alors car ni si sans sous entre aussi tres bien deux trois peut doit lors ainsi cela celui celle ceux dont meme quand avant apres chaque autre autres puis encore leur elle'.split(' '));
  var VIDE = {}; VIDES.forEach(function (w) { VIDE[w] = 1; });
  function phrases(t) { return t.replace(/([.!?])\s+/g, '$1\n').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
  function nettoyer(l) { return l.replace(/^[\s•\-–*·>]+/, '').replace(/^\d+[.)]\s+/, '').trim(); }
  function estFormule(l) { return /[=≤≥<>√²³×÷∑π]/.test(l) && !/^https?:/.test(l) && l.length <= 120; }

  function genererFiche(cours) {
    var texte = String(cours.texte || ''), lignes = texte.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var f = { retenir: [], definitions: [], formules: [], dates: [], motsCles: [] }, vus = {};
    function une(cle, val) { var k = cle + '|' + sansAccents(typeof val === 'string' ? val : val.terme || val.annee + val.fait); if (vus[k]) return; vus[k] = 1; f[cle].push(val); }
    lignes.forEach(function (brut) {
      var l = nettoyer(brut); if (!l || l.length < 3) return;
      var imp = /^!/.test(brut.trim()) || /\b(retenir|important|attention|remarque|propri[eé]t[eé]|th[eé]or[eè]me|r[eè]gle|conclusion)\b/i.test(l);
      l = l.replace(/^!\s*/, '');
      if (/^(exemple|ex|exercice|application)\b\s*\d*\s*[:.-]/i.test(l)) return;
      var m;
      if (estFormule(l)) { une('formules', l); }
      else if ((m = l.match(/^([^:]{2,60}?)\s*:\s*(.{3,})$/)) && !/^(exemple|ex|remarque|attention|important|conclusion|exercice|rappel|nb)$/i.test(m[1].trim())) {
        une('definitions', { terme: m[1].trim(), def: m[2].trim() });
      } else if ((m = l.match(/^(?:on appelle|on nomme)\s+(.{2,60}?)\s*,?\s+(.{3,})$/i))) {
        une('definitions', { terme: m[1].trim(), def: m[2].trim() });
      } else if (!imp && (m = l.match(/^((?:le|la|les|l’|l'|un|une)\s?[^,.]{2,40}?)\s+(est|sont|désigne|désignent|signifie|correspond à)\s+(.{3,})$/i)) && m[1].split(/\s+/).length <= 5) {
        une('definitions', { terme: m[1].trim(), def: m[2] + ' ' + m[3].trim() });
      }
      var dm = l.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
      if (dm && !estFormule(l)) une('dates', { annee: dm[1], fait: l });
      if (imp) une('retenir', l);
    });
    if (!f.retenir.length) {
      /* rien de marqué : la première phrase de chaque paragraphe */
      texte.split(/\n\s*\n/).forEach(function (par) { var ph = phrases(par.replace(/\n/g, ' '))[0]; if (ph && ph.length > 15 && f.retenir.length < 5) une('retenir', nettoyer(ph)); });
    }
    /* mots-clés : les mots les plus fréquents, plus les termes définis */
    var freq = {};
    sansAccents(texte).replace(/[^a-z0-9'’\s-]/g, ' ').split(/\s+/).forEach(function (w) {
      w = w.replace(/^[ldjmnst][’']/, ''); if (w.length < 5 || VIDE[w] || /^\d+$/.test(w)) return; freq[w] = (freq[w] || 0) + 1;
    });
    var forme = {}; texte.replace(/[A-Za-zÀ-ÿ’'-]{5,}/g, function (w) { var k = sansAccents(w.replace(/^[ldjmnst][’']/i, '')); if (!forme[k] || /^[a-z]/.test(forme[k])) forme[k] = w.replace(/^[ldjmnst][’']/i, ''); });
    f.definitions.forEach(function (d) { if (d.terme.split(/\s+/).length <= 4) une('motsCles', d.terme); });
    Object.keys(freq).filter(function (w) { return freq[w] > 1; }).sort(function (a, b) { return freq[b] - freq[a]; })
      .slice(0, 10).forEach(function (w) { if (f.motsCles.length < 12) une('motsCles', forme[w] || w); });
    return f;
  }

  /* Cartes question / réponse tirées d'une fiche. */
  function cartesDeFiche(f, auj) {
    var c = [];
    function ajout(q, r) { c.push({ id: 'c' + c.length, q: q, r: r, boite: 1, prochaine: auj }); }
    f.definitions.forEach(function (d) { ajout('Que signifie « ' + d.terme + ' » ?', d.def); });
    f.formules.forEach(function (x) {
      var m = x.match(/^([^:]{2,50}?)\s*:\s*(.+)$/);
      if (m) ajout('Donne la formule : ' + m[1].trim(), m[2].trim());
      else { var parts = x.split('='); if (parts.length >= 2 && parts[0].trim()) ajout('Complète : ' + parts[0].trim() + ' = …', parts.slice(1).join('=').trim()); }
    });
    f.dates.forEach(function (d) { ajout('Que s’est-il passé en ' + d.annee + ' ?', d.fait); });
    f.retenir.forEach(function (l) {
      var mots = l.split(/\s+/), cand = mots.filter(function (w) { var k = sansAccents(w).replace(/[^a-z0-9]/g, ''); return k.length >= 6 && !VIDE[k]; });
      if (!cand.length || mots.length < 5) return;
      var cache = cand.map(function (w) { return w.replace(/^[ldjmnstc][’']/i, '').replace(/[.,;:!?)»]+$/, ''); }).sort(function (a, b) { return b.length - a.length; })[0];
      ajout('Complète : ' + l.replace(/^[^:]{2,40}:\s*(?=\S)/, function (t) { return t.split(/\s+/).length <= 6 ? '' : t; }).replace(cache, '_____'), cache);
    });
    return c;
  }

  /* Répétition espacée (boîtes de Leitner) : 1, 2, 4, 8, 16 jours. */
  var DELAIS = [0, 1, 2, 4, 8, 16];
  function repondre(carte, su, auj) {
    carte.boite = su ? Math.min(5, (carte.boite || 1) + 1) : 1;
    carte.prochaine = ajouter(auj, su ? DELAIS[carte.boite] : 0);
    carte.vue = auj;
    return carte;
  }
  function cartesDues(fiches, auj) {
    var L = [];
    fiches.forEach(function (f) { (f.cartes || []).forEach(function (c) { if (!c.prochaine || c.prochaine <= auj) L.push({ fiche: f, carte: c }); }); });
    return L;
  }

  /* ---------------------------------------------------------------- emploi du temps */
  function coursDuJour(edt, jourSemaine) {
    return edt.filter(function (c) { return +c.jour === jourSemaine; }).sort(function (a, b) { return a.debut < b.debut ? -1 : 1; });
  }
  /* Classes (Côte d'Ivoire) et examen de fin d'année correspondant. */
  var CLASSES = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e', '4e', '3e', '2nde', '1re', 'Tle'];
  function examen(classe) {
    var c = sansAccents(classe || '').replace(/\s/g, '');
    if (/^3/.test(c)) return 'BEPC';
    if (/^(t|terminale)/.test(c)) return 'BAC';
    if (/^cm2/.test(c)) return 'CEPE';
    return 'examen';
  }
  function heure(h) { return String(h || '').replace(/^0/, '').replace(':', ' h '); }

  return {
    JOURS: JOURS, MOIS: MOIS, iso: iso, jour: jour, ajouter: ajouter, ecart: ecart, dateLongue: dateLongue, dateCourte: dateCourte, quand: quand,
    sansAccents: sansAccents, nombre: nombre, sur20: sur20, moyenne: moyenne, parMatiere: parMatiere, generale: generale, tendance: tendance, mention: mention, evolution: evolution,
    ETATS: ETATS, ETAT_NOM: ETAT_NOM, progression: progression,
    genererFiche: genererFiche, cartesDeFiche: cartesDeFiche, repondre: repondre, cartesDues: cartesDues,
    coursDuJour: coursDuJour, heure: heure, CLASSES: CLASSES, examen: examen
  };
})();
