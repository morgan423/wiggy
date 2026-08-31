// A4 : supprime les dépôts de photos que personne n'est venu réclamer.
//
// Un dépôt sans rendez-vous est une cliente qui a téléversé puis abandonné le
// tunnel. Ce sont des photos de personnes : elles ne restent pas.
//
//   npm run photos:purge                    liste ce qui serait supprimé
//   npm run photos:purge -- --appliquer     supprime
//   npm run photos:purge -- --appliquer 6   supprime au-delà de 6 h
//
// Ce script SUPPRIME. Il porte donc les trois gardes de la règle R2-4 :
//   ① rien ne s'exécute au chargement du fichier ;
//   ② le mode d'essai est le défaut, supprimer demande `--appliquer` ;
//   ③ il refuse de tourner ailleurs qu'en développement (D7).
import { lanceDirectement, modeEssai, env, exigerDeveloppement } from './garde.mjs'

const DEPOT = 'depots'
const SEAU = 'appointment-photos'

async function purger(essai, heures) {
  const valeurs = env()
  // La production porte les photos de vraies clientes. Elle ne sert jamais à
  // une recette, et rien ne s'y supprime depuis un poste de développement.
  if (!essai) exigerDeveloppement(valeurs)

  const url = (valeurs.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')
  const cle = valeurs.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) {
    console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
    process.exit(1)
  }

  const limite = Date.now() - heures * 3600 * 1000
  const entetes = {
    apikey: cle,
    Authorization: `Bearer ${cle}`,
    'Content-Type': 'application/json',
  }

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
    console.log(`Aucun dépôt orphelin au-delà de ${heures} h.`)
    return
  }

  if (essai) {
    console.log(`Mode d'essai : ${aSupprimer.length} fichier(s) SERAIENT supprimés.`)
    for (const chemin of aSupprimer) console.log('  ', chemin)
    console.log('Relancer avec --appliquer pour supprimer réellement.')
    return
  }

  const r = await fetch(`${url}/storage/v1/object/${SEAU}`, {
    method: 'DELETE',
    headers: entetes,
    body: JSON.stringify({ prefixes: aSupprimer }),
  })
  if (!r.ok) throw new Error(`suppression : HTTP ${r.status} ${await r.text()}`)
  console.log(`${aSupprimer.length} fichier(s) purgé(s) au-delà de ${heures} h.`)
}

if (lanceDirectement(import.meta.url)) {
  const heures = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 24)
  await purger(modeEssai(), heures)
}
