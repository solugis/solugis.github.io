/* LOFT ELEVEN · PRIVATE OFFICE — moteur partagé.
   Le même fichier tourne dans Apps Script (serveur) et dans le navigateur (démonstration) :
   schéma des données, droits, règles de gestion, indicateurs et alertes.
   Toutes les dates sont des chaînes 'AAAA-MM-JJ' (Abidjan = UTC toute l'année). Montants en FCFA entiers. */
var LE = (function () {
  'use strict';

  /* ------------------------------------------------------------------ outils */
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function jour(d) { d = d || new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function ms(s) { var a = String(s).split('-'); return Date.UTC(+a[0], +a[1] - 1, +a[2]); }
  function decaler(s, n) { var d = new Date(ms(s) + n * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function ecart(a, b) { return Math.round((ms(b) - ms(a)) / 864e5); }          // b − a, en jours
  function nuitsCommunes(a1, a2, b1, b2) { var d = a1 > b1 ? a1 : b1, f = a2 < b2 ? a2 : b2; return f > d ? ecart(d, f) : 0; }
  function estDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(ms(s)); }
  function valeurs(o) { return o ? Object.keys(o).map(function (k) { return o[k]; }) : []; }
  function somme(l, f) { var t = 0; for (var i = 0; i < l.length; i++) t += (f ? f(l[i]) : l[i]) || 0; return t; }
  function copie(o) { return JSON.parse(JSON.stringify(o)); }
  function fcfa(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n < 0 ? '−' : '') + s + ' FCFA';
  }
  function refus(message) { var e = new Error(message); e.refus = true; throw e; }

  var COLLECTIONS = ['societes', 'branches', 'biens', 'tiers', 'reservations', 'factures', 'paiements', 'depenses',
    'comptes', 'taches', 'prestations', 'projets', 'utilisateurs', 'journal'];
  var PREFIXES = { societes: 'SOC', branches: 'BR', biens: 'BI', tiers: 'TI', reservations: 'RE', factures: 'FA', paiements: 'PA',
    depenses: 'DE', comptes: 'CO', taches: 'TA', prestations: 'PR', projets: 'PJ', utilisateurs: 'US', journal: 'JO' };

  function baseVide(nomGroupe) {
    var db = { groupe: { nom: nomGroupe || 'Groupe Loft Eleven', devise: 'XOF' }, meta: { version: 0, seq: {} } };
    COLLECTIONS.forEach(function (c) { db[c] = {}; });
    return db;
  }

  /* ------------------------------------------------------------------ listes de valeurs */
  var LISTES = {
    typeBranche: { residences: 'Résidences meublées', patrimoine: 'Gestion de patrimoine', conciergerie: 'Conciergerie privée', travaux: 'Travaux et rénovation', decoration: 'Décoration d’intérieur', autre: 'Autre activité' },
    typeBien: { villa: 'Villa', appartement: 'Appartement', penthouse: 'Penthouse', studio: 'Studio', bureau: 'Bureau', local: 'Local commercial', terrain: 'Terrain', autre: 'Autre' },
    modeBien: { location_meublee: 'Résidence meublée', gestion_locative: 'Gestion pour un propriétaire', patrimoine_propre: 'Patrimoine du groupe' },
    etatBien: { actif: 'En service', maintenance: 'Maintenance', indisponible: 'Indisponible' },
    statutBien: { disponible: 'Disponible', occupee: 'Occupée', reservee: 'Réservée', preparation: 'Préparation', maintenance: 'Maintenance', indisponible: 'Indisponible', louee: 'Louée' },
    typeTiers: { client: 'Client', prospect: 'Prospect', proprietaire: 'Propriétaire', prestataire: 'Prestataire', fournisseur: 'Fournisseur', partenaire: 'Partenaire' },
    segment: { standard: 'Standard', premium: 'Premium', vip: 'VIP' },
    statutReservation: { option: 'Option', confirmee: 'Confirmée', en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' },
    sourceReservation: { direct: 'Direct', airbnb: 'Airbnb (saisie manuelle)', booking: 'Booking.com (saisie manuelle)', agence: 'Agence partenaire', autre: 'Autre' },
    caution: { aucune: 'Sans caution', a_recevoir: 'À recevoir', recue: 'Reçue', restituee: 'Restituée', retenue: 'Retenue en partie' },
    modePaiement: { especes: 'Espèces', virement: 'Virement bancaire', carte: 'Carte bancaire', mobile_money: 'Mobile Money', cheque: 'Chèque' },
    statutPaiement: { en_attente: 'En attente de confirmation', confirme: 'Confirmé', annule: 'Annulé' },
    categorieDepense: { menage: 'Ménage et linge', entretien: 'Entretien et réparations', energie: 'Eau, électricité, internet', travaux: 'Travaux', mobilier: 'Mobilier et décoration', fournitures: 'Fournitures', personnel: 'Personnel', honoraires: 'Honoraires et commissions', prestataires: 'Prestataires', taxes: 'Taxes et redevances', assurance: 'Assurances', autre: 'Autre' },
    statutDepense: { engagee: 'Engagée', payee: 'Payée', annulee: 'Annulée' },
    typeCompte: { banque: 'Banque', caisse: 'Caisse', mobile_money: 'Mobile Money' },
    typeTache: { menage: 'Ménage et préparation', accueil: 'Accueil', maintenance: 'Maintenance', controle: 'Contrôle', administratif: 'Administratif', autre: 'Autre' },
    priorite: { normale: 'Normale', haute: 'Haute', urgente: 'Urgente' },
    statutTache: { a_faire: 'À faire', en_cours: 'En cours', faite: 'Faite', validee: 'Validée', annulee: 'Annulée' },
    typePrestation: { transfert: 'Transfert privé', chauffeur: 'Chauffeur', restauration: 'Restauration', evenement: 'Événement', accueil: 'Accueil personnalisé', reservation: 'Réservation de service', entretien: 'Entretien', assistance: 'Assistance', autre: 'Demande particulière' },
    statutPrestation: { demandee: 'Demandée', planifiee: 'Planifiée', en_cours: 'En cours', realisee: 'Réalisée', annulee: 'Annulée' },
    typeProjet: { renovation: 'Rénovation', decoration: 'Décoration', amenagement: 'Aménagement', construction: 'Construction' },
    statutProjet: { etude: 'À l’étude', en_cours: 'En cours', livre: 'Livré', suspendu: 'Suspendu', annule: 'Annulé' },
    valeurType: { estimation: 'Estimation interne', expertise: 'Expertise' },
    objetFacture: { reservation: 'Séjour', prestation: 'Prestation', projet: 'Projet', loyer: 'Loyer', honoraires: 'Honoraires', autre: 'Autre' }
  };

  /* ------------------------------------------------------------------ rôles et droits
     Niveaux : 0 aucun, 1 lecture, 2 écriture. Le périmètre (sociétés, branches) s'ajoute au rôle. */
  var MODULES = ['tableau', 'biens', 'reservations', 'finance', 'agenda', 'conciergerie', 'projets', 'tiers', 'acces', 'journal', 'rapports'];
  var ROLES = {
    direction:     { nom: 'Direction générale', mfa: true, m: { tableau: 2, biens: 2, reservations: 2, finance: 2, agenda: 2, conciergerie: 2, projets: 2, tiers: 2, acces: 2, journal: 1, rapports: 1 } },
    resp_societe:  { nom: 'Responsable de société', mfa: true, m: { tableau: 1, biens: 2, reservations: 2, finance: 2, agenda: 2, conciergerie: 2, projets: 2, tiers: 2, acces: 0, journal: 1, rapports: 1 } },
    resp_metier:   { nom: 'Responsable métier', m: { tableau: 1, biens: 2, reservations: 2, finance: 1, agenda: 2, conciergerie: 2, projets: 2, tiers: 2, acces: 0, journal: 0, rapports: 1 } },
    comptable:     { nom: 'Comptabilité', mfa: true, m: { tableau: 1, biens: 1, reservations: 1, finance: 2, agenda: 0, conciergerie: 1, projets: 1, tiers: 1, acces: 0, journal: 1, rapports: 1 } },
    collaborateur: { nom: 'Collaborateur', propre: true, m: { agenda: 2, biens: 1 } },
    prestataire:   { nom: 'Prestataire externe', propre: true, expiration: true, m: { agenda: 2 } },
    proprietaire:  { nom: 'Propriétaire (portail à venir)', portail: true, m: { biens: 1, finance: 1, rapports: 1 } }
  };

  function niveau(u, module) {
    if (!u || !u.actif) return 0;
    var r = ROLES[u.role]; if (!r) return 0;
    var n = r.m[module] || 0;
    if (u.modules && u.modules[module] !== undefined) n = Math.min(n, +u.modules[module]);   // restriction individuelle
    return n;
  }
  function expire(u, aujourdhui) { return !!(u.expire && u.expire < aujourdhui); }
  function toutesSocietes(u) { return !u.perimetre || !u.perimetre.societes || u.perimetre.societes.indexOf('*') >= 0; }
  function societeAutorisee(u, sid) { return toutesSocietes(u) || u.perimetre.societes.indexOf(sid) >= 0; }
  function branchesLimitees(u) { return !!(u.perimetre && u.perimetre.branches && u.perimetre.branches.length); }
  /* Un enregistrement est visible si sa société est autorisée et, pour un accès limité à des branches, si sa branche l'est. */
  function dansPerimetre(u, rec) {
    if (!rec) return false;
    if (rec.societeId && !societeAutorisee(u, rec.societeId)) return false;
    if (branchesLimitees(u)) {
      if (!rec.branchId) return false;
      if (u.perimetre.branches.indexOf(rec.branchId) < 0) return false;
    }
    return true;
  }

  var MODULE_DE = { biens: 'biens', reservations: 'reservations', factures: 'finance', paiements: 'finance', depenses: 'finance', comptes: 'finance',
    taches: 'agenda', prestations: 'conciergerie', projets: 'projets', tiers: 'tiers', journal: 'journal' };
  var CHAMPS_FINANCIERS = { biens: ['tarifNuit', 'saisons', 'remiseSemaine', 'remiseMois', 'loyerMensuel', 'valeurEstimee', 'valeurType', 'commission'],
    reservations: ['tarifNuit', 'montant', 'caution', 'factureId'], prestations: ['prix', 'cout', 'factureId'], projets: ['budget', 'factureIds'] };

  /* Vue autorisée : la base réduite à ce que l'utilisateur a le droit de voir. Appliquée côté serveur avant tout envoi. */
  function vue(db, u, aujourdhui) {
    aujourdhui = aujourdhui || jour();
    var out = baseVide(db.groupe.nom);
    out.meta = { version: db.meta.version };
    if (!u || !u.actif || expire(u, aujourdhui)) return out;
    var r = ROLES[u.role], fin = niveau(u, 'finance') > 0;
    var garder = function (col, rec) {
      var c = copie(rec);
      if (!fin && CHAMPS_FINANCIERS[col]) CHAMPS_FINANCIERS[col].forEach(function (k) { delete c[k]; });
      out[col][rec.id] = c;
    };
    if (r.propre) {
      // Collaborateur, prestataire : uniquement ses tâches, et les biens et sociétés qu'elles concernent.
      valeurs(db.taches).forEach(function (t) {
        if (t.assigneId !== u.id) return;
        garder('taches', t);
        if (t.bienId && db.biens[t.bienId] && niveau(u, 'biens')) garder('biens', db.biens[t.bienId]);
        if (t.societeId && db.societes[t.societeId]) out.societes[t.societeId] = { id: t.societeId, nom: db.societes[t.societeId].nom };
      });
      // Missions de conciergerie qui lui sont confiées (chauffeur, accueil…), sans prix ni coût.
      valeurs(db.prestations).forEach(function (p) {
        if (p.assigneId !== u.id) return;
        garder('prestations', p);
        if (p.societeId && db.societes[p.societeId]) out.societes[p.societeId] = { id: p.societeId, nom: db.societes[p.societeId].nom };
      });
      out.utilisateurs[u.id] = annuaire(db.utilisateurs[u.id] || u);
      return out;
    }
    if (r.portail) {
      // Propriétaire : ses biens, leurs séjours (dates seulement), les revenus et charges de ses biens.
      var mesBiens = {};
      valeurs(db.biens).forEach(function (b) { if (u.tiersId && b.proprietaireId === u.tiersId) { mesBiens[b.id] = 1; garder('biens', b); } });
      valeurs(db.reservations).forEach(function (x) { if (mesBiens[x.bienId] && x.statut !== 'annulee') out.reservations[x.id] = { id: x.id, bienId: x.bienId, debut: x.debut, fin: x.fin, statut: x.statut, societeId: x.societeId, branchId: x.branchId }; });
      ['factures', 'depenses'].forEach(function (col) { valeurs(db[col]).forEach(function (x) { if (mesBiens[x.bienId]) garder(col, x); }); });
      valeurs(db.paiements).forEach(function (p) { if (out.factures[p.factureId]) garder('paiements', p); });
      out.utilisateurs[u.id] = annuaire(db.utilisateurs[u.id] || u);
      return out;
    }
    valeurs(db.societes).forEach(function (s) { if (societeAutorisee(u, s.id)) out.societes[s.id] = copie(s); });
    valeurs(db.branches).forEach(function (b) { if (dansPerimetre(u, b)) out.branches[b.id] = copie(b); });
    Object.keys(MODULE_DE).forEach(function (col) {
      if (!niveau(u, MODULE_DE[col])) return;
      valeurs(db[col]).forEach(function (rec) {
        var ok = col === 'tiers' ? (rec.societeId ? societeAutorisee(u, rec.societeId) : true) : dansPerimetre(u, rec);
        if (col === 'paiements') { var f = db.factures[rec.factureId]; ok = !!f && dansPerimetre(u, f); }
        if (col === 'journal') ok = rec.societeId ? societeAutorisee(u, rec.societeId) : toutesSocietes(u);
        if (ok) garder(col, rec);
      });
    });
    // Annuaire : les personnes du même périmètre, sans détail sensible ; la gestion des accès voit les fiches complètes.
    valeurs(db.utilisateurs).forEach(function (x) {
      var commun = x.id === u.id || toutesSocietes(u) || !x.perimetre || (x.perimetre.societes || []).some(function (s) { return s === '*' || societeAutorisee(u, s); });
      if (!commun) return;
      out.utilisateurs[x.id] = niveau(u, 'acces') >= 2 ? copie(x) : annuaire(x);
    });
    return out;
  }
  function annuaire(x) { return { id: x.id, nom: x.nom, role: x.role, actif: x.actif, fonction: x.fonction || '' }; }

  /* ------------------------------------------------------------------ schéma et nettoyage des saisies */
  var T = { texte: 'texte', long: 'long', nombre: 'nombre', montant: 'montant', signe: 'signe', pourcent: 'pourcent', date: 'date', heure: 'heure', liste: 'liste', bool: 'bool' };
  var SCHEMA = {
    societes: { nom: '!texte', forme: 'texte', activite: 'texte', ville: 'texte', rccm: 'texte', initiales: 'texte' },
    branches: { societeId: '!ref:societes', nom: '!texte', type: '!enum:typeBranche' },
    biens: { branchId: '!ref:branches', nom: '!texte', type: '!enum:typeBien', mode: '!enum:modeBien', quartier: 'texte', adresse: 'texte', ville: 'texte',
      chambres: 'nombre', capacite: 'nombre', surface: 'nombre', equipements: 'liste', description: 'long', etat: 'enum:etatBien',
      tarifNuit: 'montant', remiseSemaine: 'pourcent', remiseMois: 'pourcent', loyerMensuel: 'montant', commission: 'pourcent',
      proprietaireId: 'ref:tiers', valeurEstimee: 'montant', valeurType: 'enum:valeurType', ambiance: 'texte', photos: 'liste' },
    tiers: { societeId: 'ref:societes', type: '!enum:typeTiers', nom: '!texte', telephone: 'texte', email: 'texte', ville: 'texte',
      segment: 'enum:segment', preferences: 'long', notes: 'long', canal: 'texte' },
    reservations: { bienId: '!ref:biens', clientId: 'ref:tiers', clientNom: 'texte', telephone: 'texte', debut: '!date', fin: '!date', voyageurs: 'nombre',
      tarifNuit: 'montant', montant: 'montant', caution: 'montant', source: 'enum:sourceReservation', heureArrivee: 'heure', notes: 'long' },
    factures: { societeId: 'ref:societes', branchId: 'ref:branches', bienId: 'ref:biens', tiersId: 'ref:tiers', clientNom: 'texte', libelle: '!texte',
      date: '!date', echeance: 'date', montant: '!montant', taxe: 'montant', objetType: 'enum:objetFacture', objetId: 'texte', interneSocieteId: 'ref:societes', compteDeTiers: 'bool' },
    paiements: { factureId: '!ref:factures', date: '!date', montant: '!montant', mode: '!enum:modePaiement', reference: 'texte', compteId: 'ref:comptes' },
    depenses: { societeId: 'ref:societes', branchId: 'ref:branches', bienId: 'ref:biens', projetId: 'ref:projets', fournisseurId: 'ref:tiers', fournisseurNom: 'texte',
      libelle: '!texte', categorie: '!enum:categorieDepense', date: '!date', montant: '!montant', statut: 'enum:statutDepense', datePaiement: 'date',
      mode: 'enum:modePaiement', compteId: 'ref:comptes', interneSocieteId: 'ref:societes', justificatif: 'texte' },
    comptes: { societeId: '!ref:societes', nom: '!texte', type: '!enum:typeCompte', soldeInitial: 'signe', dateSolde: 'date' },
    taches: { societeId: 'ref:societes', branchId: 'ref:branches', bienId: 'ref:biens', reservationId: 'ref:reservations', titre: '!texte', type: 'enum:typeTache',
      date: '!date', heure: 'heure', priorite: 'enum:priorite', assigneId: 'ref:utilisateurs', notes: 'long', checklist: 'liste' },
    prestations: { societeId: 'ref:societes', branchId: 'ref:branches', clientId: 'ref:tiers', clientNom: 'texte', bienId: 'ref:biens', type: '!enum:typePrestation',
      libelle: '!texte', date: '!date', heure: 'heure', priorite: 'enum:priorite', assigneId: 'ref:utilisateurs', prix: 'montant', cout: 'montant', notes: 'long' },
    projets: { societeId: 'ref:societes', branchId: 'ref:branches', bienId: 'ref:biens', clientId: 'ref:tiers', nom: '!texte', type: '!enum:typeProjet',
      budget: 'montant', debut: 'date', finPrevue: 'date', description: 'long' },
    utilisateurs: { nom: '!texte', email: '!texte', role: '!enum:roles', fonction: 'texte', expire: 'date', tiersId: 'ref:tiers' }
  };
  function nettoyer(db, col, d, partiel) {
    var sch = SCHEMA[col], out = {};
    Object.keys(sch).forEach(function (k) {
      var regle = sch[k], requis = regle.charAt(0) === '!', type = requis ? regle.slice(1) : regle, v = d ? d[k] : undefined;
      if (v === undefined || v === null || v === '') {
        if (requis && !partiel) refus('Champ obligatoire manquant : ' + k + '.');
        if (partiel && v === undefined) return;
        out[k] = type === 'liste' ? [] : (type === 'bool' ? false : null);
        if (requis) refus('Champ obligatoire : ' + k + '.');
        return;
      }
      if (type === 'texte') { out[k] = String(v).trim().slice(0, 200); if (requis && !out[k]) refus('Champ obligatoire : ' + k + '.'); }
      else if (type === 'long') out[k] = String(v).slice(0, 4000);
      else if (type === 'nombre') { out[k] = Number(v); if (isNaN(out[k]) || out[k] < 0) refus('Nombre invalide : ' + k + '.'); }
      else if (type === 'montant') { out[k] = Math.round(Number(String(v).replace(/[\s  ]/g, ''))); if (isNaN(out[k]) || out[k] < 0) refus('Montant invalide : ' + k + '.'); }
      else if (type === 'signe') { out[k] = Math.round(Number(String(v).replace(/[\s  ]/g, ''))); if (isNaN(out[k])) refus('Montant invalide : ' + k + '.'); }
      else if (type === 'pourcent') { out[k] = Number(v); if (isNaN(out[k]) || out[k] < 0 || out[k] > 100) refus('Pourcentage invalide : ' + k + '.'); }
      else if (type === 'date') { if (!estDate(v)) refus('Date invalide : ' + k + '.'); out[k] = v; }
      else if (type === 'heure') { if (!/^\d{2}:\d{2}$/.test(v)) refus('Heure invalide : ' + k + '.'); out[k] = v; }
      else if (type === 'liste') { if (!Array.isArray(v)) refus('Liste invalide : ' + k + '.'); out[k] = v.slice(0, 60); }
      else if (type === 'bool') out[k] = !!v;
      else if (type.indexOf('enum:') === 0) {
        var l = type.slice(5) === 'roles' ? ROLES : LISTES[type.slice(5)];
        if (!l[v]) refus('Valeur non reconnue pour ' + k + '.'); out[k] = v;
      } else if (type.indexOf('ref:') === 0) {
        var c = type.slice(4); if (!db[c][v]) refus('Élément introuvable (' + k + ').'); out[k] = v;
      }
    });
    return out;
  }

  /* ------------------------------------------------------------------ règles métier */
  function prochainNumero(db, cle, prefixe, annee) {
    var k = cle + '-' + annee; db.meta.seq[k] = (db.meta.seq[k] || 0) + 1;
    return prefixe + '-' + annee + '-' + ('000' + db.meta.seq[k]).slice(-4);
  }
  function nouvelId(col, ctx) {
    return PREFIXES[col] + '-' + ctx.horodatage.toString(36).toUpperCase() + (ctx.compteur++).toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
  }
  /* Rattachement : un bien fixe la branche et la société, une branche fixe la société.
     brancheDabord : le bien n'est qu'un lieu (chantier du Studio dans une résidence, prestation) ; la branche indiquée décide. */
  function rattacher(db, rec, brancheDabord) {
    if (rec.bienId && db.biens[rec.bienId] && !(brancheDabord && rec.branchId)) { rec.branchId = db.biens[rec.bienId].branchId; rec.societeId = db.biens[rec.bienId].societeId; }
    if (rec.branchId && db.branches[rec.branchId]) rec.societeId = db.branches[rec.branchId].societeId;
    return rec;
  }

  /* Prix d'un séjour : tarif de saison par nuit, puis remise à la semaine (≥ 7 nuits) ou au mois (≥ 28 nuits). */
  function tarifSejour(bien, debut, fin) {
    var nuits = ecart(debut, fin), brut = 0, detail = {};
    for (var i = 0; i < nuits; i++) {
      var d = decaler(debut, i), md = d.slice(5), prix = bien.tarifNuit || 0, nom = 'Tarif de base';
      (bien.saisons || []).forEach(function (s) {
        var dedans = s.du <= s.au ? (md >= s.du && md <= s.au) : (md >= s.du || md <= s.au);
        if (dedans && s.prix) { prix = s.prix; nom = s.nom; }
      });
      brut += prix; detail[nom] = (detail[nom] || 0) + 1;
    }
    var remise = nuits >= 28 ? (bien.remiseMois || 0) : nuits >= 7 ? (bien.remiseSemaine || 0) : 0;
    var total = Math.round(brut * (1 - remise / 100) / 100) * 100;
    return { nuits: nuits, brut: brut, remise: remise, total: total, moyenne: nuits ? Math.round(total / nuits) : 0, detail: detail };
  }

  function sejoursActifs(db, bienId, sauf) {
    return valeurs(db.reservations).filter(function (r) { return r.bienId === bienId && r.id !== sauf && (r.statut === 'option' || r.statut === 'confirmee' || r.statut === 'en_cours'); });
  }
  function conflitSejour(db, bienId, debut, fin, sauf) {
    var c = sejoursActifs(db, bienId, sauf).filter(function (r) { return nuitsCommunes(debut, fin, r.debut, r.fin) > 0; })[0];
    if (c) return 'Déjà réservé du ' + c.debut + ' au ' + c.fin + ' (' + (c.clientNom || 'client') + ').';
    var b = db.biens[bienId], ind = (b && b.indispos || []).filter(function (x) { return nuitsCommunes(debut, fin, x.debut, x.fin) > 0; })[0];
    if (ind) return 'Bien bloqué du ' + ind.debut + ' au ' + ind.fin + ' (' + (ind.motif || 'indisponible') + ').';
    return '';
  }

  /* Index des paiements par facture, recalculé seulement quand la base change (version). */
  var _index = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function paiementsDe(db, factureId) {
    var cle = db.paiements, v = db.meta ? db.meta.version : 0, n = Object.keys(cle).length, c = _index && _index.get(cle);
    if (!c || c.v !== v || c.n !== n) {
      var i = {}; valeurs(cle).forEach(function (p) { (i[p.factureId] = i[p.factureId] || []).push(p); });
      c = { v: v, n: n, i: i }; if (_index) _index.set(cle, c);
    }
    return c.i[factureId] || [];
  }
  function paiementsConfirmes(db, factureId, jusqua) {
    return paiementsDe(db, factureId).filter(function (p) { return p.statut === 'confirme' && (!jusqua || p.date <= jusqua); });
  }
  function totalFacture(f) { return (f.montant || 0) + (f.taxe || 0); }
  function soldeFacture(db, f, jusqua) { return f.statut === 'annulee' ? 0 : totalFacture(f) - somme(paiementsConfirmes(db, f.id, jusqua), function (p) { return p.montant; }); }
  function attendusFacture(db, f) { return somme(paiementsDe(db, f.id).filter(function (p) { return p.statut === 'en_attente'; }), function (p) { return p.montant; }); }
  function etatFacture(db, f, aujourdhui) {
    if (f.statut === 'annulee') return 'annulee';
    var s = soldeFacture(db, f);
    if (s <= 0) return 'payee';
    if (f.echeance && f.echeance < aujourdhui) return 'en_retard';
    return s < totalFacture(f) ? 'partielle' : 'a_echoir';
  }
  var ETAT_FACTURE = { payee: 'Réglée', partielle: 'Réglée en partie', a_echoir: 'À échoir', en_retard: 'En retard', annulee: 'Annulée' };

  function statutBien(db, b, aujourdhui) {
    if (b.etat === 'maintenance') return 'maintenance';
    if (b.etat === 'indisponible') return 'indisponible';
    if ((b.indispos || []).some(function (x) { return x.debut <= aujourdhui && aujourdhui < x.fin; })) return 'indisponible';
    if (b.mode !== 'location_meublee') return b.locataire ? 'louee' : 'disponible';
    var sej = valeurs(db.reservations).filter(function (r) { return r.bienId === b.id && r.statut !== 'annulee' && r.statut !== 'option'; });
    if (sej.some(function (r) { return r.statut === 'en_cours' || (r.statut === 'confirmee' && r.debut < aujourdhui && aujourdhui < r.fin); })) return 'occupee';
    var menage = valeurs(db.taches).some(function (t) { return t.bienId === b.id && t.type === 'menage' && (t.statut === 'a_faire' || t.statut === 'en_cours') && t.date <= decaler(aujourdhui, 1); });
    if (menage) return 'preparation';
    if (sej.some(function (r) { return r.statut === 'confirmee' && r.debut >= aujourdhui && r.debut <= decaler(aujourdhui, 7); })) return 'reservee';
    return 'disponible';
  }

  function avancementProjet(p) {
    var j = p.jalons || []; if (!j.length) return p.avancement || 0;
    var tot = somme(j, function (x) { return x.poids || 1; }), fait = somme(j.filter(function (x) { return x.fait; }), function (x) { return x.poids || 1; });
    return tot ? Math.round(fait / tot * 100) : 0;
  }
  function coutsProjet(db, p) {
    var d = valeurs(db.depenses).filter(function (x) { return x.projetId === p.id && x.statut !== 'annulee'; });
    return { engage: somme(d, function (x) { return x.montant; }), paye: somme(d.filter(function (x) { return x.statut === 'payee'; }), function (x) { return x.montant; }) };
  }
  function revenusProjet(db, p) { return somme(valeurs(db.factures).filter(function (f) { return f.objetType === 'projet' && f.objetId === p.id && f.statut !== 'annulee'; }), function (f) { return f.montant; }); }

  /* ------------------------------------------------------------------ opérations (toutes les écritures passent ici) */
  function exiger(u, module, rec) {
    if (niveau(u, module) < 2) refus('Votre accès ne permet pas cette modification.');
    if (rec && !dansPerimetre(u, rec)) refus('Cet élément est hors de votre périmètre.');
  }
  function trouver(db, col, id) { var r = db[col][id]; if (!r) refus('Élément introuvable.'); return r; }
  function creer(db, col, rec, ctx, u) {
    rec.id = nouvelId(col, ctx); rec.cree = ctx.maintenant; rec.creePar = u.id; rec.maj = ctx.maintenant;
    db[col][rec.id] = rec; ctx.modifs.push([col, rec.id]); return rec;
  }
  function toucher(db, col, rec, ctx) { rec.maj = ctx.maintenant; ctx.modifs.push([col, rec.id]); return rec; }
  function fusion(rec, champs) { Object.keys(champs).forEach(function (k) { rec[k] = champs[k]; }); return rec; }

  function creerFactureSejour(db, r, ctx, u) {
    var b = db.biens[r.bienId], an = r.debut.slice(0, 4), soc = db.societes[b.societeId];
    var f = creer(db, 'factures', {
      numero: prochainNumero(db, 'FA-' + b.societeId, (soc && soc.initiales || 'LE') + '-F', an),
      societeId: b.societeId, branchId: b.branchId, bienId: b.id, tiersId: r.clientId || null, clientNom: r.clientNom,
      libelle: 'Séjour · ' + b.nom + ' · ' + ecart(r.debut, r.fin) + ' nuit(s)', date: ctx.aujourdhui < r.debut ? ctx.aujourdhui : r.debut,
      echeance: r.debut, montant: r.montant, taxe: 0, objetType: 'reservation', objetId: r.id, statut: 'emise'
    }, ctx, u);
    r.factureId = f.id;
    return f;
  }

  var OPS = {
    'groupe.modifier': function (db, u, d) { exiger(u, 'acces'); if (!toutesSocietes(u)) refus('Réservé à la direction du groupe.'); db.groupe.nom = String(d.nom || db.groupe.nom).slice(0, 80); return {}; },

    'societe.creer': function (db, u, d, ctx) { exiger(u, 'acces'); if (!toutesSocietes(u)) refus('Réservé à la direction du groupe.'); var s = creer(db, 'societes', nettoyer(db, 'societes', d), ctx, u); s.societeId = s.id; return s; },
    'societe.modifier': function (db, u, d, ctx) { var s = trouver(db, 'societes', d.id); exiger(u, 'acces', s); fusion(s, nettoyer(db, 'societes', d, true)); return toucher(db, 'societes', s, ctx); },
    'branche.creer': function (db, u, d, ctx) { var c = nettoyer(db, 'branches', d); exiger(u, 'acces', { societeId: c.societeId }); c.actif = true; var b = creer(db, 'branches', c, ctx, u); b.branchId = b.id; return b; },
    'branche.modifier': function (db, u, d, ctx) { var b = trouver(db, 'branches', d.id); exiger(u, 'acces', b); var c = nettoyer(db, 'branches', d, true); delete c.societeId; fusion(b, c); return toucher(db, 'branches', b, ctx); },

    'bien.creer': function (db, u, d, ctx) {
      var c = rattacher(db, nettoyer(db, 'biens', d)); exiger(u, 'biens', c);
      c.etat = c.etat || 'actif'; c.saisons = validerSaisons(d.saisons); c.indispos = []; c.inventaire = []; c.incidents = [];
      return creer(db, 'biens', c, ctx, u);
    },
    'bien.modifier': function (db, u, d, ctx) {
      var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b);
      var c = nettoyer(db, 'biens', d, true); if (c.branchId) { rattacher(db, c); exiger(u, 'biens', c); }
      if (d.saisons !== undefined) c.saisons = validerSaisons(d.saisons);
      fusion(b, c); return toucher(db, 'biens', b, ctx);
    },
    'bien.etat': function (db, u, d, ctx) {
      var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b);
      if (!LISTES.etatBien[d.etat]) refus('État inconnu.'); b.etat = d.etat; return toucher(db, 'biens', b, ctx);
    },
    'bien.bloquer': function (db, u, d, ctx) {
      var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b);
      if (!estDate(d.debut) || !estDate(d.fin) || d.fin <= d.debut) refus('Période de blocage invalide.');
      var c = sejoursActifs(db, b.id).filter(function (r) { return nuitsCommunes(d.debut, d.fin, r.debut, r.fin) > 0; })[0];
      if (c) refus('Un séjour existe sur cette période (' + c.debut + ' → ' + c.fin + ').');
      b.indispos = (b.indispos || []).concat([{ debut: d.debut, fin: d.fin, motif: String(d.motif || 'Indisponible').slice(0, 120) }]);
      return toucher(db, 'biens', b, ctx);
    },
    'bien.debloquer': function (db, u, d, ctx) { var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b); b.indispos = (b.indispos || []).filter(function (x, i) { return i !== +d.index; }); return toucher(db, 'biens', b, ctx); },
    'bien.inventaire': function (db, u, d, ctx) {
      var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b);
      if (!Array.isArray(d.inventaire)) refus('Inventaire invalide.');
      b.inventaire = d.inventaire.slice(0, 200).map(function (x) { return { nom: String(x.nom || '').slice(0, 80), qte: Math.max(0, +x.qte || 0), etat: String(x.etat || 'bon').slice(0, 30) }; }).filter(function (x) { return x.nom; });
      return toucher(db, 'biens', b, ctx);
    },
    'bien.incident': function (db, u, d, ctx) {
      var b = trouver(db, 'biens', d.id);
      if (niveau(u, 'biens') < 2 && !(ROLES[u.role].propre && valeurs(db.taches).some(function (t) { return t.assigneId === u.id && t.bienId === b.id; }))) refus('Votre accès ne permet pas de déclarer un incident ici.');
      if (!d.titre) refus('Décrivez l’incident.');
      b.incidents = (b.incidents || []).concat([{ date: ctx.aujourdhui, titre: String(d.titre).slice(0, 160), par: u.id, resolu: false, priorite: LISTES.priorite[d.priorite] ? d.priorite : 'normale' }]);
      toucher(db, 'biens', b, ctx);
      if (d.tache) creer(db, 'taches', { societeId: b.societeId, branchId: b.branchId, bienId: b.id, titre: 'Maintenance · ' + String(d.titre).slice(0, 120), type: 'maintenance', date: ctx.aujourdhui, priorite: LISTES.priorite[d.priorite] ? d.priorite : 'haute', statut: 'a_faire', assigneId: null, checklist: [], commentaires: [] }, ctx, u);
      return b;
    },
    'bien.incidentResolu': function (db, u, d, ctx) { var b = trouver(db, 'biens', d.id); exiger(u, 'biens', b); var i = (b.incidents || [])[+d.index]; if (!i) refus('Incident introuvable.'); i.resolu = true; i.resoluLe = ctx.aujourdhui; return toucher(db, 'biens', b, ctx); },

    'tiers.creer': function (db, u, d, ctx) { var c = nettoyer(db, 'tiers', d); if (niveau(u, 'tiers') < 2 && niveau(u, 'reservations') < 2 && niveau(u, 'conciergerie') < 2) refus('Votre accès ne permet pas cette modification.'); if (c.societeId && !societeAutorisee(u, c.societeId)) refus('Société hors périmètre.'); c.segment = c.segment || 'standard'; c.historique = []; return creer(db, 'tiers', c, ctx, u); },
    'tiers.modifier': function (db, u, d, ctx) { var t = trouver(db, 'tiers', d.id); exiger(u, 'tiers'); if (t.societeId && !societeAutorisee(u, t.societeId)) refus('Hors périmètre.'); fusion(t, nettoyer(db, 'tiers', d, true)); return toucher(db, 'tiers', t, ctx); },
    'tiers.note': function (db, u, d, ctx) { var t = trouver(db, 'tiers', d.id); exiger(u, 'tiers'); if (!d.texte) refus('Note vide.'); t.historique = (t.historique || []).concat([{ date: ctx.aujourdhui, par: u.id, texte: String(d.texte).slice(0, 1000) }]); return toucher(db, 'tiers', t, ctx); },

    'reservation.creer': function (db, u, d, ctx) {
      var c = nettoyer(db, 'reservations', d), b = db.biens[c.bienId]; rattacher(db, c); exiger(u, 'reservations', c);
      if (b.mode !== 'location_meublee') refus('Ce bien n’est pas une résidence meublée.');
      if (c.fin <= c.debut) refus('La date de départ doit suivre la date d’arrivée.');
      if (!c.clientId && !c.clientNom) refus('Indiquez le client.');
      if (c.clientId) { var t = db.tiers[c.clientId]; c.clientNom = c.clientNom || t.nom; c.telephone = c.telephone || t.telephone || null; }
      var conflit = conflitSejour(db, c.bienId, c.debut, c.fin); if (conflit) refus(conflit);
      var calc = tarifSejour(b, c.debut, c.fin);
      if (!c.montant) c.montant = calc.total;
      if (!c.tarifNuit) c.tarifNuit = calc.moyenne;
      c.nuits = calc.nuits; c.source = c.source || 'direct'; c.statut = d.option ? 'option' : 'confirmee';
      c.cautionStatut = c.caution ? 'a_recevoir' : 'aucune';
      // Fiche client créée dans la même opération : rien n'est écrit si la réservation est refusée.
      if (!c.clientId && d.creerFiche) { var t = creer(db, 'tiers', { societeId: b.societeId, type: 'client', nom: c.clientNom, telephone: c.telephone || null, segment: 'standard', historique: [] }, ctx, u); c.clientId = t.id; }
      var r = creer(db, 'reservations', c, ctx, u);
      if (r.statut === 'confirmee' && c.montant > 0) creerFactureSejour(db, r, ctx, u);
      return r;
    },
    'reservation.modifier': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (r.statut === 'terminee' || r.statut === 'annulee') refus('Ce séjour est clos.');
      var c = nettoyer(db, 'reservations', d, true); delete c.bienId;
      var debut = c.debut || r.debut, fin = c.fin || r.fin;
      if (fin <= debut) refus('La date de départ doit suivre la date d’arrivée.');
      var conflit = conflitSejour(db, r.bienId, debut, fin, r.id); if (conflit) refus(conflit);
      fusion(r, c); r.nuits = ecart(r.debut, r.fin);
      if ((d.debut || d.fin) && d.montant === undefined) r.montant = tarifSejour(db.biens[r.bienId], r.debut, r.fin).total;
      var f = r.factureId && db.factures[r.factureId];
      if (f && f.montant !== r.montant) {
        if (somme(paiementsConfirmes(db, f.id), function (p) { return p.montant; }) > r.montant) refus('Le nouveau montant est inférieur aux sommes déjà reçues.');
        f.montant = r.montant; f.echeance = r.debut; f.libelle = 'Séjour · ' + db.biens[r.bienId].nom + ' · ' + r.nuits + ' nuit(s)'; toucher(db, 'factures', f, ctx);
      }
      return toucher(db, 'reservations', r, ctx);
    },
    'reservation.confirmer': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (r.statut !== 'option') refus('Seule une option peut être confirmée.');
      r.statut = 'confirmee'; if (!r.factureId && r.montant > 0) creerFactureSejour(db, r, ctx, u);
      return toucher(db, 'reservations', r, ctx);
    },
    'reservation.arrivee': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (r.statut !== 'confirmee') refus('Ce séjour ne peut pas commencer (statut : ' + LISTES.statutReservation[r.statut] + ').');
      r.statut = 'en_cours'; r.arriveeLe = ctx.maintenant; return toucher(db, 'reservations', r, ctx);
    },
    'reservation.depart': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (r.statut !== 'en_cours') refus('Le client n’est pas enregistré comme arrivé.');
      r.statut = 'terminee'; r.departLe = ctx.maintenant;
      if (d.note) r.satisfaction = Math.max(1, Math.min(5, +d.note || 0));
      if (d.commentaire) r.avis = String(d.commentaire).slice(0, 600);
      toucher(db, 'reservations', r, ctx);
      var b = db.biens[r.bienId];
      creer(db, 'taches', { societeId: b.societeId, branchId: b.branchId, bienId: b.id, reservationId: r.id, titre: 'Ménage et préparation · ' + b.nom, type: 'menage', date: ctx.aujourdhui, priorite: 'haute', statut: 'a_faire', assigneId: d.assigneId && db.utilisateurs[d.assigneId] ? d.assigneId : null,
        checklist: CHECKLIST_MENAGE.map(function (t) { return { t: t, ok: false }; }), commentaires: [] }, ctx, u);
      if (r.clientId && db.tiers[r.clientId]) { var t = db.tiers[r.clientId]; t.historique = (t.historique || []).concat([{ date: ctx.aujourdhui, par: u.id, texte: 'Séjour terminé · ' + b.nom + ' (' + r.nuits + ' nuits)' + (r.satisfaction ? ' · satisfaction ' + r.satisfaction + '/5' : '') }]); toucher(db, 'tiers', t, ctx); }
      return r;
    },
    'reservation.annuler': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (r.statut === 'terminee' || r.statut === 'en_cours' || r.statut === 'annulee') refus('Ce séjour ne peut plus être annulé.');
      if (!d.motif) refus('Indiquez le motif de l’annulation.');
      r.statut = 'annulee'; r.motifAnnulation = String(d.motif).slice(0, 300); toucher(db, 'reservations', r, ctx);
      var f = r.factureId && db.factures[r.factureId];
      if (f && f.statut !== 'annulee') {
        var recu = somme(paiementsConfirmes(db, f.id), function (p) { return p.montant; });
        if (recu > 0) { f.montant = Math.max(0, recu - (f.taxe || 0)); f.libelle += ' · annulé, montant conservé'; }
        else { f.statut = 'annulee'; f.motifAnnulation = 'Séjour annulé'; }
        toucher(db, 'factures', f, ctx);
      }
      return r;
    },
    'reservation.caution': function (db, u, d, ctx) {
      var r = trouver(db, 'reservations', d.id); exiger(u, 'reservations', r);
      if (!LISTES.caution[d.statut] || d.statut === 'aucune') refus('Statut de caution inconnu.');
      r.cautionStatut = d.statut; if (d.retenue) r.cautionRetenue = Math.max(0, Math.round(+d.retenue));
      return toucher(db, 'reservations', r, ctx);
    },

    'facture.creer': function (db, u, d, ctx) {
      var c = rattacher(db, nettoyer(db, 'factures', d), true); if (!c.societeId) refus('Choisissez la société qui facture.'); exiger(u, 'finance', c);
      if (c.interneSocieteId === c.societeId) refus('Une société ne peut pas se facturer elle-même.');
      var soc = db.societes[c.societeId];
      c.numero = prochainNumero(db, 'FA-' + c.societeId, (soc.initiales || 'LE') + '-F', c.date.slice(0, 4));
      c.echeance = c.echeance || c.date; c.statut = 'emise'; c.objetType = c.objetType || 'autre';
      // Loyer d'un bien géré pour un propriétaire : encaissé pour son compte, donc hors chiffre d'affaires du groupe.
      if (c.objetType === 'loyer' && c.bienId && db.biens[c.bienId].mode === 'gestion_locative') c.compteDeTiers = true;
      var f = creer(db, 'factures', c, ctx, u);
      if (c.objetType === 'prestation' && db.prestations[c.objetId]) { db.prestations[c.objetId].factureId = f.id; toucher(db, 'prestations', db.prestations[c.objetId], ctx); }
      return f;
    },
    'facture.annuler': function (db, u, d, ctx) {
      var f = trouver(db, 'factures', d.id); exiger(u, 'finance', f);
      if (f.statut === 'annulee') refus('Facture déjà annulée.');
      if (paiementsConfirmes(db, f.id).length) refus('Des paiements confirmés existent : annulez-les d’abord, ou établissez un avoir.');
      if (!d.motif) refus('Indiquez le motif de l’annulation.');
      f.statut = 'annulee'; f.motifAnnulation = String(d.motif).slice(0, 300); return toucher(db, 'factures', f, ctx);
    },
    'paiement.creer': function (db, u, d, ctx) {
      var c = nettoyer(db, 'paiements', d), f = db.factures[c.factureId]; exiger(u, 'finance', f);
      if (f.statut === 'annulee') refus('Facture annulée.');
      if (c.montant <= 0) refus('Montant à zéro.');
      var reste = soldeFacture(db, f) - attendusFacture(db, f);
      if (c.montant > reste) refus('Montant supérieur au reste à encaisser (' + fcfa(reste) + ').');
      if (c.compteId && db.comptes[c.compteId].societeId !== f.societeId) refus('Ce compte appartient à une autre société.');
      c.societeId = f.societeId; c.branchId = f.branchId; c.bienId = f.bienId || null;
      // Un paiement n'est « reçu » qu'une fois confirmé (relevé, reçu Mobile Money, espèces comptées).
      c.statut = d.confirme ? 'confirme' : 'en_attente'; if (d.confirme) { c.confirmeLe = ctx.maintenant; c.confirmePar = u.id; }
      c.numeroRecu = c.statut === 'confirme' ? prochainNumero(db, 'RC-' + f.societeId, (db.societes[f.societeId].initiales || 'LE') + '-R', c.date.slice(0, 4)) : null;
      return creer(db, 'paiements', c, ctx, u);
    },
    'paiement.confirmer': function (db, u, d, ctx) {
      var p = trouver(db, 'paiements', d.id), f = db.factures[p.factureId]; exiger(u, 'finance', f);
      if (p.statut !== 'en_attente') refus('Ce paiement n’est pas en attente.');
      p.statut = 'confirme'; p.confirmeLe = ctx.maintenant; p.confirmePar = u.id; if (d.date && estDate(d.date)) p.date = d.date;
      p.numeroRecu = prochainNumero(db, 'RC-' + f.societeId, (db.societes[f.societeId].initiales || 'LE') + '-R', p.date.slice(0, 4));
      return toucher(db, 'paiements', p, ctx);
    },
    'paiement.annuler': function (db, u, d, ctx) {
      var p = trouver(db, 'paiements', d.id); exiger(u, 'finance', db.factures[p.factureId]);
      if (p.statut === 'annule') refus('Déjà annulé.'); if (!d.motif) refus('Indiquez le motif.');
      p.statut = 'annule'; p.motifAnnulation = String(d.motif).slice(0, 300); return toucher(db, 'paiements', p, ctx);
    },
    'depense.creer': function (db, u, d, ctx) {
      var c = nettoyer(db, 'depenses', d);
      if (c.projetId) { var pj = db.projets[c.projetId]; c.bienId = c.bienId || pj.bienId; c.branchId = c.branchId || pj.branchId; c.societeId = c.societeId || pj.societeId; }
      rattacher(db, c, true); if (!c.societeId) refus('Choisissez la société concernée.'); exiger(u, 'finance', c);
      c.statut = c.statut || 'engagee';
      if (c.statut === 'payee') { c.datePaiement = c.datePaiement || c.date; if (!c.mode) refus('Indiquez le moyen de paiement.'); }
      if (c.compteId && db.comptes[c.compteId].societeId !== c.societeId) refus('Ce compte appartient à une autre société.');
      return creer(db, 'depenses', c, ctx, u);
    },
    'depense.modifier': function (db, u, d, ctx) {
      var x = trouver(db, 'depenses', d.id); exiger(u, 'finance', x); if (x.statut === 'annulee') refus('Dépense annulée.');
      var c = nettoyer(db, 'depenses', d, true); delete c.statut; fusion(x, rattacher(db, c, true)); exiger(u, 'finance', x); return toucher(db, 'depenses', x, ctx);
    },
    'depense.payer': function (db, u, d, ctx) {
      var x = trouver(db, 'depenses', d.id); exiger(u, 'finance', x);
      if (x.statut !== 'engagee') refus('Cette dépense n’est pas en attente de paiement.');
      if (!LISTES.modePaiement[d.mode]) refus('Indiquez le moyen de paiement.');
      if (d.compteId && (!db.comptes[d.compteId] || db.comptes[d.compteId].societeId !== x.societeId)) refus('Compte invalide pour cette société.');
      x.statut = 'payee'; x.mode = d.mode; x.compteId = d.compteId || null; x.datePaiement = estDate(d.date) ? d.date : ctx.aujourdhui;
      return toucher(db, 'depenses', x, ctx);
    },
    'depense.annuler': function (db, u, d, ctx) { var x = trouver(db, 'depenses', d.id); exiger(u, 'finance', x); if (!d.motif) refus('Indiquez le motif.'); x.statut = 'annulee'; x.motifAnnulation = String(d.motif).slice(0, 300); return toucher(db, 'depenses', x, ctx); },
    'compte.creer': function (db, u, d, ctx) { var c = nettoyer(db, 'comptes', d); exiger(u, 'finance', c); c.dateSolde = c.dateSolde || ctx.aujourdhui; c.soldeInitial = c.soldeInitial || 0; return creer(db, 'comptes', c, ctx, u); },
    'compte.modifier': function (db, u, d, ctx) { var x = trouver(db, 'comptes', d.id); exiger(u, 'finance', x); var c = nettoyer(db, 'comptes', d, true); delete c.societeId; fusion(x, c); return toucher(db, 'comptes', x, ctx); },

    'tache.creer': function (db, u, d, ctx) {
      var c = rattacher(db, nettoyer(db, 'taches', d)); exiger(u, 'agenda', c.societeId ? c : null);
      if (ROLES[u.role].propre) refus('Les tâches sont attribuées par un responsable.');
      if (!c.societeId) { var s = Object.keys(db.societes).filter(function (k) { return societeAutorisee(u, k); })[0]; c.societeId = s; }
      if (c.assigneId && !db.utilisateurs[c.assigneId].actif) refus('Cette personne n’a plus d’accès actif.');
      c.statut = 'a_faire'; c.priorite = c.priorite || 'normale'; c.type = c.type || 'autre';
      c.checklist = (c.checklist || []).map(function (t) { return typeof t === 'string' ? { t: t.slice(0, 120), ok: false } : { t: String(t.t || '').slice(0, 120), ok: !!t.ok }; }).filter(function (x) { return x.t; });
      c.commentaires = []; c.photos = [];
      return creer(db, 'taches', c, ctx, u);
    },
    'tache.modifier': function (db, u, d, ctx) {
      var t = trouver(db, 'taches', d.id); exiger(u, 'agenda', t); if (ROLES[u.role].propre) refus('Modification réservée aux responsables.');
      var c = nettoyer(db, 'taches', d, true); if (c.bienId) rattacher(db, c); fusion(t, c); return toucher(db, 'taches', t, ctx);
    },
    'tache.statut': function (db, u, d, ctx) {
      var t = trouver(db, 'taches', d.id), propre = ROLES[u.role].propre;
      if (propre ? t.assigneId !== u.id : (niveau(u, 'agenda') < 2 || !dansPerimetre(u, t))) refus('Cette tâche ne vous est pas attribuée.');
      if (!LISTES.statutTache[d.statut]) refus('Statut inconnu.');
      if (d.statut === 'validee' && propre) refus('La validation revient au responsable.');
      if (d.statut === 'faite' && (t.checklist || []).some(function (x) { return !x.ok; }) && !d.forcer) refus('Des points de contrôle restent à cocher.');
      t.statut = d.statut; if (d.statut === 'faite') { t.faiteLe = ctx.maintenant; t.faitePar = u.id; } if (d.statut === 'validee') { t.valideeLe = ctx.maintenant; t.valideePar = u.id; }
      return toucher(db, 'taches', t, ctx);
    },
    'tache.cocher': function (db, u, d, ctx) {
      var t = trouver(db, 'taches', d.id), propre = ROLES[u.role].propre;
      if (propre ? t.assigneId !== u.id : (niveau(u, 'agenda') < 2 || !dansPerimetre(u, t))) refus('Cette tâche ne vous est pas attribuée.');
      var x = (t.checklist || [])[+d.index]; if (!x) refus('Point de contrôle introuvable.'); x.ok = !!d.ok;
      if (t.statut === 'a_faire') t.statut = 'en_cours';
      return toucher(db, 'taches', t, ctx);
    },
    'tache.commenter': function (db, u, d, ctx) {
      var t = trouver(db, 'taches', d.id), propre = ROLES[u.role].propre;
      if (propre ? t.assigneId !== u.id : (niveau(u, 'agenda') < 1 || !dansPerimetre(u, t))) refus('Cette tâche ne vous est pas attribuée.');
      if (!d.texte && !d.photo) refus('Commentaire vide.');
      t.commentaires = (t.commentaires || []).concat([{ quand: ctx.maintenant, par: u.id, texte: String(d.texte || '').slice(0, 1000), photo: d.photo || null, incident: !!d.incident }]);
      if (d.photo) t.photos = (t.photos || []).concat([d.photo]);
      return toucher(db, 'taches', t, ctx);
    },

    'prestation.creer': function (db, u, d, ctx) {
      var c = rattacher(db, nettoyer(db, 'prestations', d), true); if (!c.societeId) refus('Choisissez la société.'); exiger(u, 'conciergerie', c);
      if (c.clientId && !c.clientNom) c.clientNom = db.tiers[c.clientId].nom;
      c.statut = c.assigneId ? 'planifiee' : 'demandee'; c.priorite = c.priorite || 'normale';
      return creer(db, 'prestations', c, ctx, u);
    },
    'prestation.modifier': function (db, u, d, ctx) { var p = trouver(db, 'prestations', d.id); exiger(u, 'conciergerie', p); var c = nettoyer(db, 'prestations', d, true); fusion(p, rattacher(db, c, true)); return toucher(db, 'prestations', p, ctx); },
    'prestation.statut': function (db, u, d, ctx) {
      var p = trouver(db, 'prestations', d.id); if (!LISTES.statutPrestation[d.statut]) refus('Statut inconnu.');
      if (ROLES[u.role].propre) { if (p.assigneId !== u.id) refus('Cette mission ne vous est pas confiée.'); if (d.statut !== 'en_cours' && d.statut !== 'realisee') refus('Vous pouvez seulement indiquer « En cours » ou « Réalisée ».'); delete d.note; }
      else exiger(u, 'conciergerie', p);
      p.statut = d.statut; if (d.note) p.satisfaction = Math.max(1, Math.min(5, +d.note)); return toucher(db, 'prestations', p, ctx);
    },

    'projet.creer': function (db, u, d, ctx) {
      var c = rattacher(db, nettoyer(db, 'projets', d), true); if (!c.societeId) refus('Choisissez la société.'); exiger(u, 'projets', c);
      c.statut = 'en_cours'; c.jalons = validerJalons(d.jalons); c.factureIds = [];
      if (c.bienId) c.lieu = db.biens[c.bienId].nom + (db.biens[c.bienId].quartier ? ' · ' + db.biens[c.bienId].quartier : '');   // lisible même hors périmètre du bien
      return creer(db, 'projets', c, ctx, u);
    },
    'projet.modifier': function (db, u, d, ctx) {
      var p = trouver(db, 'projets', d.id); exiger(u, 'projets', p); var c = nettoyer(db, 'projets', d, true);
      if (d.jalons !== undefined) c.jalons = validerJalons(d.jalons);
      if (d.statut && LISTES.statutProjet[d.statut]) c.statut = d.statut;
      fusion(p, rattacher(db, c, true)); return toucher(db, 'projets', p, ctx);
    },
    'projet.jalon': function (db, u, d, ctx) {
      var p = trouver(db, 'projets', d.id); exiger(u, 'projets', p); var j = (p.jalons || [])[+d.index]; if (!j) refus('Jalon introuvable.');
      j.fait = !!d.fait; j.faitLe = j.fait ? ctx.aujourdhui : null; if (avancementProjet(p) === 100 && p.statut === 'en_cours' && d.livrer) p.statut = 'livre';
      return toucher(db, 'projets', p, ctx);
    },

    'utilisateur.creer': function (db, u, d, ctx) {
      exiger(u, 'acces'); var c = nettoyer(db, 'utilisateurs', d); c.perimetre = validerPerimetre(db, u, d.perimetre);
      if (c.role === 'direction' && !toutesSocietes(u)) refus('Seule la direction du groupe crée un accès de direction.');
      if (ROLES[c.role].expiration && !c.expire) refus('Un accès prestataire doit avoir une date d’expiration.');
      c.email = c.email.toLowerCase();
      if (valeurs(db.utilisateurs).some(function (x) { return x.email === c.email; })) refus('Cette adresse a déjà un accès.');
      c.actif = true; c.modules = validerModules(d.modules);
      return creer(db, 'utilisateurs', c, ctx, u);
    },
    'utilisateur.modifier': function (db, u, d, ctx) {
      exiger(u, 'acces'); var x = trouver(db, 'utilisateurs', d.id);
      if (x.id === u.id && d.role && d.role !== x.role) refus('Vous ne pouvez pas changer votre propre rôle.');
      var c = nettoyer(db, 'utilisateurs', d, true); delete c.email;
      if (d.perimetre !== undefined) c.perimetre = validerPerimetre(db, u, d.perimetre);
      if (d.modules !== undefined) c.modules = validerModules(d.modules);
      if (d.expire === '') c.expire = null;
      fusion(x, c); if (ROLES[x.role].expiration && !x.expire) refus('Un accès prestataire doit avoir une date d’expiration.');
      return toucher(db, 'utilisateurs', x, ctx);
    },
    'utilisateur.revoquer': function (db, u, d, ctx) {
      exiger(u, 'acces'); var x = trouver(db, 'utilisateurs', d.id); if (x.id === u.id) refus('Vous ne pouvez pas révoquer votre propre accès.');
      x.actif = !!d.reactiver; x.revoqueLe = d.reactiver ? null : ctx.maintenant; return toucher(db, 'utilisateurs', x, ctx);
    }
  };
  var CHECKLIST_MENAGE = ['Linge de lit et serviettes changés', 'Cuisine et vaisselle', 'Salles de bain', 'Sols et poussière', 'Minibar et accueil réassortis', 'Climatisation et éclairage vérifiés', 'Photos de fin de préparation'];

  function validerSaisons(l) {
    if (!l) return [];
    if (!Array.isArray(l)) refus('Saisons invalides.');
    return l.slice(0, 12).map(function (s) {
      if (!/^\d{2}-\d{2}$/.test(s.du) || !/^\d{2}-\d{2}$/.test(s.au)) refus('Dates de saison invalides (MM-JJ).');
      return { nom: String(s.nom || 'Saison').slice(0, 40), du: s.du, au: s.au, prix: Math.max(0, Math.round(+s.prix || 0)) };
    });
  }
  function validerJalons(l) {
    if (!l) return [];
    if (!Array.isArray(l)) refus('Jalons invalides.');
    return l.slice(0, 40).map(function (j) { return { nom: String(j.nom || '').slice(0, 120), date: estDate(j.date) ? j.date : null, poids: Math.max(1, +j.poids || 1), fait: !!j.fait, faitLe: j.faitLe || null }; }).filter(function (j) { return j.nom; });
  }
  function validerPerimetre(db, u, p) {
    p = p || {}; var socs = Array.isArray(p.societes) && p.societes.length ? p.societes : ['*'];
    if (socs.indexOf('*') >= 0) { if (!toutesSocietes(u)) refus('Vous ne pouvez pas accorder tout le groupe.'); socs = ['*']; }
    else socs.forEach(function (s) { if (!db.societes[s]) refus('Société inconnue.'); if (!societeAutorisee(u, s)) refus('Société hors de votre périmètre.'); });
    var br = Array.isArray(p.branches) ? p.branches : [];
    br.forEach(function (b) { if (!db.branches[b]) refus('Branche inconnue.'); if (socs[0] !== '*' && socs.indexOf(db.branches[b].societeId) < 0) refus('Branche hors des sociétés choisies.'); });
    return { societes: socs, branches: br };
  }
  function validerModules(m) {
    if (!m) return null; var o = {};
    MODULES.forEach(function (k) { if (m[k] !== undefined && m[k] !== '' && m[k] !== null) o[k] = Math.max(0, Math.min(2, +m[k])); });
    return Object.keys(o).length ? o : null;
  }

  var LIBELLES_OPS = {
    'groupe.modifier': 'Groupe renommé', 'societe.creer': 'Société créée', 'societe.modifier': 'Société modifiée', 'branche.creer': 'Branche créée', 'branche.modifier': 'Branche modifiée',
    'bien.creer': 'Bien créé', 'bien.modifier': 'Bien modifié', 'bien.etat': 'État du bien changé', 'bien.bloquer': 'Période bloquée', 'bien.debloquer': 'Blocage retiré', 'bien.inventaire': 'Inventaire mis à jour',
    'bien.incident': 'Incident déclaré', 'bien.incidentResolu': 'Incident résolu', 'tiers.creer': 'Contact créé', 'tiers.modifier': 'Contact modifié', 'tiers.note': 'Note ajoutée',
    'reservation.creer': 'Réservation enregistrée', 'reservation.modifier': 'Réservation modifiée', 'reservation.confirmer': 'Option confirmée', 'reservation.arrivee': 'Arrivée enregistrée',
    'reservation.depart': 'Départ enregistré', 'reservation.annuler': 'Réservation annulée', 'reservation.caution': 'Caution mise à jour',
    'facture.creer': 'Facture émise', 'facture.annuler': 'Facture annulée', 'paiement.creer': 'Paiement enregistré', 'paiement.confirmer': 'Paiement confirmé', 'paiement.annuler': 'Paiement annulé',
    'depense.creer': 'Dépense enregistrée', 'depense.modifier': 'Dépense modifiée', 'depense.payer': 'Dépense payée', 'depense.annuler': 'Dépense annulée', 'compte.creer': 'Compte créé', 'compte.modifier': 'Compte modifié',
    'tache.creer': 'Tâche créée', 'tache.modifier': 'Tâche modifiée', 'tache.statut': 'Statut de tâche changé', 'tache.cocher': 'Point de contrôle', 'tache.commenter': 'Commentaire de tâche',
    'prestation.creer': 'Prestation créée', 'prestation.modifier': 'Prestation modifiée', 'prestation.statut': 'Statut de prestation changé',
    'projet.creer': 'Projet créé', 'projet.modifier': 'Projet modifié', 'projet.jalon': 'Jalon mis à jour',
    'utilisateur.creer': 'Accès créé', 'utilisateur.modifier': 'Accès modifié', 'utilisateur.revoquer': 'Accès révoqué ou rétabli'
  };

  /* Applique une opération. Rien n'est modifié si une règle refuse (travail sur une copie). */
  function appliquer(db, u, op, maintenant, options) {
    options = options || {};
    if (!u || !u.actif) refus('Accès désactivé.');
    var ctx = { maintenant: maintenant || new Date().toISOString(), modifs: [], compteur: 0 };
    ctx.aujourdhui = ctx.maintenant.slice(0, 10); ctx.horodatage = Date.parse(ctx.maintenant) || Date.now();
    if (expire(u, ctx.aujourdhui)) refus('Votre accès a expiré.');
    var f = OPS[op && op.type]; if (!f) refus('Opération inconnue.');
    var travail = options.sansCopie ? db : copie(db);   // sansCopie : chargement en lot (données de démonstration)
    var res = f(travail, u, op.donnees || {}, ctx) || {};
    travail.meta.version = (travail.meta.version || 0) + 1;
    var cible = res.id ? res : null, j = {
      quand: ctx.maintenant, par: u.id, parNom: u.nom, action: op.type, libelle: LIBELLES_OPS[op.type] || op.type,
      objet: cible ? (cible.numero || cible.nom || cible.titre || cible.libelle || cible.clientNom || cible.id) : '', cible: cible ? cible.id : null,
      societeId: cible ? (cible.societeId || null) : null
    };
    if (!options.sansJournal) creer(travail, 'journal', j, ctx, u);
    COLLECTIONS.forEach(function (c) { db[c] = travail[c]; }); db.meta = travail.meta; db.groupe = travail.groupe;
    var vus = {}, modifs = ctx.modifs.filter(function (m) { var k = m.join('|'); if (vus[k]) return false; vus[k] = 1; return true; });
    return { ok: true, id: res.id || null, modifs: modifs, version: db.meta.version };
  }

  /* ------------------------------------------------------------------ indicateurs */
  function periode(cle, aujourdhui, debut, fin) {
    var a = aujourdhui, an = a.slice(0, 4), m = +a.slice(5, 7);
    if (cle === 'jour') return { cle: cle, debut: a, fin: a, nom: 'Aujourd’hui' };
    if (cle === '7j') return { cle: cle, debut: decaler(a, -6), fin: a, nom: '7 derniers jours' };
    if (cle === '30j') return { cle: cle, debut: decaler(a, -29), fin: a, nom: '30 derniers jours' };
    if (cle === 'mois') return { cle: cle, debut: a.slice(0, 8) + '01', fin: decaler(decaler(a.slice(0, 8) + '01', 32).slice(0, 8) + '01', -1), nom: 'Mois en cours' };
    if (cle === 'trimestre') { var q = Math.floor((m - 1) / 3) * 3 + 1, d = an + '-' + p2(q) + '-01'; return { cle: cle, debut: d, fin: decaler((q + 3 > 12 ? (+an + 1) + '-01' : an + '-' + p2(q + 3)) + '-01', -1), nom: 'Trimestre ' + ((q + 2) / 3) + ' · ' + an }; }
    if (cle === 'annee') return { cle: cle, debut: an + '-01-01', fin: an + '-12-31', nom: 'Année ' + an };
    if (cle === 'perso' && estDate(debut) && estDate(fin) && fin >= debut) return { cle: cle, debut: debut, fin: fin, nom: 'Du ' + debut + ' au ' + fin };
    return periode('30j', aujourdhui);
  }

  /* filtre = { societeId, branchId, bienId, debut, fin, aujourdhui } — db est déjà la vue autorisée. */
  function indicateurs(db, filtre) {
    var a = filtre.aujourdhui || jour(), deb = filtre.debut, fin = filtre.fin;
    var socsVisibles = Object.keys(db.societes);
    var dans = function (r) {
      if (!r) return false;
      if (filtre.societeId && r.societeId !== filtre.societeId) return false;
      if (filtre.branchId && r.branchId !== filtre.branchId) return false;
      if (filtre.bienId && r.bienId !== filtre.bienId && r.id !== filtre.bienId) return false;
      return true;
    };
    // Flux internes au groupe : neutralisés en vue consolidée si les deux sociétés sont dans la vue.
    var interne = function (r) { return !filtre.societeId && r.interneSocieteId && socsVisibles.indexOf(r.interneSocieteId) >= 0; };
    var periodeOk = function (d) { return d >= deb && d <= fin; };

    var toutes = valeurs(db.factures).filter(function (f) { return dans(f) && f.statut !== 'annulee'; });
    var loyers = toutes.filter(function (f) { return f.compteDeTiers; });
    var factures = toutes.filter(function (f) { return !f.compteDeTiers; });
    var facPeriode = factures.filter(function (f) { return periodeOk(f.date) && !interne(f); });
    var caFacture = somme(facPeriode, function (f) { return f.montant; });
    var taxes = somme(facPeriode, function (f) { return f.taxe; });

    var payes = valeurs(db.paiements).filter(function (p) { var f = db.factures[p.factureId]; return f && dans(f) && !interne(f) && !f.compteDeTiers; });
    var encPeriode = payes.filter(function (p) { return p.statut === 'confirme' && periodeOk(p.date); });
    var caEncaisse = somme(encPeriode, function (p) { return p.montant; });
    var enAttente = payes.filter(function (p) { return p.statut === 'en_attente'; });

    var depenses = valeurs(db.depenses).filter(function (x) { return dans(x) && x.statut !== 'annulee' && !interne(x); });
    var depPeriode = depenses.filter(function (x) { return periodeOk(x.date); });
    var charges = somme(depPeriode, function (x) { return x.montant; });
    var engagees = depenses.filter(function (x) { return x.statut === 'engagee'; });


    var biens = valeurs(db.biens).filter(dans);
    var residences = biens.filter(function (b) { return b.mode === 'location_meublee'; });
    var finEx = decaler(fin, 1), nuitsVendables = 0, nuitsOccupees = 0, parBien = {};
    residences.forEach(function (b) {
      var total = ecart(deb, finEx);
      var bloquees = somme(b.indispos || [], function (x) { return nuitsCommunes(deb, finEx, x.debut, x.fin); });
      var occ = somme(valeurs(db.reservations).filter(function (r) { return r.bienId === b.id && (r.statut === 'confirmee' || r.statut === 'en_cours' || r.statut === 'terminee'); }), function (r) { return nuitsCommunes(deb, finEx, r.debut, r.fin); });
      var vend = Math.max(0, total - bloquees); nuitsVendables += vend; nuitsOccupees += Math.min(occ, vend);
      parBien[b.id] = { vendables: vend, occupees: Math.min(occ, vend) };
    });
    var reservations = valeurs(db.reservations).filter(function (r) { return dans(r) && r.statut !== 'annulee'; });
    var arrivees = reservations.filter(function (r) { return r.debut === a && (r.statut === 'confirmee' || r.statut === 'option'); });
    var departs = reservations.filter(function (r) { return r.fin === a && r.statut === 'en_cours'; });
    var aVenirSej = reservations.filter(function (r) { return r.debut > a && r.debut <= decaler(a, 30) && r.statut !== 'terminee'; });
    var enCoursSej = reservations.filter(function (r) { return r.statut === 'en_cours'; });

    var prestations = valeurs(db.prestations).filter(dans);
    var prestActives = prestations.filter(function (p) { return p.statut === 'demandee' || p.statut === 'planifiee' || p.statut === 'en_cours'; });
    var projets = valeurs(db.projets).filter(dans);
    var projActifs = projets.filter(function (p) { return p.statut === 'en_cours' || p.statut === 'etude'; });
    var taches = valeurs(db.taches).filter(function (t) { return dans(t) && t.statut !== 'annulee' && t.statut !== 'validee'; });

    if (filtre.leger) return { caFacture: { valeur: caFacture }, caEncaisse: { valeur: caEncaisse }, charges: { valeur: charges }, occupation: { valeur: nuitsVendables ? nuitsOccupees / nuitsVendables : null } };
    var ouvertes = factures.filter(function (f) { return !interne(f) && soldeFacture(db, f) > 0; });
    var retards = ouvertes.filter(function (f) { return f.echeance && f.echeance < a; });
    var aVenir = ouvertes.filter(function (f) { return !f.echeance || f.echeance >= a; });
    // Trésorerie : soldes de départ + encaissements confirmés affectés − dépenses payées affectées.
    var comptes = valeurs(db.comptes).filter(function (c) { return (!filtre.societeId || c.societeId === filtre.societeId) && !filtre.branchId && !filtre.bienId; });
    var tresorerie = null, detailTreso = [];
    if (comptes.length) {
      tresorerie = 0;
      comptes.forEach(function (c) {
        var entrees = somme(valeurs(db.paiements).filter(function (p) { return p.compteId === c.id && p.statut === 'confirme' && p.date >= c.dateSolde && p.date <= a; }), function (p) { return p.montant; });
        var sorties = somme(valeurs(db.depenses).filter(function (x) { return x.compteId === c.id && x.statut === 'payee' && (x.datePaiement || x.date) >= c.dateSolde && (x.datePaiement || x.date) <= a; }), function (x) { return x.montant; });
        var s = (c.soldeInitial || 0) + entrees - sorties; tresorerie += s;
        detailTreso.push({ id: c.id, nom: c.nom, societeId: c.societeId, type: c.type, soldeInitial: c.soldeInitial || 0, entrees: entrees, sorties: sorties, solde: s });
      });
    }

    // Rentabilité par bien sur la période : revenus facturés affectés − charges affectées.
    var rentabilite = biens.map(function (b) {
      var rev = somme(facPeriode.filter(function (f) { return f.bienId === b.id; }), function (f) { return f.montant; });
      var ch = somme(depPeriode.filter(function (x) { return x.bienId === b.id; }), function (x) { return x.montant; });
      var o = parBien[b.id];
      return { id: b.id, nom: b.nom, revenus: rev, charges: ch, resultat: rev - ch, occupation: o && o.vendables ? o.occupees / o.vendables : null };
    }).sort(function (x, y) { return y.resultat - x.resultat; });

    // Par branche (activité).
    var parBranche = valeurs(db.branches).filter(function (b) { return !filtre.societeId || b.societeId === filtre.societeId; }).filter(function (b) { return !filtre.branchId || b.id === filtre.branchId; }).map(function (br) {
      var ca = somme(facPeriode.filter(function (f) { return f.branchId === br.id; }), function (f) { return f.montant; });
      var enc = somme(encPeriode.filter(function (p) { return p.branchId === br.id || (db.factures[p.factureId] || {}).branchId === br.id; }), function (p) { return p.montant; });
      var ch = somme(depPeriode.filter(function (x) { return x.branchId === br.id; }), function (x) { return x.montant; });
      return { id: br.id, nom: br.nom, type: br.type, societeId: br.societeId, ca: ca, encaisse: enc, charges: ch, resultat: ca - ch };
    });
    var parSociete = socsVisibles.filter(function (s) { return !filtre.societeId || s === filtre.societeId; }).map(function (s) {
      var f = facPeriode.filter(function (x) { return x.societeId === s; }), d = depPeriode.filter(function (x) { return x.societeId === s; });
      var ca = somme(f, function (x) { return x.montant; }), ch = somme(d, function (x) { return x.montant; });
      return { id: s, nom: db.societes[s].nom, ca: ca, charges: ch, resultat: ca - ch, marge: ca ? (ca - ch) / ca : null };
    });

    return {
      periode: { debut: deb, fin: fin },
      caFacture: { valeur: caFacture, taxes: taxes, detail: facPeriode.map(function (f) { return f.id; }), formule: 'Somme des montants hors taxes des factures émises sur la période (factures annulées et flux internes au groupe exclus).' },
      caEncaisse: { valeur: caEncaisse, detail: encPeriode.map(function (p) { return p.id; }), enAttente: somme(enAttente, function (p) { return p.montant; }), enAttenteIds: enAttente.map(function (p) { return p.id; }), formule: 'Somme des paiements confirmés datés de la période et affectés à une facture. Les paiements en attente de confirmation ne sont pas comptés.' },
      charges: { valeur: charges, detail: depPeriode.map(function (x) { return x.id; }), engagees: somme(engagees, function (x) { return x.montant; }), engageesIds: engagees.map(function (x) { return x.id; }), formule: 'Somme des dépenses de la période, engagées ou payées (dépenses annulées et flux internes exclus).' },
      resultat: { valeur: caFacture - charges, formule: 'Chiffre d’affaires facturé − charges de la période. Estimation de gestion, pas un résultat comptable.' },
      creances: { valeur: somme(ouvertes, function (f) { return soldeFacture(db, f); }), detail: ouvertes.map(function (f) { return f.id; }), formule: 'Montants facturés (taxes comprises) moins paiements confirmés, toutes dates.' },
      retards: { valeur: somme(retards, function (f) { return soldeFacture(db, f); }), nombre: retards.length, detail: retards.map(function (f) { return f.id; }), formule: 'Soldes des factures dont l’échéance est dépassée.' },
      attendus: { valeur: somme(aVenir, function (f) { return soldeFacture(db, f); }), detail: aVenir.map(function (f) { return f.id; }), formule: 'Soldes des factures non encore échues.' },
      tresorerie: { valeur: tresorerie, comptes: detailTreso, formule: 'Solde de départ de chaque compte + encaissements confirmés affectés au compte − dépenses payées depuis ce compte.' },
      biens: { valeur: biens.length, actifs: biens.filter(function (b) { return b.etat === 'actif' || !b.etat; }).length, residences: residences.length, detail: biens.map(function (b) { return b.id; }) },
      occupation: { valeur: nuitsVendables ? nuitsOccupees / nuitsVendables : null, occupees: nuitsOccupees, vendables: nuitsVendables, formule: 'Nuitées occupées (séjours confirmés, en cours ou terminés) ÷ nuitées commercialisables (périodes bloquées exclues).' },
      sejours: { arrivees: arrivees.map(function (r) { return r.id; }), departs: departs.map(function (r) { return r.id; }), aVenir: aVenirSej.map(function (r) { return r.id; }), enCours: enCoursSej.map(function (r) { return r.id; }) },
      prestations: { valeur: prestActives.length, detail: prestActives.map(function (p) { return p.id; }), marge: somme(prestations.filter(function (p) { return p.statut === 'realisee' && periodeOk(p.date); }), function (p) { return (p.prix || 0) - (p.cout || 0); }) },
      projets: { valeur: projActifs.length, detail: projActifs.map(function (p) { return p.id; }), depassements: projActifs.filter(function (p) { return p.budget && coutsProjet(db, p).engage > p.budget; }).map(function (p) { return p.id; }) },
      taches: { valeur: taches.length, enRetard: taches.filter(function (t) { return t.date < a && (t.statut === 'a_faire' || t.statut === 'en_cours'); }).map(function (t) { return t.id; }) },
      loyers: { appeles: somme(loyers.filter(function (f) { return periodeOk(f.date); }), function (f) { return totalFacture(f); }),
        impayes: somme(loyers.filter(function (f) { return f.echeance < a && soldeFacture(db, f) > 0; }), function (f) { return soldeFacture(db, f); }),
        impayesIds: loyers.filter(function (f) { return f.echeance < a && soldeFacture(db, f) > 0; }).map(function (f) { return f.id; }),
        formule: 'Loyers appelés pour le compte des propriétaires : suivis à part, hors chiffre d’affaires du groupe (seuls les honoraires de gestion en font partie).' },
      rentabilite: rentabilite, parBranche: parBranche, parSociete: parSociete
    };
  }

  /* Série mensuelle (facturé, encaissé, charges) sur n mois se terminant au mois de `fin`. */
  function serieMensuelle(db, filtre, n) {
    var out = [], fin = filtre.fin || jour(), y = +fin.slice(0, 4), m = +fin.slice(5, 7);
    for (var i = n - 1; i >= 0; i--) {
      var mm = m - i, yy = y; while (mm < 1) { mm += 12; yy--; }
      var d = yy + '-' + p2(mm) + '-01', f = decaler((mm === 12 ? (yy + 1) + '-01' : yy + '-' + p2(mm + 1)) + '-01', -1);
      var k = indicateurs(db, { societeId: filtre.societeId, branchId: filtre.branchId, bienId: filtre.bienId, debut: d, fin: f, aujourdhui: filtre.aujourdhui, leger: true });
      out.push({ mois: d.slice(0, 7), facture: k.caFacture.valeur, encaisse: k.caEncaisse.valeur, charges: k.charges.valeur, occupation: k.occupation.valeur });
    }
    return out;
  }

  /* ------------------------------------------------------------------ alertes (calculées, jamais saisies) */
  function alertes(db, aujourdhui, filtre) {
    var a = aujourdhui, demain = decaler(a, 1), L = [];
    var dans = function (r) { return r && (!filtre || ((!filtre.societeId || r.societeId === filtre.societeId) && (!filtre.branchId || r.branchId === filtre.branchId) && (!filtre.bienId || r.bienId === filtre.bienId))); };
    var nomBien = function (id) { return db.biens[id] ? db.biens[id].nom : 'Bien'; };
    valeurs(db.reservations).filter(dans).forEach(function (r) {
      if ((r.statut === 'confirmee' || r.statut === 'option') && (r.debut === a || r.debut === demain))
        L.push({ niveau: r.debut === a ? 'attention' : 'info', type: 'arrivee', titre: 'Arrivée ' + (r.debut === a ? 'aujourd’hui' : 'demain') + ' · ' + r.clientNom, detail: nomBien(r.bienId) + (r.heureArrivee ? ' · ' + r.heureArrivee : ''), route: 'reservation/' + r.id, date: r.debut });
      if (r.statut === 'en_cours' && (r.fin === a || r.fin === demain))
        L.push({ niveau: 'attention', type: 'depart', titre: 'Départ ' + (r.fin === a ? 'aujourd’hui' : 'demain') + ' · préparer la résidence', detail: nomBien(r.bienId) + ' · ' + r.clientNom, route: 'reservation/' + r.id, date: r.fin });
      if (r.statut === 'confirmee' && r.debut < a) L.push({ niveau: 'attention', type: 'arrivee', titre: 'Arrivée non enregistrée · ' + r.clientNom, detail: nomBien(r.bienId) + ' · prévue le ' + r.debut, route: 'reservation/' + r.id, date: r.debut });
      if (r.statut === 'en_cours' && r.fin < a) L.push({ niveau: 'urgent', type: 'depart', titre: 'Départ dépassé · ' + r.clientNom, detail: nomBien(r.bienId) + ' · prévu le ' + r.fin, route: 'reservation/' + r.id, date: r.fin });
      if (r.cautionStatut === 'a_recevoir' && r.debut <= demain && r.statut !== 'terminee') L.push({ niveau: 'info', type: 'caution', titre: 'Caution à recevoir · ' + r.clientNom, detail: nomBien(r.bienId) + ' · ' + fcfa(r.caution), route: 'reservation/' + r.id, date: r.debut });
    });
    valeurs(db.taches).filter(dans).forEach(function (t) {
      if ((t.statut === 'a_faire' || t.statut === 'en_cours') && t.type === 'menage' && t.date <= a) L.push({ niveau: 'attention', type: 'menage', titre: 'Ménage à faire · ' + nomBien(t.bienId), detail: t.assigneId && db.utilisateurs[t.assigneId] ? 'Confié à ' + db.utilisateurs[t.assigneId].nom : 'Non attribué', route: 'tache/' + t.id, date: t.date });
      else if ((t.statut === 'a_faire' || t.statut === 'en_cours') && t.date < a) L.push({ niveau: t.priorite === 'urgente' ? 'urgent' : 'attention', type: 'tache', titre: 'Tâche en retard · ' + t.titre, detail: 'Prévue le ' + t.date, route: 'tache/' + t.id, date: t.date });
      if (t.statut === 'faite') L.push({ niveau: 'info', type: 'validation', titre: 'À valider · ' + t.titre, detail: t.bienId ? nomBien(t.bienId) : '', route: 'tache/' + t.id, date: t.date });
    });
    valeurs(db.factures).filter(dans).forEach(function (f) {
      var e = etatFacture(db, f, a);
      if (e === 'en_retard') L.push({ niveau: ecart(f.echeance, a) > 15 ? 'urgent' : 'attention', type: 'impaye', titre: (f.objetType === 'loyer' ? 'Loyer impayé · ' : 'Facture non réglée · ') + (f.clientNom || (db.tiers[f.tiersId] || {}).nom || f.numero), detail: f.numero + ' · ' + fcfa(soldeFacture(db, f)) + ' · échue depuis ' + ecart(f.echeance, a) + ' j', route: 'facture/' + f.id, date: f.echeance });
    });
    valeurs(db.paiements).forEach(function (p) {
      var f = db.factures[p.factureId];
      if (p.statut === 'en_attente' && dans(f)) L.push({ niveau: 'info', type: 'paiement', titre: 'Paiement à confirmer · ' + fcfa(p.montant), detail: (LISTES.modePaiement[p.mode] || '') + (f ? ' · ' + f.numero : ''), route: 'facture/' + p.factureId, date: p.date });
    });
    valeurs(db.depenses).filter(dans).forEach(function (x) {
      if (x.statut === 'engagee' && x.date < decaler(a, -30)) L.push({ niveau: 'info', type: 'depense', titre: 'Dépense engagée non payée · ' + x.libelle, detail: fcfa(x.montant) + ' depuis le ' + x.date, route: 'depense/' + x.id, date: x.date });
    });
    valeurs(db.projets).filter(dans).forEach(function (p) {
      if (p.statut !== 'en_cours') return;
      var c = coutsProjet(db, p);
      if (p.budget && c.engage > p.budget) L.push({ niveau: 'urgent', type: 'budget', titre: 'Dépassement de budget · ' + p.nom, detail: fcfa(c.engage - p.budget) + ' au-delà de ' + fcfa(p.budget), route: 'projet/' + p.id, date: a });
      else if (p.budget && c.engage > p.budget * 0.9) L.push({ niveau: 'attention', type: 'budget', titre: 'Budget presque atteint · ' + p.nom, detail: Math.round(c.engage / p.budget * 100) + ' % engagé', route: 'projet/' + p.id, date: a });
      if (p.finPrevue && p.finPrevue < a) L.push({ niveau: 'urgent', type: 'retard', titre: 'Chantier en retard · ' + p.nom, detail: 'Fin prévue le ' + p.finPrevue + ' · ' + avancementProjet(p) + ' % réalisé', route: 'projet/' + p.id, date: p.finPrevue });
      (p.jalons || []).forEach(function (j) { if (!j.fait && j.date && j.date < a) L.push({ niveau: 'attention', type: 'retard', titre: 'Jalon dépassé · ' + j.nom, detail: p.nom + ' · prévu le ' + j.date, route: 'projet/' + p.id, date: j.date }); });
    });
    valeurs(db.prestations).filter(dans).forEach(function (p) {
      if (p.statut === 'realisee' || p.statut === 'annulee') return;
      if (p.priorite === 'urgente') L.push({ niveau: 'urgent', type: 'vip', titre: 'Prestation VIP urgente · ' + p.libelle, detail: (p.clientNom || '') + ' · ' + p.date + (p.heure ? ' ' + p.heure : ''), route: 'prestation/' + p.id, date: p.date });
      else if (p.date < a) L.push({ niveau: 'attention', type: 'vip', titre: 'Prestation en retard · ' + p.libelle, detail: (p.clientNom || '') + ' · prévue le ' + p.date, route: 'prestation/' + p.id, date: p.date });
      else if (!p.assigneId && p.date <= decaler(a, 2)) L.push({ niveau: 'attention', type: 'vip', titre: 'Prestation sans responsable · ' + p.libelle, detail: (p.clientNom || '') + ' · ' + p.date, route: 'prestation/' + p.id, date: p.date });
    });
    valeurs(db.biens).filter(dans).forEach(function (b) {
      if (b.etat === 'maintenance') L.push({ niveau: 'attention', type: 'maintenance', titre: 'Bien en maintenance · ' + b.nom, detail: (b.incidents || []).filter(function (i) { return !i.resolu; }).length + ' incident(s) ouvert(s)', route: 'bien/' + b.id, date: a });
      (b.incidents || []).forEach(function (i) { if (!i.resolu && i.priorite === 'urgente') L.push({ niveau: 'urgent', type: 'maintenance', titre: 'Incident urgent · ' + b.nom, detail: i.titre, route: 'bien/' + b.id, date: i.date }); });
      if (b.mode === 'gestion_locative' && b.finMandat && b.finMandat <= decaler(a, 60)) L.push({ niveau: 'attention', type: 'echeance', titre: 'Échéance du mandat · ' + b.nom, detail: 'Fin le ' + b.finMandat, route: 'bien/' + b.id, date: b.finMandat });
    });
    var ordre = { urgent: 0, attention: 1, info: 2 };
    return L.sort(function (x, y) { return ordre[x.niveau] - ordre[y.niveau] || (x.date < y.date ? -1 : 1); });
  }

  return {
    VERSION: 1, COLLECTIONS: COLLECTIONS, LISTES: LISTES, ROLES: ROLES, MODULES: MODULES, ETAT_FACTURE: ETAT_FACTURE, SCHEMA: SCHEMA, CHECKLIST_MENAGE: CHECKLIST_MENAGE,
    jour: jour, decaler: decaler, ecart: ecart, nuitsCommunes: nuitsCommunes, estDate: estDate, valeurs: valeurs, somme: somme, copie: copie, fcfa: fcfa,
    baseVide: baseVide, niveau: niveau, dansPerimetre: dansPerimetre, societeAutorisee: societeAutorisee, toutesSocietes: toutesSocietes, expire: expire, vue: vue,
    appliquer: appliquer, tarifSejour: tarifSejour, conflitSejour: conflitSejour, soldeFacture: soldeFacture, totalFacture: totalFacture, etatFacture: etatFacture,
    paiementsConfirmes: paiementsConfirmes, statutBien: statutBien, avancementProjet: avancementProjet, coutsProjet: coutsProjet, revenusProjet: revenusProjet,
    periode: periode, indicateurs: indicateurs, serieMensuelle: serieMensuelle, alertes: alertes, LIBELLES_OPS: LIBELLES_OPS
  };
})();
if (typeof module !== 'undefined') module.exports = LE;
