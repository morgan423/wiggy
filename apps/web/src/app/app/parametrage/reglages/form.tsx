'use client'

import { useActionState, useState } from 'react'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher, ListeDeroulante } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerReglages } from './actions'

type Reglages = {
  payment_mode: string
  default_deposit_percent: number
  booking_confirmation_mode: string
  free_cancellation_hours: number
  new_client_buffer_min: number
  sms_enabled: boolean
  gps_app: string
}

/**
 * Les listes portent leur option neutre (R3-1) et sont contrôlées : ce que
 * l'écran montre est ce que le formulaire enverra, par construction.
 */
export function FormReglages({ reglages }: { reglages: Reglages }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerReglages, VIDE)
  const [paiement, setPaiement] = useState(reglages.payment_mode)
  const [confirmation, setConfirmation] = useState(reglages.booking_confirmation_mode)
  const [gps, setGps] = useState(reglages.gps_app)

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
          { valeur: 'auto', texte: 'Confirmées automatiquement' },
          { valeur: 'manual', texte: 'Je valide chaque demande' },
        ]}
      />
      <Champ
        id="free_cancellation_hours"
        label="Annulation gratuite, en heures avant"
        type="number"
        defaultValue={String(reglages.free_cancellation_hours)}
      />
      {/*
        B5 — le tampon « nouvelle cliente ». Une première visite prend toujours
        plus longtemps : on se présente, on regarde les cheveux, on parle. Ce
        temps s'ajoute au créneau proposé, sans jamais s'ajouter au prix.
      */}
      <Champ
        id="new_client_buffer_min"
        label="Temps en plus pour une première visite, en minutes"
        type="number"
        required={false}
        defaultValue={String(reglages.new_client_buffer_min)}
        aide="Une première visite prend plus longtemps. Ce temps s’ajoute au créneau proposé, jamais au prix."
      />
      {/* C3 — l'application de navigation, réglée une fois. Aucune navigation
          embarquée : Wiggy ouvre celle que tu utilises déjà. */}
      <ListeDeroulante
        id="gps_app"
        label="Ton GPS"
        valeur={gps}
        onValeur={setGps}
        optionNeutre="Choisis une application"
        options={[
          { valeur: 'system', texte: 'Celle de mon téléphone' },
          { valeur: 'waze', texte: 'Waze' },
          { valeur: 'google_maps', texte: 'Google Maps' },
        ]}
        aide="Wiggy ouvre ton GPS avec l’adresse dedans. Il ne navigue jamais lui-même."
      />
      <CaseACocher
        id="sms_enabled"
        name="sms_enabled"
        label="Prévenir mes clientes par SMS"
        defaultChecked={reglages.sms_enabled}
        aide="Décoché, tes clientes sont prévenues par e-mail et notification. Elles sont prévenues dans les deux cas."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
