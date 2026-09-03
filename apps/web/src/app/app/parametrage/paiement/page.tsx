import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { FormPaiement } from './form'

/**
 * D17 — le paiement et les réservations, sortis du grenier.
 *
 * L'ancien écran de réglages portait sept réglages sans rapport les uns avec
 * les autres. Ceux-ci vont ensemble parce qu'ils répondent à une seule
 * question : **ce qui se passe quand une cliente réserve.** Combien elle paie
 * et quand, ce qu'elle peut annuler, et si la pro valide.
 */
export default async function Paiement() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: reglages } = await supabase
    .from('pro_settings')
    .select('payment_mode, default_deposit_percent, booking_confirmation_mode')
    .eq('pro_id', pro.id)
    .maybeSingle()

  if (!reglages) return null

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={copy.agendaTournee.$aEcrire.navProfil}
        statement={copy.agendaTournee.$aEcrire.paiement}
      />
      <CorpsEcran serre>
        <FormPaiement reglages={reglages} />
      </CorpsEcran>
    </>
  )
}
