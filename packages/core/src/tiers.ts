/**
 * Feature-gating — §2 de la roadmap.
 *
 * Règle non négociable : toute route, tout écran et toute notification vérifie
 * le droit d'accès du compte. Le gating se pose ici, en un seul endroit, et se
 * lit partout ailleurs — jamais de `if (tier === ...)` disséminé dans le code.
 *
 * Les codes de palier sont neutres (tier_1/2/3) : les noms commerciaux ne sont
 * pas tranchés, et les montants non plus (§2 : « à confirmer via les entretiens »).
 */

export type Tier = 'tier_1' | 'tier_2' | 'tier_3'

export const TIERS: readonly Tier[] = ['tier_1', 'tier_2', 'tier_3'] as const

/** Palier de l'essai : la pro découvre le produit avec la tournée (§4). */
export const TRIAL_TIER: Tier = 'tier_2'
export const TRIAL_DAYS = 30

export type Capability =
  // Bloc A — réservation & vitrine
  | 'public_page' //            A1 + A2 SEO
  | 'booking_online' //         A3 créneaux simples
  | 'booking_geo_filtered' //   A3 créneaux géo-filtrés (LE différenciateur)
  | 'booking_photos' //         A4
  | 'booking_travelling' //     A5 cliente en déplacement / A6 hors-zone
  | 'reviews' //                A7
  | 'distance_fees' //          A8
  // Bloc B — agenda & gestion
  | 'clients' //                B1-B3 fiches, annotations techniques, notes RDV
  | 'manual_blocking' //        B4 + B5
  | 'completion_learning' //    B6 bouton Terminé + apprentissage des durées
  | 'sms_reminders' //          B7 (le quota dépend du palier, cf. SMS_QUOTA)
  | 'smart_followup' //         B8 relance intelligente
  | 'online_payment' //         B9 (dans tous les paliers : les frais sont
  //                                portés par la transaction du pro)
  | 'agenda' //                 B10
  // Bloc C — copilote de tournée
  | 'tour_copilot' //           C0-C6
  // Bloc E — statistiques
  | 'stats_basic' //            E2
  | 'stats_time_optimisation' // E1
  // Bloc F — support
  | 'support_assistant' //      F1 (« Disponible sur tous les paliers »)

/** Palier minimum requis. Un palier donne accès à tout ce qui est ≤ lui. */
const MINIMUM_TIER: Record<Capability, Tier> = {
  public_page: 'tier_1',
  booking_online: 'tier_1',
  booking_geo_filtered: 'tier_2',
  booking_photos: 'tier_1',
  booking_travelling: 'tier_2',
  reviews: 'tier_1',
  distance_fees: 'tier_2',
  clients: 'tier_1',
  manual_blocking: 'tier_1',
  completion_learning: 'tier_2',
  sms_reminders: 'tier_1',
  smart_followup: 'tier_3',
  online_payment: 'tier_1',
  agenda: 'tier_1',
  tour_copilot: 'tier_2',
  stats_basic: 'tier_2',
  stats_time_optimisation: 'tier_3',
  support_assistant: 'tier_1',
}

/**
 * Forfait SMS inclus par période (B7).
 *
 * ⚠️ Valeurs à confirmer — §2 dit « quota modeste / confortable / large » sans
 * chiffrer. Repère §3.1 : [H1] 60 RDV/mois × [H2] 2,3 SMS = ~138 SMS pour une
 * activité pleine ; [H3] +20 pour les relances du palier 3.
 * Question ouverte posée à Morgan : ne pas traiter ces nombres comme actés.
 */
export const SMS_QUOTA: Record<Tier, number> = {
  tier_1: 60,
  tier_2: 150,
  tier_3: 250,
}

/** Quota SMS de la période d'essai (§4 : « 30-50 »). */
export const TRIAL_SMS_QUOTA = 50

const RANK: Record<Tier, number> = { tier_1: 1, tier_2: 2, tier_3: 3 }

export type SubscriptionState = {
  tier: Tier
  status: 'trialing' | 'active' | 'past_due' | 'canceled'
}

/**
 * Le seul point de vérité du gating.
 *
 * `past_due` conserve l'accès : le dunning (G1) relance avant de suspendre —
 * on ne coupe pas l'agenda d'une pro en pleine journée pour une CB expirée.
 * `canceled` retombe au socle : la pro garde sa page et ses fiches clientes
 * (ses données lui appartiennent, cf. G5), pas la tournée.
 */
export function can(subscription: SubscriptionState, capability: Capability): boolean {
  const effectiveTier: Tier = subscription.status === 'canceled' ? 'tier_1' : subscription.tier
  return RANK[effectiveTier] >= RANK[MINIMUM_TIER[capability]]
}

export function smsQuotaFor(subscription: SubscriptionState): number {
  return subscription.status === 'trialing' ? TRIAL_SMS_QUOTA : SMS_QUOTA[subscription.tier]
}

/** Palier à vendre pour débloquer une capacité (écrans d'upsell). */
export function requiredTierFor(capability: Capability): Tier {
  return MINIMUM_TIER[capability]
}

export class CapabilityError extends Error {
  readonly capability: Capability

  constructor(capability: Capability) {
    super(`Capacité « ${capability} » non incluse dans ce palier.`)
    this.name = 'CapabilityError'
    this.capability = capability
  }
}

/**
 * Garde serveur. À appeler dans CHAQUE route et action qui touche à une
 * fonctionnalité gatée — la vérification côté client n'est qu'un confort
 * d'affichage, jamais une sécurité.
 */
export function assertCan(subscription: SubscriptionState, capability: Capability): void {
  if (!can(subscription, capability)) throw new CapabilityError(capability)
}
