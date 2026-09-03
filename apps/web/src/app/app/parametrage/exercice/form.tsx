'use client'

import { useActionState, useState } from 'react'
import { Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher, ListeDeroulante } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerExercice } from './actions'

/**
 * Le mode d'exercice (D10 ①) et l'application de navigation (C3), ensemble.
 *
 * Ils répondent à la même question : **comment tu travailles**. Le mode décide
 * si une cliente indique son adresse ; le GPS décide de ce qui s'ouvre quand tu
 * pars. Aucune navigation embarquée, jamais : Wiggy ouvre l'application que la
 * pro utilise déjà.
 *
 * Un seul écran pour ce réglage, désormais. Il était éditable à deux endroits
 * après la première passe de D17, et deux endroits pour un réglage, ce sont
 * deux vérités possibles.
 */
export function FormExercice({ mode, app }: { mode: string; app: string }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerExercice, VIDE)
  const [gps, setGps] = useState(app)

  return (
    <form action={action} key={etat.n}>
      <CaseACocher
        id="mode"
        name="mode"
        label="Je reçois mes clientes à un poste fixe"
        defaultChecked={mode === 'fixe'}
        aide="Salon à domicile, fauteuil loué. Sans cette case, Wiggy considère que tu te déplaces, et tes clientes indiquent leur adresse en réservant."
      />
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
        aide="Wiggy l’ouvre avec l’adresse dedans. Il ne navigue jamais lui-même."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
