'use server'

import { revalidatePath } from 'next/cache'
import { ReglagesInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, champ, type EtatForm } from '@/lib/forms'

/** Les réglages du compte : paiement, confirmation, tampon, GPS, SMS. */
export async function enregistrerReglages(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const saisie = ReglagesInput.safeParse({
    payment_mode: champ(donnees, 'payment_mode'),
    default_deposit_percent: champ(donnees, 'default_deposit_percent'),
    booking_confirmation_mode: champ(donnees, 'booking_confirmation_mode'),
    free_cancellation_hours: champ(donnees, 'free_cancellation_hours'),
    new_client_buffer_min: champ(donnees, 'new_client_buffer_min') ?? '0',
    // Sémantique HTML d'une case : décochée, le champ n'est pas envoyé.
    sms_enabled: donnees.get('sms_enabled') !== null,
    gps_app: champ(donnees, 'gps_app'),
  })
  if (!saisie.success) {
    const faute = saisie.error.issues[0]
    return erreur(precedent, faute.message, donnees, String(faute.path[0] ?? ''))
  }

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: enregistre, error } = await supabase
    .from('pro_settings')
    .update(saisie.data)
    .eq('pro_id', pro.id)
    .select('gps_app, new_client_buffer_min, sms_enabled')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_reglages_failed', error, donnees)
  if (!enregistre) {
    console.error('maj_reglages_sans_effet')
    return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)
  }

  revalidatePath('/app/parametrage/reglages')
  revalidatePath('/app/tournee')
  return ok(precedent, 'Réglages enregistrés.', enregistre)
}
