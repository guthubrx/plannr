# Audit v14 (mode diff) — Plannr v2.2

**Date** : 2026-06-12 | **Périmètre** : diff non commité de la branche
`001-agent-grade-planning` (≈ +1 100 lignes : features v2.2) | **Mode** :
exécution manuelle des checklists v14 pertinentes, SCOPE_MODE=diff.

## Grade : A- (périmètre diff uniquement)

| Domaine | Verdict |
|---|---|
| Sécurité (M03) | A — XSS : les 4 nouveaux sites innerHTML échappent chaque donnée via `escapeHtml` (vérifié par grep sur le diff : zéro interpolation `${risk.*}`/`${task.*}` non échappée) ; `link` restreint à http(s) et purgé sinon (testé : `javascript:` inerte) ; échappement rétrofité sur titre/responsable préexistants |
| Complexité (M04) | A — boucles bornées et annotées (`addWorkingDays` garde 3700, charge `O(p·t²)` documentée bornée, journal O(n)) |
| Tests (M06) | A — 21/21 e2e verts dont 8 nouveaux couvrant FR-1/3/5/6/7/10/11/12 |
| Fiabilité (M06) | A- — journal en best-effort try/catch ; FS save gère AbortError et retombe en téléchargement ; pas de chemin d'erreur silencieux ajouté |
| Minimalisme (M12) | A — **MIN-001 corrigé** : `nextWorkingDayISO` devenu mort après le refactor lag, supprimé ; `buildDataJsContent` factorise export datajs + FS save ; zéro nouvelle dépendance |

## Findings

| ID | Sév. | Description | Statut |
|---|---|---|---|
| MIN-001 | MEDIUM | `nextWorkingDayISO` code mort post-refactor lag (1 occ. = sa définition) | **fixed** (suppression, suite verte) |
| OBS-001 | LOW | FR-9 : le chemin « picker disponible » n'est pas couvert par un test automatisé (headless expose l'API mais le dialogue est inautomatisable) — fallback couvert indirectement | open (accepté, documenté) |
| QUAL-001 | LOW | Libellés v2.2 (bandeau, fenêtre, charge) en français en dur — cohérent avec la barre existante, hors scope spec | open (hors scope déclaré) |

## Potentiel minimalisme : ~0 ligne suppressible restante à comportement constant
(checklists M12 §1-6 exécutées sur le diff ; MIN-001 traité)

## Vertus LLM & Responsabilité Future
- Charge cognitive : réduite pour l'usage cible (les erreurs d'agent deviennent
  visibles au lieu de silencieuses) ; +1 100 lignes justifiées par 12 FR testées.
- Abstractions : `parseDependsOnFull` (2 usages réels + rétro-compat),
  `buildDataJsContent` (2 usages) — au-dessus du seuil.
- Tout le code est exécuté et vérifié par la suite e2e ou le smoke test.
- Non vérifié : écriture FS réelle sur disque (OBS-001) ; rendu RTL arabe des
  nouveaux libellés (français en dur, QUAL-001).
