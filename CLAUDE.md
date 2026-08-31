# CLAUDE.md : règles permanentes du projet Wiggy

Ce fichier est lu automatiquement à chaque session. Il ne remplace pas la roadmap
(`../../Docs/roadmap-wiggy.md`, source de vérité des fonctionnalités) : il fixe la manière de
travailler.

**Cette roadmap est hors du dépôt et se lit en lecture seule.** Rien hors du dépôt ne se
modifie, à commencer par `../../Docs/`.

## Le projet en trois lignes

Wiggy est l'outil des coiffeuses et coiffeurs à domicile : agenda qui s'organise en tournées
logiques, page de réservation publique, copilote de journée. Le différenciateur est la tournée
(créneaux géo-filtrés, temps de trajet réels). Trois surfaces sur un backend unique : app mobile
pro (native ou hybride), webapp pro (gestion sur grand écran), web cliente (réservation sans
installation).

## Principes non négociables

1. **« L'app propose, le pro dispose »** : tout automatisme (créneaux, relances, suggestions) est
   surchargeable manuellement. **Aucun envoi automatique de SMS sans validation explicite du pro,
   jamais.**
2. **La sécurité se prouve, elle ne se suppose pas** : un pro n'accède qu'à ses données, vérifié
   côté serveur (RLS + contrôle applicatif), jamais uniquement côté client. Tests d'accès croisés,
   toute exception documentée par écrit. La matrice d'accès se génère depuis le schéma réel. Pas de
   log contenant des données personnelles. Hébergement UE.
3. **Feature-gating natif** : `packages/core/src/tiers.ts` est le seul point de vérité. Toute route,
   tout écran et toute notification appelle `can()` ou `assertCan()` côté serveur. Jamais de
   `if (tier === ...)` disséminé.
4. **Aucune donnée fictive présentée comme réelle.** Compteurs branchés sur le réel, pages de
   démonstration en `noindex` et identifiées comme telles.
5. **Pas de données de santé, jamais** : les exemples et placeholders des annotations clientes
   restent strictement métier (formule, dosage, temps de pose, préférences). Pas de HDS, RGPD
   standard.
6. **Les coordonnées précises du domicile d'une pro ne sont jamais exposées publiquement.**
7. **Registres de langue** : tutoiement côté pro, vouvoiement chaleureux côté cliente (S6).
   Vocabulaire : « créneaux », « tournée », « trajet ». Jamais « slot », « dashboard »,
   « itinéraire optimisé ».
8. **Pas de scope creep** : une fonctionnalité « évidente » mais absente de la roadmap se propose
   en commentaire, elle ne se construit pas.
9. **Toute ambiguïté dans une spécification donne lieu à une question avant de coder**, jamais à
   une interprétation silencieuse.

## Structure

```
apps/web       Next.js : site public, page de réservation cliente, API, webhooks Stripe
apps/pro       Expo / React Native : l'app du pro (D3 : natif obligatoire pour C1/C6/C8/G3/G6)
packages/core  Règles métier partagées, sans dépendance runtime (gating, types, domaine)
packages/api   Schémas de validation partagés par les trois surfaces
packages/copy  Copy deck : la source de vérité des textes
packages/tokens Design tokens : la source de vérité du visuel
supabase/      Migrations SQL. Une migration appliquée ne se réécrit jamais.
scripts/       Outillage (db-check, db-test, db-matrice, design-check, copy-manques)
```

Côté cliente finale, tout reste web : zéro installation pour réserver.

## Contenu et langue

- Chaque composant textuel existe dans les deux registres.
- Le **copy deck** (`packages/copy/ecrans/*.json`) est la source de vérité des textes. Le micro-copy
  du board design est du contenu ratifié, pas une suggestion de rendu. Les textes sans source vont
  sous `$aEcrire` et sont listés dans `MANQUES.md` pour relecture humaine.
- Les textes **contractuels** (abonnement, essai, dunning, résiliation, factures) sont fournis par
  Morgan, alignés mot pour mot sur les CGV. Ils ne s'improvisent jamais.
- Ligne éditoriale côté cliente : formulations impersonnelles ou centrées sur la pro plutôt que
  « nous ». Wiggy reste discret sur la page de la pro, la cliente reste la cliente de la pro.
- **Aucun tiret cadratin** dans les textes destinés aux humains (UI, SMS, e-mails, site, documents
  du dépôt). Le code lui-même n'est pas concerné. Contrôlé par `design:check`.
- **Le prénom est le héros** : confirmations, célébrations et fiches nomment la personne.
- **Langage de recrutement (décision D4)** : « Wiggy sur ton téléphone », jamais « une app à
  installer ». Le coût perçu d'une installation fait renoncer avant d'avoir essayé, et le produit
  est d'abord une adresse web que l'on épingle.
- **Accord en genre (S6, ratifié le 31/08)** : côté pro, l'accord vient du champ `pronoun` du
  paramétrage, et son effet porte sur **toute l'interface pro**, pas seulement la page publique.
  Côté cliente, on **supprime le nom commun plutôt que de le genrer** : « Nouvelle cliente »
  devient « Nouvelle fiche », « Son nom » devient « Prénom », une section se titre par le prénom.
  Un libellé structurel n'a pas besoin de genre. En communication, le doublet : « coiffeuses et
  coiffeurs à domicile ».

