'use server'

import { revalidatePath } from 'next/cache'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { erreur, erreurBase, ok, champ, type EtatForm } from '@/lib/forms'

/**
 * B2 — les annotations techniques d'une cliente.
 *
 * **Niveau 1 des trois** (B2, corrigé le 03/09) : le PROFIL technique, vrai en
 * permanence. Ce qui a été FAIT à chaque visite vit dans le journal daté
 * (`client_notes`), et ne s'écrase jamais.
 *
 * ⚠️ Garde-fou de `CLAUDE.md` : **pas de données de santé, jamais.** Le champ
 * est métier, et c'est l'INTERFACE qui tient cette frontière : le texte d'aide
 * oriente vers la formule, le dosage, le produit et le geste, jamais vers la
 * personne. Aucun filtre automatique n'est posé sur la saisie, et c'est
 * délibéré : filtrer des mots reviendrait à lire les notes de la pro, ce qui
 * serait pire que le mal. On éduque l'usage, on ne surveille pas.
 */
export async function enregistrerNotes(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const id = champ(donnees, 'id')
  const notes = champ(donnees, 'technical_notes')
  if (typeof id !== 'string' || id === '') {
    return erreur(precedent, 'Fiche introuvable.', donnees)
  }

  await requirePro()
  const supabase = await supabaseServer()

  // On relit la ligne écrite plutôt que de supposer qu'elle l'a été : une mise
  // à jour qui ne touche aucune ligne n'est pas une erreur pour Postgres, et
  // la RLS peut parfaitement n'en toucher aucune.
  const { data: enregistre, error } = await supabase
    .from('clients')
    .update({ technical_notes: typeof notes === 'string' && notes !== '' ? notes : null })
    .eq('id', id)
    .select('technical_notes')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_notes_cliente_failed', error, donnees)
  if (!enregistre) {
    console.error('maj_notes_cliente_sans_effet')
    return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)
  }

  revalidatePath(`/app/clientes/${id}`)
  return ok(precedent, 'Notes enregistrées.', enregistre)
}

/**
 * B3 — la note d'un rendez-vous, distincte de la fiche.
 *
 * Ce qui vaut pour CE rendez-vous seulement. La distinction n'est pas
 * cosmétique : « elle avait les cheveux mouillés en arrivant » ne doit pas se
 * réafficher aux dix visites suivantes.
 */
export async function enregistrerNoteRdv(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const id = champ(donnees, 'id')
  const note = champ(donnees, 'note')
  if (typeof id !== 'string' || id === '') {
    return erreur(precedent, 'Rendez-vous introuvable.', donnees)
  }

  await requirePro()
  const supabase = await supabaseServer()
  const { data: enregistre, error } = await supabase
    .from('appointments')
    .update({ note: typeof note === 'string' && note !== '' ? note : null })
    .eq('id', id)
    .select('note')
    .maybeSingle()
  if (error) return erreurBase(precedent, 'maj_note_rdv_failed', error, donnees)
  if (!enregistre) {
    console.error('maj_note_rdv_sans_effet')
    return erreur(precedent, 'L’enregistrement n’a rien modifié. Réessaie.', donnees)
  }

  revalidatePath(`/app/agenda/${id}`)
  return ok(precedent, 'Note enregistrée.', enregistre)
}

/**
 * B2 niveau 2 — une entrée du JOURNAL technique.
 *
 * **Elle s'ajoute, elle n'écrase jamais.** C'est tout le correctif du 03/09 :
 * un champ unique perdait la formule de Noël d'il y a trois ans dès la visite
 * suivante, et faisait moins bien que le carnet papier qu'on prétend
 * remplacer. Un carnet garde toutes ses pages, et elles sont datées.
 *
 * La date est celle de la PRESTATION et non de la saisie : une pro qui clôture
 * le soir a fait le travail dans la journée.
 */
export async function ajouterAuJournal({
  proId,
  clientId,
  appointmentId,
  contenu,
  faitLe,
}: {
  proId: string
  clientId: string
  appointmentId?: string | null
  contenu: string
  faitLe?: Date
}): Promise<void> {
  const supabase = await supabaseServer()
  const { error } = await supabase.from('client_notes').insert({
    pro_id: proId,
    client_id: clientId,
    appointment_id: appointmentId ?? null,
    contenu,
    ...(faitLe ? { fait_le: faitLe.toISOString().slice(0, 10) } : {}),
  })
  if (error) console.error('journal_technique_failed', error.code)
}
