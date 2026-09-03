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
 * D5 : le tampon de sécurité, ratifié le 31/08.
 *
 * Un rendez-vous validé à 1 h 15 de route tombait « pile poil » : le calcul
 * était juste, mais un trajet sans marge devient un retard au premier feu
 * rouge, et le retard se propage à toute la tournée.
 *
 * Dix minutes fixes, plus dix pour cent du temps de trajet au-delà de trente
 * minutes. **Jamais nul** : même deux rues plus loin, il faut se garer,
 * trouver la porte, monter. Réglable par le pro plus tard, jamais nul.
 */
export const MARGE_FIXE_MIN = 10
export const SEUIL_MARGE_PROPORTIONNELLE_MIN = 30
export const PART_MARGE_PROPORTIONNELLE = 0.1

export function avecMargeSecurite(minutes: Minutes): Minutes {
  const proportionnelle =
    minutes > SEUIL_MARGE_PROPORTIONNELLE_MIN ? minutes * PART_MARGE_PROPORTIONNELLE : 0
  return Math.ceil(minutes + MARGE_FIXE_MIN + proportionnelle)
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

/**
 * D16 — en dessous de cette distance, deux points sont le MÊME SECTEUR.
 *
 * Le cas réel : deux adresses qu'aucun référentiel ne reconnaît sont rattachées
 * au centre de leur commune (règle de la recette 3), et se retrouvent donc sur
 * des coordonnées identiques. Le trajet calculé n'est pas faux, ce sont les
 * deux points qui sont confondus.
 *
 * Annoncer « 10 min » sur deux points confondus donnerait un chiffre que
 * personne ne croirait, et annoncer « 0 min » serait pire encore. On dit ce
 * qu'on sait : c'est le même secteur, et l'adresse est approchée.
 */
export const SEUIL_MEME_SECTEUR_KM = 0.3

export function memeSecteur(km: number): boolean {
  return km < SEUIL_MEME_SECTEUR_KM
}

/**
 * Ce qu'on affiche d'un trajet, marge D5 comprise.
 *
 * **La marge est dans le chiffre affiché**, et c'est essentiel : si l'écran
 * montrait le brut pendant que le moteur applique la marge, la pro lirait un
 * chiffre qui n'est pas celui qui décale son agenda. Le tampon de dix minutes
 * vaut aussi entre deux rendez-vous du même quartier : il faut se garer,
 * monter, s'installer.
 */
export function libelleTrajet(trajet: ResultatTrajet): string {
  if (memeSecteur(trajet.km)) {
    return `${String(trajet.minutes)} min, même secteur, adresse approchée`
  }
  const base = `${String(trajet.minutes)} min de trajet`
  return trajet.source === 'estimation' ? `${base} (estimé)` : base
}
