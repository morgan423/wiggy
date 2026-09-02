import { createHash } from 'node:crypto'
import { destinationSmsAutorisee } from '@wiggy/core'
import { quotaDisponible, quotaGlobal } from '@/lib/quota'

/**
 * D9, condition de sécurité posée AVANT la première ligne de code : les
 * plafonds contre la fraude au pompage.
 *
 * Tout envoi de SMS déclenchable sans être connecté en est la cible. Des robots
 * réclament des codes vers des numéros surtaxés dont ils touchent une part, et
 * que nous payons. Le poste variable dominant du produit est justement le SMS :
 * un pompage réussi ne dégrade pas le service, il vide la trésorerie.
 *
 * Un garde-fou de destination, plus trois plafonds.
 *
 * ⓪ LA DESTINATION (D11 ④). Les SMS ne partent qu'en France métropolitaine et
 *    dans les DOM. C'est le garde-fou qui a permis d'écarter l'abaissement du
 *    plafond d'essai : abaisser un plafond divise le gain d'un fraudeur par
 *    trois sans jamais l'annuler, borner la destination l'annule **à zéro quel
 *    que soit le plafond**. La fraude au pompage vise des numéros surtaxés à
 *    l'étranger ; hors du plan français, rien ne part.
 *
 * Puis trois plafonds, parce qu'un seul se contourne :
 *   ① PAR NUMÉRO, un attaquant qui change d'adresse garde sa cible ;
 *   ② PAR APPELANT, un attaquant qui change de numéro garde sa machine ;
 *   ③ GLOBAL PAR JOUR, le coupe-circuit. Même si les deux premiers sont
 *      contournés par un réseau de machines, la facture s'arrête à un montant
 *      connu d'avance.
 *
 * S'y ajoute le piège anti-robot du formulaire, sur le modèle de la liste
 * d'attente (migration 0005) : un champ invisible qu'une personne ne peut pas
 * remplir et qu'un robot d'auto-remplissage complète.
 */

/** Par numéro : de quoi renvoyer un code deux fois, pas de quoi en réclamer cent. */
const PAR_NUMERO_HEURE = 3
const PAR_NUMERO_JOUR = 6

/** Par appelant : plusieurs pros derrière une même sortie d'entreprise, sans plus. */
const PAR_APPELANT_HEURE = 5
const PAR_APPELANT_JOUR = 15

/**
 * Coupe-circuit global. Au tarif de [H4] 0,045 € le SMS, ce plafond borne la
 * casse d'une journée de pompage à une vingtaine d'euros. Sans lui, un réseau
 * de machines passe sous les deux premiers plafonds sans jamais les atteindre.
 */
const GLOBAL_JOUR = 400

/**
 * Le numéro n'est jamais journalisé ni posé en clair dans une clé de quota :
 * c'est une donnée personnelle. Seule son empreinte sert de compteur.
 */
function empreinteNumero(numero: string): string {
  const sel = process.env.RATE_LIMIT_SALT ?? ''
  const propre = numero.replace(/\D/g, '')
  return createHash('sha256').update(`${sel}:tel:${propre}`).digest('hex').slice(0, 32)
}

export type RefusPlafond = 'destination' | 'numero' | 'appelant' | 'global' | null

/**
 * Consomme un jeton sur les trois compteurs. Renvoie la raison du refus, ou
 * null si l'envoi est autorisé.
 *
 * L'ordre compte : on éprouve d'abord le plafond le plus étroit, pour qu'un
 * abus sur un seul numéro ne consomme pas le compteur global.
 */
export async function plafondEnvoiCode(numero: string): Promise<RefusPlafond> {
  // La destination d'abord : refuser sans avoir rien compté évite qu'un
  // fraudeur consomme nos compteurs avec des numéros qui ne partiront jamais.
  if (!destinationSmsAutorisee(numero)) return 'destination'

  const empreinte = empreinteNumero(numero)

  if (!(await quotaGlobal(`sms:num:h:${empreinte}`, PAR_NUMERO_HEURE, 3600))) return 'numero'
  if (!(await quotaGlobal(`sms:num:j:${empreinte}`, PAR_NUMERO_JOUR, 86_400))) return 'numero'

  if (!(await quotaDisponible('sms:ip:h', PAR_APPELANT_HEURE, 3600))) return 'appelant'
  if (!(await quotaDisponible('sms:ip:j', PAR_APPELANT_JOUR, 86_400))) return 'appelant'

  if (!(await quotaGlobal('sms:jour', GLOBAL_JOUR, 86_400))) return 'global'

  return null
}

/**
 * Le piège anti-robot : un champ invisible, hors tabulation, ignoré des
 * lecteurs d'écran. Rempli, on répond comme si tout s'était bien passé, sans
 * rien envoyer : inutile d'apprendre au robot qu'il est repéré.
 */
export function piegeDeclenche(valeur: string | null): boolean {
  return (valeur ?? '').trim() !== ''
}
