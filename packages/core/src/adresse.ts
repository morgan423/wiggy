import type { Point } from './trajets.ts'

/**
 * Géocodage d'une adresse cliente, via l'API Adresse de l'État (BAN).
 *
 * Ce module ne fait pas l'appel réseau : il valide la réponse. C'est là que se
 * joue la sécurité du moteur géo, car l'API répond volontiers à côté. Cherchez
 * « 12 rue des Lilas Pau » sans contrainte, elle renvoie Saint-Paul-lès-Dax,
 * à cent kilomètres. Un pro envoyé là-bas rate sa journée entière.
 *
 * D'où la règle : on ne retient un résultat que s'il correspond à ce que la
 * cliente a saisi. En cas de doute, on dit qu'on n'a pas trouvé.
 */

export type AdresseSaisie = {
  ligne1: string
  codePostal?: string | null
  ville?: string | null
}

export type AdresseTrouvee = {
  point: Point
  /** Libellé normalisé par la BAN, à réafficher pour confirmation. */
  libelle: string
  codePostal: string | null
  ville: string | null
  /**
   * Code INSEE de la commune. C'est lui qui dit si l'adresse tombe dans la
   * zone d'intervention du pro (A5, A6) : un nom de commune se réécrit, un
   * code postal chevauche plusieurs communes, le code INSEE ne bouge pas.
   */
  inseeCode: string | null
  /** Confiance de la BAN, entre 0 et 1. */
  score: number
}

/** En dessous, la correspondance est trop incertaine pour être utilisée. */
export const SCORE_MINIMAL = 0.5

/**
 * Valide un résultat de la BAN contre ce que la cliente a saisi.
 * Renvoie null si le résultat ne correspond pas : mieux vaut demander une
 * précision que d'envoyer le pro à la mauvaise adresse.
 */
export function validerResultatBan(feature: unknown, saisie: AdresseSaisie): AdresseTrouvee | null {
  if (typeof feature !== 'object' || feature === null) return null
  const f = feature as Record<string, unknown>

  const geo =
    typeof f.geometry === 'object' && f.geometry !== null
      ? (f.geometry as Record<string, unknown>)
      : {}
  const coords: unknown[] = Array.isArray(geo.coordinates) ? geo.coordinates : []
  // GeoJSON : [longitude, latitude].
  const lng: unknown = coords[0]
  const lat: unknown = coords[1]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const props =
    typeof f.properties === 'object' && f.properties !== null
      ? (f.properties as Record<string, unknown>)
      : {}
  const score = typeof props.score === 'number' ? props.score : 0
  if (score < SCORE_MINIMAL) return null

  const codePostal = typeof props.postcode === 'string' ? props.postcode : null
  const ville = typeof props.city === 'string' ? props.city : null

  // Le code postal saisi fait foi : c'est la donnée la moins ambiguë.
  if (saisie.codePostal && codePostal && saisie.codePostal.trim() !== codePostal) return null
  // À défaut, la ville doit correspondre.
  if (!saisie.codePostal && saisie.ville && ville && !memeVille(saisie.ville, ville)) return null

  return {
    point: { lat, lng },
    libelle: typeof props.label === 'string' ? props.label : saisie.ligne1,
    codePostal,
    ville,
    inseeCode: typeof props.citycode === 'string' ? props.citycode : null,
    score,
  }
}

/** Comparaison tolérante aux accents, tirets et casse. */
function memeVille(a: string, b: string): boolean {
  const normaliser = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
  return normaliser(a) === normaliser(b)
}

export type SuggestionAdresse = {
  libelle: string
  codePostal: string | null
  ville: string | null
  score: number
}

export type AnalyseAdresse = {
  /** Le résultat retenu, s'il correspond vraiment à la saisie. */
  retenu: AdresseTrouvee | null
  /**
   * Les candidats écartés, du plus probable au moins probable.
   *
   * Ils ne sont pas du bruit : une cliente qui a mal tapé sa rue doit pouvoir
   * choisir la bonne dans cette liste. Un mur « adresse introuvable » ferait
   * abandonner des clientes légitimes.
   */
  suggestions: SuggestionAdresse[]
}

/** Nombre de suggestions proposées : au-delà, on noie la cliente. */
export const MAX_SUGGESTIONS = 4

/**
 * Analyse l'ensemble des résultats de la BAN.
 *
 * Retient le premier qui correspond à la saisie ; renvoie les autres comme
 * suggestions, pour que l'écran propose une précision plutôt qu'un refus.
 */
export function analyserResultatsBan(features: unknown[], saisie: AdresseSaisie): AnalyseAdresse {
  let retenu: AdresseTrouvee | null = null
  const suggestions: SuggestionAdresse[] = []

  for (const feature of features) {
    const valide = validerResultatBan(feature, saisie)
    if (valide && !retenu) {
      retenu = valide
      continue
    }
    const brute = lireCandidat(feature)
    if (brute) suggestions.push(brute)
  }

  return { retenu, suggestions: suggestions.slice(0, MAX_SUGGESTIONS) }
}

/** Lit un candidat sans le valider : sert à proposer une correction. */
function lireCandidat(feature: unknown): SuggestionAdresse | null {
  if (typeof feature !== 'object' || feature === null) return null
  const f = feature as Record<string, unknown>
  const props =
    typeof f.properties === 'object' && f.properties !== null
      ? (f.properties as Record<string, unknown>)
      : {}
  if (typeof props.label !== 'string') return null
  return {
    libelle: props.label,
    codePostal: typeof props.postcode === 'string' ? props.postcode : null,
    ville: typeof props.city === 'string' ? props.city : null,
    score: typeof props.score === 'number' ? props.score : 0,
  }
}
