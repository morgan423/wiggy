/**
 * Moteur de trajets — l'interface, et son mode dégradé.
 *
 * Le temps de trajet réel est le cœur de la promesse : c'est lui qui rend une
 * tournée cohérente. L'implémentation par défaut interroge la Routes API de
 * Google (côté serveur), mais l'application ne doit jamais en dépendre pour
 * fonctionner : API indisponible, quota atteint, ou pro en zone blanche (C8),
 * il faut que la tournée reste consultable.
 *
 * D'où cette interface, et l'estimation à vol d'oiseau qui prend le relais.
 * Elle est volontairement conservatrice : mieux vaut annoncer un trajet un peu
 * trop long et arriver en avance que l'inverse.
 */

export type Point = { lat: number; lng: number }
export type Minutes = number

export type ResultatTrajet = {
  minutes: Minutes
  /**
   * Distance routière, en kilomètres.
   *
   * Elle vient du routage quand `source` vaut `api` : c'est ce qui permet
   * d'annoncer un total de tournée juste, et plus tard des frais kilométriques
   * réels (E1). En mode estimé, c'est la ligne droite corrigée du détour.
   */
  km: number
  /** Comment la valeur a été obtenue — à afficher quand elle est estimée. */
  source: 'api' | 'estimation'
}

export type MoteurTrajets = {
  readonly nom: string
  /** Durées de chaque départ vers chaque arrivée, en minutes. */
  matrice(departs: Point[], arrivees: Point[], quand?: Date): Promise<ResultatTrajet[][]>
}

const RAYON_TERRE_KM = 6371

/** Distance à vol d'oiseau, formule de haversine. */
export function distanceVolDOiseauKm(a: Point, b: Point): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Le trajet routier est toujours plus long que la ligne droite : virages,
 * sens uniques, ponts. Moyenne admise pour la France métropolitaine.
 */
const FACTEUR_DETOUR = 1.35

/** Marge fixe : se garer, trouver la porte, monter. */
const MARGE_MIN = 5

/**
 * Vitesses recalées sur des mesures réelles (Routes API, agglomération de Pau,
 * 30/08) — `npm run trajets:calibrage` rejoue la comparaison.
 *
 *   trajet              routier   réel    vitesse effective
 *   Pau → Billère        5,5 km   13 min      25 km/h
 *   Pau → Jurançon       5,5 km   18 min      18 km/h
 *   Lescar → Jurançon    9,2 km   26 min      21 km/h
 *   Pau → Lescar         9,7 km   14 min      41 km/h
 *   Pau → Oloron          35 km   48 min      44 km/h
 *   Pau → Tarbes          48 km   35 min      82 km/h
 *
 * Deux enseignements. En ville, la vitesse réelle est bien plus basse que je
 * l'avais supposée — 18 à 25 km/h, pas 42. Et au-delà de 30 km, l'écart entre
 * une départementale de montagne (44 km/h) et une voie rapide (82 km/h) est
 * irréductible sans données de routage.
 *
 * Le mode dégradé doit donc pencher du côté sûr : ces vitesses sont calées sur
 * le BAS de chaque plage. Le pro arrive en avance plutôt qu'en retard — un
 * agenda qui promet l'impossible se paie en rendez-vous manqués.
 *
 * ⚠️ Six mesures, une seule agglomération. À refaire sur les données de bêta.
 */
function vitesseKmH(distanceRoutiereKm: number): number {
  if (distanceRoutiereKm < 12) return 26
  if (distanceRoutiereKm < 30) return 38
  return 45
}

/** Distance routière estimée : la ligne droite, corrigée du détour. */
export function distanceEstimeeKm(a: Point, b: Point): number {
  return distanceVolDOiseauKm(a, b) * FACTEUR_DETOUR
}

/** Durée estimée, sans réseau ni API. Arrondie à la minute supérieure. */
export function dureeEstimeeMin(a: Point, b: Point): Minutes {
  const routiere = distanceEstimeeKm(a, b)
  if (routiere < 0.15) return 0 // même adresse, ou porte à côté
  return Math.ceil((routiere / vitesseKmH(routiere)) * 60 + MARGE_MIN)
}

/**
 * Moteur de repli. Sert de mode dégradé quand l'API ne répond pas, et de mode
 * hors-ligne (C8) : il ne fait aucun appel réseau.
 */
export const moteurVolDOiseau: MoteurTrajets = {
  nom: 'vol-d-oiseau',
  matrice(departs, arrivees) {
    // Aucune attente : ce moteur ne touche pas au réseau, c'est tout son
    // intérêt. On renvoie une promesse déjà résolue pour tenir le contrat.
    return Promise.resolve(
      departs.map((d) =>
        arrivees.map((a) => ({
          minutes: dureeEstimeeMin(d, a),
          km: distanceEstimeeKm(d, a),
          source: 'estimation' as const,
        })),
      ),
    )
  },
}
