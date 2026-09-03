'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm } from '@/lib/forms'

/** B7 — le canal des rappels. Sémantique HTML : décochée, la case n'est pas envoyée. */
export async function basculerSms(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: enregistre, error } = await supabase
    .from('pro_settings')
    .update({ sms_enabled: donnees.get('sms_enabled') !== null })
    .eq('pro_id', pro.id)
    .select('sms_enabled')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_sms_failed', error, donnees)
  if (!enregistre) return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)

  revalidatePath('/app/abonnement')
  return ok(precedent, 'Enregistré.')
}
