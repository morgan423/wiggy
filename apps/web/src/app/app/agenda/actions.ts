'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { RdvInput, BlocageInput } from '@wiggy/api'
import { heureLocaleVersInstant, finRendezVous, dureeReelle, ZONE } from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { requirePro } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { prevenirCliente } from '@/lib/messagerie/prevenance'
import { lancerJournee, jourDe, retenirDepartDuJour } from '@/lib/journee'
import { ajouterAuJournal } from '@/app/app/clientes/actions'
import { journaliser } from '@/lib/notifications'
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
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const { data: annule } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'pro' })
    .eq('id', id)
    .select('starts_at, service_name, clients(first_name)')
    .maybeSingle()

  /*
    B14 — l'annulation entre au journal QUELLE QU'EN SOIT L'ORIGINE.

    Aujourd'hui la seule origine possible est la pro elle-même : la cliente n'a
    pas encore de geste d'annulation (A10). L'entrée confirme donc son propre
    geste, ce qui a déjà une valeur sur la webapp du soir (D3) où l'on annule
    en série. Elle prendra tout son sens le jour où une cliente pourra annuler
    de son côté, et le code n'aura pas à changer pour ça.
  */
  if (annule) {
    await journaliser({
      proId: pro.id,
      kind: 'annulation',
      titre: `${prenomCliente(annule.clients)} a été annulée`,
      detail: `${annule.service_name} · ${quandCourt(annule.starts_at)}`,
      lien: '/app/agenda',
    })
  }
  revalidatePath('/app/agenda')
}

/** Le prénom d'une relation cliente, ou « Une cliente » si la fiche manque. */
function prenomCliente(relation: unknown): string {
  const brut: unknown = Array.isArray(relation) ? relation[0] : relation
  if (typeof brut !== 'object' || brut === null) return 'Une cliente'
  const c = brut as Record<string, unknown>
  return typeof c.first_name === 'string' ? c.first_name : 'Une cliente'
}

