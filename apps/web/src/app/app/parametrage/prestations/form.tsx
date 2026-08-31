'use client'

import { useActionState } from 'react'
import { creerPrestation } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'

export function FormPrestation() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(creerPrestation, VIDE)

  // Une erreur ne doit pas effacer la saisie : React 19 réinitialise le
  // formulaire après chaque action, on le repeuple avec ce qui a été soumis.
  const repris = (champ: string) => (etat.statut === 'erreur' ? (etat.saisie?.[champ] ?? '') : '')

  return (
    // `key` remet le formulaire à blanc après un ajout réussi : on enchaîne
    // les prestations sans avoir à tout effacer à la main.
    <form action={action} key={etat.n}>
      <Champ
        id="name"
        label="Nom de la prestation"
        defaultValue={repris('name')}
        aide="Par exemple : Coupe + brushing"
      />
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <Champ
          id="price_cents"
          label="Prix"
          defaultValue={repris('price_cents')}
          aide="En euros, par exemple 42,50"
        />
        <Champ
          id="duration_min"
          label="Durée"
          type="number"
          defaultValue={repris('duration_min')}
          aide="En minutes"
        />
      </div>
      <Champ
        id="deposit_percent"
        label="Acompte pour cette prestation (facultatif)"
        type="number"
        required={false}
        defaultValue={repris('deposit_percent')}
        aide="En %. Laisse vide pour suivre ton réglage général."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Ajouter la prestation</BoutonPrincipal>
    </form>
  )
}
