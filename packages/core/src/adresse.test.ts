import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validerResultatBan,
  analyserResultatsBan,
  SCORE_MINIMAL,
  MAX_SUGGESTIONS,
} from './adresse.ts'

/** Réponse réelle de la BAN pour « 12 rue des Lilas Pau », relevée le 31/08. */
const SAINT_PAUL_LES_DAX = {
  geometry: { type: 'Point', coordinates: [-1.046887, 43.724047] },
  properties: {
    label: '12 Rue des Lilas 40990 Saint-Paul-lès-Dax',
    score: 0.6949548325358851,
    postcode: '40990',
    city: 'Saint-Paul-lès-Dax',
  },
}

test('le piège réel : une adresse à Pau qui répond dans les Landes', () => {
  // Sans contrainte, la BAN renvoie ce résultat pour une recherche « à Pau ».
  // Le retenir enverrait le pro à cent kilomètres.
  assert.equal(
    validerResultatBan(SAINT_PAUL_LES_DAX, { ligne1: '12 rue des Lilas', codePostal: '64000' }),
    null,
  )
  assert.equal(
    validerResultatBan(SAINT_PAUL_LES_DAX, { ligne1: '12 rue des Lilas', ville: 'Pau' }),
    null,
  )
})

test('le résultat est retenu quand il correspond à la saisie', () => {
  const trouve = validerResultatBan(SAINT_PAUL_LES_DAX, {
    ligne1: '12 rue des Lilas',
    codePostal: '40990',
  })
  assert.ok(trouve)
  assert.equal(trouve.ville, 'Saint-Paul-lès-Dax')
  // GeoJSON donne [lng, lat] : la latitude est la seconde valeur.
  assert.equal(trouve.point.lat, 43.724047)
  assert.equal(trouve.point.lng, -1.046887)
})

test('la ville est comparée sans se soucier des accents ni des tirets', () => {
  for (const ville of ['Saint-Paul-lès-Dax', 'saint paul les dax', 'SAINT-PAUL-LES-DAX']) {
    assert.ok(validerResultatBan(SAINT_PAUL_LES_DAX, { ligne1: '12 rue des Lilas', ville }), ville)
  }
})

test('un score trop faible est écarté', () => {
  const flou = {
    ...SAINT_PAUL_LES_DAX,
    properties: { ...SAINT_PAUL_LES_DAX.properties, score: SCORE_MINIMAL - 0.01 },
  }
  assert.equal(validerResultatBan(flou, { ligne1: 'x', codePostal: '40990' }), null)
})

test('une réponse malformée ne produit jamais de point', () => {
  for (const cas of [
    null,
    {},
    { geometry: { coordinates: [] }, properties: { score: 1 } },
    { geometry: { coordinates: ['a', 'b'] }, properties: { score: 1 } },
    { geometry: { coordinates: [1, 2] }, properties: {} },
  ]) {
    assert.equal(validerResultatBan(cas, { ligne1: 'x' }), null, JSON.stringify(cas))
  }
})

test('les candidats écartés reviennent en suggestions', () => {
  // La cliente cherche à Pau, la BAN propose les Landes en premier : on ne
  // retient rien, mais on lui montre ce qu'on a trouvé pour qu'elle précise.
  const analyse = analyserResultatsBan([SAINT_PAUL_LES_DAX], {
    ligne1: '12 rue des Lilas',
    ville: 'Pau',
  })
  assert.equal(analyse.retenu, null)
  assert.equal(analyse.suggestions.length, 1)
  assert.match(analyse.suggestions[0].libelle, /Saint-Paul-lès-Dax/)
})

test('le bon résultat est retenu, les autres restent des suggestions', () => {
  const pau = {
    geometry: { coordinates: [-0.3435, 43.3219] },
    properties: {
      label: '12 Avenue des Lilas 64000 Pau',
      score: 0.65,
      postcode: '64000',
      city: 'Pau',
    },
  }
  const analyse = analyserResultatsBan([SAINT_PAUL_LES_DAX, pau], {
    ligne1: '12 rue des Lilas',
    codePostal: '64000',
  })
  assert.ok(analyse.retenu)
  assert.equal(analyse.retenu.ville, 'Pau')
  assert.equal(analyse.suggestions.length, 1, 'le candidat des Landes reste proposable')
})

test('les suggestions sont bornées', () => {
  const beaucoup = Array.from({ length: 12 }, (_, i) => ({
    geometry: { coordinates: [0, 0] },
    properties: { label: `Adresse ${i}`, score: 0.9, postcode: '75001', city: 'Paris' },
  }))
  const analyse = analyserResultatsBan(beaucoup, { ligne1: 'x', codePostal: '99999' })
  assert.equal(analyse.suggestions.length, MAX_SUGGESTIONS)
})
