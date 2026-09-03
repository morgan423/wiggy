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

_Rien en attente : les trois questions ouvertes ont été tranchées le 03/09._

---

## 2026-09-03 (5) Étape : B7 derrière un adaptateur, le copilote, B5, la page publique et B12

**Fait :**

### Chantier 1, B7 et l'adaptateur (D14, G4)

- **L'interface d'envoi vit dans le cœur** (`packages/core/src/messagerie.ts`), l'adaptateur seul
  connaît Brevo (`lib/messagerie/brevo.ts`). Même motif que le moteur de trajets, et pour la même
  raison : la revoyure prévue vers 10 000 SMS par mois doit coûter un fichier voisin et une ligne
  de configuration, pas une refonte. Aucun appel direct au fournisseur ailleurs, ni pour le SMS,
  ni pour l'e-mail.
- **D14 vérifié explicitement : le chemin SANS fournisseur est le chemin normal.** C'est
  l'implémentation par défaut, écrite en premier, et elle renvoie `non-configure` plutôt que
  `echec` : la nuance décide de la bascule au lieu de déclencher une alerte. Le tunnel de bout en
  bout tourne dessus à chaque `verify`.
- **La cascade en trois temps est complète** : compteur mensuel par pro (migration 0012, table
  verrouillée par conception), alerte à 80 % UNE fois par mois, bascule automatique et gratuite au
  plafond. **La remise à zéro du 1er n'est pas une tâche planifiée** : c'est une conséquence de la
  clé mensuelle. Rien à faire tourner, donc rien qui puisse ne pas tourner.
- **Le compteur n'est jamais affiché à la pro.** Pas de jauge, pas de décompte. Il est verrouillé
  en base, à la fois pour qu'elle ne puisse pas s'accorder des SMS et pour qu'elle ne voie pas la
  jauge que B7 refuse de montrer.
- **Le plafond était codé en dur nulle part et lisible nulle part** : il est maintenant dans le
  cœur, avec la date estimée d'atteinte que la notification des 80 % apporte. Sans cette date,
  prévenir ne servirait qu'à inquiéter.
- **La restriction de destination vaut pour TOUS les envois**, plus seulement les codes : elle
  est tenue dans `envoyerSms`, un cran au-dessus de tous les appelants.
- **La table `sms_usage` existait depuis 0001**, avec les colonnes de l'ancien modèle facturant
  abandonné le 02/09. Elle est adaptée, pas dupliquée, et `included` est retirée : une colonne
  morte finit toujours par être relue comme vivante.

### Chantier 2, le copilote (C2 à C7)

- **C3, le lien GPS** : `lienGps()` dans le cœur, trois applications, et le réglage enfin
  réglable (voir plus bas). On passe les COORDONNÉES et non l'adresse : notre géocodage fait foi,
  pas celui du GPS, et le piège « rue des Lilas à Pau qui répond dans les Landes » a déjà été payé
  une fois. Aucune navigation embarquée, jamais.
- **C4, le rappel de départ** : « Pars dans 10 min », lié au trajet réel, et jamais un compte à
  rebours brut. Il ne parle que dans sa fenêtre, un quart d'heure avant le départ : trop tôt il
  devient du bruit qu'on apprend à ignorer. Il dit aussi qu'il est trop tard, sans arrondir à
  zéro : une pro en retard doit le savoir.
- **C5, « Je suis en retard »** : le message est composé pour elle, avec l'heure d'arrivée tirée
  du trajet EN COURS et le retard arrondi vers le haut. **Il se prévisualise et se valide**, et
  c'est le geste de la pro qui l'envoie. Ce qui est automatisé, c'est l'écriture ; ce qui reste à
  elle, c'est l'envoi. G4 : il ouvre par elle et porte son numéro, parce qu'il appelle une réponse
  et qu'un sender ID alphanumérique ne se répond pas.
- **C2, la clôture ramène sur la tournée** et NOMME le prochain rendez-vous. À la clôture, la
  question suivante est déjà « où je vais maintenant » : on y répond au lieu de laisser sur un
  écran qui vient de se vider.
- **C7, « On cale le prochain ? »** : même prestation, même cliente, et la fenêtre calculée
  d'après SON rythme. **Quand le rythme ne dit rien (moins de trois visites), on propose sans
  fenêtre** plutôt que d'inventer une régularité : proposer « dans cinq semaines » à quelqu'un
  qu'on a vu deux fois, c'est deviner à voix haute.

### Chantier 3, B5

- **Le tampon « nouvelle cliente » a enfin un écran.** Il existait en base et dans le schéma
  depuis le début, et rien ne permettait de le régler. Une préférence qu'on ne peut pas régler
  n'est pas une préférence. L'écran de réglages manquait entièrement : il porte aussi le paiement,
  la confirmation, le SMS et le GPS de C3.
- **Une correction manuelle pèse plus que l'apprentissage**, et le code le dit : elle n'est pas
  une mesure parmi d'autres, c'est une instruction. Elle prime sur les deux niveaux, ne se moyenne
  avec rien, et **n'est pas bornée par le catalogue** : la borne existe contre le rendez-vous clos
  le lendemain, pas contre la pro. Elle sait qu'un lissage prend trois heures.
- **Aucune colonne n'a été ajoutée pour le savoir** : une durée planifiée différente du catalogue
  ne peut venir que d'une correction à la main. La donnée le disait déjà.

### Chantier 4, A1

Les cinq manques du 31/08 sont traités. La **bio** et l'**Instagram** étaient en fait présents ;
ce qui manquait vraiment, c'est le reste.

- **Les prestations deviennent des cartes d'information**, sur la surface, avec l'acompte annoncé
  sur la carte. Une seule action sur la page : le bandeau collant. Taper une carte ne réserve pas.
- **La durée disparaît côté cliente.** Elle n'aide pas à choisir, et elle engage la pro sur un
  temps qui varie d'une tête à l'autre.
- **Les réalisations ont leur place ET leur modèle** : migration 0013, `pro_photos`, lecture
  anonyme limitée aux fiches publiées et justifiée dans la matrice d'accès. À ne pas confondre
  avec `appointment_photos` (A4), qui sont les photos des CLIENTES : seau privé, aucune politique,
  jamais publiques. Les deux ne partagent ni table, ni seau, ni règle.
- **Le CTA est collant et réécrit** : « Trouver un moment avec Sophie », avec sa ligne de
  rassurance. « Réserver » sec en entrée de page ne disait ni quoi, ni avec qui.
- **A8 est tenu** : la page annonce qu'un forfait PEUT s'appliquer, jamais son montant.
- **Sans réalisation ni Instagram, les sections disparaissent.** Une page trouée dessert plus
  qu'une page courte, et c'est la page de quelqu'un qui débute.

### Chantier 5, B12

- **Un seul composant sert les trois écrans.** La zone d'intervention y était déjà ; l'adresse du
  tunnel cliente, l'adresse de séjour et l'adresse d'un rendez-vous manuel y passent maintenant.
- **L'asymétrie est traitée dans le composant, pas dans les écrans** : délai avant appel,
  annulation des requêtes dépassées, chemin gracieux. À quoi s'ajoute, côté appel, une **échéance
  courte** : une source qui met huit secondes a déjà perdu, la cliente a fini de taper.
- **Le choix remplit les trois champs d'un coup.** C'est la différence entre « la saisie est
  assistée » et « la saisie est plus rapide » : la cliente ne retape pas ce que la BAN vient de
  lui donner.
- **La saisie libre reste le repli.** En rural, un hameau peut n'être reconnu par aucun
  référentiel, et rien ne doit bloquer.
- **Le test de bout en bout passe par la saisie assistée**, propositions comprises. Si la BAN ne
  répond pas, il tombe, et c'est exactement ce qu'on veut savoir.

**Schéma :** **0012_usage_sms.sql** et **0013_realisations.sql**, EN ATTENTE d'application par
Morgan. La 0011 est toujours en attente elle aussi.

**Décisions :** D14, G4, B5, B7, B12, C2, C3, C4, C5, C7, A1, A8.

**Écarts au brief :**

- **Le pack SMS à prix coûtant n'a pas d'écran d'achat.** La bascule au plafond est automatique et
  gratuite, ce qui est la partie qui protège la cliente ; l'achat d'un pack est un parcours de
  paiement, donc G1, avec ses textes contractuels que je n'écris pas.
- **La notification des 80 % est calculée mais n'a pas de destinataire** : il n'existe pas encore
  de système de notification pro. La mécanique renvoie `alerteQuota`, prête à être branchée. Elle
  ne se déclenchera de toute façon pas pendant la bêta, qui tourne sans SMS.
- **Les réalisations n'ont pas d'écran d'envoi de photos.** La table, la politique et l'affichage
  public existent ; l'envoi réutilisera le chemin d'URL signée d'A4, et je préférais livrer les
  quatre autres corrections d'A1 bien plutôt que celle-ci à moitié.
- **C7 propose la fenêtre, il ne calcule pas les créneaux dedans.** L'écran de création s'ouvre
  sur la date suggérée, et les créneaux restent ceux du moteur. Proposer une liste de créneaux
  géo-cohérents à l'intérieur de la fenêtre demanderait une variante du moteur ; la fenêtre suffit
  à supprimer la friction du geste, qui est ce que C7 cherche.
- **Le message de C5 part par la cascade B7**, donc en e-mail pendant la bêta (D14). La cliente
  est prévenue, c'est ce qui compte pour elle.

**Questions ouvertes :** aucune.

**À recetter par Morgan :**

1. Colle `0011`, `0012` et `0013`, dans l'ordre, puis coche les trois lignes de `supabase/ETAT.md`.
2. Réserve un créneau sur une page publique : **tape les premiers caractères de l'adresse**, les
   propositions arrivent seules, et le choix remplit tout. Coupe le réseau à mi-frappe : la saisie
   reste possible à la main.
