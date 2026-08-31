/**
 * S1 — affichage des conditions de paiement côté cliente.
 *
 * Le bug d'origine : « Tu ne paies qu'après la prestation » et « Acompte de
 * 30 % à la réservation » affichés ensemble, l'un sous l'autre. Les deux
 * phrases décrivent des situations qui s'excluent.
 *
 * La règle est donc structurelle et pas cosmétique : ce module renvoie UNE
 * formulation, dérivée du réglage du pro (B9). Aucun écran ne compose de
 * phrase de paiement à la main.
 *
 * Registre : vouvoiement chaleureux — on s'adresse à la cliente finale (S6).
 */

export type PaymentMode = 'off' | 'client_choice' | 'required'

export type PaymentSettings = {
  mode: PaymentMode
  /** Réglage global du pro, en pourcentage du prix. 100 = la totalité. */
  defaultDepositPercent: number
  /** Surcharge éventuelle portée par la prestation choisie. */
  serviceDepositPercent?: number | null
  /** A10 — annulation gratuite jusqu'à N heures avant. */
  freeCancellationHours: number
}

export type PaymentTerms = {
  /** La phrase principale. Une seule, jamais deux. */
  headline: string
  /** Précision facultative, jamais contradictoire avec headline. */
  detail?: string
  /** Part réglée en ligne à la réservation, en % (0 = rien). */
  onlinePercent: number
  /** Le paiement en ligne conditionne-t-il la réservation ? */
  required: boolean
}

/** L'acompte de la prestation prime sur le réglage global du pro. */
export function depositPercentFor(settings: PaymentSettings): number {
  const percent = settings.serviceDepositPercent ?? settings.defaultDepositPercent
  return Math.min(100, Math.max(1, Math.round(percent)))
}

export function paymentTermsFor(settings: PaymentSettings): PaymentTerms {
  if (settings.mode === 'off') {
    return {
      headline: 'Vous ne payez qu’après la prestation',
      detail: 'Le règlement se fait directement auprès de votre coiffeur, le jour du rendez-vous.',
      onlinePercent: 0,
      required: false,
    }
  }

  const deposit = depositPercentFor(settings)
  const partial = deposit < 100

  if (settings.mode === 'required') {
    return partial
      ? {
          headline: `Acompte de ${deposit} % à la réservation, le reste sur place`,
          detail: 'L’acompte confirme votre rendez-vous.',
          onlinePercent: deposit,
          required: true,
        }
      : {
          headline: 'Règlement en ligne à la réservation',
          detail: 'Votre rendez-vous est confirmé dès le paiement.',
          onlinePercent: 100,
          required: true,
        }
  }

  // 'client_choice' — la cliente décide. On annonce le choix, pas une règle.
  return partial
    ? {
        headline: `Vous choisissez : acompte de ${deposit} % maintenant, ou tout régler le jour J`,
        onlinePercent: deposit,
        required: false,
      }
    : {
        headline: 'Vous choisissez : régler maintenant en ligne, ou le jour du rendez-vous',
        onlinePercent: 100,
        required: false,
      }
}

/** A10 — politique d'annulation affichée à côté des conditions de paiement. */
export function cancellationNoticeFor(settings: PaymentSettings): string {
  const { freeCancellationHours: hours } = settings
  if (hours <= 0) return 'Annulation possible à tout moment.'
  const delay =
    hours % 24 === 0 && hours >= 24
      ? `${hours / 24} ${hours === 24 ? 'jour' : 'jours'}`
      : `${hours} h`
  return `Annulation gratuite jusqu’à ${delay} avant le rendez-vous.`
}
