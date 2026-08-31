// Vérifie le gating ligne par ligne contre le tableau §2 de la roadmap.
// Si la grille bouge, ce test doit bouger avec elle — c'est le garde-fou
// contre un gating qui dérive silencieusement du document produit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, requiredTierFor, smsQuotaFor, TIERS, type Capability, type Tier } from './tiers.ts'

const active = (tier: Tier) => ({ tier, status: 'active' as const })

/** [capacité, paliers qui y ont droit] — transcription directe du tableau §2. */
const GRID: [Capability, Tier[]][] = [
  ['public_page', ['tier_1', 'tier_2', 'tier_3']],
  ['booking_online', ['tier_1', 'tier_2', 'tier_3']],
  ['booking_geo_filtered', ['tier_2', 'tier_3']],
  ['booking_photos', ['tier_1', 'tier_2', 'tier_3']],
  ['booking_travelling', ['tier_2', 'tier_3']],
  ['reviews', ['tier_1', 'tier_2', 'tier_3']],
  ['distance_fees', ['tier_2', 'tier_3']],
  ['clients', ['tier_1', 'tier_2', 'tier_3']],
  ['manual_blocking', ['tier_1', 'tier_2', 'tier_3']],
  ['completion_learning', ['tier_2', 'tier_3']],
  ['sms_reminders', ['tier_1', 'tier_2', 'tier_3']],
  ['smart_followup', ['tier_3']],
  ['online_payment', ['tier_1', 'tier_2', 'tier_3']],
  ['agenda', ['tier_1', 'tier_2', 'tier_3']],
  ['tour_copilot', ['tier_2', 'tier_3']],
  ['stats_basic', ['tier_2', 'tier_3']],
  ['stats_time_optimisation', ['tier_3']],
  ['support_assistant', ['tier_1', 'tier_2', 'tier_3']],
]

test('la grille de gating correspond au tableau §2', () => {
  for (const [capability, allowed] of GRID) {
    for (const tier of TIERS) {
      assert.equal(can(active(tier), capability), allowed.includes(tier), `${capability} / ${tier}`)
    }
  }
})

test('la tournée est en offre 2, jamais en offre 3', () => {
  // §2 : « ce qui ne bouge pas : la tournée est en offre 2 ».
  assert.equal(requiredTierFor('tour_copilot'), 'tier_2')
  assert.equal(requiredTierFor('booking_geo_filtered'), 'tier_2')
})

test("l'offre 1 reste digne : page, résa, fiches, paiement, agenda", () => {
  // §2 : « une pro en offre 1 a un produit qui marche ».
  for (const capability of [
    'public_page',
    'booking_online',
    'clients',
    'online_payment',
    'agenda',
    'reviews',
  ] as Capability[]) {
    assert.ok(can(active('tier_1'), capability), capability)
  }
})

test('le dunning ne coupe pas l’accès, la résiliation retombe au socle', () => {
  assert.ok(can({ tier: 'tier_2', status: 'past_due' }, 'tour_copilot'))
  assert.ok(!can({ tier: 'tier_2', status: 'canceled' }, 'tour_copilot'))
  // Ses données lui appartiennent (G5) : les fiches clientes restent lisibles.
  assert.ok(can({ tier: 'tier_2', status: 'canceled' }, 'clients'))
})

test("l'essai donne le quota d'essai, pas celui du palier", () => {
  assert.equal(smsQuotaFor({ tier: 'tier_2', status: 'trialing' }), 50)
  assert.equal(smsQuotaFor({ tier: 'tier_2', status: 'active' }), 150)
})