3. Regarde la page publique : prestations en cartes, **plus aucune durée**, acompte annoncé sur la
   carte, bandeau collant en bas, phrase sur le forfait sans montant. Sur une pro sans bio ni
   Instagram, aucune section vide.
4. « Ton activité » puis « Réglages » : choisis ton GPS, mets un temps en plus pour une première
   visite, décoche les SMS.
5. Sur ta tournée, à l'approche d'un rendez-vous : le bandeau miel **« Pars dans N min »** apparaît
   dans le quart d'heure avant le départ, et pas avant.
6. Tape « Lancer le GPS » : c'est l'application que tu viens de choisir qui s'ouvre.
7. Tape « Je suis en retard » : le message est **écrit pour toi**, avec l'heure d'arrivée. Relis-le,
   modifie-le, et c'est TON geste qui l'envoie. Rien ne part avant.
8. Sur un rendez-vous en cours, tape « Terminé » : tu reviens sur la tournée, le **prochain
   rendez-vous est nommé**, et « On cale le prochain ? » propose la suite avec la même prestation.
9. Change la durée d'un rendez-vous à la main, clos-le, puis regarde les créneaux proposés pour
   cette prestation : c'est TA durée qui prime, pas la moyenne.
10. Ajoute une plage bloquée, puis vérifie sur ta page publique que le créneau n'est plus proposé.

**Statut à reporter dans la roadmap :** B5, B7, B12, C2, C3, C4, C5, C7 : « Construit, recette à
valider ». A1 : « Les cinq manques du 31/08 traités, recette à valider ; envoi des réalisations à
construire ». D14 : « Chemin sans fournisseur vérifié ». G4 : « Adaptateur en place, Brevo isolé ».

## 2026-09-03 (4) Étape : D3, la fiche cliente (B1 B2 B3), le créneau et la clôture (B4 B6)

**Fait :**

### Chantier 1, D3 : la contrainte d'architecture

- **Règle inscrite dans `CLAUDE.md`** : la logique, les écrans, le copy et les jetons vivent dans
  les packages communs, jamais dans une enveloppe. Avec le motif de l'urgence, écrit noir sur
  blanc : chaque écran construit dehors est un écran à réécrire le jour du natif.
- **`npm run archi:check` rend la règle exécutable**, et le critère est mécanique plutôt que
  jugé : un module d'enveloppe est **portable** si tout ce qu'il importe est portable
  (`@wiggy/*`, Node, ou un autre module portable). Un module portable tournerait tel quel en
  React Native, donc sa place est dans un package. Prouvé en le faisant échouer exprès sur une
  règle métier posée dans `apps/web/src/lib`.
- **L'ampleur, mesurée.** Six modules sont totalement portables aujourd'hui. Un seul est de la
  vraie dette (`lib/forms.ts`), un a été déplacé sur-le-champ (les libellés de jours, partis dans
  `packages/core`), et quatre sont des **écarts justifiés** : les classes Tailwind de la trousse
  (vocabulaire du web) et les trois clients d'API tierces (`apps/web` est aussi l'hôte de l'API,
  et déplacer des clés serveur vers un package que le mobile embarquerait serait l'inverse de la
  sécurité). Le tout est écrit dans `docs/architecture-dette.md`, avec les motifs, et le contrôle
  échoue sur toute ligne qui n'y figure pas : **l'inventaire ne peut que se réduire.**
- **L'ampleur réelle est plus grande que ces six-là, et le script le dit** : 27 modules
  d'enveloppe touchent au domaine sans être portables (ils appellent la base au passage), et 28
  fonctions d'aide vivent au pied de 6 écrans. Rien de tout cela n'est bloquant, tout serait à
  reprendre le jour du natif. Le chiffre est affiché à chaque exécution pour qu'il ne s'oublie pas.

### Chantier 2, la fiche cliente

- **B1, la fiche** (`/app/clientes/[id]`, structure de la planche 16c) : le prénom en tête, le
  résumé de la relation sous lui, puis les notes, l'adresse et le téléphone, puis l'historique.
  L'ordre est un ordre de travail : ce qu'on vient chercher avant un rendez-vous d'abord, ce
  qu'on consulte ensuite.
- **La liste** (`/app/clientes`) : recherche et tri par dernière visite, parce qu'une pro cherche
  « celle que j'ai vue la dernière fois » avant de chercher un nom.
- **Le rythme de retour est CALCULÉ, jamais stocké** : `packages/core/src/fiche.ts`. Médiane et
  non moyenne, et **rien avant trois rendez-vous** : avec deux visites on n'a qu'un intervalle, et
  un intervalle n'est pas un rythme. C'est ce chiffre qui armera la relance (11c) ; le poser trop
  tôt ferait relancer des clientes sur une régularité inventée.
- **B2, les annotations techniques**, éditables sur la fiche et **pré-affichées** à deux endroits :
  sur la consultation d'un rendez-vous, et dès qu'une fiche est choisie à la création d'un
  rendez-vous. C'est là toute la promesse anti-carnet-papier : elles sont là où on en a besoin,
  sans aller les chercher.
- **Le garde-fou santé est tenu par l'INTERFACE, pas par un filtre.** Le texte d'aide et l'exemple
  orientent vers la formule, le dosage, le produit et le geste. Aucun filtre n'est posé sur la
  saisie, et c'est délibéré : filtrer des mots reviendrait à lire les notes de la pro, ce qui
  serait pire que le mal. On éduque l'usage, on ne surveille pas.
- **B3, la note par rendez-vous**, distincte de la fiche, avec le texte qui dit la différence :
  « elle avait les cheveux mouillés en arrivant » ne doit pas se réafficher aux dix visites
  suivantes ; « formule 6.35 » doit se réafficher à toutes.
- **R3-1 corrigé, et pour de bon.** La liste native `Choix` s'ouvrait sur la première cliente par
  ordre alphabétique, et n'étant pas contrôlée, elle ne remplissait l'adresse qu'au changement,
  donc jamais au premier rendu. Elle est remplacée par `ListeDeroulante`, qui **impose une option
  neutre** et est contrôlée. Le composant `Choix` a été **supprimé du dépôt** : tant qu'il
  existait, le défaut pouvait revenir.
- **La quatrième entrée « Clientes » est dans la barre de navigation** : elle mène quelque part,
  l'écart ratifié à la recette 6 se referme.

### Chantier 3, le créneau et la clôture

- **B4, le blocage manuel** : écran de pose, affichage des plages bloquées **dans la journée** (à
  leur place, pas dans une liste à part), et libération en un tap. Le motif est facultatif et ne
  sort jamais de l'app.
- **L'instrumentation de D2 est en place** : `blocked_slots.created_at` (migration 0011) et
  `npm run mesure:blocages`, en **lecture seule** (R2-4), qui compte les blocages par pro et par
  semaine et applique le seuil de décision écrit dans le script : au-dessus de la moitié des
  testeuses à un blocage par semaine, besoin confirmé.
- **B6, « Terminé »** : un tap sur un rendez-vous en cours enregistre le temps réellement passé.
- **L'apprentissage des durées vit dans le cœur** (`packages/core/src/durees.ts`), à deux
  niveaux : la cliente prime sur la pro, la pro prime sur le catalogue. Médiane, arrondi vers le
  haut, et **une borne à la moitié du catalogue dans les deux sens** : un rendez-vous clos le
  lendemain produit une mesure de vingt heures, et sans borne cette seule ligne viderait une
  semaine d'agenda. Les créneaux proposés en tiennent compte au niveau de la pro (dans le tunnel,
  on ne sait pas encore qui réserve).

### Les petites choses

- **A9 tranché** : la liste d'attente collecte l'**e-mail**, et le texte le dit enfin. La ligne
  quitte la section d'arbitrage, qui est désormais vide.
- **G4 tranché** : la décision est écrite là où elle s'appliquera, dans `lib/sms`, et dans le copy
  deck. Aucune constante n'est posée tant qu'aucun fournisseur ne l'utilise : une valeur sans
  consommateur se périme sans que personne s'en aperçoive.
- **`/app/abonnement` existe** : une pro en offre 1 tombait sur un 404 depuis toujours. La page
  nomme la fonctionnalité demandée, nomme l'offre qui la contient, et rouvre la porte. **Ce n'est
  pas G1** : ni choix d'offre, ni paiement, ni résiliation, ces textes sont contractuels.
- **`db-bundle` annonce le fichier qu'il écrit**, et non plus un autre.
- **`npm run vues` capture trois écrans de plus** : la liste des fiches, une fiche remplie avec
  ses notes techniques, et l'écran de blocage.

**Schéma :** migration **0011_blocages_et_cloture.sql**, EN ATTENTE d'application par Morgan.

**Décisions :** D3 (architecture), D2 (instrumentation seulement), B1, B2, B3, B4, B6, A9, G4,
R3-1.

**Écarts au brief :**

- **La fiche n'a pas la pagination par année de la planche** au-delà de vingt rendez-vous : elle
  affiche les cinq derniers puis le compte total. La pagination viendra avec une fiche qui a
  vingt visites, pas avant.
- **La suppression de fiche n'est pas construite** : la planche 16c la renvoie à la modale
  destructive 9b, qui n'existe pas. Supprimer une fiche sans la modale qui dit ce que devient
  l'historique serait exactement le genre de geste qu'on ne rattrape pas.
- **L'apprentissage par CLIENTE n'est pas branché dans le tunnel**, seulement le niveau pro. Ce
  n'est pas un oubli : au moment où les créneaux se calculent, la cliente n'est pas encore
  identifiée. Il se branchera sur la création manuelle d'un rendez-vous, où la fiche est connue.
- **Le blocage se pose sur une journée**, pas sur plusieurs jours d'affilée. Une absence longue
  est un congé (14f), et il existe déjà.
- **L'avatar de la fiche est à GAUCHE du prénom**, pas au-dessus. Il était sous le résumé, ce que
  Morgan a relevé sur la capture en proposant deux issues : au-dessus, ou pas d'avatar. La
  planche 16c en donne une troisième, et c'est la sienne : avatar et nom font corps, sur une même
  ligne, dans le bandeau prune. La règle dit que la planche gagne, l'écart est ici.

