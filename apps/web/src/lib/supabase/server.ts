import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@wiggy/api'

/**
 * Client Supabase lié à la session du pro connecté.
 *
 * Toutes les requêtes passées par ce client sont soumises à la RLS : c'est la
 * base qui filtre, pas le code applicatif. C'est le client à utiliser partout,
 * sauf pour les rares opérations qui doivent délibérément l'outrepasser
 * (webhooks Stripe, liste d'attente) — celles-là passent par `supabaseAdmin`.
 */
export async function supabaseServer() {
  const store = await cookies()
  return createServerClient<Database>(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              store.set(name, value, options)
            }
          } catch {
            // Appelé depuis un Server Component : le rafraîchissement de session
            // est déjà assuré par le proxy, on peut ignorer sans risque.
          }
        },
      },
    },
  )
}

function requiredEnv(nom: string): string {
  const valeur = process.env[nom]
  if (!valeur) throw new Error(`Variable d'environnement manquante : ${nom} (cf. .env.example).`)
  return valeur
}
