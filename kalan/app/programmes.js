/* KALAN — matières et programmes modèles par classe, du CP1 à la Terminale (système ivoirien).
   Ce sont des MODÈLES DE DÉPART : ils se chargent quand l'élève choisit sa classe et restent modifiables
   (ajouter, renommer ou retirer un chapitre ou une matière). Au lycée, ils sont à ajuster selon la série. */
(function (KB) {
  'use strict';
  var C = {
    fr: { nom: 'Français', couleur: '#e85d75', icone: 'livre' },
    ma: { nom: 'Mathématiques', couleur: '#3b82f6', icone: 'maths' },
    st: { nom: 'Sciences et technologie', couleur: '#22a06b', icone: 'feuille' },
    pc: { nom: 'Physique-Chimie', couleur: '#8b5cf6', icone: 'fiole' },
    svt: { nom: 'SVT', couleur: '#22a06b', icone: 'feuille' },
    hg: { nom: 'Histoire-Géographie', couleur: '#d97706', icone: 'globe' },
    ang: { nom: 'Anglais', couleur: '#0ea5e9', icone: 'langue' },
    lv2: { nom: 'Espagnol', couleur: '#ec4899', icone: 'langue' },
    philo: { nom: 'Philosophie', couleur: '#64748b', icone: 'ampoule' },
    edhc: { nom: 'EDHC', couleur: '#14b8a6', icone: 'balance' },
    eps: { nom: 'EPS', couleur: '#f97316', icone: 'ballon' },
    art: { nom: 'Arts', couleur: '#a855f7', icone: 'palette' }
  };
  /* Matières et coefficients par défaut (à recopier depuis le bulletin). */
  var LISTES = {
    primaire: [['fr', 3], ['ma', 3], ['st', 1], ['hg', 1], ['edhc', 1], ['eps', 1], ['art', 1]],
    college: [['fr', 3], ['ma', 3], ['pc', 2], ['svt', 2], ['hg', 2], ['ang', 2], ['edhc', 1], ['eps', 1], ['art', 1]],
    college2: [['fr', 3], ['ma', 3], ['pc', 2], ['svt', 2], ['hg', 2], ['ang', 2], ['lv2', 1], ['edhc', 1], ['eps', 1], ['art', 1]],
    lycee: [['fr', 3], ['ma', 3], ['pc', 3], ['svt', 2], ['hg', 2], ['ang', 2], ['lv2', 1], ['edhc', 1], ['eps', 1]],
    lycee2: [['fr', 3], ['philo', 2], ['ma', 3], ['pc', 3], ['svt', 2], ['hg', 2], ['ang', 2], ['lv2', 1], ['edhc', 1], ['eps', 1]]
  };
  var NIVEAU = { CP1: 'primaire', CP2: 'primaire', CE1: 'primaire', CE2: 'primaire', CM1: 'primaire', CM2: 'primaire', '6e': 'college', '5e': 'college', '4e': 'college2', '3e': 'college2', '2nde': 'lycee', '1re': 'lycee2', Tle: 'lycee2' };

  var EPS_P = ['Jeux de course et de relais', 'Jeux de ballon', 'Sauts et lancers', 'Équilibre et gymnastique'];
  var ART_P = ['Dessin et coloriage', 'Modelage et collage', 'Chants et comptines', 'Danses et jeux rythmiques'];
  var EPS_C = ['Athlétisme : courses, sauts, lancers', 'Sports collectifs (handball, football, basket-ball)', 'Gymnastique', 'Endurance'];
  var ART_C = ['Le dessin et la couleur', 'La composition', 'Les arts africains', 'Éducation musicale'];
  var EPS_L = ['Athlétisme', 'Sports collectifs', 'Gymnastique', 'Préparation physique et endurance'];

  var P = {
    CP1: {
      fr: ['Les voyelles', 'Les consonnes', 'Lire des syllabes simples', 'Lire des mots et de petites phrases', 'Écrire les lettres en cursive', 'Copier des mots et des phrases', 'S’exprimer à l’oral : se présenter, saluer'],
      ma: ['Les nombres de 0 à 10', 'Les nombres jusqu’à 30', 'Compter, comparer, ranger', 'L’addition', 'La soustraction', 'Les formes : carré, rectangle, triangle, rond', 'Se repérer dans l’espace'],
      st: ['Mon corps', 'Les aliments', 'Les animaux autour de moi', 'Les plantes'],
      hg: ['Ma famille', 'Mon école', 'Mon village, mon quartier'],
      edhc: ['La politesse', 'L’hygiène du corps', 'Le respect des autres'], eps: EPS_P, art: ART_P
    },
    CP2: {
      fr: ['Révision des sons simples', 'Les sons complexes (ou, on, an, oi…)', 'Lire de courts textes', 'Écrire des phrases simples', 'Dictée de mots', 'Expression orale : raconter'],
      ma: ['Les nombres jusqu’à 100', 'L’addition avec retenue', 'La soustraction', 'Initiation à la multiplication', 'Mesures : longueurs et monnaie', 'Lignes droites et courbes'],
      st: ['Les parties du corps et les cinq sens', 'L’eau', 'Les animaux domestiques et sauvages', 'Les plantes utiles'],
      hg: ['La famille', 'L’école', 'Le village et la ville', 'Les métiers'],
      edhc: ['Les règles de vie en classe', 'La propreté', 'Les droits de l’enfant'], eps: EPS_P, art: ART_P
    },
    CE1: {
      fr: ['Lecture courante', 'Le nom et le déterminant', 'Le verbe et le sujet', 'Le présent de l’indicatif', 'Les accords dans le groupe nominal', 'Rédiger un court paragraphe'],
      ma: ['Les nombres jusqu’à 1 000', 'Addition et soustraction posées', 'La multiplication et les tables', 'Initiation à la division', 'Mesures : longueurs, masses, monnaie', 'Les figures planes'],
      st: ['La respiration', 'La digestion', 'Les êtres vivants et leur milieu', 'La matière : solide et liquide'],
      hg: ['Se repérer dans le temps : jour, semaine, mois, année', 'La commune', 'Les points cardinaux', 'Les paysages'],
      edhc: ['La vie à l’école', 'L’environnement', 'La santé et l’hygiène'], eps: EPS_P, art: ART_P
    },
    CE2: {
      fr: ['Lecture et compréhension', 'Les types de phrases', 'Le passé composé et le futur', 'Les compléments', 'Les homophones (a/à, et/est, son/sont)', 'Rédaction : décrire'],
      ma: ['Les nombres jusqu’à 10 000', 'Les quatre opérations', 'Les fractions simples', 'Les mesures de durée', 'Le périmètre', 'Angles droits et figures'],
      st: ['Le squelette et les muscles', 'Les dents', 'La germination', 'L’air'],
      hg: ['L’histoire de la famille et du village', 'La Côte d’Ivoire : régions et villes', 'Le relief et les cours d’eau', 'Le climat'],
      edhc: ['Le respect des biens publics', 'La sécurité routière', 'La solidarité'], eps: EPS_P, art: ART_P
    },
    CM1: {
      fr: ['Lecture de textes variés', 'Natures et fonctions des mots', 'L’imparfait et le passé simple', 'Le participe passé (initiation)', 'Vocabulaire : synonymes et contraires', 'Rédaction : raconter un événement'],
      ma: ['Les grands nombres', 'Les nombres décimaux', 'Multiplication et division', 'Les fractions', 'Mesures : aires et capacités', 'La proportionnalité (initiation)', 'Géométrie : quadrilatères et cercle'],
      st: ['Le cœur et la circulation du sang', 'La reproduction des plantes', 'Les maladies : paludisme, choléra', 'L’électricité simple'],
      hg: ['Les grands empires africains', 'La colonisation (initiation)', 'La population de la Côte d’Ivoire', 'L’agriculture'],
      edhc: ['Les droits et devoirs de l’enfant', 'La protection de l’environnement', 'La paix et la tolérance'], eps: EPS_P, art: ART_P
    },
    CM2: {
      fr: ['Lecture et compréhension de textes', 'La phrase complexe (initiation)', 'Les temps de l’indicatif', 'Les accords', 'Vocabulaire', 'Rédaction', 'Préparation au CEPE'],
      ma: ['Nombres entiers et décimaux', 'Opérations sur les décimaux', 'Les fractions', 'Pourcentages et proportionnalité', 'Mesures : aires, volumes, durées', 'Figures et solides', 'Problèmes de type CEPE'],
      st: ['La reproduction humaine (initiation)', 'La nutrition et l’équilibre alimentaire', 'Les IST et le VIH/SIDA', 'L’énergie', 'La protection de l’environnement'],
      hg: ['La Côte d’Ivoire coloniale', 'L’indépendance de la Côte d’Ivoire', 'Les institutions de la Côte d’Ivoire', 'Les activités économiques', 'L’Afrique de l’Ouest'],
      edhc: ['Les droits et devoirs du citoyen', 'Les symboles de la République', 'La paix et la cohésion sociale'], eps: EPS_P, art: ART_P
    },
    '6e': {
      fr: ['La phrase et ses constituants', 'Le nom, l’adjectif, le déterminant', 'Le présent et le passé composé', 'Les accords', 'Lecture : le conte africain', 'Production écrite : le récit', 'La poésie'],
      ma: ['Nombres entiers et décimaux', 'Les opérations', 'Les fractions', 'La proportionnalité', 'Droites, demi-droites, segments', 'Les angles', 'Triangles et quadrilatères', 'Le cercle', 'Périmètres et aires', 'La symétrie orthogonale'],
      pc: ['La matière et ses états', 'Masse et volume', 'Mélanges et corps purs', 'Le circuit électrique simple'],
      svt: ['Les êtres vivants et leur milieu', 'La classification des êtres vivants', 'La cellule', 'La nutrition des plantes', 'Le sol'],
      hg: ['Introduction à l’histoire', 'La préhistoire', 'L’Égypte ancienne', 'Les empires du Ghana, du Mali et du Songhaï', 'La Terre dans l’univers', 'Les grands ensembles du relief', 'Les climats'],
      ang: ['Greetings and introductions', 'Family and friends', 'School life', 'Numbers, days and months', 'The simple present', 'Daily routine'],
      edhc: ['L’élève et la vie scolaire', 'Les droits de l’enfant', 'L’hygiène et la santé'], eps: EPS_C, art: ART_C
    },
    '5e': {
      fr: ['Les classes de mots', 'Les fonctions dans la phrase', 'L’imparfait et le passé simple', 'Le dialogue', 'Lecture : le roman d’aventure', 'Production écrite : la description', 'La lettre'],
      ma: ['Les nombres relatifs', 'Opérations sur les fractions', 'Calcul littéral (initiation)', 'Proportionnalité et pourcentages', 'La symétrie centrale', 'Le parallélogramme', 'Triangles : constructions et droites remarquables', 'Prismes et cylindres', 'Statistiques'],
      pc: ['Les états de l’eau', 'Température et changements d’état', 'Lumière et ombres', 'Circuits en série et en dérivation'],
      svt: ['La respiration', 'La digestion', 'La circulation sanguine', 'La reproduction des plantes à fleurs', 'Les micro-organismes'],
      hg: ['L’Afrique du VIIe au XVIe siècle', 'La traite négrière', 'Les royaumes de Côte d’Ivoire', 'Renaissance et grandes découvertes', 'La population mondiale', 'Climats et végétation'],
      ang: ['The simple past', 'Describing people and places', 'Food and health', 'Free time and hobbies', 'Can and must', 'Short texts : reading and writing'],
      edhc: ['La citoyenneté', 'La protection de l’environnement', 'La prévention des maladies'], eps: EPS_C, art: ART_C
    },
    '4e': {
      fr: ['La phrase complexe : juxtaposition, coordination, subordination', 'Les propositions subordonnées relatives', 'Le subjonctif', 'Les paroles rapportées', 'Lecture : la nouvelle', 'Production écrite : le texte explicatif', 'Le théâtre'],
      ma: ['Les puissances', 'Calcul littéral : développer et réduire', 'Équations du premier degré', 'Proportionnalité et vitesse', 'Le théorème de Pythagore', 'Le cosinus d’un angle', 'La droite des milieux', 'Pyramides et cônes (initiation)', 'Statistiques'],
      pc: ['Atomes et molécules', 'Séparation des mélanges', 'Intensité et tension électriques', 'Les lentilles (initiation)', 'Poids et masse'],
      svt: ['La relation de l’organisme avec son milieu', 'Le système nerveux', 'La puberté et la reproduction humaine', 'L’hygiène et la santé', 'Les roches et le sol'],
      hg: ['La colonisation de l’Afrique', 'La Côte d’Ivoire coloniale', 'La Première Guerre mondiale', 'La révolution industrielle', 'L’Afrique : milieux et populations', 'Les activités économiques en Afrique'],
      ang: ['The present perfect', 'Comparatives and superlatives', 'The future : will and going to', 'The environment', 'Letters and emails', 'Irregular verbs'],
      lv2: ['Saludos y presentaciones', 'La familia', 'La casa', 'La escuela', 'Los números y la hora', 'El presente'],
      edhc: ['Les institutions de la Côte d’Ivoire', 'Le civisme', 'La santé et la prévention'], eps: EPS_C, art: ART_C
    },
    '3e': KB.PROGRAMME,
    '2nde': {
      fr: ['Méthode : le résumé de texte', 'Le commentaire de texte (initiation)', 'La dissertation (initiation)', 'Le roman', 'La poésie', 'Le théâtre', 'Étude de la langue'],
      ma: ['Ensembles de nombres et intervalles', 'Calcul algébrique', 'Équations et inéquations', 'Fonctions de référence', 'Vecteurs et repérage', 'Géométrie dans l’espace', 'Statistiques', 'Trigonométrie'],
      pc: ['Mouvements et vitesse', 'Les forces', 'L’atome et la classification périodique', 'La mole', 'Les solutions', 'Les dipôles électriques'],
      svt: ['La cellule', 'Le métabolisme', 'La structure du globe terrestre', 'Les écosystèmes'],
      hg: ['Les civilisations antiques', 'L’islam et l’Afrique', 'Les grandes découvertes', 'La Terre, planète vivante', 'La population mondiale', 'Le développement'],
      ang: ['Tenses review', 'Modals', 'The passive voice', 'Reported speech', 'Essay writing', 'Reading comprehension'],
      lv2: ['Repaso de los tiempos', 'El pretérito indefinido', 'El imperativo', 'Expresar la opinión', 'Comprensión de textos'],
      edhc: ['L’État et la nation', 'Les droits de l’homme', 'La démocratie'], eps: EPS_L
    },
    '1re': {
      fr: ['Le résumé de texte', 'Le commentaire composé', 'La dissertation littéraire', 'La littérature africaine', 'Les grands courants littéraires', 'La poésie et le théâtre'],
      philo: ['Introduction à la philosophie', 'La conscience', 'Le langage', 'La culture', 'Méthode : la dissertation'],
      ma: ['Limites et continuité', 'La dérivation', 'Les suites numériques', 'Le barycentre', 'Le produit scalaire', 'Probabilités (initiation)', 'Trigonométrie'],
      pc: ['Travail et énergie', 'Énergie cinétique et potentielle', 'L’électrostatique', 'Chimie organique : alcanes et alcènes', 'Les réactions acide-base', 'L’oxydoréduction'],
      svt: ['La reproduction humaine', 'La génétique (initiation)', 'Le système nerveux', 'L’immunologie (initiation)', 'La géologie'],
      hg: ['La Révolution française', 'La révolution industrielle', 'L’impérialisme et la colonisation', 'La Première Guerre mondiale', 'Les ressources et l’énergie', 'L’agriculture dans le monde'],
      ang: ['Advanced tenses', 'Conditionals', 'Argumentative writing', 'Text analysis', 'Vocabulary building'],
      lv2: ['El subjuntivo', 'Los tiempos del pasado', 'Comentario de texto', 'Expresión escrita'],
      edhc: ['La citoyenneté et les institutions', 'Les organisations internationales'], eps: EPS_L
    },
    Tle: {
      fr: ['Le résumé de texte', 'Le commentaire composé', 'La dissertation littéraire', 'Les œuvres au programme', 'Préparation au BAC'],
      philo: ['La conscience et l’inconscient', 'La liberté', 'Autrui', 'Le travail', 'La raison et le réel', 'La vérité', 'L’État et la politique', 'La morale', 'Méthode : dissertation et commentaire'],
      ma: ['Limites et continuité', 'Dérivation et étude de fonctions', 'Fonctions logarithme et exponentielle', 'Primitives et intégrales', 'Suites numériques', 'Nombres complexes', 'Probabilités', 'Statistiques à deux variables'],
      pc: ['Cinématique', 'Les lois de Newton', 'Mouvements dans un champ', 'Les oscillations', 'L’électromagnétisme', 'Chimie organique : alcools et acides', 'La cinétique chimique', 'Acides, bases et pH'],
      svt: ['La génétique', 'L’immunologie', 'La reproduction', 'Le système nerveux et la communication', 'L’évolution', 'La géologie'],
      hg: ['La Seconde Guerre mondiale', 'La décolonisation', 'La guerre froide', 'Le monde depuis 1990', 'La Côte d’Ivoire depuis 1960', 'La mondialisation', 'Les grandes puissances économiques', 'L’intégration africaine'],
      ang: ['Essay writing', 'Text analysis', 'Advanced grammar', 'BAC practice'],
      lv2: ['Comentario de textos', 'Gramática avanzada', 'Expresión escrita', 'Preparación al BAC'],
      edhc: ['Les institutions internationales', 'La citoyenneté responsable'], eps: EPS_L
    }
  };

  KB.CATALOGUE = C;
  KB.PROGRAMMES = P;
  KB.niveau = function (classe) { return NIVEAU[classe] || ''; };
  /* Matières par défaut de la classe (nouvelles copies, modifiables). */
  KB.matieresPour = function (classe) {
    var l = LISTES[NIVEAU[classe]]; if (!l) return null;
    return l.map(function (x) { var m = C[x[0]]; return { id: x[0], nom: m.nom, coef: x[1], couleur: m.couleur, icone: m.icone }; });
  };
})(window.KB);
