/* LOFT ELEVEN — écrans. Chaque écran renvoie du HTML calculé à partir de la vue autorisée (S.db). */
'use strict';

var PERIODES = [['jour', 'Aujourd’hui'], ['7j', '7 jours'], ['30j', '30 jours'], ['trimestre', 'Trimestre'], ['annee', 'Année']];
function ongletsPeriode() {
  return '<div class="onglets" role="tablist" aria-label="Période">' + PERIODES.map(function (p) { return '<button data-act="periode" data-v="' + p[0] + '" class="' + (S.filtre.periode === p[0] ? 'actif' : '') + '">' + p[1] + '</button>'; }).join('')
    + '<button data-act="periodePerso" class="' + (S.filtre.periode === 'perso' ? 'actif' : '') + '">' + (S.filtre.periode === 'perso' ? esc(dateCourte(S.filtre.debut) + ' → ' + dateCourte(S.filtre.fin)) : 'Personnalisée') + '</button></div>';
}
function entete(surtitre, titre, sous, actions) {
  return '<div class="entete"><div>' + (surtitre ? '<div class="surtitre">' + esc(surtitre) + '</div>' : '') + '<h1>' + esc(titre) + '</h1>' + (sous ? '<p>' + sous + '</p>' : '') + '</div>' + (actions ? '<div class="entete-actions">' + actions + '</div>' : '') + '</div>';
}
function vide(icone, titre, texte, action) { return '<div class="vide-etat">' + ic(icone) + '<b>' + esc(titre) + '</b>' + (texte ? '<div>' + texte + '</div>' : '') + (action ? '<div style="margin-top:16px">' + action + '</div>' : '') + '</div>'; }
function btAjout(act, texte, module, cle) { return peut(module, 2) ? '<button class="bt principal-bt" data-act="' + act + '"' + (cle ? ' data-id="' + esc(cle) + '"' : '') + '>' + ic('ajout') + '<span>' + esc(texte) + '</span></button>' : ''; }
function kpiCarte(o) {
  return '<div class="carte kpi cliquable' + (o.vedette ? ' vedette' : '') + (o.mobileCache ? ' masque-mobile' : '') + '" data-go="indicateur/' + o.cle + '" role="link" tabindex="0">'
    + '<div class="kpi-lib"><span>' + esc(o.lib) + '</span>' + ic(o.ic || 'chevron') + '</div><div class="kpi-val">' + o.val + '</div>' + (o.spark || '') + '<div class="kpi-pied">' + (o.pied || '') + '</div></div>';
}
function personne(id) { var u = id && S.db.utilisateurs[id]; return u ? u.nom : ''; }
function lienBien(id) { var b = S.db.biens[id]; return b ? esc(b.nom) : ''; }

/* ================================================================== EXECUTIVE OFFICE */
function ecranAccueil() {
  if (propre()) return ecranMissions();
  if (!peut('tableau')) return ecranAgenda();
  var k = kpis(), p = periodeCourante(), serie = LE.serieMensuelle(S.db, { societeId: S.filtre.societeId, branchId: S.filtre.branchId, bienId: S.filtre.bienId, fin: S.auj, aujourdhui: S.auj }, 12);
  var fin = peut('finance'), al = alertesCourantes();
  var h = '<div class="bienvenue"><div><div class="surtitre">Executive Office · ' + esc(nomPerimetre()) + '</div><h1>' + bonjour() + ', ' + esc(prenom(S.moi.nom)) + '</h1><div class="date">' + esc(dateLongue(S.auj).replace(/^./, function (c) { return c.toUpperCase(); })) + ' · ' + esc(p.nom) + '</div></div>' + ongletsPeriode() + '</div>';

  var cartes = [];
  if (fin) {
    cartes.push({ cle: 'caFacture', lib: 'Chiffre d’affaires facturé', val: montantHTML(k.caFacture.valeur), vedette: true, ic: 'facture', spark: spark(serie.map(function (x) { return x.facture; })), pied: '<span>12 mois</span>', mobileCache: true });
    cartes.push({ cle: 'caEncaisse', lib: 'Encaissé', val: montantHTML(k.caEncaisse.valeur), ic: 'banque', pied: k.caEncaisse.enAttente ? '<span>' + esc(fc(k.caEncaisse.enAttente)) + ' en attente de confirmation</span>' : '<span>Paiements confirmés</span>' });
    cartes.push({ cle: 'resultat', lib: 'Résultat estimé', val: montantHTML(k.resultat.valeur), ic: 'rapports', pied: '<span>Charges ' + esc(fc(k.charges.valeur)) + '</span>' });
    cartes.push({ cle: 'tresorerie', lib: 'Trésorerie disponible', val: k.tresorerie.valeur === null ? '<span class="texte-3" style="font-size:18px">Comptes non renseignés</span>' : montantHTML(k.tresorerie.valeur), ic: 'finance', pied: '<span>' + k.tresorerie.comptes.length + ' compte(s) · à ce jour</span>' });
    cartes.push({ cle: 'creances', lib: 'Encaissements attendus', val: montantHTML(k.creances.valeur), ic: 'horloge', pied: k.retards.nombre ? '<span class="badge urg">' + esc(fc(k.retards.valeur)) + ' en retard</span>' : '<span class="badge ok">Aucun retard</span>', mobileCache: true });
  }
  cartes.push({ cle: 'occupation', lib: 'Taux d’occupation', val: k.occupation.valeur === null ? '—' : pct(k.occupation.valeur, 1), ic: 'lit', pied: '<span>' + k.occupation.occupees + ' / ' + k.occupation.vendables + ' nuitées</span>' });
  cartes.push({ cle: 'biens', lib: 'Biens gérés', val: k.biens.valeur + '<small>' + k.biens.residences + ' résidences</small>', ic: 'biens', pied: '<span>' + k.biens.actifs + ' en service</span>', mobileCache: true });
  cartes.push({ cle: 'sejours', lib: 'Séjours', val: k.sejours.enCours.length + '<small>en cours</small>', ic: 'agenda', pied: '<span>' + k.sejours.arrivees.length + ' arrivée(s) · ' + k.sejours.departs.length + ' départ(s) aujourd’hui · ' + k.sejours.aVenir.length + ' à venir</span>', mobileCache: true });
  if (!fin) cartes.push({ cle: 'prestations', lib: 'Prestations VIP', val: k.prestations.valeur + '<small>en cours</small>', ic: 'conciergerie', pied: '' });
  h += '<div class="grille g4 kpis">' + cartes.map(kpiCarte).join('') + '</div>';
  h += '<div style="text-align:center;margin-top:12px" class="seulement-mobile"><button class="bt discret petit" data-act="tousKpi">Tous les indicateurs</button></div>';

  // Priorités et journée
  var urg = al.filter(function (a) { return a.niveau !== 'info'; }).slice(0, 7), autres = al.length - urg.length;
  h += '<div class="grille g-12 section" style="margin-top:22px">';
  h += '<div class="carte s7"><div class="carte-titre"><h2>Priorités du jour</h2><button class="lien" data-act="alertes">Tout voir (' + al.length + ')</button></div>'
    + (urg.length ? '<div class="liste">' + urg.map(ligneAlerte).join('') + '</div>' : vide('ok', 'Rien d’urgent', 'Aucune alerte prioritaire sur ce périmètre.')) + (autres > 0 && urg.length ? '<div class="kpi-pied" style="margin-top:10px">+ ' + autres + ' information(s) dans le centre d’alertes</div>' : '') + '</div>';
  h += '<div class="s5" style="display:flex;flex-direction:column;gap:16px"><div class="carte"><div class="carte-titre"><h2>Accès rapides</h2></div>' + raccourcis() + '</div>' + carteJournee() + '</div>';
  h += '</div>';

  if (fin) {
    h += '<div class="grille g-12" style="margin-top:16px">';
    h += '<div class="carte s8"><div class="carte-titre"><h2>Évolution sur 12 mois</h2><div class="leg"><span><i style="background:var(--accent)"></i>Facturé</span><span><i style="background:var(--ok)"></i>Encaissé</span><span><i style="background:var(--att)"></i>Charges</span></div></div>'
      + courbe([{ nom: 'Facturé', valeurs: serie.map(function (x) { return x.facture; }), couleur: 'var(--accent)' }, { nom: 'Encaissé', valeurs: serie.map(function (x) { return x.encaisse; }), couleur: 'var(--ok)' }, { nom: 'Charges', valeurs: serie.map(function (x) { return x.charges; }), couleur: 'var(--att)', pointille: true }], serie.map(function (x) { return MOIS_C[+x.mois.slice(5) - 1]; }), { titre: 'Facturé, encaissé et charges par mois' }) + '</div>';
    h += '<div class="carte s4 cliquable" data-go="indicateur/occupation"><div class="carte-titre"><h2>Occupation</h2><span class="texte-3" style="font-size:12px">' + esc(p.nom) + '</span></div><div style="display:flex;gap:18px;align-items:center">' + anneau(k.occupation.valeur, 'Taux d’occupation') + '<div style="flex:1;min-width:0">'
      + barresH(k.rentabilite.filter(function (b) { return b.occupation !== null; }).sort(function (a, b) { return b.occupation - a.occupation; }).slice(0, 4).map(function (b) { return { nom: b.nom, valeur: b.occupation }; }), { format: function (x) { return pct(x); } }) + '</div></div></div>';
    h += '</div>';
    h += '<div class="grille g-12" style="margin-top:16px">';
    h += '<div class="carte s6"><div class="carte-titre"><h2>Performance par activité</h2><span class="texte-3" style="font-size:12px">Chiffre d’affaires · ' + esc(p.nom) + '</span></div>' + barresH(k.parBranche.filter(function (b) { return b.ca || b.charges; }).sort(function (a, b) { return b.ca - a.ca; }).map(function (b) { return { nom: b.nom, valeur: b.ca }; })) + '</div>';
    h += '<div class="carte s6"><div class="carte-titre"><h2>Classement des biens</h2><span class="texte-3" style="font-size:12px">Résultat · revenus − charges</span></div>' + barresH(k.rentabilite.filter(function (b) { return b.revenus || b.charges; }).slice(0, 6).map(function (b) { return { nom: b.nom, valeur: b.resultat, go: 'bien/' + b.id }; })) + '</div>';
    h += '</div>';
  }
  h += '<div class="grille g-12" style="margin-top:16px">';
  if (peut('conciergerie')) h += '<div class="carte s4"><div class="carte-titre"><h2>Prestations VIP en cours</h2><a href="#/conciergerie">Agenda</a></div>' + listePrestations(k.prestations.detail.map(function (id) { return S.db.prestations[id]; }).slice(0, 5)) + '</div>';
  if (peut('projets')) h += '<div class="carte s4"><div class="carte-titre"><h2>Projets et chantiers</h2><a href="#/projets">Tous</a></div>' + k.projets.detail.slice(0, 4).map(function (id) { return ligneProjet(S.db.projets[id]); }).join('') + (k.projets.detail.length ? '' : vide('projets', 'Aucun chantier actif')) + '</div>';
  if (fin) {
    var parCat = {}; k.charges.detail.forEach(function (id) { var x = S.db.depenses[id]; parCat[x.categorie] = (parCat[x.categorie] || 0) + x.montant; });
    h += '<div class="carte s4 cliquable" data-go="indicateur/charges"><div class="carte-titre"><h2>Dépenses et engagements</h2></div><div class="kpi-val" style="font-size:24px">' + montantHTML(k.charges.valeur) + '</div><div class="kpi-pied" style="margin:6px 0 16px">' + esc(fc(k.charges.engagees)) + ' engagés non payés</div>'
      + barresH(Object.keys(parCat).sort(function (a, b) { return parCat[b] - parCat[a]; }).slice(0, 4).map(function (c) { return { nom: L.categorieDepense[c], valeur: parCat[c], couleur: 'var(--att)' }; })) + '</div>';
  }
  h += '</div>';
  return h;
}
function raccourcis() {
  var r = [];
  if (peut('reservations', 2)) r.push(['nouvelleReservation', 'agenda', 'Réservation']);
  if (peut('finance', 2)) { r.push(['encaissement', 'banque', 'Encaissement']); r.push(['nouvelleDepense', 'depense', 'Dépense']); }
  if (peut('agenda', 2)) r.push(['nouvelleTache', 'tache', 'Tâche']);
  if (peut('conciergerie', 2) && r.length < 4) r.push(['nouvellePrestation', 'conciergerie', 'Prestation']);
  if (peut('biens', 2) && r.length < 4) r.push(['nouveauBien', 'biens', 'Bien']);
  return '<div class="raccourcis">' + r.slice(0, 4).map(function (x) { return '<button class="raccourci" data-act="' + x[0] + '">' + ic(x[1]) + '<span>' + x[2] + '</span></button>'; }).join('') + '</div>';
}
function ligneAlerte(a) {
  var icone = { arrivee: 'arrivee', depart: 'depart', menage: 'menage', impaye: 'facture', paiement: 'banque', budget: 'depense', retard: 'horloge', vip: 'conciergerie', maintenance: 'outil', echeance: 'agenda', caution: 'cle', tache: 'tache', validation: 'tache', depense: 'depense' }[a.type] || 'info';
  var t = a.route.split('/');
  return '<div class="ligne cliquable" data-ouvrir="' + t[0] + ':' + t[1] + '"><span class="pastille-ic ' + (a.niveau === 'urgent' ? 'urg' : a.niveau === 'attention' ? 'att' : 'info') + '">' + ic(icone) + '</span><div class="corps"><div class="t1">' + esc(a.titre) + '</div><div class="t2">' + esc(a.detail) + '</div></div>' + ic('chevron', 'texte-3') + '</div>';
}
function carteJournee() {
  var a = S.auj, evts = evenementsDuJour(a).slice(0, 6);
  return '<div class="carte"><div class="carte-titre"><h2>Aujourd’hui</h2><a href="#/agenda">Agenda</a></div>' + (evts.length ? '<div class="liste">' + evts.map(ligneEvt).join('') + '</div>' : vide('agenda', 'Journée calme', 'Aucune arrivée, aucun départ ni tâche prévue.')) + '</div>';
}
function evenementsDuJour(j) {
  var L2 = [];
  V(S.db.reservations).filter(dansFiltre).forEach(function (r) {
    if (r.debut === j && r.statut !== 'annulee') L2.push({ h: r.heureArrivee || '14:00', t: 'Arrivée · ' + (r.clientNom || ''), d: lienBien(r.bienId) + ' · ' + r.nuits + ' nuit(s)', ic: 'arrivee', ton: 'or', o: 'reservation:' + r.id, fait: r.statut === 'en_cours' || r.statut === 'terminee' });
    if (r.fin === j && (r.statut === 'en_cours' || r.statut === 'terminee')) L2.push({ h: '11:00', t: 'Départ · ' + (r.clientNom || ''), d: lienBien(r.bienId), ic: 'depart', ton: 'att', o: 'reservation:' + r.id, fait: r.statut === 'terminee' });
  });
  V(S.db.taches).filter(dansFiltre).forEach(function (t) { if (t.date === j && t.statut !== 'annulee') L2.push({ h: t.heure || '', t: t.titre, d: (t.bienId ? lienBien(t.bienId) + ' · ' : '') + (personne(t.assigneId) || 'Non attribuée'), ic: t.type === 'menage' ? 'menage' : t.type === 'maintenance' ? 'outil' : 'tache', ton: TON.statutTache[t.statut], o: 'tache:' + t.id, fait: t.statut === 'faite' || t.statut === 'validee' }); });
  V(S.db.prestations).filter(dansFiltre).forEach(function (p) { if (p.date === j && p.statut !== 'annulee') L2.push({ h: p.heure || '', t: p.libelle, d: (p.clientNom || '') + (p.assigneId ? ' · ' + personne(p.assigneId) : ''), ic: 'conciergerie', ton: p.priorite === 'urgente' ? 'urg' : 'or', o: 'prestation:' + p.id, fait: p.statut === 'realisee' }); });
  return L2.sort(function (x, y) { return (x.h || '99') < (y.h || '99') ? -1 : 1; });
}
function ligneEvt(e) {
  return '<div class="ligne cliquable" data-ouvrir="' + e.o + '"' + (e.fait ? ' style="opacity:.55"' : '') + '><span class="pastille-ic ' + (e.ton || '') + '">' + ic(e.ic) + '</span><div class="corps"><div class="t1">' + esc(e.t) + '</div><div class="t2">' + esc(e.d) + '</div></div><div class="droite texte-3" style="font-size:13px">' + esc(e.h) + (e.fait ? ' ' + ic('ok') : '') + '</div></div>';
}
function listePrestations(l) {
  if (!l.length) return vide('conciergerie', 'Aucune prestation en cours');
  return '<div class="liste">' + l.map(function (p) {
    return '<div class="ligne cliquable" data-ouvrir="prestation:' + p.id + '"><span class="pastille-ic ' + (p.priorite === 'urgente' ? 'urg' : 'or') + '">' + ic('conciergerie') + '</span><div class="corps"><div class="t1">' + esc(p.libelle) + '</div><div class="t2">' + esc((p.clientNom || '') + ' · ' + dateRel(p.date) + (p.heure ? ' ' + p.heure : '')) + '</div></div>' + badge('statutPrestation', p.statut) + '</div>';
  }).join('') + '</div>';
}
function ligneProjet(p) {
  var av = LE.avancementProjet(p), c = peut('finance') && p.budget ? LE.coutsProjet(S.db, p) : null, ratio = c ? c.engage / p.budget : 0;
  return '<div class="ligne cliquable" data-go="projet/' + p.id + '" style="flex-direction:column;align-items:stretch;gap:8px"><div style="display:flex;justify-content:space-between;gap:10px"><div class="t1" style="white-space:normal">' + esc(p.nom) + '</div><span class="texte-2" style="font-size:13px">' + av + ' %</span></div>'
    + '<div class="prog"><i style="width:' + av + '%"></i></div>' + (c ? '<div class="t2" style="display:flex;justify-content:space-between;gap:8px"><span>Engagé ' + esc(fc(c.engage)) + '</span><span class="' + (ratio > 1 ? 'baisse' : '') + '">' + Math.round(ratio * 100) + ' % du budget</span></div>' : '') + '</div>';
}

