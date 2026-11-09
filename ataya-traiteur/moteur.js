/* ATAYA TRAITEUR — moteur de calcul (dates, montants, crédits, chiffres d'une période, conseils).
   Le même moteur sert à l'écran ; il ne modifie jamais les données. Une solution SoluGis. */
window.TM = (function () {
  'use strict';

  /* ------------------------------------------------------------ listes de base */
  var MOYENS = [
    { id: 'especes', nom: 'Espèces', court: 'Espèces', ic: '💵', c: '#1f8a4c' },
    { id: 'wave', nom: 'Wave', court: 'Wave', ic: '🐧', c: '#1aa7e0' },
    { id: 'om', nom: 'Orange Money', court: 'Orange', ic: '🟠', c: '#f07800' },
    { id: 'mtn', nom: 'MTN MoMo', court: 'MTN', ic: '🟡', c: '#d9a800' },
    { id: 'moov', nom: 'Moov Money', court: 'Moov', ic: '🔵', c: '#0b63b6' }
  ];
  var CATEGORIES = [
    { id: 'marche', nom: 'Marché', ic: '🛒' },
    { id: 'gaz', nom: 'Gaz, charbon', ic: '🔥' },
    { id: 'emballages', nom: 'Emballages', ic: '📦' },
    { id: 'transport', nom: 'Transport, livraison', ic: '🛵' },
    { id: 'boissons', nom: 'Boissons', ic: '🥤' },
    { id: 'aide', nom: 'Aide, salaire', ic: '🧑🏾‍🍳' },
    { id: 'autre', nom: 'Autre', ic: '🧾' }
  ];
  /* icônes proposées pour les plats (la patronne choisit) */
  var ICONES_PLATS = ['🍛', '🍲', '🐟', '🍗', '🥩', '🍖', '🥘', '🥣', '🍚', '🥗', '🍝', '🌯', '🍌', '🍠', '🥔', '🌽', '🍳', '🥚', '🫘', '🍞', '🥤', '🧃', '🍹', '🍵', '🍰', '🍉', '🍍', '🥭'];
  var COULEURS_CLIENTS = ['#1f6fd1', '#c2410c', '#0f766e', '#7b4bb7', '#b45309', '#be185d', '#15803d', '#4338ca', '#0e7490', '#a16207'];

  function moyen(id) { return MOYENS.filter(function (m) { return m.id === id; })[0] || MOYENS[0]; }
  function categorie(id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0] || CATEGORIES[CATEGORIES.length - 1]; }
  /* icône devinée d'après le nom du plat (modifiable ensuite) */
  function iconeAuto(nom) {
    var n = String(nom || '').toLowerCase();
    var R = [[/poisson|thon|carpe|capitaine|sardine|garba/, '🐟'], [/poulet|pintade|braisé|braise|kedjenou/, '🍗'], [/boeuf|bœuf|viande|mouton|agneau|choukouya|chèvre/, '🥩'], [/porc/, '🍖'],
      [/alloco|banane/, '🍌'], [/igname|patate/, '🍠'], [/frite|pomme de terre/, '🥔'], [/salade|crudit/, '🥗'], [/spaghetti|pâte|macaroni/, '🍝'], [/haricot|niébé|niebe/, '🫘'], [/oeuf|œuf|omelette/, '🍳'],
      [/jus|bissap|gnamakoudji|gingembre|tamarin/, '🧃'], [/eau|soda|boisson/, '🥤'], [/dessert|gâteau|gateau/, '🍰'], [/fruit|ananas/, '🍍'],
      [/foutou|placali|kabato|sauce|soupe|gombo|graine|arachide|feuille|claire/, '🍲'], [/attiéké|attieke|riz|garba/, '🍛']];
    for (var i = 0; i < R.length; i++) if (R[i][0].test(n)) return R[i][1];
    return '🍛';
  }

  /* ------------------------------------------------------------ dates (AAAA-MM-JJ, heure locale) */
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate()); }
  function date(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function ajouter(s, n) { var d = date(s); d.setDate(d.getDate() + n); return iso(d); }
  function ecart(a, b) { return Math.round((date(b) - date(a)) / 864e5); }
  function jourSemaine(s) { return date(s).getDay(); }
  function debutSemaine(s) { var j = jourSemaine(s); return ajouter(s, j === 0 ? -6 : 1 - j); }
  function debutMois(s) { return s.slice(0, 8) + '01'; }
  function finMois(s) { var d = date(debutMois(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return iso(d); }
  function dateLongue(s) { var d = date(s); return JOURS[d.getDay()] + ' ' + d.getDate() + (d.getDate() === 1 ? 'er' : '') + ' ' + MOIS[d.getMonth()]; }
  function dateCourte(s) { var d = date(s); return d.getDate() + ' ' + MOIS_C[d.getMonth()]; }
  function nomMois(s) { var d = date(s); return MOIS[d.getMonth()] + ' ' + d.getFullYear(); }
  function quand(s, auj) {
    var e = ecart(auj, s);
    if (e === 0) return 'aujourd’hui'; if (e === 1) return 'demain'; if (e === -1) return 'hier';
    if (e > 1 && e < 7) return JOURS[jourSemaine(s)];
    return dateLongue(s).replace(/^\S+ /, '');
  }
  function depuis(s, auj) {
    var e = ecart(s, auj);
    if (e <= 0) return 'aujourd’hui'; if (e === 1) return 'depuis hier';
    if (e < 14) return 'depuis ' + e + ' jours';
    if (e < 60) return 'depuis ' + Math.floor(e / 7) + ' semaines';
    return 'depuis ' + Math.floor(e / 30) + ' mois';
  }

  /* ------------------------------------------------------------ montants */
  function F(n) { n = Math.round(+n || 0); var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (n < 0 ? '−' : '') + s + ' F'; }
  function nombre(n) { return String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function lireMontant(t) { var n = parseInt(String(t || '').replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; }
  function total(c) { return (c.lignes || []).reduce(function (s, l) { return s + (+l.prix || 0) * (+l.q || 0); }, 0) + (+c.frais || 0); }
  function portions(c) { return (c.lignes || []).reduce(function (s, l) { return s + (+l.q || 0); }, 0); }

  /* ------------------------------------------------------------ crédits
     Un paiement lié à une commande la règle d'abord ; le reste (et les encaissements libres) règle les plus anciennes dettes du client :
     d'abord la dette reprise du cahier, puis ses commandes de la plus ancienne à la plus récente. */
  function situation(D) {
    var cmd = {}, cli = {}, parCmd = {};
    D.paiements.forEach(function (p) { if (p.commande) parCmd[p.commande] = (parCmd[p.commande] || 0) + (+p.montant || 0); });
    D.commandes.forEach(function (c) { var t = total(c), lie = parCmd[c.id] || 0; cmd[c.id] = { total: t, paye: Math.min(t, lie), reste: Math.max(0, t - lie), surplus: Math.max(0, lie - t) }; });
    D.clients.forEach(function (k) { cli[k.id] = { client: k, du: +k.depart || 0, paye: 0, reste: 0, depuis: '', commandes: [], departReste: +k.depart || 0 }; });
    var libre = {};
    D.paiements.forEach(function (p) { if (!p.commande && p.client) libre[p.client] = (libre[p.client] || 0) + (+p.montant || 0); });
    D.commandes.forEach(function (c) { if (c.client && cmd[c.id].surplus) libre[c.client] = (libre[c.client] || 0) + cmd[c.id].surplus; });
    var parClient = {};
    D.commandes.forEach(function (c) { if (c.client) (parClient[c.client] = parClient[c.client] || []).push(c); });
    Object.keys(cli).forEach(function (id) {
      var s = cli[id], pot = libre[id] || 0, L = (parClient[id] || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.cree || 0) - (b.cree || 0); });
      var x = Math.min(pot, s.departReste); s.departReste -= x; pot -= x;
      L.forEach(function (c) { var e = cmd[c.id], y = Math.min(pot, e.reste); e.reste -= y; e.paye += y; pot -= y; s.du += e.total; });
      s.commandes = L;
      s.reste = s.departReste + L.reduce(function (t, c) { return t + cmd[c.id].reste; }, 0);
      s.avance = pot;                                // payé d'avance (rare)
      s.paye = s.du - s.reste;
      var plusVieux = s.departReste > 0 ? (s.client.departDate || '') : '';
      if (!plusVieux) { var c0 = L.filter(function (c) { return cmd[c.id].reste > 0; })[0]; plusVieux = c0 ? c0.date : ''; }
      s.depuis = plusVieux;
    });
    return { cmd: cmd, cli: cli };
  }
  function credits(D) {
    var s = situation(D);
    return Object.keys(s.cli).map(function (k) { return s.cli[k]; }).filter(function (x) { return x.reste > 0; }).sort(function (a, b) { return b.reste - a.reste; });
  }

  /* ------------------------------------------------------------ chiffres d'une période [debut, fin] */
  function periode(D, debut, fin) {
    function dans(d) { return d >= debut && d <= fin; }
    var r = { debut: debut, fin: fin, ventes: 0, commandes: 0, portions: 0, recu: 0, depenses: 0, parMoyen: {}, parCat: {}, plats: {}, clients: {}, jours: {} };
    D.commandes.forEach(function (c) {
      if (!dans(c.date)) return;
      var t = total(c); r.ventes += t; r.commandes++; r.portions += portions(c);
      (c.lignes || []).forEach(function (l) { var k = l.plat || l.nom; var p = r.plats[k] = r.plats[k] || { nom: l.nom, ic: l.ic, q: 0, montant: 0 }; p.q += +l.q || 0; p.montant += (+l.q || 0) * (+l.prix || 0); });
      var kc = c.client || ''; if (kc) r.clients[kc] = (r.clients[kc] || 0) + t;
      var j = r.jours[c.date] = r.jours[c.date] || { ventes: 0, depenses: 0 }; j.ventes += t;
    });
    D.paiements.forEach(function (p) { if (!dans(p.date)) return; r.recu += +p.montant || 0; r.parMoyen[p.moyen || 'especes'] = (r.parMoyen[p.moyen || 'especes'] || 0) + (+p.montant || 0); });
    D.depenses.forEach(function (d) {
      if (!dans(d.date)) return; r.depenses += +d.montant || 0; r.parCat[d.cat || 'autre'] = (r.parCat[d.cat || 'autre'] || 0) + (+d.montant || 0);
      var j = r.jours[d.date] = r.jours[d.date] || { ventes: 0, depenses: 0 }; j.depenses += +d.montant || 0;
    });
    r.reste = r.ventes - r.depenses;          // ce qu'il reste après les dépenses (bénéfice)
    r.caisse = r.recu - r.depenses;           // argent réellement rentré moins argent sorti
    r.listePlats = Object.keys(r.plats).map(function (k) { return r.plats[k]; }).sort(function (a, b) { return b.q - a.q; });
    r.listeClients = Object.keys(r.clients).map(function (k) { return { id: k, montant: r.clients[k] }; }).sort(function (a, b) { return b.montant - a.montant; });
    return r;
  }

  /* ------------------------------------------------------------ conseils (phrases simples, au plus 3) */
  function conseils(D, auj) {
    var L = [], cr = credits(D);
    var anciens = cr.filter(function (x) { return x.depuis && ecart(x.depuis, auj) >= 14; });
    if (anciens.length) L.push({ ic: '📒', c: 'orange', texte: (anciens.length > 1 ? anciens.length + ' clients vous doivent' : nomClient(anciens[0].client) + ' vous doit') + ' depuis plus de 2 semaines : ' + F(anciens.reduce(function (s, x) { return s + x.reste; }, 0)) + '. Un petit rappel ?', aller: 'credits' });
    var oublis = D.commandes.filter(function (c) { return c.date < auj && !c.livree && c.date >= ajouter(auj, -7); });
    if (oublis.length) L.push({ ic: '🛵', c: 'bleu', texte: oublis.length + ' commande' + (oublis.length > 1 ? 's' : '') + ' des jours passés ' + (oublis.length > 1 ? 'ne sont pas marquées' : 'n’est pas marquée') + ' « livrée ».', aller: 'jour/' + oublis[0].date });
    var hier = ajouter(auj, -1), menu = D.menus.filter(function (m) { return m.id === hier; })[0];
    if (menu) {
      var vendu = periode(D, hier, hier).plats, restes = [];
      (menu.plats || []).forEach(function (p) { if (+p.prevu > 0) { var v = (vendu[p.plat] || { q: 0 }).q, r = p.prevu - v; if (r >= Math.max(3, p.prevu * 0.2)) restes.push({ p: p, r: r }); } });
      restes.sort(function (a, b) { return b.r - a.r; });
      if (restes.length) { var pl = platDe(D, restes[0].p.plat); L.push({ ic: pl.ic || '🍲', c: 'violet', texte: 'Hier, ' + restes[0].r + ' portions de ' + pl.nom.toLowerCase() + ' sont restées : vous pouvez en préparer un peu moins.' }); }
    }
    var s = periode(D, debutSemaine(auj), auj), top = s.listePlats[0];
    if (top && top.q >= 10) L.push({ ic: top.ic || '🍛', c: 'vert', texte: top.nom + ' est votre plat le plus demandé cette semaine : ' + top.q + ' portions.' });
    var m = periode(D, debutMois(auj), auj);
    if (m.ventes > 0 && L.length < 3) L.push({ ic: m.reste >= 0 ? '💚' : '🧡', c: m.reste >= 0 ? 'vert' : 'orange', texte: m.reste >= 0 ? 'Depuis le début du mois, il vous reste ' + F(m.reste) + ' après les dépenses. Bravo !' : 'Ce mois-ci, les dépenses dépassent les ventes de ' + F(-m.reste) + '.', aller: 'comptes' });
    return L.slice(0, 3);
  }
  function nomClient(k) { return k ? k.nom : 'Client de passage'; }
  function platDe(D, id) { return D.plats.filter(function (p) { return p.id === id; })[0] || { nom: 'Plat', ic: '🍛' }; }
  function initiales(nom) {
    var m = String(nom || '?').replace(/^(m\.|mme|mlle|m|dr|me)\s+/i, '').split(/[\s&'’-]+/).filter(function (x) { return x && /^[A-Za-zÀ-ÿ]/.test(x) && !/^(de|du|des|la|le|les|et|d)$/i.test(x); });
    return ((m[0] || '?')[0] + (m[1] ? m[1][0] : '')).toUpperCase();
  }
  /* téléphone ivoirien → numéro international pour WhatsApp et les appels */
  function telInter(t) {
    var n = String(t || '').replace(/[^\d+]/g, '');
    if (!n) return '';
    if (n.indexOf('+') === 0) return n.slice(1);
    if (n.indexOf('00') === 0) return n.slice(2);
    if (n.length === 10) return '225' + n;
    return n;
  }

  return { MOYENS: MOYENS, CATEGORIES: CATEGORIES, ICONES_PLATS: ICONES_PLATS, COULEURS_CLIENTS: COULEURS_CLIENTS, moyen: moyen, categorie: categorie, iconeAuto: iconeAuto,
    iso: iso, ajouter: ajouter, ecart: ecart, jourSemaine: jourSemaine, debutSemaine: debutSemaine, debutMois: debutMois, finMois: finMois, dateLongue: dateLongue, dateCourte: dateCourte, nomMois: nomMois, quand: quand, depuis: depuis, JOURS: JOURS,
    F: F, nombre: nombre, lireMontant: lireMontant, total: total, portions: portions, situation: situation, credits: credits, periode: periode, conseils: conseils, nomClient: nomClient, initiales: initiales, telInter: telInter };
})();
