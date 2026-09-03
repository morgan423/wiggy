'use client'

import { useActionState, useState } from 'react'
import { copy } from '@wiggy/copy'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { ListeDeroulante } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerPaiement } from './actions'

type Reglages = {
  payment_mode: string
  default_deposit_percent: number
  booking_confirmation_mode: string
}

/**
 * A11 ① — le mode de confirmation est un réglage par pro, et il a enfin son
 * écran. La colonne `booking_confirmation_mode` existe dans `pro_settings`
 * depuis la première migration et attendait depuis le début.
 *
 * Le texte d'aide dit la conséquence CÔTÉ CLIENTE, parce que c'est elle qui
 * décide : le badge de la page publique change, et une cliente qui voit
 * « sur validation » sait ce qui l'attend avant de réserver.
 */
export function FormPaiement({ reglages }: { reglages: Reglages }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerPaiement, VIDE)
  const [paiement, setPaiement] = useState(reglages.payment_mode)
  const [confirmation, setConfirmation] = useState(reglages.booking_confirmation_mode)
  const C = copy.reservationCliente

  return (
    <form action={action} key={etat.n}>
      <ListeDeroulante
        id="payment_mode"
        label="Le paiement"
        valeur={paiement}
        onValeur={setPaiement}
        optionNeutre="Choisis un mode"
        options={[
          { valeur: 'off', texte: 'Sur place, à la fin' },
          { valeur: 'client_choice', texte: 'Au choix de la cliente' },
          { valeur: 'required', texte: 'Acompte à la réservation' },
        ]}
      />
      <Champ
        id="default_deposit_percent"
        label="Acompte, en %"
        type="number"
        defaultValue={String(reglages.default_deposit_percent)}
        aide="Sert quand une prestation n’a pas son propre acompte."
      />
      <ListeDeroulante
        id="booking_confirmation_mode"
        label="Les réservations en ligne"
        valeur={confirmation}
        onValeur={setConfirmation}
        optionNeutre="Choisis un mode"
        options={[
          { valeur: 'auto', texte: C.$aEcrire.badgeImmediate },
          { valeur: 'manual', texte: C.$aEcrire.badgeValidation },
        ]}
        aide={C.$aEcrire.confirmationAide}
      />

      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
