/* Données de démonstration — ENTIÈREMENT FICTIVES (personnes, biens, montants).
   Elles sont fabriquées à partir de la date du jour, en passant par les mêmes opérations que l'application,
   pour que tous les liens (factures, paiements, tâches) soient cohérents. Marquées db.demo = true. */
var DEMO = (function () {
  'use strict';
  function graine(n) { return function () { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; }; }

  function creerBase(aujourdhui) {
    var A = aujourdhui || LE.jour(), rnd = graine(1111);
    var ent = function (a, b) { return a + Math.floor(rnd() * (b - a + 1)); };
    var choix = function (l) { return l[Math.floor(rnd() * l.length)]; };
    var arrondi = function (n, pas) { return Math.round(n / (pas || 5000)) * (pas || 5000); };
    var D = LE.decaler, debut = D(A, -365);
    var moisAvant = function (m) { var y = +A.slice(0, 4), mm = +A.slice(5, 7) - m; while (mm < 1) { mm += 12; y--; } return y + '-' + ('0' + mm).slice(-2) + '-'; };

    var db = LE.baseVide('Groupe Loft Eleven');
    db.demo = true;
    var dir = { id: 'US-DIRECTION', nom: 'Aurélie Kouassi', email: 'direction@demo.loft-eleven.ci', role: 'direction', fonction: 'Présidente', perimetre: { societes: ['*'], branches: [] }, actif: true, cree: debut + 'T08:00:00.000Z', maj: debut + 'T08:00:00.000Z' };
    db.utilisateurs[dir.id] = dir;
    function op(type, d, quand, qui) {
      var j = quand && quand > A ? A : (quand || A);
      return LE.appliquer(db, qui || dir, { type: type, donnees: d }, j + 'T' + ('0' + ent(8, 18)).slice(-2) + ':' + ('0' + ent(0, 59)).slice(-2) + ':00.000Z', { sansCopie: true, sansJournal: true }).id;
    }

    /* Sociétés et branches */
    var LER = op('societe.creer', { nom: 'Loft Eleven Résidences', forme: 'SARL', activite: 'Résidences meublées et conciergerie privée', ville: 'Abidjan', initiales: 'LER' }, debut);
    var LEP = op('societe.creer', { nom: 'Loft Eleven Patrimoine', forme: 'SARL', activite: 'Gestion de patrimoine immobilier', ville: 'Abidjan', initiales: 'LEP' }, debut);
    var LES = op('societe.creer', { nom: 'Loft Eleven Studio', forme: 'SARL', activite: 'Travaux, rénovation et décoration d’intérieur', ville: 'Abidjan', initiales: 'LES' }, debut);
    var brRes = op('branche.creer', { societeId: LER, nom: 'Luxury Residences', type: 'residences' }, debut);
    var brCon = op('branche.creer', { societeId: LER, nom: 'Private Concierge', type: 'conciergerie' }, debut);
    var brPat = op('branche.creer', { societeId: LEP, nom: 'Wealth & Property', type: 'patrimoine' }, debut);
    var brTra = op('branche.creer', { societeId: LES, nom: 'Projects & Renovation', type: 'travaux' }, debut);
    var brDec = op('branche.creer', { societeId: LES, nom: 'Interior Studio', type: 'decoration' }, debut);

    /* Équipe */
    var marc = op('utilisateur.creer', { nom: 'Marc Ahoussou', email: 'residences@demo.loft-eleven.ci', role: 'resp_metier', fonction: 'Responsable des résidences', perimetre: { societes: [LER], branches: [brRes, brCon] } }, debut);
    var fatou = op('utilisateur.creer', { nom: 'Fatou Diabaté', email: 'comptabilite@demo.loft-eleven.ci', role: 'comptable', fonction: 'Comptable', perimetre: { societes: ['*'] } }, debut);
    var ines = op('utilisateur.creer', { nom: 'Inès Brou', email: 'studio@demo.loft-eleven.ci', role: 'resp_societe', fonction: 'Directrice du Studio', perimetre: { societes: [LES] } }, debut);
    var awa = op('utilisateur.creer', { nom: 'Awa Touré', email: 'awa@demo.loft-eleven.ci', role: 'collaborateur', fonction: 'Gouvernante', perimetre: { societes: [LER] } }, debut);
    var koffi = op('utilisateur.creer', { nom: 'Koffi Yao', email: 'koffi@demo.loft-eleven.ci', role: 'collaborateur', fonction: 'Agent de maintenance', perimetre: { societes: [LER, LEP] } }, debut);
    var ibra = op('utilisateur.creer', { nom: 'Ibrahim Sanogo', email: 'chauffeur@demo.loft-eleven.ci', role: 'prestataire', fonction: 'Chauffeur privé (prestataire)', perimetre: { societes: [LER] }, expire: D(A, 75) }, debut);
    var U = function (id) { return db.utilisateurs[id]; };

    /* Contacts */
    var clients = [
      ['Mme Nadia Coulibaly', 'vip', 'Préfère un chauffeur à l’arrivée ; eau pétillante en chambre.'], ['M. Laurent Mercier', 'premium', 'Voyage d’affaires, facture au nom de sa société.'],
      ['M. et Mme Diallo', 'vip', 'Famille avec deux enfants ; lit bébé demandé.'], ['Mme Christelle Ouattara', 'premium', ''], ['M. Jean-Marc Kassi', 'standard', ''],
      ['Mme Sofia Benali', 'vip', 'Allergie aux fruits à coque (communiquée par la cliente).'], ['M. David Mensah', 'premium', 'Arrivée tardive fréquente.'], ['Mme Grace Adjobi', 'standard', ''],
      ['M. Thomas Lefèvre', 'premium', 'Séjours longs, préfère Riviera.'], ['Mme Aminata Koné', 'vip', 'Fleurs blanches à l’arrivée.'], ['M. Patrick Gnamien', 'standard', ''],
      ['Mme Elena Rossi', 'premium', 'Parle italien et anglais.'], ['M. Yves N’Dri', 'standard', ''], ['Mme Fatim Cissé', 'premium', ''], ['M. Henri Dubois', 'vip', 'Dîner privé le soir de l’arrivée.'],
      ['Mme Rachel Amon', 'standard', ''], ['M. Karim Haddad', 'premium', ''], ['Mme Léa Aka', 'standard', '']
    ].map(function (c, i) { return op('tiers.creer', { societeId: LER, type: 'client', nom: c[0], segment: c[1], preferences: c[2], telephone: '+225 07 00 00 ' + ('0' + (10 + i)).slice(-2) + ' ' + ('0' + (20 + i)).slice(-2), ville: choix(['Abidjan', 'Paris', 'Dakar', 'Lagos', 'Genève', 'Accra']), canal: choix(['WhatsApp', 'Téléphone', 'E-mail']) }, debut); });
    var prop1 = op('tiers.creer', { societeId: LEP, type: 'proprietaire', nom: 'SCI Horizon Plateau (fictive)', telephone: '+225 07 00 00 50 50', segment: 'vip' }, debut);
    var prop2 = op('tiers.creer', { societeId: LEP, type: 'proprietaire', nom: 'M. Serge Ahouré', telephone: '+225 07 00 00 51 51', segment: 'premium' }, debut);
    var locataire = op('tiers.creer', { societeId: LEP, type: 'client', nom: 'Cabinet Atlantis Conseil (fictif)', segment: 'premium' }, debut);
    var locataire2 = op('tiers.creer', { societeId: LEP, type: 'client', nom: 'M. Olivier Tano', segment: 'standard' }, debut);
    var fournisseurs = [['Blanchisserie Lagune', 'fournisseur'], ['Électricité Plus Services', 'prestataire'], ['Atelier Bois Noble', 'fournisseur'], ['Marbres & Pierres d’Abidjan', 'fournisseur'], ['Jardins de Cocody', 'prestataire']]
      .map(function (f) { return op('tiers.creer', { type: f[1], nom: f[0] + ' (fictif)' }, debut); });
    var clientStudio = op('tiers.creer', { societeId: LES, type: 'client', nom: 'Mme Victoire Assi', segment: 'vip', preferences: 'Style contemporain africain, teintes sable et laiton.' }, debut);

    /* Biens */
    var fetes = { nom: 'Fêtes de fin d’année', du: '12-15', au: '01-05' }, ete = { nom: 'Haute saison d’été', du: '07-01', au: '08-31' };
    var residences = [
      { nom: 'Villa Azur', type: 'villa', quartier: 'Cocody Ambassades', chambres: 4, capacite: 8, surface: 420, tarifNuit: 250000, ambiance: 'azur', equipements: ['Piscine', 'Jardin', 'Climatisation', 'Wi-Fi fibre', 'Groupe électrogène', 'Gardiennage', 'Cuisine équipée'], caution: 300000 },
      { nom: 'Penthouse Lagune', type: 'penthouse', quartier: 'Riviera Golf', chambres: 3, capacite: 6, surface: 260, tarifNuit: 180000, ambiance: 'lagune', equipements: ['Terrasse vue lagune', 'Jacuzzi', 'Climatisation', 'Wi-Fi fibre', 'Ascenseur privé', 'Conciergerie'], caution: 250000 },
      { nom: 'Résidence Ivoire', type: 'appartement', quartier: 'Zone 4', chambres: 2, capacite: 4, surface: 140, tarifNuit: 120000, ambiance: 'ivoire', equipements: ['Climatisation', 'Wi-Fi fibre', 'Salle de sport', 'Parking', 'Gardiennage'], caution: 150000 },
      { nom: 'Studio Signature', type: 'studio', quartier: 'Marcory Biétry', chambres: 1, capacite: 2, surface: 55, tarifNuit: 65000, ambiance: 'signature', equipements: ['Climatisation', 'Wi-Fi fibre', 'Vue lagune', 'Machine à café'], caution: 0 },
      { nom: 'Villa Les Palmes', type: 'villa', quartier: 'Riviera 3', chambres: 4, capacite: 8, surface: 380, tarifNuit: 220000, ambiance: 'palmes', equipements: ['Piscine', 'Jardin tropical', 'Climatisation', 'Wi-Fi fibre', 'Groupe électrogène', 'Gardiennage'], caution: 300000 },
      { nom: 'Appartement Émeraude', type: 'appartement', quartier: 'Cocody Deux-Plateaux', chambres: 2, capacite: 4, surface: 120, tarifNuit: 95000, ambiance: 'emeraude', equipements: ['Climatisation', 'Wi-Fi fibre', 'Balcon', 'Parking'], caution: 100000 }
    ].map(function (b) {
      b.id = op('bien.creer', { branchId: brRes, nom: b.nom, type: b.type, mode: 'location_meublee', quartier: b.quartier, ville: 'Abidjan', chambres: b.chambres, capacite: b.capacite, surface: b.surface,
        equipements: b.equipements, tarifNuit: b.tarifNuit, remiseSemaine: 10, remiseMois: 20, ambiance: b.ambiance, valeurType: 'estimation',
        saisons: [{ nom: fetes.nom, du: fetes.du, au: fetes.au, prix: arrondi(b.tarifNuit * 1.3) }, { nom: ete.nom, du: ete.du, au: ete.au, prix: arrondi(b.tarifNuit * 1.15) }],
        description: 'Résidence de démonstration. Photographies à remplacer par celles du bien réel.' }, debut);
      return b;
    });
    var horizon = op('bien.creer', { branchId: brPat, nom: 'Immeuble Horizon', type: 'bureau', mode: 'gestion_locative', quartier: 'Plateau', ville: 'Abidjan', surface: 900, loyerMensuel: 2500000, commission: 8, proprietaireId: prop1, valeurEstimee: 1200000000, valeurType: 'expertise', ambiance: 'horizon', equipements: ['Plateaux de bureaux', 'Parking 20 places', 'Groupe électrogène'] }, debut);
    var palmeraie = op('bien.creer', { branchId: brPat, nom: 'Appartement Palmeraie', type: 'appartement', mode: 'gestion_locative', quartier: 'Riviera Palmeraie', ville: 'Abidjan', chambres: 3, surface: 160, loyerMensuel: 650000, commission: 10, proprietaireId: prop2, valeurEstimee: 145000000, valeurType: 'estimation', ambiance: 'palmeraie' }, debut);
    var bassam = op('bien.creer', { branchId: brPat, nom: 'Villa Bassam Plage', type: 'villa', mode: 'patrimoine_propre', quartier: 'Grand-Bassam', ville: 'Grand-Bassam', chambres: 5, surface: 520, valeurEstimee: 420000000, valeurType: 'estimation', ambiance: 'bassam', equipements: ['Accès plage', 'Piscine', 'Paillote'] }, debut);
    db.biens[horizon].locataire = 'Cabinet Atlantis Conseil (fictif)'; db.biens[horizon].finMandat = D(A, 41);
    db.biens[palmeraie].locataire = 'M. Olivier Tano';
    db.biens[residences[2].id].inventaire = [{ nom: 'Lit king size', qte: 1, etat: 'bon' }, { nom: 'Lit double', qte: 1, etat: 'bon' }, { nom: 'Téléviseur 65 pouces', qte: 2, etat: 'bon' }, { nom: 'Machine à café', qte: 1, etat: 'à remplacer' }, { nom: 'Service de table 8 couverts', qte: 1, etat: 'bon' }];

    /* Comptes de trésorerie */
    var cpt = {};
    cpt[LER] = { banque: op('compte.creer', { societeId: LER, nom: 'Banque · compte courant', type: 'banque', soldeInitial: 18500000, dateSolde: debut }, debut),
      caisse: op('compte.creer', { societeId: LER, nom: 'Caisse des résidences', type: 'caisse', soldeInitial: 650000, dateSolde: debut }, debut),
      momo: op('compte.creer', { societeId: LER, nom: 'Mobile Money', type: 'mobile_money', soldeInitial: 420000, dateSolde: debut }, debut) };
    cpt[LEP] = { banque: op('compte.creer', { societeId: LEP, nom: 'Banque · compte courant', type: 'banque', soldeInitial: 9200000, dateSolde: debut }, debut) };
    cpt[LES] = { banque: op('compte.creer', { societeId: LES, nom: 'Banque · compte courant', type: 'banque', soldeInitial: 7400000, dateSolde: debut }, debut),
      momo: op('compte.creer', { societeId: LES, nom: 'Mobile Money', type: 'mobile_money', soldeInitial: 300000, dateSolde: debut }, debut) };
    var compteDe = function (soc, mode) { var c = cpt[soc]; return mode === 'especes' ? (c.caisse || c.banque) : mode === 'mobile_money' ? (c.momo || c.banque) : c.banque; };
    var modeAuHasard = function () { var r = rnd(); return r < 0.35 ? 'virement' : r < 0.65 ? 'mobile_money' : r < 0.85 ? 'carte' : 'especes'; };
    function payer(factureId, montant, quand, confirme, mode) {
      var f = db.factures[factureId]; mode = mode || modeAuHasard();
      return op('paiement.creer', { factureId: factureId, date: quand > A ? A : quand, montant: montant, mode: mode, compteId: compteDe(f.societeId, mode), reference: mode === 'mobile_money' ? 'MM' + ent(100000, 999999) : mode === 'virement' ? 'VIR-' + ent(1000, 9999) : '', confirme: confirme }, quand);
    }

    /* Séjours */
    var duree = [2, 3, 3, 4, 4, 5, 6, 7, 7, 10, 14];
    var sources = ['direct', 'direct', 'direct', 'airbnb', 'booking', 'agence'];
    var impayesVoulus = 2;
    residences.forEach(function (b, ib) {
      var c = D(debut, ent(0, 6)), fin = D(A, 50);
      while (c < fin) {
        var gap = rnd() < 0.25 ? ent(4, 9) : ent(0, 3), n = choix(duree);
        var d0 = D(c, gap), d1 = D(d0, n); c = d1;
        if (d0 >= fin) break;
        var futur = d0 > A, client = choix(clients), cree = D(d0, -ent(4, 25)); if (cree < debut) cree = debut;
        var resaId;
        try {
          resaId = op('reservation.creer', { bienId: b.id, clientId: client, debut: d0, fin: d1, voyageurs: Math.min(b.capacite, ent(1, b.capacite)), caution: b.caution || 0, source: choix(sources), heureArrivee: choix(['12:00', '14:00', '15:00', '16:00', '19:30', '22:00']), option: futur && rnd() < 0.15 }, cree);
        } catch (e) { continue; }
        var r = db.reservations[resaId];
        if (r.statut === 'option') continue;
        var f = db.factures[r.factureId], total = LE.totalFacture(f), acompte = arrondi(total * (rnd() < 0.5 ? 0.3 : 0.5), 1000);
        var acompteVerse = !futur || rnd() < 0.7;
        if (acompteVerse) payer(f.id, acompte, cree, !(futur && rnd() < 0.25));
        if (!futur) {
          op('reservation.arrivee', { id: resaId }, d0, U(marc));
          if (r.caution) op('reservation.caution', { id: resaId, statut: 'recue' }, d0, U(marc));
          var solde = total - (acompteVerse ? acompte : 0);
          var resteImpaye = impayesVoulus > 0 && d1 < D(A, -20) && d1 > D(A, -60) && rnd() < 0.3;
          if (resteImpaye) { impayesVoulus--; if (solde > 200000) payer(f.id, arrondi(solde / 2, 1000), d0, true); }
          else if (solde > 0) payer(f.id, solde, d0, true);
          if (d1 <= A) {
            var tard = d1 === A && ib % 2 === 0;
            if (!tard) {
              op('reservation.depart', { id: resaId, note: rnd() < 0.8 ? 5 : 4, commentaire: rnd() < 0.3 ? choix(['Séjour parfait, équipe aux petits soins.', 'Très belle résidence, accueil chaleureux.', 'Calme et raffiné, nous reviendrons.']) : '', assigneId: awa }, d1, U(marc));
              if (r.caution) op('reservation.caution', { id: resaId, statut: 'restituee' }, d1, U(marc));
              var t = LE.valeurs(db.taches).filter(function (x) { return x.reservationId === resaId; })[0];
              if (t && d1 < A) { op('tache.statut', { id: t.id, statut: 'faite', forcer: true }, d1, U(awa)); if (d1 < D(A, -1)) op('tache.statut', { id: t.id, statut: 'validee' }, d1, U(marc)); else t.checklist.forEach(function (x) { x.ok = true; }); }
            }
          }
        }
      }
    });
    // Période de maintenance planifiée et incident ouvert, pour illustrer les statuts.
    try { op('bien.bloquer', { id: residences[3].id, debut: D(A, 18), fin: D(A, 22), motif: 'Peinture et entretien annuel' }, A); } catch (e) { }
    op('bien.incident', { id: residences[1].id, titre: 'Climatisation de la suite principale bruyante', priorite: 'haute', tache: true }, D(A, -1), U(marc));
    var tMaint = LE.valeurs(db.taches).filter(function (x) { return x.type === 'maintenance' && x.bienId === residences[1].id; })[0];
    if (tMaint) { tMaint.assigneId = koffi; tMaint.heure = '10:00'; }

    /* Tâches à venir */
    var aFaire = [
      [residences[0].id, 'Accueil VIP · fleurs blanches et champagne', 'accueil', 0, 'haute', awa, ['Fleurs blanches', 'Champagne au frais', 'Carte de bienvenue manuscrite']],
      [residences[4].id, 'Contrôle piscine et jardin', 'controle', 1, 'normale', koffi, ['pH et chlore', 'Filtration', 'Taille des haies']],
      [null, 'Point hebdomadaire des résidences', 'administratif', 2, 'normale', marc, ['Taux d’occupation', 'Avis clients', 'Incidents ouverts']],
      [residences[2].id, 'Remplacer la machine à café', 'maintenance', 3, 'normale', koffi, []],
      [residences[5].id, 'Inventaire du linge', 'controle', -2, 'normale', awa, ['Draps', 'Serviettes', 'Peignoirs']]
    ];
    aFaire.forEach(function (x) { op('tache.creer', { bienId: x[0] || undefined, branchId: x[0] ? undefined : brRes, titre: x[1], type: x[2], date: D(A, x[3]), heure: x[3] === 0 ? '15:00' : undefined, priorite: x[4], assigneId: x[5], checklist: x[6] }, D(A, Math.min(0, x[3]) - 1), U(marc)); });

    /* Dépenses mensuelles */
    for (var m = 12; m >= 0; m--) {
      var mois = moisAvant(m);
      var dep = function (soc, br, bien, cat, lib, mt, jourM) {
        var dt = mois + ('0' + jourM).slice(-2); if (dt > A || dt < debut) return;
        var payee = dt < D(A, -10) || rnd() < 0.5, mode = choix(['virement', 'virement', 'mobile_money', 'especes']);
        op('depense.creer', { societeId: soc, branchId: br, bienId: bien || undefined, categorie: cat, libelle: lib, montant: mt, date: dt, statut: payee ? 'payee' : 'engagee', mode: payee ? mode : undefined, compteId: payee ? compteDe(soc, mode) : undefined, fournisseurId: cat === 'menage' ? fournisseurs[0] : cat === 'energie' ? undefined : choix(fournisseurs) }, dt);
      };
      residences.forEach(function (b) {
        dep(LER, brRes, b.id, 'menage', 'Blanchisserie et produits · ' + b.nom, arrondi(b.chambres * ent(14000, 22000), 1000), 5);
        dep(LER, brRes, b.id, 'energie', 'Électricité, eau et internet · ' + b.nom, arrondi(b.surface * ent(320, 520), 1000), 12);
        if (rnd() < 0.45) dep(LER, brRes, b.id, 'entretien', choix(['Plomberie', 'Climatisation', 'Peinture', 'Électricité', 'Jardin']) + ' · ' + b.nom, arrondi(ent(35000, 260000), 5000), ent(8, 24));
      });
      dep(LER, brRes, null, 'personnel', 'Salaires · équipe résidences', 3450000, 28);
      dep(LER, brCon, null, 'personnel', 'Salaires · conciergerie', 1200000, 28);
      dep(LES, brTra, null, 'personnel', 'Salaires · Studio', 2100000, 28);
      dep(LEP, brPat, horizon, 'entretien', 'Entretien des parties communes · Immeuble Horizon', 120000, 15);
      if (m % 3 === 0) dep(LEP, brPat, bassam, 'entretien', 'Gardiennage et entretien · Villa Bassam Plage', 450000, 10);
      dep(LER, brRes, null, 'honoraires', 'Commissions des plateformes et agences', arrondi(ent(250000, 520000), 5000), 20);
    }

    /* Loyers des biens gérés (pour le compte des propriétaires) et honoraires de gestion */
    for (var k = 11; k >= 0; k--) {
      var premier = moisAvant(k) + '01'; if (premier < debut) continue;
      [[horizon, 2500000, locataire, prop1, 8], [palmeraie, 650000, locataire2, prop2, 10]].forEach(function (x, i) {
        var fl = op('facture.creer', { bienId: x[0], branchId: brPat, tiersId: x[2], libelle: 'Loyer ' + premier.slice(0, 7) + ' · ' + db.biens[x[0]].nom, date: premier, echeance: D(premier, 4), montant: x[1], objetType: 'loyer' }, premier);
        var impaye = i === 1 && k === 0, enRetard = i === 1 && k === 1;
        if (!impaye) payer(fl, x[1], D(premier, enRetard ? 19 : ent(1, 6)), true, 'virement');
        if (premier < D(A, -3)) {
          var fh = op('facture.creer', { bienId: x[0], branchId: brPat, tiersId: x[3], libelle: 'Honoraires de gestion ' + premier.slice(0, 7) + ' · ' + db.biens[x[0]].nom, date: D(premier, 6), echeance: D(premier, 20), montant: Math.round(x[1] * x[4] / 100), objetType: 'honoraires' }, D(premier, 6));
          if (D(premier, 8) <= A) payer(fh, Math.round(x[1] * x[4] / 100), D(premier, 8), true, 'virement');
        }
      });
    }

    /* Conciergerie */
    var typesP = [['transfert', 'Transfert aéroport FHB → résidence', 45000, 22000], ['chauffeur', 'Chauffeur privé à la journée', 85000, 40000], ['restauration', 'Dîner privé du chef à domicile', 320000, 185000],
      ['evenement', 'Organisation d’un anniversaire', 1250000, 780000], ['accueil', 'Accueil personnalisé et courses', 60000, 25000], ['reservation', 'Réservation restaurant et soirée', 30000, 5000], ['assistance', 'Assistance administrative', 75000, 15000]];
    for (var i = 0; i < 64; i++) {
      var tp = choix(typesP), dt = D(A, -ent(1, 355)), cl = choix(clients);
      var pid = op('prestation.creer', { branchId: brCon, clientId: cl, type: tp[0], libelle: tp[1], date: dt, heure: choix(['08:00', '11:30', '18:00', '20:00']), priorite: 'normale', assigneId: tp[0] === 'transfert' || tp[0] === 'chauffeur' ? ibra : marc, prix: arrondi(tp[2] * (0.9 + rnd() * 0.3), 5000), cout: arrondi(tp[3] * (0.9 + rnd() * 0.2), 5000) }, D(dt, -2));
      op('prestation.statut', { id: pid, statut: 'realisee', note: rnd() < 0.8 ? 5 : 4 }, dt, U(marc));
      var p = db.prestations[pid];
      var fp = op('facture.creer', { branchId: brCon, tiersId: cl, libelle: tp[1], date: dt, echeance: D(dt, 7), montant: p.prix, objetType: 'prestation', objetId: pid }, dt);
      if (D(dt, 3) <= A) payer(fp, p.prix, D(dt, ent(0, 6)), true);
    }
    [[1, 'transfert', 'Transfert aéroport · vol AF 702', 'urgente', ibra, clients[0]], [0, 'restauration', 'Dîner privé pour 6 personnes', 'haute', marc, clients[14]],
      [2, 'chauffeur', 'Chauffeur pour une journée de rendez-vous', 'normale', ibra, clients[1]], [4, 'evenement', 'Soirée de lancement privée', 'haute', null, clients[9]], [6, 'accueil', 'Accueil famille et installation', 'normale', null, clients[2]]]
      .forEach(function (x) { var tp = typesP.filter(function (t) { return t[0] === x[1]; })[0]; op('prestation.creer', { branchId: brCon, clientId: x[5], type: x[1], libelle: x[2], date: D(A, x[0]), heure: choix(['07:30', '12:00', '19:30']), priorite: x[3], assigneId: x[4] || undefined, prix: tp[2], cout: tp[3] }, D(A, -1), U(marc)); });

    /* Projets du Studio (dont un chantier interne au groupe : neutralisé en vue consolidée) */
    var pj1 = op('projet.creer', { branchId: brTra, bienId: residences[4].id, nom: 'Rénovation des salles de bain · Villa Les Palmes', type: 'renovation', budget: 14500000, debut: D(A, -70), finPrevue: D(A, -4),
      jalons: [{ nom: 'Dépose et plomberie', date: D(A, -55), poids: 2 }, { nom: 'Étanchéité', date: D(A, -40), poids: 1 }, { nom: 'Pose du marbre', date: D(A, -20), poids: 3 }, { nom: 'Robinetterie et finitions', date: D(A, -8), poids: 2 }, { nom: 'Réception avec la direction', date: D(A, -4), poids: 1 }] }, D(A, -72), U(ines));
    [0, 1, 2].forEach(function (j) { op('projet.jalon', { id: pj1, index: j, fait: true }, D(A, [-54, -39, -18][j]), U(ines)); });
    var pj2 = op('projet.creer', { branchId: brDec, clientId: clientStudio, nom: 'Décoration complète · Penthouse privé, Cocody', type: 'decoration', budget: 32000000, debut: D(A, -45), finPrevue: D(A, 40),
      jalons: [{ nom: 'Brief et moodboard validés', date: D(A, -38), poids: 1 }, { nom: 'Plans d’aménagement', date: D(A, -25), poids: 2 }, { nom: 'Commandes mobilier', date: D(A, -5), poids: 3 }, { nom: 'Livraison et installation', date: D(A, 30), poids: 3 }, { nom: 'Mise en scène finale', date: D(A, 40), poids: 1 }] }, D(A, -46), U(ines));
    [0, 1].forEach(function (j) { op('projet.jalon', { id: pj2, index: j, fait: true }, D(A, [-37, -24][j]), U(ines)); });
    var pj3 = op('projet.creer', { branchId: brTra, bienId: horizon, clientId: prop1, nom: 'Réaménagement du 3ᵉ étage · Immeuble Horizon', type: 'amenagement', budget: 21000000, debut: D(A, -20), finPrevue: D(A, 60),
      jalons: [{ nom: 'Relevés et plans', date: D(A, -10), poids: 1 }, { nom: 'Cloisons et électricité', date: D(A, 20), poids: 3 }, { nom: 'Finitions', date: D(A, 50), poids: 2 }] }, D(A, -21), U(ines));
    op('projet.jalon', { id: pj3, index: 0, fait: true }, D(A, -9), U(ines));
    var depP = function (pj, lib, mt, j, f, cat) { op('depense.creer', { projetId: pj, categorie: cat || 'travaux', libelle: lib, montant: mt, date: D(A, j), fournisseurId: f, statut: j < -12 ? 'payee' : 'engagee', mode: j < -12 ? 'virement' : undefined, compteId: j < -12 ? cpt[LES].banque : undefined }, D(A, j), U(ines)); };
    depP(pj1, 'Marbre de Carrare et pose', 6900000, -30, fournisseurs[3]); depP(pj1, 'Plomberie et robinetterie', 4300000, -50, fournisseurs[1]); depP(pj1, 'Main-d’œuvre · équipe Studio', 2600000, -25); depP(pj1, 'Imprévu : reprise d’étanchéité', 1450000, -6);
    depP(pj2, 'Mobilier sur mesure · acompte', 9800000, -15, fournisseurs[2], 'mobilier'); depP(pj2, 'Luminaires et textiles', 4200000, -8, null, 'mobilier');
    depP(pj3, 'Relevés et plans', 1200000, -12, null, 'honoraires');
    // Facturation interne : le Studio facture la rénovation aux Résidences ; les Résidences l'enregistrent en charge.
    var fi = op('facture.creer', { branchId: brTra, bienId: residences[4].id, libelle: 'Rénovation salles de bain · Villa Les Palmes (situation n° 1)', date: D(A, -20), echeance: D(A, 10), montant: 9000000, objetType: 'projet', objetId: pj1, interneSocieteId: LER }, D(A, -20), U(ines));
    op('depense.creer', { branchId: brRes, bienId: residences[4].id, categorie: 'travaux', libelle: 'Situation n° 1 · rénovation par Loft Eleven Studio', montant: 9000000, date: D(A, -20), statut: 'engagee', interneSocieteId: LES }, D(A, -20));
    var fc = op('facture.creer', { branchId: brDec, tiersId: clientStudio, libelle: 'Décoration Penthouse · acompte de 40 %', date: D(A, -40), echeance: D(A, -30), montant: 12800000, objetType: 'projet', objetId: pj2 }, D(A, -40), U(ines));
    payer(fc, 12800000, D(A, -32), true, 'virement');
    op('facture.creer', { branchId: brDec, tiersId: clientStudio, libelle: 'Décoration Penthouse · deuxième acompte', date: D(A, -3), echeance: D(A, 12), montant: 9600000, objetType: 'projet', objetId: pj2 }, D(A, -3), U(ines));
    op('facture.creer', { branchId: brTra, tiersId: prop1, bienId: horizon, libelle: 'Réaménagement 3ᵉ étage · acompte', date: D(A, -18), echeance: D(A, -8), montant: 6300000, objetType: 'projet', objetId: pj3 }, D(A, -18), U(ines));

    // Une arrivée et un départ aujourd'hui, pour que l'accueil de la démonstration montre la journée type.
    var enCours = LE.valeurs(db.reservations).filter(function (r) { return r.statut === 'en_cours' && r.fin > A && r.debut < D(A, -1); });
    if (!LE.valeurs(db.reservations).some(function (r) { return r.statut === 'en_cours' && r.fin === A; }) && enCours[0]) { enCours[0].fin = A; enCours[0].nuits = LE.ecart(enCours[0].debut, A); }
    if (!LE.valeurs(db.reservations).some(function (r) { return r.debut === A && r.statut === 'confirmee'; })) {
      residences.some(function (b) { try { var id = op('reservation.creer', { bienId: b.id, clientId: clients[9], debut: A, fin: D(A, 4), voyageurs: 2, caution: b.caution || 0, source: 'direct', heureArrivee: '16:00' }, D(A, -12)); payer(db.reservations[id].factureId, arrondi(LE.totalFacture(db.factures[db.reservations[id].factureId]) * 0.5, 1000), D(A, -11), true, 'virement'); return true; } catch (e) { return false; } });
    }
    db.meta.version = 1;
    db.meta.demoCreeLe = A;
    return db;
  }

  /* Profils proposés dans la démonstration pour essayer les droits. */
  var PROFILS = [
    { email: 'direction@demo.loft-eleven.ci', titre: 'Direction générale', sous: 'Tout le groupe' },
    { email: 'residences@demo.loft-eleven.ci', titre: 'Responsable métier', sous: 'Résidences et conciergerie' },
    { email: 'studio@demo.loft-eleven.ci', titre: 'Responsable de société', sous: 'Loft Eleven Studio' },
    { email: 'comptabilite@demo.loft-eleven.ci', titre: 'Comptabilité', sous: 'Finances du groupe' },
    { email: 'awa@demo.loft-eleven.ci', titre: 'Collaboratrice', sous: 'Ses tâches seulement' },
    { email: 'chauffeur@demo.loft-eleven.ci', titre: 'Prestataire externe', sous: 'Accès temporaire' }
  ];
  return { creerBase: creerBase, PROFILS: PROFILS };
})();
