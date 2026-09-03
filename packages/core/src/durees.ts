/**
 * B6 — l'apprentissage des durées.
 *
 * Une prestation a une durée au catalogue. La réalité en a une autre, et elle
 * n'est pas la même pour toutes les clientes : « Mme Martin plus couleur égale
 * toujours quinze minutes de plus ». Ce module tire de l'historique la durée
 * qu'il faut réserver, pour que les créneaux proposés cessent de mentir.
 *
 * Deux niveaux, dans cet ordre de priorité :
 *   ① la CLIENTE pour cette prestation, quand on l'a vue assez souvent ;
 *   ② la PRO pour cette prestation, sinon ;
 *   ③ le catalogue, faute des deux.
 *
 * Ce que ce module ne fait jamais : décider à la place de la pro. La durée
 * apprise sert à PROPOSER des créneaux justes. Elle ne modifie ni le catalogue,
 * ni un rendez-vous existant, et la pro reste libre de la corriger à la saisie
 * (« l'app propose, le pro dispose »).
 *
 * D3 : ce calcul vit dans le cœur commun. Les deux enveloppes proposeront les
 * mêmes créneaux, ou elles proposeront des créneaux différents pour la même
 * journée, ce qui serait pire que de ne rien apprendre.
 */

/** Le nombre de mesures en dessous duquel une moyenne n'en est pas une. */
const MINIMUM_CLIENTE = 2
const MINIMUM_PRO = 3

/**
 * Garde-fou : l'apprentissage ne peut pas éloigner la durée de plus de la
 * moitié du catalogue, dans un sens comme dans l'autre.
 *
 * Un rendez-vous oublié et clos le lendemain produit une mesure de vingt
 * heures. Sans borne, cette seule ligne viderait une semaine d'agenda. La
 * médiane protège déjà du cas isolé ; la borne protège du cas répété.
 */
const ECART_MAXIMAL = 0.5

/** Le pas d'arrondi : on réserve des quarts d'heure, pas des minutes. */
const PAS_MIN = 5

export type MesureDuree = {
  /** Minutes réellement passées, telles que la clôture les a enregistrées. */
  minutes: number
  /**
   * B5 — la pro a corrigé cette durée À LA MAIN sur le rendez-vous.
   *
   * Une correction manuelle **n'est pas une mesure parmi d'autres, c'est une
   * instruction**. « L'app propose, le pro dispose » : quand elle a pris la
   * peine de dire « chez elle c'est une heure et demie », on ne moyenne pas sa
   * phrase avec trois observations de machine.
   */
  corrigee?: boolean
}

function mediane(valeurs: number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b)
  const milieu = Math.floor(triees.length / 2)
  return triees.length % 2 === 1 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2
}

/**
 * La durée à réserver pour cette prestation, chez cette cliente.
 *
 * `dureeCatalogue` est la durée déclarée par la pro. Les deux historiques ne
 * contiennent que des rendez-vous RÉELLEMENT terminés, pour cette prestation.
 */
export function dureeApprise({
  dureeCatalogue,
  historiqueCliente = [],
  historiquePro = [],
}: {
  dureeCatalogue: number
  historiqueCliente?: MesureDuree[]
  historiquePro?: MesureDuree[]
}): number {
  // B5 — ce que la pro a corrigé à la main prime sur tout le reste, et ne se
  // moyenne avec rien. La plus RÉCENTE de ses corrections fait foi : une
  // instruction plus neuve remplace une instruction plus ancienne. Les
  // historiques arrivent du plus récent au plus ancien.
  const corrigees = [...historiqueCliente, ...historiquePro].filter((m) => m.corrigee)
  const minutes =
    corrigees.length > 0
      ? corrigees[0].minutes
      : historiqueCliente.length >= MINIMUM_CLIENTE
        ? mediane(historiqueCliente.map((m) => m.minutes))
        : historiquePro.length >= MINIMUM_PRO
          ? mediane(historiquePro.map((m) => m.minutes))
          : dureeCatalogue

  // La borne protège de la mesure aberrante, pas de la pro. Ce qu'elle a écrit
  // elle-même s'applique tel quel : elle sait ce qu'elle fait.
  if (corrigees.length > 0) return Math.max(PAS_MIN, Math.ceil(minutes / PAS_MIN) * PAS_MIN)

  const plancher = dureeCatalogue * (1 - ECART_MAXIMAL)
  const plafond = dureeCatalogue * (1 + ECART_MAXIMAL)
  const bornee = Math.min(plafond, Math.max(plancher, minutes))
  // Arrondi vers le haut : mieux vaut cinq minutes de marge qu'un retard.
  return Math.max(PAS_MIN, Math.ceil(bornee / PAS_MIN) * PAS_MIN)
}

/**
 * La durée réellement passée sur un rendez-vous, à la clôture.
 *
 * Bornée à douze heures : au-delà, la pro a oublié de clore et a tapé le
 * lendemain. On ne veut pas de cette mesure dans l'apprentissage, et on ne
 * veut pas non plus perdre la clôture : on retient la durée prévue.
 */
export function dureeReelle(debut: Date, cloture: Date, dureePrevue: number): number {
  const minutes = Math.round((cloture.getTime() - debut.getTime()) / 60_000)
  if (minutes <= 0 || minutes > 12 * 60) return dureePrevue
  return minutes
}
