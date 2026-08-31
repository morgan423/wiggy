'use server'

import { revalidatePath } from 'next/cache'
import { CongeInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm, champ, champTexte } from '@/lib/forms'

/** B11 ④ — congés : plages longues d'indisponibilité. */

const CHEMIN = '/app/parametrage/conges'

export async function ajouterConge(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = CongeInput.safeParse({
    starts_at: champ(donnees, 'starts_at'),
    // La date de fin saisie est un jour entier : le congé court jusqu'à la fin
    // de ce jour-là, pas jusqu'à son premier instant.
    ends_at: finDeJournee(champ(donnees, 'ends_at')),
    label: champ(donnees, 'label'),
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('time_off').insert({
    pro_id: pro.id,
    starts_at: saisie.data.starts_at.toISOString(),
    ends_at: saisie.data.ends_at.toISOString(),
    label: saisie.data.label,
  })
  if (error) return erreurBase(precedent, 'ajout_conge_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(precedent, 'Congé enregistré.')
}

export async function supprimerConge(donnees: FormData) {
  const id = champTexte(donnees, 'id')
  if (!id) return
  await requirePro()
  const supabase = await supabaseServer()
  await supabase.from('time_off').delete().eq('id', id)
  revalidatePath(CHEMIN)
}

function finDeJournee(jour: string | null): string | null {
  if (!jour) return null
  // Un champ `date` envoie « AAAA-MM-JJ » : le congé court jusqu'à la fin de
  // cette journée-là, pas jusqu'à son premier instant.
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) ? `${jour}T23:59:59` : jour
}
