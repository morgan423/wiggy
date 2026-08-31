import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  paymentTermsFor,
  cancellationNoticeFor,
  depositPercentFor,
  type PaymentSettings,
  type PaymentMode,
} from './payment-terms.ts'

const base: PaymentSettings = {
  mode: 'off',
  defaultDepositPercent: 100,
  freeCancellationHours: 24,
}

const MODES: PaymentMode[] = ['off', 'client_choice', 'required']
const DEPOSITS = [1, 30, 50, 99, 100]

// Les deux phrases qui coexistaient à tort sur wiggy.fr.
const APRES = 'qu’après la prestation'
const ACOMPTE = 'Acompte de'

test('S1 — les deux formulations contradictoires ne coexistent jamais', () => {
  for (const mode of MODES) {
    for (const defaultDepositPercent of DEPOSITS) {
      for (const serviceDepositPercent of [null, ...DEPOSITS]) {
        const terms = paymentTermsFor({
          ...base,
          mode,
          defaultDepositPercent,
          serviceDepositPercent,
        })
        const texte = `${terms.headline} ${terms.detail ?? ''}`
        assert.ok(
          !(texte.includes(APRES) && texte.includes(ACOMPTE)),
          `mode=${mode} defaut=${defaultDepositPercent} presta=${serviceDepositPercent} → « ${texte} »`,
        )
      }
    }
  }
})

test('paiement désactivé → paiement sur place, rien en ligne', () => {
  const terms = paymentTermsFor({ ...base, mode: 'off', defaultDepositPercent: 30 })
  assert.match(terms.headline, /qu’après la prestation/)
  assert.equal(terms.onlinePercent, 0)
  assert.equal(terms.required, false)
  // Même avec un acompte réglé, mode 'off' ne doit rien réclamer en ligne.
  assert.ok(!terms.headline.includes('Acompte'))
})

test('acompte partiel obligatoire → une seule phrase, avec le reste sur place', () => {
  const terms = paymentTermsFor({ ...base, mode: 'required', defaultDepositPercent: 30 })
  assert.equal(terms.headline, 'Acompte de 30 % à la réservation, le reste sur place')
  assert.equal(terms.onlinePercent, 30)
  assert.equal(terms.required, true)
})

test('totalité obligatoire → règlement en ligne, sans mention d’acompte', () => {
  const terms = paymentTermsFor({ ...base, mode: 'required', defaultDepositPercent: 100 })
  assert.ok(!terms.headline.includes('Acompte'))
  assert.equal(terms.onlinePercent, 100)
})

test('au choix de la cliente → on annonce un choix, pas une règle', () => {
  const terms = paymentTermsFor({ ...base, mode: 'client_choice', defaultDepositPercent: 30 })
  assert.match(terms.headline, /Vous choisissez/)
  assert.equal(terms.required, false)
})

test('l’acompte de la prestation prime sur le réglage global', () => {
  // B9 : 30 % par défaut, mais 100 % sur les mariages.
  assert.equal(
    depositPercentFor({ ...base, defaultDepositPercent: 30, serviceDepositPercent: 100 }),
    100,
  )
  assert.equal(
    depositPercentFor({ ...base, defaultDepositPercent: 30, serviceDepositPercent: null }),
    30,
  )
})

test('S6 — tout est au vouvoiement côté cliente', () => {
  for (const mode of MODES) {
    const terms = paymentTermsFor({ ...base, mode, defaultDepositPercent: 30 })
    const texte = `${terms.headline} ${terms.detail ?? ''}`
    assert.ok(!/\bTu\b|\bton\b|\bta\b|\btes\b|\btu\b/.test(texte), `${mode} → « ${texte} »`)
  }
})

test('A10 — le délai d’annulation suit le réglage du pro', () => {
  assert.match(cancellationNoticeFor({ ...base, freeCancellationHours: 24 }), /1 jour/)
  assert.match(cancellationNoticeFor({ ...base, freeCancellationHours: 48 }), /2 jours/)
  assert.match(cancellationNoticeFor({ ...base, freeCancellationHours: 6 }), /6 h/)
  assert.match(cancellationNoticeFor({ ...base, freeCancellationHours: 0 }), /à tout moment/)
})