**Questions ouvertes :** aucune. Les trois qui restaient ont été tranchées.

**À recetter par Morgan :**

1. Colle `0011_blocages_et_cloture.sql`, puis coche la ligne dans `supabase/ETAT.md`.
2. La barre du bas a **quatre entrées**. Tape « Clientes » : la liste s'ouvre, triée par dernière
   visite. Cherche un prénom, la liste filtre.
3. Ouvre une fiche : prénom en tête, résumé (« 3 RDV · depuis mars 2026 »), notes, adresse,
   historique. Le rythme « revient toutes les N sem. » n'apparaît qu'à partir de trois visites.
4. Écris des notes techniques, enregistre, recharge : elles sont là. Ouvre ensuite un rendez-vous
   de cette cliente : **elles s'affichent sans que tu ailles les chercher**.
5. Sur ce rendez-vous, ajoute une **note de rendez-vous**. Vérifie qu'elle n'apparaît PAS sur les
   autres rendez-vous de la même cliente : les deux champs ne vivent pas à la même échelle.
6. Agenda, « Nouveau rendez-vous » : la liste des fiches s'ouvre sur **« Choisis dans tes
   fiches »**, pas sur un nom. Choisis-en une : son adresse et ses notes apparaissent aussitôt.
7. Depuis une fiche, tape « Nouveau rendez-vous » : la cliente est déjà choisie.
8. Agenda en vue jour, « + Bloquer une plage ». Pose-la, elle apparaît en pointillés dans la
   journée. Va sur ta page publique : **le créneau bloqué n'est plus proposé**. Reviens, « Libérer ».
9. Un rendez-vous en cours porte le bouton **« Terminé »**. Tape-le : il passe terminé.
10. Ouvre une fonctionnalité que ton offre ne contient pas (le copilote de tournée en offre 1) :
    tu arrives sur une page qui dit quelle offre la contient, plus sur un 404.
11. Recherche par ville sans pro : le texte dit « Laissez votre **e-mail** ».

**Statut à reporter dans la roadmap :** B1, B2, B3, B4, B6 : « Construit, recette à valider ».
D3 : « Contrainte outillée, `npm run archi:check` ». D2 : « Instrumentation en place ». G4 :
« Expéditeur tranché et inscrit ; implémentation avec le fournisseur ». A9 : « Tranché,
e-mail ». R3-1 : « Corrigé, recette à valider ».

## 2026-09-03 (3) Étape : D13, le prix, le mode d'exercice et les correctifs du site

**Fait :**

- **D13 inscrite dans `CLAUDE.md`** : le design fin passe à la fin, en une passe, quand les
  écrans porteront leurs fonctionnalités. Ce qui reste obligatoire dès maintenant, et c'est
  l'essentiel : la trousse et l'anatomie. On ne code pas hors du système. Jusqu'à la passe finale,
  une recette porte sur ce qui marche, pas sur ce qui ressemble.
- **S8, le prix passe à 34,90 €** : `apps/web/src/app/page.tsx` et les trois sources de copy 2a,
  6a et 12b. La grille complète est portée en note dans chaque source (19,90 € Essentielle,
  34,90 € Tournée, 49 € Intelligence). Le board portait aussi « 19 € » pour l'offre basse : passé
  à 19,90 €.
- **S5, la commission disparaît** : la phrase « sans commission sur tes rendez-vous » est retirée
  de la source 6a. Il n'y a pas de commission, donc on n'en parle pas. Dire « sans commission »
  installe l'idée qu'il pourrait y en avoir une.
- **S1, S4, S7 : vérifiés, déjà en place.** S1 vit dans `packages/core/src/payment-terms.ts`, qui
  renvoie UNE formulation dérivée du réglage du pro, et la page publique l'utilise. S4 : le claim
  et son sous-titre sont ceux qui sont ratifiés, sur la home et sur l'image de partage. S7 : le
  bouton mène bien à `/recherche`. Aucun de ces trois n'a demandé de correction ; je le dis
  plutôt que de faire semblant d'avoir travaillé dessus.
- **D10 ①, le mode d'exercice est réservé.** Migration `0010_mode_exercice.sql` : colonne `mode`
  sur `pros`, `itinerant` par défaut, contrainte sur les deux valeurs, lecture accordée à `anon`
  (c'est la page publique qui doit savoir s'il faut demander une adresse). Le réglage est dans
  « Ma Page », en case à cocher de la trousse.
- **En mode fixe, AUCUNE adresse cliente n'est collectée.** L'étape adresse du tunnel n'existe
  pas, le géocodage n'est pas appelé, la zone n'est pas vérifiée, et le rendez-vous s'enregistre
  sans adresse ni coordonnées. Ce n'est pas un cas dégradé : sans déplacement, l'adresse n'a
  aucune finalité, et une donnée sans finalité ne se collecte pas.
- **Le moteur de créneaux accepte `lieuCliente: null`** et cesse alors de décompter les trajets.
  Un test le prouve en montrant qu'un créneau refusé pour cause de route en itinérant est
  proposable en fixe.
- **L'adresse change de gardien, elle ne perd pas son gardien.** Le schéma `ReservationInput` la
  rend facultative, parce qu'un schéma ne connaît pas le mode d'exercice ; la route serveur la
  réexige chez une pro itinérante, après avoir lu le mode. R2-7 bis reste tenue.
- **Le mode n'est jamais un droit (D10 ③), et c'est vérifiable** : un test lit `tiers.ts` et
  échoue si le mot y apparaît. Prouvé en le faisant échouer exprès. En fixe, les fonctions géo ne
  sont pas RENDUES, décision d'écran ; elles ne sont pas RETIRÉES, ce qui serait une décision de
  droits.
- **Six clés de copy réservées pour la variante fixe**, déclarées dans `MANQUES.md`. Elles ne
  servent pas encore : c'est le but.
- **Arbitrage tranché : Fraunces sous 20 px.** Exception accordée aux NOMBRES SEULS, plancher à
  16 px. Elle est rendue **structurelle** plutôt que déclarative : un composant `Prix` de la
  trousse, qui prend des CENTIMES et non une chaîne, est le seul à porter la classe, et
  `design:check` la refuse partout ailleurs. Aucun texte ne peut l'emprunter, le typage l'interdit
  avant même le garde-fou. Prouvé en faisant échouer la règle exprès sur « à partir de 45 € ».
- **Arbitrage tranché : le contraste.** Le texte secondaire passe de 55 % à 65 %. **Les 61
  occurrences sous AA ont disparu, il n'en reste aucune.** Le livrable de Design reste à 55 % dans
  `reference/design-v2.json`, et le test des jetons porte désormais une liste de DÉROGATIONS
  nommées et motivées : celle-ci y figure, avec ses mesures. Une dérogation qui cesserait de
  déroger fait échouer le test, pour que la liste ne devienne pas un cimetière.

**Schéma :** migration **0010_mode_exercice.sql**, EN ATTENTE d'application par Morgan. La 0009
est toujours en attente elle aussi.

