'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm } from '@/lib/forms'

/**
 * Trois cases, donc trois présences ou absences dans le formulaire : la
 * sémantique HTML d'une case à cocher est que, décochée, le champ n'est pas
 * envoyé du tout.
 */
export async function enregistrerNotifications(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: enregistre, error } = await supabase
    .from('pro_settings')
    .update({
      push_reponse_cliente: donnees.get('push_reponse_cliente') !== null,
      push_avis: donnees.get('push_avis') !== null,
    })
    .eq('pro_id', pro.id)
    .select('push_avis')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_notifications_failed', error, donnees)
  if (!enregistre) return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)

  revalidatePath('/app/parametrage/notifications')
  return ok(precedent, 'Réglages enregistrés.', enregistre)
}
