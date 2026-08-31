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
 * Clé de recherche d'une commune : la seule fonction qui la calcule.
 *
 * Elle sert des deux côtés, et c'est tout l'enjeu : `npm run communes:import`
 * la calcule pour remplir `communes.search_key`, l'écran de zone la calcule
 * pour interroger. Deux normalisations qui divergent laissent des trous
 * silencieux, dont personne ne sait qu'ils existent.
 *
 * Trois passes, dans cet ordre, et l'ordre compte :
 *   ① accents et casse ;
 *   ② abréviations, TANT QU'IL RESTE des frontières de mot. « st » et « ste »
 *      suivis d'un espace, d'un tiret ou d'une apostrophe deviennent « saint »
 *      et « sainte ». Un « st » collé au reste du nom n'est pas touché, sans
 *      quoi Strasbourg et Stains deviendraient des Saint ;
 *   ③ retrait de tout le reste.
 *
 * Faire ② après ③ ne marcherait pas : il n'y aurait plus de frontière de mot
 * pour le déclencher. Le défaut R2-1 venait précisément de l'absence de cette
 * passe : « st paul » donnait `stpaul` et ne pouvait rencontrer `saintpaul`.
 */
export function cleRechercheCommune(nom: string): string {
  const sansAccent = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  const SEPARATEUR = "[\\s\\-'’]"
  const developpe = sansAccent
    .replace(new RegExp(`(^|${SEPARATEUR})ste(?=${SEPARATEUR})`, 'g'), '$1sainte')
    .replace(new RegExp(`(^|${SEPARATEUR})st(?=${SEPARATEUR})`, 'g'), '$1saint')

  return developpe.replace(/[^a-z0-9]+/g, '')
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
