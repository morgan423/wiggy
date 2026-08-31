'use server'

import { z } from 'zod'
import {
  finRendezVous,
  validerPhotos,
  extensionPhoto,
  can,
  type SubscriptionState,
} from '@wiggy/core'
import { copy } from '@wiggy/copy'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { quotaDisponible } from '@/lib/quota'
import { creneauxProposables } from '@/lib/creneaux'
import { champ } from '@/lib/forms'

/**
 * A3 : création du rendez-vous demandé par la cliente.
 *
 * Le créneau choisi est **revalidé côté serveur** avant écriture : entre
 * l'affichage de la page et la validation du formulaire, le pro a pu recevoir
 * un autre rendez-vous. Faire confiance au créneau posté, c'est accepter deux
 * clientes sur le même horaire.
 *
 * L'écriture passe par le service role : `appointments` n'a aucune politique
 * pour le rôle anonyme, et c'est délibéré (même principe que la liste
 * d'attente). Toute la validation se fait ici.
 *
 * A6 : une demande hors zone naît « sous réserve de validation » (statut
 * `conditional`). Elle n'est pas refusée et elle n'est pas confirmée : le pro
 * tranche. A5 lui joint les dates du séjour, sans quoi il ne comprendrait pas
 * pourquoi une cliente de Bordeaux réserve à Pau.
 *
 * ⚠️ Point d'acceptation ② à venir (G1) : la case CGU + consentement SMS
 * s'ajoutera à ce formulaire, avec une ligne dans la table des acceptations.
 * Le parcours est écrit pour qu'elle s'y greffe sans refonte.
 */

/** Une date de séjour, ou rien. Un formulaire vide envoie la chaîne vide. */
const DateSejour = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
)

const C = copy.reservationCliente

/** A4 : le seau est privé, sans politique. Tout passe par le service role. */
const SEAU = 'appointment-photos'

const Reservation = z.object({
  proId: z.uuid(),
  serviceId: z.uuid(),
  debut: z.string().min(1),
  prenom: z.string().trim().min(1, 'Indiquez votre prénom.').max(80),
  telephone: z
    .string()
    .trim()
    .regex(/^(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/, 'Ce numéro de téléphone semble incomplet.'),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()).optional().nullable(),
  adresse: z.string().trim().min(1),
  codePostal: z
    .string()
    .trim()
    .regex(/^\d{5}$/),
  ville: z.string().trim().min(1),
  acces: z.string().trim().max(300).optional().nullable(),
  // A6 : la cliente a vu l'avertissement hors zone et demande quand même.
  horsZone: z.preprocess((v) => v === '1' || v === 'on' || v === true, z.boolean()),
  // A5 : bornes du séjour.
  sejourDu: DateSejour,
  sejourAu: DateSejour,
})

export type EtatReservation =
  | { statut: 'vide' }
  | { statut: 'erreur'; message: string }
  | {
      statut: 'confirme'
      quand: string
      /** A11 confirmation manuelle, ou A6 hors zone : le pro doit répondre. */
      enAttente: boolean
      /** A6 : la demande sort de la zone déclarée. */
      horsZone: boolean
      prenom: string
      /** Lien de suivi : le seul moyen, sans compte, de revenir voir la réponse. */
      suivi: string
      /** A4 : la réservation a réussi, les photos non. On le dit sans alarmer. */
      photosRefusees?: string
    }

