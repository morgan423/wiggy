import { canalRappel, type CanalRappel, type SubscriptionState } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { quotaSmsDuMois } from '@/lib/messagerie/quota'

/**
 * Le canal de rappel d'un pro, lu en base.
 *
 * Droits élargis, à dessein, comme le calcul des créneaux : le palier et le
 * réglage SMS d'un pro ne sont pas publics. Ce qui sort d'ici est un seul mot,
 * `sms` ou `email` : ni le palier, ni la raison. La cliente ne doit jamais
 * pouvoir deviner l'offre de sa coiffeuse.
 */
export async function canalDeRappel(proId: string): Promise<CanalRappel> {
  // Sans base, on promet le moins : un rappel par e-mail qui n'arrive pas est
  // moins grave qu'un SMS promis et jamais parti.
  if (!supabaseConfigured()) return 'email'
  const supabase = supabaseAdmin()

  const [abonnement, reglages, quota] = await Promise.all([
    supabase.from('subscriptions').select('tier, status').eq('pro_id', proId).maybeSingle(),
    supabase.from('pro_settings').select('sms_enabled').eq('pro_id', proId).maybeSingle(),
    quotaSmsDuMois(proId),
  ])

  const etat: SubscriptionState = abonnement.data
    ? { tier: abonnement.data.tier, status: abonnement.data.status }
    : { tier: 'tier_1', status: 'canceled' }

  return canalRappel({
    abonnement: etat,
    smsActifs: reglages.data?.sms_enabled ?? false,
    // B7 : au plafond, la bascule est AUTOMATIQUE et GRATUITE. Aucune cliente
    // ne se retrouve jamais sans rappel, et rien n'est facturé sans un tap
    // explicite de la pro. C'est « l'app propose, le pro dispose » appliqué à
    // l'argent.
    plafondAtteint: quota.atteint,
  })
}
