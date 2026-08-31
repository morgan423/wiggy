'use client'

import { useActionState } from 'react'
import { sInscrire, type EtatAuth } from '../actions'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'

export function FormInscription() {
  const [etat, action, enCours] = useActionState<EtatAuth, FormData>(sInscrire, { statut: 'vide' })

  if (etat.statut === 'verifie_tes_mails') {
    return (
      <p className="rounded-carte bg-celebration/25 p-6 text-lg font-semibold">
        Compte créé. Ouvre ta boîte mail pour confirmer ton adresse, puis reviens te connecter.
      </p>
    )
  }

  return (
    <form action={action}>
      <Champ
        id="nom"
        label="Ton nom professionnel"
        autoComplete="name"
        aide="C’est le nom que verra ta clientèle sur ta page de réservation."
      />
      <Champ id="email" label="Ton e-mail" type="email" autoComplete="email" />
      <Champ
        id="motDePasse"
        label="Ton mot de passe"
        type="password"
        autoComplete="new-password"
        aide="Au moins 10 caractères."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Créer mon compte</BoutonPrincipal>
    </form>
  )
}