**Décisions :** D13 (méthode), D10 ① et ③ (mode d'exercice), S1, S4, S5, S7, S8.

**Écarts au brief :**

- **Le code lit et écrit `mode` À PART du reste du profil.** Les migrations s'appliquent à la
  main (D7), il existe donc une fenêtre où le code connaît la colonne et la base ne l'a pas
  encore. Dans un `select` groupé, PostgREST rejette la requête entière : le tunnel de
  réservation serait tombé en 404 le temps que la migration soit collée, ce que la première
  exécution de `verify` a montré noir sur blanc. La lecture retombe donc sur `itinerant` et
  **le dit dans les logs**, elle ne l'avale pas. Personne ne perd de réservation pendant une
  migration.
- **Le prix Fraunces est à 17 px et non 16.** Le plancher accordé est 16 ; la planche 14d écrit
  17 et la 14e 16. Une seule classe à 17 px, au-dessus du plancher dans les deux cas : l'écart
  d'un pixel entre deux planches ne vaut pas une seconde classe.
- **La variante fixe n'est pas meublée**, comme demandé : pas d'onboarding, pas de « vous reçoit
  à » sur la page publique, pas de copilote sans GPS. En conséquence, **un rendez-vous pris chez
  une pro fixe n'a aujourd'hui aucun lieu enregistré**. C'est cohérent avec la minimisation, et
  ce sera l'adresse de la pro qui le remplira quand la variante complète se construira. À ne pas
  oublier : c'est la seule dette assumée de ce lot.

**Questions ouvertes :** la liste d'attente (numéro promis, e-mail collecté) reste ouverte, Morgan
la tranchera. Les deux autres arbitrages sont tranchés et basculés dans cette entrée.

**À recetter par Morgan :**

1. Colle `0010_mode_exercice.sql`, puis coche la ligne dans `supabase/ETAT.md`.
2. Avant de la coller, vérifie que le tunnel de réservation marche quand même : c'est le point
   qui a failli casser. Il doit se comporter exactement comme avant.
3. Home : le prix affiche « 34,90 € TTC/mois, tout compris ». Aucune mention de commission nulle
   part.
4. « Ma Page » : la case « Je reçois mes clientes à un poste fixe ». Coche-la, enregistre,
   recharge : elle est toujours cochée.
5. Case cochée, ouvre ta page publique et réserve : **l'étape adresse n'apparaît plus**. Les
   créneaux s'affichent directement, et la réservation aboutit.
6. Décoche, réserve à nouveau : l'étape adresse est revenue et reste obligatoire.
7. Regarde n'importe quel texte secondaire (« 45 min · visible », « quartier Zola ») : il est plus
   lisible qu'hier. C'est le passage à 65 %.
8. Un prix de prestation : il est en Fraunces, plus petit que le libellé, et non plus l'inverse.

**Statut à reporter dans la roadmap :** D13 : rien à changer, la ligne est déjà tranchée. S1, S4,
S5, S7, S8 : « Corrigé, recette à valider ». D10 : « ① et ③ réservés, recette à valider ; variante
fixe complète après la bêta ».

## 2026-09-03 (2) Étape : l'agenda, le rendez-vous et la tournée contre les planches 16a, 16b et 16d

**Fait :**

- **Cause du retard, dite franchement** : la reprise du matin s'était arrêtée à 14a-14g. La
  tournée et l'agenda ont leurs propres planches, `16d` et `16a`, que je n'avais pas ouvertes.
  Morgan a mis les deux écrans côte à côte avec leur planche pour le montrer.
- **16d, Ma tournée** : bandeau prune avec le statement « Ta tournée, {prénom}. », l'avancement en
  toutes lettres et le FIL DE PASTILLES, qui est le motif trajet de la planche 8a porté en
  avancement (miel plein pour ce qui est fait, anneau abricot pour le rendez-vous en cours, anneau
  doux pour la suite, segment plein derrière, pointillé devant). Dessous, une seule carte détachée
  par une bordure framboise, celle du prochain rendez-vous, avec ses deux actions empilées ; les
  suivants suivent en rangées atténuées. Deux autres états : « Journée bouclée. » avec son fil
  entièrement en miel et le bilan réel du jour, et le jour off, sans CTA de remplissage.
- **16a, Agenda** : vue JOUR par défaut, comme la planche. Bandeau prune avec la date, la bascule
  de vue et le résumé du jour. « À décider » est une carte abricot en tête, elle se voit avant
  tout le reste. Les rangées ont la colonne d'heure de 42 px, le nom et la prestation sur une
  ligne, le lieu dessous, et les trois pastilles de la planche : miel pour terminé, framboise pour
  en cours (avec la bordure framboise sur la rangée), contour pour à venir. Le trajet se lit entre
  les deux rendez-vous qu'il relie. Bouton flottant framboise pour ajouter.
- **La vue semaine devient le RADAR de la planche** : une barre par jour, framboise pour ce qui
  est réservé, abricot pour ce qui attend une décision, gris pour ce qui reste libre. Ce n'est pas
  une grille horaire, c'est une charge qu'on lit d'un coup d'œil.
- **16b : consultation et édition deviennent deux écrans.** La planche en fait une règle de
  sûreté autant que de composition, « la lecture ne contient aucun champ, tout tap accidentel est
  sans conséquence ». `/app/agenda/[id]` est désormais la consultation, en lecture seule ;
  l'édition vit sous `/app/agenda/[id]/modifier`, et « Modifier » est le seul chemin qui y mène.
- **La décision d'une demande se prend devant son détail.** La planche 16a met un chevron sur les
  lignes « À décider », pas deux boutons : valider et refuser sont donc sur la consultation, là où
  se lisent le lieu, l'heure et le motif. Décider sans avoir lu, c'est décider à l'aveugle.
- **Les textes des trois planches sont versés comme source ratifiée**,
  `packages/copy/source/spec-16.json`, au même titre que le board et la spécification 14. Les
  valeurs d'exemple des planches y sont remplacées par leurs variables.
- **`npm run vues` sème enfin une vraie journée** : quatre fiches clientes, un rendez-vous terminé,
  un en cours, un à venir et une demande à décider. C'est le correctif qui compte le plus de cette
  étape : l'agenda et la tournée se capturaient toujours VIDES, et c'est exactement pour ça que
  leur écart aux planches n'a été vu par personne, ni par le contrôle de contraste, ni par moi. Une
  vue de plus aussi, la consultation d'un rendez-vous.
- **`design:check` corrigé sur un point** : la règle qui interdit la classe `statement` dans
  l'espace pro cherchait `\bstatement\b`, donc elle mordait aussi `statement-ecran`, le statement
  de 30 px des planches 14b et 16d. Elle cherche désormais la classe entre délimiteurs. Vérifié en
  la faisant échouer exprès sur `statement`.
- **Un prix rond, un motif honnête** : un écart à la zone inférieur à 100 m n'écrit plus
  « hors zone +0 m » mais le motif, « sous réserve ».

**Schéma :** aucun. La migration 0009 reste EN ATTENTE d'application par Morgan.

**Décisions :** aucune nouvelle. D12 s'applique aussi à ces trois écrans : une seule anatomie, et
la vue semaine est la même à toutes les largeurs.

**Écarts au brief :**

- **Les flèches de jour ne sont sur aucune des deux planches.** 16a n'a que la bascule
  « Jour · Semaine », 16d ne parle que d'aujourd'hui. Elles restent, en pied de liste et en petit,
  parce que regarder la veille ou le lendemain est un besoin réel ; les mettre dans le bandeau
  faisait passer « Jeudi 3 septembre » à deux lignes et doublait sa hauteur.
- **« Terminer » n'existe pas sur la consultation.** La planche 16b en fait l'action principale
  d'un rendez-vous en cours, et précise qu'elle enregistre la durée réelle. C'est B6, la clôture
  en un tap, phase 2. Un bouton qui n'enregistrerait rien serait pire que son absence. « Commencer
  le trajet » est là, lui, pour un rendez-vous à venir.
- **« Voir la fiche de {prénom} » n'est pas affiché** : la fiche cliente est la planche 16c,
  livraison 3. Un lien mort en pied d'écran ne vaut pas mieux qu'un bouton mort.
- **« Acompte reçu » n'est pas affiché** : `appointments` ne porte pas de montant d'acompte
  encaissé. Rien à afficher, donc rien d'affiché.
- **La carte abricot « ce changement prévient {cliente} par SMS »** de l'édition n'est pas posée :
  aucun SMS ne part encore d'une modification, et annoncer un envoi qui n'a pas lieu est un
  mensonge à la pro.
- **Le jour off n'annonce pas la prochaine tournée** (« jeudi, 2 rendez-vous à Rezé ») : il
  faudrait interroger les jours suivants pour l'écrire sans mentir. On propose d'aller voir le
  lendemain plutôt que d'annoncer un chiffre qu'on n'a pas.
- **La serif dans l'agenda** : `CLAUDE.md` l'interdit, et l'annotation de la planche 16a la
  redit. Les planches 16a, 16b et 16d posent pourtant la DATE en Fraunces 24 px dans le bandeau.
  Lu comme Design l'écrit, l'interdit vise la LISTE, pas la tête d'écran : c'est la liste qui se
  lit vite et en biais. Le bandeau garde donc sa serif, et `design:check` porte cette lecture en
  commentaire pour que personne ne la découvre par surprise.

**Questions ouvertes :** les trois lignes de la section « En attente d'arbitrage » restent
ouvertes, aucune nouvelle.

**À recetter par Morgan :**

1. `/app/tournee` un jour travaillé : bandeau prune, « Ta tournée, {ton prénom}. », l'avancement,
   et le fil de pastilles sous lui. Une seule carte bordée de framboise, celle du prochain.
2. Fais passer l'heure au-delà du dernier rendez-vous : « Journée bouclée. », le fil tout en miel
   et le bilan (nombre, kilomètres, encaissé).
3. Un jour sans rendez-vous : « Rien aujourd'hui, c'est ton {jour}. » Aucun bouton de remplissage.
4. `/app/agenda` s'ouvre sur le JOUR, plus sur la semaine. Tape « Semaine » : c'est un radar de
   charge, une barre par jour. Tape un jour du radar : il ouvre sa vue jour.
5. Une demande hors zone : elle est en carte abricot en tête d'agenda, avec un chevron. Tape la
   ligne : tu arrives sur le rendez-vous, et c'est là que « Valider » et « Refuser » vivent.
6. Tape un rendez-vous ordinaire : tu arrives en LECTURE. Aucun champ. « Modifier » ouvre
   l'édition, et elle seule.
7. Vérifie les trois pastilles dans la liste du jour : miel pour terminé, framboise pour en cours,
   contour pour à venir, et la bordure framboise sur la rangée en cours.

**Statut à reporter dans la roadmap :** aucun. Cette étape ne livre pas de fonctionnalité, elle met
trois écrans de plus en conformité avec leurs planches. B10 et C0 restent à leur statut actuel.

## 2026-09-03 Étape : les sept écrans du paramétrage repris contre leurs planches (14a à 14g)

**Fait :**

- **Nouvelle règle inscrite dans `CLAUDE.md`** : la source de vérité pour la composition est le
  fichier `../../Design/planches/XX.html`, jamais une description en prose. La planche gagne
  contre une consigne qui diverge, la divergence s'écrit ici, et une consigne sans numéro de
  planche pour un écran spécifié est incomplète : on la demande. S'y ajoutent deux règles de
  méthode : ce qu'une planche ne dit pas se tranche puis se journalise, et on rend planche et
  écran côte à côte avant de dire qu'un écran est fait.
- **14a, le cadre** : le corps d'écran passe à la gouttière des planches (16 px de côté, 14 px de
  retrait), le bandeau prune la déborde et touche les bords, les cartes reviennent sur la
  surface. Nouvelle trousse dans `composition.tsx` : `EnteteEcran`, `CorpsEcran`, `RangeeEcran`,
  `EtiquetteSection`, `PastilleEtat`, `ActionPrincipale`, `BoutonPointille`, `EtatVide`,
  `RangeeSquelette`, `PanneauAuth`.
- **La colonne latérale de grand écran est supprimée.** La navigation est en bas à toutes les
  largeurs, comme la planche. Ce qui respire en grand est la colonne de contenu, bornée et
  centrée. Plus aucune classe `sm:` de mise en page ne subsiste dans l'espace pro.
- **14b, authentification** : plein prune sur toute la hauteur, statement Fraunces 30 px à l'axe
  WONK, champs blancs sans bordure au repos, bascules collées au pied. Les statements ratifiés du
  copy deck remplacent les anciens : « Te revoilà. » et « Bienvenue chez Wiggy. » L'erreur sur
  prune passe en abricot, cas unique déclaré par la planche et tenu dans `globals.css`.
