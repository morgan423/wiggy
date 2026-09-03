import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { modeDuPro } from '@/lib/mode'
import { FormExercice } from './form'

/**
 * D17, planche 17c — le mode d'exercice et le GPS restent MÉTIER.
 *
 * Ils disent comment la pro travaille : si elle se déplace, et avec quoi elle
 * navigue. Ce n'est ni un réglage de facturation ni un réglage de compte, et
 * c'est pour ça qu'ils vivent sous « Ton activité » et non sous « Paiement ».
 */
export default async function Exercice() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const [{ data: reglages }, mode] = await Promise.all([
    supabase.from('pro_settings').select('gps_app').eq('pro_id', pro.id).maybeSingle(),
    modeDuPro(supabase, pro.id),
  ])

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={copy.agendaTournee.$aEcrire.navProfil}
        statement={copy.agendaTournee.$aEcrire.exercice}
      />
      <CorpsEcran serre>
        <FormExercice mode={mode} app={reglages?.gps_app ?? 'system'} />
      </CorpsEcran>
    </>
  )
}
