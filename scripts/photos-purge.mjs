// A4 : supprime les dépôts de photos que personne n'est venu réclamer.
//
// Un dépôt sans rendez-vous est une cliente qui a téléversé puis abandonné le
// tunnel. Ce sont des photos de personnes : elles ne restent pas.
//
//   npm run photos:purge        (24 h par défaut)
//   npm run photos:purge -- 6   (au-delà de 6 h)
//
// À planifier. Écrit en service_role, seul rôle qui atteigne le seau.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const DEPOT = 'depots'
const SEAU = 'appointment-photos'

const valeurs = {}
for (const ligne of readFileSync(join(racine, 'apps/web/.env.local'), 'utf8').split('\n')) {
  const i = ligne.indexOf('=')
  if (i < 1 || ligne.trim().startsWith('#')) continue
  valeurs[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
}
const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const heures = Number(process.argv[2] ?? 24)
const limite = Date.now() - heures * 3600 * 1000
const entetes = { apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' }

const lister = async (prefixe) => {
  const r = await fetch(`${url}/storage/v1/object/list/${SEAU}`, {
    method: 'POST',
    headers: entetes,
    body: JSON.stringify({ prefix: prefixe, limit: 1000 }),
  })
  if (!r.ok) throw new Error(`list ${prefixe} : HTTP ${r.status}`)
  return r.json()
}

const aSupprimer = []
for (const depot of await lister(`${DEPOT}/`)) {
  for (const fichier of await lister(`${DEPOT}/${depot.name}/`)) {
    const cree = Date.parse(fichier.created_at ?? '')
    if (!Number.isNaN(cree) && cree < limite) {
      aSupprimer.push(`${DEPOT}/${depot.name}/${fichier.name}`)
    }
  }
}

if (aSupprimer.length === 0) {
  console.log('Aucun dépôt orphelin à purger.')
  process.exit(0)
}

const r = await fetch(`${url}/storage/v1/object/${SEAU}`, {
  method: 'DELETE',
  headers: entetes,
  body: JSON.stringify({ prefixes: aSupprimer }),
})
if (!r.ok) throw new Error(`suppression : HTTP ${r.status} ${await r.text()}`)
console.log(`${aSupprimer.length} fichier(s) purgé(s) au-delà de ${heures} h.`)
