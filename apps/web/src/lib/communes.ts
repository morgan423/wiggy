import { citySearchTerm, normaliserCommune, type Commune } from '@wiggy/core'

/**
 * Référentiel des communes — API Découpage administratif de l'État
 * (geo.api.gouv.fr). Officielle, gratuite, sans clé, et tenue à jour par
 * l'administration : rien à importer ni à maintenir de notre côté.
 *
 * C'est la source du code INSEE, qui sert de clé stable partout ailleurs
 * (zone d'intervention B11 ②, carte de chaleur A9).
 */

const RACINE = 'https://geo.api.gouv.fr/communes'
const DELAI_MS = 5000

/**
 * Renvoie null si le service est injoignable — à distinguer d'un tableau vide,
 * qui signifie « aucune commune de ce nom ». Le pro doit savoir lequel des deux
 * s'est produit.
 */
export async function chercherCommunes(saisie: string): Promise<Commune[] | null> {
  const terme = citySearchTerm(saisie)
  if (terme.length < 2) return []

  const url = new URL(RACINE)
  url.searchParams.set('nom', terme)
  url.searchParams.set('fields', 'nom,code,codesPostaux,centre')
  url.searchParams.set('boost', 'population')
  url.searchParams.set('limit', '12')

  try {
    const reponse = await fetch(url, {
      signal: AbortSignal.timeout(DELAI_MS),
      // Les communes changent rarement : inutile de rappeler l'API à chaque
      // frappe du même nom.
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!reponse.ok) {
      console.error('geo_api_http', reponse.status)
      return null
    }
    const brut: unknown = await reponse.json()
    if (!Array.isArray(brut)) return null
    return brut.map(normaliserCommune).filter((c): c is Commune => c !== null)
  } catch (e) {
    console.error('geo_api_injoignable', e instanceof Error ? e.name : 'inconnu')
    return null
  }
}

export type { Commune }
