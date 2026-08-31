# Journal d'étapes

Ajout seulement, entrée la plus récente en haut. Une entrée par étape livrée.
Le format est figé et décrit dans `CLAUDE.md`. Les arbitrages ne vivent pas ici :
ils restent dans `docs/decisions.md`, ce journal y renvoie par numéro.

Un rappel qui vaut pour toutes les entrées : la ligne « Statut à reporter dans la
roadmap » est une proposition. C'est Morgan qui passe une ligne en « Fait », après
avoir cliqué.

## En attente d'arbitrage

Section permanente, en tête et hors des entrées. Une question s'y écrit **dès qu'elle se
pose**, sans attendre la fin de l'étape : une étape peut s'interrompre en son milieu, et une
question qui ne vit que dans le chat disparaît avec la session. Trois lignes : la question, ce
qu'elle bloque, la date. À la clôture, la question et sa réponse basculent dans l'entrée de
l'étape et cette section se vide.

_Rien en attente._

---

## 2026-09-01 Étape : D8 le test de bout en bout, R2-7 bis l'adresse obligatoire

**Fait :**

- **D8** : `npm run e2e` ouvre un vrai navigateur et joue un parcours nominal, de la page
  publique à la confirmation. Branché dans `npm run verify` : un échec arrête la livraison.
  Il pilote le Chrome déjà installé via `playwright-core`, sans télécharger de navigateur.
- **D8, condition ① :** compte pro dédié et déterministe, slug `zzz-tunnel-e2e`, semé avant et
  **effacé après, même quand le parcours échoue** (le nettoyage est dans un `finally`). Il
  efface aussi avant de semer : une exécution interrompue laisse un compte derrière elle, et
  repartir d'un état sale ne prouverait rien.
- **D8, condition ② :** les repères de chaque écran sont rassemblés dans une seule constante,
  `ETAPES`. Quand un écran change de mot, c'est là et nulle part ailleurs qu'on le suit. Un test
  qui échoue pour rien est ignoré au bout de trois fois.
- **D8, preuve que le filet mord** : la panne R2-2 a été réintroduite volontairement, le test
  a échoué à l'écran exact où elle se produisait, avec l'URL et le repère manquant, et a quand
  même nettoyé derrière lui. Puis la panne a été retirée et le test repasse.
- **R2-7 bis** : `address_line1`, `postal_code` et `city` deviennent obligatoires à la création
  comme à la modification d'un rendez-vous manuel, avec des refus rédigés en français.
- **La réserve rurale**, qui conditionne tout le reste : une adresse que le référentiel ignore
  est conservée telle quelle et rattachée au **centre de sa commune**, que D6 nous donne
  désormais en base. Le trajet devient approché au lieu de disparaître. Trois issues nommées :
  `exacte`, `commune`, `inconnue`, chacune avec son bandeau. **Rien ne bloque jamais.**
- **L'adresse d'une cliente déjà connue est proposée d'emblée**, reprise de son rendez-vous le
  plus récent, et modifiable. Le cas courant ne coûte aucune saisie.
- **Reprise des anciens rendez-vous** créés sans adresse : un bandeau sur la fiche dit pourquoi
  le champ est maintenant exigé, plutôt que de laisser un champ rouge sans explication.
- **`npm run verifier:vide`** : vérification en lecture seule, avec la **clé anonyme**, de ce
  que voit le monde. Dernière étape de `docs/production.md` avant l'ouverture, et citée dans
  l'entretien récurrent.
- **`CLAUDE.md`** : la règle « un rendez-vous sans lieu n'existe pas dans Wiggy » est inscrite
  juste sous « les RDV manuels alimentent le moteur géo exactement comme les RDV en ligne »,
  dont elle est la condition de vérité.

**Schéma :** aucun.

**Décisions :** application de D6, D7 et D8. Aucune nouvelle.

**Écarts au brief :**

- **`npm run verify` exige désormais `WIGGY_ENV=developpement` dans `apps/web/.env.local`.**
  Sans cette ligne, le test de bout en bout refuse de tourner et `verify` échoue. C'est la garde
  R2-4 qui fait son travail, mais elle bloque la commande la plus courante du projet : à poser
  avant tout. Le fichier `.env.local` n'a pas été modifié, c'est celui de Morgan.
- **Le test ne dépose pas de photo.** Il traverse l'étape par « Continuer sans photo ». Le dépôt
  par URL signée a son propre chemin, et l'ajouter ferait de ce parcours une suite plutôt qu'un
  parcours nominal. D8 dit que le test ne grossit pas sans décision : c'est une décision à
  prendre, pas à glisser.
- **Le test réutilise le serveur de développement s'il tourne**, et en démarre un sinon. Next
  refuse un second serveur de développement : ce n'est pas un raccourci, c'est le seul chemin
  qui fonctionne dans les deux cas.
