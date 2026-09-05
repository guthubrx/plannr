# Session 002 — Fiabilité et lisibilité du planning

Statut : Complète | Branche : session-002-fiabilite-lisibilite | Date : 2026-09-05
Validation : demande utilisateur « fais tout », avec lisibilité maximale sans superposition.
Tests : 47/47 (100 %) — Chromium, 2026-09-05.

## Exigences
- FR01 : import/export complet (phases, référence, calendrier, métadonnées), import validé avant remplacement ; sauvegarde navigateur complète et restaurable.
- FR02 : annuler/rétablir toutes les mutations métier, sans divergence entre tableau, Gantt, exports et stockage ; préserver l'annulation native pendant une saisie.
- FR03 : déplacement et cascade conservent la durée ouvrée ; redimensionnement modifie intentionnellement la durée ; jalons ponctuels.
- FR04 : chemin critique avec délais de dépendance et marges en jours ouvrés ; calcul indépendant des filtres d'affichage.
- FR05 : recherche, phase, responsable, statut et retards synchronisés tableau/Gantt ; compteur visible ; réinitialisation ; exports complets par défaut.
- FR06 : panneau de tâche accessible au clavier regroupant titre, dates, responsable, progression, statut, dépendances, notes, lien, butoir, effort ; validation atomique et annulation.
- FR07 : effort total optionnel en jours-personnes, réparti entre responsables ; charge quotidienne et surcharge au-delà de 1 j/personne/jour ; absence d'effort explicitement distinguée d'une estimation.
- FR08 : état de sauvegarde distinguant navigateur, fichier écrit, téléchargement et modifications depuis dernier fichier ; date/heure et erreur visibles.
- FR09 : trois vues cascade/consolidée/compacte sans chevauchement de libellés, barres ou jalons ; jamais de fallback acceptant une collision ; texte long accessible intégralement ; défilement local sur petit écran.
- FR10 : modules de données, calculs, visualisation et interface séparés sans nouvelle dépendance runtime, HTML autonome conservé.
- FR11 : tests métier, régressions historiques adaptées aux nouvelles règles, contrôles de géométrie et captures desktop/tablette/mobile pour les trois vues ; export et ouverture file:// contrôlés.

## Contraintes
Format historique accepté. Aucune migration vers un framework. Aucun réseau requis à l'exécution. Échappement des données. Libellés nouveaux français/anglais. Les autres langues conservent le fallback existant.
