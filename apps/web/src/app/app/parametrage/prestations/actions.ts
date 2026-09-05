'use server'

import { revalidatePath } from 'next/cache'
import { PrestationInput } from '@wiggy/api'
import { prestationsARenommer } from '@wiggy/core'
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
    category: champ(donnees, 'category'),
    photos_required: donnees.get('photos_required') !== null,
    name: champ(donnees, 'name'),
    description: champ(donnees, 'description'),
    price_cents: champ(donnees, 'price_cents'),
    duration_min: champ(donnees, 'duration_min'),
    deposit_percent: champ(donnees, 'deposit_percent'),
    // Une case non cochée n'est pas envoyée par le navigateur : son absence
    // vaut « décochée », elle ne vaut pas « valeur manquante ».
    active: champ(donnees, 'active') !== null,
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('services').insert({ ...saisie.data, pro_id: pro.id })
  if (error) return erreurBase(precedent, 'creation_prestation_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(precedent, `« ${saisie.data.name} » ajoutée.`)
}

/**
 * L'ÉDITION D'UNE PRESTATION (planche 14d).
 *
 * ⚠️ **ELLE MANQUAIT DEPUIS LA LIVRAISON, ET C'ÉTAIT UN ÉCART DÉCLARÉ.** Le
 * commentaire de l'écran le disait : « la planche 14d fait passer l'édition par
 * une feuille montante, qui n'est pas construite. » Le signaler était juste ;
 * il fallait ensuite le construire, et personne ne l'a fait.
 *
 * ⚠️ **LA CONSÉQUENCE DÉPASSAIT LE CONFORT.** Sans édition, le champ « Groupe »
 * n'était atteignable QU'À LA CRÉATION : une pro ayant déjà posé ses six
 * prestations ne pouvait plus les ranger du tout, sauf à les supprimer et les
 * recréer. C'est ce trou qui a rendu le défaut du groupe invisible jusqu'ici.
 *
 * Le cloisonnement reste celui de la RLS : aucun filtre `pro_id` ici, parce
 * qu'en ajouter un laisserait croire que c'est lui qui protège.
 */
export async function modifierPrestation(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const id = champTexte(donnees, 'id')
  if (!id) return erreur(precedent, 'Prestation introuvable.', donnees)

  const saisie = PrestationInput.safeParse({
    category: champ(donnees, 'category'),
    photos_required: donnees.get('photos_required') !== null,
    name: champ(donnees, 'name'),
    description: champ(donnees, 'description'),
    price_cents: champ(donnees, 'price_cents'),
    duration_min: champ(donnees, 'duration_min'),
    deposit_percent: champ(donnees, 'deposit_percent'),
    active: champ(donnees, 'active') !== null,
  })
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('services').update(saisie.data).eq('id', id)
  if (error) return erreurBase(precedent, 'modification_prestation_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(precedent, `« ${saisie.data.name} » modifiée.`)
}

/**
 * LE RENOMMAGE D'UN GROUPE, en une fois.
 *
 * ⚠️ **C'EST LUI QUI RÈGLE LE VRAI PROBLÈME**, pas la liste déroulante. Le nom
 * du groupe est recopié dans chaque prestation : sans cette action, passer de
 * « Coupe » à « Coupes femme » demande de rouvrir chaque prestation et de
 * retaper exactement la même chaîne. Une seule oubliée, et la page publique
 * montre DEUX groupes sans que personne comprenne pourquoi.
 *
 * Il rattrape aussi les divergences déjà en base : la comparaison est
 * insensible à la casse et aux espaces, donc « coupe » et « Coupe » se
 * réunissent.
 */
export async function renommerGroupe(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const ancien = champTexte(donnees, 'ancien')
  const nouveau = champTexte(donnees, 'nouveau').trim()
  if (nouveau === '') return erreur(precedent, 'Donne un nom au groupe.', donnees)

  await requirePro()
  const supabase = await supabaseServer()
  // On relit SES prestations : la liste des groupes se déduit, elle n'est
  // stockée nulle part (B13, et aucune table de groupes).
  const { data } = await supabase.from('services').select('id, category')
  const cibles = prestationsARenommer(data ?? [], ancien)
  if (cibles.length === 0) return erreur(precedent, 'Ce groupe n’existe plus.', donnees)

  const { error } = await supabase.from('services').update({ category: nouveau }).in('id', cibles)
  if (error) return erreurBase(precedent, 'renommage_groupe_failed', error, donnees)

  revalidatePath(CHEMIN)
  return ok(
    precedent,
    `« ${ancien} » renommé en « ${nouveau} » sur ${String(cibles.length)} prestation${
      cibles.length > 1 ? 's' : ''
    }.`,
  )
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
