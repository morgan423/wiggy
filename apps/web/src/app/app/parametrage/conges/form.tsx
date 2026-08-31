'use client'

import { useActionState } from 'react'
import { ajouterConge } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'

export function FormConge() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterConge, VIDE)

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <Champ id="starts_at" label="Du" type="date" />
        <Champ id="ends_at" label="Au" type="date" />
      </div>
      <Champ
        id="label"
        label="Intitulé (facultatif)"
        required={false}
        aide="Par exemple : vacances d’été"
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Poser ce congé</BoutonPrincipal>
    </form>
  )
}
