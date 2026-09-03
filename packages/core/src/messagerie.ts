/**
 * B7 et G4 — l'envoi de messages, vu par le produit.
 *
 * **Même motif que le moteur de trajets, et pour la même raison.** Une revoyure
 * de fournisseur est déjà programmée vers 10 000 SMS par mois : la bascule doit
 * coûter une journée, pas une refonte. L'interface vit donc ici, dans le cœur
 * commun, et **un seul fichier de l'enveloppe connaît le fournisseur**. Aucun
 * appel direct ailleurs, ni pour le SMS ni pour l'e-mail.
 *
 * Le fournisseur retenu est Brevo, pour les deux canaux (G4). Il n'est nommé
 * nulle part dans ce fichier, et c'est le but.
 *
 * ⚠️ **D14, tranchée le 03/09 : la bêta tourne SANS SMS de service.** Le chemin
 * « aucun fournisseur configuré » n'est pas un mode dégradé, c'est le
 * comportement NORMAL pendant toute la bêta. Les rappels partent en e-mail et
 * notification, exactement comme pour une pro en palier 1. C'est ce chemin-là
 * qui tournera pendant des semaines : il est testé comme tel.
 */

export type Destinataire = {
  /** Format français, déjà normalisé par `numeroFrancais()`. */
  telephone?: string
  email?: string
}

export type ResultatEnvoi =
  | { statut: 'envoye'; reference?: string }
  /**
   * Aucun fournisseur configuré. Ce n'est pas une erreur pendant la bêta : le
   * message n'est pas parti par ce canal, l'appelant bascule sur l'autre.
   */
  | { statut: 'non-configure' }
  | { statut: 'refuse'; motif: 'destination' | 'plafond' | 'coordonnee-manquante' }
  | { statut: 'echec' }

/**
 * Le contrat que tout fournisseur remplit.
 *
 * `nom` sert aux journaux et à la recette : savoir QUI a envoyé, sans avoir à
 * lire la configuration.
 */
export type Messagerie = {
  readonly nom: string
  sms(a: Destinataire, texte: string): Promise<ResultatEnvoi>
  email(a: Destinataire, sujet: string, texte: string): Promise<ResultatEnvoi>
}

/* ── Le plafond d'usage raisonnable (B7) ─────────────────────────────────── */

/**
 * 300 SMS de service par pro et par mois, aux CGV.
 *
 * Le maximum physique d'une pro itinérante est d'environ 250 : le plafond ne
 * concerne en pratique que le segment fixe à prestations courtes (D10), qu'on
 * ne communique pas. Le « tout compris » reste donc intégralement vrai sur le
 * marché affiché.
 */
export const PLAFOND_SMS_MOIS = 300

/** Le moment où l'on prévient, une fois, sans alarmer. */
const SEUIL_ALERTE = 0.8

export type EtatQuotaSms = {
  /** Envoyés ce mois-ci. */
  envoyes: number
  /** Le plafond atteint : les rappels basculent sur e-mail, gratuitement. */
  atteint: boolean
  /** 80 % franchis : une notification unique, informative, jamais anxiogène. */
  alerte: boolean
}

export function etatQuotaSms(envoyes: number, plafond = PLAFOND_SMS_MOIS): EtatQuotaSms {
  return {
    envoyes,
    atteint: envoyes >= plafond,
    alerte: envoyes >= Math.floor(plafond * SEUIL_ALERTE),
  }
}

/**
 * La date à laquelle le plafond sera atteint, au rythme observé ce mois-ci.
 *
 * C'est le seul chiffre que la notification des 80 % apporte : « à ce rythme,
 * tu y seras vers le 24 ». Sans elle, prévenir ne servirait qu'à inquiéter.
 *
 * `null` quand le rythme ne permet pas de le dire, ou quand le plafond serait
 * atteint après la fin du mois : dans ce cas il ne sera jamais atteint, la
 * remise à zéro passera avant.
 */
export function dateEstimeeDAtteinte({
  envoyes,
  debutDuMois,
  maintenant,
  plafond = PLAFOND_SMS_MOIS,
}: {
  envoyes: number
  debutDuMois: Date
  maintenant: Date
  plafond?: number
}): Date | null {
  const joursEcoules = (maintenant.getTime() - debutDuMois.getTime()) / 86_400_000
  if (joursEcoules < 1 || envoyes <= 0) return null

  const parJour = envoyes / joursEcoules
  const restants = plafond - envoyes
  if (restants <= 0) return maintenant
  const joursRestants = restants / parJour

  const atteinte = new Date(maintenant.getTime() + joursRestants * 86_400_000)
  const finDuMois = new Date(
    Date.UTC(debutDuMois.getUTCFullYear(), debutDuMois.getUTCMonth() + 1, 1),
  )
  // Au-delà de la remise à zéro, le plafond ne sera pas atteint : ne rien dire
  // vaut mieux qu'annoncer une date qui n'arrivera pas.
  return atteinte >= finDuMois ? null : atteinte
}

/**
 * La clé du compteur mensuel : le 1er du mois, « 2026-09-01 ».
 *
 * La remise à zéro du 1er n'est pas une tâche planifiée, c'est une conséquence
 * de cette clé. Un nouveau mois, une nouvelle ligne. Rien à faire tourner,
 * donc rien qui puisse ne pas tourner.
 */
export function moisDeFacturation(quand: Date): string {
  const mois = String(quand.getUTCMonth() + 1).padStart(2, '0')
  return `${String(quand.getUTCFullYear())}-${mois}-01`
}
