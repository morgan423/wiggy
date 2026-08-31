import {
  heureLocaleVersInstant,
  instantVersHeureLocale,
  ajouterJours,
  debutDeJour,
} from './temps.ts'
import type { Minutes, Point } from './trajets.ts'

/**
 * A3 : le moteur de créneaux géo-filtrés. Le différenciateur.
 *
 * La règle tient en une phrase : la cliente ne voit que les créneaux
 * cohérents avec la tournée du jour. Un créneau n'est proposé que si le pro
 * peut réellement l'atteindre depuis son rendez-vous précédent, et repartir à
 * temps pour le suivant. Une journée vide, elle, s'ouvre entièrement.
 *
 * Ce module ne parle ni à la base ni au réseau : les temps de trajet lui sont
 * fournis. C'est ce qui le rend testable sur les cas qui comptent, et
 * utilisable hors ligne (C8) avec l'estimation à vol d'oiseau.
 */

/** Une plage de travail, déjà résolue en instants absolus. */
export type Plage = { debut: Date; fin: Date }

/** Un rendez-vous déjà posé dans la journée. */
export type RendezVousExistant = {
  debut: Date
  fin: Date
  /** Absent si l'adresse n'a pas pu être géocodée : le trajet est alors inconnu. */
  lieu?: Point | null
}

export type Creneau = {
  debut: Date
  fin: Date
  /** Trajet depuis le rendez-vous précédent, si la journée en compte un. */
  trajetAvant?: Minutes
  /** Trajet vers le rendez-vous suivant, si la journée en compte un. */
  trajetApres?: Minutes
}

export type DemandeCreneaux = {
  /** Plages travaillées du jour, congés et blocages déjà retirés. */
  plages: Plage[]
  /** Rendez-vous du jour, dans l'ordre. */
  rdvs: RendezVousExistant[]
  /** Durée de la prestation, tampon nouvelle cliente compris (B5). */
  dureeMin: Minutes
  /** Où le pro doit se rendre. */
  lieuCliente: Point
  /** Granularité des propositions. 15 minutes par défaut. */
  pasMin?: Minutes
  /** Rien avant cet instant : on ne propose pas un créneau déjà passé. */
  pasAvant?: Date
}

/** Durée de trajet entre deux points, déjà connue de l'appelant. */
export type LookupTrajet = (de: Point, vers: Point) => Minutes

const PAS_DEFAUT = 15
const MS_PAR_MIN = 60_000

/**
 * Créneaux proposables pour une journée.
 *
 * Un créneau est retenu s'il tient dans une plage de travail, ne chevauche
 * aucun rendez-vous, et laisse le temps des trajets de part et d'autre.
 */
export function creneauxDuJour(demande: DemandeCreneaux, trajet: LookupTrajet): Creneau[] {
  const pas = demande.pasMin ?? PAS_DEFAUT
  const duree = demande.dureeMin
  const rdvs = [...demande.rdvs].sort((a, b) => a.debut.getTime() - b.debut.getTime())
  const creneaux: Creneau[] = []

  for (const plage of demande.plages) {
    // On avance de pas en pas, en s'alignant sur des heures rondes.
    for (
      let t = alignerSurLePas(plage.debut, pas);
      t.getTime() + duree * MS_PAR_MIN <= plage.fin.getTime();
      t = new Date(t.getTime() + pas * MS_PAR_MIN)
    ) {
      const debut = t
      const fin = new Date(t.getTime() + duree * MS_PAR_MIN)

      if (demande.pasAvant && debut.getTime() < demande.pasAvant.getTime()) continue
      if (rdvs.some((r) => chevauche(debut, fin, r.debut, r.fin))) continue

      const precedent = dernierAvant(rdvs, debut)
      const suivant = premierApres(rdvs, fin)

      // Trajet depuis le rendez-vous précédent. Sans lieu connu, on ne peut
      // rien affirmer : on laisse passer plutôt que de masquer un créneau
      // valable à cause d'une adresse mal saisie.
      let trajetAvant: Minutes | undefined
      if (precedent?.lieu) {
        trajetAvant = trajet(precedent.lieu, demande.lieuCliente)
        const arriveeAuPlusTot = precedent.fin.getTime() + trajetAvant * MS_PAR_MIN
        if (debut.getTime() < arriveeAuPlusTot) continue
      }

      // Trajet vers le rendez-vous suivant.
      let trajetApres: Minutes | undefined
      if (suivant?.lieu) {
        trajetApres = trajet(demande.lieuCliente, suivant.lieu)
        const departAuPlusTard = suivant.debut.getTime() - trajetApres * MS_PAR_MIN
        if (fin.getTime() > departAuPlusTard) continue
      }

      creneaux.push({ debut, fin, trajetAvant, trajetApres })
    }
  }

  return creneaux
}

