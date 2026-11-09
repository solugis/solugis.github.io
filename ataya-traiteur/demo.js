/* ATAYA TRAITEUR — données FICTIVES de la démonstration (« Les Délices d'Adjoua », traiteur fictif à Abidjan).
   Cinq semaines d'activité calculées à partir du jour où l'on regarde ; tirage pseudo-aléatoire fixe (mêmes données à chaque remise à zéro). */
window.TRAITEUR_DEMO = function (auj) {
  'use strict';
  var M = window.TM, d = { reglages: {}, plats: {}, clients: {}, menus: {}, commandes: {}, paiements: {}, depenses: {} };
  var graine = 7; function hasard() { graine = (graine + 0x6D2B79F5) | 0; var t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function entre(a, b) { return a + Math.floor(hasard() * (b - a + 1)); }
  function parmi(L) { return L[Math.floor(hasard() * L.length)]; }
  var n = 0; function id(p) { n++; return p + n.toString(36); }
  function j(k) { return M.ajouter(auj, k); }
  var base = Date.now() - 40 * 864e5;

  d.reglages.activite = { id: 'activite', nom: 'Les Délices d’Adjoua', prenom: 'Adjoua', tel: '07 00 00 00 00', lieu: 'Cocody, Abidjan' };
  d.reglages.moyens = { id: 'moyens', liste: ['especes', 'wave', 'om', 'mtn'] };

  var P = [
    ['p1', 'Attiéké poisson braisé', '🐟', 2500], ['p2', 'Riz sauce graine', '🍲', 2000], ['p3', 'Poulet braisé et alloco', '🍗', 3000],
    ['p4', 'Foutou sauce claire', '🥘', 2500], ['p5', 'Placali sauce kplala', '🥣', 2000], ['p6', 'Riz gras au poulet', '🍛', 2500],
    ['p7', 'Garba', '🐟', 1000], ['p8', 'Salade composée', '🥗', 1500], ['p9', 'Jus de bissap', '🧃', 500], ['p10', 'Jus de gingembre', '🍹', 500]
  ];
  P.forEach(function (p, i) { d.plats[p[0]] = { id: p[0], nom: p[1], ic: p[2], prix: p[3], actif: true, ordre: i }; });
  function plat(pid) { return d.plats[pid]; }

  var C = [
    ['c1', 'Cabinet Konan & Associés', 'entreprise', '07 11 22 33 44', 'Plateau, immeuble Alpha 2000, 4e étage'],
    ['c2', 'Pharmacie du Plateau', 'entreprise', '05 22 33 44 55', 'Plateau, avenue Chardy'],
    ['c3', 'Atlantique BTP', 'entreprise', '01 33 44 55 66', 'Marcory zone 4, chantier rue du Canal'],
    ['c4', 'Mme Bamba Aïcha', 'particulier', '07 44 55 66 77', 'Cocody Angré, 8e tranche'],
    ['c5', 'M. Traoré Ibrahim', 'particulier', '05 55 66 77 88', 'Cocody Riviera 2'],
    ['c6', 'Koffi Yao', 'particulier', '01 66 77 88 99', 'Cocody, bureau près de la poste'],
    ['c7', 'École Les Petits Génies', 'entreprise', '07 77 88 99 00', 'Riviera Palmeraie']
  ];
  C.forEach(function (c, i) { d.clients[c[0]] = { id: c[0], nom: c[1], type: c[2], tel: c[3], lieu: c[4], couleur: i, depart: 0, cree: base + i }; });
  d.clients.c5.depart = 6000; d.clients.c5.departDate = j(-41);          // reprise du cahier

  var plats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
  function menuDu(jour) {
    var k = M.ecart('2026-01-05', jour), A = [plats[k % 8], plats[(k + 3) % 8], plats[(k + 5) % 8]];
    if (A.indexOf('p3') < 0 && k % 2) A.push('p3');
    return A.filter(function (x, i) { return A.indexOf(x) === i; }).concat(['p9', 'p10']);
  }
  function commande(jour, client, nb, menu, opts) {
    opts = opts || {};
    var lignes = [], principaux = [], poids = { p1: 4, p3: 4, p2: 3, p6: 3, p4: 2, p5: 1, p7: 2, p8: 1 };
    menu.forEach(function (x) { for (var w = 0; w < (poids[x] || 0); w++) principaux.push(x); });
    for (var i = 0; i < nb; i++) {
      var pid = parmi(principaux), l = lignes.filter(function (x) { return x.plat === pid; })[0];
      if (l) l.q++; else lignes.push({ plat: pid, nom: plat(pid).nom, ic: plat(pid).ic, prix: plat(pid).prix, q: 1 });
    }
    if (hasard() < 0.45) { var jp = parmi(['p9', 'p10']); lignes.push({ plat: jp, nom: plat(jp).nom, ic: plat(jp).ic, prix: 500, q: Math.max(1, Math.round(nb / 2)) }); }
    var k = client ? d.clients[client] : null;
    var mode = opts.mode || (client === 'c1' || client === 'c3' || client === 'c7' ? 'credit' : 'livraison');
    var c = { id: id('k'), mode: mode, date: jour, heure: opts.heure || parmi(['12:00', '12:30', '12:30', '13:00']), client: client || '', passage: client ? '' : (opts.passage || ''), lignes: lignes, lieu: opts.lieu != null ? opts.lieu : (k ? k.lieu : ''), livree: opts.livree !== false, note: opts.note || '', cree: base + n * 1000 };
    d.commandes[c.id] = c; return c;
  }
  function payer(jour, client, montant, moyen, cmd) { var p = { id: id('r'), date: jour, client: client || '', commande: cmd ? cmd.id : '', montant: montant, moyen: moyen, cree: base + n * 1000 }; d.paiements[p.id] = p; return p; }
  function depense(jour, cat, montant, note, moyen) { var x = { id: id('x'), date: jour, cat: cat, montant: montant, note: note || '', moyen: moyen || 'especes', cree: base + n * 1000 }; d.depenses[x.id] = x; }

  var semaineC1 = 0, moisC3 = [], c7 = [], dernierMarche = 0;
  for (var k = -34; k <= 1; k++) {
    var jour = j(k), js = M.jourSemaine(jour), aujourdhui = k === 0, demain = k === 1;
    if (js === 0 && !aujourdhui) continue;                       // dimanche : repos
    var menu = menuDu(jour), ventes = {};
    if (k <= 0) {
      d.menus[jour] = { id: jour, plats: menu.map(function (pid) { return { plat: pid, prix: plat(pid).prix, prevu: pid === 'p9' || pid === 'p10' ? 0 : entre(10, 16) }; }) };
    }
    if (demain) {                                                 // commandes déjà prises pour demain
      commande(jour, 'c7', 10, menu, { heure: '12:00', livree: false, note: 'Repas des enseignants' });
      commande(jour, 'c1', 7, menu, { livree: false });
      continue;
    }
    var semaine = js >= 1 && js <= 5;
    var livre = function (rang) { return !aujourdhui || rang < 3; };
    var rang = 0;
    if (semaine) {
      var a = commande(jour, 'c1', entre(6, 9), menu, { heure: '12:30', livree: livre(rang++) }); semaineC1 += M.total(a);
      if (js === 5 && !aujourdhui) { payer(jour, 'c1', semaineC1, parmi(['wave', 'especes'])); semaineC1 = 0; }
      if (hasard() < 0.75) { var b = commande(jour, 'c2', entre(3, 4), menu, { heure: '12:00', livree: livre(rang++) }); if (!aujourdhui || b.livree) payer(jour, 'c2', M.total(b), 'wave', b); }
      var c = commande(jour, 'c3', entre(3, 5), menu, { heure: '12:00', livree: livre(rang++) }); moisC3.push(c);
      if (js === 3) c7.push(commande(jour, 'c7', 10, menu, { heure: '12:00', livree: livre(rang++), note: 'Repas des enseignants' }));
    }
    if (hasard() < 0.45) { var e = commande(jour, 'c4', entre(1, 2), menu, { heure: '13:00', livree: livre(rang++) }); if (e.livree) payer(jour, 'c4', M.total(e), 'om', e); }
    if (hasard() < 0.3) { var f = commande(jour, 'c5', 2, menu, { heure: '13:00', livree: livre(rang++) }); if (hasard() < 0.4 && f.livree) payer(jour, 'c5', M.total(f), 'especes', f); }
    if (hasard() < 0.5) { var g = commande(jour, 'c6', 1, menu, { heure: '12:30', livree: livre(rang++) }); if (g.livree) payer(jour, 'c6', k === -3 ? 1000 : M.total(g), 'especes', g); }
    var np = entre(2, 4);
    for (var i = 0; i < np; i++) { var h = commande(jour, '', entre(1, 2), menu, { passage: parmi(['Client du marché', 'Passant', 'Livreur', 'Voisin', '']), lieu: 'Sur place', heure: parmi(['11:30', '12:00', '12:30', '13:00', '13:30']), livree: livre(rang++) }); if (h.livree) payer(jour, '', M.total(h), hasard() < 0.7 ? 'especes' : 'wave', h); }
    /* Atlantique BTP : a réglé une fois, en début de période ; le reste attend (ancien crédit) */
    if (js === 5 && k < -14) { var s = moisC3.reduce(function (t, x) { return t + M.total(x); }, 0); if (s) payer(jour, 'c3', s, 'especes'); moisC3 = []; }
    /* École : règle les repas des enseignants deux semaines plus tard */
    if (k === -6 && c7.length) { var s7 = c7.slice(0, c7.length - 1).reduce(function (t, x) { return t + M.total(x); }, 0); payer(jour, 'c7', s7, 'wave'); }
    if (k === -12) payer(jour, 'c5', 6000, 'especes');           // M. Traoré règle la dette du cahier
    /* dépenses */
    {
      depense(jour, 'marche', entre(15, 24) * 1000, parmi(['Marché de Cocody', 'Marché d’Adjamé', 'Poissons, légumes', 'Poulets et épices']));
      depense(jour, 'transport', entre(2, 3) * 1000, 'Livreur à moto');
      if (k - dernierMarche >= 9) { depense(jour, 'gaz', 6500, 'Bouteille de gaz'); dernierMarche = k; }
      if (js === 1) depense(jour, 'emballages', 8000, 'Barquettes et sachets');
      if (js === 2) depense(jour, 'boissons', 3000, 'Bissap, gingembre, sucre');
      if (js === 6) depense(jour, 'aide', 15000, 'Aide en cuisine (semaine)', 'wave');
    }
  }
  /* hier : trop de foutou préparé (pour le conseil sur les restes) */
  var hier = d.menus[j(-1)] || d.menus[j(-2)];
  if (hier) { var vendu = {}; Object.keys(d.commandes).forEach(function (kk) { var c = d.commandes[kk]; if (c.date === hier.id) c.lignes.forEach(function (l) { vendu[l.plat] = (vendu[l.plat] || 0) + l.q; }); });
    hier.plats.forEach(function (p, i) { if (p.prevu) p.prevu = (vendu[p.plat] || 0) + (i === 0 ? 7 : entre(0, 2)); }); }
  var menuAuj = d.menus[auj];
  if (menuAuj) { var v2 = {}; Object.keys(d.commandes).forEach(function (kk) { var c = d.commandes[kk]; if (c.date === auj) c.lignes.forEach(function (l) { v2[l.plat] = (v2[l.plat] || 0) + l.q; }); });
    menuAuj.plats.forEach(function (p) { if (p.prevu) p.prevu = Math.max(p.prevu, (v2[p.plat] || 0) + entre(3, 8)); }); }
  return d;
};
