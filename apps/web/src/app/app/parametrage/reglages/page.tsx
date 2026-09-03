import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { FormReglages } from './form'

/**
 * Les réglages du compte, qui n'avaient aucun écran.
 *
 * Ils existaient en base et dans le schéma depuis le début, et deux
 * fonctionnalités les attendaient sans pouvoir les régler : le tampon
 * « nouvelle cliente » de B5, et l'application de navigation de C3, dont la
 * roadmap dit « préférence réglée une fois ». Une préférence qu'on ne peut pas
 * régler n'est pas une préférence.
 */
export default async function Reglages() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: reglages } = await supabase
    .from('pro_settings')
    .select(
      'payment_mode, default_deposit_percent, booking_confirmation_mode, free_cancellation_hours, new_client_buffer_min, sms_enabled, gps_app',
    )
    .eq('pro_id', pro.id)
    .maybeSingle()

  if (!reglages) return null

  return (
    <>
      <EnteteEcran retour="/app/parametrage" statement="Tes réglages." />
      <CorpsEcran serre>
        <FormReglages reglages={reglages} />
      </CorpsEcran>
    </>
  )
}
