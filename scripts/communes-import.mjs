// D6 : alimente et rafraîchit le référentiel des communes en base.
//
// La migration 0008 crée la table vide ; ce script la remplit. Trente mille
// lignes n'ont rien à faire dans l'éditeur SQL de Supabase, et la source
// bouge quelques dizaines de fois par an : c'est un import périodique, pas
// une migration.
//
//   npm run communes:import              écrit
//   npm run communes:import -- --essai   affiche sans écrire
//
// Idempotent : relancé, il met à jour et n'empile rien. Écrit en service_role,
// seul rôle autorisé sur cette table.
//
// Rien ne s'exécute au chargement de ce fichier (règle R2-4) : l'importer ne
// déclenche rien. Il n'est pas destructeur, d'où l'écriture par défaut et le
// mode d'essai en option ; l'inverse contredirait la conséquence ③ de D7, qui
// prescrit `npm run communes:import` tel quel à la création de la production.
// La clé de recherche vient du domaine, jamais d'une copie locale : l'import et
// la requête doivent calculer exactement la même chose.
import { cleRechercheCommune } from '../packages/core/src/city.ts'
import { lanceDirectement, env } from './garde.mjs'

const SOURCE =
  'https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,centre,population&format=json'
const LOT = 500

async function importer(essai) {
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
      search_key: cleRechercheCommune(c.nom),
      updated_at: new Date().toISOString(),
    }))

  if (essai) {
    console.log(`Mode d'essai : ${lignes.length} communes seraient écrites, rien n'est envoyé.`)
    console.log('  exemple :', JSON.stringify(lignes[0]))
    return
  }

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
    body: JSON.stringify([
      { id: true, importe_le: new Date().toISOString(), lignes: lignes.length },
    ]),
  })

  console.log(`Référentiel à jour : ${lignes.length} communes.`)
}

if (lanceDirectement(import.meta.url)) {
  await importer(process.argv.includes('--essai'))
}
