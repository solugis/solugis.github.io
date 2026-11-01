/* KALAN — le conseiller (nom affiché réglé dans marque.js).
   Il analyse les données de l'élève (notes, emploi du temps, devoirs, programme, cours, fiches) et répond aux questions courantes.
   Tout est calculé sur le téléphone : aucune donnée n'est envoyée à un service d'IA. */
window.Koro = (function () {
  'use strict';
  var M = window.KM, KB = window.KB;
  function nom(D, id) { var m = D.matieres.filter(function (x) { return x.id === id; })[0]; return m ? m.nom : 'Matière'; }
  function n2(v) { return M.nombre(v, 2); }

  /* Repère une matière citée dans la question. */
  var ALIAS = { fr: 'francais|franc|grammaire|conjugaison|dictee|orthographe', ma: 'math|maths|mathematique|mathematiques|algebre|geometrie', pc: 'physique|chimie|pc|phys', svt: 'svt|biologie|sciences de la vie', hg: 'histoire|geographie|geo|hg|histo', ang: 'anglais|english', lv2: 'espagnol|allemand|lv2', edhc: 'edhc|civique|citoyennete', eps: 'eps|sport', art: 'art|arts|dessin|plastique' };
  function matiereCitee(q, D) {
    for (var i = 0; i < D.matieres.length; i++) {
      var m = D.matieres[i], mots = (ALIAS[m.id] ? ALIAS[m.id] + '|' : '') + M.sansAccents(m.nom).replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/).filter(function (w) { return w.length > 2; }).join('|');
      if (new RegExp('\\b(' + mots + ')\\b').test(q)) return m;
    }
    return null;
  }

  /* ------------------------------------------------------------------ analyse : conseils classés */
  function conseils(D) {
    var L = [], auj = D.auj, tri = D.profil.trimestre || 1;
    var pm = M.parMatiere(D.notes, D.matieres, tri), gen = M.generale(pm);
    var demainJour = M.jour(M.ajouter(auj, 1)).getDay();
    /* devoirs */
    var retard = D.devoirs.filter(function (d) { return !d.fait && d.pour < auj; });
    var pourDemain = D.devoirs.filter(function (d) { return !d.fait && d.pour === M.ajouter(auj, 1); });
    var aujourdhui = D.devoirs.filter(function (d) { return !d.fait && d.pour === auj; });
    if (retard.length) L.push({ niveau: 'urgent', icone: 'cloche', texte: 'Tu as ' + retard.length + ' devoir' + (retard.length > 1 ? 's' : '') + ' en retard (' + retard.slice(0, 2).map(function (d) { return nom(D, d.matiere); }).join(', ') + '). Fais-le' + (retard.length > 1 ? 's' : '') + ' en premier, ou coche-le' + (retard.length > 1 ? 's' : '') + ' si c’est déjà fait.', action: { lib: 'Voir mes devoirs', aller: 'agenda/devoirs' } });
    if (aujourdhui.length) L.push({ niveau: 'urgent', icone: 'horloge', texte: 'À rendre aujourd’hui : ' + aujourdhui.map(function (d) { return nom(D, d.matiere) + ' (' + d.titre + ')'; }).join(', ') + '.', action: { lib: 'Voir mes devoirs', aller: 'agenda/devoirs' } });
    if (pourDemain.length) L.push({ niveau: 'important', icone: 'crayon', texte: 'Pour demain : ' + pourDemain.map(function (d) { return nom(D, d.matiere) + ' — ' + d.titre; }).join(' ; ') + '. Commence par ça ce soir.', action: { lib: 'Voir mes devoirs', aller: 'agenda/devoirs' } });
    /* matières faibles et baisses */
    var faibles = Object.keys(pm).map(function (k) { return pm[k]; }).filter(function (x) { return x.moy != null && x.moy < 10; })
      .sort(function (a, b) { return (a.moy - 10) * a.m.coef - (b.moy - 10) * b.m.coef; });
    faibles.slice(0, 2).forEach(function (x) {
      L.push({ niveau: 'important', icone: 'cible', texte: x.m.nom + ' : ' + n2(x.moy) + ' de moyenne' + (x.m.coef >= 3 ? ' (coefficient ' + x.m.coef + ', elle pèse lourd)' : '') + '. Objectif : passer au-dessus de 10. Refais les exercices corrigés en classe et révise les cartes de cette matière 10 minutes par jour.', action: { lib: 'Réviser', aller: 'cours/reviser' } });
    });
    Object.keys(pm).map(function (k) { return pm[k]; }).filter(function (x) { return x.tendance <= -2 && x.moy != null && x.moy >= 10; }).slice(0, 1).forEach(function (x) {
      L.push({ niveau: 'important', icone: 'bas', texte: 'Attention en ' + x.m.nom + ' : tes deux dernières notes sont en baisse de ' + n2(-x.tendance) + ' points. Demande-toi ce qui a changé (chapitre plus difficile, moins de révision ?).', action: { lib: 'Voir mes notes', aller: 'notes' } });
    });
    /* cartes à revoir */
    var dues = M.cartesDues(D.fiches, auj);
    if (dues.length) L.push({ niveau: 'info', icone: 'cartes', texte: dues.length + ' carte' + (dues.length > 1 ? 's' : '') + ' de révision t’attend' + (dues.length > 1 ? 'ent' : '') + ' aujourd’hui (environ ' + Math.max(2, Math.ceil(dues.length / 3)) + ' minutes).', action: { lib: 'Réviser maintenant', aller: 'cours/reviser' } });
    /* cours de demain */
    var demain = M.coursDuJour(D.edt, demainJour);
    if (demain.length) {
      var mats = []; demain.forEach(function (c) { if (mats.indexOf(c.matiere) < 0) mats.push(c.matiere); });
      L.push({ niveau: 'info', icone: 'calendrier', texte: 'Demain (' + M.JOURS[demainJour].toLowerCase() + ') : ' + mats.map(function (id) { return nom(D, id); }).join(', ') + '. Relis le dernier cours de chacune ce soir : 5 minutes suffisent.', action: { lib: 'Mon emploi du temps', aller: 'agenda' } });
    }
    /* programme : chapitres vus mais pas révisés, cours sans fiche */
    var aReviser = [];
    Object.keys(D.programme).forEach(function (k) { (D.programme[k] || []).forEach(function (c) { if (c.etat === 'vu') aReviser.push({ m: k, c: c }); }); });
    if (aReviser.length) L.push({ niveau: 'info', icone: 'livre', texte: aReviser.length + ' chapitre' + (aReviser.length > 1 ? 's sont vus' : ' est vu') + ' en classe mais pas encore révisé' + (aReviser.length > 1 ? 's' : '') + ', par exemple « ' + aReviser[0].c.titre + ' » (' + nom(D, aReviser[0].m) + '). Fais sa fiche.', action: { lib: 'Voir le programme', aller: 'cours/programme' } });
    var avecFiche = {}; D.fiches.forEach(function (f) { if (f.coursId) avecFiche[f.coursId] = 1; });
    var sansFiche = D.cours.filter(function (c) { return !avecFiche[c.id] && (c.texte || '').length > 80; });
    if (sansFiche.length) L.push({ niveau: 'info', icone: 'etincelle', texte: 'Ton cours « ' + sansFiche[0].titre + ' » n’a pas encore de fiche. Ouvre-le et touche « Faire la fiche » : je la prépare pour toi.', action: { lib: 'Mes cours', aller: 'cours/cours' } });
    /* examen de fin d'année (BEPC, BAC, CEPE…) */
    var ex = M.examen(D.profil.classe);
    if (D.profil.bepc) {
      var j = M.ecart(auj, D.profil.bepc);
      if (j > 0 && j <= 90) L.push({ niveau: j <= 30 ? 'urgent' : 'important', icone: 'chapeau', texte: (ex === 'examen' ? 'Examen' : ex) + ' dans ' + j + ' jours. Une matière par jour, à tour de rôle, et un sujet d’entraînement chaque week-end.', action: { lib: 'Comment préparer un examen ?', question: 'Comment préparer un examen ?' } });
    }
    /* encouragements */
    var forte = Object.keys(pm).map(function (k) { return pm[k]; }).filter(function (x) { return x.moy != null; }).sort(function (a, b) { return b.moy - a.moy; })[0];
    var hausse = Object.keys(pm).map(function (k) { return pm[k]; }).filter(function (x) { return x.tendance >= 2; })[0];
    if (hausse) L.push({ niveau: 'bravo', icone: 'haut', texte: 'Bravo en ' + hausse.m.nom + ' : +' + n2(hausse.tendance) + ' points sur tes dernières notes. Continue comme ça !' });
    if (gen != null && gen >= 12) L.push({ niveau: 'bravo', icone: 'trophee', texte: 'Ta moyenne générale du trimestre est de ' + n2(gen) + ' (' + M.mention(gen).toLowerCase() + '). ' + (forte ? 'Ta meilleure matière : ' + forte.m.nom + ' (' + n2(forte.moy) + ').' : '') });
    if (!D.edt.length) L.push({ niveau: 'info', icone: 'calendrier', texte: 'Ton emploi du temps est vide. Remplis-le : je pourrai te dire chaque soir quoi préparer pour le lendemain.', action: { lib: 'Remplir', aller: 'agenda' } });
    if (!D.notes.length) L.push({ niveau: 'info', icone: 'graphique', texte: 'Note chaque interrogation et chaque devoir dès que tu as la copie : je calculerai tes moyennes et je repérerai les matières à renforcer.', action: { lib: 'Ajouter une note', aller: 'notes' } });
    if (!L.length) L.push({ niveau: 'bravo', icone: 'etoile', texte: 'Tout est à jour : pas de devoir en retard, pas de carte à revoir. Profites-en pour avancer une fiche ou te reposer.' });
    var ordre = { urgent: 0, important: 1, info: 2, bravo: 3 };
    return L.sort(function (a, b) { return ordre[a.niveau] - ordre[b.niveau]; });
  }

  /* ------------------------------------------------------------------ réponses aux questions */
  function liste(L) { return L.map(function (x) { return '• ' + x; }).join('\n'); }
  function jourCite(q, auj) {
    if (/apres[- ]demain/.test(q)) return M.ajouter(auj, 2);
    if (/demain/.test(q)) return M.ajouter(auj, 1);
    if (/aujourd|ce matin|cet apres|ce soir/.test(q)) return auj;
    var j = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    for (var i = 0; i < 7; i++) if (new RegExp('\\b' + j[i] + '\\b').test(q)) { var d = auj; for (var k = 0; k < 7; k++) { if (M.jour(d).getDay() === i) return d; d = M.ajouter(d, 1); } }
    return null;
  }
  var VIDES_Q = /^(quoi|quel|quelle|quels|quelles|comment|pourquoi|est-ce|cest|veut|dire|explique|expliquer|donne|cours|definition|signifie|parle|les|des|une|est|que|qui|mes|tes|ses|son|ton|mon|sur|par|pas|oui|non|moi|toi|lui|eux|elle|ont|avec|dans|comme|mais|tout|bien|faire|fait|sais|peux|veux|aide|pour|quand|temps|aujourd|hui)$/;
  function chercherDans(liste, q) {
    var mots = q.split(/\s+/).filter(function (w) { return w.length >= 3 && !VIDES_Q.test(w); });
    if (!mots.length) return [];
    return liste.map(function (x) { var t = ' ' + M.sansAccents(x.t).replace(/[^a-z0-9]+/g, ' ') + ' ', s = 0; mots.forEach(function (w) { if (t.indexOf(' ' + w) >= 0) s += w.length; }); return { x: x, s: s }; })
      .filter(function (r) { return r.s >= 3; }).sort(function (a, b) { return b.s - a.s; }).map(function (r) { return r.x; });
  }
  function extrait(texte, q) {
    var mots = q.split(/\s+/).filter(function (w) { return w.length >= 3 && !VIDES_Q.test(w); }), lignes = String(texte).split(/\n+/);
    var best = lignes.map(function (l) { var t = ' ' + M.sansAccents(l).replace(/[^a-z0-9]+/g, ' ') + ' ', s = 0; mots.forEach(function (w) { if (t.indexOf(' ' + w) >= 0) s += w.length; }); return { l: l, s: s + (/:/.test(l) ? 1 : 0) }; }).sort(function (a, b) { return b.s - a.s; })[0];
    var l = best && best.s ? best.l : lignes[0] || ''; return l.length > 220 ? l.slice(0, 217) + '…' : l;
  }

  function repondre(question, D) {
    var q = M.sansAccents(question).replace(/[’']/g, ' ').replace(/[?!.,;]/g, ' ').replace(/\s+/g, ' ').trim(), auj = D.auj;
    var mat = matiereCitee(q, D), tri = D.profil.trimestre || 1, prenom = D.profil.prenom || '';
    if (!q) return { texte: 'Pose-moi une question, ' + prenom + ' !' };

    if (/^(bonjour|salut|bonsoir|coucou|hello|yo|cc|slt)\b/.test(q) && q.split(' ').length <= 3) {
      return { texte: (new Date().getHours() >= 17 ? 'Bonsoir ' : 'Bonjour ') + prenom + ' ! Je suis ' + window.MARQUE.conseiller + ', ton professeur particulier. Je connais tes notes, ton emploi du temps, tes devoirs et tes cours. Que veux-tu savoir ?', suggestions: true };
    }
    if (/merci/.test(q) && q.split(' ').length <= 4) return { texte: 'Avec plaisir ! Bon courage, ' + prenom + '.' };

    /* conseils */
    if (/conseil|que faire|quoi faire|par quoi|aide[- ]moi|priorite|que dois|je fais quoi|ce soir|programme du soir|bilan|analyse/.test(q) && !/formule/.test(q)) {
      var C = conseils(D).slice(0, 5);
      return { texte: 'Voici ce que je te conseille, dans l’ordre :\n' + C.map(function (c, i) { return (i + 1) + '. ' + c.texte; }).join('\n'), actions: C.filter(function (c) { return c.action; }).slice(0, 2).map(function (c) { return c.action; }) };
    }

    /* moyennes et notes */
    if (/moyenne|note|resultat|bulletin|classement|meilleure|faible|plus fort|moins bon/.test(q)) {
      var pm = M.parMatiere(D.notes, D.matieres, tri), gen = M.generale(pm);
      if (!D.notes.length) return { texte: 'Je n’ai encore aucune note. Ajoute tes notes dans l’onglet Notes et je calculerai tes moyennes.', actions: [{ lib: 'Ajouter une note', aller: 'notes' }] };
      if (mat) {
        var x = pm[mat.id];
        if (!x || !x.notes.length) return { texte: 'Aucune note en ' + mat.nom + ' ce trimestre.' };
        return { texte: mat.nom + ' (trimestre ' + tri + ') : **' + n2(x.moy) + ' / 20** de moyenne, ' + x.notes.length + ' note' + (x.notes.length > 1 ? 's' : '') + ' :\n' + liste(x.notes.slice(-6).map(function (n) { return M.nombre(n.note, n.note % 1 ? 2 : 0) + '/' + (n.sur || 20) + ' — ' + (n.type || 'note') + ' du ' + M.dateCourte(n.date); })) + (x.tendance >= 1 ? '\nTendance : en hausse.' : x.tendance <= -1 ? '\nTendance : en baisse, accroche-toi.' : ''), actions: [{ lib: 'Voir mes notes', aller: 'notes' }] };
      }
      var classe = Object.keys(pm).map(function (k) { return pm[k]; }).filter(function (x) { return x.moy != null; }).sort(function (a, b) { return b.moy - a.moy; });
      return { texte: 'Moyenne générale du trimestre ' + tri + ' : **' + n2(gen) + ' / 20** (' + M.mention(gen).toLowerCase() + ').\nMeilleures matières : ' + classe.slice(0, 2).map(function (x) { return x.m.nom + ' ' + n2(x.moy); }).join(', ') + '.\nÀ renforcer : ' + classe.slice(-2).reverse().map(function (x) { return x.m.nom + ' ' + n2(x.moy); }).join(', ') + '.', actions: [{ lib: 'Voir mes notes', aller: 'notes' }] };
    }

    /* devoirs */
    if (/devoir|exercice a faire|a rendre|lecon a apprendre|travail a faire/.test(q)) {
      var dv = D.devoirs.filter(function (d) { return !d.fait && (!mat || d.matiere === mat.id); }).sort(function (a, b) { return a.pour < b.pour ? -1 : 1; });
      if (!dv.length) return { texte: 'Aucun devoir en attente' + (mat ? ' en ' + mat.nom : '') + '. Pense à les noter dès que le professeur les donne.', actions: [{ lib: 'Ajouter un devoir', aller: 'agenda/devoirs' }] };
      return { texte: 'Tes devoirs à faire :\n' + liste(dv.slice(0, 8).map(function (d) { return nom(D, d.matiere) + ' — ' + d.titre + (d.pour < auj ? ' (en retard : ' : ' (pour ') + M.quand(d.pour, auj) + ')'; })), actions: [{ lib: 'Voir mes devoirs', aller: 'agenda/devoirs' }] };
    }

    /* emploi du temps */
    var jc = jourCite(q, auj);
    if (jc || /emploi du temps|quel cours|quels cours|j ai quoi|on a quoi|cours de|a quelle heure|horaire/.test(q) || (mat && /\bquand\b.*\bj ai\b|\bquel jour\b|\bc est quand\b|\bj ai .* quand\b/.test(q))) {
      var d = jc || auj, js = M.jour(d).getDay(), L = M.coursDuJour(D.edt, js);
      if (!D.edt.length) return { texte: 'Ton emploi du temps n’est pas encore rempli.', actions: [{ lib: 'Remplir', aller: 'agenda' }] };
      if (mat && !jc) {
        var cr = D.edt.filter(function (c) { return c.matiere === mat.id; }).sort(function (a, b) { return a.jour - b.jour || (a.debut < b.debut ? -1 : 1); });
        return { texte: cr.length ? mat.nom + ' :\n' + liste(cr.map(function (c) { return M.JOURS[c.jour] + ' de ' + M.heure(c.debut) + ' à ' + M.heure(c.fin) + (c.salle ? ' (salle ' + c.salle + ')' : ''); })) : 'Pas de cours de ' + mat.nom + ' dans ton emploi du temps.' };
      }
      if (!L.length) return { texte: 'Pas de cours ' + M.quand(d, auj) + ' (' + M.dateLongue(d).toLowerCase() + '). Repos… ou révision !' };
      var dv2 = D.devoirs.filter(function (x) { return !x.fait && x.pour === d; });
      return { texte: 'Cours ' + M.quand(d, auj) + ' (' + M.dateLongue(d).toLowerCase() + ') :\n' + liste(L.map(function (c) { return M.heure(c.debut) + ' – ' + M.heure(c.fin) + ' : ' + nom(D, c.matiere) + (c.salle ? ' (salle ' + c.salle + ')' : ''); })) + (dv2.length ? '\nÀ rendre ce jour-là : ' + dv2.map(function (x) { return nom(D, x.matiere) + ' (' + x.titre + ')'; }).join(', ') + '.' : ''), actions: [{ lib: 'Mon emploi du temps', aller: 'agenda' }] };
    }

    /* programme */
    if (/programme|chapitre|ou j en suis|avancement|retard|reste a voir|progression/.test(q)) {
      var mats = mat ? [mat] : D.matieres, lignes = [];
      mats.forEach(function (m) { var ch = D.programme[m.id] || []; if (!ch.length) return; var p = M.progression(ch); lignes.push(m.nom + ' : ' + (p.vu + p.revise) + '/' + p.total + ' chapitres vus, ' + p.revise + ' révisé' + (p.revise > 1 ? 's' : '') + (p.encours ? ', ' + p.encours + ' en cours' : '')); });
      var enc = []; mats.forEach(function (m) { (D.programme[m.id] || []).forEach(function (c) { if (c.etat === 'encours') enc.push(c.titre + ' (' + m.nom + ')'); }); });
      return { texte: 'Où tu en es du programme :\n' + liste(lignes) + (enc.length ? '\nEn ce moment : ' + enc.slice(0, 4).join(', ') + '.' : ''), actions: [{ lib: 'Voir le programme', aller: 'cours/programme' }] };
    }

    /* examen de fin d'année */
    if (/bepc|bac|cepe|examen|brevet/.test(q) && !/comment|preparer|reviser|conseil|peur|stress|angoiss|panique/.test(q)) {
      var nx = M.examen(D.profil.classe), le = nx === 'examen' ? 'l’examen' : 'le ' + nx;
      if (!D.profil.bepc) return { texte: 'La date ' + (nx === 'examen' ? 'de l’examen' : 'du ' + nx) + ' n’est pas encore enregistrée. Ajoute-la dans Réglages › Profil dès qu’elle est annoncée.', actions: [{ lib: 'Indiquer la date', ouvrir: 'examen' }, { lib: 'Comment préparer un examen ?', question: 'Comment préparer un examen ?' }] };
      var j = M.ecart(auj, D.profil.bepc);
      return { texte: j > 0 ? le.charAt(0).toUpperCase() + le.slice(1) + ' commence ' + M.quand(D.profil.bepc, auj) + ', dans **' + j + ' jours**.' : 'La date enregistrée de ' + le + ' est passée.', actions: [{ lib: 'Modifier la date', ouvrir: 'examen' }, { lib: 'Comment le préparer ?', question: 'Comment préparer un examen ?' }] };
    }

    var docs = D.cours.map(function (c) { return { type: 'cours', c: c, t: c.titre + ' ' + c.texte }; })
      .concat(D.fiches.map(function (f) { return { type: 'fiche', c: f, t: f.titre + ' ' + JSON.stringify(f.sections || {}) }; }));
    function dansMesCours() {
      var tr = chercherDans(docs, q); if (!tr.length) return null;
      var r = tr[0];
      return { texte: 'J’ai trouvé ça dans ' + (r.type === 'cours' ? 'ton cours' : 'ta fiche') + ' « ' + r.c.titre + ' » (' + nom(D, r.c.matiere) + ') :\n« ' + extrait(r.type === 'cours' ? r.c.texte : r.t.replace(/[{}"[\]]/g, ' '), q) + ' »', actions: [{ lib: 'Ouvrir ' + (r.type === 'cours' ? 'le cours' : 'la fiche'), ouvrir: r.type, id: r.c.id }] };
    }
    if (/explique|c est quoi|definition|que veut dire|signifie|qu est[- ]ce|veut dire/.test(q)) { var rc = dansMesCours(); if (rc) return rc; }

    /* mémo : formules et dates */
    var memo = chercherDans(KB.MEMO.map(function (x) { return { x: x, t: x.titre + ' ' + x.mots }; }), q);
    if (memo.length) {
      var e = memo[0].x;
      return { texte: '**' + e.titre + '** (' + nom(D, e.m) + ')\n' + e.texte + (memo[1] ? '\nVoir aussi : ' + memo[1].x.titre + '.' : ''), actions: memo[1] ? [{ lib: memo[1].x.titre, question: memo[1].x.titre }] : [] };
    }

    /* méthodes */
    var meth = chercherDans(KB.METHODES.map(function (x) { return { x: x, t: x.titre + ' ' + x.mots }; }), q);
    if (meth.length) return { texte: '**' + meth[0].x.titre + '**\n' + meth[0].x.texte };

    /* recherche dans ses cours et ses fiches */
    var rc2 = dansMesCours(); if (rc2) return rc2;

    return { texte: 'Je ne sais pas encore répondre à cette question. Je connais tes notes, tes devoirs, ton emploi du temps, ton programme, tes cours, un mémo de formules et de dates, et des méthodes de travail.\nSi c’est une question sur une leçon, note-la pour la poser à ton professeur.', noter: true, suggestions: true };
  }

  var SUGGESTIONS = ['Que me conseilles-tu ?', 'Ma moyenne', 'J’ai quoi demain ?', 'Mes devoirs', 'Où j’en suis du programme ?', 'Comment bien réviser ?', 'Formule de Thalès', 'Loi d’Ohm', 'Gérer le stress'];
  return { conseils: conseils, repondre: repondre, SUGGESTIONS: SUGGESTIONS };
})();
