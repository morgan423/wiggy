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

test('la clôture mesure le temps réel quand elle a lieu au moment de finir', () => {
  const debut = new Date('2026-09-07T10:00:00Z')
  const finPrevue = new Date('2026-09-07T11:00:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-07T11:15:00Z'), finPrevue), 75)
})

test('une clôture du soir ne mesure RIEN, et ne retombe pas sur la prévision', () => {
  // C'est la correction du 03/09. Retomber sur la durée prévue ferait que
  // l'apprentissage se nourrirait de sa propre sortie : au bout de vingt
  // rendez-vous il « saurait » qu'une couleur dure exactement ce qu'il avait
  // prévu, parce que c'est lui qui aurait fourni la réponse.
  const debut = new Date('2026-09-07T14:00:00Z')
  const finPrevue = new Date('2026-09-07T15:30:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-07T22:00:00Z'), finPrevue), null)
})

test('une clôture juste après la fin mesure encore', () => {
  // « J'ai fini, je range, je clôture en partant » reste une mesure.
  const debut = new Date('2026-09-07T10:00:00Z')
  const finPrevue = new Date('2026-09-07T11:00:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-07T11:40:00Z'), finPrevue), 100)
})

test('une clôture antérieure au début ne mesure rien', () => {
  const debut = new Date('2026-09-07T10:00:00Z')
  const finPrevue = new Date('2026-09-07T11:00:00Z')
  assert.equal(dureeReelle(debut, new Date('2026-09-07T09:00:00Z'), finPrevue), null)
})

test('B5 — une correction manuelle est une instruction, pas une mesure', () => {
  // La pro a écrit « chez elle, une heure et demie ». On ne moyenne pas sa
  // phrase avec trois observations de machine.
  const duree = dureeApprise({
    dureeCatalogue: 60,
    historiqueCliente: [{ minutes: 90, corrigee: true }],
    historiquePro: m(60, 60, 60, 60, 60),
  })
  assert.equal(duree, 90)
})

test('B5 — une correction manuelle n’est pas bornée par le catalogue', () => {
  // La borne existe contre le rendez-vous clos le lendemain, pas contre la pro.
  // Elle sait qu'un lissage brésilien prend trois heures.
  const duree = dureeApprise({
    dureeCatalogue: 60,
    historiqueCliente: [{ minutes: 180, corrigee: true }],
  })
  assert.equal(duree, 180)
})

test('B5 — la correction la plus récente remplace la précédente', () => {
  // L'historique arrive du plus récent au plus ancien : une instruction plus
  // neuve remplace une instruction plus ancienne.
  const duree = dureeApprise({
    dureeCatalogue: 60,
    historiqueCliente: [
      { minutes: 75, corrigee: true },
      { minutes: 120, corrigee: true },
    ],
  })
  assert.equal(duree, 75)
})

test('sans mesure ni saisie, l’apprentissage n’a rien à se mettre sous la dent', () => {
  // La conséquence de la correction, dite en une ligne : un rendez-vous clos
  // le soir sans saisie ne produit AUCUNE mesure, donc n'entre pas dans
  // l'historique, donc ne peut pas faire converger l'apprentissage vers la
  // prévision. C'est la même prudence que « rien avant trois visites ».
  const debut = new Date('2026-09-07T14:00:00Z')
  const finPrevue = new Date('2026-09-07T15:30:00Z')
  const mesure = dureeReelle(debut, new Date('2026-09-07T22:00:00Z'), finPrevue)
  assert.equal(mesure, null)

  // L'historique reste vide, donc le catalogue continue de faire foi. Il ne se
  // met pas à « savoir » qu'une couleur dure exactement 90 minutes.
  assert.equal(dureeApprise({ dureeCatalogue: 90, historiquePro: [] }), 90)
})
