# Validation — Session 003

Date : 2026-09-05.

## Résultats
- 88 tests Playwright Chromium réussis : 65 tests de régression et 23 cas métier nouveaux.
- Vérifications métier : enveloppe projet, pondération et repli, reste indépendant du pourcentage, migration des statuts, exclusion des annulations, dates réelles protégées, partage de charge, capacités, absences et charge impossible à planifier.
- Simulation : absence d'effet avant confirmation, abandon, application annulable, conflits et butoirs, refus si le formulaire contient des changements non enregistrés.
- Persistance : import atomique, nouveaux champs, ressources, rechargement et historique.
- Lisibilité : trois vues, titres longs, pistes référence/réalisé, thèmes clair et sombre ; tests géométriques des collisions et des limites des lignes. Captures contrôlées sur ordinateur et à 390 px ; pas de débordement global sur mobile.
- Exports réellement téléchargés avec un cas associant réalisation, blocage, répartition 75/25 et jalon de décision : PDF de quatre pages rendu et inspecté ; XLSX relu avec assertions sur les colonnes et la feuille Disponibilités ; CSV produit.
- JavaScript vérifié syntaxiquement ; HTML reconstruit depuis les sources et reproductibilité contrôlée.

## Sauvegarde préalable
39 fichiers suivis copiés avant modification, avec empreintes SHA-256 vérifiées et manifeste BACKUP.json. Commit de départ : 285a364. Dossier séparé :

Sauvegarde conservée localement hors du dépôt ; emplacement non publié.

Cette copie porte sur les fichiers disque. Elle ne constitue pas une sauvegarde des données éventuellement présentes uniquement dans le stockage du navigateur de l'utilisateur. Le fichier de données d'origine reste inchangé.

## Limites vérifiées
La validation automatisée porte sur Chromium. La simulation s'ouvre explicitement dans Détails ; elle ne précède pas chaque glisser-déposer. La charge se répartit uniformément sur les jours disponibles, avec capacité journalière constante et absences ; aucun nivellement automatique. Les dates réelles doivent être renseignées par l'utilisateur.
