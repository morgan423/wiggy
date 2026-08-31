# Copy deck : ce que le board ne couvre pas

Le micro-copy du board phase 2 est du contenu ratifié : les écrans le reprennent
depuis `ecrans/*.json`, ils ne le réinventent pas. Ce document liste ce que le
board ne fournit pas, pour que ces textes soient **écrits** plutôt que remplis
par l'improvisation au moment de coder.

Vérification : `node scripts/copy-manques.mjs`.

## Écrans sans aucun copy dans le board

| Écran                                        | Ce qu'il faut écrire                                                                                                                 | Urgence                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Connexion / inscription pro**              | Titres, libellés de champs, messages d'erreur d'authentification, message de confirmation d'e-mail. Registre pro.                    | Construit avec des textes provisoires : à ratifier.                                                  |
| **A9 recherche par ville + liste d'attente** | Champ ville, résultats, état « pas encore de coiffeur ici », promesse de notification, confirmation d'inscription. Registre cliente. | Construit avec des textes provisoires : à ratifier. Réutilisé au refus d'une demande hors zone (A6). |
| **A7 avis**                                  | Demande d'avis post-prestation (SMS et écran), formulaire, affichage, modération. Deux registres.                                    | Avant A7.                                                                                            |
| **B4 blocage de créneaux**                   | Libellés de l'action, confirmation, affichage d'une plage bloquée. Registre pro.                                                     | Avant B4.                                                                                            |
| **G1 abonnement dans l'app**                 | Choix du palier, essai restant, échec de paiement (dunning), résiliation en deux taps, factures. Registre pro.                       | Avant G1 : ce sont des textes sensibles, contractuels et commerciaux.                                |
| **G5 export et suppression de compte**       | Export CSV, suppression, délais RGPD, confirmation irréversible. Registre pro.                                                       | Avant G5.                                                                                            |
| **F3 back office administrateur**            | Console interne. Registre neutre, pas de registre produit.                                                                           | Faible : usage interne.                                                                              |

## Écrans couverts partiellement

Le board donne l'intention et quelques chaînes, mais pas tous les états
(chargement, erreur, cas limites) :

- **A6 hors-zone « sous réserve »** : traité. Le board fournissait le badge,
  l'attente et les deux boutons du pro (bloc 9b) ; l'avertissement, la
  formulation du refus et le parcours de séjour ont été dictés ou rédigés.
- **A10 annulation et report** : le parcours cliente est couvert, pas les
  confirmations ni le cas « hors délai, acompte conservé ».
- **B7 forfait SMS** : l'alerte d'approche du forfait existe, pas le message de
  dépassement ni celui de l'option désactivée.
- **F1 assistant de support** : le mot « aide » apparaît, rien de plus.

## Textes que nous avons rédigés faute de source

Ils sont regroupés sous la clé `$aEcrire` de chaque écran, jamais mélangés au
contenu ratifié.

### Relus et tranchés le 31/08

Le parcours d'adresse est entièrement de notre plume : le board montre la
réservation avec une adresse déjà connue, il ne traite ni la saisie, ni le cas
« adresse non reconnue ». C'est pourtant un moment décisif du tunnel.

| Clé                                                    | Verdict                                                  |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `reservation-cliente.$aEcrire.prestationsTitre`        | Réécrit : « Ce que {pro} propose ».                      |
| `reservation-cliente.$aEcrire.zoneIntervention`        | Validé : « Se déplace à ».                               |
| `reservation-cliente.$aEcrire.adresseTitre`            | Validé : « Où venir vous coiffer ? ».                    |
| `reservation-cliente.$aEcrire.adresseAide`             | Réécrit, sans le jargon interne de la tournée.           |
| `reservation-cliente.$aEcrire.adresseIntrouvable`      | Validé.                                                  |
| `reservation-cliente.$aEcrire.adressePreciser`         | Validé.                                                  |
| `reservation-cliente.$aEcrire.adresseAucuneSuggestion` | Validé.                                                  |
| `reservation-cliente.$aEcrire.coordonneesTitre`        | Validé, avec un sous-titre.                              |
| `reservation-cliente.$aEcrire.coordonneesAide`         | Ajouté : « Pour vous confirmer le rendez-vous par SMS. » |

`choisirPrestation` a été supprimé : l'écran reprend la ligne ratifiée du
board, « Que souhaitez-vous réserver ? ».

### A5 et A6, écrits à la construction de l'écran

Les trois textes centraux (avertissement hors zone, attente, refus) ont été
dictés lors de la relecture. Le reste du parcours de séjour reste à relire.

