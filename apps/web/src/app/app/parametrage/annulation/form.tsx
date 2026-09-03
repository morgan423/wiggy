'use client'

import { useActionState } from 'react'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerAnnulation } from './actions'

/**
 * A10 et B5, ensemble : ce qui change le montant ou le créneau après coup.
 *
 * Le tampon « nouvelle cliente » s'ajoute au créneau proposé et **jamais au
 * prix**. Une première visite prend plus longtemps : on se présente, on regarde
 * les cheveux, on parle.
 */
export function FormAnnulation({
  reglages,
}: {
  reglages: { free_cancellation_hours: number; new_client_buffer_min: number }
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerAnnulation, VIDE)

  return (
    <form action={action} key={etat.n}>
      <Champ
        id="free_cancellation_hours"
        label="Annulation gratuite, en heures avant"
        type="number"
        defaultValue={String(reglages.free_cancellation_hours)}
        aide="Affiché sur ta page publique, pour que tes clientes le sachent avant de réserver."
      />
      <Champ
        id="new_client_buffer_min"
        label="Temps en plus pour une première visite, en minutes"
        type="number"
        required={false}
        defaultValue={String(reglages.new_client_buffer_min)}
        aide="Ce temps s’ajoute au créneau proposé, jamais au prix."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
