# Contrôles avant publication — 5 septembre 2026

- TruffleHog 3.97.0 : aucune alerte de secret dans l'historique analysé. Vérification réseau des identifiants désactivée ; aucune donnée candidate transmise à un service de validation.
- Revue des fichiers et recherches ciblées dans les objets Git : seul élément privé relevé, un chemin local de sauvegarde dans un compte rendu. Retrait du document et des commits non publiés concernés, avec conservation d'une sauvegarde locale hors dépôt. L'historique distant existant n'est pas réécrit.
- Données de démonstration génériques ; nouveau document des captures explicitement fictif, sans adresse personnelle, accès technique ou lien interne. L'identité Git du propriétaire, déjà présente dans l'historique public, est conservée.
- Huit captures produites dans un navigateur isolé, accès HTTP(S) bloqués, données chargées uniquement depuis l'exemple du dépôt. Contrôle visuel effectué ; aucun bloc de métadonnées textuelles ou EXIF dans les PNG.
- README : fonctions regroupées par usage, limites de la simulation et du calcul de charge explicites, formats différenciés, liens locaux et images vérifiés, script de reproduction des captures fourni.
- Build reproductible ; 102 tests Chromium réussis avant publication. Aucun changement de logique applicative.

Ces contrôles ne constituent pas une garantie absolue d'absence de toute donnée sensible ; aucun secret ou contenu privé n'a été identifié dans le contenu final destiné à la publication. Les sauvegardes locales et branches de conservation ne sont pas poussées.
