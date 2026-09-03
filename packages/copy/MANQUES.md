# Copy deck : ce que le board ne couvre pas

Le micro-copy du board phase 2 est du contenu ratifié : les écrans le reprennent
depuis `ecrans/*.json`, ils ne le réinventent pas. Ce document liste ce que le
board ne fournit pas, pour que ces textes soient **écrits** plutôt que remplis
par l'improvisation au moment de coder.

Vérification : `node scripts/copy-manques.mjs`.

**Deux sources ratifiées depuis la livraison 1 de la spécification** : le board de la
phase 2 (`packages/copy/source/1a.json` à `13b.json`) et la spécification écran par
écran de Claude Design (`spec-14.json`). Ce document ne liste que ce qui ne vient ni de
l'un ni de l'autre.

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

### R2-7 bis : l'adresse obligatoire sur un rendez-vous manuel

Trois messages de refus, et trois bandeaux. Les bandeaux disent au pro ce que l'app
a su faire de son adresse : reconnue, rattachée au centre de la commune, ou pas
située du tout. Ils comptent autant que la règle, parce qu'une contrainte qu'on
subit sans comprendre se contourne.

| Clé                                       | Texte                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `validation.$aEcrire.proAdresseRequise`   | « Indique où se passe le rendez-vous : un rendez-vous sans lieu ne compte pas dans ta tournée. » |
| `validation.$aEcrire.proCodePostalRequis` | « Indique le code postal : c'est lui qui situe la commune. »                                     |
| `validation.$aEcrire.proVilleRequise`     | « Indique la ville. »                                                                            |
| `demandes-pro.$aEcrire.adresseApprochee`  | Adresse non reconnue, trajet calculé depuis le centre de la commune                              |
| `demandes-pro.$aEcrire.adresseInconnue`   | Ni l'adresse ni la commune reconnues, aucun trajet calculé                                       |
| `demandes-pro.$aEcrire.adresseAComplete`  | Reprise d'un rendez-vous créé avant que l'adresse ne devienne obligatoire                        |

### Lot 1, la trousse de composants

Trois refus nés de l'option neutre : une liste qui ne présuppose rien peut être
laissée sur sa position neutre, et le formulaire doit alors le dire. Sans eux,
un jour non choisi devenait lundi en silence.

| Clé                                   | Texte                              |
| ------------------------------------- | ---------------------------------- |
| `validation.$aEcrire.proJourRequis`   | « Choisis le jour de la semaine. » |
| `validation.$aEcrire.proHeureRequise` | « Choisis une heure. »             |
| `validation.$aEcrire.proDateRequise`  | « Choisis une date. »              |

Restent à ratifier, écrits directement dans les écrans faute de source au board :
l'option neutre de chaque liste (« Choisis un jour », « Choisis dans tes fiches »,
« Je préfère ne pas préciser »), et les libellés de la case « Visible sur ta page
de réservation » et de la saisie assistée de communes.

### D9 et A8 : authentification et forfait de déplacement

L'essentiel des textes d'authentification vient de la planche 14b et n'est donc pas ici.
Ce qui suit est de notre plume : les messages de refus des plafonds anti-pompage, que la
spécification ne traite pas, et quelques libellés de champ que la planche montre remplis
sans les nommer.

