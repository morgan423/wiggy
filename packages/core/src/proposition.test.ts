import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  rendezVousApresAcceptation,
  repondable,
  changements,
  CAPTURE_A_LA_CONFIRMATION,
} from './proposition.ts'

const rdv = {
  service_name: 'Coupe',
  price_cents: 4500,
  duration_min: 45,
  debut: new Date('2026-09-10T10:00:00Z'),
}

test('une proposition ne change que ce qu’elle change', () => {
  // Le cas type du terrain : les photos révèlent une coupe longue réservée en
  // coupe moyenne. Le prix et la durée bougent, la date non.
  const apres = rendezVousApresAcceptation(rdv, {
    sorte: 'contre_proposition',
    etat: 'en_attente',
    prixCents: 6500,
    dureeMin: 75,
  })
  assert.equal(apres.price_cents, 6500)
  assert.equal(apres.duration_min, 75)
  assert.equal(apres.service_name, 'Coupe')
  assert.equal(apres.debut.toISOString(), rdv.debut.toISOString())
})

test('les trois sortes partagent le même cycle', () => {
  // C'est tout le motif de la généralisation : trois mécaniques séparées, ce
  // seraient trois façons de dire non et trois endroits où oublier un cas.
  for (const sorte of ['contre_proposition', 'forfait', 'report'] as const) {
    assert.ok(repondable({ sorte, etat: 'en_attente' }))
    assert.ok(!repondable({ sorte, etat: 'acceptee' }))
    assert.ok(!repondable({ sorte, etat: 'caduque' }))
  }
})

test('la cliente voit ce qui bouge, pas tout son rendez-vous', () => {
  // Une proposition qui ne dit pas ce qu'elle change se lit comme un piège.
  const liste = changements(
    { sorte: 'contre_proposition', etat: 'en_attente', prixCents: 6500, dureeMin: 45 },
    { serviceNom: 'Coupe', prixCents: 4500, dureeMin: 45 },
  )
  assert.deepEqual(
    liste.map((c) => c.quoi),
    ['prix'],
  )
})

test('la règle de paiement d’A11 est gravée avant B9', () => {
  // Autorisation à la demande, capture à la confirmation finale et sur le
  // montant final. Jamais de capture suivie d'un remboursement : ça coûte des
  // frais, ça inquiète, et ça abîme ce que le zéro commission construit.
  assert.equal(CAPTURE_A_LA_CONFIRMATION, true)
})
