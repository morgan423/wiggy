import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { EnteteEcran, CorpsEcran } from '@/components/composition'
import { FormNotifications } from './form'

/**
 * B14 et D17 — quelles notifications doublent le journal.
 *
 * La cloche garde la trace de tout ; ces bascules décident seulement de ce qui
 * vient CHERCHER la pro pendant qu'elle coiffe. C'est la même distinction que
 * partout : l'app propose, la pro dispose.
 */
export default async function Notifications() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: reglages } = await supabase
    .from('pro_settings')
    .select('push_reponse_cliente, push_avis')
    .eq('pro_id', pro.id)
    .maybeSingle()

  if (!reglages) return null

  return (
    <>
      <EnteteEcran
        retour="/app/parametrage"
        retourLibelle={copy.agendaTournee.$aEcrire.navProfil}
        statement={copy.agendaTournee.$aEcrire.notifications}
      />
      <CorpsEcran serre>
        <FormNotifications reglages={reglages} />
      </CorpsEcran>
    </>
  )
}
