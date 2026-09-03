'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm } from '@/lib/forms'

const entier = (donnees: FormData, nom: string): number => {
  const brut = donnees.get(nom)
  return Number.parseInt(typeof brut === 'string' ? brut : '', 10)
}

/** A10 et B5 : le délai d'annulation gratuite, et le temps d'une première visite. */
export async function enregistrerAnnulation(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const heures = entier(donnees, 'free_cancellation_hours')
  const tampon = entier(donnees, 'new_client_buffer_min')
  if (!Number.isFinite(heures) || heures < 0 || heures > 168) {
    return erreur(precedent, 'Entre 0 et 168 heures.', donnees, 'free_cancellation_hours')
  }
  if (!Number.isFinite(tampon) || tampon < 0 || tampon > 120) {
    return erreur(precedent, 'Entre 0 et 120 minutes.', donnees, 'new_client_buffer_min')
  }

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase
    .from('pro_settings')
    .update({ free_cancellation_hours: heures, new_client_buffer_min: tampon })
    .eq('pro_id', pro.id)
  if (error) return erreurBase(precedent, 'maj_annulation_failed', error, donnees)

  revalidatePath('/app/parametrage/annulation')
  revalidatePath(`/${pro.slug}`)
  return ok(precedent, 'Enregistré.')
}
