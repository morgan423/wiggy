# État des migrations, par environnement

Ce que le dossier `migrations/` contient dit ce qui **existe**. Ce tableau dit ce qui est
**appliqué**, et **où**.

Deux projets Supabase depuis la décision D7 :

- **Développement** : le projet historique. Il porte les données de test, c'est sa vocation.
  Toute recette s'y joue.
- **Production** : un projet **neuf**, créé au jalon J1, vierge dès le premier jour. Il portera
  les fiches de vraies clientes. **Il ne sert jamais à une recette.** Sa création suit
  `docs/production.md`, pas à pas.

**Une migration s'applique toujours au développement d'abord, à la production ensuite. Jamais
l'inverse.**

**Règle d'écriture.** Claude n'écrit jamais « appliquée » de lui-même : il n'a pas de moyen
fiable de le savoir. Il ajoute une ligne au statut « en attente » dès qu'il crée une migration.
C'est Morgan qui bascule la case après avoir collé le SQL, et qui date.

**Règle d'usage.** Avant de générer un lot avec `npm run db:bundle`, lire ce fichier et utiliser
`--depuis <première migration non appliquée sur l'environnement visé>` :

```bash
npm run db:bundle -- --depuis 0009
```

Rejouer un lot déjà appliqué échoue sur les types et les tables qui existent déjà.

| Fichier                                        | Objet                                                                                                                                         | Développement                        | Production        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------- |
| `0001_core.sql`                                | Schéma fondamental : pros, prestations, zone, horaires, congés, clientes, rendez-vous, abonnements.                                           | Appliquée (date non tracée)          | Projet inexistant |
| `0002_rls.sql`                                 | Cloisonnement : RLS sur toutes les tables, lecture anonyme restreinte au niveau des colonnes.                                                 | Appliquée (date non tracée)          | Projet inexistant |
| `0003_waitlist.sql`                            | A9 : liste d'attente par ville, verrouillée par conception.                                                                                   | Appliquée (date non tracée)          | Projet inexistant |
| `0004_bootstrap_pro.sql`                       | Amorçage d'un compte : réglages et abonnement d'essai créés avec la fiche pro.                                                                | Appliquée (date non tracée)          | Projet inexistant |
| `0005_quotas.sql`                              | Anti-spam : plafond par adresse sur la liste d'attente, table de quotas, `consommer_quota()`.                                                 | Appliquée (date non tracée)          | Projet inexistant |
| `0006_geocodage_refus.sql`                     | Moniteur des refus de géocodage, avec purge à 90 jours.                                                                                       | Appliquée (date non tracée)          | Projet inexistant |
| `0007_hors_zone_et_photos.sql`                 | A5 et A6 (hors zone, séjour, jeton de suivi), A4 (seau des photos), pronom du pro, retrait des coordonnées du domicile de la lecture anonyme. | Appliquée le 2026-08-31              | Projet inexistant |
| `0008_communes.sql`                            | D6 : référentiel des communes en base, créé **vide**. Alimenté par `npm run communes:import`.                                                 | Appliquée le 2026-08-31              | Projet inexistant |
| `0009_auth_et_forfait.sql`                     | D9 : téléphone vérifié du pro et de la cliente, table des codes verrouillée. A8 : `distance_fees` perd sa lecture publique.                   | Appliquée le 2026-09-03              | Projet inexistant |
| `0010_mode_exercice.sql`                       | D10 ① : colonne `mode` sur `pros`, itinerant par défaut ou fixe. Drapeau d'affichage, jamais un droit.                                        | Appliquée le 2026-09-03              | Projet inexistant |
| `0011_blocages_et_cloture.sql`                 | B4 : `blocked_slots.created_at`, pour mesurer la fréquence de blocage (D2). B6 : index d'apprentissage des durées réelles.                    | Appliquée le 2026-09-03              | Projet inexistant |
| `0012_usage_sms.sql`                           | B7 : compteur mensuel de SMS par pro, verrouillé par conception, avec `consommer_sms()`.                                                      | Appliquée le 2026-09-03              | Projet inexistant |
| `0013_realisations.sql`                        | A1 : table `pro_photos`, les réalisations de la page publique. Lecture anonyme limitée aux fiches publiées.                                   | Appliquée le 2026-09-03              | Projet inexistant |
| `0014_journee_lancee.sql`                      | D15 : table `journees`, le lancement de journée. Distingue « en cours » de « à clôturer ».                                                    | Appliquée le 2026-09-03              | Projet inexistant |
| `0015_point_de_depart.sql`                     | D16 : adresse de départ sur `pros`, jamais exposée publiquement. Donne un trajet au premier rendez-vous.                                      | Appliquée le 2026-09-03              | Projet inexistant |
| `0016_duree_declaree.sql`                      | D15 corrigée : `appointments.duration_declared`, pour distinguer une durée mesurée d'une durée écrite par la pro.                             | Appliquée le 2026-09-03              | Projet inexistant |
| `0017_groupes_et_photos.sql`                   | B13 : `services.category`, groupe optionnel. A4 : `services.photos_required`, par prestation.                                                 | Appliquée le 2026-09-03              | Projet inexistant |
| `0018_propositions.sql`                        | A11 : table `propositions`, le patron « sous réserve » généralisé aux trois cas (contre-proposition, forfait, report).                        | Appliquée le 2026-09-03              | Projet inexistant |
| `0019_notifications.sql`                       | B14 : journal des notifications et bascules push.                                                                                             | Appliquée le 2026-09-03              | Projet inexistant |
| `0020_journal_technique.sql`                   | B2 : `client_notes`, le journal technique daté. L'existant n'est pas migré, à dessein.                                                        | Appliquée le 2026-09-03              | Projet inexistant |
| `0021_acceptations.sql`                        | G7 : `legal_documents` et `acceptances`, l'horodatage serveur et l'immuabilité.                                                               | Appliquée (constat db:etat du 04/09) | Projet inexistant |
| `0022_matrice_notifications.sql`               | B14 : une paire de bascules badge/push par événement.                                                                                         | Appliquée (constat db:etat du 04/09) | Projet inexistant |
| `0023_push_web.sql`                            | C9 ③ : `push_subscriptions`, un abonnement par appareil.                                                                                      | Appliquée (constat db:etat du 04/09) | Projet inexistant |
| `0024_telemetrie.sql`                          | E3 : `evenements`, verrouillée par conception, purge à 12 mois, vue de synthèse hebdomadaire.                                                 | En attente                           | Projet inexistant |
| `0025_confidentialite_telemetrie.sql`          | E3 : la finalité « amélioration du service » entre dans la politique de confidentialité (version 0.2-beta).                                   | En attente                           | Projet inexistant |
| `0026_acceptations_effacables_par_cascade.sql` | G7 : une acceptation part AVEC le compte. Corrige le droit à l'effacement, que 0021 bloquait.                                                 | En attente                           | Projet inexistant |

