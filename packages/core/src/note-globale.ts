/**
 * La note globale de la page publique (planche 20a).
 *
 * ⚠️ **ELLE EST CALCULÉE, JAMAIS STOCKÉE.** Aucune colonne, aucune migration :
 * une moyenne rangée en base se désynchronise du jour où un avis est masqué,
 * modéré ou supprimé, et personne ne voit qu'elle ment. Elle se recalcule à
 * chaque rendu, à partir des seuls avis publiés.
 *
 * ⚠️ **LE SEUIL EST À TROIS AVIS, ET C'EST LE CŒUR DU MODULE.**
 *
 *   3 et plus → « 4,9 sur 5 · 23 avis »
 *   1 ou 2    → le NOMBRE SEUL, sans moyenne
 *   0         → rien du tout, jamais un zéro
 *
 * Le motif vaut d'être compris plutôt que suivi : **une moyenne sur un ou deux
 * avis est un avis déguisé en statistique.** « 5 sur 5 » avec un seul avis
 * n'informe pas, il maquille. Et il dessert la pro le jour où le deuxième avis
 * est à 3 : sa note s'effondre de moitié sans que rien n'ait changé de son
 * travail.
 *
 * C'est exactement la règle du rythme de retour d'une cliente, qui attend la
 * troisième visite avant de prétendre connaître une habitude. Le dépôt a une
 * seule façon de traiter les petits nombres : **mieux vaut ne rien savoir que
 * croire savoir.**
 */

/** Le seuil sous lequel on ne moyenne pas. Trois, comme le rythme de retour. */
export const SEUIL_MOYENNE = 3

export type NoteGlobale =
  /** Assez d'avis pour une moyenne qui veut dire quelque chose. */
  | { readonly forme: 'moyenne'; readonly moyenne: number; readonly nombre: number }
  /** Un ou deux avis : on dit combien, on ne dit pas quelle note. */
  | { readonly forme: 'nombre'; readonly nombre: number }
  /** Aucun avis : la ligne disparaît. Il n'y a jamais de zéro. */
  | { readonly forme: 'aucune' }

/**
 * La note affichable à partir des avis publiés.
 *
 * La moyenne est arrondie au dixième, comme la planche l'écrit (« 4,9 sur 5 »).
 * L'arrondi se fait sur la moyenne, pas sur chaque note : arrondir avant de
 * moyenner ferait remonter une note de 4,4 à 4,5 sans raison.
 */
export function noteGlobale(notes: readonly number[]): NoteGlobale {
  if (notes.length === 0) return { forme: 'aucune' }
  if (notes.length < SEUIL_MOYENNE) return { forme: 'nombre', nombre: notes.length }
  const somme = notes.reduce((t, n) => t + n, 0)
  return {
    forme: 'moyenne',
    moyenne: Math.round((somme / notes.length) * 10) / 10,
    nombre: notes.length,
  }
}

/**
 * La moyenne en français : virgule décimale, et pas de « ,0 » superflu.
 *
 * `Intl` s'en charge, plutôt qu'un `replace('.', ',')` qui ignorerait les
 * conventions et casserait au premier passage sur une autre locale.
 */
export function formatNote(moyenne: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(moyenne)
}

/**
 * Le balisage `AggregateRating` pour les moteurs, ou rien.
 *
 * ⚠️ **IL NE S'ACTIVE QU'AVEC DE VRAIS AVIS**, et le seuil est le même que
 * celui de l'affichage — pas parce que c'est plus simple, mais parce qu'un
 * balisage annoncerait aux moteurs une note que la page elle-même refuse de
 * montrer. Une étoile dans un résultat de recherche, adossée à un seul avis,
 * est la même statistique déguisée, avec plus de portée.
 */
export function noteBalisable(note: NoteGlobale): { moyenne: number; nombre: number } | null {
  return note.forme === 'moyenne' ? { moyenne: note.moyenne, nombre: note.nombre } : null
}
