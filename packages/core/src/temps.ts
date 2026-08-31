/**
 * Temps et fuseau horaire.
 *
 * La base stocke des `timestamptz`, donc des instants absolus. Le pro, lui,
 * raisonne en heure de Paris : quand il saisit « 14:00 », il veut 14:00 chez
 * lui, pas 14:00 UTC. Entre les deux il y a un décalage qui change deux fois
 * par an — et un agenda qui se décale d'une heure fin mars est un agenda
 * inutilisable.
 *
 * Tout passe donc par ces fonctions. Aucun écran ne construit une date à la
 * main, et `new Date('2026-09-01T14:00')` (qui dépend du fuseau du serveur,
 * souvent UTC en production) n'apparaît nulle part.
 */

export const ZONE = 'Europe/Paris'

const FORMAT_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** Décalage de la zone par rapport à UTC, à cet instant précis (en ms). */
export function decalageMs(instant: Date): number {
  const p = Object.fromEntries(
    FORMAT_PARTS.formatToParts(instant).map((part) => [part.type, part.value]),
  ) as Record<string, string>
  // `hour` vaut « 24 » à minuit dans certaines implémentations : on ramène à 0.
  const heure = Number(p.hour) % 24
  const local = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    heure,
    Number(p.minute),
    Number(p.second),
  )
  return local - instant.getTime()
}

/**
 * Heure murale française → instant absolu.
 * `saisie` est au format d'un champ `datetime-local` : « 2026-09-01T14:00 ».
 *
 * On corrige deux fois : le décalage dépend de l'instant, et l'instant dépend
 * du décalage. Une seule passe se trompe d'une heure autour des changements
 * d'heure.
 */
export function heureLocaleVersInstant(saisie: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(saisie)) return null
  const commeUtc = Date.parse(`${saisie.length === 16 ? `${saisie}:00` : saisie}Z`)
  if (Number.isNaN(commeUtc)) return null

  let instant = commeUtc - decalageMs(new Date(commeUtc))
  instant = commeUtc - decalageMs(new Date(instant))
  return new Date(instant)
}

/** Instant absolu → heure murale française, au format d'un `datetime-local`. */
export function instantVersHeureLocale(instant: Date): string {
  const local = new Date(instant.getTime() + decalageMs(instant))
  return local.toISOString().slice(0, 16)
}

/** Le jour civil français (00:00 heure de Paris) contenant cet instant. */
export function debutDeJour(instant: Date): Date {
  const jour = instantVersHeureLocale(instant).slice(0, 10)
  return exigerInstant(`${jour}T00:00`)
}

/** Le lundi 00:00 de la semaine française contenant cet instant. */
export function debutDeSemaine(instant: Date): Date {
  const jour = debutDeJour(instant)
  // getUTCDay sur l'heure murale : 0 = dimanche, on veut 0 = lundi.
  const murale = new Date(jour.getTime() + decalageMs(jour))
  const recul = (murale.getUTCDay() + 6) % 7
  return ajouterJours(jour, -recul)
}

/**
 * Ajoute des jours civils, pas des tranches de 24 h : le jour du passage à
 * l'heure d'hiver dure 25 h, et « demain 9:00 » doit rester 9:00.
 */
export function ajouterJours(instant: Date, jours: number): Date {
  const murale = instantVersHeureLocale(instant)
  const [date, heure] = murale.split('T')
  const [a, m, j] = date.split('-').map(Number)
  const decale = new Date(Date.UTC(a, m - 1, j + jours))
  const nouvelleDate = decale.toISOString().slice(0, 10)
  return exigerInstant(`${nouvelleDate}T${heure}`)
}

/**
 * Conversion interne d'une heure murale qu'on vient de construire soi-même.
 * Un échec ici serait un bug de ce module, pas une saisie invalide : on le
 * fait remonter au lieu de le masquer derrière une assertion de type.
 */
function exigerInstant(murale: string): Date {
  const instant = heureLocaleVersInstant(murale)
  if (!instant) throw new Error(`Heure murale invalide construite en interne : ${murale}`)
  return instant
}

/** Les sept jours (lundi → dimanche) de la semaine contenant cet instant. */
export function joursDeLaSemaine(instant: Date): Date[] {
  const lundi = debutDeSemaine(instant)
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i))
}

/** Fin d'un rendez-vous, à partir de son début et de sa durée en minutes. */
export function finRendezVous(debut: Date, dureeMin: number): Date {
  return new Date(debut.getTime() + dureeMin * 60_000)
}