| Clé                                                      | Statut                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `reservation-cliente.$aEcrire.horsZoneTitre`             | Dicté le 31/08.                                                                             |
| `reservation-cliente.$aEcrire.horsZoneDemande`           | Dicté le 31/08, accord elle/il selon `pros.pronoun`.                                        |
| `reservation-cliente.$aEcrire.horsZoneDemandeSansPronom` | Variante neutre, quand le pro n'a pas précisé. À relire.                                    |
| `reservation-cliente.$aEcrire.demandeRefusee`            | Dicté le 31/08, enchaîne sur la liste d'attente A9.                                         |
| `reservation-cliente.$aEcrire.sejourTitre`               | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourAide`                | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourAdresseConnue`       | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourHotel`               | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourHotelAide`           | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourDu`                  | À relire.                                                                                   |
| `reservation-cliente.$aEcrire.sejourAu`                  | À relire.                                                                                   |
| `demandes-pro.$aEcrire.titre`                            | À relire.                                                                                   |
| `demandes-pro.$aEcrire.horsZoneRepere`                   | À relire : variante du gabarit du board, quand la journée n'a pas de rendez-vous précédent. |
| `demandes-pro.$aEcrire.sejour`                           | À relire.                                                                                   |
| `demandes-pro.$aEcrire.prevenir`                         | À relire. Disparaîtra avec B7, quand le SMS partira vraiment.                               |

### A4 photos, et C0

| Clé                                                 | Statut                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `reservation-cliente.$aEcrire.photosTitre`          | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosAide`           | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosActuelles`      | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosInspirations`   | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosFormats`        | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosTropNombreuses` | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosTropLourde`     | À relire.                                                                     |
| `reservation-cliente.$aEcrire.photosFormat`         | À relire.                                                                     |
| `agenda-tournee.$aEcrire.aVenir`                    | À relire : le board donne « En cours » et « Terminé », pas le troisième état. |
| `agenda-tournee.$aEcrire.photosCliente`             | À relire.                                                                     |
| `agenda-tournee.$aEcrire.sansAdresse`               | À relire.                                                                     |

### Corrections du 31/08 : étape photos, messages de validation

Deux blocs entiers rédigés hors board, à relire ensemble plutôt qu'un par un.

Les **messages de validation** (`validation.$aEcrire.*`) sont volontairement
impersonnels : le même message sert au tutoiement côté pro et au vouvoiement
côté cliente. Seules les clés préfixées « pro » n'apparaissent que sur des
écrans pro et gardent le tutoiement. Aucun ne vient du board, qui ne traite pas
les erreurs de saisie.

L'**étape photos** (`reservation-cliente.$aEcrire.photos*`) est un écran neuf :
le board montrait le dépôt de photos dans le formulaire de coordonnées, la
correction du bloquant B1 en a fait une étape à part entière, avec son bouton
de téléversement.

| Clé                                            | Texte                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `reservation-cliente.$aEcrire.photosPerdues`   | « Votre rendez-vous est bien pris, mais une photo n’a pas pu être jointe. »                              |
| `reservation-cliente.$aEcrire.photosEtape`     | « Des photos, si vous voulez »                                                                           |
| `reservation-cliente.$aEcrire.photosBouton`    | « Ajouter mes photos »                                                                                   |
| `reservation-cliente.$aEcrire.photosPasser`    | « Continuer sans photo »                                                                                 |
| `reservation-cliente.$aEcrire.photosEnvoi`     | « Envoi en cours… »                                                                                      |
| `reservation-cliente.$aEcrire.photosEchec`     | « L’envoi n’a pas abouti. Réessayez, ou continuez sans photo. »                                          |
| `reservation-cliente.$aEcrire.photosAideEtape` | « Vos cheveux aujourd’hui et ce dont vous rêvez : {pro} prépare mieux, et prévoit le temps qu’il faut. » |
| `reservation-cliente.$aEcrire.photosChoisies`  | « {n} photo(s) choisie(s). »                                                                             |
| `validation.$aEcrire.requis`                   | « Ce champ est obligatoire. »                                                                            |
| `validation.$aEcrire.nombreAttendu`            | « Un nombre est attendu ici. »                                                                           |
| `validation.$aEcrire.formatInconnu`            | « Ce format n’est pas reconnu. »                                                                         |
| `validation.$aEcrire.valeurNonProposee`        | « Cette valeur ne fait pas partie des choix proposés. »                                                  |
| `validation.$aEcrire.email`                    | « Cette adresse e-mail semble incomplète. »                                                              |
| `validation.$aEcrire.url`                      | « Cette adresse web n’est pas valide. »                                                                  |
| `validation.$aEcrire.date`                     | « Cette date n’est pas valide. »                                                                         |
| `validation.$aEcrire.tropCourt`                | « Trop court : {min} caractères au minimum. »                                                            |
| `validation.$aEcrire.tropLong`                 | « Trop long : {max} caractères au maximum. »                                                             |
| `validation.$aEcrire.tropPetit`                | « Le minimum est {min}. »                                                                                |
| `validation.$aEcrire.tropGrand`                | « Le maximum est {max}. »                                                                                |
| `validation.$aEcrire.prixInvalide`             | « Indiquer un prix, par exemple 42,50. »                                                                 |
| `validation.$aEcrire.acompte`                  | « Un acompte va de 1 à 100 %. Laisser vide ou 0 pour ne pas en demander. »                               |
| `validation.$aEcrire.telephone`                | « Ce numéro de téléphone semble incomplet. »                                                             |
| `validation.$aEcrire.codePostal`               | « Un code postal compte cinq chiffres. »                                                                 |
| `validation.$aEcrire.heure`                    | « Format attendu : 09:00. »                                                                              |
| `validation.$aEcrire.finAvantDebut`            | « La fin doit venir après le début. »                                                                    |
| `validation.$aEcrire.dateHeure`                | « Choisir une date et une heure. »                                                                       |
| `validation.$aEcrire.commune`                  | « Commune non reconnue : choisir une commune de la liste. »                                              |
| `validation.$aEcrire.prenomRequis`             | « Indiquer un prénom. »                                                                                  |
| `validation.$aEcrire.proPrestationNom`         | « Donne un nom à ta prestation. »                                                                        |
| `validation.$aEcrire.proPrestationDureeMin`    | « Une prestation dure au moins 5 minutes. »                                                              |
| `validation.$aEcrire.proPrestationDureeMax`    | « Au-delà de 10 heures, découpe la prestation. »                                                         |
| `validation.$aEcrire.proNomProfessionnel`      | « Indique ton nom professionnel. »                                                                       |
| `validation.$aEcrire.proRdvPrestation`         | « Indique la prestation. »                                                                               |
| `validation.$aEcrire.proRdvDureeMin`           | « Un rendez-vous dure au moins 5 minutes. »                                                              |
| `validation.$aEcrire.proRdvCliente`            | « Choisis une fiche existante ou saisis un prénom. »                                                     |
