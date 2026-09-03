import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@wiggy/api'

/**
 * D10 ① — le mode d'exercice d'une pro, lu séparément et sans jamais tomber.
 *
 * Pourquoi une lecture à part plutôt qu'une colonne de plus dans le `select`
 * de l'appelant : les migrations sont appliquées à la main par Morgan (D7), et
 * il existe donc une fenêtre où le code connaît la colonne `mode` alors que la
 * base ne l'a pas encore. Dans un `select` groupé, PostgREST rejette la requête
 * ENTIÈRE : la page de réservation renverrait 404 et le tunnel serait mort le
 * temps que la migration soit collée.
 *
 * Ici, l'échec est borné : on retombe sur `itinerant`, qui est le défaut de la
 * colonne et le comportement d'aujourd'hui, et on le DIT dans les logs plutôt
 * que de l'avaler. Personne ne perd de réservation pendant une migration.
 */
export type ModeExercice = 'itinerant' | 'fixe'

export async function modeDuPro(
  client: SupabaseClient<Database>,
  proId: string,
): Promise<ModeExercice> {
  const { data, error } = await client.from('pros').select('mode').eq('id', proId).maybeSingle()
  if (error) {
    // Pas de donnée personnelle dans le log : un code d'erreur et un rappel.
    console.error('mode_exercice_illisible', error.code, 'migration 0010 appliquée ?')
    return 'itinerant'
  }
  return data?.mode === 'fixe' ? 'fixe' : 'itinerant'
}
