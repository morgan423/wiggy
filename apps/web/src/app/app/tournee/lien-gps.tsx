'use client'

import { commencerLaTournee } from '@/app/app/agenda/actions'

/**
 * C3 et D15 — le lien GPS, qui lance aussi la journée.
 *
 * **Personne n'ouvre un itinéraire sans partir.** C'est le plus honnête des
 * deux gestes de lancement : le bouton demande une intention supplémentaire,
 * celui-ci constate un départ qui a réellement lieu.
 *
 * L'enregistrement part en arrière-plan et ne retarde pas l'ouverture : la pro
 * est dans sa voiture, elle n'attend pas notre base de données. S'il échoue,
 * elle garde le bouton explicite, et son GPS s'est ouvert quand même.
 */
export function LienGps({
  href,
  jour,
  dejaLancee,
  children,
}: {
  href: string
  jour: string
  dejaLancee: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      onClick={() => {
        if (dejaLancee) return
        const donnees = new FormData()
        donnees.set('jour', jour)
        void commencerLaTournee(donnees)
      }}
      className="tactile w-full rounded-pilule bg-action py-3 text-center text-[13px] font-bold text-texte-sur-plein hover:bg-action-survol"
    >
      {children}
    </a>
  )
}
