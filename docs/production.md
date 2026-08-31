# Créer et tenir le projet de production

Décision **D7** : deux projets Supabase. Le projet historique est le **développement**, il porte
les données de test et toute recette s'y joue. La **production** est un projet neuf, créé au
jalon J1, vierge dès le premier jour.

**La production ne sert jamais à une recette.** À la bêta, cinq pros y auront des fiches de
vraies clientes : noms, téléphones, adresses de domicile. Créer et supprimer de la donnée de
test à côté de la leur est risqué techniquement et intenable pour un sous-traitant RGPD.

Ce document se suit sans réfléchir, un jour de bêta. Compter une heure, sans précipitation.

---

## Avant de commencer

- Le dépôt est à jour et `npm run verify` passe.
- `supabase/ETAT.md` dit quelles migrations existent. La production les reçoit **toutes**,
  de `0001` à la dernière, dans l'ordre.
- Prévoir où seront posées les clés de déploiement (Vercel, projet de production).

---

## 1. Créer le projet Supabase

1. Nouveau projet, **région Union européenne** (Paris ou Francfort). Le choix est irréversible.
2. Nom explicite : `wiggy-production`. Le projet de développement gagne à être renommé
   `wiggy-developpement` le même jour, pour qu'aucun onglet ne prête à confusion.
3. Noter le mot de passe de la base dans le gestionnaire de mots de passe, pas ailleurs.

## 2. Appliquer les migrations, dans l'ordre

Générer le lot complet :

```bash
npm run db:bundle
```

Cela produit `MIGRATIONS-A-COLLER.sql`, qui contient `0001` à la dernière migration **dans
l'ordre**. Le coller dans l'éditeur SQL du projet de **production**, en une fois.

Vérifier ensuite, dans l'éditeur SQL de production :

```sql
select count(*) as tables from pg_tables where schemaname = 'public';
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
```

La seconde requête doit ne renvoyer **aucune ligne** : la RLS est active partout. Si elle en
renvoie une, s'arrêter là et corriger avant d'aller plus loin.

Puis cocher la colonne « Production » de `supabase/ETAT.md`, avec la date du jour.

## 3. Remplir le référentiel des communes

La migration `0008` crée la table **vide**. Sans cette étape, aucune pro ne peut renseigner sa
zone d'intervention, et le moteur géo n'a rien à manger.

