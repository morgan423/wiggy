'use server'

import { revalidatePath } from 'next/cache'
import { copy, remplir } from '@wiggy/copy'
import { finRendezVous } from '@wiggy/core'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { journaliser } from '@/lib/notifications'
import { mesurerPro } from '@/lib/telemetrie'
import { erreur, ok, champ, type EtatForm } from '@/lib/forms'

/**
 * A11 ④ — la réponse de la cliente.
 *
 * **Le rendez-vous ne bouge qu'ici**, à son accord, et jamais avant. Une pro
 * qui modifie un rendez-vous sans l'accord de sa cliente lui impose un prix
 * qu'elle n'a pas choisi.
 *
 * ⚠️ **RÈGLE DE PAIEMENT, gravée dans `packages/core/src/proposition.ts`** :
 * quand B9 existera, c'est ICI que la capture se fera, sur le montant final, et
 * jamais à la demande. L'autorisation, elle, aura été prise à la demande.
 */
export async function repondreProposition(
  precedent: EtatForm,
  donnees: FormData,
): Promise<EtatForm> {
  const token = champ(donnees, 'token')
  const reponse = champ(donnees, 'reponse')
  if (!supabaseConfigured() || typeof token !== 'string') {
    return erreur(precedent, 'Proposition introuvable.', donnees)
  }
  const accepte = reponse === 'accepte'

  const admin = supabaseAdmin()
  const { data: proposition } = await admin
    .from('propositions')
    .select(
      'id, status, appointment_id, pro_id, service_id, service_name, price_cents, duration_min, created_at',
    )
    .eq('public_token', token)
    .maybeSingle()
  if (proposition?.status !== 'en_attente') {
    return erreur(precedent, copy.reservationCliente.$aEcrire.propositionClose, donnees)
  }

  const { error: erreurStatut } = await admin
    .from('propositions')
    .update({
      status: accepte ? 'acceptee' : 'refusee',
      responded_at: new Date().toISOString(),
    })
    .eq('id', proposition.id)
  if (erreurStatut) {
    console.error('reponse_proposition_failed', erreurStatut.code)
    return erreur(precedent, 'Nous n’avons pas pu enregistrer votre réponse.', donnees)
  }

  const { data: rdv } = await admin
    .from('appointments')
    .select('starts_at, ends_at, service_name, price_cents, client_id, clients(first_name)')
    .eq('id', proposition.appointment_id)
    .maybeSingle()

  if (accepte && rdv) {
    // Le rendez-vous prend les valeurs proposées, et seulement celles-là : on
    // ne change que ce qu'on change.
    const debut = new Date(rdv.starts_at)
    const dureeInitiale = Math.round((new Date(rdv.ends_at).getTime() - debut.getTime()) / 60_000)
    const duree = proposition.duration_min ?? dureeInitiale
    const { error } = await admin
      .from('appointments')
      .update({
        status: 'confirmed',
        service_id: proposition.service_id ?? undefined,
        service_name: proposition.service_name ?? rdv.service_name,
        price_cents: proposition.price_cents ?? rdv.price_cents,
        ends_at: finRendezVous(debut, duree).toISOString(),
      })
      .eq('id', proposition.appointment_id)
    if (error) console.error('acceptation_proposition_failed', error.code)
  }

  // B14 — le journal enregistre un FAIT ACCOMPLI, au passé, sans bouton.
  const cliente = prenomDe(rdv?.clients)
  await journaliser({
    proId: proposition.pro_id,
    kind: 'reponse_proposition',
    titre: remplir(
      accepte
        ? copy.notificationCopilote.$aEcrire.journalAcceptee
        : copy.notificationCopilote.$aEcrire.journalRefusee,
      { cliente },
    ),
    lien: `/app/agenda/${proposition.appointment_id}`,
  })

  /*
    E3 ⑥ — l'issue d'une contre-proposition, et le délai de réponse.

    C'est l'issue qui compte : une pro qui contre-propose souvent mais qu'on
    refuse toujours ne gagne rien à contre-proposer. Aucune identité, aucun
    créneau : une issue et des heures.
  */
  await mesurerPro('contre_proposition', proposition.pro_id, {
    issue: accepte ? 'acceptee' : 'refusee',
    delai_reponse_h: Math.round(
      (Date.now() - new Date(proposition.created_at).getTime()) / 3_600_000,
    ),
  })

  revalidatePath(`/proposition/${token}`)
  return ok(
    precedent,
    accepte
      ? copy.reservationCliente.$aEcrire.propositionAcceptee
      : copy.reservationCliente.$aEcrire.propositionDeclinee,
  )
}

/**
 * Le prénom de la cliente, normalisé.
 *
 * PostgREST renvoie une relation imbriquée tantôt en objet, tantôt en tableau
 * selon la cardinalité qu'il détecte, et les types générés ne le disent pas.
 */
function prenomDe(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Une cliente'
  const c = brut as Record<string, unknown>
  return typeof c.first_name === 'string' ? c.first_name : 'Une cliente'
}
