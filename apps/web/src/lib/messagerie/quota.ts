import { etatQuotaSms, moisDeFacturation, type EtatQuotaSms } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { mesurerPro } from '@/lib/telemetrie'

/**
 * B7 — le compteur mensuel de SMS de service, côté base.
 *
 * ⚠️ **Il n'est jamais affiché à la pro en usage normal.** Pas de jauge, pas de
 * décompte. Compter ses SMS n'est pas son métier, et une jauge permanente
 * transformerait un « tout compris » en angoisse mensuelle. Ce module sert deux
 * choses, et deux seulement : décider de la bascule de canal, et déclencher UNE
 * notification à 80 %.
 *
 * Droits élargis, à dessein : la table est verrouillée par conception (RLS
 * active, aucune politique). Une pro qui pourrait y écrire s'accorderait des
 * SMS ; une pro qui pourrait la lire verrait la jauge qu'on refuse de montrer.
 */

/** L'état du mois en cours, sans rien consommer. */
export async function quotaSmsDuMois(proId: string, quand = new Date()): Promise<EtatQuotaSms> {
  if (!supabaseConfigured()) return etatQuotaSms(0)
  const { data } = await supabaseAdmin()
    .from('sms_usage')
    .select('sent')
    .eq('pro_id', proId)
    .eq('period_start', moisDeFacturation(quand))
    .maybeSingle()
  return etatQuotaSms(data?.sent ?? 0)
}

/**
 * Incrémente APRÈS un envoi réussi, et rend le nouvel état.
 *
 * Après et non avant : un SMS qui n'est pas parti ne se compte pas. La pro ne
 * doit pas perdre un envoi parce que le fournisseur a eu un hoquet.
 */
export async function consommerSms(proId: string, quand = new Date()): Promise<EtatQuotaSms> {
  if (!supabaseConfigured()) return etatQuotaSms(0)
  const { data, error } = await supabaseAdmin().rpc('consommer_sms', {
    p_pro: proId,
    p_mois: moisDeFacturation(quand),
  })
  if (error) {
    console.error('consommer_sms_failed', error.code)
    // On ne bloque pas un envoi déjà parti sur un compteur qui n'a pas répondu.
    return etatQuotaSms(0)
  }
  /*
    E3 ⑦ — le volume SMS mensuel, qui valide le plafond de 300 et le coût de B7.

    Mesuré ICI, au point de consommation, et nulle part ailleurs : c'est le seul
    endroit par lequel tout envoi passe, donc le seul où le compte ne peut pas
    diverger. Le mois et le motif, jamais le destinataire ni le texte.
  */
  await mesurerPro('sms_envoye', proId, { mois: moisDeFacturation(quand) })

  return etatQuotaSms(typeof data === 'number' ? data : 0)
}

/**
 * Marque l'alerte des 80 % et dit si c'est la première fois du mois.
 *
 * Le test et l'écriture sont dans la même instruction SQL : deux envois
 * simultanés ne peuvent pas produire deux notifications. Prévenir une fois est
 * informatif, prévenir à chaque envoi est du harcèlement.
 */
export async function premiereAlerteDuMois(proId: string, quand = new Date()): Promise<boolean> {
  if (!supabaseConfigured()) return false
  const { data, error } = await supabaseAdmin().rpc('marquer_alerte_sms', {
    p_pro: proId,
    p_mois: moisDeFacturation(quand),
  })
  if (error) {
    console.error('marquer_alerte_sms_failed', error.code)
    return false
  }
  return data
}
