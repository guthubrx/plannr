# Session 003 — Pilotage métier
Statut : terminée le 5 septembre 2026. Autorisation : « go garde une copie qqe part de backup de celle la ».

## Objectif
Distinguer engagement, prévision, réalisé et travail restant ; conserver le HTML hors ligne et l'interface compacte.

## Exigences
- Corriger la durée globale (enveloppe début-fin en jours ouvrés) ; avancement pondéré par effort si toutes les tâches actives sont estimées, sinon par durée avec méthode explicite.
- Reste à faire saisi indépendamment du pourcentage. Pour une tâche non commencée, effort initial utilisable ; pour une tâche commencée, inconnu explicite si non renseigné. Exclure terminé/annulé des charges futures.
- Six statuts : à faire, en cours, bloqué, à valider, terminé, annulé. Migrer Accepté vers À valider sans inventer de réalisation.
- Dates réelles facultatives et validées, jamais modifiées par cascade. Prévisions des tâches terminées/annulées protégées ; dates réelles utilisables pour lire les contraintes.
- Responsable unique de livraison distinct des contributeurs ; répartition explicite optionnelle et somme égale à 100 %.
- Jalons : valideur, critères d'acceptation et décision en attente/approuvée/refusée.
- Liste d'actions groupée et ouvrant le panneau : blocages, validations, échéances menacées, données manquantes et conflits de dépendances ; pas de répétition du même problème dans plusieurs bandeaux.
- Simulation de décalage depuis le panneau : aperçu de toutes les tâches affectées et butoirs menacés, appliquer ou abandonner sans mutation du document avant confirmation.
- Ressources : capacité journalière affectée au projet et absences individuelles ; calcul de surcharge future fondé sur le reste à faire.
- Indicateurs opérationnels : prochaine échéance, fin prévisionnelle, écart à la référence, blocages, durée et avancement. Compteurs détaillés accessibles dans la liste d'actions.
- Calendrier, palette et disponibilités regroupés dans les paramètres.
- Compatibilité import/export/historique/rechargement pour tous les nouveaux champs ; versions précédentes lisibles.

## Règles
Aucune date réelle déduite du calendrier. Aucun reste à faire déduit automatiquement d'un pourcentage. Annulation ne signifie pas achèvement. Une dépendance vers une tâche annulée demande une décision explicite. Les anciennes dates restent les dates prévisionnelles, la référence existante reste indépendante.
