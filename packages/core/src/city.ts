/**
 * Normalisation des noms de communes.
 *
 * Sert deux endroits qui doivent impérativement s'accorder :
 *   — A9, le regroupement de la liste d'attente par ville (carte de chaleur) ;
 *   — B11 ②, la zone d'intervention en liste de communes.
 * Si « Saint-Étienne », « saint etienne » et « SAINT-ETIENNE » ne tombent pas
 * sur la même clé, la carte de chaleur compte trois villes au lieu d'une et le
 * filtrage géo laisse passer des trous.
 *
 * Le code INSEE reste la clé de référence dès qu'on l'a ; le nom normalisé
 * n'est qu'un repli tant que le référentiel n'est pas branché.
 */

export function normalizeCityName(input: string): string {
  return input.normalize('NFC').replace(/\s+/g, ' ').trim()
}

export function cityKey(name: string, inseeCode?: string | null): string {
  if (inseeCode) return `insee:${inseeCode.trim()}`
  const slug = normalizeCityName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[’'']/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `nom:${slug}`
}

/**
 * Prépare un nom de ville saisi par une visiteuse pour une recherche « ilike ».
 *
 * La saisie vient de l'URL : elle ne doit jamais atteindre un filtre PostgREST
 * telle quelle. Les caractères qui ont un sens dans la syntaxe de filtre
 * (`,` `.` `(` `)` `"` `\`) et les jokers SQL (`%` `_`) sont retirés, pas
 * échappés — une commune n'en contient aucun.
 */
export function citySearchTerm(input: string): string {
  return normalizeCityName(input)
    .replace(/[^\p{L}\p{N}\s'’-]/gu, '')
    .slice(0, 60)
    .trim()
}

export type Commune = {
  insee_code: string
  name: string
  postal_code: string | null
  lat: number | null
  lng: number | null
}

/**
 * Normalise une commune telle que la renvoie l'API Découpage administratif
 * (geo.api.gouv.fr).
 *
 * Le piège est dans `centre.coordinates` : c'est du GeoJSON, donc
 * **[longitude, latitude]** — l'ordre inverse de celui qu'on écrit partout
 * ailleurs. Inverser les deux placerait les pros au milieu de l'océan.
 *
 * Renvoie null si l'entrée n'a pas le minimum vital (code INSEE et nom) :
 * mieux vaut ignorer une commune que d'en stocker une à moitié.
 */
export function normaliserCommune(entree: unknown): Commune | null {
  // Garde de type plutôt qu'un cast : l'entrée vient d'une API tierce, rien ne
  // garantit sa forme, et un cast ferait croire au compilateur le contraire.
  if (typeof entree !== 'object' || entree === null) return null
  const c = entree as Record<string, unknown>
  if (typeof c.code !== 'string' || typeof c.nom !== 'string') return null

  const centre =
    typeof c.centre === 'object' && c.centre !== null ? (c.centre as Record<string, unknown>) : {}
  const coords: unknown[] = Array.isArray(centre.coordinates) ? centre.coordinates : []
  const lng: unknown = coords[0]
  const lat: unknown = coords[1]
  const cp: unknown = Array.isArray(c.codesPostaux) ? c.codesPostaux[0] : null

  return {
    insee_code: c.code,
    name: c.nom,
    postal_code: typeof cp === 'string' ? cp : null,
    lat: typeof lat === 'number' ? lat : null,
    lng: typeof lng === 'number' ? lng : null,
  }
}