## Design

- Tokens (`packages/tokens`, source JSON, sorties CSS et TS) : thème unique, ratifié, verrouillé par
  test structurel. Aucune valeur en dur.
- Fraunces jamais sous 20 px ni dans l'agenda ; axe WONK sur les statements uniquement.
  Plus Jakarta Sans pour l'UI.
- Zone tactile 44 px minimum. Zéro animation ambiante. `prefers-reduced-motion` respecté sans
  exception. Deux célébrations seulement (confirmation cliente, journée bouclée), aux timings des
  tokens.
- Sur une page, plus de surface pleine couleur que de crème. Le board design est une référence de
  rendu, jamais un socle de code.
- Avatar à trois sources : photo, puis illustration, puis initiale sur pastille déterministe. Jamais
  de blanc sur miel ou abricot.

## Moteur géo

- **Routes API** (jamais Distance Matrix, passée en legacy), clé serveur uniquement, plafonds
  applicatifs en plus des quotas Google. Repli automatique sur l'estimation à vol d'oiseau calibrée,
  toujours côté sûr : mieux vaut arriver en avance. Cache court en mémoire, jamais persisté
  (CGU Google).
- **Géocodage** via l'API Adresse de l'État, validé par code postal puis ville ; en cas de doute,
  « adresse non trouvée » plutôt qu'un mauvais lieu. Chemin gracieux côté cliente (suggestions,
  jamais un mur), refus journalisés en base sans données personnelles.
- Les RDV manuels alimentent le moteur géo **exactement comme** les RDV en ligne.
- **Un rendez-vous sans lieu n'existe pas dans Wiggy** (R2-7 bis) : le lieu est ce qui fait la
  tournée, et la tournée est le produit. L'adresse est donc **obligatoire** à la création comme à
  la modification d'un rendez-vous manuel. C'est la condition de vérité de la ligne au-dessus :
  sans elle, un rendez-vous sans coordonnées traverse le calcul des créneaux sans aucune
  contrainte, et la tournée se calcule en silence sur une journée incomplète.
  **Obligatoire ne veut jamais dire impossible.** En rural, un hameau, un lieu-dit ou une
  construction récente peuvent n'être reconnus par aucun référentiel. L'adresse est alors
  conservée telle qu'elle a été écrite et rattachée au **point connu le plus proche**, le centre
  de sa commune ; un avertissement dit que la précision du trajet s'en ressent. **Rien ne
  bloque.** Exiger une adresse _validée_ rendrait impossible l'enregistrement d'un rendez-vous
  que la pro sait parfaitement situer, et retournerait la règle contre la cible du produit.
  Cette exigence n'est pas un automatisme au sens du principe n°1 : refuser d'enregistrer un
  rendez-vous qu'on ne sait pas situer, ce n'est pas agir à la place de la pro.
- Une adresse hors zone n'est jamais un refus : séjour sur place (A5) ou demande sous réserve de
  validation (A6).

## Conventions

- Migrations : `supabase/migrations/NNNN_nom.sql`, jamais éditées après application : on ajoute une
  migration.
- **Deux environnements Supabase (D7)**, et `supabase/ETAT.md` suit les deux, une colonne par
  projet. **Une migration s'applique toujours au développement d'abord, à la production ensuite,
  jamais l'inverse.** **La production ne sert jamais à une recette** : elle porte les fiches de
  vraies clientes, y créer et supprimer de la donnée de test est intenable pour un sous-traitant
  RGPD. La création du projet de production se suit pas à pas dans `docs/production.md`, qui
  porte aussi l'entretien récurrent, dont le **réimport annuel du référentiel des communes, en
  janvier** (D6).
- Montants **toujours en centimes** (`*_cents`, entiers). Aucun flottant sur de l'argent.
- Durées en minutes (`*_min`).
- Les libellés de prestation et le prix sont **figés sur le RDV** à la réservation : l'historique ne
  bouge pas si le pro renomme ou reprice ensuite.
- Écriture cliente (réservation, annulation) : jamais d'insertion directe depuis le navigateur.
  Toujours une route serveur qui revalide disponibilité, zone et tarif.

## Scripts qui écrivent : une vérification ne modifie jamais rien

Écrit après incident (R2-4) : une vérification censée s'assurer qu'un script « se chargeait »
l'a en réalité exécuté contre la base réelle, et trente-cinq mille lignes ont été écrites. Sans
gravité cette fois, les données étant publiques et l'opération idempotente. Le script suivant au
programme supprime des rendez-vous, des fiches clientes et des photos.

Pour **tout script qui écrit ou supprime** :

- **Rien ne s'exécute au simple chargement du fichier.** Le corps ne tourne que si le script est
  lancé explicitement. Importer un script ne doit jamais rien déclencher.
- **Un mode d'essai** qui affiche ce qui serait fait sans le faire. Il est le **mode par défaut**
  d'un script destructeur : supprimer demande un indicateur explicite (`--appliquer`).
