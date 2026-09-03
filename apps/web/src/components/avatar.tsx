import Image from 'next/image'
import {
  initiale,
  pastillePour,
  TEXTE_SUR_PASTILLE,
  sourceAvatar,
  type Pastille,
} from '@wiggy/core'

/**
 * Avatar à trois sources : photo réelle > illustration > initiale sur pastille.
 *
 * Les 8 personnages du système ne sont pas encore dessinés. Le registre
 * ci-dessous est volontairement vide : le jour où les illustrations arrivent,
 * on le remplit et tous les avatars du produit basculent — aucun écran à
 * retoucher.
 */

/**
 * Registre des illustrations, à remplir quand elles seront livrées.
 * Clé = identifiant du personnage (awa, marc, jeanne, lou, karim, elsa,
 * theo, nadia).
 */
const ILLUSTRATIONS: Record<string, React.ComponentType<{ className?: string }>> = {}

const FOND: Record<Pastille, string> = {
  action: 'bg-action',
  prune: 'bg-prune',
  celebration: 'bg-celebration',
  attente: 'bg-attente',
}
const TEXTE: Record<'surPlein' | 'surMiel', string> = {
  surPlein: 'text-texte-sur-plein',
  surMiel: 'text-texte-sur-miel',
}

export type TailleAvatar = 'xs' | 'sm' | 'md' | 'lg'

const TAILLES: Record<TailleAvatar, { px: number; classe: string }> = {
  // 24 px : le dessin DANS une zone tactile de 44 px. C'est la taille de
  // l'icône d'en-tête (18a), où le visage de la pro remplace la silhouette.
  xs: { px: 24, classe: 'size-6 text-[10px]' },
  // 44 px : la zone tactile minimale, quand l'avatar est cliquable.
  sm: { px: 44, classe: 'size-11 text-base' },
  md: { px: 64, classe: 'size-16 text-2xl' },
  lg: { px: 96, classe: 'size-24 text-4xl' },
}

export function Avatar({
  nom,
  photoUrl,
  illustration,
  taille = 'md',
  pastille,
  className = '',
}: {
  nom: string
  photoUrl?: string | null
  /** Identifiant d'un des 8 personnages, quand ils existeront. */
  illustration?: string | null
  taille?: TailleAvatar
  /** Force la couleur — sert à éviter deux pastilles identiques côte à côte. */
  pastille?: Pastille
  className?: string
}) {
  const { px, classe } = TAILLES[taille]
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : undefined
  // Une illustration annoncée mais absente du registre retombe sur l'initiale
  // plutôt que d'afficher un trou.
  const source = sourceAvatar({ photoUrl, illustration: Illustration ? illustration : null })
  const rond = `overflow-hidden rounded-pilule shrink-0 ${classe} ${className}`

  if (source === 'photo' && photoUrl) {
    return (
      <Image src={photoUrl} alt={nom} width={px} height={px} className={`${rond} object-cover`} />
    )
  }

  if (source === 'illustration' && Illustration) {
    return (
      <span className={rond} role="img" aria-label={nom}>
        <Illustration className="size-full" />
      </span>
    )
  }

  const teinte = pastille ?? pastillePour(nom)
  return (
    <span
      role="img"
      aria-label={nom}
      className={`${rond} ${FOND[teinte]} ${TEXTE[TEXTE_SUR_PASTILLE[teinte]]} flex items-center justify-center font-semibold`}
    >
      {/* L'initiale n'est pas relue par le lecteur d'écran : aria-label porte
          déjà le nom complet. */}
      <span aria-hidden>{initiale(nom)}</span>
    </span>
  )
}
