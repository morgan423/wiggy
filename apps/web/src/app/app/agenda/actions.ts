'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { RdvInput } from '@wiggy/api'
import { heureLocaleVersInstant, finRendezVous } from '@wiggy/core'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { geocoder } from '@/lib/adresse'
import { centreDeCommune } from '@/lib/lieu-approche'
import { erreur, erreurBase, type EtatForm, champTexte } from '@/lib/forms'

/**
 * B10 : ajout manuel d'un rendez-vous.
 *
 * L'adresse est géocodée avec la MÊME validation que la réservation en ligne.
 * Le piège est identique des deux côtés : la BAN place « rue des Lilas, Pau »
 * dans les Landes si on ne la contraint pas.
 *
 * Deux raisons de le faire ici aussi. La roadmap l'exige (les rendez-vous
 * manuels alimentent le moteur géo comme les autres), et sans coordonnées un
 * rendez-vous devient invisible au calcul des trajets : il ne bloquerait plus
 * les créneaux qu'il devrait bloquer.
 *
 * R2-7 bis : l'adresse est OBLIGATOIRE, mais jamais impossible. Une adresse
 * que le référentiel ignore est conservée telle quelle et rattachée au centre
 * de sa commune : le trajet devient approché, il ne disparaît plus. Le pro en
 * est averti, rien ne bloque.
 */

export async function creerRdv(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = RdvInput.safeParse(Object.fromEntries(donnees))
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const debut = heureLocaleVersInstant(saisie.data.debut)
  if (!debut) return erreur(precedent, 'Cette date n’est pas valide.', donnees)
  const fin = finRendezVous(debut, saisie.data.duration_min)

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { point, precision } = await localiser(saisie.data)

  // Nouvelle cliente saisie à la volée : on crée sa fiche au passage, elle
  // servira aux rendez-vous suivants comme à l'historique.
  let clientId = saisie.data.client_id
  if (!clientId && saisie.data.client_nom) {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        pro_id: pro.id,
        first_name: saisie.data.client_nom,
        phone: saisie.data.client_tel,
      })
      .select('id')
      .single()
    if (error) return erreurBase(precedent, 'creation_cliente_failed', error, donnees)
    clientId = data.id
  }

  const { error } = await supabase.from('appointments').insert({
    pro_id: pro.id,
    client_id: clientId,
    service_id: saisie.data.service_id,
    // Libellé et prix figés : l'historique ne bouge pas si la prestation est
    // renommée ou repricée plus tard.
    service_name: saisie.data.service_name,
    price_cents: saisie.data.price_cents,
    starts_at: debut.toISOString(),
    ends_at: fin.toISOString(),
    status: 'confirmed',
    source: 'manual',
    address_line1: saisie.data.address_line1,
    postal_code: saisie.data.postal_code,
    city: saisie.data.city,
    lat: point?.lat ?? null,
    lng: point?.lng ?? null,
    access_notes: saisie.data.access_notes,
    note: saisie.data.note,
  })
  if (error) return erreurBase(precedent, 'creation_rdv_failed', error, donnees)

  revalidatePath('/app/agenda')
  redirect(retour(precision))
}

/** Le pro doit savoir ce que l'app a su faire de son adresse, sans le chercher. */
const retour = (precision: Precision) =>
  precision === 'exacte' ? '/app/agenda' : `/app/agenda?adresse=${precision}`

export async function annulerRdv(donnees: FormData) {
  const id = champTexte(donnees, 'id')
  if (!id) return
  await requirePro()
  const supabase = await supabaseServer()
  await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'pro' })
    .eq('id', id)
  revalidatePath('/app/agenda')
}

/**
 * B10 — modification d'un rendez-vous existant.
 *
 * La roadmap accepte « déplacement par glisser OU édition » : c'est l'édition
 * qui est faite ici. Le glisser viendra avec la vue calendrier.
 */
