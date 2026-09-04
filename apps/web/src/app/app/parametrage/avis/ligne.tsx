'use client'

import { useOptimistic, startTransition } from 'react'
import { RANGEE } from '@/components/composition'
import { changerStatutAvis } from './actions'

type Avis = {
  id: string
  prenom: string
  note: number
  texte: string | null
  statut: string
}

/** Un avis, et les deux seuls gestes possibles : publier, masquer. */
export function LigneAvis({ avis, quand }: { avis: Avis; quand: string }) {
  const [statut, poser] = useOptimistic(avis.statut, (_, neuf: string) => neuf)

  const basculer = (vers: string) => {
    startTransition(async () => {
      poser(vers)
      await changerStatutAvis(avis.id, vers)
    })
  }

  return (
    <div className={`${RANGEE} flex-col items-start gap-2`}>
      <span className="flex w-full items-center justify-between gap-3">
        <span className="text-[13.5px] font-bold">
          {avis.prenom}
          <span aria-label={`${String(avis.note)} sur 5`} className="ml-2 text-celebration">
            {'★'.repeat(avis.note)}
            <span className="text-trait-discret">{'★'.repeat(5 - avis.note)}</span>
          </span>
        </span>
        <span className="shrink-0 text-[11.5px] text-texte-attenue">{quand}</span>
      </span>
      {avis.texte ? (
        <p className="text-[12.5px] leading-[1.55] text-texte-secondaire">« {avis.texte} »</p>
      ) : null}
      <span className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => {
            basculer(statut === 'publie' ? 'masque' : 'publie')
          }}
          className={`tactile rounded-pilule px-4 text-[12.5px] font-bold ${
            statut === 'publie'
              ? 'bg-celebration text-texte-sur-miel'
              : 'bg-action text-texte-sur-plein'
          }`}
        >
          {statut === 'publie' ? 'En ligne' : 'Publier'}
        </button>
        {statut !== 'en_attente' && statut !== 'masque' ? null : (
          <span className="tactile px-1 text-[12px] text-texte-attenue">
            {statut === 'masque' ? 'Masqué' : 'Pas encore en ligne'}
          </span>
        )}
      </span>
    </div>
  )
}
