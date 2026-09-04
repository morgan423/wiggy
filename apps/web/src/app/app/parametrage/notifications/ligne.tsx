'use client'

import { useOptimistic, startTransition } from 'react'
import { RANGEE } from '@/components/composition'
import { basculerNotification } from './actions'

/**
 * Une ligne de la matrice : l'événement, puis ses deux interrupteurs.
 *
 * Optimiste : la bascule répond au doigt et l'écriture suit. Attendre le
 * serveur pour bouger un interrupteur donne l'impression d'un produit qui rame,
 * et on en tape deux fois.
 */
export function LigneMatrice({
  cle,
  libelle,
  explication,
  attend,
  badge,
  push,
}: {
  cle: string
  libelle: string
  explication: string
  attend: string | null
  badge: boolean
  push: boolean
}) {
  const [etat, poser] = useOptimistic(
    { badge, push },
    (courant, action: { canal: 'badge' | 'push'; valeur: boolean }) => ({
      ...courant,
      [action.canal]: action.valeur,
    }),
  )

  const basculer = (canal: 'badge' | 'push', valeur: boolean) => {
    startTransition(async () => {
      poser({ canal, valeur })
      await basculerNotification(cle, canal, valeur)
    })
  }

  return (
    <div className={`${RANGEE} items-start`}>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[13.5px] leading-[1.35] font-bold">
          {libelle}
          {/* Un événement dont la fonctionnalité n'existe pas se DIT, il ne se
              masque pas : un réglage sans émetteur ment moins s'il l'annonce. */}
          {attend ? (
            <span className="ml-2 rounded-pilule bg-fond px-2 py-0.5 text-[10px] font-extrabold text-texte-attenue">
              bientôt
            </span>
          ) : null}
        </span>
        <span className="text-[11.5px] leading-[1.4] text-texte-attenue">{explication}</span>
      </span>
      <span className="flex shrink-0 gap-3">
        <Interrupteur
          libelle={`Badge · ${libelle}`}
          actif={etat.badge}
          onBascule={(v) => {
            basculer('badge', v)
          }}
        />
        <Interrupteur
          libelle={`Push · ${libelle}`}
          actif={etat.push}
          onBascule={(v) => {
            basculer('push', v)
          }}
        />
      </span>
    </div>
  )
}

/** L'interrupteur du système, aux couleurs du produit. 44 px de zone tactile. */
function Interrupteur({
  libelle,
  actif,
  onBascule,
}: {
  libelle: string
  actif: boolean
  onBascule: (valeur: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      onClick={() => {
        onBascule(!actif)
      }}
      className={`tactile relative h-6 w-11 shrink-0 rounded-pilule transition-colors ${
        actif ? 'bg-action' : 'bg-trait-discret'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-pilule bg-surface transition-[left] duration-[var(--duree-segment)] ${
          actif ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  )
}
