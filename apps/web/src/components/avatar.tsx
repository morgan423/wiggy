import Image from 'next/image'
import {
  initiale,
  pastillePour,
  estUneIllustration,
  urlIllustration,
  TEXTE_SUR_PASTILLE,
  sourceAvatar,
  type Pastille,
} from '@wiggy/core'

/**
 * Avatar à trois sources : photo réelle > illustration > initiale sur pastille.
 *
 * Les huit personnages sont **arrivés le 04/09**. Le registre qui les attendait
 * était vide ; il n'y a eu qu'à le remplir, et tous les avatars du produit
 * basculent sans qu'aucun écran soit retouché — c'était l'intention.
 *
 * ⚠️ **La pastille fait partie de l'image.** Les fichiers livrés portent leur
 * disque de couleur peint dedans. On ne la recolore pas, on ne la découpe pas :
 * la variante sur fond transparent n'existe pas encore, et la simuler en
 * rognant le fichier donnerait un bord sale sur toutes les surfaces claires.
 * Si un écran en a besoin, ça se signale à Design — ça ne se bricole pas.
 *
 * ⚠️ **Ce sont des ILLUSTRATIONS, jamais des photos de personnes réelles.**
 * Elles ne remplacent pas la photo d'une pro : elles tiennent sa place tant
 * qu'elle n'en a pas mis une. D'où l'ordre des sources, inchangé.
 */

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

/**
 * Quel fichier servir pour un diamètre d'affichage donné.
 *
 * Deux tailles sont livrées, et le choix se DÉDUIT : au-delà de 80 px, le 160
 * se verrait pixelisé sur un écran à double densité ; en dessous, le 320 ferait
 * charger quatre fois le poids utile. Laisser l'appelant choisir son fichier,
 * c'était ouvrir la porte à une troisième taille qui n'existe pas.
 */
const fichierPour = (id: string, px: number) => urlIllustration(id, px > 80 ? 320 : 160)

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
  diametre,
  surPlein = false,
  pastille,
  className = '',
}: {
  nom: string
  photoUrl?: string | null
  /** Identifiant d'un des huit personnages : awa, marc, jeanne, lou… */
  illustration?: string | null
  taille?: TailleAvatar
  /**
   * Diamètre en pixels, pour les **compositions du site public seulement**.
   *
   * La planche 19a pose quatre diamètres — 40, 48, 76, 112 — qui n'appartiennent
   * pas à l'échelle du produit : ce sont des choix de mise en page, pas des
   * tailles d'interface. Les inscrire dans `TAILLES` aurait fait passer une
   * composition de page pour une règle du système. Dans le produit, on prend
   * `taille`, et rien d'autre.
   */
  diametre?: number
  /**
   * L'avatar posé sur une SURFACE PLEINE (planche 20a, en-tête prune).
   *
   * Sur du prune, aucune pastille de la palette ne convient : les quatre
   * teintes y font une tache, et le prune s'y confond avec son fond — c'est
   * exactement le défaut que `vues` a relevé dans l'en-tête d'écran. La planche
   * pose donc un disque translucide et l'initiale en crème atténuée. C'est le
   * contraire d'une pastille : elle tient la place sans se signaler.
   */
  surPlein?: boolean
  /** Force la couleur — sert à éviter deux pastilles identiques côte à côte. */
  pastille?: Pastille
  className?: string
}) {
  const px = diametre ?? TAILLES[taille].px
  const classe = diametre ? '' : TAILLES[taille].classe
  const mesure = diametre ? { width: px, height: px } : undefined

  // Une illustration annoncée mais absente du catalogue retombe sur l'initiale
  // plutôt que d'afficher un trou.
  const connue = illustration && estUneIllustration(illustration) ? illustration : null
  const source = sourceAvatar({ photoUrl, illustration: connue })
  const rond = `overflow-hidden rounded-pilule shrink-0 ${classe} ${className}`

  if (source === 'photo' && photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={nom}
        width={px}
        height={px}
        style={mesure}
        className={`${rond} object-cover`}
      />
    )
  }

  if (source === 'illustration' && connue) {
    return (
      <Image
        src={fichierPour(connue, px)}
        alt={nom}
        width={px}
        height={px}
        style={mesure}
        className={rond}
      />
    )
  }

  if (surPlein) {
    return (
      <span
        role="img"
        aria-label={nom}
        style={mesure}
        className={`${rond} flex items-center justify-center bg-texte-sur-plein/15`}
      >
        <span aria-hidden className="titre text-texte-sur-plein-doux">
          {initiale(nom)}
        </span>
      </span>
    )
  }

  const teinte = pastille ?? pastillePour(nom)
  return (
    <span
      role="img"
      aria-label={nom}
      style={mesure}
      className={`${rond} ${FOND[teinte]} ${TEXTE[TEXTE_SUR_PASTILLE[teinte]]} flex items-center justify-center font-semibold`}
    >
      {/* L'initiale n'est pas relue par le lecteur d'écran : aria-label porte
          déjà le nom complet. */}
      <span aria-hidden>{initiale(nom)}</span>
    </span>
  )
}
