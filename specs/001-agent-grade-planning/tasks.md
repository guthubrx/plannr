# Tâches — Plannr v2.2

## US1 (P1)
- [x] T01 `escapeHtml` + échappement titre/responsable existants (src/features.js, src/app.js)
- [x] T02 Collecte d'anomalies dans sanitizeData/loaders + bandeau `#plannr-banner` (FR-1)
- [x] T03 `schemas/plannr-data.schema.json` v2.2 + en-tête plannr-data.js (FR-2)
- [x] T04 Deadlines : helpers, marqueur Gantt (plugin), badge tableau, alerte cascade, bandeau (FR-3)
- [x] T05 Notes + link : infobulle, icônes tableau, édition au clic, validation http(s) (FR-4)
## US2 (P2)
- [x] T06 Zoom fenêtre : état persisté, boutons Tout/3m/1m/2sem + ◀ ▶ + Aujourd'hui, x.min/x.max (FR-5)
- [x] T07 Charge par responsable : section repliable, totaux j ouvrés, conflits de chevauchement (FR-6)
- [x] T08 Lag `id+N` : parseDependsOnFull, addWorkingDays, cascade + affichage cellule (FR-7)
- [x] T09 Incohérences statut/avancement : badges ⚠ + bandeau (FR-8)
## US3 (P3)
- [x] T10 💾 Enregistrer : File System Access + fallback download (FR-9)
- [x] T11 Journal des changements : snapshot/diff par document, section bandeau (FR-10)
- [x] T12 Calendrier : PLANNR_DATA.calendar + case Samedi ouvré (métier) (FR-11)
- [x] T13 Clic barre → flash ligne tableau, pas de toast sur simple clic (FR-12)
## Qualité
- [x] T14 Données de démo : deadlines/notes/link, point fixe cascade conservé
- [x] T15 7 tests e2e (FR-1,3,5,6,7,11,12) + suite complète verte
- [x] T16 Build + README + validation schéma de la démo
- [x] T17 Audit v14 (diff) sur le code nouveau + corrections