- **Vérifier qu'un script se charge** se fait par le typage ou le mode d'essai, **jamais** en
  l'exécutant contre une base réelle.
- **Un script destructeur refuse de tourner** si l'environnement visé n'est pas le développement
  (D7 : le projet de production ne sert jamais à une recette).

Et la partie qui compte autant que la règle : **une erreur se signale.** Une erreur annoncée coûte
une ligne de journal, la même erreur tue quand elle est tue. On préfère toujours l'aveu au silence,
y compris quand personne n'aurait rien vu.

## Décisions verrouillées : ne pas « réparer »

**`city_waitlist`, `rate_limits` et `geocodage_refus` ont la RLS active et AUCUNE politique.** Ce
n'est pas un oubli. Ces tables sont **verrouillées par conception** : toute écriture passe par une
route serveur en `service_role`, qui porte la validation de format, le quota par appelant et le
piège anti-robot. Ouvrir un `INSERT` au rôle `anon` rendrait la table écrivable directement via
PostgREST avec la clé anonyme (qui est publique) en contournant les trois protections. Des tests
dans `scripts/db-test.mjs` échouent si une telle politique est ajoutée.

**Le seau de stockage `appointment-photos` est privé et sans politique** (A4) : ce sont des photos
de personnes. Le serveur vérifie l'appartenance du rendez-vous, puis délivre une URL signée courte.

La matrice complète est dans `docs/matrice-acces.md`, générée depuis le schéma réel.

## Qualité

```bash
npm run verify     # la chaîne complète, avant toute livraison
npm run check      # format, lint strict, types stricts, code mort
npm run db:check   # rejoue les migrations sur un Postgres jetable + garde-fou RLS
npm run db:test    # cloisonnement prouvé, pas supposé
npm run db:matrice # matrice d'accès, échoue sur une lecture anonyme non justifiée
npm run design:check
npm run copy:manques
npm test
```

`db:check` échoue si une table du schéma `public` n'a pas la RLS activée. `db:matrice` échoue si une
politique de lecture anonyme n'est pas justifiée par écrit. `copy:manques` échoue si un texte rédigé
hors board n'est pas déclaré. Ces garde-fous ne sont pas décoratifs : une table oubliée est une fuite
de données entre comptes, et une lecture anonyme non justifiée est une fuite vers le monde entier.

- Les décisions techniques structurantes (schéma, paiement, hors-ligne) sont exposées avant
  implémentation.

### Fin d'étape

- **Une entrée dans `docs/journal.md`.** Le résumé de fin d'étape ne vit plus dans le chat, il
  vit dans le dépôt. Journal en ajout seulement, entrée la plus récente en haut, au format
  ci-dessous.
- **Ne jamais déclarer une fonctionnalité « Fait ».** Écrire « recette à valider ». Seul Morgan
  passe une ligne en « Fait », après avoir cliqué. Le journal propose le libellé, il ne le
  décide pas.
- **Toute question ouverte s'écrit dans le journal**, en plus d'être posée dans le chat. Une
  question qui ne vit que dans le chat disparaît avec la session.
- **Section « En attente d'arbitrage »**, en tête de `docs/journal.md`, avant la première entrée.
  Une question s'y écrit **dès qu'elle se pose**, en trois lignes : la question, ce qu'elle bloque,
  la date. Elle n'attend pas la fin de l'étape, parce qu'une étape peut s'interrompre en son
  milieu. À la clôture, la question et sa réponse basculent dans l'entrée de l'étape et la section
  se vide.
- **Pousser sur le dépôt distant** une fois l'entrée écrite. Une étape qui n'est pas poussée
  n'existe que sur une machine.

Format d'une entrée, figé :

```markdown
## AAAA-MM-JJ Étape : <IDs roadmap>

Fait : <par ID, une ligne chacun, factuel>
Schéma : <migration NNNN, EN ATTENTE d'application par Morgan> ou <aucun>
Décisions : <numéros T ou H, le détail reste dans docs/decisions.md>
Écarts au brief : <ce qui a été fait différemment de la spec, et pourquoi>
Questions ouvertes : <ce qui n'a pas pu être tranché seul>
À recetter par Morgan : <parcours de test concrets, en clics>
Statut à reporter dans la roadmap : <ID : libellé exact à recopier>
```

`docs/decisions.md` reste le registre des arbitrages : le journal y renvoie par numéro, il ne
le duplique pas.

### État de la base

`supabase/ETAT.md` dit ce qui est réellement appliqué sur le projet Supabase. Y ajouter une
ligne « en attente » dès qu'une migration est créée ; **ne jamais y écrire « appliquée »
soi-même**, c'est Morgan qui coche après avoir collé le SQL. Avant `npm run db:bundle`, lire ce
fichier et passer `--depuis <première migration non appliquée>`.

## Secrets

Jamais dans le chat, jamais dans un fichier de notes : uniquement dans `.env.local`, ignoré par Git.
Les migrations SQL sont appliquées par Morgan dans l'éditeur Supabase, une nouvelle migration à la
fois, jamais rejouées.
