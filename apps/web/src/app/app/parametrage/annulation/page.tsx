import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { FormAnnulation } from './form'

/**
 * D17, planche 17c — « Annulation et majorations ».
 *
 * Deux réglages qui vont ensemble parce qu'ils répondent à la même question :
 * **ce qui change le montant ou le créneau après coup.** Le délai d'annulation
 * gratuite (A10) et le temps en plus d'une première visite (B5).
 */
export default async function Annulation() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: reglages } = await supabase
    .from('pro_settings')
    .select('free_cancellation_hours, new_client_buffer_min')
    .eq('pro_id', pro.id)
    .maybeSingle()

  if (!reglages) return null

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={copy.agendaTournee.$aEcrire.navProfil}
        statement={copy.agendaTournee.$aEcrire.annulation}
      />
      <CorpsEcran serre>
        <FormAnnulation reglages={reglages} />
      </CorpsEcran>
    </>
  )
}