/* ================================================================== DÉTAIL D'UN INDICATEUR */
var INDICS = {
  caFacture: { t: 'Chiffre d’affaires facturé', col: 'factures', serie: 'facture' }, caEncaisse: { t: 'Chiffre d’affaires encaissé', col: 'paiements', serie: 'encaisse' },
  charges: { t: 'Charges de la période', col: 'depenses', serie: 'charges' }, resultat: { t: 'Résultat opérationnel estimé', serie: 'resultat' },
  creances: { t: 'Encaissements attendus', col: 'factures' }, retards: { t: 'Retards de paiement', col: 'factures' }, attendus: { t: 'Factures non échues', col: 'factures' },
  tresorerie: { t: 'Trésorerie disponible' }, occupation: { t: 'Taux d’occupation', serie: 'occupation' }, biens: { t: 'Biens gérés', col: 'biens' },
  sejours: { t: 'Séjours' }, prestations: { t: 'Prestations VIP en cours', col: 'prestations' }, projets: { t: 'Projets actifs', col: 'projets' }, loyers: { t: 'Loyers gérés pour les propriétaires', col: 'factures' }
};
function ecranIndicateur(cle) {
  var d = INDICS[cle]; if (!d) return ecranAccueil();
  var k = kpis(), x = k[cle], p = periodeCourante(), h = '<button class="retour" data-act="retour">' + ic('retour') + 'Retour</button>';
  var val = cle === 'occupation' ? pct(x.valeur, 1) : cle === 'biens' || cle === 'prestations' || cle === 'projets' ? String(x.valeur) : cle === 'sejours' ? x.enCours.length + ' en cours' : cle === 'loyers' ? montantHTML(x.appeles) : montantHTML(x.valeur);
  h += '<div class="entete"><div><div class="surtitre">' + esc(nomPerimetre() + ' · ' + p.nom) + '</div><h1>' + esc(d.t) + '</h1></div>' + ongletsPeriode() + '</div>';
  h += '<div class="grille g-12"><div class="carte s5"><div class="kpi-lib">Valeur</div><div class="kpi-val" style="font-size:40px;margin:10px 0 14px">' + val + '</div>' + (x.formule ? '<div class="calcul"><b>Mode de calcul.</b> ' + esc(x.formule) + '</div>' : '') + detailChiffres(cle, k) + '</div>';
  if (d.serie && (cle === 'occupation' || peut('finance'))) {
    var serie = LE.serieMensuelle(S.db, { societeId: S.filtre.societeId, branchId: S.filtre.branchId, bienId: S.filtre.bienId, fin: S.auj, aujourdhui: S.auj }, 12);
    var vals = serie.map(function (m) { return d.serie === 'resultat' ? m.facture - m.charges : d.serie === 'occupation' ? Math.round((m.occupation || 0) * 1000) / 10 : m[d.serie]; });
    h += '<div class="carte s7"><div class="carte-titre"><h2>Historique · 12 mois</h2></div>' + (d.serie === 'occupation' ? courbe([{ nom: 'Occupation (%)', valeurs: vals, couleur: 'var(--accent)' }], serie.map(function (m) { return MOIS_C[+m.mois.slice(5) - 1]; })).replace(/ FCFA/g, ' %') : courbe([{ nom: d.t, valeurs: vals.map(function (v) { return Math.max(0, v); }), couleur: 'var(--accent)' }], serie.map(function (m) { return MOIS_C[+m.mois.slice(5) - 1]; }))) + '</div>';
  }
  h += '</div>';
  h += '<div class="carte section"><div class="carte-titre"><h2>Données qui composent l’indicateur</h2>' + (d.col ? '<button class="lien" data-act="exportIndic" data-id="' + cle + '">' + 'Exporter (CSV)</button>' : '') + '</div>' + tableIndic(cle, k) + '</div>';
  return h;
}
function detailChiffres(cle, k) {
  var l = [];
  if (cle === 'caEncaisse' && k.caEncaisse.enAttente) l.push(['En attente de confirmation (non compté)', fc(k.caEncaisse.enAttente)]);
  if (cle === 'caFacture') l.push(['Taxes facturées (hors chiffre d’affaires)', fc(k.caFacture.taxes)]);
  if (cle === 'charges') l.push(['Dont engagées non payées (toutes dates)', fc(k.charges.engagees)]);
  if (cle === 'resultat') { l.push(['Chiffre d’affaires facturé', fc(k.caFacture.valeur)]); l.push(['Charges', '− ' + fc(k.charges.valeur)]); }
  if (cle === 'creances') { l.push(['Dont en retard', fc(k.retards.valeur)]); l.push(['Dont non échues', fc(k.attendus.valeur)]); }
  if (cle === 'occupation') { l.push(['Nuitées occupées', String(k.occupation.occupees)]); l.push(['Nuitées commercialisables', String(k.occupation.vendables)]); }
  if (cle === 'loyers') { l.push(['Loyers appelés sur la période', fc(k.loyers.appeles)]); l.push(['Loyers impayés à ce jour', fc(k.loyers.impayes)]); }
  return l.length ? '<div class="liste" style="margin-top:14px">' + l.map(function (x) { return '<div class="ligne"><div class="corps t2" style="white-space:normal">' + esc(x[0]) + '</div><div class="droite montant">' + esc(x[1]) + '</div></div>'; }).join('') + '</div>' : '';
}
function idsIndic(cle, k) {
  return { caFacture: k.caFacture.detail, caEncaisse: k.caEncaisse.detail.concat(k.caEncaisse.enAttenteIds), charges: k.charges.detail, creances: k.creances.detail, retards: k.retards.detail, attendus: k.attendus.detail, biens: k.biens.detail, prestations: k.prestations.detail, projets: k.projets.detail, loyers: k.loyers.impayesIds }[cle] || [];
}
function tableIndic(cle, k) {
  if (cle === 'tresorerie') return tableComptes(k);
  if (cle === 'resultat') return tableParActivite(k);
  if (cle === 'occupation') return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Résidence</th><th class="num">Nuitées occupées</th><th class="num">Commercialisables</th><th class="num">Taux</th></tr></thead><tbody>'
    + k.rentabilite.filter(function (b) { return b.occupation !== null; }).map(function (b) { var o = LE.indicateurs(S.db, { bienId: b.id, debut: k.periode.debut, fin: k.periode.fin, aujourdhui: S.auj }).occupation; return '<tr class="cliquable" data-go="bien/' + b.id + '"><td class="m1">' + esc(b.nom) + '</td><td class="num mx">' + o.occupees + '</td><td class="num mx">' + o.vendables + '</td><td class="num">' + pct(o.valeur, 1) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  if (cle === 'sejours') { var r = k.sejours; return tableReservations(r.enCours.concat(r.arrivees, r.departs, r.aVenir).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (id) { return S.db.reservations[id]; })); }
  var ids = idsIndic(cle, k), col = INDICS[cle].col;
  if (col === 'factures') return tableFactures(ids.map(function (id) { return S.db.factures[id]; }));
  if (col === 'paiements') return tablePaiements(ids.map(function (id) { return S.db.paiements[id]; }));
  if (col === 'depenses') return tableDepenses(ids.map(function (id) { return S.db.depenses[id]; }));
  if (col === 'biens') return '<div class="liste">' + ids.map(function (id) { var b = S.db.biens[id]; return '<div class="ligne cliquable" data-go="bien/' + id + '"><span class="pastille-ic">' + ic('biens') + '</span><div class="corps"><div class="t1">' + esc(b.nom) + '</div><div class="t2">' + esc(L.modeBien[b.mode] + ' · ' + (b.quartier || '')) + '</div></div>' + badge('statutBien', LE.statutBien(S.db, b, S.auj)) + '</div>'; }).join('') + '</div>';
  if (col === 'prestations') return listePrestations(ids.map(function (id) { return S.db.prestations[id]; }));
  if (col === 'projets') return ids.map(function (id) { return ligneProjet(S.db.projets[id]); }).join('');
  return '';
}
function tableComptes(k) {
  if (!k.tresorerie.comptes.length) return vide('banque', 'Aucun compte renseigné', 'Ajoutez vos comptes bancaires, caisses et Mobile Money avec leur solde de départ.', btAjout('nouveauCompte', 'Ajouter un compte', 'finance'));
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Compte</th><th class="mx">Société</th><th class="num mx">Solde de départ</th><th class="num mx">Entrées</th><th class="num mx">Sorties</th><th class="num">Solde</th></tr></thead><tbody>'
    + k.tresorerie.comptes.map(function (c) { return '<tr><td class="m1">' + esc(c.nom) + '</td><td class="mx">' + esc(nomDe('societes', c.societeId)) + '</td><td class="num mx">' + fc(c.soldeInitial) + '</td><td class="num mx">' + fc(c.entrees) + '</td><td class="num mx">' + fc(c.sorties) + '</td><td class="num">' + fc(c.solde) + '</td></tr>'; }).join('')
    + '</tbody><tfoot><tr><td class="m1">Total</td><td class="mx"></td><td class="mx"></td><td class="mx"></td><td class="mx"></td><td class="num">' + fc(k.tresorerie.valeur) + '</td></tr></tfoot></table></div>';
}
function tableParActivite(k) {
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Activité</th><th class="mx">Société</th><th class="num mx">Facturé</th><th class="num mx">Charges</th><th class="num">Résultat</th></tr></thead><tbody>'
    + k.parBranche.map(function (b) { return '<tr><td class="m1">' + esc(b.nom) + '</td><td class="mx">' + esc(nomDe('societes', b.societeId)) + '</td><td class="num mx">' + fc(b.ca) + '</td><td class="num mx">' + fc(b.charges) + '</td><td class="num ' + (b.resultat < 0 ? 'baisse' : '') + '">' + fc(b.resultat) + '</td></tr>'; }).join('')
    + '</tbody></table></div><div class="kpi-pied" style="margin-top:12px">Les flux entre sociétés du groupe sont neutralisés dans la vue consolidée : la somme des activités peut donc dépasser le total du groupe.</div>';
}

/* ---------- tableaux réutilisables */
function tableFactures(l) {
  if (!l.length) return vide('facture', 'Aucune facture');
  l = trierPar(l, function (f) { return f.date; }, true);
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Facture</th><th class="mx">Client</th><th class="mx">Date</th><th class="mx">Échéance</th><th class="num">Montant</th><th class="num mx">Reste dû</th><th class="mx">État</th></tr></thead><tbody>'
    + l.map(function (f) {
      var e = LE.etatFacture(S.db, f, S.auj), reste = LE.soldeFacture(S.db, f);
      return '<tr class="cliquable" data-ouvrir="facture:' + f.id + '"><td class="m1">' + esc(f.libelle) + '<div class="texte-3" style="font-size:12px">' + esc(f.numero) + (f.interneSocieteId ? ' · interne au groupe' : '') + (f.compteDeTiers ? ' · pour le compte du propriétaire' : '') + '</div></td><td class="mx">' + esc(f.clientNom || nomDe('tiers', f.tiersId) || nomDe('societes', f.interneSocieteId)) + '</td><td class="mx">' + dateCourte(f.date) + '</td><td class="mx">' + dateCourte(f.echeance) + '</td><td class="num">' + fc(LE.totalFacture(f)) + '</td><td class="num mx">' + (reste > 0 ? fc(reste) : '—') + '</td><td>' + badge('etatFacture', e) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}
function tablePaiements(l) {
  if (!l.length) return vide('banque', 'Aucun encaissement');
  l = trierPar(l, function (p) { return p.date; }, true);
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Encaissement</th><th class="mx">Date</th><th class="mx">Moyen</th><th class="num">Montant</th><th>Statut</th></tr></thead><tbody>'
    + l.map(function (p) { var f = S.db.factures[p.factureId] || {}; return '<tr class="cliquable" data-ouvrir="facture:' + p.factureId + '"><td class="m1">' + esc(f.clientNom || nomDe('tiers', f.tiersId) || f.libelle || '') + '<div class="texte-3" style="font-size:12px">' + esc((f.numero || '') + (p.numeroRecu ? ' · reçu ' + p.numeroRecu : '')) + '</div></td><td class="mx">' + dateCourte(p.date) + '</td><td class="mx">' + esc(L.modePaiement[p.mode]) + '</td><td class="num">' + fc(p.montant) + '</td><td>' + badge('statutPaiement', p.statut) + '</td></tr>'; }).join('')
    + '</tbody></table></div>';
}
function tableDepenses(l) {
  if (!l.length) return vide('depense', 'Aucune dépense');
  l = trierPar(l, function (x) { return x.date; }, true);
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Dépense</th><th class="mx">Catégorie</th><th class="mx">Rattachement</th><th class="mx">Date</th><th class="num">Montant</th><th>Statut</th></tr></thead><tbody>'
    + l.map(function (x) { return '<tr class="cliquable" data-ouvrir="depense:' + x.id + '"><td class="m1">' + esc(x.libelle) + (x.interneSocieteId ? '<div class="texte-3" style="font-size:12px">Interne au groupe</div>' : '') + '</td><td class="mx">' + esc(L.categorieDepense[x.categorie]) + '</td><td class="mx">' + esc(x.bienId ? nomDe('biens', x.bienId) : nomDe('branches', x.branchId) || nomDe('societes', x.societeId)) + '</td><td class="mx">' + dateCourte(x.date) + '</td><td class="num">' + fc(x.montant) + '</td><td>' + badge('statutDepense', x.statut) + '</td></tr>'; }).join('')
    + '</tbody></table></div>';
}
function tableReservations(l) {
  if (!l.length) return vide('agenda', 'Aucune réservation');
  var fin = peut('finance');
  return '<div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Client</th><th class="mx">Résidence</th><th class="mx">Arrivée</th><th class="mx">Départ</th><th class="num mx">Nuits</th>' + (fin ? '<th class="num">Montant</th>' : '') + '<th>Statut</th></tr></thead><tbody>'
    + l.map(function (r) { return '<tr class="cliquable" data-ouvrir="reservation:' + r.id + '"><td class="m1">' + esc(r.clientNom) + '<div class="texte-3" style="font-size:12px">' + esc(lienBien(r.bienId).replace(/&amp;/g, '&')) + ' · ' + dateCourte(r.debut) + ' → ' + dateCourte(r.fin) + '</div></td><td class="mx">' + lienBien(r.bienId) + '</td><td class="mx">' + dateCourte(r.debut) + '</td><td class="mx">' + dateCourte(r.fin) + '</td><td class="num mx">' + r.nuits + '</td>' + (fin ? '<td class="num">' + fc(r.montant) + '</td>' : '') + '<td>' + badge('statutReservation', r.statut) + '</td></tr>'; }).join('')
    + '</tbody></table></div>';
}

/* ================================================================== BIENS */
function ecranBiens() {
  var mode = S.ongletBiens || 'tous', biens = V(S.db.biens).filter(dansFiltre);
  var compte = function (m) { return biens.filter(function (b) { return m === 'tous' || b.mode === m; }).length; };
  var l = trierPar(biens.filter(function (b) { return mode === 'tous' || b.mode === mode; }), function (b) { return b.nom; });
  var h = entete('Luxury Residences · Wealth & Property', 'Biens', biens.length + ' bien(s) · ' + esc(nomPerimetre()), btAjout('nouveauBien', 'Nouveau bien', 'biens'));
  h += '<div class="onglets" style="margin-bottom:20px">' + [['tous', 'Tous'], ['location_meublee', 'Résidences meublées'], ['gestion_locative', 'Gérés pour propriétaires'], ['patrimoine_propre', 'Patrimoine du groupe']].filter(function (o) { return o[0] === 'tous' || compte(o[0]); })
    .map(function (o) { return '<button data-act="ongletBiens" data-v="' + o[0] + '" class="' + (mode === o[0] ? 'actif' : '') + '">' + o[1] + ' <span class="texte-3">' + compte(o[0]) + '</span></button>'; }).join('') + '</div>';
  if (!l.length) return h + vide('biens', 'Aucun bien sur ce périmètre', 'Ajoutez une première résidence ou élargissez le filtre.', btAjout('nouveauBien', 'Nouveau bien', 'biens'));
  var k = kpis();
  h += '<div class="biens">' + l.map(function (b) {
    var st = LE.statutBien(S.db, b, S.auj), r = k.rentabilite.filter(function (x) { return x.id === b.id; })[0];
    var faits = b.mode === 'location_meublee' ? [['lit', (b.chambres || 0) + ' ch.'], ['personnes', (b.capacite || 0) + ' pers.'], b.tarifNuit ? ['finance', nombre(b.tarifNuit) + ' / nuit'] : null, r && r.occupation !== null ? ['rapports', pct(r.occupation) + ' occupé'] : null]
      : b.mode === 'gestion_locative' ? [['surface', (b.surface || '—') + ' m²'], b.loyerMensuel ? ['finance', nombre(b.loyerMensuel) + ' / mois'] : null, ['contacts', nomDe('tiers', b.proprietaireId) || 'Propriétaire']]
        : [['surface', (b.surface || '—') + ' m²'], b.valeurEstimee ? ['finance', abrege(b.valeurEstimee) + ' · ' + (b.valeurType === 'expertise' ? 'expertise' : 'estimation')] : null];
    return '<article class="bien" data-go="bien/' + b.id + '" tabindex="0">' + visuelBien(b, badge('statutBien', st))
      + '<div class="bien-corps"><h3>' + esc(b.nom) + '</h3><div class="lieu">' + ic('lieu') + esc((b.quartier || '') + (b.ville ? ', ' + b.ville : '')) + '</div><div class="bien-faits">' + faits.filter(Boolean).map(function (f) { return '<span>' + ic(f[0]) + esc(f[1]) + '</span>'; }).join('') + '</div></div></article>';
  }).join('') + '</div>';
  return h;
}

function ecranBien(id) {
  var b = S.db.biens[id]; if (!b) return vide('biens', 'Bien introuvable', 'Il a peut-être été retiré de votre périmètre.');
  var st = LE.statutBien(S.db, b, S.auj), ecr = peut('biens', 2), onglet = S.ongletBien || 'apercu', resid = b.mode === 'location_meublee';
  var h = '<button class="retour" data-go="biens">' + ic('retour') + 'Biens</button>';
  h += '<div class="hero">' + visuelBien(b, '', 'position:absolute;inset:0;aspect-ratio:auto') + '<div class="voile"></div><div class="legende"><div><div class="surtitre" style="color:var(--accent-vif)">' + esc(L.modeBien[b.mode] + ' · ' + nomDe('branches', b.branchId)) + '</div>' + badge('statutBien', st) + '<h1>' + esc(b.nom) + '</h1><div style="opacity:.75;margin-top:4px">' + esc((b.quartier || '') + (b.ville ? ', ' + b.ville : '')) + '</div></div>'
    + '<div class="entete-actions">' + (ecr ? '<button class="bt" data-act="photoBien" data-id="' + id + '">' + ic('photo') + '<span class="lib-long">Photos</span></button><button class="bt" data-act="modifierBien" data-id="' + id + '">Modifier</button>' : '') + (resid && peut('reservations', 2) ? '<button class="bt principal-bt" data-act="nouvelleReservation" data-id="' + id + '">' + ic('ajout') + 'Réserver</button>' : '') + '</div></div></div>';
  if ((b.photos || []).length > 1) h += '<div class="miniatures">' + b.photos.map(function (p, i) { return '<div class="visuel" style="width:86px;height:60px;aspect-ratio:auto;border-radius:8px;flex:none" data-photo="' + esc(p) + '" data-act="photoUne" data-id="' + id + '" data-i="' + i + '"></div>'; }).join('') + '</div>';
  var tabs = [['apercu', 'Aperçu']]; if (resid) tabs.push(['calendrier', 'Calendrier']); if (peut('finance')) tabs.push(['finances', 'Finances']); tabs.push(['inventaire', 'Inventaire']); tabs.push(['incidents', 'Incidents']); if (resid) tabs.push(['occupants', 'Occupants']);
  h += '<div class="onglets" style="margin-bottom:20px">' + tabs.map(function (t) { var n = t[0] === 'incidents' ? (b.incidents || []).filter(function (i) { return !i.resolu; }).length : 0; return '<button data-act="ongletBien" data-v="' + t[0] + '" class="' + (onglet === t[0] ? 'actif' : '') + '">' + t[1] + (n ? ' <span class="badge att nu">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>';
  if (onglet === 'calendrier' && resid) h += bienCalendrier(b);
  else if (onglet === 'finances' && peut('finance')) h += bienFinances(b);
  else if (onglet === 'inventaire') h += bienInventaire(b, ecr);
  else if (onglet === 'incidents') h += bienIncidents(b, ecr);
  else if (onglet === 'occupants' && resid) h += '<div class="carte">' + tableReservations(trierPar(V(S.db.reservations).filter(function (r) { return r.bienId === b.id && r.statut !== 'annulee'; }), function (r) { return r.debut; }, true)) + '</div>';
  else h += bienApercu(b, ecr);
  return h;
}
function bienApercu(b, ecr) {
  var fin = peut('finance'), resid = b.mode === 'location_meublee', faits = [['Type', L.typeBien[b.type]], ['Quartier', b.quartier || '—']];
  if (b.chambres) faits.push(['Chambres', b.chambres]); if (b.capacite) faits.push(['Capacité', b.capacite + ' personnes']); if (b.surface) faits.push(['Surface', b.surface + ' m²']);
  if (fin && resid) faits.push(['Tarif de base', fc(b.tarifNuit) + ' / nuit']);
  if (fin && b.loyerMensuel) faits.push(['Loyer mensuel', fc(b.loyerMensuel)]);
  if (fin && b.commission) faits.push(['Honoraires de gestion', b.commission + ' %']);
  if (fin && b.valeurEstimee) faits.push([b.valeurType === 'expertise' ? 'Valeur d’expertise' : 'Valeur estimée (non expertisée)', fc(b.valeurEstimee)]);
  if (b.proprietaireId) faits.push(['Propriétaire', nomDe('tiers', b.proprietaireId)]);
  if (b.locataire) faits.push(['Locataire', b.locataire]);
  if (b.finMandat) faits.push(['Fin du mandat', dateCourte(b.finMandat, true)]);
  var h = '<div class="grille g-12"><div class="s8" style="display:flex;flex-direction:column;gap:16px"><div class="faits">' + faits.map(function (f) { return '<div><small>' + esc(f[0]) + '</small><b>' + esc(f[1]) + '</b></div>'; }).join('') + '</div>';
  if (b.description) h += '<div class="carte"><div class="carte-titre"><h2>Description</h2></div><p style="margin:0;color:var(--texte-2)">' + esc(b.description) + '</p></div>';
  if ((b.equipements || []).length) h += '<div class="carte"><div class="carte-titre"><h2>Équipements</h2></div><div class="etiquettes">' + b.equipements.map(function (e) { return '<span class="etiquette">' + esc(e) + '</span>'; }).join('') + '</div></div>';
  if (fin && resid) h += '<div class="carte"><div class="carte-titre"><h2>Tarifs</h2>' + (ecr ? '<button class="lien" data-act="modifierBien" data-id="' + b.id + '">Modifier</button>' : '') + '</div><div class="liste">'
    + '<div class="ligne"><div class="corps"><div class="t1">Tarif de base</div><div class="t2">Toute l’année hors saisons</div></div><div class="droite montant">' + fc(b.tarifNuit) + '</div></div>'
    + (b.saisons || []).map(function (s) { return '<div class="ligne"><div class="corps"><div class="t1">' + esc(s.nom) + '</div><div class="t2">Du ' + s.du.split('-').reverse().join('/') + ' au ' + s.au.split('-').reverse().join('/') + '</div></div><div class="droite montant">' + fc(s.prix) + '</div></div>'; }).join('')
    + '<div class="ligne"><div class="corps"><div class="t1">Remises de durée</div><div class="t2">7 nuits et plus · 28 nuits et plus</div></div><div class="droite">' + (b.remiseSemaine || 0) + ' % · ' + (b.remiseMois || 0) + ' %</div></div></div></div>';
  h += '</div><div class="s4" style="display:flex;flex-direction:column;gap:16px">';
  if (resid) {
    var prochains = trierPar(V(S.db.reservations).filter(function (r) { return r.bienId === b.id && r.fin >= S.auj && r.statut !== 'annulee' && r.statut !== 'terminee'; }), function (r) { return r.debut; }).slice(0, 5);
    h += '<div class="carte"><div class="carte-titre"><h2>Prochains séjours</h2></div>' + (prochains.length ? '<div class="liste">' + prochains.map(function (r) { return '<div class="ligne cliquable" data-ouvrir="reservation:' + r.id + '"><div class="corps"><div class="t1">' + esc(r.clientNom) + '</div><div class="t2">' + dateCourte(r.debut) + ' → ' + dateCourte(r.fin) + ' · ' + r.nuits + ' nuit(s)</div></div>' + badge('statutReservation', r.statut) + '</div>'; }).join('') + '</div>' : vide('agenda', 'Aucun séjour prévu')) + '</div>';
    var notes = V(S.db.reservations).filter(function (r) { return r.bienId === b.id && r.satisfaction; });
    if (notes.length) h += '<div class="carte"><div class="carte-titre"><h2>Satisfaction</h2></div><div class="kpi-val">' + (LE.somme(notes, function (r) { return r.satisfaction; }) / notes.length).toFixed(1).replace('.', ',') + '<small>/ 5 · ' + notes.length + ' avis</small></div></div>';
  }
  if (ecr) h += '<div class="carte"><div class="carte-titre"><h2>Gestion</h2></div><div style="display:flex;flex-direction:column;gap:8px">'
    + (resid ? '<button class="bt" data-act="bloquerBien" data-id="' + b.id + '">' + ic('horloge') + 'Bloquer des dates</button>' : '')
    + '<button class="bt" data-act="etatBien" data-id="' + b.id + '">' + ic('outil') + 'Changer l’état (' + esc(L.etatBien[b.etat || 'actif']) + ')</button>'
    + '<button class="bt" data-act="incident" data-id="' + b.id + '">' + ic('alerte') + 'Déclarer un incident</button>'
    + (peut('agenda', 2) ? '<button class="bt" data-act="nouvelleTache" data-bien="' + b.id + '">' + ic('tache') + 'Planifier une tâche</button>' : '') + '</div>'
    + ((b.indispos || []).length ? '<div class="liste" style="margin-top:14px">' + b.indispos.map(function (x, i) { return '<div class="ligne"><div class="corps"><div class="t1">' + esc(x.motif) + '</div><div class="t2">' + dateCourte(x.debut) + ' → ' + dateCourte(x.fin) + '</div></div><button class="bt petit discret" data-act="debloquer" data-id="' + b.id + '" data-i="' + i + '">Retirer</button></div>'; }).join('') + '</div>' : '') + '</div>';
  return h + '</div></div>';
}
function bienCalendrier(b) {
  var m = S.moisCal || S.auj.slice(0, 7), y = +m.slice(0, 4), mo = +m.slice(5, 7), premier = m + '-01', jours = new Date(y, mo, 0).getDate();
  var decal = (dObj(premier).getDay() + 6) % 7, cases = '';
  var sej = V(S.db.reservations).filter(function (r) { return r.bienId === b.id && r.statut !== 'annulee'; });
  for (var i = 0; i < decal; i++) cases += '<div class="j hors"></div>';
  for (var d = 1; d <= jours; d++) {
    var j = m + '-' + (d < 10 ? '0' : '') + d, r = sej.filter(function (x) { return x.debut <= j && j < x.fin; })[0], bl = (b.indispos || []).some(function (x) { return x.debut <= j && j < x.fin; });
    cases += '<div class="j' + (r ? (r.statut === 'option' ? ' opt' : ' occ') : '') + (bl ? ' bloq' : '') + (j === S.auj ? ' auj' : '') + '"' + (r ? ' data-ouvrir="reservation:' + r.id + '" style="cursor:pointer"' : (!bl && j >= S.auj && peut('reservations', 2) ? ' data-act="nouvelleReservation" data-id="' + b.id + '" data-date="' + j + '" style="cursor:copy"' : '')) + '>' + d + (r && r.debut === j ? '<small>' + esc(r.clientNom) + '</small>' : '') + '</div>';
  }
  var k = LE.indicateurs(S.db, { bienId: b.id, debut: premier, fin: m + '-' + jours, aujourdhui: S.auj });
  return '<div class="carte"><div class="carte-titre"><h2 style="font-family:var(--serif);font-size:22px;letter-spacing:0;text-transform:none;color:var(--texte)">' + MOIS[mo - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + y + '</h2><div style="display:flex;gap:6px;align-items:center"><span class="texte-3" style="font-size:13px;margin-right:8px">Occupation ' + pct(k.occupation.valeur) + '</span><button class="bt-icone" data-act="moisCal" data-v="-1" aria-label="Mois précédent">' + ic('retour') + '</button><button class="bt-icone" data-act="moisCal" data-v="1" aria-label="Mois suivant">' + ic('fleche') + '</button></div></div>'
    + '<div class="cal">' + ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(function (n) { return '<div class="jn">' + n + '</div>'; }).join('') + cases + '</div>'
    + '<div class="legende-cal"><span><i style="background:color-mix(in srgb, var(--accent) 26%, var(--surface-2))"></i>Réservé</span><span><i style="background:repeating-linear-gradient(135deg, var(--accent-doux) 0 3px, transparent 3px 6px), var(--surface-2)"></i>Option</span><span><i style="background:repeating-linear-gradient(135deg, var(--att-doux) 0 3px, transparent 3px 6px), var(--surface-2)"></i>Bloqué</span><span><i style="background:var(--surface-2)"></i>Disponible · touchez un jour pour réserver</span></div></div>';
}
function bienFinances(b) {
  var p = periodeCourante(), k = LE.indicateurs(S.db, { bienId: b.id, debut: p.debut, fin: p.fin, aujourdhui: S.auj }), r = k.rentabilite[0] || { revenus: 0, charges: 0, resultat: 0 };
  var dispo = k.occupation.vendables, revpar = dispo ? Math.round(r.revenus / dispo) : null;
  var h = '<div class="entete" style="margin-bottom:16px"><div class="texte-2">' + esc(p.nom) + '</div>' + ongletsPeriode() + '</div><div class="grille g4 kpis">'
    + '<div class="carte kpi"><div class="kpi-lib">Revenus</div><div class="kpi-val">' + montantHTML(r.revenus) + '</div><div class="kpi-pied">Factures du bien</div></div>'
    + '<div class="carte kpi"><div class="kpi-lib">Charges</div><div class="kpi-val">' + montantHTML(r.charges) + '</div><div class="kpi-pied">Dépenses affectées</div></div>'
    + '<div class="carte kpi vedette"><div class="kpi-lib">Résultat</div><div class="kpi-val ' + (r.resultat < 0 ? 'baisse' : '') + '">' + montantHTML(r.resultat) + '</div><div class="kpi-pied">Revenus − charges</div></div>'
    + (b.mode === 'location_meublee' ? '<div class="carte kpi"><div class="kpi-lib">Revenu par nuitée disponible</div><div class="kpi-val">' + montantHTML(revpar) + '</div><div class="kpi-pied">Occupation ' + pct(k.occupation.valeur) + '</div></div>' : '<div class="carte kpi"><div class="kpi-lib">Loyers impayés</div><div class="kpi-val">' + montantHTML(k.loyers.impayes) + '</div><div class="kpi-pied">Pour le compte du propriétaire</div></div>')
    + '</div>';
  var fac = V(S.db.factures).filter(function (f) { return f.bienId === b.id && f.societeId === b.societeId; }), dep = V(S.db.depenses).filter(function (x) { return x.bienId === b.id && x.statut !== 'annulee'; });
  h += '<div class="grille g2" style="margin-top:16px"><div class="carte"><div class="carte-titre"><h2>Factures</h2></div>' + tableFactures(fac.slice(0, 200)) + '</div><div class="carte"><div class="carte-titre"><h2>Charges</h2>' + (peut('finance', 2) ? '<button class="lien" data-act="nouvelleDepense" data-bien="' + b.id + '">Ajouter</button>' : '') + '</div>' + tableDepenses(dep) + '</div></div>';
  if (b.mode === 'gestion_locative') h += '<div class="carte section"><div class="carte-titre"><h2>Relevé de gestion pour le propriétaire</h2><button class="lien" data-act="releve" data-id="' + b.id + '">Préparer le relevé</button></div><p class="texte-2" style="margin:0">Loyers encaissés, honoraires et charges du bien sur la période, à remettre à ' + esc(nomDe('tiers', b.proprietaireId) || 'son propriétaire') + '.</p></div>';
  return h;
}
function bienInventaire(b, ecr) {
  var inv = b.inventaire || [];
  return '<div class="carte"><div class="carte-titre"><h2>Inventaire des équipements</h2>' + (ecr ? '<button class="lien" data-act="inventaire" data-id="' + b.id + '">Modifier</button>' : '') + '</div>'
    + (inv.length ? '<div class="tableau-env"><table class="tab"><thead><tr><th>Élément</th><th class="num">Quantité</th><th>État</th></tr></thead><tbody>' + inv.map(function (x) { return '<tr><td>' + esc(x.nom) + '</td><td class="num">' + x.qte + '</td><td>' + (x.etat === 'bon' ? badge('', '', 'Bon état').replace('badge ', 'badge ok ') : '<span class="badge att">' + esc(x.etat) + '</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : vide('journal', 'Inventaire à établir', 'Listez le mobilier et les équipements pour suivre leur état à chaque départ.', ecr ? '<button class="bt" data-act="inventaire" data-id="' + b.id + '">Commencer l’inventaire</button>' : '')) + '</div>';
}
function bienIncidents(b, ecr) {
  var l = (b.incidents || []).slice().reverse();
  return '<div class="carte"><div class="carte-titre"><h2>Incidents et maintenance</h2><button class="lien" data-act="incident" data-id="' + b.id + '">Déclarer</button></div>'
    + (l.length ? '<div class="liste">' + l.map(function (x) { var i = b.incidents.indexOf(x); return '<div class="ligne"><span class="pastille-ic ' + (x.resolu ? 'ok' : x.priorite === 'urgente' ? 'urg' : 'att') + '">' + ic(x.resolu ? 'ok' : 'outil') + '</span><div class="corps"><div class="t1">' + esc(x.titre) + '</div><div class="t2">' + dateCourte(x.date) + ' · ' + esc(personne(x.par)) + (x.resolu ? ' · résolu le ' + dateCourte(x.resoluLe) : '') + '</div></div>' + (!x.resolu && ecr ? '<button class="bt petit" data-act="incidentResolu" data-id="' + b.id + '" data-i="' + i + '">Résolu</button>' : '') + '</div>'; }).join('') + '</div>' : vide('ok', 'Aucun incident', 'Tout est en ordre.')) + '</div>';
}

/* ================================================================== AGENDA */
function ecranAgenda() {
  var mobile = window.matchMedia('(max-width: 760px)').matches, vue = S.ongletAgenda || (mobile || !peut('reservations') ? 'jour' : 'planning');
  var tabs = [];
  if (peut('reservations')) tabs.push(['planning', 'Planning']);
  tabs.push(['jour', 'Journées']); if (peut('agenda')) tabs.push(['taches', 'Tâches']); if (peut('reservations')) tabs.push(['reservations', 'Réservations']);
  var actions = (peut('reservations', 2) ? btAjout('nouvelleReservation', 'Réservation', 'reservations') : '') + (peut('agenda', 2) && !propre() ? '<button class="bt" data-act="nouvelleTache">' + ic('tache') + '<span class="lib-long">Tâche</span></button>' : '');
  var h = entete('Agenda opérationnel', 'Agenda', esc(nomPerimetre()), actions);
  h += '<div class="onglets" style="margin-bottom:18px">' + tabs.map(function (t) { return '<button data-act="ongletAgenda" data-v="' + t[0] + '" class="' + (vue === t[0] ? 'actif' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (vue === 'planning') return h + planning();
  if (vue === 'taches') return h + listeTaches();
  if (vue === 'reservations') {
    var st = S.filtreResa || 'actives', l = V(S.db.reservations).filter(dansFiltre).filter(function (r) { return st === 'toutes' ? true : st === 'actives' ? (r.statut === 'option' || r.statut === 'confirmee' || r.statut === 'en_cours') : r.statut === st; });
    return h + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div class="onglets">' + [['actives', 'À venir et en cours'], ['terminee', 'Terminées'], ['annulee', 'Annulées'], ['toutes', 'Toutes']].map(function (o) { return '<button data-act="filtreResa" data-v="' + o[0] + '" class="' + (st === o[0] ? 'actif' : '') + '">' + o[1] + '</button>'; }).join('') + '</div><button class="bt petit" data-act="exportResa">' + ic('export') + 'Exporter</button></div>'
      + '<div class="carte">' + tableReservations(trierPar(l, function (r) { return r.debut; }, st !== 'actives')) + '</div>';
  }
  return h + journees();
}
function planning() {
  var nb = window.matchMedia('(max-width: 1020px)').matches ? 14 : 21, debut = S.debutPlanning || LE.decaler(S.auj, -2), jours = [];
  for (var i = 0; i < nb; i++) jours.push(LE.decaler(debut, i));
  var fin = LE.decaler(debut, nb), largeur = 50, col0 = 190;
  var res = trierPar(V(S.db.biens).filter(function (b) { return b.mode === 'location_meublee' && dansFiltre(b); }), function (b) { return b.nom; });
  if (!res.length) return vide('biens', 'Aucune résidence meublée', 'Le planning affiche les résidences meublées du périmètre choisi.');
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap"><div class="texte-2">' + dateCourte(debut) + ' → ' + dateCourte(LE.decaler(fin, -1)) + '</div><div style="display:flex;gap:6px"><button class="bt petit" data-act="planning" data-v="-7">' + ic('retour') + '</button><button class="bt petit" data-act="planning" data-v="0">Aujourd’hui</button><button class="bt petit" data-act="planning" data-v="7">' + ic('fleche') + '</button></div></div>';
  h += '<div class="frise-env"><div class="frise" style="grid-template-columns:' + col0 + 'px repeat(' + nb + ', ' + largeur + 'px)"><div class="tete"></div>';
  jours.forEach(function (j) { var d = dObj(j), we = d.getDay() === 0 || d.getDay() === 6; h += '<div class="jour-t' + (j === S.auj ? ' auj' : '') + (we ? ' we' : '') + '">' + JOURS[d.getDay()].slice(0, 3) + '<b>' + d.getDate() + '</b></div>'; });
  res.forEach(function (b) {
    h += '<div class="nomb" data-go="bien/' + b.id + '">' + esc(b.nom) + '</div><div class="piste" style="grid-column:2 / span ' + nb + ';background-size:' + largeur + 'px 100%">';
    if (peut('reservations', 2)) jours.forEach(function (j, i) { if (j >= S.auj) h += '<div class="clic" style="left:' + (i * largeur) + 'px;width:' + largeur + 'px" data-act="nouvelleReservation" data-id="' + b.id + '" data-date="' + j + '" title="Réserver à partir du ' + dateCourte(j) + '"></div>'; });
    var ia = LE.ecart(debut, S.auj); if (ia >= 0 && ia < nb) h += '<div class="ligne-auj" style="left:' + (ia * largeur + largeur / 2) + 'px"></div>';
    V(S.db.reservations).filter(function (r) { return r.bienId === b.id && r.statut !== 'annulee' && r.debut < fin && r.fin > debut; }).forEach(function (r) {
      var a = Math.max(0, LE.ecart(debut, r.debut) + 0.5), z = Math.min(nb, LE.ecart(debut, r.fin) + 0.5);
      h += '<div class="sejour ' + r.statut + '" style="left:' + (a * largeur + 2) + 'px;width:' + Math.max(18, (z - a) * largeur - 4) + 'px" data-ouvrir="reservation:' + r.id + '" title="' + esc(r.clientNom + ' · ' + r.debut + ' → ' + r.fin) + '">' + esc(r.clientNom) + '</div>';
    });
    (b.indispos || []).forEach(function (x) { if (x.debut < fin && x.fin > debut) { var a = Math.max(0, LE.ecart(debut, x.debut)), z = Math.min(nb, LE.ecart(debut, x.fin)); h += '<div class="sejour bloc" style="left:' + (a * largeur + 2) + 'px;width:' + ((z - a) * largeur - 4) + 'px">' + esc(x.motif) + '</div>'; } });
    h += '</div>';
  });
  h += '</div></div><div class="legende-cal"><span><i style="background:color-mix(in srgb, var(--ok) 40%, var(--surface-2))"></i>En cours</span><span><i style="background:color-mix(in srgb, var(--accent) 35%, var(--surface-2))"></i>Confirmée</span><span><i style="border:1px dashed var(--accent)"></i>Option</span><span><i style="background:var(--surface-3)"></i>Terminée</span><span><i style="background:var(--att-doux)"></i>Bloqué</span></div>';
  return h;
}
function journees() {
  var h = '', n = 0;
  for (var i = -1; i < 10; i++) {
    var j = LE.decaler(S.auj, i), e = evenementsDuJour(j);
    if (!e.length && i !== 0) continue;
    n++;
    h += '<div class="jour-bloc"><h3 class="' + (i === 0 ? 'auj' : '') + '">' + esc((i === 0 ? 'Aujourd’hui · ' : i === 1 ? 'Demain · ' : i === -1 ? 'Hier · ' : '') + dateLongue(j)) + '</h3>' + (e.length ? e.map(function (x) { return '<div class="evt" data-ouvrir="' + x.o + '"' + (x.fait ? ' style="opacity:.55"' : '') + '><div class="heure">' + esc(x.h || '—') + '</div><span class="pastille-ic ' + (x.ton || '') + '">' + ic(x.ic) + '</span><div class="corps"><div class="t1">' + esc(x.t) + '</div><div class="t2">' + esc(x.d) + '</div></div>' + (x.fait ? ic('ok', 'texte-3') : '') + '</div>'; }).join('') : '<div class="texte-3" style="font-size:14px;padding:6px 2px 4px">Rien de prévu.</div>') + '</div>';
  }
  return h;
}
function listeTaches() {
  var qui = S.filtreTaches || 'ouvertes', mesTaches = propre();
  var l = V(S.db.taches).filter(dansFiltre).filter(function (t) { return qui === 'ouvertes' ? (t.statut === 'a_faire' || t.statut === 'en_cours') : qui === 'avalider' ? t.statut === 'faite' : qui === 'miennes' ? t.assigneId === S.moi.id && t.statut !== 'validee' && t.statut !== 'annulee' : t.statut === 'validee'; });
  var h = '<div class="onglets" style="margin-bottom:14px">' + [['ouvertes', 'À faire'], ['avalider', 'À valider'], ['miennes', 'Les miennes'], ['validees', 'Validées']].filter(function (o) { return !mesTaches || o[0] !== 'miennes'; }).map(function (o) { return '<button data-act="filtreTaches" data-v="' + o[0] + '" class="' + (qui === o[0] ? 'actif' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>';
  l = trierPar(l, function (t) { return (t.priorite === 'urgente' ? 0 : t.priorite === 'haute' ? 1 : 2) + t.date; }, qui === 'validees');
  if (qui === 'validees') l = l.slice(0, 60);
  return h + '<div class="carte">' + (l.length ? '<div class="liste">' + l.map(ligneTache).join('') + '</div>' : vide('tache', 'Aucune tâche ici')) + '</div>';
}
function ligneTache(t) {
  var faits = (t.checklist || []).filter(function (x) { return x.ok; }).length, tot = (t.checklist || []).length, retard = t.date < S.auj && (t.statut === 'a_faire' || t.statut === 'en_cours');
  return '<div class="ligne cliquable" data-ouvrir="tache:' + t.id + '"><span class="pastille-ic ' + (TON.priorite[t.priorite] || TON.statutTache[t.statut]) + '">' + ic(t.type === 'menage' ? 'menage' : t.type === 'maintenance' ? 'outil' : t.type === 'accueil' ? 'arrivee' : 'tache') + '</span><div class="corps"><div class="t1">' + esc(t.titre) + '</div><div class="t2">'
    + esc(dateRel(t.date) + (t.heure ? ' · ' + t.heure : '') + (t.bienId ? ' · ' + nomDe('biens', t.bienId) : '') + ' · ' + (personne(t.assigneId) || 'non attribuée')) + (tot ? ' · ' + faits + '/' + tot : '') + '</div></div>' + (retard ? '<span class="badge urg">En retard</span>' : badge('statutTache', t.statut)) + '</div>';
}

/* ---------- espace collaborateur / prestataire */
function ecranMissions() {
  var taches = V(S.db.taches).filter(function (t) { return t.assigneId === S.moi.id && (t.statut === 'a_faire' || t.statut === 'en_cours' || t.statut === 'faite'); });
  var prest = V(S.db.prestations).filter(function (p) { return p.assigneId === S.moi.id && p.statut !== 'realisee' && p.statut !== 'annulee'; });
  var h = '<div class="bienvenue"><div><div class="surtitre">Mes missions</div><h1>' + bonjour() + ', ' + esc(prenom(S.moi.nom)) + '</h1><div class="date">' + esc(dateLongue(S.auj).replace(/^./, function (c) { return c.toUpperCase(); })) + (S.moi.expire ? ' · accès valable jusqu’au ' + dateCourte(S.moi.expire, true) : '') + '</div></div></div>';
  var auj = taches.filter(function (t) { return t.date <= S.auj; }), apres = taches.filter(function (t) { return t.date > S.auj; });
  h += '<div class="grille g-12"><div class="carte s7"><div class="carte-titre"><h2>Aujourd’hui</h2><span class="texte-3" style="font-size:13px">' + auj.length + ' tâche(s)</span></div>' + (auj.length ? '<div class="liste">' + trierPar(auj, function (t) { return t.heure || '99'; }).map(ligneTache).join('') + '</div>' : vide('ok', 'Tout est fait', 'Aucune tâche en attente pour aujourd’hui.')) + '</div>';
  h += '<div class="s5" style="display:flex;flex-direction:column;gap:16px">' + (prest.length ? '<div class="carte"><div class="carte-titre"><h2>Missions de conciergerie</h2></div>' + listePrestations(trierPar(prest, function (p) { return p.date + (p.heure || ''); })) + '</div>' : '')
    + '<div class="carte"><div class="carte-titre"><h2>À venir</h2></div>' + (apres.length ? '<div class="liste">' + trierPar(apres, function (t) { return t.date; }).map(ligneTache).join('') + '</div>' : vide('agenda', 'Rien de prévu ensuite')) + '</div></div></div>';
  return h;
}

/* ================================================================== FINANCE & ADMINISTRATION */
function ecranFinance() {
  if (!peut('finance')) return vide('acces', 'Accès réservé', 'Les finances ne font pas partie de vos habilitations.');
  var o = S.ongletFinance || 'synthese', ecr = peut('finance', 2);
  var actions = ecr ? '<button class="bt" data-act="nouvelleFacture">' + ic('facture') + '<span class="lib-long">Facture</span></button><button class="bt" data-act="nouvelleDepense">' + ic('depense') + '<span class="lib-long">Dépense</span></button><button class="bt principal-bt" data-act="encaissement">' + ic('ajout') + 'Encaissement</button>' : '';
  var h = entete('Finance & Administration', 'Finances', esc(nomPerimetre()) + ' · montants en FCFA', actions);
  h += '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px"><div class="onglets">' + [['synthese', 'Synthèse'], ['factures', 'Factures'], ['encaissements', 'Encaissements'], ['depenses', 'Dépenses'], ['comptes', 'Trésorerie']].map(function (t) { return '<button data-act="ongletFinance" data-v="' + t[0] + '" class="' + (o === t[0] ? 'actif' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' + (o === 'synthese' || o === 'comptes' ? ongletsPeriode() : '') + '</div>';
  var k = kpis(), p = periodeCourante();
  if (o === 'synthese') {
    h += '<div class="grille g4 kpis">' + [
      { cle: 'caFacture', lib: 'Facturé', val: montantHTML(k.caFacture.valeur), pied: esc(p.nom), vedette: true },
      { cle: 'caEncaisse', lib: 'Encaissé', val: montantHTML(k.caEncaisse.valeur), pied: k.caEncaisse.enAttente ? esc(fc(k.caEncaisse.enAttente)) + ' à confirmer' : 'Paiements confirmés' },
      { cle: 'charges', lib: 'Charges', val: montantHTML(k.charges.valeur), pied: esc(fc(k.charges.engagees)) + ' engagés non payés' },
      { cle: 'resultat', lib: 'Résultat estimé', val: montantHTML(k.resultat.valeur), pied: 'Facturé − charges' },
      { cle: 'creances', lib: 'Créances', val: montantHTML(k.creances.valeur), pied: k.retards.nombre + ' facture(s) en retard' },
      { cle: 'retards', lib: 'En retard', val: montantHTML(k.retards.valeur), pied: 'Échéance dépassée' },
      { cle: 'tresorerie', lib: 'Trésorerie', val: montantHTML(k.tresorerie.valeur), pied: k.tresorerie.comptes.length + ' compte(s)' },
      { cle: 'loyers', lib: 'Loyers gérés', val: montantHTML(k.loyers.appeles), pied: k.loyers.impayes ? '<span class="badge urg">' + esc(fc(k.loyers.impayes)) + ' impayés</span>' : 'Pour le compte des propriétaires' }
    ].map(kpiCarte).join('') + '</div>';
    var parCat = {}; k.charges.detail.forEach(function (id) { var x = S.db.depenses[id]; parCat[x.categorie] = (parCat[x.categorie] || 0) + x.montant; });
    h += '<div class="grille g-12 section"><div class="carte s6"><div class="carte-titre"><h2>Résultat par société</h2></div>' + barresH(k.parSociete.map(function (s) { return { nom: s.nom + (s.marge !== null ? ' · marge ' + pct(s.marge) : ''), valeur: s.resultat }; })) + '</div>'
      + '<div class="carte s6"><div class="carte-titre"><h2>Charges par catégorie</h2></div>' + barresH(Object.keys(parCat).sort(function (a, b) { return parCat[b] - parCat[a]; }).map(function (c) { return { nom: L.categorieDepense[c], valeur: parCat[c], couleur: 'var(--att)' }; })) + '</div></div>';
    var aConfirmer = k.caEncaisse.enAttenteIds.map(function (id) { return S.db.paiements[id]; });
    if (aConfirmer.length) h += '<div class="carte section"><div class="carte-titre"><h2>Paiements à confirmer</h2></div><p class="texte-2" style="margin:-6px 0 12px;font-size:13px">Ils ne sont comptés dans l’encaissé qu’après vérification (relevé bancaire, reçu Mobile Money, espèces comptées).</p>' + tablePaiements(aConfirmer) + '</div>';
    return h;
  }
  if (o === 'factures') {
    var et = S.filtreFact || 'ouvertes', fs = V(S.db.factures).filter(dansFiltre).filter(function (f) { var e = LE.etatFacture(S.db, f, S.auj); return et === 'toutes' ? true : et === 'ouvertes' ? (e === 'a_echoir' || e === 'partielle' || e === 'en_retard') : e === et; });
    return h + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div class="onglets">' + [['ouvertes', 'À encaisser'], ['en_retard', 'En retard'], ['payee', 'Réglées'], ['annulee', 'Annulées'], ['toutes', 'Toutes']].map(function (x) { return '<button data-act="filtreFact" data-v="' + x[0] + '" class="' + (et === x[0] ? 'actif' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><button class="bt petit" data-act="exportFactures">' + ic('export') + 'Exporter</button></div><div class="carte">' + tableFactures(fs) + '</div>';
  }
  if (o === 'encaissements') {
    var ps = V(S.db.paiements).filter(function (x) { var f = S.db.factures[x.factureId]; return f && dansFiltre(f) && x.date >= p.debut && x.date <= p.fin; });
    return h + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px">' + ongletsPeriode() + '<button class="bt petit" data-act="exportPaiements">' + ic('export') + 'Exporter</button></div><div class="carte">' + tablePaiements(ps) + '</div>';
  }
  if (o === 'depenses') {
    var ds = V(S.db.depenses).filter(dansFiltre).filter(function (x) { return (x.date >= p.debut && x.date <= p.fin) || x.statut === 'engagee'; });
    return h + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px">' + ongletsPeriode() + '<button class="bt petit" data-act="exportDepenses">' + ic('export') + 'Exporter</button></div><div class="kpi-pied" style="margin:-4px 0 12px">Dépenses de la période, et toutes celles engagées non payées.</div><div class="carte">' + tableDepenses(ds) + '</div>';
  }
  return h + '<div class="carte"><div class="carte-titre"><h2>Comptes de trésorerie</h2>' + (ecr ? '<button class="lien" data-act="nouveauCompte">Ajouter un compte</button>' : '') + '</div>' + tableComptes(k) + '</div>';
}

/* ================================================================== CONCIERGERIE */
function ecranConciergerie() {
  var o = S.ongletConc || 'avenir', l = V(S.db.prestations).filter(dansFiltre);
  var f = { avenir: function (p) { return p.statut !== 'realisee' && p.statut !== 'annulee'; }, realisees: function (p) { return p.statut === 'realisee'; }, annulees: function (p) { return p.statut === 'annulee'; } }[o];
  l = trierPar(l.filter(f), function (p) { return p.date + (p.heure || ''); }, o !== 'avenir');
  var h = entete('Private Concierge', 'Conciergerie', 'Demandes VIP, agenda opérationnel et qualité de service', btAjout('nouvellePrestation', 'Nouvelle demande', 'conciergerie'));
  h += '<div class="onglets" style="margin-bottom:18px">' + [['avenir', 'Agenda à venir'], ['realisees', 'Réalisées'], ['annulees', 'Annulées']].map(function (t) { return '<button data-act="ongletConc" data-v="' + t[0] + '" class="' + (o === t[0] ? 'actif' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (o === 'realisees' && peut('finance')) {
    var marge = LE.somme(l, function (p) { return (p.prix || 0) - (p.cout || 0); }), ca = LE.somme(l, function (p) { return p.prix || 0; }), notes = l.filter(function (p) { return p.satisfaction; });
    h += '<div class="grille g3 kpis" style="margin-bottom:16px"><div class="carte kpi"><div class="kpi-lib">Prestations réalisées</div><div class="kpi-val">' + l.length + '</div></div><div class="carte kpi"><div class="kpi-lib">Marge cumulée</div><div class="kpi-val">' + montantHTML(marge) + '</div><div class="kpi-pied">' + (ca ? pct(marge / ca) + ' du prix' : '') + '</div></div><div class="carte kpi"><div class="kpi-lib">Satisfaction</div><div class="kpi-val">' + (notes.length ? (LE.somme(notes, function (p) { return p.satisfaction; }) / notes.length).toFixed(1).replace('.', ',') + '<small>/ 5</small>' : '—') + '</div></div></div>';
  }
  if (!l.length) return h + vide('conciergerie', 'Aucune prestation', 'Les demandes de vos clients apparaîtront ici.', btAjout('nouvellePrestation', 'Nouvelle demande', 'conciergerie'));
  if (o === 'avenir') {
    var parJour = {}; l.forEach(function (p) { (parJour[p.date] = parJour[p.date] || []).push(p); });
    return h + Object.keys(parJour).sort().map(function (j) { return '<div class="jour-bloc"><h3 class="' + (j === S.auj ? 'auj' : '') + '">' + esc((j < S.auj ? 'En retard · ' : '') + dateLongue(j)) + '</h3>' + parJour[j].map(function (p) { return '<div class="evt" data-ouvrir="prestation:' + p.id + '"><div class="heure">' + esc(p.heure || '—') + '</div><span class="pastille-ic ' + (p.priorite === 'urgente' ? 'urg' : p.priorite === 'haute' ? 'att' : 'or') + '">' + ic('conciergerie') + '</span><div class="corps"><div class="t1">' + esc(p.libelle) + '</div><div class="t2">' + esc((p.clientNom || '') + ' · ' + (personne(p.assigneId) || 'à attribuer')) + '</div></div>' + badge('statutPrestation', p.statut) + '</div>'; }).join('') + '</div>'; }).join('');
  }
  return h + '<div class="carte">' + listePrestations(l.slice(0, 80)) + '</div>';
}

/* ================================================================== PROJETS */
function ecranProjets() {
  var l = trierPar(V(S.db.projets).filter(dansFiltre), function (p) { return (p.statut === 'en_cours' ? '0' : '1') + (p.finPrevue || ''); });
  var h = entete('Projects & Renovation · Interior Studio', 'Projets', 'Chantiers, rénovations et décoration', btAjout('nouveauProjet', 'Nouveau projet', 'projets'));
  if (!l.length) return h + vide('projets', 'Aucun projet', 'Créez un chantier pour suivre budget, jalons et marge.', btAjout('nouveauProjet', 'Nouveau projet', 'projets'));
  return h + '<div class="grille g3">' + l.map(function (p) {
    var av = LE.avancementProjet(p), fin = peut('finance'), c = fin ? LE.coutsProjet(S.db, p) : null, ratio = c && p.budget ? c.engage / p.budget : null, retard = p.statut === 'en_cours' && p.finPrevue && p.finPrevue < S.auj;
    return '<div class="carte cliquable" data-go="projet/' + p.id + '"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div class="surtitre" style="margin:0">' + esc(L.typeProjet[p.type]) + '</div>' + (retard ? '<span class="badge urg">En retard</span>' : badge('statutProjet', p.statut)) + '</div>'
      + '<h3 style="font-family:var(--serif);font-weight:400;font-size:21px;margin:10px 0 4px;line-height:1.2">' + esc(p.nom) + '</h3><div class="texte-3" style="font-size:13px">' + esc([p.lieu, nomDe('tiers', p.clientId)].filter(Boolean).join(' · ') || nomDe('branches', p.branchId)) + '</div>'
      + '<div style="margin-top:18px"><div class="kpi-lib" style="margin-bottom:8px"><span>Avancement</span><span>' + av + ' %</span></div><div class="prog"><i style="width:' + av + '%"></i></div></div>'
      + (ratio !== null ? '<div style="margin-top:14px"><div class="kpi-lib" style="margin-bottom:8px"><span>Budget engagé</span><span class="' + (ratio > 1 ? 'baisse' : '') + '">' + Math.round(ratio * 100) + ' %</span></div><div class="prog ' + (ratio > 1 ? 'urg' : ratio > 0.9 ? 'att' : 'ok') + '"><i style="width:' + Math.min(100, ratio * 100) + '%"></i></div><div class="kpi-pied" style="margin-top:8px">' + esc(fc(c.engage)) + ' sur ' + esc(fc(p.budget)) + '</div></div>' : '')
      + '<div class="kpi-pied" style="margin-top:12px">' + (p.finPrevue ? 'Livraison prévue ' + dateCourte(p.finPrevue, true) : '') + '</div></div>';
  }).join('') + '</div>';
}
function ecranProjet(id) {
  var p = S.db.projets[id]; if (!p) return vide('projets', 'Projet introuvable');
  var ecr = peut('projets', 2), fin = peut('finance'), av = LE.avancementProjet(p), c = fin ? LE.coutsProjet(S.db, p) : null, rev = fin ? LE.revenusProjet(S.db, p) : 0;
  var h = '<button class="retour" data-go="projets">' + ic('retour') + 'Projets</button>';
  h += entete(L.typeProjet[p.type] + ' · ' + nomDe('branches', p.branchId), p.nom, esc([p.lieu, nomDe('tiers', p.clientId)].filter(Boolean).join(' · ')), ecr ? '<button class="bt" data-act="modifierProjet" data-id="' + id + '">Modifier</button>' + (fin && peut('finance', 2) ? '<button class="bt" data-act="nouvelleDepense" data-projet="' + id + '">' + ic('depense') + 'Dépense</button><button class="bt principal-bt" data-act="nouvelleFacture" data-projet="' + id + '">' + ic('facture') + 'Facturer</button>' : '') : '');
  h += '<div class="grille g4 kpis"><div class="carte kpi"><div class="kpi-lib">Avancement</div><div class="kpi-val">' + av + '<small>%</small></div><div class="prog"><i style="width:' + av + '%"></i></div><div class="kpi-pied">Jalons pondérés</div></div>';
  if (fin) {
    var ecart = p.budget ? c.engage - p.budget : 0;
    h += '<div class="carte kpi"><div class="kpi-lib">Budget prévisionnel</div><div class="kpi-val">' + montantHTML(p.budget) + '</div><div class="kpi-pied">' + (ecart > 0 ? '<span class="badge urg">Dépassement ' + esc(fc(ecart)) + '</span>' : 'Reste ' + esc(fc(-ecart))) + '</div></div>'
      + '<div class="carte kpi"><div class="kpi-lib">Dépenses engagées</div><div class="kpi-val">' + montantHTML(c.engage) + '</div><div class="kpi-pied">dont payées ' + esc(fc(c.paye)) + '</div></div>'
      + '<div class="carte kpi vedette"><div class="kpi-lib">Marge à date</div><div class="kpi-val ' + (rev - c.engage < 0 ? 'baisse' : '') + '">' + montantHTML(rev - c.engage) + '</div><div class="kpi-pied">Facturé ' + esc(fc(rev)) + ' − coûts</div></div>';
  } else h += '<div class="carte kpi"><div class="kpi-lib">Livraison prévue</div><div class="kpi-val" style="font-size:22px">' + dateCourte(p.finPrevue, true) + '</div></div>';
  h += '</div><div class="grille g-12 section"><div class="carte s6"><div class="carte-titre"><h2>Jalons</h2></div>' + ((p.jalons || []).length ? '<div class="liste">' + p.jalons.map(function (j, i) {
    var retard = !j.fait && j.date && j.date < S.auj;
    return '<label class="ligne" style="cursor:' + (ecr ? 'pointer' : 'default') + '"><input type="checkbox" ' + (j.fait ? 'checked' : '') + (ecr ? ' data-act="jalon" data-id="' + id + '" data-i="' + i + '"' : ' disabled') + '><div class="corps"><div class="t1" style="' + (j.fait ? 'text-decoration:line-through;opacity:.6' : '') + '">' + esc(j.nom) + '</div><div class="t2">' + (j.date ? 'Prévu ' + dateCourte(j.date) : '') + (j.fait && j.faitLe ? ' · fait le ' + dateCourte(j.faitLe) : '') + ' · poids ' + j.poids + '</div></div>' + (retard ? '<span class="badge urg">Dépassé</span>' : '') + '</label>';
  }).join('') + '</div>' : vide('projets', 'Aucun jalon')) + '</div>';
  if (fin) h += '<div class="carte s6"><div class="carte-titre"><h2>Dépenses et achats</h2></div>' + tableDepenses(V(S.db.depenses).filter(function (x) { return x.projetId === id && x.statut !== 'annulee'; })) + '</div><div class="carte s12"><div class="carte-titre"><h2>Facturation</h2></div>' + tableFactures(V(S.db.factures).filter(function (f) { return f.objetType === 'projet' && f.objetId === id; })) + '</div>';
  if (p.description) h += '<div class="carte s12"><div class="carte-titre"><h2>Brief</h2></div><p style="margin:0" class="texte-2">' + esc(p.description) + '</p></div>';
  return h + '</div>';
}

/* ================================================================== CONTACTS (CRM) */
function ecranContacts() {
  var o = S.ongletContacts || 'client', q = (S.rechContacts || '').toLowerCase();
  var tous = V(S.db.tiers).filter(function (t) { return !S.filtre.societeId || !t.societeId || t.societeId === S.filtre.societeId; });
  var l = trierPar(tous.filter(function (t) { return (o === 'tous' || t.type === o || (o === 'client' && t.type === 'prospect')) && (!q || (t.nom + ' ' + (t.telephone || '') + ' ' + (t.email || '')).toLowerCase().indexOf(q) >= 0); }), function (t) { return (t.segment === 'vip' ? 0 : t.segment === 'premium' ? 1 : 2) + t.nom; });
  var h = entete('CRM & Relations clients', 'Contacts', tous.length + ' contact(s)', peut('tiers', 2) || peut('reservations', 2) ? '<button class="bt principal-bt" data-act="nouveauContact">' + ic('ajout') + 'Nouveau contact</button>' : '');
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px"><div class="onglets">' + [['client', 'Clients'], ['proprietaire', 'Propriétaires'], ['prestataire', 'Prestataires'], ['fournisseur', 'Fournisseurs'], ['partenaire', 'Partenaires'], ['tous', 'Tous']].map(function (t) { return '<button data-act="ongletContacts" data-v="' + t[0] + '" class="' + (o === t[0] ? 'actif' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><input type="search" placeholder="Rechercher un contact" value="' + esc(S.rechContacts || '') + '" data-rech-contacts style="max-width:280px;height:40px"></div>';
  return h + '<div class="carte">' + (l.length ? '<div class="liste">' + l.map(function (t) {
    return '<div class="ligne cliquable" data-go="contact/' + t.id + '"><span class="avatar">' + esc(initiales(t.nom)) + '</span><div class="corps"><div class="t1">' + esc(t.nom) + '</div><div class="t2">' + esc([L.typeTiers[t.type], t.telephone, t.ville].filter(Boolean).join(' · ')) + '</div></div>' + (t.segment && t.segment !== 'standard' ? '<span class="badge or">' + esc(L.segment[t.segment]) + '</span>' : '') + '</div>';
  }).join('') + '</div>' : vide('contacts', 'Aucun contact', q ? 'Aucun résultat pour cette recherche.' : '')) + '</div>';
}
function ecranContact(id) {
  var t = S.db.tiers[id]; if (!t) return vide('contacts', 'Contact introuvable');
  var sej = V(S.db.reservations).filter(function (r) { return r.clientId === id; }), pr = V(S.db.prestations).filter(function (p) { return p.clientId === id; }), fa = V(S.db.factures).filter(function (f) { return f.tiersId === id; }), biens = V(S.db.biens).filter(function (b) { return b.proprietaireId === id; });
  var h = '<button class="retour" data-go="contacts">' + ic('retour') + 'Contacts</button>';
  h += entete(L.typeTiers[t.type] + (t.segment ? ' · ' + L.segment[t.segment] : ''), t.nom, esc([t.telephone, t.email, t.ville].filter(Boolean).join(' · ')), peut('tiers', 2) ? '<button class="bt" data-act="modifierContact" data-id="' + id + '">Modifier</button><button class="bt" data-act="noteContact" data-id="' + id + '">Ajouter une note</button>' + (t.type === 'client' && peut('reservations', 2) ? '<button class="bt principal-bt" data-act="nouvelleReservation" data-client="' + id + '">Réserver</button>' : '') : '');
  h += '<div class="grille g-12"><div class="s5" style="display:flex;flex-direction:column;gap:16px">';
  if (t.preferences) h += '<div class="carte"><div class="carte-titre"><h2>Préférences communiquées</h2></div><p style="margin:0">' + esc(t.preferences) + '</p></div>';
  if (t.notes) h += '<div class="carte"><div class="carte-titre"><h2>Notes</h2></div><p style="margin:0" class="texte-2">' + esc(t.notes) + '</p></div>';
  h += '<div class="carte"><div class="carte-titre"><h2>Historique</h2></div>' + ((t.historique || []).length ? '<div class="liste">' + t.historique.slice().reverse().map(function (x) { return '<div class="ligne"><div class="corps"><div class="t1" style="white-space:normal">' + esc(x.texte) + '</div><div class="t2">' + dateCourte(x.date) + ' · ' + esc(personne(x.par)) + '</div></div></div>'; }).join('') + '</div>' : vide('journal', 'Aucune interaction notée')) + '</div>';
  if (t.canal) h += '<div class="carte"><div class="carte-titre"><h2>Préférence de contact</h2></div>' + esc(t.canal) + '</div>';
  h += '</div><div class="s7" style="display:flex;flex-direction:column;gap:16px">';
  if (biens.length) h += '<div class="carte"><div class="carte-titre"><h2>Biens confiés</h2></div><div class="liste">' + biens.map(function (b) { return '<div class="ligne cliquable" data-go="bien/' + b.id + '"><span class="pastille-ic">' + ic('biens') + '</span><div class="corps"><div class="t1">' + esc(b.nom) + '</div><div class="t2">' + esc(b.quartier || '') + '</div></div></div>'; }).join('') + '</div></div>';
  if (sej.length) h += '<div class="carte"><div class="carte-titre"><h2>Séjours</h2></div>' + tableReservations(trierPar(sej, function (r) { return r.debut; }, true)) + '</div>';
  if (pr.length) h += '<div class="carte"><div class="carte-titre"><h2>Prestations</h2></div>' + listePrestations(trierPar(pr, function (p) { return p.date; }, true)) + '</div>';
  if (fa.length && peut('finance')) h += '<div class="carte"><div class="carte-titre"><h2>Factures</h2></div>' + tableFactures(fa) + '</div>';
  return h + '</div></div>';
}

/* ================================================================== RAPPORTS */
function ecranRapports() {
  var k = kpis(), p = periodeCourante(), al = alertesCourantes(), fin = peut('finance');
  var h = entete('Rapport de direction', 'Rapports', esc(nomPerimetre() + ' · ' + p.nom), '<button class="bt" data-act="imprimer">' + ic('imprimer') + 'Imprimer ou PDF</button>');
  h += '<div class="pas-imprimer" style="margin-bottom:18px">' + ongletsPeriode() + '</div>';
  h += '<article class="rapport"><div class="entete-rap"><div><div class="surtitre">Loft Eleven · Private Office</div><h1>Rapport de direction</h1><div class="texte-2">' + esc(nomPerimetre()) + ' · ' + esc(p.nom) + ' (' + dateCourte(p.debut, true) + ' → ' + dateCourte(p.fin, true) + ')</div></div><div class="texte-3" style="font-size:12px;text-align:right">Établi le ' + esc(dateLongue(S.auj)) + '<br>par ' + esc(S.moi.nom) + (API.demo ? '<br><b>Démonstration · données fictives</b>' : '') + '</div></div>';
  h += '<h2>Synthèse</h2><div class="grille g4 kpis">' + (fin ? [['Facturé', k.caFacture.valeur], ['Encaissé', k.caEncaisse.valeur], ['Charges', k.charges.valeur], ['Résultat estimé', k.resultat.valeur]].map(function (x) { return '<div class="carte kpi" style="min-height:0"><div class="kpi-lib">' + x[0] + '</div><div class="kpi-val" style="font-size:22px">' + montantHTML(x[1]) + '</div></div>'; }).join('') : '')
    + '<div class="carte kpi" style="min-height:0"><div class="kpi-lib">Occupation</div><div class="kpi-val" style="font-size:22px">' + pct(k.occupation.valeur, 1) + '</div></div>' + (fin ? '<div class="carte kpi" style="min-height:0"><div class="kpi-lib">Créances</div><div class="kpi-val" style="font-size:22px">' + montantHTML(k.creances.valeur) + '</div></div><div class="carte kpi" style="min-height:0"><div class="kpi-lib">Dont en retard</div><div class="kpi-val" style="font-size:22px">' + montantHTML(k.retards.valeur) + '</div></div><div class="carte kpi" style="min-height:0"><div class="kpi-lib">Trésorerie</div><div class="kpi-val" style="font-size:22px">' + montantHTML(k.tresorerie.valeur) + '</div></div>' : '') + '</div>';
  h += '<p class="texte-2" style="font-size:14px;margin-top:18px">' + esc(phraseSynthese(k, p)) + '</p>';
  if (fin) {
    h += '<h2>Performances par société et par activité</h2>' + tableParActivite(k);
    h += '<div class="tableau-env mobile-cartes" style="margin-top:18px"><table class="tab"><thead><tr><th>Société</th><th class="num">Facturé</th><th class="num mx">Charges</th><th class="num mx">Résultat</th><th class="num mx">Marge</th></tr></thead><tbody>' + k.parSociete.map(function (s) { return '<tr><td class="m1">' + esc(s.nom) + '</td><td class="num">' + fc(s.ca) + '</td><td class="num mx">' + fc(s.charges) + '</td><td class="num mx">' + fc(s.resultat) + '</td><td class="num mx">' + pct(s.marge) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<h2>Classement des biens</h2><div class="tableau-env mobile-cartes"><table class="tab"><thead><tr><th>Bien</th><th class="num mx">Revenus</th><th class="num mx">Charges</th><th class="num">Résultat</th><th class="num mx">Occupation</th></tr></thead><tbody>' + k.rentabilite.map(function (b) { return '<tr><td class="m1">' + esc(b.nom) + '</td><td class="num mx">' + fc(b.revenus) + '</td><td class="num mx">' + fc(b.charges) + '</td><td class="num ' + (b.resultat < 0 ? 'baisse' : '') + '">' + fc(b.resultat) + '</td><td class="num mx">' + (b.occupation === null ? '—' : pct(b.occupation)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  h += '<h2>Alertes en cours</h2>' + (al.length ? '<div class="liste">' + al.filter(function (a) { return a.niveau !== 'info'; }).slice(0, 14).map(function (a) { return '<div class="ligne"><span class="badge ' + (a.niveau === 'urgent' ? 'urg' : 'att') + '">' + (a.niveau === 'urgent' ? 'Urgent' : 'À suivre') + '</span><div class="corps"><div class="t1" style="white-space:normal">' + esc(a.titre) + '</div><div class="t2" style="white-space:normal">' + esc(a.detail) + '</div></div></div>'; }).join('') + '</div>' : '<p class="texte-2">Aucune alerte.</p>');
  h += '<h2>Décisions à prendre</h2>' + decisions(k, al).map(function (d, i) { return '<div class="decision"><div class="num">' + (i + 1) + '</div><div><b style="font-weight:500">' + esc(d[0]) + '</b><div class="texte-2" style="font-size:14px">' + esc(d[1]) + '</div></div></div>'; }).join('');
  h += '<p class="texte-3" style="font-size:11.5px;margin-top:30px">Indicateurs de gestion calculés à partir des données saisies. Le résultat estimé n’est pas un résultat comptable ; les règles fiscales ne sont pas présumées. Les flux internes au groupe sont neutralisés en vue consolidée.</p></article>';
  if (fin) h += '<div class="carte section pas-imprimer"><div class="carte-titre"><h2>Exports pour le comptable</h2></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="bt" data-act="exportFactures">' + ic('export') + 'Factures</button><button class="bt" data-act="exportPaiements">' + ic('export') + 'Encaissements</button><button class="bt" data-act="exportDepenses">' + ic('export') + 'Dépenses</button><button class="bt" data-act="exportResa">' + ic('export') + 'Réservations</button></div><p class="texte-3" style="font-size:13px;margin:12px 0 0">Fichiers CSV (séparateur point-virgule) qui s’ouvrent directement dans Excel. Le rapport s’enregistre en PDF depuis « Imprimer ».</p></div>';
  return h;
}
function phraseSynthese(k, p) {
  var t = [];
  if (peut('finance')) {
    t.push('Sur la période, le groupe a facturé ' + fc(k.caFacture.valeur) + ' et encaissé ' + fc(k.caEncaisse.valeur) + ' de paiements confirmés.');
    t.push('Les charges s’élèvent à ' + fc(k.charges.valeur) + ', pour un résultat estimé de ' + fc(k.resultat.valeur) + '.');
    if (k.retards.nombre) t.push(k.retards.nombre + ' facture(s) dépassent leur échéance, pour ' + fc(k.retards.valeur) + '.');
  }
  if (k.occupation.valeur !== null) t.push('Les résidences affichent un taux d’occupation de ' + pct(k.occupation.valeur, 1) + '.');
  var best = k.rentabilite[0]; if (best && best.resultat > 0 && peut('finance')) t.push(best.nom + ' est le bien le plus rentable (' + fc(best.resultat) + ').');
  return t.join(' ');
}
function decisions(k, al) {
  var d = [];
  if (k.retards && k.retards.nombre) d.push(['Relancer les factures en retard', k.retards.nombre + ' facture(s), ' + fc(k.retards.valeur) + ' à recouvrer.']);
  if (k.loyers && k.loyers.impayes) d.push(['Traiter les loyers impayés', fc(k.loyers.impayes) + ' dus aux propriétaires : relance du locataire et information du propriétaire.']);
  k.projets.depassements.forEach(function (id) { var p = S.db.projets[id]; d.push(['Arbitrer le dépassement · ' + p.nom, 'Valider le surcoût ou réduire le périmètre des travaux.']); });
  al.filter(function (a) { return a.type === 'retard' && a.titre.indexOf('Chantier') === 0; }).forEach(function (a) { d.push(['Fixer une nouvelle date de livraison', a.titre.replace('Chantier en retard · ', '') + ' · ' + a.detail]); });
  if (k.caEncaisse && k.caEncaisse.enAttente) d.push(['Faire confirmer les paiements en attente', fc(k.caEncaisse.enAttente) + ' déclarés mais pas encore vérifiés.']);
  if (k.occupation.valeur !== null && k.occupation.valeur < 0.55) d.push(['Relancer la commercialisation', 'Occupation sous 55 % : revoir tarifs, visibilité et partenariats.']);
  var faible = (k.rentabilite || []).filter(function (b) { return b.occupation !== null && b.occupation < 0.45; })[0];
  if (faible) d.push(['Examiner ' + faible.nom, 'Occupation de ' + pct(faible.occupation) + ' : tarif, photos et disponibilité à revoir.']);
  if (!d.length) d.push(['Aucune décision urgente', 'Les indicateurs sont dans les tolérances habituelles.']);
  return d.slice(0, 6);
}

/* ================================================================== ACCÈS, JOURNAL */
function ecranAcces() {
  if (!peut('acces')) return vide('acces', 'Accès réservé', 'La gestion des accès revient à la direction.');
  var o = S.ongletAcces || 'utilisateurs', ecr = peut('acces', 2);
  var h = entete('Utilisateurs, droits et confidentialité', 'Accès', 'Chaque personne ne voit que les sociétés, activités et modules qui lui sont confiés.', ecr ? (o === 'structure' ? '<button class="bt" data-act="nouvelleBranche">Nouvelle branche</button><button class="bt principal-bt" data-act="nouvelleSociete">' + ic('ajout') + 'Nouvelle société</button>' : '<button class="bt principal-bt" data-act="nouvelUtilisateur">' + ic('ajout') + 'Nouvel accès</button>') : '');
  h += '<div class="onglets" style="margin-bottom:18px">' + [['utilisateurs', 'Personnes'], ['structure', 'Sociétés et branches'], ['roles', 'Rôles']].map(function (t) { return '<button data-act="ongletAcces" data-v="' + t[0] + '" class="' + (o === t[0] ? 'actif' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  if (o === 'structure') {
    return h + '<div class="grille g3">' + V(S.db.societes).map(function (s) {
      var br = V(S.db.branches).filter(function (b) { return b.societeId === s.id; });
      return '<div class="carte"><div class="surtitre">' + esc(s.forme || 'Société') + (s.initiales ? ' · ' + esc(s.initiales) : '') + '</div><h3 style="font-family:var(--serif);font-weight:400;font-size:22px;margin:0 0 4px">' + esc(s.nom) + '</h3><div class="texte-3" style="font-size:13px">' + esc(s.activite || '') + '</div><div class="liste" style="margin-top:14px">' + br.map(function (b) { return '<div class="ligne"><span class="pastille-ic or">' + ic(b.type === 'residences' ? 'biens' : b.type === 'conciergerie' ? 'conciergerie' : b.type === 'patrimoine' ? 'banque' : b.type === 'decoration' ? 'studio' : 'projets') + '</span><div class="corps"><div class="t1">' + esc(b.nom) + '</div><div class="t2">' + esc(L.typeBranche[b.type]) + '</div></div></div>'; }).join('') + '</div>' + (ecr ? '<div style="margin-top:12px;display:flex;gap:8px"><button class="bt petit" data-act="modifierSociete" data-id="' + s.id + '">Modifier</button><button class="bt petit" data-act="nouvelleBranche" data-id="' + s.id + '">Ajouter une branche</button></div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  if (o === 'roles') {
    var M = { tableau: 'Tableau de bord', biens: 'Biens', reservations: 'Réservations', finance: 'Finances', agenda: 'Agenda et tâches', conciergerie: 'Conciergerie', projets: 'Projets', tiers: 'Contacts', acces: 'Accès', journal: 'Journal', rapports: 'Rapports' };
    return h + '<div class="carte"><div class="tableau-env"><table class="tab"><thead><tr><th>Module</th>' + Object.keys(LE.ROLES).map(function (r) { return '<th style="text-align:center">' + esc(LE.ROLES[r].nom) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + LE.MODULES.map(function (m) { return '<tr><td>' + M[m] + '</td>' + Object.keys(LE.ROLES).map(function (r) { var n = LE.ROLES[r].m[m] || 0; return '<td style="text-align:center" class="' + (n === 2 ? 'or' : n === 1 ? 'texte-2' : 'texte-3') + '">' + ['—', 'Lecture', 'Écriture'][n] + '</td>'; }).join('') + '</tr>'; }).join('')
      + '</tbody></table></div><p class="texte-3" style="font-size:13px;margin:14px 0 0">Le périmètre (sociétés, branches) s’ajoute au rôle. Les collaborateurs et prestataires ne voient que les tâches et missions qui leur sont confiées. La double authentification est exigée pour la direction, les responsables de société et la comptabilité. Tous les contrôles sont refaits par le serveur.</p></div>';
  }
  var us = trierPar(V(S.db.utilisateurs), function (u) { return (u.actif ? '0' : '1') + u.nom; });
  return h + '<div class="carte"><div class="liste">' + us.map(function (u) {
    var per = !u.perimetre ? '' : u.perimetre.societes.indexOf('*') >= 0 ? 'Tout le groupe' : u.perimetre.societes.map(function (s) { return nomDe('societes', s); }).join(', ');
    if (u.perimetre && u.perimetre.branches && u.perimetre.branches.length) per += ' · ' + u.perimetre.branches.map(function (b) { return nomDe('branches', b); }).join(', ');
    var exp = u.expire && u.expire < S.auj;
    return '<div class="ligne' + (ecr ? ' cliquable' : '') + '"' + (ecr ? ' data-act="modifierUtilisateur" data-id="' + u.id + '"' : '') + ' style="' + (u.actif ? '' : 'opacity:.5') + '"><span class="avatar">' + esc(initiales(u.nom)) + '</span><div class="corps"><div class="t1">' + esc(u.nom) + (u.id === S.moi.id ? ' <span class="texte-3">(vous)</span>' : '') + '</div><div class="t2">' + esc([LE.ROLES[u.role].nom, u.fonction, per].filter(Boolean).join(' · ')) + '</div></div>'
      + (!u.actif ? '<span class="badge">Révoqué</span>' : exp ? '<span class="badge urg">Expiré</span>' : u.expire ? '<span class="badge att">Jusqu’au ' + dateCourte(u.expire) + '</span>' : '<span class="badge ok">Actif</span>') + '</div>';
  }).join('') + '</div></div>';
}
function ecranJournal() {
  if (!peut('journal')) return vide('acces', 'Accès réservé');
  var l = trierPar(V(S.db.journal), function (j) { return j.quand; }, true).slice(0, 300);
  var h = entete('Traçabilité', 'Journal d’audit', 'Chaque modification est enregistrée avec son auteur, sa date et son objet. Le journal ne peut pas être modifié.');
  return h + '<div class="carte">' + (l.length ? '<div class="liste">' + l.map(function (j) { return '<div class="ligne"><span class="avatar" style="width:32px;height:32px;font-size:11px">' + esc(initiales(j.parNom)) + '</span><div class="corps"><div class="t1">' + esc(j.libelle) + (j.objet ? ' · <span class="texte-2">' + esc(j.objet) + '</span>' : '') + '</div><div class="t2">' + esc(j.parNom) + ' · ' + dateCourte(j.quand.slice(0, 10)) + ' à ' + heureDe(j.quand) + (j.societeId ? ' · ' + nomDe('societes', j.societeId) : '') + '</div></div></div>'; }).join('') + '</div>'
    : vide('journal', 'Journal vide', API.demo ? 'Les données de démonstration ont été chargées directement. Chaque opération que vous ferez apparaîtra ici.' : 'Aucune opération pour le moment.')) + '</div>';
}

/* ================================================================== RÉGLAGES, PLUS, À PROPOS */
function interrupteur(act, on, lib) { return '<button class="interrupteur' + (on ? ' on' : '') + '" role="switch" aria-checked="' + !!on + '" aria-label="' + esc(lib) + '" data-act="' + act + '"></button>'; }
function ecranReglages() {
  var h = entete('Préférences de cet appareil', 'Réglages', '');
  h += '<div class="grille g2"><div class="carte"><div class="carte-titre"><h2>Identité sonore</h2></div>'
    + '<div class="reglage"><span class="pastille-ic or">' + ic('son') + '</span><div class="corps"><div>Sons de navigation</div><div class="t2">Ouverture d’un module, validation, notification, finalisation</div></div>' + interrupteur('prefSons', S.prefs.sons, 'Sons de navigation') + '</div>'
    + '<div class="reglage"><span class="pastille-ic or">' + ic('musique') + '</span><div class="corps"><div>Ambiance Loft Eleven</div><div class="t2">Mélodie instrumentale discrète pendant la navigation</div></div>' + interrupteur('prefAmbiance', S.prefs.ambiance, 'Ambiance musicale') + '</div>'
    + '<div class="reglage"><span class="pastille-ic">' + ic('son') + '</span><div class="corps"><div>Volume</div><input type="range" min="0" max="1" step="0.05" value="' + S.prefs.volume + '" data-volume aria-label="Volume"></div></div>'
    + '<div class="reglage"><span class="pastille-ic">' + ic('etoile') + '</span><div class="corps"><div>Signature d’accueil</div><div class="t2">Écouter la signature sonore de Loft Eleven</div></div><button class="bt petit" data-act="ecouterSignature">Écouter</button></div></div>';
  h += '<div class="carte"><div class="carte-titre"><h2>Couleurs</h2></div><div class="palettes">' + Object.keys(PALETTES).map(function (k) { var p = PALETTES[k]; return '<button class="palette' + (S.prefs.palette === k ? ' choisie' : '') + '" data-act="prefPalette" data-v="' + k + '" aria-pressed="' + (S.prefs.palette === k) + '"><span class="pastilles">' + p.couleurs.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span><span>' + esc(p.nom) + '<br><small>' + esc(p.sous) + '</small></span></button>'; }).join('') + '</div>'
    + '<div class="reglage"><span class="pastille-ic">' + ic(S.prefs.theme === 'sombre' ? 'lune' : 'soleil') + '</span><div class="corps"><div>Mode sombre</div><div class="t2">L’affichage clair est l’affichage principal</div></div>' + interrupteur('prefTheme', S.prefs.theme === 'sombre', 'Mode sombre') + '</div>'
    + '<div class="reglage masque-mobile"><span class="pastille-ic">' + ic('panneau') + '</span><div class="corps"><div>Barre latérale réduite</div></div>' + interrupteur('prefBarre', S.prefs.barre === 'mini', 'Barre réduite') + '</div>'
    + (!API.demo ? '<div class="reglage"><span class="pastille-ic">' + ic('horloge') + '</span><div class="corps"><div>Ouverture rapide sur cet appareil</div><div class="t2">Garde la dernière situation pour l’afficher sans attendre. À n’activer que sur un appareil personnel.</div></div>' + interrupteur('prefGarder', S.prefs.garder, 'Ouverture rapide') + '</div>' : '')
    + '<div class="reglage"><span class="pastille-ic">' + ic('installer') + '</span><div class="corps"><div>Installer l’application</div><div class="t2" data-installer-aide>Sur iPhone : Partager › « Sur l’écran d’accueil ». Sur Android : menu › « Installer l’application ».</div></div><button class="bt petit cache" data-act="installer">Installer</button></div></div>';
  h += '<div class="carte"><div class="carte-titre"><h2>Mon compte</h2></div><div class="reglage"><span class="avatar">' + esc(initiales(S.moi.nom)) + '</span><div class="corps"><div>' + esc(S.moi.nom) + '</div><div class="t2">' + esc(LE.ROLES[S.moi.role].nom + (S.moi.fonction ? ' · ' + S.moi.fonction : '')) + '</div></div></div>'
    + (API.demo ? '' : '<div class="reglage"><span class="pastille-ic">' + ic('cle') + '</span><div class="corps"><div>Code personnel</div><div class="t2">Modifiez votre code d’accès</div></div><button class="bt petit" data-act="changerCode">Modifier</button></div><div class="reglage"><span class="pastille-ic">' + ic('acces') + '</span><div class="corps"><div>Double authentification</div><div class="t2">' + (S.moi.mfa ? 'Activée' : 'Application d’authentification (Mots de passe d’Apple, Google Authenticator…)') + '</div></div><button class="bt petit" data-act="mfa">' + (S.moi.mfa ? 'Réinitialiser' : 'Activer') + '</button></div>')
    + '<div class="reglage"><span class="pastille-ic">' + ic('sortie') + '</span><div class="corps"><div>' + (API.demo ? 'Quitter la démonstration' : 'Se déconnecter') + '</div></div><button class="bt petit" data-act="deconnexion">' + (API.demo ? 'Quitter' : 'Déconnexion') + '</button></div></div>';
  if (API.demo) h += '<div class="carte"><div class="carte-titre"><h2>Démonstration</h2></div><p class="texte-2" style="margin:0 0 12px;font-size:14px">Toutes les données sont fictives et restent dans ce navigateur. Changez de profil pour voir ce que chacun peut consulter.</p><div style="display:flex;flex-direction:column;gap:8px">'
    + DEMO.PROFILS.map(function (p) { var on = API.profilCourant() === p.email; return '<button class="bt' + (on ? ' principal-bt' : '') + '" style="justify-content:space-between" data-act="profilDemo" data-v="' + p.email + '"><span>' + esc(p.titre) + '</span><span style="opacity:.7;font-size:12px">' + esc(p.sous) + '</span></button>'; }).join('')
    + '<button class="bt danger" data-act="reinitDemo">' + ic('boucle') + 'Réinitialiser les données fictives</button></div></div>';
  h += '<div class="carte"><div class="carte-titre"><h2>À propos</h2></div><div class="marque" style="margin-bottom:14px">' + MONOGRAMME + '<div><div class="marque-nom">LOFT ELEVEN</div><div class="marque-sous">Private Office</div></div></div><p class="texte-2" style="font-size:14px;margin:0">Bureau de direction numérique du groupe Loft Eleven, Abidjan. Version ' + esc(CFG.version || '1.0') + (API.demo ? ' · démonstration' : '') + '.</p><p class="texte-3" style="font-size:12px;margin:18px 0 0;letter-spacing:.06em">Powered by SoluGis</p></div>';
  return h + '</div>';
}
function ecranPlus() {
  var l = [['conciergerie', 'conciergerie', 'Conciergerie', 'Demandes VIP'], ['projets', 'projets', 'Projets', 'Chantiers et décoration'], ['finance', 'finance', 'Finances', 'Factures, encaissements, dépenses'], ['tiers', 'contacts', 'Contacts', 'Clients, propriétaires, prestataires'],
    ['acces', 'acces', 'Accès', 'Utilisateurs et droits'], ['journal', 'journal', 'Journal d’audit', 'Traçabilité des opérations']].filter(function (x) { return peut(x[0]); });
  var routes = { conciergerie: 'conciergerie', projets: 'projets', finance: 'finance', tiers: 'contacts', acces: 'acces', journal: 'journal' };
  var h = entete('', 'Plus', '');
  h += '<div class="carte"><div class="liste">' + l.map(function (x) { return '<a class="ligne cliquable" href="#/' + routes[x[0]] + '"><span class="pastille-ic or">' + ic(x[1]) + '</span><div class="corps"><div class="t1">' + x[2] + '</div><div class="t2">' + x[3] + '</div></div>' + ic('chevron', 'texte-3') + '</a>'; }).join('')
    + '<a class="ligne cliquable" href="#/reglages"><span class="pastille-ic">' + ic('reglages') + '</span><div class="corps"><div class="t1">Réglages</div><div class="t2">Son, apparence, compte, à propos</div></div>' + ic('chevron', 'texte-3') + '</a></div></div>';
  return h;
}
