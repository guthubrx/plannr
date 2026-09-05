# 003 — Pilotage métier et suivi du réalisé

Date : 2026-09-05. Statut : adopté.

## Problème
La somme des durées gonflait artificiellement la durée d'un projet comportant des tâches parallèles. Le pourcentage et l'effort initial ne suffisaient pas à expliquer le travail restant, la disponibilité des personnes ou la validation d'une livraison.

## Décisions
- Conserver les dates historiques comme prévisions et la référence existante comme engagement figé. Ajouter des dates réelles facultatives, jamais déduites automatiquement. Les montrer sous les barres, sur une piste distincte de la référence.
- Calculer l'enveloppe début-fin en jours ouvrés et utiliser le réalisé lorsqu'il est renseigné. Pondérer l'avancement par effort si toutes les tâches de travail non annulées sont estimées et le total est positif ; sinon par durée, avec méthode visible.
- Séparer le reste à faire de l'avancement. Pour une tâche à faire et non commencée, utiliser l'estimation initiale en l'absence de reste saisi. Pour les autres tâches actives, afficher explicitement l'inconnu. Les jalons et tâches closes ne génèrent pas de charge future.
- Distinguer responsable de livraison et contributeurs. Conserver les affectations historiques et permettre une répartition explicite totalisant 100 %. À défaut, partager également.
- Stocker les capacités et absences dans le document canonique v2.4, avec validation et historique complets. Répartir la charge restante uniformément sur les jours futurs disponibles ; signaler les surcharges et le travail sans jour disponible, sans déplacer le planning automatiquement.
- Protéger les tâches commencées ou closes contre les cascades de dates. Signaler les conflits avec leurs dépendances plutôt que réécrire le réalisé.
- Proposer une simulation explicite depuis Détails, calculée sur copie. Son application vérifie que le document n'a pas changé depuis l'aperçu ; elle constitue une opération annulable. Les modifications ordinaires conservent leur comportement immédiat avec historique.
- Ajouter les statuts bloqué, à valider et annulé. Migrer l'ancien statut accepté vers à valider. Ne pas assimiler 100 % à une livraison validée.
- Regrouper les actions par problème et les réglages dans les paramètres afin de préserver une interface compacte.

## Conséquences
Le format est additif et les anciens documents restent lisibles. JSON et HTML transportent le document complet ; CSV/Excel incluent les champs métier et Excel ajoute les disponibilités. Le PDF comprend les informations métier et les ressources. Le calcul de charge n'est pas un moteur de nivellement automatique et ne modélise pas des horaires individuels.
