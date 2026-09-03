'use client'

import { useState } from 'react'
import { copy } from '@wiggy/copy'
import { commencerLaTournee } from '@/app/app/agenda/actions'

/**
 * D15 et D16 — le lancement de journée, et la confirmation du point de départ.
 *
 * Sans lancement, rien n'est « en cours » : l'app peut constater qu'une heure
 * est passée, elle ne peut pas décider que la pro est partie.
 *
 * ⚠️ **La position actuelle sert au CALCUL et n'est jamais stockée.** Aucun
 * historique de localisation, sous aucun prétexte. Elle part avec ce
 * formulaire, vit une journée dans un cookie de session, et s'efface seule.
 * Le texte d'aide le dit à la pro : personne ne devrait avoir à deviner ce
 * qu'on fait de sa position.
 */
export function Lancement({ jour, depart }: { jour: string; depart: string | null }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [refusee, setRefusee] = useState(false)
  const T = copy.agendaTournee

  return (
    <form action={commencerLaTournee} className="flex flex-col gap-2">
      <input type="hidden" name="jour" value={jour} />
      {position ? (
        <>
          <input type="hidden" name="lat" value={String(position.lat)} />
          <input type="hidden" name="lng" value={String(position.lng)} />
        </>
      ) : null}

      {(depart ?? position) ? (
        <p className="text-[12px] text-texte-attenue">
          <span className="font-bold">{T.$aEcrire.departConfirmer}</span>{' '}
          {position ? T.$aEcrire.departPosition.toLowerCase() : depart}
        </p>
      ) : null}

      <button
        type="submit"
        className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
      >
        {T.$aEcrire.lancerJournee}
      </button>

      <button
        type="button"
        onClick={() => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setRefusee(false)
              setPosition({ lat: p.coords.latitude, lng: p.coords.longitude })
            },
            () => {
              // Refus ou indisponibilité : on garde l'adresse de départ. Une
              // permission refusée n'est pas une panne, c'est une réponse.
              setRefusee(true)
            },
          )
        }}
        className="tactile w-full text-[12px] font-bold text-texte-attenue hover:text-prune"
      >
        {T.$aEcrire.departPosition}
      </button>
      <p className="text-center text-[11.5px] text-texte-attenue">
        {refusee ? T.$aEcrire.departPositionRefusee : T.$aEcrire.departPositionAide}
      </p>
    </form>
  )
}
