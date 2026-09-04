# D3 — ce qui vit encore dans une enveloppe

Décision D3, tranchée le 03/09 : **un seul produit logique, deux enveloppes**. La logique
métier, le copy et les jetons vivent dans `packages/core`, `packages/api`, `packages/copy` et
`packages/tokens`. Une enveloppe (`apps/web`, `apps/pro`) ne porte que le rendu et les
capacités de sa plateforme.

Ce fichier est lu par `npm run archi:check`, qui **échoue sur tout module portable qui n'y
figure pas**. L'inventaire ne peut donc que se réduire : ajouter une ligne est un geste
délibéré, qui demande un motif écrit.

Le critère du contrôle est mécanique : un module est **portable** si tout ce qu'il importe est
portable, c'est-à-dire un package `@wiggy/*`, un module natif de Node, ou un autre module
portable de la même enveloppe. Un module portable tournerait tel quel dans React Native.

## Dette : à déplacer

- `apps/web/src/lib/avis-placeholder.ts` : les trois faux témoignages de la planche 19a et la
  garde qui les empêche d'atteindre la production. **Cette ligne est destinée à disparaître, pas
  à être déplacée** : le jour où A7 aura collecté de vrais avis auprès des bêta-testeuses, la
  section de la home les lira et ce module sera supprimé avec son appel. Il est resté dans
  l'enveloppe parce que la home est une page du web et n'existera jamais dans l'app native. C'est
  le seul module de cet inventaire dont la réduction se fera par suppression.

- `apps/web/src/lib/forms.ts` — l'état commun des formulaires (`EtatForm`, `ok`, `erreur`,
  `champ`). La forme d'un résultat de formulaire ne doit rien à Next : les deux enveloppes en
  auront besoin, et l'app native devra présenter les mêmes erreurs. À déplacer dans
  `packages/core` quand un écran natif existera pour le prouver, pas avant : déplacer sans
  second appelant, c'est deviner l'interface.

## Écarts justifiés : la place est bonne

Le contrôle les voit portables parce qu'ils n'importent aucune plateforme. Ils appartiennent
pourtant bien à cette enveloppe, et les déplacer serait une erreur.

- `apps/web/src/components/trousse/styles.ts` — des classes Tailwind. C'est le vocabulaire de
  rendu du web, que React Native n'emploie pas. Les **valeurs** viennent des jetons, elles, et
  c'est là qu'est la décision partagée. Le fichier n'exprime que la façon de la dire en CSS.
- `apps/web/src/lib/trajets/google.ts` — client de la Routes API de Google.
- `apps/web/src/lib/lieux/index.ts` — client de la Places API.
- `apps/web/src/lib/sms/index.ts` — le SMS de vérification, écrit et confié à l'adaptateur.
- `apps/web/src/lib/messagerie/brevo.ts` — l'adaptateur du fournisseur de SMS et d'e-mails.
- `apps/web/src/lib/messagerie/index.ts` — le choix du fournisseur, et les gardes de destination.

  **L'interface, elle, est bien dans le cœur** (`packages/core/src/messagerie.ts`, `Messagerie`),
  comme G4 l'exige : c'est elle qui rend la bascule de fournisseur possible en une journée. Ce
  qui reste ici, c'est l'ADAPTATEUR et le choix, qui portent la clé serveur. Les mettre dans un
  package que le mobile embarquerait ferait voyager cette clé jusque dans un bundle : ce serait
  l'inverse de la sécurité qu'on cherche.

  Ces trois-là sont l'**infrastructure serveur** de l'hôte d'API. `apps/web` n'est pas seulement
  une enveloppe : c'est aussi le backend des trois surfaces (roadmap, §Structure). Les clés ne
  quittent jamais le serveur, et l'app native passera par nos routes, jamais par Google en
  direct. Les déplacer dans un package commun ferait voyager des clés serveur vers un bundle
  mobile : ce serait l'inverse de la sécurité qu'on cherche.
