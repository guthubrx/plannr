<div align="center">
  <img src="icon.svg" alt="Plannr Logo" width="128" height="128">
  <h1>Plannr</h1>
  <p>Application web de gestion de planning et diagramme de Gantt interactif.</p>
</div>

## 📋 À propos

**Plannr** est une application web one-page complète pour la gestion de projet. Elle permet de visualiser et d'organiser vos phases et tâches à travers un diagramme de Gantt interactif, des vues compactes intelligentes et des tableaux de bord détaillés.

## ✨ Fonctionnalités

### Gestion de Planning
- **Édition inline** de tous les champs (phases, tâches, dates, responsables)
- **Ajout/suppression** de tâches et de phases (groupes)
- **Drag & drop interactif** pour déplacer les tâches et les jalons directement sur le Gantt
- **Jalons (Milestones)** : Transformation facile de tâches en jalons et inversement
- **Renumérotation automatique** des tâches lors des modifications

### Visualisation
- **Diagramme de Gantt interactif** propulsé par Chart.js
- **Mode Compact** : Algorithme de compactage intelligent pour minimiser l'espace vertical tout en gardant les titres lisibles (placement alterné, tiges de liaison)
- **Mode Cascade** : Vue classique une ligne par tâche
- **Dashboard Dynamique** : Statistiques en temps réel (Tâches totales, En cours, Terminées, Durée totale, Progression %)

### Export et Partage
- **Export PDF Premium** : Génération de rapports incluant une capture haute résolution de votre diagramme de Gantt
- **Export Excel & CSV** : Exportation structurée de toutes les données du planning
- **Export/Import JSON** : Sauvegarde complète de vos données de projet

### Système d'Historique
- **Undo/Redo** complet (Cmd+Z / Cmd+Y)
- Sauvegarde automatique locale (localStorage)
- Fonctionne entièrement hors-ligne

## 🚀 Utilisation

**Plannr est une application "No-Build"** - un seul fichier HTML autonome.

1. Télécharger `plannr.html`
2. Ouvrir le fichier dans votre navigateur
3. C'est tout ! Aucune installation requise


## 🛠️ Stack Technique

### Frontend
- **HTML5 / CSS3** - Design moderne inspiré des codes visuels d'Apple
- **JavaScript (ES6+)** - Vanilla JS pur, aucune dépendance framework complexe

### Bibliothèques
- **Chart.js** - Moteur de rendu du diagramme de Gantt
- **jsPDF** - Génération des rapports PDF
- **SheetJS** - Exportation vers Excel (XLSX)

## 📄 License

Ce projet est sous licence **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou suggestion :
- Ouvrir une [issue](https://github.com/guthubrx/plannr/issues)
- Consulter la documentation dans le code source

---

© 2026 Plannr — Gestion de planning et diagramme de Gantt