import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  versionEnVigueur,
  documentsARedemander,
  acceptationComplete,
  CASE_PRECOCHEE,
  DOCUMENTS_DU_POINT,
  POINTS_ACCEPTATION,
} from './contrat.ts'

const doc = (slug: string, version: string, effectiveOn: string) => ({
  slug,
  version,
  effectiveOn,
  titre: slug,
  corps: 'texte',
})

const BETA = [
  doc('cgv', '0.1-beta', '2026-01-01'),
  doc('confidentialite', '0.1-beta', '2026-01-01'),
]

test('la case n’est jamais pré-cochée', () => {
  assert.equal(CASE_PRECOCHEE, false)
})

test('les quatre points d’acceptation existent, et seulement eux', () => {
  assert.equal(POINTS_ACCEPTATION.length, 4)
  assert.deepEqual(Object.keys(DOCUMENTS_DU_POINT).sort(), [...POINTS_ACCEPTATION].sort())
})

test('la version en vigueur est la plus récente déjà entrée en vigueur', () => {
  const versions = [
    doc('cgv', '1.0', '2026-03-01'),
    doc('cgv', '0.1-beta', '2026-01-01'),
    doc('cgv', '2.0', '2026-09-01'),
  ]
  assert.equal(versionEnVigueur(versions, 'cgv', '2026-05-15')?.version, '1.0')
})

test('une version préparée à l’avance ne s’applique pas avant sa date', () => {
  // Le préavis de trente jours des CGV : le texte est en base, visible, et ne
  // s'impose qu'au jour dit. Sans tâche planifiée pour le basculer.
  const versions = [doc('cgv', '1.0', '2026-03-01'), doc('cgv', '2.0', '2026-09-01')]
  assert.equal(versionEnVigueur(versions, 'cgv', '2026-08-31')?.version, '1.0')
  assert.equal(versionEnVigueur(versions, 'cgv', '2026-09-01')?.version, '2.0')
})

test('un document inconnu ne rend rien, jamais un texte vide', () => {
  assert.equal(versionEnVigueur(BETA, 'inexistant', '2026-05-01'), null)
})

test('à l’inscription, les deux documents sont à faire accepter', () => {
  const reste = documentsARedemander('inscription_pro', BETA, [], '2026-05-01')
  assert.deepEqual(
    reste.map((r) => r.slug),
    ['cgv', 'confidentialite'],
  )
  assert.equal(acceptationComplete('inscription_pro', BETA, [], '2026-05-01'), false)
})

test('une fois les deux acceptés, le point est franchi', () => {
  const acceptees = [
    { docSlug: 'cgv', docVersion: '0.1-beta' },
    { docSlug: 'confidentialite', docVersion: '0.1-beta' },
  ]
  assert.equal(acceptationComplete('inscription_pro', BETA, acceptees, '2026-05-01'), true)
})

test('UNE NOUVELLE VERSION REDEMANDE L’ACCORD, sans effacer l’ancien', () => {
  // C'est la règle non négociable de G7, et le test qui la tient.
  const acceptees = [
    { docSlug: 'cgv', docVersion: '0.1-beta' },
    { docSlug: 'confidentialite', docVersion: '0.1-beta' },
  ]
  // L'avocat livre ses textes : une LIGNE de plus, aucun code touché.
  const apresAvocat = [...BETA, doc('cgv', '1.0', '2026-06-01')]

  // Avant l'entrée en vigueur, rien ne bouge pour la pro.
  assert.equal(acceptationComplete('inscription_pro', apresAvocat, acceptees, '2026-05-01'), true)

  // Le jour dit, les CGV — et elles seules — reviennent.
  const reste = documentsARedemander('inscription_pro', apresAvocat, acceptees, '2026-06-01')
  assert.deepEqual(
    reste.map((r) => r.slug),
    ['cgv'],
  )
  // Et l'acceptation passée est toujours là, attachée au texte qu'elle visait.
  assert.equal(acceptees[0].docVersion, '0.1-beta')
})

test('un document manquant en base bloque le point plutôt que de le laisser passer', () => {
  const reste = documentsARedemander('inscription_pro', [BETA[0]], [], '2026-05-01')
  assert.equal(reste.length, 2)
  assert.equal(reste[1].document, null)
  assert.equal(acceptationComplete('inscription_pro', [BETA[0]], [], '2026-05-01'), false)
})

test('l’activation du paiement ne présente aucun document Wiggy', () => {
  // C'est Stripe qui recueille l'accord ; nous n'enregistrons que l'événement.
  assert.deepEqual(DOCUMENTS_DU_POINT.activation_paiement, [])
  assert.equal(acceptationComplete('activation_paiement', [], [], '2026-05-01'), true)
})
