# Plan — Session 002

1. Installer l'outillage de test local verrouillé, relever les régressions initiales.
2. Centraliser le document canonique, l'historique et la persistance ; retirer les lectures de champs legacy après initialisation.
3. Corriger le moteur ouvré, calculer les marges et le chemin critique avec lag ; modéliser l'effort.
4. Ajouter filtres synchronisés et panneau de tâche avec validation avant commit.
5. Remplacer le placement permissif par une allocation de lignes tenant compte des dimensions mesurées des labels et jalons. Conserver les interactions existantes sur les barres.
6. Alléger le HTML statique et les éléments Riskr inutilisés ; extraire les modules sans changer le format de livraison.
7. Tests ciblés puis suite complète, captures vérifiées pour les trois modes, petits écrans, textes longs, jalons simultanés, références et export.

## Choix
- Document hiérarchique unique ; tableau aplati dérivé avec références partagées.
- Snapshots complets dédupliqués après chaque transaction ; état initial sauvegardé.
- Effort total facultatif réparti également entre responsables ; capacité conventionnelle explicitée.
- Lisibilité : hauteur extensible, zones de texte réservées, contraste sombre, calendrier avec largeur minimale et défilement local.
- Validation via Playwright existant ; moteur testable sans interface.
