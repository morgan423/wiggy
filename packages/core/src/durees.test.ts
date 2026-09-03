import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dureeApprise, dureeReelle } from './durees.ts'

const m = (...minutes: number[]) => minutes.map((n) => ({ minutes: n }))

test('sans historique, le catalogue fait foi', () => {
  assert.equal(dureeApprise({ dureeCatalogue: 60 }), 60)
})

test('une seule mesure ne fait pas un apprentissage', () => {
  // Un rendez-vous, c'est une anecdote. On ne réorganise pas une journée
  // dessus.
  assert.equal(dureeApprise({ dureeCatalogue: 60, historiqueCliente: m(90) }), 60)
  assert.equal(dureeApprise({ dureeCatalogue: 60, historiquePro: m(90, 90) }), 60)
})

test('la cliente prime sur la pro', () => {
  // « Mme Martin plus couleur égale toujours quinze minutes de plus » : c'est
  // exactement le cas que B6 nomme.
  const duree = dureeApprise({
    dureeCatalogue: 60,
    historiqueCliente: m(75, 75),
    historiquePro: m(60, 60, 60, 60),
  })
  assert.equal(duree, 75)
})

test('à défaut de cliente, la pro fait foi', () => {
  assert.equal(dureeApprise({ dureeCatalogue: 60, historiquePro: m(70, 75, 80) }), 75)
})

test('un rendez-vous oublié ne vide pas la semaine', () => {
  // Clos le lendemain : la mesure vaut des heures. La borne la ramène à une
  // fois et demie le catalogue, et pas davantage.
  const duree = dureeApprise({ dureeCatalogue: 60, historiqueCliente: m(1200, 1200) })
  assert.equal(duree, 90)
})

test('une pro rapide ne descend pas sous la moitié du catalogue', () => {
  assert.equal(dureeApprise({ dureeCatalogue: 60, historiquePro: m(10, 10, 10) }), 30)
})

test('la durée est arrondie vers le haut, jamais rognée', () => {
  // 62 minutes ne se réservent pas : cinq minutes de marge valent mieux qu'un
  // retard chez la cliente suivante.
  assert.equal(dureeApprise({ dureeCatalogue: 60, historiquePro: m(61, 62, 63) }), 65)
})

test('la clôture mesure le temps réel', () => {
  const debut = new Date('2026-09-07T10:00:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-07T11:15:00Z'), 60), 75)
})

test('une clôture du lendemain retombe sur la durée prévue', () => {
  // Ni zéro, ni vingt heures : la pro a oublié de clore, on ne l'invente pas.
  const debut = new Date('2026-09-07T10:00:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-08T09:00:00Z'), 60), 60)
  assert.equal(dureeReelle(debut, new Date('2026-09-07T09:00:00Z'), 60), 60)
})
