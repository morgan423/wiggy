import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cityKey, citySearchTerm, normalizeCityName, normaliserCommune } from './city.ts'

test('accents, casse et tirets tombent sur la même clé', () => {
  const attendu = cityKey('Saint-Étienne')
  for (const variante of [
    'saint etienne',
    'SAINT-ÉTIENNE',
    '  Saint   Étienne  ',
    'Saint-Etienne',
  ]) {
    assert.equal(cityKey(variante), attendu, variante)
  }
})

test('les apostrophes ne créent pas de doublon', () => {
  assert.equal(cityKey("L'Isle-Jourdain"), cityKey('L’Isle Jourdain'))
})

test('le code INSEE prime sur le nom', () => {
  // Deux communes homonymes ne doivent pas fusionner dès qu'on a l'INSEE.
  assert.notEqual(cityKey('Sainte-Marie', '97418'), cityKey('Sainte-Marie', '44154'))
  assert.equal(cityKey('peu importe', '64445'), cityKey('Pau', '64445'))
})

test('des villes différentes gardent des clés différentes', () => {
  assert.notEqual(cityKey('Pau'), cityKey('Pays'))
})

test('normalizeCityName garde les accents et la casse d’affichage', () => {
  assert.equal(normalizeCityName('  Saint-Étienne  '), 'Saint-Étienne')
})

test('citySearchTerm neutralise la syntaxe de filtre et les jokers SQL', () => {
  for (const attaque of [
    'Pau,city.neq.x',
    'Pau)',
    'Pau%',
    'Pau_',
    'Pau"',
    'Pau\\',
    'Pau.eq.1',
    'Pau(x)',
  ]) {
    const terme = citySearchTerm(attaque)
    assert.ok(
      !/[,.()"\\%_]/.test(terme),
      `« ${attaque} » → « ${terme} » contient encore un caractère dangereux`,
    )
  }
})

test('citySearchTerm préserve les vrais noms de communes', () => {
  assert.equal(citySearchTerm('Saint-Étienne'), 'Saint-Étienne')
  assert.equal(citySearchTerm('L’Isle-Jourdain'), 'L’Isle-Jourdain')
  assert.equal(citySearchTerm('  Pau  '), 'Pau')
})

test('citySearchTerm borne la longueur', () => {
  assert.ok(citySearchTerm('a'.repeat(500)).length <= 60)
})

test('normaliserCommune lit la réponse réelle de geo.api.gouv.fr', () => {
  // Charge relevée sur l'API le 30/08.
  const pau = normaliserCommune({
    nom: 'Pau',
    code: '64445',
    codesPostaux: ['64000'],
    centre: { type: 'Point', coordinates: [-0.3435, 43.3219] },
    _score: 0.43,
  })
  assert.deepEqual(pau, {
    insee_code: '64445',
    name: 'Pau',
    postal_code: '64000',
    // GeoJSON donne [lng, lat] : Pau est à 43,32 N et -0,34 E.
    lat: 43.3219,
    lng: -0.3435,
  })
})

test('normaliserCommune ne confond pas latitude et longitude', () => {
  const c = normaliserCommune({ nom: 'X', code: '00000', centre: { coordinates: [2, 48] } })
  assert.ok(c)
  assert.equal(c.lng, 2, 'la longitude vient en premier dans GeoJSON')
  assert.equal(c.lat, 48)
})

test('normaliserCommune tolère les champs absents', () => {
  const sansCentre = normaliserCommune({ nom: 'Y', code: '11111' })
  assert.deepEqual(sansCentre, {
    insee_code: '11111',
    name: 'Y',
    postal_code: null,
    lat: null,
    lng: null,
  })
  assert.equal(normaliserCommune({ nom: 'Sans code' }), null)
  assert.equal(normaliserCommune(null), null)
})

test('normaliserCommune garde le premier code postal des communes multiples', () => {
  // Saint-Paul (La Réunion) en a six.
  const c = normaliserCommune({
    nom: 'Saint-Paul',
    code: '97415',
    codesPostaux: ['97411', '97422'],
  })
  assert.equal(c?.postal_code, '97411')
})
