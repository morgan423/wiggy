'use client'

import { useActionState } from 'react'
import { copy, remplir } from '@wiggy/copy'
import { ZONE, emailRequis, type CanalRappel } from '@wiggy/core'
import { reserver, type EtatReservation } from './actions'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'

const C = copy.reservationCliente
const quandFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Dernière étape : les coordonnées, puis la célébration.
 *
 * Le moment de confirmation suit la chronologie du design : la carte miel
 * arrive en pop, le prénom se souligne, la ligne SMS apparaît. Le prénom est
 * le héros du moment, c'est un métier de relation.
 */
export function FormCoordonnees({
  proId,
  serviceId,
  debut,
  adresse,
  codePostal,
  ville,
  depotPhotos,
  canal,
  horsZone,
  sejourDu,
  sejourAu,
  prenomPro,
}: {
  proId: string
  serviceId: string
  debut: string
  adresse: string
  codePostal: string
  ville: string
  depotPhotos: string
  /** Le canal réellement utilisé. Jamais le palier : trois causes, un rendu. */
  canal: CanalRappel
  horsZone: boolean
  sejourDu: string
  sejourAu: string
  prenomPro: string
}) {
  const [etat, action, enCours] = useActionState<EtatReservation, FormData>(reserver, {
    statut: 'vide',
  })

  // B5 : une erreur ne reprend jamais ce que la cliente a déjà tapé. React 19
  // réinitialise un formulaire non contrôlé dès qu'une action se termine ;
  // `key` force le remontage avec les valeurs renvoyées par le serveur.
  const saisie = etat.statut === 'erreur' ? etat.saisie : undefined
  const fautif = etat.statut === 'erreur' ? etat.champ : undefined
  const repris = (champ: string) => saisie?.[champ] ?? ''

  if (etat.statut === 'confirme') {
    const quand = quandFr.format(new Date(etat.quand))
    return (
      <div className="celebration-carte rounded-bloc bg-celebration p-8 text-texte-sur-miel">
        <p className="titre">
          {etat.enAttente
            ? remplir(C.gabarits.demandeEnvoyee, { pro: prenomPro })
            : remplir(C.gabarits.confirmationTitre, { cliente: etat.prenom })}
        </p>
        <p className="celebration-sms mt-4 text-lg">
          {etat.enAttente
            ? remplir(
                canal === 'sms' ? C.rappel.demandeChezLaProSms : C.rappel.demandeChezLaProEmail,
                { pro: prenomPro },
              )
            : remplir(
                canal === 'sms' ? C.rappel.confirmationDetailSms : C.rappel.confirmationDetailEmail,
                { pro: prenomPro },
              )}
        </p>
        <p className="mt-4">{quand}</p>
        {/* Sans compte, ce lien est le seul chemin de retour vers la réponse
            du pro. Il vaut d'être visible plutôt que caché dans un SMS. */}
        {etat.photosRefusees ? <p className="mt-4 font-semibold">{etat.photosRefusees}</p> : null}
        <a href={etat.suivi} className="tactile mt-6 inline-flex font-bold underline">
          Suivre ma demande
        </a>
      </div>
    )
  }

  return (
    <form action={action} key={etat.statut === 'erreur' ? (etat.champ ?? 'erreur') : 'vide'}>
      <input type="hidden" name="proId" value={proId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="debut" value={debut} />
      <input type="hidden" name="adresse" value={adresse} />
      <input type="hidden" name="codePostal" value={codePostal} />
      <input type="hidden" name="ville" value={ville} />
      <input type="hidden" name="horsZone" value={horsZone ? '1' : ''} />
      <input type="hidden" name="depotPhotos" value={depotPhotos} />
      <input type="hidden" name="sejourDu" value={sejourDu} />
      <input type="hidden" name="sejourAu" value={sejourAu} />

      <Champ
        id="prenom"
        label="Votre prénom"
        autoComplete="given-name"
        defaultValue={repris('prenom')}
        fautif={fautif === 'prenom'}
      />
      <Champ
        id="telephone"
        label="Votre téléphone"
        type="tel"
        autoComplete="tel"
        aide="Pour vous prévenir en cas d’imprévu."
        defaultValue={repris('telephone')}
        fautif={fautif === 'telephone'}
      />
      {/*
        L'e-mail devient obligatoire quand c'est par lui qu'on préviendra :
        sans cette règle, on promettrait un rappel par e-mail à une cliente qui
        n'en a pas donné. « Facultatif » ne s'affiche que sur le canal SMS.
      */}
      <Champ
        id="email"
        label={emailRequis(canal) ? 'Votre e-mail' : 'Votre e-mail (facultatif)'}
        type="email"
        required={emailRequis(canal)}
        autoComplete="email"
        aide={emailRequis(canal) ? C.rappel.emailRequisAide : undefined}
        defaultValue={repris('email')}
        fautif={fautif === 'email'}
      />
      <Champ
        id="acces"
        label="Infos d’accès"
        required={false}
        aide="Bâtiment, étage, digicode…"
        defaultValue={repris('acces')}
        fautif={fautif === 'acces'}
      />

      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>
        {horsZone ? C.sousReserve.bouton : C.creneaux.bouton}
      </BoutonPrincipal>
    </form>
  )
}
