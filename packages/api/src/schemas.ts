import { z } from 'zod'
import { parseEuros } from '@wiggy/core'
import { V } from './messages.ts'

/**
 * Schémas de validation partagés par les trois surfaces.
 *
 * La même règle vaut pour un formulaire web, un écran mobile et une route
 * serveur : validée ici, elle ne peut pas diverger d'une surface à l'autre.
 * Les messages sont rédigés au tutoiement — ces saisies sont côté pro (S6).
 */

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Une date « AAAA-MM-JJ », ou rien. Un formulaire vide envoie la chaîne vide. */
const DateSimple = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, V.date)
    .nullable(),
)

/**
 * Un formulaire HTML envoie une chaîne vide pour un champ non rempli, jamais
 * `null` ni `undefined`. Sans cette conversion, `z.uuid().optional()` refuse
 * « » avec « Invalid UUID » et le formulaire devient impossible à valider.
 * Le piège est identique côté mobile : il se corrige donc ici, une fois.
 */
const facultatif = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === undefined ? null : v), schema)

/** Montant saisi au clavier → centimes. Refuse ce qui n'est pas un montant. */
export const PrixSaisi = z.string().transform((valeur, ctx) => {
  const cents = parseEuros(valeur)
  if (cents === null) {
    ctx.addIssue({ code: 'custom', message: V.prixInvalide })
    return z.NEVER
  }
  return cents
})

/**
 * B9 — acompte en pourcentage, facultatif.
 *
 * `0` vaut « pas d'acompte », exactement comme un champ vide. Sans ce repli,
 * la valeur zéro traversait `facultatif` et heurtait le `min(1)` : la pro
 * lisait « Too small: expected number to be >=1 » et devait vider le champ
 * pour enregistrer (recette du 31/08, bloquant B3).
 */
const PourcentageFacultatif = z.preprocess(
  (v) => (v === '' || v === undefined || v === null || v === 0 || v === '0' ? null : v),
  z.coerce.number().int().min(1, V.acompte).max(100, V.acompte).nullable(),
)

/** B11 ① — une prestation. */
export const PrestationInput = z.object({
  name: z.string().trim().min(1, V.proPrestationNom).max(80),
  description: facultatif(z.string().trim().max(500).nullable()),
  price_cents: PrixSaisi,
  duration_min: z.coerce
    .number()
    .int()
    .min(5, V.proPrestationDureeMin)
    .max(600, V.proPrestationDureeMax),
  // B9 : acompte propre à la prestation, qui prime sur le réglage global.
  deposit_percent: PourcentageFacultatif,
  active: z.boolean().default(true),
})

/** B11 ② — une commune d'intervention (méthode tranchée : liste de communes). */
export const CommuneInput = z.object({
  insee_code: z
    .string()
    .trim()
    .regex(/^[0-9AB]{5}$/i, V.commune),
  name: z.string().trim().min(1).max(120),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, V.codePostal)
    .optional()
    .nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
})

/** B11 ③ — une plage de travail récurrente. 0 = lundi. */
export const HoraireInput = z
  .object({
    // Le vide ne doit surtout pas devenir lundi. `z.coerce.number()` transforme
    // la chaîne vide en 0, et l'option neutre de la liste déroulante (R3-1)
    // rend ce piège atteignable en un clic : sans ce garde, ne rien choisir
    // poserait une plage le lundi.
    weekday: z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? Number.NaN : v),
      z.coerce
        .number(V.proJourRequis)
        .int(V.proJourRequis)
        .min(0, V.proJourRequis)
        .max(6, V.proJourRequis),
    ),
    starts_at: z.string().regex(HEURE, V.proHeureRequise),
    ends_at: z.string().regex(HEURE, V.proHeureRequise),
  })
  .refine((h) => h.ends_at > h.starts_at, { message: V.finAvantDebut, path: ['ends_at'] })

/** B11 ④ — congés. Distincts du blocage ponctuel B4. */
export const CongeInput = z
  .object({
    starts_at: z.coerce.date(V.proDateRequise),
    ends_at: z.coerce.date(V.proDateRequise),
    label: z.string().trim().max(120).optional().nullable(),
  })
  .refine((c) => c.ends_at > c.starts_at, { message: V.finAvantDebut, path: ['ends_at'] })

/** Réglages d'activité (B9 paiement, A10 annulation, A11 confirmation, B7 SMS). */
export const ReglagesInput = z.object({
  payment_mode: z.enum(['off', 'client_choice', 'required']),
  default_deposit_percent: z.coerce.number().int().min(1).max(100),
  booking_confirmation_mode: z.enum(['auto', 'manual']),
  free_cancellation_hours: z.coerce.number().int().min(0).max(168),
  new_client_buffer_min: z.coerce.number().int().min(0).max(120),
  sms_enabled: z.boolean(),
  gps_app: z.enum(['system', 'waze', 'google_maps']),
})

/** Identité publique du pro (A1). Le slug porte l'URL partageable. */
export const ProfilInput = z.object({
  display_name: z.string().trim().min(1, V.proNomProfessionnel).max(80),
  headline: facultatif(z.string().trim().max(120).nullable()),
  bio: facultatif(z.string().trim().max(1000).nullable()),
  city: facultatif(z.string().trim().max(120).nullable()),
  instagram_url: facultatif(z.url(V.url).nullable()),
  phone: facultatif(z.string().trim().max(20).nullable()),
  years_experience: facultatif(z.coerce.number().int().min(0).max(70).nullable()),
  // Comment les clientes parlent du pro. Facultatif à dessein : sans réponse,
  // les textes de la page publique basculent sur une formulation sans pronom,
  // plutôt que de supposer « elle » pour tout le monde.
  pronoun: facultatif(z.enum(['elle', 'il']).nullable()),
})

