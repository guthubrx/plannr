# Validation

- Survol fautif reproduit dans la source : fond fixe #f0f4f8 prioritaire, avec texte clair hérité du thème sombre. Même défaut latent dans l'animation de mise en évidence ; remplacement par des couleurs de thème.
- Palette extraite de la page de référence locale et captures comparées : charbon #15181c / #1b1f24 et accent #8bc8b9. Le Gantt lit désormais les mêmes variables CSS que l'interface ; le PDF conserve sa palette claire.
- Tests de contraste texte/fond >= 4,5 sur les éléments contrôlés : ligne survolée, focus, animation à trois instants, champs, actions, boutons activés et impression depuis le sombre.
- En-tête testé à 1440, 768 et 390 px, dans les deux thèmes : bouton 32 × 32, aucune collision entre commandes, alignement avec le titre sur ordinateur, aucune largeur débordante. Activation et restauration de l'épinglage, repli indépendant du Gantt.
- Captures examinées : lignes survolées, en-tête ordinateur/mobile, panneau de tâche et vue générale.
- Suite : 97 tests Chromium, dont 9 nouveaux cas pour cette correction. L'ancienne assertion de couleur bleu sombre est actualisée vers le charbon demandé.
- Données métier et sauvegarde de l'ancienne version conservées ; modification de présentation uniquement.
