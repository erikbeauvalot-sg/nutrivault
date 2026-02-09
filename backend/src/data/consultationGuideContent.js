/**
 * Consultation Guide Content
 *
 * Structured content for 8 consultation type guide PDFs.
 * Each guide maps to a motif_doctolib consultation type.
 * All content in French.
 */

const consultationGuides = [
  {
    slug: 'menopause',
    title: 'Guide : Ménopause et Alimentation',
    subtitle: 'Recommandations nutritionnelles pour bien vivre la ménopause',
    sections: [
      {
        heading: 'Introduction',
        body: 'La ménopause est une étape naturelle de la vie qui s\'accompagne de changements hormonaux importants. Une alimentation adaptée peut aider à réduire les symptômes (bouffées de chaleur, troubles du sommeil, prise de poids) et prévenir les risques associés comme l\'ostéoporose et les maladies cardiovasculaires. Ce guide vous propose des recommandations nutritionnelles fondées sur les données scientifiques actuelles.'
      },
      {
        heading: 'Aliments à privilégier',
        items: [
          'Produits laitiers et sources de calcium : yaourts, fromages, laits enrichis, sardines avec arêtes, amandes, brocoli — viser 1200 mg de calcium par jour',
          'Aliments riches en vitamine D : poissons gras (saumon, maquereau, hareng), jaune d\'œuf, champignons exposés au soleil — essentielle pour l\'absorption du calcium',
          'Phytoestrogènes naturels : soja et dérivés (tofu, tempeh, edamame), graines de lin, lentilles — peuvent atténuer les bouffées de chaleur',
          'Sources d\'oméga-3 : poissons gras 2 à 3 fois par semaine, noix, graines de chia, huile de colza — effet protecteur cardiovasculaire et anti-inflammatoire',
          'Fruits et légumes variés : au moins 5 portions par jour, privilégier les couleurs variées pour les antioxydants (baies, agrumes, légumes verts à feuilles)',
          'Céréales complètes : pain complet, riz brun, avoine, quinoa — riches en fibres, favorisent la satiété et régulent le transit',
          'Protéines maigres : volaille, poisson, légumineuses, œufs — maintien de la masse musculaire'
        ]
      },
      {
        heading: 'Aliments à limiter',
        items: [
          'Aliments ultra-transformés : plats préparés industriels, snacks emballés — souvent riches en sel, sucres ajoutés et graisses saturées',
          'Sucres rapides et produits sucrés : pâtisseries, boissons sucrées, confiseries — favorisent la prise de poids et les pics glycémiques',
          'Alcool : limiter à 1 verre par jour maximum — l\'alcool peut aggraver les bouffées de chaleur et fragiliser les os',
          'Caféine excessive : limiter à 2-3 tasses de café par jour — peut perturber le sommeil et aggraver l\'anxiété',
          'Sel en excès : réduire les charcuteries, fromages salés, plats industriels — favorise l\'hypertension et la rétention d\'eau',
          'Graisses saturées : limiter beurre, crème, viandes grasses — privilégier les graisses insaturées (huile d\'olive, avocat, oléagineux)'
        ]
      },
      {
        heading: 'Exemple de journée type',
        body: 'Petit-déjeuner : Porridge d\'avoine avec graines de lin, fruits rouges et un yaourt nature. Thé vert.\n\nDéjeuner : Salade de quinoa, pois chiches, légumes grillés (courgettes, poivrons), huile d\'olive et citron. Un fruit.\n\nCollation : Poignée d\'amandes et un fruit frais.\n\nDîner : Filet de saumon, brocoli vapeur, riz complet. Compote de pommes sans sucre ajouté.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Fractionnez vos repas : 3 repas principaux et 1 à 2 collations pour maintenir un métabolisme actif',
          'Hydratez-vous régulièrement : 1,5 à 2 litres d\'eau par jour, davantage en cas de bouffées de chaleur',
          'Pratiquez une activité physique régulière : au moins 30 minutes par jour, incluant des exercices de renforcement musculaire pour préserver la densité osseuse',
          'Exposez-vous au soleil 15-20 minutes par jour pour la synthèse de vitamine D',
          'Privilégiez les cuissons douces (vapeur, four) pour préserver les nutriments',
          'Tenez un journal alimentaire pour identifier les aliments qui aggravent vos symptômes'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Ces recommandations sont des conseils généraux basés sur les données nutritionnelles actuelles. Chaque situation est unique et mérite un accompagnement personnalisé. N\'hésitez pas à discuter de ces recommandations lors de votre prochaine consultation pour les adapter à votre profil et à vos besoins spécifiques. Un bilan sanguin régulier (calcium, vitamine D, bilan lipidique) est recommandé.'
      }
    ]
  },

  {
    slug: 'perte-de-poids',
    title: 'Guide : Perte de Poids Durable',
    subtitle: 'Stratégies nutritionnelles pour une perte de poids saine et pérenne',
    sections: [
      {
        heading: 'Introduction',
        body: 'La perte de poids durable repose sur une approche globale qui associe une alimentation équilibrée, une activité physique régulière et un bien-être psychologique. Les régimes restrictifs sont contre-productifs à long terme et provoquent l\'effet yoyo. Ce guide vous propose une approche progressive et bienveillante, sans privation excessive, pour atteindre et maintenir un poids de forme.'
      },
      {
        heading: 'Principes fondamentaux',
        items: [
          'Déficit calorique modéré : viser une réduction de 300 à 500 kcal par jour maximum — une perte de 0,5 à 1 kg par semaine est un rythme sain',
          'Ne jamais descendre en dessous de 1200 kcal/jour (femmes) ou 1500 kcal/jour (hommes) — un apport trop bas ralentit le métabolisme',
          'Privilégier la qualité des aliments plutôt que de compter les calories de façon obsessionnelle',
          'Maintenir un apport protéique suffisant : 1,2 à 1,6 g/kg de poids corporel pour préserver la masse musculaire',
          'Manger en pleine conscience : prendre le temps de savourer, écouter ses signaux de faim et de satiété'
        ]
      },
      {
        heading: 'Aliments à privilégier',
        items: [
          'Légumes à volonté : crus ou cuits, ils apportent volume, fibres et micronutriments avec peu de calories',
          'Protéines maigres à chaque repas : poulet, dinde, poisson, œufs, tofu, légumineuses — effet rassasiant important',
          'Féculents complets en quantité adaptée : riz complet, pâtes complètes, patate douce, quinoa — énergie durable',
          'Fruits frais : 2 à 3 portions par jour, riches en fibres et vitamines — éviter les jus de fruits',
          'Bonnes graisses en quantité contrôlée : huile d\'olive, avocat, oléagineux (une poignée), poissons gras',
          'Aliments riches en fibres : légumineuses, céréales complètes, graines — favorisent la satiété et le transit'
        ]
      },
      {
        heading: 'Aliments à limiter',
        items: [
          'Boissons sucrées et alcool : calories « vides » sans effet rassasiant — privilégier l\'eau, les tisanes',
          'Aliments ultra-transformés : chips, biscuits industriels, plats préparés — très caloriques et peu nutritifs',
          'Sauces industrielles et condiments sucrés : ketchup, mayonnaise — remplacer par moutarde, herbes, épices, citron',
          'Portions excessives de féculents : adapter la portion à votre niveau d\'activité physique',
          'Grignotage entre les repas : si besoin, prévoir des collations saines (fruits, yaourt, oléagineux)'
        ]
      },
      {
        heading: 'Exemple de journée type',
        body: 'Petit-déjeuner : 2 œufs brouillés, une tranche de pain complet, un fruit, thé ou café sans sucre.\n\nDéjeuner : Filet de poulet grillé, grande portion de légumes variés, 3-4 cuillères à soupe de riz complet, un filet d\'huile d\'olive.\n\nCollation : Un yaourt nature avec quelques noix.\n\nDîner : Soupe de légumes maison, pavé de saumon, salade verte. Un fruit.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Planifiez vos repas à l\'avance pour éviter les choix impulsifs — le batch cooking du dimanche est une excellente habitude',
          'Utilisez des assiettes plus petites pour mieux contrôler les portions visuellement',
          'Buvez un grand verre d\'eau 15-20 minutes avant les repas pour favoriser la satiété',
          'Dormez suffisamment : le manque de sommeil augmente la ghréline (hormone de la faim)',
          'Pesez-vous une fois par semaine maximum, le matin à jeun — les fluctuations quotidiennes sont normales',
          'Célébrez les petites victoires et soyez bienveillant avec vous-même en cas d\'écart'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'La perte de poids est un processus individuel qui dépend de nombreux facteurs (métabolisme, histoire pondérale, conditions médicales, mode de vie). Ces recommandations générales seront adaptées à votre profil lors de nos consultations. Il est essentiel de ne pas se fixer d\'objectifs irréalistes et de privilégier votre santé globale plutôt que le chiffre sur la balance.'
      }
    ]
  },

  {
    slug: 'reequilibrage-alimentaire',
    title: 'Guide : Rééquilibrage Alimentaire',
    subtitle: 'Retrouver une alimentation saine et équilibrée au quotidien',
    sections: [
      {
        heading: 'Introduction',
        body: 'Le rééquilibrage alimentaire n\'est pas un régime mais une remise à plat de vos habitudes alimentaires. L\'objectif est de retrouver un rapport serein à l\'alimentation en privilégiant des aliments nutritifs, variés et savoureux. Il ne s\'agit pas de supprimer des aliments mais d\'apprendre à mieux les doser et les combiner pour couvrir tous vos besoins nutritionnels.'
      },
      {
        heading: 'Les bases de l\'équilibre alimentaire',
        items: [
          'Composition de l\'assiette idéale : 1/2 de légumes, 1/4 de protéines, 1/4 de féculents complets',
          '5 fruits et légumes par jour minimum : varier les couleurs et les modes de préparation',
          'Protéines à chaque repas : alterner protéines animales et végétales sur la semaine',
          '3 produits laitiers par jour ou équivalents pour le calcium',
          'Féculents complets à chaque repas : source d\'énergie durable et de fibres',
          'Matières grasses de qualité : 2 à 3 cuillères à soupe par jour d\'huile (olive, colza, noix)',
          'Hydratation : 1,5 à 2 litres d\'eau par jour'
        ]
      },
      {
        heading: 'Répartition des repas',
        items: [
          'Petit-déjeuner complet : ne pas le sauter, il lance le métabolisme et évite les fringales de fin de matinée',
          'Déjeuner : le repas le plus consistant de la journée, incluant protéines, féculents et légumes',
          'Dîner : plus léger que le déjeuner, privilégier les légumes et protéines légères (poisson, œufs)',
          'Collations si besoin : un fruit + quelques oléagineux ou un produit laitier — pas de grignotage anarchique'
        ]
      },
      {
        heading: 'Aliments à redécouvrir',
        items: [
          'Légumineuses : lentilles, pois chiches, haricots rouges — excellente source de protéines végétales et fibres, à intégrer 2 à 3 fois par semaine',
          'Céréales complètes variées : quinoa, boulgour, sarrasin, épeautre — changez des pâtes et du riz blanc',
          'Oléagineux : noix, amandes, noisettes — une poignée par jour pour les bons acides gras et minéraux',
          'Épices et herbes aromatiques : curcuma, gingembre, basilic, persil — donnent du goût sans sel ni gras',
          'Poissons gras : saumon, sardines, maquereau — 2 fois par semaine pour les oméga-3'
        ]
      },
      {
        heading: 'Exemple de journée type',
        body: 'Petit-déjeuner : Pain complet, beurre, confiture maison. Un fruit frais. Thé ou café.\n\nDéjeuner : Taboulé de quinoa aux légumes croquants (concombre, tomate, poivron), dés de feta, menthe fraîche. Un yaourt.\n\nCollation : Une pomme et quelques noisettes.\n\nDîner : Omelette aux champignons et fines herbes, salade verte à l\'huile de noix. Pain complet. Compote.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Faites vos courses avec une liste préparée à l\'avance — évitez les rayons tentations',
          'Cuisinez maison le plus possible : vous contrôlez les ingrédients et les quantités',
          'Apprenez à lire les étiquettes : méfiez-vous des sucres cachés et des longues listes d\'additifs',
          'Mangez lentement : au moins 20 minutes par repas pour ressentir la satiété',
          'Ne diabolisez aucun aliment : le plaisir fait partie de l\'équilibre alimentaire',
          'Progressez par étapes : changez une habitude à la fois pour que ça dure'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Le rééquilibrage alimentaire est un processus progressif qui s\'inscrit dans la durée. Ces recommandations sont des repères généraux que nous adapterons ensemble en fonction de vos goûts, votre rythme de vie, vos contraintes et vos objectifs personnels. L\'important est de trouver VOTRE équilibre, celui qui vous convient et que vous pourrez maintenir sur le long terme.'
      }
    ]
  },

  {
    slug: 'sii',
    title: 'Guide : Syndrome de l\'Intestin Irritable (SII)',
    subtitle: 'Alimentation adaptée pour soulager les troubles digestifs',
    sections: [
      {
        heading: 'Introduction',
        body: 'Le Syndrome de l\'Intestin Irritable (SII) touche environ 10 à 15 % de la population et se manifeste par des douleurs abdominales, des ballonnements, et des troubles du transit (diarrhée, constipation, ou alternance des deux). L\'alimentation joue un rôle central dans la gestion des symptômes. Ce guide vous présente les principes d\'une alimentation adaptée, notamment l\'approche pauvre en FODMAPs, reconnue scientifiquement pour soulager les symptômes du SII.'
      },
      {
        heading: 'Qu\'est-ce que les FODMAPs ?',
        body: 'Les FODMAPs sont des sucres fermentescibles présents dans de nombreux aliments : Fermentable Oligosaccharides, Disaccharides, Monosaccharides And Polyols. Mal absorbés dans l\'intestin grêle, ils fermentent dans le côlon et provoquent gaz, ballonnements et douleurs chez les personnes sensibles. L\'approche pauvre en FODMAPs se déroule en 3 phases : élimination (4 à 6 semaines), réintroduction progressive, et personnalisation à long terme.'
      },
      {
        heading: 'Aliments généralement bien tolérés (pauvres en FODMAPs)',
        items: [
          'Protéines : viande, poisson, œufs, tofu ferme — non transformés, sans sauce industrielle',
          'Céréales : riz, quinoa, avoine (petite quantité), maïs, sarrasin, millet',
          'Légumes : carottes, courgettes, haricots verts, épinards, poivrons, tomates, laitue, concombre',
          'Fruits : fraises, myrtilles, raisin, orange, kiwi, banane (pas trop mûre), ananas',
          'Produits laitiers : fromages affinés (comté, parmesan), beurre, laits sans lactose',
          'Graisses : huile d\'olive, huile de colza, beurre — en quantités raisonnables',
          'Herbes et épices : la plupart sont bien tolérées (basilic, ciboulette, curcuma, gingembre)'
        ]
      },
      {
        heading: 'Aliments riches en FODMAPs à éviter en phase d\'élimination',
        items: [
          'Légumes : ail, oignon, poireau, artichaut, asperge, chou-fleur, champignons',
          'Fruits : pomme, poire, mangue, cerise, pastèque, prune, abricot',
          'Céréales : blé en grande quantité (pain, pâtes, couscous), seigle',
          'Produits laitiers : lait de vache, yaourt classique, fromages frais, crème glacée',
          'Légumineuses : pois chiches, lentilles, haricots rouges — en grande quantité',
          'Édulcorants : sorbitol, mannitol, xylitol — présents dans les bonbons « sans sucre » et chewing-gums',
          'Boissons : jus de pomme, jus de poire, chicorée, tisanes au fenouil'
        ]
      },
      {
        heading: 'Exemple de journée type (phase d\'élimination)',
        body: 'Petit-déjeuner : Porridge de flocons d\'avoine (40g) avec myrtilles et graines de chia. Thé vert.\n\nDéjeuner : Filet de poulet grillé, riz basmati, courgettes et carottes sautées à l\'huile d\'olive avec herbes de Provence.\n\nCollation : Une banane pas trop mûre et quelques noix de macadamia.\n\nDîner : Saumon papillote, pommes de terre, haricots verts vapeur, un filet de citron. Fraises en dessert.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Tenez un journal alimentaire et de symptômes : indispensable pour identifier vos déclencheurs personnels',
          'Ne supprimez JAMAIS tous les FODMAPs indéfiniment — la phase d\'élimination est temporaire (4-6 semaines)',
          'Réintroduisez un groupe de FODMAPs à la fois, pendant 3 jours, en notant vos réactions',
          'Mangez dans le calme, asseyez-vous, et mastiquez bien — le stress aggrave le SII',
          'Évitez les repas trop copieux : privilégiez des repas de taille modérée et réguliers',
          'Limitez le café (max 2 tasses) et les boissons gazeuses',
          'L\'exercice physique modéré et régulier aide à réduire les symptômes'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Le régime pauvre en FODMAPs est un outil thérapeutique qui doit être encadré par un professionnel de nutrition. Il ne s\'agit pas d\'un régime permanent mais d\'une démarche en 3 phases pour identifier VOS sensibilités personnelles. Chaque personne atteinte de SII a un profil unique. Nous travaillerons ensemble à trouver votre alimentation optimale, équilibrée et la moins restrictive possible.'
      }
    ]
  },

  {
    slug: 'pathologies-feminines',
    title: 'Guide : Pathologies Féminines (SOPK, Endométriose)',
    subtitle: 'Alimentation anti-inflammatoire et hormonale',
    sections: [
      {
        heading: 'Introduction',
        body: 'Le Syndrome des Ovaires Polykystiques (SOPK) et l\'endométriose sont des conditions hormonales fréquentes qui peuvent être significativement influencées par l\'alimentation. Le SOPK touche environ 1 femme sur 10 et se caractérise par des déséquilibres hormonaux et une résistance à l\'insuline. L\'endométriose affecte environ 1 femme sur 10 et provoque des douleurs chroniques liées à l\'inflammation. Une alimentation anti-inflammatoire et adaptée à l\'équilibre hormonal peut contribuer à réduire les symptômes de ces deux conditions.'
      },
      {
        heading: 'Principes alimentaires pour le SOPK',
        items: [
          'Contrôler l\'index glycémique : privilégier les céréales complètes, éviter les sucres rapides — la résistance à l\'insuline est centrale dans le SOPK',
          'Combiner fibres + protéines + bonnes graisses à chaque repas pour ralentir l\'absorption des glucides',
          'Favoriser les aliments riches en chrome : brocoli, haricots verts, viande maigre — aide à la sensibilité à l\'insuline',
          'Consommer des aliments riches en inositol : légumineuses, agrumes, noix — études prometteuses sur la régulation hormonale',
          'Apport suffisant en magnésium : oléagineux, chocolat noir, épinards — souvent déficient dans le SOPK',
          'Limiter les produits laitiers si suspicion de sensibilité — certains composés laitiers peuvent aggraver l\'acné liée au SOPK'
        ]
      },
      {
        heading: 'Principes alimentaires pour l\'endométriose',
        items: [
          'Alimentation anti-inflammatoire : augmenter les oméga-3 (poissons gras, lin, chia), réduire les oméga-6 (huile de tournesol, viande grasse)',
          'Antioxydants en abondance : fruits rouges, légumes colorés, thé vert, curcuma — combattent le stress oxydatif',
          'Fibres pour l\'élimination des œstrogènes excédentaires : légumineuses, céréales complètes, graines de lin moulues',
          'Réduire les perturbateurs endocriniens : privilégier le bio quand possible, éviter le plastique au contact alimentaire',
          'Limiter la viande rouge : associée à un risque accru d\'endométriose dans certaines études',
          'Augmenter les crucifères : brocoli, chou, chou-fleur, chou de Bruxelles — contiennent des composés qui aident au métabolisme des œstrogènes'
        ]
      },
      {
        heading: 'Aliments à privilégier (communs aux deux conditions)',
        items: [
          'Poissons gras : saumon, sardines, maquereau — 2 à 3 fois par semaine pour les oméga-3 anti-inflammatoires',
          'Légumes verts et crucifères : brocoli, épinards, chou kale — riches en folates, fer et composés protecteurs',
          'Fruits rouges et baies : myrtilles, framboises, cerises — puissants antioxydants',
          'Graines de lin moulues : 1 à 2 cuillères à soupe par jour — lignanes et oméga-3',
          'Curcuma avec poivre noir : anti-inflammatoire naturel reconnu',
          'Légumineuses : lentilles, pois chiches — fibres, protéines végétales, index glycémique bas'
        ]
      },
      {
        heading: 'Exemple de journée type',
        body: 'Petit-déjeuner : Smoothie vert (épinards, banane, myrtilles, graines de lin, lait d\'amande). Pain de seigle complet avec avocat.\n\nDéjeuner : Salade de lentilles, saumon fumé, roquette, tomates cerises, graines de courge, vinaigrette huile de colza et citron.\n\nCollation : Carré de chocolat noir (70%+) et une poignée d\'amandes.\n\nDîner : Curry de pois chiches au lait de coco et curcuma, riz basmati complet, brocoli vapeur.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Réduisez le stress : le cortisol aggrave les déséquilibres hormonaux — yoga, méditation, marche en nature',
          'Dormez 7 à 9 heures par nuit : le sommeil est essentiel à la régulation hormonale',
          'Activité physique régulière mais sans excès : la marche, le yoga, la natation sont particulièrement adaptés',
          'Évitez les contenants en plastique : utilisez verre, inox, céramique pour conserver et réchauffer vos aliments',
          'Notez vos symptômes en lien avec votre cycle : cela nous aidera à personnaliser votre prise en charge'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Le SOPK et l\'endométriose sont des conditions complexes qui nécessitent une approche globale, souvent en coordination avec votre gynécologue et/ou endocrinologue. L\'alimentation est un levier puissant mais ne remplace pas un suivi médical. Nous adapterons ces recommandations à votre situation spécifique, vos symptômes et vos éventuels traitements en cours.'
      }
    ]
  },

  {
    slug: 'vegetaliser-alimentation',
    title: 'Guide : Végétaliser son Alimentation',
    subtitle: 'Intégrer davantage de végétal dans son assiette en toute sécurité',
    sections: [
      {
        heading: 'Introduction',
        body: 'Végétaliser son alimentation signifie augmenter la part des aliments d\'origine végétale dans ses repas, que ce soit dans une démarche flexitarienne, végétarienne ou végétalienne. Cette transition, bénéfique pour la santé et l\'environnement, doit être accompagnée pour éviter les carences nutritionnelles. Ce guide vous aide à intégrer plus de végétal dans votre quotidien de manière équilibrée et gourmande.'
      },
      {
        heading: 'Les nutriments clés à surveiller',
        items: [
          'Protéines : combiner céréales + légumineuses dans la même journée pour obtenir tous les acides aminés essentiels (ex: riz + lentilles, semoule + pois chiches)',
          'Vitamine B12 : supplément INDISPENSABLE si alimentation végétalienne — aucune source végétale fiable n\'existe. Dosage recommandé : 10 µg/jour ou 2000 µg/semaine',
          'Fer : les sources végétales (lentilles, épinards, tofu) sont moins bien absorbées. Astuce : associer avec de la vitamine C (citron, poivron) pour multiplier l\'absorption par 2 à 3',
          'Zinc : graines de courge, lentilles, noix de cajou, pois chiches — tremper les légumineuses réduit les phytates qui bloquent l\'absorption',
          'Calcium : chou kale, brocoli, tofu calcique, amandes, eaux minérales riches en calcium (Contrex, Hépar) — viser 800-1000 mg/jour',
          'Oméga-3 : graines de lin moulues (1 cuillère à soupe/jour), noix, huile de colza. En cas d\'alimentation végétalienne, considérer un complément en DHA/EPA d\'algues',
          'Iode : si suppression des produits laitiers, penser aux algues (avec modération) ou au sel iodé'
        ]
      },
      {
        heading: 'Sources de protéines végétales',
        items: [
          'Légumineuses : lentilles (vertes, corail, beluga), pois chiches, haricots (rouges, blancs, noirs), fèves, pois cassés — base de l\'alimentation végétale',
          'Soja et dérivés : tofu (ferme, soyeux), tempeh, edamame, protéines de soja texturées — excellentes protéines complètes',
          'Céréales riches en protéines : quinoa, sarrasin, épeautre, avoine — complètent les légumineuses',
          'Oléagineux et graines : amandes, noix de cajou, graines de chanvre, de tournesol, de courge — en complément',
          'Seitan (gluten de blé) : très riche en protéines, texture proche de la viande — attention en cas de sensibilité au gluten'
        ]
      },
      {
        heading: 'Comment réussir la transition',
        items: [
          'Progressivité : commencez par 1 à 2 repas végétaux par semaine, puis augmentez graduellement',
          'Le lundi vert : dédiez un jour par semaine entièrement végétal pour expérimenter',
          'Explorez de nouvelles recettes : cuisine indienne, libanaise, mexicaine, éthiopienne — naturellement riches en plats végétaux savoureux',
          'Maîtrisez les bases : apprendre à bien cuire les légumineuses, préparer le tofu, utiliser les épices',
          'Prévoyez à l\'avance : le batch cooking de légumineuses et céréales facilite la semaine'
        ]
      },
      {
        heading: 'Exemple de journée type (flexitarienne)',
        body: 'Petit-déjeuner : Tartines de pain complet, houmous, tomates, graines de sésame. Thé ou café.\n\nDéjeuner : Buddha bowl — riz complet, pois chiches rôtis aux épices, avocat, chou rouge, carottes râpées, sauce tahini-citron.\n\nCollation : Yaourt (végétal ou laitier) avec des noix et un fruit.\n\nDîner : Dahl de lentilles corail au lait de coco et curcuma, riz basmati, épinards sautés à l\'ail.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Faites tremper vos légumineuses sèches 8-12h avant cuisson : meilleure digestibilité et réduction des anti-nutriments',
          'Assaisonnez bien : la cuisine végétale est délicieuse quand elle est bien épicée et assaisonnée',
          'Gardez des protéines de soja texturées et des conserves de légumineuses en réserve : solution rapide pour les jours pressés',
          'Faites un bilan sanguin annuel : fer, B12, vitamine D, zinc — pour vérifier que tout va bien',
          'Ne remplacez pas la viande par des ultra-transformés végétaux (nuggets, steaks végétaux industriels) — consommez-les occasionnellement'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Végétaliser son alimentation est un excellent choix pour la santé lorsque c\'est fait de manière éclairée. Le risque principal réside dans les carences, en particulier en B12 pour les végétaliens. Nous adapterons ces recommandations à votre niveau de végétalisation souhaité et surveillerons vos apports nutritionnels via des bilans réguliers. N\'hésitez pas à poser toutes vos questions lors de nos consultations.'
      }
    ]
  },

  {
    slug: 'maladies-cardiovasculaires',
    title: 'Guide : Maladies Cardiovasculaires et Alimentation',
    subtitle: 'Protéger son cœur par une alimentation adaptée',
    sections: [
      {
        heading: 'Introduction',
        body: 'Les maladies cardiovasculaires sont la première cause de mortalité dans le monde. L\'alimentation joue un rôle majeur dans la prévention et la gestion de ces pathologies. Que vous ayez des facteurs de risque (hypertension, cholestérol élevé, diabète) ou des antécédents cardiovasculaires, adopter une alimentation de type méditerranéen peut réduire significativement votre risque. Ce guide s\'inspire du régime méditerranéen, dont les bénéfices cardiovasculaires sont les mieux documentés scientifiquement.'
      },
      {
        heading: 'Principes du régime méditerranéen',
        items: [
          'Huile d\'olive extra-vierge comme matière grasse principale : 2 à 4 cuillères à soupe par jour — riche en polyphénols protecteurs',
          'Fruits et légumes en abondance : au moins 5 à 7 portions par jour — antioxydants et fibres',
          'Céréales complètes plutôt que raffinées : pain complet, riz complet, avoine — réduisent le cholestérol LDL',
          'Poisson 2 à 3 fois par semaine, en particulier les poissons gras : sardines, maquereau, saumon — oméga-3 cardioprotecteurs',
          'Légumineuses plusieurs fois par semaine : lentilles, pois chiches, haricots — protéines végétales et fibres solubles',
          'Oléagineux quotidiennement : une poignée de noix, amandes — réduisent le cholestérol',
          'Viande rouge limitée à 1 à 2 fois par semaine maximum, privilégier volaille et poisson',
          'Vin rouge avec modération (optionnel) : maximum 1 verre par jour, jamais en excès'
        ]
      },
      {
        heading: 'Aliments protecteurs pour le cœur',
        items: [
          'Avoine et orge : fibres solubles (bêta-glucanes) qui réduisent le cholestérol — porridge le matin',
          'Noix : 30g par jour associés à une réduction de 30% du risque cardiovasculaire dans l\'étude PREDIMED',
          'Ail : propriétés antihypertensives et hypocholestérolémiantes — consommer cru ou légèrement cuit',
          'Tomates : lycopène, puissant antioxydant — la cuisson augmente sa biodisponibilité (sauce tomate, tomates rôties)',
          'Thé vert : catéchines protectrices — 2 à 3 tasses par jour',
          'Chocolat noir (70%+) : flavonoïdes bénéfiques — 1 à 2 carrés par jour',
          'Graines de lin moulues : lignanes et oméga-3 — 1 cuillère à soupe dans le yaourt ou le smoothie'
        ]
      },
      {
        heading: 'Aliments à limiter impérativement',
        items: [
          'Sel : maximum 5g par jour (1 cuillère à café) — réduire sel de table, charcuteries, plats industriels, pain blanc. Utiliser des herbes, épices, citron pour assaisonner',
          'Graisses saturées et trans : limiter beurre, crème, viennoiseries, fritures, margarines hydrogénées. Remplacer par huile d\'olive et oléagineux',
          'Charcuteries et viandes transformées : bacon, saucisses, jambon — associés à un risque cardiovasculaire accru',
          'Sucres ajoutés et boissons sucrées : favorisent l\'obésité, le diabète et les dyslipidémies',
          'Alcool en excès : toxique pour le cœur au-delà d\'1 verre par jour',
          'Aliments ultra-transformés : lisez les étiquettes, si plus de 5 ingrédients ou des noms imprononçables, évitez'
        ]
      },
      {
        heading: 'Exemple de journée type',
        body: 'Petit-déjeuner : Porridge d\'avoine avec noix, graines de lin moulues et fruits rouges. Thé vert.\n\nDéjeuner : Salade méditerranéenne — tomates, concombre, olives, feta, pois chiches, huile d\'olive, origan. Pain complet.\n\nCollation : Une poignée de noix et un fruit.\n\nDîner : Sardines grillées, ratatouille maison (aubergine, courgette, tomate, poivron, ail), quinoa. Un carré de chocolat noir.'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Remplacez le beurre par l\'huile d\'olive dans votre cuisine quotidienne',
          'Utilisez des herbes fraîches et des épices pour remplacer le sel : c\'est la clé du goût sans le sodium',
          'Lisez les étiquettes : comparez la teneur en sel et en graisses saturées entre les produits',
          'Cuisinez maison : les plats industriels contiennent souvent des quantités cachées de sel et de graisses',
          'Activité physique : au moins 150 minutes par semaine d\'activité modérée (marche rapide, vélo, natation)',
          'Gérez votre stress : la cohérence cardiaque, la méditation et la relaxation réduisent la tension artérielle'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Ces recommandations générales s\'inscrivent dans le cadre d\'une prise en charge globale de votre santé cardiovasculaire. Elles doivent être adaptées à votre profil spécifique (type de pathologie, traitements en cours, autres conditions). Un suivi régulier de votre bilan lipidique, de votre tension artérielle et de votre glycémie est essentiel. La collaboration avec votre médecin traitant et/ou cardiologue est fondamentale.'
      }
    ]
  },

  {
    slug: 'intolerances-alimentaires',
    title: 'Guide : Intolérances Alimentaires',
    subtitle: 'Gérer les intolérances tout en maintenant une alimentation équilibrée',
    sections: [
      {
        heading: 'Introduction',
        body: 'Les intolérances alimentaires (à ne pas confondre avec les allergies, qui impliquent le système immunitaire) sont des réactions digestives désagréables à certains aliments. Les plus courantes sont l\'intolérance au lactose et la sensibilité au gluten non cœliaque. Ce guide vous aide à identifier les aliments problématiques, à trouver des alternatives nutritives et à maintenir une alimentation équilibrée malgré les restrictions.'
      },
      {
        heading: 'Intolérance au lactose',
        items: [
          'Qu\'est-ce que c\'est : déficit en lactase, l\'enzyme qui digère le lactose (sucre du lait). Touche 30 à 50% des adultes en France',
          'Symptômes : ballonnements, gaz, diarrhée, crampes abdominales — 30 min à 2h après consommation de lactose',
          'Aliments à limiter : lait de vache, crèmes dessert, crème fraîche, glaces, fromages frais',
          'Aliments généralement tolérés : fromages affinés (comté, gruyère, parmesan — presque sans lactose), yaourts (les bactéries pré-digèrent une partie du lactose), beurre (très peu de lactose)',
          'Alternatives : laits végétaux enrichis en calcium (soja, amande, avoine), crèmes végétales, yaourts au soja',
          'Astuce : le seuil de tolérance est individuel, de nombreuses personnes tolèrent de petites quantités de lactose'
        ]
      },
      {
        heading: 'Sensibilité au gluten non cœliaque',
        items: [
          'Qu\'est-ce que c\'est : symptômes digestifs liés au gluten sans être la maladie cœliaque (à exclure d\'abord via prise de sang et biopsie)',
          'Symptômes : ballonnements, fatigue, douleurs abdominales, brouillard mental — peuvent apparaître jusqu\'à 48h après ingestion',
          'Céréales contenant du gluten : blé (pain, pâtes, biscuits), seigle, orge, épeautre, kamut',
          'Céréales et pseudo-céréales sans gluten : riz, maïs, quinoa, sarrasin, millet, amarante, teff, sorgho',
          'Attention aux sources cachées : sauces soja (préférer le tamari), chapelure, bière, certaines charcuteries, assaisonnements industriels',
          'Farine alternatives : farine de riz, de sarrasin, de maïs, de pois chiches, de châtaigne — mélanger pour de meilleurs résultats en pâtisserie'
        ]
      },
      {
        heading: 'Autres intolérances courantes',
        items: [
          'Fructose : limiter les fruits très sucrés (pomme, poire, mangue), le miel, le sirop d\'agave. Souvent associée au SII',
          'Histamine : poisson pas frais, fromages affinés, charcuterie, vin, tomates — pour les personnes sensibles à l\'histamine',
          'Sulfites : vin, fruits secs, moutarde — peuvent provoquer maux de tête et symptômes respiratoires',
          'FODMAPs : voir le guide spécifique SII si vous avez des troubles digestifs multiples'
        ]
      },
      {
        heading: 'Maintenir l\'équilibre nutritionnel',
        items: [
          'Calcium : si éviction des produits laitiers, compensez avec des eaux calciques, du chou kale, du brocoli, des amandes, du tofu calcique',
          'Fibres : si éviction du gluten, les céréales complètes sans gluten (riz complet, quinoa) et les légumineuses maintiennent l\'apport en fibres',
          'Vitamines B : les céréales complètes sans gluten, les légumineuses, les œufs et les oléagineux compensent l\'absence de blé',
          'Ne supprimez pas d\'aliments sans raison valable : un régime d\'éviction non justifié peut créer des carences'
        ]
      },
      {
        heading: 'Exemple de journée type (sans lactose, pauvre en gluten)',
        body: 'Petit-déjeuner : Galettes de sarrasin avec purée d\'amande et banane. Cappuccino au lait d\'avoine.\n\nDéjeuner : Poulet rôti, riz complet, ratatouille maison. Compote de fruits sans sucre ajouté.\n\nCollation : Houmous avec bâtonnets de carottes et crackers de riz.\n\nDîner : Saumon au four, purée de patate douce, salade verte. Mousse au chocolat noir (au lait de coco).'
      },
      {
        heading: 'Conseils pratiques',
        items: [
          'Consultez un médecin AVANT de supprimer un groupe alimentaire : il faut d\'abord exclure la maladie cœliaque et les allergies',
          'Tenez un journal alimentaire pendant 2 à 4 semaines pour identifier les aliments déclencheurs',
          'En restaurant, n\'hésitez pas à demander la composition des plats et à signaler vos intolérances',
          'Lisez systématiquement les étiquettes : les allergènes sont en gras dans la liste des ingrédients (réglementation européenne)',
          'Cuisinez maison autant que possible pour maîtriser les ingrédients',
          'Diversifiez vos alternatives : variez les laits végétaux, les farines sans gluten, les protéines'
        ]
      },
      {
        heading: 'Note professionnelle',
        body: 'Le diagnostic d\'une intolérance alimentaire doit être confirmé par des tests appropriés et un suivi médical. L\'auto-diagnostic mène souvent à des restrictions inutiles et à des carences. Ensemble, nous identifierons vos intolérances réelles via un protocole d\'élimination-réintroduction encadré, et nous construirons un plan alimentaire qui respecte vos contraintes tout en couvrant tous vos besoins nutritionnels.'
      }
    ]
  }
];

module.exports = consultationGuides;
