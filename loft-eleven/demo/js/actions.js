/* LOFT ELEVEN — fiches de détail et formulaires. Toutes les écritures passent par ecrire() → API → moteur (droits revérifiés). */
'use strict';

/* ---------- listes de choix construites à partir de la vue autorisée */
function choixBranches(types, vide) {
  var o = V(S.db.branches).filter(function (b) { return (!types || types.indexOf(b.type) >= 0) && (!S.filtre.societeId || b.societeId === S.filtre.societeId); })
    .map(function (b) { return [b.id, b.nom + ' · ' + nomDe('societes', b.societeId)]; });
  return vide ? [['', vide]].concat(o) : o;
}
function choixSocietes(vide) { var o = V(S.db.societes).map(function (s) { return [s.id, s.nom]; }); return vide ? [['', vide]].concat(o) : o; }
function choixBiens(filtre, vide) { var o = trierPar(V(S.db.biens).filter(filtre || function () { return true; }), function (b) { return b.nom; }).map(function (b) { return [b.id, b.nom + (b.quartier ? ' · ' + b.quartier : '')]; }); return vide ? [['', vide]].concat(o) : o; }
function choixTiers(types, vide) { var o = trierPar(V(S.db.tiers).filter(function (t) { return !types || types.indexOf(t.type) >= 0; }), function (t) { return t.nom; }).map(function (t) { return [t.id, t.nom]; }); return [['', vide || '— Nouveau ou non enregistré —']].concat(o); }
function choixPersonnes(modules, vide) { modules = [].concat(modules); var o = trierPar(V(S.db.utilisateurs).filter(function (u) { return u.actif && LE.ROLES[u.role] && modules.some(function (m) { return (LE.ROLES[u.role].m[m] || 0) >= 1; }); }), function (u) { return u.nom; }).map(function (u) { return [u.id, u.nom + (u.fonction ? ' · ' + u.fonction : '')]; }); return [['', vide || 'Non attribuée']].concat(o); }
function choixComptes(societeId) { return [['', 'Non précisé']].concat(V(S.db.comptes).filter(function (c) { return !societeId || c.societeId === societeId; }).map(function (c) { return [c.id, c.nom + ' · ' + nomDe('societes', c.societeId)]; })); }
function brancheParDefaut(types) { if (S.filtre.branchId) return S.filtre.branchId; var b = choixBranches(types)[0]; return b ? b[0] : ''; }

