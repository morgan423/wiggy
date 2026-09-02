'use client'

import { useActionState, useState } from 'react'
import { ajouterConge } from './actions'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { ActionPrincipale, BoutonPointille } from '@/components/composition'
import { SelecteurDate } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'

/**
 * Poser un congé. Planche 14f : « Poser des congés » en action principale
 * framboise sur l'état vide, puis « + Poser des congés » en pointillés une fois
 * la liste ouverte.
 */
export function FormConge({ premier = false }: { premier?: boolean }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(ajouterConge, VIDE)
  const [ouvert, setOuvert] = useState(false)
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')

  if (!ouvert) {
    return premier ? (
      <ActionPrincipale
        onClick={() => {
          setOuvert(true)
        }}
      >
        Poser des congés
      </ActionPrincipale>
    ) : (
      <BoutonPointille
        onClick={() => {
          setOuvert(true)
        }}
      >
        + Poser des congés
      </BoutonPointille>
    )
  }

  return (
    <form action={action} key={etat.statut === 'ok' ? etat.n : 'form'}>
      <div className="grid grid-cols-2 gap-3">
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
