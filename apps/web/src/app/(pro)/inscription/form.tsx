'use client'

import { useActionState } from 'react'
import { sInscrire, type EtatAuth } from '../actions'
import { Champ, Erreur, BoutonPrincipal } from '@/components/champs'

export function FormInscription({ acceptation }: { acceptation: React.ReactNode }) {
  const [etat, action, enCours] = useActionState<EtatAuth, FormData>(sInscrire, { statut: 'vide' })

  if (etat.statut === 'verifie_tes_mails') {
    return (
      <p className="rounded-carte bg-celebration px-3.5 py-3 text-[13px] font-bold text-texte-sur-miel">
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
      {/* G7 ① — les CGV et la confidentialité, cases jamais pré-cochées. Le
          bloc est rendu par le serveur et passé ici : il connaît la version en
          vigueur, que ce formulaire n'a pas à savoir lire. */}
      {acceptation}
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Créer mon compte</BoutonPrincipal>
    </form>
  )
}
