/* BARBER OS — DONNÉES FICTIVES de démonstration (salon imaginaire, personnes imaginaires).
   Tirage déterministe : la démo est identique à chaque remise à zéro. Les ventes sont créées par le même moteur que l'application. */
window.BDEMO = (function () {
  'use strict';
  var M = window.BM;

  var SALON = { id: 'demo', nom: 'Le Cercle Barbershop', ville: 'Abidjan · Riviera 3', type: 'masculin', devise: 'FCFA',
    modules: { fidelite: true, commissionsVisibles: true, file: true },
    fidelite: { seuil: 10 }, remiseCoiffeur: false,
    moyens: ['especes', 'wave', 'om', 'mtn', 'moov', 'carte', 'autre'], moyensActifs: ['especes', 'wave', 'om', 'mtn', 'moov'] };

  var UTILISATEURS = [
    { id: 'u1', prenom: 'Serge', role: 'proprio', langue: 'fr', couleur: 0, commission: { prest: 0, prod: 0 }, specialites: ['coupe', 'barbe'] },
    { id: 'u2', prenom: 'Moussa', role: 'coiffeur', langue: 'fr', couleur: 1, commission: { prest: 40, prod: 10 }, specialites: ['coupe', 'barbe'] },
    { id: 'u3', prenom: 'Chinedu', role: 'coiffeur', langue: 'en', couleur: 2, commission: { prest: 40, prod: 10 }, specialites: ['coupe', 'barbe', 'motifs'] },
    { id: 'u4', prenom: 'Awa', role: 'coiffeur', langue: 'fr', couleur: 3, commission: { prest: 35, prod: 10 }, specialites: ['esthetique', 'tresses', 'ongles'] },
    { id: 'u5', prenom: 'Fanta', role: 'caissier', langue: 'fr', couleur: 4, commission: { prest: 0, prod: 0 }, specialites: [] }
  ];

  /* catégories de la caisse ; seg = segment par défaut, f = visible seulement en salon mixte */
  var CATEGORIES = [
    { id: 'coiffure', nom: { fr: 'Coiffure', en: 'Hair' }, ic: 'ciseaux' },
    { id: 'barbe', nom: { fr: 'Barbe', en: 'Beard' }, ic: 'lame' },
    { id: 'esthetique', nom: { fr: 'Soins', en: 'Care' }, ic: 'eclat' },
    { id: 'tresses', nom: { fr: 'Tresses', en: 'Braids' }, ic: 'tresse', f: true },
    { id: 'beaute', nom: { fr: 'Ongles · beauté', en: 'Nails · beauty' }, ic: 'main', f: true }
  ];

  function P(id, cat, seg, fr, en, prix, duree, o) { var p = { id: id, cat: cat, seg: seg, nom: { fr: fr, en: en }, prix: prix, duree: duree, actif: true }; for (var k in (o || {})) p[k] = o[k]; return p; }
  var PRESTATIONS = [
    P('p1', 'coiffure', 'H', 'Coupe classique', 'Classic cut', 2000, 20, { fid: true, conso: [{ produit: 'c4', q: 5 }] }),
    P('p2', 'coiffure', 'H', 'Dégradé', 'Fade', 3000, 30, { fid: true, conso: [{ produit: 'c4', q: 5 }] }),
    P('p3', 'coiffure', 'H', 'Coupe enfant', 'Kids cut', 1500, 20, { fid: true, conso: [{ produit: 'c4', q: 5 }] }),
    P('p4', 'coiffure', 'H', 'Motifs', 'Hair design', 1000, 15),
    P('p5', 'coiffure', 'H', 'Coupe premium', 'Premium cut', 5000, 45, { fid: true, conso: [{ produit: 'c4', q: 5 }, { produit: 'c2', q: 1 }] }),
    P('p6', 'coiffure', 'U', 'Shampoing', 'Shampoo', 1000, 10, { conso: [{ produit: 'c3', q: 20 }] }),
    P('p7', 'coiffure', 'U', 'Lavage-séchage', 'Wash & dry', 1500, 20, { conso: [{ produit: 'c3', q: 25 }, { produit: 'c2', q: 1 }] }),
    P('p8', 'coiffure', 'U', 'Coloration', 'Hair colour', 5000, 40, { variable: true }),
    P('p9', 'coiffure', 'U', 'Soin des cheveux', 'Hair treatment', 3000, 20),
    P('b1', 'barbe', 'H', 'Taille de barbe', 'Beard trim', 1000, 15),
    P('b2', 'barbe', 'H', 'Contours', 'Line-up', 500, 10),
    P('b3', 'barbe', 'H', 'Rasage complet', 'Full shave', 1500, 20, { conso: [{ produit: 'c1', q: 1 }, { produit: 'c2', q: 1 }] }),
    P('b4', 'barbe', 'H', 'Rasage à la lame', 'Razor shave', 2000, 25, { conso: [{ produit: 'c1', q: 1 }, { produit: 'c2', q: 1 }] }),
    P('b5', 'barbe', 'H', 'Soin de la barbe', 'Beard care', 2500, 20, { conso: [{ produit: 'c5', q: 5 }] }),
    P('b6', 'barbe', 'H', 'Pack coupe + barbe', 'Cut + beard', 3500, 40, { fid: true, conso: [{ produit: 'c4', q: 5 }] }),
    P('e1', 'esthetique', 'U', 'Soin du visage', 'Facial', 5000, 30, { conso: [{ produit: 'c2', q: 2 }] }),
    P('e2', 'esthetique', 'U', 'Masque', 'Face mask', 3000, 20),
    P('e3', 'esthetique', 'U', 'Gommage', 'Scrub', 3000, 20),
    P('e4', 'esthetique', 'U', 'Manucure', 'Manicure', 3000, 30),
    P('e5', 'esthetique', 'U', 'Pédicure', 'Pedicure', 4000, 40),
    P('f1', 'tresses', 'F', 'Tresses simples', 'Simple braids', 5000, 120, { variable: true }),
    P('f2', 'tresses', 'F', 'Box braids', 'Box braids', 15000, 300, { variable: true }),
    P('f3', 'tresses', 'F', 'Vanilles', 'Twists', 8000, 180, { variable: true }),
    P('f4', 'tresses', 'U', 'Locks (entretien)', 'Locs retwist', 10000, 120, { variable: true }),
    P('f5', 'tresses', 'F', 'Brushing', 'Blow-dry', 3000, 40),
    P('f6', 'tresses', 'F', 'Défrisage', 'Relaxer', 5000, 60),
    P('f7', 'tresses', 'F', 'Pose de perruque', 'Wig install', 5000, 60, { variable: true }),
    P('f8', 'beaute', 'F', 'Pose d’ongles', 'Nail extensions', 6000, 90, { variable: true }),
    P('f9', 'beaute', 'F', 'Maquillage', 'Make-up', 10000, 60, { variable: true }),
    P('f10', 'beaute', 'U', 'Épilation des sourcils', 'Eyebrow shaping', 1000, 15)
  ];

  function A(id, usage, cat, fr, en, achat, vente, unite, seuil, ref, o) { var a = { id: id, usage: usage, cat: cat, nom: { fr: fr, en: en }, achat: achat, vente: vente, unite: unite, seuil: seuil, ref: ref, fournisseur: 'Fournisseur Adjamé (fictif)', actif: true }; for (var k in (o || {})) a[k] = o[k]; return a; }
  var PRODUITS = [
    A('a1', 'revente', 'lotions', 'Lotion après-rasage', 'Aftershave lotion', 1400, 2500, 'piece', 5, 'LOT-01'),
    A('a2', 'revente', 'huiles', 'Huile à barbe', 'Beard oil', 2200, 4000, 'piece', 4, 'HUI-01'),
    A('a3', 'revente', 'pomades', 'Pommade', 'Pomade', 1600, 3000, 'piece', 4, 'POM-01'),
    A('a4', 'revente', 'gels', 'Gel coiffant', 'Styling gel', 800, 1500, 'piece', 6, 'GEL-01'),
    A('a5', 'revente', 'shampoings', 'Shampoing 250 ml', 'Shampoo 250 ml', 2000, 3500, 'piece', 4, 'SHA-01'),
    A('a6', 'revente', 'peignes', 'Peigne', 'Comb', 200, 500, 'piece', 10, 'PEI-01'),
    A('a7', 'revente', 'brosses', 'Brosse à vagues', 'Wave brush', 1000, 2000, 'piece', 4, 'BRO-01'),
    A('a8', 'revente', 'bonnets', 'Durag', 'Durag', 700, 1500, 'piece', 5, 'DUR-01'),
    A('a9', 'revente', 'meches', 'Mèches (paquet)', 'Braiding hair (pack)', 1800, 3000, 'piece', 6, 'MEC-01', { f: true }),
    A('c1', 'conso', 'divers', 'Lames de rasoir', 'Razor blades', 50, 0, 'piece', 40, 'LAM-01'),
    A('c2', 'conso', 'divers', 'Serviettes jetables', 'Disposable towels', 25, 0, 'piece', 60, 'SER-01'),
    A('c3', 'conso', 'shampoings', 'Shampoing professionnel', 'Pro shampoo', 4000, 0, 'flacon', 1, 'SHP-05', { contenance: 1000 }),
    A('c4', 'conso', 'divers', 'Désinfectant tondeuse', 'Clipper disinfectant', 1500, 0, 'flacon', 2, 'DES-01', { contenance: 500 }),
    A('c5', 'conso', 'huiles', 'Huile de soin pro', 'Pro care oil', 600, 0, 'flacon', 1, 'HUP-01', { contenance: 100 })
  ];

  var CLIENTS = ['Ibrahim', 'Kevin', 'Junior', 'Arsène', 'Didier', 'Hervé', 'Cédric', 'Ismaël', 'Wilfried', 'Patrick', 'Yannick', 'Samuel'].map(function (n, i) {
    return { id: 'k' + (i + 1), prenom: n, tel: i % 3 === 0 ? '07 00 00 0' + (10 + i) : '', cree: 0 };
  });

  /* générateur pseudo-aléatoire déterministe (mulberry32) */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function tirer(R, poids) { var s = 0, k; for (k in poids) s += poids[k]; var x = R() * s; for (k in poids) { x -= poids[k]; if (x <= 0) return k; } return k; }

  /* construit une base complète : catalogue, stock de départ, ~5 semaines de ventes, dépenses */
  function construire(aujourdhui, maintenant) {
    var R = rng(20261116), seq = 0;
    function uid(p) { seq++; return (p || 'D') + '-' + seq.toString(36); }
    var B = { salon: JSON.parse(JSON.stringify(SALON)), utilisateurs: JSON.parse(JSON.stringify(UTILISATEURS)), categories: CATEGORIES, prestations: JSON.parse(JSON.stringify(PRESTATIONS)),
      produits: JSON.parse(JSON.stringify(PRODUITS)), clients: JSON.parse(JSON.stringify(CLIENTS)), transactions: [], mouvements: [], depenses: [], audit: [], passages: [], numero: 0 };
    B.utilisateurs[1].favoris = ['p2', 'p1', 'b6', 'b1', 'b2', 'a1'];
    B.utilisateurs[2].favoris = ['p2', 'p1', 'b6', 'p4', 'b1', 'a3'];
    B.utilisateurs[3].favoris = ['e4', 'e5', 'e1', 'f1', 'f5', 'f10'];
    B.utilisateurs[0].favoris = ['p2', 'p1', 'b6', 'p5', 'b1', 'a1'];
    B.utilisateurs[4].favoris = ['p2', 'p1', 'b6', 'b1', 'a1', 'a2'];
    var debut = M.ajouter(aujourdhui, -35), tsJour = function (iso, h, m) { var d = new Date(iso + 'T00:00:00'); d.setHours(h, m, 0, 0); return d.getTime(); };
    var P_ = {}; B.prestations.forEach(function (p) { P_[p.id] = p; });
    var A_ = {}; B.produits.forEach(function (a) { A_[a.id] = a; });
    /* stock de départ, puis réassorts hebdomadaires (avec la dépense « achat de stock » correspondante) */
    var depart = { a1: 30, a2: 14, a3: 18, a4: 24, a5: 12, a6: 40, a7: 12, a8: 16, a9: 20, c1: 400, c2: 900, c3: 4, c4: 6, c5: 3 };
    Object.keys(depart).forEach(function (k) { B.mouvements.push({ id: uid('M'), produit: k, type: 'initial', q: depart[k], cout: A_[k].achat, ts: tsJour(M.ajouter(debut, -1), 9, 0), par: 'u1', motif: '' }); });
    function reassort(iso, liste) {
      var tot = 0; Object.keys(liste).forEach(function (k) { tot += liste[k] * A_[k].achat; B.mouvements.push({ id: uid('M'), produit: k, type: 'entree', q: liste[k], cout: A_[k].achat, ts: tsJour(iso, 9, 30), par: 'u1', motif: '' }); });
      B.depenses.push({ id: uid('E'), date: iso, cat: 'stock', montant: tot, moyen: 'especes', note: 'Réassort (fictif)', par: 'u1', ts: tsJour(iso, 9, 35) });
    }
    var MOY = { especes: 52, wave: 26, om: 11, mtn: 7, moov: 4 };
    var PRINC = { p2: 30, p1: 20, b6: 16, p3: 8, p5: 5, b1: 8, b3: 4, b4: 3, b5: 3, e1: 2, e4: 2, e5: 1, p8: 1 };
    var JOUR = [0.75, 0.8, 0.85, 0.9, 1.15, 1.6, 0.55], HEURE = { 8: .3, 9: .6, 10: .8, 11: .9, 12: .7, 13: .6, 14: .7, 15: .85, 16: 1, 17: 1.3, 18: 1.55, 19: 1.35, 20: .8 };
    var hMax = maintenant.getHours();
    for (var d = debut; d <= aujourdhui; d = M.ajouter(d, 1)) {
      var js = M.jourSemaine(d), n = Math.round(26 * JOUR[js] * (0.85 + R() * 0.3));
      if (js === 0 && d !== aujourdhui) reassort(d, { a1: 6, a3: 4, a4: 6, a8: 4, c1: 60, c2: 150, c4: 1 });
      for (var i = 0; i < n; i++) {
        var h = +tirer(R, HEURE), mn = Math.floor(R() * 60);
        if (d === aujourdhui && h >= hMax) continue;
        var awa = R() < 0.07, par = awa ? 'u4' : (R() < 0.47 ? 'u2' : R() < 0.85 ? 'u3' : 'u1');
        var lignes = [], pr = awa ? tirer(R, { e4: 4, e5: 3, e1: 2, f10: 1 }) : tirer(R, PRINC);
        function ajouterP(id) { var p = P_[id]; lignes.push({ type: 'P', ref: id, nom: p.nom, q: 1, pu: p.variable ? p.prix + Math.round(R() * 4) * 1000 : p.prix, par: par, seg: p.seg, cat: p.cat, fid: !!p.fid }); }
        ajouterP(pr);
        if (!awa && pr !== 'b6' && R() < 0.22) ajouterP(R() < 0.6 ? 'b2' : 'b1');
        if (!awa && R() < 0.06) ajouterP('p4');
        if (!awa && R() < 0.1) ajouterP(R() < 0.7 ? 'p6' : 'p7');
        if (R() < 0.16) { var a = A_[tirer(R, { a1: 5, a3: 3, a4: 3, a8: 2, a2: 2, a6: 2, a7: 1, a5: 1 })]; lignes.push({ type: 'A', ref: a.id, nom: a.nom, q: 1, pu: a.vente, par: par }); }
        var client = R() < 0.4 ? 'k' + (1 + Math.floor(R() * 12)) : '';
        var tot = M.totaux(lignes, 0), moyen = tirer(R, MOY), pay = { moyen: moyen, montant: tot.total };
        if (moyen === 'especes') { var recu = tot.total <= 2000 && R() < 0.5 ? 5000 : Math.ceil(tot.total / 1000) * 1000 + (R() < 0.3 ? 5000 : 0); pay.recu = recu; pay.montant = recu; pay.rendu = recu - tot.total; }
        B.numero++;
        var ts = tsJour(d, h, mn), tx = { id: uid('T'), num: B.numero, ts: ts, date: d, caissier: R() < 0.3 ? 'u5' : par, client: client, statut: 'validee', lignes: lignes, remise: 0, total: tot.total, paiements: [pay], opId: uid('O'), sync: true };
        B.transactions.push(tx);
        M.mouvementsVente(tx, B.prestations, function () { return uid('M'); }, B.produits).forEach(function (m) { B.mouvements.push(m); });
      }
    }
    B.transactions.sort(function (a, b) { return a.ts - b.ts; }); B.transactions.forEach(function (t, i) { t.num = i + 1; }); B.numero = B.transactions.length;
    /* deux annulations tracées (fictives) */
    [B.transactions[40], B.transactions[B.transactions.length - 60]].forEach(function (t) {
      if (!t) return; t.statut = 'annulee'; t.annul = { par: 'u1', motif: 'Erreur de saisie (exemple fictif)', ts: t.ts + 600000 };
      M.mouvementsAnnulation(t, B.mouvements, function () { return uid('M'); }, 'u1').forEach(function (m) { m.ts = t.ts + 600000; B.mouvements.push(m); });
      B.audit.push({ id: uid('J'), ts: t.ts + 600000, par: 'u1', action: 'annulation', ref: t.id, motif: t.annul.motif, montant: t.total });
    });
    /* flacons : un « Flacon terminé » chaque fois que les prestations vendues ont vidé un flacon (estimation fictive, saisie par le coiffeur) */
    B.produits.filter(function (a) { return a.unite === 'flacon'; }).forEach(function (a) {
      var acc = 0;
      B.transactions.forEach(function (x) {
        if (x.statut !== 'validee') return;
        x.lignes.forEach(function (l) { var p = l.type === 'P' && P_[l.ref]; if (p && p.conso) p.conso.forEach(function (c) { if (c.produit === a.id) acc += c.q * l.q; }); });
        if (acc >= a.contenance) { acc -= a.contenance; B.mouvements.push({ id: uid('M'), produit: a.id, type: 'termine', q: -1, ts: x.ts + 300000, par: x.lignes[0].par, motif: '' }); }
      });
    });
    /* file d'attente fictive : un passage par vente (arrivée, attente, début, fin = encaissement), des clients partis aux heures chargées,
       et, pour aujourd'hui, une file en cours (2 clients servis, 3 qui attendent) */
    var numJour = {}, Kn = {}; B.clients.forEach(function (k) { Kn[k.id] = k.prenom; });
    function num(d) { numJour[d] = (numJour[d] || 0) + 1; return numJour[d]; }
    B.transactions.forEach(function (x) {
      if (x.statut !== 'validee') return;
      var dur = 0; x.lignes.forEach(function (l) { if (l.type === 'P' && P_[l.ref]) dur += P_[l.ref].duree * l.q; }); dur = Math.max(10, Math.round(dur * (0.8 + R() * 0.4)));
      var h = new Date(x.ts).getHours(), charge = h >= 17 && h <= 19 ? 2.2 : h >= 11 && h <= 13 ? 1.3 : 0.7, att = Math.round(R() * 18 * charge);
      var par = (x.lignes.filter(function (l) { return l.type === 'P'; })[0] || x.lignes[0]).par;
      B.passages.push({ id: uid('Q'), date: x.date, arrivee: x.ts - (att + dur) * 60000, debut: x.ts - dur * 60000, fin: x.ts, statut: 'fini', par: par, souhait: R() < 0.25 ? par : '', client: x.client, prenom: x.client ? Kn[x.client] : '', tx: x.id });
      if (charge > 2 && R() < 0.12) { var arr = x.ts - Math.round(20 + R() * 30) * 60000; B.passages.push({ id: uid('Q'), date: x.date, arrivee: arr, debut: 0, fin: arr + Math.round(15 + R() * 25) * 60000, statut: 'parti', par: '', souhait: '', client: '', prenom: '', tx: '' }); }
    });
    B.passages.sort(function (a, b) { return a.arrivee - b.arrivee; }); B.passages.forEach(function (p) { p.num = num(p.date); });
    var now = maintenant.getTime();
    [[22, 'encours', 'u2', 'k3'], [9, 'encours', 'u3', ''], [15, 'attente', '', 'k5', 'u3'], [8, 'attente', '', ''], [3, 'attente', '', 'k9']].forEach(function (q) {
      var arr = now - q[0] * 60000 - (q[1] === 'encours' ? 6 * 60000 : 0);
      B.passages.push({ id: uid('Q'), date: aujourdhui, arrivee: arr, debut: q[1] === 'encours' ? now - q[0] * 60000 : 0, fin: 0, statut: q[1], par: q[2], souhait: q[4] || '', client: q[3], prenom: q[3] ? Kn[q[3]] : '', tx: '', num: num(aujourdhui) });
    });
    /* dépenses d'exploitation fictives */
    var mois = [M.debutMois(debut), M.debutMois(aujourdhui)].filter(function (x, i, a) { return a.indexOf(x) === i; });
    mois.forEach(function (m0) {
      [['loyer', 150000, 'wave', 1], ['electricite', 32500, 'om', 5], ['eau', 8700, 'especes', 6], ['internet', 15000, 'wave', 3], ['marketing', 10000, 'om', 12], ['maintenance', 7500, 'especes', 18]].forEach(function (x) {
        var dd = M.ajouter(m0, x[3] - 1); if (dd < debut || dd > aujourdhui) return;
        B.depenses.push({ id: uid('E'), date: dd, cat: x[0], montant: x[1], moyen: x[2], note: '', par: 'u1', ts: tsJour(dd, 10, 0) });
      });
    });
    for (var w = debut; w <= aujourdhui; w = M.ajouter(w, 1)) if (M.jourSemaine(w) === 2) B.depenses.push({ id: uid('E'), date: w, cat: 'nettoyage', montant: 2500, moyen: 'especes', note: '', par: 'u5', ts: tsJour(w, 8, 15) });
    return B;
  }
  /* modèle de départ pour un vrai salon (configuration guidée) : catalogue et réglages, sans aucune vente */
  return { construire: construire, MODELE: { salon: SALON, categories: CATEGORIES, prestations: PRESTATIONS, produits: PRODUITS } };
})();
