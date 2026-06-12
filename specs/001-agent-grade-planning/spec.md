# Spécification — Plannr v2.2 « agent-grade planning »

**Statut** : In Progress | **Branche** : 001-agent-grade-planning | **Date** : 2026-06-12

## Contexte

L'usage principal de Plannr : un agent IA remplit `plannr-data.js` (workflow
`/pro.planning`), un humain lit la visualisation et ajuste à la main. Les 12
améliorations ci-dessous fiabilisent cette chaîne agent → visualisation et
complètent l'usage manuel. Aucune dépendance externe nouvelle (NFR-1).

## User stories et exigences

### US1 — Fiabiliser la chaîne agent (P1)
- **FR-1 Validation visible** : toute anomalie corrigée/ignorée au chargement
  (id dupliqué, date invalide, fin avant début, dépendance inconnue, cycle)
  est listée dans un bandeau visible et refermable au-dessus du dashboard.
  Critère : importer un JSON avec 1 doublon + 1 dépendance inconnue → bandeau
  affiché avec 2 entrées explicites.
- **FR-2 Schéma machine** : `schemas/plannr-data.schema.json` (draft-07)
  décrit le format canonique v2.2 complet, référencé dans l'en-tête de
  `plannr-data.js`. Critère : le fichier de démo valide contre le schéma.
- **FR-3 Dates butoirs** : champ optionnel `deadline` (ISO) par tâche/jalon.
  Marqueur ⚑ sur le Gantt à la date butoir ; badge rouge dans le tableau et
  entrée dans le bandeau si la fin (réelle ou cascadée) dépasse la butoir ;
  toast d'alerte quand une cascade fait dépasser une butoir. Critère : démo
  livrée avec 1 butoir respectée + 1 dépassée visible.
- **FR-4 Notes et lien** : champs optionnels `notes` (texte) et `link` (URL
  http/https) par tâche. Notes affichées dans l'infobulle Gantt ; icônes 📝
  (éditable au clic) et 🔗 (ouvre l'URL) dans le tableau. Tout contenu est
  échappé HTML (FR-sec). Critère : note visible dans l'infobulle, lien
  cliquable, `<script>` dans une note inerte.

### US2 — Lecture et analyse (P2)
- **FR-5 Fenêtre temporelle** : boutons Tout / 3 mois / 1 mois / 2 sem +
  ◀ ▶ (pan d'une demi-fenêtre) + « Aujourd'hui ». Préférence persistée.
  Critère : x.min/x.max suivent la fenêtre, pan déplace l'ancre.
- **FR-6 Charge par responsable** : section repliable sous le Gantt — par
  personne : tâches, total jours ouvrés, et conflits (paires de tâches non
  terminées qui se chevauchent en jours ouvrés). Critère : la démo affiche
  les charges et au moins la détection fonctionne sur un cas injecté.
- **FR-7 Lag de dépendance** : syntaxe `"1.2+3"` dans `dependsOn` = démarre
  au plus tôt 3 jours OUVRÉS après le jour ouvré suivant la fin de 1.2.
  Cascade, flèches et chemin critique en tiennent compte. Critère : poser
  un lag à la main décale le successeur du bon nombre de jours ouvrés.
- **FR-8 Incohérences** : badge ⚠ par tâche pour : statut Terminé avec
  `progress` < 100 renseigné ; statut non-Terminé avec `progress` = 100.
  Listées dans le bandeau. Critère : injection d'un cas → badge + entrée.

### US3 — Ergonomie (P3)
- **FR-9 Enregistrement direct** : bouton 💾 — File System Access API quand
  disponible (choix du fichier au 1er usage, réécriture ensuite), sinon
  fallback téléchargement `plannr-data.js`. Critère : fallback systématique
  hors Chrome/Edge, contenu identique à l'export datajs.
- **FR-10 Journal des changements** : au chargement, diff vs le snapshot du
  chargement précédent (par document) : tâches ajoutées/supprimées, dates ou
  titres modifiés — affiché dans le bandeau. Critère : modifier les données
  puis recharger → le bandeau résume le diff.
- **FR-11 Calendrier paramétrable** : `PLANNR_DATA.calendar = {
  saturdayWorked, extraHolidays[], skippedHolidays[] }` + case « Samedi
  ouvré » dans la barre (persistée, prime sur la donnée). Affecte le MÉTIER
  (durées, cascade, grisage). Critère : cocher Samedi ouvré augmente la
  durée ouvrée d'une tâche chevauchant un samedi.
- **FR-12 Clic barre → tableau** : un clic sans déplacement sur une barre
  fait défiler le tableau jusqu'à la ligne et la met en évidence ; aucun
  toast « déplacé » n'est émis pour un simple clic. Critère : clic → ligne
  flashée, dates inchangées.

## Exigences transverses
- **NFR-1** : zéro nouvelle dépendance runtime ; artefact single-file préservé.
- **NFR-2** : tout HTML issu des données (titres, notes, responsables) échappé.
- **NFR-3** : les préférences d'affichage n'altèrent jamais les calculs métier
  (sauf FR-11, qui est explicitement métier).
- **NFR-4** : rétro-compatibilité : un `plannr-data.js` v2.0/v2.1 charge sans
  bandeau d'anomalies.
- **NFR-5** : chaque FR couvert par la suite e2e ou justifié.

## Hors scope
Multi-scénarios, dépendances SS/FF, stockage des handles FS en IndexedDB,
i18n des nouveaux libellés (la barre existante est en français en dur).
