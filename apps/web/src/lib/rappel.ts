import { canalRappel, type CanalRappel, type SubscriptionState } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'

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

  const [abonnement, reglages] = await Promise.all([
    supabase.from('subscriptions').select('tier, status').eq('pro_id', proId).maybeSingle(),
    supabase.from('pro_settings').select('sms_enabled').eq('pro_id', proId).maybeSingle(),
  ])

  const etat: SubscriptionState = abonnement.data
    ? { tier: abonnement.data.tier, status: abonnement.data.status }
    : { tier: 'tier_1', status: 'canceled' }

  return canalRappel({
    abonnement: etat,
    smsActifs: reglages.data?.sms_enabled ?? false,
    // B7 : le plafond du mois n'est pas encore compté. Le jour où il le sera,
    // c'est la seule ligne à changer, et aucun texte à réécrire.
    plafondAtteint: false,
  })
}