/**
 * Plages travaillées d'une journée : les horaires récurrents, moins les congés
 * et les blocages ponctuels.
 *
 * `weekday` suit la convention de la base : 0 = lundi.
 */
export function plagesDuJour(
  jour: Date,
  horaires: { weekday: number; starts_at: string; ends_at: string }[],
  indisponibilites: { debut: Date; fin: Date }[],
): Plage[] {
  const minuit = debutDeJour(jour)
  const dateLocale = instantVersHeureLocale(minuit).slice(0, 10)
  const jourSemaine = (new Date(`${dateLocale}T12:00:00Z`).getUTCDay() + 6) % 7

  const brutes: Plage[] = []
  for (const h of horaires) {
    if (h.weekday !== jourSemaine) continue
    const debut = heureLocaleVersInstant(`${dateLocale}T${h.starts_at.slice(0, 5)}`)
    const fin = heureLocaleVersInstant(`${dateLocale}T${h.ends_at.slice(0, 5)}`)
    if (debut && fin && fin > debut) brutes.push({ debut, fin })
  }

  // Chaque indisponibilité découpe les plages qu'elle touche.
  let plages = brutes
  for (const indispo of indisponibilites) {
    plages = plages.flatMap((p) => retrancher(p, indispo))
  }
  return plages.filter((p) => p.fin.getTime() - p.debut.getTime() >= MS_PAR_MIN)
}

/** Le prochain jour travaillé à partir de `depuis`, dans la limite donnée. */
export function joursOuvrables(
  depuis: Date,
  horaires: { weekday: number }[],
  nombreDeJours: number,
): Date[] {
  const ouverts = new Set(horaires.map((h) => h.weekday))
  const jours: Date[] = []
  for (let i = 0; i < nombreDeJours; i++) {
    const jour = debutDeJour(ajouterJours(depuis, i))
    const dateLocale = instantVersHeureLocale(jour).slice(0, 10)
    const jourSemaine = (new Date(`${dateLocale}T12:00:00Z`).getUTCDay() + 6) % 7
    if (ouverts.has(jourSemaine)) jours.push(jour)
  }
  return jours
}

function chevauche(debutA: Date, finA: Date, debutB: Date, finB: Date): boolean {
  return debutA.getTime() < finB.getTime() && finA.getTime() > debutB.getTime()
}

function dernierAvant(rdvs: RendezVousExistant[], instant: Date): RendezVousExistant | undefined {
  return [...rdvs].reverse().find((r) => r.fin.getTime() <= instant.getTime())
}

function premierApres(rdvs: RendezVousExistant[], instant: Date): RendezVousExistant | undefined {
  return rdvs.find((r) => r.debut.getTime() >= instant.getTime())
}

/** Aligne un instant sur le pas suivant (09:07 avec un pas de 15 donne 09:15). */
function alignerSurLePas(instant: Date, pas: Minutes): Date {
  const pasMs = pas * MS_PAR_MIN
  const reste = instant.getTime() % pasMs
  return reste === 0 ? instant : new Date(instant.getTime() + (pasMs - reste))
}

/** Retire une indisponibilité d'une plage : 0, 1 ou 2 morceaux en sortent. */
function retrancher(plage: Plage, indispo: { debut: Date; fin: Date }): Plage[] {
  if (indispo.fin <= plage.debut || indispo.debut >= plage.fin) return [plage]
  const morceaux: Plage[] = []
  if (indispo.debut > plage.debut) morceaux.push({ debut: plage.debut, fin: indispo.debut })
  if (indispo.fin < plage.fin) morceaux.push({ debut: indispo.fin, fin: plage.fin })
  return morceaux
}
