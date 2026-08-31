'use client'

import { useActionState } from 'react'
import { copy, remplir } from '@wiggy/copy'
import { ZONE, PHOTO_TYPES } from '@wiggy/core'
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
function ChampPhotos({ id, label }: { id: string; label: string }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(',')}
        className="mt-2 w-full rounded-champ border-2 border-trait-discret px-5 py-4"
      />
    </div>
  )
}

export function FormCoordonnees({
  proId,
  serviceId,
  debut,
  adresse,
  codePostal,
  ville,
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
  horsZone: boolean
  sejourDu: string
  sejourAu: string
  prenomPro: string
}) {
  const [etat, action, enCours] = useActionState<EtatReservation, FormData>(reserver, {
    statut: 'vide',
  })

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
            ? remplir(C.gabarits.demandeChezLaPro, { pro: prenomPro })
            : remplir(C.gabarits.confirmationDetail, { pro: prenomPro, quand })}
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
    <form action={action}>
      <input type="hidden" name="proId" value={proId} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="debut" value={debut} />
      <input type="hidden" name="adresse" value={adresse} />
      <input type="hidden" name="codePostal" value={codePostal} />
      <input type="hidden" name="ville" value={ville} />
      <input type="hidden" name="horsZone" value={horsZone ? '1' : ''} />
      <input type="hidden" name="sejourDu" value={sejourDu} />
      <input type="hidden" name="sejourAu" value={sejourAu} />

      <Champ id="prenom" label="Votre prénom" autoComplete="given-name" />
      <Champ
        id="telephone"
        label="Votre téléphone"
        type="tel"
        autoComplete="tel"
        aide="Pour vous prévenir en cas d’imprévu."
      />
      <Champ id="email" label="Votre e-mail" type="email" required={false} autoComplete="email" />
      <Champ id="acces" label="Infos d’accès" required={false} aide="Bâtiment, étage, digicode…" />

      {/* A4 : les photos qualifient la prestation ET sa durée. Facultatives,
          mais posées ici plutôt que réclamées par message plus tard. */}
      <fieldset className="mt-8 rounded-carte border-2 border-trait-discret p-5">
        <legend className="px-2 font-bold">{C.$aEcrire.photosTitre}</legend>
        <p className="text-texte-secondaire">
          {remplir(C.$aEcrire.photosAide, { pro: prenomPro })}
        </p>
        <ChampPhotos id="photosActuelles" label={C.$aEcrire.photosActuelles} />
        <ChampPhotos id="photosInspirations" label={C.$aEcrire.photosInspirations} />
        <p className="mt-3 text-sm text-texte-attenue">{C.$aEcrire.photosFormats}</p>
      </fieldset>

      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>
        {horsZone ? C.sousReserve.bouton : C.creneaux.bouton}
      </BoutonPrincipal>
    </form>
  )
}