export async function reserver(
  _precedent: EtatReservation,
  donnees: FormData,
): Promise<EtatReservation> {
  const saisie = Reservation.safeParse({
    proId: champ(donnees, 'proId'),
    serviceId: champ(donnees, 'serviceId'),
    debut: champ(donnees, 'debut'),
    prenom: champ(donnees, 'prenom'),
    telephone: champ(donnees, 'telephone'),
    email: champ(donnees, 'email'),
    adresse: champ(donnees, 'adresse'),
    codePostal: champ(donnees, 'codePostal'),
    ville: champ(donnees, 'ville'),
    acces: champ(donnees, 'acces'),
    horsZone: donnees.get('horsZone'),
    sejourDu: champ(donnees, 'sejourDu'),
    sejourAu: champ(donnees, 'sejourAu'),
  })
  if (!saisie.success) {
    return { statut: 'erreur', message: saisie.error.issues[0].message }
  }
  if (!supabaseConfigured()) {
    return { statut: 'erreur', message: 'Le service est momentanément indisponible.' }
  }
  if (!(await quotaDisponible('reservation', 10, 900))) {
    return { statut: 'erreur', message: 'Trop de tentatives. Patientez quelques minutes.' }
  }

  const d = saisie.data
  const debut = new Date(d.debut)
  if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now()) {
    return { statut: 'erreur', message: 'Ce créneau n’est plus disponible.' }
  }

  // Revalidation : le créneau doit toujours figurer parmi les propositions.
  const proposition = await creneauxProposables({
    proId: d.proId,
    serviceId: d.serviceId,
    adresse: { ligne1: d.adresse, codePostal: d.codePostal, ville: d.ville },
    accepterHorsZone: d.horsZone,
  })
  if (proposition.statut !== 'ok') {
    return { statut: 'erreur', message: 'Ce créneau n’est plus disponible.' }
  }
  const encoreLibre = proposition.jours.some((j) =>
    j.creneaux.some((c) => c.debut.getTime() === debut.getTime()),
  )
  if (!encoreLibre) {
    return { statut: 'erreur', message: 'Ce créneau vient d’être pris. Choisissez-en un autre.' }
  }

  const admin = supabaseAdmin()
  const [{ data: service }, { data: reglages }] = await Promise.all([
    admin
      .from('services')
      .select('name, price_cents, duration_min')
      .eq('id', d.serviceId)
      .maybeSingle(),
    admin
      .from('pro_settings')
      .select('booking_confirmation_mode, new_client_buffer_min')
      .eq('pro_id', d.proId)
      .maybeSingle(),
  ])
  if (!service) return { statut: 'erreur', message: 'Cette prestation n’existe plus.' }

  const duree = service.duration_min + (reglages?.new_client_buffer_min ?? 0)

  // Deux raisons de naître en attente, et une seule décision à prendre par le
  // pro dans les deux cas :
  //   A11 — le pro a choisi de valider lui-même chaque demande ;
  //   A6  — la demande sort de sa zone, il tranche au cas par cas.
  // Le hors-zone prime : c'est le statut qui porte l'information au pro.
  const horsZone = proposition.horsZone
  const manuel = reglages?.booking_confirmation_mode === 'manual'
  const statut = horsZone ? 'conditional' : manuel ? 'pending' : 'confirmed'
  const enAttente = statut !== 'confirmed'

  const { data: cliente, error: erreurCliente } = await admin
    .from('clients')
    .insert({ pro_id: d.proId, first_name: d.prenom, phone: d.telephone, email: d.email })
    .select('id')
    .single()
  if (erreurCliente) {
    console.error('reservation_cliente_failed', erreurCliente.code)
    return { statut: 'erreur', message: 'Nous n’avons pas pu enregistrer votre demande.' }
  }

  const { data: rdv, error } = await admin
    .from('appointments')
    .insert({
      pro_id: d.proId,
      client_id: cliente.id,
      service_id: d.serviceId,
      service_name: service.name,
      price_cents: service.price_cents,
      starts_at: debut.toISOString(),
      ends_at: finRendezVous(debut, duree).toISOString(),
      status: statut,
      source: 'online',
      address_line1: d.adresse,
      postal_code: d.codePostal,
      city: d.ville,
      // Sans coordonnées, un rendez-vous est invisible au calcul des trajets :
      // il ne bloquerait plus les créneaux qu'il doit bloquer, et la tournée
      // du jour l'ignorerait. Elles viennent du géocodage déjà validé.
      lat: proposition.adresse.point.lat,
      lng: proposition.adresse.point.lng,
      access_notes: d.acces,
      out_of_zone: horsZone,
      stay_from: d.sejourDu,
      stay_to: d.sejourAu,
    })
    .select('id, public_token')
    .single()
  if (error) {
    console.error('reservation_rdv_failed', error.code)
    return { statut: 'erreur', message: 'Nous n’avons pas pu enregistrer votre demande.' }
  }

  const messagePhotos = await enregistrerPhotos(rdv.id, d.proId, donnees)

  return {
    statut: 'confirme',
    quand: debut.toISOString(),
    enAttente,
    horsZone,
    prenom: d.prenom,
    suivi: `/demande/${rdv.public_token}`,
    photosRefusees: messagePhotos,
  }
}

