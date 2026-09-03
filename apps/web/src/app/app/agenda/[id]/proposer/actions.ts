'use server'

import { revalidatePath } from 'next/cache'
import { copy, remplir } from '@wiggy/copy'
import { parseEuros } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { prevenirCliente } from '@/lib/messagerie/prevenance'
import { erreur, erreurBase, ok, champ, type EtatForm } from '@/lib/forms'

/**
 * A11 ③ — la contre-proposition.
 *
 * Elle emprunte le patron généralisé (`propositions`), le même que le forfait
 * hors zone (A8) et que le report (A10). Trois mécaniques séparées, ce seraient
 * trois façons de dire non et trois endroits où oublier un cas.
 *
 * **Le rendez-vous ne bouge pas ici.** Il ne bougera qu'à l'acceptation de la
 * cliente, et c'est tout l'intérêt : une pro qui modifie un rendez-vous sans
 * l'accord de sa cliente lui impose un prix qu'elle n'a pas choisi.
 */
export async function contreProposer(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const id = champ(donnees, 'id')
  if (typeof id !== 'string') return erreur(precedent, 'Rendez-vous introuvable.', donnees)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: rdv } = await supabase
    .from('appointments')
    .select('id, service_name, price_cents, starts_at, ends_at, clients(first_name, phone, email)')
    .eq('id', id)
    .maybeSingle()
  if (!rdv) return erreur(precedent, 'Rendez-vous introuvable.', donnees)

  const prixSaisi = champ(donnees, 'prix')
  const prix = prixSaisi === null ? null : parseEuros(prixSaisi)
  if (prixSaisi !== null && prix === null) {
    return erreur(precedent, copy.validation.$aEcrire.prixInvalide, donnees, 'prix')
  }
  const dureeSaisie = champ(donnees, 'duree')
  const duree = dureeSaisie === null ? null : Number.parseInt(dureeSaisie, 10)
  if (dureeSaisie !== null && (!Number.isFinite(duree) || (duree ?? 0) <= 0)) {
    return erreur(precedent, 'Indique une durée en minutes.', donnees, 'duree')
  }

  // Une seule proposition en attente à la fois : deux propositions ouvertes, ce
  // sont deux réponses possibles et un rendez-vous dans deux états.
  await supabase
    .from('propositions')
    .update({ status: 'caduque' })
    .eq('appointment_id', id)
    .eq('status', 'en_attente')

  const { data: proposition, error } = await supabase
    .from('propositions')
    .insert({
      appointment_id: id,
      pro_id: pro.id,
      kind: 'contre_proposition',
      service_name: champ(donnees, 'service_name'),
      price_cents: prix,
      duration_min: duree,
      message: champ(donnees, 'message'),
    })
    .select('public_token')
    .single()
  if (error) return erreurBase(precedent, 'contre_proposition_failed', error, donnees)

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await prevenirCliente({
    proId: pro.id,
    destinataire: joignable(rdv.clients),
    sujet: remplir(copy.demandesPro.gabarits.propositionTitre, {
      pro: pro.display_name.split(' ')[0],
    }),
    texte: `${champ(donnees, 'message') ?? ''}\n${base}/proposition/${proposition.public_token}`,
  })

  revalidatePath(`/app/agenda/${id}`)
  return ok(precedent, copy.demandesPro.$aEcrire.propositionEnvoyee)
}

/**
 * Les coordonnées d'une cliente, normalisées.
 *
 * PostgREST renvoie une relation imbriquée tantôt en objet, tantôt en tableau
 * selon la cardinalité qu'il détecte, et les types générés ne le disent pas. On
 * normalise ici plutôt que de promener des `any` dans une route qui envoie des
 * messages.
 */
function joignable(relation: unknown): { telephone?: string; email?: string } {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return {}
  const c = brut as Record<string, unknown>
  return {
    telephone: typeof c.phone === 'string' ? c.phone : undefined,
    email: typeof c.email === 'string' ? c.email : undefined,
  }
}