- **`verifier:vide` échoue normalement sur le développement**, où le compte de test est publié.
  C'est sur la production que sa réponse compte, et le document le dit.
- **Deux tests existants encodaient l'ancien contrat** (adresse facultative) et sont tombés à la
  première exécution. Ils ont été mis à jour, pas contournés.

**Questions ouvertes, et leurs réponses :**

- **R2-7 : deux rendez-vous bord à bord.** **Répondu** : c'est le cas ②, capture à l'appui. Un
  rendez-vous sans lieu géocodé désactivait silencieusement la logique de tournée autour de lui.
  Traité par R2-7 bis. La proposition initiale, marquer ces rendez-vous, a été écartée par
  Morgan : elle aurait créé un agenda à deux vitesses, à charge pour une utilisatrice non
  technique de comprendre la différence et de la gérer en permanence.
- **Reste ouvert** : R2-5 (photos non agrandissables, rattaché à la trousse de composants), la
  section 3 du premier document (page publique peu vendeuse, dont R2-3 l'appel à l'action), et
  l'activation de la Places API pour A5 ②.

**À recetter par Morgan :**

- **Avant tout** : poser `WIGGY_ENV=developpement` dans `apps/web/.env.local`, sinon
  `npm run verify` échoue.
- **D8** : `npm run e2e` doit dérouler sept écrans et finir par « Nettoyé ». Vérifier qu'aucun
  compte `zzz-tunnel-e2e` ne subsiste dans l'agenda ni sur la page publique.
- **R2-7 bis** : agenda, ajouter un rendez-vous sans adresse : refusé, en français. Avec une
  adresse réelle : enregistré, sans bandeau. Avec une adresse inventée mais un code postal
  valide : enregistré, avec le bandeau « trajet approché ». Choisir une cliente déjà venue :
  les trois champs d'adresse doivent se remplir seuls.
- **Ancien rendez-vous** : en ouvrir un créé avant aujourd'hui sans adresse, vérifier le bandeau
  de reprise et qu'on ne peut pas enregistrer sans compléter.
- **`npm run verifier:vide`** : sur le développement, il doit signaler le compte pro publié.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant. D8 est mise en œuvre,
D7 complétée par la vérification en lecture seule.

---

## 2026-09-01 Étape : R2-6, et le lot D7 (deux environnements, production, purge)

**Fait :**

- **R2-6** : les trois champs d'adresse de l'étape « Vous serez sur place » s'ouvrent vides. Les
  préremplir avec l'adresse qui venait d'être jugée hors zone invitait à valider sans relire, et
  aurait envoyé le pro à l'adresse même que la cliente déclarait ne pas être le bon lieu. La
  prestation reste conservée.
- **D7, `supabase/ETAT.md`** suit deux environnements, une colonne par projet. Le développement
  porte l'état du jour, la production reste « Projet inexistant » jusqu'au jalon J1.
- **D7, `docs/production.md`** : la création du projet de production, pas à pas, suivable un jour
  de bêta. Création du projet en région UE, rejeu de `0001` à la dernière migration en un lot,
  vérification que la RLS est active partout, import des communes, pose des clés de déploiement,
  vérification d'ouverture puis purge du compte de test. Le document porte aussi l'entretien
  récurrent.
- **D7, `CLAUDE.md`** : une migration s'applique toujours au développement d'abord, et la
  production ne sert jamais à une recette.
- **D7, `npm run purge:compte`** : purge des données de test d'un compte pro nommé. Supprime
  rendez-vous, photos (lignes et fichiers), fiches clientes et leurs adresses, et les
  inscriptions à la liste d'attente d'une adresse e-mail donnée. Conserve le paramétrage
  (prestations, zone, horaires, congés, réglages, abonnement) : on purge pour rejouer une
  recette, pas pour tout reconfigurer. Ne touche jamais la table des communes.
- **D6, le réimport annuel** est tracé à trois endroits : `docs/production.md` (section
  « Entretien récurrent », avec la raison), les notes de `supabase/ETAT.md`, et surtout
  **le script lui-même**, qui affiche l'âge du dernier import à chaque lancement et avertit
  au-delà d'un an. C'est le seul des trois qui tombe sous les yeux au bon moment.

**Schéma :** aucun.

**Décisions :** application de D6 et D7. Aucune nouvelle.

**Écarts au brief :**

- **La liste d'attente ne peut pas être bornée à un compte pro.** `city_waitlist` n'a pas de
  `pro_id` : c'est une table de plateforme, indexée par e-mail et par ville. La purge la borne
  donc à une **adresse e-mail**, passée par `--email`, et ne touche rien sans elle.
