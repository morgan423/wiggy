/**
 * Slug de la page publique du pro (A1) — c'est l'URL qu'il partagera dans sa
 * bio Instagram, ses messages et sa fiche Google. Elle doit être courte,
 * lisible et stable.
 *
 * La contrainte de la base impose 3 à 50 caractères, bornés par un
 * alphanumérique : ce module garantit cette forme, quoi qu'on lui donne.
 */

export const SLUG_MIN = 3
export const SLUG_MAX = 50

export function slugify(texte: string): string {
  const base = texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')

  if (base.length >= SLUG_MIN) return base
  // Un nom trop court ou entièrement non latin ne doit pas produire d'URL
  // invalide : on retombe sur une base neutre, que le suffixe rendra unique.
  return base ? `${base}-pro`.slice(0, SLUG_MAX) : 'pro'
}

/** Variante numérotée, pour résoudre une collision : alice, alice-2, alice-3… */
export function slugAvecSuffixe(base: string, rang: number): string {
  if (rang <= 1) return base
  const suffixe = `-${rang}`
  return base.slice(0, SLUG_MAX - suffixe.length).replace(/-+$/, '') + suffixe
}
