// Compare le temps de trajet réel (Routes API) à notre estimation à vol
// d'oiseau, sur des couples représentatifs d'une tournée. Sert à recaler le
// facteur de détour et les vitesses du mode dégradé.
// `npm run trajets:calibrage`
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dureeEstimeeMin, distanceVolDOiseauKm } from '@wiggy/core'
import { moteurGoogle } from '../apps/web/src/lib/trajets/google.ts'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(join(racine, 'apps/web/.env.local'), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
)
const cle = env.GOOGLE_ROUTES_API_KEY
if (!cle) {
  console.error('GOOGLE_ROUTES_API_KEY absente de apps/web/.env.local')
  process.exit(1)
}

const LIEUX = {
  Pau: { lat: 43.3219, lng: -0.3435 },
  Lescar: { lat: 43.3339, lng: -0.4306 },
  Billère: { lat: 43.3078, lng: -0.3903 },
  Jurançon: { lat: 43.2911, lng: -0.3711 },
  Tarbes: { lat: 43.2328, lng: 0.0783 },
  Oloron: { lat: 43.1936, lng: -0.6103 },
}

const couples = [
  ['Pau', 'Lescar'],
  ['Pau', 'Billère'],
  ['Pau', 'Jurançon'],
  ['Lescar', 'Jurançon'],
  ['Pau', 'Tarbes'],
  ['Pau', 'Oloron'],
]

const departs = couples.map(([d]) => LIEUX[d])
const arrivees = couples.map(([, a]) => LIEUX[a])

console.log('Appel Routes API (computeRouteMatrix)…\n')
const matrice = await moteurGoogle(cle).matrice(departs, arrivees)

console.log('  trajet                    vol d’oiseau   estimé   réel    écart')
console.log('  ' + '─'.repeat(66))
let cumulEcart = 0
let cumulReel = 0
let cumulEstime = 0

couples.forEach(([d, a], i) => {
  const reel = matrice[i][i].minutes
  const estime = dureeEstimeeMin(LIEUX[d], LIEUX[a])
  const km = distanceVolDOiseauKm(LIEUX[d], LIEUX[a])
  const ecart = estime - reel
  cumulEcart += Math.abs(ecart)
  cumulReel += reel
  cumulEstime += estime
  const signe = ecart > 0 ? `+${ecart}` : `${ecart}`
  console.log(
    `  ${(d + ' → ' + a).padEnd(24)} ${km.toFixed(1).padStart(6)} km   ${String(estime).padStart(4)} min ${String(reel).padStart(4)} min  ${signe.padStart(5)} min`,
  )
})

const ratio = cumulEstime / cumulReel
console.log('  ' + '─'.repeat(66))
console.log(`  écart moyen absolu : ${(cumulEcart / couples.length).toFixed(1)} min`)
console.log(`  ratio estimation / réel : ${ratio.toFixed(2)}`)
console.log(
  ratio >= 1
    ? `  → l'estimation est conservatrice (elle sur-estime de ${((ratio - 1) * 100).toFixed(0)} %) : le pro arrive en avance.`
    : `  → ⚠️ l'estimation SOUS-estime de ${((1 - ratio) * 100).toFixed(0)} % : le pro arriverait en retard.`,
)
