# language: fr
Fonctionnalité: Planning fiable et lisible
  Scénario: Retrouver un document complet après import
    Étant donné un document avec calendrier, référence et effort
    Quand je l'importe puis l'exporte
    Alors toutes les données métier sont conservées
  Scénario: Annuler une modification
    Étant donné une tâche existante
    Quand je modifie son statut puis annule
    Alors tableau, Gantt, export et sauvegarde retrouvent le même état
  Scénario: Déplacer une tâche autour d'un jour férié
    Quand je déplace une tâche de cinq jours ouvrés
    Alors sa durée reste cinq jours ouvrés et ses successeurs respectent leurs délais
  Scénario: Lire un planning dense
    Étant donné des titres longs et des jalons simultanés
    Quand je consulte chaque vue à différentes largeurs
    Alors les étiquettes ne se superposent pas et le texte complet reste accessible
