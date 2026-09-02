import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  optionsAvecNeutre,
  texteDeLaValeur,
  VALEUR_NEUTRE,
  OptionNeutreManquante,
} from './selection.ts'

const FICHES = [
  { valeur: 'a', texte: 'André' },
  { valeur: 'b', texte: 'Chantal' },
]

/**
 * R3-1 : une liste déroulante ne peut pas se construire sans option neutre.
 * C'est le test que le cahier des charges du lot 1 exige : la règle doit être
 * prouvée, pas seulement écrite dans une revue de code.
 */
test('une liste sans libellé d’option neutre refuse de se construire', () => {
  for (const absent of ['', '   ', undefined, null]) {
    assert.throws(
      () => optionsAvecNeutre(absent as unknown as string, FICHES),
      OptionNeutreManquante,
      `libellé ${JSON.stringify(absent)}`,
    )
  }
})

test('l’option neutre vient en tête et porte la valeur vide', () => {
  const options = optionsAvecNeutre('Choisis dans tes fiches', FICHES)
  assert.equal(options.length, 3)
  assert.deepEqual(options[0], { valeur: VALEUR_NEUTRE, texte: 'Choisis dans tes fiches' })
  // Les options réelles suivent, dans l'ordre reçu.
  assert.deepEqual(
    options.slice(1).map((o) => o.valeur),
    ['a', 'b'],
  )
})

test('une option ne peut pas usurper la valeur de l’option neutre', () => {
  // Sinon deux entrées se disputeraient la même valeur, et « rien de choisi »
  // deviendrait indiscernable d'un vrai choix.
  assert.throws(
    () => optionsAvecNeutre('Choisis', [{ valeur: '', texte: 'Sans fiche' }]),
    OptionNeutreManquante,
  )
})

test('la valeur vide s’affiche comme l’option neutre, jamais comme un choix', () => {
  assert.equal(
    texteDeLaValeur(VALEUR_NEUTRE, 'Choisis dans tes fiches', FICHES),
    'Choisis dans tes fiches',
  )
  assert.equal(texteDeLaValeur('b', 'Choisis dans tes fiches', FICHES), 'Chantal')
  // Une valeur qui ne correspond à rien retombe sur le neutre : mieux vaut
  // « rien de choisi » qu'un libellé vide dont personne ne sait ce qu'il vaut.
  assert.equal(
    texteDeLaValeur('disparue', 'Choisis dans tes fiches', FICHES),
    'Choisis dans tes fiches',
  )
})
