import type { ResultatTrajet } from '@wiggy/core'
import { trajets } from '@/lib/trajets'

/**
 * Les trajets d'une journée : le temps entre chaque rendez-vous et le suivant.
 *
 * C'est ce qui matérialise la promesse « ta journée en tournée logique » (C0),
 * et ce qui manque à un agenda ordinaire. Un rendez-vous sans coordonnées ne
 * casse pas la chaîne : il n'affiche simplement pas de trajet, plutôt que
 * d'annoncer un temps inventé.
 *
 * Un seul appel à la matrice pour toute la journée. Au-delà de ce qu'un appel
 * accepte, le moteur bascule de lui-même sur l'estimation : mieux vaut une
 * durée approchée, signalée comme telle, que pas de tournée du tout.
 */

export type RdvLocalise = {
  id: string
  starts_at: string
  lat: number | null
  lng: number | null
}

/** Trajet vers chaque rendez-vous, indexé par l'identifiant du rendez-vous. */
export type Trajets = Map<string, ResultatTrajet>

export async function trajetsDeLaJournee(rdvs: RdvLocalise[]): Promise<Trajets> {
  const etapes = rdvs
    .flatMap((r) =>
      r.lat !== null && r.lng !== null
        ? [{ id: r.id, starts_at: r.starts_at, point: { lat: r.lat, lng: r.lng } }]
        : [],
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const resultat: Trajets = new Map()
  if (etapes.length < 2) return resultat

  const matrice = await trajets.matrice(
    etapes.map((e) => e.point),
    etapes.map((e) => e.point),
  )

  for (let i = 1; i < etapes.length; i++) {
    resultat.set(etapes[i].id, matrice[i - 1][i])
  }
  return resultat
}

/** « 8 min de trajet », comme le board. L'estimation se dit, elle ne se cache pas. */
export function libelleTrajet(trajet: ResultatTrajet): string {
  const base = `${trajet.minutes} min de trajet`
  return trajet.source === 'estimation' ? `${base} (estimé)` : base
}
