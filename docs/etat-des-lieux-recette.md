# État des lieux avant recette

Écrit le 05/09/2026, à la demande du lot « dernière passe design ». Il dit **ce
qui est recettable, ce qui est fragile, et ce que personne n'a encore regardé**.

Il n'est pas un bilan flatteur : un défaut connu et écrit ne coûte rien pendant
une recette, un défaut connu et tu se découvre au milieu du parcours et casse la
lecture. Tout ce que je sais est ici, y compris ce que j'ai choisi de ne pas
corriger, et pourquoi.

---

## 1. L'état des contrôles

Tous verts au 05/09, sur la chaîne complète (`verify`, plus `db:etat` qui n'y
est pas) :

| Contrôle             | Résultat                                                        |
| -------------------- | --------------------------------------------------------------- |
| `db:check` / `rejeu` | 27 migrations, 32 tables, RLS active partout                    |
| `db:test`            | 36 tests de cloisonnement, 0 échec                              |
| `db:etat`            | **27 appliquées, 0 en attente** sur le projet de développement  |
| `design:check`       | 168 fichiers, aucune violation                                  |
| `archi:check`        | 167 fichiers d'enveloppe, 8 modules portables, tous inventoriés |
| `copy:manques`       | tout texte rédigé hors board est déclaré                        |
| `check`              | format, lint, types, code mort                                  |
| `test`               | 239 tests unitaires, 0 échec                                    |
| `e2e`                | tunnel de réservation complet                                   |
| `pwa:check`          | installable, hors-ligne, purge à la déconnexion, push reçu      |
| `planche:check`      | 19a : 15 bandes, 29 tailles, 8 images, 3 ancres, 11 encres      |
| `vues`               | 33 captures, **aucun texte illisible, aucun bloc invisible**    |

**Aucune migration en attente.** C'est vrai de la base de développement, la
seule que je peux interroger ; la production est un projet distinct, et
`db:etat` dit toujours quelle base il a regardée.

---

## 2. Ce qui est réellement recettable

**Le site public.** C'est la partie la plus solide, et la seule dont la
conformité au dessin soit tenue par un contrôle exécutable. La home a été rendue
et comparée bande par bande à 19a, 19b et 19c. Neuf critères la tiennent
désormais, chacun prouvé par un échec délibéré.

**Le tunnel de réservation cliente.** Parcouru de bout en bout par `npm run e2e`
à chaque commit : page publique → prestation → adresse → créneaux → photos →
coordonnées → confirmation.

**Les cloisonnements.** 36 tests prouvent qu'un pro ne voit rien d'un autre,
qu'une visiteuse n'atteint ni les clientes ni les rendez-vous, que le domicile
de la pro n'est jamais exposé, et que les preuves d'acceptation contractuelle
ne se modifient pas — même par le serveur.

**La PWA.** Installable, la tournée et **les fiches des clientes du jour**
consultables hors-ligne, tout purgé à la déconnexion.

---

## 3. Ce que je sais fragile, et que personne n'a signalé

### 3.1 Le dessin des écrans de l'app n'est tenu par aucun contrôle

**C'est le point le plus important de ce document.**

Il y a **53 planches** dans `Design/planches/`. **Une seule — 19a — est lue par
un contrôle automatique.** 19b et 19c ont été comparées à la main aujourd'hui.
Les cinquante autres n'ont jamais été confrontées à leur écran autrement que par
le regard de qui les a construits, au moment où il les construisait.

Ce n'est pas une négligence ponctuelle, c'est une asymétrie structurelle : les
TEXTES sont exacts parce qu'un script les extrait des planches et qu'un test les
compare ; la COMPOSITION n'a eu son premier contrôle que le 04/09, et il est né
sur la home. Or la classe de défauts qui a coûté le plus cher jusqu'ici est
exactement celle-là — **le code se relit juste et l'écran est faux**.

Pourquoi le contrôle ne s'étend pas tout seul aux écrans de l'app, et ce n'est
pas un contournement mais une limite réelle :

- **la séquence des fonds de bande** (critère ①) est propre à une page à bandes.
  Un écran de travail n'a pas de `[data-bande]` ;
- **la comparaison des tailles et des encres** (⑥ et ⑨) repose sur une
  correspondance de texte EXACTE entre la planche et l'écran. Les écrans de
  l'app sont pilotés par des données semées — prénoms, dates, montants — et
  presque aucun texte de planche n'y a d'équivalent littéral ;
- **l'accès** demande une session authentifiée et deux comptes semés, ce que
  `vues` sait faire et `planche:check` non.

**Ce qui a pu être étendu l'a été.** Le seul critère qui ne dépend d'AUCUNE
planche — un bloc arrondi de la couleur exacte de son fond est invisible —
tourne désormais sur les **33 écrans** que `vues` visite. Il a immédiatement
trouvé deux défauts réels (§5).

### 3.2 « 0 sur 1 faits »

L'en-tête de la tournée affiche `0 sur 1 faits`. Le gabarit du copy deck fige le
pluriel : `{faits} sur {total} faits`. C'est faux dès que le compte vaut 0 ou 1.

**Non corrigé, délibérément.** Le texte vient du board, et le corriger demande
d'introduire une règle d'accord dans le deck — un mécanisme, pas une retouche.
Réécrire du copy board unilatéralement n'est pas à moi de le faire ; c'est une
ligne à trancher avec Design.

### 3.3 La bêta tourne sans SMS

Décision D14, assumée. Les confirmations et rappels partent par e-mail et
notification. Le code SMS existe derrière un adaptateur et n'est pas branché.
Si la recette s'attend à recevoir un SMS, elle attendra pour rien.

### 3.4 La distribution des avatars est une proposition

