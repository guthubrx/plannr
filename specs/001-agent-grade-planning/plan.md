# Plan technique — Plannr v2.2

## Décisions de recherche (research inline)

- **D1 Bandeau unique multi-sections** plutôt que N systèmes d'alerte : un
  seul conteneur `#plannr-banner` (anomalies rouges, butoirs rouges,
  incohérences orange, journal bleu), refermable. Minimalisme : un point
  d'entrée `renderValidationBanner()`.
- **D2 Zoom par fenêtre d'échelle** (x.min/x.max) et non par élargissement du
  canvas : zéro conflit avec `responsive`, le drag existant et les plugins.
  Pan = déplacement de l'ancre d'une demi-fenêtre.
- **D3 Lag en jours ouvrés** (cohérent avec le métier v2.1) via
  `addWorkingDays(date, n)` ; `parseDependsOnFull()` retourne `{id, lag}`,
  `parseDependsOn()` conserve sa signature (ids) pour flèches/descendance —
  rétro-compatible.
- **D4 Calendrier = donnée métier** : porté par `PLANNR_DATA.calendar`
  (l'agent décide par projet), la case « Samedi ouvré » est un override
  utilisateur persisté. `isWorkingDay()` reste l'unique source métier.
- **D5 Sécurité (XSS)** : les données viennent d'un agent — tout passage en
  innerHTML est échappé (`escapeHtml`). `link` accepté uniquement en
  http(s). Corrige aussi l'interpolation préexistante du titre/responsable
  dans les lignes du tableau.
- **D6 FS Access sans persistance du handle** : handle gardé en mémoire de
  session (IndexedDB jugé hors scope — Article XIX).
- **D7 Snapshot du journal** : `{id: {s,e,t}}` en appStorage par document ;
  diff calculé avant l'écrasement du snapshot.

## Architecture des changements

| Fichier | Changements |
|---|---|
| `src/features.js` | escapeHtml, calendrier (config+helpers), addWorkingDays, parseDependsOnFull + cascade lag, deadlines (helpers + plugin marqueur), anomalies + bandeau, incohérences, journal, charge par responsable, zoom (état+API), FS save, flash ligne tableau |
| `src/app.js` | hooks : sanitizeData→anomalies, init (calendrier, bandeau, journal, zoom), updateGantt (fenêtre x), tooltip (notes/butoir), renderPlanning (icônes 📝🔗⚑⚠ + échappement titre/responsable), mouseup (clic vs drag), buildCanonicalData (calendar) |
| `src/body.html` | conteneur bandeau, boutons zoom + Samedi ouvré, bouton 💾, section Charge |
| `src/styles.css` | bandeau, badges, flash, zoom bar, charge |
| `schemas/plannr-data.schema.json` | nouveau |
| `plannr-data.js` | démo : deadlines (1 ok + 1 dépassée), notes, link |
| `tests/plannr.spec.cjs` | +7 tests (FR-1,3,5,6,7,11,12) |

## Risques
- R1 : fenêtre de zoom vs drag (conversion pixel→date dépend de x.min) —
  couverte par le test de drag existant rejoué en fenêtre réduite ? Non :
  le drag utilise l'échelle courante, donc insensible. Vérifié par e2e zoom.
- R2 : double émission du bandeau au double-chargement (reload auto) —
  idempotent : le bandeau est reconstruit, pas concaténé.