- **14c, le hub** : deux compositions distinctes, celles de la planche. Jour un, aucune étiquette
  de section et trois rangées qui invitent avec leur pastille framboise ; rempli, une étiquette
  par section et un résumé **à droite, sur la même ligne**. « En ligne » devient une pastille
  miel. Le troisième état de la planche, le chargement, existe : `parametrage/loading.tsx` porte
  le squelette transverse de 14a.
- **14d, prestations** : rangées compactes, prix en Fraunces hors du bloc de texte, prestation
  masquée à 55 %, ajout en pointillés, état vide centré avec son action principale.
- **14e, zone** : les communes redeviennent des puces prune pleines, et la puce en pointillés
  « + Commune » vit dans le même flux qu'elles. Le forfait de base devient une rangée avec son
  montant à droite, l'édition s'ouvre au clic.
- **14f, journées et congés** : les sept pastilles de 38 px ouvrent la semaine. Congés vides :
  invitation centrée et action principale ; remplis : rangées d'une ligne et ajout en pointillés.
- **14g, Ma Page** : l'écran s'ouvre sur l'identité (avatar, nom, adresse publique, « Copier le
  lien »). La mise en ligne se calcule sur les trois étapes réellement posées et reste en
  framboise à 35 % tant qu'elles manquent, avec la phrase qui dit ce qui manque.
- **Les champs suivent enfin la planche** : surface, rayon 12, 12 px sur 13 px de gouttière,
  **aucune bordure visible au repos**. La bordure ne sert plus qu'à dire l'erreur ou l'ouverture.
  Ce trait est partagé : il change aussi les écrans du tunnel cliente.
- **Un prix rond s'écrit rond** : `formatEuros` n'affiche plus « 45,00 € » mais « 45 € ». Toutes
  les planches écrivent les prix ainsi, et c'est ce qu'écrit une pro sur sa carte.
- **Vérifié en regardant** : 22 vues capturées à 390 px, comparées une à une aux planches, et deux
  écarts corrigés à cette lecture seulement (la puce d'ajout de commune qui prenait toute la
  largeur au lieu de suivre les communes, et deux actions principales framboise côte à côte sur
  Ma Page). Le contrôle de contraste a bloqué une fois, à raison : le bouton en cours d'envoi
  passait à 35 % d'opacité et devenait illisible. « En cours » n'est pas « indisponible ».

**Schéma :** aucun. La migration 0009 reste EN ATTENTE d'application par Morgan.

**Décisions :** D12 (une seule anatomie) appliquée jusqu'au bout, avec le retrait de la colonne
latérale. Aucune décision nouvelle : le détail des arbitrages de composition est ci-dessous.

**Écarts au brief :**

- **La consigne décrivait le hub 14c comme des rangées jointives en un seul bloc arrondi séparé
  par des filets.** La planche montre des rangées **séparées**, rayon 16, écart 10 px, chacune sur
  la surface. La nouvelle règle donne la planche gagnante : c'est elle qui est construite.
- **Le prix en Fraunces est à 20 px, pas aux 17 px de la planche** (plancher de `CLAUDE.md`).
  Question portée en attente d'arbitrage.
- **14d fait passer l'édition d'une prestation par une feuille montante.** Elle n'existe pas.
  « Masquer » et « Supprimer » restent donc dans la rangée, en 11,5 px sous le détail : la rangée
  est plus haute que sur la planche.
- **14e met un interrupteur sur « Au-delà de ta zone ».** Il n'y a rien à commuter : le hors zone
  sous réserve est le comportement du produit (A6), pas une option. La rangée est gardée sans sa
  commande plutôt que de simuler un réglage.
- **14f fait toucher les pastilles pour régler un jour seul.** Ce geste demande une édition par
  jour qui n'existe pas ; les pastilles sont la lecture de la semaine, et le réglage reste sous
  elles. La carte abricot de conflit de congés n'est pas construite non plus : la détection de
  conflit n'existe pas, et une carte qui ne se déclenche jamais est un décor.
- **14g montre un bouton « Partager » et un choix d'avatar ou de photo.** Le partage natif et le
  système d'avatars dessinés ne sont pas construits ; ils ne sont pas simulés. La limite de 300
  caractères sur la bio, avec son compteur dès 250, n'est pas posée non plus.
- **Le panneau d'authentification pousse son PIED en bas, pas son formulaire.** La planche pose
  `margin-top: auto` sur un panneau de 380 px, ce qui y crée un intervalle. Porté à la hauteur
  d'un téléphone, le même auto ouvrait un vide de prune de 600 px entre le statement et le premier
  champ. Écart assumé, visible sur les captures.
- **La navigation garde trois entrées et non quatre** : « Clientes » mène à la fiche cliente,
  spécifiée en 16c, livraison 3. Écart déjà ratifié à la recette 6.
- **Deux textes non ratifiés ajoutés** au pied de la connexion, « Pas encore de compte ? » et
  « Essaie 30 jours » : la planche ne montre pas de chemin vers l'inscription depuis la connexion.
  Déclarés dans `MANQUES.md`.

**Questions ouvertes :** les deux nouvelles lignes de la section « En attente d'arbitrage », plus
celle de la liste d'attente qui reste ouverte.

**À recetter par Morgan :**

1. Ouvre `/connexion` et `/inscription` : plein prune, statement en Fraunces, champs blancs sans
   bordure, bascules collées en bas. Trompe-toi de mot de passe : le message est en abricot, pas
   en brique, et ta saisie n'est pas effacée.
2. Crée un compte neuf et va sur `/app/parametrage` : pas d'étiquettes de section, trois rangées
   avec leur pastille framboise « + », « Ma Page » en gris à 55 %.
3. Pose une prestation, une commune, une journée. Le hub bascule : étiquettes de section, résumé
   à droite sur la même ligne, congés apparus.
4. Vérifie la zone : la puce « + Commune » suit tes communes, elle ne fait pas une ligne à elle.
5. Passe sur ordinateur, fenêtre large : la navigation reste EN BAS. Aucune colonne à gauche. La
   colonne de contenu se centre et s'élargit un peu, rien ne se déplace.
6. Regarde un prix : « 45 € », plus « 45,00 € ». Un prix à centimes s'écrit toujours « 42,50 € ».
7. Mets ta page en ligne quand les trois étapes sont posées, puis regarde le hub : la pastille
   miel « En ligne » remplace le chevron.

**Statut à reporter dans la roadmap :** aucun. Cette étape ne livre pas de fonctionnalité, elle
remet sept écrans en conformité avec leurs planches. Les lignes B11, A6, A8 et D9 restent à leur
statut actuel.

## 2026-09-02 Étape : les six variantes de la promesse de rappel

**Fait :**

- **Les six variantes livrées par Design** sont au copy deck, dans le bloc `rappel` de
  `reservation-cliente`, plus l'état vide de la recherche par ville. Elles sont versées comme
  **source ratifiée** (`packages/copy/source/design-rappel.json`), au même titre que le board et
  la spécification : sans cela, le test qui refuse les textes inventés les aurait rejetées.
- **Ce sont les versions corrigées qui ont été collées**, jamais celles du livrable : le copy de
  Design portait des cadratins, proscrits par `CLAUDE.md`.
- **Le choix du canal vit dans le domaine**, `packages/core/src/rappel.ts`, et la fonction ne
  renvoie **que le canal, jamais la cause**. C'est délibéré : un appelant qui reçoit la cause
  finit par l'afficher, et un « votre coiffeuse a atteint son quota » la trahirait auprès de sa
  propre cliente. Un test vérifie que les trois causes produisent exactement le même rendu.
- **Le paramètre `plafondAtteint` existe avant la mécanique qui le renseignera** (B7). Le jour où
  le compteur existera, il y aura une ligne à changer dans `lib/rappel.ts` et **aucun texte à
  réécrire**.
- **L'e-mail devient requis sur le canal e-mail**, avec « pour vous prévenir » pour seule
  explication. « Facultatif » ne s'affiche que sur le canal SMS. Sans cette règle, on promettait
  un rappel par e-mail à une cliente qui n'avait pas donné d'e-mail.
- **Trois écrans suivent le canal** : les coordonnées du tunnel, la célébration de confirmation
  et l'attente d'une demande sous réserve, ainsi que la page de suivi par jeton.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Application des deux règles éditoriales de `CLAUDE.md`.

**Écarts au brief :**

- **Le test de bout en bout a refusé le premier commit, et il avait tort.** L'échec ne venait pas
  du code livré mais de mon harnais : Next refuse un second serveur de développement de façon
  **globale, pas par port**, et je traitais « le port 3000 ne répond pas » comme « aucun serveur
  ne tourne ». Le script en lançait alors un second, aussitôt refusé, et attendait soixante
  secondes pour rien. `preparerServeur` laisse maintenant quelques secondes à un serveur en cours
  de démarrage, lit le refus de Next sur sa sortie au lieu d'attendre l'expiration, et se rabat
  sur le serveur existant. `verify` a été lancé deux fois de suite pour le vérifier. Un garde-fou
  instable finit toujours par être ignoré : c'est le risque que D8 nomme, et il a failli se
  réaliser sur un faux positif.
- **Les marques de gabarit sont écrites `{pro}` et non `{Pro}`.** Le livrable utilise la
  majuscule ; c'est un nom de marque, pas du texte, et tous les autres gabarits du deck sont en
  minuscules. La phrase rendue est identique au caractère près. La source ratifiée, elle,
  conserve la forme livrée.
- **L'état vide de la recherche est rendu d'un seul tenant**, et non coupé en titre et
  sous-titre : la chaîne ratifiée est une seule phrase, la scinder reviendrait à la réécrire. Le
  paragraphe qui vivait là, de notre plume, a disparu avec elle.

**Questions ouvertes :**

