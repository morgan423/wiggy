// Monte un Postgres jetable (PGlite) qui se comporte comme un projet Supabase :
// mêmes rôles, même mécanique d'identité, mêmes droits de départ. Sert au
// contrôle structurel (db-check) comme aux tests de comportement (db-test).
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const migrationsDir = join(root, 'supabase', 'migrations')

// Ce que Supabase fournit d'office et que les migrations supposent présent.
const AVANT = `
  create schema if not exists auth;
  create table auth.users (id uuid primary key, email text);

  -- L'identité vient du jeton, exactement comme sur Supabase : c'est ce qui
  -- rend les policies testables pour de vrai.
  create or replace function auth.uid() returns uuid
    language sql stable as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $fn$;

  -- Le stockage de fichiers, réduit à ce que les migrations touchent : le
  -- catalogue des seaux. Sans lui, la déclaration du seau des photos (A4) ne
  -- serait rejouable que sur un vrai projet Supabase.
  create schema if not exists storage;
  create table storage.buckets (
    id                 text primary key,
    name               text not null unique,
    public             boolean not null default false,
    file_size_limit    bigint,
    allowed_mime_types text[],
    created_at         timestamptz not null default now()
  );

  do $do$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
  end $do$;
  grant usage on schema public to anon, authenticated;
`

// Droits que la plateforme Supabase accorde au rôle connecté ; les policies RLS
// restent le vrai filtre. anon, lui, n'a que ce que les migrations lui donnent.
const APRES = `
  grant all on all tables in schema public to authenticated;
  grant all on all sequences in schema public to authenticated;
`

export async function listMigrations() {
  return (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()
}

/** Applique les migrations dans l'ordre. Lève au premier échec. */
export async function createDb() {
  const db = new PGlite()
  await db.exec(AVANT)
  const files = await listMigrations()
  if (files.length === 0) throw new Error('Aucune migration trouvée.')
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf8')
    try {
      await db.exec(sql)
    } catch (error) {
      throw new Error(`${file} : ${error.message}`, { cause: error })
    }
  }
  await db.exec(APRES)
  return db
}

/** Exécute des requêtes en se faisant passer pour un pro connecté. */
export async function asPro(db, userId, run) {
  return withRole(db, 'authenticated', userId, run)
}

/** Exécute des requêtes en visiteuse anonyme (page publique). */
export async function asAnon(db, run) {
  return withRole(db, 'anon', null, run)
}

/**
 * Exécute des requêtes avec les droits du serveur (équivalent service_role :
 * la RLS est contournée, mais pas les contraintes ni les déclencheurs).
 * Ouvre une transaction, ce dont `tenter` a besoin pour ses points de
 * sauvegarde.
 */
export async function asService(db, run) {
  await db.exec('begin')
  try {
    const resultat = await run()
    await db.exec('commit')
    return resultat
  } catch (error) {
    await db.exec('rollback')
    throw error
  }
}

// `set local role` et le claim ne valent que dans une transaction : on en ouvre
// une, et on la valide — ce qu'un rôle a réussi à écrire doit rester visible
// pour la suite du scénario, sinon on ne teste pas grand-chose.
async function withRole(db, role, userId, run) {
  await db.exec('begin')
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
    await db.exec(`set local role ${role}`)
    const resultat = await run()
    await db.exec('commit')
    return resultat
  } catch (error) {
    await db.exec('rollback')
    throw error
  }
}

/**
 * Tente une requête sous point de sauvegarde.
 *
 * Sans ça, la première erreur SQL avorte la transaction entière et toutes les
 * requêtes suivantes échouent en « current transaction is aborted » — ce qui
 * ferait passer pour refusé ce qui n'a jamais été essayé.
 */
export async function tenter(db, sql, params = []) {
  await db.exec('savepoint essai')
  try {
    const { rows } = await db.query(sql, params)
    await db.exec('release savepoint essai')
    return { ok: true, rows }
  } catch (error) {
    await db.exec('rollback to savepoint essai')
    return { ok: false, message: String(error.message ?? error) }
  }
}
