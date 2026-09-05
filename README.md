<div align="center">
  <img src="icon.svg" alt="Plannr Logo" width="128" height="128">
  <h1>Plannr</h1>
  <p>Application web de gestion de planning et diagramme de Gantt interactif.</p>
</div>

## 📋 À propos

**Plannr** est une application web one-page complète pour la gestion de projet. Elle permet de visualiser et d'organiser vos phases et tâches à travers un diagramme de Gantt interactif, des vues compactes intelligentes et des tableaux de bord détaillés.

## ✨ Fonctionnalités


### Lisibilité des thèmes et commandes du Gantt
- Palette sombre charbon avec accent vert doux ; surfaces et textes coordonnés dans les survols, mises en évidence, champs et graphiques.
- En-tête du Gantt compact : titre à gauche, bouton punaise et commandes de vue/période à droite ; retour à la ligne sur petit écran.
- Bouton punaise de 32 px, activable au clavier, état annoncé et mémorisé ; le titre reste repliable indépendamment des commandes.

### Pilotage métier (v2.4)
- **Indicateurs utiles** : prochaine échéance, fin prévisionnelle, écart à la référence, blocages, durée et avancement. La durée couvre le début à la fin du projet en jours ouvrés, sans additionner les tâches parallèles.
- **Avancement pondéré** par effort lorsque toutes les tâches de travail sont estimées, sinon par durée ; la méthode est affichée. Les tâches annulées sont exclues.
- **Prévision, référence et réalisé distincts** : dates réelles saisies explicitement, piste dédiée sur le Gantt ; les cascades protègent les tâches commencées ou closes.
- **Six statuts** : À faire, En cours, Bloqué, À valider, Terminé, Annulé. Un avancement de 100 % ne vaut pas validation de livraison.
- **Reste à faire** en jours-personnes, indépendant du pourcentage d'avancement. Une valeur inconnue reste signalée.
- **Responsabilité et charge** : responsable de livraison unique, contributeurs et répartition optionnelle en pourcentages ; capacité journalière et absences dans les paramètres. La charge porte sur le travail futur restant.
- **Jalons de décision** : valideur, critères d'acceptation, décision et date de décision.
- **À traiter** : actions groupées ouvrant directement la tâche concernée (blocage, validation, échéance, donnée manquante, dépendance ou capacité).
- **Simulation de décalage** : depuis Détails, prévisualiser les dates des tâches affectées, les conflits et butoirs menacés avant d'appliquer ; annuler laisse le document intact.
- **Paramètres compacts** : calendrier, palette et disponibilités regroupés ; thèmes clair/sombre. Toutes les nouvelles données sont conservées par le document complet, son historique et ses exports.

### Fiabilité et lisibilité (v2.3)
- **Document complet** : import/export des tâches, calendrier, référence, métadonnées et effort. Les cycles sont refusés avant remplacement.
- **Sauvegarde navigateur complète** : restauration après rechargement, migration des anciennes clés du document, état de sauvegarde et heure visibles. Un téléchargement est distingué d'une écriture confirmée sur disque.
- **Annuler / rétablir** : historique du document complet ; la saisie conserve ses raccourcis natifs.
- **Durées ouvrées** : déplacer une tâche préserve ses jours de travail, y compris autour des fériés. Modifier sa fin constitue un redimensionnement.
- **Marges** : calcul du chemin critique incluant les délais entre tâches ; marge en jours ouvrés dans le panneau Détails. Les dates planifiées sont traitées comme des contraintes de début au plus tôt.
- **Recherche et filtres** : phase, responsable, statut, retards et texte ; synchronisés entre tableau et Gantt. Les exports et calculs restent fondés sur le document complet.
- **Panneau Détails** : édition groupée, validation des dates/dépendances, notes multilignes, butoir, lien et effort. Accessible au clavier.
- **Effort distinct de la durée** : `effortDays` désigne une estimation initiale en jours-personnes. Depuis v2.4, la charge utilise le reste à faire, réparti entre contributeurs et jours disponibles ; le seuil de surcharge correspond à la capacité de chacun. Les tâches terminées ou annulées sont exclues.
- **Trois vues lisibles** : espaces réservés aux libellés et jalons ; une ligne supplémentaire remplace toute collision. Titres répartis sur trois lignes au maximum, texte intégral dans le tableau et Détails. Le calendrier et le tableau défilent localement sur petit écran.
- **Exports** : HTML autonome contenant les données et l'icône ; PDF A3 paysage paginé sans écraser le Gantt ; Excel/CSV avec responsables, effort, notes et dépendances.
- **Identifiants stables** : ajouter, déplacer ou supprimer une tâche ne renumérote plus les autres tâches, afin de préserver leurs dépendances et leur référence. L'ordre d'affichage demeure modifiable.

