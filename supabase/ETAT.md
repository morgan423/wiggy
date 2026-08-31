# État des migrations en base

Ce qui tourne réellement sur le projet Supabase. Le dossier `migrations/` dit ce qui
existe ; ce fichier dit ce qui est **appliqué**.

**Règle d'écriture.** Claude n'écrit jamais « appliquée » de lui-même : il n'a pas de
moyen fiable de le savoir. Il ajoute une ligne au statut « en attente » dès qu'il crée
une migration. C'est Morgan qui bascule la ligne après avoir collé le SQL dans
l'éditeur Supabase, et qui date.

**Règle d'usage.** Avant de générer un lot avec `npm run db:bundle`, lire ce fichier
et utiliser `--depuis <première migration non appliquée>` :

```bash
npm run db:bundle -- --depuis 0008
```

Rejouer un lot déjà appliqué échoue sur les types et les tables qui existent déjà.

| Fichier                        | Objet                                                                                                                                         | Statut                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `0001_core.sql`                | Schéma fondamental : pros, prestations, zone, horaires, congés, clientes, rendez-vous, abonnements.                                           | Appliquée (date non tracée) |
| `0002_rls.sql`                 | Cloisonnement : RLS sur toutes les tables, lecture anonyme restreinte au niveau des colonnes.                                                 | Appliquée (date non tracée) |
| `0003_waitlist.sql`            | A9 : liste d'attente par ville, verrouillée par conception.                                                                                   | Appliquée (date non tracée) |
| `0004_bootstrap_pro.sql`       | Amorçage d'un compte : réglages et abonnement d'essai créés avec la fiche pro.                                                                | Appliquée (date non tracée) |
| `0005_quotas.sql`              | Anti-spam : plafond par adresse sur la liste d'attente, table de quotas, `consommer_quota()`.                                                 | Appliquée (date non tracée) |
| `0006_geocodage_refus.sql`     | Moniteur des refus de géocodage, avec purge à 90 jours.                                                                                       | Appliquée (date non tracée) |
| `0007_hors_zone_et_photos.sql` | A5 et A6 (hors zone, séjour, jeton de suivi), A4 (seau des photos), pronom du pro, retrait des coordonnées du domicile de la lecture anonyme. | Appliquée le 2026-08-31     |
| `0008_communes.sql`            | D6 : référentiel des communes en base, créé **vide**. Alimenté par `npm run communes:import`, jamais par l'éditeur SQL.                       | En attente                  |

## Notes

- Les dates des migrations `0001` à `0006` ne sont pas tracées : personne ne les
  notait avant la création de ce fichier. Elles ne sont pas reconstituables depuis le
  dépôt, et n'ont pas été inventées.
- `MIGRATIONS-A-COLLER*.sql` est un fichier de transit généré, ignoré par Git. Il ne
  fait pas foi : ce tableau, si.
- `0008` crée une table vide. Après l'avoir collée, lancer `npm run communes:import` :
  la table reste inutilisable tant que l'import n'a pas tourné, et la composition de
  la zone d'intervention avec elle.
