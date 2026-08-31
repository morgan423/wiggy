// Contrôle structurel du schéma : les migrations s'appliquent, et aucune table
// applicative ne sort sans RLS. `npm run db:check`.
import { createDb, listMigrations } from './db.mjs'

const db = await createDb()
const files = await listMigrations()
for (const f of files) console.log(`  ok   ${f}`)

// Une table sans RLS est une fuite de données entre comptes. Ce garde-fou
// existe pour que l'oubli soit impossible, pas improbable.
const { rows: sansRls } = await db.query(`
  select tablename from pg_tables
  where schemaname = 'public' and rowsecurity = false
  order by tablename
`)
if (sansRls.length > 0) {
  console.error(`\nRLS absente sur : ${sansRls.map((r) => r.tablename).join(', ')}`)
  process.exit(1)
}

// Une table avec RLS mais sans aucune policy est muette : souvent voulu
// (city_waitlist), parfois un oubli. On l'affiche pour que ce soit un choix.
const { rows: sansPolicy } = await db.query(`
  select t.tablename from pg_tables t
  where t.schemaname = 'public'
    and not exists (select 1 from pg_policies p
                    where p.schemaname = 'public' and p.tablename = t.tablename)
  order by t.tablename
`)

const { rows: total } = await db.query(
  `select count(*)::int as n from pg_tables where schemaname = 'public'`,
)
console.log(`\n${files.length} migration(s), ${total[0].n} tables, RLS active partout.`)
if (sansPolicy.length > 0) {
  console.log(
    `Sans policy (accès fermé, à vérifier volontaire) : ${sansPolicy.map((r) => r.tablename).join(', ')}`,
  )
}