### Chaîne agent → visualisation (v2.2)
- **Bandeau de validation** : anomalies corrigées au chargement (doublons,
  dates invalides, dépendances inconnues, liens non-http), et **journal des changements** depuis le
  chargement précédent
- **Schéma machine** : `schemas/plannr-data.schema.json` décrit le format
  complet — l'agent peut valider avant de livrer
- **Dates butoirs** (`deadline`) : marqueur ⚑ sur le Gantt, badge tableau,
  alerte quand une cascade fait dépasser une butoir
- **Notes & lien** par tâche (`notes`, `link` http(s)) : contexte de l'agent
  dans l'infobulle, icônes géométriques dans le tableau, note éditable au clic
- **Lag de dépendance** : `"1.2+3"` = démarre 3 jours ouvrés après le jour
  ouvré suivant la fin de 1.2
- **Sélecteur de dépendances** (v2.3) : popover à cases à cocher dans le
  tableau — anti-cycle préventif (les descendantes sont grisées), lag par
  ligne, Échap pour annuler
- **Pastille de connexion** (v2.3) : au survol d'une barre, un ⊕ apparaît à
  côté du bord droit (zone disjointe du resize) — tirer une flèche élastique
  jusqu'à une autre barre crée la dépendance (cibles invalides en rouge,
  cycles refusés), cascade immédiate
- **Charge par responsable** : section dédiée avec totaux futurs en jours-personnes et
  détection des dépassements de capacité
- **Fenêtre temporelle** : Tout / 3 mois / 1 mois / 2 sem + ◀ ▶ + Aujourd'hui
- **Calendrier paramétrable** (`calendar`) : samedi ouvré, fériés ajoutés ou
  retirés — affecte les durées et la cascade (métier)
- **Enregistrer** : écrit `plannr-data.js` directement sur disque
  (Chrome/Edge), fallback téléchargement ailleurs
- **Clic sur une barre** : ouverture du panneau Détails
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
- **Référence (baseline)** : bouton Référence pour figer le planning de référence — la dérive
  s'affiche en barres fantômes grises sous les barres actuelles
- **Ligne « Aujourd'hui »** sur le Gantt + **détection des retards** (badge
  rouge dans le tableau, contour rouge sur le Gantt, actions « À traiter »)
- **% d'avancement par tâche** : éditable dans le tableau, rempli dans les
  barres du Gantt, **progression globale pondérée par effort ou durée ouvrée**

### Gestion de Planning
- **Édition inline** de tous les champs (phases, tâches, dates, responsables)
- **Ajout/suppression** de tâches et de phases (groupes)
- **Drag & drop interactif** pour déplacer les tâches et les jalons directement sur le Gantt
- **Jalons (Milestones)** : Transformation facile de tâches en jalons et inversement
- **Identifiants stables** lors des modifications, ordre des tâches modifiable

### Visualisation
- **Diagramme de Gantt interactif** propulsé par Chart.js
- **Mode Compact** : Algorithme de compactage intelligent pour minimiser l'espace vertical tout en gardant les titres lisibles (placement alterné, tiges de liaison)
- **Mode Cascade** : Vue classique une ligne par tâche
- **Dashboard Dynamique** : Indicateurs opérationnels en temps réel (échéance, fin, écart à la référence, blocages, durée, avancement)

### Export et Partage
- **Export PDF Premium** : Génération de rapports incluant une capture haute résolution de votre diagramme de Gantt
- **Export Excel & CSV** : Exportation structurée de toutes les données du planning
- **Export/Import JSON** : Sauvegarde complète de vos données (format canonique v2.4, clé `phases` ; l'ancienne clé `riskGroups` reste lue)
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
canonique v2.4 ; les anciens documents restent lisibles). Le menu Exporter propose un
`plannr-data.js` rechargeable qui se repose tel quel à côté du HTML.

## 🧑‍💻 Développement

Le HTML est **généré** — ne pas l'éditer directement :

```bash
# Sources éditables
src/head.html      # <head> (meta, favicon)
src/styles.css     # CSS applicatif (+ @media print)
src/body.html      # markup
src/planning.js    # calendrier, dépendances, cascade et marges
src/document.js    # document canonique, historique et persistance
src/business.js    # règles métier, charge, simulation et piste du réalisé
src/business-ui.js # indicateurs, actions, paramètres et champs métier
src/workspace.js   # filtres, panneau de tâche et charge
src/gantt.js       # placement, rendu et interactions Gantt
src/exports.js     # HTML autonome, PDF, Excel et CSV
src/features.js    # référence, plugins et édition complémentaire
src/app.js         # tableau, traductions et initialisation
src/libs/          # bibliothèques vendorisées (pinnées)

python3 build.py   # assemble -> plannr.html (déterministe, vérifié en CI)

npm ci && npx playwright install chromium
npm test           # 97 tests : métier, historique, formats, interactions,
                   # absence de collisions à 1440/768/390 px dans les 3 vues
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