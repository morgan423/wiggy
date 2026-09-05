import {
  paymentTermsFor,
  cancellationNoticeFor,
  formatEuros,
  montantAcompte,
  type PaymentSettings,
} from '@wiggy/core'

/**
 * Conditions affichées à la cliente avant de réserver (S1).
 *
 * Rien n'est écrit en dur : le mode de paiement, le pourcentage d'acompte, le
 * délai d'annulation et le mode de confirmation viennent des réglages du pro.
 * C'est la correction du défaut d'origine, où « vous ne payez qu'après » et
 * « acompte de 30 % » cohabitaient sur la même page.
 *
 * Registre : vouvoiement chaleureux, on parle à la cliente finale.
 */
export function ConditionsReservation({
  reglages,
  prixCents,
  confirmationManuelle,
  prenomPro,
}: {
  reglages: PaymentSettings
  /** Prix de la prestation choisie, pour chiffrer l'acompte réellement dû. */
  prixCents?: number
  confirmationManuelle: boolean
  prenomPro: string
}) {
  const conditions = paymentTermsFor(reglages)
  const acompte =
    prixCents !== undefined && conditions.onlinePercent > 0 && conditions.onlinePercent < 100
      ? montantAcompte(prixCents, conditions.onlinePercent)
      : null

  return (
    <ul className="mt-6 space-y-3 text-texte-secondaire">
      <Ligne>
        {conditions.headline}
        {acompte !== null ? ` (soit ${formatEuros(acompte)})` : ''}
        {conditions.detail ? <span className="block">{conditions.detail}</span> : null}
      </Ligne>

      <Ligne>{cancellationNoticeFor(reglages)}</Ligne>

      {/*
        A11 : quand le pro valide lui-même ses rendez-vous, on ne promet pas
        une confirmation immédiate. La cliente doit savoir qu'elle envoie une
        demande, pas qu'elle réserve un créneau acquis.
      */}
      <Ligne>
        {confirmationManuelle
          ? `Votre demande est envoyée à ${prenomPro}, qui vous répond rapidement.`
          : 'Votre rendez-vous est confirmé immédiatement.'}
      </Ligne>
    </ul>
  )
}

function Ligne({ children }: { children: React.ReactNode }) {
  return (
    /*
      Une PUCE MIEL, pas une coche (planche 20a). La coche disait « c'est
      validé » d'une condition qui n'est ni acquise ni cochable — elle promettait
      là où la planche énumère.
    */
    <li className="flex gap-3">
      <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-pilule bg-celebration" />
      <span>{children}</span>
    </li>
  )
}
