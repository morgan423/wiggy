'use client'

import { useEffect, useState } from 'react'

/**
 * R2-5 — LA VISIONNEUSE DE PHOTOS. Dette ouverte depuis le 02/09.
 *
 * ⚠️ **C'EST LA DONNÉE QUI QUALIFIE LA PRESTATION.** Une cliente envoie ses
 * photos d'inspiration et l'état de ses cheveux ; la pro les voyait en vignette
 * de 96 px et ne pouvait pas les ouvrir. Sur une couleur ou une transformation,
 * une vignette ne dit rien de ce qu'il faut prévoir.
 *
 * Une seule mécanique pour les deux usages : les photos d'un rendez-vous côté
 * pro, et les réalisations de la page publique, où 15a prévoit explicitement la
 * visionneuse au tap.
 *
 * ⚠️ **`<dialog>` NATIF, ET C'EST CE QUI ÉVITE TROIS BOGUES.** Il apporte le
 * fond modal, le piège de focus, la fermeture à Échap et la restauration du
 * focus au retour — quatre comportements qu'une implémentation maison rate
 * presque toujours, et dont l'absence se paie au clavier et au lecteur d'écran.
 * On n'ajoute que ce qu'il ne fait pas : la fermeture au clic hors de l'image.
 *
 * Pas exportée : elle n'a de sens qu'avec ses vignettes, et un écran qui
 * l'emploierait seul devrait réécrire l'ouverture.  est la seule
 * porte d'entrée.
 */
function Visionneuse({
  photos,
  ouverteA,
  onFerme,
}: {
  photos: readonly { url: string; alt: string }[]
  /** L'index ouvert, ou `null` quand la visionneuse est fermée. */
  ouverteA: number | null
  onFerme: () => void
}) {
  const [dialogue, setDialogue] = useState<HTMLDialogElement | null>(null)

  useEffect(() => {
    if (!dialogue) return
    if (ouverteA !== null && !dialogue.open) dialogue.showModal()
    if (ouverteA === null && dialogue.open) dialogue.close()
  }, [dialogue, ouverteA])

  const photo = ouverteA === null ? undefined : photos[ouverteA]

  return (
    <dialog
      ref={setDialogue}
      onClose={onFerme}
      /* Le clic sur le fond ferme : la cible de l'événement est alors le
         `dialog` lui-même, jamais l'image qu'il contient. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onFerme()
      }}
      className="max-h-[92dvh] max-w-[94vw] rounded-bloc bg-transparent p-0 backdrop:bg-prune/80"
    >
      {photo ? (
        <div className="flex flex-col items-center gap-3">
          {/* Pas de `next/image` : ces URL sont signées et expirent, ou viennent
              d'un stockage public qui change avec lui. */}
          <img
            src={photo.url}
            alt={photo.alt}
            className="max-h-[80dvh] max-w-full rounded-carte object-contain"
          />
          <button
            type="button"
            onClick={onFerme}
            className="tactile rounded-pilule bg-surface px-5 text-[13px] font-bold"
          >
            Fermer
          </button>
        </div>
      ) : null}
    </dialog>
  )
}

/**
 * Une grille de vignettes qui s'ouvrent au tap.
 *
 * Les vignettes sont des BOUTONS, pas des images cliquables : c'est ce qui les
 * rend atteignables au clavier et annoncées comme actionnables. Une image dans
 * un `onClick` ne l'est ni l'un ni l'autre.
 */
export function GrillePhotos({
  photos,
  classeVignette = 'size-24',
}: {
  photos: readonly { url: string; alt: string }[]
  classeVignette?: string
}) {
  const [ouverteA, setOuverteA] = useState<number | null>(null)

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {photos.map((photo, i) => (
          <li key={photo.url}>
            <button
              type="button"
              onClick={() => {
                setOuverteA(i)
              }}
              aria-label={`Agrandir : ${photo.alt}`}
              className={`tactile block overflow-hidden rounded-champ ${classeVignette}`}
            >
              <img src={photo.url} alt={photo.alt} className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Visionneuse
        photos={photos}
        ouverteA={ouverteA}
        onFerme={() => {
          setOuverteA(null)
        }}
      />
    </>
  )
}
