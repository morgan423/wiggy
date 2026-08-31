import {
  dureeEstimeeMin,
  distanceEstimeeKm,
  type MoteurTrajets,
  type Point,
  type ResultatTrajet,
} from '@wiggy/core'
import { quotaGlobal } from '@/lib/quota'
import { moteurGoogle, MAX_ELEMENTS } from './google'

/**
 * Le moteur de trajets vu par l'application.
 *
 * Un seul point d'entrée, trois garanties :
 *   ① on interroge la Routes API quand c'est possible ;
 *   ② on retombe **automatiquement** sur l'estimation à vol d'oiseau si l'API
 *      est indisponible, hors quota, trop lente, ou si la matrice demandée
 *      dépasse ce qu'un appel accepte — l'app dégrade, elle ne casse pas ;
 *   ③ chaque résultat dit d'où il vient, pour que l'écran puisse le signaler.
 *
 * C'est aussi le mode hors-ligne (C8) : sans réseau, ② s'applique seul.
 */

/**
 * Cache mémoire, à durée COURTE et volontairement non persistant.
 *
 * Les CGU de Google Maps Platform interdisent le stockage durable de leurs
 * résultats. Ce cache vit dans le processus, expire en quelques minutes, et
 * n'est jamais écrit en base. Il sert à absorber les rendus successifs d'un
 * même écran, pas à constituer une base de temps de trajet.
 *
 * La vraie économie viendra de la bascule vers OSRM auto-hébergé, dont les
 * résultats nous appartiendront.
 */
const DUREE_CACHE_MS = 5 * 60 * 1000
const TAILLE_CACHE_MAX = 500
const cache = new Map<string, { valeur: ResultatTrajet; expire: number }>()

/**
 * Plafond journalier d'appels, en plus du quota fixé côté Google Cloud.
 * Deux ceintures valent mieux qu'une : celle de Google protège la facture,
 * celle-ci protège aussi contre une boucle de notre côté.
 */
const APPELS_PAR_JOUR = 2000

const cleCache = (d: Point, a: Point) =>
  // ~11 m de précision : deux adresses voisines partagent leur trajet.
  `${d.lat.toFixed(4)},${d.lng.toFixed(4)}>${a.lat.toFixed(4)},${a.lng.toFixed(4)}`

function lireCache(d: Point, a: Point): ResultatTrajet | null {
  const entree = cache.get(cleCache(d, a))
  if (!entree) return null
  if (entree.expire < Date.now()) {
    cache.delete(cleCache(d, a))
    return null
  }
  return entree.valeur
}

function ecrireCache(d: Point, a: Point, valeur: ResultatTrajet) {
  if (cache.size >= TAILLE_CACHE_MAX) {
    // Purge simple : la plus ancienne entrée insérée part en premier.
    const premiere = cache.keys().next()
    if (!premiere.done) cache.delete(premiere.value)
  }
  cache.set(cleCache(d, a), { valeur, expire: Date.now() + DUREE_CACHE_MS })
}

function estimation(departs: Point[], arrivees: Point[]): ResultatTrajet[][] {
  return departs.map((d) =>
    arrivees.map((a) => ({
      minutes: dureeEstimeeMin(d, a),
      km: distanceEstimeeKm(d, a),
      source: 'estimation' as const,
    })),
  )
}

export const trajets: MoteurTrajets = {
  nom: 'wiggy',

  async matrice(departs, arrivees, quand) {
    if (departs.length === 0 || arrivees.length === 0) return []

    const cle = process.env.GOOGLE_ROUTES_API_KEY
    const trop = departs.length * arrivees.length > MAX_ELEMENTS

    if (!cle || trop) {
      if (trop) console.warn('trajets_matrice_trop_grande', departs.length * arrivees.length)
      return estimation(departs, arrivees)
    }

    // Tout est-il déjà en cache ? Dans ce cas, aucun appel.
    const enCache = departs.map((d) => arrivees.map((a) => lireCache(d, a)))
    if (enCache.every((ligne) => ligne.every(Boolean))) {
      return enCache as ResultatTrajet[][]
    }

    if (!(await quotaGlobal('trajets', APPELS_PAR_JOUR, 86_400))) {
      console.warn('trajets_quota_journalier_atteint')
      return estimation(departs, arrivees)
    }

    try {
      const resultat = await moteurGoogle(cle).matrice(departs, arrivees, quand)
      return resultat.map((ligne, i) =>
        ligne.map((cellule, j) => {
          // -1 = Google n'a pas trouvé de route : on estime plutôt que
          // d'afficher un trajet nul, qui ferait rater un rendez-vous.
          const valeur: ResultatTrajet =
            cellule.minutes < 0
              ? {
                  minutes: dureeEstimeeMin(departs[i], arrivees[j]),
                  km: distanceEstimeeKm(departs[i], arrivees[j]),
                  source: 'estimation',
                }
              : cellule
          if (valeur.source === 'api') ecrireCache(departs[i], arrivees[j], valeur)
          return valeur
        }),
      )
    } catch (e) {
      // Indisponibilité, dépassement de quota Google, délai dépassé : on
      // dégrade sans bruit côté cliente, avec une trace côté serveur.
      console.error('trajets_api_indisponible', e instanceof Error ? e.message : 'inconnue')
      return estimation(departs, arrivees)
    }
  },
}