/**
 * A4 : dépôt des photos jointes à la demande.
 *
 * Elles arrivent après la création du rendez-vous, jamais avant : sans
 * identifiant de rendez-vous, un fichier déposé serait un orphelin qu'aucune
 * purge ne saurait rattacher.
 *
 * Un échec ici ne défait pas la réservation. Perdre une photo est ennuyeux ;
 * perdre le rendez-vous parce qu'une photo n'est pas passée serait absurde. La
 * cliente en est informée, le pro la relancera s'il en a besoin.
 */
async function enregistrerPhotos(
  rdvId: string,
  proId: string,
  donnees: FormData,
): Promise<string | undefined> {
  const lots = [
    { kind: 'current' as const, fichiers: fichiersDe(donnees, 'photosActuelles') },
    { kind: 'inspiration' as const, fichiers: fichiersDe(donnees, 'photosInspirations') },
  ]
  const toutes = lots.flatMap((l) => l.fichiers)
  if (toutes.length === 0) return undefined

  const validation = validerPhotos(toutes)
  if (!validation.ok) {
    return {
      'trop-nombreuses': C.$aEcrire.photosTropNombreuses,
      'trop-lourde': C.$aEcrire.photosTropLourde,
      format: C.$aEcrire.photosFormat,
    }[validation.raison]
  }

  const admin = supabaseAdmin()
  // Le palier est déjà connu du moteur de créneaux ; on le relit ici parce que
  // le gating se vérifie au point d'écriture, pas sur la foi d'un écran.
  const { data: abonnement } = await admin
    .from('subscriptions')
    .select('tier, status')
    .eq('pro_id', proId)
    .maybeSingle()
  const etat: SubscriptionState = abonnement
    ? { tier: abonnement.tier, status: abonnement.status }
    : { tier: 'tier_1', status: 'canceled' }
  if (!can(etat, 'booking_photos')) return undefined

  let rang = 0
  for (const lot of lots) {
    for (const fichier of lot.fichiers) {
      if (fichier.size === 0) continue
      // Le chemin porte le pro puis le rendez-vous : une purge de compte (G5)
      // se fait par préfixe, sans avoir à lister les fichiers un par un.
      const chemin = `${proId}/${rdvId}/${rang++}.${extensionPhoto(fichier.type)}`
      const { error } = await admin.storage
        .from(SEAU)
        .upload(chemin, fichier, { contentType: fichier.type, upsert: false })
      if (error) {
        console.error('photo_envoi_failed', error.name)
        continue
      }
      const { error: erreurLigne } = await admin
        .from('appointment_photos')
        .insert({ appointment_id: rdvId, storage_path: chemin, kind: lot.kind })
      if (erreurLigne) console.error('photo_ligne_failed', erreurLigne.code)
    }
  }
  return undefined
}

/** Les fichiers d'un champ, sans les entrées vides d'un champ non rempli. */
function fichiersDe(donnees: FormData, nom: string): File[] {
  return donnees.getAll(nom).filter((v): v is File => v instanceof File && v.size > 0)
}