19a laisse `alt=""` sur quatre images sur huit, et nomme « Sophie »,
« Sandrine », « Awa », « Paul » — dont **un seul, Awa, existe** dans le système
à huit personnages. La correspondance est donc indéterminée. Elle vit dans un
module unique et nommé (`packages/core/src/distribution-avatars.ts`), où les
huit servent une fois chacun et où la règle de composition lève au chargement.
**À trancher par Design**, ou en renommant les témoignages.

### 3.5 Deux manques déclarés côté avatars

- **La variante sans pastille**, sur fond transparent, n'existe pas. Aucun écran
  de 19a n'en a besoin ; je ne l'ai pas simulée en découpant l'image.
- **14g** dit encore « substitut neutre (initiale sur encre 14 %) **en attendant
  le brief illustration** » et porte une affordance « Choisir mon avatar ou ma
  photo » dont **aucune planche ne montre le sélecteur**. Rien n'a donc été
  implémenté hors 19a.

### 3.6 Détails connus, non bloquants

- **Un `#A4552F` résiduel dans 19a**, sur le liseré en tirets du créneau vide de
  « Ta semaine ». Ce n'est pas du texte, donc pas un sujet de contraste ; il est
  rendu avec un jeton de la palette.
- **`.chiffre-heros` n'est employée par aucun écran.** C'est la voie sanctionnée
  par `design:check` pour ouvrir l'axe WONK dans l'app. Réservée, pas morte —
  et ramenée à `--text-display` après avoir servi la home (§5).
- **Les noms commerciaux sont en dur** dans
  `apps/web/src/app/app/abonnement/page.tsx:23`. Signalé lors du nettoyage
  documentaire, délibérément laissé : T4 tient, les codes de palier restent
  `tier_1/2/3` neutres, et c'est le seul endroit d'affichage.
- **Les faux avis** de la home ne peuvent pas atteindre la production : le build
  échoue hors développement. La page reste en `noindex`.

### 3.7 Ce que je ne peux pas vérifier d'ici

**La région d'hébergement Supabase.** Elle ne se lit pas depuis le dépôt ni
depuis l'API. À confirmer dans le tableau de bord : _Project Settings → General
→ Region_. La page publique annonce un hébergement en Union européenne ; tant
que ce n'est pas vérifié, c'est une promesse non tenue par une preuve.

---

## 4. Les écrans construits que personne n'a encore regardés

La roadmap compte **25 lignes en « construit, recette à valider »**, c'est-à-dire
jamais cliquées par Morgan. Les captures existent (`captures/`, régénérées par
`npm run vues`) et sont propres au contraste et aux blocs invisibles, mais
**une capture n'est pas une recette** : elle ne dit rien des parcours, des états
d'erreur, ni de ce qui se passe au deuxième tap.

Les plus lourdes, par ordre de risque décroissant à mon estimation :

1. **B14, le centre de notifications** — la cloche, la matrice de réglages, les
   trois niveaux. Beaucoup de surface, aucun parcours joué de bout en bout.
2. **G3, l'onboarding guidé et l'import de contacts** — un parcours entier,
   vCard et CSV, jamais parcouru par un humain.
3. **A12, le score de cohérence des créneaux** — la logique est couverte par des
   tests, l'EFFET perçu (quels créneaux remontent, dans quel ordre) ne l'est pas.
4. **C4/C5/C7, le copilote de tournée** — dépend de trajets réels et d'un
   déroulé dans le temps, que ni les tests ni les captures ne reproduisent.
5. **B5/B6, la clôture et l'apprentissage des durées** — D15 interdit toute
   clôture automatique ; le comportement se juge sur plusieurs jours.

---

## 5. Ce que ce lot a corrigé

- **Le prune à 55 % de la planche se lit `texte-attenue` (65 %)**, et le 55 %
  est refusé sur la page. C'est une RÈGLE dans `planche:check`, pas une retouche :
  elle survit à la prochaine réextraction. Quatre libellés des vignettes étaient
  à 72 %, ce qui passait AA mais aplatissait deux niveaux d'atténuation en un.
- **L'échelle du site est entrée dans les jetons ratifiés** sous ses propres noms
  (`typoSite` → classes `site-*`). La table locale au pied de la page a disparu.
  `design:check` refuse désormais ces jetons et ces classes dans l'espace pro.
- **`.chiffre-heros` est revenue à `--text-display`.** Je l'avais montée à 120 px
  pour la home ; le site a maintenant sa propre échelle, et la laisser à 120
  aurait donné une taille de page de vente au premier écran de travail qui s'en
  serait servi.
- **La grille de prix mobile a été refaite sur 19b** : noms en pastilles prune,
  bouton prune et non miel, prix à 50 px fixes. Elle n'avait jamais été comparée
  à sa planche.
- **La timeline de tournée en 390 (19c) a été implémentée.** Elle n'existait pas :
  le mobile servait le traitement large.
- **Deux blocs invisibles dans l'app**, trouvés par le critère nouvellement étendu
  à tous les écrans : la note « Rien de tout ça n'est obligatoire » de l'import
  était crème sur crème, et **l'avatar de l'en-tête d'écran pouvait être prune sur
  prune** — invisible pour les seules pros dont le prénom tombe sur cette
  couleur, donc invisible en développement.

---

## 6. Ce qui reste ouvert pour Morgan

1. **La distribution des avatars** (§3.4) — Design tranche, ou on renomme.
2. **Le sélecteur d'avatar de 14g** (§3.5) — planche manquante.
3. **« 0 sur 1 faits »** (§3.2) — accord à trancher avec Design.
4. **La région Supabase** (§3.7) — à lire dans le tableau de bord.
5. **Étendre `planche:check` aux écrans de l'app** (§3.1) — la limite est réelle
   et décrite ; la lever est un chantier, pas une ligne, et il attend l'après-recette.
