import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  initiale,
  pastillePour,
  pastilleDansListe,
  sourceAvatar,
  PASTILLES,
  TEXTE_SUR_PASTILLE,
  ILLUSTRATIONS,
  TAILLES_ILLUSTRATION,
  estUneIllustration,
  urlIllustration,
  rangeeValide,
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

test("système d’avatars — L'ORDRE DU MANIFESTE RESPECTE DÉJÀ LA RÈGLE DE COMPOSITION", () => {
  // Le manifeste l'affirme ; ici on le vérifie. Une affirmation dans un
  // fichier de données ne se teste pas toute seule, et c'est exactement le
  // genre de promesse qui se casse au premier ajout de personnage.
  assert.equal(
    rangeeValide(ILLUSTRATIONS.map((i) => i.id)),
    true,
    'deux pastilles de même couleur se suivent dans l’ordre 1 à 8',
  )
})

test('système d’avatars — une rangée fautive est refusée, pas réparée en silence', () => {
  // Awa et Elsa sont toutes deux en miel : côte à côte, elles forment la
  // tache que la règle interdit.
  assert.equal(rangeeValide(['awa', 'elsa']), false)
  assert.equal(rangeeValide(['awa', 'marc', 'elsa']), true)
})

test('système d’avatars — UNE TAILLE NON LIVRÉE LÈVE, elle ne fabrique pas une URL en 404', () => {
  assert.equal(urlIllustration('awa', 160), '/avatars/awa-160.webp')
  assert.equal(urlIllustration('awa', 320), '/avatars/awa-320.webp')
  // @ts-expect-error — c'est précisément ce qu'on veut interdire au runtime.
  assert.throws(() => urlIllustration('awa', 96), /non livrée/)
})

test('système d’avatars — un personnage inconnu lève plutôt que de laisser un trou dans la page', () => {
  assert.equal(estUneIllustration('nadia'), true)
  assert.equal(estUneIllustration('sophie'), false)
  assert.throws(() => urlIllustration('sophie'), /inconnu/)
})

test('système d’avatars — les deux seules tailles livrées sont 160 et 320', () => {
  assert.deepEqual([...TAILLES_ILLUSTRATION], [160, 320])
})

test("système d’avatars — l'illustration passe AVANT l'initiale, et APRÈS la photo", () => {
  // La règle du board, reprise ici avec un identifiant réel : une pro qui a
  // mis sa photo la garde, une pro qui n'a rien tombe sur l'initiale.
  assert.equal(sourceAvatar({ photoUrl: '/moi.jpg', illustration: 'awa' }), 'photo')
  assert.equal(sourceAvatar({ illustration: 'awa' }), 'illustration')
  assert.equal(sourceAvatar({}), 'initiale')
})
