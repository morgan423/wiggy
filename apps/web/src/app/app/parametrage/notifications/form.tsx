'use client'

import { useActionState } from 'react'
import { copy } from '@wiggy/copy'
import { Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { CaseACocher } from '@/components/trousse'
import { VIDE, type EtatForm } from '@/lib/forms'
import { enregistrerNotifications } from './actions'

/**
 * Les bascules push, et le canal des rappels clientes.
 *
 * **Réponse d'une cliente : cochée par défaut**, c'est une attente. Une pro qui
 * a contre-proposé attend la réponse et ne doit pas avoir à ouvrir l'app pour
 * la découvrir.
 *
 * **Avis reçu : au choix.** Un avis n'appelle aucune action, et le recevoir en
 * pleine prestation n'apporte rien.
 */
export function FormNotifications({
  reglages,
}: {
  reglages: { push_reponse_cliente: boolean; push_avis: boolean }
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(enregistrerNotifications, VIDE)
  const N = copy.notificationCopilote

  return (
    <form action={action} key={etat.n}>
      <CaseACocher
        id="push_reponse_cliente"
        name="push_reponse_cliente"
        label={N.$aEcrire.pushReponse}
        defaultChecked={reglages.push_reponse_cliente}
        aide={N.$aEcrire.pushReponseAide}
      />
      <CaseACocher
        id="push_avis"
        name="push_avis"
        label={N.$aEcrire.pushAvis}
        defaultChecked={reglages.push_avis}
        aide={N.$aEcrire.pushAvisAide}
      />

      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>Enregistrer</BoutonPrincipal>
    </form>
  )
}
