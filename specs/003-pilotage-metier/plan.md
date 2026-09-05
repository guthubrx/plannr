# Plan
1. Sauvegarde vérifiée avant modification, branche isolée session-003-pilotage-metier.
2. Module métier dédié : normalisation, indicateurs, ressources, contrôles, simulation pure sur copies.
3. Extension du document canonique et schéma ; migrations additives et validations atomiques.
4. Extension du panneau, liste d'actions et paramètres ; préserver l'espace des trois vues.
5. Protection du réalisé dans les modifications de dates et dépendances ; aperçu explicitement demandé depuis le panneau.
6. Exports complets, tests de calcul/migration/simulation/contraintes/charge et régressions des vues.
7. Vérification visuelle, build reproductible, commit et intégration locale.

Complexité : O(V+E) pour propagation hors arithmétique calendaire ; O(tâches × jours × contributeurs) pour charge. Simulation sans effets sur le stockage ni l'historique.
