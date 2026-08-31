import { test } from 'node:test'
import assert from 'node:assert/strict'
import { distanceVolDOiseauKm, dureeEstimeeMin, moteurVolDOiseau, type Point } from './trajets.ts'

const PAU: Point = { lat: 43.3219, lng: -0.3435 }
const LESCAR: Point = { lat: 43.3339, lng: -0.4306 } // ~7 km de Pau
const TARBES: Point = { lat: 43.2328, lng: 0.0783 } // ~35 km de Pau
const PARIS: Point = { lat: 48.8566, lng: 2.3522 }
const LYON: Point = { lat: 45.764, lng: 4.8357 } // ~392 km de Paris

test('la distance à vol d’oiseau est juste sur des repères connus', () => {
  assert.ok(
    Math.abs(distanceVolDOiseauKm(PARIS, LYON) - 392) < 8,
    `${distanceVolDOiseauKm(PARIS, LYON)}`,
  )
  assert.ok(Math.abs(distanceVolDOiseauKm(PAU, LESCAR) - 7.3) < 1.5)
  assert.ok(Math.abs(distanceVolDOiseauKm(PAU, TARBES) - 35) < 3)
})

test('la distance est symétrique et nulle sur place', () => {
  assert.equal(distanceVolDOiseauKm(PAU, PAU), 0)
  assert.ok(Math.abs(distanceVolDOiseauKm(PAU, TARBES) - distanceVolDOiseauKm(TARBES, PAU)) < 1e-9)
})

test('inverser latitude et longitude change tout — le test le prouve', () => {
  // Pau inversé tombe dans le golfe de Guinée : si un jour une intégration
  // inverse les coordonnées, cet écart le rend visible immédiatement.
  const inverse: Point = { lat: PAU.lng, lng: PAU.lat }
  assert.ok(distanceVolDOiseauKm(PAU, inverse) > 4000)
})

test('la durée estimée reste plausible pour une tournée', () => {
  // Deux communes voisines : de l'ordre du quart d'heure, pas deux minutes.
  const voisine = dureeEstimeeMin(PAU, LESCAR)
  assert.ok(voisine >= 10 && voisine <= 35, `${voisine} min`)

  // 35 km à vol d'oiseau : une heure et quart au plus.
  const loin = dureeEstimeeMin(PAU, TARBES)
  assert.ok(loin >= 30 && loin <= 75, `${loin} min`)
})

test('l’estimation ne sous-estime jamais un trajet mesuré', () => {
  // Mesures Routes API du 30/08 sur l'agglomération de Pau. Un mode dégradé
  // qui sous-estime fait arriver le pro en retard : c'est le seul défaut
  // vraiment inacceptable ici.
  const MESURES: [Point, Point, number, string][] = [
    [PAU, LESCAR, 14, 'Pau → Lescar'],
    [PAU, { lat: 43.3078, lng: -0.3903 }, 13, 'Pau → Billère'],
    [PAU, { lat: 43.2911, lng: -0.3711 }, 18, 'Pau → Jurançon'],
    [LESCAR, { lat: 43.2911, lng: -0.3711 }, 26, 'Lescar → Jurançon'],
    [PAU, { lat: 43.1936, lng: -0.6103 }, 48, 'Pau → Oloron'],
    [PAU, TARBES, 35, 'Pau → Tarbes'],
  ]
  for (const [a, b, reel, nom] of MESURES) {
    const estime = dureeEstimeeMin(a, b)
    assert.ok(estime >= reel, `${nom} : estimé ${estime} min < réel ${reel} min`)
  }
})

test('l’estimation est conservatrice : elle croît avec la distance', () => {
  const proche = dureeEstimeeMin(PAU, LESCAR)
  const loin = dureeEstimeeMin(PAU, TARBES)
  const tresLoin = dureeEstimeeMin(PARIS, LYON)
  assert.ok(proche < loin && loin < tresLoin)
})

test('deux adresses quasi identiques ne créent pas de trajet fantôme', () => {
  const memeRue: Point = { lat: PAU.lat + 0.0002, lng: PAU.lng }
  assert.equal(dureeEstimeeMin(PAU, memeRue), 0)
})

test('le moteur de repli renvoie une matrice complète, sans réseau', async () => {
  const m = await moteurVolDOiseau.matrice([PAU, LESCAR], [LESCAR, TARBES])
  assert.equal(m.length, 2)
  assert.equal(m[0].length, 2)
  for (const ligne of m) {
    for (const cellule of ligne) {
      assert.equal(cellule.source, 'estimation', 'le repli doit s’annoncer comme une estimation')
      assert.ok(Number.isInteger(cellule.minutes) && cellule.minutes >= 0)
    }
  }
})
