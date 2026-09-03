import { canalRappel, type CanalRappel, type SubscriptionState } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { envoyerSms, envoyerEmail } from '@/lib/messagerie'
import { quotaSmsDuMois, consommerSms, premiereAlerteDuMois } from '@/lib/messagerie/quota'

/**
 * B7 — la cascade complète, en un seul endroit.
 *
 * Elle choisit le canal, envoie, compte, et décide s'il faut prévenir la pro.
 * Tous les envois du produit passent par ici : c'est ce qui garantit que la
 * mécanique du plafond ne peut pas être contournée par un appelant distrait.
 *
 * **Les trois temps de B7.**
 * ① À 80 %, une notification UNIQUE et informative, avec la date estimée.
 * ② Au plafond, bascule AUTOMATIQUE et GRATUITE sur e-mail : aucune cliente ne
 *    se retrouve jamais sans message. Un pack reste proposable, en achat
 *    explicite d'un tap, jamais en facturation automatique.
 * ③ Remise à zéro le 1er, conséquence de la clé mensuelle.
 *
 * **Jamais de coupure de service, jamais de facturation automatique.** C'est
 * « l'app propose, le pro dispose » appliqué à l'argent.
 *
 * ⚠️ D14 : pendant la bêta, aucun fournisseur n'est configuré. `envoyerSms`
 * renvoie `non-configure`, et on bascule sur l'e-mail. Ce n'est pas un mode
 * dégradé, c'est le chemin normal des prochaines semaines.
 */

export type ResultatPrevenance = {
  /** Le canal par lequel la cliente a réellement été prévenue. */
  canal: CanalRappel | 'aucun'
  /** B7 ① : la pro franchit les 80 % pour la première fois ce mois-ci. */
  alerteQuota: boolean
}

export async function prevenirCliente({
  proId,
  destinataire,
  sujet,
  texte,
}: {
  proId: string
  destinataire: { telephone?: string | null; email?: string | null }
  sujet: string
  texte: string
}): Promise<ResultatPrevenance> {
  const telephone = destinataire.telephone ?? undefined
  const email = destinataire.email ?? undefined

  if (!supabaseConfigured()) return { canal: 'aucun', alerteQuota: false }
  const supabase = supabaseAdmin()
  const [abonnement, reglages, quota] = await Promise.all([
    supabase.from('subscriptions').select('tier, status').eq('pro_id', proId).maybeSingle(),
    supabase.from('pro_settings').select('sms_enabled').eq('pro_id', proId).maybeSingle(),
    quotaSmsDuMois(proId),
  ])
  const etat: SubscriptionState = abonnement.data
    ? { tier: abonnement.data.tier, status: abonnement.data.status }
    : { tier: 'tier_1', status: 'canceled' }

  const canal = canalRappel({
    abonnement: etat,
    smsActifs: reglages.data?.sms_enabled ?? false,
    plafondAtteint: quota.atteint,
  })

  if (canal === 'sms' && telephone) {
    const envoi = await envoyerSms({ telephone }, texte)
    if (envoi.statut === 'envoye') {
      // APRÈS l'envoi, jamais avant : un SMS qui n'est pas parti ne se compte
      // pas, et la pro ne doit pas perdre un envoi sur un hoquet du
      // fournisseur.
      const apres = await consommerSms(proId)
      const alerte = apres.alerte && !apres.atteint ? await premiereAlerteDuMois(proId) : false
      return { canal: 'sms', alerteQuota: alerte }
    }
    // Refus de destination, fournisseur absent (D14) ou panne : on bascule.
    // La cliente est prévenue, c'est tout ce qui compte pour elle.
  }

  if (email) {
    const envoi = await envoyerEmail({ email }, sujet, texte)
    if (envoi.statut === 'envoye' || envoi.statut === 'non-configure') {
      return { canal: 'email', alerteQuota: false }
    }
  }

  return { canal: 'aucun', alerteQuota: false }
}
