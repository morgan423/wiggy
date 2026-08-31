/**
 * Avatar — les règles, pas le rendu.
 *
 * Trois sources, dans cet ordre : la photo réelle du pro, puis l'illustration
 * du système à 8 personnages, puis l'initiale sur pastille. Le board est
 * explicite : « la photo réelle du pro reste prioritaire ; l'avatar est
 * l'alternative désirable. »
 *
 * Les illustrations ne sont pas encore dessinées. Ce module décrit donc les
 * trois sources dès maintenant, pour que leur arrivée ne demande qu'un
 * remplissage — pas une refonte.
 */

/** Teintes admises pour une pastille. Le texte associé est imposé, jamais choisi. */
export const PASTILLES = ['action', 'celebration', 'attente', 'prune'] as const
export type Pastille = (typeof PASTILLES)[number]

/**
 * Couleur de texte obligatoire sur chaque pastille.
 * Du blanc sur miel ou abricot tombe sous le seuil de contraste : le pro
 * travaille dehors, en plein soleil.
 */
export const TEXTE_SUR_PASTILLE: Record<Pastille, 'surPlein' | 'surMiel'> = {
  action: 'surPlein',
  prune: 'surPlein',
  celebration: 'surMiel',
  attente: 'surMiel',
}

/** Initiale affichée. Une seule lettre, accents conservés. */
export function initiale(nom: string): string {
  const premier =
    nom
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(' ')[0] ?? ''
  return premier ? premier[0].toLocaleUpperCase('fr-FR') : '?'
}

/**
 * Pastille déterministe : le même nom donne toujours la même couleur, d'un
 * écran à l'autre et d'une session à l'autre. Une couleur tirée au hasard
 * ferait « clignoter » la fiche d'une cliente à chaque rendu.
 */
export function pastillePour(graine: string): Pastille {
  let somme = 0
  for (const c of graine.trim().toLocaleLowerCase('fr-FR')) {
    somme = (somme * 31 + (c.codePointAt(0) ?? 0)) >>> 0
  }
  return PASTILLES[somme % PASTILLES.length]
}

/**
 * Décale la pastille pour éviter deux fois la même couleur côte à côte
 * (règle du système d'avatars). `rang` est la position dans la liste.
 */
export function pastilleDansListe(graine: string, rang: number, precedente?: Pastille): Pastille {
  const choix = pastillePour(graine)
  if (precedente !== choix) return choix
  return PASTILLES[(PASTILLES.indexOf(choix) + 1 + rang) % PASTILLES.length]
}

export type SourceAvatar = 'photo' | 'illustration' | 'initiale'

/** Quelle source utiliser, dans l'ordre de priorité. */
export function sourceAvatar(options: {
  photoUrl?: string | null
  illustration?: string | null
}): SourceAvatar {
  if (options.photoUrl) return 'photo'
  if (options.illustration) return 'illustration'
  return 'initiale'
}