- **Le compte pro lui-même n'est pas supprimé**, ni son paramétrage. Le brief demandait les
  données de test ; effacer la zone et les prestations obligerait à tout reconfigurer avant
  chaque recette. Si la suppression complète est voulue, c'est un second mode à ajouter.
- **La purge refuse de tourner sur la production**, y compris pour la vérification d'ouverture
  décrite dans `docs/production.md`. C'est le comportement voulu par D7, et le document dit quoi
  faire à la place plutôt que de laisser la contradiction sans réponse.
- **R2-5 (photos non agrandissables) n'est pas traité** : le document le rattache explicitement
  à la trousse de composants.

**Questions ouvertes :**

- **R2-7** reste en attente, dans la section d'arbitrage en tête de ce journal. Non ouvert, sur
  consigne.
- **D8**, le test de bout en bout du tunnel, reste à faire.

**À recetter par Morgan :**

- **R2-6** : réserver depuis une adresse hors zone, prendre « Vous serez sur place », vérifier
  que les trois champs d'adresse sont **vides** et que la prestation choisie est conservée.
- **Purge** : `npm run purge:compte -- --pro morgan` doit afficher l'inventaire sans rien
  supprimer. Puis, après avoir posé `WIGGY_ENV=developpement` dans `.env.local`, relancer avec
  `--appliquer` : le script fait retaper le slug avant d'agir, et rend compte de ce qu'il a
  supprimé. Vérifier ensuite que prestations, zone et horaires sont intacts.
- **Rappel annuel** : `npm run communes:import -- --essai` doit annoncer l'âge du dernier import.

**Statut à reporter dans la roadmap :** aucun changement. `A4`, `A6`, `B10` et `B11` sont passés
en « Fait » par Morgan après la recette 2, onze passages sur onze.

---

## 2026-09-01 Étape : R2-1 abréviations de communes, R2-4 gardes des scripts

**Fait :**

- **R2-1** : « st paul » ne trouvait pas « Saint-Paul ». La clé de recherche ne normalisait
  qu'accents, tirets et casse : « saint » et « st » sont une abréviation, pas une variante
  typographique. L'expansion se fait maintenant **avant** le retrait des séparateurs, sans quoi
  il n'y aurait plus de frontière de mot pour la déclencher.
- **Une seule fonction**, `cleRechercheCommune` dans `packages/core/src/city.ts`, partagée par
  l'import (qui remplit `communes.search_key`) et par la requête. Le script d'import portait
  jusqu'ici sa propre copie : c'est le genre de divergence qui laisse des trous que personne ne
  voit. Une règle de `design:check` interdit désormais une seconde implémentation, et cette
  règle a été vérifiée à l'envers, en la faisant échouer exprès.
- **Des tests sur les cas réels** : « st paul », « ste marie », « st-jean-de-luz », l'abréviation
  au milieu du nom, et les deux pièges, **Strasbourg et Stains**, qui restent intacts.
