'use client'

import { useActionState } from 'react'
import { copy } from '@wiggy/copy'
import { formatEuros } from '@wiggy/core'
import { Champ, Erreur, Succes, BoutonPrincipal } from '@/components/champs'
import { proposerForfait } from './proposer/actions'
import { VIDE, type EtatForm } from '@/lib/forms'

/**
 * A8 — le forfait de déplacement, proposé au cas par cas.
 *
 * ⚠️ **IL N'APPARAÎT QUE SUR UNE DEMANDE HORS ZONE**, et seulement tant qu'elle
 * attend une décision. Ailleurs, il proposerait de facturer un déplacement que
 * la pro n'a pas à faire.
 *
 * Le montant de base est **PRÉ-REMPLI, pas imposé** : c'est le réglage de son
 * écran de zone (14e), qui lui évite de retaper son montant habituel à chaque
 * demande. Elle l'accepte d'un geste ou saisit autre chose — trente kilomètres
 * de montagne ne se facturent pas comme trente kilomètres de nationale.
 *
 * ⚠️ **LE RENDEZ-VOUS NE BOUGE PAS ICI.** Il ne bougera qu'à l'acceptation de
 * la cliente. Une pro qui ajouterait un forfait sans son accord lui imposerait
 * un prix qu'elle n'a pas choisi, ce qu'A11 interdit déjà pour le reste.
 */
export function FormForfaitDemande({
  id,
  baseCentimes,
  prixCentimes,
}: {
  id: string
  /** Son forfait de base, s'il est réglé. Sinon la pro saisit librement. */
  baseCentimes: number | null
  prixCentimes: number
}) {
  const [etat, action, enCours] = useActionState<EtatForm, FormData>(proposerForfait, VIDE)
  const D = copy.demandesPro

  return (
    <form action={action} key={etat.n} className="rounded-carte bg-fond">
      <h3 className="text-[13px] font-bold">{D.$aEcrire.forfaitTitre}</h3>
      <p className="mt-1 text-[11.5px] leading-[1.5] text-texte-attenue">
        {D.$aEcrire.forfaitAide}
      </p>
      <input type="hidden" name="id" value={id} />
      <Champ
        id="forfait"
        label={D.$aEcrire.forfaitLabel}
        defaultValue={
          etat.statut === 'erreur'
            ? (etat.saisie?.forfait ?? '')
            : baseCentimes !== null
              ? (baseCentimes / 100).toFixed(2).replace('.', ',')
              : ''
        }
        aide={
          baseCentimes !== null
            ? `${D.$aEcrire.forfaitBase} : ${formatEuros(baseCentimes)}. Le prix passerait à ${formatEuros(prixCentimes + baseCentimes)}.`
            : 'En euros, par exemple 10,00'
        }
      />
      <Champ id="message" label="Un mot pour ta cliente" required={false} />
      <Erreur message={etat.statut === 'erreur' ? etat.message : undefined} />
      <Succes message={etat.statut === 'ok' ? etat.message : undefined} />
      <BoutonPrincipal enCours={enCours}>{D.$aEcrire.forfaitEnvoyer}</BoutonPrincipal>
    </form>
  )
}
