import { instantVersHeureLocale } from '@wiggy/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@wiggy/api'

/**
 * D15 — le lancement de journée, côté base.
 *
 * Deux façons de lancer, et les deux valent lancement : le bouton en tête de la
 * tournée, et l'ouverture du premier GPS. La seconde est la plus honnête des
 * deux : personne n'ouvre un itinéraire sans partir.
 *
 * Ce que ce module ne fait jamais : clôturer quoi que ce soit. Lancer une
 * journée dit que la pro est partie, pas que son travail est fait.
 */

/** La clé du jour, en heure locale : une journée de travail est un jour civil. */
export function jourDe(quand: Date): string {
  return instantVersHeureLocale(quand).slice(0, 10)
}

export async function journeeEstLancee(
  client: SupabaseClient<Database>,
  proId: string,
  quand: Date,
): Promise<boolean> {
  const { data, error } = await client
    .from('journees')
    .select('jour')
    .eq('pro_id', proId)
    .eq('jour', jourDe(quand))
    .maybeSingle()
  if (error) {
    // La table arrive avec la migration 0014. Tant qu'elle n'est pas collée, on
    // répond « pas lancée » : c'est la réponse prudente, celle qui ne prétend
    // rien sur une action de la pro.
    console.error('journee_illisible', error.code, 'migration 0014 appliquée ?')
    return false
  }
  return data !== null
}

/**
 * Marque la journée comme lancée. Idempotent : relancer deux fois la même
 * journée ne change rien, et c'est exactement ce qu'on veut d'un geste qui peut
 * partir d'un bouton ou d'un tap sur le GPS.
 */
export async function lancerJournee(
  client: SupabaseClient<Database>,
  proId: string,
  quand: Date,
): Promise<void> {
  const { error } = await client
    .from('journees')
    .upsert({ pro_id: proId, jour: jourDe(quand) }, { onConflict: 'pro_id,jour' })
  if (error) console.error('lancement_journee_failed', error.code)
}

/**
 * D16 — le point de départ du JOUR, quand la pro a confirmé sa position.
 *
 * ⚠️ **CADRAGE RGPD NON NÉGOCIABLE.** La position ponctuelle sert au CALCUL et
 * n'est **jamais stockée en base**. Aucun historique de localisation de la pro,
 * sous aucun prétexte : ce serait une donnée que nous n'avons aucune raison de
 * détenir, et dont la seule existence créerait un risque.
 *
 * Elle vit donc dans un cookie de session, sur SON appareil, portant SA
 * position, valable UNE journée. Ce n'est pas un historique : c'est une valeur
 * unique qui s'efface d'elle-même. Elle ne transite par aucune de nos tables.
 */
const COOKIE_DEPART = 'wiggy_depart_du_jour'

export type PositionDuJour = { jour: string; lat: number; lng: number }

export async function departDuJour(jour: string): Promise<PositionDuJour | null> {
  const { cookies } = await import('next/headers')
  const brut = (await cookies()).get(COOKIE_DEPART)?.value
  if (!brut) return null
  try {
    const lu = JSON.parse(brut) as Partial<PositionDuJour>
    if (lu.jour !== jour) return null
    if (typeof lu.lat !== 'number' || typeof lu.lng !== 'number') return null
    return { jour, lat: lu.lat, lng: lu.lng }
  } catch {
    return null
  }
}

export async function retenirDepartDuJour(position: PositionDuJour): Promise<void> {
  const { cookies } = await import('next/headers')
  const magasin = await cookies()
  magasin.set(COOKIE_DEPART, JSON.stringify(position), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/app',
    // Une journée, pas davantage. La valeur s'efface d'elle-même : rien à
    // purger, donc rien qui puisse ne pas être purgé.
    maxAge: 16 * 3600,
  })
}
