import { createClient } from '@supabase/supabase-js'
import type { Database } from '@wiggy/api'

/**
 * Client service role — SERVEUR UNIQUEMENT.
 *
 * Il contourne la RLS : il ne doit jamais être importé depuis un composant
 * client, et chaque appel doit porter lui-même le filtrage par compte.
 * Créé paresseusement pour que le build n'exige pas les variables d'env.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase non configuré : renseigne NEXT_PUBLIC_SUPABASE_URL et ' +
        'SUPABASE_SERVICE_ROLE_KEY (cf. .env.example).',
    )
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

/** Vrai si l'environnement permet d'interroger la base. */
export function supabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}
