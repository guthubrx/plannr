# Validation — Session 002

Date : 2026-09-05. Résultat : 47 tests réussis en 25 secondes.

## Fonctionnel
- Import complet (calendrier, référence, effort et métadonnées), rejet atomique des documents invalides et des cycles.
- Historique et rechargement, y compris migration des champs historiques et langue anglaise.
- Déplacements en jours ouvrés, cascade avec lag, marges et branches parallèles.
- Répartition de l'effort, surcharge quotidienne et estimation manquante explicite.
- Filtres communs tableau/Gantt, exports du document complet.
- Panneau, fermeture par Échap, notes multilignes, effort, annulation.
- Identifiants conservés lors des insertions/suppressions ; dépendances orphelines purgées.
- Téléchargement distinct de l'écriture fichier (API simulée à la frontière système).
- HTML exporté rechargé en file://, hors ligne, sans erreur JavaScript ni perte de données.
- Régressions : glisser-déposer, liaison de tâches, refus des cycles, infobulles, référence, calendrier, zoom et progression.

## Lisibilité
Les neuf combinaisons cascade/compact/consolidé × 1440/768/390 px sont vérifiées avec des titres longs et six jalons simultanés : aucun croisement de rectangles de texte, aucun recouvrement entre textes et barres, aucune collision de barres/jalons, aucun débordement horizontal de la page. Le calendrier et le tableau gardent leur défilement propre.

Captures inspectées : planning de démonstration en compact et consolidé, panneau de tâche, cas dense, petits écrans. Légendes Aujourd'hui et chemin critique séparées ; titres foncés sur fond clair ; retours à la ligne mesurés et texte intégral accessible dans Détails/tableau. Les anciennes positions décalées de jalons et les fallbacks acceptant une collision ont été supprimés.

Exports réels générés : PDF, XLSX, CSV et HTML. PDF de démonstration de trois pages inspecté après rendu : Gantt proportionnel et coupures entre lignes, tableau avec noms et notes. XLSX relu pour vérifier les responsables. Icône incorporée dans le HTML.

## Revue interne
- Source unique hiérarchique ; liste de tâches dérivée conservant les références partagées.
- Échappement des noms/descriptions de phases ; validation d'identifiants et cycles avant remplacement ; liens http(s).
- Compaction : O(n log n + n·l), l = nombre de lignes. Le nombre de lignes augmente au lieu d'accepter une collision. L'effort agrège les jours par personne ; aucune comparaison quadratique de toutes les paires de tâches.
- Minimalisme : retrait du code matriciel inutilisé, du toggle jalon en double, du HTML de démonstration précalculé et des renumérotations destructrices. JavaScript applicatif réduit d'environ 7 450 à 5 850 lignes malgré les ajouts ; aucune nouvelle dépendance runtime.
- Charge de maintenance réduite : modules distincts de document, calculs, interface, rendu et exports ; build autonome inchangé.

## Limites explicites
- Tests automatisés exécutés sur Chromium. Safari et Firefox n'ont pas été testés.
- Écriture File System Access testée avec un adaptateur simulé ; le téléchargement réel et le contenu des exports ont été vérifiés.
- Les titres du Gantt occupent au plus trois lignes, avec ellipse si nécessaire ; le texte complet reste dans le tableau et le panneau.
- Capacité conventionnelle d'un jour-personne par jour ouvré, effort uniformément réparti. Pas de calendrier individuel de ressources.
- La marge utilise les dates planifiées comme débuts au plus tôt, sans gestion des dépendances autres que fin-début.

## Complément — Clair/Sombre et densité
Le complément porte la suite à 61 tests. Les 18 combinaisons de deux thèmes × trois vues × trois largeurs contrôlent les collisions entre titres, barres, jalons et bandeaux de phase. Des tests supplémentaires contrôlent la préférence après rechargement, l'absence de mutation du document/historique et le retour au thème sombre après PDF.

Compact et consolidé : lignes de 70/86/102 px pour 1/2/3 lignes de texte, écart étiquette–barre de 6 px et réserve de 16 px sous la barre (dont 6 pour une baseline). Cascade : 48 px minimum, 64 px pour un titre de trois lignes. Les textes et contrôles vérifiés, y compris lignes alternées du tableau et zoom, atteignent un contraste de 4,5:1. Captures de démonstration inspectées dans les deux thèmes, ainsi que le tableau et le panneau sombres.

## Complément — Barre compacte et icônes
65 tests réussis en 25,1 s sur Chromium. En-tête de 55 px environ à 1440 et 1715 px : marque, commandes et état se trouvent sur la même ligne. Contrôles sans emoji, boutons à icône nommés et titrés, état de présentation accessible. Captures inspectées à 1715 et 390 px ; retour à la ligne sur mobile sans débordement. Le détail des horodatages de sauvegarde reste accessible au survol, au focus et aux lecteurs d’écran.
