import { distanceVolDOiseauKm, type Point } from './trajets.ts'

/**
 * A5 / A6 : la zone d'intervention, et ce qui se passe quand on en sort.
 *
 * B11 ② produit la donnée, ce module la lit. La règle métier tient en une
 * phrase : une adresse hors zone n'est pas un refus, c'est une demande sous
 * réserve. Le pro tranche.
 *
 * Comme le reste du domaine, ce module ne parle ni à la base ni au réseau.
 */

export type CommuneZone = {
  /** Code INSEE : la clé stable. Un nom de commune se réécrit, pas un code. */
  inseeCode: string
  nom: string
  /** Centre de la commune, quand le référentiel l'a fourni. */
  point: Point | null
}

export type Zone =
  { mode: 'communes'; communes: CommuneZone[] } | { mode: 'radius'; centre: Point; rayonKm: number }

export type PositionZone =
  /** L'adresse est desservie : parcours de réservation normal. */
  | { statut: 'dedans' }
  /**
   * L'adresse est hors zone. `distanceKm` et `repere` servent à le dire
   * humainement (« à 23 km de Pau ») et au pro à décider en un coup d'oeil.
   */
  | { statut: 'dehors'; distanceKm: number | null; repere: string | null }
  /**
   * On ne peut pas trancher : zone non configurée, ou adresse sans code INSEE.
   * Dans le doute on ne bloque personne, le parcours continue normalement.
   */
  | { statut: 'indeterminee' }

/**
 * Paris, Lyon et Marseille : la BAN code les adresses à l'arrondissement
 * (75101 pour le 1er), le référentiel des communes à la commune (75056).
 * Sans cette réduction, la zone d'une coiffeuse parisienne ne correspondrait
 * jamais à l'adresse de ses clientes.
 */
export function communePrincipale(inseeCode: string): string {
  const code = inseeCode.trim().toUpperCase()
  if (/^751(0[1-9]|1\d|20)$/.test(code)) return '75056'
  if (/^6938[1-9]$/.test(code)) return '69123'
  if (/^132(0[1-9]|1[0-6])$/.test(code)) return '13055'
  return code
}

export type AdresseSituee = {
  point: Point
  inseeCode?: string | null
}

/** Où tombe une adresse par rapport à la zone d'intervention du pro. */
export function positionDansZone(zone: Zone | null, adresse: AdresseSituee): PositionZone {
  if (!zone) return { statut: 'indeterminee' }

  if (zone.mode === 'radius') {
    const distance = distanceVolDOiseauKm(zone.centre, adresse.point)
    if (distance <= zone.rayonKm) return { statut: 'dedans' }
    return { statut: 'dehors', distanceKm: distance - zone.rayonKm, repere: null }
  }

  if (zone.communes.length === 0) return { statut: 'indeterminee' }

  if (adresse.inseeCode) {
    const cible = communePrincipale(adresse.inseeCode)
    const desservie = zone.communes.some((c) => communePrincipale(c.inseeCode) === cible)
    if (desservie) return { statut: 'dedans' }
  } else {
    // Sans code INSEE, on ne sait pas dans quelle commune tombe l'adresse. On
    // ne va pas deviner : bloquer une cliente sur une incertitude technique
    // coûte plus cher que de la laisser passer.
    return { statut: 'indeterminee' }
  }

  const proche = communeLaPlusProche(zone.communes, adresse.point)
  return {
    statut: 'dehors',
    distanceKm: proche?.distanceKm ?? null,
    repere: proche?.nom ?? null,
  }
}

/**
 * De combien un point sort de la zone, géométriquement.
 *
 * À la différence de `positionDansZone`, cette fonction ne se prononce pas sur
 * l'appartenance : elle mesure. Elle sert à afficher « à 23 km de Pau » sur une
 * demande déjà reconnue hors zone, sans redemander le code INSEE d'une adresse
 * enregistrée il y a trois semaines.
 */
export function distanceALaZone(
  zone: Zone | null,
  point: Point,
): { distanceKm: number; repere: string | null } | null {
  if (!zone) return null
  if (zone.mode === 'radius') {
    const distance = distanceVolDOiseauKm(zone.centre, point)
    return { distanceKm: Math.max(0, distance - zone.rayonKm), repere: null }
  }
  const proche = communeLaPlusProche(zone.communes, point)
  return proche ? { distanceKm: proche.distanceKm, repere: proche.nom } : null
}

/**
 * Commune de la zone la plus proche de l'adresse.
 *
 * La distance est à vol d'oiseau depuis le centre de la commune : c'est un
 * repère pour le pro, pas un temps de trajet. Le vrai trajet, lui, sort du
 * moteur de trajets.
 */
function communeLaPlusProche(
  communes: CommuneZone[],
  point: Point,
): { nom: string; distanceKm: number } | null {
  let meilleure: { nom: string; distanceKm: number } | null = null
  for (const commune of communes) {
    if (!commune.point) continue
    const distanceKm = distanceVolDOiseauKm(commune.point, point)
    if (!meilleure || distanceKm < meilleure.distanceKm) {
      meilleure = { nom: commune.nom, distanceKm }
    }
  }
  return meilleure
}

/** « 23 km », « 800 m ». Sert au pro comme à la cliente. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 100) * 10} m`
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`
  return `${Math.round(km)} km`
}