| Clé                                                        | Texte                                                                                                                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authentification.$aEcrire.gabaritRenvoyer`                | « Renvoyer le code ({secondes} s) »                                                                                                                               |
| `authentification.$aEcrire.verifieOk`                      | « Ton numéro est vérifié. »                                                                                                                                       |
| `authentification.$aEcrire.emailChamp`                     | « Ton e-mail »                                                                                                                                                    |
| `authentification.$aEcrire.oubliNumero`                    | « Le numéro de ton compte »                                                                                                                                       |
| `authentification.$aEcrire.codeDeveloppement`              | « Aucun fournisseur SMS configuré. Code de développement : {code} »                                                                                               |
| `authentification.$aEcrire.inviteVerification`             | « Vérifie ton téléphone et ta boîte mail pour mettre ta page en ligne. »                                                                                          |
| `authentification.$aEcrire.invitePartielle`                | « Il te reste {reste} à vérifier pour mettre ta page en ligne. »                                                                                                  |
| `authentification.$aEcrire.telephoneChamp`                 | « Ton numéro de téléphone »                                                                                                                                       |
| `authentification.$aEcrire.telephoneBouton`                | « Recevoir le code »                                                                                                                                              |
| `authentification.$aEcrire.plusCeNumero`                   | « Je n’ai plus ce numéro »                                                                                                                                        |
| `agenda-tournee.$aEcrire.voirLendemain`                    | « Voir le lendemain »                                                                                                                                             |
| `authentification.$aEcrire.pasDeCompte`                    | « Pas encore de compte ? »                                                                                                                                        |
| `authentification.$aEcrire.essai`                          | « Essaie 30 jours »                                                                                                                                               |
| `fiche-cliente.$aEcrire.videInvitation`                    | « Elles arrivent à la première réservation. Tu peux aussi en créer une en posant un rendez-vous. »                                                                |
| `fiche-cliente.$aEcrire.recherche`                         | « Chercher une cliente »                                                                                                                                          |
| `fiche-cliente.$aEcrire.aucunResultat`                     | « Aucune fiche à ce nom. »                                                                                                                                        |
| `fiche-cliente.$aEcrire.resumeSimple`                      | « {n} RDV · depuis {depuis} »                                                                                                                                     |
| `fiche-cliente.$aEcrire.jamaisVenue`                       | « Aucun rendez-vous pour l'instant »                                                                                                                              |
| `fiche-cliente.$aEcrire.noteDuRdv`                         | « Note de ce rendez-vous »                                                                                                                                        |
| `fiche-cliente.$aEcrire.noteDuRdvAide`                     | « Ce qui vaut pour CE rendez-vous seulement. Ce qui vaut pour toutes ses visites va dans ses notes de fiche. »                                                    |
| `fiche-cliente.$aEcrire.notesAide`                         | « Formule, dosage, temps de pose, produits, préférences. Reste sur le geste et le produit : Wiggy n'est pas un dossier médical. »                                 |
| `agenda-tournee.$aEcrire.bloquer`                          | « Bloquer une plage »                                                                                                                                             |
| `agenda-tournee.$aEcrire.blocageTitre`                     | « Tu n'es pas disponible ? »                                                                                                                                      |
| `agenda-tournee.$aEcrire.blocageAide`                      | « Cette plage disparaît des créneaux proposés à tes clientes. Personne ne pourra réserver dessus. »                                                               |
| `agenda-tournee.$aEcrire.blocageMotif`                     | « Pourquoi (facultatif) »                                                                                                                                         |
| `agenda-tournee.$aEcrire.blocageMotifAide`                 | « Pour toi seule. Tes clientes ne le voient jamais. »                                                                                                             |
| `agenda-tournee.$aEcrire.blocagePose`                      | « Plage bloquée. »                                                                                                                                                |
| `agenda-tournee.$aEcrire.blocageLiberer`                   | « Libérer »                                                                                                                                                       |
| `agenda-tournee.$aEcrire.blocageIndisponible`              | « Indisponible »                                                                                                                                                  |
| `agenda-tournee.$aEcrire.terminer`                         | « Terminé »                                                                                                                                                       |
| `validation.$aEcrire.blocageDebut`                         | « Indique à partir de quand tu n'es pas disponible. »                                                                                                             |
| `validation.$aEcrire.blocageFin`                           | « Indique jusqu'à quand tu n'es pas disponible. »                                                                                                                 |
| `validation.$aEcrire.blocageOrdre`                         | « La fin doit venir après le début. »                                                                                                                             |
| `agenda-tournee.$aEcrire.retard`                           | « Je suis en retard »                                                                                                                                             |
| `agenda-tournee.$aEcrire.retardTitre`                      | « Prévenir ta prochaine cliente »                                                                                                                                 |
| `agenda-tournee.$aEcrire.retardAide`                       | « Relis le message avant de l'envoyer. Rien ne part sans toi. »                                                                                                   |
| `agenda-tournee.$aEcrire.retardEnvoyer`                    | « Envoyer »                                                                                                                                                       |
| `agenda-tournee.$aEcrire.retardParti`                      | « Ta cliente est prévenue. »                                                                                                                                      |
| `agenda-tournee.$aEcrire.retardSansCoordonnee`             | « Pas de numéro ni d'e-mail sur sa fiche : appelle-la. »                                                                                                          |
| `agenda-tournee.$aEcrire.caler`                            | « On cale le prochain ? »                                                                                                                                         |
| `agenda-tournee.$aEcrire.calerAide`                        | « Même prestation. Les créneaux tiennent compte de ta tournée. »                                                                                                  |
| `agenda-tournee.$aEcrire.aucunProchain`                    | « C'était le dernier de la journée. »                                                                                                                             |
| `agenda-tournee.$aEcrire.departDans`                       | « Pars dans {min} min pour être à l'heure chez {cliente}. »                                                                                                       |
| `agenda-tournee.$aEcrire.departMaintenant`                 | « Pars maintenant pour être à l'heure chez {cliente}. »                                                                                                           |
| `agenda-tournee.$aEcrire.departEnRetard`                   | « Tu as {min} min de retard sur le départ chez {cliente}. »                                                                                                       |
| `agenda-tournee.$aEcrire.prochainRdv`                      | « Prochain RDV : {cliente}, {heure}, {adresse} »                                                                                                                  |
| `agenda-tournee.$aEcrire.retardSms`                        | « Bonjour {cliente}, c'est {pro}. J'ai un peu de retard, je serai chez vous vers {heure}. À tout de suite. Vous pouvez me joindre au {telephone}. »               |
| `authentification.$aEcrire.smsCode`                        | « Wiggy : ton code de vérification est {code}. Il expire dans 10 minutes. »                                                                                       |
| `reservation-cliente.$aEcrire.realisationsTitre`           | « Ses réalisations »                                                                                                                                              |
| `reservation-cliente.$aEcrire.seDeplaceChezVous`           | « {pro} se déplace chez vous »                                                                                                                                    |
| `reservation-cliente.$aEcrire.ctaCollant`                  | « Trouver un moment avec {pro} »                                                                                                                                  |
| `reservation-cliente.$aEcrire.ctaSousTitre`                | « Vous choisissez, {pro} vient chez vous. »                                                                                                                       |
| `reservation-cliente.$aEcrire.forfaitPossible`             | « Un forfait de déplacement peut s'appliquer selon votre adresse. {pro} vous l'indique avant de confirmer. »                                                      |
| `reservation-cliente.$aEcrire.acompteSurCarte`             | « acompte de {pourcent} % à la réservation »                                                                                                                      |
| `agenda-tournee.$aEcrire.lancerJournee`                    | « Je commence ma tournée »                                                                                                                                        |
| `agenda-tournee.$aEcrire.lancerAide`                       | « Tant que tu n'as pas commencé, rien n'est marqué en cours. »                                                                                                    |
| `agenda-tournee.$aEcrire.journeeLancee`                    | « Tournée commencée »                                                                                                                                             |
| `agenda-tournee.$aEcrire.aCloturer`                        | « À clôturer »                                                                                                                                                    |
| `agenda-tournee.$aEcrire.aCloturerTitre`                   | « Ce qui reste à clôturer »                                                                                                                                       |
| `agenda-tournee.$aEcrire.aCloturerAide`                    | « Wiggy n'a jamais clôturé un rendez-vous à ta place, et ne le fera pas. Ces durées nourrissent tes créneaux. »                                                   |
| `agenda-tournee.$aEcrire.dureeReelle`                      | « Combien de temps ça a pris »                                                                                                                                    |
| `agenda-tournee.$aEcrire.dureeReelleAide`                  | « En minutes. C'est ce chiffre qui affine tes prochains créneaux. »                                                                                               |
| `agenda-tournee.$aEcrire.cloturerEtNoter`                  | « Clôturer »                                                                                                                                                      |
| `agenda-tournee.$aEcrire.rienACloturer`                    | « Rien à clôturer. Tout est à jour. »                                                                                                                             |
| `agenda-tournee.$aEcrire.departTitre`                      | « D'où tu pars »                                                                                                                                                  |
| `agenda-tournee.$aEcrire.departAide`                       | « Ton domicile ou ton atelier. Sert à calculer le trajet de ton premier rendez-vous, et n'est jamais affiché à tes clientes. »                                    |
| `agenda-tournee.$aEcrire.departManquant`                   | « Sans point de départ, ton premier rendez-vous n'a pas de trajet ni de rappel. »                                                                                 |
| `agenda-tournee.$aEcrire.departConfirmer`                  | « Tu pars bien d'ici ? »                                                                                                                                          |
| `agenda-tournee.$aEcrire.departPosition`                   | « Utiliser ma position actuelle »                                                                                                                                 |
| `agenda-tournee.$aEcrire.departPositionAide`               | « Elle sert au calcul du jour et n'est jamais enregistrée. »                                                                                                      |
| `agenda-tournee.$aEcrire.departPositionRefusee`            | « Position indisponible. On garde ton adresse de départ. »                                                                                                        |
| `agenda-tournee.$aEcrire.aCloturerCompte`                  | « {n} rendez-vous à clôturer »                                                                                                                                    |
| `agenda-tournee.$aEcrire.noteDuJour`                       | « Comment ça s'est passé (facultatif) »                                                                                                                           |
| `agenda-tournee.$aEcrire.noteDuJourAide`                   | « Reste sur ce rendez-vous. »                                                                                                                                     |
| `agenda-tournee.$aEcrire.aRetenir`                         | « À retenir pour la prochaine fois (facultatif) »                                                                                                                 |
| `agenda-tournee.$aEcrire.aRetenirAide`                     | « Se réaffiche à chacune de ses visites. Formule, dosage, produits, préférences. »                                                                                |
| `agenda-tournee.$aEcrire.navProfil`                        | « Profil »                                                                                                                                                        |
| `agenda-tournee.$aEcrire.navClientes`                      | « Clientes »                                                                                                                                                      |
| `agenda-tournee.$aEcrire.profilStatement`                  | « Ton profil. »                                                                                                                                                   |
| `agenda-tournee.$aEcrire.voirMaPage`                       | « Voir ma page publique »                                                                                                                                         |
| `agenda-tournee.$aEcrire.pasEnLigne`                       | « Pas encore en ligne »                                                                                                                                           |
| `agenda-tournee.$aEcrire.groupeActivite`                   | « Ton activité »                                                                                                                                                  |
| `agenda-tournee.$aEcrire.groupeCompte`                     | « Paiement »                                                                                                                                                      |
| `agenda-tournee.$aEcrire.paiement`                         | « Paiement en ligne »                                                                                                                                             |
| `agenda-tournee.$aEcrire.abonnement`                       | « Abonnement »                                                                                                                                                    |
| `agenda-tournee.$aEcrire.notifications`                    | « Notifications »                                                                                                                                                 |
| `agenda-tournee.$aEcrire.statistiques`                     | « Statistiques »                                                                                                                                                  |
| `agenda-tournee.$aEcrire.aide`                             | « Aide »                                                                                                                                                          |
| `agenda-tournee.$aEcrire.annulation`                       | « Annulation et majorations »                                                                                                                                     |
| `agenda-tournee.$aEcrire.exercice`                         | « Mode d'exercice et GPS »                                                                                                                                        |
| `agenda-tournee.$aEcrire.journeesEtConges`                 | « Journées et congés »                                                                                                                                            |
| `agenda-tournee.$aEcrire.abonnementResume`                 | « Ton offre et tes SMS »                                                                                                                                          |
| `agenda-tournee.$aEcrire.groupeLabel`                      | « Groupe (facultatif) »                                                                                                                                           |
| `agenda-tournee.$aEcrire.groupeAide`                       | « Suggérés : Coupe, Technique, Coiffage, Soins, Homme, Enfant. Sans groupe, ta liste reste simple. »                                                              |
| `demandes-pro.$aEcrire.propositionEnvoyee`                 | « Proposition envoyée. Tu seras prévenue de sa réponse. »                                                                                                         |
| `demandes-pro.$aEcrire.propositionMot`                     | « Ton mot pour elle »                                                                                                                                             |
| `demandes-pro.$aEcrire.propositionMotAide`                 | « C'est lui qui fait accepter. Dis ce que tu as vu sur ses photos. »                                                                                              |
| `fiche-cliente.$aEcrire.profilTechnique`                   | « Ce qu'il faut savoir »                                                                                                                                          |
| `fiche-cliente.$aEcrire.profilTechniqueAide`               | « Ce qui est vrai à chaque fois : sensibilités, préférences, ce qu'elle n'aime pas. Reste sur le geste et le produit : Wiggy n'est pas un dossier médical. »      |
| `fiche-cliente.$aEcrire.journalTitre`                      | « Ce que tu as fait »                                                                                                                                             |
| `fiche-cliente.$aEcrire.journalDerniere`                   | « La dernière fois »                                                                                                                                              |
| `fiche-cliente.$aEcrire.journalVide`                       | « Rien de noté pour l'instant. Ce que tu écris en clôturant se retrouvera ici, daté. »                                                                            |
| `fiche-cliente.$aEcrire.journalTout`                       | « Tout l'historique technique »                                                                                                                                   |
| `fiche-cliente.$aEcrire.faitAujourdhui`                    | « Ce que tu as fait aujourd'hui (facultatif) »                                                                                                                    |
| `fiche-cliente.$aEcrire.faitAujourdhuiAide`                | « Formule, dosage, temps de pose, produits. Repris de la dernière fois : corrige ce qui change. Chaque enregistrement crée une entrée datée, rien n'est écrasé. » |
| `notification-copilote.$aEcrire.pushReponse`               | « Quand une cliente répond »                                                                                                                                      |
| `notification-copilote.$aEcrire.pushReponseAide`           | « À une contre-proposition, à un forfait, à un report. Coché par défaut : tu attends cette réponse. »                                                             |
| `notification-copilote.$aEcrire.pushAvis`                  | « Quand tu reçois un avis »                                                                                                                                       |
| `notification-copilote.$aEcrire.pushAvisAide`              | « Un avis n'attend rien de toi. À toi de voir si tu veux le savoir tout de suite. »                                                                               |
| `notification-copilote.$aEcrire.epingleADecider`           | « {n} demandes t'attendent dans « À décider » »                                                                                                                   |
| `notification-copilote.$aEcrire.journalAcceptee`           | « {cliente} a accepté ta proposition. »                                                                                                                           |
| `notification-copilote.$aEcrire.journalRefusee`            | « {cliente} a décliné ta proposition. »                                                                                                                           |
| `reservation-cliente.$aEcrire.badgeImmediate`              | « Réservation immédiate »                                                                                                                                         |
| `reservation-cliente.$aEcrire.badgeValidation`             | « Sur validation »                                                                                                                                                |
| `reservation-cliente.$aEcrire.confirmationAide`            | « Ce choix s'affiche sur ta page : tes clientes savent avant de réserver si c'est confirmé tout de suite ou si tu valides. »                                      |
| `reservation-cliente.$aEcrire.propositionDejaAcceptee`     | « Vous avez déjà accepté cette proposition. Votre rendez-vous est confirmé. »                                                                                     |
| `reservation-cliente.$aEcrire.propositionClose`            | « Cette proposition n'est plus d'actualité. »                                                                                                                     |
| `reservation-cliente.$aEcrire.propositionAcceptee`         | « C'est noté, votre rendez-vous est confirmé. »                                                                                                                   |
| `reservation-cliente.$aEcrire.propositionDeclinee`         | « C'est noté. Vous serez recontactée. »                                                                                                                           |
| `agenda-tournee.$aEcrire.menuCompte`                       | « Mon compte Wiggy »                                                                                                                                              |
| `agenda-tournee.$aEcrire.monCompte`                        | « Mon compte »                                                                                                                                                    |
| `agenda-tournee.$aEcrire.monCompteResume`                  | « E-mail, mot de passe, téléphone »                                                                                                                               |
| `agenda-tournee.$aEcrire.parametrage`                      | « Paramétrage »                                                                                                                                                   |
| `agenda-tournee.$aEcrire.parametrageResume`                | « Paiement, annulation, notifications »                                                                                                                           |
| `agenda-tournee.$aEcrire.deconnexion`                      | « Se déconnecter »                                                                                                                                                |
| `reservation-cliente.$aEcrire.forfaitTitre`                | « Au-delà de ta zone »                                                                                                                                            |
| `reservation-cliente.$aEcrire.fixeZoneIntervention`        | « Vous reçoit à »                                                                                                                                                 |
| `reservation-cliente.$aEcrire.fixeAdresseDuLieu`           | « {pro} vous reçoit au {adresse}. »                                                                                                                               |
| `reservation-cliente.$aEcrire.fixeAccesTitre`              | « Comment entrer »                                                                                                                                                |
| `reservation-cliente.$aEcrire.fixeConfirmationDetailSms`   | « Rendez-vous chez {pro}. Vous recevrez un rappel par SMS la veille. »                                                                                            |
| `reservation-cliente.$aEcrire.fixeConfirmationDetailEmail` | « Rendez-vous chez {pro}. Vous recevrez un rappel la veille, par e-mail. »                                                                                        |
| `reservation-cliente.$aEcrire.fixeAucunDeplacement`        | « {pro} ne se déplace pas : c'est vous qui venez. »                                                                                                               |
| `validation.$aEcrire.proMotDePasseCourt`                   | « 8 caractères minimum. »                                                                                                                                         |
| `validation.$aEcrire.proCodeFaux`                          | « Ce code ne correspond pas. Vérifie les cinq chiffres. »                                                                                                         |
| `validation.$aEcrire.proCodeExpire`                        | « Ce code a expiré. Demande-en un nouveau. »                                                                                                                      |
| `validation.$aEcrire.proCodeTropDeTentatives`              | « Trop d’essais. Demande un nouveau code. »                                                                                                                       |
| `validation.$aEcrire.proPlafondNumero`                     | « Trop de codes demandés pour ce numéro. Réessaie dans une heure. »                                                                                               |
| `validation.$aEcrire.proPlafondAppelant`                   | « Trop de demandes depuis cet appareil. Réessaie dans une heure. »                                                                                                |
| `validation.$aEcrire.proPlafondGlobal`                     | « L’envoi de codes est momentanément suspendu. Réessaie plus tard. »                                                                                              |
| `validation.$aEcrire.proSmsIndisponible`                   | « L’envoi n’a pas abouti. Réessaie dans un instant. »                                                                                                             |
| `validation.$aEcrire.proDestinationSms`                    | « Wiggy n’envoie de codes qu’en France métropolitaine et dans les DOM. »                                                                                          |
