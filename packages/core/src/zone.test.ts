import { test } from 'node:test'
import assert from 'node:assert/strict'
import { positionDansZone, communePrincipale, formatDistance, type Zone } from './zone.ts'

// Coordonnées réelles, agglomération de Pau.
const PAU = { lat: 43.2951, lng: -0.3708 }
const LESCAR = { lat: 43.3333, lng: -0.4333 }
const TARBES = { lat: 43.2328, lng: 0.0781 }

const ZONE_PAU: Zone = {
  mode: 'communes',
  communes: [
    { inseeCode: '64445', nom: 'Pau', point: PAU },
    { inseeCode: '64335', nom: 'Lescar', point: LESCAR },
  ],
}

test('une adresse dans une commune desservie est dans la zone', () => {
  assert.deepEqual(positionDansZone(ZONE_PAU, { point: PAU, inseeCode: '64445' }), {
    statut: 'dedans',
  })
})

test('une adresse hors zone dit de combien, et par rapport à quoi', () => {
  const position = positionDansZone(ZONE_PAU, { point: TARBES, inseeCode: '65440' })
  assert.ok(position.statut === 'dehors')
  assert.equal(position.repere, 'Pau')
  // Pau-Tarbes : une quarantaine de kilomètres à vol d'oiseau.
  assert.ok(position.distanceKm !== null && position.distanceKm > 30 && position.distanceKm < 45)
})

test('le code INSEE fait foi, pas la proximité géographique', () => {
  // Une adresse à cinq cents mètres du centre de Pau mais dans une commune
  // limitrophe non desservie reste hors zone. C'est le pro qui décide où il se
  // déplace, pas la distance.
  const position = positionDansZone(ZONE_PAU, {
    point: { lat: 43.2995, lng: -0.3705 },
    inseeCode: '64024',
  })
  assert.equal(position.statut, 'dehors')
})

test('sans code INSEE, on ne devine pas : on ne bloque personne', () => {
  assert.deepEqual(positionDansZone(ZONE_PAU, { point: TARBES }), { statut: 'indeterminee' })
})

test('une zone vide ou absente ne filtre rien', () => {
  assert.deepEqual(positionDansZone(null, { point: PAU, inseeCode: '64445' }), {
    statut: 'indeterminee',
  })
  assert.deepEqual(
    positionDansZone({ mode: 'communes', communes: [] }, { point: PAU, inseeCode: '64445' }),
    { statut: 'indeterminee' },
  )
})

test('mode rayon : dedans au bord, dehors au-delà', () => {
  const zone: Zone = { mode: 'radius', centre: PAU, rayonKm: 15 }
  assert.equal(positionDansZone(zone, { point: LESCAR }).statut, 'dedans')
  const loin = positionDansZone(zone, { point: TARBES })
  assert.ok(loin.statut === 'dehors')
  // La distance annoncée est le dépassement, pas la distance totale.
  assert.ok(loin.distanceKm !== null && loin.distanceKm > 15 && loin.distanceKm < 30)
})

test('Paris, Lyon et Marseille : l’arrondissement se ramène à la commune', () => {
  // La BAN code « 10 rue de Rivoli » en 75101, le référentiel des communes
  // connaît Paris sous 75056. Sans cette réduction, aucune adresse parisienne
  // ne tomberait jamais dans la zone d'une coiffeuse parisienne.
  assert.equal(communePrincipale('75101'), '75056')
  assert.equal(communePrincipale('75120'), '75056')
  assert.equal(communePrincipale('69384'), '69123')
  assert.equal(communePrincipale('13208'), '13055')
  // Une commune ordinaire n'est pas touchée, y compris les codes corses.
  assert.equal(communePrincipale('64445'), '64445')
  assert.equal(communePrincipale('2A004'), '2A004')
  // 75121 n'existe pas : rien à réduire.
  assert.equal(communePrincipale('75121'), '75121')

  const zoneParis: Zone = {
    mode: 'communes',
    communes: [{ inseeCode: '75056', nom: 'Paris', point: { lat: 48.8566, lng: 2.3522 } }],
  }
  assert.deepEqual(
    positionDansZone(zoneParis, { point: { lat: 48.8558, lng: 2.3475 }, inseeCode: '75101' }),
    { statut: 'dedans' },
  )
})

test('les distances se disent comme on les dit à l’oral', () => {
  assert.equal(formatDistance(0.42), '420 m')
  assert.equal(formatDistance(3.47), '3,5 km')
  assert.equal(formatDistance(23.4), '23 km')
})
