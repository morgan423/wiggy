'use server'

import { z } from 'zod'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { journaliser } from '@/lib/notifications'
import { champ } from '@/lib/forms'
import { quotaDisponible } from '@/lib/quota'

export type EtatAvis = { statut: 'vide' | 'merci' | 'erreur'; message?: string }

const Avis = z.object({
  token: z.uuid(),
  // ⚠️ Le PRÉNOM seul. Aucun champ de nom n'existe, ni ici ni en base.
  prenom: z.string().trim().min(1, 'Indiquez votre prénom.').max(40),
  note: z.coerce.number().int().min(1).max(5),
  texte: z.string().trim().max(600).optional(),
})

/**
 * A7 — dépôt d'un avis depuis la page de suivi.
 *
 * **Une prestation, un avis** : la contrainte d'unicité sur `appointment_id` le
 * garantit en base plutôt qu'ici, donc un double envoi ne crée pas de doublon
 * même si deux onglets partent en même temps.
 *
 * L'avis naît **en attente** : il n'apparaît sur la page publique qu'après un
 * geste de la pro. Publier d'office ferait de nous l'éditeur d'un texte que
 * personne n'a relu, sur la page d'une professionnelle.
 */
export async function deposerAvis(_precedent: EtatAvis, donnees: FormData): Promise<EtatAvis> {
  const saisie = Avis.safeParse({
    token: champ(donnees, 'token'),
    prenom: champ(donnees, 'prenom'),
    note: champ(donnees, 'note'),
    texte: champ(donnees, 'texte') ?? undefined,
  })
  if (!saisie.success) {
    return { statut: 'erreur', message: saisie.error.issues[0].message }
  }
  if (!supabaseConfigured()) return { statut: 'erreur', message: 'Service indisponible.' }
  if (!(await quotaDisponible('avis', 5, 3600))) {
    return { statut: 'erreur', message: 'Trop de tentatives. Réessayez plus tard.' }
  }

  const admin = supabaseAdmin()
  // Le jeton doit désigner un rendez-vous TERMINÉ : on ne donne pas son avis
  // sur une prestation qui n'a pas eu lieu.
  const { data: rdv } = await admin
    .from('appointments')
    .select('id, pro_id, status, service_name')
    .eq('public_token', saisie.data.token)
    .maybeSingle()
  if (rdv?.status !== 'done') {
    return { statut: 'erreur', message: 'Ce rendez-vous n’est pas encore terminé.' }
  }

  const { error } = await admin.from('avis').insert({
    pro_id: rdv.pro_id,
    appointment_id: rdv.id,
    prenom: saisie.data.prenom,
    note: saisie.data.note,
    texte: saisie.data.texte ?? null,
  })
  if (error) {
    // 23505 : la contrainte d'unicité. Un avis existe déjà pour ce rendez-vous,
    // et le dire vaut mieux qu'une erreur générique.
    if (error.code === '23505') {
      return { statut: 'erreur', message: 'Vous avez déjà donné votre avis pour ce rendez-vous.' }
    }
    console.error('avis_depot_failed', error.code)
    return { statut: 'erreur', message: 'Nous n’avons pas pu enregistrer votre avis.' }
  }

  await journaliser({
    proId: rdv.pro_id,
    kind: 'avis_recu',
    titre: `${saisie.data.prenom} a laissé un avis`,
    detail: `${String(saisie.data.note)}/5 · ${rdv.service_name}`,
    lien: '/app/parametrage/avis',
  })

  return { statut: 'merci' }
}