- **R2-4** : règle inscrite dans `CLAUDE.md`, et appliquée aux deux scripts qui existent déjà.
  `scripts/garde.mjs` porte les trois gardes : rien ne s'exécute au chargement, mode d'essai,
  refus hors développement. `photos:purge` est destructeur, il les a toutes les trois, et son
  mode d'essai est le défaut. `communes:import` n'est pas destructeur : il garde l'écriture par
  défaut et reçoit un `--essai`, pour ne pas contredire la conséquence ③ de D7 qui prescrit
  `npm run communes:import` tel quel à la création de la production.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Application de D7 (garde d'environnement) et de la règle R2-4.

**Écarts au brief :**

- **Le mode d'essai n'est pas le défaut de `communes:import`.** La règle R2-4 dit « écrire ou
  supprimer demande un indicateur explicite », mais elle réserve le mode d'essai par défaut aux
  scripts destructeurs. Faire de l'import un essai par défaut casserait la procédure écrite dans
  D7 ③. L'arbitrage est signalé plutôt que pris en silence.
- **La garde d'environnement demande une variable qui n'existe pas encore** dans le `.env.local`
  de Morgan : `WIGGY_ENV=developpement`. Tant qu'elle n'y est pas, `photos:purge --appliquer`
  refuse de tourner. C'est le comportement voulu, mais il faut le savoir avant d'en avoir besoin.
- **L'abréviation « st. » avec un point n'est pas traitée.** La correction attendue nommait
  l'espace, le tiret et l'apostrophe : le point n'y figure pas, et la forme « St. Paul » est
  anglophone plutôt que française. Non ajouté, signalé.

**Questions ouvertes :** aucune. D8 reste à faire, dans la livraison suivante.

**À recetter par Morgan :** paramétrage, zone, chercher « st paul », « ste marie »,
« st-jean-de-luz ». Puis les deux pièges : « Strasbourg » et « Stains » doivent toujours se
trouver. L'affichage au fil de la frappe n'est pas dans ce lot, il vient avec la trousse de
composants.

**Incident, pour mémoire :** la veille, une vérification censée s'assurer que le script d'import
se chargeait l'a exécuté contre la base réelle, écrivant 34 969 communes. Sans gravité, données
publiques et opération idempotente, mais c'est l'origine de la règle R2-4 ci-dessus. Signalé
spontanément le jour même.

**Statut à reporter dans la roadmap :** aucun changement. `B11` reste en cours de recette.

---

## 2026-08-31 Étape : R2-2, le tunnel casse au choix du créneau

Livrée seule et en urgence, pour que la recette 2 reprenne au passage 5. R2-1 et D8 suivent
pendant la recette : ils ne touchent pas les écrans en cours de test.

**Fait :**

- **R2-2** : `FormPhotos` recevait une fonction (`lienSuivant`) depuis un composant serveur.
  React refuse de faire traverser une fonction à cette frontière : la page cassait au rendu, au
  choix du créneau, avant même l'écran des photos. Le composant reçoit désormais le chemin et
  les paramètres courants, en chaînes, et compose l'adresse lui-même.
- **Vérification des autres frontières** : une seule autre propriété de type fonction traverse
  serveur vers client dans le dépôt, `action` de `FormRdv`. C'est une action serveur déclarée,
  donc licite. Aucune autre.

**Schéma :** aucun.

**Décisions :** aucune. D8 est ratifiée mais n'est pas dans cette livraison.

**Écarts au brief :** aucun.

**Questions ouvertes :** aucune sur ce défaut.

**À recetter par Morgan :** reprendre au passage 5, choisir un créneau. Les cinq écrans du
tunnel ont été ouverts un par un sur le serveur de développement avant livraison, sur l'URL
même du journal de la recette 1 : prestation, adresse, créneaux, photos, coordonnées répondent
tous en 200 sans erreur React.

**Statut à reporter dans la roadmap :** aucun changement. `A4` et `A3` restent en cours de
recette.

---

## 2026-08-31 Étape : correction des cinq bloquants de recette (B1 à B5), D5, D6, S6

**Fait :**

- **B1 photos** : les photos ne transitent plus par l'action serveur. Le navigateur contrôle
  nombre, poids et format, obtient une URL de téléversement signée par fichier, et envoie les
  octets directement au stockage. La réservation ne reçoit qu'un jeton de dépôt et rattache les
  fichiers au rendez-vous une fois celui-ci créé. L'étape a désormais son propre écran, avec son
  bouton de téléversement, franchissable sans rien envoyer.
- **B2 communes** : le référentiel descend en base (migration 0008 + `npm run communes:import`).
  La recherche devient locale, donc instantanée, et ne dépend plus d'un service tiers.
- **B3 acompte** : `0` vaut « pas d'acompte », comme un champ vide. Et un filet global de
  messages français couvre toute la validation, y compris les règles à venir.
- **B4 pronom** : l'action relit la ligne qu'elle a écrite au lieu de supposer, et le formulaire
  affiche ce que la base a renvoyé plutôt que le rendu précédent. Effet étendu à toute
  l'interface (S6).
- **B5 saisie effacée** : toute sortie en erreur du tunnel passe par une fabrique qui renvoie la
  saisie et nomme le champ fautif ; le curseur s'y pose, le champ se signale.
- **D5** : tampon de sécurité de dix minutes plus dix pour cent au-delà de trente, posé sur les
  deux sources de trajet.
- **S6** : « Nouvelle cliente » devient « Nouvelle fiche », « Son nom » devient « Prénom »,
  « Sans cliente » devient « Sans fiche », « tes clientes » devient « ta clientèle », et le
  doublet remplace le masculin générique sur le site.
- **Hors document** : `.gitignore` (`node_modules` dépointé), `CLAUDE.md` (chemin de la roadmap,
  dossier `Code/` retiré, push en fin d'étape, langage de recrutement D4, section d'arbitrage,
  règle S6), commentaire `@aVenir` de `requireCapability()` corrigé.
- **Outillage** : le générateur de types sait lire les colonnes tableau ; `npm run photos:purge`
  efface les dépôts orphelins.

**Schéma :** migration `0008_communes.sql`, **EN ATTENTE d'application par Morgan**, à suivre de
`npm run communes:import`. Voir `supabase/ETAT.md`.

**Décisions :** D5, D6, T19 à T22. Détail dans `docs/decisions.md`.

**Écarts au brief :**

- **La cause de B1 n'était pas celle qui était supposée.** Il existe deux limites de corps de
  requête dans Next : `proxyClientMaxBodySize` (10 Mo, active dès qu'un `proxy.ts` existe)
  tronque avant `serverActions.bodySizeLimit`. Le document a été corrigé en conséquence.
- **La cause racine de B2 n'a pas été établie**, et n'a pas été inventée. Les deux pistes du
  document sont éliminées avec preuve : le service répond en 150 ms à l'URL exacte que construit
  le code, et le chemin complet rejoué hors de Next renvoie les douze communes. Le journal du
  serveur porte un `TimeoutError` unique, non reproductible. D6 rend la question sans objet.
- **L'hypothèse de B4 est éliminée, preuve à l'appui** : `authenticated` a bien `UPDATE` sur
  `pronoun`, l'écriture passe et se relit dans le harnais. La cause retenue est que l'action
  annonçait un succès sans jamais vérifier son effet, et que le formulaire se réaffichait
  depuis le rendu précédent. La correction ferme les deux, et rendrait visible toute autre
  cause qui subsisterait.
- **La marge D5 s'ajoute aux cinq minutes déjà comprises dans l'estimation** à vol d'oiseau
  (se garer, trouver la porte). Les deux se cumulent : c'est conforme à « toujours du côté sûr »,
  mais un trajet estimé porte donc quinze minutes de battement, pas dix.
- **Le statut de A1 n'a pas été touché.** Il porte « Fait, recette validée » depuis le 30/08,
  alors que la section 3 du document liste des corrections ouvertes sur cette page. Le tableau
  de synthèse du document ne mentionne pas A1 : la ligne est laissée telle quelle, et signalée.

**Questions ouvertes, et leurs réponses :**

- **Quel repli quand le service des communes ne répond pas ?** Bloquait B2, et derrière lui la
  zone dont dépendent A3, A5, A6 et A8. **Répondu (D6)** : on supprime la dépendance plutôt que
  de rattraper la panne.
- **D5 et S6 sont-ils tranchés ?** Le document les donnait ratifiés, le message de pilotage les
  donnait en attente. **Répondu** : le document fait foi, le message était périmé.
- **Reste ouvert** : l'activation de la Places API pour A5 ②, et l'écran d'abonnement (G1) vers
  lequel `requireCapability()` redirige sans qu'il existe.

**À recetter par Morgan**, une fois `0008` collée et `npm run communes:import` lancé :

- **B2** : paramétrage, zone, chercher « Pau », puis « st paul » sans accent ni tiret. Les
  résultats doivent s'afficher, les homonymes classés par taille. Ajouter, retirer.
- **B3** : une prestation avec un acompte à `0`, puis vide, puis `30`, puis `140`. Les trois
  premiers passent, le dernier affiche une phrase française.
- **B4** : profil, choisir « Elle », enregistrer, **recharger la page**. Le choix doit tenir.
  Recommencer avec « Il », puis avec « Je préfère ne pas préciser ».
- **B5** : réservation, dernière étape, saisir un téléphone incomplet. Le message s'affiche, les
  champs déjà remplis restent, le curseur est dans le champ du téléphone.
- **B1** : réservation, étape photos. Six photos, puis un PDF : un message français, aucune page
  d'erreur. Cinq photos valides : elles partent, et se retrouvent sur la fiche du rendez-vous
  côté pro. Passer l'étape sans photo doit marcher aussi.
- **D5** : reprendre le rendez-vous à 1 h 15 de route et vérifier que le créneau proposé laisse
  du battement.
- **S6** : agenda, ajouter un rendez-vous, vérifier « Nouvelle fiche » et « Prénom ».

**Statut à reporter dans la roadmap :** déjà reporté d'après le tableau de la section 8 du
document. `A3` et `C0` passent en « Fait » sur décision de Morgan ; `A4`, `A6`, `B10` et `B11`
restent « En cours », avec la mention « recette à rejouer » pour celles dont le bloquant est
corrigé.

---

## 2026-08-31 Étape : outillage de pilotage (aucun ID roadmap)

**Fait :**

- `docs/journal.md` : ce fichier. Journal d'étapes en ajout seulement, format figé.
- `supabase/ETAT.md` : une ligne par migration, avec son statut d'application réelle.
- `CLAUDE.md` : chemin de la roadmap corrigé (`../../Docs/roadmap-wiggy.md`, le
  dossier `Wiggy Prompt` ayant été renommé `Docs`), plus trois règles de fin d'étape.
- `.gitignore` : les motifs `/.next/`, `/out/`, `/build` et `/coverage` étaient
  ancrés à la racine alors que l'app Next vit dans `apps/web`. Passés en motifs non
  ancrés. `apps/web/.next` était **suivi** avant ce correctif.
- Premier commit du dépôt.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Ce chantier ne tranche rien, il trace.

**Écarts au brief :** aucun sur le périmètre demandé. Deux observations, non
corrigées comme convenu :

- `/node_modules` reste ancré à la racine dans `.gitignore`. Aujourd'hui sans
  conséquence : les deux seuls `node_modules` du dépôt (racine et `apps/pro`) sont
  couverts, le second par le `.gitignore` propre à Expo. Un futur
  `packages/<x>/node_modules` ne le serait pas.
- `git check-ignore` sur un chemin **inexistant** répond « suivi » pour un motif de
  répertoire (`out/`). Vérification faite en créant les répertoires : `apps/web/out`,
  `apps/web/coverage` et `apps/pro/build` sont bien exclus.
- Le commentaire `@aVenir` de `requireCapability()` dans `apps/web/src/lib/auth.ts` dit
  encore qu'« aucun écran gaté n'existe encore ». C'est faux depuis C0. `knip` le
  signale en indice. Non corrigé : aucune correction de code dans cette étape.
- Aucune identité Git n'était configurée, ni globale ni locale : le commit aurait
  échoué. Il a été signé `Morgan <morgan@agencereflex.fr>` via `git -c`. À poser
  durablement avec `git config --local user.name` et `user.email`.

**Questions ouvertes :**

- Pas de remote Git. Arbitrage séparé, annoncé comme tel par Morgan.
- Les migrations `0001` à `0006` n'ont pas de date d'application tracée : personne ne
  la notait avant ce chantier. `supabase/ETAT.md` les porte sans date plutôt que d'en
  inventer une.

**À recetter par Morgan :**

- Lire `supabase/ETAT.md` et corriger les dates d'application si tu les as ailleurs.
- Vérifier la liste des fichiers du commit : aucun secret, aucun artefact de build.

**Statut à reporter dans la roadmap :** aucun. Ce chantier ne livre pas de
fonctionnalité produit.

---

## 2026-08-31 Étape : A5, A6, A4, C0 et temps de trajet

> **Repris du chat, non reconstitué.** Transposition du rapport de fin d'étape
> affiché dans la session du 31/08, mis au format ci-dessus. Le contenu n'a pas été
> réécrit ni complété.

**Fait :**

- **A6 hors zone « sous réserve de validation »** : hors zone, la cliente voit deux
  portes, envoyer la demande quand même (rendez-vous en statut `conditional`) ou
  déclarer un séjour. Côté pro, une section « À décider » en tête d'agenda, hors de
  la semaine affichée, avec deux boutons, la distance hors zone recalculée à
  l'affichage et les dates de séjour. Elle ramasse aussi les demandes A11 en
  confirmation manuelle, qui n'avaient jusqu'ici aucun moyen d'être validées : on
  créait des rendez-vous `pending` sans porte de sortie.
- **A5 cliente en déplacement** : ① « je connais mon adresse » (adresse de séjour et
  dates, le géo-filtrage repart de là) est fait. ② « je suis à l'hôtel » demande la
  Places API, non activée : le code est écrit et inerte, sans clé la cliente saisit
  l'adresse de son hôtel avec les communes desservies affichées.
- **Page de suivi par jeton** (`/demande/<jeton>`) : donnée à l'envoi, elle affiche
  l'attente, la confirmation, ou le texte de refus enchaîné sur la liste d'attente
  A9. Ajout hors roadmap, voir Écarts.
- **Temps de trajet entre les rendez-vous** : affichés sur le motif pointillé du
  brief, en vue jour de l'agenda et sur la tournée. Pas côté cliente.
- **A4 photos à la réservation** : deux champs (cheveux au naturel, inspirations),
  cinq photos de 5 Mo, HEIC accepté puisque c'est le défaut iPhone. Seau privé sans
  politique ; le serveur vérifie l'appartenance du rendez-vous par une lecture
  soumise à la RLS, puis signe une URL de dix minutes. Un échec d'envoi ne défait
  jamais la réservation.
- **C0 « Ma tournée »** : prochain rendez-vous en tête avec bouton GPS, timeline avec
  les trajets, états à venir / en cours / terminé, total de la journée. Gaté sur
  l'offre 2, vérifié côté serveur. `distanceMeters` est maintenant demandé à la
  Routes API pour que le total kilométrique soit juste et non estimé.
- **Correctif** : les réservations en ligne n'enregistraient aucune coordonnée. Elles
  étaient donc invisibles au calcul des trajets : un rendez-vous pris en ligne ne
  bloquait pas les créneaux qu'il aurait dû bloquer, et n'apparaissait pas dans la
  tournée. Le même défaut avait été corrigé côté rendez-vous manuels sans voir qu'il
  existait aussi de l'autre côté.
- **Correctif sécurité** : la migration 0002 accordait `service_areas` en entier au
  rôle anonyme, colonnes `center_lat` et `center_lng` comprises. En mode « rayon »,
  c'est le domicile de la pro, et la clé anonyme est publique. Aucune fuite en
  pratique, le mode « communes » étant le seul utilisé, mais la porte était ouverte.
- **Copy** : les neuf verdicts de la relecture du 31/08 sont appliqués.
  `choisirPrestation` supprimé au profit de la ligne du board. Deux textes en dur de
  la page publique débranchés vers le deck. Le board donnait déjà le badge, la ligne
  d'attente et les deux boutons du pro pour A6 (bloc 9b).
- **`pros.pronoun`** : l'accord elle/il demandait une donnée qui n'existait pas.
  Nullable à dessein, avec un champ dans le profil. Sans réponse, la phrase bascule
  sur une variante sans pronom plutôt que de supposer « elle ».
- **CLAUDE.md fusionné** avec la version rédigée par Morgan.

**Schéma :** migration `0007_hors_zone_et_photos.sql`. À la clôture de l'étape, elle
était **EN ATTENTE** d'application par Morgan. Voir `supabase/ETAT.md` pour son
statut réel.

**Décisions :** T13 à T18, plus les trois points ajoutés à la section « Ouvert »
de `docs/decisions.md` (Places, écran d'abonnement, sender ID inchangé).

**Écarts au brief :**

- **Page de suivi par jeton : ajout hors roadmap.** Aucun SMS ne part au refus
  (principe n°1, et B7 n'existe pas). Il fallait donc un chemin de retour vers la
  cliente, qui n'a pas de compte ; sans lui, le refus est un silence. A10 réutilisera
  le même chemin. Signalé comme addition au moment de la livraison.
- **Temps de trajet non affichés côté cliente**, contrairement à une lecture
  possible de la demande. Lui dire « 12 min depuis le rendez-vous précédent »
  révélerait l'existence des autres rendez-vous de la pro. La cliente apprend qu'un
  horaire est pris, rien de plus.
- **A5 ② incomplet** : la suggestion d'hôtels demande une seconde facture Google,
  non activée sans accord.
- **Clôture B6 et bouton retard C5 non construits** dans C0 : phase 2. L'état d'un
  rendez-vous se déduit donc de l'heure.
- **Deux contradictions relevées entre les deux CLAUDE.md** : le chemin de la
  roadmap, et le principe 6 contre la migration 0002 (traité ci-dessus).

**Questions ouvertes :**

- **Places API** pour A5 ② : activer ou non cette seconde facture Google.
- **Chemin de la roadmap** : la copier dans `docs/` ou la laisser hors du dépôt.
  (Tranché depuis : elle reste hors du dépôt, en lecture seule.)
- **`/app/abonnement` renvoie un 404** : `requireCapability()` y redirige, l'écran
  n'existe pas (G1). Un pro en offre 1 qui forcerait l'URL de la tournée tomberait
  dessus. Le lien de navigation est masqué hors de l'offre qui l'inclut, ce qui
  referme le cas courant.
- **Textes A5, A4 et C0 rédigés faute de source**, listés dans
  `packages/copy/MANQUES.md` pour relecture.

**À recetter par Morgan :** la recette de bout en bout n'avait pas été jouée à la
clôture, la migration 0007 n'étant pas appliquée. Elle reste à faire :

- Réserver depuis une adresse **dans** la zone : le parcours doit être inchangé.
- Réserver depuis une adresse **hors zone** : vérifier l'avertissement, le pronom
  accordé si le profil le renseigne, puis « Envoyer la demande ». Le rendez-vous doit
  apparaître dans « À décider » avec la distance.
- Cliquer **Valider**, puis refaire une demande et cliquer **Refuser** : ouvrir le
  lien de suivi donné à l'envoi et vérifier les deux écrans, dont l'enchaînement sur
  la liste d'attente au refus.
- Prendre la porte **« Vous serez sur place ? »** : saisir une adresse de séjour et
  des dates, vérifier que les créneaux repartent de cette adresse et que les dates
  remontent dans « À décider ».
- Joindre **des photos** à une réservation, puis les ouvrir depuis la fiche du
  rendez-vous côté pro.
- Ouvrir **Ma tournée** sur une journée à plusieurs rendez-vous : trajets entre les
  cartes, prochain rendez-vous en tête, bouton GPS, total kilométrique.
- Vérifier qu'un profil **sans pronom** renseigné produit bien la phrase neutre.

**Statut à reporter dans la roadmap :**

- `A1 : ✅ Fait (30/08 : recette validée)`
- `A3 : ✅ Fait (31/08 : Routes API + repli calibré, recette validée)`
- `A4 : ✅ Fait (31/08 : recette à valider, copy à ratifier)`
- `A5 : 🔧 En cours (31/08 : ① fait, ② en attente de l'activation Places)`
- `A6 : ✅ Fait (31/08 : décision depuis l'agenda, la notification vient avec C1)`
- `B11 : ✅ Fait (30/08 : recette à valider)`
- `C0 : 🔧 En cours (31/08 : timeline, trajets, prochain RDV. Clôture B6 et retard C5 en phase 2)`

> Ces sept lignes ont déjà été écrites dans la roadmap au cours de l'étape. Trois
> d'entre elles portent « Fait » sans que Morgan ait cliqué : elles sont à
> reconsidérer au regard de la règle posée depuis, qui réserve « Fait » à Morgan.

---

## 2026-08-31 Étape de reprise : socle, B11, B10, A1, A3 et chantiers transverses

> **Entrée reconstituée.** Ce journal n'existait pas quand ces étapes ont été
> livrées. Le contenu ci-dessous est établi depuis `docs/decisions.md`,
> `packages/copy/MANQUES.md`, `docs/architecture.md`, `docs/matrice-acces.md`, les
> migrations et l'état réel du dépôt. **Ce que le dépôt ne prouve pas est écrit comme
> inconnu.** Les dates par étape ne sont pas reconstituables : seul le dépôt fait foi,
> et il n'horodate rien avant le premier commit.

**Fait :**

- **Socle** : monorepo npm workspaces, `apps/web` (Next.js 16, App Router),
  `apps/pro` (Expo), `packages/core` (domaine et gating), `packages/api` (schémas
  zod), `packages/copy` (copy deck), `packages/tokens` (design tokens).
  Authentification Supabase, feature-gating dans `packages/core/src/tiers.ts`.
- **Modèle de données et cloisonnement** : migrations `0001` à `0006`. RLS active sur
  toutes les tables ; lecture anonyme restreinte au niveau des colonnes par des
  `GRANT`. `city_waitlist`, `rate_limits` et `geocodage_refus` sont verrouillées par
  conception, RLS active et aucune politique.
- **B11 paramétrage de l'activité** : prestations, zone d'intervention en liste de
  communes, horaires récurrents, congés.
- **B10 agenda et ajout manuel de rendez-vous** : vues jour et semaine, création et
  édition, annulation. Les rendez-vous manuels sont géocodés avec la même validation
  que la réservation en ligne.
- **A1 page publique** et **A3 moteur de créneaux géo-filtrés** : moteur pur et
  testable dans `packages/core/src/creneaux.ts`, orchestration dans
  `apps/web/src/lib/creneaux.ts`.
- **Moteur de trajets** : Routes API de Google (`computeRouteMatrix`), repli
  automatique à vol d'oiseau calibré sur des mesures réelles, cache court en mémoire.
- **Géocodage** : API Adresse de l'État, validation stricte contre la saisie, chemin
  gracieux avec suggestions, journalisation des refus en base (`geocodage_refus`).
- **A9 recherche par ville et liste d'attente**, écrite avec des textes provisoires.
- **Chantiers transverses** : chaîne de qualité permanente (`npm run check` :
  Prettier, ESLint strict, `tsc --noEmit`, knip ; `npm run verify` enchaîne l'ensemble
  avec les migrations, les tests d'isolation, la matrice d'accès, `design:check` et
  `copy:manques`), et interdiction des tirets cadratins dans le contenu lisible par
  les utilisateurs, contrôlée par `design:check`.
- **Copy deck** extrait du board design (29 blocs verbatim dans
  `packages/copy/source/`), avec `MANQUES.md` pour ce que le board ne couvre pas.
- **Design tokens** générés depuis un JSON unique, verrouillés par test structurel.

**Schéma :** migrations `0001` à `0006`. Voir `supabase/ETAT.md`.

**Décisions :** T1 à T12, hypothèses H-A à H-E. Détail dans `docs/decisions.md`.

**Écarts au brief :** non reconstituables de façon fiable. Les écarts de cette
période ont été exposés dans le chat au fil de l'eau et ne sont pas tracés dans le
dépôt. **Inconnu.**

**Questions ouvertes** (celles que le dépôt atteste encore) :

- **Quotas SMS** `60 / 150 / 250`, essai 50 : calibrés, pas actés (H-A).
- **Noms commerciaux et montants des trois paliers** : à confirmer par les entretiens.
- **Sender ID des SMS** : au nom du pro ou « Wiggy » (G4).
- **Mécanisme d'acceptation contractuelle** ajouté au périmètre G1/G3, explicitement
  non construit à ce stade.
- **Sept écrans sans copy dans le board**, listés dans `packages/copy/MANQUES.md`.

**À recetter par Morgan :** la recette du parcours A3 de bout en bout a été jouée
contre la vraie base pendant l'étape (réservation créée, horaire et fuseau vérifiés,
chemin gracieux du géocodage vérifié, données de test supprimées). Le dépôt ne trace
pas de recette faite par Morgan lui-même. **Restent à recetter par lui :** B11 et B10.

**Statut à reporter dans la roadmap :** aucun nouveau. Les statuts de cette période
figurent déjà dans la roadmap et sont repris dans l'entrée du 31/08 ci-dessus.
