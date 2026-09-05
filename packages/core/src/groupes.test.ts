import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  groupesDeLaPro,
  optionsDeGroupe,
  groupeRetenu,
  prestationsARenommer,
  GROUPES_SUGGERES,
  CREER_UN_GROUPE,
} from './groupes.ts'
import { VALEUR_NEUTRE } from './selection.ts'

const p = (category: string | null, id = category ?? 'sans') => ({ id, category })

test('groupes — ce sont CEUX DE LA PRO, dans l’ordre de sa liste', () => {
  const g = groupesDeLaPro([p('Technique'), p('Coupe'), p(null), p('Technique', 'x')])
  // Ordre de première apparition, pas alphabétique : « Technique » ouvrait SA liste.
  assert.deepEqual(g, ['Technique', 'Coupe'])
})

test('groupes — SES groupes passent avant les suggérés', () => {
  const options = optionsDeGroupe([p('Locks')], 'Créer un groupe')
  assert.equal(options[0]?.valeur, 'Locks')
})

test('groupes — un suggéré DÉJÀ EMPLOYÉ ne se propose pas deux fois', () => {
  const options = optionsDeGroupe([p('Coupe')], 'Créer un groupe')
  assert.equal(options.filter((o) => o.texte === 'Coupe').length, 1)
})

test('groupes — « coupe » et « Coupe » sont LE MÊME groupe', () => {
  // C'est déjà la moitié du défaut de divergence que ce lot corrige : une pro
  // qui a tapé en minuscules ne doit pas se voir proposer un doublon.
  const options = optionsDeGroupe([p('coupe')], 'Créer un groupe')
  assert.equal(options.filter((o) => o.texte.toLowerCase() === 'coupe').length, 1)
})

test('groupes — la création ferme toujours la liste', () => {
  const options = optionsDeGroupe([], 'Créer un groupe')
  assert.equal(options.at(-1)?.valeur, CREER_UN_GROUPE)
  assert.deepEqual(
    options.slice(0, -1).map((o) => o.texte),
    [...GROUPES_SUGGERES],
  )
})

test('groupes — « AUCUN GROUPE » EST UNE RÉPONSE, pas un champ oublié', () => {
  assert.equal(groupeRetenu(VALEUR_NEUTRE, ''), null)
  assert.equal(groupeRetenu('', ''), null)
})

test('groupes — « Créer un groupe » sans nom retombe sur aucun groupe, sans erreur', () => {
  // La pro a changé d'avis, elle n'a pas commis d'erreur.
  assert.equal(groupeRetenu(CREER_UN_GROUPE, '   '), null)
  assert.equal(groupeRetenu(CREER_UN_GROUPE, ' Locks '), 'Locks')
})

test('groupes — un choix existant se garde tel quel', () => {
  assert.equal(groupeRetenu('Technique', ''), 'Technique')
})

test('renommage — TOUTES les prestations du groupe sont touchées, en une fois', () => {
  const liste = [
    { id: 'a', category: 'Coupe' },
    { id: 'b', category: 'Coupe' },
    { id: 'c', category: 'Technique' },
    { id: 'd', category: null },
  ]
  assert.deepEqual(prestationsARenommer(liste, 'Coupe'), ['a', 'b'])
})

test('renommage — il rattrape les divergences DÉJÀ en base', () => {
  // Une pro qui avait tapé « coupe » puis « Coupe » a deux groupes sur sa page
  // publique. Le renommage doit pouvoir les réunir.
  const liste = [
    { id: 'a', category: 'coupe' },
    { id: 'b', category: ' Coupe ' },
  ]
  assert.deepEqual(prestationsARenommer(liste, 'Coupe'), ['a', 'b'])
})

test('renommage — un nom vide ne touche à RIEN', () => {
  // Sinon il ramasserait toutes les prestations sans groupe.
  assert.deepEqual(prestationsARenommer([{ id: 'a', category: null }], '  '), [])
})
