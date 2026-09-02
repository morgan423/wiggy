/**
 * L'envoi de SMS, vu par l'application.
 *
 * Aucun fournisseur n'est branché : B7, le modèle SMS complet, est en phase 2.
 * L'interface existe dès maintenant parce que D9 en dépend, et parce qu'une
 * abstraction posée après coup se plie toujours à la première implémentation.
 *
 * ⚠️ Ceci ne contredit pas le principe non négociable n°1, « aucun envoi
 * automatique de SMS sans validation explicite du pro ». Ce principe protège
 * les clientes des envois décidés par l'app. Un code de vérification est
 * demandé par la personne qui le reçoit, pour elle-même, et ne part jamais sans
 * ce geste.
 */

export type ResultatEnvoi =
  | { statut: 'envoye' }
  /** Aucun fournisseur configuré. En développement, le code est lisible. */
  | { statut: 'non-configure'; codeDeDeveloppement?: string }
  | { statut: 'echec' }

const enDeveloppement = () => process.env.WIGGY_ENV === 'developpement'

/**
 * Envoie un code de vérification.
 *
 * Sans fournisseur, le code est écrit dans le journal du serveur, et rendu à
 * l'écran EN DÉVELOPPEMENT SEULEMENT : sans cela, la vérification du téléphone
 * serait irrecettable tant que B7 n'existe pas. La garde est en liste blanche,
 * jamais en liste noire : une variable absente ferme le passage.
 */
export async function envoyerCode(numero: string, code: string): Promise<ResultatEnvoi> {
  const fournisseur = process.env.SMS_FOURNISSEUR
  if (!fournisseur) {
    // Le numéro n'est pas journalisé : c'est une donnée personnelle, et il
    // suffit de savoir qu'un code est parti pour suivre le parcours.
    console.warn('sms_non_configure', enDeveloppement() ? `code=${code}` : '')
    return {
      statut: 'non-configure',
      codeDeDeveloppement: enDeveloppement() ? code : undefined,
    }
  }

  // B7 branchera ici le fournisseur retenu. La forme du retour ne changera pas.
  console.error('sms_fournisseur_inconnu', fournisseur)
  return await Promise.resolve({ statut: 'echec' })
}
