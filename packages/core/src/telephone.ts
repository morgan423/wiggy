/**
 * Les numéros de téléphone : normalisation, et destinations autorisées.
 *
 * D11 ④ : les destinations SMS sont bornées à la France métropolitaine et aux
 * DOM. C'est le garde-fou qui a permis d'écarter l'abaissement du plafond
 * d'essai, et il vaut mieux que lui : abaisser le plafond divise le gain d'un
 * fraudeur par trois sans jamais l'annuler, et fait taper un mur à une
 * essayeuse réellement active. Borner la destination annule ce gain **à zéro
 * quel que soit le plafond**, sans toucher une seule utilisatrice réelle.
 *
 * Ce module est dans le domaine, et non dans l'application, pour une raison
 * simple : une règle de sécurité qu'on peut exécuter est une règle qu'on peut
 * prouver.
 */

/**
 * Indicatifs du plan de numérotation français.
 *
 * La métropole et les DOM partagent le même plan : un numéro réunionnais
 * `+262 692 …` s'écrit `0692 …` en national, exactement comme un numéro
 * métropolitain. Les collectivités d'outre-mer (Nouvelle-Calédonie +687,
 * Polynésie +689, Wallis +681) en sont hors, et ne sont donc pas ouvertes :
 * D11 dit « métropolitaine et DOM », pas « outre-mer ».
 */
const INDICATIFS_FRANCE = [
  '33', //  métropole
  '262', // La Réunion, Mayotte
  '590', // Guadeloupe
  '594', // Guyane
  '596', // Martinique
] as const

/**
 * Ramène un numéro au format national français « 0XXXXXXXXX ».
 *
 * Renvoie null si le numéro n'appartient pas au plan français : c'est ce null
 * qui borne les destinations.
 */
export function numeroFrancais(saisie: string): string | null {
  const propre = saisie.replace(/[\s.\-()/]/g, '')

  // Forme internationale, avec « + » ou « 00 ».
  const international = /^(?:\+|00)(\d+)$/.exec(propre)
  if (international) {
    const chiffres = international[1]
    // Le plus long indicatif d'abord : « 33 » est un préfixe de rien ici, mais
    // tester court en premier ouvrirait la porte à un faux positif.
    const indicatif = [...INDICATIFS_FRANCE]
      .sort((a, b) => b.length - a.length)
      .find((i) => chiffres.startsWith(i))
    if (!indicatif) return null
    const national = `0${chiffres.slice(indicatif.length)}`
    return estNational(national) ? national : null
  }

  return estNational(propre) ? propre : null
}

/** Dix chiffres, commençant par 0 suivi d'un chiffre significatif. */
function estNational(numero: string): boolean {
  return /^0[1-9]\d{8}$/.test(numero)
}

/**
 * Vrai si un SMS peut partir vers ce numéro.
 *
 * Posé au même endroit que les trois compteurs anti-pompage, et pour la même
 * raison : c'est un plafond de dépense, pas une validation de formulaire.
 */
export function destinationSmsAutorisee(saisie: string): boolean {
  return numeroFrancais(saisie) !== null
}
