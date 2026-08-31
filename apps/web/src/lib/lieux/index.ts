import type { Point } from '@wiggy/core'

/**
 * A5 ② : « je suis à l'hôtel ». Recherche d'hébergements dans la zone du pro.
 *
 * Places API (New), méthode `searchText`, restreinte à un cercle autour de la
 * zone d'intervention. La clé ne quitte jamais le serveur.
 *
 * Sans clé configurée, la fonction renvoie `null` : l'écran bascule alors sur
 * la saisie libre, en affichant les communes desservies. La cliente n'est
 * jamais bloquée par une API que nous n'avons pas activée.
 *
 * ⚠️ Places est une API facturée, distincte de Routes : elle demande sa propre
 * activation, ses propres quotas et sa propre restriction de clé. Tant que
 * `GOOGLE_PLACES_API_KEY` n'est pas renseignée, ce chemin reste inerte.
 */

const POINT_DE_TERMINAISON = 'https://places.googleapis.com/v1/places:searchText'
const DELAI_MS = 6000

/** Au-delà, on sort de la zone du pro : proposer ces hôtels serait absurde. */
const RAYON_M = 20_000

export type Hebergement = {
  nom: string
  adresse: string
  point: Point
}

type PlaceReponse = {
  displayName?: { text?: string }
  shortFormattedAddress?: string
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
}

/**
 * Renvoie null si la recherche n'est pas disponible (clé absente, API en
 * panne), et un tableau vide si elle n'a rien trouvé. Les deux ne se disent
 * pas pareil à la cliente.
 */
export async function chercherHebergements(
  saisie: string,
  centre: Point,
): Promise<Hebergement[] | null> {
  const cle = process.env.GOOGLE_PLACES_API_KEY
  if (!cle || saisie.trim().length < 2) return null

  try {
    const reponse = await fetch(POINT_DE_TERMINAISON, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': cle,
        // Masque obligatoire et facturé : on ne demande que ce qu'on affiche.
        'X-Goog-FieldMask':
          'places.displayName,places.shortFormattedAddress,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: saisie.trim(),
        includedType: 'lodging',
        languageCode: 'fr',
        regionCode: 'FR',
        maxResultCount: 5,
        locationBias: {
          circle: { center: { latitude: centre.lat, longitude: centre.lng }, radius: RAYON_M },
        },
      }),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: 'no-store',
    })
    if (!reponse.ok) {
      console.error('places_http', reponse.status)
      return null
    }

    const brut: unknown = await reponse.json()
    const enveloppe =
      typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : {}
    const places: PlaceReponse[] = Array.isArray(enveloppe.places)
      ? (enveloppe.places as PlaceReponse[])
      : []

    return places.flatMap((p) => {
      const nom = p.displayName?.text
      const adresse = p.shortFormattedAddress ?? p.formattedAddress
      const lat = p.location?.latitude
      const lng = p.location?.longitude
      if (!nom || !adresse || typeof lat !== 'number' || typeof lng !== 'number') return []
      return [{ nom, adresse, point: { lat, lng } }]
    })
  } catch (e) {
    console.error('places_injoignable', e instanceof Error ? e.name : 'inconnue')
    return null
  }
}
