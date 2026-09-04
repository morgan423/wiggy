import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EVENEMENTS, pushParDefaut, badgeActif, pushActif, evenementsActifs } from './journal.ts'

test('LES DÉFAUTS DE PUSH SONT EXACTEMENT CEUX TRANCHÉS LE 04/09', () => {
  // La table de Morgan, recopiée telle quelle. Si un défaut change parce que
  // quelqu'un a modifié la NATURE d'un événement sans y penser, ce test tombe.
  const attendu = {
    nouveau_rdv: true,
    demande_a_valider: true,
    reponse_cliente: true,
    annulation: true,
    avis: false,
    acompte: false,
  }
  const obtenu = Object.fromEntries(EVENEMENTS.map((e) => [e.cle, pushParDefaut(e.nature)]))
  assert.deepEqual(obtenu, attendu)
})

test('la règle : interrompre seulement si l’agenda change ou si une action attend', () => {
  assert.equal(pushParDefaut('change_agenda'), true)
  assert.equal(pushParDefaut('attend_action'), true)
  assert.equal(pushParDefaut('agreable_a_savoir'), false)
})

test('le badge est actif par défaut, y compris pour ce qui n’interrompt pas', () => {
  // Un avis n'interrompt pas la prestation, mais il compte dans la cloche :
  // « attirer l'œil dans l'app » et « déranger dans la poche » sont deux
  // questions distinctes, et c'est tout l'intérêt d'avoir deux colonnes.
  assert.equal(badgeActif({}, 'avis'), true)
  assert.equal(pushActif({}, 'avis'), false)
})

test('une bascule explicite prime sur le défaut', () => {
  assert.equal(pushActif({ push_annulation: false }, 'annulation'), false)
  assert.equal(pushActif({ push_avis: true }, 'avis'), true)
  assert.equal(badgeActif({ badge_nouveau_rdv: false }, 'nouveau_rdv'), false)
})

test('les événements qui attendent leur fonctionnalité sont déclarés, pas masqués', () => {
  const enAttente = EVENEMENTS.filter((e) => e.attend !== null).map((e) => e.cle)
  // « avis » en est sorti le 04/09 : A7 lui a donné un émetteur.
  assert.deepEqual(enAttente, ['acompte'])
  assert.equal(evenementsActifs().length, 5)
})

test('aucune fonction ne permet de couper le JOURNAL lui-même', () => {
  // Le registre n'est pas réglable : la seule façon de garantir qu'il n'a pas
  // de trous est de ne jamais offrir le moyen d'en faire un.
  const api = Object.keys({ badgeActif, pushActif, pushParDefaut, evenementsActifs })
  assert.equal(
    api.some((n) => /journal|journalis/i.test(n)),
    false,
  )
})