- **La ligne de la promesse de rappel quitte la section d'arbitrage** : elle est tranchée.
- **Une nouvelle prend sa place**, révélée par le texte ratifié lui-même : il promet de prendre un
  **numéro**, alors que le formulaire de liste d'attente demande une **adresse e-mail**, et que
  `city_waitlist` ne stocke que ça. Le texte vient d'être ratifié, c'est donc la liste d'attente
  qui est à trancher. Non corrigée : collecter un numéro touche au schéma, à l'anti-abus et à la
  restriction de destination D11.

**À recetter par Morgan :**

- **Canal SMS** (offre 2, SMS actifs) : réserver et vérifier les trois textes, dont
  « (facultatif) » sur le champ e-mail.
- **Canal e-mail** : basculer `sms_enabled` à faux dans les réglages, ou passer le compte en
  offre 1, et refaire le parcours. **Les deux doivent donner exactement le même rendu**, et le
  champ e-mail devient obligatoire avec « pour vous prévenir ».
- **La page de suivi** d'une demande sous réserve suit le même canal.
- **La recherche par ville** sur une ville sans pro affiche la phrase ratifiée.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant.

---

## 2026-09-02 Étape : D12 anatomie unique, défauts de la recette 6, D11 SMS de l'essai

**Recette 6 : six passages sur six passés.** Les deux écarts au brief de la livraison 1 sont
ratifiés par Morgan : la barre de navigation à trois entrées, et le prune en bandeau plutôt qu'en
conteneur. Les trois défauts ci-dessous sont des corrections d'usage, pas un refus de livraison.

**Fait :**

- **D12, une seule anatomie à toutes les largeurs.** La barre du haut et la colonne latérale du
  paramétrage ont disparu **partout**, pas seulement en mobile. Bandeau prune en tête, corps sur
  la crème, cartes sur la surface, barre prune en navigation. Ce reliquat n'avait jamais été
  dessiné, et c'est lui qui avait fait marquer deux passages cassés sur un rendu que personne
  n'avait conçu.
- **Sur grand écran, la barre du bas se redresse en colonne à gauche**, et le contenu se centre
  dans une colonne lisible. C'est le choix que D12 ② laissait ouvert : une barre horizontale
  collée en bas d'un écran de 27 pouces est loin de tout, alors qu'une colonne à gauche est là où
  l'œil la cherche. C'est la même barre, avec des classes de largeur, pas un second composant.
- **La déconnexion a suivi.** Elle vivait dans la barre du haut : elle est désormais en fin de
  hub, l'écran du compte, discrète et séparée des réglages par un filet.
- **Défaut 1** : « Paramétrage » atterrissait sur Prestations. Les deux liens fautifs pointent le
  hub, et celui de la barre du haut a disparu avec elle.
- **Défaut 2** : le bouton « + Ajouter une prestation » est retiré du hub. La planche 14c dit que
  le hub résume et ouvre, sans aucune édition directe.
- **Défaut 3** : le formulaire « Nouvelle prestation » ne s'ouvre plus que sur action. Il y avait
  deux affordances d'ajout concurrentes sur le même écran, dont une qui n'attendait aucun geste.
  Il n'en reste qu'une, et c'est elle qui commande l'ouverture. Sur une liste vide, elle prend la
  forme du bouton framboise de la planche 14d ; sinon, celle du bouton en pointillés.
- **D11 ②** : `TRIAL_SMS_QUOTA` avait déjà été supprimée à l'étape précédente. Le commentaire de
  `tiers.ts` dit maintenant que c'est **la décision** de D11 et non un effet de bord : l'essai est
  un palier 2 sans exception, et une constante d'essai qui vaudrait la même chose que le palier
  serait une occasion de divergence future.
- **D11 ④, la restriction de destination**, au même endroit que les trois compteurs
  anti-pompage, et éprouvée **avant** eux : refuser sans avoir rien compté évite qu'un fraudeur
  consomme nos compteurs avec des numéros qui ne partiront jamais. La règle vit dans le domaine,
  `packages/core/src/telephone.ts`, avec quatre tests : une règle de sécurité qu'on peut exécuter
  est une règle qu'on peut prouver.
- **Une seule normalisation de numéro**, celle du domaine. Celle de `lib/sms/codes.ts` a été
  retirée : deux normalisations qui divergent laisseraient un numéro compté d'un côté et envoyé
  de l'autre.
- **`npm run vues`** repose la barre en flux le temps de la capture. Elle s'imprimait au travers
  du contenu sur les images de page entière, et la recette se fait désormais sur ces images.

**Schéma :** aucun.

**Décisions :** application de D11 et D12. Aucune nouvelle.

**Écarts au brief :**

- **La barre latérale sur grand écran est un choix, pas une lecture de planche.** Le board ne
  contient aucune planche bureau, D12 ② l'autorisait sans l'imposer. Je l'ai fait, et je le dis
  comme demandé. Réversible en une classe si la barre horizontale est préférée.
- **Les DOM sont ouverts, les collectivités d'outre-mer ne le sont pas.** D11 écrit « France
  métropolitaine et DOM » : la Nouvelle-Calédonie, la Polynésie et Wallis sont hors du plan de
  numérotation français et restent fermées. Un test le fixe, pour que ce ne soit pas un oubli.
- **L'agenda B10 n'a pas été touché**, conformément à l'exception réservée à la livraison 3. Il
  hérite malgré lui de l'anatomie unique, puisque le cadre est partagé : sa vue semaine sur une
  colonne étroite reste à traiter avec la livraison 3.

**Questions ouvertes :** la ligne de la promesse de rappel reste ouverte dans la section
d'arbitrage. Celle de l'essai tout compris est **fermée par D11** et retirée.

**À recetter par Morgan**, sur `captures/` :

- **Le hub** ne porte plus aucun bouton d'ajout, et « Se déconnecter » est en fin de page.
- **Prestations** : une seule affordance d'ajout, le formulaire fermé au chargement, qui s'ouvre
  au clic et se referme sur « Annuler ».
- **En grand écran** : la barre à gauche, le contenu centré, plus aucune barre en haut ni de
  colonne d'onglets.
- **La restriction de destination** : saisir un numéro étranger à la vérification du téléphone
  doit refuser, en français, sans qu'aucun compteur ne bouge.
- **Les captures** ne portent plus de barre en travers du contenu.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant. D11 et D12 sont
appliquées ; l'exception d'agenda de D12 ⑤ reste ouverte pour la livraison 3.

---

## 2026-09-02 Étape : livraison 1, les quatre écrans du paramétrage (14c, 14d, 14f, 14g)

**Fait :**

- **Deux règles éditoriales inscrites dans `CLAUDE.md`**, issues de B7 et valables bien au-delà
  d'elle : un texte destiné à la cliente suit **le canal réellement utilisé, jamais le palier**
  (trois causes, un seul effet visible, donc une seule dimension à écrire) ; et la cliente ne doit
  **jamais pouvoir deviner** que sa coiffeuse est sur une offre moins chère ni qu'une limite a été
  atteinte. Le texte dit comment elle sera prévenue, jamais pourquoi.
- **L'anatomie des planches remplace celle du lot 1 bis.** Le prune n'est plus un conteneur : la
  planche 14a montre un **bandeau prune en tête** (lien de retour, statement Fraunces à gauche),
  un corps sur la crème, des cartes sur la surface, et une **barre de navigation prune en bas**.
  Le ratio de 8a est tenu par ce duo de masses pleines, la crème étant la respiration entre
  elles. `EnteteEcran` et `CarteEcran` remplacent `PanneauPlein`, `CarteCreme`, `LigneEtat` et
  `Pastille`, retirés faute d'usage.
- **14c, le hub** : une rangée par section, qui **résume et ouvre**, sans aucune édition directe.
  « 2 prestations / de 45 € à 75 € », les communes en clair puis « + N communes » au-delà de
  trois, jamais d'ellipsis sur un nom de commune. Les congés n'apparaissent qu'une fois les
  horaires posés. L'état vide invite et **n'affiche aucun zéro**.
- **14d, prestations** : le prix en Fraunces, hors du bloc de texte et `shrink-0`, donc il ne
  descend jamais à la ligne ; le libellé à deux lignes maximum ; « 45 min · visible » et
  « masquée de ta page » à 55 % d'opacité.
- **14f et 14g** : bandeau, statement révisé « Bientôt en vacances ? » pour les congés, et
  « Ce que voient tes clientes. » pour Ma Page.
- **La barre du haut disparaît en 390** : la planche n'en montre aucune. Elle reste sur grand
  écran (12a). La barre d'onglets du paramétrage disparaît aussi : le hub EST la navigation, deux
  navigations concurrentes pour cinq écrans n'ont pas de sens.
- **`npm run vues` capture désormais en 390**, la largeur de référence de la spécification.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Application des planches 14a, 14c, 14d, 14f, 14g.

**Écarts au brief :**

- **La barre de navigation du bas porte trois entrées, pas quatre.** La planche en montre quatre,
  dont « Clientes ». La fiche cliente est spécifiée en 16c, livraison 3 : une entrée qui ne mène
  nulle part serait pire que son absence. À compléter avec la livraison 3.
- **Le cadre 14a n'était pas « déjà appliqué »**, contrairement à ce que la consigne indiquait.
  Le lot 1 bis avait déduit d'un board d'univers un prune conteneur ; les planches montrent un
  prune en bandeau plus une nav. J'ai suivi les planches, la consigne disant que la réponse y est.
- **Le chevauchement de l'en-tête en mobile**, signalé le 02/09 et non assigné, disparaît avec ce
  changement : la barre du haut n'existe plus à cette largeur.
- **Les variantes de la promesse de rappel n'ont pas été écrites**, conformément à la consigne.
  La ligne d'arbitrage du journal reste ouverte.
- **Une gêne de lecture des captures** : `npm run vues` photographie la page entière, et la barre
  de navigation, fixée au bas de l'écran, s'y imprime au milieu de l'image. Ce n'est pas un défaut
  du produit, c'est un artefact de capture. À corriger si la relecture en souffre.

