'use client'

import { useActionState, useState } from 'react'
import { JOURS_SEMAINE } from '@wiggy/core'
import { ajouterPlage } from './actions'
import { Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { ActionPrincipale, BoutonPointille } from '@/components/composition'
import { ListeDeroulante, SelecteurHeure } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'

/**
 * L'ajout d'une plage. Comme en 14d et 14e, il s'ouvre sur un geste : un
 * formulaire déployé en permanence sous une liste fait deux affordances
 * d'ajout, défaut relevé à la recette 6.
 */
export function FormHoraire({ premiere = false }: { premiere?: boolean }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterPlage, VIDE)
  const [ouvert, setOuvert] = useState(false)
  // R3-1 ② : ce que la liste montre est ce que le formulaire enverra. Aucun
  // jour n'est retenu tant que la pro n'en a pas choisi un : sans l'option
  // neutre, lundi passerait pour un choix qu'elle n'a pas fait.
  const [jour, setJour] = useState('')
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('18:00')

  if (!ouvert) {
    return premiere ? (
      <ActionPrincipale
        onClick={() => {
          setOuvert(true)
        }}
      >
        Poser une plage
      </ActionPrincipale>
    ) : (
      <BoutonPointille
        onClick={() => {
          setOuvert(true)
        }}
      >
        + Ajouter une plage
      </BoutonPointille>
    )
  }

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <ListeDeroulante
        id="weekday"
        label="Jour"
        valeur={jour}
        onValeur={setJour}
        optionNeutre="Choisis un jour"
        options={JOURS_SEMAINE.map((nom, index) => ({ valeur: String(index), texte: nom }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelecteurHeure id="starts_at" label="De" valeur={debut} onValeur={setDebut} />
        <SelecteurHeure id="ends_at" label="À" valeur={fin} onValeur={setFin} />
      </div>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Ajouter la plage</BoutonPrincipal>
      <button
        type="button"
        onClick={() => {
          setOuvert(false)
        }}
        className="tactile mt-1 w-full text-[12.5px] font-bold text-texte-attenue hover:text-prune"
      >
        Annuler
      </button>
    </form>
  )
}
