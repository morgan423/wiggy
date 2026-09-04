'use server'

import { finRendezVous, ZONE, repartirEnEtages } from '@wiggy/core'
import { ReservationInput } from '@wiggy/api'
import { supabaseAdmin, supabaseConfigured } from '@/lib/supabase/admin'
import { modeDuPro } from '@/lib/mode'
import { quotaDisponible } from '@/lib/quota'
import { creneauxProposables } from '@/lib/creneaux'
import { rattacherPhotos } from '@/lib/photos'
import { champ } from '@/lib/forms'
import { journaliser } from '@/lib/notifications'
import { mesurerPro } from '@/lib/telemetrie'
import { aFaireAccepter, verifierEtEnregistrer } from '@/lib/legal'

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
 * B5 (recette du 31/08) : une erreur de validation ne vide jamais le
 * formulaire. La saisie repart avec la réponse, et le champ fautif est nommé
 * pour que le curseur s'y pose. Une cliente qui doit tout retaper referme
 * l'onglet.
 *
 * ⚠️ Point d'acceptation ② à venir (G1) : la case CGU + consentement SMS
 * s'ajoutera à ce formulaire, avec une ligne dans la table des acceptations.
 * Le parcours est écrit pour qu'elle s'y greffe sans refonte.
 */

export type EtatReservation =
  | { statut: 'vide' }
  | {
      statut: 'erreur'
      message: string
      /** Ce que la cliente venait de saisir : on ne le lui reprend jamais. */
      saisie: Record<string, string>
      /** Champ refusé, pour y poser le curseur. */
      champ?: string
    }
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

/**
 * Toute sortie en erreur repart avec la saisie. Passer par cette fabrique rend
 * l'oubli impossible : c'est l'oubli qui a coûté le bloquant B5.
 */
function refus(donnees: FormData, message: string, champFautif?: string): EtatReservation {
  const saisie: Record<string, string> = {}
  for (const [cle, valeur] of donnees.entries()) {
    if (typeof valeur === 'string') saisie[cle] = valeur
  }
  return { statut: 'erreur', message, saisie, champ: champFautif }
}

