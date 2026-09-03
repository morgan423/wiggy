'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { RdvInput, BlocageInput } from '@wiggy/api'
import { heureLocaleVersInstant, finRendezVous, dureeReelle } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { prevenirCliente } from '@/lib/messagerie/prevenance'
import { geocoder } from '@/lib/adresse'
import { centreDeCommune } from '@/lib/lieu-approche'
import { erreur, erreurBase, ok, champ, type EtatForm, champTexte } from '@/lib/forms'

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

/**
 * B6 — la clôture en un tap.
 *
 * Elle enregistre le temps RÉELLEMENT passé, et c'est tout l'intérêt : c'est
 * cette mesure qui affine les créneaux proposés ensuite (`dureeApprise`). Sans
 * elle, l'agenda reproduit indéfiniment les durées du catalogue, que personne
 * ne tient jamais tout à fait.
 *
 * La durée se mesure entre le début du rendez-vous et le tap. Une clôture
 * tardive (« j'ai oublié, je clos le lendemain ») retombe sur la durée prévue
 * plutôt que d'empoisonner l'apprentissage avec vingt heures.
 */
export async function terminerRdv(donnees: FormData) {
  const id = champ(donnees, 'id')
  if (typeof id !== 'string') return

  await requirePro()
  const supabase = await supabaseServer()

  const { data: rdv } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('id', id)
    .maybeSingle()
  if (!rdv) return

  const cloture = new Date()
  const prevue = Math.round(
    (new Date(rdv.ends_at).getTime() - new Date(rdv.starts_at).getTime()) / 60_000,
  )
  const reelle = dureeReelle(new Date(rdv.starts_at), cloture, prevue)

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'done',
      completed_at: cloture.toISOString(),
      actual_duration_min: reelle,
    })
    .eq('id', id)
  if (error) console.error('cloture_rdv_failed', error.code)

  revalidatePath('/app/agenda')
  revalidatePath('/app/tournee')
  revalidatePath(`/app/agenda/${id}`)

  // C2 et C7 : à la clôture, la pro est encore chez la cliente. C'est le seul
  // moment où le prochain rendez-vous se cale sans friction, et où la question
  // suivante est déjà « où je vais maintenant ». On la ramène donc sur la
  // tournée plutôt que de la laisser sur un écran qui vient de se vider.
  redirect(`/app/tournee?vient_de=${id}`)
}

/**
 * B4 — bloquer une plage.
 *
 * Le pilier de « l'app propose, le pro dispose », et l'outil qui remplace la
 * synchronisation d'agenda tant qu'elle n'existe pas (D2). Une plage bloquée
 * disparaît des créneaux proposés, exactement comme un congé.
 */
export async function bloquerPlage(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const saisie = BlocageInput.safeParse({
    debut: champ(donnees, 'debut'),
    fin: champ(donnees, 'fin'),
    label: champ(donnees, 'label'),
  })
  if (!saisie.success) {
    const faute = saisie.error.issues[0]
    return erreur(precedent, faute.message, donnees, String(faute.path[0] ?? ''))
  }

  // Le schéma a exigé deux chaînes non vides ; il ne peut pas savoir si
  // « 2026-13-45T99:00 » est une date. C'est le domaine qui le dit.
  const debut = heureLocaleVersInstant(saisie.data.debut)
  const fin = heureLocaleVersInstant(saisie.data.fin)
  if (!debut || !fin) {
    return erreur(precedent, copy.validation.$aEcrire.blocageDebut, donnees, 'debut')
  }

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('blocked_slots').insert({
    pro_id: pro.id,
    starts_at: debut.toISOString(),
    ends_at: fin.toISOString(),
    label: saisie.data.label,
  })
  if (error) return erreurBase(precedent, 'blocage_failed', error, donnees)

  revalidatePath('/app/agenda')
  return ok(precedent, copy.agendaTournee.$aEcrire.blocagePose)
}

/** Libérer une plage : le pro reprend la main aussi vite qu'il l'a donnée. */
export async function libererPlage(donnees: FormData) {
  const id = champ(donnees, 'id')
  if (typeof id !== 'string') return
  await requirePro()
  const supabase = await supabaseServer()
  const { error } = await supabase.from('blocked_slots').delete().eq('id', id)
  if (error) console.error('liberation_plage_failed', error.code)
  revalidatePath('/app/agenda')
}

/**
 * C5 — « Je suis en retard », prévisualisé puis validé.
 *
 * ⚠️ **Le message ne part JAMAIS tout seul.** L'écran le compose, la pro le
 * lit, et c'est ce geste-là qui l'envoie. C'est le principe non négociable n°1,
 * et il n'a pas d'exception : « aucun envoi automatique sans validation
 * explicite du pro ».
 *
 * G4 : le message **ouvre par la pro** (« c'est Sophie ») et **porte son
 * numéro**, parce qu'il appelle une réponse et qu'un sender ID alphanumérique
 * ne se répond pas.
 *
 * D14 : pendant la bêta il partira en e-mail. La cliente est prévenue, c'est
 * ce qui compte pour elle.
 */
export async function prevenirDuRetard(precedent: EtatForm, donnees: FormData): Promise<EtatForm> {
  const id = champ(donnees, 'id')
  const texte = champ(donnees, 'texte')
  if (typeof id !== 'string' || typeof texte !== 'string') {
    return erreur(precedent, 'Message introuvable.', donnees)
  }

  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: rdv } = await supabase
    .from('appointments')
    .select('id, clients(first_name, phone, email)')
    .eq('id', id)
    .maybeSingle()
  if (!rdv) return erreur(precedent, 'Rendez-vous introuvable.', donnees)

  const cliente = clienteJoignable(rdv.clients)
  if (!cliente.telephone && !cliente.email) {
    return erreur(precedent, copy.agendaTournee.$aEcrire.retardSansCoordonnee, donnees)
  }

  const envoi = await prevenirCliente({
    proId: pro.id,
    destinataire: cliente,
    sujet: copy.agendaTournee.$aEcrire.retardTitre,
    texte,
  })
  if (envoi.canal === 'aucun') {
    return erreur(precedent, copy.agendaTournee.$aEcrire.retardSansCoordonnee, donnees)
  }

  revalidatePath('/app/tournee')
  return ok(precedent, copy.agendaTournee.$aEcrire.retardParti)
}

/**
 * Les coordonnées d'une cliente, normalisées.
 *
 * PostgREST renvoie une relation imbriquée tantôt en objet, tantôt en tableau
 * selon la cardinalité qu'il détecte, et les types générés ne le disent pas.
 * On normalise ici, une fois, plutôt que de promener des `any` dans une route
 * qui envoie des messages.
 */
function clienteJoignable(relation: unknown): { telephone?: string; email?: string } {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return {}
  const c = brut as Record<string, unknown>
  return {
    telephone: typeof c.phone === 'string' ? c.phone : undefined,
    email: typeof c.email === 'string' ? c.email : undefined,
  }
}
