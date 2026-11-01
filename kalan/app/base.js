/* KALAN — données de base : matières, programmes modèles par classe (3e pour l'instant), mémo et méthodes du conseiller.
   Le programme est un modèle de départ à ajuster selon la progression des professeurs (tout est modifiable dans l'application). */
window.KB = (function () {
  'use strict';
  var MATIERES = [
    { id: 'fr', nom: 'Français', coef: 3, couleur: '#e85d75', icone: 'livre' },
    { id: 'ma', nom: 'Mathématiques', coef: 3, couleur: '#3b82f6', icone: 'maths' },
    { id: 'pc', nom: 'Physique-Chimie', coef: 2, couleur: '#8b5cf6', icone: 'fiole' },
    { id: 'svt', nom: 'SVT', coef: 2, couleur: '#22a06b', icone: 'feuille' },
    { id: 'hg', nom: 'Histoire-Géographie', coef: 2, couleur: '#d97706', icone: 'globe' },
    { id: 'ang', nom: 'Anglais', coef: 2, couleur: '#0ea5e9', icone: 'langue' },
    { id: 'lv2', nom: 'Espagnol', coef: 1, couleur: '#ec4899', icone: 'langue' },
    { id: 'edhc', nom: 'EDHC', coef: 1, couleur: '#14b8a6', icone: 'balance' },
    { id: 'eps', nom: 'EPS', coef: 1, couleur: '#f97316', icone: 'ballon' },
    { id: 'art', nom: 'Arts plastiques', coef: 1, couleur: '#a855f7', icone: 'palette' }
  ];

  /* Programmes modèles par classe (à compléter : seule la 3e est fournie pour l'instant). */
  var PROGRAMME = {
    fr: ['Grammaire : la phrase complexe et les propositions', 'Conjugaison : modes et temps (subjonctif, conditionnel)', 'Orthographe : accords du participe passé', 'Vocabulaire : champs lexicaux et figures de style', 'Lecture méthodique d’un texte', 'Production écrite : le texte argumentatif', 'Production écrite : le récit et la description', 'Œuvre intégrale : le roman africain', 'La poésie', 'Préparation à la dictée et aux questions du BEPC'],
    ma: ['Calcul littéral et identités remarquables', 'Racines carrées', 'Équations et inéquations du premier degré', 'Systèmes de deux équations à deux inconnues', 'Applications affines', 'Statistiques', 'Propriété de Thalès et sa réciproque', 'Relations trigonométriques dans le triangle rectangle', 'Angles inscrits', 'Vecteurs et coordonnées', 'Équations de droites', 'Pyramides et cônes'],
    pc: ['Résistance électrique et loi d’Ohm', 'Puissance et énergie électriques', 'Poids et masse d’un corps', 'Les lentilles minces', 'Solutions acides, basiques et neutres (pH)', 'Les ions en solution', 'Les métaux usuels et leur oxydation', 'Les hydrocarbures et leur combustion'],
    svt: ['La reproduction humaine', 'La transmission des caractères héréditaires', 'Le système immunitaire', 'Les IST et le VIH/SIDA', 'La nutrition et la digestion', 'Le sol et sa protection'],
    hg: ['La Seconde Guerre mondiale (1939-1945)', 'La décolonisation de l’Afrique', 'La Côte d’Ivoire de la colonisation à l’indépendance', 'Les relations internationales depuis 1945 (ONU, guerre froide)', 'L’OUA et l’Union africaine', 'La population de la Côte d’Ivoire', 'L’agriculture ivoirienne', 'L’industrie et les échanges en Côte d’Ivoire', 'L’intégration régionale (CEDEAO, UEMOA)'],
    ang: ['Unit 1 : People and places', 'Unit 2 : Health and environment', 'Unit 3 : Technology and communication', 'Grammar : present perfect, past simple', 'Grammar : passive voice and reported speech', 'Irregular verbs', 'Reading comprehension', 'Writing : letters and short essays'],
    lv2: ['Saludos y presentaciones', 'La familia y la casa', 'La vida escolar', 'Los verbos irregulares', 'El pretérito', 'Comprensión de textos'],
    edhc: ['Les droits et devoirs de l’enfant', 'La citoyenneté', 'Les institutions de la Côte d’Ivoire', 'La protection de l’environnement', 'La santé et la prévention'],
    eps: ['Athlétisme', 'Sports collectifs', 'Gymnastique', 'Préparation aux épreuves du BEPC'],
    art: ['Le dessin et la couleur', 'La composition', 'Les arts africains']
  };

  /* Mémo : formules et faits sûrs du niveau 3e. mots = mots-clés de recherche (sans accents). */
  var MEMO = [
    { m: 'ma', titre: 'Théorème de Pythagore', mots: 'pythagore hypotenuse triangle rectangle', texte: 'Dans un triangle ABC rectangle en A : **BC² = AB² + AC²** (BC est l’hypoténuse).\nRéciproque : si BC² = AB² + AC², alors le triangle est rectangle en A.' },
    { m: 'ma', titre: 'Propriété de Thalès', mots: 'thales paralleles proportionnalite', texte: 'Si M est sur (AB), N sur (AC) et (MN) parallèle à (BC), alors : **AM/AB = AN/AC = MN/BC**.\nRéciproque : si AM/AB = AN/AC (points dans le même ordre), alors (MN) est parallèle à (BC).' },
    { m: 'ma', titre: 'Trigonométrie', mots: 'trigonometrie cosinus sinus tangente cos sin tan sohcahtoa', texte: 'Dans un triangle rectangle, pour un angle aigu :\n• **cos = côté adjacent / hypoténuse**\n• **sin = côté opposé / hypoténuse**\n• **tan = côté opposé / côté adjacent**\nAstuce : « CAH SOH TOA ». Et cos² + sin² = 1, tan = sin / cos.' },
    { m: 'ma', titre: 'Identités remarquables', mots: 'identites remarquables developper factoriser carre', texte: '• **(a + b)² = a² + 2ab + b²**\n• **(a − b)² = a² − 2ab + b²**\n• **(a + b)(a − b) = a² − b²**' },
    { m: 'ma', titre: 'Racines carrées', mots: 'racine carree racines', texte: 'Pour a ≥ 0 et b > 0 : **√(a × b) = √a × √b**, **√(a / b) = √a / √b**, **(√a)² = a**.\nAttention : √(a + b) n’est pas égal à √a + √b.' },
    { m: 'ma', titre: 'Équation de droite et application affine', mots: 'droite equation coefficient directeur affine fonction', texte: 'Une droite non verticale a une équation **y = ax + b** : a est le coefficient directeur, b l’ordonnée à l’origine.\nPar A et B : **a = (yB − yA) / (xB − xA)**.\nUne application affine s’écrit f(x) = ax + b.' },
    { m: 'ma', titre: 'Vecteurs et coordonnées', mots: 'vecteur vecteurs coordonnees distance milieu repere', texte: '• Coordonnées du vecteur AB : **(xB − xA ; yB − yA)**\n• Distance : **AB = √[(xB − xA)² + (yB − yA)²]**\n• Milieu I de [AB] : **((xA + xB)/2 ; (yA + yB)/2)**' },
    { m: 'ma', titre: 'Angles inscrits', mots: 'angle inscrit centre cercle arc', texte: 'Un angle inscrit mesure **la moitié de l’angle au centre** qui intercepte le même arc.\nDeux angles inscrits qui interceptent le même arc sont égaux.' },
    { m: 'ma', titre: 'Volumes : pyramide et cône', mots: 'volume pyramide cone sphere boule', texte: '• Pyramide : **V = (aire de la base × hauteur) / 3**\n• Cône : **V = (π × r² × h) / 3**\n• Boule : V = (4/3) × π × r³' },
    { m: 'ma', titre: 'Statistiques', mots: 'statistiques moyenne mediane frequence effectif mode', texte: '• Moyenne = somme des valeurs / effectif total\n• Fréquence = effectif de la valeur / effectif total\n• Médiane : valeur du milieu quand les valeurs sont rangées dans l’ordre.' },
    { m: 'pc', titre: 'Loi d’Ohm', mots: 'ohm loi resistance tension intensite', texte: '**U = R × I** — U en volts (V), R en ohms (Ω), I en ampères (A).\nDonc R = U / I et I = U / R.' },
    { m: 'pc', titre: 'Puissance et énergie électriques', mots: 'puissance energie electrique watt joule kwh', texte: '• **P = U × I** (P en watts W)\n• **E = P × t** (E en joules J si t est en secondes ; en wattheures Wh si t est en heures)' },
    { m: 'pc', titre: 'Poids et masse', mots: 'poids masse newton intensite pesanteur g', texte: '**P = m × g** — P en newtons (N), m en kilogrammes (kg), g ≈ 9,8 N/kg sur Terre (souvent arrondi à 10 N/kg).\nLa masse ne change pas d’un lieu à l’autre ; le poids, si.' },
    { m: 'pc', titre: 'Masse volumique', mots: 'masse volumique densite', texte: '**ρ = m / V** (par exemple en g/cm³ ou en kg/m³). L’eau : 1 g/cm³.' },
    { m: 'pc', titre: 'pH des solutions', mots: 'ph acide basique neutre solution', texte: '• pH < 7 : solution **acide**\n• pH = 7 : solution **neutre**\n• pH > 7 : solution **basique**' },
    { m: 'pc', titre: 'Lentilles minces', mots: 'lentille convergente divergente vergence focale', texte: 'Une lentille convergente a les bords minces, une divergente les bords épais.\nVergence : **C = 1 / f** (C en dioptries δ, f en mètres).' },
    { m: 'pc', titre: 'Combustion du méthane', mots: 'combustion methane alcane hydrocarbure', texte: 'Combustion complète : **CH₄ + 2 O₂ → CO₂ + 2 H₂O**. Le dioxyde de carbone trouble l’eau de chaux.' },
    { m: 'hg', titre: 'Dates clés : Côte d’Ivoire', mots: 'cote ivoire independance date houphouet colonie 1960 1893', texte: '• 10 mars 1893 : la Côte d’Ivoire devient une colonie française\n• 1944 : conférence de Brazzaville\n• Octobre 1946 : création du RDA à Bamako\n• 1958 : la Côte d’Ivoire entre dans la Communauté française\n• **7 août 1960 : indépendance** ; Félix Houphouët-Boigny, premier président\n• 1983 : Yamoussoukro devient la capitale politique' },
    { m: 'hg', titre: 'Dates clés : monde et Afrique', mots: 'onu oua ua cedeao uemoa guerre mondiale date', texte: '• 1939-1945 : Seconde Guerre mondiale\n• 1945 : création de l’ONU\n• 25 mai 1963 : création de l’OUA à Addis-Abeba\n• 28 mai 1975 : création de la CEDEAO (traité de Lagos)\n• 10 janvier 1994 : création de l’UEMOA\n• 2002 : l’Union africaine remplace l’OUA' },
    { m: 'fr', titre: 'Accord du participe passé', mots: 'participe passe accord etre avoir', texte: '• Avec **être** : il s’accorde avec le sujet (« Elles sont parties »).\n• Avec **avoir** : il s’accorde avec le COD seulement s’il est placé **avant** le verbe (« Les fleurs que j’ai cueillies »).' },
    { m: 'ang', titre: 'Present perfect', mots: 'present perfect have has anglais', texte: '**have / has + participe passé** (« I have finished »).\nOn l’utilise pour une action passée liée au présent ; avec since, for, already, yet, ever, never.' }
  ];

  /* Méthodes : conseils de travail donnés par le conseiller. */
  var METHODES = [
    { mots: 'reviser revision revise efficace comment apprendre etudier', titre: 'Bien réviser', texte: '1. **Teste-toi au lieu de relire** : cache la leçon et récite, ou utilise tes cartes de révision.\n2. **Petites séances** : 25 minutes de travail, 5 minutes de pause.\n3. **Reviens plusieurs fois** : le lendemain, 3 jours après, une semaine après. L’application te propose les cartes au bon moment.\n4. **Fais une fiche** par chapitre : l’essentiel sur une seule page.' },
    { mots: 'memoriser retenir par coeur lecon oublie memoire', titre: 'Retenir une leçon', texte: '• Lis la leçon une fois en entier, puis **explique-la à voix haute** comme si tu étais le professeur.\n• Écris les mots-clés de mémoire, puis vérifie.\n• Transforme les définitions en cartes « question / réponse ».\n• Révise le soir, et relis rapidement le matin : le sommeil fixe la mémoire.' },
    { mots: 'devoir composition controle interro semaine', titre: 'Préparer un devoir ou une composition', texte: '• **J-7** : liste les chapitres et fais (ou relis) une fiche par chapitre.\n• **J-5 à J-2** : exercices, puis correction ; note tes erreurs.\n• **J-1** : révision légère des fiches et des erreurs, et au lit tôt.\n• Le jour J : lis tout le sujet, commence par ce que tu sais le mieux.' },
    { mots: 'stress peur angoisse anxieux panique trac', titre: 'Gérer le stress', texte: '• Le stress diminue quand on **se prépare tôt** : un petit peu chaque jour.\n• Respire : inspire 4 secondes, bloque 4, expire 6, trois fois.\n• Pendant l’épreuve, si tu bloques, passe à la question suivante et reviens après.\n• Parles-en à tes parents ou à un professeur : c’est normal d’avoir le trac.' },
    { mots: 'concentrer concentration distrait telephone jeux reseaux', titre: 'Rester concentré', texte: '• Téléphone **hors de la pièce** ou en mode avion pendant le travail.\n• Un seul objectif par séance (« finir les exercices 3 à 6 »).\n• Bureau rangé, eau à côté, 25 minutes chrono.\n• Récompense-toi après la séance.' },
    { mots: 'sommeil dormir fatigue fatigué nuit', titre: 'Le sommeil', texte: 'À ton âge, il faut environ **9 heures de sommeil**. Réviser tard la nuit fait oublier plus vite. Mieux vaut se coucher tôt et relire ses fiches au réveil.' },
    { mots: 'organiser planning semaine organisation planifier', titre: 'Organiser sa semaine', texte: '• Chaque soir : les devoirs pour le lendemain d’abord, puis 20 minutes de révision.\n• Le week-end : une séance plus longue sur la matière la plus faible.\n• Note tes devoirs dans l’application dès qu’ils sont donnés.' },
    { mots: 'fiche fiches resume synthese', titre: 'Faire une bonne fiche', texte: '• Une fiche = **un chapitre sur une page**.\n• Définitions, formules, dates, et un exemple.\n• Dans tes cours, écris « mot : définition » sur une ligne : l’application en fera automatiquement une carte de révision.\n• Commence une ligne par « ! » pour la mettre dans « À retenir ».' },
    { mots: 'redaction production ecrite argumentatif dissertation texte francais ecrire', titre: 'Français : la production écrite', texte: '• **Introduction** : présente le sujet et annonce ton plan.\n• **Développement** : un paragraphe par argument, chacun avec un exemple.\n• **Conclusion** : réponds clairement à la question, puis ouvre.\n• Garde 10 minutes pour te relire (accords, ponctuation).' },
    { mots: 'dictee orthographe fautes', titre: 'Français : réussir la dictée', texte: '• Relis trois fois, avec un objectif à chaque fois : les **accords sujet-verbe**, les **participes passés**, puis les **pluriels et les accents**.\n• Entraîne-toi chaque semaine avec un court texte.' },
    { mots: 'demonstration maths mathematiques rediger probleme exercice', titre: 'Maths : rédiger une démonstration', texte: '1. **On sait que** … (les données de l’énoncé)\n2. **Or** … (la propriété ou le théorème, cité en entier)\n3. **Donc** … (la conclusion)\nFais toujours une figure à main levée, et vérifie que le résultat est vraisemblable.' },
    { mots: 'physique chimie unite unites calcul', titre: 'Physique-Chimie : réussir un calcul', texte: '• Écris la formule littérale d’abord (U = R × I).\n• Convertis dans les bonnes unités **avant** de calculer.\n• Donne le résultat avec son unité.' },
    { mots: 'histoire geographie dates frise croquis carte', titre: 'Histoire-Géographie', texte: '• Fais une **frise chronologique** pour les dates.\n• Pour un croquis : titre, légende organisée, couleurs propres.\n• Apprends 3 ou 4 exemples précis par chapitre.' },
    { mots: 'svt schema biologie', titre: 'SVT : le schéma', texte: '• Crayon bien taillé, traits à la règle pour les légendes.\n• Un **titre** et des légendes alignées.\n• Apprends le vocabulaire précis : il rapporte des points.' },
    { mots: 'anglais vocabulaire verbes irreguliers langue espagnol', titre: 'Langues : progresser', texte: '• **10 mots par jour** avec des cartes de révision.\n• Les verbes irréguliers : 5 par jour, récités à voix haute.\n• Écoute une chanson ou une courte vidéo en anglais, avec les sous-titres.' },
    { mots: 'bepc bac cepe examen brevet fin annee', titre: 'Préparer un examen (CEPE, BEPC, BAC)', texte: '• Commence tôt : **une matière par jour**, à tour de rôle.\n• Entraîne-toi sur des sujets des années précédentes, en temps limité.\n• Les matières à fort coefficient d’abord, sans abandonner les autres.\n• L’application affiche le compte à rebours : indique la date dans Réglages › Profil dès qu’elle est annoncée.' },
    { mots: 'motivation envie courage decourage nul', titre: 'Garder la motivation', texte: '• Fixe-toi un petit objectif par semaine (« +1 point en maths »).\n• Regarde tes progrès dans l’onglet Notes : chaque point gagné compte.\n• Travaille avec un camarade sérieux une fois par semaine.\n• Tu n’es pas « nul » : tu n’as simplement pas encore la bonne méthode.' }
  ];

  return { MATIERES: MATIERES, PROGRAMME: PROGRAMME, MEMO: MEMO, METHODES: METHODES };   // programmes des autres classes : programmes.js
})();
