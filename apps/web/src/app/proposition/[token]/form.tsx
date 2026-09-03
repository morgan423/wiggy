'use client'

import { useActionState } from 'react'
import { copy } from '@wiggy/copy'
import { Erreur, Succes } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'
import { repondreProposition } from './actions'

/**
 * Deux réponses, et aucune n'est un piège : accepter confirme le rendez-vous,
 * décliner le laisse en attente et prévient la pro. Rien ne se passe tant que
 * la cliente n'a pas choisi.
 */
export function FormReponse({ token }: { token: string }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(repondreProposition, VIDE)
  const D = copy.demandesPro

  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        name="reponse"
        value="accepte"
        disabled={enCours}
        className="tactile w-full rounded-pilule bg-action px-8 py-4 text-lg font-bold text-texte-sur-plein hover:bg-action-survol disabled:opacity-60"
      >
        {D.proposition.accepter}
      </button>
      <button
        type="submit"
        name="reponse"
        value="decline"
        disabled={enCours}
        className="tactile w-full rounded-pilule border-2 border-trait-discret px-8 py-4 text-lg font-semibold hover:border-prune disabled:opacity-60"
      >
        {D.proposition.decliner}
      </button>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
    </form>
  )
}
