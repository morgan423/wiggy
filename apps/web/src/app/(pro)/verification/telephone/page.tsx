import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { PanneauAuth } from '@/components/composition'
import { FormTelephone } from './form'

export const metadata: Metadata = { robots: { index: false } }

const A = copy.authentification

/**
 * D9, planche 14b : « Vérifions ton numéro. »
 *
 * Le téléphone vérifié est aussi le canal de récupération de mot de passe : le
 * trou signalé le 31/08, l'absence totale de récupération de compte, se referme
 * ici sans chantier dédié.
 */
export default async function VerifierTelephone() {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from('pros')
    .select('phone, phone_verified_at')
    .eq('id', pro.id)
    .maybeSingle()

  if (data?.phone_verified_at) redirect('/verification/email')

  return (
    <PanneauAuth statement={A.telephone.titre}>
      <FormTelephone numeroConnu={data?.phone ?? ''} />
    </PanneauAuth>
  )
}
