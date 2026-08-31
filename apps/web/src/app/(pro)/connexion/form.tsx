'use client'

import { useActionState } from 'react'
import { seConnecter, type EtatAuth } from '../actions'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'

export function FormConnexion({ suite }: { suite?: string }) {
  const [etat, action, enCours] = useActionState<EtatAuth, FormData>(seConnecter, {
    statut: 'vide',
  })

  return (
    <form action={action}>
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}
      <Champ id="email" label="Ton e-mail" type="email" autoComplete="email" />
      <Champ
        id="motDePasse"
        label="Ton mot de passe"
        type="password"
        autoComplete="current-password"
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Se connecter</BoutonPrincipal>
    </form>
  )
}
