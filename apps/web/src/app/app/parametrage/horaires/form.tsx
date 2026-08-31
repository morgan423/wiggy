'use client'

import { useActionState } from 'react'
import { ajouterPlage } from './actions'
import { Champ, Choix, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'
import { JOURS } from './jours'

export function FormHoraire() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterPlage, VIDE)

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <Choix
        id="weekday"
        label="Jour"
        options={JOURS.map((nom, index) => ({ valeur: String(index), texte: nom }))}
      />
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <Champ id="starts_at" label="De" type="time" defaultValue="09:00" />
        <Champ id="ends_at" label="À" type="time" defaultValue="18:00" />
      </div>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Ajouter la plage</BoutonPrincipal>
    </form>
  )
}
