import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initiale,
  pastillePour,
  pastilleDansListe,
  sourceAvatar,
  PASTILLES,
  TEXTE_SUR_PASTILLE,
} from './avatar.ts'

test('l’initiale gère les noms réels du métier', () => {
  assert.equal(initiale('Léa Martin'), 'L')
  assert.equal(initiale('  élodie  '), 'É')
  assert.equal(initiale('Jean-Baptiste'), 'J')
  assert.equal(initiale("O'Connor"), 'O')
  assert.equal(initiale(''), '?')
  assert.equal(initiale('   '), '?')
  assert.equal(initiale('42 rue'), '4')
})

test('la pastille est déterministe — la même cliente garde sa couleur', () => {
  const a = pastillePour('Mme Martin')
  for (let i = 0; i < 20; i++) assert.equal(pastillePour('Mme Martin'), a)
  assert.equal(pastillePour('mme martin'), a, 'la casse ne doit pas changer la couleur')
  assert.equal(pastillePour('  Mme Martin  '), a)
})

test('la pastille reste dans la palette', () => {
  for (const nom of ['Awa', 'Marc', 'Jeanne', 'Lou', 'Karim', 'Elsa', 'Théo', 'Nadia', '']) {
    assert.ok(PASTILLES.includes(pastillePour(nom)), nom)
  }
})

test('jamais deux fois la même pastille côte à côte', () => {
  const noms = ['Awa', 'Marc', 'Jeanne', 'Lou', 'Karim', 'Elsa', 'Théo', 'Nadia', 'Awa', 'Awa']
  let precedente
  for (const [rang, nom] of noms.entries()) {
    const p = pastilleDansListe(nom, rang, precedente)
    assert.notEqual(p, precedente, `${nom} au rang ${rang} répète la couleur précédente`)
    precedente = p
  }
})

test('le texte sur miel et abricot n’est jamais clair', () => {
  assert.equal(TEXTE_SUR_PASTILLE.celebration, 'surMiel')
  assert.equal(TEXTE_SUR_PASTILLE.attente, 'surMiel')
  assert.equal(TEXTE_SUR_PASTILLE.action, 'surPlein')
})

test('la photo prime, l’illustration ensuite, l’initiale en dernier', () => {
  assert.equal(sourceAvatar({ photoUrl: 'https://…/photo.jpg', illustration: 'awa' }), 'photo')
  assert.equal(sourceAvatar({ illustration: 'awa' }), 'illustration')
  assert.equal(sourceAvatar({}), 'initiale')
  assert.equal(sourceAvatar({ photoUrl: '', illustration: null }), 'initiale')
})
