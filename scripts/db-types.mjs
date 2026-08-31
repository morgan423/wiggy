// Génère les types TypeScript de la base depuis le schéma réel (PGlite, après
// migrations). Aucune saisie à la main : les types ne peuvent pas mentir sur
// ce que contient la base. `npm run db:types`
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from './db.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const db = await createDb()

const { rows: enums } = await db.query(`
  select t.typname as nom, array_agg(e.enumlabel order by e.enumsortorder) as valeurs
  from pg_type t join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' group by t.typname order by t.typname
`)

const { rows: colonnes } = await db.query(`
  select table_name, column_name, data_type, udt_name, is_nullable,
         column_default is not null as a_defaut
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position
`)

const TYPES = {
  uuid: 'string',
  text: 'string',
  'character varying': 'string',
  integer: 'number',
  smallint: 'number',
  bigint: 'number',
  numeric: 'number',
  'double precision': 'number',
  real: 'number',
  boolean: 'boolean',
  'timestamp with time zone': 'string',
  'timestamp without time zone': 'string',
  date: 'string',
  'time without time zone': 'string',
  interval: 'string',
  json: 'unknown',
  jsonb: 'unknown',
}

const nomEnum = (udt) => udt.replace(/(^|_)(\w)/g, (_, s, c) => (s ? '' : '') + c.toUpperCase())

const typeDe = (c) => {
  if (c.data_type === 'USER-DEFINED') return nomEnum(c.udt_name)
  const base = TYPES[c.data_type]
  if (!base)
    throw new Error(`Type Postgres non couvert : ${c.data_type} (${c.table_name}.${c.column_name})`)
  return base
}

const tables = {}
for (const c of colonnes) (tables[c.table_name] ??= []).push(c)

let sortie = `/**
 * Types de la base — FICHIER GÉNÉRÉ par \`npm run db:types\` depuis le schéma
 * réel (les migrations rejouées sur un Postgres jetable).
 *
 * Ne pas éditer : modifier une migration, puis régénérer. Ces types sont ce qui
 * transforme une faute de frappe sur un nom de colonne en erreur de
 * compilation plutôt qu'en \`undefined\` silencieux à l'exécution.
 */

`

for (const { nom, valeurs } of enums) {
  sortie += `export type ${nomEnum(nom)} = ${valeurs.map((v) => `'${v}'`).join(' | ')}\n`
}
sortie += '\n'

const lignes = []
for (const [table, cols] of Object.entries(tables)) {
  const Row = cols
    .map((c) => `        ${c.column_name}: ${typeDe(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`)
    .join('\n')
  const Insert = cols
    .map((c) => {
      const facultatif = c.a_defaut || c.is_nullable === 'YES'
      return `        ${c.column_name}${facultatif ? '?' : ''}: ${typeDe(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`
    })
    .join('\n')
  const Update = cols
    .map(
      (c) => `        ${c.column_name}?: ${typeDe(c)}${c.is_nullable === 'YES' ? ' | null' : ''}`,
    )
    .join('\n')
  lignes.push(
    `      ${table}: {\n        Row: {\n${Row}\n        }\n        Insert: {\n${Insert}\n        }\n        Update: {\n${Update}\n        }\n        Relationships: []\n      }`,
  )
}

sortie += `export type Database = {
  public: {
    Tables: {
${lignes.join('\n')}
    }
    Views: Record<string, never>
    Functions: {
      consommer_quota: {
        Args: { p_cle: string; p_limite: number; p_fenetre_sec: number }
        Returns: boolean
      }
    }
    Enums: {
${enums.map((e) => `      ${e.nom}: ${nomEnum(e.nom)}`).join('\n')}
    }
    CompositeTypes: Record<string, never>
  }
}

/** Raccourci : le type d'une ligne de table. */
export type Ligne<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
`

writeFileSync(join(racine, 'packages/api/src/database.types.ts'), sortie)
console.log(
  `database.types.ts — ${Object.keys(tables).length} tables, ${enums.length} énumérations`,
)
