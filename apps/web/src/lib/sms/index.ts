/**
 * Le SMS de vérification (D9), écrit et envoyé.
 *
 * L'interface d'envoi vit dans le cœur commun (`@wiggy/core`, `Messagerie`) et
 * son adaptateur dans `lib/messagerie` : ce module ne connaît aucun
 * fournisseur, il connaît un message.
 *
 * ⚠️ Ceci ne contredit pas le principe non négociable n°1, « aucun envoi
 * automatique de SMS sans validation explicite du pro ». Ce principe protège
 * les clientes des envois décidés par l'app. Un code de vérification est
 * demandé par la personne qui le reçoit, pour elle-même, et ne part jamais sans
 * ce geste.
 */

/**
 * G4, tranché le 03/09 : **l'expéditeur est « Wiggy »**, sender ID
 * alphanumérique unique, à enregistrer auprès de l'écosystème SMS français au
 * nom de la société **au moment du choix du fournisseur** (les modalités
 * d'enregistrement évoluent, elles se vérifient à ce moment-là).
 *
 * Trois raisons, et aucune n'est cosmétique.
 * ① **Conformité anti-usurpation** : les sender IDs se déclarent, un par
 *    entité. Un prénom de pro ne passe pas à l'échelle, et n'est pas
 *    déclarable.
 * ② **Fil de discussion unique** côté cliente : tous les messages Wiggy se
 *    rangent au même endroit dans son téléphone, au lieu de s'éparpiller sous
 *    autant d'expéditeurs que de coiffeuses.
 * ③ **Liste STOP et traçabilité unifiées**, ce que la réglementation demande.
 *
 * **Le corps du message, lui, parle au nom de la pro et ouvre par elle** :
 * « Bonjour Mme Riva, c'est Sophie… ». Et **les messages qui appellent une
 * réponse** (retard C5, relance B8) **portent le numéro de la pro dans le
 * texte** : un sender ID alphanumérique ne se répond pas, et une cliente qui
 * répond dans le vide est une cliente qu'on a lâchée.
 *
 * Le principe : **la relation vit dans le texte, l'infrastructure dans
 * l'en-tête.**
 *
 * Aucune constante n'est posée ici tant qu'aucun fournisseur ne l'utilise :
 * une valeur sans consommateur se périme sans que personne s'en aperçoive. La
 * décision vit dans ce commentaire, à l'endroit exact où elle s'appliquera, et
 * dans le copy deck (`notification-copilote.$aEcrire.$noteG4`).
 */
import { copy, remplir } from '@wiggy/copy'
import { envoyerSms, codeVisibleEnDeveloppement } from '@/lib/messagerie'

/**
 * Envoie un code de vérification.
 *
 * Passe par l'adaptateur, comme tout le reste : ce module ne connaît aucun
 * fournisseur, il connaît un message.
 *
 * Sans fournisseur, le code est écrit dans le journal du serveur et rendu à
 * l'écran EN DÉVELOPPEMENT SEULEMENT. Sans cela, la vérification du téléphone
 * serait irrecettable pendant toute la bêta, qui tourne sans SMS (D14).
 */
export async function envoyerCode(
  numero: string,
  code: string,
): Promise<{ statut: string; codeDeDeveloppement?: string }> {
  const resultat = await envoyerSms(
    { telephone: numero },
    remplir(copy.authentification.$aEcrire.smsCode, { code }),
  )
  if (resultat.statut === 'non-configure') {
    return { statut: 'non-configure', codeDeDeveloppement: codeVisibleEnDeveloppement(code) }
  }
  return { statut: resultat.statut }
}
