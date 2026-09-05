# 002 — Document unique et lignes visuelles réservées

Date : 2026-09-05. Statut : Accepté dans le périmètre demandé.

Le modèle historique maintient des copies indépendantes et des champs localStorage prioritaires, ce qui peut annuler silencieusement des imports ou restaurations. Le document canonique devient la source de vérité ; la liste de tâches est dérivée avec références partagées. L'historique porte le document complet et la persistance utilise un snapshot versionné.

Les placements Gantt acceptaient explicitement des superpositions après épuisement des emplacements. Chaque élément reçoit désormais un espace mesuré et une nouvelle ligne quand nécessaire. La hauteur et le défilement local absorbent la densité, plutôt que de réduire la taille du texte.

Conséquences : modèles et sauvegardes plus prévisibles ; Gantt dense éventuellement plus haut ; aucune nouvelle dépendance runtime ; HTML autonome conservé.