## Notes

- Les dates des migrations `0001` à `0006` ne sont pas tracées : personne ne les notait avant la
  création de ce fichier. Elles ne sont pas reconstituables depuis le dépôt, et n'ont pas été
  inventées.
- La colonne production restera « Projet inexistant » jusqu'au jalon J1. Le jour où le projet
  est créé, elle se remplit d'un coup : la procédure rejoue `0001` à la dernière migration dans
  l'ordre. Voir `docs/production.md`.
- `0008` crée une table vide. Après l'avoir collée, lancer `npm run communes:import` : la table
  reste inutilisable tant que l'import n'a pas tourné, et la composition de la zone
  d'intervention avec elle.
- **Le référentiel des communes se réimporte une fois par an, en janvier** (décision D6). Le
  détail et la raison sont dans `docs/production.md`, section « Entretien récurrent ».
- **Ce tableau est DÉCLARATIF, `npm run db:etat` est le CONSTAT.** La commande interroge la base
  et dit quelles migrations sont réellement passées, en nommant le projet interrogé. **Quand les
  deux divergent, c'est le constat qui a raison** : on corrige le tableau, pas l'inverse. Écrite
  le 04/09, après une soirée passée à reconstituer l'état réel à la main.
- `MIGRATIONS-A-COLLER*.sql` est un fichier de transit généré, ignoré par Git. Il ne fait pas
  foi : ce tableau, si.
