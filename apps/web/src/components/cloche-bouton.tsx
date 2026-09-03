'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * D17 ⑤ — la cloche, ou la croix quand le panneau est ouvert. Planche 18a.
 *
 * **Pas de lien de sortie, pas de navigation.** Le centre de notifications
 * n'est pas un écran ordinaire : il RECOUVRE celui sur lequel la pro
 * travaillait. La croix le referme là où il s'est ouvert, par un retour en
 * arrière, et l'écran d'avant revient tel qu'elle l'avait laissé. Un lien de
 * sortie l'aurait renvoyée quelque part, ce qui n'est pas la même chose que
 * refermer.
 *
 * **La bascule est une TRANSITION, pas un échange d'images** (18a). Les deux
 * dessins sont empilés en permanence dans le même bouton : la cloche pivote de
 * 30 degrés et s'efface, la croix arrive en tournant dans l'autre sens, en
 * fondu croisé sur `--duree-fondu` et la courbe standard. Deux `<svg>` échangés
 * auraient sauté d'un état à l'autre — un fondu croisé a besoin que les deux
 * images coexistent.
 *
 * `motion-reduce` retire les rotations et garde le fondu seul, comme la planche
 * le demande : ce qui gêne est le mouvement, pas le changement.
 */
const CHEMIN = '/app/notifications'

/**
 * L'état d'où l'on vient, hors du cycle de vie React.
 *
 * L'en-tête vit dans chaque page et non dans le layout : naviguer vers le
 * centre DÉMONTE la cloche et en remonte une neuve, qui s'afficherait
 * directement en croix — sans transition, puisqu'il n'y a pas eu de changement
 * à animer. Ce module-ci survit à la navigation. La cloche remonte donc dans
 * l'état d'avant, puis bascule à la première frame : la transition a de nouveau
 * quelque chose à traverser.
 *
 * C'est une continuité d'affichage, pas une donnée : rien ici ne doit jamais
 * être lu comme une vérité sur le compte.
 */
let etatPrecedent = false

export function ClocheOuCroix({ badge }: { badge: string | null }) {
  const chemin = usePathname()
  const router = useRouter()
  const ouvert = chemin === CHEMIN
  const [croix, setCroix] = useState(etatPrecedent)

  useEffect(() => {
    etatPrecedent = ouvert
    setCroix(ouvert)
  }, [ouvert])

  // 44 px de zone tactile, 24 px de dessin dedans (18a). Le survol est un
  // VOILE de crème à 12 % : il se pose par-dessus le prune, il ne remplace
  // aucun fond.
  const commun =
    'tactile relative size-11 shrink-0 rounded-pilule hover:bg-fond/12 focus-visible:bg-fond/12'
  const couche =
    'absolute size-6 transition-[opacity,rotate] duration-[var(--duree-fondu)] ease-out motion-reduce:transition-opacity motion-reduce:rotate-0'

  const dessins = (
    <>
      {/* La cloche : pleine et arrondie, le langage de la nav. Elle ne dépend
          d'aucune police ni d'aucun rendu système, et elle sera identique sur
          les deux enveloppes. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${couche} ${croix ? 'rotate-30 opacity-0' : 'rotate-0 opacity-100'}`}
      >
        <path d="M12 3.5c-3.2 0-5.4 2.3-5.4 5.4v2.9l-1.4 2.4c-.4.7.1 1.5.9 1.5h11.8c.8 0 1.3-.8.9-1.5l-1.4-2.4V8.9c0-3.1-2.2-5.4-5.4-5.4Z" />
        <circle cx="12" cy="19.3" r="1.9" />
      </svg>
      {/* La croix, en miel : le panneau est ouvert, et le miel dit « ceci est
          l'état en cours », pas « attention ». */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={`${couche} text-celebration ${croix ? 'rotate-0 opacity-100' : '-rotate-25 opacity-0'}`}
        fill="currentColor"
      >
        <rect x="10.7" y="4.5" width="2.6" height="15" rx="1.3" transform="rotate(45 12 12)" />
        <rect x="10.7" y="4.5" width="2.6" height="15" rx="1.3" transform="rotate(-45 12 12)" />
      </svg>
    </>
  )

  if (ouvert) {
    return (
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => {
          router.back()
        }}
        className={`${commun} text-fond`}
      >
        {dessins}
      </button>
    )
  }

  return (
    <Link
      href={CHEMIN}
      aria-label="Pendant que tu coiffais"
      className={`${commun} text-texte-sur-plein-doux hover:text-fond`}
    >
      {dessins}
      {/*
        Le badge DISPARAÎT à l'ouverture (18a) : ce qui est vu n'est plus
        compté. Il n'est donc rendu que sur la branche fermée. Et aucun badge
        quand il n'y a rien de non lu, jamais de « 0 » — une pastille
        permanente apprend à être ignorée.

        La bordure prune détache la pastille de l'icône sous elle : sans elle,
        framboise sur prune se touchent et la forme devient illisible.
      */}
      {badge ? (
        <span
          className={`absolute top-1 box-border flex h-[15px] min-w-[15px] items-center justify-center rounded-pilule border-[1.5px] border-prune bg-action font-extrabold text-texte-sur-plein ${
            badge === '9+' ? 'right-px px-[3px] text-[8px]' : 'right-1 px-0.5 text-[9px]'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  )
}
