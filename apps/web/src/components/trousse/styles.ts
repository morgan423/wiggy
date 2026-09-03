/**
 * Les traits communs de la trousse.
 *
 * Tout est construit sur les jetons de `packages/tokens`, aucune valeur en dur.
 * Ce qui est ici plutôt que recopié : un champ, une liste, un sélecteur de date
 * et un sélecteur d'heure doivent se ressembler au pixel près. Trois classes
 * dupliquées finissent toujours par diverger, et la divergence se voit.
 */

/**
 * Le rectangle de saisie : champ, bouton de liste, bouton de date.
 *
 * Valeurs des planches 14b et 14d : surface, rayon de champ, 12 px sur 13 px de
 * gouttière, corps de 13,5 px en demi-gras. **Aucune bordure visible au
 * repos** : c'est la surface qui détache le champ de la crème, la bordure ne
 * sert qu'à dire l'erreur ou l'ouverture. Elle reste déclarée transparente
 * pour que son apparition ne décale rien.
 */
export const SURFACE_CHAMP =
  'mt-1.5 w-full rounded-champ border-2 bg-surface px-3.5 py-3 text-left text-[13.5px] font-semibold transition-colors placeholder:font-normal placeholder:text-texte-attenue'

/**
 * L'état désactivé.
 *
 * L'opacité seule ne suffisait pas : une liste désactivée mais remplie se
 * lisait comme une liste ordinaire. Le fond crème la sort de la famille des
 * champs, qui vivent tous sur la surface, et le curseur le confirme.
 */
export const DESACTIVE =
  'disabled:cursor-not-allowed disabled:border-trait-discret disabled:bg-fond disabled:text-texte-attenue disabled:opacity-100 disabled:hover:border-trait-discret'

const BORDURE_NORMALE = 'border-transparent'
const BORDURE_FAUTIVE = 'border-erreur'
const BORDURE_ACTIVE = 'border-prune'

export const LIBELLE = 'block text-[12px] font-bold'
export const AIDE = 'aide-champ mt-1 text-[11px] text-texte-attenue'

/**
 * Le panneau qui s'ouvre sous un champ : liste, calendrier, suggestions.
 *
 * `overscroll-contain` : arrivé en bout de liste, la molette ne se propage plus
 * à la page. Sans lui, faire défiler les heures emportait l'écran entier.
 */
export const PANNEAU =
  'absolute z-20 mt-1.5 w-full overflow-hidden overscroll-contain rounded-carte border-2 border-trait-discret bg-surface shadow-lg'

/**
 * Une ligne cliquable dans un panneau. 44 px de haut, comme tout le reste.
 *
 * Son survol est `SURVOL_PANNEAU`, plus bas : une règle bien appliquée n'a pas
 * à l'être partout de la même façon.
 */
export const LIGNE_PANNEAU =
  'flex min-h-11 w-full cursor-pointer items-center px-3.5 py-2.5 text-left text-[13.5px] transition-colors'
export const LIGNE_SURVOLEE = 'bg-fond'

/**
 * Le survol d'un élément DANS un panneau flottant. **Le seul endroit du
 * produit où `hover:bg-fond` est écrit**, et c'est ce qui tient la règle.
 *
 * La règle est dans CLAUDE.md : un état d'interaction n'emprunte jamais une
 * couleur qui sert déjà de fond dans le même écran. La crème est LE fond de
 * page ; une carte qui y bascule au survol disparaît au lieu de se détacher.
 *
 * Un panneau échappe à la règle parce qu'il est un plan posé AU-DESSUS de
 * l'écran : il a sa surface, sa bordure et son ombre, et la crème n'y est le
 * fond de rien. L'exception est donc réelle — mais elle ne s'emprunte pas, et
 * elle est tenue par la STRUCTURE et non par la discipline : `design:check`
 * refuse `hover:bg-fond` partout ailleurs, exactement comme il refuse la
 * classe `prix` hors du composant `Prix`. Qui en a besoin passe par ici, ce
 * qui l'oblige à se demander s'il est bien dans un panneau.
 *
 * Sur une rangée d'écran, l'état d'interaction est `RANGEE_ACTIVABLE`.
 */
export const SURVOL_PANNEAU = 'hover:bg-fond'
export const LIGNE_RETENUE = 'font-bold'

export const bordure = (fautif: boolean, ouvert: boolean) =>
  fautif ? BORDURE_FAUTIVE : ouvert ? BORDURE_ACTIVE : BORDURE_NORMALE
