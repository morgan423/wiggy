import { z } from 'zod'
import { parseEuros } from '@wiggy/core'

/**
 * Schémas de validation partagés par les trois surfaces.
 *
 * La même règle vaut pour un formulaire web, un écran mobile et une route
 * serveur : validée ici, elle ne peut pas diverger d'une surface à l'autre.
 * Les messages sont rédigés au tutoiement — ces saisies sont côté pro (S6).
 */

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/

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
    ctx.addIssue({ code: 'custom', message: 'Indique un prix, par exemple 42,50.' })
    return z.NEVER
  }
  return cents
})

/** B11 ① — une prestation. */
export const PrestationInput = z.object({
  name: z.string().trim().min(1, 'Donne un nom à ta prestation.').max(80),
  description: facultatif(z.string().trim().max(500).nullable()),
  price_cents: PrixSaisi,
  duration_min: z.coerce
    .number()
    .int()
    .min(5, 'Une prestation dure au moins 5 minutes.')
    .max(600, 'Au-delà de 10 heures, découpe la prestation.'),
  // B9 : acompte propre à la prestation, qui prime sur le réglage global.
  deposit_percent: facultatif(z.coerce.number().int().min(1).max(100).nullable()),
  active: z.boolean().default(true),
})

/** B11 ② — une commune d'intervention (méthode tranchée : liste de communes). */
export const CommuneInput = z.object({
  insee_code: z
    .string()
    .trim()
    .regex(/^[0-9AB]{5}$/i, 'Code INSEE invalide.'),
  name: z.string().trim().min(1).max(120),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/)
    .optional()
    .nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
})

/** B11 ③ — une plage de travail récurrente. 0 = lundi. */
export const HoraireInput = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    starts_at: z.string().regex(HEURE, 'Format attendu : 09:00.'),
    ends_at: z.string().regex(HEURE, 'Format attendu : 18:00.'),
  })
  .refine((h) => h.ends_at > h.starts_at, {
    message: 'La fin doit venir après le début.',
    path: ['ends_at'],
  })

/** B11 ④ — congés. Distincts du blocage ponctuel B4. */
export const CongeInput = z
  .object({
    starts_at: z.coerce.date(),
    ends_at: z.coerce.date(),
    label: z.string().trim().max(120).optional().nullable(),
  })
  .refine((c) => c.ends_at > c.starts_at, {
    message: 'La fin doit venir après le début.',
    path: ['ends_at'],
  })

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
  display_name: z.string().trim().min(1, 'Indique ton nom professionnel.').max(80),
  headline: facultatif(z.string().trim().max(120).nullable()),
  bio: facultatif(z.string().trim().max(1000).nullable()),
  city: facultatif(z.string().trim().max(120).nullable()),
  instagram_url: facultatif(z.url('Adresse Instagram invalide.').nullable()),
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
    service_name: z.string().trim().min(1, 'Indique la prestation.').max(80),
    price_cents: PrixSaisi,

    debut: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Choisis une date et une heure.'),
    duration_min: z.coerce
      .number()
      .int()
      .min(5, 'Un rendez-vous dure au moins 5 minutes.')
      .max(600),

    address_line1: facultatif(z.string().trim().max(200).nullable()),
    postal_code: facultatif(z.string().trim().max(10).nullable()),
    city: facultatif(z.string().trim().max(120).nullable()),
    access_notes: facultatif(z.string().trim().max(300).nullable()),
    note: facultatif(z.string().trim().max(1000).nullable()),
  })
  .refine((r) => Boolean(r.client_id) || Boolean(r.client_nom?.trim()), {
    message: 'Choisis une cliente existante ou saisis son nom.',
    path: ['client_nom'],
  })

export type RdvInput = z.infer<typeof RdvInput>
