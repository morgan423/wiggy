'use client'

import { useActionState, useState } from 'react'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { RANGEE } from '@/components/composition'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerForfait } from './actions'

/**
 * A8, planche 14e : le forfait de déplacement de base.
 *
 * Sur la planche, c'est une RANGÉE : libellé et explication à gauche, montant
 * en Fraunces à droite, hors du bloc de texte. L'édition s'ouvre au clic,
 * plutôt que d'occuper l'écran en permanence à côté de la valeur qu'elle
 * modifie.
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
  const [ouvert, setOuvert] = useState(false)

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true)
        }}
        className={`${RANGEE} items-start text-left hover:bg-fond`}
      >
        <span className="flex min-w-0 flex-col gap-px">
          <span className="text-[13px] font-bold">Forfait déplacement de base</span>
          <span className="text-[11.5px] text-texte-attenue">
            proposé à chaque demande, ajustable au cas par cas
          </span>
        </span>
        {/* Pas de forfait posé n'est pas un chiffre : ça ne s'écrit pas en
            Fraunces comme un montant. */}
        {montant ? (
          <span className="prix shrink-0">{montant} €</span>
        ) : (
          <span className="shrink-0 text-[12px] text-texte-attenue">Aucun ›</span>
        )}
      </button>
    )
  }

  return (
    <form action={action} key={etat.n}>
      <Champ
        id="forfait"
        label="Forfait déplacement de base"
        required={false}
        defaultValue={etat.saisie?.forfait ?? montant}
        aide="Proposé à chaque demande hors zone, ajustable au cas par cas. Laisse vide pour n’en proposer aucun."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer le forfait</BoutonPrincipal>
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
