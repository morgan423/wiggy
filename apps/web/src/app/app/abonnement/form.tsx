'use client'

import { useActionState } from 'react'
import { Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { basculerSms } from './actions'

/**
 * B7 et 17c — le canal des rappels vit avec l'offre, parce que c'est l'offre
 * qui le contient.
 *
 * Décoché, les clientes sont prévenues par e-mail et notification,
 * gratuitement. **Elles sont prévenues dans les deux cas**, et c'est la seule
 * chose qui compte pour elles.
 */
export function FormSms({ actif }: { actif: boolean }) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(basculerSms, VIDE)

  return (
    <form action={action} key={etat.n}>
      <CaseACocher
        id="sms_enabled"
        name="sms_enabled"
        label="Prévenir mes clientes par SMS"
        defaultChecked={actif}
        aide="Décoché, tes clientes sont prévenues par e-mail et notification. Elles sont prévenues dans les deux cas."
      />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