/** « mardi 9 à 14:30 » : de quoi reconnaître le rendez-vous sans l'ouvrir. */
function quandCourt(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: ZONE,
    weekday: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
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
  const { pro } = await requirePro()
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

  const { data: traite, error } = await supabase
    .from('appointments')
    .update(misAJour)
    .eq('id', id)
    .in('status', ['pending', 'conditional'])
    .select('starts_at, service_name, clients(first_name)')
    .maybeSingle()
  if (error) console.error('decision_demande_failed', error.code)

  // B14 — la demande TRAITÉE (A6 hors zone, A11 validation manuelle). Un fait
  // accompli, au passé : la décision est prise, il n'y a plus rien à faire.
  if (traite) {
    await journaliser({
      proId: pro.id,
      kind: 'demande_traitee',
      titre:
        decision === 'valider'
          ? `Demande de ${prenomCliente(traite.clients)} acceptée`
          : `Demande de ${prenomCliente(traite.clients)} refusée`,
      detail: `${traite.service_name} · ${quandCourt(traite.starts_at)}`,
      lien: '/app/agenda',
    })
  }

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

  const { pro } = await requirePro()
  const supabase = await supabaseServer()

  const { data: rdv } = await supabase
    .from('appointments')
    .select('starts_at, ends_at, client_id')
    .eq('id', id)
    .maybeSingle()
  if (!rdv) return

  const cloture = new Date()
  const debut = new Date(rdv.starts_at)
  const finPrevue = new Date(rdv.ends_at)

  /*
    D15 corrigée le 03/09 — **la durée réelle n'est jamais obligatoire et ne
    bloque jamais la clôture.** Une pro qui ferme sa journée à 22 h doit pouvoir
    le faire d'un tap. Un geste de clôture ne se refuse pas pour une donnée
    d'optimisation.

    Mais on ne retombe pas en silence sur la durée prévue pour autant : sans
    saisie et sans mesure crédible, **aucune mesure n'est enregistrée**. La
    colonne reste vide, et l'apprentissage ignore ce rendez-vous.

    Le motif est celui du rythme de retour, « rien avant trois visites » :
    retomber sur la prévision ferait que l'apprentissage se nourrirait de sa
    propre sortie et convergerait vers elle. Il afficherait de la confiance sans
    avoir rien appris. Mieux vaut ne rien savoir que croire savoir.

    L'agenda et l'affichage, eux, continuent d'utiliser la durée prévue : c'est
    seulement l'apprentissage qui s'abstient.
  */
  const saisie = champ(donnees, 'duree_min')
  const declaree = saisie === null ? null : Number.parseInt(saisie, 10)
  const valide = declaree !== null && Number.isFinite(declaree) && declaree > 0 && declaree <= 720

  // Une durée ÉCRITE par la pro est une instruction (B5), pas une observation.
  // On l'enregistre comme telle plutôt que de le deviner plus tard.
  const mesuree = valide ? null : dureeReelle(debut, cloture, finPrevue)
  const duree = valide ? declaree : mesuree

  const note = champ(donnees, 'note')
  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'done',
      completed_at: cloture.toISOString(),
      actual_duration_min: duree,
      duration_declared: valide,
      // B3 : la note du rendez-vous se pose dans le même geste que la clôture.
      // Le soir, c'est le seul moment où elle sera écrite.
      ...(note === null ? {} : { note }),
    })
    .eq('id', id)
  if (error) console.error('cloture_rdv_failed', error.code)

  /*
    B2 corrigé le 03/09 — « ce que tu as fait aujourd'hui » crée une ENTRÉE
    DATÉE dans le journal technique. Elle ne remplace rien.

    Le champ arrive pré-rempli de la dernière entrée, et c'est le sens qui a
    changé : il ne s'agit plus d'écraser en connaissance de cause, mais de
    REPARTIR de ce qui a été fait la dernière fois. On ne devrait jamais avoir à
    écraser une formule, même en le sachant.
  */
  const faitAujourdhui = champ(donnees, 'fait_aujourdhui')
  if (rdv.client_id && faitAujourdhui !== null) {
    await ajouterAuJournal({
      proId: pro.id,
      clientId: rdv.client_id,
      appointmentId: id,
      contenu: faitAujourdhui,
      // La date de la PRESTATION, pas celle de la saisie : une clôture du soir
      // porte sur le travail du jour, et une clôture de rattrapage sur le
      // travail de son jour à lui.
      faitLe: debut,
    })
  }

  revalidatePath('/app/agenda')
  revalidatePath('/app/tournee')
  revalidatePath(`/app/agenda/${id}`)

  // C2 et C7 se déclenchent sur une CLÔTURE RÉELLE, jamais sur le passage de
  // l'heure (D15) : c'est ici, et nulle part ailleurs. À la clôture, la pro est
  // encore chez la cliente, c'est le seul moment où le prochain rendez-vous se
  // cale sans friction, et la question suivante est déjà « où je vais
  // maintenant ». On la ramène donc sur la tournée du JOUR DU RENDEZ-VOUS,
  // plutôt que sur celle d'aujourd'hui : le rattrapage du soir clôture des
  // rendez-vous d'hier.
  redirect(`/app/tournee?le=${jourDe(debut)}&vient_de=${id}`)
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

/**
 * D15 — lancer la journée.
 *
 * Deux appelants, et les deux valent lancement : le bouton en tête de la
 * tournée, et l'ouverture du premier GPS (C3). La seconde est la plus honnête
 * des deux : personne n'ouvre un itinéraire sans partir.
 *
 * Lancer ne clôture rien. Ça dit que la pro est partie, pas que son travail est
 * fait.
 */
export async function commencerLaTournee(donnees: FormData) {
  const { pro } = await requirePro()
  const supabase = await supabaseServer()
  const jour = champ(donnees, 'jour')
  const quand = jour ? (heureLocaleVersInstant(`${jour}T12:00`) ?? new Date()) : new Date()

  /*
    D16 — la pro peut confirmer ou changer son point de départ au lancement,
    avec l'option « utiliser ma position actuelle ».

    ⚠️ Cette position sert au CALCUL et n'est JAMAIS écrite en base. Aucun
    historique de localisation de la pro, sous aucun prétexte. Elle vit dans un
    cookie de session, sur son appareil, pour la journée, et s'efface seule.
  */
  const lat = Number.parseFloat(champ(donnees, 'lat') ?? '')
  const lng = Number.parseFloat(champ(donnees, 'lng') ?? '')
  if (jour && Number.isFinite(lat) && Number.isFinite(lng)) {
    await retenirDepartDuJour({ jour, lat, lng })
  }

  await lancerJournee(supabase, pro.id, quand)
  revalidatePath('/app/tournee')
}