export async function modifierRdv(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const id = champTexte(donnees, 'id')
  if (!id) return erreur(precedent, 'Rendez-vous introuvable.', donnees)

  const saisie = RdvInput.safeParse(Object.fromEntries(donnees))
  if (!saisie.success) return erreur(precedent, saisie.error.issues[0].message, donnees)

  const debut = heureLocaleVersInstant(saisie.data.debut)
  if (!debut) return erreur(precedent, 'Cette date n’est pas valide.', donnees)
  const fin = finRendezVous(debut, saisie.data.duration_min)

  await requirePro()
  const supabase = await supabaseServer()
  const { point, precision } = await localiser(saisie.data)

  // On ne touche ni à `source` ni à `client_id` : un rendez-vous pris en ligne
  // reste un rendez-vous pris en ligne, et on ne réattribue pas une cliente
  // par mégarde depuis l'écran d'édition.
  const { error } = await supabase
    .from('appointments')
    .update({
      service_id: saisie.data.service_id,
      service_name: saisie.data.service_name,
      price_cents: saisie.data.price_cents,
      starts_at: debut.toISOString(),
      ends_at: fin.toISOString(),
      address_line1: saisie.data.address_line1,
      postal_code: saisie.data.postal_code,
      city: saisie.data.city,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
      access_notes: saisie.data.access_notes,
      note: saisie.data.note,
    })
    .eq('id', id)
  if (error) return erreurBase(precedent, 'modification_rdv_failed', error, donnees)

  revalidatePath('/app/agenda')
  redirect(retour(precision))
}

/** Ce qu'on a su faire de l'adresse saisie. */
type Precision = 'exacte' | 'commune' | 'inconnue'

/**
 * Situe un rendez-vous manuel, avec le degré de certitude atteint.
 *
 * Trois issues, dans l'ordre de préférence :
 *   `exacte`   le référentiel d'adresses a reconnu la saisie ;
 *   `commune`  il ne l'a pas reconnue, on retient le centre de la commune ;
 *   `inconnue` même la commune est introuvable. Rare, et jamais bloquant.
 *
 * Le refus de géocodage est journalisé dans le moniteur, ce qui permet de voir
 * si la validation est trop stricte côté pro comme côté cliente.
 */
async function localiser(saisie: {
  address_line1: string
  postal_code: string
  city: string
}): Promise<{ point: { lat: number; lng: number } | null; precision: Precision }> {
  const resultat = await geocoder(
    { ligne1: saisie.address_line1, codePostal: saisie.postal_code, ville: saisie.city },
    'rdv_manuel',
  )
  if (resultat.trouve) return { point: resultat.trouve.point, precision: 'exacte' }

  const approche = await centreDeCommune(saisie.postal_code, saisie.city)
  if (approche) return { point: approche.point, precision: 'commune' }

  return { point: null, precision: 'inconnue' }
}

/**
 * A6 / A11 — le pro tranche une demande.
 *
 * Le board montre la décision « en un tap depuis la notification ». Les
 * notifications sont C1/C2 : en attendant, les deux boutons vivent dans
 * l'agenda, avec les mêmes mots et le même effet.
 *
 * Aucun SMS n'est envoyé ici. Principe non négociable n°1 : rien ne part sans
 * validation explicite du pro, et le modèle SMS (B7) n'est pas construit. La
 * cliente voit la réponse sur son lien de suivi ; l'écran le rappelle au pro.
 */
export async function validerDemande(donnees: FormData) {
  await deciderDemande(donnees, 'valider')
}

export async function refuserDemande(donnees: FormData) {
  await deciderDemande(donnees, 'refuser')
}

async function deciderDemande(donnees: FormData, decision: 'valider' | 'refuser') {
  const id = champTexte(donnees, 'id')
  if (!id) return
  await requirePro()
  const supabase = await supabaseServer()

  // La RLS borne déjà à ce compte ; le filtre sur le statut évite qu'un double
  // clic ne rouvre un rendez-vous déjà annulé ou déjà terminé.
  const misAJour =
    decision === 'valider'
      ? { status: 'confirmed' as const }
      : {
          status: 'cancelled' as const,
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'pro',
        }

  const { error } = await supabase
    .from('appointments')
    .update(misAJour)
    .eq('id', id)
    .in('status', ['pending', 'conditional'])
  if (error) console.error('decision_demande_failed', error.code)

  revalidatePath('/app/agenda')
}
