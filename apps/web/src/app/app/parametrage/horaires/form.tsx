'use client'

import { useActionState, useState } from 'react'
import { ajouterPlage } from './actions'
import { Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { ListeDeroulante, SelecteurHeure } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { JOURS } from './jours'

export function FormHoraire() {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterPlage, VIDE)
  // R3-1 ② : ce que la liste montre est ce que le formulaire enverra. Aucun
  // jour n'est retenu tant que la pro n'en a pas choisi un : sans l'option
  // neutre, lundi passerait pour un choix qu'elle n'a pas fait.
  const [jour, setJour] = useState('')
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('18:00')

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <ListeDeroulante
        id="weekday"
        label="Jour"
        valeur={jour}
        onValeur={setJour}
        optionNeutre="Choisis un jour"
        options={JOURS.map((nom, index) => ({ valeur: String(index), texte: nom }))}
      />
      <div className="grid gap-0 sm:grid-cols-2 sm:gap-5">
        <SelecteurHeure id="starts_at" label="De" valeur={debut} onValeur={setDebut} />
        <SelecteurHeure id="ends_at" label="À" valeur={fin} onValeur={setFin} />
      </div>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Ajouter la plage</BoutonPrincipal>
    </form>
  )
}
