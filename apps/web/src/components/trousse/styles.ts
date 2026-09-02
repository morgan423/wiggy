/**
 * Les traits communs de la trousse.
 *
 * Tout est construit sur les jetons de `packages/tokens`, aucune valeur en dur.
 * Ce qui est ici plutôt que recopié : un champ, une liste, un sélecteur de date
 * et un sélecteur d'heure doivent se ressembler au pixel près. Trois classes
 * dupliquées finissent toujours par diverger, et la divergence se voit.
 */

/** Le rectangle de saisie : champ, bouton de liste, bouton de date. */
export const SURFACE_CHAMP =
  'mt-2 w-full rounded-champ border-2 bg-surface px-5 py-4 text-left text-lg transition-colors'

/**
 * L'état désactivé.
 *
 * L'opacité seule ne suffisait pas : une liste désactivée mais remplie se
 * lisait comme une liste ordinaire. Le fond crème la sort de la famille des
 * champs, qui vivent tous sur la surface, et le curseur le confirme.
 */
export const DESACTIVE =
  'disabled:cursor-not-allowed disabled:border-trait-discret disabled:bg-fond disabled:text-texte-attenue disabled:opacity-100 disabled:hover:border-trait-discret'

const BORDURE_NORMALE = 'border-trait-discret'
const BORDURE_FAUTIVE = 'border-erreur'
const BORDURE_ACTIVE = 'border-prune'

export const LIBELLE = 'block text-sm font-semibold'
export const AIDE = 'mt-2 text-sm text-texte-secondaire'

/**
 * Le panneau qui s'ouvre sous un champ : liste, calendrier, suggestions.
 *
 * `overscroll-contain` : arrivé en bout de liste, la molette ne se propage plus
 * à la page. Sans lui, faire défiler les heures emportait l'écran entier.
 */
export const PANNEAU =
  'absolute z-20 mt-2 w-full overflow-hidden overscroll-contain rounded-carte border-2 border-trait-discret bg-surface shadow-lg'

/** Une ligne cliquable dans un panneau. 44 px de haut, comme tout le reste. */
export const LIGNE_PANNEAU =
  'flex min-h-11 w-full cursor-pointer items-center px-5 py-3 text-left transition-colors'
export const LIGNE_SURVOLEE = 'bg-fond'
export const LIGNE_RETENUE = 'font-bold'

export const bordure = (fautif: boolean, ouvert: boolean) =>
  fautif ? BORDURE_FAUTIVE : ouvert ? BORDURE_ACTIVE : BORDURE_NORMALE
