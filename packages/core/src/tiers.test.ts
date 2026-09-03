// Vérifie le gating ligne par ligne contre le tableau §2 de la roadmap.
// Si la grille bouge, ce test doit bouger avec elle — c'est le garde-fou
// contre un gating qui dérive silencieusement du document produit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, requiredTierFor, TIERS, type Capability, type Tier } from './tiers.ts'

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
  // B7 réécrite le 02/09 : le palier 1 n'a pas de SMS du tout.
  ['sms_reminders', ['tier_2', 'tier_3']],
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

/*
 * Le test du quota d'essai a disparu avec le modèle qu'il vérifiait. Ce que
 * l'essai inclut en SMS est une question ouverte, inscrite dans la section
 * d'arbitrage de `docs/journal.md` : elle ne se tranche pas dans un test.
 */

/**
 * B7, réécrite le 02/09 : le palier 1 n'a pas de SMS du tout, ses rappels
 * passent par e-mail et notification.
 *
 * Ce test protège une cliente, pas une ligne de facturation. Tant que le
 * palier 1 portait la capacité, sa page de réservation pouvait lui promettre
 * un rappel par SMS qui ne serait jamais parti.
 */
test('le palier 1 n’a pas de SMS, et ce n’est pas un quota à zéro', () => {
  assert.equal(can({ tier: 'tier_1', status: 'active' }, 'sms_reminders'), false)
  assert.equal(can({ tier: 'tier_2', status: 'active' }, 'sms_reminders'), true)
  assert.equal(requiredTierFor('sms_reminders'), 'tier_2')
  // Une résiliation retombe au socle : la capacité tombe avec elle.
  assert.equal(can({ tier: 'tier_3', status: 'canceled' }, 'sms_reminders'), false)
})

/**
 * D10 ③ — un seul système de droits.
 *
 * Le mode d'exercice (itinérante ou fixe) est un drapeau d'AFFICHAGE. Il ne
 * donne rien, il n'enlève rien : mêmes paliers, mêmes prix, aucun palier
 * parallèle. Ce test protège cette frontière autrement qu'en y croyant : il
 * lit le module de gating et refuse d'y voir apparaître le mot.
 *
 * Le jour où quelqu'un écrira `if (mode === 'fixe')` dans `tiers.ts` pour
 * « retirer la tournée aux pros fixes », ce test tombera. Et il aura raison :
 * en fixe, les fonctions géo ne sont pas RENDUES, ce qui est une décision
 * d'écran ; elles ne sont pas RETIRÉES, ce qui serait une décision de droits.
 */
test('le mode d’exercice n’entre jamais dans le gating', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const source = readFileSync(fileURLToPath(new URL('./tiers.ts', import.meta.url)), 'utf8')
  const code = source
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('*') && !ligne.trim().startsWith('//'))
    .join('\n')
  for (const interdit of ['itinerant', 'fixe', "'mode'", 'mode:']) {
    assert.ok(
      !code.includes(interdit),
      `« ${interdit} » apparaît dans tiers.ts : le mode d’exercice n’est pas un droit (D10 ③)`,
    )
  }
})
