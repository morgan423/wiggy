/**
 * D15 — l'état d'un rendez-vous se déduit de ce que la pro a FAIT, jamais de
 * l'horloge.
 *
 * **Le défaut corrigé**, trouvé le 03/09 : la tournée marquait « Terminé » tout
 * rendez-vous dont l'heure de fin était passée. Morgan s'est connecté le soir
 * et a vu sa journée entière comme traitée, alors que personne n'avait rien
 * clôturé. Deux dégâts, et le second est le pire : l'interface mentait, et B6
 * n'enregistrait AUCUNE durée puisqu'aucune clôture n'avait eu lieu. On
 * accumulait des rendez-vous qui avaient l'air faits et dont on n'apprenait
 * rien.
 *
 * **Le principe fondateur s'applique aussi aux états.** L'app peut constater
 * qu'une heure est passée ; elle ne peut pas décider à la place de la pro que
 * le travail est fait.
 *
 * Quatre états, **un seul déduit du temps** :
 *   ① À VENIR, l'heure n'est pas arrivée. C'est le seul état légitimement
 *      temporel : il ne prétend rien sur une action.
 *   ② EN COURS, la journée est LANCÉE et on est dans le créneau.
 *   ③ À CLÔTURER, l'heure est passée et la pro n'a pas clôturé. C'est l'état
 *      qui manquait, et c'est lui qui rend le rattrapage du soir possible.
 *   ④ TERMINÉ, la pro a explicitement clôturé. **Jamais déduit.**
 */

export type EtatRendezVous = 'a-venir' | 'en-cours' | 'a-cloturer' | 'termine'

export function etatRendezVous({
  cloture,
  debut,
  fin,
  journeeLancee,
  maintenant,
}: {
  /** `true` quand `status = 'done'` : la pro a tapé « Terminé ». */
  cloture: boolean
  debut: Date
  fin: Date
  /**
   * La journée a été lancée, par le bouton ou par l'ouverture du premier GPS.
   *
   * Sans lancement, un rendez-vous dont l'heure est passée est « à clôturer »
   * et jamais « en cours » : rien ne dit que la pro est partie, et le prétendre
   * serait exactement l'erreur qu'on corrige.
   */
  journeeLancee: boolean
  maintenant: Date
}): EtatRendezVous {
  if (cloture) return 'termine'
  if (maintenant < debut) return 'a-venir'
  if (journeeLancee && maintenant < fin) return 'en-cours'
  return 'a-cloturer'
}

/**
 * Au bout de combien de jours l'app cesse de relancer.
 *
 * **Aucune clôture automatique, jamais**, même après des semaines : ce serait
 * réintroduire le mensonge qu'on vient de corriger. En revanche on cesse de
 * réclamer. On propose, on ne harcèle pas.
 */
export const JOURS_DE_RELANCE = 7

/**
 * Les rendez-vous des jours précédents qu'il reste à clôturer, et pour lesquels
 * l'app se permet encore d'insister.
 *
 * Sans cette liste, un rendez-vous non clôturé disparaîtrait dans le passé :
 * l'apprentissage des durées ne se ferait jamais et les fiches resteraient
 * vides. C'est le piège que D15 refuse de laisser ouvert.
 */
export function aRelancer<T extends { cloture: boolean; fin: Date }>(
  rdvs: T[],
  maintenant: Date,
): T[] {
  const limite = maintenant.getTime() - JOURS_DE_RELANCE * 86_400_000
  return rdvs.filter((r) => !r.cloture && r.fin < maintenant && r.fin.getTime() >= limite)
}
