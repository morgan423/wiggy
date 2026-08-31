// Concatène les migrations en un seul fichier, à coller dans l'éditeur SQL de
// Supabase. Utile tant qu'on n'a ni mot de passe base ni jeton d'accès pour
// automatiser l'application (`supabase db push`). `npm run db:bundle`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const dossier = join(racine, 'supabase', 'migrations')

// `--depuis 0005` ne regroupe que les migrations non encore appliquées :
// rejouer tout le lot échouerait sur les types et tables déjà créés.
const depuis = process.argv.includes('--depuis')
  ? process.argv[process.argv.indexOf('--depuis') + 1]
  : null

const toutes = readdirSync(dossier)
  .filter((f) => f.endsWith('.sql'))
  .sort()
const fichiers = depuis ? toutes.filter((f) => f >= depuis) : toutes
if (fichiers.length === 0) {
  console.error(`Aucune migration à partir de « ${depuis} ».`)
  process.exit(1)
}

const sortie = join(
  racine,
  depuis ? `MIGRATIONS-A-COLLER-DEPUIS-${depuis}.sql` : 'MIGRATIONS-A-COLLER.sql',
)

const entete = `-- Wiggy — migrations
-- Concaténation des ${fichiers.length} migrations, dans l'ordre.
--
-- À coller dans : projet Supabase → SQL Editor → New query → Run.
-- Ce fichier est généré : ne le modifie pas, modifie les migrations.
--
-- Fichiers inclus : ${fichiers.join(', ')}

`

const corps = fichiers
  .map((f) => {
    const barre = '='.repeat(72)
    return `-- ${barre}\n-- ${f}\n-- ${barre}\n\n${readFileSync(join(dossier, f), 'utf8').trim()}\n`
  })
  .join('\n')

writeFileSync(sortie, entete + corps + '\n')
console.log(`MIGRATIONS-A-COLLER.sql — ${fichiers.length} migrations`)