export async function reserver(
  _precedent: EtatReservation,
  donnees: FormData,
): Promise<EtatReservation> {
  const saisie = ReservationInput.safeParse({
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
    depotPhotos: champ(donnees, 'depotPhotos'),
    sejourDu: champ(donnees, 'sejourDu'),
    sejourAu: champ(donnees, 'sejourAu'),
  })
  if (!saisie.success) {
    const faute = saisie.error.issues[0]
    return refus(donnees, faute.message, String(faute.path[0] ?? ''))
  }
  if (!supabaseConfigured()) {
    return refus(donnees, 'Le service est momentanément indisponible.')
  }
  if (!(await quotaDisponible('reservation', 10, 900))) {
    return refus(donnees, 'Trop de tentatives. Patientez quelques minutes.')
  }

  const d = saisie.data
  const debut = new Date(d.debut)
  if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now()) {
    return refus(donnees, 'Ce créneau n’est plus disponible.')
  }

  // D10 ① : le mode d'exercice décide s'il y a une adresse à valider. Il se lit
  // AVANT la revalidation, parce qu'il en change le calcul.
  const modePro = await modeDuPro(supabaseAdmin(), d.proId)

  // Le schéma a laissé l'adresse facultative parce qu'il ignore le mode. C'est
  // ici qu'elle redevient obligatoire chez une pro qui se déplace : sans lieu,
  // le rendez-vous ne bloque aucun créneau et la tournée se calcule sur une
  // journée incomplète (R2-7 bis).
  if (modePro === 'itinerant' && (!d.adresse || !d.codePostal || !d.ville)) {
    return refus(donnees, 'Il manque votre adresse.')
  }

  // Revalidation : le créneau doit toujours figurer parmi les propositions.
  const proposition = await creneauxProposables({
    proId: d.proId,
    serviceId: d.serviceId,
    adresse: { ligne1: d.adresse ?? '', codePostal: d.codePostal ?? '', ville: d.ville ?? '' },
    modePro,
    accepterHorsZone: d.horsZone,
  })
  if (proposition.statut !== 'ok') {
    return refus(donnees, 'Ce créneau n’est plus disponible.')
  }
  const encoreLibre = proposition.jours.some((j) =>
    j.creneaux.some((c) => c.debut.getTime() === debut.getTime()),
  )
  if (!encoreLibre) {
    return refus(donnees, 'Ce créneau vient d’être pris. Choisissez-en un autre.')
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
  if (!service) return refus(donnees, 'Cette prestation n’existe plus.')

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

  /*
    G7 ② — les CGU et le consentement SMS.

    Contrôlés AVANT d'écrire quoi que ce soit : une fiche cliente créée puis
    abandonnée parce que la case manquait laisserait une donnée personnelle
    collectée sans base légale, ce qui est précisément l'inverse du but.
  */
  const aAccepter = await aFaireAccepter('reservation_cliente')
  const casesManquantes = aAccepter.some(
    ({ document }) =>
      document === null || donnees.get(`accepte:${document.slug}:${document.version}`) === null,
  )
  if (casesManquantes) {
    return refus(donnees, 'Merci d’accepter les conditions pour confirmer votre rendez-vous.')
  }

  const { data: cliente, error: erreurCliente } = await admin
    .from('clients')
    .insert({ pro_id: d.proId, first_name: d.prenom, phone: d.telephone, email: d.email })
    .select('id')
    .single()
  if (erreurCliente) {
    console.error('reservation_cliente_failed', erreurCliente.code)
    return refus(donnees, 'Nous n’avons pas pu enregistrer votre demande.')
  }

  /*
    La preuve, rattachée à la fiche cliente : une visiteuse n'a pas de compte,
    c'est sa fiche qui l'identifie. Chaque réservation redemande l'accord, et
    c'est la bonne lecture : c'est un contrat par rendez-vous, pas un
    abonnement.
  */
  const trace = await verifierEtEnregistrer('reservation_cliente', donnees, {
    clientId: cliente.id,
  })
  if (!trace.ok) return refus(donnees, trace.message)

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
      // D10 ① — en mode fixe, AUCUNE adresse cliente n'est enregistrée. Ce
      // n'est pas un oubli : sans déplacement, la collecter n'aurait aucune
      // finalité, et une donnée sans finalité ne se collecte pas.
      address_line1: proposition.adresse ? d.adresse : null,
      postal_code: proposition.adresse ? d.codePostal : null,
      city: proposition.adresse ? d.ville : null,
      // Sans coordonnées, un rendez-vous est invisible au calcul des trajets :
      // il ne bloquerait plus les créneaux qu'il doit bloquer, et la tournée
      // du jour l'ignorerait. Elles viennent du géocodage déjà validé. En mode
      // fixe il n'y a pas de trajet à calculer, donc rien à manquer.
      lat: proposition.adresse?.point.lat ?? null,
      lng: proposition.adresse?.point.lng ?? null,
      access_notes: d.acces,
      out_of_zone: horsZone,
      stay_from: d.sejourDu,
      stay_to: d.sejourAu,
    })
    .select('id, public_token')
    .single()
  if (error) {
    console.error('reservation_rdv_failed', error.code)
    return refus(donnees, 'Nous n’avons pas pu enregistrer votre demande.')
  }

  /*
    B14 — les deux événements que le tunnel produit, et qui n'étaient
    journalisés ni l'un ni l'autre.

    LA DISTINCTION EST CELLE DE LA PLANCHE 17a : un rendez-vous CONFIRMÉ est un
    fait accompli, l'agenda a changé et il n'y a rien à faire ; une demande en
    attente est un fait accompli lui aussi — elle est ARRIVÉE — mais la
    décision, elle, vit dans « À décider » et non dans la cloche. Le journal dit
    ce qui s'est passé, il ne redemande jamais d'agir.

    C'est aussi pour cela que le titre est au passé dans les deux cas.
  */
  const quand = new Intl.DateTimeFormat('fr-FR', {
    timeZone: ZONE,
    weekday: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(debut)
  await journaliser({
    proId: d.proId,
    kind: enAttente ? 'demande_a_valider' : 'nouveau_rdv',
    titre: enAttente
      ? `Nouvelle demande de ${d.prenom}`
      : `${d.prenom} a réservé ${service.name.toLowerCase()}`,
    detail: enAttente ? `${service.name} · ${quand}` : quand,
    lien: '/app/agenda',
  })

  /*
    E3 ① et ④ — la mesure qui calibrera A12, et le ratio en ligne / manuel.

    On enregistre le RANG et l'ÉTAGE, jamais l'heure ni le lieu : le rang suffit
    à savoir si le premier étage tape juste, et il ne dit rien de la cliente.
  */
  await mesurerPro('rdv_cree', d.proId, {
    source: 'online',
    hors_zone: horsZone,
    statut: statut,
  })

  /*
    E3 ① — l'étage et le rang du créneau choisi, la mesure qui CALIBRERA A12.

    Elle est recalculée depuis la revalidation qui vient d'avoir lieu, plutôt
    que transportée dans l'URL depuis l'écran des créneaux : une valeur qui
    voyage par l'URL est une valeur qu'on peut réécrire, et celle-ci sert à
    régler des pondérations. On mesure ce que le moteur dit, pas ce que le
    navigateur prétend.

    Rang et étage, jamais l'heure ni le lieu : le rang suffit à savoir si le
    premier étage tape juste, et il ne dit rien de la cliente.
  */
  /*
    E3 ⑤ — le délai entre l'inscription et la PREMIÈRE réservation, l'objectif
    des 48 heures de G3.

    Enregistré une seule fois, à la première : on compte les rendez-vous en
    ligne du compte, et on ne mesure que si celui-ci est le premier. Mesurer à
    chaque réservation donnerait un nuage de délais dont le premier serait
    noyé, alors que c'est lui, et lui seul, la métrique de conversion.
  */
  const { count: dejaEnLigne } = await admin
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('pro_id', d.proId)
    .eq('source', 'online')
  if ((dejaEnLigne ?? 0) === 1) {
    const { data: compte } = await admin
      .from('pros')
      .select('created_at')
      .eq('id', d.proId)
      .maybeSingle()
    if (compte?.created_at) {
      await mesurerPro('premiere_reservation', d.proId, {
        heures_depuis_inscription: Math.round(
          (Date.now() - new Date(compte.created_at).getTime()) / 3_600_000,
        ),
      })
    }
  }

  const tousLesCreneaux = proposition.jours.flatMap((j) => j.creneaux)
  const { recommandes, autres } = repartirEnEtages(tousLesCreneaux)
  const dansLePremier = recommandes.findIndex((c) => c.debut.getTime() === debut.getTime())
  const dansLeSecond = autres.findIndex((c) => c.debut.getTime() === debut.getTime())
  const choisi = tousLesCreneaux.find((c) => c.debut.getTime() === debut.getTime())
  await mesurerPro('creneau_choisi', d.proId, {
    etage: dansLePremier >= 0 ? 1 : 2,
    rang: dansLePremier >= 0 ? dansLePremier + 1 : dansLeSecond + 1,
    total_proposes: tousLesCreneaux.length,
    cout_marginal_min: choisi?.coutMarginalMin ?? 0,
    score: choisi?.score ?? 0,
  })

  // A4 : les photos ont déjà été déposées par le navigateur, sous un jeton.
  // On ne fait ici que les rattacher au rendez-vous qui vient de naître.
  const messagePhotos = await rattacherPhotos(d.depotPhotos, d.proId, rdv.id)

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
