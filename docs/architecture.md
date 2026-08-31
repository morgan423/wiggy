# Wiggy : proposition d'architecture (livrable D3)

> À valider avant la Phase 1. Répond à la contrainte D3 : trois surfaces, un backend unique.

## Les trois surfaces

| Surface            | Techno proposée                         | Ce qu'elle porte                                                                                                                         |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **App mobile pro** | **Expo / React Native** (iOS + Android) | Le terrain : C0 tournée, C1 Live Activity, C2-C6 copilote, C7 reprise du RDV, C8 hors-ligne, B6 clôture, G3 contacts, G6 photo du carnet |
| **Webapp pro**     | **Next.js**, derrière authentification  | La gestion du soir sur grand écran : B10 agenda complet, B1-B3 fiches, B11 paramétrage, E1-E2 stats, G1 facturation                      |
| **Web cliente**    | **Next.js**, public, rendu serveur      | A1 page publique, A2 SEO, A3 créneaux, A4 photos, A9 recherche + liste d'attente, A10 annulation                                         |

Web cliente et webapp pro partagent la même application Next (`apps/web`), séparées par
groupes de routes : le public est rendu côté serveur pour le SEO (A2, moteur d'acquisition),
l'espace pro est derrière session.

## Pourquoi Expo pour le mobile

Les trois voies possibles, jugées sur la seule contrainte qui tranche : C1, le
différenciateur visible de l'offre 2 :

- **Natif pur (Swift + Kotlin)** : meilleure fidélité, mais deux codebases à écrire et
  maintenir, aucune mutualisation, et un délai qui décale mécaniquement la bêta 5 pros (J1).
- **Capacitor / PWA enveloppée** : le moins cher, mais les Live Activities iOS ne sont pas
  accessibles proprement : C1 serait dégradé ou abandonné. Éliminatoire.
- **Expo / React Native** _(retenu)_ : un seul code TypeScript pour iOS et Android, accès
  natif aux contacts (G3), à l'appareil photo (G6) et à SQLite (C8 hors-ligne). La Live
  Activity demande une extension widget Swift intégrée au projet : **c'est la seule brique
  native à écrire et à maintenir**, et elle est bornée à un écran.

## Ce qui est mutualisé, et ce qui ne l'est pas

Le prompt demande de mutualiser « si le framework le permet ». Il le permet : pour la
logique, pas pour les pixels.

```
packages/core      règles métier pures, sans dépendance runtime :
                   gating par palier, conditions de paiement (S1), normalisation
                   des communes, calcul des créneaux. Testé une seule fois.
packages/api       accès aux données typé + schémas de validation Zod partagés
                   (à créer en Phase 1 avec le socle).
apps/pro           présentation mobile (React Native)
apps/web           présentation web (React DOM), public + espace pro
```

**La présentation n'est délibérément pas partagée.** `react-native-web` permettrait
d'écrire un seul rendu, mais les deux surfaces font deux métiers opposés : le mobile se
tient à une main, en mouvement, hors-ligne ; la webapp affiche un agenda semaine dense avec
déplacement de RDV par glisser (B10). Mutualiser le rendu coûterait plus cher que les deux
rendus séparés, et dégraderait les deux. Ce qui compte (les règles) l'est déjà.

## Backend

**Supabase (Postgres + Auth + Storage), région UE.** Un seul modèle de données pour les
trois surfaces. La RLS fait porter le cloisonnement par la base et pas seulement par le
code : `npm run db:check` échoue si une table sort sans RLS. RGPD standard, pas de HDS
(aucune donnée de santé : les annotations techniques B2 restent métier).

Les écritures venant de la cliente (réservation, annulation, liste d'attente) passent
toujours par une route serveur qui revalide disponibilité, zone et tarif. Aucune insertion
directe depuis un navigateur.

## Trajets : une abstraction, deux implémentations

Exigence explicite du prompt. Une interface unique côté application :

```ts
type MoteurTrajets = {
  duree(depart: Point, arrivee: Point, quand: Date): Promise<Minutes>
  matrice(points: Point[], quand: Date): Promise<Minutes[][]>
}
```

- **Au départ** : Google Distance Matrix, avec cache agressif : la clientèle est
  récurrente, donc les mêmes adresses reviennent (§3.2 : ~1 €/utilisatrice à 100 comptes).
- **À l'échelle** : bascule OSRM auto-hébergé, prévue au plan financier (§3.2 : ~0,20 € à
  1 500 comptes). La bascule ne doit toucher qu'une implémentation, jamais un écran.
- **Cas dégradés** à traiter dès la construction, pas en Phase 5 : adresse introuvable,
  zone rurale sans données de trafic, cliente en déplacement (A5).

## Paiement

**Stripe Billing** pour l'abonnement (G1, 3 paliers, essai 30 j, dunning, factures PDF) et
**Stripe Connect** pour les prestations (B9, D1 déjà tranché). SumUp reste hors périmètre
technique : cohabitation documentée pour l'encaissement sur place.

## Hébergement : tranché

**Supabase région UE + Vercel région CDG**, DPA signés avec les deux (validé le 30/08).
Données et exécution en UE, conforme au RGPD standard. Réserve assumée et consignée : les
deux sociétés sont de droit américain : ce choix ne répond pas à une exigence de
souveraineté stricte, il n'a pas été pris par défaut mais en connaissance de cause.

## Statut

Proposition **validée le 30/08** : trois surfaces, Expo pour le mobile, logique partagée et
rendus séparés, Supabase UE + Vercel CDG. La Phase 1 peut commencer.
