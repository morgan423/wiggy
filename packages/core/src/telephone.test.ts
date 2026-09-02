import { test } from 'node:test'
import assert from 'node:assert/strict'
import { numeroFrancais, destinationSmsAutorisee } from './telephone.ts'

test('les formes françaises courantes tombent toutes sur le même numéro', () => {
  for (const forme of [
    '0612345678',
    '06 12 34 56 78',
    '06.12.34.56.78',
    '06-12-34-56-78',
    '+33612345678',
    '+33 6 12 34 56 78',
    '0033612345678',
  ]) {
    assert.equal(numeroFrancais(forme), '0612345678', forme)
  }
})

test('les DOM sont ouverts, les collectivités ne le sont pas', () => {
  // D11 dit « métropolitaine et DOM », pas « outre-mer ».
  assert.equal(numeroFrancais('+262692123456'), '0692123456', 'La Réunion')
  assert.equal(numeroFrancais('+590690123456'), '0690123456', 'Guadeloupe')
  assert.equal(numeroFrancais('+594694123456'), '0694123456', 'Guyane')
  assert.equal(numeroFrancais('+596696123456'), '0696123456', 'Martinique')

  assert.equal(numeroFrancais('+687751234'), null, 'Nouvelle-Calédonie')
  assert.equal(numeroFrancais('+689871234'), null, 'Polynésie')
})

/**
 * Le cœur du garde-fou D11 : la fraude au pompage vise des numéros surtaxés à
 * l'étranger, dont l'attaquant touche une part. Hors du plan français, rien ne
 * part, quel que soit le plafond.
 */
test('aucun SMS ne part hors du plan français', () => {
  for (const etranger of [
    '+441234567890', // Royaume-Uni
    '+12025550100', // États-Unis
    '+22507123456', // Côte d’Ivoire
    '+37012345678', // Lituanie, indicatif classique du pompage
    '+8801712345678', // Bangladesh
  ]) {
    assert.equal(destinationSmsAutorisee(etranger), false, etranger)
  }
  assert.equal(destinationSmsAutorisee('0612345678'), true)
})

test('les saisies malformées sont refusées, pas devinées', () => {
  for (const mauvais of ['', '06', '0612345', '06123456789', '0012345678', '+33', 'allo', '0012']) {
    assert.equal(numeroFrancais(mauvais), null, JSON.stringify(mauvais))
  }
  // Un numéro national ne commence jamais par 00 après le zéro initial.
  assert.equal(numeroFrancais('0012345678'), null)
})
