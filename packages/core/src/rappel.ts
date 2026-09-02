import { can, type SubscriptionState } from './tiers.ts'

/**
 * Le canal par lequel une cliente sera prévenue.
 *
 * DEUX RÈGLES PERMANENTES le gouvernent, et elles sont la raison d'être de ce
 * module :
 *
 * ① Un texte destiné à la cliente suit **le canal réellement utilisé, jamais le
 *    palier**. Trois causes produisent le même effet visible : la pro est en
 *    offre 1, elle a désactivé les SMS, ou le plafond du mois est atteint
 *    (B7). Une seule dimension à écrire, donc une seule fonction à appeler, et
 *    six variantes de texte au lieu de dix-huit.
 *
 * ② La cliente ne doit **jamais pouvoir deviner** que sa coiffeuse est sur une
 *    offre moins chère, ni qu'une limite a été atteinte. C'est pour cela que
 *    cette fonction ne renvoie que le canal, et surtout pas la cause : un
 *    appelant qui reçoit la cause finit par l'afficher. Un « votre coiffeuse a
 *    atteint son quota » la trahirait auprès de sa propre cliente.
 */

export type CanalRappel = 'sms' | 'email'

export type EtatRappel = {
  abonnement: SubscriptionState
  /** B7 : l'option SMS reste désactivable par la pro, sans perte de service. */
  smsActifs: boolean
  /**
   * B7 : au plafond d'usage raisonnable, la bascule est automatique et
   * gratuite. Le paramètre existe avant la mécanique qui le renseignera, pour
   * que le jour venu il n'y ait rien à rouvrir ici.
   */
  plafondAtteint?: boolean
}

export function canalRappel(etat: EtatRappel): CanalRappel {
  if (!can(etat.abonnement, 'sms_reminders')) return 'email'
  if (!etat.smsActifs) return 'email'
  if (etat.plafondAtteint) return 'email'
  return 'sms'
}

/**
 * L'e-mail devient obligatoire quand c'est par lui qu'on préviendra.
 *
 * Sans cette règle, on promettrait un rappel par e-mail à une cliente qui n'a
 * pas donné d'e-mail. La mention « facultatif » ne s'affiche donc que sur le
 * canal SMS.
 */
export function emailRequis(canal: CanalRappel): boolean {
  return canal === 'email'
}
