/**
 * A4 : les photos jointes à la réservation.
 *
 * Elles ne sont pas décoratives. Une cliente qui montre ses cheveux au naturel
 * et son inspiration permet au pro de qualifier la prestation ET sa durée :
 * sans elles, l'échange repart sur WhatsApp et le rendez-vous se cale au
 * jugé. Une couleur mal estimée, c'est une heure de retard sur toute la
 * tournée.
 *
 * Ce module ne touche ni au réseau ni au disque : il dit ce qui est acceptable.
 */

/** Au-delà, on encombre la cliente autant que le pro. */
export const PHOTOS_MAX = 5

/** Le seau de stockage applique la même limite, côté serveur. */
export const PHOTO_TAILLE_MAX = 5 * 1024 * 1024

/**
 * HEIC est là parce que c'est le format par défaut d'un iPhone. L'accepter au
 * dépôt évite un refus incompréhensible ; l'affichage se débrouille ensuite.
 */
export const PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export type TypePhoto = (typeof PHOTO_TYPES)[number]

/** Ce qu'on sait d'un fichier avant de le lire. */
export type FichierPhoto = { type: string; size: number }

export type RefusPhoto = 'trop-nombreuses' | 'trop-lourde' | 'format'

export type ValidationPhotos =
  { ok: true; retenues: FichierPhoto[] } | { ok: false; raison: RefusPhoto }

/**
 * Valide un lot de photos.
 *
 * Les fichiers vides sont ignorés en silence : un champ `input[type=file]` non
 * rempli envoie un fichier de zéro octet, ce n'est pas une erreur de la
 * cliente et ça n'a pas à lui être signalé.
 */
export function validerPhotos(fichiers: FichierPhoto[]): ValidationPhotos {
  const retenues = fichiers.filter((f) => f.size > 0)
  if (retenues.length > PHOTOS_MAX) return { ok: false, raison: 'trop-nombreuses' }
  for (const fichier of retenues) {
    if (!estTypePhoto(fichier.type)) return { ok: false, raison: 'format' }
    if (fichier.size > PHOTO_TAILLE_MAX) return { ok: false, raison: 'trop-lourde' }
  }
  return { ok: true, retenues }
}

export function estTypePhoto(type: string): type is TypePhoto {
  return (PHOTO_TYPES as readonly string[]).includes(type)
}

/** Extension de fichier correspondant au type déclaré. */
export function extensionPhoto(type: string): string {
  switch (type) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return 'jpg'
  }
}
