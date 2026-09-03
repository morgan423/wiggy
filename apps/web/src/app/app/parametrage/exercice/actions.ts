'use server'

import { revalidatePath } from 'next/cache'
import { estAppGps } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm } from '@/lib/forms'

/**
 * Le mode d'exercice et le GPS, écrits séparément.
 *
 * Le mode vit sur `pros` et arrive avec la migration 0010 ; le GPS vit sur
 * `pro_settings`. Deux tables, deux écritures, et le mode se garde de faire
 * échouer l'autre s'il n'est pas encore collé (voir `lib/mode.ts`).
 */
export async function enregistrerExercice(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const brut = donnees.get('gps_app')
  const app = typeof brut === 'string' ? brut : ''
  if (!estAppGps(app)) return erreur(precedent, 'Choisis une application.', donnees, 'gps_app')

  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  // Sémantique HTML d'une case : décochée, le champ n'est pas envoyé du tout.
  const mode = donnees.get('mode') === null ? 'itinerant' : 'fixe'
  const { error: erreurMode } = await supabase.from('pros').update({ mode }).eq('id', pro.id)
  if (erreurMode) console.error('maj_mode_failed', erreurMode.code, 'migration 0010 appliquée ?')

  const { error } = await supabase
    .from('pro_settings')
    .update({ gps_app: app })
    .eq('pro_id', pro.id)
  if (error) return erreurBase(precedent, 'maj_exercice_failed', error, donnees)

  revalidatePath('/app/parametrage/exercice')
  revalidatePath('/app/tournee')
  return ok(precedent, 'Enregistré.')
}
