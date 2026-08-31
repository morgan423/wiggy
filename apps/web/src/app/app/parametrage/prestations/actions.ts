'use server'

import { revalidatePath } from 'next/cache'
import { PrestationInput } from '@wiggy/api'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, type EtatForm, champ, champTexte } from '@/lib/forms'

/**
 * B11 ① — les prestations.
 *
 * Pas de vérification de palier ici : configurer son activité est le socle,
 * il appartient à tous les paliers (§2). Le gating porte sur ce qu'on en fait
 * ensuite (créneaux géo-filtrés, copilote), pas sur le paramétrage.
 *
 * Le cloisonnement est assuré par la RLS : `pro_id` vient de la session, jamais
 * du formulaire.
 */

const CHEMIN = '/app/parametrage/prestations'

export async function creerPrestation(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = PrestationInput.safeParse({
    name: champ(donnees, 'name'),
    description: champ(donnees, 'description'),
    price_cents: champ(donnees, 'price_cents'),
    duration_min: champ(donnees, 'duration_min'),
    deposit_percent: champ(donnees, 'deposit_percent'),
    active: true,
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('services').insert({ ...saisie.data, pro_id: pro.id })
  if (error) return erreurBase(precedent, 'creation_prestation_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(precedent, `« ${saisie.data.name} » ajoutée.`)
}

export async function basculerPrestation(donnees: FormData) {
  const id = champTexte(donnees, 'id')
  const active = champ(donnees, 'active') === 'true'
  if (!id) return

  await requirePro()
  const supabase = await supabaseServer()
  // Pas de filtre sur pro_id : la RLS l'impose déjà, et l'ajouter ici
  // laisserait croire que c'est elle qui protège.
  await supabase.from('services').update({ active: !active }).eq('id', id)
  revalidatePath(CHEMIN)
}

export async function supprimerPrestation(donnees: FormData) {
  const id = champTexte(donnees, 'id')
  if (!id) return

  await requirePro()
  const supabase = await supabaseServer()
  await supabase.from('services').delete().eq('id', id)
  revalidatePath(CHEMIN)
}