1. Poser temporairement les clés du projet de production dans `apps/web/.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Vérifier d'abord sans écrire :

```bash
npm run communes:import -- --essai
```

3. Puis écrire :

```bash
npm run communes:import
```

Environ 35 000 communes, quelques minutes. Le script est idempotent : relancé, il met à jour et
n'empile rien.

4. **Remettre aussitôt les clés du développement** dans `.env.local`, et vérifier que
   `WIGGY_ENV` y vaut bien `developpement`. Laisser les clés de production sur un poste de
   développement, c'est offrir à la prochaine commande de purge une cible qu'elle ne devrait
   jamais avoir.

## 4. Poser les clés dans l'environnement de déploiement

Dans le projet de déploiement (Vercel), environnement **Production** :

| Variable                        | Valeur                                                       |
| ------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet de production                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anonyme du projet de production                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | clé service role du projet de production                     |
| `NEXT_PUBLIC_SITE_URL`          | l'adresse publique réelle                                    |
| `RATE_LIMIT_SALT`               | une chaîne aléatoire longue, **différente** du développement |
| `GOOGLE_ROUTES_API_KEY`         | clé Google Cloud, restreinte à ce déploiement                |
| `WIGGY_ENV`                     | `production`                                                 |

`WIGGY_ENV=production` n'est pas décoratif : c'est ce qui fait **refuser** les scripts
destructeurs. Un poste de développement qui pointerait par erreur sur la production s'arrêterait
net.

Ne jamais préfixer `SUPABASE_SERVICE_ROLE_KEY` de `NEXT_PUBLIC_` : cette clé contourne toute la
sécurité de la base.

## 5. Vérifier avant d'ouvrir

- Créer un compte pro sur la production, aller jusqu'à une page publiée.
- Réserver depuis un autre navigateur, en visiteuse : le tunnel complet, jusqu'à la
  confirmation.
- **Purger ce compte de test** avant d'ouvrir à qui que ce soit :

```bash
npm run purge:compte -- --pro <slug>
```

Le mode d'essai est le défaut : il affiche ce qui partirait. La suppression réelle demande
`--appliquer`, et refuse de tourner tant que `WIGGY_ENV` ne vaut pas `developpement`. **Sur la
production, ce refus est voulu** : la suppression du compte de vérification s'y fait à la main,
une fois, depuis l'éditeur SQL.

## 6. Vérifier que la production est vierge, avant d'ouvrir

Dernière étape. La suppression manuelle du compte de vérification **se vérifie, elle ne se coche
pas** : une case cochée par soi-même ne prouve rien.

```bash
npm run verifier:vide
```

La commande interroge le projet **avec la clé anonyme**, jamais avec la clé service role. C'est
la seule qui réponde à la vraie question, « que voit le monde » : la clé serveur contourne la
RLS, elle dirait ce que contient la base, pas ce qui en sort. Et elle évite de faire manipuler la
clé serveur de production sur un poste de développement, ce que D7 cherche précisément à
empêcher.

Elle affiche, et **échoue si l'un n'est pas à zéro** : comptes pros publiés, rendez-vous, fiches
clientes, inscriptions à la liste d'attente visibles. En cas d'échec, elle nomme ce qui subsiste
et ce que cela veut dire, plutôt que de dire « échec ».

Elle **ne supprime rien** : c'est une vérification, elle a donc le droit de tourner en
production, contrairement à la purge.

Pour l'exécuter sur la production, poser temporairement l'URL et la **clé anonyme** de production
dans `.env.local`, puis remettre celles du développement.

Attendu, avant d'ouvrir :

```
Rien de visible. Le projet est vierge aux yeux du monde.
```

---

## Entretien récurrent

### Le référentiel des communes, une fois par an, en janvier

Décision **D6**. Les communes fusionnent, se scindent et se renomment : quelques dizaines de
changements par an, publiés par l'INSEE au 1er janvier. Un référentiel figé laisse des communes
introuvables à la composition d'une zone, et des codes INSEE périmés dans les zones déjà
enregistrées, ce qui fait échouer silencieusement le filtrage géographique.

**Chaque janvier, sur les deux environnements :**

```bash
npm run communes:import -- --essai   # ce qui serait écrit
npm run communes:import              # écrit
```

La date du dernier import est en base, dans `communes_import.importe_le`, et le script l'affiche
au lancement. Si elle date de plus d'un an, il le dit.

### Les dépôts de photos orphelins

Une cliente qui téléverse puis abandonne le tunnel laisse des photos sans rendez-vous. Ce sont
des photos de personnes : elles ne restent pas.

```bash
npm run photos:purge                  # liste ce qui partirait
npm run photos:purge -- --appliquer   # supprime
```

À planifier, quotidiennement, une fois la production ouverte.

### Contrôler qu'aucune donnée de test n'a reparu

```bash
npm run verifier:vide
```

La même commande qu'à l'étape 6, utile à tout moment : entre deux mises en production, après une
intervention manuelle, ou au moindre doute. Elle ne modifie rien et se lance sans précaution.

Sur le développement, elle échouera normalement : le compte de test y est publié, c'est sa
vocation. C'est sur la **production** que sa réponse compte.

### Les refus de géocodage

La fonction `purger_geocodage_refus()` efface les traces de plus de 90 jours. À appeler depuis
une tâche planifiée Supabase. Au-delà, un refus n'apprend plus rien et ne doit plus être
conservé.
