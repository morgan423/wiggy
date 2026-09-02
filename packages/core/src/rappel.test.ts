import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canalRappel, emailRequis, type EtatRappel } from './rappel.ts'

const OFFRE_2: EtatRappel = {
  abonnement: { tier: 'tier_2', status: 'active' },
  smsActifs: true,
}

/**
 * La règle qui compte : trois causes, un seul rendu. Si ce test tombe, c'est
 * que la cliente peut déduire quelque chose de l'offre de sa coiffeuse.
 */
test('les trois causes produisent exactement le même canal', () => {
  const offreUn = canalRappel({ ...OFFRE_2, abonnement: { tier: 'tier_1', status: 'active' } })
  const smsCoupes = canalRappel({ ...OFFRE_2, smsActifs: false })
  const plafond = canalRappel({ ...OFFRE_2, plafondAtteint: true })

  assert.equal(offreUn, 'email')
  assert.equal(smsCoupes, 'email')
  assert.equal(plafond, 'email')
  assert.equal(offreUn, smsCoupes)
  assert.equal(smsCoupes, plafond)
})

test('le cas courant reste le SMS', () => {
  assert.equal(canalRappel(OFFRE_2), 'sms')
  assert.equal(canalRappel({ ...OFFRE_2, abonnement: { tier: 'tier_3', status: 'active' } }), 'sms')
  // Le dunning ne coupe pas l'accès : une CB expirée ne change pas la promesse
  // faite à une cliente qui réserve aujourd'hui.
  assert.equal(
    canalRappel({ ...OFFRE_2, abonnement: { tier: 'tier_2', status: 'past_due' } }),
    'sms',
  )
})

test('une résiliation bascule sur l’e-mail, comme le reste du socle', () => {
  assert.equal(
    canalRappel({ ...OFFRE_2, abonnement: { tier: 'tier_3', status: 'canceled' } }),
    'email',
  )
})

test('l’e-mail n’est obligatoire que si c’est par lui qu’on prévient', () => {
  assert.equal(emailRequis('email'), true)
  assert.equal(emailRequis('sms'), false)
})
