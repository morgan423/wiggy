/**
 * La règle de l'option neutre, née du défaut R3-1.
 *
 * Une liste déroulante sans première option vide affiche son premier élément.
 * Le formulaire présente alors une sélection que personne n'a faite, et rien ne
 * le dit. Sur l'écran d'ajout de rendez-vous, cela invitait à enregistrer un
 * rendez-vous attribué à la mauvaise personne : la pro voyait un prénom qu'elle
 * n'avait pas choisi. Dans un produit dont le principe fondateur est « le
 * prénom est le héros », se tromper de prénom est le pire défaut possible, et
 * il ne coûte qu'un clic distrait.
 *
 * D'où cette fonction, et le fait qu'elle vive dans le domaine plutôt que dans
 * un composant : une règle qu'on peut exécuter est une règle qu'on peut
 * prouver. Le composant de liste déroulante passe obligatoirement par elle.
 */

export type OptionSelection = { valeur: string; texte: string }

/**
 * Valeur de l'option neutre. La chaîne vide, pour qu'un champ requis la refuse
 * naturellement et qu'aucune validation n'ait à connaître de sentinelle.
 */
export const VALEUR_NEUTRE = ''

export class OptionNeutreManquante extends Error {
  constructor(detail: string) {
    super(`Liste déroulante : ${detail}`)
    this.name = 'OptionNeutreManquante'
  }
}

/**
 * Construit la liste des options, option neutre en tête.
 *
 * Lève plutôt que de se rabattre sur un libellé par défaut : un libellé
 * inventé ici serait hors registre, hors copy deck, et masquerait l'oubli.
 */
export function optionsAvecNeutre(
  libelleNeutre: string,
  options: readonly OptionSelection[],
): OptionSelection[] {
  if (typeof libelleNeutre !== 'string' || libelleNeutre.trim() === '') {
    throw new OptionNeutreManquante(
      'un libellé d’option neutre est obligatoire, sinon le premier élément ' +
        'de la liste passe pour un choix (défaut R3-1)',
    )
  }
  const collision = options.find((o) => o.valeur === VALEUR_NEUTRE)
  if (collision) {
    throw new OptionNeutreManquante(
      `l’option « ${collision.texte} » utilise la valeur réservée à l’option neutre`,
    )
  }
  return [{ valeur: VALEUR_NEUTRE, texte: libelleNeutre }, ...options]
}

/** Le texte à afficher pour la valeur retenue, option neutre comprise. */
export function texteDeLaValeur(
  valeur: string,
  libelleNeutre: string,
  options: readonly OptionSelection[],
): string {
  if (valeur === VALEUR_NEUTRE) return libelleNeutre
  return options.find((o) => o.valeur === valeur)?.texte ?? libelleNeutre
}
