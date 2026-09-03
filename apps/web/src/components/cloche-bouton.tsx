'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * D17 ⑤ — la cloche, ou la croix quand le panneau est ouvert.
 *
 * **Pas de lien de sortie, pas de navigation.** Le centre de notifications
 * n'est pas un écran ordinaire : il RECOUVRE celui sur lequel la pro
 * travaillait. La croix le referme là où il s'est ouvert, par un retour en
 * arrière, et l'écran d'avant revient tel qu'elle l'avait laissé.
 *
 * Un lien de sortie l'aurait renvoyée quelque part, ce qui n'est pas la même
 * chose que refermer.
 */
const CHEMIN = '/app/notifications'

export function ClocheOuCroix({ badge }: { badge: string | null }) {
  const chemin = usePathname()
  const router = useRouter()
  const commun =
    'tactile relative size-11 shrink-0 rounded-pilule text-texte-sur-plein hover:bg-texte-sur-plein/14'

  if (chemin === CHEMIN) {
    return (
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => {
          router.back()
        }}
        className={commun}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6 6.4 5Z" />
        </svg>
      </button>
    )
  }

  return (
    <Link href={CHEMIN} aria-label="Pendant que tu coiffais" className={commun}>
      {/* Une cloche dessinée : elle ne dépend d'aucune police ni d'aucun rendu
          système, et elle sera identique sur les deux enveloppes. */}
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2a5 5 0 0 0-5 5v3.6l-1.4 2.8A1 1 0 0 0 6.5 15h11a1 1 0 0 0 .9-1.6L17 10.6V7a5 5 0 0 0-5-5Z" />
        <path d="M10 17a2 2 0 1 0 4 0h-4Z" />
      </svg>
      {badge ? (
        <span className="absolute top-1 right-1 rounded-pilule bg-action px-1.5 py-px text-[10px] font-extrabold text-texte-sur-plein">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
