// D6 : alimente et rafraîchit le référentiel des communes en base.
//
// La migration 0008 crée la table vide ; ce script la remplit. Trente mille
// lignes n'ont rien à faire dans l'éditeur SQL de Supabase, et la source
// bouge quelques dizaines de fois par an : c'est un import périodique, pas
// une migration.
//
//   npm run communes:import
//
// Idempotent : relancé, il met à jour et n'empile rien. Écrit en service_role,
// seul rôle autorisé sur cette table.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')

const SOURCE =
  'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population&format=json'
const LOT = 500

/** Lit .env.local sans dépendance : les clés ne quittent pas la machine. */
function env() {
  const fichier = join(racine, 'apps/web/.env.local')
  const valeurs = {}
  for (const ligne of readFileSync(fichier, 'utf8').split('\n')) {
    const i = ligne.indexOf('=')
    if (i < 1 || ligne.trim().startsWith('#')) continue
    valeurs[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
  }
  return valeurs
}

/** Même normalisation que `cityKey` du domaine : accents, tirets, casse. */
function cleRecherche(nom) {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const variables = env()
const url = (variables.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
const cle = variables.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const rest = async (chemin, options = {}) => {
  const reponse = await fetch(`${url}/rest/v1/${chemin}`, {
    ...options,
    headers: {
      apikey: cle,
      Authorization: `Bearer ${cle}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!reponse.ok) throw new Error(`${chemin} : HTTP ${reponse.status} ${await reponse.text()}`)
  return reponse
}

console.log('Téléchargement du référentiel de l’État…')
const reponse = await fetch(SOURCE, { signal: AbortSignal.timeout(60_000) })
if (!reponse.ok) throw new Error(`geo.api.gouv.fr : HTTP ${reponse.status}`)
const brut = await reponse.json()
if (!Array.isArray(brut)) throw new Error('Réponse inattendue : tableau attendu.')

const lignes = brut
  .filter((c) => typeof c.code === 'string' && typeof c.nom === 'string')
  .map((c) => ({
    insee_code: c.code,
    name: c.nom,
    postal_codes: Array.isArray(c.codesPostaux) ? c.codesPostaux : [],
    // GeoJSON : [longitude, latitude]. Les inverser envoie les pros en mer.
    lat: Array.isArray(c.centre?.coordinates) ? c.centre.coordinates[1] : null,
    lng: Array.isArray(c.centre?.coordinates) ? c.centre.coordinates[0] : null,
    population: Number.isFinite(c.population) ? c.population : 0,
    search_key: cleRecherche(c.nom),
    updated_at: new Date().toISOString(),
  }))

console.log(`${lignes.length} communes à écrire, par lots de ${LOT}.`)
for (let i = 0; i < lignes.length; i += LOT) {
  const lot = lignes.slice(i, i + LOT)
  await rest('communes?on_conflict=insee_code', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(lot),
  })
  process.stdout.write(`\r  ${Math.min(i + LOT, lignes.length)} / ${lignes.length}`)
}
process.stdout.write('\n')

await rest('communes_import?on_conflict=id', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify([{ id: true, importe_le: new Date().toISOString(), lignes: lignes.length }]),
})

console.log(`Référentiel à jour : ${lignes.length} communes.`)
