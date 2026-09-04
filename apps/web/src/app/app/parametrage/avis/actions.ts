'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * A7 — publier ou masquer un avis. **Les deux seuls gestes.**
 *
 * Aucune suppression : masquer et effacer sont deux choses différentes, et la
 * seconde se regrette. Aucune modification du texte non plus — un avis modifié
 * par la personne qu'il note n'est plus un avis.
 *
 * `statut` arrive en `string` et non en union : une action serveur reçoit ce
 * qu'on veut bien lui envoyer, et c'est le filtre ci-dessous qui garantit la
 * valeur, pas le typage.
 */
export async function changerStatutAvis(id: string, statut: string): Promise<void> {
  const { pro } = await requirePro()
  if (statut !== 'publie' && statut !== 'masque') return

  const supabase = await supabaseServer()
  // La RLS borne déjà à ce compte ; le filtre explicite le redit, parce qu'une
  // politique qui change ne doit pas ouvrir cette écriture-ci.
  const { error } = await supabase
    .from('avis')
    .update({ statut, publie_le: statut === 'publie' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('pro_id', pro.id)
  if (error) console.error('avis_statut_failed', error.code)

  revalidatePath('/app/parametrage/avis')
  revalidatePath('/[slug]', 'page')
}
