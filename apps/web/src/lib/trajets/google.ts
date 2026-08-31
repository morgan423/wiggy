import type { MoteurTrajets, Point, ResultatTrajet } from '@wiggy/core'

/**
 * Routes API de Google — méthode `computeRouteMatrix`.
 *
 * On utilise délibérément la Routes API et non la Distance Matrix API, passée
 * en « Legacy » : Google n'y ajoute plus de fonctionnalités et son horizon de
 * support n'est pas garanti.
 *
 * La clé ne quitte jamais le serveur. L'app mobile n'appelle pas Google
 * directement : elle passe par nos routes, ce qui permet aussi de compter et
 * de plafonner l'usage.
 */

const POINT_DE_TERMINAISON = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix'
const DELAI_MS = 8000

/**
 * Plafond par appel imposé par Google en mode « TRAFFIC_AWARE » : 100 éléments
 * (départs × arrivées). Au-delà, l'API refuse la requête.
 */
export const MAX_ELEMENTS = 100

const versWaypoint = (p: Point) => ({
  waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
})

type ElementReponse = {
  originIndex?: number
  destinationIndex?: number
  duration?: string
  distanceMeters?: number
  condition?: string
}

export function moteurGoogle(cle: string): MoteurTrajets {
  return {
    nom: 'google-routes',

    async matrice(departs, arrivees, quand) {
      if (departs.length * arrivees.length > MAX_ELEMENTS) {
        throw new Error(
          `Matrice trop grande : ${departs.length}×${arrivees.length} > ${MAX_ELEMENTS}`,
        )
      }

      // `departureTime` doit être dans le futur : pour un trajet passé (calcul
      // rétroactif sur un historique), on retombe sur un calcul sans trafic
      // plutôt que de faire échouer la requête.
      const futur = quand && quand.getTime() > Date.now() + 60_000
      const corps = {
        origins: departs.map(versWaypoint),
        destinations: arrivees.map(versWaypoint),
        travelMode: 'DRIVE',
        routingPreference: futur ? 'TRAFFIC_AWARE' : 'TRAFFIC_UNAWARE',
        ...(futur ? { departureTime: quand.toISOString() } : {}),
      }

      const reponse = await fetch(POINT_DE_TERMINAISON, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': cle,
          // Le masque est obligatoire et facturé : on ne demande que ce qu'on
          // utilise réellement.
          // `distanceMeters` fait partie du même jeu de champs que `duration` :
          // il ne change pas le palier de facturation, et il rend le total
          // kilométrique de la tournée exact plutôt qu'estimé.
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
        },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(DELAI_MS),
        // Aucun cache HTTP : la mise en cache est gérée en amont, avec une
        // durée courte et maîtrisée (CGU Google).
        cache: 'no-store',
      })

      if (!reponse.ok) {
        throw new Error(`Routes API : HTTP ${reponse.status}`)
      }

      const brut: unknown = await reponse.json()
      if (!Array.isArray(brut)) throw new Error('Routes API : réponse inattendue')
      const elements = brut as ElementReponse[]

      // La réponse n'est pas ordonnée : chaque élément porte ses index.
      const matrice: ResultatTrajet[][] = departs.map(() =>
        arrivees.map(() => ({ minutes: 0, km: 0, source: 'api' as const })),
      )
      let remplis = 0

      for (const e of elements) {
        const i = e.originIndex
        const j = e.destinationIndex
        if (typeof i !== 'number' || typeof j !== 'number') continue
        if (e.condition !== 'ROUTE_EXISTS' || !e.duration) {
          // Pas de route (île, adresse inatteignable) : on laisse la cellule à
          // -1, l'appelant décidera de retomber sur l'estimation.
          matrice[i][j] = { minutes: -1, km: 0, source: 'api' }
          remplis++
          continue
        }
        matrice[i][j] = {
          minutes: Math.ceil(Number.parseInt(e.duration, 10) / 60),
          km: (e.distanceMeters ?? 0) / 1000,
          source: 'api',
        }
        remplis++
      }

      if (remplis < departs.length * arrivees.length) {
        throw new Error('Routes API : matrice incomplète')
      }
      return matrice
    },
  }
}
