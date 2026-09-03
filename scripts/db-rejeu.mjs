// Preuve d'idempotence : on applique toutes les migrations, PUIS on rejoue une
// seconde fois celles qui doivent l'être. Une migration idempotente passe deux
// fois sans broncher.
//
// Pourquoi une PREUVE et pas une relecture : « if not exists » posé sur un
// `create table` ne dit rien de ses index, de ses politiques ou de ses types.
// Seul un second passage le dit.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createDb, migrationsDir, listMigrations } from './db.mjs'
import { sondeDe } from './db-etat.mjs'

const PREMIERE = 17

// Toute migration non gelée déclare sa SONDE : c'est elle qui permet à
// `npm run db:etat` de dire si elle est passée. Sans elle, on retomberait dans
// le registre déclaratif qu'on vient de quitter.
const sansSonde = []
for (const f of (await listMigrations()).filter((f) => Number(f.slice(0, 4)) >= PREMIERE)) {
  if (!sondeDe(f, await readFile(join(migrationsDir, f), 'utf8'))) sansSonde.push(f)
}
if (sansSonde.length > 0) {
  console.error('\nCes migrations ne déclarent pas de sonde `-- @sonde:` :')
  for (const f of sansSonde) console.error(`  ✖ ${f}`)
  console.error('\nSans sonde, `npm run db:etat` ne peut pas dire si elles sont passées.\n')
  process.exit(1)
}

const db = await createDb()
const fichiers = (await listMigrations()).filter((f) => Number(f.slice(0, 4)) >= PREMIERE)
let echec = false
for (const f of fichiers) {
  const sql = await readFile(join(migrationsDir, f), 'utf8')
  try {
    await db.exec(sql)
    console.log(`  ok   ${f} (rejouée)`)
  } catch (e) {
    console.error(`  ✖ ${f} : ${e.message}`)
    echec = true
  }
}
console.log(
  echec
    ? '\nUne migration ne se rejoue pas : un lot interrompu serait irrattrapable.'
    : `\n${String(fichiers.length)} migration(s) rejouée(s) sans erreur.`,
)
if (echec) process.exit(1)
