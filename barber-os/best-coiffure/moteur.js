/* BARBER OS (SoluGis) — moteur de calcul unique, sans dépendance.
   Le même code servira dans Apps Script. Montants en FCFA entiers, dates locales (Africa/Abidjan = UTC+0).
   Principe : rien n'est écrasé. Le stock est la somme des mouvements ; les commissions, la fidélité et les
   statistiques se recalculent à partir des ventes validées. Une annulation change donc tout de façon cohérente. */
window.BM = (function () {
  'use strict';
  var M = {};

  /* ---------- dates et montants ---------- */
  function d2(n) { return (n < 10 ? '0' : '') + n; }
  M.iso = function (d) { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + '-' + d2(d.getMonth() + 1) + '-' + d2(d.getDate()); };
  M.heure = function (ts) { var d = new Date(ts); return d2(d.getHours()) + ':' + d2(d.getMinutes()); };
  M.ajouter = function (iso, j) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + j); return M.iso(d); };
  M.jourSemaine = function (iso) { return (new Date(iso + 'T12:00:00').getDay() + 6) % 7; };   // 0 = lundi
  M.debutMois = function (iso) { return iso.slice(0, 8) + '01'; };
  M.nombre = function (n) { n = Math.round(+n || 0); var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (n < 0 ? '−' : '') + s; };
  M.F = function (n) { return M.nombre(n) + ' F'; };
  M.lireMontant = function (t) { var n = parseInt(String(t || '').replace(/[^\d]/g, ''), 10); return isNaN(n) ? 0 : n; };
  M.pct = function (a, b) { return b ? Math.round(a * 100 / b) : 0; };

  /* ---------- identifiants uniques (anti-doublon) ---------- */
  M.uid = function (appareil) { return (appareil || 'X') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); };

  /* ---------- panier ---------- */
  M.ligneBrut = function (l) { return l.q * l.pu; };
  M.ligneNet = function (l) { return l.offert ? 0 : Math.max(0, l.q * l.pu - (l.remise || 0)); };
  /* totaux d'un panier ou d'une transaction : remise globale répartie au prorata sur les lignes (pour la commission et la marge) */
  M.totaux = function (lignes, remiseGlobale) {
    var brut = 0, apresLignes = 0; lignes.forEach(function (l) { brut += M.ligneBrut(l); apresLignes += M.ligneNet(l); });
    var rg = Math.min(remiseGlobale || 0, apresLignes), total = apresLignes - rg;
    return { brut: brut, remises: brut - total, remiseGlobale: rg, total: total, coef: apresLignes ? total / apresLignes : 0 };
  };
  M.payeTotal = function (paiements) { return (paiements || []).reduce(function (s, p) { return s + (p.montant || 0); }, 0); };
  M.rendu = function (paiements) { return (paiements || []).reduce(function (s, p) { return s + (p.rendu || 0); }, 0); };

  /* ---------- stock : somme des mouvements ---------- */
  M.stocks = function (mouvements) { var s = {}; mouvements.forEach(function (m) { s[m.produit] = (s[m.produit] || 0) + m.q; }); return s; };
  M.etatStock = function (p, q) { return q <= 0 ? 'rupture' : q <= (p.seuil || 0) ? 'bas' : 'ok'; };
  /* mouvements créés par une vente : produits vendus + consommables standards des prestations.
     Les produits comptés en FLACONS (remarque n° 6) ne bougent pas à la vente : on les retire avec « Flacon terminé » ;
     leur consommation standard (en ml) sert seulement à estimer le flacon en cours et le coût. */
  M.mouvementsVente = function (tx, prestations, uid, produits) {
    var parId = {}, A = {}; prestations.forEach(function (p) { parId[p.id] = p; }); (produits || []).forEach(function (a) { A[a.id] = a; });
    var out = [];
    tx.lignes.forEach(function (l) {
      if (l.type === 'A') out.push({ id: uid(), produit: l.ref, type: 'vente', q: -l.q, tx: tx.id, ts: tx.ts, par: tx.caissier });
      else if (parId[l.ref] && parId[l.ref].conso) parId[l.ref].conso.forEach(function (c) { if (A[c.produit] && A[c.produit].unite === 'flacon') return; out.push({ id: uid(), produit: c.produit, type: 'conso', q: -c.q * l.q, tx: tx.id, ts: tx.ts, par: tx.caissier }); });
    });
    return out;
  };
  /* coût d'une unité de consommation : pour un flacon, prix du flacon ÷ contenance (coût d'un ml) */
  M.coutConsoUnitaire = function (a) { return a.unite === 'flacon' ? (a.achat || 0) / (a.contenance || 1) : (a.achat || 0); };
  /* flacon en cours : ml utilisés (d'après les prestations vendues) depuis le dernier « Flacon terminé » */
  M.flaconEnCours = function (a, txs, prestations, mouvements) {
    var t0 = 0, parId = {}; prestations.forEach(function (p) { parId[p.id] = p; });
    mouvements.forEach(function (m) { if (m.produit === a.id && m.type === 'termine' && m.ts > t0) t0 = m.ts; });
    var utilise = 0;
    txs.forEach(function (x) {
      if (x.statut !== 'validee' || x.ts <= t0) return;
      x.lignes.forEach(function (l) { var p = l.type === 'P' && parId[l.ref]; if (p && p.conso) p.conso.forEach(function (c) { if (c.produit === a.id) utilise += c.q * l.q; }); });
    });
    var c = a.contenance || 1, reste = Math.max(0, c - utilise);
    return { utilise: utilise, reste: reste, pct: Math.round(reste * 100 / c), depuis: t0 };
  };
  /* annulation : chaque mouvement de la vente est compensé (jamais supprimé) */
  M.mouvementsAnnulation = function (tx, mouvements, uid, par) {
    return mouvements.filter(function (m) { return m.tx === tx.id && (m.type === 'vente' || m.type === 'conso'); })
      .map(function (m) { return { id: uid(), produit: m.produit, type: 'annulation', q: -m.q, tx: tx.id, ts: Date.now(), par: par }; });
  };

  /* ---------- commissions (calculées sur les lignes validées, après remises) ---------- */
  M.commissionLigne = function (l, coef, u) {
    if (!u || !u.commission) return 0;
    var base = M.ligneNet(l) * coef, taux = l.type === 'A' ? (u.commission.prod || 0) : (u.commission.prest || 0);
    return Math.round(base * taux / 100);
  };

  /* ---------- fidélité : X prestations « fidélité » payées = 1 offerte ---------- */
  M.fidelite = function (clientId, txs, regle) {
    var payees = 0, utilisees = 0;
    txs.forEach(function (t) {
      if (t.statut !== 'validee' || t.client !== clientId) return;
      t.lignes.forEach(function (l) { if (l.type === 'P' && l.fid) { if (l.offert) utilisees += l.q; else payees += l.q; } });
    });
    var seuil = (regle && regle.seuil) || 10, gagnees = Math.floor(payees / seuil);
    return { payees: payees, utilisees: utilisees, disponibles: Math.max(0, gagnees - utilisees), progres: payees % seuil, seuil: seuil };
  };

  /* ---------- statistiques d'une période ----------
     txs : transactions ; deb/fin : 'AAAA-MM-JJ' inclus ; seg : '' (tout) | 'H' | 'F' | 'U'
     Avec un filtre de segment, seules les prestations de ce segment comptent (les produits sont communs au salon). */
  M.periode = function (o) {
    var txs = o.txs, deb = o.deb, fin = o.fin, seg = o.seg || '', U = {}, P = {}, A = {};
    (o.utilisateurs || []).forEach(function (u) { U[u.id] = u; });
    (o.produits || []).forEach(function (p) { A[p.id] = p; });
    (o.prestations || []).forEach(function (p) { P[p.id] = p; });
    var r = { ca: 0, caPrest: 0, caProd: 0, nbPrest: 0, nbProd: 0, nbTx: 0, remises: 0, coutProduits: 0, coutConso: 0, commissions: 0, annulees: 0, montantAnnule: 0,
      parMoyen: {}, parJour: {}, carte: [], topPrest: {}, topProd: {}, employes: {}, rendu: 0, especes: 0 };
    for (var j = 0; j < 7; j++) { r.carte.push([]); for (var h = 0; h < 24; h++) r.carte[j].push(0); }
    for (var d = deb; d <= fin; d = M.ajouter(d, 1)) r.parJour[d] = 0;
    txs.forEach(function (t) {
      if (t.date < deb || t.date > fin) return;
      if (t.statut !== 'validee') { r.annulees++; r.montantAnnule += t.total; return; }
      var tot = M.totaux(t.lignes, t.remise), compte = false, montantTx = 0;
      t.lignes.forEach(function (l) {
        if (l.type === 'P' && seg && l.seg !== seg) return;
        if (l.type === 'A' && seg) return;
        compte = true;
        var net = Math.round(M.ligneNet(l) * tot.coef), com = M.commissionLigne(l, tot.coef, U[l.par]);
        montantTx += net; r.remises += M.ligneBrut(l) - net; r.commissions += com;
        var e = r.employes[l.par] || (r.employes[l.par] = { ca: 0, nbPrest: 0, nbProd: 0, commission: 0 });
        e.ca += net; e.commission += com;
        if (l.type === 'P') {
          r.caPrest += net; r.nbPrest += l.q; e.nbPrest += l.q;
          var tp = r.topPrest[l.ref] || (r.topPrest[l.ref] = { ref: l.ref, nom: l.nom, q: 0, ca: 0 }); tp.q += l.q; tp.ca += net;
          var pr = P[l.ref]; if (pr && pr.conso) pr.conso.forEach(function (c) { var a = A[c.produit]; if (a) r.coutConso += Math.round(c.q * l.q * M.coutConsoUnitaire(a)); });
        } else {
          var a = A[l.ref], cout = a ? a.achat * l.q : 0;
          r.caProd += net; r.nbProd += l.q; e.nbProd += l.q; r.coutProduits += cout;
          var ta = r.topProd[l.ref] || (r.topProd[l.ref] = { ref: l.ref, nom: l.nom, q: 0, ca: 0, marge: 0 }); ta.q += l.q; ta.ca += net; ta.marge += net - cout;
        }
      });
      if (!compte) return;
      r.nbTx++; r.ca += montantTx; r.parJour[t.date] = (r.parJour[t.date] || 0) + montantTx;
      var dt = new Date(t.ts); r.carte[(dt.getDay() + 6) % 7][dt.getHours()]++;
      if (!seg) (t.paiements || []).forEach(function (p) { var net = p.montant - (p.rendu || 0); r.parMoyen[p.moyen] = (r.parMoyen[p.moyen] || 0) + net; if (p.moyen === 'especes') r.especes += net; });
    });
    r.encaisse = Object.keys(r.parMoyen).reduce(function (s, k) { return s + r.parMoyen[k]; }, 0);
    r.panier = r.nbTx ? Math.round(r.ca / r.nbTx) : 0;
    r.cout = r.coutProduits + r.coutConso;
    r.marge = r.ca - r.cout;
    r.topPrest = Object.keys(r.topPrest).map(function (k) { return r.topPrest[k]; }).sort(function (a, b) { return b.ca - a.ca; });
    r.topProd = Object.keys(r.topProd).map(function (k) { return r.topProd[k]; }).sort(function (a, b) { return b.ca - a.ca; });
    return r;
  };

  /* ---------- file d'attente (module facultatif, remarque n° 8) ----------
     passage : { arrivee, debut, fin (ms), statut attente | encours | fini | parti, par (coiffeur), tx }
     Donne les VRAIES heures d'arrivée, l'attente et la durée réelle des prestations. */
  M.file = function (passages, deb, fin) {
    var r = { arrives: 0, servis: 0, partis: 0, attenteTot: 0, nAttente: 0, dureeTot: 0, nDuree: 0, carte: [] };
    for (var j = 0; j < 7; j++) { r.carte.push([]); for (var h = 0; h < 24; h++) r.carte[j].push(0); }
    passages.forEach(function (p) {
      if (p.date < deb || p.date > fin) return;
      r.arrives++; var d = new Date(p.arrivee); r.carte[(d.getDay() + 6) % 7][d.getHours()]++;
      if (p.statut === 'parti') r.partis++;
      if (p.statut === 'fini') r.servis++;
      if (p.debut) { r.attenteTot += p.debut - p.arrivee; r.nAttente++; }
      if (p.debut && p.fin && p.statut === 'fini') { r.dureeTot += p.fin - p.debut; r.nDuree++; }
    });
    r.attenteMoy = r.nAttente ? Math.round(r.attenteTot / r.nAttente / 60000) : 0;
    r.dureeMoy = r.nDuree ? Math.round(r.dureeTot / r.nDuree / 60000) : 0;
    r.pctPartis = M.pct(r.partis, r.arrives);
    return r;
  };
  M.minutes = function (ms) { return Math.max(0, Math.round(ms / 60000)); };

  /* ---------- dépenses et résultat ----------
     Les achats de stock et les commissions versées sortent de la trésorerie mais pas du résultat :
     le coût des produits est compté à la vente, les commissions sont calculées sur les ventes. Pas de double comptage. */
  M.HORS_RESULTAT = { stock: 1, commissions: 1 };
  M.depenses = function (deps, deb, fin) {
    var r = { exploitation: 0, horsResultat: 0, total: 0, especes: 0, parCat: {} };
    deps.forEach(function (x) {
      if (x.annulee || x.date < deb || x.date > fin) return;
      r.total += x.montant; r.parCat[x.cat] = (r.parCat[x.cat] || 0) + x.montant;
      if (M.HORS_RESULTAT[x.cat]) r.horsResultat += x.montant; else r.exploitation += x.montant;
      if (x.moyen === 'especes') r.especes += x.montant;
    });
    return r;
  };
  M.resultat = function (st, dep) { return st.marge - st.commissions - dep.exploitation; };
  M.tresorerie = function (st, dep) { return st.encaisse - dep.total; };

  /* ---------- observations automatiques : uniquement des calculs, jamais d'invention ---------- */
  M.observations = function (o) {
    var out = [], st = o.st, prec = o.prec;
    if (prec && prec.ca > 0 && st.ca > 0) { var v = Math.round((st.ca - prec.ca) * 100 / prec.ca); if (Math.abs(v) >= 5) out.push({ cle: v > 0 ? 'obs.hausse' : 'obs.baisse', p: { v: Math.abs(v) }, ton: v > 0 ? 'bon' : 'alerte' }); }
    var parJS = [0, 0, 0, 0, 0, 0, 0], tot = 0;
    st.carte.forEach(function (row, j) { row.forEach(function (n) { parJS[j] += n; tot += n; }); });
    if (tot >= 20) { var jm = parJS.indexOf(Math.max.apply(null, parJS)); out.push({ cle: 'obs.jourFort', p: { j: jm, v: M.pct(parJS[jm], tot) } }); }
    var parH = []; for (var h = 0; h < 24; h++) { var s = 0; for (var j = 0; j < 7; j++) s += st.carte[j][h]; parH.push(s); }
    if (tot >= 20) { var hm = parH.indexOf(Math.max.apply(null, parH)); out.push({ cle: 'obs.heureForte', p: { h: hm } }); }
    if (st.topPrest[0] && st.caPrest) out.push({ cle: 'obs.topPrest', p: { nom: st.topPrest[0].nom, v: M.pct(st.topPrest[0].ca, st.caPrest) } });
    if (st.ca) out.push({ cle: 'obs.partProduits', p: { v: M.pct(st.caProd, st.ca) } });
    if (o.alertesStock) out.push({ cle: 'obs.stock', p: { n: o.alertesStock }, ton: 'alerte' });
    if (st.annulees) out.push({ cle: 'obs.annulees', p: { n: st.annulees, m: st.montantAnnule }, ton: 'alerte' });
    return out;
  };

  return M;
})();
