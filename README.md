<div align="center">
  <img src="icon.svg" alt="Plannr Logo" width="128" height="128">
  <h1>Plannr</h1>
  <p>Application web de gestion de planning et diagramme de Gantt interactif.</p>
</div>

## 📋 À propos

**Plannr** est une application web one-page complète pour la gestion de projet. Elle permet de visualiser et d'organiser vos phases et tâches à travers un diagramme de Gantt interactif, des vues compactes intelligentes et des tableaux de bord détaillés.

## ✨ Fonctionnalités

### Chaîne agent → visualisation (v2.2)
- **Bandeau de validation** : anomalies corrigées au chargement (doublons,
  dates invalides, dépendances inconnues, liens non-http), butoirs dépassées,
  incohérences statut/avancement, et **journal des changements** depuis le
  chargement précédent
- **Schéma machine** : `schemas/plannr-data.schema.json` décrit le format
  complet — l'agent peut valider avant de livrer
- **Dates butoirs** (`deadline`) : marqueur ⚑ sur le Gantt, badge tableau,
  alerte quand une cascade fait dépasser une butoir
- **Notes & lien** par tâche (`notes`, `link` http(s)) : contexte de l'agent
  dans l'infobulle, icônes 📝/🔗 dans le tableau, note éditable au clic
- **Lag de dépendance** : `"1.2+3"` = démarre 3 jours ouvrés après le jour
  ouvré suivant la fin de 1.2
- **Charge par responsable** : section dédiée avec totaux en jours ouvrés et
  détection des chevauchements de tâches non terminées
- **Fenêtre temporelle** : Tout / 3 mois / 1 mois / 2 sem + ◀ ▶ + Aujourd'hui
- **Calendrier paramétrable** (`calendar`) : samedi ouvré, fériés ajoutés ou
  retirés — affecte les durées et la cascade (métier)
- **Enregistrer 💾** : écrit `plannr-data.js` directement sur disque
  (Chrome/Edge), fallback téléchargement ailleurs
- **Clic sur une barre** : navigation vers la ligne du tableau (surbrillance)
- Tout HTML issu des données est échappé (données agent = non fiables)

### Planification (v2.1)
- **Dépendances entre tâches** (`dependsOn`) : édition dans le tableau, flèches
  sur le Gantt, **décalage automatique en cascade** des successeurs (un
  successeur démarre au plus tôt le jour ouvré suivant la fin de ses
  prédécesseurs), détection de cycles
- **Chemin critique** : plus long chemin du graphe de dépendances, surligné
  en pointillé rouge sur le Gantt
- **Jours ouvrés** : durées calculées hors week-ends et **fériés français**
  (fixes + Pâques/Ascension/Pentecôte calculés), jours non ouvrés grisés
  sur le Gantt
- **Baseline** : bouton 📌 pour figer le planning de référence — la dérive
  s'affiche en barres fantômes grises sous les barres actuelles
- **Ligne « Aujourd'hui »** sur le Gantt + **détection des retards** (badge
  rouge dans le tableau, contour rouge sur le Gantt, carte « En retard »
  au dashboard)
- **% d'avancement par tâche** : éditable dans le tableau, rempli dans les
  barres du Gantt, **progression globale pondérée par la durée ouvrée**

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
- **Dashboard Dynamique** : Statistiques en temps réel (Tâches totales, En cours, Terminées, En retard, Durée totale ouvrée, Progression pondérée)

### Export et Partage
- **Export PDF Premium** : Génération de rapports incluant une capture haute résolution de votre diagramme de Gantt
- **Export Excel & CSV** : Exportation structurée de toutes les données du planning
- **Export/Import JSON** : Sauvegarde complète de vos données (format canonique v2.1, clé `phases` ; l'ancienne clé `riskGroups` reste lue)
- **Export plannr-data.js** : fichier de données rechargeable à reposer à côté du HTML
- **Export ICS** : les jalons deviennent des événements calendrier (Outlook, Apple Calendar…)
- **Impression** : feuille `@media print` dédiée (A3 paysage, contrôles masqués)

### Système d'Historique
- **Undo/Redo** complet (Cmd+Z / Cmd+Y)
- Sauvegarde automatique locale (localStorage, **namespacée par document** —
  plusieurs copies de Plannr sur le même domaine ne se polluent pas)
- Fonctionne **entièrement hors-ligne** : les 4 bibliothèques sont vendorisées
  inline dans le HTML, aucune dépendance CDN

## 🚀 Utilisation

**L'artefact livré est un seul fichier HTML autonome.**

1. Télécharger `plannr.html` (+ optionnellement `plannr-data.js` pour vos données)
2. Ouvrir le fichier dans votre navigateur
3. C'est tout ! Aucune installation requise, aucun réseau nécessaire

Les données vivent dans `plannr-data.js` (`window.PLANNR_DATA`, format
canonique v2.1 documenté en tête de fichier). Le menu Exporter propose un
`plannr-data.js` rechargeable qui se repose tel quel à côté du HTML.

## 🧑‍💻 Développement

Le HTML est **généré** — ne pas l'éditer directement :

```bash
# Sources éditables
src/head.html      # <head> (meta, favicon)
src/styles.css     # CSS applicatif (+ @media print)
src/body.html      # markup
src/features.js    # module v2.1 (jours ouvrés, dépendances, baseline, plugins Gantt)
src/app.js         # application historique
src/libs/          # bibliothèques vendorisées (pinnées)

python3 build.py   # assemble -> plannr.html (déterministe, vérifié en CI)

npm install && npx playwright install chromium
npm test           # suite e2e (8 tests : libs, jours ouvrés, cascade,
                   # round-trip, rétro-compat, UI v2.1, progression)
```


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