// plannr-data.js — Donnees du planning Plannr
// L'agent modifie UNIQUEMENT ce fichier.
// Le HTML (plannr.html) le charge automatiquement.
// Format canonique v2.1 : cle `phases` (l'ancienne cle `riskGroups` reste
// acceptee en lecture). Nouveaux champs par tache :
//   - progress  : avancement 0-100 (optionnel ; defaut 0, ou 100 si statut Termine)
//   - dependsOn : liste d'IDs de taches prealables (cascade automatique)
// Et au niveau racine : `baseline` (snapshot fige via le bouton Baseline).
window.PLANNR_DATA = {
    "version": "2.1",
    "appState": {
        "title": "Plannr - Planning de Projet",
        "subtitle": "Projet Exemple — 2026",
        "language": "fr"
    },
    "phases": [
        {
            "id": 1,
            "name": "Phase 1 — Cadrage",
            "description": "Analyse des besoins, validation du perimetre et preparation des ressources",
            "color": "#5E81AC",
            "tasks": [
                { "id": "1.0", "title": "Lancement officiel du projet",
                  "startDate": "2026-04-01", "endDate": "2026-04-01",
                  "duration": 1, "statut": "Terminé", "assignedTo": "", "isMilestone": true },
                { "id": "1.1", "title": "Analyse des besoins",
                  "startDate": "2026-04-02", "endDate": "2026-04-21",
                  "duration": 13, "statut": "Terminé", "assignedTo": "Alice / Bob",
                  "dependsOn": ["1.0"] },
                { "id": "1.2", "title": "Validation du perimetre",
                  "startDate": "2026-04-22", "endDate": "2026-05-06",
                  "duration": 10, "statut": "Terminé", "assignedTo": "Alice",
                  "dependsOn": ["1.1"] },
                { "id": "1.3", "title": "Preparation des ressources",
                  "startDate": "2026-04-22", "endDate": "2026-05-17",
                  "duration": 15, "statut": "Terminé", "assignedTo": "Charlie",
                  "dependsOn": ["1.1"] }
            ]
        },
        {
            "id": 2,
            "name": "Phase 2 — Realisation",
            "description": "Developpement, integration et tests des composants principaux",
            "color": "#0050a0",
            "tasks": [
                { "id": "2.1", "title": "Developpement du module principal",
                  "startDate": "2026-05-18", "endDate": "2026-06-17",
                  "duration": 22, "statut": "En cours", "assignedTo": "Bob / Diana",
                  "progress": 80, "dependsOn": ["1.2", "1.3"] },
                { "id": "2.2", "title": "Integration et tests",
                  "startDate": "2026-06-01", "endDate": "2026-06-25",
                  "duration": 19, "statut": "En cours", "assignedTo": "Diana",
                  "progress": 30 },
                { "id": "2.3", "title": "Recette fonctionnelle",
                  "startDate": "2026-06-26", "endDate": "2026-07-11",
                  "duration": 11, "statut": "A faire", "assignedTo": "Alice / Charlie",
                  "dependsOn": ["2.2"] }
            ]
        },
        {
            "id": 3,
            "name": "Phase 3 — Deploiement",
            "description": "Mise en production, formation des utilisateurs et suivi post-deploiement",
            "color": "#ff9500",
            "tasks": [
                { "id": "3.1", "title": "Mise en production",
                  "startDate": "2026-07-13", "endDate": "2026-07-27",
                  "duration": 10, "statut": "A faire", "assignedTo": "Bob",
                  "dependsOn": ["2.3"] },
                { "id": "3.2", "title": "Formation des utilisateurs",
                  "startDate": "2026-07-28", "endDate": "2026-08-12",
                  "duration": 12, "statut": "A faire", "assignedTo": "Alice / Diana",
                  "dependsOn": ["3.1"] }
            ]
        },
        {
            "id": 4,
            "name": "Phase 4 — Bilan",
            "description": "Retour d'experience et decision de poursuite",
            "color": "#002060",
            "tasks": [
                { "id": "4.1", "title": "Retour d'experience",
                  "startDate": "2026-08-13", "endDate": "2026-08-24",
                  "duration": 8, "statut": "A faire", "assignedTo": "Alice",
                  "dependsOn": ["3.2"] },
                { "id": "4.2", "title": "Rapport final et recommandations",
                  "startDate": "2026-08-25", "endDate": "2026-09-04",
                  "duration": 9, "statut": "A faire", "assignedTo": "Alice / Bob",
                  "dependsOn": ["4.1"] },
                { "id": "4.3", "title": "Decision de poursuite",
                  "startDate": "2026-09-07", "endDate": "2026-09-07",
                  "duration": 0, "statut": "A faire", "assignedTo": "", "isMilestone": true,
                  "dependsOn": ["4.2"] }
            ]
        }
    ]
};