**Questions ouvertes :** les deux lignes de la section d'arbitrage restent ouvertes, l'essai tout
compris et la promesse de rappel. Aucune nouvelle.

**À recetter par Morgan**, board ouvert à côté, `npm run vues` puis `captures/` :

- **14c** : le hub avec un compte fourni et un compte vide. Aucun zéro dans l'état vide, les
  congés absents au jour un, « Ma Page » qui ne s'ouvre qu'après les trois étapes.
- **14d** : une prestation au libellé très long, pour vérifier que le prix ne descend pas à la
  ligne et que le nom s'arrête à deux lignes. Une prestation masquée doit rester lisible.
- **14f et 14g** : les statements, et le bouton de mise en ligne désactivé tant qu'il manque une
  étape ou une vérification.
- **La navigation du bas** : trois entrées, celle de l'écran courant en miel.
- **En grand écran** : la barre du haut et la colonne du paramétrage doivent réapparaître.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant. Livraison 1 de la
spécification appliquée sur ses cinq écrans, 14b compris.

---

## 2026-09-02 Étape : D9 authentification du pro, A8 forfait de déplacement de base

Livraison 1 de la spécification de Claude Design, planches 14a à 14g.

**Fait :**

- **Le plafond anti-pompage, écrit AVANT la première ligne de vérification**, comme la décision
  l'exige. Trois compteurs, parce qu'un seul se contourne : par numéro (3 par heure, 6 par jour),
  par appelant (5 et 15), et un **coupe-circuit global** à 400 SMS par jour, qui borne la casse
  d'une journée de pompage à une vingtaine d'euros même si un réseau de machines passe sous les
  deux premiers. Le tout sur `rate_limits` et `consommer_quota()`, plus le piège anti-robot de la
  migration 0005 sur les deux formulaires atteignables sans être connecté.
- **Le numéro n'est jamais journalisé ni posé en clair dans une clé de quota** : seule son
  empreinte salée sert de compteur. Et le code n'est jamais stocké en clair : une fuite de
  `phone_verifications` ne doit pas permettre de prendre un compte.
