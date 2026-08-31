'use server'

import { revalidatePath } from 'next/cache'
import { HoraireInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm, champ, champTexte } from '@/lib/forms'

/** B11 ③ — horaires de travail récurrents, distincts du blocage ponctuel (B4). */

const CHEMIN = '/app/parametrage/horaires'

export async function ajouterPlage(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = HoraireInput.safeParse({
    weekday: champ(donnees, 'weekday'),
    starts_at: champ(donnees, 'starts_at'),
    ends_at: champ(donnees, 'ends_at'),
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('working_hours').insert({ ...saisie.data, pro_id: pro.id })
  if (error) return erreurBase(precedent, 'ajout_plage_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(precedent, 'Plage ajoutée.')
}

export async function supprimerPlage(donnees: FormData) {
  const id = champTexte(donnees, 'id')
  if (!id) return
  await requirePro()
  const supabase = await supabaseServer()
  await supabase.from('working_hours').delete().eq('id', id)
  revalidatePath(CHEMIN)
}
