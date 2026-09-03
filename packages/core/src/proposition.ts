/**
 * A11, A8, A10 — la proposition en attente de réponse.
 *
 * **Le motif de généralisation, et il vaut d'être écrit.** Le patron « sous
 * réserve » existait déjà dans les deux sens : le supplément de zone (A8) fait
 * une proposition que la cliente confirme, et le report (A10) en fera une
 * autre. La contre-proposition d'A11 est la troisième. Trois mécaniques
 * séparées, ce sont trois façons de dire non, trois liens à sécuriser et trois
 * endroits où oublier un cas.
 *
 * Ce qui change d'un cas à l'autre est CE QUI EST PROPOSÉ. Ce qui ne change
 * jamais est le cycle : la pro propose, la cliente répond, et **le rendez-vous
 * ne bouge qu'après sa réponse**.
 */

export type SorteProposition = 'contre_proposition' | 'forfait' | 'report'
export type EtatProposition = 'en_attente' | 'acceptee' | 'refusee' | 'caduque'

export type Proposition = {
  sorte: SorteProposition
  etat: EtatProposition
  /** Ce qui remplacerait l'existant. Tout est facultatif : on ne change que ce qu'on change. */
  serviceNom?: string | null
  prixCents?: number | null
  dureeMin?: number | null
  debut?: Date | null
}

/**
 * Ce que le rendez-vous devient si la cliente accepte.
 *
 * Écrit ici et non dans la route qui l'applique : c'est la même règle pour les
 * trois sortes, et elle doit être testable sans base de données.
 */
export function rendezVousApresAcceptation<
  T extends { service_name: string; price_cents: number; duration_min: number; debut: Date },
>(rdv: T, p: Proposition): T {
  return {
    ...rdv,
    service_name: p.serviceNom ?? rdv.service_name,
    price_cents: p.prixCents ?? rdv.price_cents,
    duration_min: p.dureeMin ?? rdv.duration_min,
    debut: p.debut ?? rdv.debut,
  }
}

/**
 * Une proposition est-elle encore répondable ?
 *
 * Une seule en attente à la fois par rendez-vous : deux propositions ouvertes,
 * ce sont deux réponses possibles et un rendez-vous dans deux états. Les
 * précédentes deviennent caduques quand une nouvelle part.
 */
export function repondable(p: Proposition): boolean {
  return p.etat === 'en_attente'
}

/**
 * Ce que la proposition change, en clair, pour l'écran de la cliente.
 *
 * Elle doit voir **ce qui bouge**, pas relire tout son rendez-vous. Une
 * proposition qui ne dit pas ce qu'elle change se lit comme un piège.
 */
export function changements(
  p: Proposition,
  actuel: { serviceNom: string; prixCents: number; dureeMin: number },
): { quoi: 'prestation' | 'prix' | 'duree'; avant: string; apres: string }[] {
  const sortie: { quoi: 'prestation' | 'prix' | 'duree'; avant: string; apres: string }[] = []
  if (p.serviceNom && p.serviceNom !== actuel.serviceNom) {
    sortie.push({ quoi: 'prestation', avant: actuel.serviceNom, apres: p.serviceNom })
  }
  if (p.prixCents != null && p.prixCents !== actuel.prixCents) {
    sortie.push({
      quoi: 'prix',
      avant: String(actuel.prixCents),
      apres: String(p.prixCents),
    })
  }
  if (p.dureeMin != null && p.dureeMin !== actuel.dureeMin) {
    sortie.push({ quoi: 'duree', avant: String(actuel.dureeMin), apres: String(p.dureeMin) })
  }
  return sortie
}

/**
 * ⚠️ **LA RÈGLE DE PAIEMENT D'A11, GRAVÉE ICI PARCE QUE B9 N'EXISTE PAS
 * ENCORE.**
 *
 * En mode validation avec acompte ou paiement obligatoire, l'encaissement est
 * **AUTORISÉ à la demande** mais **CAPTURÉ uniquement à la confirmation
 * finale**, et **sur le MONTANT FINAL** (autorisation puis capture, chez
 * Stripe).
 *
 * **JAMAIS de capture immédiate suivie d'un remboursement.** Encaisser puis
 * rendre coûte des frais qui ne reviennent pas, inquiète la cliente au moment
 * précis où on lui demande de faire confiance, et abîme exactement ce que le
 * zéro commission cherche à construire.
 *
 * Cette constante n'a pas d'appelant aujourd'hui : elle en aura un le jour où
 * B9 se construira, et **c'est là que celui qui l'écrira lira cette règle**.
 * Elle est ici, dans le domaine du paiement différé, et non dans un document
 * qu'on oublie d'ouvrir.
 */
export const CAPTURE_A_LA_CONFIRMATION = true
