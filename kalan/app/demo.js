/* KALAN — données fictives de la démonstration (élève « Yann », collège d'exemple). Les dates suivent le jour où l'on regarde. */
window.KALAN_DEMO = function (auj) {
  'use strict';
  var M = window.KM, KB = window.KB, d = {};
  function poser(col, doc) { (d[col] = d[col] || {})[doc.id] = doc; }
  function j(n) { return M.ajouter(auj, n); }
  poser('profil', { id: 'profil', prenom: 'Yann', classe: '3e', etablissement: 'Collège d’exemple', annee: '2026-2027', trimestre: 1, bepc: '' });
  poser('reglages', { id: 'matieres', liste: KB.MATIERES.map(function (m) { return Object.assign({}, m); }) });

  /* emploi du temps : matin 7 h 30 – 12 h 30, après-midi 15 h – 17 h */
  var E = [
    [1, '07:30', '09:30', 'ma', '3e2'], [1, '09:45', '11:45', 'fr', '3e2'], [1, '15:00', '17:00', 'svt', 'Labo'],
    [2, '07:30', '09:30', 'pc', 'Labo'], [2, '09:45', '10:45', 'ang', '3e2'], [2, '10:45', '12:30', 'hg', '3e2'],
    [3, '07:30', '09:30', 'fr', '3e2'], [3, '09:45', '11:45', 'ma', '3e2'],
    [4, '07:30', '08:30', 'edhc', '3e2'], [4, '08:30', '10:30', 'lv2', '3e2'], [4, '10:45', '12:30', 'ang', '3e2'], [4, '15:00', '17:00', 'eps', 'Terrain'],
    [5, '07:30', '09:30', 'ma', '3e2'], [5, '09:45', '11:45', 'pc', 'Labo'], [5, '15:00', '16:00', 'art', 'Atelier'],
    [6, '07:30', '09:30', 'hg', '3e2'], [6, '09:45', '11:45', 'fr', '3e2']
  ];
  E.forEach(function (e, i) { poser('edt', { id: 'e' + i, jour: e[0], debut: e[1], fin: e[2], matiere: e[3], salle: e[4], prof: '' }); });

  /* programme : quelques chapitres déjà vus */
  var etats = { ma: ['revise', 'vu', 'encours'], fr: ['vu', 'revise', 'encours'], pc: ['vu', 'encours'], svt: ['revise', 'encours'], hg: ['vu', 'vu', 'encours'], ang: ['revise', 'encours'], lv2: ['vu'], edhc: ['revise', 'encours'], eps: ['encours'], art: ['vu'] };
  Object.keys(KB.PROGRAMME).forEach(function (m) {
    var ch = KB.PROGRAMME[m].map(function (t, i) { return { id: m + i, titre: t, etat: (etats[m] || [])[i] || 'avenir' }; });
    if (m === 'ma') { ch[2].etat = 'avenir'; ch[6].etat = 'encours'; }
    if (m === 'pc') { ch[0].etat = 'encours'; ch[1].etat = 'avenir'; }
    poser('programme', { id: m, chapitres: ch });
  });

  /* notes du trimestre (sur 20 sauf mention) */
  var N = [
    ['ma', 11, 20, 'Interrogation', 1, -38], ['ma', 8.5, 20, 'Devoir', 2, -24], ['ma', 9, 20, 'Interrogation', 1, -10], ['ma', 7.5, 20, 'Devoir', 2, -3],
    ['fr', 12, 20, 'Devoir', 2, -30], ['fr', 13.5, 20, 'Interrogation', 1, -16], ['fr', 14, 20, 'Devoir', 2, -5],
    ['pc', 10, 20, 'Interrogation', 1, -27], ['pc', 12.5, 20, 'Devoir', 2, -12],
    ['svt', 15, 20, 'Interrogation', 1, -20], ['svt', 16, 20, 'Devoir', 2, -8],
    ['hg', 11, 20, 'Devoir', 2, -22], ['hg', 7, 10, 'Interrogation', 1, -9],
    ['ang', 14, 20, 'Interrogation', 1, -25], ['ang', 15.5, 20, 'Devoir', 2, -6],
    ['lv2', 12, 20, 'Interrogation', 1, -14], ['edhc', 16, 20, 'Devoir', 1, -18], ['eps', 15, 20, 'Devoir', 1, -11]
  ];
  N.forEach(function (n, i) { poser('notes', { id: 'n' + i, matiere: n[0], note: n[1], sur: n[2], type: n[3], coef: n[4], date: j(n[5]), trimestre: 1, commentaire: '' }); });

  /* devoirs */
  [['ma', 'Exercices 4, 5 et 7 page 112 (Thalès)', 1, false], ['fr', 'Apprendre la leçon sur le participe passé', 2, false], ['pc', 'Exercice 3 page 58 : loi d’Ohm', 4, false], ['ang', 'Learn the irregular verbs (list 2)', -1, false], ['hg', 'Réviser les dates de la décolonisation', -3, true]]
    .forEach(function (x, i) { poser('devoirs', { id: 'd' + i, matiere: x[0], titre: x[1], pour: j(x[2]), fait: x[3] }); });

  /* cours écrits par l'élève */
  var cours = [
    { id: 'k1', matiere: 'ma', chapitre: 'ma6', titre: 'La propriété de Thalès', date: j(-6), texte: 'Configuration de Thalès : deux droites sécantes coupées par deux droites parallèles.\n\n! Propriété de Thalès : si M est sur (AB), N sur (AC) et (MN) // (BC), alors les longueurs sont proportionnelles.\nAM/AB = AN/AC = MN/BC\n\nRéciproque : si AM/AB = AN/AC et si les points sont dans le même ordre, alors (MN) // (BC).\n\nExemple : AM = 3 cm, AB = 5 cm, AC = 10 cm, donc AN = 3 × 10 / 5 = 6 cm.\nAttention : on vérifie toujours que les droites sont parallèles avant d’appliquer la propriété.' },
    { id: 'k2', matiere: 'pc', chapitre: 'pc0', titre: 'La résistance électrique et la loi d’Ohm', date: j(-4), texte: 'Résistance : dipôle qui s’oppose au passage du courant électrique.\nL’ohm : unité de la résistance, de symbole Ω.\nL’ohmmètre : appareil qui mesure une résistance.\n\nLoi d’Ohm : U = R × I\nU en volts (V), R en ohms (Ω), I en ampères (A).\n\n! La caractéristique d’un conducteur ohmique est une droite qui passe par l’origine.\nPlus la résistance est grande, plus l’intensité du courant est faible.' },
    { id: 'k3', matiere: 'hg', chapitre: 'hg2', titre: 'La Côte d’Ivoire vers l’indépendance', date: j(-2), texte: 'En 1893, la Côte d’Ivoire devient une colonie française.\nEn 1944, la conférence de Brazzaville promet des réformes aux colonies.\nEn 1946, Félix Houphouët-Boigny fonde le RDA à Bamako.\nEn 1958, la Côte d’Ivoire entre dans la Communauté française.\nLe 7 août 1960, la Côte d’Ivoire devient indépendante.\n\nLe RDA : Rassemblement démocratique africain, parti politique créé pour l’émancipation des colonies.\n! Félix Houphouët-Boigny devient le premier président de la Côte d’Ivoire.' }
  ];
  cours.forEach(function (c) { c.maj = Date.now(); poser('cours', c); });
  /* une fiche déjà faite, dont quelques cartes à revoir aujourd'hui */
  var f = M.genererFiche(cours[0]);
  var cartes = M.cartesDeFiche(f, auj);
  poser('fiches', { id: 'f1', matiere: 'ma', coursId: 'k1', chapitre: 'ma6', titre: 'Fiche — La propriété de Thalès', sections: f, cartes: cartes, maj: Date.now() });
  poser('questions', { id: 'q1', texte: 'Pourquoi faut-il que les points soient dans le même ordre pour la réciproque de Thalès ?', matiere: 'ma', date: j(-1), repondu: false });
  return d;
};
