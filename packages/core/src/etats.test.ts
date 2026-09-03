import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatRendezVous, aRelancer, JOURS_DE_RELANCE } from './etats.ts'

const debut = new Date('2026-09-07T10:00:00Z')
const fin = new Date('2026-09-07T11:00:00Z')

test('D15 — l’heure qui passe ne termine RIEN', () => {
  // Le défaut d'origine : Morgan s'est connecté le soir et a vu sa journée
  // entière marquée « Terminée » alors que personne n'avait rien clôturé.
  const etat = etatRendezVous({
    cloture: false,
    debut,
    fin,
    journeeLancee: true,
    maintenant: new Date('2026-09-07T22:00:00Z'),
  })
  assert.equal(etat, 'a-cloturer')
})

test('terminé ne se déduit jamais, il se déclare', () => {
  const etat = etatRendezVous({
    cloture: true,
    debut,
    fin,
    journeeLancee: false,
    maintenant: new Date('2026-09-07T10:30:00Z'),
  })
  assert.equal(etat, 'termine')
})

test('à venir est le seul état que le temps a le droit de décider', () => {
  // Il ne prétend rien sur une action : c'est ce qui le rend légitime.
  const etat = etatRendezVous({
    cloture: false,
    debut,
    fin,
    journeeLancee: false,
    maintenant: new Date('2026-09-07T09:00:00Z'),
  })
  assert.equal(etat, 'a-venir')
})

test('sans journée lancée, on n’est jamais « en cours »', () => {
  // Rien ne dit que la pro est partie. Le prétendre serait exactement l'erreur
  // qu'on corrige.
  const dansLeCreneau = { cloture: false, debut, fin, maintenant: new Date('2026-09-07T10:30:00Z') }
  assert.equal(etatRendezVous({ ...dansLeCreneau, journeeLancee: false }), 'a-cloturer')
  assert.equal(etatRendezVous({ ...dansLeCreneau, journeeLancee: true }), 'en-cours')
})

test('le rattrapage du soir garde les rendez-vous des jours précédents', () => {
  // Sans cette liste, ils disparaîtraient dans le passé : l'apprentissage des
  // durées ne se ferait jamais et les fiches resteraient vides.
  const maintenant = new Date('2026-09-10T20:00:00Z')
  const rdvs = [
    { id: 'hier', cloture: false, fin: new Date('2026-09-09T11:00:00Z') },
    { id: 'clos', cloture: true, fin: new Date('2026-09-09T15:00:00Z') },
    { id: 'demain', cloture: false, fin: new Date('2026-09-11T11:00:00Z') },
  ]
  assert.deepEqual(
    aRelancer(rdvs, maintenant).map((r) => r.id),
    ['hier'],
  )
})

test('au bout de sept jours, on cesse de relancer sans jamais clôturer', () => {
  // Aucune clôture automatique, jamais : ce serait réintroduire le mensonge.
  // Mais on ne réclame pas indéfiniment. On propose, on ne harcèle pas.
  assert.equal(JOURS_DE_RELANCE, 7)
  const maintenant = new Date('2026-09-20T20:00:00Z')
  const vieux = [{ cloture: false, fin: new Date('2026-09-10T11:00:00Z') }]
  assert.equal(aRelancer(vieux, maintenant).length, 0)
  // Et il reste « à clôturer » : on a cessé de le réclamer, pas de le compter.
  assert.equal(
    etatRendezVous({
      cloture: false,
      debut: new Date('2026-09-10T10:00:00Z'),
      fin: new Date('2026-09-10T11:00:00Z'),
      journeeLancee: false,
      maintenant,
    }),
    'a-cloturer',
  )
})