/* ================================================================== FICHES DE DÉTAIL */
var DETAILS = {
  reservation: function (id) {
    var r = S.db.reservations[id]; if (!r) return null;
    var b = S.db.biens[r.bienId] || {}, f = r.factureId && S.db.factures[r.factureId], fin = peut('finance'), ecr = peut('reservations', 2), client = r.clientId && S.db.tiers[r.clientId];
    var corps = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + badge('statutReservation', r.statut) + (r.source && r.source !== 'direct' ? '<span class="badge info">' + esc(L.sourceReservation[r.source]) + '</span>' : '') + (client && client.segment !== 'standard' ? '<span class="badge or">' + esc(L.segment[client.segment]) + '</span>' : '') + '</div>';
    corps += '<div class="faits" style="margin-bottom:18px"><div><small>Arrivée</small><b>' + esc(dateCourte(r.debut, true)) + (r.heureArrivee ? ' · ' + r.heureArrivee : '') + '</b></div><div><small>Départ</small><b>' + esc(dateCourte(r.fin, true)) + '</b></div><div><small>Durée</small><b>' + r.nuits + ' nuit(s)</b></div><div><small>Voyageurs</small><b>' + (r.voyageurs || '—') + '</b></div>'
      + (fin ? '<div><small>Montant du séjour</small><b>' + fc(r.montant) + '</b></div><div><small>Tarif moyen</small><b>' + fc(r.tarifNuit) + '</b></div>' : '') + (r.caution && fin ? '<div><small>Caution</small><b>' + fc(r.caution) + ' · ' + esc(L.caution[r.cautionStatut]) + '</b></div>' : '') + '</div>';
    if (client && client.preferences) corps += '<div class="calcul" style="margin-bottom:18px"><b>Préférences du client.</b> ' + esc(client.preferences) + '</div>';
    if (f && fin) {
      var reste = LE.soldeFacture(S.db, f), pay = V(S.db.paiements).filter(function (p) { return p.factureId === f.id && p.statut !== 'annule'; });
      corps += '<div class="carte" style="padding:16px;margin-bottom:18px"><div class="carte-titre" style="margin-bottom:10px"><h3>Facture ' + esc(f.numero) + '</h3>' + badge('etatFacture', LE.etatFacture(S.db, f, S.auj)) + '</div><div class="liste">'
        + pay.map(function (p) { return '<div class="ligne"><div class="corps"><div class="t1">' + esc(L.modePaiement[p.mode]) + ' · ' + dateCourte(p.date) + '</div><div class="t2">' + esc(L.statutPaiement[p.statut]) + (p.numeroRecu ? ' · reçu ' + p.numeroRecu : '') + '</div></div><div class="droite montant">' + fc(p.montant) + '</div></div>'; }).join('')
        + '<div class="ligne"><div class="corps t1">Reste à encaisser</div><div class="droite montant"><b>' + fc(reste) + '</b></div></div></div></div>';
    }
    if (r.satisfaction) corps += '<div class="calcul" style="margin-bottom:18px"><b>Satisfaction ' + r.satisfaction + '/5.</b> ' + esc(r.avis || '') + '</div>';
    if (r.notes) corps += '<p class="texte-2" style="font-size:14px">' + esc(r.notes) + '</p>';
    if (r.motifAnnulation) corps += '<p class="texte-2" style="font-size:14px">Annulée : ' + esc(r.motifAnnulation) + '</p>';
    var pied = '';
    if (ecr) {
      if (r.statut === 'option') pied += '<button class="bt principal-bt" data-act="resaConfirmer" data-id="' + id + '">Confirmer l’option</button>';
      if (r.statut === 'confirmee' && r.debut <= LE.decaler(S.auj, 1)) pied += '<button class="bt principal-bt" data-act="resaArrivee" data-id="' + id + '">' + ic('arrivee') + 'Enregistrer l’arrivée</button>';
      if (r.statut === 'en_cours') pied += '<button class="bt principal-bt" data-act="resaDepart" data-id="' + id + '">' + ic('depart') + 'Enregistrer le départ</button>';
      if (r.caution && (r.cautionStatut === 'a_recevoir' || r.cautionStatut === 'recue')) pied += '<button class="bt" data-act="resaCaution" data-id="' + id + '">' + ic('cle') + 'Caution</button>';
      if (f && fin && peut('finance', 2) && LE.soldeFacture(S.db, f) > 0) pied += '<button class="bt" data-act="encaissement" data-facture="' + f.id + '">' + ic('banque') + 'Encaisser</button>';
      if (r.statut === 'option' || r.statut === 'confirmee' || r.statut === 'en_cours') pied += '<button class="bt" data-act="resaModifier" data-id="' + id + '">Modifier</button>';
      if (r.statut === 'option' || r.statut === 'confirmee') pied += '<button class="bt discret danger" data-act="resaAnnuler" data-id="' + id + '">Annuler</button>';
    }
    var sous = esc(r.telephone || '') + (client && peut('tiers') ? (r.telephone ? ' · ' : '') + '<a href="#/contact/' + client.id + '" class="or" data-fermer-feuille>Fiche client</a>' : '');
    return ({ surtitre: 'Séjour · ' + (b.nom || ''), titre: r.clientNom || 'Réservation', sous: sous, corps: corps, pied: pied || null });
  },
  facture: function (id) {
    var f = S.db.factures[id]; if (!f) return null;
    var e = LE.etatFacture(S.db, f, S.auj), reste = LE.soldeFacture(S.db, f), ecr = peut('finance', 2);
    var pay = trierPar(V(S.db.paiements).filter(function (p) { return p.factureId === id; }), function (p) { return p.date; });
    var corps = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + badge('etatFacture', e) + (f.interneSocieteId ? '<span class="badge info">Interne · ' + esc(nomDe('societes', f.interneSocieteId)) + '</span>' : '') + (f.compteDeTiers ? '<span class="badge info">Pour le compte du propriétaire</span>' : '') + '</div>';
    corps += '<div class="faits" style="margin-bottom:18px"><div><small>Client</small><b>' + esc(f.clientNom || nomDe('tiers', f.tiersId) || nomDe('societes', f.interneSocieteId) || '—') + '</b></div><div><small>Société</small><b>' + esc(nomDe('societes', f.societeId)) + '</b></div><div><small>Date</small><b>' + dateCourte(f.date, true) + '</b></div><div><small>Échéance</small><b>' + dateCourte(f.echeance, true) + '</b></div>'
      + '<div><small>Montant hors taxes</small><b>' + fc(f.montant) + '</b></div><div><small>Taxes</small><b>' + fc(f.taxe || 0) + '</b></div><div><small>Total</small><b>' + fc(LE.totalFacture(f)) + '</b></div><div><small>Reste dû</small><b class="' + (e === 'en_retard' ? 'baisse' : '') + '">' + fc(reste) + '</b></div></div>';
    corps += '<div class="carte-titre"><h3>Encaissements</h3></div>' + (pay.length ? '<div class="liste">' + pay.map(function (p) {
      return '<div class="ligne"><span class="pastille-ic ' + (p.statut === 'confirme' ? 'ok' : p.statut === 'annule' ? '' : 'att') + '">' + ic(p.mode === 'mobile_money' ? 'telephone' : p.mode === 'especes' ? 'especes' : p.mode === 'carte' ? 'carte' : 'banque') + '</span><div class="corps"><div class="t1">' + esc(L.modePaiement[p.mode]) + ' · ' + fc(p.montant) + '</div><div class="t2">' + dateCourte(p.date) + ' · ' + esc(L.statutPaiement[p.statut]) + (p.reference ? ' · réf. ' + esc(p.reference) : '') + (p.numeroRecu ? ' · reçu ' + p.numeroRecu : '') + '</div></div>'
        + (ecr && p.statut === 'en_attente' ? '<button class="bt petit" data-act="paiementConfirmer" data-id="' + p.id + '">Confirmer</button>' : '') + (p.statut === 'confirme' ? '<button class="bt petit discret" data-act="recu" data-id="' + p.id + '">Reçu</button>' : '') + (ecr && p.statut !== 'annule' ? '<button class="bt-icone" title="Annuler ce paiement" data-act="paiementAnnuler" data-id="' + p.id + '">' + ic('fermer') + '</button>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="texte-3" style="font-size:14px">Aucun encaissement enregistré.</p>');
    if (f.motifAnnulation) corps += '<p class="texte-2" style="font-size:14px;margin-top:14px">Annulée : ' + esc(f.motifAnnulation) + '</p>';
    var pied = '<button class="bt" data-act="imprimerFacture" data-id="' + id + '">' + ic('imprimer') + 'Imprimer</button>';
    if (ecr && f.statut !== 'annulee') {
      if (!pay.some(function (p) { return p.statut === 'confirme'; })) pied += '<button class="bt discret danger" data-act="factureAnnuler" data-id="' + id + '">Annuler</button>';
      if (reste > 0) pied += '<button class="bt principal-bt" data-act="encaissement" data-facture="' + id + '">' + ic('banque') + 'Encaisser</button>';
    }
    return ({ surtitre: 'Facture ' + f.numero, titre: f.libelle, corps: corps, pied: pied });
  },
  depense: function (id) {
    var x = S.db.depenses[id]; if (!x) return null;
    var ecr = peut('finance', 2);
    var corps = '<div style="margin-bottom:18px">' + badge('statutDepense', x.statut) + (x.interneSocieteId ? ' <span class="badge info">Interne · ' + esc(nomDe('societes', x.interneSocieteId)) + '</span>' : '') + '</div><div class="faits"><div><small>Montant</small><b>' + fc(x.montant) + '</b></div><div><small>Date</small><b>' + dateCourte(x.date, true) + '</b></div><div><small>Catégorie</small><b>' + esc(L.categorieDepense[x.categorie]) + '</b></div><div><small>Société</small><b>' + esc(nomDe('societes', x.societeId)) + '</b></div>'
      + (x.bienId ? '<div><small>Bien</small><b>' + esc(nomDe('biens', x.bienId)) + '</b></div>' : '') + (x.projetId ? '<div><small>Projet</small><b>' + esc(nomDe('projets', x.projetId)) + '</b></div>' : '') + ((x.fournisseurId || x.fournisseurNom) ? '<div><small>Fournisseur</small><b>' + esc(nomDe('tiers', x.fournisseurId) || x.fournisseurNom) + '</b></div>' : '')
      + (x.statut === 'payee' ? '<div><small>Payée le</small><b>' + dateCourte(x.datePaiement, true) + ' · ' + esc(L.modePaiement[x.mode] || '') + '</b></div>' : '') + (x.compteId ? '<div><small>Compte</small><b>' + esc(nomDe('comptes', x.compteId)) + '</b></div>' : '') + '</div>';
    if (x.justificatif) corps += '<div class="visuel" style="margin-top:18px;border-radius:12px;aspect-ratio:4/3" data-photo="' + esc(x.justificatif) + '"></div>';
    if (x.motifAnnulation) corps += '<p class="texte-2" style="font-size:14px">Annulée : ' + esc(x.motifAnnulation) + '</p>';
    var pied = ecr && x.statut !== 'annulee' ? '<button class="bt discret danger" data-act="depenseAnnuler" data-id="' + id + '">Annuler</button><button class="bt" data-act="justificatif" data-id="' + id + '">' + ic('photo') + 'Justificatif</button>' + (x.statut === 'engagee' ? '<button class="bt principal-bt" data-act="depensePayer" data-id="' + id + '">Marquer payée</button>' : '') : '';
    return ({ surtitre: 'Dépense', titre: x.libelle, corps: corps, pied: pied || null });
  },
  tache: function (id) {
    var t = S.db.taches[id]; if (!t) return null;
    var p = propre(), mienne = t.assigneId === S.moi.id, agit = p ? mienne : peut('agenda', 2), ouverte = t.statut === 'a_faire' || t.statut === 'en_cours';
    var corps = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + badge('statutTache', t.statut) + (t.priorite !== 'normale' ? badge('priorite', t.priorite) : '') + '<span class="badge nu">' + esc(L.typeTache[t.type] || '') + '</span></div>';
    corps += '<div class="faits" style="margin-bottom:18px"><div><small>Date</small><b>' + esc(dateRel(t.date)) + (t.heure ? ' · ' + t.heure : '') + '</b></div>' + (t.bienId ? '<div><small>Bien</small><b>' + esc(nomDe('biens', t.bienId)) + '</b></div>' : '') + '<div><small>Confiée à</small><b>' + esc(personne(t.assigneId) || 'Non attribuée') + '</b></div>' + (t.faiteLe ? '<div><small>Faite</small><b>' + dateCourte(t.faiteLe.slice(0, 10)) + ' · ' + heureDe(t.faiteLe) + '</b></div>' : '') + '</div>';
    if (t.notes) corps += '<p class="texte-2" style="font-size:14px;margin:0 0 18px">' + esc(t.notes) + '</p>';
    if ((t.checklist || []).length) corps += '<div class="carte-titre"><h3>Points de contrôle</h3><span class="texte-3" style="font-size:13px">' + t.checklist.filter(function (x) { return x.ok; }).length + ' / ' + t.checklist.length + '</span></div><div class="liste" style="margin-bottom:18px">' + t.checklist.map(function (x, i) { return '<label class="ligne" style="cursor:' + (agit && ouverte ? 'pointer' : 'default') + '"><input type="checkbox" ' + (x.ok ? 'checked' : '') + (agit && ouverte ? ' data-act="cocher" data-id="' + id + '" data-i="' + i + '"' : ' disabled') + '><div class="corps t1" style="white-space:normal">' + esc(x.t) + '</div></label>'; }).join('') + '</div>';
    if ((t.commentaires || []).length) corps += '<div class="carte-titre"><h3>Suivi</h3></div><div class="liste">' + t.commentaires.map(function (c) { return '<div class="ligne" style="align-items:flex-start"><span class="avatar" style="width:30px;height:30px;font-size:11px">' + esc(initiales(personne(c.par))) + '</span><div class="corps"><div class="t1" style="white-space:normal">' + (c.incident ? '<span class="badge att">Incident</span> ' : '') + esc(c.texte) + '</div><div class="t2">' + esc(personne(c.par)) + ' · ' + dateCourte(c.quand.slice(0, 10)) + ' ' + heureDe(c.quand) + '</div>' + (c.photo ? '<div class="visuel" style="margin-top:8px;border-radius:10px;max-width:280px" data-photo="' + esc(c.photo) + '"></div>' : '') + '</div></div>'; }).join('') + '</div>';
    var pied = '';
    if (agit) {
      pied += '<button class="bt" data-act="commenter" data-id="' + id + '">' + ic('photo') + 'Commentaire ou photo</button>';
      if (t.statut === 'a_faire') pied += '<button class="bt" data-act="tacheStatut" data-id="' + id + '" data-v="en_cours">Commencer</button>';
      if (ouverte) pied += '<button class="bt principal-bt" data-act="tacheStatut" data-id="' + id + '" data-v="faite">' + ic('ok') + 'Terminée</button>';
      if (!p && t.statut === 'faite') pied += '<button class="bt principal-bt" data-act="tacheStatut" data-id="' + id + '" data-v="validee">' + ic('ok') + 'Valider la prestation</button>';
      if (!p && ouverte) pied += '<button class="bt discret" data-act="modifierTache" data-id="' + id + '">Modifier</button>';
    }
    return { surtitre: t.bienId ? nomDe('biens', t.bienId) : 'Tâche', titre: t.titre, corps: corps, pied: pied || null };
  },
  prestation: function (id) {
    var x = S.db.prestations[id]; if (!x) return null;
    var p = propre(), ecr = p ? x.assigneId === S.moi.id : peut('conciergerie', 2), fin = peut('finance'), client = x.clientId && S.db.tiers[x.clientId];
    var corps = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' + badge('statutPrestation', x.statut) + (x.priorite !== 'normale' ? badge('priorite', x.priorite) : '') + '<span class="badge nu">' + esc(L.typePrestation[x.type]) + '</span></div>';
    corps += '<div class="faits" style="margin-bottom:18px"><div><small>Client</small><b>' + esc(x.clientNom || '—') + '</b></div><div><small>Date</small><b>' + esc(dateRel(x.date)) + (x.heure ? ' · ' + x.heure : '') + '</b></div><div><small>Confiée à</small><b>' + esc(personne(x.assigneId) || 'À attribuer') + '</b></div>'
      + (x.bienId ? '<div><small>Lieu</small><b>' + esc(nomDe('biens', x.bienId)) + '</b></div>' : '') + (fin ? '<div><small>Prix</small><b>' + fc(x.prix) + '</b></div><div><small>Coût</small><b>' + fc(x.cout) + '</b></div><div><small>Marge</small><b>' + fc((x.prix || 0) - (x.cout || 0)) + '</b></div>' : '') + (x.satisfaction ? '<div><small>Satisfaction</small><b>' + x.satisfaction + ' / 5</b></div>' : '') + '</div>';
    if (client && client.preferences && !p) corps += '<div class="calcul" style="margin-bottom:18px"><b>Préférences du client.</b> ' + esc(client.preferences) + '</div>';
    if (x.notes) corps += '<p class="texte-2" style="font-size:14px">' + esc(x.notes) + '</p>';
    if (x.factureId && fin) corps += '<button class="bt petit" data-ouvrir="facture:' + x.factureId + '">' + ic('facture') + 'Voir la facture</button>';
    var pied = '';
    if (ecr && x.statut !== 'realisee' && x.statut !== 'annulee') {
      if (!p && x.statut === 'demandee') pied += '<button class="bt" data-act="modifierPrestation" data-id="' + id + '">Attribuer</button>';
      if (x.statut !== 'en_cours') pied += '<button class="bt" data-act="prestationStatut" data-id="' + id + '" data-v="en_cours">Commencer</button>';
      pied += '<button class="bt principal-bt" data-act="prestationStatut" data-id="' + id + '" data-v="realisee">' + ic('ok') + 'Réalisée</button>';
      if (!p) pied += '<button class="bt discret danger" data-act="prestationStatut" data-id="' + id + '" data-v="annulee">Annuler</button>';
    }
    if (!p && x.statut === 'realisee' && !x.factureId && peut('finance', 2) && x.prix) pied += '<button class="bt principal-bt" data-act="nouvelleFacture" data-prestation="' + id + '">' + ic('facture') + 'Facturer</button>';
    if (!p && ecr && x.statut !== 'annulee') pied += '<button class="bt discret" data-act="modifierPrestation" data-id="' + id + '">Modifier</button>';
    return { surtitre: 'Conciergerie privée', titre: x.libelle, corps: corps, pied: pied || null };
  }
};
function ouvrirDetail(type, id) {
  if (!DETAILS[type]) return;
  var cfg = DETAILS[type](id);
  if (!cfg) return toast('Élément introuvable ou hors de votre périmètre.', true);
  cfg.detail = type + ':' + id;
  Feuille.ouvrir(cfg);
}
/* Après une écriture, les fiches ouvertes sont recalculées en place. */
function rafraichirDetails() {
  Feuille.pile.slice().forEach(function (item) {
    if (!item.o.detail) return;
    var t = item.o.detail.split(':'), cfg = DETAILS[t[0]](t[1]);
    if (!cfg) { var i = Feuille.pile.indexOf(item); if (i >= 0) { Feuille.pile.splice(i, 1); item.f.remove(); item.fond.remove(); } return; }
    item.f.querySelector('.feuille-corps').innerHTML = cfg.corps;
    var pied = item.f.querySelector('.feuille-pied');
    if (cfg.pied && pied) pied.innerHTML = cfg.pied; else if (pied && !cfg.pied) pied.remove();
    else if (cfg.pied && !pied) { pied = document.createElement('div'); pied.className = 'feuille-pied'; pied.innerHTML = cfg.pied; item.f.appendChild(pied); }
    chargerPhotos(item.f);
  });
  if (!Feuille.pile.length) document.body.style.overflow = '';
}

/* ---------- petites aides de formulaire */
function lignesSousListe(cols, valeurs, cle) {
  var rang = function (v) { return '<div class="rang">' + cols.map(function (c) { return '<input type="' + (c.t || 'text') + '" data-sl="' + c.k + '" placeholder="' + esc(c.l) + '" value="' + esc(v && v[c.k] !== undefined && v[c.k] !== null ? v[c.k] : '') + '"' + (c.t === 'number' ? ' inputmode="numeric"' : '') + '>'; }).join('') + '<button type="button" class="bt-icone" data-sl-suppr aria-label="Retirer">' + ic('fermer') + '</button></div>'; };
  return '<div class="sous-liste" data-sous-liste="' + cle + '"><div class="kpi-lib" style="margin-bottom:2px">' + esc(cols.titre || '') + '</div>' + (valeurs || []).map(rang).join('') + rang(null) + '<button type="button" class="bt petit" style="align-self:flex-start" data-sl-ajout>' + ic('ajout') + 'Ajouter une ligne</button><template>' + rang(null) + '</template></div>';
}
function lireSousListe(form, cle) {
  var z = form.querySelector('[data-sous-liste="' + cle + '"]'); if (!z) return [];
  return Array.prototype.map.call(z.querySelectorAll(':scope > .rang'), function (r) { var o = {}; r.querySelectorAll('[data-sl]').forEach(function (i) { o[i.getAttribute('data-sl')] = i.value.trim(); }); return o; })
    .filter(function (o) { return Object.keys(o).some(function (k) { return o[k]; }); });
}
document.addEventListener('click', function (e) {
  var a = e.target.closest('[data-sl-ajout]'); if (a) { var z = a.closest('[data-sous-liste]'); a.insertAdjacentHTML('beforebegin', z.querySelector('template').innerHTML); return; }
  var s = e.target.closest('[data-sl-suppr]'); if (s) s.closest('.rang').remove();
});
var CHAMP_PHOTO = '<label class="champ plein"><span>Photo ou justificatif <span class="texte-3" style="opacity:.6">· facultatif</span></span><input type="file" accept="image/*" data-fichier style="height:auto;padding:12px"></label>';
function envoyerFichier(form) {
  var i = form.querySelector('[data-fichier]'); if (!i || !i.files || !i.files[0]) return Promise.resolve(null);
  return Photos.reduire(i.files[0]).then(function (d) { return API.envoyerPhoto(d); });
}
function choisirFichiers(multiple) {
  return new Promise(function (ok) {
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = !!multiple; i.style.display = 'none';
    i.addEventListener('change', function () { ok(Array.prototype.slice.call(i.files || [])); i.remove(); });
    document.body.appendChild(i); i.click();
  });
}
function sansVides(o) { Object.keys(o).forEach(function (k) { if (o[k] === '') delete o[k]; }); return o; }

/* ================================================================== ACTIONS (boutons data-act) */
var ACTIONS = {
  /* ---- navigation et filtres d'écran */
  periode: function (el, d) { S.filtre.periode = d.v; sauverFiltre(); App.rendre(true); },
  periodePerso: function () {
    var p = periodeCourante();
    formulaire({ titre: 'Période personnalisée', champs: [{ k: 'debut', l: 'Du', t: 'date', req: true, defaut: p.debut }, { k: 'fin', l: 'Au', t: 'date', req: true, defaut: p.fin }], bouton: 'Appliquer',
      envoyer: function (v) { if (v.fin < v.debut) return Promise.reject(new Error('La fin doit suivre le début.')); S.filtre.periode = 'perso'; S.filtre.debut = v.debut; S.filtre.fin = v.fin; sauverFiltre(); App.rendre(true); } });
  },
  tousKpi: function () { document.querySelectorAll('.kpi.masque-mobile').forEach(function (k) { k.classList.remove('masque-mobile'); }); var b = document.querySelector('[data-act="tousKpi"]'); if (b) b.remove(); },
  retour: function () { if (history.length > 1) history.back(); else location.hash = '#/accueil'; },
  ongletBiens: function (el, d) { S.ongletBiens = d.v; App.rendre(true); },
  ongletBien: function (el, d) { S.ongletBien = d.v; App.rendre(true); },
  moisCal: function (el, d) { var m = S.moisCal || S.auj.slice(0, 7), y = +m.slice(0, 4), mo = +m.slice(5, 7) + +d.v; if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; } S.moisCal = y + '-' + (mo < 10 ? '0' : '') + mo; App.rendre(true); },
  ongletAgenda: function (el, d) { S.ongletAgenda = d.v; App.rendre(true); },
  filtreResa: function (el, d) { S.filtreResa = d.v; App.rendre(true); },
  filtreTaches: function (el, d) { S.filtreTaches = d.v; App.rendre(true); },
  planning: function (el, d) { S.debutPlanning = +d.v === 0 ? null : LE.decaler(S.debutPlanning || LE.decaler(S.auj, -2), +d.v); App.rendre(true); },
  ongletFinance: function (el, d) { S.ongletFinance = d.v; App.rendre(true); },
  filtreFact: function (el, d) { S.filtreFact = d.v; App.rendre(true); },
  ongletConc: function (el, d) { S.ongletConc = d.v; App.rendre(true); },
  ongletAcces: function (el, d) { S.ongletAcces = d.v; App.rendre(true); },
  ongletContacts: function (el, d) { S.ongletContacts = d.v; App.rendre(true); },
  imprimer: function () { window.print(); },

  /* ---- exports (CSV pour Excel) */
  exportFactures: function () {
    var l = trierPar(V(S.db.factures).filter(dansFiltre), function (f) { return f.date; });
    exporterCSV('Factures', ['Numéro', 'Société', 'Activité', 'Client', 'Libellé', 'Date', 'Échéance', 'Montant HT', 'Taxes', 'Total', 'Reste dû', 'État', 'Interne au groupe', 'Pour compte de tiers'],
      l.map(function (f) { return [f.numero, nomDe('societes', f.societeId), nomDe('branches', f.branchId), f.clientNom || nomDe('tiers', f.tiersId), f.libelle, f.date, f.echeance, f.montant, f.taxe || 0, LE.totalFacture(f), LE.soldeFacture(S.db, f), LE.ETAT_FACTURE[LE.etatFacture(S.db, f, S.auj)], f.interneSocieteId ? nomDe('societes', f.interneSocieteId) : '', f.compteDeTiers ? 'oui' : '']; }));
  },
  exportPaiements: function () {
    var l = trierPar(V(S.db.paiements).filter(function (p) { var f = S.db.factures[p.factureId]; return f && dansFiltre(f); }), function (p) { return p.date; });
    exporterCSV('Encaissements', ['Date', 'Société', 'Facture', 'Client', 'Montant', 'Moyen', 'Référence', 'Compte', 'Statut', 'Reçu'],
      l.map(function (p) { var f = S.db.factures[p.factureId]; return [p.date, nomDe('societes', f.societeId), f.numero, f.clientNom || nomDe('tiers', f.tiersId), p.montant, L.modePaiement[p.mode], p.reference || '', nomDe('comptes', p.compteId), L.statutPaiement[p.statut], p.numeroRecu || '']; }));
  },
  exportDepenses: function () {
    var l = trierPar(V(S.db.depenses).filter(dansFiltre), function (x) { return x.date; });
    exporterCSV('Dépenses', ['Date', 'Société', 'Activité', 'Bien', 'Projet', 'Catégorie', 'Libellé', 'Fournisseur', 'Montant', 'Statut', 'Payée le', 'Moyen', 'Compte', 'Interne au groupe'],
      l.map(function (x) { return [x.date, nomDe('societes', x.societeId), nomDe('branches', x.branchId), nomDe('biens', x.bienId), nomDe('projets', x.projetId), L.categorieDepense[x.categorie], x.libelle, nomDe('tiers', x.fournisseurId) || x.fournisseurNom || '', x.montant, L.statutDepense[x.statut], x.datePaiement || '', L.modePaiement[x.mode] || '', nomDe('comptes', x.compteId), x.interneSocieteId ? nomDe('societes', x.interneSocieteId) : '']; }));
  },
  exportResa: function () {
    var l = trierPar(V(S.db.reservations).filter(dansFiltre), function (r) { return r.debut; }), fin = peut('finance');
    exporterCSV('Réservations', ['Résidence', 'Client', 'Arrivée', 'Départ', 'Nuits', 'Voyageurs', 'Source', 'Statut'].concat(fin ? ['Montant', 'Caution', 'Facture'] : []),
      l.map(function (r) { return [nomDe('biens', r.bienId), r.clientNom, r.debut, r.fin, r.nuits, r.voyageurs || '', L.sourceReservation[r.source] || '', L.statutReservation[r.statut]].concat(fin ? [r.montant, r.caution || 0, nomDe('factures', r.factureId, 'numero')] : []); }));
  },
  exportIndic: function (el, d) {
    var k = kpis(), col = INDICS[d.id].col, ids = idsIndic(d.id, k);
    if (col === 'factures') return exporterCSV(INDICS[d.id].t, ['Numéro', 'Client', 'Libellé', 'Date', 'Échéance', 'Montant HT', 'Reste dû'], ids.map(function (id) { var f = S.db.factures[id]; return [f.numero, f.clientNom || nomDe('tiers', f.tiersId), f.libelle, f.date, f.echeance, f.montant, LE.soldeFacture(S.db, f)]; }));
    if (col === 'paiements') return exporterCSV(INDICS[d.id].t, ['Date', 'Facture', 'Montant', 'Moyen', 'Statut'], ids.map(function (id) { var p = S.db.paiements[id]; return [p.date, nomDe('factures', p.factureId, 'numero'), p.montant, L.modePaiement[p.mode], L.statutPaiement[p.statut]]; }));
    if (col === 'depenses') return exporterCSV(INDICS[d.id].t, ['Date', 'Libellé', 'Catégorie', 'Montant', 'Statut'], ids.map(function (id) { var x = S.db.depenses[id]; return [x.date, x.libelle, L.categorieDepense[x.categorie], x.montant, L.statutDepense[x.statut]]; }));
    exporterCSV(INDICS[d.id].t, ['Élément'], ids.map(function (id) { var r = S.db[col][id]; return [r.nom || r.libelle || r.titre || id]; }));
  },

  /* ---- biens */
  nouveauBien: function () { formBien(null); },
  modifierBien: function (el, d) { formBien(S.db.biens[d.id]); },
  photoBien: function (el, d) {
    choisirFichiers(true).then(function (fichiers) {
      if (!fichiers.length) return;
      attente(true);
      var b = S.db.biens[d.id], ids = (b.photos || []).slice();
      return fichiers.reduce(function (p, f) { return p.then(function () { return Photos.reduire(f).then(API.envoyerPhoto).then(function (id) { ids.push(id); }); }); }, Promise.resolve())
        .then(function () { attente(false); return ecrire('bien.modifier', { id: d.id, photos: ids }, fichiers.length + ' photo(s) ajoutée(s)'); }, function (e) { attente(false); toast(e.message, true); });
    });
  },
  photoUne: function (el, d) { var b = S.db.biens[d.id], l = (b.photos || []).slice(), x = l.splice(+d.i, 1); if (+d.i === 0) return; ecrire('bien.modifier', { id: d.id, photos: x.concat(l) }, 'Photo de couverture choisie'); },
  bloquerBien: function (el, d) {
    formulaire({ titre: 'Bloquer des dates', sous: esc(nomDe('biens', d.id)), champs: [{ k: 'debut', l: 'Du', t: 'date', req: true, defaut: S.auj }, { k: 'fin', l: 'Jusqu’au (exclu)', t: 'date', req: true, defaut: LE.decaler(S.auj, 3) }, { k: 'motif', l: 'Motif', t: 'texte', req: true, plein: true, defaut: 'Entretien' }], bouton: 'Bloquer',
      envoyer: function (v) { return ecrire('bien.bloquer', { id: d.id, debut: v.debut, fin: v.fin, motif: v.motif }, 'Période bloquée'); } });
  },
  debloquer: function (el, d) { ecrire('bien.debloquer', { id: d.id, index: +d.i }, 'Blocage retiré'); },
  etatBien: function (el, d) {
    var b = S.db.biens[d.id];
    formulaire({ titre: 'État du bien', sous: esc(b.nom), champs: [{ k: 'etat', l: 'État', t: 'select', opts: opts(L.etatBien), req: true, defaut: b.etat || 'actif', plein: true, aide: 'En maintenance ou indisponible, le bien n’apparaît plus comme disponible.' }], bouton: 'Appliquer',
      envoyer: function (v) { return ecrire('bien.etat', { id: d.id, etat: v.etat }, 'État mis à jour'); } });
  },
  incident: function (el, d) {
    var b = S.db.biens[d.id];
    formulaire({ titre: 'Déclarer un incident', sous: esc(b.nom), champs: [{ k: 'titre', l: 'Description', t: 'texte', req: true, plein: true }, { k: 'priorite', l: 'Priorité', t: 'select', opts: opts(L.priorite), defaut: 'haute', req: true }, peut('agenda', 2) ? { k: 'tache', l: 'Créer une tâche de maintenance', t: 'case', defaut: true } : null], bouton: 'Déclarer',
      envoyer: function (v) { return ecrire('bien.incident', { id: d.id, titre: v.titre, priorite: v.priorite, tache: !!v.tache }, 'Incident déclaré', 'notification'); } });
  },
  incidentResolu: function (el, d) { ecrire('bien.incidentResolu', { id: d.id, index: +d.i }, 'Incident résolu', 'finalisation'); },
  inventaire: function (el, d) {
    var b = S.db.biens[d.id], cols = [{ k: 'nom', l: 'Élément' }, { k: 'qte', l: 'Quantité', t: 'number' }, { k: 'etat', l: 'État (bon, usé…)' }]; cols.titre = 'Équipements';
    formulaire({ titre: 'Inventaire', sous: esc(b.nom), champs: [], apresChamps: lignesSousListe(cols, b.inventaire || [], 'inv'), bouton: 'Enregistrer',
      envoyer: function (v, form) { return ecrire('bien.inventaire', { id: d.id, inventaire: lireSousListe(form, 'inv').map(function (x) { return { nom: x.nom, qte: +x.qte || 1, etat: x.etat || 'bon' }; }) }, 'Inventaire enregistré'); } });
  },
  releve: function (el, d) { imprimerReleve(d.id); },

  /* ---- réservations */
  nouvelleReservation: function (el, d) { formReservation(d.id || S.filtre.bienId || '', d.date || '', d.client || ''); },
  resaConfirmer: function (el, d) { ecrire('reservation.confirmer', { id: d.id }, 'Option confirmée · facture émise', 'finalisation'); },
  resaArrivee: function (el, d) { ecrire('reservation.arrivee', { id: d.id }, 'Arrivée enregistrée · bon séjour', 'finalisation'); },
  resaDepart: function (el, d) {
    var r = S.db.reservations[d.id];
    formulaire({ titre: 'Départ de ' + r.clientNom, sous: esc(nomDe('biens', r.bienId)) + ' · une tâche de ménage et préparation sera créée.', champs: [
      { k: 'assigneId', l: 'Ménage confié à', t: 'select', opts: choixPersonnes(['agenda'], 'À attribuer plus tard'), plein: true },
      { k: 'note', l: 'Satisfaction du client', t: 'select', opts: [['', 'Non communiquée'], ['5', '5 · Excellent'], ['4', '4 · Très bien'], ['3', '3 · Correct'], ['2', '2 · Décevant'], ['1', '1 · Mauvais']] },
      { k: 'commentaire', l: 'Commentaire du client', t: 'long' }], bouton: 'Enregistrer le départ',
      envoyer: function (v) { return ecrire('reservation.depart', sansVides({ id: d.id, assigneId: v.assigneId, note: v.note ? +v.note : '', commentaire: v.commentaire }), 'Départ enregistré · ménage planifié', 'finalisation'); } });
  },
  resaCaution: function (el, d) {
    var r = S.db.reservations[d.id];
    formulaire({ titre: 'Caution · ' + fc(r.caution), sous: 'La caution n’est pas un revenu : elle est suivie à part.', champs: [{ k: 'statut', l: 'Statut', t: 'select', opts: [['recue', 'Reçue'], ['restituee', 'Restituée'], ['retenue', 'Retenue en partie']], req: true, defaut: r.cautionStatut === 'a_recevoir' ? 'recue' : 'restituee' }, { k: 'retenue', l: 'Montant retenu', t: 'montant', si: function (v) { return v.statut === 'retenue'; } }], bouton: 'Enregistrer',
      envoyer: function (v) { return ecrire('reservation.caution', sansVides({ id: d.id, statut: v.statut, retenue: v.retenue }), 'Caution mise à jour'); } });
  },
  resaModifier: function (el, d) {
    var r = S.db.reservations[d.id], fin = peut('finance');
    formulaire({ titre: 'Modifier le séjour', sous: esc(r.clientNom + ' · ' + nomDe('biens', r.bienId)), valeurs: r, champs: [{ k: 'debut', l: 'Arrivée', t: 'date', req: true }, { k: 'fin', l: 'Départ', t: 'date', req: true }, { k: 'heureArrivee', l: 'Heure d’arrivée', t: 'heure' }, { k: 'voyageurs', l: 'Voyageurs', t: 'nombre' }, fin ? { k: 'montant', l: 'Montant du séjour', t: 'montant', aide: 'Si vous changez les dates sans toucher au montant, il est recalculé selon les tarifs.' } : null, { k: 'notes', l: 'Notes', t: 'long' }],
      envoyer: function (v) { var o = sansVides(Object.assign({ id: d.id }, v)); if ((v.debut !== r.debut || v.fin !== r.fin) && v.montant === r.montant) delete o.montant; return ecrire('reservation.modifier', o, 'Séjour modifié'); } });
  },
  resaAnnuler: function (el, d) {
    confirmer({ titre: 'Annuler la réservation', texte: 'La facture est annulée si rien n’a été encaissé ; sinon le montant reçu est conservé.', motif: 'Motif de l’annulation', bouton: 'Annuler la réservation', action: function (v) { return ecrire('reservation.annuler', { id: d.id, motif: v.motif }, 'Réservation annulée'); } });
  },

  /* ---- finances */
  encaissement: function (el, d) { formEncaissement(d.facture || ''); },
  paiementConfirmer: function (el, d) { ecrire('paiement.confirmer', { id: d.id }, 'Paiement confirmé · reçu numéroté', 'finalisation'); },
  paiementAnnuler: function (el, d) { confirmer({ titre: 'Annuler ce paiement', texte: 'Le paiement reste visible dans l’historique avec son motif.', motif: 'Motif', bouton: 'Annuler le paiement', action: function (v) { return ecrire('paiement.annuler', { id: d.id, motif: v.motif }, 'Paiement annulé'); } }); },
  recu: function (el, d) { imprimerRecu(d.id); },
  imprimerFacture: function (el, d) { imprimerFacture(d.id); },
  nouvelleFacture: function (el, d) { formFacture(d.projet || '', d.prestation || ''); },
  factureAnnuler: function (el, d) { confirmer({ titre: 'Annuler la facture', texte: 'Une facture annulée reste dans l’historique.', motif: 'Motif', bouton: 'Annuler la facture', action: function (v) { return ecrire('facture.annuler', { id: d.id, motif: v.motif }, 'Facture annulée'); } }); },
  nouvelleDepense: function (el, d) { formDepense(d.bien || '', d.projet || ''); },
  depensePayer: function (el, d) {
    var x = S.db.depenses[d.id];
    formulaire({ titre: 'Paiement de la dépense', sous: esc(x.libelle + ' · ' + fc(x.montant)), champs: [{ k: 'mode', l: 'Moyen de paiement', t: 'select', opts: opts(L.modePaiement), req: true }, { k: 'compteId', l: 'Compte débité', t: 'select', opts: choixComptes(x.societeId) }, { k: 'date', l: 'Date du paiement', t: 'date', req: true, defaut: S.auj }], bouton: 'Marquer payée',
      envoyer: function (v) { return ecrire('depense.payer', sansVides({ id: d.id, mode: v.mode, compteId: v.compteId, date: v.date }), 'Dépense payée', 'finalisation'); } });
  },
  depenseAnnuler: function (el, d) { confirmer({ titre: 'Annuler la dépense', motif: 'Motif', bouton: 'Annuler la dépense', action: function (v) { return ecrire('depense.annuler', { id: d.id, motif: v.motif }, 'Dépense annulée'); } }); },
  justificatif: function (el, d) {
    choisirFichiers(false).then(function (f) { if (!f.length) return; attente(true); Photos.reduire(f[0]).then(API.envoyerPhoto).then(function (id) { attente(false); return ecrire('depense.modifier', { id: d.id, justificatif: id }, 'Justificatif ajouté'); }, function (e) { attente(false); toast(e.message, true); }); });
  },
  nouveauCompte: function () {
    formulaire({ titre: 'Nouveau compte de trésorerie', champs: [{ k: 'societeId', l: 'Société', t: 'select', opts: choixSocietes(), req: true, defaut: S.filtre.societeId }, { k: 'nom', l: 'Nom du compte', t: 'texte', req: true }, { k: 'type', l: 'Type', t: 'select', opts: opts(L.typeCompte), req: true }, { k: 'soldeInitial', l: 'Solde de départ', t: 'montant', req: true }, { k: 'dateSolde', l: 'Date de ce solde', t: 'date', req: true, defaut: S.auj }],
      envoyer: function (v) { return ecrire('compte.creer', v, 'Compte ajouté'); } });
  },

  /* ---- tâches */
  nouvelleTache: function (el, d) { formTache(null, d.bien || ''); },
  modifierTache: function (el, d) { formTache(S.db.taches[d.id]); },
  tacheStatut: function (el, d) {
    var msg = { en_cours: 'Tâche commencée', faite: 'Tâche terminée', validee: 'Prestation validée' }[d.v];
    ecrire('tache.statut', { id: d.id, statut: d.v }, msg, d.v === 'en_cours' ? 'validation' : 'finalisation').catch(function (e) {
      if (/points de contrôle/.test(e.message)) confirmer({ titre: 'Terminer malgré tout ?', texte: 'Des points de contrôle ne sont pas cochés.', bouton: 'Terminer quand même', action: function () { return ecrire('tache.statut', { id: d.id, statut: 'faite', forcer: true }, msg, 'finalisation'); } });
      else toast(e.message, true);
    });
  },
  cocher: function (el, d) { ecrire('tache.cocher', { id: d.id, index: +d.i, ok: el.checked }, el.checked ? 'Point validé' : 'Point décoché').catch(function (e) { el.checked = !el.checked; toast(e.message, true); }); },
  commenter: function (el, d) {
    formulaire({ titre: 'Commentaire', champs: [{ k: 'texte', l: 'Commentaire', t: 'long' }, { k: 'incident', l: 'Signaler un incident', t: 'case' }], apresChamps: CHAMP_PHOTO, bouton: 'Ajouter',
      envoyer: function (v, form) { return envoyerFichier(form).then(function (ph) { if (!v.texte && !ph) throw new Error('Écrivez un commentaire ou ajoutez une photo.'); return ecrire('tache.commenter', sansVides({ id: d.id, texte: v.texte, incident: v.incident, photo: ph || '' }), 'Commentaire ajouté'); }); } });
  },

  /* ---- conciergerie */
  nouvellePrestation: function () { formPrestation(null); },
  modifierPrestation: function (el, d) { formPrestation(S.db.prestations[d.id]); },
  prestationStatut: function (el, d) {
    if (d.v === 'realisee' && !propre()) return formulaire({ titre: 'Prestation réalisée', champs: [{ k: 'note', l: 'Satisfaction du client', t: 'select', opts: [['', 'Non communiquée'], ['5', '5 · Excellent'], ['4', '4 · Très bien'], ['3', '3 · Correct'], ['2', '2 · Décevant'], ['1', '1 · Mauvais']], plein: true }], bouton: 'Confirmer',
      envoyer: function (v) { return ecrire('prestation.statut', sansVides({ id: d.id, statut: 'realisee', note: v.note ? +v.note : '' }), 'Prestation réalisée', 'finalisation'); } });
    if (d.v === 'annulee') return confirmer({ titre: 'Annuler la prestation', bouton: 'Annuler la prestation', action: function () { return ecrire('prestation.statut', { id: d.id, statut: 'annulee' }, 'Prestation annulée'); } });
    ecrire('prestation.statut', { id: d.id, statut: d.v }, d.v === 'realisee' ? 'Mission réalisée' : 'Prestation en cours', d.v === 'realisee' ? 'finalisation' : 'validation');
  },

  /* ---- projets */
  nouveauProjet: function () { formProjet(null); },
  modifierProjet: function (el, d) { formProjet(S.db.projets[d.id]); },
  jalon: function (el, d) { ecrire('projet.jalon', { id: d.id, index: +d.i, fait: el.checked }, el.checked ? 'Jalon atteint' : 'Jalon rouvert', el.checked ? 'finalisation' : 'validation').catch(function (e) { el.checked = !el.checked; toast(e.message, true); }); },

  /* ---- contacts */
  nouveauContact: function () { formContact(null); },
  modifierContact: function (el, d) { formContact(S.db.tiers[d.id]); },
  noteContact: function (el, d) { formulaire({ titre: 'Note sur ' + nomDe('tiers', d.id), champs: [{ k: 'texte', l: 'Note', t: 'long', req: true }], bouton: 'Ajouter', envoyer: function (v) { return ecrire('tiers.note', { id: d.id, texte: v.texte }, 'Note ajoutée'); } }); },

  /* ---- accès et structure */
  nouvelUtilisateur: function () { formUtilisateur(null); },
  modifierUtilisateur: function (el, d) { formUtilisateur(S.db.utilisateurs[d.id]); },
  nouvelleSociete: function () { formSociete(null); },
  modifierSociete: function (el, d) { formSociete(S.db.societes[d.id]); },
  nouvelleBranche: function (el, d) {
    formulaire({ titre: 'Nouvelle branche d’activité', champs: [{ k: 'societeId', l: 'Société', t: 'select', opts: choixSocietes(), req: true, defaut: d.id || '' }, { k: 'nom', l: 'Nom de la branche', t: 'texte', req: true }, { k: 'type', l: 'Type d’activité', t: 'select', opts: opts(L.typeBranche), req: true }],
      envoyer: function (v) { return ecrire('branche.creer', v, 'Branche créée'); } });
  },

  /* ---- réglages */
  prefSons: function () { S.prefs.sons = !S.prefs.sons; sauverPrefs(); if (S.prefs.sons) SONS.preparer(); SONS.regler(S.prefs); if (S.prefs.sons) SONS.jouer('validation'); App.rendre(true); App.coquille(); },
  prefAmbiance: function () { S.prefs.ambiance = !S.prefs.ambiance; sauverPrefs(); if (S.prefs.ambiance) SONS.preparer(); SONS.ambiance(S.prefs.ambiance); App.rendre(true); App.coquille(); },
  prefTheme: function () { S.prefs.theme = S.prefs.theme === 'sombre' ? 'clair' : 'sombre'; sauverPrefs(); App.theme(); App.rendre(true); },
  prefPalette: function (el, d) { S.prefs.palette = d.v; sauverPrefs(); App.theme(); App.rendre(true); SONS.jouer('validation'); toast('Palette « ' + PALETTES[d.v].nom + ' » appliquée'); },
  prefBarre: function () { S.prefs.barre = S.prefs.barre === 'mini' ? 'ouverte' : 'mini'; sauverPrefs(); App.coquille(); App.rendre(true); },
  prefGarder: function () { S.prefs.garder = !S.prefs.garder; sauverPrefs(); if (!S.prefs.garder) Local.effacer('le.etat'); App.rendre(true); },
  ecouterSignature: function () { SONS.preparer(); SONS.jouer('signature', true); },
  installer: function () { if (App.invitation) { App.invitation.prompt(); App.invitation = null; } },
  changerCode: function () {
    formulaire({ titre: 'Modifier mon code', champs: [{ k: 'ancien', l: 'Code actuel', t: 'code', req: true, plein: true }, { k: 'nouveau', l: 'Nouveau code (8 caractères au moins)', t: 'code', req: true }, { k: 'confirmation', l: 'Confirmation', t: 'code', req: true }], bouton: 'Modifier',
      envoyer: function (v) { if (v.nouveau !== v.confirmation) return Promise.reject(new Error('Les deux codes ne sont pas identiques.')); return API.changerCode(v.ancien, v.nouveau).then(function () { toast('Code modifié'); SONS.jouer('validation'); }); } });
  },
  mfa: function () {
    attente(true);
    API.mfa('debut').then(function (r) {
      attente(false);
      formulaire({ titre: 'Double authentification', intro: '<p class="texte-2" style="font-size:14px;margin:0 0 14px">Dans votre application d’authentification (Mots de passe d’Apple, Google Authenticator, Microsoft Authenticator), ajoutez un compte avec cette clé, ou touchez le lien depuis ce téléphone.</p><div class="calcul" style="margin-bottom:16px;word-break:break-all"><b>Clé :</b> ' + esc(r.secret.replace(/(.{4})/g, '$1 ')) + '<br><a class="or" href="' + esc(r.uri) + '">Ouvrir dans l’application d’authentification</a></div>',
        champs: [{ k: 'code', l: 'Code à 6 chiffres affiché par l’application', t: 'texte', req: true, plein: true }], bouton: 'Activer',
        envoyer: function (v) { return API.mfa('confirmer', v.code).then(function () { toast('Double authentification activée'); SONS.jouer('finalisation'); return App.recharger(); }); } });
    }, function (e) { attente(false); toast(e.message, true); });
  },
  deconnexion: function () { SONS.ambiance(false); API.deconnexion().then(function () { Local.effacer('le.etat'); App.porte(); }); },
  profilDemo: function (el, d) { API.profil(d.v); S.filtre = { societeId: '', branchId: '', bienId: '', periode: S.filtre.periode, debut: S.filtre.debut, fin: S.filtre.fin }; sauverFiltre(); App.recharger().then(function () { toast('Vous voyez maintenant l’application comme : ' + S.moi.nom); location.hash = '#/accueil'; }); },
  reinitDemo: function () { confirmer({ titre: 'Réinitialiser la démonstration', texte: 'Les données fictives sont recréées ; vos essais sont effacés de ce navigateur.', bouton: 'Réinitialiser', action: function () { API.reinitialiser(); return App.recharger().then(function () { toast('Démonstration réinitialisée'); }); } }); }
};

/* ================================================================== FORMULAIRES MÉTIER */
function formBien(b) {
  var cols = [{ k: 'nom', l: 'Saison' }, { k: 'du', l: 'Du (JJ/MM)' }, { k: 'au', l: 'Au (JJ/MM)' }, { k: 'prix', l: 'Prix / nuit', t: 'number' }]; cols.titre = 'Tarifs de saison';
  var saisons = (b && b.saisons || []).map(function (s) { return { nom: s.nom, du: s.du.split('-').reverse().join('/'), au: s.au.split('-').reverse().join('/'), prix: s.prix }; });
  var fin = peut('finance'), meuble = function (v) { return v.mode === 'location_meublee'; }, gere = function (v) { return v.mode === 'gestion_locative'; };
  formulaire({ titre: b ? 'Modifier le bien' : 'Nouveau bien', surtitre: b ? b.nom : 'Luxury Residences · Wealth & Property', valeurs: b || { ville: 'Abidjan', mode: 'location_meublee', type: 'appartement', branchId: brancheParDefaut(['residences', 'patrimoine']), remiseSemaine: 10, remiseMois: 20, valeurType: 'estimation' },
    champs: [
      { k: 'nom', l: 'Nom du bien', t: 'texte', req: true, plein: true },
      { k: 'branchId', l: 'Branche', t: 'select', opts: choixBranches(['residences', 'patrimoine', 'autre']), req: true },
      { k: 'mode', l: 'Mode de gestion', t: 'select', opts: opts(L.modeBien), req: true },
      { k: 'type', l: 'Type', t: 'select', opts: opts(L.typeBien), req: true },
      { k: 'quartier', l: 'Quartier', t: 'texte' }, { k: 'ville', l: 'Ville', t: 'texte' }, { k: 'adresse', l: 'Adresse ou repère', t: 'texte' },
      { k: 'chambres', l: 'Chambres', t: 'nombre' }, { k: 'capacite', l: 'Capacité (personnes)', t: 'nombre', si: meuble }, { k: 'surface', l: 'Surface (m²)', t: 'nombre' },
      fin ? { k: 'tarifNuit', l: 'Tarif de base par nuit', t: 'montant', si: meuble } : null,
      fin ? { k: 'remiseSemaine', l: 'Remise 7 nuits et plus (%)', t: 'nombre', si: meuble } : null, fin ? { k: 'remiseMois', l: 'Remise 28 nuits et plus (%)', t: 'nombre', si: meuble } : null,
      { k: 'proprietaireId', l: 'Propriétaire', t: 'select', opts: choixTiers(['proprietaire'], '— Choisir —'), si: gere },
      fin ? { k: 'loyerMensuel', l: 'Loyer mensuel', t: 'montant', si: gere } : null, fin ? { k: 'commission', l: 'Honoraires de gestion (%)', t: 'nombre', si: gere } : null,
      fin ? { k: 'valeurEstimee', l: 'Valeur du bien', t: 'montant' } : null, fin ? { k: 'valeurType', l: 'Nature de la valeur', t: 'select', opts: opts(L.valeurType), aide: 'Une estimation interne n’est pas une expertise.' } : null,
      { k: 'equipements', l: 'Équipements', t: 'liste', plein: true }, { k: 'description', l: 'Description', t: 'long' }
    ],
    apresChamps: fin ? '<div class="sous-liste-env" data-si-meuble style="grid-column:1/-1">' + lignesSousListe(cols, saisons, 'saisons') + '</div>' : '',
    change: function (v, form) { var z = form.querySelector('[data-si-meuble]'); if (z) z.classList.toggle('cache', v.mode !== 'location_meublee'); },
    bouton: b ? 'Enregistrer' : 'Créer le bien',
    envoyer: function (v, form) {
      var d = Object.assign({}, v);
      if (fin && v.mode === 'location_meublee') d.saisons = lireSousListe(form, 'saisons').map(function (s) {
        var c = function (x) { var m = /^(\d{1,2})[\/\-.](\d{1,2})$/.exec(x || ''); if (!m) throw new Error('Saison « ' + (s.nom || '') + ' » : dates au format JJ/MM.'); return ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); };
        return { nom: s.nom || 'Saison', du: c(s.du), au: c(s.au), prix: +s.prix || 0 };
      });
      Object.keys(d).forEach(function (k) { if (d[k] === '' && !b) delete d[k]; else if (d[k] === '') d[k] = null; });
      if (b) { d.id = b.id; return ecrire('bien.modifier', d, 'Bien enregistré'); }
      return ecrire('bien.creer', d, 'Bien créé', 'finalisation').then(function (r) { location.hash = '#/bien/' + r.id; });
    } });
}

function formReservation(bienId, date, clientId) {
  var fin = peut('finance'), debut = date || S.auj;
  formulaire({ titre: 'Nouvelle réservation', surtitre: 'Luxury Residences', valeurs: { bienId: bienId, debut: debut, fin: LE.decaler(debut, 3), clientId: clientId, source: 'direct', voyageurs: 2 },
    champs: [
      { k: 'bienId', l: 'Résidence', t: 'select', opts: choixBiens(function (b) { return b.mode === 'location_meublee' && (b.etat || 'actif') === 'actif'; }, '— Choisir —'), req: true, plein: true },
      { k: 'clientId', l: 'Client', t: 'select', opts: choixTiers(['client', 'prospect']), plein: true },
      { k: 'clientNom', l: 'Nom du client', t: 'texte', req: true, si: function (v) { return !v.clientId; } },
      { k: 'telephone', l: 'Téléphone', t: 'tel', si: function (v) { return !v.clientId; } },
      { k: 'ficheClient', l: 'Créer sa fiche dans les contacts', t: 'case', defaut: true, si: function (v) { return !v.clientId; } },
      { k: 'debut', l: 'Arrivée', t: 'date', req: true }, { k: 'fin', l: 'Départ', t: 'date', req: true },
      { k: 'voyageurs', l: 'Voyageurs', t: 'nombre' }, { k: 'heureArrivee', l: 'Heure d’arrivée', t: 'heure' },
      { k: 'source', l: 'Origine', t: 'select', opts: opts(L.sourceReservation) },
      fin ? { k: 'caution', l: 'Caution demandée', t: 'montant' } : null,
      fin ? { k: 'montant', l: 'Montant du séjour', t: 'montant', aide: 'Laissez vide : calcul automatique selon les tarifs, saisons et remises.' } : null,
      { k: 'option', l: 'Simple option (non confirmée, pas encore facturée)', t: 'case' },
      { k: 'notes', l: 'Notes', t: 'long' }
    ],
    calcul: function (v) {
      var b = S.db.biens[v.bienId]; if (!b || !LE.estDate(v.debut) || !LE.estDate(v.fin)) return '';
      if (v.fin <= v.debut) return '<b>Le départ doit suivre l’arrivée.</b>';
      var c = LE.conflitSejour(S.db, b.id, v.debut, v.fin); if (c) return '<b style="color:var(--urg)">Indisponible.</b> ' + esc(c);
      var t = LE.tarifSejour(b, v.debut, v.fin), cap = b.capacite && v.voyageurs > b.capacite ? ' · <span style="color:var(--att)">capacité ' + b.capacite + ' personnes</span>' : '';
      if (!fin) return '<b>Disponible.</b> ' + t.nuits + ' nuit(s)' + cap;
      return '<b>Disponible · ' + t.nuits + ' nuit(s).</b> ' + Object.keys(t.detail).map(function (k) { return t.detail[k] + ' × ' + esc(k.toLowerCase()); }).join(', ') + (t.remise ? ' · remise ' + t.remise + ' %' : '') + ' → <b>' + fc(t.total) + '</b>' + (v.montant ? ' (montant saisi : ' + fc(v.montant) + ')' : '') + cap;
    },
    bouton: 'Enregistrer la réservation',
    envoyer: function (v) {
      var d = sansVides({ bienId: v.bienId, clientId: v.clientId, clientNom: v.clientId ? '' : v.clientNom, telephone: v.telephone, debut: v.debut, fin: v.fin, voyageurs: v.voyageurs, heureArrivee: v.heureArrivee, source: v.source, caution: v.caution, montant: v.montant, notes: v.notes });
      d.option = !!v.option; d.creerFiche = !v.clientId && !!v.ficheClient;
      return ecrire('reservation.creer', d, v.option ? 'Option enregistrée' : 'Réservation confirmée · facture émise', 'finalisation');
    } });
}

function formEncaissement(factureId) {
  var ouvertes = trierPar(V(S.db.factures).filter(function (f) { return f.statut !== 'annulee' && dansFiltre(f) && LE.soldeFacture(S.db, f) > 0 || f.id === factureId; }), function (f) { return f.echeance || f.date; });
  if (!ouvertes.length) return toast('Aucune facture à encaisser sur ce périmètre.', true);
  var reste = function (id) { var f = S.db.factures[id]; if (!f) return 0; return LE.soldeFacture(S.db, f) - LE.somme(V(S.db.paiements).filter(function (p) { return p.factureId === id && p.statut === 'en_attente'; }), function (p) { return p.montant; }); };
  var f0 = factureId || ouvertes[0].id;
  var form = formulaire({ titre: 'Encaissement', surtitre: 'Finance', valeurs: { factureId: f0, montant: reste(f0), date: S.auj, mode: 'virement' },
    champs: [
      { k: 'factureId', l: 'Facture', t: 'select', opts: ouvertes.map(function (f) { return [f.id, f.numero + ' · ' + (f.clientNom || nomDe('tiers', f.tiersId) || '') + ' · reste ' + fc(LE.soldeFacture(S.db, f))]; }), req: true, plein: true },
      { k: 'montant', l: 'Montant reçu', t: 'montant', req: true }, { k: 'date', l: 'Date', t: 'date', req: true },
      { k: 'mode', l: 'Moyen de paiement', t: 'select', opts: opts(L.modePaiement), req: true },
      { k: 'compteId', l: 'Compte crédité', t: 'select', opts: choixComptes((S.db.factures[f0] || {}).societeId) },
      { k: 'reference', l: 'Référence (transaction, virement)', t: 'texte' },
      { k: 'confirme', l: 'Paiement vérifié (relevé bancaire, reçu Mobile Money ou espèces comptées)', t: 'case', aide: 'Sans vérification, le paiement reste « en attente » et n’est pas compté dans l’encaissé.' }
    ],
    calcul: function (v) { var r = reste(v.factureId); return r ? 'Reste à encaisser : <b>' + fc(r) + '</b>' + (v.montant && v.montant < r ? ' · après ce paiement : ' + fc(r - v.montant) : v.montant > r ? ' · <b style="color:var(--urg)">montant supérieur au reste</b>' : ' · facture soldée') : ''; },
    change: function (v, f) {
      if (v.factureId !== f._facture) { f._facture = v.factureId; var m = f.querySelector('[name=montant]'); m.value = nombre(reste(v.factureId)); var c = f.querySelector('[name=compteId]'); c.innerHTML = choixComptes((S.db.factures[v.factureId] || {}).societeId).map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join(''); }
    },
    bouton: 'Enregistrer',
    envoyer: function (v) { return ecrire('paiement.creer', sansVides({ factureId: v.factureId, montant: v.montant, date: v.date, mode: v.mode, compteId: v.compteId, reference: v.reference, confirme: v.confirme }), v.confirme ? 'Encaissement confirmé · reçu numéroté' : 'Paiement noté · en attente de confirmation', v.confirme ? 'finalisation' : 'validation'); } });
  form.querySelector('form')._facture = f0;
}

function formFacture(projetId, prestationId) {
  var pj = projetId && S.db.projets[projetId], pr = prestationId && S.db.prestations[prestationId], val = { date: S.auj, echeance: LE.decaler(S.auj, 15), objetType: 'autre', branchId: brancheParDefaut() };
  if (pj) Object.assign(val, { branchId: pj.branchId, tiersId: pj.clientId || '', bienId: pj.bienId || '', objetType: 'projet', libelle: pj.nom + ' · situation' });
  if (pr) Object.assign(val, { branchId: pr.branchId, tiersId: pr.clientId || '', clientNom: pr.clientId ? '' : pr.clientNom, objetType: 'prestation', libelle: pr.libelle, montant: pr.prix, echeance: LE.decaler(S.auj, 7) });
  formulaire({ titre: 'Nouvelle facture', surtitre: pj ? pj.nom : pr ? 'Conciergerie' : 'Finance', valeurs: val,
    champs: [
      { k: 'branchId', l: 'Activité qui facture', t: 'select', opts: choixBranches(), req: true, plein: true },
      { k: 'tiersId', l: 'Client', t: 'select', opts: choixTiers(null, '— Autre client —') },
      { k: 'clientNom', l: 'Nom du client', t: 'texte', si: function (v) { return !v.tiersId && !v.interneSocieteId; } },
      { k: 'interneSocieteId', l: 'Facture interne à une société du groupe', t: 'select', opts: choixSocietes('Non, client extérieur'), aide: 'Les flux internes sont neutralisés dans la vue consolidée du groupe.' },
      { k: 'bienId', l: 'Bien concerné', t: 'select', opts: choixBiens(null, 'Aucun') },
      { k: 'objetType', l: 'Nature', t: 'select', opts: opts(L.objetFacture) },
      { k: 'libelle', l: 'Libellé', t: 'texte', req: true, plein: true },
      { k: 'date', l: 'Date', t: 'date', req: true }, { k: 'echeance', l: 'Échéance', t: 'date', req: true },
      { k: 'montant', l: 'Montant hors taxes', t: 'montant', req: true }, { k: 'taxe', l: 'Taxes', t: 'montant', aide: 'Saisie libre : aucune règle fiscale n’est présumée.' }
    ],
    bouton: 'Émettre la facture',
    envoyer: function (v) {
      var d = sansVides(Object.assign({}, v));
      if (pj) d.objetId = pj.id; if (pr) d.objetId = pr.id;
      if (!d.tiersId && !d.clientNom && !d.interneSocieteId) return Promise.reject(new Error('Indiquez le client.'));
      return ecrire('facture.creer', d, 'Facture émise', 'finalisation');
    } });
}

function formDepense(bienId, projetId) {
  var pj = projetId && S.db.projets[projetId], b = bienId && S.db.biens[bienId];
  var val = { date: S.auj, statut: 'payee', categorie: pj ? 'travaux' : 'entretien', branchId: pj ? pj.branchId : b ? b.branchId : brancheParDefaut(), bienId: bienId || (pj && pj.bienId) || '', projetId: projetId || '', mode: 'virement' };
  formulaire({ titre: 'Nouvelle dépense', surtitre: pj ? pj.nom : b ? b.nom : 'Finance', valeurs: val,
    champs: [
      { k: 'libelle', l: 'Libellé', t: 'texte', req: true, plein: true },
      { k: 'montant', l: 'Montant', t: 'montant', req: true }, { k: 'date', l: 'Date', t: 'date', req: true },
      { k: 'categorie', l: 'Catégorie', t: 'select', opts: opts(L.categorieDepense), req: true },
      { k: 'branchId', l: 'Activité', t: 'select', opts: choixBranches(), req: true },
      { k: 'bienId', l: 'Bien', t: 'select', opts: choixBiens(null, 'Aucun') },
      { k: 'projetId', l: 'Projet', t: 'select', opts: [['', 'Aucun']].concat(V(S.db.projets).filter(function (p) { return p.statut === 'en_cours' || p.id === projetId; }).map(function (p) { return [p.id, p.nom]; })) },
      { k: 'fournisseurId', l: 'Fournisseur', t: 'select', opts: choixTiers(['fournisseur', 'prestataire', 'partenaire'], '— Autre —') },
      { k: 'fournisseurNom', l: 'Nom du fournisseur', t: 'texte', si: function (v) { return !v.fournisseurId; } },
      { k: 'statut', l: 'Situation', t: 'select', opts: [['payee', 'Déjà payée'], ['engagee', 'Engagée, à payer']], req: true },
      { k: 'mode', l: 'Moyen de paiement', t: 'select', opts: opts(L.modePaiement), si: function (v) { return v.statut === 'payee'; } },
      { k: 'compteId', l: 'Compte débité', t: 'select', opts: choixComptes(), si: function (v) { return v.statut === 'payee'; } },
      { k: 'interneSocieteId', l: 'Facturée par une société du groupe', t: 'select', opts: choixSocietes('Non') }
    ],
    apresChamps: CHAMP_PHOTO, bouton: 'Enregistrer la dépense',
    envoyer: function (v, form) { return envoyerFichier(form).then(function (ph) { var d = sansVides(Object.assign({}, v)); if (ph) d.justificatif = ph; if (d.statut !== 'payee') { delete d.mode; delete d.compteId; } return ecrire('depense.creer', d, 'Dépense enregistrée'); }); } });
}

function formTache(t, bienId) {
  formulaire({ titre: t ? 'Modifier la tâche' : 'Nouvelle tâche', surtitre: 'Team & Operations', valeurs: t ? Object.assign({}, t, { checklist: (t.checklist || []).map(function (x) { return x.t; }) }) : { date: S.auj, priorite: 'normale', type: 'autre', bienId: bienId || '', branchId: brancheParDefaut() },
    champs: [
      { k: 'titre', l: 'Tâche', t: 'texte', req: true, plein: true },
      { k: 'type', l: 'Type', t: 'select', opts: opts(L.typeTache) }, { k: 'priorite', l: 'Priorité', t: 'select', opts: opts(L.priorite) },
      { k: 'bienId', l: 'Bien', t: 'select', opts: choixBiens(null, 'Aucun bien en particulier') },
      { k: 'branchId', l: 'Activité', t: 'select', opts: choixBranches(), si: function (v) { return !v.bienId; } },
      { k: 'date', l: 'Date', t: 'date', req: true }, { k: 'heure', l: 'Heure', t: 'heure' },
      { k: 'assigneId', l: 'Confiée à', t: 'select', opts: choixPersonnes(['agenda']), plein: true },
      t ? null : { k: 'checklist', l: 'Points de contrôle', t: 'liste', aide: 'Séparés par des virgules ; chacun devra être coché.' },
      { k: 'notes', l: 'Consignes', t: 'long' }
    ],
    bouton: t ? 'Enregistrer' : 'Créer la tâche',
    envoyer: function (v) {
      var d = sansVides(Object.assign({}, v)); if (d.bienId) delete d.branchId;
      if (t) { d.id = t.id; delete d.checklist; return ecrire('tache.modifier', d, 'Tâche modifiée'); }
      return ecrire('tache.creer', d, 'Tâche créée' + (d.assigneId ? ' et attribuée' : ''));
    } });
}

function formPrestation(p) {
  var fin = peut('finance');
  formulaire({ titre: p ? 'Modifier la prestation' : 'Nouvelle demande', surtitre: 'Private Concierge', valeurs: p || { date: S.auj, priorite: 'normale', type: 'transfert', branchId: brancheParDefaut(['conciergerie']) },
    champs: [
      { k: 'branchId', l: 'Activité', t: 'select', opts: choixBranches(['conciergerie', 'residences']), req: true },
      { k: 'type', l: 'Type de prestation', t: 'select', opts: opts(L.typePrestation), req: true },
      { k: 'libelle', l: 'Demande', t: 'texte', req: true, plein: true },
      { k: 'clientId', l: 'Client', t: 'select', opts: choixTiers(['client', 'prospect']) },
      { k: 'clientNom', l: 'Nom du client', t: 'texte', si: function (v) { return !v.clientId; } },
      { k: 'date', l: 'Date', t: 'date', req: true }, { k: 'heure', l: 'Heure', t: 'heure' },
      { k: 'priorite', l: 'Priorité', t: 'select', opts: opts(L.priorite) },
      { k: 'assigneId', l: 'Confiée à', t: 'select', opts: choixPersonnes(['conciergerie', 'agenda'], 'À attribuer') },
      { k: 'bienId', l: 'Lieu (résidence)', t: 'select', opts: choixBiens(function (b) { return b.mode === 'location_meublee'; }, 'Aucun') },
      fin ? { k: 'prix', l: 'Prix au client', t: 'montant' } : null, fin ? { k: 'cout', l: 'Coût (prestataire, achats)', t: 'montant' } : null,
      { k: 'notes', l: 'Détails', t: 'long' }
    ],
    calcul: fin ? function (v) { return v.prix ? 'Marge prévue : <b>' + fc((v.prix || 0) - (v.cout || 0)) + '</b>' + (v.prix ? ' · ' + pct(((v.prix || 0) - (v.cout || 0)) / v.prix) : '') : ''; } : null,
    bouton: p ? 'Enregistrer' : 'Créer la demande',
    envoyer: function (v) { var d = sansVides(Object.assign({}, v)); if (p) { d.id = p.id; if (p.statut === 'demandee' && d.assigneId) { return ecrire('prestation.modifier', d, 'Prestation attribuée').then(function () { return ecrire('prestation.statut', { id: p.id, statut: 'planifiee' }, 'Prestation planifiée'); }); } return ecrire('prestation.modifier', d, 'Prestation modifiée'); } return ecrire('prestation.creer', d, 'Demande enregistrée', 'notification'); } });
}

function formProjet(p) {
  var cols = [{ k: 'nom', l: 'Jalon' }, { k: 'date', l: 'Date', t: 'date' }, { k: 'poids', l: 'Poids', t: 'number' }]; cols.titre = 'Jalons (le poids sert au calcul de l’avancement)';
  formulaire({ titre: p ? 'Modifier le projet' : 'Nouveau projet', surtitre: 'Projects & Renovation · Interior Studio', valeurs: p || { type: 'renovation', debut: S.auj, branchId: brancheParDefaut(['travaux', 'decoration']) },
    champs: [
      { k: 'nom', l: 'Nom du projet', t: 'texte', req: true, plein: true },
      { k: 'branchId', l: 'Activité', t: 'select', opts: choixBranches(['travaux', 'decoration', 'autre']), req: true },
      { k: 'type', l: 'Type', t: 'select', opts: opts(L.typeProjet), req: true },
      { k: 'bienId', l: 'Bien concerné', t: 'select', opts: choixBiens(null, 'Aucun · chantier extérieur') },
      { k: 'clientId', l: 'Client', t: 'select', opts: choixTiers(['client', 'proprietaire', 'prospect'], 'Aucun · projet interne') },
      peut('finance') ? { k: 'budget', l: 'Budget prévisionnel', t: 'montant' } : null,
      { k: 'debut', l: 'Début', t: 'date' }, { k: 'finPrevue', l: 'Livraison prévue', t: 'date' },
      p ? { k: 'statut', l: 'Statut', t: 'select', opts: opts(L.statutProjet) } : null,
      { k: 'description', l: 'Brief, inspirations, contraintes', t: 'long' }
    ],
    apresChamps: lignesSousListe(cols, (p && p.jalons || []).map(function (j) { return { nom: j.nom, date: j.date, poids: j.poids }; }), 'jalons'),
    bouton: p ? 'Enregistrer' : 'Créer le projet',
    envoyer: function (v, form) {
      var d = sansVides(Object.assign({}, v)), anciens = p ? p.jalons || [] : [];
      d.jalons = lireSousListe(form, 'jalons').map(function (j) { var a = anciens.filter(function (x) { return x.nom === j.nom; })[0]; return { nom: j.nom, date: j.date || null, poids: +j.poids || 1, fait: a ? a.fait : false, faitLe: a ? a.faitLe : null }; });
      if (p) { d.id = p.id; return ecrire('projet.modifier', d, 'Projet enregistré'); }
      return ecrire('projet.creer', d, 'Projet créé', 'finalisation').then(function (r) { location.hash = '#/projet/' + r.id; });
    } });
}

function formContact(t) {
  formulaire({ titre: t ? 'Modifier le contact' : 'Nouveau contact', surtitre: 'CRM & Relations clients', valeurs: t || { type: 'client', segment: 'standard', societeId: S.filtre.societeId },
    champs: [
      { k: 'type', l: 'Type', t: 'select', opts: opts(L.typeTiers), req: true }, { k: 'segment', l: 'Segment', t: 'select', opts: opts(L.segment) },
      { k: 'nom', l: 'Nom', t: 'texte', req: true, plein: true }, { k: 'telephone', l: 'Téléphone', t: 'tel' }, { k: 'email', l: 'E-mail', t: 'email' },
      { k: 'ville', l: 'Ville', t: 'texte' }, { k: 'canal', l: 'Préférence de contact', t: 'texte' },
      { k: 'societeId', l: 'Société', t: 'select', opts: choixSocietes('Commun au groupe') },
      { k: 'preferences', l: 'Préférences communiquées par le client', t: 'long', aide: 'Uniquement ce que le client a communiqué volontairement.' },
      { k: 'notes', l: 'Notes internes', t: 'long' }
    ],
    bouton: t ? 'Enregistrer' : 'Créer le contact',
    envoyer: function (v) { var d = Object.assign({}, v); if (t) { d.id = t.id; Object.keys(d).forEach(function (k) { if (d[k] === '') d[k] = null; }); return ecrire('tiers.modifier', d, 'Contact enregistré'); } return ecrire('tiers.creer', sansVides(d), 'Contact créé').then(function (r) { location.hash = '#/contact/' + r.id; }); } });
}

function formUtilisateur(u) {
  var socs = [['*', 'Tout le groupe']].concat(V(S.db.societes).map(function (s) { return [s.id, s.nom]; })), M = { tableau: 'Tableau de bord', finance: 'Finances', reservations: 'Réservations', biens: 'Biens', conciergerie: 'Conciergerie', projets: 'Projets', tiers: 'Contacts', journal: 'Journal', rapports: 'Rapports' };
  var val = u ? { nom: u.nom, email: u.email, role: u.role, fonction: u.fonction, expire: u.expire, societes: (u.perimetre || {}).societes || ['*'], branches: (u.perimetre || {}).branches || [], retires: Object.keys(u.modules || {}).filter(function (k) { return u.modules[k] === 0; }), tiersId: u.tiersId } : { role: 'collaborateur', societes: S.filtre.societeId ? [S.filtre.societeId] : [] };
  var f = formulaire({ titre: u ? u.nom : 'Nouvel accès', surtitre: u ? LE.ROLES[u.role].nom : 'Accès', valeurs: val,
    champs: [
      { k: 'nom', l: 'Nom', t: 'texte', req: true }, u ? null : { k: 'email', l: 'E-mail de connexion', t: 'email', req: true },
      { k: 'role', l: 'Rôle', t: 'select', opts: Object.keys(LE.ROLES).map(function (r) { return [r, LE.ROLES[r].nom]; }), req: true }, { k: 'fonction', l: 'Fonction', t: 'texte' },
      { k: 'societes', l: 'Sociétés autorisées', t: 'multi', opts: socs },
      { k: 'branches', l: 'Limiter à certaines branches (sinon toutes)', t: 'multi', opts: V(S.db.branches).map(function (b) { return [b.id, b.nom]; }), si: function (v) { return v.role === 'resp_metier' || v.role === 'comptable' || v.role === 'collaborateur'; } },
      { k: 'retires', l: 'Modules retirés à cette personne', t: 'multi', opts: Object.keys(M).map(function (k) { return [k, M[k]]; }), si: function (v) { return !LE.ROLES[v.role].propre && !LE.ROLES[v.role].portail; } },
      { k: 'tiersId', l: 'Fiche propriétaire liée', t: 'select', opts: choixTiers(['proprietaire'], 'Aucune'), si: function (v) { return v.role === 'proprietaire'; } },
      { k: 'expire', l: 'Accès valable jusqu’au', t: 'date', aide: 'Obligatoire pour un prestataire externe.' }
    ],
    intro: '<p class="texte-3" style="font-size:13px;margin:0 0 14px">' + (API.demo ? 'En démonstration, aucun code n’est envoyé.' : 'Après création, générez un code d’accès provisoire et transmettez-le en main propre.') + ' La double authentification est demandée pour la direction, les responsables de société et la comptabilité.</p>',
    apresChamps: u ? '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap">' + (u.id !== S.moi.id ? '<button type="button" class="bt ' + (u.actif ? 'danger' : '') + '" data-revoquer="' + u.id + '">' + (u.actif ? 'Révoquer l’accès' : 'Rétablir l’accès') + '</button>' : '') + (!API.demo && u.actif ? '<button type="button" class="bt" data-code="' + u.id + '">' + ic('cle') + 'Code d’accès provisoire</button>' : '') + '</div>' : '',
    bouton: u ? 'Enregistrer' : 'Créer l’accès',
    envoyer: function (v) {
      var modules = {}; (v.retires || []).forEach(function (m) { modules[m] = 0; });
      var d = { nom: v.nom, role: v.role, fonction: v.fonction || null, expire: v.expire || '', perimetre: { societes: v.societes && v.societes.length ? v.societes : ['*'], branches: v.branches || [] }, modules: modules, tiersId: v.tiersId || null };
      if (u) { d.id = u.id; return ecrire('utilisateur.modifier', d, 'Accès modifié'); }
      d.email = v.email; if (!d.expire) delete d.expire;
      return ecrire('utilisateur.creer', d, 'Accès créé', 'finalisation').then(function (r) { if (!API.demo) return API.codeAcces(r.id).then(montrerCode); });
    } });
  var bt = f.querySelector('[data-revoquer]');
  if (bt) bt.addEventListener('click', function () { Feuille.fermer(); ecrire('utilisateur.revoquer', { id: u.id, reactiver: !u.actif }, u.actif ? 'Accès révoqué immédiatement' : 'Accès rétabli'); });
  var bc = f.querySelector('[data-code]');
  if (bc) bc.addEventListener('click', function () { attente(true); API.codeAcces(u.id).then(function (r) { attente(false); Feuille.fermer(); montrerCode(r); }, function (e) { attente(false); toast(e.message, true); }); });
}
function montrerCode(r) {
  if (!r || !r.code) return;
  Feuille.ouvrir({ titre: 'Code d’accès provisoire', sous: 'À transmettre en main propre. Il ne sera plus affiché.', corps: '<div class="kpi-val" style="font-size:34px;letter-spacing:.2em;text-align:center;margin:20px 0">' + esc(r.code) + '</div><p class="texte-2" style="font-size:14px">Valable 72 heures. À la première connexion, la personne choisit son propre code' + (r.mfa ? ' puis active la double authentification' : '') + '.</p><p class="texte-3" style="font-size:13px">Adresse de l’application : ' + esc(location.origin + location.pathname) + '</p>', pied: '<button class="bt principal-bt" data-fermer-feuille>J’ai noté le code</button>' });
}
function formSociete(s) {
  formulaire({ titre: s ? 'Modifier la société' : 'Nouvelle société', surtitre: 'Structure du groupe', valeurs: s || { ville: 'Abidjan', forme: 'SARL' },
    champs: [{ k: 'nom', l: 'Raison sociale', t: 'texte', req: true, plein: true }, { k: 'forme', l: 'Forme juridique', t: 'texte' }, { k: 'initiales', l: 'Initiales (numéros de facture)', t: 'texte' }, { k: 'activite', l: 'Activité', t: 'texte', plein: true }, { k: 'ville', l: 'Ville', t: 'texte' }, { k: 'rccm', l: 'RCCM', t: 'texte' }],
    bouton: s ? 'Enregistrer' : 'Créer la société',
    envoyer: function (v) { if (s) return ecrire('societe.modifier', Object.assign({ id: s.id }, v), 'Société enregistrée'); return ecrire('societe.creer', sansVides(v), 'Société créée', 'finalisation'); } });
}

/* ================================================================== IMPRESSIONS (facture, reçu, relevé propriétaire) */
function imprimer(html) {
  var z = document.getElementById('impression'); if (!z) { z = document.createElement('div'); z.id = 'impression'; document.body.appendChild(z); }
  z.innerHTML = '<article class="rapport">' + html + '</article>';
  document.body.classList.add('mode-impression');
  setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('mode-impression'); }, 400); }, 60);
}
function enteteDoc(soc, titre, numero) {
  return '<div class="entete-rap"><div class="marque">' + MONOGRAMME + '<div><div class="marque-nom">LOFT ELEVEN</div><div class="marque-sous">' + esc(soc ? soc.nom : 'Private Office') + '</div></div></div><div style="text-align:right"><div class="surtitre">' + esc(titre) + '</div><div style="font-family:var(--serif);font-size:24px">' + esc(numero || '') + '</div></div></div>'
    + (API.demo ? '<p class="texte-3" style="font-size:12px;margin-top:12px"><b>Démonstration · document fictif sans valeur.</b></p>' : '');
}
function imprimerFacture(id) {
  var f = S.db.factures[id], soc = S.db.societes[f.societeId];
  imprimer(enteteDoc(soc, 'Facture', f.numero) + '<div class="grille g2" style="margin-top:28px"><div><div class="kpi-lib">Client</div><div style="font-size:16px;margin-top:6px">' + esc(f.clientNom || nomDe('tiers', f.tiersId) || nomDe('societes', f.interneSocieteId)) + '</div></div><div><div class="kpi-lib">Dates</div><div style="margin-top:6px">Émise le ' + dateCourte(f.date, true) + '<br>Échéance ' + dateCourte(f.echeance, true) + '</div></div></div>'
    + '<table class="tab" style="margin-top:28px"><thead><tr><th>Désignation</th><th class="num">Montant</th></tr></thead><tbody><tr><td>' + esc(f.libelle) + '</td><td class="num">' + fc(f.montant) + '</td></tr>' + (f.taxe ? '<tr><td>Taxes</td><td class="num">' + fc(f.taxe) + '</td></tr>' : '') + '</tbody><tfoot><tr><td>Total</td><td class="num">' + fc(LE.totalFacture(f)) + '</td></tr><tr><td>Déjà réglé</td><td class="num">' + fc(LE.totalFacture(f) - LE.soldeFacture(S.db, f)) + '</td></tr><tr><td>Reste à payer</td><td class="num">' + fc(LE.soldeFacture(S.db, f)) + '</td></tr></tfoot></table>'
    + '<p class="texte-3" style="font-size:12px;margin-top:30px">' + esc([soc.nom, soc.forme, soc.rccm ? 'RCCM ' + soc.rccm : '', soc.ville].filter(Boolean).join(' · ')) + '</p>');
}
function imprimerRecu(id) {
  var p = S.db.paiements[id], f = S.db.factures[p.factureId], soc = S.db.societes[f.societeId];
  imprimer(enteteDoc(soc, 'Reçu', p.numeroRecu) + '<p style="font-size:17px;margin-top:30px;line-height:1.7">Reçu de <b>' + esc(f.clientNom || nomDe('tiers', f.tiersId) || '') + '</b> la somme de <b>' + fc(p.montant) + '</b>, le ' + esc(dateLongue(p.date)) + ', par ' + esc(L.modePaiement[p.mode].toLowerCase()) + (p.reference ? ' (réf. ' + esc(p.reference) + ')' : '') + ',<br>au titre de : ' + esc(f.libelle) + ' · facture ' + esc(f.numero) + '.</p><p>Reste à payer sur cette facture : <b>' + fc(LE.soldeFacture(S.db, f)) + '</b></p><p class="texte-3" style="font-size:12px;margin-top:40px">Paiement confirmé le ' + dateCourte((p.confirmeLe || p.date).slice(0, 10), true) + '. ' + esc(soc.nom) + '</p>');
}
function imprimerReleve(bienId) {
  var b = S.db.biens[bienId], p = periodeCourante(), soc = S.db.societes[b.societeId];
  var loyers = V(S.db.factures).filter(function (f) { return f.bienId === bienId && f.objetType === 'loyer' && f.statut !== 'annulee'; });
  var recus = V(S.db.paiements).filter(function (x) { return x.statut === 'confirme' && x.date >= p.debut && x.date <= p.fin && loyers.some(function (f) { return f.id === x.factureId; }); });
  var hono = V(S.db.factures).filter(function (f) { return f.bienId === bienId && f.objetType === 'honoraires' && f.statut !== 'annulee' && f.date >= p.debut && f.date <= p.fin; });
  var charges = V(S.db.depenses).filter(function (x) { return x.bienId === bienId && x.statut === 'payee' && x.date >= p.debut && x.date <= p.fin && x.societeId === b.societeId; });
  var tL = LE.somme(recus, function (x) { return x.montant; }), tH = LE.somme(hono, function (f) { return LE.totalFacture(f); }), tC = LE.somme(charges, function (x) { return x.montant; });
  var impayes = loyers.filter(function (f) { return f.echeance < S.auj && LE.soldeFacture(S.db, f) > 0; });
  imprimer(enteteDoc(soc, 'Relevé de gestion', p.nom) + '<h1 style="margin-top:26px">' + esc(b.nom) + '</h1><div class="texte-2">Propriétaire : ' + esc(nomDe('tiers', b.proprietaireId)) + ' · du ' + dateCourte(p.debut, true) + ' au ' + dateCourte(p.fin, true) + '</div>'
    + '<h2>Loyers encaissés</h2><table class="tab"><tbody>' + recus.map(function (x) { return '<tr><td>' + dateCourte(x.date, true) + ' · ' + esc(S.db.factures[x.factureId].libelle) + '</td><td class="num">' + fc(x.montant) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr><td>Total encaissé</td><td class="num">' + fc(tL) + '</td></tr></tfoot></table>'
    + '<h2>Honoraires et charges</h2><table class="tab"><tbody>' + hono.map(function (f) { return '<tr><td>' + esc(f.libelle) + '</td><td class="num">− ' + fc(LE.totalFacture(f)) + '</td></tr>'; }).join('') + charges.map(function (x) { return '<tr><td>' + esc(x.libelle) + '</td><td class="num">− ' + fc(x.montant) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr><td>Net revenant au propriétaire</td><td class="num">' + fc(tL - tH - tC) + '</td></tr></tfoot></table>'
    + (impayes.length ? '<h2>Loyers impayés</h2><table class="tab"><tbody>' + impayes.map(function (f) { return '<tr><td>' + esc(f.libelle) + ' · échéance ' + dateCourte(f.echeance, true) + '</td><td class="num">' + fc(LE.soldeFacture(S.db, f)) + '</td></tr>'; }).join('') + '</tbody></table>' : '')
    + '<p class="texte-3" style="font-size:12px;margin-top:30px">Relevé établi à partir des opérations enregistrées. Seuls les paiements confirmés sont pris en compte.</p>');
}
