'use client'

import { useActionState } from 'react'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerForfait } from './actions'

/**
 * A8, planche 14e : le forfait de déplacement de base.
 *
 * Il évite à la pro de retaper son montant habituel à chaque demande hors
 * zone : il lui sera proposé, et elle pourra le surcharger au cas par cas.
 *
 * ⚠️ Ce montant n'est JAMAIS affiché à une cliente. La page publique annonce
 * qu'un forfait peut s'appliquer, sans chiffre : un « +10 € » public ancrerait
 * la pro trop bas quand le trajet est long. La cliente découvre le montant dans
 * la proposition de la pro, et le confirme avant que le rendez-vous existe.
 */
export function FormForfait({ montant }: { montant: string }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerForfait, VIDE)

  return (
    <form action={action} key={etat.n}>
      <Champ
        id="forfait"
        label="Forfait déplacement de base"
        required={false}
        defaultValue={etat.saisie?.forfait ?? montant}
        aide="Proposé à chaque demande hors zone, ajustable au cas par cas. Laisse vide pour n’en proposer aucun."
      />
      <p className="mt-2 text-sm text-texte-secondaire">
        Jamais affiché à tes clientes : elles découvrent le montant dans ta proposition, et le
        confirment.
      </p>
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer le forfait</BoutonPrincipal>
    </form>
  )
}
