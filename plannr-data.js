// plannr-data.js — Donnees du planning Plannr
// L'agent modifie UNIQUEMENT ce fichier.
// Le HTML (plannr.html) le charge automatiquement.
// Format identique a l'export JSON de Plannr.
window.PLANNR_DATA = {
    "version": "2.0",
    "appState": {
        "title": "Plannr - Planning de Projet",
        "subtitle": "Projet Exemple — 2026",
        "language": "fr"
    },
    "riskGroups": [
        {
            "id": 1,
            "name": "Phase 1 — Cadrage",
            "description": "Analyse des besoins, validation du perimetre et preparation des ressources",
            "color": "#5E81AC",
            "tasks": [
                { "id": "1.0", "title": "Lancement officiel du projet",
                  "startDate": "2026-04-01", "endDate": "2026-04-01",
                  "duration": 1, "statut": "A faire", "assignedTo": "", "isMilestone": true },
                { "id": "1.1", "title": "Analyse des besoins",
                  "startDate": "2026-04-01", "endDate": "2026-04-20",
                  "duration": 20, "statut": "A faire", "assignedTo": "Alice / Bob" },
                { "id": "1.2", "title": "Validation du perimetre",
                  "startDate": "2026-04-21", "endDate": "2026-05-05",
                  "duration": 15, "statut": "A faire", "assignedTo": "Alice" },
                { "id": "1.3", "title": "Preparation des ressources",
                  "startDate": "2026-04-15", "endDate": "2026-05-10",
                  "duration": 26, "statut": "A faire", "assignedTo": "Charlie" }
            ]
        },
        {
            "id": 2,
            "name": "Phase 2 — Realisation",
            "description": "Developpement, integration et tests des composants principaux",
            "color": "#0050a0",
            "tasks": [
                { "id": "2.1", "title": "Developpement du module principal",
                  "startDate": "2026-05-11", "endDate": "2026-06-10",
                  "duration": 31, "statut": "A faire", "assignedTo": "Bob / Diana" },
                { "id": "2.2", "title": "Integration et tests",
                  "startDate": "2026-06-01", "endDate": "2026-06-25",
                  "duration": 25, "statut": "A faire", "assignedTo": "Diana" },
                { "id": "2.3", "title": "Recette fonctionnelle",
                  "startDate": "2026-06-15", "endDate": "2026-06-30",
                  "duration": 16, "statut": "A faire", "assignedTo": "Alice / Charlie" }
            ]
        },
        {
            "id": 3,
            "name": "Phase 3 — Deploiement",
            "description": "Mise en production, formation des utilisateurs et suivi post-deploiement",
            "color": "#ff9500",
            "tasks": [
                { "id": "3.1", "title": "Mise en production",
                  "startDate": "2026-07-01", "endDate": "2026-07-15",
                  "duration": 15, "statut": "A faire", "assignedTo": "Bob" },
                { "id": "3.2", "title": "Formation des utilisateurs",
                  "startDate": "2026-07-10", "endDate": "2026-07-25",
                  "duration": 16, "statut": "A faire", "assignedTo": "Alice / Diana" }
            ]
        },
        {
            "id": 4,
            "name": "Phase 4 — Bilan",
            "description": "Retour d'experience et decision de poursuite",
            "color": "#002060",
            "tasks": [
                { "id": "4.1", "title": "Retour d'experience",
                  "startDate": "2026-07-25", "endDate": "2026-08-05",
                  "duration": 12, "statut": "A faire", "assignedTo": "Alice" },
                { "id": "4.2", "title": "Rapport final et recommandations",
                  "startDate": "2026-08-05", "endDate": "2026-08-15",
                  "duration": 11, "statut": "A faire", "assignedTo": "Alice / Bob" },
                { "id": "4.3", "title": "Decision de poursuite",
                  "startDate": "2026-08-15", "endDate": "2026-08-15",
                  "duration": 1, "statut": "A faire", "assignedTo": "", "isMilestone": true }
            ]
        }
    ]
};