- **Les cinq écrans du côté pro de 14b** : inscription (« Bienvenue chez Wiggy. », 8 caractères
  comme la spécification, contre 10 auparavant), connexion (« Te revoilà. » et le lien d'oubli),
  vérification du téléphone, vérification de l'e-mail, mot de passe oublié.
- **La récupération passe par le téléphone vérifié, jamais par un lien e-mail** : une boîte
  compromise ne doit pas suffire à prendre un compte. Le trou signalé le 31/08, l'absence totale
  de récupération, se referme sans chantier dédié.
- **La mise en ligne de la page est désactivée** tant que l'e-mail et le téléphone ne sont pas
  vérifiés, et **la rangée d'invite apparaît dans le hub**, en nommant ce qui manque plutôt qu'en
  disant « incomplet ».
- **A8** : le forfait de déplacement de base, sur la ligne `from_km = 0` de `distance_fees`.
  **La table perd sa lecture publique** (migration 0009), la politique et le droit retirés
  ensemble. Matrice d'accès régénérée.
- **Trois tests de base** prouvent ce qui compte : le forfait est illisible pour une visiteuse et
  lisible par sa pro, la table des codes est verrouillée pour la visiteuse comme pour le pro, et
  la mémoire du numéro vérifié existe des deux côtés.
- **La spécification devient une source ratifiée du copy deck**, au même titre que le board :
  242 chaînes extraites dans `packages/copy/source/spec-14.json`. Le test qui refuse les textes
  inventés les accepte donc, et continue de refuser le reste.

**Schéma :** migration `0009_auth_et_forfait.sql`, **EN ATTENTE d'application par Morgan**.

**Décisions :** application de D9 et A8. Aucune nouvelle.

**Écarts au brief :**

- **Aucun SMS ne part réellement** : B7 n'est pas construit et aucun fournisseur n'est branché.
  L'interface existe, et **en développement seulement** le code s'affiche à l'écran, sinon la
  vérification du téléphone serait irrecettable. La garde est en liste blanche : une variable
  absente ferme le passage.
- **Ceci ne contredit pas le principe n°1.** « Aucun envoi automatique de SMS sans validation du
  pro » protège les clientes des envois décidés par l'app. Un code de vérification est demandé
  par la personne qui le reçoit, pour elle-même.
- **La récupération ne révèle jamais si un compte existe** : adresse inconnue, compte sans
  téléphone vérifié et compte valide reçoivent la même réponse. Dire « ce compte n'a pas de
  téléphone vérifié » ferait de cet écran un annuaire des comptes Wiggy.
- **Le mot de passe passe de 10 à 8 caractères**, la spécification faisant foi pour les écrans.
  C'est un assouplissement, je le signale plutôt que de le glisser.
- **Trois choses non construites, délibérément** : la vérification du numéro de la cliente,
  l'écran de proposition du forfait par la pro, et l'écran de confirmation par la cliente. Elles
  vivent dans le tunnel ou dans l'agenda, donc en livraisons 2 et 3. La structure les attend :
  `clients.phone_verified_at` existe déjà, et `phone_verifications.pro_id` est nullable pour
  porter une vérification sans compte.
- **Un commentaire faux corrigé au passage** dans `lib/quota.ts` : il affirmait que `anon` peut
  insérer dans `city_waitlist` via PostgREST, ce que la décision verrouillée interdit
  précisément. Il aurait fait croire à une faille inexistante, ou pire, servi d'argument pour en
  ouvrir une.

**Questions ouvertes :**

- **Le fournisseur SMS** reste à choisir (B7). Tant qu'il manque, la vérification du téléphone ne
  se recette qu'en développement.
- **Le sender ID des SMS** reste ouvert depuis le 30/08.

**À recetter par Morgan**, après avoir collé la migration 0009 :

- **Inscription** : créer un compte, vérifier qu'on arrive sur la vérification du téléphone.
- **Téléphone** : saisir un numéro, lire le code dans le bandeau abricot de développement, le
  saisir. Un code faux, puis un code expiré, doivent donner deux messages différents.
- **Le plafond** : demander quatre codes de suite pour le même numéro. Le quatrième doit être
  refusé, en français, sans que rien ne parte.
- **La mise en ligne** : tant que l'e-mail n'est pas vérifié, elle doit refuser en nommant ce qui
  manque. La rangée d'invite doit être en tête du hub.
- **A8** : poser un forfait de base sur l'écran de zone, puis vérifier qu'il **n'apparaît nulle
  part** sur la page publique.
- `npm run vues` régénère les captures avec les nouveaux écrans.

**Statut à reporter dans la roadmap :** `D9` et `A8` sont mises en œuvre sur leur périmètre de
livraison 1. `A8` reste en cours : ses deux autres pièces, la proposition et la confirmation,
sont en livraisons 2 et 3.

---

## 2026-09-02 Étape : `npm run vues`, captures d'écran et contrôle de contraste

Lot 2 gelé jusqu'à la spécification de Claude Design. Seule chose construite pendant ce gel.

**Fait :**

- **`npm run vues`** ouvre chaque écran dans chaque état et dépose une capture dans `captures/`.
  **22 vues** : les cinq écrans de paramétrage en état fourni ET en état vide, l'agenda, la
  tournée, l'accueil pro, la galerie, le site, et les quatre étapes du tunnel cliente. Rendu en
  430 px de large, le mobile étant l'écran de vérité du produit.
- **Le contrôle de contraste** mesure, dans la page, la couleur réellement appliquée sur le fond
  réellement vu, en remontant les ancêtres jusqu'au premier fond opaque, transparences
  composées. C'est ce qu'aucune autre étape de `verify` ne sait faire : le typage voit des
  classes, le lint voit du code, les tests voient des fonctions.
- **Branché dans `npm run verify`** : un texte illisible arrête la livraison.
- **Preuve que le filet mord** : la couleur de texte du bloc prune a été volontairement laissée
  hériter dans la carte crème. Le contrôle a signalé **1,12:1, blanc cassé sur crème**, et même
  **1:1, blanc sur blanc**, avec l'écran, la balise, le texte, les deux couleurs et la taille.
  Sortie en échec. Le défaut décrit dans la consigne est exactement celui qu'il attrape.
- **Le harnais de serveur est sorti** dans `scripts/serveur-dev.mjs`, partagé avec le test de
  bout en bout : deux implémentations de la même chose auraient fini par diverger.
- Deux comptes de test semés puis **effacés en fin de parcours, même en cas d'échec**. La
  connexion passe par le vrai formulaire, pas par un raccourci : c'est le chemin d'une pro.

**Schéma :** aucun.

**Décisions :** aucune nouvelle.

**Écarts au brief :**

- **Deux seuils, pas un.** Bloquant à 3,0 pour le texte courant et 2,0 pour le grand texte,
  c'est-à-dire l'illisible. Avertissement, non bloquant, au niveau AA (4,5 et 3,0). Faire échouer
  au niveau AA aurait bloqué sur des jetons ratifiés, `texte-attenue` sur crème mesure 3,46:1, et
  un garde-fou qui échoue pour rien est ignoré au bout de trois fois. **Relever la barre au
  niveau AA est une décision de design, pas une décision de qui code.** Quinze textes sont
  actuellement signalés en avertissement, tous des placeholders en `texte-attenue`.
- **La correction de la couleur héritée du bloc prune n'a pas été touchée**, conformément au gel.
  Elle est déjà neutralisée par `text-texte-principal` sur la carte crème ; c'est en la retirant
  volontairement que le contrôle a été éprouvé.

**Questions ouvertes :**

- **Défaut trouvé par la première capture, non corrigé** : en 430 px, l'en-tête de l'espace pro
  se chevauche. « Ma tournée » passe sur le mot-symbole et la barre de navigation du paramétrage
  déborde. Aucun de ces écrans n'a jamais été regardé en mobile, alors que c'est l'écran de
  vérité. Hors lot, signalé plutôt que réparé.
- **Le seuil bloquant** est à trancher par Claude Design en même temps que la spécification.

**À recetter par Morgan :**

- `npm run vues`, puis ouvrir `captures/`. Vingt-deux images à comparer aux planches du board,
  `captures/index.md` donne l'adresse de chacune.
- Vérifier que les deux comptes `zzz-vues-rempli` et `zzz-vues-vide` ne subsistent nulle part
  après coup, ni dans l'agenda ni sur une page publique.
- `npm run vues -- --ouvrir` ouvre le dossier à la fin.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant.

---

## 2026-09-02 Étape : lot 1 bis, la composition du board appliquée

**Fait :**

- **`CLAUDE.md` reformulé.** « Le board est une référence de rendu, jamais un socle de code »
  disait « ne recopie pas son HTML » et a été lu « le board n'est qu'une inspiration ». La règle
  dit maintenant que **le board fait foi pour la composition** : on ne recopie pas son HTML, on
  en respecte la structure, les proportions et le ratio, et en cas d'hésitation la réponse est
  dans le board, pas dans le jugement de qui code. La règle de ratio, la composition asymétrique
  et l'axe WONK y sont chacun une ligne à part, plus une incise en fin de phrase.
- **Le hub « Ton activité »** (planche 10c) existe, à `/app/parametrage`, et devient le point
  d'entrée. Il affiche l'**état réel** des quatre réglages : prestations avec prix et durée à
  droite, communes en pastilles prune, horaires et congés en lignes de résumé, ajouts par boutons
  en pointillés dans le flux. Les écrans d'édition subsistent derrière chaque section.
- **Le bloc pleine couleur ouvre chaque écran de paramétrage**, avec le chiffre que le réglage
  produit, en miel et en WONK sur prune, comme la planche 11d. Tous les chiffres viennent de la
  base : heures par semaine calculées sur les plages réelles, jours de congés bornes comprises,
  nombre de communes, nombre de prestations. Aucun n'est inventé, et un réglage vide affiche
  l'état vide de la planche 7b plutôt qu'un zéro sans contexte.
- **Le ratio est rétabli par la structure, pas par des retouches** : le contenu vient **dans** le
  bloc prune, comme la carte crème de 344 px dans le panneau de 560 px de la planche 11d.
- **Les six remarques de la recette 4** : le champ de saisie assistée passe sur la surface, les
  panneaux ne font plus défiler la page derrière eux (`overscroll-contain`), le champ se vide
  après l'ajout d'une commune, le focus a un traitement unique **en prune** au lieu du framboise
  trop proche de la brique de l'erreur, le message de succès devient un bloc miel plein, et
  l'état désactivé passe sur la crème au lieu d'une simple opacité.
- **Classe `chiffre-heros`** ajoutée aux tokens de la feuille globale, et la règle de
  `design:check` corrigée pour l'autoriser dans l'application tout en gardant `statement` au site.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Application des planches 8a, 10c, 11d et 7b.

**Écarts au brief :**

- **La couleur des étiquettes de section du board n'a pas été reprise.** La planche 10c les pose
  en brun terracotta `#a4552f`, qui n'appartient pas à la palette ratifiée. La planche 8a demande
  précisément de purger les couleurs hors palette du livrable dev : elles utilisent
  `texte-secondaire`. C'est le seul point où le board se contredit lui-même.
- **La carte crème est centrée dans le bloc prune**, ce qui peut se lire comme du tout-centré.
  C'est ce que fait la planche 11d : la carte de 344 px est en `align-self: center` dans le
  panneau. La règle « tout-centré banni » porte sur le statement, qui est bien à gauche.
- **Le premier essai avait le ratio inversé** malgré le bloc prune : posé en frère de la carte
  crème, il ne couvrait qu'un cinquième de l'écran. Vu à l'écran, corrigé par imbrication. Sans
  l'avoir regardé, le lot serait parti avec le défaut qu'il devait corriger.

**Questions ouvertes :**

- **Le système d'avatars dessinés** reste un chantier à part. Les états vides utilisent d'ici là
  un substitut neutre, jamais une illustration improvisée.
- **Les statements des écrans sont de notre plume** : « Ce que tu proposes. », « Où tu te
  déplaces. », « Tes journées de travail. », « Quand tu ne travailles pas. ». Le board donne le
  ton, pas ces phrases. À ratifier.

**À recetter par Morgan**, board ouvert à côté, **sur les écrans réels et non sur la galerie** :

- **`/app/parametrage`** : le hub montre-t-il l'état réel des quatre réglages ? Les pastilles, les
  boutons en pointillés, les prix alignés à droite.
- **Le ratio, à l'œil nu**, sur les cinq écrans : plus de prune que de crème.
- **Un compte vide** : chaque section doit montrer un état vide qui invite, pas un zéro.
- **Le focus au clavier** : un seul contour, prune sur crème, miel sur les blocs pleins, et plus
  aucune confusion possible avec le rouge de l'erreur.
- **La zone** : ajouter une commune doit vider le champ et afficher un bloc miel.
- **Les heures** : faire défiler la liste ne doit plus emporter la page.

**Statut à reporter dans la roadmap :** aucun changement d'identifiant.

---

## 2026-09-02 Étape : lot 1, la trousse de composants

**Fait :**

- **La règle de l'option neutre vit dans le domaine**, `packages/core/src/selection.ts`, et non
  dans un composant : une règle qu'on peut exécuter est une règle qu'on peut prouver. Quatre
  tests la couvrent, dont celui que le cahier des charges exige, une liste sans libellé neutre
  refuse de se construire.
- **Liste déroulante**, **case à cocher**, **sélecteur de date**, **sélecteur d'heure** et
  **saisie assistée (B12)** : cinq composants, tous sur les jetons, zone tactile de 44 px,
  focus visible, aucun contrôle natif restant. Le champ de saisie existant a été aligné sur le
  même rectangle, via un fichier de styles partagé.
- **Branchés sur les cinq écrans de paramétrage**, et sur eux seuls : profil (pronom),
  horaires (jour et deux heures), congés (deux dates), prestations (case « visible »), zone
  (saisie assistée sur la source locale des communes).
- **Galerie** `/app/galerie` : chaque composant dans ses états, vide, rempli, en erreur,
  désactivé, texte long. Aucune donnée réelle. Fermée hors développement par une **liste
  blanche** : seule la valeur `developpement` ouvre la page, une variable absente ou mal
  orthographiée la ferme. Se tromper doit fermer, jamais ouvrir.
- **Un piège de validation refermé au passage** : avec l'option neutre, ne choisir aucun jour
  envoyait la chaîne vide, que `z.coerce.number()` transforme en 0, c'est-à-dire lundi. Une
  plage se serait posée le lundi sans que personne ne l'ait demandé. Refusé désormais, en
  français.

**Schéma :** aucun.

**Décisions :** aucune nouvelle. Application des deux règles de R3-1 et du cahier des charges
du lot 1.

**Écarts au brief :**

- **La carte de rendez-vous, le badge de statut et la visionneuse de photos ne sont pas
  construits.** Leurs écrans arrivent au lot 3 : les faire ici serait du décor sans usage.
- **Un état `desactive` a été ajouté aux composants** bien qu'aucun écran de paramétrage ne
  l'utilise. La galerie exige de montrer cet état, et le montrer supposait qu'il existe.
- **La saisie assistée est passée par une correction non prévue.** Le composant remettait son
  délai à zéro à chaque rendu quand l'appelant passait une fonction en ligne : la recherche ne
  partait jamais, sans la moindre erreur à l'écran. La fonction est désormais tenue dans une
  référence, hors des dépendances de l'effet. Un composant dont la justesse dépend de la
  vigilance de l'appelant marche chez celui qui l'a écrit et meurt en silence ailleurs.
- **Le libellé du sélecteur de date a été raccourci** après l'avoir regardé : « lundi 14
  septembre 2026 » se cassait sur trois lignes dans une colonne de moitié de largeur, ce qui
  est le cas courant. Le jour de la semaine est retiré, le calendrier ouvert le montre déjà.

**Questions ouvertes :**

- **Les libellés neutres restent à ratifier** : « Choisis un jour », « Je préfère ne pas
  préciser », « Choisis dans tes fiches » (celui-ci posé pour le lot 3), ainsi que « Visible sur
  ta page de réservation ». Ils sont déclarés dans `packages/copy/MANQUES.md`.
- **R3-1 n'est pas corrigé sur son propre écran** : l'ajout de rendez-vous appartient au lot 3.
  Les deux règles qu'il porte, elles, sont appliquées dès maintenant et tenues par le composant.

**À recetter par Morgan :**

- **Galerie** : ouvrir `/app/galerie`, parcourir la page **à la touche de tabulation** et
  vérifier que chaque élément montre un contour net. Ouvrir chaque liste, chaque calendrier.
- **Profil** : la liste du pronom s'ouvre sur « Je préfère ne pas préciser », le choix tient
  après enregistrement et rechargement.
- **Horaires** : la liste s'ouvre sur « Choisis un jour ». **Enregistrer sans choisir de jour
  doit être refusé**, et surtout ne pas poser une plage le lundi. Les deux heures se choisissent
  dans une liste au quart d'heure.
- **Congés** : les deux dates s'ouvrent sur un calendrier Wiggy, lundi en première colonne, plus
  aucune surbrillance bleue du navigateur.
- **Prestations** : la case « Visible sur ta page de réservation », cochée par défaut. La
  décocher doit créer une prestation masquée.
- **Zone** : taper « st paul », les résultats arrivent **sans bouton**, dès deux lettres. Le
  choix reste affiché et s'efface d'une croix. Puis « Ajouter à ta zone ».

**Statut à reporter dans la roadmap :** aucun changement d'identifiant. B12 est amorcée, sur sa
seule source locale.

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