export type PrestationInput = z.infer<typeof PrestationInput>
export type CommuneInput = z.infer<typeof CommuneInput>
export type HoraireInput = z.infer<typeof HoraireInput>
export type CongeInput = z.infer<typeof CongeInput>
export type ReglagesInput = z.infer<typeof ReglagesInput>
export type ProfilInput = z.infer<typeof ProfilInput>

/**
 * B10 — création manuelle d'un rendez-vous.
 *
 * La majorité des RDV arrive aujourd'hui par téléphone, SMS ou Instagram : le
 * pro doit pouvoir les entrer sans passer par la réservation en ligne. Ces
 * RDV manuels alimentent le moteur géo exactement comme les RDV en ligne.
 *
 * `debut` est une heure murale française (« 2026-09-01T14:00 »), convertie en
 * instant absolu par le domaine — jamais par l'écran.
 */
export const RdvInput = z
  .object({
    // Cliente existante…
    client_id: facultatif(z.uuid().nullable()),
    // …ou nouvelle, créée à la volée depuis l'agenda.
    client_nom: facultatif(z.string().trim().max(80).nullable()),
    client_tel: facultatif(z.string().trim().max(20).nullable()),

    service_id: facultatif(z.uuid().nullable()),
    service_name: z.string().trim().min(1, V.proRdvPrestation).max(80),
    price_cents: PrixSaisi,

    debut: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, V.dateHeure),
    duration_min: z.coerce.number().int().min(5, V.proRdvDureeMin).max(600),

    // R2-7 bis : l'adresse est OBLIGATOIRE. Un rendez-vous sans lieu n'a pas de
    // coordonnées, donc pas de trajet : le moteur de créneaux le traverse sans
    // aucune contrainte, et la tournée se calcule sur une journée incomplète.
    // La roadmap promet que les rendez-vous manuels alimentent le moteur géo
    // « exactement comme » les rendez-vous en ligne : cette contrainte est la
    // condition de vérité de cette phrase, pas un durcissement gratuit.
    //
    // Obligatoire ne veut pas dire reconnue : une adresse que le référentiel
    // ignore (hameau, lieu-dit, construction récente) est conservée telle
    // quelle et rattachée au point connu le plus proche. Voir `localiser()`.
    address_line1: z.string().trim().min(1, V.proAdresseRequise).max(200),
    postal_code: z
      .string()
      .trim()
      .regex(/^\d{5}$/, V.proCodePostalRequis),
    city: z.string().trim().min(1, V.proVilleRequise).max(120),
    access_notes: facultatif(z.string().trim().max(300).nullable()),
    note: facultatif(z.string().trim().max(1000).nullable()),
  })
  .refine((r) => Boolean(r.client_id) || Boolean(r.client_nom?.trim()), {
    message: V.proRdvCliente,
    path: ['client_nom'],
  })

export type RdvInput = z.infer<typeof RdvInput>

/**
 * A3 — la demande de rendez-vous déposée par la cliente.
 *
 * Elle vit ici, avec les autres, et non dans l'action : c'est la seule saisie
 * du produit faite par quelqu'un qui n'a pas de compte, donc la plus exposée,
 * et elle doit bénéficier du même filet de messages français que le reste.
 */
export const ReservationInput = z.object({
  proId: z.uuid(),
  serviceId: z.uuid(),
  debut: z.string().min(1),
  prenom: z.string().trim().min(1, V.prenomRequis).max(80),
  telephone: z
    .string()
    .trim()
    .regex(/^(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/, V.telephone),
  email: facultatif(z.string().trim().toLowerCase().max(200).pipe(z.email(V.email)).nullable()),
  // D10 ① — l'adresse est facultative ICI, et seulement ici, parce que le
  // schéma ne connaît pas le mode d'exercice de la pro. En mode fixe il n'y a
  // pas d'adresse cliente à collecter ; en itinérant elle reste obligatoire, et
  // c'est la route serveur qui l'exige, après avoir lu le mode. La garantie ne
  // se relâche pas, elle change de gardien.
  adresse: facultatif(z.string().trim().min(1).nullable()),
  codePostal: facultatif(
    z
      .string()
      .trim()
      .regex(/^\d{5}$/, V.codePostal)
      .nullable(),
  ),
  ville: facultatif(z.string().trim().min(1).nullable()),
  acces: facultatif(z.string().trim().max(300).nullable()),
  // A6 : la cliente a vu l'avertissement hors zone et demande quand même.
  horsZone: z.preprocess((v) => v === '1' || v === 'on' || v === true, z.boolean()),
  // A5 : bornes du séjour, quand la cliente n'habite pas à cette adresse.
  sejourDu: DateSimple,
  sejourAu: DateSimple,
  // A4 : jeton du dépôt temporaire des photos, rattaché après création.
  depotPhotos: facultatif(z.uuid().nullable()),
})

export type ReservationInput = z.infer<typeof ReservationInput>
