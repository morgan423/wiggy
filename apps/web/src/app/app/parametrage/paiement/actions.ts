'use server'

import { revalidatePath } from 'next/cache'
import { PaiementInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, champ, type EtatForm } from '@/lib/forms'

/** Ce qui se passe quand une cliente réserve : paiement, annulation, validation. */
export async function enregistrerPaiement(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const saisie = PaiementInput.safeParse({
    payment_mode: champ(donnees, 'payment_mode'),
    default_deposit_percent: champ(donnees, 'default_deposit_percent'),
    booking_confirmation_mode: champ(donnees, 'booking_confirmation_mode'),
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
    .select('booking_confirmation_mode')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_paiement_failed', error, donnees)
  if (!enregistre) return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)

  revalidatePath('/app/parametrage/paiement')
  // Le badge de la page publique en dépend : elle doit se refaire.
  revalidatePath(`/${pro.slug}`)
  return ok(precedent, 'Réglages enregistrés.', enregistre)
}
