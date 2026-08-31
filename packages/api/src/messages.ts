import { z } from 'zod'
import { copy, remplir } from '@wiggy/copy'

/**
 * B3 : aucun message de validation brut ne doit jamais atteindre un humain.
 *
 * La bibliothèque de validation parle anglais et parle technique. « Too small:
 * expected number to be >=1 » est arrivé jusqu'à l'écran d'une pro pendant la
 * recette du 31/08.
 *
 * Poser un message français sur chaque règle, une par une, serait un audit à
 * refaire à chaque ajout de champ, et il suffirait d'un oubli. On installe donc
 * un filet global : toute règle sans message explicite retombe sur une phrase
 * du copy deck. Les messages spécifiques restent posés là où ils apprennent
 * quelque chose à la personne, jamais pour traduire.
 *
 * Les formulations sont impersonnelles : le même message sert au tutoiement
 * côté pro et au vouvoiement côté cliente sans changer de registre.
 */

export const V = copy.validation.$aEcrire

/** Vrai si l'entrée est simplement absente, par opposition à mal formée. */
const absent = (valeur: unknown) => valeur === undefined || valeur === null || valeur === ''

const francais: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      if (absent(issue.input)) return V.requis
      return issue.expected === 'number' ? V.nombreAttendu : V.formatInconnu

    case 'too_small':
      if (absent(issue.input)) return V.requis
      return issue.origin === 'string'
        ? remplir(V.tropCourt, { min: String(issue.minimum) })
        : remplir(V.tropPetit, { min: String(issue.minimum) })

    case 'too_big':
      return issue.origin === 'string'
        ? remplir(V.tropLong, { max: String(issue.maximum) })
        : remplir(V.tropGrand, { max: String(issue.maximum) })

    case 'invalid_format':
      if (issue.format === 'email') return V.email
      if (issue.format === 'url') return V.url
      return V.formatInconnu

    case 'invalid_value':
      return V.valeurNonProposee

    default:
      return V.formatInconnu
  }
}

/**
 * Installé au chargement du paquet. `z.config` est global au processus : tout
 * schéma, y compris ceux écrits dans les applications, en hérite. C'est
 * précisément ce qu'on veut, un filet ne vaut que s'il est sous tout le monde.
 */
z.config({ customError: francais })
