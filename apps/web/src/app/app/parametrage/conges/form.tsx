'use client'

import { useActionState, useState } from 'react'
import { ajouterConge } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { SelecteurDate } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'

export function FormConge() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterConge, VIDE)
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <SelecteurDate id="starts_at" label="Du" valeur={du} onValeur={setDu} />
        <SelecteurDate id="ends_at" label="Au" valeur={au} onValeur={setAu} />
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
